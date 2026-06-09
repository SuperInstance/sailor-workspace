# Demucs WebSocket Service — Audio Source Separation Bridge

Runs Demucs 4.0.1 as a WebSocket service on port :8771.
Accepts audio, separates into stems (drums, bass, other, vocals),
and optionally forwards the vocals stem to the Basic Pitch bridge.

## Quick Start

```bash
# Check deps
python3 -m demucs_websocket --check

# Start server
python3 -m demucs_websocket
```

## Protocol

See `__init__.py` docstring for full WebSocket protocol.
