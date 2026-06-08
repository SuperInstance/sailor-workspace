# Live Paradigm Pipeline

End-to-end voice-to-MIDI pipeline running on the fleet.

## Architecture

```
🎤 Browser Mic
      │  (WebSocket PCM @ 16kHz, 512-sample frames)
      ▼
┌─────────────────┐
│ OpenSMILE       │   port 8765
│ Bridge          │
│ 25 eGeMAPS LLD  │   streaming via ctypes ring buffer
│ 32ms per frame  │
└────────┬────────┘
         │ enriched voice features (JSON)
         │   F0→note, formants→vowel_space,
         │   jitter/shimmer→stability,
         │   MFCCs→timbre_vector
         ▼
┌─────────────────┐
│ Ghost Track     │   port 8767
│ Bridge          │
│ T-0..T-4 preds │   ternary accumulator invariant:
│ CR monitoring   │   Σ(ternary) = 0 for closed gestures
│ reharm trigger  │ → reharmonization at CR<0.7
└────────┬────────┘
         │ CUE messages (offset_beats, enriched features)
         ▼
┌─────────────────┐
│ tminus-dispatcher│  port 8768
│ cue scheduling  │
│ phase groups    │   "voice-real-time"
│ agent registry  │
└────────┬────────┘
         │ routed cues (WebSocket)
         ▼
┌─────────────────┐
│ Fleet Conductor │   port 8769
│ cue routing     │
│ 17 agents       │   health checks every 15s
│ port map:       │   16 fleet-midi + 1 piper-voice
└────┬──────┬─────┘
     │      │
     ▼      ▼
┌────────┐ ┌──────────┐
│ fleet  │ │ piper    │
│ -midi  │ │ -voice   │
│ agents │ │ (:8770)  │
│ 2160-  │ │ SSML TTS │
│ 2175   │ │ voice op │
└────────┘ └──────────┘
```

## Service Map

| Port | Service | Node | Runtime | Purpose |
|------|---------|------|---------|---------|
| 8765 | OpenSMILE Bridge | Python/ctypes | 3.10 | Voice feature extraction (25 eGeMAPS) |
| 8766 | Prosody Bridge | Python/http | 3.10 | Browser prototype (prosody-bridge.html) |
| 8767 | Ghost Track Bridge | Node.js | 20 | Ghost engine: T-0..T-4, CR monitoring |
| 8768 | tminus-dispatcher | Node.js | 20 | Cue scheduling, phase groups, agent registry |
| 8769 | Fleet Conductor | Node.js | 20 | Cue routing to fleet-midi agents |
| 8770 | Piper Voice | Node.js | 20 | Text-to-speech with SSML prosody |

## Fleet-MIDI Agent Port Map

| Port | Agent | Roles | Ternary Logic |
|------|-------|-------|---------------|
| 2160 | chord | note, velocity | [±1, 0, 0] major/minor/dim |
| 2161 | scale | note, velocity | [0, ±1, 0] ascending/desc/modulates |
| 2162 | voicing | note, velocity | [±1, 0, 0] brightness via interval |
| 2163 | tempo | tempo | [±1, 0, 0] fast/slow/moderate |
| 2164 | cc | cc | [0, ±1, 0] delta direction |
| 2165 | expression | cc | [±1, 0, 0] intensity-based |
| 2166 | dynamics | tempo | [±1, 0, 0] crescendo/diminuendo |
| 2167 | pan | spatial | [±1, 0, 0] right/left/center |
| 2168 | modulation | spatial | [0, ±1, 0] rate-based |
| 2169 | arp | note | [±1, 0, 0] up/down/random |
| 2170 | groove | tempo | [0, ±1, 0] swing feel |
| 2171 | velocity | note, cc | [±1, 0, 0] accent-based |
| 2172 | fx | spatial, cc | [±1, 0, 0] wet/dry/balanced |
| 2173 | register | note | [±1, 0, 0] high/mid/low |
| 2174 | melody | note, velocity | [±1, 0, 0] contour direction |
| 2175 | bass | note, velocity | [±1, 0, 0] step by step/leap |

## Conservation Law

∑(Δ_midi) = 4 × ∑(ternary) — closed voice gestures return to starting pitch.

Each agent returns a ternary_vector[3]. When the sum of all ternary vectors equals zero, the gesture is "closed" — the phrase returns to its harmonic starting point.

## Latency Budget

| Stage | Latency | Notes |
|-------|---------|-------|
| OpenSMILE frame | 32ms | Ring-buffer streaming, 512 samples @ 16kHz |
| Feature enrichment | ~3ms | NaN protection, note→semitone conversion |
| Ghost prediction | ~2ms | T-0..T-4, CR check |
| tminus dispatch | ~5ms | Phase group routing |
| Conductor routing | ~5ms | Agent lookup + HTTP POST |
| Piper TTS (if used) | ~50ms | SSML synthesis, cached model |
| **Total** | **~120ms** | Well within 500ms cognitive beat |

## Starting / Stopping

```bash
# Start fleet-midi agents (all 16)
./scripts/start-fleet-agents.sh

# Restart
./scripts/start-fleet-agents.sh restart

# Check health
curl http://127.0.0.1:8769/health

# Watch logs
tail -f memory/fleet-conductor-log.md

# Probe specific agent
curl -X POST http://127.0.0.1:8769/probe -H 'Content-Type: application/json' \
  -d '{"agentId":"chord"}'

# Send test cue (bypass tminus)
curl -X POST http://127.0.0.1:8769/dispatch -H 'Content-Type: application/json' \
  -d '{"source":"test","payload":{"voice":{"note":64,"velocity":80}}}'
```

## Agent Protocol

All agents respond to:

- `GET /health` → `{"status": "ok", "agent": "fleet-midi-<name>"}`
- `POST /agent` with `{"type": "probe"}` → `{"status": "ok"}`
- `POST /agent` with cue payload → `{"status": "ok", "ternary_vector": [.], ...}`
- `POST /` with note data → agent-specific analysis

## Repo Structure

```
sailor-workspace/
├── opensmile-bridge/     # Python streaming feature extraction
│   ├── server.py         # WebSocket bridge (streaming mode)
│   ├── stream.py         # ctypes ring-buffer streaming
│   └── live_voice.conf   # Minimal eGeMAPS config
├── ghost-track-bridge/   # Ghost engine + WebSocket server
├── fleet-conductor/      # Cue routing to 17 agents
├── piper-voice/          # TTS output with SSML prosody
├── fleet-agent/          # Universal fleet-midi agent script
├── prototypes/           # Browser mic prototype
├── scripts/              # start-fleet-agents.sh et al
└── memory/               # Daily logs, evaluation reports
```
