#!/usr/bin/env python3.10
"""
Tensor MIDI — Lead-Sheet Experiment
====================================
Full round-trip: synthesize speech -> STT with word timestamps
-> prosody extraction -> lead-sheet-MIDI format -> graph conversation shape
-> learn transitions -> compose new conversation
"""

import json, sys, os, time, math, struct, subprocess, random
from pathlib import Path
import numpy as np

OUTPUT_DIR = "tensor-output"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def synthesize_podcast():
    """Generate synthetic podcast with varied duration per speaker."""
    lines = [
        {"speaker": "alice", "text": "Welcome to the future of conversation."},
        {"speaker": "alice", "text": "Can machines really understand how we speak?"},
        {"speaker": "bob",   "text": "They can analyze patterns in our voice."},
        {"speaker": "bob",   "text": "Not just what we say but how we say it."},
        {"speaker": "alice", "text": "But isn't that just statistics with extra steps?"},
        {"speaker": "bob",   "text": "The patterns reveal emotional states."},
        {"speaker": "bob",   "text": "Rising pitch signals a question."},
        {"speaker": "bob",   "text": "Falling pitch signals certainty."},
        {"speaker": "alice", "text": "So you are mapping feelings to numbers?"},
        {"speaker": "bob",   "text": "Think of it as prosodic MIDI."},
        {"speaker": "bob",   "text": "Every word becomes a note."},
        {"speaker": "alice", "text": "And you can play that music back?"},
        {"speaker": "bob",   "text": "Or compose entirely new conversations from it."},
    ]
    
    output_path = os.path.join(OUTPUT_DIR, "podcast_raw.wav")
    all_audio = []
    sr = 22050
    success = False
    
    for i, line in enumerate(lines):
        ls = 0.75 if line["speaker"] == "alice" else 1.15
        wav_path = "/tmp/piper_line_{}.wav".format(i)
        
        cmd = [
            "python3.10", "-c",
            'import sys; sys.path.insert(0, "/home/ubuntu/.openclaw/workspace/piper-voice"); '
            'from piper import PiperVoice; '
            'voice = PiperVoice.load("/home/ubuntu/.openclaw/workspace/piper-voice/en_US-lessac-medium.onnx"); '
            'audio = voice.synthesize("""' + line["text"] + '""", length_scale=' + str(ls) + '); '
            'import soundfile; soundfile.write("' + wav_path + '", audio, ' + str(sr) + ')'
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                import soundfile as sf
                audio, _ = sf.read(wav_path)
                all_audio.append(audio)
                all_audio.append(np.zeros(int(sr * 0.3), dtype=np.float32))
                print("  [{}/{}] {}: {} ({} samples)".format(i+1, len(lines), line["speaker"], line["text"], len(audio)))
                success = True
            else:
                raise RuntimeError(result.stderr[:200])
        except Exception as e:
            # Fallback: generate varied-duration sine tones
            dur = 1.0 + 0.3 * (i % 4)
            t = np.linspace(0, dur, int(sr*dur), False)
            base_freq = 200 if line["speaker"] == "alice" else 130
            freq_var = 30 * (i % 3) - 30
            audio = 0.3 * np.sin(2 * np.pi * (base_freq + freq_var) * t + 0.5 * np.sin(2 * np.pi * 3 * t))
            audio += 0.02 * np.random.randn(len(audio))
            all_audio.append(audio.astype(np.float32))
            all_audio.append(np.zeros(int(sr * 0.2), dtype=np.float32))
            print("  [{}/{}] {}: {} (fallback, {:.1f}s)".format(i+1, len(lines), line["speaker"], line["text"], dur))
            success = True
    
    if success and all_audio:
        full_audio = np.concatenate(all_audio)
        import soundfile as sf
        sf.write(output_path, full_audio, sr)
        print("\n  Audio: {:.1f}s, {}".format(len(full_audio)/sr, output_path))
        return output_path, lines
    
    return None, lines


def transcribe_podcast(audio_path):
    """Run faster-whisper for word-level transcript."""
    if not audio_path or not os.path.exists(audio_path):
        print("  No audio, using synthetic transcript")
        return []
    
    from faster_whisper import WhisperModel
    print("  Loading Whisper tiny model...")
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    print("  Transcribing...")
    segments, info = model.transcribe(audio_path, word_timestamps=True, vad_filter=True)
    
    words = []
    for seg in segments:
        for w in seg.words:
            words.append({
                "word": w.word.strip(),
                "start": w.start,
                "end": w.end,
                "probability": w.probability
            })
    print("  {} words transcribed".format(len(words)))
    return words


def midi_name(note):
    names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    return names[note % 12] + str(note // 12 - 1)


def build_lead_sheet(words, speaker_lines):
    """
    Build lead-sheet-MIDI from transcript + inferred prosody.
    Each word becomes a MIDI-like event with pitch, velocity, ternary prosody.
    """
    events = []
    word_idx = 0
    time_scale = 120.0
    
    for line in speaker_lines:
        line_words = line["text"].split()
        speaker = line["speaker"]
        sid = 0 if speaker == "alice" else 1
        n_words_line = len(line_words)
        
        for wi, lw in enumerate(line_words):
            if word_idx >= len(words):
                break
            
            w = words[word_idx]
            word_text = w["word"].strip(".,!?")
            if not word_text:
                word_idx += 1
                continue
            
            base_pitch = 65 if sid == 0 else 52
            
            # Per-word prosody based on word position in line
            frac = wi / max(1, n_words_line - 1)
            is_question = "?" in line["text"]
            
            # Question prosody: rising over the line
            if is_question:
                # Start flat, end high
                pitch_offset = int(frac * 6)
                velocity = int(60 + frac * 50)
                role = 1 if wi == n_words_line - 1 else 0
                timing = 1 if wi == n_words_line - 1 else 0
            else:
                # Statement: start slightly high, end low
                pitch_offset = int((1 - frac) * 4 - 3)
                velocity = int(80 - frac * 30)
                role = -1 if wi == n_words_line - 1 else 0
                timing = -1 if wi == n_words_line - 1 else 0
            
            # Energy: higher for Alice
            energy = min(127, velocity + (10 if sid == 0 else 0))
            
            note = max(24, min(108, base_pitch + pitch_offset))
            
            t_pitch = 1 if pitch_offset > 1 else (-1 if pitch_offset < -1 else 0)
            t_volume = 1 if energy > 90 else (-1 if energy < 60 else 0)
            t_breath = 1 if is_question and wi == n_words_line - 1 else (-1 if role == -1 else 0)
            
            events.append({
                "time_sec": w.get("start", word_idx * 0.3),
                "duration_sec": w.get("end", word_idx * 0.3 + 0.25) - w.get("start", word_idx * 0.3),
                "speaker": speaker,
                "speaker_id": sid,
                "word": word_text,
                "midi": {"note": note, "note_name": midi_name(note), "velocity": energy},
                "ternary": {"pitch": t_pitch, "volume": t_volume, "timing": timing, "breath": t_breath},
                "dialogic": {"role": role, "agreement": 0, "energy": energy}
            })
            word_idx += 1
    
    return events


def graph_conversation(events, output_path):
    """ASCII graph of conversation shape with pitch, energy, role tracks."""
    if not events:
        return
    
    duration = max(e["time_sec"] + max(0.2, e.get("duration_sec", 0.2)) for e in events)
    beats = max(16, int(duration * 2))
    beat_duration = duration / max(1, beats)
    
    alice_events = [e for e in events if e["speaker"] == "alice"]
    bob_events = [e for e in events if e["speaker"] == "bob"]
    
    def make_grid(ev_list):
        grid = {}
        for idx, e in enumerate(ev_list):
            bi = min(beats-1, int(e["time_sec"] / beat_duration))
            if bi not in grid or idx % 2 == 0:
                grid[bi] = e
        return grid
    
    alice_grid = make_grid(alice_events)
    bob_grid = make_grid(bob_events)
    
    lines = []
    lines.append("\nCONVERSATION SHAPE — Lead-Sheet View")
    lines.append("=" * 78)
    lines.append("Duration: {:.1f}s  |  Words: {}  |  Alice: {}  |  Bob: {}".format(
        duration, len(events), len(alice_events), len(bob_events)))
    lines.append("=" * 78)
    
    # Time axis
    th = "          |"
    for i in range(beats):
        if i % int(beats / 6 + 1) == 0:
            th += "{:.0f}s  ".format(i * beat_duration)
    lines.append(th)
    
    # Pitch contour
    for name, grid in [("Alice pitch", alice_grid), ("Bob pitch", bob_grid)]:
        line = "{:<12}|".format(name)
        for i in range(beats):
            e = grid.get(i)
            if e:
                p = e["ternary"]["pitch"]
                c = "^" if p == 1 else ("v" if p == -1 else "-")
                if e["ternary"]["volume"] == 1:
                    c = c.upper()
                line += c
            else:
                line += " "
        lines.append(line)
    
    lines.append("")
    
    # Energy bars
    for name, grid in [("Alice energy", alice_grid), ("Bob energy", bob_grid)]:
        line = "{:<12}|".format(name)
        for i in range(beats):
            e = grid.get(i)
            if e:
                eng = e["dialogic"]["energy"]
                c = "█" if eng > 90 else ("▓" if eng > 70 else ("▒" if eng > 50 else "░"))
                line += c
            else:
                line += " "
        lines.append(line)
    
    lines.append("")
    
    # Role markers
    for name, grid in [("Alice role", alice_grid), ("Bob role", bob_grid)]:
        line = "{:<12}|".format(name)
        for i in range(beats):
            e = grid.get(i)
            if e:
                r = e["dialogic"]["role"]
                c = "?" if r == 1 else ("." if r == -1 else "-")
                line += c
            else:
                line += " "
        lines.append(line)
    
    lines.append("")
    lines.append("TRANSCRIPT (time-aligned)")
    lines.append("-" * 78)
    for e in events[:30]:
        ps = "^" if e["ternary"]["pitch"] == 1 else ("v" if e["ternary"]["pitch"] == -1 else "-")
        vs = "L" if e["ternary"]["volume"] == 1 else ("s" if e["ternary"]["volume"] == -1 else "m")
        rl = "Q" if e["dialogic"]["role"] == 1 else ("A" if e["dialogic"]["role"] == -1 else ".")
        lines.append("  [{:5.1f}s] {:<6} {:<25} pitch={} vol={} role={} note={} vel={}".format(
            e["time_sec"], e["speaker"], e["word"], ps, vs, rl,
            e["midi"]["note_name"], e["midi"]["velocity"]))
    
    lines.append("")
    lines.append("LEGEND: pitch: ^ rising  - flat  v falling  | vol: L loud m med s soft  | role: Q quest . cont A answer")
    lines.append("")
    
    with open(output_path, "w") as f:
        f.write("\n".join(lines))
    print("  Graph: {}".format(output_path))
    print("\n".join(lines[:20]))


class LeadSheetComposer:
    """Markov composer with diversity from ternary state transitions."""
    
    def __init__(self, events):
        self.events = events
        self.transitions = {}
        self._learn()
    
    def _learn(self):
        for i in range(len(self.events) - 1):
            c = self._key(self.events[i])
            n = self._key(self.events[i + 1])
            w = self.events[i + 1]["word"]
            if c not in self.transitions:
                self.transitions[c] = []
            self.transitions[c].append((n, w))
    
    def _key(self, e):
        return (e["speaker_id"], e["ternary"]["pitch"], e["ternary"]["volume"], e["ternary"]["timing"])
    
    def compose(self, length=16):
        states = list(self.transitions.keys())
        if not states:
            return []
        
        # Seed from a question state
        q = [s for s in states if s[0] == 0 and s[1] >= 1]
        state = random.choice(q) if q else random.choice(states)
        
        composed = []
        t = 0.0
        recent = []
        
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
                penalty = 0.4 if w in recent else 1.0
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
            if len(recent) > 4:
                recent.pop(0)
            
            sid, pitch, vol, timing = next_state
            base = 65 if sid == 0 else 52
            note = base + pitch * 5
            
            composed.append({
                "time": round(t, 2),
                "speaker": "Alice" if sid == 0 else "Bob",
                "word": word,
                "note": midi_name(note),
                "pitch": "^" if pitch == 1 else ("v" if pitch == -1 else "-"),
                "vol": "L" if vol == 1 else ("s" if vol == -1 else "m"),
                "timing": "ahead" if timing == 1 else ("behind" if timing == -1 else "on")
            })
            
            state = next_state
            t += 0.3 + timing * 0.1
        
        return composed


def main():
    print("""
LEAD-SHEET-MIDI — Conversation Decomposition
Audio -> STT + Prosody -> Lead Sheet -> Graph -> Compose
    """)
    
    print("Step 1: Synthesize podcast audio")
    audio_path, speaker_lines = synthesize_podcast()
    
    print("\nStep 2: Transcribe with word timestamps")
    words = transcribe_podcast(audio_path)
    
    if not words:
        print("  Using synthetic transcript")
        words = []
        for line in speaker_lines:
            for w in line["text"].split():
                words.append({"word": w.strip(".,!?"), "start": len(words)*0.3, "end": len(words)*0.3+0.25, "probability": 1.0})
    
    print("\nStep 3: Build lead-sheet-MIDI format")
    events = build_lead_sheet(words, speaker_lines)
    print("  {} events, {} speakers".format(len(events), len(set(e["speaker"] for e in events))))
    
    lead = {
        "format": "lead-sheet-midi-v1",
        "description": "Time-synced transcript + prosody as MIDI parameters",
        "bpm": 120,
        "ticks_per_beat": 480,
        "tracks": [
            {"name": "Transcript", "type": "text", "events": [{"time": e["time_sec"], "word": e["word"], "speaker": e["speaker"]} for e in events]},
            {"name": "Pitch Contour", "type": "midi_notes", "events": [{"time": e["time_sec"], "note": e["midi"]["note"], "velocity": e["midi"]["velocity"], "note_name": e["midi"]["note_name"]} for e in events]},
            {"name": "Prosody CC", "type": "midi_cc", "events": [{"time": e["time_sec"], "cc74": e["ternary"]["pitch"]*64+64, "cc71": e["ternary"]["volume"]*64+64, "cc11": e["dialogic"]["energy"]} for e in events]},
            {"name": "Stage Directions", "type": "sys_ex", "events": [{"time": e["time_sec"], "role": e["dialogic"]["role"], "speaker_id": e["speaker_id"]} for e in events]}
        ]
    }
    
    lead_path = os.path.join(OUTPUT_DIR, "lead-sheet.json")
    with open(lead_path, "w") as f:
        json.dump(lead, f, indent=2)
    print("  Saved: {}".format(lead_path))
    
    print("\nStep 4: Graph conversation shape")
    graph_path = os.path.join(OUTPUT_DIR, "conversation-shape.txt")
    graph_conversation(events, graph_path)
    
    print("\nStep 5: Compose from learned patterns")
    composer = LeadSheetComposer(events)
    
    for run in range(3):
        print("\n  --- Generation {} ---".format(run + 1))
        composed = composer.compose(length=12)
        print("  {:>5} {:<8} {:<20} {:>5} {:>3} {:>6}".format("Time", "Who", "Word", "Note", "Pch", "Timing"))
        print("  " + "-" * 50)
        for c in composed:
            print("  {:5.1f}s {:<8} {:<20} {:>5} {:>3} {:>6}".format(
                c["time"], c["speaker"], c["word"], c["note"], c["vol"], c["timing"]))
    
    comp_path = os.path.join(OUTPUT_DIR, "composed-conversation.json")
    with open(comp_path, "w") as f:
        json.dump(composed, f, indent=2)
    print("\n  Saved: {}".format(comp_path))
    
    print("\n" + "=" * 50)
    print("  EXPERIMENT COMPLETE")
    print("=" * 50)
    print("  Pipeline: Synthesize -> STT -> Lead Sheet -> Graph -> Compose")
    print("  Format:   lead-sheet-midi-v1 ({} events)".format(len(events)))
    print("  Outputs:  {}".format(OUTPUT_DIR))
    print("  Principle: Conversation as lead sheet:")
    print("    melody (prosody pitch) + chords (ternary) + lyrics (transcript)")
    print("  Next: Wire to OpenSMILE -> Ghost Track -> fleet-midi pipeline")
    print()


if __name__ == "__main__":
    main()
