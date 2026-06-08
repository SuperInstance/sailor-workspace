# Fork Strategy — Building on Existing Open Source Tools

Our lead-sheet-MIDI pipeline produces 6 open-source project formats from a single 86-event conversation decomposition. This is the fork strategy: don't rebuild the frontend, inject our pipeline into tools people already know.

---

## The Fork Principle

```
Our Pipeline → Lead-Sheet-MIDI → [[Tool Project Format]] → User Opens in Tool
```

Each tool's project format is XML-based and scriptable. We generate native project files from our lead-sheet data. The user opens them in their tool of choice — no new UI to learn.

---

## Tool Coverage

| Tool | Format | Our Injection Point | People Know It For |
|------|--------|-------------------|--------------------|
| **Ardour** | `.ardour` (XML) + MIDI regions | Marker track for transcript, automation lanes for CC, MIDI regions for pitch | Professional DAW, multitrack recording |
| **QLC+** | `.qxw` (XML) | Fixtures per speaker, scenes per word, chaser for full conversation | DMX lighting, stage automation |
| **MuseScore** | `.musicxml` | Notes on staff for pitch contour, lyrics under notes for transcript | Sheet music notation, composition |
| **LMMS** | `.mmp` (XML) | MIDI tracks with patterns, automation clips | Music production, beat making |
| **Zrythm** | `.zrythm` / JSON | MIDI regions with notes, CV automation | Modular DAW, CV/gate interconnect |
| **FluidSynth** | `.mid` (Standard MIDI) | Direct playback of any lead-sheet | Software synthesis, headless rendering |

---

## How Each Tool Maps

### QLC+ — Conversation as Lighting Cue Sheet

QLC+ already controls DMX lighting from MIDI. Our conversation lighting project (`conversation-lighting.qxw`) maps:

```
Speaker Fixture → Alice (dimmer) and Bob (separate dimmer)
Conversation Event → Scene with fixture values (pitch→brightness, energy→intensity)
Full Conversation → Chaser sequencing 86 scenes over time
```

Each word becomes a lighting cue. Pitch contour drives dimmer level. Energy drives strobe rate. The stage direction SysEx → scene activation.

**This is MIDI as CAM — our stage directions ARE the lighting cue sheet.**

### Ardour — Conversation as DAW Session

Ardour sessions have tracks, regions, automation, and markers. Our session (`conversation-daw.ardour`) maps:

```
Pitch Contour → MIDI track (notes on piano roll, playable as instrument)
Prosody CC → Automation lanes (CC curves over time)
Transcript → Marker track (word labels at exact timestamps)
```

A user opens this in Ardour and sees:
- A piano roll with the prosodic contour
- Automatable CC lanes for the conversational energy
- Markers showing each word at its timestamp

### MuseScore — Conversation as Sheet Music

MusicXML renders our pitch contour as standard notation with lyrics:

```
Pitch Contour → Notes on staff (one part per speaker)
Transcript → Lyrics under notes (word-aligned)
Prosody → Dynamics markings (p, mf, f based on energy)
```

A musician can read the "melody" of the conversation and sing along with the lyrics.

### LMMS — Conversation as Beat Patterns

LMMS treats our events as MIDI patterns in a timeline:

```
Pitch Contour → Piano roll pattern per speaker
Timing → Groove quantization on the beat grid
CC → Automation editor curves
```

### Zrythm — Conversation as Modular Patches

Zrythm's CV ports connect to our automation data:

```
Pitch CV → Control voltage creates pitch contour
Energy CV → Modulation source for synth parameters
Timing → Clock divider decides groove feel
```

---

## The Fork Enhancement Strategy

### Immediate (our pipeline → existing formats)

| Task | Tool | What We Ship |
|------|------|-------------|
| Generate lighting cues | QLC+ | `conversation-lighting.qxw` |
| Generate DAW session | Ardour | `conversation-daw.ardour` |
| Generate sheet music | MuseScore | `conversation-score.musicxml` |
| Generate beat project | LMMS | `conversation-lmms.mmp` |
| Generate modular patch | Zrythm | `conversation-zrythm.json` |
| Render audio | FluidSynth | `lead-sheet.mid` → `.wav` |

### Phase 2 (fork and extend)

| Tool | Fork Extension |
|------|---------------|
| **Ardour** | Add "conversation view" — stacked marker + CC + MIDI display specific to lead-sheets |
| **QLC+** | Add "ternary color engine" — auto-map ternary vectors to RGB fixtures |
| **MuseScore** | Add "prosody playback" — CC data drives expressive playback tempo/dynamics |

### Phase 3 (our pipeline as plugin)

Build a **lead-sheet-MIDI plugin** for each tool that:
1. Monitors an audio input (mic) in real-time
2. Runs Whisper + OpenSMILE → Live transcription with prosody
3. Injects live events into the DAW/notation/lighting project
4. Records the conversation as a lead-sheet

---

## The Bigger Picture

MIDI already controls:
- Music (notes, CC, pitch bend)
- Lighting (DMX via MIDI Show Control)
- Video (MIDI Machine Control)
- Pyrotechnics (MIDI Show Control)
- Cameras (pan/tilt/zoom via CC)

Our lead-sheet-MIDI format adds the missing dimension: **conversation**. The same infrastructure that drives a laser show and a synthesizer now drives transcript display, speaker identification, and prosodic visualization.

A single `.mid` file can:
1. Play the pitch contour as music (FluidSynth)
2. Drive stage lighting through the conversation (QLC+)
3. Show sheet music with lyrics (MuseScore)
4. Animate a DAW piano roll (Ardour)
5. Script a camera sequence from stage directions
6. Flash a teleprompter at word timestamps

**This isn't building from scratch. It's connecting existing MIDI infrastructure to conversation as a first-class MIDI dimension.**
