# fleet-a2a-wasm: 514-Byte WASM Ternary Kernel 🪟

> **514 bytes. Zero deps. No libc. No DOM.**  
> A pure WebAssembly module implementing the ternary accumulator algorithm — agent-consumable, self-contained, mathematically pristine.

[![Size](https://img.shields.io/badge/size-514%20B-blue)](ternary-core.wasm)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Fleet](https://img.shields.io/badge/fleet-a2a-purple)](https://github.com/SuperInstance/fleet-a2a-wasm)

---

## 🧠 What Is This?

A 514-byte WebAssembly kernel that converts **ternary motion vectors** (values in {+1, 0, −1}) into **MIDI note sequences** via a discrete integral. Agents import the `.wasm` binary directly — no HTML, no UI, no runtime dependencies.

```
ternary:  [1,  0, -1,  1,  0, -1,  1,  1]
MIDI:     [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

---

## 🏛️ Architecture

```
┌───────────────────────────────────────────────────────────────┐
│               A2A WASM Ternary Kernel (514 B)                │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  ternary      │    │  cumulative  │    │  MIDI note     │  │
│  │  vector       │───▶│  sum (×4)    │───▶│  sequence      │  │
│  │  {+1,0,-1}   │    │  integral    │    │  [60,64,...]   │  │
│  └──────────────┘    └──────────────┘    └────────────────┘  │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ conservation│  │  symmetry    │  │  processOne          │  │
│  │ → Z₃ sum    │  │ → palindrome │  │ → single step        │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                               │
│  memory[0..65535]                                             │
│  ├── reserved [0..255]                                        │
│  ├── input    [256..]   (int8, 1 byte per ternary value)     │
│  └── output   [1024..]  (uint8, 1 byte per MIDI note)       │
└───────────────────────────────────────────────────────────────┘
         ↑ agent imports .wasm directly
         ↑ no DOM, no HTML, no UI, no syscalls
```

---

## 📐 The Invariant

The core algorithm is a **discrete integral**:

```
note[i] = note[i−1] + v[i] × 4
```

Where:
- `note[0]` = 60 (middle C), always emitted as the starting pitch
- `v[i]` ∈ {+1, 0, −1} — the ternary motion value
- `× 4` maps each unit to 4 semitones (one major or minor third)

This is not a lookup table — it's a **cumulative sum**. Each note depends on all previous values. Change any `v[i]` and every subsequent note shifts. The result is a **discrete integral** of the ternary vector, not a simple mapping.

**Example walkthrough for [1, 0, −1, 1, 0, −1, 1, 1]:**

| i | v[i] | formula | note |
|---|------|---------|------|
| — | — | starting pitch (note[0]) | **60** |
| 0 | +1 | 60 + 1×4 | **64** |
| 1 | 0 | 64 + 0×4 | **64** |
| 2 | −1 | 64 + (−1)×4 | **60** |
| 3 | +1 | 60 + 1×4 | **64** |
| 4 | 0 | 64 + 0×4 | **64** |
| 5 | −1 | 64 + (−1)×4 | **60** |
| 6 | +1 | 60 + 1×4 | **64** |
| 7 | +1 | 64 + 1×4 | **68** |

Result: `[60, 64, 64, 60, 64, 64, 60, 64, 68]` ✅

---

## 🧮 Z₃ Group Theory Connection

The ternary values {+1, 0, −1} form the cyclic group **Z₃** under addition modulo 3.

```
Z₃ addition table:

  + │  0   1   2
  ───┼───────────
  0 │  0   1   2
  1 │  1   2   0
  2 │  2   0   1
```

Mapping to signed values:

| Signed | Z₃ | Meaning |
|--------|----|---------|
| 0 | 0 | identity (unison) |
| +1 | 1 | major third up |
| −1 | 2 | minor third down |

The **identity element** of Z₃ is 0. When a ternary vector contains a balanced pair of +1 and −1, their sum is 0 — the identity — and the conservation check passes. This is checked by the `conservation` export:

```
conservation([1, 0, -1], 3) → 0   ✅  (identity: +1 + (−1) = 0)
conservation([1, 1, -1], 3) → 1   ❌  (not balanced)
```

This means: **a ternary vector that sums to zero represents a closed harmonic gesture** — it returns to the starting point.

---

## 🎵 Neo-Riemannian P/L/R Mapping

The ternary values map directly to Neo-Riemannian voice-leading transformations:

| Value | Transformation | Semitones | Voice-leading |
|-------|---------------|-----------|---------------|
| **+1** | **Parallel (P)** or **Relative (R)** | +4 (major third up) | 2 voices move in same direction by 4 semitones, 1 holds |
| **0** | **Identity (L⁰)** | 0 (unison) | All voices hold |
| **−1** | **Leittonwechsel (L)** | −4 (minor third down) | 2 voices move in opposite direction by 4 semitones, 1 holds |

In Neo-Riemannian theory, P/L/R transformations are the fundamental operations connecting major and minor triads. The ±4 semitone leap corresponds to moving between parallel keys (C major ↔ C minor = +4 semitones on the third) or relative keys (C major ↔ A minor = motion patterns).

The kernel's mapping function is thus a **Neo-Riemannian step sequencer**: each ternary value selects a transformation, and the cumulative sum traces a harmonic path through the Tonnetz.

---

## 🌳 Forest Conservation Law

Any valid ternary transform obeys the **forest conservation law**:

```
sum(in) = sum(out)
```

That is: the sum of your input ternary vector equals 0 if and only if the output is harmonically closed (the final note equals the starting note).

```
[1, 0, -1]  → sum = 0   →  MIDI: [60, 64, 64, 60]  →  last = first = 60 ✅
[1, 1,  1]  → sum = 3   →  MIDI: [60, 64, 68, 72]   →  last ≠ first
```

This is the **invariant that the fleet upholds**: no information is lost or created. The ternary vector conserves its algebraic signature. The `conservation` export explicitly computes this — returning 0 means the harmonic gesture is balanced.

> A forest conserves: every note that goes up must come down.

---

## 🚀 Agent Usage

### Node.js (ESM)

```js
import { readFileSync } from 'fs';

const wasm = await WebAssembly.compile(readFileSync('./ternary-core.wasm'));
const { exports } = await WebAssembly.instantiate(wasm, {});
const mem = exports.memory;

// Prepare input — ternary vector at memory offset 256
const view = new Int8Array(mem.buffer);
[1, 0, -1, 1, 0, -1, 1, 1].forEach((v, i) => view[256 + i] = v);

// Compute MIDI
const count = exports.mapping(256, 8);
const midi = Array.from(
  { length: count },
  (_, i) => new Uint8Array(mem.buffer)[1024 + i]
);

console.log(midi);  // [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

### Browser

```js
const wasm = await WebAssembly.compileStreaming(fetch('./ternary-core.wasm'));
const { exports } = await WebAssembly.instantiate(wasm, {});
// Same API — no DOM dependencies required
```

### Any WASM Runtime

The binary has **zero imports** — it can run in any WebAssembly runtime (Wasmer, Wasmtime, WAMR, edge workers, embedded systems).

---

## 📦 Exports

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `mapping` | `(buf: i32, len: i32) → i32` | Count of MIDI notes written | Reads ternary vector at `memory[buf..buf+len]`, writes MIDI notes to `memory[1024..]` |
| `conservation` | `(buf: i32, len: i32) → i32` | Sum of values | Z₃ group identity: returns 0 when input is balanced |
| `symmetry` | `(buf: i32, len: i32) → i32` | 1 if palindrome, 0 otherwise | Detects mirror-symmetric ternary patterns |
| `processOne` | `(v: i32, prev: i32) → i32` | Next MIDI note | Single-step: `prev + v×4` |
| `selfTest` | `() → i32` | Always 1 | Quick sanity check — returns 1 |

---

## 🧱 Memory Layout

| Offset | Size | Purpose |
|--------|------|---------|
| 0 | 256 B | Reserved |
| 256 | variable | Input ternary vector (`int8`, 1 byte per value) |
| 1024 | variable | Output MIDI notes (`uint8`, 1 byte per note) |

---

## 🧪 "Wait, show me" — Live Execution

Here's a complete, copy-pasteable session. Run this in any Node.js environment:

```bash
# 1. Clone the repo
git clone https://github.com/SuperInstance/fleet-a2a-wasm.git
cd fleet-a2a-wasm

# 2. Run the test suite (no npm install needed)
node test.mjs
```

Expected output:

```
✅ INVARIANT: [60,64,64,60,64,64,60,64,68] === [60,64,64,60,64,64,60,64,68]
✅ EMPTY: [60]
✅ [+1] → [60,64]
✅ [-1] → [60,56]
✅ [0] → [60,60]
✅ CONSERVATION: [1,0,-1] = 0
✅ SYMMETRY: [1,0,1] palindrome
✅ SYMMETRY: [1,0,-1] not palindrome
✅ SELF-TEST: ok

✅ ALL 8 TESTS PASS (514 byte WASM)
```

No dependencies. No `npm install`. No build step. The WASM binary is checked in — it works on bare `node` out of the box.

---

## 🔬 Binary Purity — Why 514 Bytes Matters

| Format | Size |
|--------|------|
| WAT source | ~2.5 KB |
| C source | ~1.2 KB |
| WASM binary | **514 B** |
| Gzipped | ~300 B |

This isn't a party trick. 514 bytes means:

- **No libc** — no `printf`, `malloc`, `stdlib`. The C source compiles with `-nostdlib`. Every byte is hand-accountable.
- **No syscalls** — zero system calls. The module cannot open files, create sockets, or spawn processes. It is **deterministic**. Same input → same output, always.
- **No HTTP** — no fetch, no XHR, no network calls. This module cannot phone home, leak data, or be MITM'd.
- **No DOM** — no `window`, `document`, `navigator`. Runs identically in Node.js, browser, edge worker, embedded, Wasmtime — anywhere WASM runs.
- **Zero imports** — the module imports nothing from the host. Plug it in, call it. That's it.
- **Verifiable** — 514 bytes is small enough to audit by hand. Read the WAT source: every instruction is visible. No hidden payloads, no obfuscation.
- **Cold-start instant** — the binary fits in a single TCP packet. Load time is sub-millisecond even on glacial connections.
- **Cache-friendly** — the entire binary fits in L1 instruction cache on any modern CPU.

**514 bytes is pure signal.** No framework tax. No abstractions. Just the algorithm, encoded in the leanest possible representation.

---

## 🔗 Fleet Cross-References

| Repository | Role |
|-----------|------|
| [fleet-a2a-wasm](https://github.com/SuperInstance/fleet-a2a-wasm) | 🪟 You are here — 514-byte WASM kernel |
| [fleet-a2a-pipeline](https://github.com/SuperInstance/fleet-a2a-pipeline) | 🔗 ESM pipeline: strategy CSV → ternary → MIDI → structured JSON |
| [fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral) | 🌌 Spectral analysis of ternary sequences |
| [fleet-a2a-bridge](https://github.com/SuperInstance/fleet-a2a-bridge) | 🌉 I2I bottle bridge: spreadsheet cell formulas for agent coordination |
| `ternary-*` | Family of ternary algebra libraries (ternary-arithmetic, ternary-harmony, ternary-chord) |
| `constraint-theory-core` | 📐 Constraint-theoretic foundations of the fleet invariant |

### How They Fit Together

```
strategy CSV ──▶ fleet-a2a-pipeline ──▶ .mjs processing
                      │
                      ▼
            fleet-a2a-wasm ◀── .wasm binary
            (this repo)
                      │
                      ▼
            fleet-a2a-spectral ◀── spectral analysis
                      │
                      ▼
            fleet-a2a-bridge ◀── I2I agent coordination
```

The WASM kernel is the **computational core** — the 514-byte engine that all other fleet-a2a repos either call, wrap, or analyze.

---

## 🔧 Build From Source

### From WAT (needs wabt)

```bash
wat2wasm ternary-core.wat -o ternary-core.wasm
```

### From C (needs clang + wasm-ld)

```bash
clang --target=wasm32 -nostdlib -Wl,--no-entry \
  -Wl,--export=mapping -Wl,--export=conservation \
  -Wl,--export=symmetry -Wl,--export=processOne \
  -Wl,--export=selfTest -O3 -Os \
  -o ternary-core.wasm ternary-core.c
```

---

## ✅ Agent Contract

This module is designed for **agent-to-agent** use. Any WASM-capable agent can:

1. **Import** the `.wasm` binary (via `readFileSync`, `fetch`, or any WASM loader)
2. **Instantiate** with an empty import object — no host functions needed
3. **Call** the five exported functions
4. **Read** results from linear memory at offset 1024

Zero side effects. Zero allocations. Zero imports. Pure computation.

---

## 📄 License

MIT — use it, fork it, embed it. The fleet welcomes all.
