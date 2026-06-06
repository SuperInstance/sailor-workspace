# Temporal Weave — The Polychora+Ternary Integration Architecture

> *Time is not a line. Time is a space you can navigate.*

---

## Executive Vision

Polychora's 4D voxel engine renders X/Y/Z/W as spatial dimensions.
The refactor: **W = TIME, not space.**

This transforms the rendering stack from "a 4D space engine" into **a time-visualization engine with full spatial ontology** — where events, agents, and processes occupy time-slices like voxels occupy space tiles.

The ternary fleet provides the temporal algebra: rhythm, tide, dynamics, event sequencing. Combined, they create a **coherent system for navigating, visualizing, and reasoning about time as a spatial dimension.**

---

## Part 1: The Metaphysics (Why This Works)

### What "W = Time" Actually Means

In physics, Minkowski spacetime treats time as a fourth coordinate with a metric signature. But Polychora's W is fundamentally spatial — rotation planes like XW and YW work identically to XY and XZ.

**The insight is not to make W *literally* time in the physics sense.** It's to make W *semantically* time: the data stored at coordinate W=n represents the state of the system at temporal offset n from the present.

This means:
- **X/Y/Z**: Spatial position (where something is)
- **W**: Temporal position (when something is — or when it will be)

### "Time Being Others"

Casey's phrase "time being others" is the key: **other agents, other processes, other events occupy different W-slices.** In a multiplayer system, Player A at W=0 (now) interacts with Player B at W=-5 (5 ticks ago) — not through message passing, but through *spatial co-location in time*.

This is block-universe eternalism made computational: all times exist simultaneously as voxel data. The "now" is just the camera's W-coordinate.

### T-Minus-Event Thinking

Events are 4D structures occupying a W-span: [W_start, W_end]. A rocket launch occupies W=[0, 30] ticks. A 5-second countdown is a structure spanning W=[-50, 0]. The camera can zoom out and see the *shape* of time — not just the sequence but the geometry of temporal relationships.

---

## Part 2: The Architecture

### Layer 0: 4D Voxel Storage (Polychora, refactored)

Current polychora storage: `8×8×8×8` voxel chunks, BVH-indexed override tree, procedural generation.

**Refactored for W=Time:**
- Chunks remain `8×8×8×8` but W-slices are time-slices
- A single chunk spans 8 time units → temporal resolution = chunk stride
- Procedural generation becomes **temporal prediction** — generating likely future/past states
- Override tree stores **event edits** — deviations from predicted timeline

```
┌─────────────────┐     ┌──────────────────┐
│  Spatial Chunk   │     │  Temporal Slice   │
│  (X/Y/Z static)  │ ──→ │  (W as time,      │
│                   │     │   events as voxels)│
└─────────────────┘     └──────────────────┘
```

### Layer 1: Temporal Primitives (Ternary Fleet)

| Ternary Crate | Role in W=Time System |
|--------------|----------------------|
| **ternary-tidelight** | TideClock = global time source. Phase = inter-agent temporal offset. TidePool = synchrony groups. TidePredictor = future state simulation. |
| **ternary-rhythm** | Temporal patterns as voxel structures. Poly/mono rhythms as W-axis wave shapes. Syncopation detection = anomaly detection in timelines. |
| **ternary-event** | Event dispatch with ternary priority. Event = voxel at coordinate (x,y,z,w). Priority encodes |payload| in {-1,0,+1} urgency. |
| **ternary-dynamics** | Agent strategies evolving over W-axis. Phase transitions at critical W-coordinates. |
| **ternary-ising** | Zero as topological insulator = time-slices where nothing happens. The "empty" W-slice is information. |

### Layer 2: Rendering Pipeline (Modified VTE)

Current VTE: 4D→3D hyper-image → 3D→2D display.

**W=Time VTE:**
- **Stage A** (4D→3D): Cast rays through X/Y/Z and W simultaneously. Each ray samples both space and time.
- **Stage B** (3D→2D): Choose how to collapse the temporal dimension:
  - `integral` — sum events across all time (classical history view)
  - `slice` — view a single W-coordinate (the "now")
  - `thick-slice` — view a W-range (a window of time)
  - `timeline` — render W along a display axis (time-as-space view)
  - `differential` — show what changed between W-slices

### Layer 3: Event Semantics

Events are not messages — they're voxels at spacetime coordinates.

```
┌─────────────┐
│ Event Voxel  │
├─────────────┤
│ type: 'spawn'│
│ pos: [x,y,z]│
│ t_min: w1    │  ← event start
│ t_max: w2    │  ← event end (duration)
│ agent: 'a37' │
│ payload: {}  │
└─────────────┘
```

Properties:
- **Short events**: W-span = 1 (instantaneous, like a message)
- **Long events**: W-span > 1 (processes, conversations, computations)
- **Periodic events**: Repeat at regular W-intervals (rhythms from ternary-rhythm)
- **Nested events**: Events containing sub-events at finer W-resolution

### Layer 4: T-Minus Visualization

The "camera in time" concept:

| Camera Mode | What You See | Use Case |
|-------------|-------------|----------|
| **Now-following** | W=0, standard FPS view | Normal gameplay |
| **T-minus** | W<0 looking toward W=0 | Planning / anticipation |
| **Post-hoc** | W>0 looking backward | Debugging / replay |
| **Panoramic** | W-axis spread across screen | Time-as-space overview |
| **Event-shape** | Isosurface of event density | Architecture of a timeline |

---

## Part 3: Cross-Pollination Map

### From the Ternary Fleet

| System | Integration | Polychora Benefit |
|--------|------------|-------------------|
| **conservation-thesis** | Budget→Profile→Detect→Report as temporal pattern | Timeline has conservation invariants (sum of event density is constant) |
| **plato-event** | Event bus pumps data into W-voxels | Real-time event ingestion into the 4D world |
| **flux-timeline** | Sequencing engine orders events by W-coordinate | Offline event ordering and replay |
| **ternary-negotiate** | Negotiation as W-span event | Visualize negotiation taking time |
| **ternary-blockchain** | Immutable event log at W-coordinates | Timeline immutability guarantee |

### From Polychora to the Ternary Fleet

| Polychora Feature | Ternary Benefit |
|------------------|----------------|
| **WASM plugin runtime** | Ternary behavior plugins in actual agents |
| **Multiplayer protocol** | Event-stream synchronization across fleet nodes |
| **Procedural generation** | Generate likely future/past states for prediction |
| **4D collision detection** | Temporal conflict detection (events that would overlap) |

---

## Part 4: Implementation Strategy

### Phase 0: Proof of Concept (Minimal)
1. Repurpose polychora viewer to interpret W as time
2. Hard-code event data as voxels at W-coordinates
3. Demonstrate T-minus camera navigation through event space
4. **Deliverable**: Screenshot of event structures viewed from W=-20

### Phase 1: Temporal Primitives
1. Integrate `ternary-tidelight` TideClock as polychora time source
2. Replace event dispatch with `ternary-event` ternary priorities
3. Store events as voxel data in the chunk system
4. **Deliverable**: Real-time event injection into 4D world

### Phase 2: Full Pipeline
1. Modified VTE with timeline render mode
2. `ternary-rhythm` pattern generation as W-axis structures
3. Multi-agent event co-visualization
4. **Deliverable**: Working T-minus viewer with ternary event feed

### Phase 3: Distributed Temporal Mesh
1. Multiple polychora instances sharing temporal space
2. Event synchronization via `ternary-mesh`
3. Cross-fleet temporal reasoning
4. **Deliverable**: Distributed time-visualization network

---

## Part 5: The Limited Hardware Advantage

Casey's directive: "emergent capabilities on more limited hardware."

Polychora's rendering pipeline was designed for real-time 4D voxel traversal on consumer GPUs. The W=Time refactor doesn't increase computational complexity — it *repurposes* the existing rendering work.

**Key efficiency wins:**
- Time-as-space doesn't require simulating the future — it generates likely futures procedurally
- Event voxels are sparse (most spacetime is empty) — the override tree stores only non-empty slices
- Temporal prediction uses the same `generate()` function as spatial procedural generation — no separate simulation loop
- W-slice rendering maps naturally to instanced rendering (each W-slice is a draw call)

Compare to conventional timeline/Gantt visualizers that compute layout separately: Polychora's GPU pipeline renders time for free.

---

## Appendix: System Architecture Diagram

```
                         ┌─────────────────────┐
                         │   Polychora Client    │
                         │  (VTE GPU Renderer)   │
                         └──────────┬──────────┘
                                    │ 4D→3D→2D pipeline
                                    │ W rendered as time
                         ┌──────────▼──────────┐
                         │   Time Voxel Store   │
                         │  (8x8x8x8 chunks)    │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼──────────┐ ┌───────▼────────┐ ┌──────────▼──────────┐
   │  ternaty-tidelight   │ │  ternaty-event │ │  ternaty-rhythm     │
   │  (Time source +      │ │  (Event as     │ │  (Temporal pattern  │
   │   sync + prediction) │ │   voxels)      │ │   generation)       │
   └─────────────────────┘ └────────────────┘ └─────────────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   WASM Plugin Runtime│
                         │  (Agent behavior as  │
                         │   time-slice actors) │
                         └─────────────────────┘
```

---

*Weaving time into space. Oracle2, 2026-06-05.*
