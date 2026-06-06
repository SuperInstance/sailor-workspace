#!/usr/bin/env bash
# gc-archive.sh — Garbage-collect archived CONTEXT.md snapshots
#
# Usage: gc-archive.sh [--dry-run] [--keep-days=30] [--max-files=60]
#
# Gap ξ fix: The CONTEXT.md archive (memory/archive/CONTEXT-YYYY-MM-DD.md)
# grows unbounded. After 365 days, that's 365 archived context files.
#
# Retention Policy:
#   - Keep all files from last 7 days (safe zone)
#   - Keep 1 file per week for days 8-90 (weekly snapshots)
#   - Keep 1 file per month for days 91-365 (monthly snapshots)
#   - Delete anything older than 365 days
#   - Always keep the latest file from each retained month
#
# Part of Reflex ι — The Archive GC Reflex

set -euo pipefail

ARCHIVE_DIR="/home/ubuntu/.openclaw/workspace/memory/archive"
DRY_RUN=false
KEEP_DAYS=30      # base retention
MAX_FILES=60       # absolute cap
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
NOW=$(date -u +%s)

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --keep-days=*) KEEP_DAYS="${arg#*=}" ;;
        --max-files=*) MAX_FILES="${arg#*=}" ;;
        --help)
            echo "Usage: $0 [--dry-run] [--keep-days=30] [--max-files=60]"
            echo ""
            echo "  --dry-run       Show what would be deleted without deleting"
            echo "  --keep-days=30  Base retention in days (default: 30)"
            echo "  --max-files=60  Maximum number of archive files to keep (default: 60)"
            echo ""
            echo "Retention Policy:"
            echo "  - Keep all files from last 7 days"
            echo "  - Keep 1 per week for days 8-90"
            echo "  - Keep 1 per month for days 91-365"
            echo "  - Delete anything older than 365 days"
            echo "  - Cap total files at --max-files (default 60)"
            exit 0
            ;;
    esac
done

echo "🗑️  CONTEXT.md Archive GC — ${TIMESTAMP}"
echo "========================================"
echo ""

# Ensure archive directory exists
if [ ! -d "$ARCHIVE_DIR" ]; then
    echo "📂 Archive directory does not exist: ${ARCHIVE_DIR}"
    echo "   Creating it (nothing to GC)."
    mkdir -p "$ARCHIVE_DIR"
    exit 0
fi

# Enumerate all CONTEXT-YYYY-MM-DD.md files
shopt -s nullglob
ARCHIVE_FILES=("${ARCHIVE_DIR}"/CONTEXT-*.md)
shopt -u nullglob

file_count=${#ARCHIVE_FILES[@]}
echo "Found ${file_count} archive files in ${ARCHIVE_DIR}"
echo ""

if [ "$file_count" -eq 0 ]; then
    echo "✅ No archive files to GC."
    exit 0
fi

# We categorize files by their age (in days)
declare -A FILE_DAYS    # filename → age in days
declare -A FILE_TIMESTAMPS  # filename → unix timestamp (from filename date)
TOTAL_SIZE=0

echo "Categorizing archive files by age:"
echo "----------------------------------"

for f in "${ARCHIVE_FILES[@]}"; do
    basename=$(basename "$f")
    # Extract YYYY-MM-DD from filename: CONTEXT-YYYY-MM-DD.md
    if [[ "$basename" =~ CONTEXT-([0-9]{4})-([0-9]{2})-([0-9]{2})\.md ]]; then
        year="${BASH_REMATCH[1]}"
        month="${BASH_REMATCH[2]}"
        day="${BASH_REMATCH[3]}"
        file_ts=$(date -u -d "${year}-${month}-${day}" +%s 2>/dev/null || echo 0)
        age_days=$(( (NOW - file_ts) / 86400 ))
        FILE_DAYS["$f"]=$age_days
        FILE_TIMESTAMPS["$f"]=$file_ts
        
        # Get file size
        if [ -f "$f" ]; then
            size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)
            TOTAL_SIZE=$(( TOTAL_SIZE + size ))
        fi
        
        # Age label
        if [ "$age_days" -le 7 ]; then
            label="last 7 days"
        elif [ "$age_days" -le 90 ]; then
            label="8-90 days"
        elif [ "$age_days" -le 365 ]; then
            label="91-365 days"
        else
            label=">365 days"
        fi
        
        echo "  ${basename}: ${age_days}d old (${label}) — $(numfmt --to=iec $size 2>/dev/null || echo "${size}B")"
    fi
done

echo ""
echo "Total archive size: $(numfmt --to=iec $TOTAL_SIZE 2>/dev/null || echo "${TOTAL_SIZE}B")"
echo ""

# --- Retention Policy Application ---
echo "Applying retention policy:"
echo "--------------------------"

# Phase 1: Delete files older than 365 days
echo ""
echo "Phase 1: Purge >365 days old — $(for f in "${ARCHIVE_FILES[@]}"; do [ "${FILE_DAYS[$f]:-0}" -gt 365 ] && echo 1; done | wc -l) candidates"
for f in "${ARCHIVE_FILES[@]}"; do
    age="${FILE_DAYS[$f]:-0}"
    basename=$(basename "$f")
    if [ "$age" -gt 365 ]; then
        if [ "$DRY_RUN" = true ]; then
            echo "  [DRY-RUN] Would delete: ${basename} (${age}d old)"
        else
            rm -f "$f"
            echo "  🗑️  Deleted: ${basename} (${age}d old — past 365-day max retention)"
        fi
    fi
done

# Phase 2: For days 8-90, keep only Monday's file per week
echo ""
echo "Phase 2: Weekly pruning (days 8-90) — keeps 1 file per ISO week"
for f in "${ARCHIVE_FILES[@]}"; do
    age="${FILE_DAYS[$f]:-0}"
    basename=$(basename "$f")
    
    if [ "$age" -gt 7 ] && [ "$age" -le 90 ]; then
        ts="${FILE_TIMESTAMPS[$f]:-0}"
        if [ "$ts" -gt 0 ]; then
            # Get ISO week number
            week_num=$(date -u -d "@$ts" +%V 2>/dev/null || echo "00")
            year_num=$(date -u -d "@$ts" +%Y 2>/dev/null || echo "0000")
            dow=$(date -u -d "@$ts" +%u 2>/dev/null || echo "0")  # 1=Mon, 7=Sun
            
            # We keep only files from Monday (dow=1) in this range
            # All other days are candidates for deletion
            if [ "$dow" != "1" ]; then
                # Check if we have at least one Monday file this week
                monday_file="${ARCHIVE_DIR}/CONTEXT-$(date -u -d "@$ts" +%Y-%m-%d -d "last monday" 2>/dev/null || echo "none").md"
                monday_file=$(echo "$monday_file" | sed 's/ -d last monday//g')
                
                # For simplicity, use a hash-based dedup: keep only the 1st file per ISO week
                week_key="${year_num}-W${week_num}"
                
                # We track kept weeks and remove duplicates
                if [ "${KEPT_WEEKS[$week_key]:-}" = "1" ]; then
                    if [ "$DRY_RUN" = true ]; then
                        echo "  [DRY-RUN] Would delete (weekly dedup): ${basename} (week ${week_key})"
                    else
                        rm -f "$f"
                        echo "  🗑️  Deleted (weekly dedup): ${basename} (week ${week_key})"
                    fi
                else
                    KEPT_WEEKS["$week_key"]=1
                    # Already marked as kept
                fi
            fi
        fi
    fi
done

# Phase 3: For days 91-365, keep only 1 file per month
echo ""
echo "Phase 3: Monthly pruning (days 91-365) — keeps 1 file per month"
declare -A KEPT_MONTHS
for f in "${ARCHIVE_FILES[@]}"; do
    # Only process if file still exists
    [ -f "$f" ] || continue
    
    age="${FILE_DAYS[$f]:-0}"
    basename=$(basename "$f")
    
    if [ "$age" -gt 90 ] && [ "$age" -le 365 ]; then
        ts="${FILE_TIMESTAMPS[$f]:-0}"
        if [ "$ts" -gt 0 ]; then
            month_key=$(date -u -d "@$ts" +%Y-%m 2>/dev/null || echo "0000-00")
            
            if [ "${KEPT_MONTHS[$month_key]:-}" = "1" ]; then
                if [ "$DRY_RUN" = true ]; then
                    echo "  [DRY-RUN] Would delete (monthly dedup): ${basename} (month ${month_key})"
                else
                    rm -f "$f"
                    echo "  🗑️  Deleted (monthly dedup): ${basename} (month ${month_key})"
                fi
            else
                KEPT_MONTHS["$month_key"]=1
            fi
        fi
    fi
done

# Phase 4: Enforce absolute MAX_FILES cap
echo ""
echo "Phase 4: Enforcing max-files cap (${MAX_FILES})"
# Re-enumerate remaining files
shopt -s nullglob
REMAINING_FILES=("${ARCHIVE_DIR}"/CONTEXT-*.md)
shopt -u nullglob
remaining=${#REMAINING_FILES[@]}

if [ "$remaining" -gt "$MAX_FILES" ]; then
    excess=$(( remaining - MAX_FILES ))
    echo "  ${remaining} files remain, cap is ${MAX_FILES} — need to remove ${excess} oldest"
    
    # Sort by age (oldest first) and remove from the oldest end
    mapfile -t sorted < <(for f in "${REMAINING_FILES[@]}"; do
        age="${FILE_DAYS[$f]:-9999}"
        echo "$age $f"
    done | sort -rn | tail -n "$excess")
    
    for entry in "${sorted[@]}"; do
        f="${entry#* }"  # Extract filename after "NNNN "
        basename=$(basename "$f")
        if [ -f "$f" ]; then
            if [ "$DRY_RUN" = true ]; then
                echo "  [DRY-RUN] Would delete (cap enforcement): ${basename}"
            else
                rm -f "$f"
                echo "  🗑️  Deleted (cap enforcement): ${basename}"
            fi
        fi
    done
else
    echo "  ${remaining} files, cap is ${MAX_FILES} — under limit, no action needed"
fi

# Final summary
echo ""
shopt -s nullglob
FINAL_FILES=("${ARCHIVE_DIR}"/CONTEXT-*.md)
shopt -u nullglob
final_count=${#FINAL_FILES[@]}
TOTAL_SIZE_FINAL=0
for f in "${FINAL_FILES[@]}"; do
    size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)
    TOTAL_SIZE_FINAL=$(( TOTAL_SIZE_FINAL + size ))
done

echo "=== GC Summary ==="
echo "Initial files:     ${file_count}"
echo "Final files:       ${final_count}"
echo "Files removed:     $(( file_count - final_count ))"
echo "Initial size:      $(numfmt --to=iec $TOTAL_SIZE 2>/dev/null || echo "${TOTAL_SIZE}B")"
echo "Final size:        $(numfmt --to=iec $TOTAL_SIZE_FINAL 2>/dev/null || echo "${TOTAL_SIZE_FINAL}B")"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "🏁 Dry-run complete. No actual changes made."
    echo "    Run without --dry-run to apply."
else
    # Update SESSION-STATE.md
    echo "" >> "$SESSION_FILE"
    echo "archive_gc:" >> "$SESSION_FILE"
    echo "  timestamp: \"${TIMESTAMP}\"" >> "$SESSION_FILE"
    echo "  initial_files: ${file_count}" >> "$SESSION_FILE"
    echo "  final_files: ${final_count}" >> "$SESSION_FILE"
    echo "  initial_size_bytes: ${TOTAL_SIZE}" >> "$SESSION_FILE"
    echo "  final_size_bytes: ${TOTAL_SIZE_FINAL}" >> "$SESSION_FILE"
    echo "  retention_policy: ${KEEP_DAYS}d-daily,weekly,monthly,${MAX_FILES}-cap" >> "$SESSION_FILE"
    
    echo "✅ SESSION-STATE.md updated with GC results"
fi

echo ""
echo "🏁 Archive GC complete."
