# ternary-engine Deep Dive

> Deep audit of `ternary-engine` (SuperInstance/ternary-engine) — the unified
> ternary {-1,0,+1} agent simulation engine. Platform core for CudaClaw,
> AI-Pasture, and Living Spreadsheet.
>
> **Analysis date:** 2026-06-05
> **Auditor:** Subagent spawned from pincher workspace

---

## 1. Complete API Surface

### Core Type: `Ternary` enum

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Ternary {
    Negative = -1,   // i8 repr
    Neutral = 0,     // insulator state (hides charge)
    Positive = 1,    // i8 repr
}
```

**Methods:**
| Method | Signature | Purpose |
|--------|-----------|---------|
| `from_i8` | `fn from_i8(i8) -> Self` | Converts i8 to Ternary (everything >0 → Positive) |
| `to_i8` | `fn to_i8() -> i8` | Returns -1, 0, or 1 |
| `to_f64` | `fn to_f64() -> f64` | Converts to f64 for math |
| `is_insulator` | `fn is_insulator() -> bool` | True only for Neutral — "the 0 state is a topological insulator" |

### Core Type: `Agent` struct

```rust
pub struct Agent {
    pub value: Ternary,              // Current state
    pub species: usize,              // Species identity (0..num_species)
    pub tick_born: u64,              // Birth tick
    pub ticks_in_zero: u64,          // How long trapped in insulator
    pub forgiveness_tokens: u32,     // Tunneling capacity (default: 3)
}
```

**Methods:**
| Method | Purpose |
|--------|---------|
| `new(Ternary, usize, u64)` | Constructor; if Neutral, sets ticks_in_zero=1 |
| `try_tunnel(f64, &mut impl FnMut() -> f64) -> bool` | Attempt to escape 0-trap using forgiveness token |
| `fall_into_trap(f64, &mut impl FnMut() -> f64) -> bool` | Active agents can fall into 0; trapped agents increment timer |

### Core Type: `PopulationMetrics` struct

```rust
pub struct PopulationMetrics {
    pub signed_gamma: f64,           // Σ values / N (can be + or -)
    pub abs_gamma: f64,              // Σ |values| / N (always ≥ 0)
    pub shannon_entropy: f64,        // H over {species × state} joint dist
    pub abs_gamma_plus_h: f64,       // |γ| + H — more stable metric
    pub frac_zero: f64,              // Fraction in insulator state (0)
    pub frac_alive: f64,             // 1 - frac_zero
    pub species_counts: Vec<usize>,  // Per-species population
    pub total_trapped: usize,        // Agents stuck in 0
    pub total_active: usize,         // Agents NOT in 0
    pub avg_trapped_duration: f64,   // Mean ticks_in_zero for trapped agents
}
```

**Methods:**
| Method | Signature | Purpose |
|--------|-----------|---------|
| `compute` | `fn compute(&[Agent], usize) -> Self` | Statistical aggregate from agent population |
| `health` | `fn health(&self) -> EngineHealth` | Diagnostic: Dead/Critical/Transitioning/Vibrant/Consensus |

### Health States: `EngineHealth` enum

```rust
pub enum EngineHealth {
    Dead,            // frac_alive < 0.01
    Critical,        // frac_alive < 0.30
    Transitioning,   // in between — the interesting phase
    Vibrant,         // H > 1.0 AND frac_alive > 0.70
    Consensus,       // frac_alive > 0.90 (active but low diversity)
}
```

Implements `Display` with emoji: 💀 ⚠️ 🔄 🌿 ✅

### `EngineConfig` struct

```rust
pub struct EngineConfig {
    pub trap_rate: f64,           // default: 0.01
    pub tunnel_rate: f64,         // default: 0.006 (optimal from experiments)
    pub forgiveness_tokens: u32,  // default: 3
    pub mutation_rate: f64,       // default: 0.02
    pub species_switch_rate: f64, // default: 0.01
    pub pareto_enabled: bool,     // default: true (but NOT IMPLEMENTED)
    pub pareto_objectives: usize, // default: 3 (NOT IMPLEMENTED)
    pub grid_size: usize,         // default: 100
    pub num_species: usize,       // default: 5
}
```

### Engine: `TernaryEngine` struct

```rust
pub struct TernaryEngine {
    pub agents: Vec<Agent>,
    pub config: EngineConfig,
    pub tick: u64,
    pub history: Vec<PopulationMetrics>,
}
```

**Methods:**
| Method | Signature | Purpose |
|--------|-----------|---------|
| `new` | `fn new(EngineConfig) -> Self` | Creates engine with random initial agent population |
| `step` | `fn step(&mut self) -> PopulationMetrics` | Advance one simulation tick |
| `run` | `fn run(&mut self, u64) -> PopulationMetrics` | Run N ticks, return final metrics |
| `health` | `fn health(&self) -> EngineHealth` | Current engine health diagnostic |

### Public API (exports via `pub mod`)

The entire crate is a single `lib.rs` — all types are public. No module hierarchy.

```rust
pub use Ternary;           // No — it's defined at root
pub use Agent;
pub use PopulationMetrics;
pub use EngineHealth;
pub use EngineConfig;
pub use TernaryEngine;
// Everything is already at crate root
```

---

## 2. Dependencies

**ZERO runtime dependencies.** The `[dependencies]` section in Cargo.toml is empty.

This is architecturally significant:
- No `serde` — cannot serialize/deserialize agents, metrics, or engine state
- No `rand` — uses a simple LCG (Linear Congruential Generator) inlined in both `new()` and `step()`
- No `thiserror` or `anyhow` — no error types at all
- No `tokio` — fully synchronous
- No `rayon` — single-threaded grid simulation
- stdlib only: `std::collections::HashMap` for entropy calculation, `std::fmt` for Display

The PSRNG is a textbook LCG:
```rust
rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1);
(rng_state >> 33) as f64 / (1u64 << 31) as f64
```

**Implication:** ternary-engine is trivially embeddable. Adding it as a dependency adds
zero transitive dependency weight. However, the lack of serde means any state that
needs to cross a serialization boundary (e.g., saving/loading simulations, sending
metrics over IPC) requires an adapter layer.

---

## 3. Architecture Patterns

### Single-File Monolith
The entire crate is one `lib.rs` (~440 lines including tests). This is appropriate for
a "platform core" — the API surface is small, the types are tightly coupled, and
splitting them into modules would add complexity without clarity.

### Builder-Optional Construction
`EngineConfig` uses `Default` trait + struct literal syntax rather than a builder
pattern. This works because:
- Zero optional/conditional fields
- No validation needed at construction
- Users override with `EngineConfig { field: val, ..Default::default() }`

### Functional Core / Imperative Shell
`PopulationMetrics::compute()` is pure (no state mutation). `TernaryEngine::step()`
mutates `self` in place. The separation is clean: metrics are a functional projection
of mutable agent state.

### Data-Oriented Computation
The step function:
1. Computes new values for all agents (immutable borrow → Vec<Ternary>)
2. Applies mutations to agents (mutable borrow)

This avoids borrow-checker fights by staging the computation into phases.

### Embedded RNG
Rather than injecting a `Rng` impl, the engine creates its own LCG inline.
This makes the engine deterministic (same config → same run) but limits flexibility.
A `#[cfg(test)]` path would benefit from seeded RNG injection.

### Grid via Linear Indexing
The 2D grid is stored as a flat `Vec<Agent>` with `row * side + col` indexing.
Moore neighborhood wrapping uses `rem_euclid`. This is memory-efficient but means
all 100 agents interact as a fully-connected grid — not scalable to large populations.

---

## 4. The 11 Experiment Findings

From README.md:

| # | Finding | Code Manifestation |
|---|---------|-------------------|
| 1 | **The 0 state is a topological insulator** — hides charge, doesn't destroy it | `Ternary::Neutral` is `is_insulator()`. `fall_into_trap()` doesn't remove agents, just traps them. `ticks_in_zero` tracks duration. |
| 2 | **Tunneling (forgiveness) rescues charge from the 0-trap** — optimal rate ≈ 0.6% | `try_tunnel()` with `forgiveness_tokens`. Default `tunnel_rate: 0.006`. Agent can escape 0 up to 3 times. |
| 3 | **\|γ\| + H is more stable than γ + H** — absolute value removes measurement error | `abs_gamma_plus_h` field tracked. Test `test_abs_gamma_more_stable` verifies that abs_gamma drifts less than signed_gamma. |
| 4 | **Pareto selection prevents diversity collapse** — 17/20 vs 1/20 unique genomes | `pareto_enabled: bool` and `pareto_objectives: usize` exist in config but are **NOT IMPLEMENTED** in the engine step. The config is aspirational. |
| 5 | **System is most alive during transitions** — H peaks at tick 100-500, then consensus forms | Reflected in the `EngineHealth` states: `Transitioning` is identified as "the interesting phase" between Critical and Consensus. |
| 6 | **Forgiveness rate 0.5-0.7 IS the tunneling rate** — same phenomenon, different language | Config uses `tunnel_rate: 0.006` (the 0.6% rate). Not directly coded as forgiveness_rate — they're kept separate conceptual domains. |
| 7+ | Additional 5 findings not listed in README | The README says "After 11 experiments" but only lists 6 findings explicitly. The remaining 5 are implied in the design choices: species identity dynamics, mutation as exploration, neighborhood influence (majority rule), the Moore grid topology, and the health diagnostic states. |

### How the findings drive the code:

**The 0-trap (Findings 1-2):**
The central dynamic. Active agents (never agents in 0) fall into 0 at `trap_rate`.
Once in 0, they can tunnel out at `tunnel_rate` using forgiveness tokens.
Without tunneling, the system eventually seizes (all agents in 0).
This directly embodies the "topological insulator" finding.

**Metric stability (Finding 3):**
`abs_gamma_plus_h = |γ| + H` is the primary stability metric. The engine tracks both
`signed_gamma` and `abs_gamma` but the finding says the absolute version is superior.
The test `test_abs_gamma_more_stable` actively validates this claim.

**Diversity (Finding 4):**
Pareto selection is flagged in config but the engine doesn't implement it.
The species system (5 default species, `species_switch_rate` 0.01) provides the
diversity mechanism instead. This is a gap — the finding says Pareto selection
prevents collapse, but the engine uses mutation-based species switching instead.

**Transition behavior (Finding 5):**
The health states model this explicitly. `Transitioning` is a named state.
`Vibrant` (H > 1.0 + frac_alive > 0.7) represents peak system health.
The system naturally moves toward `Consensus` as species converge.

---

## 5. Missing Features / Gaps

### Pareto Selection NOT Implemented
```rust
pub pareto_enabled: bool,     // ✓ exists in config
pub pareto_objectives: usize, // ✓ exists in config
```
But neither field is read anywhere in `step()` or `run()`. The README acknowledges
this: "Pareto selection not yet implemented in engine (see `ternary-seed` crate)".

**Impact:** Diversity collapse prevention from Finding 4 is not active. The species
system provides partial mitigation but isn't the Pareto multi-objective optimization
the experiments found optimal.

### No Serialization (No serde)
The crate cannot serialize/deserialize `Agent`, `PopulationMetrics`, `EngineConfig`,
or `TernaryEngine` state. This means:
- Cannot save/restore simulation state
- Cannot send metrics over IPC or network
- Cannot persist learned behavior across engine restarts

### No Grid Topology Flexibility
Hard-coded to a flat grid with Moore neighborhood. The README acknowledges:
"Grid topology only (no arbitrary graphs yet)" and "Moore neighborhood (8 neighbors,
wrapping)". For sparse agent interactions or arbitrary topologies, the engine would
need significant refactoring.

### No Async / No Parallelism
Single-threaded, synchronous. The step function iterates all agents sequentially.
For large agent counts (>10K), this becomes a bottleneck. CudaClaw is the GPU
accelerator in the ecosystem, but no CPU parallel path exists.

### No Error Handling
No `Result` types anywhere. `try_tunnel` returns `bool`, not `Result`.
`fall_into_trap` returns `bool`. No error enums, no `thiserror`. This is acceptable
for a simulation engine but unusual for a Rust crate intended as a platform core.

### LCG RNG Seeding
The RNG in `step()` is seeded from `self.tick`:
```rust
let mut rng_state: u64 = self.tick.wrapping_mul(7919).wrapping_add(12345);
```
This means the same tick number always produces the same random sequence across
runs. This is deterministic, which is good for reproducibility, but the seed is
trivially predictable and not configurable.

### No `BinaryHeap` / Pareto Front Implementation
For actual Pareto optimization, you'd need a multi-objective sorting algorithm.
The crate doesn't implement this — punted to `ternary-seed`.

---

## 6. Integration Compatibility with Pincher

### Conceptual Alignment

| ternary-engine concept | pincher-core analogue | Compatibility |
|----------------------|----------------------|---------------|
| `Ternary` enum {-1,0,+1} | `VetoVerdict { allowed, reason, confidence }` | Natural fit: Ternary could replace bool `allowed` + f64 `confidence` |
| `Ternary::Neutral` (insulator) | `VetoVerdict { allowed: true, confidence: 0.5 }` (novel commands) | Neutral maps to "needs review" — confidence 0.5 |
| `Agent::fall_into_trap` | Immunology system (antigen detection blocks actions) | Direct parallel: antigen scanning "traps" threats |
| `Agent::try_tunnel` (forgiveness) | Self-healing compiler (fixes broken WASM reflexes) | Tunnel maps to self-heal loop — rescue from failure |
| `PopulationMetrics::health()` | `ResourceState` {Normal, Light, Critical} | Health diagnostic mirrors resource state machine |
| `abs_gamma_plus_h` (stability metric) | CognitiveTrust power-law decay | Both model system stability, but different math |
| `EngineConfig` | `ResourceThresholds` | Both are parameterized control surfaces |
| Species identity | Capability manifests | Both provide identity-based access/governance |

### Direct Mapping: Ternary → Veto Engine

The veto engine currently returns `(allowed: bool, confidence: f64)`.
A ternary-based veto would use:

```
Ternary::Negative  → Deny  (confidence 1.0, blocked pattern matched)
Ternary::Neutral   → Review (confidence 0.5, novel command)
Ternary::Positive  → Allow (confidence 1.0, permission granted)
```

This is a natural fit and would eliminate the awkward `allowed: true` + `confidence: 0.5`
sentinel used for novel commands.

### Direct Mapping: Health → Resource Controller

ternary-engine's `EngineHealth` maps to pincher's `ResourceState`:

| EngineHealth | ResourceState | Notes |
|-------------|---------------|-------|
| Dead | — | No analogue; pincher doesn't have a "seized" state |
| Critical | Critical | Reflex-only, no LLM — both match |
| Transitioning | Light | Reduced operation while adapting |
| Vibrant | — | pincher has no equivalent peak state |
| Consensus | Normal | Both represent stable normal operation |

### Direct Mapping: Trap/Tunnel → Immunology

ternary-engine's trap/tunnel dynamics mirror pincher's immunology:

```
ternary-engine:        pincher immunology:
─────────────────      ─────────────────
Trap (0 state)         Antigen detection blocks actions
Tunnel rate            Self-heal compiler fix rate
Forgiveness tokens     Maximum retry attempts
Ticks in zero          Antibody generation count
```

The math is different but the pattern (obstacle → fallback → recovery) is identical.

---

## 7. What Would Need to Change to Use ternary-engine from Pincher

### Minimal Integration (Add as Dependency)

**Easy:**
1. Add `ternary-engine = { git = "https://github.com/SuperInstance/ternary-engine" }` to pincher-core's `Cargo.toml`
2. Use `ternary_engine::Ternary` as a replacement for pincher's boolean + confidence in the veto engine
3. Use `ternary_engine::EngineHealth` as inspiration for extending `ResourceState`

**No compile-time issues:** ternary-engine is `#![forbid(unsafe_code)]` and has zero dependencies.
It won't conflict with pincher's tokio/serde/rusqlite stack.

**The issue:** ternary-engine is synchronous. pincher-core is heavily async (tokio).
Calling `engine.run(1000)` would block the async runtime. This is manageable with
`tokio::task::spawn_blocking` but it's not idiomatic.

### Deep Integration (State Sharing)

**Changes needed to ternary-engine:**
1. **Add serde derives** — `#[derive(Serialize, Deserialize)]` on all public types.
   This is the single biggest blocker. Without serde, ternary engine state can't
   be packed into `.nail` bundles for migration.

2. **Add RNG injection** — Instead of always using the inline LCG, allow an
   `impl FnMut() -> f64` parameter to `step()` so pincher can control randomness.
   (The LCG can remain the default.)

3. **Add `impl` for `Iterator`** — `TernaryEngine` could implement `Iterator<Item=PopulationMetrics>`
   so pincher can drive it with `while let Some(metrics) = engine.next() { ... }`.

4. **Add async-friendly API** — An `async` step (or at minimum, a `yield_now` hook)
   so the engine doesn't block the async reactor.

5. **Add arbitrary topology support** — Currently rigid 2D grid. For pincher's
   non-spatial use case (veto decisions, resource arbitration), a simpler
   "every agent interacts with every other agent" topology or a graph topology
   would be more natural.

**Changes needed to pincher-core:**
1. **Add ternary-engine dependency** to `pincher-core/Cargo.toml`
2. **Veto engine refactor:** Replace `(allowed: bool, confidence: f64)` with
   `Ternary` enum. Map `Negative → Deny, Neutral → Review, Positive → Allow`.
3. **Immunology refactor:** Add trap/tunnel dynamics as optional behavior in
   antigen detection. Currently immunology is stateless (each scan is independent);
   adding agent state would enable the forgiveness/token model.
4. **Resource controller:** Either create an `EngineHealth → ResourceState` adapter
   or use ternary-engine's health diagnostic as an alternative signal source.
5. **Telemetry:** Replace or augment `ResourceMetrics` with `PopulationMetrics`
   for system-level health reporting.

### Alternative Approach: Extract a Common `ternary-types` Crate

Rather than pincher depending on the full simulation engine, extract just the
`Ternary` enum + `Agent` trait + health diagnostics into a lightweight
`ternary-types` crate. This crate would have:
- `Ternary` enum with serde support
- `AgentState` trait (the interface, not the concrete grid agent)
- `EngineHealth` enum
- `PopulationMetrics` struct
- ZERO simulation engine code

Pincher would depend on `ternary-types` (not `ternary-engine`) and implement
the `AgentState` trait for its internal state representations. The full
`ternary-engine` simulation would remain a separate puzzle piece for CudaClaw,
AI-Pasture, etc.

This cleanly separates the **concept** (ternary types) from the **simulation**
(grid-based engine) — which is what the ecosystem needs for integration.

### Integration Priority

| Feature | Effort | Impact | Recommended |
|---------|--------|--------|-------------|
| Use Ternary enum in veto engine | 1 day | Medium | ✅ Do first |
| Add serde to ternary-engine | 2 hours | High | ✅ PR to ternary-engine repo |
| Map EngineHealth → ResourceState | 2 days | Low | 🟡 Nice-to-have |
| Immunology trap/tunnel model | 1 week | Medium | 🟡 Post-MVP |
| Async step in ternary-engine | 3 days | Low | ❌ Use spawn_blocking instead |
| Extract ternary-types crate | 2 weeks | High | ✅ Strategic priority |

### Immediate Next Steps (Recommended for Today)

1. **Fork/clone ternary-engine** — Add serde derives to `Ternary` and `Agent`.
   This is a 10-line change and unlocks everything else.

2. **Create `pincher-core/src/veto/ternary.rs`** — Adapter that maps
   `TernaryEngine` health states to veto decisions. Start with deterministic
   rules before moving to learned models.

3. **Add a test** — Verify that a Ternary-based veto engine produces the same
   decisions as the current `VetoEngine` for all known cases.

---

## 8. Key Takeaways

### What's Good
- **Zero-dependency core** — Embed anywhere, zero transitive weight
- **Clean API** — One file, four main types, intuitive semantics
- **Experiment-driven design** — Every behavior traces to a tested finding
- **Deterministic** — Same config → same output every time
- **Safe code** — `#![forbid(unsafe_code)]`
- **Well-tested** — 9 tests covering core dynamics, edge cases, and the γ+H finding

### What's Missing
- **No serde** — Single biggest blocker for integration
- **Pareto selection unimplemented** — Config exists, logic doesn't
- **No error handling** — Everything returns bool or panics
- **Grid-only topology** — Can't model arbitrary agent networks
- **Synchronous only** — Blocks in async contexts
- **LCG RNG** — Fine for simulation, weird for production use

### Integration Verdict
**Possible today with adapter layer.** Full integration (shared types, state migration,
two-way influence) requires serde support in ternary-engine and either a `ternary-types`
extraction crate or pincher adopting ternary-engine as its state representation.

The conceptual overlap (3-state logic, trap/recovery dynamics, health diagnostics)
is strong enough that integration would be architecturally coherent. The execution
gap (sync vs async, no serde, grid topology) is manageable — estimated 2-3 days
of work for a competent Rust developer to bridge.
