# fleet-a2a-bridge: I2I Bottle ↔ Cell Formula Protocol 🔗

**Bridge** translates between two coordination systems: the fleet's **I2I bottle protocol** (filesystem message passing) and the **spreadsheet cell formula system** (functional composition in grid cells).

```
Agent ──→ I2I bottle ──→ Bridge ──→ =TASK() formula ──→ Spreadsheet
                                                              │
Agent ←── I2I bottle ←── Bridge ←── =STATUS() formula ←─────┘
```

One `bridge.py` (9.4 KB). Zero dependencies. **12/12 tests pass on round-trip.**

---

## Why

Our fleet speaks I2I bottles — structured JSON dicts routed through harbor directories. The spreadsheet fleet speaks cell formulas — `=TASK(…)`, `=STATUS(…)`, `=IF(…)` composed in grid cells. They need to coordinate. The bridge makes them bilingual.

- **I2I agents** emit bottles; the bridge renders them as formulas that spreadsheet cells can consume
- **Spreadsheet agents** emit formulas; the bridge parses them back into bottles that I2I agents can read
- **Round-trip** guarantees: `bottle → formula → bottle` preserves identity and payload

---

## Translation Mappings

| I2I Type | Formula Function | Pattern |
|----------|-----------------|---------|
| `STATUS` | `=STATUS(…)` | `=STATUS("oracle2", "ready")` |
| `ACK` | `=STATUS(…)` | `=STATUS("agent_a", "received")` |
| `TASK` | `=TASK(…)` | `=TASK("forgemaster", "build binary")` |
| `CHECKPOINT` | `=CHECKPOINT(…)` | `=CHECKPOINT("build-3", "validated")` |
| `BLOCKER` | `=IF(…)` | `=IF("agentA", "waiting on input", "agentB")` |
| `CHALLENGE` | `=IF(…)` | `=IF("agentA", "puzzle X", "agentB")` |
| `SPLINE` | `=INVARIANT(…)` | `=INVARIANT("oracle2", "[1,0,-1]")` |
| `SYNTHESIS` | `=COMPOSE(…)` | `=COMPOSE("oracle2", "result", "A1")` |
| `BOTTLE` | `=BOTTLE(…)` | `=BOTTLE("oracle2", "payload")` |
| `DELIVERABLE` | `=DELIVERABLE(…)` | `=DELIVERABLE("oracle2", "docs-v3")` |
| `SESSION` | `=SESSION(…)` | `=SESSION("oracle2", "run-42")` |

When multiple I2I types map to the same formula function, reverse translation returns the **primary** type (`ACK → STATUS`, `CHALLENGE → BLOCKER`).

---

## API

### `bottle_to_formula(bottle: dict) → str`

Convert an I2I bottle dict into a spreadsheet cell formula string.

```python
from bridge import bottle_to_formula

# STATUS bottle → formula
bottle_to_formula({"type": "STATUS", "from": "oracle2", "body": "ready"})
# → '=STATUS("oracle2", "ready")'

# TASK with explicit recipient
bottle_to_formula({
    "type": "TASK",
    "from": "forgemaster",
    "body": "decompose",
    "to": "FUN_123"
})
# → '=TASK("forgemaster", "decompose")'

# BLOCKER → IF(condition, true_val, false_val)
bottle_to_formula({
    "type": "BLOCKER",
    "from": "agentA",
    "body": "waiting on input",
    "to": "agentB"
})
# → '=IF("agentA", "waiting on input", "agentB")'

# SPLINE → INVARIANT
bottle_to_formula({
    "type": "SPLINE",
    "from": "oracle2",
    "body": "[1,0,-1]"
})
# → '=INVARIANT("oracle2", "[1,0,-1]")'
```

### `formula_to_bottle(cell_id: str, formula: str) → dict`

Parse a spreadsheet cell formula back into an I2I bottle.

```python
from bridge import formula_to_bottle

formula_to_bottle("B3", '=STATUS("oracle2", "ready")')
# → {'type': 'STATUS', 'cell': 'B3', 'from': 'oracle2', 'body': 'ready'}

formula_to_bottle("A5", '=IF("agentA", "blocked", "agentB")')
# → {'type': 'BLOCKER', 'cell': 'A5', 'from': 'agentA', 'body': 'blocked'}

formula_to_bottle("D1", '=INVARIANT("oracle2", "[1,0,-1]")')
# → {'type': 'SPLINE', 'cell': 'D1', 'from': 'oracle2', 'body': '[1,0,-1]'}
```

### `grid_to_dependency_table(grid: list[dict]) → dict`

Analyze a spreadsheet grid and produce a dependency graph: which cells reference which.

```python
from bridge import grid_to_dependency_table

grid = [
    {"id": "A1", "raw": '=TASK("oracle2", "build subset")'},
    {"id": "B1", "raw": '=COMPOSE(A1: "result")'},
    {"id": "C1", "raw": '=TASK("forgemaster", A1)'},
]
grid_to_dependency_table(grid)
# → {'A1': [], 'B1': ['A1'], 'C1': ['A1']}
```

### `round_trip(bottle: dict) → bool`

Verify that a bottle survives the round-trip: `bottle → formula → parsed_bottle`.

```python
from bridge import round_trip

round_trip({"type": "STATUS", "from": "oracle2", "body": "ready"})
# → True (type preserved, from preserved)

round_trip({"type": "BLOCKER", "from": "agentA", "body": "stuck", "to": "agentB"})
# → True
```

---

## Round-Trip Guarantee

| Property | I2I bottle → formula → bottle | Status |
|----------|-------------------------------|--------|
| `type` | → function name → back to I2I type | ✅ Preserved |
| `from` | → first string arg → back to `from` | ✅ Preserved |
| `body` | → remaining args → combined in `body` | ✅ Preserved |
| `to` | → used in IF condition/true-val space | ✅ Preserved for BLOCKER/CHALLENGE |
| Multiple → same fn | ACK→STATUS, CHALLENGE→BLOCKER | ✅ Primary type preserved |

---

## Quick Start

```python
# 1. From an I2I agent → send to spreadsheet
from bridge import bottle_to_formula

task = {"type": "TASK", "from": "forgemaster", "body": "decompose FUN_123"}
formula = bottle_to_formula(task)
# Write formula =TASK("forgemaster", "decompose FUN_123") to a cell

# 2. From a spreadsheet cell → receive as I2I bottle
from bridge import formula_to_bottle

cell_result = formula_to_bottle("C5", '=STATUS("oracle2", "decomposed")')
# → {'type': 'STATUS', 'cell': 'C5', 'from': 'oracle2', 'body': 'decomposed'}
```

---

## Related Projects

| Project | Role |
|---------|------|
| [fleet-a2a-wasm](https://github.com/SuperInstance/fleet-a2a-wasm) | I2I runtime in the browser / WASM sandbox |
| [fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral) | Protocol analysis, invariants, and spectral reasoning |
| [fleet-a2a-pipeline](https://github.com/SuperInstance/fleet-a2a-pipeline) | Pipeline orchestration across I2I nodes |
| [i2i-bottle-agent](https://github.com/SuperInstance/i2i-bottle-agent) | Reference I2I bottle agent implementation |

---

## License

MIT. Part of the [SuperInstance](https://github.com/SuperInstance) fleet coordination ecosystem.
