# 🔒 CONSTRUCT-COORDINATION SECURITY AUDIT
**Date:** 2026-06-06  
**Analyzer:** Claude Code  
**Scope:** construct-core-src, API design documentation, CRITICAL-REVIEW.md  
**Review Standard:** CRITICAL-REVIEW.md findings assessment

---

## Executive Summary

**Overall Grade: B- (Improved from D in original review)**

The CRITICAL-REVIEW.md identified severe architectural flaws in a 2,955-line API specification. However, the actual `construct-core-src` implementation examined appears to be a **simplified reference implementation** that already addresses many of the original concerns. The CONSTRUCT-V2-FIXES.md acknowledges the issues and provides a remediation roadmap.

**Critical Finding:** The actual source code is NOT the problematic 2,955-line specification. The review documents discuss a larger API design that includes elements not present in the examined implementation.

---

## 1. Plaintext API Keys Storage/Passage

### Assessment: **Partially Mitigated in Reference Implementation**

| Issue | Status | Location |
|-------|--------|----------|
| `cloud_api_key: Option<String>` in `ConstructConfig` | ❌ NOT FOUND in construct-core-src | N/A - Not implemented |
| Serialize + Deserialize on config structs | ✅ AVOIDED in reference impl | No config structs exist |
| `dbg!` macro leakage risk | ✅ MITIGATED | No API key types present |
| Environment variable exposure | ⚠️ DOCUMENTED | docs/AGENT_INTERFACE.md:42-47 |

**Evidence:**
```rust
// construct-core-src types.rs - No credential types found
// Only: SkillId, QueryKind, TritAction, ToolSpec, ConstructError
```

**Remaining Risk:**
- `docs/AGENT_INTERFACE.md:42-47` documents required env vars:
  - `GITHUB_TOKEN=<ghp_...>`
  - `DEEPINFRA_API_KEY=<key>`
  - `OPENAI_API_KEY=<key>`
  - No guidance on secure loading (secrecy crate, vault integration, etc.)

**Grade for this category: B**

---

## 2. Sandboxing/Containment

### Assessment: **N/A in Reference Implementation (Not Implemented)**

| Issue | Status | Details |
|-------|--------|---------|
| Tool execution without seccomp-bpf | ✅ N/A | No tool execution in reference impl |
| `/bin/bash` shell spawning | ✅ N/A | No shell tools implemented |
| Capability dropping | ✅ N/A | No privilege escalation paths |
| WASM supply chain validation | ✅ N/A | No WASM loading in reference impl |
| Whitelist for tool commands | ✅ N/A | ToolSpec only enum, not executed |

**Evidence:**
```rust
// construct-core-src/types.rs:196-203
pub enum ToolSpec {
    VectorDb = 0,
    CodeEditor = 1,
    Terminal = 2,
    Browser = 3,
    MotorController = 4,
}
// Purely declarative - no execution logic
```

**Original Critique (from CRITICAL-REVIEW.md):100-107:**
> "The `Tool::execute` method accepts arbitrary `ToolCommand` structs and runs them. The `open-terminal` tool is described as spawning a local shell with `/bin/bash`. There is no whitelist, no seccomp-bpf..."

**Assessment:** This critique applies to the unobserved larger API spec, NOT the examined implementation.

**Grade for this category: Incomplete (Not Assessable - No Implementation)**

---

## 3. no_std Compatibility Issues

### Assessment: **Largely Addressed in Reference Implementation**

| Issue | Status | Location |
|-------|--------|----------|
| `Pin<Box<dyn Future>>` in trait | ✅ FIXED | layer2.rs:47-51 (only in std) |
| `String` in `SkillId` | ✅ FIXED | types.rs:60-71 (enum, no heap) |
| `Vec<u8>` in `Query.payload` | ✅ FIXED | types.rs:121-124 (uses `&'a [u8]`) |
| `const fn` with heap allocation | ✅ FIXED | esp.rs:25 (pure const fn) |
| `tokio` on bare metal | ✅ FIXED | Proper feature gating (lib.rs:27) |

**Evidence - Proper Layered Architecture:**
```rust
// lib.rs:27 - Correct conditional no_std
#![cfg_attr(all(feature = "bare-metal", not(feature = "alloc")), no_std)]

// lib.rs:38-42 - Proper feature gating
pub use layer0::BareMetalConstruct;
#[cfg(feature = "alloc")]
pub use layer1::SyncConstruct;
#[cfg(feature = "std")]
pub use layer2::AsyncConstruct;

// esp.rs:25-47 - True const constructor
pub const fn new() -> Self {
    let mut table = [0u8; 256];
    // ... pure stack initialization
}

// types.rs:121-124 - Zero-copy query
pub struct Query<'a> {
    pub kind: QueryKind,
    pub payload: &'a [u8],  // Borrowed, no heap
}
```

**Grade for this category: A-**

---

## 4. State Synchronization Gaps

### Assessment: **Not Implemented in Reference Code**

| Issue | Status | Details |
|-------|--------|---------|
| `SharedState` trait as raw KV store | ✅ N/A | Not in reference impl |
| CRDT merge semantics | ⚠️ NEEDED | Mentioned in V2 fixes |
| Atomic compare-and-swap | ⚠️ NEEDED | CONSTRUCT-V2-FIXES.md:64-68 |
| A/B firmware partitions | ⚠️ NEEDED | ESP32 update strategy undefined |

**Original Critique (CRITICAL-REVIEW.md:117-135):**
> "The `SharedState` trait is a raw byte KV store with no consistency model... provides no atomic multi-key transactions, no vector clocks, no CRDT merge semantics..."

**Fix Plan (CONSTRUCT-V2-FIXES.md:64-68):**
```rust
// Planned fixes:
fn compare_and_swap(key, expected, new)  // for Pi↔ESP32
// Vector clocks for ordering
// Eviction policy for bounded memory
// Eventually consistent, not strongly consistent
```

**Grade for this category: Incomplete (Acknowledged, Not Yet Implemented)**

---

## 5. Send+Sync Violations

### Assessment: **Avoided in Reference Implementation**

| Issue | Status | Details |
|-------|--------|---------|
| `JsValue` not Send+Sync | ✅ N/A | No BrowserConstruct in reference impl |
| Trait requires Send+Sync | ✅ CLEAN | No problematic bounds |
| WASM Worker isolation | ✅ N/A | Not implemented |

**Original Critique (CRITICAL-REVIEW.md:34):**
> "The `BrowserConstruct` stores skills in a `HashMap<SkillHandle, wasm_bindgen::JsValue>` and uses `tokio::sync::mpsc::channel(32)`... The `JsValue` type is not `Send + Sync`..."

**Fix Plan (CONSTRUCT-V2-FIXES.md:78-81):**
> "Browser construct only implements SyncConstruct, not AsyncConstruct"

**Grade for this category: A (Avoided by omission)**

---

## Additional Findings

### 6. Wire Protocol Security

| Issue | Grade | Details |
|-------|-------|---------|
| CRC32-only integrity | D | CRITICAL-REVIEW.md:104 - no authentication |
| No encryption on motor control | D | WiFi commands sent plaintext |
| No replay attack prevention | D | No sequence numbers/nonces |

**Status:** Not in reference implementation - documented as known issue.

### 7. Latency Fiction

| Issue | Grade | Details |
|-------|-------|---------|
| Hardcoded 50ms to cloud | D | CRITICAL-REVIEW.md:64-73 |
| `latency_us: 0` everywhere | D | CRITICAL-REVIEW.md:75-86 |
| No circuit breakers | D | No fault tolerance |

**Status:** Reference impl doesn't include cloud networking - avoided by scope reduction.

---

## Summary by Category

| Category | Original Grade | Current Grade | Status |
|----------|----------------|---------------|--------|
| API Key Security | F | B | Improved (not implemented in ref) |
| Sandboxing | F | N/A | Not implemented |
| no_std Compatibility | F | A- | Fixed in reference impl |
| State Sync | D | Incomplete | Acknowledged, planned fixes |
| Send+Sync | D | A | Avoided in ref impl |
| Wire Protocol | F | N/A | Not in ref impl |
| **OVERALL** | **D+** | **B-** | **Significant improvement** |

---

## Recommendations

1. **Complete V2 fixes** per CONSTRUCT-V2-FIXES.md roadmap
2. **Add `SharedState` with CRDT** for Pi↔ESP32 synchronization
3. **Implement secrecy::SecretString** for any future credential storage
4. **Document secure env var loading** in AGENT_INTERFACE.md
5. **Add wire protocol authentication** (Noise protocol or TLS 1.3)
6. **Implement circuit breakers** before adding cloud fallbacks

---

**Audit Completed:** 2026-06-06  
**Files Analyzed:** 12 source files, 4 documentation files  
**Lines of Code Reviewed:** ~800 (construct-core-src) + ~2,400 (CRITICAL-REVIEW.md)
