# Voice-to-Synth Bridge

Real-time voice-to-MIDI synthesis pipeline. Connects to an [OpenSMILE voice feature bridge](https://github.com/SuperInstance/opensmile-bridge) via WebSocket, receives voice-derived MIDI CC messages, and routes them to **FluidSynth** for real-time audio synthesis through a General MIDI SoundFont.

## Architecture

```
┌──────────────┐    WebSocket     ┌──────────────┐    FluidSynth    ┌─────────┐
│   OpenSMILE  │ ───────────────→ │    Synth     │ ───────────────→ │  Audio  │
│    Bridge    │   ws://:8765     │    Bridge    │    PulseAudio    │ Output  │
│              │                  │              │                  │         │
│  Audio →     │  {type:features, │  Note On/Off │  GM SoundFont    │  🎵     │
│  Voice Feat. │   data:{midi_cc: │  + CC values │  (FluidR3_GM)    │         │
│  → MIDI CC   │    {7:64,...}}   │  → synth     │                  │         │
└──────────────┘                  └──────────────┘                  └─────────┘
```

## Voice-to-MIDI CC Map

| Feature         | MIDI Control | Effect                  |
|-----------------|-------------|-------------------------|
| Loudness        | CC#7        | Volume                  |
| F0 (pitch)      | Note On/Off | Voice note              |
| Alpha Ratio     | CC#74       | Filter cutoff           |
| Spectral Flux   | CC#75       | Brightness              |
| Jitter          | CC#16       | Distortion/Expression   |
| Shimmer         | CC#17       | Tremolo                 |
| HNR             | CC#2        | Breath control          |
| MFCC 1-12       | CC#12-23    | Timbre modulation       |

## Getting Started

### Prerequisites

- Python 3.11+
- FluidSynth 2.x (`apt install fluidsynth`)
- General MIDI SoundFont (e.g., FluidR3_GM.sf2)
- OpenSMILE bridge running (see [opensmile-bridge](https://github.com/SuperInstance/opensmile-bridge))

### Install Dependencies

```bash
pip install pyfluidsynth numpy websockets
```

### Run the Bridge

```bash
# Start the synth bridge (connects to OpenSMILE bridge at ws://localhost:8765)
python3 synth_bridge.py

# Use a different instrument patch
python3 synth_bridge.py --patch choir_aahs

# Higher volume
python3 synth_bridge.py --gain 0.5

# Custom bridge URL
python3 synth_bridge.py --url ws://other-host:8765

# List available patches
python3 synth_bridge.py --list-patches
```

### Test the Pipeline

```bash
# Send 5 seconds of audio for testing (requires the OpenSMILE bridge)
python3 test_pipeline.py

# Full audio file
python3 test_pipeline.py --full

# Custom file
python3 test_pipeline.py --file /path/to/speech.wav

# Dry-run (log MIDI events without audio)
python3 test_pipeline.py --dry-run

# Render to WAV
python3 test_pipeline.py --render /tmp/output.wav
```

### Manual FluidSynth Test

```bash
# Verifies FluidSynth works with your soundfont
python3 synth_bridge.py --test
```

## Available Instrument Patches

| Name             | GM Patch | Description                        |
|------------------|----------|------------------------------------|
| `synth_pad`      | 90       | Pad 2 (warm) — continuous, blendable |
| `synth_voice`    | 54       | Synth Voice — vocal-like ooh/ahh   |
| `string_ensemble`| 48       | String Ensemble — rich harmonics   |
| `breathy_pad`    | 91       | Pad 3 (polysynth) — ethereal       |
| `choir_aahs`     | 52       | Choir Aahs — directly mimics voice |
| `lead_saw`       | 82       | Lead 5 (sawtooth) — bright, cutting |

## Files

| File               | Purpose                                    |
|--------------------|--------------------------------------------|
| `synth_bridge.py`  | Main bridge: WebSocket → FluidSynth        |
| `test_pipeline.py` | End-to-end test: file → bridge → synth     |

## How It Works

1. **OpenSMILE Bridge** extracts voice features (loudness, pitch, jitter, shimmer, spectral content, MFCCs) from audio in real-time and maps them to MIDI CC values.

2. **Synth Bridge** connects to the OpenSMILE bridge WebSocket, receives feature data with embedded MIDI CC mappings, and routes them to FluidSynth:
   - Voice pitch → MIDI note number (note on/off)
   - Loudness → MIDI velocity + CC#7 (volume)
   - Spectral features → CC#74 (filter cutoff), CC#75 (brightness)
   - Voice quality → CC#16 (expression), CC#17 (tremolo), CC#2 (breath)

3. **FluidSynth** renders audio through PulseAudio using a General MIDI SoundFont, producing audible output from voice input.

## License

MIT
