# CROSS_REFERENCE.md — fleet-a2a-bridge Quick Reference

## Type Mapping Tables

### Forward: I2I Type → Formula Function

| I2I Type | Formula Function | Args | Example |
|----------|-----------------|------|---------|
| `STATUS` | `STATUS` | `(from, body)` | `=STATUS("oracle2", "ready")` |
| `ACK` | `STATUS` | `(from, body)` | `=STATUS("oracle2", "received")` |
| `TASK` | `TASK` | `(from, body)` | `=TASK("forgemaster", "build")` |
| `CHECKPOINT` | `CHECKPOINT` | `(from, body)` | `=CHECKPOINT("build-3", "validated")` |
| `BLOCKER` | `IF` | `(from, body, to)` | `=IF("agentA", "blocked", "agentB")` |
| `CHALLENGE` | `IF` | `(from, body, to)` | `=IF("agentA", "puzzle", "agentB")` |
| `SPLINE` | `INVARIANT` | `(from, body)` | `=INVARIANT("oracle2", "[1,0,-1]")` |
| `SYNTHESIS` | `COMPOSE` | `(from, body, to)` | `=COMPOSE("oracle2", "result", "A1")` |
| `BOTTLE` | `BOTTLE` | `(from, body)` | `=BOTTLE("oracle2", "payload")` |
| `DELIVERABLE` | `DELIVERABLE` | `(from, body)` | `=DELIVERABLE("oracle2", "docs-v3")` |
| `SESSION` | `SESSION` | `(from, body)` | `=SESSION("oracle2", "run-42")` |

### Reverse: Formula Function → I2I Type

| Formula Function | I2I Type | Notes |
|-----------------|----------|-------|
| `STATUS` | `STATUS` | Both STATUS and ACK → STATUS (primary) |
| `TASK` | `TASK` | |
| `CHECKPOINT` | `CHECKPOINT` | |
| `IF` | `BLOCKER` | Both BLOCKER and CHALLENGE → BLOCKER (primary) |
| `INVARIANT` | `SPLINE` | |
| `COMPOSE` | `SYNTHESIS` | |
| `BOTTLE` | `BOTTLE` | |
| `DELIVERABLE` | `DELIVERABLE` | |
| `SESSION` | `SESSION` | |

---

## API Function Signatures

### `bottle_to_formula(bottle: dict) -> str`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `bottle["type"]` | `str` | No | `"STATUS"` | I2I message type (case-insensitive, uppercased) |
| `bottle["from"]` | `str` | No | `"agent"` | Sender identity |
| `bottle["body"]` | `str` | No | `""` | Message payload |
| `bottle["to"]` | `str` | No | `""` | Recipient (used by IF/COMPOSE) |
| `bottle["timestamp"]` | `str` | No | `""` | ISO8601 timestamp (appended as comment) |

**Returns**: Spreadsheet formula string, e.g. `=STATUS("oracle2", "ready")`

### `formula_to_bottle(cell_id: str, formula: str) -> dict`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cell_id` | `str` | Yes | — | Grid coordinate, e.g. `"B3"` |
| `formula` | `str` | Yes | — | Formula string, e.g. `=STATUS("oracle2", "ready")` |

**Returns**: I2I bottle dict with keys: `type`, `cell`, `from`, `body`

### `grid_to_dependency_table(grid: list[dict]) -> dict`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grid` | `list[dict]` | Yes | List of cells, each with `id` (str) and `raw` (str) |

**Returns**: `dict[str, list[str]]` — mapping `cell_id → [dependent_cell_ids]`

### `round_trip(bottle: dict) -> bool`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bottle` | `dict` | Yes | I2I bottle to round-trip test |

**Returns**: `True` if `type` and `from` survive translation; `False` otherwise

---

## Internal Constants

### `TYPE_TO_FORMULA`

```python
TYPE_TO_FORMULA = {
    "STATUS": "STATUS",
    "TASK": "TASK",
    "CHECKPOINT": "CHECKPOINT",
    "BLOCKER": "IF",
    "SPLINE": "INVARIANT",
    "SYNTHESIS": "COMPOSE",
    "BOTTLE": "BOTTLE",
    "ACK": "STATUS",
    "DELIVERABLE": "DELIVERABLE",
    "CHALLENGE": "IF",
    "SESSION": "SESSION",
}
```

### `FORMULA_TO_TYPE`

```python
FORMULA_TO_TYPE = {
    "STATUS": "STATUS",
    "TASK": "TASK",
    "CHECKPOINT": "CHECKPOINT",
    "IF": "BLOCKER",
    "INVARIANT": "SPLINE",
    "COMPOSE": "SYNTHESIS",
    "BOTTLE": "BOTTLE",
    "DELIVERABLE": "DELIVERABLE",
    "SESSION": "SESSION",
}
```

---

## Formula Format Reference

### Standard formula: `=FUNC("from", "body")`

```
=STATUS("oracle2", "ready")
  ↑      ↑          ↑
  │      └── arg 0  └── arg 1
  └── function name from TYPE_TO_FORMULA
```

### IF formula (BLOCKER/CHALLENGE): `=IF("from", "body", "to")`

```
=IF("agentA", "waiting on input", "agentB")
  ↑           ↑                     ↑
  └── from    └── body              └── to
```

### INVARIANT formula (SPLINE): `=INVARIANT("from", "body")`

```
=INVARIANT("oracle2", "[1,0,-1]")
  ↑           ↑         ↑
  └── type    └── from  └── spline coefficients
```

### COMPOSE formula (SYNTHESIS): `=COMPOSE("from", "body", "to")`

```
=COMPOSE("oracle2", "result", "A1")
```

### Timestamp annotation

```
=STATUS("oracle2", "ready" // 2026-06-08T17:30:00Z)
                           ↑──── timestamp appended
```

The timestamp is included inline after `//` inside the last argument's quotes.

---

## Character Escaping

| Character | In Formula | Escaped As |
|-----------|-----------|------------|
| `"` (double quote) | Body contains `"` | `""` (doubled per CSV convention) |
| `//` (comment) | Timestamp annotation | Appended inside last arg |

---

## File Layout

```
fleet-a2a-bridge/
├── bridge.py          # 9.4 KB — protocol implementation + 12 self-tests
└── README.md          # 3.5 KB — project overview
```

No dependencies. No external packages. Pure Python 3.

---

## Related Fleet Projects

### [fleet-a2a-wasm](https://github.com/SuperInstance/fleet-a2a-wasm)
I2I agent runtime compiled to WebAssembly. Agents that speak I2I in-browser or in sandboxed runtimes. Use the bridge when a WASM agent needs to coordinate with spreadsheet-native agents.

**Bridge integration**: `pipeline wasm bottles → bridge → formulas → grid`

### [fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral)
Protocol analysis toolkit — spectral decomposition of agent coordination patterns. Analyzes the shape of I2I bottle traffic across the fleet.

**Bridge integration**: Spectrally analyze translated formulas by first bridging bottles into formulas, then running spectral analysis on the resulting dependency graph.

### [fleet-a2a-pipeline](https://github.com/SuperInstance/fleet-a2a-pipeline)
Pipeline orchestration across I2I nodes. Manages multi-step workflows where agents pass bottles along a directed graph.

**Bridge integration**: Pipeline stages can terminate at a bridge → spreadsheet step, then resume from the spreadsheet response.

### [i2i-bottle-agent](https://github.com/SuperInstance/i2i-bottle-agent)
Reference implementation of an I2I bottle agent — the canonical consumer/producer of bottles on the I2I side.

**Bridge integration**: Pair with `bottle_to_formula()` to extend any I2I agent to also speak spreadsheet formulas.

---

## Index

| Symbol | Defined In | Description |
|--------|-----------|-------------|
| `bottle_to_formula()` | `bridge.py:37` | I2I bottle → formula string |
| `formula_to_bottle()` | `bridge.py:86` | Formula string → I2I bottle |
| `grid_to_dependency_table()` | `bridge.py:130` | Grid cells → dependency graph |
| `round_trip()` | `bridge.py:153` | Round-trip verification |
| `TYPE_TO_FORMULA` | `bridge.py:13` | Type → function name mapping |
| `FORMULA_TO_TYPE` | `bridge.py:28` | Function name → primary type mapping |
