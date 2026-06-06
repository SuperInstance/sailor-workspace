//! # Fleet Command Bridge
//!
//! The nervous system connecting kimi-swarm-frontend (React UI) to
//! pincher-core (reflex runtime) and polychora (temporal voxel world).
//!
//! ## Protocol
//! - **WebSocket** at `ws://localhost:9876/ws` for real-time JSON-RPC 2.0
//! - **HTTP** at `http://localhost:9876/health` for health checks
//!
//! ## Architecture
//! ```
//!  React UI ──WebSocket──► fleet-command-bridge ──UDS──► pincher-core
//!                              │                            │
//!                              └──── in-memory ──────────────┘
//!                                    │
//!                              ┌─────┴──────┐
//!                              │ polychora   │
//!                              │ rooms/tiles │
//!                              │ temporal    │
//!                              │ world       │
//!                              └─────────────┘
//! ```

mod rpc_handler;
mod state;
mod types;
mod ws;

use crate::state::BridgeState;
use crate::ws::handle_ws_connection;
use axum::extract::ws::WebSocketUpgrade;
use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use tracing::info;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "fleet_command_bridge=info,tower_http=info".into()),
        )
        .init();

    info!("╔══════════════════════════════════════════════════╗");
    info!("║   Fleet Command Bridge v0.1.0                  ║");
    info!("║   The Nervous System for kimi-swarm Frontend    ║");
    info!("╚══════════════════════════════════════════════════╝");

    // Create event broadcast channel
    let (event_tx, _) = broadcast::channel::<serde_json::Value>(256);

    // Create shared bridge state
    let bridge_state = Arc::new(Mutex::new(BridgeState::new(event_tx.clone())));

    // Build the router
    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/ws", get(ws_handler))
        .with_state(AppState {
            bridge: bridge_state.clone(),
            event_tx: event_tx.clone(),
        });

    // Apply CORS for development
    let app = app.layer(
        tower_http::cors::CorsLayer::permissive(),
    );

    let addr = "0.0.0.0:9876";
    info!("🌉 Bridge server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

// ── Shared Application State ───────────────────────────────────────

#[derive(Clone)]
struct AppState {
    bridge: Arc<Mutex<BridgeState>>,
    event_tx: broadcast::Sender<serde_json::Value>,
}

// ── HTTP Health Endpoint ───────────────────────────────────────────

async fn health_handler(State(state): State<AppState>) -> Json<serde_json::Value> {
    let s = state.bridge.lock().await;
    let uptime = s.started_at.elapsed().as_secs();

    Json(serde_json::json!({
        "status": "ok",
        "fleet_version": s.fleet_version,
        "uptime_secs": uptime,
        "pincher": s.pincher_state,
        "polychora": s.polychora_state,
        "reflex_count": s.reflexes.len(),
        "room_count": s.rooms.len(),
        "action_log_count": s.action_logs.len(),
        "temporal_tick": s.temporal_world.tick,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

// ── WebSocket Upgrade Handler ──────────────────────────────────────

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    info!("WebSocket upgrade requested");
    ws.on_upgrade(move |socket| {
        let bridge = state.bridge.clone();
        let event_rx = state.event_tx.subscribe();
        async move {
            handle_ws_connection(socket, bridge, event_rx).await;
        }
    })
}
