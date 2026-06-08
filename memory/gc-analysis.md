# GC Analysis & Missed Innovations — Live Paradigm Post-Mortem

Standing on the 22-service stack after a full day's build. What's really there, what's dead weight, and what architecture insights only become visible at this altitude.

## 1. Storage GC — 45G Drive, 87% Full, 6G Free

### Immediate Reclaim Candidates

| Asset | Size | Status | Action |
|-------|------|--------|--------|
| A2A-native-notebookLM/.venv | 794M | Not used by pipeline | `rm -rf` |
| constraint-theory-core (git) | 113M | L1-only repo, no local build needed | Delete local clone |
| craftmind-fishing (git + assets) | 180M | L1-only | Delete local clone |
| npm cache | 50M | Not used by any active service | `npm cache clean --force` |
| forgemaster-archive/ | 137M | Already GC'd once, returned | Delete (L1) |
| heddle/ | 24M | L1 | Delete |
| Other cloned repos (eisenstein, deadband, cocapn, pythagorean, DeckBoss) | ~80M | L1 | Delete |

**Total reclaimable: ~1.4G** → brings free from 6G → ~7.4G

### Process GC — Unused Services

| Process | RSS | Cost | Action |
|---------|-----|------|--------|
| SurrealDB | 173MB | Used by... nothing in the pipeline | `systemctl stop surreal` + disable |
| lever-runner-bot | 185MB | Lever-runner is on GitHub/Azure now | `systemctl stop lever-runner` + disable |
| Docker daemon | 93MB | Carrying one surreal image | `systemctl disable docker` |
| Ollama | 81MB | No active queries | `systemctl disable ollama` |

**Total reclaimable: ~532MB RAM** → frees headroom for pipeline audio buffers

## 2. Architectural Insight: The Pipeline Is All Analysis, No Synthesis

This is the biggest missed innovation that only becomes visible now:

```
🎤 Voice → extract → classify → ternarize → route → analyze
                                                       ↑
                                          Everything ends here
```

**Nothing produces sound.** The 16 agents classify MIDI parameters into ternary vectors, but:
- No agent synthesizes an actual MIDI stream (`.mid` file or real-time messages)
- No agent talks to a software synthesizer
- No agent produces audible output through the audio interface
- Piper TTS is for voice alerts, not musical output

**The pipeline is a music ANALYZER, not a music CREATOR.** The user hums → agents classify → ... silence.

### What was supposed to happen
The Live Paradigm document described agents negotiating musical intent and producing MIDI output. What we built is a voice-to-classification system. The agents analyze but don't create.

## 3. Architectural Insight: No Feedback Loop

Ghost Track predicts T-0..T-4 (the next 5 time steps). But:

- **Agent outputs never feed back into Ghost Track.** The chord agent classifies Cmaj→[1,0,0], but that ternary vector doesn't inform the next T-0 prediction.
- **The conservation law (Σ(Δ_midi) = 4 × Σ(ternary)) is aspirational.** Nothing in the architecture enforces it. There's no accumulator that checks whether a gesture returned to its starting point.
- **CR < 0.7 triggers reharmonization of WHAT?** No harmony engine exists to reharmonize against. The trigger fires into a void.

## 4. Architectural Insight: Agent Isolation Is a Design Flaw

16 agents, each independently analyzing the same voice input. But:

- **Chord quality depends on scale context.** C-E-G is major in C major, but the same notes are a VI chord in E minor. Each agent classifies without knowing what other agents classified.
- **Voicing depends on register.** A close voicing in the low register sounds very different from the same voicing in the high register. No inter-agent communication.
- **Tempo has no shared clock.** Every agent has its own concept of "now." Without a shared beat clock, rhythm-based agents (tempo, groove, velocity) operate on inconsistent timelines.

**The ternary vector is computed 16 times from the same input, independently, with zero state sharing.** This is redundant at best, contradictory at worst.

## 5. Architectural Insight: Sync HTTP for Real-Time Music

The agent protocol uses HTTP POST with 5s timeout. This is fine for orchestration (health checks, configuration) but wrong for real-time audio:

- **Latency budget is ~120ms total.** HTTP adds TCP handshake, TLS, headers, serialization per request.
- **5s timeout is absurd.** A human can hum a complete melodic phrase in 2-3 seconds. The agent gets 5x that to classify it.
- **No persistent connection.** Every probe is a new TCP connection, new HTTP transaction. At 16 agents × every 15s = ~1 new connection per second just for health checks.

## 6. Missed Innovation: The Doc-to-Code Ratio

Count: 19 repos, 80+ documentation files, ~5 actual working code files for the pipeline's core function.

The documentation-to-code ratio is ~16:1 by file count, likely 10:1 by bytes. This is because:

- Each fleet-midi agent is a git repo with 5 documentation files but ~30 lines of real engine code
- The engine.py template is 50 lines of boilerplate + default handler
- The actual agent-specific logic is 10-20 lines per agent (ternary decision tree)
- The same code exists in fleet-agent-universal and in each per-agent repo (duplicated)

**The git-native-agent pattern is elegant but over-documented.** Each repo's docs took 2-3KB of thoughtful content, but the code itself is a template. The value is in the docs (educational content), not the code.

## 7. Missed Innovation: Shared Beat Clock

No agent has a shared concept of "beat 0." T-minus dispatcher schedules cues by offset_beats, but:

- When does beat 0 start?
- How do agents sync their internal clocks?
- What happens when an agent takes 3 seconds to respond but the beat has moved on?

**Without a shared beat clock, temporal agent communication is impossible.** You can't route a "tempo change on beat 4" if nobody agrees when beat 4 is.

## 8. What's Actually Good

Not everything is wrong. Standing at altitude:

- **The streaming OpenSMILE wrapper** is ARM64-native, verified working at 25 features × 96 frames/s. This is the real engineering achievement.
- **Ghost Track's accumulator invariant** (T-0 + T-1 + T-2 + T-3 + T-4 = Σ(trit) × 4) is mathematically sound and implementable.
- **The conservation law** expresses a real musical truth: closed gestures return to origin. Even if not enforced, it's a useful design constraint.
- **Piper TTS with SSML prosody** (urgency→rate, stability→pitch, brightness→volume) is a working voice output for a voice-input system.
- **The tminus-dispatcher phase group system** provides actual timing infrastructure that no other component uses yet.

## Actionable GC Plan

### Phase 1 — Free 1.4G Disk Tonight
```bash
docker system prune -f
rm -rf ~/A2A-native-notebookLM/.venv  # 794M
rm -rf ~/workspace/constraint-theory-core  # 113M
rm -rf ~/workspace/craftmind-fishing  # 180M
rm -rf ~/workspace/forgemaster-archive  # 137M
rm -rf ~/workspace/heddle ~/workspace/eisenstein* ~/workspace/deadband*
rm -rf ~/workspace/cocapn* ~/workspace/pythagorean48 ~/workspace/DeckBoss
npm cache clean --force
```

### Phase 2 — Free 532MB RAM
```bash
systemctl stop surreal ollama docker docker.socket lever-runner
systemctl disable surreal ollama docker docker.socket lever-runner
```

### Phase 3 — Architecture Fixes (Next Session)
1. Add an **accumulator enforcement** in Ghost Track to validate conservation law
2. Build a **shared beat clock** that all agents reference
3. Change agent protocol from HTTP POST to **WebSocket push** for real-time messages
4. Build the **feedback loop**: agent outputs → Ghost Track re-prediction
5. Verify with **real browser mic audio** through the full pipeline
