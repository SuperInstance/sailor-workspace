"""
Telescope Console — FastAPI Backend Server

Serves the frontend, manages bridge connection,
broadcasts real-time pipeline state via WebSocket.
"""

import asyncio
import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from bridge_client import BridgeClient
from pipeline import PipelineState, PipelineStage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telescope")

# ── State ──────────────────────────────────────────────────────────
pipeline = PipelineState()
bridge = BridgeClient()
ws_clients: List[WebSocket] = []


# ── Broadcast ──────────────────────────────────────────────────────
async def broadcast(data: dict):
    """Send data to all connected WebSocket clients."""
    msg = json.dumps(data)
    dead = []
    for ws in ws_clients:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_clients.remove(ws)


async def on_bridge_features(features: dict):
    """Callback: bridge sent new features. Update state + broadcast."""
    pipeline.complete_stage(PipelineStage.FEATURE_EXTRACT, features)
    await broadcast({
        "type": "features",
        "data": features,
        "ws_clients": len(ws_clients),
        "pipeline": pipeline.to_dict(),
    })


async def on_bridge_connected():
    """Callback: bridge connected successfully."""
    await broadcast({
        "type": "bridge_connected",
        "ws_clients": len(ws_clients),
        "pipeline": pipeline.to_dict(),
    })
    logger.info("Bridge connected, broadcast to all clients")


bridge.on_features = on_bridge_features


# ── Lifespan ───────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await bridge.connect()
    logger.info("Telescope Console started")
    yield
    # Shutdown
    await bridge.disconnect()


app = FastAPI(title="Telescope Console", version="0.1.1", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── REST Endpoints ──────────────────────────────────────────────────
@app.get("/api/status")
async def get_status():
    """Full system status."""
    return {
        "pipeline": pipeline.to_dict(),
        "bridge": bridge.get_status(),
        "ws_clients": len(ws_clients),
    }


@app.post("/api/pipeline/reset")
async def reset_pipeline():
    """Reset pipeline to idle."""
    pipeline.reset()
    await broadcast({
        "type": "pipeline_reset",
        "pipeline": pipeline.to_dict(),
        "ws_clients": len(ws_clients),
    })
    return {"status": "ok"}


@app.post("/api/pipeline/run")
async def run_pipeline():
    """Trigger one-click pipeline run."""
    pipeline.reset()
    pipeline.started_at = time.time()
    pipeline.transition_to(PipelineStage.AUDIO_IN)
    await broadcast({
        "type": "pipeline_start",
        "pipeline": pipeline.to_dict(),
        "ws_clients": len(ws_clients),
    })
    return {"status": "started"}


# ── WebSocket ──────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    logger.info(f"WebSocket client connected ({len(ws_clients)} total)")

    # Send initial state
    await websocket.send_text(json.dumps({
        "type": "init",
        "pipeline": pipeline.to_dict(),
        "bridge": bridge.get_status(),
        "ws_clients": len(ws_clients),
    }))

    try:
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)

            if data.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "ws_clients": len(ws_clients),
                }))
            elif data.get("type") == "reset":
                pipeline.reset()
                await broadcast({
                    "type": "pipeline_reset",
                    "pipeline": pipeline.to_dict(),
                    "ws_clients": len(ws_clients),
                })
            elif data.get("type") == "run":
                pipeline.reset()
                pipeline.started_at = time.time()
                pipeline.transition_to(PipelineStage.AUDIO_IN)
                await broadcast({
                    "type": "pipeline_start",
                    "pipeline": pipeline.to_dict(),
                    "ws_clients": len(ws_clients),
                })

    except WebSocketDisconnect:
        ws_clients.remove(websocket)
        logger.info(f"WebSocket client disconnected ({len(ws_clients)} remaining)")


# ── Serve Frontend ─────────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


def main():
    uvicorn.run(app, host="0.0.0.0", port=9001, log_level="info")


if __name__ == "__main__":
    main()
