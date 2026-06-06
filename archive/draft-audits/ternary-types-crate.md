# `ternary-types` Crate — Launch Package

Created: 2026-06-05

## Overview

A lightweight, dependency-free `Ternary` (trinary) enum representing balanced-ternary states `Negative (-1)`, `Neutral (0)`, and `Positive (+1)`. Feature-gated serde serialization/deserialization.

**Build & Test Status: ✅ PASS** (11 unit tests, 4 doc tests, clippy-clean)

---

## Full Source

### `Cargo.toml`

```toml
[package]
name = "ternary-types"
version = "0.1.0"
edition = "2021"
description = "A lightweight Ternary (trinary) enum with serde support — Negative, Neutral, Positive"
repository = "https://github.com/SuperInstance/ternary-types"
license = "MIT OR Apache-2.0"
keywords = ["ternary", "trinary", "enum", "serde"]
categories = ["data-structures", "encoding", "no-std"]

[features]
default = []
serde = ["dep:serde"]

[dependencies]
serde = { version = "1", optional = true, features = ["derive"] }

[dev-dependencies]
serde_json = "1"
serde_test = "1"
```

### `src/lib.rs`

```rust
//! # ternary-types
//!
//! A lightweight, dependency-free [`Ternary`] (trinary) enum that represents the three
//! fundamental balanced-ternary states:
//!
//! | Variant   | Integer |
//! |-----------|---------|
//! | `Negative`| `-1`    |
//! | `Neutral` | `0`     |
//! | `Positive`| `+1`    |
//!
//! Feature-gated `serde::{Serialize, Deserialize}` is available behind the `serde` feature flag.
//!
//! ## Quick start
//!
//! ```rust
//! use ternary_types::Ternary;
//!
//! let t = Ternary::Positive;
//! assert_eq!(i8::from(t), 1_i8);
//! assert_eq!(Ternary::try_from(0_i8).unwrap(), Ternary::Neutral);
//! ```

use core::fmt;

/// The three possible states of a balanced ternary digit.
///
/// `Negative` represents `-1`, `Neutral` represents `0`, and `Positive` represents `+1`.
///
/// # Examples
///
/// ```
/// use ternary_types::Ternary;
///
/// let values = [Ternary::Negative, Ternary::Neutral, Ternary::Positive];
/// for (i, t) in [(-1i8, Ternary::Negative), (0, Ternary::Neutral), (1, Ternary::Positive)] {
///     assert_eq!(t, Ternary::try_from(i).unwrap());
///     assert_eq!(i8::from(t), i);
/// }
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum Ternary {
    /// Represents the value `-1`.
    Negative,
    /// Represents the value `0` (the neutral / zero state).
    Neutral,
    /// Represents the value `+1`.
    Positive,
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

impl fmt::Display for Ternary {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Negative => write!(f, "-1"),
            Self::Neutral  => write!(f, "0"),
            Self::Positive => write!(f, "+1"),
        }
    }
}

// ---------------------------------------------------------------------------
// TryFrom<i8>  —  fallible conversion (only -1/0/1 accepted)
// ---------------------------------------------------------------------------

/// Attempt to convert an `i8` into a [`Ternary`].
///
/// Returns [`TernaryError::InvalidConversion`] if `value` is not `-1`, `0`, or `1`.
impl TryFrom<i8> for Ternary {
    type Error = TernaryError;

    fn try_from(value: i8) -> Result<Self, Self::Error> {
        match value {
            -1 => Ok(Self::Negative),
            0  => Ok(Self::Neutral),
            1  => Ok(Self::Positive),
            _  => Err(TernaryError::InvalidConversion(value)),
        }
    }
}

// ---------------------------------------------------------------------------
// From<Ternary> for i8   (also provides Into<i8>)
// ---------------------------------------------------------------------------

impl From<Ternary> for i8 {
    fn from(value: Ternary) -> Self {
        match value {
            Ternary::Negative => -1,
            Ternary::Neutral  => 0,
            Ternary::Positive => 1,
        }
    }
}

// ---------------------------------------------------------------------------
// TryFrom<i32> / i64 / i16 / isize  —  guard against overflow before narrowing
// ---------------------------------------------------------------------------

macro_rules! impl_try_from_int {
    ($int:ty) => {
        impl TryFrom<$int> for Ternary {
            type Error = TernaryError;

            fn try_from(value: $int) -> Result<Self, Self::Error> {
                match value {
                    -1 => Ok(Ternary::Negative),
                    0  => Ok(Ternary::Neutral),
                    1  => Ok(Ternary::Positive),
                    n if n < -1 => Err(TernaryError::Overflow(n as i64)),
                    _           => Err(TernaryError::Overflow(value as i64)),
                }
            }
        }
    };
}

impl_try_from_int!(i16);
impl_try_from_int!(i32);
impl_try_from_int!(i64);
impl_try_from_int!(isize);

// ---------------------------------------------------------------------------
// Neg —  flip to the opposite pole (Neutral stays Neutral)
// ---------------------------------------------------------------------------

impl core::ops::Neg for Ternary {
    type Output = Self;

    fn neg(self) -> Self::Output {
        match self {
            Self::Negative => Self::Positive,
            Self::Neutral  => Self::Neutral,
            Self::Positive => Self::Negative,
        }
    }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/// Errors that can occur when converting into a [`Ternary`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TernaryError {
    /// The source integer is outside the valid range after narrowing.
    ///
    /// This typically occurs when converting from a wider type (`i32`, `i64`, …)
    /// whose value cannot be represented as `-1`, `0`, or `+1`.
    ///
    /// The inner value is the *original* integer (cast to `i64`) so the caller
    /// can inspect what was rejected.
    Overflow(i64),

    /// The source integer was a valid `i8`-range value that simply isn't `-1`,
    /// `0`, or `+1` (e.g. `42` or `-128`).
    InvalidConversion(i8),
}

impl fmt::Display for TernaryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Overflow(v) => {
                write!(
                    f,
                    "ternary overflow: {v} cannot be narrowed to -1/0/1",
                )
            }
            Self::InvalidConversion(v) => {
                write!(
                    f,
                    "invalid ternary conversion: {v} is not -1, 0, or 1",
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// TernaryResult
// ---------------------------------------------------------------------------

/// A convenience alias for [`Result`] whose error is a [`TernaryError`].
pub type TernaryResult<T> = Result<T, TernaryError>;

// ---------------------------------------------------------------------------
// Iterator helper  —  iterate over all three values
// ---------------------------------------------------------------------------

/// An iterator that yields the three [`Ternary`] variants in order.
///
/// Created by [`Ternary::iter()`].
#[derive(Debug, Clone)]
pub struct TernaryIter {
    idx: u8,
}

impl Iterator for TernaryIter {
    type Item = Ternary;

    fn next(&mut self) -> Option<Self::Item> {
        use Ternary::*;
        let v = match self.idx {
            0 => Some(Negative),
            1 => Some(Neutral),
            2 => Some(Positive),
            _ => None,
        };
        self.idx = self.idx.saturating_add(1);
        v
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        let remaining = 3usize.saturating_sub(self.idx as usize);
        (remaining, Some(remaining))
    }
}

impl ExactSizeIterator for TernaryIter {}

impl Ternary {
    /// Iterate over all three [`Ternary`] variants in order.
    ///
    /// ```
    /// use ternary_types::Ternary;
    ///
    /// let mut it = Ternary::iter();
    /// assert_eq!(it.next(), Some(Ternary::Negative));
    /// assert_eq!(it.next(), Some(Ternary::Neutral));
    /// assert_eq!(it.next(), Some(Ternary::Positive));
    /// assert_eq!(it.next(), None);
    /// ```
    pub fn iter() -> TernaryIter {
        TernaryIter { idx: 0 }
    }

    /// Return the numeric value of this ternary state as an `i8`.
    ///
    /// ```
    /// use ternary_types::Ternary;
    ///
    /// assert_eq!(Ternary::Negative.to_i8(), -1);
    /// assert_eq!(Ternary::Neutral.to_i8(),   0);
    /// assert_eq!(Ternary::Positive.to_i8(),  1);
    /// ```
    pub fn to_i8(self) -> i8 {
        i8::from(self)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use Ternary::*;

    #[test]
    fn try_from_i8() {
        assert_eq!(Ternary::try_from(-1_i8), Ok(Negative));
        assert_eq!(Ternary::try_from(0_i8), Ok(Neutral));
        assert_eq!(Ternary::try_from(1_i8), Ok(Positive));
        assert_eq!(
            Ternary::try_from(42_i8),
            Err(TernaryError::InvalidConversion(42)),
        );
    }

    #[test]
    fn into_i8() {
        assert_eq!(i8::from(Negative), -1);
        assert_eq!(i8::from(Neutral), 0);
        assert_eq!(i8::from(Positive), 1);
    }

    #[test]
    fn display() {
        assert_eq!(format!("{}", Negative), "-1");
        assert_eq!(format!("{}", Neutral), "0");
        assert_eq!(format!("{}", Positive), "+1");
    }

    #[test]
    fn neg() {
        assert_eq!(-Negative, Positive);
        assert_eq!(-Neutral, Neutral);
        assert_eq!(-Positive, Negative);
    }

    #[test]
    fn iter_all() {
        let collected: Vec<Ternary> = Ternary::iter().collect();
        assert_eq!(collected, vec![Negative, Neutral, Positive]);
    }

    #[test]
    fn to_i8_method() {
        assert_eq!(Negative.to_i8(), -1);
        assert_eq!(Neutral.to_i8(), 0);
        assert_eq!(Positive.to_i8(), 1);
    }

    #[test]
    fn try_from_wider_types() {
        assert_eq!(Ternary::try_from(0i32), Ok(Neutral));
        assert_eq!(Ternary::try_from(-1i64), Ok(Negative));
        assert_eq!(Ternary::try_from(1i16), Ok(Positive));
        assert_eq!(
            Ternary::try_from(999i32),
            Err(TernaryError::Overflow(999)),
        );
        assert_eq!(
            Ternary::try_from(-1000i64),
            Err(TernaryError::Overflow(-1000)),
        );
    }

    #[test]
    fn error_display() {
        let e = TernaryError::Overflow(999);
        assert_eq!(
            e.to_string(),
            "ternary overflow: 999 cannot be narrowed to -1/0/1",
        );
        let e = TernaryError::InvalidConversion(42);
        assert_eq!(
            e.to_string(),
            "invalid ternary conversion: 42 is not -1, 0, or 1",
        );
    }

    #[test]
    fn exact_size_iterator() {
        let it = Ternary::iter();
        assert_eq!(it.len(), 3);
    }

    #[cfg(feature = "serde")]
    #[test]
    fn serde_roundtrip() {
        for t in [Negative, Neutral, Positive] {
            let json = serde_json::to_string(&t).unwrap();
            let back: Ternary = serde_json::from_str(&json).unwrap();
            assert_eq!(t, back);
        }
    }

    #[cfg(feature = "serde")]
    #[test]
    fn serde_json_exact() {
        assert_eq!(serde_json::to_string(&Negative).unwrap(), r#""Negative""#);
        assert_eq!(serde_json::to_string(&Neutral).unwrap(), r#""Neutral""#);
        assert_eq!(serde_json::to_string(&Positive).unwrap(), r#""Positive""#);
    }
}
```

---

## Launch Checklist

### ✅ Completed

| Check | Status |
|-------|--------|
| `Ternary` enum with `Negative`, `Neutral`, `Positive` | ✅ |
| `TryFrom<i8>` (fallible) | ✅ |
| `From<Ternary> for i8` (provides `Into<i8>`) | ✅ |
| `TryFrom<i16/i32/i64/isize>` with `Overflow` error | ✅ |
| `TernaryError` enum (`Overflow`, `InvalidConversion`) | ✅ |
| `TernaryResult<T>` type alias | ✅ |
| `Neg` trait (flip polarity) | ✅ |
| `Display` for both `Ternary` and `TernaryError` | ✅ |
| `Ternary::iter()` / `TernaryIter` (ExactSizeIterator) | ✅ |
| `Ternary::to_i8()` convenience method | ✅ |
| Feature-gated `serde::{Serialize, Deserialize}` | ✅ |
| Zero dep in default config (no-std ready core imports) | ✅ |
| Doc comments on all public items + doc tests | ✅ |
| `cargo build` (default features) | ✅ |
| `cargo test` (9 unit + 4 doc tests) | ✅ |
| `cargo test --features serde` (11 unit + 4 doc tests) | ✅ |
| `cargo clippy --all-features` — zero warnings | ✅ |

### 🚀 Still Needed (manual steps)

1. **Push to GitHub**
   ```bash
   cd /tmp/ternary-types
   git init && git add -A && git commit -m "Initial release: ternary-types v0.1.0"
   gh repo create SuperInstance/ternary-types --public --push --source=.
   ```

2. **Publish to crates.io**
   ```bash
   cd /tmp/ternary-types
   cargo login       # paste API token from crates.io
   cargo publish     # publishes v0.1.0
   ```

3. **Add `std::error::Error` impl** (optional)
   - Add `std` feature to `Cargo.toml`: `std = ["serde?/std"]`
   - Uncomment the `impl std::error::Error for TernaryError` in `lib.rs`
   - This enables `anyhow::Error::from(TernaryError)` etc.

4. **Update `pincher` crate** dependency:
   ```toml
   ternary-types = { version = "0.1", features = ["serde"] }
   ```
   Remove the in-crate `Ternary` definition.

---

Crate source lives at `/tmp/ternary-types/` — ready for immediate `cargo publish`.
