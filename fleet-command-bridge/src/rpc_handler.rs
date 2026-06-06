//! JSON-RPC method handler for the Fleet Command Bridge.
//!
//! Dispatches incoming JSON-RPC requests to the appropriate handler
//! based on the method name, translating between frontend API calls
//! and backend interactions.

use crate::state::SharedBridgeState;
use crate::types::*;
use serde_json::Value;

/// Dispatch a JSON-RPC request and produce a response.
pub async fn handle_rpc(
    state: &SharedBridgeState,
    request: JsonRpcRequest,
) -> JsonRpcResponse {
    let id = request.id.clone();

    match request.method.as_str() {
        // ── Fleet Health ────────────────────────────────────────────
        "fleet.ping" => handle_fleet_ping(state, id, request.params).await,
        "fleet.status" => handle_fleet_status(state, id, request.params).await,
        "fleet.backend_status" => handle_fleet_backend_status(state, id, request.params).await,

        // ── Reflex System ───────────────────────────────────────────
        "reflex.list" => handle_reflex_list(state, id, request.params).await,
        "reflex.get" => handle_reflex_get(state, id, request.params).await,
        "reflex.match" => handle_reflex_match(state, id, request.params).await,
        "reflex.execute" => handle_reflex_execute(state, id, request.params).await,
        "reflex.teach" => handle_reflex_teach(state, id, request.params).await,
        "reflex.log" => handle_reflex_log(state, id, request.params).await,

        // ── Voxel / Temporal World ──────────────────────────────────
        "voxel.world_status" => handle_voxel_world_status(state, id, request.params).await,
        "voxel.get_region" => handle_voxel_get_region(state, id, request.params).await,

        // ── Room & Tile Management ──────────────────────────────────
        "room.list" => handle_room_list(state, id, request.params).await,
        "room.get" => handle_room_get(state, id, request.params).await,
        "room.create" => handle_room_create(state, id, request.params).await,
        "room.freeze" => handle_room_freeze(state, id, request.params, true).await,
        "room.unfreeze" => handle_room_freeze(state, id, request.params, false).await,
        "tile.add" => handle_tile_add(state, id, request.params).await,
        "tile.remove" => handle_tile_remove(state, id, request.params).await,

        _ => JsonRpcResponse::error(id, ERR_METHOD_NOT_FOUND, &format!("Method not found: {}", request.method)),
    }
}

// ── Fleet Health Handlers ──────────────────────────────────────────

async fn handle_fleet_ping(
    state: &SharedBridgeState,
    id: Option<Value>,
    _params: Option<Value>,
) -> JsonRpcResponse {
    let s = state.lock().await;
    let uptime = s.started_at.elapsed().as_secs();
    let backends = s.backend_states();

    let pong = Pong {
        pong: true,
        server_time: chrono::Utc::now().timestamp(),
        fleet_version: s.fleet_version.clone(),
        uptime_secs: uptime,
        backends,
    };

    JsonRpcResponse::ok(
        id,
        serde_json::to_value(pong).unwrap_or_default(),
    )
}

async fn handle_fleet_status(
    state: &SharedBridgeState,
    id: Option<Value>,
    _params: Option<Value>,
) -> JsonRpcResponse {
    let s = state.lock().await;
    let room_count = s.rooms.len();
    let tile_count: usize = s.rooms.iter().map(|r| r.tiles.len()).sum();
    let agent_count: usize = s.rooms.iter().map(|r| r.agents.len()).sum();

    let status = FleetStatus {
        bridge_state: "connected".to_string(),
        agent_count,
        active_reflexes: s.reflexes.len(),
        room_count,
        tile_count,
        voxel_world_tick: s.temporal_world.tick,
        backend_health: s.backend_health(),
    };

    JsonRpcResponse::ok(id, serde_json::to_value(status).unwrap_or_default())
}

async fn handle_fleet_backend_status(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let backend = params
        .as_ref()
        .and_then(|p| p.get("backend"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let s = state.lock().await;
    let health = s.backend_health();
    match health.get(&backend) {
        Some(h) => {
            let result = serde_json::json!({
                "backend": backend,
                "status": h.status,
                "details": {
                    "reflex_count": h.reflex_count,
                    "action_log_count": h.action_log_count,
                }
            });
            JsonRpcResponse::ok(id, result)
        }
        None => JsonRpcResponse::error(
            id,
            ERR_INVALID_PARAMS,
            &format!("Unknown backend: {}", backend),
        ),
    }
}

// ── Reflex System Handlers ─────────────────────────────────────────

async fn handle_reflex_list(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let limit = params
        .as_ref()
        .and_then(|p| p.get("limit"))
        .and_then(|v| v.as_i64())
        .unwrap_or(50) as usize;

    let offset = params
        .as_ref()
        .and_then(|p| p.get("offset"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as usize;

    let s = state.lock().await;
    let total = s.reflexes.len();

    let reflexes: Vec<ReflexSummary> = s
        .reflexes
        .iter()
        .skip(offset)
        .take(limit)
        .map(|r| r.summary())
        .collect();

    let result = serde_json::json!({
        "total": total,
        "reflexes": reflexes,
    });

    JsonRpcResponse::ok(id, result)
}

async fn handle_reflex_get(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let reflex_id = params
        .as_ref()
        .and_then(|p| p.get("reflex_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let s = state.lock().await;
    match s.reflexes.iter().find(|r| r.id == reflex_id) {
        Some(reflex) => JsonRpcResponse::ok(
            id,
            serde_json::to_value(reflex.detail()).unwrap_or_default(),
        ),
        None => JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Reflex not found: {}", reflex_id)),
    }
}

async fn handle_reflex_match(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let intent = params
        .as_ref()
        .and_then(|p| p.get("intent"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if intent.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "intent is required");
    }

    let s = state.lock().await;

    // Simple keyword matching as a stand-in for real vector embedding matching
    let intent_lower = intent.to_lowercase();
    let mut best_match: Option<(f32, &StoredReflex)> = None;

    for reflex in &s.reflexes {
        let reflex_intent = reflex.intent.to_lowercase();
        let reflex_action = reflex.action.to_lowercase();

        // Exact match
        if reflex_intent == intent_lower {
            let result = ReflexMatchResult {
                match_type: "exact".to_string(),
                similarity: 0.99,
                reflex: Some(reflex.summary()),
            };
            return JsonRpcResponse::ok(id, serde_json::to_value(result).unwrap_or_default());
        }

        // Compute a simple similarity score based on word overlap
        let intent_words: Vec<&str> = intent_lower.split_whitespace().collect();
        let reflex_words: Vec<&str> = reflex_intent
            .split('.')
            .chain(reflex_action.split_whitespace())
            .collect();

        let matches: usize = intent_words
            .iter()
            .filter(|w| reflex_words.iter().any(|rw| rw.contains(*w) || w.contains(rw)))
            .count();

        let score = if intent_words.is_empty() {
            0.0
        } else {
            matches as f32 / intent_words.len() as f32
        };

        if score > 0.0
            && best_match
                .map(|(best, _)| score > best)
                .unwrap_or(true)
        {
            best_match = Some((score, reflex));
        }
    }

    match best_match {
        Some((score, reflex)) => {
            let match_type = if score > 0.7 {
                "exact"
            } else if score > 0.3 {
                "similar"
            } else {
                "novel"
            };

            let result = ReflexMatchResult {
                match_type: match_type.to_string(),
                similarity: score,
                reflex: Some(reflex.summary()),
            };
            JsonRpcResponse::ok(id, serde_json::to_value(result).unwrap_or_default())
        }
        None => {
            let result = ReflexMatchResult {
                match_type: "novel".to_string(),
                similarity: 0.0,
                reflex: None,
            };
            JsonRpcResponse::ok(id, serde_json::to_value(result).unwrap_or_default())
        }
    }
}

async fn handle_reflex_execute(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let reflex_id = params
        .as_ref()
        .and_then(|p| p.get("reflex_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let _input = params
        .as_ref()
        .and_then(|p| p.get("input"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if reflex_id.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "reflex_id is required");
    }

    // Try to connect to pincher-core via UDS for execution
    let s = state.lock().await;
    let reflex = s.reflexes.iter().find(|r| r.id == reflex_id).cloned();
    drop(s);

    match reflex {
        Some(reflex) => {
            // Simulate execution
            let execution_id = uuid::Uuid::new_v4().to_string();
            let execution = ReflexExecution {
                execution_id: execution_id.clone(),
                output: format!("[{}] Executed: {}", reflex.intent, reflex.action),
                latency_ms: 15,
                confidence: reflex.confidence,
                match_type: reflex.match_type.clone(),
                reflex_id: reflex.id.clone(),
            };

            // Record in state and broadcast
            let mut s = state.lock().await;
            s.record_execution(execution.clone()).await;

            JsonRpcResponse::ok(id, serde_json::to_value(execution).unwrap_or_default())
        }
        None => JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Reflex not found: {}", reflex_id)),
    }
}

async fn handle_reflex_teach(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let intent = params
        .as_ref()
        .and_then(|p| p.get("intent"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let action = params
        .as_ref()
        .and_then(|p| p.get("action"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if intent.is_empty() || action.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "intent and action are required");
    }

    let reflex_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let new_reflex = StoredReflex {
        id: reflex_id.clone(),
        intent: intent.clone(),
        action: action.clone(),
        confidence: 0.5,
        invoke_count: 0,
        last_invoked: now.clone(),
        created_at: now.clone(),
        match_type: "exact".to_string(),
        embedding: vec![0.0; 8],
    };

    let mut s = state.lock().await;
    s.reflexes.push(new_reflex);

    let result = TeachResult {
        reflex_id,
        intent,
        confidence: 0.5,
    };

    // Broadcast reflex.taught event
    let push = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "reflex.taught",
        "params": {
            "reflex_id": result.reflex_id,
            "intent": result.intent,
        }
    });
    let _ = s.event_tx.send(push);

    JsonRpcResponse::ok(id, serde_json::to_value(result).unwrap_or_default())
}

async fn handle_reflex_log(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let reflex_id = params
        .as_ref()
        .and_then(|p| p.get("reflex_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let limit = params
        .as_ref()
        .and_then(|p| p.get("limit"))
        .and_then(|v| v.as_i64())
        .unwrap_or(10) as usize;

    let s = state.lock().await;
    let entries: Vec<ActionLogEntry> = s
        .action_logs
        .iter()
        .filter(|log| log.reflex_id == reflex_id)
        .rev()
        .take(limit)
        .map(|log| log.entry())
        .collect();

    let result = serde_json::json!({ "entries": entries });
    JsonRpcResponse::ok(id, result)
}

// ── Voxel / Temporal World Handlers ────────────────────────────────

async fn handle_voxel_world_status(
    state: &SharedBridgeState,
    id: Option<Value>,
    _params: Option<Value>,
) -> JsonRpcResponse {
    let s = state.lock().await;
    let world = &s.temporal_world;

    let status = WorldStatus {
        tick: world.tick,
        tick_rate: world.tick_rate,
        elapsed_seconds: world.elapsed_seconds,
        semantics: world.semantics.clone(),
        event_voxel_count: world.event_voxels.len(),
        is_temporal: world.is_temporal,
    };

    JsonRpcResponse::ok(id, serde_json::to_value(status).unwrap_or_default())
}

async fn handle_voxel_get_region(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let x = params
        .as_ref()
        .and_then(|p| p.get("x"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let y = params
        .as_ref()
        .and_then(|p| p.get("y"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let z = params
        .as_ref()
        .and_then(|p| p.get("z"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let w = params
        .as_ref()
        .and_then(|p| p.get("w"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as u64;

    let _radius = params
        .as_ref()
        .and_then(|p| p.get("radius"))
        .and_then(|v| v.as_i64())
        .unwrap_or(16);

    let s = state.lock().await;

    // Filter event voxels that fall within the requested region
    let event_voxels: Vec<VoxelEvent> = s
        .temporal_world
        .event_voxels
        .iter()
        .filter(|ev| ev.w >= w.saturating_sub(10) && ev.w <= w.saturating_add(10))
        .cloned()
        .collect();

    let region = VoxelRegion {
        region: serde_json::json!({
            "x": x,
            "y": y,
            "z": z,
            "w": w,
            "radius": _radius,
            "voxels": []
        }),
        event_voxels,
    };

    JsonRpcResponse::ok(id, serde_json::to_value(region).unwrap_or_default())
}

// ── Room & Tile Management Handlers ────────────────────────────────

async fn handle_room_list(
    state: &SharedBridgeState,
    id: Option<Value>,
    _params: Option<Value>,
) -> JsonRpcResponse {
    let s = state.lock().await;
    let now = chrono::Utc::now();

    let rooms: Vec<RoomSummary> = s
        .rooms
        .iter()
        .map(|r| {
            let created_at = chrono::DateTime::from_timestamp(r.created_at, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| now.to_rfc3339());
            RoomSummary {
                scope: r.scope.clone(),
                tile_count: r.tiles.len(),
                agent_count: r.agents.len(),
                is_frozen: !r.frozen_context.is_empty(),
                created_at,
            }
        })
        .collect();

    let result = serde_json::json!({ "rooms": rooms });
    JsonRpcResponse::ok(id, result)
}

async fn handle_room_get(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let scope = params
        .as_ref()
        .and_then(|p| p.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let s = state.lock().await;
    match s.rooms.iter().find(|r| r.scope == scope) {
        Some(room) => {
            let created_at = chrono::DateTime::from_timestamp(room.created_at, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

            let tiles: Vec<TileDetail> = room
                .tiles
                .iter()
                .map(|t| TileDetail {
                    id: t.id.clone(),
                    presets: t.presets.clone(),
                    required_agents: t.required_agents.clone(),
                    capabilities: t.capabilities.clone(),
                    active_agents: t.active_agents.clone(),
                })
                .collect();

            let detail = RoomDetail {
                scope: room.scope.clone(),
                tile_count: room.tiles.len(),
                agent_count: room.agents.len(),
                is_frozen: !room.frozen_context.is_empty(),
                created_at,
                tiles,
                agents: room.agents.clone(),
                metadata: Some(room.metadata.clone()),
            };

            JsonRpcResponse::ok(id, serde_json::to_value(detail).unwrap_or_default())
        }
        None => JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Room not found: {}", scope)),
    }
}

async fn handle_room_create(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let scope = params
        .as_ref()
        .and_then(|p| p.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if scope.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "scope is required");
    }

    let metadata = params
        .as_ref()
        .and_then(|p| p.get("metadata"))
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect::<std::collections::HashMap<String, String>>()
        })
        .unwrap_or_default();

    let mut s = state.lock().await;

    // Check for duplicate
    if s.rooms.iter().any(|r| r.scope == scope) {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Room '{}' already exists", scope));
    }

    s.rooms.push(BridgeRoom {
        scope: scope.clone(),
        tiles: Vec::new(),
        agents: Vec::new(),
        frozen_context: Vec::new(),
        metadata,
        created_at: chrono::Utc::now().timestamp(),
    });

    let result = serde_json::json!({
        "scope": scope,
        "created": true,
    });

    JsonRpcResponse::ok(id, result)
}

async fn handle_room_freeze(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
    freeze: bool,
) -> JsonRpcResponse {
    let scope = params
        .as_ref()
        .and_then(|p| p.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if scope.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "scope is required");
    }

    let mut s = state.lock().await;
    match s.rooms.iter_mut().find(|r| r.scope == scope) {
        Some(room) => {
            if freeze {
                let context = serde_json::json!({
                    "scope": room.scope,
                    "tile_count": room.tiles.len(),
                    "agent_count": room.agents.len(),
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                    "frozen": true,
                });
                room.frozen_context = serde_json::to_vec(&context).unwrap_or_default();
            } else {
                room.frozen_context = Vec::new();
            }

            let result = serde_json::json!({
                "scope": scope,
                "frozen": !room.frozen_context.is_empty(),
                "frozen_context_size": room.frozen_context.len(),
            });

            JsonRpcResponse::ok(id, result)
        }
        None => JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Room not found: {}", scope)),
    }
}

async fn handle_tile_add(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let scope = params
        .as_ref()
        .and_then(|p| p.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if scope.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "scope is required");
    }

    let presets: Vec<String> = params
        .as_ref()
        .and_then(|p| p.get("presets"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    // Parse capabilities from params or use defaults
    let caps = params
        .as_ref()
        .and_then(|p| p.get("capabilities"))
        .and_then(|v| serde_json::from_value::<TileCapabilities>(v.clone()).ok())
        .unwrap_or_default();

    let tile_id = uuid::Uuid::new_v4().to_string();

    let mut s = state.lock().await;
    match s.rooms.iter_mut().find(|r| r.scope == scope) {
        Some(room) => {
            room.tiles.push(BridgeTile {
                id: tile_id.clone(),
                presets,
                required_agents: Vec::new(),
                capabilities: caps,
                active_agents: Vec::new(),
            });

            let result = serde_json::json!({
                "tile_id": tile_id,
                "scope": scope,
                "added": true,
            });

            JsonRpcResponse::ok(id, result)
        }
        None => JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Room not found: {}", scope)),
    }
}

async fn handle_tile_remove(
    state: &SharedBridgeState,
    id: Option<Value>,
    params: Option<Value>,
) -> JsonRpcResponse {
    let scope = params
        .as_ref()
        .and_then(|p| p.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let tile_id = params
        .as_ref()
        .and_then(|p| p.get("tile_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if scope.is_empty() || tile_id.is_empty() {
        return JsonRpcResponse::error(id, ERR_INVALID_PARAMS, "scope and tile_id are required");
    }

    let mut s = state.lock().await;
    match s.rooms.iter_mut().find(|r| r.scope == scope) {
        Some(room) => {
            let before = room.tiles.len();
            room.tiles.retain(|t| t.id != tile_id);
            let removed = room.tiles.len() < before;

            let result = serde_json::json!({
                "scope": scope,
                "removed": removed,
            });

            JsonRpcResponse::ok(id, result)
        }
        None => JsonRpcResponse::error(id, ERR_INVALID_PARAMS, &format!("Room not found: {}", scope)),
    }
}
