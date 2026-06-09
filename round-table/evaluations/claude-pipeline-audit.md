# Live Paradigm Pipeline — Deep Code Quality Audit

**One-liner:** Solid architecture with engineered enthusiasm, but shipping with 5 production-critical bugs (state races, phase-advance corruption, sync-I/O in event loop, unguarded state mutations, and swallowed errors everywhere) beneath layers of genuinely good design.

---

## 1. fleet-conductor/src/server.js

### Race Conditions
- **L448-475:** Health-check loop iterates agents with `for...of` + `await` sequentially. If `forwardToAgent` takes >5s (timeout), the 15s interval fires overlapping iterations, causing concurrent writes to `agentStateCache` Map entries (`.status`, `.errorCount`, `.lastSeen`, `.lastError`). No locking.
- **L57-62:** `logEvent` writes to `logStream` (shared file stream) with no synchronization. Concurrent `processCue` calls from WS messages can interleave JSON lines.
- **L144-153:** `_register` → `_subscribe` flow: `_subscribed` flag is read-check-then-set with no mutex. A race between `REGISTERED` response and reconnection can cause double-subscription.

### Error Handling Gaps
- **L99-119:** `forwardToAgent`: AbortController timeout at 5s, error swallowed → returns `null`. Caller (`processCue` L239) treats `null` as "failed" but never retries.
- **L134-137:** Ghost feedback fire-and-forget: `.catch(() => {})` swallows all errors silently. No logging, no metrics, no retry. This feedback path is critical for accumulator accuracy.
- **L205:** `process.on('close')` does not null `reconnectTimer`. If `close` fires while reconnect is scheduled, a second connect starts → duplicate connections.
- **L376-388:** `/dispatch` POST body streaming skips `req.on('error')` — if client disconnects mid-body, the `.on('end')` handler never fires → request hangs.

### Resource Leaks
- **L48:** `logStream` opened at first `logEvent` call, closed only during graceful shutdown (`process.exit(0)` at L329). If the process crashes or receives SIGKILL, unflushed data is lost.
- **L163:** `setInterval` for heartbeat runs indefinitely. On reconnect, a new interval starts without clearing the old one — interval leak after every reconnection.

### Security Issues
- **L174-176:** CORS `*` with open methods/headers — typical for internal services, but opens the health/agent endpoints to any local network origin.

### Performance Problems
- **L460-474:** Sequential `await forwardToAgent` per agent. 16 agents × up to 5s timeout = 80s worst case. Health check interval is 15s → guaranteed cascade.
- **L340-344:** `routeCue` chains `Set.add().add().add()` — relies on `Set.add()` returning the Set, works but fragile.

### Conciseness Score: ~30% reduction possible
Comments block every section (100+ lines of ASCII banners + docstring preamble). The `forwardToAgent` and `processCue` functions each have 4x more logging than logic. Merge `initAgentStates` inline.

---

## 2. ghost-track-bridge/src/server.js

### Race Conditions
- **L90, L181, L249:** `this.activeReharm` is written in `processNote` (L181, called from WS message handler) and read in the WS response builder (L249). Both run on the event loop but across two different message streams — a feedback WS message and a midi WS message can interleave, causing activeReharm to change between read and serialization.
- **L302-303:** `sessionManager.sessions` is a `Map` — individual `get/set/delete` are atomic, but compound operations like `sessions.get(id)` then `sessions.delete(id)` (L367) are not. WS close and HTTP feedback handler can race.
- **L184-188:** `accumulatorDelta` and `agentFeedback` are mutated in `processFeedback` (called from HTTP) while `processNote` (called from WS) reads them via `getGhostTrackState()`. No synchronization.

### Error Handling Gaps
- **L344-346:** `/feedback` POST handler: `req.on('data')` + `req.on('end')`, but no `req.on('error')`. If the client disconnects mid-body, the handler never fires → no response sent.
- **L390:** WS message catch: prints to console but doesn't close/recover the connection. Bad JSON or internal errors leave the connection in undefined state.
- **L341:** `.catch(() => {...})` on `/reharmonize` proxy — error returned as JSON `{error: 'Ghost Track unreachable'}` which is OK, but no retry.
- **L214:** `_pickWeighted` assumes viable array has at least 1 entry, but `evaluate` checks `if (viable.length === 0) return null` before calling. Fragile invariant coupling.

### Resource Leaks
- **L276-277:** `ccHistory` and `noteHistory` grow unbounded per session. Sessions can run for hours. No cap unlike `history` (L67, capped at 32).
- **L131:** `appendFileSync` in `saveSessionCapture` — synchronous I/O inside the WS close handler (L366). Blocks event loop during disk write.

### Security Issues
- None severe for internal service.

### Performance Problems
- **L366:** `sessionManager.saveSessionCapture(session)` calls `appendFileSync` — synchronous file I/O on server connection close. If many clients disconnect simultaneously (e.g., server shutdown), each blocks the event loop sequentially.
- **L292:** `Array.from(sessionManager.sessions.values()).map(...)` — fine for small N.

### Conciseness Score: ~25% reduction possible
Heavy comment blocks per section. `generatePath` has verbose inline comments for simple math. The WS handler switch cases have more comments than code.

---

## 3. ghost-track-bridge/src/reharmonizer.js

### Race Conditions
- None. Pure synchronous stateless logic.

### Error Handling Gaps
- **L104:** `JSON.stringify(currentTrits || [0, 0, 0])` — if `currentTrits` contains undefined/null elements, stringify silently produces `[null,0,0]` etc., and lookup falls through to `PIVOT_TABLE['[0,0,0]']`.
- **L79-80:** `cooldownMs` is hardcoded at 500ms. If `evaluate` is called at exactly 499ms, it returns null even with CR=0.1. No priority override.

### Resource Leaks
- None.

### Performance
- O(1) pivot table lookup. Good.

### Conciseness Score: ~20% reduction possible
Affinity matrix and pivot table are verbose but serve as documentation. The `_pickWeighted` method is mostly comments.

---

## 4. tminus-dispatcher/src/

### 4a. index.js

- **L17:** Uses port **8765** for HTTP+WS. All other services (fleet-conductor L6, opensmile-bridge L20) reference port **8768**. This is the canonical port the pipeline expects. Unless there's a proxy/redirect, fleet-conductor and opensmile-bridge will fail to connect.
- **L55-61:** `handleRestRequest` wrapped in try/catch → OK. But the WS `connection` handler (L67-72) has no outer try/catch.

### 4b. dispatcher.js

- **L70:** `const { handleMessage } = require('./ws-handler')` — dynamic require inside a callback. Re-resolved on every message. Works but unusual and prevents tree-shaking.
- **L127-148:** `_fireCue` reads `cue.state` and `cue.target_id` — but the `cue` object is passed from `tick()` which mutates `cue.state = CUE_STATES.DELIVERED`. Between `tick()` and `_fireCue`, nothing changes, but it's an implicit coupling.
- **L86-88:** `staleCheckInterval` created even if dispatcher never calls `start()`. OK since `start()` is called at index.js L85.

### 4c. agent-registry.js

- **L85-92:** `setState` and `transitionTo` ignore `VALID_TRANSITIONS` entirely (defined in constants.js L22-30 but never referenced). Invalid state transitions are silently accepted.
- **L68:** `ws._tminusConnId = connId` — mutating WebSocket object with internal property. Works, but fragile if WS object shape changes.
- **L118-127:** `disconnect` doesn't verify the agent still belongs to `connId` before deleting from `_socks` and `_conns`. A race between close and disconnect could leave dangling state.

### 4d. ws-handler.js

- **L22-25:** `JSON.parse` catches parse errors ✓. But the rest of the handler (lines 34-158) has no try/catch. Any exception in a switch case (e.g., `agents.register` with null payload, `dispatcher.dispatchCue` with missing fields) throws → the connection hangs with no error response.
- **L122:** `const completedInfo = dispatcher.completeAgentCues(agent.id, reportGroup)` returns an array of cue IDs (strings). Then `for (const {cueId} of completedInfo)` destructures — if completedInfo contains strings (not objects), `cueId` is `undefined`.
- **L87-88:** `if (!target || !source)` — if `source` is falsy, returns error. But source is `agent` which was checked at L77 — unreachable but defensive.

### 4e. cue-scheduler.js

- **L49:** `this._pending.push(cue); this._pending.sort(...)` — O(n log n) for every schedule. Binary search + splice is O(n), though n is small so not critical.

### 4f. phase-group.js

- **L47 ⚠️:** **`recordCueCompleted`** checks `point.cues_completed >= point.agent_count`. But `cues_completed` counts **cues**, not unique agents. If one agent completes 2 cues while another completes 0, `cues_completed` (2) ≥ `agent_count` (2) triggers phase advance even though only 1 of 2 agents actually finished. This is a **CRITICAL BUG** — alignment can advance leaving agents behind.

### Conciseness Score: ~15% overall
Cleanest module in the pipeline. agent-registry.js and ws-handler.js are well-factored.

---

## 5. fleet-agent/fleet-agent.py

### Error Handling Gaps
- **L120:** `self.rfile.read(length)` — if `Content-Length` header is larger than actual body, this blocks indefinitely. If smaller, body is silently truncated.
- **L126:** Generic `except Exception as e` — catches everything including `ZeroDivisionError`, `AttributeError`, etc. in agent logic, all silently mapped to `[0,0,0]` ternary. Hides programming errors.
- **L135-138:** `log_message` suppresses probe/health log output by matching substring `'probe' in msg` — fragile. A genuine error message containing "probe" gets suppressed.

### Performance
- **L146-150:** Uses `http.server.HTTPServer` — single-threaded, sequential request handling. Under concurrent health checks from fleet-conductor (8+ agents probed simultaneously), queuing delays build up.
- **L17-20:** `_val(payload, *keys, default=0)` loops through all keys and checks `voice.get(k)` — creates `voice` dict on every call even when not needed. Tiny overhead, called frequently.

### Conciseness Score: ~10%
Cleanest file in the pipeline. Well-factored, clear naming, appropriate docstrings. The `_notes` function could be simpler but it's clear.

---

## 6. tensor-demo/lead-sheet.py

### Error Handling Gaps
- **L64:** Bare `except Exception` in TTS call — falls back to synthetic tone without logging the original error. Silent failure.
- **L413:** `interleave` code at L113-120 is **dead/broken** — calculates `idx` but never uses it. The actual interleave (L122-126) uses `channels[sid].pop(0)` which is O(n) per pop and doesn't actually interleave properly — it processes in script order, not speaker order.

### Performance Problems
- **L124-126:** `full.append(channels[sid].pop(0))` — `list.pop(0)` is O(n). For a podcast with 100+ words, this is O(n²).

### Resource Leaks
- **L31-40:** Deep import inside function body modifies `sys.path` globally. If `piper-voice` directory structure changes, subsequent imports hijack.

### Conciseness Score: ~40% reduction possible
Large docstring preamble, dead code (L113-120), the `interleave` logic doesn't work as described. `generate_podcast` mixes audio generation with script definition and output logic. The `_synthetic_events` function is nearly identical to the Whisper-based `build_lead_sheet`.

---

## 7. tensor-demo/export-ardour.py

### Error Handling Gaps
- **L42:** Bare `assert` — disabled with `-O` flag. Should raise `ValueError` explicitly.
- **L185-186:** `src_a.set("id", "1")` and `src_b.set("id", "2")` — hardcoded IDs. If the export runs twice in the same session, Ardour may complain about duplicate IDs.

### Performance
- Fine for a build-time script.

### Conciseness Score: ~30%
XML construction is inherently verbose. The massive inline XML template adds bulk but is clear.

---

## 8. fleet-rule-engine/fleet-rule-engine.py

### Error Handling Gaps
- **L186:** Rule C02 `rule_ternary_transition` — `to_ternary` function is redefined inside the loop (L212). Python creates a new function object on every iteration. Minor but wasteful.
- **L196-201:** Ternary derivation logic is fragile — tries `ev.get('value', ev.get('cc74', ev.get('cc', 64)))` cascading fallback. Silent fallback hides data schema mismatches.

### Performance
- **L55:** `get_track` calls `name.lower().replace(' ', '_')` converts on every call. Should lowercase/cache on init.
- All rules are O(n) — reasonable.

### Conciseness Score: ~20%
Well-structured dataclass-based architecture. Each rule is clearly isolated. The CLI and report renderer are separate concerns.

---

## 9. opensmile-bridge/server.py

### Race Conditions
- **L103, L190:** `self.last_features` is written from the OpenSMILE callback thread (`_on_features` L86-93) and read from the async main thread (via `extract()` → `_parse_features_from_dict` which sets `self.last_features`). This is a **data race** — Python's GIL protects individual bytecode ops but not compound read/write sequences.

### Error Handling Gaps
- **L94:** `queue.Queue(maxsize=100).put_nowait(feats)` → `queue.Full` silently drops feature frames. No warning, no metric.
- **L101:** `self.stream.start()` is wrapped in try/except, but `stop()` is never called on failure — C resources leak.
- **L340:** `asyncio.Future()` — runs forever with no cancellation. Only `KeyboardInterrupt` stops it.

### Resource Leaks
- **L331-332:** `self.ghost_ws` — if ghost bridge reconnects, old websocket handle is overwritten without closing.
- **L379:** `stream.stop()` not called on `KeyboardInterrupt`.

### Performance
- **L244:** `librosa.resample` on every audio chunk — expensive. For real-time streaming, linear/polyphase resampling would be cheaper.
- **L94:** Queue dropping under load — no backpressure to audio source.

### Conciseness Score: ~20%
Well-organized class structure. `features_to_midi_cc` is long but the mapping is documented per line.

---

## 10. opensmile-bridge/stream.py

### Race Conditions
- **L133:** `feature_buffer.append(arr)` is called from the C sink callback (runs on OpenSMILE internal thread). The processing thread reads `feature_buffer` at L137-145. No mutex. The `feature_buffer` list is **not thread-safe** — `append` and iteration can race, causing corrupted reads.
- **L106:** `self._smile = smile` set on processing thread. `write()` (L169) checks `self._smile is None` from the calling thread. Python's GIL protects the assignment but there's a thin window between `start()` returning and `_smile` being set.

### Error Handling Gaps
- **L131:** `sink_callback` wraps `self.user_callback` in try/except — good. But it catches all exceptions, including `SystemExit` and `KeyboardInterrupt`.
- **L116:** No existence check for `config_path` before passing to OpenSMILE — an opaque `OpenSmileException` will be raised.
- **L174-177:** `audio.dtype != np.int16` check — if audio is complex64 or other unsupported type, the cast fails silently.

### Resource Leaks
- **L97-103:** If `_init_smile` raises, `smile.free()` is never called. The OpenSMILE C handle leaks.
- **L188-197:** `stop()`: `self._thread.join(timeout=5.0)` — if thread doesn't respond, `smile_abort()` is called, but `free()` may not have been called on the C side.

### Performance
- **L58:** `self.chunk_size = int(sample_rate * chunk_ms / 1000)` — chunk_ms is 32ms, fine.

### Conciseness Score: ~15%
Well-factored streaming class. Thorough documentation.

---

## 11. demucs_websocket/__init__.py

### Error Handling Gaps
- **L100:** `except ImportError: pass` for all three optional deps — completely silent. The CLI `--check` flag helps but runtime failures are opaque.
- **L195:** `json.loads(chunk)` in the binary read loop — when `chunk` is bytes (binary audio), `json.loads` raises. Caught by outer try/except, but causes the `audio_data` accumulation to miss bytes.
- **L233:** `self.runner.load_model(model_name)` can raise (Demucs not installed), leaving `result = {}` from L196.

### Resource Leaks
- **L249:** `result.get("output_dir")` — if `load_model` or `separate` throws before `result` is assigned, `output_dir` is empty, and the temp directory is never cleaned up.
- **L213-214:** `tmp_path = tmp.name` before `tmp.close()` — `NamedTemporaryFile(delete=False)` requires explicit cleanup. The `finally` block handles this, but only if `tmp` is defined.

### Performance
- Demucs runs on CPU (~2× real-time). The entire `separate()` call blocks the async event loop for seconds or minutes. Should offload to a thread.

### Conciseness Score: ~15%
Clean service wrapper. The variable `ls` (L243) is shadowed inside the function after being defined at L205.

---

## 12. fleet-osc-bridge/fleet-osc-bridge.py

### Error Handling Gaps
- **L84-96:** `send_event` silently does nothing if `self.client` is None. Connection failures are invisible.
- **L85:** No `try/except` around `self.client.send_message(...)`. Network failures cause unhandled exceptions.
- **L91:** `event.get("speaker_id", event.get("spk", 0))` — cascading key fallback masks schema mismatches.

### Performance
- **L143:** `events.index(ev)` in a loop — O(n²) for the progress indicator (every 10 events). For 1000 events, this is ~50K comparisons just for progress display.

### Conciseness Score: ~15%
Clean bridge script. Good comments on OSC mapping table.

---

## 13. basic_pitch_conversation/__init__.py

### Error Handling Gaps
- **L33:** `except (ImportError, OSError): pass` — silently marks Basic Pitch as unavailable. If the import fails for reasons other than platform (e.g., corrupted package), the fallback path runs with no warning about the actual error.
- **L101:** `_fallback_predict` — `np.correlate(frame, frame, mode='same')` on empty frames (L177-179 checks `len(frame) < 256`) but if all onset frames are empty, the function returns a lead-sheet with 0 events and no error.
- **L170:** `librosa.load(audio_path, sr=22050, mono=True)` can raise for corrupted audio files — unhandled.

### Performance
- **L177:** `np.correlate(frame, frame, mode='same')` — O(n²) for each frame. 4096-sample frames = ~16M ops per onset. For 100 onsets, that's 1.6B ops.

### Conciseness Score: ~20%
Clean adapter layer. The `_format_pitch_event` and `_format_cc_event` are good abstractions.

---

## Summary: Top 5 Bugs by Severity

### 🔴 #1 — Phase Advance Triggers Prematurely (CRITICAL)
**File:** `tminus-dispatcher/src/phase-group.js` L47
`recordCueCompleted` checks `point.cues_completed >= point.agent_count`. But `cues_completed` counts total completed cues, not unique agents who completed. One agent finishing 2 cues while another finishes 0 triggers advancement at `cues_completed=2, agent_count=2`.
**Fix:** Track unique agent completion per alignment point, not cue count.

### 🔴 #2 — Race Condition on Shared State Across Handlers (CRITICAL)
**Files:** `ghost-track-bridge/src/server.js`, `fleet-conductor/src/server.js`
`accumulatorDelta`, `agentFeedback`, `activeReharm` (ghost-track) and `agentStateCache` (conductor) are read/written from multiple async handlers without any synchronization. WS messages, HTTP POST feedback, and periodic health checks can interleave.
**Fix:** Add per-key mutexes or use atomic operations. In Node, consider a simple mutex class or structured serialization.

### 🔴 #3 — Sync File I/O Blocks Event Loop on Connection Close (HIGH)
**File:** `ghost-track-bridge/src/server.js` L366
`sessionManager.saveSessionCapture(session)` calls `appendFileSync` in the WS `close` handler. Sync I/O blocks the event loop for the duration of the file write.
**Fix:** Use `fs.promises.appendFile` with `await`, or batch session writes asynchronously.

### 🔴 #4 — Unvalidated State Transitions in Agent Registry (HIGH)
**File:** `tminus-dispatcher/src/agent-registry.js` L85-92
`setState` and `transitionTo` never check `VALID_TRANSITIONS` (defined in constants.js but unused). Agents can go from `REGISTERED` directly to `FIRING`, skipping `CUED` → `PRIMED`. The state machine is decorative, not enforced.
**Fix:** Validate transitions against the lookup table; return false or throw on invalid transitions.

### 🔴 #5 — Dynamic Require Blocks Tree-Shaking and Hides Errors (MEDIUM)
**File:** `tminus-dispatcher/src/dispatcher.js` L70
`const { handleMessage } = require('./ws-handler')` inside a callback, re-resolved on every message. Inconsistent with ES module patterns elsewhere. If `ws-handler.js` has a syntax error, it fails at runtime on the first WS message rather than at startup.
**Fix:** Static `require` at module top level.

---

## Top 3 Missing Features by Signal/Noise

### 🟢 HIGH SIGNAL — Retry Logic with Backoff for Downstream Services
Every service in the pipeline uses fire-and-forget or single-attempt patterns for inter-service communication:
- Ghost feedback: `.catch(() => {})` (conductor L137)
- Agent forwarding: single `fetch` with 5s timeout, no retry (conductor L99)
- tminus reconnection: fixed 3-5s random delay, no exponential backoff (conductor L212)
- Ghost bridge connection: single-shot connect (opensmile-bridge L313)
**Gap:** No dead-letter queue, no circuit breaker, no backpressure. A single transient failure ripples through the entire pipeline.

### 🟢 HIGH SIGNAL — State Machine as Executable Constraint
`VALID_TRANSITIONS` defines a nice state machine in `constants.js` (L22-30) but is **never imported or used** by any consumer. `setState`/`transitionTo` in `agent-registry.js` (L85-92) silently accept any transition. This makes the agent lifecycle documentation inaccurate and allows invalid sequences.
**Gap:** 7 lines of dead code that should be 7 lines of enforcement.

### 🟡 MEDIUM SIGNAL — Structured, Rotating Logs
- 4 different logging patterns across 13 files: `console.log` with emoji, `JSON.stringify` to custom file, Python `print()`, custom `logEvent` JSON
- `fleet-conductor-log.md` (conductor L12-13) grows unbounded with no rotation
- No log levels (info/warn/error/debug), no structured fields for log aggregation
**Gap:** When this system runs in production, debugging a failure requires grepping 4 formats. A unified structured logger with levels, rotation, and correlation IDs would pay for itself on the first incident.

---

## File-by-File Conciseness Summary

| File | Reduction | Notes |
|------|-----------|-------|
| fleet-conductor/src/server.js | ~30% | ASCII banners, verbose logging 4x per function |
| ghost-track-bridge/src/server.js | ~25% | Heavy inline comments, 2x event-data key definitions |
| ghost-track-bridge/reharmonizer.js | ~20% | Docstrings > logic, fine for documentation value |
| tminus-dispatcher/src/ (all) | ~15% | Cleanest JS module; well-factored |
| fleet-agent/fleet-agent.py | ~10% | Gold standard for this repo |
| tensor-demo/lead-sheet.py | ~40% | Dead interleave code, duplicate synthetic fallback |
| tensor-demo/export-ardour.py | ~30% | Verbose XML construction, acceptable |
| fleet-rule-engine/fleet-rule-engine.py | ~20% | Clean |
| opensmile-bridge/server.py | ~20% | Clean |
| opensmile-bridge/stream.py | ~15% | Clean |
| demucs_websocket/__init__.py | ~15% | Clean |
| fleet-osc-bridge/fleet-osc-bridge.py | ~15% | Clean |
| basic_pitch_conversation/__init__.py | ~20% | Clean |

---

## Methodology

Each file was read in full. Findings are reported with specific line numbers from the versions in `/home/ubuntu/.openclaw/workspace/`. "Severity" follows: CRITICAL → data corruption or crash under normal use; HIGH → systemic fault with clear exploit path; MEDIUM → operational degradation; LOW → code smell.

The conciseness score estimates what percentage of the file could be removed without losing clarity (comments, dead code, redundant logging, ASCII art).

Generated: 2026-06-09 by Claude Code (200K context window audit).
