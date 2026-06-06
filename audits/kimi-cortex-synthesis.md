# Unified CORTEX Spec — Deep Fleet Synthesis

**Generated:** 2026-06-06 22:55 UTC  
**Source files:** construct-coordination/notes/main/ (CORTEX-JSON-v1-SPEC.md, CONSTRUCT-SKILL-SPEC.md, ORACLE1-ARCHITECTURE-REVIEW.md, ORACLE1-COORDINATION-REVIEW.md, CONVERGENCE-MAP.md, PRECISION-AUDIT.md)  
**Source code:** construct-coordination/construct-core-src/ (lib.rs, types.rs, layer0.rs, layer1.rs, layer2.rs, esp.rs, pi.rs, dgx.rs)  
**Method:** Full cross-document synthesis

---

## 1. CORTEX Schema Definition (CORTEX.json v1)

### 1.1 Purpose

CORTEX.json is the **interface definition** for agent nodes in the SuperInstance fleet. Every agent instance publishes a CORTEX.json manifest declaring what it can do, how to reach it, and how it pulses. The division is:

```
CORTEX.json = "what I am and what I can do"   (schema — Oracle2)
construct-core = "how to make that real"       (runtime — Forgemaster)
```

### 1.2 JSON Schema (v1.0)

```json
{
  "cortex_version": "1.0",
  "agent": {
    "id": "oracle2",
    "instance": "oracle2",
    "host": "oracle-arm64",
    "hardware_tier": "worksation",
    "architecture": "aarch64",
    "cpus": 4,
    "ram_gb": 24,
    "disk_gb": 45,
    "openclaw_version": "v0.21.0"
  },
  "skills": [
    {
      "name": "pincher-core",
      "version": "0.1.0",
      "capabilities": [
        "reflex-engine",
        "veto",
        "bubblewrap-sandbox",
        "route",
        "community-detection",
        "imuunology-pattern-matching"
      ],
      "feature_flags": {
        "onnx": false,
        "landlock": false,
        "wasmtime": false
      },
      "construct_tier": "worksation",
      "latency_us": {
        "reflex_match": 8,
        "embedding": 297,
        "veto_decision": 52
      }
    }
  ],
  "tether": {
    "protocol": "i2i-v2.1",
    "vessel_path": "/tmp/i2i-vessel",
    "accepted_types": [
      "TASK", "STATUS", "CHECKPOINT", "BLOCKER",
      "DELIVERABLE", "BOTTLE", "SYNTHESIS"
    ],
    "encoding": "json-via-file"
  },
  "thalamic_pulse": {
    "interval_ms": 60000,
    "endpoints": {
      "construct-coordination": {
        "repo": "SuperInstance/construct-coordination",
        "path": "notes/main/",
        "protocol": "gh-push"
      }
    },
    "conservation_check": {
      "metric": "std_of_ternary_population",
      "threshold": 0.01,
      "enabled": true
    }
  }
}
```

### 1.3 Field Reference

**Top Level:**
| Field | Required | Description |
|-------|----------|-------------|
| `cortex_version` | ✅ | Schema version, currently "1.0" |
| `agent` | ✅ | Identity and hardware profile |
| `skills[]` | ✅ | Capability manifests, one per module |
| `tether` | ✅ | Inter-instance communication config |
| `thalamic_pulse` | ✅ | Heartbeat and sync configuration |

**Skill Object:**
| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Canonical crate/module name |
| `version` | ✅ | Semver version |
| `capabilities[]` | ✅ | Semantic capability tags |
| `feature_flags` | ✅ | Feature gate state |
| `construct_tier` | ✅ | `esp32` / `pi` / `worksation` / `dgx` / `browser` |
| `latency_us` | optional | Measured microsecond latencies for key ops |

**Tether Object:**
| Field | Required | Description |
|-------|----------|-------------|
| `protocol` | ✅ | e.g. "i2i-v2.1" |
| `vessel_path` | ✅ | On-disk path to vessel directory |
| `accepted_types[]` | ✅ | Baton types this node processes |
| `encoding` | optional | Wire format hint |

**Thalamic Pulse Object:**
| Field | Required | Description |
|-------|----------|-------------|
| `interval_ms` | ✅ | Pulse frequency in ms |
| `endpoints` | ✅ | Named endpoint configs |
| `conservation_check` | optional | Conservation law monitoring |

### 1.4 Discovery Flow

1. Agent publishes CORTEX.json to `notes/main/{agent-id}-CORTEX.json`
2. Other agents pull on their pulse cycle
3. When capabilities change, agent pushes updated CORTEX.json
4. Construct-core adapts its trait layer to match

---

## 2. Skill Types (CONSTRUCT-SKILL-SPEC)

### 2.1 Skill Manifest (`skill.json`)

Every skill declares its identity, requirements, and contracts via a JSON manifest:

```json
{
  "skill_id": "fleet-sensor/anomaly-guardian/v2",
  "version": "2.1.0+tier2",
  "display_name": "Anomaly Guardian v2",
  "description": "Real-time sensor anomaly detection with ternary classification",
  "authors": ["Forgemaster v2"],
  "license": "MIT OR Apache-2.0",
  "homepage": "https://github.com/SuperInstance/ternary-sensor",
  "min_tier": "tier1",
  "max_tier": "tier2",
  "entry_points": [
    { "name": "detect", "input_schema": {}, "output_schema": {}, "conservation_impact": 0.12 },
    { "name": "calibrate", "input_schema": {}, "output_schema": {}, "conservation_impact": 0.30 }
  ],
  "dependencies": [
    { "skill_id": "ternary-kalman/fixed-point", "version": ">=0.9.0", "tier_match": "allow_any" }
  ],
  "capabilities": ["sensor-anomaly", "classify-trit", "kalman-fixed-point"],
  "conservation_profile": { "expected_ratio": 1.25, "tolerance": 0.05 },
  "bridge": {
    "native_rust": true,
    "native_c": { "header": "include/anomaly_guardian.h", "abi": "C", "symbol_prefix": "construct_skill_" },
    "python": { "module": "anomaly_guardian", "pyo3": true },
    "wasm": { "export": "anomaly_guardian", "interface_types": ["string", "bytes", "i32"] }
  }
}
```

### 2.2 Tier System

| Tier | Hardware | Features | Examples |
|------|----------|----------|----------|
| **tier0** | Bare metal (ESP32) | No heap, no OS, `const fn` only | `ternary-esp32-firmware` |
| **tier1** | SBC (Pi, Jetson) | Heap, OS, no async runtime | `PiConstruct`, `EdgeConstruct` |
| **tier2** | Cloud/GPU (DGX, Codespace) | Full `std` + async runtime | `DgxConstruct` |
| **tierW** | Browser (WASM) | `fetch()`, `postMessage()`, no raw sockets | `BrowserConstruct` |

### 2.3 Skill State Machine

```
UNLOADED → LOADING → ACTIVE → UNLOADING → GONE
               ↓         ↓
           LOAD_FAILED  SUSPENDED → RESUMING → ACTIVE
                            ↑
                       SUSPEND_FAILED
```

- **ACTIVE** → can be queried, emits events, consumes energy.
- **SUSPENDED** → loaded but not ticked (conserves energy).
- **UNLOADING** → draining in-flight work, extracting triggers.
- **GONE** → skill state freed.

### 2.4 Trigger Extraction (Muscle Memory)

On skill unload, the system extracts lightweight threshold monitors:

```json
{
  "triggers": [{
    "trigger_id": "anomaly-guardian-v2:temperature_spike",
    "metric_path": "sensors.temp_engine_01.ternary_class",
    "condition": "eq", "threshold": "High",
    "window_ticks": 1,
    "action": { "type": "reload_skill", "skill_id": "fleet-sensor/anomaly-guardian/v2" },
    "priority": 0
  }]
}
```

Trigger conditions: `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `changed`, `stable`.  
Trigger actions: `reload_skill`, `enter_room`, `alert_agent`, `escalate_human`.

### 2.5 Energy Accounting

Energy mapped from platform-specific measurements:
- **tier0 (ESP32):** `energy_drain = cpu_cycles / 1e6`
- **tier1 (Pi/Jetson):** `energy_drain = cpu_time_us / 1000 + memory_bytes / 1e6`
- **tier2 (DGX/Codespace):** `energy_drain = cpu_time_us / 1000 + memory_bytes / 1e6 + gpu_time_us / 500`
- **tierW (WASM):** `energy_drain = cpu_time_us / 1000`

GC strategies: **GreedyGC** (suspend highest-drain), **PlinkoGC** (stochastic), **EcologicalGC** (Lotka-Volterra species model).

### 2.6 Cross-Language Bridge

| Construct Type | Rust | C | Python | WASM |
|-----------|------|---|--------|------|
| `Trit` | `i8` (-1,0,1) | `int8_t` | `int` | `i32` |
| `TritVector` | `Vec<i8>` | `int8_t*` + `size_t` | `list[int]` | `Int8Array` |
| `Tile` | struct | opaque ptr + JSON | `dict` | `string` (JSON) |
| `SkillHandle` | `usize` | `void*` | `int` | `i32` |

### 2.7 Versioning Rules

- **MAJOR:** Remove entry point, change input schema incompatibly, raise `min_tier`.
- **MINOR:** Add entry point, optional field, new capability.
- **PATCH:** Bug fix, perf, docs, conservation tuning.
- **`+tier` build metadata** appended to SemVer.

### 2.8 The Ensign Pattern (Room-based Consumer)

An ensign is a specialist agent loaded per-room that consumes skills:

```rust
pub trait Ensign {
    fn specialty(&self) -> &str;
    fn required_skills(&self) -> Vec<SkillId>;
    fn reason(&self, query: &str, context: &RoomContext) -> EnsignResponse;
    fn extract_triggers(&self) -> Vec<Trigger>;
    fn cost(&self) -> EnsignCost;
}
```

---

## 3. How construct-core Implements It

### 3.1 Three-Layer Trait Hierarchy

construct-core defines a layered architecture: Layer 0 (bare metal) → Layer 1 (sync+heap) → Layer 2 (async+full std). **Each layer extends the previous one.**

#### Layer 0: `BareMetalConstruct`

```rust
pub trait BareMetalConstruct {
    fn query_lookup(&self, index: u16) -> TritAction;
    fn capabilities(&self) -> BareMetalCapabilities;
    fn query(&self, q: Query<'_>) -> Result<Response<'static>, ConstructError>;
}
```

- No heap, no async, no OS.
- Static `[u8; N]` lookup tables (no `Vec`, `String`, or `Box`).
- Works on ESP32, Cortex-M bare metal.

**Implementation: `EspConstruct`**
- 256-entry static lookup table (one byte per entry).
- `const fn new()` — no heap allocation.
- Default table: indices 0–85 = Avoid, 86–170 = Explore, 171–255 = Choose.
- Hardware tier: `HardwareTier::Embedded`.
- `BareMetalCapabilities`: `lookup_table_size: 256`, `has_confidence: false`, only `Action` query kind, 64-byte max payload.

#### Layer 1: `SyncConstruct`

```rust
pub trait SyncConstruct: BareMetalConstruct {
    fn load_skill(&mut self, id: SkillId) -> Result<(), ConstructError>;
    fn unload_skill(&mut self, id: SkillId) -> Result<(), ConstructError>;
    fn loaded_skills(&self) -> &[SkillId];
    fn query_owned(&self, q: OwnedQuery) -> Result<OwnedResponse, ConstructError>;
    fn query_borrowed(&self, q: &OwnedQuery) -> Result<OwnedResponse, ConstructError>;
}
```

- Adds heap (`Vec`, `String`) via `alloc`.
- Can load/unload skills dynamically.
- Still no async runtime.

**Implementation: `PiConstruct`**
- 1024-entry lookup table (heap-allocated `Vec<u8>`).
- Skill set stored as `Vec<SkillId>` with max 16 skills.
- Confidence scores: 0.95 with `TernaryEvolution` loaded, 0.75 otherwise.
- 4KB max payload, all query kinds supported.

#### Layer 2: `AsyncConstruct`

```rust
pub trait AsyncConstruct: SyncConstruct {
    fn request_tool(&mut self, spec: ToolSpec) -> Result<ToolHandle, ConstructError>;
    fn release_tool(&mut self, handle: ToolHandle) -> Result<(), ConstructError>;
    fn active_tools(&self) -> &[ToolHandle];
    fn query_async(&self, q: OwnedQuery) -> impl Future<Output = Result<OwnedResponse, ConstructError>> + Send;
}
```

- Full `std` + async runtime.
- Tool acquisition/release lifecycle.
- Tokio-based runtime.

**Implementation: `DgxConstruct`**
- 4096-entry lookup table.
- 64 skill slots, 32 tool slots.
- Confidence 0.97 with `TernaryEvolution`, 0.88 with any skills, 0.80 bare.
- Simulated async I/O (`tokio::time::sleep(10µs)`).

### 3.2 Core Types (construct-core)

```rust
#[repr(u8)]
pub enum TritAction { Avoid = 0, Explore = 1, Choose = 2 }

#[repr(u8)]
pub enum SkillId {
    TernaryEvolution = 0, RiskAssessment = 1, AnomalyDetection = 2,
    PatternMatching = 3, SensorFusion = 4, DecisionTree = 5,
    KalmanFilter = 6, Custom(u8) = 7,
}

#[repr(u8)]
pub enum QueryKind { Action = 0, Classify = 1, Evaluate = 2, Plan = 3 }

pub enum ConstructError { NotAvailable, RateLimited, Timeout, InvalidQuery, SkillNotLoaded, BadHandle }

#[repr(u8)]
pub enum HardwareTier { Embedded = 0, SingleBoard = 1, Workstation = 2, Cluster = 3 }

pub struct BareMetalCapabilities { lookup_table_size: u16, has_confidence: bool, supported_query_kinds: u8, max_payload_size: u16 }
```

### 3.3 CORTEX → Construct-Core Mapping

| CORTEX Concept | Construct-Core Layer |
|---------------|---------------------|
| `agent.skills[].capabilities` | `Skill` trait methods |
| `agent.skills[].construct_tier` | Layer selection (`BareMetalConstruct` / `SyncConstruct` / `AsyncConstruct`) |
| `tether.protocol` | `TetherTransport` trait (not yet implemented in construct-core) |
| `thalamic_pulse.interval_ms` | `PulseDriver` trait (not yet implemented) |
| `conservation_check` | `Verifier` trait (not yet implemented) |

### 3.4 Source Tree Layout

```
construct-core-src/
├── lib.rs              — Crate root, re-exports, module declarations
├── types.rs            — Core types (TritAction, SkillId, QueryKind, etc.)
├── layer0.rs           — BareMetalConstruct trait
├── layer1.rs           — SyncConstruct trait
├── layer2.rs           — AsyncConstruct trait
├── esp.rs              — EspConstruct (Layer 0, ESP32-class)
├── pi.rs               — PiConstruct (Layer 0+1, Raspberry Pi-class)
└── dgx.rs              — DgxConstruct (All 3 layers, DGX cluster)
```

---

## 4. Gaps Between Spec and Implementation

### 4.1 Gap: Schema ↔ Trait Layer Mismatch

The CORTEX.json schema defines `construct_tier` as an enum with 5 values: `esp32` / `pi` / `worksation` / `dgx` / `browser`. The construct-core implementation has only 3 layer traits (`BareMetalConstruct`, `SyncConstruct`, `AsyncConstruct`) mapped to 4 `HardwareTier` values (`Embedded`, `SingleBoard`, `Workstation`, `Cluster`). **Missing: a `BrowserConstruct` / `tierW` layer.** WASM browser rooms have no trait support — they'd need to implement `AsyncConstruct` using `fetch()` and `postMessage()`, but can't satisfy `Send + Sync` requirements (wasm_bindgen `JsValue` is neither).

### 4.2 Gap: No PulseDriver or Verifier Traits

CORTEX.json declares `thalamic_pulse` (heartbeat) and `conservation_check` (conservation law monitoring). construct-core has **no traits for either**. The pulse driver and conservation verifier are mentioned in the mapping (as `PulseDriver` and `Verifier` traits) but **not implemented** in any layer.

### 4.3 Gap: No TetherTransport Trait

CORTEX.json declares a `tether` section with protocol, vessel path, accepted types, and encoding. construct-core has **no `TetherTransport` trait implementation**. The CORTEX→Construct mapping table lists it as the target but it's not present in the codebase.

### 4.4 Gap: Skill Manifest Not Used by construct-core

The CONSTRUCT-SKILL-SPEC defines a rich `skill.json` manifest with entry points, dependency resolution, tier requirements, conservation profiles, and cross-language bridges. construct-core's `load_skill()` takes a `SkillId` enum (8 hardcoded variants) — **there is no manifest parsing, no dependency resolution, no version checking, no tier validation.** The `ternary-registry` crate is supposed to handle manifest parsing and dependency resolution, but it's not integrated into construct-core's trait surface.

### 4.5 Gap: No Room or Ensign Traits in construct-core

The CONSTRUCT-SKILL-SPEC describes `Room` and `Ensign` traits (from the Room-as-Codespace architecture). construct-core implements **neither**. The `Room` trait (with `enter()`, `tick()`, `send()`, `receive()`, `leave()`) and the `Ensign` trait (with `reason()`, `extract_triggers()`, `cost()`) are described as future phases behind a `rooms` feature gate.

### 4.6 Gap: Hardware Tier Granularity

Construct-core's `HardwareTier` has 4 values. The spec's tier system has 5 (including tierW/WASM). WASM support requires different infrastructure (`JsValue`, `fetch()`, no raw sockets) that doesn't cleanly fit into the existing `Send + Sync`-bound trait hierarchy.

### 4.7 Gap: API Key Flow Not Implemented

The spec describes a PLATO proxy pattern where API keys are stored centrally and proxied to ensigns. construct-core has **no API key management, no proxy endpoint, no encrypted storage.** This is critical for security but entirely deferred.

---

## 5. Security Concerns (From Precision Audit & Critical Review)

### 5.1 Plaintext API Keys

The spec describes API keys flowing through PLATO proxy endpoints. The construct-core implementation has **no key management at all**. Skills cannot be authenticated. There is no audit trail for which skill used which key. If a Codespace room were compromised, there is no mechanism to revoke proxy endpoints at scale.

### 5.2 No Skill Sandboxing

Skills loaded into a construct run with **full privileges of the host process.** There is no WASM sandbox, no seccomp, no Landlock, no capability dropping. The `PiConstruct` and `DgxConstruct` implementations store skills as `Vec<SkillId>` — the skill code runs in the same address space. A malicious or compromised skill could:
- Read/write any memory in the construct process
- Access the filesystem and network with the host's permissions
- Corrupt other loaded skills' state
- Exfiltrate data (including unencrypted API keys if they're ever stored)

### 5.3 No Authentication or Authorization

There is no concept of **skill identity verification.** Any `SkillId` value can be loaded. There is no signature verification on skill manifests. There is no permission model (which skill can call which entry points, which skills can access network or filesystem). The feature flags in CORTEX.json (e.g., `onnx: false`, `landlock: false`) are declarations, not enforcements.

### 5.4 Send + Sync Violations in WASM Context

The `Skill` trait (and transitively `AsyncConstruct`) requires `Send + Sync`. WASM's `JsValue` is neither `Send` nor `Sync`. This means **BrowserConstruct as specified in the architecture documents cannot actually implement the trait** — compilation would fail. Any attempt to force it would require unsafe code circumventing the Send/Sync bounds, creating undefined behavior.

### 5.5 No Input Validation or Resource Limits

The `query_owned()` and `query_async()` methods accept arbitrary byte payloads. There is:
- No payload size enforcement at the trait level (only advisory `max_payload_size` in `BareMetalCapabilities`)
- No recursion depth limiting
- No query rate limiting
- No memory budget per skill
- No CPU time budget per tick

### 5.6 Cross-Crate ID Collision Risk

`ternary-agent::Agent::id`, `ternary-room::Room::id`, and `ternary-protocol::TernaryMessage::sender` all use bare `u64` IDs with **no registry or newtype wrapper.** Two agents from different pools can have the same ID without conflict detection. If the ecosystem ever routes messages across subsystems, this enables ID spoofing and message injection.

### 5.7 Determinism Issue: `AgentPool::ranked()` Non-Deterministic

When two agents have equal fitness, their relative order depends on `HashMap`'s internal (randomized) iteration order. Production code relying on deterministic scheduling would get random tie-breaking, potentially causing non-reproducible behavior in sensitive contexts.

### 5.8 Wire Format Platform Inconsistency (FIXED)

`DgxConstruct::query_owned` used `usize.to_le_bytes()` which produces different widths on 32-bit (4 bytes) vs 64-bit (8 bytes) platforms. **Now fixed** by casting to `u64` first. But this is a category error — the same pattern may exist elsewhere in the codebase.

### 5.9 Critical Review Verdict (from PRECISION-AUDIT)

> "The Construct API is not a systems design document. It is a **fantasy specification** — 2,955 lines of aspirationally typed Rust that collapses under the slightest contact with hardware reality, security requirements, or distributed systems theory."

Specific concerns from the critical review:
- `EspConstruct` is marked `#[no_std]` but `Construct` trait requires `Pin<Box<dyn Future>>` (heap), `String`, `Vec<u8>`, `HashMap`, and `tokio::sync::mpsc::Receiver` — impossible on ESP32.
- `BrowserConstruct` stores skills in `HashMap<SkillHandle, JsValue>` where `JsValue` is neither `Send` nor `Sync`, yet `Skill` trait requires both.
- The "same API on DGX and ESP32" claim is **demonstrably false** given the types and constraints actually written.
- "Latency fiction": hardcoded 50ms to cloud endpoints without justification.
- "State synchronization hand-waving" that would not satisfy distributed systems criteria.

---

## 6. Convergence Map & Migration

### 6.1 Seven Repos → One Fleet

| Original Repo | Ternary Fleet Target |
|---------------|---------------------|
| zeroclaw-arena | `ternary-evolution`, `ternary-cell`, SMP seed (compiled) |
| mud-arena | `ternary-room`, `ternary-cell`, `ternary-current`, `ternary-evolution`, `ternary-ecosystem` |
| zeroclaw-crew | SMP seed, seed inference function, vectorDB |
| dogmind-arena | Ternary trust signal, `ternary-genome`, seed parameters |
| arena-combat-analyst | `ternary-fitness`, seed versioning, strategy species |
| lau-memory-arena | Bare-metal substrate (stays as-is) |
| allocator-rs | Fleet memory coordination (stays as-is) |

### 6.2 Migration Phases

| Phase | Duration | What |
|-------|----------|------|
| **Phase 1:** Substrate | 1–2 weeks | `lau-memory-arena` with CUDA Unified Memory, cross-device sync in `allocator-rs` |
| **Phase 2:** Physics | 2 weeks | Port `ternary-cell`, `ternary-room`, `ternary-current`, `conservation-verify`, `ternary-fitness` |
| **Phase 3:** Evolution | 2 weeks | Port `ternary-evolution`, `ternary-genome`, `ternary-ecosystem`, `ternary-games` |
| **Phase 4:** World | 2 weeks | Port MUD world (RoomGraph, Agent, EventBus) to ternary |
| **Phase 5:** Agents | 2 weeks | Port CHARTER → SMP seed, Brain → seed inference, SKILLS.md → vectorDB |
| **Phase 6:** Trust | 2 weeks | Port Trust → ternary signal, Breeding → genome crossover, Traits → seed params |
| **Phase 7:** Analytics | 2 weeks | Port ELO → fitness, PolicySnapshot → versioning, Archetype → species |
| **Phase 8:** Interface | 2 weeks | Living Spreadsheet, Piano Roll, `=EVOLVE()`, MIDI export |

**Total: ~16 weeks** (10–12 with parallelization).

---

## 7. Open Questions

### 7.1 From Convergence Map

1. **How does the `CompiledPolicy` seed format interact with the living spreadsheet's `=EVOLVE()`?** Can a seed trained in `ternary-evolution` be exported as a spreadsheet formula?
2. **Does `ternary-ecosystem`'s Lotka-Volterra carrying capacity map to the adaptive curriculum from arena-combat-analyst?** The ecosystem claims continuous adjustment; the original used 5 discrete stages.
3. **How does PLATO tile sync work during offline periods?** If ESP32 / Edge rooms go offline, do tiles queue? What's the conflict resolution strategy for concurrent tile generation from multiple rooms?
4. **What's the relationship between `conservation-verify` (crate) and the fleet's measured conservation law (γ + H ≈ 1.283 - 0.159·log(V))?** One is a code-level invariant, the other is an emergent fleet property.

### 7.2 From CORTEX + Construct-Core

5. **Should `cortex_version` move to a living schema registry instead of being baked into manifest files?** Versioning coordination across 200+ skills is a hard problem.
6. **What happens when two agents publish CORTEX.json with the same `agent.id`?** No conflict detection exists in the current spec.
7. **How does skill tier migration work?** If a `tier2` skill needs to run on a `tier1` device (e.g., Jetson), is there a fallback/compilation path, or is it simply unavailable?

### 7.3 From Architecture Review

8. **Should construct-core adopt the Oracle1 6-layer abstraction plane model (Intent → Domain Language → Structured IR → Bytecode → Native → Bare Metal) for skill compilation?** The current 3-tier model (BareMetal/Sync/Async) may be insufficient for the full hardware spectrum from DGX to ESP32.
9. **How does the CORTEX pulse mechanism relate to OpenClaw's heartbeat system?** Oracle2 proposed aligning 30s OpenClaw heartbeats with cross-instance 60s thalamic pulses.

---

## 8. Synthesis Conclusions

### 8.1 What Exists (Real)

- **CORTEX.json v1 spec** — schema published, maps directly to construct-core layers
- **construct-core code** — three trait layers with three implementations (Esp/Pi/DGX), ~700 lines of Rust
- **CONSTRUCT-SKILL-SPEC** — comprehensive spec (~950 lines) covering manifests, tier system, skill lifecycle, energy accounting, triggers, cross-language bridges, versioning
- **IDENTIFIED BUGS** — 5 real bugs fixed in precision audit (pre-tick alive count, Door destination, platform-dependent usize, SkillId serialization, duplicate comment)
- **IDENTIFIED DESIGN ISSUES** — 6 design issues documented (Dividing recovery path, RoomEvent tick=0, from_trit panic, ranked non-determinism, broadcast inconsistency, handshake truncation)
- **Cross-crate inconsistency** — `TritAction` (construct-core) uses 0/1/2 while all other crates use -1/0/+1 with no shared conversion utility

### 8.2 What's Missing (Gaps)

- **No PulseDriver/Verifier/TetherTransport traits** in construct-core despite full spec
- **No room/ensign trait implementation** (Phase 1 deliverable, not started)
- **No skill manifest parsing or dependency resolution** in construct-core
- **No BrowserConstruct/WASM implementation** (impossible with current Send+Sync bounds)
- **No security** (no sandboxing, no auth, no key management, no input validation)
- **No API key flow** (PLATO proxy endpoints not implemented)
- **Conservation law monitoring** is spec-only, not implemented anywhere

### 8.3 What's At Risk

- **Hardware abstraction claim** ("same API on DGX and ESP32") is falsified by the actual types — `Pin<Box<dyn Future>>`, `String`, `Vec`, `HashMap`, `tokio` runtime requirements on no_std ESP32 targets
- **Browser platform support** is architecturally blocked by Send+Sync requirements
- **Security posture** is essentially nonexistent — plaintext keys, no sandboxing, no auth
- **Coordination protocol** between CORTEX.json publishing and construct-core implementation is undefined — the spec is ahead of the runtime

---

*"First, the schema. Then the runtime. Then the pulse."*
— Oracle2, 2026-06-05
