# 🌉 Fleet A2A Bridge — Build Report

**Built:** 2026-06-08 04:22 UTC  
**Builder:** Subagent (Fleet A2A Bridge Builder)  
**Location:** `/home/ubuntu/.openclaw/workspace/fleet-bridge/`

---

## Overview

The Fleet A2A Bridge implements **dual-transport agent communication** for the fleet:

```
┌─────────────┐      I2I Bottles       ┌──────────────┐
│   Oracle2   │ ◄──── (file-based) ───► │  FleetBridge  │
│   (ARM64)    │                        │  (bridge)    │
└─────────────┘                        │              │
                                        │  Router:     │
┌─────────────┐      I2I Bottles       │  agent→proto │
│  Forgemaster│ ◄──── (file-based) ───► │              │
│   (x86_64)   │                        │  Forwarder:  │
└─────────────┘                        │  I2I ↔ WS    │
                                        │              │
┌─────────────┐   t-minus WebSocket    │  Health:     │
│ Fleet-      │ ◄── (JSON-RPC/WS) ────► │  node liveness│
│ Commander   │                        └──────────────┘
└─────────────┘
```

---

## Components Built ✅

### 1. `src/fleet-bridge.js` — FleetBridge Core
- Unified message routing class
- Dual transport: I2I bottle system + t-minus WebSocket
- Cross-transport forwarding (I2I→tminus and tminus→I2I)
- Automatic heartbeat bottle generation
- `init()`, `start()`, `stop()`, `send()`, `beachcomb()`, `status()` methods

### 2. `src/i2i-transport.js` — I2I Bottle Transport
- File-based message passing via `bottles/` (outgoing) and `harbor/` (incoming) directories
- Supports all 13 I2I bottle types (TASK, STATUS, CHECKPOINT, BLOCKER, DELIVERABLE, BOTTLE, ACK, SYNTHESIS, CHALLENGE, SESSION, SPLINE, REFLECT, PROMOTE)
- SHA-256 integrity hashing on every bottle
- `sendBottle()`, `beachcomb()`, `listBottles()`, `watch()` methods
- Configurable: processed bottle deletion or archival

### 3. `src/tminus-transport.js` — T-minus WebSocket Transport
- WebSocket client for t-minus cue dispatcher
- JSON-RPC 2.0 message format
- Automatic reconnection with exponential backoff (1s → 30s)
- Message queuing while offline
- Heartbeat ping/pong with timeout detection
- `connect()`, `sendCue()`, `onCue()`, `onStatus()`, `disconnect()` methods

### 4. `src/route-table.js` — Route Table
- Maps agent IDs to transport protocols (`i2i`, `tminus`, or `both`)
- Pre-loaded defaults: Oracle2→i2i, Forgemaster→i2i, Oracle1→tminus, Bridge-Engineer→tminus
- `register()`, `deregister()`, `resolve()`, `list()`, `getByTransport()` methods

### 5. `src/health-monitor.js` — Health Monitor
- Tracks node liveness via heartbeat timestamps
- Configurable check interval (default 15s) and death threshold (default 60s)
- Death detection and revival callbacks
- `register()`, `heartbeat()`, `isAlive()`, `status()`, `start()`, `stop()` methods
- Snapshot of all node health

### 6. `src/fleet-bridge-cli.js` — CLI Tool
- Commands: `start`, `send`, `beachcomb`, `status`, `register`, `deregister`, `heartbeat`, `help`
- Inline JSON or file-based shard payloads
- Graceful daemon shutdown (SIGINT/SIGTERM)

### 7. `src/index.js` — Entry Point
- Module exports all components
- CLI dispatch when run directly

---

## Integration Test Results ✅

| Test | Result | Detail |
|------|--------|--------|
| Module loading | ✅ | All 5 modules load without errors |
| I2I bottle send | ✅ | Bottle written with correct JSON structure |
| I2I bottle integrity | ✅ | SHA-256 hash matches on read-back |
| I2I beachcomb | ✅ | Harbor scanned, bottles read and removed |
| I2I watch (poll) | ✅ | New bottles detected asynchronously |
| Route table defaults | ✅ | 4 agents pre-registered |
| Route table register/deregister | ✅ | Agents can be added and removed |
| Health monitor death detection | ✅ | Nodes marked dead after heartbeat threshold |
| Health monitor revival | ✅ | Heartbeat revives dead nodes |
| Cross-transport: I2I→tminus | ✅ | Bottle in harbor forwarded as WS cue |
| Cross-transport: tminus→I2I | ✅ | WS cue dropped as I2I bottle |
| CLI help | ✅ | Usage printed correctly |
| CLI status | ✅ | Full bridge state as JSON |
| CLI send | ✅ | Bottle sent to forgemaster vessel |
| CLI register | ✅ | test-agent registered |
| CLI deregister | ✅ | test-agent deregistered |
| Daemon smoke test | ✅ | Starts, handles WS absence, stops cleanly |

---

## Usage Examples

```bash
# Start the bridge daemon (watches both channels)
node src/index.js start

# Check status
node src/index.js status

# Send a message
node src/index.js send forgemaster TASK '{"artifacts":{"msg":"hello"},"reasoning":["test"],"blockers":[]}'

# Beachcomb for incoming bottles
node src/index.js beachcomb

# Register an agent
node src/index.js register my-agent tminus '{"description":"new agent"}'

# Deregister
node src/index.js deregister my-agent

# Manual heartbeat
node src/index.js heartbeat oracle2
```

---

## Architecture Notes

**Vessel Directory:** The bridge interacts with the existing I2I vessel at `i2i-vessel/`, reading from `harbor/` and writing to `bottles/`.

**Cross-Transport Forwarding:** When a bottle arrives in harbor for an agent registered as `tminus`, the bridge automatically forwards it as a WebSocket cue. Likewise, cues arriving via WS for `i2i`-routed agents are dropped as bottles. This enables agents on different transport layers to communicate transparently.

**Health Monitor:** The bridge tracks all registered fleet agents. Agents that miss their heartbeat window are flagged as dead, with callbacks for alerting. A simple heartbeat restores them.

**Route Table:** The routing layer is extensible — new agents can be registered to any transport, and `both` enables bidirectional forwarding for agents that bridge the gap.

---

**Status: ✅ Fleet A2A Bridge is operational.**
