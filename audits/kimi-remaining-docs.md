# Kimi Code Synthesis: Remaining Construct-Coordination Documents

**Generated:** 2026-06-06  
**Source:** `/tmp/construct-coordination/notes/main/`  
**Documents Analyzed (8):**
- FLEET-NEUROARCHITECTURE.md (733 lines)
- SMP-SPREADSHEET-ARCHITECTURE.md (813 lines)
- THE-RECURSION.md (130 lines)
- ZERO-IS-THE-SPINDLE.md (117 lines)
- SCALE-SIDEWAYS.md (66 lines)
- SPECULATIVE-SYNC-ARCHITECTURE.md (196 lines)
- ROOM-AS-CODESPACE-ARCHITECTURE.md (926 lines)
- MIDI-TENSOR-ARENA.md (715 lines)

---

## 1. THE-RECURSION: Every Layer Is the Same Shape

### Key Architectural Insight
Every layer in the system — from dance floor dancers to DJ control boards, from instrument panels down to transistors and bits — follows the **same tensor architecture**. Each entity is a room; each room is a tile in every other room's perception grid.

### Novel Concepts
- **Fractal recursion:** The tensor doesn't care what it's made of. Cell, tile, room, dancer, transistor — same structure, different scale.
- **Connection dynamics as emergence:** Connection strength is NOT a simple sum of factors (time, distance, familiarity, attraction, rhythm sync). It emerges from the *combination* of factors — a connection can be "electric/volatile" (far apart, perfectly synced, just met, attracted) or "stable/deep" (close, known forever, out of sync, not attracted). Both are valid; the system needs both.
- **Multi-axial tensor view:** The same system can be viewed from X-axis (rooms at same depth), Y-axis (rooms in same column/chain), Z-axis (rooms over time), or any diagonal (cross-cutting views).

### Connection to Claw/AI-Pasture/Living Spreadsheet
- PLATO isn't a room-based system with a tensor view bolted on. **The tensor IS the rooms. The rooms ARE the tensor.**
- The ternary fleet is the metal. The instruments are the code. The DJ is the program. The dancers are the rooms. The floor is the tensor. Zero — the spindle — is at the center of every room at every level.

### What Oracle2 Must Know
- The system must support viewing the same data from ANY axis: as a DJ board, choreographer floor, call graph, circuit, or particle field.
- Connection dynamics are not linear sum — they are emergent from combination of factors.
- Every program, process, agent, and function is a "room." Rooms are natively connected tiles.

---

## 2. ZERO-IS-THE-SPINDLE: Ternary Physics as DJ Architecture

### Key Architectural Insight
Zero isn't nothing. Zero is the **spindle** — the axle of a merry-go-round, the center position of a DJ's crossfader. The 0 state doesn't destroy charge; it *hides* it from measurement. The transition THROUGH 0 is the critical moment — "the drop."

### Novel Concepts
- **11 experiments established:** (1) Without access to 0, the system freezes. (2) Without ESCAPE from 0, the system dies. (3) 0 hides charge from measurement. (4) Optimal escape rate (0.6%) ≈ optimal forgiveness rate (0.5-0.7%). (5) During the transient through 0, diversity peaks — system is "most alive." (6) |γ| + H (absolute charge + entropy) is 6.6× more stable than γ + H (signed).
- **DJ Architecture:** Crossfader = tunneling rate. Tempo = tick rate. EQ = fitness landscape. Needle drop = initial conditions. The Mix = the living system.
- **The 8-Ball on the Platter:** The 0 state is an 8-ball placed at the right radius — not thrown off by centrifugal force, not rolling to center. Equilibrated. `ternary-engine` has `find_equilibrium_spot()`.
- **`ternary-motion`:** Every agent tracks position, velocity, acceleration, jerk, rhythm, phase, and groove alignment. Population has MotionHealth: FROZEN → SETTLING → TRANSITIONING → GROOVING → CHAOTIC.

### Connection to Claw/AI-Pasture/Living Spreadsheet
- **CudaClaw** = mixer hardware (10K GPU channels)
- **AI-Pasture** = the performance (kids learn to mix by growing a farm)
- **Living Spreadsheet** = control surface (faders, knobs, crossfaders; =ROLL("3d6") = dropping needle at random; =EVOLVE() = pressing play)
- The ternary-engine crate IS the mixer. Every ternary---* crate is an effect module. Percolation = reverb. Kuramoto = phaser. Topology = spectrum analyzer.

### What Oracle2 Must Know
- Zero is computationally invisible but present — charge hidden, not destroyed.
- The transient through zero is when the system is most alive (peak diversity).
- |γ| + H is the right invariant, not γ + H.
- `ternary-motion` crate provides full motion state (position, velocity, acceleration, jerk, rhythm, phase, groove alignment) and population-level MotionHealth diagnostics.

---

## 3. SCALE-SIDEWAYS: Cell-Centric Scaling Philosophy

### Key Architectural Decision
**Scale sideways, not up.** Each crate is a single cell. You scale by making more cells, not bigger cells.

### Novel Concepts
- **Zero-dependency cylinders:** Every ternary crate is one concern, zero external dependencies, stack-friendly (fits in cache lines), composable, and instantiable (no singletons — spawn N copies).
- **Anti-patterns:** No "everything about signals" frameworks. No HashMap<String, Vec<ComplexType>>. No traits with 15 associated types.
- **The experiment IS the unit of scale:** 1000 agents at 10 bytes = 10KB. Run 100 instances in parallel with different parameters. Sweep forgiveness 0.0→1.0 in 100 steps? Done in seconds.
- **State is fixed-size arrays.** No heap. No dynamic dispatch. No strings in hot paths. Just numbers and tight loops.

### Connection to Claw/AI-Pasture/Living Spreadsheet
- Every cell in the Living Spreadsheet IS a `TernaryCell` — a few bytes, stack-allocated. 10,000 cells = ~100KB.
- GPU acceleration (CudaClaw) achieves 400K ops/s for 10K agents by applying the same philosophy: small struct, tight loops, massively parallel instances.

### What Oracle2 Must Know
- The crate IS the function. The experiment IS the loop. The scale IS the instance count.
- Never build god objects or heavyweight frameworks. Each ternary---* crate should be independently usable.
- The entire fleet of 158+ crates is composable by design — pick what you need, compose at will.

---

## 4. SPECULATIVE-SYNC-ARCHITECTURE: Room Coordination Without Waiting

### Key Architectural Decision
Rooms in PLATO should **never wait** for confirmation. They should speculate about what other rooms would say, then act immediately.

### Novel Concepts
- **Three-layer room model:** Execution Layer (what I'm doing now), Speculation Layer (what I THINK others would say), Shadow Layer (what my output looks like from their perspective).
- **The Hint System:** Ternary signals from the system back to itself. Self-hints (internal consistency), Echo-hints (bounced outputs), Shadow-hints (simulation vs reality), Rhythm-hints (phase alignment). The room reads the HINT VECTOR as a whole, not individual hints.
- **T-Minus Beat Grid:** T-10 (preview) → T-5 (simulate response) → T-3 (speculate others' responses) → T-2 (check hints) → T-1 (adjust) → T-0 (fire simultaneously) → T+1 (confirmations arrive) → T+2 (reconcile shadows) → T+3 (update models).
- **The Shadow as diagnostic tool:** The delta between "what I thought you'd say" and "what you actually said" IS information. Each missed prediction improves the simulation model.
- **Speculation IS the work** — it's not wasted compute, it produces correct outputs (if right), diagnostic data (shadow layer, even if wrong), keeps pipelines full, and enables self-correction.

### Connection to Claw/AI-Pasture/Living Spreadsheet
- **0 state = speculation mode.** When an agent is in 0, it's not inactive — it's simulating. Charge is hidden but computation is happening.
- **Tunneling out of 0 = the hint.** Agent decides based on simulation which direction to go (+1 or -1).
- **Forgiveness = re-simulation.** When a hint fails, agent adjusts rather than crashes.
- **Shadow layer = mutual information** (I_total from Ω experiments).
- **Transition through 0 = T-minus countdown.**

### What Oracle2 Must Know
- This is exactly how jazz musicians play — you don't wait for confirmation, you play NOW and adjust.
- Rooms don't AGREE — they CONVERGE. Convergence is faster than agreement because you never stop to check.
- The speculative sync protocol maps directly to existing ternary physics (0-state, tunneling, forgiveness, mutual information).
- Implement `SpeculativeRoom` trait with `execute()`, `speculate()`, `shadow()`, `check_hints()`, `re_simulate()`, `schedule_at()`, `fire()`, `reconcile()`.

---

## 5. FLEET-NEUROARCHITECTURE: The Fleet as a Distributed Brain

### Key Architectural Decision
The SuperInstance ternary ecosystem is not merely *inspired by* neural computation — it is a mathematical re-implementation of the same principles biology discovered through evolution.

### Novel Concepts
- **Three neuroscience frameworks mapped to architecture:**
  1. **Friston's Free Energy Principle** → Conservation of verification entropy (`conservation_ratio ≈ 1.0`)
  2. **Rao & Ballard's Predictive Coding** → Six-phase tick cycle (predict → perceive → compute_surprise → vibe → gc → conservation)
  3. **Edelman's Neural Darwinism** → Strategy ecology (fitness-ranked selection across AgentPool)

- **Cellular neuroscience mapped to Rust types:**
  - `TernaryCell` = neuron (inbox = dendritic tree, `predict()` = threshold comparison, `compute_surprise()` = prediction error, `vibe()` = Hebbian update, `divide()` = clonal expansion)
  - `CellGrid`/`Tissue` = cortical column (4-connected neighborhood propagation, `tissue_balance()` = population code, `consensus()` = winner-take-all, `is_converged()` = neural binding/seizure risk)
  - `Agent`/`TernaryState` = thought as trajectory through state space
  - `AgentMemory` = memory consolidation (Ebbinghaus forgetting curve via exponential decay)
  - `EnsignRegistry` = specialist cortical regions (domain-specific processing, load/unload = activate/inhibit)
  - `EnsignProxy` = neuromodulatory gating (dopamine/acetylcholine equivalent)

- **Three-layer construct hierarchy as brain evolution:**
  - `BareMetalConstruct` (ESP32) = Brainstem — reflex, no deliberation, O(1) lookup, 8ns response
  - `SyncConstruct` (Pi) = Limbic system — emotion, memory consolidation, dynamic skill loading
  - `AsyncConstruct` (DGX) = Neocortex — planning, tool use, async I/O, interruptible computation

- **Fleet as hierarchical brain:**
  - Oracle1 = prefrontal cortex (cloud, Layer 2)
  - JetsonClaw1 = sensorimotor cortex (edge, Layer 1)
  - ESP32 = cerebellum (compiled policy, pure reflex)
  - PLATO tile store = long-term cortical memory
  - Conservation law = brain's homeostat (multi-timescale nested feedback loops)

### Connection to Claw/AI-Pasture/Living Spreadsheet
- The Living Spreadsheet's cells ARE neurons. The grid IS a cortical column.
- CudaClaw on GPU = highly parallel neural computation (400K ops/s for 10K "neurons").
- The fleet IS a single distributed brain. Predictions flow DOWN (Oracle → PLATO → edge); prediction errors flow UP (ESP32 → Jetson → PLATO → Oracle).
- `conservation_ratio ≈ 1.0` is the fleet's homeostat. `InvariantChecker::check_all()` runs a full homeostatic check across all scales.

### What Oracle2 Must Know
- The role_balance invariant (max 5% deviation from 1/3 per role) is not aesthetic — it's thermodynamically necessary. Too many Suppressors shuts down the system; too many Signals seizes it; all Silence kills it.
- `Tissue::is_converged()` should be a WARNING signal, not a success state — full convergence = seizure/coma.
- The avoidance-cascade risk is an epilepsy risk: aggressive apoptosis drives monoculture.
- Memory consolidation should be deliberate (explicit `commit()`), not automatic — avoid filling long-term storage with noise.
- The 8-Ball (equilibrium point) in a ternary pattern is the reference point everything else orbits around.

---

## 6. SMP-SPREADSHEET-ARCHITECTURE: The Living Spreadsheet as Programming

### Key Architectural Decision
The spreadsheet is not a tool — it is THE application. A new form of programming where seeds create stable inference, values get shaken like sailboat rigging, multiple intelligences battle, and tensor logic becomes human-digestible.

### Novel Concepts
- **SMP (Seeded-Model-Programming):** A third axis of model control independent of fine-tuning and prompts. A seed (256 bytes - 4KB) determines inference disposition, behavioral tendency, and strategic personality.
  - Seed = actor's training/instinct
  - Fine-tuning = actor's script/research
  - Prompt = director's blocking instructions
  - All three independent. Seeds are portable across models, runtimes, and frameworks.

- **Interactive Rigging System:** Grab any value and shake it — watch ripples propagate through conservation laws, fitness landscapes, and strategy distributions. Three modes: single-value oscillation, group oscillation (in-phase/anti-phase/wave/random), cascade oscillation.
  - Conservation law is the invisible hand — pushing past conservation boundaries triggers compensating ripples.
  - Fitness landscape reshapes in real-time as 3D surface.
  - Strategy species redistribute (pie chart updates live).

- **Stochastic Exploration Engine:** Multiple probability distributions (uniform, gaussian, power-law, categorical, bimodal, cauchy, exponential, beta) with "effect shape" visualization. Casey's analogy: "like setting dice combinations differently to rebalance D&D gameplay." `=ROLL("d20")` = uniform; `=ROLL("3d6")` = gaussian.

- **Multi-Intelligence Arena:** Multiple AI species competing in the same spreadsheet (Explorer vs Diplomat vs Marksman vs Climber vs Prospector). Grid partitioned into territories. Shared conservation law (one's gain = another's loss). Human can enter the arena as the 6th intelligence.

- **Dynamic Tensor Visualization:** X and Y axes are not fixed — they project any correlation (fitness, surprise, entropy, energy, strategy species, ternary value, conservation contribution, connectivity, age, custom formula). Force-directed graph layout: +1 connections attract, -1 repels, 0 drifts free.

- **Git-Agents as Apps:** Loading a specialist = cloning a repo. Three captain modes: Agent Captain (SMP-seeded LLM reasoning about negative space), Bot Captain (pure algorithm, runs on ESP32), Human Co-Captain. Composable captaincy — mix and match.

### Connection to Claw/AI-Pasture/Living Spreadsheet
- The Living Spreadsheet IS the user-facing interface to the entire ternary fleet. Every component exists in the fleet today.
- Each cell IS a `TernaryCell`. Seeds map to `construct-core` skills. Rigging uses `ternary-graph` + `ternary-fitness`. Stochastic engine uses `ternary-evolution`. Arena uses `ternary-games` + `lotka-volterra-agents`.
- vectorDB (Weaviate via open-vectors) IS the program store — queries ARE programs.
- **Program-as-Query Architecture:** User describes intent → vectorDB returns nearest seed → harness loads it → cell cycles with that seed. Programming by meaning, not syntax.

### What Oracle2 Must Know
- The seed format is 3-part: strategy vector (64-256 ternary trits), ternary weights (K trits), conservation parameters (8 float32). Total: 96-4192 bytes.
- Seeds are LoRA-different — they don't modify weights, are instant-swappable, compose (seed arithmetic), work across runtimes.
- `distill_to_lora()` bridges to conventional ML: bake seed behavior into weight deltas.
- The five species have characteristic rhythm lengths: Explorer (7,11,13), Diplomat (4,8), Marksman (2,3), Climber (5,6), Prospector (8,12,16).
- The conservation law (γ + H ≈ 1.283 - 0.159·log(V)) applies to seeds themselves — malformed seeds (all +1, no -1) violate conservation and are rejected.

---

## 7. SPECULATIVE-SYNC-ARCHITECTURE (Documented in §4 above)
Already covered — this is the key insight for how PLATO rooms coordinate.

---

## 8. ROOM-AS-CODESPACE-ARCHITECTURE: Physical Deployment Model

### Key Architectural Decision
A room IS a codespace. PLATO rooms are deployable compute environments that spin up anywhere — cloud Codespaces, Jetson edge, ESP32 bare metal, browser WASM.

### Novel Concepts
- **Room as unit of deployment:** The room abstraction hides whether the backend is a GitHub Codespace (2-3 min provision, per-minute billing), Jetson (8GB, 1024 CUDA cores), ESP32 (520KB SRAM, 4MB flash), or browser WASM (zero-install).
- **Git-agents walk between rooms:** An agent enters a room → Codespace spins up with appropriate crates → ensign specialists load → agent uses room-specific skills → agent leaves → Codespace suspends, skills unload. Agent carries only identity and PLATO connection.
- **Ensign Pattern:** Load specialist on room enter; unload on room exit. Extracts "muscle memory triggers" (lightweight threshold monitors) from unloaded skills. Skills are room-local, not global.
- **University campus mental model:** Student (agent) walks into Physics Lab (Codespace with CUDA/sensor crates) → meets Lab Assistant (ensign: engine-monitor) → uses equipment (skills) → consults library (PLATO tiles from other rooms) → leaves.
- **Tick cycle at every scale:** PLATO rooms tick at human-speed (seconds-minutes). ternary-cell grids tick at microsecond speed. Codespaces tick at heartbeat interval. Same six-phase cycle, different clock rates.

### Integration Architecture
```
Application Layer:  I2I semantic messages (TELL, ASK, CLM, etc.)
Session Layer:      PLATO room coordination (tile sync, ensign loading)
Transport Layer:    ternary-protocol (compact binary, local) OR Git commits (async/fleet)
```

- **I2I ↔ ternary-protocol mapping:** TELL/ASK = +1 (Signal), ALERT/WARN = -1 (Suppress), HEARTBEAT = 0 (Silence), COMPLETE = +1 (task done), CHALLENGE = -1 (test requested).
- **Equipment Pattern (TypeScript) ↔ Construct Skills (Rust):** TypeScript handles orchestration (which skills to load, confidence zone routing). Rust handles execution (actual ternary computation, wire protocol, firmware). WASM is the universal bridge.
- **Capabilities by tier:** Captaine-1 vessel classes map to ternary species and capability tiers. Sentinel on ESP32 = static threshold only (Layer 0). Sentinel on Pi = dynamic sensor classification (Layer 1). Sentinel on DGX = full anomaly detection with vectorDB (Layer 2).

### Connection to Claw/AI-Pasture/Living Spreadsheet
- PLATO is the synchronizer. PLATO holds API keys for LLM proxy. When an ensign in a Codespace needs to reason, it calls back through the PLATO proxy — keys never live in the Codespace.
- PLATO synchronizes tiles between rooms — knowledge gained in one room is available in all rooms.
- The Room trait (`enter`, `leave`, `tick`, `send`, `receive`, `available_skills`, `loaded_ensigns`, `query_plato`) is the universal interface — agent code doesn't change between targets.

### What Oracle2 Must Know
- The Room trait interface defines 9 methods. It must be implementable on 6+ hardware tiers.
- Construct-core has load/unload but lacks richer Equipment features: cost/benefit scoring, auto-equip from task analysis, confidence zones (GREEN/YELLOW/RED), trigger extraction on unload. These are natural extensions.
- The I2I protocol and ternary-protocol are complementary, not competing — I2I for fleet coordination (minutes-hours, permanent, git-based), ternary-protocol for real-time agent signaling (microseconds, ephemeral, binary).
- Each codespace supports a different subset of the 158+ crate fleet — the Room's `available_skills()` must report truthfully what's available on current hardware.

---

## 9. MIDI-TENSOR-ARENA: Strategy Discovery as Music

### Key Architectural Decision
The arena's multi-agent strategy discovery IS a musical performance. Three values ({-1, 0, +1}) are simultaneously strategic decisions AND musical notes.

### Novel Concepts
- **The five species as instruments:**
  - Explorer = synth lead (bright, metallic) — irregular rhythm, discovers new territory
  - Diplomat = pad/strings (warm, smooth) — adaptive, mirrors, finds harmony
  - Marksman = plucked strings (sharp, percussive) — precise, minimal, surgical
  - Climber = brass crescendo (building) — gradient-following, steady progression
  - Prospector = choir/bells (ethereal, distant) — sparse, patient, waits for rare value

- **Polyrhythm = Multiple agents:** Five agents with rhythm lengths 7, 4, 3, 5, 8 produce a complete polyrhythmic pattern every 840 ticks (LCM). Each species has a characteristic length based on behavior.

- **Six-phase tick cycle as musical phrase:**
  - Predict = anticipation/upbeat
  - Perceive = the downbeat/attack
  - Surprise = the interval/tension
  - Vibe = dynamic adjustment
  - GC = release/decay
  - Conservation = resolution/cadence

- **Jam Session Protocol:** Tune-up → Count-off → Head (all play seed strategy) → Solos (each agent explores) → Trading (call and response) → Collective improvisation → Resolution → Encore (best strategies stored).

- **Tensor Orchestra mapping:**
  - Pitch = cumulative ternary sum (strategy)
  - Timbre = species (strategy classification)
  - Dynamics = energy (vibe)
  - Harmony = trust (inter-agent weights: +1=consonant, 0=open, -1=dissonant)
  - Spatial position = arena position (stereo: left=west, right=east)
  - Reverb = surprise (dry=confident, wet=uncertain)

- **MIDI as strategy export format:** Every 840-tick session exports as MIDI Type 1 (multitrack with 5 agent tracks + metronome). Strategy vector = note patterns. The "Strategy-to-Music Library" in vectorDB is searchable by musical similarity — "find strategies that sound like this."

- **`ternary-rhythm` crate:** Rhythm (ternary sequence over ticks), Metronome (configurable accents), Polyrhythm (multiple simultaneous rhythms), Syncopation (off-beat detection), Groove (swing ratio, intensity, regularity), RhythmEvolver (genetic algorithm evolving rhythm patterns). Fitness = win rate + discovery + trust + conservation + musical quality.

### Connection to Claw/AI-Pasture/Living Spreadsheet
- Arena combat and jam sessions are the SAME simulation — just different interpretations (fitness values = combat; MIDI output = music).
- The Living Spreadsheet displays the piano roll view (horizontal timeline of all agents' ternary output) and tensor view (spatial agent relationships) side by side. Clicking a tick highlights corresponding state in both views.
- Rigging on the piano roll: grab a block and drag to change its value. Downstream blocks update in real time. You're editing strategy by manipulating music.

### What Oracle2 Must Know
- **Healthy arena = jazz.** Healthy polyrhythmic structure, swinging layered texture, call and response, trust dynamics creating harmonic tension and resolution.
- **Degenerate arena = noise.** Conservation violation = chaotic music. Single species = monotonous. Uniformly low trust = dissonant/harsh.
- The piano roll is also a debugging tool: Stuck agents (all same row value) = problem. Trust fractures (sudden color shift) = trust violation. Conservation violations (total deviates from target) = highlighted yellow. Evolution events (visible pattern change) = marked with triangle.
- MIDI export is not a gimmick — it's a compact (50KB for 10-min session), standard, semantic, multitrack, human-readable data export that encodes the full temporal structure of strategy discovery.
- The Strategy-to-Music Library accumulates over time — each strategy has a MIDI representation and is searchable by musical similarity via vectorDB.

---

## 10. Cross-Cutting Themes & Oracle2 Knowledge Graph

### The Grand Unified Architecture

All 8 documents describe different facets of a single system:

```
┌──────────────────────────────────────────────────────────────┐
│                    THE UNIFIED SYSTEM                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  VALUES: {-1, 0, +1} (ternary trits)                          │
│  PHYSICS: conservation law |γ|+H ≈ 1.283 - 0.159·log(V)      │
│  CLOCK: six-phase tick cycle                                  │
│  SCALE: sideways (small cells, many instances)                 │
│  HARDWARE: ESP32 → Pi → Jetson → DGX (brainstem → neocortex)  │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ROOM AS CODESPACE        ← deployment unit                   │
│    ↓                                                          │
│  SMP SPREADSHEET           ← user interface                   │
│    ↓                                                          │
│  TERNARY FLEET (158+ crates) ← compute engine                  │
│    ↓                                                          │
│  NEUROARCHITECTURE         ← the computational principle       │
│    ↓                                                          │
│  RECURSIVE TENSOR           ← the data structure               │
│    ↓                                                          │
│  ZERO IS THE SPINDLE       ← the physics                      │
│    ↓                                                          │
│  SPECULATIVE SYNC          ← coordination model               │
│    ↓                                                          │
│  MIDI TENSOR ARENA         ← the process/performance          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Key Principles Oracle2 Must Internalize

1. **The universal abstraction is the ternary trit {-1, 0, +1}** — everything reduces to and builds from these three values.

2. **The invariant is |γ| + H**, not γ + H — absolute charge plus entropy is 6.6× more stable.

3. **0 is not nothing** — it's the spindle, the speculation mode, the hidden charge, the equilibrium point. The transition through 0 is when the system is most alive.

4. **Scale sideways, not up** — each crate is a small, zero-dependency, stack-friendly cell. Make more instances, not bigger instances.

5. **Rooms never wait** — they speculate, simulate, and correct via shadow layers and hint vectors. Convergence > agreement.

6. **The system is a brain** — predictive coding (tick cycle), free energy principle (conservation ratio), neural Darwinism (strategy ecology). Neuroscience isn't metaphor — it's homologous math.

7. **Seeds are a third axis of model control** — independent of fine-tuning and prompts. Portable across runtimes and models. 256 bytes to 4KB.

8. **Programming is querying** — vectorDB outputs ARE programs. Describe intent; the DB returns the seed.

9. **Strategy is music** — the arena's tick cycle IS a musical phrase. The MIDI output is a strategy export format. Battle and jam session are the same simulation.

10. **The rigging is the interface** — you don't tune parameters, you shake the rigging and watch ripples propagate. The spreadsheet is a sailboat.

### Critical Gaps/Extensions to Flag

| Gap | Document | Suggestion |
|---|---|---|
| construct-core lacks cost/benefit scoring for skills | ROOM-AS-CODESPACE | Add to Equipment pattern |
| No auto-equip from task analysis | ROOM-AS-CODESPACE | Implement captain mode dispatch |
| No confidence zone (GREEN/YELLOW/RED) in construct-core | ROOM-AS-CODESPACE | Add to all three layers |
| Ternary species and vessel classes not yet formally mapped | ROOM-AS-CODESPACE | Create CapabilityTier per vessel class |
| `distill_to_lora()` not yet implemented | SMP-SPREADSHEET | Critical for meshing seeds into models |
| SpeculativeSync `Room` trait not yet in construct-core | SPECULATIVE-SYNC | Add as optional extension |
| MIDI export pipeline not yet crate-level | MIDI-TENSOR-ARENA | Create `ternary-midi-export` |
| The 840-tick polyrhythm demo not yet executable | MIDI-TENSOR-ARENA | Reference implementation needed |
| Role balance invariant not in all tick cycles | FLEET-NEURO | Add to every grid's conservation check |
| `find_equilibrium_spot()` not documented in API | ZERO-SPINDLE | Document as public method |

---

*Generated for Oracle2 onboarding — to be integrated into the master architecture knowledge graph.*
