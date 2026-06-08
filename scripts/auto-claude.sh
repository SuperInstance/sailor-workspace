#!/usr/bin/env bash
# Auto-approve Claude Code file writes
set -euo pipefail

SESSION="claude-code"
PROMPT="$1"
OUTPUT="${2:-/tmp/claude-findings.md}"

# Kill any existing session
tmux kill-session -t "$SESSION" 2>/dev/null || true
sleep 1

# Start Claude Code
tmux new-session -d -s "$SESSION" -c /tmp
tmux send-keys -t "$SESSION" -l -- "claude --allow-dangerously-skip-permissions -p '$PROMPT'"
tmux send-keys -t "$SESSION" Enter

# Monitor for approval prompts and auto-respond
for i in $(seq 1 30); do
  sleep 2
  output=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null || echo "")
  
  # Check for completion
  if [ -f "$OUTPUT" ]; then
    echo "✅ Claude completed at attempt $i"
    exit 0
  fi
  
  # Check for approval request
  if echo "$output" | grep -qi "proceed\|permission\|shall i\|write this file"; then
    echo "Approval detected at attempt $i — sending y"
    tmux send-keys -t "$SESSION" -l -- "y"
    tmux send-keys -t "$SESSION" Enter
    sleep 3
  fi
  
  # Check for error or completion
  if echo "$output" | grep -qi "error\|failed"; then
    echo "⚠️  Error detected: $output"
  fi
done

echo "⏳ Timeout waiting for Claude"
exit 1
