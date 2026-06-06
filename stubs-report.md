# Stubs Production Fill Report

**Repo**: `polychora-temporal` (branch `main`)  
**Commit**: `ffac57c`  
**Date**: 2026-06-06 00:10 UTC

---

## Changes Made

### 1. `common/src/mat_n.rs` — N>3 determinant via Laplace expansion

**Before**: `_ => { unimplemented!() }`  
**After**: Full Laplace expansion along the first row for N=4.

The 4×4 determinant is expanded using the formula:

```
det = Σ (-1)^j · a[0][j] · det(minor(0,j))
```

Each 3×3 minor determinant reuses the same structure as the existing N=3 case (which is hardcoded inline for performance). The catch-all `_` arm now panics with a descriptive message rather than using `unimplemented!()`.

**Tests**: All 17 `common` tests pass, including `test_mat_mat_mul` (which exercises determinants through the MatN API).

### 2. `crates/polychora-temporal-bridge/src/conservation_tracker.rs` — Production `tick()`

**Before**: Placeholder — just advanced `total_time`.  
**After**: Full conservation tracking:

- **`tick(&mut self, dt: f64) -> Option<ConservationEvent>`** — Advances clock, applies budget decay proportional to dt, checks budget vs profile threshold, returns `Some(ConservationEvent)` when triggered.
- **`ConservationEvent`** struct with fields: `event_type` (enum), `budget`, `profile`, `detect_count`.
- **`ConservationEventType`** enum: `BudgetExceeded`, `BudgetRecovered`, `ProfileBreach`, `BudgetDepleted`.
- **`budget_allocation(amount)`** — Add to budget.
- **`set_profile(profile)`** — Set profile value.
- **`set_threshold(threshold)`** — Configure trigger ratio.
- **`Default`** implementation.

### 3. `crates/polychora-temporal-bridge/src/event_voxel.rs` — Proper `event_to_block()`

**Before**: `pub fn event_to_block() -> BlockData { BlockData::AIR }`  
**After**: `pub fn event_to_block(material_token: u8) -> BlockData`

Delegates to `polychora::content_registry::block_data_from_material_token(material_token)` for the full 1–68 material token to `BlockData` mapping. Token 0 maps to `BlockData::AIR`.

### 4. `crates/polychora-temporal-bridge/src/glue.rs` — Propagate `ConservationEvent`

Updated `TemporalGlue::tick()` to return `Option<ConservationEvent>` and log any triggered events via `log::warn!`.

---

## Verification

| Check | Status |
|---|---|
| `cargo check` (all crates) | ✅ Passed |
| `cargo check -p polychora-temporal-bridge` | ✅ Passed |
| `cargo test -p common` | ✅ 17/17 passed |
| `cargo test -p polychora-temporal-bridge` | ✅ 0/0 passed (no tests yet) |
| `cargo clippy -p common` | ✅ 0 new warnings |
| `cargo clippy -p polychora-temporal-bridge` | ✅ 0 new warnings |
| `git push origin main` | ✅ Pushed |

All clippy warnings that appear are pre-existing in other crates (`higher-dimension-playground`, `polychora`) — none are from the changes.
