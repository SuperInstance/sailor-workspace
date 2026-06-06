# SYNERGY-MAP.md — Intersection Discovery Across the SuperInstance Fleet

**Generated:** 2026-06-05  
**Commander:** Oracle2 — Ideation Exploration  
**Scope:** ESP32-Plane-Radar, sonar-vision, handy-marine-voice, PX4-Autopilot, DeckBoss, CoCapn, ternary-* (195+), polychora-temporal, pincher, conservation-thesis  
**Method:** Symmetry detection + constraint mapping + architectural cross-pollination  

---

## Table of Contents

1. [Sensation → Abstraction Pipeline](#1-sensation--abstraction-pipeline)
2. [Edge-Cloud Symbiosis Protocol](#2-edge-cloud-symbiosis-protocol)
3. [Emergent Multi-Boat Intelligence](#3-emergent-multi-boat-intelligence)
4. [The Shoe Abstraction — "sock → shoe → ground"](#4-the-shoe-abstraction)
5. [Conservation Across Domains](#5-conservation-across-domains)
6. [Cross-Fleet Topology](#6-cross-fleet-topology)
7. [Appendix: Technology Readiness by Synergy](#appendix)

---

## 1. Sensation → Abstraction Pipeline

### Connection
Five raw sensory modalities — ADS-B radio (ESP32-Plane-Radar), sonar pings (sonar-vision), voice commands (handy-marine-voice), camera frames (CoCapn tile ingest), inertial/GPS (PX4) — all flow through the same pipeline: **Stream → Discretize → Ternary-Encode → Polychora-Spatialize → Reflex-Act**. This is a universal "sensor → knowledge" pipeline that every hardware project in the fleet accidentally implements one piece of.

### Why It Matters
Currently each sensor front-end is wired directly to its own display or action loop. ESP32-Plane-Radar renders to a round screen. Sonar renders to a depth chart. Voice controls a rudder. There is **no shared sensory cortex**. This means every insight discovered by one sensor (bird strike on radar → flock of birds = obstruction below?; sonar anomaly → depth change = collision risk) is invisible to the others. A multi-boat fleet that fuses these sensors into a single 4D temporal space (polychora W=Time) gains **cross-modal perception**: radar sees above-surface objects 10km out, sonar sees below-surface objects 100m down, voice carries intent, and pincher reflexes trigger without any human in the loop.

### Implementation Sketch

**Phase 1 — Universal Sensor Adapter (P1)**
Create a thin Rust crate (`sensory-cortex` or `ternary-sense`) that wraps each sensor protocol:
- ADS-B → `TritVector<{bearing, altitude, velocity, callsign_hash}>` — ternary encodes aircraft as position-weight vectors in a 3D spatial grid
- Sonar depth → `TritVector<{depth, confidence, temperature}>` — depth readings as signed ternary displacements from expected seabed
- Voice intent → `TritVector<{command, confidence, speaker_hash}>` — mapped through ternary-grammar
- GPS/IMU → Already natively navigable in ternary-matrix

The adapter abstracts away the sensor: agents downstream see a `SensorStream<TritVector>` regardless of whether the source is an ESP32 listening on 1090MHz or a depth sounder at 200kHz.

**Phase 2 — Polychora Temporal Voxelization (P1)**
All sensor streams project into a shared polychora W=Time hypervoxel space:
- X/Y = geographic position (lat/lng)
- Z = altitude/depth (above/below sea level)
- W = time (seconds into the future predicted, or seconds into the past since event)
- Each sensor writes to a different "color channel" in the 4D voxel (radar objects = red emission, sonar bathymetry = blue absorption, voice commands = green markers)
- Chunk size stays 8³·W, but W slices become temporal prediction windows

VTE Stage A (4D→3D hyper-image) naturally produces **fused environmental snapshots** that show "what happened, what will happen, and where it is" in one query. An agent looking 30 seconds ahead can see: *"Aircraft at bearing 120° will cross my path at t+20s; sonar shows 3m shallowing at same position; voice just said 'turn starboard 15°' — conflict detected."*

**Phase 3 — Reflex Induction from Cross-Modal Patterns (P0)**
Pincher's reflex engine learns from the fused stream:
- Pattern: Radar shows aircraft → sonar shows wake turbulence → reflex: adjust heading +15° automatically
- Pattern: Voice says "fishing spot" → GPS marks location → reflex: publish tile to fleet knowledge base
- Pattern: Sonar shows fish school density rising → radar shows fishing boats approaching → reflex: send alert to DeckBoss for fleet coordination

The confidence feedback loop strengthens reflexes that predict well across modalities and decays reflexes that overfit to one sensor.

**Priority:** P0 (the fusion pipeline is the single most impactful cross-project investment)

---

## 2. Edge-Cloud Symbiosis Protocol

### Connection
The fleet spans six orders of magnitude in compute capability: ESP32-C3 (single-core RISC-V, 400KB SRAM) → ARM64 Oracle (4 cores, 24GB) → Cloudflare Workers (V8 isolates, <50ms cold starts) → ProArt GPU farm (Ryzen + RTX4050). **DeckBoss** (Cloudflare agent runtime), **CoCapn** (repo-first agent framework), and **pincher** (reflex runtime with sandbox) each solve a different piece of the same problem: how does an agent migrate between these tiers without dropping state or security?

### Why It Matters
Right now, each runtime tier is a walled garden. CoCapn agents live inside Cloudflare Workers. Pincher crabs live on the ARM64 gateway. Ternary crates compile on the GPU farm. There is no **unified migration protocol** that lets a reflex start as an ESP32 edge prediction → escalate to Cloudflare for context → deepen on the GPU for model inference → return as a compact .nail bundle to the edge. This is the "compute ladder" — and climbing it requires protocol-level compatibility.

### Implementation Sketch

**Phase 1 — DeckBoss as the Cloudflare Side of CoCapn+Pincher (P1)**
DeckBoss (Cloudflare Workers agent) naturally serves as the **fleet's L3 activation layer** (from FLEET_ARCHITECTURE.md). Its repo-first model means:
- A pincher crab's `.nail` bundle (BLAKE3 checksummed, self-contained agent state) is a valid CoCapn depot artifact
- DeckBoss's KV store becomes pincher's reflex registry cache — agents hit Cloudflare's edge KV for reflex lookups instead of hitting the ARM64 host
- CoCapn's tile learning (Q&A → Tile → Room → Flywheel) feeds pincher's reflex confidence: high-confidence CoCapn answers become pincher reflexes

The bridge is a shared artifact format: **the `.nail` bundle becomes the universal mobile agent format across all three systems.**

**Phase 2 — ESP32: The Runt Edge (P1)**
ESP32 cannot run pincher (Rust → riski? actually ESP32-C3 supports Rust via `esp-rs`, and the LoRa/RTL-SDR SBC footprint is tight). But it can run a **CoCapn Lite subagent** (~200 lines of TypeScript compiled to WASM) plus a **ternary sensor shim**:

- ESP32 runs: C/Rust firmware for sensor read → ternary encoding (3 tits per reading = 1/3 byte) → CoAP or MQTT publish
- Cloudflare Worker (DeckBoss) receives ternary-encoded sensor data → decodes into pincher-compatible `ReflexTrigger`
- Cloudflare Durable Objects maintain agent state across sensor drops
- If the reflex confidence is high (<0.90), the Worker executes the reflex **without ever hitting the ARM64 host**

This achieves the migration ladder:
```
ESP32 → (ternary-encoded sensor data) → Cloudflare Worker → (reflex match?) → 
    Yes: execute at edge                    
    No: forward .nail bundle to ARM64 (pincher) → ARM64 may escalate to GPU farm
```

**Phase 3 — I2I Over All Transports (P2)**
The iron-to-iron (I2I) protocol currently runs over HTTP/TCP. Extend it:
- **I2I-over-MQTT** — ESP32-friendly publish/subscribe (LoRa payloads fit in 256 bytes; I2I bottles are ~60 bytes for a typed baton)
- **I2I-over-CoAP** — UDP-friendly for noisy marine environments
- **I2I-over-CF-PubSub** — Cloudflare's native pub/sub for Worker-to-Worker coordination

A DeckBoss worker on Cloudflare can I2I-bottle to an ESP32 Plane Radar — the bottle says "turn on second frequency 978MHz UAT" and the ESP32 checks its veto engine first, then acts.

**Priority:** P0 (unlocks the full strength gradient from ESP32 → GPU)

---

## 3. Emergent Multi-Boat Intelligence

### Connection
If every boat in a fleet runs (1) an ESP32 plane radar scanning 1090MHz, (2) a sonar-vision depth predictor, (3) a handy-marine-voice autopilot, (4) a DeckBoss CoCapn agent with pincher reflexes, and (5) communicates via I2I-over-Whatever — the fleet becomes a **distributed sensorium**. The single-boat behaviors (collision avoidance, fish finding) become **fleet-level emergent behaviors** that no single boat's reflex system was programmed for.

### Why It Matters
Three synergistic emergent behaviors stand out:

**a) Generative Fleet-Level Fish School Map.** Each boat's sonar pings a local volume. Polychora's W=Time projection lets the fleet predict where schools will be 30 minutes from now by correlating:
- Boat A's fish density readings at (x,y,z,t) 
- Boat B's readings at (x+500,y+200,z-10,t+120s)
- ADS-B fishing vessel positions (boats that know where fish are)
- The whole fleet → a 4D hypervoxel prediction of fish stock movement

**b) Cooperative Collision Avoidance.** ESP32-Plane-Radar sees an aircraft approaching at 100 knots. If that aircraft is on a collision course with Boat B, Boat A's pincher reflex triggers an I2I bottle: "COLLISION_ADVISORY: bearing 270°, altitude 500ft, ETA 45s." Boat B's DeckBoss agent sees FIVE concurrent collision advisories from different boats — it knows it's a real threat, not a false positive.

**c) Distributed A/B Testing for Marine Operations.** Different boats try different autopilot turn radii. PX4 logs show Boat C's 30° turn uses 12% less fuel than Boat D's 25° turn at identical speed. The fleet consensus (holonomy rigidity from ontologies) converges on the optimal profile and propagates it as a locked reflex.

### Implementation Sketch

**Phase 1 — Cross-Boat Tile Repository (P1)**
Each boat's CoCapn tile store syncs to a shared fleet DB (Cloudflare D1 or a shared CoCapn repo):
- Tiles are annotated with provenance: `boat_id`, `sensor_type`, `confidence`, `ternary_weight`
- When Boat A asks "where are fish typically at 14:00?" — it gets tiles from all boats, ranked by recency and confidence
- Flywheel (CoCapn's compounding engine) learns across boats, not per-boat: fleet-wide intelligence emerges from per-boat observations

**Phase 2 — Multi-Vessel Polychora Overlay (P1)**
Instead of one boat's localized 4D view, the fleet projects into a **shared polychora world** where:
- X/Y = lat/lng (fleet-scale, not local)
- Z = bathymetry + airspace combined
- W = fleet-synced time (metronome-core θ-tuple synced)
- Each vessel is a "viewer" that can orient along any ZW/YW/XW rotation to see **from another boat's perspective at another time**

This is the "flat ontology" from Ontology vision realized: every vessel contributes its local sensing to one shared temporal hypervoxel field.

**Phase 3 — Reflex Inheritance Protocol (P2)**
When Boat E discovers a great new reflex ("if sonar AND radar both show anomaly → reduce speed 20% and sound horn"), the reflex publishes as a `.nail` candidate. Other boats' veto engines evaluate it and either lock it (confidence > 0.90 across all boats) or hold it pending more evidence. This is **distributed reflex evolution**: the fleet grows smarter together, not per-vessel.

**Priority:** P1 (not P0 because it requires the sensation pipeline to be built first — but it's the endgame that justifies the pipeline)

---

## 4. The Shoe Abstraction — "sock → shoe → ground" Architectural Pattern

### Connection
The "sock → shoe → ground" metaphor appears implicitly across multiple SuperInstance projects. Documenting it as a **formal architectural pattern** gives the fleet a shared vocabulary for how raw perception becomes actionable capability. The pattern is:

```
SOCK (intimacy layer)  →  SHOE (interface layer)  →  GROUND (world layer)
  Comfort/responsiveness     Protection/translation     Surface/constraint
  What the agent feels       What the agent wears       What the agent walks on
```

### Why It Matters
Every project has re-invented this pattern independently:

| Project | SOCK | SHOE | GROUND |
|---------|------|------|--------|
| **pincher** | Reflex engine (instant, known) | Veto engine + Sandbox | World model (ternary state) |
| **ESP32-Plane-Radar** | ADS-B decoder (raw 1090MHz) | Display rendering + range rings | Airspace (real aircraft) |
| **sonar-vision** | Depth sounder ADC | Neural network → video prediction | Seabed (real topography) |
| **handy-marine-voice** | Microphone ADC + VAD | Speech-to-intent classifier | Marine environment (steering) |
| **PX4-Autopilot** | IMU/GPS sensor fusion | Control loops (PID/mixer) | Physical air/water |
| **CoCapn** | QA pair (raw interaction) | Tile → Room → Flywheel | Knowledge base (the repo) |
| **ternary-*** | TernaryType (raw trit) | Ternary operation (transformation) | Domain (math, physics, agent) |
| **polychora** | Voxel data (raw 4D grid) | VTE rendering pipeline | User's viewport |
| **conservation-thesis** | Raw resource flow | Budget/Profile/Detect/Report | Conserved domain (fuel, fish, attention) |

### Implementation Sketch

**Formalize the Pattern (P1)**
Define the Shoe Abstraction as a trait in `ternary-core`:

```rust
/// The Shoe Abstraction: a three-layer perception-to-action pipeline.
///
/// - Sock: The intimacy layer. Raw sensor data. Must be comfortable (low latency,
///   high refresh rate) and close to the agent's "skin."
/// - Shoe: The interface layer. Translates sock data into ground-compatible format.
///   Must protect (filter noise, validate ranges) and fit well (no abstraction leak).
/// - Ground: The world layer. What the agent acts upon. The constraint surface
///   that defines what actions are possible.
pub trait ShoeAbstraction<Sock, Shoe, Ground> {
    type Measurement;  // What the sock senses
    type Capability;   // What the shoe enables
    type Affordance;   // What the ground allows

    /// Convert raw sensor reading into processed measurement
    fn sock_to_shoe(raw: Sock) -> Self::Measurement;

    /// Filter/validate/protect the measurement for ground action
    fn shoe_to_ground(measurement: Self::Measurement) -> Option<Self::Capability>;

    /// Check if the ground surface supports this capability
    fn check_affordance(capability: &Self::Capability, ground: &Ground) -> bool;
}
```

**Pattern Rules (P0)**
1. **Sock never touches ground.** No layer skips. Raw ADS-B 1090MHz frames never feed directly into a collision avoidance reflex — they must pass through the shoe (position decode, confidence estimation, unit conversion).
2. **Each layer filters one thing.** Sock filters temporal noise. Shoe filters semantic noise. Ground filters action noise.
3. **You can change the shoe without changing the foot.** If ADS-B data format changes (Mode S Extended Squitter v2), only the shoe updates. The sock (antenna) and ground (airspace) are unaffected.
4. **If the shoe pinches, you wore the wrong shoe.** A shoe layer that requires too much compute for its ground introduces a "blister" — a resource pressure point. The shoe must be replaceable with a lite version for lower-tier hardware.

**Documentation (P1)**
Write `docs/shoe-abstraction.md` in pincher with:
- 3 worked examples (sensor fusion, agent migration, reflex composition)
- A "shoe size chart" mapping every fleet project's sock/shoe/ground
- A checklist for new projects: "what is your sock? what is your ground? have you built a shoe?"

**Priority:** P0 (this is the fleet's shared vocabulary — without it, we can't talk about cross-project integration coherently)

---

## 5. Conservation Across Domains

### Connection
The conservation thesis (Budget → Profile → Detect → Report) was developed as a resource philosophy for AI agent operations. But the same four-stage cycle — **budget your resource, profile its consumption pattern, detect anomalies, report for collective learning** — applies identically to fish stocks, fuel consumption, crew energy, model inference budgets, and disk space.

### Why It Matters
The fleet's conservation law has been context-specific (pincher's PID controller budgets CPU; the PLATO construct budgets attention). But the STRATEGY-2026-06-05 analysis revealed: *"Conservation law is context-sensitive — not one law but a family of isomorphic laws; every system defined by what it conserves."* This means the conservation engine is **parametrically reusable**. The same code that budgets fuel for a boat can budget tokens for an LLM call, battery for an ESP32, or training data fidelity for a neural network.

### Implementation Sketch

**Phase 1 — Abstract Conservation Engine (P1)**
Create `ternary-conserve` — a generic conservation runtime:

```rust
pub struct ConservationDomain {
    pub name: &'static str,
    pub unit: &'static str,
    pub total_budget: f64,         // What's the maximum?
    pub reserve: f64,              // Safety margin (%)
    pub decay_rate: f64,           // How fast does it deplete when unused?
    pub replenish_rate: f64,       // How fast does it recover?
    pub critical_threshold: f64,   // Below this = EMERGENCY
    pub warning_threshold: f64,    // Below this = WARNING
    pub idle_threshold: f64,       // Above this = SURPLUS
}

impl ConservationDomain {
    /// Profile: measure current consumption rate
    pub fn profile(&self, state: &SystemState) -> ConsumptionProfile;
    
    /// Detect: flag if profile breaks expected parameters
    pub fn detect(&self, profile: &ConsumptionProfile) -> Option<AnomalyReport>;
    
    /// Report: publish anomaly to fleet knowledge base
    pub fn report(&self, anomaly: AnomalyReport) -> ConservationTile;
}
```

Instantiate it for each domain:

| Domain | Total Budget | Unit | Critical | Primary Sensor | Action On Violation |
|--------|-------------|------|----------|----------------|---------------------|
| Fish stock | Local carrying capacity | kg | < 20% | Sonar school density | Recommend area departure |
| Fuel | Tank capacity | L | < 15% | Flow meter + range calculator | Reroute to nearest pump |
| Crew energy | 8h workday | hour | > 10h fatigue | Voice stress analysis / PX4 duty cycle | Force rest period |
| Inference budget | 1000 tokens/min | tokens | > 900 | LLM token counter | Degrade to reflex-only mode |
| Disk space | 12GB (current free) | GB | < 3GB | GC monitor | Emergency GC cycle |
| Battery (ESP32) | 3.7V 2000mAh | mWh | < 20% | ADC voltage divider | Hibernate sensors, keep radio |

**Phase 2 — Cross-Domain Cascade (P1)**
When one domain hits critical, related domains cascade:
- Fish stock critical → fuel should reroute anyway → crew gets free time → inference budget drops (no LLM needed on autopilot) → disk GC triggers (logs of fishing, not needed)
- Crew energy critical → boat auto-brings itself to safe harbor → fuel consumed → battery charges at dock → inference budget resets

This cascade is modeled by **pincher's PID resource controller** with cross-coupled setpoints.

**Phase 3 — Fleet-Wide Conservation Dashboard (P2)**
Each boat reports its conservation state via I2I bottles. DeckBoss aggregates into a real-time dashboard:
```
┌────────────────────────────────────────────────┐
│  CONSERVATION FLEET OVERVIEW                    │
│  Boat A: Fish ██████░░ 60% | Fuel ████████ 80% │
│  Boat B: Fish ██░░░░░░ 22% (WARN) | Fuel ██ 20%│
│                                                   │
│  Cascade triggered: Boat B fish critical →        │
│    reroute boats C, D to area gamma.              │
│                                                   │
│  Fleet inference: 42,000 tokens remaining today  │
│  (13% of budget — auto-degrade to reflex mode)   │
└────────────────────────────────────────────────┘
```

**Priority:** P1 (enables the "fleet organism" to manage its own resources without human intervention)

---

## 6. Cross-Fleet Topology

### The Network of Connections

```
                      ┌──────────────────────┐
                      │  conservation-thesis  │
                      │  (Budget → Profile →  │
                      │   Detect → Report)    │
                      └─────────┬────────────┘
                                │ Parametric re-use
                                ▼ across all domains
  ┌─────────────┐      ┌──────────────────┐      ┌────────────────┐
  │ ESP32-Plane │◄────►│ polychora-temporal│◄────►│   sonar-vision  │
  │   -Radar    │      │ (W=Time fused     │      │  (depth → vid) │
  │   (ADS-B)   │      │  hypervoxel space)│      │                │
  └──────┬──────┘      └────────┬─────────┘      └───────┬────────┘
         │                      │                         │
         │          Shoe Abstraction Pattern              │
         ▼                      ▼                         ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                        pincher (reflex runtime)                │
  │  • Veto engine (safety)  • Confidence feedback  • .nail bundles│
  │  • PID resource controller • Sandbox • Reflex induction       │
  └────────┬───────────────────────────────────────┬───────────────┘
           │                                       │
           │         I2I Protocol                  │
           ▼                                       ▼
  ┌──────────────────┐                   ┌───────────────────────┐
  │    DeckBoss       │◄────────────────►│  PX4-Autopilot         │
  │  (Cloudflare      │     MAVLink       │  (drone hardware)      │
  │   Workers edge)   │     bridge        │  flight controller     │
  │                   │                   │  IMU/GPS → PID         │
  └────────┬──────────┘                   └───────────────────────┘
           │
           │ CoCapn tile store + git repo
           ▼
  ┌──────────────────┐
  │   CoCapn Agent    │
  │  (repo-first,     │
  │   tile/room/      │
  │   flywheel)       │
  │                   │
  │     ▲             │
  │     │ ternary-*   │
  │     ▼             │
  │  ternary-types    │
  │  ternary-core     │
  │  ternary-ring     │
  │  ternary-matrix   │
  │  ternary-rhythm   │
  │  ... 195+ crates  │
  └──────────────────┘
           │
           │ Shoe Abstraction
           ▼
  ┌──────────────────┐
  │handy-marine-voice │
  │(voice → autopilot)│
  └──────────────────┘
```

### Key Protocol Bridges Needed

| Bridge | From | To | Protocol | Priority |
|--------|------|----|----------|----------|
| Sensor Fusion | ESP32-Plane-Radar | polychora | ternary-encoded MQTT → polychora VTE query | P0 |
| Voice-to-Reflex | handy-marine-voice | pincher | ternary-grammar (intent trit-vector) → ReflexTrigger | P1 |
| Drone-as-Sensor | PX4-Autopilot | DeckBoss | MAVLink → I2I bottle adapter | P1 |
| Reflex-As-MAVLink-Command | pincher | PX4-Autopilot | .nail → MAV_CMD ternary-action | P2 |
| Conservation Report | pincher PID | DeckBoss dashboard | I2I CONSERVATION message type | P1 |
| Cross-Boat Tile Sync | CoCapn Flywheel | CoCapn Flywheel (Boat B) | I2I TILE_SYNC / Cloudflare D1 | P1 |

---

## Appendix: Technology Readiness by Synergy

| Synergy | Dependencies | Requires Hardware? | Risk | Max Impact Timeline |
|---------|-------------|-------------------|------|-------------------|
| Sensation → Abstraction | ternary-sense crate, polychora temporal API | Yes (at least ESP32 + test boat) | Medium — polychora integration is the risk | 2-4 weeks |
| Edge-Cloud Symbiosis | .nail → DeckBoss bridge, I2I-over-MQTT | Yes (ESP32 + Cloudflare account) | Low — all components exist | 1-2 weeks |
| Multi-Boat Emergence | Sensation pipeline, cross-boat I2I, polychora overlay | Yes (2+ boats or simulators) | High — hardest to test without real fleet | 4-8 weeks |
| Shoe Abstraction | None — documentation + trait definition | No | None (pattern documentation) | Days |
| Conservation Engine | ternary-conserve crate, sensor bridges | No (testable with fake data) | Low — well-understood | 1-2 weeks |
| Cross-Domain Cascade | ternary-conserve, pincher PID coupling | No | Medium — cascade dynamics hard to get right | 2-4 weeks |

---

**End SYNERGY-MAP.md**
