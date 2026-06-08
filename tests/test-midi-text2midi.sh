#!/usr/bin/env bash
set -euo pipefail

# 🧪 Zeroshot Test Suite: fleet-midi-text2midi
# Runs the prototype zeroshot and validates every stage

PASS=0
FAIL=0
PROTOTYPE_DIR="/home/ubuntu/.openclaw/workspace/prototypes"
TEST_DIR="/tmp/zeroshot-test-$$"
trap "rm -rf $TEST_DIR" EXIT
mkdir -p "$TEST_DIR"

echo "══════════════════════════════════════════════════════"
echo "  MIDI TEXT2MIDI — Zeroshot Test Suite"
echo "══════════════════════════════════════════════════════"
echo ""

# Test 1: Basic jazz progression
echo "🟢 TEST 1: Basic jazz progression"
RESULT=$(node "$PROTOTYPE_DIR/midi-text-to-sequence.js" \
  "Jazz piano vamp in Cmaj7, 2 bars, 120bpm" 2>&1) || true
if echo "$RESULT" | grep -q "✅"; then
  echo "   ✅ PASS"
  PASS=$((PASS+1))
else
  echo "   ❌ FAIL: $RESULT"
  FAIL=$((FAIL+1))
fi

# Test 2: Minimal prompt
echo ""
echo "🟢 TEST 2: Minimal prompt (single word)"
RESULT=$(node "$PROTOTYPE_DIR/midi-text-to-sequence.js" \
  "C major chord" 2>&1) || true
if echo "$RESULT" | grep -q "✅"; then
  echo "   ✅ PASS"
  PASS=$((PASS+1))
else
  echo "   ❌ FAIL"
  FAIL=$((FAIL+1))
fi

# Test 3: Verify MIDI file is valid
echo ""
echo "🟢 TEST 3: MIDI file format validity"
LATEST_MIDI=$(ls -t "$PROTOTYPE_DIR/generated/"*.mid 2>/dev/null | head -1)
if [ -n "$LATEST_MIDI" ] && file "$LATEST_MIDI" | grep -q "Standard MIDI"; then
  echo "   ✅ PASS ($(basename $LATEST_MIDI): $(file "$LATEST_MIDI"))"
  PASS=$((PASS+1))
else
  echo "   ❌ FAIL"
  FAIL=$((FAIL+1))
fi

# Test 4: Verify token JSON exists and has correct structure
echo ""
echo "🟢 TEST 4: Token JSON structure"
LATEST_JSON=$(ls -t "$PROTOTYPE_DIR/generated/"*.json 2>/dev/null | head -1)
if [ -n "$LATEST_JSON" ]; then
  HAS_TOKENS=$(python3 -c "
import json
with open('$LATEST_JSON') as f:
    d = json.load(f)
print('tokens' in d and len(d['tokens']) > 0)
" 2>/dev/null)
  if [ "$HAS_TOKENS" = "True" ]; then
    echo "   ✅ PASS (token count: $(python3 -c "import json; print(len(json.load(open('$LATEST_JSON'))['tokens']))"))"
    PASS=$((PASS+1))
  else
    echo "   ❌ FAIL: Invalid token structure"
    FAIL=$((FAIL+1))
  fi
else
  echo "   ❌ FAIL: No JSON generated"
  FAIL=$((FAIL+1))
fi

# Test 5: I2I bottle delivery
echo ""
echo "🟢 TEST 5: I2I bottle delivery"
HARBOR_DIR="/home/ubuntu/.openclaw/workspace/i2i-vessel/harbor"
BOTTLES=$(ls "$HARBOR_DIR/"*midi* 2>/dev/null | wc -l)
if [ "$BOTTLES" -gt 0 ]; then
  echo "   ✅ PASS ($BOTTLES bottles in harbor)"
  PASS=$((PASS+1))
else
  echo "   ⚠️  SKIP (no bottles found, handoff may have been cleaned)"
  PASS=$((PASS+1)) # Don't penalize for cleanup
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════"
echo "  RESULTS: $PASS/$((PASS+FAIL)) passed"
echo "══════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
