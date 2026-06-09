import json
import os
import sys
import time
import tempfile
import subprocess
import argparse

# Optional imports
HAS_FLUIDSYNTH = False
HAS_PRETTY_MIDI = False
try:
    import fluidsynth
    HAS_FLUIDSYNTH = True
except ImportError:
    pass
try:
    import pretty_midi
    HAS_PRETTY_MIDI = True
except ImportError:
    pass


# ─── Constants ──────────────────────────────────────────────────────────────

DEFAULT_SOUNDFONT = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
FALLBACK_INSTRUMENTS = {
    0: 54,   # Synth Voice -- pitch contour
    1: 48,   # String Ensemble -- ambient prosody
    2: 0,    # Piano -- transcript track (metronome-like)
    3: 87,   # Lead 7 (fifths) -- stage direction blips
}

SF_PATH_OPTIONS = [
    DEFAULT_SOUNDFONT,
    "/usr/share/sounds/sf2/default-GM.sf2",
    "/usr/share/soundfonts/FluidR3_GM.sf2",
    "~/.local/share/sounds/FluidR3_GM.sf2",
    "FluidR3_GM.sf2",
]


def find_soundfont(custom: str = None) -> str:
    """Find a usable SoundFont file."""
    if custom and os.path.exists(custom):
        return custom
    for p in SF_PATH_OPTIONS:
        expanded = os.path.expanduser(p)
        if os.path.exists(expanded):
            return expanded
    # Try locate
    try:
        result = subprocess.run(["find", "/", "-name", "*.sf2", "-maxdepth", 5],
                                capture_output=True, text=True, timeout=5)
        paths = [l.strip() for l in result.stdout.split("\n") if l.strip() and l.strip().endswith(".sf2")]
        if paths:
            return paths[0]
    except Exception:
        pass
    return None


# ─── Renderer ───────────────────────────────────────────────────────────────

class SynthRenderer:
    """Render lead-sheet-MIDI files to audio via FluidSynth."""

    def __init__(self, soundfont: str = None, sample_rate: int = 44100,
                 instrument: int = None):
        self.soundfont = soundfont or find_soundfont()
        self.sample_rate = sample_rate
        self.instrument = instrument
        if not self.soundfont:
            raise FileNotFoundError("No SoundFont (.sf2) found. "
                                    "Install: apt install fluid-soundfont-gm")

    def _render_midi(self, midi_path: str, output_path: str = None) -> bytes:
        """Render a MIDI file to WAV using FluidSynth."""
        if not HAS_FLUIDSYNTH:
            # Fallback: use fluidsynth CLI
            return self._render_cli(midi_path, output_path)

        fs = fluidsynth.Synth()
        sfid = fs.sfload(self.soundfont)
        fs.start(device=None)
        fs.set_sample_rate(self.sample_rate)

        # Set instrument per channel
        if self.instrument is not None:
            for ch in range(4):
                fs.program_select(ch, sfid, 0, self.instrument)

        # Load and play MIDI
        fs.play_midi_file(midi_path)

        # Record to buffer
        duration = self._get_midi_duration(midi_path)
        buf = None
        if duration > 0:
            buf = fs.get_samples(int(self.sample_rate * duration))
        else:
            buf = fs.get_samples(self.sample_rate * 5)  # 5s default

        fs.delete()

        if output_path:
            import wave
            import struct
            with wave.open(output_path, 'wb') as wf:
                wf.setnchannels(2)
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                # Convert float samples to int16
                arr = (buf * 32767).astype('int16').tobytes()
                wf.writeframes(arr)
            print(f"  Rendered: {output_path} ({os.path.getsize(output_path):,} bytes)")
            return arr
        return buf

    def _render_cli(self, midi_path: str, output_path: str = None) -> bytes:
        """Fallback: use fluidsynth CLI binary."""
        cmd = ["fluidsynth", "-a", "file", "-T", "wav"]
        if output_path:
            cmd.extend(["-o", f"audio.file.name={output_path}"])
        else:
            output_path = tempfile.mktemp(suffix=".wav")
            cmd.extend(["-o", f"audio.file.name={output_path}"])
        cmd.extend(["-F", midi_path, self.soundfont, midi_path])

        print(f"  Running: {' '.join(cmd[:5])} ...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            print(f"  CLI stderr: {result.stderr[:200]}")
            raise RuntimeError(f"fluidsynth CLI failed: exit {result.returncode}")

        if output_path and os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"  Rendered (CLI): {output_path} ({size:,} bytes)")
            with open(output_path, 'rb') as f:
                return f.read()
        raise RuntimeError("fluidsynth produced no output")

    def _get_midi_duration(self, midi_path: str) -> float:
        """Get the duration of a MIDI file in seconds."""
        if HAS_PRETTY_MIDI:
            try:
                pm = pretty_midi.PrettyMIDI(midi_path)
                duration = pm.get_end_time()
                return duration
            except Exception:
                pass
        # Fallback: parse header
        try:
            with open(midi_path, 'rb') as f:
                data = f.read()
            # Simple heuristic: assume 120 BPM, 480 ticks/beat
            # Find the last event time from track data
            import re
            ticks = 0
            # Read tracks for delta times
            pos = 14  # Skip header
            while pos < len(data):
                chunk_type = data[pos:pos+4]
                if chunk_type != b'MTrk':
                    break
                chunk_len = int.from_bytes(data[pos+4:pos+8], 'big')
                pos += 8 + chunk_len
            return max(1.0, ticks * 0.5 / 480)
        except Exception:
            return 5.0  # Default 5 seconds

    def render_json(self, json_path: str, output_path: str = None,
                    instrument: int = None) -> str:
        """Convert lead-sheet JSON to MIDI, then render."""
        if instrument:
            self.instrument = instrument

        # Create temporary MIDI from lead-sheet JSON
        midi_path = json_path.replace(".json", ".mid") if output_path is None else \
                    output_path.replace(".wav", ".mid")
        if not midi_path.endswith(".mid"):
            midi_path = os.path.join(os.path.dirname(json_path) or ".", "temp_conv.mid")

        # Build MIDI from JSON
        with open(json_path) as f:
            data = json.load(f)

        # Find pitch contour events
        events = []
        for tr in data.get("tracks", []):
            if "pitch" in tr.get("name", "").lower():
                events = tr.get("events", [])
                break
            if "prosody" in tr.get("name", "").lower():
                events = tr.get("events", [])

        if not events:
            # Look in any track
            for tr in data.get("tracks", []):
                evs = tr.get("events", [])
                if evs and "note" in evs[0]:
                    events = evs
                    break

        if HAS_PRETTY_MIDI:
            pm = pretty_midi.PrettyMIDI(initial_tempo=120.0)
            inst = pretty_midi.Instrument(program=instrument or FALLBACK_INSTRUMENTS.get(0, 54))

            for ev in sorted(events, key=lambda e: e.get("t", 0)):
                t = ev.get("t", 0.0)
                note = ev.get("note", 60)
                vel = ev.get("vel", 80)
                dur = ev.get("dur", 0.25)
                inst.notes.append(pretty_midi.Note(
                    velocity=int(vel), pitch=int(note),
                    start=t, end=t + dur))

            pm.instruments.append(inst)
            pm.write(midi_path)
            print(f"  Created MIDI: {midi_path} ({os.path.getsize(midi_path):,} bytes)")
        else:
            print("  Warning: pretty_midi not available, can't convert JSON to MIDI")
            return None

        # Render to audio
        output_wav = output_path or midi_path.replace(".mid", ".wav")
        self._render_midi(midi_path, output_wav)
        return output_wav

    def render_midi(self, midi_path: str, output_path: str = None) -> str:
        """Render a MIDI file to audio."""
        output_wav = output_path or midi_path.replace(".mid", ".wav")
        self._render_midi(midi_path, output_wav)
        return output_wav


# ─── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fleet Synth Bridge -- MIDI -> Audio Renderer")
    parser.add_argument('--midi', help='Input MIDI file')
    parser.add_argument('--json', help='Input lead-sheet JSON file')
    parser.add_argument('--output', '-o', help='Output WAV path')
    parser.add_argument('--instrument', type=int, default=None,
                        help='GM instrument patch number (0-127)')
    parser.add_argument('--soundfont', help='Path to SoundFont .sf2')
    parser.add_argument('--list-sf', action='store_true',
                        help='List available SoundFonts')
    parser.add_argument('--check', action='store_true',
                        help='Check dependencies only')
    args = parser.parse_args()

    if args.check:
        sf = find_soundfont()
        print(f"pyfluidsynth: {'✅' if HAS_FLUIDSYNTH else '❌ not installed'}")
        print(f"pretty_midi:  {'✅' if HAS_PRETTY_MIDI else '❌ not installed'}")
        print(f"fluidsynth:   {'✅' if os.path.exists('/usr/bin/fluidsynth') else '❌ not found'}")
        print(f"SoundFont:    {'✅ ' + sf if sf else '❌ not found'}")
        return

    if args.list_sf:
        print("SoundFont options:")
        for p in SF_PATH_OPTIONS:
            exp = os.path.expanduser(p)
            if os.path.exists(exp):
                print(f"  ✅ {exp} ({os.path.getsize(exp):,} bytes)")
            else:
                print(f"  ❌ {p}")
        return

    if not args.midi and not args.json:
        parser.print_help()
        print("\nError: provide --midi or --json")
        sys.exit(1)

    try:
        renderer = SynthRenderer(soundfont=args.soundfont, instrument=args.instrument)
        if args.json:
            result = renderer.render_json(args.json, args.output)
        else:
            result = renderer.render_midi(args.midi, args.output)

        if result:
            duration = 0.0
            import wave
            try:
                with wave.open(result, 'rb') as wf:
                    duration = wf.getnframes() / wf.getframerate()
            except Exception:
                pass
            print(f"  Output: {result}")
            if duration:
                print(f"  Duration: {duration:.1f}s")
            print(f"  ✅ Audio produced -- pipeline loop closed")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
