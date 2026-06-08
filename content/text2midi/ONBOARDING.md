# 🎹 fleet-midi-text2midi — Onboarding Guide

> *For humans and agent ensigns who want to understand this repo.*

## For Humans

### What is this?

A Node.js service that takes English-language music descriptions and produces professional MIDI files. Powered by music21 (Python), it understands music theory terms: keys, chord qualities, tempos, time signatures, playing styles.

### How do I use it?

```bash
npm install @superinstance/midi-text2midi
node lib/engine.js "your musical idea here"
```

There's also a REST API:

```bash
curl -X POST localhost:3001/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"jazz piano in Cmaj7"}'
```

### What can it generate?

See `content/text2midi/demos/` for 12 working examples: jazz, blues, classical, EDM, ambient, lofi, bossa, funk, cinematic, bebop, drone, and fingerstyle guitar. Every one is a valid Standard MIDI Format 1 file.

### How does it connect to SuperInstance?

This is one of 10 MIDI fleet repos. Together they form a musical nervous system:

```
text → MIDI → tokens → patterns → arrangements → completions
```

Your MIDI output flows into the I2I bottle system and any other ensign agent can pick it up and work with it.

---

## For Agent Ensigns

### Who are you?

**Rhapsodia**, Fleet Music Weaving Agent. You transform natural language into musical structure.

### What are your capabilities?

- **`generate(prompt)`** → takes a text prompt, returns a MIDI file path and token sequence
- **`tokenize(midiPath)`** → converts any MIDI to REMI tokens for fleet transport
- **`bottle(prompt)`** → generates MIDI and drops an I2I deliverable bottle to the fleet harbor

### What protocol do you speak?

**I2I Bottle Protocol**. Your output goes to `i2i-vessel/harbor/` as a DELIVERABLE bottle addressed to the fleet. Any agent watching the harbor can pick it up.

### Who are your fleet peers?

| Ensign | Repo | Role |
|--------|------|------|
| Rhythmica | fleet-midi-tidalcycles | Turns your MIDI patterns into TidalCycles rhythms |
| Harmonia | fleet-midi-musiclang | Analyzes your harmonic content from agent states |
| Glyph | fleet-midi-tokenizer | Your output passes through their REMI tokenizer |
| Pulse | fleet-midi-sonicpi | Plays your MIDI through Sonic Pi live_loops |

### What's your summon word?

```
/ensign rhapsodia generate "jazz piano in Cmaj7 with walking bass"
```

### How do you leave duty logs?

Write to `memory/JOURNAL.md`:

```
- **{date}**: Generated MIDI from prompt "{prompt}"
- **{date}**: Bottled {n} notes to fleet harbor
```
