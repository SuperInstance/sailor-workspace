# Demucs WebSocket Service — Audio Source Separation Bridge

Runs Demucs 4.0.1 as a WebSocket service for the audio→stem pipeline.

Accepts audio uploads, runs source separation, and optionally
forwards per-stem audio to the Basic Pitch conversation bridge.

## Port

`:8771` — Next in the pipeline port sequence (:8765–:8770).

## API

### WebSocket Protocol

```json
// Client → Server
{
  "type": "separate",
  "model": "htdemucs",    // htdemucs | htdemucs_ft | htdemucs_6s
  "two_stems": true,      // If true, only output drums+vocals
  "run_bridge": true      // If true, forward vocals to Basic Pitch
}
```

Followed by binary audio data (WAV/PCM).

### Server → Client

```json
// Progress
{"type": "progress", "stage": "loading", "model": "htdemucs"}
{"type": "progress", "stage": "separating", "elapsed": 2.5}
{"type": "progress", "stage": "saving", "source": 3}
{"type": "progress", "stage": "bridging"}

// Result
{
  "type": "result",
  "duration": 30.2,
  "elapsed": 15.7,
  "sources": ["drums", "bass", "other", "vocals"],
  "stems": {
    "vocals": {"size_bytes": 512000},
    "other": {"size_bytes": 512000}
  },
  "bridge": null
}

// Error
{"type": "error", "message": "..."}
```

## Dependencies

- `demucs` (4.0.1+) with PyTorch
- `soundfile` for audio I/O
- `websockets` for WebSocket server
- `numpy` for audio processing

## Platform

Tested on ARM64 (Oracle Pi). ~2× real-time on CPU.
"""

import asyncio
import json
import os
import sys
import time
import tempfile
import traceback

# Optional imports
HAS_DEMUCS = False
try:
    from demucs import separate
    from demucs.pretrained import get_model
    HAS_DEMUCS = True
except ImportError:
    pass

HAS_SOUNDFILE = False
try:
    import soundfile as sf
    HAS_SOUNDFILE = True
except ImportError:
    pass

HAS_WEBSOCKETS = False
try:
    from websockets.asyncio.server import serve
    HAS_WEBSOCKETS = True
except ImportError:
    try:
        import websockets
        HAS_WEBSOCKETS = True
    except ImportError:
        pass

HAS_NUMPY = False
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    pass


# ─── Demucs Runner ────────────────────────────────────────────────

class DemucsRunner:
    """Run Demucs source separation on audio data."""

    MODEL_NAMES = ["htdemucs", "htdemucs_ft", "htdemucs_6s"]
    SOURCE_NAMES = {
        "htdemucs":     ["drums", "bass", "other", "vocals"],
        "htdemucs_ft":  ["drums", "bass", "other", "vocals"],
        "htdemucs_6s":  ["drums", "bass", "other", "vocals", "guitar", "piano"],
    }

    def __init__(self):
        self.model = None
        self.model_name = None

    def load_model(self, name: str = "htdemucs"):
        if not HAS_DEMUCS:
            raise RuntimeError("Demucs not installed")
        if name not in self.MODEL_NAMES:
            name = "htdemucs"
        if self.model_name == name and self.model is not None:
            return self.model
        self.model_name = name
        self.model = get_model(name=name)
        self.model.eval()
        if HAS_DEMUCS:
            import torch
            if torch.cuda.is_available():
                self.model.to("cuda")
        return self.model

    def separate(self, audio_path: str, model_name: str = "htdemucs",
                 two_stems: bool = False) -> dict:
        model = self.load_model(model_name)
        source_names = self.SOURCE_NAMES.get(model_name, ["drums", "bass", "other", "vocals"])
        t0 = time.time()

        audio, sr = separate.load_track(audio_path, model.audio_channels, model.samplerate)
        import torch
        with torch.no_grad():
            sources = model.apply(audio)
        elapsed = round(time.time() - t0, 2)

        out_dir = tempfile.mkdtemp(prefix="demucs-stems-")
        stem_info = {}

        if two_stems:
            separate.save_audio(sources[3], os.path.join(out_dir, "vocals.wav"), sr)
            other = torch.mean(sources[:3], dim=0)
            separate.save_audio(other, os.path.join(out_dir, "accompaniment.wav"), sr)
            stem_info = {
                "vocals":        {"path": os.path.join(out_dir, "vocals.wav"), "size": 0},
                "accompaniment": {"path": os.path.join(out_dir, "accompaniment.wav"), "size": 0},
            }
        else:
            for i, name in enumerate(source_names):
                spath = os.path.join(out_dir, f"{name}.wav")
                separate.save_audio(sources[i], spath, sr)
                stem_info[name] = {"path": spath, "size": 0}

        audio_seconds = audio.shape[-1] / sr if audio.ndim > 1 else 0
        for name, info in stem_info.items():
            if os.path.exists(info["path"]):
                info["size"] = os.path.getsize(info["path"])

        return {
            "duration_seconds": round(audio_seconds, 2),
            "elapsed_seconds": elapsed,
            "model": model_name,
            "sample_rate": sr,
            "sources": source_names if not two_stems else ["vocals", "accompaniment"],
            "stems": stem_info,
            "output_dir": out_dir,
        }


# ─── WebSocket Server ─────────────────────────────────────────────

class DemucsWebSocketServer:
    """WebSocket server for Demucs source separation."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8771):
        self.host = host
        self.port = port
        self.runner = DemucsRunner()

    async def handler(self, websocket):
        print(f"  Connection from {websocket.remote_address}")

        # Read metadata
        msg = await websocket.recv()
        if isinstance(msg, bytes):
            await websocket.send(json.dumps({"type": "error",
                "message": "Expected JSON config first, then binary audio"}))
            return
        config = json.loads(msg)
        model_name = config.get("model", "htdemucs")
        two_stems = config.get("two_stems", True)
        run_bridge = config.get("run_bridge", False)

        # Read binary audio
        audio_data = bytearray()
        while True:
            try:
                chunk = await asyncio.wait_for(websocket.recv(), timeout=60)
                if isinstance(chunk, bytes):
                    audio_data.extend(chunk)
                elif isinstance(chunk, str) and json.loads(chunk).get("type") == "end":
                    break
            except (asyncio.TimeoutError, Exception):
                break

        if not audio_data:
            await websocket.send(json.dumps({"type": "error", "message": "No audio data"}))
            return

        t0 = time.time()
        tmp = tempfile.NamedTemporaryFile(prefix="demucs-in-", suffix=".wav", delete=False)
        tmp_path = tmp.name
        result = {}

        try:
            if HAS_SOUNDFILE and HAS_NUMPY:
                arr = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
                sf.write(tmp_path, arr, 44100)
            else:
                tmp.write(audio_data)
            tmp.close()

            await websocket.send(json.dumps({"type": "progress", "stage": "loading", "model": model_name}))
            self.runner.load_model(model_name)

            await websocket.send(json.dumps({"type": "progress", "stage": "separating",
                "elapsed": round(time.time() - t0, 2)}))
            result = self.runner.separate(tmp_path, model_name, two_stems)

            bridge_result = None
            if run_bridge:
                vocals_path = result["stems"].get("vocals", {}).get("path")
                if vocals_path and os.path.exists(vocals_path):
                    try:
                        import subprocess
                        ls = vocals_path.replace(".wav", "-lead-sheet.json")
                        subprocess.run([sys.executable, "-m", "basic_pitch_conversation",
                            vocals_path, "--output", ls], timeout=120, capture_output=True)
                        bridge_result = {"lead_sheet": ls}
                    except Exception as e:
                        bridge_result = {"error": str(e)}

            clean = {
                "type": "result",
                "duration": result["duration_seconds"],
                "elapsed":   result["elapsed_seconds"],
                "model":     result["model"],
                "sources":   result["sources"],
                "stems": {n: {"size_bytes": info["size"]} for n, info in result["stems"].items()},
                "bridge":    bridge_result,
            }
            await websocket.send(json.dumps(clean))

        except Exception as e:
            await websocket.send(json.dumps({"type": "error", "message": str(e),
                "traceback": traceback.format_exc()}))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            out_dir = result.get("output_dir")
            if out_dir and os.path.exists(out_dir):
                import shutil
                shutil.rmtree(out_dir, ignore_errors=True)

    async def serve(self):
        if not HAS_WEBSOCKETS:
            print("❌ websockets not installed. Install: pip3 install websockets")
            return False
        print(f"\n  Demucs WebSocket Service  :{self.port}")
        print(f"  Demucs: {'✅' if HAS_DEMUCS else '❌ not installed'}")
        async with serve(self.handler, self.host, self.port):
            await asyncio.get_running_loop().create_future()

    def run(self):
        asyncio.run(self.serve())


# ─── CLI ─────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Demucs WebSocket Service")
    parser.add_argument('--port', type=int, default=8771)
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--check', action='store_true', help='Check dependencies only')
    args = parser.parse_args()

    if args.check:
        print(f"Demucs:     {'✅' if HAS_DEMUCS else '❌ not installed'}")
        import torch
        print(f"PyTorch:   {'✅' if torch else '❌'}")
        print(f"CUDA:      {'✅' if torch.cuda.is_available() else '❌ CPU only'}")
        print(f"soundfile: {'✅' if HAS_SOUNDFILE else '❌ not installed'}")
        print(f"websockets:{'✅' if HAS_WEBSOCKETS else '❌ not installed'}")
        print(f"numpy:     {'✅' if HAS_NUMPY else '❌ not installed'}")
        return

    DemucsWebSocketServer(host=args.host, port=args.port).run()


if __name__ == '__main__':
    main()
