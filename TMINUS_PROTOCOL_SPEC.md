# T-Minus Cue Dispatcher Protocol Spec v1.0

> The temporal heartbeat of the Symphony of Shells.
> Not a workflow engine. Not a job queue. A **cue grid** for distributed cognitive agents.

---

## 1. Conceptual Foundation

### Cognitive Beat

A **cognitive beat** is the fundamental time unit in the t-minus system. It is **not** wall-clock time.

```
1 beat = f(latency, context_depth)
```

Where:
- `latency` = measured round-trip time for the shell (smoothed over a sliding window)
- `context_depth` = amount of context the shell typically processes (`shallow` → 1, `medium` → 2, `deep` → 4)

Each shell self-reports its latency on registration. The dispatcher normalizes all beats to a **system reference beat** using the registered shell's parameters.

### T-Minus Cue

A t-minus cue is a temporal alignment signal:

```
t-minus(shell_id, n_beats, phase_group)
```

Interpretation: "Shell `shell_id`, you will fire `n_beats` **before** the system reaches alignment point P in `phase_group`."

- **Positive n**: Future cue. `t-minus(critic, +5)` → "critic fires in 5 beats"
- **Zero n**: Immediate cue. `t-minus(architect, 0)` → "architect fires NOW"
- **Negative n**: Pre-cue (past-anchored). `t-minus(chronicler, -8)` → "chronicler is told it started 8 beats ago and should already be delivering"

### Alignment Points

An **alignment point** (P) is the conceptual "now" of a phase group. When all agents in a phase group have fired for a given point, the group advances to the next point.

### Phase Groups

Agents belong to phase groups. Cues within a phase group are scoped to that group's alignment point.
Example groups: `gather`, `synthesize`, `review`, `deliver`

---

## 2. Data Model

### Shell/Agent Record

```json
{
  "id": "chronicler-v1",
  "name": "Chronicler",
  "timbre": "narrative",
  "frequency": 0.8,
  "state": "listening",
  "phase_groups": ["gather", "deliver"],
  "latency_ms": 1200,
  "context_depth": "deep",
  "normalized_beats": 4.0,
  "ws_connection_id": "conn_abc123",
  "registered_at": 1710000000000,
  "last_heartbeat": 1710000123000
}
```

### Cue Record

```json
{
  "id": "cue_001",
  "target_id": "critic-v1",
  "source_id": "architect-v2",
  "phase_group": "review",
  "offset_beats": 5,
  "issued_at": 1710000001000,
  "scheduled_fire_at": 1710000042000,
  "state": "scheduled",
  "payload": { "context": "..." }
}
```

### Alignment Point Record

```json
{
  "id": "P_003",
  "phase_group": "gather",
  "sequence": 3,
  "opened_at": 1710000000000,
  "cues_issued": 4,
  "cues_completed": 3,
  "state": "awaiting_completion"
}
```

---

## 3. State Machine: Agent Lifecycle

```
                    ┌──────────┐
                    │ OFFLINE  │
                    └────┬─────┘
                         │ REGISTER (via WS)
                         ▼
                  ┌──────────────┐
                  │  REGISTERED  │ ◄───── re-registration
                  └──────┬───────┘
                         │ SUBSCRIBE (to phase group)
                         ▼
                  ┌──────────────┐
                  │  LISTENING   │ ◄───── transition back from completed
                  └──────┬───────┘
                         │ CUE received (t-minus event)
                         ▼
                  ┌──────────────┐
                  │    CUED      │
                  └──────┬───────┘
                         │ t-minus offset reaches zero
                         ▼
                  ┌──────────────┐
                  │   PRIMED     │ ◄───── agent is "ready to fire"
                  └──────┬───────┘
                         │ FIRE command / agent decides to go
                         ▼
                  ┌──────────────┐
                  │   FIRING     │ ◄───── agent is executing its action
                  └──────┬───────┘
                         │ REPORT(result)
                         ▼
                  ┌──────────────┐
                  │  COMPLETE    │
                  └──────┬───────┘
                         │ (listens for next cue in group)
                         ▼
                  ┌──────────────┐
                  │  LISTENING   │
                  └──────────────┘
```

**State Transitions (formal):**

| From | Event | To | Description |
|------|-------|----|-------------|
| OFFLINE | `REGISTER` | REGISTERED | WS handshake complete |
| REGISTERED | `SUBSCRIBE` | LISTENING | Joined ≥1 phase group |
| LISTENING | `CUE` | CUED | Received t-minus signal |
| CUED | T-minus countdown completes | PRIMED | Offset reaches zero |
| PRIMED | `FIRE` | FIRING | Agent is executing |
| FIRING | `REPORT` | COMPLETE | Result delivered |
| COMPLETE | Next cue in group | LISTENING | Ready for next round |
| LISTENING | `CUED` (pre-cue) | PRIMED | Pre-cued agent goes straight to primed |
| any | DISCONNECT | OFFLINE | WS closed / timeout |

---

## 4. API Surface

### 4.1 WebSocket Message Protocol

All messages are JSON over WebSocket. Message envelope:

```json
{
  "type": "<message_type>",
  "seq": 1,
  "ts": 1710000000000,
  "payload": { ... }
}
```

#### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `REGISTER` | `{name, timbre, frequency, latency_ms, context_depth}` | Register agent |
| `SUBSCRIBE` | `{phase_groups: ["gather"]}` | Join phase groups |
| `CUE` | `{target_id, offset_beats, phase_group, payload?}` | Send t-minus cue |
| `FIRE` | `{}` | Signal that agent is now executing |
| `REPORT` | `{result, duration_beats, phase_group}` | Report completion |
| `PING` | `{}` | Heartbeat |
| `UNSUBSCRIBE` | `{phase_groups: ["review"]}` | Leave phase groups |

#### Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `REGISTERED` | `{agent_id, state: "registered"}` | Registration confirmed |
| `CUED` | `{cue_id, source, offset_beats, phase_group, payload?}` | You've been cued |
| `PRIMED` | `{cue_id, phase_group}` | Your t-minus is up, go! |
| `FIRE_ACK` | `{cue_id}` | Acknowledged |
| `COMPLETE_ACK` | `{cue_id}` | Completion acknowledged |
| `PHASE_ADVANCE` | `{group, point: "P_004"}` | Phase group advanced |
| `ERROR` | `{code, message}` | Error |
| `PONG` | `{}` | Heartbeat response |

### 4.2 REST Endpoints (Health & Status)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check → `{status: "ok", uptime, agents, cues}` |
| `GET` | `/agents` | List registered agents |
| `GET` | `/agents/:id` | Agent detail |
| `GET` | `/phase-groups` | List phase groups with alignment points |
| `GET` | `/phase-groups/:name` | Phase group detail |
| `GET` | `/cues` | Active/pending cues |
| `DELETE` | `/agents/:id` | Force-deregister agent |

---

## 5. Distributed Clock Sync

### The Problem

Each Codespace runs on a different physical clock. NTP provides coarse sync but not fine-grained cognitive beat alignment.

### Solution: Beat-Relative Addressing

1. **Latency-normalized beats**: Each shell reports its latency + context depth. The dispatcher calculates the shell's **normalized beat interval**.
2. **Beat epoch**: The dispatcher maintains a local "beat counter" that ticks every N ms (configurable, default 500ms).
3. **Offset translation**: When agent A cues agent B at offset +5:
   - Dispatcher calculates: `5 * system_reference_beat_ms`
   - Schedules a local timer
   - When timer fires, sends `PRIMED` to agent B

### No Global Clock Needed

The system doesn't require synchronized clocks. All timing is relative to the **dispatcher's** beat counter. Agents just need to be connected via WebSocket to receive timely cues.

### Pre-Cueing (Negative T-Minus)

When `offset_beats < 0`:
1. Dispatcher immediately marks the agent as `primed`
2. Agent transitions: `listening → primed` (skipping `cued` state)
3. Agent is told "you should already be firing / delivering"
4. This enables the "long-running agent" pattern where chroniclers start early

---

## 6. Timing Engine

### Beat Tick Mechanism

```
dispatcher tick loop:
  every TICK_MS (default 500):
    beat_counter++
    for each cue in scheduled_cues:
      cue.remaining_beats--
      if cue.remaining_beats <= 0:
        emit PRIMED to target agent
        emit COMPLETE_ACK to source agent
        mark cue as delivered
```

### Frequency Scaling

Each agent has a `frequency` (0.0–1.0) that affects how eagerly it fires:
- 1.0 = fires every time cued (standard behavior)
- 0.8 = fires 80% of the time (probabilistic for critic/approver agents)
- 0.5 = fires 50% (useful for exploration/stochastic generation)

Implementation: when PRIMED, roll `Math.random() < frequency` to decide whether to actually transition to FIRING or skip.

---

## 7. Connection Lifecycle

```
1. Agent opens WS → dispatcher creates connection, marks as REGISTERED
2. Agent sends REGISTER → dispatcher stores metadata, assigns agent_id
3. Agent sends SUBSCRIBE → agent added to phase groups, state → LISTENING
4. (loop) Agent may send/receive CUE, FIRE, REPORT messages
5. Agent disconnects → dispatcher marks OFFLINE
6. Re-registration: agent is reconnected but state resets to REGISTERED
```

Timeout: if no PING received for 30s, agent is marked OFFLINE and removed from phase groups.

---

## 8. Error Handling

| Error Code | Description |
|------------|-------------|
| `AGENT_NOT_FOUND` | Target agent in CUE is unknown |
| `AGENT_OFFLINE` | Target agent is disconnected |
| `INVALID_STATE` | Agent sent FIRE while not CUED/PRIMED |
| `UNKNOWN_CUE` | REPORT references unknown cue |
| `GROUP_NOT_FOUND` | Phase group doesn't exist |
| `ALREADY_REGISTERED` | Duplicate registration |

---

## 9. Implementation Priorities

| Priority | Component | Rationale |
|----------|-----------|-----------|
| P0 | WS transport + REGISTER/CUE/REPORT | Core loop |
| P0 | Beat tick engine | Timing primitive |
| P0 | State machine | Agent lifecycle |
| P1 | Phase groups | Multi-agent coordination |
| P1 | Pre-cueing (negative t-minus) | Chronicle pattern |
| P2 | Frequency scaling | Stochastic behavior |
| P2 | REST health endpoints | Observability |
| P3 | Persistent state | Crash recovery |
| P3 | Distributed clock sync | Multi-machine |

---

## 10. Example Flow

```
CHRONICLER ────────── REGISTER(gather) ──→ DISPATCHER
ARCHITECT  ────────── REGISTER(gather,synthesize) ──→ DISPATCHER
CRITIC     ────────── REGISTER(review) ──→ DISPATCHER

CHRONICLER ── CUE(architect, +3, gather) ──→ DISPATCHER
               DISPATCHER computes: +3 beats = 1.5s from now
               DISPATCHER ── CUED(architect, offset=3) ──→ ARCHITECT
               
               After 3 ticks (1.5s):
               DISPATCHER ── PRIMED(architect) ──→ ARCHITECT
               
ARCHITECT fires, then:
ARCHITECT ── CUE(critic, +5, review) ──→ DISPATCHER
ARCHITECT ── REPORT(done) ──────────────→ DISPATCHER

               After 5 ticks (2.5s):
               DISPATCHER ── PRIMED(critic) ──→ CRITIC

CRITIC fires, reports:
CRITIC ── REPORT(reviewed) ──→ DISPATCHER
               DISPATCHER ── PHASE_ADVANCE(review, P_002) ──→ all
```

---

*End of Protocol Spec v1.0*
