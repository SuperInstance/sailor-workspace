# CROSS_REFERENCE.md — 🪟 fleet-a2a-wasm Ecosystem Map

> A navigable map of all repositories in the SuperInstance fleet that connect to, depend on, or extend the 514-byte WASM ternary kernel.

---

## 1. Core Node: fleet-a2a-wasm (You Are Here)

```
https://github.com/SuperInstance/fleet-a2a-wasm
```

**Role:** 514-byte WASM ternary → MIDI kernel.  
**Input:** Ternary vector {+1, 0, −1} written to memory offset 256.  
**Output:** MIDI note sequence at memory offset 1024 (via `mapping()`).  
**Also provides:** `conservation()`, `symmetry()`, `processOne()`, `selfTest()`.  
**Freshness:** Always the latest. Binary checked in — no build step.

### Files in this repo

| File | Purpose |
|------|---------|
| `ternary-core.wasm` | 🟢 **The kernel.** 514-byte compiled binary. Ready to use. |
| `ternary-core.wat` | WAT source — human-readable WebAssembly Text Format |
| `ternary-core.c` | C source — compiles via clang + wasm-ld |
| `test.mjs` | Test suite (8 tests, all pass — see STUDENT_GUIDE.md) |
| `.gitpod.yml` | Gitpod configuration for online development |

---

## 2. Pipeline Node: fleet-a2a-pipeline

```
https://github.com/SuperInstance/fleet-a2a-pipeline
```

**Role:** ESM pipeline that wraps the WASM kernel in a human/agent-friendly API.  
**Key exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `readStrategyVector(text)` | `string → number[]` | Parses "1,0,-1" → [1, 0, −1] |
| `vectorToTernary(vector)` | `number[] → number[][]` | Groups into {−1, 0, +1} frames |
| `ternaryToMidi(ternary, base=60)` | `number[], number → number[]` | **Calls this WASM kernel** |
| `midiToNoteName(midiNote)` | `number → string` | 60 → "C4" |
| `midiToNoteNames(midiNotes)` | `number[] → string[]` | Bulk conversion |
| `analyzeHarmony(midiNotes)` | `number[] → object` | Chord, intervals, pitch set |
| `detectMirrors(vectors)` | `number[][] → object` | Find v + v' = 0 pairs |
| `runPipeline(strategyText)` | `string → object` | Full pipeline → structured JSON |

**Edge:** `fleet-a2a-pipeline` imports the WASM binary from `fleet-a2a-wasm` and wraps it in ergonomic JS functions. If you only want the algorithm without touching WASM directly, pipeline is your entry point.

---

## 3. Spectral Node: fleet-a2a-spectral

```
https://github.com/SuperInstance/fleet-a2a-spectral
```

**Role:** Spectral analysis of ternary sequences. Contains community guidelines (CODE_OF_CONDUCT).

**Connection to this repo:** Consumes MIDI output from `fleet-a2a-wasm` and performs spectral transforms — Fourier analysis of ternary patterns, frequency-domain decomposition of harmonic sequences.

**Use case:** When you need to understand the harmonic structure of a ternary → MIDI transform beyond pitch tracking. Find emergent patterns, periodicity, and spectral centroids.

---

## 4. Bridge Node: fleet-a2a-bridge

```
https://github.com/SuperInstance/fleet-a2a-bridge
```

**Role:** I2I bottle bridge + spreadsheet cell formula system for agent coordination.

**Core concept:** Agents communicate via "I2I bottles" — structured messages of the form:

```json
{
  "type": "STATUS|TASK|CHECKPOINT|BLOCKER|SPLINE|SYNTHESIS",
  "from": "agent_id",
  "to": "agent_id",
  "body": "payload"
}
```

These map to spreadsheet cell formulas:

```
=STATUS("oracle2", "ready")
=TASK("forgemaster", "build", "binary")
=INVARIANT("[1,0,-1]")   // ← calls ternary kernel conservation check
```

**Connection to this repo:** The `SPLINE` type in I2I bottles routes to the `conservation()` export of this WASM kernel. When an agent sends `=INVARIANT("[1,0,-1]")`, the bridge dispatches to `ternary-core.wasm` and expects 0.

---

## 5. Ternary Libraries (ternary-*)

These are sibling libraries that operate on ternary algebra without the WASM layer:

| Library | Purpose |
|---------|---------|
| `ternary-arithmetic` | Core Z₃ arithmetic: addition, multiplication, inverse modulo 3 |
| `ternary-harmony` | Maps ternary vectors to harmonic functions (tonic, subdominant, dominant) |
| `ternary-chord` | Chord construction from ternary patterns |

**Connection to this repo:** The WASM kernel is the *compiled, portable* implementation of these algebraic principles. The libraries define the math; this repo runs it in 514 bytes.

---

## 6. Constraint-Theory Core (constraint-theory-core)

```
https://github.com/SuperInstance/constraint-theory-core
```

**Role:** Formal constraint-theoretic foundations that the fleet invariant must satisfy.

**Key constraints that this WASM kernel satisfies:**

1. **Purity:** Zero side effects, zero imports, deterministic computation
2. **Conservation:** `sum(in) = sum(out)` — no information created or destroyed
3. **Boundedness:** All values in {−128..127} for input, {0..255} for output
4. **Composability:** The `mapping()` output of one run can feed `processOne()` of another
5. **Invariance:** `selfTest()` always returns 1

**Connection to this repo:** Every export in `ternary-core.wasm` is proven to satisfy constraints defined in this theory core. The WASM kernel is the *executable specification* of the constraint theory.

---

## Dependency Graph

```
                       ┌──────────────────────┐
                       │ constraint-theory-core│
                       │ (formal foundations)  │
                       └──────────┬───────────┘
                                  │ satisfies
                                  ▼
    ┌──────────────────────────────────────────────────┐
    │            ternary-* libraries                    │
    │  (arithmetic, harmony, chord — algebraic theory)  │
    └──────────────────┬───────────────────────────────┘
                       │ implements
                       ▼
    ┌──────────────────────────────────────────────────┐
    │       ⭐ fleet-a2a-wasm  ← YOU ARE HERE          │
    │            514-byte WASM kernel                   │
    │       ternary → MIDI via discrete integral        │
    └──────┬──────────────┬────────────────┬───────────┘
           │              │                │
           ▼              ▼                ▼
    ┌───────────┐  ┌───────────┐  ┌────────────────┐
    │ pipeline  │  │  spectral  │  │    bridge      │
    │ ESM wrap  │  │  analysis  │  │  I2I bottles   │
    └───────────┘  └───────────┘  └────────────────┘
```

---

## Data Flow Between Nodes

```
strategy CSV text
      │
      ▼
fleet-a2a-pipeline.readStrategyVector()
      │
      ▼
fleet-a2a-pipeline.ternaryToMidi()
      │
      ├──▶ [calls] fleet-a2a-wasm.exports.mapping(ptr, len)
      │
      ▼
MIDI notes [60, 64, ...]
      │
      ├──▶ fleet-a2a-pipeline.midiToNoteNames()     → ["C4", "E4"]
      ├──▶ fleet-a2a-pipeline.analyzeHarmony()       → {chord: "Cmaj", ...}
      ├──▶ fleet-a2a-spectral                        → spectral analysis
      │
      ▼
fleet-a2a-bridge I2I bottles
      │
      ▼
=STATUS("agent", "complete") via spreadsheet cell formula
```

---

## Quick Cross-Reference Table

| You're using… | Import from | To get… |
|---------------|-------------|---------|
| Raw ternary → MIDI | `fleet-a2a-wasm/ternary-core.wasm` | Fastest, smallest, zero-deps |
| CSV-strategy → MIDI | `fleet-a2a-pipeline/pipeline.mjs` | Convenience: parse, convert, analyze |
| MIDI → note names | `fleet-a2a-pipeline/pipeline.mjs` `midiToNoteNames()` | Human-readable output |
| Ternary → harmony | `ternary-harmony` | Harmonic function labels |
| Z₃ group algebra | `ternary-arithmetic` | Add/multiply in Z₃ |
| Formal constraints | `constraint-theory-core` | Prove invariants |
| Agent coordination | `fleet-a2a-bridge` | I2I bottle routing |
| Spectral analysis | `fleet-a2a-spectral` | Frequency-domain transforms |

---

## Related Topics

- **Neo-Riemannian theory:** The +1/0/−1 mapping corresponds to P/L/R transformations (Parallel, Leittonwechsel, Relative)
- **Z₃ group:** The cyclic group of order 3 wraps: +1 + (−1) = 0 = identity
- **Discrete integral:** `note[i] = note[i−1] + v[i] × 4` — cumulative sum of the input
- **MIDI specification:** Notes 0–127, middle C = 60
- **WebAssembly:** Standard binary format, 514 bytes, zero imports
- **I2I bottle fleet:** Spreadsheet-cell formula coordination system

---

## Index

- [README.md](README.md) — Full documentation
- [AGENT.md](AGENT.md) — Autonomous agent integration guide
- [STUDENT_GUIDE.md](STUDENT_GUIDE.md) — "Wait, show me" beginner tutorial
- `ternary-core.wasm` — The 514-byte binary
- `ternary-core.wat` — WAT source
- `ternary-core.c` — C source
- `test.mjs` — Test suite

---

*Last updated: 2026-06-08 · Need more cross-references? Open an issue.* 🪟
