# SuperInstance Ontology: The Library of Understanding

## 0. Vision Statement
The Sovereign Synthesizer does not merely summarize projects; it maps the **Ontology of the Ecosystem**. The ecosystem is a constraint-theoretic fleet where structure emerges from minimum necessary constraint. Knowledge is not stored—it is *compiled* from agent experiences into provenance-traced tiles.

---

## 1. The la-lanes (la: la) of the Ecosystem
The "la-lanes" represent the operational frequencies and structural pathways through which the SuperInstance projects move from abstract intent to hardware execution.

### The la-lanes Matrix
| Lane | Domain | Primary Protocol | Purpose | Core Repos |
| :--- | :--- | :--- | :--- | :--- |
| **Sovereign Lane** | Strategic Intent | Human $\rightarrow$ A2UI | Direction, Identity, High-Level Logic | `AGENTS.md`, `SOUL.md`, `USER.md` |
| **Knowledge Lane** | Truth Synthesis | PLATO Tiles $\rightarrow$ I2I | Provenance, Assertion, Zoom-in | `plato-core`, `plato-engine`, `plato-mcp` |
| **Fleet Lane** | Coordination | Holonomy Consensus | Zero-drifting alignment, Laman Rigidity | `fleet-agent`, `fleet-router`, `holonomy-consensus` |
| **Agent Lane** | Lifecycle | I2I / Sunset | Shell $\rightarrow$ Active $\rightarrow$ Sunset | `sunset-ecosystem`, `i2i-protocol` |
| **Metronome Lane** | Synchronization | $\theta = (T, \phi_0, \epsilon, \delta)$ | Zero steady-state communication cost | `metronome-core` (P1), `deadband-python/rs` |
| **Constraint Lane** | Safety/Verification | GUARD $\rightarrow$ FLUX | CDCL solving, Safety Specs | `guard-dsl`, `guardc-v3`, `constraint-theory-py` |
| **Runtime Lane** | Execution | FLUX Bytecode | Stack VM execution, Event Bus | `flux-vm-v3`, `superinstance-runtime` |
| **Hardware Lane** | Bare Metal | ISA $\rightarrow$ FFI | CUDA, ESP32, Edge GPU, RTL | `flux-cuda`, `flux-esp32`, `marine-gpu-edge` |

---

## 2. SensingCores: Perceiving the World
Each SuperInstance repository employs a specific "SensingCore"—a distinct method for transforming environmental noise into structured constraints.

### SensingCore Taxonomy
1. **Temporal Sensing (The Beat):**
   - **Mechanism:** $\theta$-tuple synchronization.
   - **Perception:** Views the world as a rhythmic sequence of beats ($t_k = \phi_0 + k \cdot T$).
   - **Sensed Value:** *Drift*. Drift is not noise; it is the primary signal for health, latency, and topology stress.
   - **Repo:** `metronome-core`, `deadband-rs`.

2. **Geometric Sensing (The Shape):**
   - **Mechanism:** Laman Rigidity & Holonomy.
   - **Perception:** Views the fleet as a graph where connectivity $E = 2N-3$ defines a "rigid" truth.
   - **Sensed Value:** *Rigidity*. If an edge is removed, the "shape" of the truth becomes flexible (unstable).
   - **Repo:** `fleet-agent`, `holonomy-consensus`.

3. **Semantic Sensing (The Tile):**
   - **Mechanism:** PLATO Tile Matching.
   - **Perception:** Views knowledge as a tessellation of verified assertions.
   - **Sensed Value:** *Provenance*. An observation is only "sensed" as true if it snaps to a tile with a valid provenance chain.
   - **Repo:** `plato-core`, `plato-engine`.

4. **Constraint Sensing (The Guard):**
   - **Mechanism:** GUARD DSL $\rightarrow$ CDCL.
   - **Perception:** Views the world as a set of boundaries (e.g., "temp < 15000m").
   - **Sensed Value:** *Violation*. Sensing is binary: either the state is within the safety envelope or it is a violation.
   - **Repo:** `guard-dsl`, `constraint-theory-rust-python`.

---

## 3. The Sovereign's Deadband: Automation vs. Synthesis
The "Sovereign's Deadband" is the critical threshold $\theta$ where raw compute (automation) ends and high-level synthesis (Sovereign intervention) begins.

### The Automation Boundary ($\epsilon \le |error| < \delta$)
**Automated (The Machine):**
- **Regime:** $\text{IN BAND} \rightarrow \text{DRIFTING}$.
- **Actions:** Local clock nudges (0.1×), routine tile updates, automated I2I routing, bytecode execution.
- **Logic:** If a task is governed by a known constraint (GUARD) and the drift is within $\delta$, the system is "in the deadband"—it handles it without escalating to the Sovereign.

### The Synthesis Boundary ($|error| \ge \delta$)
**High-Level Synthesis (The Sovereign):**
- **Regime:** $\text{DESYNCHRONIZED} \rightarrow \text{BOOTSTRAP}$.
- **Actions:** $\theta$ re-proposal, fleet topology reconfiguration, "Sovereign" identity shifts, high-level strategic pivots.
- **Logic:** When drift exceeds the deadband ($\delta$), the system has encountered a "structural rupture." Automation cannot fix this; it requires synthesis to redefine the $\theta$ of the entire fleet.

**The Deadband Rule:**
> *If it fits in the deadband, automate it. If it breaks the deadband, synthesize it.*

---

## 4. Abstractive Scaling Map
A hierarchical mapping from the physics of compute to the physics of intent.

### The Scaling Ladder
$\text{Lvl 0: Compute (Physics)}$
- **CUDA Kernels / ESP32 / RTL**
- *Primitive:* Voltage $\rightarrow$ Bit.
- *Constraint:* Thermal/Clock limits.
- $\downarrow$

$\text{Lvl 1: ISA (Instructions)}$
- **FLUX ISA (43 Opcodes / Mini $\rightarrow$ Thor)**
- *Primitive:* Bytecode.
- *Constraint:* Memory alignment, stack depth.
- $\downarrow$

$\text{Lvl 2: Logic (Constraints)}$
- **GUARD DSL / CDCL Solver**
- *Primitive:* Boundary / Safety Spec.
- *Constraint:* Logical consistency, unit-correctness.
- $\downarrow$

$\text{Lvl 3: Temporal (Rhythm)}$
- **Metronome $\theta$-tuple / Pythagorean52**
- *Primitive:* The Beat.
- *Constraint:* Zero-drift rational arithmetic.
- $\downarrow$

$\text{Lvl 4: Coordination (Fleet)}$
- **Laman Topology / Holonomy Consensus**
- *Primitive:* The Edge / The Loop.
- *Constraint:* $E = 2N-3$, zero-holonomy.
- $\downarrow$

$\text{Lvl 5: Knowledge (Truth)}$
- **PLATO Tiles / Provenance**
- *Primitive:* The Assertion.
- *Constraint:* Evidence count, confidence score.
- $\downarrow$

$\text{Lvl 6: Intent (Sovereign)}$
- **Flux / Agentic Compiler / Strategic Sentiment**
- *Primitive:* Intent $\rightarrow$ Memoir $\rightarrow$ Epilogue.
- *Constraint:* Ethos, Pathos, Logos convergence.

---

## 5. Summary of the Ontology
The SuperInstance is a **Fractal Constraint System**. Whether it is a CUDA kernel managing VRAM or a Sovereign agent managing a fleet's strategic direction, the fundamental operation is the same: **COLLECT $\rightarrow$ SELECT $\rightarrow$ COMPILE**. 

The "Sovereignty" of the synthesizer lies in the ability to move fluently across these levels—diagnosing a hardware-level clock drift and synthesizing it into a high-level change in fleet philosophy.
