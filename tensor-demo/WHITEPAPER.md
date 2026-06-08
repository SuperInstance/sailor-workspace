# Tensor MIDI — The Science of Decomposition & Composition

A framework for decomposing podcasts, songs, and conversations into time-synced ternary tensors, and algorithmically composing new ones.

---

## The Core Idea

Every conversation, podcast, and song has a latent structure — a time-synced tensor of prosodic, dialogic, and acoustic dimensions that encodes *how* the content is delivered, not just *what* the content is. We decompose audio into this tensor, learn the transition patterns, and compose new sequences from the learned grammar.

This is the audio equivalent of word vectors (word2vec/GloVe), but operating on **prosodic gestures** rather than semantic tokens.

```
Audio → [speaker_diarization] → per-speaker streams
     → [ASR + word timestamps] → word-aligned transcript
     → [OpenSMILE prosody] → 25 eGeMAPS features per frame
     → [ternary classification] → per-word ternary vectors
     → [tensor assembly] → time-synced multidimensional tensor
                                             ↓
                              [Markov / transformer] → transition model
                                             ↓
                              [composition engine] → new conversations
```

---

## The Tensor Format

```
tensor-midi-v1
├── time: float (seconds, synced to source audio)
├── speaker_id: int
├── word: str
├── prosody:
│   ├── ternary_pitch: -1 (falling) / 0 (flat) / +1 (rising)
│   ├── ternary_volume: -1 (soft) / 0 (medium) / +1 (loud)
│   ├── ternary_timing: -1 (behind) / 0 (on beat) / +1 (ahead)
│   └── ternary_breath: -1 (paused) / 0 (continuous) / +1 (gasps)
├── dialogic:
│   ├── ternary_role: -1 (answer) / 0 (continuation) / +1 (question)
│   ├── ternary_agreement: -1 (disagree) / 0 (neutral) / +1 (agree)
│   └── ternary_energy: -1 (low) / 0 (moderate) / +1 (high)
└── acoustic:
    ├── f0: float (fundamental frequency)
    ├── loudness: float (RMS energy)
    ├── formant_f1: float (first formant)
    ├── formant_f2: float (second formant)
    └── hnr: float (harmonics-to-noise ratio)
```

Each row in the tensor is one **time-synced event** — a word, a note, or a prosodic gesture. The full tensor is a multidimensional time series that captures the complete musical and conversational structure of the source.

---

## The Decomposition Pipeline

### Layer 1: Source Separation (for music / multi-instrument audio)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Audio File  │───→│   Spleeter   │───→│ Instrument Stems │
│ (MP3/WAV)    │    │ (Deezer)     │    │ vocals, drums,   │
└─────────────┘    └──────────────┘    │ bass, other      │
                                       └──────────────────┘
```

Spleeter separates mixed audio into 4 or 5 stems. Each stem becomes an independent analysis path.

### Layer 2: Speaker Diarization (for podcasts / conversations)

```
┌─────────────┐    ┌────────────────┐    ┌──────────────────┐
│  Audio File  │───→│ pyannote.audio │───→│ Speaker Tracks   │
│ (Podcast)    │    │ (diarization)  │    │ who spoke when   │
└─────────────┘    └────────────────┘    └──────────────────┘
```

Each speaker gets their own time-synced stream. Speaker transitions become tensor events with role markers.

### Layer 3: Speech-to-Text with Word Timestamps

```
┌──────────────────┐    ┌────────────────────┐    ┌───────────────────────┐
│  Speaker Track   │───→│  Whisper /          │───→│  Word-Aligned         │
│  (per speaker)   │    │  faster-whisper     │    │  Transcript           │
└──────────────────┘    │  word_timestamps=T  │    │  [word, start, end]   │
                        └────────────────────┘    └───────────────────────┘
```

Word-level timestamps align the transcript to audio frames with ~100ms precision. Each word becomes a tensor event.

### Layer 4: Prosody Extraction

```
┌──────────────────┐    ┌────────────────────┐    ┌───────────────────────┐
│  Audio + Words   │───→│  OpenSMILE Bridge   │───→│  Per-Word Prosody     │
│  (time-synced)   │    │  25 eGeMAPS features│    │  f0, loudness,       │
└──────────────────┘    └────────────────────┘    │  formants, jitter     │
                                                   └───────────────────────┘
```

Our existing OpenSMILE bridge (25 eGeMAPS features at ~100Hz) maps onto word-aligned tensors. Each word's prosodic features are aggregated into a ternary vector per dimension.

### Layer 5: Ternary Classification (the existing fleet)

```
┌────────────────────┐    ┌────────────────────┐    ┌───────────────────────┐
│  Per-Word Prosody  │───→│  Ghost Track        │───→│  Ternary Tensor       │
│  (acoustic)        │    │  T-0..T-4           │    │  + dialogic overlay  │
└────────────────────┘    │  accumulator        │    └───────────────────────┘
                          │  reharmonization    │
                          └────────────────────┘
```

The existing Ghost Track engine classifies prosodic contours into ternary (+1/0/-1). The dialogic dimensions (role, agreement, energy) are derived from inter-speaker patterns.

---

## The Invariant: Conversation Conservation

```
Σ(Δ_ternary) → 0 over a closed conversational gesture
```

This is the conservation law for conversation. A complete conversational gesture — question → answer, statement → agreement/disagreement, setup → punchline — sums to zero in ternary space.

| Gesture | Pitch Arc | Volume Arc | Agreement | Conservation |
|---------|-----------|------------|-----------|--------------|
| Question → Answer | +1 → -1 | +1 → 0 | 0 → ±1 | Σ = 0 (closed) |
| Statement → Challenge | 0 → +1 | 0 → +1 | 0 → -1 | Σ = 0 (closed) |
| Setup → Punchline | -1 → +1 | -1 → +1 | 0 → -1 | Σ = 0 (closed) |
| Disagreement → Resolution | +1 → -1 | +1 → -1 | -1 → +1 | Σ = 0 (closed) |

When the conservation law breaks — when a gesture doesn't close — the reharmonization engine fires, suggesting alternative dialogic paths. This is the conversational equivalent of harmonic reharmonization in music.

---

## From Decomposition to Composition

The science of decomposition teaches us how to compose. By learning the transition patterns in ternary space, we can generate new sequences that preserve the prosodic "DNA" of the source.

### Markov Model Over Ternary States

Each event in the tensor is a state: `(speaker_id, pitch_trit, volume_trit, timing_trit)`. Transitions between states form a Markov chain. Given a source conversation, we learn:

```
P(next_state | current_state) = count(current → next) / count(current)
```

This gives us a **prosodic grammar** — a model of how conversational energy flows from word to word, speaker to speaker.

### Composition Algorithm

```
1. Seed with a word + prosodic state
2. Query Markov chain for most likely next state
3. Retrieve the word associated with that transition
4. Apply the next state's prosody as SSML markup (pitch, rate, volume)
5. Synthesize through Piper TTS with the new prosody
6. Repeat until the conversation length is reached
7. Check for conservation: Σ(Δ_ternary) should trend toward 0
```

### What Makes It "Creative"?

The markov model doesn't reproduce the original conversation — it reproduces the **prosodic DNA**. Two conversations with the same prosodic grammar can have entirely different words but the same emotional arc.

This is the difference between copying a poem and learning its meter, rhyme scheme, and emotional structure. The words are semantic; the prosody is **musical**.

---

## Musical Decomposition (Songs)

For songs, the pipeline adapts:

```
Audio → Spleeter → [vocals, drums, bass, other]
                      │
                      ├── vocals → Whisper + OpenSMILE → ternary word tensor
                      ├── drums → Basic Pitch → MIDI → ternary rhythm tensor
                      ├── bass → Basic Pitch → MIDI → ternary harmonic tensor
                      └── other → Basic Pitch → MIDI → ternary texture tensor
```

Each instrument stem produces a **parallel tensor stream**. The streams compose into a layered 3D tensor — time × instrument × ternary dimension.

### Song Conservation

```
Σ(Δ_ternary_instrument) + Σ(Δ_ternary_vocals) = 0 (closed song)
```

For a complete song, the instrumental and vocal ternary arcs should sum to zero. A key change (+1 in harmony) must be balanced by a dynamic shift (-1 in intensity) or a register change.

---

## The Agentic Frontier

The 16 fleet-midi agents already map to conversational dimensions:

| Agent | Music Domain | Conversation Domain |
|-------|-------------|-------------------|
| chord | Chord quality | Agreement/disagreement quality |
| scale | Scale/mode | Conversational register (formal/casual) |
| tempo | BPM | Conversational pace |
| expression | Articulation | Emphasis intensity |
| dynamics | Volume contour | Energy arc |
| modulation | LFO rate | Emotion modulation |
| melody | Melodic contour | Argument contour |
| bass | Bass line | Foundational stance |

In conversation decomposition, each agent operates per speaker per word — analyzing not just "was this word spoken" but "how was it spoken" across the ternary dimensions.

---

## Architecture Integration

```
                          ┌──────────────────┐
                          │  tminus-dispatcher│
                          │  (cue scheduling) │
                          └────────┬─────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
     ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
     │ Ghost Track  │       │ Fleet       │       │ Piper TTS   │
     │ (prosody CR) │◄──────┤ Conductor   │──────►│ (composed   │
     │ (accumul’r)  │       │ (agent rtr) │       │  output)    │
     └──────┬──────┘       └──────┬──────┘       └─────────────┘
            │                      │
     ┌──────▼──────┐       ┌──────▼──────────────────────────┐
     │ OpenSMILE   │       │ 16 fleet-midi agents            │
     │ (prosody)   │       │ (chord..bass per speaker)       │
     └──────┬──────┘       └─────────────────────────────────┘
            │
     ┌──────▼──────┐
     │ ASR/Speaker  │
     │ Diarization  │
     │ (new)        │
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │ Source Audio │
     │(podcast/song)│
     └─────────────┘
```

---

## What This Enables

### 1. Podcast Decomposition
Feed a podcast episode → get per-speaker ternary tensor with word-level prosody. Analyze interruption patterns, energy arcs, agreement rates. Compare across episodes to track conversational evolution.

### 2. Song Analysis
Feed a song → get instrument-separated ternary tensors. See how the bass ternary vector relates to the vocal ternary vector. Find the song's conservation signatures.

### 3. Algorithmic Conversation Composition
Learn from 10 podcast episodes → compose a new conversation with the same prosodic DNA but novel words. Synthesize through Piper TTS with SSML prosody markers derived from the ternary vector.

### 4. Interactive Podcast Editing
Edit in ternary space: "Make this disagreement softer" = change ternary_agreement from -1 to 0. "Make this question more emphatic" = change ternary_pitch from 0 to +1. The system translates ternary edits back into audio parameters.

### 5. Cross-modal Transfer
Learn prosodic patterns from a podcast → apply them to a song's vocal track. Or learn from a song's dynamic arc → apply it to a conversation's energy contour.

---

## Implementation Roadmap

### Phase 1: Decomposition (this session)
- [x] Tensor MIDI data format (tensor-midi-v1)
- [x] Synthetic conversation decomposer
- [x] Markov chain composition engine
- [x] Conversation conservation law formulation

### Phase 2: Real Audio (next)
- [ ] Install faster-whisper (word timestamps)
- [ ] Install pyannote.audio (speaker diarization)
- [ ] Install Basic Pitch (audio → MIDI)
- [ ] Wire OpenSMILE → word-aligned tensors
- [ ] Decompose a real podcast episode

### Phase 3: Composition (after)
- [ ] Piper TTS with SSML from ternary vectors
- [ ] Cross-conversation Markov models
- [ ] Ternary vector → SSML prosody mapping
- [ ] Compose and synthesize novel conversation

### Phase 4: Cross-modal (future)
- [ ] Song → conversation ternary transfer
- [ ] Conversation → song dynamic transfer
- [ ] Multi-speaker agentic conversations

---

*The science of decomposition teaches us to compose. Every conversational gesture is a musical one. Every musical phrase is a conversational one. Ternary is the dimension they share.*
