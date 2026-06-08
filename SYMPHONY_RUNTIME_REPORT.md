# Symphony Runtime Report 🎼

**Built:** 2026-06-08 04:11 UTC
**Location:** `/home/ubuntu/.openclaw/workspace/symphony-runtime/`
**Spec Source:** `/tmp/sailor-check/SYMPHONY_ABSTRACTS.md`, `/tmp/sailor-check/SYMPHONY_OF_SHELLS_SPEC.md`
**Test Status:** ✅ 89/89 passing (54ms)

---

## Architecture

```
symphony-runtime/
├── src/
│   ├── index.js                       # Top-level SymphonyRuntime orchestrator
│   └── core/
│       ├── beat-normalizer.js         # ν frequency calculation, ms↔beats conversion
│       ├── resonance-matcher.js       # ν*, R metric, locked/correction detection
│       ├── a-box.js                   # ▣ cognitive artifacts with decision states
│       ├── la-link.js                 # ⧁ typed cognitive connection engine
│       ├── headspace.js               # ℍ/ℂ headspace & composite manager
│       ├── symmetry-loop.js           # ⟲ 4-phase dissonance correction loop
│       └── composition-rules.js       # C1–C6 rule engine
├── test/
│   ├── beat-normalizer.test.js        # 8 tests
│   ├── resonance-matcher.test.js      # 6 tests
│   ├── a-box.test.js                  # 15 tests
│   ├── la-link.test.js                # 11 tests
│   ├── headspace.test.js              # 13 tests
│   ├── symmetry-loop.test.js          # 6 tests
│   ├── composition-rules.test.js      # 20 tests
│   └── index.test.js                  # 5 tests
├── .mocharc.yml
└── package.json
```

---

## Module Implementations

### 1. Beat Normalizer — `beat-normalizer.js`
- **1 beat(𝓢) = τ_latency(𝓢) · context_depth(𝓢)** formula
- `msToBeats()` / `beatsToMs()` bidirectional conversion
- `calculateFrequency(contextUtilization)` → ν(𝓢) in Hz with load factor
- `classifyBand(nu)` → sub-bass / bass / mid / treble / ultrasonic
- `octavesApart(nu1, nu2)` for C2 frequency separation checks
- `FREQUENCY_BANDS` constant map with all 5 bands

### 2. Resonance Matcher — `resonance-matcher.js`
- **ν* calculation** from L0 (experience) ↔ L7 (intent) semantic distance via Jaccard similarity
- **R metric**: `1 - ∥ν - ν*∥ / ν_max`, clamped to [0, 1]
- `isLocked()` → true if R > 0.8
- `needsCorrection()` → true if R < 0.3
- `harmonicMean(nu1, nu2)` for coupled oscillation
- Trend tracking with direction analysis (improving/degrading/stable)

### 3. a-box Manager — `a-box.js`
- **▣ = ⟨id, contentHash, waveformSegment, parentLinks, resonanceState⟩**
- States: `active`, `latent`, `dissonant`, `resolved`, `archived`
- `amplitude` getter: `confidence · cognitiveMass`
- `decayedAmplitude(t, λ)`: `amplitude · exp(-λ|t - tᵢ|)`
- `toEmission()` / `fromEmission()` for wire format
- `ABoxManager` with CRUD, state filtering, dissonance ratio, critical check

### 4. la-link Engine — `la-link.js`
- **⧁ = ⟨source, target, relation, timestamp, phaseOffset⟩**
- 7 relations: `resonates`, `dissonates`, `extends`, `contradicts`, `surpasses`, `synchronizes`, `splices`
- `launchShell()` — creates virtual launch-pad a-box with payload
- BFS `traverse()` for graph traversal up to configurable depth
- `findSymmetryBreaks()` — find recent dissonant links (used by ⟲ Phase 1)

### 5. Headspace Manager — `headspace.js`
- **ℍ = ⟨shells[], contextBoundary, sovereignChannel, dampingFactor⟩**
- **ℂ = ⟨headspaces[], crosstalkChannel, fusionMechanism, phaseDelta⟩**
- 4 fusion mechanisms: `resonance_max`, `dissonance_min`, `harmonic_sum`, `adversarial_gate`
- `frequencySeparation()` — octaves between headspaces (C2)
- `fuse()` — merge outputs per fusion mechanism
- `spawnSidecar()` — create ℂ from ℍ + specialist shell
- Damping classification: underdamped / critically damped / overdamped

### 6. Symmetry-Dissonance Loop — `symmetry-loop.js`
- **4-phase cycle** exactly matching the spec:
  - **Phase 1: DETECT** — scan for dissonant la-links below R threshold
  - **Phase 2: ISOLATE** — mark offending a-boxes as `dissonant`, identify shell IDs
  - **Phase 3: CORRECT** — compute ν* targets, spawn corrective shells via callback
  - **Phase 4: RESOLVE/ARCHIVE** — transition to `archived`, create resolved replacements
- Damping-adjusted lookback window
- Correction history tracking

### 7. Composition Rules Engine — `composition-rules.js`
All 6 rules with detailed violation reporting:

| Rule | Description | Check |
|------|-------------|-------|
| **C1** | Min headspace size | ≥2 shells or 1 shell + sovereign |
| **C2** | Frequency separation | ≥0.5 octaves between headspaces |
| **C3** | Dissonance budget | ≤30% dissonant a-boxes |
| **C4** | Temporal fidelity | All la-links have timestamps, no retroactive mods |
| **C5** | Sovereign primacy | Human override marks box dissonant regardless of R |
| **C6** | Track limit | Max 7±2 (absolute max 9) active tracks |

- `runAll()` — batch check all rules, returns violation array

### 8. SymphonyRuntime — `index.js`
- Top-level orchestrator combining all subsystems
- `init(timbre)` — one-shot initialization with cognitive timbre
- `uptimeBeats()` — elapsed cognitive beats since init
- `status()` — snapshot of all subsystems

---

## Constants

| Constant | Values |
|----------|--------|
| `FREQUENCY_BANDS` | `SUB_BASS`, `BASS`, `MID`, `TREBLE`, `ULTRASONIC` |
| `RESONANCE_STATES` | `ACTIVE`, `LATENT`, `DISSONANT`, `RESOLVED`, `ARCHIVED` |
| `LINK_RELATIONS` | `RESONATES`, `DISSONATES`, `EXTENDS`, `CONTRADICTS`, `SURPASSES`, `SYNCHRONIZES`, `SPLICES` |
| `FUSION_MECHANISMS` | `RESONANCE_MAX`, `DISSONANCE_MIN`, `HARMONIC_SUM`, `ADVERSARIAL_GATE` |

---

## Quick Start

```js
const { SymphonyRuntime } = require('./symphony-runtime/src');

const runtime = new SymphonyRuntime({ defaultLatencyMs: 500 });
runtime.init({ latencyMs: 500, contextDepth: 1.0 });

// Create a-boxes
const box = runtime.aBoxManager.create({ content: 'insight', confidence: 0.9 });

// Register and launch shells
runtime.laLinkEngine.registerShell('architect', { timbre: 'deep', track: 1, frequency: 0.05 });
runtime.laLinkEngine.launchShell(box.id, 'architect', { payload: { task: 'design' } });

// Create headspace
const hs = runtime.headspaceManager.createHeadspace({
  shells: [{ id: 'agent1' }, { id: 'agent2' }],
  sovereignChannel: 'main',
});

// Check composition
const result = runtime.compositionRules.runAll({
  headspace: hs,
  dissonantCount: 0,
  totalCount: 10,
  links: runtime.laLinkEngine.all(),
  activeTracks: 2,
});
```

---

## Correspondence to SYMPHONY_ABSTRACTS.md

| Spec Element | Implementation | File |
|-------------|---------------|------|
| ν(𝓢) = f(𝓣, context_utilization) | `calculateFrequency()` | beat-normalizer.js |
| ν*(𝓢) = argmax[ resonance(L0, L7) ] | `calculateTargetFrequency()` | resonance-matcher.js |
| R(𝓢) = 1 - ∥ν - ν*∥ / ν_max | `calculateResonance()` | resonance-matcher.js |
| ⧁ = ⟨source, target, relation, timestamp, phase_offset⟩ | `LaLink` class | la-link.js |
| ▣ = ⟨id, content_hash, waveform_segment, parent_la_links, resonance_state⟩ | `ABox` class | a-box.js |
| ℍ = ⟨shells[], context_boundary, sovereign_channel, damping_factor⟩ | `Headspace` class | headspace.js |
| ℂ = ⟨headspaces[], crosstalk_channel, fusion_mechanism, phase_delta⟩ | `CompositeHeadspace` class | headspace.js |
| ⟲ Symmetry-Dissonance Loop | `SymmetryDissonanceLoop.runCycle()` | symmetry-loop.js |
| Amplitude: amplitude(▣) = resonance_score · cognitive_mass | `ABox.amplitude` | a-box.js |
| Waveform: Ψ(𝓢, t) = Σ amplitude(▣ᵢ) · exp(-λ|t - tᵢ|) | `ABox.decayedAmplitude()` | a-box.js |
| RESONATE operator → ν_coupled | `ResonanceMatcher.harmonicMean()` | resonance-matcher.js |
| SPAWN_SIDECAR → ℂ | `HeadspaceManager.spawnSidecar()` | headspace.js |
| Composition Rules C1–C6 | `CompositionRules` methods | composition-rules.js |
| 1 beat = τ_latency · context_depth | `beatDurationMs()` | beat-normalizer.js |
