# Master Refactor Document: A2A-Native NotebookLM → Fleet Cognitive Command Center

> **Date:** 2026-06-07  
> **Scope:** Transform `open-notebook` (v1.9.0) from a standalone research assistant into the **Cognitive Command Center** for the SuperInstance fleet.  
> **Architecture Precedent:** I2I vessel protocol, CORTEX layering, Ternary GPU engine, SMP seed identity.

---

## Table of Contents

1. [Current State vs. Target State](#1-current-state-vs-target-state)
2. [File-by-File Change List](#2-file-by-file-change-list)
3. [API Changes Required](#3-api-changes-required)
4. [CORTEX Manifest](#4-cortex-manifest)
5. [Implementation Phases](#5-implementation-phases)
   - [Phase 1: Connectivity](#phase-1-connectivity)
   - [Phase 2: Intelligence](#phase-2-intelligence)
   - [Phase 3: Convergence](#phase-3-convergence)
6. [Dependency Additions](#6-dependency-additions)
7. [Risk Matrix](#7-risk-matrix)

---

## 1. Current State vs. Target State

| Dimension | Current State | Target State |
|-----------|---------------|--------------|
| **Architecture** | Standalone FastAPI + LangGraph monolith | I2I-native fleet vessel with agent-to-agent message-passing |
| **Communication** | HTTP REST only (human → API → LangGraph → LLM) | REST + I2I bottle protocol (agent ↔ agent via filesystem/pub-sub) |
| **Identity** | Stateless per-request, SurrealDB record IDs only | SMP seed identity persists across sessions, notebooks, and fleet interactions |
| **Capability Model** | Implicit in code paths (chat, ask, transform, source) | Explicit CORTEX manifest with a-priori skills + la-bel taxonomy |
| **Workflow Interception** | No agent-to-agent communication in LangGraph | A2A hook points at every graph node boundary for delegation/offload |
| **Compute** | Local Python threads, serial LLM calls | Offload heavy research/synthesis to Claw Ternary GPU engine |
| **Persistence** | SurrealDB + SQLite checkpoints | Same + I2I message store + SMP seed registry |
| **Fleet Role** | Single-user web app | **Cognitive Command Center** — receives fleet research tasks, dispatches sub-tasks, synthesizes results |
| **Observability** | Loguru logging only | Structured bottle audit trail, CORTEX compliance, fleet health metrics |
| **Configuration** | `.env` + Docker env vars | Same + CORTEX manifest + I2I harbor config + SMP seed file |

---

## 2. File-by-File Change List

### 2.1 New Files to Create

| File | Purpose | Details |
|------|---------|---------|
| `open_notebook/i2i/__init__.py` | I2I protocol package | Init module, exports public API |
| `open_notebook/i2i/vessel.py` | Vessel implementation | Bottle drop, beachcomb, harbor watch — the I2I protocol client (mirrors `i2i-vessel/` pattern) |
| `open_notebook/i2i/bottle.py` | Bottle data model | Pydantic model for I2I:ACK, I2I:BOTTLE, I2I:SYNTHESIS, I2I:CHALLENGE with integrity hash, timestamp, shard payload |
| `open_notebook/i2i/harbor.py` | Harbor consumer | Async listener that polls harbor directory, dispatches to appropriate handler |
| `open_notebook/i2i/router.py` | I2I message router | Maps bottle type → handler function (e.g. RESEARCH_TASK → ask_graph, SYNTHESIS_REQUEST → transform_graph) |
| `open_notebook/i2i/beachcomber.py` | Periodic beachcomb cycle | Async task that scans for new bottles, processes, drops response |
| `open_notebook/fleet/__init__.py` | Fleet package | Fleet-level orchestration init |
| `open_notebook/fleet/cortex.py` | CORTEX manifest loader | Reads `CORTEX.json`, validates capability declarations, exposes supported skills inventory |
| `open_notebook/fleet/manifest.json` | CORTEX manifest file | Declarative capability map (see §4 below) |
| `open_notebook/fleet/identity.py` | SMP seed identity | Load/manage SMP seed file. Routes identity through configurable seed path. Supports `NOTEBOOK_IDENTITY_SEED` env var. |
| `open_notebook/fleet/registry.py` | Fleet capability registry | Central registry: what this notebook instance can do, what models it has, what bottles it accepts |
| `open_notebook/ternary/__init__.py` | Ternary engine bridge | Init module |
| `open_notebook/ternary/client.py` | Claw GPU HTTP client | Async HTTP client to Claw engine API. Sends heavy tensor ops, returns results. Handles retry/backoff/timeout. |
| `open_notebook/ternary/operations.py` | Offload-eligible operation registry | Maps operation types (embedding, large-context synthesis, multi-query decomposition) to Ternary endpoints |
| `open_notebook/ternary/synthesis.py` | Heavy synthesis offloader | Takes a large research payload, calls `Claw GPU engine /synthesize`, streams response back into the LangGraph pipeline |
| `open_notebook/ternary/embed.py` | GPU-accelerated embedding | Alternative to local `vectorize()` that offloads to Claw for massive documents |
| `open_notebook/graphs/a2a_hooks.py` | A2A interception hooks | Middleware/decorators that wrap LangGraph node functions with pre/post A2A communication. Each hook can: intercept state, delegate to another agent, or inject bottle results. |
| `open_notebook/a2a/__init__.py` | A2A protocol package | Agent-to-Agent communication framework init |
| `open_notebook/a2a/interceptor.py` | Graph interceptor | Patches LangGraph `StateGraph.add_node()` to wrap nodes with A2A hooks |
| `open_notebook/a2a/dispatcher.py` | Cross-notebook dispatcher | Routes delegation requests to remote notebook instances (via I2I or REST) |
| `open_notebook/a2a/contract.py` | A2A contract enforcer | Validates that both agents agree on capability contract before delegating |
| `scripts/init-fleet.sh` | Fleet initialization script | Creates `.i2i/` directory structure, seeds SMP identity, installs I2I service |
| `tests/test_i2i/` | I2I test directory | Test suite for bottle protocol, harbor, beachcomber |
| `tests/test_a2a/` | A2A test directory | Test suite for graph interceptor, dispatcher, contract |

### 2.2 Files to Modify

| File | Change | Why |
|------|--------|-----|
| **`open_notebook/graphs/ask.py`** | Insert A2A hook calls at 4 interception points (§2.3 below) | Enable agent-to-agent delegation during the Ask workflow |
| **`open_notebook/graphs/transformation.py`** | Insert A2A hook at `run_transformation` node entry/exit | Allow transform tasks to be dispatched to specialized fleet agents |
| **`open_notebook/graphs/source.py`** | Add I2I bottle drop after source processing | Notify fleet when new source material is available for shared context |
| **`open_notebook/graphs/chat.py`** | Add A2A context injection before `call_model_with_messages` | Allow fleet agents to inject context/insights into chat sessions |
| **`open_notebook/graphs/source_chat.py`** | Add I2I context provider alongside `ContextBuilder` | Source chat can pull context from fleet-wide knowledge |
| **`open_notebook/domain/notebook.py`** | Add `get_fleet_context()` method, SMP identity metadata fields | Notebooks become fleet-aware: they know which fleet agents contributed |
| **`open_notebook/ai/provision.py`** | Add `ternary_offload` parameter to `provision_langchain_model` | Heavy model calls can be routed through Ternary bridge instead of local LLM |
| **`open_notebook/domain/base.py`** | Add `fleet_metadata: dict` to `ObjectModel` base class | All domain objects inherit fleet traceability |
| **`open_notebook/config.py`** | Add I2I paths (`I2I_BOTTLE_DIR`, `I2I_HARBOR_DIR`, `I2I_POLL_INTERVAL`), SMP seed path, Claw GPU endpoint | Central configuration for fleet connectivity |
| **`api/main.py`** | Register I2I lifecycle in `lifespan()` — start beachcomber on startup, shut down gracefully | The I2I system runs as a sidecar within the API process |
| **`api/routers/notebooks.py`** | Add fleet-aware endpoints: `POST /api/notebooks/{id}/fleet-broadcast`, `GET /api/notebooks/{id}/fleet-status` | Programmatic fleet control via REST |
| **`api/routers/transformations.py`** | Add A2A delegation endpoint: `POST /api/transformations/{id}/delegate-to-fleet` | Fleet agents can invoke transformations remotely |
| **`pyproject.toml`** | Add dependencies: `aiofile>=3.8`, `cryptography>=41.0`, `httpx>=0.27`, `orjson>=3.9` | I2I protocol, SMP identity hashing, async HTTP client, fast serialization |
| **`Dockerfile`** | Add `.i2i/` dir creation, fleet init script | Containerized fleet readiness |
| **`docker-compose.yml`** | Add `CLAW_GPU_ENDPOINT`, `I2I_SHARED_DIR` env vars, optional Claw sidecar | Development fleet orchestration |
| **`CLAUDE.md`** | Add fleet architecture section, I2I protocol reference | Developer onboarding for fleet mode |
| **`README.md`** | Add "Fleet Mode" section: how to join the SuperInstance fleet | User-facing documentation |

### 2.3 A2A Interception Points in LangGraph

#### `graphs/ask.py` — Ask Workflow (4 interception points)

```
Flow: START → agent (strategy generation) → trigger_queries → provide_answer → write_final_answer → END

Interception Points:
```

| Point | Location | A2A Hook Purpose | I2I Bottle Type |
|-------|----------|------------------|-----------------|
| **A2A-1** | `call_model_with_messages()` entry, after `system_prompt` built | Delegate strategy generation to a fleet strategist agent if available | `I2I:BOTTLE` with `type: "strategy_request"` |
| **A2A-2** | `trigger_queries()` conditional edge | Before dispatching `Send` fan-out, check if any sub-queries should be routed to fleet specialists | `I2I:BOTTLE` with `type: "query_delegation"` |
| **A2A-3** | `provide_answer()` entry | Before `vector_search`, check fleet cache for pre-answered queries. After answer, index back to fleet. | `I2I:ACK` (cache check) / `I2I:SYNTHESIS` (answer publish) |
| **A2A-4** | `write_final_answer()` entry/exit | Pre: check if fleet synthesis available. Post: broadcast final answer to fleet. | `I2I:SYNTHESIS` (publish final) |

#### `graphs/transformation.py` — Transformation Workflow (2 interception points)

```
Flow: START → agent (run_transformation) → END

Interception Points:
```

| Point | Location | A2A Hook Purpose | I2I Bottle Type |
|-------|----------|------------------|-----------------|
| **A2A-5** | `run_transformation()` entry, after prompt build | Check if a fleet transformation specialist can handle this transformation type | `I2I:BOTTLE` with `type: "transformation_delegation"` |
| **A2A-6** | `run_transformation()` exit, after `source.add_insight()` | Publish transformation insight to fleet knowledge base | `I2I:SYNTHESIS` with `type: "transformation_result"` |

#### `graphs/source.py` — Source Processing Workflow (1 interception point)

| Point | Location | A2A Hook Purpose | I2I Bottle Type |
|-------|----------|------------------|-----------------|
| **A2A-7** | `save_source()` exit, after vectorization | Broadcast new source availability to fleet agents subscribed to content updates | `I2I:BOTTLE` with `type: "source_available"` |

#### `graphs/chat.py` — Chat Workflow (1 interception point)

| Point | Location | A2A Hook Purpose | I2I Bottle Type |
|-------|----------|------------------|-----------------|
| **A2A-8** | `call_model_with_messages()` entry, before `prompt.build_context()` | Check fleet for enriched context relevant to the chat session | `I2I:ACK` (fleet context injection) |

### 2.4 Hook Implementation Pattern

Each interception point follows this pattern:

```python
# Example: A2A hook at provide_answer entry point
async def provide_answer(state: SubGraphState, config: RunnableConfig) -> dict:
    # ---- A2A PRE-HOOK ----
    a2a_context = await a2a_dispatcher.pre_hook(
        hook_point="A2A-3",
        state=state,
        bottle_type="I2I:ACK",  # Fleet cache check
        config=config,
    )
    if a2a_context.is_handled:
        return {"answers": a2a_context.payload["answers"]}
    # ---- END PRE-HOOK ----

    # Original logic...
    results = await vector_search(state["term"], 10, True, True)
    # ... (unchanged) ...

    # ---- A2A POST-HOOK ----
    await a2a_dispatcher.post_hook(
        hook_point="A2A-3",
        result={"answers": answers},
        bottle_type="I2I:SYNTHESIS",  # Publish answer
        config=config,
    )
    # ---- END POST-HOOK ----

    return {"answers": answers}
```

The hook implementation is **non-blocking by default** — if the fleet peer is unreachable or doesn't respond within a timeout, the local logic proceeds as normal. This ensures the notebook remains fully functional in standalone mode.

---

## 3. API Changes Required

### 3.1 New REST Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| `GET` | `/api/fleet/status` | Fleet health: connected agents, capability inventory | New |
| `GET` | `/api/fleet/cortex` | Return this agent's CORTEX manifest | New |
| `GET` | `/api/fleet/identity` | Return SMP identity info (public seed hash only) | New |
| `POST` | `/api/fleet/broadcast` | Drop an I2I bottle into the shared namespace | New |
| `GET` | `/api/fleet/messages` | Poll harbor for inbound messages | New |
| `POST` | `/api/notebooks/{id}/fleet-broadcast` | Broadcast notebook context to fleet | New |
| `GET` | `/api/notebooks/{id}/fleet-status` | Fleet contributions to this notebook | New |
| `POST` | `/api/transformations/{id}/delegate` | Delegate transformation to fleet specialist | New |
| `POST` | `/api/a2a/dispatch` | Raw A2A dispatch — send a contract to another agent | New |
| `GET` | `/api/ternary/status` | Claw GPU engine connectivity status | New |

### 3.2 Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/chat/{session_id}/messages` | Accept optional `fleet_context: bool` param to enable fleet context injection |
| `POST` | `/api/notebooks` | Accept optional `fleet_seed: str` param for SMP identity binding |
| `GET` | `/api/health` | Add `fleet_connected`, `ternary_available`, `i2i_harbor_count` to response |
| `GET` | `/api/config` | Include `fleet_mode`, `i2i_enabled`, `ternary_endpoint` in returned config |

### 3.3 I2I Internal API (File-Based)

The I2I protocol is file-based (mirroring the existing `i2i-vessel/` pattern):

| Operation | File Path | Format |
|-----------|-----------|--------|
| Drop bottle | `{I2I_BOTTLE_DIR}/{timestamp}_{type}.i2i` | JSON with `from`, `to`, `type`, `timestamp`, `hash`, `shard` |
| Receive harbor | `{I2I_HARBOR_DIR}/{timestamp}_{type}.i2i` | Same JSON format |
| Lock | `{I2I_DIR}/.lock` | POSIX flock for atomic write |
| Rotate | `{I2I_ARCHIVE_DIR}/` | Processed bottles moved here after 7 days |

Bottle JSON schema:

```json
{
  "protocol": "I2I",
  "version": "1.0",
  "type": "I2I:BOTTLE",
  "from": "notebooklm:{instance_id}:{seed_hash}",
  "to": "fleet:*",
  "timestamp": "2026-06-07T00:17:00Z",
  "hash": "sha256-abc123...",
  "ttl_seconds": 3600,
  "shard": {
    "artifacts": [],
    "reasoning": "strategy_request for query 'what is...'",
    "blockers": []
  },
  "payload": {
    "hook_point": "A2A-1",
    "workflow": "ask",
    "state_snapshot": { ... }
  }
}
```

---

## 4. CORTEX Manifest

### 4.1 `open_notebook/fleet/manifest.json`

```json
{
  "manifest_version": "1.0.0",
  "agent_name": "notebooklm",
  "agent_version": "1.9.0",
  "agent_role": "Cognitive Command Center",
  "description": "AI-powered research assistant and fleet knowledge hub. Processes multi-modal content, answers questions via multi-strategy search, transforms sources via prompts, generates podcasts.",

  "a_priori_capabilities": {
    "research": {
      "description": "Multi-strategy research: decomposes questions, searches vector store, synthesizes answers",
      "workflow": "ask_graph",
      "la_bels": ["research.strategy", "research.search", "research.synthesis"],
      "input": "question (string)",
      "output": "final_answer (string)",
      "performance_estimate": "3-15s depending on search fan-out"
    },
    "content_ingestion": {
      "description": "Ingest multi-modal content: PDF, URL, YouTube, audio, video → markdown + vector embeddings",
      "workflow": "source_graph",
      "la_bels": ["content.extraction", "content.embedding", "content.transformation"],
      "input": "URL or file path",
      "output": "processed source with full_text and vector embedding",
      "performance_estimate": "5-60s depending on content size and type"
    },
    "source_transformation": {
      "description": "Apply custom prompt-based transformations to source content (summarize, extract, rewrite, etc.)",
      "workflow": "transformation_graph",
      "la_bels": ["transformation.apply", "transformation.custom_prompt", "transformation.batch"],
      "input": "source_id + transformation_id",
      "output": "insight text",
      "performance_estimate": "2-10s per transformation"
    },
    "conversational_chat": {
      "description": "Multi-turn conversation with notebook context, source grounding, and optional fleet context injection",
      "workflow": "chat_graph",
      "la_bels": ["chat.turn", "chat.context_aware", "chat.source_grounded"],
      "input": "message history + optional context",
      "output": "AI response",
      "performance_estimate": "1-5s per turn"
    },
    "source_chat": {
      "description": "Source-specific Q&A with insight awareness",
      "workflow": "source_chat_graph",
      "la_bels": ["chat.source_specific", "chat.insight_aware"],
      "input": "source_id + message history",
      "output": "AI response grounded in source",
      "performance_estimate": "1-5s per turn"
    },
    "podcast_generation": {
      "description": "Generate multi-speaker podcast audio from source content",
      "workflow": "podcast_creator",
      "la_bels": ["media.podcast", "media.audio_generation", "media.multi_speaker"],
      "input": "source_id + podcast profile",
      "output": "audio file (mp3)",
      "performance_estimate": "30-300s depending on podcast length"
    },
    "vector_search": {
      "description": "Semantic search across all notebook content using embeddings",
      "workflow": "vector_search",
      "la_bels": ["search.semantic", "search.vector", "search.hybrid"],
      "input": "query string + k (top results)",
      "output": "ranked list of source chunks with relevance scores",
      "performance_estimate": "0.5-2s"
    }
  },

  "a2a_contracts": {
    "accepts": [
      {
        "type": "research_task",
        "routable_to": "ask_graph",
        "parameters": ["question", "strategy_model", "answer_model"],
        "response_type": "synthesis"
      },
      {
        "type": "transform_task",
        "routable_to": "transformation_graph",
        "parameters": ["source_id", "transformation_id", "input_text"],
        "response_type": "insight"
      },
      {
        "type": "source_query",
        "routable_to": "vector_search",
        "parameters": ["query", "k", "notebook_id"],
        "response_type": "search_results"
      },
      {
        "type": "context_provide",
        "routable_to": "source_chat_graph",
        "parameters": ["source_id", "query"],
        "response_type": "context_snapshot"
      }
    ],
    "delegates_to": [
      {
        "type": "heavy_synthesis",
        "specialist": "ternary_engine",
        "condition": "context > 10000 tokens ||
                     requires GPU tensor ops"
      },
      {
        "type": "code_generation",
        "specialist": "forgemaster",
        "condition": "transformation contains 'code' ||
                     output format is source code"
      },
      {
        "type": "web_research",
        "specialist": "oracle2",
        "condition": "requires live web data ||
                     API integration needed"
      },
      {
        "type": "fleet_analysis",
        "specialist": "pincher",
        "condition": "fleet-wide analysis ||
                     cross-repository search"
      }
    ]
  },

  "la_bel_taxonomy": {
    "namespace": "notebooklm",
    "skills": [
      "research.strategy",
      "research.search",
      "research.synthesis",
      "content.extraction",
      "content.embedding",
      "content.transformation",
      "transformation.apply",
      "transformation.custom_prompt",
      "transformation.batch",
      "chat.turn",
      "chat.context_aware",
      "chat.source_grounded",
      "chat.source_specific",
      "chat.insight_aware",
      "media.podcast",
      "media.audio_generation",
      "media.multi_speaker",
      "search.semantic",
      "search.vector",
      "search.hybrid"
    ],
    "verb_mapping": {
      "research": ["investigate", "study", "analyze", "explore", "examine"],
      "transform": ["summarize", "extract", "rewrite", "translate", "format"],
      "chat": ["ask", "discuss", "inquire"],
      "search": ["find", "retrieve", "lookup", "query"],
      "ingest": ["import", "upload", "load", "process"]
    },
    "domain_context": [
      "academic_research",
      "technical_documentation",
      "business_analysis",
      "legal_documents",
      "creative_writing"
    ]
  }
}
```

### 4.2 Capability Resolution Logic

The manifest is loaded at startup (`open_notebook/fleet/cortex.py`) and exposed:

```python
class CORTEXManifest(BaseModel):
    manifest_version: str
    agent_name: str
    agent_version: str
    agent_role: str
    a_priori_capabilities: Dict[str, Capability]
    a2a_contracts: A2AContracts
    la_bel_taxonomy: LaBelTaxonomy

    def can_handle(self, task_type: str, task_params: dict) -> bool:
        """Check if this agent can handle a given task."""
        ...

    def find_delegate(self, task_params: dict) -> Optional[str]:
        """Find a fleet specialist to delegate to."""
        ...

    def la_bel_match(self, verb: str, domain: str) -> List[str]:
        """Return matching skill la-bels for a verb+domain."""
        ...
```

---

## 5. Implementation Phases

### Phase 1: Connectivity (Estimated: 3-5 days)

**Goal:** The notebook can communicate with the fleet via I2I protocol. No intelligence changes yet — just pipes.

#### Tasks

| Day | Task | Files | Verification |
|-----|------|-------|-------------|
| 1 | Create I2I package: bottle model, vessel drop/harbor watch | `open_notebook/i2i/*.py` | Unit test: drop bottle, verify file, verify hash |
| 2 | Implement SMP seed identity management | `open_notebook/fleet/identity.py` | Unit test: seed creation, loading, hash generation |
| 3 | Implement beachcomber cycle as async task | `open_notebook/i2i/beachcomber.py`, `open_notebook/i2i/harbor.py` | Integration test: process inbound bottle |
| 4 | Wire I2I into API lifespan and config | `api/main.py`, `open_notebook/config.py` | API starts with beachcomber task, shuts down cleanly |
| 5 | Build fleet status REST endpoints | `api/routers/*` (new fleet router) | Smoke test: GET /api/fleet/status returns expected shape |

#### Phase 1 Deliverables

- [ ] I2I file-based protocol operational
- [ ] Notebook has SMP identity
- [ ] Harbor listener active during API runtime
- [ ] `/api/fleet/status` endpoint live
- [ ] Config: `I2I_BOTTLE_DIR`, `I2I_HARBOR_DIR`, `I2I_POLL_INTERVAL`, `NOTEBOOK_IDENTITY_SEED`
- [ ] All existing tests pass (no regressions)
- [ ] Bottle integrity verified via SHA-256 hash

---

### Phase 2: Intelligence (Estimated: 5-8 days)

**Goal:** A2A hooks active in all LangGraph workflows. The notebook can delegate tasks to fleet specialists and receive results.

#### Tasks

| Day | Task | Files | Verification |
|-----|------|-------|-------------|
| 1 | Create A2A package: interceptor base, dispatcher | `open_notebook/a2a/*.py` | Unit test: hook wraps node, calls handler |
| 2 | Install A2A hooks in ask.py (A2A-1 through A2A-4) | `open_notebook/graphs/ask.py`, `open_notebook/graphs/a2a_hooks.py` | Integration test: strategy delegation |
| 3 | Install A2A hooks in transformation.py (A2A-5, A2A-6) | `open_notebook/graphs/transformation.py` | Integration test: transform delegation |
| 4 | Install A2A hooks in source.py (A2A-7) and chat.py (A2A-8) | `open_notebook/graphs/source.py`, `open_notebook/graphs/chat.py` | Integration test: source broadcast, context injection |
| 5 | Build CORTEX manifest and capability registry | `open_notebook/fleet/cortex.py`, `open_notebook/fleet/registry.py`, `open_notebook/fleet/manifest.json` | Unit test: manifest load + capability match |
| 6 | Wire A2A contracts to I2I message dispatching | `open_notebook/a2a/dispatcher.py` → `open_notebook/i2i/vessel.py` | Integration test: dispatch → bottle → harbor → response |
| 7 | Add fleet-aware REST endpoints | `api/routers/notebooks.py` (modify), new fleet router (expand) | API integration test: delegate transformation |
| 8 | Add fleet metadata to domain models | `open_notebook/domain/base.py`, `open_notebook/domain/notebook.py` | Verify `fleet_metadata` persists and retrieves |

#### Phase 2 Deliverables

- [ ] All 8 A2A interception points implemented and tested
- [ ] CORTEX manifest validates at startup
- [ ] Capability registry can answer "can you handle this task?"
- [ ] A2A contracts map request types to I2I bottle types
- [ ] Hooks are non-blocking: timeout fallback preserves standalone mode
- [ ] `/api/fleet/cortex` returns manifest
- [ ] Notebook metadata tracks which fleet agents contributed to it
- [ ] Integration test: full round-trip (task → A2A hook → bottle → response)

---

### Phase 3: Convergence (Estimated: 5-7 days)

**Goal:** Heavy compute offloads to Claw GPU. Fleet agents actively discover and use this notebook as the Cognitive Command Center.

#### Tasks

| Day | Task | Files | Verification |
|-----|------|-------|-------------|
| 1 | Build Ternary bridge: HTTP client to Claw GPU engine | `open_notebook/ternary/client.py` | Unit test: mock Claw response |
| 2 | Implement embedding offload | `open_notebook/ternary/embed.py`, `open_notebook/domain/notebook.py` (modify `vectorize()` call site) | Perf test: large document embedding 2x faster |
| 3 | Implement synthesis offload | `open_notebook/ternary/synthesis.py`, `open_notebook/graphs/ask.py` (A2A-4 ternary route) | Perf test: 50k+ token synthesis faster |
| 4 | Register Ternary operations in CORTEX manifest | `open_notebook/fleet/manifest.json` (extend) | Manifest includes ternary capabilities |
| 5 | Add fleet discovery: notebook announces itself to fleet heartbeat | `open_notebook/i2i/beachcomber.py` (extend) | Other fleet agents can find this notebook |
| 6 | Build fleet broadcast endpoints | `api/routers/fleet.py` (new endpoints) | Integration test: multi-agent round trip |
| 7 | Implement agent identity routing via SMP seeds | `open_notebook/fleet/identity.py` (extend) | Verify seed-based routing across notebook instances |
| 8 | Add observability: structured bottle audit trail | `open_notebook/i2i/vessel.py` (extend with audit log), `open_notebook/i2i/audit.py` (new) | Can reconstruct all fleet interactions from logs |
| 9 | Final integration test | Full stack | E2E test: fleet agent sends research task → notebook receives via I2I → delegates sub-tasks → synthesizes → returns result |
| 10 | Documentation, runbook, fleet deployment guide | `CLAUDE.md`, `README.md`, `docs/fleet-deployment.md` | Developer can set up a fleet instance in <30 min |

#### Phase 3 Deliverables

- [ ] `CLAW_GPU_ENDPOINT` config operational
- [ ] Embedding offload: 10k+ token documents 2-4x faster via Claw
- [ ] Synthesis offload: 50k+ token context windows feasible
- [ ] Fleet discovery: notebook heartbeat visible in vessel fleet-recon
- [ ] Full E2E: fleet agent → I2I → A2A hook → Claw offload → response → I2I
- [ ] Audit trail: all fleet interactions logged and queryable
- [ ] Deployment guide: single-command fleet setup
- [ ] CORTEX manifest extended with ternary capabilities

---

## 6. Dependency Additions

### 6.1 Python Dependencies (`pyproject.toml`)

```toml
# Fleet/I2I
"aiofile>=3.8.0",         # Async file I/O for I2I bottle operations
"cryptography>=41.0.0",   # SHA-256 hashing for bottle integrity, SMP seed derivation
"orjson>=3.9.0",          # Fast JSON serialization for bottle payloads

# A2A
"httpx>=0.27.0",          # Already present (needed for Ternary bridge HTTP)

# Identity
"nacl>=1.4.0",            # libsodium bindings for SMP seed cryptography (optional: can use hashlib)
```

### 6.2 System Dependencies

- `libsodium-dev` (optional — for paseto/NaCl identity if nacl binding used)

### 6.3 Docker Changes

- `Dockerfile`: Add `I2I_DIR=/data/.i2i` creation in entrypoint script
- `Dockerfile.single`: Same
- Optionally: install `libsodium-dev` for NaCl bindings

---

## 7. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **I2I file contention** | Medium | Medium | POSIX flock on `.lock` file; retry logic in beachcomber |
| **Fleet agent unreachable** | High | Low | All A2A hooks are non-blocking with configurable timeout (default 5s) |
| **Claw GPU engine overload** | Low | Medium | Queue + exponential backoff; fallback to local compute |
| **SMP seed collision** | Low | High | Use UUID v4 + timestamp in seed derivation; validate uniqueness via hash prefix |
| **LangGraph version migration** | Medium | Medium | Keep hooks as decorators that don't modify graph structure; version-pin `langgraph>=1.0.5` |
| **SurrealDB scalability under fleet load** | Low | Medium | Fleet messages are file-based, not DB-bound; DB is per-instance only |
| **Security: unauthorized I2I messages** | Medium | High | Bottle integrity hash signed with SMP seed; harbor validates `from` field against known agent registry |
| **Configuration complexity** | Medium | Low | Sensible defaults (I2I disabled by default); fleet mode opt-in via `FLEET_MODE=true` |

---

## Appendix A: SMP Identity Flow

```
Startup or first run
├── NOTEBOOK_IDENTITY_SEED env var exists?
│   ├── YES → Load seed from env, derive identity
│   └── NO  → Generate random seed, save to .i2i/identity.seed
│               (encrypted with OPEN_NOTEBOOK_ENCRYPTION_KEY if available)
├── Derive agent_id = "notebooklm:" + sha256(seed)[:12]
├── agent_id used in:
│   ├── I2I bottle "from" field
│   ├── CORTEX manifest "agent_name" + instance suffix
│   ├── A2A contract negotiation identity
│   └── Fleet discovery heartbeat
└── Identity persists across:
    ├── API restarts (seed file on disk or env var)
    ├── Docker container recreations (volume-mounted seed)
    └── Fleet sessions (agents recognize each other by seed hash)
```

## Appendix B: Fleet Mode Quick-Start

```bash
# Enable fleet mode
export FLEET_MODE=true
export NOTEBOOK_IDENTITY_SEED="my-notebook-secret-2026"
export I2I_BOTTLE_DIR="/data/.i2i/bottles"
export I2I_HARBOR_DIR="/data/.i2i/harbor"
export CLAW_GPU_ENDPOINT="http://claw-engine:8080"

# Initialize fleet structure
./scripts/init-fleet.sh

# Start API (beachcomber auto-starts in lifespan)
uvicorn api.main:app --port 5055

# Check fleet status
curl http://localhost:5055/api/fleet/status

# View CORTEX manifest
curl http://localhost:5055/api/fleet/cortex
```

## Appendix C: Database Schema Additions

### SurrealDB — New fields on existing records

```surql
-- Notebook gets fleet_metadata
DEFINE FIELD fleet_metadata ON TABLE notebook TYPE object;
DEFINE FIELD fleet_metadata.last_fleet_broadcast ON TABLE notebook TYPE datetime;
DEFINE FIELD fleet_metadata.contributing_agents ON TABLE notebook TYPE array;
DEFINE FIELD fleet_metadata.contributing_agents.* ON TABLE notebook TYPE string;

-- Source gets fleet origin tracking
DEFINE FIELD fleet_metadata ON TABLE source TYPE object;
DEFINE FIELD fleet_metadata.origin_agent ON TABLE source TYPE string;
DEFINE FIELD fleet_metadata.broadcast_count ON TABLE source TYPE int;

-- New table: i2i_log for audit trail
DEFINE TABLE i2i_log TYPE normal;
DEFINE FIELD i2i_log.bottle_id ON TABLE i2i_log TYPE string;
DEFINE FIELD i2i_log.bottle_type ON TABLE i2i_log TYPE string;
DEFINE FIELD i2i_log.from_agent ON TABLE i2i_log TYPE string;
DEFINE FIELD i2i_log.to_agent ON TABLE i2i_log TYPE string;
DEFINE FIELD i2i_log.timestamp ON TABLE i2i_log TYPE datetime;
DEFINE FIELD i2i_log.payload_summary ON TABLE i2i_log TYPE string;
DEFINE FIELD i2i_log.hook_point ON TABLE i2i_log TYPE string;
```

---

*End of Master Refactor Document*
