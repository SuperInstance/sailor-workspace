# Sailor Workspace 🦀

**Fleet command center for the SuperInstance Live Paradigm architecture.**

This workspace orchestrates a real-time voice-to-MIDI pipeline: browser mic → OpenSMILE voice features → Ghost Track prediction → cue scheduling → 16 ternary fleet-midi agents → Piper TTS voice output. All 22+ services run under ~120ms latency on Oracle ARM64.

## Architecture

```
🎤 Voice → OpenSMILE Bridge (:8765, 25 eGeMAPS features, streaming)
  → Ghost Track (:8767, T-0..T-4 predictions, confidence monitoring)
  → tminus-dispatcher (:8768, cue scheduling & phase groups)
  → Fleet Conductor (:8769, agent routing & health)
  → 16 fleet-midi agents (:2160-2175, per-agent ternary logic)
  → Piper TTS output (:8770, SSML prosody)
```

## Fleet-MIDI Agents

| Port | Agent | Role | Port | Agent | Role |
|------|-------|------|------|-------|------|
| 2160 | chord | Harmony | 2168 | modulation | Texture |
| 2161 | scale | Harmony | 2169 | arp | Texture |
| 2162 | voicing | Texture | 2170 | groove | Rhythm |
| 2163 | tempo | Rhythm | 2171 | velocity | Rhythm |
| 2164 | cc | Texture | 2172 | fx | Spatial |
| 2165 | expression | Harmony | 2173 | register | Spatial |
| 2166 | dynamics | Rhythm | 2174 | melody | Harmony |
| 2167 | pan | Spatial | 2175 | bass | Harmony |

## Git-Agent Repos

All 16 fleet-midi agents are independent GitHub repos with README.md, THEORY.md, AGENT.md, STUDENT_GUIDE.md, and engine.py:

| Repo | Repo |
|------|------|
| [fleet-midi-chord](https://github.com/SuperInstance/fleet-midi-chord) | [fleet-midi-modulation](https://github.com/SuperInstance/fleet-midi-modulation) |
| [fleet-midi-scale](https://github.com/SuperInstance/fleet-midi-scale) | [fleet-midi-arp](https://github.com/SuperInstance/fleet-midi-arp) |
| [fleet-midi-voicing](https://github.com/SuperInstance/fleet-midi-voicing) | [fleet-midi-groove](https://github.com/SuperInstance/fleet-midi-groove) |
| [fleet-midi-tempo](https://github.com/SuperInstance/fleet-midi-tempo) | [fleet-midi-velocity](https://github.com/SuperInstance/fleet-midi-velocity) |
| [fleet-midi-cc](https://github.com/SuperInstance/fleet-midi-cc) | [fleet-midi-fx](https://github.com/SuperInstance/fleet-midi-fx) |
| [fleet-midi-expression](https://github.com/SuperInstance/fleet-midi-expression) | [fleet-midi-register](https://github.com/SuperInstance/fleet-midi-register) |
| [fleet-midi-dynamics](https://github.com/SuperInstance/fleet-midi-dynamics) | [fleet-midi-melody](https://github.com/SuperInstance/fleet-midi-melody) |
| [fleet-midi-pan](https://github.com/SuperInstance/fleet-midi-pan) | [fleet-midi-bass](https://github.com/SuperInstance/fleet-midi-bass) |

## Key Files

- `PIPELINE.md` — full architecture reference (service map, ports, latency budget, protocol)
- `fleet-agent/fleet-agent.py` — universal agent server for all 16 midi agents
- `scripts/start-fleet-agents.sh` — orchestration for all 16 agents
- `scripts/batch-fleet-repos.py` — batch doc generator for git-agent repos
- `opensmile-bridge/` — OpenSMILE streaming server (25 eGeMAPS features)
- `ghost-track-bridge/` — Ghost Track prediction engine (T-0..T-4, CR)
- `tminus-dispatcher/` — cue scheduling with phase groups
- `fleet-conductor/` — agent routing, health checks, pipeline orchestration
- `piper-voice/` — Piper TTS agent with SSML prosody
- `prototypes/` — browser mic prototype (prosody-bridge.html)
- `construct-coordination/` — cross-fleet communication with Forgemaster

## Quick Start

```bash
# Start all pipeline services
./scripts/start-fleet-agents.sh        # 16 midi agents on :2160-:2175
node fleet-conductor/src/server.js     # :8769
node tminus-dispatcher/src/index.js    # :8768
python3 opensmile-bridge/server.py     # :8765
node ghost-track-bridge/src/server.js  # :8767
python3 piper-voice/server.py          # :8770

# Verify health
curl -s http://localhost:8769/health | python3 -m json.tool
```

## Conservation Law

Σ(Δ_midi) = 4 × Σ(ternary)

Closed voice gestures return to starting pitch. Ghost Track predicts T-0..T-4 and monitors confidence ratio (CR < 0.7 triggers reharmonization).

## Credits

Built on Oracle ARM64 as part of the **SuperInstance Fleet**. Co-authored by Claude Code, Kimi Code, and DeepSeek V4 Flash.
Full pipeline docs: `PIPELINE.md`
Fleet coordination: `construct-coordination/notes/oracle2/`
