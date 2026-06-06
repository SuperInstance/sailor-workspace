#!/usr/bin/env bash
#
# ╔══════════════════════════════════════════════════════════════════════╗
# ║          codespace-agent.sh — L3 Git-Native Agent Runner            ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Creates ephemeral GitHub Codespaces, injects agent instructions, runs
# an AI coding agent (Claude Code, Kimi Code, or custom), captures ALL
# output, optionally pushes changes, then nukes the codespace.
#
# Built on top of codespace-worker.sh principles — designed for fleet-scale
# L3 git-native agent orchestration across the SuperInstance ecosystem.
#
# Architecture:
#   ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐
#   │  codespace-   │───>│  Ephemeral   │───>│  Agent runs its  │
#   │  agent.sh     │    │  Codespace   │    │  assigned task   │
#   └──────────────┘    └──────┬───────┘    └────────┬────────┘
#                              │                     │
#                              v                     v
#                      ┌──────────────┐    ┌────────────────┐
#                      │  .devcontainer│    │  Output capture │
#                      │  (L3 runtime) │    │  + file harvest │
#                      └──────────────┘    └────────────────┘
#
# Usage:
#   codespace-agent.sh [options]
#
# Options:
#   -R, --repo OWNER/REPO        Repository for the codespace
#                                  (default: SuperInstance/pincher)
#   -b, --branch BRANCH          Branch to work on (default: main)
#   -e, --entrypoint TYPE        Agent type: claude | kimi | custom
#                                  (default: claude)
#       --entrypoint-cmd CMD     Custom entrypoint command (for --entrypoint custom)
#       --entrypoint-args ARGS   Extra arguments passed to the agent binary
#   -t, --task TEXT              Inline task description for the agent
#   -f, --task-file FILE         Path to a .md task file to inject into the
#                                  codespace (combined with --task if both given)
#   -o, --output-dir DIR         Local directory to harvest all results
#                                  (default: ./agent-results/)
#   -E, --env KEY=VAL            Environment variable to pass (repeatable)
#                                  Injected via .devcontainer remoteEnv
#   -p, --push                   Auto-push after agent completes
#   -k, --keep                   Keep the codespace for debugging
#   -m, --machine TYPE           Machine type: basic, standard, premium, large
#       --idle-timeout DUR       Inactivity timeout (default: 15m)
#       --retention DUR          Retention after stop (default: 2h)
#   -n, --dry-run                Print what would be done, don't create
#       --skip-health            Skip pre-flight reachability checks
#   -v, --verbose                Debug-level logging
#   -h, --help                   Show this help and exit
#
# Exit codes:
#   0 — Agent task completed successfully (or dry-run)
#   2 — Missing dependency (gh CLI, etc.)
#   3 — Codespace creation failed
#   4 — Agent script injection failed
#   5 — Agent command failed (propagated from agent)
#   6 — Output harvest failed
#   7 — Timeout waiting for completion
#   * — Shell-level error from the agent command
#
# Examples:
#
#   # Run Claude Code on pincher with an inline task
#   ./codespace-agent.sh -R SuperInstance/pincher \
#     --entrypoint claude \
#     --task "Read the README, run cargo test, report results" \
#     --output-dir ./results/pincher-audit/
#
#   # Run Kimi Code with a task file for cross-crate stitching
#   ./codespace-agent.sh -R SuperInstance/ternary-sort \
#     --entrypoint kimi \
#     --task-file ./tasks/stitch-ternary-types.md \
#     --push
#
#   # Custom entrypoint with env injection
#   ./codespace-agent.sh -R SuperInstance/pincher \
#     --entrypoint custom \
#     --entrypoint-cmd "python3 /workspace/agent.py" \
#     --env DEEPINFRA_API_KEY="sk-..." \
#     --env AGENT_LOG_LEVEL=debug \
#     --keep
#
# Lifecycle:
#   1. Pre-flight: check gh CLI, auth scopes, repo reachability
#   2. Create codespace from repo + branch with L3 devcontainer
#   3. Inject task instructions (--task + --task-file combined)
#   4. Build and execute agent command inside codespace
#   5. Harvest all output: stdout/stderr logs, generated files
#   6. Optionally push git changes from inside the codespace
#   7. Delete codespace (or --keep for debugging)
#
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configurable defaults ─────────────────────────────────────────────
DEFAULT_REPO="SuperInstance/pincher"
DEFAULT_BRANCH="main"
DEFAULT_ENTRYPOINT="claude"
DEFAULT_IDLE_TIMEOUT="15m"
DEFAULT_RETENTION="2h"
DEFAULT_CREATE_TIMEOUT=300
OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)/agent-results"
TASK_TEXT=""
TASK_FILE=""
DECLARED_ENVS=()
PUSH_FLAG=false
KEEP_FLAG=false
SKIP_HEALTH=false
DRY_RUN=false
VERBOSE=false
MACHINE=""
ENTRYPOINT_CMD=""
ENTRYPOINT_ARGS=""

# ─── Help ──────────────────────────────────────────────────────────────
usage() {
    cat <<'EOF'
Usage: codespace-agent.sh [options]

Create an ephemeral GitHub Codespace, run an AI coding agent inside it,
capture all results, optionally push, then clean up.

Options:
  -R, --repo OWNER/REPO        Repository (default: SuperInstance/pincher)
  -b, --branch BRANCH          Branch (default: main)
  -e, --entrypoint TYPE        Agent type: claude | kimi | custom (default: claude)
      --entrypoint-cmd CMD     Custom command (for --entrypoint custom)
      --entrypoint-args ARGS   Extra args for the agent binary
  -t, --task TEXT              Inline task description
  -f, --task-file FILE         Task .md file to inject into codespace
  -o, --output-dir DIR         Local output directory (default: ./agent-results/)
  -E, --env KEY=VAL            Env variable for the codespace (repeatable)
  -p, --push                   Auto-push after agent completes
  -k, --keep                   Don't delete the codespace afterwards
  -m, --machine TYPE           Machine type: basic|standard|premium|large
      --idle-timeout DUR       Idle timeout (default: 15m)
      --retention DUR          Retention after stop (default: 2h)
  -n, --dry-run                Dry run, don't create anything
      --skip-health            Skip pre-flight checks
  -v, --verbose                Debug logging
  -h, --help                   This help

Examples:
  ./codespace-agent.sh -R SuperInstance/pincher -t "cargo test"
  ./codespace-agent.sh -R SuperInstance/pincher -e kimi -f tasks/audit.md -p
EOF
    exit 0
}

# ─── Logging ───────────────────────────────────────────────────────────
log()  { echo "[codespace-agent] $*" >&2; }
info() { log "• $*"; }
ok()   { log "✓ $*"; }
warn() { log "⚠ $*"; }
err()  { log "✗ $*"; }
debug() { $VERBOSE && log "[debug] $*" || true; }

# ─── Cleanup handler ───────────────────────────────────────────────────
CLEANUP_CODESPACE=""
AGENT_TEMP_DIR=""

cleanup() {
    local rc=$?
    # Remove local temp staging directory
    if [ -n "$AGENT_TEMP_DIR" ] && [ -d "$AGENT_TEMP_DIR" ]; then
        rm -rf "$AGENT_TEMP_DIR" 2>/dev/null || true
    fi

    # Delete codespace unless --keep
    if [ -n "$CLEANUP_CODESPACE" ] && ! $KEEP_FLAG; then
        info "Deleting codespace $CLEANUP_CODESPACE …"
        gh codespace delete --codespace "$CLEANUP_CODESPACE" --force 2>/dev/null || \
            warn "Could not delete codespace (may already be gone)"
        ok "Codespace deleted"
    elif [ -n "$CLEANUP_CODESPACE" ] && $KEEP_FLAG; then
        info "Codespace $CLEANUP_CODESPACE kept for debugging (--keep)"
        info "  Connect: gh codespace ssh --codespace $CLEANUP_CODESPACE"
        info "  Delete:  gh codespace delete --codespace $CLEANUP_CODESPACE"
    fi
    exit "$rc"
}
trap cleanup EXIT INT TERM

# ─── Parse arguments ───────────────────────────────────────────────────
REPO="$DEFAULT_REPO"
BRANCH="$DEFAULT_BRANCH"
ENTRYPOINT="$DEFAULT_ENTRYPOINT"
IDLE_TIMEOUT="$DEFAULT_IDLE_TIMEOUT"
RETENTION="$DEFAULT_RETENTION"
CREATE_TIMEOUT="$DEFAULT_CREATE_TIMEOUT"
DISPLAY_NAME=""

while [ $# -gt 0 ]; do
    case "$1" in
        -R|--repo)                REPO="$2"; shift 2 ;;
        -b|--branch)              BRANCH="$2"; shift 2 ;;
        -e|--entrypoint)          ENTRYPOINT="$2"; shift 2 ;;
        --entrypoint-cmd)         ENTRYPOINT_CMD="$2"; shift 2 ;;
        --entrypoint-args)        ENTRYPOINT_ARGS="$2"; shift 2 ;;
        -t|--task)                TASK_TEXT="$2"; shift 2 ;;
        -f|--task-file)           TASK_FILE="$2"; shift 2 ;;
        -o|--output-dir)          OUTPUT_DIR="$2"; shift 2 ;;
        -E|--env)                 DECLARED_ENVS+=("$2"); shift 2 ;;
        -p|--push)                PUSH_FLAG=true; shift ;;
        -k|--keep)                KEEP_FLAG=true; shift ;;
        -m|--machine)             MACHINE="$2"; shift 2 ;;
        --idle-timeout)           IDLE_TIMEOUT="$2"; shift 2 ;;
        --retention)              RETENTION="$2"; shift 2 ;;
        --skip-health)            SKIP_HEALTH=true; shift ;;
        -n|--dry-run)             DRY_RUN=true; shift ;;
        -v|--verbose)             VERBOSE=true; shift ;;
        -h|--help)                usage ;;
        -*)                       err "Unknown flag: $1"; usage ;;
        *)                        err "Unexpected argument: $1"; usage ;;
    esac
done

# ─── Validate entrypoint ───────────────────────────────────────────────
case "$ENTRYPOINT" in
    claude|kimi|custom) ;;
    *)
        err "Unknown entrypoint: $ENTRYPOINT (must be: claude, kimi, custom)"
        exit 2
        ;;
esac

if [ "$ENTRYPOINT" = "custom" ] && [ -z "$ENTRYPOINT_CMD" ]; then
    err "--entrypoint custom requires --entrypoint-cmd <command>"
    exit 2
fi

# ─── Pre-flight checks ────────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
    err "gh (GitHub CLI) is required but not found in PATH"
    exit 2
fi

if ! $SKIP_HEALTH; then
    # Check codespace scope
    GH_STATUS=$(gh auth status 2>&1 || true)
    GH_SCOPES=$(echo "$GH_STATUS" | grep -oP '(?<=Token scopes: ).*' || true)
    if ! echo "$GH_SCOPES" | grep -qw 'codespace'; then
        warn "The 'codespace' scope is missing from your gh token."
        warn "Run: gh auth refresh -h github.com -s codespace"
        if ! $DRY_RUN; then
            warn "Proceeding anyway — creation may fail until you add the scope."
        fi
    fi

    # Check repo exists
    if ! gh repo view "$REPO" &>/dev/null; then
        warn "Repository $REPO not found or not accessible."
        warn "Check auth and repo name. Proceeding anyway."
    fi

    # Check task file exists if specified
    if [ -n "$TASK_FILE" ] && [ ! -f "$TASK_FILE" ]; then
        err "Task file not found: $TASK_FILE"
        exit 2
    fi
fi

# ─── Resolve paths ─────────────────────────────────────────────────────
OUTPUT_DIR="$(realpath -m "$OUTPUT_DIR" 2>/dev/null || echo "$OUTPUT_DIR")"
TASK_FILE="$(realpath -m "$TASK_FILE" 2>/dev/null || echo "$TASK_FILE")"

# ─── Build the task instructions ───────────────────────────────────────
# Combine inline --task text with --task-file content into one instruction set
AGENT_INSTRUCTIONS=""
SNIPPET_FILES=()

if [ -n "$TASK_TEXT" ]; then
    AGENT_INSTRUCTIONS+="## Agent Task (inline)
$TASK_TEXT
"
fi

if [ -n "$TASK_FILE" ] && [ -f "$TASK_FILE" ]; then
    TASK_FILE_CONTENT=$(cat "$TASK_FILE")
    AGENT_INSTRUCTIONS+="
## Agent Task (from file: $TASK_FILE)
$TASK_FILE_CONTENT
"
fi

# If no task at all, create a default "explore and report" task
if [ -z "$AGENT_INSTRUCTIONS" ]; then
    AGENT_INSTRUCTIONS="## Agent Task (default)
Explore this repository. Report:
- Repository structure (top-level directories and key files)
- Language breakdown
- Build system status (try building)
- Any obvious issues or observations

Write your report to /workspace/agent-report.md
"
fi

# ─── Dry-run / summary ─────────────────────────────────────────────────
DRY_RUN_MSG=""
$DRY_RUN && DRY_RUN_MSG=" [DRY RUN - would create]"

info "╔══════════════════════════════════════════════════╗"
info "║   Codespace Agent Configuration$DRY_RUN_MSG"
info "╚══════════════════════════════════════════════════╝"
info "  Repo:          $REPO"
info "  Branch:        $BRANCH"
info "  Entrypoint:    $ENTRYPOINT"
if [ "$ENTRYPOINT" = "custom" ]; then
    info "  Custom cmd:    $ENTRYPOINT_CMD"
fi
[ -n "$ENTRYPOINT_ARGS" ] && info "  Extra args:    $ENTRYPOINT_ARGS"
[ -n "$MACHINE" ]       && info "  Machine:       $MACHINE"
info "  Idle timeout:  $IDLE_TIMEOUT"
info "  Retention:     $RETENTION"
info "  Output dir:    $OUTPUT_DIR"
info "  Auto-push:     $PUSH_FLAG"
info "  Keep after:    $KEEP_FLAG"
info "  Task length:   $(echo "$AGENT_INSTRUCTIONS" | wc -c) chars"
if [ ${#DECLARED_ENVS[@]} -gt 0 ]; then
    info "  Env vars:      ${DECLARED_ENVS[*]}"
fi

$DRY_RUN && exit 0

# ─── Create local temp staging directory ───────────────────────────────
AGENT_TEMP_DIR=$(mktemp -d -t codespace-agent-XXXXXX)
debug "Temp staging dir: $AGENT_TEMP_DIR"

# Write task instructions to a file for injection
echo "$AGENT_INSTRUCTIONS" > "$AGENT_TEMP_DIR/AGENT_INSTRUCTIONS.md"

# ─── Build the agent runner script ─────────────────────────────────────
# This script is uploaded to the codespace via SSH heredoc, then executed
# It handles: agent invocation, file harvest metadata, optional git push
AGENT_RUNNER_SCRIPT="$AGENT_TEMP_DIR/_agent_runner.sh"

cat > "$AGENT_RUNNER_SCRIPT" <<'RUNNER_EOF'
#!/usr/bin/env bash
#
# agent-runner.sh — injected into codespace by codespace-agent.sh
# Handles: agent execution, output capture, optional git push
#
set -euo pipefail

AGENT_INSTRUCTIONS_FILE="@@AGENT_INSTRUCTIONS_FILE@@"
AGENT_ENTRYPOINT="@@AGENT_ENTRYPOINT@@"
AGENT_ENTRYPOINT_CMD="@@AGENT_ENTRYPOINT_CMD@@"
AGENT_ENTRYPOINT_ARGS="@@AGENT_ENTRYPOINT_ARGS@@"
AGENT_PUSH_FLAG="@@AGENT_PUSH_FLAG@@"
AGENT_OUTPUT_DIR="@@AGENT_OUTPUT_DIR@@"

REPORT_FILE="/workspace/agent-report.md"
OUTPUT_LOG="/workspace/agent-output.log"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%S 2>/dev/null || date -u +%Y%m%dT%H%M%S)

echo "=============================================="
echo "  Agent Runner — Boot at $TIMESTAMP"
echo "  Entrypoint:  $AGENT_ENTRYPOINT"
echo "  Repo:        $(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo 'unknown')"
echo "=============================================="
echo ""

# ─── 1. Show instructions ───────────────────────────
echo "=== AGENT INSTRUCTIONS ==="
echo ""
if [ -f "$AGENT_INSTRUCTIONS_FILE" ]; then
    cat "$AGENT_INSTRUCTIONS_FILE"
else
    echo "Warning: Instructions file not found at $AGENT_INSTRUCTIONS_FILE"
    echo "Continuing with default behavior."
fi
echo ""
echo "=== END INSTRUCTIONS ==="
echo ""

# ─── 2. Resolve agent binary ────────────────────────
resolve_agent() {
    local entrypoint="$1"
    case "$entrypoint" in
        claude)
            if command -v claude &>/dev/null; then
                echo "claude"
            elif [ -f "$HOME/.local/bin/claude" ]; then
                echo "$HOME/.local/bin/claude"
            else
                # Try npm global
                which claude 2>/dev/null || echo ""
            fi
            ;;
        kimi)
            if command -v kimi &>/dev/null; then
                echo "kimi"
            elif [ -f "$HOME/.local/bin/kimi" ]; then
                echo "$HOME/.local/bin/kimi"
            else
                which kimi 2>/dev/null || echo ""
            fi
            ;;
        custom)
            echo "$AGENT_ENTRYPOINT_CMD"
            ;;
        *)
            echo ""
            ;;
    esac
}

AGENT_BIN=$(resolve_agent "$AGENT_ENTRYPOINT")
echo "Agent binary resolved: ${AGENT_BIN:-custom}"

if [ "$AGENT_ENTRYPOINT" != "custom" ] && [ -z "$AGENT_BIN" ]; then
    echo ""
    echo "WARNING: Agent binary '$AGENT_ENTRYPOINT' not found in PATH."
    echo "Attempting fallback installation..."
    echo ""

    case "$AGENT_ENTRYPOINT" in
        claude)
            echo "Installing Claude Code via npm..."
            npm install -g @anthropic-ai/claude-code 2>&1 || true
            AGENT_BIN=$(command -v claude || echo "")
            ;;
        kimi)
            echo "Installing Kimi Code..."
            pip install kimi-code 2>&1 || true
            AGENT_BIN=$(command -v kimi || echo "")
            ;;
    esac

    if [ -z "$AGENT_BIN" ]; then
        echo "ERROR: Agent binary still not found after fallback install."
        echo "Falling back to: ls, pwd, env dump for diagnostic output."
        AGENT_BIN=""
    fi
fi

# ─── 3. Collect pre-execution snapshot ───────────────
echo ""
echo "=== PRE-EXECUTION SNAPSHOT ==="
echo "Date:    $(date -u)"
echo "Host:    $(hostname)"
echo "Kernel:  $(uname -a)"
echo "Cores:   $(nproc 2>/dev/null || echo unknown)"
echo "Memory:  $(free -h 2>/dev/null | head -2 || echo unknown)"
echo "Disk:    $(df -h / 2>/dev/null | tail -1 || echo unknown)"
echo "Git:     $(git log --oneline -3 2>/dev/null || echo 'no git history')"
echo ""

# ─── 4. Execute the agent ────────────────────────────
echo "=== AGENT EXECUTION ==="
echo ""

AGENT_START=$(date +%s)
AGENT_RC=0

# Construct the command
if [ "$AGENT_ENTRYPOINT" = "custom" ]; then
    # Custom command — run as-is
    echo "Running: ${AGENT_ENTRYPOINT_CMD} ${AGENT_ENTRYPOINT_ARGS}"
    echo ""
    eval "${AGENT_ENTRYPOINT_CMD} ${AGENT_ENTRYPOINT_ARGS}" 2>&1 || AGENT_RC=$?
elif [ -n "$AGENT_BIN" ]; then
    # Resolved binary — build agent command
    case "$AGENT_ENTRYPOINT" in
        claude)
            AGENT_CMD="$AGENT_BIN"
            # claude typically reads stdin for the prompt
            echo "Running: $AGENT_BIN ${AGENT_ENTRYPOINT_ARGS}"
            echo ""
            # Pipe instructions as the prompt
            cat "$AGENT_INSTRUCTIONS_FILE" | $AGENT_CMD ${AGENT_ENTRYPOINT_ARGS} 2>&1 || AGENT_RC=$?
            ;;
        kimi)
            # Kimi accepts -p for prompt
            echo "Running: $AGENT_BIN -p \"<instruction>\" ${AGENT_ENTRYPOINT_ARGS}"
            echo ""
            # Use --quiet or not based on args
            TASK_CONTENT=$(cat "$AGENT_INSTRUCTIONS_FILE" 2>/dev/null || echo "Explore repo")
            # Escape for shell safety on the prompt string
            $AGENT_BIN -p "$TASK_CONTENT" ${AGENT_ENTRYPOINT_ARGS} 2>&1 || AGENT_RC=$?
            ;;
        *)
            echo "Running: $AGENT_BIN ${AGENT_ENTRYPOINT_ARGS}"
            echo ""
            $AGENT_BIN ${AGENT_ENTRYPOINT_ARGS} 2>&1 || AGENT_RC=$?
            ;;
    esac
else
    echo "No agent binary found. Running diagnostic mode..."
    echo ""
    # Diagnostic mode: just explore and report
    echo "## Repository Diagnostic Report" > "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Structure" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    find . -maxdepth 3 -not -path '*/\.*' -not -path '*/node_modules/*' -not -path '*/target/*' | head -100 >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Git Status" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    git status >> "$REPORT_FILE" 2>&1
    echo '```' >> "$REPORT_FILE"
    AGENT_RC=0
fi

AGENT_END=$(date +%s)
AGENT_DURATION=$((AGENT_END - AGENT_START))

echo ""
echo "=== AGENT EXECUTION COMPLETE ==="
echo "Exit code: $AGENT_RC"
echo "Duration:  ${AGENT_DURATION}s"
echo ""

# ─── 5. Collect post-execution artifacts ─────────────
echo "=== ARTIFACT COLLECTION ==="
echo ""

# Create the output harvest directory
HARVEST_DIR="$AGENT_OUTPUT_DIR/harvest-${TIMESTAMP}"
mkdir -p "$HARVEST_DIR"

# Copy logs
cp "$OUTPUT_LOG" "$HARVEST_DIR/agent-output.log" 2>/dev/null || true
[ -f "$REPORT_FILE" ] && cp "$REPORT_FILE" "$HARVEST_DIR/agent-report.md" 2>/dev/null

# Gather git diff / status
git log --oneline -10 2>/dev/null > "$HARVEST_DIR/git-log.txt" || true
git diff --stat 2>/dev/null > "$HARVEST_DIR/git-diff-stat.txt" || true
git diff --name-only 2>/dev/null > "$HARVEST_DIR/git-diff-files.txt" || true
git status > "$HARVEST_DIR/git-status.txt" 2>/dev/null || true

# List any new files created by the agent
echo "=== New / Modified Files ===" > "$HARVEST_DIR/new-files.txt"
git diff --name-only HEAD 2>/dev/null >> "$HARVEST_DIR/new-files.txt" || true
echo "" >> "$HARVEST_DIR/new-files.txt"
echo "=== Untracked Files ===" >> "$HARVEST_DIR/new-files.txt"
git ls-files --others --exclude-standard 2>/dev/null >> "$HARVEST_DIR/new-files.txt" || true

# Collect any generated files (agent-report, etc.)
for f in /workspace/*.md /workspace/*.txt /workspace/*.json 2>/dev/null; do
    if [ -f "$f" ]; then
        cp "$f" "$HARVEST_DIR/" 2>/dev/null || true
    fi
done

echo "Artifacts harvested to: $HARVEST_DIR"
ls -la "$HARVEST_DIR/"

# ─── 6. Metadata summary ──────────────────────────────
cat > "$HARVEST_DIR/agent-meta.json" <<JSONEOF
{
  "timestamp": "$TIMESTAMP",
  "duration_seconds": $AGENT_DURATION,
  "exit_code": $AGENT_RC,
  "entrypoint": "$AGENT_ENTRYPOINT",
  "instructions_file": "$AGENT_INSTRUCTIONS_FILE",
  "push_enabled": $AGENT_PUSH_FLAG
}
JSONEOF

echo ""
echo "=== HARVEST SUMMARY ==="
cat "$HARVEST_DIR/agent-meta.json"
echo ""

# ─── 7. Optional git push ─────────────────────────────
if [ "$AGENT_PUSH_FLAG" = "true" ]; then
    echo ""
    echo "=== GIT PUSH ==="
    echo ""

    # Only push if there are changes
    if git diff --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
        echo "No changes to push."
    else
        BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
        COMMIT_MSG="[codespace-agent] ${AGENT_ENTRYPOINT} run ${TIMESTAMP}"

        git add -A
        git commit -m "$COMMIT_MSG" -m "Generated by codespace-agent.sh entrypoint=$AGENT_ENTRYPOINT"

        # Try push, but don't fail if it doesn't work (network/permissions)
        if git push origin "$BRANCH_NAME" 2>&1; then
            echo "✓ Changes pushed to origin/$BRANCH_NAME"
        else
            echo "⚠ Push failed — check network and permissions"
        fi
    fi
fi

echo ""
echo "=============================================="
echo "  Agent Runner — Complete at $(date -u)"
echo "  Exit code: $AGENT_RC"
echo "=============================================="

exit $AGENT_RC
RUNNER_EOF

# ─── Codespace creation ─────────────────────────────────────────────────
info "Creating codespace for $REPO (branch: $BRANCH) …"

CREATE_ARGS=(
    --repo "$REPO"
    --branch "$BRANCH"
    --default-permissions
    --idle-timeout "$IDLE_TIMEOUT"
    --retention-period "$RETENTION"
)

[ -n "$MACHINE" ] && CREATE_ARGS+=(-m "$MACHINE")

CS_OUTPUT=$(gh codespace create "${CREATE_ARGS[@]}" 2>&1)
debug "create output: $CS_OUTPUT"

CS_NAME=$(echo "$CS_OUTPUT" | tail -1 | tr -d '[:space:]')

if [ -z "$CS_NAME" ]; then
    err "Failed to create codespace. Output: $CS_OUTPUT"
    exit 3
fi

CLEANUP_CODESPACE="$CS_NAME"
ok "Codespace created: $CS_NAME"

# ─── Wait for "Available" state ────────────────────────────────────────
info "Waiting for codespace to become available (timeout: ${CREATE_TIMEOUT}s) …"

WAIT_START=$(date +%s)
while true; do
    NOW=$(date +%s)
    ELAPSED=$((NOW - WAIT_START))
    if [ "$ELAPSED" -ge "$CREATE_TIMEOUT" ]; then
        err "Timed out waiting for codespace after ${CREATE_TIMEOUT}s"
        exit 7
    fi

    STATE=$(gh codespace view --codespace "$CS_NAME" --json state -q .state 2>&1 || true)
    debug "State: $STATE (elapsed: ${ELAPSED}s)"

    case "$STATE" in
        Available)
            ok "Codespace $CS_NAME is ready"
            break
            ;;
        Queued|Creating|Pending|"")
            sleep 5
            ;;
        ShuttingDown|Shutdown|Deleted|Unknown)
            err "Codespace entered unexpected state: $STATE"
            exit 3
            ;;
        *)
            sleep 5
            ;;
    esac
done

# ─── Inject agent runner and instructions ──────────────────────────────
info "Injecting agent instructions and runner script …"

# The runner script needs placeholders resolved before upload
RUNNER_CONTENT=$(cat "$AGENT_RUNNER_SCRIPT")
# Replace placeholders
RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_INSTRUCTIONS_FILE@@/\/workspace\/AGENT_INSTRUCTIONS.md}"
RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_ENTRYPOINT@@/$ENTRYPOINT}"
RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_ENTRYPOINT_CMD@@/$ENTRYPOINT_CMD}"
RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_ENTRYPOINT_ARGS@@/$ENTRYPOINT_ARGS}"
if $PUSH_FLAG; then
    RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_PUSH_FLAG@@/true}"
else
    RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_PUSH_FLAG@@/false}"
fi
RUNNER_CONTENT="${RUNNER_CONTENT//@@AGENT_OUTPUT_DIR@@/\/workspace}"

# Write resolved runner to temp
echo "$RUNNER_CONTENT" > "$AGENT_TEMP_DIR/_agent_runner_resolved.sh"

# Upload instructions and runner via SSH heredoc (multi-file technique)
# Strategy: pipe both files as a tar to avoid multiple SSH round-trips
(cd "$AGENT_TEMP_DIR" && \
    tar cf - AGENT_INSTRUCTIONS.md _agent_runner_resolved.sh 2>/dev/null) | \
    gh codespace ssh --codespace "$CS_NAME" -- \
        bash -c 'cd /workspace && tar xf - && chmod +x _agent_runner_resolved.sh' 2>&1 || {
    err "Failed to inject files via tar"
    # Fallback: try individual file copies
    warn "Trying individual file uploads..."
    cat "$AGENT_TEMP_DIR/AGENT_INSTRUCTIONS.md" | \
        gh codespace ssh --codespace "$CS_NAME" -- \
        bash -c 'cat > /workspace/AGENT_INSTRUCTIONS.md' 2>/dev/null || {
            err "Failed to inject instructions file"
            exit 4
        }
    cat "$AGENT_TEMP_DIR/_agent_runner_resolved.sh" | \
        gh codespace ssh --codespace "$CS_NAME" -- \
        bash -c 'cat > /workspace/_agent_runner.sh && chmod +x /workspace/_agent_runner.sh' 2>/dev/null || {
            err "Failed to inject runner script"
            exit 4
        }
}

ok "Agent instructions and runner injected"

# ─── Inject environment variables ──────────────────────────────────────
# We inject via remoteEnv on the codespace itself using gh API
if [ ${#DECLARED_ENVS[@]} -gt 0 ]; then
    info "Injecting ${#DECLARED_ENVS[@]} environment variables …"
    # Build JSON patch for remoteEnv
    ENV_JSON="{"
    FIRST=true
    for pair in "${DECLARED_ENVS[@]}"; do
        $FIRST || ENV_JSON+=", "
        FIRST=false
        KEY="${pair%%=*}"
        VAL="${pair#*=}"
        # Escape for JSON
        VAL=$(echo "$VAL" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))" 2>/dev/null || echo "\"$VAL\"")
        ENV_JSON+="\"$KEY\": $VAL"
    done
    ENV_JSON+="}"

    debug "Env JSON: $ENV_JSON"
    # Attempt to set via gh api (may not be supported on all codespace tiers)
    gh api "codespaces/$CS_NAME" -X PATCH \
        -f "machine=$MACHINE" \
        --jq '.' 2>/dev/null || warn "Could not inject env vars via API (continuing anyway)"

    # Alternative: write a .env file inside the codespace
    for pair in "${DECLARED_ENVS[@]}"; do
        KEY="${pair%%=*}"
        VAL="${pair#*=}"
        echo "export $KEY='$VAL'" | \
            gh codespace ssh --codespace "$CS_NAME" -- \
            bash -c "cat >> /workspace/.agent-env" 2>/dev/null || true
    done
    ok "Environment variables injected"
fi

# ─── Run the agent ─────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
OUTFILE="$OUTPUT_DIR/${CS_NAME}-${TIMESTAMP}.log"
HARVEST_DIR="$OUTPUT_DIR/harvest-${TIMESTAMP}"
mkdir -p "$HARVEST_DIR"

info "Running agent '$ENTRYPOINT' in codespace $CS_NAME …"
info "Output: $OUTFILE"

set +e
START_TS=$(date +%s)
gh codespace ssh --codespace "$CS_NAME" -- \
    bash /workspace/_agent_runner.sh 2>&1 | tee "$OUTFILE"
CMD_RC=${PIPESTATUS[0]}
END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))
set -e

debug "Agent completed in ${DURATION}s with exit code $CMD_RC"

# ─── Harvest output files from codespace ───────────────────────────────
info "Harvesting output artifacts from codespace …"

# Determine the harvest directory name dynamically from the runner log
HARVEST_REMOTE=$(grep -oP 'Harvesting artifacts to: \K\S+' "$OUTFILE" 2>/dev/null || echo "/workspace/harvest-${TIMESTAMP}")

# Download the entire harvest directory via SSH tar pipe
(
    echo "Downloading artifacts from $HARVEST_REMOTE …"
    gh codespace ssh --codespace "$CS_NAME" -- \
        bash -c "cd /workspace && tar cf - harvest-* 2>/dev/null" 2>/dev/null | \
        tar xf - -C "$HARVEST_DIR" 2>/dev/null
) || {
    warn "Artifact harvest via tar failed, trying individual file copies …"
    # Fallback: grab key files individually
    for f in agent-output.log agent-report.md agent-meta.json git-log.txt git-diff-stat.txt git-diff-files.txt git-status.txt new-files.txt; do
        gh codespace ssh --codespace "$CS_NAME" -- \
            bash -c "cat /workspace/harvest-*/$f 2>/dev/null" > "$HARVEST_DIR/$f" 2>/dev/null || true
    done
}

# Also grab any workspace-level files the agent might have left
(
    for f in agent-report.md; do
        gh codespace ssh --codespace "$CS_NAME" -- \
            bash -c "cat /workspace/$f 2>/dev/null" > "$HARVEST_DIR/$f" 2>/dev/null || true
    done
) || true

# Write a local metadata file
cat > "$OUTPUT_DIR/last-run.json" <<JSONEOF
{
  "codespace": "$CS_NAME",
  "repo": "$REPO",
  "branch": "$BRANCH",
  "entrypoint": "$ENTRYPOINT",
  "started": "$(date -u -d @$START_TS 2>/dev/null || date -u)",
  "duration_seconds": $DURATION,
  "exit_code": $CMD_RC,
  "output_dir": "$OUTPUT_DIR",
  "harvest_dir": "$HARVEST_DIR"
}
JSONEOF

ok "Harvest complete: $HARVEST_DIR"

# ─── Emit summary ──────────────────────────────────────────────────────
if [ "$CMD_RC" -eq 0 ]; then
    ok "Agent task succeeded (exit code 0, duration ${DURATION}s)"
else
    warn "Agent task finished with exit code $CMD_RC (duration ${DURATION}s)"
fi

info "Full agent output: $OUTFILE"
info "Harvested artifacts: $HARVEST_DIR"
info ""
info "=== Agent Result Summary ==="
echo "  Repo:       $REPO"
echo "  Branch:     $BRANCH"
echo "  Agent:      $ENTRYPOINT"
echo "  Duration:   ${DURATION}s"
echo "  Exit code:  $CMD_RC"
echo "  Harvest:    $HARVEST_DIR"
echo "  Log:        $OUTFILE"
echo ""

# ─── Final exit ────────────────────────────────────────────────────────
# The trap will handle codespace deletion (unless --keep)
FINAL_RC=$CMD_RC
trap "cleanup; exit $FINAL_RC" EXIT INT TERM
exit $FINAL_RC
