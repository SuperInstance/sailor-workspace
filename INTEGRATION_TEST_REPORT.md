# Integration Test Report 🧪

**Date:** 2026-06-08  
**Builder:** Integration Test Builder subagent  
**Status:** All 5 tests built and ready for execution

## Summary

| Test | File | Systems Integrated | Assertions |
|------|------|-------------------|------------|
| 01 | `test-01-tminus-wire.js` | Dispatcher + Fleet Bridge + t-minus Client | 7 |
| 02 | `test-02-composite-symphony.js` | Composite Headspace + Symphony Runtime | 35+ |
| 03 | `test-03-snail-shell-ping.js` | Dispatcher + t-minus Client SDK | 18+ |
| 04 | `test-04-ctc-alignment.js` | Constraint-tminus-bridge (all modules) | 28+ |
| 05 | `test-05-full-cycle.js` | ALL 6 SYSTEMS | 35+ |

## Test Architecture

All 5 tests live in `/home/ubuntu/.openclaw/workspace/integration-tests/`.

### Key design decisions:

1. **In-process system imports** — Tests import system modules via `require('../system/src/...')`. No CLI subprocess spawning means no port conflicts or orphaned processes.

2. **Dedicated test ports** — Each test uses a unique port range:
   - Test 01: 19876
   - Test 03: 29876  
   - Test 05: 39876

3. **Event-driven waiting** — Tests use Promises + EventEmitter listeners rather than fixed `setTimeout`. This makes tests deterministic and fast.

4. **Per-assertion logging** — Every assertion prints `✅ PASS` or `❌ FAIL` with human-readable labels.

5. **Cleanup everywhere** — Each test cleans up WebSocket servers, HTTP servers, temp directories, and disconnects all clients. `try/finally` patterns on error paths.

6. **Exit code discipline** — `process.exit(0)` on success, `process.exit(1)` on failure.

## What Each Test Validates

### test-01-tminus-wire.js — I2I → Bridge → t-minus
- t-minus dispatcher starts and accepts WS connections
- FleetBridge initializes I2I vessel dirs
- FleetBridge connects to t-minus dispatcher via TminusTransport
- I2I bottle dropped into harbor/ is consumed by bridge watcher
- Bridge forwards bottle content as t-minus cue to registered target agent
- Harbor file is cleaned up after processing

### test-02-composite-symphony.js — Headspace + Rules
- ShellAgent creation with correct frequency bands
- CompositeHeadspace with both shells and phase delta
- ν (nu) frequency tracking: beat duration, Hz calculation, octave separation
- Composition Rules C1-C6: all 6 rules tested individually and via `runAll()`
- C1: min headspace size (2 shells or 1 shell + sovereign)
- C2: frequency separation (≥0.5 octaves)
- C3: dissonance budget (≤30% threshold, critical detection)
- C4: temporal fidelity (timestamps preserved, no retroactive modification)
- C5: sovereign primacy (human override of a-box state)
- C6: track limit (7±2 max, absolute ceiling at 9)
- Full headspace task execution with symmetry analysis
- Waveform and mix computation

### test-03-snail-shell-ping.js — Client Cue Lifecycle
- Two TminusClients connect to same dispatcher
- Both register with correct metadata and state tracking
- Both subscribe to a phase group (state → LISTENING)
- Client A sends a t-minus cue to Client B with offset=+2
- Client B receives CUED event with correct source/offset
- Client B transitions to PRIMED after countdown
- Client B fires (state → FIRING)
- Client B reports (state → COMPLETE)
- Phase group alignment point completes
- Dispatcher status shows correct agent/cue/group counts

### test-04-ctc-alignment.js — Constraint → Phase Alignment
- CueVariable creation and state machine (all transitions valid/invalid)
- Sequential mode: 3 agents, 2 phase constraints, solve with AC-3 + backtracking
- Parallel mode: all agents must be at same state simultaneously
- Resonant mode: frequency matching with ResonanceConstraint
- Unsatisfiable detection: conflicting constraints correctly identified
- Custom constraint types: phaseCoherent, ordered, stateCompatible
- Solution → physical state mapping

### test-05-full-cycle.js — Grand Integration
- **System ❶** t-minus Dispatcher: server lifecycle, 3 agents registered, beat engine running
- **System ❷** t-minus Client SDK: connect, register, subscribe, cue, fire, report
- **System ❸** Fleet Bridge (I2I): bottle sent with integrity hash, verified
- **System ❹** Composite Headspace: symmetry analysis of cycle artifact
- **System ❺** Symphony Runtime: BeatNormalizer + CompositionRules validate cycle
- **System ❻** CTC × t-minus: CueVariable state tracking for all 3 agents
- Sequential firing order: sentinel (pre-cue -1) → analyst (t-minus +1) → executor (t-minus +2)
- All 3 agents reach COMPLETE state
- Phase group alignment point advances after all complete
- Phase advance events propagated

## Files Created

```
integration-tests/
├── package.json           — Dependencies (ws)
├── run-all.sh             — Sequential test runner
├── README.md              — Architecture documentation
├── test-01-tminus-wire.js
├── test-02-composite-symphony.js
├── test-03-snail-shell-ping.js
├── test-04-ctc-alignment.js
└── test-05-full-cycle.js
```

## Running

```bash
cd /home/ubuntu/.openclaw/workspace/integration-tests
npm install           # Already done
chmod +x run-all.sh
./run-all.sh          # Run all 5 tests

# Or individually:
node test-01-tminus-wire.js
node test-02-composite-symphony.js
node test-03-snail-shell-ping.js
node test-04-ctc-alignment.js
node test-05-full-cycle.js
```
