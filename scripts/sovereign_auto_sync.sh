#!/bin/bash
# 📦 SOVEREIGN AUTO SYNC: Time-triggered commit + push to GitHub
# Runs every 15 minutes via cron, commits all pending changes, pushes to GitHub,
# and logs all activity. No memory, no manual work, just structured sync.
# Designed for remote review by Casey and cross-agent synchronicity with Forgemaster.

set -euo pipefail

# Configuration
WORKSPACE="/home/ubuntu/.openclaw/workspace"
LOG="$WORKSPACE/logs/auto_sync.log"
GIT_REMOTE="origin"  # Update to your actual GitHub remote name
GIT_BRANCH="main"    # Main branch for sync
mkdir -p "$WORKSPACE/logs"

cd "$WORKSPACE"

log() {
  echo "[$(date -Iseconds)] $*" >> "$LOG"
}

# --- 1. Clean up stale git locks first ---
[ -f ".git/index.lock" ] && rm -f ".git/index.lock"

# --- 2. Check for pending changes ---
CHANGES=$(git status --porcelain | wc -l)
if [ "$CHANGES" -eq 0 ]; then
  log "No changes to sync. Skipping commit/push."
  exit 0
fi

# --- 3. Commit changes ---
log "Committing ${CHANGES} changed files..."
git add -A
COMMIT_MSG="🐚 auto-sync: $(date -Iseconds) [${CHANGES} files] | Synced with Forgemaster sync protocol"
git commit -m "$COMMIT_MSG"

# --- 4. Push to GitHub ---
log "Pushing commit to $GIT_REMOTE/$GIT_BRANCH..."
if git push "$GIT_REMOTE" "$GIT_BRANCH"; then
  log "Successfully pushed ${CHANGES} files to GitHub."
  # Update last sync timestamp flag
  echo "$(date +%s)" > "$WORKSPACE/.last_auto_sync"
else
  log "ERROR: Failed to push to GitHub. Retrying in next cron cycle."
  exit 1
fi

# --- 5. Sync individual sovereign room repos ---
for ROOM_DIR in "$WORKSPACE"/*/; do
  if [ -d "$ROOM_DIR/.git" ]; then
    log "Syncing room repo: $ROOM_DIR"
    cd "$ROOM_DIR"
    [ -f ".git/index.lock" ] && rm -f ".git/index.lock"
    git add -A
    git commit -m "auto-sync: $(date -Iseconds)" || log "No changes in $ROOM_DIR, skipping push"
    git push "$GIT_REMOTE" "$(basename "$ROOM_DIR"):main" 2>/dev/null || log "Failed to push $ROOM_DIR"
    cd "$WORKSPACE"
  fi
done

log "Full sync completed successfully."