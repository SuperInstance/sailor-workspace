# Deep Audit: A2A-native-notebookLM (open-notebook v1.9.0)

**Prepared:** 2026-06-07  
**Auditor:** DeepSeek V4 Flash (subagent)  
**Repo:** `/home/ubuntu/.openclaw/workspace/A2A-native-notebookLM/`  
**Scope:** ~101 Python files, Next.js/Svelte frontend, SurrealDB schema, 13 test files

---

## Executive Summary

**open-notebook** is a mature ~30K+ line research-assistant application inspired by Google NotebookLM. It is **not A2A-native** in any sense — there are zero agent-to-agent protocol features. However, its architecture exposes numerous natural integration points that make it a strong candidate for fleet adoption as a **document intelligence / RAG / research workflow tool**.

**Integration Readiness: MEDIUM-HIGH** — structurally sound, well-factored, good security posture for a self-hosted tool. The main gaps are: no A2A/I2I protocol awareness, no CORTEX tool manifest, no fleet auth model.

---

## 1. Architecture Analysis

### 1.1 High-Level Stack

```
┌─────────────────────────────────────────────┐
│  Frontend (Next.js / Svelte / TypeScript)   │
│  - Svelte stores (auth, navigation, theme)  │
│  - Axios API client (10min timeout)         │
│  - i18n (12 locales)                        │
│  - Runtime config discovery (/api/config)   │
└─────────────────┬───────────────────────────┘
                  │ HTTP (JSON/FormData)
                  ▼
┌─────────────────────────────────────────────┐
│  FastAPI Backend (api/main.py)              │
│  - 18 routers under /api/                   │
│  - PasswordAuthMiddleware (Bearer token)    │
│  - CORS configurable via env                │
│  - Lifespan: DB migrations + profile mig.   │
└─────────────────┬───────────────────────────┘
                  │ async Python
                  ▼
┌─────────────────────────────────────────────┐
│  Business Logic & Domain Models             │
│  - ObjectModel (SurrealDB persistence)      │
│  - Notebook, Source, Note, SourceInsight    │
│  - Credential, Transformation, Model        │
│  - ProviderConfig (legacy singleton)        │
└──────┬──────────────┬───────────────────────┘
       │              │
       ▼              ▼
┌──────────────┐ ┌──────────────────────────┐
│ LangGraph    │ │ SurrealDB                │
│ Workflows    │ │ - Graph/doc database     │
│ - ask.py     │ │ - 14 schema migrations   │
│ - chat.py    │ │ - Vector search           │
│ - source.py  │ │ - Relate edges           │
│ - transform  │ └──────────────────────────┘
│  ation.py    │
└──────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  AI Layer (Esperanto)                       │
│  - 15+ providers (OpenAI, Anthropic, etc)   │
│  - Model discovery & registration           │
│  - Credential management (encrypted)        │
│  - Embedding pipeline (chunking + pooling)  │
│  - Background jobs (surreal-commands)       │
└─────────────────────────────────────────────┘
```

### 1.2 LangGraph Workflow System

**4 compiled workflows, all in `open_notebook/graphs/`:**

#### a) `ask.py` — Multi-Agent RAG (3 nodes)
```
START → agent (strategy generation) → provide_answer (parallel fan-out via Send) → write_final_answer → END
```
- **Entry:** Takes a question, generates a `Strategy` with up to 5 searches via structured output
- **Parallel:** `trigger_queries` uses LangGraph's `Send` to fan out parallel vector searches
- **Each query:** Computes vector search results, then processes each result through a model
- **Merge:** `write_final_answer` consolidates all sub-answers
- **Cleanup:** `clean_thinking_content()` removes `...` tags
- **Model routing:** Strategy uses "tools" default model; answers use "tools" default; final uses "tools" default — configurable per-request via `configurable` dict
- **Token limits:** Auto-switches to `large_context_model` when content > 105K tokens

#### b) `chat.py` — Conversational Chat (1 node + persistence)
```
START → agent → END (with SqliteSaver checkpointer)
```
- **Persistence:** Uses `SqliteSaver` to checkpoint conversation history
- **Sync/async bridge:** Runs async model provisioning from sync LangGraph context using `concurrent.futures.ThreadPoolExecutor` (hacky but functional)
- **Model override:** Supports per-request model override via `model_override` field
- **Context injection:** Can include notebook context + sources

#### c) `source.py` — Content Processing Pipeline (3 nodes + conditional)
```
START → content_process → save_source → [conditional] transform_content → END
```
- **Pipeline:** Extract → Save → Transform (optional, parallel via Send)
- **Content extraction:** Uses `content-core` library for web scraping, YouTube transcripts, PDF parsing, audio transcription
- **Audio processing:** Speech-to-text integration for podcast transcription
- **Transformations:** Applies user-defined LLM prompts to extracted content (summarization, analysis, etc.)
- **Embedding:** Vector search indexing after extraction

#### d) `transformation.py` — Single-Step Content Transform (1 node)
```
START → agent → END
```
- Simple prompt → model → output pipeline
- Supports default transformation instructions from system settings

### 1.3 AI Model Provisioning & Management

**Provider Architecture (`open_notebook/ai/`):**

| Module | Responsibility |
|--------|---------------|
| `models.py` | `Model` domain object + `ModelManager` facade + `DefaultModels` singleton |
| `model_discovery.py` | Auto-fetch available models from 15+ provider APIs |
| `key_provider.py` | DB-first key provisioning with env var fallback |
| `provision.py` | `provision_langchain_model()` — smart model selection with context-aware routing |

**Model Discovery Supports:** OpenAI, Anthropic, Google Gemini, Ollama, Groq, Mistral, DeepSeek, xAI, OpenRouter, Voyage, ElevenLabs, Deepgram, DashScope, MiniMax, OpenAI-compatible, Azure, Vertex

**Model Selection Logic (`provision_langchain_model`):**
1. If token count > 105K → use `large_context_model`
2. If explicit `model_id` → use that
3. Otherwise → use default for type (chat/transformation/tools)

### 1.4 Domain Model

**`ObjectModel` base class** (`base.py`):
- Pydantic v2 with SurrealDB persistence
- CRUD: `save()`, `get()`, `get_all()`, `delete()`
- Relationships: `relate()` method for SurrealDB edge creation
- Polymorphic: `_get_class_by_table_name()` for multi-table lookup
- Datetime parsing: ISO 8601 with Z suffix support

**`RecordModel` singleton class:**
- Used for global config records (DefaultModels, ProviderConfig, DefaultPrompts)
- Singleton pattern with DB lazy-loading
- Bypasses singleton cache for fresh reads (DefaultModels)

**Key Domain Objects:**
| Class | Table | Key Fields |
|-------|-------|------------|
| `Notebook` | `notebook` | name, description, archived |
| `Source` | `source` | title, topics, asset, full_text, command |
| `Note` | `note` | title, content, note_type, embedding |
| `SourceInsight` | `source_insight` | source, insight_type, content, embedding |
| `Transformation` | `transformation` | name, title, prompt, apply_default |
| `Model` | `model` | name, provider, type, credential |
| `Credential` | `credential` | name, provider, modalities, api_key (encrypted) |

### 1.5 SurrealDB Schema & Data Storage

**Database:** SurrealDB (WebSocket protocol, configurable via env vars)

**Migrations:** `open_notebook/database/migrations/` — 14 versioned `.surrealql` files with up/down pairs. Auto-run on FastAPI lifespan start.

**Important Tables:**
- `notebook`, `source`, `note`, `source_insight`, `source_embedding` — core content
- `model`, `credential` — AI provider config
- `transformation`, `default_prompts` — prompt templates
- `command` — background job queue (surreal-commands)
- `chat_session`, `chat_message` — conversation persistence
- `reference` — edge: notebook ↔ source
- `artifact` — edge: notebook ↔ note

**Vector Search:** Embeddings stored inline (`note.embedding`, `source_insight.embedding`) or as separate records (`source_embedding` table with chunked content). Search via `vector_search()` in `notebook.py`.

**Async Migration Manager:** `AsyncMigrationManager` checks `_sbl_migrations` table for current version, runs pending migrations, bumps version.

### 1.6 API Endpoints

**18 routers, all under `/api/`:**

| Router | Prefix | Key Endpoints |
|--------|--------|---------------|
| `auth` | `/api/auth` | login, status, config |
| `notebooks` | `/api/notebooks` | CRUD, delete-preview, sources, notes |
| `sources` | `/api/sources` | CRUD, upload, download, status, retry |
| `notes` | `/api/notes` | CRUD |
| `insights` | `/api/insights` | CRUD |
| `search` | `/api/search` | search, ask |
| `models` | `/api/models` | CRUD, defaults, sync-providers |
| `credentials` | `/api/credentials` | CRUD, test, discover, register-models, migrate |
| `chat` | `/api/chat` | chat sessions, messages |
| `transformations` | `/api/transformations` | CRUD, execute, default-prompts |
| `embedding` | `/api/embedding` | embed, rebuild |
| `podcasts` | `/api/podcasts` | transcript, generate |
| `config` | `/api/config` | runtime frontend config |
| `context` | `/api/context` | notebook context for chat |
| `settings` | `/api/settings` | content processing settings |
| `commands` | `/api/commands` | command status tracking |

### 1.7 Frontend Architecture

**Framework:** Next.js with Svelte stores (auth, navigation, theme, sidebar, notebook columns)

**API Communication:**
- Axios client with runtime base URL (fetched from `/api/config`)
- 10-minute timeout (600s) for slow LLM operations
- Auth token from localStorage (`auth-storage`)
- Request interceptor: FormData detection, JSON content-type
- Response interceptor: 401 → redirect to /login

**i18n:** 12 locales with runtime language switching

**File Upload:** Multipart FormData via proxy endpoint

**Frontend Type Definitions:**
- `api.ts` — API response types
- `models.ts` — Model, Credential types
- `auth.ts` — Login/status types
- `search.ts` — Search/Ask types
- `transformations.ts` — Transformation types
- `podcasts.ts` — Podcast generation types
- `config.ts` — Frontend configuration

---

## 2. A2A (Agent-to-Agent) Assessment

### 2.1 Current State: ZERO A2A Features

This project has **no agent-to-agent communication of any kind**. Specifically:
- No A2A protocol endpoints (agent card, task, agent-to-agent messaging)
- No I2I vessel/bottle patterns
- No tool discovery or manifest registration
- No inter-agent routing or message passing
- No shared task/artifact space for multi-agent coordination
- No capability advertisement mechanism

### 2.2 Adaptability to I2I Bottle/Vessel Pattern

**High potential.** The architecture naturally maps to I2I patterns:

| I2I Concept | open-notebook Equivalent | Adaptation Effort |
|-------------|------------------------|-------------------|
| **Vessel** | FastAPI app with 18 routers | Ships already — need `/agent` namespace |
| **Bottle** | REST request/response + background commands | Add `bottle` envelope to existing endpoints |
| **Manifest** | No equivalent | New: CORTEX.json tool definition |
| **Task** | `surreal-commands` background jobs | Natural mapping — commands have state, progress, results |
| **Artifacts** | Source/Note/Insight objects | Already in SurrealDB — expose as referenceable artifacts |
| **Context** | LangGraph state + notebook context | Matches I2I context bottle pattern |
| **Routing** | No inter-agent routing | Add vessel registry |

**Natural Entry Points for A2A:**
1. **`/api/agents`** namespace — new router for A2A agent card, manifest, task delegation
2. **`/api/commands`** already tracks async job state — maps to A2A task lifecycle
3. **`/api/search/ask`** is effectively an agent capability ("ask this research assistant a question")
4. **`/api/credentials`** is credential management — an agent could provision keys for another agent
5. **`/api/models`** is capability querying — "what models does this node have?"

### 2.3 Where A2A Hooks Would Go

```python
# Proposed: api/routers/agents.py
router = APIRouter(prefix="/agents", tags=["a2a"])

@router.get("/card")              # Agent card — capabilities, identity
@router.post("/tasks")            # Delegate a task to this agent
@router.get("/tasks/{id}")        # Poll task status
@router.get("/tasks/{id}/result") # Get task result
@router.post("/bottles")          # I2I vessel → bottle exchange
@router.get("/manifest")          # CORTEX.json tool manifest

# Integration points in existing code:
# api/search_service.py — "ask" capability
# api/sources_service.py — ingest capability  
# api/transformations_service.py — transform capability
# commands/embedding_commands.py — long-running task pattern
```

### 2.4 Required Changes for Fleet Discovery

1. **Add agent identity:** `AGENT_ID` env var or config — each node self-identifies
2. **Add CORTEX manifest endpoint:** Serve tool descriptors at `/api/manifest`
3. **Add I2I vessel endpoint:** Accept I2I protocol bottles at `/api/bottles`
4. **Vessel registry:** Register with a central vessel directory (or broadcast)
5. **Auth bridge:** Map fleet tokens to internal auth (Bearer tokens already supported)

---

## 3. Integration Points for Our Fleet

### 3.1 CORTEX Skills Format

open-notebook naturally maps to several tool capabilities:

```json
{
  "agent_name": "open-notebook",
  "version": "1.9.0",
  "capabilities": [
    {
      "name": "ask",
      "description": "Answer questions using RAG over ingested documents",
      "endpoint": "/api/search/ask",
      "method": "POST",
      "input_schema": {
        "question": "string",
        "strategy_model": "string (optional)",
        "answer_model": "string (optional)",
        "final_answer_model": "string (optional)"
      },
      "output_schema": {
        "answer": "string",
        "question": "string"
      }
    },
    {
      "name": "ingest_source",
      "description": "Ingest a document (URL, upload, or text) into a notebook",
      "endpoint": "/api/sources",
      "method": "POST",
      "input_schema": {
        "type": "string (link|upload|text)",
        "notebook_id": "string",
        "url": "string (optional)",
        "content": "string (optional)",
        "transformations": ["string (optional)"],
        "embed": "boolean (optional)"
      }
    },
    {
      "name": "search_knowledge_base",
      "description": "Vector/text search across all sources and notes",
      "endpoint": "/api/search",
      "method": "POST",
      "input_schema": {
        "query": "string",
        "type": "string (text|vector)",
        "limit": "integer (optional, max 1000)",
        "search_sources": "boolean",
        "search_notes": "boolean"
      }
    },
    {
      "name": "transform_content",
      "description": "Run an LLM transformation (summarize, analyze, etc.)",
      "endpoint": "/api/transformations/:id/execute",
      "method": "POST"
    },
    {
      "name": "list_notebooks",
      "endpoint": "/api/notebooks",
      "method": "GET"
    },
    {
      "name": "list_models",
      "endpoint": "/api/models",
      "method": "GET",
      "description": "List available AI models across all providers"
    }
  ],
  "auth": {
    "type": "bearer_token",
    "token_endpoint": "/api/auth/login"
  }
}
```

**Where to declare:** Serve from a new `GET /api/manifest` endpoint or static `/api/.well-known/cortex.json`

### 3.2 I2I Vessel Protocol

To enable I2I bottle flow:

1. **Create `/api/vessels` router** implementing the vessel protocol:
   ```python
   @router.post("/vessels/{vessel_id}/bottles")
   async def receive_bottle(vessel_id: str, bottle: Bottle):
       # Parse bottle → dispatch to internal handler
       # Handler: ask, ingest, search, transform, etc.
       # Return response bottle
   ```

2. **Map internal commands to bottle types:**
   - `ask/question` → `/api/search/ask`
   - `ingest/source` → source creation pipeline
   - `search/query` → vector/text search
   - `transform/run` → transformation execution

3. **Long-running bottles:** Commands returning `command_id` map naturally to A2A task lifecycle — poll via `/api/commands/{id}`

### 3.3 Claw Engine Integration

The ternary computation engine could back:
- **Embedding computation:** Vector embedding generation is a batch-oriented compute task well-suited for ternary hardware
- **Vector search:** Distance computations (cosine similarity) on ternary embeddings
- **Bulk transforms:** LLM transformation jobs as ternary-inference batches
- **Embedding rebuild:** Massive parallel embedding rebuild (`rebuild_embeddings_command`) maps to batch compute pipeline

**Integration:**
```python
# Optional: swap embedding backend to ternary
from claw_engine import ternary_embed

async def generate_embeddings_ternary(texts, ...):
    if os.getenv("CLAW_EMBEDDING"):
        return await ternary_embed(texts, ...)
    return await generate_embeddings(texts, ...)
```

### 3.4 Reflex Integration

Pincher reflex patterns for:
- **Source ingestion reflex:** When a new source arrives → auto-embed → auto-transform → notify
- **Model provisioning reflex:** When credential saved → auto-discover models → register
- **Health reflex:** Periodic check → SurrealDB connectivity → model availability → emit status
- **Search reflex:** Cache recent queries; pre-warm embeddings for hot documents

---

## 4. Strengths & Weaknesses

### Strengths ✅

1. **Well-factored architecture:** Clean separation of API/domain/persistence/AI layers. Each layer has distinct responsibilities.
2. **Excellent AI provider abstraction:** Esperanto layer provides uniform interface across 15+ providers. Auto-discovery, credential management, model routing all mature.
3. **Robust async job system:** `surreal-commands` with configurable retry, exponential backoff, wait strategies, error classification.
4. **Good security foundation:** Fernet encryption for API keys, path traversal protection, Docker secrets support, CORS configurability, auth middleware.
5. **Strong test coverage:** 13 test files covering domain, API, graphs, embedding, chunking, URL validation.
6. **Complete migration system:** 14 versioned schema migrations with up/down, auto-applied on startup.
7. **Graceful degradation:** Encryption is optional (plaintext fallback with warning), models fall back from DB to env vars.
8. **Multi-notebook support:** Sources can belong to multiple notebooks, cascade delete is well-handled.
9. **Async-first:** Nearly all operations async (FastAPI native), with clear sync/async boundaries.
10. **Comprehensive error handling:** Custom exception hierarchy with mapped HTTP status codes and CORS-safe error responses.

### Weaknesses ❌

1. **No A2A/I2I protocol support** — zero agent-to-agent features. This is the primary integration blocker.
2. **No CORTEX manifest** — fleet cannot discover this tool's capabilities.
3. **Single-user auth** — PasswordAuthMiddleware is basic (token-based but no OAuth, no RBAC, no API key management for programmatic access). Fleet integration needs multiple clients.
4. **LangGraph sync/async bridge is fragile** — `chat.py` uses `ThreadPoolExecutor` to bridge async → sync, which is a known anti-pattern. Can cause event loop issues.
5. **SurrealDB dependency** — requires a running SurrealDB instance. Not ideal for lightweight deployment. No SQLite fallback for simple setups.
6. **No API versioning** — all routes are `v1` implied but not declared. Breaking changes would silently break fleet agents.
7. **Embedding storage in SurrealDB** — storing large vectors inline can be inefficient. Separate `source_embedding` table for chunks is good but `note.embedding` and `insight.embedding` are inline.
8. **LLM response cleaning is post-hoc** — `clean_thinking_content()` operates on string content rather than properly parsing structured outputs. Fragile across model vendors.
9. **No rate limiting** — no per-user or per-agent rate limiting. Fleet could overwhelm the instance.
10. **No health endpoint for AI** — `/health` returns simple status but doesn't verify DB connectivity or model availability.
11. **Config file-based (pyproject.toml)** — dependencies are pinned but no lockfile (poetry.lock or similar). Reproducible builds not guaranteed.
12. **No structured logging for agents** — logs are unstructured text. Fleet agents need machine-parseable logs.

---

## 5. Refactoring Recommendations

### Priority 1: CORTEX Compliance (HIGH)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Add `/api/manifest` endpoint** serving CORTEX tool descriptor | 1 day | Enables fleet discovery |
| 2 | **Add agent identity config** (`AGENT_ID`, `AGENT_FLEET` env vars) | 0.5 day | Required for fleet routing |
| 3 | **Version all API endpoints** (`/api/v1/...`) | 2 days | Semantic versioning for fleet |
| 4 | **Add `/api/v1/capabilities`** — dynamic capability listing | 1 day | Auto-discovery of available tools |

### Priority 2: A2A/I2I Protocol Support (HIGH)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 5 | **Add `/api/agents` router** with agent card, tasks, task lifecycle | 3 days | Core A2A compliance |
| 6 | **Add I2I vessel endpoints** (`/api/vessels`, bottle receive/send) | 2 days | I2I protocol compatibility |
| 7 | **Add A2A task model** — map existing commands to A2A task lifecycle (queued → running → completed/failed) | 2 days | Task delegation from other agents |
| 8 | **Add bottle/auth verification** — validate I2I bottle signatures and fleet tokens | 1 day | Secure inter-agent communication |

### Priority 3: Security Hardening (MEDIUM)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 9 | **Add API key auth** for programmatic fleet access (static tokens alongside password auth) | 1 day | Enables non-interactive fleet ops |
| 10 | **Add rate limiting** (per-agent, per-IP, per-endpoint) | 2 days | Prevents DoS from misbehaving agents |
| 11 | **Add RBAC** (agent role: read-only, operator, admin) | 3 days | Principle of least privilege for fleet |
| 12 | **Audit all env var exposure** — ensure no secrets leak in error responses or logs | 1 day | Prevent secret leakage |
| 13 | **Add CORS strict mode** for fleet (whitelist known agent origins) | 0.5 day | Fleet-security conscious CORS |

### Priority 4: Integration Deepening (MEDIUM)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 14 | **Export embedding compute to Claw engine** — optional ternary backend for embeddings | 3 days | Leverage fleet hardware |
| 15 | **Add pincher reflexes** — auto-trigger capabilities based on event patterns | 4 days | Proactive behavior |
| 16 | **Structured JSON logging** (`@logfire` or similar) for machine parsing | 1 day | Fleet observability |
| 17 | **Add health check depth** — `GET /health` returns DB, AI model, and agent status | 0.5 day | Fleet health monitoring |

### Priority 5: Technical Debt (LOW)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 18 | **Fix LangGraph sync/async in `chat.py`** — convert to proper async pattern | 1 day | Reliability |
| 19 | **Add dependency lockfile** (poetry.lock or pip freeze) | 0.5 day | Reproducibility |
| 20 | **Inline vectors → separate table** for all embedding types (not just source_embedding) | 2 days | Performance at scale |
| 21 | **Add OpenAPI response models** for all endpoints (many missing) | 3 days | API documentation |
| 22 | **Add integration tests** for complete agent → tool interaction | 2 days | Fleet confidence |

---

## 6. Detailed File Inventory

### Core Python Backend
```
open_notebook/
├── ai/
│   ├── key_provider.py       # DB-first + env fallback key provisioning
│   ├── model_discovery.py    # Auto-discover models from 15+ providers
│   ├── models.py             # Model domain + ModelManager facade
│   └── provision.py          # Smart model selection (context-aware)
├── config.py                 # Path configuration (data, uploads, tiktoken)
├── database/
│   ├── async_migrate.py      # Versioned migration system
│   ├── repository.py         # SurrealDB abstraction layer
│   └── migrations/           # 14 .surrealql migrations
├── domain/
│   ├── base.py               # ObjectModel + RecordModel base classes
│   ├── notebook.py           # Notebook, Source, Note, SourceInsight
│   ├── credential.py         # Credential with encrypted API keys
│   ├── transformation.py     # LLM transformation templates
│   └── provider_config.py    # Legacy ProviderConfig (singleton)
├── graphs/
│   ├── ask.py                # Multi-agent RAG workflow (3 nodes, parallel fan-out)
│   ├── chat.py               # Conversational chat (1 node + persistence)
│   ├── source.py             # Content processing pipeline (3+ nodes)
│   └── transformation.py     # Single-step transform (1 node)
├── utils/
│   ├── embedding.py          # Unified embedding: batch, chunk+pool, retry
│   ├── encryption.py         # Fernet field-level encryption
│   ├── chunking.py           # Content-aware text chunking (markdown, code, etc.)
│   ├── token_utils.py        # Token counting (tiktoken)
│   └── error_classifier.py   # Error classification for graceful degradation
├── exceptions.py             # Hierarchical exception types (12 classes)
└── podcasts/                 # Podcast profile management

api/
├── main.py                   # FastAPI app, middleware, exception handlers
├── models.py                 # All Pydantic request/response models
├── routers/                  # 18 API routers
│   ├── auth.py, notebooks.py, sources.py, notes.py, insights.py
│   ├── models.py, credentials.py, search.py, chat.py
│   ├── transformations.py, embedding.py, podcast.py
│   ├── settings.py, context.py, config.py, commands.py
│   └── embedding_rebuild.py
├── credentials_service.py    # Credential business logic
├── sources_service.py        # Source business logic
├── search_service.py         # Search + ask business logic
├── transformations_service.py
├── settings_service.py
├── command_service.py        # Command submission abstraction
└── auth.py                   # PasswordAuthMiddleware

commands/
├── embedding_commands.py     # embed_source, embed_note, embed_insight, rebuild
├── source_commands.py        # process_source
├── podcast_commands.py       # Podcast generation
└── example_commands.py
```

### Tests (13 files)
```
tests/
├── test_domain.py            # Domain model CRUD
├── test_graphs.py            # LangGraph workflows
├── test_embedding.py         # Embedding pipeline
├── test_chunking.py          # Text chunking
├── test_sources_api.py       # Source API
├── test_credentials_api.py   # Credential API
├── test_models_api.py        # Model API
├── test_notes_api.py         # Note API
├── test_podcast_path.py      # Podcast generation paths
├── test_url_validation.py    # URL validation
├── test_utils.py             # Utility functions
└── conftest.py               # Test fixtures
```

### Frontend (TypeScript/Svelte)
```
frontend/src/
├── lib/
│   ├── api/client.ts         # Axios API client (10min timeout)
│   ├── stores/               # Svelte stores (auth, nav, theme, etc.)
│   ├── types/                # TypeScript type definitions
│   ├── locales/              # 12 i18n locales
│   └── config.ts             # Runtime config
├── proxy.ts                  # File upload proxy
└── components/               # Svelte UI components
```

---

## 7. Dependency Summary

### Python Dependencies (from pyproject.toml)
| Dependency | Purpose | Criticality |
|-----------|---------|-------------|
| `fastapi` | Web framework | Core |
| `langgraph` | Workflow orchestration | Core |
| `esperanto` | AI provider abstraction layer | Core |
| `surrealdb` | Graph database | Core |
| `surreal-commands` | Async background jobs | Core |
| `content-core` | Content extraction | Core |
| `ai-prometer` | Prompt template rendering | Core |
| `cryptography` | Fernet encryption | Security |
| `langchain-core` | LangChain base classes | Core |
| `httpx` | Async HTTP for model discovery | Core |
| `numpy` | Mean pooling for embeddings | Embedding |
| `tiktoken` | Token counting | Utility |

### Node Dependencies
| Dependency | Purpose |
|-----------|---------|
| `axios` | HTTP client |
| `svelte` | UI framework |
| `zustand` | State management |

---

## 8. Migration Path for Fleet Integration

### Phase 1: Discovery (Week 1)
1. Add CORTEX manifest endpoint
2. Add agent identity config
3. Version API to `/api/v1/`
4. Serve capabilities list

### Phase 2: Protocols (Week 2)
1. Add A2A `/api/agents` router
2. Add I2I vessel endpoints
3. Map internal commands to A2A task lifecycle
4. Add fleet auth (API key auth)

### Phase 3: Hardening (Week 3)
1. Rate limiting
2. Structured logging
3. Deep health checks
4. RBAC for agents

### Phase 4: Optimization (Week 4)
1. Claw engine backend for embeddings
2. Pincher reflexes
3. Integration tests with fleet
4. Performance benchmarking

---

## 9. Conclusion

**open-notebook is architecturally well-suited for fleet integration** but requires dedicated protocol-layer work. The codebase is mature, well-tested, and follows good separation of concerns. The primary gap (zero A2A/I2I protocol awareness) is a bolt-on concern rather than a fundamental architectural flaw.

**Key strengths:** AI provider abstraction, async job system, SurrealDB graph model, security posture, test coverage.  
**Key blockers:** No CORTEX manifest, no A2A protocol, no fleet auth model, no API versioning.  
**Integration estimate:** ~4 weeks of focused work for full fleet integration (assuming dedicated engineer).

The tool would serve as the fleet's **document intelligence & RAG capability** — ingest, analyze, query, transform content across any supported AI provider, with the fleet providing discovery, routing, and orchestration.
