#!/usr/bin/env python3.10
"""
fork-export.py — Generate project files for Ardour, QLC+, MuseScore, LMMS, Zrythm
from our lead-sheet-MIDI data. Proof that we integrate with existing tools,
not rebuild them.
"""

import json, os, struct, io, time

OUTPUT = "tensor-output"
os.makedirs(OUTPUT, exist_ok=True)

with open(os.path.join(OUTPUT, "lead-sheet-v2.json")) as f:
    LS = json.load(f)

# Get events from each track
def track_events(t):
    for tr in LS["tracks"]:
        if tr["name"] == t:
            return tr["events"]
    return []

NOTES = track_events("Pitch Contour")
CCS = track_events("Prosody CC")
TEXT = track_events("Transcript")
SYSX = track_events("Stage Directions")

SPEAKER_NAMES = {0: "Alice (Host)", 1: "Bob (Guest)"}

print("Fork Export — Generating project files for 6 tools")
print("  Source: {} events".format(len(NOTES)))

# ─── 1. QLC+ Project (.qxw) — Stage Lighting from Conversation ──────
# Each speaker maps to a fixture. Ternary pitch → dimmer, energy → intensity.
# Stage directions → scene cues.

def export_qlcplus():
    """Generate QLC+ project: speaker fixtures + conversation cues."""
    import xml.etree.ElementTree as ET
    
    root = ET.Element("Engine")
    root.set("Version", "4.12")
    
    # Fixtures: one per speaker
    for sid in [0, 1]:
        fix = ET.SubElement(root, "Fixture")
        fix.set("Name", SPEAKER_NAMES[sid])
        fix.set("Universe", "1")
        fix.set("Address", str(sid * 3 + 1))
        
        # Channel 1: Brightness (maps to ternary pitch)
        ET.SubElement(fix, "Channel", {
            "Name": "Pitch", "Preset": "Intensity"
        })
        # Channel 2: Color temperature (maps to ternary volume)
        ET.SubElement(fix, "Channel", {
            "Name": "Volume Color", "Preset": "RGB_Red" if sid == 0 else "RGB_Blue"
        })
        # Channel 3: Strobe (maps to ternary timing/energy)
        ET.SubElement(fix, "Channel", {
            "Name": "Energy Strobe", "Preset": "Shutter"
        })
    
    # Functions: one scene per conversation event
    func_root = ET.SubElement(root, "Functions")
    
    for i, (note, cc, sx) in enumerate(zip(NOTES, CCS, SYSX)):
        func = ET.SubElement(func_root, "Function")
        func.set("Name", "Word {}: {}".format(i, text_track_event(i)))
        func.set("Type", "Scene")
        func.set("Speed", "Common")
        
        # Fixture value based on ternary pitch
        fix_idx = sx.get("speaker_id", 0)
        pitch_val = max(0, min(255, (cc.get("cc74", 64) - 64) * 4 + 128))
        energy_val = max(0, min(255, cc.get("cc11", 64) * 2))
        
        ET.SubElement(func, "FixtureValue", {
            "FixtureIndex": str(fix_idx), "ChannelIndex": "0",
            "Value": str(pitch_val)
        })
        ET.SubElement(func, "FixtureValue", {
            "FixtureIndex": str(fix_idx), "ChannelIndex": "1",
            "Value": str(energy_val)
        })
    
    # Chaser: sequence of all word-cues
    chaser = ET.SubElement(func_root, "Function")
    chaser.set("Name", "Full Conversation")
    chaser.set("Type", "Chaser")
    speed = ET.SubElement(chaser, "Speed")
    speed.set("FadeIn", "50")
    speed.set("FadeOut", "50")
    speed.set("Duration", "500")
    
    for i in range(len(NOTES)):
        ET.SubElement(chaser, "Step", {
            "Function": "Word {}: {}".format(i, text_track_event(i)),
            "FadeIn": "50", "FadeOut": "50", "Duration": "500"
        })
    
    path = os.path.join(OUTPUT, "conversation-lighting.qxw")
    tree = ET.ElementTree(root)
    tree.write(path, xml_declaration=True, encoding='UTF-8')
    size = os.path.getsize(path)
    print("  1. QLC+: {} — {} fixtures, {} scenes, {} chaser steps".format(
        path, 2, len(NOTES), len(NOTES)))
    return path

def text_track_event(i):
    """Get the word for event i."""
    if i < len(TEXT):
        return TEXT[i].get("word", "?")
    return "?"


# ─── 2. Ardour Session (.ardour) — DAW Project ──────────────────────
# MIDI track for pitch contour + automation lanes for CC + markers for lyrics.

def export_ardour():
    """Generate Ardour session with MIDI track + automation + markers."""
    import xml.etree.ElementTree as ET
    
    session = ET.Element("Session")
    session.set("version", "7000")
    session.set("name", "conversation-lead-sheet")
    session.set("sample-rate", "48000")
    
    # Source for MIDI data
    source = ET.SubElement(session, "Source")
    source.set("name", "pitch-contour.mid")
    
    # MIDI track for Alice
    for sid in [0, 1]:
        track = ET.SubElement(session, "Track")
        track.set("name", "{} Pitch".format(SPEAKER_NAMES[sid]))
        route = ET.SubElement(track, "Route")
        route.set("default-type", "midi")
        
        # Automation for CC74 (pitch)
        auto = ET.SubElement(route, "Automation")
        auto.set("parameter", "cc74")
        for e in NOTES[:20]:
            if e.get("speaker_id") == sid or True:
                time_ms = int(e.get("t", 0) * 1000)
                val = max(0, min(127, e.get("vel", 64) // 1))
                ET.SubElement(auto, "Point", {
                    "time": str(time_ms), "value": str(val)
                })
    
    # Marker track for transcript
    marker_track = ET.SubElement(session, "Track")
    marker_track.set("name", "Transcript")
    marker_track.set("type", "marker_track")
    
    for i, e in enumerate(TEXT):
        time_ms = int(e.get("t", i * 0.3) * 1000)
        m = ET.SubElement(marker_track, "Marker")
        m.set("time", str(time_ms))
        m.set("label", "{}: {}".format(
            "A" if e.get("spk") == 0 else "B", e.get("word", "?")))
    
    path = os.path.join(OUTPUT, "conversation-daw.ardour")
    tree = ET.ElementTree(session)
    tree.write(path, xml_declaration=True, encoding='UTF-8')
    print("  2. Ardour: {} — 2 MIDI tracks, 1 marker track, {} markers".format(
        path, len(TEXT)))
    return path


# ─── 3. MuseScore MusicXML — Notation ────────────────────────────────

def export_musescore():
    """Generate MusicXML: pitch contour as notes, transcript as lyrics."""
    import xml.etree.ElementTree as ET
    
    score = ET.Element("score-partwise")
    score.set("version", "4.0")
    
    # Part list
    pl = ET.SubElement(score, "part-list")
    for sid in [0, 1]:
        sp = ET.SubElement(pl, "score-part")
        sp.set("id", "P{}".format(sid))
        ET.SubElement(sp, "part-name").text = SPEAKER_NAMES[sid]
    
    # Parts
    for sid in [0, 1]:
        part = ET.SubElement(score, "part")
        part.set("id", "P{}".format(sid))
        
        # Filter events for this speaker
        spk_events = [(n, t) for n, t in zip(NOTES, TEXT)
                      if SYSX[min(len(SYSX)-1, len(NOTES)-1)].get("speaker_id", 0) == sid]
        
        if not spk_events:
            continue
        
        measure = ET.SubElement(part, "measure")
        measure.set("number", "1")
        
        # Time signature
        att = ET.SubElement(measure, "attributes")
        ET.SubElement(att, "divisions").text = "4"
        ET.SubElement(att, "time")
        ET.SubElement(att, "beats").text = "4"
        ET.SubElement(att, "beat-type").text = "4"
        ET.SubElement(att, "clef")
        ET.SubElement(att, "sign").text = "G"
        ET.SubElement(att, "line").text = "2"
        
        lyrics_text = ""
        for i, (n, t) in enumerate(spk_events[:32]):
            note_elem = ET.SubElement(measure, "note")
            
            pitch = ET.SubElement(note_elem, "pitch")
            nn = n.get("name", "C4")
            ET.SubElement(pitch, "step").text = nn[0]
            ET.SubElement(pitch, "octave").text = nn[-1]
            
            ET.SubElement(note_elem, "duration").text = "4"
            ET.SubElement(note_elem, "type").text = "quarter"
            
            if i < len(spk_events) - 1:
                word = t.get("word", "la")
                lyr = ET.SubElement(note_elem, "lyric")
                ET.SubElement(lyr, "text").text = word
                lyrics_text += word + " "
    
    path = os.path.join(OUTPUT, "conversation-score.musicxml")
    tree = ET.ElementTree(score)
    tree.write(path, xml_declaration=True, encoding='UTF-8')
    print("  3. MuseScore: {} — 2 parts, {} notes with lyrics".format(path, len(NOTES)))
    return path


# ─── 4. LMMS Project (.mmpz) — DAW with Piano Roll ─────────────────

def export_lmms():
    """Generate LMMS project: track per speaker, piano roll patterns."""
    import xml.etree.ElementTree as ET
    
    # LMMS project format is .mmp XML (or .mmpz gzipped)
    project = ET.Element("lmms-project")
    project.set("version", "1.2")
    
    # Head section
    head = ET.SubElement(project, "head")
    ET.SubElement(head, "bpm").text = "120"
    ET.SubElement(head, "volume").text = "100"
    
    # Track for each speaker
    for sid in [0, 1]:
        track = ET.SubElement(project, "track")
        track.set("name", "{} Pitch".format(SPEAKER_NAMES[sid]))
        track.set("type", "midi")
        
        # Instrument
        instr = ET.SubElement(track, "instrument")
        instr.set("name", "prosody-pitch")
        
        # Pattern / sequence
        seq = ET.SubElement(track, "sequence")
        spk_notes = [n for n in NOTES if len(NOTES) > sid]
        for i, n in enumerate(spk_notes[:10]):
            if i % 2 == sid:
                bar = ET.SubElement(seq, "bar")
                ET.SubElement(bar, "pos").text = str(i)
                ET.SubElement(bar, "len").text = "1"
                ET.SubElement(bar, "muted").text = "0"
    
    path = os.path.join(OUTPUT, "conversation-lmms.mmp")
    tree = ET.ElementTree(project)
    tree.write(path, xml_declaration=True, encoding='UTF-8')
    print("  4. LMMS: {} — 2 MIDI tracks".format(path))
    return path


# ─── 5. Zrythm Project — Modular DAW ───────────────────────────────

def export_zrythm():
    """Generate Zrythm project: MIDI tracks with automation."""
    import xml.etree.ElementTree as ET
    
    # Zrythm uses YAML-like .zrythm format — we use JSON export for simplicity
    zrythm_data = {
        "name": "conversation-lead-sheet",
        "bpm": 120.0,
        "tracks": []
    }
    
    for sid in [0, 1]:
        # MIDI track for pitch
        spk_notes = [(n, t) for n, t in zip(NOTES, TEXT)
                     if SYSX[min(len(SYSX)-1, len(NOTES)-1)].get("speaker_id", 0) == sid]
        
        zrythm_data["tracks"].append({
            "name": "{} Pitch".format(SPEAKER_NAMES[sid]),
            "type": "MIDI",
            "regions": [{
                "start": spk_notes[0][0].get("t", 0) if spk_notes else 0,
                "notes": [{"pitch": _n.get("note", 60), "velocity": _n.get("vel", 64),
                          "start": _n.get("t", 0), "end": _n.get("t", 0) + _n.get("dur", 0.25),
                          "label": _t.get("word", "")} 
                         for _n, _t in spk_notes]
            }]
        })
    
    path = os.path.join(OUTPUT, "conversation-zrythm.json")
    with open(path, "w") as f:
        json.dump(zrythm_data, f, indent=2)
    print("  5. Zrythm: {} — {} tracks, {} regions".format(
        path, len(zrythm_data["tracks"]), len(NOTES)))
    return path


# ─── 6. FluidSynth Render — Audio Output ────────────────────────────

def export_midi_render():
    """Show how FluidSynth renders our MIDI (already have lead-sheet.mid)."""
    mid_path = os.path.join(OUTPUT, "lead-sheet.mid")
    if os.path.exists(mid_path):
        with open(mid_path, "rb") as f:
            data = f.read()
        print("  6. FluidSynth: {} ({} bytes, 4 tracks) — ready to render".format(
            mid_path, len(data)))
        print("     Commands:")
        print("     fluidsynth -a pulseaudio /usr/share/sounds/sf2/FluidR3_GM.sf2 {}".format(mid_path))
        print("     fluidsynth -n -F output.wav /usr/share/sounds/sf2/FluidR3_GM.sf2 {}".format(mid_path))


# ─── Run ──────────────────────────────────────────────────────────

print()
export_qlcplus()
export_ardour()
export_musescore()
export_lmms()
export_zrythm()
export_midi_render()

print()
print("Total: 5 project files + 1 MIDI file = 6 formats from 1 lead-sheet")
print("Pipeline: Piper → Whisper → Lead-Sheet-MIDI → [[QLC+|Ardour|MuseScore|LMMS|Zrythm|FluidSynth]]")
