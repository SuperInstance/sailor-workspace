#!/usr/bin/env bash
# Cross-Pollinate — Link KNOWLEDGE_BASE entries to REPO_KV targets
# Usage: ./cross-pollinate.sh <knowledge-entry> <repo-target>

set -euo pipefail

KNOWLEDGE_NAME="${1:-}"
REPO_NAME="${2:-}"

AGENT_DIR="$(dirname "$0")/.."

if [ -z "$KNOWLEDGE_NAME" ] || [ -z "$REPO_NAME" ]; then
    echo "Usage: $0 <knowledge-entry> <repo-target>"
    echo ""
    echo "Examples:"
    echo "  $0 LAMAN_RIGIDITY cocapn"
    echo "  $0 DEADBAND_SNR pincher"
    echo "  $0 --all        # Cross-pollinate ALL knowledge to ALL matching repos"
    exit 1
fi

if [ "$KNOWLEDGE_NAME" = "--all" ]; then
    echo "=== Full Cross-Pollination Scan ==="
    echo ""
    echo "This triggers an agent task to cross-pollinate all KNOWLEDGE_BASE entries"
    echo "to all matching REPO_KV targets."
    echo ""
    echo "Matching criteria (from ARCHITECTURE.md triggers table):"
    echo "  Pattern matches in repo name or README → write to REPO_KV"
    echo ""
    echo "To run: execute as a mining saga task."
    exit 0
fi

KNOWLEDGE_FILE="$AGENT_DIR/KNOWLEDGE_BASE/$KNOWLEDGE_NAME"
if [ ! -f "$KNOWLEDGE_FILE" ] && [ ! -f "$KNOWLEDGE_FILE.md" ]; then
    echo "Knowledge entry not found: $KNOWLEDGE_NAME"
    echo "Available:"
    ls "$AGENT_DIR/KNOWLEDGE_BASE/"*.md | sed 's|.*/||' | sed 's/\.md$//'
    exit 1
fi

REPO_FILE="$AGENT_DIR/REPO_KV/$REPO_NAME"
if [ ! -f "$REPO_FILE" ] && [ ! -f "$REPO_FILE.md" ]; then
    echo "Repo not found: $REPO_NAME"
    echo "Available:"
    ls "$AGENT_DIR/REPO_KV/"*.md | sed 's|.*/||' | sed 's/\.md$//'
    exit 1
fi

echo "=== Cross-Pollinating ==="
echo "  Knowledge: $KNOWLEDGE_NAME"
echo "  Target:    $REPO_NAME"
echo ""
echo "Operation: Add '$KNOWLEDGE_NAME' → $REPO_NAME"
echo "To confirm, edit the REPO_KV entry and cold cache."
