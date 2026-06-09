"""
basic-pitch-conversation — Spotify Basic Pitch output stage bridge.

Converts Basic Pitch's `predict()` output into our lead-sheet-MIDI-v3
JSON format, consumed by export-ardour.py, fleet-rule-engine, and
all downstream fork targets.

This is the #1 fork priority from the Hermes 405B synthesis:
"Fork Basic Pitch's output stage — not the model, not the inference."

No ML changes. No training. Just a post-processing layer that writes
our proprietary format with continuous pitch (f0_hz + pitch_bend).

Usage on x86_64 (Codespaces):
    python3 -m basic_pitch_conversation input.wav --output lead-sheet.json

ARM64 fallback: the module imports gracefully, all public functions
work with pre-computed pitch data even without Basic Pitch installed.
"""

import json
import os
import sys
import time
import struct
import io
import warnings
from typing import Optional, List, Dict, Any

# Optional imports — Basic Pitch only works on x86_64 (numba/llvmlite issue)
try:
    import basic_pitch
    from basic_pitch import predict as bp_predict
    from basic_pitch import ICASSP_2022_MODEL_PATH
    BASIC_PITCH_AVAILABLE = True
except (ImportError, OSError):
    BASIC_PITCH_AVAILABLE = False

try:
    import pretty_midi
    PRETTY_MIDI_AVAILABLE = True
except ImportError:
    PRETTY_MIDI_AVAILABLE = False

try:
    import numpy as np
    NP_AVAILABLE = True
except ImportError:
    NP_AVAILABLE = False


# ─── Constants ──────────────────────────────────────────────────────────────

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

MIDI_NOTE_MIN = 36  # C2 — lower bound for speech fundamental
MIDI_NOTE_MAX = 96  # C7 — upper bound for speech fundamental

LEAD_SHEET_FORMAT = "lead-sheet-midi-v3"


def note_name(midi_note: int) -> str:
    """Convert MIDI note number to note name with octave."""
    note = midi_note % 12
    octave = (midi_note // 12) - 1
    return f"{NOTE_NAMES[note]}{octave}"


def midi_to_freq(midi_note: int) -> float:
    """Convert MIDI note number to fundamental frequency in Hz."""
    return round(440.0 * (2.0 ** ((midi_note - 69.0) / 12.0)), 2)


def freq_to_midi(freq_hz: float) -> int:
    """Convert frequency in Hz to nearest MIDI note number."""
    if freq_hz <= 0:
        return 60
    return max(MIDI_NOTE_MIN, min(MIDI_NOTE_MAX,
               int(round(69 + 12 * __import__('math').log2(freq_hz / 440.0)))))


# ─── Core Prediction ────────────────────────────────────────────────────────

def predict(audio_path: str, use_tensorflow: bool = False) -> dict:
    """
    Run Basic Pitch on an audio file and return lead-sheet JSON.

    Returns dict with:
        format: "lead-sheet-midi-v3"
        tracks: [Pitch Contour, Prosody CC, Transcript, Stage Directions]
        metadata: {duration, sample_rate, model, note_count}

    Falls back to pretty_midi inference if Basic Pitch unavailable.
    """
    if not BASIC_PITCH_AVAILABLE:
        warnings.warn("Basic Pitch not available on this platform (ARM64). "
                      "Falling back to pretty_midi analysis.")
        return _fallback_predict(audio_path)

    if not NP_AVAILABLE:
        raise ImportError("numpy required for Basic Pitch prediction")

    try:
        model_output, midi_data, note_events = bp_predict(audio_path)
    except Exception as e:
        raise RuntimeError(f"Basic Pitch prediction failed: {e}")

    return _convert_to_lead_sheet(midi_data, note_events, audio_path)


def _convert_to_lead_sheet(midi_data, note_events, audio_path: str) -> dict:
    """Convert Basic Pitch MIDI output to lead-sheet JSON format."""
    events = []
    for i, ne in enumerate(note_events):
        # note_events: (start_time, end_time, pitch, velocity)
        start_t, end_t, pitch, vel = ne[:4]

        # Compute continuous pitch information
        f0_hz = midi_to_freq(pitch)
        pitch_bend = 0  # Basic Pitch doesn't output microtones

        # Map velocity (0-1) to MIDI velocity (0-127)
        midi_vel = min(127, max(1, int(vel * 127)))

        # Estimate energy from velocity
        energy = midi_vel

        # Ternary approximations
        t_pitch = 1 if pitch > 72 else (-1 if pitch < 48 else 0)
        t_vol = 1 if midi_vel > 90 else (-1 if midi_vel < 40 else 0)

        events.append({
            "t": round(start_t, 4),
            "dur": round(end_t - start_t, 4),
            "spk": 0,  # mono source, single speaker assumed
            "note": pitch,
            "name": note_name(pitch),
            "vel": midi_vel,
            "f0_hz": f0_hz,
            "pitch_bend": pitch_bend,
            "t_pitch": t_pitch,
            "t_vol": t_vol,
            "t_timing": 0,
            "role": 0,
            "energy": energy,
        })

    # Get audio duration
    duration = 0.0
    if os.path.exists(audio_path):
        try:
            import soundfile as sf
            info = sf.info(audio_path)
            duration = info.duration
        except Exception:
            pass

    if events:
        duration = max(duration, events[-1]["t"] + events[-1]["dur"])

    return _build_lead_sheet_json(events, duration, {
        "model": "basic-pitch-icassp-2022",
        "note_count": len(events),
        "platform": "x86_64"
    })


def _fallback_predict(audio_path: str) -> dict:
    """
    ARM64 fallback: use pretty_midi to extract note events.
    Less accurate than Basic Pitch but produces the same output schema.
    """
    if not PRETTY_MIDI_AVAILABLE:
        raise ImportError("Need pretty_midi for fallback prediction")

    import pretty_midi
    import librosa
    import numpy as np

    # Load audio
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    duration = len(y) / sr

    # Simple onset detection + pitch estimation
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512,
                                               units='frames')
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

    # Estimate pitch at each onset using autocorrelation
    events = []
    for i, t in enumerate(onset_times):
        if t >= duration - 0.1:
            continue

        frame_start = int(t * sr)
        frame_end = min(frame_start + 4096, len(y))
        frame = y[frame_start:frame_end]

        if len(frame) < 256:
            continue

        # Simple autocorrelation pitch
        corr = np.correlate(frame, frame, mode='same')
        mid = len(corr) // 2
        # Find first peak after center
        search = corr[mid:min(mid + 1024, len(corr))]
        if len(search) < 10:
            continue
        peak_idx = np.argmax(search[10:]) + 10
        if peak_idx <= 0:
            continue
        f0_hz = sr / peak_idx
        if f0_hz < 60 or f0_hz > 500:  # speech range
            continue

        pitch = freq_to_midi(f0_hz)
        pitch_bend = round((f0_hz - midi_to_freq(pitch)) / (midi_to_freq(pitch + 1) -
                           midi_to_freq(pitch)) * 8192) if pitch > 0 else 0
        vel = min(127, max(1, int(60 + (np.std(frame) * 500))))

        events.append({
            "t": round(t, 4),
            "dur": 0.2,
            "spk": 0,
            "note": pitch,
            "name": note_name(pitch),
            "vel": vel,
            "f0_hz": round(f0_hz, 2),
            "pitch_bend": pitch_bend,
            "t_pitch": 1 if pitch > 72 else (-1 if pitch < 48 else 0),
            "t_vol": 1 if vel > 90 else (-1 if vel < 40 else 0),
            "t_timing": 0,
            "role": 0,
            "energy": vel,
        })

    return _build_lead_sheet_json(events, duration, {
        "model": "fallback-pretty-midi",
        "note_count": len(events),
        "platform": "ARM64"
    })


# ─── JSON Builder ───────────────────────────────────────────────────────────

def _build_lead_sheet_json(events: list, duration: float = 0,
                           metadata: dict = None) -> dict:
    """Build the standard lead-sheet-v3 JSON structure from events."""
    word_count = len(events)

    return {
        "format": LEAD_SHEET_FORMAT,
        "description": "Lead-Sheet-MIDI v3 — adds f0_hz + pitch_bend for continuous pitch per Hermes 405B synthesis",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "duration_seconds": round(duration, 2),
        "word_count": word_count,
        "speakers": 1,  # mono source, assumed single speaker
        "metadata": metadata or {},
        "tracks": [
            {
                "name": "Pitch Contour",
                "type": "midi_notes",
                "events": [_format_pitch_event(e) for e in events]
            },
            {
                "name": "Prosody CC",
                "type": "midi_cc",
                "events": [_format_cc_event(e) for e in events]
            },
            {
                "name": "Transcript",
                "type": "text",
                "events": [{"t": e["t"], "word": "", "spk": "A"} for e in events]
            },
            {
                "name": "Stage Directions",
                "type": "sys_ex",
                "events": [{"t": e["t"], "speaker_id": 0, "role": 0} for e in events]
            }
        ]
    }


def _format_pitch_event(e: dict) -> dict:
    """Format a single pitch event for the lead-sheet JSON."""
    return {
        "t": e["t"],
        "note": e["note"],
        "name": e["name"],
        "vel": e["vel"],
        "f0_hz": e.get("f0_hz", midi_to_freq(e["note"])),
        "pitch_bend": e.get("pitch_bend", 0),
    }


def _format_cc_event(e: dict) -> dict:
    """Format a single CC event for the lead-sheet JSON."""
    return {
        "t": e["t"],
        "cc74": e["t_pitch"] * 64 + 64,
        "cc71": e["t_vol"] * 64 + 64,
        "cc11": e["energy"],
        "pitch_bend": e.get("pitch_bend", 0),
    }


# ─── CLI ────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Basic Pitch Conversation Bridge — lead-sheet-MIDI-v3 converter")
    parser.add_argument('input', nargs='?', help='Input audio file (WAV, MP3, FLAC, etc.)')
    parser.add_argument('--output', '-o', help='Output JSON path',
                        default=None)
    parser.add_argument('--status', action='store_true',
                        help='Check if Basic Pitch is available')
    args = parser.parse_args()

    if args.status:
        print(f"Basic Pitch: {'✅ available' if BASIC_PITCH_AVAILABLE else '❌ not available (ARM64)'}")
        print(f"pretty_midi: {'✅ available' if PRETTY_MIDI_AVAILABLE else '❌ not available'}")
        print(f"numpy:       {'✅ available' if NP_AVAILABLE else '❌ not available'}")
        return

    if not os.path.exists(args.input):
        print(f"Error: file not found: {args.input}")
        sys.exit(1)

    if args.output:
        output_path = args.output
    else:
        base = os.path.splitext(os.path.basename(args.input))[0]
        output_path = f"{base}-lead-sheet-v3.json"

    print(f"Processing: {args.input}")
    result = predict(args.input)

    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)

    note_count = result['word_count']
    duration = result['duration_seconds']
    print(f"Done: {note_count} events, {duration:.1f}s audio")
    print(f"Output: {output_path} ({os.path.getsize(output_path):,} bytes)")


if __name__ == '__main__':
    main()
