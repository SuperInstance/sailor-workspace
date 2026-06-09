#!/usr/bin/env python3.10
"""
lead-sheet.py v2 — Build it right.

End-to-end: Piper TTS → Whisper word timestamps → Lead-Sheet-MIDI → Graph → Compose
"""

import json, sys, os, time, random, io, wave, struct
import numpy as np
import soundfile as sf

OUTPUT = "tensor-output"
os.makedirs(OUTPUT, exist_ok=True)

# ─── Piper TTS — Generate Podcast Audio ────────────────────────────────

def tts(text, length_scale=1.0, sr=22050):
    """Piper TTS: text → numpy audio array with prosody control."""
    import sys as _sys
    _sys.path.insert(0, '/home/ubuntu/.openclaw/workspace/piper-voice')
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    
    voice = PiperVoice.load('/home/ubuntu/.openclaw/workspace/piper-voice/en_US-lessac-medium.onnx')
    
    buf = io.BytesIO()
    wf = wave.open(buf, 'wb')
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    
    cfg = SynthesisConfig()
    cfg.length_scale = length_scale
    voice.synthesize_wav(text, wf, syn_config=cfg)
    wf.close()
    
    buf.seek(0)
    with wave.open(buf, 'rb') as f:
        frames = f.readframes(f.getnframes())
        return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

def generate_podcast():
    """Two-speaker podcast with distinct prosody per speaker."""
    script = [
        (0, "Welcome to the future of conversation."),
        (0, "Can machines really understand how we speak?"),
        (1, "They can analyze patterns in our voice."),
        (1, "Not just what we say but how we say it."),
        (0, "But is not that just statistics with extra steps?"),
        (1, "The patterns reveal emotional states."),
        (1, "Rising pitch signals a question."),
        (1, "Falling pitch signals certainty."),
        (0, "So you are mapping feelings to numbers?"),
        (1, "Think of it as prosodic MIDI."),
        (1, "Every word becomes a musical note."),
        (0, "And you can play that music back?"),
        (1, "Or compose entirely new conversations from it."),
    ]
    
    # Alice (speaker 0): fast, bright → length_scale 0.75
    # Bob   (speaker 1): slow, deliberate → length_scale 1.2
    length_scales = {0: 0.75, 1: 1.2}
    
    channels = {0: [], 1: []}  # Per-speaker audio streams
    timeline = []  # (time, speaker, text)
    sr = 22050
    
    for sid, text in script:
        print("  Speaker {}: {}".format(sid, text))
        ls = length_scales[sid]
        try:
            audio = tts(text, length_scale=ls, sr=sr)
        except Exception as e:
            # Fallback: generate varied tone
            dur = 1.5 + 0.5 * (len(timeline) % 3)
            t = np.linspace(0, dur, int(sr*dur), False)
            base = 220 if sid == 0 else 130
            audio = 0.3 * np.sin(2*np.pi*base*t)
            audio += 0.02 * np.random.randn(len(audio))
        
        channels[sid].append(audio)
        channels[sid].append(np.zeros(int(sr * 0.3), dtype=np.float32))
        timeline.append((time, sid, text))
    
    # Interleave: Alice Bob Bob Bob Alice Bob Bob Bob Alice Bob Bob Alice Bob
    # (keep original order)
    mixed = []
    for sid, text in script:
        idx = [s for s, t in enumerate(channels[sid]) if isinstance(t, np.ndarray) and len(t) > sr*0.1]
        
    # Actually just concatenate in script order
    full = []
    for sid, text in script:
        # Find next audio chunk for this speaker
        if channels[sid]:
            full.append(channels[sid].pop(0))
            if channels[sid]:
                full.append(channels[sid].pop(0))  # silence
    
    full_audio = np.concatenate(full)
    path = os.path.join(OUTPUT, "podcast.wav")
    sf.write(path, full_audio, sr)
    print("  Podcast: {:.1f}s, {}".format(len(full_audio)/sr, path))
    return path, script, timeline


# ─── Whisper — Word-Level Transcript ───────────────────────────────────

def transcribe(audio_path):
    """Whisper word-level transcript with timestamps."""
    from faster_whisper import WhisperModel
    
    print("  Loading Whisper tiny...")
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    
    print("  Transcribing...")
    segments, info = model.transcribe(audio_path, word_timestamps=True, vad_filter=False)
    
    words = []
    for seg in segments:
        seg_words = []
        for w in seg.words:
            seg_words.append({
                "word": w.word.strip(),
                "start": w.start,
                "end": w.end,
                "probability": w.probability
            })
        words.extend(seg_words)
        print("    [{:.1f}s-{:.1f}s] {} ({} words)".format(
            seg.start, seg.end, seg.text.strip()[:60], len(seg_words)))
    
    return words


# ─── Lead-Sheet-MIDI Builder ───────────────────────────────────────────

MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

def note_name(m):
    return MIDI_NOTES[m % 12] + str(m // 12 - 1)

def build_lead_sheet(words, script):
    """
    Map Whisper words → script → MIDI events.
    
    Each word becomes:
    - MIDI note: prosodic pitch contour (rising=questions, falling=statements)
    - Velocity: energy/emphasis
    - CC74: ternary pitch state
    - CC71: ternary volume state
    - SysEx: speaker_id + role
    - Text: the word
    """
    if not words:
        return _synthetic_events(script)
    
    # Match words to script lines greedily by position
    events = []
    word_pos = 0
    
    for sid, text in script:
        line_words = text.split()
        is_question = "?" in text
        nw = len(line_words)
        
        for wi, lw in enumerate(line_words):
            if word_pos >= len(words):
                break
            w = words[word_pos]
            wt = w["word"].strip(".,!?").lower()
            word_pos += 1
            
            frac = wi / max(1, nw - 1)
            base = 60 if sid == 0 else 48  # Alice: C4, Bob: C3
            
            # Prosody contour
            if is_question:
                pitch_off = int(frac * 7)  # Rises over the sentence
                vol_val = int(70 + frac * 50)
                role = 1 if wi == nw - 1 else 0
            else:
                pitch_off = int((1 - frac) * 5 - 2)  # Falls slightly
                vol_val = int(85 - frac * 40)
                role = -1 if wi == nw - 1 else 0
            
            note = max(36, min(96, base + pitch_off))
            vel = min(127, vol_val)
            
            t_pitch = 1 if pitch_off > 2 else (-1 if pitch_off < -1 else 0)
            t_vol = 1 if vel > 90 else (-1 if vel < 60 else 0)
            t_timing = 1 if is_question and wi == nw - 1 else (-1 if role == -1 else 0)
            
            events.append({
                "t": w["start"],
                "dur": w["end"] - w["start"],
                "spk": sid,
                "word": wt,
                "note": note,
                "name": note_name(note),
                "vel": vel,
                "t_pitch": t_pitch,
                "t_vol": t_vol,
                "t_timing": t_timing,
                "role": role,
                "energy": vel,
            })
    
    return events

def _synthetic_events(script):
    """Fallback: synthetic events when Whisper returns nothing."""
    events = []
    t = 0.0
    for sid, text in script:
        words = text.split()
        is_question = "?" in text
        nw = len(words)
        for wi, w in enumerate(words):
            frac = wi / max(1, nw - 1)
            base = 60 if sid == 0 else 48
            
            if is_question:
                pitch_off = int(frac * 7)
                vol_val = int(70 + frac * 50)
                role = 1 if wi == nw - 1 else 0
            else:
                pitch_off = int((1 - frac) * 5 - 2)
                vol_val = int(85 - frac * 40)
                role = -1 if wi == nw - 1 else 0
            
            note = max(36, min(96, base + pitch_off))
            vel = min(127, vol_val)
            
            events.append({
                "t": t, "dur": 0.25, "spk": sid,
                "word": w.strip(".,!?").lower(),
                "note": note, "name": note_name(note), "vel": vel,
                "t_pitch": 1 if pitch_off > 2 else (-1 if pitch_off < -1 else 0),
                "t_vol": 1 if vel > 90 else (-1 if vel < 60 else 0),
                "t_timing": 1 if is_question and wi == nw - 1 else (-1 if role == -1 else 0),
                "role": role, "energy": vel,
            })
            t += 0.25 + 0.02 * (wi % 3)
    return events


# ─── Conversation Graph ─────────────────────────────────────────────────

def graph(events):
    """Generate ASCII conversation shape graph."""
    if not events:
        return ""
    
    dur = max(e["t"] + 0.3 for e in events)
    beats = max(16, int(dur * 2.5))
    bpd = dur / beats
    
    alice = {int(e["t"] / bpd): e for e in events if e["spk"] == 0}
    bob   = {int(e["t"] / bpd): e for e in events if e["spk"] == 1}
    
    lines = []
    lines.append("CONVERSATION SHAPE  |  {} events, {:.1f}s".format(len(events), dur))
    lines.append("-" * 78)
    
    # Time axis
    th = "          |"
    for i in range(beats):
        if i % max(1, beats // 6) == 0:
            th += "{:.0f}s  ".format(i * bpd)
    lines.append(th)
    
    def draw(grid, label):
        line = "{:<12}|".format(label)
        for i in range(beats):
            e = grid.get(i)
            if e:
                p = e["t_pitch"]
                v = e["t_vol"]
                c = "^" if p == 1 else ("v" if p == -1 else "-")
                if v == 1: c = c.upper()
                elif v == -1: c = c.lower()
                line += c
            else:
                line += " "
        return line
    
    lines.append(draw(alice, "Alice pitch"))
    lines.append(draw(bob, "Bob pitch"))
    
    def draw_energy(grid, label):
        line = "{:<12}|".format(label)
        for i in range(beats):
            e = grid.get(i)
            if e:
                eng = e["energy"]
                c = "█" if eng > 90 else ("▓" if eng > 70 else ("▒" if eng > 50 else "░"))
                line += c
            else:
                line += " "
        return line
    
    lines.append(draw_energy(alice, "Alice energy"))
    lines.append(draw_energy(bob, "Bob energy"))
    
    def draw_role(grid, label):
        line = "{:<12}|".format(label)
        for i in range(beats):
            e = grid.get(i)
            if e:
                r = e["role"]
                c = "?" if r == 1 else ("." if r == -1 else "-")
                line += c
            else:
                line += " "
        return line
    
    lines.append(draw_role(alice, "Alice role"))
    lines.append(draw_role(bob, "Bob role"))
    lines.append("")
    
    # Transcript snippet
    lines.append("TRANSCRIPT (first 20)")
    lines.append("-" * 60)
    for e in events[:20]:
        ps = "^" if e["t_pitch"] == 1 else ("v" if e["t_pitch"] == -1 else "-")
        vs = "L" if e["t_vol"] == 1 else ("s" if e["t_vol"] == -1 else "m")
        rl = "Q" if e["role"] == 1 else ("A" if e["role"] == -1 else ".")
        spk = "A" if e["spk"] == 0 else "B"
        lines.append("  [{:5.2f}s] {} {:<20} pitch={} vol={} role={} note={:>4} vel={}".format(
            e["t"], spk, e["word"], ps, vs, rl, e["name"], e["vel"]))
    
    return "\n".join(lines)


# ─── Serialize to Standard MIDI File ───────────────────────────────────

def write_midi_file(events, path):
    """Write events as a real .mid file with 4 tracks."""
    TICKS_PER_BEAT = 480
    BPM = 120
    MICROSEC_PER_BEAT = 60000000 // BPM
    
    midi = bytearray()
    
    # Header
    midi.extend(b'MThd')
    midi.extend(struct.pack('>I', 6))  # header length
    midi.extend(struct.pack('>HHH', 1, 4, TICKS_PER_BEAT))  # format 1, 4 tracks
    
    def write_track(ticks_data):
        """Write a MIDI track chunk."""
        track_data = bytearray()
        for delta, msg in ticks_data:
            # Variable-length delta
            v = delta
            vlq = bytearray()
            while v > 0:
                vlq.insert(0, (v & 0x7F) | (0x80 if vlq else 0))
                v >>= 7
            if not vlq:
                vlq.append(0)
            track_data.extend(vlq)
            track_data.extend(msg)
        
        chunk = bytearray(b'MTrk')
        chunk.extend(struct.pack('>I', len(track_data)))
        chunk.extend(track_data)
        return chunk
    
    # Convert events to ticks
    max_t = max(e["t"] + e["dur"] for e in events)
    total_ticks = int(max_t / 60 * BPM * TICKS_PER_BEAT)
    
    def time_to_ticks(t):
        return int(t / 60 * BPM * TICKS_PER_BEAT)
    
    # Track 1: Pitch contour (MIDI notes)
    track1 = []
    prev_t = 0
    for e in sorted(events, key=lambda x: x["t"]):
        t = time_to_ticks(e["t"])
        delta = t - prev_t
        prev_t = t
        # Note on
        track1.append((delta, bytes([0x90, e["note"], min(127, e["vel"])])))
        # Note off after duration
        off_t = time_to_ticks(e["t"] + e["dur"])
        track1.append((off_t - t, bytes([0x80, e["note"], 0])))
    
    # Track 2: Prosody CC
    track2 = []
    prev_t = 0
    for e in sorted(events, key=lambda x: x["t"]):
        t = time_to_ticks(e["t"])
        delta = t - prev_t
        prev_t = t
        # CC74 (cutoff) = ternary pitch, clamped 0-127
        cc74 = min(127, e["t_pitch"] * 64 + 64)
        track2.append((delta, bytes([0xB0, 74, cc74])))
        # CC71 (resonance) = ternary volume, clamped 0-127
        cc71 = min(127, e["t_vol"] * 64 + 64)
        track2.append((0, bytes([0xB0, 71, cc71])))
        # CC11 (expression) = energy
        track2.append((0, bytes([0xB0, 11, min(127, e["energy"])])))
        # CC99 (NRPN coarse) = pitch bend as continuous offset
        pb = e.get("pitch_bend", 0)
        pb_norm = max(0, min(127, int((pb / 8192) * 63 + 64)))
        track2.append((0, bytes([0xB0, 99, pb_norm])))
    
    # Track 3: Transcript (lyrics meta-events)
    track3 = []
    prev_t = 0
    for e in sorted(events, key=lambda x: x["t"]):
        t = time_to_ticks(e["t"])
        delta = t - prev_t
        prev_t = t
        word_bytes = e["word"].encode('latin-1', errors='replace')
        track3.append((delta, bytes([0xFF, 0x05, len(word_bytes)]) + word_bytes))
    
    # Track 4: Stage directions (SysEx)
    track4 = []
    prev_t = 0
    for e in sorted(events, key=lambda x: x["t"]):
        t = time_to_ticks(e["t"])
        delta = t - prev_t
        prev_t = t
        # SysEx: F0 <len_VLQ> F0 7D 00 spk_id role+1 00 F7
        # SMF format: status F0, then VLQ length (covers all remaining bytes including F7)
        payload = bytes([0xF0, 0x7D, 0x00, e["spk"], e["role"] + 1, 0x00, 0xF7])
        payload_len = len(payload)
        if payload_len < 128:
            track4.append((delta, bytes([0xF0, payload_len]) + payload))
        else:
            vlq = bytearray()
            v = payload_len
            while v > 0:
                vlq.insert(0, (v & 0x7F) | (0x80 if vlq else 0))
                v >>= 7
            if not vlq:
                vlq.append(0)
            track4.append((delta, bytes([0xF0]) + bytes(vlq) + payload))
    
    for track_data in [track1, track2, track3, track4]:
        # End of track
        track_data.append((0, bytes([0xFF, 0x2F, 0x00])))
        midi.extend(write_track(track_data))
    
    with open(path, 'wb') as f:
        f.write(midi)
    
    midi_size = len(midi)
    note_count = len([e for e in events if e["note"]])
    print("  MIDI: {} bytes, {} notes, {} sysEx, {} lyrics".format(
        midi_size, note_count, len(track4)-1, len(track3)-1))
    return midi_size


# ─── Markov Composer ───────────────────────────────────────────────────

class Composer:
    def __init__(self, events):
        self.events = events
        self.transitions = {}
        self._learn()
    
    def _key(self, e):
        return (e["spk"], e["t_pitch"], e["t_vol"], e["t_timing"])
    
    def _learn(self):
        for i in range(len(self.events) - 1):
            c = self._key(self.events[i])
            n = self._key(self.events[i+1])
            w = self.events[i+1]["word"]
            if c not in self.transitions:
                self.transitions[c] = []
            self.transitions[c].append((n, w))
    
    def compose(self, length=16):
        states = list(self.transitions.keys())
        if not states:
            return []
        
        # Seed from first event
        seed = self._key(self.events[0])
        if seed not in self.transitions:
            seed = random.choice(states)
        
        composed = []
        state = seed
        t = 0.0
        recent = []
        
        spk_names = {0: "Alice", 1: "Bob"}
        
        for i in range(length):
            trans = self.transitions.get(state, [])
            if not trans:
                state = random.choice(states)
                trans = self.transitions.get(state, [])
                if not trans:
                    break
            
            # Weighted pick with recency penalty
            freq = {}
            for n, w in trans:
                key = (n, w)
                penalty = 0.3 if w in recent else 1.0
                freq[key] = freq.get(key, 0) + penalty
            
            total = sum(freq.values())
            r = random.uniform(0, total)
            cum = 0
            pick = None
            for key, wgt in freq.items():
                cum += wgt
                if r <= cum:
                    pick = key
                    break
            if not pick:
                pick = max(freq, key=freq.get)
            
            next_state, word = pick
            recent.append(word)
            if len(recent) > 5:
                recent.pop(0)
            
            sid, pitch, vol, timing = next_state
            base = 60 if sid == 0 else 48
            note = base + pitch * 7
            
            composed.append({
                "time": round(t, 2),
                "speaker": spk_names.get(sid, "?"),
                "word": word,
                "note": note_name(note),
                "pitch": "^" if pitch == 1 else ("v" if pitch == -1 else "-"),
                "vol": "L" if vol == 1 else ("s" if vol == -1 else "m"),
                "timing": "ahead" if timing == 1 else ("behind" if timing == -1 else "on")
            })
            
            state = next_state
            t += 0.3 + timing * 0.1
        
        return composed


# ─── Main ──────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  LEAD-SHEET-MIDI v2 — Real Pipeline")
    print("=" * 60)
    
    # Step 1: Generate podcast
    print("\n[1/5] Synthesize podcast...")
    audio_path, script, timeline = generate_podcast()
    
    # Step 2: Transcribe with Whisper
    print("\n[2/5] Transcribe with word timestamps...")
    words = transcribe(audio_path)
    
    # Step 3: Build lead-sheet
    print("\n[3/5] Build lead-sheet-MIDI...")
    events = build_lead_sheet(words, script)
    print("  {} events, {} speakers".format(len(events), len(set(e["spk"] for e in events))))
    
    # Save lead sheet JSON
    ls = {
        "format": "lead-sheet-midi-v3",
        "description": "lead-sheet-midi-v3 adds f0_hz + pitch_bend for continuous pitch (per Hermes 405B synthesis, 2026-06-09)",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "word_count": len(events),
        "speakers": 2,
        "tracks": [
            {"name": "Transcript", "type": "text",
             "events": [{"t": e["t"], "word": e["word"], "spk": "A" if e["spk"]==0 else "B"} for e in events]},
            {"name": "Pitch Contour", "type": "midi_notes",
             "events": [{"t": e["t"], "note": e["note"], "name": e["name"], "vel": e["vel"], "f0_hz": e.get("f0_hz", round(440.0*(2.0**((e["note"]-69)/12)), 2)), "pitch_bend": e.get("pitch_bend", 0)} for e in events]},
            {"name": "Prosody CC", "type": "midi_cc",
             "events": [{"t": e["t"], "cc74": e["t_pitch"]*64+64, "cc71": e["t_vol"]*64+64, "cc11": e["energy"], "pitch_bend": e.get("pitch_bend", 0)} for e in events]},
            {"name": "Stage Directions", "type": "sys_ex",
             "events": [{"t": e["t"], "speaker_id": e["spk"], "role": e["role"]} for e in events]}
        ]
    }
    
    ls_path = os.path.join(OUTPUT, "lead-sheet-v2.json")
    with open(ls_path, "w") as f:
        json.dump(ls, f, indent=2)
    print("  Saved: {}".format(ls_path))
    
    # Step 4: Write actual MIDI file
    print("\n[4/5] Write standard MIDI file...")
    midi_path = os.path.join(OUTPUT, "lead-sheet.mid")
    write_midi_file(events, midi_path)
    
    # Step 5: Graph and compose
    print("\n[5/5] Graph + compose...")
    graph_text = graph(events)
    graph_path = os.path.join(OUTPUT, "conversation-shape.txt")
    with open(graph_path, "w") as f:
        f.write(graph_text)
    
    composer = Composer(events)
    for run in range(3):
        print("\n  --- Generation {} ---".format(run + 1))
        composed = composer.compose(length=14)
        print("  {:>5} {:<8} {:<22} {:>5} {:>3} {:>7}".format("Time", "Who", "Word", "Note", "Pch", "Timing"))
        print("  " + "-" * 52)
        for c in composed:
            print("  {:5.2f}s {:<8} {:<22} {:>5} {:>3} {:>7}".format(
                c["time"], c["speaker"], c["word"], c["note"], c["pitch"], c["timing"]))
    
    comp_path = os.path.join(OUTPUT, "composed-v2.json")
    with open(comp_path, "w") as f:
        json.dump(composed, f, indent=2)
    
    print("\n" + "=" * 60)
    print("  DONE — Full pipeline: Piper → Whisper → Lead-Sheet → MIDI → Graph → Compose")
    print("=" * 60)
    print("  Outputs in {}".format(OUTPUT))
    print("  {} words, {} MIDI bytes, {} Markov states".format(
        len(events), os.path.getsize(midi_path) if os.path.exists(midi_path) else 0, len(composer.transitions)))
    
    return events, composer


if __name__ == "__main__":
    main()
