# Phase 1: Ternary-Engine Integration Report

**Date:** 2026-06-05 06:55 UTC  
**Repo:** `github.com/SuperInstance/pincher`  
**Branch:** `feat/ternary-engine-phase1`  
**Commit:** `c8679f2`  
**PR:** Pending — branch is ready at `feat/ternary-engine-phase1`

---

## Analysis Summary

### Existing Veto Decision Variants

The veto engine (`pincher-core/src/security/veto.rs`) already defines **three** decision variants:

| Variant | Purpose |
|---------|---------|
| `VetoDecision::Allow` | Action passes all rules |
| `VetoDecision::Deny(String)` | Action is blocked with a reason |
| `VetoDecision::RequireConfirmation(String)` | Action needs user approval |

Helpers `is_allowed()`, `is_denied()`, `requires_confirmation()` provide ergonomic checks.

**Confidence thresholds** are used in the immunology subsystem (`Antigen::confidence` field, clamped [0.0, 1.0]) and in `reflex::confidence`, but the veto engine itself does **not** currently have a confidence threshold pass. The new `from_confidence()` adapter fills this gap.

### How Ternary::Neutral Maps to RequireConfirmation

The mapping is straightforward Kleene logic:

| `Ternary` | `VetoDecision` | Meaning |
|-----------|----------------|---------|
| `Positive` | `Allow` | Clear pass |
| `Neutral` | `RequireConfirmation(reason)` | Ambiguous / low confidence → ask user |
| `Negative` | `Deny(reason)` | Clear block |

The `.from_ternary(t, reason)` adapter function performs this mapping. A convenience `from_confidence(score, threshold, label)` bridges the old `bool + confidence` pattern into the ternary model.

---

## Adapter Source

### `ternary-engine` crate (`ternary-engine/src/lib.rs`)

```rust
//! `ternary-engine` — a three-valued logic type.
//!
//! Provides [`Ternary`] with three states: `Positive`, `Neutral`, and `Negative`,
//! plus combinators for decision-making pipelines.

/// A three-valued logic state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum Ternary {
    /// The affirmative / allow / true state.
    Positive,
    /// The indeterminate / unknown / require-confirmation state.
    Neutral,
    /// The negative / deny / false state.
    Negative,
}
```

Key operations: `from_bool()`, `from_option()`, Kleene `and()`/`or()`/`not()`, plus `TernaryDecision` adapter type.

### `veto/ternary.rs` — The Adapter

```rust
//! Adapter: ternary-engine ⟶ veto engine decisions
//!
//! Maps Ternary values to VetoDecision.

use ternary_engine::Ternary;
use super::VetoDecision;

/// Convert a Ternary value into a VetoDecision
pub fn decision_from_ternary(t: Ternary, reason: impl Into<String>) -> VetoDecision {
    match t {
        Ternary::Positive => VetoDecision::Allow,
        Ternary::Neutral => VetoDecision::RequireConfirmation(reason.into()),
        Ternary::Negative => VetoDecision::Deny(reason.into()),
    }
}

/// Convert a fallible predicate to a VetoDecision
pub fn from_fallible_predicate(pred: impl FnOnce() -> Option<String>) -> VetoDecision {
    match pred() {
        None => VetoDecision::Allow,
        Some(reason) => VetoDecision::RequireConfirmation(reason),
    }
}

/// Bridge the old bool + confidence pattern
pub fn from_confidence(confidence: f64, threshold: f64, label: &str) -> VetoDecision {
    if confidence >= threshold {
        VetoDecision::Allow
    } else {
        VetoDecision::RequireConfirmation(format!(
            "{} confidence {:.3} < threshold {:.3}",
            label, confidence, threshold
        ))
    }
}

pub fn decision_with_default(t: Ternary) -> VetoDecision {
    decision_from_ternary(t, "veto engine: ternary decision")
}
```

---

## Test Results

### `cargo test -p pincher-core` — 138 passed ✓

All **9 new ternary adapter tests** pass:

```
test security::veto::ternary::tests::test_confidence_above_threshold ...... ok
test security::veto::ternary::tests::test_confidence_below_threshold ..... ok
test security::veto::ternary::tests::test_decision_with_default ......... ok
test security::veto::ternary::tests::test_fallible_predicate_none_is_allow .. ok
test security::veto::ternary::tests::test_fallible_predicate_some_is_confirmation . ok
test security::veto::ternary::tests::test_negative_maps_to_deny ......... ok
test security::veto::ternary::tests::test_neutral_maps_to_require_confirmation . ok
test security::veto::ternary::tests::test_positive_maps_to_allow ........ ok
```

Plus 2 doc-tests in `ternary.rs` pass.

### `cargo test -p ternary-engine` — 8 passed ✓

All Kleene logic, mapping, roundtrip, and fallible-predicate tests pass.

**Grand total: 146 tests passing, 0 failing.**

---

## Changeset

| File | Change |
|------|--------|
| `Cargo.toml` | Added `ternary-engine` workspace member |
| `ternary-engine/Cargo.toml` | New crate manifest |
| `ternary-engine/src/lib.rs` | `Ternary` enum + `TernaryDecision` adapter (265 lines) |
| `pincher-core/Cargo.toml` | Added `ternary-engine` path dep |
| `pincher-core/src/security/mod.rs` | Added `pub use veto::ternary;` re-export |
| `pincher-core/src/security/veto/mod.rs` | `veto.rs` → `veto/mod.rs`; added `pub mod ternary;` |
| `pincher-core/src/security/veto/ternary.rs` | New adapter module (152 lines) |

---

## Next Steps (Phase 2+)

1. **Replace `bool + confidence` in `VetoEngine::check()`** with full Ternary evaluation pipeline
2. **Add Kleene chaining** in rule evaluation (e.g., low-confidence deny + threshold → Neutral)
3. **Expose `from_confidence()` via VetoEngine** for configurable confidence thresholds per rule
4. **Optional:** Make `ternary-engine` a git dep published to `github.com/SuperInstance/ternary-engine`

---

*Generated by Kimi Ternary Root (subagent) for Phase 1 ternary-engine integration.*
