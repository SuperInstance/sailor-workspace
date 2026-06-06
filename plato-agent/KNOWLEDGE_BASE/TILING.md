# Tiling Meta-Pattern — 2.13× Efficiency

**Source:** Golden Insights, TILING-EXPERIMENT-01.md, forgemaster-archive/plato/plato-tiles/

## The Core Insight

Agent work decomposes into reusable **tiles** — parameterized work units that any agent can apply across crates. The TypeUnificationTile hit 100% pass rate with 2.13× efficiency over manual refactoring.

**This means:** Repetitive structural work should never be done manually. Build a tile once, run it across N crates.

## PLATO Tiles

The forgemaster-archive has 20+ plato tiles already documented:
- tile-0001: constraint-propagation (CSP fundamentals)
- tile-0004: consistency-algorithms
- tile-0005: nmea-gpu-parsing  
- tile-0007: constraint-aware-scheduling
- tile-0013: ptx-serialization-jit
- tile-0015: warp-reduction-optimization
- tile-0017: gpu-thermal-constraints
- tile-0019: shared-memory-optimization
- tile-0020: csp-fundamentals

These tiles are GPU constraint patterns. An agent could parameterize and apply them across the ternary crate fleet.

## Applied To

| Repo | How Tiling Applies |
|------|--------------------|
| **constraint-theory-core** | Run tiling experiments: 418K token savings projected across 35-50 ternary crates |
| **all ternary-* crates** | Type migration, API renaming, feature addition — all tileable |
| **pincher** | Tile-based reflex generation: one tile = parameterized reflex for N sensor types |
| **cocapn** | The Tile is already its core unit. This formalizes the parameterization. |
| **forgemaster** | Plu-to tiles are a gold mine of GPU constraint patterns waiting to be generalized |

## Expansion Potential

Create a `tile-factory` crate that:
1. Takes a tile template (parameterized work unit)
2. Applies it to N targets (crates, repos, files)
3. Generates cold cache for each application
4. Reports success/failure per target

This is the **assembly line for agent work**.
