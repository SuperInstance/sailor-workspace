# 🎼 Symphony Runtime

**Cognitive orchestration engine — the formal grammar of the Symphony of Shells DAW**

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-8%20suites-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![SuperInstance](https://img.shields.io/badge/SuperInstance-Fleet-purple)](https://github.com/SuperInstance)

---

The Symphony Runtime implements the formal cognitive grammar from [SYMPHONY_ABSTRACTS.md](https://github.com/SuperInstance/symphony-runtime/blob/main/SYMPHONY_ABSTRACTS.md). It models agent cognition as musical composition — beats, resonance, harmony, dissonance — and provides the runtime primitives for the entire SuperInstance fleet.

---

## Quick Start

```bash
git clone https://github.com/SuperInstance/symphony-runtime
cd symphony-runtime
npm install
npm test
```

## What It Solves

Cognitive agents need more than message passing — they need a **shared temporal grammar** for coordination. Symphony Runtime provides:

- **Beat-based timing** — agents synchronize on frequency-normalized beats rather than raw wall-clock time
- **Resonance matching** — agents that "resonate" at compatible frequencies coordinate more efficiently
- **A-Box memory** — episodic memory stores agent state transitions as cognitive events
- **LA-Link associations** — long-range associations between distant events
- **Headspace fusion** — parallel reasoning shells with configurable fusion strategies
- **Symmetry-dissonance loops** — self-correcting feedback that detects and resolves coordination drift

## Architecture

```
SymphonyRuntime
├── BeatNormalizer    — Frequency-normalized beat clock
│   └── FREQUENCY_BANDS  — Preset cognitive frequency bands
├── ResonanceMatcher  — Frequency compatibility detection
├── ABoxManager       — Episodic memory (A-Box containers)
│   └── ABox          — Single agent memory container
├── LaLinkEngine      — Long-range association network
│   └── LaLink        — Individual association link
├── HeadspaceManager  — Parallel reasoning shell manager
│   ├── Headspace     — Single reasoning shell
│   └── CompositeHeadspace  — Fused multi-shell reasoner
├── SymmetryDissonanceLoop — Self-correcting feedback
└── CompositionRules  — Track count and composition constraints
```

### Module Map

```
src/
├── index.js                      Exports + SymphonyRuntime class
├── core/
│   ├── beat-normalizer.js        Cognitive beat clock
│   ├── resonance-matcher.js      Frequency resonance detection
│   ├── a-box.js                  Episodic memory containers
│   ├── la-link.js                Long-range associations
│   ├── headspace.js              Reasoning shells
│   ├── symmetry-loop.js          Self-correcting feedback
│   └── composition-rules.js      Composition constraints
test/
├── index.test.js
├── beat-normalizer.test.js
├── resonance-matcher.test.js
├── a-box.test.js
├── la-link.test.js
├── headspace.test.js
├── symmetry-loop.test.js
└── composition-rules.test.js
```

## Usage

```js
const { SymphonyRuntime, BeatNormalizer, ResonanceMatcher } = require('symphony-runtime');

// Create runtime with a cognitive timbre
const runtime = new SymphonyRuntime({
  defaultLatencyMs: 500,
  maxTracks: 7
});

// Initialize with timbre (cognitive signature)
runtime.init({
  id: 'explorer-agent',
  frequency: 0.8,  // cognitive beat frequency
  phase: 0.0
});

// Check runtime status
const status = runtime.status();
console.log(`Up: ${status.uptimeBeats} cognitive beats`);
console.log(`${status.aBoxCount} memory containers active`);

// Use individual modules
const normalizer = new BeatNormalizer(timbre);
const beats = normalizer.msToBeats(2000);
```

## Tests

```bash
npm test          # Run all test suites
npx mocha test/   # Run with mocha directly
```

## Related Projects

- [🎬 symphony-orchestrator](https://github.com/SuperInstance/symphony-orchestrator) — Fleet master orchestrator
- [⏱️ tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher) — Temporal heartbeat
- [🧠 composite-headspace](https://github.com/SuperInstance/composite-headspace) — Dual-shell reasoning UI
- [🌉 fleet-bridge](https://github.com/SuperInstance/fleet-bridge) — A2A dual-transport bridge

## License

MIT

---

*Part of the [SuperInstance Fleet](https://github.com/SuperInstance) — The crab inherits the shell. The forge shapes the steel.*
