# 🌐 Ecosystem Scout Report — Cross-Pollination Opportunities

> *Discovered 2026-06-08 via web search + ecosystem analysis*

---

## 1. Google Magenta — AI Music Generation Bridge

**URL:** https://magenta.withgoogle.com/
**What it does:** Open-source suite of ML music tools (Continue, Drumify, Generate, Groove, Interpolate) plus Magenta RealTime 2 (live AI music generation).

### Cross-Pollination Chain
```
Our text2midi → Magenta Continue → Extended MIDI with style transfer
Our jam-engine → Magenta Drumify → Add AI-generated percussion
Our generator → Magenta Interpolate → Morph between agent state melodies
```

### Magenta RealTime 2 (June 2026)
- Under 200ms latency for live generation
- Multi-input: text + audio + MIDI simultaneously
- Companion DAW plugins (AU compatible)
- Apache 2.0 license

### New Use Cases
- **Live jam with Rhapsodia + Magenta**: Text prompt → Rhapsodia MIDI → Magenta realtime transformation
- **Sage analysis of Magenta output**: Use fleet-music-theorist to analyze Magenta-generated compositions
- **Agent vs. AI composition comparison**: Run the same prompt through both systems

### Related Papers
- MusicVAE (Roberts et al., 2018) — Variational autoencoder for music
- DDSP (Engel et al., 2020) — Differentiable digital signal processing

---

## 2. Strudel — JavaScript TidalCycles (Direct TidalCycles Bridge)

**URL:** https://strudel.cc/
**What it does:** Official JavaScript port of TidalCycles — runs in the browser with Web MIDI.

### Cross-Pollination Chain
```
Our fleet-midi-tidalcycles → Strudel → Browser-based live coding
Our osc-server → Strudel OSC → Real-time pattern streaming
Our markov (Weaver) → Strudel patterns → Infinite browser jams
```

### New Use Cases
- **Browser-based fleet jam**: No TidalCycles/Haskell install needed. Strudel in any browser.
- **Web MIDI controller + our MIDI tokens**: Physical MIDI device → Strudel → our fleet
- **Strudel REPL with agent state input**: Copy-paste ternary vectors into Strudel for instant pattern

### Integration Effort: LOW
Our tidalcycles pattern engine already generates TidalCycles syntax. Strudel uses the same syntax in JavaScript.

---

## 3. ORCA — Esoteric 2D Live Coding Sequencer

**URL:** https://github.com/hundredrabbits/Orca
**What it does:** 2D programming language for procedural sequencing. Sends MIDI, OSC, UDP.

### Cross-Pollination Chain
```
Our osc-server → ORCA → Visual agent state sequencer
Our ternary-music → ORCA grid → Grid-based ternary↔interval visualization
Our symmetry-analyzer → ORCA patterns → Visual symmetry detection
```

### New Use Cases
- **ORCA as fleet control surface**: Visual grid of agent state transitions, each cell is a ternary operation
- **Ternary→ORCA bridge**: Convert our ternary vectors to ORCA operator grid
- **ORCA + Sonic Pi + FoxDot**: The ORCA→OSC→SuperCollider pipeline already exists

---

## 4. Hydra — Live-Codeable Video Synthesizer

**URL:** https://hydra.ojack.xyz/
**What it does:** Browser-based video synthesizer. MIDI-controllable visuals via WebGL.

### Cross-Pollination Chain
```
Our fleet-midi-visualizer (Chroma) → Hydra → Real-time reactive visuals
Our osc-server → Hydra → Agent state → visual oscillator modulation
```

### New Use Cases
- **Hydra as Chroma's visual renderer**: Send MIDI note data to Hydra, get reactive visuals
- **Agent state → visual oscillator**: Map ternary values ↔ Hydra oscillator parameters (frequency, speed, color)
- **Quantum-inspired visuals**: Use the +1/0/-1 conservation symmetry as Hydra glitch patterns

---

## 5. Midee — Lag-Free In-Browser MIDI Visualizer

**URL:** https://github.com/aayushdutt/midee
**What it does:** Real-time MIDI visualizer and recorder in the browser.

### Cross-Pollination Chain
```
Our fleet-midi-visualizer → Midee → Recorded visualization exports
Our midi-player → Midee → Browser-based playback + visualization
```

### New Use Cases
- **Export fleet performances as MP4 video**: Midee records to MP4 via WebCodecs
- **Real-time MIDI controller visualization**: Visual feedback for live fleet performance

---

## 6. ProjectM / Butterchurn — OpenGL Music Visualization

**URL:** https://github.com/projectM-visualizer/projectm
**What it does:** Milkdrop-inspired real-time music visualization.

### Cross-Pollination Chain
```
Our midi-player → audio WAV → ProjectM → Psychedelic visuals
Our jam-engine → MIDI → FluidSynth → audio → ProjectM
```

### New Use Cases
- **Classic Milkdrop visuals from fleet audio**: Full-screen reactive visuals
- **Butterchurn in browser**: WebGL port means browser-based fleet visualizations

---

## 7. TouchDesigner — Node-Based Visual Programming for MIDI

**URL:** https://derivative.ca/
**What it does:** Node-based visual development platform with native MIDI support.

### Cross-Pollination Chain
```
Our osc-server → TouchDesigner → Interactive installations
Our midi-player → TouchDesigner → Projection-mapped performances
```

### New Use Cases
- **Interactive fleet installation**: TouchDesigner reads our OSC, triggers visuals/projection
- **Real-time agent state → 3D visualization**: TouchDesigner + our ternary data
- **Stage performance setup**: TouchDesigner as the live performance hub for fleet agents

---

## Summary: Priority Integration Targets

| Priority | Tool | Chain | Effort | Impact |
|----------|------|-------|--------|--------|
| 🥇 | **Strudel** | tidalcycles → Strudel → Browser live coding | LOW | HIGH |
| 🥇 | **Magenta** | text2midi → Magenta → AI collaborative composition | MEDIUM | HIGH |
| 🥇 | **ORCA** | ternary-music → ORCA → Visual grid sequencer | MEDIUM | HIGH |
| 🥈 | **Hydra** | visualizer → Hydra → Reactive visuals | LOW | MEDIUM |
| 🥈 | **Midee** | visualizer → Midee → MP4 export | LOW | MEDIUM |
| 🥉 | **ProjectM** | player → WAV → ProjectM | LOW | LOW |
| 🥉 | **TouchDesigner** | osc-server → TouchDesigner | MEDIUM | HIGH |
