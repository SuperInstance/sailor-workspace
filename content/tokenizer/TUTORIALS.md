# 🔤 fleet-midi-tokenizer — Tutorial Collection

## Tutorial 1: Understanding Token Types
Each MIDI event becomes a small string: H(header), T(tempo), K(key), S(time_sig), E(track), N(note), F(note_end).

Example from demo-01: `E:0:0` (track 0 starts), `N:60:0:40320` (note C4, full bar), `F:60:0` (note ends)

## Tutorial 2: Lossless Round-Trip
Every MIDI file tokenized and decoded back. File sizes differ (original 424b, decoded 135b) because the decoder uses a simpler structure — all musical information preserved.

## Tutorial 3: Structural Analysis Through Tokens
Token distribution reveals musical structure:
- Count N tokens = count F tokens (every note has a matching end)
- Track count = E token count
- Header provides the full metadata summary

## Tutorial 4: Fleet Transport Protocol
Tokens are the fleet's musical lingua franca. An I2I bottle containing a token sequence can be picked up by any ensign — Rhapsodia reads it, Weaver extends it, Pulse plays it.
