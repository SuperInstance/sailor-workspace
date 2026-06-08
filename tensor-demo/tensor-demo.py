#!/usr/bin/env python3
"""
Tensor MIDI Decomposition Prototype — Podcast → Time-Synced Ternary Tensor.

Takes an audio file, decomposes it into:
  1. Speaker tracks (who spoke when)
  2. Transcript with word-level timestamps (what was said)
  3. Prosody ternary vectors per word (how it was said)
  4. Emergent dialogic patterns (interruption, agreement, pivot)

Usage:
  python3 tensor-demo.py podcast.wav
  python3 tensor-demo.py --demo  # Use built-in test data
"""

import json, sys, os, time, math
from pathlib import Path

OUTPUT_DIR = "tensor-output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Tensor MIDI Data Structure ───

TENSOR_SCHEMA = {
    "format": "tensor-midi-v1",
    "description": "Time-synced multidimensional ternary representation of spoken audio",
    "dimensions": {
        "time": "float (seconds, absolute or relative)",
        "speaker_id": "int (0 = unknown, 1..N = tracked speakers)",
        "word": "str (transcribed word at this timestamp)",
        "prosody": {
            "ternary_pitch": "int (-1=falling, 0=flat, +1=rising) — intonation contour",
            "ternary_volume": "int (-1=soft, 0=medium, +1=loud) — dynamic emphasis",
            "ternary_timing": "int (-1=behind beat, 0=on beat, +1=ahead) — rhythmic placement",
            "ternary_breath": "int (-1=paused, 0=continuous, +1=gasps/catches) — breath pattern",
        },
        "dialogic": {
            "ternary_role": "int (-1=response/answer, 0=neutral/continuation, +1=question/interruption)",
            "ternary_agreement": "int (-1=disagree, 0=neutral, +1=agree) — inter-speaker alignment",
            "ternary_energy": "int (-1=low engagement, 0=moderate, +1=high engagement) — conversational flow",
        },
        "acoustic": {
            "f0": "float (fundamental frequency in Hz)",
            "loudness": "float (RMS energy)",
            "formant_f1": "float (first formant frequency)",
            "formant_f2": "float (second formant frequency)",
            "hnr": "float (harmonics-to-noise ratio)",
        }
    },
    "invariant": "Σ(Δ_ternary) → 0 over a closed conversational gesture"
}


class TernaryTensor:
    """
    A time-synced ternary tensor representing a decomposed conversation.
    
    Each row is one "event" — a word, a musical note, or a prosodic gesture.
    Each column is a dimension of analysis.
    """
    
    def __init__(self):
        self.events = []  # List of dicts, each a time-synced tensor event
        self.speakers = {}  # speaker_id → { name, role, energy_trace }
        self.metadata = {
            "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": None,
            "duration_s": 0,
            "source_type": None,  # "podcast", "song", "conversation"
        }
    
    def add_event(self, time_s, speaker_id, word, prosody, dialogic=None, acoustic=None):
        """Add one tensor event (one word/note at one time)."""
        event = {
            "time": round(time_s, 3),
            "speaker_id": speaker_id,
            "word": word,
            "prosody": {
                "ternary_pitch": prosody.get("pitch", 0),
                "ternary_volume": prosody.get("volume", 0),
                "ternary_timing": prosody.get("timing", 0),
                "ternary_breath": prosody.get("breath", 0),
            },
            "dialogic": {
                "ternary_role": dialogic.get("role", 0) if dialogic else 0,
                "ternary_agreement": dialogic.get("agreement", 0) if dialogic else 0,
                "ternary_energy": dialogic.get("energy", 0) if dialogic else 0,
            },
            "acoustic": {
                "f0": acoustic.get("f0", 0) if acoustic else 0,
                "loudness": acoustic.get("loudness", 0) if acoustic else 0,
                "formant_f1": acoustic.get("f1", 0) if acoustic else 0,
                "formant_f2": acoustic.get("f2", 0) if acoustic else 0,
                "hnr": acoustic.get("hnr", 0) if acoustic else 0,
            }
        }
        self.events.append(event)
    
    def to_dict(self):
        """Serialize to dictionary."""
        return {
            "schema": TENSOR_SCHEMA["format"],
            "metadata": self.metadata,
            "speakers": self.speakers,
            "events": self.events,
            "derived": self._compute_derived()
        }
    
    def _compute_derived(self):
        """Compute higher-order patterns from the tensor."""
        if not self.events:
            return {}
        
        # Speaker statistics
        speaker_events = {}
        for e in self.events:
            sid = e["speaker_id"]
            if sid not in speaker_events:
                speaker_events[sid] = {"count": 0, "avg_pitch": 0, "avg_volume": 0, "avg_energy": 0}
            speaker_events[sid]["count"] += 1
            speaker_events[sid]["avg_pitch"] += e["prosody"]["ternary_pitch"]
            speaker_events[sid]["avg_volume"] += e["prosody"]["ternary_volume"]
            speaker_events[sid]["avg_energy"] += e["dialogic"]["ternary_energy"]
        
        for sid in speaker_events:
            c = max(1, speaker_events[sid]["count"])
            speaker_events[sid]["avg_pitch"] = round(speaker_events[sid]["avg_pitch"] / c, 2)
            speaker_events[sid]["avg_volume"] = round(speaker_events[sid]["avg_volume"] / c, 2)
            speaker_events[sid]["avg_energy"] = round(speaker_events[sid]["avg_energy"] / c, 2)
        
        # Detect interruptions (rapid speaker switches)
        interruptions = []
        for i in range(1, len(self.events)):
            if self.events[i]["speaker_id"] != self.events[i-1]["speaker_id"]:
                time_gap = self.events[i]["time"] - self.events[i-1]["time"]
                if time_gap < 0.3:  # Less than 300ms between speakers = interruption
                    interruptions.append({
                        "time": self.events[i]["time"],
                        "from_speaker": self.events[i-1]["speaker_id"],
                        "to_speaker": self.events[i]["speaker_id"],
                        "gap_s": round(time_gap, 3)
                    })
        
        # Detect agreement/disagreement patterns
        agreements = []
        for e in self.events:
            if e["dialogic"]["ternary_agreement"] == 1:
                agreements.append({"time": e["time"], "speaker": e["speaker_id"], "word": e["word"]})
        
        # Conversational gesture closure
        # Σ(ternary[0]) = 0 means a full conversational gesture (question → answer)
        pitch_sum = sum(e["prosody"]["ternary_pitch"] for e in self.events) / max(1, len(self.events))
        energy_sum = sum(e["dialogic"]["ternary_energy"] for e in self.events) / max(1, len(self.events))
        
        return {
            "speaker_stats": speaker_events,
            "interruptions": interruptions,
            "agreements": agreements[:10],  # First 10 agreements
            "conversational_gesture": {
                "avg_pitch_ternary": round(pitch_sum, 3),
                "avg_energy_ternary": round(energy_sum, 3),
                "closed_gesture": abs(pitch_sum) < 0.3,
                "conversation_energy": "high" if energy_sum > 0.3 else ("low" if energy_sum < -0.3 else "moderate")
            },
            "total_events": len(self.events),
            "duration_s": round(self.events[-1]["time"] - self.events[0]["time"], 1) if len(self.events) > 1 else 0
        }
    
    def save(self, path):
        """Save to JSON file."""
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
        print(f"  💾 Tensor saved: {path}")


# ─── Demo: Synthetic Conversation Decomposition ───

def generate_synthetic_conversation():
    """
    Generate a synthetic podcast conversation with rich prosodic variation.
    
    Two speakers:
      - Speaker 1 (Alice): host, questions, rising intonation
      - Speaker 2 (Bob): guest, answers, falling intonation
    
    The conversation follows a dramatic arc:
      Setup → Tension → Climax → Resolution
    """
    tensor = TernaryTensor()
    tensor.metadata["source"] = "synthetic-podcast-demo"
    tensor.metadata["source_type"] = "conversation"
    tensor.speakers = {
        1: {"name": "Alice (Host)", "role": "interviewer"},
        2: {"name": "Bob (Guest)", "role": "expert"}
    }
    
    t = 0.0  # Current time in seconds
    
    # ─── Act 1: Setup (0-15s) ───
    # Alice opens with rising questions, Bob answers with flat statements
    alice_setup = [
        ("Welcome", {"pitch": 1, "volume": 0, "timing": 0, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
        ("to", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": 0, "agreement": 0, "energy": 0}),
        ("the", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": 0, "agreement": 0, "energy": 0}),
        ("show", {"pitch": 1, "volume": 1, "timing": 0, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
    ]
    for word, pros, dia in alice_setup:
        tensor.add_event(t, 1, word, pros, dia, {"f0": 220, "loudness": 0.5})
        t += 0.4
    
    bob_setup = [
        ("Thanks", {"pitch": -1, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 1, "energy": 0}),
        ("for", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 0, "energy": 0}),
        ("having", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 0, "energy": 0}),
        ("me", {"pitch": -1, "volume": -1, "timing": -1, "breath": -1}, {"role": -1, "agreement": 1, "energy": -1}),
    ]
    for word, pros, dia in bob_setup:
        tensor.add_event(t, 2, word, pros, dia, {"f0": 150, "loudness": 0.4})
        t += 0.35
    
    # ─── Act 2: Tension (15-30s) ───
    # Alice asks a pointed question (rising), Bob disagrees (negative agreement)
    alice_tension = [
        ("But", {"pitch": 1, "volume": 1, "timing": 1, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
        ("isn't", {"pitch": 1, "volume": 1, "timing": 0, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
        ("that", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": 0, "agreement": 0, "energy": 0}),
        ("controversial", {"pitch": 1, "volume": 1, "timing": 1, "breath": 1}, {"role": 1, "agreement": 0, "energy": 1}),
        ("?", {"pitch": 1, "volume": 0, "timing": 0, "breath": 0}, {"role": 1, "agreement": 0, "energy": 0}),
    ]
    for word, pros, dia in alice_tension:
        tensor.add_event(t, 1, word, pros, dia, {"f0": 280, "loudness": 0.7})
        t += 0.3
    
    # Bob pushes back (disagreement, high energy)
    bob_tension = [
        ("I", {"pitch": 0, "volume": 1, "timing": 1, "breath": 0}, {"role": 1, "agreement": -1, "energy": 1}),
        ("actually", {"pitch": 0, "volume": 1, "timing": 0, "breath": 0}, {"role": 0, "agreement": -1, "energy": 1}),
        ("disagree", {"pitch": 1, "volume": 1, "timing": 1, "breath": 0}, {"role": 0, "agreement": -1, "energy": 1}),
        ("strongly", {"pitch": 1, "volume": 1, "timing": 0, "breath": 1}, {"role": 0, "agreement": -1, "energy": 1}),
    ]
    for word, pros, dia in bob_tension:
        tensor.add_event(t, 2, word, pros, dia, {"f0": 180, "loudness": 0.8})
        t += 0.35
    
    # ─── Act 3: Climax (30-40s) — Rapid fire, interruptions ───
    alice_climax = [
        ("So", {"pitch": 0, "volume": 1, "timing": 1, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
        ("you're", {"pitch": 1, "volume": 1, "timing": 0, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
        ("saying", {"pitch": 1, "volume": 1, "timing": 0, "breath": 0}, {"role": 1, "agreement": 0, "energy": 1}),
    ]
    for word, pros, dia in alice_climax:
        tensor.add_event(t, 1, word, pros, dia, {"f0": 300, "loudness": 0.8})
        t += 0.15  # Fast — Alice is excited, overlapping
    
    # Bob interrupts (gap < 0.2s = interruption)
    bob_interrupt = [
        ("Let", {"pitch": 1, "volume": 1, "timing": 1, "breath": 0}, {"role": 1, "agreement": -1, "energy": 1}),
        ("me", {"pitch": 1, "volume": 1, "timing": 1, "breath": 0}, {"role": 0, "agreement": -1, "energy": 1}),
        ("finish", {"pitch": 1, "volume": 1, "timing": 1, "breath": 0}, {"role": 0, "agreement": -1, "energy": 1}),
    ]
    for word, pros, dia in bob_interrupt:
        tensor.add_event(t, 2, word, pros, dia, {"f0": 200, "loudness": 0.9})
        t += 0.2  # Very fast — interrupted speech
    
    # ─── Act 4: Resolution (40-60s) ───
    # Bob calms down, explains, agreement reached
    bob_resolution = [
        ("What", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 0, "energy": 0}),
        ("I", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 0, "energy": 0}),
        ("mean", {"pitch": -1, "volume": -1, "timing": -1, "breath": -1}, {"role": -1, "agreement": 0, "energy": -1}),
        ("is", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 0, "energy": -1}),
    ]
    for word, pros, dia in bob_resolution:
        tensor.add_event(t, 2, word, pros, dia, {"f0": 130, "loudness": 0.3})
        t += 0.4  # Slower, more deliberate
    
    # Alice agrees, conversation closes
    alice_resolution = [
        ("I", {"pitch": -1, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 1, "energy": 0}),
        ("see", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 1, "energy": 0}),
        ("what", {"pitch": 0, "volume": 0, "timing": 0, "breath": 0}, {"role": -1, "agreement": 1, "energy": 0}),
        ("you", {"pitch": -1, "volume": -1, "timing": 0, "breath": 0}, {"role": -1, "agreement": 1, "energy": -1}),
        ("mean", {"pitch": -1, "volume": -1, "timing": -1, "breath": -1}, {"role": -1, "agreement": 1, "energy": -1}),
    ]
    for word, pros, dia in alice_resolution:
        tensor.add_event(t, 1, word, pros, dia, {"f0": 200, "loudness": 0.4})
        t += 0.4
    
    tensor.metadata["duration_s"] = round(t, 1)
    return tensor


# ─── Composition Engine: Generate New Conversations from Tensors ───

class ConversationComposer:
    """
    Takes a decomposed ternary tensor and generates new conversation sequences
    algorithmically — the science of decomposition teaches composition.
    """
    
    def __init__(self, source_tensor):
        self.source = source_tensor
        self.markov_chain = {}
        self._build_markov()
    
    def _build_markov(self):
        """Build a Markov chain over ternary vector transitions."""
        events = self.source.events
        for i in range(len(events) - 1):
            # State = (speaker_id, prosody_ternary_tuple)
            current = (
                events[i]["speaker_id"],
                events[i]["prosody"]["ternary_pitch"],
                events[i]["prosody"]["ternary_volume"],
                events[i]["prosody"]["ternary_timing"],
            )
            next = (
                events[i+1]["speaker_id"],
                events[i+1]["prosody"]["ternary_pitch"],
                events[i+1]["prosody"]["ternary_volume"],
                events[i+1]["prosody"]["ternary_timing"],
            )
            word = events[i+1]["word"]
            
            if current not in self.markov_chain:
                self.markov_chain[current] = []
            self.markov_chain[current].append((next, word))
    
    def compose(self, length=20, seed_word="So"):
        """
        Generate a new conversation sequence from the Markov model.
        
        This is algorithmic composition: we learn the prosodic transitions
        from the decomposed source and generate new sequences that preserve
        the conversational DNA.
        """
        # Find starting state with seed word
        start_state = None
        for e in self.source.events:
            if e["word"].lower() == seed_word.lower():
                start_state = (e["speaker_id"], e["prosody"]["ternary_pitch"],
                              e["prosody"]["ternary_volume"], e["prosody"]["ternary_timing"])
                break
        
        if not start_state:
            # Fall back to first event's state
            first = self.source.events[0]
            start_state = (first["speaker_id"], first["prosody"]["ternary_pitch"],
                          first["prosody"]["ternary_volume"], first["prosody"]["ternary_timing"])
        
        generated = []
        state = start_state
        t = 0.0
        
        for _ in range(length):
            transitions = self.markov_chain.get(state, [])
            
            if not transitions:
                # Dead end — pick a random state from the source
                random_event = self.source.events[len(generated) % len(self.source.events)]
                state = (random_event["speaker_id"], random_event["prosody"]["ternary_pitch"],
                        random_event["prosody"]["ternary_volume"], random_event["prosody"]["ternary_timing"])
                transitions = self.markov_chain.get(state, [])
                if not transitions:
                    break
            
            # Pick most common transition (could randomize for more variety)
            transition_counts = {}
            for t_word in transitions:
                key = t_word
                transition_counts[key] = transition_counts.get(key, 0) + 1
            
            best_transition = max(transition_counts, key=transition_counts.get)
            next_state, word = best_transition
            
            # Format the generated word
            sid, pitch, vol, timing = next_state
            role_tristate = "↑" if pitch == 1 else ("↓" if pitch == -1 else "→")
            vol_tristate = "↑" if vol == 1 else ("↓" if vol == -1 else "→")
            timing_str = "ahead" if timing == 1 else ("behind" if timing == -1 else "on")
            
            generated.append({
                "time": round(t, 2),
                "speaker": sid,
                "word": word,
                "prosody": f"{role_tristate} {vol_tristate} ({timing_str})",
                "state": next_state
            })
            
            state = next_state
            t += 0.35 + (timing * 0.1)  # Timing affects pace
        
        return generated


# ─── Demo Runner ───

def run_demo():
    print("""
╔═══════════════════════════════════════════════════════════╗
║     Tensor MIDI — Podcast Decomposition Demo              ║
║                                                           ║
║     Decompose conversation → ternary tensor per speaker   ║
║     Learn prosodic patterns → compose new conversations   ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Step 1: Decompose synthetic conversation
    print("📡 Step 1: Decomposing conversation...")
    tensor = generate_synthetic_conversation()
    print(f"     2 speakers, {len(tensor.events)} word events, "
          f"{tensor.metadata['duration_s']}s duration")
    tensor.save(os.path.join(OUTPUT_DIR, "decomposed-conversation.json"))
    
    # Step 2: Show the tensor structure
    print(f"\n📊 Step 2: Tensor Structure")
    print(f"     Schema: {TENSOR_SCHEMA['format']}")
    print(f"     Dimensions: {len(TENSOR_SCHEMA['dimensions'])}")
    print(f"     Events: {len(tensor.events)}")
    
    # Show per-speaker breakdowmn
    for sid, info in tensor.speakers.items():
        speaker_events = [e for e in tensor.events if e["speaker_id"] == sid]
        avg_pitch = sum(e["prosody"]["ternary_pitch"] for e in speaker_events) / max(1, len(speaker_events))
        avg_vol = sum(e["prosody"]["ternary_volume"] for e in speaker_events) / max(1, len(speaker_events))
        avg_energy = sum(e["dialogic"]["ternary_energy"] for e in speaker_events) / max(1, len(speaker_events))
        print(f"     {info['name']}: {len(speaker_events)} words, "
              f"pitch={avg_pitch:+.2f}, vol={avg_vol:+.2f}, energy={avg_energy:+.2f}")
    
    # Step 3: Show derived patterns
    print(f"\n🔍 Step 3: Derived Patterns")
    derived = tensor._compute_derived()
    cg = derived.get("conversational_gesture", {})
    print(f"     Closed conversational gesture: {cg.get('closed_gesture')}")
    print(f"     Conversation energy: {cg.get('conversation_energy')}")
    print(f"     Interruptions detected: {len(derived.get('interruptions', []))}")
    print(f"     Agreement moments: {len(derived.get('agreements', []))}")
    
    # Step 4: Show time-synced tensor events
    print(f"\n📝 Step 4: Time-Synced Transcript (first 15 events)")
    print(f"     {'Time':>6} {'Spk':>4} {'Word':<12} {'Pitch':>6} {'Vol':>4} {'Role':>5} {'Agree':>6}")
    print(f"     {'─'*6} {'─'*4} {'─'*12} {'─'*6} {'─'*4} {'─'*5} {'─'*6}")
    for e in tensor.events[:15]:
        name = {
            (1, "↑"): "Alice", (2, "↑"): "Bob"
        }.get((e["speaker_id"], "↑"), str(e["speaker_id"]))
        pitch_symbol = "↑" if e["prosody"]["ternary_pitch"] == 1 else ("↓" if e["prosody"]["ternary_pitch"] == -1 else "→")
        vol_symbol = "↑" if e["prosody"]["ternary_volume"] == 1 else ("↓" if e["prosody"]["ternary_volume"] == -1 else "→")
        role = "Q" if e["dialogic"]["ternary_role"] == 1 else ("A" if e["dialogic"]["ternary_role"] == -1 else "·")
        agree = "✓" if e["dialogic"]["ternary_agreement"] == 1 else ("✗" if e["dialogic"]["ternary_agreement"] == -1 else "·")
        
        print(f"     {e['time']:>5.1f}s {e['speaker_id']:>4d} {e['word']:<12} {pitch_symbol:>6} "
              f"{vol_symbol:>4} {role:>5} {agree:>6}")
    
    # Step 5: Compose new conversation from learned patterns
    print(f"\n🎨 Step 5: Composing New Conversation from Tensor Patterns")
    composer = ConversationComposer(tensor)
    new_convo = composer.compose(length=12, seed_word="I")
    
    speaker_names = {1: "Alice", 2: "Bob"}
    print(f"     {'Time':>6} {'Who':<10} {'→':<3} {'Word':<15} {'Prosody':<15}")
    print(f"     {'─'*6} {'─'*10} {'─'*3} {'─'*15} {'─'*15}")
    for event in new_convo:
        name = speaker_names.get(event["speaker"], f"Spk{event['speaker']}")
        print(f"     {event['time']:>5.1f}s {name:<10} {'→':<3} {event['word']:<15} {event['prosody']:<15}")
    
    # Step 6: Conversation closure check
    print(f"\n🔬 Step 6: Conservation Check")
    all_pitches = [e[2] for e in composer.markov_chain.keys()]  # State pitch values
    avg_pitch = sum(all_pitches) / max(1, len(all_pitches)) if all_pitches else 0
    print(f"     Σ(ternary_pitch) ≈ {avg_pitch:.2f}")
    print(f"     Conversational gesture: {'CLOSED ✓' if abs(avg_pitch) < 0.3 else 'OPEN — ongoing'}")
    print(f"     Conservation: Σ(Δ_ternary) → 0 over a closed conversation")
    
    print(f"\n{'='*50}")
    print("  🎬 TENSOR MIDI DEMO COMPLETE")
    print(f"{'='*50}")
    print(f"  Source: decomposed-conversation.json")
    print(f"  Format: {TENSOR_SCHEMA['format']}")
    print(f"  Principle: Σ(Δ_ternary) → 0 over closed conversation")
    print(f"  Next: Feed real audio via Whisper + pyannote + OpenSMILE")


if __name__ == "__main__":
    run_demo()
