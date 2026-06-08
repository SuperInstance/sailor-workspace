# OpenSMILE Voice Features → tminus-dispatcher Integration Plan

**Generated:** 2026-06-08 18:47 UTC  
**Status:** Architecture Proposal  
**Scope:** Real-time ghost track enrichment via OpenSMILE 25-feature voice extraction piped into tminus-dispatcher cue scheduling and phase-group orchestration

---

## Section 1: tminus-dispatcher Architecture

### 1.1 Message Format

The tminus-dispatcher uses a **flat JSON envelope** over WebSocket (not JSON-RPC 2.0 — it's proprietary). Every message is a single JSON object with:

```json
{
  "type": "<MSG_TYPE>",
  "seq":  <int>,
  "ts":   <epoch_ms>,
  "payload": { ... }
}
```

**Client → Server types** (defined in `MSG_TYPES`):

| Type | Payload | Description |
|------|---------|-------------|
| `REGISTER` | `{ name, timbre, frequency, latency_ms, context_depth }` | Agent identifies itself |
| `SUBSCRIBE` | `{ phase_groups: string[] }` | Agent joins one or more phase groups |
| `CUE` | `{ target_id, offset_beats, phase_group, payload }` | Source agent sends a cue to a target |
| `FIRE` | _(none)_ | Agent signals it's ready to execute |
| `REPORT` | `{ result, duration_beats, phase_group }` | Agent reports completion |
| `PING` | _(none)_ | Heartbeat |
| `UNSUBSCRIBE` | `{ phase_groups: string[] }` | Agent leaves phase groups |

**Server → Client types:**

| Type | Payload | Meaning |
|------|---------|---------|
| `REGISTERED` | `{ agent_id, state, ... }` | Registration confirmed |
| `CUED` | `{ cue_id, source, offset_beats, delay_ms, phase_group, payload }` | Cue received, countdown started |
| `PRIMED` | `{ cue_id, source, phase_group, pre_cued, offset_beats, payload }` | Countdown reached zero, agent is "primed" |
| `FIRE_ACK` | `{ agent_id, state }` | FIRE acknowledged, transitioning to FIRING |
| `COMPLETE_ACK` | `{ agent_id, state, cues_completed, result, duration_beats }` | REPORT acknowledged |
| `PHASE_ADVANCE` | `{ group, point }` | All agents in phase group completed → alignment point advanced |
| `ERROR` | `{ code, message }` | Error condition |
| `PONG` | _(none)_ | Heartbeat response |

### 1.2 Cue Scheduling (CueBuffer / CueScheduler)

The `CueScheduler` maintains:
- **`_cues: Map<cue_id, CueRecord>`** — full cue index
- **`_pending: CueRecord[]`** — sorted by `scheduled_fire_at` (ascending)

**CueRecord structure:**
```javascript
{
  id: "cue_<ts36>_<seq36>",
  source_id: "agent-id",
  target_id: "agent-id",
  phase_group: "phase-group-name",
  offset_beats: <int>,        // T-minus offset in cognitive beats
  delay_ms: <int>,            // = offset_beats * TICK_MS
  issued_at: <epoch_ms>,
  scheduled_fire_at: <epoch_ms>,
  state: "scheduled" | "delivered" | "completed" | "cancelled",
  payload: { ... }            // arbitrary context data
}
```

**Scheduling behavior:**
- `offset_beats <= 0` → **pre-cue**, delivered immediately, agent moves directly to `PRIMED` state
- `offset_beats > 0` → **standard cue**, agent moves to `CUED` state; the beat engine's `tick()` moves it to `PRIMED` when `scheduled_fire_at` is reached
- One `TICK_MS = 500ms` → 1 cognitive beat = 500ms

**Key insight for voice integration:** The `payload` field is the **enrichment path**. Voice features can be injected here and ride along with the cue lifecycle.

### 1.3 Phase Grouping

`PhaseGroupManager` organizes agents into named groups with **alignment points**:

```javascript
PhaseGroup = {
  name: "example",
  agents: ["agent1", "agent2"],
  sequence: <int>,
  state: "idle" | "active" | "completed",
  alignment_points: [AlignmentPoint, ...],
  last_alignment: AlignmentPoint
}

AlignmentPoint = {
  id: "P_001",
  phase_group: "example",
  sequence: 1,
  opened_at: <epoch_ms>,
  cues_issued: 3,
  cues_completed: 0,
  agent_count: 3,
  state: "awaiting_completion"
}
```

**Flow:** `openAlignmentPoint()` → `recordCueIssued()` (×N per cue dispatch) → `recordCueCompleted()` (×N per agent REPORT) → when `cues_completed >= agent_count`, the alignment point advances and all agents in the group receive `PHASE_ADVANCE`.

**Voice relevance:** OpenSMILE voice quality can determine **which phase group** an agent should be assigned to, and voice emotional features can trigger **dynamic re-alignment** (e.g., high surprise → re-open alignment point).

### 1.4 Agent State Machine

```
REGISTERED → LISTENING → CUED → PRIMED → FIRING → COMPLETE → (back to LISTENING)
     ↓          ↓          ↓       ↓         ↓         ↓
  OFFLINE    OFFLINE    OFFLINE  OFFLINE   OFFLINE   OFFLINE
```

Each agent has a `timbre` (descriptive label), `frequency` (0-1 engagement rate), `latency_ms`, and `context_depth` ("shallow"|"medium"|"deep") that normalizes their beat timing.

### 1.5 WebSocket Interface

**Server:** HTTP server on port 8765 (default, overridable via `TMINUS_PORT`) with WebSocket upgrade endpoint. All control happens over the WS connection — REST is read-only health/status.

**Connection lifecycle:**
1. WS connect → server assigns `connId`
2. Client sends `REGISTER` → server returns `agent_id` + `state: registered`
3. Client sends `SUBSCRIBE {phase_groups: [...]}` → state advances to `listening`
4. Server sends `CUED` / `PRIMED` as cues fire
5. Client sends `FIRE` → server acks with `FIRE_ACK`
6. Client sends `REPORT` → server acks with `COMPLETE_ACK`, potentially `PHASE_ADVANCE`

**⚠ Port conflict discovered:** `tminus-dispatcher/src/index.js` defaults to port `8765`, which collides with `opensmile-bridge/server.py` which hardcodes `OPEN_SMILE_PORT = 8765`. One must change. Recommended: tminus-dispatcher moves to `8768` (or uses environment config as already supported).

---

## Section 2: OpenSMILE Feature → Cue Mapping

### 2.1 Feature-to-Cue Parameter Matrix

The OpenSMILE bridge extracts 25 features from `eGeMAPSv02`. Mapping to tminus cue parameters:

| Feature Group | OpenSMILE Fields | MIDI CC | tminus Cue Parameter | Enrichment Strategy |
|---|---|---|---|---|
| **F0 Pitch** | `f0_semitones` | Note + Pitch Bend | `payload.pitch` | Inject raw pitch tracking into cue context; can affect agent routing priority (stable pitch → higher priority) |
| **Loudness/RMS** | `loudness` | Velocity, CC#7 Volume | `payload.urgency` | Scale from 0-1; loudness >0.6 → high urgency cue, loudness <0.2 → low priority |
| **Formants F1/F2/F3** | `f1_freq`, `f2_freq`, `f3_freq` (+ bandwidths) | CC#74, CC#71, CC#91 | `payload.vowel_space` | { openness, frontness, rounding } triplet → agent timbre selection (open vowels → "wide" timbre agents) |
| **Jitter** | `jitter` (vocal roughness) | CC#16 Distortion | `payload.voice_quality.roughness` | 0-1 normalized; high jitter → route to "chaos-tolerant" phase groups |
| **Shimmer** | `shimmer` (amplitude instability) | CC#17 Tremolo | `payload.voice_quality.tremor` | 0-1 normalized; high shimmer → trigger re-alignment (voice instability suggests uncertainty) |
| **HNR** | `hnr` (breathiness) | CC#2 Breath Control | `payload.voice_quality.breathiness` | Inverted: low HNR = breathy = high CC#2; breathy voice → route to "contemplative" agents (reduced cue priority) |
| **MFCCs 1-4** | `mfcc_1` through `mfcc_4` | CC#12-15 | `payload.timbre_vector` | 4-float vector for timbre fingerprinting; can match agent timbre signatures for affinity routing |
| **Spectral Slope** | `slope_0_500`, `slope_500_1500` | CC#75 Brightness | `payload.brightness` | High slope → bright voice → "analytical" agent groups; low slope → warm voice → "creative" agent groups |
| **Alpha Ratio** | `alpha_ratio` (energy balance <1kHz vs >1kHz) | CC#76 | `payload.energy_balance` | Balance metric for voice energy distribution |
| **Hammarberg Index** | `hammarberg` (spectral balance variance) | CC#77 | `payload.spectral_balance` | High variance → rich harmonics → route to "harmonic" agents |
| **Spectral Flux** | `spectral_flux` (change rate) | CC#78 | `payload.change_rate` + **cue scheduling priority boost** | **Key metric for dynamic scheduling** |
| **Ternary Classification** | Derived from velocity/jitter/pitch | `trit` (-1, 0, +1) | `payload.trit` | Ternary state for ghost track accumulator |

### 2.2 Spectral Flux → Cue Scheduling Priority

**Mechanism:** Spectral flux measures the rate of change in the voice spectrum. High flux = rapid timbral shifts (e.g., consonant sounds, word transitions, emotional emphasis).

**Integration into cue scheduling:**

```
spectral_flux ∈ [0, ∞)
normalized_flux = min(1.0, spectral_flux * 5.0)  // Scale to 0-1

cue_offset_beats_adjustment = TICK_MS * (1.0 - normalized_flux)  // High flux = shorter delay
```

- **High flux (>0.15):** Boost cue priority by reducing `offset_beats` by up to 50%. This means rapid voice changes get faster cue delivery — the system responds faster when the speaker is actively changing their voice.
- **Low flux (<0.03):** Let cue follow normal schedule. Steady-state voice doesn't need rapid response.
- **Flux spike detection:** If `spectral_flux` exceeds a threshold (e.g., 0.3) between frames, treat as a **voice event trigger** — immediately dispatch a pre-cue (offset_beats = 0) to listening agents to signal a contextual shift.

**Implementation detail:** The cue-scheduler doesn't currently support dynamic priority re-ordering. To integrate flux-based scheduling, the dispatcher's `dispatchCue()` should pre-compute the adjusted offset before calling `cues.schedule()`. Proposal: add a `priority` field to the cue spec (0-10, default 5) that `CueScheduler.schedule()` uses to further modify delay:

```javascript
// Modified schedule() in cue-scheduler.js:
const priorityFactor = 1.0 - (spec.priority || 5) * 0.08;  // priority 10 → 0.2x, priority 0 → 1.0x
const delayMs = Math.max(0, spec.offsetBeats * TICK_MS * priorityFactor);
```

### 2.3 Jitter/Shimmer → Agent Routing

**Mechanism:** Jitter (pitch perturbation) and shimmer (amplitude perturbation) together define **voice quality stability**:

```
voice_stability = 1.0 - ((norm_jitter + norm_shimmer) / 2.0)
  where norm_jitter = min(1.0, jitter * 50)     // 0.02 jitter → 1.0
  where norm_shimmer = min(1.0, shimmer * 10)    // 0.1 shimmer → 1.0
```

**Routing rules based on voice stability:**

| Stability Range | Classification | Route To | Agent Selection Strategy |
|---|---|---|---|
| 0.80 - 1.00 | **Clear/Stable** | "confident" phase group | Low latency, high frequency agents; direct cues |
| 0.50 - 0.79 | **Moderate** | "neutral" phase group | Balanced agents; standard scheduling |
| 0.00 - 0.49 | **Unstable** | "uncertain" phase group | High context-depth agents; longer offset beats for deliberation |

**Phase group selection at dispatch time:**

```javascript
function selectPhaseGroup(voiceStability) {
  if (voiceStability > 0.8) return 'voice-confident';
  if (voiceStability > 0.5) return 'voice-neutral';
  return 'voice-uncertain';
}
```

Voice grouping can also be **dynamic** — agents subscribe to phase groups and the dispatcher routes the cue to the appropriate group based on the latest OpenSMILE data. This avoids re-registration latency.

---

## Section 3: Integration Architecture

### 3.1 Option Analysis

#### Option A: Direct WebSocket from OpenSMILE Bridge to tminus-dispatcher ✓ RECOMMENDED

```
Browser (mic) ──WS──→ OpenSMILE Bridge (:8765) ──WS──→ tminus-dispatcher (:8768)
                            │                                  │
                      25 features                          CueBuffer
                      MIDI CC                              Ghost Engine
                      Ternary trit                          Phase Groups
```

**JSON schema for bridge → dispatcher messages:**

```json
{
  "type": "CUE",
  "seq": 42,
  "ts": 1818000000000,
  "payload": {
    "target_id": "ghost-engine-01",
    "offset_beats": 0,
    "phase_group": "voice-real-time",
    "payload": {
      "source": "opensmile-bridge",
      "voice": {
        "note": 60,
        "velocity": 88,
        "trit": 1,
        "pitch_bend": 42
      },
      "features": {
        "f0_semitones": 45.2,
        "loudness": 0.73,
        "jitter": 0.012,
        "shimmer": 0.043,
        "hnr": 22.5,
        "f1_freq": 580.0,
        "f2_freq": 1450.0,
        "f3_freq": 2600.0,
        "mfcc_1": -5.3,
        "mfcc_2": 12.1,
        "mfcc_3": -2.8,
        "mfcc_4": 8.4,
        "slope_0_500": -0.12,
        "slope_500_1500": -0.08,
        "alpha_ratio": 0.65,
        "hammarberg": 0.23,
        "spectral_flux": 0.18
      },
      "voice_quality": {
        "stability": 0.82,
        "roughness": 0.24,
        "breathiness": 0.15,
        "tremor": 0.08,
        "brightness": 0.67
      },
      "derived": {
        "urgency": 0.71,
        "vowel_space": [580, 1450, 2600],
        "timbre_cluster": "bright-vowel"
      }
    }
  }
}
```

The OpenSMILE Bridge sends `CUE` messages as a registered agent. It registers once as agent `opensmile-voice`, subscribes to phase group `voice-real-time`, then sends cues with `offset_beats: 0` (pre-cue / immediate) whenever voice features are extracted.

**Latency budget:**

| Stage | Latency | Notes |
|---|---|---|
| Audio capture + WS transmit | ~50ms | Browser or file source |
| OpenSMILE extraction (1024 frame, 512 hop) | ~50ms | ARM64 Python, eGeMAPS v02 LLD |
| Feature→MIDI CC mapping | ~1ms | Lookup tables, no I/O |
| WS send to tminus-dispatcher | ~5ms | Localhost WS |
| Cue dispatch + agent routing | ~2ms | In-memory Map operations |
| WS delivery to ghost engine | ~5ms | Localhost WS |
| Ghost prediction compute | ~2ms | T-0..T-4, CR calc |
| **Total** | **~115ms** | Well within 500ms cognitive beat |

**Failure modes:**

| Failure | Impact | Mitigation |
|---|---|---|
| tminus-dispatcher down | Voice cues queued in OpenSMILE bridge | OpenSMILE bridge queues last 10 cues; flushes on reconnect; agent heartbeat detects absence |
| OpenSMILE bridge down | No voice features | Ghost engine runs on last-known voice state; CR degrades gracefully |
| Feature extraction error (NaN) | Corrupted cue payload | `_parse_features()` drops NaN; `features_to_midi_cc()` defaults to 0/neutral |
| WS message loss | Missed cue | Cue scheduler marks missed tick; ghost engine interpolates from last T-1 |

**Backpressure handling:**

The CueScheduler naturally handles backpressure through its tick-based architecture:
- If the OpenSMILE bridge sends cues faster than `TICK_MS` (500ms), they accumulate in the pending queue.
- The ghost engine processes one cue per tick.
- If the pending queue exceeds a threshold (e.g., 100 cues), the dispatcher can send a backpressure signal via an OpenSMILE-monitoring phase group or the OpenSMILE bridge can throttle its frame rate.

**Implementation recommendation for OpenSMILE Bridge:**

The OpenSMILE bridge's `send_to_ghost()` currently sends raw MIDI to the Ghost Track Bridge. For Option A, it should also register with tminus-dispatcher and send enriched cues. This is a ~20-line change:

```python
class OpenSmileTminusClient:
    """WebSocket client to tminus-dispatcher for cue injection."""
    
    def __init__(self, url):
        self.url = url
        self.ws = None
        self.agent_id = None
    
    async def connect_and_register(self):
        self.ws = await websockets.connect(self.url)
        welcome = await self.ws.recv()  # consume welcome if any
        
        # Register as voice agent
        await self.ws.send(json.dumps({
            'type': 'REGISTER',
            'payload': {
                'name': 'opensmile-voice',
                'timbre': 'voice-features',
                'frequency': 0.9,
                'latency_ms': 50,
                'context_depth': 'shallow'
            }
        }))
        resp = json.loads(await self.ws.recv())
        self.agent_id = resp['payload']['agent_id']
        
        # Subscribe to real-time phase group
        await self.ws.send(json.dumps({
            'type': 'SUBSCRIBE',
            'payload': {'phase_groups': ['voice-real-time']}
        }))
        await self.ws.recv()
    
    async def send_cue(self, features, cc):
        target_id = f"ghost-engine-{features.get('note', 60)}"
        cue_payload = self._build_cue_payload(features, cc)
        
        await self.ws.send(json.dumps({
            'type': 'CUE',
            'payload': {
                'target_id': 'ghost-track-bridge',
                'offset_beats': 0,
                'phase_group': 'voice-real-time',
                'payload': cue_payload
            }
        }))
```

#### Option B: Route through Ghost Track Bridge (Pipeline)

```
Browser ──WS──→ OpenSMILE ──WS──→ Ghost Track Bridge ──WS──→ tminus-dispatcher
```

The ghost track bridge already receives MIDI data and computes ghost predictions (T-0..T-4, CR). It could be extended to also forward to tminus-dispatcher. However, this adds an unnecessary hop since the ghost engine and tminus-dispatcher are separate services with different concerns.

**Verdict:** Not recommended. Adds ~10ms latency and couples the voice pipeline to ghost state. The ghost track bridge's job is prediction, not routing.

#### Option C: WebSocket Relay with Client-Side Enrichment

```
Browser ──WS──→ OpenSMILE ──WS──→ Client App ──WS──→ tminus-dispatcher
                          ↓                    ↑
                    Ghost Track Bridge        Client enriches
                                              with UI state
```

The browser client acts as a relay, receiving enriched MIDI from OpenSMILE, optionally merging with UI state, then forwarding to tminus-dispatcher.

**Verdict:** Useful for interactive applications but adds client-side complexity. The browser Prosody Bridge already provides basic pitch/RMS; server-side enrichment should remain server-to-server.

### 3.2 Recommended Stack: Option A + Ghost Track Co-registration

Both the OpenSMILE Bridge and Ghost Track Bridge register as independent agents with the tminus-dispatcher. OpenSMILE sends cues; Ghost Track receives them and publishes results:

```
           ┌──────────────────────────────────────┐
           │          tminus-dispatcher (:8768)     │
           │  ┌──────────┐  ┌───────────┐          │
           │  │CueSched │  │PhaseGroup  │          │
           │  └──────────┘  └───────────┘          │
           └───┬────────────────────┬─────────────┘
               │                    │
      CUE      │                    │   PRIMED / PHASE_ADVANCE
   (features)  │                    │   (predictions)
               ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐
     │ OpenSMILE Bridge │  │ Ghost Track     │
     │ (agent: voice)   │  │ Bridge          │
     │                  │  │ (agent: ghost)  │
     │ F0→Note, Formants│  │ T-0..T-4 preds  │
     │ Jitter→Stability │  │ CR monitoring   │
     │ Flux→Priority    │  │ Pivot tables    │
     │ Trit→Ternary     │  │ Session capture │
     └─────────────────┘  └─────────────────┘
               ▲                    ▲
               │                    │
               └─────── WS ─────────┘
                  (existing link kept
                   for ghost predictions)
```

The existing WS link from OpenSMILE to Ghost Track (for ghost state computation) is preserved. The new link is OpenSMILE → tminus-dispatcher for cue dispatch and phase-group orchestration.

---

## Section 4: Pivot Table Integration

### 4.1 OpenSMILE Emotional Features → Emotion States

The ghost engine currently uses pivot tables for **fast reharmonization without LLM calls**. The pivot table maps emotion states → alternative harmonic paths.

**OpenSMILE features relevant to emotional state:**

| Feature | Emotional Relevance | Range (typical) | MIDI CC Mapping |
|---|---|---|---|
| **Jitter** | Vocal tension/roughness — correlates with stress, anger, excitement | 0.005 - 0.05 | CC#16 |
| **Shimmer** | Amplitude instability — correlates with fatigue, fear, emotional intensity | 0.01 - 0.15 | CC#17 |
| **HNR** | Breathiness — correlates with sadness, intimacy, relaxation (high HNR = clear voice, low HNR = breathy) | 5 - 35 dB | CC#2 (inverted) |
| **Alpha Ratio** | Energy <1kHz vs >1kHz — correlates with arousal level | 0.3 - 1.5 | CC#76 |
| **Spectral Flux** | Rate of change — correlates with surprise, agitation, transition | 0.0 - 0.5 | CC#78 |

**Mapping to emotion states (2D arousal-valence model):**

```
                AROUSAL (high)
                    │
    angry / tense   │   excited / joyful
    (high jitter,   │   (high flux, moderate HNR,
     high shimmer,  │    high alpha ratio)
     low HNR)       │
                    │
────────────────────┼──────────────────► VALENCE
                    │
    sad / tired     │   calm / content
    (low alpha,     │   (low jitter, low shimmer,
     low flux,      │    high HNR, balanced alpha)
     high shimmer)  │
                    │
              (low)
```

**State computation formula:**

```javascript
function computeEmotionState(features) {
  // Normalize each feature to 0-1
  const arousal = (
    clamp01(features.jitter * 50) * 0.3 +
    clamp01(features.shimmer * 10) * 0.3 +
    clamp01((1 - clamp01(features.hnr / 30)) * 0.2 +  // inverted: low HNR = high arousal
    clamp01(features.spectral_flux * 5) * 0.2)
  );
  
  const valence = (
    clamp01((1 - clamp01(features.jitter * 30))) * 0.3 +  // low jitter = positive
    clamp01((1 - clamp01(features.shimmer * 8))) * 0.3 +   // low shimmer = positive
    clamp01(features.alpha_ratio * 1.5) * 0.2 +           // high alpha = positive
    clamp01(features.hnr / 25) * 0.2                       // high HNR = clear = positive
  );
  
  return { arousal, valence };
}
```

### 4.2 Pivot Table Schema

Each emotion state maps to precomputed harmonic paths. The pivot table is a lookup from `(current_emotion, target_emotion)` → `harmonic_progression`.

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-06-08T18:47:00Z",
  "base_key": "C minor",
  "bpm_range": [60, 140],
  
  "emotion_states": {
    "calm":        { "arousal": 0.2, "valence": 0.8, "jitter_range": [0.002, 0.008], "shimmer_range": [0.01, 0.04], "hnr_min": 20, "alpha_range": [0.5, 0.8] },
    "sad":         { "arousal": 0.3, "valence": 0.2, "jitter_range": [0.005, 0.015], "shimmer_range": [0.05, 0.12], "hnr_min": 10, "alpha_range": [0.3, 0.5] },
    "neutral":     { "arousal": 0.5, "valence": 0.5, "jitter_range": [0.008, 0.02], "shimmer_range": [0.03, 0.08], "hnr_min": 15, "alpha_range": [0.4, 0.7] },
    "excited":     { "arousal": 0.8, "valence": 0.8, "jitter_range": [0.01, 0.025], "shimmer_range": [0.04, 0.1], "hnr_min": 18, "alpha_range": [0.6, 1.0] },
    "angry":       { "arousal": 0.8, "valence": 0.2, "jitter_range": [0.02, 0.05], "shimmer_range": [0.08, 0.15], "hnr_min": 5, "alpha_range": [0.7, 1.2] },
    "surprised":   { "arousal": 0.7, "valence": 0.6, "jitter_range": [0.015, 0.03], "shimmer_range": [0.03, 0.08], "hnr_min": 15, "alpha_range": [0.5, 0.9], "flux_spike": true }
  },
  
  "pivot_tables": {
    "calm_to_excited": {
      "harmonic_path": ["Cm", "Gm", "Dm", "F", "G7", "C", "Am", "F"],
      "transition_beats": 8,
      "accumulator_drift": { "trit_tendency": [0, 0, 0, 1, 1, 1, 1, 1] },
      "ghost_path_offset": 2,
      "velocity_profile": "crescendo"
    },
    "calm_to_sad": {
      "harmonic_path": ["Cm", "Fm", "Bb", "Eb", "Ab", "Dm7b5", "G7", "Cm"],
      "transition_beats": 8,
      "accumulator_drift": { "trit_tendency": [0, 0, -1, -1, -1, -1, -1, -1] },
      "ghost_path_offset": 0,
      "velocity_profile": "diminuendo"
    },
    "neutral_to_angry": {
      "harmonic_path": ["Dm", "Gm", "C7", "Fm", "Bbm", "Gb", "Db", "Ab"],
      "transition_beats": 4,
      "accumulator_drift": { "trit_tendency": [0, 1, 1, -1, 1, 1, -1, 1] },
      "ghost_path_offset": 4,
      "velocity_profile": "explosive"
    },
    "sad_to_neutral": {
      "harmonic_path": ["Cm", "Ab", "Fm", "G7", "C", "Am", "Dm", "G7"],
      "transition_beats": 8,
      "accumulator_drift": { "trit_tendency": [-1, -1, 0, 0, 1, 0, 0, 1] },
      "ghost_path_offset": 1,
      "velocity_profile": "gradual_rise"
    },
    "excited_to_calm": {
      "harmonic_path": ["C", "Am", "F", "G7", "C", "Dm", "G7", "C"],
      "transition_beats": 12,
      "accumulator_drift": { "trit_tendency": [1, 1, 0, 0, 0, 0, 0, 0] },
      "ghost_path_offset": -2,
      "velocity_profile": "decrescendo"
    }
  },
  
  "flux_triggers": {
    "surprise_resolution": {
      "detection": { "spectral_flux_spike": true, "jitter_increase": 0.02 },
      "harmonic_path": ["dim7", "aug", "V7", "I"],
      "transition_beats": 2,
      "trigger_offset": 0,
      "description": "On spectral flux spike, immediately pivot to a surprise-resolution cadence"
    },
    "emotional_transition": {
      "detection": { "feature_delta_above_threshold": 0.3 },
      "action": "recompute_pivot",
      "description": "When voice features shift significantly between frames, recalculate the emotion state and look up new pivot"
    }
  }
}
```

### 4.3 Pivot Table Lookup Engine

The ghost engine should integrate a `PivotTable` class that maps voice features → emotion state → harmonic path:

```javascript
class EmotionPivotTable {
  constructor(pivotData) {
    this.states = pivotData.emotion_states;
    this.pivots = pivotData.pivot_tables;
    this.fluxTriggers = pivotData.flux_triggers;
    this.currentState = 'neutral';
    this.lastFeatures = null;
  }

  /**
   * Classify voice features into emotion state.
   */
  classify(features) {
    const { arousal, valence } = computeEmotionState(features);
    
    // Find closest emotion state by euclidean distance
    let closestState = 'neutral';
    let minDist = Infinity;
    
    for (const [name, state] of Object.entries(this.states)) {
      const dist = Math.sqrt(
        (arousal - state.arousal) ** 2 + 
        (valence - state.valence) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        closestState = name;
      }
    }
    
    return closestState;
  }

  /**
   * Look up a pivot path from current emotion to target.
   */
  getPivot(fromState, toState) {
    const key = `${fromState}_to_${toState}`;
    return this.pivots[key] || null;
  }

  /**
   * Handle spectral flux spike (surprise detection).
   */
  handleFluxSpike(features, currentNote) {
    // Immediate reharmonization path for surprise events
    const trigger = this.fluxTriggers.surprise_resolution;
    return {
      type: 'surprise_resolution',
      harmonicPath: trigger.harmonic_path,
      transitionBeats: trigger.transition_beats,
      targetNote: currentNote + 4,  // Surprise → jump up a third
      velocityBoost: 20
    };
  }

  /**
   * Full voice update → return ghost prediction modifications.
   */
  update(ghostEngine, features) {
    const emotionState = this.classify(features);
    
    // Check for flux spike (surprise)
    if (features.spectral_flux > 0.3 && this.lastFeatures && 
        features.spectral_flux > this.lastFeatures.spectral_flux * 2) {
      return this.handleFluxSpike(features, ghostEngine.lastNote);
    }
    
    // Check for emotional transition
    if (emotionState !== this.currentState) {
      const pivot = this.getPivot(this.currentState, emotionState);
      if (pivot) {
        this.currentState = emotionState;
        return {
          type: 'emotional_transition',
          pivot,
          fromState: this.currentState,
          toState: emotionState
        };
      }
    }
    
    this.lastFeatures = features;
    return null; // No change needed
  }
}
```

### 4.4 Precomputing Transitions Between Emotion States

The pivot table transitions are precomputed offline (not at runtime). The precomputation algorithm:

1. **Define emotion graph:** 6 states × 5 transitions = 30 possible edges (directional)
2. **For each edge, compute:**
   - **Harmonic path:** Best chord progression from state A to state B in the chosen key (C minor base). Use music theory rules: parallel keys for same-valence transitions, mediant shifts for cross-valence, augmented/diminished for surprise.
   - **Transition beats:** Proportional to the Euclidean distance between arousal-valence points × 8 beats. Closer states = faster transition.
   - **Accumulator drift:** Trit tendency sequence that moves the ternary accumulator from its current state toward the target emotion's characteristic trit distribution.
   - **Velocity profile:** Musical dynamics curve (crescendo for arousal-increasing transitions, diminuendo for arousal-decreasing, explosive for cross-valence with high arousal delta).
3. **Flux-triggered paths:** Precompute 4 special paths (surprise resolution, interruption, cadential break, tonal reset) that are always available regardless of current emotion.

**Runtime operation:** The pivot table is a static JSON file loaded at ghost engine initialization. The `EmotionPivotTable.update()` method is called each time OpenSMILE features arrive, and returns either `null` (no change) or a pivot directive that modifies the ghost engine's `T1-T4` predictions.

---

## Implementation Summary

### Resource Requirements

| Component | Change | Effort |
|---|---|---|
| **tminus-dispatcher** | Add priority field to CueSpec; move default port to 8768; (optional) add dynamic phase-group routing based on voice quality | Small (~50 lines) |
| **OpenSMILE Bridge** | Add tminus client class; register as agent; send CUE messages with enriched payload | Medium (~80 lines) |
| **Ghost Track Bridge** | Add PivotTable class; integrate emotion state classification into ghost prediction; load pivot table from JSON | Medium (~150 lines) |
| **Pivot table data** | Precompute 30 transitions and 4 flux-triggered paths | Structured JSON file (~300 lines) |

### Key Architectural Decisions

1. **tminus-dispatcher port must change** from 8765 to 8768 (or OpenSMILE bridge changes from 8765 — but OpenSMILE is documented as `:8765` in README).
2. **Option A is the clear winner** — direct WS from OpenSMILE to tminus, with Ghost Track as a sibling agent.
3. **The `payload` field is the enrichment vector** — voice features ride the cue lifecycle without modifying the core scheduling logic.
4. **Phase groups are the natural routing primitive** — create `voice-{stable|neutral|uncertain}` groups for voice-quality-based agent routing.
5. **Pivot tables replace LLM calls** for reharmonization — precomputed emotion→harmonic mappings ensure sub-2ms response.

### Port Allocation (Final)

| Service | Port | Role |
|---|---|---|
| Prosody Bridge | 8766 | Browser voice → basic MIDI |
| OpenSMILE Bridge | 8765 | Server-side 25-feature extraction → enriched MIDI CC |
| Ghost Track Bridge | 8767 | Ghost predictions, pivot tables, session capture |
| **tminus-dispatcher** | **8768** ← (was 8765) | Cue scheduling, phase group orchestration, agent registry |
