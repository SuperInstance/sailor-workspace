# Symphony Orchestrator 🎻

> **One-command master run script for the full SuperInstance fleet stack**

[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)] [![MIT](https://img.shields.io/badge/license-MIT-blue)] [![SuperInstance](https://img.shields.io/badge/SuperInstance-Fleet-purple)]

## Quick Start

```bash
git clone https://github.com/SuperInstance/symphony-orchestrator
cd symphony-orchestrator
npm install
node orchestrate.js
```

## What It Does

Orchestrates the entire SuperInstance cognitive fleet in dependency order:

1. Starts **t-minus Dispatcher** (port :8765)
2. Waits for `/health` to return 200
3. Starts **Fleet Bridge** (port :9876)
4. Starts **I2I Bottle Agent**
5. Registers a master agent → verifies end-to-end connectivity
6. Prints live status dashboard
7. Traps SIGINT for clean teardown

## Files

| File | Purpose |
|------|---------|
| `orchestrate.js` | Master runner (546 lines) |
| `status.js` | Live dashboard with `--watch` mode |
| `healthcheck.sh` | Shell-based health checker, green/red output |
| `kill-all.sh` | Full teardown |
| `package.json` | Single dep: `ws` |

## Related Repos

- [⏱️ tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher) — Temporal heartbeat
- [🌉 fleet-bridge](https://github.com/SuperInstance/fleet-bridge) — A2A dual-transport
- [🎼 symphony-runtime](https://github.com/SuperInstance/symphony-runtime) — Formal grammar
- [🧠 composite-headspace](https://github.com/SuperInstance/composite-headspace) — Dual-shell reasoning
- [📡 i2i-bottle-agent](https://github.com/SuperInstance/i2i-bottle-agent) — Bottle protocol

## License

MIT
