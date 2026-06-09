#!/usr/bin/env python3.10
"""
export-ardour.py — Create a proper Ardour session directory with:
  - Valid SMF (Standard MIDI File) files per speaker
  - Ardour .ardour session XML referencing them
  - Automation lanes (CC74, CC11) per track
  - Marker track with word-level transcript

Usage:
    python3.10 export-ardour.py
"""

import json, os, struct
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

# ─── Paths ──────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BASE, "..", "tensor-output")
JSON_PATH = os.path.join(OUTPUT, "lead-sheet-v2.json")
SESSION_DIR = os.path.join(OUTPUT, "ardour-session")
MIDI_DIR = os.path.join(SESSION_DIR, "midi")

os.makedirs(MIDI_DIR, exist_ok=True)

# ─── Load Data ──────────────────────────────────────────────────────
with open(JSON_PATH) as f:
    LS = json.load(f)

def get_track(name):
    for tr in LS["tracks"]:
        if tr["name"] == name:
            return tr["events"]
    return []

TRANSCRIPT = get_track("Transcript")
NOTES      = get_track("Pitch Contour")
CCS        = get_track("Prosody CC")
SYSX       = get_track("Stage Directions")

assert len(TRANSCRIPT) == len(NOTES) == len(CCS) == len(SYSX), \
    "All tracks must have same event count"

SPEAKER_NAMES = {0: "Alice", 1: "Bob"}
SPEAKER_LABELS = {0: "A", 1: "B"}
EVENT_COUNT = len(NOTES)
SAMPLE_RATE = 48000

# ─── Helper: delta-time encoding (variable length quantity) ────────
def _vlq(value):
    """Encode a 28-bit value as MIDI variable-length quantity."""
    if value < 0:
        value = 0
    if value > 0x0FFFFFFF:
        value = 0x0FFFFFFF
    parts = []
    parts.append(value & 0x7F)
    value >>= 7
    while value > 0:
        parts.append(0x80 | (value & 0x7F))
        value >>= 7
    parts.reverse()
    return bytes(parts)


# ─── Build SMF File ─────────────────────────────────────────────────
def make_smf(track_name, speaker_id):
    """
    Build a Standard MIDI File (format 1) for one speaker.
    Track 0: tempo map (120 BPM)
    Track 1: note events + CC automation
    """
    import mido
    from mido import MidiFile, MidiTrack, Message, MetaMessage

    mid = MidiFile(ticks_per_beat=480)
    mid.type = 1  # synchronous multi-track

    # ── Track 0: Tempo Map ──────────────────────────────────────
    tempo_map = MidiTrack()
    # Set tempo to 120 BPM
    tempo_map.append(MetaMessage('set_tempo', tempo=500000, time=0))
    # Time signature 4/4
    tempo_map.append(MetaMessage('time_signature',
                                  numerator=4, denominator=4,
                                  clocks_per_click=24,
                                  notated_32nd_notes_per_beat=8,
                                  time=0))
    # Track name
    tempo_map.append(MetaMessage('track_name', name='Tempo Map', time=0))
    # End of track
    tempo_map.append(MetaMessage('end_of_track', time=0))
    mid.tracks.append(tempo_map)

    # ── Track 1: Notes + CC ─────────────────────────────────────
    data_track = MidiTrack()
    data_track.append(MetaMessage('track_name',
                                   name=f'{track_name} Pitch', time=0))
    data_track.append(MetaMessage('instrument_name',
                                   name='Lead Sheet Prosody', time=0))
    # Default program: Acoustic Grand Piano (0)
    data_track.append(Message('program_change', program=0, time=0))

    # Convert time in seconds to MIDI ticks
    # 120 BPM = 500000 µs per beat = 0.5 s per beat
    # ticks_per_beat = 480 → 1 tick = 0.5/480 = ~1.0417 ms
    def sec_to_ticks(t):
        """Convert seconds to MIDI ticks at 120 BPM, 480 ticks/beat."""
        return int(round(t * 480 / 0.5))

    # Filter events for this speaker
    spk_indices = [i for i, sd in enumerate(SYSX)
                   if sd.get("speaker_id", 0) == speaker_id]

    if not spk_indices:
        data_track.append(MetaMessage('end_of_track', time=0))
        mid.tracks.append(data_track)
        # Write to file
        out_path = os.path.join(MIDI_DIR, f'{track_name}.mid')
        mid.save(out_path)
        return out_path

    # Find the last event time to add note-off
    last_time = max(NOTES[i]["t"] for i in spk_indices)
    # Add a bit of padding
    end_time = last_time + 0.5

    # We need to send events in chronological order.
    # For each event: Note On at t, Note Off at t+dur (dur = 0.25s default),
    # CC74 and CC11 at t.
    # Build a sorted event list
    events = []  # (ticks, type, data)

    for idx in spk_indices:
        note = NOTES[idx]
        cc = CCS[idx]
        t = note["t"]
        pitch = note["note"]
        vel = note["vel"]
        dur = note.get("dur", 0.25)  # default duration

        tick = sec_to_ticks(t)
        note_off_tick = sec_to_ticks(t + dur)
        cc74_val = cc.get("cc74", 64)
        cc11_val = cc.get("cc11", 64)
        pitch_bend = note.get("pitch_bend", 0)
        f0_hz = note.get("f0_hz", 440.0)

        # Clamp CC values to 0-127
        cc74_val = max(0, min(127, cc74_val))
        cc11_val = max(0, min(127, cc11_val))

        # CC74 (brightness / spectral content)
        events.append((tick, 'cc', 74, cc74_val))
        # CC11 (expression / dynamics)
        events.append((tick, 'cc', 11, cc11_val))
        # CC99 (NRPN pitch bend offset) — continuous pitch preservation
        pb_norm = max(0, min(127, int((pitch_bend / 8192) * 63 + 64)))
        events.append((tick, 'cc', 99, pb_norm))
        # Note On
        events.append((tick, 'note_on', pitch, vel))
        # Note Off
        events.append((note_off_tick, 'note_off', pitch, 0))

    # Sort by tick, then by type priority
    type_order = {'cc': 0, 'note_on': 1, 'note_off': 2}
    events.sort(key=lambda e: (e[0], type_order.get(e[1], 0)))

    # Write events with delta times
    last_tick = 0
    for tick, etype, *args in events:
        delta = tick - last_tick
        last_tick = tick

        if etype == 'cc':
            data_track.append(Message('control_change',
                                       control=args[0], value=args[1],
                                       time=delta))
        elif etype == 'note_on':
            data_track.append(Message('note_on',
                                       note=args[0], velocity=args[1],
                                       time=delta))
        elif etype == 'note_off':
            data_track.append(Message('note_off',
                                       note=args[0], velocity=args[1],
                                       time=delta))

    # End of track
    data_track.append(MetaMessage('end_of_track', time=0))
    mid.tracks.append(data_track)

    # Write SMF file
    out_path = os.path.join(MIDI_DIR, f'{track_name}.mid')
    mid.save(out_path)
    return out_path


# ─── Build Ardour Session XML ───────────────────────────────────────
def prettify(elem):
    """Return pretty-printed XML string."""
    rough = tostring(elem, 'utf-8')
    parsed = minidom.parseString(rough)
    return parsed.toprettyxml(indent="  ")


def build_ardour_xml(alice_midi, bob_midi):
    """
    Build a proper Ardour session XML.
    Ardour session format (version 7000ish):
    <Session> → <Source> × N → <Region> × N → <Route> × N
    """
    session = Element("Session")
    session.set("version", "7000")
    session.set("name", "conversation-lead-sheet")
    session.set("sample-rate", str(SAMPLE_RATE))

    # ── Sources ────────────────────────────────────────────────
    alice_basename = os.path.basename(alice_midi)
    bob_basename = os.path.basename(bob_midi)

    src_a = SubElement(session, "Source")
    src_a.set("name", alice_basename)
    src_a.set("type", "midi")
    src_a.set("path", f"midi/{alice_basename}")
    src_a.set("id", "1")

    src_b = SubElement(session, "Source")
    src_b.set("name", bob_basename)
    src_b.set("type", "midi")
    src_b.set("path", f"midi/{bob_basename}")
    src_b.set("id", "2")

    # ── Regions ────────────────────────────────────────────────
    # Alice region covering the full session
    duration_sec = max(e["t"] for e in NOTES) + 0.5
    duration_samples = int(duration_sec * SAMPLE_RATE)

    reg_a = SubElement(session, "Region")
    reg_a.set("name", f"alice-prosody")
    reg_a.set("source-id", "1")
    reg_a.set("start", "0")
    reg_a.set("length", str(duration_samples))
    reg_a.set("position", "0")
    reg_a.set("layer", "0")

    reg_b = SubElement(session, "Region")
    reg_b.set("name", f"bob-prosody")
    reg_b.set("source-id", "2")
    reg_b.set("start", "0")
    reg_b.set("length", str(duration_samples))
    reg_b.set("position", "0")
    reg_b.set("layer", "0")

    # ── Routes (Tracks) ────────────────────────────────────────
    # We'll create each track as a Route with MIDI type

    for sid, reg_id, midi_file, label in [
        (0, "1", alice_midi, "Alice (Host) Pitch"),
        (1, "2", bob_midi, "Bob (Guest) Pitch"),
    ]:
        route = SubElement(session, "Route")
        route.set("name", label)
        route.set("default-type", "midi")
        route.set("id", f"route-{3 + sid}")

        # MIDI I/O: input and output
        io = SubElement(route, "IO")
        io.set("name", label)

        # Input port
        inp = SubElement(io, "Input")
        inp.set("type", "midi")
        port_a = SubElement(inp, "Port")
        port_a.set("name", f"{label}/midi_in")
        port_a.set("type", "midi")

        # Output port
        out = SubElement(io, "Output")
        out.set("type", "midi")
        port_b = SubElement(out, "Port")
        port_b.set("name", f"{label}/midi_out")
        port_b.set("type", "midi")

        # Region placement inside a playlist
        playlist = SubElement(route, "Playlist")
        playlist.set("type", "midi")
        playlist.set("name", label)

        # Reference the region
        rref = SubElement(playlist, "RegionReference")
        rref.set("region-name", f"alice-prosody" if sid == 0 else "bob-prosody")
        rref.set("position", "0")

        # ── Automation: CC74 and CC11 lanes ────────────────────
        for cc_num, cc_name in [(74, "Brightness"), (11, "Expression")]:
            auto_list = SubElement(route, "AutomationList")
            auto_list.set("parameter", f"cc{cc_num}")
            auto_list.set("interpolation", "linear")

            # Filter to this speaker
            spk_indices = [i for i, sd in enumerate(SYSX)
                           if sd.get("speaker_id", 0) == sid]

            for idx in spk_indices:
                cc = CCS[idx]
                t = cc["t"]
                val = cc.get(f"cc{cc_num}", 64)
                val = max(0, min(127, val))

                pt = SubElement(auto_list, "Point")
                pt.set("time", str(int(t * SAMPLE_RATE)))  # samples
                pt.set("value", f"{val / 127.0:.6f}")  # 0.0 - 1.0

        # Diskstream / processor chain with MIDI synth hint
        processor = SubElement(route, "Processor")
        processor.set("name", "MIDI Track")
        proc = SubElement(processor, "Redirect")
        proc.set("placement", "pre-fader")

    # ── Marker Track ─────────────────────────────────────────────
    marker_route = SubElement(session, "Route")
    marker_route.set("name", "Transcript")
    marker_route.set("default-type", "midi")
    marker_route.set("id", "route-markers")
    marker_route.set("marker-track", "yes")

    for i, ev in enumerate(TRANSCRIPT):
        t = int(ev["t"] * SAMPLE_RATE)  # sample position
        spk = ev.get("spk", "?")
        word = ev.get("word", "?")
        marker = SubElement(marker_route, "Marker")
        marker.set("time", str(t))
        marker.set("label", f"{spk}: {word}")

    return session


# ─── Main ───────────────────────────────────────────────────────────
def main():
    print("Ardour Session Exporter")
    print("=======================")
    print(f"Events: {EVENT_COUNT} ({sum(1 for s in SYSX if s['speaker_id']==0)} Alice, "
          f"{sum(1 for s in SYSX if s['speaker_id']==1)} Bob)")
    print()

    # 1. Generate SMF files
    print("Generating MIDI files...")
    alice_path = make_smf("pitch-alice", 0)
    bob_path = make_smf("pitch-bob", 1)
    alice_size = os.path.getsize(alice_path)
    bob_size = os.path.getsize(bob_path)
    print(f"  {alice_path} ({alice_size} bytes)")
    print(f"  {bob_path} ({bob_size} bytes)")

    # 2. Build Ardour session XML
    print("Generating Ardour session XML...")
    session_xml = build_ardour_xml(alice_path, bob_path)
    ardour_path = os.path.join(SESSION_DIR, "conversation.ardour")
    with open(ardour_path, "w") as f:
        f.write(prettify(session_xml))
    print(f"  {ardour_path} ({os.path.getsize(ardour_path)} bytes)")

    # 3. Verify MIDI files
    print()
    print("Verifying MIDI files...")
    import mido
    for path, label in [(alice_path, "Alice"), (bob_path, "Bob")]:
        mid = mido.MidiFile(path)
        print(f"  {label}: type={mid.type}, {len(mid.tracks)} tracks, "
              f"{mid.ticks_per_beat} ticks/beat")
        for i, track in enumerate(mid.tracks):
            notes = sum(1 for msg in track if msg.type == 'note_on' and msg.velocity > 0)
            ccs = sum(1 for msg in track if msg.type == 'control_change')
            print(f"    Track {i}: {len(track)} events ({notes} notes, {ccs} CCs)")

    print()
    print("Session directory:")
    for root, dirs, files in os.walk(SESSION_DIR):
        for fn in files:
            fp = os.path.join(root, fn)
            print(f"  {fp} ({os.path.getsize(fp)} bytes)")
    print()
    print("Done. Load the session in Ardour:")
    print(f"  File → Open → {SESSION_DIR}")
    print("Or double-click conversation.ardour")


if __name__ == "__main__":
    main()
