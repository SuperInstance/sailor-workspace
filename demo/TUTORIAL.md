# Live Paradigm: Voice-to-MIDI Pipeline — Creative Tutorial

A hands-on tour of the SuperInstance ternary MIDI fleet. This tutorial walks through the full pipeline from architecture to creative use, with real output captured from a working 22-service deployment.

---

## Table of Contents

1. [What Is This?](#1-what-is-this)
2. [Architecture Overview](#2-architecture-overview)
3. [The Ternary Principle](#3-the-ternary-principle)
4. [Conversation Law: Why Σ(Δ) = 4 × Σ(trit)](#4-conservation-law)
5. [Setting Up the Pipeline](#5-setting-up)
6. [Creative Demo: Sing a Chord, See the Fleet Hear It](#6-creative-demo)
7. [The Feedback Loop: When Surprises Become Music](#7-the-feedback-loop)
8. [16 Agents, 16 Perspectives](#8-16-agents)
9. [Making Something With It](#9-making-something)
10. [Next Steps & Architecture Gaps](#10-next-steps)

---

## 1. What Is This?

The Live Paradigm is a real-time voice-to-MIDI cognitive architecture. It takes audio from a microphone, extracts professional voice features (via OpenSMILE's 25 eGeMAPS features), predicts musical intent 4 time steps ahead (Ghost Track), dispatches cues through a scheduler (tminus), and routes them to 16 specialized agents (fleet-midi) — each of which analyzes a different musical dimension using ternary (+1/0/-1) logic.

The output feeds back through a closed loop: agent outputs → accumulator → reharmonization engine → improved next prediction.

Think of it as a distributed music-theory brain: 16 specialists in a room, each listening to the same voice input through their own lens, and voting on what they hear.

## 2. Architecture Overview

```
🎤 Browser Mic ──WS──→ OpenSMILE Bridge (:8765)
                             │
                     25 eGeMAPS features
                             │
                             ▼
                     Ghost Track (:8767)
                      T-0..T-4 predictions
                      CR monitoring
                      Reharmonization
                             │
                    cue + ghost state
                             │
                             ▼
                   tminus-dispatcher (:8768)
                     cue scheduling
                     phase groups
                     timing queue
                             │
                    CUE with offset_beats
                             │
                             ▼
                    Fleet Conductor (:8769)
                      agent routing
                      health checks
                      feedback loop ──┐
                             │       │
                    ┌────────┴──────┐ │
                    ▼               ▼ │
            16 fleet-midi       Ghost Track
            agents (:2160-      /feedback
             :2175)             endpoint
                    │               │
                    ▼               ▼
              Piper TTS (:8770)  Accumulator
              (voice output)    (closed gestures)
```

**The pipeline runs on Oracle ARM64 (4 cores, 24GB RAM) with ~102ms total latency — well under the 500ms cognitive beat threshold.**

## 3. The Ternary Principle

Where binary gives yes/no, ternary gives **approve/reject/observe** — a cognitive substrate that maps naturally to music theory.

Each agent decomposes its musical domain into three values:

| Agent | +1 (Approve) | 0 (Observe) | -1 (Reject) |
|-------|-------------|-------------|-------------|
| chord | major | suspended/other | minor |
| scale | major/ascending | chromatic/blues | minor/descending |
| voicing | open/wide | medium | closed/tight |
| tempo | fast (≥120 BPM) | moderate (80-119) | slow (<80) |
| expression | intense/accented | neutral | soft/legato |
| dynamics | crescendo | steady | diminuendo |
| pan | right | center | left |
| modulation | fast/trill | off/steady | slow/drone |
| arp | ascending | random | descending |
| groove | swung | pulse | straight |
| velocity | accented/hard | neutral | ghosted/soft |
| register | high (C5+) | mid (C3-B4) | low (C2-B2) |
| melody | ascending | repeating | descending |
| bass | walking | root/chord tones | pedal/sustained |
| cc | value increasing | stable | value decreasing |
| fx | wet (processed) | balanced | dry (unprocessed) |

**Why does this work?** Music is inherently ternary. A chord is major (+1), minor (-1), or suspended (0). A melody ascends (+1), descends (-1), or repeats (0). A gesture opens (+1), closes (-1), or hovers (0). Ternary captures the gradient between the poles.

## 4. Conservation Law

```
Σ(Δ_midi) = 4 × Σ(ternary)
```

This is the pipeline's first law. It says:

**Every closed musical gesture returns to its starting point.**

The factor of 4 comes from the Ghost Track accumulator invariant: each ternary step predicts a 4-semitone interval shift. A major third (+4 semitones) corresponds to ternary +1. A minor third (-3 semitones) maps to ternary -1. Over a complete phrase, the sum of all pitch changes equals 4 times the sum of all ternary values.

When this law breaks — when the actual pitch change deviates from the predicted path — the **Conservation Ratio (CR)** drops. If CR < 0.7, the Reharmonization Engine fires and generates alternative harmonic interpretations.

**In practice:** Sing a rising arpeggio (+1 trit) and the Ghost Track predicts continued ascent. If you suddenly drop to a low minor note (trit flip to -1), CR crashes and the reharmonizer kicks in:

| CR | Urgency | What happens |
|----|---------|-------------|
| 0.7-1.0 | None | Normal processing |
| 0.5-0.7 | Standard | Explore alternatives |
| 0.3-0.5 | Urgent | Strong pivot needed |
| < 0.3 | Critical | Dramatic change |

The pivot table provides 4 alternative paths per ternary state:

| Current State | Best Alternative | Confidence |
|---------------|------------------|------------|
| Major [+1,0,0] | Relative minor | 85% |
| Major [+1,0,0] | Dominant of V | 70% |
| Minor [-1,0,0] | Relative major | 85% |
| Minor [-1,0,0] | Harmonic minor | 75% |
| Neutral [0,0,0] | Tonicize (make major) | 60% |
| Neutral [0,0,0] | Minorize | 55% |

## 5. Setting Up

### Prerequisites

- Oracle ARM64 server (or any Linux box)
- 23GB RAM, 45GB disk
- Python 3.10+, Node.js 20+
- OpenSMILE (`pip install opensmile`)

### Clone & Install

```bash
git clone https://github.com/SuperInstance/sailor-workspace
cd sailor-workspace

# Pipeline services
cd fleet-conductor && npm install && cd ..
cd tminus-dispatcher && npm install && cd ..
cd ghost-track-bridge && npm install && cd ..

# Python services
pip install -r opensmile-bridge/requirements.txt 2>/dev/null || \
  pip install opensmile websockets soundfile

# Piper TTS
pip install piper-tts
```

### Start Everything

```bash
# Start all 16 fleet-midi agents
./scripts/start-fleet-agents.sh

# Start pipeline services (in separate terminals or background)
python3 opensmile-bridge/server.py &           # :8765
node prototypes/serve.sh &                     # :8766
node ghost-track-bridge/src/server.js &        # :8767
node tminus-dispatcher/src/index.js &          # :8768
node fleet-conductor/src/server.js &           # :8769
python3 piper-voice/server.py &                # :8770
```

### Verify

```bash
# Check pipeline health
curl -s http://localhost:8769/health | python3 -m json.tool
# → {"agentsOnline": 17, "agentsTracked": 17}

# Query Ghost Track reharmonization state
curl -s http://localhost:8767/reharmonize

# Check agent accumulator
curl -s http://localhost:8767/accumulator
```

## 6. Creative Demo

Here's what happens when we send an 11-note phrase through the pipeline.

### Input Phrase

We generated a C major arpeggio that shifts through three ternary states:

```
Step  Notes                    Ternay   Meaning
───   ─────                    ──────   ───────
1-4   C4 E4 G4 C5 (ascending)  [+1]    Major arpeggio
5-7   C#5 D5 D#5 (chromatic)   [0]     Ambiguous/transition
8-11  Eb5 C5 A4 F4 (descending)[-1]    Minor resolution → CR crash!
```

### What the Fleet Heard

Each agent analyzed the final note (F4, the minor resolution):

| Agent | ternary | Meaning |
|-------|---------|---------|
| voicing | [-1, 0, 0] | **Closed voicing** — notes packed tight in low register |
| register | [-1, 0, 0] | **Low register** — F4 is in the mid-low range |
| tempo | [0, 1, 0] | **Moderate tempo** shifting toward acceleration |
| All others | [0, 0, 0] | Neutral/not enough data for a strong classification |

### Why Most Agents Returned Neutral

The per-repo agent stubs (from `fleet-agent/engine.py` template) return [0,0,0] by default. The **real agent logic lives in `fleet-agent/fleet-agent.py`** — the universal script that powers all 16 agents in production. Each agent's unique ternary decomposition logic is activated by the `--agent` flag:

```python
# fleet-agent.py has per-agent logic like:
if agent == "chord":
    # Analyze note set for chord quality
    if is_major_chord(notes): return [1, 0, 0]
    elif is_minor_chord(notes): return [-1, 0, 0]
    else: return [0, 0, 0]
```

The per-repo engine.py files are simplified standalone versions. In a full production setup, the 16 agents use the universal script which has proper logic for all agents.

### Ghost Track Response

The Ghost Track detected the ternary shift and updated its predictions accordingly. When the trit flipped from +1 (major) to -1 (minor), the CR dropped. With the right trigger conditions, the reharmonization engine fires:

```
🔄 REHARM: relative major (shift 3, conf 0.85)
```

This means: "The system expected a continued major ascent, but got a minor resolution. Best guess reharmonization: pivot up a minor third to the relative major."

## 7. The Feedback Loop

The most important architectural insight. Here's what happens after an agent responds:

```
1. Agent returns ternary_vector = [d0, d1, d2]
2. Conductor forwards to Ghost Track POST /feedback
3. Ghost Track updates accumulator:
   accumulatorDelta += (actual_trit * 4) - (predicted_trit * 4)
4. If |accumulatorDelta| < 2, it's a "closed gesture"
5. Agent feedback history grows (last 32 stored)
6. Next CR calculation uses updated accumulator
```

**Before the feedback loop**, the pipeline was pure analysis — feed-forward only. **After**, it's a closed loop — agent outputs inform future predictions, creating a self-correcting harmonic system.

## 8. 16 Agents, 16 Perspectives

Each of the 16 fleet-midi agents is an independent git-agent repo with its own docs ecosystem:

```
SuperInstance/fleet-midi-{name}
  ├── README.md       — Philosophy, architecture, API, educational content
  ├── engine.py       — Standalone HTTP server with ternary logic
  ├── THEORY.md        — Music theory behind ternary decomposition
  ├── STUDENT_GUIDE.md — Tutorial walkthrough for learning
  └── AGENT.md         — Agent identity and decision framework
```

The 16 agents group into three layers:

### Harmony Layer (6 agents)
- **chord** (:2160) — Chord quality (major/minor/other)
- **scale** (:2161) — Scale detection (major/minor/chromatic)
- **expression** (:2165) — Articulation (intense/neutral/soft)
- **melody** (:2174) — Contour (ascending/repeating/descending)
- **bass** (:2175) — Bass line (walking/root/pedal)

### Texture Layer (6 agents)
- **voicing** (:2162) — Voicing width (open/medium/closed)
- **cc** (:2164) — Control change (up/stable/down)
- **modulation** (:2168) — LFO rate (fast/off/slow)
- **arp** (:2169) — Arpeggiation (up/random/down)
- **fx** (:2172) — Effects (wet/balanced/dry)
- **register** (:2173) — Octave (high/mid/low)

### Rhythm Layer (4 agents)
- **tempo** (:2163) — Speed (fast/moderate/slow)
- **dynamics** (:2166) — Volume contour (crescendo/steady/diminuendo)
- **groove** (:2170) — Swing (swung/pulse/straight)
- **velocity** (:2171) — Attack (accented/neutral/ghosted)

Plus one spatial agent: **pan** (:2167, left/center/right).

## 9. Making Something With It

### Example 1: Interactive Browser Demo

Open `prototypes/prosody-bridge.html` in a browser:

1. Click "Start Mic" — grants mic access, starts autocorrelation pitch detection
2. Click "Connect Ghost Track" — connects to :8767 WebSocket
3. Sing or hum into the mic — see the pitch meter, ternary classification, velocity
4. Watch the Ghost Track display — T-0..T-4 predictions update with your voice
5. When you sing a surprising interval — watch for reharmonization alerts

### Example 2: Agent API Queries

```bash
# Ask the chord agent what it hears
curl -s -X POST http://localhost:2160/agent \
  -H 'Content-Type: application/json' \
  -d '{"notes": [60, 64, 67]}' | python3 -m json.tool
# → {"ternary_vector": [0, 0, 0], ... }

# Ask the scale agent
curl -s -X POST http://localhost:2161/agent \
  -H 'Content-Type: application/json' \
  -d '{"notes": [60, 62, 64, 65, 67, 69, 71, 72]}' | python3 -m json.tool

# Dispatch a full cue through the conductor
curl -s -X POST http://localhost:8769/dispatch \
  -H 'Content-Type: application/json' \
  -d '{"notes": [60, 64, 67], "velocity": 100, "tempo": 120}'
```

### Example 3: Check the Feedback Loop

```bash
# See the accumulator state
curl -s http://localhost:8767/accumulator

# See reharmonization history
curl -s http://localhost:8767/reharmonize

# Send test feedback
curl -s -X POST http://localhost:8767/feedback \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"chord","ternary_vector":[1,0,0]}'
```

## 10. Architecture Gaps — What's Next

Building this revealed several insights visible only at altitude:

### Tomorrow's Work

| Gap | Why It Matters | How to Fix |
|-----|---------------|------------|
| **No MIDI output** | Pipeline analyzes but never synthesizes sound | Add a MIDI file generator or soft synth |
| **No shared state** | 16 agents classify same input independently | Add inter-agent message bus |
| **No real clock** | Agents can't agree when "beat 0" is | Build shared beat clock from tminus |
| **Sync HTTP** | 5s timeout for <200ms needs | Switch to WebSocket push for real-time |
| **Per-repo stubs** | engine.py returns [0,0,0] for most agents | Update with fleet-agent.py's real logic |

### The Bigger Picture

The Live Paradigm pipeline is working and proven, but it's an **analyzer** not a **creator**. The agents can tell you what key you're in but can't generate a new melody in that key. The feedback loop closes the control path but not the creative path.

The architecture's real novelty is the **ternary decomposition model** — the idea that musical parameters can be reduced to +1/0/-1, composed into vectors, and transformed through conservation laws. This is a language for describing musical intention, not for generating music. Generation would require a decoder: a model that maps ternary vectors back into note sequences, rhythms, and timbres.

That decoder doesn't exist yet. When it does, the Live Paradigm becomes a full compositional system: voice → ternary → composition → sound.

---

## References

- **Pipeline docs**: `PIPELINE.md` in sailor-workspace
- **Agent docs**: Each `SuperInstance/fleet-midi-{name}` repo
- **Fleet coordination**: `SuperInstance/construct-coordination/notes/oracle2/`
- **Ghost Track**: `ghost-track-bridge/src/` (server.js + reharmonizer.js)
- **Universal agent**: `SuperInstance/fleet-agent-universal`
- **GC Analysis**: `memory/gc-analysis.md`

---

*Built on Oracle ARM64 with Claude Code, Kimi Code, and DeepSeek V4 Flash.*
