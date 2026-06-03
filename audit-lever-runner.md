# lever-runner v0.5 Audit Report

**Repo:** github.com/SuperInstance/lever-runner
**Branch:** main (HEAD: `ed280ef`)
**Audit Date:** 2026-06-03

---

## 1. Test Suite Status — BROKEN

**Result: 0 tests collected.**

The `tests/` directory contains only:
- `__init__.py` — empty package marker
- `smoke.py` — a 679-line manually-run smoke test (uses its own `check()`/`main()` pattern, **no pytest-compatible functions**)

The TODO claims v0.3 had "59/59 tests," but **none of those tests exist in the current codebase.** They were either on a different branch, in a different directory layout, or removed. The current test infrastructure is completely absent — no `test_*.py` files anywhere in the project tree.

**Impact:** Regression testing is impossible. Any change to bot.py, intent_extractor.py, or store.py goes untested unless run manually via `python tests/smoke.py` (which requires working env vars, a running sandbox, and manual interpretation).

---

## 2. `lever-runner doctor` — ✅ PASSES

All 11 checks pass cleanly:
- Python 3.14.5 ✓
- lancedb importable ✓
- TELEGRAM_BOT_TOKEN set & format ok ✓
- ALLOWED_USER_ID locked to uid=8709904335 ✓
- lancedb path with 3 tables (commands, commands_8709904335, commands_default) ✓
- Sandbox root writable ✓
- LLM_BACKEND=deepinfra (key set) ✓
- LLM_FALLBACKS chain ok ✓
- Log paths writable ✓
- Disk space 11.1 GB free ✓
- In-process smoke (DB + embedder wired correctly, 66 rows) ✓

No issues with the doctor itself. It's well-structured, comprehensive, and production-ready.

---

## 3. `bot.py` Analysis — 👍 SOLID WITH ONE GAP

### Allowed-User Gate ✅
- `_is_authorized()` checks `ALLOWED_USER_ID` env var
- Falls open when unset (reasonable for testing)
- Properly returns `not authorized` for denied users
- Every handler gate-checks before doing anything

### Handlers Testability — ⚠️ Gap
All handlers (`cmd_do`, `cmd_teach`, `cmd_status`, `cmd_commands`, `cmd_stats`, `cmd_fallback`) are synchronous operations wrapped in async PTB handlers. They **are** unit-testable with a mock `AsyncMock(Update)` + `AsyncMock(ContextTypes.DEFAULT_TYPE)` — but **zero tests exist.** The TODO explicitly flagged this as a v0.3 candidate that was never delivered.

### Security Issues — None Found
- No `eval()`, `exec()`, or `os.system()` with user input
- Uses `orchestrator.do()` which routes through the sandboxed executor
- No command injection vectors in handler code
- Plain text reply (no markdown parsing) — correct design choice
- `/teach` properly validates `--trust` range 0-100
- No arbitrary flag injection in `/teach`
- `/commands` limits pagination to max 100 per page

### What's Already in bot.py (done since TODO was written)
- ✅ `/teach --trust=N` — override starting trust
- ✅ `/commands [N] [--page=K]` — paginated command listing
- ✅ `/stats <phrase>` — full per-command stats

These are already live even though TODO still lists them as "Features (v0.3 candidates)."

---

## 4. Top 3 v0.5 Items (Most Impactful + Most Doable)

### 🔥 #1: bot.py test coverage
**Where:** Code quality section (listed as "v0.3 candidates")
**Effort:** Low
**Impact:** High

Every handler is a straightforward: gate-check → parse args → call orchestrator → reply. A single `conftest.py` with a mock `Update` factory and ~80 lines of `test_bot.py` covers:
- Allowed-user gate (authorized & denied paths for every handler)
- `/do` happy path + missing args
- `/teach` happy path + missing pipe + `--trust` flag
- `/status`, `/commands`, `/stats` happy paths
- Plain-text fallback → `/do`

**Why now:** Without bot tests, you can't refactor bot.py or upgrade python-telegram-bot safely. Existing tests (well, smoke.py) only test the store+orchestrator layer, not the Telegram UI.

### 🔥 #2: Token budget / server-side LLM output cap
**Where:** Operational section
**Effort:** Very Low (~15 lines in `intent_extractor.py`)
**Impact:** Medium (security hardening)

`intent_extractor.py` sets `max_tokens=32` in the request, but a hostile or buggy provider can return thousands of tokens anyway. Adding a `min(len(content), MAX_OUTPUT_CHARS)` cap on every backend's response prevents a runaway LLM from flooding logs, RAM, or the Telegram output.

**Why now:** Quick security win. The TODO flagged it as operational debt.

### 🔥 #3: `intent_extractor.py` test coverage by backend
**Where:** Code quality section
**Effort:** Low-Medium
**Impact:** Medium

Currently there are no per-backend tests. Each of the 4 backends (deepinfra, minimax, ollama, passthrough) should have:
- Happy-path test with a mock HTTP response
- "Backend down" test (timeout/5xx → fallback chain)
- Malformed response test

This would have caught the Qwen3.5-4B content-empty issue from the v0.3 notes automatically.

**Why now:** Backend-specific bugs are silent (the fallback chain swallows them). Testing each backend separately is the only way to catch regressions before they hit production.

---

## Summary

| Area | Status | Urgency |
|---|---|---|
| Test suite | ❌ 0/0 tests (infrastructure absent) | **HIGH** |
| `lever-runner doctor` | ✅ All checks pass | — |
| bot.py handlers | ✅ Well-structured, no security bugs | — |
| bot.py test coverage | ❌ Zero | **HIGH** |
| Intent-extractor tests | ❌ Zero per-backend tests | **MEDIUM** |
| Token budget cap | ❌ Not implemented | **MEDIUM** |
| Features (teach--trust, commands, stats) | ✅ Already shipped | — |

**Bottom line:** The codebase is well-designed and the doctor passes, but the test infrastructure is nonexistent. The single highest-impact action for v0.5 is writing `test_bot.py` (~80 lines). The token output cap and backend-specific intent_extractor tests round out the top 3.
