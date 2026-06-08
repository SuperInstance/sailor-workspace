# Symphony Orchestrator Report 🎻

**Built:** 2026-06-08 04:46 UTC
**Location:** `/home/ubuntu/.openclaw/workspace/symphony-orchestrator/`

---

## Overview

The Symphony Orchestrator is the master conductor for the Symphony of Shells cognitive DAW. It starts, monitors, and shuts down all six symphony components in the correct dependency order.

---

## Files Created

### 1. `orchestrate.js` — Master Runner
Starts every component in order:

| Step | Component | Port | How It Works |
|------|-----------|------|-------------|
| 1 | **t-minus Dispatcher** | `:8765` | Spawns `tminus-dispatcher/src/index.js`, polls `/health` until 200 |
| 2 | **Fleet Bridge** | daemon | Spawns `fleet-bridge/src/fleet-bridge-cli.js start` |
| 3 | **I2I Bottle Agent** | vessel | Creates/sources `_bottle-agent.js` that watches `i2i-vessel/` via `I2IBottleTransport` |
| 4 | **Heddle Snail Shell** | — | Staged (TypeScript plugin, no compiled JS) |
| 5 | **Composite Headspace** | one-shot | Runs a verification task with `--format json` |
| 6 | **Symphony Runtime** | library | Imports and initializes `SymphonyRuntime` in-process |
| — | **Master Agent** | WS | Registers `symphony-master` via WebSocket for E2E verification |

**Key features:**
- Kills existing processes on `:8765`, `:9876` before starting
- Waits up to 30s per component, polling `/health` every 500ms
- Prints a beautiful ASCII status dashboard at the end
- Traps `SIGINT`/`SIGTERM` for graceful cascading shutdown
- Falls back to `SIGKILL` after 2s grace period

### 2. `healthcheck.sh` — Component Health Checker
Shell script that probes all components:

- `curl` on `:8765/health` (t-minus Dispatcher)
- `pgrep -f` for Fleet Bridge, I2I Bottle Agent, Composite Headspace
- Module import check for Symphony Runtime
- `/agents` endpoint check for `symphony-master` registration
- Green/red/colored output per component
- Exit code `0` only if ALL components pass

### 3. `kill-all.sh` — Full Teardown
Graceful cleanup script:

1. Kills processes on `:8765`, `:9876`, `:9090`
2. Kills by process pattern (tminus, fleet-bridge, bottle-agent, etc.)
3. Waits 2s for graceful shutdown
4. Force-kills survivors with `SIGKILL`
5. Cleans up temp `_bottle-agent.js`

### 4. `status.js` — Live Dashboard
Polls all components and renders a full dashboard:

- **Component status** — green/red dots for each service
- **Dispatcher stats** — agent count (by state), cue count, phase group count, beat engine stats
- **Registered agents** — name, state, connection status, frequency, latency, phase groups
- **Active cues** — ID, source → target, remaining beats
- **Phase groups** — name, agent count, state, sequence

**Flags:**
- `node status.js` — one-shot
- `node status.js --watch` — live-updating every 2s
- `node status.js --help` — usage

### 5. `package.json`
Minimal dependencies — only `ws` (WebSocket client for master agent registration).

---

## Architecture

```
orchestrate.js
├── [1] Kill existing :8765, :9876 processes
├── [2] Spawn tminus-dispatcher → wait /health
├── [3] Spawn fleet-bridge (daemon)
├── [4] Spawn I2I bottle agent (vessel watcher)
├── [5] Stage Heddle Snail Shell (TS plugin)
├── [6] Run Composite Headspace (one-shot)
├── [7] Init Symphony Runtime (in-process)
├── [8] Register master agent via WS → verify E2E
└── [9] Print status dashboard → wait for SIGINT
```

## Ports Used

| Service | Port | Protocol | Health Endpoint |
|---------|------|----------|-----------------|
| t-minus Dispatcher | `8765` | WS + HTTP | `/health` |
| Fleet Bridge | `9876` | daemon | process check |
| Composite Headspace | `9090` | WS | process check |

## Dependency Graph

```
tminus-dispatcher  ←  fleet-bridge  ←  i2i-bottle-agent
       ↓                          
composite-headspace
       ↓
symphony-runtime
```

**Snail Shell** sits alongside as a TypeScript plugin for the Heddle daemon — ready to compile.

---

## Usage

```bash
# Start everything
cd symphony-orchestrator && node orchestrate.js

# Check health (separate terminal)
cd symphony-orchestrator && bash healthcheck.sh

# Live status dashboard
cd symphony-orchestrator && node status.js --watch

# Kill everything
cd symphony-orchestrator && bash kill-all.sh

# Quick start (npm script)
cd symphony-orchestrator && npm start
```

---

## Verification

- `orchestrate.js` — ✅ syntax-validated via `node -c`
- `status.js` — ✅ syntax-validated via `node -c`
- `healthcheck.sh` — ✅ bash syntax-validated via `bash -n`
- `kill-all.sh` — ✅ bash syntax-validated via `bash -n`
- Symphony Runtime module — ✅ confirmed importable and initializable
- Dependencies — ✅ `ws` installed, 0 vulnerabilities

---

## Notes

- **i2i-bottle-agent** doesn't exist as a standalone directory — the orchestrator dynamically creates a `_bottle-agent.js` wrapper around `fleet-bridge`'s `I2IBottleTransport`
- **Heddle Snail Shell** is TypeScript-only (no compiled JS) — the orchestrator marks it as "staged" and skips execution
- **Composite Headspace** runs one-shot (not daemon) — this is by design
- **Symphony Runtime** is a library, not a daemon — imported and initialized in-process
