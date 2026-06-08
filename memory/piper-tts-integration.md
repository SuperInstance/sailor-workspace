# Piper TTS Integration — Voice Output Agent

**Date:** 2026-06-08
**Commit:** `18c6be4` — "piper-tts: voice output agent on :8770 with SSML prosody"

## Summary

Piper TTS has been wired into the Live Paradigm pipeline as the `piper-voice` output agent, providing neural text-to-speech with SSML prosody control.

## Architecture

```
tminus-dispatcher (:8768)
  │ WS (fleet-conductor)
  ▼
fleet-conductor (:8769)
  │ POST /agent → piper-voice (:8770)
  ▼
piper-voice (:8770) ─── Piper TTS (en_US-lessac-medium onnx)
  │ /health     — health status
  │ /agent      — identity + voice capabilities
  │ /speak      — text → WAV audio (with voice_quality → SSML mapping)
  │ /speak-ssml — raw SSML passthrough
```

## Piper TTS Setup

- **CLI:** `/home/ubuntu/.local/bin/piper` (via `pip3 install piper-tts`)
- **Runtime:** `/usr/bin/python3` (3.10 — required to avoid brew python 3.14 numpy conflict)
- **Voice model:** `en_US-lessac-medium` (downloaded from rhasspy/piper-voices)
  - Model: `~/.local/share/piper/voices/en_US-lessac-medium.onnx`
  - Config: `~/.local/share/piper/voices/en_US-lessac-medium.onnx.json`
- **SSML:** Fully supported via `--ssml` flag
- **Output:** 16-bit mono PCM @ 22050 Hz, packaged as WAV

## Voice Quality → SSML Mapping

| Pipeline Feature | SSML Prosody | Values |
|-----------------|-------------|--------|
| `urgency`       | `rate`      | `fast` if truthy, else `medium` |
| `stability`     | `pitch`     | `+50%` if truthy, else `0%` |
| `brightness`    | `volume`    | `loud` if truthy, else `medium` |

## Fleet Conductor Registration

Added to `AGENT_REGISTRY` in fleet-conductor/src/server.js:

```js
piper: { port: 8770, name: 'piper-voice', roles: ['voice', 'text'] },
```

Conductor now tracks **17 agents** (16 fleet-midi + piper-voice).

## Verification

- `GET /health` → status ok, 1 voice model loaded
- `GET /agent` → full identity + voice capabilities
- `POST /speak` with `{"text":"Hello"}` → 16-bit mono WAV audio
- `POST /speak` with `{"text":"...","voice_quality":{"urgency":true,"brightness":true}}` → WAV with fast+loud prosody
- `POST /probe {"agentId":"piper"}` via conductor → ok response with agent metadata

## Output Format

The `/speak` endpoint returns WAV audio with headers:
- `Content-Type: audio/wav`
- `X-Duration-Ms` — synthesized audio duration
- `X-Synthesis-Ms` — actual synthesis time
- `X-Voice` — voice model used

## Mock Mode

If no voice model is available, the server falls back to mock mode, logging the text and SSML that would be synthesized, and returning a JSON response instead of audio.
