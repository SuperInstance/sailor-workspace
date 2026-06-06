# Deadband SNR — Temporal Sparsity, Not Low-Pass

**Source:** forgemaster-archive/experiments/deadband-snr/

## The Core Insight

Deadband is **NOT a low-pass filter** — it exploits temporal sparsity. Key results:
- 89% correlation on sparse signals vs 39% for moving average
- Moving average actually **degrades** SNR by 5.6 dB on sparse data
- Mathematical bound: `suppression_rate = erf(τ / (σ√2))`

**Why this matters for ternary:** Deadband matches the "0 is not nothing" principle — the neutral state silently holds between threshold crossings. Ternary zero ≠ noise; ternary zero is the deadband.

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **pincher** | Signal processing primitive for reflex triggers | P1 |
| **ternary-types** | Core deadband operation as type-level trait | P1 |
| **sonar-vision** | Sonar ping preprocessing — deadband before ternary encoding | P1 |
| **DeckBoss** | Sensor stream filtering on edge devices | P2 |
| **constraint-theory-core** | Deadband as constraint: "only report when change exceeds threshold" | P2 |

## Cold Cache

See `COLD_CACHE/experiments/deadband-in-pincher.md` for the integration attempt with pincher's reflex engine.
