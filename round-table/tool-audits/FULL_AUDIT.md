# Full Tool Audit: Fork Potential Analysis

**Date:** 2026-06-09
**Author:** Subagent (Depth 1/1)
**Purpose:** Evaluate each tool in the lineage for fork potential — determine API surface, integration points, fork boundary, and priority ranking.

---

## Table of Contents

1. [aubio](#1-aubio)
2. [Vamp Plugins](#2-vamp-plugins)
3. [Pure Data](#3-pure-data)
4. [Essentia / MTG-Melodia](#4-essentia--mtg-melodia)
5. [Basic Pitch](#5-basic-pitch)
6. [Omnizart](#6-omnizart)
7. [Demucs](#7-demucs)
8. [Magenta (Onsets and Frames)](#8-magenta-onsets-and-frames)
9. [MIDIfren](#9-midifren)
10. [CMC (Creative MIDI Companion)](#10-cmc-creative-midi-companion)
11. [Priority Ranking Summary](#11-priority-ranking-summary)

---

## 1. aubio

### 1.1 What It Is
C library (LGPL) with Python bindings and CLI tools. Provides onset detection, pitch (F0) tracking, beat tracking, note detection, and MFCC extraction. No deep learning — all DSP-based.

### 1.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **C library** | `libaubio` | Core functions: `aubio_pitch_new()`, `aubio_onset_new()`, `aubio_source_new()` |
| **CLI** | `aubiopitch`, `aubioonset`, `aubiotrack`, `aubionotes` | Stdout text output per detected event |
| **Python bindings** | `import aubio` | `pitch = aubio.pitch()`, `onset = aubio.onset()` — process audio frames in a loop |
| **Output format** | CLI: space-separated time + value per line (e.g. `0.01 440.0`). Python: float arrays. `aubionotes` outputs MIDI-like note events. |

### 1.3 Input / Output

- **Input:** WAV files (or any format libsndfile supports), raw float buffers
- **aubiopitch output:** `time(s) frequency(Hz)` lines to stdout
- **aubionotes output:** `time(s) midi_note velocity` lines
- **Python API output:** Python lists/arrays of floats (time, pitch/confidence)

### 1.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **CLI pipe** | `aubiopitch in.wav > pitch.txt` — trivial to subprocess | Low |
| **Python import** | `from aubio import pitch` in a Python stage | Low |
| **Conversion to lead-sheet** | Must convert Hz → MIDI note numbers → merge with existing MIDI events | Medium |

**Best integration:** Call `aubiopitch` CLI → parse time/freq → convert Hz to MIDI → inject into lead-sheet track as note events.

### 1.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | Nothing — aubio is LGPL, compiled binary we just call |
| **Do we need any aubio source?** | No. It's a stable, well-tested library. No reason to fork. |
| **Could we reimplement internally?** | Yes — algorithms are standard DSP (YIN pitch, spectral onset). ~2-3 weeks of work for marginal benefit. |
| **Verdict** | **DO NOT FORK.** Call as a subprocess or import as a pip dependency. |

---

## 2. Vamp Plugins

### 2.1 What It Is
Plugin system (not a single tool) — a C++ SDK for audio feature extraction plugins. Hosts (Sonic Visualiser, Sonic Annotator) load `.vamp` shared libraries. Plugins expose features via a documented C++ ABI.

### 2.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **Plugin SDK** | C++ ABI (`vamp-sdk`) | Plugin implements `vamp::Plugin` base class. Host loads `.so`/`.dll`/`.dylib`. |
| **Host SDK** | C++ library (`vamp-hostsdk`) | `vamp::HostExt::PluginLoader` — load, configure, run plugins programmatically |
| **Sonic Annotator** | CLI tool | `sonic-annotator -t transforms.ttl -w csv in.wav` — batch plugin execution |
| **Python bridge** | `vamp` (pip: `pip install vamp`) | `import vamp; vamp.load('myplugin'); vamp.process_frames(audio, block_size, step)` |

### 2.3 Input / Output

- **Input:** Audio buffers (float arrays) + feature extraction parameters
- **Output:** Feature sets — arbitrary structured data per feature (time-stamped values, sparse events, curve data)
  - CSV export via Sonic Annotator
  - NumPy-like structures via Python `vamp` module
  - Plugins exist for: pitch (pYIN, CREPE), chords (Chordino), beat tracking, note transcription (Silvet), melody (MELODIA as vamp)

### 2.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **Sonic Annotator CLI** | `sonic-annotator -d vamp:plugin:output in.wav -w csv` → structured output | Low |
| **Python `vamp` module** | `import vamp; result = vamp.process(audio, 'vamp-example-plugins', 'pitch')` | Low |
| **Direct host-sdk C++** | Use `vamp-hostsdk` to load plugins in our own C++ pipeline | High |

**Best integration:** Python `vamp` module — it wraps the host SDK, works cross-platform, and returns structured data we can parse into lead-sheet events.

### 2.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | Individual Vamp plugins we find useful (e.g., pYIN, Chordino, MELODIA) — but most have standalone equivalents |
| **Do we need the Vamp SDK?** | Only if we want to write new plugins. For consumption, use `vamp` Python module. |
| **Could we reimplement?** | Each plugin is its own research project. Not worth reimplementing. |
| **Verdict** | **DO NOT FORK.** Use as external dependency via `vamp` Python module or Sonic Annotator CLI. |

---

## 3. Pure Data

### 3.1 What It Is
Visual dataflow programming language (visual patching) for real-time audio processing. Includes signal processing objects (`fiddle~`, `sigmund~` for pitch tracking, `bonk~` for onsets). Runs as standalone app or as library `libpd`.

### 3.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **Standalone Pd** | GUI application | Visual patching, can send/receive OSC via `netpd`/`mrpeach` externals |
| **libpd** | C library | Embed Pd engine: `libpd_init()`, `libpd_process_float()`, send/receive messages |
| **Python bridge** | `python-pd` / `pypd` | Python-ctypes wrappers around libpd |
| **OSC bridge** | UDP | `[oscformat]` → `[udpsend]` in Pd patch; `python-osc` on our side |
| **TCP bridge** | `[netsend -t]` | Raw TCP socket output from Pd |

### 3.3 Input / Output

- **Input:** Audio signal (real-time or file), control messages via OSC/tcp
- **Output:** `fiddle~` outputs pitch (Hz) + amplitude continuously; `sigmund~` outputs note onset/offset events with pitch
- **Bridge options:** OSC/UDP, TCP, shared memory via libpd, MIDI via ALSA/JACK

### 3.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **libpd embedded** | Embed Pd runtime in our Python process → control via `libpd_process_float()` | Medium |
| **Pd standalone + OSC** | Run Pd patch as subprocess, pipe pitch data via UDP OSC | Medium |
| **netpd / mrpeach** | Standard Pd-external for network comms | Low effort on Pd side |

**Best integration:** Run Pd standalone with a patch that uses `sigmund~` for note detection, streams output via `[oscformat]` → `[udpsend]` to our fleet WebSocket. This decouples Pd entirely.

### 3.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | Potentially `fiddle~` / `sigmund~` objects' DSP code (~2k lines C) |
| **Why fork?** | `fiddle~` uses a simple peak-picking FFT approach. We could rewrite it lighter and without libpd dependency. |
| **Why not fork?** | libpd is battle-tested. Our DSP approach (aubio + Basic Pitch) already covers monophonic pitch better. |
| **Verdict** | **LOW PRIORITY FORK.** Only fork `fiddle~` algorithm if we need real-time pitch from a server-side audio pipeline without spawning any subprocess. Otherwise, skip Pd entirely. |

---

## 4. Essentia / MTG-Melodia

### 4.1 What It Is
C++ library (AGPL v3) with Python and JavaScript bindings. Contains 100+ audio analysis algorithms. The MELODIA algorithm (PredominantMelody) is the flagship melody extraction method for polyphonic music.

### 4.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **C++ library** | `essentia::standard::PredominantMelody` | Standard mode: explicit execution order |
| **Python bindings** | `import essentia.standard as es` | `es.PredominantMelody(audio)` → returns `(pitch, confidence)` as vector_real |
| **Streaming mode** | `essentia.streaming` | Connect algorithms as a graph, auto-scheduled |
| **CLI** | `essentia_streaming_extractor` | Batch analysis → YAML/JSON output |
| **TensorFlow wrapper** | `essentia.tensorflow` | Load TF models within Essentia pipeline |

### 4.3 Input / Output

- **Input:** Audio signal (vector_real) at configurable sample rate (default 44100)
- **Output for PredominantMelody:**
  - `pitch` (vector_real): F0 estimates in Hz per analysis frame
  - `pitchConfidence` (vector_real): confidence 0.0–1.0
- **Parameters:** frameSize=2048, hopSize=128, minFrequency=80, maxFrequency=20000, many more
- **No built-in MIDI export** — we must convert Hz values to MIDI notes ourselves

### 4.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **Python import** | `pip install essentia` → `es.PredominantMelody(audio)` → Hz array | Low |
| **Hz → MIDI conversion** | `69 + 12 * log2(f/440)` per frame, cluster into note events | Medium |
| **Confidence thresholding** | Use `pitchConfidence` to filter noise → cleaner lead-sheet | Low |

**Best integration:** Python script: load Essentia, call PredominantMelody on audio file, convert output Hz array to note events, emit as MIDI track → merge into lead-sheet.

### 4.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | The PredominantMelody (MELODIA) algorithm — complex salience-function + contour-tracking (~3-5k lines C++) |
| **Why fork?** | AGPL license could be restrictive if we need proprietary distribution. Also — customizing the pitch detection pipeline. |
| **Why not fork?** | Python bindings are excellent. MELODIA is well-optimized state-of-the-art. Reimplementing is a research paper-level effort. |
| **License note** | AGPL v3 — if we link it, our entire system must be AGPL. If we call via subprocess, we avoid copyleft propagation. |
| **Verdict** | **DO NOT FORK THE ALGORITHM.** Call as subprocess or Python import. If license is a concern, use a different approach (Basic Pitch covers similar ground with Apache 2.0). |

---

## 5. Basic Pitch

### 5.1 What It Is
Python library (Apache 2.0) by Spotify's Audio Intelligence Lab. Lightweight neural network for polyphonic instrument-agnostic audio-to-MIDI transcription. Uses TensorFlow Lite / CoreML / ONNX runtimes (no heavyweight TF dependency by default).

### 5.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **Python API** | `from basic_pitch import ICASSP_2022_MODEL_PATH` | `model_output, midi_data, note_events = predict(audio_path)` |
| **CLI** | `basic-pitch /tmp/out /tmp/in.wav` | Generates MIDI file + CSV of notes |
| **npm/TypeScript** | `@spotify/basic-pitch` (sibling repo) | Browser-compatible model |

### 5.3 Input / Output

- **Input:** WAV/MP3/flac/ogg audio file path OR numpy array of audio samples
- **Output (`predict()` returns 3 things):**
  1. `model_output` (numpy) — raw model activations
  2. `midi_data` (pretty_midi.PrettyMIDI object) — full MIDI data with notes, pitch bends, velocities
  3. `note_events` (list of tuples) — `(start_time, end_time, pitch, velocity, [pitch_bend])`
- **CLI output:** `.mid` file + `.csv` note events in `/tmp/out/`
- **Key features:** Multiple confidence thresholds adjustable, pitch bend detection, velocity estimation

### 5.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **Python `predict()`** | `audio_path → midi_data → merge into lead-sheet` | **Trivial** — already installed |
| **pretty_midi merge** | `midi_data` is a PrettyMIDI object — we can iterate `.instruments[0].notes` and add to our track | Low |
| **CLI subprocess** | `basic-pitch out/ in.wav` → parse output MIDI file | Low |

**This is the crown jewel for our pipeline.** Already installed and working. The MIDI output is directly mergeable into our lead-sheet track.

### 5.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | The TFLite model and inference pipeline (~1k lines Python + ~5MB TFLite model) |
| **Why fork?** | Add custom post-processing (our fleet-specific note clustering, velocity quantization rules). Or to retrain on our domain data. |
| **Why not fork?** | Apache 2.0 is permissive. The predict() API gives us everything we need. Forking the TFLite model gives little benefit unless we retrain. |
| **Verdict** | **DON'T FORK THE MODEL — DO BUILD A STAGE AROUND IT.** Wrap `basic_pitch.predict()` as a pipeline stage that feeds `midi_data` directly into our lead-sheet tracker. If we need custom post-processing, write it as a composable stage **after** Basic Pitch, not a fork. |

---

## 6. Omnizart

### 6.1 What It Is
Python library (MIT license) for multi-instrument automatic music transcription. Can transcribe: pitched instruments ("music"), drums, vocal melody, vocal contour (F0), chords, beat. Uses deep learning (convolutional + recurrent nets).

### 6.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **CLI** | `omnizart music transcribe in.wav` | Produces MIDI file in output directory |
| **Python API** | `from omnizart.music import app as music_app` | `music_app.transcribe(audio_path)` |
| **Sub-commands** | `music`, `vocal`, `vocal-contour`, `drum`, `chord`, `beat` | Each has `transcribe` subcommand |
| **Output format** | MIDI files (`.mid`) — one per track/stem. Music → MIDI, Drum → MIDI, Vocal → MIDI |

### 6.3 Input / Output

- **Input:** Audio file (WAV/MP3 supported)
- **Output:**
  - `music transcribe`: MIDI file with note events for pitched instruments
  - `vocal transcribe`: MIDI file with vocal melody notes
  - `vocal-contour transcribe`: MIDI file with vocal F0 contour (pitch bend heavy)
  - `drum transcribe`: MIDI file with drum MIDI events
  - `chord transcribe`: Text/chord progression output
  - `beat transcribe`: Beat times (TXT/CSV)
- **Checkpoints:** Downloaded separately via `omnizart download-checkpoints` (~hundreds of MB)

### 6.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **CLI per instrument** | Subprocess each sub-command → collect MIDI files | Medium |
| **Python API** | `app.transcribe(audio_path)` → parses and writes MIDI | Medium |
| **Route stems to agents** | Omnizart vocal → Agent-A melody track. Omnizart music → Agent-B harmony track. | Medium |

**Best integration:** Use Omnizart's various sub-models to create separate MIDI tracks for vocal melody and pitched instruments. Each track can feed a different agent in our fleet for specialized processing.

### 6.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | Individual sub-models (music, vocal, drum) — each is a trained neural network |
| **Why fork?** | Fine-tune on specific instrument types. Integrate Omnizart's output routing directly into our agent dispatch system. |
| **Why not fork?** | MIT license is permissive. CLI interface is clean. Forking model code (~20k+ lines PyTorch) is overkill unless retraining. |
| **Verdict** | **CALL, DON'T FORK.** Use the CLI or Python API. Add our own "agent router" stage that takes Omnizart output MIDI and dispatches each instrument track to a separate fleet agent. Only fork if retraining on custom domain data. |

---

## 7. Demucs

### 7.1 What It Is
Meta's source separation model (v4 — Hybrid Transformer Demucs). Separates audio into stems: drums, bass, vocals, others (or 6-stem: +guitar, piano). Pip-installable with PyTorch. Code available but repo unmaintained (fork at `adefossez/demucs`).

### 7.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **CLI** | `demucs in.wav` | Produces separated stems in `separated/htdemucs/in/` |
| **Python API** | `from demucs import separate` | `main.separate(audio_path)` returns tensor references |
| **Model selection** | `-n htdemucs` (default), `-n htdemucs_ft` (fine-tuned), `-n htdemucs_6s` (6-stem) | |
| **Output format** | WAV files per stem | `stem_0.wav` (drums), `stem_1.wav` (bass), `stem_2.wav` (vocals), `stem_3.wav` (other) |

### 7.3 Input / Output

- **Input:** Audio file (any format ffmpeg supports)
- **Output:** 4+ WAV files — one per source stem
- **Key property:** Separated WAV files can be fed **individually** into downstream transcription tools (Basic Pitch, Omnizart, etc.)

### 7.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **Pre-processing stage** | Demucs → separated WAVs → route each WAV to a transcription agent | Medium |
| **Pipeline branch** | Arrow: `Audio → Demucs → {Vocals→BasicPitch, Bass→BasicPitch, Other→Omnizart}` | Medium |
| **Subprocess call** | `subprocess.run(["demucs", audio_path])` → wait for WAV output | Low |
| **Python inline** | `from demucs import separate; tensor = separate.load_model()...` | Medium (PyTorch memory intensive) |

**This is a force-multiplier.** Demucs enables us to separate instruments before transcription, massively improving per-stem transcription quality. Without it, polyphonic transcription is muddied.

### 7.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | The Hybrid Transformer model architecture + inference code (~5k lines PyTorch) |
| **Why fork?** | Customize stem definitions (add "piano" stem). Optimize for speed (quantize, export to ONNX). Integrate as shared-memory pipeline stage rather than WAL files. |
| **Why not fork?** | The codebase is large, requires GPU, and is no longer maintained by Meta. The CLI interface is stable. |
| **Verdict** | **CONSIDER FORK** — but only the inference wrapper, not the model. Build a thin service that: (1) accepts audio via WebSocket, (2) runs Demucs inference, (3) streams separated WAV tensors directly to downstream transcription agents **without writing to disk**. This is valuable enough to warrant ~1 week of engineering. The actual model weights stay frozen. |

---

## 8. Magenta (Onsets and Frames)

### 8.1 What It Is
TensorFlow model from Google Magenta for piano transcription with velocity estimation. Uses dual-objective: onset detection + frame activation. Outputs note events with velocity. Project is now inactive; superseded by MT3. PyTorch port exists (`jongwook/onsets-and-frames`).

### 8.2 API Surface

| Layer | Interface | Details |
|-------|-----------|---------|
| **CLI** | `onsets_frames_transcription_transcribe` | Takes WAV + model checkpoint → MIDI output |
| **Python API** | `from magenta.models.onsets_frames_transcription import transcribe_audio` | Returns note sequence |
| **Output format** | `note_sequence_pb2.NoteSequence` protobuf → convertible to MIDI via `note_seq.sequence_proto_to_midi_file()` |
| **Colab notebook** | Browser-based inference | For demos only |

### 8.3 Input / Output

- **Input:** WAV audio file + pre-trained checkpoint (~500MB with MAESTRO dataset)
- **Output:** NoteSequence protobuf with note events including:
  - `pitch` (MIDI note number 0-127)
  - `velocity` (0-127) — **this is the key distinction** — velocity reflects how hard a key was pressed on the piano
  - `start_time` / `end_time` (seconds)
  - `is_drum` flag for drum transcription
- **Drums model:** Also available with E-GMD checkpoint

### 8.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **CLI subprocess** | Run transcription → convert protobuf to MIDI | Medium (heavy checkpoint download) |
| **Python API** | Load model, transcribe, get NoteSequence | High (TF dependency, deprecated) |
| **Velocity enrichment** | Use velocity values to add dynamics to our lead-sheet | Low (just a conversion step) |
| **PyTorch port** | `pip install onsets-and-faces-torch` (community port) | Medium |

**Velocity tracking** is the standout feature. Our lead-sheet can include velocity as note loudness, enabling more expressive MIDI output. However, Basic Pitch also provides velocity. The real value-add is Onsets and Frames' frame-level accuracy for **piano specifically** — it's trained on ~200 hours of piano performances (MAESTRO).

### 8.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | The Onsets-and-Frames architecture (dual-head CNN + RNN) |
| **Why fork?** | Adapt for non-piano instruments. Remove TF dependency. |
| **Why not fork?** | Project is inactive. TF dependency is heavy. Basic Pitch covers polyphonic transcription without the piano-specific training bias. |
| **Verdict** | **SKIP.** The PyTorch port exists but the real value (velocity) is now available from Basic Pitch. If we need piano-specific accuracy, use the **PyTorch port** as a subprocess, not a fork. Basic Pitch + velocity from the same model is simpler. |

---

## 9. MIDIfren

### 9.1 What It Is
Pipeline orchestrator for audio → MIDI processing. Wraps Demucs + Basic Pitch (and potentially other tools) into a unified pipeline: audio → source separation → transcription → MIDI output. Built as an "Audio Stem & MIDI Processor" (from GitHub search result).

**Note:** The repo (`alesolano/midifren`) returned 404 on deep fetch. Details are inferred from GitHub search snippets and tool description.

### 9.2 API Surface (Inferred)

| Layer | Interface | Details |
|-------|-----------|---------|
| **Pipeline config** | Config file (likely YAML/JSON) defining stages | Defines which models to chain together |
| **CLI** | `midifren config.yaml input.wav output.mid` | Runs the full pipeline |
| **Stages** | Input → Demucs separation → Basic Pitch transcription → MIDI assembly | Each stage can be swapped |

### 9.3 Input / Output

- **Input:** Audio file, pipeline configuration
- **Output:** MIDI file(s) — likely per-stem or merged
- **Pipeline concept:** `AudioFile → [SourceSeparation] → [Transcription] → [MIDI Export]`

### 9.4 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **Add our fleet as a stage** | If MIDIfren supports custom stages, we add a "fleet dispatch" stage that sends MIDI data to our agents | Unknown — depends on MIDIfren plugin API |
| **Use config to orchestrate** | Define pipeline: Demucs → BasicPitch → FleetWebSocket | Medium |
| **Wrap as subprocess** | Call `midifren` from our orchestrator, intercept output MIDI | Low |

### 9.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | The pipeline DAG definition + stage runner |
| **Why fork?** | MIDIfren already solved "chain Demucs → Basic Pitch". We extend it with our fleet dispatch. |
| **Why not fork?** | If MIDIfren supports plugins natively, we just write a plugin (our fleet stage). |
| **Verdict** | **INVESTIGATE FIRST.** If MIDIfren has a plugin system, write a fleet dispatch plugin. If not, **reimplement the pipeline config ourselves** — it's not complex (YAML in → sequential stage runner). Forking MIDIfren makes sense only if it's active, well-tested, and extensible. |

---

## 10. CMC (Creative MIDI Companion)

### 10.1 What It Is
A MIDI analysis + repair tool (McMaster University / McGill). Analyzes MIDI files for music theory correctness and suggests repairs. However, the direct McGill page returned 404, and the "CMC" acronym may also refer to other tools. In this context, it's described as "MIDI analysis + repair with music theory rules."

### 10.2 API Surface (Based on Description)

| Layer | Interface | Details |
|-------|-----------|---------|
| **Analysis engine** | Likely rule-based | Parses MIDI note events, applies rule set |
| **Rules** | Music theory rules: voice leading check, chord voicing, parallel 5ths/octaves, range checks, doubling rules | Standard theory pedagogy rules |
| **Output** | Report of issues + suggested repairs | Annotated MIDI or text report |

### 10.3 Integration Points with Our Pipeline

| Point | Feasibility | Effort |
|-------|-------------|--------|
| **Post-processing stage** | Take our generated lead-sheet MIDI → run through CMC analysis | Low (if CLI exists) |
| **Rule injection** | Add fleet-specific rules: "agent-A instrument range", "conversation-theory constraints" | High (requires understanding rule engine) |
| **Auto-repair** | Feed issues back to agent for re-generation | Medium |

**The value proposition:** CMC can be our "theory check" stage. After Basic Pitch/Omnizart produce a lead-sheet, CMC checks it for music theory violations. We can extend it with conversation-theory rules (e.g., "responses should stay within 8ve of call", "call-response gap max 2 beats").

### 10.5 Fork Boundary Analysis

| Question | Answer |
|----------|--------|
| **What would we fork?** | The rule engine and rule definitions |
| **Why fork?** | This is where we add **conversation-theory rules** — the unique value of our system. Rule engines are simple DAGs of predicates over note sequences. |
| **Why not fork?** | If CMC's rule engine is solid, write rules on top. |
| **Verdict** | **HIGH PRIORITY FORK** — but only the **rule definitions + engine**, not the analysis runtime. The conversation-theory rules are our IP. Build a small rule-based MIDI validator in Python (~500 lines) that implements: (1) standard theory checks, (2) conversation-theory rules (call/response patterns, gap constraints, register constraints). This is simpler and more proprietary than forking an existing tool. |

---

## 11. Priority Ranking Summary

### Fork Priority (which to take code from / deeply integrate)

| Rank | Tool | Strategy | Rationale |
|------|------|----------|-----------|
| **1** | **Basic Pitch** | Build a stage around it. **Don't fork the model.** | Already installed. Apache 2.0. Direct MIDI output. Best transcription for our pipeline. Wrap `predict()` as a pipeline stage. |
| **2** | **Demucs** | Fork the **inference wrapper** only. Keep model frozen. | Enables per-stem processing. Write a WebSocket service that streams separated audio to downstream agents without disk writes. |
| **3** | **CMC / Rule Engine** | Build our own rule-based validator inspired by CMC. | Conversation-theory rules are our IP. Don't fork CMC — implement a 500-line Python rule evaluator with standard music theory + custom conversation rules. |
| **4** | **MIDIfren** | Fork only if no plugin API exists. Otherwise, write a plugin. | Pipeline orchestration is easy to reimplement. Only fork if it provides substantial UI/DAG tooling. |
| **5** | **Essentia** | Do not fork. Call via Python import or subprocess. | AGPL license. PredominantMelody is good but Basic Pitch covers same ground with permissive license. |
| **6** | **Omnizart** | Call via CLI. Route output to agents. | MIT license, clean CLI. Use for multi-instrument transcription (vocal + music tracks). |
| **7** | **aubio** | Subprocess or pip import. | LGPL, stable, fast. Use for lightweight onset detection or as fallback. |
| **8** | **Vamp Plugins** | Use `vamp` Python module. | Plugin system is overkill for our needs. Individual algorithms are available as standalone tools. |
| **9** | **Pure Data** | Skip unless real-time pitch is needed. | `fiddle~` is good but CLI `aubiopitch` covers it without embedding a full visual patching runtime. |
| **10** | **Magenta OAF** | Skip. Use Basic Pitch instead. | Deprecated, TF dependency heavy. Basic Pitch matches or exceeds OAF quality for general transcription. |

### The "Call" List (DO NOT FORK — just use)

| Tool | How to Call | Notes |
|------|-------------|-------|
| aubio | `aubiopitch in.wav > out.txt` or `pip install aubio` | Lightweight, no license concerns |
| Vamp Plugins | `pip install vamp` | Wrapper SDK existed; use if a specific plugin has no standalone tool |
| Essentia | `pip install essentia` + PredominantMelody | AGPL — isolate in subprocess or container |
| Omnizart | `omnizart vocal transcribe in.wav`, `omnizart music transcribe in.wav` | MIT — safe to call directly |
| Magenta OAF | Skip entirely | Outdated |

### The "Build" List (what we write from scratch)

| Component | Approach | Est. Effort |
|-----------|----------|-------------|
| **Pipeline orchestrator** | Python DAG runner — YAML config → sequence of stages | 3-5 days |
| **Basic Pitch stage** | Wrap `basic_pitch.predict()` as pipeline step | 1 day |
| **Demucs service** | WebSocket wrapper for Demucs inference (GPU) | 1 week |
| **Rule engine** | Python note-validator with configurable rules | 3-5 days |
| **Lead-sheet merger** | MIDI track fusion (multi-stem → single lead-sheet) | 2-3 days |
| **Fleet dispatch** | Send processed MIDI chunks to agents via WebSocket | 3-5 days |

### Architectural Recommendation

```
Audio In
  │
  ├─→ Demucs ──→ [Vocals WAV] ──→ Basic Pitch ──→ [Vocal MIDI]
  │              ├─→ [Bass WAV]  ──→ Basic Pitch ──→ [Bass MIDI]
  │              ├─→ [Drums WAV] ──→ Omnizart   ──→ [Drum MIDI]
  │              └─→ [Other WAV] ──→ Omnizart   ──→ [Other MIDI]
  │                                              │
  │                                    ←── All MIDI ──→
  │                                              │
  │                                         Rule Engine
  │                                         (theory validation
  │                                          + conversation rules)
  │                                              │
  │                                         Lead-sheet Merger
  │                                              │
  │                                         Fleet WebSocket
  │                                              │
  │                                         Agent Dispatch
```

**Fork-critical items:** Only the **Rule Engine** (our IP) and **Demucs wrapper** (performance-critical pipeline integration) require taking code and deeply modifying. Everything else is called as-is.

---

*End of Full Audit Report*
