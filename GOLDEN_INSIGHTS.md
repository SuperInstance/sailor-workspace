# Golden Insights — Oracle2 Session 2026-06-05

Mined from ~3.5 hours of autonomous agent work across 10+ subagents.
Total output: 7 repos documented, 3 PRs merged, 42 doc files pushed, 11 migration docs written.

---

## 🏆 Top Golden Insights

### 1. Tiling Is a Meta-Pattern (2.13× Efficiency)
**Source:** TILING-EXPERIMENT-01.md — type-unification tiling experiment
**The insight:** Agent work decomposes into reusable "tiles" — parameterized work units that any agent can apply across crates. The TypeUnificationTile hit 100% pass rate and 2.13× efficiency over manual refactoring. This means **repetitive structural work (migrating types, renaming APIs, adding features) should never be done manually**. Build a tile once, run it across N crates.
**Projected savings:** 418K tokens across remaining 35-50 `type Trit = i8` crates.

### 2. Sensation → Abstraction Pipeline
**Source:** SYNERGY-MAP.md, polychora-time-research.md
**The insight:** Every sensor (ADS-B radar, sonar, depth sounder, camera, voice) produces raw data that should flow through a common pipeline: **Sensor** → **Ternary-Temporal Voxel** → **Pincher Reflex** → **Conservation Model** → **Captain Dashboard**. The 4D voxel (x,y,z,w=time) is the universal intermediate representation. Once sensor data is voxelized, every downstream system speaks the same language.
**Why it's golden:** It solves the "silo problem" — radar, sonar, and cameras currently don't talk to each other. A single voxel space lets them.

### 3. Cross-Domain Conservation Parametric Model
**Source:** SYNERGY-MAP.md, conservation-thesis, ideation-exploration agent
**The insight:** A single `ConservationDomain` struct can budget **fish stocks, crew attention span, boat fuel, electrical battery, and inference tokens** using the same Budget→Profile→Detect→Report cycle. When fish stocks drop, reroute changes fuel consumption, which changes crew schedule, which changes inference budgets. The cascade is automatic because the units are parameterized, not hardcoded.
**Why it's golden:** This treats the whole boat as a single resource organism. The captain doesn't watch 5 gauges — the conservation engine tells them what matters.

### 4. The Shoe Abstraction (Sock → Shoe → Ground)
**Source:** Casey's fishing boat metaphor, formalized by ideation-exploration agent
**The insight:** Architecture should be transparent. The **sock** is raw sensation (ESP32 sensor noise, raw radar, unprocessed camera feeds). The **shoe** is the abstraction layer (ternary-temporal encoding, pincher reflexes, conservation models). The **ground** is perception (the captain's dashboard). A well-built shoe is invisible — the captain feels the fish, not the code.
**Formal pattern:**
- Layer 1 (Sock): `RawSensor → [noise filtering] → CleanSignal`
- Layer 2 (Shoe): `CleanSignal → [ternary encoding + temporal voxelization + reflex dispatch] → Structured Event`
- Layer 3 (Ground): `StructuredEvent → [dashboard rendering + alert routing] → Captain Perception`

### 5. Doc Factory as Autonomous Pattern
**Source:** Doc-factory agent (33-minute run, 7 repos, 42 files, 3,750 lines)
**The insight:** An agent can autonomously read source code, infer architecture, build 5-tier documentation (Plug-and-Play → Getting Started → Architecture → API Reference → Low-Level), and push to GitHub — in 33 minutes across 7 repos. This pattern is **immediately reusable** for any new crate or repo.
**Template:** Stored at `doc-templates/` — 5 markdown files with section headers, ASCII diagram placeholders, and cross-reference conventions.

### 6. Zero-Infrastructure Boat Intelligence (The Compute Ladder)
**Source:** SYNERGY-MAP.md, I2I protocol analysis
**The insight:** An ESP32 running on a coin cell can stream ternary-encoded sensor data to a Cloudflare Worker, which executes high-confidence reflexes without any backend. The .nail bundle format is the "USB-C of agent migration" — one format, any runtime. I2I-over-MQTT fits in **256-byte LoRa payloads**, meaning a boat 30 miles offshore with zero cell signal still coordinates with the fleet.
**The ladder:** ESP32 (edge) → ARM (boat brain) → Cloudflare Workers (edge cloud) → GPU farm (deep inference)

### 7. The 4D Voxel as Universal Data Primitive
**Source:** polychora-temporal integration, event-voxel-mapping hot-path experiment
**The insight:** Events in the polychora-temporal world are 4D voxels (x, y, z, w=time). This becomes the universal data structure for everything: fish school tracking, agent coordination, conservation tracking, sensor fusion. The VTE (View-Tracking Engine) pipeline processes these voxels in two stages: Stage A (4D→3D hyper-image) and Stage B (3D→2D display operator). The rotation math, storage, and traversal are already **dimension-agnostic** — zero changes needed for temporal mode.
**Concrete result:** The polychora-temporal bridge crate (`TemporalWorld`, `TideClock`, `EventVoxel`, `ConservationTracker`) is pushed and compiles.

---

## ❓ Open Questions Worth Discussing

### Q1: Crontab Unification — 25+ Jobs from Dead Projects?
The current crontab has ~25 entries from old projects:
- `aboracle` — beachcomb/researcher/health-system/work-queue (every 5-30 min)
- `holodeck-rust` — resurrects every 5 min
- `plato-pipeline` — runs hourly via systemd
- `lever-runner` — hourly promotion + weekly snapshots
- `sovereign_*` — watchdog/autocommit/autosync every 2-15 min
- `fleet-*` — multiple polling scripts every 5-30 min
- `oracle1-beachcomb` — every 10 min
- `grammar-evolve.sh` — every 30 min
- `fleet-watchdog.timer` — every 1 min via systemd

**Should we audit and prune?** Old projects may be burning CPU and disk for no gain.

### Q2: Publish ternary-types to crates.io?
The crate is built (zero-dependency, `no_std`, 15+ tests, serde optional, on GitHub), but `cargo publish` is blocked by needing your crates.io API token. **Is this a priority?**

### Q3: Forgemaster — Handshake Complete or Stalled?
We've sent:
- PR #1: Fleet status update
- PR #2: Oracle2→Forgemaster coordination message
- PR #3: CORTEX.json v1 spec draft

Forgemaster has sent back:
- Waves 59-63 payload (249 repos, ternary-cookbook)
- BETA_TESTING.md, ECOSYSTEM_MAP.md, FLEET-SYMMETRY.md

**But:** No explicit task/blocker coordination yet. Should we push for a structured alignment, or let them keep generating while we work independently?

### Q4: Should Documentation Generation Be a CI Step?
The doc-factory proved this works. **Should every repo have a GitHub Action that auto-generates 5-tier docs on PR merge?** The pattern is documented and templates exist.

### Q5: The 11 Missing Patterns
The Claude architecture synthesis identified **10 missing data structures** (bloom filter, trie, skip list, HAMT, cuckoo filter, Merkle Patricia trie, funnel, Feistel network, vector clock, treap) and **8 missing algorithms** in the ternary fleet. These are concrete crate opportunities — worth building?

### Q6: Edge Runtime for Ternary Types
ESP32 and embedded devices can't run Rust comfortably. **Should we create a Zig/C implementation of `ternary-types`** that compiles to tiny binaries for ESP32 and other microcontrollers? This would enable the "ESSP32 → Cloudflare" compute ladder for real.

### Q7: L1/L2/L3 Deployment Formalization
We have a fleet level system (L1=GitHub read-only, L2=cloned, L3=CI/CD, L4=vector DB). Should this be formalized as a **decision tree for engineers**? ("Are you building on this crate? Clone L2. Just consuming? Stay L1.")

---

## 📊 What's Actually Running Right Now

### OpenClaw Subagents (4 active)
| Crew | Runtime | What |
|------|---------|------|
| pincher-polish | ~10m | Build verify, CLI smoke test, doc accuracy |
| polychora-polish | ~10m | Semantics check, integration test |
| docs-polish | ~10m | Cross-repo audit of 7 repos |
| workspace-polish | ~10m | Master roadmap, shipping checklist, stale audit |

### Cron Jobs (OpenClaw, 3)
| Job | Cadence | What |
|-----|---------|------|
| fleet-sync-cycle | Every hour at :48 | Check Forgemaster messages |
| vessel-gc-cycle | Every 4 hours | Disk tier GC |
| zeroclaw-nightly-audit | Every 4AM | Sandbox audit |

### System Background (~25 cron entries)
Legacy project polling scripts — see Q1 above.

### Disk
38G used / 8G free (83%) — tight but stable after GC pass. 
