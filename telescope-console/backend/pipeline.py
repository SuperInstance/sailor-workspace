"""
Telescope Console — Pipeline Orchestration

The brain. Tracks what's connected, what's running, what's available.
"""

import time
import json
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum


class PipelineStage(str, Enum):
    """Ordered pipeline stages."""
    AUDIO_IN = "audio_in"
    SOURCE_SEP = "source_sep"
    FEATURE_EXTRACT = "feature_extract"
    PERSONA_PROFILE = "persona_profile"
    MIDI_MAP = "midi_map"
    C_TERNARY = "c_ternary"
    TTS_RENDER = "tts_render"
    OUTPUT = "output"


class StageStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class StageState:
    """State of a single pipeline stage."""
    status: StageStatus = StageStatus.IDLE
    last_update: float = 0.0
    error: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineState:
    """Full pipeline state machine."""
    stages: Dict[str, StageState] = field(default_factory=lambda: {
        s.value: StageState() for s in PipelineStage
    })
    active_stage: Optional[str] = None
    input_file: Optional[str] = None
    output_files: Dict[str, str] = field(default_factory=dict)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

    def transition_to(self, stage: PipelineStage):
        """Move pipeline to a new stage."""
        self.active_stage = stage.value
        self.stages[stage.value].status = StageStatus.RUNNING
        self.stages[stage.value].last_update = time.time()

    def complete_stage(self, stage: PipelineStage, data: Optional[Dict] = None):
        """Mark a stage as complete with optional output data."""
        s = self.stages[stage.value]
        s.status = StageStatus.COMPLETE
        s.last_update = time.time()
        if data:
            s.data = data

    def fail_stage(self, stage: PipelineStage, error: str):
        """Mark a stage as failed."""
        s = self.stages[stage.value]
        s.status = StageStatus.ERROR
        s.error = error
        s.last_update = time.time()

    def reset(self):
        """Reset all stages to idle."""
        for s in self.stages.values():
            s.status = StageStatus.IDLE
            s.error = None
            s.data = {}
            s.last_update = 0.0
        self.active_stage = None
        self.input_file = None
        self.output_files = {}
        self.started_at = None
        self.completed_at = None

    def to_dict(self) -> Dict:
        """Serialize for WebSocket broadcast."""
        return {
            "stages": {
                k: {
                    "status": v.status.value,
                    "error": v.error,
                    "last_update": v.last_update,
                }
                for k, v in self.stages.items()
            },
            "active_stage": self.active_stage,
            "input_file": self.input_file,
            "output_files": self.output_files,
        }


@dataclass
class BridgeState:
    """State of the connection to the OpenSMILE bridge."""
    connected: bool = False
    last_features: Optional[Dict] = None
    last_heartbeat: Optional[float] = None
    frames_processed: int = 0
    clients_connected: int = 0
    uptime: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "connected": self.connected,
            "last_features": self.last_features,
            "frames_processed": self.frames_processed,
            "clients_connected": self.clients_connected,
            "uptime": self.uptime,
        }
