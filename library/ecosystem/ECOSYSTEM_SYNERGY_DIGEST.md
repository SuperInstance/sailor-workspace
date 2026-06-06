# Ecosystem Synergy Blueprint Digest

**Generated:** 2026-06-05  
**Scope:** the-seed, Mycelium, seed-oscillate, Spreader-tool, neural-plato, egg, sunset-ecosystem, polln  
**Runtime Target:** Pincher (reflex runtime, `.nail` bundles, LLM-as-compiler)

---

## 1. the-seed — Self-Evolving Agent Bootstrap

**Nature:** ~500-line Cloudflare Worker that rewrites its own code from captain's intent. Starts as generic chat, evolves into any domain application via LLM-driven mutation loop (read → propose → validate → deploy → repeat).

**Integration Requirements:**
- Load as a **base reflex pack** via `pincher pack --repo`
- Seed's KV-stored **captain's log** (identity continuity) must map to Pincher's reflex registry
- Seed's **3-gate validation** (syntax → health → regression) becomes Pincher's bundle validation pipeline
- Seed produces **inline WASM code** → Pincher's LLM-as-compiler must accept seed-generated TypeScript
- **Bottleneck:** Single-goal-at-a-time processing — needs Spreader-tool for parallel intent queues

---

## 2. Mycelium — Distributed Agent Mesh & Seed Capture

**Nature:** Peer-to-peer networking mesh for agent-to-agent communication + demonstration-driven behavior capture. Agents record behaviors as "seeds" (compressed behavioral embeddings) and replay them deterministically. Plinko stochastic decision layer, overnight dreaming engine, and universal behavioral embedding space.

**Integration Requirements:**
- **Default inter-agent transport** for Pincher (replaces legacy I2I HTTP)
- NAT traversal for fleet agents behind firewalls — works with sunset-ecosystem's room-grid
- **Plinko decision layer** (Gumbel-Softmax stochastic selection) provides Polln's GC strategy for room diversity
- **Behavioral embeddings** in shared latent space → must integrate with the-seed's KV state and Spreader-tool's FCW snapshots
- **Overnight dreaming** (world model trainer + skill chunker + dreaming engine) consumes seed-oscillate's oscillation outputs for synthetic training
- Encryption layer must satisfy egg's sandbox security guarantees
- **Security concern (from synthesis):** Privacy claims need differential privacy params + gradient attack mitigation

---

## 3. seed-oscillate — Creative↔Deduction Oscillation Pipeline

**Nature:** 5-cycle oscillation where Seed-2.0-mini reads metaphor literature → extracts mathematical invariants → generates new literature → finds deeper invariants → writes challenge → produces falsifiable hard propositions.

**Integration Requirements:**
- Builds to **WASM** via Pincher's LLM-as-compiler pipeline
- Loaded as **lightweight reflexes** for real-time sensor fusion on edge devices (Raspberry Pi, Jetson)
- Oscillation outputs (5 markdown files per cycle) → feed into Mycelium's overnight dreaming as synthetic training data
- Invariants extracted must pass **Spreader-tool's seed validation gates** (candidate → validating → locked)
- **Shell loading** via `plato_shell_bridge.PlatoShell` — standardizes loading into Pincher / neural-plato / egg environments
- **Critical path:** Synthesis step (cycle 5) produces falsifiable equations → neural-plato's Fortran kernels can verify numerically

---

## 4. Spreader-tool — Intelligence Tiling & Deadband Detection

**Nature:** Monitors PLATO rooms for deadband (gap between hardcoded rules and needed intelligence). Freezes reasoning snapshots (FCWs), validates, and locks proven-good Seeds for fleet-wide deployment. 241 tests, zero dependencies.

**Integration Requirements:**
- Pincher agents use Spreader to **offload work across the fleet** — tasks serialized as batons
- **Deadband detector** (4 metric thresholds with hysteresis) monitors KPI streams → must integrate with Polln's confidence-cascade zone model (GREEN/YELLOW/RED)
- FCW lifecycle (STAGING → FROZEN → TESTING → REFINING → LOCKED) maps to the-seed's 3-gate validation → they should share a unified pipeline
- Seed lifecycle (UNLOCKED → CANDIDATE → VALIDATING → LOCK_PENDING → LOCKED → DEPRECATED → ARCHIVED) → Mycelium seeds must register through this pipeline
- **Cost tracking + redaction** module prunes low-value FCWs → anti-bloat for sunset-ecosystem's 2000+ test WAL
- Self-optimization harness monitors its own test suite → integration target for Polln's Shannon Diversity tracking

---

## 5. neural-plato — Fortran+Rust Computational Primitives

**Nature:** Fortran 2008 kernels (sparse memory, forgetting curves, Eisenstein lattice snap, Tucker decomposition, negative space) wrapped in Rust FFI. Underlying the PLATO neural training pipeline.

**Integration Requirements:**
- Pincher acts as the **modern execution layer** for Plato-trained reflexes
- Background daemon syncs training data to local `reflexes.db`
- **Bayesian updating** matches Pincher's confidence feedback loop
- Fortran kernels must compile to **WASM** for edge deployment (seed-oscillate target)
- **sparse_memory.f90** (UltraMem-style virtual tables) → powers Mycelium's behavioral embedding lookup
- **amnesia_curve.f90** (forgetting curves) → feeds Spreader-tool's redaction engine (what to prune based on decay)
- **negative_space.f90** (shadow reconstruction from absent constraints) → Polln's adversarial diagnostics
- **Bottleneck:** gfortran + Rust build chain is heavy for CI — needs proper caching (like sunset-ecosystem's CI pipeline)

---

## 6. egg — Agent Sandbox & Isolation

**Nature:** Lightweight sandboxing with Yolk + Shell + SelectionChannels + Virus — generational formula, three-speed adaptation.

**Integration Requirements:**
- Merges with Pincher's existing **veto + bwrap/landlock** sandbox into a **hardened two-layer** system
- Runs untrusted / community-contributed agents safely
- **Three-speed adaptation** (fast/medium/slow) maps to Mycelium's overnight dreaming cycles (fast = in-loop, medium = overnight, slow = weekly)
- Loadable via `plato_shell_bridge` — same loading pathway as seed-oscillate, Spreader-tool
- Must sign all **.nail bundles** before execution — integration target for the-seed's auto-deployment

---

## 7. sunset-ecosystem — Legacy Agent Runtime (Predecessor)

**Nature:** Mature fleet runtime (~2000+ tests, Trinity architecture, BreederDaemonV2 with thermal scheduling, FLUX constraint gating, FleetConductorV2, signed WAL, SSE dashboards). Runs agent lifecycle FSM: EGG → COMPETE → SURVIVE → BREED → SUNSET → ARCHIVE.

**Integration Requirements:**
- **Drop-in replacement target** for Pincher — zero code changes for existing sunset agents
- Automatic migration tooling: `.sun → .nail` bundle conversion
- Sunset's **FleetWAL + KnowledgePipeline** = persistence layer; must be consumed by Pincher's reflex registry
- **BreederDaemonV2** (thermal scheduling, diversity-aware parent selection, crossover/mutation) → evolution engine that the-seed's overnight loop can leverage
- **FLUX gating** (Path A Python + Path B VM) → maps to Pincher's LLM-as-compiler dual-path (interpreted vs compiled)
- **2065 passing tests across 20+ modules** = integration test suite for Pincher compatibility
- **Nexus (fleet memory + WAL)** must map to the-seed's KV state for identity continuity across generations
- **Dispatcher router** with Two-Minute Test → merge with Spreader-tool's deadband detection for dispatch decisions

---

## 8. polln — Pattern-Organized LLM Network (Tile System)

**Nature:** 945-file TypeScript colony intelligence with tile-based composable AI, confidence cascade (GREEN/YELLOW/RED three-zone model), Plinko decision layer, stigmergic coordination, memory hierarchy (L1-L4). Category theory foundations with formal proofs.

**Integration Requirements:**
- **Confidence cascade** (sequential multiply, parallel average, weighted sum) = the mathematical layer Spreader-tool's deadband needs for zone-aware gating
- **Three-zone model** (GREEN ≥0.90 auto, YELLOW 0.75-0.89 human review, RED <0.75 stop) → universal decision framework across all 7 other projects
- **Plinko/Gumbel-Softmax** = GC strategy for Mycelium's room diversity (prevents monoculture)
- **Tile algebra** (category theory composition) → formal verification layer for the-seed's mutations
- **Stigmergy** (virtual pheromones) = bio-inspired coordination for Spreader-tool's work queues
- **Memory hierarchy (L1-L4)** = caching strategy for neural-plato's sparse memory kernels
- **Extraction needed:** Plinko layer as standalone `CellGcStrategy` trait + TypeScript visualization bridge to Rust ternary-cell via WebSocket
- **8 core components needed:** TaskAgent, RoleAgent, CoreAgent + Tile Succession Protocol + Shannon Diversity Index + Knowledge Stages → map to sunset-ecosystem's agent lifecycle FSM

---

## Cross-Cutting Integration Map

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          ECOSYSTEM INTEGRATION MAP                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  the-seed ──(seeds)──▶ Spreader-tool ──(locked seeds)──▶ Mycelium          │
│     │                      │                              │                │
│     │ (evolution loop)    │ (FCW snapshots)              │ (transport)    │
│     ▼                      ▼                              ▼                │
│  seed-oscillate ◀─── neural-plato ────(Fortran kernels)───▶ polln           │
│     │                      │                              │                │
│     │ (WASM reflexes)     │ (sparse memory)              │ (confidence)   │
│     ▼                      ▼                              ▼                │
│  sunset-ecosystem ◀─── Pincher Runtime ───(sandbox)───▶ egg                │
│     (migration)           │                              │                 │
│                           └──────────(.nail bundles)──────┘                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Top Integration Priorities (Ordered)

| Priority | Integration | Why |
|----------|------------|-----|
| **P1** | Mycelium ↔ Pincher (transport) | Unlocks all fleet communication |
| **P2** | Spreader-tool ↔ Polln (confidence zones) | Deadband detection needs zone-aware thresholds |
| **P3** | the-seed ↔ Spreader-tool (seed pipeline) | Unifies evolution + validation into one lifecycle |
| **P4** | sunset-ecosystem → Pincher migration | Legacy fleet must be carried forward |
| **P5** | neural-plato → WASM (edge compile) | Enables seed-oscillate on edge devices |
| **P6** | egg ↔ Pincher sandbox merge | Hardens security for community contributions |
| **P7** | polln Plinko → Mycelium GC strategy | Prevents fleet monoculture |

---

*Part of the SuperInstance / Cocapn Fleet — lighthouse keeper architecture*
