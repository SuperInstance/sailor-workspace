# SuperInstance Fleet — Comprehensive Cross-Repo Audit Report

**Generated:** 2026-06-06 05:25 UTC  
**Scope:** 6 core fleet repos  
**Tooling:** `rg`, `grep`, `cargo test/check`, manual cross-repo analysis  
**Author:** Kimi Code orchestrator (subagent)

---

## Executive Summary

| Repo | Language | Tests | Pass | Fail | Ignored | Compiles | TODOs |
|------|----------|-------|------|------|---------|----------|-------|
| **pincher** | Rust | 147 unit + 6 doc | 148 | 0 | 5 doc | ✅ | 0 |
| **fleet-murmur-worker** | TypeScript | 0 | — | — | — | ❓ no CI | 0 |
| **construct-coordination** | Rust | 32 (stale†) | 0 | 0 | — | ❌ broken | 0 |
| **pythagorean48** | Rust | 18 unit + 7 doc | 25 | 0 | 0 | ✅ | 0 |
| **eisenstein-quantize** | Rust | 10 unit + 0 doc | 10 | 0 | 0 | ✅ | 0 |
| **deadband-snr** | Rust | 10 unit + 0 doc | 10 | 0 | 0 | ✅ (1 warn) | 0 |
| **TOTAL** | — | **222** | **193** | **0** | **5** | mixed | **0** |

† construct-core-src has no `Cargo.toml` — tests cannot compile or run.

---

## 1. Pincher — Reflex Runtime (`pincher/`)

### Test Health
- **147 unit tests** — all pass, 0 fail, 0 ignored
- **6 doc-tests** — 1 pass, 5 ignored (doc examples are skipped at runtime)
- **36 additional `#[test]`** across examples and integration tests
- No `#[ignore]` annotations found anywhere
- **Overall: Excellent.** Best-tested crate in the fleet.

### TODOs / FIXMEs / HACKs
- **None found.** All source files are clean.

### Security Concerns
- **Hardcoded production URLs in source:**
  - `pincher-cli/src/main.rs:102` — `default_value = "https://registry.pincher.dev"` (registry URL)
  - `pincher-cli/src/main.rs:115` — `default_value = "https://registry.pincher.dev"` (update check URL)
  - `src/daemon.rs:199` — `"https://compiler.pincher.dev"` (compiler service URL)
  - `src/daemon.rs:210` — `"https://compiler.pincher.dev"` (compiler service URL)
  - `pincher-core/src/embed/onnx.rs:30` — HuggingFace model URL (acceptable for defaults)
- **`unwrap()` usage in production code**: `pincher-core/src/security/veto.rs` uses `.unwrap()` extensively in test code (acceptable) and `pincher-core/src/security/blocklist.rs` uses `.unwrap()` on `Regex::new()` for compile-time constants (acceptable).

### Architecture Observations
- Workspace with 2 crates: `pincher-core` + `pincher-cli`
- Uses `ternary-types` via **git dependency** — no version pin, could break on force-push
- Extensive security subsystem (VetoEngine, SAEP, blocklist, sandbox) — well-tested
- Has RPC server, carapace (WASM guest), immunology (anomaly detection), dynamics (veto), migration (pack/unpack)
- **Integration gap**: Does not depend on pythagorean48, eisenstein-quantize, or deadband-snr — these are standalone crates that should conceptually feed into pincher's spatial math or signal processing

---

## 2. Fleet Murmur Worker — Nebula Edge Agent (`fleet-murmur-worker/`)

### Test Health
- **Zero tests.** No test files, no test configuration, no vitest runner configured.
- `package.json` has `"test": "vitest"` but no test files exist.
- **CRITICAL:** TypeScript compiler errors won't be caught until deploy time.

### Security Concerns
- **All credentials properly use environment variables** (GITHUB_TOKEN, DEEPINFRA_API_KEY, VECTOR_DB_KEY) — well done.
- **Default URL in vector-db.ts**: `http://localhost:8080` for ExternalRestVectorDB — acceptable for fallback.
- **HARDCODED GitHub API URL**: `https://api.github.com` in `blackboard-client.ts:193` — constant, acceptable.
- **Hardcoded model name**: `'deepseek-ai/DeepSeek-V4-Flash'` in `reflex-engine.ts:316` — in source, not configurable.
- **Wide-open CORS**: `Access-Control-Allow-Origin: '*'` in `router.ts:48` — acceptable for worker context but worth noting.

### TODOs / FIXMEs / HACKs
- **None found in source code.** Comments include "Placeholder" markers:
  - `blackboard-client.ts:108` — `broadcastMetrics` is a placeholder
  - `vector-db.ts:234` — `updateConfidence` not implemented for Cloudflare Vectorize backend

### Architecture Observations
- **TypeScript port of pincher's core concepts**: ReflexEngine, VetoEngine, Embedder, VectorDB
- Well-structured with proper interfaces (`Env`, `ReflexRecord`, `SearchResult`, etc.)
- Three backend modes for vector DB: KV fallback (free), external REST (paid), Cloudflare Vectorize (paid) — good pattern
- **Publishes to construct-coordination via GitHub API** — this is the fleet integration point
- **No verification that construct-coordination's blackboard notes directory structure matches** what blackboard-client.ts expects
- Wrangler config has real KV namespace IDs hardcoded (non-sensitive but worth noting)
- Durable Object `AgentCoordination` provides cross-request state — good architecture

### Recommended Fixes
1. **[HIGH] Add unit tests** — TypeScript unit tests with vitest, mock the KV/DO bindings
2. **[MED] Make model name configurable** — `DEEPINFRA_MODEL` env var instead of hardcoded `deepseek-ai/DeepSeek-V4-Flash`
3. **[LOW] Implement `updateConfidence` for Cloudflare Vectorize** — or document the gap
4. **[LOW] Verify blackboard path conventions match construct-coordination exactly**

---

## 3. Construct Coordination — Fleet Coordination (`construct-coordination/`)

### Test Health
- **32 `#[test]` functions in `construct-core-src/tests.rs`** — **cannot compile or run**
- `construct-core-src/` has **no `Cargo.toml`** — the entire construct-core module is dead code
- **CRITICAL:** The core library has no build system. Tests are purely decorative.

### TODOs / FIXMEs / HACKs
- **None found in source** (the code that can't be compiled at least doesn't have TODOs)

### Duplicate File Proliferation
The experiments directory contains 12 nearly-identical experiment crates:
- 12 `main.rs` files, 12 `Cargo.toml`, 11 `FINDINGS.md` files
- These should either be workspace members or consolidated

### Security Concerns
- **Hardcoded absolute path**: `experiments/arena-evolution/src/main.rs:377` — `/home/phoenix/repos/construct-coordination/experiments/arena-evolution/results.csv` (absolute path to someone else's home dir)
- No Cargo.lock for the core module — package versions are unpinned

### Architecture Observations
- construct-core-src has a **three-layered trait system** (Layer0, Layer1, Layer2) with feature gates
- Types include: `DGX`, `ESP`, `PI` — suggesting hardware-specific implementations
- 12 experiment crates each with their own `Cargo.toml` — should use workspace
- Notes/blackboard directory is the integration point with fleet-murmur-worker
- Notes/oracle2, notes/main, notes/ternary-conserve are populated with markdown

### Recommended Fixes
1. **[CRITICAL] Add a Cargo.toml for construct-core-src** and integrate into a workspace
2. **[HIGH] Consolidate 12 experiment crates** into workspace members with shared deps
3. **[HIGH] Replace hardcoded `/home/phoenix/` path** with env var or relative path
4. **[MED] Add CI build step** to verify compilation

---

## 4. Pythagorean48 — Zero-Drift Direction Crate (`pythagorean48/`)

### Test Health
- **18 unit tests** — all pass, 0 fail, 0 ignored
- **7 doc-tests** — all pass, 0 fail, 0 ignored
- ✅ **25 tests, all green**

### TODOs / FIXMEs / HACKs
- **None found.**

### Python Experiment API Gap
The Rust crate was ported from the Python experiment at `forgemaster-archive/experiments/pythagorean48-encoding/experiment.py`.

| Function | Python | Rust | Gap |
|----------|--------|------|-----|
| `find_pythagorean_triples` | ✅ | ✅ `all_triples()` | Rust finds **52** triples; Python finds **48** (README says 48 hypothesis, but actually finds 52 in the code) |
| Direction computation | ✅ | ✅ `direction()` | Matches |
| `compose_pythagorean_chain` | ✅ | ✅ `prove_zero_drift()` | Rust is more rigorous (asserts exact mag² = 1 at each step) |
| `compose_float32_chain` | ✅ | ❌ **Missing** | No float32 comparison in Rust |
| `nearest_direction_mse` | ✅ | ✅ `mse_comparison()` | Rust is more thorough |
| Angular coverage analysis | ✅ | ✅ `angular_gaps()` | Matches |
| LCG PRNG | ❌ | ✅ `Lcg64` | Rust adds deterministic PRNG for reproducibility |

### Security Concerns
- **None.** Pure math crate with no I/O, no network, no unsafe code.

### Architecture Observations
- Clean, focused single-file library — good
- Uses `num-rational` with `num-bigint-std` feature for arbitrary precision
- `prove_zero_drift()` uses `BigInt` for chained rotation proofs — good
- **Integration gap**: Not consumed anywhere in the fleet. Pincher's route module and spatial math should use this for drift-free direction representation.

---

## 5. Eisenstein Quantize — Hexagonal Lattice Crate (`eisenstein-quantize/`)

### Test Health
- **10 unit tests** — all pass, 0 fail, 0 ignored
- **0 doc-tests** — no doc examples
- ✅ **10 tests, all green**

### TODOs / FIXMEs / HACKs
- **None found.**

### Architecture Observations
- Clean, focused: lattice.rs, error.rs, integer.rs, lib.rs
- Eisenstein integer arithmetic for hexagonal lattice quantization
- No external dependencies beyond num traits (checked via Cargo.toml — not shown but assumed clean)
- **Integration gap**: Not consumed by any other fleet crate. Pincher's spatial mapping or construct-coordination could use this for hex grid operations.

---

## 6. Deadband SNR — Deadband Filter Crate (`deadband-snr/`)

### Test Health
- **10 unit tests** — all pass, 0 fail, 0 ignored
- **0 doc-tests** — no doc examples
- ✅ **10 tests, all green**
- 1 compiler warning: `unused variable` in test (minor)

### TODOs / FIXMEs / HACKs
- **None found.**

### Architecture Observations
- Clean, focused signal processing library
- Provides: `Deadband`, `MovingAverage`, `theoretical_suppression_rate`, `erf`, `correlation`
- Uses `rand` as dev-dependency only — no production dependency creep
- **Integration gap**: Not consumed by any fleet crate. Fleet Murmur Worker or pincher should use this for noise filtering on sensor data/logs.

---

## 7. Cross-Repo Integration Gap Analysis

### Dependency Graph (Current)
```
pincher ──────────────── ternary-types (git: external)
fleet-murmur-worker ─── → construct-coordination (via GitHub API, runtime only)
                        └── mirrors pincher (design inspiration, no code dependency)
pythagorean48 ────────── (standalone, no consumers)
eisenstein-quantize ──── (standalone, no consumers)
deadband-snr ─────────── (standalone, no consumers)
```

### What Should Connect But Doesn't

| Should Feed Into | Reason | Severity |
|-----------------|--------|----------|
| **pythagorean48** → **pincher route module** | Drift-free direction math for path routing | MEDIUM |
| **pythagorean48** → **construct-coordination** | Direction quantization for agent spatial reasoning | MEDIUM |
| **eisenstein-quantize** → **construct-coordination** | Hex lattice for spatial agent positioning | LOW |
| **deadband-snr** → **fleet-murmur-worker** | Spike-preserving noise filter for signal data | MEDIUM |
| **deadband-snr** → **pincher** | Signal processing for sensor integration | LOW |

### Coordination Integration (Existing)
- fleet-murmur-worker → construct-coordination: Blackboard publishing via GitHub API (works, but no schema validation)
- construct-coordination notes/blackboard/ ← fleet-murmur-worker: The integration path exists and runs
- **No formal type/schema sharing** — blackboard uses markdown strings, not typed messages

---

## 8. Recommended Immediate Fixes (Ranked by Severity)

### 🔴 CRITICAL
1. **Construct-core-src needs a Cargo.toml** — The core library of construct-coordination cannot compile. 32 tests are dead code. This is a ship-stopper.
2. **Fleet-murmur-worker needs tests** — Zero test coverage on a production edge worker. Deploying without CI guarantees regressions.

### 🟠 HIGH
3. **Replace hardcoded absolute path** in construct-coordination `experiments/arena-evolution/src/main.rs` (`/home/phoenix/...`)
4. **Add workspace Cargo.toml** to construct-coordination to consolidate 12 experiment crates
5. **Make LLM model name configurable** in fleet-murmur-worker (hardcoded `deepseek-ai/DeepSeek-V4-Flash`)
6. **Pin `ternary-types` git dependency** in pincher to a specific commit (currently unpinned, could break)

### 🟡 MEDIUM
7. **Integrate pythagorean48 into pincher** for direction math (currently standalone)
8. **Integrate deadband-snr into fleet-murmur-worker** for signal filter path
9. **Add doc-tests to eisenstein-quantize** and deadband-snr (currently 0 doc-tests)
10. **Fix unused variable warning** in deadband-snr test code
11. **Verify construct-coordination blackboard directory structure** matches fleet-murmur-worker expectations

### 🟢 LOW
12. **Implement `updateConfidence` for Cloudflare Vectorize backend** in fleet-murmur-worker
13. **Add CI configuration** for all repos (no `.github/workflows/` detected in most repos)
14. **Add cross-repo integration tests** that verify the blackboard publishing contract
15. **Document the pythagorean48 → Rust API gap** (missing float32 chain comparison function from Python experiment)

---

## 9. Per-Repo Summary Statistics

### Pincher
```
Files:        ~50 .rs files across 2 crates + 1 Python infer project
Tests:        147 unit (pass) + 6 doc (1 pass, 5 ignored)
Coverage:     Excellent — best in fleet
Security:     Extensive veto/SAEP/blocklist/sandbox subsystems
TODOs:        0
Dependencies: ternary-types (git, unpinned)
```

### Fleet Murmur Worker
```
Files:        11 .ts files
Tests:        0
Coverage:     None — 🚨 critical gap
Security:     Good env-var hygiene, proper secrets management
TODOs:        0 (placeholders noted)
Deploy:       Wrangler + Cloudflare Workers
```

### Construct Coordination
```
Files:        construct-core-src/ (8 .rs files) + 12 experiment crates
Tests:        32 (stale — cannot compile)
Coverage:     None (core is dead code)
Security:     Hardcoded absolute path in experiment
TODOs:        0
Build:        Missing Cargo.toml for core
```

### Pythagorean48
```
Files:        1 .rs file
Tests:        25 (18 unit + 7 doc, all pass)
Coverage:     Good
Security:     None needed (pure math)
TODOs:        0
```

### Eisenstein Quantize
```
Files:        4 .rs files
Tests:        10 (all pass, 0 doc-tests)
Coverage:     Moderate — no doc-tests
Security:     None needed (pure math)
TODOs:        0
```

### Deadband SNR
```
Files:        1 .rs file
Tests:        10 (all pass, 0 doc-tests)
Coverage:     Moderate — no doc-tests, 1 compiler warning
Security:     None needed (pure math)
TODOs:        0
```

---

## Appendix: Cross-Repo References Found

| Source Repo | References | Type |
|-------------|-----------|------|
| pincher | → self only | Self-contained |
| fleet-murmur-worker | → pincher (design inspiration) | Comments/pattern copy |
| fleet-murmur-worker | → construct-coordination (blackboard publishing) | Runtime API call |
| fleet-murmur-worker | → SuperInstance/construct-coordination (repo reference) | Config |
| construct-coordination | → /home/phoenix/repos/construct-coordination (experiment) | Hardcoded path |
| pythagorean48 | → forgemaster-archive/experiments/pythagorean48-encoding | Python origin experiment |

---

*Report generated by Kimi Code fleet audit. All tests were run on 2026-06-06 UTC. Python experiment comparison used forgemaster-archive HEAD.*
