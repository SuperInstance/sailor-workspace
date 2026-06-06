# Sensation → Abstraction Pipeline

**Source:** SYNERGY-MAP.md, polychora-time-research.md, The Shoe Abstraction

## The Core Insight

Every sensor (radar, sonar, depth sounder, camera, voice) produces raw data flowing through a universal pipeline:

```
Sensor → Ternary-Temporal Voxel → Pincher Reflex → Conservation Model → Dashboard
```

The **4D voxel** (x, y, z, w=time) is the universal intermediate representation. Once sensor data is voxelized, every downstream system speaks the same language.

## The Shoe Abstraction

```
Sock (raw sensation):     ESP32 sensor noise, raw radar, unprocessed camera feeds
Shoe (abstraction layer): ternary-temporal encoding, pincher reflexes, conservation models
Ground (perception):      captain's dashboard, agent's understanding
```

A well-built shoe is invisible — the captain feels the fish, not the code.

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **polychora-temporal** | THE 4D voxel engine — this is its core purpose | P0 |
| **pincher** | Reflex engine consumes voxelized events, produces actions | P0 |
| **sonar-vision** | Sonar pings → ternary-temporal voxel → reflex | P1 |
| **handy-marine-voice** | Voice commands → ternary grammar → voxel marker | P1 |
| **DeckBoss** | Dashboard rendering of voxel state → captain perception | P1 |
| **ternary-spatial** | The spatial encoding layer (before time) | P1 |
| **ESP32-Plane-Radar** | ADS-B → ternary encoding → voxel | P2 |

## Expansion Potential

Create a `sensory-cortex` crate that:
1. Defines `Sensor<TritVector>` — the universal sensor adapter
2. Wraps ADS-B, sonar, depth, GPS, voice into one stream type
3. Projects into polychora-temporal voxel space
4. Feeds pincher reflexes directly

One crate, any sensor, universal downstream.
