#!/usr/bin/env bash
# Spawn a sandboxed zeroclaw worker as a background process
set -euo pipefail
NAME="$1"
TASK="$2"
nohup /home/ubuntu/.openclaw/workspace/zeroclaws/runner.sh "${NAME}" "${TASK}" > "/home/ubuntu/.openclaw/workspace/zeroclaws/logs/${NAME}.log" 2>&1 &
echo "Spawned zeroclaw: ${NAME} (PID $!)"
