# A2A WASM Ternary Kernel

**514 bytes.** Zero deps. No libc. No DOM.

Pure WebAssembly module — agent-consumable binary. Implements the fleet invariant:

```
ternary:  [1,  0, -1,  1,  0, -1,  1,  1]
MIDI:     [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

## Algorithm: Discrete Integral

Each MIDI note = previous_note + v × 4. This is the **cumulative sum** (integral) of the ternary vector. The +1/0/−1 values specify the **direction of movement** from the previous note, not the absolute pitch.

- +1 → major third up (+4 semitones)
-  0 → unison (stay on same note)
- −1 → minor third down (−4 semitones)

## Exports

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `mapping` | `(buf: i32, len: i32) → i32` | Count of MIDI notes written | Reads |-vector at `memory[buf..buf+len]`, writes MIDI notes to `memory[1024..]` |
| `conservation` | `(buf: i32, len: i32) → i32` | Sum of values | Z₃ group identity: +1+(-1)=0 when input is balanced |
| `symmetry` | `(buf: i32, len: i32) → i32` | 1 if palindrome, 0 otherwise | Detects mirror-symmetric ternary patterns |
| `processOne` | `(v: i32, prev: i32) → i32` | Next MIDI note | Single-step: `prev + v×4` |
| `selfTest` | `() → i32` | Always 1 | Quick sanity check |

## Memory Layout

| Offset | Size | Purpose |
|--------|------|---------|
| 0      | 256B | Reserved |
| 256    | variable | Input ternary vector (int8, 1 byte per value) |
| 1024   | variable | Output MIDI notes (uint8, 1 byte per note) |

## Agent Usage (Node.js)

```js
import { readFileSync } from 'fs';
const wasm = await WebAssembly.compile(readFileSync('./ternary-core.wasm'));
const { exports } = await WebAssembly.instantiate(wasm, {});
const mem = exports.memory;

// Prepare input
const view = new Int8Array(mem.buffer);
[1,0,-1,1,0,-1,1,1].forEach((v, i) => view[256 + i] = v);

// Compute MIDI
const count = exports.mapping(256, 8);
const midi = Array.from({length: count}, (_, i) => new Uint8Array(mem.buffer)[1024 + i]);
// midi → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

## Agent Usage (Browser)

```js
const wasm = await WebAssembly.compileStreaming(fetch('./ternary-core.wasm'));
const { exports } = await WebAssembly.instantiate(wasm, {});
// Same API — no DOM dependencies required
```

## Size

| Format | Size |
|--------|------|
| WAT source | ~2.5 KB |
| C source | ~1.2 KB |
| WASM binary | **514 B** |
| Gzipped | ~300 B |

## Build

```bash
# From WAT (needs wabt)
wat2wasm ternary-core.wat -o ternary-core.wasm

# From C (needs clang + wasm-ld)
clang --target=wasm32 -nostdlib -Wl,--no-entry \
  -Wl,--export=mapping -Wl,--export=conservation \
  -Wl,--export=symmetry -Wl,--export=processOne \
  -Wl,--export=selfTest -O3 -Os \
  -o ternary-core.wasm ternary-core.c
```

## Architecture

```
┌───────────────────────────────────────────┐
│           A2A WASM Kernel (514 B)        │
│                                          │
│  ternary_vector ──▶ mapping() ──▶ MIDI  │
│                    conservation──▶ sum    │
│                    symmetry ────▶ mirror  │
│                    processOne ──▶ step    │
│                                          │
│  memory[0..65535]                        │
│  input@256  output@1024                  │
└──────────────────────────────────────────┘
     ↑ agent imports .wasm directly
     ↑ no DOM, no HTML, no UI
```

## Agent Contract

This module is designed for **agent-to-agent** use. Any WASM-capable agent (Node.js, browser, edge, embedded) can import and call these exports. The module has zero side effects, zero allocations, zero imports — pure computation.
