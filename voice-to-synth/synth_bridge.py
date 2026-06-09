#!/usr/bin/env python3
"""
Voice-to-Synth Bridge — Real-Time Voice → FluidSynth MIDI Synthesis

Architecture:
  OpenSMILE Bridge (ws://localhost:8765) → Synth Bridge → FluidSynth → Audio

The bridge connects to the OpenSMILE voice feature bridge via WebSocket,
receives MIDI CC messages derived from voice features, and routes them
to FluidSynth for real-time audio synthesis using a General MIDI SoundFont.

MIDI CC Map (from OpenSMILE features):
  CC#7   (Volume)       ← Loudness
  CC#74  (Cutoff)       ← F1 formant (vowel openness)
  CC#1   (Modulation)   ← HNR / breathiness
  CC#16  (Distortion)    ← Jitter (vocal roughness)
  CC#17  (Expression)    ← Shimmer (amplitude instability)
  Pitch Bend             ← F0 micro-variation
  Note On/Off            ← F0 → MIDI note number
  Velocity               ← Loudness amplitude
"""

import asyncio
import json
import logging
import os
import signal
import sys
import time
import math
import argparse

import fluidsynth
import websockets

# ─── Logging ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("synth-bridge")

# ─── Constants ───
BRIDGE_URL = "ws://localhost:8765"
DEFAULT_SF = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
SAMPLE_RATE = 44100
MIDI_MAX = 127

# GM instrument patches for voice-inspired sounds
# Each tuple: (name, bank, program, description)
VOICE_PATCHES = {
    "synth_pad":       (0, 90, "Pad 2 (warm) — continuous, blendable"),
    "synth_voice":     (0, 54, "Synth Voice — vocal-like ooh/ahh"),
    "string_ensemble": (0, 48, "String Ensemble — rich harmonics"),
    "breathy_pad":     (0, 91, "Pad 3 (polysynth) — ethereal"),
    "choir_aahs":      (0, 52, "Choir Aahs — directly mimics voice"),
    "lead_saw":        (0, 82, "Lead 5 (sawtooth) — bright, cutting"),
}

DEFAULT_PATCH = "synth_pad"


class VoiceSynthBridge:
    """Receives voice-derived MIDI CC from the OpenSMILE bridge and
    plays them through FluidSynth in real-time."""

    def __init__(self, soundfont: str = DEFAULT_SF, patch: str = DEFAULT_PATCH,
                 gain: float = 0.3, audio_driver: str = "pulseaudio"):
        self.soundfont_path = soundfont
        self.patch_name = patch
        self.gain = gain
        self.audio_driver = audio_driver

        # FluidSynth state
        self.fs = None
        self.sfid = None
        self.channel = 0

        # Current note tracking
        self.current_note = None      # MIDI note number currently sounding
        self.current_velocity = 0     # Current velocity value
        self.last_note_on_time = 0    # Timestamp of last note-on

        # Running flag
        self.running = False

        # Stats
        self.stats = {
            "frames_received": 0,
            "notes_played": 0,
            "notes_released": 0,
            "cc_sent": 0,
            "errors": 0,
        }

    def init_synth(self):
        """Initialize FluidSynth with PulseAudio output and GM soundfont."""
        log.info("Initializing FluidSynth...")

        # Create synth
        self.fs = fluidsynth.Synth(gain=self.gain, samplerate=SAMPLE_RATE)

        # Select audio driver
        log.info(f"Audio driver: {self.audio_driver}")
        try:
            if self.audio_driver == "pulseaudio":
                self.fs.start(driver="pulseaudio")
            elif self.audio_driver == "alsa":
                self.fs.start(driver="alsa")
            elif self.audio_driver == "jack":
                self.fs.start(driver="jack")
            elif self.audio_driver == "sdl2":
                self.fs.start(driver="sdl2")
            elif self.audio_driver == "file":
                self.fs.setting("audio.file.name", "/tmp/synth_output.wav")
                self.fs.setting("audio.file.type", "wav")
                self.fs.start(driver="file")
                log.warning("File output driver — rendering to /tmp/synth_output.wav")
            else:
                self.fs.start(driver=self.audio_driver)

            # Verify audio driver was created
            audio_driver_is_alive = getattr(self.fs, 'audio_driver', None) is not None
            if not audio_driver_is_alive:
                log.warning(f"Driver {self.audio_driver} may not have initialized")

        except Exception as e:
            log.warning(f"Could not start {self.audio_driver} driver: {e}")
            log.info("Trying default audio driver...")
            try:
                self.fs.start()
            except Exception as e2:
                log.error(f"Failed to start FluidSynth audio output: {e2}")
                return False

        # Load soundfont
        if not os.path.exists(self.soundfont_path):
            log.error(f"SoundFont not found: {self.soundfont_path}")
            return False

        self.sfid = self.fs.sfload(self.soundfont_path)
        if self.sfid == -1:
            log.error(f"Failed to load SoundFont: {self.soundfont_path}")
            return False

        log.info(f"Loaded SoundFont: {self.soundfont_path} (id={self.sfid})")

        # Select instrument
        bank, prog, _ = VOICE_PATCHES[self.patch_name]
        self.fs.program_select(self.channel, self.sfid, bank, prog)
        log.info(f"Selected patch: {self.patch_name} "
                 f"(bank={bank}, prog={prog})")

        # Set initial expressive CC values
        self.fs.cc(self.channel, 7, 100)    # Volume = 100
        self.fs.cc(self.channel, 74, 64)    # Filter cutoff = 64
        self.fs.cc(self.channel, 71, 64)    # Resonance = 64
        self.fs.cc(self.channel, 91, 40)    # Reverb send
        self.fs.cc(self.channel, 93, 40)    # Chorus send

        log.info("FluidSynth initialized successfully")
        return True

    def handle_midi_cc(self, data: dict):
        """Process a MIDI CC message from the bridge and send to FluidSynth.

        The bridge sends feature data with a nested `midi_cc` dict:
            {"type": "features", "data": {
                "loudness": 0.5, "f0_semitones": 60.0,
                "midi_cc": {7: 64, 74: 80, 1: 40, ...},
                ...
            }, "timestamp": ...}
        """
        # Extract from bridge response format
        # The bridge wraps in {"type": "features", "data": {...}}
        features = data.get("data", data)
        cc = features.get("midi_cc", {})

        # Voice activity: use loudness as proxy for note velocity
        loudness = features.get("loudness", 0)
        f0 = features.get("f0_semitones", 0)

        # Map loudness (0-1 float) to velocity (0-127)
        velocity = int(max(0, min(127, loudness * 200)))

        # Derive MIDI note from f0_semitones (already in semitone-from-27.5Hz)
        if f0 > 0:
            # f0_semitones is semitones from 27.5Hz → convert to MIDI note
            # MIDI note 0 = 8.175Hz, 27.5Hz = MIDI note 21 (A0)
            # f0_semitones = 12 * log2(f0_hz / 27.5)
            # So MIDI note = 21 + f0_semitones / 12 * 12... wait
            # Actually, f0_semitones is already in semitones from 27.5Hz
            # MIDI note 0 = 27.5/2^3 = 3.44... no
            # 27.5Hz = MIDI note 21 (A0)
            # Each semitone = 1 MIDI step
            # So MIDI note = 21 + f0_semitones
            note = int(max(0, min(127, 21 + f0)))
        else:
            note = 0

        # Also check for CC1 as pitch/modulation
        has_voice = velocity > 5 and note > 0

        # Voice activity threshold
        # velocity > 10 means there's voice activity worth sounding
        has_voice = velocity > 10 and note > 0

        if has_voice:
            # ─── Note On / Note Change ───
            if note != self.current_note:
                # Release old note
                if self.current_note is not None:
                    self.fs.noteoff(self.channel, self.current_note)
                    self.stats["notes_released"] += 1
                    log.debug(f"NoteOff: {self.current_note}")

                # Play new note
                self.fs.noteon(self.channel, note, velocity)
                self.current_note = note
                self.current_velocity = velocity
                self.last_note_on_time = time.monotonic()
                self.stats["notes_played"] += 1
                log.debug(f"NoteOn: {note} vel={velocity}")

            elif velocity != self.current_velocity:
                # Same note, velocity changed — use aftertouch or re-strike
                self.fs.noteoff(self.channel, note)
                self.fs.noteon(self.channel, note, velocity)
                self.current_velocity = velocity
                log.debug(f"Re-strike: {note} vel={velocity}")

            # ─── Route CC values from bridge midi_cc dict ───
            # The bridge sends midi_cc as {cc_number: cc_value}
            cc_val = lambda n: cc.get(n, 64)

            # CC#7  (Volume) ← loudness
            self.fs.cc(self.channel, 7, min(127, max(0, cc_val(7))))
            # CC#74 (Cutoff) ← alpha_ratio
            self.fs.cc(self.channel, 74, min(127, max(0, cc_val(74))))
            # CC#1  (Modulation) ← f0_semitones
            self.fs.cc(self.channel, 1, min(127, max(0, cc_val(1))))
            # CC#16 (Distortion/expression) ← jitter
            self.fs.cc(self.channel, 16, min(127, max(0, cc_val(16))))
            # CC#17 (Expression) ← shimmer
            self.fs.cc(self.channel, 17, min(127, max(0, cc_val(17))))
            # CC#2  (Breath control) ← HNR
            self.fs.cc(self.channel, 2, min(127, max(0, cc_val(2))))
            # CC#75 (Brightness) ← spectral_flux
            self.fs.cc(self.channel, 75, min(127, max(0, cc_val(75))))
            # CC#12-15 (MFCC timbre)
            self.fs.cc(self.channel, 12, min(127, max(0, cc_val(12))))
            self.fs.cc(self.channel, 13, min(127, max(0, cc_val(13))))
            # CC#91 (Reverb send)
            self.fs.cc(self.channel, 91, min(127, max(0, min(100, cc_val(70)))))

            self.stats["cc_sent"] += 1

        else:
            # ─── Silence: Release any sounding note ───
            if self.current_note is not None:
                self.fs.noteoff(self.channel, self.current_note)
                self.stats["notes_released"] += 1
                log.debug(f"NoteOff (silence): {self.current_note}")
                self.current_note = None
                self.current_velocity = 0

        self.stats["frames_received"] += 1

    def change_patch(self, patch_name: str):
        """Change the current instrument patch."""
        if patch_name not in VOICE_PATCHES:
            log.warning(f"Unknown patch: {patch_name}. Available: {list(VOICE_PATCHES.keys())}")
            return False

        # Release current note
        if self.current_note is not None:
            self.fs.noteoff(self.channel, self.current_note)
            self.current_note = None

        self.patch_name = patch_name
        bank, prog, desc = VOICE_PATCHES[patch_name]
        self.fs.program_select(self.channel, self.sfid, bank, prog)
        log.info(f"Switched patch → {patch_name}: {desc}")
        return True

    def print_patches(self):
        """Print available patches."""
        print("\nAvailable instrument patches:")
        print(f"  {'Name':<20} {'Bank':<6} {'Prog':<6} Description")
        print(f"  {'-'*20} {'-'*6} {'-'*6} {'-'*30}")
        for name, (bank, prog, desc) in VOICE_PATCHES.items():
            print(f"  {name:<20} {bank:<6} {prog:<6} {desc}")
        print()

    async def listen_loop(self, bridge_url: str = BRIDGE_URL):
        """Connect to the OpenSMILE bridge and process MIDI CC messages."""
        self.running = True
        reconnect_delay = 1.0

        while self.running:
            try:
                log.info(f"Connecting to bridge at {bridge_url}...")
                async with websockets.connect(bridge_url, ping_interval=30,
                                               ping_timeout=10) as ws:
                    log.info("Connected to bridge ✓")

                    # Listen for welcome message
                    try:
                        welcome = await asyncio.wait_for(ws.recv(), timeout=5)
                        welcome_data = json.loads(welcome)
                        if welcome_data.get("type") == "welcome":
                            log.info(f"Bridge: {welcome_data.get('server', 'unknown')} "
                                     f"({welcome_data.get('features', 0)} features)")
                    except (asyncio.TimeoutError, json.JSONDecodeError):
                        pass

                    reconnect_delay = 1.0  # Reset on successful connection

                    # Main message loop
                    async for message in ws:
                        if not self.running:
                            break
                        try:
                            data = json.loads(message)
                            msg_type = data.get("type", "")

                            if msg_type == "features":
                                # Bridge sends feature data with midi_cc
                                self.handle_midi_cc(data)
                            elif msg_type == "midi":
                                # Legacy format support
                                self.handle_midi_cc(data)
                            elif msg_type == "pong":
                                pass  # heartbeat response

                        except json.JSONDecodeError:
                            log.warning("Received non-JSON message, ignoring")
                        except Exception as e:
                            self.stats["errors"] += 1
                            log.error(f"Message handler error: {e}")

            except (ConnectionRefusedError,
                    websockets.exceptions.WebSocketException,
                    OSError) as e:
                if self.running:
                    log.warning(f"Connection failed: {e}")
                    log.info(f"Retrying in {reconnect_delay:.0f}s...")
                    await asyncio.sleep(reconnect_delay)
                    reconnect_delay = min(reconnect_delay * 2, 30)
            except asyncio.CancelledError:
                break

        log.info("Listen loop ended")

    async def run(self, bridge_url: str = BRIDGE_URL):
        """Initialize synth and start listening."""
        if not self.init_synth():
            log.error("Failed to initialize synth. Exiting.")
            return False

        log.info(f"Synth bridge active — listening on {bridge_url}")
        log.info(f"Patch: {self.patch_name} (change with --patch)")
        log.info("Send Ctrl+C to stop")

        try:
            await self.listen_loop(bridge_url)
        except asyncio.CancelledError:
            pass
        finally:
            self.cleanup()

        return True

    def cleanup(self):
        """Release resources."""
        log.info("Cleaning up...")
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
        self.running = False

    def print_stats(self):
        """Print session statistics."""
        elapsed = time.monotonic() - self.last_note_on_time if self.last_note_on_time else 0
        print(f"\n{'─'*40}")
        print(f"  Synth Bridge Statistics")
        print(f"{'─'*40}")
        print(f"  Frames received:  {self.stats['frames_received']}")
        print(f"  Notes played:     {self.stats['notes_played']}")
        print(f"  Notes released:   {self.stats['notes_released']}")
        print(f"  CC messages sent: {self.stats['cc_sent']}")
        print(f"  Errors:           {self.stats['errors']}")
        print(f"  Current note:     {self.current_note} "
              f"(vel={self.current_velocity})")
        print(f"  Active patch:     {self.patch_name}")
        print(f"{'─'*40}\n")

    def send_test_note(self):
        """Send a test MIDI note to verify FluidSynth output."""
        log.info("Playing test note (C4, 1s)...")
        self.fs.noteon(self.channel, 60, 100)
        time.sleep(0.08)  # slight delay to hear note attack
        self.fs.cc(self.channel, 7, 80)   # Volume
        self.fs.cc(self.channel, 74, 90)  # Bright filter
        self.fs.cc(self.channel, 91, 60)  # Some reverb
        time.sleep(0.9)
        self.fs.noteoff(self.channel, 60)
        log.info("Test note complete")
        return True


def main():
    parser = argparse.ArgumentParser(
        description="Voice-to-Synth Bridge — Real-time voice → FluidSynth synthesis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Run bridge with default settings
  %(prog)s --patch choir_aahs        # Use Choir Aahs instrument
  %(prog)s --patch lead_saw          # Bright synth lead
  %(prog)s --patch synth_pad         # Warm synth pad (default)
  %(prog)s --test                    # Play test note then exit
  %(prog)s --list-patches            # List available instruments
  %(prog)s --sf /path/to/sf2.sf2     # Custom SoundFont
  %(prog)s --gain 0.5               # Increase master gain
  %(prog)s --driver alsa             # Use ALSA audio driver
  %(prog)s --url ws://other:8765     # Custom bridge URL
        """
    )

    parser.add_argument("--patch", default=DEFAULT_PATCH,
                        choices=list(VOICE_PATCHES.keys()),
                        help=f"Instrument patch (default: {DEFAULT_PATCH})")
    parser.add_argument("--sf", default=DEFAULT_SF,
                        help="SoundFont path")
    parser.add_argument("--gain", type=float, default=0.3,
                        help="Master gain 0.0-1.0 (default: 0.3)")
    parser.add_argument("--driver", default="pulseaudio",
                        choices=["pulseaudio", "alsa", "jack", "sdl2", "file"],
                        help="Audio driver (default: pulseaudio)")
    parser.add_argument("--url", default=BRIDGE_URL,
                        help=f"Bridge WebSocket URL (default: {BRIDGE_URL})")
    parser.add_argument("--test", action="store_true",
                        help="Play test note and exit")
    parser.add_argument("--list-patches", action="store_true",
                        help="List available instrument patches")
    parser.add_argument("--verbose", action="store_true",
                        help="Verbose logging")

    args = parser.parse_args()

    if args.verbose:
        log.setLevel(logging.DEBUG)

    bridge = VoiceSynthBridge(
        soundfont=args.sf,
        patch=args.patch,
        gain=args.gain,
        audio_driver=args.driver,
    )

    if args.list_patches:
        bridge.print_patches()
        return 0

    if args.test:
        if not bridge.init_synth():
            return 1
        ok = bridge.send_test_note()
        bridge.cleanup()
        return 0 if ok else 1

    # Graceful shutdown
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def shutdown():
        log.info("Shutting down...")
        bridge.print_stats()
        bridge.cleanup()
        loop.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown)
        except NotImplementedError:
            # Windows compat
            pass

    try:
        loop.run_until_complete(bridge.run(bridge_url=args.url))
    except KeyboardInterrupt:
        shutdown()
    finally:
        bridge.cleanup()
        loop.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
