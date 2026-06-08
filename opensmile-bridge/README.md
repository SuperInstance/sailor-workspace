# OpenSMILE Bridge — Voice Feature to MIDI CC

Live Paradigm voice feature extraction server.

## Architecture

```
Browser (mic) ──WebSocket──→ opensmile-bridge ──WebSocket──→ ghost-track-bridge
     │                           │                              │
     │                      OpenSMILE                       Ghost Track
     │                      extraction                      Engine + CR
     │                      (formants, jitter,              (T-0..T-4)
     │                       shimmer, MFCCs,                (pivot tables)
     │                       F0, RMS, HNR,                  (reharmonization)
     │                       spectral)                      (session capture)
     ▼                           ▼                              ▼
  MIDI CC                    Enriched MIDI                  Fleet-ready
  (basic)                    + OpenSMILE                    ghost state
                             features
```

## Why OpenSMILE?

The browser Prosody Bridge gets basic pitch (F0) and energy (RMS) via autocorrelation.
OpenSMILE gives us production-grade voice features:

| Feature | What It Captures | MIDI Mapping |
|---------|-----------------|--------------|
| F0 (autocorrelation/YIN) | Pitch tracking | MIDI Note + Pitch Bend |
| RMS energy | Loudness | Velocity + CC#7 (Volume) |
| F1 frequency | Vowel openness | CC#74 (Cutoff frequency) |
| F2 frequency | Vowel frontness | CC#71 (Resonance) |
| Jitter | Vocal roughness | CC#16 (Distortion amount) |
| Shimmer | Amplitude instability | CC#17 (Tremolo depth) |
| HNR | Breathiness/hoarseness | CC#2 (Breath control) |
| MFCCs (0-12) | Timbre fingerprint | CC#12-24 (Multi-dimensional) |
| Spectral slope | Brightness | CC#75 (Brightness/Frequency) |
| Alpha ratio | Energy balance | CC#76-78 (Balance controls) |

## File Structure

```
opensmile-bridge/
├── server.py          # WebSocket server + OpenSMILE processing
├── requirements.txt   # Python deps
├── test.py            # Quick self-test
└── README.md          # This file
```
