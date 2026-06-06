#!/usr/bin/env bash
# ==============================================================================
# GC System — Garbage Collection for Oracle2 Vessel
# ==============================================================================
# Runs lifecycle management: eviction, compaction, immortal protection
# Modeled on the baton program: every byte has a lifecycle.
#
# Policies:
#   Tier-1 (Immortal):      workspace identity files, active protocols, .env
#   Tier-2 (Hot):            active repo clones being worked on this session
#   Tier-3 (Warm):           legacy reference, historical artifacts
#   Tier-4 (Cold/Evictable): build artifacts, caches, .venv, node_modules
#
# Usage:
#   bash scripts/gc-system.sh           # dry-run (report only)
#   bash scripts/gc-system.sh --execute  # actually evict cold data
#   bash scripts/gc-system.sh --status   # show tier inventory
# ==============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="$SCRIPT_DIR/.."

# ---- Colors ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MODE="${1:-dry-run}"
SUMMARY_FILE="/tmp/gc-summary-$$.txt"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🦀  ORACLE2 VESSEL GARBAGE COLLECTOR    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "Mode: $MODE"
echo "Date: $(date -u)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TIER INVENTORY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── Tier-1: Immortal (never touched) ───
echo -e "${GREEN}[IMMORTAL]${NC} Never evicted:"
echo "  - workspace/memory/*"
echo "  - workspace/MEMORY.md"
echo "  - workspace/SOUL.md"
echo "  - workspace/IDENTITY.md"
echo "  - workspace/baton-system/"
echo "  - workspace/FLEET_ARCHITECTURE.md"
echo "  - /tmp/i2i-vessel/"
echo "  - .env files"
echo ""

# ─── Tier-2: Hot (active session data) ───
echo -e "${YELLOW}[HOT]${NC} Active session repos:"
for d in "$WORKSPACE"/baton-system; do
  echo "  $(du -sh "$d" 2>/dev/null | cut -f1) $d"
done
echo ""

# ─── Tier-3: Warm (reference, GC but don't delete) ───
echo -e "${YELLOW}[WARM]${NC} Reference data (GC git packs, keep content):"
for d in "$WORKSPACE"/pincher-legacy-mine/*/; do
  if [ -d "$d/.git" ]; then
    size=$(du -sh "$d" 2>/dev/null | cut -f1)
    name=$(basename "$d")
    echo "  $size $name"
  fi
done
echo "  $(du -sh "$WORKSPACE/forgemaster-archive" 2>/dev/null | cut -f1) forgemaster-archive"
echo ""

# ─── Tier-4: Cold (evictable) ───
echo -e "${RED}[COLD]${NC} Build artifacts, caches, .venv:"
# Find all target/ dirs
find /tmp /home/ubuntu -maxdepth 6 -name "target" -type d 2>/dev/null | while read d; do
  size=$(du -sh "$d" 2>/dev/null | cut -f1)
  echo "  $size $d"
done
# Find .venv > 50M
find /home/ubuntu -maxdepth 5 -name ".venv" -type d 2>/dev/null | while read d; do
  size=$(du -sh "$d" 2>/dev/null | cut -f1)
  if [ "$(echo "$size" | sed 's/[^0-9.]//g' | cut -d. -f1)" -gt 50 ] 2>/dev/null; then
    echo "  $size $d"
  fi
done
# pip caches
find /tmp -maxdepth 2 -name "pip-*" -type d 2>/dev/null | while read d; do
  size=$(du -sh "$d" 2>/dev/null | cut -f1)
  echo "  $size $d"
done
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DISK STATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
df -h / | tail -1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RAM STATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
free -h | head -2

# ─── EXECUTION: Only if --execute flag ───
if [ "$MODE" != "--execute" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Dry-run mode. Use --execute to evict cold data.${NC}"
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EVICTING COLD DATA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EVICTED=0

# Evict lever-runner .venv (5.3G, CUDA on ARM64 = dead weight)
if [ -d "/home/ubuntu/lever-runner/.venv" ]; then
  echo -e "${RED}Evicting:${NC} /home/ubuntu/lever-runner/.venv ($(du -sh /home/ubuntu/lever-runner/.venv | cut -f1))"
  echo "   Reason: CUDA packages on ARM64 — all dead weight. Project on GitHub."
  if [ "$MODE" == "--execute" ]; then
    rm -rf /home/ubuntu/lever-runner/.venv
    EVICTED=$((EVICTED + 1))
    echo "   ✅ Evicted"
  fi
fi

# GC legacy git packs (already shallow-cloned)
for d in "$WORKSPACE"/pincher-legacy-mine/*/; do
  if [ -d "$d/.git" ]; then
    name=$(basename "$d")
    before=$(du -sh "$d/.git" 2>/dev/null | cut -f1)
    (cd "$d" && git gc --aggressive --prune=now 2>/dev/null)
    after=$(du -sh "$d/.git" 2>/dev/null | cut -f1)
    echo -e "${YELLOW}GC'd:${NC} $name ($before → $after)"
  fi
done

# Clean pip cache
if [ -d "/home/ubuntu/.cache/pip" ]; then
  echo -e "${RED}Evicting:${NC} pip cache"
  rm -rf /home/ubuntu/.cache/pip 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  POST-GC STATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
df -h / | tail -1

echo ""
echo -e "${GREEN}✅ GC cycle complete. $EVICTED items evicted.${NC}"
