# Pincher × Ternary Ecosystem — Integration Roadmap

> **Date:** 2026-06-05  
> **Status:** Draft for review  
> **Precedent:** `integration-spike.md` (ternary-graph ✅ compiles, 136/136 tests pass)  
> **Ecosystem:** [SuperInstance](https://github.com/SuperInstance) — 150+ `ternary-*` crates  
> **Target:** `pincher-core` — veto engine, immunology, routing, resource control, RPC

---

## 0. Integration Philosophy

The ternary ecosystem is designed as **composition-ready**: zero cross-dependencies in
`Cargo.toml`, all crates `#![forbid(unsafe_code)]`, stdlib-only or minimal deps.
Integration happens at the application layer, not the crate layer.

**Three integration patterns** apply throughout:

| Pattern | What it looks like | When to use |
|---------|-------------------|-------------|
| **Adapter** | Wrapper module in pincher that maps ternary types → pincher types | One-week value, minimal upstream changes |
| **Replace** | Drop pincher's native type for the ternary equivalent | Where ternary semantics are strictly richer (bool → Ternary) |
| **Merge** | Combine two modules into a shared abstraction | Where pincher and ternary solve the same problem at different scales |

Phase 1 uses **Adapter** only. Phase 2 introduces **Replace**. Phase 3 explores **Merge**.

---

## Phase 1: Ship This Week (3 integrations)

### 1.1 ternary-graph → `pincher-core/src/route/` ✅ ALREADY PROVEN

**Status:** Spike complete. Compiles. 7 new tests pass. 136/136 total.

**What ternary-graph exposes:**
- `TernaryGraph` — adjacency matrix with {-1,0,+1} weights, directed/undirected
- `Ternary` enum (`Neg`/`Zero`/`Pos`)
- `shortest_paths()` — Bellman-Ford (handles Neg weights)
- `label_propagation()`, `spectral_clustering()` — community detection
- `modularity()`, `connected_components()` — analysis utilities

**What pincher changes:**
- Add `ternary-graph` git dep to `pincher-core/Cargo.toml`
- `route/mod.rs` exists from spike (wraps TernaryGraph as `RoomGraph`)
- Register `pub mod route` in `pincher-core/src/lib.rs`
- Wire into daemon for queryable routes

**What breaks:** Nothing. Spike proves zero-regression integration. The `route` module
is additive — it doesn't touch veto, immunology, or resource control.

**Dependency ordering:** None — ternary-graph is stdlib-only, zero transitive deps.

**Effort:** ~2 hours (add module registration, PR review, CI verification)

**Risk:** LOW. Already proven in spike. Only risk is `ternary-graph` git ref stability
(no tags yet — pin by commit hash).

**Production gaps to address:**
- No `serde` on `TernaryGraph` → can't persist graph state to SQLite
- No error types (panics on OOB) → needs `GraphResult` wrapper
- FIX: Add serde + error types to `ternary-graph` upstream or maintain a fork

---

### 1.2 ternary-engine (`Ternary` type) → Veto Engine

**What ternary-engine exposes (types only, no simulation):**
- `Ternary::Negative` / `Ternary::Neutral` / `Ternary::Positive` — the core enum
- `from_i8()`, `to_i8()`, `to_f64()`, `is_insulator()` helpers
- `Display` impl showing ±/0

**What pincher changes:**
- Add `ternary-engine` git dep to `pincher-core/Cargo.toml` (zero deps, safe)
- Create `pincher-core/src/security/veto/ternary.rs` — adapter that maps:

```
VetoDecision::Allow                 ← Ternary::Positive  (or Neutral if configurable)
VetoDecision::Deny(reason)          ← Ternary::Negative
VetoDecision::RequireConfirmation   ← Ternary::Neutral   (novel/ambiguous)
```

- Add `Ternary`-aware `VetoRule` variant: `TernaryGate { positive_if, neutral_if, negative_if }`
- Keep existing `VetoDecision` enum as-is; add `from_ternary()` constructor
- Add `ExecutionContext::ternary_confidence(ternary_engine::PopulationMetrics)` — maps engine
  health stats to veto confidence levels

**What breaks:**
- Nothing downstream — `VetoDecision` API surface is unchanged
- New `from_ternary()` is additive
- `ExecutionContext` gains optional fields, no removals

**Dependency ordering:** None (ternary-engine is stdlib-only).

**Effort:** ~3-4 hours (adapter module + tests + integration test comparing boolean vs ternary
decision paths for all known rule cases)

**Risk:** LOW. Zero-dependency upstream. The Ternary enum is trivially embeddable.
Only risk: the `ternary-engine` crate is a full simulation engine — we only want the types,
not the grid simulation. No issue for Phase 1 since we don't call `step()` or `run()`.

**Future fork consideration:** If `ternary-types` extraction crate becomes available,
switch dependency from `ternary-engine` to `ternary-types` (lighter weight).

---

### 1.3 ternary-entropy → Confidence Calibration / Embed

**What ternary-entropy exposes:**
- `shannon_entropy()` — H(X) over discrete probability distributions
- `kl_divergence()` — D_KL(P||Q) for comparing distributions
- `mutual_information()` — I(X;Y) for feature relevance
- `joint_entropy()` — H(X,Y)
- All operate on `Vec<f64>` or slices, no external types needed

**What pincher changes:**
- Add `ternary-entropy` git dep (stdlib-only)
- Create `pincher-core/src/embed/entropy.rs` — calibration module:

```rust
// Calibrate embedding confidence using entropy
pub fn embedding_uncertainty(embedding: &[f64]) -> f64 {
    // Normalize embedding to probability distribution
    // Return shannon_entropy(normalized) — higher = more uncertain
}
```

- Wire into veto engine: `VetoDecision::from_entropy(decision, uncertainty_threshold)`
  — if `ternary_entropy::shannon_entropy(dist)` > threshold, escalate Neutral→RequireConfirmation
- Wire into immunology: antigen pattern entropy as signal for novel threats
  (high entropy patterns = potentially novel = escalate scrutiny)

**What breaks:** Nothing. Additive module. Embed confidence is a new signal source,
not a replacement.

**Dependency ordering:** None.

**Effort:** ~3-4 hours (entropy adapter + calibration module + integration tests)

**Risk:** LOW-MEDIUM. The math is straightforward, but calibration thresholds need
experimentation. Recommend `entropy_threshold: f64 = 0.7` as default with override
in `ResourceThresholds`.

---

### Phase 1 Integration Dependency Graph

```
ternary-graph (stdlib)  ──→ route/          ──→ daemon
                                    (no cross-dep)
ternary-engine (stdlib) ──→ veto/ternary.rs ──→ veto/mod.rs
                                    (no cross-dep)
ternary-entropy (stdlib)──→ embed/entropy.rs ──→ veto/ (optional signal)
```

All three are independent. Can ship in any order or simultaneously.

**Phase 1 total effort:** ~8-10 hours (1-2 days)

---

## Phase 2: Ship Next Week (4-5 integrations)

### 2.1 ternary-protocol → RPC / Inter-node Communication

**What ternary-protocol exposes:**
- `Message` — typed message with header, payload, checksum
- `Handshake` — node identity, version negotiation, capability exchange
- `SyncState` — state vector clock for distributed sync
- `Bus` — message bus with publish/subscribe routing
- `Ping/Pong` — liveness checks

**What pincher changes:**
- Add `ternary-protocol` git dep
- Create `pincher-core/src/rpc/ternary_protocol.rs` — adapter:

```
ternary_protocol::Message   →  pincher RpcRequest/RpcResponse adapter
ternary_protocol::Handshake →  pincher node discovery & identity exchange
ternary_protocol::Bus       →  pincher event bus for inter-node coordination
```

- Replace or augment `start_rpc_server()` with protocol-aware handler
- Add protocol-level health checks using `ternary-protocol` ping/pong

**What breaks:**
- `RpcRequest`/`RpcResponse` types are additive, not replaced
- `start_rpc_server()` gets an alternative transport mode
- Existing JSON-RPC remains as one transport; ternary-protocol is another

**Dependency ordering:** Phase 1 completions recommended (health signaling from
ternary-engine feeds into protocol health checks).

**Effort:** ~6-8 hours (protocol adapter + multi-node test + integration)

**Risk:** MEDIUM. Ternary-protocol is the most complex adapter due to stateful
handshake/sync. Requires multi-process or multi-machine testing.

---

### 2.2 ternary-explain → Veto Decision Audit Trails

**What ternary-explain exposes:**
- `Explanation` — struct with `rule_id`, `reason`, `confidence`, `counterfactual`
- `Counterfactual` — "what would change if X were different"
- `AuditTrail` — ordered sequence of explanations for a decision chain
- `explain_veto(rules, context) → Vec<Explanation>` — generate explanations

**What pincher changes:**
- Add `ternary-explain` git dep
- Create `pincher-core/src/security/explain.rs` — audit module:

```rust
pub struct VetoExplanation {
    pub decision: VetoDecision,
    pub matched_rules: Vec<VetoRule>,
    pub explanations: Vec<ternary_explain::Explanation>,
    pub counterfactuals: Vec<ternary_explain::Counterfactual>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
```

- Extend `VetoEngine::check()` to return optional explanation alongside decision:

```rust
pub fn check_with_explain(
    &self,
    action: &str,
    context: &ExecutionContext,
) -> VetoResult<(VetoDecision, Option<VetoExplanation>)>
```

- Wire into pincher's audit log (SQLite `ActionLogRow` already exists)
- Add `pincher veto explain <action>` CLI command

**What breaks:** No breaking changes. `check()` continues to return `VetoResult<VetoDecision>`.
`check_with_explain()` is additive.

**Dependency ordering:** Phase 1.2 (ternary-engine type integration) — explanations
benefit from Ternary-based confidence modeling.

**Effort:** ~6-8 hours (adapter + audit log extension + CLI command + tests)

**Risk:** LOW-MEDIUM. The counterfactual engine needs careful context snapshots.
Main risk is performance — generating explanations for every veto may be expensive.
Recommend opt-in (`--explain` flag or config threshold).

---

### 2.3 ternary-clustering → Threat Pattern Grouping

**What ternary-clustering exposes:**
- `k_means(data, k, max_iters)` — k-means on signed vectors
- `dbscan(data, eps, min_pts)` — density-based clustering
- `hierarchical(data, linkage)` — agglomerative clustering
- `signed_distance(a, b)` — distance function respecting Ternary values
- `validity_indices(data, clusters)` — silhouette, Davies-Bouldin, etc.

**What pincher changes:**
- Add `ternary-clustering` git dep
- Create `pincher-core/src/immunology/clustering.rs`:

```rust
// Group similar threat patterns into clusters
pub fn cluster_threats(antigens: &[AntigenPattern]) -> Vec<ThreatCluster> {
    // Vectorize antigen patterns
    // Cluster with ternary-clustering
    // Assign threat levels per cluster
}
```

- Add to immunology pipeline: after individual antigen scoring, run cluster analysis
  to detect coordinated threats that individual scans would miss
- Feed cluster assignments back into veto engine as context signals

**What breaks:** Nothing. Additive to immunology pipeline.

**Dependency ordering:** None standalone. Better with ternary-entropy (2.4) for
cluster quality measurement.

**Effort:** ~4-6 hours (clustering adapter + immunology extension + tests)

**Risk:** LOW. Clustering is a well-understood problem. The signed-distance variant
is the novel part, but it's well-tested upstream.

---

### 2.4 ternary-scoring → Multi-Criteria Veto Decisions

**What ternary-scoring exposes:**
- `Scorecard` — multi-criteria decision matrix
- `pareto_front(items, criteria)` — Pareto-optimal set extraction
- `dominance_rank(items, criteria)` — full ranking
- `weighted_sum(item, weights)` — linear aggregation
- `leaderboard(items, score_fn)` — sorted ranking with ties

**What pincher changes:**
- Add `ternary-scoring` git dep
- Create `pincher-core/src/security/veto/scoring.rs`:

```rust
// Multi-criteria veto that considers safety, resource cost, latency, etc.
pub fn multi_criteria_veto(
    action: &str,
    context: &ExecutionContext,
    criteria: &[VetoCriterion],
    weights: &[f64],
) -> VetoDecision {
    // Score against each criterion
    // Compute weighted sum → threshold
    // Return Allow/Deny/RequireConfirmation
}
```

- Add `VetoCriterion` type: safety_score, resource_cost, novelty, latency_impact
- Wire into `VetoEngine::check()` as optional multi-criteria path
- Add `pareto_enabled: bool` to `VetoConfig` — mirroring ternary-engine's aspirational
  Pareto flag, but **actually implemented** this time

**What breaks:** Nothing if additive. Multi-criteria path is behind a config gate.

**Dependency ordering:** Phase 1.2 (ternary-engine type) for unifying score semantics.

**Effort:** ~5-7 hours (scoring adapter + config extension + integration tests)

**Risk:** LOW. Weighted-sum scoring is textbook. Pareto front is novel but well-tested
upstream. Risk is threshold calibration for multi-criteria vs single-criteria decisions.

---

### 2.5 ternary-replay → Experiment Debugging

**What ternary-replay exposes:**
- `Recorder` — records agent state at each tick
- `Playback` — replays recorded state, forward and backward
- `Diff` — compares two recorded states, produces changeset
- `Annotate` — annotates replay with explanations or metrics

**What pincher changes:**
- Add `ternary-replay` git dep
- Create `pincher-core/src/migration/replay.rs`:

```rust
// Record veto decisions and agent state for post-mortem analysis
pub fn record_veto_session(session_id: &str, engine: &VetoEngine) -> ReplaySession;
pub fn replay_veto_session(session_id: &str, step: usize) -> VetoSnapshot;
pub fn diff_sessions(a: &str, b: &str) -> Vec<DiffEntry>;
```

- Add `--replay` flag to `pincher veto` CLI for interactive decision debugging
- Wire into nail bundle migration: replay state alongside migration for rollback analysis

**What breaks:** Nothing. Additive. Mirror of ternry-explain but temporally (time-series
vs decision-chain).

**Dependency ordering:** Phase 2.2 (ternary-explain) for richer annotation during replay.

**Effort:** ~4-5 hours (replay adapter + CLI integration + migration wire-up + tests)

**Risk:** LOW-MEDIUM. State recording adds memory overhead. Recommend ring buffer
for active sessions (last N decisions) with optional full persistence.

---

### Phase 2 Integration Dependency Graph

```
Phase 1 foundations:
  ternary-engine ─────┐
  ternary-graph ──────┤
  ternary-entropy ────┤
                      ▼
Phase 2 integrations:
  ternary-protocol  ──→ rpc/            (needs engine health signals)
  ternary-explain   ──→ security/explain (needs ternary type foundation)
  ternary-clustering ──→ immunology/     (independent, stronger with entropy)
  ternary-scoring   ──→ security/veto   (needs ternary type foundation)
  ternary-replay    ──→ migration/      (needs explain for annotations)
```

**Phase 2 total effort:** ~25-34 hours (3-4 days parallelizable)

---

## Phase 3: This Month (Full Ecosystem Alignment)

### 3.1 ternary-causality → Root-Cause Analysis

**What ternary-causality exposes:**
- `CausalDag` — DAG of causal relationships with signed edges
- `do_calculus(op, graph, target)` — intervention simulation
- `counterfactual(graph, observed, intervention, target)` — what-if analysis
- `discover(data, algorithm)` — causal discovery from observational data

**What pincher changes:**
- Add `ternary-causality` git dep
- Create `pincher-core/src/security/causal.rs` — root-cause analyzer:

```rust
// Given a veto decision chain, find the root cause
pub fn veto_root_cause(history: &[VetoSnapshot]) -> CausalExplanation {
    // Build CausalDag from veto rule triggering patterns
    // Run discovery to find causal drivers
    // Return root cause + confidence
}
```

**Effort:** ~8-10 hours (causality adapter + DAG builder + integration)

**Risk:** MEDIUM. Causal discovery is complex. Recommend starting with expert-defined
DAG edges and graduating to learned discovery.

---

### 3.2 ternary-pipeline → Processing Pipeline Alignment

**What ternary-pipeline exposes:**
- `Stage` — pipeline stage with `Process(Input) → Output`
- `Pipeline` — ordered stage sequence with branching
- `Strategy` — conditional stage selection (if-then-else, match)
- `Metrics` — per-stage timing, throughput, error rate

**What pincher changes:**
- Map ternary-pipeline stages to pincher's processing pipeline
- Replace or augment `pincher-core/src/pipeline/` with ternary-pipeline concepts
- Add conditional branching support (current pipeline is strictly linear)

**Effort:** ~6-8 hours (pipeline alignment + branching support + tests)

**Risk:** LOW-MEDIUM. Pincher's pipeline isn't yet identified in the module tree —
this may be aspirational or exist in a crate not yet inspected.

---

### 3.3 Extract `ternary-types` Crate (Strategic Refactor)

**What this is:** Extract `Ternary` enum + `EngineHealth` + `PopulationMetrics` from
`ternary-engine` into a lightweight, serde-enabled `ternary-types` crate.

**Why:** Currently, every pincher module that uses `Ternary` depends on the full
simulation engine. `ternary-types` would be:
- ~50 lines of code
- `#![forbid(unsafe_code)]`
- serde `Serialize`/`Deserialize` on all types
- Zero simulation engine baggage

**What pincher changes:**
- Switch dependency from `ternary-engine` → `ternary-types`
- Update import paths (minor)
- Add serde derives immediately (enables SQLite persistence, JSON RPC, nail bundles)

**Upstream changes:**
- Create `SuperInstance/ternary-types` or submit PR to `ternary-engine`
- Add serde as optional dependency

**Effort:** ~4 hours (extraction + pincher migration)

**Risk:** LOW. Well-defined scope, clear API boundary.

---

### 3.4 Full serde Support Across Integrated Crate Surface

**What this covers:**
- `ternary-graph` — serde on `TernaryGraph`, `Ternary`
- `ternary-protocol` — serde on `Message`, `Handshake`, `Bus`
- `ternary-entropy` — serde on config/result structs
- `ternary-explain` — serde on `Explanation`, `AuditTrail`
- `ternary-clustering` — serde on cluster results
- `ternary-scoring` — serde on `Scorecard`

**Approach:** Submit PRs to each upstream repo adding optional serde support
(`#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]`).

**Alternatives:**
1. Maintain pincher forks — high maintenance burden
2. Local serde wrappers — works but verbose
3. Upstream PRs — preferred long term

**Effort:** ~8-12 hours across 6+ repos

**Risk:** LOW. Serde derives are mechanical. Risk is PR acceptance latency.

---

### 3.5 Async Adaptation Layer

**What this covers:**
Make ternary ecosystem crates async-friendly for pincher's tokio runtime.

- Add `async fn step_async()` or `spawn_blocking` wrapper pattern
- Add `Iterator` impl for `TernaryEngine` (`while let Some(metrics) = engine.next() {}`)
- Add `yield_now()` hook for cooperative scheduling during long simulations

**Approach:**
- In pincher: `tokio::task::spawn_blocking(move || engine.run(1000))`
- In `ternary-engine`: Accept optional `&mut dyn AsyncHandler` for tick callbacks

**Effort:** ~4-6 hours (wrapper pattern + integration test)

**Risk:** LOW. `spawn_blocking` is well-tested. Upstream async support is aspirational.

---

### 3.6 Telegram-Shortcut: Maps & Vision

**What ternary-topology exposes:**
- `persistent_homology(data, max_dim)` — topological data analysis
- `betti_numbers(complex)` — Betti₀ (components), Betti₁ (loops), Betti₂ (voids)
- `boundary_matrix(simplicial_complex)` — algebraic boundary detection

**What binary-vision / image crates expose (verified in ecosystem):**
- The ecosystem has image-related stubs: not yet inspected

**What pincher changes:**
- Map room topology → Betti numbers for connectivity analysis
- Detect "void" rooms (Betti₁ > 0) — rooms with no escape routes
- Use boundary detection for security perimeter analysis

**Effort:** ~6-8 hours (topology adapter + room-analysis integration)

**Risk:** MEDIUM. Persistent homology is computationally expensive.
Recommend restricting to small room graphs (<50 rooms).

---

### Phase 3 Integration Dependency Graph

```
All Phase 1 & 2 deps ready ──┐
                             ▼
Phase 3:
  ternary-causality       ──→ security/causal    (needs explain + scoring from P2)
  ternary-types extract   ──→ all Ternary consumers (needs consensus on extraction)
  serde campaign          ──→ all integrated crates (parallelizable across repos)
  async adaptation        ──→ ternary-engine consumers
  ternary-pipeline        ──→ pipeline/          (if module exists)
  ternary-topology        ──→ security/topo      (independent, nice-to-have)
```

**Phase 3 total effort:** ~36-48 hours (1-2 weeks, parallelizable across 3+ contributors)

---

## 4. Effort Summary

| Phase | Integration | Hours | Risk | Dependencies |
|-------|------------|-------|------|-------------|
| **P1** | `ternary-graph` → route | 2 | 🟢 Low | None |
| **P1** | `ternary-engine` → veto types | 3-4 | 🟢 Low | None |
| **P1** | `ternary-entropy` → embed | 3-4 | 🟡 Low-Med | None |
| **P2** | `ternary-protocol` → RPC | 6-8 | 🟡 Medium | Phase 1 engine health |
| **P2** | `ternary-explain` → audit | 6-8 | 🟡 Low-Med | Phase 1 ternary type |
| **P2** | `ternary-clustering` → immunology | 4-6 | 🟢 Low | None (entropy helps) |
| **P2** | `ternary-scoring` → multi-criteria veto | 5-7 | 🟢 Low | Phase 1 ternary type |
| **P2** | `ternary-replay` → debug | 4-5 | 🟡 Low-Med | Phase 2 explain |
| **P3** | `ternary-causality` → root cause | 8-10 | 🟡 Medium | Phase 2 explain+scoring |
| **P3** | `ternary-pipeline` → processing | 6-8 | 🟡 Low-Med | Pipeline module exists? |
| **P3** | Extract `ternary-types` | 4 | 🟢 Low | Consensus on extraction |
| **P3** | serde campaign | 8-12 | 🟢 Low | All integrated deps |
| **P3** | Async adaptation | 4-6 | 🟢 Low | ternary-engine |
| **P3** | `ternary-topology` → room analysis | 6-8 | 🟡 Medium | None (nice-to-have) |

**Phase 1 total:** 8-10 hours (1-2 days)  
**Phase 2 total:** 25-34 hours (3-4 days, parallelizable)  
**Phase 3 total:** 36-48 hours (1-2 weeks)  
**Grand total:** 69-92 hours (2-3 weeks full-time, ~4-6 weeks part-time)

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `ternary-engine` changes API | Low | High | Pin git commit; fork if needed |
| serde PRs rejected upstream | Med | Medium | Maintain pincher-specific wrapper types |
| `ternary-protocol` handshake too stateful | Medium | Medium | Fall back to JSON-RPC as default, protocol as optional |
| Causal discovery yields false positives | High | Medium | Start with expert-defined DAG; validate against test cases |
| Async blocking in `spawn_blocking` overloads runtime | Low | High | Configure thread pool size; add timeout per engine step |
| `ternary-topology` HPC cost on room graphs | Med | Low | Limit to <50 rooms; cache Betti numbers |
| No `ternary-types` extraction consensus | Low | Medium | Pincher maintains its own `ternary_types.rs` inline (~50 lines) |
| Dependency version conflicts | Low | Medium | Zero transitive deps from ternary crates makes this unlikely |

---

## 6. Quick-Start Checklist

### Week 1 — Do These First

- [ ] Add `ternary-graph` → `route/` module (merge spike PR, ~2h)
- [ ] Add `ternary-engine` `Ternary` type → veto adapter (~3h)
- [ ] Add `ternary-entropy` → entropy calibration module (~3h)
- [ ] Run full test suite — 136+ tests must remain green
- [ ] Release v0.2.0-alpha with ternary routing + ternary veto

### Week 2 — Deepen

- [ ] `ternary-protocol` → RPC adapter for distributed pincher nodes (~2d)
- [ ] `ternary-explain` → veto audit trails (~1.5d)
- [ ] `ternary-clustering` → threat pattern grouping (~1d)
- [ ] `ternary-scoring` → multi-criteria veto (~1.5d)
- [ ] `ternary-replay` → experiment debugging (~1d)

### Week 3-4 — Align

- [ ] Investigate `ternary-pipeline` → processing pipeline
- [ ] Begin root-cause analysis with `ternary-causality` adapter
- [ ] `ternary-types` extraction PR or inline implementation
- [ ] serde campaign across integrated dependencies
- [ ] Async adaptation layer review and stress test

---

## 7. The "Skip" Candidate (Lowest ROI)

`ternary-cli` — if it exists, it's a CLI tool, not a library. Pincher already has
`pincher-cli`. No value in integrating a separate CLI.

`ternary-music` / audio crates — interesting but orthogonal to pincher's veto mission.
Would only integrate if pincher gains audio processing features.

`ternary-fleet` / naval crates — too abstract. The room-as-codespace metaphor maps to
`ternary-graph`, not to fleet orchestration.

---

## 8. Success Criteria

| Milestone | Signal | Timeline |
|-----------|--------|----------|
| **Ternary routing** | Room graph serializable, queriable, with community detection | End of Week 1 |
| **Ternary veto** | Veto decisions expressible as Ternary, audit-compatible | End of Week 1 |
| **Multi-node comms** | Two pincher nodes exchange protocol messages | End of Week 2 |
| **Audit trails** | `pincher veto explain` produces human-readable counterfactuals | End of Week 2 |
| **Full serde support** | All integrated ternary state is JSON-serializable | End of Week 3 |
| **Root-cause analysis** | `pincher veto why` identifies causal drivers of decisions | End of Week 4 |
| **All 150+ green tests** | Zero regressions across pincher suite | Continuous |

---

## 9. Documented Assumptions

1. Ternary ecosystem crates continue to be maintained and available on GitHub
2. No breaking API changes in upstream crates without notice
3. serde PRs are accepted within reasonable timeframes
4. pincher's existing 136 tests cover the critical paths that must not regress
5. The route module from the spike is representative of future integration patterns
6. Community consensus supports extracting `ternary-types` or pincher maintains its own
7. Contributors have read access to SuperInstance GitHub org

---

*This roadmap prioritizes maximum value per unit of integration effort.*
*Phase 1 can ship independently of Phase 2-3. Each phase gates on the previous.*
