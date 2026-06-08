# 🧠 Composite Headspace

**Symphony of Shells — Cognitive DAW Prototype**

[![Tests: 51/51](https://img.shields.io/badge/tests-51%2F51-passing-brightgreen)](https://github.com/SuperInstance/composite-headspace)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Quick Start

```bash
git clone https://github.com/SuperInstance/composite-headspace && cd composite-headspace && npm install && node cli.js --sample 1
```

---

## What This Solves

Complex reasoning problems demand **multiple cognitive modes** operating in parallel. Human thinkers naturally oscillate between deep architectural analysis (first principles, trade-offs, invariants) and fast pattern matching (analogies, metaphors, structural recognition). This oscillation is the engine of genuine insight.

**Composite Headspace** is a cognitive orchestration framework that formalizes this process by running **two parallel reasoning shells** — one tuned for slow, deep architectural reasoning (bass frequency) and one tuned for fast, associative pattern matching (treble frequency) — coordinated through a **t-minus cueing protocol** that aligns their outputs at precise cognitive beats. The resulting symmetry-dissonance analysis fuses both perspectives into a synthetic insight that neither shell could produce alone.

> *"When deep reasoning and fast pattern matching converge, you get understanding that is both rigorous and intuitive."*

**Use cases:**
- **Architectural decision-making** — Evaluate trade-offs through dual lenses
- **Debug triage** — Combine systematic protocol analysis with pattern-led root cause detection
- **Design reviews** — Cross-validate intuitions against first-principles reasoning
- **Cognitive augmentation** — Externalize the stereo reasoning process that great thinkers use internally

---

## Architecture

```
                          ┌─────────────────────────────────────┐
                          │      T-Minus WebSocket Dispatcher    │
                          │           (port 9090)                │
                          └──────────┬──────────────┬───────────┘
                                     │              │
                         t-minus(5)  │              │ t-minus(0)
                                     ▼              ▼
        ┌─────────────────────────────┐  ┌─────────────────────────────┐
        │  Shell A  (α · Bass)        │  │  Shell B  (β · Treble)      │
        │  Timbre: deep-architect     │  │  Timbre: fast-pattern-matcher│
        │  Frequency: 0.01–0.1 Hz     │  │  Frequency: 1–10 Hz          │
        │  Latency: ~1500ms           │  │  Latency: ~200ms             │
        │  Token Budget: 128K         │  │  Token Budget: 32K           │
        │  Model: DeepSeek V4 Pro     │  │  Model: DeepSeek V4 Flash    │
        └──────────┬──────────────────┘  └──────────────┬──────────────┘
                   │                                     │
                   │        a-box artifacts               │
                   └────────────────┬────────────────────┘
                                    │
                                    ▼
                   ┌─────────────────────────────────────┐
                   │       Symmetry-Dissonance Loop       │
                   │                                      │
                   │  1. DETECT  — divergence points      │
                   │  2. ISOLATE — dissonant shells       │
                   │  3. CORRECT — complementary reasoning │
                   │  4. RESOLVE — synthetic insight       │
                   └──────────────────┬──────────────────┘
                                      │
                                      ▼
                   ┌─────────────────────────────────────┐
                   │         Composite Insight            │
                   │  • Convergence Score                 │
                   │  • Symmetry Breaks (4 types)         │
                   │  • Cognitive Parallax                │
                   │  • Fused Recommendation              │
                   └─────────────────────────────────────┘
```

### How the Architecture Works

1. **Two reasoning shells** are spawned by the `Coordinator`, each configured with a distinct cognitive timbre and frequency band
2. **Shell A (bass)** receives a `t-minus(5)` cue — meaning it acts after 5 cognitive beats, giving it time for deep architectural reasoning
3. **Shell B (treble)** receives a `t-minus(0)` cue — acting immediately with fast pattern matching
4. Each shell emits an **a-box** (cognitive artifact) containing its analysis
5. The **Symmetry-Dissonance Loop** compares both a-boxes, finding divergence points, classifying symmetry breaks, and fusing them into a synthetic insight
6. The **composite report** includes convergence scores, resonance metrics, and cognitive parallax

---

## Key Features

### 🔄 Symmetry-Dissonance Loop
The core analysis engine. Four phases:
- **DETECT** — Find divergence points where the two reasoning streams disagree or emphasize different dimensions
- **ISOLATE** — Measure dissonance through the Resonance Metric R ∈ [0,1]
- **CORRECT** — Classify symmetry breaks (contradiction, extension, nuance, blind spot)
- **RESOLVE** — Fuse both perspectives into a single synthetic insight

### ⏱ T-Minus Cueing
A coordination protocol from the Symphony of Shells spec. The `t-minus(shell, n)` signal means *"act in n cognitive beats before alignment point P."* Negative t-minus means pre-cued and already delivering. This allows the coordinator to time deep and fast reasoning to converge at the same alignment point, despite vastly different latency profiles.

### 🎵 Frequency Bands

| Band        | Range       | Latency  | Character                     |
|-------------|-------------|----------|-------------------------------|
| Sub-bass    | 0.001–0.01  | ~3000ms  | Deep contemplative reasoning  |
| **Bass**    | **0.01–0.1**|**~1500ms**| **Slow architectural analysis** |
| Mid         | 0.1–1       | ~600ms   | Conversational generalist     |
| **Treble**  | **1–10**    | **~200ms**| **Rapid pattern matching**    |
| Ultrasonic  | 10–100      | ~50ms    | Reflexive responses           |

### 📦 A-Box Artifacts
Each reasoning shell emits its output as an **a-box** (cognitive artifact) containing:
- Shell identity, frequency band, timbre, and track
- Resonance metric (confidence/quality of reasoning)
- Content (architectural analysis or pattern analysis)
- Parent links for cross-shell traceability
- Cognitive beat timestamp

### 👁️ Cognitive Parallax
Analogous to binocular vision: the disparity between two different reasoning perspectives creates **depth perception** in understanding. The `cognitiveParallax` field in each report quantifies this depth through the difference in shell resonance values.

---

## API Reference

### CLI Flags

```text
Usage:
  node cli.js --problem 'Your problem' [options]
  node cli.js --sample <n>        (1-5)
  node cli.js --list

Options:
  --problem, -p   Reasoning problem string
  --sample, -s    Sample problem index (1-5)
  --list, -l      List available sample problems
  --port          WebSocket dispatcher port (default: 9090)
  --detector      Detection mode: simple|deep (default: simple)
  --format        Output format: text|json (default: text)
  --color         Force colored output
  --no-color      Disable colored output
  --help, -h      Show this help

Examples:
  node cli.js -p "Why do all distributed systems eventually become inconsistent?"
  node cli.js --sample 3
  node cli.js --sample 1 --format json
  node cli.js -p "Analyze monorepo vs polyrepo trade-offs" --detector deep --format json
```

### Programmatic Usage

```javascript
const { Coordinator } = require('composite-headspace');
const { ReasoningTask } = require('composite-headspace/src/reasoning-task');

async function analyze(problem) {
  // 1. Start the t-minus dispatcher
  const coordinator = new Coordinator({ port: 9090, detectorMode: 'simple' });
  await coordinator.start();

  // 2. Create the composite headspace
  const headspace = coordinator.createCompositeHeadspace();

  // 3. Connect both shells
  await Promise.all([
    headspace.shellA.connect(),
    headspace.shellB.connect(),
  ]);

  // 4. Run the task
  const task = ReasoningTask.fromPrompt(problem);
  const result = await headspace.runTask(task);

  // 5. Access results
  const { report, shellA, shellB, elapsedMs } = result;

  console.log(`Convergence: ${report.analysis.convergenceScore}`);
  console.log(`Resonance R: ${report.analysis.dissonance.resonanceR}`);
  console.log(`Synthetic insight: ${report.analysis.syntheticInsight.insight}`);

  // 6. Cleanup
  headspace.disconnect();
  await coordinator.stop();

  return result;
}
```

### Sample Problems (Built-in)

| #  | Type            | Difficulty | Description                                              |
|----|-----------------|------------|----------------------------------------------------------|
| 1  | Architectural   | Hard       | Distributed event-sourcing for ride-sharing platform     |
| 2  | Pattern-matching| Medium     | Code smell of accumulating abstraction layers            |
| 3  | Debug analysis  | Medium     | Intermittent 47-minute failure cycle in production       |
| 4  | Design decision | Hard       | Monorepo vs polyrepo for 50-developer org                |
| 5  | Architectural   | Gemini     | Why distributed systems eventually become inconsistent   |

List them with:
```bash
node cli.js --list
```

### Understanding the Report Object

```javascript
{
  title: '🎼 Symphony of Shells — Symmetry Analysis Report',
  timestamp: '2026-06-08T05:54:00.000Z',
  analysis: {
    shellA: { id, frequency, resonance },
    shellB: { id, frequency, resonance },
    divergencePoints: [       // Key conceptual divergences found
      { point, shellA, shellB, type, significance }
    ],
    dissonance: {             // Dissonance assessment
      resonanceR,             // ∈ [0,1] — higher = better resonance
      dissonanceLevel,        // locked | productive | concerning | critical
      detail
    },
    symmetryBreaks: [         // 4 classified break types
      { type, description, insight }
    ],
    syntheticInsight: {       // Fused composite insight
      type,                   // harmonic | productive-dissonance | emergent | adversarial
      summary,
      insight,
      convergenceScore,
      symmetryBreaksUsed
    },
    convergenceScore          // ∈ [0,1] — overall convergence metric
  },
  summary,                    // Human-readable markdown summary
  recommendations: [          // Actionable recommendations
    '🔄 Productive dissonance detected...'
  ],
  cognitiveParallax: {        // Depth-from-disparity metric
    disparity, depth, interpretation
  }
}
```

---

## Related Repos

- **[tminus-dispatcher](https://github.com/SuperInstance/tminus-dispatcher)** — Standalone t-minus WebSocket dispatcher for multi-shell orchestration
- **[symphony-runtime](https://github.com/SuperInstance/symphony-runtime)** — Runtime engine for the Symphony of Shells cognitive DAW
- **[fleet-bridge](https://github.com/SuperInstance/fleet-bridge)** — Multi-process shell fleet management and inter-shell communication bridge

---

## Test Status

**51/51 tests passing** across three test suites:

```
  📋 ReasoningTask Tests (13/13)
    ✓ ReasoningTask: sets id
    ✓ ReasoningTask: sets type
    ✓ ReasoningTask: sets difficulty
    ✓ ReasoningTask: has prompt
    ✓ ReasoningTask: validate returns valid for good task
    ✓ ReasoningTask: validate catches bad values
    ✓ ReasoningTask: returns error messages
    ✓ ReasoningTask: sampleProblems returns 4+ problems
    ✓ ReasoningTask: sample 1 is architectural
    ✓ ReasoningTask: sample 2 is pattern-matching
    ✓ ReasoningTask: sample 3 is debug-analysis
    ✓ ReasoningTask: sample 4 is design-decision
    ✓ ReasoningTask: fromPrompt works

  🔬 SymmetryDetector Tests (15/15)
    ✓ produces convergence score
    ✓ finds divergence points
    ✓ classifies symmetry breaks
    ✓ computes resonance metric
    ✓ generates synthetic insight
    ✓ captures shell A id
    ✓ captures shell B id
    ✓ includes contradiction break
    ✓ includes extension break
    ✓ includes nuance break
    ✓ includes blindSpot break
    ✓ report has title
    ✓ report has summary
    ✓ report has recommendations
    ✓ report has parallax

  🚀 Integration Test (Coordinator + Shells) (23/23)
    ✓ Coordinator: starts t-minus dispatcher
    ✓ CompositeHeadspace: creates shell A
    ✓ CompositeHeadspace: creates shell B
    ✓ CompositeHeadspace: shell A is bass
    ✓ CompositeHeadspace: shell B is treble
    ✓ CompositeHeadspace: default fusion
    ✓ Shell A: connects to dispatcher
    ✓ Shell B: connects to dispatcher
    ✓ Integration: task completes with elapsed time
    ✓ Integration: report is generated
    ✓ Integration: shell A produces a-box content
    ✓ Integration: shell B produces a-box content
    ✓ Integration: convergence score computed
    ✓ Integration: resonance metric computed
    ✓ CompositeHeadspace: produces waveform
    ✓ CompositeHeadspace: shell A in mix
    ✓ CompositeHeadspace: shell B in mix
    ✓ CompositeHeadspace: cross-illumination runs without error
    ✓ CompositeHeadspace: getState returns both shells
    ✓ CompositeHeadspace: getState includes convergence score
    ✓ Shell A: disconnects cleanly
    ✓ Shell B: disconnects cleanly
    ✓ Coordinator: stops cleanly
```

Run tests:

```bash
npm test                         # Compact output
node test/integration.test.js --verbose  # Detailed logs
```

---

## Project Structure

```
composite-headspace/
├── cli.js                          # CLI entry point
├── package.json                    # Package manifest (MIT)
├── src/
│   ├── coordinator.js              # T-minus dispatcher + CompositeHeadspace class
│   ├── shell-agent.js              # ShellAgent with frequency bands, timbres, a-boxes
│   ├── symmetry-detector.js        # Symmetry-Dissonance Loop analysis engine
│   └── reasoning-task.js           # ReasoningTask definition + sample problems
├── test/
│   └── integration.test.js         # 51 integration tests
├── examples/
│   └── basic-symmetry.js           # Runnable example with distributed systems prompt
└── README.md
```

---

## Contributing

1. **Fork** the repo and create a feature branch from `master`
2. **Code** your changes against the existing architecture
3. **Test** — all 51 existing tests must pass, and new features should include tests
4. **Commit** with descriptive messages (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`)
5. **Open a PR** with a clear description of the change and any relevant issue references

### Code Style

- ES6+ with `'use strict'`
- JSDoc annotations on all exports
- Descriptive variable names (no single-letter except in mathematical contexts)
- Frequency band naming consistent with the audio processing metaphor

### Running Tests

```bash
npm test
```

---

## License

[MIT](LICENSE) © SuperInstance

---

*"Understanding is what happens in the gap between what two different perspectives agree on."*
