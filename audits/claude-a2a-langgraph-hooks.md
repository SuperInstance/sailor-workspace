# A2A/I2I LangGraph Hook Implementation Audit

**Date:** 2026-06-07  
**Tool:** Claude Code  
**Agent:** Subagent (depth 1/1)

## Summary

Added A2A (Agent-to-Agent) / I2I (Inter-agent-to-Inter-agent) interception hooks to two LangGraph workflow files in the A2A-native-notebookLM project. The hooks allow bottle (task/message) interception, delegation, and result emission within the Q&A and content transformation workflows.

## Files Modified

### 1. `open_notebook/graphs/ask.py` — Q&A Workflow

**Changes:**
- Added `Dict[str, Any]`, `Optional` to imports from `typing`
- Added optional `try/except ImportError` block for A2A hooks module (graceful degradation)
- Added `a2a_context: Optional[Dict[str, Any]]` to `ThreadState` TypedDict
- Added `before_ask()` hook call at the start of `call_model_with_messages()` — intercepts pending bottles and injects their question into the workflow state
- Added `after_ask()` hook call at the end of `write_final_answer()` — packages the final answer as a response bottle and emits it via callback

### 2. `open_notebook/graphs/transformation.py` — Content Transformation Workflow

**Changes:**
- Added `Any, Dict, Optional` imports from `typing`
- Added optional `try/except ImportError` block for A2A hooks module (graceful degradation)
- Added `a2a_context: Optional[Dict[str, Any]]` to `TransformationState` TypedDict
- Added `before_transformation()` hook call at the start of `run_transformation()` — intercepts bottle content/instructions and injects them into the transformation
- Added `after_transformation()` hook call after the transformation completes — packages the output as a response bottle and emits it via callback

### 3. `open_notebook/a2a/hooks.py` — New File (Created)

**Functions:**
- `before_ask(state, a2a_context)` — Checks for pending bottle in a2a_context; injects bottle question into state
- `after_ask(state, a2a_context)` — After Q&A completes, if a bottle was active, emits the final answer via `emit_result` callback
- `before_transformation(state, a2a_context)` — Injects bottle content/instructions into transformation state
- `after_transformation(state, a2a_context)` — After transformation, emits output as bottle result
- `__init__.py` created for the `open_notebook/a2a` package

## Design Decisions

### Graceful degradation
```python
try:
    from open_notebook.a2a.hooks import after_ask, before_ask
    A2A_AVAILABLE = True
except ImportError:
    A2A_AVAILABLE = False
```
All A2A hooks are guarded by `A2A_AVAILABLE` checks. If the A2A module is removed or unavailable, the workflows continue to function identically to before.

### Non-blocking interception
- Hooks check `a2a_context` for `pending_task` — if absent, they are no-ops
- Hooks rely on an `emit_result` callback from the `a2a_context` dict — if not configured, a warning is logged and execution continues normally

### State isolation
- A2A state fields are prefixed with `_a2a_` (e.g., `_a2a_bottle_id`, `_a2a_origin`) to avoid collision with existing workflow state keys

## Test Results

**All 158 tests passed** with 0 failures, 2 warnings (pre-existing Pydantic deprecation warnings).

```
tests/test_graphs.py .............                                       [ OK ]
tests/test_*.py .......................................................... [ OK ]
158 passed, 2 warnings in 3.95s
```

The tests confirm backward compatibility — no existing behavior was altered by the A2A hook additions.
