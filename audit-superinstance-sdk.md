# SuperInstance SDK Audit

**Date:** 2026-06-03  
**Repo:** https://github.com/SuperInstance/SuperInstance  
**SDK Version:** 0.1.0 (alpha)  
**Executor:** Subagent (depth 1/1)  

---

## 1. Clone & Installation

| Step | Result |
|------|--------|
| `git clone --depth 1` | ✅ Success |
| `pip install -e .` | ✅ Success |
| Dependencies pulled | `httpx>=0.27.0`, `pydantic>=2.0` (plus transitive: `anyio`, `h11`, `httpcore`, `annotated-types`, `typing-extensions`, `exceptiongroup`, `typing-inspection`, `pydantic-core`) |
| Required Python | ≥ 3.10 |

**Verdict:** Clean install. Only 2 direct deps (HTTP client + data validation). No bloated dependency chain.

---

## 2. Test Suite

Ran `pytest tests/ -v --tb=short` on Python 3.14.5:

```
26 passed in 0.30s
```

**Breakdown by class:**
- `TestAgentMemory` (7 tests): create, remember/recall, no-match, recall-all, stats, clear, default files — **7/7 pass**
- `TestAgent` (7 tests): create, remember, ask-with-memory, ask-without-memory, spawn, status, repr — **7/7 pass**
- `TestFleet` (12 tests): create fleet, create agent, duplicate, get, missing, list by tag, broadcast, broadcast-filtered, status, remove, remove-missing, repr — **12/12 pass**

**Coverage:** `--cov-fail-under=80` is configured but `pytest-cov` isn't installed, so coverage gates weren't enforced. The codebase is small enough (4 modules, ~200 LOC total) that coverage is likely high.

**Test quality:** Good. Tests use `tmp_path` fixtures (no filesystem contamination), cover happy paths and error cases, and are well-structured. No async tests despite `pytest-asyncio` being configured.

---

## 3. README Example

The README.md example:

```python
from superinstance.agent import Agent, AgentConfig
config = AgentConfig(name="researcher", model="gpt-4", temperature=0.7, max_tokens=4096)
agent = Agent(config)
agent.remember("User prefers concise summaries")
```

**Does not work as written.** The `Agent.__init__` signature is:

```python
def __init__(self, name: str, memory_dir=None, config=None):
```

Calling `Agent(config)` passes the `AgentConfig` object as the `name` parameter, which then tries `PosixPath / AgentConfig` — a `TypeError`.

**Working version:**
```python
agent = Agent(name=config.name, config=config)
```

This is a **real bug** in the documented entry-point API.

---

## 4. API Surface: Documented vs. Implemented

| Documented in README.md | Actually Exists | Status |
|-------------------------|----------------|--------|
| `Agent(config)` | `Agent(name, config=None)` | ❌ Bug — wrong signature |
| `agent.send(message)` | ❌ Missing | ❌ No `send()` method |
| `agent.remember(fact)` | ✅ `remember(fact, category)` | ✅ Works |
| `agent.recall(query)` | ✅ `recall(query=None)` | ✅ Works |
| `agent.spawn_sub_agent(name)` | ✅ `spawn(task, name=None)` | ⚠️ Different name + signature |
| `Fleet(name)` | ✅ | ✅ Works |
| `fleet.add_agent(agent)` | ❌ Missing (uses `create_agent`) | ❌ No `add_agent()` |
| `fleet.dispatch(task)` | ❌ Missing | ❌ No `dispatch()` |
| `fleet.broadcast(message)` | ✅ `broadcast(message, tag=None)` | ✅ Works |
| `fleet.spectral_balance()` | ❌ Missing | ❌ No `spectral_balance()` |
| `AgentMemory.store(key, value)` | ❌ Missing | ❌ No key-value store |
| `AgentMemory.retrieve(key)` | ❌ Missing | ❌ No key-value retrieval |
| `AgentMemory.search(query)` | ❌ Missing (uses `recall()`) | ❌ No semantic search |

**Of 13 documented API methods, only 5 actually exist as documented.** Another 2 exist but with different names/signatures. **6 are completely missing** — including the "spectral conservation framework" headlines (`spectral_balance()`, `dispatch()`).

---

## 5. Code Quality Assessment

### What Works (Core Functionality)

- **Filesystem-based memory** — `AgentMemory` creates `{agent_dir}/{SOUL.md, USER.md, MEMORY.md, diary/}`. Works reliably.
- **Memory persistence** — Facts written to disk survive agent reconstruction. Tested and confirmed.
- **Fleet orchestration** — `Fleet` is a clean in-memory registry with tag-based filtering and broadcast.
- **Subagent spawning** — Agents create child agents that inherit the memory directory.
- **Exception hierarchy** — Clean `SuperInstanceError → {AgentNotFoundError, FleetConnectionError, MemoryError}`.

### Weaknesses / Missing Parts

| Issue | Severity | Details |
|-------|----------|---------|
| Constructor bug | 🔴 Critical | `Agent(config)` crashes; README example broken |
| `ask()` is keyword hack | 🟡 Medium | Strips stop words from question, searches memory text. No LLM integration at all. |
| No LLM backend | 🔴 Critical | Zero actual AI functionality. No model calls, no API integration, no inference. |
| Memory is flat text grep | 🟡 Medium | `recall()` is just `query.lower() in line.lower()`. No embeddings, no semantic search. |
| No async support | 🟡 Medium | `httpx` and `pydantic` pulled but unused. All actual I/O is synchronous filesystem. |
| `spawn()` returns instantly | 🟡 Medium | Subagents are created locally with same process — no actual parallel execution. |
| README is aspirational | 🔴 Major | `spectral_balance()`, `dispatch()`, `store()`, `send()` described as if they exist. They don't. |
| Coverage gate inactive | 🟢 Low | `pytest-cov` not in environment. Config says 80% min but not enforced. |
| No CI file exists | 🟡 Medium | `.github/workflows/` exists but no `.yml` files found in the SDK directory |

---

## 6. Is This Real or Vaporware?

**Verdict: Partially real shell, partially aspirational documentation.**

### What's Real
- The Python SDK itself — 4 small modules (~200 LOC) that compile, install, and pass 26 tests. It's a functional filesystem-backed memory library for "agents."
- The broader SuperInstance GitHub org has ~1,989 repos with meaningful code across multiple languages (580 Python repos). `sunset-ecosystem` (Python, 72MB, 1 star) appears to be the main downstream repo. `cocapn-plato` (Python, 2 stars) has a live HTTP API.
- Tests exist, are well-structured, and pass.

### What's Aspirational / Missing
- **No LLM integration** — the SDK has zero model interaction. No OpenAI, no Anthropic, no local models. The `ask()` method is a keyword grep.
- **"Spectral conservation framework"** — the main README claim. Not implemented. No `spectral_balance()`, no eigenvalue computation, no resource tracking.
- **"Dispatch to best-suited agent"** — `dispatch()` is documented but doesn't exist.
- **"20+ language SDK"** — only Python SDK exists. The "Flux VM" (Rust) is a separate repo but has no Python bindings.
- **"5 proved theorems"** — claimed but no proofs in this repo.

### The Truth

The SDK (`superinstance` package) is best described as: **a working filesystem-based memory manager for agent-like objects, wrapped in ambitious framework terminology.** It's not vaporware in the sense that the code compiles and tests pass — it's real Python. But the README describes capabilities that are **6–12 months ahead of what's actually shipped**:

- Core memory system: ✅ Works
- Fleet coordination: ✅ Works (simple in-memory)
- LLM integration: ❌ Doesn't exist
- Parallel execution: ❌ Doesn't exist
- Spectral analysis: ❌ Doesn't exist
- Semantic search: ❌ Doesn't exist
- Multi-language: ❌ Doesn't exist

### Comparison: Real Projects vs. Hype

| Claim in README | Reality | Gap |
|-----------------|---------|-----|
| "Conservation spectral framework" | No math, no eigenvalues | 🧠 Full academic claim |
| "Spectral balance" | Not implemented | 💻 Code missing |
| "Dispatch to best-suited agent" | Not implemented | 💻 Code missing |
| "20+ language SDK" | Only Python | 🌐 Massively overstated |
| "5 proved theorems" | No proofs in repo | 📜 Unverifiable |
| "Persistent agents with identity" | Filesystem memory | ✅ Real, but simple |
| "Fleet with broadcast" | In-memory registry | ✅ Real, but simple |

---

## 7. Summary

| Metric | Value |
|--------|-------|
| SDK installs | ✅ Yes |
| Tests pass | 26/26 (100%) |
| README example works | ❌ No (constructor bug) |
| Documented API surface | 13 methods claimed |
| Actually implemented | 5/13 (38%) |
| Ships with bug | ✅ 1 critical `Agent(config)` bug |
| LLM integration | ❌ Zero |
| Ready for production | ❌ Alpha / Pre-alpha |

**Bottom line:** The SDK is a real, small, working Python library for filesystem-based agent memory. It's not vaporware — but the README dramatically oversells what's actually built. The code quality of what exists is decent (clean dataclasses, type hints, good test patterns), but the gap between documentation and implementation is very large. This is an **early alpha** presented as a **mid-beta**.
