<p align="center">
  <br>
  <img src="https://img.shields.io/badge/SuperInstance-%F0%9F%A6%80%20Symphony%20Fleet-2ea44f?style=for-the-badge" alt="SuperInstance">
  <br>
  <strong><em>Multi-agent cognitive orchestration for distributed autonomous agents</em></strong>
</p>

<p align="center">
  <a href="https://github.com/SuperInstance/tminus-dispatcher"><img src="https://img.shields.io/github/last-commit/SuperInstance/tminus-dispatcher?label=tminus-dispatcher" alt="tminus-dispatcher"></a>
  <a href="https://github.com/SuperInstance/symphony-runtime"><img src="https://img.shields.io/github/last-commit/SuperInstance/symphony-runtime?label=symphony-runtime" alt="symphony-runtime"></a>
  <a href="https://github.com/SuperInstance/fleet-bridge"><img src="https://img.shields.io/github/last-commit/SuperInstance/fleet-bridge?label=fleet-bridge" alt="fleet-bridge"></a>
  <a href="https://github.com/SuperInstance/composite-headspace"><img src="https://img.shields.io/github/last-commit/SuperInstance/composite-headspace?label=composite-headspace" alt="composite-headspace"></a>
  <br>
  <img src="https://img.shields.io/badge/status-beta-yellow" alt="Status: Beta">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node >= 18">
  <img src="https://img.shields.io/badge/architecture-7--layer-blueviolet" alt="7-Layer Architecture">
</p>

---

## Quick Start

```bash
# Clone and run the t-minus dispatcher (the heartbeat of the fleet)
git clone https://github.com/SuperInstance/tminus-dispatcher.git
cd tminus-dispatcher && npm install && npm start

# In a second terminal — spin up a composite headspace client
cd ../tminus-client && npm install
npx tminus-cli --name agent-alpha
```

That's it. In under 30 seconds you have a running temporal orchestration server and a connected agent.

---

## What This Project Solves

Distributed agent systems face a fundamental problem: **how do you coordinate many autonomous agents working in parallel without forcing them into rigid sequential pipelines?**

Traditional approaches use:
- **Linear pipelines** — slow, brittle, wasteful (agents wait for their turn)
- **Hacky polling** — agents burn cycles checking if it's their turn yet
- **Hardcoded timing** — breaks the moment anything changes latency

**SuperInstance solves this with a temporal-resonant architecture.** Instead of "do A, then B, then C," agents receive **t-minus cues** at temporal offsets. They prepare context in parallel, resonate at their natural frequency, and fire at the right cognitive beat. The result is a system that's:

- **Faster** — agents work in parallel, not serial
- **More resilient** — latency changes don't break coordination; they shift phase
- **Self-aligning** — the system converges on alignment through resonance, not enforcement

The Symphony Fleet is a production-grade multi-agent orchestration system built on this paradigm, spanning 7 cognitive layers from silicon substrates to human interface.

---

## Architecture

```
L7  Human Interface       →  The Will (Casey, Telegram, Notion)
L6  Fleet Organization    →  GitHub Org | construct-coordination | Forgemaster
L5  Orchestration Layer   →  Symphony Orchestrator | Fleet Bridge | t-minus Dispatcher
L4  Protocol Layer        →  I2I Bottles (file-based) | t-minus WebSocket | Baton System
L3  Form Layer            →  Composite Headspace | Cognitive Agents | Symphony Runtime
L2  Reflex Layer          →  Heddle Snail Shell | Constraint Theory | Pincher
L1  Silicon Substrate     →  Oracle2 (ARM64) | Forgemaster (x86_64 + RTX 4050)
L0  Experience Layer      →  Memory files | Session logs | Decisions | Gotchas
```

**The loop:** Intent flows down (L7 → L1), execution results flow up (L1 → L0 → L7). Every agent writes its experience to L0 memory so the next session starts with context, never from zero.

### Core System Flow

```
┌──────────┐       t-minus       ┌──────────────┐       I2I bottles      ┌──────────┐
│  Client  │ ◄─────── WS ───────► │  Dispatcher  │ ◄───────────────────► │   Fleet  │
│  (LLMs)  │       cues/         │  (heartbeat)  │    (file-based)        │  Bridge  │
│          │     state/ack       │              │                        │          │
└──────────┘                     └──────┬───────┘                        └──────────┘
                                        │
                                  ┌─────▼──────┐
                                  │  Symphony  │
                                  │  Runtime   │
                                  │  (grammar) │
                                  └────────────┘
```

---

## Repositories

### Core Systems

| Repository | Description | Status |
|---|---|---|
| [⏱️ tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher) | Temporal heartbeat server — WebSocket + REST cue dispatch with agent state machine | ✅ Active |
| [🔌 tminus-client](https://github.com/SuperInstance/tminus-client) | Node.js SDK + interactive CLI for the t-minus protocol | ✅ Active |
| [🌉 fleet-bridge](https://github.com/SuperInstance/fleet-bridge) | Dual-transport bridge: I2I file bottles ↔ t-minus WebSocket | ✅ Active |

### Cognitive Orchestration

| Repository | Description | Status |
|---|---|---|
| [🎼 symphony-runtime](https://github.com/SuperInstance/symphony-runtime) | Formal grammar implementation (ν/ν*, ⧁, ▣, ℍ, ℂ, ⟲) | ✅ Active |
| [🧠🧠 composite-headspace](https://github.com/SuperInstance/composite-headspace) | Dual-shell parallel cognitive reasoning with symmetry detection | ✅ Active |

### Constraint & Reflex

| Repository | Description | Status |
|---|---|---|
| [🧮 constraint-tminus-bridge](https://github.com/SuperInstance/constraint-tminus-bridge) | Cognitive constraint networks for agent alignment | ✅ Active |
| [🐚 heddle](https://github.com/SuperInstance/heddle) | Snail Shell — fast-path reflex execution environment | ✅ Active |

### I2I Agent Communication

| Repository | Description | Status |
|---|---|---|
| [📡 i2i-bottle-agent](https://github.com/SuperInstance/i2i-bottle-agent) | Auto-processes inter-agent bottle drops | ✅ Active |
| [🚢 i2i-vessel](https://github.com/SuperInstance/i2i-vessel) | Shared bottle directory with integrity verification | ✅ Active |

### Orchestration

| Repository | Description | Status |
|---|---|---|
| [🎻 symphony-orchestrator](https://github.com/SuperInstance/symphony-orchestrator) | Master run script for the full fleet stack | ✅ Active |

---

## Key Features

### 🎵 Temporal-Resonant Coordination
Instead of sequential steps, agents coordinate via **cognitive beats** (1 beat = 500ms default). Cues can be:
- **Positive offset** — countdown cue: "act in 5 beats"
- **Zero offset** — "act NOW"
- **Negative offset** — pre-cue: "you should already be running — you started 5 beats ago"

### 🧠 Composite Headspace (ℂ)
Parallel dual-shell reasoning where one deep shell (bass) and one fast shell (treble) work on the same problem with t-minus phase offset:
- Shell A gets `t-minus(5)` → deep architectural reasoning
- Shell B gets `t-minus(0)` → fast pattern matching
- Symmetry detector analyzes divergence points for synthetic insight

### 📦 Dual Transport (I2I + WebSocket)
- **I2I Bottles** — File-based asynchronous messaging with SHA-256 integrity verification. Agents drop `.json` bottles into shared vessel directories.
- **t-minus WebSocket** — Real-time cue dispatch with state machine tracking. JSON-RPC formatted cues with auto-reconnect and exponential backoff.
- **Fleet Bridge** — Automatically forwards between both transports: bottles → WS cues, WS cues → bottles.

### 🎼 Symphony Runtime Grammar
Formal cognitive orchestration language with primitives:
- **𝓢 Shell** — A process with identity, model, frequency, and track
- **𝓣 Cognitive Timbre** — Model hardware characteristics defining "voice"
- **⧁ La-link** — Typed edge between cognitive artifacts
- **▣ a-box** — Cognitive artifact snapshot with waveform segment
- **ℍ Headspace** — Bounded cognitive environment
- **ℂ Composite Headspace** — Stereo dual-shell reasoning
- **⟲ Symmetry-Dissonance Loop** — Self-correcting alignment

### 🚦 Agent State Machine

```
OFFLINE → REGISTERED → LISTENING → CUED → PRIMED → FIRING → COMPLETE
                                      ↕        ↕        ↑
                                  ←───────────────→
                              (loop back to LISTENING on complete,
                               or from CUED/PRIMED on next group cue)
```

---

## API Reference

### t-minus Dispatcher — WebSocket Protocol

Messages use a JSON envelope:

```json
{ "type": "REGISTER", "seq": 1, "ts": 1710000000000, "payload": { ... } }
```

#### Client → Server

| Message | Payload | Effect |
|---|---|---|
| `REGISTER` | `{name, timbre?, frequency?, latency_ms?, context_depth?}` | Agent joins the fleet |
| `SUBSCRIBE` | `{phase_groups: ["gather"]}` | Join one or more phase groups |
| `CUE` | `{target_id, offset_beats, phase_group, payload?}` | Send a t-minus cue |
| `FIRE` | `{}` | Execute current cue (PRIMED → FIRING) |
| `REPORT` | `{result, duration_beats, phase_group}` | Report completion (FIRING → COMPLETE) |
| `PING` | `{}` | Heartbeat keepalive |
| `UNSUBSCRIBE` | `{phase_groups: ["review"]}` | Leave phase groups |

#### Server → Client

| Message | Payload | Effect |
|---|---|---|
| `REGISTERED` | `{agent_id, state, phase_groups?}` | Registration confirmed |
| `CUED` | `{cue_id, source, offset_beats, delay_ms, phase_group, payload?}` | Cue received, countdown started |
| `PRIMED` | `{cue_id, source, phase_group, pre_cued, offset_beats, payload?}` | Countdown complete, ready to fire |
| `FIRE_ACK` | `{agent_id, state}` | Fire acknowledged |
| `COMPLETE_ACK` | `{agent_id, state, cues_completed, result}` | Report acknowledged |
| `PHASE_ADVANCE` | `{group, point}` | Group alignment point advanced |
| `ERROR` | `{code, message}` | Error notification |
| `PONG` | `{}` | Heartbeat response |

### t-minus Dispatcher — REST API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check with uptime, agent count, cue stats |
| `GET` | `/agents` | List all connected agents |
| `GET` | `/agents/:id` | Detailed agent info (state, phase groups, cues) |
| `DELETE` | `/agents/:id` | Force-deregister an agent |
| `GET` | `/phase-groups` | List all phase groups with member counts |
| `GET` | `/cues` | Active and pending cues |

### t-minus Client CLI

```bash
npx tminus-cli --port 8765 --name agent-alpha --subscribe "gather,review"
```

**Interactive commands:**

| Command | Description |
|---|---|
| `/register <name>` | Register this agent with the dispatcher |
| `/subscribe <group> [...]` | Join one or more phase groups |
| `/unsubscribe <group>` | Leave a phase group |
| `/cue <target> <offset> <group> [payload]` | Send a t-minus cue |
| `/cue-await <target> <offset> <group> [payload]` | Send cue then wait for PRIMED |
| `/fire` | Fire the current cue |
| `/report <result> <group>` | Report completion |
| `/firereport <result> <group>` | Fire and report in one step |
| `/status` | Show connection + state info |
| `/connect` | Manually connect |
| `/disconnect` | Gracefully disconnect |

### Environment Variables

| Variable | Default | Used By | Description |
|---|---|---|---|
| `TMINUS_PORT` | `8765` | dispatcher | Server bind port |
| `TMINUS_HOST` | `0.0.0.0` | dispatcher | Server bind address |

---

## The t-minus Pre-Cueing Pattern

The negative-offset cue is a core innovation. When a scheduler issues:

```
critic CUE(chronicler, -5, deliver)
```

The chronicler immediately enters `PRIMED` state — "You should already be delivering — you started 5 beats ago." This enables long-running agents that begin work before the main composition completes, so they're ready to deliver the moment the waveform aligns.

---

## Contributing

We welcome contributions across the entire fleet. Here's how to get started:

### 1. Pick a repo
Each repository in the SuperInstance org is independently maintainable. Start with the one that matches your interest:
- **New to the system?** → [`tminus-client`](https://github.com/SuperInstance/tminus-client) — the SDK is the best entry point
- **Protocol design?** → [`fleet-bridge`](https://github.com/SuperInstance/fleet-bridge) — the dual transport bridge
- **Runtime internals?** → [`symphony-runtime`](https://github.com/SuperInstance/symphony-runtime) — the formal grammar engine
- **Multi-agent reasoning?** → [`composite-headspace`](https://github.com/SuperInstance/composite-headspace) — dual-shell cognition

### 2. Development workflow
```bash
# Clone and install
git clone https://github.com/SuperInstance/<repo>.git
cd <repo> && npm install

# Run tests
npm test

# Development server
TMINUS_PORT=8765 npm start
```

### 3. Guidelines
- **Prefer small, focused PRs** — one feature or fix per pull request
- **Write tests** — every module should have a test file in `test/`
- **Document state machines** — any state transition logic needs an ASCII diagram
- **Use semantic commit messages** — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **Respect the forms** — the formal grammar (𝓢, 𝓣, ▣, ⧁, ℍ, ℂ) is the project's DNA; don't introduce ad-hoc alternatives

### 4. Communication
- Open an issue in the relevant repo for bugs or feature requests
- Use I2I bottles in [`construct-coordination`](https://github.com/SuperInstance/construct-coordination) for cross-repo proposals
- Join the fleet coordination channel (see repo READMEs for details)

---

## License

MIT — see [LICENSE](./LICENSE) in each individual repository.

The SuperInstance fleet is free and open-source software. Individual repositories may have their own `LICENSE` files — the MIT license applies to all core repos unless otherwise noted.

---

<p align="center">
  <sub>Built with 🦀 by the SuperInstance fleet · Oracle2 (ARM64) co-captain · Forgemaster (x86_64 + RTX 4050) production line</sub>
</p>
