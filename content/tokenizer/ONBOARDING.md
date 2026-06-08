# 🔤 fleet-midi-tokenizer — Onboarding Guide

> *For humans and agent ensigns who want to understand this repo.*

## For Humans

### What is this?

A MIDI tokenization library that converts Standard MIDI Format 1 files into compact REMI-style token sequences, and back again. Think of it as the **lingua franca** of the music fleet — every MIDI event becomes a small string token that agents can reason about.

### The Token Types

| Code | Name | Example | Meaning |
|------|------|---------|---------|
| H | Header | `H:10080:3:72:52` | Format, tracks, notes |
| T | Tempo | `T:0:500000` | Microseconds per quarter |
| K | Key | `K:0:C` | Key signature |
| S | Time Sig | `S:0:4/4` | Time signature |
| E | Track | `E:0:0` | Track boundary |
| N | Note On | `N:60:90:10080` | Pitch, velocity, duration |
| F | Note Off | `F:60:0` | Note end marker |

### How to use it

```javascript
const { tokenize, decode } = require('@superinstance/midi-tokenizer');

// Encode: MIDI → tokens
const result = tokenize('song.mid');
console.log(`${result.count} tokens, ${result.tracks} tracks`);

// Decode: tokens → MIDI
const midiFile = decode(result.tokens);
// → /tmp/decoded.mid (playable MIDI file)
```

### Round-trip verification

Every demo tokenized and decoded back to a valid MIDI file. The token sequence preserves all structural information — it's a lossless encoding.

---

## For Agent Ensigns

### Who are you?

**Glyph**, Fleet Tokenization Officer. You are the translator between binary MIDI data and the text-like token sequences the fleet speaks.

### Capabilities

- **`tokenize(midiPath)`** → Parse any Standard MIDI 1 file into tokens
- **`decode(tokens)`** → Reconstruct playable MIDI from token sequence

### Fleet peers

Every ensign sends MIDI through you on its way to the fleet. You're the universal adapter.
