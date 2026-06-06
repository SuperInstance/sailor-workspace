#!/usr/bin/env bash
# Port Check — Survey pending and completed port requests
# Run periodically to check if outside world has responded.

set -euo pipefail

AGENT_DIR="$(dirname "$0")/.."
OUTBOX="$AGENT_DIR/CAVE_PORTS/OUTBOX"
INBOX="$AGENT_DIR/CAVE_PORTS/INBOX"
RESPONSES="$AGENT_DIR/CAVE_PORTS/RESPONSES"

echo "=== Port Status ==="
echo ""

# Pending
echo "Pending requests (OUTBOX/):"
if [ -d "$OUTBOX" ]; then
    for f in "$OUTBOX"/*.jsonl "$OUTBOX"/*.json 2>/dev/null; do
        if [ -f "$f" ]; then
            ID=$(basename "$f")
            TYPE=$(grep -o '"type": "[^"]*"' "$f" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
            DESC=$(grep -o '"description": "[^"]*"' "$f" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "no description")
            echo "  ⏳ $ID ($TYPE): $DESC"
        fi
    done
fi

# Responses
echo ""
echo "Awaiting responses (INBOX/):"
if [ -d "$INBOX" ]; then
    for f in "$INBOX"/*.jsonl "$INBOX"/*.json 2>/dev/null; do
        if [ -f "$f" ]; then
            ID=$(basename "$f")
            STATUS=$(grep -o '"status": "[^"]*"' "$f" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "unknown")
            echo "  📥 $ID (status: $STATUS)"
        fi
    done
fi

# Consumed
echo ""
echo "Consumed responses (RESPONSES/):"
if [ -d "$RESPONSES" ]; then
    echo "  $(ls "$RESPONSES" 2>/dev/null | wc -l) files"
fi

echo ""
echo "To consume a response:"
echo "  1. Read the file from INBOX/"
echo "  2. Process the result"
echo "  3. Move to RESPONSES/"
echo "  4. Log to PORTS_LOG.md"
