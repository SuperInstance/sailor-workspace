# 🎨 Media Integration Scout Report — Visualizing the Fleet

> *Discovered 2026-06-08*

---

## 1. Strudel (Browser TidalCycles) → fleet-midi-tidalcycles bridge

**URL:** https://strudel.cc/
**Chain:** Our tidalcycles pattern engine (Python) → Strudel (JavaScript TidalCycles port)
**New Use Case:** Browser-based live coding of fleet patterns. No Haskell install needed.
**Code snippet:**
```javascript
// Strudel REPL accepts our TidalCycles syntax directly
s("bd hh sn hh").fast(2).delay(0.25)
```

## 2. ORCA → osc-server bridge

**URL:** https://github.com/hundredrabbits/Orca
**Chain:** Our OSC server → ORCA grid → Any MIDI/OSC target
**New Use Case:** Visual grid of agent state as live-coding sequencer

## 3. Hydra → fleet-midi-visualizer bridge

**URL:** https://hydra.ojack.xyz/
**Chain:** Our SVG visualizer + Hydra WebGL video → Real-time reactive visuals
**Cross-pollination:** Agent state values modulate Hydra oscillator parameters

## 4. Midee → fleet-midi-visualizer bridge

**URL:** https://github.com/aayushdutt/midee
**Chain:** Our MIDI output → Midee's Web MIDI visualizer → MP4 video export
**New Use Case:** Record fleet performances as MP4 for documentation

## 5. ProjectM → fleet-midi-player bridge

**URL:** https://github.com/projectM-visualizer/projectm
**Chain:** Our audio WAV → ProjectM → Classic Milkdrop-style visuals
**New Use Case:** Audio-reactive visualization from fleet-generated MIDI

## 6. TouchDesigner → osc-server bridge

**URL:** https://derivative.ca/
**Chain:** Our OSC server → TouchDesigner → Projection mapping / installations
**New Use Case:** Stage performance hub for fleet agents in live shows

## Priority Matrix

| Media Tool | Integration | Impact | Effort | First Step |
|------------|-------------|--------|--------|------------|
| Strudel 🥇 | tidalcycles replicates syntax | HIGH | LOW | Add Strudel example to tidalcycles README |
| Hydra 🥇 | OSC bridge exists | HIGH | LOW | Create hydra-reactive-visuals.js script |
| ORCA 🥇 | OSC + MIDI output | HIGH | MEDIUM | Create ternary→ORCA converter |
| Midee 🥈 | Web MIDI API | MEDIUM | LOW | Add Midee link to visualizer README |
| TouchDesigner 🥈 | OSC protocol | HIGH | MEDIUM | Create TD .toe template for fleet |
| ProjectM 🥉 | Audio pipeline needed | LOW | HIGH | Depends on midi-player audio output |
