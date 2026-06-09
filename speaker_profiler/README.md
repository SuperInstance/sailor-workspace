# speaker-profiler 🎙️→🧠

Automated voice identity pipeline. Takes audio of any person speaking, extracts 25-dimensional acoustic signature, induces vocal personality traits, and builds a comparative database.

## Quick Start

```bash
# Profile one person (file or URL)
python -m speaker_profiler episode.mp3 --name "Guest Name" --gender M

# Compare everyone in the database
python -m speaker_profiler --compare
```

## Pipeline

```
Audio → [1] Fetch → [2] Extract 10-min clip @ 16kHz
       → [3] Whisper transcribe → conversation metrics (WPM, gaps)
       → [4] OpenSMILE eGeMAPS → 25 acoustic features
       → [5] Personality induction → 7 trait categories
       → database.json (cumulative)
```

## Output

Each guest produces a profile in `profiles/<hash>-profile.json` and is
appended to `database.json`. The database tracks, per guest:

- **Acoustic**: F0 (mean, std, range), HNR, jitter, shimmer, loudness,
  spectral flux, alpha ratio, formants (F1-F3), MFCC 1-4
- **Conversation**: WPM, segment count, gap patterns, segment lengths
- **Vocal personality**: pitch type, breathiness, energy, stability,
  speaking rate, vocal health score, 7+ derived traits

## Schema

See `database.json` for the current database format (v1.0).

## Dependencies

- python 3.10+
- `faster-whisper` (tiny.en model, ~2GB RAM)
- `opensmile` (2.6.0, includes libSMILEapi for ARM64)
- `soundfile`, `numpy`, `pandas`

## File Structure

```
speaker_profiler/
├── __init__.py     # Module exports
├── __main__.py     # CLI entry point
├── core.py         # Pipeline implementation
├── database.json   # Cumulative database
└── profiles/       # Per-guest profiles
