"""mmx music generation — direct music from pipeline output"""
import subprocess
import json
import tempfile
from pathlib import Path


def generate_from_persona(persona_profile: dict, duration: int = 30,
                          genre: str = "ambient", output: str = None) -> Path:
    """
    Generate music from a persona profile.

    Uses mmx music generate with a prompt derived from
    the persona's cadence, prosody, and groove values.
    """
    if output is None:
        output = tempfile.mktemp(suffix='.wav')

    # Build prompt from persona
    cadence = persona_profile.get('cadence', {}).get('wpm', 120)
    groove = persona_profile.get('groove', {})
    bpm = groove.get('bpm', 90)
    swing = groove.get('swing', 0.0)

    prompt = (
        f"Inspired by conversational cadence of {cadence} WPM, swing factor {swing:.1f}"
    )

    cmd = [
        'mmx', 'music', 'generate',
        '--prompt', prompt,
        '--genre', genre,
        '--bpm', str(int(bpm)),
        '--instrumental',
        '--out', output,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"mmx music failed: {result.stderr}")

    if not Path(output).exists():
        raise FileNotFoundError(
            f"Expected output file not found: {output}\n"
            f"mmx stderr: {result.stderr}\n"
            f"mmx stdout: {result.stdout}"
        )

    return Path(output)
