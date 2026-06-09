"""
Telescope Console — Bridge Client

Connects to the OpenSMILE bridge WebSocket, receives real-time
features, and forwards them to the Telescope WebSocket clients.
"""

import asyncio
import json
import logging
import time
from typing import Callable, Optional, Dict, Any
import numpy as np

logger = logging.getLogger("telescope.bridge")

BRIDGE_WS_URL = "ws://localhost:8765"
RECONNECT_DELAY = 3.0


class BridgeClient:
    """
    Connects to the running OpenSMILE bridge and relays features.
    Auto-reconnects on disconnect.
    """

    def __init__(self, on_features: Optional[Callable] = None):
        self.ws = None
        self.on_features = on_features
        self.running = False
        self.frames_received = 0
        self.last_features: Optional[Dict] = None
        self.connected = False
        self._reconnect_task = None

    async def connect(self):
        """Start the connection loop."""
        self.running = True
        self._reconnect_task = asyncio.create_task(self._connection_loop())

    async def _connection_loop(self):
        """Maintain connection, reconnect on failure."""
        import websockets

        while self.running:
            try:
                logger.info(f"Connecting to bridge at {BRIDGE_WS_URL}...")
                async with websockets.connect(BRIDGE_WS_URL) as ws:
                    self.ws = ws
                    self.connected = True
                    logger.info("Connected to OpenSMILE bridge")

                    # Send a heartbeat ping every 10s
                    async def heartbeat():
                        while self.running:
                            await asyncio.sleep(10)
                            try:
                                await ws.ping()
                            except Exception:
                                break

                    asyncio.create_task(heartbeat())

                    # Receive features continuously
                    async for message in ws:
                        data = json.loads(message)
                        if data.get("type") == "features":
                            self.frames_received += 1
                            self.last_features = data.get("data")
                            if self.on_features:
                                await self.on_features(self.last_features)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Bridge connection error: {e}")
                self.connected = False
                self.ws = None

            if self.running:
                logger.info(f"Reconnecting in {RECONNECT_DELAY}s...")
                await asyncio.sleep(RECONNECT_DELAY)

    async def send_audio(self, audio: np.ndarray):
        """Send audio data to the bridge for processing."""
        if self.ws and self.connected:
            try:
                await self.ws.send(audio.tobytes())
                return True
            except Exception as e:
                logger.warning(f"Failed to send audio: {e}")
        return False

    async def disconnect(self):
        """Stop the connection loop."""
        self.running = False
        if self._reconnect_task:
            self._reconnect_task.cancel()
            try:
                await self._reconnect_task
            except asyncio.CancelledError:
                pass
        self.connected = False
        self.ws = None

    def get_status(self) -> Dict[str, Any]:
        """Return current connection status."""
        return {
            "connected": self.connected,
            "frames_received": self.frames_received,
            "last_features": self.last_features,
        }
