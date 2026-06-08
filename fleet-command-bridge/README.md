# ⚡ Fleet Command Bridge

**WebSocket + JSON-RPC bridge between kimi-swarm-frontend and pincher/polychora backends**

[![Rust](https://img.shields.io/badge/rust-stable-orange?logo=rust)](https://rust-lang.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![SuperInstance](https://img.shields.io/badge/SuperInstance-Fleet-purple)](https://github.com/SuperInstance)
[![MIDI Bridge](https://img.shields.io/badge/MIDI-Bridge-8B0000?style=flat)](../prototypes/README.md)

---

A lightweight, async bridge that exposes the SuperInstance fleet backend (pincher, polychora) as a JSON-RPC WebSocket endpoint consumable by the kimi-swarm-frontend. Uses axum + tokio for high-concurrency WebSocket handling.

---

## Quick Start

```bash
git clone https://github.com/SuperInstance/fleet-command-bridge
cd fleet-command-bridge
cargo build --release
cargo run
```

## What It Solves

The kimi-swarm-frontend needs a clean WebSocket interface to interact with fleet backends (pincher for constraint solving, polychora for temporal coordination). This bridge translates between the frontend's JSON-RPC calls and the backend's internal protocols — no direct coupling required.

## Architecture

```
kimi-swarm-frontend
       │
       │  WebSocket (JSON-RPC)
       ▼
fleet-command-bridge
       │
       ├──► pincher (constraint solving)
       └──► polychora-temporal (temporal coordination)
```

### Module Map

```
src/
├── main.rs          Entry point — binds axum HTTP + WS server
├── ws.rs            WebSocket upgrade and session management
├── rpc_handler.rs   JSON-RPC method dispatch
├── state.rs         Shared application state
└── types.rs         Request/response type definitions
```

## Configuration

The bridge binds to `0.0.0.0:3000` by default. Configuration is handled through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3000` | Listen port |

## API

The bridge accepts JSON-RPC 2.0 messages over a single WebSocket connection at `ws://<host>:<port>/ws`.

```json
// Request
{
  "jsonrpc": "2.0",
  "method": "pincher.solve",
  "params": { ... },
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}
```

## License

MIT

---

*Part of the [SuperInstance Fleet](https://github.com/SuperInstance) — The crab inherits the shell. The forge shapes the steel.*
