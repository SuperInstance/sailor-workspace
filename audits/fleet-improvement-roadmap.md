# 🚀 Fleet Improvement Roadmap

**Generated:** 2026-06-06 22:59 UTC  
**Sources:** 7 audit reports (claude-audit-pincher, claude-fixes-pincher, claude-audit-ctc, claude-audit-iron-to-iron, claude-audit-lever-runner, kimi-fleet-health, gc-report)  
**Scope:** Pincher, constraint-theory-core, iron-to-iron, lever-runner, fleet ecosystem

---

## 📊 Fleet Dashboard

| Component | Grade | Health | Key Issue |
|-----------|-------|--------|-----------|
| **constraint-theory-core** | **A-** 🟢 | ✅ 261 tests, zero deps, clean build | RwLock poison risk in cache.rs |
| **Pincher** | **B+** 🟡 | ⚠️ 169 tests pass, veto logic fixed | Python dep bounds, WAL, test gaps |
| **iron-to-iron** | **B+** 🟡 | ⚠️ v2 solid, v3 unimplemented | Version fragmentation, no sig verify |
| **lever-runner** | **B+** 🟡 | ✅ /healthz production-ready | httpx/requests mismatch |
| **Fleet ecosystem** | **C** 🔴 | ⚠️ 20 commits, CI green | 0.034% inter-crate connectivity |
| **Construct API** | **C** 🔴 | ⚠️ Under review | Security vacuum, no_std gaps |
| **Agent comms** | **B** 🟡 | ✅ Oracle2↔Forgemaster active | crates.io publish blocked |
| **Disk health** | **B+** 🟡 | ✅ 66% after GC (was 73%) | Cargo targets need periodic GC |

---

## 🔴 CRITICAL — Blocking Safety or Correctness

### 1. Fleet Ecosystem Connectivity Crisis
**Source:** kimi-fleet-health  
**Risk:** Catastrophic — 170+ of 189 ternary-* crates have zero inter-crate dependencies  
**Impact:** The fleet isn't actually a fleet — it's 189 isolated islands sharing a namespace  
**Action:** Make `ternary-types` a dependency of every ternary-* crate (mechanical, high ROI)  
**Owner:** Forgemaster  
**Effort:** 1-2 days mechanical work  
**Dependency:** None (self-inflicted)

### 2. Construct API Security Vacuum
**Source:** kimi-fleet-health / CRITICAL-REVIEW.md  
**Risk:** Plaintext API keys, no sandbox, no_std incompatibility, latency fiction, state sync hand-waving  
**Impact:** Any Construct instance deployed today leaks credentials and has no runtime isolation  
**Action:** Implement sandbox layer, API key vault, no_std compatibility pass, CRDT-based state sync  
**Owner:** Core team  
**Effort:** 2-3 weeks  
**Dependency:** CONSTRUCT-V2-FIXES.md draft exists — needs implementation

### 3. I2I Version Fragmentation + No v3 Implementation
**Source:** claude-audit-iron-to-iron  
**Risk:** v1/v2/v3 have incompatible `I2IMessage` classes, v3 (20 types) has zero code, ACK specified but no implementation  
**Impact:** Fleet agents can't interoperate across versions; v3 specification is a paper protocol  
**Action:** Deprecate v1, converge v2→v3 with migration strategy, implement core v3 transport  
**Owner:** I2I maintainer  
**Effort:** 1 week  
**Dependency:** Fleet architecture alignment

### 4. I2I Signature Verification Not Enforced
**Source:** claude-audit-iron-to-iron  
**Risk:** v3 requires signature fields but parsing code never verifies them — documented security doesn't exist  
**Impact:** Replay attacks, impersonation, message forgery are all possible  
**Action:** Wire up signature verification in message parsing; make signed commits mandatory not optional  
**Owner:** I2I maintainer  
**Effort:** 2-3 days  
**Dependency:** #3 (version convergence)

### 5. constraint-theory-core: RwLock Poisoning Cascade Risk
**Source:** claude-audit-ctc (#1-3, HIGH priority)  
**Risk:** `cache.rs` has 7 `.unwrap()` calls on `RwLock::read()/write()` and 1 on `JoinHandle::join()`. A panicking reader poisons the lock, crashing every subsequent access.  
**Impact:** A single thread panic in any cache-using component takes down the entire process  
**Action:** Replace with `.unwrap_or_else(|e| handle_poison(e))` or `.ok().unwrap_or_default()` with documented fallback  
**Owner:** constraint-theory-core maintainer  
**Effort:** 1 hour (quick win hides critical risk)  
**Dependency:** None

### 6. lever-runner: Unreachable in Fleet Health Monitoring
**Source:** kimi-fleet-health (chronic across all nightly audits)  
**Risk:** lever-runner `/healthz` endpoint is consistently unreachable from fleet monitoring — not systemd-managed  
**Impact:** Blind spot in fleet health; lever-runner could be down without alerting  
**Action:** Deploy as systemd service matching existing units, or document known-unreachable status  
**Owner:** lever-runner maintainer  
**Effort:** 1-2 hours  
**Dependency:** Network config verification

---

## 🟡 HIGH — Significant Quality or Maintainability

### 7. crates.io Publish Blocked
**Source:** kimi-fleet-health  
**Issue:** Oracle2 has no crates.io API token on this node; ternary-* crates can't be published  
**Impact:** Fleet components can't be consumed as dependencies outside the monorepo  
**Action:** Generate/rotate crates.io token for Oracle2; document token lifecycle  
**Owner:** Oracle2 / Forgemaster  
**Effort:** 30 min  
**Priority within HIGH:** Highest — unblocks ecosystem growth

### 8. Pincher: WAL Checkpoint Not Implemented
**Source:** claude-audit-pincher (TODO comments in engine.rs:139-141)  
**Issue:** SQLite WAL journal grows unbounded with no periodic checkpoint  
**Impact:** Disk growth over time; potential performance degradation  
**Action:** Implement timer-based WAL checkpointing in the reflex engine  
**Owner:** Pincher maintainer  
**Effort:** 1-2 hours

### 9. Pincher: Python Dependencies Lack Upper Bounds
**Source:** claude-audit-pincher  
**Issue:** `pyproject.toml` has `openai>=1.0`, `sentence-transformers>=2.2`, `numpy>=1.24` — no upper bounds  
**Impact:** Future breaking releases will silently break pincher-infer  
**Action:** Add `<major.next` upper bounds after verifying compatibility  
**Owner:** Pincher maintainer  
**Effort:** 1 hour

### 10. lever-runner: httpx/requests Dependency Mismatch
**Source:** claude-audit-lever-runner  
**Issue:** `pyproject.toml` declares `httpx>=0.27` but code imports `requests` (never uses httpx)  
**Impact:** `pip install -e .` fails at runtime with `ImportError: No module named 'requests'`  
**Action:** Replace `httpx>=0.27` with `requests>=2.31` in pyproject.toml; align with requirements.txt  
**Owner:** lever-runner maintainer  
**Effort:** 15 min (quick win)

### 11. I2I: C Implementation Untested + No Replay Protection
**Source:** claude-audit-iron-to-iron  
**Issues:** `bottle-cli.c` (465 lines) has zero tests; v3 TTL/timestamp validation not implemented  
**Impact:** C implementation is a reliability risk; no protection against message replay  
**Action:** Add C test suite (at minimum smoke tests); implement TTL validation  
**Owner:** I2I maintainer  
**Effort:** 1-2 days

### 12. constraint-theory-core: Dead Code Cleanup
**Source:** claude-audit-ctc (#5-8, MEDIUM priority)  
**Issues:**
- `struct Assignment` never constructed (cdcl.rs:98)
- `fn diag_fn` never used (puzzle.rs:133)
- `field max_denominator` never read (quantizer.rs:112)
- `stats.elapsed` assigned ×4 never read (backtracking.rs:30,44,57)
- 7 cargo check warnings (4 unused stats, 1 dead struct, 1 dead fn, 1 unused field)  
**Impact:** Code bloat, confusion for new contributors, minor compile-time overhead  
**Action:** Remove dead code; prefix unused variables with `_`  
**Owner:** constraint-theory-core maintainer  
**Effort:** 30 min (quick win)

### 13. constraint-theory-core: Module Docs Missing on 6 Modules
**Source:** claude-audit-ctc (#4, MEDIUM priority)  
**Modules:** ac3, backtracking, cdcl, csp, puzzle, sudoku — all missing `#![doc]` headers  
**Impact:** `cargo doc` output is incomplete for application-level modules  
**Action:** Add one-paragraph module-level docs to each  
**Owner:** constraint-theory-core maintainer  
**Effort:** 1 hour

### 14. Fleet: Single Author Bottleneck
**Source:** kimi-fleet-health  
**Issue:** All 20 recent commits from DocBot — no human commits in 24h across construct-coordination  
**Impact:** Documentation pipeline centralization risk; no human review in flow  
**Action:** Establish doc review PR workflow; rotate doc-bot responsibility  
**Owner:** Fleet maintainer  
**Effort:** Process change, not code

### 15. Pincher: Integration Test Suite
**Source:** claude-audit-pincher  
**Issue:** No integration tests that run before merge (current test workflow is manual)  
**Impact:** Regressions in security-critical paths may go undetected  
**Action:** Add CI job that runs `cargo test --workspace` on every PR  
**Owner:** Pincher maintainer  
**Effort:** 1-2 hours (CI config)

---

## 🟢 MEDIUM — Good Practice Improvements

### 16. Pincher: Dual CapabilityManifest Consolidation
**Source:** claude-audit-pincher (Architecture Smells)  
**Issue:** `capability::manifest::CapabilityManifest` and `security::sandbox::CapabilityManifest` are separate types  
**Impact:** API confusion; potential for security holes if the wrong type is used  
**Action:** Consolidate into one canonical type  
**Effort:** 2-3 hours

### 17. Pincher: Path Validation Strengthening
**Source:** claude-audit-pincher (Security Concerns)  
**Issue:** Prefix-based blocking (`/etc/shadow`, `/root/.ssh`) can be bypassed via symlinks  
**Impact:** Weak defense against path traversal  
**Action:** Use `canonicalize()` consistently with whitelist-based resolution  
**Effort:** 1-2 hours

### 18. Pincher: Property-Based Testing for Matching Logic
**Source:** claude-audit-pincher  
**Issue:** No `proptest` or `quickcheck` for reflex matching and veto engine patterns  
**Impact:** Corner cases in pattern matching may go untested  
**Action:** Add property-based tests for matching and veto logic  
**Effort:** 2-3 hours

### 19. Pincher: Connection Pooling for RPC/Sidecar
**Source:** claude-audit-pincher  
**Issue:** Each RPC call opens a new socket to the Python sidecar  
**Impact:** Latency overhead under concurrent load  
**Action:** Implement connection pooling or persistent connection  
**Effort:** 3-4 hours

### 20. Pincher: Query Caching for Recent Intents
**Source:** claude-audit-pincher  
**Issue:** Repeated identical intents re-embed every time  
**Impact:** Wasted compute on duplicate lookups  
**Action:** Add LRU cache for recently-seen intents  
**Effort:** 2-3 hours

### 21. lever-runner: Rate Limiter Unbounded Growth
**Source:** claude-audit-lever-runner  
**Issue:** `_RateLimiter._windows` dict grows unbounded; cleanup runs after response  
**Impact:** Memory leak under sustained unique-client traffic  
**Action:** Add periodic cleanup thread or LRU eviction; move cleanup before response  
**Effort:** 1 hour

### 22. lever-runner: Silent Cleanup Failures
**Source:** claude-audit-lever-runner  
**Issue:** `shutil.rmtree(session, ignore_errors=True)` with `except OSError: pass` swallows errors  
**Impact:** Disk space accumulation; hard-to-diagnose failures  
**Action:** Log cleanup warnings to stderr  
**Effort:** 15 min (quick win)

### 23. CORTEX.json v1 Formal Alignment
**Source:** kimi-fleet-health  
**Issue:** Drafted by Oracle2, awaiting Forgemaster feedback; spec/runtime split not formalized  
**Impact:** Risk of divergent implementations  
**Action:** Formalize CORTEX.json as schema, construct-core as runtime implementation  
**Effort:** 1-2 days of alignment

### 24. GC: Periodic Cleanup Schedule
**Source:** gc-report  
**Issue:** Cargo build artifacts accumulate ~3GB; no automated GC cadence  
**Impact:** Disk pressure returns every major rebuild cycle  
**Action:** Schedule weekly or biweekly `scripts/gc-system.sh` via cron; add target/ cleanup to the script  
**Effort:** 30 min

---

## ⚪ LOW — Nice to Haves

### 25. Fuzzing for Security-Critical Code
**Affected:** Pincher (veto engine, sandbox), I2I (message parsing)  
**Action:** Add `cargo-fuzz` targets for veto patterns and I2I message deserialization  
**Effort:** 3-4 hours per crate

### 26. Benchmark CI
**Affected:** Pincher, constraint-theory-core  
**Action:** Run benchmark suite in CI with regression thresholds  
**Effort:** 2-3 hours

### 27. Async Embedding for Batch Operations (Pincher)
**Action:** Make ONNX embedding async to handle batch requests concurrently  
**Effort:** 4-6 hours

### 28. lever-runner: /metrics Endpoint
**Action:** Add Prometheus-format metrics endpoint for fleet observability  
**Effort:** 2-3 hours

### 29. constraint-theory-core: Solver unwrap Cleanup
**Source:** claude-audit-ctc (#9-12, LOW priority)  
**Issues:** `partial_cmp().unwrap()` in kdtree.rs, `ch.to_digit(10).unwrap()` in sudoku.rs, `result.unwrap()` in solver code  
**Action:** Propagate errors via `CTResult` or use safer unwrap alternatives  
**Effort:** 1-2 hours

### 30. I2I: 3-Way Shard Pattern Documentation
**Source:** claude-audit-iron-to-iron (3-Way Shard Pattern: NOT FOUND)  
**Action:** If this is a planned feature, document the design; if it's an external reference, note the source  
**Effort:** 1 hour

### 31. lever-runner: Network Requirements Documentation
**Action:** Document that port 8765 (loopback) must be reachable by fleet monitors  
**Effort:** 15 min

---

## 🔄 Recently Fixed (June 6, 2026)

| Issue | Fixed In | Owner |
|-------|----------|-------|
| Pincher: Duplicated veto logic | claude-fixes-pincher (extracted `check_veto()` helper) | Claude Code |
| Pincher: Unpinned Git dependencies | claude-fixes-pincher (added `rev = <hash>` to Cargo.toml) | Claude Code |
| constraint-theory-core: Benchmarks not compiling | pre-audit fix (commit b73ef64) | Core maintainer |
| Pincher CI: rustfmt failure | kimi-fleet-health | DocBot |
| Disk: 98% → 66% freed | gc-report (3.3 GB reclaimed) | GC run |
| PR #4 (readme-truth-sayer) merged | kimi-fleet-health | DocBot |
| PR #7 (ternary-types route module) merged | kimi-fleet-health | DocBot |

---

## 🎯 Quick Wins (Can Be Done in < 1 Hour)

| # | Task | Effort | Owner |
|---|------|--------|-------|
| 5 | constraint-theory-core: Fix RwLock poison handling | 1h | Core maintainer |
| 9 | Pincher: Add Python dep upper bounds | 1h | Pincher maintainer |
| 10 | lever-runner: Fix httpx→requests | 15m | lever-runner maintainer |
| 12 | constraint-theory-core: Remove dead code | 30m | Core maintainer |
| 13 | constraint-theory-core: Module docs | 1h | Core maintainer |
| 7 | crates.io token generation | 30m | Oracle2 / Forgemaster |
| 22 | lever-runner: Log cleanup errors | 15m | lever-runner maintainer |
| 24 | GC: Schedule periodic cleanup | 30m | Fleet maintainer |
| 31 | lever-runner: Network docs | 15m | lever-runner maintainer |

**Total quick-win effort: ~4.5 hours for 9 items**

---

## Execution Priority Matrix

```
                HIGH IMPACT
                    │
    🔴 #1 FleatConnect  │  🔴 #5 RwLock Poison
    🔴 #2 ConstructSec   │  🔴 #4 SigVerify
       (2-3 weeks)       │     (1 hour)
                    │
   LOW EFFORT ──────┼────── HIGH EFFORT
                    │
    🟢 #16 CapManifest  │  🟢 #19 ConPooling
    🟢 #17 PathValidate  │  🟢 #20 QueryCache
    🟢 #22 Log Cleanup   │
                    │
                LOW IMPACT
```

**Where to start (bang-for-buck order):**
1. ✅ **#5, #10, #12, #22** — 4 quick wins, ~2 hours total, eliminate real bugs
2. 🔴 **#6** — lever-runner reachability (1-2h, unblocks fleet monitoring)
3. 🔴 **#4, #7** — security enforcement + publish pipeline (1 day)
4. 🔴 **#1** — fleet connectivity (1-2d mechanical, highest long-term ROI)
5. 🔴 **#2, #3** — Construct API + I2I v3 (2-3 week strategic projects)

---

*Generated by cross-referencing 7 audit reports from Claude Code, Kimi Code, and GC analysis.*
