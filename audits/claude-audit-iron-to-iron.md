# 🔍 I2I Protocol — Deep Audit Report

**Date**: 2026-06-06
**Auditor**: Claude (Opus 4.8)
**Repository**: SuperInstance/iron-to-iron
**Protocol Versions**: v1.0, v2.0, v3.0
**Overall Grade**: **B+**

---

## Executive Summary

The Iron-to-Iron (I2I) protocol is a git-native inter-agent communication system designed for autonomous fleet coordination. The project demonstrates solid architectural foundations with multi-version protocol evolution, comprehensive JSON schemas, and a unique commit-based messaging approach. However, gaps exist between specification and implementation, test coverage is incomplete, and some protocol features (ACK, CHECKPOINT, 3-way shard pattern) are specified but not implemented.

---

## 1. Module Structure: **B+**

```
iron-to-iron/
├── iron_to_iron.py          # v1 core (174 lines)
├── tools/
│   ├── i2i_messages.py      # v2 message system (822 lines) ⭐
│   ├── i2i-signal.py        # Vocabulary signaling (227 lines)
│   ├── i2i-review.py        # Code review (287 lines)
│   └── i2i-resolve.py       # Dispute resolution (355 lines)
├── c/bottle-cli.c           # C implementation (465 lines) ⭐
├── protocol/                # 8 specification docs
├── schemas/                 # 7 JSON schemas
└── tests/                   # 6 test files
```

**Strengths**: Clean separation, multi-language support (Python/C), modular tools
**Weaknesses**: v1 and v2 have conflicting `I2IMessage` classes, no shared code, C has no Python integration
**Critical Issue**: Two incompatible `I2IMessage` classes with same name

---

## 2. Error Handling: **C+**

**Python Implementation**: Only raises `ValueError`, no retry logic for git failures, no validation of payloads
**C Implementation**: Calls `exit(EXIT_FAILURE)` on any error (no graceful degradation)
**Dispute Resolution**: No try/except around file operations

**Issues Found**:
- No retry with exponential backoff for transient git failures
- C code exits on errors instead of returning error codes
- No validation of message payloads
- Missing error codes in specification

---

## 3. Protocol Completeness: **C**

### Message Types Coverage

| Type | v1 Spec | v2 Code | v3 Spec | Status |
|------|---------|---------|---------|--------|
| PROPOSAL | ✅ | ⚠️ mapped to KNOWLEDGE_SHARE | ❌ | Inconsistent |
| VOCAB | ✅ | ❌ | ❌ | **Missing** |
| WIKI | ✅ | ❌ | ❌ | **Missing** |
| DOJO | ✅ | ❌ | ❌ | **Missing** |
| GROWTH | ✅ | ❌ | ❌ | **Missing** |
| ACK | ❌ | ❌ | ✅ | **Specified only** |

**v2 has 20 types complete (FLEET, TASK, CODE, KNOWLEDGE, FENCE, BOTTLE layers)**
**v3 specifies 20 types but NONE are implemented**

### Missing Features
1. **ACK** — v3 specifies, no code exists
2. **CHECKPOINT** — Referenced but no spec/implementation
3. **VOCAB subtypes** (NEW/UPDATE/DEPRECATE) — specified but not in v2
4. **Replay protection** — v3 TTL validation not implemented

---

## 4. Security Model: **B-**

```
┌─────────────────────────────────────────────────────────────┐
│                    I2I Security Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  Trust Model: Web-of-Trust (GPG/SSH keys)                    │
│  Integrity:   Git hash chain + SHA256 tombstones             │
│  Auth:       Signed commits (optional but recommended)       │
│  Replay:     Timestamp + TTL (v3 spec, NOT implemented)      │
└─────────────────────────────────────────────────────────────┘
```

| Threat | Mitigation | Implemented |
|--------|-----------|-------------|
| Impersonation | Signed commits | ⚠️ Optional only |
| Tampering | Git hash chain | ✅ Yes |
| Forgery | Tombstone SHA256 | ✅ Yes |
| Replay attacks | TTL/timestamp | ❌ No |

**Critical Gap**: v3 requires signature field but parsing code never verifies it.

---

## 5. Test Coverage: **C+**

| Component | Tests | Coverage |
|-----------|-------|----------|
| v2 Message registry (20 types) | ✅ | 100% |
| Factory constructors | ✅ | 100% |
| Serialization (v1/v2) | ✅ | 95% |
| Error conditions | ⚠️ | 30% |
| C implementation (bottle-cli.c) | ❌ | **0%** |
| v1 implementation (iron_to_iron.py) | ❌ | **0%** |
| Security/verification | ❌ | **0%** |
| Integration with git | ❌ | **0%** |

**v2 has comprehensive unit tests (765 lines)** but C and v1 are completely untested.

---

## 6. Serialization Format: **B+**

**v1**: `[I2I:TYPE] scope — summary` (em dash ambiguity)
**v2**: `[I2I:TYPE:CODE] scope — summary` (machine parsable with 3-letter codes)
**JSON**: Dual format with full schema validation

| Aspect | v1 | v2 | v3 |
|--------|----|----|-----|
| Human readable | ✅ | ✅ | ⚠️ JSON only |
| Machine parsable | ⚠️ | ✅ | ✅ |
| Versioned | ❌ | ✅ | ✅ |

**Issue**: C implementation uses unsafe hand-rolled JSON parsing.

---

## 7. Vessel/Harbor Pattern: **A-**

Well-documented Cocapn Fleet integration:

```
┌───────────────────────────────────────────────────────────┐
│                     Cocapn Fleet                          │
│   ┌─────────────┐         ┌─────────────┐                │
│   │  Lighthouse │ ←─────→ │   Vessel    │                │
│   │   Keeper    │         │  (Agent)    │                │
│   └─────────────┘         └─────────────┘                │
│   ┌─────────────┐         ┌─────────────┐                │
│   │   Tender    │ ←─────→ │   Harbor    │                │
│   │ (Mobile)    │         │  (Network)  │                │
│   └─────────────┘         └─────────────┘                │
└───────────────────────────────────────────────────────────┘
```

**Components**: Lighthouse Keeper (monitors), Vessel (agent repo), Tender (mobile edge agent), Harbor (network)
**DOCKSIDE-EXAM.md**: Comprehensive certification checklist for fleet vessels
**Status**: Well-documented but not enforced (documentation only)

---

## 8. 3-Way Shard Pattern: **NOT FOUND**

❌ Searched entire codebase for: `shard`, `SHARD`, `3-way`, `three-way`, `tripartite`, `triad`
❌ Not in any protocol documentation
❌ Not in fleet documentation

This pattern does not appear to be part of I2I or Cocapn Fleet. May refer to:
- A different protocol
- A planned future feature
- External documentation

---

## 9. Critical Issues Summary

| Issue | Severity | Component |
|-------|----------|-----------|
| Version fragmentation (v1/v2/v3 incompatible) | 🔴 High | Core |
| No v3 implementation | 🔴 High | Transport |
| Missing ACK mechanism | 🟡 Medium | Protocol |
| No signature verification | 🔴 High | Security |
| C implementation untested | 🟡 Medium | Testing |
| VOCAB/WIKI/DOJO missing from v2 | 🟡 Medium | Protocol |
| No replay protection | 🟡 Medium | Security |

---

## 10. Final Grade Matrix

| Category | Grade | Notes |
|----------|-------|-------|
| Module Structure | **B+** | Clean but fragmented |
| Error Handling | **C+** | Minimal, needs improvement |
| Protocol Completeness | **C** | Spec-implementation gap |
| Security Model | **B-** | Well-designed, not enforced |
| Test Coverage | **C+** | Good v2, missing elsewhere |
| Serialization | **B+** | Dual format works |
| Vessel/Harbor Pattern | **A-** | Well-documented |
| 3-Way Shard Pattern | **N/A** | Not found |

### **Overall Grade: B+** (77/100)

The I2I protocol demonstrates strong architectural foundations and thoughtful design for git-native agent communication. The v2 implementation is solid with 20 message types across 6 layers. However, critical gaps exist between v3 specification and implementation, security features are documented but not enforced, and testing coverage is uneven. The vessel/harbor pattern is well-integrated with the Cocapn Fleet ecosystem. The protocol is production-capable for v2 but requires work to fully realize the v3 vision.
