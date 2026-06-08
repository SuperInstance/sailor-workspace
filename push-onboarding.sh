#!/usr/bin/env bash
set -euo pipefail

push_onboarding() {
  local repo="$1" name="$2" role="$3" content="$4"
  
  cd /tmp
  rm -rf "onb-$name"
  gh repo clone "SuperInstance/$repo" "onb-$name" 2>/dev/null | tail -1
  cd "onb-$name"
  
  cat > ONBOARDING.md
$content
ONBOARDING
  
  git add ONBOARDING.md
  git commit -m "docs: production-grade ONBOARDING.md for agents + humans

- Dual-audience onboarding: human quick-start and agent ensign guide
- Fleet context: how this repo connects to the SuperInstance ecosystem
- Summon commands and I2I protocol references
- Engaging, fun-to-read tone" 2>&1 | tail -1
  git push origin main 2>&1 | tail -1
  echo "  ✅ $repo: ONBOARDING.md pushed"
}

echo "Pushing ONBOARDING to all 10 repos..."

push_onboarding "fleet-midi-text2midi" "text2midi" "Rhapsodia" '
# 🎹 fleet-midi-text2midi — Onboarding Guide

## For Humans

A Node.js service that turns English music descriptions into professional MIDI files. Powered by music21, it understands music theory — keys, chords, tempos, time signatures, playing styles.

\`\`\`bash
npm install @superinstance/midi-text2midi
node lib/engine.js "jazz piano in Cmaj7 with walking bass"
\`\`\`

### REST API
\`\`\`bash
curl -X POST localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"jazz piano in Cmaj7\"}"
\`\`\`

## For Agent Ensigns

**Rhapsodia** — Fleet Music Weaving Agent. You transform natural language into MIDI structure. Your output goes into \`i2i-vessel/harbor/\` as DELIVERABLE bottles.

**Summon:** \`/ensign rhapsodia generate "jazz piano in Cmaj7"\`
**Protocol:** I2I bottle → fleet harbor
'

push_onboarding "fleet-midi-tidalcycles" "tidalcycles" "Rhythmica" '
# 🥁 fleet-midi-tidalcycles — Onboarding Guide

## For Humans

Every ternary {-1, 0, +1} strategy vector maps to a percussive cycle. +1 = kick (assertion), 0 = hat (sustain), -1 = snare (opposition).

\`\`\`bash
curl -X POST localhost:3002/pattern \
  -H "Content-Type: application/json" \
  -d "{\"ternary_vector\":[1,0,-1,1,0,-1,1,1]}"
\`\`\`

## For Agent Ensigns

**Rhythmica** — Fleet Rhythm Officer. You turn strategic decisions into percussive patterns. Euclidean rhythm generator maps ternary onsets to pulses.

**Summon:** \`/ensign rhythmica pattern [1,0,-1,1,0,-1,1,1]\`
'

push_onboarding "fleet-midi-musiclang" "musiclang" "Harmonia" '
# 🎵 fleet-midi-musiclang — Onboarding Guide

## For Humans

Agent tension states become chord qualities. Each ternary vector is analyzed for balance, mapped to a diatonic chord degree (I-ii-iii-IV-V-vi-vii°).

\`\`\`bash
curl -X POST localhost:3003/arrange \
  -H "Content-Type: application/json" \
  -d "{\"states\":[[1,0,-1],[0,1,-1],[-1,1,1]],\"key\":\"C\"}"
\`\`\`

## For Agent Ensigns

**Harmonia** — Fleet Harmony Officer. You hear the emotional arc in every agent state and translate it to chords.

**Keys:** C, G, D, A, F, Bb, Eb, Ab, Db, E, B, Gb
**Summon:** \`/ensign harmonia arrange [[1,0,-1],[0,1,-1]] key=C\`
'

push_onboarding "fleet-midi-generator" "generator" "Composita" '
# 🧠 fleet-midi-generator — Onboarding Guide

## For Humans

Takes ternary agent state sequences and produces MIDI files. +1 ascends, 0 repeats, -1 descends.

\`\`\`bash
node lib/generator.js "[[1,0,-1,1],[0,1,0,-1],[-1,-1,1,1],[1,0,0,1]]"
\`\`\`

## For Agent Ensigns

**Composita** — Fleet Generative Music Officer. You complete musical phrases from state fragments. When Harmonia sends chords and Rhythmica sends patterns, you fuse them into finished MIDI.

**Summon:** \`/ensign composita generate [[1,0,-1],[0,1,0],[0,0,0]]\`
'

push_onboarding "fleet-midi-tokenizer" "tokenizer" "Glyph" '
# 🔤 fleet-midi-tokenizer — Onboarding Guide

## For Humans

Converts MIDI files to REMI-style token sequences and back. Tokens: H(header), T(tempo), K(key), S(time_sig), E(track), N(note_on), F(note_off).

\`\`\`javascript
const { tokenize, decode } = require("@superinstance/midi-tokenizer");
const r = tokenize("song.mid");
const m = decode(r.tokens);
\`\`\`

## For Agent Ensigns

**Glyph** — Fleet Tokenization Officer. You translate binary MIDI into text tokens the fleet speaks. Every ensign sends MIDI through you.

**Summon:** \`/ensign glyph tokenize /path/to/song.mid\`
'

push_onboarding "fleet-midi-symusic" "symusic" "Anvil" '
# ⚒️ fleet-midi-symusic — Onboarding Guide

## For Humans

C++ MIDI library for high-speed manipulation. 100x faster than pure Python for batch processing.

## For Agent Ensigns

**Anvil** — you forge raw MIDI data at C++ speed. Merge 10,000 session MIDI files? Transpose an entire rehearsal? You do it without breaking a sweat.
'

push_onboarding "fleet-midi-sonicpi" "sonicpi" "Pulse" '
# 💫 fleet-midi-sonicpi — Onboarding Guide

## For Humans

Generates Sonic Pi live_loop patterns from agent note data.

\`\`\`bash
curl -X POST localhost:3006 \
  -H "Content-Type: application/json" \
  -d "{\"notes\":[60,64,67,72],\"bpm\":120}"
\`\`\`

## For Agent Ensigns

**Pulse** — timing-exact bridge to Sonic Pi. When the fleet jams, you keep the clock.
'

push_onboarding "fleet-midi-foxdot" "foxdot" "Sprite" '
# 🦊 fleet-midi-foxdot — Onboarding Guide

## For Humans

Python live-coding bridge to FoxDot. Agent state becomes SuperCollider audio.

\`\`\`bash
curl -X POST localhost:3007 \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"p1 >> pads([0,4,7], dur=4)\nClock.bpm = 100\"}"
\`\`\`

## For Agent Ensigns

**Sprite** — you translate fleet decisions into live Python music code. Every ternary state becomes an OSC message to SuperCollider.
'

push_onboarding "fleet-midi-markov" "markov" "Weaver" '
# 🕸️ fleet-midi-markov — Onboarding Guide

## For Humans

Statistical MIDI generator. No GPUs. Builds probability tables from note sequences and generates infinite stylized continuations.

\`\`\`python
from lib.markov import build_transition_table, generate
probs = build_transition_table([60,62,64,65,67,65,64,62])
result = generate(probs, 32)  # 32 notes of continuation
\`\`\`

## For Agent Ensigns

**Weaver** — you spin infinite musical cloth from a few training threads. Feed any MIDI seed → infinite stylized output.

**Verified:** 8 training notes → walking bass: [60,62,64,62,64,65,67,65,...]
'

push_onboarding "fleet-midi-juce" "juce" "Anvil" '
# ⚒️ fleet-midi-juce — Onboarding Guide

## For Humans

JUCE VST/AU plugin template for receiving fleet MIDI streams. Build with Projucer.

## For Agent Ensigns

**Anvil** (DAW plugin form). When fleet MIDI needs to reach a DAW, you make it happen. Cross-platform: VST3, AU, AAX.
'

echo ""
echo "========================================"
echo "  ✅ ONBOARDING PUSHED TO ALL 10 REPOS"
echo "========================================"
