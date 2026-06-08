# Symphony Integration Test Suite 🧪

Full-stack integration tests combining all **6 symphony systems** to prove they work together.

## Systems Under Test

| # | System | Location | Role |
|---|--------|----------|------|
| ❶ | **t-minus Dispatcher** | `tminus-dispatcher/` | Temporal heartbeat — WS server, cue scheduling, phase groups |
| ❷ | **t-minus Client SDK** | `tminus-client/` | Agent lifecycle: register → subscribe → cue → fire → report |
| ❸ | **Fleet A2A Bridge** | `fleet-bridge/` | Dual-transport routing: I2I bottles ↔ t-minus cues |
| ❹ | **Composite Headspace** | `composite-headspace/` | Dual-shell reasoning with symmetry detection |
| ❺ | **Symphony Runtime** | `symphony-runtime/` | Composition rules (C1-C6), BeatNormalizer, ν tracking |
| ❻ | **CTC × t-minus** | `constraint-tminus-bridge/` | Constraint satisfaction → phase alignment |

## Test Architecture

Each test is a self-contained Node.js script that:
- Starts any needed servers on **dedicated dynamic ports** (19876, 29876, 39876)
- Uses **in-process imports** (no CLI subprocess spawning)
- Prints clear `✅ PASS` / `❌ FAIL` per assertion
- **Cleans up** all child processes, servers, and temp files on exit
- Returns **exit code 0** on success, **non-zero** on failure

## The 5 Tests

### test-01-tminus-wire.js — I2I → Bridge → t-minus
```
Dispatcher → Fleet Bridge → I2I Bottle → Harbor → Forward → t-minus Cue
```
Starts dispatcher + fleet bridge, drops an I2I bottle into harbor/, verifies
the bridge forwards it as a t-minus WebSocket cue to a registered agent.

### test-02-composite-symphony.js — Headspace + Rules
```
ShellAgent × 2 → CompositeHeadspace → SymmetryDetector
SymphonyRuntime → BeatNormalizer + CompositionRules (C1-C6)
```
Creates two shells (bass + treble), runs them through the composite headspace,
validates all 6 composition rules, tracks ν frequency across cognitive beats.

### test-03-snail-shell-ping.js — Client Cue Lifecycle
```
TminusClient A → cue → TminusClient B → fire → report → phase advance
```
Full client lifecycle: connect → register → subscribe → cue → CUED → PRIMED →
FIRE → COMPLETE. Verifies the state machine transitions work end-to-end.

### test-04-ctc-alignment.js — Constraint → Phase Group
```
CueVariable × 3 → AlignmentSolver → seq/parallel/resonant → solution
```
Builds constraint networks in all 3 modes (sequential, parallel, resonant),
solves them with AC-3 + backtracking, verifies constraint satisfaction.
Also tests unsatisfiable network detection.

### test-05-full-cycle.js — THE GRAND INTEGRATION ★
```
ALL 6 SYSTEMS COMBINED:
  Dispatcher → 3 client agents → phase group → t-minus offsets →
  sequential firing → complete → phase advance → CueVariable tracking →
  CompositionRules validation → Symmetry analysis → I2I bottle exchange
```
The crown jewel. Registers 3 agents (sentinel, analyst, executor), cues them
with different t-minus offsets, validates the correct firing order, phase
advance, and cross-validates results through all 6 systems.

## Running

```bash
# Install dependencies once
cd integration-tests && npm install

# Run a single test
node test-01-tminus-wire.js
node test-02-composite-symphony.js
node test-03-snail-shell-ping.js
node test-04-ctc-alignment.js
node test-05-full-cycle.js

# Run all tests
chmod +x run-all.sh && ./run-all.sh
```

## Dependencies

- **ws** — WebSocket server/client (t-minus dispatcher + client SDK)
- Node.js ≥ 18 (for `fs.mkdtempSync`, `fs.rmSync`)

All test files import systems via **relative `require()` paths**, no npm linking
or build steps required.

## Adding New Tests

Copy the pattern from any test file:

```javascript
const path = require('path');
const { WebSocketServer } = require('ws');
const { SomeModule } = require('../some-system/src/module.js');

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
let passed = 0, failed = 0;
function assert(condition, label) {
  condition ? (passed++, console.log(`  ${PASS} | ${label}`))
            : (failed++, console.log(`  ${FAIL} | ${label}`));
}

async function main() {
  // Start servers, run assertions, cleanup
  process.exit(failed > 0 ? 1 : 0);
}
main().catch(err => { console.error(err); process.exit(1); });
```

## Clean Exit

Every test handles `SIGINT`/cleanup internally and terminates orphaned
servers. If a test hangs, the port ranges (19876-39876) are well out of
default service ports.
