#!/usr/bin/env python3
"""
Batch episode analyzer: extract first 10 mins, transcribe, extract features,
build speaker profiles, write comparative database.
"""
import os, sys, json, math, time, warnings, soundfile, numpy as np
warnings.filterwarnings('ignore')

SRC_DIR = os.path.join(os.path.dirname(__file__), 'episodes')
OUT_DIR = os.path.join(os.path.dirname(__file__), 'profiles')
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Audio extractor (first 10 min @ 16kHz mono) ───
def extract_clip(inpath, outpath, duration=600, target_sr=16000):
    data, sr = soundfile.read(inpath)
    cut = int(min(duration * sr, len(data)))
    chunk = data[:cut]
    if chunk.ndim > 1:
        chunk = chunk.mean(axis=1)
    # Linear resample to target_sr
    ratio = sr / target_sr
    old_len = len(chunk)
    new_len = int(old_len / ratio)
    indices = np.linspace(0, old_len - 1, new_len)
    idx_floor = np.floor(indices).astype(np.int64)
    idx_ceil = np.minimum(idx_floor + 1, old_len - 1)
    frac = indices - idx_floor
    resampled = chunk[idx_floor] * (1 - frac) + chunk[idx_ceil] * frac
    soundfile.write(outpath, resampled.astype(np.float32), target_sr)
    return new_len / target_sr

# ─── Whisper transcription ───
def transcribe(audio_path):
    from faster_whisper import WhisperModel
    model = WhisperModel('tiny.en', device='cpu', compute_type='int8')
    segments, info = model.transcribe(audio_path, word_timestamps=True, beam_size=5)
    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({
                "word": w.word.strip(),
                "start": w.start,
                "end": w.end,
                "probability": w.probability
            })
    return words, info

# ─── OpenSMILE feature extraction ───
def extract_opensmile(audio_path):
    import opensmile
    smile = opensmile.Smile(
        feature_set=opensmile.FeatureSet.eGeMAPSv02,
        feature_level=opensmile.FeatureLevel.LowLevelDescriptors,
    )
    data, sr = soundfile.read(audio_path)
    # Process in 30s chunks
    chunk_s, chunk_samples = 30, 30 * sr
    num_chunks = int(np.ceil(len(data) / chunk_samples))
    feats = []
    for ci in range(num_chunks):
        chunk = data[ci*chunk_samples:(ci+1)*chunk_samples]
        if len(chunk) > 0:
            feats.append(smile.process_signal(chunk.astype(np.float64), sr))
    
    import pandas as pd
    df = pd.concat(feats).reset_index(drop=True)
    
    f0_col = 'F0semitoneFrom27.5Hz_sma3nz'
    loud_col = 'Loudness_sma3'
    hnr_col = 'HNRdBACF_sma3nz'
    jitter_col = 'jitterLocal_sma3nz'
    shimmer_col = 'shimmerLocaldB_sma3nz'
    alpha_col = 'alphaRatio_sma3'
    flux_col = 'spectralFlux_sma3'
    f1_col = 'F1frequency_sma3nz'
    f2_col = 'F2frequency_sma3nz'
    mfcc_cols = [f'mfcc{i}_sma3' for i in range(1,5)]
    avail = [c for c in [f0_col, loud_col, hnr_col, jitter_col, shimmer_col, alpha_col, flux_col, f1_col, f2_col] + mfcc_cols if c in df.columns]
    
    stats = {}
    for col in avail:
        vals = df[col].dropna().values.astype(float)
        if len(vals) > 0:
            stats[col] = {
                "mean": float(np.mean(vals)), "std": float(np.std(vals)),
                "p5": float(np.percentile(vals, 5)), "p95": float(np.percentile(vals, 95))
            }
    
    f0_vals = df[f0_col].dropna().values.astype(float)
    f0_voice = f0_vals[f0_vals > 0]
    f0_hz = [27.5 * (2 ** (s/12)) for s in f0_voice]
    
    stats["_overall"] = {
        "frames": int(len(df)),
        "duration_s": round(len(data)/sr, 1),
        "voiced_pct": round(100 * len(f0_voice) / max(1, len(f0_vals))),
        "f0_mean_hz": round(float(np.mean(f0_hz)), 1) if f0_hz else 0,
        "f0_std_hz": round(float(np.std(f0_hz)), 1) if len(f0_hz) > 1 else 0,
        "f0_min_hz": round(float(min(f0_hz)), 1) if f0_hz else 0,
        "f0_max_hz": round(float(max(f0_hz)), 1) if f0_hz else 0,
    }
    return stats

# ─── Conversation analysis ───
def analyze_conversation(words):
    # Simple word-based conversational metrics
    total = len(words)
    if total == 0: return {}
    
    durations = [w['end'] - w['start'] for w in words]
    gaps = []  # gaps between consecutive words
    for i in range(1, len(words)):
        gap = words[i]['start'] - words[i-1]['end']
        if gap >= 0:
            gaps.append(gap)
    
    # Speaking rate (words per minute)
    if words:
        total_time = words[-1]['end'] - words[0]['start']
        wpm = total / (total_time / 60) if total_time > 0 else 0
    else:
        wpm = 0
    
    # Word duration stats
    mean_dur = float(np.mean(durations)) if durations else 0
    std_dur = float(np.std(durations)) if durations else 0
    mean_gap = float(np.mean(gaps)) if gaps else 0
    std_gap = float(np.std(gaps)) if len(gaps) > 1 else 0
    
    # Longest gaps (potential turn boundaries)
    gaps_sorted = sorted(gaps, reverse=True) if gaps else []
    top_gaps = gaps_sorted[:3] if gaps_sorted else []
    
    return {
        "total_words": total,
        "speaking_rate_wpm": round(wpm, 1),
        "word_duration_mean": round(mean_dur, 3),
        "word_duration_std": round(std_dur, 3),
        "gap_mean": round(mean_gap, 3),
        "gap_std": round(std_gap, 3),
        "top_gaps": [round(g, 3) for g in top_gaps]
    }

# ─── Build speaker acoustic signature ───
def build_acoustic_signature(stats):
    """Extract the most identifying acoustic features for a speaker."""
    if not stats: return {}
    o = stats.get("_overall", {})
    return {
        "f0_mean": o.get("f0_mean_hz", 0),
        "f0_range": f"{o.get('f0_min_hz', 0)}-{o.get('f0_max_hz', 0)}",
        "f0_stability": o.get("f0_std_hz", 0),
        "voiced_pct": o.get("voiced_pct", 0),
        "loudness_mean": round(stats.get("Loudness_sma3", {}).get("mean", 0), 4),
        "loudness_range": f"{stats.get('Loudness_sma3', {}).get('p5', 0):.3f}-{stats.get('Loudness_sma3', {}).get('p95', 0):.3f}",
        "hnr_mean": round(stats.get("HNRdBACF_sma3nz", {}).get("mean", 0), 1),
        "jitter_mean": round(stats.get("jitterLocal_sma3nz", {}).get("mean", 0), 5),
        "alpha_ratio": round(stats.get("alphaRatio_sma3", {}).get("mean", 0), 3),
        "spectral_flux": round(stats.get("spectralFlux_sma3", {}).get("mean", 0), 4),
        "f1_mean": round(stats.get("F1frequency_sma3nz", {}).get("mean", 0), 0),
        "f2_mean": round(stats.get("F2frequency_sma3nz", {}).get("mean", 0), 0),
    }

# ─── Main pipeline ───
def process_episode(name, mp3_path):
    print(f"\n{'='*50}")
    print(f"Processing: {name}")
    print(f"{'='*50}")
    
    # 1. Extract 10-minute clip
    clip_path = os.path.join(OUT_DIR, f"{name}-10min.wav")
    print(f"[1/4] Extracting first 10 minutes...")
    actual_dur = extract_clip(mp3_path, clip_path)
    print(f"       {actual_dur:.0f}s @ 16kHz mono")
    
    # 2. Transcribe
    print(f"[2/4] Transcribing with Whisper...")
    t0 = time.time()
    words, info = transcribe(clip_path)
    print(f"       {len(words)} words in {time.time()-t0:.1f}s ({info.language})")
    
    # 3. OpenSMILE features
    print(f"[3/4] Extracting OpenSMILE eGeMAPS...")
    t0 = time.time()
    acoustic = extract_opensmile(clip_path)
    print(f"       {acoustic.get('_overall', {}).get('frames', 0)} frames in {time.time()-t0:.1f}s")
    
    # 4. Conversation metrics
    print(f"[4/4] Analyzing conversation structure...")
    conversation = analyze_conversation(words)
    
    # Build speaker signature
    signature = build_acoustic_signature(acoustic)
    signature["speaking_rate_wpm"] = conversation.get("speaking_rate_wpm", 0)
    signature["mean_gap"] = conversation.get("gap_mean", 0)
    signature["word_duration"] = conversation.get("word_duration_mean", 0)
    
    # Save profile
    profile = {
        "episode": name,
        "acoustic_signature": signature,
        "acoustic_raw": acoustic,
        "conversation": conversation,
        "words": words,
        "word_count": len(words)
    }
    
    profile_path = os.path.join(OUT_DIR, f"{name}-profile.json")
    with open(profile_path, "w") as f:
        json.dump(profile, f, indent=2, default=str)
    
    print(f"\n✓ Speaker signature:")
    print(f"  F0: {signature['f0_mean']}Hz ({signature['f0_range']})")
    print(f"  Rate: {signature['speaking_rate_wpm']} wpm")
    print(f"  Loudness: {signature['loudness_mean']}")
    print(f"  HNR: {signature['hnr_mean']}dB")
    print(f"  Jitter: {signature['jitter_mean']}")
    print(f"  Voiced: {signature['voiced_pct']}%")
    print(f"  Profile: {profile_path}")
    
    return signature, conversation

if __name__ == '__main__':
    # Find all episodes
    episodes = []
    for f in sorted(os.listdir(SRC_DIR)):
        if f.startswith('ep') and f.endswith('.mp3') and not os.path.islink(f):
            # Extract name from filename
            name = f.replace('.mp3', '')
            episodes.append((name, os.path.join(SRC_DIR, f)))
    
    if not episodes:
        print("No episode files found!")
        sys.exit(1)
    
    print(f"Found {len(episodes)} episodes to analyze\n")
    print("="*50)
    print("SPEAKER PROFILING PIPELINE")
    print("="*50)
    
    all_profiles = {}
    for name, path in episodes:
        sig, conv = process_episode(name, path)
        all_profiles[name] = {
            "signature": sig,
            "conversation": conv
        }
    
    # Write comparative database
    db_path = os.path.join(os.path.dirname(__file__), "speaker-database.json")
    with open(db_path, "w") as f:
        json.dump(all_profiles, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"SPEAKER DATABASE: {db_path}")
    print(f"{'='*50}")
    print(f"{'Episode':30s} {'F0(Hz)':10s} {'WPM':8s} {'Loud':8s} {'HNR':6s} {'Jitter':10s}")
    print("-"*80)
    for name, profile in sorted(all_profiles.items()):
        s = profile["signature"]
        c = profile.get("conversation", {})
        print(f"{name:30s} {s.get('f0_mean', 0):>8.1f} {s.get('speaking_rate_wpm', 0):>7.1f} {s.get('loudness_mean', 0):>7.4f} {s.get('hnr_mean', 0):>5.1f} {s.get('jitter_mean', 0):>.6f}")
    
    # Comparative analysis
    if len(all_profiles) >= 2:
        print(f"\n{'='*50}")
        print("COMPARATIVE ANALYSIS")
        print(f"{'='*50}")
        f0_vals = [p["signature"]["f0_mean"] for p in all_profiles.values()]
        wpm_vals = [p["signature"]["speaking_rate_wpm"] for p in all_profiles.values()]
        hnr_vals = [p["signature"]["hnr_mean"] for p in all_profiles.values()]
        print(f"F0 range across speakers: {min(f0_vals):.0f}-{max(f0_vals):.0f} Hz (Δ={max(f0_vals)-min(f0_vals):.0f}Hz)")
        print(f"Rate range: {min(wpm_vals):.0f}-{max(wpm_vals):.0f} wpm")
        print(f"HNR range: {min(hnr_vals):.1f}-{max(hnr_vals):.1f} dB")
