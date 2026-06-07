# Audit: I2I Vessel-Native Package Implementation

**Date:** 2026-06-07  
**Project:** A2A-native-notebookLM  
**Architecture:** REFLEX-ARCHITECTURE (I2I Vessel-Native)  
**Zero LangGraph modifications:** ✅ Verified

## Files Created

| # | File | Size | Status |
|---|------|------|--------|
| 1 | `open_notebook/i2i/models.py` | 3.3 KB | ✅ Created |
| 2 | `open_notebook/i2i/router.py` | 6.1 KB | ✅ Created |
| 3 | `open_notebook/i2i/handlers.py` | 13.3 KB | ✅ Created |
| 4 | `open_notebook/i2i/poller.py` | 6.9 KB | ✅ Created |
| 5 | `open_notebook/i2i/__init__.py` | 1.8 KB | ✅ Created |
| 6 | `CORTEX.json` (updated) | 761 B | ✅ Updated |
| 7 | `tests/test_i2i.py` | 15.7 KB | ✅ Created |
| 8 | `api/main.py` (modified) | — | ✅ Modified |
| 9 | `run_api.py` (modified) | — | ✅ Modified |

## Architecture: Vessel-Native vs Hook

| Aspect | Old (Hook) | New (Vessel-Native) |
|--------|-----------|-------------------|
| LangGraph files modified | 2 (`ask.py`, `transformation.py`) | **0** |
| A2A layer location | Inside graph nodes | **Separate I2I routers + handlers** |
| Bottle routing | Implicit via `a2a_context` | **Explicit via `dispatch()` dispatcher** |
| New capability | Write hook + modify graph | **Add route handler + register type** |
| Bottle persistence | In-memory only | **Filesystem-bound via FS poller** |
| Offline resilience | None | **FS-backed with error dirs** |
| Debugging | Hard (hidden in hook chain) | **Easy (router logs every bottle, `/bottles` endpoint)** |

## Package Structure

```
open_notebook/i2i/
├── __init__.py    — Package init, exports public API
├── models.py      — Bottle, BottleEnvelope, BottleType, VesselStatus (Pydantic v2)
├── router.py      — FastAPI router: POST /bottle, GET /bottles, GET /status, /.well-known/cortex.json
├── handlers.py    — Bottle type handlers: research, transform, podcast, status, synthesis
└── poller.py      — Background FS poller: reads /tmp/i2i-vessel/incoming/, writes to outgoing/
```

## Test Results

**27 passed, 0 failed** (`pytest tests/test_i2i.py -x -q`)

### Test Coverage
- **Bottle Model Validation** (7 tests): UUID generation, round-trip JSON, empty sender/recipient validation, enum completeness, envelope wrapping, VesselStatus serialization
- **CORTEX Manifest** (2 tests): CORTEX.json file existence + endpoint response
- **Router Endpoints** (8 tests): Status, cortex, bottles list with/without limit, POST bottle for STATUS/RESEARCH/TRANSFORM/unknown type
- **Handler Dispatch** (7 tests): registered_types() correctness, get_handler() lookup, STATUS and RESEARCH dispatch, unknown type handling, transform dispatch
- **Package** (2 tests): Version string, public API completeness
- **CORTEX.json Structure** (1 test): Capabilities ↔ handler mapping

## Integration Points

- **`api/main.py`**: I2I router and well-known router mounted, FS poller started in lifespan, poller stopped on shutdown, I2I endpoints excluded from password auth
- **`run_api.py`**: Imports `open_notebook.i2i` at startup to ensure registration
- **`CORTEX.json`**: Updated with I2I-native endpoints and vessel_protocol field

## Bottle Types Handled

| Type | Handler | Calls Existing Notebook Code |
|------|---------|------------------------------|
| RESEARCH | `handle_research()` | `open_notebook.graphs.ask.graph.ainvoke()` |
| TRANSFORM | `handle_transform()` | `open_notebook.graphs.transformation.graph.ainvoke()` |
| PODCAST | `handle_podcast()` | `open_notebook.podcasts.models` (profile/episode) |
| STATUS | `handle_status()` | Returns config/status (no LangGraph) |
| SYNTHESIS | `handle_synthesis()` | Multi-ask + optional synthesis step |
| SESSION | No handler → returns error | — |
| ACK | No handler (used as result) | — |
| ERROR | No handler (used as result) | — |

## FS Poller Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `I2I_VESSEL_PATH` | `/tmp/i2i-vessel` | Base directory for incoming/outgoing bottles |
| `I2I_POLL_INTERVAL` | `5` (seconds) | Polling frequency |
| `I2I_VESSEL_NAME` | `a2a-native-notebooklm` | Vessel identity for recipient matching |

## File Verification

```python
from open_notebook.i2i import *
# I2I package OK
# Bottle: <class 'open_notebook.i2i.models.Bottle'>
# BottleType: [RESEARCH, TRANSFORM, PODCAST, STATUS, SYNTHESIS, SESSION, ACK, ERROR]
# VesselStatus: <class 'open_notebook.i2i.models.VesselStatus'>
# dispatch: <function dispatch>
# router: <fastapi.routing.APIRouter>
# poller start: <function start_poller>
```
