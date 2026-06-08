# 🎹 fleet-midi-text2midi — Tutorial Collection

## Tutorial 1: Jazz Piano Vamp (Featured)
See `tutorial-1-jazz-walkthrough.md` for the full deep dive.

**Prompt:** "Jazz piano vamp in Cmaj7 with walking bass, 4 bars, 120bpm"
**Result:** 72 notes, 83 REMI tokens, 3-track MIDI ✅

## Tutorial 2: EDM Synth Lead
**Prompt:** "EDM synth lead in G minor, 128bpm"
**Why it works:** The engine understands electronic music conventions — octave doubling, filter-friendly velocity profiles, 4/4 time with kick-on-1 alignment.

```bash
node lib/engine.js "EDM synth lead in G minor, 128bpm"
```

**Output:** 68 notes, 3 tracks, REMI tokenized for fleet transport.

**Fleet connection:** Rhythmica (tidalcycles) can layer percussive patterns over this, Harmonia (musiclang) can analyze harmonic tension.

## Tutorial 3: Ambient Drone
**Prompt:** "Ambient drone in Eb, evolving over 8 bars, 50bpm"
**Why it works:** Slow tempos and open voicings allow the music21 generator to spread notes across the full MIDI range, creating evolving textures.

```bash
node lib/engine.js "Ambient drone in Eb, evolving over 8 bars, 50bpm"
```

**Fleet connection:** Perfect input for Weaver (markov) to generate infinite variations.

## Tutorial 4: Bossa Nova Pattern
**Prompt:** "Bossa nova guitar in Dm7, medium swing, 100bpm"
**Why it works:** Bossa nova requires understanding of syncopated rhythm patterns, which music21 handles through its jazz/rhythm analysis.

```bash
node lib/engine.js "Bossa nova guitar in Dm7, medium swing, 100bpm"
```

**Fleet connection:** Send to Pulse (sonicpi) for live playback — Sonic Pi's swing quantization locks perfectly with bossa timing.
