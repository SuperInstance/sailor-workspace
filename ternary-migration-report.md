# Ternary Spatial Migration Report

> Compiled 2026-06-06 via cross-crate fleet scan
> Source repos: pincher, eisenstein-quantize, forgemaster-archive (pythagorean48)

---

## Executive Summary

PincherOS currently has **zero** spatial/direction/vector math in its main codebase. The `pincher-core` crate handles reflex execution, embedding, graph routing, and PID resource control — all using generic `f64` math or the `ternary_types::Ternary` enum for edge weights. Two foundational spatial technologies exist in satellite repos and archives:

1. **Eisenstein quantization** (`eisenstein-quantize/`) — Hexagonal A₂ lattice, complete Rust implementation (no `pincher-core` integration)
2. **Pythagorean48 zero-drift encoding** (`forgemaster-archive/experiments/pythagorean48-encoding/`) — Python prototype, 128 exact direction vectors, zero drift after 1000+ chained rotations

This report defines the target ternary spatial crate structure, maps both technologies into it, and prioritizes the migration.

---

## 1. Current Crate Architecture

### pincher workspace (`/pincher/Cargo.toml`)

```
pincher/ (workspace)
├── pincher-core/              ← 21.5K LOC, the reflex runtime engine
│   ├── capability/            — Capability tokens, manifest, permission model
│   ├── carapace/              — WASM guest/host sandbox for reflexes
│   ├── db/                    — SQLite vector search runtime
│   ├── dynamics/              — Veto engine (deterministic execution control)
│   ├── embed/                 — 384-d ONNX/hash embedding for intent matching
│   ├── immunology/            — Antigen pattern matching, immune memory
│   ├── intent/                — Intent schema, contract parsing
│   ├── migration/             — .nail bundle pack/unpack for agent portability
│   ├── reflex/                — Core engine: Teach → Match → Execute
│   ├── resource/              — PID controller (RAM homeostasis), resource budgeting
│   ├── route/                 — Ternary graph routing, spectral clustering (f64 matrices)
│   ├── rpc/                   — JSON-RPC server for engine commands
│   ├── sandbox/               — Bubblewrap sandbox for command execution
│   ├── security/              — Blocklist, SAEP, veto rules, sandbox config
│   ├── shell/                 — Shell hardware probing (device tier)
│   └── types/                 — Gastrolith checkpoint schema, Chord CRDT types
├── pincher-cli/               ← CLI frontend (main.rs, clap-based)
└── src/                       ← Top-level daemon, registry client, extractor, updater
```

### External dependencies

| Dep | Used In | Purpose |
|-----|---------|---------|
| `ternary-types` (git) | pincher-core::route | `Ternary::Positive/Negative/Zero` for graph edge weights |
| `eisenstein-quantize` (local) | standalone crate | Eisenstein integers + hexagonal lattice quantization |
| `forgemaster-archive/pythagorean48` (archive) | Python prototype only | Zero-drift direction encoding via Pythagorean triples |

### Key finding: No spatial math exists in pincher-core

The `route/` module uses `f64` for Laplacian eigenvectors, adjacency matrices, and modularity scores — but **no direction vectors, no rotation math, no spatial coordinates**. The `types/` module has shell hardware specs with `f32` TDP/temperature fields but no spatial types at all.

---

## 2. Target Ternary Spatial Crate Structure

### Proposed: `ternary-spatial` — a new workspace crate

```
pincher/ (workspace)
├── ternary-spatial/           ← NEW: ternary spatial math library
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── direction/         ← Direction/rotation layer
│       │   ├── mod.rs
│       │   ├── pythagorean48.rs   — Pythagorean48 direction encoding
│       │   ├── rotation.rs        — Rotation chaining with exact arithmetic
│       │   └── quantized.rs       — INT8 fixed-point direction ops
│       ├── grid/              ← Spatial grid/quantization layer
│       │   ├── mod.rs
│       │   ├── eisenstein.rs      — Eisenstein integers (port from eisenstein-quantize)
│       │   ├── hexagonal.rs       — HexPoint, A₂ lattice quantization
│       │   └── cartesian.rs       — Cartesian↔hexagonal conversion
│       ├── constraint/        ← Constraint theory layer
│       │   ├── mod.rs
│       │   ├── laman.rs           — Laman rigidity (2N-3 threshold)
│       │   ├── deadband.rs        — Deadband SNR (ternary temporal sparsity)
│       │   └── galois.rs          — Galois connection (GUARD ↔ FLUX-C soundness)
│       └── analysis/          ← Analysis & benchmarking
│           ├── mod.rs
│           ├── drift_bench.rs     — Float32 vs Pythagorean48 drift comparison
│           └── quant_bench.rs     — Square vs Hexagonal quantization MSE
├── pincher-core/
└── pincher-cli/
```

### Why one crate instead of many

| Approach | Pros | Cons |
|----------|------|------|
| **Single `ternary-spatial`** | Version consistency, cross-type coherence, one pub API | Slightly bigger compile target |
| **Separate `ternary-direction`, `ternary-grid`, `ternary-constraint`** | Independent versioning | Circular dep risk, harder to keep type coherence (HexPoint ↔ Eisenstein) |
| **Inline into pincher-core** | No new crate | Bloat a focused runtime with math library, violates SRP |

**Recommendation:** Single `ternary-spatial` crate. The types are deeply interconnected — Pythagorean48 directions are the skeleton, Eisenstein quantization is the skin, constraint theory is the nervous system. They should evolve together.

### Dependency graph (target)

```
pincher-cli ──→ pincher-core ──→ ternary-spatial
                                     │
                                     ├── ternary-types (for Ternary enum)
                                     ├── num-rational (for Ratio<i64>)
                                     └── num-traits (for numeric traits)
```

---

## 3. Pythagorean48 Replacement Map

### Where f64 direction math currently lives

| File | Current code | Pythagorean48 replacement |
|------|-------------|--------------------------|
| `pincher-core/src/route/mod.rs:275` | `f64` k-means on Laplacian eigenvectors | Eigenvectors stay f64 (not directions) |
| `pincher-core/src/route/mod.rs:313-314` | `f64` norm computation | Stays f64 (not direction-related) |
| `pincher-core/src/route/mod.rs:496` | `normalized_laplacian()` → `Vec<Vec<f64>>` | Stays f64 (matrix ops, not directions) |
| `pincher-core/src/resource/pid.rs` | `f64` PID gains (kp, ki, kd) | Stays f64 (control theory, not direction) |
| `pincher-core/src/types/chord.rs` | `f32` thermal/temperature fields | Stays f32 (hardware specs, not directions) |

### Key finding: Pincher has NO current direction math

Pythagorean48 isn't replacing existing float32 direction code in pincher — it's **adding a new capability** that doesn't exist yet. The f64 usage is all spectral clustering and PID control, not direction vectors.

The replacement applies to **future integrations** where pincher needs to reason about direction, rotation, or spatial orientation:

| Future use case | Without Pythagorean48 | With Pythagorean48 |
|----------------|---------------------|-------------------|
| Reflex movement (robot/env agent) | float32 sin/cos → drift | exact rational (a/c, b/c) → zero drift |
| Chained rotation in constraint solving | accumulate 1.7e-5 per 1000 ops | exactly 0.0 forever |
| Direction as ternary trit vector | not possible | maps naturally to ternary trits |
| Embedded/INT8 direction storage | float32 → renormalization | INT8 by construction |

### Port plan: `ternary-spatial/src/direction/pythagorean48.rs`

```
pythagorean48.rs contents:
──────────────────────────
//! Pythagorean48 — zero-drift direction encoding
//!
//! 128 unique direction vectors from 52 Pythagorean triples (c ≤ 100).
//! Zero drift forever because integer rational arithmetic never round-trips.
//!
//! Key types:
//! - Pythagorean48: enum of 128 direction variants (generated from triple table)
//! - Direction: a/c, b/c as Ratio<i64> with linear algebra ops
//! - RotationChain: exact chained rotation accumulator

pub enum Pythagorean48 {
    N0, NE_012, NE_025, ...  // all 128 variants
}

impl Direction for Pythagorean48 {
    fn to_unit_vector(&self) -> (Ratio<i64>, Ratio<i64>) { ... }
    fn angle_deg(&self) -> f64 { ... }
    fn rotate(&self, by: &Rotation) -> Self { ... }
}

pub struct Rotation {
    // Chained rotation accumulator — magnitude stays exactly 1.0
    cosine: Ratio<i64>,
    sine: Ratio<i64>,
}
```

---

## 4. Eisenstein Quantization Replacement Map

### Current state

`eisenstein-quantize/` is a standalone crate with zero deps on pincher or ternary-types. It provides:

| Type/Function | Current module | Description |
|--------------|---------------|-------------|
| `Eisenstein` | `eisenstein-quantize/src/integer.rs` | Eisenstein integer: `a + bω`, arithmetic ops, norm, conjugate |
| `HexPoint` | `eisenstein-quantize/src/lattice.rs` | Hexagonal lattice point: `from_euclidean`, `to_euclidean`, 6-neighbor |
| `quantize_batch` | `eisenstein-quantize/src/lattice.rs` | Batch vector → hexagonal lattice quantization |
| `compare_quantization` | `eisenstein-quantize/src/lattice.rs` | Square vs hexagonal MSE comparison |

### What moves where

| Current file | Target in `ternary-spatial/` | Changes needed |
|-------------|------------------------------|---------------|
| `integer.rs` | `src/grid/eisenstein.rs` | Add `#[derive(Ternary)]`, add pincher serialization, add ternary trit encoding |
| `lattice.rs` | `src/grid/hexagonal.rs` | Add grid traversal, spatial indexing, neighbor distance queries |
| `error.rs` | `src/grid/mod.rs` | Merge into GridError enum |
| `lib.rs` | `lib.rs` root re-exports | Module doc + feature gate |

### Integration with pincher-core

The Eisenstein quantization naturally plugs into:

1. **`pincher-core::route::RoomGraph`** — Rooms can have hexagonal spatial coordinates
2. **`pincher-core::reflex::engine`** — Reflex matching can use spatial proximity as a signal
3. **`pincher-core::embed`** — Eisenstein distances as alternative to cosine similarity in spatial domains
4. **Future: `pincher-core::spatial` module** — New module for spatial awareness (see priority order)

---

## 5. Priority Order for Migration

### Phase 1: Foundation (Week 1) — CRITICAL PATH

**Why first:** Everything downstream depends on types and correctness proofs being solid.

| Step | What | Depends on | Outcome |
|------|------|-----------|---------|
| **1.1** | Create `ternary-spatial` crate skeleton | — | `Cargo.toml`, `src/lib.rs` with `direction`, `grid`, `constraint`, `analysis` modules |
| **1.2** | Port Eisenstein integer arithmetic from `eisenstein-quantize/src/integer.rs` | 1.1 | `Eisenstein` type with `+`, `-`, `*`, `norm`, `conj`, unit ops |
| **1.3** | Port HexPoint lattice quantization from `eisenstein-quantize/src/lattice.rs` | 1.2 | `HexPoint` with `from_euclidean`, `to_euclidean`, 6-neighbor |
| **1.4** | Port Pythagorean48 from Python experiment to Rust | 1.1 | `Pythagorean48` enum, triple table, direction ops |
| **1.5** | Port bench harnesses | 1.2-1.4 | `compare_quantization`, `drift_bench` (float32 vs P48) |
| **1.6** | Wire `ternary-spatial` into pincher workspace `Cargo.toml` | 1.1-1.5 | `cargo build` passes |

### Phase 2: Validation (Week 1-2) — GATE CHECK

**Why second:** Confidence in zero-drift and quantization math before integration.

| Step | What | Outcome |
|------|------|---------|
| **2.1** | Verify 52 triples, 128 directions match Python output | Regression tests pass |
| **2.2** | Verify rotation chain: 1000 rotates → exact 0.0 drift | Zero-drift proof replicated in Rust |
| **2.3** | Verify hexagonal quantization MSE advantage (-3.9%) | Benchmark validates theory |
| **2.4** | ADD: A₂ lattice nearest-neighbor proof (Voronoi cell) | from_euclidean returns correct lattice point |
| **2.5** | Verify Eisenstein integer ring properties | Norm multiplicative, ω³=1, 6 units |

### Phase 3: Integration into PincherOS (Week 2-3) — VALUE DELIVERY

**Why third:** Now that the spatial crate is solid, integrate where it delivers immediate value.

| Step | What | Depends on | Outcome |
|------|------|-----------|---------|
| **3.1** | Add `ternary-spatial` dep to `pincher-core/Cargo.toml` | 2.1-2.4 | Cargo resolves |
| **3.2** | Create `pincher-core::spatial` module that re-exports `ternary-spatial` types | 3.1 | Clean public API boundary |
| **3.3** | Add spatial coordinates to `RoomGraph` — rooms now have `HexPoint` positions | 3.2 | Spatial routing possible |
| **3.4** | Replace f64 direction logic in reflex confidence with Pythagorean48 angle comparison | 3.2 | Direction-aware reflex matching |
| **3.5** | Add Eisenstein distance metric to `embed::cosine_similarity` as alternative | 3.2 | Spatial intent matching |
| **3.6** | Port constraint theory (Laman rigidity) for O(1) rigidity checks | 3.2 | Graph constraint validation |

### Phase 4: Advanced (Week 3-4) — OPTIMIZATION

**Why last:** Leverages foundation for creative derivatives.

| Step | What | Outcome |
|------|------|---------|
| **4.1** | Deadband SNR integration into signal processing | Temporal sparsity for telemetry |
| **4.2** | Galois connection (if Phase 4 regex bug fixed) | Sound compilation GUARD ↔ FLUX-C |
| **4.3** | INT8 fixed-point direction storage for embedded | Direction as 2 × i8 = 2 bytes |
| **4.4** | Eisenstein trit-encoded coordinates | Each trit = 1 of 3 values on hex grid |
| **4.5** | E₈ lattice projection from Eisenstein (2D A₂), rotationally invariant | Topological quantum connections |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Python ↔ Rust P48 triple table mismatch | Medium | High (wrong directions) | Auto-generate Rust enum from Python experiment at cargo build time |
| Eisenstein serde roundtrip | Low | Medium | Derive Serialize/Deserialize, verify hex dump |
| Rotation chaining overflow (i64 overflow in mul) | Low | High | Use Ratio<i64> with checked_mul, saturate at i64::MAX |
| `ternary-types` git dep instability | Medium | Medium | Vendor or pin to commit hash in Cargo.toml |
| No integration tests for spatial in pincher | High | Medium | Phase 3 tests double as smoke tests |

---

## 7. Appendix: Crate Dependency Map (Target)

```
pincher (workspace)
├── pincher-core
│   ├── ternary-spatial           ← NEW: spatial math library
│   │   ├── ternary-types (git)   ← Ternary enum for edge weights
│   │   ├── num-rational          ← Ratio<i64> for exact rational
│   │   └── num-traits            ← Numeric trait abstractions
│   ├── rusqlite
│   ├── serde/serde_json
│   ├── tokio
│   ├── ternaries                 ← Already present
│   └── ...
└── pincher-cli
    └── pincher-core
```

### File counts per target crate

| Crate | Files | LOC (est.) | Complexity |
|-------|-------|-----------|------------|
| `eisenstein-quantize` (current) | 4 | ~250 | Low — clean library |
| `ternary-spatial` (target) | ~12 | ~800 | Medium — direction + grid + constraint + analysis |
| Pythagorean48 (target port) | 1 | ~400 | Medium — 128-direction enum + rotation chain |

---

## 8. Key Commands

```bash
# Create the new crate
cd /home/ubuntu/.openclaw/workspace/pincher
cargo new --lib ternary-spatial

# Add dependencies
cd ternary-spatial
cargo add num-rational num-traits
cargo add serde --features derive
cargo add --git https://github.com/SuperInstance/ternary-types

# Add to workspace
# (edit Cargo.toml: add "ternary-spatial" to members)

# Verify build
cd /home/ubuntu/.openclaw/workspace/pincher
cargo build --workspace
```

```bash
# Port Eisenstein integer types
cp /home/ubuntu/.openclaw/workspace/eisenstein-quantize/src/integer.rs \
   /home/ubuntu/.openclaw/workspace/pincher/ternary-spatial/src/grid/eisenstein.rs

cp /home/ubuntu/.openclaw/workspace/eisenstein-quantize/src/lattice.rs \
   /home/ubuntu/.openclaw/workspace/pincher/ternary-spatial/src/grid/hexagonal.rs
```

```bash
# Convert Python Pythagorean48 experiment to Rust
# Source: /home/ubuntu/.openclaw/workspace/forgemaster-archive/experiments/pythagorean48-encoding/experiment.py
# Generates: pincher/ternary-spatial/src/direction/pythagorean48.rs
python3 forgemaster-archive/experiments/pythagorean48-encoding/experiment.py --rust-output
```

---

*Report generated by cross-crate fleet scan using Kimi Code orchestration.*
