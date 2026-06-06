# Polychora Fork Plan — Modular Refactor with Auto-Gluing

## Objective
Fork `github.com/SuperInstance/polychora`, refactor W as time, add tooling/fittings/libraries so it becomes a pluggable frontend/backend/middleend component.

## Fork Identity
- **Source:** github.com/SuperInstance/polychora
- **Fork name:** `polychora-temporal` (or keep `polychora` with branch = `temporal-w`)
- **Paradigm:** The fork stays modular — no monolithic rewrite. Additions are libraries and fittings.

## What Changes (exactly)

### 1. The Flag (~50 lines)
```rust
// common/src/semantics.rs
pub enum Semantics4D {
    Spatial,  // W = 4th spatial axis (polychora original)
    Temporal, // W = time (our refactor)
}
```
Threads through: `WorkingData`, `VoxelFrameMeta`, `Camera4D`, `GameState`.

### 2. The Projection (~30 lines)
```rust
// In Camera4D projection:
fn project_depth(&self, z: f32, w: f32) -> f32 {
    match self.semantics {
        Semantics4D::Spatial => (z*z + w*w).sqrt(),    // Euclidean (original)
        Semantics4D::Temporal => (z*z - w*w/c).abs().sqrt(), // Minkowski (temporal)
    }
}
```

### 3. Stage B Modes (~200 lines)
Add 4 new display operators to the VTE shutdown dispatcher:
- `temporal_trace` — composite entities through time layers
- `temporal_arrow` — time direction as oriented glyphs
- `temporal_spacetime` — Minkowski diagram view
- `temporal_event` — highlight event voxels

### 4. The Glue Libraries (new, not modifications)

**polychora-temporal-bridge** — standalone cargo crate, depends on `polychora` + ternary fleet:
- `bridge::temporal_world::TemporalWorld` — composes polychora engine state + TideClock + EventBus
- `bridge::event_voxel::EventVoxel` — maps ternary-event Event → polychora voxel
- `bridge::rhythm_meshgen` — generates Rhythm pattern as W-axis voxel mesh
- `bridge::conservation_tracker` — maps Budget→Profile→Detect→Report to W-axis

**polychora-room-runtime** — standalone crate for the room/tile system:
- `room::Room` — operational context with tiles, agents, frozen context
- `room::Tile` — reusable preset with provenance
- `room::Ecology` — multi-agent emergence, room splitting/merging

### 5. Auto-Gluing

"Auto-gluing" means: when temporal mode is activated, the following happen automatically:
1. `TideClock` starts ticking — W advances per tick
2. `TidePredictor` generates future-W chunks procedurally
3. `EventBus` connects to voxel hits in VTE traversal
4. `Rhythm` patterns are available as mesh generators
5. `Ternary` enum values become voxel types (-1/0/+1)

No manual wiring required. The bridge library detects `Semantics4D::Temporal` and connects everything.

## File Map for the Fork

```
polychora/
├── common/
│   └── src/
│       ├── semantics.rs          ← NEW: DualMode flag
│       ├── lib.rs                ← + pub mod semantics
├── crates/
│   ├── polychora/               ← core engine
│   │   └── src/
│   │       ├── camera.rs        ← + Semantics4D in Projection
│   │       ├── vte/             ← + 4 temporal modes
│   ├── polychora-temporal-bridge/  ← NEW crate
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── temporal_world.rs
│   │       ├── event_voxel.rs
│   │       ├── rhythm_meshgen.rs
│   │       ├── conservation_tracker.rs
│   │       └── glue/            ← auto-wiring
│   ├── polychora-room-runtime/     ← NEW crate
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── room.rs
│   │       ├── tile.rs
│   │       ├── ecology.rs
│   │       └── provenance.rs    ← git-backed context
├── Cargo.workspace.toml         ← + new crates in members
```

## Build & Test

```bash
cargo build --release --features temporal
cargo test  # existing polychora tests (all pass — no regression)
cargo test -p polychora-temporal-bridge  # new integration tests
cargo test -p polychora-room-runtime     # room ecology tests
```

## Total LoC Estimate

| Component | LoC | Type |
|-----------|-----|------|
| Semantics4D flag + plumbing | 50 | modification |
| Projection change | 30 | modification |
| Stage B temporal modes | 200 | modification |
| temporal-bridge crate | 800 | new |
| room-runtime crate | 1200 | new |
| **Total fork delta** | **~2,280** | — |

~2,280 lines total to fork, refactor, and add the full room/tile ecology. Of which only ~280 are modifications to existing code.
