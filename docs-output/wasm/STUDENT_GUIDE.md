# STUDENT_GUIDE.md — "Wait, Show Me" 🪟

> A hands-on tutorial for beginners. No prior WASM or music theory knowledge required.  
> **You will run the actual WASM kernel in under 60 seconds.**

---

## Table of Contents

1. [What Are We Building?](#1-what-are-we-building)
2. [The "Wait, Show Me" Fast Start](#2-the-wait-show-me-fast-start)
3. [What Just Happened?](#3-what-just-happened)
4. [The Algorithm, Explained Slowly](#4-the-algorithm-explained-slowly)
5. [Experiment 1: Change the Input](#5-experiment-1-change-the-input)
6. [Experiment 2: Conservation Check](#6-experiment-2-conservation-check)
7. [Experiment 3: Symmetry Detection](#7-experiment-3-symmetry-detection)
8. [What Is WASM?](#8-what-is-wasm)
9. [Why 514 Bytes?](#9-why-514-bytes)
10. [What's Next?](#10-whats-next)

---

## 1. What Are We Building?

We have a **514-byte computer program** that takes a list of directions — "up a bit" (+1), "stay" (0), "down a bit" (−1) — and produces a sequence of musical notes.

The cool part? It's so tiny it fits in a text message, has zero dependencies, and runs anywhere. No installers. No package managers. No frameworks.

---

## 2. The "Wait, Show Me" Fast Start

Open a terminal and run:

```bash
git clone https://github.com/SuperInstance/fleet-a2a-wasm.git
cd fleet-a2a-wasm
node test.mjs
```

**That's it.** No `npm install`. No `pip install`. No `cargo build`. Just Node.js (which you probably already have).

You should see:

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

You just ran a WebAssembly module that's **514 bytes** — smaller than most emails.

---

## 3. What Just Happened?

Let's break down one of those tests.

The test script loaded `ternary-core.wasm` into Node.js and called a function named `mapping` with a short list of numbers: `[1, 0, -1, 1, 0, -1, 1, 1]`.

The function returned: `[60, 64, 64, 60, 64, 64, 60, 64, 68]`.

If you play these numbers as MIDI notes (60 = middle C), you get a pattern that sounds like:

**C E E C E E C E G♯**

Try it! Any online MIDI player will work. Or copy-paste into [this online MIDI player](https://www.onlinepianist.com/virtual-piano).

---

## 4. The Algorithm, Explained Slowly

### Step 1: The Starting Note

Every sequence starts at **middle C** (MIDI note 60). Think of this as "home base."

### Step 2: Applying Directions

Each direction value (+1, 0, or −1) tells the algorithm how far to move from the *previous* note:

| Value | Direction | Distance | Sounds like |
|-------|-----------|----------|-------------|
| **+1** | Up | +4 semitones | Major third (C → E) |
| **0** | Stay | 0 semitones | Unison (C → C) |
| **−1** | Down | −4 semitones | Minor third (E → C♯) |

Wait — why +4 semitones and not +1? Because a "step" in music theory is a third, not a whole step. Four semitones = two whole steps = a major third.

### Step 3: The Accumulator

Here's the key insight: **each note depends on all the previous notes.** You don't start over each time. It's like walking: your position at step 5 is where you were at step 4 + how far you moved.

```
note[0] = 60                  (starting pitch)
note[1] = note[0] + v[0] × 4
note[2] = note[1] + v[1] × 4
note[3] = note[2] + v[2] × 4
...
```

This is called a **discrete integral** — the musical version of tracking cumulative distance walked.

### Step 4: Trace Through

Let's trace `[1, 0, -1]` step by step:

```
Start:     note = 60

Step 1: v = +1
         note = 60 + (1 × 4) = 64    (moved up to E)

Step 2: v = 0
         note = 64 + (0 × 4) = 64    (stayed on E)

Step 3: v = -1
         note = 64 + (-1 × 4) = 60   (moved back down to C)
```

Result: `[60, 64, 64, 60]` — we ended where we started! A round trip.

---

## 5. Experiment 1: Change the Input

Create a file called `experiment.mjs`:

```js
import { readFileSync } from 'fs';

const wasm = await WebAssembly.compile(readFileSync('./ternary-core.wasm'));
const { exports } = await WebAssembly.instantiate(wasm, {});
const mem = exports.memory;

function ternaryToMidi(ternary) {
  const view = new Int8Array(mem.buffer);
  for (let i = 0; i < ternary.length; i++) view[256 + i] = ternary[i];
  const count = exports.mapping(256, ternary.length);
  const out = [];
  for (let i = 0; i < count; i++) out.push(new Uint8Array(mem.buffer)[1024 + i]);
  return out;
}

// Try some patterns!
console.log('All up:',    ternaryToMidi([1, 1, 1, 1]));         // goes higher & higher
console.log('Down down:', ternaryToMidi([-1, -1, -1]));          // goes lower & lower
console.log('Oscillate:', ternaryToMidi([1, -1, 1, -1]));        // zig-zag
console.log('Silence:',   ternaryToMidi([0, 0, 0, 0]));          // all the same note
console.log('Empty:',     ternaryToMidi([]));                    // just the starting note
```

Run it:

```bash
node experiment.mjs
```

Try to predict the output before running. Then check your prediction!

---

## 6. Experiment 2: Conservation Check

The `conservation` function adds up all the values in your ternary vector. This matters because **Z₃ group theory** says +1 + (−1) = 0 — the identity element.

In music terms: if your directions sum to zero, you end where you started. The harmonic gesture is "balanced."

```js
function checkConservation(ternary) {
  const view = new Int8Array(mem.buffer);
  for (let i = 0; i < ternary.length; i++) view[256 + i] = ternary[i];
  const sum = exports.conservation(256, ternary.length);
  const result = ternaryToMidi(ternary);
  const lastNote = result[result.length - 1];
  const startedHome = (lastNote === 60);
  console.log(`[${ternary}] → sum=${sum} → ${startedHome ? '✅ balanced (ended home)' : '❌ off balance (drifted)'}`);
}

checkConservation([1, 0, -1]);          // balanced
checkConservation([1, 1, -1]);          // NOT balanced (sum = 1)
checkConservation([1, -1, 1, -1]);      // balanced
checkConservation([1, 1, 1]);           // NOT balanced (sum = 3)
```

---

## 7. Experiment 3: Symmetry Detection

The `symmetry` function checks if your ternary vector is a palindrome — it reads the same forward and backward.

```js
function checkSymmetry(ternary) {
  const view = new Int8Array(mem.buffer);
  for (let i = 0; i < ternary.length; i++) view[256 + i] = ternary[i];
  const isPalindrome = exports.symmetry(256, ternary.length);
  const midi = ternaryToMidi(ternary);
  console.log(`[${ternary}] → ${isPalindrome ? '✅ palindrome' : '❌ not palindrome'} → MIDI: [${midi}]`);
}

checkSymmetry([1, 0, 1]);        // palindrome: 1 0 1
checkSymmetry([1, 0, -1]);       // NOT palindrome: 1 0 -1 ≠ -1 0 1
checkSymmetry([1, -1, -1, 1]);   // palindrome
checkSymmetry([1, -1, 1, -1]);   // NOT palindrome
```

Notice something: symmetric inputs often produce balanced outputs. There's a deep connection between symmetry in the ternary domain and harmony in the MIDI domain.

---

## 8. What Is WASM?

WASM = **WebAssembly**. It's like assembly language, but:

- **Universal** — runs in web browsers, Node.js, edge servers, IoT devices, and standalone runtimes
- **Fast** — near-native execution speed
- **Safe** — sandboxed, no access to your filesystem or network unless explicitly given
- **Tiny** — the compressed binary format is incredibly compact
- **Deterministic** — same input always produces same output

Think of it as a **universal instruction set** for running untrusted code safely. Every major platform supports it.

---

## 9. Why 514 Bytes?

514 bytes is smaller than:

- This sentence, repeated 5 times ❌
- A typical email signature ✅
- A single MP3 of a one-second "ding" ❌
- The Twitter logo on most websites ❌
- Most CSS files ❌
- Your morning coffee order ✅

It matters because:

**It's auditable.** You or anyone else can read the entire program in WAT (WebAssembly Text Format) and verify exactly what it does. No hidden behavior. No backdoors.

**It's loadable anywhere.** The entire program fits in one network packet. It loads in microseconds, even on slow connections.

**It's embeddable.** You can paste the hex into a smart contract, a microcontroller, a serverless function, or a browser extension.

**It's pure.** No operating system calls, no memory allocation, no imports. The module is self-contained mathematics.

This is **intentional minimalism** — not just showing off. Every byte has been accounted for.

---

## 10. What's Next?

Now that you understand the core kernel, explore the fleet:

| Repo | What It Does |
|------|-------------|
| [fleet-a2a-pipeline](https://github.com/SuperInstance/fleet-a2a-pipeline) | Takes CSV strategy text → ternary vectors → MIDI → note names → harmony analysis |
| [fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral) | Performs spectral analysis on ternary sequences |
| [fleet-a2a-bridge](https://github.com/SuperInstance/fleet-a2a-bridge) | Wraps everything in I2I bottles for agent coordination |
| `ternary-*` libraries | Math libraries for ternary arithmetic and harmony |
| `constraint-theory-core` | Formal constraints the fleet must satisfy |

### Challenge Yourself

1. Create a ternary vector of length 10 that traces a C major triad
2. Find two different ternary vectors that produce the same MIDI output
3. Create a palindrome ternary that ends on a different note than it started
4. What's the shortest ternary vector that moves up by an octave (12 semitones)?

---

**You've just learned:**
- How a ternary accumulator works
- The discrete integral formula `note[i] = note[i−1] + v[i] × 4`
- How Z₃ group theory connects to music theory
- What Neo-Riemannian transformations sound like
- How to load and call a WASM module in Node.js
- Why 514 bytes is remarkable

Go make something musical. 🪟
