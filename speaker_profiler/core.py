"""speaker-profiler — automated voice identity pipeline

Usage:
  python -m speaker_profiler <audio-url-or-path> [options]

Pipeline: fetch → extract 10min clip → Whisper transcribe → 
          OpenSMILE eGeMAPS → conversation metrics → personality induction
"""

import json, os, time, hashlib, warnings, gc
from pathlib import Path

warnings.filterwarnings('ignore')
BASE = Path(__file__).parent.resolve()
PROFILES_DIR = BASE / "profiles"
PROFILES_DIR.mkdir(exist_ok=True)
DB_PATH = BASE / "database.json"

# Load or init database
if DB_PATH.exists():
    with open(DB_PATH) as f:
        DATABASE = json.load(f)
else:
    DATABASE = {"source": "speaker-profiler", "version": "1.0", "guests": {}}


def _fp(source):
    return hashlib.md5(str(source).encode()).hexdigest()[:12]


def fetch(source, dest):
    if os.path.exists(source):
        import shutil; shutil.copy2(source, str(dest)); return
    if str(source).startswith(('http://', 'https://')):
        import urllib.request
        print("  Downloading...", flush=True)
        urllib.request.urlretrieve(source, str(dest))
        return
    raise ValueError(f"Cannot access: {source}")


def extract(inpath, fp, dur=600, target_sr=16000):
    import soundfile, numpy as np
    out = PROFILES_DIR / f"{fp}-clip.wav"
    if out.exists():
        return str(out)
    data, sr = soundfile.read(inpath)
    chunk = data[:min(dur*sr, len(data))]
    if chunk.ndim > 1: chunk = chunk.mean(axis=1)
    ratio = sr / target_sr
    indices = np.linspace(0, len(chunk)-1, int(len(chunk)/ratio))
    resampled = np.interp(indices, np.arange(len(chunk)), chunk)
    soundfile.write(str(out), resampled.astype(np.float32), target_sr)
    return str(out)


def transcribe(clip_path):
    """Transcribe clip, return (segments_list, info)."""
    from faster_whisper import WhisperModel
    model = WhisperModel('tiny.en', device='cpu', compute_type='int8')
    segs, info = model.transcribe(clip_path, word_timestamps=False, beam_size=3)
    segments = [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segs]
    return segments, info


def acoustics(clip_path):
    import opensmile, soundfile, numpy as np, pandas as pd
    smile = opensmile.Smile(
        feature_set=opensmile.FeatureSet.eGeMAPSv02,
        feature_level=opensmile.FeatureLevel.LowLevelDescriptors,
    )
    data, sr = soundfile.read(clip_path)
    cs = 30
    nc = int(np.ceil(len(data) / (cs * sr)))
    feats = []
    for ci in range(nc):
        c = data[ci*cs*sr:(ci+1)*cs*sr]
        if len(c):
            feats.append(smile.process_signal(c.astype(np.float64), sr))
    df = pd.concat(feats).reset_index(drop=True) if feats else pd.DataFrame()
    gc.collect()

    cols = ['F0semitoneFrom27.5Hz_sma3nz', 'Loudness_sma3', 'HNRdBACF_sma3nz',
            'jitterLocal_sma3nz', 'shimmerLocaldB_sma3nz', 'alphaRatio_sma3',
            'spectralFlux_sma3', 'F1frequency_sma3nz', 'F2frequency_sma3nz']
    stats = {}
    for c in cols:
        if c in df.columns:
            v = df[c].dropna().values.astype(float)
            if len(v):
                stats[c] = {"mean": float(np.mean(v)), "std": float(np.std(v)),
                            "p5": float(np.percentile(v,5)), "p95": float(np.percentile(v,95))}

    f0v = df['F0semitoneFrom27.5Hz_sma3nz'].dropna().values.astype(float)
    f0 = f0v[f0v > 0]
    f0hz = [27.5 * 2**(s/12) for s in f0]
    stats["_overall"] = {
        "frames": int(len(df)),
        "duration_s": round(len(data)/sr, 1),
        "voiced_pct": round(100*len(f0)/max(1,len(f0v))),
        "f0_mean_hz": round(float(np.mean(f0hz)),1) if f0hz else 0,
        "f0_std_hz": round(float(np.std(f0hz)),1) if len(f0hz)>1 else 0,
        "f0_min_hz": round(float(np.min(f0hz)),1) if f0hz else 0,
        "f0_max_hz": round(float(np.max(f0hz)),1) if f0hz else 0,
        "loudness_mean": round(float(df['Loudness_sma3'].dropna().mean() if 'Loudness_sma3' in df.columns else 0), 4),
    }
    return stats


def conversation_metrics(segments):
    import numpy as np
    if not segments:
        return {}
    text = ' '.join(s['text'] for s in segments)
    word_est = len(text.split())
    dur = segments[-1]['end'] - segments[0]['start']
    gaps = [segments[i]['start'] - segments[i-1]['end']
            for i in range(1, len(segments))
            if segments[i]['start'] > segments[i-1]['end']]
    
    return {
        "word_count": word_est,
        "segments": len(segments),
        "wpm": round(word_est / (dur/60), 1) if dur > 0 else 0,
        "duration_s": round(dur, 1),
        "gap_mean": round(float(np.mean(gaps)), 3) if gaps else 0,
        "gap_max": round(float(np.max(gaps)), 3) if gaps else 0,
        "seg_len_mean": round(dur / len(segments), 2) if segments else 0,
    }


def personality(acoustic, conv):
    o = acoustic.get("_overall", {})
    f0 = o.get("f0_mean_hz", 140)
    hnr = acoustic.get("HNRdBACF_sma3nz", {}).get("mean", 3)
    jit = acoustic.get("jitterLocal_sma3nz", {}).get("mean", 0.008)
    loud = o.get("loudness_mean", 0.8)
    voiced = o.get("voiced_pct", 50)
    flux = acoustic.get("spectralFlux_sma3", {}).get("mean", 0.4)
    alpha = acoustic.get("alphaRatio_sma3", {}).get("mean", -11)
    wpm = conv.get("wpm", 150)

    traits = []
    if hnr > 4: traits.append("Confident/open")
    elif hnr < 2.5: traits.append("Tentative/reflective")
    if voiced > 55: traits.append("Outgoing/expressive")
    else: traits.append("Reserved/pensive")
    if loud > 0.9: traits.append("Animated storyteller")
    if jit < 0.008: traits.append("Steady/resolute")
    elif jit > 0.01: traits.append("Emotionally responsive")
    if alpha > -10: traits.append("Bright/forward placement")
    else: traits.append("Warm/dark timbre")
    if flux > 0.5: traits.append("Dynamic/varied")
    else: traits.append("Measured/deliberate")
    if wpm > 170: traits.append("Rapid/fast talker")
    elif wpm < 120: traits.append("Slow/deliberate")

    health = min(100, max(0, 50 +
        (20 if 100 < f0 < 200 else 0) +
        (voiced / 2) - (jit * 2000) + min(hnr * 4, 20)))

    return {
        "pitch_type": "High" if f0 > 170 else "Medium" if f0 > 130 else "Low",
        "breathiness": "Breathy" if hnr < 3 else "Neutral" if hnr < 6 else "Clear",
        "energy": "High" if loud > 0.9 else "Medium" if loud > 0.7 else "Low",
        "stability": "Stable" if o.get("f0_std_hz", 80) < 50 else "Variable",
        "rate_type": "Fast" if wpm > 170 else "Moderate" if wpm > 130 else "Slow",
        "vocal_health": round(health, 1),
        "traits": list(dict.fromkeys(traits))
    }


def profile(source, name=None, gender=None, desc=None):
    fp = _fp(source)
    print(f"\n{'─'*50}", flush=True)
    print(f"PROFILING: {name or source}", flush=True)
    print(f"{'─'*50}", flush=True)
    t_start = time.time()

    # 1. Fetch audio
    print("[1/5] Fetch...", end=" ", flush=True)
    raw = PROFILES_DIR / f"{fp}-raw.mp3"
    fetch(source, raw)
    print("done", flush=True)

    # 2. Extract 10-min clip
    print("[2/5] Extract 10-min...", end=" ", flush=True)
    clip = extract(str(raw), fp)
    dur = float(clip.rsplit('-', 1)[0]) if False else None  # not needed
    print("done", flush=True)

    # 3. Transcribe (lighter first)
    print("[3/5] Whisper...", flush=True)
    t0 = time.time()
    segs, info = transcribe(str(clip))
    conv = conversation_metrics(segs)
    print(f"       {conv.get('segments',0)} segs, {conv.get('word_count',0)} words in {time.time()-t0:.0f}s", flush=True)

    # 4. Acoustics (heavier, runs clean after Whisper)
    print("[4/5] OpenSMILE eGeMAPS...", flush=True)
    t0 = time.time()
    ac = acoustics(str(clip))
    o = ac.get("_overall", {})
    print(f"       {o.get('frames',0)} frames in {time.time()-t0:.0f}s", flush=True)

    # 5. Personality induction
    print("[5/5] Personality induction...", end=" ", flush=True)
    vp = personality(ac, conv)
    print("done", flush=True)

    # Build/save profile
    pd = {
        "fingerprint": fp,
        "name": name or f"Guest-{fp}",
        "gender": gender or "?",
        "desc": desc or "",
        "acoustic": ac,
        "conversation": conv,
        "vocal_personality": vp,
        "processing_time_s": round(time.time()-t_start, 1),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    prof_path = PROFILES_DIR / f"{fp}-profile.json"
    with open(prof_path, "w") as f:
        json.dump(pd, f, indent=2)

    # Update database
    gid = name.replace(' ', '_').lower() if name else fp
    DATABASE["guests"][gid] = {
        "name": name or f"Guest-{fp}",
        "gender": gender or "?",
        "desc": desc or "",
        "acoustic": {
            "f0_mean_hz": o["f0_mean_hz"], "f0_std_hz": o["f0_std_hz"],
            "f0_min_hz": o["f0_min_hz"], "f0_max_hz": o["f0_max_hz"],
            "voiced_pct": o["voiced_pct"], "hnr_mean": round(ac.get("HNRdBACF_sma3nz",{}).get("mean",0),2),
            "hnr_std": round(ac.get("HNRdBACF_sma3nz",{}).get("std",0),2),
            "jitter_mean": round(ac.get("jitterLocal_sma3nz",{}).get("mean",0),6),
            "loudness_mean": round(o["loudness_mean"],4),
            "spectral_flux": round(ac.get("spectralFlux_sma3",{}).get("mean",0),4),
            "alpha_ratio": round(ac.get("alphaRatio_sma3",{}).get("mean",0),3),
        },
        "conversation": conv,
        "vocal_personality": vp,
        "profile_path": str(prof_path),
        "profiled_at": pd["timestamp"]
    }
    with open(DB_PATH, "w") as f:
        json.dump(DATABASE, f, indent=2)

    print(f"\n  ✓ {name or source}", flush=True)
    print(f"  F0={o['f0_mean_hz']}Hz | {vp['pitch_type']} | {vp['breathiness']} | {vp['energy']} energy", flush=True)
    hnr_val = ac.get('HNRdBACF_sma3nz',{}).get('mean',0)
  print(f"  HNR={hnr_val:.1f}dB | {conv.get('wpm',0)} wpm | voiced={o['voiced_pct']}%", flush=True)
    print(f"  traits: {', '.join(vp['traits'][:4])}", flush=True)
    print(f"  profile: {prof_path}", flush=True)
    print(f"  database: {DB_PATH} ({len(DATABASE['guests'])} guests)", flush=True)
    return pd


def compare(gids=None):
    def _ac(g):
        a = g.get("acoustic", {})
        return {
            "f0": a.get("f0_mean_hz", 0),
            "hnr": a.get("hnr_mean", 0),
            "jit": a.get("jitter_mean", 0),
            "voiced": a.get("voiced_pct", 0),
            "loud": a.get("loudness_mean", 0),
        }
    guests = DATABASE.get("guests", {})
    if not guests:
        print("No guests in database.")
        return
    if gids: guests = {k:v for k,v in guests.items() if k in gids}

    print(f"\n{'─'*80}")
    print(f"SPEAKER DB — {len(guests)} guests")
    print(f"{'─'*80}")
    print(f"{'Name':24s} {'G':3s} {'F0(Hz)':8s} {'HNR':5s} {'Jitt':7s} {'Vcd%':5s} {'Loud':6s} {'WPM':5s} {'Pitch':8s} {'Energy':8s}")
    print(f"{'─'*80}")
    for gid, g in sorted(guests.items()):
        a = _ac(g); c = g.get("conversation",{}); vp = g.get("vocal_personality",{})
        print(f"{g.get('name','?'):24s} {g.get('gender','?'):3s} "
              f"{a['f0']:>7.1f} {a['hnr']:>4.1f} {a['jit']:.5f} "
              f"{a['voiced']:>4d}% {a['loud']:.3f} "
              f"{c.get('wpm',0):>4.0f} {vp.get('pitch_type','?'):8s} {vp.get('energy','?'):8s}")
    print(f"{'─'*80}")


if __name__ == '__main__':
    import sys, argparse
    p = argparse.ArgumentParser(description="Speaker Profiler")
    p.add_argument("source", nargs="?", help="Audio URL/path")
    p.add_argument("--name"); p.add_argument("--gender", choices=["M","F","NB","?"], default="?")
    p.add_argument("--desc"); p.add_argument("--compare", action="store_true")
    args = p.parse_args()
    if args.compare: compare()
    elif args.source: profile(args.source, args.name, args.gender, args.desc); compare()
    else: p.print_help()
