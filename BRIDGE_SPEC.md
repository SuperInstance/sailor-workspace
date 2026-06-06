# Bridge API Spec: Agent-to-GUI Communication

**Status:** v1.0 Draft  
**Protocol:** WebSocket + JSON-RPC  
**Server:** `fleet-commander-bridge` (Rust, axum)

---

## 1. Overview

The bridge connects the Kimi-Swarm React frontend (the UI) to the pincher reflex runtime and polychora temporal voxel engine (the backend). It translates between the user's visual interactions and the agent fleet's internal state.

```
React Frontend (UI)
    │
    │ WebSocket / JSON-RPC
    ▼
fleet-commander-bridge (Rust)
    │
    ├── pincher-core (reflex engine, agent status)
    ├── polychora-room-runtime (room state, voxel data)
    └── ternary-types (type primitive conversions)
```

---

## 2. Connection

### 2.1 WebSocket Endpoint

```
ws://localhost:8765/ws
wss://<bridge-host>/ws
```

### 2.2 Authentication

The bridge accepts a token in the connection URL:

```
ws://localhost:8765/ws?token=<AGENT_API_TOKEN>
```

Or via `Sec-WebSocket-Protocol` header:

```javascript
const ws = new WebSocket("ws://localhost:8765/ws", ["agent-v1", token]);
```

### 2.3 Connection Lifecycle

1. Client connects via WebSocket
2. Server sends `hello` message with bridge version and capabilities
3. Client sends `subscribe` messages for desired channels
4. Server pushes updates on subscribed channels
5. Client can send RPC commands at any time
6. Either side can close the connection

---

## 3. Message Format

All messages are JSON-RPC 2.0 compliant:

```json
{
  "jsonrpc": "2.0",
  "method": "<method_name>",
  "id": "<request_id>",
  "params": { ... }
}
```

Server push updates use the same format but with `"method": "event"` and no `id`:

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "channel": "agent/status",
    "data": { ... }
  }
}
```

---

## 4. RPC Methods (Client → Server)

### 4.1 Agent Management

#### `agent.list` — List all active agents

```json
// Request
{ "method": "agent.list", "id": 1, "params": {} }

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "agents": [
      {
        "id": "bridge-engineer",
        "name": "Bridge Engineer",
        "status": "running",
        "repo": "SuperInstance/pincher",
        "task": "Building API server",
        "uptime_seconds": 1857,
        "resources": { "cpu_pct": 12, "ram_mb": 64 }
      }
    ]
  }
}
```

#### `agent.status` — Get detailed agent status

```json
// Request
{ "method": "agent.status", "id": 2, "params": { "agent_id": "bridge-engineer" } }

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "agent_id": "bridge-engineer",
    "status": "running",
    "current_task": "Building API server",
    "reflexes": ["build", "test", "commit"],
    "last_action": "cargo check",
    "last_action_result": "passed",
    "confidence": 0.92,
    "logs": ["...last 10 log lines..."]
  }
}
```

#### `agent.spawn` — Spawn a subagent

```json
// Request
{
  "method": "agent.spawn",
  "id": 3,
  "params": {
    "task": "Read the README, run cargo test, report",
    "entrypoint": "claude",
    "repo": "SuperInstance/pincher"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "agent_id": "spawned-agent-1234",
    "status": "starting",
    "codespace_url": "https://...githubpreview.dev"
  }
}
```

### 4.2 Reflex Management

#### `reflex.list` — List available reflexes

```json
// Request
{ "method": "reflex.list", "id": 4, "params": {} }

// Response
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "reflexes": [
      { "name": "build", "status": "loaded", "last_run": "...", "avg_duration_ms": 4500 },
      { "name": "test", "status": "loaded", "last_run": "...", "avg_duration_ms": 12000 },
      { "name": "deploy", "status": "idle", "last_run": null, "avg_duration_ms": null }
    ]
  }
}
```

#### `reflex.trigger` — Execute a reflex

```json
// Request
{
  "method": "reflex.trigger",
  "id": 5,
  "params": {
    "reflex": "build",
    "params": { "profile": "release" }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "reflex_id": "build-20260606-001",
    "status": "running",
    "estimated_duration_ms": 4500
  }
}
```

### 4.3 Room Management (Polychora)

#### `room.list` — List all rooms

```json
// Request
{ "method": "room.list", "id": 6, "params": {} }

// Response
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "rooms": [
      { "id": "engine-monitoring", "type": "temporal", "agent_count": 2 },
      { "id": "navigation", "type": "spatial", "agent_count": 0 },
      { "id": "vault", "type": "knowledge", "agent_count": 1 }
    ]
  }
}
```

#### `room.voxels` — Get voxel data for a room

```json
// Request
{
  "method": "room.voxels",
  "id": 7,
  "params": {
    "room_id": "engine-monitoring",
    "bbox": { "x": [0, 64], "y": [0, 64], "z": [0, 64], "t": [0, 10] }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "voxels": [
      { "x": 10, "y": 20, "z": 30, "t": 5, "type": "engine_temp", "value": 85.2 },
      { "x": 11, "y": 20, "z": 30, "t": 5, "type": "rpm", "value": 3200 }
    ],
    "count": 2
  }
}
```

### 4.4 Subscription Management

#### `subscribe` — Subscribe to event channels

```json
// Request
{
  "method": "subscribe",
  "id": 8,
  "params": {
    "channels": ["agent/status", "room/updates", "reflex/events"]
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "subscribed": ["agent/status", "room/updates", "reflex/events"]
  }
}
```

---

## 5. Server Push Events

### `event: agent/status` — Agent state change

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "channel": "agent/status",
    "data": {
      "agent_id": "bridge-engineer",
      "status": "completed",
      "task": "Building API server",
      "result": "success",
      "duration_ms": 1857000
    }
  }
}
```

### `event: reflex/result` — Reflex completed

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "channel": "reflex/result",
    "data": {
      "reflex_id": "build-20260606-001",
      "reflex": "build",
      "status": "success",
      "duration_ms": 4200,
      "output": "Compilation finished, 0 errors, 0 warnings"
    }
  }
}
```

### `event: voxel/update` — Room voxel changed

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "channel": "voxel/update",
    "data": {
      "room_id": "engine-monitoring",
      "voxel": { "x": 10, "y": 20, "z": 30, "t": 6, "type": "engine_temp", "value": 87.1 }
    }
  }
}
```

---

## 6. Agent Interface (Claude Code / Kimi Code)

The bridge exposes a CLI for agent tools to interact with the frontend:

### `bridge announce` — Send an update to the UI

```bash
bridge announce "completed cargo test" --status success --channel agent/status
```

### `bridge query` — Query the backend state

```bash
bridge query agents --format json
```

### `bridge reflex` — Trigger a reflex from CLI

```bash
bridge reflex build --profile debug
```

---

## 7. Error Codes

| Code | Meaning |
|------|---------|
| -32700 | Parse error (invalid JSON) |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| 1 | Agent not found |
| 2 | Room not found |
| 3 | Reflex not found |
| 4 | Authentication failed |
| 5 | Rate limited |
