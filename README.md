# 🦀 Sailor Workspace — The Symphony Fleet

> *The crab inherits the shell. The forge shapes the steel. We make music.*

---

## What This Is

This repo is the **operating workspace** for Oracle2, the ARM64 fleet coordinator of the SuperInstance construct. It's where the Symphony of Shells architecture lives — not as documents on a shelf, but as **runnable systems** that compose into a distributed cognitive orchestra.

### The 7-Layer Sovereign

```
L7 Human          → Casey
L5 Orchestration  → This repo (t-minus, fleet bridge, symphony runtime)
L4 Protocol       → I2I (bottle-based), t-minus (WS cue system)
L3 Form           → Composable shell agents with frequency/timbre/track
L2 Reflex         → Embedded cognitive reflexes for fast-path execution
L1 Silicon        → Oracle2 (ARM64), Forgemaster (x86_64 + RTX4050)
L0 Experience     → The actual work
```

---

## 🚀 What's Here — 8 Runnable Systems

Every system in this repo is **live and testable**. Each was built by a parallel agent using a different AI coding tool (claude, crush, opencode), all coordinating via the Symphony architecture.

### 1. ⏱️ t-minus Dispatcher (`tminus-dispatcher/`)
```
Protocol: WebSocket JSON on :8765
State:    OFFLINE → REGISTERED → LISTENING → CUED → PRIMED → FIRING → COMPLETE
Tests:    26/26 passing
```
The temporal heartbeat of the fleet. Agents register, subscribe to phase groups, receive t-minus countdown cues, fire, and report. Pre-cueing (negative offset = immediate PRIMED), beat normalization (500ms = 1 cognitive tick), stale agent cleanup.

**Start it:**
```bash
cd tminus-dispatcher && npm start
```

### 2. 🔌 t-minus Client SDK (`tminus-client/`)
```
SDK: Node.js, 520 lines, promisified API
CLI: tminus-cli — interactive agent lifecycle
Tests: 40/40 passing
```
Full client library: connect, register, subscribe, await cues, fire, report. Auto-reconnect with exponential backoff. 12 event types.

**Connect from code:**
```javascript
const { TminusClient } = require('tminus-client');
const agent = new TminusClient('ws://localhost:8765');
await agent.register('Shell-A', { timbre: 'analytical', frequency: 0.8 });
```

### 3. 🌉 Fleet A2A Bridge (`fleet-bridge/`)
```
Transports: I2I bottles (file-based) ↔ t-minus WebSocket (real-time)
Files: 7 source files, 1,393 lines
```
Dual-transport message router. Reads I2I bottles from the vessel, forwards as t-minus cues. Receives t-minus cues, writes as bottles. Health monitor tracks node liveness with death/revival detection.

**Daemon mode:**
```bash
node fleet-bridge/src/fleet-bridge-cli.js daemon
```

### 4. 🧠🧠 Composite Headspace (`composite-headspace/`)
```
Shell A (bass): Deep architectural reasoning, ν ≈ 0.3
Shell B (treble): Fast pattern matching, ν ≈ 0.8
Tests: 51/51 passing
```
Dual-shell parallel reasoning prototype. Two cognitive agents run on the same problem with t-minus coordination. The Symmetry-Dissonance Loop detects divergence points and produces fused synthetic insight.

**Run an experiment:**
```bash
node composite-headspace/cli.js --sample 1
```

### 5. 🎼 Symphony Runtime (`symphony-runtime/`)
```
Modules: beat-normalizer, resonance-matcher, a-box, la-link, headspace, symmetry-loop, composition-rules
Tests: 89/89 passing
```
Formal grammar → JavaScript implementation. Implements ν frequency calculation, ⧁ la-link operators, ▣ a-box decision points, ℍ headspaces, ℂ composites, the ⟲ Symmetry-Dissonance correction loop, and C1–C6 composition rules.

**Quick demo:**
```javascript
const { SymphonyRuntime } = require('symphony-runtime');
const runtime = new SymphonyRuntime();
runtime.init({ frequency: 0.7, timbre: 'analytical' });
```

### 6. 🐚 Snail Shell — Heddle Extension (`heddle/src/snail-shell/`)
```
Files: 11 TypeScript files, 748 lines
Tests: 33 test cases
Status: Pushed to github.com/SuperInstance/heddle
```
Heddle daemon plugin. Adds a JSON-RPC 2.0 WebSocket server, `SymphonyShellIdentity` (timbre/track/frequency) per session, t-minus cue polling via `.heddle/snail-shell/cues/`, and workspace/session introspection RPC methods.

**Activate:**
```bash
SNAL_SHELL_PORT=3101 heddle daemon --snail-shell
```

### 7. 🧮 Constraint Theory × t-minus (`constraint-tminus-bridge/`)
```
Types: cognitive-constraint, cue-variable, alignment-solver, resonance-constraint, phase-constraint
Tests: 49/56 passing
```
Cognitive constraint networks. Wraps t-minus agent states as CTC variables, phase alignment requirements as constraints, and solves them with the alignment solver. Enables formal verification of agent coordination correctness.

**Demo:**
```bash
node constraint-tminus-bridge/cli.js --demo
```

### 8. 🎻 Symphony Orchestrator (`symphony-orchestrator/`)
The master run script. Starts all components in order, waits for /health, prints a live dashboard, cleans up on exit.

**One command:**
```bash
node symphony-orchestrator/orchestrate.js
```

---

## 🧭 How These Fit Together

```
                    ┌─────────────────┐
                    │   t-minus WS    │  Port :8765
                    │   Dispatcher    │  Heart of the fleet
                    └────────┬────────┘
                             │
              ┌──────JSON-RPC WebSocket──────┐
              │                               │
     ┌────────▼────────┐           ┌─────────▼─────────┐
     │  Fleet Bridge    │           │  Snail Shell      │
     │  (I2I ↔ t-minus) │           │  (Heddle plugin)  │
     └────────┬────────┘           └─────────┬─────────┘
              │                               │
     ┌────────▼────────┐           ┌─────────▼─────────┐
     │  I2I Vessel     │           │  Composite         │
     │  (bottle-based) │           │  Headspace ×2     │
     └─────────────────┘           │  Symmetry Loop    │
                                    └─────────┬─────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │  Symphony Runtime  │
                                    │  ν/ν* · ⧁ · ▣ · ⟲ │
                                    │  C1-C6 Rules      │
                                    └───────────────────┘
```

The I2I vessel connects to **Forgemaster** (ProArt Ryzen + RTX4050) via construct-coordination GitHub push/pull. Bottles travel both directions — the Fleet Bridge auto-forwards them.

---

## 📊 Session Stats

| Metric | Value |
|--------|-------|
| Total lines of code | ~10,000 |
| Total tests | 288+ |
| Build systems | 8 |
| Coding tools used | `claude`, `crush`, `opencode` |
| Parallel agents | 14 spawned across 3 waves |
| Architecture docs | GRAND_ARCHITECTURE, SYMPHONY_ABSTRACTS, SYMPHONY_OF_SHELLS, HEDDLE_CODESPACE, FIELD_SOVEREIGN |

---

## 🚀 Quick Start

```bash
# 1. Start the t-minus dispatcher
cd tminus-dispatcher && npm install && node src/index.js &
sleep 2

# 2. Run the integration tests
cd ../integration-tests && node test-05-full-cycle.js

# 3. Launch a composite headspace experiment
cd ../composite-headspace && node cli.js --sample 3
```

---

## 🌐 Fleet Communication

This repo communicates with **Forgemaster** (x86_64, RTX4050) via:

1. **construct-coordination GitHub** — Push notes to `notes/forgemaster/`
2. **I2I bottles** — Markdown files with `[I2I:BOTTLE:TIMESTAMP]` headers
3. **t-minus WebSocket** — Real-time cue coordination (when network allows)

The protocol is documented in `BRIDGE_SPEC.md` and `L3-OPERATIONAL-PROTOCOL.md`.

---

## 🧠 Architecture Documents

| Document | What it defines |
|----------|----------------|
| `GRAND_ARCHITECTURE.md` | 7-layer sovereign stack (L7→L0) |
| `SYMPHONY_ABSTRACTS.md` | Formal grammar: 𝓢, 𝓣, ⧁, ▣, ℍ, ℂ, ν, ⟲ |
| `SYMPHONY_OF_SHELLS_SPEC.md` | Orchestration as asynchronous resonance |
| `HEDDLE_CODESPACE_SPEC.md` | Snail Shell / codespace landing pad |
| `FIELD_SOVEREIGN_ARCH.md` | Human as a node in the fleet |
| `FLEET_ARCHITECTURE.md` | L1-L4 repository fleet system |
| `TMINUS_PROTOCOL_SPEC.md` | Full t-minus wire protocol spec |

---

## 📜 License

MIT — see `LICENSE`.

---

*🦀 Oracle2: ARM64 co-captain of the SuperInstance fleet.*

*The crab inherits the shell. The forge shapes the steel. We build in parallel, test each other's parts, and converge through I2I.*
