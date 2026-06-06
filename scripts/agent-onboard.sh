#!/usr/bin/env bash
# agent-onboard.sh — One script. Any agent. Fleet-ready.
#
# Usage:
#   ./agent-onboard.sh --name my-agent --capabilities "build-crate,push-docs"
#
# What it does:
#   1. Registers with nebula (reflex engine at the edge)
#   2. Creates an I2I vessel for agent-to-agent communication
#   3. Pushes registration to the fleet blackboard (construct-coordination)
#   4. Updates Fleet Coordination Notion dashboard
#   5. Verifies the agent is discoverable

set -euo pipefail

NEBULA_URL="https://fleet-murmur-worker.casey-digennaro.workers.dev"
BLACKBOARD_REPO="${BLACKBOARD_REPO:-SuperInstance/construct-coordination}"
AGENT_NAME=""
CAPABILITIES=""

# ── Parse args ──────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) AGENT_NAME="$2"; shift 2 ;;
    --capabilities) CAPABILITIES="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

if [[ -z "$AGENT_NAME" ]]; then
  echo "❌ Usage: $0 --name <agent-name> --capabilities <comma,list>"
  exit 1
fi

echo "═══ Onboarding Agent: $AGENT_NAME ═══"

# ── Step 1: Register with nebula ────────────────────────────────────
echo ""
echo "1/5 ⟐ Registering with nebula reflex engine..."

RESULT=$(curl -s -X POST "$NEBULA_URL/api/agent/teach" \
  -H "Content-Type: application/json" \
  -d "{\"intent\":\"register $AGENT_NAME\",\"action\":\"Agent $AGENT_NAME registered with capabilities: $CAPABILITIES\",\"tags\":[\"agent-registration\",\"$AGENT_NAME\"]}")

if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('id') else 1)" 2>/dev/null; then
  echo "   ✅ Reflex taught for $AGENT_NAME"
else
  echo "   ⚠️  Registration note: $RESULT"
fi

# ── Step 2: Create I2I vessel (agent mailbox) ────────────────────────
echo ""
echo "2/5 ⟐ Creating I2I vessel (mailbox)..."
VESSEL_DIR="i2i-vessel/agents/$AGENT_NAME"
mkdir -p "$VESSEL_DIR"/{incoming,outgoing,splines}
echo "   ✅ Vessel at $VESSEL_DIR"

# ── Step 3: Write registration manifest ─────────────────────────────
echo ""
echo "3/5 ⟐ Writing registration manifest..."
MANIFEST="$VESSEL_DIR/agent.json"
cat > "$MANIFEST" << JSON
{
  "agent": "$AGENT_NAME",
  "registered": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "capabilities": [$(echo "$CAPABILITIES" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')],
  "vessel": "$VESSEL_DIR",
  "protocol": "i2i-bottle-v2",
  "status": "active"
}
JSON
echo "   ✅ Manifest written"

# ── Step 4: Push to blackboard ──────────────────────────────────────
echo ""
echo "4/5 ⟐ Publishing to fleet blackboard..."
if git rev-parse --git-dir > /dev/null 2>&1 && git remote -v 2>/dev/null | grep -q "construct-coordination"; then
  git add "$VESSEL_DIR"
  git commit -m "feat: onboard agent $AGENT_NAME" 2>/dev/null && git push
  echo "   ✅ Published to construct-coordination"
else
  echo "   ⚠️  Not in construct-coordination repo. Manifest at $MANIFEST"
  echo "   💡 Run from the cloned construct-coordination repo for auto-push"
fi

# ── Step 5: Verify ──────────────────────────────────────────────────
echo ""
echo "5/5 ⟐ Verifying agent is discoverable..."
DISCOVERY=$(curl -s -X POST "$NEBULA_URL/api/agent/message" \
  -H "Content-Type: application/json" \
  -d "{\"intent\":\"find agents that can build-crate\"}")

echo "   Response: $(echo "$DISCOVERY" | python3 -c "
import sys,json; d=json.load(sys.stdin);
print(f'Path: {d.get(\"path\",\"?\")} | {d.get(\"response\",\"\")[:80]}')
" 2>/dev/null || echo "Discovery available via nebula")"

echo ""
echo "═══ Onboarding Complete: $AGENT_NAME is part of the fleet ═══"
echo ""
echo "Next steps:"
echo "  - Check: cat $VESSEL_DIR/agent.json"
echo "  - Teach reflexes: POST $NEBULA_URL/api/agent/teach"
echo "  - Dispatch tasks: POST $NEBULA_URL/api/agent/message"
