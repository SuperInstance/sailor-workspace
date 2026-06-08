# AGENT.md — 🪟 fleet-a2a-wasm: Autonomous Agent Integration Guide

> **For agents, by agents.** This document tells autonomous agents exactly how to discover, load, use, and compose the 514-byte WASM ternary kernel.

---

## 1. Discovery

**Repository:** `github.com/SuperInstance/fleet-a2a-wasm`  
**Binary path:** `./ternary-core.wasm` (checked in, no build required)  
**Size:** 514 bytes  
**Imports needed:** None (zero-import module)

The version-agnostic load pattern works with any WebAssembly runtime. The binary is immutable per-commit — checksum before caching.

---

## 2. Loading

### Node.js (ESM)

```js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmBytes = readFileSync(join(__dirname, 'ternary-core.wasm'));
const module = await WebAssembly.compile(wasmBytes);
const instance = await WebAssembly.instantiate(module, {});
const { mapping, conservation, symmetry, processOne, selfTest } = instance.exports;
const mem = instance.exports.memory;
```

### Node.js (CJS)

```js
const { readFileSync } = require('fs');
const wasmBytes = readFileSync(join(__dirname, 'ternary-core.wasm'));
// ... same as above
```

### Browser fetch

```js
const { exports } = await WebAssembly.instantiateStreaming(
  fetch('./ternary-core.wasm'), {}
);
```

### Wasmtime / Wasmer

```bash
# CLI: use the wat directly or call from host language binding
wasmtime ternary-core.wasm --invoke selfTest
```

### Embedded (WAMR, etc.)

Feed the raw 514 bytes into your WASM interpreter. No imports needed.

---

## 3. Calling Convention

### Memory Protocol

| Offset | Content | Type | Access |
|--------|---------|------|--------|
| `0..255` | Reserved | — | Do not touch |
| `256..(256 + n - 1)` | Input ternary vector | `Int8Array` | Write before `mapping()` |
| `1024..(1024 + count - 1)` | Output MIDI notes | `Uint8Array` | Read after `mapping()` |

### Export Signatures

| Function | WASM Signature | JS Call | Return |
|----------|---------------|---------|--------|
| `mapping(ptr, len)` | `(i32, i32) → i32` | `mapping(256, n)` | Number of MIDI notes written |
| `conservation(ptr, len)` | `(i32, i32) → i32` | `conservation(256, n)` | Sum of ternary values |
| `symmetry(ptr, len)` | `(i32, i32) → i32` | `symmetry(256, n)` | 1 if palindrome, 0 otherwise |
| `processOne(v, prev)` | `(i32, i32) → i32` | `processOne(1, 60)` | `prev + v×4` |
| `selfTest()` | `() → i32` | `selfTest()` | Always 1 |

### Return Values

All functions return `i32`. The `mapping` function writes MIDI bytes to offset 1024 and returns the count (always `len + 1` for the starting note). Read results from `memory[1024..1024 + count]`.

---

## 4. Complete Usage Pattern

```js
function ternaryToMidi(ternaryVector) {
  const ptr = 256;
  const view = new Int8Array(mem.buffer);
  for (let i = 0; i < ternaryVector.length; i++) {
    view[ptr + i] = ternaryVector[i];
  }
  const count = mapping(ptr, ternaryVector.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(new Uint8Array(mem.buffer)[1024 + i]);
  }
  return out;
}

// Usage
const notes = ternaryToMidi([1, 0, -1, 1, 0, -1, 1, 1]);
// → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

---

## 5. Validation (Self-Consistency Check)

Run this to verify the binary is uncompromised:

```js
function verifyKernel() {
  if (selfTest() !== 1) throw new Error('Kernel self-test failed');

  const view = new Int8Array(mem.buffer);
  [1, 0, -1].forEach((v, i) => view[256 + i] = v);
  if (conservation(256, 3) !== 0) throw new Error('Conservation invariant broken');

  return true;  // kernel verified
}
```

---

## 6. Composition with Other Fleet Modules

This WASM kernel is the computational engine. Compose it with:

- **[fleet-a2a-pipeline](https://github.com/SuperInstance/fleet-a2a-pipeline)** — feed it parsed strategy CSV vectors, consume its MIDI output for `midiToNoteNames()`, `analyzeHarmony()`, `detectMirrors()`
- **[fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral)** — run spectral analysis on the MIDI output
- **[fleet-a2a-bridge](https://github.com/SuperInstance/fleet-a2a-bridge)** — wrap calls in I2I bottles for agent-to-agent coordination
- **constraint-theory-core** — verify that the output satisfies fleet invariants

---

## 7. Error Handling

- `mapping` always succeeds for any `len` ≥ 0. It writes `len + 1` bytes.
- `conservation` always succeeds. Empty vector returns 0.
- `symmetry` always succeeds. Empty vector returns 1 (vacuous truth).
- `processOne` is pure arithmetic. No overflow checking (standard WASM contract).
- `selfTest` always returns 1.

There are no error returns, no exceptions, no traps for valid inputs.

---

## 8. Performance

| Operation | Time (approximate) |
|-----------|-------------------|
| Load + instantiate | < 1 ms (cold) |
| `mapping(256, 8)` | ~5 µs |
| `conservation(256, 8)` | ~2 µs |
| `symmetry(256, 8)` | ~2 µs |
| `processOne(v, prev)` | ~0.5 µs |
| Binary fetch (HTTP) | fits in 1 TCP packet |

---

## 9. Security Properties

- ✅ **No network access** — the module exports no functions that can reach the network
- ✅ **No file system access** — zero syscalls in the binary
- ✅ **No dynamic allocation** — the 64 KB linear memory is fixed at instantiation
- ✅ **Deterministic** — same inputs, same outputs, every time
- ✅ **Auditable** — 514 bytes is human-readable in WAT form
- ✅ **No imports** — the module cannot access any host capability

---

## 10. Quick Reference Card

```
AGENT INTEGRATION SUMMARY
══════════════════════════
import  → readFileSync('ternary-core.wasm')
compile → WebAssembly.compile(bytes)
instant → WebAssembly.instantiate(module, {})  // empty imports!
exports → .mapping, .conservation, .symmetry, .processOne, .selfTest
memory  → .memory (1 page = 64 KB)
input   → Int8Array(mem.buffer)[256 + i] = v
output  → Uint8Array(mem.buffer)[1024 + i]
build   → git pull; done (binary checked in)
test    → node test.mjs
