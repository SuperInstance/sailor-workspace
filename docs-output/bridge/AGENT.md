# AGENT.md — How Agents Use the Bridge

## Agent Identity

As an agent, you speak **one or both** protocols. The bridge handles translation when you need to talk across protocol boundaries.

- **I2I-native agents**: emit bottles (`{type, from, to, body}`) into harbor directories
- **Spreadsheet-native agents**: emit cell formulas (`=FUNC(args…)`) into grid cells
- **Hybrid agents**: use both — read bottles, write formulas; read formulas, write bottles

## Shortcut: The Two Lines You Need

```python
from bridge import bottle_to_formula, formula_to_bottle

# You speak I2I, they speak spreadsheets → translate outbound
out = bottle_to_formula({"type": "STATUS", "from": "oracle2", "body": "ready"})
# out == '=STATUS("oracle2", "ready")'

# They speak spreadsheets, you speak I2I → translate inbound
inbound = formula_to_bottle("C5", '=TASK("forgemaster", "build binary")')
# inbound == {'type': 'TASK', 'cell': 'C5', 'from': 'forgemaster', 'body': 'build binary'}
```

## Integration Patterns

### Pattern 1: The Bridge Agent (relay)

A dedicated agent sits between the two fleets. It watches both sides and translates.

```
┌──────────┐    bottles     ┌──────────────┐    formulas    ┌──────────────┐
│ I2I Fleet ├───────────────►│ Bridge Agent ├───────────────►│ Spreadsheet  │
│ agents    │                │              │                │ Fleet agents │
└──────────┘                │ (translates) │                └──────────────┘
        ▲                   └──────────────┘                       │
        │                        │                                 │
        └────────────────────────┴─────────────────────────────────┘
                                 formulas → bottles → agents
```

```python
# Bridge agent main loop (pseudocode)
while True:
    for bottle in poll_harbor():
        formula = bottle_to_formula(bottle)
        write_cell(next_free_cell(), formula)

    for cell in poll_grid():
        bottle = formula_to_bottle(cell.id, cell.raw)
        drop_bottle(bottle)
```

### Pattern 2: Embedded Translation (agent talks both)

A single agent has logic for both protocols and calls the bridge inline.

```python
from bridge import bottle_to_formula, formula_to_bottle

class HybridAgent:
    def speak_to_spreadsheet(self, bottle):
        return bottle_to_formula(bottle)

    def listen_from_spreadsheet(self, cell_id, formula):
        return formula_to_bottle(cell_id, formula)

    def coordinate(self):
        # Example: I2I agent delegates a task to spreadsheet agent
        task_bottle = {"type": "TASK", "from": self.name, "body": "build binary"}
        formula = self.speak_to_spreadsheet(task_bottle)
        write_to_grid("B3", formula)

        # Later: read the response
        response_formula = read_from_grid("C5")
        response_bottle = self.listen_from_spreadsheet("C5", response_formula)
        # Forward back into I2I fleet
        self.send_bottle(response_bottle)
```

### Pattern 3: Dependency-Aware Composition

Use `grid_to_dependency_table()` to map formula dependencies for orchestration decisions.

```python
from bridge import bottle_to_formula, grid_to_dependency_table

def propagate_status_change(grid, changed_cell):
    """When a cell changes, find all downstream cells and notify them."""
    deps = grid_to_dependency_table(grid)

    affected = set()
    def walk_dependents(cell):
        for cid, refs in deps.items():
            if cell in refs and cid not in affected:
                affected.add(cid)
                walk_dependents(cid)
    walk_dependents(changed_cell)

    for cell_id in affected:
        bottle = formula_to_bottle(cell_id, get_cell_raw(cell_id))
        self.send_bottle(bottle)
```

## Type Routing Decisions

When translating **formula → bottle**, the bridge uses this primary-type mapping:

| Formula Function | Result I2I Type |
|-----------------|----------------|
| `=STATUS(…)` | `STATUS` |
| `=TASK(…)` | `TASK` |
| `=CHECKPOINT(…)` | `CHECKPOINT` |
| `=IF(…)` | `BLOCKER` |
| `=INVARIANT(…)` | `SPLINE` |
| `=COMPOSE(…)` | `SYNTHESIS` |
| `=BOTTLE(…)` | `BOTTLE` |
| `=DELIVERABLE(…)` | `DELIVERABLE` |
| `=SESSION(…)` | `SESSION` |

If your agent needs to distinguish between, e.g., an `ACK` and a `STATUS` after round-trip (both land on `=STATUS`), embed the distinction in the `body` field:

```python
# ACK with distinguishable body
bottle_to_formula({"type": "ACK", "from": "oracle2", "body": "ack:received"})
# → =STATUS("oracle2", "ack:received")

formula_to_bottle("F1", '=STATUS("oracle2", "ack:received")')
# → {'type': 'STATUS', 'from': 'oracle2', 'body': 'ack:received'}
# Check body.startswith("ack:") to recover the original ACK intent
```

## Quoting and Escaping

The bridge handles double-quote escaping transparently:

```python
bottle_to_formula({"type": "STATUS", "from": "agent", "body": 'say "hello"'})
# → '=STATUS("agent", "say ""hello""")'

formula_to_bottle("A1", '=STATUS("agent", "say ""hello""")')
# → {'type': 'STATUS', 'cell': 'A1', 'from': 'agent', 'body': 'say "hello"'}
```

## Edge Cases

- **Unrecognized type**: passed through as function name; reverse mapping uses it as-is
- **Empty body**: formula omits empty args gracefully
- **Formula without `=` prefix**: the parser strips `=` if found; if absent, treats raw string as body
- **No agents listening**: the bridge doesn't guarantee delivery — it translates, it doesn't route. Pair with a harbor or grid watcher for delivery.

## Related

- `README.md` — Full protocol reference
- `STUDENT_GUIDE.md` — Beginner walkthrough
- `CROSS_REFERENCE.md` — Type tables and function signatures
