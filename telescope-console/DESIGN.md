# Telescope Console — Unified Audio Pipeline Shell

## Core Principle
"The telescope, not the television." The user points at what they want. The system delivers it cleanly. No triggers, no recommendations, no attention theft.

## What We Learned from the Eras

### Early Algorithmic Era (DSP)
| Tool | UX Pattern | What to Steal |
|------|-----------|---------------|
| **aubio** | Zero-latency embedded C | Pipeline should feel instantaneous |
| **Vamp Plugins** | Visual plugin system, load WAV → run deterministic scripts | User drops audio in, sees feature extraction as a visual step |
| **Pure Data** | Node-based visual patching | Modular signal flow graph for routing audio through agents |
| **f0 CLI** | Scriptable batch processing | All pipeline steps available as CLI for scripting |

### Deep Learning Era
| Tool | UX Pattern | What to Steal |
|------|-----------|---------------|
| **Basic Pitch** | Runs in browser, instrument-agnostic, pitch-bend aware | Web-first, no install, instant demo |
| **Magenta** | Onsets + Frames splitting → accurate velocity | Separate detection layers for different feature types |
| **Neural Note** | DAW plugin, drag-drop audio → MIDI | The "drag-drop-then-it's-done" paradigm |
| **Omnizart** | Multi-instrument from one model | Unified model that handles everything |
| **MTG-Melodia** | Pulls lead vocal from dense mix | Targeted extraction from complex audio |

### Agentic Era
| Tool | UX Pattern | What to Steal |
|------|-----------|---------------|
| **MIDIfren** | Automated pipeline chaining | One-click full pipeline: split → transcribe → quantize |
| **CMC** | Automated music critic | Code review for MIDI output — validate and repair |
| **Demucs + agents** | Source separation before transcription | Clean input = clean output. Separate first, transcribe second |

## Telescope Console Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     TELESCOPE CONSOLE                     │
├─────────────────────┬────────────────────────────────────┤
│                     │                                    │
│  ┌───────────────┐ │  ┌──────────────────────────────┐  │
│  │  INPUT DECK   │ │  │  SIGNAL FLOW CANVAS          │  │
│  │              │ │  │                               │  │
│  │  [🎤 Mic]    │ │  │  Audio → Bridge → Features   │  │
│  │  [📁 File]   │ │  │     ↓          ↓              │  │
│  │  [🔗 URL]    │ │  │   Demucs    Persona Engine   │  │
│  │  [🎙 Podcast]│ │  │     ↓          ↓              │  │
│  └───────────────┘ │  │   MIDI CC   TTS Output      │  │
│                    │  │     ↓                        │  │
│  ┌───────────────┐ │  │  c-ternary Agents           │  │
│  │  OUTPUT DECK  │ │  │     ↓                        │  │
│  │              │ │  │  I2I Bottle → Fleet          │  │
│  │  [🔊 WAV]    │ │  └──────────────────────────────┘  │
│  │  [🎹 MIDI]   │ │                                    │
│  │  [📋 Lead]   │ │  ┌──────────────────────────────┐  │
│  │  [📞 Phone]  │ │  │  LIVE MONITOR               │  │
│  └───────────────┘ │  │                              │  │
│                    │  │  F0: ████████░░░░ 180 Hz    │  │
│                    │  │  CC7: ████████░░ 96         │  │
│                    │  │  BPM: ████░░░░░░ 120        │  │
│                    │  │  Agent: ● ● ○ ○ ●  (3/5)   │  │
│                    │  └──────────────────────────────┘  │
├─────────────────────┴────────────────────────────────────┤
│  STATUS: Bridge ● / Pipeline ● / Agents ●  |  [ ONE-SHOT DEMO ] │
└──────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1 — Dashboard Shell (NOW)
- Web server (FastAPI + WebSocket)
- Live bridge status display
- Feature visualizer (F0, loudness, CC lanes in real-time)
- Pipeline health check
- File upload → processed output

### Phase 2 — Signal Flow Canvas
- Visual node graph (audio → bridge → persona → TTS)
- Drag to connect pipeline stages
- Each node expandable for configuration

### Phase 3 — Agent Integration
- Live agent status display
- I2I bottle viewer
- Agent stance vectors visualized
- Signal routing through agents

### Phase 4 — One-Shot Pipeline
- "Do Everything" button
- Upload audio → auto-detect best pipeline → return all outputs
- Source separation + feature extraction + transcription + persona
- "Make it sound like Feynman"

## UX Principles (from Telescope Philosophy)
1. **You aim, the system delivers** — No recommendations or triggers
2. **Everything visible** — Every pipeline stage shows its current state
3. **One action, many outputs** — One audio file → WAV, MIDI, lead sheet, phone-filtered
4. **Desktop + mobile** — Responsive, works on tablet as a control surface
5. **Keyboard-optional** — Point and click for most operations
