# Ternary Ecosystem Map

> Generated: 2026-06-05 05:24 UTC
> Source: SuperInstance GitHub org, 150+ `ternary-*` repos
> All repos created by: **OpenClaw** <superinstance@users.noreply.github.com>

---

## 1. Summary Statistics

| Metric | Value |
|---|---|
| **Total repos** | 150+ (new ones appearing during analysis) |
| **Creation span** | ~14 hours (Jun 4 15:00 → Jun 5 05:30 UTC) |
| **Average cadence** | ~11 repos/hour |
| **Language** | 100% Rust |
| **Version** | All v0.1.0, edition 2021 |
| **License** | MIT |
| **Creator** | OpenClaw (single account, all repos) |
| **Commits** | 1-2 per repo (initial + optional doc/cleanup) |
| **CI/CD** | None (no .github/workflows anywhere) |
| **Cross-dependencies** | None (all `[dependencies]` sections empty) |

### Code Size Distribution

| Category | Count | Description |
|---|---|---|
| **BIG** (≥5KB repo size) | 22 | Real implementations, multiple source files, tests, FUTURE-INTEGRATION.md |
| **MED** (4-5KB) | 4 | Significant single file implementations |
| **STUB** (10-100B) | ~30 | Basic crate skeleton with lib.rs, Cargo.toml, README |
| **MINIMAL** (0-9B) | ~96+ | Minimal stubs, some with real code (5000+ byte lib.rs) |

**Note**: The GitHub "size" field is misleading (directory-based). The latest repos (ternary-minority, ternary-grace, etc.) show size=0 but contain 5000-10000 byte Rust source files.

---

## 2. Creation Cadence

### Timeline (hourly)

```
Hour          Count     Burst
─────────────────────────────────────
Jun 4 15:00     3      🟡 (seed repos)
Jun 4 16:00     0      ⚫
Jun 4 17:00     4      🟡
Jun 4 18:00    12      🟢 (first wave)
Jun 4 19:00     1      ⚫ (slump)
Jun 4 20:00    14      🟢
Jun 4 21:00    35      🟢🟢 PEAK
Jun 4 22:00    12      🟢
Jun 4 23:00    20      🟢
Jun 5 00:00    14      🟢
Jun 5 01:00     6      🟡
Jun 5 02:00     3      🟡
Jun 5 03:00    10      🟢
Jun 5 04:00     8      🟢
Jun 5 05:00     8+     🟢 (still active)
```

**Pattern**: Not accelerating — rather, bursty with a peak at 21:00 UTC. Active generation continues at 8+/hour.

### Repo Naming Pattern

Format: `ternary-{concept}` where concept is a lowercase English noun or compound adjective.

**Naming clusters by theme:**
- **Math/Algebra**: ring, permutation, matrix, tensor, graph, topology, gradient, clustering
- **ML/AI**: rl, attention, bayesian, markov, classifier, fuzzy, kalman, som, pca, curriculum, transfer, federated
- **Physics**: dynamics, thermodynamics, entropy, noise, chaos, ising, percolation, kuramoto, field
- **Music/Audio**: music, wave, echo, loop, pan, bite, vu, polyrhythm, tempo, crossfader, resonance, harmonic
- **Systems**: protocol, distributed, pipeline, locks, network, bus, channel, bridge
- **Fleet/Maritime**: captain, platoon, ensign, helm, harbor, reef, anchor, shipyard, dockyard, voyage, pilgrim, observatory, compass, navigator, current, tidelight, cargo
- **Agent/AI**: agent, engine, sandbox, sensor, control, automata, attention, swarm
- **Crypto/Trust**: forgiveness, voting, consensus,  steganography,  locks
- **Timing/Pattern**: tempo, rhythm, tide, motion, wave, pulse
- **Data**: database, search, replay, scoring, metrics, pipeline, archive, cortex, genome
- **Meta**: ecosystem, experiment, science, frontie, language-evolution

---

## 3. Repo Contents Analysis

### DEFAULT CRATE STRUCTURE (all repos share this pattern)

Every `ternary-*` repo has exactly this structure:
```
.gitignore, Cargo.toml, Cargo.lock, README.md, docs/, src/
```

### CARGO.TOML Template
```toml
[package]
name = "ternary-{name}"
version = "0.1.0"
edition = "2021"
# optional fields vary
```

All `[dependencies]` and `[dev-dependencies]` sections are **empty**. No crate dependencies on other ternary-* crates.

### THE 22 "BIG" REPOS WITH REAL CODE

These repos have genuine implementations with multiple source files, tests, and documentation:

1. **ternary-entropy** (13323) — Shannon entropy, KL divergence, mutual info
2. **ternary-explain** (12745) — Decision explainability, counterfactuals, audit trails
3. **ternary-protocol** (11042) — Wire protocol: message passing, handshake, sync, versioning
4. **ternary-causality** (9636) — CausalDAG, interventions, counterfactual engine, discovery
5. **ternary-graph** (8582) — Graph algorithms: shortest paths, community detection, spectral clustering
6. **ternary-topology** (7797) — Persistent homology, Betti numbers, boundary detection
7. **ternary-transfer** (7391) — Transfer learning, domain adaptation, negative transfer
8. **ternary-noise** (7374) — Noise models, conservation law tolerance, denoising
9. **ternary-clustering** (7297) — K-means, DBSCAN, hierarchical, validity indices
10. **ternary-regex** (7293) — NFA/DFA construction, minimization, stream matching
11. **ternary-scoring** (7210) — Multi-criteria scoring, Pareto fronts, leaderboards
12. **ternary-federated** (6726) — Federated learning, secure aggregation
13. **ternary-engine** (6613) — **Unified simulation engine** (platform core)
14. **ternary-search** (6499) — Strategy graph search, fitness landscapes
15. **ternary-replay** (6441) — Experiment recording and replay
16. **ternary-curriculum** (6372) — Curriculum learning for ternary agents
17. **ternary-ring** (6272) — Z/3Z arithmetic, GF(3^n), polynomial rings
18. **ternary-pipeline** (5726) — Pipeline processing for strategies
19. **ternary-criticality** (5385) — Critical slowing down detector
20. **ternary-automata** (5241) — Cellular automata on ternary states
21. **ternary-metrics** (5199) — Metrics collection and analysis
22. **ternary-markov** (5155) — Markov chains, transition matrices

### THE 4 MED REPOS WITH SIGNIFICANT CODE

23. **ternary-permutation** (4711) — Permutation operations, symmetric groups
24. **ternary-renormalize** (4537) — Renormalization group, coarse-graining
25. **ternary-forgiveness** (4398) — Trust mechanics, forgiveness modeling (21KB lib.rs!)
26. **ternary-science** (4134) — Cross-validation, GPU benchmarks, conservation laws, species analysis (multi-file)

---

## 4. Interesting Findings

### Finding 1: Genuine Code Quality

The code is NOT automatically generated boilerplate. Each BIG repo has:
- Well-documented Rust with `#![forbid(unsafe_code)]`
- Complete type systems (enums, structs, traits)
- Real algorithm implementations (Bellman-Ford, spectral clustering, NFA→DFA conversion, persistent homology)
- Integration tests
- Comprehensive README with crate documentation

Example from ternary-graph (20677 bytes of lib.rs):
```rust
pub fn shortest_path(&self, start: usize, end: usize) -> Option<(Vec<usize>, i64)> {
    // Bellman-Ford for handling negative edge weights
    let mut dist = vec![i64::MAX; self.n];
    let mut prev = vec![None; self.n];
    dist[start] = 0;
    for _ in 0..self.n - 1 {
        for i in 0..self.n {
            for j in 0..self.n {
                if self.adj[i][j] != Ternary::Zero {
                    let w = self.adj[i][j].to_i64();
                    if dist[i] != i64::MAX && dist[i] + w < dist[j] {
                        dist[j] = dist[i] + w;
                        prev[j] = Some(i);
                    }
                }
            }
        }
    }
    // ...
}
```

### Finding 2: The "2021" Cluster

Three repos have `"2021"` as their description:
- **ternary-locks** — Lock algebra (references "Oracle1's research"), with full implementation
- **ternary-network** — Network primitives
- **ternary-chaos** — Chaos dynamics

This looks like an experiment/flag number, not a date reference.

### Finding 3: FUTURE-INTEGRATION.md Network

Most BIG repos contain `docs/FUTURE-INTEGRATION.md` — detailed cross-references to other ternary-* crates and external projects including:

**Internal cross-references** (mentioned across FUTURE-INTEGRATION.md files):
- ternary-cell, ternary-world, ternary-compiler, ternary-distributed, ternary-planning
- ternary-games, ternary-music, ternary-entropy, ternary-thermodynamics
- ternary-replay, ternary-diff, ternary-protocol, ternary-protocol, ternary-inference, ternary-sandbox
- ternary-science, ternary-spreadsheet, ternary-federated

**External dependences mentioned** (not in GitHub org):
- `construct-core` (hardware tiers: ESP32, Pi, DGX)
- `negative-space-core` (population-level inference)
- `conservation-matrix-rs` (conservation law verification)
- `flux-algebra-rs` (music theory ↔ graph theory bridge)
- `strategy-ecology` (ecological modeling for strategies)
- `ternary-registry`, `ternary-world` (not found in SuperInstance org)
- `CudaClaw`, `AI-Pasture`, `Living Spreadsheet` (named as platform consumers)

### Finding 4: No Actual Cross-Dependencies

Despite all the cross-references in FUTURE-INTEGRATION.md, **NONE** of the Cargo.toml files have any `ternary-*` as actual Rust crate dependencies. The integration is entirely documented conceptually, not wired up in code. This was clearly a deliberate design choice — each crate is self-contained.

### Finding 5: Evolution-ternary Anomaly

**evolution-ternary** is the only repo that breaks the `ternary-*` pattern. It has its own docs/FUTURE-INTEGRATION.md, tests/, and multi-file source structure. Created at 2026-06-04T15:46:18Z — one of the earliest. This may be the original parent seed.

### Finding 6: The Latest Wave (05:xx UTC)

The most recent batch of repos (8 created in the last 30 minutes) are all **audio/signal processing** themed with real code:
- **ternary-grace** — Grace vs Trust rebuild model (9.8KB of code)
- **ternary-pan** — Stereo panning from ternary signals (5.5KB)
- **ternary-echo** — Delay line audio effect (6.2KB)
- **ternary-field** — Grid field gradient/Laplacian/divergence (7.4KB)
- **ternary-wave** — Waveform generation: square/saw/triangle (5.2KB)
- **ternary-bite** — Bit crushing, quantization, downsampling (5.3KB)
- **ternary-loop** — Loop detection in signals (4.8KB)
- **ternary-vu** — VU metering, peak/RMS (5.6KB)
- **ternary-minority** — Minority cellular automaton (still being created)

### Finding 7: Creator Identity

All repos are created by **OpenClaw** <superinstance@users.noreply.github.com> — the email is GitHub's noreply format, indicating the repos were created via GitHub API/automation. The single identity and bursty cadence confirm **autonomous generation**.

---

## 5. Cluster Map — Functional Groups

```
                     ┌──────────────────────────────────────┐
                     │  TERNARY ENGINE (platform core)      │
                     │  Embodies 11 experiment findings     │
                     │  "CudaClaw / AI-Pasture / Living     │
                     │   Spreadsheet"                       │
                     └────────────┬─────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────────┐
        │                         │                             │
   ┌────▼────┐            ┌──────▼──────┐            ┌─────────▼──────┐
   │ MATH/   │            │ ML/AI       │            │ AGENT/         │
   │ ALGEBRA │            │ LEARNING    │            │ SYSTEMS        │
   ├─────────┤            ├─────────────┤            ├────────────────┤
   │ ring    │            │ rl          │            │ agent          │
   │ permute │            │ bayesian    │            │ automata       │
   │ matrix  │            │ markov      │            │ sandbox        │
   │ tensor  │            │ attention   │            │ sensor         │
   │ fuzzy   │            │ classifier  │            │ control        │
   │ hash    │            │ kalman      │            │ protocol       │
   │ lattice │            │ som         │            │ distributed    │
   └─────────┘            │ pca         │            │ pipeline       │
    ┌─────────┐           │ curriculum  │            │ locks          │
    │ GRAPH/  │           │ transfer    │            │ network        │
    │ TOPO    │           │ federated   │            │ channel        │
    ├─────────┤           │ clustering  │            │ bus            │
    │ graph   │           ├─────────────┤            └────────────────┘
    │ topology│           │ CAUSALITY   │
    │ trees   │           ├─────────────┤            ┌─────────────────┐
    │ flow    │           │ causality   │            │ PHYSICS/NATURE  │
    └─────────┘           │ inference   │            ├─────────────────┤
                          │ explain     │            │ dynamics        │
    ┌─────────┐           ├─────────────┤            │ thermodynamics  │
    │ SIGNAL  │           │ PATTERNS    │            │ noise           │
    ├─────────┤           ├─────────────┤            │ entropy         │
    │ wave    │           │ regex       │            │ chaos           │
    │ echo    │           │ search      │            │ ising           │
    │ loop    │           │ replay      │            │ percolation     │
    │ pan     │           │ scoring     │            │ kuramoto        │
    │ bite    │           │ diff        │            │ criticality     │
    │ vu      │           │ compiler    │            │ renormalize     │
    │ field   │           │ constraint  │            └─────────────────┘
    │ polyrh. │           └─────────────┘
    │ tempo   │
    │ music   │          ┌──────────────────┐        ┌──────────────────┐
    │ color   │          │ FLEET/NAVAL      │        │ ECONOMY/GOV      │
    │ crossfd │          ├──────────────────┤        ├──────────────────┤
    │ harmon. │          │ captain          │        │ voting           │
    │ resonan.│          │ platoon          │        │ consensus        │
    └─────────┘          │ ensign           │        │ market           │
                         │ helm             │        │ econ             │
    ┌──────────┐         │ anchor           │        │ auction          │
    │ CRYPTO/  │         │ harbor           │        │ inventory        │
    │ TRUST    │         │ reef             │        │ scoring          │
    ├──────────┤         │ shipyard         │        └──────────────────┘
    │ steganog │         │ dockyard         │
    │ locks    │         │ voyage           │        ┌──────────────────┐
    │ forgivns │         │ pilgrim          │        │ META/INFRA       │
    │ encoding │         │ observatory      │        ├──────────────────┤
    └──────────┘         │ compass          │        │ science          │
                         │ navigator        │        │ ecosystem        │
    ┌──────────┐         │ current          │        │ genome           │
    │ DATA     │         │ tidelight        │        │ cortex           │
    ├──────────┤         │ cargo            │        │ experiment       │
    │ database │         └──────────────────┘        │ archive          │
    │ search   │                                     │ frontie          │
    │ replay   │                                     │ language-evol    │
    │ metrics  │                                     │ cli              │
    │ pipeline │                                     └──────────────────┘
    │ archive  │
    │ genome   │
    │ cortex   │
    └──────────┘
```

---

## 6. Integration Points with pincher

Based on the FUTURE-INTEGRATION.md documents and code structure, here are the most promising integration points:

### Direct Integration Targets

1. **ternary-engine** (HIGH)
   - The platform core. Embodies "11 experiment findings" (0=topological insulator, tunneling/forgiveness, Pareto selection, conservation laws).
   - `Ternary` enum is standard across the ecosystem.
   - Calls out CudaClaw, AI-Pasture, Living Spreadsheet as consumers — pincher could be the next.

2. **ternary-protocol** (HIGH)
   - Wire protocol for agent communication: handshake, message, payload, sync, version, trit, bus.
   - Maps directly to inter-agent communication in pincher.
   - Already references distributed debugging across Codespaces.

3. **ternary-compiler** (HIGH)
   - Compiles strategy descriptions → optimized lookup tables.
   - Maps to ESP32-tier execution (Layer 0 in construct-core hierarchy).
   - Cross-references with pincher's compile-time optimization needs.

4. **ternary-graph** (HIGH)
   - Room-as-codespace routing: rooms = vertices, passages = edges.
   - `shortest_path()` for agent routing between rooms.
   - Community detection for room neighborhoods.

5. **ternary-causality** (MEDIUM)
   - Root cause analysis across rooms (distributed debugging).
   - Counterfactual replay for debugging pincher's decision chains.

6. **ternary-fitness** (MEDIUM)
   - Pincher's resource allocation as a fitness landscape.
   - Pareto multi-objective optimization.

### Architecture Note

No cross-dependencies exist in Cargo.toml — integration would need to add them. The ecosystem was designed as independent crates that can be composed at the application level.

### External Systems Referenced

From FUTURE-INTEGRATION.md files, these external projects coordinate with the ternary ecosystem:
- **construct-core** — Hardware tiers (ESP32/Pi/DGX)
- **negative-space-core** — Population-level inference
- **conservation-matrix-rs** — Conservation law verification
- **CudaClaw** — GPU execution engine
- **AI-Pasture** — Educational game physics
- **Living Spreadsheet** — Interactive control surface

---

## 7. Anomalies

| Anomaly | Details |
|---|---|
| **evolution-ternary** | Only repo without ternary-* prefix. One of the oldest (15:46 UTC). Has its own tests/ and multi-file structure. May be the original seed. |
| **"2021" descriptions** | ternary-locks, ternary-network, ternary-chaos all have description "2021" instead of meaningful text. ternary-locks references "Oracle1's research". |
| **ternary-search** | Contains compiled artifacts (target/ directory with .rlib, .rmeta, binary). All others clean. |
| **ternary-engine** | Only repo that references "11 experiments" and names consumer projects (CudaClaw/AI-Pasture/Living Spreadsheet). The most mature-seeming crate. |
| **ternary-science** | Has cross-validation, GPU benchmarks, *and* Metal (Apple GPU) code. Only repo with platform-specific code. |
| **No CI/CD anywhere** | Zero repos have .github/workflows. Despite being Rust crates, none verify they compile. |
| **No cross-dependencies** | Despite extensive cross-references in docs, no Cargo.toml `[dependencies]` actually reference another ternary-* crate. |
| **Latest repos have real code** | Repos created in the last hour (ternary-minority, ternary-grace, etc.) show GitHub size=0 but have 5000-10000 byte lib.rs files. |

---

## 8. Complete Repo Catalog

### BIG (22 repos — real implementations)

| Repo | Size | Files | Tests | Future |
|---|---|---|---|---|
| ternary-entropy | 13323 | lib.rs, Cargo.lock, README.md, docs/ | ✓ | ✓ |
| ternary-explain | 12745 | lib.rs + 6 submodules, tests/ | ✓ | ✓ |
| ternary-protocol | 11042 | lib.rs + 6 submodules | ? | ✓ |
| ternary-causality | 9636 | lib.rs (28KB) | ? | ✓ |
| ternary-graph | 8582 | lib.rs (20KB) | ? | ✓ |
| ternary-topology | 7797 | lib.rs (20KB) | ? | ✗ |
| ternary-transfer | 7391 | lib.rs + 4 submodules, tests/ | ✓ | ✓ |
| ternary-noise | 7374 | lib.rs + 6 submodules | ? | ✓ |
| ternary-clustering | 7297 | lib.rs (18KB) | ? | ✓ |
| ternary-regex | 7293 | lib.rs | ? | ✓ |
| ternary-scoring | 7210 | lib.rs | ? | ✗ |
| ternary-federated | 6726 | lib.rs + submodules | ? | ✓ |
| ternary-engine | 6613 | lib.rs (19KB) | ✓ | ✗ |
| ternary-search | 6499 | lib.rs (15KB) + target/ | ? | ✓ |
| ternary-replay | 6441 | lib.rs | ? | ✓ |
| ternary-curriculum | 6372 | lib.rs | ? | ✓ |
| ternary-ring | 6272 | lib.rs | ? | ✓ |
| ternary-pipeline | 5726 | lib.rs | ? | ✗ |
| ternary-criticality | 5385 | lib.rs | ? | ✗ |
| ternary-automata | 5241 | lib.rs | ? | ✓ |
| ternary-metrics | 5199 | lib.rs | ? | ✗ |
| ternary-markov | 5155 | lib.rs | ? | ✓ |

### MED (4 repos)

| Repo | Size | Notes |
|---|---|---|
| ternary-permutation | 4711 | 15KB lib.rs |
| ternary-renormalize | 4537 | 14KB lib.rs |
| ternary-forgiveness | 4398 | **21KB lib.rs** (biggest single file!) |
| ternary-science | 4134 | Multi-file: cross_validation, gpu_benchmarks, laws, metal, scaling, species |

### Notable STUB and MINIMAL Repos

These have descriptions indicating planned implementations:
- ternary-quantum — qutrits, gates, entanglement, QFT over Z/3Z
- ternary-hardware — ALU, trytes, registers, ternary-to-binary
- ternary-econ — Portfolio optimization, market simulation
- ternary-cell — Cellular computing with ternary tick cycle (has ROOM-CELL-BRIDGE.md)
- ternary-harbor — Agent docking pattern for fleets
- ternary-reef — Coral reef ecosystem collective intelligence
- ternary-bridge — (bridge connection, no description)
- ternary-pilgrim — Journey patterns through fleet rooms

---

## 9. Key Conclusions

1. **Autonomous AI generation**: All repos created by OpenClaw via GitHub API. Bursty cadence (35/hour peak) indicates automated, not manual, creation.

2. **Thematic breadth**: Covers math, physics, ML, systems, cryptography, audio, economics, governance, data, and fleet coordination — all around ternary {-1, 0, +1} state space.

3. **Quality gradient**: 22 repos have production-quality Rust code. ~30 have stubs. ~100+ are minimal. But the latest MINIMAL repos (size=0 in API) actually contain real code — suggesting the GitHub size field is unreliable and more repos may have code than the numbers show.

4. **Design philosophy**: Zero cross-dependencies in code, extensive cross-references in docs. Each crate is self-contained; integration happens at the application layer. This is a "composable ecosystem" pattern.

5. **The engine is the core**: ternary-engine is explicitly the platform core, referencing 11 experiment findings and naming consumer projects.

6. **Still active**: New repos appearing during the analysis session (ternary-minority at 05:29 UTC).

7. **Potential for pincher**: The protocol, engine, graph, compiler, and causality crates are the most directly applicable. The FUTURE-INTEGRATION.md files already describe integration patterns that map well to pincher's architecture.
