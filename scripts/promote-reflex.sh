#!/usr/bin/env bash
# promote-reflex.sh — Promote a novel solution to COGNITIVE_REFLEXES.md
# 
# Usage: promote-reflex.sh "Reflex Name" "Stimulus" "Taxonomy" "Action" "Rationale"
#
# Part of Reflex ε — The Promotion Reflex
# Activated after completing a novel solution that should be generalized.

set -euo pipefail

REFLEX_FILE="/home/ubuntu/.openclaw/workspace/library/COGNITIVE_REFLEXES.md"
SESSION_FILE="/home/ubuntu/.openclaw/workspace/i2i-vessel/SESSION-STATE.md"
CONTEXT_FILE="/home/ubuntu/.openclaw/workspace/library/CONTEXT.md"
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')

if [ $# -lt 5 ]; then
    echo "Usage: $0 <name> <stimulus> <taxonomy> <action> <rationale>"
    echo ""
    echo "  name      — Short reflex name (e.g., 'The Promotion Reflex')"
    echo "  stimulus  — Trigger condition"
    echo "  taxonomy  — Classification system"
    echo "  action    — Handler steps"
    echo "  rationale — Why this is needed"
    exit 1
fi

NAME="$1"
STIMULUS="$2"
TAXONOMY="$3"
ACTION="$4"
RATIONALE="$5"

# Format the reflex block
BLOCK=$(cat <<REFLEX


---

## Reflex ${NAME}

**Trigger:** ${STIMULUS}

**Reflex:**
${ACTION}

**Taxonomy:**
${TAXONOMY}

**Why it works:** ${RATIONALE}

**Object permanence:** Encoded in COGNITIVE_REFLEXES.md (durable).
Promotion metadata in SESSION-STATE.md (checkpoint).

=== Promoted via Reflex ε — ${TIMESTAMP} ===
REFLEX
)

# Append to COGNITIVE_REFLEXES.md
echo "${BLOCK}" >> "${REFLEX_FILE}"
echo "✅ Promoted '${NAME}' to COGNITIVE_REFLEXES.md"

# Update SESSION-STATE.md with promotion record
echo "" >> "${SESSION_FILE}"
echo "reflex_promotions:" >> "${SESSION_FILE}"
echo "  - name: \"${NAME}\"" >> "${SESSION_FILE}"
echo "    timestamp: \"${TIMESTAMP}\"" >> "${SESSION_FILE}"
echo "    rationale: \"${RATIONALE}\"" >> "${SESSION_FILE}"

# Update CONTEXT.md reflex fire timestamp if it exists
if [ -f "${CONTEXT_FILE}" ]; then
    # Replace or add the reflex entry in the fire timestamps table
    sed -i "/^| ε /d" "${CONTEXT_FILE}" 2>/dev/null || true
    echo "| ε | ${TIMESTAMP} | 24h (on-demand only) |" >> "${CONTEXT_FILE}"
fi

echo "✅ SESSION-STATE.md and CONTEXT.md updated with promotion metadata"
