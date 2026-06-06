#!/usr/bin/env bash
# fleet-check — Check construct-coordination for new Forgemaster bottles
# Runs every 60 minutes at the 48th minute via cron
# Job name: fleet-check
set -euo pipefail

STATE_FILE="/home/ubuntu/.openclaw/workspace/construct-coordination-last-check.md"
REPO_DIR="/tmp/construct-coordination"
REPO_URL="https://github.com/SuperInstance/construct-coordination.git"
LOG_FILE="/tmp/fleet-check.log"

echo "[fleet-check] $(date -u +%Y-%m-%dT%H:%M:%SZ) — Starting check" >> "$LOG_FILE"

# Clone or pull the repo
if [ ! -d "$REPO_DIR/.git" ]; then
    echo "[fleet-check] First clone from $REPO_URL" >> "$LOG_FILE"
    git clone --depth 1 "$REPO_URL" "$REPO_DIR" >> "$LOG_FILE" 2>&1
else
    echo "[fleet-check] Pulling latest from $REPO_DIR" >> "$LOG_FILE"
    cd "$REPO_DIR" && git fetch origin && git reset --hard origin/main >> "$LOG_FILE" 2>&1
fi

# Get current HEAD hash
CURRENT_HASH=$(cd "$REPO_DIR" && git rev-parse HEAD)
echo "[fleet-check] HEAD: $CURRENT_HASH" >> "$LOG_FILE"

# Check notes/main/ for forgemaster content
NOTES_DIR="$REPO_DIR/notes/main"
NEW_BOTTLES=""
FILE_LIST=""

if [ -d "$NOTES_DIR" ]; then
    FILE_LIST=$(ls -1 "$NOTES_DIR" 2>/dev/null | paste -sd ',' - || echo "")
    echo "[fleet-check] Files in notes/main/: ${FILE_LIST:-none}" >> "$LOG_FILE"

    # Scan each .md file for forgemaster/bottle mentions
    for f in "$NOTES_DIR"/*.md; do
        [ -f "$f" ] || continue
        fname=$(basename "$f")
        if grep -qi 'forgemaster\|bottle' "$f" 2>/dev/null; then
            echo "[fleet-check] -> Forgemaster bottle found: $fname" >> "$LOG_FILE"
            NEW_BOTTLES="${NEW_BOTTLES} ${fname}"
        fi
    done
fi

# Build state file
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BOTTLE_STATUS="0"
if [ -n "$NEW_BOTTLES" ]; then
    BOTTLE_STATUS="YES: $NEW_BOTTLES"
fi
if [ -z "$FILE_LIST" ]; then
    FILE_LIST="(no files)"
fi

# Format file list as bullet points
FORMATTED_LIST=""
IFS=',' read -ra FILES <<< "$FILE_LIST"
for f in "${FILES[@]}"; do
    FORMATTED_LIST="${FORMATTED_LIST}- $f"$'\n'
done

{
    echo "# Fleet Check - Last Check State"
    echo ""
    echo "## Last Check"
    echo "- **Timestamp**: $TIMESTAMP"
    echo "- **Hash**: $CURRENT_HASH"
    echo "- **Forgemaster bottles found**: $BOTTLE_STATUS"
    echo ""
    echo "## Notes/main/ Files Seen"
    echo -n "$FORMATTED_LIST"
    echo ""
    echo "## Run Log"
} > "$STATE_FILE"

echo "[fleet-check] State file updated" >> "$LOG_FILE"
echo "[fleet-check] $(date -u +%Y-%m-%dT%H:%M:%SZ) — Check complete" >> "$LOG_FILE"
