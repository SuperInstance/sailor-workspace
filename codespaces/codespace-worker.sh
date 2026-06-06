#!/usr/bin/env bash
#
# ╔══════════════════════════════════════════════════════════════════════╗
# ║            codespace-worker.sh — Ephemeral Codespace Runner         ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Creates a GitHub Codespace from a repo/branch, runs a command inside it,
# captures all output, then nukes the Codespace. Like a lambda function
# but with a full dev environment and an SSH connection.
#
# Why would I use this?
#   You're on an ARM64 host (Oracle, Apple Silicon) and need to run x86_64
#   builds. Or you need a clean-room environment with a full devcontainer
#   for a CI-like run. Or you want to spin up a Codespace, run Claude Code
#   or Kimi Code on a codebase, grab the result, and leave zero trace.
#   This script is your "disposable laptop" button.
#
# Usage:
#   codespace-worker.sh [options] -- <command>
#
# Options:
#   -R, --repo OWNER/REPO      Repository for the codespace
#                               (default: SuperInstance/pincher)
#   -b, --branch BRANCH        Branch to use (default: main)
#   -m, --machine TYPE         Machine type: basic, standard, premium, large
#                               (auto if omitted — GitHub picks)
#   -t, --timeout SECONDS      Max seconds to wait for creation
#                               (default: 300)
#       --idle-timeout DUR     Inactivity timeout, e.g. "5m", "30m"
#                               (default: 10m)
#       --retention DUR        Retention after stop, e.g. "1h", "4h"
#                               (default: 1h)
#   -o, --output-dir DIR       Directory for output files (default: ./output)
#   -d, --display-name NAME    Friendly name (max 48 chars)
#   -n, --dry-run              Print config but don't create
#   -v, --verbose              Debug-level logging
#   -h, --help                 Show full help and exit
#
# Exit codes:
#   0 — Command ran successfully (or dry-run completed)
#   2 — gh CLI missing or incomplete
#   3 — Codespace creation failed
#   4 — Timed out waiting for Available state
#   5 — Codespace entered unexpected state (ShuttingDown/Deleted/Unknown)
#   * — The command's own exit code is propagated
#
# Examples:
#   # Run a cross-architecture build
#   ./codespace-worker.sh -R SuperInstance/pincher -- cargo build --release
#
#   # Kimi Code fleet worker on a feature branch
#   ./codespace-worker.sh -R SuperInstance/pincher -b feature/refactor \
#     -- kimi --quiet -p "Add docs to src/lib.rs"
#
#   # Multi-step pipeline via sh -c
#   ./codespace-worker.sh -R SuperInstance/pincher -- \
#     sh -c "make test && make bench && echo 'All green'"
#
#   # Interactive session (no command = leave running)
#   ./codespace-worker.sh -R SuperInstance/pincher
#   # Then: gh codespace ssh --codespace <name>
#
#   # Dry run to verify flags
#   ./codespace-worker.sh -R SuperInstance/pincher -m basic -n
#
# Lifecycle:
#   1. Create Codespace from repo + branch
#   2. Wait for "Available" state (poll every 5s, timeout configurable)
#   3. SSH in and run command
#   4. Capture stdout+stderr to $OUTPUT_DIR/<csname>-<timestamp>.log
#   5. Delete Codespace (trap handler guarantees cleanup on INT/TERM/EXIT)
#
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configurable defaults ─────────────────────────────────────────────
DEFAULT_REPO="SuperInstance/pincher"
DEFAULT_BRANCH="main"
DEFAULT_TIMEOUT=300          # seconds to wait for codespace to become Available
DEFAULT_MACHINE=""           # let GitHub choose (basic/standard/premium/large)
DEFAULT_IDLE_TIMEOUT="10m"   # stop after 10 min inactivity
DEFAULT_RETENTION="1h"       # auto-delete 1 h after stop
OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)/output"

# ─── Help ──────────────────────────────────────────────────────────────
usage() {
    cat <<'EOF'
Usage: codespace-worker.sh [options] -- <command>

Run <command> inside an ephemeral GitHub Codespace and capture its output.

Options:
  -R, --repo OWNER/REPO     Repository for the codespace (default: SuperInstance/pincher)
  -b, --branch BRANCH       Branch to use (default: main)
  -m, --machine TYPE        Machine type: basic, standard, premium, large (auto if omitted)
  -t, --timeout SECONDS     Max seconds to wait for creation (default: 300)
      --idle-timeout DUR    Inactivity timeout before stop, e.g. "5m", "30m" (default: 10m)
      --retention DUR       Retention after stop before deletion, e.g. "1h" (default: 1h)
  -o, --output-dir DIR      Directory for output files (default: ./output)
  -d, --display-name NAME   Friendly name for the codespace (max 48 chars)
  -n, --dry-run             Print what would be done without creating
  -v, --verbose             More detailed logging
  -h, --help                Show this help and exit

The command to run is everything after the -- separator. If omitted,
the script creates the codespace, reports its name, and leaves it running.

Examples:
  # Run a build
  ./codespace-worker.sh -R SuperInstance/pincher -- cargo build --release

  # Run Claude Code on a specific branch
  ./codespace-worker.sh -R SuperInstance/pincher -b feature/foo -- claude

  # Run a shell pipeline
  ./codespace-worker.sh -R SuperInstance/pincher -- sh -c "make test && make bench"

  # Dry run to verify flags
  ./codespace-worker.sh -R SuperInstance/pincher -m basic -n -- echo hello

EOF
    exit 0
}

# ─── Logging ───────────────────────────────────────────────────────────
VERBOSE=false
log()  { echo "[codespace-worker] $*" >&2; }
info() { log "• $*"; }
ok()   { log "✓ $*"; }
warn() { log "⚠ $*"; }
err()  { log "✗ $*"; }
debug() { $VERBOSE && log "[debug] $*" || true; }

# ─── Cleanup handler ───────────────────────────────────────────────────
CLEANUP_CODESPACE=""
cleanup() {
    local rc=$?
    if [ -n "$CLEANUP_CODESPACE" ]; then
        info "Deleting codespace $CLEANUP_CODESPACE …"
        gh codespace delete --codespace "$CLEANUP_CODESPACE" --force 2>/dev/null || \
            warn "Could not delete codespace $CLEANUP_CODESPACE (may already be gone)"
        ok "Codespace deleted"
    fi
    exit "$rc"
}
trap cleanup EXIT INT TERM

# ─── Parse arguments ───────────────────────────────────────────────────
REPO="$DEFAULT_REPO"
BRANCH="$DEFAULT_BRANCH"
MACHINE="$DEFAULT_MACHINE"
TIMEOUT="$DEFAULT_TIMEOUT"
IDLE_TIMEOUT="$DEFAULT_IDLE_TIMEOUT"
RETENTION="$DEFAULT_RETENTION"
DISPLAY_NAME=""
DRY_RUN=false
COMMAND=()

while [ $# -gt 0 ]; do
    case "$1" in
        -R|--repo)           REPO="$2"; shift 2 ;;
        -b|--branch)         BRANCH="$2"; shift 2 ;;
        -m|--machine)        MACHINE="$2"; shift 2 ;;
        -t|--timeout)        TIMEOUT="$2"; shift 2 ;;
        --idle-timeout)      IDLE_TIMEOUT="$2"; shift 2 ;;
        --retention)         RETENTION="$2"; shift 2 ;;
        -o|--output-dir)     OUTPUT_DIR="$2"; shift 2 ;;
        -d|--display-name)   DISPLAY_NAME="$2"; shift 2 ;;
        -n|--dry-run)        DRY_RUN=true; shift ;;
        -v|--verbose)        VERBOSE=true; shift ;;
        -h|--help)           usage ;;
        --)                  shift; COMMAND=("$@"); break ;;
        -*)                  err "Unknown flag: $1"; usage ;;
        *)                   err "Unexpected argument: $1"; usage ;;
    esac
done

# ─── Pre-flight checks ────────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
    err "gh (GitHub CLI) is required but not found in PATH"
    exit 2
fi

# Check for the codespace scope (required by gh codespace commands)
GH_SCOPES=$(gh auth status 2>&1 | grep -oP '(?<=Token scopes: ).*' || true)
if ! echo "$GH_SCOPES" | grep -qw 'codespace'; then
    warn "The 'codespace' scope is missing from your gh token."
    warn "Without it, gh codespace commands will be rejected."
    warn "Run this once to add it (interactive browser flow required):"
    warn "  gh auth refresh -h github.com -s codespace"
    warn "See README.md for details."
    if ! $DRY_RUN; then
        warn "Proceeding anyway — creation may fail until you add the scope."
    fi
fi

# ─── Dry-run / summary ─────────────────────────────────────────────────
DRY_RUN_MSG=""
if $DRY_RUN; then DRY_RUN_MSG=" [DRY RUN - would create]"; fi

info "Codespace worker configuration:$DRY_RUN_MSG"
info "  Repo:        $REPO"
info "  Branch:      $BRANCH"
info "  Machine:     ${MACHINE:-auto}"
info "  Idle timeout: $IDLE_TIMEOUT"
info "  Retention:   $RETENTION"
info "  Create timeout: ${TIMEOUT}s"
if [ ${#COMMAND[@]} -gt 0 ]; then
    info "  Command:     ${COMMAND[*]}"
else
    info "  Command:     (none — codespace will remain running)"
fi

$DRY_RUN && exit 0

# ─── Create codespace ──────────────────────────────────────────────────
info "Creating codespace for $REPO (branch: $BRANCH) …"

CREATE_ARGS=(
    --repo "$REPO"
    --branch "$BRANCH"
    --default-permissions
    --idle-timeout "$IDLE_TIMEOUT"
    --retention-period "$RETENTION"
)

[ -n "$MACHINE" ] && CREATE_ARGS+=(-m "$MACHINE")
[ -n "$DISPLAY_NAME" ] && CREATE_ARGS+=(-d "$DISPLAY_NAME")

CS_OUTPUT=$(gh codespace create "${CREATE_ARGS[@]}" 2>&1)
debug "create output: $CS_OUTPUT"

# Extract the codespace name — it's typically the last line of output
CS_NAME=$(echo "$CS_OUTPUT" | tail -1 | tr -d '[:space:]')

if [ -z "$CS_NAME" ] || [ "$CS_NAME" = "" ]; then
    err "Failed to create codespace. Output: $CS_OUTPUT"
    exit 3
fi

CLEANUP_CODESPACE="$CS_NAME"
ok "Codespace created: $CS_NAME"

# ─── Wait for "Available" state ────────────────────────────────────────
info "Waiting for codespace to become available (timeout: ${TIMEOUT}s) …"

WAIT_START=$(date +%s)
while true; do
    # Check elapsed time
    NOW=$(date +%s)
    ELAPSED=$((NOW - WAIT_START))
    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
        err "Timed out waiting for codespace $CS_NAME to become available after ${TIMEOUT}s"
        exit 4
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
            exit 5
            ;;
        *)
            # Unknown state — poll again after a short wait
            sleep 5
            ;;
    esac
done

# ─── No command? Just report and exit (codespace stays for manual use) ─
if [ ${#COMMAND[@]} -eq 0 ]; then
    info "No command specified. Codespace $CS_NAME left running."
    info "Connect: gh codespace ssh --codespace $CS_NAME"
    info "Delete:  gh codespace delete --codespace $CS_NAME"
    # Clear cleanup trap so we don't delete it
    CLEANUP_CODESPACE=""
    exit 0
fi

# ─── Run the command ───────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
OUTFILE="$OUTPUT_DIR/${CS_NAME}-${TIMESTAMP}.log"

info "Running command in codespace: ${COMMAND[*]}"
info "Output will be saved to: $OUTFILE"

# Start a background timer to ensure we don't hang forever
# (command timeout = create_timeout * 2 by default)
CMD_TIMEOUT=$((TIMEOUT * 2))
debug "Command timeout: ${CMD_TIMEOUT}s"

# Run the command via SSH — capture stdout+stderr and exit code
set +e
START_TS=$(date +%s)
gh codespace ssh --codespace "$CS_NAME" -- "${COMMAND[@]}" > "$OUTFILE" 2>&1
CMD_RC=$?
END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))
set -e

debug "Command completed in ${DURATION}s with exit code $CMD_RC"

# Emit a summary
if [ "$CMD_RC" -eq 0 ]; then
    ok "Command succeeded (exit code 0, duration ${DURATION}s)"
else
    warn "Command finished with exit code $CMD_RC (duration ${DURATION}s)"
fi
info "Full output: $OUTFILE"
echo "--- last 20 lines ---" >> "$OUTFILE"
tail -20 "$OUTFILE" 2>/dev/null | head -20 >> "$OUTFILE" || true

# ─── Capture exit code before cleanup removes it ──────────────────────
FINAL_RC=$CMD_RC

# ─── Cleanup (triggered by trap, but explicit here for clarity) ────────
# The trap on EXIT will delete CLEANUP_CODESPACE.
# We set it here so the trap fires on normal exit too.
# Override exit code so cleanup exit doesn't mask our result.
trap "cleanup; exit $FINAL_RC" EXIT INT TERM

# Exit with the command's exit code
exit $FINAL_RC
