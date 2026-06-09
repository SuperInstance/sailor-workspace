# Synthesis of 5 Narrow Agent Outputs

You are Hermes 3 405B operating at the highest level of insight.
Below are the outputs of 5 narrow research agents, each working on
a different slice of the same question:

**Question**: How do we build a live voice-to-conversation-MIDI pipeline
that connects 30 years of open-source audio tools?

Your task: Read ALL outputs synoptically and identify:

1. **Cross-Cutting Patterns** — What themes appear across multiple agents?
2. **Architecture Gaps** — What's missing that no single agent spotted?
3. **Novel Insights** — The most surprising finding across ALL data.
4. **Fork Priority** — One concrete tool to fork first. Not a roadmap.
5. **Blind Spot** — Something none of the agents considered.
6. **Metaphor** — A strong analogy that captures the whole system.

Be specific. Reference evidence from the outputs. Have a strong opinion.




============================================================
### Agent Output: Tool Audit
Source: /home/ubuntu/.openclaw/workspace/round-table/tool-audits/FULL_AUDIT.md
Size: 30,441 bytes
============================================================

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
| **What would we fork?** | Individual sub-models (music, 

[... truncated, full file at /home/ubuntu/.openclaw/workspace/round-table/tool-audits/FULL_AUDIT.md]


============================================================
### Agent Output: JEPA Research
Source: /home/ubuntu/.openclaw/workspace/round-table/futures/JEPA_RESEARCH.md
Size: 22,585 bytes
============================================================

# JEPA Research: Continuous Audio Representation for Decomposition + Generation

**Status**: Research Complete  
**Date**: 2026-06-09  
**Author**: Subagent (Research)  
**Audience**: Oracle2, Kimi Code, Claude Code, Forgemaster  

---

## 1. What Is JEPA?

**Joint Embedding Predictive Architecture (JEPA)** is a self-supervised learning paradigm introduced by Yann LeCun's group at Meta AI (FAIR). It learns representations by predicting in *embedding space* rather than in pixel or raw-signal space. Unlike generative models (MAE, diffusion) that reconstruct the input signal, JEPA uses an encoder to produce a latent representation of the input, then trains a predictor to estimate the representations of **masked or future regions** from **visible context** — all within the embedding manifold. The key insight: forcing the predictor to operate in abstract latent space prevents it from wasting capacity on pixel-level details and instead drives it toward **semantic** representations. JEPA has been demonstrated for images (I-JEPA, CVPR 2023) and video (V-JEPA, 2024), achieving strong performance on classification, object counting, and depth estimation with a frozen backbone trained purely on unlabeled data.

The architecture has three components: (1) an **encoder** (typically a Vision Transformer) that maps input into patch-level embeddings, (2) a **predictor** that takes visible context embeddings and predicts the embeddings of masked targets, and (3) a **target encoder** (EMA-updated from the encoder) that produces the ground-truth target embeddings for the loss. Crucially, the loss is computed in embedding space — typically a smooth L1 or cosine-similarity loss between predicted and target embeddings. This design naturally supports **multi-scale** and **multi-time-horizon** prediction: you can predict representations at different spatial/temporal granularities, each supervised by the corresponding target embeddings. The result is a representation that captures abstract, semantic properties of the signal rather than low-level reconstruction artifacts.

---

## 2. Audio JEPA: The Key Finding

### Audio-JEPA (Tuncay et al., ICME 2025 — arXiv:2507.02915)

**Audio-JEPA** is the first direct application of the JEPA paradigm to audio. It was published in June 2025 (just 1 year ago). Key facts:

| Property | Value |
|----------|-------|
| **Architecture** | Vision Transformer (ViT) on mel-spectrograms |
| **Input** | Mel-spectrogram patches (10s audio @ 32kHz) |
| **Masking** | Random patch masking (like I-JEPA) |
| **Training data** | Unlabeled AudioSet clips |
| **Evaluation** | X-ARES suite (speech, music, environmental sounds) |
| **Performance** | Comparable to wav2vec 2.0 and data2vec |
| **Data efficiency** | Uses < 1/5 training data of wav2vec 2.0 |
| **Code/weights** | "Will be released" (as of June 2025) |

**Critical implication**: Audio-JEPA proves the JEPA paradigm transfers to audio with a simple ViT backbone operating on spectrograms. This means our **pipeline can treat audio as a 2D image-like signal** (spectrogram) and use the same V-JEPA codebase with minimal modification.

### Why Not a Pretrained Audio JEPA Today?

The Audio-JEPA paper says code and checkpoints "will be released." As of June 2026, we should check if they're available. If not, the path is clear: **we can train our own** using the V-JEPA codebase on spectrograms.

---

## 3. How JEPA Applies to Our Audio Pipeline

### Current Pipeline

```
┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
│ Raw Audio│───►│ OpenSMILE│───►│ 25 eGeMAPS  │───►│  Ternary  │
│  (16kHz) │    │          │    │  features   │    │  States   │
└──────────┘    └──────────┘    └─────────────┘    └──────────┘
     │
     ▼
┌──────────┐    ┌──────────┐    ┌─────────────┐
│ Whisper  │───►│  Word    │───►│  Transcription │
│ (ASR)   │    │  tokens  │    │  + timestamps  │
└──────────┘    └──────────┘    └─────────────┘
```

**OpenSMILE + eGeMAPS**: 25 hand-crafted features per frame (pitch, jitter, shimmer, MFCCs, etc.). These are **discrete, pre-defined, finite**. They capture known acoustic correlates but miss anything not in the feature set.

**What JEPA Adds**: A **continuous embedding** of the entire audio scene — not just speech features. The embedding space (~384–1024 dims depending on ViT variant) captures:
- **Prosody**: Pitch contour, rhythm, emphasis
- **Timbre**: Voice quality, speaker identity, vocal texture
- **Emotional valence**: Aggressive, calm, excited, sad — not as labels but as continuous directions in embedding space
- **Acoustic scene**: Background noise, music, room acoustics
- **Temporal dynamics**: How the above evolve over time

---

## 4. Integration Architecture

### Recommendation: JEPA as COMPLEMENT, not replacement

```
                     ┌─────────────────────────────────┐
                     │         JEPA Encoder             │
                     │  (ViT on mel-spectrograms)       │
                     │  Output: continuous embedding    │
                     │  per time-step (patch-level)     │
                     └──────────┬──────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────┐
│                  Fusion Tensor                            │
│  ┌──────────────┐  ┌─────────┐  ┌────────────────┐      │
│  │ JEPA Embed   │  │ eGeMAPS │  │ Whisper Tokens │      │
│  │ (continuous) │  │ (25 feat)│  │ (discrete)    │      │
│  │  d=384-1024  │  │  d=25   │  │  d=vocab      │      │
│  └──────────────┘  └─────────┘  └────────────────┘      │
│              │          │              │                 │
│              ▼          ▼              ▼                 │
│         ┌───────────────────────────────────┐           │
│         │   Ghost Track — Ternary State      │           │
│         │   Transition (decomposed from      │           │
│         │   fused representation)            │           │
│         └───────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Why Complement, Not Replacement

| Criterion | OpenSMILE (eGeMAPS) | JEPA Embedding | Verdict |
|-----------|---------------------|----------------|---------|
| **Interpretability** | Each feature has a name | Black-box vector | Keep OpenSMILE |
| **Speed** | Real-time on CPU | Needs GPU | Keep OpenSMILE for real-time |
| **Prosody coverage** | 25 hand-picked features | Full spectral content | JEPA adds missing dims |
| **Emotion** | Jitter/shimmer correlates | Directional embedding | JEPA superior |
| **Speaker ID** | MFCCs approximate | Strongly encoded | JEPA superior |
| **Background/Scene** | Not captured | Captured | JEPA unique |
| **Decomposability** | Ternary-compatible | Partially analyzable | Hybrid approach |

### The OpenSMILE Trap: Why We Need JEPA

OpenSMILE's eGeMAPS features are **incomplete by design**. They capture the 25 most-studied acoustic correlates in the literature. But there are acoustic phenomena (vocal fry, breathy resonance, subtle emotional shifts, background interference) that fall through the cracks. JEPA's self-supervised embedding **doesn't have this blind spot** — if it's in the audio, it's in the embedding.

---

## 5. Analyzable vs. Holistic Dimensions

This is the core research question. A JEPA embedding of dimension d=768 (ViT-L) contains a mix of:

### Analyzable Dimensions (decomposable into ternary vectors)

Based on the I-JEPA/V-JEPA literature and the Audio-JEPA paper, we hypothesize these dimensions **can** be extracted:
- **Temporal position**: Embeddings near each other in time have correlated structure
- **Pitch/energy correlates**: Some dimensions consistently correlate with F0 and loudness (probe-able with a linear head)
- **Phonetic content**: Certain dimensions align with phonetic categories (place/manner of articulation)
- **Speaker identity**: Cluster structure in embedding space separates speakers

**Method to find them**: Train lightweight linear probes on labeled subsets (e.g., annotate 100 patches with "high energy / medium / low"). If a probe achieves >80% accuracy with a single embedding dimension → it's analyzable.

### Holistic Dimensions (best left as continuous signal)

These **resist** decomposition into discrete ternary states:
- **Emotional valence**: A "warm" voice vs a "cold" voice is a continuous blend, not a discrete state
- **Timbre/texture**: "Breathy" quality exists on a spectrum
- **Acoustic background**: Room reverb, ambient noise — ternary quantization destroys information
- **Prosodic contour**: The shape of a pitch glide matters more than its discrete level

### Recommendation: Dual Track

```
┌────────────┐    Analyzable Dims    ┌──────────────────┐
│  JEPA      │──────────────────────►│   Ternary State   │
│  Embedding │                       │   Decomposition   │
│  (768-dim) │                       └──────────────────┘
│            │
│            │    Holistic Dims      ┌──────────────────┐
│            │──────────────────────►│   Continuous CC   │
│            │                       │   Automation Track│
└────────────┘                       └──────────────────┘
```

This mirrors how DAWs handle expression: some parameters snap to grid (notes), others are continuous curves (modulation, aftertouch).

---

## 6. Generative Use: Rendering Intentions Into Outputs

This is the most exciting application. Here's the architecture:

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Ternary Target   │────►│ Embedding Decoder   │────►│ Waveform     │
│ State            │     │ (learned mapping    │     │ Generator    │
│ (from Ghost Track)    │  from ternary → JEPA │     │ (HiFi-GAN)   │
│                  │     │  embedding space)   │     │              │
└──────────────────┘     └─────────────────────┘     └──────────────┘
```

### How It Works

1. **During analysis**: JEPA encodes speech → we extract the embedding at each time-step
2. **We build a mapping**: `f: ternary_state → JEPA_embedding` using a lightweight neural network (MLP or small transformer)
3. **During generation**: Ghost Track produces a ternary target state → we use `f` to predict the corresponding JEPA embedding → we decode that embedding into audio using a vocoder or diffusion decoder

### Key Property: Continuous Interpolation

Because JEPA embeddings live in a continuous space, we can interpolate between states:

```
ternary: [1,0,0] (aggressive) ──┐
                                ├──► embedding = lerp(e_aggro, e_calm, α)
ternary: [0,0,1] (calm)      ──┘
```

Where `α` controls the blend. This enables **fine-grained emotional rendering** that discrete state machines cannot express.

### Relationship to Audio-JEPA's Decoder

The Audio-JEPA paper mentions training a **conditional diffusion model** to decode predicted embeddings back to mel-spectrograms (then to audio via Griffin-Lim or a neural vocoder). We would need:
- A **predictor → decoder** path (JEPA already has the predictor)
- A **diffusion decoder** or **HiFi-GAN** for waveform synthesis

---

## 7. What Changes When We Have Continuous Reading + Discrete Ternary

### Before JEPA
```
Audio ──► eGeMAPS ──► Ternary states ──► MIDI lead sheet
           (25 discrete features)
```

All expression must be quantized into ternary states. Nuance is lost.

### After JEPA
```
Audio ──► JEPA Embedding ──►┌─► Analyzable dims ─► Ternary states ──► MIDI lead sheet
              │             │
          Continuous        └─► Holistic dims ─────► CC automation tracks
           embedding                                    │
              │                                         ▼
              └───────────────────► Full embedding stored in MIDI meta-events
```

### Concrete Changes to Our Pipeline

1. **MIDI format expansion**: 
   - Standard note events (from ternary decomposition)  
   - `CONTROL CHANGE` lanes for continuous JEPA dimensions (emotional valence, timbre)
   - `SYSEX` or meta-events storing the raw embedding for perfect reconstruction

2. **Ghost Track enhancement**:
   - Currently: ternary transitions only
   - Enhanced: ternary transitions **plus** continuous guidance vectors from JEPA

3. **Real-time vs. Offline modes**:
   - Offline (podcast processing): Full JEPA encoding, full embedding saved
   - Real-time (live performance): OpenSMILE for instant features, JEPA for periodic refinement

4. **New probe training requirement**:
   - We need labeled data to train probes that identify analyzable dimensions
   - 1 hour of annotated podcast audio could be enough for a first pass

---

## 8. Practical Implementation on ARM64

### ARM64 Compatibility Assessment

| Component | ARM64 Status | Notes |
|-----------|-------------|-------|
| **V-JEPA codebase** (PyTorch) | ✅ Yes | Pure PyTorch, no CUDA dependency required |
| **ViT-L/16 (300M params)** | ⚠️ Runs but slow | ~4-8x slower than GPU; 300M params = ~1.2GB RAM |
| **ViT-H/16 (632M params)** | ⚠️ Heavy | ~2.5GB RAM, may need swap on 8GB devices |
| **Audio-JEPA (ViT-B/S)** | ✅ Best bet | Smaller variant likely 86-110M params |
| **PyTorch for ARM64** | ✅ Yes | Install via `pip3 install torch --index-url https://download.pytorch.org/whl/cpu` |
| **torchaudio** | ✅ Yes | For spectrogram extraction |
| **HiFi-GAN decoder** | ⚠️ Moderate | ~50M params, runs on ARM64 |

### Installation Path

```bash
# Step 1: PyTorch for ARM64
pip3 install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Step 2: Clone V-JEPA codebase
git clone https://github.com/facebookresearch/jepa.git
cd jepa

# Step 3: Download pretrained checkpoint (ViT-L for testing)
wget https://dl.fbaipublicfiles.com/jepa/vitl16/vitl16.pth.tar

# Step 4: Convert audio to spectrograms and run through V-JEPA
# (Adapt the video processing pipeline to accept 2D spectrograms)
```

### Expected Throughput on ARM64

| Setup | Throughput | Use Case |
|-------|-----------|----------|
| ViT-S/16 (22M params) | ~50 patches/sec | Real-time constrained |
| ViT-B/16 (86M params) | ~15 patches/sec | Near real-time |
| ViT-L/16 (300M params) | ~4 patches/sec | Offline batch |
| ViT-H/16 (632M params) | ~1-2 patches/sec | Research only on ARM64 |

For a podcast episode (60 min = 3600 sec), processing at 8 patches/second:
- ViT-S: ~12 min total
- ViT-B: ~40 min total
- ViT-L: ~15 hours (impractical on ARM64 alone)

**Recommendation**: Use ViT-B or ViT-S for ARM64, scale to GPU server for ViT-L/H.

---

## 9. Practical Next Steps

### Phase 0: Verify Audio-JEPA Checkpoints (Now)
- [ ] Check if Audio-JEPA weights are released (arXiv:2507.02915)
  - Watch https://github.com/..../audio-jepa (may have different repo name)
  - Alternative: Check HuggingFace for `audio-jepa` or `tuncay/audio-jepa`
- [ ] If not released, we can replicate using V-JEPA codebase on spectrograms

### Phase 1: Adapt V-JEPA to Spectrograms (Week 1-2)
- [ ] Install PyTorch + torchaudio on ARM64
- [ ] Clone facebookresearch/jepa 
- [ ] Write a spectrogram-to-video-frame adapter (treat mel-spectrogram as grayscale image)
- [ ] Run V-JEPA on 10-second podcast clips
- [ ] Visualize the embedding: PCA/UMAP projection + t-SNE on labeled segments
- [ ] **Graphing**: Plot embedding trajectories over time; color by eGeMAPS-derived ternary state to see structure

### Phase 2: Probe Training (Week 2-3)
- [ ] Extract JEPA embeddings for 100+ podcast 10-second clips
- [ ] Create ground-truth labels:
  - Ternary state (from Ghost Track / OpenSMILE)
  - Perceived emotion (self-annotate: calm/excited/aggressive/sad)
  - Speaker identity
- [ ] Train linear probes; identify analyzable vs. holistic dimensions
- [ ] Produce a **Dimension Map**: "Dimension 42 = correlates with energy, dimension 137 = correlates with breathiness"

### Phase 3: Embedding Storage (Week 3-4)
- [ ] Extend MIDI lead-sheet format to store JEPA embeddings:
  - Meta-events for full embedding per time-slice
  - CC automation lanes for top-K analyzable dimensions
- [ ] Verify MIDI file size is manageable (< 50MB for 1-hour podcast)
- [ ] Implement in the existing pipeline (round-table/futures/REVERSE_ACTUALIZATION.md)

### Phase 4: Generative Decoder (Month 2)
- [ ] Train MLP to map ternary state ↔ JEPA embedding
- [ ] Integrate lightweight vocoder (HiFi-GAN or MelGAN)
- [ ] Test: "Given ternary state [1,0,0] at time T, generate audio that sounds aggressive"
- [ ] Test: "Interpolate between [1,0,0] and [0,0,1] over 5 seconds → does emotion smoothly transition?"

### Phase 5: Fuse into Pipeline (Month 2-3)
- [ ] Add JEPA as optional "depth" track alongside OpenSMILE
- [ ] Implement cascading logic: use OpenSMILE for instant features, JEPA for refinement
- [ ] Benchmark accuracy: does JEPA-enhanced pipeline produce better ternary states?
- [ ] Write the "JEPA track" export to Ardour-compatible CC lanes

---

## 10. Model Sizes and Compute Budget

| Model | Params | RAM | ARM64 Speed | Disk (checkpoint) |
|-------|--------|-----|-------------|-------------------|
| ViT-T/16 | 5.7M | ~30MB | Very fast | ~23MB |
| ViT-S/16 | 22M | ~90MB | ~50 patches/s | ~88MB |
| ViT-B/16 | 86M | ~350MB | ~15 patches/s | ~344MB |
| ViT-L/16 | 307M | ~1.2GB | ~4 patches/s | ~1.2GB |
| ViT-H/16 | 632M | ~2.5GB | ~1-2 patches/s | ~2.5GB |

**ARM64 cutoff**: ViT-B (86M) is the sweet spot for our hardware. For production, ViT-L on GPU.

---

## 11. Open Questions (For Further Research)

1. **Audio-JEPA code release**: Has anyone replicated Audio-JEPA on GitHub since June 2025? Search for "audio-jepa" on GitHub.

2. **Temporal resolution**: How fine-grained are JEPA patch embeddings? V-JEPA uses 2x16x16 patches in video (2 frames × 16×16 pixels). For spectrograms, what's the equivalent? 1 patch = X ms of audio?

3. **EMA target update**: JEPA uses a momentum encoder (EMA of encoder weights) for the target. Does this slow training convergence on small datasets compared to simpler contrastive methods?

4. **VICReg alternative**: VICReg (Variance-Invariance-Covariance Regularization) is another LeCun-group method that explicitly decorrelates embedding dimensions. Could VICReg produce more "analyzable" dimensions (since it enforces covariance regularization)?

5. **Multi-granularity**: JEPA can predict at multiple scales simultaneously. Could we predict at the ternary-state granularity directly, bypassing the decomposition step?

---

## 12. Key References

- **I-JEPA**: Assran et al., "Self-Supervised Learning from Images with a Joint-Embedding Predictive Architecture," CVPR 2023. arXiv:2301.08243
- **V-JEPA**: Bardes et al., "Revisiting Feature Prediction for Learning Visual Representations from Video," 2024. 
  - Code: https://github.com/facebookresearch/jepa
- **Audio-JEPA**: Tuncay et al., "Joint-Embedding Predictive Architecture for Audio Representation Learning," ICME 2025. arXiv:2507.02915
- **VICReg**: Bardes et al., "VICReg: Variance-Invariance-Covariance Regularization for Self-Supervised Learning," ICLR 2022.
- **eGeMAPS**: Eyben et al., "The Geneva Minimalistic Acoustic Parameter Set (GeMAPS) for Voice Research and Affective Computing," IEEE Trans. Affective Computing, 2016.
- **X-ARES**: Darefsky et al., "X-ARES: A Cross-domain Audio Representation Evaluation Suite," 2024.

---

## 13. Summary Verdict

| Question | Answer |
|----------|--------|
| **Does JEPA work for audio?** | ✅ Yes — Audio-JEPA (2025) proves it. |
| **Pretrained checkpoint available?** | ⚠️ Promised but needs verification. Can self-train using V-JEPA codebase. |
| **ARM64 compatible?** | ✅ Yes — ViT-B (86M params) is the sweet spot. |
| **Replacement for OpenSMILE?** | ❌ No — OpenSMILE is faster and interpretable. |
| **Complement?** | ✅ Yes — JEPA fills the blind spots (timbre, emotion, scene). |
| **Analyzable dimensions exist?** | ✅ Yes — linear probing can identify them. |
| **Holistic dimensions worth keeping?** | ✅ Yes — emotion and timbre resist quantization. |
| **Generative rendering feasible?** | ✅ Yes — train MLP to map ternary ↔ JEPA embedding, decode with vocoder. |
| **Biggest win?** | Continuous emotion/timbre control that current discrete pipeline lacks. |

**Final recommendation**: Implement JEPA as a **complementary continuous embedding layer** that feeds both the ternary decomposition and the generative decoder. Build the ARM64 prototype with ViT-B. Migrate to GPU for production.



============================================================
### Agent Output: 2032 Living Archive
Source: /home/ubuntu/.openclaw/workspace/round-table/futures/2032-LIVING_ARCHIVE.md
Size: 6,719 bytes
============================================================

# 2032: The Living Archive — A Family's Conversational Lead Sheet

## The Future State

It's a rainy Sunday afternoon in 2032. Mei Lin, age 16, sits in her room with headphones on. She's working on a school project about her late grandfather, who died when she was six. She remembers the sound of his voice vaguely — a warm, gravelly baritone — but not the words. She doesn't need to remember.

She opens `archive.lin.family`, selects "Grandpa — select utterances by emotional contour," and hums a descending, uncertain melodic shape into her microphone. The system returns 43 matches. She picks the one from a dinner conversation on November 14, 2024 — the contour-match confidence is 94%. The system plays back a MIDI piano reduction of his voice's fundamental frequency overlaid on the family's automated piano accompaniment, and below it, a transcript. The conversation was about her, though she doesn't remember it. Her grandfather was worried she'd inherit his asthma.

Mei Lin hits "Simulate." She types: *"What would Grandpa say about my soccer game last week?"* The system generates a 45-second audio clip — his timbre, his cadence, his filler words, his laugh. It sounds exactly like him. Mom walks in. Her face goes pale. "That's impossible," she says. "He's been gone eight years."

It isn't impossible. It's the Living Archive.

Her parents started recording in 2024 after reading a paper about emotional-entropy encoding. They didn't record raw audio — that felt like surveillance. Instead, every spoken word in the house ran through a real-time pipeline: prosody → MIDI events → emotional-vector embedding. The raw words went to an encrypted log. The emotional contour went to a searchable graph database. The timbre model went to a conditional WaveNet-style generator. For ten years, the archive accumulated silently. By 2032, there are 1.2 billion prosody events, 400,000 distinct conversational scenes, and a generative voice model for each of five family members trained on over 3,000 hours of aligned MIDI-transcript data.

The family never recorded a single audio file. They recorded **the shape of every sound**.

## Evidence This Future Exists

1. **A published MIDI corpus** — ~10,000 family conversations, pitch-contour extracted, CC-mapped to emotional valence, timestamped, with transcripts. Available on Hugging Face. The paper (ICASSP 2031) shows that emotional-contour search retrieves the correct speaker's intended memory with 89% precision.

2. **A patent** — "System and method for generative voice reconstruction from prosodic MIDI embeddings" (USPTO #11-893-427, filed 2028, assigned to an indie research lab in Berlin). The patent claims a timbre-transfer network that generates speech from as little as 15 minutes of aligned MIDI-transcript data.

3. **A consumer device** — The Lin Family Archive Module. A $400 edge device that plugs into a home router. No cloud dependency. All processing on a custom NPU. Ships with five voice-model slots. Sold 50,000 units in its first year.

4. **A documentary** — "The Shape of Sound," premiered at Sundance 2031. Follows the Lin family as they build their archive over two years. The climax is the daughter hearing her grandfather's simulated voice. Critics call it "the most unsettling and beautiful film about memory since *Eternal Sunshine*."

5. **An ethics controversy** — The European Data Ethics Board publishes a 200-page ruling on "generative speech from prosodic archives" (2031). The ruling permits home use but bans the sale of voice models without the speaker's explicit, revocable consent. The Lin family is cited as the test case.

## The Reverse Timeline

### 2030–2032: Mass Adoption
- A startup makes an open-source version of the prosody→MIDI pipeline on GitHub (star count: 40,000).
- Grandma gets one for Christmas. The five-voice model limit is there for a reason — every family member gets a slot.
- The debate shifts from "should we do this" to "what happens when we die and our voice models live on."

### 2028–2030: The Generative Leap
- The Berlin lab solves timbre transfer from MIDI embeddings. Previous attempts required hours of raw audio. The breakthrough: they realize emotional-vector embeddings from MIDI prosody plus 15 minutes of transcript-aligned speech is *enough* for conditional generation.
- A paper titled "Emotional Contour as Sufficient Statistic for Speaker Identity" gets accepted at NeurIPS 2029. The community is split: some say it's a party trick, others say it's the most important result in speech synthesis since WaveNet.

### 2026–2028: From Research to Home
- The first home trials happen. Three families agree to run the pipeline for one year.
- The emotional-contour search interface is built. It's clunky — you have to sketch contours on a tablet — but it works.
- The key finding: families don't use it to spy on each other. They use it to remember. The most common query is "find the conversation where we were all laughing hardest."

### 2024–2026: The Core Pipeline
- The fundamental research is done. A team at a university in Copenhagen publishes the first paper: "Conversational Prosody as MIDI: A Real-Time Pipeline."
- The pipeline: microphone → pitch extraction (a forked version of PyWorld) → MIDI note mapping (fundamental frequency quantized to 48 TET) → CC lane generation (energy, spectral centroid, jitter, shimmer mapped to CC 1–4) → emotional embedding (a small transformer trained on the IEMOCAP dataset) → storage in a graph DB.
- The breakthrough insight: raw audio is not the right representation. Raw audio is *pixels*. MIDI + CC is *SVG*. You can search SVG. You can't search pixels.
- A home trial of the pipeline runs on a Raspberry Pi 5. Processing latency is ~200ms. It works.

### 2022–2024: The Preconditions
- World-level pitch extraction meets edge hardware. Whisper runs on a Pi. On-device speech processing becomes table stakes for any voice assistant.
- The idea of "emotional search" is nascent but real — people search Spotify playlists by mood, not by song title.
- A family records themselves at the dinner table for six months (raw audio). They never listen to it. The files are too big. They realize: *the problem isn't capture, it's retrieval.*
- The seed concept for the Living Archive is born: "What if we didn't record sound, but captured the *shape* of what was said?"

## Today We Build: A Raspberry Pi pipeline that captures family dinner conversations as MIDI + CC lanes, stores them in a local graph database, and offers a text-and-contour-search interface. No cloud. No raw audio retention. Just the shapes. Let 10 families run it for a year. See what they search for.



============================================================
### Agent Output: 2029 Lighting Designer
Source: /home/ubuntu/.openclaw/workspace/round-table/futures/2029-LIGHTING_DESIGNER.md
Size: 7,097 bytes
============================================================

# 2029: The Lighting Designer Who Doesn't Script — An Audio-Driven QLC+

## The Future State

It's April 2029. The dress rehearsal for *The Stranger* is over. The actors have left the stage. Sarah, the lighting designer, has one hour to build the cue sheet for opening night.

She doesn't open a script. She doesn't place fixtures manually. She opens her fork of QLC+ — *QLC+ Audio* — drops in the audio file from tonight's rehearsal (a stereo mix from a single room mic), and hits "Analyze."

The interface fills. Dimmer channels mapped to aggregate RMS energy with a rolling-window smoothing. Color temperature tied to the pitch centroid — warm amber where voices settle low, cold blue where they climb. Scene-change SysEx triggers extracted from stage-direction pauses: when the spectral flux drops below a threshold and holds for 0.8 seconds, the software inserts a scene change. When two speakers' pitch contours cross, it flags a dramatic moment and assigns it a chase sequence.

Sarah makes exactly three tweaks: nudges the color transition threshold down a few cents, overrides one scene-change trigger that mistook a long pause for a cue, and renames the QLC+ scenes from "Scene 1" to "The Arrest" and "Scene 2" to "The Interrogation." The whole process takes 17 minutes. The previous play she lit took three full days.

When opening night runs, she sits in the booth watching the dimmers move with the actors' voices. The lighting isn't automated in the traditional sense — it's *responsive*. The actors don't hit marks; the light follows the energy. The audience doesn't notice the lights. They feel them.

## Evidence This Future Exists

1. **A GitHub fork** — `mcf/QLCPlus-Audio` (LGPL-3.0), ~1,200 stars, 80 forks. The README starts with: "Drop audio. Get cues." Active since 2027. Four core contributors, none of whom are professional lighting designers — they're a music information retrieval researcher, two audio programmers, and a theater tech who learned QLC+ out of necessity.

2. **A case study** — Published in *Theatre Journal* (2028): "Automated Cue Extraction from Rehearsal Audio in QLC+." The study compares Sarah's 17-minute workflow against a manual cue-sheet build for the same play. Manual took 12.5 hours. Audio-driven cues required 11% manual correction. The author notes: "The result is not better than a great lighting designer. It is better than a rushed one."

3. **A conference talk** — LDI 2028, "Your Mic Is Your Script: Audio-to-Lighting in Production." The room is SRO. Attendees bring their own audio files. The live demo works on 4 out of 5 of them. The fifth fails because the recording has a limiter clipping the pitch variation — a lesson about audio quality that becomes a standard workflow note.

4. **A plugin** — A VST-to-ArtNet bridge that exists as a standalone project. Separate from QLC+ Audio but interoperable. It lets any audio that runs through a DAW control lighting fixtures in real time. The plugin is described as "chaotic" by early adopters but "creative" by the same people.

5. **A patent filing** — "System and method for extracting lighting cue parameters from mixed-audio rehearsal recordings" (priority date 2027, filed by a theater collective in Portland). The patent specifically claims the spectral-flux-to-scene-change mapping and the pitch-centric-to-color-temperature mapping. It won't be enforced. It exists to prevent someone else from enforcing it.

## The Reverse Timeline

### 2028–2029: Production Readiness
- The fork has been battle-tested in four productions across three cities. Bugs are being found — the spectral-flux threshold is too sensitive for plays with percussive door slams; pitch centroid tracking fails when the room mic captures too much stage reverb.
- The solution: a pre-processing stage that separates speech from ambient noise using a lightweight training-free separation model (Demucs 4 with a speech-stem heuristic). This becomes the default. Accuracy goes from 71% to 92%.
- Sarah publishes her case study. The theater tech community is skeptical but curious. A few more designers adopt it for previews and early rehearsals, then override manually for tech week. The workflow is *never* fully trust, always verify.

### 2026–2028: The Plugin and the Bridge
- The VST-to-ArtNet bridge is built by a GitHub contributor who got frustrated that QLC+ Audio could only process *files*. He wants live. His bridge lets Ableton Live control DMX fixtures. It's janky — latency varies wildly — but it proves the concept.
- The core team for QLC+ Audio formalizes. Four people. They use Open Sound Control (OSC) as the intermediate protocol: audio features go to OSC, OSC goes to QLC+. This means anyone can write audio→feature extractors and plug them in.
- The first production runs with QLC+ Audio: a fringe theater production in Oakland. The designer uses it for one scene only — the interrogation scene in *The Stranger*. It works. The audience doesn't know. The designer knows.

### 2024–2026: The First Prototype
- A theater tech at a university in the UK has an idea. She builds a Python script: load a WAV, extract RMS energy, map to OSC, pipe OSC to QLC+. It works for one fixture. She posts the code. No one uses it. But the idea sticks.
- A second person — the MIR researcher — finds the code. He extends it: pitch tracking (CREPE), spectral centroid, spectral flux. Three more parameters. He maps energy to dimmers, pitch centroid to color temperature, spectral flux to scene-change detection. The result is ugly but functional. He pushes it to GitHub: "working prototype, please don't laugh."
- 53 people laugh. 2 people contribute. One of them is the audio programmer. The other is the theater tech with the original Python script.

### 2022–2024: The Preconditions
- Music Information Retrieval (MIR) libraries have matured. `librosa` v0.10 has pitch tracking that works on speech. `pytorch-audio` models run on a laptop. The gap between audio analysis and lighting control has never been narrower.
- QLC+ already supports ArtNet, OSC, and DMX. It has a plugin architecture. It is open source (GPL). The only missing piece is the audio-to-parameter mapping.
- The COVID-19 era produced a generation of theater technicians who learned remote workflows. They are comfortable with automated tools. They are not precious about the script — they will try anything that saves time.
- A group of theater techs on a forum start a thread: "What if we could light from audio?" The thread is 47 posts long. Most of it is speculation about what would be possible. One post says: "I bet someone has already built this. Check GitHub." No one has. The thread ends. But someone reads it.

## Today We Build: A Python script that extracts RMS energy, pitch centroid, and spectral flux from a WAV file, maps them to OSC messages, and sends them to QLC+ to control a single dimmer fixture and a single RGB fixture. Share it on GitHub. Title it: "Audio-to-light prototype for theater folks." Let the first 100 people who download it tell us what's missing.



============================================================
### Agent Output: 2028 DAW Plugin
Source: /home/ubuntu/.openclaw/workspace/round-table/futures/2028-DAW_PLUGIN.md
Size: 7,728 bytes
============================================================

# 2028: The Conversation Track — A DAW Plugin for Speech as Music

## The Future State

It's February 2028. Marcus opens Ardour 9, creates a new session, and adds a track. But instead of selecting "Audio" or "MIDI," he selects a track type he's never seen before: **"Conversation."**

The track appears with three sub-lanes: a MIDI lane, an automation lane, and a marker lane. He arms the track, hits record, and speaks into his mic for 15 minutes — basically rambling about a script he's stuck on. When he stops and looks at the result:

- **MIDI lane**: A monophonic MIDI region showing the fundamental frequency of his voice mapped to note numbers C2–C6. Velocity mapped to loudness. CC 1 mapped to spectral centroid (brightness), CC 2 mapped to jitter (roughness), CC 3 mapped to shimmer (breathiness).

- **Automation lane**: A continuous energy envelope — volume envelope of the voice over time, smoothed. He can grab a node, pull it down, and it ducks the volume of the entire track. Automation is automation, whether it controls a synth filter or a human voice.

- **Marker lane**: A transcript — time-stamped, with speaker diarization (if others were in the room). Double-clicking a marker jumps playback to that line and highlights the corresponding MIDI notes. The markers show emotional labels too: "[uncertain]", "[emphatic]", "[laughing]".

Marcus drags a synth onto the MIDI lane. He plays back his own voice as a monophonic synthesizer. It sounds like a vocoder but cleaner — the pitch is accurate, the dynamics are there. He noodles. He finds a melody in his own frustrated rambling and turns it into the verse for a song he's been stuck on.

"Conversation Track" is a free, open-source LV2 plugin for Ardour. It is the most musical thing Marcus has installed in years. Because it doesn't pretend speech is *just* data. It treats speech as *already music* — you just can't hear it until someone removes the words.

## Evidence This Future Exists

1. **An LV2 plugin on GitHub** — `conversation-track.lv2` (GPL-3.0, ~1,900 stars). The repo includes the DSP library, an Ardour session template, and a paper documenting the design. The paper title: "Prosody as MIDI: Bridging Speech Analysis and DAW Workflows" (rejected from ISMIR 2027, accepted to the Linux Audio Conference 2028).

2. **A viral demo video** — A YouTube video titled "I turned my angry voicenote into a house track" (3.2M views). The creator shows: record a rant → drag a supersaw synth → play with filter cutoff → two hours of production. The comments are split between "this is brilliant" and "this is cheating."

3. **An Ardour 9 feature** — The Ardour team adds native support for "Speech Analysis" track types. The feature ships in Ardour 9.1 (2028). It is basically a wrapper around the Conversation Track LV2 plugin, but officially supported. The Ardour blog post says: "We didn't think we'd ship this. Our users asked for it. Here it is."

4. **A licensing deal** — An indie game studio licenses the plugin to procedurally generate music from NPC voice lines. They process 40,000 lines of dialogue through the plugin, extract the MIDI regions, and use them as input to a generative music system. The game ships in 2029. Critics praise its "emotional soundtrack that actually follows the actors' performances."

5. **A fork** — Someone forks the plugin and extends it to handle polyphonic speech (multiple speakers). It's janky — separate-pitch extraction per speaker is hard without a source separation model — but it works for 2 speakers with different timbres. The fork is called `duet-track`. It has 230 stars.

## The Reverse Timeline

### 2027–2028: The Ardour Integration
- The LV2 plugin exists and works. But the Ardour UX for it is baroque — you have to manually create three tracks, route audio to the plugin, and configure the outputs. Most users bail before it works.
- The author submits a patch to Ardour 9: "Support for speech analysis track type." The Ardour maintainers are initially skeptical. They accept it after a long thread. The patch adds: automatic track creation on "Conversation Track" selection, built-in connection routing, and a session template.
- The plugin ships as a built-in option in Ardour 9.1. The standalone plugin is still available for other LV2 hosts. Adoption jumps from ~200 users to ~5,000 in the first month.

### 2025–2027: The Plugin Matures
- The first version is an LV2 plugin that takes an audio input and writes MIDI to its output ports. It works in Ardour, Carla, and any LV2 host that supports multi-port output.
- The guts: `pyo3` bindings to Python for `pyworld` (pitch extraction) and `whisper` (transcription). The Python component does the heavy analysis. The C++ component handles real-time buffer interfacing. Latency is ~500ms — too slow for live monitoring, acceptable for post-recording processing.
- The author releases it. It gets ~200 stars. It is described as "a bit hacky" but "surprisingly useful." The three most common requests: (1) lower latency, (2) speaker diarization, (3) a GUI for the marker track.
- Someone writes a plugin for REAPER using the same architecture (JSFX). It's less polished but works. This proves the concept is DAW-agnostic.

### 2023–2025: The First Prototype
- An audio programmer at an independent label in Berlin is working on speech-to-synth experiments. They write a Python script: capture audio → pyworld F0 → convert to MIDI notes → output via `python-rtmidi` → drive a hardware synth. It works but it's not a plugin — it's a script with dependencies.
- They try to wrap it as an LV2 plugin. They fail. The LV2 API is hard. They publish the Python script on GitHub anyway: "conversation-track.py." 47 stars. Most comments are "make this a plugin."
- A second person — a Linux audio enthusiast — picks it up. They know LV2. They wrap the Python core in a C++ LV2 shell using `lv2-plugin` (a helper library). It compiles. It crashes. They debug. It compiles again. It works for 8 seconds, then glitches. They add a ring buffer. It works.
- The first working LV2 plugin has 3 outputs: MIDI pitch (mono), CC 1 (energy), and a text file (transcript). No marker track. No GUI. No documentation. It is the ugliest thing they have ever built. They push it to GitHub.

### 2022–2023: The Preconditions
- Ardour is the dominant open-source DAW. LV2 is its native plugin format. LV2 supports multi-port MIDI and CV outputs. The infrastructure for an audio-analysis plugin that outputs MIDI is already there — nobody has written it yet.
- `pyworld` and `crepe` offer pitch extraction that works on speech at low latency. `whisper` runs fast enough to transcribe on a consumer GPU. The technology stack is ready.
- A blogger writes a post: "Why can't I hook a pitch tracker up to my DAW and get MIDI from speech?" It gets 2,000 views. Someone in the comments mentions `pyworld`. Someone else mentions Ardour. A third person writes: "I bet I could build this." They bookmark it. They forget for a year.

- A conference talk at the Linux Audio Conference 2023: "Pitch Extraction in Real Time with LV2." The speaker demonstrates a simple plugin that extracts F0 from a guitar and outputs MIDI. The plugin is called `guitar2midi`. Someone in the audience asks: "Would this work on a voice?" The speaker says: "I don't know. Try it." Someone does.

## Today We Build: A Python script that records 60 seconds of speech, extracts F0 as MIDI notes, RMS as a CC lane, and a whisper transcript with timestamps. Output: a `.mid` file and a `.txt` file. Get it working on one laptop. Share it. Let people hear their own speech as MIDI for the first time. That's the demo. The plugin comes after.



============================================================
### Agent Output: Ardour Exporter
Source: /home/ubuntu/.openclaw/workspace/tensor-demo/export-ardour.py
Size: 14,667 bytes
============================================================

#!/usr/bin/env python3.10
"""
export-ardour.py — Create a proper Ardour session directory with:
  - Valid SMF (Standard MIDI File) files per speaker
  - Ardour .ardour session XML referencing them
  - Automation lanes (CC74, CC11) per track
  - Marker track with word-level transcript

Usage:
    python3.10 export-ardour.py
"""

import json, os, struct
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

# ─── Paths ──────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BASE, "..", "tensor-output")
JSON_PATH = os.path.join(OUTPUT, "lead-sheet-v2.json")
SESSION_DIR = os.path.join(OUTPUT, "ardour-session")
MIDI_DIR = os.path.join(SESSION_DIR, "midi")

os.makedirs(MIDI_DIR, exist_ok=True)

# ─── Load Data ──────────────────────────────────────────────────────
with open(JSON_PATH) as f:
    LS = json.load(f)

def get_track(name):
    for tr in LS["tracks"]:
        if tr["name"] == name:
            return tr["events"]
    return []

TRANSCRIPT = get_track("Transcript")
NOTES      = get_track("Pitch Contour")
CCS        = get_track("Prosody CC")
SYSX       = get_track("Stage Directions")

assert len(TRANSCRIPT) == len(NOTES) == len(CCS) == len(SYSX), \
    "All tracks must have same event count"

SPEAKER_NAMES = {0: "Alice", 1: "Bob"}
SPEAKER_LABELS = {0: "A", 1: "B"}
EVENT_COUNT = len(NOTES)
SAMPLE_RATE = 48000

# ─── Helper: delta-time encoding (variable length quantity) ────────
def _vlq(value):
    """Encode a 28-bit value as MIDI variable-length quantity."""
    if value < 0:
        value = 0
    if value > 0x0FFFFFFF:
        value = 0x0FFFFFFF
    parts = []
    parts.append(value & 0x7F)
    value >>= 7
    while value > 0:
        parts.append(0x80 | (value & 0x7F))
        value >>= 7
    parts.reverse()
    return bytes(parts)


# ─── Build SMF File ─────────────────────────────────────────────────
def make_smf(track_name, speaker_id):
    """
    Build a Standard MIDI File (format 1) for one speaker.
    Track 0: tempo map (120 BPM)
    Track 1: note events + CC automation
    """
    import mido
    from mido import MidiFile, MidiTrack, Message, MetaMessage

    mid = MidiFile(ticks_per_beat=480)
    mid.type = 1  # synchronous multi-track

    # ── Track 0: Tempo Map ──────────────────────────────────────
    tempo_map = MidiTrack()
    # Set tempo to 120 BPM
    tempo_map.append(MetaMessage('set_tempo', tempo=500000, time=0))
    # Time signature 4/4
    tempo_map.append(MetaMessage('time_signature',
                                  numerator=4, denominator=4,
                                  clocks_per_click=24,
                                  notated_32nd_notes_per_beat=8,
                                  time=0))
    # Track name
    tempo_map.append(MetaMessage('track_name', name='Tempo Map', time=0))
    # End of track
    tempo_map.append(MetaMessage('end_of_track', time=0))
    mid.tracks.append(tempo_map)

    # ── Track 1: Notes + CC ─────────────────────────────────────
    data_track = MidiTrack()
    data_track.append(MetaMessage('track_name',
                                   name=f'{track_name} Pitch', time=0))
    data_track.append(MetaMessage('instrument_name',
                                   name='Lead Sheet Prosody', time=0))
    # Default program: Acoustic Grand Piano (0)
    data_track.append(Message('program_change', program=0, time=0))

    # Convert time in seconds to MIDI ticks
    # 120 BPM = 500000 µs per beat = 0.5 s per beat
    # ticks_per_beat = 480 → 1 tick = 0.5/480 = ~1.0417 ms
    def sec_to_ticks(t):
        """Convert seconds to MIDI ticks at 120 BPM, 480 ticks/beat."""
        return int(round(t * 480 / 0.5))

    # Filter events for this speaker
    spk_indices = [i for i, sd in enumerate(SYSX)
                   if sd.get("speaker_id", 0) == speaker_id]

    if not spk_indices:
        data_track.append(MetaMessage('end_of_track', time=0))
        mid.tracks.append(data_track)
        # Write to file
        out_path = os.path.join(MIDI_DIR, f'{track_name}.mid')
        mid.save(out_path)
        return out_path

    # Find the last event time to add note-off
    last_time = max(NOTES[i]["t"] for i in spk_indices)
    # Add a bit of padding
    end_time = last_time + 0.5

    # We need to send events in chronological order.
    # For each event: Note On at t, Note Off at t+dur (dur = 0.25s default),
    # CC74 and CC11 at t.
    # Build a sorted event list
    events = []  # (ticks, type, data)

    for idx in spk_indices:
        note = NOTES[idx]
        cc = CCS[idx]
        t = note["t"]
        pitch = note["note"]
        vel = note["vel"]
        dur = note.get("dur", 0.25)  # default duration

        tick = sec_to_ticks(t)
        note_off_tick = sec_to_ticks(t + dur)
        cc74_val = cc.get("cc74", 64)
        cc11_val = cc.get("cc11", 64)

        # Clamp CC values to 0-127
        cc74_val = max(0, min(127, cc74_val))
        cc11_val = max(0, min(127, cc11_val))

        # CC74 (brightness / spectral content)
        events.append((tick, 'cc', 74, cc74_val))
        # CC11 (expression / dynamics)
        events.append((tick, 'cc', 11, cc11_val))
        # Note On
        events.append((tick, 'note_on', pitch, vel))
        # Note Off
        events.append((note_off_tick, 'note_off', pitch, 0))

    # Sort by tick, then by type priority
    type_order = {'cc': 0, 'note_on': 1, 'note_off': 2}
    events.sort(key=lambda e: (e[0], type_order.get(e[1], 0)))

    # Write events with delta times
    last_tick = 0
    for tick, etype, *args in events:
        delta = tick - last_tick
        last_tick = tick

        if etype == 'cc':
            data_track.append(Message('control_change',
                                       control=args[0], value=args[1],
                                       time=delta))
        elif etype == 'note_on':
            data_track.append(Message('note_on',
                                       note=args[0], velocity=args[1],
                                       time=delta))
        elif etype == 'note_off':
            data_track.append(Message('note_off',
                                       note=args[0], velocity=args[1],
                                       time=delta))

    # End of track
    data_track.append(MetaMessage('end_of_track', time=0))
    mid.tracks.append(data_track)

    # Write SMF file
    out_path = os.path.join(MIDI_DIR, f'{track_name}.mid')
    mid.save(out_path)
    return out_path


# ─── Build Ardour Session XML ───────────────────────────────────────
def prettify(elem):
    """Return pretty-printed XML string."""
    rough = tostring(elem, 'utf-8')
    parsed = minidom.parseString(rough)
    return parsed.toprettyxml(indent="  ")


def build_ardour_xml(alice_midi, bob_midi):
    """
    Build a proper Ardour session XML.
    Ardour session format (version 7000ish):
    <Session> → <Source> × N → <Region> × N → <Route> × N
    """
    session = Element("Session")
    session.set("version", "7000")
    session.set("name", "conversation-lead-sheet")
    session.set("sample-rate", str(SAMPLE_RATE))

    # ── Sources ────────────────────────────────────────────────
    alice_basename = os.path.basename(alice_midi)
    bob_basename = os.path.basename(bob_midi)

    src_a = SubElement(session, "Source")
    src_a.set("name", alice_basename)
    src_a.set("type", "midi")
    src_a.set("path", f"midi/{alice_basename}")
    src_a.set("id", "1")

    src_b = SubElement(session, "Source")
    src_b.set("name", bob_basename)
    src_b.set("type", "midi")
    src_b.set("path", f"midi/{bob_basename}")
    src_b.set("id", "2")

    # ── Regions ────────────────────────────────────────────────
    # Alice region covering the full session
    duration_sec = max(e["t"] for e in NOTES) + 0.5
    duration_samples = int(duration_sec * SAMPLE_RATE)

    reg_a = SubElement(session, "Region")
    reg_a.set("name", f"alice-prosody")
    reg_a.set("source-id", "1")
    reg_a.set("start", "0")
    reg_a.set("length", str(duration_samples))
    reg_a.set("position", "0")
    reg_a.set("layer", "0")

    reg_b = SubElement(session, "Region")
    reg_b.set("name", f"bob-prosody")
    reg_b.set("source-id", "2")
    reg_b.set("start", "0")
    reg_b.set("length", str(duration_samples))
    reg_b.set("position", "0")
    reg_b.set("layer", "0")

    # ── Routes (Tracks) ────────────────────────────────────────
    # We'll create each track as a Route with MIDI type

    for sid, reg_id, midi_file, label in [
        (0, "1", alice_midi, "Alice (Host) Pitch"),
        (1, "2", bob_midi, "Bob (Guest) Pitch"),
    ]:
        route = SubElement(session, "Route")
        route.set("name", label)
        route.set("default-type", "midi")
        route.set("id", f"route-{3 + sid}")

        # MIDI I/O: input and output
        io = SubElement(route, "IO")
        io.set("name", label)

        # Input port
        inp = SubElement(io, "Input")
        inp.set("type", "midi")
        port_a = SubElement(inp, "Port")
        port_a.set("name", f"{label}/midi_in")
        port_a.set("type", "midi")

        # Output port
        out = SubElement(io, "Output")
        out.set("type", "midi")
        port_b = SubElement(out, "Port")
        port_b.set("name", f"{label}/midi_out")
        port_b.set("type", "midi")

        # Region placement inside a playlist
        playlist = SubElement(route, "Playlist")
        playlist.set("type", "midi")
        playlist.set("name", label)

        # Reference the region
        rref = SubElement(playlist, "RegionReference")
        rref.set("region-name", f"alice-prosody" if sid == 0 else "bob-prosody")
        rref.set("position", "0")

        # ── Automation: CC74 and CC11 lanes ────────────────────
        for cc_num, cc_name in [(74, "Brightness"), (11, "Expression")]:
            auto_list = SubElement(route, "AutomationList")
            auto_list.set("parameter", f"cc{cc_num}")
            auto_list.set("interpolation", "linear")

            # Filter to this speaker
            spk_indices = [i for i, sd in enumerate(SYSX)
                           if sd.get("speaker_id", 0) == sid]

            for idx in spk_indices:
                cc = CCS[idx]
                t = cc["t"]
                val = cc.get(f"cc{cc_num}", 64)
                val = max(0, min(127, val))

                pt = SubElement(auto_list, "Point")
                pt.set("time", str(int(t * SAMPLE_RATE)))  # samples
                pt.set("value", f"{val / 127.0:.6f}")  # 0.0 - 1.0

        # Diskstream / processor chain with MIDI synth hint
        processor = SubElement(route, "Processor")
        processor.set("name", "MIDI Track")
        proc = SubElement(processor, "Redirect")
        proc.set("placement", "pre-fader")

    # ── Marker Track ─────────────────────────────────────────────
    marker_route = SubElement(session, "Route")
    marker_route.set("name", "Transcript")
    marker_route.set("default-type", "midi")
    marker_route.set("id", "route-markers")
    marker_route.set("marker-track", "yes")

    for i, ev in enumerate(TRANSCRIPT):
        t = int(ev["t"] * SAMPLE_RATE)  # sample position
        spk = ev.get("spk", "?")
        word = ev.get("word", "?")
        marker = SubElement(marker_route, "Marker")
        marker.set("time", str(t))
        marker.set("label", f"{spk}: {word}")

    return session


# ─── Main ───────────────────────────────────────────────────────────
def main():
    print("Ardour Session Exporter")
    print("=======================")
    print(f"Events: {EVENT_COUNT} ({sum(1 for s in SYSX if s['speaker_id']==0)} Alice, "
          f"{sum(1 for s in SYSX if s['speaker_id']==1)} Bob)")
    print()

    # 1. Generate SMF files
    print("Generating MIDI files...")
    alice_path = make_smf("pitch-alice", 0)
    bob_path = make_smf("pitch-bob", 1)
    alice_size = os.path.getsize(alice_path)
    bob_size = os.path.getsize(bob_path)
    print(f"  {alice_path} ({alice_size} bytes)")
    print(f"  {bob_path} ({bob_size} bytes)")

    # 2. Build Ardour session XML
    print("Generating Ardour session XML...")
    session_xml = build_ardour_xml(alice_path, bob_path)
    ardour_path = os.path.join(SESSION_DIR, "conversation.ardour")
    with open(ardour_path, "w") as f:
        f.write(prettify(session_xml))
    print(f"  {ardour_path} ({os.path.getsize(ardour_path)} bytes)")

    # 3. Verify MIDI files
    print()
    print("Verifying MIDI files...")
    import mido
    for path, label in [(alice_path, "Alice"), (bob_path, "Bob")]:
        mid = mido.MidiFile(path)
        print(f"  {label}: type={mid.type}, {len(mid.tracks)} tracks, "
              f"{mid.ticks_per_beat} ticks/beat")
        for i, track in enumerate(mid.tracks):
            notes = sum(1 for msg in track if msg.type == 'note_on' and msg.velocity > 0)
            ccs = sum(1 for msg in track if msg.type == 'control_change')
            print(f"    Track {i}: {len(track)} events ({notes} notes, {ccs} CCs)")

    print()
    print("Session directory:")
    for root, dirs, files in os.walk(SESSION_DIR):
        for fn in files:
            fp = os.path.join(root, fn)
            print(f"  {fp} ({os.path.getsize(fp)} bytes)")
    print()
    print("Done. Load the session in Ardour:")
    print(f"  File → Open → {SESSION_DIR}")
    print("Or double-click conversation.ardour")


if __name__ == "__main__":
    main()



============================================================
### Agent Output: Demucs Research
Source: /home/ubuntu/.openclaw/workspace/round-table/tool-audits/DEMUCS.md
Size: 5,433 bytes
============================================================

# Demucs Integration — Research Report

**Status**: ✅ Demucs 4.0.1 installed and verified on ARM64
**Repo**: github.com/facebookresearch/demucs (MIT License)
**Author**: Meta AI / Alexandre Défossez

## API Surface

```python
from demucs import separate
from demucs.pretrained import get_model

# Run full separation pipeline (CLI equivalent)
separate.main(["--two-stems", "vocals", "--out", "separation-output", "input.wav"])

# Or use lower-level API:
model = get_model(name="htdemucs")
audio, sr = separate.load_track("input.wav", model.audio_channels, model.samplerate)
# Apply model to get separated sources
sources = model.apply(audio)
# sources shape: [n_sources, n_samples]
# For htdemucs: 4 sources indexed: 0=drums, 1=bass, 2=other, 3=vocals
separate.save_audio(sources[3], "vocals.wav", sr)  # Save vocals stem
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `get_model(name="htdemucs")` | Load pretrained model (htdemucs, htdemucs_ft, htdemucs_6s) |
| `load_track(path, channels, samplerate)` | Load & resample audio file |
| `apply_model(model, tensor)` | Apply model to audio tensor |
| `save_audio(tensor, path, sr)` | Save source as 44.1kHz WAV |

## Output Format

Demucs returns a `torch.Tensor` of shape `[n_sources, n_samples]`.

For **htdemucs** (default 4-stem model):
| Index | Stem | Sample Rate |
|-------|------|-------------|
| 0 | drums | 44100 Hz |
| 1 | bass | 44100 Hz |
| 2 | other | 44100 Hz |
| 3 | vocals | 44100 Hz |

For **htdemucs_6s** (6-stem model):
| Index | Stem |
|-------|------|
| 0 | drums |
| 1 | bass |
| 2 | other |
| 3 | vocals |
| 4 | guitar |
| 5 | piano |

Each stem is a stereo (2-channel) float32 tensor at 44.1kHz.

## ARM64 Status

**✅ Working on ARM64**

Demucs 4.0.1 installs and runs on ARM64 via pip:
```
pip3.10 install demucs
```

Dependencies:
- PyTorch (ARM64 via pip)
- torchaudio
- einops, julius, lameenc, openunmix

Model size: htdemucs ~700MB (downloaded on first use, cached at ~/.cache/torch/hub/)
Inference time (ARM64, 4 cores):
- 30s audio → ~15s inference (~2x real-time)
- 3min audio → ~90s inference (~0.5x real-time)

**GPU strongly recommended** for real-time use. On ARM64 CPU, only practical for offline batch processing.

## Pipeline Integration

The proposed integration for conversation-to-MIDI:

```
Raw Audio
    │
    ▼
┌──────────┐
│  Demucs  │ ← Separates vocals from accompaniment
└────┬─────┘
     │
     ├── vocals ──► Piper TTS ──► Lead-sheet-MIDI
     │                          (pitch contour, CC, transcript)
     │
     ├── drums  ──► Separate agent track (rhythm CC)
     ├── bass   ──► Separate agent track (low-frequency contour)
     └── other  ──► Separate agent track (harmonic context)
```

### Multi-Track Strategy

For conversation recording (not music), the primary stem is **vocals**.
Drums/bass/other are usually noise in this use case.

But for **Lead-sheet-MIDI → music generation**, all 4 stems matter:
1. Vocals → conversation pitch contour + transcript
2. Bass → root note anchor in MIDI
3. Drums → rhythmic grid / tempo reference
4. Other → harmonic atmosphere → CC automation curves

### WebSocket Service (Future)

Build `demucs-service/` on a GPU node:
- Accepts audio via HTTP POST multipart or streaming WebSocket
- Returns 4+ stems as WAV bytes or file paths
- Timeout: ~2x audio duration on CPU, ~0.3x on GPU
- Port: :8771

## Sample Code

```python
"""Simple Demucs integration: separate vocals → route to lead-sheet."""

from demucs import separate
from demucs.pretrained import get_model
import torch
import torchaudio
import tempfile
import os
import json
import sys


def separate_vocals(input_path: str, output_dir: str) -> str:
    """Separate vocals from audio file, return path to vocals WAV."""
    model = get_model(name="htdemucs")
    model.eval()
    if torch.cuda.is_available():
        model.cuda()

    # Load and resample
    wav, sr = separate.load_track(
        input_path,
        model.audio_channels,
        model.samplerate
    )

    # Add batch dimension: [1, channels, samples]
    wav = wav.unsqueeze(0)
    if torch.cuda.is_available():
        wav = wav.cuda()

    # Separate
    with torch.no_grad():
        sources = model(wav)  # [1, 4, channels, samples]

    # Extract vocals (index 3)
    vocals = sources[0, 3]  # [channels, samples]

    # Save
    os.makedirs(output_dir, exist_ok=True)
    vocals_path = os.path.join(output_dir, "vocals.wav")
    torchaudio.save(vocals_path, vocals.cpu(), model.samplerate)
    return vocals_path


# Usage
if __name__ == "__main__":
    if len(sys.argv) > 1:
        vocals = separate_vocals(sys.argv[1], "stems-output")
        print(json.dumps({"vocals_path": vocals, "stems": ["vocals"]}))
```

## Recommendations

1. **Priority for conversation**: Only need vocals stem (index 3). The other stems can be ignored unless doing music production.
2. **Offline only on ARM64**: ~2x real-time on CPU. For live, need GPU.
3. **Cache the model**: htdemucs downloads once (~700MB) and caches forever.
4. **Audio format**: Input any format torchaudio supports (WAV, MP3, FLAC, M4A). Output is always 44.1kHz WAV.
5. **Chaining**: Demucs→Basic Pitch for music transcription, Demucs→Whisper for conversation transcription, Demucs→OpenSMILE for prosodic extraction.
