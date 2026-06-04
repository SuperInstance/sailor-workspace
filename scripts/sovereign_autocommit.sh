#!/bin/bash
# 📦 SOVEREIGN AUTO-COMMIT: Time-triggered persistence cycle
# Runs every 15 minutes via cron, commits all pending changes
# with a timestamped message.
# No headspace. No memory. Just structured time-based execution.

set -euo pipefail

WORKSPACE="/home/ubuntu/.openclaw/workspace"
LOG="$WORKSPACE/logs/autocommit.log"
mkdir -p "$WORKSPACE/logs"

cd "$WORKSPACE"

CHANGES=$(git status --porcelain | wc -l)
if [ "$CHANGES" -eq 0 ]; then
  echo "[$(date -Iseconds)] No changes to commit." >> "$LOG"
  exit 0
fi

# Remove stale index lock if present
[ -f ".git/index.lock" ] && rm -f ".git/index.lock"

git add -A
git commit -m "🐚 watchdog: auto-commit at $(date -Iseconds) [${CHANGES} files]"

echo "[$(date -Iseconds)] Auto-committed ${CHANGES} files." >> "$LOG"
