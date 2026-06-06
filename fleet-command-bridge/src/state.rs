//! Shared application state for the Fleet Command Bridge.
//!
//! Manages connections to backends, in-memory model state,
//! and session tracking.

use crate::types::*;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{Mutex, broadcast};

/// Bridges the Sensation → Abstraction pipeline.
///
/// The bridge maintains its own in-memory model of the fleet state,
/// synchronizing with pincher and polychora backends as available.
pub struct BridgeState {
    /// When the bridge started.
    pub started_at: Instant,

    // ── Backend connections ─────────────────────────────────────────
    /// Path to the pincher-core UDS RPC socket.
    pub pincher_socket_path: Option<String>,
    /// Connection state to pincher.
    pub pincher_state: BackendState,
    /// Connection state to polychora.
    pub polychora_state: BackendState,
    /// Timestamp of last successful pincher RPC.
    pub last_pincher_ping: i64,
    /// Timestamp of last successful polychora ping.
    pub last_polychora_ping: i64,

    // ── In-memory state ─────────────────────────────────────────────
    /// Reflex cache (populated from pincher).
    pub reflexes: Vec<StoredReflex>,
    /// Action log (populated from pincher or bridge-recorded).
    pub action_logs: Vec<StoredActionLog>,
    /// Room state managed by the bridge.
    pub rooms: Vec<BridgeRoom>,
    /// Temporal world state.
    pub temporal_world: TemporalWorldState,

    // ── Subscriptions ───────────────────────────────────────────────
    /// Broadcast channel for push events to connected clients.
    pub event_tx: broadcast::Sender<serde_json::Value>,

    // ── Version info ────────────────────────────────────────────────
    pub fleet_version: String,
}

/// Temporal world state maintained by the bridge.
#[derive(Debug, Clone)]
pub struct TemporalWorldState {
    pub tick: u64,
    pub tick_rate: f64,
    pub elapsed_seconds: f64,
    pub semantics: String,
    pub is_temporal: bool,
    pub event_voxels: Vec<VoxelEvent>,
}

impl TemporalWorldState {
    fn new() -> Self {
        Self {
            tick: 0,
            tick_rate: 20.0,
            elapsed_seconds: 0.0,
            semantics: "temporal".to_string(),
            is_temporal: true,
            event_voxels: Vec::new(),
        }
    }

    fn advance(&mut self, dt: f64) {
        self.elapsed_seconds += dt;
        self.tick = (self.elapsed_seconds * self.tick_rate) as u64;
    }
}

/// Shared bridge state wrapped in Arc<Mutex<>>.
pub type SharedBridgeState = Arc<Mutex<BridgeState>>;

impl BridgeState {
    /// Create a new bridge state with default values.
    pub fn new(event_tx: broadcast::Sender<serde_json::Value>) -> Self {
        // Seed some example reflexes so the frontend has data to display
        let reflexes = seed_example_reflexes();
        let rooms = seed_example_rooms();
        let action_logs = seed_example_logs(&reflexes);

        Self {
            started_at: Instant::now(),
            pincher_socket_path: None,
            pincher_state: BackendState::Disconnected,
            polychora_state: BackendState::Disconnected,
            last_pincher_ping: 0,
            last_polychora_ping: 0,
            reflexes,
            action_logs,
            rooms,
            temporal_world: TemporalWorldState::new(),
            event_tx,
            fleet_version: "1.0.0".to_string(),
        }
    }

    /// Record a reflex execution and broadcast the event.
    pub async fn record_execution(
        &mut self,
        execution: ReflexExecution,
    ) {
        let log_entry = StoredActionLog {
            id: execution.execution_id.clone(),
            reflex_id: execution.reflex_id.clone(),
            input: execution.output.clone(),
            output: execution.output.clone(),
            latency_ms: execution.latency_ms,
            confidence: execution.confidence,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        self.action_logs.push(log_entry);

        // Keep log bounded
        if self.action_logs.len() > 1000 {
            self.action_logs.remove(0);
        }

        // Update invoke count in reflex cache
        for reflex in &mut self.reflexes {
            if reflex.id == execution.reflex_id {
                reflex.invoke_count += 1;
                reflex.last_invoked = chrono::Utc::now().to_rfc3339();
                break;
            }
        }

        // Broadcast event
        if serde_json::to_value(&execution).is_ok() {
            let push = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "reflex.executed",
                "params": {
                    "reflex_id": execution.reflex_id,
                    "intent": "",
                    "output_snippet": execution.output.chars().take(100).collect::<String>(),
                    "latency_ms": execution.latency_ms
                }
            });
            let _ = self.event_tx.send(push);
        }
    }

    /// Get a summary of backend health.
    pub fn backend_health(&self) -> HashMap<String, BackendHealth> {
        let mut h = HashMap::new();
        h.insert(
            "pincher".to_string(),
            BackendHealth {
                status: self.pincher_state,
                reflex_count: Some(self.reflexes.len() as i64),
                action_log_count: Some(self.action_logs.len() as i64),
            },
        );
        h.insert(
            "polychora".to_string(),
            BackendHealth {
                status: self.polychora_state,
                reflex_count: None,
                action_log_count: None,
            },
        );
        h
    }

    /// Get backend state map for ping response.
    pub fn backend_states(&self) -> HashMap<String, BackendState> {
        let mut h = HashMap::new();
        h.insert("pincher".to_string(), self.pincher_state);
        h.insert("polychora".to_string(), self.polychora_state);
        h
    }
}

// ── Seeded Example Data ────────────────────────────────────────────

fn seed_example_reflexes() -> Vec<StoredReflex> {
    let now = chrono::Utc::now().to_rfc3339();
    vec![
        StoredReflex {
            id: "reflex-sys-001".to_string(),
            intent: "system.info".to_string(),
            action: "builtin: system info".to_string(),
            confidence: 0.97,
            invoke_count: 42,
            last_invoked: now.clone(),
            created_at: now.clone(),
            match_type: "builtin".to_string(),
            embedding: vec![0.1, -0.2, 0.3, -0.4, 0.5, -0.6, 0.7, -0.8],
        },
        StoredReflex {
            id: "reflex-fs-002".to_string(),
            intent: "file.read".to_string(),
            action: "builtin: file read".to_string(),
            confidence: 0.88,
            invoke_count: 15,
            last_invoked: now.clone(),
            created_at: now.clone(),
            match_type: "builtin".to_string(),
            embedding: vec![-0.1, 0.2, -0.3, 0.4, -0.5, 0.6, -0.7, 0.8],
        },
        StoredReflex {
            id: "reflex-proc-003".to_string(),
            intent: "process.list".to_string(),
            action: "builtin: process list".to_string(),
            confidence: 0.92,
            invoke_count: 28,
            last_invoked: now.clone(),
            created_at: now.clone(),
            match_type: "builtin".to_string(),
            embedding: vec![0.2, 0.1, -0.5, 0.3, 0.0, -0.2, 0.4, -0.3],
        },
        StoredReflex {
            id: "reflex-dkr-004".to_string(),
            intent: "docker.ps".to_string(),
            action: "builtin: docker ps".to_string(),
            confidence: 0.75,
            invoke_count: 8,
            last_invoked: now.clone(),
            created_at: now.clone(),
            match_type: "exact".to_string(),
            embedding: vec![0.5, -0.1, 0.2, 0.4, -0.3, 0.1, -0.6, 0.0],
        },
        StoredReflex {
            id: "reflex-env-005".to_string(),
            intent: "env.get".to_string(),
            action: "builtin: env get".to_string(),
            confidence: 0.91,
            invoke_count: 55,
            last_invoked: now.clone(),
            created_at: now.clone(),
            match_type: "builtin".to_string(),
            embedding: vec![-0.3, 0.5, 0.1, -0.2, 0.7, -0.4, 0.0, 0.3],
        },
    ]
}

fn seed_example_logs(reflexes: &[StoredReflex]) -> Vec<StoredActionLog> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut logs = Vec::new();
    for (i, reflex) in reflexes.iter().enumerate() {
        logs.push(StoredActionLog {
            id: format!("log-{:03}", i + 1),
            reflex_id: reflex.id.clone(),
            input: format!("run {}", reflex.intent),
            output: format!("[{}] executed successfully", reflex.intent),
            latency_ms: 10 + (i as i64 * 5),
            confidence: reflex.confidence,
            timestamp: now.clone(),
        });
    }
    logs
}

fn seed_example_rooms() -> Vec<BridgeRoom> {
    let now = chrono::Utc::now();
    let mut rooms = Vec::new();

    let main_room = BridgeRoom {
        scope: "workspace-main".to_string(),
        tiles: vec![
            BridgeTile {
                id: "tile-mon-001".to_string(),
                presets: vec!["monitoring".to_string(), "visual".to_string()],
                required_agents: vec!["agent-monitor".to_string()],
                capabilities: TileCapabilities {
                    host_agents: true,
                    temporal: false,
                    persistent: true,
                    emit_events: true,
                },
                active_agents: vec!["agent-monitor".to_string()],
            },
            BridgeTile {
                id: "tile-lab-002".to_string(),
                presets: vec!["laboratory".to_string(), "temporal".to_string()],
                required_agents: vec![],
                capabilities: TileCapabilities {
                    host_agents: true,
                    temporal: true,
                    persistent: true,
                    emit_events: false,
                },
                active_agents: vec!["agent-lab".to_string()],
            },
        ],
        agents: vec!["agent-monitor".to_string(), "agent-lab".to_string()],
        frozen_context: Vec::new(),
        metadata: {
            let mut m = HashMap::new();
            m.insert("created_by".to_string(), "developer-1".to_string());
            m.insert("purpose".to_string(), "Primary workspace".to_string());
            m
        },
        created_at: now.timestamp(),
    };
    rooms.push(main_room);

    let sandbox_room = BridgeRoom {
        scope: "sandbox-testing".to_string(),
        tiles: vec![BridgeTile {
            id: "tile-sbx-001".to_string(),
            presets: vec!["sandbox".to_string(), "isolated".to_string()],
            required_agents: vec![],
            capabilities: TileCapabilities {
                host_agents: true,
                temporal: false,
                persistent: false,
                emit_events: false,
            },
            active_agents: vec![],
        }],
        agents: vec![],
        frozen_context: Vec::new(),
        metadata: {
            let mut m = HashMap::new();
            m.insert("created_by".to_string(), "developer-1".to_string());
            m.insert("purpose".to_string(), "Isolated test environment".to_string());
            m
        },
        created_at: now.timestamp() - 3600,
    };
    rooms.push(sandbox_room);

    rooms
}
