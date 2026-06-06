# The Compute Ladder — Zero-Infra to GPU Farm

**Source:** SYNERGY-MAP.md, FLEET_ARCHITECTURE.md, nebula worker design

## The Core Insight

The fleet spans six orders of magnitude in compute: **ESP32 (coin cell) → ARM64 (gateway) → Cloudflare Workers → GPU Farm**. The `nail` bundle format is the "USB-C of agent migration" — one format, any runtime.

I2I-over-MQTT fits in **256-byte LoRa payloads**, meaning a boat 30 miles offshore with zero cell signal still coordinates with the fleet.

**The ladder:**
```
ESP32 (edge sensor)
    → ternary-encoded data (3 trits = 1 byte)
    → Cloudflare Worker (high-confidence reflex edge execution)
        → .nail bundle if confidence < 0.90
        → ARM64 gateway (full reflex engine)
            → GPU farm (deep inference, model training)
```

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **pincher** | .nail bundle format is THE universal mobile agent format | P0 |
| **nebula** | Cloudflare Worker as first ladder rung | P1 |
| **DeckBoss** | Cloudflare agent runtime = L3 activation layer | P1 |
| **cocapn** | CoCapn Lite subagent on ESP32 via WASM | P2 |
| **handy-marine-voice** | Voice → edge inference → return .nail command | P2 |
| **forgemaster shell** | GPU farm as the highest ladder rung | P2 |

## Expansion Potential

Document the compute ladder as a formal protocol:
1. `ternary-esp32-firmware` — sensor encoding on the edge
2. `nebula` — Cloudflare reflex edge
3. `pincher` — ARM64 full reflex
4. `forgemaster-shell` — GPU deep inference

The migration path is a decision DAG: confidence threshold, latency budget, power budget.
