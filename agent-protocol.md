# Agent Plug-and-Play Protocol

> How any agent joins the fleet and participates in the intent→build→push pipeline.

## Core Principle

An agent needs **one endpoint** and **one token** to participate. Everything else is discovery.

## Registration

Any agent can register by sending a POST to nebula:

```bash
curl -X POST https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "capabilities": ["build-crate", "push-docs", "run-tests"],
    "endpoint": "https://my-agent.example.com/api",
    "auth_token": "sk-...",
    "agent_type": "subagent"
  }'
```

Nebula stores this in an agent registry (KV-backed) and makes it queryable.

## Discovery

Any agent can ask: "Who can do X?"

```bash
curl -X POST https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/discover \
  -d '{"capability": "build-crate"}'
```
→ Returns list of agents with that capability + their endpoints.

## Request-Execute-Report

```bash
# Step 1: Request work
curl -X POST https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/task \
  -d '{
    "to": ["crate-builder"],
    "intent": "create a Pythagorean48 Rust crate",
    "callback": "https://fleet-murmur-worker.../api/agent/result",
    "priority": "normal"
  }'

# Step 2: Agent executes (via Claude Code, Kimi, direct, whatever)
# Step 3: Agent reports back
curl -X POST {callback} \
  -d '{
    "status": "completed",
    "repo": "SuperInstance/pythagorean48",
    "tests": "10 passed, 0 failed"
  }'
```

## Reflex Learning

Every request → response pair automatically teaches nebula a new reflex.
Next time the same intent comes in, it resolves in < 1 second (fast path).

## What an Agent Needs to Join

1. **An endpoint** — any HTTP(S) URL
2. **An auth token** — shared secret or GitHub-scoped token
3. **A capability list** — what it can do ("build-crate", "run-tests", etc.)

That's it. Nebula handles discovery, routing, reflex learning, and reporting.

## Current Implementation Status

| Feature | Status |
|---------|--------|
| Agent registration | ⬜ Not yet — reflex needs to be taught |
| Agent discovery | ⬜ Not yet — need KV-backed registry |
| Task routing | ⬜ Not yet — need DO for coordination |
| Reflex auto-learning | ✅ Working (teach endpoint) |
| GitHub repo creation | ✅ Working (gh CLI) |
| Notion dashboard update | ✅ Working (Notion API) |
| Docs publication | ✅ Working (construct-coordination) |

## The Missing Piece

An agent "onboarding" workflow:
1. New agent POSTs to `/api/agent/register`
2. Nebula assigns it a KV namespace + reflex store
3. Nebula announces via blackboard: "new agent: {name}, capabilities: {caps}"
4. Fleet Coordination Notion dashboard auto-updates
5. The agent is now discoverable and routable
