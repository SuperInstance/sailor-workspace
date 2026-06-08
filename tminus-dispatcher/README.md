# T-Minus Cue Dispatcher ⏱️ — Temporal heartbeat for distributed cognitive agent orchestration

<p align="center">
  <img src="https://img.shields.io/badge/tests-26%2F26-brightgreen?style=flat-square" alt="Tests: 26/26 passing" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node >= 18" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/github/last-commit/SuperInstance/tminus-dispatcher?style=flat-square" alt="Last Commit" />
</p>

---

**T-Minus Cue Dispatcher** is the temporal heartbeat of the [Symphony of Shells](https://github.com/SuperInstance/symphony-runtime) ecosystem. It is not a workflow engine, not a job queue — it is a **cue grid** for distributed cognitive agents.

Agents register via WebSocket, subscribe to phase groups, send and receive t-minus cues coordinated by a cognitive beat engine, and automatically advance through a deterministic state machine. The dispatcher handles pre-cueing (negative offsets), phase group alignment, heartbeat-based staleness detection, and state transitions transparently.

> 🧠 *Part of the [Composite Headspace](https://github.com/SuperInstance/composite-headspace) agent orchestration family.*

---

## Quick Start

```bash
git clone https://github.com/SuperInstance/tminus-dispatcher
cd tminus-dispatcher
npm install
node src/index.js
```

The server starts on `ws://localhost:8765` by default. Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TMINUS_PORT` | `8765` | HTTP/WS server port |
| `TMINUS_HOST` | `0.0.0.0` | Bind address |

---

## Architecture

### WebSocket State Machine

Every agent progresses through a deterministic lifecycle driven entirely by WebSocket messages and the internal beat engine:

```
                    ┌──────────┐
                    │ OFFLINE  │
                    └────┬─────┘
                         │ REGISTER (via WS)
                         ▼
                  ┌──────────────┐
                  │  REGISTERED  │ ◄───── re-registration
                  └──────┬───────┘
                         │ SUBSCRIBE (to phase group)
                         ▼
                  ┌──────────────┐
                  │  LISTENING   │ ◄───── transition back from completed
                  └──────┬───────┘
                         │ CUE received (t-minus event)
                         ▼
                  ┌──────────────┐
                  │    CUED      │
                  └──────┬───────┘
                         │ t-minus offset reaches zero
                         ▼
                  ┌──────────────┐
                  │   PRIMED     │ ◄───── agent is "ready to fire"
                  └──────┬───────┘
                         │ FIRE command / agent decides to go
                         ▼
                  ┌──────────────┐
                  │   FIRING     │ ◄───── agent is executing its action
                  └──────┬───────┘
                         │ REPORT(result, phase_group)
                         ▼
                  ┌──────────────┐
                  │  COMPLETE    │
                  └──────┬───────┘
                         │ (listens for next cue in group)
                         ▼
                  ┌──────────────┐
                  │  LISTENING   │
                  └──────────────┘
```

**Shortcut transitions:**
- Pre-cue (`offset_beats ≤ 0`): `LISTENING → PRIMED` (skips CUED)
- Disconnect / timeout (30s no heartbeat): any → `OFFLINE`

### Cognitive Beat Engine

The dispatcher ticks at a configurable interval (default **500ms** = 1 cognitive beat). Agents self-report `latency_ms` and `context_depth` during registration; the dispatcher normalises these into a **normalised beat interval** so that timing is relative to the dispatcher's counter — no global clock sync required.

```
dispatcher tick loop:
  every TICK_MS (default 500):
    beat_counter++
    for each pending_cue:
      if cue.scheduled_fire_at ≤ now:
        send PRIMED to target agent
        mark cue as delivered
```

### Pre-Cueing (Negative T-Minus)

When `offset_beats < 0`, the dispatcher immediately marks the agent as **PRIMED** (skipping the CUED state) and tells it "you should already be firing." This enables the **long-running agent pattern** — e.g., a Chronicler that starts narrating before the full context is assembled.

### Phase Group Alignment

Agents belong to phase groups (e.g., `gather`, `synthesize`, `review`, `deliver`). Cues within a group are scoped to that group's **alignment point**. When every agent in a group has completed its cue, the group advances to the next alignment point, and all agents receive a `PHASE_ADVANCE` notification.

---

## Protocol Reference

All messages are JSON over a single WebSocket connection. Each message uses the standard envelope:

```json
{
  "type": "<MESSAGE_TYPE>",
  "seq": 1,
  "ts": 1710000000000,
  "payload": { ... }
}
```

### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `REGISTER` | `{name, timbre?, frequency?, latency_ms?, context_depth?}` | Register this WebSocket as an agent |
| `SUBSCRIBE` | `{phase_groups: ["gather"]}` | Join one or more phase groups |
| `CUE` | `{target_id, offset_beats, phase_group, payload?}` | Send a t-minus cue to another agent |
| `FIRE` | `{}` | Signal execution start (transitions PRIMED → FIRING) |
| `REPORT` | `{result?, duration_beats?, phase_group}` | Report task completion |
| `PING` | `{}` | Heartbeat keep-alive (30s timeout) |
| `UNSUBSCRIBE` | `{phase_groups: ["review"]}` | Leave specified phase groups |

### Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `REGISTERED` | `{agent_id, state, phase_groups?}` | Registration / subscription confirmed |
| `CUED` | `{cue_id, source, offset_beats, delay_ms, phase_group, payload?}` | Agent has been cued; countdown running |
| `PRIMED` | `{cue_id, source, phase_group, pre_cued, offset_beats, payload?}` | T-minus countdown complete — agent should fire |
| `FIRE_ACK` | `{agent_id, state}` | Acknowledged FIRE transition |
| `COMPLETE_ACK` | `{agent_id, state, cues_completed, result, duration_beats}` | REPORT acknowledged |
| `PHASE_ADVANCE` | `{group, point}` | All agents in a phase group have completed |
| `ERROR` | `{code, message}` | Error response |
| `PONG` | `{}` | Heartbeat response |

### Error Codes

| Code | Meaning |
|------|---------|
| `AGENT_NOT_FOUND` | Target agent in CUE does not exist |
| `AGENT_OFFLINE` | Target agent disconnected |
| `INVALID_STATE` | Agent sent FIRE from wrong state (must be PRIMED) |
| `UNKNOWN_CUE` | REPORT references a non-existent cue |
| `GROUP_NOT_FOUND` | Phase group does not exist |
| `ALREADY_REGISTERED` | WebSocket already registered |
| `INVALID_PAYLOAD` | Malformed or missing required fields |

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — status, uptime, beats, agents (by state), cues, phase group count |
| `GET` | `/agents` | List all registered agents with id, name, timbre, frequency, state, phase groups, latency, connectivity |
| `GET` | `/agents/:id` | Full agent detail |
| `DELETE` | `/agents/:id` | Force-deregister and disconnect an agent |
| `GET` | `/phase-groups` | List all phase groups with agent counts, state, alignment points |
| `GET` | `/phase-groups/:name` | Phase group detail |
| `GET` | `/cues` | Active/pending cues |

**Example:**

```bash
curl http://localhost:8765/health
```

```json
{
  "status": "ok",
  "uptime_ms": 4820000,
  "beats": { "counter": 9600, "tick_ms": 500, "is_running": true },
  "agents": { "total": 3, "by_state": { "offline": 0, "listening": 3, ... } },
  "cues": { "total": 5, "active": 2, "pending": 0 },
  "phase_groups": 3
}
```

---

## Key Features

- **⏱️ Cognitive beat engine** — temporal heartbeat ticking at configurable intervals (default 500ms); no wall-clock synchronisation between agents needed
- **🧭 Pre-cueing (negative offset)** — `offset_beats < 0` immediately primes an agent for the "long-running agent" pattern
- **👥 Phase group alignment** — agents coordinate within groups; alignment points auto-advance when all members complete
- **❤️ Heartbeat / PING** — agents send `PING` to stay alive; 30-second silence marks them as stale and removes them from groups
- **🔄 Deterministic state machine** — automatic transitions (OFFLINE → REGISTERED → LISTENING → CUED → PRIMED → FIRING → COMPLETE → LISTENING)
- **🧹 Stale agent cleanup** — every 15 seconds the dispatcher evicts agents that haven't heartbeated in 30s
- **📊 Full observability** — REST endpoints for health, agent listing, phase groups, and cue visibility

---

## Code Examples

### JavaScript: Connect, Register, Await Cue, Fire

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8765');

ws.on('open', () => {
  // 1. Register
  ws.send(JSON.stringify({
    type: 'REGISTER',
    payload: {
      name: 'MyAgent',
      timbre: 'analytical',
      frequency: 1.0,
      latency_ms: 150,
      context_depth: 'medium',
    },
  }));
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  const { type, payload } = msg;

  switch (type) {
    case 'REGISTERED':
      console.log(`Registered as ${payload.agent_id}`);
      // 2. Subscribe to a phase group (transitions REGISTERED → LISTENING)
      ws.send(JSON.stringify({
        type: 'SUBSCRIBE',
        payload: { phase_groups: ['synthesize'] },
      }));
      break;

    case 'CUED':
      console.log(`Cued by ${payload.source}, offset=${payload.offset_beats}`);
      // Wait for PRIMED
      break;

    case 'PRIMED':
      console.log(`Primed! Cue ${payload.cue_id} ready`);
      // 3. Fire
      ws.send(JSON.stringify({ type: 'FIRE', payload: {} }));
      break;

    case 'FIRE_ACK':
      console.log('Firing acknowledged');
      // 4. Report completion
      ws.send(JSON.stringify({
        type: 'REPORT',
        payload: {
          result: 'completed',
          duration_beats: 1,
          phase_group: 'synthesize',
        },
      }));
      break;

    case 'COMPLETE_ACK':
      console.log('Completion acknowledged, returning to LISTENING');
      break;

    case 'ERROR':
      console.error(`Error: ${payload.message}`);
      break;
  }
});

// Heartbeat every 10 seconds
setInterval(() => {
  ws.send(JSON.stringify({ type: 'PING', payload: {} }));
}, 10000);
```

### Sending a Cue to Another Agent

```javascript
// From agent A:
ws.send(JSON.stringify({
  type: 'CUE',
  payload: {
    target_id: 'chronicler_v1',
    offset_beats: 5,    // fire in 5 cognitive beats
    phase_group: 'gather',
    payload: { topic: 'design-doc-v2' },
  },
}));
```

### Pre-Cue (Negative T-Minus)

```javascript
// Immediate priming — recipient goes straight to PRIMED:
ws.send(JSON.stringify({
  type: 'CUE',
  payload: {
    target_id: 'chronicler_v1',
    offset_beats: -3,    // negative = pre-cue, skips CUED
    phase_group: 'deliver',
  },
}));
```

---

## Ecosystem

T-Minus is the dispatcher layer in the **Composite Headspace** orchestration stack:

| Repository | Role |
|------------|------|
| [tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher) | ⏱️ **This repo** — the cue dispatcher server |
| [tminus-client](https://github.com/SuperInstance/tminus-client) | JavaScript/TypeScript client library for agents |
| [fleet-bridge](https://github.com/SuperInstance/fleet-bridge) | Multi-machine fleet routing and discovery |
| [symphony-runtime](https://github.com/SuperInstance/symphony-runtime) | Full Symphony of Shells runtime environment |
| [composite-headspace](https://github.com/SuperInstance/composite-headspace) | Multi-agent cognitive orchestration framework |

---

## Running the Simulation

A built-in simulation exercises all three agent types (Chronicler, Architect, Critic) through a full orchestration flow:

```bash
# Start the dispatcher (in one terminal)
node src/index.js

# Run the simulation (in another terminal)
node tests/simulate.js
```

The simulation validates:
- Standard t-minus +3 cue with countdown → CUED → PRIMED → FIRING → COMPLETE
- Zero-offset cue (immediate prime → PRIMED with `pre_cued: true`)
- Negative t-minus pre-cueing (instant PRIMED)
- Phase group alignment and advancement
- REST health and agent listing endpoints

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/SuperInstance/tminus-dispatcher).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes (`git commit -am 'Add amazing thing'`)
4. Push to the branch (`git push origin feature/amazing-thing`)
5. Open a Pull Request

---

## License

MIT © [SuperInstance](https://github.com/SuperInstance)

---

<p align="center">
  <sub>Built with ⏱️ for the Symphony of Shells</sub>
</p>
