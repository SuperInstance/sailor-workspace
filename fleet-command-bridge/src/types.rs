//! Shared types for the Fleet Command Bridge.
//!
//! These types define the JSON-RPC request/response shapes and all
//! domain models that flow between the frontend and backends.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Generic JSON-RPC Types ─────────────────────────────────────────

/// JSON-RPC 2.0 request from client.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    #[serde(default)]
    pub id: Option<serde_json::Value>,
    pub method: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

/// JSON-RPC 2.0 response to client.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcErrorValue>,
}

/// JSON-RPC 2.0 error value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcErrorValue {
    pub code: i64,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

impl JsonRpcResponse {
    pub fn ok(id: Option<serde_json::Value>, result: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: Option<serde_json::Value>, code: i64, message: &str) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(RpcErrorValue {
                code,
                message: message.to_string(),
                data: None,
            }),
        }
    }

    pub fn error_with_data(
        id: Option<serde_json::Value>,
        code: i64,
        message: &str,
        data: serde_json::Value,
    ) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(RpcErrorValue {
                code,
                message: message.to_string(),
                data: Some(data),
            }),
        }
    }

    /// Create a push notification (no id field).
    pub fn push(method: &str, params: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            // For push events, we include the method in a custom manner
            // or the caller wraps it differently.
            id: None,
            result: None,
            error: None,
        }
        .with_meta("method", method, params)
    }

    fn with_meta(mut self, key: &str, value: &str, params: serde_json::Value) -> Self {
        // We store method in the result envelope for push events
        // The actual serialization flattens at the WS level
        if let Some(ref mut r) = self.result {
            if let Some(obj) = r.as_object_mut() {
                obj.insert(key.to_string(), serde_json::Value::String(value.to_string()));
                obj.insert("params".to_string(), params);
            }
        } else {
            let mut obj = serde_json::Map::new();
            obj.insert(
                key.to_string(),
                serde_json::Value::String(value.to_string()),
            );
            obj.insert("params".to_string(), params);
            self.result = Some(serde_json::Value::Object(obj));
        }
        self
    }
}

// ── Error Codes ────────────────────────────────────────────────────

pub const ERR_PARSE: i64 = -32700;
pub const ERR_INVALID_REQUEST: i64 = -32600;
pub const ERR_METHOD_NOT_FOUND: i64 = -32601;
pub const ERR_INVALID_PARAMS: i64 = -32602;
pub const ERR_INTERNAL: i64 = -32603;
pub const ERR_BACKEND_UNAVAILABLE: i64 = -32000;
pub const ERR_NOT_AUTHENTICATED: i64 = -32001;
pub const ERR_RATE_LIMITED: i64 = -32002;
pub const ERR_COMMAND_REJECTED: i64 = -32003;

// ── Fleet Domain Types ─────────────────────────────────────────────

/// Bridge backend connection state.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum BackendState {
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "error")]
    Error,
}

impl Default for BackendState {
    fn default() -> Self {
        Self::Disconnected
    }
}

/// Backend health summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendHealth {
    pub status: BackendState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reflex_count: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_log_count: Option<i64>,
}

/// Fleet status returned by `fleet.status`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FleetStatus {
    pub bridge_state: String,
    pub agent_count: usize,
    pub active_reflexes: usize,
    pub room_count: usize,
    pub tile_count: usize,
    pub voxel_world_tick: u64,
    pub backend_health: HashMap<String, BackendHealth>,
}

/// Ping response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pong {
    pub pong: bool,
    pub server_time: i64,
    pub fleet_version: String,
    pub uptime_secs: u64,
    pub backends: HashMap<String, BackendState>,
}

// ── Reflex Domain Types ────────────────────────────────────────────

/// Summary of a reflex for list views.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflexSummary {
    pub id: String,
    pub intent: String,
    pub action: String,
    pub confidence: f64,
    pub invoke_count: i64,
    pub match_type: String,
    pub last_invoked: String,
}

/// Full reflex detail.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflexDetail {
    pub id: String,
    pub intent: String,
    pub action: String,
    pub confidence: f64,
    pub invoke_count: i64,
    pub last_invoked: String,
    pub created_at: String,
    pub match_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub embedding_sample: Option<Vec<f32>>,
}

/// Reflex match result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflexMatchResult {
    pub match_type: String,
    pub similarity: f32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reflex: Option<ReflexSummary>,
}

/// Execution result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflexExecution {
    pub execution_id: String,
    pub output: String,
    pub latency_ms: i64,
    pub confidence: f64,
    pub match_type: String,
    pub reflex_id: String,
}

/// Teach result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeachResult {
    pub reflex_id: String,
    pub intent: String,
    pub confidence: f64,
}

/// Action log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionLogEntry {
    pub id: String,
    pub input: String,
    pub output: String,
    pub latency_ms: i64,
    pub confidence: f64,
    pub timestamp: String,
}

// ── Voxel / Temporal World Domain Types ────────────────────────────

/// Temporal world status.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldStatus {
    pub tick: u64,
    pub tick_rate: f64,
    pub elapsed_seconds: f64,
    pub semantics: String,
    pub event_voxel_count: usize,
    pub is_temporal: bool,
}

/// Voxel event in 4D space.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoxelEvent {
    pub event_type: String,
    pub x: i64,
    pub y: i64,
    pub z: i64,
    pub w: u64,
    pub block_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
}

/// A voxel region response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoxelRegion {
    pub region: serde_json::Value,
    pub event_voxels: Vec<VoxelEvent>,
}

// ── Room & Tile Domain Types ───────────────────────────────────────

/// Summary of a room.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomSummary {
    pub scope: String,
    pub tile_count: usize,
    pub agent_count: usize,
    pub is_frozen: bool,
    pub created_at: String,
}

/// Full room detail.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomDetail {
    pub scope: String,
    pub tile_count: usize,
    pub agent_count: usize,
    pub is_frozen: bool,
    pub created_at: String,
    pub tiles: Vec<TileDetail>,
    pub agents: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

/// Tile detail.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileDetail {
    pub id: String,
    pub presets: Vec<String>,
    pub required_agents: Vec<String>,
    pub capabilities: TileCapabilities,
    #[serde(default)]
    pub active_agents: Vec<String>,
}

/// Tile capabilities.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TileCapabilities {
    #[serde(default = "default_true")]
    pub host_agents: bool,
    #[serde(default)]
    pub temporal: bool,
    #[serde(default = "default_true")]
    pub persistent: bool,
    #[serde(default)]
    pub emit_events: bool,
}

fn default_true() -> bool {
    true
}

// ── Internal State Types ───────────────────────────────────────────

/// In-memory room representation for the bridge.
#[derive(Debug, Clone)]
pub struct BridgeRoom {
    pub scope: String,
    pub tiles: Vec<BridgeTile>,
    pub agents: Vec<String>,
    pub frozen_context: Vec<u8>,
    pub metadata: HashMap<String, String>,
    pub created_at: i64,
}

/// In-memory tile representation.
#[derive(Debug, Clone)]
pub struct BridgeTile {
    pub id: String,
    pub presets: Vec<String>,
    pub required_agents: Vec<String>,
    pub capabilities: TileCapabilities,
    pub active_agents: Vec<String>,
}

// ── In-memory Reflex Store ─────────────────────────────────────────

/// A stored reflex in the bridge's local cache.
#[derive(Debug, Clone)]
pub struct StoredReflex {
    pub id: String,
    pub intent: String,
    pub action: String,
    pub confidence: f64,
    pub invoke_count: i64,
    pub last_invoked: String,
    pub created_at: String,
    pub match_type: String,
    pub embedding: Vec<f32>,
}

impl StoredReflex {
    pub fn summary(&self) -> ReflexSummary {
        ReflexSummary {
            id: self.id.clone(),
            intent: self.intent.clone(),
            action: self.action.clone(),
            confidence: self.confidence,
            invoke_count: self.invoke_count,
            match_type: self.match_type.clone(),
            last_invoked: self.last_invoked.clone(),
        }
    }

    pub fn detail(&self) -> ReflexDetail {
        let sample = if self.embedding.len() > 8 {
            Some(self.embedding[..8].to_vec())
        } else {
            None
        };
        ReflexDetail {
            id: self.id.clone(),
            intent: self.intent.clone(),
            action: self.action.clone(),
            confidence: self.confidence,
            invoke_count: self.invoke_count,
            last_invoked: self.last_invoked.clone(),
            created_at: self.created_at.clone(),
            match_type: self.match_type.clone(),
            embedding_sample: sample,
        }
    }
}

// ── Action Log Store ───────────────────────────────────────────────

/// Stored action log entry.
#[derive(Debug, Clone)]
pub struct StoredActionLog {
    pub id: String,
    pub reflex_id: String,
    pub input: String,
    pub output: String,
    pub latency_ms: i64,
    pub confidence: f64,
    pub timestamp: String,
}

impl StoredActionLog {
    pub fn entry(&self) -> ActionLogEntry {
        ActionLogEntry {
            id: self.id.clone(),
            input: self.input.clone(),
            output: self.output.clone(),
            latency_ms: self.latency_ms,
            confidence: self.confidence,
            timestamp: self.timestamp.clone(),
        }
    }
}
