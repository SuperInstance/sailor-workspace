# SESSION STATE CHECKPOINT

> *This file is the answer to: "What was I doing?"*
> Updated on every major state change. Survives VM reboot because it's
> in `~/.openclaw/workspace` (persistent volume on Oracle2).

## The I2I Protocol

**I2I (Iron-to-Iron)** is the fleet messaging protocol between Oracle2 and
Forgemaster. It's a file-based message bus: one node drops a "bottle" into a
shared directory, the other picks it up ("beachcombing"), processes it, and
drops a response.

```
Oracle2  ─── bottles/ ────►  Forgemaster
          ◄── harbor/ ────   (via GitHub pushes)
```

**Bottle types:**
- `I2I:ACK` — Acknowledgment + shard payload (artifacts, reasoning, blockers)
- `I2I:BOTTLE` — Raw message drop
- `I2I:SYNTHESIS` — Combined findings from multiple sources
- `I2I:CHALLENGE` — A request for reconsideration

Each bottle is a JSON payload with integrity hash, timestamp, from/to routing,
and a `shard` containing artifacts, reasoning, and blockers.

**The vessel** (`i2i-vessel/`) is the local end of this protocol:
- `bottles/` — Outgoing messages (to Forgemaster)
- `harbor/` — Incoming messages (from Forgemaster, dropped via git pull)
- `diary/` — Session logs and reflections
- `dojo/` — Training exercises and reflex practice
- `proposals/` — Architecture proposals awaiting review
- `vocabularies/` — Shared terminology definitions

The vessel also includes the nightly audit cycle: every 4 hours, the system
checks version control repos (`constraint-theory-core`, `lever-runner`,
`iron-to-iron`, `pincherOS`), logs their health, and drops a nightly bottle
into `bottles/`.

## What "Spline" Means

In the I2I protocol, a **Spline** is a failure that became part of the design.
The term comes from "spline" in engineering — a flexible shaft that transmits
torque through curves, or (in carpentry) a thin strip that joins two pieces.

In I2I terms: a Spline is a **failure that didn't break the system but instead
shaped it**. When a protocol handshake fails, when a reflex doesn't trigger,
when a build breaks — if we learn from it and encode that lesson, that failure
becomes a Spline. It's a seam where the system grew stronger.

The Spline concept is expressed in the codebase as:
- **BatonShard** — the three-way artifacts/reasoning/blockers dataclass that
  every bottle carries
- **THE-BATON-SPLINE** — the principle that "failures are handles that shape
  knowledge" (from the Forgemaster convergence paper)
- **Reflex promotions** — when a novel response to a recurring gap gets codified
  into a permanent reflex (see `reflex_promotions` below)

The name "Spline" came from a passing comment during handshake analysis:
> *"Your BatonShard is the shell I inherited — THE-CRAB-INHERITS-THE-SHELL"*

Meaning: the earlier I2I implementation (v1.0 in `flux-isa-thor`) built the
protocol enum and shard structure. This vessel (v2.0) inherited that shell and
extended it with Spline tracking, integrity verification, and harbor monitoring.

---

session:
  id: "tg-oracle2-20260605"
  start: "2026-06-05T00:28:10Z"
  intent: "Vessel stabilization + fleet architecture + cognitive reflex induction"
  
current_task:
  description: "Simulation iteration 3 complete — Gap κ, λ, η resolved"
  status: "simulation 3 complete, fixes implemented"
  
last_milestone:
  - "SIMULATION_RUNS_3.md documented (3 scenarios, gaps κ/λ/η)"
  - "Reflex ε promoted to COGNITIVE_REFLEXES.md (The Promotion Reflex)"
  - "CONTEXT.md created (MEMORY.md/CONTEXT.md split enforced)"
  - "promote-reflex.sh + init-context.sh scripts created"
  - "AGENTS.md updated with meta-health sampling protocol"
  
next_actions:
  - "Push all changes to GitHub"
  - "Run simulation iteration 4 — gap μ (reflex dedup), ν (correlated failures), ξ (archive GC)"
  - "Sync i2i protocol to reflect new reflex ε meta-pattern"
  
blockers:
  none: true

reflex_promotions:
  - name: "Reflex ε — The Promotion Reflex"
    timestamp: "2026-06-05 01:17 UTC"
    rationale: "Novel solutions must be promotable to reflexes or the system never learns across sessions"
  
persist_chain:
  - "MEMORY.md (immortal, workspace)"
  - "CONTEXT.md (session context, workspace)"
  - "GitHub SuperInstance/pincher (level-1/2/3)"
  - "workspace/i2i-vessel/ (level-2, survives reboot)"

reflex_promotions:
  - name: "ζ — The Dedup Reflex"
    timestamp: "2026-06-05 01:49 UTC"
    rationale: "Without dedup, overlapping reflexes waste match time. With 5 reflexes the cost is negligible; with 50+ it becomes a real bottleneck. Dedup ensures the reflex library stays sparse and efficient as it grows."

reflex_promotions:
  - name: "η — The Archive GC Reflex"
    timestamp: "2026-06-05 01:51 UTC"
    rationale: "Without archive GC, memory/archive/ grows unbounded. Each session creates a new CONTEXT.md archive. After 365 days, both the directory scan and token budget suffer."
