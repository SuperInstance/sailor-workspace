# Fleet Command Bridge — API Specification

> **Version**: 1.0.0  
> **Status**: Draft  
> **Audience**: UI Constructor (kimi-swarm-frontend) + Bridge Engineer  
> **Protocol**: WebSocket (real-time) + JSON-RPC 2.0 (command/response)

---

## 1. Architecture Overview

The **Fleet Command Bridge** is the nervous system connecting the `kimi-swarm-frontend` React UI to the two runtime backends:

```
┌──────────────────────┐     WebSocket       ┌──────────────────────┐
│  kimi-swarm-frontend │◄───────────────────►│ fleet-command-bridge │
│  (React/TypeScript)  │    JSON-RPC 2.0     │  (Rust - axum)       │
└──────────────────────┘                      └──────────┬───────────┘
                                                         │
                                     ┌───────────────────┼───────────────────┐
                                     │                   │                   │
                              ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
                              │ pincher-core │    │polychora    │    │polychora    │
                              │ (ReflexEng.) │    │temperal-brg │    │room-runtime │
                              │ agent state  │    │ 4D voxel    │    │ Rooms/Tiles │
                              └──────────────┘    │ world state │    └─────────────┘
                                                   └─────────────┘
```

### 1.1 Key Principles

| Principle | Description |
|-----------|-------------|
| **Contract-first** | Every API shape is defined in `api-spec.json` before implementation |
| **JSON-RPC 2.0** | All commands use the standard JSON-RPC request/response envelope |
| **Push over Poll** | WebSocket frames push state deltas; clients subscribe to topics |
| **Fail Closed** | Bridge starts in DISCONNECTED state; UI shows "no fleet connection" |
| **Stateless Auth** | Each connection gets a session token; no persistent login |

### 1.2 Transport

- **Primary**: WebSocket on `ws://localhost:9876/ws`
- **Health**: HTTP GET `http://localhost:9876/health` returns bridge status
- **Fallback**: SSE (Server-Sent Events) available on `/events` for read-only clients

### 1.3 Connection Lifecycle

```
DISCONNECTED ──(ws connect)──► CONNECTING ──(handshake)──► CONNECTED
     ▲                                                            │
     │                     ┌──────────────────────────────────────┤
     │                     │                                      │
     └──(ws close)─────────┘           ◄──(ping/pong keepalive)───┘
```

1. Client opens WebSocket to `/ws`
2. Bridge responds with `{jsonrpc: "2.0", method: "session_ready", params: {session_id, fleet_version}}`
3. Client sends commands, receives responses and push events
4. Bridge sends `ping` frames every 15s; client responds with `pong`
5. On idle > 60s, bridge sends `{method: "session_timeout"}` and closes

---

## 2. Connection & Authentication

### 2.1 WebSocket Endpoint

```
ws://localhost:9876/ws
```

Optional query parameter: `?token=<fleet-auth-token>`

### 2.2 Message Format

All messages are **JSON-RPC 2.0** encoded as single-line JSON objects, delimited by `\n`.

**Request from Client:**
```json
{"jsonrpc":"2.0","id":1,"method":"fleet.ping","params":{}}
```

**Response from Bridge:**
```json
{"jsonrpc":"2.0","id":1,"result":{"pong":true,"timestamp":1712345678}}
```

**Push Event from Bridge (no id):**
```json
{"jsonrpc":"2.0","method":"fleet.state_update","params":{"event_type":"reflex_executed","data":{...}}}
```

### 2.3 Error Codes

| Code | Meaning |
|------|---------|
| `-32700` | Parse error (invalid JSON) |
| `-32600` | Invalid request |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |
| `-32000` | Backend unavailable (pincher or polychora down) |
| `-32001` | Not authenticated |
| `-32002` | Rate limited |
| `-32003` | Command rejected (veto/security) |

---

## 3. Fleet Status & Discovery

### `fleet.ping`

Basic health check.

**Params**: `{}`  
**Result**:
```json
{
  "pong": true,
  "server_time": 1712345678,
  "fleet_version": "1.0.0",
  "uptime_secs": 3600,
  "backends": {
    "pincher": "connected",
    "polychora": "connected"
  }
}
```

### `fleet.status`

Get overall fleet status summary.

**Params**: `{}`  
**Result**:
```json
{
  "bridge_state": "connected",
  "agent_count": 5,
  "active_reflexes": 23,
  "room_count": 3,
  "tile_count": 12,
  "voxel_world_tick": 10487,
  "backend_health": {
    "pincher": {"status": "ok", "reflex_count": 23, "action_log_count": 156},
    "polychora": {"status": "ok", "world_tick": 10487}
  }
}
```

### `fleet.backend_status`

Check a specific backend.

**Params**: `{"backend":"pincher"}`  
**Result**:
```json
{
  "backend": "pincher",
  "status": "ok",
  "details": {"reflex_count": 23, "action_log_count": 156, "embedder_loaded": true}
}
```

---

## 4. Agent Reflex System

### `reflex.list`

List all known reflexes in the engine.

**Params**: `{"limit":50,"offset":0}`  
**Result**:
```json
{
  "total": 23,
  "reflexes": [
    {
      "id": "abc-123",
      "intent": "system.info",
      "action": "SELECT 'system info'",
      "confidence": 0.95,
      "invoke_count": 42,
      "match_type": "exact",
      "last_invoked": "2026-06-05T14:30:00Z"
    }
  ]
}
```

### `reflex.get`

Get details of a single reflex.

**Params**: `{"reflex_id":"abc-123"}`  
**Result**:
```json
{
  "id": "abc-123",
  "intent": "system.info",
  "action": "SELECT 'system info'",
  "confidence": 0.95,
  "invoke_count": 42,
  "last_invoked": "2026-06-05T14:30:00Z",
  "created_at": "2026-06-01T10:00:00Z",
  "embedding_sample": [0.1, -0.2, ...] 
}
```

### `reflex.match`

Match an intent against the reflex engine.

**Params**: `{"intent":"show system information"}`  
**Result**:
```json
{
  "match_type": "exact",
  "similarity": 0.94,
  "reflex": {
    "id": "abc-123",
    "intent": "system.info",
    "action": "SELECT 'system info'",
    "confidence": 0.95
  }
}
```

### `reflex.execute`

Execute a reflex by ID.

**Params**: `{"reflex_id":"abc-123","input":"optional input"}`  
**Result**:
```json
{
  "execution_id": "exec-456",
  "output": "system info output here...",
  "latency_ms": 15,
  "confidence": 0.95,
  "match_type": "exact",
  "reflex_id": "abc-123"
}
```

### `reflex.teach`

Teach the engine a new reflex.

**Params**: `{"intent":"list docker containers","action":"$ docker ps"}`  
**Result**:
```json
{
  "reflex_id": "new-def-789",
  "intent": "list docker containers",
  "confidence": 0.5
}
```

### `reflex.log`

Get execution log for a reflex.

**Params**: `{"reflex_id":"abc-123","limit":10}`  
**Result**:
```json
{
  "entries": [
    {
      "id": "log-001",
      "input": "show system info",
      "output": "system info...",
      "latency_ms": 12,
      "confidence": 0.95,
      "timestamp": "2026-06-05T14:30:00Z"
    }
  ]
}
```

---

## 5. 4D Temporal Voxel World

### `voxel.world_status`

Get the temporal world state.

**Params**: `{}`  
**Result**:
```json
{
  "tick": 10487,
  "tick_rate": 20.0,
  "elapsed_seconds": 524.35,
  "semantics": "temporal",
  "event_voxel_count": 156,
  "is_temporal": true
}
```

### `voxel.get_region`

Get voxel data for a spatial region at a time coordinate.

**Params**: `{"x":0,"y":0,"z":0,"w":10487,"radius":16}`  
**Result**:
```json
{
  "region": {
    "x": 0, "y": 0, "z": 0, "w": 10487,
    "radius": 16,
    "voxels": [/* array of {x,y,z,w,block_type} or compressed delta */]
  },
  "event_voxels": [
    {"x": 5, "y": 3, "z": -2, "w": 10487, "block_type": "EVENT_MARKER"}
  ]
}
```

### `voxel.event_stream`

Subscribe to a stream of voxel events in a region.

**Params**: `{"x":0,"y":0,"z":0,"radius":32,"subscribe":true}`  
**Result (initial)**:
```json
{
  "subscribed": true,
  "region_key": "0,0,0,32"
}
```

**Push events**:
```json
{
  "jsonrpc": "2.0",
  "method": "voxel.event",
  "params": {
    "event_type": "voxel_placed",
    "x": 5, "y": 3, "z": -2, "w": 10488,
    "block_type": "EVENT_MARKER",
    "agent_id": "agent-001"
  }
}
```

---

## 6. Room & Tile Management

### `room.list`

List all active rooms.

**Params**: `{}`  
**Result**:
```json
{
  "rooms": [
    {
      "scope": "workspace-1",
      "tile_count": 4,
      "agent_count": 2,
      "is_frozen": false,
      "created_at": "2026-06-01T10:00:00Z"
    }
  ]
}
```

### `room.get`

Get detailed room state.

**Params**: `{"scope":"workspace-1"}`  
**Result**:
```json
{
  "scope": "workspace-1",
  "tiles": [
    {
      "id": "tile-001",
      "presets": ["visual", "default"],
      "required_agents": ["agent-a"],
      "capabilities": {"host_agents":true,"temporal":false,"persistent":true,"emit_events":false},
      "active_agents": ["agent-a"]
    }
  ],
  "agents": ["agent-a", "agent-b"],
  "is_frozen": false,
  "metadata": {"created_by": "developer-1"}
}
```

### `room.create`

Create a new room.

**Params**: `{"scope":"new-lab","metadata":{"purpose":"testing"}}`  
**Result**:
```json
{
  "scope": "new-lab",
  "created": true
}
```

### `room.freeze` / `room.unfreeze`

Freeze or unfreeze a room's context.

**Params**: `{"scope":"workspace-1"}`  
**Result**:
```json
{
  "scope": "workspace-1",
  "frozen": true,
  "frozen_context_size": 4096
}
```

### `tile.add` / `tile.remove`

Add or remove a tile from a room.

**Params** (add): `{"scope":"workspace-1","presets":["monitoring"],"capabilities":{"host_agents":true,"temporal":true}}`  
**Result**:
```json
{
  "tile_id": "tile-002",
  "scope": "workspace-1",
  "added": true
}
```

**Params** (remove): `{"scope":"workspace-1","tile_id":"tile-002"}`  
**Result**:
```json
{
  "scope": "workspace-1",
  "removed": true
}
```

---

## 7. Push Events (Server → Client)

The bridge pushes these events without an `id` field:

| Event | Trigger | Payload |
|-------|---------|---------|
| `fleet.state_update` | Any state change | `{event_type, data}` |
| `reflex.executed` | Reflex execution completed | `{reflex_id, intent, output_snippet, latency_ms}` |
| `reflex.taught` | New reflex learned | `{reflex_id, intent}` |
| `voxel.event` | Voxel placed/removed in subscribed region | `{event_type, x, y, z, w, block_type, agent_id}` |
| `room.updated` | Room state changed | `{scope, change_type}` |
| `session.timeout` | Session about to expire | `{timeout_secs}` |
| `bridge.error` | Backend unreachable | `{backend, error}` |

---

## 8. Rate Limiting

| Limit | Per-connection | Per-method |
|-------|---------------|------------|
| Commands/sec | 30 | — |
| `voxel.get_region` | 5/sec | 5/sec |
| `reflex.execute` | 10/sec | 10/sec |
| Subscription events | Unlimited (push) | — |

Exceeding limits returns `-32002` (Rate limited) error.

---

## 9. Security & Veto

All `reflex.execute` and `reflex.teach` commands pass through the **pincher veto engine**.  
Commands denied by veto return error `-32003` with the veto reason:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32003,
    "message": "Command rejected",
    "data": {"veto_reason": "Action denied: write to /etc/passwd is forbidden"}
  }
}
```

---

## 10. Implementation Status

| Method | Status | Notes |
|--------|--------|-------|
| `fleet.ping` | ✅ Done | —
| `fleet.status` | ✅ Done | —
| `fleet.backend_status` | ⏳ WIP | —
| `reflex.list` | ✅ Done | —
| `reflex.get` | ✅ Done | —
| `reflex.match` | ✅ Done | Uses pincher matcher
| `reflex.execute` | ✅ Done | Via pincher veto engine
| `reflex.teach` | ✅ Done | —
| `reflex.log` | ⏳ WIP | —
| `voxel.world_status` | ✅ Done | —
| `voxel.get_region` | ⏳ WIP | Requires chunk data from polychora
| `voxel.event_stream` | ⏳ WIP | Subscription model
| `room.list` | ✅ Done | —
| `room.get` | ✅ Done | —
| `room.create` | ✅ Done | —
| `room.freeze/unfreeze` | ⏳ WIP | —
| `tile.add/remove` | ✅ Done | —

Legend: ✅ Done = implemented in bridge | ⏳ WIP = spec defined, stubbed | ❌ Not yet
