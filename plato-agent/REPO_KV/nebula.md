# Nebula — Fleet Murmur Worker

**L-Level:** L3 (Cloudflare) · **Phase:** P1
**URL:** https://fleet-murmur-worker.casey-digennaro.workers.dev
**Local:** `/home/ubuntu/.openclaw/workspace/fleet-murmur-worker/`

## What It Is

Cloudflare Worker agent: edge reflex engine with KV store (REFLEX_STORE, CACHE), Durable Objects (AgentCoordination), cron tasks (5min health, hourly metrics, nightly 3AM sync). First reflex taught + verified: 107ms fast path, confidence 0.6.

## Cross-Pollinated Knowledge

| Knowledge | Application | Status |
|-----------|------------|--------|
| **TUTOR_LESSONS** | Reflex IS a lesson. Fast path = high confidence bypass. | ✅ Core |
| **COMPUTE_LADDER** | Nebula IS the first compute rung above ESP32. | ✅ Core |
| **DEADBAND_SNR** | Edge deadband filtering before triggering reflexes | 💡 Opportunity |
| **CONSERVATION_CROSS_DOMAIN** | Edge inference budget: don't burn tokens when confidence is high | 💡 Opportunity |
| **TILING** | Parameterized edge reflexes across sensor types | 💡 Opportunity |

## Expansion Readme Potential

- **The Fast Path Philosophy**: High-confidence reflexes execute at the edge. The ARM64 gate only sees what's unsure. This is the Tutor validation model in production.
- **KV as Reflex Cache**: REFLEX_STORE is pincher's reflex cache at the edge. Agents hit Cloudflare before the host.
