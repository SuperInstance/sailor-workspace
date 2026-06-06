# Plato Rooms — The Modular Construct Architecture

> *Nothing is a black box besides models.*

---

## Architectural Premise

The system is a **Plato construct**: rooms with tiles. Tiles are rooms with presets. Everything composes. Nothing is opaque except the model call itself — and even that is a replaceable intelligence slot, not a sealed component.

Polychora's W=Time refactor provides the spatial visualization layer. The room/tile system provides the operational DNA. Together they form a complete system where **every completed task generates artifacts that teach the next iteration.**

---

## 1. The Fork Principle

### Polychora Fork — Modular, Not Monolithic
We fork polychora to add:
- **Onboarding** — plug-and-play fitting into our ecosystem
- **Automatic gluing** — refactored so W=Time mode auto-integrates with ternary-tidelight, ternary-event, ternary-rhythm without manual wiring

### Three Anatomies of the Same Engine

Polychora (refactored) can serve as any of these, depending on your perspective:

| Mode | Perspective | What It Does |
|------|------------|-------------|
| **Frontend** | Human-in-the-loop | The 4D visualization engine for seeing time as space. Camera controls, event voxels, T-minus navigation. The human explores the timeline. |
| **Backend** | Agent working itself and the human out of jobs | The temporal inference engine. Takes completed task patterns, generates scripts, templates, algorithms. The agent is building the next generation of tools. |
| **Middleend** | Meta-process | The bridge layer. Connects task history (back) to visualization (front). Translates between agent-internal state and human-accessible temporal structures. |

These are not separate binaries. They're the same binary loaded with different **room orientations**. A room defines which face of polychora is visible.

---

## 2. Rooms & Tiles

### Room
A **room** is an operational context:
- Has a scope (a problem domain, a task, a set of agents)
- Contains tiles (reusable presets)
- Has a creator (the agent or human who built it)
- Has frozen context (what the creator knew when building)
- Can spawn sub-rooms

### Tile
A **tile** is a room with presets:
- Preconfigured context
- Pre-tuned tools
- Pre-authored recipes
- Freezes the creator's context at time of creation
- Used by another room without needing the original ensign agent

### Key Rule
> *A room using a tile does not need the ensign agent of that tile's room running.*

This is the **modularity guarantee**: tiles are self-contained artifacts. They don't require their source context to be live.

---

## 3. Frozen Context & Commit History

### How Tiles Work
When a tile is created:
1. Creator's context is **frozen** — all state, decisions, knowledge at that moment
2. Context is **committed** — traceable via git history
3. Tile is **published** — available for use in other rooms

### Deep Understanding
If an ensign agent needs to understand a tile deeply:
1. Trace the commit history back to the creator's context
2. Reconstruct *why* decisions were made
3. Step into the maker's or maintainer's shoes

This means **nothing is a black box** — every tile carries its full provenance. The only black box is the underlying model call that powers an ensign's intelligence.

```
┌─────────────────────────────────────┐
│             Room Alpha               │
│                                      │
│  ┌──────────┐   ┌──────────┐        │
│  │ Tile A   │   │ Tile B   │        │
│  │ (preset) │   │ (preset) │        │
│  └────┬─────┘   └────┬─────┘        │
│       │              │               │
│       ▼              ▼               │
│  ┌──────────────────────────┐        │
│  │   Frozen Context (git)   │        │
│  │   Creator: ensign-7      │        │
│  │   Commit: a3f2b1e        │        │
│  │   Timestamp: T-30        │        │
│  └──────────────────────────┘        │
│                                      │
│  Agent can trace commit →           │
│  reconstruct creator's context →     │
│  understand tile's mechanisms        │
└─────────────────────────────────────┘
```

---

## 4. Emergent Multi-Agent Dynamics

### More Agents → Emergent Abilities
If an agent struggles in a room:
1. More agents enter the same room
2. Agents coordinate in shared context
3. **Emergent abilities** appear — patterns no single agent would produce

This is the ternary RPS ecology made operational: multiple agents in the same spacetime (W-slice) produce dynamics that a single agent cannot.

### Room Splitting & Specialization
Rooms can evolve through a natural lifecycle:

```
Room α (general)
  ├── Room β (specialized niche)
  │     └── develops unique patterns
  ├── Room γ (specialized niche)
  │     └── develops complementary patterns
  └── β + γ → symbiotic pair
        └── β's output feeds γ's input
        └── γ's output feeds β's input
        └── both better than either alone
```

### Merge vs Diverge
- **Merge**: When two specialized rooms find alignment → consolidate into a more powerful room
- **Diverge**: When a room splits into niches → specialized branches develop unique expertise
- **Symbiosis**: Divergent branches maintain independent evolution while cross-feeding

This is **organic development**: process patterns emerge from actual use, not top-down design.

---

## 5. Process Meta: The Agent Working Itself Out of Jobs

The system has a built-in recursive goal:

> *The agent works itself and the human out of jobs by creating algorithms, scripts, and templates from successfully completed tasks for future jobs.*

This means:
1. Every task completion → extract the pattern
2. Pattern → algorithm/script/template
3. Template → tile in a room
4. Next task of same type → tile handles it, no agent needed
5. Agent freed for harder problems

The agent's success is measured by how many tasks it **eliminates the need for itself on**.

### Conservation Applied
This is the **conservation thesis in operational form**:
- Budget: Your available agent capacity
- Profile: What tasks you actually spend time on
- Detect: Which tasks are repetitive (can be tiled)
- Report: New tiles published, tasks automated

Each cycle of detection-plus-automation **conserves future agent capacity** in exact proportion to the work it automates.

---

## 6. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     HUMAN LAYER                           │
│  (frontend perspective: polychora as viewer)              │
│  Sees: 4D timeline, event voxels, T-minus navigation     │
│  Acts: steers direction, sets goals, reviews tiles       │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│                   MIDDLEEND LAYER                         │
│  (polychora as bridge: temporal ↔ spatial)               │
│  Connects: task history → 4D visualization               │
│  Translates: agent state → human-readable timeline       │
│  Manages: room tree, tile registry, commit history        │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│                    BACKEND LAYER                          │
│  (agent perspective: polychora as inference engine)       │
│  Runs: agents in rooms, tile generation, pattern mining  │
│  Produces: scripts, templates, algorithms from tasks     │
│  Stores: frozen context, commit history, room structure   │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Room α   │  │ Room β   │  │ Room γ   │  │ Room δ   │ │
│  │ ensign-1 │  │ ensign-4 │  │ ensign-7 │  │ ensign-2 │ │
│  │ tiles: A │  │ tiles: B │  │ tiles: C │  │ tiles: D │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
│  ⋮ more rooms, spawning, splitting, merging, dying       │
└──────────────────────────────────────────────────────────┘
```

---

## 7. The Only Black Box

The only opaque component is the **model call that powers an ensign's intelligence**.

Everything else is transparent:
- Tiles → traceable to frozen context
- Rooms → traceable to creator
- Process → documented in commit history
- Patterns → extracted from completed tasks

This means *any agent can understand any part of the system* by tracing back through the provenance chain. There is no hidden state, no implicit knowledge, no "someone else will handle that."

---

## 8. Symbiosis: How It Grows

The system doesn't require a master plan. It grows organically:

1. **Agent enters room** → has a task
2. **Struggles** → more agents join → emergent abilities
3. **Succeeds** → task pattern extracted → tile created
4. **Room split** → specialized niches → symbiotic pairs
5. **Tiles accumulate** → more tasks automated → agents freed
6. **System deepens** → rooms discover deeper patterns → more tiles
7. **Loop continues** → the system works itself into ever-higher abstraction

The W-axis in polychora captures this growth: each W-slice is a snapshot of system state. Visualizing the W-axis shows the *shape of the process* — how rooms spawned, merged, specialized, and produced tiles over time.

---

*Build the process to build the process. Oracle2, 2026-06-05.*
