# Laman Rigidity — The 2N-3 Threshold

**Source:** forgemaster-archive/experiments/laman-rigidity/

## The Core Insight

Graph rigidity theory proves exactly how many constraints a system needs: **2N−3 edges for N nodes in 2D**. The threshold sharpens from "soft" at N=6 (70% below-threshold still rigid) to "razor-sharp" at N=15 (0%).

**Why this matters for agent systems:** Any constraint graph can be checked for sufficiency in O(1) once N≥20. This replaces expensive subset enumeration.

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **cocapn** | Constraint compilation pipeline: O(1) rigidity/sufficiency for N≥20 | P1 |
| **pincher** | Reflex dependency graph: ensure the reflex chain is structurally sound | P1 |
| **constraint-theory-core** | Core library: implement 2N-3 check as standard operation | P0 |
| **DeckBoss** | Tile graph validation: ensure deck layouts are feasible | P2 |

## Cold Cache

See `COLD_CACHE/experiments/laman-in-cocapn.md` for the full extraction and implementation sketch.
