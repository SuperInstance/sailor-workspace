//! WebSocket handler for the Fleet Command Bridge.
//!
//! Manages client WebSocket connections, parses incoming JSON-RPC messages,
//! dispatches to the RPC handler, and pumps push events to connected clients.
//!
//! Architecture per client:
//!   ┌─────────────────────────────────────────┐
//!   │  Main Loop (ws_rx)      Event Pump      │
//!   │  reads → handles →      reads from:     │
//!   │  sends via resp_tx      • broadcast     │
//!   │                         • resp_rx       │
//!   │                         → writes ws_tx  │
//!   └─────────────────────────────────────────┘

use crate::rpc_handler::handle_rpc;
use crate::state::SharedBridgeState;
use crate::types::*;
use axum::extract::ws::{Message, WebSocket};
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::{broadcast, mpsc};
use tracing::{info, warn};

/// Handle a single WebSocket connection lifecycle.
pub async fn handle_ws_connection(
    socket: WebSocket,
    state: SharedBridgeState,
    mut event_rx: broadcast::Receiver<serde_json::Value>,
) {
    let (mut ws_tx, ws_rx) = socket.split();

    // Channel for outbound responses from the main loop to the event pump
    let (resp_tx, mut resp_rx) = mpsc::unbounded_channel::<serde_json::Value>();

    // Send session_ready notification
    let ready_msg = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "session_ready",
        "params": {
            "session_id": uuid::Uuid::new_v4().to_string(),
            "fleet_version": "1.0.0",
        }
    });
    if let Err(e) = ws_tx.send(Message::Text(ready_msg.to_string())).await {
        warn!(error = %e, "Failed to send session_ready");
        return;
    }

    info!("WebSocket client connected");

    // Spawn event pump that drains both the broadcast channel and response channel
    let pump_handle = tokio::spawn(async move {
        event_pump(ws_tx, &mut event_rx, &mut resp_rx).await;
    });

    // Main receive loop
    let mut ws_rx = ws_rx;
    while let Some(msg) = ws_rx.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                let request: JsonRpcRequest = match serde_json::from_str(&text) {
                    Ok(req) => req,
                    Err(e) => {
                        let err_resp = JsonRpcResponse::error(None, ERR_PARSE, &format!("Parse error: {}", e));
                        let _ = resp_tx.send(serde_json::to_value(&err_resp).unwrap_or_default());
                        continue;
                    }
                };

                // Handle the request
                let response = handle_rpc(&state, request).await;

                // Send response back through the pump channel
                if let Ok(val) = serde_json::to_value(&response) {
                    let _ = resp_tx.send(val);
                }
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => {
                // handled by axum
            }
            Ok(Message::Close(_)) => {
                info!("WebSocket client disconnected");
                break;
            }
            Err(e) => {
                warn!(error = %e, "WebSocket error");
                break;
            }
            _ => {}
        }
    }

    pump_handle.abort();
    info!("WebSocket connection closed");
}

/// Pump events from broadcast + response channels to the WebSocket client.
async fn event_pump(
    mut ws_tx: SplitSink<WebSocket, Message>,
    event_rx: &mut broadcast::Receiver<serde_json::Value>,
    resp_rx: &mut mpsc::UnboundedReceiver<serde_json::Value>,
) {
    use tokio::select;

    loop {
        select! {
            // Push event from broadcast channel
            event = event_rx.recv() => {
                match event {
                    Ok(msg) => {
                        let text = serde_json::to_string(&msg).unwrap_or_default();
                        if let Err(e) = ws_tx.send(Message::Text(text)).await {
                            warn!(error = %e, "Failed to send broadcast event");
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        warn!(dropped = n, "Event channel lagged");
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        info!("Event channel closed");
                        break;
                    }
                }
            }

            // Response to a specific client request
            Some(response) = resp_rx.recv() => {
                let text = serde_json::to_string(&response).unwrap_or_default();
                if let Err(e) = ws_tx.send(Message::Text(text)).await {
                    warn!(error = %e, "Failed to send response");
                    break;
                }
            }
        }
    }
}
