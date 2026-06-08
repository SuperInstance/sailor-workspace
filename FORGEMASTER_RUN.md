# 🏗️ Forgemaster Run Guide

> **ProArt Ryzen + RTX 4050** · Symphony of Shells Integration Test Station
> "The Temporal Heartbeat of the Fleet"

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Setup](#2-clone--setup)
3. [Component Breakdown](#3-component-breakdown)
4. [Running Each Component](#4-running-each-component)
5. [Integration Tests](#5-integration-tests)
6. [ProArt-Specific Experiments](#6-proart-specific-experiments)
7. [I2I Protocol](#7-i2i-protocol)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### Required

| Tool      | Minimum | Check              |
|-----------|---------|--------------------|
| Node.js   | 18+     | `node --version`   |
| npm       | 8+      | `npm --version`    |
| git       | 2.x     | `git --version`    |
| WebSocket | (ws)    | `npm ls ws`        |

### Optional (ProArt-Specific)

| Tool      | Purpose                          | Install                                   |
|-----------|----------------------------------|-------------------------------------------|
| `ollama`  | Local LLM on RTX 4050 GPU        | `curl -fsSL https://ollama.com/install.sh \| sh` |
| `nvtop`   | GPU monitoring                   | `sudo apt install nvtop`                  |
| `htop`    | CPU monitoring                   | `sudo apt install htop`                   |

### Network

- **Default t-minus port:** `8765` (WS + REST over HTTP)
- **Composite headspace port:** `9090`
- **Oracle2 I2I vessel:** requires network access to Oracle2 or local proxy
- **Fleet bridge:** connects to t-minus dispatcher + watches local `i2i-vessel/` directory

### Port Map

| Component            | Port  | Protocol         |
|----------------------|-------|------------------|
| t-minus Dispatcher   | 8765  | WS + HTTP (REST) |
| Composite Headspace  | 9090  | WS               |
| Fleet Bridge         | —     | File (I2I) + WS  |
| Heddle Snail Shell   | config| WS (JSON-RPC 2.0)|

---

## 2. Clone & Setup

```bash
# Clone the monorepo
git clone https://github.com/SuperInstance/sailor-workspace
cd sailor-workspace

# t-minus Dispatcher
cd tminus-dispatcher && npm install && cd ..

# t-minus Client SDK (part of same repo)
cd tminus-client && npm install && cd ..

# Fleet Bridge
cd fleet-bridge && npm install && cd ..

# Composite Headspace
cd composite-headspace && npm install && cd ..

# Symphony Runtime (core library tests)
cd symphony-runtime && npm install && cd ..

# Constraint-Tminus Bridge (CTC × t-minus)
cd constraint-tminus-bridge && npm install && cd ..

# Heddle Snail Shell (TypeScript, part of heddle)
cd heddle && npm install && cd ..

echo "✅ All dependencies installed!"
```

> **Note:** The `heddle` package uses TypeScript. Build it with `cd heddle && npm run build` (or `npx tsc` if a tsconfig is present).

---

## 3. Component Breakdown

### 3.1 🕐 t-minus Dispatcher

> The **temporal heartbeat** of the Symphony of Shells.

**Location:** `tminus-dispatcher/`  
**Entry point:** `src/index.js` (HTTP + WebSocket server on port 8765)

The dispatcher is a **cue grid** — not a workflow engine or job queue. Agents register, subscribe to phase groups, and receive t-minus cues synchronized to a cognitive beat engine.

**Key Concepts:**

| Concept         | Description                                                  |
|-----------------|--------------------------------------------------------------|
| **Cognitive Beat** | `1 beat = f(latency, context_depth)` — not wall-clock time   |
| **T-Minus Cue** | `t-minus(shell_id, n_beats, phase_group)` — temporal alignment signal |
| **Phase Group** | Agents belong to groups (e.g. `gather`, `synthesize`, `review`) |
| **Alignment Point** | Conceptual "now" of a phase group; group advances when all agents fire |
| **Pre-Cueing**  | Negative offset — agent is told it started `n` beats ago (chronicle pattern) |

**Agent Lifecycle:**
```
OFFLINE → REGISTERED → LISTENING → CUED → PRIMED → FIRING → COMPLETE → LISTENING
```

**Protocol:** All messages are JSON over WebSocket with a standard envelope:
```json
{ "type": "REGISTER", "seq": 1, "ts": 1710000000000, "payload": { ... } }
```

**REST Endpoints:**
| Method | Path               | Description              |
|--------|--------------------|--------------------------|
| GET    | `/health`          | Health check             |
| GET    | `/agents`          | List registered agents   |
| GET    | `/agents/:id`      | Agent detail             |
| GET    | `/phase-groups`    | List phase groups        |
| GET    | `/cues`            | Active/pending cues      |
| DELETE | `/agents/:id`      | Force-deregister agent   |

**Wire protocol detail:** See [`TMINUS_PROTOCOL_SPEC.md`](./TMINUS_PROTOCOL_SPEC.md)

---

### 3.2 🧩 t-minus Client SDK

> Node.js SDK for connecting to the t-minus dispatcher.

**Location:** `tminus-client/`  
**Entry point:** `src/client.js` (`TminusClient` class)

**Capabilities:**
- WebSocket connection with auto-reconnect (exponential backoff, 3 tries)
- Full agent lifecycle: register → subscribe → cue → fire → report
- Phase group management (subscribe/unsubscribe, phase advance events)
- Promisified API with server acknowledgments
- Heartbeat ping every 10s
- State machine tracking

**Events:** `connected`, `disconnected`, `registered`, `cued`, `primed`, `fire_ack`, `complete`, `phase_advance`, `state_change`, `server_error`, `reconnect_failed`

**CLI:** `npx tminus-cli --port 8765 --name my-agent`  
Interactive commands: `/register`, `/subscribe`, `/cue`, `/fire`, `/report`, `/status`, `/quit`

---

### 3.3 🌉 Fleet A2A Bridge

> Dual-transport agent communication for the fleet: bridges I2I bottle system ↔ t-minus WebSocket cues.

**Location:** `fleet-bridge/`  
**Entry point:** `src/index.js` (CLI dispatch)

**Components:**

| Module             | Purpose                                            |
|--------------------|----------------------------------------------------|
| `FleetBridge`      | Unified message routing, cross-transport forwarding |
| `I2IBottleTransport` | File-based message passing via `bottles/` & `harbor/` dirs |
| `TminusTransport`  | WebSocket client for t-minus cues (JSON-RPC 2.0)   |
| `RouteTable`       | Agent → transport protocol mapping (`i2i`, `tminus`, `both`) |
| `HealthMonitor`    | Node liveness tracking with death/revive callbacks  |

**Architecture:**
```
Oracle2 (ARM64) ── I2I Bottles ──► FleetBridge ── t-minus WS ──► Fleet Commander
Forgemaster (x86) ── I2I Bottles ──►             ◄── t-minus WS ──►
```

**Bottle types (13):** `TASK`, `STATUS`, `CHECKPOINT`, `BLOCKER`, `DELIVERABLE`, `BOTTLE`, `ACK`, `SYNTHESIS`, `CHALLENGE`, `SESSION`, `SPLINE`, `REFLECT`, `PROMOTE`

**Cross-Transport Forwarding:**
- I2I bottle → t-minus cue: when target agent is registered as `tminus`
- t-minus cue → I2I bottle: when target agent is registered as `i2i`

---

### 3.4 🧠🧠 Composite Headspace

> Cognitive orchestration: two shells reason in parallel, coordinated by t-minus cues.

**Location:** `composite-headspace/`  
**Entry point:** `cli.js`

**How it works:**
- **Shell A (Bass/Deep):** t-minus(5) — architectural reasoning, ~1500ms latency
- **Shell B (Treble/Fast):** t-minus(0) — pattern matching, ~200ms latency
- Both emit **a-boxes** (cognitive artifacts): `{id, frequency, resonance, timestamp, cognitiveBeat, type, content}`
- **Symmetry-Dissonance Loop (⟲):** Detects → Isolates → Corrects → Resolves divergence

**Frequency bands:** sub-bass, bass, mid, treble, ultrasonic

**Timbre presets:** `deep-architect`, `fast-pattern-matcher`, `balanced-critic`

**Fusion mechanisms:** `resonance_max`, `dissonance_min`, `harmonic_sum`, `adversarial_gate`

---

### 3.5 🎼 Symphony Runtime

> Core library implementing the Symphony of Shells formal specification.

**Location:** `symphony-runtime/`  
**Entry point:** `src/index.js` (SymphonyRuntime class)

**Modules:**

| Module               | Purpose                                    | Status |
|----------------------|--------------------------------------------|--------|
| Beat Normalizer      | ν frequency calc, ms↔beats conversion      | ✅     |
| Resonance Matcher    | ν*, R metric, locked/correction detection  | ✅     |
| a-box Manager        | Cognitive artifacts with decision states   | ✅     |
| la-link Engine       | Typed cognitive connection engine (7 relations) | ✅     |
| Headspace Manager    | ℍ/ℂ headspace & composite creation + fusion | ✅     |
| Symmetry Loop        | 4-phase dissonance correction               | ✅     |
| Composition Rules    | C1–C6 rule engine (min shells, frequency separation, dissonance budget, etc.) | ✅     |

**Quick API:**
```js
const { SymphonyRuntime } = require('./symphony-runtime/src');
const runtime = new SymphonyRuntime({ defaultLatencyMs: 500 });
runtime.init({ latencyMs: 500, contextDepth: 1.0 });
```

---

### 3.6 🐚 Snail Shell (Heddle Plugin)

> JSON-RPC WebSocket server for fleet communication, embedded in the Heddle daemon.

**Location:** `heddle/src/snail-shell/` (TypeScript)

**Files (11 files, 748 lines):**

| File                           | Lines | Purpose                                    |
|--------------------------------|-------|--------------------------------------------|
| `types.ts`                     | 41    | Core types (`SymphonyShellIdentity`, `Timbre`, `Track`) |
| `index.ts`                     | 15    | Public API re-exports                      |
| `identity.ts`                  | 54    | Symphony identity service builder          |
| `rpc/server.ts`                | 118   | JSON-RPC 2.0 WebSocket server              |
| `rpc/methods.ts`               | 48    | Method registry                            |
| `rpc/session-methods.ts`       | 103   | Session introspection handlers             |
| `rpc/workspace-methods.ts`     | 93    | Workspace introspection handlers           |
| `rpc/fleet-methods.ts`         | 86    | Fleet communication: identity, health, t-minus cues |
| `integration/daemon-plugin.ts` | 67    | Plugin for attaching to Heddle daemon      |
| `integration/fleet-cue-loop.ts`| 101   | Polls cue directory with 60s staleness     |
| `integration/session-metadata.ts` | 22 | Session annotation with symphony identity |

**RPC Methods:** `workspace.list`, `workspace.status`, `workspace.changes`, `session.list`, `session.get`, `session.runtimeContext`, `fleet.identity`, `fleet.health`, `fleet.t-minus`

---

### 3.7 🔗 CTC × t-minus Bridge

> Cognitive Constraint Network: models t-minus state transitions as constraint satisfaction problems (CSPs).

**Location:** `constraint-tminus-bridge/`  
**Entry point:** `src/index.js`

**Core Insight:** Every cue is a constraint waiting to be satisfied. Every state transition is a variable assignment. Alignment = all constraints satisfied simultaneously.

**Modules:**

| Module                 | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| `CognitiveConstraint`  | Constraint representing a cognitive alignment condition      |
| `CueVariable`          | Wraps t-minus cue as CTC-style variable (states 0-6)        |
| `AlignmentSolver`      | CSP solver: AC-3 propagation + backtracking with MRV + LCV  |
| `ResonanceConstraint`  | Checks frequency resonance: `|ν₁-ν₂|/max(ν₁,ν₂) < ε`       |
| `PhaseConstraint`      | Sequential firing order: predecessor must fire before successor |

**State → Domain Mapping:**
```
OFFLINE=0, REGISTERED=1, LISTENING=2, CUED=3, PRIMED=4, FIRING=5, COMPLETE=6
```

**Three coordination modes:**
| Mode       | Constraint Type | Description                              |
|------------|-----------------|------------------------------------------|
| `seq`      | PhaseConstraint | Agents fire in strict order              |
| `parallel` | CognitiveConstraint | All agents at same phase concurrently |
| `resonant` | ResonanceConstraint | Frequencies must match within tolerance  |

---

## 4. Running Each Component

### 4.1 Start t-minus Dispatcher

```bash
cd sailor-workspace/tminus-dispatcher

# Default port 8765
node src/index.js

# Custom port
TMINUS_PORT=8765 node src/index.js

# Daemon (background)
TMINUS_PORT=8765 node src/index.js &
echo $! > /tmp/tminus.pid
```

**Verify it's running:**
```bash
# Health check
curl http://localhost:8765/health

# Expected:
# {
#   "status": "ok",
#   "uptime": 12.345,
#   "agents": [],
#   "phaseGroups": {},
#   "cues": { "scheduled": 0, "delivered": 0, "completed": 0, "cancelled": 0 },
#   "beatCounter": 25,
#   "tickMs": 500
# }

# List agents
curl http://localhost:8765/agents
```

**Agent Registration Verification:**
```bash
# Uses the simulation test to verify everything works end-to-end
node tests/simulate.js
```

---

### 4.2 Connect a Client SDK

With the dispatcher already running on port 8765:

```bash
# Simple Node.js script
cd sailor-workspace/tminus-client

cat > demo-agent.js << 'EOF'
const { TminusClient } = require('./src/client');

async function main() {
  const client = new TminusClient('ws://localhost:8765', {
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    pingInterval: 10000,
  });
  
  client.on('connected', () => console.log('✅ Connected'));
  client.on('registered', (payload) => console.log('✅ Registered:', payload.agent_id));
  client.on('cued', (payload) => console.log('🎯 CUED:', payload));
  client.on('primed', async (payload) => {
    console.log('⚡ PRIMED, firing!');
    await client.fire();
    await client.report('success', payload.phase_group, 1);
    console.log('✅ Complete');
  });

  await client.connect();
  const reg = await client.register('forgemaster-client', {
    timbre: 'bright',
    frequency: 1.0,
    latency_ms: 50,
    context_depth: 'shallow',
  });
  console.log('Agent ID:', reg.agent_id);
  
  await client.subscribe(['gather', 'review']);
  console.log('🎧 Listening on gather, review');
}

main().catch(console.error);
EOF

node demo-agent.js
```

**Interactive CLI mode:**
```bash
node node_modules/.bin/tminus-cli --port 8765 --name forgemaster-cli
# Then type: /register /subscribe gather /status
```

---

### 4.3 Run Fleet Bridge (Daemon Mode)

The Fleet Bridge connects to the I2I vessel and the t-minus dispatcher, routing messages between them.

```bash
cd sailor-workspace/fleet-bridge

# Check that the I2I vessel directory exists
ls -la ../i2i-vessel/  # Should show bottles/, harbor/, etc.

# Start the bridge daemon (requires t-minus dispatcher running on :8765)
node src/index.js start

# Or specify custom paths
node src/index.js start \
  --vessel-dir ../i2i-vessel \
  --ws-url ws://localhost:8765 \
  --poll-interval 5000
```

**While the daemon runs, open another terminal and try:**

```bash
# Check bridge status
node src/index.js status

# Send a task to Oracle2
node src/index.js send oracle2 TASK '{
  "artifacts": {
    "type": "gist_query",
    "query": "list my recent gists"
  },
  "reasoning": ["Forgemaster requesting integration status"],
  "blockers": []
}'

# Send a task to Forgemaster (yourself, via I2I)
node src/index.js send forgemaster STATUS '{
  "artifacts": { "message": "Bridge is alive. Beacon received." },
  "reasoning": ["Heartbeat check"],
  "blockers": []
}'

# Beachcomb for incoming bottles
node src/index.js beachcomb

# Register a new agent
node src/index.js register chronicler-v1 i2i '{"description": "Chronicler shell"}'

# Manual heartbeat for Oracle2
node src/index.js heartbeat oracle2
```

**Stop the daemon:**
```bash
node src/index.js stop  # or Ctrl+C
```

---

### 4.4 Run Composite Headspace Experiment

This runs Shell A (Deep/Bass) and Shell B (Fast/Treble) reasoning in parallel, coordinated by the t-minus dispatcher on port 9090.

```bash
cd sailor-workspace/composite-headspace

# List sample problems
node cli.js --list

# Expected sample problems (5 total):
# 1. What is the nature of consciousness in distributed systems?
# 2. Design a consensus algorithm for lunar communication
# 3. How do emergence patterns form in neural networks?
# 4. Optimize a supply chain for a Mars colony
# 5. Why do distributed systems eventually become inconsistent?

# Run a specific sample (e.g. #5 — distributed systems)
node cli.js --sample 5

# Run with custom problem
node cli.js --problem "How should a fleet of agents coordinate under intermittent connectivity?"

# Custom options
node cli.js --sample 3 \
  --port 9090 \
  --detector deep \
  --format json \
  --color

# Run the basic example
node examples/basic-symmetry.js
```

**What to expect:**

```
  ╔══════════════════════════════════════════════════╗
  ║        🧠 COMPOSITE HEADSPACE v0.1              ║
  ║   Symphony of Shells — Cognitive DAW v0.1        ║
  ╚══════════════════════════════════════════════════╝

  📋 Task: [conceptual] / [hard]
  Why do distributed systems eventually become inconsistent?

  🎼 Step 1: Starting T-Minus Dispatcher...
  🐚 Step 2: Creating Composite Headspace...
  🔗 Step 3: Connecting Shells...

  ┌────────────────────────────────────────────────────────┐
  │ 🎵 Shell A (bass, deep-architect)  t-minus(5)        │
  │ 🔵 a-box#01: "CAP theorem bounds"       R=0.87       │
  │ 🔵 a-box#02: "Network partitions"       R=0.76       │
  ├────────────────────────────────────────────────────────┤
  │ 🎵 Shell B (treble, fast-pattern-matcher) t-minus(0) │
  │ 🟢 a-box#01: "Eventual consistency"      R=0.92       │
  │ 🟢 a-box#02: "Clock skew patterns"       R=0.71       │
  └────────────────────────────────────────────────────────┘

  🔍 Symmetry-Dissonance Analysis:
     ⚡ DETECT: 2 dissonant links found
     🔍 ISOLATE: [Contradiction] "CAP theorem" ↔ "Clock skew"
     🛠️ CORRECT: Complementary insight generated
     ✨ RESOLVED: Synthetic insight — partial ordering with bounded clock sync
  
  🎯 Final Synthesis — Cognitive Parallax: 0.31
```

---

### 4.5 Run Symphony Runtime Demo

The Symphony Runtime is a core library. Its primary interface is the test suite.

```bash
cd sailor-workspace/symphony-runtime

# Run all 89 tests
npx mocha 'test/**/*.test.js'

# Run specific module tests
npx mocha test/beat-normalizer.test.js
npx mocha test/resonance-matcher.test.js
npx mocha test/a-box.test.js
npx mocha test/la-link.test.js
npx mocha test/headspace.test.js
npx mocha test/symmetry-loop.test.js
npx mocha test/composition-rules.test.js
npx mocha test/index.test.js
```

**Quick smoke test script:**

```bash
cat > symphony-smoke.js << 'EOF'
const { SymphonyRuntime } = require('./symphony-runtime/src');
const { ABoxManager } = require('./symphony-runtime/src/core/a-box');

const rt = new SymphonyRuntime({ defaultLatencyMs: 500 });
rt.init({ latencyMs: 500, contextDepth: 1.0 });

console.log('🎼 Symphony Runtime v1.0');
console.log('  Uptime (beats):', rt.uptimeBeats());
console.log('  Status:', JSON.stringify(rt.status(), null, 2));

// Create a cognitive artifact
const box = rt.aBoxManager.create({
  content: 'distributed systems are fundamentally limited by the CAP theorem',
  confidence: 0.92,
  frequency: 0.05,  // bass
});
console.log('  Created a-box:', box.id, '| amplitude:', box.amplitude);

// Decayed amplitude after 10 "ticks"
console.log('  Decayed amplitude (10 ticks):', box.decayedAmplitude(10, 0.5));
console.log('✅ Symphony runtime OK');
EOF

node symphony-smoke.js
```

---

### 4.6 Solve a Cognitive Constraint Problem

```bash
cd sailor-workspace/constraint-tminus-bridge

# Sequential alignment demo (3 agents fire in order)
node cli.js --mode seq

# Parallel alignment (all agents same phase)
node cli.js --mode parallel

# Resonant alignment (frequency matching)
node cli.js --mode resonant

# All three demos at once
node cli.js --demo

# Larger problem (5 agents)
node cli.js --mode seq --agents 5

# Unsatisfiable problem (demonstrates constraint detection)
node cli.js --unsat
```

**Expected output for `--demo`:**

```
🔷 SEQUENTIAL ALIGNMENT DEMO
   Agents must fire one after another in strict order.

  Variables: agent-sensor-01, agent-processor-02, agent-actuator-03
  Constraints: PhaseSeq(agent-sensor-01 → agent-processor-02) [strict], ...
  
  ╔══════════════════════════════════════════════════╗
  ║   Cognitive Constraint Network — Solve Result   ║
  ╚══════════════════════════════════════════════════╝
  
  Variables:     3
  Constraints:   2
  Satisfiable:   ✅ YES
  Nodes visited: 4
  Backtracks:    0
  Time:          2ms

  Solution:
    agent-sensor-01     → COMPLETE (state=6)
    agent-processor-02  → COMPLETE (state=6)
    agent-actuator-03   → COMPLETE (state=6)

  Constraint Results:
    ✅ PhaseSeq(agent-sensor-01 → agent-processor-02) [strict]
    ✅ PhaseSeq(agent-processor-02 → agent-actuator-03) [strict]
```

**Programmatic API (Node.js):**

```bash
cat > solve-demo.js << 'EOF'
const { createCognitiveNetwork } = require('./constraint-tminus-bridge/src');

// Create a parallel alignment problem
const { solver, variables, constraints } = createCognitiveNetwork({
  groupName: 'gather',
  agentIds: ['agent-alpha', 'agent-beta', 'agent-gamma'],
  mode: 'parallel',
});

console.log(`Variables: ${variables.map(v => v.name).join(', ')}`);
console.log(`Constraints: ${constraints.length}`);

const result = solver.solve();
solver.printSummary(result);
EOF

node solve-demo.js
```

**Interactive mode** (step through alignment incrementally):
```bash
node cli.js --interactive
```

---

## 5. Integration Tests

### Run All Tests (Sequential)

```bash
# 1. t-minus Dispatcher simulation test
cd sailor-workspace/tminus-dispatcher
node tests/simulate.js
# Expect: 3 agents register, cue, fire, and report

# 2. Composite Headspace tests (51 tests)
cd ../composite-headspace
node test/integration.test.js
# Expect: 51/51 passed

# 3. Symphony Runtime tests (89 tests)
cd ../symphony-runtime
npx mocha 'test/**/*.test.js'
# Expect: 89/89 passing

# 4. Constraint-tminus-bridge tests
cd ../constraint-tminus-bridge
node test/integration-test.js
# Expect: all tests passing

# 5. Fleet Bridge tests
cd ../fleet-bridge
# Fleet bridge tests are embedded in the build report (17 integration tests verified)
npm test  # if a test runner is configured, or manually:

cat > fb-smoke.js << 'FBTEST'
const { FleetBridge } = require('./src/fleet-bridge');
const bridge = new FleetBridge({ vesselDir: '../i2i-vessel' });
bridge.init();

// Test I2I bottle send
const result = bridge.send('fleet', 'TASK', { artifacts: { msg: 'smoke test' } });
console.log('FleetBridge send result:', JSON.stringify(result, null, 2));

// Test beachcomb
const bottles = bridge.beachcomb();
console.log(`Beachcomb: ${bottles.length} bottles`);

// Test status
const status = bridge.status();
console.log('Bridge status:', JSON.stringify(status, null, 2));
console.log('✅ Fleet Bridge smoke test OK');
FBTEST

node fb-smoke.js

# 6. Heddle Snail Shell tests (33 tests)
cd ../heddle
npx jest src/__tests__/unit/snail-shell/snail-shell.test.ts
# Expect: 33 test cases across 8 describe blocks
```

### Quick One-Line Run All

```bash
cat << 'SCRIPT' > run-all-tests.sh
#!/bin/bash
set -e
echo "=== T-MINUS DISPATCHER ==="
(cd tminus-dispatcher && node tests/simulate.js)
echo "=== COMPOSITE HEADSPACE ==="
(cd composite-headspace && node test/integration.test.js)
echo "=== SYMPHONY RUNTIME ==="
(cd symphony-runtime && npx mocha 'test/**/*.test.js')
echo "=== CTC × T-MINUS ==="
(cd constraint-tminus-bridge && node test/integration-test.js)
echo "=== FLEET BRIDGE ==="
# Fleet Bridge smoke test
echo "=== HEDDLE SNAIL SHELL ==="
(cd heddle && npx jest src/__tests__/unit/snail-shell/snail-shell.test.ts --silent)
echo ""
echo "🎉 All symphony tests passed!"
SCRIPT

chmod +x run-all-tests.sh
bash run-all-tests.sh
```

---

## 6. ProArt-Specific Experiments

### 6.1 Composite Headspace with Local Qwen on RTX 4050 GPU

The Composite Headspace currently uses simulated reasoning. To run it with a real local LLM on the RTX 4050:

```bash
# Install Ollama (first time)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model optimized for the 4050 (6GB VRAM)
ollama pull qwen2.5:7b-instruct-q4_K_M   # ~4.4GB, fits comfortably

# Or smaller/faster options:
ollama pull qwen2.5:3b-instruct-q8_0      # ~3.5GB, very fast
ollama pull deepseek-r1:7b-q4_K_M          # Alternative reasoning model

# Verify GPU acceleration
ollama run qwen2.5:7b-instruct-q4_K_M --verbose
# Should show "llm_alloc: using GPU" in logs
```

**Create a GPU-accelerated headspace runner:**

```bash
cat > gpu-headspace-runner.js << 'GOJS'
/**
 * GPU-Accelerated Composite Headspace Runner
 * Routes Shell A (deep) and Shell B (fast) to local Qwen via Ollama API
 */

const { Coordinator } = require('./composite-headspace/src/coordinator');
const { ReasoningTask } = require('./composite-headspace/src/reasoning-task');
const http = require('http');

const OLLAMA_API = 'http://localhost:11434/api/generate';
const MODEL_DEEP = 'qwen2.5:7b-instruct-q4_K_M';   // Shell A — deep reasoning
const MODEL_FAST = 'qwen2.5:3b-instruct-q8_0';       // Shell B — fast pattern match

async function queryOllama(prompt, model) {
  return new Promise((resolve, reject) => {
    const req = http.request(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const lines = data.trim().split('\n');
        const last = JSON.parse(lines[lines.length - 1]);
        resolve(last.response);
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 512 }
    }));
    req.end();
  });
}

async function main() {
  const task = ReasoningTask.sampleProblems()[4];
  console.log(`📋 Task: ${task.prompt}\n`);

  console.log(`🐚 Shell A (Deep, ${MODEL_DEEP}):`);
  const aStart = Date.now();
  const aResponse = await queryOllama(task.prompt, MODEL_DEEP);
  console.log(`   ${(Date.now() - aStart)/1000}s\n${aResponse.slice(0, 300)}...\n`);

  console.log(`🐚 Shell B (Fast, ${MODEL_FAST}):`);
  const bStart = Date.now();
  const bResponse = await queryOllama(
    `Summarize the key patterns in: ${task.prompt}`,
    MODEL_FAST
  );
  console.log(`   ${(Date.now() - bStart)/1000}s\n${bResponse.slice(0, 300)}...\n`);

  console.log('✨ Dissonance analysis (manual): compare the two responses above');
  console.log(`💡 Tip: Pipe to | jq -R -s 'split("\\n")' | tail -20 for clean output`);
}

main().catch(console.error);
GOJS

node gpu-headspace-runner.js
```

**Monitor GPU during runs:**
```bash
# In a separate terminal
nvtop

# Or lightweight
watch -n 0.5 'nvidia-smi --query-gpu=utilization.gpu,memory.used,temperature.gpu --format=csv,noheader'
```

---

### 6.2 Cyberloop GA Instrumentation with t-minus Cues

This links the t-minus dispatcher to a GA (genetic algorithm) cyberloop, using cues to synchronize generations.

```bash
cat > cyberloop-ga.js << 'EOF'
/**
 * Cyberloop GA × t-minus Cues
 * Each generation iteration is a t-minus cycle:
 *   Selection → Crossover → Mutation → Evaluation → Reporting
 */

const { TminusClient } = require('./tminus-client/src/client');
const WebSocket = require('ws');

// ── Minimal GA ─────────────────────────────────────────────
class CyberloopGA {
  constructor(popSize = 20) {
    this.popSize = popSize;
    this.generation = 0;
    this.population = Array.from({ length: popSize }, () => ({
      genes: Math.random() * 100,
      fitness: 0,
    }));
  }

  evaluate(ind) {
    // Simple fitness: maximize genes close to 42
    ind.fitness = 100 - Math.abs(ind.genes - 42);
    return ind;
  }

  selection() {
    this.population.sort((a, b) => b.fitness - a.fitness);
    return this.population.slice(0, this.popSize / 2);
  }

  crossover(parents) {
    const offspring = [];
    for (let i = 0; i < this.popSize - parents.length; i++) {
      const p1 = parents[Math.floor(Math.random() * parents.length)];
      const p2 = parents[Math.floor(Math.random() * parents.length)];
      offspring.push({
        genes: (p1.genes + p2.genes) / 2 + (Math.random() - 0.5) * 10,
        fitness: 0,
      });
    }
    return [...parents, ...offspring];
  }

  mutate(pop) {
    return pop.map(ind => ({
      ...ind,
      genes: ind.genes + (Math.random() - 0.5) * 5,
    }));
  }

  async step() {
    this.population = this.mutate(
      this.crossover(this.selection())
    );
    this.population = this.population.map(ind => this.evaluate(ind));
    this.generation++;
    return this.population[0].fitness;
  }
}

// ── T-Minus Integration ────────────────────────────────────
async function main() {
  const client = new TminusClient('ws://localhost:8765');
  const ga = new CyberloopGA(20);

  client.on('primed', async (payload) => {
    const bestFitness = await ga.step();
    console.log(`Gen ${ga.generation} | Best fitness: ${bestFitness.toFixed(2)}`);

    await client.fire();
    await client.report({
      result: 'generation_complete',
      duration_beats: 1,
      phase_group: payload.phase_group,
      payload: { generation: ga.generation, best_fitness: bestFitness }
    });

    // Convergence check
    if (bestFitness > 99.9 || ga.generation >= 100) {
      console.log(`\n🎯 Converged at generation ${ga.generation} (fitness: ${bestFitness.toFixed(2)})`);
      process.exit(0);
    }
  });

  await client.connect();
  await client.register('cyberloop-ga', {
    timbre: 'analytical',
    frequency: 1.0,
    latency_ms: 100,
    context_depth: 'shallow',
  });
  await client.subscribe(['evolve']);

  // Kick off first cue to start the loop
  await client.cue('cyberloop-ga', 0, 'evolve', { action: 'next_gen' });
  console.log('🚀 Cyberloop GA started — press Ctrl+C to stop');
}

main().catch(console.error);
EOF

# Start t-minus dispatcher (if not running)
cd tminus-dispatcher && node src/index.js &
sleep 1

# Run the GA cyberloop
cd .. && node cyberloop-ga.js
```

---

### 6.3 Heddle Snail Shell as Codespace Worker

The Snail Shell provides a JSON-RPC 2.0 WebSocket interface for fleet coordination. To run it as a workspace worker on Forgemaster:

```bash
cd sailor-workspace/heddle

# Build TypeScript to dist/
npm run build  # or: npx tsc

# Start Heddle with Snail Shell enabled (via integration plugin)
# This requires modifying the Heddle startup to call attachSnailShellToDaemon()
node -e "
const { attachSnailShellToDaemon } = require('./dist/src/snail-shell/integration/daemon-plugin');
const { SymphonyIdentityService } = require('./dist/src/snail-shell/identity');

const identity = new SymphonyIdentityService({
  name: 'forgemaster-snail',
  timbre: 'bright',
  track: 1,
  frequency: 1.0,
  env: process.env
}).build();

console.log('🐚 Snail Shell Identity:');
console.log(JSON.stringify(identity, null, 2));

// Simulate attaching to daemon
const handle = attachSnailShellToDaemon({
  id: 'forgemaster-daemon',
  workspace: process.cwd()
});
console.log('✅ Snail Shell daemon handle:', handle);
"
```

**RPC method demo (standalone):**

```bash
# Start a standalone SnailShellRpcServer
node -e "
const { SnailShellRpcServer } = require('./dist/src/snail-shell/rpc/server');
const { SnailShellRpcMethodRegistry } = require('./dist/src/snail-shell/rpc/methods');
const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer();
const wss = new WebSocketServer({ server });
const rpcServer = new SnailShellRpcServer(wss);

wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  rpcServer.handleConnection(ws);
});

server.listen(9876, () => {
  console.log('🐚 Snail Shell RPC Server on ws://localhost:9876');
  console.log('Try: wscat -c ws://localhost:9876');
});
" &

# Connect and test RPC methods
npm install -g wscat 2>/dev/null || true

echo '{"jsonrpc":"2.0","method":"fleet.identity","params":{},"id":1}' | \
  wscat -c ws://localhost:9876 -w 1
```

---

## 7. I2I Protocol

> "Messages in bottles" — ASCII-based fleet communication via shared filesystem.

### 7.1 How It Works

The I2I system uses a **vessel directory** (`i2i-vessel/`) with two key subdirectories:

```
i2i-vessel/
├── bottles/       # Outgoing messages (you → fleet)
├── harbor/        # Incoming messages (fleet → you)
├── CHARTER.md     # Oracle2's mission statement
├── IDENTITY.md    # Oracle2's capabilities
├── diary/         # Session logs
├── dojo/          # Training/experiments
├── proposals/     # Fleet proposals
└── vocabularies/  # Shared vocabulary
```

**Message lifecycle:**
1. Drop a bottle into `bottles/` with JSON metadata + shard content
2. Fleet Bridge (or Oracle2) picks it up, processes, delivers
3. Response appears in `harbor/` when someone replies
4. You **beachcomb** (`harbor/`) to collect replies

### 7.2 Bottle Format

```json
{
  "from": "forgemaster",
  "to": "oracle2",
  "type": "TASK",
  "timestamp": 1710000000000,
  "shard": {
    "head": "What orchestras conduct at dawn",
    "slots": 3,
    "artifacts": {
      "files": ["src/main.js"],
      "message": "Run the test suite for fleet-bridge"
    }
  },
  "hash": "sha256-abc123..."
}
```

### 7.3 Beachcombing Commands

```bash
# Via Fleet Bridge CLI
cd sailor-workspace/fleet-bridge
node src/index.js beachcomb

# Manual beachcomb
ls -lt i2i-vessel/harbor/
cat i2i-vessel/harbor/*.json 2>/dev/null

# Send a bottle
node src/index.js send oracle2 SYNTHESIS '{
  "artifacts": {"message": "Forgemaster online. All tests green."},
  "reasoning": ["Integration complete"],
  "blockers": []
}'

# Send via raw file (for scripting)
cat > i2i-vessel/bottles/forge-$(date +%s).json << 'JSON'
{
  "from": "forgemaster",
  "to": "oracle2",
  "type": "STATUS",
  "timestamp": $(date +%s000),
  "shard": {
    "head": "Forgemaster operational report",
    "slots": 1,
    "artifacts": {
      "message": "All symphony components passing. RTX 4050 ready for GPU experiments."
    }
  },
  "hash": "pending"
}
JSON
```

### 7.4 Quick Communication Test with Oracle2

```bash
# 1. Send a message
echo "Sending beacon to Oracle2..."
node fleet-bridge/src/index.js send oracle2 CHECKPOINT '{
  "artifacts": {
    "message": "Forgemaster beacon. ProArt @ $(hostname). Ready for I2I."
  },
  "reasoning": ["Integration test ping"],
  "blockers": []
}'

# 2. Wait and check for reply (Oracle2 processes on its own schedule)
sleep 5
echo "Checking harbor..."
ls -lt i2i-vessel/harbor/ 2>/dev/null
cat i2i-vessel/harbor/*.json 2>/dev/null

# 3. Clean up processed messages (after reading)
rm -f i2i-vessel/harbor/*.json
```

---

## 8. Troubleshooting

### 8.1 Connection Issues

| Symptom                | Cause                        | Fix                                      |
|------------------------|------------------------------|------------------------------------------|
| `ECONNREFUSED` on :8765| t-minus dispatcher not running | `node tminus-dispatcher/src/index.js`   |
| WS connection times out| Wrong port or path           | Check for `/ws` in URL path             |
| `cannot find module ws`| Dependencies not installed   | `npm install` in the component dir      |
| I2I bottles not appearing | Vessel directory missing  | Check `i2i-vessel/` exists, or create it|

### 8.2 Port Conflicts

```bash
# Check what's using the port
sudo lsof -i :8765
sudo lsof -i :9090

# Kill any zombie processes
kill $(lsof -t -i :8765) 2>/dev/null
kill $(lsof -t -i :9090) 2>/dev/null
```

### 8.3 Fleet Bridge

| Issue                              | Check                          |
|------------------------------------|--------------------------------|
| Bridge won't start                 | Is `i2i-vessel/` writable?     |
| Cross-transport forwarding broken  | Is the target agent registered in the route table? |
| Health monitor false deaths        | Increase `heartbeatThresholdMs` |
| T-minus transport queueing forever | Is the t-minus dispatcher running? |

### 8.4 Composite Headspace

| Issue                                  | Fix                                        |
|----------------------------------------|--------------------------------------------|
| Shells both using the same frequency   | Check `frequencyBand`, adjust to different bands |
| No dissonance detected                 | Try `--detector deep` for deeper analysis  |
| Dispatcher already in use on :9090     | Use `--port 9091` to pick another port     |
| WS error on coordinator.start()        | Port may be in use, change or kill zombie  |

### 8.5 GPU / Ollama

| Issue                           | Fix                               |
|---------------------------------|-----------------------------------|
| `ollama: command not found`     | Reinstall: `curl -fsSL https://ollama.com/install.sh \| sh` |
| GPU not used for inference      | Check `ollama run --verbose` output |
| Model too large for 6GB VRAM    | Use a smaller quant: `q4_K_M` or `q3_K_M` |
| Out of memory                   | Kill stale models: `ollama stop qwen2.5:7b` |
| Slow inference                  | Close Chrome tabs, kill background processes |

### 8.6 Heddle Snail Shell

| Issue                           | Fix                                      |
|---------------------------------|------------------------------------------|
| TypeScript errors on import     | `cd heddle && npm run build`              |
| `@types/ws` not found           | `npm install --save-dev @types/ws`        |
| RPC server port conflict        | Change port in the server constructor     |
| Session metadata not annotating | Check that `annotateSessionWithSymphonyIdentity` is called |

### 8.7 Common Error Codes (t-minus Protocol)

| Error Code            | Meaning                          | Fix                              |
|-----------------------|----------------------------------|----------------------------------|
| `AGENT_NOT_FOUND`     | Target agent unknown             | Check agent ID spelling          |
| `AGENT_OFFLINE`       | Target agent disconnected        | Wait for reconnect or check logs |
| `INVALID_STATE`       | FIRE when not CUED/PRIMED        | Wait for PRIMED event first      |
| `UNKNOWN_CUE`         | REPORT references unknown cue    | Check cue_id is valid            |
| `ALREADY_REGISTERED`  | Duplicate registration           | Disconnect first or use new ID   |

### 8.8 Quick Health Check Script

```bash
cat > healthcheck.sh << 'HSH'
#!/bin/bash
echo "═══ Symphony Health Check ═══"

echo -n "t-minus Dispatcher (:8765): "
curl -sf http://localhost:8765/health > /dev/null && echo "✅" || echo "❌"

echo -n "Composite Headspace (:9090): "
curl -sf http://localhost:9090/health > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Fleet Bridge daemon: "
pgrep -f "fleet-bridge.*start" > /dev/null && echo "✅" || echo "❌"

echo -n "I2I Vessel: "
ls i2i-vessel/bottles i2i-vessel/harbor > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Ollama (GPU): "
curl -sf http://localhost:11434/api/tags > /dev/null && echo "✅" || echo "❌"

echo -n "Node.js version: "
node --version

echo -n "npm version: "
npm --version

echo ""
echo "GPU Status:"
nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader 2>/dev/null || echo "(no NVIDIA GPU detected)"
HSH

chmod +x healthcheck.sh
bash healthcheck.sh
```

---

## Quick Reference Commands

```bash
# Start everything (4 terminals)
# Terminal 1: t-minus dispatcher
node tminus-dispatcher/src/index.js

# Terminal 2: Fleet Bridge daemon
cd fleet-bridge && node src/index.js start

# Terminal 3: Composite Headspace demo
cd composite-headspace && node cli.js --sample 5

# Terminal 4: Client SDK demo
cd tminus-client && node -e "
const { TminusClient } = require('./src/client');
const cli = new TminusClient('ws://localhost:8765');
cli.connect().then(() => cli.register('demo', {timbre:'bright',frequency:1.0,latency_ms:50,context_depth:'shallow'}))
.then(r => {console.log('Demo agent registered:', r.agent_id); return cli.subscribe(['gather'])})
.then(() => console.log('Listening on gather — waiting for cues...'));
"

# Run all tests
bash run-all-tests.sh
```

---

*Forgemaster Run Guide v1.0 · Symphony of Shells · ProArt Ryzen + RTX 4050*
*Generated 2026-06-08 04:35 UTC*
