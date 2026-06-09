#!/usr/bin/env python3
"""
Test Pipeline — End-to-end voice-to-synth test.

Sends pre-recorded speech audio through the OpenSMILE bridge and
synthesizes the resulting MIDI via FluidSynth for audible output.

Usage:
  # Brief test (5 seconds of audio)
  python3 test_pipeline.py

  # Full podcast
  python3 test_pipeline.py --full

  # Custom audio file
  python3 test_pipeline.py --file /path/to/audio.wav

  # With a specific instrument
  python3 test_pipeline.py --patch choir_aahs

  # Render to WAV (no real-time playback)
  python3 test_pipeline.py --render /tmp/output.wav

  # Dry-run: log MIDI events without playing audio
  python3 test_pipeline.py --dry-run
"""

import argparse
import asyncio
import json
import logging
import math
import os
import struct
import sys
import time
import wave

import fluidsynth
import numpy as np
import websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("test-pipeline")

BRIDGE_URL = "ws://localhost:8765"
DEFAULT_SF = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
SAMPLE_RATE = 16000  # Bridge expects 16kHz audio
CHUNK_SECONDS = 0.1  # 100ms audio chunks
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_SECONDS)

# Available patches (same as synth_bridge)
VOICE_PATCHES = {
    "synth_pad":       (0, 90, "Pad 2 (warm) — continuous, blendable"),
    "synth_voice":     (0, 54, "Synth Voice — vocal-like ooh/ahh"),
    "string_ensemble": (0, 48, "String Ensemble — rich harmonics"),
    "breathy_pad":     (0, 91, "Pad 3 (polysynth) — ethereal"),
    "choir_aahs":      (0, 52, "Choir Aahs — directly mimics voice"),
    "lead_saw":        (0, 82, "Lead 5 (sawtooth) — bright, cutting"),
}

DEFAULT_AUDIO = "/home/ubuntu/.openclaw/workspace/tensor-output/podcast.wav"
DEFAULT_PATCH = "synth_pad"


class TestPipeline:
    """End-to-end test: sends audio → bridge → receives MIDI → FluidSynth."""

    def __init__(self, soundfont=DEFAULT_SF, patch=DEFAULT_PATCH,
                 gain=0.3, dry_run=False, render_path=None):
        self.soundfont_path = soundfont
        self.patch_name = patch
        self.gain = gain
        self.dry_run = dry_run
        self.render_path = render_path

        # FluidSynth state
        self.fs = None
        self.sfid = None
        self.channel = 0

        # Current note tracking
        self.current_note = None
        self.current_velocity = 0

        # Stats
        self.stats = {
            "audio_frames_sent": 0,
            "midi_frames_received": 0,
            "notes_played": 0,
            "notes_released": 0,
        }

    def init_synth(self):
        """Initialize FluidSynth."""
        log.info("Initializing FluidSynth...")
        self.fs = fluidsynth.Synth(gain=self.gain, samplerate=44100)

        # Start audio driver
        try:
            self.fs.start(driver="pulseaudio")
        except Exception:
            try:
                self.fs.start()
            except Exception as e2:
                log.warning(f"Audio driver fallback: {e2}")

        if not os.path.exists(self.soundfont_path):
            log.error(f"SoundFont not found: {self.soundfont_path}")
            return False

        self.sfid = self.fs.sfload(self.soundfont_path)
        if self.sfid == -1:
            log.error(f"Failed to load SoundFont: {self.soundfont_path}")
            return False

        log.info(f"Loaded SoundFont: {self.soundfont_path}")

        bank, prog, _ = VOICE_PATCHES[self.patch_name]
        self.fs.program_select(self.channel, self.sfid, bank, prog)
        log.info(f"Patch: {self.patch_name} (bank={bank}, prog={prog})")

        # Initial CC values
        self.fs.cc(self.channel, 7, 100)     # Volume
        self.fs.cc(self.channel, 74, 64)     # Cutoff
        self.fs.cc(self.channel, 91, 40)     # Reverb
        self.fs.cc(self.channel, 93, 40)     # Chorus

        # If rendering to WAV, set up file output
        if self.render_path:
            try:
                self.fs.setting("audio.file.name", self.render_path)
                self.fs.setting("audio.file.type", "wav")
                self.fs.start(driver="file")
                log.info(f"Render target: {self.render_path}")
            except Exception as e:
                log.warning(f"Could not set up file render: {e}")

        log.info("FluidSynth ready ✓")
        return True

    def read_audio(self, audio_path, max_seconds=None):
        """Read audio file and resample to bridge format (16kHz mono float32)."""
        log.info(f"Reading audio: {audio_path}")
        with wave.open(audio_path, "rb") as wav:
            sr = wav.getframerate()
            frames = wav.getnframes()
            channels = wav.getnchannels()
            duration = frames / sr

            if max_seconds:
                frames = int(min(frames, sr * max_seconds))
                duration = frames / sr
                log.info(f"  Using first {max_seconds}s of {duration:.1f}s audio")
            else:
                log.info(f"  Duration: {duration:.1f}s, rate={sr}Hz, channels={channels}")

            raw = wav.readframes(frames)
            audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

            # Convert to mono if stereo
            if channels > 1:
                audio = audio.reshape(-1, channels).mean(axis=1)

            # Resample to 16kHz if needed
            if sr != SAMPLE_RATE:
                log.info(f"  Resampling {sr}Hz → {SAMPLE_RATE}Hz")
                old_len = len(audio)
                new_len = int(old_len * SAMPLE_RATE / sr)
                audio = np.interp(
                    np.linspace(0, old_len - 1, new_len),
                    np.arange(old_len),
                    audio,
                )

        return audio

    def handle_features(self, data: dict):
        """Process incoming feature data from the bridge."""
        self.stats["midi_frames_received"] += 1

        # The bridge sends: {"type": "features", "data": {..., "midi_cc": {...}}}
        features = data.get("data", data)
        midi_cc = features.get("midi_cc", {})

        # Derive MIDI note from voice activity
        loudness = features.get("loudness", 0)
        f0 = features.get("f0_semitones", 0)

        velocity = int(max(0, min(127, loudness * 200)))
        note = int(max(0, min(127, 21 + f0))) if f0 > 0 else 0
        has_voice = velocity > 5 and note > 0

        if self.dry_run:
            if has_voice:
                log.debug(f"MIDI: note={note} vel={velocity} "
                         f"CC7={midi_cc.get(7,0)} CC74={midi_cc.get(74,0)}")
            return

        if has_voice:
            # Note On / Change
            if note != self.current_note:
                if self.current_note is not None:
                    self.fs.noteoff(self.channel, self.current_note)
                    self.stats["notes_released"] += 1
                self.fs.noteon(self.channel, note, velocity)
                self.current_note = note
                self.current_velocity = velocity
                self.stats["notes_played"] += 1
            elif velocity != self.current_velocity:
                self.fs.noteoff(self.channel, note)
                self.fs.noteon(self.channel, note, velocity)
                self.current_velocity = velocity

            # Route CC values from midi_cc dict
            cc = lambda n: midi_cc.get(n, 64)
            self.fs.cc(self.channel, 7, min(127, max(0, cc(7))))    # Volume
            self.fs.cc(self.channel, 74, min(127, max(0, cc(74))))  # Cutoff
            self.fs.cc(self.channel, 1, min(127, max(0, cc(1))))    # Modulation
            self.fs.cc(self.channel, 16, min(127, max(0, cc(16))))  # Expression
            self.fs.cc(self.channel, 17, min(127, max(0, cc(17))))  # Tremolo
            self.fs.cc(self.channel, 2, min(127, max(0, cc(2))))    # Breath
            self.fs.cc(self.channel, 75, min(127, max(0, cc(75))))  # Brightness
            self.fs.cc(self.channel, 91, min(127, max(0, min(100, cc(70)))))  # Reverb
        else:
            # Silence — release note
            if self.current_note is not None:
                self.fs.noteoff(self.channel, self.current_note)
                self.stats["notes_released"] += 1
                self.current_note = None
                self.current_velocity = 0

    def print_stats(self):
        """Print test statistics."""
        log.info(f"  MIDI frames received: {self.stats['midi_frames_received']}")
        log.info(f"  Notes played:         {self.stats['notes_played']}")
        log.info(f"  Notes released:       {self.stats['notes_released']}")

    def cleanup(self):
        """Release FluidSynth."""
        if self.current_note is not None and self.fs:
            try:
                self.fs.noteoff(self.channel, self.current_note)
            except Exception:
                pass
        if self.fs:
            try:
                self.fs.delete()
            except Exception:
                pass
        self.fs = None

    async def run(self, audio_path=DEFAULT_AUDIO, max_seconds=5,
                  bridge_url=BRIDGE_URL):
        """Run the test pipeline."""
        if not self.init_synth():
            return False

        # Read audio
        audio = self.read_audio(audio_path, max_seconds)
        total_chunks = max(1, len(audio) // CHUNK_SIZE)
        log.info(f"Audio prepared: {len(audio)} samples, {total_chunks} chunks")

        # Connect to bridge
        log.info(f"Connecting to bridge at {bridge_url}...")
        try:
            async with websockets.connect(bridge_url, ping_interval=30,
                                           ping_timeout=10) as ws:
                log.info("Connected ✓")

                voice_active = False
                start_time = time.monotonic()

                # Send audio chunks as binary float32 data
                for chunk_idx in range(total_chunks):
                    if time.monotonic() - start_time > CHUNK_SECONDS * total_chunks + 10:
                        log.warning("Pipeline timeout — breaking")
                        break

                    chunk_start = chunk_idx * CHUNK_SIZE
                    chunk_end = min(chunk_start + CHUNK_SIZE, len(audio))
                    chunk = audio[chunk_start:chunk_end]

                    # Pad short chunks
                    if len(chunk) < CHUNK_SIZE:
                        chunk = np.pad(chunk, (0, CHUNK_SIZE - len(chunk)),
                                       'constant')

                    # Send as raw float32 binary (bridge expects this)
                    await ws.send(chunk.astype(np.float32).tobytes())
                    self.stats["audio_frames_sent"] += 1

                    # Drain any pending MIDI responses
                    # (bridge broadcasts to all clients)
                    try:
                        while True:
                            resp = await asyncio.wait_for(ws.recv(), timeout=0.01)
                            if isinstance(resp, str):
                                resp_data = json.loads(resp)
                                if resp_data.get("type") == "features":
                                    self.handle_features(resp_data)

                                    # Log periodic status
                    except asyncio.TimeoutError:
                        pass  # No more pending messages

                elapsed = time.monotonic() - start_time
                log.info(f"\n{'─'*40}")
                log.info(f"Pipeline test complete in {elapsed:.1f}s")
                log.info(f"Audio frames sent:  {self.stats['audio_frames_sent']}")
                log.info(f"MIDI frames received: {self.stats['midi_frames_received']}")

                if self.render_path:
                    log.info(f"Audio rendered to: {self.render_path}")

                # Small pause to let FluidSynth finish
                await asyncio.sleep(0.5)
                return True

        except (ConnectionRefusedError,
                websockets.exceptions.WebSocketException,
                OSError) as e:
            log.error(f"Bridge connection failed: {e}")
            log.error("Is the OpenSMILE bridge running on ws://localhost:8765?")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Voice-to-Synth Pipeline Test",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--full", action="store_true",
                        help="Send full audio file (not just first 5s)")
    parser.add_argument("--file", default=DEFAULT_AUDIO,
                        help=f"Audio file path (default: {DEFAULT_AUDIO})")
    parser.add_argument("--patch", default=DEFAULT_PATCH,
                        choices=list(VOICE_PATCHES.keys()),
                        help=f"Patch (default: {DEFAULT_PATCH})")
    parser.add_argument("--gain", type=float, default=0.3)
    parser.add_argument("--dry-run", action="store_true",
                        help="Log MIDI events without playing audio")
    parser.add_argument("--render", help="Render to WAV file (no real-time)")
    parser.add_argument("--url", default=BRIDGE_URL,
                        help=f"Bridge URL (default: {BRIDGE_URL})")

    args = parser.parse_args()

    pipeline = TestPipeline(
        soundfont=DEFAULT_SF,
        patch=args.patch,
        gain=args.gain,
        dry_run=args.dry_run,
        render_path=args.render,
    )

    max_seconds = None if args.full else 5

    try:
        ok = asyncio.run(pipeline.run(
            audio_path=args.file,
            max_seconds=max_seconds,
            bridge_url=args.url,
        ))
    except KeyboardInterrupt:
        log.info("Interrupted")
        ok = False
    finally:
        pipeline.print_stats()
        pipeline.cleanup()

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
