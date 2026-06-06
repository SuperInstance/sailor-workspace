# Polychora W→Time Axis: Architecture Research Report

**Date:** 2026-06-05  
**Author:** Oracle2 Research Officer  
**Status:** Architecture Investigation  
**Scope:** polychora 4D voxel engine → W axis refactor from spatial to temporal

---

## Table of Contents

1. Executive Summary
2. Polychora Architecture Deep Dive
3. W→Time Refactor Feasibility Analysis
4. Cross-Pollination: Ternary Fleet Integration Points
5. Cutting Edge Research References
6. Recommended Architecture Path
7. Appendix: Key Type Signatures

---

## 1. Executive Summary

Polychora is a production-grade 4D voxel game engine where W is currently a spatial dimension coequal with X/Y/Z. The refactor to make W represent **time** (rather than a fourth spatial axis) is architecturally feasible with a **modular dual-mode approach**: a spatial-W mode for backward compatibility and a temporal-W mode for the new semantic.

**Key insight:** Polychora already has the right abstractions. The 5×5 homogeneous transform matrices, the 6-plane rotation system, the chunked storage with AABB queries, and the VTE two-stage (Stage A: 4D→3D hyper-image → Stage B: 3D→2D display operator) were designed with generality in mind. The temporal refactor is about *reinterpreting* existing machinery, not rebuilding it.

The ternary fleet provides a ready-made temporal framework: TideClock (tick sync), Phase (phase offsets), TidePredictor (future state prediction), Rhythm (pattern encoding), and Event (pub/sub temporal voxels). These map directly onto temporal-W semantics.

The conservation thesis provides the philosophical lens: "time being others" means each agent/process along the W axis has its own conservation budget, its own resource flow timeline.

---

## 2. Polychora Architecture Deep Dive

### 2.1 Coordinate System

```
World:  [X, Y, Z, W]   all spatial, I48F16 fixed-point
Chunk:  [8, 8, 8, 8]   voxels per chunk = 4096 per chunk
Grid:   ChunkKey = [ChunkCoord; 4] where ChunkCoord = I48F16
```

Key types:
- `Aabb4` — 4D axis-aligned bounding box, half-open `[min, max)` per axis
- `ChunkCoord = I48F16` — 48 integer bits + 16 fractional bits
- `CHUNK_SIZE = 8`, `CHUNK_VOLUME = 4096`

### 2.2 Rotation System (6 Planes)

The camera has **6 rotation planes**: XY (yaw), XZ (pitch), XW, YZ, YW, ZW.

```rust
// Upright composition order (right-to-left applied to vectors):
rotation_matrix_upright(&self) -> Array2<f32> {
    let m = rot_ZY(pitch);          // pitch
    let m = m.dot(&rot_XZ(yaw));    // yaw
    let m = m.dot(&rot_ZW(zw));     // ZW
    m.dot(&rot_XW(xw))              // XW (innermost)
}
```

The `rotation_matrix_one_angle(dims, dim_from, dim_to, angle)` function is generic: it takes 5-dimensional matrices (4D + homogeneous) and applies a rotation between any two axes.

**Critical for W→Time:** The YW, ZW, XW planes are currently spatial rotations between W and the other spatial axes. In temporal mode, these become **time-orientation rotations** — they control how the viewer orients relative to the time axis. ZW becomes "how Z (spatial depth) maps to time." XW becomes "how X (lateral) maps to time."

### 2.3 Rendering Pipeline

**Three backends sharing one camera model:**

| Backend | Primitive | Method |
|---------|-----------|--------|
| Tetra Ray Tracing | Tetrahedra | 4D Monte Carlo path tracing |
| Tetra Rasterization | Tetrahedra | ZW→line→pixel, two-stage |
| VTE (Voxel Traversal Engine) | Voxel chunks | 4D DDA ray traversal |

**VTE is the primary game renderer.** Its two-stage architecture is:

```
Stage A (4D → 3D hyper-image):
  - Generate K samples per pixel across s (ZW sensor coordinate)
  - Chunk-level 4D DDA → Voxel-level 4D DDA
  - First-solid-hit shading per sample
  - Output: 3D hyper-image H(u, v, s)

Stage B (3D → 2D display operator):
  - integral: average over all s (current gameplay mode)
  - slice: single s = s0
  - thick_slice: band [s0-w, s0+w]
```

This two-stage architecture is **perfectly suited** for a temporal W axis. Stage A becomes "trace through spacetime" and Stage B becomes "which temporal slice do you see."

### 2.4 Storage Architecture

```
RegionTreeCore (world tree):
  Empty | Uniform(BlockData) | ProceduralRef(GeneratorRef)
  | ChunkArray(ChunkArrayData) | Branch(Vec<RegionTreeCore>)

ChunkArrayData: 8×8×8×8 voxel payload
  - occupancy bitset (4096 bits / 512 bytes)
  - material array (4096 u8 or palette-indexed)
  - optional macro mask

Multi-scale: scale_exp from 0 (unit) to -N (finer)
```

### 2.5 TesseractOrientation

The voxel orientation system encodes 384 discrete rotations (24 permutations × 16 sign combinations) of the tesseract. Pre-defined rotation generators for all 6 planes:

```rust
ROT_XZ (yaw), ROT_YZ (pitch), ROT_XY,
ROT_XW, ROT_YW, ROT_ZW
```

### 2.6 Projection Math

```rust
project_view_point_to_ndc(view_point: [f32; 4], focal_length_xy: f32, aspect: f32) -> Option<Vec2> {
    depth = sqrt(view_point[2]^2 + view_point[3]^2)  // ZW depth
    projection_divisor = depth / focal_length_xy
    x = view_point[0] / projection_divisor
    y = -view_point[1] / projection_divisor
}
```

The critical insight: **ZW depth is computed as sqrt(Z² + W²)**. In temporal mode, this becomes sqrt(spatial_depth² + temporal_distance²) — a spacetime interval.

---

## 3. W→Time Refactor Feasibility Analysis

### 3.1 Minimal Viable Change List

The smallest changeset that enables temporal-W mode:

#### 3.1.1 Coordinated Mode Flag

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Semantics4D {
    Spatial,  // W is spatial (current behavior, 100% backward compatible)
    Temporal, // W is time
}
```

This flag threads through:
- `WorkingData` → GPU push constants
- `VoxelFrameMeta` → shader metadata
- `Camera4D` → rotation mode
- `GameState` → semantics toggle

#### 3.1.2 Rotation Mathematics (0 touch required!)

The 5×5 homogeneous rotation matrices are **already dimension-agnostic**. `rotation_matrix_one_angle(5, 0, 3, xw_angle)` works identically whether axis 3 is spatial or temporal. The math is identical; only the interpretation changes.

This is the biggest win: **zero refactoring of the rotation system.**

#### 3.1.3 Projection Changes (Minimal)

In `project_view_point_to_ndc`:
- Currently: `depth = sqrt(Z² + W²)` — Euclidean ZW
- Temporal: `depth = sqrt(Z² - W²/c²)` — Minkowski interval (or `abs(Z) - abs(W)` for causal ordering)

This is a **single formula change** in the projection function and its shader equivalent.

#### 3.1.4 VTE Stage B Mode Expansion (4 new modes)

The Stage B display operators currently have `integral`, `slice`, `thick_slice`. Temporal W adds:

| Mode | Description |
|------|-------------|
| `temporal_trace` | Trace through time layers, compositing entities |
| `temporal_arrow` | Show time direction as oriented glyphs |
| `temporal_spacetime` | Minkowski diagram view (hyperbolic projection) |
| `temporal_event` | Highlight time-voxels with events firing |

Implementation: **add 4 entries to the Stage B mode enum**, implement via existing shader dispatch infrastructure. The shader code paths already handle branch-per-mode.

#### 3.1.5 Chunk Storage (No change needed)

Chunks store voxels. Whether a chunk's W extent is spatial or temporal doesn't change:
- `Aabb4::chunk_world_bounds` computes bounds identically
- `ChunkArrayData` has zero semantic awareness of axes
- `RegionTreeCore` traverses all 4 dimensions uniformly

The **scale system** is interesting: `scale_exp` can encode temporal granularity. `scale_exp = 0` means unit seconds; `scale_exp = -1` means ½ second slices.

**Total LoC changed for MVP:** ~150-250 lines across Rust + shader code.

### 3.2 What Changes (and What Doesn't)

| Component | Spatial W | Temporal W | Changes Needed |
|-----------|-----------|------------|----------------|
| Rotation math | 6 spatial planes | 3 spatial + 3 time-orientation | 0 lines |
| Projection `depth = sqrt(Z²+W²)` | Euclidean | Minkowski interval | 1 formula |
| VTE Stage A traversal | 4D DDA through space | 4D DDA through spacetime | 0 lines* |
| VTE Stage B operators | integral/slice/thick_slice | + temporal modes | 4 mode entries |
| Chunk storage | 8×8×8×8 spatial | 8×8×8×8 spacetime slab | 0 lines |
| Region tree | 4D AABB | 4D AABB (time interval) | 0 lines |
| Aabb4 intersection tests | 4D spatial | 4D spatiotemporal | 0 lines |
| Camera controls | WASD + W-axis movement | WASD + temporal scrub | Input mapper |
| Entity system | Spatial entities | Temporal agents/processes | **See §4** |
| TesseractOrientation | 384 spatial rotations | 384 spacetime orientations | 0 lines |

\* The DDA math is the same; only the hit semantic changes (material vs event).

### 3.3 Architecture for Dual-Mode Support

```rust
pub enum Mode4D {
    Spatial(SpatialConfig),
    Temporal(TemporalConfig),
}

pub struct TemporalConfig {
    pub tick_rate_hz: f64,          // How many W-slices per real second
    pub max_temporal_extent: f64,   // How far into future/past (in W units)
    pub temporal_granularity: i8,   // scale_exp for time slices
    pub time_origin: Instant,       // Wall clock -> W coordinate mapping
}
```

Key invariant: **both modes share the same core data structures.** The distinction is:
1. Shader path selection based on `Semantics4D` flag in `WorkingData`
2. Input mapping (W key becomes "scrub forward in time")
3. Entity population (dynamic agents in temporal mode, static blocks in spatial)

### 3.4 Causal Ordering in Temporal Mode

Spatial W doesn't care about ordering — you can move back and forth arbitrarily. Temporal W introduces **causality**:

- Future chunks are "predicted" or "scheduled"
- Past chunks are "recorded" or "archived"
- Present (current W slice) is mutable

This maps perfectly onto the existing **RegionChunkTree** with `generator_version_hash` — chunks in the future can be marked as `ProceduralRef(GeneratorRef)` with a generator that computes from current state via **TidePredictor**.

Concrete: a temporal-W world has solid spawn-state chunks in the past, mutable action blocks in the present, and procedurally-predicted state in the future.

---

## 4. Cross-Pollination: Ternary Fleet Integration Points

### 4.1 ternary-tidelight → Temporal Core Infrastructure

| Tidelight Type | Temporal-W Mapping | Integration |
|----------------|--------------------|-------------|
| `TideClock` | Global tick counter for time-axis | Maps W coordinate → real time via `tick_rate_hz`. Chunks at W=N correspond to tick N. |
| `Phase` | Phase offset between rooms/agents | An agent positioned at W offset from the camera has phase offset. "Viewing from outside" = seeing all phases simultaneously. |
| `TidePool` | Group of phase-locked entities | A process spanning multiple W slabs (e.g., a building construction) = multiple phase-locked temporal chunks. |
| `TidePredictor` | Future state prediction → future chunks | Future-W chunks (W > present) are generated by TidePredictor from past observations. Predictor period maps to chunk temporal scale. |
| `LightCycle` | Resource cycling over time | Daylight cycle = temporal voxels at regular W intervals with Ternary resource level. |
| `SlackTide` | Quiet/maintenance periods | Maintenance windows = temporal regions marked as "slack" in the W dimension. |

**Architecture integration:**
```rust
// In polychora's game state:
struct TemporalWorldState {
    clock: TideClock,
    predictor: TidePredictor,
    pool: TidePool,
    // Chunks at W > present are predicted from clock state
}
```

### 4.2 ternary-rhythm → Temporal Pattern Encoding

| Rhythm Type | Temporal-W Mapping |
|-------------|-------------------|
| `Rhythm(pattern)` | A repeating temporal pattern encoded as W-axis voxel arrangement. Pattern.Tick() advances W slice. |
| `Metronome` | Downbeat markers = anchor events at specific W coordinates. |
| `Polyrhythm` | Multiple asynchronous processes superposed along W. Their LCM is the full temporal cycle. |
| `Syncopation` | Off-beat temporal events = unexpected agents firing between regular ticks. |
| `Groove` | Temporal "feel" — how evenly spaced are the event voxels along W. |

**Key insight:** A `Rhythm::density()` measurement directly translates to temporal voxel density. A rhythm pattern `[Pos, Zero, Neg, Zero]` repeated every 4 ticks becomes 4 W-slices with alternating agent presence.

### 4.3 ternary-event → Temporal Voxels

| Event Concept | Temporal-W Mapping |
|---------------|-------------------|
| `Event{priority, timestamp_ms, source}` | A voxel at coordinate (X, Y, Z, W) with payload = event data. Priority = Ternary state (Critical/Pos, Normal/Zero, Low/Neg). |
| `EventFilter` | Ray filter: "find me events matching type X, priority ≥ Critical, from source Y" |
| `EventHistory` | Append-only log of past W slices. Replay = re-traverse past W. |
| `EventBus` | Dispatch to subscribers when ray hits event voxel. |

**This is the bridge:** Events *are* temporal voxels. The VTE's existing BVH traversal finds them. The event bus dispatches them.

```rust
struct EventVoxelPayload {
    event_type: String,
    priority: Priority,     // maps to Ternary
    source: String,
    payload: Vec<u8>,
    // The W coordinate encodes timestamp
}
```

### 4.4 ternary-dynamics → Temporal Agent Evolution

| Dynamics Type | Temporal-W Mapping |
|---------------|-------------------|
| `Trajectory{agent_id, history: Vec<Strategy>}` | An agent's trajectory is a 4D curve through (X, Y, Z, W). Each strategy change is a vertex. |
| `PhaseTransition` | A phase change at a specific W slice = a discontinuity in temporal voxel state. |
| `CriticalPoint` | Agents hitting critical points (plateaus, cliffs, spikes) = notable W-slice landmarks. |
| `TimeSeries` | A vertical (along-W) voxel column of population metrics. |

**"Time being others":** Each agent is a **temporal voxel** at its (X, Y, Z, W) position. The VTE directly raycasts through agent trajectories.

### 4.5 flux-timeline → Bytecode-Level Temporal Tracing

flux-timeline is a bytecode tracer — it generates cycle-by-cycle execution timelines. This maps to **micro-scale temporal voxels**: each instruction tick is a W slice, each register state is voxel data.

Connection: The FLUX timeline export (`to_csv`, `to_text`) can be rendered as temporal voxel columns in polychora. A program execution becomes a 4D structure you can walk around.

### 4.6 ternary-visualizer → Temporal-V Display

The CascadeTimeline visualizer (`▼`/`▲`/`✕`/`★`/`●` markers along a generation axis) is already a **2D projection of temporal-W voxels**. Polychora would render this in 3D: the ASCII timeline becomes an interactive 4D scene.

The PopulationHeatmap's block characters (`░▒█`) map directly to voxel density displays.

### 4.7 conservation-thesis → Philosophical Foundation

The conservation-thesis provides the **"why"** for the temporal W axis:

> "The question isn't whether you can afford it. It's whether you know what you're spending."

- **Each agent/process along W has a conservation budget.** Its resource flow through time is its trajectory.
- **Guardian modules = temporal voxels with budget, profile, detect, report.**
- **Spectral analysis reveals hidden temporal structure** — Fiedler vector = natural partitions of the time axis (e.g., pre-event / during-event / post-event).
- **"Time being others" literalized:** An agent at W=+5 is a separate "other" from the same agent at W=0. Both are temporal voxels to be traversed.

The conservation thesis's core pattern — Budget → Profile → Detect → Report — becomes:
1. **Budget:** max temporal extent (how far ahead/behind can you see?)
2. **Profile:** actual agent states along W
3. **Detect:** divergence from predicted state
4. **Report:** causal feedback (what changes propagate forward in time?)

---

## 5. Cutting Edge Research References

### 5.1 4D Spatiotemporal Visualization

| Project | Relevance | Link |
|---------|-----------|------|
| Interactive 4D Spacetime & Relativity Visualizer | Block universe exploration, worldlines, light cones | [block-universe.vercel.app](https://block-universe-rho.vercel.app/) |
| Interactive Minkowski Diagram (Dima Dudarev) | Two-observer spacetime diagrams | [dudarion.github.io](https://dudarion.github.io/Interactive-Minkowski-diagram/) |
| Space-Time Hypercube (STH) | 3D+x+y+z+t → immersive analytics, VR | [Frontiers in Bioinformatics](https://www.frontiersin.org/journals/bioinformatics/articles/10.3389/fbinf.2023.998991/full) |
| ESRI Space-Time Cube | GIS-based 3D+t visualization framework | [ArcGIS](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/space-time-pattern-mining/visualizing-cube-data.html) |
| OpenSpace (AMNH) | "Digital Universe Atlas" — astronomical time-evolving 4D | [amnh.org](https://www.amnh.org/research/hayden-planetarium/science-visualization/digital-universe-atlas) |

**For polychora specifically:** The Minkowski diagram projection is the most relevant. Instead of Euclidean `sqrt(Z² + W²)` for depth, the temporal mode uses `sqrt(Z² - W²)` (or `abs(Z) - abs(W)` for causal ordering). This maps naturally onto:

```glsl
// Temporal W projection in shader (Minkowski-style)
float temporal_depth = abs(dir.z * spatial_scale) - abs(dir.w * time_scale);
if (temporal_depth < 0.0) discard; // Behind in time
```

### 5.2 Ternary Computing & BitNet b1.58

| Development | Date | Relevance |
|-------------|------|-----------|
| BitNet b1.58 2B4T | Apr 2025 | First open-source 1-bit LLM trained with ternary weights. Confirms ternary {-1,0,+1} as production-ready. |
| Falcon-Edge series | May 2025 | Fine-tunable ternary language models based on BitNet architecture. |
| TerEffic FPGA accelerator | Feb 2025 | Custom FPGA for ternary LLM inference—83% power reduction. |
| Bitnet.cpp inference framework | Jul 2025 | 6.25x speedup for ternary CPU inference. |
| ENERZAi Qualcomm Hexagon NPU | Aug 2025 | Running BitNet on edge NPU with custom ternary kernels. |

**Connection to ternary fleet:** These confirm the ternary fleet's design choices are aligned with cutting-edge ML hardware. The same {-1, 0, +1} values used in polychora's rhythm/temporal-encoding can be deployed on **BitNet-based edge devices** for in-world agent inference.

### 5.3 Timeline Spatialization

| Concept | Relevance |
|---------|-----------|
| **T-minus scheduling** | Countdown-based visualization maps directly to W-as-time: T-1, T-2, ... along W axis. Each event is a temporal voxel plane. |
| **3D Gantt charts** | Project management timelines as spatial structures. Deliverable-Activity-Time (DAT) charts extend Gantt to 3D. |
| **Time-space synesthesia** | Neurological phenomenon where people visualize time as spatial structures. Polychora is the first tool to *render* this. |
| **Alluvial diagrams** | Flow visualization showing shifts over time — maps to polychora's event voxel chains. |

### 5.4 Key Papers

1. **"The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits"** (Ma et al., 2024) — arXiv:2402.17764
   - Foundational paper for BitNet b1.58. Validates ternary {-1, 0, +1} as optimal for efficient LLMs.
   
2. **"TerEffic: Highly Efficient Ternary LLM Inference on FPGA"** (2025)
   - FPGA accelerator achieving 10x throughput improvement for ternary models.

3. **"Space-Time Hypercube: Visualizing 3D + Time in Immersive Analytics"** (Frontiers in Bioinformatics, 2023)
   - Formal extension of space-time cube to 3D + t = 4D with STH.

4. **"LoRA Fine-tuning BitNet b1.58 LLMs on Heterogeneous Edge GPUs"** (QVAC, 2026)
   - Demonstrates fine-tuning ternary models on edge hardware, confirming deployability.

---

## 6. Recommended Architecture Path

### Phase 0: Dual-Mode Flag (1-2 days)
- Add `Semantics4D` enum (Spatial | Temporal) to `common` crate
- Thread through `WorkingData` → GPU shader uniforms
- No behavior changes yet; just plumbing

### Phase 1: Temporal Projection (3-5 days)
- Modify `project_view_point_to_ndc` and shader equivalents
- Add Stage B operators: `temporal_trace`, `temporal_arrow`, `temporal_spacetime`, `temporal_event`
- Implement Minkowski-style depth formula for temporal mode
- **Result:** You can "walk through time" as a 4D block universe

### Phase 2: TideClock Bridge (2-3 days)
- `TideClock` drives W-coordinate advancement in temporal mode
- `Phase` provides phase-offset viewing (see "from outside")
- `TidePredictor` generates future-W chunks procedurally
- **Result:** Past is recorded, future is predicted, present is mutable

### Phase 3: Event Voxels (3-5 days)
- Integrate `ternary-event` crate — events are temporal voxels
- VTE traversal in temporal mode hits `EventFilter` matches
- `EventHistory` = viewable past-W trails
- **Result:** Raycasting through spacetime finds events as voxel hits

### Phase 4: Agent Dynamics (5-7 days)
- `ternary-dynamics` Trajectories as 4D curves
- Agents evolve their TernaryStrategy along W
- Population metrics rendered as temporal voxel columns
- **Result:** "Time being others" — every agent is a temporal entity

### Phase 5: Rhythm Encoding (2-3 days)
- `ternary-rhythm` patterns map to W-axis voxel arrangements
- `Polyrhythm` LCM = full temporal cycle for time-loop worlds
- `Groove` analysis → temporal event density visualization
- **Result:** Temporal patterns as first-class world features

### Phase 6: Edge Deployment Path (ongoing)
- Explore BitNet b1.58 for lightweight in-world agent inference
- Ternary {−1, 0, +1} agents run on edge NPU via custom kernels
- Conservation-thesis guardians budget agent resource consumption

### Phase 7: Conservation Thesis Integration (philosophical layer)
- Each temporal agent runs a conservation guardian
- Budget → Profile → Detect → Report mapped to W-axis
- Spectral analysis of temporal resource flows

---

## 7. Key Type Signatures (Reference)

### From polychora:

```rust
// The central temporal abstraction point
pub enum Semantics4D {
    Spatial,  // W = 4th spatial axis (current)
    Temporal, // W = time
}

// Stage B mode expansion
pub enum StageBMode {
    Integral,       // Average over all W (current default)
    Slice(u32),     // Single W layer
    ThickSlice(u32, u32), // W band [low, high]
    TemporalTrace,      // NEW: Ray trace through time layers
    TemporalArrow,      // NEW: Show temporal direction
    TemporalSpacetime,  // NEW: Minkowski projection
    TemporalEvent,      // NEW: Highlight event voxels
}

// Temporal world state (new)
pub struct TemporalWorld {
    pub clock: ternary_tidelight::TideClock,
    pub predictor: ternary_tidelight::TidePredictor,
    pub pool: ternary_tidelight::TidePool,
    pub event_bus: ternary_event::EventBus,
    pub semantics: Semantics4D,
}
```

### From ternary fleet (reuse, not rewrite):

```rust
// ternary-tidelight
pub struct TideClock { pub tick: u64, pub sync_interval: u64 }
pub struct Phase { pub offset: i64, pub period: u64 }
pub struct TidePredictor { histories: HashMap<String, Vec<(u64, Ternary)>> }
pub enum Ternary { Negative, Zero, Positive }

// ternary-event
pub struct Event { pub event_type: String, pub priority: Priority, pub timestamp_ms: u64, pub source: String }
pub struct EventFilter { pub event_type: Option<String>, pub min_priority: Option<Priority>, pub source: Option<String> }

// ternary-rhythm
pub struct Rhythm { pub pattern: Vec<Ternary>, pub position: usize }
pub struct Polyrhythm { pub rhythms: Vec<Rhythm> }

// ternary-dynamics
pub struct Trajectory { pub agent_id: usize, pub history: Vec<Strategy> }
pub enum TernaryStrategy { Avoid, Cooperate, Exploit }
```

---

## A Note on "Time Being Others"

Casey's insight — "time being others" — is the philosophical keystone. It means:

1. **Agents as temporal voxels:** Each agent at each instant is a separate voxel in spacetime. The VTE traverses agent-occupied voxels just like world voxels.
   
2. **External perspective:** The camera can rotate off the time axis (via XW/YW/ZW rotations) to see temporal evolution "from outside" — a Minkowski-block-universe view where all times are simultaneously visible.

3. **T-minus event thinking:** Events are spatial planes at specific W coordinates. Approaching an event means traversing toward its W slice. The event fires when the camera's W coordinate equals the event's W.

4. **Conservation across time:** The conservation thesis's budget/profile/detect/report applies along W. Each agent's resource consumption over time is a conservation problem.

The polychora + ternary fleet combination is uniquely positioned to realize this — it has the spatial engine, the temporal framework, and the philosophical lens already in place. The integration is about connecting pre-existing abstractions, not building from scratch.

---

*End of report.*
