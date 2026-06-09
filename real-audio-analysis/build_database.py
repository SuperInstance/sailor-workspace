#!/usr/bin/env python3
"""One-shot: transcribe guest ID + build full speaker database."""
import json, os, gc, warnings
warnings.filterwarnings('ignore')

BASE = '/home/ubuntu/.openclaw/workspace/real-audio-analysis'

# ─── Step 1: Identify guests (first 75s, skipping 30s promos) ───
from faster_whisper import WhisperModel
import soundfile, numpy as np

model = WhisperModel('tiny.en', device='cpu', compute_type='int8')

# Also load the Luke Bateman transcript from earlier
luke_words = json.load(open(os.path.join(BASE, 'transcript-10min.json')))

episodes = ['ep10-community', 'ep3-cultural', 'ep6-journalist', 'ep8-author']
guest_info = {}
transcripts = {}

for ep in episodes:
    wav = os.path.join(BASE, 'profiles', f'{ep}-10min.wav')
    data, sr = soundfile.read(wav)
    
    # Get 45s segment starting at 30s (covers promos + interview start)
    chunk = data[sr*30:sr*75] if len(data) > sr*75 else data[:sr*30]
    if chunk.ndim > 1: chunk = chunk.mean(axis=1)
    
    segs, _ = model.transcribe(chunk.astype(np.float32), beam_size=3)
    seg_texts = [seg.text.strip() for seg in segs if seg.text.strip()]
    
    # Also transcribe full clip for words
    segs_full, _ = model.transcribe(data.astype(np.float32), word_timestamps=True, beam_size=3)
    words = []
    for seg in segs_full:
        for w in seg.words or []:
            words.append({"word": w.word.strip(), "start": w.start, "end": w.end})
    
    transcripts[ep] = words
    guest_info[ep] = {"sample": seg_texts[:3], "word_count": len(words)}
    log = f"  {ep}: " + " | ".join(t[:60] for t in seg_texts[:2])
    print(log, flush=True)

# ─── Step 2: Load acoustic profiles ───
acoustics = {}
for ep in episodes:
    with open(os.path.join(BASE, 'profiles', f'{ep}-acoustic.json')) as f:
        acoustics[ep] = json.load(f)

# ─── Step 3: Build unified speaker database ───
# Map known guests from content
guest_map = {
    "Luke Bateman": {"ep": "luke-bateman", "type": "NRL player/author", "gender": "M"},
    "ep10-community": {"name": "Jo Jarvis", "type": "prison meditation teacher", "gender": "F"},
    "ep3-cultural": {"name": "Spanish-Australian immigrant (love story)", "type": "immigrant story", "gender": "F"},
    "ep6-journalist": {"name": "Goodwill rebrand controversy guest", "type": "culture/marketing", "gender": "F"},
    "ep8-author": {"name": "Teen father / skate park", "type": "community/youth", "gender": "M"}
}

# Build Luke's profile from earlier OpenSMILE analysis
luke_acoustic = json.load(open(os.path.join(BASE, 'opensmile-analysis-10min.json')))

database = {
    "source": "ABC Conversations Podcast",
    "host": "Sarah Kanowski (female)",
    "host_f0_estimated": "170-190Hz (typical Australian female presenter)",
    "guests": {}
}

# Luke
lc = luke_acoustic.get('Overall', {})
database["guests"]["luke_bateman"] = {
    "label": "Luke Bateman",
    "type": "NRL player / author",
    "gender": "M",
    "acoustic": {
        "f0_mean_hz": lc.get("f0_mean_hz", 110.8),
        "f0_std_hz": lc.get("f0_std_hz", 84.7),
        "voiced_pct": lc.get("voiced_pct", 43),
        "hnr_mean": luke_acoustic.get("HNRdBACF_sma3nz", {}).get("mean", 1.6),
        "jitter_mean": luke_acoustic.get("jitterLocal_sma3nz", {}).get("mean", 0.00755),
    },
    "conversation": {
        "wpm": len(luke_words) / 10,  # per minute for 10-min segment
        "word_count": len(luke_words)
    }
}

# 4 new episodes
for ep in episodes:
    ep_info = guest_map[ep]
    a = acoustics[ep]
    w = transcripts[ep]
    
    dur_s = a.get("duration_s", 600)
    wpm = len(w) / (dur_s / 60) if dur_s > 0 else 0
    
    entry = {
        "label": ep_info["name"],
        "type": ep_info["type"],
        "gender": ep_info["gender"],
        "acoustic": {
            "f0_mean_hz": a["f0_mean_hz"],
            "f0_stability": a["f0_std_hz"],
            "f0_range": f"{a['f0_min_hz']}-{a['f0_max_hz']}",
            "voiced_pct": a["voiced_pct"],
            "loudness_mean": a["loudness_mean"],
            "hnr_mean": a["hnr_mean"],
            "jitter_mean": a["jitter_mean"],
            "alpha_ratio": a["alpha_ratio"],
            "spectral_flux": a["spectral_flux"],
            "formant_region": f"F1-estimated",
        },
        "conversation": {
            "wpm": round(wpm, 1),
            "word_count": len(w),
            "duration_min": round(dur_s / 60, 1)
        }
    }
    database["guests"][ep] = entry

# ─── Step 4: Write database + comparative report ───
db_path = os.path.join(BASE, "speaker-database.json")
with open(db_path, "w") as f:
    json.dump(database, f, indent=2)

# Comparative summary
guests = database["guests"]
print(f"\n{'='*60}")
print(f"SPEAKER DATABASE — {len(guests)} guests profiled")
print(f"{'='*60}")
print(f"{'Guest':30s} {'Gender':8s} {'F0(Hz)':10s} {'WPM':8s} {'HNR':6s} {'Voiced%':8s} {'Jitter':8s}")
print("-"*80)
for key, g in sorted(guests.items()):
    a = g["acoustic"]
    c = g["conversation"]
    print(f"{g['label']:30s} {g['gender']:8s} {a['f0_mean_hz']:>8.1f} {c['wpm']:>7.1f} {a['hnr_mean']:>5.1f} {a['voiced_pct']:>7d}% {a['jitter_mean']:.5f}")

# Personality dimension mapping
print(f"\n{'='*60}")
print("EMERGENT PERSONALITY DIMENSIONS")
print(f"{'='*60}")

f0s = [g["acoustic"]["f0_mean_hz"] for g in guests.values()]
hnrs = [g["acoustic"]["hnr_mean"] for g in guests.values()]
wpms = [g["conversation"]["wpm"] for g in guests.values()]
voiced = [g["acoustic"]["voiced_pct"] for g in guests.values()]

print(f"F0 range: {min(f0s):.0f}-{max(f0s):.0f}Hz (Δ={max(f0s)-min(f0s):.0f}Hz)")
print(f"HNR range: {min(hnrs):.1f}-{max(hnrs):.1f}dB")
print(f"Rate range: {min(wpms):.0f}-{max(wpms):.0f} wpm")
print(f"Voiced range: {min(voiced)}-{max(voiced)}%")
print(f"\nHypothesized personality mappings (from voice only):")
print(f"  Higher F0 + high HNR + high voiced% → warm, open, extroverted")
print(f"  Lower F0 + low HNR + low voiced% → reserved, introspective, hesitant")
print(f"  Fast WPM + high spectral flux → anxious, rushed or passionate")
print(f"  Slow WPM + high jitter → reflective, uncertain, vulnerable")
print(f"  High loudness range + stable F0 → confident storyteller")
print(f"\nSaved: {db_path}")
PYEOF