# Fleet Murmur Worker

> Serverless agent runtime for the Ternary Fleet — Cloudflare Workers + Vector DB reflex engine.

**Status:** Architecture Draft / Scaffold  
**Runtime:** Cloudflare Workers (Free Tier)  
**Persistence:** Workers KV + Durable Objects

---

## Overview

Fleet Murmur is the **always-on** agent endpoint for the Ternary Fleet. It's the fusion of L3 (Cloudflare Workers compute) and L4 (Vector DB distilled knowledge) from the fleet architecture.

### What It Does

1. **Listens for agent messages** via HTTP webhook
2. **Queries the vector DB** for matching reflexes/patterns
3. **Executes the fast path** — if confidence > 0.80, respond without LLM (~5ms, ~$0)
4. **Escalates to LLM** — if confidence < 0.55, sends to DeepInfra (~2s, ~$0.002)
5. **Broadcasts results** via the Blackboard pattern into construct-coordination

### Architecture

```
fleet-murmur-worker/
├── src/
│   ├── index.ts               # Worker entry point (fetch handler + cron)
│   ├── router.ts              # HTTP routing
│   ├── reflex-engine.ts       # Fast path / Slow path logic
│   ├── vector-db.ts           # Vector DB interface (3 backends)
│   ├── embed.ts               # Text embedding service (hash/deepinfra/cf-ai)
│   ├── blackboard-client.ts   # Publishing to construct-coordination
│   ├── agent-coordination.ts  # Durable Object for coordination state
│   ├── veto-engine.ts         # SAEP veto rules (port from pincher)
│   ├── types.ts               # Shared type definitions
│   └── constants.ts           # Configuration constants
├── wrangler.toml              # Cloudflare deployment config (free tier)
├── package.json               # Dependencies (minimal: itty-router only)
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

---

## Deployment (Free Tier)

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Node.js 18+

### Step 1: Install and Login

```bash
npm install -g wrangler
wrangler login
```

### Step 2: Clone and Install

```bash
cd fleet-murmur-worker
npm install
```

### Step 3: Configure Secrets

```bash
# Required for blackboard publishing
wrangler secret put GITHUB_TOKEN

# Required for LLM slow path (optional — fast path only without this)
wrangler secret put DEEPINFRA_API_KEY

# Optional: Notion bridge
wrangler secret put NOTION_TOKEN

# Optional: External vector DB
wrangler secret put VECTOR_DB_KEY
```

### Step 4: Create KV Namespaces

```bash
# Create the KV namespaces
wrangler kv:namespace create REFLEX_STORE
wrangler kv:namespace create CACHE

# Update wrangler.toml with the returned IDs
```

### Step 5: Deploy

```bash
# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Step 6: Verify

```bash
# Health check
curl https://fleet-murmur-worker.your-name.workers.dev/api/health

# Send a test message
curl -X POST https://fleet-murmur-worker.your-name.workers.dev/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "intent": "check engine temperature",
    "context": {
      "agentId": "oracle2/engine-monitor",
      "source": "test"
    }
  }'

# Teach a reflex
curl -X POST https://fleet-murmur-worker.your-name.workers.dev/api/agent/teach \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "check engine temperature",
    "action": "Temperature: 72°C. Normal range (65-85°C)."
  }'
```

---

## Vector DB Backends

The worker supports three vector DB backends, configured via `VECTOR_DB_BACKEND` env var:

| Backend | Plan | Best For |
|---------|------|----------|
| `kv-fallback` | Free | Small reflex sets (<1000), zero dependencies |
| `external-rest` | Free | Using pincher RPC, Pinecone, Supabase pgvector |
| `cloudflare-vectorize` | Paid ($5/mo) | Native Workers integration, best performance |

---

## Embedding Services

| Service | Plan | Quality |
|---------|------|---------|
| `hash-fallback` | Free | Low but functional (16-dim) |
| `deepinfra` | Pay-per-use (~$0.0001/embed) | Good (384-dim bge-base) |
| `cloudflare-ai` | Workers Paid ($5/mo) | Best (768-dim bge-base) |

---

## API Reference

### POST /api/agent/message

Process an agent message through the reflex engine.

**Request:**
```json
{
  "id": "msg_abc123",
  "intent": "check engine temperature",
  "context": {
    "agentId": "oracle2/engine-monitor",
    "source": "codespace",
    "room": "engine-monitor"
  }
}
```

**Response (fast path):**
```json
{
  "status": "completed",
  "path": "fast",
  "confidence": 0.87,
  "response": "Temperature: 72°C. Normal range (65-85°C).",
  "durationMs": 8
}
```

**Response (slow path):**
```json
{
  "status": "completed",
  "path": "slow",
  "confidence": 0,
  "response": "Based on sensor readings...",
  "durationMs": 2340
}
```

### POST /api/agent/teach

Teach a new reflex.

**Request:**
```json
{
  "intent": "check engine temperature",
  "action": "Temperature: 72°C. Normal range (65-85°C).",
  "tags": ["engine", "monitoring"]
}
```

### GET /api/health

Health check — returns status of all backends.

### GET /api/status

Runtime metrics and performance counters.

---

## Integration Points

### With construct-coordination (Blackboard)

Every agent response is broadcast to:
- `notes/blackboard/agent/fleet-murmur-worker/responses/{date}/{seq}.md`

Other agents subscribe to murmur's channels to stay updated.

### With Codespace Agents

- **Codespace → Murmur:** Agents send HTTP POSTs to murmur for processing
- **Murmur → Codespace:** Murmur can trigger codespace creation via GitHub API
- **Offline fallback:** Murmur continues processing while codespace is suspended

### With Notion (Optional)

When configured, murmur mirrors blackboard podcasts to a Notion database for human-readable
monitoring of agent activity and reflex library.

### With pincher Vector DB

The worker can use pincher's RPC server as its vector DB backend, giving it access to all
reflexes learned by the local reflex runtime.

---

## Fast Path Performance

Typical fast-path request on Workers Free Tier:

```
Cold start:    ~5ms (JavaScript only, no WASM)
KV read:       ~2ms (US region)
Hash embed:    <1ms
Total fast:    ~8ms
Cost:          $0
```

Compare to slow path:

```
DeepInfra LLM: ~2s
Intent pkt:    ~$0.002
Total slow:    ~2-3s
```

---

## License

MIT — Part of the Ternary Fleet ecosystem.
