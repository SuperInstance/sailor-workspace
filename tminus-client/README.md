# T-Minus Client SDK 🔌

**Node.js client library and CLI for the [t-minus cue dispatcher](https://github.com/SuperInstance/tminus-dispatcher) protocol.**

[![Test Status](https://img.shields.io/badge/tests-40%2F40-brightgreen)](#)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-339933)](package.json)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Overview

`tminus-client` is the official Node.js SDK for interacting with the t-minus dispatcher — a real-time cue orchestration system for multi-agent fleets. It handles WebSocket transport, agent lifecycle management, and the full cue protocol (register → subscribe → cue → fire → report) with a clean, promisified API and an interactive CLI.

### Feature Highlights

| Feature | Description |
|---------|-------------|
| **Auto-reconnect with exponential backoff** | Up to 3 retry attempts with 1s, 2s, 4s delays |
| **Promisified API** | Every action returns a `Promise` that resolves on the server acknowledgment |
| **12 event types** | `connected`, `disconnected`, `registered`, `subscribed`, `cued`, `primed`, `fire_ack`, `complete`, `phase_advance`, `state_change`, `server_error`, `reconnect_failed` |
| **Pre-cue support** | Negative offsets route agents directly to `PRIMED`, skipping the `CUED` state |
| **State machine tracking** | Full lifecycle state: `offline → registered → listening → cued → primed → firing → complete` |
| **Phase group management** | Join/leave phase groups with server-sync'd membership |
| **Heartbeat keepalive** | Automatic PING/PONG at configurable interval (default 10s) |
| **Interactive CLI** | Full-featured REPL with `/register`, `/subscribe`, `/cue`, `/fire`, `/report`, and more |

---

## Installation

```bash
npm install tminus-client
```

Requires **Node.js ≥ 18**.

---

## Quick Start

Connect, register, subscribe, and handle cues in under 20 lines:

```js
const { TminusClient } = require('tminus-client');

async function main() {
  const client = new TminusClient('ws://localhost:8765');
  await client.connect();

  // 1. Register this agent with the dispatcher
  const reg = await client.register('piano-agent', {
    timbre: 'bright',
    frequency: 1.0,
    context_depth: 'medium',
  });
  console.log(`Registered as ${reg.agent_id}`);

  // 2. Subscribe to a phase group
  await client.subscribe('orchestra-alpha');
  console.log('Listening on orchestra-alpha');

  // 3. Listen for incoming cues
  client.on('cued', (p) => {
    console.log(`🎵 Cued by ${p.source} — ${p.cue_id} (offset=${p.offset_beats})`);
  });

  // 4. When primed: fire and report
  client.on('primed', async (p) => {
    console.log(`🚀 Primed — executing ${p.cue_id}`);
    await client.fire();
    await client.report('success', p.phase_group, 1);
    console.log('✅ Done');
  });

  // 5. Send a cue to another agent
  await client.cue('violin-agent', 4, 'orchestra-alpha', { note: 'C5', velocity: 80 });
}

main().catch(console.error);
```

---

## API Reference

### `TminusClient` Class

```js
const client = new TminusClient(url, opts);
```

#### Constructor Options

| Option              | Default   | Description |
|---------------------|-----------|-------------|
| `reconnectAttempts` | `3`       | Maximum number of auto-reconnect attempts |
| `reconnectDelay`    | `1000`    | Initial reconnect delay in ms (doubles each attempt) |
| `pingInterval`      | `10000`   | Heartbeat ping interval in ms |

#### Accessors

| Property      | Type      | Description |
|---------------|-----------|-------------|
| `client.agentId`   | `string` | Assigned agent ID (null until registered) |
| `client.state`     | `string` | Current lifecycle state |
| `client.phaseGroups` | `string[]` | Subscribed phase groups |
| `client.connected` | `boolean` | WebSocket connection status |
| `client.debug`     | `boolean` | Enable verbose debug logging (setter) |

#### Connection Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `Promise<void>` | Open WebSocket connection to the dispatcher |
| `disconnect()` | `void` | Cleanly close the connection and reset state |

#### Agent Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `register(name, opts?)` | `Promise<object>` | Register agent with the dispatcher. `opts` may include `timbre`, `frequency`, `latency_ms`, `context_depth` |
| `subscribe(groups)` | `Promise<object>` | Join one or more phase groups |
| `unsubscribe(groups)` | `Promise<object>` | Leave one or more phase groups |
| `cue(targetId, offsetBeats, phaseGroup, payload?)` | `Promise<object>` | Send a t-minus cue to another agent. Negative `offsetBeats` = pre-cue, zero = immediate, positive = countdown |
| `fire()` | `Promise<object>` | Execute the current cue (agent must be `PRIMED`) |
| `report(result, phaseGroup, durationBeats?)` | `Promise<object>` | Report completion back to the dispatcher |
| `fireAndReport(result, phaseGroup, durationBeats?)` | `Promise<object>` | Convenience: fires and reports in one call |
| `awaitCue(timeoutMs?)` | `Promise<object>` | Promise that resolves on the next `CUED` event (default timeout 30s) |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | — | WebSocket connection established |
| `disconnected` | — | WebSocket connection closed |
| `registered` | `{ agent_id, state, phase_groups? }` | Agent registered with dispatcher |
| `subscribed` | `{ agent_id, phase_groups }` | Phase group subscription confirmed |
| `unsubscribed` | `{ phase_groups }` | Phase group unsubscription confirmed |
| `cued` | `{ cue_id, source, offset_beats, delay_ms, phase_group, payload, pre_cued? }` | Incoming t-minus cue received |
| `primed` | `{ cue_id, source, pre_cued?, payload? }` | Countdown complete — agent is primed and ready to fire |
| `fire_ack` | `{ state }` | Server acknowledged the fire command |
| `complete` | `{ state, cues_completed }` | Report accepted — cue cycle complete |
| `phase_advance` | `{ group, point }` | Phase group advanced to a new alignment point |
| `state_change` | `{ from, to }` | Internal state machine transition |
| `server_error` | `{ code, message }` | Error message from the dispatcher |
| `pong` | `payload` | Heartbeat response received |
| `reconnect_failed` | — | All auto-reconnect attempts exhausted |

### Lifecycle State Machine

```
  ┌──────────────────────────────────────────────┐
  │                                              ▼
OFFLINE ──► REGISTERED ──► LISTENING ──► CUED ──► PRIMED ──► FIRING ──► COMPLETE
   ▲                        ▲            ▲         │                      │
   │                        │            └─────────┘                      │
   │                        └─────────────────────────────────────────────┘
   └───────────────────────────────────────────────────────────────────────┘
```

Agents flow through states as they progress through the cue lifecycle. The state machine validates all transitions and emits `state_change` events.

---

## CLI Reference

The `tminus-cli` provides an interactive REPL for manual testing and debugging.

### Usage

```bash
# Basic — connect to localhost:8765
npx tminus-cli

# Specify port and auto-register
npx tminus-cli --port 8765 --name my-agent

# Full URL
npx tminus-cli --url ws://dispatcher.example.com:9876

# Auto-register and auto-subscribe
npx tminus-cli --name agent-alpha --subscribe orchestra-alpha,orchestra-beta
```

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--port <N>` | `-p` | Server port (default: 8765) |
| `--url <host>` | `-u` | Full WebSocket URL |
| `--name <name>` | `-n` | Auto-register with this name on connect |
| `--subscribe <g>` | `-s` | Auto-subscribe to comma-separated phase groups |
| `--help` | `-h` | Show help |

### Interactive Commands

| Command | Description |
|---------|-------------|
| `/connect` | Connect (or reconnect) to the dispatcher |
| `/disconnect` | Disconnect from the dispatcher |
| `/register <name>` | Register this agent with the given display name |
| `/subscribe <group> [...]` | Subscribe to one or more phase groups |
| `/unsubscribe <group>` | Unsubscribe from a phase group |
| `/cue <target> <offset> <group> [payload]` | Send a t-minus cue to another agent |
| `/cue-await <target> <offset> <group> [payload]` | Send cue then wait for PRIMED |
| `/fire` | Fire the current cue |
| `/report <result> <group> [durationBeats]` | Report completion |
| `/firereport <result> <group> [durationBeats]` | Fire and report in one step |
| `/status` | Show connection, agent, state, and phase group info |
| `/ping` | Send a heartbeat ping |
| `/help` | Show all commands and usage |
| `/quit` / `/exit` | Disconnect and exit |

> Any line beginning with `{` is sent as raw JSON to the WebSocket.

---

## Code Examples

### Full Agent Lifecycle

```js
const { TminusClient, STATE } = require('tminus-client');

async function runAgentCycle() {
  const client = new TminusClient('ws://localhost:8765');
  await client.connect();

  // Register with optional tuning parameters
  await client.register('agent-delta', {
    timbre: 'warm',
    frequency: 0.85,
    latency_ms: 200,
    context_depth: 'deep',
  });
  console.log(`Agent ID: ${client.agentId}`);    // → "agent-delta-abc123"
  console.log(`State: ${client.state}`);          // → "registered"

  // Subscribe
  await client.subscribe(['rhythm-section', 'brass']);
  console.log(`Groups: ${client.phaseGroups}`);   // → "rhythm-section, brass"

  // Listen for events
  client.on('state_change', ({ from, to }) =>
    console.log(`State: ${from} → ${to}`));

  client.on('cued', (p) =>
    console.log(`⏱ Cue #${p.cue_id} incoming in ${p.delay_ms}ms`));

  client.on('primed', async (p) => {
    console.log(`🚀 Firing!`);
    await client.fire();
    console.log(`📋 Reporting ...`);
    await client.report('success', p.phase_group, 2);
    console.log(`✅ Complete`);
  });

  // Send a cue to another agent
  const cue = await client.cue('agent-echo', 4, 'rhythm-section', { bpm: 120 });
  console.log(`Cue ${cue.cue_id} dispatched (pre_cued=${cue.pre_cued})`);
}

runAgentCycle().catch(console.error);
```

### Using Pre-cues (Negative Offset)

```js
// Pre-cue — recipient skips CUED and goes directly to PRIMED
await client.cue('agent-target', -1, 'orchestra-alpha', { urgent: true });
// The `primed` event fires immediately with `pre_cued: true`
```

### Fire-and-Report Convenience

```js
await client.fireAndReport('success', 'orchestra-alpha', 3);
// Shorthand for: await client.fire(); await client.report(...);
```

### Awaiting a Cue Programmatically

```js
const cue = await client.awaitCue(15000);   // Wait up to 15s for next cue
console.log(`Cued by ${cue.source}`);
```

### Handling Server Errors

```js
client.on('server_error', (err) => {
  console.error(`Dispatcher error [${err.code}]: ${err.message}`);
});
```

---

## Integration

This library is designed to work alongside:

| Project | Description |
|---------|-------------|
| [tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher) | The cue dispatcher server that manages agent registration, phase group alignment, and cue timing |
| [fleet-bridge](https://github.com/SuperInstance/fleet-bridge) | Inter-fleet bridging layer for cross-cluster cue propagation and mesh networking |

---

## TypeScript

The library is written in plain JavaScript. Type definitions (`.d.ts`) are planned for a future release.

---

## Testing

The test suite runs a full integration scenario: it spawns the dispatcher server, connects two agents, and exercises the entire lifecycle — register, subscribe, cue, wait for PRIMED, fire, report, unsubscribe, and disconnect.

```bash
npm test
```

This runs `tests/simulate.js`, which:
1. Starts the t-minus dispatcher on a random port
2. Connects two `TminusClient` instances (agent-alpha, agent-beta)
3. Tests all protocol messages and state transitions
4. Validates pre-cue, fire-and-report, heartbeat, and reconnect scenarios
5. Counts 40 passing assertions

To run against an already-running dispatcher, modify the `PORT` and `URL` constants in `tests/simulate.js`.

---

## Project Structure

```
tminus-client/
├── src/
│   ├── client.js      # TminusClient class — core SDK
│   └── cli.js         # tminus-cli — interactive REPL
├── tests/
│   └── simulate.js    # Integration test suite (40 tests)
├── package.json
└── README.md
```

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/SuperInstance/tminus-client).

### Guidelines

1. **Keep the SDK lean** — core transport and protocol only. Higher-level orchestration logic belongs in separate packages.
2. **Preserve the promisified contract** — all public methods must return Promises that resolve on server acknowledgment.
3. **Maintain the state machine** — validate all state transitions. Add new states to `VALID_UP_TRANSITIONS`.
4. **Add tests** — the `simulate.js` suite should cover any new functionality.
5. **No breaking changes** — existing method signatures and event payloads must remain backward-compatible.

---

## License

[MIT](LICENSE) © SuperInstance

---

<div align="center">
  <sub>Built for the t-minus distraction protocol · cue · fire · complete</sub>
</div>
