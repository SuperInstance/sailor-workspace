# Lead-Sheet-MIDI: The Tensor Conversation Format

A format and pipeline for decomposing podcasts, songs, and conversations into time-synced MIDI-like files, and algorithmically composing new ones.

---

## What Is Lead-Sheet-MIDI?

A lead sheet in music notation shows: melody (notes), chords (harmony), and lyrics (words). Lead-Sheet-MIDI applies this to conversation:

```
Lead Sheet       →        Lead-Sheet-MIDI
─────────────────────────────────────────────
Melody (notes)   →  Pitch contour (MIDI note track)
Chords (harmony) →  Ternary state (CC control track)
Lyrics (words)   →  Transcript (text track)
Dynamics         →  Energy/prosody (expression track)
Stage directions →  Dialogic role (SysEx/metadata track)
```

Each word in a conversation becomes a MIDI-like event with:
- **Pitch**: The prosodic contour (rising question, falling statement)
- **Velocity**: Energy/emphasis level
- **CC#74**: Ternary pitch (cutoff frequency = brightness)
- **CC#71**: Ternary volume (resonance = intensity)
- **CC#11**: Expression (energy contour)
- **Text**: The actual word as a lyrics meta-event
- **SysEx**: Speaker ID, dialogic role, stage directions

---

## The Format

```json
{
  "format": "lead-sheet-midi-v1",
  "bpm": 120,
  "ticks_per_beat": 480,
  "tracks": [
    {
      "name": "Transcript",
      "type": "text",
      "events": [
        {"time": 0.0, "word": "Welcome", "speaker": "alice"},
        {"time": 0.3, "word": "to", "speaker": "alice"}
      ]
    },
    {
      "name": "Pitch Contour",
      "type": "midi_notes",
      "events": [
        {"time": 0.0, "note": 66, "velocity": 90, "note_name": "F#4"},
        {"time": 0.3, "note": 65, "velocity": 84, "note_name": "F4"}
      ]
    },
    {
      "name": "Prosody CC",
      "type": "midi_cc",
      "events": [
        {"time": 0.0, "cc74": 64, "cc71": 64, "cc11": 90},
        {"time": 0.3, "cc74": 64, "cc71": 64, "cc11": 84}
      ]
    },
    {
      "name": "Stage Directions",
      "type": "sys_ex",
      "events": [
        {"time": 0.0, "role": 0, "speaker_id": 0},
        {"time": 2.4, "role": 1, "speaker_id": 0}  // Question!
      ]
    }
  ]
}
```

This is valid MIDI data. Any standard MIDI player can play the pitch contour track as notes. Any DAW can map the CC tracks to parameters. The text track is MIDI lyrics meta-events. The stage directions are SysEx.

---

## The Decomposition Pipeline

### Existing Tools (we don't rebuild these)

| Tool | What it does | Used for |
|------|-------------|----------|
| **Basic Pitch** (Spotify) | Audio → polyphonic MIDI | Song melody/harmony tracks |
| **Spleeter** (Deezer) | Audio → instrument stems (vocals, drums, bass, other) | Source separation |
| **Whisper / faster-whisper** | Audio → transcript with word timestamps | Transcript track |
| **pyannote.audio** | Audio → speaker diarization (who spoke when) | Speaker separation |
| **OpenSMILE** | Audio → 25 eGeMAPS prosody features | Prosody contour → MIDI CC |

### Our Pipeline (what we add)

```
Audio
  ├── Whisper ───→ word transcript + timestamps ───┐
  ├── pyannote ───→ speaker segments ──────────────┤
  ├── OpenSMILE ──→ prosody features ──────────────┤
  └── Basic Pitch → MIDI notes ────────────────────┤
                                                    ▼
                                          Lead-Sheet-MIDI
                                          (4-track MIDI file)
                                                    │
                                          ┌─────────┴──────────┐
                                          ▼                    ▼
                                    Ghost Track           Fleet Conductor
                                    (ternary CR)         (agent routing)
                                          │                    │
                                          ▼                    ▼
                                    Reharmonizer           16 agents
                                    (pivot table)          (analyze)
                                                              │
                                          ┌───────────────────┘
                                          ▼
                                    Composition Engine
                                    (Markov over ternary states)
                                          │
                                          ▼
                                    New Lead-Sheet-MIDI
                                    (synthesized conversation)
                                          │
                                          ▼
                                    Piper TTS
                                    (SSML from ternary vectors)
```

---

## The Graph: Visualizing Conversation Shape

The conversation graph shows three parallel tracks:

```
Alice pitch |--v-^^^^         --^^^^        -^^^      -^^^^    
Bob pitch   |       ----v----vv    --v--vv-v    --vv-vv   ----v

Alice energy|▓▓▒▒▓███         ▒▓████        ▓███      ▒▓███    
Bob energy  |       ▓▒▒▒░▓▒▒▒▒░    ▓▓▒▓▒▒░▒░    ▓▒▒░▓▒░   ▓▓▒▒░

Alice role  |-------?         -----?        ---?      ----?    
Bob role    |       ----.-----.    ------.-.    ---.--.   ----.
```

- **Pitch track** (`^` rising, `v` falling, `-` flat): Shows who is asking questions and who is answering. Alice's lines end with `^` (questions). Bob's end with `v` (falling certainty).
- **Energy track** (`█` bright, `▓` medium, `▒` low, `░` very low): Shows conversational intensity. Questions are higher energy. Statements taper.
- **Role track** (`?` question, `.` answer/statement, `-` continuation): Shows the dialogic arc. The pattern `---?` indicates a sentence building toward a question.

The shape of any conversation is visible at a glance: question/answer pairs, interruptions (rapid speaker switches), energy peaks (disagreement), energy valleys (reflection).

---

## The Invariant: Conversation Conservation

```
Σ(Δ_ternary) → 0 over a closed conversational gesture
```

Each speak-turn follows a ternary arc:
- **Question**: pitch starts flat (0), rises toward end (+1) → opens with energy
- **Statement**: pitch starts moderate (0), falls toward end (-1) → closes with certainty
- **Agreement**: energy follows the previous speaker's contour → harmonic alignment
- **Disagreement**: energy opposes the previous speaker → dissonance

A completed conversational exchange (question → answer, challenge → resolution) sums to zero in ternary space. When it doesn't, the reharmonization engine suggests alternative dialogic paths.

---

## Composition Engine

From 84 events of decomposed conversation, we learn a Markov chain over ternary states:

```python
state = (speaker_id, ternary_pitch, ternary_volume, ternary_timing)
transition = (next_state, word)

Key insight: states are TERNARY not SEMANTIC.
The composer reproduces prosodic DNA, not specific words.
```

A seed question state (`Alice, pitch=^, vol=L, timing=ahead`) transitions to an answer state (`Bob, pitch=v, vol=m, timing=behind`) with word "patterns" or "signals." The prosodic arc is preserved even when the words change.

Three generations from the same 84-event source produce different conversations:

| Generation 1 | Generation 2 | Generation 3 |
|-------------|-------------|-------------|
| Bob: The word | Alice: back | Alice: mapping |
| Bob: how | Bob: The | Alice: speak |
| Bob: prosodic | Bob: from | Bob: Think |
| Bob: patterns | Bob: MIDI | Bob: pitch |

Each has the same prosodic shape (question → answer → statement) but different words. The composer learned *how* we speak, not *what* we say.

---

## MIDI as CAM Instructions

MIDI is already used for more than music. CC messages control lighting, camera movements, pyrotechnics. SysEx carries vendor-specific data. We extend this to conversation:

| MIDI Type | Conversation Use | Example |
|-----------|-----------------|---------|
| Note On/Off | Prosodic pitch contour | Rising question = ascending notes |
| CC#74 (Cutoff) | Ternary pitch state | +1 = bright/rising, -1 = dark/falling |
| CC#71 (Resonance) | Ternary volume | +1 = loud/emphatic, -1 = soft/reflective |
| CC#11 (Expression) | Energy contour | 0-127 continuous |
| CC#10 (Pan) | Speaker position | 0 = left (Bob), 127 = right (Alice) |
| SysEx | Speaker ID + role | vendor=SIPR, data=[speaker_id, role, agreement] |
| Lyrics meta | Word-level transcript | Each word as a lyrics event |
| Marker meta | Topic boundaries | "New topic: AI Ethics" |

A lead-sheet-MIDI file can drive: lights (pan + CC), camera focus (speaker position), transcription display (lyrics), and audio synthesis (SSML from CC values) — all from a single synchronized format.

---

## Composition as Conversation

The composition engine produces new conversations by learning the prosodic transition matrix from decomposed source material. Because the states are ternary (not semantic), the engine reproduces *emotional arc* not *content*.

This enables:

1. **Style transfer**: Learn from a TED talk → apply to a casual conversation
2. **Mood modulation**: Change the ternary state distribution → different emotional tone
3. **Hybrid conversations**: Merge transition matrices from multiple sources
4. **Iterative refinement**: Compose → critique → recompose with adjusted parameters

---

## Next Steps

### Phase 1: Decomposition (done)
- [x] Lead-sheet-MIDI format specification
- [x] Synthetic podcast generation
- [x] Word-level prosody extraction + ternary classification
- [x] Conversation graphing (pitch, energy, role)
- [x] Markov composition with diversity

### Phase 2: Real Audio (ready)
- [ ] Install Basic Pitch on x86_64 (Codespaces) for audio→MIDI
- [ ] Integrate faster-whisper with word timestamps into pipeline
- [ ] Integrate pyannote.audio for speaker diarization
- [ ] Wire OpenSMILE prosody → per-word ternary vectors

### Phase 3: Composition (next)
- [ ] Piper TTS with SSML from ternary vectors
- [ ] Multi-source transition merging
- [ ] Interactive composition: edit ternary state, regenerate audio

### Phase 4: Cross-modal (future)
- [ ] Song → conversation prosody transfer
- [ ] Video → lead-sheet (facial expression + prosody)
- [ ] Real-time conversation analysis + feedback
