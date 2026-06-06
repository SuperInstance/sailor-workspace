#!/usr/bin/env bash
# PLATO Agent Bootstrap — Cold Start Recovery
# Run this when starting a fresh session to re-establish context.

set -euo pipefail

echo "=== PLATO Agent Cold Boot ==="
echo "Reading SOUL: who you are"
cat "$(dirname "$0")/../SOUL.md" | head -5

echo ""
echo "=== Cold Cache Status ==="
CONF_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CACHE_DIR="$(dirname "$0")/../COLD_CACHE"

if [ -f "$CACHE_DIR/MANIFEST.md" ]; then
    echo "Manifest found. Recent entries:"
    grep "^|" "$CACHE_DIR/MANIFEST.md" | tail -5
else
    echo "No manifest yet — first boot. Creating..."
    echo "# Cold Cache Manifest" > "$CACHE_DIR/MANIFEST.md"
    echo "" >> "$CACHE_DIR/MANIFEST.md"
    echo "| Entry | Source | Outcome | Cross-Pollinated To |" >> "$CACHE_DIR/MANIFEST.md"
    echo "|-------|--------|---------|---------------------|" >> "$CACHE_DIR/MANIFEST.md"
fi

echo ""
echo "=== Knowledge Base ==="
KNOWLEDGE_DIR="$(dirname "$0")/../KNOWLEDGE_BASE"
echo "Knowledge entries: $(ls "$KNOWLEDGE_DIR"/*.md 2>/dev/null | wc -l)"
ls "$KNOWLEDGE_DIR"/

echo ""
echo "=== Repo Knowledge ==="
REPO_DIR="$(dirname "$0")/../REPO_KV"
echo "Repo entries: $(ls "$REPO_DIR"/*.md 2>/dev/null | wc -l)"
ls "$REPO_DIR"/

echo ""
echo "=== Port Status ==="
OUTBOX="$(dirname "$0")/../CAVE_PORTS/OUTBOX"
INBOX="$(dirname "$0")/../CAVE_PORTS/INBOX"
mkdir -p "$OUTBOX" "$INBOX"
echo "Outbox: $(ls "$OUTBOX" 2>/dev/null | wc -l) pending"
echo "Inbox:  $(ls "$INBOX" 2>/dev/null | wc -l) waiting"

echo ""
echo "Boot complete. You are in PLATO's cave."
echo "Ports are open."
echo "Gold is waiting."
