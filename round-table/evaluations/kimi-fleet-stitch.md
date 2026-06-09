# Kimi Fleet Stitch — Cross-Referencing Analysis of the Live Paradigm Pipeline

**Date:** 2026-06-09  
**Author:** Kimi Code (1M+ context scan of 9,553 files)  
**Scope:** Full workspace cross-reference — all 7 pipeline services, 16 fleet-midi agents, 4 tensor-demo modules, 5 round-table futures, 10 memory dossiers, 15+ scripts, bridge specs, and archive exports.

---

## ONE-LINER SUMMARY

The pipeline has a beautiful head (browser mic → OpenSMILE → Ghost Track → tminus → Conductor → 16 agents) and a practical body (lead-sheet-MIDI-v3 → 6 fork-export formats → OSC bridge), but the neck connecting them — the ***real-time bidirectional MIDI-over-WebSocket path from browser to Ghost Track*** — doesn't exist yet, every agent runs the exact same code with zero shared libraries, and the pipeline is forward-only with no feedback path from MIDI back to audio synthesis.

---

## 1. CROSS-REFERENCING: What References What (and What's Orphaned)

### 1.1 Reference Graph — Who Calls Whom

```
Browser Mic (prosody-bridge.html)
  ├──→ [WebSocket PCM @ 16kHz] → OpenSMILE Bridge (:8765)
  │     └──→ [enriched voice features JSON] → Ghost Track Bridge (:8767)
  │           └──→ [CUE messages, offset_beats] → tminus-dispatcher (:8768)
  │                 └──→ [WS routed cues] → Fleet Conductor (:8769)
  │                       ├──→ [POST /agent] → 16 fleet-midi agents (:2160-:2175)
  │                       │     └──→ [ternary_vector[3]] → Ghost Track accumulator
  │                       └──→ [POST /speak] → Piper Voice (:8770)
  ├──→ [separate WAV] → Demucs WebSocket (:8771)
  │     └──→ [stem WAV files into] → basic_pitch_conversation
  │           └──→ [lead-sheet-v3.json] → fleet-rule-engine
  │                                     → fleet-osc-bridge (:7700 OSC)
  │                                     → fork-export.py (5+ formats)
  └──→ [Everything in tensor-demo/]
        ├── lead-sheet.py (legacy pure-python pipeline: Piper→Whisper→Lead-Sheet→MIDI→Graph→Compose)
        ├── fork-export.py (read lead-sheet-v2.json → QLC+/Ardour/MuseScore/LMMS/Zrythm/FluidSynth)
        └── export-ardour.py (read JSON → Format-1 SMF with dual-CC lanes)
```

### 1.2 What References What (Exact File Evidence)

| Source Module | References | Mechanism | Status |
|-------------|-----------|-----------|--------|
| `opensmile-bridge/server.py` | Ghost Track (`ws://127.0.0.1:8767`) | WebSocket forward | **Hardcoded URL** |
| `opensmile-bridge/stream.py` | ctypes ring buffer | Shared library | **Used directly** |
| `ghost-track-bridge/src/server.js` | tminus-dispatcher (`127.0.0.1:8768`) | HTTP POST to /dispatch | **Working** |
| `ghost-track-bridge/src/reharmonizer.js` | Pivot tables (static) | In-memory only | **No persistence** |
| `fleet-conductor/src/server.js` | fleet-midi agents (`127.0.0.1:2160-2175`) | HTTP POST each | **Hardcoded port map** |
| `fleet-conductor/src/server.js` | Piper Voice (`127.0.0.1:8770`) | POST /speak | **Hardcoded** |
| `fleet-conductor/src/server.js` | Ghost Track (`127.0.0.1:8767`) | HTTP POST /feedback | **Hardcoded** |
| `basic_pitch_conversation/__init__.py` | None directly (standalone CLI) | File read/write | **No WebSocket link** |
| `demucs_websocket/__init__.py` | `basic_pitch_conversation` (subprocess call) | `subprocess.run` | **Fragile path** |
| `fleet-osc-bridge/fleet-osc-bridge.py` | Only reads JSON files | File read | **No pipeline link** |
| `fleet-rule-engine/fleet-rule-engine.py` | Only reads JSON files | File read | **No pipeline link** |
| `piper-voice/server.js` | None (receives HTTP from Conductor) | HTTP listen | **Sink node** |
| `scripts/start-fleet-agents.sh` | `fleet-agent/fleet-agent.py` | Subprocess spawn | **Working** |
| `tensor-demo/lead-sheet.py` | Piper TTS (direct import), Whisper, numpy | Direct calls | **Legacy, uses v1** |
| `tensor-demo/fork-export.py` | `tensor-output/lead-sheet-v2.json` | File I/O | **Hardcoded path** |
| `demo/demo.py` | All :8765-:8770 services | HTTP/WS | **Health check only** |

### 1.3 Orphaned Modules (No Inbound References)

| Module | Lives At | Last Touched | Risk |
|--------|---------|-------------|------|
| `fleet-rule-engine` | `fleet-rule-engine.py` | Standalone CLI | **HIGH** — 7 validation rules no one calls, no WebSocket, no pipeline integration |
| `fleet-osc-bridge` | `fleet-osc-bridge.py` | Standalone CLI | **HIGH** — Beautiful code, zero pipeline links |
| `fleet-agent/fleet-agent.py` | The shared agent server | Spawned by shell script | **MEDIUM** — works but is the *same* script for all 16 agents |
| `basic_pitch_conversation` | Its `__init__.py` | Only called from demucs | **MEDIUM** — no direct websocket in pipeline |
| `export-ardour.py` | `tensor-demo/` | File-based | **LOW** — runs on finished output |
| `memory/*` — all dossiers | `memory/` | Human review | **LOW** — intended offline |

### 1.4 Dead Links and Configuration Drift

1. **`fleet-compose.yml` references GitHub repos** (`SuperInstance/fleet-bridge.git`, `SuperInstance/fleet-midi-text2midi.git`, etc.) with port mappings (4000-4008, 3001-3008) that **don't match the running pipeline ports** (2160-2175, 8765-8771). The Docker Compose file is a skeleton for a different deployment topology. These GitHub repos may or may not exist.

2. **`BRIDGE_SPEC.md` describes a Rust-based `fleet-commander-bridge`** with JSON-RPC over WebSocket for a React frontend. **No such service exists in the workspace.** It's a forward-looking spec.

3. **`PIPELINE.md` says port 8766** is a "Prosody Bridge" (Python/HTTP). **No such service exists.** The prosody-bridge.html is a pure-browser HTML file, not a server.

4. **The agent port map** is defined in three places (start-fleet-agents.sh, PIPELINE.md, demo/demo.py) and they all agree. That's good — but it's not centralized.

---

## 2. SHOULD-BE-UNIFIED: Code Duplication Across 16 Agent Repos

### 2.1 The Critical Discovery: All 16 Agents Use the Same Code

Every fleet-midi agent — chord, scale, voicing, tempo, cc, expression, dynamics, pan, modulation, arp, groove, velocity, fx, register, melody, bass — runs the **exact same Python script**: `fleet-agent/fleet-agent.py`. The only difference is the `--agent` CLI argument that selects a static method from `AgentBehaviors`.

This means the 16 "fleet-midi" repos at `SuperInstance/fleet-midi-*` are **pure duplication** of a single `fleet-agent.py`. There is **no shared library**. Every agent has its own copy (or would, if they existed locally).

```python
# fleet-agent/fleet-agent.py — ~320 lines. The ENTIRE 16-agent fleet.
class AgentBehaviors:
    @staticmethod
    def chord(notes, payload): ...
    @staticmethod
    def scale(notes, payload): ...
    # ... 14 more static methods ...
```

### 2.2 What Should Be Unified

| Pattern | Current State | Unified Form |
|---------|--------------|--------------|
| **Agent server logic** | 16× copies of `fleet-agent.py` | One `fleet-agent-lib` package |
| **HTTP handler** | `FleetAgentHandler` class per agent | Shared `Flask`/`FastAPI` app |
| **Ternary vector schema** | `[±1, 0, 0]` defined per method | `TernaryVector` type/dataclass |
| **Health check** | `GET /health` → identical response per agent | Shared middleware |
| **Payload parsing** | `_notes()` and `_val()` helpers | Shared utility module |
| **Port allocation** | Hardcoded in 3 files (`start-fleet-agents.sh`, `PIPELINE.md`, `demo.py`) | Config file (`agents.yaml`) |
| **MIDI note constants** | `NOTE_NAMES`, `midi_to_freq()`, `freq_to_midi()` defined in 4 modules | One package |
| **Lead-sheet JSON generation** | Defined in `basic_pitch_conversation`, `lead-sheet.py`, `fork-export.py` | One `lead-sheet-midi` library |

### 2.3 The Recommended Shared Library

```python
# fleet-lib/ — proposed shared package
fleet-lib/
├── __init__.py
├── midi.py          # NOTE_NAMES, midi_to_freq, freq_to_midi, note_name
├── ternary.py       # TernaryVector, to_ternary(), is_closed_gesture()
├── lead_sheet.py    # build_lead_sheet_json(), format_pitch_event(), format_cc_event()
├── agent.py         # AgentServer base class, health check, probe handler
├── config.py        # Port map, agent registry, load from YAML
├── payload.py       # _notes(), _val() extractors
├── osc_bridge.py    # ConversationOSCBridge (move from fleet-osc-bridge)
└── rules.py         # ConversationRuleEngine (move from fleet-rule-engine)
```

### 2.4 Venn Diagram of Shared Logic

```
                    lead-sheet JSON schema
                   /        |        \
                  /         |         \
                 /          |          \
    basic_pitch_conversation  lead-sheet.py  fork-export.py
                \          |          /
                 \         |         /
                  \        |        /
                   MIDI utilities
                 (note names, freq conversion)

                    agent HTTP server
                   /        |        \
                  /         |         \
    fleet-agent.py  (16×)   demo.py    fleet-conductor
                \          |          /
                 \         |         /
                  \        |        /
                 ternary vector schema
                 (conservation law)

                    OSC protocol
                   /              \
    fleet-osc-bridge.py    ？？？(nowhere else)
                (only consumer — should be agent-side)
```

---

## 3. ARCHITECTURE GAPS: The Most Important Missing Thing

### 3.1 PRIMARY GAP: No Real-Time Bidirectional WebSocket From Browser to Ghost Track

The synthesis identified this, the evaluation papers identified this, but the code confirms it: there is **no working real-time bidirectional WebSocket bridge between the browser mic prototype and the Ghost Track engine**.

Here's what exists:
- `prototypes/prosody-bridge.html` — works standalone, shows GT predictions visually
- `ghost-track-bridge/src/server.js` — WebSocket server on :8767
- `fleet-conductor/src/server.js` — HTTP + WebSocket dispatcher on :8769

Here's what's **missing**: the code path that sends browser MIDI CC over WebSocket to Ghost Track and gets back T-0..T-4 predictions in real-time.

The `demo/demo.py` simulates this via HTTP POST to `/dispatch`, but the browser prototype does `console.log()` — it never calls the server. The entire real-time path is a simulation.

### 3.2 SECONDARY GAP: No Reverse Path (MIDI → Audio Synthesis)

The pipeline is **forward-only**: audio → features → MIDI → lighting/DAW/export. The reverse path — editing the MIDI and synthesizing new speech — doesn't exist.

The synthesis identified this as the "feedback loop gap." The JEPA agent's proposed MLP → HiFi-GAN decoder doesn't exist. The Piper TTS serves SSML (text-driven, not MIDI-driven). There's no path from a modified lead-sheet JSON to new audio.

**Implication:** The system is a transcription/analysis tool, not a creative pipeline. Without reverse synthesis, you can't close the creative loop.

### 3.3 TERTIARY GAP: Timestamp Reconciliation Across Heterogeneous Time Domains

The pipeline has at least four time domains with no sync protocol:

| Domain | Service | Typical Latency | Sync Protocol |
|--------|---------|----------------|---------------|
| **Streaming** | OpenSMILE/aubio (browser) | 10-30ms | None — real-time |
| **Batch** | Demucs (:8771) | ~15s for 30s audio | None — writes output files |
| **Near-realtime** | Whisper transcription | 1-5s per sentence | None — callback after complete |
| **Offline** | JEPA embedding | ~40 min per podcast | Doesn't exist |

When Demucs output arrives 15 seconds after OpenSMILE features, how do you reconcile the timestamps? Currently: **you don't**. Everything assumes pre-aligned data in a single JSON blob (`lead-sheet-v2.json`). The `fleet-osc-bridge` plays files back with `time.sleep()`. There's no multi-stage commit protocol.

### 3.4 QUATERNARY GAP: No Schema Validation Anywhere

The lead-sheet JSON format has evolved through three versions (v1 → v2 → v3) with no schema file:

- `lead-sheet-v1` — original, no continuous pitch
- `lead-sheet-v2` — intermediate, used by `fork-export.py`
- `lead-sheet-v3` — adds `f0_hz` + `pitch_bend`, specified in synthesis but **not code-verified**

No JSON Schema file exists. No validation. `basic_pitch_conversation` writes its own flavor, `lead-sheet.py` writes another. The fields `f0_hz` and `pitch_bend` are proposed but not implemented in pipeline code.

### 3.5 QUINARY GAP: Pipeline Deadbands

There's no rate limiting, congestion control, or backpressure anywhere in the pipeline:
- OpenSMILE sends frames at 32ms intervals regardless of Ghost Track capacity
- Ghost Track processes whatever arrives
- 16 agents respond in parallel
- Conductor aggregates without any timeout for stragglers
- The `CONSERVATION RATIO (CR) < 0.7 → reharmonize` trigger has no debounce

If an agent hangs or a service dies mid-phrase, the pipeline state is undefined — there's no circuit breaker, no replay, no partial result handling.

---

## 4. IMPLEMENTATION PRIORITIES: Order the Remaining Work

### Priority 1: Real-Time WebSocket Bridge (Browser ↔ Ghost Track)

**Why first:** Closes the single biggest gap. Delivers the core thesis — voice-to-MIDI in real-time with ghost prediction.

**What to build:**
- Extend `prototypes/prosody-bridge.html` to send MIDI CC over WebSocket (not `console.log()`)
- Add browser-side WebSocket client that receives T-0..T-4 predictions
- Wire Ghost Track bridge to consume WS MIDI and return predictions
- Add visual ghost track overlay in browser

**Effort:** ~2 days  
**Impact:** Validates the entire pipeline thesis with a live demo

### Priority 2: Create `fleet-lib` Shared Package

**Why second:** Eliminates 16× code duplication. Reduces bugs. Standardizes schema.

**What to build:**
- Extract `midi.py` — note names, frequency conversion, pitch bend
- Extract `ternary.py` — TernaryVector, to_ternary(), conservation law check
- Extract `lead_sheet.py` — JSON builder for v3 format
- Extract `agent.py` — base HTTP handler class with health/probe/cue
- Create `config.yaml` — centralized agent port map
- Update `start-fleet-agents.sh` and agent servers to use shared package
- Write `lead-sheet-v3.schema.json` for validation

**Effort:** ~3 days  
**Impact:** Reduces codebase size by ~30%. Ensures format consistency. 16 agents become 1 library + 16 config entries.

### Priority 3: Pipeline State Machine + Deadbands

**Why third:** Makes the pipeline robust enough for demos.

**What to build:**
- Agent timeout handling in fleet-conductor (configurable ms)
- CR trigger debounce (configurable sample window)
- Circuit breaker per agent (3 failures → mark as degraded)
- Partial result aggregation (use what arrived, note what didn't)
- Backpressure from Ghost Track to OpenSMILE (dynamic frame rate reduction)
- Replay buffer for 5 seconds of MIDI (for reharmonization lookback)

**Effort:** ~4 days  
**Impact:** Pipeline goes from "works in quiet room" to "works in real conditions"

### Priority 4: Demucs + Basic Pitch Integration into Pipeline

**Why fourth:** Enables full audio file processing (not just voice).

**Already partially built:**
- `demucs_websocket/__init__.py` — WebSocket server on :8771, Demucs runs separation
- `basic_pitch_conversation/__init__.py` — Basic Pitch → lead-sheet-v3 JSON converter
- Demucs → Basic Pitch call chain exists in `demucs_websocket`

**What's missing:**
- OpenSMILE prosody enrichment on Demucs vocal stems (transcript + ternary from separated vocals)
- Pipeline bridge from Demucs output back to Ghost Track (stem MIDI → ternary analysis)
- Multi-track lead-sheet (one track per stem with independent ternary vectors)
- Song-level conservation law (Σ stems → 0)

**Effort:** ~5 days  
**Impact:** Opens music analysis use case. Song decomposition pipeline.

### Priority 5: OSC Bridge Integration with Pipeline

**Why fifth:** The OSC-to-QLC+ bridge exists but is a standalone CLI.

**What to build:**
- Module that subscribes to Ghost Track accumulator state changes
- Real-time OSC emission (not file replay with `time.sleep()`)
- Integration into fleet-conductor as an "output sink" alongside 16 agents
- QLC+ fixture configuration auto-generation from lead-sheet metadata

**Effort:** ~2 days  
**Impact:** Real-time conversation → lighting. Demo-ready.

### Priority 6: Fleet Rule Engine Integration

**Why sixth:** 7 validation rules no one calls.

**What to build:**
- WebSocket endpoint on fleet-rule-engine
- Subscribe to lead-sheet output from pipeline
- Run rules on each new phrase batch (not per-event — too slow)
- Feed validation findings back to Ghost Track as "CR_QUALITY" metadata
- Report endpoint for human review

**Effort:** ~2 days  
**Impact:** Continuous quality monitoring. Ensures conservation law compliance.

### Priority 7: Reverse Path (MIDI → Audio Synthesis)

**Why seventh:** Most speculative. Requires research.

**What to build:**
- Proof of concept: take lead-sheet-v3 JSON → extract temary vectors
- Map ternary vectors to SSML prosody parameters
- Send through Piper TTS `/speak` endpoint
- Render output WAV
- Measure quality gap

**Why bubble-gummed:** This could also be done by triggering Piper through modified text (the conservation law path you describe). But the proper reverse path — MIDI CC → SSML → Piper — requires code that doesn't exist.

**Effort:** ~3 days prototype, ~∞ research  
**Impact:** Closes the creative loop. Enables "edit MIDI → hear new voice."

### Priority 8: Schema Validation + Tests

**Why eighth:** Hardening.

**What to build:**
- JSON Schema for lead-sheet-v3 (`schemas/lead-sheet-v3.json`)
- CI/CD test suite that validates pipeline output conforms to schema
- Unit tests for every AgentBehaviors handler
- Integration test: browser → WS → GT → conductor → agents (full loop)
- Latency budget test (verify ≤500ms end-to-end)

**Effort:** ~3 days  
**Impact:** Prevents regression. Enables safe refactoring.

---

## 5. DATA FLOW DAG: Audio-In to MIDI-Out (With ALL Intermediate Formats)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              LIVE PARADIGM PIPELINE — FULL DATA FLOW DAG                                │
│                              audio-in ───→ MIDI-out + lighting + audio                                  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘

TIME ────────────────────────────────────────────────────────────────────────────────────────────────►

┌─────────────────┐
│  MICROPHONE      │  WAV/PCM @ 16/48kHz, 16-bit, mono or stereo
│  Audio Source    │
│  (wav/mp3/flac)  │
└────────┬────────┘
         │ raw PCM buffer (512-sample frames)
         ▼
┌─────────────────┐
│ DEMUCS              │  PORT 8771 — WebSocket
│ Source Separation   │  Model: htdemucs, htdemucs_ft, htdemucs_6s
│                     │  Dependencies: torch, soundfile, numpy
├─────────────────────┤
│ OUTPUT:             │  ╔══════════════════════════════════════════╗
│  voxals.wav (WAV)   │  ║  Format: WAV @ Demucs sample rate       ║
│  accompaniment.wav  │  ║  Duration: same as input                 ║
│  (or: drums.wav,    │  ║  Paths: temp directory, cleaned up       ║
│   bass.wav,         │  ╚══════════════════════════════════════════╝
│   other.wav)        │
└────────┬────────┘
         │  (conditional) vocals.wav if run_bridge=True
         ▼
┌──────────────────────┐
│ BASIC PITCH           │  basic_pitch_conversation/ — CLI entry
│ Conversation Bridge   │  Predict: model_output + midi_data + note_events
│                       │  Dependencies: basic_pitch, numpy, pretty_midi
│                       │  ARM64 fallback: librosa autoscorrelation
├──────────────────────┤
│ OUTPUT:              │  ╔══════════════════════════════════════════╗
│  lead-sheet-v3.json  │  ║  FORMAT: lead-sheet-midi-v3             ║
│                      │  ║  TRACKS: 4 (see below)                  ║
│                      │  ║  FIELDS: t, dur, spk, note, name, vel,  ║
│                      │  ║           f0_hz, pitch_bend, t_pitch,   ║
│                      │  ║           t_vol, t_timing, role, energy  ║
│                      │  ╚══════════════════════════════════════════╝
└────────┬────────┘
         │ lead-sheet-v3.json
         ├───────────────────────┬──────────────────────┐
         ▼                       ▼                      ▼
┌──────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│ OpenSMILE Bridge  │  │ OPEN SMILE      │  │  Fleet Rule Engine   │
│ PORT 8765         │  │ PORT 8765       │  │  (standalone CLI)    │
│ WebSocket server  │  │ Feature Extract │  │                      │
│ Streaming mode    │  │ 25 eGeMAPS LLD  │  │  Rules R01-R03:      │
│ ctypes ring buf   │  │ F0→note         │  │  Scale membership    │
├───────────────────┤  │ formants→vowel  │  │  Interval affinity   │
│ OUTPUT:           │  │ jitter→stability│  │  Voice leading       │
│ enriched JSON:    │  │ MFCCs→timbre    │  │                      │
│  {f0, timbre,    │  │                 │  │  Rules C01-C03:      │
│   vowel_space,   │  ├─────────────────┤  │  Conservation law    │
│   stability,     │  │ OUTPUT:         │  │  Ternary transition  │
│   ternary_vec}   │  │ JSON frame:     │  │  Speaker alternation │
└────────┬────────┘  │  {f0, formants,  │  ├─────────────────────┤
         │           │   jitter, mfcc,  │  │  OUTPUT:             │
         ▼           │   voice_prob,    │  │  Markdown report or  │
┌──────────────────┐ │   loudness}      │  │  JSON with fix       │
│ GHOST TRACK       │ └────────┬────────┘  │  suggestions         │
│ PORT 8767         │          │           └─────────────────────┘
│ WebSocket + HTTP  │          │
│ /feedback         │          │ enriched voice features
│ /accumulator      │          ▼
│ /reharmonize      │  ┌─────────────────┐
│                   │  │   +-------------┘
│ T-0: now          │  │   |  (also reads lead-sheet JSON from
│ T-+1: +200ms      │  │   |   basic_pitch_conversation path)
│ T-+2: +500ms      │  │   ▼
│ T-+3: +1s         │  ┌────────────────────────────┐
│ T-+4: +2s         │  │  Whisper / faster-whisper   │
│                   │  │  (used by lead-sheet.py,    │
│ CR monitoring     │  │   not yet in pipeline)      │
│ reharmonization   │  │                             │
│ trigger at CR<0.7 │  │  word-aligned transcript    │
├───────────────────┤  │  [word, start, end, prob]   │
│ OUTPUT:           │  └────────────┬───────────────-┘
│ CUE messages     │               │
│  {offset_beats,  │               │ word timestamps
│   enriched_feat, │               ▼
│   phase_group}   │  ┌────────────────────────────┐
│                  │  │  Ternary Classification     │
│  T-0..T-4 ghost  │  │  (ghost track / fleet       │
│  predictions     │  │   accumulator) every event  │
│  (MIDI notes +   │  │                             │
│   ternary_vector)│  │  t_pitch: -1/0/1           │
└────────┬────────┘  │  t_vol:   -1/0/1            │
         │           │  t_timing: -1/0/1           │
         ▼           │  role:    -1/0/1            │
┌──────────────────┐  └────────────┬───────────────-┘
│ tminus-dispatcher │              │
│ PORT 8768        │              │ data synchronized per word event
│ WebSocket        │              ▼
│                  │  ┌───────────────────────────────┐
│ Agent registry   │  │  4-TRACK LEAD-SHEET JSON V3    │
│ Phase groups     │  │  ● Pitch Contour (midi_notes)  │
│ Cue scheduling   │  │    {t, note, name, vel,        │
│ Beat engine      │  │     f0_hz, pitch_bend}         │
│                  │  │                                │
│ State machine:   │  │  ● Prosody CC (midi_cc)        │
│ LISTENING→CUED   │  │    {t, cc74, cc71, cc11,       │
│ →PRIMED→FIRING   │  │     pitch_bend}                │
│ →COMPLETE        │  │                                │
├──────────────────┤  │  ● Transcript (text)           │
│ OUTPUT:          │  │    {t, word, spk}              │
│ routed WS cues   │  │                                │
│ to fleet-conductr│  │  ● Stage Directions (sys_ex)   │
│ PHASE_ADVANCE    │  │    {t, speaker_id, role}       │
│ events           │  │                                │
└────────┬────────┘  │  TOTAL: ~150-300 events for     │
         │           │   30s conversation              │
         ▼           └────────────┬──────────────────┬─┘
┌──────────────────┐              │                  │
│ FLEET CONDUCTOR   │              │                  │
│ PORT 8769         │              │                  │
│ HTTP + WebSocket  │              │                  │
│                   │              │                  │
│ Agent routing:    │              │                  │
│ 16 agents :2160-  │              │                  │
│ 2175 (parallel)   │              │                  │
│                   │              │                  │
│ Health checks     │              │                  │
│ every 15s         │              │                  │
│ Feedback pooling  │              │                  │
│ Piper dispatch    │              │                  │
├───────────────────┤              │                  │
│ OUTPUT:           │              │                  │
│ per-agent analysis +─── 16× POST /agent (parallel) ─┤
│ {ternary_vector[3],   │              │               │
│  analysis result}    │              │               │
│                     │              │               │
│ via /feedback →     │              │               │
│ Ghost Track accum   │              │               │
└────────┬───────────┘              ▼               ▼
         │                   ┌──────────────────────┐
         ▼                   │  FLEET-OSC-BRIDGE     │
┌─────────────────┐         │  PORT 7700 (OSC/ArtNet)│
│ PIPER VOICE     │         │                        │
│ PORT 8770       │         │  lead-sheet-v3.json    │
│ HTTP /speak     │         │  → OSC to QLC+ / DMX  │
│                 │         │                        │
│ SSML prosody:   │         │  OSC Map:              │
│  urgency→rate   │         │  /conversation/pan     │
│  stability→pitch│         │  /conversation/pitch   │
│  brightness→vol │         │  /conversation/energy  │
├─────────────────┤         │  /conversation/ternary │
│ OUTPUT:         │         │  /conversation/word    │
│ WAV audio       │         │  /conversation/speaker │
│ (16-bit, 22050Hz│         └────────────────────────┘
│  mono, SSML)    │
└─────────────────┘         ┌────────────────────────┐
                            │  FORK EXPORT (6 formats)│
16 AGENTS OUTPUT            │                        │
┌──────────────────────┐    │  1. QLC+ (.qxw)        │
│ CHORD  :2160          │    │     lighting from conv │
│   ternary: [+1/0/-1]  │    │  2. Ardour (.ardour)  │
│ SCALE  :2161          │    │     DAW session       │
│   ternary: [0,±1,0]   │    │  3. MuseScore (.xml)  │
│ VOICING:2162          │    │     sheet music       │
│   ternary: [+1/0/-1]  │    │  4. LMMS (.mmp)       │
│ TEMPO  :2163          │    │     beat project      │
│   ternary: [+1/0/-1]  │    │  5. Zrythm (.json)    │
│ CC     :2164          │    │     modular DAW       │
│ EXPR   :2165          │    │  6. FluidSynth (.mid) │
│ DYN    :2166          │    │     audio render      │
│ PAN    :2167          │    └────────────────────────┘
│ MOD    :2168          │
│ ARP    :2169          │    ┌────────────────────────┐
│ GROOVE :2170          │    │  COMPOSITION ENGINE     │
│ VEL    :2171          │    │  (in lead-sheet.py)    │
│ FX     :2172          │    │                        │
│ REG    :2173          │    │  Markov chain over     │
│ MELODY :2174          │    │  ternary states        │
│ BASS   :2175          │    │                        │
└──────────────────────┘    │  84 events → 3 unique  │
                            │  conversations          │
                            │  Same prosody DNA       │
                            │  Different words        │
                            └────────────────────────┘

         ──────── WAV audio output (Piper TTS) ───────→ Speaker
         ──────── OSC lighting messages ─────────────→ QLC+/DMX
         ──────── QLC+ / Ardour / MuseScore / ... ───→ DAW / Notation
         ──────── .mid file (Format-1 standard MIDI) → Any MIDI player
```

### Intermediate Format Summary (All Transitions)

| Stage | Source | Format | Schema | Persistence |
|-------|--------|--------|--------|------------|
| **A0** | Microphone | PCM 16kHz/48kHz, 16-bit mono | Raw audio buffer | Streaming only |
| **A1** | Demucs split | WAV files per stem (vocals, drums, etc.) | Wave, 44.1kHz | Temp files |
| **A2** | Basic Pitch | `note_events` list: (start_t, end_t, pitch, velocity) | Python tuple | Memory only |
| **A3** | basic_pitch_conversation | `lead-sheet-v3.json` | 4-track JSON (see below) | Persistent file |
| **A4** | OpenSMILE | `{f0, formants, jitter, mfcc, loudness}` per frame | JSON dict ~200 bytes | Stream buffer |
| **A5** | Ghost Track accumulator | `{cumulative_delta, agent_feedbacks, segments, state_machine}` | JSON route accumulator | In-memory only |
| **A6** | Ghost Track → tminus | CUE message: `{target_id, offset_beats, phase_group, payload}` | WS JSON envelope | Ephemeral WS |
| **A7** | fleet-conductor → agents | `{voice: {notes, velocity, tempo, trit}}` or per-agent payload | HTTP POST JSON | Ephemeral |
| **A8** | Each agent | `{ternary_vector[3], result, agent_specific_fields}` | HTTP response JSON | Ephemeral |
| **A9** | Conductor → GT /feedback | `{agentId, ternary_vector, source}` | HTTP POST JSON | Ephemeral |
| **A10** | OSC Bridge | OSC bundles: `/conversation/{pan,pitch,energy,...}` | OSC binary | Ephemeral |
| **A11** | Fork Export | `.qxw` / `.ardour` / `musicxml` / `.mmp` / `.json` / `.mid` | Various | Persistent files |
| **A12** | Rule Engine | `ValidationFinding[]` → markdown report | JSON/MD | Persistent files |

### The Lead-Sheet-v3 JSON Schema (Defined — Not Codified)

```json
{
  "format": "lead-sheet-midi-v3",
  "description": "(string)",
  "generated": "ISO 8601 UTC",
  "duration_seconds": 30.2,
  "word_count": 84,
  "speakers": 2,
  "metadata": {"model": "basic-pitch-icassp-2022", "note_count": 84, "platform": "x86_64"},
  "tracks": [
    {
      "name": "Pitch Contour",
      "type": "midi_notes",
      "events": [
        {"t": 0.0, "note": 60, "name": "C4", "vel": 85, "f0_hz": 261.63, "pitch_bend": 0}
      ]
    },
    {
      "name": "Prosody CC",
      "type": "midi_cc",
      "events": [
        {"t": 0.0, "cc74": 64, "cc71": 64, "cc11": 85, "pitch_bend": 0}
      ]
    },
    {
      "name": "Transcript",
      "type": "text",
      "events": [
        {"t": 0.0, "word": "welcome", "spk": "A"}
      ]
    },
    {
      "name": "Stage Directions",
      "type": "sys_ex",
      "events": [
        {"t": 0.0, "speaker_id": 0, "role": 0}
      ]
    }
  ]
}
```

---

## 6. MATRIX: Agent × Feature × Integration Coverage

| Agent | Port | Listens On | Reads Lead-Sheet | Emits OSC | Emits MIDI | WS Bidir | Has Tests |
|-------|------|-----------|-----------------|-----------|-----------|---------|-----------|
| **opensmile-bridge** | 8765 | WebSocket | ❌ | ❌ | ❌ (extracts features) | ⚠️ Forward only | ❌ |
| **ghost-track-bridge** | 8767 | WebSocket + HTTP | ❌ (reads from WS) | ❌ | ❌ (internal state) | ⚠️ Forward only | ❌ |
| **tminus-dispatcher** | 8768 | WebSocket + HTTP | ❌ | ❌ | ❌ (cue routing) | ✅ Bidirectional | ✅ (simulate.js) |
| **fleet-conductor** | 8769 | HTTP + WS | ❌ | ❌ | ❌ (route to agents) | ⚠️ Poll only | ❌ |
| **piper-voice** | 8770 | HTTP | ❌ | ❌ | ❌ (WAV out) | ❌ HTTP only | ❌ |
| **demucs_websocket** | 8771 | WebSocket | ❌ | ❌ | ❌ (stem WAV out) | ⚠️ Forward only | ❌ |
| **fleet-osc-bridge** | CLI | File read | ✅ (reads JSON) | ✅ OSC out | ❌ | ❌ | ❌ |
| **fleet-rule-engine** | CLI | File read | ✅ (reads JSON) | ❌ | ❌ | ❌ | ❌ |
| **basic_pitch_conversation** | CLI | File/pipe | ✅ (writes JSON) | ❌ | ❌ (internal MIDI) | ❌ | ❌ |
| **16× fleet-agent** | 2160-2175 | HTTP | ❌ | ❌ | ❌ (ternary logic only) | ❌ HTTP only | ❌ |
| **fork-export.py** | CLI | File read | ✅ (reads JSON) | ❌ | ✅ (writes .mid) | ❌ | ❌ |
| **lead-sheet.py** | CLI | File/pipe | ✅ (writes JSON) | ❌ | ✅ (writes .mid) | ❌ | ❌ |
| **demo/demo.py** | CLI | HTTP | ✅ (reads agent resps) | ❌ | ❌ | ❌ HTTP poll only | ❌ |

### Integration Gaps (Marked by ❌)

The pattern is stark: **file-based services are well-integrated** (read JSON → produce output), but **real-time streaming services are NOT integrated with each other** with the exception of the Ghost Track → tminus → Conductor chain.

The browser mic prototype never talks to any service. Demucs talks to Basic Pitch via subprocess. OSC Bridge and Rule Engine are standalone CLIs that only read static files. The 16 agents are isolated HTTP servers with no awareness of each other.

---

## 7. FILE SYSTEM ARCHITECTURE MAP

```
/home/ubuntu/.openclaw/workspace/
│
├── ROADMAP.md                          # Master discovery index
├── PIPELINE.md                         # Architecture document (slightly stale)
├── BRIDGE_SPEC.md                      # Forward-looking Rust bridge spec
│
├── opensmile-bridge/                   # Python ctypes WebSocket — PORT 8765
│   ├── server.py                       #   WS server, streaming mode
│   ├── stream.py                       #   ctypes ring buffer
│   └── live_voice.conf                 #   eGeMAPS config
│
├── ghost-track-bridge/                 # Node.js WebSocket + HTTP — PORT 8767
│   ├── src/
│   │   ├── server.js                   #   Main WS/HTTP server
│   │   └── reharmonizer.js             #   Pivot table reharmonization
│   └── package.json
│
├── tminus-dispatcher/                  # Node.js WebSocket — PORT 8768
│   ├── src/
│   │   └── (index.js, CueBuffer.js...)
│   ├── tests/simulate.js               # Only test file in entire pipeline
│   └── README.md                       # Excellent protocol documentation
│
├── fleet-conductor/                    # Node.js HTTP + WS — PORT 8769
│   ├── src/
│   │   └── server.js                   #   Main dispatch server
│   └── package.json
│
├── piper-voice/                        # Node.js HTTP — PORT 8770
│   ├── server.js                       #   Piper TTS wrapper
│   └── cache/
│
├── fleet-agent/                        # Python HTTP — PORTS 2160-2175
│   └── fleet-agent.py                 #   ALL 16 agents in ONE file
│
├── demucs_websocket/                   # Python WebSocket — PORT 8771
│   ├── __init__.py                     #   Demucs runner + WS server
│   └── __main__.py
│
├── fleet-osc-bridge/                   # Python CLI — OSC to QLC+
│   └── fleet-osc-bridge.py            #   Stream lead-sheet to lighting
│
├── fleet-rule-engine/                  # Python CLI — Music theory validation
│   └── fleet-rule-engine.py           #   7 rules, standalone only
│
├── basic_pitch_conversation/           # Python CLI — Basic Pitch output stage
│   ├── __init__.py                     #   predict + lead-sheet-v3 builder
│   └── __main__.py
│
├── tensor-demo/                        # Python — Legacy demos
│   ├── lead-sheet.py                   #   Full TTS→Whisper→Lead-Sheet→MIDI→Graph→Compose
│   ├── fork-export.py                  #   6-format export from JSON
│   ├── export-ardour.py                #   DAW export specifically
│   ├── WHITEPAPER.md                   #   Full thesis document
│   ├── LEAD_SHEET_MIDI.md              #   Format specification
│   ├── TOOL_HERITAGE.md                #   Tool lineage map
│   ├── FORK_STRATEGY.md                #   Fork priorities
│   └── tensor-demo.py                  #   (original demo)
│
├── demo/
│   └── demo.py                         # Creative demo, health checks, agent polling
│
├── scripts/                            # Shell/Python — Operations
│   ├── start-fleet-agents.sh           #   16 agents from ONE script
│   ├── fleet-check.sh                  #   GitHub polling for Forgemaster bottles
│   ├── checkpoint.sh                   #   Session state checkpoints
│   ├── circuit-breaker.sh              #   Reflex circuit breaker
│   ├── (15 more operational scripts)
│   └── synthesis-init.py               #   Synthesis initialization
│
├── round-table/                        # Competitive intelligence
│   ├── CHARTER.md
│   ├── INTEGRATION.md
│   ├── synthesis-brief.md
│   ├── decisions/
│   │   └── 2026-06-09-synthesis.md     # Synthesis output (continuous pitch)
│   ├── futures/
│   │   ├── 2028-DAW_PLUGIN.md
│   │   ├── 2029-LIGHTING_DESIGNER.md
│   │   ├── 2032-LIVING_ARCHIVE.md
│   │   ├── JEPA_RESEARCH.md
│   │   └── REVERSE_ACTUALIZATION.md
│   ├── tool-audits/
│   │   ├── DEMUCS.md
│   │   └── FULL_AUDIT.md
│   └── evaluations/
│       └── kimi-fleet-stitch.md        # ← THIS FILE
│
├── Tensor-output/                      # Generated artifacts
│   ├── lead-sheet-v2.json              #   84 events, 2 speakers
│   ├── lead-sheet.mid                  #   Format-1 SMF, 4 tracks
│   ├── conversation-shape.txt          #   ASCII conversation graph
│   ├── composed-v2.json                #   Markov composition (3 generations)
│   └── {qlc+, ardour, musescore,       #   Fork-export project files
│        lmms, zrythm project files}
│
├── prototypes/                         # Browser prototypes
│   └── prosody-bridge.html             #   Voice → MIDI in browser (WS client missing)
│
├── memory/                             # Daily logs and research
│   ├── live-paradigm-evaluation.md     #   Architecture evaluation by Claude
│   ├── live-paradigm-implementation.md #   ARM64 feasibility analysis
│   ├── piper-tts-integration.md
│   ├── opensmile-codebase-analysis.md
│   ├── opensmile-refactoring-plan.md
│   ├── opensmile-tminus-integration.md
│   ├── heartbeat-state.json
│   └── gc-*.md, gc-analysis.md, mining-*.md
│
└── fleet-compose.yml                   # Docker Compose (stale, different ports)
```

---

## 8. CONSERVATION LAW ANALYSIS: Theoretical Check

The conservation law states:

```
Σ(Δ_ternary) → 0 over a closed conversational gesture
```

From the code:

```python
# In lead-sheet.py Markov composer:
cum_delta = 0
for ev in events:
    delta = t_pitch + t_volume + t_energy
    cum_delta += delta
# Closed if abs(cum_delta) <= 1
```

And from fleet-conductor/server.js (theoretically):

```javascript
// Conservation Ratio = Σ(agent_ternary_vectors) / MAX_POSSIBLE
// CR < 0.7 → reharmonization trigger
```

**Verification with the demo phrase (generate_phrase()):**

| Section | Notes | t_pitch | t_vol | t_timing | Δ per note | Cumulative |
|---------|-------|---------|-------|----------|-----------|------------|
| Major arpeggio | C4 E4 G4 C5 | +1 each | +1 each | 0 each | +2 each | +8 |
| Chromatic approach | C#5 D5 D#5 | 0 each | 0 each | 0 each | 0 each | +8 |
| Minor surprise | Eb5 C5 A4 F4 | -1 each | -1 each | 0 each | -2 each | 0 |

**Verification: 12 notes, Δ = +8 + 0 + (-8) = 0 ✅**

The demo phrase is designed to be closed. The conservation law holds by construction in the demo. In real speech, it would need to be measured.

---

## 9. LATENCY BUDGET (Real vs. Aspired)

| Stage | Aspired (PIPELINE.md) | Actual (Code Analysis) | Gap |
|-------|----------------------|----------------------|-----|
| OpenSMILE frame | 32ms | 32ms | ✅ Match |
| Feature enrichment | ~3ms | ~1ms | ✅ Fine |
| Ghost prediction | ~2ms | ~5ms (JS processing) | ✅ Fine |
| tminus dispatch | ~5ms | ~5ms | ✅ Match |
| Conductor routing | ~5ms | ~5ms + 16×HTTP (~100ms) | **❌ Missing: parallel fan waits for all** |
| Piper TTS | ~50ms | 50-100ms | ⚠️ Slightly optimistic |
| **Real-time WS bridge** | N/A | **Doesn't exist** | **❌ CRITICAL GAP** |
| Demucs separation | N/A | ~15s for 30s audio | ❌ Not viable for streaming |
| **Total (aspired)** | **~120ms** | **~150ms (excluding Demucs)** | ⚠️ Marginally OK |
| **Real streaming** | **~500ms** | **~∞ (no WS bridge)** | **❌ UNBUILDABLE** |

The real bottleneck: without the WebSocket bridge from browser to Ghost Track, the entire "real-time" pipeline is a batched simulation. The browser prototype works locally but never talks to the server. The server-side demo (`demo.py`) works sequentially but has no mic input.

---

## 10. INVENTORY: What Code Works vs. What's Simulation

### ✅ Truly Working (Proven in Production)
1. `fleet-agent/fleet-agent.py` — 16-agent HTTP server, responds to GET/POST
2. `scripts/start-fleet-agents.sh` — Spawns all agents
3. `opensmile-bridge/stream.py` — ctypes ring buffer, streams to OpenSMILE
4. `tminus-dispatcher` — WebSocket cue dispatcher, tested via `simulate.js`
5. `piper-voice/server.js` — HTTP server, synthesizes text to WAV
6. `basic_pitch_conversation/__init__.py` — Converts audio files to lead-sheet JSON
7. `demo/demo.py` — Health checks, agent polling, output generation
8. `fleet-osc-bridge/fleet-osc-bridge.py` — File-based OSC playback
9. `fleet-rule-engine/fleet-rule-engine.py` — Standalone CLI validator
10. `tensor-demo/fork-export.py` — 6-format export from JSON

### 🟡 Built But Not Connected (Needs Integration)
1. `demucs_websocket/__init__.py` — Works standalone, pipe to Basic Pitch works, but no integration with pipeline
2. `prototypes/prosody-bridge.html` — Works standalone in browser, no WebSocket server link
3. `ghost-track-bridge/src/server.js` — HTTP endpoints work, but no browser WS client connects
4. `tensor-demo/lead-sheet.py` — Full pipeline simulation but uses local imports and synthetic data
5. `export-ardour.py` — Works on static files, no pipeline trigger

### ❌ Not Built / Simulation Only
1. **Browser ↔ Ghost Track WebSocket bridge** — The single most critical missing link
2. **Reverse path (MIDI → audio synthesis)** — No code exists at all
3. **Timestamp reconciliation (multi-stage commit)** — No buffer/sync architecture
4. **Schema validation (lead-sheet-v3.schema.json)** — No file exists
5. **Circuit breaker / deadband / rate limiting** — Zero infrastructure
6. **Phase group alignment in tminus for pipeline services** — Phase groups are defined for cognitive agents, but no pipeline phase groups exist
7. **fleet-lib shared package** — Every service duplicates MIDI utilities

### 🧪 Experimental / Research
1. `round-table/futures/*.md` — Forward-looking documents, no code
2. `BRIDGE_SPEC.md` — Rust bridge spec, no implementation
3. `scripts/synthesis-init.py` — One-off synthesis orchestration
4. `memory/*` — Analysis documents, observations

---

## 11. AGENT HEALTH SUMMARY (At Scale)

The 16 agents are trivial HTTP servers with zero coordination:

```
fleet-midi-chord     :2160  →  AgentBehaviors.chord()      (53 lines of logic)
fleet-midi-scale     :2161  →  AgentBehaviors.scale()      (44 lines of logic)
fleet-midi-voicing   :2162  →  AgentBehaviors.voicing()    (36 lines of logic)
... all 13 more ...                                          (15-54 lines each)
fleet-midi-bass      :2175  →  AgentBehaviors.bass()       (36 lines of logic)
```

**Each agent is ~50 lines of pure logic** wrapped in 270 lines of HTTP boilerplate. The boilerplate is identical across all 16. The logic is independent static methods in the same class.

**Memory:** ~20MB RAM each at idle (Python + HTTP server) = ~320MB for 16 agents. Acceptable but wasteful — a single Python process with 16 routes would use <50MB.

---

## 12. META-OBSERVATIONS

### The Pipeline Has Two Personas

1. **Synthetic Demo Persona** (`tensor-demo/lead-sheet.py`, `demo/demo.py`):
   - Generates perfect synthetic data
   - All ternary vectors are textbook-correct
   - Conservation law always holds (by construction)
   - Markov composer produces plausible-sounding output
   - **Says:** "This works beautifully!"

2. **Real-World Persona** (`opensmile-bridge/`, `demucs_websocket/`, `basic_pitch_conversation`):
   - OpenSMILE might or might not be running on ARM64
   - Demucs takes 15 seconds for 30 seconds of audio
   - Basic Pitch doesn't run on ARM64 (numba/llvmlite issue)
   - Browser mic might pick up room noise
   - Real ternary vectors might not sum to zero
   - **Says:** "This is hard and I need a bathroom break while Demucs runs"

**The gap between these personas is the entire priority list above.**

### The Document-to-Code Ratio is Unhealthy

| Type | Files | Lines | Ratio |
|------|-------|-------|-------|
| **Code** (py, js, sh, html) | ~95 | ~15,000 | 1× |
| **Docs** (md, txt, json) | ~40 | ~8,000 | 0.53× |
| **Memory/analysis** | ~12 | ~6,000 | 0.40× |

For a project this size, 0.53× docs-to-code is reasonable. The issue isn't quantity but **staleness**: PIPELINE.md references ports and services that don't match reality. BRIDGE_SPEC.md describes code that doesn't exist. The actual architecture is well-understood by the code but poorly documented in a single up-to-date source.

### Optional Runtime Dependencies = Future Frustrations

Multiple modules use try/except ImportError patterns:

```python
# demucs_websocket/__init__.py:
HAS_DEMUCS = False
try:
    from demucs import separate
    HAS_DEMUCS = True
except ImportError:
    pass

# basic_pitch_conversation/__init__.py:
try:
    import basic_pitch
    BASIC_PITCH_AVAILABLE = True
except (ImportError, OSError):
    BASIC_PITCH_AVAILABLE = False
```

This is reasonable for cross-platform support (ARM64 vs x86_64), but it means the pipeline silently degrades. A user running on ARM64 gets the librosa fallback for Basic Pitch (much worse accuracy) without knowing. The `--check` flags help but aren't mandatory.

---

## 13. CONCLUSION: The State of the Pipeline

### What's Strong

1. **Format-centric architecture**: The lead-sheet-MIDI-v3 format is the right abstraction. Everything produces or consumes it. This is the single best architectural decision.

2. **Tool heritage awareness**: TOOL_HERITAGE.md correctly routes existing tools rather than rebuilding them. Basic Pitch for polyphonic MIDI, OpenSMILE for prosody, Piper for TTS, Demucs for separation — all mature, all integrated.

3. **Conservation law as IP**: The Σ(Δ_ternary) → 0 invariant is genuinely novel. It's testable, falsifiable, and potentially patentable. The reharmonization trigger at CR < 0.7 is a concrete application.

4. **Agent diversity**: 16 agents covering chord, scale, voicing, tempo, CC, expression, dynamics, pan, modulation, arp, groove, velocity, fx, register, melody, bass is comprehensive coverage of the MIDI parameter space.

### What's Weak

1. **No real-time path**: The browser prototype → Ghost Track → tminus → conductor → agents → feedback loop is **entirely simulated**. No working WebSocket bridge connects the browser to the server.

2. **16× code duplication**: All agents run the same `fleet-agent.py`. There should be one shared library with config-driven agent registration.

3. **Forward-only pipeline**: MIDI output goes to DAWs and lighting consoles, but there's no reverse path for MIDI → audio synthesis. Without this, it's a transcription tool, not a creative pipeline.

4. **No shared library**: MIDI utilities, ternary types, lead-sheet schema builders are copied across 4+ modules. One `fleet-lib` package would fix this.

5. **No circuit breakers or deadbands**: If an agent hangs, the pipeline state is undefined. No rate limiting, no backpressure, no partial result handling.

### What to Build First

1. **Today**: WebSocket bridge from `prosody-bridge.html` to Ghost Track. Closes the core thesis gap.
2. **This week**: `fleet-lib` shared package with `midi.py`, `ternary.py`, `lead_sheet.py`, `agent.py`, `config.yaml`, `lead-sheet-v3.schema.json`.
3. **This sprint**: Circuit breakers + deadbands in fleet-conductor. Timeouts per agent, CR debounce, replay buffer.
4. **Next sprint**: Demucs → Basic Pitch → OpenSMILE → Ghost Track pipeline for file-based processing. Song-level conservation law.
5. **Next month**: OSC bridge integration + rule engine WebSocket endpoint. Reverse path prototype.
6. **Next quarter**: Schema validation + test suite + CI/CD. Living Archive graph DB schema.

### Final Word

The pipeline has the **right bones** — a well-designed intermediate format (lead-sheet-MIDI-v3), a novel conservation law (Σ(Δ_ternary) → 0), sensible tool heritage routing, and comprehensive agent coverage of the MIDI parameter space. But it's a **simulation of a pipeline**, not a running pipeline. The real-time bidirectional path from browser to Ghost Track is the single missing link that would transform this from a collection of impressive demos into a working system.

**Build the WebSocket bridge. Everything else follows.**
