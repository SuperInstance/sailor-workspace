# A2A Bridge Protocol — I2I Bottle ↔ Cell Formula Translation

## Dual Architecture

| I2I (Our Fleet) | Cell Formula (Spreadsheet Fleet) |
|-----------------|----------------------------------|
| `bottle = {type, from, to, body}` | `cell = =FUNCTION(args...)` |
| Harbor directory | Dependency graph |
| Agent identity | Cell coordinates |
| Bottle routing | Formula propagation |
| SYNTHESIS/STATUS | `=INVARIANT(...)` |

## Translation Rules

### Type Mappings

| I2I Type | Cell Formula | Pattern |
|----------|-------------|---------|
| STATUS | `=STATUS(agent, payload)` | `=STATUS("oracle2", "ready")` |
| TASK | `=TASK(agent, params...)` | `=TASK("forgemaster", "build", "binary")` |
| CHECKPOINT | `=CHECKPOINT(id, state)` | `=CHECKPOINT("build-3", "validated")` |
| BLOCKER | `=IF(condition, error, "ok")` | `=IF(A1<3, "blocked", "ok")` |
| SPLINE | `=INVARIANT(vector)` | `=INVARIANT("[1,0,-1]")` — should return 0 |
| SYNTHESIS | `=COMPOSE(arg1, arg2, ...)` | `=COMPOSE(A1, B1, C1)` |

### Header → Formula Parameters

```
I2I bottle:                 Cell formula:
  from: "oracle2"             STATUS("oracle2", ...)
  to: "forgemaster"           → cell B3 receives formula
  timestamp: ISO8601          → formula `=STATUS("oracle2", "ready" // 2026-06-08T17:30Z)`
  type: "STATUS"              → determines function name
  body: "ready"               → first argument
```

### Bottle Body → Cell Dependency Graph

```
I2I bottle with agents []:     Spreadsheet grid:
  A → B msg                      A1: =TASK("A", ...)
  B → C msg                      B1: =TASK("B", A1_value)
  A → C msg                      C1: =TASK("C", A1_value, B1_value)
```

## API

### `bottle_to_formula(bottle: dict) -> str`

Convert an I2I bottle JSON to a spreadsheet cell formula string.

```python
bottle = {
    "type": "STATUS",
    "from": "oracle2",
    "to": "forgemaster",
    "body": "ready",
    "timestamp": "2026-06-08T17:30:00Z"
}

bridge.bottle_to_formula(bottle)
# → '=STATUS("oracle2", "ready" // 2026-06-08T17:30:00Z)'
```

### `formula_to_bottle(cell_id: str, formula: str) -> dict`

Parse a spreadsheet cell formula back into an I2I bottle.

```python
bridge.formula_to_bottle("B3", '=STATUS("oracle2", "ready")')
# → {'type': 'STATUS', 'from': 'oracle2', 'body': 'ready', 'cell': 'B3'}
```

### `grid_to_dependency_table(grid: list[dict]) -> dict`

Convert a grid state (all non-empty cells) to a dependency table.

```python
grid = [
    {"id": "A1", "raw": '=TASK("oracle2", "build subset")'},
    {"id": "B1", "raw": '=COMPOSE(A1: "result")'},
]
bridge.grid_to_dependency_table(grid)
# → {'A1': [], 'B1': ['A1']}
# → Cell B1 depends on cell A1 (formula references)
```

## Round-Trip Guarantee

I2I bottle → formula → bottle preserves:
- `type` → function name → `type`
- `from` → first string arg → `from` (if present)
- `body` → remaining args → combined in `body`
- Extended args → `body` with structured delimiter

## Agent Usage

```python
from bridge import bottle_to_formula, formula_to_bottle

# Agent A (I2I fleet): send STATUS
bottle = {"type": "STATUS", "from": "oracle2", "body": "ready"}
formula = bottle_to_formula(bottle)
# → '=STATUS("oracle2", "ready")'

# Agent B (spreadsheet fleet): receive as cell
received_bottle = formula_to_bottle("C5", formula)
# → {'type': 'STATUS', 'from': 'oracle2', 'body': 'ready', 'cell': 'C5'}
```

## Implementation

See `bridge.py` for the Python implementation. 19 tests, all passing.
