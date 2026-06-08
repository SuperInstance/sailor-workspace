# Constraint Theory × t-minus 🧮

**Cognitive constraint networks for agent coordination**

[![Tests](https://img.shields.io/badge/tests-65%2F65-brightgreen.svg)](#)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

A production-grade JavaScript bridge that models **multi-agent coordination as constraint satisfaction**. Every agent state is a CSP variable, every phase group is a constraint network, and **alignment** is the moment all constraints are simultaneously satisfied.

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Architecture](#architecture)
- [Components](#components)
- [Usage](#usage)
  - [CLI](#cli)
  - [Programmatic API](#programmatic-api)
- [Code Examples](#code-examples)
  - [3-Agent Sequential Solve](#1-three-agent-sequential-alignment)
  - [Parallel Coherence](#2-parallel-coherence)
  - [Resonant Synchronization](#3-resonant-synchronization)
  - [Unsatisfiable Detection](#4-unsatisfiable-detection)
- [State Model](#state-model)
- [Constraint Formalization](#constraint-formalization)
- [Solver Algorithm](#solver-algorithm)
- [Integration with CTC (Rust)](#relationship-to-constraint-theory-core-ctc)
- [Related Projects](#related-projects)
- [Development](#development)
- [License](#license)

---

## Why This Exists

The t-minus dispatcher orchestrates agents through **phase groups** — sequences of timed cues that drive lifecycle transitions. This bridge adds a **cognitive layer**: instead of merely executing cues, it *reasons* about whether a set of agents *can* align before dispatching them.

The core insight: **every cue is a constraint waiting to be satisfied. Every state transition is a variable assignment. Alignment = all constraints satisfied simultaneously.**

This turns coordination from a procedural problem (fire cues in order) into a declarative one (find an assignment satisfying all constraints), unlocking:

- **Conflict detection** before agents waste cycles on impossible schedules
- **Optimal ordering** via MRV + LCV heuristics
- **Resonance-aware scheduling** — agents that beat in sync coordinate better
- **Incremental solving** — re-solve after partial transitions without restarting

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cognitive Constraint Network                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   CueVariable (agent lifecycle state)                             │
│     ├── domain: {0..6}  ←  AGENT_STATES (OFFLINE .. COMPLETE)    │
│     ├── ν: cognitive beat frequency (EMA of transition rate)      │
│     └── φ: phase value in [0, 2π)  ←  advances π/3 per forward   │
│                                                                   │
│   Constraints:                                                    │
│     ├── CognitiveConstraint  ←  unary / binary / nary predicates  │
│     ├── PhaseConstraint      ←  sequential ordering: suc ⇒ pre   │
│     └── ResonanceConstraint  ←  frequency match: |ν₁-ν₂| < ε     │
│                                                                   │
│   AlignmentSolver                                                 │
│     ├── Phase 1: AC-3 propagation  (arc consistency, fixpoint)    │
│     └── Phase 2: MRV + FC + LCV   (backtracking search)          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Module Map

```
src/
├── index.js                Exports + createCognitiveNetwork() factory
├── cue-variable.js         CueVariable — agent state as CSP variable
├── cognitive-constraint.js CognitiveConstraint — alignment predicates
├── resonance-constraint.js ResonanceConstraint — frequency matching
├── phase-constraint.js     PhaseConstraint — sequential ordering
└── alignment-solver.js     AlignmentSolver — AC-3 + backtracking
cli.js                      CLI runner with demo scenarios
test/
└── integration-test.js     65 tests covering every component
```

---

## Components

### CueVariable

Wraps a t-minus agent as a CTC-style CSP variable. Its domain is the set of all valid agent states (0–6), and its value represents the current state.

```js
const v = new CueVariable('sensor-01', 0, 'alpha', 'seq');

v.value;               // 0 (OFFLINE)
v.transitionTo(1);     // true — valid: OFFLINE → REGISTERED
v.transitionTo(5);     // false — invalid: REGISTERED → FIRING
v.frequency;           // 0.42 — EMA of transition rate (Hz)
v.phaseValue;          // 1.047 — φ advances π/3 each forward step
v.isAssigned;          // true if value === 6 (COMPLETE)
v.validNextStates;     // [2, 0] — LISTENING or OFFLINE from REGISTERED
```

Key properties:
- **Domain**: `{0: OFFLINE, 1: REGISTERED, 2: LISTENING, 3: CUED, 4: PRIMED, 5: FIRING, 6: COMPLETE}`
- **Frequency ν**: Exponential moving average of instantaneous transition rate (`ν = 0.7·νₜ₋₁ + 0.3·(1/Δt)`)
- **Phase φ**: Incremented by π/3 on forward transitions (each state = 1/6 of a full cognitive cycle), decremented on backward (reset) transitions
- **Transitions**: Enforces the same `VALID_TRANSITIONS` constraints as t-minus-dispatcher

### CognitiveConstraint

A constraint representing a cognitive alignment condition — the bridge's equivalent of CTC's `Constraint::Unary`, `Constraint::Binary`, and `Constraint::Nary`.

| Method | Arity | Purpose |
|--------|-------|---------|
| `new CognitiveConstraint(var, checkFn)` | Unary | Condition on a single agent |
| `new CognitiveConstraint(a, b, checkFn)` | Binary | Alignment between two agents |
| `new CognitiveConstraint([a,b,c], checkFn)` | N-ary | Multi-agent coupling |
| `CognitiveConstraint.phaseCoherent(a, b)` | Binary | States must be equal |
| `CognitiveConstraint.stateCompatible(a, b, table)` | Binary | Lookup-table compatibility |
| `CognitiveConstraint.ordered(a, b)` | Binary | Temporal firing order |
| `CognitiveConstraint.coupled(a, b)` | Binary | Coupled state transition |

Each constraint carries `weight` (0–1 for soft constraints), `isHard` (violation acceptable?), and `satisfactionDegree()` for continuous evaluation.

### PhaseConstraint

Encodes sequential ordering as a **static CSP constraint** between a predecessor and successor agent:

```
sucFired ⇒ preFired
(¬(sucVal ≥ 5) ∨ (preVal ≥ 5))
```

This is a conservative approximation of the dynamic temporal constraint: if the successor has reached FIRING (state ≥ 5), the predecessor *must* also have fired. The solver finds static assignments that respect the ordering without simulating real-time delays.

Options:
- `strict`: Whether timing (maxDelay) is enforced
- `maxDelay`: Maximum allowed ms between predecessor and successor firings

### ResonanceConstraint

Models **cognitive frequency locking** — two agents whose beat rates are close enough to synchronize:

```
|ν₁ - ν₂| / max(ν₁, ν₂) < ε        (frequency match)
min(|φ₁ - φ₂|, 2π - |φ₁ - φ₂|) < φ_ε  (phase lock)
```

The precision requirement maps to CTC's `hidden_dimensions` formula: `k = ⌈log₂(1/ε)⌉` bits of precision.

Target frequency ν* draws both agents toward a common cognitive tempo, enabling *symphonic* coordination where multiple agents synchronize to the same beat.

### AlignmentSolver

Two-phase CSP solver that mirrors `constraint-theory-core`'s architecture:

**Phase 1 — AC-3 Arc Consistency** (`propagate()`)
1. Initialize queue with every `(constraint, variable_index)` pair
2. For each pair, prune domain values lacking support in neighboring domains
3. Propagate reductions until fixpoint or domain wipeout
4. Return `false` if any domain empties → problem is unsatisfiable

**Phase 2 — Backtracking Search** (`search()`)
- **MRV** (Most Restricted Variable): pick unassigned variable with smallest domain
- **LCV** (Least Constraining Value): order candidate values by fewest neighbor conflicts
- **Forward Checking**: after assigning a variable, immediately prune inconsistent values from all unassigned neighbors

Returns a `Map<index, value>` solution or `null` if unsatisfiable.

The `solve()` method returns a rich result object:

```js
{
  solution: Map(3) { 0 => 6, 1 => 6, 2 => 6 },  // or null if unsat
  stats: {
    nodesVisited: 12,
    backtracks: 0,
    propagations: 38,
    conflicts: 0,
    elapsed: 3,          // ms
  },
  constraints: [
    { desc: 'phase_sequence', satisfied: true, isHard: true, ... },
    ...
  ],
  unsatisfiable: false,
}
```

### createCognitiveNetwork (Factory)

Maps abstract coordination modes to concrete constraint networks:

| Mode | Constraint Type | Cognitive Analogy |
|------|----------------|-------------------|
| `seq` | PhaseConstraint (chain) | Call-and-response |
| `parallel` | CognitiveConstraint (coherent) | Chorus |
| `resonant` | ResonanceConstraint | Sympathetic vibration |

```js
const { solver } = createCognitiveNetwork({
  groupName: 'alpha',
  agentIds: ['sensor', 'compute', 'actuator'],
  mode: 'seq',          // 'seq' | 'parallel' | 'resonant'
});
```

---

## Usage

### CLI

```bash
# Default: 3-agent sequential alignment
node cli.js

# Parallel alignment — all agents at same phase
node cli.js --mode parallel

# Resonant alignment — frequency matching
node cli.js --mode resonant

# Unsatisfiable demo — contradictory constraints
node cli.js --unsat

# Full demo suite (all of the above)
node cli.js --demo

# Interactive — step through incremental alignment
node cli.js --interactive
```

### Programmatic API

```js
const {
  CueVariable,
  CognitiveConstraint,
  PhaseConstraint,
  ResonanceConstraint,
  AlignmentSolver,
  createCognitiveNetwork,
} = require('constraint-tminus-bridge');
```

---

## Code Examples

### 1. Three-Agent Sequential Alignment

Solve a strict firing chain: alpha → bravo → charlie.

```js
const { createCognitiveNetwork } = require('./src/index');

// Build the network
const { solver, variables, constraints } = createCognitiveNetwork({
  groupName: 'squad-alpha',
  agentIds: ['alpha', 'bravo', 'charlie'],
  mode: 'seq',
});

console.log(variables.map(v => v.name));
// → ['alpha@squad-alpha', 'bravo@squad-alpha', 'charlie@squad-alpha']

console.log(constraints.map(c => c.toString()));
// → ['PhaseSeq(alpha@squad-alpha → bravo@squad-alpha) [strict]',
//     'PhaseSeq(bravo@squad-alpha → charlie@squad-alpha) [strict]']

// Solve the CSP
const result = solver.solve();

if (result.solution) {
  for (const [idx, val] of result.solution) {
    console.log(`${variables[idx].agentId} → ${CueVariable.STATE_NAMES[val]}`);
  }
  // → alpha → complete
  // → bravo → complete
  // → charlie → complete (all at COMPLETE state 6 maintains ordering:
  //                      predecessor must fire before successor)
}
```

All three agents resolve to `COMPLETE (6)` — the only assignment where bravo at 6 is preceded by alpha at 6, and charlie at 6 is preceded by bravo at 6.

### 2. Parallel Coherence

All agents must occupy the same phase simultaneously.

```js
const { solver, variables } = createCognitiveNetwork({
  groupName: 'echo',
  agentIds: ['agent-A', 'agent-B', 'agent-C'],
  mode: 'parallel',
});

const result = solver.solve();
// All agents assigned to the same state — phase coherence maintained
```

### 3. Resonant Synchronization

Three agents tuned to a target frequency of 2 Hz with 15% tolerance.

```js
const {
  CueVariable, ResonanceConstraint, AlignmentSolver
} = require('./src/index');

const variables = [
  new CueVariable('alpha', 0, 'zeta', 'resonant'),
  new CueVariable('beta',  1, 'zeta', 'resonant'),
  new CueVariable('gamma', 2, 'zeta', 'resonant'),
];

const constraints = [
  new ResonanceConstraint(variables[0], variables[1], 2.0,
    'reso_AB', { tolerance: 0.15 }),
  new ResonanceConstraint(variables[1], variables[2], 2.0,
    'reso_BC', { tolerance: 0.15 }),
];

const solver = new AlignmentSolver(variables, constraints);

// Drive transitions to build cognitive frequencies
for (let i = 0; i < 7; i++) {
  variables.forEach(v => {
    const next = v.validNextStates;
    if (next.length > 0 && v.value < 6) v.transitionTo(next[0]);
  });
}

const result = solver.solve();
console.log(`Resonance gap (A-B): ${constraints[0].getMetrics().resonanceGap.toFixed(4)}`);
console.log(`Phase lock (A-B):   ${constraints[0].getMetrics().phaseLock}`);
```

### 4. Unsatisfiable Detection

Contradictory constraints: A before B, and B before A.

```js
const { CueVariable, PhaseConstraint, AlignmentSolver } = require('./src/index');

const a = new CueVariable('A', 0, 'conflict', 'seq');
const b = new CueVariable('B', 1, 'conflict', 'seq');

const solver = new AlignmentSolver([a, b], [
  new PhaseConstraint(a, b, 'A_before_B'),
  new PhaseConstraint(b, a, 'B_before_A'),  // contradiction!
]);

const result = solver.solve();
console.log(result.unsatisfiable);  // → true
console.log(result.solution);      // → null
// The solver detects no assignment can satisfy both orderings
```

---

## State Model

| Value | State | Meaning |
|-------|-------|---------|
| 0 | `OFFLINE` | No constraints active |
| 1 | `REGISTERED` | Agent known to system |
| 2 | `LISTENING` | Subscribed to phase group |
| 3 | `CUED` | Received t-minus cue |
| 4 | `PRIMED` | Countdown complete, ready |
| 5 | `FIRING` | Executing action |
| 6 | `COMPLETE` | Result reported |

Valid transitions mirror `tminus-dispatcher`'s constants:

```
OFFLINE     → REGISTERED
REGISTERED  → LISTENING | OFFLINE
LISTENING   → CUED | PRIMED | OFFLINE
CUED        → PRIMED | LISTENING | OFFLINE
PRIMED      → FIRING | LISTENING | OFFLINE
FIRING      → COMPLETE | LISTENING | OFFLINE
COMPLETE    → LISTENING | OFFLINE
```

---

## Constraint Formalization

### CognitiveConstraint (Alignment)

| Arity | Form | Example |
|-------|------|---------|
| Unary | `f(var)` | `state ≥ 3` (must be CUED+) |
| Binary | `f(var₁, var₂)` | `val₁ === val₂` (coherence) |
| N-ary | `f(vars…)` | Multi-agent coupling |

### PhaseConstraint (Sequential Ordering)

Static CSP encoding:

```
sucFired ⇒ preFired
¬(sucVal ≥ 5) ∨ (preVal ≥ 5)
```

If the successor has fired, the predecessor must have fired. In static CSP terms, this constrains that variable N cannot be assigned FIRING/COMPLETE (≥5) unless variable N-1 is also at FIRING/COMPLETE.

### ResonanceConstraint (Frequency Matching)

```
Frequency match: |ν₁ - ν₂| / max(ν₁, ν₂) < ε
Phase lock:      min(|φ₁ - φ₂|, 2π - |φ₁ - φ₂|) < φ_ε
Precision bits:  k = ⌈log₂(1/ε)⌉   (CTC's hidden_dimensions)
```

---

## Solver Algorithm

### AC-3 Arc Consistency (`propagate()`)

1. Enqueue every `(constraint, variable)` pair from all constraints
2. For each pair, test every domain value against supporting values in neighbor domains
3. Remove unsupported values; if domain empties → unsatisfiable
4. On domain reduction, re-enqueue all constraints touching the pruned variable
5. Iterate to fixpoint

### Backtracking with MRV + FC + LCV (`search()`)

```
function search(assigned, domains):
    varIdx ← MRV(assigned, domains)         // smallest domain first
    if varIdx is null:
        return assignment                    // all variables assigned
    
    for val in LCV(varIdx, assigned, domains):  // least conflicts first
        if not check(varIdx, val, assigned):    // prune inconsistent
            continue
        saved ← saveDomains()
        if forwardCheck(varIdx, val, domains):  // prune neighbors
            assign(varIdx, val)
            result ← search(assigned, domains)
            if result != null: return result
        restoreDomains(saved)
    
    return null  // backtrack
```

### Conflict Detection

Domain wipeout during AC-3 propagation or forward checking signals an unsatisfiable problem. The solver records the conflict and terminates early — no assignment exists satisfying all constraints.

---

## Relationship to Constraint Theory Core (CTC)

This is a **conceptual and architectural** integration, not FFI. Every major CTC construct has a direct JavaScript counterpart:

| CTC (Rust) | Bridge (JavaScript) |
|-----------|-------------------|
| `Variable` with `domain: Vec<i64>` | `CueVariable` with domain `{0..6}` |
| `Constraint::Unary/Binary/Nary` | `CognitiveConstraint` (unary/binary/n-ary) |
| `ConstraintProblem::is_consistent()` | `CognitiveConstraint.isSatisfied()` |
| `SolverConfig` (MRV, LCV, FC, AC-3) | `AlignmentSolver` MRV + FC + LCV |
| `enforce_ac3()` | `AlignmentSolver.propagate()` |
| `backtrack_mrv_fc()` | `AlignmentSolver.search()` |
| `CDCL` + `ConflictSet` | Propagation conflicts + unsatisfiable detection |
| `hidden_dimensions(ε) = ⌈log₂(1/ε)⌉` | `ResonanceConstraint._computePrecisionBits()` |

---

## Related Projects

- **[tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher)** — The t-minus scheduling and dispatching system that drives phase-group agent coordination. This bridge extends it with constraint-based reasoning.
- **[symphony-runtime](https://github.com/SuperInstance/symphony-runtime)** — Multi-system orchestrator that coordinates across agents, vessels, and shells. The cognitive constraint networks here provide the alignment layer for symphony's phase scheduling.
- **[constraint-theory-core](https://github.com/SuperInstance/constraint-theory-core)** — The Rust reference implementation of the CTC constraint solver architecture that inspired this bridge.

---

## Development

```bash
# Install dependencies (none external — pure Node.js)
npm install

# Run all 65 tests
npm test

# Run CLI demo
npm run demo

# Verify test count matches badge
node test/integration-test.js | tail -1
# → Total: 65  Passed: 65  Failed: 0
```

### Requirements

- **Node.js ≥ 18** (uses native ES features, `Object.freeze`, arrow functions, etc.)
- No external runtime dependencies — pure Node.js

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the SuperInstance cognitive architecture — constraints as cues, satisfaction as alignment.*
