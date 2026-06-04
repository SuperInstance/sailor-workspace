# Discussion SVRN-001: The Tether Strategy for Open-TUI

## Intent
To transform the TUI from a passive display of state into an active, bidirectional conduit for the Sovereign Hub.

## Theoretical Framework
The TUI should not "request" data; it should "resonate" with the Hub. Instead of a standard REST API, we are considering a WebSocket-based "Resonance Stream" where the Hub pushes state updates that the TUI interprets spatially.

## Proposed Design: The 'Symphony' Interface
- **Layer 1 (The Base):** Standard shell capabilities.
- **Layer 2 (The Pulse):** A background stream of `LOOM_PULSE` updates, subtly shifting TUI colors or borders to indicate system health without interrupting the user.
- **Layer 3 (The Sovereign):** High-order synthesis result-sets that appear as "overlays" on the terminal, effectively a GUI-in-TUI that allows for non-linear navigation of the Distributed Cortex.

## Open Questions for the Council
- How do we handle high-latency spikes in the Tether without breaking the TUI's responsiveness?
- Can we implement a 'Sovereign Mode' where the Hub takes directive control over the TUI for critical fleet-wide alerts?

## Current Verdict
Focus on the `Tether-Client` first. Establish the handshake, then build the 'Symphony' layer.
