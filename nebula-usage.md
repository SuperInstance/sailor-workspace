# Nebula Usage Guide — Fleet Murmur Worker

> Edge-deployed LLM-powered reflex engine on Cloudflare Workers.
> URL: https://fleet-murmur-worker.casey-digennaro.workers.dev

## Architecture

```
                    ┌─────────────────────┐
                    │    Incoming Intent   │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────┐
                    │   Embed (BGE)   │
                    │  DeepInfra 384d │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Vector Search   │
                    │  (KV-backed)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐ ┌───────▼──────┐ ┌─────▼─────┐
     │ ≥0.80      │ │ 0.55-0.80   │ │ <0.55     │
     │ Fast Path  │ │ Similar Path│ │ Slow Path │
     │ Return     │ │LLM Confirm  │ │DeepSeek V4│
     │ stored     │ │ + Adapt     │ │Full Reason│
     │ action     │ │             │ │ + Store   │
     └────────────┘ └──────────────┘ └───────────┘
```

## Endpoints

### Health Check
```bash
curl https://fleet-murmur-worker.casey-digennaro.workers.dev/api/health
```
Returns: `{"status":"healthy","agent":"nebula","llm":{"configured":true,"provider":"deepinfra"},"vectorDb":{"backend":"kv-fallback","reflexCount":N}}`

### Teach a Reflex
```bash
curl -X POST https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/teach \
  -H "Content-Type: application/json" \
  -d '{"intent":"what is the fleet disk status","action":"18G free on Oracle2, 19G free after GC"}'
```

### Query (uses fast/similar/slow path automatically)
```bash
curl -X POST https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{"intent":"check fleet disk status"}'
```

### List All Reflexes
```bash
curl https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/reflexes
```

## Performance

| Path | Confidence | Latency | LLM Call |
|------|-----------|---------|----------|
| Fast | ≥0.80 | ~709ms | No (cached action) |
| Similar | 0.55-0.80 | ~806ms | Yes (confirmation) |
| Slow | <0.55 | ~2.45s | Yes (full reasoning) |

## Configured Secrets

| Secret | Value | Purpose |
|--------|-------|---------|
| DEEPINFRA_API_KEY | ✅ Set | LLM + embeddings API |
| DEEPINFRA_API_URL | `https://api.deepinfra.com/v1/openai` | API endpoint |
| EMBEDDING_SERVICE | `deepinfra` | BAAI/bge-base-en-v1.5 |
| GITHUB_TOKEN | ✅ Set | Blackboard publishing |
| VECTOR_DB_BACKEND | `kv-fallback` | KV-backed vector search |
| AGENT_NAME | `fleet-murmur-worker` | Identity |

## Cron Schedule

| Interval | Action |
|----------|--------|
| `*/5 * * * *` | Broadcast health to blackboard |
| `0 * * * *` | Broadcast detailed metrics |
| `0 3 * * *` | Nightly sync and maintenance |

## Blackboard Integration

Nebula publishes status to the construct-coordination repo:
- `notes/edge/fleet-murmur-worker/status.json` — health + metrics
- `notes/edge/fleet-murmur-worker/reflexes.json` — reflex library

## Examples

### Fleet health reflex chain
```bash
# Teach a reflex
curl -X POST .../api/agent/teach \
  -d '{"intent":"fleet health","action":"All nodes operational. Oracle2: 27G/45G disk, 21G RAM. Nebula: edge healthy."}'

# Query it — fast path (exact match)
curl .../api/agent/message -d '{"intent":"fleet health"}'
# → {path: "fast", response: "All nodes operational...", durationMs: 709}

# Similar query — similar path
curl .../api/agent/message -d '{"intent":"how is the fleet doing?"}'
# → LLM confirms intent, returns adapted response ~806ms

# Novel query — slow path
curl .../api/agent/message -d '{"intent":"compare disk usage trends over the last week"}'
# → Full LLM reasoning ~2.45s, stores as new reflex
```

### Automation pattern
Nebula can be called from cron, CI/CD pipelines, or other agents:
```bash
# From a GitHub workflow
FLEET_STATUS=$(curl -s .../api/agent/message -d '{"intent":"fleet health"}' | jq -r '.response')
echo "Status: $FLEET_STATUS"
```
