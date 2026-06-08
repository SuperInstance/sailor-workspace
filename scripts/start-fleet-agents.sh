#!/usr/bin/env bash
# Start all fleet-midi agents + core services
# Usage: ./scripts/start-fleet-agents.sh [restart]
set -euo pipefail

BASE_DIR="/home/ubuntu/.openclaw/workspace"
LOG_DIR="$BASE_DIR/logs"
mkdir -p "$LOG_DIR"

declare -A PORTS
PORTS[chord]=2160; PORTS[scale]=2161; PORTS[voicing]=2162
PORTS[tempo]=2163; PORTS[cc]=2164; PORTS[expression]=2165
PORTS[dynamics]=2166; PORTS[pan]=2167; PORTS[modulation]=2168
PORTS[arp]=2169; PORTS[groove]=2170; PORTS[velocity]=2171
PORTS[fx]=2172; PORTS[register]=2173; PORTS[melody]=2174
PORTS[bass]=2175

SCRIPT="$BASE_DIR/fleet-agent/fleet-agent.py"

# Kill existing agents if restart
if [[ "${1:-}" == "restart" ]]; then
    echo "Killing existing agents..."
    for port in "${PORTS[@]}"; do
        kill $(lsof -ti :$port) 2>/dev/null || true
    done
    sleep 1
fi

echo "=== Starting ${#PORTS[@]} fleet-midi agents ==="
for agent in "${!PORTS[@]}"; do
    port="${PORTS[$agent]}"
    # Skip if already running
    if curl -s "http://127.0.0.1:$port/health" --connect-timeout 0.5 >/dev/null 2>&1; then
        echo "  ✅ $agent (port $port) — already running"
        continue
    fi
    python3.10 "$SCRIPT" --port "$port" --agent "$agent" > "$LOG_DIR/${agent}.log" 2>&1 &
    sleep 0.2
    echo "  🚀 $agent started on port $port"
done

echo ""
echo "=== Agent status ==="
sleep 1
for agent in "${!PORTS[@]}"; do
    port="${PORTS[$agent]}"
    if curl -s "http://127.0.0.1:$port/health" --connect-timeout 0.5 >/dev/null 2>&1; then
        echo "  ✅ $agent (port $port)"
    else
        echo "  ❌ $agent (port $port)"
    fi
done
echo ""
echo "Done — ${#PORTS[@]} agents"
