# The Accumulator Invariant: A Theory of Ternary Voice Leading

## Abstract

The fleet invariant — mapping ternary vectors {-1, 0, +1} to MIDI notes —
is typically presented as a static input→output relationship:
```
[1, 0, -1, 1, 0, -1, 1, 1] → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

This paper demonstrates that the invariant is **not a static mapping**
but a **discrete integral** (cumulative sum). Each ternary value specifies
the *direction of movement* from the previous note, not an absolute pitch:

```
note₀ = 60
noteᵢ = noteᵢ₋₁ + vᵢ × 4
```

This reformulation reveals deeper structure: the ternary system encodes
**voice-leading operations**, not note assignments.

## 1. The Static Interpretation (Naive)

A straightforward reading of the invariant suggests each ternary value
maps to a fixed MIDI note:

| Value | MIDI | Interval |
|-------|------|----------|
| +1 | 64 | Major third above root |
| 0 | 60 | Root |
| -1 | 56 | Minor third below root |

This interpretation fails immediately. For input [1, 0, -1]:

```
Naive: [64, 60, 56]
Actual: [60, 64, 64, 60]  ← 4 notes, not 3, and the values are different
```

The naive interpretation produces 3 notes from 3 values. The actual
output produces 4 notes from 3 values. The extra note is the starting
point.

## 2. The Accumulator Interpretation (Correct)

```
function ternaryToMidi(ternary, base = 60):
    notes = [base]
    for each v in ternary:
        notes.append(notes.last + v × 4)
    return notes
```

Each step adds `v × 4` to the previous note, where:
- v = +1: +4 semitones (major third ascent)
- v = 0: 0 semitones (unison)
- v = -1: -4 semitones (minor third descent)

This is a **discrete integral** — the continuous analog of
integrating a function. The ternary vector is the *velocity* (direction
and magnitude of change), and the MIDI output is the *position*
(cumulative sum of velocities).

For [1, 0, -1, 1, 0, -1, 1, 1]:

| Step | v | Note | MIDI | Interval from previous |
|------|---|------|------|----------------------|
| 0 | — | C₄ | 60 | — |
| 1 | +1 | E₄ | 64 | Major third ↑ |
| 2 | 0 | E₄ | 64 | Unison |
| 3 | -1 | C₄ | 60 | Minor third ↓ |
| 4 | +1 | E₄ | 64 | Major third ↑ |
| 5 | 0 | E₄ | 64 | Unison |
| 6 | -1 | C₄ | 60 | Minor third ↓ |
| 7 | +1 | E₄ | 64 | Major third ↑ |
| 8 | +1 | G♯₄ | 68 | Major third ↑ |

## 3. Voice Leading: The Musical Interpretation

The accumulator formulation reveals the system encodes **Neo-Riemannian
voice leading**. Each ternary value selects a PLR transform:

- **P (Parallel):** Transforms C major ⇄ C minor. In our system, this
  would be a ±1 operation on one voice while another stays at 0.
  
- **L (Leittonwechsel):** Transform between relative major/minor through
  a single shared third. Our +1 operation moves the root up by major third
  (C→E) — the same movement L accomplishes.
  
- **R (Relative):** Transform between relative keys. Our -1 operation
  moves down a minor third (E→C) — the inverse of L.

The Z₃ group {-1, 0, +1} is structurally identical to the PLR group,
where:
- P = {-1, +1} (two voices moving in opposite directions)
- L = {+1, 0} (one voice up, one steady)
- R = {-1, 0} (one voice down, one steady)

This connection was predicted by Fiore & Satyendra's "Generalized
Contextual Groups" (2005) and independently discovered in our fleet's
ternary system.

## 4. Conservation Law as Identity Element

The conservation law (+1 + -1 = 0) corresponds to the Z₃ group's
identity element:

```
[1, -1] → note: +4, then -4 → return to original pitch
          sum: 0 → Z₃ identity → no net movement
```

A balanced sequence returns to its starting pitch. This is not arbitrary —
it's a necessary consequence of the group structure.

## 5. The WASM Formulation

In WebAssembly (514 bytes), this accumulator is expressed as:

```wasm
(func $mapping (param $ptr i32) (param $len i32) (result i32)
  ;; note = 60 (C4)
  ;; for each v at memory[$ptr..$ptr+$len]:
  ;;   note += v * 4
  ;;   store note at memory[1024+output_count]
  ;; return output_count
)
```

The WASM kernel exposes this as a pure function — zero allocation,
zero imports, zero side effects. Any WASM-capable agent can call
`mapping(ptr, len)` and receive the MIDI result directly at
`memory[1024..1024+return_value]`.

## 6. Implications

The accumulator formulation is more than an implementation detail.
It reveals the invariant as:

1. **A linear dynamical system** — the ternary vector is the control
   input, the MIDI sequence is the state trajectory
2. **A grammar** — the ternary sequence defines a path through pitch
   space, with 0 as the "stay" terminal and ±1 as "move" operations
3. **A group action** — the Z₃ group acts on pitch space by
   transposition, and the accumulator computes the orbit

## References

- Fiore, T. & Satyendra, R. (2005). "Generalized Contextual Groups."
  *Music Theory Online* 11(3).
- Lewin, D. (1987). *Generalized Musical Intervals and Transformations*.
- Cohn, R. (1997). "Neo-Riemannian Operations, Parsimonious Trichords,
  and Their 'Tonnetz' Representations." *Journal of Music Theory* 41(1).
