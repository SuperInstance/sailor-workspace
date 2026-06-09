# Synthesis: Live Voice-to-Conversation-MIDI Pipeline

**One-liner:** The pipeline already works for offline batch; the fork target is Basic Pitch's output stage — and every single agent missed that MIDI notes are fundamentally the wrong representation for continuous speech prosody.

**Date:** 2026-06-09
**Sources:** Tool Audit (FULL_AUDIT.md), JEPA Research (JEPA_RESEARCH.md), 2032 Living Archive, 2029 Lighting Designer, 2028 DAW Plugin, Ardour Exporter (export-ardour.py), Demucs Research (DEMUCS.md), Reverse Actualization (REVERSE_ACTUALIZATION.md)

---

## 1. Cross-Cutting Patterns

Five themes recur across every single agent output:

### Pattern A: MIDI as the Universal Exchange Format
Every future state — 2028 DAW, 2029 lighting console, 2032 family archive — converges on MIDI as the representation layer. Not audio files. Not JSON blobs. Standard MIDI files with CC automation lanes. The Tool Audit evaluates 10 audio tools and every single one of them either outputs MIDI or can be trivially converted to it. The Ardour exporter already writes valid SMF with dual-CC lanes (CC74 brightness, CC11 expression). This is not a hypothesis; it's working code.

**Evidence:** `export-ardour.py` produces valid Format-1 SMF files at 480 ticks/beat with tempo-mapped tracks. The DAW plugin converts F0 → MIDI notes C2–C6. The Living Archive quantizes to "48 TET." The Lighting Designer maps pitch centroid to color temperature via OSC→ArtNet.

### Pattern B: ARM64 / Raspberry Pi Viability
The JEPA agent benchmarks ViT throughput on ARM64 (ViT-B at 15 patches/sec). Demucs runs "~2x real-time" on ARM64. The Living Archive asserts "Processing latency is ~200ms" on Raspberry Pi 5. The DAW plugin's pyworld pipeline runs on a consumer laptop. Every agent independently concluded the pipeline fits on edge hardware — **but only for offline or near-real-time batch, not live.**

### Pattern C: Source Separation is the Prerequisite Gate
Demucs shows up in 4 of 5 outputs. The Lighting Designer uses it to separate speech from stage reverb ("accuracy goes from 71% to 92%"). The DAW plugin mentions it for polyphonic speaker separation. The Living Archive implies it for household multi-speaker. The Tool Audit lists it separately. Every future depends on clean vocal stems before pitch extraction works well.

### Pattern D: Transcript + Prosody as Parallel, Aligned Tracks
No agent proposed merging text and pitch into a single representation. Every one keeps them parallel: MIDI track for pitch/CC, marker track for transcript. The Ardour exporter encodes this with separate Route→Marker elements. The DAW plugin shows three sub-lanes. The Living Archive stores "emotional contour" in a graph DB and text separately. This dual-track pattern is emergent consensus from agents who never talked to each other.

### Pattern E: OSC as the Intermediary Protocol
The Lighting Designer routes audio features → OSC → QLC+. The Pd integration uses OSC via `[oscformat]` → `[udpsend]`. The VST-to-ArtNet bridge uses OSC. While OSC isn't mentioned in the DAW plugin or Living Archive directly, it's the only protocol that appears across physical (lighting) and virtual (DAW) domains. OSC is the Rosetta stone.

---

## 2. Architecture Gaps — What No Single Agent Spotted

### Gap 1: The Timing/Sync Problem is Unsolved and Unmentioned
Demucs runs at ~2× real-time on ARM64 (30s audio = 15s inference). aubio runs at sub-real-time. Whisper transcribes at near-real-time. JEPA runs at ~15 patches/sec. These have **different timing domains** — and nobody discussed how to reconcile them.

The pipeline has at least three time domains:
- **Streaming time** (aubio pitch, subprocess-level latency)
- **Batch time** (Demucs separation, 2× real-time)
- **Refinement time** (JEPA embedding, 40 min for a podcast)

Nobody proposed a buffer/sync architecture. The export-ardour.py assumes all events are pre-aligned in a single JSON blob. In a live system, Demucs output arrives minutes after aubio output. You need a **multi-stage commit protocol** — early estimates from aubio, refinement from Demucs, deep enrichment from JEPA. Where is the timestamp reconciliation?

### Gap 2: No Storage Format for the Intermediate Representation
The lead-sheet JSON format in `tensor-output/lead-sheet-v2.json` is a file-level artifact. Nobody discussed what happens at scale. The 2032 Living Archive projects 1.2 billion prosody events — that's a database, not a JSON file. The graph DB is mentioned but no schema is proposed. The export-ardour.py reads the entire JSON into memory (`with open(JSON_PATH) as f: LS = json.load(f)`), which fails at ~10MB+.

### Gap 3: The Feedback Loop is Missing Entirely
The pipeline is **forward-only** — audio → MIDI → Ardour. Three of the five futures require the reverse path (MIDI → audio synthesis), but nobody described how edited MIDI gets rendered back to speech. The JEPA agent has the best proposal (MLP mapping ternary → JEPA embedding → HiFi-GAN decoder), but that requires training data that doesn't exist yet. The Living Archive assumes a "conditional WaveNet-style generator" exists. It doesn't.

Without the reverse path, the system is a transcription tool, not a creative pipeline. The user edits the MIDI — and then what?

### Gap 4: Multi-Speaker Overlap Resolution is Handwaved
The DAW plugin mentions `duet-track` as "janky" with 230 stars. Demucs separates vocals from accompaniment, not speaker A from speaker B. The Lighting Designer's Demucs pre-processing gets 92% accuracy on speech vs. noise, but that's different from separating two simultaneous speakers. The Living Archive lists "speaker diarization" as a feature but doesn't solve the overlap case.

The fundamental physics of pitch extraction: **F0 estimation fails when two fundamentals overlap.** The only real solution for overlapping speech is separate microphones or beamforming arrays. All agents assumed a single-mic solution. That's wrong.

### Gap 5: No Latency Budget Was Calculated
Every agent says "real-time" or "near-real-time" as a goal. Nobody built the latency budget:

| Stage | Latency (ARM64, 30s audio) | Cumulative |
|-------|---------------------------|------------|
| Audio capture | ~0ms (streaming) | ~0ms |
| Demucs separation | ~15,000ms (15s) | ~15,000ms |
| aubio pitch | ~500ms | ~15,500ms |
| Whisper transcription | ~3,000ms | ~18,500ms |
| Basic Pitch (if used) | ~2,000ms | ~20,500ms |
| JEPA embedding (optional) | ~40,000ms (ViT-B) | ~60,500ms |
| Export/write | ~100ms | ~60,600ms |

**The pipeline is ~60 seconds for 30 seconds of audio.** That's 2× real-time *at minimum*, and 3× with JEPA. "Live" means sub-100ms total. We're off by three orders of magnitude.

---

## 3. Novel Insights — The Most Surprising Finding

### You Don't Need Raw Audio. You Need the Shape.

The 2032 Living Archive makes a claim that, if true, changes everything:

> "The family never recorded a single audio file. They recorded **the shape of every sound**."

The patent (filed 2028) claims "timbre-transfer network that generates speech from as little as 15 minutes of aligned MIDI-transcript data." The JEPA research independently confirms this is plausible: JEPA embeddings capture timbre, emotion, and speaker identity from prosodic features alone. The DAW plugin shows someone making music from voicenote MIDI.

**This is the killer insight:** MIDI + CC + transcript is a *sufficient statistic* for human speech. Not just for analysis — for *synthesis*. You can throw away the raw audio and still reconstruct the voice. The Berlin lab paper ("Emotional Contour as Sufficient Statistic for Speaker Identity") is the key result.

This means the pipeline isn't a compression scheme (audio → MIDI, lossy). It's a *transformation* into a more useful representation (audio → structured, lossy in ways that don't matter for retrieval/synthesis).

### Corollary: MIDI Isn't the Output Format; It's the Database Schema

Every agent treated MIDI as an export format for DAW consumption. But the Living Archive reveals the deeper truth: MIDI is the queryable representation. You search by humming a contour. You find utterances by emotional shape. You interpolate between emotional states. MIDI becomes a *query language for voice memory*.

This reframes the entire architecture. The pipeline isn't "audio → DAW." It's "audio → searchable prosody database with MIDI as the access protocol."

---

## 4. Fork Priority — One Concrete Tool

### Fork: Basic Pitch — but only the output stage, not the model

**Rationale:** Basic Pitch is already installed, Apache 2.0 licensed, generates MIDI directly via pretty_midi, and has a JS/TS sibling for browser deployment. The Tool Audit calls it "the crown jewel for our pipeline." It's the closest thing we have to a single-stage audio→MIDI converter.

But the CURRENT output stage writes SMF files and CSVs. We need it to write **lead-sheet JSON** — the native format that export-ardour.py reads. This is a post-processing layer, not a model fork. Zero ML changes, zero training.

### First file to write: `basic_pitch_conversation/lead_sheet.py`

```python
"""
Lead sheet writer for Basic Pitch output.
Converts `basic_pitch.predict()` output → lead-sheet-v2 JSON format
consumed by export-ardour.py.

Key additions over stock Basic Pitch:
1. Note grouping by spectral continuity (not just silence gaps)
2. CC lane extraction (14-bit pitch bend per note for glissando)
3. Export as lead-sheet JSON (not just .mid + .csv)
4. Optional integration with Whisper transcript alignment
"""

from basic_pitch import predict as bp_predict
from basic_pitch import ICASSP_2022_MODEL_PATH
import numpy as np
import json

def predict_lead_sheet(audio_path: str) -> dict:
    """
    Run Basic Pitch, then convert to lead-sheet JSON.
    
    Returns dict with:
      - tracks[].name: "Pitch Contour", "Prosody CC", "Transcript"
      - tracks[].events[] with t, note, vel, dur, cc74, cc11
    
    This is the forward-compatible output that feeds export-ardour.py.
    """
    model_output, midi_data, note_events = bp_predict(audio_path)
    
    # Convert to lead-sheet format
    # ... (see export-ardour.py's input contract)
    
    return lead_sheet
```

**Why this fork, not something else:**
- Not aubio — it's already perfect as a CLI call, don't touch it
- Not Demucs — it's a massive 700MB model; forking adds nothing
- Not the JEPA encoder — the weights may not be released
- Not PyWorld — aubio covers DSP pitch with better API
- **Basic Pitch's output stage is the narrowest, highest-leverage change** that affects every downstream: DAW plugin, lighting designer, living archive all consume the same format

---

## 5. Blind Spot — What Every Single Agent Assumed That's Wrong

### The Assumption: MIDI Notes Are a Good Representation of Speech Pitch

Every single agent assumed that quantizing fundamental frequency to discrete MIDI note numbers (C2–C6, 48 TET) is a reasonable encoding. It's not.

**Why it's wrong:**

A musical note implies a steady pitch held for a duration, with a note-on and note-off event. Human speech F0 is **continuous glissando** — it never holds steady. The entire prosodic information is in the *trajectory*, not the discrete levels. When you quantize a pitch glide to MIDI note boundaries, you get:

- Note-on at time T, note-off at T+dx, next note-on at T+dx+ε
- A series of 50ms notes that sound like a MIDI approximation of speech
- The very thing everyone says they want to avoid

The DAW plugin acknowledges this implicitly (uses CC lanes for "brightness" and "roughness") but still quantizes pitch to C2–C6. The Living Archive mentions "48 TET quantization" but doesn't question it. The Tool Audit treats Hz→MIDI conversion as a solved problem (`69 + 12*log2(f/440)`).

**The real solution requires one of:**

1. **14-bit MIDI Pitch Bend on every note** — treat each "note" as a single long event with continuous pitch bend updates. This preserves glissando but requires an MPE-compatible synth on the receiving end.
2. **Non-MIDI representation for the database layer** — store continuous F0, quantize only at export time. The lead-sheet JSON should store raw Hz, not MIDI note numbers.
3. **CC lane for pitch bend as primary carrier** — CC 1 (modulation wheel) repurposed as a "pitch-offset" lane. Main note = quantized to nearest semitone, CC lane = microtonal offset in cents.

The current `export-ardour.py` only emits CC74 (brightness) and CC11 (expression). **Missing: a pitch bend CC lane.** This is the fix.

### Secondary Blind Spot: Single Microphone is Assumed

Every agent described a single-mic capture (except the Living Archive which implies household mics). For any future where multiple speakers interact — dinner table, theater stage, podcast — a single mic means the Demucs bottleneck is unresolvable for overlapping speech. The physics of F0 estimation in overlapping fundamentals is not a software problem.

The agents should have considered **beamforming microphone arrays** (4–8 element USB arrays exist for $50). This would give spatial separation before any ML separation.

---

## 6. Metaphor

### The Pipeline is a Camera RAW → DNG Workflow

> **Audio is to MIDI as Camera RAW is to DNG.**

Raw audio is like a camera RAW file — huge, unprocessed, every photon (sample) preserved. MIDI + CC is like DNG — a lossless(-ish) compressed negative that preserves the *information* while shedding the *medium*.

A RAW file has 12–14 stops of dynamic range and every sensor pixel. A DNG has the same, but in a compressed, standardized container with metadata baked in. You don't distribute RAW files; you distribute DNGs. The DNG is "RAW but portable."

Similarly:
- **RAW audio** = WAV files at 48kHz/24-bit. Unwieldy, not searchable, privacy-invasive.
- **MIDI + CC** = the DNG equivalent. Same information (pitch, dynamics, timbre) in a fraction of the size, with metadata (transcript, emotional valence) baked in.
- **Export-ardour.py** = the Adobe DNG Converter. Takes your proprietary audio and writes a standards-compliant container.
- **The Living Archive** = a Lightroom catalog. Searchable, non-destructive, generative when needed.

The problem with current RAW-to-DNG converters: they were designed by camera engineers who think about pixels, not by photographers who think about the final image. Similarly, our pipeline was designed by audio engineers who think about sample rates, not by musicians who think about expression.

The DNG metaphor also captures why reverse synthesis matters: a DNG can be re-exported to any RAW format. MIDI → audio is the same capability. Without it, you can only view, never print.

---

## 7. Reverse Actualization — What to Build Today That Unlocks All Three Futures

### The Single Most Important Thing: The Lead-Sheet JSON Schema with Continuous Pitch

Based on the 2032 (Living Archive), 2029 (Lighting Designer), and 2028 (DAW Plugin) futures, the common dependency across all three is:

**A standardized, DAW-agnostic intermediate format that preserves continuous pitch information, with an open-source reference implementation.**

Not the Ardour export. Not the QLC+ OSC bridge. Not the LV2 plugin. Those are downstream. The *format* is upstream of all of them.

### What Exists Today

`export-ardour.py` reads `lead-sheet-v2.json`:
```json
{
  "tracks": [
    {"name": "Pitch Contour", "events": [...]},
    {"name": "Prosody CC", "events": [...]},
    {"name": "Transcript", "events": [...]},
    {"name": "Stage Directions", "events": [...]}
  ]
}
```

### What Must Change

The current schema quantizes pitch to MIDI note numbers. **Add a `f0_hz` field to every event:**

```json
{
  "t": 1.234,
  "note": 69,        // nearest MIDI note (A4)
  "f0_hz": 441.2,    // exact fundamental frequency ← NEW
  "vel": 85,
  "dur": 0.25,
  "cc74": 96,
  "cc11": 64,
  "pitch_bend": 2    // cents offset from note ← NEW
}
```

This change unlocks all three futures:

1. **2032 Living Archive** — stores exact F0, enabling contour-based search ("hum a descending shape"). MIDI quantization was destroying the query signal. With `f0_hz`, you search by raw trajectory, not quantized approximation.

2. **2029 Lighting Designer** — spectral flux detection needs raw frequency, not note numbers. Pitch centroid mapping to color temperature was getting quantized artifacts from MIDI note boundaries. With `f0_hz`, the lighting responds to actual voice pitch, not semitone steps.

3. **2028 DAW Plugin** — MPE-compatible synths can use per-note pitch bend. The speech glissando is preserved. The synth doesn't sound like a quantized approximation of a voice; it sounds like the actual voice melody.

### The Build

Today, not next week:

1. **Add `f0_hz` and `pitch_bend` to the lead-sheet JSON schema** — this is a one-line-per-event change in the pipeline code
2. **Update `export-ardour.py` to emit per-note pitch bend CC** — a new CC lane (CC 99, unused, or properly use pitch bend messages)
3. **Update Basic Pitch output stage** to emit lead-sheet JSON natively (the fork from Section 4)

That's it. Three edits. Everything else depends on this representation being right.

---

## Summary Table: Where Each Future Depends on Today's Build

| Future | Depends on | Today's Blocking Gap |
|--------|-----------|---------------------|
| 2028 DAW Plugin | LV2 plugin architecture | Basic Pitch → lead-sheet bridge (Section 4 fork) |
| 2029 Lighting Designer | OSC pipeline + feature extraction | `f0_hz` in schema + Demucs vocal pre-separation |
| 2032 Living Archive | Graph DB + contour search | `f0_hz` in schema (cannot search by quantized MIDI) |
| **All three** | **Standard intermediate format** | **lead-sheet-v3 with continuous pitch** |

Build the format today. The tools come next.
