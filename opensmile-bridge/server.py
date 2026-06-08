"""
OpenSMILE Voice Feature Bridge
Server-side voice feature extraction → enriched MIDI CC → Ghost Track Bridge

Architecture:
  Audio (WebSocket or file) → OpenSMILE features → MIDI CC enrichment → Ghost Bridge

OpenSMILE gives us:
  - F0 (YIN autocorrelation, more robust than browser autocorrelation)
  - Formants (F1, F2, F3 — vowel shape → CC#74, CC#71, CC#91)
  - Jitter (vocal roughness → CC#16)
  - Shimmer (amplitude instability → CC#17)
  - HNR (breathiness → CC#2 breath control)
  - MFCCs 1-12 (timbre fingerprint → CC#12-24)
  - Spectral slope, alpha ratio, energy bands → CC#75-78
"""

import asyncio
import json
import struct
import time
import math
import numpy as np
import websockets
import opensmile
import librosa
from collections import deque

# ─── Configuration ───
GHOST_BRIDGE_URL = "ws://localhost:8767"
OPEN_SMILE_PORT = 8765
SAMPLE_RATE = 16000
FRAME_SIZE = 1024
HOP_SIZE = 512

# MIDI range
MIDI_MAX = 127
MIDI_MIN = 0

# ─── OpenSMILE Feature Extractor ───
class OpenSmileExtractor:
    """Production-grade voice feature extraction using OpenSMILE."""

    def __init__(self):
        # Initialize OpenSMILE with eGeMAPS feature set
        # These are the 25 LLD: F0, loudness, jitter, shimmer, HNR,
        # formants (F1-F3 frequency/bandwidth), MFCCs 1-4, spectral features
        self.smile = opensmile.Smile(
            feature_set=opensmile.FeatureSet.eGeMAPSv02,
            feature_level=opensmile.FeatureLevel.LowLevelDescriptors,
        )
        self.num_features = self.smile.num_features  # 25
        print(f"  OpenSMILE initialized: {self.num_features} features")

        # Audio buffer for streaming
        self.buffer = deque(maxlen=8192)
        self.last_features = None
        self.frame_count = 0

    def feed_audio(self, audio_chunk: np.ndarray):
        """Feed an audio chunk into the buffer."""
        self.buffer.extend(audio_chunk.tolist())

    def extract(self) -> dict | None:
        """Extract features from buffered audio. Returns feature dict or None."""
        if len(self.buffer) < FRAME_SIZE:
            return None

        # Extract a frame's worth of audio
        frame = np.array(list(self.buffer)[:FRAME_SIZE], dtype=np.float32)

        # OpenSMILE expects a waveform array with shape (n_samples,) or (1, n_samples)
        try:
            result = self.smile.process_signal(frame, SAMPLE_RATE)
            self.frame_count += 1
            return self._parse_features(result)
        except Exception as e:
            print(f"  OpenSMILE error: {e}")
            return None

    def clear(self):
        """Clear audio buffer."""
        self.buffer.clear()

    def _parse_features(self, result) -> dict:
        """Parse OpenSMILE DataFrame into a clean feature dict."""
        features = {}

        if result is None or len(result) == 0:
            return features

        # Get the single row of features
        row = result.iloc[0] if hasattr(result, 'iloc') else result[0]

        # Map OpenSMILE column names to our feature keys
        # eGeMAPS v02 verified column names from live ARM64 test:
        feature_cols = {
            'F0semitoneFrom27.5Hz_sma3nz': 'f0_semitones',  # F0 in semitones rel. 27.5Hz
            'Loudness_sma3': 'loudness',                     # RMS loudness
            'jitterLocal_sma3nz': 'jitter',                  # Vocal jitter
            'shimmerLocaldB_sma3nz': 'shimmer',              # Vocal shimmer
            'HNRdBACF_sma3nz': 'hnr',                       # Harmonics-to-Noise Ratio
            'F1frequency_sma3nz': 'f1_freq',                 # F1 formant (vowel openness)
            'F1bandwidth_sma3nz': 'f1_bw',                   # F1 bandwidth
            'F2frequency_sma3nz': 'f2_freq',                 # F2 formant (vowel frontness)
            'F2bandwidth_sma3nz': 'f2_bw',                   # F2 bandwidth
            'F3frequency_sma3nz': 'f3_freq',                 # F3 formant
            'F3bandwidth_sma3nz': 'f3_bw',                   # F3 bandwidth
            'mfcc1_sma3': 'mfcc_1',                          # MFCC 1 (spectral shape)
            'mfcc2_sma3': 'mfcc_2',                          # MFCC 2 (timbre)
            'mfcc3_sma3': 'mfcc_3',                          # MFCC 3
            'mfcc4_sma3': 'mfcc_4',                          # MFCC 4
            'slope0-500_sma3': 'slope_0_500',                # Spectral slope 0-500Hz
            'slope500-1500_sma3': 'slope_500_1500',           # Spectral slope 500-1500Hz
            'alphaRatio_sma3': 'alpha_ratio',                 # Energy ratio
            'hammarbergIndex_sma3': 'hammarberg',             # Spectral balance
            'spectralFlux_sma3': 'spectral_flux',             # Spectral change rate
        }

        for col, key in feature_cols.items():
            try:
                val = row[col]
                if isinstance(val, (int, float)) and not math.isnan(val):
                    features[key] = round(float(val), 4)
            except (KeyError, TypeError, IndexError):
                pass

        self.last_features = features
        return features

    def features_to_midi_cc(self, features: dict) -> dict:
        """Map OpenSMILE voice features to MIDI CC values."""
        cc = {}

        # F0 → Note + Pitch Bend
        # OpenSMILE returns F0 as semitones from 27.5Hz
        f0_semitones = features.get('f0_semitones')
        if f0_semitones and not math.isnan(f0_semitones) and f0_semitones > 0:
            f0_hz = 27.5 * (2 ** (f0_semitones / 12))
            midi_note = 12 * math.log2(f0_hz / 440) + 69
            note_int = int(round(midi_note))
            cents = int((midi_note - note_int) * 100)
            cc['note'] = max(0, min(MIDI_MAX, note_int))
            cc['pitch_bend'] = max(-8192, min(8191, cents * 82))  # MIDI pitch bend 14-bit
            cc['note_name'] = self._midi_name(note_int)
        else:
            cc['note'] = 0
            cc['pitch_bend'] = 0

        # Loudness → Velocity + CC#7 (Volume)
        loudness = features.get('loudness', 0)
        cc['velocity'] = max(0, min(MIDI_MAX, int(loudness * 20)))
        cc['cc_7'] = max(0, min(MIDI_MAX, int(loudness * 40)))

        # Jitter → CC#16 (vocal roughness / distortion)
        jitter = features.get('jitter', 0)
        cc['cc_16'] = max(0, min(MIDI_MAX, int(jitter * 2000)))

        # Shimmer → CC#17 (tremolo depth)
        shimmer = features.get('shimmer', 0)
        cc['cc_17'] = max(0, min(MIDI_MAX, int(shimmer * 500)))

        # HNR → CC#2 (Breath control — inverted: low HNR = more breathy = higher CC)
        hnr = features.get('hnr', 30)
        cc['cc_2'] = max(0, min(MIDI_MAX, int(max(0, 30 - hnr) * 4)))

        # F1 (vowel openness) → CC#74 (Filter cutoff)
        f1 = features.get('f1_freq', 500)
        cc['cc_74'] = max(0, min(MIDI_MAX, int((f1 - 200) / 8)))

        # F2 (vowel frontness) → CC#71 (Resonance)
        f2 = features.get('f2_freq', 1500)
        cc['cc_71'] = max(0, min(MIDI_MAX, int((f2 - 500) / 15)))

        # F3 (vowel rounding) → CC#91 (Reverb send)
        f3 = features.get('f3_freq', 2500)
        cc['cc_91'] = max(0, min(MIDI_MAX, int((f3 - 1500) / 15)))

        # MFCC 1 (spectral shape) → CC#74 modifier
        mfcc1 = features.get('mfcc_1', 0)
        cc['cc_12'] = max(0, min(MIDI_MAX, int((mfcc1 + 20) * 3)))

        # Spectral slope 0-500Hz → CC#75 (Brightness)
        slope = features.get('slope_0_500', 0)
        cc['cc_75'] = max(0, min(MIDI_MAX, int((slope + 0.5) * 100)))

        # Alpha ratio → CC#76 (Energy balance)
        alpha = features.get('alpha_ratio', 0)
        cc['cc_76'] = max(0, min(MIDI_MAX, int((alpha + 0.5) * 60)))

        # Hammarberg index → CC#77
        hamm = features.get('hammarberg', 0)
        cc['cc_77'] = max(0, min(MIDI_MAX, int(hamm * 100)))

        # Spectral flux → CC#78 (Change rate)
        flux = features.get('spectral_flux', 0)
        cc['cc_78'] = max(0, min(MIDI_MAX, int(flux * 2000)))

        # Ternary classification from voice quality
        cc['trit'] = self._classify_trit(cc)
        cc['opensmile_features'] = list(features.keys())

        return cc

    def _midi_name(self, note: int) -> str:
        names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        return f"{names[note % 12]}{note // 12 - 1}"

    def _classify_trit(self, cc: dict) -> int:
        """Ternary classification from voice quality features.
        -1: Reject (quiet, breathy, unstable)
         0: Abstain (neutral, medium quality)
        +1: Approve (strong, clear, stable)
        """
        # Strong voice: high velocity, low jitter, stable pitch
        if cc.get('velocity', 0) > 60 and cc.get('cc_16', 127) < 40 and cc.get('note', 0) > 0:
            return 1
        # Weak voice: quiet, noisy, or silence
        if cc.get('velocity', 0) < 20 or cc.get('note', 0) == 0:
            return -1
        # Neutral
        return 0


# ─── Audio Decoder ───
class AudioDecoder:
    """Decode various audio formats from WebSocket messages."""

    @staticmethod
    def decode_pcm16(data: bytes) -> np.ndarray:
        """Decode 16-bit PCM audio to float32 [-1, 1]."""
        samples = np.frombuffer(data, dtype=np.int16)
        return samples.astype(np.float32) / 32768.0

    @staticmethod
    def decode_float32(data: bytes) -> np.ndarray:
        """Decode float32 audio bytes."""
        return np.frombuffer(data, dtype=np.float32)

    @staticmethod
    def resample(audio: np.ndarray, orig_rate: int, target_rate: int = SAMPLE_RATE) -> np.ndarray:
        """Resample audio to target sample rate."""
        if orig_rate != target_rate:
            return librosa.resample(audio, orig_rate=orig_rate, target_rate=target_rate)
        return audio


# ─── WebSocket Server ───
class OpenSmileBridge:
    """WebSocket server that receives audio and outputs enriched MIDI CC."""

    def __init__(self):
        self.extractor = OpenSmileExtractor()
        self.decoder = AudioDecoder()
        self.ghost_ws = None
        self.clients = set()
        self.running = False

    async def connect_to_ghost(self):
        """Connect to the Ghost Track Bridge for downstream processing."""
        while self.running:
            try:
                self.ghost_ws = await websockets.connect(GHOST_BRIDGE_URL)
                print(f"  Connected to Ghost Track Bridge at {GHOST_BRIDGE_URL}")
                return
            except (ConnectionRefusedError, websockets.exceptions.WebSocketException) as e:
                print(f"  Ghost Bridge not available: {e}")
                await asyncio.sleep(3)

    async def send_to_ghost(self, data: dict):
        """Send enriched MIDI CC to Ghost Track Bridge."""
        if self.ghost_ws and self.ghost_ws.open:
            try:
                await self.ghost_ws.send(json.dumps({
                    'type': 'midi',
                    'note': data.get('note', 60),
                    'velocity': data.get('velocity', 0),
                    'trit': data.get('trit', 0),
                    'bpm': data.get('bpm', 90),
                    'cc': data
                }))
            except Exception as e:
                print(f"  Ghost send error: {e}")
                self.ghost_ws = None

    async def handle_client(self, websocket):
        """Handle a single WebSocket client connection."""
        self.clients.add(websocket)
        client_id = id(websocket)
        print(f"  Client {client_id} connected")

        # Send welcome with feature set info
        await websocket.send(json.dumps({
            'type': 'welcome',
            'server': 'opensmile-bridge',
            'features': 25,
            'feature_names': [
                'F0', 'Loudness', 'Jitter', 'Shimmer', 'HNR',
                'F1-F3 freq/bw', 'MFCC 1-4',
                'Spectral Slope', 'Alpha Ratio', 'Flux', 'Hammarberg'
            ],
            'midi_mappings': {
                'cc_2': 'HNR → Breath Control',
                'cc_7': 'Loudness → Volume',
                'cc_16': 'Jitter → Distortion',
                'cc_17': 'Shimmer → Tremolo',
                'cc_71': 'F2 → Resonance',
                'cc_74': 'F1 → Cutoff',
                'cc_75': 'Spectral Slope → Brightness'
            }
        }))

        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    msg_type = data.get('type', '')

                    if msg_type == 'audio':
                        # Client sent audio data as JSON with base64 or raw values
                        samples = data.get('samples', [])
                        sample_rate = data.get('sample_rate', SAMPLE_RATE)

                        if samples:
                            audio = np.array(samples, dtype=np.float32)
                            audio = self.decoder.resample(audio, sample_rate)
                            self.extractor.feed_audio(audio)

                            # Extract features
                            features = self.extractor.extract()
                            if features:
                                cc = self.extractor.features_to_midi_cc(features)

                                # Send enriched MIDI back to client
                                await websocket.send(json.dumps({
                                    'type': 'midi',
                                    'features': features,
                                    'cc': cc
                                }))

                                # Forward to Ghost Track Bridge
                                await self.send_to_ghost(cc)

                    elif msg_type == 'ping':
                        await websocket.send(json.dumps({'type': 'pong', 'time': time.time()}))

                    elif msg_type == 'config':
                        # Accept configuration from client
                        pass

                except json.JSONDecodeError:
                    # Maybe raw binary audio?
                    pass
                except Exception as e:
                    print(f"  Client {client_id} message error: {e}")

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.discard(websocket)
            print(f"  Client {client_id} disconnected")


    async def start(self):
        """Start the OpenSMILE Bridge server."""
        self.running = True
        print(f"\n╔══════════════════════════════════════════╗")
        print(f"║   🎤 OpenSMILE Bridge v0.1.0            ║")
        print(f"║   {time.strftime('%Y-%m-%d %H:%M:%S')} UTC           ║")
        print(f"║                                        ║")
        print(f"║   WebSocket  :{OPEN_SMILE_PORT}                    ║")
        print(f"║   Ghost link :{GHOST_BRIDGE_URL}    ║")
        print(f"║   Features   :{self.extractor.num_features} (eGeMAPS v02)           ║")
        print(f"║   Frame size :{FRAME_SIZE} / hop {HOP_SIZE}             ║")
        print(f"╚══════════════════════════════════════════╝")

        # Connect to Ghost Track Bridge
        await self.connect_to_ghost()

        # Start WebSocket server
        async with websockets.serve(
            self.handle_client,
            "0.0.0.0",
            OPEN_SMILE_PORT,
            ping_interval=30,
            ping_timeout=10
        ):
            print(f"  Listening on ws://0.0.0.0:{OPEN_SMILE_PORT}")
            await asyncio.Future()  # Run forever


# ─── Entry Point ───
if __name__ == "__main__":
    bridge = OpenSmileBridge()
    try:
        asyncio.run(bridge.start())
    except KeyboardInterrupt:
        print("\n  Shutting down...")
