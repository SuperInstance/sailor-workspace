# Basic Pitch Conversation Bridge

Fork of **Basic Pitch's output stage** — not the model, not the inference.

Converts Spotify Basic Pitch `predict()` output into lead-sheet-MIDI-v3 JSON format
consumed by `export-ardour.py`, `fleet-rule-engine`, and all downstream fork targets.

## Priority

**#1 Fork Priority** (from Hermes 3 405B synthesis, 2026-06-09):
> "Fork Basic Pitch's output stage — add lead_sheet.py that writes our JSON format +
> continuous pitch data. It's the narrowest, highest-leverage change."

## Usage

```bash
# Check if Basic Pitch is available
python3 -m basic_pitch_conversation --status

# Convert audio to lead-sheet JSON
python3 -m basic_pitch_conversation input.wav --output lead-sheet.json
```

## Platform Support

| Platform | Basic Pitch | pretty_midi | Status |
|----------|-------------|-------------|--------|
| x86_64 (Codespaces) | ✅ Full | ✅ Full | Basic Pitch model runs |
| ARM64 (Oracle Pi) | ❌ numba/llvmlite | ✅ Fallback | pretty_midi fallback |

## Output Schema (lead-sheet-midi-v3)

Key addition over stock Basic Pitch (v2 → v3):

```json
{
  "t": 1.234,
  "note": 69,
  "name": "A4",
  "vel": 85,
  "f0_hz": 440.0,      // ← NEW: exact fundamental frequency
  "pitch_bend": 2       // ← NEW: cents offset from note
}
```

This preserves continuous glissando that MIDI note quantization destroys.
See `tensor-demo/LEAD_SHEET_MIDI.md` for full schema documentation.
