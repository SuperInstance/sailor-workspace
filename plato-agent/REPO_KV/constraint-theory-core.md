# Constraint-Theory-Core — Constraint Compilation Engine

**L-Level:** L1 · **Phase:** P0 (261 tests, production)
**Local:** Not cloned separately (available through pincher workspace)

## What It Is

Zero-dependency constraint theory library. 261 tests. Benchmarks for constraint propagation, consistency, GPU kernels. The base library for the entire constraint fleet.

## Cross-Pollinated Knowledge

| Knowledge | Application | Status |
|-----------|------------|--------|
| **TILING** | Run tiling experiments across 35-50 ternary crates (418K token savings) | 💡 Opportunity |
| **LAMAN_RIGIDITY** | Implement 2N-3 check as standard constraint operation | P0 |
| **PYTHAGOREAN48** | Replace float direction vectors, eliminate renormalization | P1 |
| **DEADBAND_SNR** | Deadband as constraint: only report when change exceeds threshold | P2 |
| **EISENSTEIN_QUANTUM** | Geometric constraint encoding on hexagonal grid | P2 |
| **GALOIS_CONNECTION** | Constraint compilation as Galois connection between spec and execution | P1 |
| **CONSERVATION_CROSS_DOMAIN** | Implement the ConservationDomain struct | P1 |

### From MINING_GOLD:

| Gold | Application | Status |
|------|------------|--------|
| GPU K-ary Search | Batch query path optimization | 💡 Unmined |
| Laman 2N-3 | Core library operation | P0 |
| Pythagorean48 | Direction vector replacement | P1 |

## Expansion Readme Potential

- **The Conservation Domain**: One struct for any resource budget.
- **Laman Rigidity in O(1)**: How 2N-3 saves constraint compilation time.
- **Zero-Drift Vectors**: Pythagorean48 eliminates float error in chained transformations.
