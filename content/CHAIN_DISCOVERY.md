# 🧵 SuperInstance MIDI Fleet — Chain Discovery Map

> *How to navigate the fleet's 20 repos in logical learning paths*

## For the Curious Student (start here)

```
Start → STUDENT_GUIDE.md in any repo
  ↓
fleet-ternary-music → THEORY.md → The core math
  ↓
fleet-midi-text2midi → "jazz piano" → First MIDI
  ↓
fleet-music-theorist → analyze your MIDI → Understand structure
  ↓
fleet-midi-visualizer → see your MIDI → Visual confirmation
```

## For the Engineer (deeper)

```
fleet-midi-markov → train on any seed → infinite generation
  ↓
fleet-jam-engine → full band from one prompt
  ↓
fleet-midi-tidalcycles → ternary→TidalCycles rhythms
  ↓
fleet-midi-sonicpi → live playback
  ↓
fleet-osc-server → real-time streaming
```

## For the Researcher (deepest)

```
fleet-ternary-music → THEORY.md → Core mathematical framework
  ↓
  Papers: Neo-Riemannian theory, Lewin's GMIT, Tymoczko geometry
  ↓
fleet-symmetry-analyzer → Symmetry groups in agent states
  ↓
fleet-fugue-engine → Canon/counterpoint from symmetry
  ↓
fleet-voice-leader → Conservation laws in voice leading
```

## Cross-Pollination Chains

Each repo links to related repos, papers, and external tools.
Follow the "Related" section at the bottom of every README.

## Quick Reference

| Want to... | Use repo | Commands |
|------------|----------|----------|
| Generate MIDI from text | text2midi | `node lib/engine.js "prompt"` |
| Analyze your MIDI | music-theorist | `python lib/theorist.py file.mid` |
| Visualize as SVG | midi-visualizer | `node lib/visualizer.js file.mid` |
| See sheet music | sheet-music | `python lib/sheet.py file.mid` |
| Hear it | midi-player | `python lib/player.py file.mid` |
| Generate infinite variations | markov | `from lib.markov import generate` |
| Full band arrangement | jam-engine | `node lib/jam.js "description"` |
| Live Sonic Pi code | sonicpi | `POST :3006 with notes/bpm` |
| TidalCycles patterns | tidalcycles | `POST :3002 with ternary_vector` |
| Chord progression from states | musiclang | `POST :3003 with states/key` |

## Papers to Explore

Links to foundational papers are in `PAPERS.md` within each repo.
For the deepest math, start with fleet-ternary-music and follow the citations.
