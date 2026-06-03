#!/usr/bin/env bash
# ZeroClaw Sandbox Runner
# A lightweight autonomous worker that runs experiments in isolated workdirs
# and reports findings back to the I2I vessel.
set -euo pipefail

WORKSPACE="/home/ubuntu/.openclaw/workspace/zeroclaws"
DOJO="${WORKSPACE}/dojo"
SCRATCH="${WORKSPACE}/scratch"
REPORTS="${WORKSPACE}/reports"
LOGS="${WORKSPACE}/logs"
VESSEL="/tmp/i2i-vessel"

CLAW_NAME="${1:-unknown}"
CLAW_TASK="${2:-}"
SANDBOX_DIR="${SCRATCH}/${CLAW_NAME}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "${SANDBOX_DIR}" "${REPORTS}" "${LOGS}"

echo "[${CLAW_NAME}] ZeroClaw activated at ${TIMESTAMP}"
echo "[${CLAW_NAME}] Task: ${CLAW_TASK}"
echo "[${CLAW_NAME}] Sandbox: ${SANDBOX_DIR}"

# Run the task and capture output
{
    echo "# ZeroClaw Report: ${CLAW_NAME}"
    echo "## Timestamp: ${TIMESTAMP}"
    echo "## Task: ${CLAW_TASK}"
    echo ""
    echo '```'
    cd "${SANDBOX_DIR}" && eval "${CLAW_TASK}" 2>&1 || echo "EXIT_CODE: $?"
    echo '```'
} > "${REPORTS}/${CLAW_NAME}_${TIMESTAMP}.md"

echo "[${CLAW_NAME}] Report saved: ${REPORTS}/${CLAW_NAME}_${TIMESTAMP}.md"
# Write a bottle
echo "[I2I:BOTTLE] zeroclaw:${CLAW_NAME}" > "${VESSEL}/bottles/${CLAW_NAME}_${TIMESTAMP}.md"
cat "${REPORTS}/${CLAW_NAME}_${TIMESTAMP}.md" >> "${VESSEL}/bottles/${CLAW_NAME}_${TIMESTAMP}.md"
echo "[${CLAW_NAME}] Bottle dropped."
