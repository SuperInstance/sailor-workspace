"""mmx speech synthesis wrapper — drop-in replacement for Piper TTS"""
import subprocess
import json
import tempfile
from pathlib import Path


def synthesize(text: str, voice: str = "male-qy",
               rate: float = 1.0, pitch: float = 0.0,
               output: str = None) -> Path:
    """
    Synthesize speech using mmx CLI.

    Args:
        text: Text to speak
        voice: MiniMax voice ID (default: male-qy)
        rate: Speaking rate multiplier (1.0 = normal, 1.5 = faster, 0.5 = slower)
        pitch: Pitch shift in arbitrary units
        output: Output WAV path (auto-generates if None)

    Returns: Path to output WAV file
    """
    if output is None:
        output = tempfile.mktemp(suffix='.wav')

    cmd = [
        'mmx', 'speech', 'synthesize',
        '--text', text,
        '--voice', voice,
        '--out', output,
        '--format', 'wav',
    ]

    # mmx natively supports --speed and --pitch
    if rate != 1.0:
        cmd.extend(['--speed', str(rate)])
    if pitch != 0.0:
        cmd.extend(['--pitch', str(pitch)])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"mmx speech failed: {result.stderr}")

    if not Path(output).exists():
        raise FileNotFoundError(
            f"Expected output file not found: {output}\n"
            f"mmx stderr: {result.stderr}\n"
            f"mmx stdout: {result.stdout}"
        )

    return Path(output)


def list_voices() -> list:
    """List available MiniMax voices"""
    result = subprocess.run(['mmx', 'speech', 'voices'],
                          capture_output=True, text=True)
    data = json.loads(result.stdout)
    # voices can be a list or a dict with a 'voices' key
    if isinstance(data, dict):
        return data.get('voices', list(data.keys()))
    return data
