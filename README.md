# 🦀 Sailor Workspace — The Symphony Fleet

> *The crab inherits the shell. The forge shapes the steel. We make music.*

---

This is your private operating workspace for Oracle2, the ARM64 fleet coordinator of the SuperInstance construct. This repo stores:

1. **Documents & specifications** — Symphony architecture, I2I protocol, formal grammar
2. **Meta scripts & orchestration** — orchestration tools, health checks
3. **Reference implementations & tests** — temporary test code, prototypes
4. **Coordination notes** — I2I bottles, Forgemaster/Oracle2 exchanges

---

## 🚀 Official SuperInstance Repositories

All production systems are now in their own standalone repos:

### Core Systems
- [⏱️ t-minus Dispatcher](https://github.com/SuperInstance/tminus-dispatcher) — Temporal heartbeat for distributed agent orchestration
- [🔌 t-minus Client SDK](https://github.com/SuperInstance/tminus-client) — Node.js client library + CLI
- [🌉 Fleet A2A Bridge](https://github.com/SuperInstance/fleet-bridge) — Dual transport: I2I bottles ↔ t-minus WebSocket

### Cognitive Orchestration
- [🎼 Symphony Runtime](https://github.com/SuperInstance/symphony-runtime) — Formal grammar implementation (ν/ν*, ⧁, ▣, ℍ, ℂ, ⟲)
- [🧠🧠 Composite Headspace](https://github.com/SuperInstance/composite-headspace) — Dual-shell parallel cognitive reasoning

### I2I Agent Communication
- [📡 I2I Bottle Agent](https://github.com/SuperInstance/i2i-bottle-agent) — Auto-processes inter-agent bottle drops
- [🧮 Constraint × t-minus](https://github.com/SuperInstance/constraint-tminus-bridge) — Cognitive constraint networks for agent alignment

### Orchestration Tools
- [🎻 Symphony Orchestrator](https://github.com/SuperInstance/symphony-orchestrator) — Master run script for the full fleet stack

---

## 📐 Infrastructure Layers

```
L7 Human          → Casey
L5 Orchestration  → Symphony Orchestrator | Fleet Bridge | t-minus Dispatcher
L4 Protocol       → I2I Bottles | t-minus WS
L3 Form           → Composite Headspace | Cognitive Agents
L2 Reflex         → Heddle Snail Shell | Constraint Theory
L1 Silicon        → Oracle2 (ARM64) | Forgemaster (x86_64 + RTX4050)
L0 Experience     → The actual work
```

---

## 📜 Coordination

Communicate with Forgemaster (and the rest of the fleet) via:
1. **construct-coordination repo** — Push notes to `notes/forgemaster/` (bottle format documented in BRIDGE_SPEC.md)
2. **I2I bottle agent** — Auto-processes bottle drops between fleets
3. **t-minus WebSocket** — Real-time cue coordination when network access allows

---

## 🧠 Architecture Docs

Copies of the formal specs can be found in `docs/`:
- `GRAND_ARCHITECTURE.md` — 7-layer sovereign stack
- `SYMPHONY_ABSTRACTS.md` — Formal grammar: 𝓢, 𝓣, ⧁, ▣, ℍ, ℂ, ν, ⟲
- `SYMPHONY_OF_SHELLS_SPEC.md` — Orchestration as asynchronous resonance
- `HEDDLE_CODESPACE_SPEC.md` — Snail Shell / codespace landing pad

---

## 📜 License

MIT — see `LICENSE`.

---

🦀 Oracle2: ARM64 co-captain of the SuperInstance fleet | Workspace root: `/home/ubuntu/.openclaw/workspace`
