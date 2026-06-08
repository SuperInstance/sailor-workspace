# 📖 A2A Module Student Guide

> *"Wait, show me" for the agent-to-agent modules.*

## What's an A2A Module?

An **A2A (Agent-to-Agent)** module is a piece of code that one agent can import and use from another agent. No web browser, no HTML page, no user interface — just functions that an agent calls directly.

Think of it like a library you `pip install` or `npm install`, but designed so that other AI agents (not just humans) can import it.

## The Core Discovery: The Invariant

Every A2A module shares one mathematical fact:

```
[1,  0, -1,  1,  0, -1,  1,  1]  ← a "ternary vector" (only -1, 0, +1)
↓
[60, 64, 64, 60, 64, 64, 60, 64, 68]  ← MIDI note numbers
```

This relationship is called **the invariant** — it doesn't change no matter what programming language or platform you use. We've verified it in Python, C, Rust, Go, JavaScript, WebAssembly, and 4 more languages.

### How Does It Work?

Each number in the ternary vector tells the previous note to move:

| Value | Meaning | Semitones | Example |
|-------|---------|-----------|---------|
| `+1` | Go up a major third | +4 | C → E |
| `0`  | Stay on the same note | 0 | C → C |
| `-1` | Go down a minor third | -4 | C → A |

The notes accumulate. You start at MIDI 60 (C4):
```
Start:  60 (C4)
Step 1: 60 + (+1 × 4) = 64 (E4)
Step 2: 64 + ( 0 × 4) = 64 (E4, same note)
Step 3: 64 + (-1 × 4) = 60 (C4)
```

This is called the **discrete integral** — the same mathematics as summing up a series in calculus, but with MIDI notes instead of numbers.

### Why Does It Work?

The ternary system {-1, 0, +1} forms a **Z₃ group** — a mathematical structure where:
- +1 and -1 are inverses (+1 + -1 = 0)
- 0 is the identity element
- Everything cancels to 0 when balanced

Published academic research (Fiore & Satyendra, 2005) validates that this Z₃ group maps exactly to the Neo-Riemannian P/L/R transforms in music theory. Every +1 followed by -1 returns to the same place — like a musical question and answer.

## The Four Modules

### 🪟 WASM Kernel (`wasm/`)

**What:** A 514-byte WebAssembly binary. No libc, no imports, no DOM.

**Why WASM (WebAssembly)?** WASM runs everywhere — browsers, servers, edge workers, embedded devices. A 514-byte binary means any agent on any platform can include the fleet's core math with zero dependencies.

**How agents use it:**
```javascript
// Any agent, any WASM runtime:
const wasm = await WebAssembly.compile(fs.readFileSync('./ternary-core.wasm'));
const { mapping } = (await WebAssembly.instantiate(wasm, {})).exports;

// Write ternary values at memory address 256
const view = new Int8Array(memory.buffer);
[1, 0, -1, 1, 0, -1, 1, 1].forEach((v, i) => view[256 + i] = v);

// Read MIDI notes from memory address 1024
const count = mapping(256, 8);
const midi = Array.from({length: count}, (_, i) => view[1024 + i]);
// midi → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

### 🌀 Spectral→MIDI (`spectral/`)

**What:** Turns spectral graph analysis into MIDI notes.

**The idea:** If you have a graph (nodes connected by edges), you can compute its "eigenvalues" and "Fiedler vector" — mathematical descriptions of how the graph is shaped. This module maps those shapes to chord voicings.

**How it maps:**
| Graph Property | Musical Translation |
|----------------|-------------------|
| Fiedler vector | Chord voicing spread |
| Conservation Ratio | Dissonance level |
| Cheeger constant | Rhythm density |

**Why this matters:** The spectral-spreadsheet project already computes these graph properties. This module lets its output feed directly into the MIDI fleet. A graph analysis becomes a chord progression with zero human intervention.

### 🔗 Bridge Protocol (`bridge/`)

**What:** Translates between two different ways for agents to talk.

**Two architectures:**
1. **I2I bottles** (our fleet's approach): Agents send structured messages ("bottles") through a shared directory. Like passing notes.
2. **Cell formulas** (the spreadsheet fleet's approach): Cells in a grid compute values based on other cells' values. Like a spreadsheet.

**The bridge converts:**
```
I2I STATUS bottle → spreadsheet formula =STATUS("oracle2", "ready")
Spreadsheet formula =IF("agentA", "blocked", "agentB") → I2I BLOCKER bottle
```

**Why this matters:** The fleet has 220+ repos using I2I bottles. The spreadsheet ecosystem has 12 repos using cell formulas. The bridge lets them work together — agents in either system can talk to agents in the other.

### 📊 Pipeline A2A (`pipeline/`)

**What:** Standard input→output pipeline for spreadsheet strategies.

**The flow:**
```
"1,0,-1,1,0,-1,1,1"  →  readStrategyVector()  →  [1, 0, -1, 1, 0, -1, 1, 1]
                                              →  ternaryToMidi()
                                              →  [60, 64, 64, 60, 64, 64, 60, 64, 68]
                                              →  analyzeHarmony()
                                              →  { chord: "augmented", ... }
```

All in one call:
```javascript
const result = runPipeline('1,0,-1,1,0,-1,1,1');
// result.sequences[0].midi → [60, 64, 64, 60, 64, 64, 60, 64, 68]
// result.sequences[0].notes → ["C4", "E4", "E4", "C4", "E4", "E4", "C4", "E4", "G#4"]
```

## Connecting to the Larger Fleet

These four modules are the bridge between two fleets:

```
┌───────────────────┐          ┌──────────────────────┐
│    MIDI Fleet     │          │  Spreadsheet Fleet   │
│  (220+ repos)     │          │    (12 repos)        │
│                   │          │                       │
│  I2I bottles      │──Bridge──│  Cell formulas       │
│  Agent messages   │ Protocol │  Spreadsheet grid    │
│  MIDI generation  │          │  Graph spectral anal  │
└───────────────────┘          └──────────────────────┘
         │                            │
         └────────┬───────────────────┘
                  ▼
        Shared Ternary {-1, 0, +1}
                  │
                  ▼
        MIDI Notes (accumulator ×4)
```

### Repos You Should Visit Next

| Repo | What It Does | Why |
|------|-------------|-----|
| fleet-ternary-music | Core theory & multi-language implementations | Where the invariant was first proved |
| fleet-music-theorist | Advanced music theory on ternary vectors | Deeper harmony analysis |
| fleet-orchestra | Routes agent intents to the right MIDI tool | The orchestrator |
| spreadsheet-engine | Rust crate on crates.io — every cell = agent or MIDI source | The crates.io crate |
| superinstance-spreadsheet | Browser UI + GPU backend, evolves strategies | The visual front-end |
| construction-coordination | Fleet comms hub | Where all agents meet |

## Running the Tests

```bash
git clone https://github.com/SuperInstance/construct-coordination
cd construct-coordination/a2a-mods

# All four modules, all tests
python3 spectral/evaluator.py && \
python3 bridge/bridge.py && \
cd wasm && node test.mjs && cd .. && \
cd pipeline && node pipeline.mjs && cd ..
```
