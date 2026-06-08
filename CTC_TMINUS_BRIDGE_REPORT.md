# Constraint Theory Core ↔ T-Minus Dispatcher Bridge

## 🧮 Cognitive Constraint Network

A JavaScript bridge integrating the **constraint-theory-core (CTC)** architectural concepts with the **t-minus dispatcher** to create a cognitive constraint network — where constraints are cues and satisfaction is alignment.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│            Cognitive Constraint Network              │
├─────────────────────────────────────────────────────┤
│                                                      │
│   CueVariable (agent lifecycle state)                │
│     ├── domain: {0..6} (OFFLINE..COMPLETE)           │
│     ├── ν: cognitive beat frequency (Hz)             │
│     └── φ: phase value in [0, 2π)                    │
│                                                      │
│   Constraints:                                       │
│     ├── CognitiveConstraint  (alignment predicates)  │
│     ├── PhaseConstraint      (sequential ordering)   │
│     └── ResonanceConstraint  (frequency matching)    │
│                                                      │
│   AlignmentSolver                                    │
│     ├── AC-3 propagation  (arc consistency)          │
│     └── Backtracking: MRV + FC + LCV                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### File Structure

| File | Role |
|------|------|
| `src/cue-variable.js` | Wraps a t-minus agent as a CTC-style Variable with domain {0..6} |
| `src/cognitive-constraint.js` | Alignment predicates: unary, binary, nary (inspired by CTC's Constraint enum) |
| `src/resonance-constraint.js` | Frequency matching: `\|ν₁ - ν₂\| / max(ν₁, ν₂) < ε` |
| `src/phase-constraint.js` | Sequential ordering: `sucFired ⇒ preFired` (static CSP encoding) |
| `src/alignment-solver.js` | CSP solver: AC-3 propagation + MRV backtracking + forward checking |
| `src/index.js` | Module exports and `createCognitiveNetwork()` factory |
| `cli.js` | CLI with demo scenarios (seq, parallel, resonant, unsat, interactive) |

---

## Key Concepts

### 1. Constraints as Cognitive Cues

In the t-minus system, a **cue** is a signal to transition states. In the bridge, every cue corresponds to a **constraint** being tested:

| T-Minus Concept | Bridge Equivalent |
|----------------|-------------------|
| Agent state | CueVariable.domain (integer 0-6) |
| Phase group | Constraint network |
| Cue delivery | Variable assignment |
| Alignment point | All constraints satisfied |
| Beat frequency ν | EMA of transition rate |
| Phase value φ | Position in cognitive cycle |

### 2. State → Domain Mapping

```
0 = OFFLINE       → no constraints active
1 = REGISTERED    → agent known to system
2 = LISTENING     → subscribed to phase group
3 = CUED          → received t-minus cue
4 = PRIMED        → countdown complete, ready
5 = FIRING        → executing action
6 = COMPLETE      → result reported
```

Valid transitions mirror `VALID_TRANSITIONS` from `tminus-dispatcher/src/constants.js`.

### 3. Constraint Formalization

#### CognitiveConstraint (alignment)
```
Unary:  f(var)           — e.g., "state must be >= 3"
Binary: f(var₁, var₂)    — e.g., "states must be equal" (coherence)
Nary:   f(vars...)       — multi-agent coupling
```

#### PhaseConstraint (sequential ordering)
```
Static CSP encoding: successor has fired ⇒ predecessor has fired
¬(sucVal ≥ 5) ∨ (preVal ≥ 5)
```

This is a **static approximation** of the dynamic temporal constraint. In the live system, timing is also enforced.

#### ResonanceConstraint (frequency matching)
```
Resonance condition: |ν₁ - ν₂| / max(ν₁, ν₂) < ε
Phase lock: min(|φ₁ - φ₂|, 2π - |φ₁ - φ₂|) < φ_ε

Hidden dimensions equivalent: k = ⌈log₂(1/ε)⌉ bits of precision
(mirroring CTC's hidden_dimensions formula)
```

### 4. Solver Algorithm

The `AlignmentSolver` implements CTC's solver architecture in JavaScript:

**Phase 1 — AC-3 Arc Consistency** (`propagate()`):
- Initializes work queue with all constraint-variable pairs
- For each pair, removes domain values without support in neighboring domains
- Propagates domain reductions until fixpoint or domain wipeout

Mirrors `crate::ac3::enforce_ac3()` from `constraint-theory-core/src/ac3.rs`.

**Phase 2 — Backtracking Search** (`search()`):
- **MRV** (Most Restricted Variable): picks the unassigned variable with smallest domain
- **LCV** (Least Constraining Value): orders values by number of neighbor conflicts
- **Forward Checking**: prunes neighbor domains after each assignment

Mirrors `crate::backtracking::backtrack_mrv_fc()` from `constraint-theory-core/src/backtracking.rs`.

**Conflict Detection**:
- Propagates conflicts as boolean satisfiability
- Domain wipeout → unsatisfiable

Mirrors `crate::cdcl::CDCL` conflict detection from `constraint-theory-core/src/cdcl.rs`.

---

## Integration Test Results

**65/65 tests passing** ✅

| Test | Assertions | Status |
|------|-----------|--------|
| CueVariable (transitions, frequency, phase) | 18 | ✅ |
| CognitiveConstraint (unary, binary, coherence, state compat) | 9 | ✅ |
| ResonanceConstraint (frequency matching) | 3 | ✅ |
| PhaseConstraint (sequential ordering, static CSP encoding) | 6 | ✅ |
| AlignmentSolver (3-agent sequential CSP solve) | 13 | ✅ |
| Unsatisfiable detection (contradictory constraints) | 3 | ✅ |
| Cognitive network factory (seq/parallel/resonant modes) | 8 | ✅ |
| Incremental solving | 3 | ✅ |

---

## Usage

```bash
# Run all tests
node test/integration-test.js

# Sequential alignment demo (default)
node cli.js

# Parallel alignment
node cli.js --mode parallel

# Resonant alignment
node cli.js --mode resonant

# Unsatisfiable demo
node cli.js --unsat

# Full demo suite
node cli.js --demo
```

### Programmatic API

```javascript
const { createCognitiveNetwork, CueVariable } = require('./src/index');

// Create a 3-agent sequential constraint network
const { solver, variables, constraints } = createCognitiveNetwork({
  groupName: 'alpha',
  agentIds: ['sensor', 'compute', 'actuator'],
  mode: 'seq',
});

// Solve the CSP
const result = solver.solve();
console.log(result.solution); // Map {0 => 5, 1 => 5, 2 => 0}
```

---

## Relationship to CTC

This bridge is a **conceptual and architectural** integration, not FFI:

| CTC (Rust) | Bridge (JavaScript) |
|-----------|-------------------|
| `Variable` with `domain: Vec<i64>` | `CueVariable` with `domain: [0..6]` |
| `Constraint::Unary/Binary/Nary` | `CognitiveConstraint` (unary/binary/nary) |
| `ConstraintProblem::is_consistent()` | `CognitiveConstraint.isSatisfied()` |
| `SolverConfig` (MRV, LCV, FC, AC3) | `AlignmentSolver` MRV + FC + LCV |
| `backtrack_mrv_fc()` | `AlignmentSolver.search()` |
| `enforce_ac3()` | `AlignmentSolver.propagate()` |
| `CDCL` + `ConflictSet` | Propagation conflicts + unsatisfiable detection |
| `hidden_dimensions(ε) = ⌈log₂(1/ε)⌉` | `ResonanceConstraint._computePrecisionBits()` |

---

## Cognitive Interpretation

The bridge formalizes a key insight: **agent coordination is constraint satisfaction**.

- An agent's **state** is a variable in a CSP
- A **phase group** defines the constraint network topology
- **Alignment** is the set of all constraints being satisfied simultaneously
- **Conflict** (unsatisfiability) means the group cannot coordinate — agents must re-sync

The `createCognitiveNetwork()` factory maps abstract coordination modes to concrete constraint networks:

| Mode | Constraint Type | Cognitive Analogy |
|------|----------------|-------------------|
| `seq` | PhaseConstraint | Call-and-response |
| `parallel` | CognitiveConstraint (coherent) | Chorus |
| `resonant` | ResonanceConstraint | Sympathetic vibration |

---

*Built for the SuperInstance cognitive architecture — constraints as cues, satisfaction as alignment.*
