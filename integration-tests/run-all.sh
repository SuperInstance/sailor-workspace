#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-all.sh  —  Symphony Integration Test Suite
#
# Runs all 5 integration tests in sequence and reports a final summary.
# Each test must exit 0 on success, non-zero on failure.
# ─────────────────────────────────────────────────────────────────────────────
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RESULTS_FILE="$SCRIPT_DIR/.results.tmp"
SUMMARY_FILE="$SCRIPT_DIR/.summary.tmp"
> "$RESULTS_FILE"
> "$SUMMARY_FILE"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

total=5
passed=0
failed=0

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}Symphony Integration Test Suite${NC}                    ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  6 systems · 5 integration tests                       ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Systems under test:${NC}"
echo -e "    ${YELLOW}❶${NC} t-minus Dispatcher"
echo -e "    ${YELLOW}❷${NC} t-minus Client SDK"
echo -e "    ${YELLOW}❸${NC} Fleet A2A Bridge"
echo -e "    ${YELLOW}❹${NC} Composite Headspace"
echo -e "    ${YELLOW}❺${NC} Symphony Runtime"
echo -e "    ${YELLOW}❻${NC} CTC × t-minus Bridge"
echo ""

# ── Test 01 ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}[01/05] test-01-tminus-wire.js${NC}"
echo -e "        I2I bottle → Fleet Bridge → t-minus cue forwarding\n"
if node test-01-tminus-wire.js 2>&1 | tee -a "$RESULTS_FILE"; then
  echo -e "\n  ${GREEN}✓ TEST 01 PASSED${NC}\n"
  echo "test01=passed" >> "$SUMMARY_FILE"
  ((passed++))
else
  rc=$?
  echo -e "\n  ${RED}✗ TEST 01 FAILED (exit ${rc})${NC}\n"
  echo "test01=failed" >> "$SUMMARY_FILE"
  ((failed++))
fi

# ── Test 02 ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}[02/05] test-02-composite-symphony.js${NC}"
echo -e "        Composite Headspace + Symphony Runtime composition rules\n"
if node test-02-composite-symphony.js 2>&1 | tee -a "$RESULTS_FILE"; then
  echo -e "\n  ${GREEN}✓ TEST 02 PASSED${NC}\n"
  echo "test02=passed" >> "$SUMMARY_FILE"
  ((passed++))
else
  rc=$?
  echo -e "\n  ${RED}✗ TEST 02 FAILED (exit ${rc})${NC}\n"
  echo "test02=failed" >> "$SUMMARY_FILE"
  ((failed++))
fi

# ── Test 03 ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}[03/05] test-03-snail-shell-ping.js${NC}"
echo -e "        Heddle daemon + t-minus client SDK cue lifecycle\n"
if node test-03-snail-shell-ping.js 2>&1 | tee -a "$RESULTS_FILE"; then
  echo -e "\n  ${GREEN}✓ TEST 03 PASSED${NC}\n"
  echo "test03=passed" >> "$SUMMARY_FILE"
  ((passed++))
else
  rc=$?
  echo -e "\n  ${RED}✗ TEST 03 FAILED (exit ${rc})${NC}\n"
  echo "test03=failed" >> "$SUMMARY_FILE"
  ((failed++))
fi

# ── Test 04 ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}[04/05] test-04-ctc-alignment.js${NC}"
echo -e "        CTC constraint network → t-minus phase alignment\n"
if node test-04-ctc-alignment.js 2>&1 | tee -a "$RESULTS_FILE"; then
  echo -e "\n  ${GREEN}✓ TEST 04 PASSED${NC}\n"
  echo "test04=passed" >> "$SUMMARY_FILE"
  ((passed++))
else
  rc=$?
  echo -e "\n  ${RED}✗ TEST 04 FAILED (exit ${rc})${NC}\n"
  echo "test04=failed" >> "$SUMMARY_FILE"
  ((failed++))
fi

# ── Test 05 ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}[05/05] test-05-full-cycle.js${NC}"
echo -e "        Grand integration — ALL 6 systems end-to-end\n"
if node test-05-full-cycle.js 2>&1 | tee -a "$RESULTS_FILE"; then
  echo -e "\n  ${GREEN}✓ TEST 05 PASSED${NC}\n"
  echo "test05=passed" >> "$SUMMARY_FILE"
  ((passed++))
else
  rc=$?
  echo -e "\n  ${RED}✗ TEST 05 FAILED (exit ${rc})${NC}\n"
  echo "test05=failed" >> "$SUMMARY_FILE"
  ((failed++))
fi

# ── Final summary ───────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo ""
if [ "$failed" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}ALL ${total}/${total} TESTS PASSED${NC} 🎉"
  echo ""
  echo "  All 6 symphony systems verified as integrated."
  exit 0
else
  echo -e "  ${RED}${BOLD}${failed}/${total} TEST(S) FAILED${NC}"
  echo ""
  echo -e "  ${RED}Failing tests:${NC}"
  while IFS= read -r line; do
    case "$line" in
      test01=failed) echo "    - test-01-tminus-wire.js" ;;
      test02=failed) echo "    - test-02-composite-symphony.js" ;;
      test03=failed) echo "    - test-03-snail-shell-ping.js" ;;
      test04=failed) echo "    - test-04-ctc-alignment.js" ;;
      test05=failed) echo "    - test-05-full-cycle.js" ;;
    esac
  done < "$SUMMARY_FILE"
  echo ""
  exit 1
fi

# Cleanup
rm -f "$RESULTS_FILE" "$SUMMARY_FILE"
