#!/usr/bin/env bash
#
# ╔══════════════════════════════════════════════════════════════════════╗
# ║          repo-health.sh — Pincher Fleet Health Check                ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# One-shot health check for the Pincher fleet. Runs from Oracle2 and
# inspects CI status, stale PRs, disk/RAM on this host, the Forgemaster
# message system (construct-coordination), and the I2I vessel harbor.
#
# Usage:
#   ./repo-health.sh
#
#   No flags. No config files. It just works — provided you have gh
#   authenticated with access to the right repos.
#
# Exit codes:
#   0 — All systems green. Every check passed.
#   1 — Something needs attention (failed CI run, stale PRs, disk >85%,
#       or missing Forgemaster activity).
#
# Checks performed (in order):
#   1. CI Status — Last 3 workflow runs on SuperInstance/pincher.
#      Flags any failures.
#   2. Stale PRs — Open PRs with no activity >24 hours. Warnings per-PR,
#      then a summary count.
#   3. Disk Usage — Local root partition. Warns at 75%, fails at 85%.
#      Also shows available RAM.
#   4. Forgemaster Messages — Checks construct-coordination for:
#        › notes/forgemaster/ directory (message artifacts)
#        › Recent commits by OpenClaw identity (Forgemaster activity)
#        › I2I vessel harbor (incoming bottles, if any)
#   5. Summary — Green checkmark or attention banner with timestamp.
#
# Sample output:
#
#   ═══ CI Status — SuperInstance/pincher ═══
#   ✓  [25-06-04] Update deps (main) — ✅ success
#   ✓  [25-06-04] Add docs (feature/foo) — ✅ success
#   ⚠  [25-06-03] Refactor core (fix/slow) — ❌ FAILURE
#
#   2/3 recent runs passed
#
#   ═══ Stale PRs — SuperInstance/pincher ═══
#   ⚠  #42 "Bump sqlx version" — alice/fix/slow — stale 2.5d (no activity >24h)
#
#   1/5 PRs are stale (no activity >24h)
#
#   ═══ Disk Usage — Oracle2 ═══
#   45G total · 29G used · 17G available (64%)
#   ✓  Disk healthy: 64% used — 17G free
#   RAM: 23Gi total · 21Gi available
#
#   ═══ Fleet Messages — construct-coordination ═══
#   notes/forgemaster/ exists with 3 file(s):
#     · status.md (2048B)
#     · orders.md (1024B)
#     · signal.md (512B)
#   ✓  Forgemaster has active notes in construct-coordination
#
#   2 recent commit(s) by OpenClaw (Forgemaster identity):
#     [2026-06-04 a1b2c3d4] Update fleet formation
#     [2026-06-04 e5f6g7h8] Push nightly audit results
#   ✓  Forgemaster is active — 2026-06-04 latest commit
#
#   ═══ Summary ═══
#   All systems green.
#   Generated: 2026-06-05 06:30 UTC
#
# Requirements:
#   - gh (GitHub CLI) 2.40+ authenticated with repo scope
#   - jq for JSON processing
#   - bc for fractional day calculations
#   - Oracle2 host (or any Linux with df, free)
#
# The Real Reason:
#   You can't trust that the fleet is healthy just because nobody yelled.
#   CI can be silently red (cancelled runs that someone forgot to retry),
#   PRs can rot for weeks, disks fill up, and Forgemaster might have gone
#   silent. This script IS the yell. Run it in cron, run it before deploys,
#   run it when you get a weird feeling. It checks everything in <30 seconds.
#
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────────────────
REPO="SuperInstance/pincher"
COORD_REPO="SuperInstance/construct-coordination"
COORD_BRANCH="master"
STALE_HOURS=24

# Colors (fall back to plain if no tput)
if command -v tput &>/dev/null && tput colors &>/dev/null; then
  BOLD=$(tput bold)
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  RED=$(tput setaf 1)
  CYAN=$(tput setaf 6)
  NC=$(tput sgr0)
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; CYAN=""; NC=""
fi

ok()    { echo "${GREEN}✓${NC} $1"; }
warn()  { echo "${YELLOW}⚠ $1${NC}"; }
fail()  { echo "${RED}✗ $1${NC}"; }
header(){ echo; echo "${BOLD}${CYAN}═══ $1 ═══${NC}"; }

EXIT_CODE=0

# Ensure gh is available
if ! command -v gh &>/dev/null; then
  echo "${RED}FATAL: gh (GitHub CLI) not found. Install it first.${NC}"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Pincher CI Status
# ═══════════════════════════════════════════════════════════════════════════════
header "CI Status — $REPO"

CI_FAILURES=0
CI_DATA=$(gh run list -R "$REPO" --limit 3 --json status,conclusion,displayTitle,createdAt,headBranch 2>/dev/null || true)

if [ -z "$CI_DATA" ] || [ "$CI_DATA" = "[]" ]; then
  warn "No workflow runs found (repo may be empty or unreachable)"
else
  echo "$CI_DATA" | jq -c '.[]' 2>/dev/null | while IFS= read -r run; do
    TITLE=$(echo "$run" | jq -r '.displayTitle')
    CONCLUSION=$(echo "$run" | jq -r '.conclusion')
    STATUS=$(echo "$run" | jq -r '.status')
    CREATED=$(echo "$run" | jq -r '.createdAt')
    BRANCH=$(echo "$run" | jq -r '.headBranch')
    SHORT_DATE=$(echo "$CREATED" | cut -dT -f1 | cut -c3-)

    case "$CONCLUSION" in
      success)  ok "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — ✅ success" ;;
      failure)  fail "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — ❌ FAILURE" ;;
      neutral)  warn "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — ➖ neutral" ;;
      cancelled) warn "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — ⛔ cancelled" ;;
      skipped)  warn "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — ⏭ skipped" ;;
      *)
        if [ "$STATUS" = "in_progress" ]; then
          warn "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — 🔄 in_progress"
        else
          warn "  [${SHORT_DATE}] ${TITLE} (${BRANCH}) — ${CONCLUSION:-unknown}"
        fi
        ;;
    esac

    if [ "$CONCLUSION" = "failure" ]; then
      CI_FAILURES=$((CI_FAILURES + 1))
    fi
  done

  # Count failures from the loop output
  CI_FAIL_COUNT=$(echo "$CI_DATA" | jq '[.[] | select(.conclusion == "failure")] | length')
  CI_RUN_COUNT=$(echo "$CI_DATA" | jq 'length')

  echo
  if [ "$CI_FAIL_COUNT" -gt 0 ]; then
    fail "${CI_FAIL_COUNT}/${CI_RUN_COUNT} recent runs failed"
    EXIT_CODE=1
  elif [ "$CI_RUN_COUNT" -gt 0 ]; then
    ok "${CI_RUN_COUNT}/${CI_RUN_COUNT} recent runs passed"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Stale PRs (open > STALE_HOURS with no activity)
# ═══════════════════════════════════════════════════════════════════════════════
header "Stale PRs — $REPO"

PR_DATA=$(gh pr list -R "$REPO" --json number,title,createdAt,updatedAt,state,author,headRefName 2>/dev/null || true)

if [ -z "$PR_DATA" ] || [ "$PR_DATA" = "[]" ]; then
  ok "No open PRs"
else
  NOW_EPOCH=$(date +%s)
  STALE_THRESHOLD=$((STALE_HOURS * 3600))

  echo "$PR_DATA" | jq -c '.[]' 2>/dev/null | while IFS= read -r pr; do
    PR_NUM=$(echo "$pr" | jq -r '.number')
    PR_TITLE=$(echo "$pr" | jq -r '.title')
    PR_AUTHOR=$(echo "$pr" | jq -r '.author.login // .author.name // "unknown"')
    PR_BRANCH=$(echo "$pr" | jq -r '.headRefName')
    PR_UPDATED=$(echo "$pr" | jq -r '.updatedAt')

    # Parse timestamps (ISO 8601) — both Linux and macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
      UPDATED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo "$PR_UPDATED" | sed 's/Z$//' | cut -d. -f1)" +%s 2>/dev/null || echo 0)
    else
      UPDATED_EPOCH=$(date -d "$(echo "$PR_UPDATED" | sed 's/T/ /' | sed 's/Z//' | sed 's/\.[0-9]*//' | sed 's/+00:00//')" +%s 2>/dev/null || echo 0)
    fi

    AGE=$((NOW_EPOCH - UPDATED_EPOCH))
    if [ "$AGE" -gt "$STALE_THRESHOLD" ]; then
      DAYS_OLD=$(printf "%.1f" "$(echo "$AGE / 86400" | bc -l 2>/dev/null || echo "?")")
      warn "  #${PR_NUM} \"${PR_TITLE}\" — ${PR_AUTHOR}/${PR_BRANCH} — stale ${DAYS_OLD}d (no activity >${STALE_HOURS}h)"
    fi
  done

  # Count stale PRs via jq (avoids subshell scoping issues)
  STALE_COUNT=$(echo "$PR_DATA" | jq --argjson threshold "$STALE_THRESHOLD" --argjson now "$NOW_EPOCH" '
    [.[] | select(
      (.updatedAt | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601 // 0) as $updated
      | ($now - $updated) > $threshold
    )] | length
  ' 2>/dev/null || echo 0)
  TOTAL_COUNT=$(echo "$PR_DATA" | jq 'length' 2>/dev/null || echo 0)

  echo
  if [ "$STALE_COUNT" -gt 0 ]; then
    fail "${STALE_COUNT}/${TOTAL_COUNT} PRs are stale (no activity >${STALE_HOURS}h)"
    EXIT_CODE=1
  else
    ok "All ${TOTAL_COUNT} PR(s) fresh — no staleness"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Disk Usage on Oracle2 (this host)
# ═══════════════════════════════════════════════════════════════════════════════
header "Disk Usage — Oracle2"

DISK_DATA=$(df -h / 2>/dev/null | tail -1)
if [ -n "$DISK_DATA" ]; then
  SIZE=$(echo "$DISK_DATA" | awk '{print $2}')
  USED=$(echo "$DISK_DATA" | awk '{print $3}')
  AVAIL=$(echo "$DISK_DATA" | awk '{print $4}')
  USE_PCT=$(echo "$DISK_DATA" | awk '{print $5}' | sed 's/%//')

  echo "  ${SIZE} total · ${USED} used · ${AVAIL} available (${USE_PCT}%)"

  if [ "$USE_PCT" -ge 85 ]; then
    fail "Disk CRITICAL: ${USE_PCT}% used — ${AVAIL} free"
    EXIT_CODE=1
  elif [ "$USE_PCT" -ge 75 ]; then
    warn "Disk WARNING: ${USE_PCT}% used — ${AVAIL} free"
    # Warning only, don't set EXIT_CODE for this level
  else
    ok "Disk healthy: ${USE_PCT}% used — ${AVAIL} free"
  fi
else
  warn "Could not determine disk usage"
fi

# Also show RAM briefly
MEM_TOTAL=$(free -h 2>/dev/null | awk '/Mem:/ {print $2}')
MEM_AVAIL=$(free -h 2>/dev/null | awk '/Mem:/ {print $7}')
if [ -n "$MEM_TOTAL" ]; then
  echo "  RAM: ${MEM_TOTAL} total · ${MEM_AVAIL} available"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. construct-coordination — Forgemaster messages
# ═══════════════════════════════════════════════════════════════════════════════
header "Fleet Messages — construct-coordination"

# Check 1: Does notes/forgemaster/ directory exist?
FORGEMASTER_NOTES=$(gh api "repos/${COORD_REPO}/contents/notes/forgemaster?ref=${COORD_BRANCH}" 2>/dev/null || echo "")

# gh returns a JSON error message on 404 rather than empty — check if it's actually an array
if [ -n "$FORGEMASTER_NOTES" ]; then
  IS_ARRAY=$(echo "$FORGEMASTER_NOTES" | jq 'if type == "array" then true else false end' 2>/dev/null || echo "false")
  if [ "$IS_ARRAY" = "true" ]; then
    FM_FILE_COUNT=$(echo "$FORGEMASTER_NOTES" | jq 'length' 2>/dev/null || echo 0)
    echo "  notes/forgemaster/ exists with ${FM_FILE_COUNT} file(s):"
    echo "$FORGEMASTER_NOTES" | jq -r '.[] | "    · \(.name) (\(.size)B)"' 2>/dev/null
    ok "Forgemaster has active notes in construct-coordination"
  else
    warn "  No notes/forgemaster/ directory yet"
    echo "  (Forgemaster may not have pushed any messages yet)"
  fi
else
  warn "  No notes/forgemaster/ directory yet"
  echo "  (Forgemaster may not have pushed any messages yet)"
fi

# Check 2: Recent commits on construct-coordination by OpenClaw (Forgemaster's identity)
RECENT_COMMITS=$(gh api "repos/${COORD_REPO}/commits?per_page=10&sha=${COORD_BRANCH}" 2>/dev/null | \
  jq '[.[] | select(.commit.author.name == "OpenClaw") | {sha: .sha[0:8], message: .commit.message, date: .commit.author.date}]' 2>/dev/null || echo "[]")

FM_COMMIT_COUNT=$(echo "$RECENT_COMMITS" | jq 'length' 2>/dev/null || echo 0)

if [ "$FM_COMMIT_COUNT" -gt 0 ]; then
  echo
  echo "  ${FM_COMMIT_COUNT} recent commit(s) by OpenClaw (Forgemaster identity):"
  echo "$RECENT_COMMITS" | jq -r '.[] | "    [\(.date | .[0:10]) \(.sha)] \(.message | .[0:80])"' 2>/dev/null
  ok "Forgemaster is active — $(echo "$RECENT_COMMITS" | jq -r '.[0].date' 2>/dev/null | head -c 10) latest commit"
else
  warn "  No recent OpenClaw (Forgemaster) commits on ${COORD_REPO} master"
  echo "  (Forgemaster may be working on a fork or different branch)"
fi

# Check 3: I2I vessel harbor — any new incoming bottles from Forgemaster?
I2I_HARBOR="${HOME}/.openclaw/workspace/i2i-vessel/harbor"
if [ -d "$I2I_HARBOR" ]; then
  HARBOR_COUNT=$(find "$I2I_HARBOR" -maxdepth 1 -type f 2>/dev/null | wc -l)
  if [ "$HARBOR_COUNT" -gt 0 ]; then
    echo
    echo "  I2I vessel harbor: ${HARBOR_COUNT} incoming message(s)"
    ls -1t "$I2I_HARBOR" 2>/dev/null | while IFS= read -r f; do
      echo "    · ${f}"
    done
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Summary
# ═══════════════════════════════════════════════════════════════════════════════
echo
header "Summary"
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "${GREEN}${BOLD}All systems green.${NC}"
else
  echo "${RED}${BOLD}Attention needed — see above for details.${NC}"
fi
echo "Generated: $(date -u '+%Y-%m-%d %H:%M UTC')"

exit $EXIT_CODE
