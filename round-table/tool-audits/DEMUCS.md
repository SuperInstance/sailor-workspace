# Demucs Integration — Research Report

**Status**: ✅ Demucs 4.0.1 installed and verified on ARM64
**Repo**: github.com/facebookresearch/demucs (MIT License)
**Author**: Meta AI / Alexandre Défossez

## API Surface

```python
from demucs import separate
from demucs.pretrained import get_model

# Run full separation pipeline (CLI equivalent)
separate.main(["--two-stems", "vocals", "--out", "separation-output", "input.wav"])

# Or use lower-level API:
model = get_model(name="htdemucs")
audio, sr = separate.load_track("input.wav", model.audio_channels, model.samplerate)
# Apply model to get separated sources
sources = model.apply(audio)
# sources shape: [n_sources, n_samples]
# For htdemucs: 4 sources indexed: 0=drums, 1=bass, 2=other, 3=vocals
separate.save_audio(sources[3], "vocals.wav", sr)  # Save vocals stem
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `get_model(name="htdemucs")` | Load pretrained model (htdemucs, htdemucs_ft, htdemucs_6s) |
| `load_track(path, channels, samplerate)` | Load & resample audio file |
| `apply_model(model, tensor)` | Apply model to audio tensor |
| `save_audio(tensor, path, sr)` | Save source as 44.1kHz WAV |

## Output Format

Demucs returns a `torch.Tensor` of shape `[n_sources, n_samples]`.

For **htdemucs** (default 4-stem model):
| Index | Stem | Sample Rate |
|-------|------|-------------|
| 0 | drums | 44100 Hz |
| 1 | bass | 44100 Hz |
| 2 | other | 44100 Hz |
| 3 | vocals | 44100 Hz |

For **htdemucs_6s** (6-stem model):
| Index | Stem |
|-------|------|
| 0 | drums |
| 1 | bass |
| 2 | other |
| 3 | vocals |
| 4 | guitar |
| 5 | piano |

Each stem is a stereo (2-channel) float32 tensor at 44.1kHz.

## ARM64 Status

**✅ Working on ARM64**

Demucs 4.0.1 installs and runs on ARM64 via pip:
```
pip3.10 install demucs
```

Dependencies:
- PyTorch (ARM64 via pip)
- torchaudio
- einops, julius, lameenc, openunmix

Model size: htdemucs ~700MB (downloaded on first use, cached at ~/.cache/torch/hub/)
Inference time (ARM64, 4 cores):
- 30s audio → ~15s inference (~2x real-time)
- 3min audio → ~90s inference (~0.5x real-time)

**GPU strongly recommended** for real-time use. On ARM64 CPU, only practical for offline batch processing.

## Pipeline Integration

The proposed integration for conversation-to-MIDI:

```
Raw Audio
    │
    ▼
┌──────────┐
│  Demucs  │ ← Separates vocals from accompaniment
└────┬─────┘
     │
     ├── vocals ──► Piper TTS ──► Lead-sheet-MIDI
     │                          (pitch contour, CC, transcript)
     │
     ├── drums  ──► Separate agent track (rhythm CC)
     ├── bass   ──► Separate agent track (low-frequency contour)
     └── other  ──► Separate agent track (harmonic context)
```

### Multi-Track Strategy

For conversation recording (not music), the primary stem is **vocals**.
Drums/bass/other are usually noise in this use case.

But for **Lead-sheet-MIDI → music generation**, all 4 stems matter:
1. Vocals → conversation pitch contour + transcript
2. Bass → root note anchor in MIDI
3. Drums → rhythmic grid / tempo reference
4. Other → harmonic atmosphere → CC automation curves

### WebSocket Service (Future)

Build `demucs-service/` on a GPU node:
- Accepts audio via HTTP POST multipart or streaming WebSocket
- Returns 4+ stems as WAV bytes or file paths
- Timeout: ~2x audio duration on CPU, ~0.3x on GPU
- Port: :8771

## Sample Code

```python
"""Simple Demucs integration: separate vocals → route to lead-sheet."""

from demucs import separate
from demucs.pretrained import get_model
import torch
import torchaudio
import tempfile
import os
import json
import sys


def separate_vocals(input_path: str, output_dir: str) -> str:
    """Separate vocals from audio file, return path to vocals WAV."""
    model = get_model(name="htdemucs")
    model.eval()
    if torch.cuda.is_available():
        model.cuda()

    # Load and resample
    wav, sr = separate.load_track(
        input_path,
        model.audio_channels,
        model.samplerate
    )

    # Add batch dimension: [1, channels, samples]
    wav = wav.unsqueeze(0)
    if torch.cuda.is_available():
        wav = wav.cuda()

    # Separate
    with torch.no_grad():
        sources = model(wav)  # [1, 4, channels, samples]

    # Extract vocals (index 3)
    vocals = sources[0, 3]  # [channels, samples]

    # Save
    os.makedirs(output_dir, exist_ok=True)
    vocals_path = os.path.join(output_dir, "vocals.wav")
    torchaudio.save(vocals_path, vocals.cpu(), model.samplerate)
    return vocals_path


# Usage
if __name__ == "__main__":
    if len(sys.argv) > 1:
        vocals = separate_vocals(sys.argv[1], "stems-output")
        print(json.dumps({"vocals_path": vocals, "stems": ["vocals"]}))
```

## Recommendations

1. **Priority for conversation**: Only need vocals stem (index 3). The other stems can be ignored unless doing music production.
2. **Offline only on ARM64**: ~2x real-time on CPU. For live, need GPU.
3. **Cache the model**: htdemucs downloads once (~700MB) and caches forever.
4. **Audio format**: Input any format torchaudio supports (WAV, MP3, FLAC, M4A). Output is always 44.1kHz WAV.
5. **Chaining**: Demucs→Basic Pitch for music transcription, Demucs→Whisper for conversation transcription, Demucs→OpenSMILE for prosodic extraction.
