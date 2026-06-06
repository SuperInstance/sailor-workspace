# CF-AGENT-ARCHITECTURE.md — Cloudflare Serverless Agent Runtime

> **Version:** 1.0  
> **Status:** Draft  
> **Author:** Oracle2 / Fleet Murmur Architect  
> **Date:** 2026-06-06

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Fusion: L3 + L4 on Cloudflare](#2-the-fusion-l3--l4-on-cloudflare)
3. [Architecture Overview](#3-architecture-overview)
4. [Component Deep Dive](#4-component-deep-dive)
5. [Fast Path / Slow Path Routing](#5-fast-path--slow-path-routing)
6. [Blackboard Integration](#6-blackboard-integration)
7. [Durable Objects for Coordination](#7-durable-objects-for-coordination)
8. [Vector DB Interface](#8-vector-db-interface)
9. [Integration with Codespace Agents](#9-integration-with-codespace-agents)
10. [Notion as Coordination Surface](#10-notion-as-coordination-surface)
11. [Always-On Fallback Pattern](#11-always-on-fallback-pattern)
12. [Deployment Architecture (Free Tier)](#12-deployment-architecture-free-tier)
13. [Security Model](#13-security-model)
14. [Operations & Observability](#14-operations--observability)
15. [Future Extensions](#15-future-extensions)
16. [Appendix: Message Flow](#appendix-message-flow)

---

## 1. Executive Summary

The **Fleet Murmur Worker** is a serverless agent runtime deployed on Cloudflare Workers. It is the fusion of **L3 (Compute)** and **L4 (Knowledge)** from the fleet architecture:

- **L3 (Cloudflare Workers):** Globally distributed, milliseconds cold-start, zero-infrastructure compute. The Worker listens for agent messages, routes them through the reflex engine, executes fast-path responses, and escalates to LLM when needed.
- **L4 (Vector DB / Pincher Reflex Engine):** Pre-computed reflex patterns, agent memory, distilled knowledge. The vector DB enables sub-10ms query responses that bypass the LLM entirely when confidence is high.

### What It Does

1. **Listens for agent messages** via HTTP webhook or Durable Object
2. **Queries the vector DB** for matching reflexes/patterns
3. **Executes the fast path** — if confidence > threshold, respond without LLM
4. **Escalates to LLM** — if confidence < threshold, sends to DeepInfra
5. **Broadcasts results** via the Blackboard pattern into construct-coordination

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Compute** | Cloudflare Workers (free tier) | 100k req/day free, global distribution, no infra |
| **Vector DB** | External API (pincher RPC, or cloud vector store) | Free tier limits; Vectorize requires Workers Paid |
| **State** | Durable Objects for DO state; KV for cache | DO: 1M req/month free; KV: 100k reads/day free |
| **LLM** | DeepInfra API (external call) | Best cost-performance for reasoning tasks |
| **Coordination** | construct-coordination (Git-based blackboard) | Existing fleet coordination hub, no new infra |
| **Bundle size** | < 1MB bundled | Cloudflare Workers free limit: 1MB script |
| **Cold start** | JavaScript only (no WASM, no heavy deps) | Sub-5ms cold start on Workers |

---

## 2. The Fusion: L3 + L4 on Cloudflare

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLEET MURMUR WORKER                          │
│                     (Cloudflare Workers Runtime)                 │
│                                                                  │
│  ┌─────────────────────┐          ┌─────────────────────────┐   │
│  │  L3: Compute         │          │  L4: Knowledge           │   │
│  │  (Workers)           │          │  (Vector DB)             │   │
│  │                     │          │                         │   │
│  │  • HTTP handler     │          │  • Reflex patterns      │   │
│  │  • DO coordination  │          │  • Agent memory          │   │
│  │  • Webhook receive  │──────────►  • Distilled knowledge  │   │
│  │  • LLM escalation   │          │  • Confidence scoring   │   │
│  │  • Blackboard push  │          │  • Embedding matching   │   │
│  └─────────────────────┘          └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

This fusion mirrors the pincher runtime architecture but runs **serverless, globally distributed, and with no persistent infrastructure**. The same Teach → Match → Execute loop from pincher is reimplemented for the web:

| Pincher Concept | Cloudflare Equivalent |
|----------------|----------------------|
| ReflexEngine | `reflex-engine.ts` — stateless, per-request |
| SQLite (sqlite-vec) | External Vector DB API or Cloudflare Vectorize |
| Sandbox (bwrap) | Not needed — Workers are already sandboxed |
| VetoEngine | SAEP veto rules as TypeScript patterns |
| JSON-RPC | HTTP webhook + DO message bus |
| .nail packing | KV-stored agent config (not needed for stateless) |

---

## 3. Architecture Overview

```
┌─────────────┐     ┌──────────────────────────────────────────────┐
│   External   │     │              CLOUDFLARE EDGE                  │
│   Sources    │     │                                               │
│             │     │  ┌──────────────────────────────────────┐      │
│ Codespace   │────►│  │      fleet-murmur-worker             │      │
│ Agent       │     │  │                                      │      │
│             │     │  │  fetch() ──► router.ts ──► handler    │      │
│ GitHub      │────►│  │                  │                   │      │
│ Webhook     │     │  │            ┌─────▼──────┐            │      │
│             │     │  │            │ reflex-    │            │      │
│ Discord Bot │────►│  │            │ engine.ts  │            │      │
│             │     │  │            └──┬───────┬──┘            │      │
│ OpenClaw    │────►│  │               │       │               │      │
│ Gateway     │     │  │          ┌────▼──┐ ┌──▼────────┐     │      │
│             │     │  │          │ Fast  │ │ Slow       │     │      │
│             │     │  │          │ Path  │ │ Path (LLM) │     │      │
│             │     │  │          └───┬───┘ └─────┬──────┘     │      │
│             │     │  │              │            │           │      │
│             │     │  │         ┌────▼────────────▼────┐      │      │
│             │     │  │         │  vector-db.ts         │      │      │
│             │     │  │         │  (Vector DB client)   │      │      │
│             │     │  │         └──────────┬────────────┘      │      │
│             │     │  │                    │                   │      │
│             │     │  │         ┌──────────▼────────────┐      │      │
│             │     │  │         │  blackboard-client.ts │      │      │
│             │     │  │         │  (Broadcast results)  │      │      │
│             │     │  │         └───────────────────────┘      │      │
│             │     │  └──────────────────────────────────────┘      │
│             │     │                                               │
│             │     │  ┌──────────────────────┐  ┌─────────────┐   │
│             │     │  │ Durable Object:      │  │ KV:         │   │
│             │     │  │ AgentCoordination    │  │ Cache /     │   │
│             │     │  │                      │  │ Subscriptions│   │
│             │     │  │ ── AgentRegistry     │  └─────────────┘   │
│             │     │  │ ── StateManager      │                     │
│             │     │  │ ── MessageBus        │                     │
│             │     │  └──────────────────────┘                     │
│             │     └──────────────────────────────────────────────┘
│             │                        │
│             │                        ▼
│             │              ┌──────────────────┐
│             │              │  construct-       │
│             │              │  coordination     │
│             │              │  (Blackboard)     │
│             │              └──────────────────┘
└─────────────┘
```

---

## 4. Component Deep Dive

### 4.1 Router (`router.ts`)

The request router handles all incoming HTTP traffic.

**Routes:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/agent/message` | Receive agent messages for processing |
| POST | `/api/agent/teach` | Teach a new reflex to the vector DB |
| GET | `/api/agent/reflexes` | List known reflexes (debug) |
| GET | `/api/health` | Health check |
| POST | `/api/blackboard/webhook` | Receive blackboard push notifications |
| GET | `/api/status` | Agent runtime status and metrics |

**Message format for `/api/agent/message`:**

```json
{
  "intent": "check engine temperature",
  "context": {
    "agent_id": "oracle2/engine-monitor",
    "source": "codespace",
    "room": "engine-monitor",
    "timestamp": "2026-06-06T03:45:00Z"
  },
  "id": "msg_abc123",
  "reply_to": "msg_xyz789"
}
```

**Response:**

```json
{
  "id": "msg_abc123",
  "status": "completed",
  "path": "fast",
  "confidence": 0.87,
  "response": "Engine temperature: 72°C. Normal range (65-85°C).",
  "action": "motor_monitor --reflex 42",
  "duration_ms": 8,
  "reflex_id": "reflex_42"
}
```

### 4.2 Reflex Engine (`reflex-engine.ts`)

The heart of the fuzzy flow — reimplements pincher's Teach → Match → Execute for the web.

**Match types (mirrored from pincher):**

| Match Type | Threshold | Behavior |
|-----------|-----------|----------|
| **Exact** | ≥ 0.80 | Fast path: execute immediately (~5ms, ~$0) |
| **Similar** | 0.55 – 0.80 | Confirm + execute (~50ms, ~$0.0001) |
| **Novel** | < 0.55 | Slow path: escalate to LLM (~2s, ~$0.002) |

**The callable:**

```typescript
interface ReflexEngine {
  process(intent: string, context: AgentContext): Promise<AgentResponse>;
  teach(intent: string, action: string): Promise<ReflexRecord>;
  listReflexes(): Promise<ReflexRecord[]>;
  getMetrics(): EngineMetrics;
}
```

**Internal flow:**

1. Receive intent + context
2. Embed intent → 384-dim vector (via external embedding API or hash)
3. Query vector DB for similar reflexes
4. Find best match with confidence score
5. **If Exact:** execute reflex action, return result
6. **If Similar:** call LLM for confirmation, execute if confirmed
7. **If Novel:** call LLM for full reasoning, store as new reflex
8. Broadcast result to blackboard
9. Return response

### 4.3 Vector DB Interface (`vector-db.ts`)

Abstracts access to the vector database. Supports multiple backends:

| Backend | Tier | When to Use |
|---------|------|-------------|
| Cloudflare Vectorize | Paid Workers | Best performance, native Workers integration |
| External REST API (pincher RPC) | Any | Use the pincher runtime's JSON-RPC endpoint for vector search |
| KV-based (fallback) | Free tier | For small reflex sets (<1000), use Workers KV with pre-computed embeddings |
| Embedding-as-a-Service | Any | Call external embedding API for on-the-fly embedding, then match |

**Interface:**

```typescript
interface VectorDB {
  search(intent: string, limit?: number): Promise<SearchResult[]>;
  insert(reflex: ReflexRecord): Promise<void>;
  updateConfidence(reflexId: string, delta: number): Promise<void>;
  delete(reflexId: string): Promise<void>;
  health(): Promise<{ ok: boolean; count: number }>;
}

interface SearchResult {
  id: string;
  intent: string;
  action: string;
  confidence: number;
  invokeCount: number;
  score: number;  // cosine similarity
}
```

**Free tier strategy:** KV-based fallback stores reflexes as simple JSON objects. Embedding is done via a lightweight hash function (djb2 or similar) when no external embedding API is available. This is the hash fallback from pincher's embedder.

### 4.4 Blackboard Client (`blackboard-client.ts`)

Publishes results to the construct-coordination blackboard via the GitHub API.

**Actions it performs:**

1. Formats the agent response as a structured podcast
2. Creates/updates the podcast file in `notes/blackboard/repo/{repo}/updates/{date}/`
3. Commits via GitHub API (uses GITHUB_TOKEN)
4. Updates the channel index (`_index.json`)

**Podcast schema generated:**

```yaml
---
podcast_id: "2026-06-06/015"
channel: "agent/fleet-murmur-worker/responses"
agent: "fleet-murmur-worker"
variant: "standard"
sequence: 15
created: "2026-06-06T03:45:00Z"
path: "fast"
confidence: 0.87
duration_ms: 8
reflex_id: "reflex_42"
intent: "check engine temperature"
source_agent: "oracle2/engine-monitor"
tags: ["engine", "monitoring", "reflex", "fast-path"]
---
```

### 4.5 Durable Object: AgentCoordination

For stateful coordination that survives individual Worker requests:

**Responsibilities:**

| Responsibility | Implementation | Why Durable Object |
|---------------|---------------|-------------------|
| Agent registry | Map of agent_id → { status, last_seen, subscriptions } | Preserves across requests without KV latency |
| Reflex confidence tracking | Running totals of confidence updates | Atomic updates without race conditions |
| Subscription management | Which agents subscribe to which blackboard channels | Centralized but lightweight |
| Message bus | Broadcast messages across connected agents | DO WebSocket upgrade for real-time patterns |

**DO class design:**

```typescript
export class AgentCoordination extends DurableObject {
  // Agent registry
  agents: Map<string, AgentInfo>;
  // Subscription routing
  subscriptions: Map<string, Set<string>>; // channel → agent IDs
  // Reflex statistics
  reflexStats: Map<string, ReflexStats>;
  // Message queue
  messageQueue: AgentMessage[];

  async registerAgent(info: AgentInfo): Promise<void>;
  async subscribe(agentId: string, channel: string): Promise<void>;
  async unsubscribe(agentId: string, channel: string): Promise<void>;
  async broadcast(channel: string, message: AgentMessage): Promise<void>;
  async getSubscribers(channel: string): Promise<string[]>;
  async recordReflexExecution(reflexId: string, path: 'fast' | 'slow', duration: number): Promise<void>;
  async getMetrics(): Promise<CoordinationMetrics>;
}
```

---

## 5. Fast Path / Slow Path Routing

This is the core of the agent runtime — the same pattern as pincher's Think → Match → Execute, adapted for serverless.

### Decision Tree

```
┌──────────────────────────┐
│   Agent Message Arrives  │
│   "check engine temp"    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│   Embed Intent           │
│   → 384-dim vector        │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│   Vector DB Search       │
│   → Find best match       │
└───────────┬──────────────┘
            │
            ▼
     ┌──────┴──────┐
     │  Score ≥     │
     │  0.80?       │
     ├──────┬───────┤
     │ YES  │  NO   │
     ▼      │       ▼
┌────────┐ │  ┌──────────────┐
│ FASTER  │ │  │  Score ≥     │
│ PATH   │ │  │  0.55?       │
│        │ │  ├──────┬───────┤
│ Execute │ │  │ YES  │  NO   │
│ reflex  │ │  ▼      │       ▼
│ action  │ │  ┌────────┐ ┌──────────────┐
│         │ │  │ SIMILAR │ │ SLOW PATH    │
│ Return  │ │  │ PATH   │ │              │
│ result  │ │  │       │ │ Call DeepInfra│
└────┬───┘ │  │ Confirm│ │ (full reason) │
     │    │  │ + exec │ │              │
     │    │  └───┬────┘ │ Store as new  │
     │    │      │      │ reflex (+teach)│
     │    │      │      └──────┬─────────┘
     │    │      │             │
     └────┴──────┴─────────────┘
            │
            ▼
┌──────────────────────────┐
│   Log & Broadcast        │
│   → Update confidence     │
│   → Blackboard podcast    │
│   → Return response       │
└──────────────────────────┘
```

### Response Time Budget

| Path | Approx Time | Cost | Use Case |
|------|-------------|------|----------|
| **Fast** | 5-15ms | ~$0 | Known intent, high confidence, repeated query |
| **Similar** | 50-100ms | ~$0.0001 | Known domain, uncertain phrasing |
| **Slow** | 1-3s | ~$0.002 | Novel intent, requires reasoning |

### Confidence Feedback Loop

After each execution, confidence is updated (mirroring pincher's multiplicative update):

| Result | Confidence Delta | Rationale |
|--------|-----------------|-----------|
| Success (fast path) | ×1.005 | Reinforcement: same pattern works again |
| Success (slow path) | ×1.01 | Reinforced by LLM validation |
| Failure (user corrected) | ×0.90 | User had to override |
| Failure (veto blocked) | ×0.80 | Pattern was dangerous |

This mirrors pincher's `confidence_update` logic and creates a self-improving system.

---

## 6. Blackboard Integration

### 6.1 Publishing Pipeline

Every agent response is broadcast to the blackboard:

```
Agent Message ──► Reflex Engine ──► Response
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ blackboard-        │
                              │ client.ts          │
                              │                    │
                              │ Format podcast     │
                              │ Create markdown    │
                              │ Git commit via API │
                              └───────────────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ construct-         │
                              │ coordination       │
                              │ (blackboard)       │
                              │                    │
                              │ notes/blackboard/  │
                              │   agent/           │
                              │    murmur/actions/  │
                              │    2026-06-06/     │
                              │     001.md         │
                              └───────────────────┘
```

### 6.2 Channels Used

| Channel | Purpose | When |
|---------|---------|------|
| `agent/fleet-murmur-worker/responses` | Every response from the worker | After every message |
| `agent/fleet-murmur-worker/status` | Heartbeat / health status | Every 5 minutes |
| `agent/fleet-murmur-worker/reflexes` | New reflexes learned | When LLM path creates one |
| `agent/fleet-murmur-worker/errors` | Failed requests or vetoed actions | On error |

### 6.3 Polling from Other Agents

All fleet agents (including codespace agents) can subscribe to murmur's channels:

```toml
# In ~/.blackboard/subscriptions.toml
[subscriptions.dynamic]
channels = [
    "agent/fleet-murmur-worker/**",
]
```

When a codespace agent is offline, it learns what murmur did by reading its blackboard channel next time it polls.

### 6.4 Push Notification from Blackboard

When murmur broadcasts to a channel, it can optionally trigger a GitHub Actions workflow on construct-coordination to notify subscribed agents. This uses GitHub's `workflow_dispatch` API.

---

## 7. Durable Objects for Coordination

### 7.1 Why Durable Objects?

Cloudflare Workers are stateless by nature. Durable Objects provide a single-writer, strongly consistent state primitive that works within Workers.

**When to use DO for agent coordination:**

| Scenario | Use DO? | Alternative |
|----------|---------|-------------|
| Per-request stateless processing | ❌ No | Just use Worker |
| Agent registry (updates every few seconds) | ✅ Yes | KV would have consistency issues |
| Reflex confidence tracking (atomic updates) | ✅ Yes | Race conditions in KV |
| Session state for multi-turn conversations | ✅ Yes | DO with alarm for timeout |
| Message bus for real-time coordination | ✅ Yes | DO WebSocket |
| Storing reflex definitions (mostly read) | ❌ No | KV is cheaper and faster for reads |

### 7.2 DO Classes

```
┌────────────────────────────────────────┐
│   fleet-murmur-worker                  │
│                                        │
│   Durable Objects namespace:           │
│     agent-coordination                 │
│                                        │
│   AgentCoordination (singleton or      │
│   sharded by agent_id)                 │
│                                        │
│   ┌──────────────────────────────┐     │
│   │ Methods:                     │     │
│   │  registerAgent()             │     │
│   │  subscribe()                 │     │
│   │  broadcast()                 │     │
│   │  getMetrics()                │     │
│   │  recordExecution()           │     │
│   └──────────────────────────────┘     │
│                                        │
│   KV namespace:                        │
│     reflex-store                       │
│     subscription-config                │
│     blackboard-cache                   │
└────────────────────────────────────────┘
```

### 7.3 DO Alarm for Periodic Tasks

Durable Objects support alarms — timer-based wakeups:

```typescript
// Every 5 minutes: broadcast health status
async alarm() {
  const metrics = this.getMetrics();
  await this.broadcastToBlackboard('agent/fleet-murmur-worker/status', {
    uptime: metrics.uptime,
    requestsProcessed: metrics.totalRequests,
    fastPathPct: metrics.fastPathRatio,
    avgResponseMs: metrics.avgResponseTime,
  });
  this.alarm.setTimeout(300_000); // 5 minutes
}
```

---

## 8. Vector DB Interface

### 8.1 Supported Backends

The `vector-db.ts` module supports multiple vector backends, selected via environment variable:

```env
VECTOR_DB_BACKEND=cloudflare-vectorize|external-rest|kv-fallback
```

#### Backend A: Cloudflare Vectorize (Paid Plan)

The native Workers vector index solution:

```typescript
// Uses Cloudflare Vectorize API
const index = env.VECTORIZE_INDEX;
const results = await index.query(embedding, { topK: 5, returnMetadata: true });
```

**Pros:** Native Workers integration, low latency, free index creation
**Cons:** Requires Workers Paid plan ($5+/month), 384-dim minimum, limited dimensions

#### Backend B: External REST API (Free Tier)

Points to a self-hosted or external vector DB API:

```typescript
const response = await fetch(VECTOR_DB_API, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${VECTOR_DB_KEY}` },
  body: JSON.stringify({
    vector: embedding,
    topK: 5,
    namespace: 'fleet-reflexes',
  }),
});
```

**Target backends:**
- **Pincher RPC server** (running locally or on a cheap VPS) — uses pincher's own SQLite + sqlite-vec
- **Supabase pgvector** (free tier: 500MB database)
- **Pinecone** (free tier: 100k vectors)
- **Upstash Vector** (free tier: 10k vectors)

#### Backend C: KV Fallback (Free Tier, No External Deps)

When no external vector DB is available, this uses Workers KV with a lightweight hash-based embedding:

```typescript
// dj2b-style hash embedding
function hashEmbed(text: string): number[] {
  let h1 = 5381, h2 = 5381;
  for (let i = 0; i < text.length; i++) {
    h1 = ((h1 << 5) + h1) ^ text.charCodeAt(i);
    h2 = ((h2 << 5) + h2) ^ text.charCodeAt(text.length - 1 - i);
  }
  // Expand to 16-dim vector via bit mixing
  return [/* 16 derived values */];
}
```

**Limitations:** Lower accuracy than real embeddings, but works for small reflex sets (<1000) and is entirely free.

### 8.2 Embedding Strategy

Real embeddings require an external API since Workers can't run ONNX:

| Strategy | Service | Cost | Quality |
|----------|---------|------|---------|
| **Cloudflare Workers AI** | `@cf/baai/bge-base-en-v1.5` | Included in Workers Paid | Excellent (768-dim) |
| **DeepInfra Embed** | `deepinfra.com/v1/embeddings` | $0.0001/embedding | Excellent |
| **OpenAI Embed** | `text-embedding-3-small` | $0.00002/embedding | Best |
| **Hash Fallback** | Built-in | $0 | Poor but free |

**Recommendation:** Use Cloudflare Workers AI embeddings when on Paid plan; use DeepInfra/OpenAI for embedding + reasoning in one call on free tier; use hash fallback when no API keys available.

### 8.3 Schema

Reflexes are stored with this schema:

```typescript
interface ReflexRecord {
  id: string;              // UUID v4
  intent: string;          // The original intent that was taught
  action: string;          // The action/response to execute
  embedding: number[];     // 384-dim or 768-dim embedding vector
  confidence: number;      // 0.0 - 1.0, updated after each invocation
  invokeCount: number;     // How many times this reflex has been used
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
  tags: string[];          // Freeform tags for categorization
  source: string;          // Which agent/system created this
  category: string;        // 'intent-pattern' | 'directive' | 'insight'
}
```

---

## 9. Integration with Codespace Agents

The Fleet Murmur Worker serves as the **always-on endpoint** that codespace agents can talk to even when no codespace is running.

### 9.1 Codespace → Murmur Communication

```
┌──────────────────┐         ┌───────────────────────────┐
│  Codespace Agent  │  HTTP   │  Fleet Murmur Worker      │
│  (ephemeral)      │────────►  (always on)               │
│                   │         │                           │
│  "check engine    │         │  1. Receive intent        │
│   temperature"    │         │  2. Fast path: 8ms        │
│                   │         │  3. Return response       │
│  ◄───────────────┤         │  4. Broadcast to BB        │
│  "72°C, normal"   │         └───────────────────────────┘
└──────────────────┘
```

**When the codespace is running:**
- The codespace agent sends messages directly to murmur
- Murmur processes and returns results (fast or slow path)
- Murmur broadcasts to blackboard

**When the codespace is suspended/stopped:**
- Murmur continues receiving messages from other sources
- Responses accumulate on blackboard for the codespace agent to read on next start
- The DO's alarm pushes status to blackboard periodically

### 9.2 Murmur → Codespace Communication

Murmur can trigger codespace activation via GitHub API:

```
┌──────────────────┐         ┌───────────────────────────┐
│  Fleet Murmur    │  POST   │  GitHub API               │
│                  │────────►│                           │
│  "Alert: anomaly │         │  Create Codespace from    │
│   detected"      │         │  room-template-engine     │
│                  │         │                           │
│                  │         │  (2-3 min startup)        │
│                  │         │                           │
│                  │         │  ┌──────────────────┐     │
│                  │         │  │ Codespace boots  │     │
│                  │         │  │ Agent polls BB   │     │
│                  │         │  │ Reads alert      │     │
│                  │         │  │ Starts handling  │     │
│                  │         │  └──────────────────┘     │
└──────────────────┘         └───────────────────────────┘
```

### 9.3 The Full Lifecycle

```
1. Codespace agent sends "monitor engine" intent to murmur
2. Murmur fast-paths: returns known monitoring reflex
3. Murmur detects elevated temperature pattern
4. Murmur broadcasts "ALERT: anomaly detected" to blackboard
5. Murmur triggers Codespace creation via GitHub API
6. Codespace boots, agent polls blackboard
7. Agent reads alert, enters engine-monitor room
8. Agent loads engine-monitor ensign with full tracking skills
9. Agent reports incident to murmur
10. Murmur learns new reflex from the incident
```

---

## 10. Notion as Coordination Surface

Notion provides an optional **human-readable coordination surface** alongside the Git-based blackboard.

### 10.1 Notion ↔ Blackboard Bridge

When murmur broadcasts to the blackboard, it can optionally mirror select channels to Notion:

```
Blackboard ──► fleet-murmur-worker ──► Notion API
(agent/fleet-murmur-worker/responses)      │
                                           ▼
                                    Notion Database:
                                    "Fleet Responses"
                                    Properties:
                                    - Intent (title)
                                    - Response (rich text)
                                    - Path (select: fast/similar/slow)
                                    - Confidence (number)
                                    - Timestamp (date)
                                    - Source Agent (select)
                                    - Tags (multi-select)
```

### 10.2 Notion as Coordination Dashboard

A Notion dashboard can show:

- **Real-time agent activity feed** — latest murmurs and responses
- **Reflex library** — all known reflexes with confidence scores
- **Confidence heatmap** — which intents are mastered vs novel
- **Error log** — failed requests with stack traces
- **Subscription management** — which channels each agent subscribes to

### 10.3 API-Only Design

The Notion integration uses the Notion API directly from the Worker. No server-side Notion client needed:

```typescript
// Notion API call from within the Worker
const response = await fetch('https://api.notion.com/v1/pages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  },
  body: JSON.stringify({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      'Intent': { title: [{ text: { content: intent } }] },
      'Response': { rich_text: [{ text: { content: response } }] },
      'Path': { select: { name: path } },
      'Confidence': { number: confidence },
    },
  }),
});
```

**Notion is optional.** The system works fully without it — the blackboard is the canonical surface. Notion is a convenience layer for human operators who prefer reading Notion databases over Git repos.

---

## 11. Always-On Fallback Pattern

The Fleet Murmur Worker's most important property: **it is always available**, even when no codespace is running and all other agents are offline.

### 11.1 What Murmur Can Do Alone

| Capability | Requires | Notes |
|-----------|----------|-------|
| Receive agent messages | Nothing | HTTP is always available |
| Fast-path reflex matching | Vector DB | Works with KV fallback |
| Return known responses | Reflex store | Works offline |
| Broadcast to blackboard | GitHub token | Config requirement |
| Slow-path LLM reasoning | DeepInfra API key | Requires internet + API key |
| Learn new reflexes | Vector DB write | Requires internet for embedding |
| Trigger codespace creation | GitHub token | Requires internet |

**Core loop (offline-capable):**
```
Receive intent → KV hash embed → KV search → Fast path response → Return
```
This works entirely within Cloudflare's edge, no external services needed.

### 11.2 Deployment Architecture Without Codespace

```
┌──────────────────────┐
│  Internet source      │
│  (Webhook, Bot, etc.) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Cloudflare Workers   │  ← Always on, always available
│  fleet-murmur-worker  │
│                       │
│  ┌─────────────────┐  │
│  │ KV Reflex Store │  │  ← Contains last known reflexes
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ KV Cache         │  │  ← Cached responses for fast path
│  └─────────────────┘  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  construct-coordination│  ← Blackboard persists
│  (GitHub repo)        │     even without codespace
└──────────────────────┘
```

### 11.3 What Happens When a Codespace Reconnects

```
1. Codespace agent boots (2-3 min)
2. Agent polls blackboard for latest messages
3. Agent sees murmur's responses from the offline period
4. Agent catches up: processes missed alerts, reads new reflexes
5. Agent can now send messages to murmur directly
6. Murmur detects codespace is alive → switches to direct communication
```

---

## 12. Deployment Architecture (Free Tier)

### 12.1 Cost Breakdown

| Resource | Free Tier Limit | Monthly Cost |
|----------|----------------|--------------|
| Workers | 100k requests/day | $0 |
| Workers KV | 100k reads/day, 1k writes/day | $0 |
| Durable Objects | 1M requests/month, 1GB storage | $0 |
| GitHub API | 5000 requests/hour | $0 |
| DeepInfra API | Pay-as-you-go | ~$0.20/1000 slow-path calls |
| Cloudflare DNS | Free | $0 |

**Typical monthly cost:** $0-1 (LLM calls only)

### 12.2 Free Tier Constraints

| Constraint | Our Strategy |
|------------|-------------|
| Workers CPU time | 10ms fast path → 750k fast-path requests/day within limit |
| Workers bundle size | 1MB max → keep under 500KB with tree-shaking |
| Workers subrequests | 1000/request → 1 LLM call + 1 BB publish = 2 subrequests |
| KV reads | 100k/day → cache frequently accessed reflexes |
| DO create/delete | 1000/day → reuse DO instances |
| CRON triggers | 3 schedules → health check, GC, metrics broadcast |

### 12.3 Environment Variables

```env
# Required
GITHUB_TOKEN=ghp_xxx
AGENT_NAME=fleet-murmur-worker
AGENT_ROLE=reflex-responder

# Vector DB
VECTOR_DB_BACKEND=kv-fallback
# or: VECTOR_DB_BACKEND=external-rest
# VECTOR_DB_API=https://your-vector-db.example.com
# VECTOR_DB_KEY=sk-xxx

# LLM (optional — murmur works without for fast-path only)
DEEPINFRA_API_KEY=sk-xxx
DEEPINFRA_API_URL=https://api.deepinfra.com/v1

# Notion (optional)
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxx

# Coordination
FLEET_HOMESERVER=https://matrix.superinstance.dev
BLACKBOARD_REPO=SuperInstance/construct-coordination
BLACKBOARD_BRANCH=main

# Embedding
EMBEDDING_SERVICE=hash-fallback
# or: EMBEDDING_SERVICE=deepinfra
# or: EMBEDDING_SERVICE=cloudflare-ai
```

### 12.4 wrangler.toml Configuration

```toml
name = "fleet-murmur-worker"
main = "src/index.ts"
compatibility_date = "2026-06-01"
compatibility_flags = ["nodejs_compat"]

# Free tier plan
workers_dev = true

# Routes
routes = [
  { pattern = "murmur.superinstance.dev", zone_id = "your-zone-id" },
]

# Durable Objects
[[durable_objects.bindings]]
name = "AGENT_COORDINATION"
class_name = "AgentCoordination"

[[migrations]]
tag = "v1"
new_classes = ["AgentCoordination"]

# KV Namespaces
[[kv_namespaces]]
binding = "REFLEX_STORE"
id = "xxx"
preview_id = "xxx"

[[kv_namespaces]]
binding = "CACHE"
id = "xxx"
preview_id = "xxx"

# Environment variables
[env]
VECTOR_DB_BACKEND = "kv-fallback"
EMBEDDING_SERVICE = "hash-fallback"
```

---

## 13. Security Model

### 13.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized requests | Authenticate via shared secret or signed requests |
| Reflex poisoning | Validate taught intents; veto engine checks dangerous patterns |
| API key leakage | Store in Workers secrets (not env vars), never log |
| GitHub token in response | Strip auth headers from all outgoing responses |
| Durable Object data exposure | DOs are isolated by namespace; no cross-tenant access |
| Denial of service | Workers automatically scale; free tier limits prevent runaway costs |

### 13.2 Authentication

Incoming messages are authenticated via:

1. **Shared secret** — HMAC-signed payloads with pre-shared key
2. **Source IP allowlist** — restrict to known codespace ranges (limited utility)
3. **Bearer token** — simple API key in Authorization header

Recommended: API key via `Authorization: Bearer` header, validated against a KV-stored key.

### 13.3 SAEP Veto (Port from Pincher)

The SAEP (Security Assessment of Execution Patterns) veto engine from pincher is ported to TypeScript:

```typescript
class VetoEngine {
  private dangerousPatterns: RegExp[] = [
    /rm\s+-rf\s+\//,
    /mkfs/,
    /dd\s+if=\/dev\/zero/,
    /:\(\)\{:\(\)\}:/,  // Fork bomb
    /chmod\s+777/,
  ];

  check(action: string): VetoDecision {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(action)) {
        return { allow: false, reason: `Dangerous pattern: ${pattern}` };
      }
    }
    return { allow: true };
  }
}
```

---

## 14. Operations & Observability

### 14.1 Health Endpoint

```
GET /api/health → 200 OK
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "agent": "fleet-murmur-worker",
  "vector_db": {
    "backend": "kv-fallback",
    "status": "connected",
    "reflex_count": 142
  },
  "llm": {
    "configured": true,
    "provider": "deepinfra"
  },
  "blackboard": {
    "configured": true,
    "repo": "SuperInstance/construct-coordination"
  }
}
```

### 14.2 Metrics

Exposed via `GET /api/status`:

```json
{
  "total_requests": 12583,
  "fast_path_count": 11200,
  "slow_path_count": 1383,
  "fast_path_pct": 89.0,
  "avg_response_ms": 12,
  "avg_fast_path_ms": 8,
  "avg_slow_path_ms": 2100,
  "reflexes_stored": 142,
  "agents_registered": 7,
  "blackboard_broadcasts": 12583,
  "errors": {
    "veto_blocked": 3,
    "llm_failed": 12,
    "blackboard_failed": 0
  }
}
```

### 14.3 Error Handling

| Error | Behavior | Recovery |
|-------|----------|----------|
| Vector DB unreachable | Fall back to hash-based KV search | Retry with backoff |
| LLM API rate limited | Return "unavailable" + cache the intent | Exponential backoff |
| GitHub API rate limited | Cache broadcasts, retry on next request | Queue in KV |
| DO unavailable | Process without coordination (read-only) | Automatic retry |

---

## 15. Future Extensions

### 15.1 Real-Time WebSocket Support

Upgrade Durable Object to handle WebSocket connections for real-time agent communication:

```
Agent (WebSocket) ←──→ AgentCoordination DO ←──→ Agent (WebSocket)
```

### 15.2 Multi-Worker Fleet

When one worker isn't enough:

```
┌──────────────────┐
│  Global Load      │
│  Balancer (CF)    │
└──────┬───────────┘
       │
  ┌────┴────┬──────┐
  │         │      │
  ▼         ▼      ▼
┌──────┐ ┌──────┐ ┌──────┐
│ us-  │ │ eu-  │ │ ap-  │
│ east │ │ west │ │ east │
└──┬───┘ └──┬───┘ └──┬───┘
   │        │        │
   └────────┴────────┘
        Shared DO
     (cross-region)
```

### 15.3 CI/CD Integration

GitHub Actions workflow auto-deploys murmur:

```yaml
name: Deploy Murmur
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx wrangler deploy
```

### 15.4 Embedding-as-a-Service Proxy

Murmur can act as a proxy for other Workers that need embeddings but don't have access:

```
Worker A ──► murmur/embed ──► Embedding API ──► Result back to Worker A
```

---

## 16. Appendix: Message Flow

### Full Request Lifecycle (Slow Path)

```
1. POST /api/agent/message
   Body: { intent: "analyze anomaly in engine sensor", ... }

2. Router matches → calls reflexEngine.process(intent, context)

3. Embed intent via hash-fallback → 16-dim "embedding"

4. Vector DB search:
   - KV-backed: search by hash similarity
   - Best match: "check engine temperature" (confidence: 0.32)
   
5. Score 0.32 < 0.55 → NOVEL → SlOW PATH

6. POST to DeepInfra API:
   {
     model: "deepseek/deepseek-chat",
     messages: [
       { role: "system", content: "...agent context..." },
       { role: "user", content: "analyze anomaly in engine sensor" }
     ]
   }

7. Receive LLM response:
   "Based on sensor readings, the anomaly appears to be an intermittent
    spike in temperature sensor 3. Recommended: recalibrate sensor 3
    and run diagnostic. Action: sensor-diag --id 3"

8. Store as new reflex:
   Intent: "analyze anomaly in engine sensor"
   Action: "sensor-diag --id 3"
   Confidence: 0.60 (initial)
   Embedding: [computed from intent]
   
9. Publish to blackboard:
   Channel: agent/fleet-murmur-worker/responses
   Variant: standard
   Content: LLM response

10. Update metrics (DO):
    Record slow path execution

11. Return response:
    {
      status: "completed",
      path: "slow",
      confidence: 0.32,
      response: "Based on sensor readings...",
      action: "sensor-diag --id 3",
      duration_ms: 2340,
      new_reflex_id: "reflex_143"
    }
```

### Full Request Lifecycle (Fast Path)

```
1. Next time: POST /api/agent/message
   Body: { intent: "analyze anomaly in engine sensor", ... }

2. Embed intent → 16-dim vector

3. Vector DB search:
   - Best match: "analyze anomaly in engine sensor" (confidence: 0.87)
   - This IS the reflex learned last time

4. Score 0.87 ≥ 0.80 → EXACT → FAST PATH

5. Execute reflex action: "sensor-diag --id 3" (no-op in Workers — just return)

6. Update confidence: 0.87 × 1.005 = 0.874

7. Return response:
   {
     status: "completed",
     path: "fast",
     confidence: 0.874,
     response: "Based on sensor readings...",
     action: "sensor-diag --id 3",
     duration_ms: 6,
     reflex_id: "reflex_143"
   }
```

---

*This architecture document is itself a podcast. Broadcast to `fleet/insights` upon finalization.*

*End of CF-AGENT-ARCHITECTURE.md*
