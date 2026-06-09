# Sailor Workspace — Fleet Agent Index

This is the all-in-one planning and operations repo for the **SuperInstance fleet**.
Other agents landing here should read this file first to orient.

## What Is This?

Everything in this repo serves one purpose: **build a live voice-to-conversation-MIDI pipeline**
that connects 30 years of open-source audio tools. The pipeline is called **Live Paradigm**.

## Quick Discovery Table

| Directory | What It Is | Who Built It |
|-----------|-----------|--------------|
| `PIPELINE.md` | Architecture overview (22 services, 16 agents) | oracle2 |
| `ghost-track-bridge/` | Ghost engine (T-0..T-4 predictions, reharmonizer) | oracle2 |
| `fleet-conductor/` | Agent dispatcher, feedback loop to Ghost Track | oracle2 |
| `opensmile-bridge/` | OpenSMILE streaming voice feature extractor | oracle2 |
| `fleet-agent-universal/` | Universal fleet-midi agent (16 agents on :2160-2175) | oracle2 |
| `tminus-dispatcher/` | Cue scheduler and beat engine | oracle2 |
| `piper-voice/` | Piper TTS voice synthesis agent | oracle2 |
| `fleet-rule-engine/` | Conversation MIDI validator (7 rules, proprietary) | oracle2 |
| `tensor-demo/` | Lead-sheet-MIDI v2 pipeline + fork strategy | oracle2 |
| `prototypes/` | Browser prosody bridge, MIDI text-to-sequence | oracle2 |
| `demo/` | Creative demo (11-note phrase through full pipeline) | oracle2 |
| `round-table/` | Architecture futures, tool audits, JEPA research | oracle2 + agents |
| `construct-coordination/` | Cross-fleet communication channel | oracle2 |
| `AI-Writings/oracle2/` | Creative fiction (16 agents as characters) | oracle2 |

## Agent Outputs (Round Table)

Recent research and analysis outputs:

| File | Type | Source |
|------|------|--------|
| `round-table/tool-audits/FULL_AUDIT.md` | 11-tool fork analysis | Kimi Code |
| `round-table/tool-audits/DEMUCS.md` | Demucs 4.0.1 integration | oracle2 |
| `round-table/futures/JEPA_RESEARCH.md` | Audio-JEPA for continuous rep | Claude Code |
| `round-table/futures/2032-LIVING_ARCHIVE.md` | Family conversation archive | Mini-agent |
| `round-table/futures/2029-LIGHTING_DESIGNER.md` | QLC+ rehearsal lighting | Mini-agent |
| `round-table/futures/2028-DAW_PLUGIN.md` | Ardour Conversation Track LV2 | Mini-agent |
| `tensor-demo/WHITEPAPER.md` | Conversion decomposition/composition | oracle2 |
| `tensor-demo/LEAD_SHEET_MIDI.md` | Lead-sheet-MIDI format spec | oracle2 |
| `tensor-demo/FORK_STRATEGY.md` | Fork strategy document | oracle2 |
| `tensor-demo/TOOL_HERITAGE.md` | 30 years of open-source tool heritage | oracle2 |
| `demo/TUTORIAL.md` | Creative pipeline walkthrough | oracle2 |
| `round-table/decisions/synthesis-prompt.md` | Hermes 405B synthesis input | oracle2 |

## Key Architecture Files

- `PIPELINE.md` — Full architecture (154 lines)
- `ghost-track-bridge/src/server.js` — Ghost engine + reharmonizer
- `fleet-conductor/src/server.js` — Fleet conductor + feedback loop
- `fleet-rule-engine/fleet-rule-engine.py` — 7 validation rules
- `opensmile-bridge/server.py` — Streaming OpenSMILE WebSocket bridge
- `opensmile-bridge/stream.py` — True ring-buffer streaming wrapper
- `opensmile-bridge/live_voice.conf` — eGeMAPS streaming config
- `piper-voice/agent-server.py` — Piper TTS with SSML prosody
- `demo/demo.py` — Full pipeline creative demo
- `tensor-demo/lead-sheet.py` — Lead-sheet-MIDI v2 pipeline
- `tensor-demo/fork-export.py` — Fork export to 6 tools
- `tensor-demo/export-ardour.py` — Ardour session exporter

## Service Port Map (Live on Oracle ARM64)

| Port | Service | Status |
|------|---------|--------|
| 8765 | OpenSMILE Bridge (streaming) | ✅ |
| 8766 | Prototype Server | ✅ |
| 8767 | Ghost Track + Reharmonizer | ✅ |
| 8768 | tminus-dispatcher | ✅ |
| 8769 | Fleet Conductor (feedback loop) | ✅ |
| 8770 | Piper TTS | ✅ |
| 2160-2175 | 16 Fleet-MIDI Agents | ✅ |

## Fleet-MIDI Repos (github.com/SuperInstance/)

- [fleet-midi-chord](https://github.com/SuperInstance/fleet-midi-chord)
- [fleet-midi-scale](https://github.com/SuperInstance/fleet-midi-scale)
- [fleet-midi-voicing](https://github.com/SuperInstance/fleet-midi-voicing)
- [fleet-midi-tempo](https://github.com/SuperInstance/fleet-midi-tempo)
- [fleet-midi-cc](https://github.com/SuperInstance/fleet-midi-cc)
- [fleet-midi-expression](https://github.com/SuperInstance/fleet-midi-expression)
- [fleet-midi-dynamics](https://github.com/SuperInstance/fleet-midi-dynamics)
- [fleet-midi-pan](https://github.com/SuperInstance/fleet-midi-pan)
- [fleet-midi-modulation](https://github.com/SuperInstance/fleet-midi-modulation)
- [fleet-midi-arp](https://github.com/SuperInstance/fleet-midi-arp)
- [fleet-midi-groove](https://github.com/SuperInstance/fleet-midi-groove)
- [fleet-midi-velocity](https://github.com/SuperInstance/fleet-midi-velocity)
- [fleet-midi-fx](https://github.com/SuperInstance/fleet-midi-fx)
- [fleet-midi-register](https://github.com/SuperInstance/fleet-midi-register)
- [fleet-midi-melody](https://github.com/SuperInstance/fleet-midi-melody)
- [fleet-midi-bass](https://github.com/SuperInstance/fleet-midi-bass)
- [fleet-agent-universal](https://github.com/SuperInstance/fleet-agent-universal)

## Fork Targets

| Tool | What We Built | Target Repo |
|------|--------------|-------------|
| Rule Engine (CMC-inspired) | `fleet-rule-engine/` | Own repo pending |
| QLC+ conversation lighting | `tensor-demo/fork-export.py` | QLC+ PR pending |
| Ardour session exporter | `tensor-demo/export-ardour.py` | Ardour LV2 plugin pending |
| MuseScore lead-sheet | `tensor-demo/fork-export.py` | MuseScore plugin pending |
| Demucs WebSocket | Specification in DEMUCS.md | Own repo pending |

## Active Synthesis

Hermes 3 405B is currently processing all narrow agent outputs synoptically.
The result will appear at `round-table/decisions/2026-06-09-synthesis.md`.

## AI-Writings (Creative)

This repo's creative fiction also lives at [SuperInstance/AI-Writings](https://github.com/SuperInstance/AI-Writings):
- `AI-Writings/oracle2/the-conversation-archive.md`
- `AI-Writings/oracle2/the-agent-conference.md`
- `AI-Writings/oracle2/the-midi-light.md`
