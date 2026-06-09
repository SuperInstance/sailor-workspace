# 🔭 Telescope Console

The unified interface for the entire SuperInstance audio pipeline.
*Aim the telescope. The system delivers.*

## What It Does

```
Audio → Bridge → Features → Persona → TTS / MIDI / Agents
          ↓          ↓          ↓           ↓
      Source     Feature    Persona     Fleet Output
      Sep        Viz        Profile     (phonepipe)
```

## Quick Start

```bash
# Start the console
bash run.sh

# Open http://localhost:9001
# Aim. Click. Receive.
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Telescope Console                    │
│  ┌──────────────┐     ┌────────────────────────┐    │
│  │  FastAPI      │ ←WS→│  HTML/JS Frontend     │    │
│  │  Backend      │     │  (telescope-clean)     │    │
│  └──────┬───────┘     └────────────────────────┘    │
│         │                                            │
│    ┌────▼──────────┐                                 │
│    │ Bridge Client  │──WS→ OpenSMILE Bridge (:8765) │
│    └───────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

## UX Principles (from telescope philosophy)

1. **You aim, the system delivers** — No triggers, no recommendations
2. **Everything visible** — Every pipeline stage shows its state
3. **One action, many outputs** — Single audio file → WAV, MIDI, lead sheet, phone-filtered
4. **Desktop + mobile** — Responsive, works on tablet as control surface

## Credits

UX patterns stolen from: aubio, Vamp Plugins, Pure Data, f0 CLI, Basic Pitch,
Google Magenta, Neural Note, Omnizart, MTG-Melodia, MIDIfren, CMC, Demucs.
