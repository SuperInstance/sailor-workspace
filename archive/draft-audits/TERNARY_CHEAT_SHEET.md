# Ternary Quick Reference

*A one-page cheat sheet for the SuperInstance ternary ecosystem.*

---

## The Core Idea

Three states. One invariant. 250 crates.

```
-1  →  Negative, reject, below, down, cold, fail, sell
 0  →  Neutral, abstain, on-target, idle, hold, warn
+1  →  Positive, accept, above, up, hot, pass, buy
```

**The invariant**: In a closed system, the sum of all ternary states is constant.

---

## Laws of Ternary Logic

| Operation | Result |
|-----------|--------|
| Negation | `-(+1) = -1`, `-(0) = 0`, `-(-1) = +1` |
| Addition | `+1 + +1 = -1`, `-1 + -1 = +1` (mod 3) |
| Identity | `x + 0 = x` |
| Inverse | `x + (-x) = 0` |
| Associative | `(a + b) + c = a + (b + c)` |

---

## Symmetry Groups (Organize 250 Crates)

| Group | Invariant | Example crates |
|-------|-----------|---------------|
| **Rotational** | Cycle stability | ring, cycle, harmonic |
| **Translational** | Shift invariance | matrix, route, motion |
| **Scalable** | Self-similarity | topology, fractal, membrane |
| **Reductive** | Information density | compiler, optimizer, grammar |

---

## Quick Reference: Library Tiers

| Tier | What | How to depend |
|------|------|--------------|
| `ternary-types` | The $\{-1, 0, +1\}$ type | `ternary-types = { git = "..." }` |
| `ternary-core` | Traits (Dynamics, Measure) | `ternary-core = { git = "..." }` |
| `ternary-cookbook` | 11 runnable demos | `cargo run --example <name>` |
| `pincher` | Reflex runtime with veto | `pincher-core = { git = "..." }` |
| 245+ domain crates | Specific problems | Browse by symmetry group |

---

## 3-Step Beta Test (For Any Crate)

```
1. cargo build      → Does it compile?
2. cargo test       → Group axioms hold?
3. cargo doc --open → Cross-links to siblings?
```

---

## When NOT to Use Ternary

- Your system genuinely has two outcomes (pass/fail, on/off)
- You need floating-point precision (ternary is discrete)
- You're unsure which third state to pick (use 0 as "unknown" until you find it)
- The system must be understood by people who refuse to learn three-valued logic

---

## The a-ha in One Sentence

Binary is a hardware constraint. Ternary is a logic choice. Most real problems have three natural outcomes, and forcing them into two creates contradictions, dead code, and untestable edge cases.
