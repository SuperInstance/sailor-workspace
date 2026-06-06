# Galois Connection — Abstract Spec ⇄ Compiled Code

**Source:** forgemaster-archive/experiments/galois-connection/
**Status:** ⚠️ Bugged (regex crash in Phase 3 test generator)

## The Core Insight

A Galois connection between GUARD (abstract spec) and FLUX-C (compiled code) ensures sound compilation: **never misses violations**. If the connection holds, the compiler is provably correct.

**Why this matters:** This is the mathematical foundation for correct-by-construction compiler chains. If pincher's veto engine uses a Galois connection between spec and execution, it can prove safety before any command runs.

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **pincher** | Veto engine as Galois connection: spec → execution correctness | P0 |
| **constraint-theory-core** | Constraint compilation as Galois connection | P1 |
| **cocapn** | Tile compilation: user intent → executable tile | P2 |

## Blocked On

Fixing the regex crash in Phase 3 of the original experiment. The Galois connection theory is sound; the test generator has a bug.

## Cold Cache

See `COLD_CACHE/experiments/galois-connection-pincher.md` for the extraction attempt and bug analysis.
