# Fleet OSC Bridge — Conversation → Lighting

Reads lead-sheet-MIDI-v3 JSON and sends OSC messages to QLC+, 
DMX controllers, or any OSC listener.

Implements the **2029 Lighting Designer** future: conversation prosody
drives stage lighting in real-time.

## How It Works

```
lead-sheet-v3.json → OSC Bridge → QLC+ / ArtNet / DMX
                         ↓
                   Speaker position (pan)
                   Pitch → color temperature
                   Energy → brightness
                   Ternary state → scene transitions
```

## OSC Map

| Feature | OSC Path | Value Range | Lighting Effect |
|---------|----------|-------------|-----------------|
| Speaker pan | `/conversation/pan` | 0.0–1.0 | Left/right fixture position |
| Pitch centroid | `/conversation/pitch` | 36–96 | Color temperature (cold→warm) |
| Energy | `/conversation/energy` | 0–127 | Intensity / dimmer level |
| Ternary pitch | `/conversation/ternary_pitch` | -1, 0, +1 | Scene selection |
| Ternary volume | `/conversation/ternary_vol` | -1, 0, +1 | Shutter / strobe |
| Word | `/conversation/word` | string | Text overlay |
| Speaker ID | `/conversation/speaker` | 0, 1 | Fixture group selection |

## Usage

```bash
# Stream a lead-sheet file to QLC+
python3 fleet-osc-bridge.py --input lead-sheet-v3.json --host 127.0.0.1 --port 7700

# Time-compress: play 30s of conversation in 10s
python3 fleet-osc-bridge.py --input lead-sheet-v3.json --speed 3.0
```

## Dependencies

- `python-osc` (pip install python-osc)

No other dependencies. Works on ARM64, x86_64, any platform.
"""

import json
import os
import sys
import time
import math

try:
    from pythonosc.udp_client import SimpleUDPClient
    OSC_AVAILABLE = True
except ImportError:
    OSC_AVAILABLE = False


# ─── OSC Client ─────────────────────────────────────────────────────────────

class ConversationOSCBridge:
    """Convert lead-sheet-MIDI events to OSC messages for QLC+."""

    def __init__(self, host: str = "127.0.0.1", port: int = 7700):
        self.host = host
        self.port = port
        self.client = None
        if OSC_AVAILABLE:
            self.client = SimpleUDPClient(host, port)

    def send_event(self, tick: float, event: dict, bpm: float = 120):
        """Send a single conversation event as OSC messages."""
        if not self.client:
            return

        # Speaker position (CC10 pan)
        spk = event.get("speaker_id", event.get("spk", 0))
        pan = 0.0 if spk == 0 else 1.0
        self.client.send_message("/conversation/pan", pan)

        # Pitch → color temperature (MIDI note 36=C2=cold, 96=C7=warm)
        note = event.get("note", 60)
        temp = (note - 36) / 60.0  # 0.0 to 1.0
        self.client.send_message("/conversation/pitch", temp)

        # Energy → brightness
        energy = event.get("energy", event.get("vel", 64))
        brightness = min(1.0, energy / 127.0)
        self.client.send_message("/conversation/energy", brightness)

        # Ternary states → scene selection
        t_pitch = event.get("t_pitch", 0)
        t_vol = event.get("t_vol", 0)
        self.client.send_message("/conversation/ternary_pitch", float(t_pitch))
        self.client.send_message("/conversation/ternary_vol", float(t_vol))

        # Word overlay
        word = event.get("word", "")
        self.client.send_message("/conversation/word", word)

        # Speaker ID
        self.client.send_message("/conversation/speaker", float(spk))

    def stream_file(self, json_path: str, speed: float = 1.0, 
                    real_time: bool = True, bpm: float = 120):
        """Stream a lead-sheet JSON file as OSC events.
        
        Args:
            json_path: Path to lead-sheet-v3 JSON
            speed: Time multiplier (2.0 = twice as fast)
            real_time: If True, sleep between events for real-time playback
            bpm: Beats per minute (for CC timing)
        """
        if not self.client:
            print("⚠️ python-osc not installed. Install: pip3 install python-osc")
            return False

        # Load lead-sheet data
        with open(json_path) as f:
            data = json.load(f)

        # Extract pitch events from tracks
        events = []
        for tr in data.get("tracks", []):
            name = tr.get("name", "").lower().replace(" ", "_")
            if "pitch" in name or "prosody" in name or "stage" in name:
                for ev in tr.get("events", []):
                    ev["_track"] = tr["name"]
                    events.append(ev)

        # Sort by time
        events.sort(key=lambda e: e.get("t", 0))

        print(f"  Streaming {len(events)} events to {self.host}:{self.port}")
        print(f"  Format: {data.get('format', 'unknown')}")
        print(f"  Speed: {speed}x")
        print(f"  {'Real-time' if real_time else 'Burst'} mode")

        if real_time:
            # Real-time playback with timing
            prev_t = 0.0
            for ev in events:
                t = ev.get("t", 0) / speed
                dt = t - prev_t
                if dt > 0:
                    time.sleep(dt)
                prev_t = t
                self.send_event(t, ev, bpm)

                # Progress indicator every 10 events
                idx = events.index(ev)
                if idx > 0 and idx % 10 == 0:
                    pct = int(idx / len(events) * 100)
                    sys.stdout.write(f"\r  Progress: {pct}%")
                    sys.stdout.flush()
        else:
            # Burst mode: send all events immediately
            for ev in events:
                self.send_event(ev.get("t", 0), ev, bpm)

        print(f"\r  Done: {len(events)} events to {self.host}:{self.port}")
        return True


# ─── CLI ────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Fleet OSC Bridge — Conversation → Lighting")
    parser.add_argument('--input', '-i', default='tensor-output/lead-sheet-v2.json',
                        help='Lead-sheet JSON file')
    parser.add_argument('--host', default='127.0.0.1',
                        help='OSC target host')
    parser.add_argument('--port', '-p', type=int, default=7700,
                        help='OSC target port (default 7700 = QLC+)')
    parser.add_argument('--speed', type=float, default=1.0,
                        help='Playback speed multiplier')
    parser.add_argument('--burst', action='store_true',
                        help='Send all events immediately (no real-time)')
    parser.add_argument('--check', action='store_true',
                        help='Check OSC availability only')
    args = parser.parse_args()

    if args.check:
        print(f"python-osc: {'✅ available' if OSC_AVAILABLE else '❌ not installed'}")
        print(f"Install: pip3 install python-osc")
        return

    bridge = ConversationOSCBridge(host=args.host, port=args.port)
    bridge.stream_file(args.input, speed=args.speed, real_time=not args.burst)


if __name__ == '__main__':
    main()
