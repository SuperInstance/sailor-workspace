# Claude Code — Lever-Runner Analysis

## 1. Test Fixes

### Pre-existing fixes (already applied by recent commit `3bb713e`)
The following bugs were already fixed by the most recent commit before my analysis:

- **test_teach_basic**: Expected `"row_id_1234"` in reply but bot truncates to 8 chars → should be `"row_id_1"`. Fixed in prior commit.
- **test_teach_missing_phrase**: Space-only phrase `" "` wasn't being rejected. Bot.py's phrase parsing strips quotes but not the inner whitespace. Fixed by adding `.strip()` after `.strip('"').strip("'")`.
- **test_main_starts_with_token / test_main_registers_handlers**: `NameError: name 'Application' is not defined` because the test uses `Application` directly instead of `bot_mod.Application`. Fixed in prior commit.

### Test Results: **72/72 passed** (pytest), **90/90 passed** (smoke test)

---

## 2. HTTP API Security Audit (`src/lever_runner/http_api.py`)

### Findings

| Issue | Severity | Status |
|---|---|---|
| No rate limiting | Medium | **FIXED** |
| No request body size limit | Low | **FIXED** |
| `/commands` GET leaks all stored commands without auth | Medium | **FIXED** |
| `/healthz` leaks `lancedb_path` in response | Low | **FIXED** (removed from response) |
| Path traversal in `_serve_file` — uses `os.path.normpath` + prefix check | None | Already correct ✓ |
| Non-loopback bind refused without auth token | None | Already correct ✓ |
| No CORS headers | None | Intentional (loopback-only JSON API) |

### Fixes Applied

### a. Rate Limiting (commit `3042f49`)
Added `_RateLimiter` class — per-IP fixed-window rate limiter.

- **Config**: `HTTP_RATE_LIMIT` env var (default: 60 req/min)
- **Window**: 60 seconds fixed window, resets on expiry
- **Behavior**: Returns HTTP 429 with `Retry-After` header when exceeded
- **Scope**: Applied to both GET and POST requests
- **Cleanup**: Stale windows are evicted after each rate-limit rejection to prevent memory leak

### b. Request Body Size Limit
Added `_read_body()` method with configurable `HTTP_MAX_BODY_BYTES` (default: 2 MB).

- Content-Length > limit → returns empty bytes → caller responds HTTP 413
- Prevents OOM from giant POST payloads

### c. `/commands` Endpoint Now Requires Auth
Previously, `GET /commands` returned all stored shell commands without authentication.
Now requires `Authorization: Bearer <token>` when `HTTP_API_TOKEN` is configured.

### d. `lancedb_path` Removed from `/healthz`
Removed `lancedb_path` from healthz response to avoid leaking internal filesystem paths.

---

## 3. Orchestrator Race Condition Analysis

### `src/lever_runner/orchestrator.py`

**`do()` function**: No direct race condition. Each call is independent. The `store.find_best()` call is read-only (race-safe). The `store.update_trust()` call is the only mutation — see below.

**`teach()` function**: Insert-only, thread-safe (each call creates a new UUID row).

### `src/lever_runner/store.py` — `update_trust()` Race Condition

**Severity**: Medium  
**Impact**: Lost trust adjustments when two concurrent threads process the same row.

The `update_trust` method performs a classic **read-modify-write** (TOCTOU) cycle:

```python
rows = self.table.search().limit(1).where(...).to_list()  # READ
# ... compute new_trust, new_success, new_failure ...
self.table.update(where=f"id = '{row_id}'", values={...})  # WRITE
```

If two `do()` calls execute concurrently for the same command:
1. Thread A reads `trust_score=50.0, success_count=5`
2. Thread B reads `trust_score=50.0, success_count=5`
3. Both compute `new_trust=51.5, new_success=6`
4. Thread A writes → DB has `trust=51.5, succ=6`
5. Thread B writes (same values) → no change — **lost the second run's credit**

**Fix**: Added `threading.Lock` (`self._lock`) scoped to each `CommandStore` instance, serializing all `update_trust()` calls. This ensures reads always see the latest committed write.

### `src/lever_runner/intent_extractor.py`

No shared mutable state — each `extract()` call is fully independent (no class-level state, no file operations, read-only env access). Thread-safe ✓.

---

## 4. Summary of Changes

| File | Changes |
|---|---|
| `src/lever_runner/http_api.py` | +Rate limiting, +body size limit, +auth on `/commands`, -`lancedb_path` leak |
| `src/lever_runner/store.py` | +`threading.Lock` on `update_trust()` to fix TOCTOU race |
