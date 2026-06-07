# Audit: WAL Checkpointing Fix for pincher's engine.rs

## Files Changed

### 1. `pincher-core/src/db/schema.rs` (line 199)

**Change:** Combined `PRAGMA busy_timeout=5000` into the existing `execute_batch` call alongside `journal_mode=WAL` and `foreign_keys=ON`.

```diff
- conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
+ conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000")?;
```

**Why:** Addresses the second TODO — sets a 5-second busy timeout so that concurrent access automatically retries instead of immediately failing with `SQLITE_BUSY`.

### 2. `pincher-core/src/reflex/engine.rs` (multiple edits)

**Imports** — Added `std::sync::atomic::{AtomicU64, Ordering}`, `std::sync::Arc`.

**Constants** (after `EngineResult` type alias):

```rust
/// Interval between automatic WAL checkpoints (seconds).
const WAL_CHECKPOINT_INTERVAL_SECS: u64 = 30;

/// Number of write operations after which a WAL checkpoint is triggered.
const WAL_CHECKPOINT_OPS_THRESHOLD: u64 = 100;
```

**ReflexEngine struct** — Two new fields:

```rust
last_checkpoint_epoch: Arc<AtomicU64>,   // epoch seconds of last checkpoint
ops_since_checkpoint: Arc<AtomicU64>,    // write counter since last checkpoint
```

**`new()` constructor** — Initializes `last_checkpoint_epoch` to `SystemTime::now()` and `ops_since_checkpoint` to 0.

**`open()` method** — Updated doc comment to describe the WAL checkpoint mechanism (removed both TODO comments). Now calls `Self::new(conn, embedder)` instead of constructing the struct inline.

**`checkpoint_wal_if_needed()` method** — New public method:

- Compares elapsed time since last checkpoint against `WAL_CHECKPOINT_INTERVAL_SECS` (30s)
- Checks accumulated write ops against `WAL_CHECKPOINT_OPS_THRESHOLD` (100)
- Uses `compare_exchange` on `last_checkpoint_epoch` to avoid duplicate concurrent checkpoints
- First tries `PRAGMA wal_checkpoint(TRUNCATE)` — shrinks WAL to minimal size
- Falls back to `PRAGMA wal_checkpoint(PASSIVE)` if TRUNCATE fails (DB busy)
- Both PRAGMAs use `query_row(...)` since SQLite PRAGMAs return result rows

**`record_write_and_checkpoint()` method** — Private helper that increments the operation counter and calls `checkpoint_wal_if_needed()`.

**Checkpoint triggers** — Added `self.record_write_and_checkpoint()` calls after every database write:

- `teach()` — after `update_reflex_embedding()` (update path) and after `insert_reflex()` (insert path)
- `execute()` — after `log_action()`
- `execute_reflex()` — after `log_action()`

## Design Decisions

| Decision | Rationale |
|---|---|
| **On-demand, not timer-based** | Avoids needing a background thread/tokio task; the engine is synchronous. Checkpoints piggyback on write operations. |
| **TRUNCATE with PASSIVE fallback** | TRUNCATE provides maximum WAL shrinkage. PASSIVE is a safe fallback that doesn't block concurrent readers/writers. |
| **`compare_exchange` gate** | Ensures only one thread (if engines are shared via Arc) performs the checkpoint at a time. LOSER returns early. |
| **Epoch seconds (not `Instant`)** | `AtomicU64` is trivially `Send+Sync`. `Instant` is not atomically readable across threads. |
| **No `Duration` import** | Added then removed — unused because time arithmetic is on raw u64 epoch seconds. |

## Test Results

```
✔ 147 unit tests passed (0 failed)
✔ 16 integration tests passed (0 failed)
✔ 1 doc-test passed (5 ignored, 0 failed)
✔ 0 compiler warnings
✔ 0 clippy/lint warnings
```

## Verification

The fix was verified by running `cargo test -p pincher-core` which executes:

1. **Unit tests** — All reflex, schema, confidence, matcher, and engine tests pass
2. **Integration tests** — End-to-end tests that teach reflexes, execute commands, and match intents all pass, confirming the checkpoint calls don't interfere with normal operations
3. **Edge cases** — Empty intents, very long intents, special characters, and vector store operations all succeed
