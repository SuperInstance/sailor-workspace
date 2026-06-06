#!/usr/bin/env bash
# Mine All — Scan entire workspace for unmined gold
# Identifies new/changed files since last mining run.

set -euo pipefail

WORKSPACE="/home/ubuntu/.openclaw/workspace"
AGENT_DIR="$WORKSPACE/plato-agent"
LAST_MINE="$AGENT_DIR/COLD_CACHE/last-mine-timestamp"

echo "=== Mining All: Workspace Survey ==="

# Get last mine timestamp
if [ -f "$LAST_MINE" ]; then
    LAST_TS=$(cat "$LAST_MINE")
    echo "Last mined: $LAST_TS"
else
    LAST_TS="1970-01-01T00:00:00Z"
    echo "First mine — no previous timestamp"
fi

NOW_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo ""
echo "=== Recently Modified Files ==="
# Find files modified since last mine
find "$WORKSPACE" -type f -newer "$AGENT_DIR" -name "*.md" \
    ! -path "*/plato-agent/*" \
    ! -path "*/.git/*" \
    ! -path "*/target/*" \
    ! -path "*/node_modules/*" \
    ! -path "*/COLD_CACHE/*" \
    2>/dev/null | head -20

if [ $? -eq 0 ]; then
    echo "(showing up to 20 recent files)"
fi

echo ""
echo "=== Known Gold Counts ==="
echo "KNOWLEDGE_BASE: $(ls "$AGENT_DIR/KNOWLEDGE_BASE"/*.md 2>/dev/null | wc -l) entries"
echo "REPO_KV:        $(ls "$AGENT_DIR/REPO_KV"/*.md 2>/dev/null | wc -l) entries"
echo "COLD_CACHE:     $(find "$AGENT_DIR/COLD_CACHE" -name "*.md" 2>/dev/null | wc -l) entries"

# Remaining unmined sources
echo ""
echo "=== Remaining Rich Sources ==="
UNMINED=0
for dir in "$WORKSPACE"/forgemaster-archive/experiments/*/; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        if [ ! -f "$AGENT_DIR/KNOWLEDGE_BASE/$(echo "$name" | tr '[:lower:]' '[:upper:]' | tr '-' '_').md" ]; then
            echo "  📦 experiments/$name/ — unmined"
            UNMINED=$((UNMINED + 1))
        fi
    fi
done

for dir in "$WORKSPACE"/craftmind-*/; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        if [ ! -f "$AGENT_DIR/REPO_KV/$name.md" ]; then
            echo "  📦 $name/ — unindexed"
            UNMINED=$((UNMINED + 1))
        fi
    fi
done

echo ""
echo "Found $UNMINED unmined sources."
echo "$NOW_TS" > "$LAST_MINE"
echo "Updated mine timestamp."
