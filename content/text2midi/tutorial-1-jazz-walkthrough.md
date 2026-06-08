# 🎹 Tutorial: Text-to-MIDI — Jazz Piano Vamp

> *Turning natural language into playable MIDI, one prompt at a time.*

## What We're Building

A jazz piano vamp in Cmaj7 with a walking bassline. This is the classic jazz combo sound — a right-hand chordal vamp over a left-hand walking bass that outlines the harmony.

## The Prompt

```
"Jazz piano vamp in Cmaj7 with walking bass, 4 bars, 120bpm"
```

## What Happens Under the Hood

1. **music21 parses the prompt** — it understands music theory terms like "Cmaj7", "walking bass", "4 bars", "120bpm"
2. **A 3-track MIDI score is built**: piano chords, bass line, and a rhythm guide track
3. **The MIDI is rendered** to Standard MIDI Format 1 at 1/10080 ticks per quarter

### Run It Yourself

```bash
node lib/engine.js "Jazz piano vamp in Cmaj7 with walking bass, 4 bars, 120bpm"
```

## The Output

| Metric | Value |
|--------|-------|
| MIDI format | Standard MIDI 1 (3 tracks) |
| Note count | 72 |
| REMI tokens | 83 |
| Key | C major |
| Tempo | 120 BPM |
| File size | ~424 bytes |

## The Token Sequence

```
H:3:72 → 3 tracks, 72 notes
T:120 → tempo
K:C → key signature
S:4/4 → time signature
E:0 → track 0 (piano)
N:60:90:10080 → note C4, velocity 90, 1 beat
N:64:90:10080 → note E4, velocity 90
N:67:90:10080 → note G4, velocity 90
... 72 more notes, all encoded as N: and F: tokens
```

## How This Connects to the Fleet

This MIDI file doesn't just sit on disk — it enters the fleet through the **I2I bottle protocol**:

```
text2midi engine → MIDI file → REMI tokenizer → I2I bottle → fleet harbor
```

Any ensign agent (Rhythmica on tidalcycles, Harmonia on musiclang, Glyph on tokenizer) can pick up this bottle, analyze the MIDI, extract patterns, generate variations, or route it to Sonic Pi for live playback.

**Rhapsodia** (the ensign of this repo) speaks directly in musical notation. When you summon her via `/ensign rhapsodia generate "jazz piano in Cmaj7"`, she produces an I2I bottle addressed to the whole fleet.

## Reproduce

```bash
# One-liner
node lib/engine.js "Jazz piano vamp in Cmaj7 with walking bass, 4 bars, 120bpm"

# Use the server
curl -X POST localhost:3001/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Jazz piano vamp in Cmaj7 with walking bass, 4 bars, 120bpm"}'
```
