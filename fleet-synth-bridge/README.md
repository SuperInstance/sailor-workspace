# Fleet Synth Bridge — MIDI → Audio Renderer

Closes the pipeline's biggest remaining gap: until now, we could analyze
conversation into lead-sheet-MIDI but could never *hear* it.

This bridge uses FluidSynth to render MIDI files through a SoundFont,
converting conversation prosody into playable audio.

## Usage

```bash
# Check deps
python3 fleet-synth-bridge.py --check

# Play the existing lead-sheet MIDI
python3 fleet-synth-bridge.py --midi tensor-output/lead-sheet.mid

# Render to WAV file
python3 fleet-synth-bridge.py --midi tensor-output/lead-sheet.mid --output conversation.wav

# Use a different instrument
python3 fleet-synth-bridge.py --midi lead-sheet.mid --instrument 48  # String Ensemble

# Convert lead-sheet JSON directly to audio
python3 fleet-synth-bridge.py --json tensor-output/lead-sheet-v2.json

# List available SoundFonts
python3 fleet-synth-bridge.py --list-sf
```

## Channel Map

| Channel | Track          | Default Instrument | GM Patch |
|---------|----------------|-------------------|----------|
| 0       | Pitch Contour  | Synth Voice       | 54       |
| 1       | Prosody CC     | String Ensemble   | 48       |
| 2       | Transcript     | Piano             | 0        |
| 3       | Stage Dir.     | Lead 7 (fifths)   | 87       |

## Dependencies

- `pyfluidsynth` (pip install)
- `pretty_midi` (pip install)
- FluidSynth binary (apt install fluidsynth)
- SoundFont (FluidR3_GM.sf2)

All verified working on ARM64.
