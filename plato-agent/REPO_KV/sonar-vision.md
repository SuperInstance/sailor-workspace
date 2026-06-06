# Sonar-Vision — Acoustic Sensor Pipeline

**L-Level:** L1 · **Phase:** P2
**Local:** `/home/ubuntu/.openclaw/workspace/sonar-vision/`

## What It Is

Marine acoustic sensor: sonar ping preprocessing, depth detection, beamforming. Already cross-pollinated with marine-gpu-edge, holodeck-rust, cocapn-dashboard, fleet-simulator.

## Cross-Pollinated Knowledge

| Knowledge | Application | Status |
|-----------|------------|--------|
| **DEADBAND_SNR** | Sonar ping preprocessing — deadband before ternary encoding | P1 |
| **SENSATION_TO_ABSTRACTION** | Sonar pings → ternary-temporal voxel → reflex | P1 |
| **COMPUTE_LADDER** | Edge sonar processing on ESP32 → CF reflex → full pipeline | P2 |
| **CONSERVATION_CROSS_DOMAIN** | Sensor energy budget conservation | P2 |

## Expansion Readme Potential

- **Sock → Shoe → Ground**: Sonar is the sock. Ternary-temporal encoding is the shoe. Dashboard is the ground.
- **Deadband as First Processing Step**: Why low-pass degrades sonar, deadband preserves it.
