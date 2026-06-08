# 🎵 MIDI Tool → SuperInstance Fleet Integration Plan

**Generated:** 2026-06-08  
**Status:** Proposal  
**Owner:** Fleet Architecture Team

---

## 1. Tool Landscape Analysis

### 1.1 External Tools Surveyed

| Tool | Language | Core Capability | Fleet Fit |
|------|----------|-----------------|-----------|
| **text2midi** (tegridy-tools) | Python | Symbolic music NLP, transformer MIDI generation from text prompts via TMIDIX | ⭐ High — direct NL→MIDI pipeline |
| **MidiTok** | Python | MIDI tokenization for ML models (REMI, Compound Word, BPE), HuggingFace Hub integration | ⭐ High — bridges LLM tokens ↔ symbolic music |
| **symusic** | C++20/Python | Blazing-fast MIDI/ABC I/O, SoundFont synthesis, vectorized transformations | ⭐ High — infrastructure backbone |
| **MusicLang** | Python | Music arrangement/analysis via language modeling | ⭐ High — arrangement intelligence |
| **TidalCycles** | Haskell | Declarative pattern language for live coding, mininotation, polyrhythms | ⭐ Medium — unique pattern algebra, archived upstream |
| **FoxDot** | Python | Python-native live coding, SuperCollider backend, pattern composition | ⭐ Medium — Python-native, active ecosystem |
| **Sonic Pi** | Ruby | Full live coding environment, educational, GUI, synth engine | ⚡ Low — VM-heavy, self-contained app |

### 1.2 Existing Fleet MIDI Assets

| Asset | Location | Capability |
|-------|----------|------------|
| **flux-tensor-midi** | `forgemaster-archive/flux/flux-tensor-midi/` | Python MIDI ensemble generation with Eisenstein rhythm snapping, 9-ch FluxVector tensors, band/conductor patterns |
| **ternary-rhythm** | `workspace/ternary-rhythm/` | Rust crate for ternary (trit-based) rhythm patterns, polyrhythms, syncopation detection |
| **Experiment 22 (tensor-midi-fidelity)** | `forgemaster-archive/experiments/` | Float64 vs INT8 MIDI quantization fidelity analysis |

### 1.3 Fleet Architecture Reference

The SuperInstance fleet runs on a **dual-transport bridge** pattern:

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│  Agent A  │◄──│ FleetBridge  │──►│  Agent B  │
│           │   │ (Node.js)    │   │           │
│ bottles/  │   ├──────────────┤   │ bottles/  │
│ harbor/   │   │ I2I Transport│   │ harbor/   │
│           │   │ t-minus WS   │   │           │
└──────────┘   └─────────────┘   └──────────┘
```

- **I2I Bottles**: File-based async messaging via `bottles/` (outgoing) and `harbor/` (incoming)
- **T-minus Cues**: WebSocket-based real-time coordination with beat timing
- **Composite Headspace**: Cognitive DAW with dual-shell bass/treble reasoning and symmetry-dissonance analysis

---

## 2. Integration Roadmap

### 🔥 Integration A: text2midi + MidiTok → Composite Headspace
**Title:** *"Generative MIDI Shell — Agents Compose from Natural Language"*

#### 2.1 What It Does

Adds a **MIDI generation shell** to the composite-headspace cognitive DAW that can transform any reasoning problem's output into symbolic music. An agent prompts: *"Generate a tense, rising bassline reflecting distributed system inconsistency"* and receives a MIDI file.

#### 2.2 Architecture

```
┌──────────────────────────────────────────────────┐
│              Composite Headspace (v2)              │
│                                                    │
│  Shell A (bass)      Shell B (treble)     NEW      │
│  Deep reasoning      Pattern matching     MIDI Shell│
│                      + text2midi()         MidiTok  │
│                      + MidiTok()           symusic  │
│                            │                        │
│                            ▼                        │
│                    Symmetry-Dissonance Loop         │
│                         + MIDI                      │
│                         Synthesis                   │
└──────────────────┬───────────────────────────────┘
                   │ MIDI file
                   ▼
           harbor/ or bottles/
```

#### 2.3 Implementation Steps

1. **Install dependencies** (composite-headspace `package.json` devDependencies):
   - `pip install miditok symusic` (Python subprocess layer)
   - `pip install git+https://github.com/asigalov61/tegridy-tools` (text2midi engine)

2. **Create `src/midi-shell.js`** — a new shell type alongside `shell-agent.js`:
   ```javascript
   class MidiShell extends ShellAgent {
     constructor(config) {
       super({
         id: 'midi-shell',
         timbre: 'generative-music',
         frequency: 'mid',  // 0.1–1 Hz
         ...config
       });
     }

     async generateFromProblem(problem, convergenceScore) {
       // 1. Synthesize a text2midi prompt from the reasoning task
       // 2. Spawn Python subprocess: text2midi → TMIDIX → MIDI bytes
       // 3. Tokenize with MidiTok for ML compatibility
       // 4. Return a-box with MIDI payload + symusic analysis
     }
   }
   ```

3. **Add MIDI to the symmetry-dissonance analysis** — the detector already has resonance metric R ∈ [0,1]; add a `musicResonance` sub-metric that measures whether the generated MIDI's harmonic content reflects the cognitive dissonance.

4. **New output format: MIDI + report** — when `--format midi` is used, the CLI produces both the analysis report and a `.mid` file.

#### 2.4 Sample Workflow

```bash
node cli.js --problem "Design an event-sourcing topology" --format midi --with-music
# Writes: report.json + output.mid
```

```javascript
const { Coordinator, MidiShell } = require('composite-headspace');
const coordinator = new Coordinator({ withMidi: true });
await coordinator.start();

const headspace = coordinator.createCompositeHeadspace();
headspace.attachShell(new MidiShell());

const result = await headspace.runTask({
  prompt: "Generate a minimal techno pattern for a system architecture analysis"
});

// result.midi → Uint8Array (standard MIDI file)
// result.midiAnalysis ← symusic analysis: tempo, keys, track count
// result.report ← standard composite report
```

#### 2.5 Natural Language → MIDI Prompt Templates

| Reasoning Type | MIDI Mapping Strategy |
|----------------|----------------------|
| Architectural tension | Minor keys, descending bass, dissonant intervals |
| Pattern recognition | Repeating motifs, arpeggios, call-and-response |
| Debug analysis | Staccato, irregular rhythms, silence gaps |
| Design harmony | Diatonic chords, consonant intervals, stable rhythms |
| Cognitive dissonance | Polyrhythms, bitonality, chromatic clusters |

#### 2.6 Integration Points with Fleet

- **I2I Bottles**: Output `.mid` files as artifacts in bottles → other agents consume
- **Harbor Drop**: MIDI files land in `harbor/` for fleet members to pick up
- **T-minus Cues**: Real-time generated note events streamed via WebSocket for live playback

---

### 🔥 Integration B: TidalCycles/FoxDot Ensign Agent
**Title:** *"The Rhythm Smith — Declarative Pattern Generation Agent on the Fleet Bridge"*

#### 3.1 What It Does

An autonomous fleet agent ("rhythm-smith") that accepts **pattern descriptions** (mininotation, Python patterns) over I2I bottles and t-minus cues, generates rhythmic MIDI sequences using TidalCycles-like pattern algebra — ported to Python (FoxDot-compatible) to run natively in the fleet without Haskell.

#### 3.2 Architecture

```
┌──────────────┐     bottle: PATTERN_SPEC    ┌─────────────────────┐
│  Any Agent   │ ──────────────────────────►  │  rhythm-smith       │
│  (e.g.       │                              │  Ensign Agent       │
│  composite-  │                              │                     │
│  headspace)  │◄─ bottle: MIDI + analysis ───│  • Pattern parser   │
└──────────────┘                              │  • FoxDot pattern   │
                                              │    engine (Python)  │
┌──────────────┐                              │  • Eisenstein snap  │
│  FleetBridge │                              │  • ternary-rhythm   │
│  route table │                              │    integration      │
│              │                              │  • MIDI output via  │
│  registered: │                              │    flux-tensor-midi │
│  rhythm-smith│                              └─────────┬───────────┘
└──────────────┘                                        │
                                                         ▼
                                              ┌─────────────────────┐
                                              │  I2I Bottle /       │
                                              │  t-minus Cue        │
                                              │  → MIDI artifacts   │
                                              └─────────────────────┘
```

#### 3.3 Implementation Steps

1. **Create `/workspace/ensign-rhythm/`** — new fleet ensign agent directory:

   ```
   ensign-rhythm/
   ├── package.json
   ├── src/
   │   ├── index.js               # Agent entry: FleetBridge client
   │   ├── pattern-parser.js      # TidalCycles mininotation parser
   │   ├── rhythm-engine.js       # FoxDot-compatible pattern generator
   │   ├── midi-renderer.js       # Converts patterns → MIDI via flux-tensor-midi
   │   └── eisenstein-router.js   # Optional: snap to Eisenstein lattice
   └── README.md
   ```

2. **Implement pattern grammar parser** — a JavaScript port of TidalCycles' mini-notation:

   ```javascript
   // "bd sn hh cp" → ["bd", "sn", "hh", "cp"]
   // "<bd sn> cp" → alternating patterns
   // "bd*3 sn" → ["bd", "bd", "bd", "sn"]
   class PatternParser {
     parse(mininotation) { /* recursive descent parser */ }
     expand(pattern, steps) { /* time quantization */ }
   }
   ```

3. **Integrate FoxDot's pattern classes** — reimplement the core algorithmic patterns in JS/Python:

   | FoxDot Pattern | Fleet Equiv | Description |
   |----------------|-------------|-------------|
   | `P[1,2,3]` | Static list | Explicit sequence |
   | `P[1,2,3].loop()` | `repeat` | Circular iteration |
   | `P[1,2,3].reverse()` | `reverse` | Backwards playback |
   | `P[1,2,3].stutter(2)` | `stutter` | Repeat each element n times |
   | `P[1,2,3].shuffle()` | `shuffle` | Random permutation |
   | `P[1,2,3].rotate(1)` | `rotate` | Circular shift |
   | Euclidean (`PEuclid(3,8)`) | Bjorklund algo | Even distribution of n hits over k steps |

4. **Flux-Tensor-MIDI integration** — existing band/conductor/ensemble code provides the MIDI output layer:

   ```python
   from flux_tensor_midi.ensemble.band import Band
   from flux_tensor_midi.core.snap import RhythmicRole
   
   # rhythm-smith receives a pattern spec →
   # maps pattern roles (kick, snare, hat) → RoomMusicians
   # maps mininotation timing → EisensteinSnap
   # calls band.tick_all() → MIDI events
   ```

5. **Register in fleet-bridge** — add to default route table:

   ```javascript
   // fleet-bridge/src/route-table.js
   routes.register('rhythm-smith', 'both', {
     description: 'Declarative rhythmic pattern generation',
     protocol: 'I2I-PATTERN-v1',
     ports: { i2i: true, tminus: true }
   });
   ```

#### 3.4 Bottle Protocol

**Request bottle** (from any agent):
```json
{
  "to": "rhythm-smith",
  "type": "TASK",
  "shard": {
    "artifacts": {
      "pattern": "<bd sn> cp",
      "bpm": 120,
      "bars": 4,
      "groove": "swing-16",
      "format": "midi"
    }
  }
}
```

**Response bottle** (back to requester):
```json
{
  "to": "requester-agent",
  "type": "DELIVERABLE",
  "shard": {
    "artifacts": {
      "midi": "<base64-encoded-midi>",
      "tracks": ["bd", "sn", "cp"],
      "analysis": {
        "duration_seconds": 8.0,
        "events": 128,
        "eisenstein_snap": true
      }
    }
  }
}
```

**T-minus real-time cue** (for live streaming):
```javascript
tminus.sendCue('rhythm-smith', 'composite-headspace', 'MIDI_NOTE', {
  note: 36, velocity: 100, timestamp: beatPosition
});
```

#### 3.5 Fleet Value

- **Algorithms**: FoxDot's pattern algebra gives the fleet algorithmic composition natively
- **Eisenstein**: Existing flux-tensor-midi Eisenstein lattice ensures quantized, musically-useful output
- **ternary-rhythm**: Rust trit-based patterns become available to Python/JS agents via bridge
- **Live coding**: t-minus cues enable real-time rhythmic generation synchronized to cognitive beats

---

### 🔥 Integration C: symusic + MusicLang → MIDI Analysis/Arrangement Module
**Title:** *"The Arranger — Structural MIDI Analysis for Fleet Agents"*

#### 4.1 What It Does

A reusable MIDI analysis and arrangement module (library + CLI tool) that any fleet agent can invoke to:
- **Analyze**: Extract key, tempo, chord progression, voice count, density, and structural sections from any MIDI
- **Rearrange**: Change instrumentation, transpose, time-stretch, reorchestrate across channel counts
- **Tokenize**: Convert between MIDI ↔ MidiTok token sequences for ML pipelines

#### 4.2 Architecture

```
┌─────────────────────────────────────────────────┐
│              MIDI Analysis Module                │
│                  (Python library)                │
│                                                  │
│  ┌─────────────────┐   ┌────────────────────┐   │
│  │ symusic Engine   │   │ MusicLang          │   │
│  │ • Parse (C++20)  │   │ Arranger           │   │
│  │ • Transform      │   │ • Chord detection  │   │
│  │ • Synthesize     │   │ • Voice leading    │   │
│  │ • Piano roll     │   │ • Structure labels │   │
│  │ • Beats/downbeats│   │ • Reharmonization  │   │
│  └────────┬─────────┘   └─────────┬──────────┘   │
│           │                       │               │
│           └───────────┬───────────┘               │
│                       │                           │
│  ┌────────────────────▼──────────────────────┐   │
│  │        Miditok Bridge                      │   │
│  │  • MIDI → token sequences (REMI/CW)       │   │
│  │  • token sequences → MIDI                 │   │
│  │  • BPE training on custom MIDI datasets   │   │
│  │  • HuggingFace Hub push/pull              │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │        CLI: midi-arranger                  │   │
│  │  --analyze <file>   → JSON report         │   │
│  │  --rearrange (opts) → new MIDI            │   │
│  │  --tokenize <file>  → token JSON          │   │
│  │  --synth <file>     → WAV audio           │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### 4.3 Implementation Steps

1. **Create `/workspace/midi-arranger/`** as a shared Python package:

   ```
   midi-arranger/
   ├── setup.py / pyproject.toml
   ├── midi_arranger/
   │   ├── __init__.py
   │   ├── analyzer.py       # symusic-based analysis
   │   ├── arranger.py       # MusicLang structural rearrangement
   │   ├── tokenizer.py      # MidiTok bridge
   │   ├── synthesizer.py    # symusic SoundFont renderer
   │   ├── cli.py            # CLI entry point
   │   └── fleet_adapter.py  # I2I bottle ↔ MIDI bridge
   ├── tests/
   ├── requirements.txt
   └── README.md
   ```

2. **Implement `analyzer.py`** — using symusic's C++20 kernel for speed:

   ```python
   from symusic import Score
   import numpy as np
   
   class MidiAnalyzer:
       def __init__(self, path_or_bytes):
           self.score = Score(path_or_bytes) if isinstance(path_or_bytes, str) else Score()
           if not isinstance(path_or_bytes, str):
               self.score = Score()
               self.score.dump_midi(path_or_bytes)  # TODO: load from bytes
       
       def key_signature(self):
           # Use pitch class distribution → Krumhansl-Schmuckler key finder
           return detected_key
       
       def tempo_curve(self):
           # Extract tempo changes over time
           return [(beat, tempo) for beat, tempo in self.score.tempos]
       
       def chord_progression(self):
           # Sliding window harmony analysis
           # Returns list of (beat, chord_name, confidence)
           return chords
       
       def structure(self):
           # Spectral self-similarity → section boundaries (A/B/Bridge/C)
           return sections
       
       def density_profile(self):
           # Notes per quarter note over time
           return densities
       
       def to_json(self):
           return {
               "tracks": len(self.score.tracks),
               "duration_quarters": self.score.duration(),
               "key": self.key_signature(),
               "tempo": self.tempo_curve(),
               "chords": self.chord_progression(),
               "structure": self.structure(),
               "density": self.density_profile(),
               "note_count": sum(len(t.pitches) for t in self.score.tracks)
           }
   ```

3. **Implement `tokenizer.py`** — MidiTok bridge for ML-ready sequences:

   ```python
   from miditok import REMI, TokenizerConfig
   
   class MidiTokenizer:
       def __init__(self, config=None):
           self.config = config or TokenizerConfig(
               num_velocities=16,
               use_chords=True,
               use_programs=True,
               use_tempos=True
           )
           self.tokenizer = REMI(self.config)
       
       def midi_to_tokens(self, midi_path):
           return self.tokenizer(midi_path)
       
       def tokens_to_midi(self, tokens, output_path):
           midi = self.tokenizer(tokens)
           midi.dump_midi(output_path)
       
       def train_bpe(self, midi_files, vocab_size=30000, save_path="tokenizer.json"):
           self.tokenizer.train(vocab_size=vocab_size, files_paths=midi_files)
           self.tokenizer.save(save_path)
       
       def push_to_hub(self, repo_name, token):
           # Push trained tokenizer to HuggingFace Hub
           self.tokenizer.push_to_hub(repo_name, token=token)
   ```

4. **Implement `arranger.py`** — MusicLang-style arrangement logic:

   ```python
   class Arranger:
       def reharmonize(self, midi_path, style="jazz", output_path="output.mid"):
           """Reharmonize a melody with new chord progression in given style"""
           pass  # Use voice leading rules + style templates
       
       def redistribute_tracks(self, midi_path, channel_map, output_path):
           """Redistribute notes across channels/instruments"""
           pass
       
       def time_stretch(self, midi_path, factor, output_path):
           """Time-stretch preserving pitch"""
           pass
       
       def quantize_to_eisenstein(self, midi_path, role, output_path):
           """Quantize MIDI events to Eisenstein lattice"""
           # Integration point: reuse flux-tensor-midi's EisensteinSnap
           pass
   ```

5. **Implement `fleet_adapter.py`** — I2I bottle bridge:

   ```python
   class FleetMidiAdapter:
       """Reads MIDI from I2I bottles, processes, sends results back."""
       
       def __init__(self, vessel_dir):
           self.harbor = os.path.join(vessel_dir, 'harbor')
           self.bottles = os.path.join(vessel_dir, 'bottles')
       
       def process_incoming_midi(self):
           """Scan harbor/ for MIDI analysis requests, process them."""
           bottles = self.beachcomb()
           for bottle in bottles:
               if bottle.type == 'ANALYZE_MIDI':
                   result = self.analyze_bottle(bottle)
                   self.drop_response(bottle.from, result)
       
       def analyze_bottle(self, bottle):
           midi_bytes = base64.b64decode(bottle.shard.artifacts.midi)
           with tempfile.NamedTemporaryFile(suffix='.mid') as f:
               f.write(midi_bytes)
               f.flush()
               analyzer = MidiAnalyzer(f.name)
               return analyzer.to_json()
   ```

#### 4.4 Fleet Integration Points

| Fleet Component | Integration | How |
|----------------|-------------|-----|
| **FleetBridge** | Route registration | Add `midi-arranger` as known agent route |
| **composite-headspace** | MIDI Shell consumer | MIDI Shell uses arranger analysis as a-box content |
| **rhythm-smith** (Integration B) | Quality gate | Arranger validates rhythmic patterns before output |
| **flux-tensor-midi** | Backend renderer | Arranger uses flux-tensor-midi band for ensemble orchestration |
| **ternary-rhythm** | Time domain | Arranger quantizes to ternary rhythm grids |

#### 4.5 CLI Quick Reference

```bash
# Analyze a MIDI file
python -m midi_arranger --analyze input.mid --format json > analysis.json

# Rearrange: change to piano quintet
python -m midi_arranger --rearrange input.mid \
  --channels "piano,violin,viola,cello" \
  --output rearranged.mid

# Tokenize for ML
python -m midi_arranger --tokenize input.mid --method REMI > tokens.json

# Synthesize to audio
python -m midi_arranger --synth input.mid --soundfont FluidR3.sf2 --output output.wav

# Train a BPE tokenizer on a collection
python -m midi_arranger --train-bpe ./midi_dataset/ --vocab-size 30000

# Listen on the fleet bridge
python -m midi_arranger --fleet-agent --vessel-dir ~/i2i-vessel/
```

---

## 5. Cross-Integration Dependencies

```
Integration A (MIDI Shell)
        │
        │ relies on
        ▼
Integration C (MIDI Analyzer) ◄──── depends on ──── symusic
        │                              depends on ──── MidiTok
        │                              depends on ──── MusicLang
        │
        │ feeds analysis to
        ▼
Integration B (Rhythm Smith) ◄──── depends on ──── FoxDot patterns
                             ◄──── depends on ──── flux-tensor-midi
                             ◄──── optional ───── ternary-rhythm
```

**Recommended build order:** C → A → B (build the foundation first, then generative shells, then the standalone pattern agent).

---

## 6. Resource & Risk Assessment

### 6.1 Dependencies

| Tool | pip install | Size | License | Notes |
|------|-------------|------|---------|-------|
| symusic | `pip install symusic` | ~15MB (C++ compiled) | MIT | C++20 compiler needed |
| MidiTok | `pip install miditok` | ~2MB | MIT | Depends on symusic |
| tegridy-tools | `git clone` | ~50MB | MIT | Heavy; includes ML models |
| FoxDot | `pip install FoxDot` | ~500KB | MIT | Requires SuperCollider |
| flux-tensor-midi | local | ~50KB | MIT | Already in fleet |

### 6.2 Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| tegridy-tools large install | Medium | Use only TMIDIX submodule; lazy-load |
| SuperCollider dependency for FoxDot | Medium | Implement pattern algebra in pure Python (no SC needed for MIDI-only) |
| TidalCycles archived upstream | Low but real | FoxDot patterns are Python-native; tidal notation is a parser only |
| C++20 compilation for symusic | Low | Prebuilt wheels available for all platforms |
| MidiTok tokenizer version drift | Low | Pin version in requirements.txt |

---

## 7. Summary: Three Integration Ideas

### 🎹 Integration A: MIDI Shell in Composite Headspace
**Status:** High priority ⭐⭐⭐  
**Effort:** Medium (2-3 days)  
**Impact:** Agents can compose music from reasoning problems — turns cognitive output into aesthetic experience  
**Key tools:** text2midi, MidiTok, symusic

### 🥁 Integration B: Rhythm Smith Ensign Agent
**Status:** High priority ⭐⭐⭐  
**Effort:** Medium (2-3 days)  
**Impact:** Standalone declarative pattern generator available to all fleet agents via bridge  
**Key tools:** FoxDot, TidalCycles (mininotation), flux-tensor-midi, ternary-rhythm

### 🎶 Integration C: MIDI Analysis/Arrangement Module
**Status:** Foundation ⭐⭐⭐  
**Effort:** Small (1-2 days)  
**Impact:** Shared analysis library all agents can use; tokenization enables ML on symbolic music  
**Key tools:** symusic, MidiTok, MusicLang
