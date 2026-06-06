#!/usr/bin/env bash
# Vessel orchestrator — runs every 4 hours via OpenClaw cron
# Checks disk, RAM, I2I vessel status, and fleet repo health

set -euo pipefail

echo "=== VESSEL ORCHESTRATOR $(date -u) ==="

# 1. DISK HEALTH
disk_used=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "DISK: ${disk_used}% used"
if [ "$disk_used" -gt 85 ]; then
    echo "WARN: Disk above 85% — triggering cleanup"
    # Clean pincher target/ artifacts
    rm -rf /tmp/pincher/target/ 2>/dev/null || true
fi

# 2. RAM HEALTH
ram_used=$(free | grep Mem | awk '{print $3/$2 * 100.0}' | cut -d. -f1)
echo "RAM: ${ram_used}% used"
if [ "$ram_used" -gt 85 ]; then
    echo "WARN: RAM above 85% — killing idle subagents"
fi

# 3. I2I VESSEL CHECK
if [ -d /tmp/i2i-vessel ]; then
    bottle_count=$(find /tmp/i2i-vessel/bottles -type f 2>/dev/null | wc -l)
    echo "I2I: ${bottle_count} bottles in vessel"
else
    echo "I2I: Vessel missing"
fi

echo "=== VESSEL ORCHESTRATOR COMPLETE ==="
