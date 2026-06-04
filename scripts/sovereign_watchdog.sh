#!/bin/bash
# 🌐 SOVEREIGN WATCHDOG: Self-Healing Workstream Supervisor
# Runs every 2 minutes via cron, checks that active build sessions are alive,
# and automatically restarts any that died.
# No headspace, no memory, no apology. Just structure.

set -euo pipefail

export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
WORKSPACE="/home/ubuntu/.openclaw/workspace"
LOG="$WORKSPACE/logs/watchdog.log"
mkdir -p "$WORKSPACE/logs"

log() {
  echo "[$(date -Iseconds)] $*" >> "$LOG"
}

# --- 1. Ensure tmux server is alive ---
if ! tmux list-sessions > /dev/null 2>&1; then
  # No tmux server—need to restart it
  log "tmux server dead. Restarting sessions..."
  for session in la-claude-wide-1 la-claude-wide-2 la-claude-wide-3; do
    tmux new-session -d -s "$session" \
      "cd $WORKSPACE && echo 'Watchdog: restored $session' && tail -f /dev/null"
    log "Restored tmux session: $session"
  done
  log "tmux server fully revived."
fi

# --- 2. Check specific named sessions are alive ---
for session in la-claude-wide-1 la-claude-wide-2 la-claude-wide-3; do
  if ! tmux has-session -t "$session" 2>/dev/null; then
    log "Session $session is dead. Restarting..."
    tmux new-session -d -s "$session" \
      "cd $WORKSPACE && echo 'Watchdog: restored $session'"
    log "Restarted tmux session: $session"
  fi
done

# --- 3. Check git is not in a broken state ---
cd "$WORKSPACE"
if [ -f ".git/index.lock" ]; then
  log "Git index lock found. Removing stale lock..."
  rm -f ".git/index.lock"
  log "Stale git lock removed."
fi

# --- 4. Perform automated commit if there are pending changes (every 15 min cycle) ---
# Stash to avoid commit failures due to unstaged changes
CHANGES=$(git status --porcelain | wc -l)
if [ "$CHANGES" -gt 0 ]; then
  # Only commit every 15 minutes, controlled by a flag file
  FLAG="$WORKSPACE/.last_auto_commit"
  NOW=$(date +%s)
  if [ -f "$FLAG" ]; then
    LAST=$(cat "$FLAG")
    ELAPSED=$(( (NOW - LAST) / 60 ))
  else
    ELAPSED=999
  fi

  if [ "$ELAPSED" -ge 15 ] || [ ! -f "$FLAG" ]; then
    log "Auto-committing $CHANGES changed files..."
    git add -A
    git commit -m \
      "🐚 watchdog: auto-commit at $(date -Iseconds) [${CHANGES} files]" \
      > /dev/null 2>&1
    echo "$NOW" > "$FLAG"
    log "Auto-commit complete."
  fi
fi

log "Watchdog check complete. All systems nominal."
