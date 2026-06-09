# Tool Heritage — Routing 30 Years of Audio-to-MIDI Into One Pipeline

Every tool in the lineage solves one layer of decomposition. Our pipeline doesn't compete with them — it orchestrates them.

```
                    ┌─────────────────────────────┐
                    │   Audio Source               │
                    │  (mic / podcast / song)       │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │   Router — Which Tool?       │
                    │                              │
                    │  Monophonic (voice)?  → aubio │
                    │  Polyphonic (piano)? → Basic☆ │
                    │  Full ensemble?      → Omni   │
                    │  DAW project?       → NeuralN │
                    │  Performance rig?  → PureData │
                    │  Batch analysis?  → Vamp/SV   │
                    └──────┬──────┬──────┬──────┬───┘
                           │      │      │      │
                    ┌──────▼──┐┌──▼──┐┌──▼──┐┌──▼────┐
                    │ aubio   ││Basic││Omni ││Vamp   │
                    │ pitch   ││Pitch││zart ││plugins│
                    │ onset   ││ MIDI││multi││featr  │
                    └────┬────┘└──┬──┘└──┬──┘└──┬────┘
                         │        │      │      │
                    ┌────▼────────▼──────▼──────▼──────┐
                    │  Lead-Sheet-MIDI Format          │
                    │  (unified output from any tool)  │
                    │                                  │
                    │  Track 1: Notes (pitch contour)  │
                    │  Track 2: CC (ternary prosody)   │
                    │  Track 3: Lyrics (transcript)    │
                    │  Track 4: SysEx (stage dirs)     │
                    └────────────┬────────────────────-┘
                                 │
                    ┌────────────▼────────────────────┐
                    │  Fleet Pipeline (our addition)   │
                    │                                  │
                    │  Whisper → word timestamps       │
                    │  OpenSMILE → prosody features    │
                    │  Ghost Track → T-0..T-4 predict  │
                    │  Fleet Conductor → 16 agents     │
                    │  Reharmonizer → CR pivot table   │
                    └────────────┬────────────────────-┘
                                 │
                    ┌────────────▼────────────────────┐
                    │  Fork Export (6 open tools)      │
                    │                                  │
                    │  → QLC+  (lighting from conv)   │
                    │  → Ardour (DAW session)          │
                    │  → MuseScore (sheet music)       │
                    │  → LMMS  (beat production)      │
                    │  → Zrythm (modular DAW)         │
                    │  → FluidSynth (audio render)    │
                    └─────────────────────────────────┘
```

## Tool → Layer Mapping

Each tool from the lineage maps to a layer in our architecture:

| Era | Tool | Layer | What It Feeds | Our Integration |
|-----|------|-------|---------------|-----------------|
| DSP | **aubio** | Pitch/onset detection | Pitch contour track | Monophonic voice: real-time, zero-latency |
| DSP | **Vamp plugins** | Chord/beat/structural analysis | CC + SysEx tracks | Via Sonic Visualiser batch processing |
| DSP | **Pure Data** | Live signal processing | Any track | `fiddle~` and `sigmund~` → WebSocket bridge |
| DSP | **f0 CLI** | Batch pitch extraction | Pitch contour track | Scriptable pipeline for archives |
| DL | **Basic Pitch** | Polyphonic MIDI | Pitch contour + velocity | Offline song decomposition |
| DL | **Magenta** | Piano transcription | Note + velocity tracks | High-accuracy velocity tracking |
| DL | **Neural Note** | DAW plugin integration | Any track | Drag-and-drop into existing production |
| DL | **Omnizart** | Multi-instrument MIDI | Full ensemble | 4-stem instrument separation + transcription |

## Our Addition to the Lineage

What didn't exist before:

1. **Transcript as a MIDI dimension** — lyrics meta-events with word timestamps (from Whisper)
2. **Ternary prosody encoding** — CC#74/71/11 mapping pitch/volume/energy to ternary (+1/0/-1)
3. **Conversation stage directions** — SysEx carrying speaker ID + dialogic role + agreement
4. **Ghost Track prediction** — T-0..T-4 anticipation of conversational arc
5. **Fork export** — 86-event conversation → native QLC+/Ardour/MuseScore/LMMS/Zrythm projects

These don't compete with aubio or Basic Pitch. They *wrap* them. Any tool's MIDI output enters our pipeline, gets enriched with transcript + ternary prosody + stage directions, and exits as 6 open-source project formats.

## Router Decision Logic

```python
def route_audio(source):
    if source.is_monophonic_voice():
        return [aubio(pitch=True, onset=True), whisper(stt=True), opensmile(prosody=True)]
    elif source.is_piano():
        return [basic_pitch(midi=True), whisper(stt=False)]
    elif source.is_full_ensemble():
        return [omnizart(piano=True, vocals=True, drums=True, chords=True)]
    elif source.is_daw_project():
        return [neural_note(plugin=True), whisper(stt=True)]
    elif source.is_live_performance():
        return [pure_data(fiddle=True), whisper(stt=False)]
    else:
        return [vamp_plugins(chords=True, beats=True, structure=True)]
```

The router selects the best tool for the source, runs it, merges the output into lead-sheet-MIDI, and forwards through our fleet pipeline for ternary enrichment. The output is always the same format — 4-track MIDI with notes, CC, lyrics, and SysEx.

## What Each Existing Tool Gives Us (That We Don't Build)

| Tool | We Don't Build This | We Build On Top |
|------|---------------------|-----------------|
| aubio | Real-time pitch tracking | Transcript sync, ternary classification |
| Basic Pitch | Polyphonic note detection | Speaker diarization, prosody enrichment |
| Omnizart | Multi-instrument MIDI | Conversation-layer analysis |
| Pure Data | Live patching environment | Fleet agent WebSocket bridge |
| Vamp | Feature extraction API | Lead-sheet format + fork export |
| QLC+ | Lighting control | Conversation→lighting cue mapping |
| Ardour | DAW multitrack | Marker track + CC automation injection |
| MuseScore | Sheet music notation | Prosody dynamics + lyric alignment |

The lineage is 30 years of tool building. We're not the next tool. We're the **connective tissue** between all of them.
