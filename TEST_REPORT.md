# TEST_REPORT — Hybrid Fleet Test Results

**Date:** 2026-06-07 22:13 UTC  
**Tester:** Subagent (Test Runner)

---

## Summary

| # | Component | Result | Details |
|---|-----------|--------|---------|
| 1 | **c-ternary** (C) | ✅ **PASS** | 43/43 passed |
| 2 | **flux-realm** (Python + Go) | ✅ **PASS** | 8 Python + 14 Go tests passed |
| 3 | **pincher hybrid-bridge** (Rust) | ✅ **PASS** | 104 unit + 18 CLI + 24 integration + 1 doc-test passed |
| 4 | **gno Flux VM** (Go compile check) | ✅ **PASS** | Compilation succeeded after 2 fixes |
| 5 | **savanty** (Python imports) | ✅ **PASS** | `ternary_l`, `saep_veto`, `symmetry_skeptic` all import OK |

**Overall Status: ✅ ALL PASS**

---

## Detailed Results

### 1. c-ternary (C)
- **Command:** `cc -std=c99 -Iinclude -lm test/test_ternary.c -o /tmp/test_ternary && /tmp/test_ternary`
- **Tests passed:** 43/43
- **No failures.**

### 2. flux-realm (Python + Go)
- **Python (pytest):** 8/8 passed (test_proposal_from_dict, test_proposal_from_bottle, test_high_conviction, test_medium_conviction, test_low_conviction, test_edge_short_ticker, test_verdict_roundtrip, test_conviction_scores)
- **Go (go test):** 14/14 passed (SafetyAxis, Alignment, Execution, Price, SaepVeto tests)
- **No failures.**

### 3. pincher hybrid-bridge (Rust)
- **cargo test -p hybrid-bridge:** All 4 test suites passed:
  - Unit tests: 104/104 passed
  - CLI tests: 18/18 passed
  - Integration tests: 24/24 passed
  - Doc-tests: 1/1 passed (1 ignored)
- **No failures.**

### 4. gno Flux VM (Go compile check)
- **Initial build:** ❌ FAILED — 2 compilation errors:
  1. `flux.go:81:5: to.SymmetryID undefined (type *Vessel has no field or method SymmetryID)`
  2. `manifold.go:4:2: "fmt" imported and not used`
- **Fixes applied:**
  1. Added `SymmetryID uint64` field to `Vessel` struct (matching `Baton.SymmetryID` type)
  2. Removed unused `"fmt"` import from `manifold.go`
- **Re-run:** ✅ PASS — compilation succeeded (exit 0, no output)

### 5. savanty (Python imports)
- **Command:** `python3 -c "from savanty import ternary_l, saep_veto, symmetry_skeptic; print('All imports OK')"`
- **Result:** `All imports OK`
- **No failures.**

---

## Fixes Applied

| File | Issue | Fix |
|------|-------|-----|
| `gnovm/pkg/gnolang/flux.go` | `Vessel` struct missing `SymmetryID` field | Added `SymmetryID uint64` field to struct |
| `gnovm/pkg/gnolang/manifold.go` | Unused `"fmt"` import | Removed import line |

No other fixes were needed.
