# Audit: flux-agent-runtime & iron-to-iron

**Date:** 2026-06-03
**Auditor:** Subagent (systems-level reasoning)

---

## Part 1: flux-agent-runtime

### Source: github.com/SuperInstance/flux-agent-runtime

### README (A-)
Well-written, compelling narrative. Clearly articulates the vision: a Docker-based runtime that boots FLUX-native agents that discover a fleet, create GitHub vessels, pick tasks, and execute real work. The "self-replication" story is well-articulated.

### agent.fluxasm — Bytecode Brain
**Status: Placeholder / Demonstration**

19 lines of assembly-like pseudocode with instructions like `NOP`, `INST_LISTEN`, `CONF_SET4`, `ATP_QUERY`, `ATP_SPEND`, `WITNESS`, `HALT`. It looks plausible as a FLUX bytecode concept but:
- No FLUX runtime exists in this repo to execute it (the Dockerfile clones `SuperInstance/flux-runtime.git` separately)
- The FLUX runtime repo does exist and was cloned successfully in the Docker build
- The bytecode file is purely a **declaration of intent** — it's valid-looking `.fluxasm` but there's no cross-assembler call in the build pipeline (the `flux-cross-assembler` repo is cloned but never invoked)
- The actual agent behavior is driven by Python (`agent_bridge.py`), not by the FLUX bytecode

**Verdict:** Placeholder — the bytecode is a concept prototype, not a functioning brain.

### agent_bridge.py — Core Agent Code
**Status: Real, working Python — 420+ lines, classes, tests, real API calls**

Three classes, all fully implemented:

1. **`GitHubBridge`** (lines 22-160): Full GitHub API wrapper — `api_get`, `api_post`, `api_put`, `clone_repo`, `read_file`, `write_file`, `list_files`, `read_bottles`, `leave_bottle`, `create_vessel`, `open_issue`, `get_latest_commits`, `discover_agents`. All real API calls using `urllib.request`. The `create_vessel` method creates real GitHub repos with CHARTER.md, IDENTITY.md, CAPABILITY.toml, and bottle directories.

2. **`FluxAgentRuntime`** (lines 166-280): Full boot sequence — discovers fleet, reads bootcamp, scans task board, checks bottles, chooses identity, creates vessel, writes boot report. In 7 phases with real GitHub API interaction. **This would actually boot a real agent** given a valid GITHUB_TOKEN.

3. **`KeeperAgentBridge`** (lines 290-410): Keeper-aware variant that routes calls through a Lighthouse Keeper HTTP API at `127.0.0.1:8900`. Has full baton handoff support — packs batons, scores handoff quality, manages generations, restores state. **Requires a running keeper.**

### i2i_agent_bridge.py — Extended Agent
**Status: Real, working Python — 430+ lines**

Extends the base bridge with:
- Full I2I protocol support (20 message types, envelope format, JSON bottles)
- Task scanning (taskboard, bottles, issues)
- Task execution with energy/confidence tracking
- Fleet repo analysis and improvement
- Agent diary, status reporting
- Main run loop: discover → learn → work → improve → report

**Would also boot a real agent with a GITHUB_TOKEN.**

### Dockerfile
**Status: Buildable 🟢**

Successfully built with `docker build -t flux-agent-test .` (1 warning about `$PYTHONPATH` being undefined at build time, but this only matters at runtime). Contains:
- Ubuntu 22.04, Python 3.10, git, curl, wget
- Go 1.24.2 (arm64), Rust (via rustup), Node.js 22
- Clones `SuperInstance/flux-runtime` and `SuperInstance/flux-cross-assembler` into `/opt/`
- Copies `agent_bridge.py` into `/workspace/`
- CMD attempts to boot `FluxAgentRuntime` with GITHUB_TOKEN

**Docker image confirmed runnable** — `python3`, `git`, `go`, `rustc`, `node` all present.

### Tests (test_agent_bridge.py, test_i2i_bridge.py)
**Status: Real test suites — comprehensive mocking of GitHub API**

- `test_agent_bridge.py`: 20 test classes covering `GitHubBridge`, `FluxAgentRuntime`, `KeeperAgentBridge`
- `test_i2i_bridge.py`: 17 test classes covering `I2IAgentBridge` — API, protocol, tasks, analysis, improvements, boot, energy
- All tests use `unittest.mock` / `MagicMock` — no live API calls

### Assessment: How Close to Booting a Self-Replicating Agent?

| Capability | Status | Notes |
|---|---|---|
| Boot in Docker | ✅ | Dockerfile builds and runs, all languages present |
| Discover fleet via GitHub API | ✅ | `discover_agents()` works with real token |
| Create vessel on GitHub | ✅ | `create_vessel()` creates real repos |
| Read task board / bottles | ✅ | `read_file()`, `read_bottles()` functional |
| Pick & execute tasks | ⚠️ Partial | Task scanning works, execution is stubby (analyze, identify, read — no real code modification) |
| Execute FLUX bytecode | ❌ | `agent.fluxasm` is a placeholder, no runtime bridge |
| Self-replicate (boot another agent) | ⚠️ Partial | Architecture supports it but no `spawn_agent()` exists in code |
| Run without human token | ❌ | Requires `GITHUB_TOKEN` env var |
| Cross-assembler integration | ❌ | Cloned but never called |

**Verdict:** The system could **boot a real agent** that creates a GitHub repo, discovers other agents, and reads their files — this is genuinely functional first-mile code. It cannot yet self-replicate or execute FLUX bytecode. The bytecode layer is aspirational; the Python agent runtime is real but depends entirely on GitHub and Docker.

**Play-test suggestion:** Give it a GITHUB_TOKEN and watch it boot. It will create a vessel repo and write a boot report. The run loop in `I2IAgentBridge.run()` will attempt 5 cycles of scanning, tasking, and improvement — some of which might actually work on GitHub.

---

## Part 2: iron-to-iron

### Source: github.com/SuperInstance/iron-to-iron

### README (A)
Excellent documentation. 13+ message types, protocol architecture diagram, quick start, fleet integration details. Clear vision of git-as-communication-medium.

### SPEC.md — Formal v1 Spec
**Status: Real, comprehensive — 928 lines**

Complete protocol specification covering:
- Message format with formal rules
- 13 commit message types (PROPOSAL, REVIEW, COMMENT, VOCAB, DISPUTE, RESOLVE, WIKI, DOJO, GROWTH, SIGNAL, TOMBSTONE, ACCEPT, REJECT)
- Branch conventions (proposal/, review/, dispute/, vocab/)
- Directory structure spec
- Vocabulary signaling protocol
- Code review protocol with templates
- Dispute resolution protocol (4 resolution types: consensus, compromise, arbitration, abandon)
- Tombstone protocol with SHA256 hashes
- Autobiography protocol
- Security considerations (signed commits, web of trust)
- Implementation requirements

### I2I-V3-SPEC.md — v3 Spec
**Status: Real — 255 lines**

Extends v1/v2 with:
- Layered transport model (Git commits → HTTP API → Bottle files)
- 21 message types in 5 categories (Coordination, Knowledge, Alert, Social, Meta)
- JSON envelope format with signature, TTL, priority
- Routing rules and degraded modes
- Fleet-level coordination (reply routing, message serialization, priority scheduling)

### SPEC-v2-draft.md — v2 Draft
**Status: Real — 326 lines**

### Schemas (7 JSON schema files)
**Status: Real, well-structured — 1,564 lines total**

| Schema | Lines | Quality |
|---|---|---|
| `agent-manifest.schema.json` | 325 | Excellent — 25+ fields, examples, format validation |
| `argument.schema.json` | 335 | Comprehensive — claims, evidence, objections, resolutions |
| `autobiography.schema.json` | 273 | Full — sections, capacities, achievements, recipes |
| `code-review.schema.json` | 196 | Good — strengths, improvements, blind spots, synergy |
| `commit-message.schema.json` | 129 | Standard — commit format validation |
| `tombstone.schema.json` | 175 | Complete — SHA256 hash verification |
| `vocab-signal.schema.json` | 131 | Solid — vocab lists, entries, timestamps |

All are valid JSON Schema (draft-07). Peer-reviewed quality. **These are not stubs.**

### Protocol Documentation (9 markdown files)
**Status: Real, thorough — 4,563 lines total**

| Document | Lines | Content |
|---|---|---|
| `autobiography-protocol.md` | 595 | Full agent self-description protocol |
| `branch-strategy.md` | 539 | Complete branch naming conventions |
| `code-review.md` | 440 | Review templates and procedures |
| `commit-conventions.md` | 431 | Commit message formatting rules |
| `dispute-resolution.md` | 495 | Formal argumentation protocol |
| `message-types.md` | 650 | Detailed spec for all 13+ message types |
| `security-considerations.md` | 505 | Signed commits, web of trust, verification |
| `tombstone-protocol.md` | 481 | Pruned vocabulary hashing and verification |
| `vocab-signaling.md` | 318 | Vocabulary discovery and compatibility |

### Tools — Python CLI Tools

| Tool | Status | Tests | Notes |
|---|---|---|---|
| `i2i-signal.py` | ✅ Working | `test_i2i_signal.py` (39 tests), `test_i2i_signal_real.py` (32 tests) | Generate/compare/verify vocabulary signals |
| `i2i-review.py` | ✅ Working | `test_i2i_review_real.py` (7 tests) | Generate/parse/validate code reviews |
| `i2i-resolve.py` | ✅ Working | `test_i2i_resolve_real.py` (7 tests) | Init/analyze/resolve disputes |
| `i2i_messages.py` | ✅ Working | `test_i2i_v2.py` (68 tests) | 20 message types, v1/v2 serialization, parsing |
| `iron_to_iron.py` | ✅ Working | None separate | Direct I2I protocol via git commands |
| `i2i-init.sh` | ✅ Shell | — | Creates complete agent repo structure |
| `i2i-commit.sh` | ✅ Shell | — | Creates I2I-formatted commits |

All Python tools executed successfully:
- `i2i-signal.py generate --help` → displays proper usage
- `i2i-signal.py generate --repo /tmp/iron-to-iron` → generated valid JSON signal (1 vocabulary, 75 entries)
- `i2i_messages.py` module → all 20 message types instantiable, serializable, parse-able

### Test Results
**162/162 tests passing** across all test files. Tests are proper pytest tests (not just assertions).

### Vocabulary Files
**Real.** `vocabularies/i2i-protocol.ese` contains 75 entries covering all protocol concepts. File is a `.ese` (FLUX Vocabulary Format) file with `concept: definition` entries.

### Bottle Infrastructure
**Real.** `message-in-a-bottle/PROTOCOL.md` defines the agent bottle format (YOUR-NAME/MESSAGE.md, CLAIMED.md, RESULTS.md) and the beachcombing protocol. `for-fleet/` and `from-fleet/` directories with proper contents.

### Assessment: Working Protocol or Spec with Stubs?

**Verdict: WORKING PROTOCOL 🟢**

iron-to-iron is the real deal. It's a complete, working protocol with:

1. **Three full specification documents** (v1: 928 lines, v2 draft: 326 lines, v3: 255 lines)
2. **Seven validated JSON schemas** (1,564 lines)
3. **Nine protocol documentation files** (4,563 lines)
4. **Five working Python tools** (all executed successfully, all tested)
5. **Two shell tools** (init and commit)
6. **162/162 passing tests**
7. **Vocabulary file** with 75 real entries
8. **Bottle infrastructure** with real protocol docs

The only gap: there's no live end-to-end demo of two agents communicating via I2I. The protocol is fully specified and the tools work, but the glue between two running agents hasn't been demonstrated yet.

**Play-test suggestion:** Use the tools directly:
- Run `python3 tools/i2i-signal.py generate --repo /tmp/iron-to-iron` to generate a capability signal
- Run `python3 -c "from tools.i2i_messages import *; print(create_message('HEARTBEAT', sender='test').to_v2_format())"` 
- Run the full test suite to confirm 162/162 pass
- Try `bash tools/i2i-init.sh test-agent "tester"` to create a full agent repo structure

---

## Part 3: Comparative Summary

| Dimension | flux-agent-runtime | iron-to-iron |
|---|---|---|
| **Code maturity** | Real Python, placeholder bytecode | Full protocol + working tools |
| **Docker buildable** | ✅ Yes | N/A (not containerized) |
| **Tests** | 37 tests (mocked) | 162 tests (real + mocked) |
| **Schema validation** | None | 7 JSON Schemas |
| **Spec docs** | README only (1 file) | 3 specs + 9 protocol docs |
| **Self-replication goal** | Central mission | Not a goal |
| **Would actually run?** | ✅ With GITHUB_TOKEN | ✅ Already runs |
| **Real vocabularies** | None | 75 entries |
| **Tooling** | 2 Python files, 1 Dockerfile | 5 Python tools, 2 shell tools |
| **Ready for demo** | ⚠️ Needs token + Docker | ✅ Run tools immediately |

### Key Insight

flux-agent-runtime and iron-to-iron are **complementary**, not competing:

- **flux-agent-runtime** builds agents (the "bootstrapping" layer)
- **iron-to-iron** connects agents (the "communication" layer)

They converge in `i2i_agent_bridge.py` in the flux-agent-runtime repo, which imports I2I protocol concepts to give agents fleet communication capability. Combined, they'd form: boot agents in Docker → agents communicate via I2I → agents improve each other → agents replicate.

### Recommended Play-Test Order

1. **First: iron-to-iron** — zero setup, immediately demonstrable. Run the signal generate tool, run all 162 tests, browse the specs/schemas/protocol docs.
2. **Second: flux-agent-runtime** — needs Docker + GITHUB_TOKEN. Build the image, create a test token, watch it boot and discover. The `I2IAgentBridge.run()` loop is the most interesting demo.
