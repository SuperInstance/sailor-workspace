# Pythagorean48 Encoding — Zero-Drift Vectors

**Source:** forgemaster-archive/experiments/pythagorean48-encoding/

## The Core Insight

Exact integer-ratio unit vectors from Pythagorean triples. After 1000+ chained rotations:
- **Pythagorean48**: Zero drift (exact, forever)
- **Float32**: 1.72×10⁻⁵ accumulated drift (gets worse with each rotation)

128 unique direction vectors with 2.3° median angular resolution. Maps cleanly to INT8 fixed-point.

**Why this matters:** Chained transformations in constraint propagation accumulate errors. Pythagorean48 removes the error term entirely.

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **constraint-theory-core** | Replace float direction vectors → eliminate renormalization | P1 |
| **pincher** | Reflex direction matching on exact vectors | P2 |
| **ternary-spatial** | Geographic direction encoding without drift | P2 |
| **polychora-temporal** | Temporal rotation operators without accumulation error | P2 |

## Cold Cache

See `COLD_CACHE/experiments/pythagorean48-constraint-theory.md` for extraction attempt — direction vector alignment issue noted.
