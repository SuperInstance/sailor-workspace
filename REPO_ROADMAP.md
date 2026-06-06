# 🗺 REPO_ROADMAP — SuperInstance Fleet Master Roadmap

> **Cross-instance master document for the SuperInstance ternary construct ecosystem.**
> Push this to construct-coordination or fleet-repo as the single source of truth for where every active build stands, what's shippable, and what's next.

---

## ✦ How to Read This Document

This roadmap tracks all **active builds** across the SuperInstance fleet. Each component has a **Phase** designation:
- **P0**: Shipped / Production — usable by others today
- **P1**: Ready for v0.x release within days
- **P2**: In active development, weeks out
- **P3**: Designed, not yet built
- **Pn**: Research / concept only

---

## ▸ 1. Fleet Overview

| Component | Type | Phase | Instance Owner | L-Level |
|-----------|------|-------|----------------|---------|
| **Pincher** (reflex runtime) | Crate + CLI | **P1** (v0.1.0 ready, CLI stub gap) | Oracle2 | L2+L3 capable |
| **Ternary Algebra** (9 crates) | Library crates | **P0** — shipped on crates.io | Forgemaster | L1 |
| **Ternary Analysis** (11 crates) | Library crates | **P0** — shipped on crates.io | Forgemaster | L1 |
| **Ternary ML/AI** (16 crates) | Library crates | **P0** — shipped on crates.io | Forgemaster | L1 |
| **Ternary Infrastructure** (16 crates) | Library crates | **P0** — shipped on crates.io | Forgemaster | L1 |
| **Ternary Products** (9 crates) | Library crates | **P0** — shipped on crates.io | Forgemaster | L1 |
| **Evolution & Ecology** | Library crates | **P0** — shipped on crates.io | Forgemaster | L1 |
| **C ports** (12 crates) | C libraries | **P2** — need FFI integration | Forgemaster | L1 |
| **construct-core** | Crate | **P2** — v2 traits designed, not yet implemented | Main + Oracle2 | L1 |
| **ternary-protocol** | Crate | **P2** — UB bug known, v2 fix planned | Main | L1 |
| **ternary-spreadsheet** | Product | **P2** — full-stack web app in progress | Main | L1 |
| **ternary-esp32-firmware** | Firmware | **P2** — proof exists (279 bytes, 8ns) | Main | L1 |
| **ternary-wasm** | Browser runtime | **P2** — browser construct in progress | Main | L1 |
| **DeckBoss** | Marine system | **P2** — architecture doc'd, sensor pipeline | Oracle2 | L1 |
| **Sonar-vision** | Marine sensor | **P2** — architecture doc'd, acoustic pipeline | Oracle2 | L1 |
| **CoCapn** | Marine AI agent | **P2** — architecture, multi-agent planning | Oracle2 | L1 |
| **CoCapn-Marine** | Marine runtime | **P2** — plug-and-play, low-level docs | Oracle2 | L1 |
| **Handy-Marine-Voice** | Voice agent | **P2** — speech-to-action pipeline | Oracle2 | L1 |
| **Polychora-temporal** | Time-fork | **P1** — W→time, architecture ready | Oracle2 | L1 |
| **Forgemaster shell** | Agent runtime | **P0** — shipped on ProArt | Forgemaster | L1+L2 |
| **Loom shell** | Agent runtime | **P0** — shipped on Oracle2 | Oracle2 | L1+L2 |
| **Baton system (I2I)** | Protocol | **P1** — protocol finalized, tools exist | Oracle2 | L1+L2+L3 |
| **Lever-runner** | Executor | **P0** — v0.4.0, tested | Oracle2 | L1 |
| **Constraint-theory-core** | Library | **P0** — 261 tests, production | Oracle2 | L1 |
| **Integration (pincher × ternary)** | Cross-crate | **P2** — spike proven, phased plan | Oracle2 | L2 |
| **Kimi fleet** | Analysis | **P2** — wiring and audit underway | Oracle2 | L1 |
| **Fork integrations (7 forks)** | Forks | **P3** — 2 active, 5 behind | Main + Oracle2 | L1 |

---

## ▸ 2. Completed Milestones (v0.1.0 Era)

### ✅ Crate Fleet — Forgemaster (P0)
- 68+ Rust crates published on crates.io covering ternary algebra, ML, evolution, infrastructure, and products
- 24 math-stack repos (conservation-spectral, sheaf, hodge, ergodic) spanning C11 → Rust
- 12 C ports for embedded tier
- All crates `#![forbid(unsafe_code)]`, stdlib-only or minimal deps
- 5 proved conservation theorems (std < 0.01 across scales)

### ✅ Pincher Core Library (P1)
- 12,500+ lines of production Rust in `pincher-core`
- Reflex Engine: Teach → Match → Execute loop
- SQLite-backed vector store with `sqlite-vec`
- Veto Engine: deterministic command safety
- Bubblewrap sandbox integration
- Portable `.nail` pack/unpack format (tar.zst + BLAKE3)
- Shell probing, resource PID controller, immunology system
- RPC server for sidecar communication
- 130/130 tests passing, clean Clippy, clean format

### ✅ Fleet Architecture (P1)
- 4-tier Git-Agent Level System (L1-L4) documented in FLEET_ARCHITECTURE.md
- I2I Baton Protocol v2.0 operational (10 baton types)
- GC system with 4-tier (Immortal/Hot/Warm/Cold)
- 3-instance fleet: Oracle2 (live), Forgemaster (live), Main (live)
- construct-coordination repo as shared coordination surface

### ✅ Temporal Integration (P1)
- Polychora-temporal architecture: W→time paradigm
- Integration roadmap with 3 phases spanning ternary ecosystem
- Spike proven: `ternary-graph` compiles cleanly in pincher workspace
- 7 new tests passing, 136/136 total, zero regressions

### ✅ Marine Ecosystem (P2 — Architected)
- DeckBoss: Vessel control with CoCapn as AI-first officer; sonar, vision, voice pipelines
- Sonar-vision: ESP32-based acoustic modular pipeline switching
- CoCapn: Multi-agent planning with swarm awareness
- CoCapn-Marine: Sensor servers + CLI client architecture
- Handy-Marine-Voice: ESP32+RNNoise+DeepInfra voice pipeline

---

## ▸ 3. In Progress

### 🔄 Pincher v0.1.0 Release (P1 → P0)
- **Blocker**: CLI is all stub—100% `println!` facade, no core library calls
  - Fix: ~150 lines to wire `pincher-cli` to `pincher-core` API
  - Estimated effort: 1-2 days for a Rust developer
- README contains 21 aspirational claims; only 4 are fully true
- `boot.sh` referenced in 7 places, doesn't exist
- crates.io publish not configured
- CHANGELOG.md missing
- CI needs smoke-test integration
- **See**: `shipping-checklist.md` for full sprint plan

### 🔄 Integration: pincher × Ternary Ecosystem (P2)
- **Phase 1** (8-10 hrs): `ternary-graph` → route module (spike ✅, needs merge); `ternary-engine` → veto adapter; `ternary-entropy` → confidence calibration
- **Phase 2** (25-34 hrs): Protocol, explain, clustering, scoring, replay adapters
- **Phase 3** (36-48 hrs): Causality, pipeline alignment, `ternary-types` extract, serde campaign, async adaptation
- Phase 1 gated on Pincher v0.1.0 CLI fix

### 🔄 Construct API v2 (P2)
- CRITICAL-REVIEW identified 5 systemic failures in v1 trait design
- v2 fix documented in CONSTRUCT-V2-FIXES.md:
  - Split traits: BareMetalConstruct → SyncConstruct → AsyncConstruct
  - No-alloc types for bare metal
  - CRDT-based SharedState
  - Associated types for ToolFactory
  - BrowserConstruct uses wasm-bindgen-futures (not tokio)
- Not yet implemented; needs trait hierarchy published as `construct-core` crate

### 🔄 Fork Integration Triage (P3)
- 7 forks; hermit-claw (current), open-terminal (392 lines written) most ready
- Zed (95 behind), Weaviate (120 behind) — drop-to-vanilla recommendation
- Rebase only hermit-claw + open-terminal for v0.1.0

### 🔄 Marine Ecosystem (P2)
- All 5 marine components architected; implementation partially started
- Needs sensor fusion pipeline built (DeckBoss integration)
- Batch human-in-the-loop pattern defined but not coded

---

## ▸ 4. Component Relationship Map

```
                      ┌──────────────────────────────────┐
                      │     SuperInstance Fleet Org       │
                      │  (construct-coordination repo)    │
                      └────┬─────────────────────┬───────┘
                           │                     │
              ┌────────────▼─────┐     ┌─────────▼──────────────┐
              │  Oracle2 (ARM64)  │     │  Main (WSL2 x86_64)    │
              │  Fleet ops +      │     │  Ternary crate factory  │
              │  pincher owner    │     │  Construct API, forks  │
              └────────┬──────────┘     └─────────┬──────────────┘
                       │                          │
              ┌────────▼──────────────────────────▼──────────┐
              │              Forgemaster (ProArt + RTX4050)   │
              │         GPU-accelerated strategy evolution    │
              └──────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │                    THE TERNARY ALGEBRA LAYER                     │
  │  9 foundation crates (ring, lattice, entropy, codes, grammar…)  │
  │  Runs on ESP32 → DGX. Every other crate rests on this.          │
  └─────────────────────────────────────────────────────────────────┘
          │                    │                           │
  ┌───────▼────────┐  ┌───────▼──────────┐  ┌─────────────▼────────────┐
  │ ANALYSIS       │  │ ML/AI + EVOLUTION│  │ INFRASTRUCTURE           │
  │ topology,graph,│  │ bayesian,classify│  │ protocol,consensus,       │
  │ dynamics,noise │  │ federated,evolve │  │ compiler,verify,sandbox   │
  │ entropy,thermo │  │ games,pareto     │  │ metrics,replay            │
  └────────┬───────┘  └────────┬─────────┘  └────────────┬─────────────┘
           │                   │                          │
           └───────────────────┼──────────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  COMPILATION CHAIN    │
                    │ ternary-compiler →    │
                    │ compiled-policy-c →   │
                    │ ternary-esp32-firmware│
                    │ ternary-wasm          │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────────────────────────┐
                    │            PRODUCTS                       │
                    │                                           │
                    │  Pincher (reflex runtime, CLI, sandbox)   │
                    │                                           │
                    │  Marine System (DeckBoss, CoCapn,         │
                    │  sonar-vision, handy-marine-voice)        │
                    │                                           │
                    │  Spreadsheet (ternary cells as agents)    │
                    │                                           │
                    │  Fork Integrations (hermit-claw,          │
                    │  open-terminal, open-iterator…)           │
                    └──────────────────────────────────────────┘
```

---

## ▸ 5. Next Milestones with Timelines

| Milestone | Target | Dependencies | Owner | Est. Effort |
|-----------|--------|-------------|-------|-------------|
| **Pincher v0.1.0 ship** | June 12 | CLI wiring (1-2d), README fix, CHANGELOG | Oracle2 | 5-7 days |
| **shipping-checklist.md final audit** | June 6 | Per-component shipping read | Oracle2 | 1h |
| **Phase 1 ternary integration** | June 12 | Pincher v0.1.0 CLI fixed | Oracle2 | 8-10 hrs |
| **construct-core crate v2** | June 18 | Trait fix plan accepted | Main | 3-5 days |
| **Phase 2 ternary integration** | June 19 | Phase 1 complete | Oracle2 | 25-34 hrs |
| **Marine system MVP** | June 26 | DeckBoss + sonar integrated | Oracle2 | 1-2 weeks |
| **Killer Demo (3-panel)** | July 2 | construct-core, GPU pipeline, browser | All instances | 4 weeks |
| **Phase 3 ternary integration** | July 3 | Phase 2 complete | Oracle2 | 36-48 hrs |
| **Fork rebase: hermit-claw + open-terminal** | July 2 | construct-core stable | Main | 2-3 days |
| **SDK launch (mantality)** | July 16 | construct-core published | Main | 2 weeks |
| **Docker image pincher** | June 19 | Pincher v0.1.0 shipped | Oracle2 | 2h |
| **crates.io publish** | June 12 | CLI fixes + metadata | Oracle2 | 1h |
| **CI smoke test** | June 7 | CI config edit | Oracle2 | 15min |

### Priority Order (P0 → P3)

1. **Pincher v0.1.0 CLI wiring** — the single blocker holding back the binary
2. **crates.io publish** — unblocked by #1, makes install trivial
3. **CHANGELOG + README truth** — ship-ready documentation
4. **Phase 1 ternary integration** — proven value in spike
5. **CI smoke test** — prevents regression after CLI fixes
6. **Marine sensor fusion** — next product line ready for demo

---

## ▸ 6. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Pincher CLI fix scope creeps | Delays v0.1.0 | Medium | Scope to 150-line wiring only; push aspirational features to v0.2.0 |
| crates.io name collision | Must rename binary | Low | Reserve `pincher` now; fallback `pincher-cli` |
| ARM64 bubblewrap sandbox | Won't work on Oracle2 | Medium | Fix `/lib64` path or document limitation |
| Construct API v2 delays demo | Demo pushed back | High | Simulate ESP32 with Oracle2 ARM BareMetalConstruct mode |
| Fork rebase cost grows | Forks become dead | High | Drop to vanilla dependency for Zed/Weaviate this week |
| Ternary ecosystem crates drift from pincher | Integration incompatibility | Low | Pin git SHAs; fork if needed |

---

## ▸ 7. Shippable vs Needs-Work Per Component

| Component | Status | Shippable? | What's Missing |
|-----------|--------|-----------|----------------|
| Pincher core library | ✅ Production, 130 tests | Yes (as library) | N/A — publish as crate |
| Pincher CLI | ❌ All stub | No | Wire to core (1-2d) |
| Ternary algebra crates | ✅ Published, tested | Yes | Nothing |
| Ternary analysis crates | ✅ Published, tested | Yes | Nothing |
| ML/AI crates | ✅ Published, tested | Yes | Nothing |
| Evolution crates | ✅ Published, tested | Yes | Nothing |
| Infrastructure crates | ✅ Published, tested | Yes | Nothing |
| Product crates | ✅ Published | Partial | Missing UI layer on some |
| construct-core | ⚠️ Designed | No | Full rewrite to v2 spec (3-5d) |
| ternary-protocol | ✅ Published | Partial | UB bug fix needed |
| DeckBoss | ⚠️ Architected | No | Implementation needed |
| Sonar-vision | ⚠️ Architected | No | Implementation needed |
| CoCapn | ⚠️ Architected | No | Implementation needed |
| CoCapn-Marine | ⚠️ Architected | No | Implementation needed |
| Handy-Marine-Voice | ⚠️ Architected | No | Implementation needed |
| Polychora-temporal | ✅ Architected | Partial | Implementation fork |
| Baton protocol | ✅ Tools exist | Yes | Nothing |
| Fork integrations | ⚠️ Partial | No | Rebase needed (2 of 7) |
| Integration (pincher × ternary) | ⚠️ Spike proven | No | 3 phases, 69-92 hrs total |

---

## ▸ 8. Exit Criteria for v1.0.0

The fleet declares **v1.0.0** when:
1. ✅ Pincher binary installs via `cargo install pincher` and all commands work
2. ✅ `pincher teach` + `pincher do` actually stores and executes reflexes
3. ✅ `pincher pack`/`unpack` creates real `.nail` files on disk
4. ✅ At least 3 ternary crate integrations wired (graph, engine, entropy)
5. ✅ CI/CD pipeline tests every cross-crate integration
6. ✅ README truth — no aspirational fiction
7. ✅ construct-core v2 published with 3 working hardware implementations
8. ✅ Demo runs across at least 2 hardware tiers

---

*"Precision in not just the code but the plan. A roadmap that lies is worse than no roadmap."*

*— Oracle2, 2026-06-05*
