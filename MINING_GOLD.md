# Mining Gold — Salvaged from the Archives

> Extracted 2026-06-06 from forgemaster-archive, fleet-command-bridge, and old repos.
> "Old thought patterns in new environments produce new insight."

---

## 1. Eisenstein Quantization — Hexagonal A₂ Lattice

**Source:** forgemaster-archive/experiments/eisenstein-quantization/
**Relevance:** The natural number system for ternary. Hexagonal lattice is the densest 2D packing — same mathematical structure as balanced ternary.

**Key insight:** Eisenstein integers (ℤ[ω]) provide exact quantization on the hexagonal lattice. The A₂ root lattice is the 2D projection of the E₈ lattice family used in topological quantum computing.

**Revival idea:** Use Eisenstein quantization as the numerical backbone for ternary geographic/geometric reasoning in pincher. The hexagonal grid maps naturally to ternary trits.

---

## 2. Pythagorean48 Encoding — Zero-Drift Vectors

**Source:** forgemaster-archive/experiments/pythagorean48-encoding/
**Relevance:** Exact integer-ratio unit vectors from Pythagorean triples. Zero drift after 1000+ chained rotations. Float32 accumulates 1.72×10⁻⁵ drift in the same time.

**Key result:** 128 unique direction vectors (2.3° median angular resolution) with exactly zero drift forever. Maps cleanly to INT8 fixed-point.

**Revival idea:** Replace floating-point direction vectors in constraint-theory-core with Pythagorean48 encoding. Eliminates renormalization and drift accumulation in chained constraint transformations.

---

## 3. Laman Rigidity — The 2N−3 Threshold

**Source:** forgemaster-archive/experiments/laman-rigidity/
**Relevance:** Graph rigidity theory proves exactly how many constraints a system needs: 2N−3 edges for N nodes in 2D. The threshold sharpens from "soft" at N=6 (70% below-threshold still rigid) to "razor-sharp" at N=15 (0%).

**Revival idea:** Cocapn's constraint compilation pipeline can use Laman's theorem for O(1) rigidity/sufficiency checks (for N≥20), replacing expensive subset enumeration.

---

## 4. Deadband SNR — Not a Low-Pass Filter

**Source:** forgemaster-archive/experiments/deadband-snr/
**Relevance:** Deadband is NOT a low-pass filter — it exploits temporal sparsity. 89% correlation on sparse signals vs 39% for moving average. Moving average actually *degrades* SNR by 5.6 dB on sparse data.

**Key math:** suppression_rate = erf(τ / (σ√2)) — tight theoretical bound, verified empirically.

**Revival idea:** Deadband is the correct signal processing primitive for ternary systems. Matches the "0 is not nothing" principle — the neutral state silently holds between threshold crossings.

---

## 5. GPU K-ary Search — Constraint Theory Deep Dive

**Source:** forgemaster-archive/memory/deep-research.md
**Relevance:** 16-ary search on 41K triples = only 4 levels (vs 16 for binary). K-ary reads from contiguous blocks → coalesced GPU memory access. Also covers __ldg() texture cache, merge path for sorted queries, warp-cooperative search.

**Revival idea:** Constraint-theory-core's GPU kernel was built from these notes. Worth revisiting the k-ary layout for the batch query path.

---

## 6. Galois Connection (Incomplete)

**Source:** forgemaster-archive/experiments/galois-connection/
**Status:** ⚠️ Bugged — regex crash in Phase 3 test generator
**Hypothesis:** Galois connection between GUARD (abstract spec) and FLUX-C (compiled code) ensures sound compilation: never misses violations.
**Revival:** Fix the regex bug, complete the experiment. Galois connections are the math behind correct-by-construction compiler chains.

---

## 7. Forgemaster Lessons Learned

**Source:** forgemaster-archive/memory/lessons-learned.md

Key autonomous agent patterns:
- **GC in three layers**: build artifacts → source archives → batch scripts
- **Rate limiting**: 60 req/min = 1 req/sec sustained. Add detection + backoff
- **Tool agent OOM**: Claude Code for architecture, direct writing for code, Kimi for single-file <200 lines
- **crates.io checklist**: Max 5 keywords, no git deps, edition 2021, test with --dry-run
- **Rebase dance**: Every push needs `pull --rebase` before `push`

---

## 8. Fleet Command Bridge Specs

**Source:** fleet-command-bridge/BRIDGE_SPEC.md, api-spec.json, bridge-report.md
**Gold preserved at:** workspace with the fleet-command-bridge directory (source only, 72K)

A Fleet-to-fleet command protocol with API specs and test client. The bridge spec defines how Oracle2 and Forgemaster coordinate. Currently superseded by the I2I bottle protocol but the REST API patterns are worth studying for nebula's future admin endpoints.

---

## What Was GC'd

| Directory | Size | Reason |
|-----------|------|--------|
| fleet-command-bridge/target/ | 646M | Build artifacts |
| fleet-audit/ | 229M | Redundant repo copies |
| pincher-legacy-mine/ | 186M | On GitHub already |
| forgemaster-archive/.git/ | ~100M | Git history |
| forgemaster-archive/kimi-swarm-results-2/ | ~21M | Duplicate |
| cocapn-marine/target/ | ~120M | Build artifacts |
| DeckBoss/node_modules/ | 62M | Reinstallable |
| **Total reclaimed** | **~1.4G** | |

**Remaining gold:** forgemaster-archive/ experiments + research + docs (~200K), fleet-command-bridge/source (72K), i2i-vessel/, baton-system/
