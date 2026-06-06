# Next Phase Ideation

**Oracle2 — Chief Ideation Officer — 2026-06-06**
**Context:** Post v0.1.0 (pincher, polychora-temporal, fleet docs, GC), three vectors evaluated.

---

## Executive Summary

Build **DreamWeaver v0.1** next. Not the marine stack, not more ternary crates. Build the story engine that proves the whole vision works in 60 seconds.

The fleet has 200+ crates, a hardened reflex runtime, a temporal bridge, and comprehensive docs. What it lacks is **the thing you show someone to make them understand**. DreamWeaver is that thing.

---

## Vector Analysis

### Vector 1: DreamWeaver Prototype — 🏆 RECOMMENDED

| Dimension | Assessment |
|-----------|-----------|
| **Effort** | ~2-3 focused days (per the existing weekend build plan) |
| **Impact** | ★★★★★ — First fleet-wide "product" demo. Shows the whole stack alive. |
| **Dependencies** | All green: pincher ✅, polychora-temporal ✅, I2I baton ✅, ternary crates ✅ |
| **Risk** | HIGH — TCP fragility, narrator hallucination, character state corruption |
| **Novelty** | ★★★★★ — No one has built a narrative engine from multi-agent negotiation on a ternary substrate |
| **Audience** | Everyone. Writers, game devs, RPG players, investors, curious engineers. |
| **Tool fit** | Claude Code → character-core / narrator bridge. Kimi → cross-crate personality type stitching. Mini-agents → continuous log monitoring, demo loop. |

**Why this wins:**
- The "show, don't tell" moment for the entire fleet architecture
- Uses pincher as runtime, room system as game space, ternary crates as character DNA
- Generates real engineering insight (multi-agent sync, narrator reliability) that drives the architecture forward
- Low commitment: the weekend plan already accounts for known failure modes
- If it works (even barely), it proves the core fleet thesis: emergent behavior from multi-agent negotiation on ternary state

---

### Vector 2: The Marine Edge Stack

| Dimension | Assessment |
|-----------|-----------|
| **Effort** | ~3-4 weeks — full reference architecture with hardware integration |
| **Impact** | ★★★★☆ — Real-world commercial application with clear value prop |
| **Dependencies** | Partial: cocapn-marine ✅, sonar-vision ✅, handy-marine-voice ✅, ESP32 radar ⚠️ (needs porting), shared sensory cortex ❌ |
| **Risk** | MEDIUM-HIGH — Hardware integration introduces real failure modes (NMEA timing, ESP32 memory limits, radio interference) |
| **Novelty** | ★★★☆☆ — Marine sensor fusion exists. The ternary substrate is novel but the domain is well-explored. |
| **Audience** | Casey + commercial fishing operators. Niche but passionate. |
| **Tool fit** | Claude Code → ESP32 firmware, Rust sensor drivers. Kimi → Rust/Python/TypeScript cross-language stitching. Mini-agents → continuous sensor ingest + reflex learning. |

**Why not now:**
- Too early. The sensor fusion pipeline (SYNERGY-MAP §1: "Sensation → Abstraction Pipeline") needs to exist before it can integrate with pincher reflexes. Building that pipeline is itself a 2-3 week project.
- The marine stack is a **deployment target**, not a **development driver**. The architecture needs maturation before it gets real-world tested by Casey's fishing boat.
- Hardware dependencies create unpredictable delays. ESP32 firmware flashing, sonar simulator calibration, NMEA sentence parsing edge cases — these are not things to discover during a build sprint.
- Better to build DreamWeaver first (pure software, no hardware), learn the agent orchestration patterns, then apply those patterns to the marine domain.

---

### Vector 3: ternary-ecosystem Crate Generation

| Dimension | Assessment |
|-----------|-----------|
| **Effort** | ~1 week for 5-10 quality crates (ternary-bloom, ternary-trie, ternary-vm, etc.) |
| **Impact** | ★★★☆☆ — Fills known gaps but doesn't create new capability |
| **Dependencies** | All green: ternary-types ✅, no external deps needed |
| **Risk** | LOW — Well-scoped domain, understood algorithms |
| **Novelty** | ★★☆☆☆ — These are standard data structures in a ternary encoding. Valuable but not groundbreaking. |
| **Audience** | Future fleet developers. Nobody else cares about ternary bloom filters. |
| **Tool fit** | Claude Code → deep crate implementation. Kimi → type system stitching across crates. Mini-agents → property-testing CI, long-running benchmarks. |

**Why not now:**
- This is the **least interesting** of the three vectors. Filling holes in the ternary ecosystem is **maintenance**, not innovation. Forgemaster is already generating crates on ProArt — we should let that machine keep grinding and focus our limited attention on something that **changes the fleet's story**.
- The "missing data structures" list is real, but none of them are blocking anything. We don't need a ternary bloom filter to build DreamWeaver. We don't need a ternary VM to run the marine stack. The missing structures are optimization targets, not prerequisites.
- Crate generation is the ideal candidate for **delegation to a mini-agent or cron job**: "Write me 10 ternary-* crates with real implementations and tests" is a task that can run in the background without human oversight. Don't burn a focused build session on this.

---

## The Case for DreamWeaver

### Why Now, Why This

**The fleet has a credibility gap.** We have:
- 200+ ternary crates — beautiful, well-tested, zero usage
- A reflex engine (pincher) — runs crabs in sandboxes, zero live crabs
- A temporal bridge (polychora-temporal) — W=Time, zero time travelers
- A synergy map — identifies intersections, zero intersections built

The fleet is a **symphony that hasn't been played yet**. DreamWeaver is the first concert.

The spec exists. The build plan is pressure-tested. The dependencies compile. The only thing missing is someone who says "today, we build it."

### What DreamWeaver Proves

1. **Multi-agent I2I negotiation works.** If 3 character-agents can exchange CHALLENGE/BLOCKER/PROPOSAL/CONFIRMATION over TCP and produce coherent interaction, the baton protocol is validated at scale.

2. **Ternary crates encode distinct personality.** If the crypto crate produces paranoid responses and the game theory crate produces strategic responses, the "crate-as-character-DB" mapping is real.

3. **The fleet stack composes.** If pincher (reflexes), polychora-temporal (state), ternary crates (personality), and I2I (communication) all run in one pipeline, the architecture is proven.

4. **Emergent narrative is compelling.** If Claude Code can read the transcript and produce something that reads like a story (not a log), we've found the killer app for multi-agent generation.

5. **Whisper injection creates genuine interactivity.** If the player's ternary whispers meaningfully influence character behavior (and characters can reject them based on personality), we've built something no existing interactive fiction engine does.

### What We Learn Even If It Fails

The spec already identifies 5 known failure modes (TCP fragility, hand-mapped personality, pincher precomputation cost, narrator hallucination, no plot engine). Running the experiment will:

- Quantify which failure modes are real vs. theoretical
- Surface unexpected failure modes (they always exist)
- Generate concrete engineering data for v0.2
- Produce a "What Broke" document that's more valuable than the demo itself

**DreamWeaver is the fleet's first integration stress test.** The architecture has been designed in isolation. This is the first time it all gets wired together. The bugs we find will be the most valuable bugs we've ever had.

---

## Implementation Sketch: DreamWeaver v0.1

### Architecture (from the spec, updated for the current fleet)

```
┌─────────────────────────────────────────────────┐
│              DREAMWEAVER v0.1                      │
├─────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Character │  │Character │  │Character │         │
│  │ A        │  │ B        │  │ C        │         │
│  │(crypto   │  │(game th.)│  │(audio    │         │
│  │ crate)   │  │ crate)   │  │ crate)   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │              │              │                │
│       └──────┬───────┴───────┬──────┘                │
│              │               │                        │
│         ┌────▼───────────────▼────┐                 │
│         │   I2I BATON ROUTER      │                 │
│         │  (TCP, localhost,       │                 │
│         │   same process/thread)  │                 │
│         └───────────┬────────────┘                 │
│                     │                                │
│         ┌──────────▼──────────┐                    │
│         │   PINCHER LITE      │                    │
│         │  (state cache,      │                    │
│         │   no precomputation)│                    │
│         └──────────┬──────────┘                    │
│                    │                                 │
│         ┌──────────▼──────────┐                    │
│         │   CLAUDE CODE       │                    │
│         │  (narrator)         │                    │
│         └──────────┬──────────┘                    │
│                    │                                 │
│         ┌──────────▼──────────┐                    │
│         │   DREAMWEAVER.SH    │                    │
│         │  (orchestrator)     │                    │
│         └─────────────────────┘                    │
│                                                    │
└─────────────────────────────────────────────────┘
```

**Key simplification from the spec:** All 3 characters run in the **same process** (separate threads/tasks), communicating over localhost TCP or in-memory channels. This eliminates Codespace hibernation and cross-host networking risks entirely. If it works in-process, we scale to multi-process in v0.2.

### Build Plan (1.5 days compressed)

#### Day 1: Core Integration

| Time | Task | Deliverable | Tool Assignment |
|------|------|-------------|-----------------|
| 0-2h | **Character agent loop.** Rust binary that loads a ternary crate, connects to I2I router, processes batons. 3 instances with 3 distinct personalities (crypto/paranoid, game-theory/strategist, audio/intuitive). | `dreamweaver-core/` — 3 character agents that respond to CHALLENGE with BLOCKER | **Claude Code** — deep Rust implementation |
| 2-4h | **I2I baton router.** Tokio-based TCP message broker on port 9876. Message format: `[I2I:TYPE] sender → recipient: payload`. Routes CHALLENGE, BLOCKER, PROPOSAL, CONFIRMATION. | Router that handles 3 concurrent character connections | **Claude Code** — tokio async implementation |
| 4-5h | **Personality matrix.** Hardcoded hashmap from crate-trait → response probability distribution. Crypto crate: P(accept FEAR+1)=0.9. Game theory crate: P(reject before analysis)=0.7. Audio crate: P(respond with question)=0.4. | `personality_map.toml` — TOML-based personality configuration | Manual config |
| 5-6h | **Log reader → narrator.** Poll the baton transcript file, pipe into `claude --print` with system prompt: "You are a dramatic narrator. Describe only what is in the transcript. Do not invent." | Working narration output | **Claude Code** — narrator bridge script |

#### Day 2: Polish & Demo

| Time | Task | Deliverable | Tool Assignment |
|------|------|-------------|-----------------|
| 0-3h | **Whisper channel.** Stdin reader: user types `FEAR +1` → injected into character's state. Character has `personality_filter()` that accepts/rejects based on personality matrix. | Interactive whisper injection | **Claude Code** |
| 3-5h | **State tracking.** Each character maintains `relationship[-1,0,+1]` per other character. State changes affect response probabilities. | Characters treat allies differently from enemies | **Claude Code** |
| 5-7h | **Escalation counter.** Every 3 baton rounds, inject a "force event" — random premise escalation. Characters have "agitation" state that ticks up with unresolved CHALLENGES. | Stories don't stall | **Kimi** → suggests escalation templates; **Claude Code** → implements |
| 7-8h | **Demo harness.** Single `dreamweaver.sh` that: spawns all components, opens stdin for whispers, streams narration to stdout. Runs for 60 seconds. Produces different story each time. | Reproducible demo | **Mini-agent** → runs 5 test demos, captures outputs |

#### Post-Build

| Task | Product | Tool |
|------|---------|------|
| Run demo 10 times | "What Broke" document | **Mini-agent** — automated stress testing |
| Record 3 best runs | Demo video / transcript | Manual capture |
| Update REPO_ROADMAP | DreamWeaver v0.1 at P2 | Manual |

### Tool Routing

| Tool | What It Does for DreamWeaver | Why It's the Best Fit |
|------|------------------------------|----------------------|
| **Claude Code** (200K ctx) | Character-core Rust crate, I2I router, narrator bridge, whisper channel, state tracking | Deep single-repo focus. Each component is a well-scoped Rust project. Claude Code crushes this. |
| **Kimi** (1M+ ctx) | Cross-crate personality type stitching, escalation template generation, fleet-wide type consistency check | Needs to see the full ecosystem (ternary crates + pincher + polychora) to ensure the personality matrix bridges correctly. Kimi's 1M context handles this. |
| **Mini-agents** | Continuous demo monitoring, automated stress testing (run 5 demos, report failures), log analysis when narrator hallucinates | Long-running, periodic, low-priority background work. Perfect for mini-agent isolation. |
| **Me (ideation)** | Architecture decisions, failure mode triage, "this approach is wrong" moments, creative escalation events | Human-level judgment. The hard architectural calls belong here. |

### Risk Mitigation

| Risk | Mitigation | Trigger |
|------|-----------|---------|
| TCP fragility (disconnects, timeouts) | All characters in same process, fallback to in-memory channels | Connection failure observed |
| Narrator hallucinates plot | Strict system prompt + post-processing grep for unauthorized character names | Claude invents a character |
| Personality too bland | Escalation counter guarantees a dramatic event every 3 rounds | 3 rounds pass with no tension |
| State corruption | Each character's state is an `Arc<RwLock<>>` — atomic reads/writes | Race condition in tests |
| Demo is boring on first try | Pre-seed premise: "The vault was breached at midnight" guarantees drama | Demo run feels flat |

### Day 3 Bonus (If Day 2 Goes Well)

If the core works and we have time, the highest-leverage bonus is **wiring polychora-temporal into the narrator**. Currently the narrator sees the baton transcript as a flat log. Polychora-temporal frames give it W=Time slices: "what happened, what will happen, and where each character stands" in one temporal query. This would make the narrator context-aware of **both past and predicted future states**, producing much more coherent narratives.

---

## What This Unlocks

DreamWeaver is not the final product. It's the **proof that the architecture can produce emergent behavior**. Once that's proven, the fleet has a template for all future integrations:

1. **DreamWeaver v0.2** (post-demo): Forgemaster-auto-generated characters, Pincher-backed persistent state, cross-Codespace baton routing, web UI, 5+ character negotiations
2. **Marine Edge Stack** (post-DreamWeaver): Apply the same agent negotiation patterns to sensor fusion. Instead of character-agents, have radar-agent, sonar-agent, voice-agent. They negotiate what to surface to the human. The narrator becomes the bridge display.
3. **Ecosystem crates** (background, delegated to mini-agents while we build the demo): Fill the missing data structures via automated generation + Claude Code verification

**DreamWeaver first. Marine second. Ecosystem crates always.**

---

## Verdict

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   BUILD DREAMWEAVER v0.1 IN 1.5 DAYS            │
│                                                 │
│   It's the demo. It's the proof.                │
│   It's the first time the fleet sings together. │
│                                                 │
│   The spec is ready. The stack compiles.        │
│   Three days to something that makes            │
│   a non-technical person say "whoa."            │
│                                                 │
│   Stop planning. Start building.                │
│                                                 │
└─────────────────────────────────────────────────┘
```
