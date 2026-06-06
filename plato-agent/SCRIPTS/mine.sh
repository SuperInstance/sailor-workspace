#!/usr/bin/env bash
# Mining Script — Extract patterns from a target and cross-reference
# Usage: ./mine.sh <target-path-or-repo> [output-name]

set -euo pipefail

TARGET="${1:-}"
OUTPUT_NAME="${2:-$(basename "$TARGET" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/-/g')}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <target-path-or-repo> [output-name]"
    echo ""
    echo "Examples:"
    echo "  $0 /home/ubuntu/.openclaw/workspace/pincher pincher"
    echo "  $0 /home/ubuntu/.openclaw/workspace/forgemaster-archive/experiments/deadband-snr deadband-snr"
    echo "  $0 /home/ubuntu/.openclaw/workspace/craftmind-fishing craftmind-fishing"
    exit 1
fi

AGENT_DIR="$(dirname "$0")/.."

echo "=== Mining: $TARGET ==="
echo "Output name: $OUTPUT_NAME"
echo ""

# Check if target exists
if [ ! -e "$TARGET" ]; then
    echo "⚠️  Target not found: $TARGET"
    exit 1
fi

# Count files
if [ -d "$TARGET" ]; then
    echo "Directory: $(find "$TARGET" -type f | wc -l) files"
    echo "Markdown: $(find "$TARGET" -name "*.md" -type f | wc -l) files"
    echo "Source: $(find "$TARGET" -name "*.rs" -o -name "*.py" -o -name "*.ts" -o -name "*.js" -type f | wc -l) files"
elif [ -f "$TARGET" ]; then
    echo "File: $(wc -l < "$TARGET") lines"
fi

echo ""
echo "=== Mining Plan ==="
echo "1. Survey target structure"
echo "2. Extract patterns and insights"
echo "3. Cross-reference with existing KNOWLEDGE_BASE/"
echo "4. Write REPO_KV entry"
echo "5. Write cold cache entry"
echo ""
echo "This is a manual mining guide. Run the pipeline steps as an agent task."
echo ""
echo "To mark this as mined:"
echo "  echo '✅ $OUTPUT_NAME mined on $(date -u +%Y-%m-%d)' >> $AGENT_DIR/COLD_CACHE/mined/MANIFEST.md"
