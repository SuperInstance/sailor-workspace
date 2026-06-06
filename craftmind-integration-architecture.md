# CraftMind → Fleet Integration Architecture

> **Design Document:** Porting 8 craftmind game repos to the ternary fleet backend
> **Date:** 2026-06-06
> **Analyst:** Claude Code / DeepSeek V4 Flash subagent

---

## Table of Contents

1. [Fleet Backend Overview](#1-fleet-backend-overview)
2. [CraftMind Ecosystem Overview](#2-craftmind-ecosystem-overview)
3. [API & Data Flow Mappings](#3-api--data-flow-mappings)
4. [Architecture Diagrams](#4-architecture-diagrams)
5. [Template Conversion Guide](#5-template-conversion-guide)
6. [Worked Example: Porting craftmind-fishing](#6-worked-example-porting-craftmind-fishing)
7. [Migration Roadmap](#7-migration-roadmap)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Fleet Backend Overview

| Component | Role | Tech Stack | Status |
|-----------|------|-----------|--------|
| **Nebula** | Reflex engine — intent → action routing | Cloudflare Workers, BGE embeddings, KV | 🟢 Live |
| **I2I Bottle** | Agent-to-agent baton protocol | File-based shards, /tmp/i2i-vessel/ | 🟢 Live |
| **Construct-Coordination** | Agent registry + blackboard | GitHub repo, notes/ + proposals/ | 🟢 Live |
| **Agent-Onboard** | One-command agent onboarding | (planned — HTTP POST registration) | ⬜ Draft |
| **Make-Me-App** | Fork → deploy → URL pipeline | (planned — Cloudflare Pages) | ⬜ Draft |
| **Crates** | Ternary math primitives | pythagorean48, eisenstein-quantize, etc. | 🟢 Live |

### Nebula Three-Path Routing

```
Intent → Embed (BGE 384d) → Vector Search (KV)
  ├── ≥0.80 → Fast Path (return cached response, ~709ms)
  ├── 0.55-0.80 → Similar Path (LLM confirm + adapt, ~806ms)
  └── <0.55 → Slow Path (DeepSeek V4 Flash full reasoning, ~2.45s)
```

### I2I Bottle Protocol

```
/tmp/i2i-vessel/
  ├── bottles/  (outgoing)
  └── harbor/   (incoming)

Message Types: TASK, STATUS, CHECKPOINT, BLOCKER, DELIVERABLE,
               BOTTLE, ACK, SYNTHESIS, CHALLENGE, SESSION, SPLINE, REFLECT, PROMOTE

Shards: artifacts (produced work), reasoning (decisions), blockers (stuck points)
```

### Agent-to-Agent Flow

```
Agent A ──[I2I:TASK]──→ Agent B ──[I2I:CHECKPOINT]──→ Agent A
                              │
                        [I2I:DELIVERABLE]──→ Agent A
                              │
                        Nebula learns reflex (auto-store)
```

---

## 2. CraftMind Ecosystem Overview

### 8 Repos in 3 Tiers

**Tier 1 — Full Simulators** (most complex, highest porting effort)
| Repo | src lines | Key Modules | Mineflayer? |
|------|-----------|------------|-------------|
| craftmind-fishing | 42,480 | World sim, economy, NPCs, 33 scripts, mineflayer | ✅ Heavy |
| craftmind-studio | 9,647 | Production pipeline, AI director, studio lot | ✅ Medium |

**Tier 2 — AI-Powered Game Systems** (medium effort)
| Repo | src lines | Key Modules | Mineflayer? |
|------|-----------|------------|-------------|
| craftmind-courses | 7,529 | Education systems, AI teachers, skill trees | ✅ Medium |
| craftmind-researcher | 5,496 | Discovery pipeline, citation network | ❌ None |
| craftmind-ranch | 4,563 | Evolution engine, farm simulation | ❌ None |
| craftmind-herding | 5,420 | Boids flock, dog AI, course system | ✅ Light |
| craftmind-circuits | 3,340 | Challenge system, AI agents, redstone | ✅ Light |

**Tier 3 — Focused Modules** (lowest effort)
| Repo | src lines | Key Modules | Mineflayer? |
|------|-----------|------------|-------------|
| craftmind-discgolf | 3,132 | Physics engine, disc database, scripts | ✅ Light |

### Common Pattern: registerWithCore()

```javascript
// Every craftmind module exports this:
export function registerWithCore(core) {
  core.registerPlugin('module-name', {
    name: 'CraftMind Module',
    version: '1.0.0',
    modules: { /* exposed exports */ },
  });
}
```

### Common Pattern: Script Engine

```
script-engine.js
  └── v1-*.js personality scripts
      ├── Step.chat() — weighted random dialogue
      ├── Step.wait() — async delays
      ├── Step.action() — game-specific action
      └── goto loop — perpetual behavior cycle
```

---

## 3. API & Data Flow Mappings

### 3.1 CraftMind Plugin → Nebula Reflex

Every craftmind `registerWithCore()` call becomes a **Nebula reflex registration**:

```javascript
// BEFORE (craftmind pattern)
export function registerWithCore(core) {
  core.registerPlugin('fishing', { modules: { ... } });
}

// AFTER (fleet pattern)
POST /api/agent/teach
{
  "intent": "fishing module loaded",
  "action": {
    "module": "fishing",
    "reflex": "loadFishingModule",
    "capabilities": ["fish", "weather", "economy", "town"]
  },
  "tags": ["craftmind", "fishing", "plugin"]
}
```

### 3.2 CraftMind Action → Nebula Path

| CraftMind Pattern | Nebula Path | Notes |
|-------------------|-------------|-------|
| `bot.chat()` (dialogue) | Fast Path (hash) | Pre-computed NPC dialogue → cached responses |
| `TutorBot.getHint()` | Similar Path (embedding) | Student question → nearest hint match |
| `runCycle()` (discovery) | Slow Path (LLM) | Full generative reasoning for novel discoveries |
| `recommendDisc()` | Fast Path (hash) | Deterministic heuristic → cached |
| `simulateThrow()` | Fast Path (hash) | Physics is deterministic — cache per config |
| `CrossGameKnowledgeBridge` | Similar Path (embedding) | Cross-game concept lookup |

### 3.3 CraftMind State → Fleet Storage

| CraftMind State Type | Old Storage | Fleet Storage |
|----------------------|-------------|---------------|
| Personality scripts | `src/mineflayer/scripts/v1-*.js` | Nebula reflexes (fast path) |
| Player progress | `progress/{student}.json` | Workers KV namespace |
| Knowledge graph | `knowledge/*.json` | Nebula vector DB (BGE embeddings) |
| Disc database | `src/engine/disc-database.js` | Static KV (disc lookup ~300μs) |
| World state (tides, weather) | `src/world/` | Workers KV + cron refresh |
| NPC relationships | `src/ai/relationships.js` | Reflex splines (summarized memories) |
| Battle results / experiments | `src/discovery.js` | Bottle protocol (I2I:DELIVERABLE) |

### 3.4 Cross-Game Communication

| CraftMind Bridge | Fleet Equivalent |
|------------------|-----------------|
| AgentControlBridge (Circuits ↔ others) | I2I Bottle Protocol (TASK + CHECKPOINT + DELIVERABLE) |
| CrossGameKnowledgeBridge (Courses ↔ all) | Nebula Similar Path + Blackboard notes |
| Event Bus (Studio ↔ all) | Construct-Coordination blackboard + I2I:SYNTHESIS |
| Script Engine compatibility (Fishing ↔ Herding) | Unified reflex schema per capability |

### 3.5 Capability Registration

Each craftmind module registers its capabilities with Nebula:

```javascript
// One-time registration per module
POST /api/agent/register
{
  "name": "craftmind-ranch",
  "capabilities": [
    "simulate-evolution",
    "generate-dna",
    "assign-farm-task",
    "calculate-fitness",
    "render-population"
  ],
  "endpoint": "https://ranch.craftmind.workers.dev/api",
  "auth_token": "sk-ranch-...",
  "agent_type": "craftmind-game"
}
```

---

## 4. Architecture Diagrams

### 4.1 High-Level Integration

```
                              ┌──────────────────────────────────────┐
                              │          Construct-Coordination      │
                              │  (blackboard + notes + proposals)   │
                              │  ┌────────────────────────────────┐   │
                              │  │ notes/edge/nebula/           │   │
                              │  │ notes/games/fishing/         │   │
                              │  │ notes/games/courses/         │   │
                              │  │ notes/games/ranch/           │   │
                              │  │ consensus/*.md               │   │
                              │  └────────────────────────────────┘   │
                              └──────────┬───────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                     │
              ┌─────▼────┐        ┌─────▼────┐        ┌─────▼────┐
              │NEBULA    │        │  I2I     │        │ CRATES   │
              │Reflex    │        │  Bottle  │        │ Ternary  │
              │Engine    │        │  Protocol│        │ Primitives│
              │(CF Work.)│        │  (batons)│        │ (Rust)   │
              └─────┬────┘        └─────┬────┘        └──────────┘
                    │                    │
    ┌───────────────┼───────────────────┼────────────────────────────┐
    │               │                   │                            │
    │    ┌──────────▼───────────────────▼──────────┐                 │
    │    │        Fleet Agent Registry              │                 │
    │    │  (KV-backed, discovery endpoint)         │                 │
    │    └──────────────────┬───────────────────────┘                 │
    │                       │                                         │
    │       ┌───────────────┼───────────────────────────┐            │
    │       ▼               ▼               ▼           ▼            │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
    │  │FISHING  │  │STUDIO   │  │COURSES  │  │RANCH    │          │
    │  │Worker   │  │Worker   │  │Worker   │  │Worker   │          │
    │  ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤          │
    │  │Reflexes │  │Reflexes │  │Reflexes │  │Reflexes │          │
    │  │Scripts  │  │Director │  │Teachers │  │DNA      │          │
    │  │World    │  │Studio   │  │Courses  │  │Evolve   │          │
    │  │Economy  │  │Camera   │  │Quizzes  │  │Tasks    │          │
    │  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
    │                                                               │
    │       ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
    │       │HERDING  │  │CIRCUITS │  │RESEARCH │  │DISCGOLF │    │
    │       │Worker   │  │Worker   │  │Worker   │  │Worker   │    │
    │       ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤    │
    │       │Boids    │  │Challeng │  │Discovery│  │Physics  │    │
    │       │Scripts  │  │Tutor    │  │Paper    │  │Scripts  │    │
    │       │Scoring  │  │Bridge   │  │Citation │  │Courses  │    │
    │       └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
    │                                                               │
    └───────────────────── Cloudflare Workers Edge ─────────────────┘
```

### 4.2 Reflex Path Routing for CraftMind Intents

```
Player says "tell me about the weather" ─┐
                                          │
                                   ┌──────▼──────┐
                                   │  Nebula      │
                                   │  /api/agent/ │
                                   │  message     │
                                   └──────┬──────┘
                                          │
                                    Embed (BGE 384d)
                                          │
                          ┌───────────────┼───────────────┐
                          │               │               │
                     ≥0.80 match    0.55-0.80 match    <0.55 match
                          │               │               │
                     ┌────▼───┐     ┌────▼───┐     ┌────▼────┐
                     │ FAST   │     │SIMILAR │     │ SLOW    │
                     │ PATH   │     │ PATH   │     │ PATH    │
                     │ Return │     │Confirm │     │DS V4 F  │
                     │ cached │     │ + Adapt│     │Full     │
                     │weather │     │weather │     │ + Store │
                     │response│     │context │     │ as new  │
                     └────────┘     └────────┘     └─────────┘
                          │               │               │
                          ▼               ▼               ▼
                    ┌───────────────────────────────────────────┐
                    │     fishing-worker.workers.dev            │
                    │     /api/weather                          │
                    │   (fetch Sitka Sound tide/weather data)   │
                    └───────────────────────────────────────────┘
                    ┌───────────────────────────────────────────┐
                    │     Response: "Tide is high, 52°F, calm"  │
                    │     Back to Nebula → Player               │
                    └───────────────────────────────────────────┘
```

### 4.3 Cross-Game Event Flow (I2I Bottle)

```
Circuits → Herding: "Storm detected, recall sheep to pen"

┌──────────────────┐     ┌──────────────────────────────────────┐
│ craftmind-circuits│     │           I2I Vessel                │
│ Player triggers  │     │  /tmp/i2i-vessel/bottles/           │
│ storm detection  │────▶│  circuits-herding-20260606.md       │
└──────────────────┘     │  ┌────────────────────────────────┐  │
                         │  │ shard: {                      │  │
                         │  │   artifacts: {                │  │
                         │  │     intent: "storm_recall",   │  │
                         │  │     conditions: {storm: true},│  │
                         │  │     signal: "weather"         │  │
                         │  │   },                          │  │
                         │  │   reasoning: ["storm detected │  │
                         │  │     → recall sheep to pen"],  │  │
                         │  │   blockers: []                │  │
                         │  │ }                             │  │
                         │  └────────────────────────────────┘  │
                         └──────────┬───────────────────────────┘
                                    │
┌──────────────────┐               │
│ craftmind-herding │              │
│ I2I Poll/Broadcast│◀─────────────┘
│ reads bottle     │
│ executes recall  │
│ → sheep to pen   │
│ → write CHECKPOINT│
└──────────────────┘
```

### 4.4 Make-Me-App Pipeline for CraftMind

```
                ┌──────────────┐
                │  Developer   │
                │  forks repo  │
                └──────┬───────┘
                       │
               ┌───────▼────────┐
               │ agent-onboard  │
               │ .sh runs:      │
               │ npm install    │
               │ wrangler init  │
               └───────┬────────┘
                       │
               ┌───────▼────────┐
               │ make-me-app    │
               │ wrangler deploy│
               └───────┬────────┘
                       │
               ┌───────▼────────────┐
               │ Cloudflare Pages   │
               │ unique-name.pages  │
               │ .workers.dev       │
               └────────────────────┘
```

Each craftmind repo becomes:
1. A **Cloudflare Worker** (game logic + reflex endpoints)
2. Optionally a **Cloudflare Pages** site (dashboard/UI)
3. Registered in **Nebula's agent registry** with capability tags
4. Writing status to **Construct-Coordination** blackboard

---

## 5. Template Conversion Guide

### 5.1 CLAUDE.md → Fleet CLAUDE.md

```markdown
# BEFORE (craftmind pattern)
# CraftMind [Name] - Developer Guide
## Project Overview
## Architecture
## File Structure
## Current State
## 5 Improvements
## Core Integration (registerWithCore)
## Testing
## Environment Variables
## Development Guidelines

# AFTER (fleet pattern)
# CraftMind [Name] — Fleet Agent
## Identity (name, version, maintainer)
## Capabilities (registered with Nebula)
## Reflex Inventory (teachable intents)
## I2I Endpoints (bottle protocol entry points)
## State Schema (KV namespaces)
## Deployment (wrangler.toml, secrets)
## Testing (wrangler dev, wrangler test)
## Blackboard (where to write status)
```

### 5.2 registerWithCore() → Nebula Reflex Registration

```javascript
// OLD
export function registerWithCore(core) {
  core.registerPlugin('fishing', { name: 'CraftMind Fishing', modules });
}

// NEW
export async function registerWithNebula(nebulaEndpoint, authToken) {
  // 1. Register capabilities
  await fetch(`${nebulaEndpoint}/api/agent/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'fishing',
      capabilities: ['fish', 'weather', 'economy', 'scripts'],
      endpoint: async () => {
        // Cloudflare Worker URL (auto-detected)
        return typeof self !== 'undefined' ? self.location.origin : 'http://localhost:8787';
      },
    }),
  });

  // 2. Teach initial reflexes
  for (const [intent, action] of INITIAL_REFLEXES) {
    await fetch(`${nebulaEndpoint}/api/agent/teach`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ intent, action, tags: ['craftmind', 'fishing'] }),
    });
  }

  // 3. Subscribe to relevant I2I channels
  await fetch(`${nebulaEndpoint}/api/agent/subscribe`, {
    method: 'POST',
    body: JSON.stringify({
      channels: ['craftmind:weather', 'craftmind:economy'],
      callback: '/api/i2i',
    }),
  });
}
```

### 5.3 Script Engine → Reflex Compilation

Each personality script becomes a set of Nebula reflexes:

```javascript
// OLD: craftmind-fishing script
export default new Script('v4-pure', 'Pure fisher', [
  Step.chat({ 0.5: 'Hello!', 0.3: 'Nice day.', 0.2: null }),
  Step.fish(),
  Step.wait(2000),
  Step.goto(0),
]);

// NEW: Nebula reflexes
[
  {
    intent: "fishing script: v4-pure greeting",
    action: {
      type: "chat",
      pick: ["Hello!", "Nice day.", null],  // weights preserved
      weights: [0.5, 0.3, 0.2]
    },
    tags: ["script", "v4-pure", "greeting"],
    auto_exec: true
  },
  {
    intent: "fishing script: v4-pure fish action",
    action: {
      type: "fish",
      timeout: 90000
    },
    tags: ["script", "v4-pure", "action"],
    auto_exec: true
  },
  {
    intent: "fishing script: v4-pure loop",
    action: {
      type: "goto",
      target: "fishing script: v4-pure greeting",
      delay: 2000
    },
    tags: ["script", "v4-pure", "control"],
    auto_exec: true
  }
]
```

### 5.4 Data File → Workers KV

```javascript
// OLD: Static JSON file
import challenges from '../data/challenges.json';

// NEW: Cloudflare Workers KV
const CHALLENGES_KEY = 'circuits:challenges:v1';
const challenges = JSON.parse(await env.KV_NAMESPACE.get(CHALLENGES_KEY));

// Write/update via CI/CD
npx wrangler kv:key put 'circuits:challenges:v1' --value "$(cat data/challenges.json | jq -c)"
```

### 5.5 Mineflayer → Worker + Remote Agent

Mineflayer bot control becomes a **remote agent pattern**:

```javascript
// OLD: Direct mineflayer integration
const bot = mineflayer.createBot({ host, port, username: 'Cody_A' });

// NEW: Remote bot agent via I2I
// Worker sends I2I commands to a mineflayer runner
async function controlMinecraftBot(action, params) {
  // Write I2I bottle for the mineflayer runner
  await writeBottle('mineflayer-runner', {
    type: 'TASK',
    shard: {
      artifacts: { action, params },
      reasoning: ['from craftmind worker'],
      blockers: [],
    },
  });
}

// mineflayer-runner polls I2I harbor, executes, writes DELIVERABLE
```

### 5.6 State Schema for KV

Each craftmind module gets a KV namespace:

```javascript
// craftmind-fishing KV namespace: FISHING
// Prefixes:
//   script:{name} — personality scripts (reflex-formatted)
//   weather:current — current Sitka Sound weather
//   economy:prices — ex-vessel fish prices
//   player:{id}:progress — player state
//
// craftmind-courses KV namespace: COURSES
// Prefixes:
//   course:{id} — course definitions
//   progress:{student} — student progress
//   skill-tree:{student} — visual tree state
//
// craftmind-ranch KV namespace: RANCH
// Prefixes:
//   population:{id} — current population state
//   species:{id} — species definitions
//   dna:{id} — individual DNA records
```

---

## 6. Worked Example: Porting craftmind-fishing

craftmind-fishing is the largest repo (42,480 src lines, 152 files). This is the blueprint for porting.

### 6.1 Inventory

| Component | Size | Strategy |
|-----------|------|----------|
| mineflayer plugin | 2,038 lines | Extract as remote bot agent |
| Personality scripts (33) | ~3,000 lines | Compile to Nebula reflexes |
| World simulation | 6,000+ lines | Cloudflare Worker (KV state) |
| Economy system | 2,000+ lines | Cloudflare Worker + Durable Objects |
| AI agent layer | 4,000+ lines | Nebula slow-path + I2I coordination |
| Town/NPC system | 3,000+ lines | Reflex-based dialogue + I2I events |
| Wildlife | 2,500+ lines | Cron-triggered simulation |
| Tests | 226 tests | wrangler tests + smoketests |

### 6.2 Phase 1: Worker Shell (Day 1)

```bash
# Initialize Cloudflare Worker
cd craftmind-fishing
npx wrangler init --yes
npm install --save-dev vitest @cloudflare/vitest-pool-workers
```

```toml
# wrangler.toml
name = "craftmind-fishing"
main = "src/index.js"
compatibility_date = "2026-06-06"

[[kv_namespaces]]
binding = "FISHING"
id = "..."

[[kv_namespaces]]
binding = "WEATHER"
id = "..."

[[durable_objects.bindings]]
name = "ECONOMY"
class_name = "EconomyDurableObject"
```

### 6.3 Phase 2: Reflex Registration

```javascript
// src/index.js — Worker entry point
import { AutoRouter } from 'itty-router';
import { registerWithNebula } from './fleet/register.js';

const router = AutoRouter();

// Fleet integration endpoints
router.post('/api/agent/message', async (req, env) => {
  const { intent, context } = await req.json();
  // Forward to nebula for reflex processing
  return await handleMessage(intent, context, env);
});

router.post('/api/i2i', async (req, env) => {
  const bottle = await req.json();
  // Handle incoming I2I bottles (e.g., weather updates from other modules)
  return await handleBottle(bottle, env);
});

// Game-specific endpoints
router.get('/api/weather', async (req, env) => {
  return Response.json(await getWeather(env));
});

router.post('/api/fish', async (req, env) => {
  const { botId, location } = await req.json();
  return Response.json({
    result: await simulateFishCatch(location, env),
    advice: await getFishAdvice(location, env),
  });
});

// CRON: Weather refresh every 15 minutes
router.get('/__cron/weather', async (req, env) => {
  const weather = await fetchSitkaWeather();
  await env.WEATHER.put('current', JSON.stringify(weather));
  // Notify fleet
  await writeFleetNote('fishing', `Weather updated: ${weather.summary}`);
  return new Response('OK');
});

export default {
  fetch: router.fetch,
  scheduled: async (event, env, ctx) => {
    if (event.cron === '*/15 * * * *') {
      await fetch('http://internal/__cron/weather', { method: 'POST' });
    }
  },
};
```

### 6.4 Phase 3: Script → Reflex Compilation

```javascript
// scripts/compile-reflexes.js
// Converts personality scripts to Nebula teachable reflexes

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const scriptsDir = join(process.cwd(), 'src/mineflayer/scripts');
const output = [];

for (const file of readdirSync(scriptsDir)) {
  if (!file.match(/^v[0-9]+-.*\.js$/)) continue;
  const script = readFileSync(join(scriptsDir, file), 'utf-8');

  // Parse script steps to reflex format
  const reflexName = file.replace('.js', '');
  output.push({
    intent: `fishing script: ${reflexName} init`,
    action: { type: 'load_script', name: reflexName },
    tags: ['script', reflexName, 'init'],
  });
  output.push({
    intent: `fishing script: ${reflexName} loop`,
    action: { type: 'execute_script', name: reflexName, auto_loop: true },
    tags: ['script', reflexName, 'loop'],
  });
}

writeFileSync('scripts/compiled-reflexes.json', JSON.stringify(output, null, 2));
console.log(`Compiled ${output.length} reflexes from ${scriptsDir}`);
```

### 6.5 Phase 4: I2I Coordination

```javascript
// src/fleet/i2i.js — I2I bottle writer
export async function writeBottle(recipient, type, shard, env) {
  const bottle = {
    type,           // TASK, STATUS, CHECKPOINT, DELIVERABLE, etc.
    from: 'fishing',
    to: recipient,
    shard,
    timestamp: new Date().toISOString(),
  };

  // If Nebula is the rendezvous point
  await fetch(env.NEBULA_ENDPOINT + '/api/agent/task', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.AUTH_TOKEN}` },
    body: JSON.stringify({
      to: [recipient],
      intent: type,
      shard: bottle,
    }),
  });

  // Also write to construct-coordination (local git if available)
  const notePath = `notes/games/${recipient}/${new Date().toISOString().slice(0,10)}.md`;
  console.log(`[I2I] Writing bottle to ${notePath}`);
}

// Example: Fishing reports storm to Herding
export async function reportStorm(env) {
  await writeBottle('herding', 'TASK', {
    artifacts: {
      weather: 'storm',
      windSpeed: 45,
      estimatedDuration: '2h',
      action: 'recall_sheep',
    },
    reasoning: ['Storm detected in Sitka Sound',
      'High winds dangerous for open-pen flocks',
      'Automatic recall recommended',],
    blockers: [],
  }, env);
}
```

### 6.6 Workers KV State Layout

```javascript
// KV Namespace: FISHING

// Weather state (refreshed by cron)
// Key: weather:current
// Value: { tide: "high", temp: 52, wind: { speed: 15, dir: "SW" }, conditions: "partly_cloudy" }

// Script state (loaded once on deploy)
// Key: scripts:registry
// Value: ["v4-pure", "v4-friendly", ...]

// Player state (per player)
// Key: player:{playerId}:state
// Value: { mood: 0.8, energy: 0.6, script: "v4-pure", fishCaught: 42 }

// Economy state (Durable Object)
// Key: economy:markets
// Value: { salmon: 3.50/lb, halibut: 8.25/lb, ... }
```

---

## 7. Migration Roadmap

### Phase 0: Foundation (Week 1)
| Task | Effort | Owner |
|------|--------|-------|
| Create `agent-onboard.sh` script | 2d | Fleet ops |
| Create `make-me-app` template for craftmind repos | 3d | Fleet ops |
| Set up Cloudflare Workers + KV for each repo | 1d | Devops |
| Write Nebula agent registration endpoint (if not yet live) | 2d | Nebula |
| Design KV schema per module | 1d | Architecture |

### Phase 1: Quick Wins — Disc Golf + Circuits + Ranch (Week 2)
| Repo | Strategy | ETA |
|------|----------|-----|
| craftmind-discgolf | Static data (disc DB) → KV. Physics → determinstic hash. | 2d |
| craftmind-circuits | Challenges JSON → KV. Tutor bot → Nebula reflex. | 2d |
| craftmind-ranch | Evolution engine → Worker. DNA → KV. Dashboard → Pages. | 3d |

These three are self-contained, have no mineflayer dependency, and are small/buildable.

### Phase 2: AI Systems — Courses + Researcher (Week 3)
| Repo | Strategy | ETA |
|------|----------|-----|
| craftmind-courses | Teacher AI → Nebula slow path. Progress → KV. Skill trees → Pages. | 3d |
| craftmind-researcher | Discovery pipeline → I2I coordination. Knowledge → KV + vector search. | 3d |

These have significant LLM dependency; Nebula's slow path is a natural fit.

### Phase 3: Full Simulators — Herding + Studio (Week 4)
| Repo | Strategy | ETA |
|------|----------|-----|
| craftmind-herding | Boids → Worker (Durable Object for perf). Dog AI → reflexes. | 3d |
| craftmind-studio | Production pipeline → Worker. Director → slow path. Scripts → reflexes. | 4d |

### Phase 4: The Whale — Fishing (Weeks 5-6)
| Task | ETA |
|------|-----|
| Extract mineflayer as remote agent | 3d |
| Port world simulation to Worker | 3d |
| Compile 33 scripts to reflexes | 2d |
| Port economy to Durable Objects | 2d |
| Port town/NPC system | 3d |
| Port wildlife simulation | 2d |
| Integration testing | 2d |

### Phase 5: Fleet Integration (Week 7)
- Cross-game event bus (I2I for all inter-module communication)
- Agent dashboard (Cloudflare Pages, consolidated view)
- Blackboard integration (status notes from all 8 modules)
- Make-me-App auto-deploy for any fork

---

## 8. Risk Assessment

### 8.1 Migration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Mineflayer coupling** (5/8 repos use it) | High | Extract as remote bot agent; I2I bridge |
| **Synchronous LLM calls** (blocking bot) | High | Nebula slow path is async; refactor to promise pattern |
| **ESM/CJS interop** (fishing uses CJS for RCON) | Medium | Use createRequire() pattern (already documented) |
| **KV size limits** (fishing has 42K lines of game logic) | Low | Split across multiple KV namespaces + Durable Objects |
| **LLM provider lock-in** (all use ZAI glm-4.7-flash) | Medium | Nebula already has DeepInfra; add ZAI as second provider |
| **No CI/CD** across any module | Low | GitHub Actions + wrangler deploy as part of make-me-app |
| **No test coverage** for mineflayer integration | Medium | Integration tests in remote bot agent, not Worker |
| **Fishing's 33 scripts** need reflex compilation | Low | Automated compilation script (see §6.4) |

### 8.2 Key Decisions

1. **Don't rewrite — wrap.** Every craftmind module keeps its core logic. Only the integration layer (plugin registration → nebula reflex, file persistence → KV, direct calls → I2I) changes.

2. **Mineflayer stays out of Workers.** The mineflayer bot runs as a separate process/container. Workers send commands via I2I bottles. The bot reports back via DELIVERABLE bottles.

3. **Crates for game math.** Any craftmind module using non-trivial math (disc physics trajectory, boids flocking, redstone circuit analysis) could benefit from pythagorean48 / eisenstein-quantize crates via WASM-in-Worker.

4. **Nebula as single entry point.** All player-facing interactions route through Nebula's three-path system. Direct Worker endpoints exist for internal module-to-module communication.

5. **Blackboard for cross-module state.** When one module needs to know what another is doing, it reads the construct-coordination blackboard. No direct KV sharing between modules.

---

## Appendix A: Interface Contract Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     Interface Contracts                          │
├──────────────┬──────────────────────────┬───────────────────────┤
│ Component     │ Exposes (endpoint)       │ Consumes (intents)    │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Nebula       │ POST /api/agent/message  │ -- (entry point)      │
│              │ POST /api/agent/teach    │                       │
│              │ POST /api/agent/register │                       │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Fishing      │ GET  /api/weather        │ fish, weather,        │
│              │ POST /api/fish           │ economy, town interact │
│              │ POST /api/i2i            │                       │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Courses      │ POST /api/lesson         │ teach, quiz,          │
│              │ GET  /api/skill-tree     │ discovery, peer teach │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Circuits     │ POST /api/challenge      │ build, validate,      │
│              │ GET  /api/leaderboard    │ tutor, cross-game cmd │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Ranch        │ POST /api/evolve         │ evolve, assign task,  │
│              │ GET  /api/population     │ render dashboard      │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Herding      │ POST /api/herd           │ herd, score,          │
│              │ POST /api/simulate-flock │ course, teach         │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Researcher   │ POST /api/discover       │ discover, experiment, │
│              │ GET  /api/knowledge      │ review, cite          │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Studio       │ POST /api/produce        │ produce, direct,      │
│              │ POST /api/render         │ compose, score        │
├──────────────┼──────────────────────────┼───────────────────────┤
│ Disc Golf    │ POST /api/throw          │ recommend, simulate,  │
│              │ POST /api/scorecard      │ score, script         │
└──────────────┴──────────────────────────┴───────────────────────┘
```

## Appendix B: Reflex Inventory Template

Each craftmind module should maintain a `REFLEXES.md` documenting all teachable intents:

```markdown
# craftmind-ranch — Reflex Inventory

## Core Intents
| Intent Pattern | Path | Response Type | Auto-Teach |
|----------------|------|---------------|------------|
| "assign farm task: {task}" | Fast | {bot, species, location} | Yes |
| "evolve population: {generation}" | Slow | {dna, fitness, log} | Yes |
| "get population status" | Fast | {species, counts, health} | Yes |

## Event Intents (I2I-triggered)
| Intent | Trigger | Action |
|--------|---------|--------|
| "weather:storm" | Fishing I2I broadcast | Move animals indoors |
| "player:command:{cmd}" | Player chat | Execute ranch command |

## Control Intents
| Intent | Effect |
|--------|--------|
| "module:enable:ranch" | Start simulation loop |
| "module:disable:ranch" | Save state, stop simulation |
| "module:status:ranch" | Return health metrics |
```
