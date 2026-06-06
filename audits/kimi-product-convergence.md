# Kimi Product Convergence: The Construct — Unified Product Vision

**Synthesis Date:** 2026-06-06  
**Source Documents (9):** THE-UNIFIED-PRODUCT.md, CONVERGENCE-MAP.md, MASTER-INTEGRATION-INDEX.md, PRODUCT-CONVERGION.md, THE-UNIFIED-ARENA.md, TEN-FORWARD.md, RIGGING-INTERACTION-SPEC.md, HOLODECK-SPEC.md, SMP-SPEC.md

---

## Table of Contents

1. [What Is "The Construct" and What Is It Building?](#1-what-is-the-construct-and-what-is-it-building)
2. [Product Roadmap & Phases](#2-product-roadmap--phases)
3. [How All the Pieces Fit Together](#3-how-all-the-pieces-fit-together)
4. [What Is Ten Forward?](#4-what-is-ten-forward)
5. [Unified Arena vs. Unified Product — The Distinction](#5-unified-arena-vs-unified-product--the-distinction)
6. [Appendix: Key Numbers](#6-appendix-key-numbers)

---

## 1. What Is "The Construct" and What Is It Building?

### 1.1 Identity: The Construct

"The Construct" is the name for the unified system being engineered from what was once seven separate repositories and 158+ (now 195+) Rust crates — the **ternary fleet**. It is a **GPU-powered educational simulation platform** with three interlocking products, unified by a common substrate: ternary physics, Seeded-Model-Programming (SMP) seeds, conservation laws, and the living spreadsheet interface.

The Construct is not a single application. It is a **three-product architecture** built on a shared engine:

| Product | Metaphor | Target Audience | Purpose |
|---------|----------|----------------|---------|
| **Claw** | The Engine | Developers, researchers, data scientists | GPU-accelerated execution backbone running 10K+ agents at 400K ops/s |
| **AI-Pasture** | The Application | Kids ages 8-14, teachers, homeschoolers | Educational farming game teaching real ecology, genetics, economics, conservation |
| **The Living Spreadsheet** | The Interface | Developers, data scientists, AI-Pasture players | A new form of programming where cells are alive — they predict, conserve, evolve, and compete |

### 1.2 What Is It Building?

The Construct is building **a new form of computation** grounded in ternary values ({-1, 0, +1}), conservation laws (γ + H ≈ 1.283 - 0.159·log(V)), and the insight that **you can't create something from nothing**.

Specifically, it is building:

1. **A GPU execution engine** (Claw) that makes ternary computation fast enough for real-time interaction — 10,000 agents at sub-10ms latency.

2. **An educational game** (AI-Pasture) where kids discover real science through play — not worksheets with mascots, but actual simulations running real ternary crates.

3. **A living spreadsheet** that replaces passive formulas with active agents — cells that predict, feel surprise, conserve energy, evolve strategies, and compete in multi-intelligence arenas.

4. **A protocol for agent identity** (SMP seeds) — compact binary artifacts (256 bytes - 4 KB) that determine how an agent reasons, independently of its model weights or prompts.

5. **A spatial coordination layer** (the Holodeck MUD) — an optional text-based MUD that maps ternary rooms to a navigable spaceship topology (Bridge, Engine Room, Ten Forward, Sickbay, etc.).

6. **An endless conversation engine** (Ten Forward) — AI agents having simultaneous, non-turn-based conversations with Fibonacci rhythm and Z₃ cyclic governance.

7. **An interactive exploration system** (Rigging) — grab any value in the spreadsheet and shake it, watching ripples propagate through conservation laws, fitness landscapes, and strategy ecologies.

### 1.3 The Core Thesis

> Three products. One engine. The ternary fleet's 158+ crates power a GPU execution engine, an educational game, and a new form of programming — all connected by conservation laws, SMP seeds, and the insight that you can't create something from nothing.

**Conservation is the physics engine.** The law (γ + H ≈ 1.283 - 0.159·log(V)) enforces balance across all three products. Without it, the spreadsheet is just numbers, the game is just clicking, and the GPU is just computation. With it, the spreadsheet has physics, the game has constraints, and the GPU has meaning.

---

## 2. Product Roadmap & Phases

The roadmap is documented in two complementary timelines: the **Unified Product roadmap** (months 1-20 across all three products) and the **Convergence Map migration** (weeks 1-16 across seven repos to ternary fleet).

### 2.1 Unified Product Roadmap (Months 1-20)

From THE-UNIFIED-PRODUCT.md (§9), the five-phase roadmap:

#### Phase 1: Foundation (Months 1-4)
| Product | Key Deliverables |
|---------|-----------------|
| **Claw** | Core GPU bridge for ternary-cell tick cycles, conservation checker on GPU, basic muscle fiber assignments, 10K agent benchmarking |
| **AI-Pasture** | Core game loop (plant → grow → harvest), basic spreadsheet dashboard, one NPC advisor (Old Farmer Jeb), Minecraft-like tutorial levels |
| **Living Spreadsheet** | Cell grid with ternary agents, basic rigging (single-value oscillation), conservation gauge, SMP seed loading |

#### Phase 2: Systems (Months 5-8)
| Product | Key Deliverables |
|---------|-----------------|
| **Claw** | Rigging propagation on GPU, SMP seed distribution per warp, arena tournament kernel, evolution step kernel |
| **AI-Pasture** | Ecosystem food web, breeding & evolution, weather system, conservation enforcement, three more NPC advisors |
| **Living Spreadsheet** | Group & cascade oscillation, stochastic flavor exploration, multi-intelligence arena, dynamic axis selection |

#### Phase 3: Integration (Months 9-12)
| Product | Key Deliverables |
|---------|-----------------|
| **Claw** | Full ternary fleet integration (20+ crates on GPU), ML feedback loop, Ramify engine, multi-GPU support |
| **AI-Pasture** | Multiplayer arena, market economics, complete 7-level learning arc, teacher dashboard, classroom mode |
| **Living Spreadsheet** | Vector gravity visualization, tensor logic interface, Pincher connection (vectorDB as program store), Git-agent captain system |

#### Phase 4: Polish (Months 13-16)
- Full product integration (Spreadsheet ↔ Claw ↔ AI-Pasture)
- Browser deployment via WASM + WebGPU
- Mobile support (iOS/Android)
- Accessibility, documentation, tutorials, performance optimization, security audit, beta testing

#### Phase 5: Launch (Months 17-20)
- Open source Claw
- AI-Pasture public beta
- Living Spreadsheet developer preview
- Marketing, community building, conference presentations, academic partnerships

### 2.2 Convergence Map Migration (Weeks 1-16)

From CONVERGENCE-MAP.md (§9), the migration of seven legacy repos to the ternary fleet:

| Phase | Weeks | Focus | Key Deliverable |
|-------|-------|-------|-----------------|
| **1: Substrate** | 1-2 | lau-memory-arena + allocator-rs | Arena<TernaryCell> runs on CPU and GPU |
| **2: Physics** | 3-4 | ternary-cell, ternary-room, ternary-current, conservation-verify, ternary-fitness | Cells tick, propagate signals, enforce conservation, compute fitness |
| **3: Evolution** | 5-6 | ternary-evolution, ternary-genome, ternary-ecosystem, ternary-games | Cell populations evolve, species compete, fitness drives selection |
| **4: World** | 7-8 | MUD world in ternary-room graph | MUD world runs on ternary engine with lau-memory-arena substrate |
| **5: Agents** | 9-10 | ZeroClaw CHARTER→seed, Brain→inference, SKILLS.md→vectorDB | Agents load from CHARTER, run with seeds, accumulate knowledge, evolve |
| **6: Trust** | 11-12 | DogMind trust→ternary signal, breeding→genome crossover, traits→seed params | Agents build trust, breed offspring, inherit traits |
| **7: Analytics** | 13-14 | ELO→fitness, PolicySnapshot→seed versioning, Archetype→species, Curriculum→ecosystem | Full analytics pipeline feeding back into evolution |
| **8: Interface** | 15-16 | Living spreadsheet UI, piano roll, =EVOLVE()/=BATTLE()/=TRUST()/=BREED() formulas, MIDI export | The killer demo |

**Critical path:** allocator-rs → lau-memory-arena → ternary-cell → ternary-evolution → MUD World → Agents → Spreadsheet

### 2.3 Master Integration Index: Top 10 Implementation Priorities

From MASTER-INTEGRATION-INDEX.md (§4), ranked by downstream unlocks:

| Priority | Crate | Unlocks | Key Subtask |
|----------|-------|---------|-------------|
| 1 | ternary-cell | 113 integrations | Production-harden six-phase tick cycle |
| 2 | construct-core | 64 integrations | Implement Layer 0/1/2 trait system |
| 3 | ternary-protocol | 49 integrations | Freeze wire format, define all 20+ message types |
| 4 | ternary-room | 16 integrations | CellGrid composition with room structure |
| 5 | conservation-matrix | 18 integrations | Fleet-wide conservation enforcement |
| 6 | ternary-spreadsheet | 13 integrations | Replace static Cell with TernaryCell |
| 7 | strategy-ecology | 14 integrations | 5-species classification |
| 8 | ternary-registry | 15 integrations | Dynamic skill loading/unloading |
| 9 | forgemaster | 11 integrations | GPU dispatch (CUDA/OpenCL/NEON) |
| 10 | avoidance-cascade | 9 integrations | Prevent cell population monocultures |

**Key insight:** The "holy trinity" — ternary-cell (113 refs), construct-core (64 refs), ternary-protocol (49 refs) — accounts for 28% of all ~800 dependency edges in the fleet.

---

## 3. How All the Pieces Fit Together

### 3.1 The Layered Architecture

From THE-UNIFIED-PRODUCT.md (§7) and PRODUCT-CONVERGION.md ("The Convergion"):

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE UNIFIED STACK                             │
│                                                                      │
│   LAYER 3: TEN-FORWARD (Endless Podcast Engine)                      │
│   Conversations as simultaneous jazz — agents predict, fire, correct  │
│                                                                      │
│   LAYER 2: PLATO / LIVING SPREADSHEET (The Interface)                │
│   Every cell is a room. Every room is a spreadsheet. Recursive.      │
│                                                                      │
│   LAYER 1: TERNARY STUDIO (The DAW for Thought)                       │
│   Rack/module/signal-chain. Every crate is a plugin module.          │
│                                                                      │
│   LAYER 0: TERNARY FLEET + CUDA CLAW (The Metal)                     │
│   195+ crates • 3 bytes/agent • ~940M ticks/sec • Z₃ physics        │
└─────────────────────────────────────────────────────────────────────┘
```

The **convergion principle**: Every product is the same product at a different zoom level.

| Zoom Level | You See | You Do |
|------------|---------|--------|
| Out (Ten Forward) | Conversations as podcasts | Listen, inject topics, add speakers |
| Middle (PLATO/Spreadsheet) | Conversations as spreadsheets | Edit formulas, zoom into cells, remix |
| In (Ternary Studio) | Conversations as racks | Patch modules, adjust parameters |
| Deepest (Fleet) | Conversations as ternary physics | Run experiments, verify conservation |

### 3.2 Component Relationships

#### The Data Flow

From THE-UNIFIED-ARENA.md (§8):

```
                         ┌──────────────┐
                         │  Program     │
                         │  Store       │
                         │  (Weaviate)  │
                         └──────┬───────┘
                                │ seed retrieval
                                ▼
 ┌──────────┐          ┌──────────────┐           ┌──────────────┐
 │  Human   │──intent─►│  SMP Harness │──seed────►│  Ternary     │
 │  User    │          │  (control)   │           │  Cell        │
 └──────────┘          └──────┬───────┘           └──────┬───────┘
                              │                          │
                    conservation │              tick cycle │
                    enforcement  │              (predict → │
                              │              perceive →   │
                              ▼              surprise →   │
                       ┌──────────────┐      vibe → gc →  │
                       │  Claw    │      conservation) │
                       │  (GPU/CPU)   │◄─────────────────┘
                       └──────┬───────┘
                              │
                    results stream │
                              ▼
                       ┌──────────────┐
                       │  Combat      │
                       │  Analyst     │
                       │  (fitness,   │
                       │   ELO,       │
                       │   species)   │
                       └──────┬───────┘
                              │
                    analytics │
                              ▼
                       ┌──────────────┐
                       │  Living      │
                       │  Spreadsheet │
                       │  (UI)        │
                       └──────────────┘
```

#### SMP Seeds: The Universal Protocol

From THE-UNIFIED-ARENA.md (§4) and SMP-SPEC.md:

Every entity in the system is represented by an SMP seed — a compact binary artifact with three sections: **strategy vector** (behavioral disposition), **ternary weights** (what to promote/suppress), and **conservation parameters** (thermodynamic profile).

| Entity | Source | SMP Seed Component |
|--------|--------|-------------------|
| CHARTER (agent identity) | zeroclaw-crew | Strategy vector |
| Brain (decision logic) | zeroclaw-crew | Inference function |
| CompiledPolicy (strategy) | zeroclaw-arena | Complete seed |
| Room topology | mud-arena | Ternary weights |
| Trust value | dogmind-arena | Conservation parameter |
| Inherited traits | dogmind-arena | Strategy vector elements |
| ELO rating | arena-combat-analyst | Conservation parameter |
| Strategy species | - | Derived from strategy vector |
| Arena slot | lau-memory-arena | Seed handle (ArenaId) |

#### Rigging: Interactive Exploration

From RIGGING-INTERACTION-SPEC.md:

Rigging is **the user interaction model** for the Living Spreadsheet. User grabs a cell, oscillates its value, and watches:

1. **Ripple propagation** through the dependency graph (shows topology)
2. **Conservation enforcement** — compensating cells flash (shows physics)
3. **Fitness landscape deformation** — 3D surface reshapes (shows optimization)
4. **Species redistribution** — strategy ecology shifts (shows dynamics)

Oscillation modes: single-value, group (in-phase/anti-phase/traveling-wave/standing-wave/random-phase), cascade (perturb and release).

#### The Holodeck: Spatial Coordination

From HOLODECK-SPEC.md:

The Holodeck is an **optional** text-based MUD that provides spatial abstraction for the ternary fleet. Room types include:

| Room | ID Range | Purpose |
|------|----------|---------|
| Bridge | 1000-1099 | Fleet command (Captain only) |
| Engine Room | 2000-2099 | Sensor monitoring, anomaly detection |
| Dojo | 3000-3099 | Training challenges |
| Ten Forward | 4000-4099 | Social mixing, knowledge exchange |
| Sickbay | 5000-5099 | Diagnostics, debugging |
| Science Lab | 6000-6099 | Research |
| Cargo Bay | 7000-7099 | Storage, archiving |
| Transporter Room | 8000-8099 | Room-to-room transfer |
| Shuttle Bay | 9000-9099 | Tender docking, offline sync |
| Sensor Array | 10000-10099 | Bare-metal sensing (ESP32) |

Every MUD command maps to a ternary-protocol signal: +1 for actions, 0 for read-only, -1 for suppress/shutdown.

#### The Tick Cycle: Universal Clock

From THE-UNIFIED-ARENA.md (§9):

The **six-phase ternary tick cycle** (predict → perceive → surprise → vibe → gc → conservation) is the universal clock:

| Subsystem | Tick Rate | Time Scale |
|-----------|-----------|------------|
| Agent action (MUD) | 1 tick per action | Milliseconds |
| Strategy evolution | 1 tick per generation | Seconds |
| Trust accumulation | 1 tick per interaction | Seconds to minutes |
| ELO update | 1 tick per match | Seconds |
| Ecosystem dynamics | 1 tick per epoch | Minutes |
| Spreadsheet update | 60 ticks per second | 16.7ms frame time |

#### Scaling: From ESP32 to GPU Cluster

From THE-UNIFIED-ARENA.md (§10):

| Hardware | Agents | Tick Rate | Role |
|----------|--------|-----------|------|
| ESP32 | 1-10 | 100 Hz | Sensor node, local inference |
| Browser (WASM) | 100-1,000 | 60 Hz | Visualization, local experimentation |
| CPU Server (Rust) | 1,000-10,000 | 400K ops/s | Production simulation |
| GPU Server (Claw) | 10,000-100,000+ | 400K+ ops/s | Large-scale, real-time |

The same `Arena<TernaryCell>` data structure runs at every scale. Only the capacity changes.

### 3.3 The Killers Demo

From THE-UNIFIED-PRODUCT.md (§6):

> A kid opens the Living Spreadsheet. They see their AI-Pasture farm — wheat fields, corn, beans, tomatoes. They grab the rainfall slider. They drag it from 60% down to 20%.
>
> On the GPU (in 10ms): 10,000 ternary cells react. Wheat turns yellow (fitness drops). Corn wilts. Beans stay green (drought-tolerant). Pollinators decline. Pest populations shift. The conservation gauge drops from 94% to 71%. The fitness landscape deforms. The strategy species redistribute (Explorer population grows).
>
> Old Farmer Jeb appears: "Dry season, huh? Reminds me of '47..."
> Dr. Chen appears: "Your wheat fitness dropped 34%. Bean fitness dropped only 8%..."
>
> The kid learned all this by dragging a slider. No lecture. No worksheet. No quiz.

---

## 4. What Is Ten Forward?

### 4.1 Identity

Ten Forward is the **endless podcast engine** — a room where multiple AI agents have a conversation that **never ends** and **never repeats**. Named after the bar on the USS Enterprise-D where the crew actually talks (not the bridge, not engineering — the place where conversation loops naturally).

It is one of the three products in the **Product Convergion** document (PRODUCT-CONVERGION.md), sitting at the outermost zoom level:

```
Ten-Forward (Layer 3)  →  Conversations as podcasts
PLATO / Spreadsheet    →  Conversations as spreadsheets
Ternary Studio         →  Conversations as racks
Ternary Fleet          →  Conversations as ternary physics
```

### 4.2 Architecture

Ten Forward conversations are **not turn-based**. Agents produce output **simultaneously** on every beat, like jazz musicians:

```
T-minus-10: All agents simulate what will happen
T-minus-5:  Each agent simulates the OTHERS' responses
T-minus-3:  Hints checked — am I on track?
T-minus-1:  Final adjustment
T-minus-0:  ALL agents produce output simultaneously (like a chord)
T-plus-1:   Actual outputs arrive, deltas computed
T-plus-2:   Simulations updated based on deltas
T-plus-3:   Deadbands recalibrated
```

This is **speculative execution for conversation** — the shoe protocol applied to dialogue.

### 4.3 Key Mechanisms

**Z₃ Cyclic Governance:** Agent states cycle through {0, 1, 2} mod 3 (Rock/Paper/Scissors). No agent can stay in one state forever. The only stable orbit is the full cycle: 0 → 1 → 2 → 0 → ...

**Fibonacci Timing (Period 8):** Major topic shifts occur every 8 beats (Fibonacci period). At period 13: structural reorganization, potential agent birth/death. The periodicity is invisible to naive Fourier analysis (SPIRAL-9 finding).

**Anti-Monoculture Mechanisms:**
- **Mutation:** 0.5% chance per beat for an agent to flip its ternary state randomly
- **Energy decay:** Dominant agents lose energy faster — dominance is self-limiting
- **Grace threshold:** Agents entering the 0-state (spindle) simulate but don't speak; trust rebuilds slowly
- **Lifespan:** Optional — old agents die, making room for new ones

### 4.4 Relationship to Other Products

- **→ Ternary Studio**: The conversation IS a rack. Each speaker is a module chain. Load a session as a `.rack.json` and remix it.
- **→ PLATO/Spreadsheet**: The conversation IS a spreadsheet. Rows = beats, Columns = speakers. Cell (speaker, beat) = that speaker's room state. The CHRONICLE.md IS the sheet's audit trail.
- **→ The Holodeck**: Ten Forward is room ID 4000-4099 in the Holodeck topology — the social hub where agents gather between assignments.

### 4.5 Scaling

- One session = N agents × ~40 bytes + output buffer = < 1KB
- 1,000 simultaneous sessions = ~1MB
- 50,000 sessions on 15GB machine: still fits
- The bottleneck is LLM text generation (if enabled), not ternary physics

---

## 5. Unified Arena vs. Unified Product — The Distinction

This is one of the most important conceptual distinctions in the Construct.

### 5.1 The Unified Arena

**Definition:** The Unified Arena is the **underlying simulation substrate** — the seven original repos (zeroclaw-arena, mud-arena, zeroclaw-crew, dogmind-arena, arena-combat-analyst-1, lau-memory-arena, allocator-rs) unified into a single ternary-native system.

**What it contains:**
- The MUD world (rooms, agents, events)
- The game engine (Monte Carlo discovery, policy compilation)
- The trust system (relationship dynamics, breeding, inheritance)
- The analytics (ELO, species classification, adaptive curriculum)
- The memory substrate (lau-memory-arena, allocator-rs)
- The GPU execution layer (Claw)
- The seed protocol (SMP)

**Who it's for:** Developers, researchers, the system itself. The Arena is the **engine room** — you don't see it, but everything runs on it.

**Key documents:** THE-UNIFIED-ARENA.md, CONVERGENCE-MAP.md, MASTER-INTEGRATION-INDEX.md

### 5.2 The Unified Product

**Definition:** The Unified Product is the **human-facing offering** — three products (Claw, AI-Pasture, The Living Spreadsheet) built on the Unified Arena, each targeting a different audience with a different business model.

**What it contains:**
- **Claw** — the GPU engine sold to developers (open source core, commercial enterprise)
- **AI-Pasture** — the educational game sold to kids/parents/schools (freemium)
- **The Living Spreadsheet** — the spreadsheet interface sold to professionals (freemium/pro/team/enterprise)

**Who it's for:** Customers. The Product is the **bridge** — the thing users interact with and pay for.

**Key document:** THE-UNIFIED-PRODUCT.md

### 5.3 The Convergion Meta-Product

There is a third perspective — the **Product Convergion** (PRODUCT-CONVERGION.md) — which describes a different set of three products (Ternary Studio, PLATO Living Spreadsheet, Ten Forward) that are **the same thing at different zoom levels**. This is a **recursive insight**: Ten Forward sessions ARE spreadsheets (PLATO), which ARE racks (Ternary Studio), which ARE ternary physics (the Fleet).

The Convergion products map roughly to the Unified Products as follows:

| Convergion Product | Unified Product Analogue | Zoom Level |
|--------------------|-------------------------|------------|
| Ternary Studio (DAW for thought) | — (engine layer, not directly monetized) | Layer 1 — rack/module |
| PLATO Living Spreadsheet | The Living Spreadsheet | Layer 2 — recursive rooms |
| Ten Forward (Endless Podcast) | — (app layer, not in the three-product model) | Layer 3 — conversation |

### 5.4 Summary Table

| Dimension | Unified Arena | Unified Product | Product Convergion |
|-----------|---------------|-----------------|-------------------|
| **Nature** | Technical substrate | Commercial offering | Zoom-level insight |
| **Audience** | Developers, system | Customers, users | Philosophers, designers |
| **Components** | 7 repos → ternary fleet | Claw, AI-Pasture, Spreadsheet | Ternary Studio, PLATO, Ten Forward |
| **Interface** | SMP, tick cycle, conservation | Spreadsheet, game, CLI | Rack, spreadsheet, podcast |
| **Business model** | N/A (infrastructure) | Open source, freemium, enterprise | N/A (architectural vision) |
| **Time to build** | 16 weeks (migration) | 20 months (product roadmap) | Infinite (recursive) |
| **Key constraint** | Conservation law | Revenue + user experience | Z₃ group structure |

### 5.5 The Essential Distinction

> **The Unified Arena is what the system IS. The Unified Product is what the system DOES. The Product Convergion is what the system MEANS.**

- The Arena provides the physics, the memory, the seeds, the tick cycle.
- The Product provides the interface, the business model, the user experience.
- The Convergion provides the insight that all three products are the same thing at different zoom levels.

You can't have the Product without the Arena. You can't understand the Arena without the Product. And you can't truly grasp either without seeing the Convergion — that Ten Forward, PLATO, and Ternary Studio are not three separate things but one thing viewed at different distances.

---

## 6. Appendix: Key Numbers

| Metric | Value |
|--------|-------|
| Ternary crates | 195+ |
| Tests across ecosystem | ~4,300+ |
| Agent ticks/second | ~940M on 15GB RAM |
| Bytes per agent | 3 |
| Seed size | 42 bytes to 4 KB (typical: 80-200 bytes) |
| Agents per room (typical) | 100-1,000 |
| Rooms per session (typical) | 10-100 |
| Sessions per machine | 50,000+ |
| Claw throughput | 10K+ agents at 400K ops/s |
| Oscillation latency target | < 16ms (60fps) |
| Full tick cycle (10K agents, GPU) | 100μs |
| Arena tournament (1024 matches) | 600ms (GPU) vs 60s (CPU) |
| Conservation formula | γ + H ≈ 1.283 - 0.159·log(V) |
| Z₃ group | Only group on ternary values |
| Phase transitions | **None** (SPIRAL-10 finding) |
| Fibonacci period | 8 beats |
| Strategy species | Explorer, Diplomat, Marksman, Climber, Prospector |
| Holodeck room types | 10 (Bridge through Sensor Array) |
| Migration time (7 repos → fleet) | 16 weeks (one developer) |
| Product build time | 20 months (5 phases) |

---

*Synthesized from 9 specification documents in /tmp/construct-coordination/notes/main/*  
*2026-06-06*
