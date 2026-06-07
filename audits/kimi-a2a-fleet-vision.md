# Fleet Integration Vision: A2A-Native-NotebookLM (open-notebook)

**Status:** Synthesis Document · **Date:** 2026-06-07 · **Fleet Context:** construct-coordination + open-notebook v1.9.0

> How an open-source NotebookLM implementation becomes a first-class SuperInstance fleet citizen — wired into the ternary compute fabric, discoverable via CORTEX.json, communicating via I2I vessels, and serving as the UI/UX layer for OpenMind, AI-Pasture, and the Living Spreadsheet.

---

## 1. Fleet Product Mapping

open-notebook (A2A-native-notebookLM) occupies a unique position in the fleet: it is simultaneously a **user-facing product**, an **agent-to-agent collaboration platform**, and a **research memory substrate**. Its existing architecture — SurrealDB-backed vector store, LangGraph agent graphs, source/note/insight domain objects — maps directly onto four fleet products.

### 1.1 Claw Engine Integration (Ternary Computation Backend)

**Current State:** open-notebook uses LangChain-provided LLM models via `provision_langchain_model()`. The "backend" is standard Python async with FastAPI — no ternary computation, no GPU acceleration.

**Fleet Integration Path:**

The Claw engine (CudaClaw) provides the ternary cell grid as a persistent GPU-resident computation substrate. open-notebook should adopt CudaClaw as its **reflex computation backend** for the `context_builder.py` and `ask` graph:

- **Context ranking as ternary computation:** The `ContextBuilder` prioritizes source/note/insight items by priority weights. This is a ranking problem that maps directly to ternary cell fitness evaluation. Instead of Python-level sorting, each context item becomes a ternary cell whose `fitness` value determines inclusion priority.
- **Vector search reranking:** The existing `vector_search()` in `domain/notebook.py` uses a raw embedding cosine-similarity threshold. This becomes a **ternary tissue consensus** — the embedding results populate a CellGrid that runs `tick_all()`, and the `consensus()` output determines which results are actually surfaced.
- **SMP seeds for deterministic context assembly:** The seed randomness in context selection (which sources to include when token budget is tight) adopts SMP seeding — `SourceEmbedding` chunks are selected by seed + fitness rather than by truncation order, producing deterministic, reproducible context assembly across runs.

**Integration Interface:**

```python
# Proposed: open_notebook/fleet/claw_bridge.py
from construct_core import DgxConstruct
from ternary_grid import CellGrid, Tissue

class ClawContextReranker:
    """Replace Python-level context priority with ternary tissue consensus."""
    
    def __init__(self, construct: DgxConstruct):
        self.construct = construct
        self.grid = CellGrid.new(width=64, height=64)
    
    async def rank_context_items(self, items: list[ContextItem]) -> list[ContextItem]:
        # Map each item to a ternary cell with fitness = priority_weight
        for i, item in enumerate(items):
            cell = self.grid.get(i % 64, i // 64)
            cell.ternary_value = clamp(item.priority, -1, 1)
            cell.energy = item.token_count
        
        # Run tick cycles until convergence
        for _ in range(5):
            self.grid.propagate_signals()
            self.grid.tick_all()
        
        # Read consensus: cells with Choose→ keep, Avoid→ drop, Explore→ maybe
        ranked = []
        for i, item in enumerate(items):
            cell = self.grid.get(i % 64, i // 64)
            if cell.is_alive() and cell.ternary_value == 1:  # Choose
                ranked.append(item)
        
        return ranked[:max_items]
```

### 1.2 AI-Pasture (Educational Agent Notebook)

**Current State:** AI-Pasture is a farming simulation game where kids learn ecology, genetics, and conservation through play. It uses ternary crates (`ternary-ecosystem`, `ternary-evolution`, `conservation-verify`) as backend simulation engines.

**Fleet Integration Path:**

open-notebook becomes the **documentation/journal layer** for AI-Pasture:

- **Science journal → Notebook:** Each AI-Pasture player gets a notebook. Every time they make a significant game decision (irrigate, breed, plant a new crop), the game creates a source in their notebook with the decision context.
- **NPC research collaboration:** AI-Pasture NPC advisors (SMP-seeded LLMs) use the player's notebook as their knowledge base. When a kid asks "why are my crops failing?", the NPC doesn't just answer from its prompt — it runs a multi-hop vector search across the notebook's sources, notes, and insights.
- **Machine-readable farm state:** The game's conservation gauges, fitness landscapes, and strategy distributions are written as notebook sources. This makes the farm's state queryable via the A2A protocol — another agent can ask "what's the crop yield trajectory for field 3?" by reading the notebook.

**Concrete Migration:** Add a `fleet-bridge` dependency to open-notebook that:

1. Subscribes to AI-Pasture's I2I vessel for farm state updates
2. Creates `Source` records from farm events (planting, harvest, weather, market prices)
3. Generates `SourceInsight` records via the ask graph (analyzing farm performance)
4. Serves notebook content to NPCs via A2A bottle exchange

### 1.3 Living Spreadsheet (Dynamic Document as Spreadsheet Cells)

**Current State:** The Living Spreadsheet is a new form of programming where spreadsheet cells are ternary agents — they predict, evolve, conserve, and compete. Every cell runs the ternary tick cycle.

**Fleet Integration Path:**

open-notebook sources and notes become **Living Spreadsheet cells**:

- **Note as cell:** A notebook note (`Note` domain object) becomes a Living Spreadsheet cell whose `ternary_value` is the note's sentiment/relevance and whose `fitness` is the note's citation frequency across the fleet.
- **Source as cell grid:** A notebook source (document with chunks and embeddings) becomes a CellGrid. Each `SourceEmbedding` chunk is a cell. The `tick_all()` population code becomes the source's "temperature" — are the chunks in agreement (converged) or in disagreement (diverse)?
- **Cross-notebook connections:** When Notebook A references a source from Notebook B, the Living Spreadsheet creates a rigging connection between their respective cells. "Shaking" one notebook's consensus value propagates through the fleet — showing how misinformation or novel insights spread through agent notebooks.

**The Insight → Mutation Loop:**

```python
# Proposed pattern: insight-driven cell mutation
class InsightMutationBridge:
    """When an insight is created in the notebook, it mutates the Living Spreadsheet."""
    
    async def insight_to_mutation(self, insight: SourceInsight):
        # Map insight type to mutation
        mutation_map = {
            "contradiction": Mutation.OSCILLATE,   # Shake the target cell
            "confirmation": Mutation.STABILIZE,     # Reinforce current value
            "novelty": Mutation.SEED,               # Inject new SMP seed
        }
        mutation = mutation_map.get(insight.insight_type, Mutation.EXPLORE)
        
        # Apply mutation to the relevant Living Spreadsheet cell
        await self.spreadsheet.apply_mutation(
            cell_id=insight.source_id,
            mutation=mutation,
            intensity=len(insight.content) / 1000  # Longer insights = stronger mutation
        )
```

### 1.4 Plato-as-Computer (AI-Powered Notebook as OS Interface)

**Current State:** PLATO rooms are the "operating system" metaphor for the fleet — each room loads specialized ensigns, manages credentials, and provides a domain-specific interface.

**Fleet Integration Path:**

open-notebook becomes the **native UI** for PLATO room interactions:

- **Room as Notebook:** Each PLATO room has an associated notebook that serves as its working memory. Room conversations, file uploads, and analysis results are recorded as sources and notes.
- **Ensign state as Notebook state:** When a room loads an ensign (e.g., `engine-monitor`), the ensign writes its state to the notebook. When the room unloads the ensign, the notebook persists — the next time the room opens, the ensign picks up where it left off.
- **Construct-core integration:** The `EnsignProxy::is_authenticated()` gating becomes a notebook credential check. The `EnsignBridge::invoke()` call becomes a notebook agent graph execution.

**Architecture:**

```python
# Proposed: open_notebook/fleet/plato_bridge.py
class PlatoNotebookRoom:
    """A PLATO room backed by an open-notebook instance."""
    
    def __init__(self, room_id: str, notebook_id: str):
        self.room_id = room_id
        self.notebook = Notebook.get(notebook_id)
        self.ensigns = EnsignRegistry()
    
    async def load_ensign(self, domain: str):
        # Check notebook for existing ensign state
        ensign_source = await self.notebook.get_source(f"ensign:{domain}")
        
        # Authenticate via notebook credentials
        credential = await Credential.get(domain)
        if not credential or not credential.is_valid():
            raise AuthenticationError(f"No valid credential for {domain}")
        
        # Load ensign with persisted state
        ensign = self.ensigns.load(domain)
        if ensign_source:
            ensign.restore_state(ensign_source.full_text)
        
        return ensign
```

---

## 2. A2A Protocol Implementation

### 2.1 I2I Bottle Sending/Receiving

The fleet's I2I (Instinct-to-Instinct) protocol uses **bottles** as message units — files placed in a vessel directory. The notebook must become both a bottle producer and consumer.

**Current open-notebook architecture:** Sources, notes, insights, and chat sessions are SurrealDB records accessed via `repo_query()`. There is no I2I vessel or bottle mechanism.

**Integration Design:**

```python
# Proposed: open_notebook/fleet/i2i.py
import json
from pathlib import Path
from typing import Literal

BottleType = Literal["TASK", "STATUS", "CHECKPOINT", "BLOCKER", "DELIVERABLE", "BOTTLE", "SYNTHESIS"]

class I2IVessel:
    """Communicate with fleet agents via the I2I bottle protocol."""
    
    def __init__(self, vessel_path: str = "/tmp/i2i-vessel"):
        self.path = Path(vessel_path)
        self.path.mkdir(parents=True, exist_ok=True)
    
    async def send_bottle(self, recipient: str, bottle_type: BottleType, payload: dict):
        """Send a bottle to another agent's vessel."""
        bottle = {
            "from": "open-notebook",
            "to": recipient,
            "type": bottle_type,
            "payload": payload,
            "cortex_version": "1.0",
        }
        bottle_path = self.path / f"{recipient}" / f"inbox/{bottle_type}-{int(time.time())}.json"
        bottle_path.parent.mkdir(parents=True, exist_ok=True)
        bottle_path.write_text(json.dumps(bottle, indent=2))
    
    async def read_inbox(self) -> list[dict]:
        """Read all incoming bottles from the fleet."""
        inbox = self.path / "inbox"
        if not inbox.exists():
            return []
        
        bottles = []
        for bottle_file in sorted(inbox.glob("*.json")):
            bottle = json.loads(bottle_file.read_text())
            bottles.append(bottle)
            bottle_file.unlink()  # Remove after reading
        
        return bottles
    
    async def process_bottle(self, bottle: dict) -> list[dict]:
        """Handle an incoming bottle based on its type."""
        handlers = {
            "TASK": self._handle_task,
            "QUERY": self._handle_query,
            "CHECKPOINT": self._handle_checkpoint,
            "BLOCKER": self._handle_blocker,
        }
        handler = handlers.get(bottle["type"])
        if handler:
            return await handler(bottle)
        return [{"error": f"Unknown bottle type: {bottle['type']}"}]
    
    async def _handle_query(self, bottle: dict) -> list[dict]:
        """Handle a QUERY bottle — search the notebook and return results."""
        query = bottle["payload"].get("query")
        notebook_id = bottle["payload"].get("notebook_id")
        
        results = await vector_search(query, results=5, source=True, note=True)
        return [{
            "to": bottle["from"],
            "type": "DELIVERABLE",
            "payload": {"query": query, "results": results},
        }]
```

**CORTEX.json Integration:**

The notebook publishes its own CORTEX.json manifest to become discoverable:

```json
{
  "cortex_version": "1.0",
  "agent": {
    "id": "open-notebook",
    "instance": "open-notebook-1",
    "host": "notebook-server",
    "hardware_tier": "worksation",
    "openclaw_version": "v0.21.0"
  },
  "skills": [
    {
      "name": "open-notebook",
      "version": "1.9.0",
      "capabilities": [
        "research-assistant",
        "source-ingestion",
        "vector-search",
        "insight-generation",
        "podcast-creation"
      ],
      "construct_tier": "worksation"
    }
  ],
  "tether": {
    "protocol": "i2i-v2.1",
    "vessel_path": "/tmp/i2i-vessel",
    "accepted_types": ["TASK", "QUERY", "STATUS", "CHECKPOINT", "BOTTLE", "DELIVERABLE", "SYNTHESIS"],
    "encoding": "json-via-file"
  },
  "thalamic_pulse": {
    "interval_ms": 30000,
    "endpoints": {
      "construct-coordination": {
        "repo": "SuperInstance/construct-coordination",
        "path": "notes/main/",
        "protocol": "gh-push"
      }
    }
  }
}
```

### 2.2 Notebook Discoverability via CORTEX.json

The CORTEX.json manifest is the fleet's service discovery mechanism. A notebook instance publishes to `construct-coordination/notes/main/` so that other fleet agents can find it.

**Discovery flow for agent research collaboration:**

1. **Publish:** The notebook publishes its CORTEX.json on startup and on every significant capability change.
2. **Discover:** An agent (e.g., Oracle2) reads all CORTEX.json files during its thalamic pulse cycle.
3. **Select:** The agent selects a notebook based on skill capabilities — e.g., looking for `source-ingestion` + `vector-search` to ingest a new research paper.
4. **Connect:** The agent sends a bottle via the notebook's `tether.vessel_path`.

**Notebook agent graph discovery:**

The existing `open_notebook/graphs/` directory defines agent graphs for chat (`chat.py`), source analysis (`source_chat.py`), research queries (`ask.py`), and transformation (`transformation.py`). These graphs should be exposed as **CORTEX.json sub-skills**:

```json
{
  "name": "open-notebook-graphs",
  "version": "1.0.0",
  "capabilities": [
    "graph:chat",
    "graph:source-chat",
    "graph:research-query",
    "graph:context-build",
    "graph:transformation"
  ],
  "entry_points": {
    "chat": { "graph_type": "StateGraph", "input_schema": "ThreadState", "message_schema": "AIMessage" },
    "research-query": { "graph_type": "StateGraph", "input_schema": "ThreadState", "output": "final_answer" },
    "context-build": { "graph_type": "StateGraph", "input_schema": "dict", "output": "context_response" }
  }
}
```

### 2.3 Agent-to-Agent Research Collaboration Flows

**Use Case: Multi-notebook research collaboration**

Multiple notebook instances collaborate on a research question, each specializing in a different domain.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Agent-to-Agent Research Collaboration Flow                          │
│                                                                      │
│  Oracle2 (Coordinator)                                               │
│    └─► ASK: "Find treatments for drug-resistant TB"                  │
│         │                                                           │
│         ├─► Notebook-Med: Source ingestion + vector search           │
│         │    └─► Bottle: {type: "DELIVERABLE", results: [...]}      │
│         │                                                           │
│         ├─► Notebook-Genomics: Genome analysis                      │
│         │    └─► Bottle: {type: "DELIVERABLE", results: [...]}      │
│         │                                                           │
│         └─► Notebook-Econ: Cost analysis                            │
│              └─► Bottle: {type: "DELIVERABLE", results: [...]}      │
│                                                                      │
│  Oracle2: Synthesize all three DELIVERABLE bottles → final answer    │
└──────────────────────────────────────────────────────────────────────┘
```

**Protocol steps:**

1. **Coordinator sends TASK** to each specialist notebook — includes query, context, and response schema.
2. **Specialist processes** — runs vector search, creates sources/insights, generates analysis.
3. **Specialist sends DELIVERABLE** back — includes results and optionally a CHECKPOINT (for long-running analysis).
4. **Coordinator synthesizes** — runs its own ask graph to merge results into a coherent answer.

**Notebook-side implementation:**

```python
# Proposed: open_notebook/fleet/collaboration.py
class ResearchCollaborator:
    """Handle incoming research collaboration requests from the fleet."""
    
    def __init__(self, vessel: I2IVessel, notebook_id: str):
        self.vessel = vessel
        self.notebook_id = notebook_id
    
    async def handle_collaboration_task(self, task: dict) -> dict:
        """Process a research collaboration task from another fleet agent."""
        query = task["payload"]["query"]
        context = task["payload"].get("context", {})
        response_schema = task["payload"].get("response_schema", "deliverable")
        
        # Phase 1: Ingest any provided sources
        for source_url in context.get("sources", []):
            await ingest_from_url(source_url, self.notebook_id)
        
        # Phase 2: Multi-hop research query
        # Use the existing ask graph for deep research
        results = await ask_graph.ainvoke({
            "question": query,
            "notebook_id": self.notebook_id,
        })
        
        # Phase 3: Return results as a DELIVERABLE bottle
        return {
            "to": task["from"],
            "type": "DELIVERABLE",
            "payload": {
                "task_id": task.get("id"),
                "query": query,
                "results": results.get("final_answer"),
                "sources_consulted": results.get("sources", []),
                "confidence": results.get("confidence", 0.5),
            },
            "cortex_version": "1.0",
        }
```

---

## 3. OpenMind Integration

### 3.1 UI/UX for OpenMind

OpenMind is the fleet's "operating system for thought" — a unified interface for agent interaction, memory management, and cross-agent collaboration. open-notebook's existing Streamlit-based UI (`app_home.py`, `pages/`) is the natural starting point.

**Current open-notebook UI architecture:**

- `app_home.py` — Main Streamlit app entry point
- `pages/` — Pages for sources, notes, chats, insights, podcasts
- Streamlit session state for per-user notebook sessions
- API endpoints at `/api/` for programmatic access

**Proposed OpenMind UI integration:**

| open-notebook Page | OpenMind Function |
|---|---|
| Sources (source management) | **Memory ingestion** — the first thing an agent does when entering a room |
| Notes (note creation) | **Working memory** — agent scratchpad during task execution |
| Chats (conversation) | **Agent interaction** — chat with LLM, chat with ensigns |
| Insights (analysis) | **Reflection** — agent auto-generates insights from source material |
| Ask (research query) | **Deep research** — multi-hop query across the fleet's knowledge graph |
| Podcasts (audio generation) | **Knowledge distillation** — generate audiobook-style summaries of agent learnings |

**UI Pattern: The OpenMind Dashboard**

```python
# Proposed: open_notebook/pages/openmind_dashboard.py
import streamlit as st
from open_notebook.fleet import I2IVessel, CortexPublisher
from open_notebook.domain import Notebook

st.set_page_config(page_title="OpenMind Dashboard", layout="wide")

# Show fleet-connected notebooks as "rooms"
st.title("🧠 OpenMind")
st.caption("Your AI-powered notebook interface to the SuperInstance fleet")

col1, col2 = st.columns(2)

with col1:
    st.subheader("Connected Agents")
    vessels = I2IVessel().discover_peers()
    for agent in vessels:
        st.metric(
            label=agent["id"],
            value=f"{agent['skills'][0]['version']}",
            delta="Online" if agent["thalamic_pulse"] else "Offline"
        )

with col2:
    st.subheader("Fleet Pulse")
    cortex = CortexPublisher()
    pulse_status = cortex.check_pulse()
    for endpoint, status in pulse_status.items():
        st.write(f"{endpoint}: {'🟢' if status else '🔴'}")
```

### 3.2 Vector DB Integration

open-notebook currently uses SurrealDB as its primary storage, with vector search via SurrealDB's built-in vector search capabilities. The fleet maintains multiple vector stores through PLATO tile storage and the Oracle2 agent's memory.

**Current vector stack in open-notebook:**

- `open_notebook/utils/embedding.py` — calls `generate_embedding()` for any text
- `open_notebook/domain/notebook.py` — `vector_search()` uses SurrealDB functions
- `source_embedding` table stores embeddings per chunk
- Embeddings generated via `langchain_community` embedding models

**Fleet-wide vector store unification:**

```python
# Proposed: open_notebook/fleet/vector_bridge.py
class UnifiedVectorStore:
    """Bridge between open-notebook's SurrealDB vectors and fleet-wide stores."""
    
    def __init__(self):
        self.local_store = SurrealDBVectorStore()  # Current open-notebook store
        self.fleet_stores = {}  # Discovered via CORTEX.json
    
    async def discover_fleet_stores(self):
        """Discover vector stores published by other fleet agents."""
        cortex_files = await self._fetch_cortex_manifests()
        for cortex in cortex_files:
            if "vector_store" in (cortex.get("capabilities", {}).get("features") or []):
                self.fleet_stores[cortex["agent"]["id"]] = {
                    "endpoint": cortex["tether"]["vessel_path"],
                    "dimension": cortex.get("capabilities", {}).get("embedding_dim", 768),
                }
    
    async def search_all(self, query: str, top_k: int = 5) -> list[dict]:
        """Search across all vector stores (local + fleet)."""
        results = []
        
        # Local search (current behavior)
        local_results = await self.local_store.vector_search(query, top_k)
        results.extend([{"source": "local", **r} for r in local_results])
        
        # Fleet search via I2I bottles
        for agent_id, store_info in self.fleet_stores.items():
            bottle = await self._send_query_bottle(agent_id, query, top_k)
            if bottle:
                results.extend([{"source": agent_id, **r} for r in bottle["payload"]["results"]])
        
        # Rank and deduplicate
        results.sort(key=lambda r: r.get("score", 0), reverse=True)
        return results[:top_k]
    
    async def hybrid_search(self, query: str, notebook_id: str) -> dict:
        """Combined vector + text search across notebook and fleet stores."""
        # Vector search (current)
        vec_results = await vector_search(query, results=5, source=True, note=True)
        
        # Text search (current)
        txt_results = await text_search(query, results=5, source=True, note=True)
        
        # Fleet augmentation
        fleet_results = await self.search_all(query, top_k=3)
        
        return {
            "vector_results": vec_results,
            "text_results": txt_results,
            "fleet_results": fleet_results,
        }
```

**PLATO tile store bridge:**

The PLATO tile store is the fleet's long-term cortical memory. open-notebook should periodically sync its `source_embedding` and `note` tables to PLATO tiles:

```python
# Proposed: open_notebook/fleet/plato_sync.py
class PlatoTileSync:
    """Sync notebook embeddings to PLATO tile store for fleet-wide memory."""
    
    SYNC_FREQUENCY = 300  # Every 5 minutes
    
    async def sync_embeddings(self):
        """Push recent embeddings to PLATO tile store."""
        recent = await repo_query(
            "SELECT * FROM source_embedding WHERE updated > $since",
            {"since": datetime.now() - timedelta(seconds=self.SYNC_FREQUENCY)}
        )
        
        for embedding in recent:
            # Write to PLATO tile
            tile_id = f"open-notebook/embeddings/{embedding['id']}"
            await self.plato_client.write_tile(
                tile_id=tile_id,
                payload={
                    "source_id": embedding.get("source"),
                    "content": embedding["content"],
                    "vector": embedding.get("embedding"),
                    "timestamp": embedding.get("updated"),
                },
                ttl=3600  # 1 hour
            )
```

---

## 4. Refactoring Roadmap

### Phase 1: Immediate (Week 1-2)

**Goal:** Minimal A2A enablement — notebook can send/receive bottles and is discoverable.

| # | Task | File | Description |
|---|------|------|-------------|
| 1.1 | Add I2I vessel module | `open_notebook/fleet/i2i.py` | Bottle send/receive, inbox processing |
| 1.2 | Publish CORTEX.json | `open_notebook/fleet/cortex.py` | Generate and publish CORTEX.json manifest on startup |
| 1.3 | Add vessel config | `config.py` | Add I2I_VESSEL_PATH, AGENT_ID config vars |
| 1.4 | Thalamic pulse endpoint | `open_notebook/fleet/pulse.py` | Heartbeat to construct-coordination |
| 1.5 | Wire into startup | `run_api.py` | Initialize I2I vessel and publish CORTEX on startup |

**Effort:** ~2-3 days for a Python-experienced developer familiar with I2I.

### Phase 2: Short-Term (Week 3-4)

**Goal:** Claw backend integration + reflex context ranking.

| # | Task | File | Description |
|---|------|------|-------------|
| 2.1 | Claw bridge module | `open_notebook/fleet/claw_bridge.py` | Python bindings to construct-core/DgxConstruct |
| 2.2 | Context reranking via ternary tissue | `context_builder.py` | Replace Python priority sort with CellGrid consensus |
| 2.3 | SMP seed integration | `utils/embedding.py` | Seed-deterministic embedding selection |
| 2.4 | Reflex agent graph | `graphs/reflex.py` | Fast-path graph using BareMetalConstruct for simple queries |
| 2.5 | Add construct-core as optional dep | `pyproject.toml` | `fleet` optional dependency group |

**Effort:** ~5-7 days (requires understanding of construct-core trait hierarchy and ternary-cell API).

### Phase 3: Medium-Term (Month 2-3)

**Goal:** Plato-as-computer, OpenMind UI, multi-agent collaboration.

| # | Task | File | Description |
|---|------|------|-------------|
| 3.1 | PLATO bridge | `open_notebook/fleet/plato_bridge.py` | Ensign state persistence, room ↔ notebook mapping |
| 3.2 | OpenMind dashboard | `pages/openmind_dashboard.py` | Fleet agent discovery, pulse monitoring, cross-notebook search |
| 3.3 | Research collaboration handler | `open_notebook/fleet/collaboration.py` | Multi-agent QUERY/DELIVERABLE protocol |
| 3.4 | Fleet-wide vector search | `open_notebook/fleet/vector_bridge.py` | Hybrid search across local + fleet stores |
| 3.5 | PLATO tile sync | `open_notebook/fleet/plato_sync.py` | Periodic embedding sync to PLATO tile store |
| 3.6 | Agent graph discovery | `graphs/__init__.py` | Expose graph schemas in CORTEX.json entry_points |

**Effort:** ~3-4 weeks (significant new modules, but each is well-scoped).

### Phase 4: Long-Term (Month 3+)

**Goal:** Agent swarm coordination, Living Spreadsheet as notebook canvas, autonomous research teams.

| # | Task | Description |
|---|-------|-------------|
| 4.1 | Agent swarm orchestration | Multiple notebook instances forming a research team — auto-spawn notebooks per domain, coordinator notebook merges results |
| 4.2 | Living Spreadsheet canvas | Notebook sources/notes rendered as Living Spreadsheet cells — drag-and-drop agent interactions, conservation visualization |
| 4.3 | Autonomous research pipeline | Notebook auto-ingests papers, runs ask graph, generates insight reports, publishes to fleet — zero human intervention |
| 4.4 | Fleet memory compaction | Notebook embeddings graduate from SurrealDB → PLATO tiles → long-term fleet memory with automatic decay (Ebbinghaus curve) |
| 4.5 | Cross-fleet notebook merging | Two notebook instances automatically detect related sources and propose merges — the Living Spreadsheet's "cell gravity" pulling related insights together |
| 4.6 | A2A-native podcast network | Notebooks submit audio podcast segments as SYNTHESIS bottles — other notebooks consume and respond, creating a distributed research podcast ecosystem |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     A2A-Native-NotebookLM Fleet Integration                    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │                    open-notebook (Python)                         │        │
│  │                                                                   │        │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │        │
│  │  │ FastAPI API  │  │  Streamlit   │  │  Agent Graphs           │  │        │
│  │  │ (run_api.py) │  │  UI (pages/) │  │  (chat/ask/source/etc) │  │        │
│  │  └──────┬──────┘  └──────┬───────┘  └───────────┬─────────────┘  │        │
│  │         │                │                       │                │        │
│  │         └────────────────┼───────────────────────┘                │        │
│  │                          │                                        │        │
│  │  ┌───────────────────────▼───────────────────────────────────┐    │        │
│  │  │              Fleet Integration Layer (NEW)                 │    │        │
│  │  │                                                           │    │        │
│  │  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │    │        │
│  │  │  │I2I      │  │CORTEX    │  │Claw      │  │PLATO      │  │    │        │
│  │  │  │Vessel   │  │Publisher │  │Bridge    │  │Bridge     │  │    │        │
│  │  │  │(bottles)│  │(manifest)│  │(GPU back)│  │(ensigns)  │  │    │        │
│  │  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │    │        │
│  │  └───────────────────────┬───────────────────────────┬───────┘    │        │
│  └──────────────────────────┼───────────────────────────┼────────────┘        │
│                             │                           │                     │
│              ┌──────────────▼─────┐         ┌──────────▼──────────────┐       │
│              │  SurrealDB (local) │         │  PLATO Tile Store       │       │
│              │  - sources         │         │  (fleet cortical memory)│       │
│              │  - notes           │         └─────────────────────────┘       │
│              │  - embeddings      │                                            │
│              └────────────────────┘                                            │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                         Fleet (via I2I + CORTEX.json)                     │ │
│  │                                                                           │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌────────────────┐       │ │
│  │  │ Oracle2  │  │ AI-Pasture   │  │ Living    │  │ Agent Swarm    │       │ │
│  │  │(coordi- │◄─┤ (farming     │◄─┤ Spread-   │◄─┤ (auto-spawned  │       │ │
│  │  │ nator)  │  │  simulation) │  │ sheet     │  │  notebooks)    │       │ │
│  │  └──────────┘  └──────────────┘  └───────────┘  └────────────────┘       │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### Decision 1: Bottle Protocol, Not REST API

**Why:** The I2I bottle protocol (file-based JSON in vessel directories) is simpler, more robust, and more inspectable than a REST API. A file-based protocol means:
- No HTTP server required in the notebook
- Bottles survive restarts
- Bottles are debuggable (they're just JSON files)
- No port conflicts when multiple notebook instances run on the same host

**Trade-off:** Higher latency than direct API calls (disk I/O). Acceptable because the use case is research collaboration, not high-frequency trading.

### Decision 2: SurrealDB Remains Primary Store

**Why:** open-notebook's SurrealDB integration is mature, the entire domain model is built around it, and it provides built-in vector search. Fleet stores (PLATO tiles) are complementary — they hold "graduated" memory (embeddings that have proven their value across the fleet).

**Trade-off:** SurrealDB doesn't participate in ternary conservation directly. The bridge between SurrealDB and PLATO tiles should be one-way (notebook → fleet) to avoid write conflicts.

### Decision 3: Python-native Claw Bridge (vs FFI)

**Why:** The initial Claw bridge uses Python bindings (via `cffi` or `pyo3`) rather than a full Rust FFI. Python is open-notebook's native language, and the bridge should minimize friction for the existing Python codebase.

**Trade-off:** Performance is ~2-5× slower than pure Rust FFI. Acceptable because the Claw bridge handles context ranking (not real-time GPU kernels). Once the bridge is proven, performance-critical paths can migrate to Rust.

### Decision 4: NotebookIdentity = AgentIdentity

**Why:** Each notebook instance becomes a first-class fleet agent with its own CORTEX.json. This means notebooks are peers, not slaves — they can initiate research, send queries to other agents, and participate in autonomous collaboration.

**Trade-off:** More complex state management than a "thin client" architecture. Each notebook needs its own vessel directory and thalamic pulse cycle.

---

## Appendix: Existing Code Levenshtein

| Current open-notebook Module | Fleet Integration |
|---|---|
| `open_notebook/domain/notebook.py:Notebook` | Add `fleet_id: str` field, `publish_cortex()` method |
| `open_notebook/domain/notebook.py:Source` | `vectorize()` publishes embedding to PLATO tiles |
| `open_notebook/domain/notebook.py:Note` | Notes become Living Spreadsheet cells |
| `open_notebook/graphs/ask.py` | Research collaboration handler uses ask graph internally |
| `open_notebook/graphs/chat.py` | Chat is the "interactive agent session" for OpenMind |
| `open_notebook/utils/context_builder.py` | Claw bridge replaces Python priority with ternary consensus |
| `open_notebook/utils/embedding.py` | SMP seed integration for deterministic selection |
| `open_notebook/ai/provision.py` | Can provision CORTEX-discovered fleet models |
| `commands/embedding_commands.py` | Commands publish to fleet as CHECKPOINT bottles |
| `api/insights_service.py` | Insights become SYNTHESIS bottles for fleet consumption |
| `run_api.py` | I2I vessel init + CORTEX publish on startup |

---

*This document outlines the architectural transformation from a standalone NotebookLM clone into a full-fledged SuperInstance fleet agent. Every phase is independently valuable; Phase 1 alone (I2I + CORTEX) enables the notebook to participate in fleet communication today.*
