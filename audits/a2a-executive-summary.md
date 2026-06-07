# A2A-Native-NotebookLM — Executive Summary

**Repo scanned:** `open-notebook` v1.9.0 by lfnovo (MIT)
**Repo URL:** https://github.com/lfnovo/open-notebook
**Purpose:** Open-source, self-hosted alternative to Google NotebookLM
**Status:** Active, production-grade (19k+ stars on GitHub)

---

## 1. WHAT IS IT?

Open Notebook is **Google NotebookLM, but self-hosted and multi-model.** It's a research assistant that lets you:

- Create research "notebooks" (projects)
- Add sources (PDFs, web pages, YouTube videos, audio, Office docs, plain text)
- Get AI-generated insights from sources
- Chat with AI using your sources as context (RAG)
- Search across all sources/notes (vector + full-text)
- Generate professional multi-speaker podcasts from your research
- Apply custom content transformations (summarize, extract, etc.)

**Key differentiator vs NotebookLM:** 18+ AI providers, full data sovereignty, REST API, fully customizable, and you can run it for free locally with Ollama.

---

## 2. ARCHITECTURE OVERVIEW

```
┌───────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)            │
│  TypeScript + React + Tailwind + shadcn/ui       │
│  App Router, i18n (15 languages)                 │
└─────────────┬─────────────────────────────────────┘
              │ REST API (JSON)
              ▼
┌───────────────────────────────────────────────────┐
│               Backend API (FastAPI/Python)         │
│  /api/routers/* — 20+ resource routers           │
│  /api/*_service.py — business logic services      │
└─────────────┬─────────────────────────────────────┘
              │
   ┌──────────┼──────────────┐
   ▼          ▼              ▼
┌──────┐ ┌────────┐ ┌──────────────┐
│SurrealDB│ │SQLite │ │ LangGraph    │
│(primary)│ │(chat  │ │ (AI workflows)│
│         │ │state) │ │              │
└────────┘ └────────┘ └──────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│   Esperanto AI Factory Layer             │
│   (proxy/adapter library)               │
└──────────────┬───────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  18 AI Providers (OpenAI, Anthropic,│
│  Ollama, Mistral, DeepSeek, etc.)   │
└─────────────────────────────────────┘
```

### Key Layers:

1. **Frontend:** Next.js 14 App Router, TypeScript, React, Tailwind CSS, shadcn/ui components
2. **API Layer:** FastAPI Python backend with 20+ REST routers
3. **Service Layer:** Business logic services (chat, sources, notebooks, podcasts, etc.)
4. **Domain Layer:** Pydantic models backed by SurrealDB (Notebook, Source, Note, ChatSession, Credential)
5. **AI Layer:** LangGraph workflows + Esperanto AI factory for multi-provider model provisioning
6. **Database:** SurrealDB (primary) + SQLite (LangGraph checkpoint persistence)

---

## 3. DATA MODEL & DATABASE

### Primary Database: **SurrealDB v2**

SurrealDB is a multi-model database (document + graph + vector search + full-text search). It's used for all persistent entities.

**Entity Graph:**
```
notebook ──artifact──▶ note
notebook ──reference──▶ source
source ──has──▶ source_embedding (chunk)
source ──has──▶ source_insight
chat_session ──refers_to──▶ notebook
chat_session ──refers_to──▶ source
credential ──(link)──▶ model
```

**Core Domain Models** (all extend `ObjectModel → BaseModel`):
- `Notebook`: name, description, archived
- `Source`: asset (file/URL), title, topics, full_text, command (processing job ref)
- `Note`: title, content, note_type (human/ai)
- `ChatSession`: title, model_override
- `Credential`: api_key (encrypted), provider, modalities, endpoints config
- `SourceEmbedding`: content (chunk text)
- `SourceInsight`: insight_type, content
- `Model` (in `ai/models.py`): model_id, provider, type, credential ref

### Secondary Database: **SQLite** (LangGraph checkpoints)

Used for streaming chat session state persistence via `SqliteSaver`.

### Search: SurrealDB-native
- **Full-text search:** `fn::text_search()` function (built-in SurrealDB)
- **Vector search:** `fn::vector_search()` using embeddings stored in SurrealDB

---

## 4. AI PROVIDER SUPPORT (18+)

**LLM + Chat Providers:**
OpenAI, Anthropic, Groq, Google GenAI, Vertex AI, Ollama, Perplexity, Azure OpenAI, Mistral, DeepSeek, xAI, OpenRouter, DashScope (Qwen), MiniMax, OpenAI-Compatible (LM Studio)

**Embedding Providers:**
OpenAI, Google, Ollama, Azure, Mistral, Voyage, OpenRouter, OpenAI-Compatible

**Speech-to-Text:**
OpenAI, Groq, Google, Deepgram, Azure, Mistral, OpenAI-Compatible

**Text-to-Speech:**
OpenAI, Google, ElevenLabs, Azure, Mistral, xAI, OpenAI-Compatible

**Key library:** [Esperanto](https://github.com/lfnovo/esperanto) — abstracts all provider differences behind a unified `LanguageModel`, `EmbeddingModel`, `SpeechToText`, etc.

---

## 5. CORE AI WORKFLOW (LangGraph)

### Chat Graph (`open_notebook/graphs/chat.py`)
**Simple pipeline:**
```
START → agent (call_model_with_messages) → END
```
- State: messages, notebook, context, context_config, model_override
- Checkpointed to SQLite (streaming chat)
- Uses `provision_langchain_model()` to select the right model per message

### Ask/Research Graph (`open_notebook/graphs/ask.py`)
**Multi-step parallel RAG:**
```
START → agent (generate strategy with searches) → [parallel] → provide_answer × N
                                                                    ↓
                                                            write_final_answer → END
```
- **Agent node:** Uses a strategy model to plan up to 5 vector searches
- **Parallel fan-out:** Sends each search term to a separate `provide_answer` sub-graph (LangGraph `Send`)
- **Final answer:** Aggregates all search results into one coherent response
- Each search does `vector_search()` against SurrealDB embeddings

### Source Chat Graph (`open_notebook/graphs/source_chat.py`)
Similar to chat but scoped to a single source's content + insights.

### Transformation Graph (`open_notebook/graphs/transformation.py`)
For custom content processing pipelines (summarize, extract, etc.)

---

## 6. FRONTEND STRUCTURE

**Next.js 14 App Router** with TypeScript.

### Component Tree:
```
src/
├── app/
│   ├── (auth)/login       → Login page
│   ├── (dashboard)/
│   │   ├── page           → Home/dashboard
│   │   ├── notebooks/     → Notebook CRUD, 3-column layout
│   │   │   └── [id]/      → Sources | Notes | Chat columns
│   │   ├── sources/       → Source list + detail
│   │   ├── search/        → Global search
│   │   ├── settings/      → API keys, models, config
│   │   ├── transformations/ → Custom processing pipelines
│   │   ├── podcasts/      → Podcast generation
│   │   └── advanced/      → System info, rebuild embeddings
├── components/
│   ├── common/            → Shared UI (CommandPalette, Modals, etc.)
│   ├── source/            → Chat panels, source detail
│   ├── sources/           → Add source wizard, cards
│   ├── notebooks/         → Column layouts, dialogs
│   ├── podcasts/          → Episode/speaker profiles, generation
│   ├── search/            → Streaming results, notebooks dialog
│   ├── ui/                → shadcn/ui primitives
│   └── providers/         → React context providers
├── lib/
│   ├── api/               → API client modules (per resource)
│   ├── hooks/             → React hooks (useNotebookChat, useSearch, etc.)
│   ├── stores/            → Zustand stores (auth, sidebar, theme, etc.)
│   ├── types/             → TypeScript interfaces
│   └── locales/           → i18n (15 languages)
```

### Frontend Types (`src/lib/types/`):
- **api.ts:** NotebookResponse, NoteResponse, SourceListResponse, SourceDetailResponse, ChatSession types, Context types
- **search.ts:** SearchRequest/Response, AskRequest/Response, SSE streaming events (Strategy, Answer, FinalAnswer)
- **models.ts:** Model configuration types
- **config.ts:** BackendConfigResponse, AppConfig, ConnectionError
- **auth.ts:** Auth types
- **podcasts.ts:** Podcast generation types
- **transformations.ts:** Content transformation types
- **common.ts:** NavItem, PageProps

---

## 7. KEY ENGINEERING DETAILS

### Credential Management
- API keys encrypted at rest (AES via `cryptography`)
- Stored in SurrealDB credential table
- `provision_provider_keys()` loads DB keys to env vars on demand
- `Credential.to_esperanto_config()` bypasses env vars entirely (direct config)

### Model Management
- Models registered in SurrealDB (`model` table)
- Typed as: "language", "embedding", "speech_to_text", "text_to_speech", "large_context"
- Default models per type configurable in Settings
- `model_manager` handles provisioning via Esperanto

### Content Processing
- Uses `content-core` library for multi-format extraction (PDF, Office, video transcripts via youtube-transcript-api, etc.)
- Processing done via `surreal-commands` job system (async background jobs)
- Embeddings generated asynchronously via background commands

### Podcast Generation
- Uses `podcast-creator` library
- Supports 1-4 speakers with custom profiles (voice, style, language)
- Episode profiles for script structure and conversation style

---

## 8. WHAT WOULD IT TAKE TO MAKE THIS A2A-NATIVE?

### Current State (NOT A2A)
The system has no A2A agent-to-agent protocol. It's a monolithic app where:
- One FastAPI backend serves one Next.js frontend
- AI calls are in-process via Esperanto/LangChain
- No agent discovery, no agent cards, no task delegation

### A2A Integration Points

**1. Turn the existing LangGraph workflows into A2A agents:**
- The "Ask" graph (strategy → parallel search → answer) is already a multi-agent pattern internally — it could expose itself as an A2A agent with an AgentCard
- The "Chat" graph could be an A2A agent handling conversational tasks
- Source processing and podcast generation could each be separate A2A agents

**2. Communication patterns that map:**
- **Tasks/Send:** Open Notebook's `Send("provide_answer", {...})` in LangGraph maps directly to A2A's task-oriented agent communication
- **Streaming:** Chat already uses SSE streaming; A2A supports streaming via `TaskState` updates
- **JSON input/output:** A2A uses JSON-RPC; the system already works with strongly-typed Pydantic/JSON serialization

**3. What needs building:**
- A2A AgentCard endpoint (`/.well-known/agent.json`) exposing capabilities
- A2A JSON-RPC endpoint for task creation/subscription
- A2A task state management (Pydantic models → A2A `Task`/`Message`/`Artifact` types)
- Agent discovery registry (could be SurrealDB-based)
- Adapt the Credential system to handle A2A auth tokens

**4. Good news — the architecture is already well-structured for it:**
- Clean separation of concerns (domain models, service layer, graph workflows)
- Async throughout (FastAPI + async/await)
- Streaming infrastructure already in place
- Multi-model support means A2A could route to different providers/capabilities
- SurrealDB is a natural agent state store

### Rough Complexity Estimate
- **Core A2A protocol layer:** 1-2 days (agent card + JSON-RPC endpoints)
- **Agent wrapper for existing graphs:** 1-2 days per graph
- **Agent discovery + registry:** 1 day
- **Multi-agent orchestration layer:** 2-3 days
- **Frontend A2A client integration:** 2-3 days

**Total: ~1-2 weeks for a working A2A-native version**

---

## 9. KEY FILES MAP

| File | Purpose |
|------|---------|
| `open_notebook/domain/notebook.py` | Core domain models (Notebook, Source, Note, ChatSession) |
| `open_notebook/domain/base.py` | ObjectModel base class (CRUD to SurrealDB) |
| `open_notebook/domain/credential.py` | API key storage with encryption |
| `open_notebook/graphs/ask.py` | Multi-step research graph (strategy → parallel search → answer) |
| `open_notebook/graphs/chat.py` | Simple chat graph with SQLite checkpointing |
| `open_notebook/graphs/source_chat.py` | Source-scoped chat graph |
| `open_notebook/ai/provision.py` | Model provisioning via Esperanto |
| `open_notebook/ai/key_provider.py` | DB-first API key resolution |
| `open_notebook/ai/models.py` | Model registry and manager |
| `open_notebook/config.py` | File paths, folders, checkpoint locations |
| `open_notebook/database/repository.py` | SurrealDB connection and CRUD helpers |
| `api/main.py` | FastAPI app, routers, error handlers |
| `api/routers/` | 20+ route modules (notebooks, sources, chat, etc.) |
| `frontend/src/lib/types/api.ts` | All frontend data types |
| `pyproject.toml` | Dependencies, Python 3.11-3.12, version 1.9.0 |

---

*Scan completed 2026-06-07. This is a 80/20 overview — covers the architecture, data model, and A2A readiness of the open-notebook project.*
