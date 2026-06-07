# Claude Code — A2A/I2I Integration Package Creation

**Task:** Create the A2A/I2I integration package for A2A-native-notebookLM (Phase 1).

**Project:** `/home/ubuntu/.openclaw/workspace/A2A-native-notebookLM/`

**Date:** 2026-06-07

---

## Files Created / Updated

| File | Type | Description |
|------|------|-------------|
| `open_notebook/a2a/__init__.py` | ✅ Updated | Package init exporting all public API (Bottle, BottleEnvelope, BottleType, A2ACapability, CORTEXManifest, VesselClient, all hooks) |
| `open_notebook/a2a/models.py` | ✅ Created | Pydantic v2 models: Bottle, BottleEnvelope, A2ACapability, CORTEXManifest, BottleType enum (10 types: TASK, STATUS, CHECKPOINT, BLOCKER, DELIVERABLE, BOTTLE, ACK, SYNTHESIS, CHALLENGE, SESSION) |
| `open_notebook/a2a/vessel.py` | ✅ Created | I2I VesselClient with: check_vessel(), send_bottle(), receive_bottle(), send_bottle_remote(), mark_processed(), process_bottle(), discover_cortex(), close() |
| `open_notebook/a2a/router.py` | ✅ Created | FastAPI router with 4 endpoints: POST /api/v1/a2a/bottle, GET /api/v1/a2a/bottles, GET /api/v1/a2a/capabilities, GET /.well-known/cortex.json |
| `open_notebook/a2a/hooks.py` | ✅ Updated | Existing hooks kept + added setup_a2a_context(notebook_id, vessel) which polls vessel for pending tasks and provides emit_result callback |
| `CORTEX.json` | ✅ Created | Root-level A2A manifest with 6 capabilities: research, transform, summarize, podcast, ai-query, agent-chat |
| `tests/test_a2a.py` | ✅ Created | 43 tests covering all modules |

---

## Package Verification

```
$ python -c "from open_notebook.a2a import *; print('A2A package OK')"
A2A package OK
```

---

## Test Results

**43 passed in 0.44s** ✅

- **TestBottleModel** (6 tests) — Bottle creation, serialization, deserialization, envelope wrapping, enum values
- **TestCORTEXManifest** (5 tests) — Defaults, from dict, from JSON file, capability schemas, disk CORTEX.json loading
- **TestVesselClient** (12 tests) — Directory creation, send/receive, check vessel, mark processed, round-trip, process bottle (TASK/ACK/unknown), cortex discovery (success/failure), remote send
- **TestRouter** (8 tests) — Capabilities endpoint, cortex discovery, receive bottle (valid/invalid), list bottles (empty/after receive/with limit), CORS headers
- **TestHooks** (12 tests) — before_ask (no context/with task/no task), after_ask (no bottle id/with result), before_transformation (with content/no context), after_transformation (with result/no output), setup_a2a_context (empty/with bottle/emit result)

---

## Architecture Summary

### Bottle Protocol (I2I/Vessel)
- **Bottle**: Core message unit with id, sender, recipient, type (enum), payload, context, timestamp
- **BottleEnvelope**: Wraps bottle with signature + routing metadata
- **10 bottle types**: TASK, STATUS, CHECKPOINT, BLOCKER, DELIVERABLE, BOTTLE, ACK, SYNTHESIS, CHALLENGE, SESSION

### VesselClient
- **Local storage**: Writes bottles to `./.vessel/incoming/` and `./.vessel/outgoing/` as JSON files
- **Process dispatch**: TASK→ACK, STATUS→ACK, CHECKPOINT→ACK, SESSION→ACK, unknown→CHALLENGE, ACK→no reply
- **Remote**: Async HTTP delivery + A2A cortex discovery via `/.well-known/cortex.json`

### A2A Router
- **POST /api/v1/a2a/bottle**: Receive bottle from another agent → persists to incoming
- **GET /api/v1/a2a/bottles**: List received bottles (with limit param)
- **GET /api/v1/a2a/capabilities**: Expose full CORTEXManifest
- **GET /.well-known/cortex.json**: Standards-based agent discovery with CORS

### LangGraph Hooks
- **before_ask(a2a_context)**: Injects pending bottle query into Q&A workflow
- **after_ask(a2a_context)**: Emits DELIVERABLE bottle via emit_result callback
- **before_transformation(a2a_context)**: Injects bottle content into transformation
- **after_transformation(a2a_context)**: Emits transformation result as bottle
- **setup_a2a_context(notebook_id)**: Loads vessel bottles, returns pending_task + emit_result
