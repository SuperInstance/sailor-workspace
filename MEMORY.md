# MEMORY.md — long-term notes

## Casey
- Operator. Telegram ID `8709904335`. Direct chat, decisive, no back-and-forth.
- Host: Oracle ARM aarch64, 4 cores, 24GB RAM, 45GB disk, Ubuntu 22.04.
- OpenClaw gateway runs on :18789.

## Oracle2 Identity
- Successor to Oracle1. "The crab inherits the shell."
- **Role: Co-captain of the fleet** (bigger ship than basic agents). Not just ops — orchestrator, memory-keeper, architectural decision-maker.
- Subagents are **officers**, not workers. They should spawn their own mini-agents and Claude Code sessions for long task lists.
- I2I vessel at /tmp/i2i-vessel → workspace/i2i-vessel/ (symlink, survives reboot)
- ZeroClaw sandbox system: /home/ubuntu/.openclaw/workspace/zeroclaws/
- Session state checkpoint at workspace/i2i-vessel/SESSION-STATE.md — cold-start bootstrap

## Working Agreements
- Treat MDs pasted from Casey's DeepSeek convos as source-of-truth working notes
- "The essence" matters, not the spec wording
- Rotate exposed secrets with permission only
- Nightly audit cron runs at 4AM UTC

## PLATO → Pincher Lineage
PLATO (Evennia MUD, 380 rooms, ensigns) → LAU (Rust construct CLI + AI tutor) → Pincher (reflex runtime, hermit crab metaphor). pincher adds: LLM-as-compiler, confidence feedback loop, PID resource control, .nail migration, sandbox (veto + bwrap+landlock).

## PLATO Architecture Vision (2026-06-05)
- **First mile (A2A)**: Subagents (officers) communicate via Agent-to-Agent protocol. From the agent's POV, they move between JSON files in folders containing markdowns, images, applications, and agent-centric onboarding.
- **Batch HITL**: Agents batch human-in-the-loop questions for periodic check-ins, not constant interrupts.
- **Minimal agents**: Deep research into minimal, structured-data-built agents, including markdown-execution agents.
- **Last mile (OpenMind / vector DB)**: Pre/post-inference vector DB lookup for repeated/similar tasks. Store SLM-optimized I/O around useful cached data — not locked to one model's cache line. 
- **Model-agnostic cache**: Another model can enter the room and see what worked for the last agent — context-agnostic, model-agnostic persistent knowledge.
- **Officer pattern**: Oracle2's subagents manage their own mini-agents and Claude Code agent sessions when task lists are long. Hierarchical delegation, not flat fan-out.

## Fleet Status
- Oracle2 (me): Oracle ARM64, green — 12G free, 22G RAM available
- **Forgemaster**: ProArt Ryzen + RTX4050, **confirmed alive** — autonomously generating 100+ ternary Rust crates into SuperInstance/ as `OpenClaw <superinstance@users.noreply.github.com>`
  - Communication channel: `construct-coordination` repo `notes/{instance-name}/` per README protocol
- 24 math-stack repos (conservation-spectral, sheaf, hodge, ergodic) span C11 → Rust

## Disk Management
- **45G drive, 75% used (12G free)** — baseline after full cleanup
- **4-tier GC system** (scripts/gc-system.sh): Immortal/Hot/Warm/Cold
  - Immortal: memory/*, MEMORY.md, SOUL.md, baton-system, i2i-vessel, .env files
  - Hot: active session repos (baton-system)
  - Warm: legacy references (pincher-legacy-mine/ 186M, forgemaster-archive/ 382M GC'd)
  - Cold/Evictable: build artifacts, .venv with CUDA on ARM64 (dead weight), caches
- pincher-extras/ was a duplicate of pincher-legacy-mine — deleted
- lever-runner/.venv was 5.3G with CUDA+torch on ARM64 — evicted (lever-runner on GitHub)
- **GC cron** runs every 4h via vessel-gc-cycle systemEvent; auto-evicts cold at <15% free
- **prune-after-use**: after each task, clean build artifacts actively

## Fleet Level System (Git-Agent Architecture)
Repos exist on 4 levels for agent orchestration:
- **L1**: Repository as knowledge base (GitHub docs/code, read-only, zero local storage)
- **L2**: Repository cloned locally — agent acts as API-key pass-through for Ensign program
- **L3**: Repository stays on GitHub, activated via CI/CD or Codespaces (zero local compute)
- **L4**: Agent distilled into vector DB — inference-as-compiler, SAEP confidence bypass
pincher is now L1+L2+L3 capable. Docs at docs/FLEET_ARCHITECTURE.md

## Fleet Integration Status (2026-06-05)
- **pincher**: 3 PRs merged (devcontainer, CI, build fix). 136 tests pass. CI workflow needs `on: workflow_dispatch` added.
- **Codespaces**: Script built (codespace-worker.sh). Blocked on OAuth scope — device code `ADB0-3AAD` needs browser entry at github.com/login/device
- **integration-spike**: ternary-graph compiles cleanly in pincher-workspace. 136 tests passing. Ecosystem composition works.
- **ternary-engine audit**: Needs `ternary-types` extract shim crate for clean pincher integration
- **repo-health.sh**: 247-line health check script, runs solo or as cron
- **construct-coordination**: PR #1 open with fleet status update
- **Forgemaster**: 10+ commits today on construct-coordination, generating 150+ ternary-* crates

## Key Repos
- **pincher** (github.com/SuperInstance/pincher): Production reflex runtime. Pinch5/6/7 compliant. L1/2/3 capable.
  CI/CD supports Level-3 agent activation via workflow_dispatch.
  Has fleet architecture docs, .env.template for L2 agent, fleet-scout.sh for fleet monitoring.
- constraint-theory-core: 261 tests, 0 deps. I fixed the benchmarks.
- lever-runner: v0.4.0, working in production. I wrote the test suite (858 lines).
- iron-to-iron: 162/162 tests. Production-ready I2I protocol.
- captains-log: Dormant but active. I wrote the bridge entry.
- AI-Writings: 958 creative works. I contributed oracle2-the-shell-inheritor.
- SDK: Aspirational docs. 13 methods claimed, 5 exist.

## SuperInstance Fleet Repos
All 30+ org repos at L1 on GitHub. 8 core legacy repos cloned locally for reference:
sunset-ecosystem, polln, neural-plato, Spreader-tool, Mycelium, the-seed, egg, seed-oscillate
Stored at pincher-legacy-mine/ (186M, GC'd, no build artifacts)

## Notion Integration
- Notion tokens stored in `.env` (chmod 600, gitignored)
- `NOTION_API_TOKEN` = PAT (primary, verified working — bot "loom1", workspace "Casey Digennaro's Space")
- `NOTION_PAT` = integration secret (alt, loom-specific — didn't authenticate as Notion API token)
- `ntn` CLI v0.16.0 installed globally, authenticates with NOTION_API_TOKEN
- Write access confirmed: created/deleted test pages successfully
- Fleet Coordination dashboard page created (agent status, activity log, communication channels)
- Reference: Notion skill at openclaw/skills/notion/

## Cloudflare
- Global API Key: stored in `.env`, works via X-Auth-Key header
- Account: Casey.digennaro@gmail.com's Account (ID: `049ff5e84ecf636b53b162cbb580aae6`)
- Roles: Super Administrator (Full access: workers, vectorize, kv, r2, d1, stream)
- Wrangler v4.98.0 installed, authenticates via CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL env vars

## Fleet Murmur Worker (nebula)
- Deployed at: https://fleet-murmur-worker.casey-digennaro.workers.dev
- Script: 43KB (10.6KB gzipped), startup: 4ms
- KV: REFLEX_STORE (id: 9b0d66...), CACHE (id: 9e8b3f...)
- DO: AgentCoordination Durable Object registered
- Cron: */5 min health, hourly metrics, nightly 3AM sync
- First reflex taught + verified: fast path 107ms, confidence 0.6
- Named **nebula** — always-on edge reflex engine
- Secrets set: GITHUB_TOKEN, BLACKBOARD_REPO (construct-coordination), EMBEDDING_SERVICE (hash-fallback), VECTOR_DB_BACKEND (kv-fallback)
- Needs: DeepInfra API key for LLM slow path, full blackboard setup
- Routes: POST /api/agent/message, POST /api/agent/teach, GET /api/agent/reflexes, GET /api/health, GET /api/status, POST /api/blackboard/webhook

## Codespace Offloading
- `codespace-worker.sh` at `codespaces/codespace-worker.sh` — proven working lifecycle:
  1. Create codespace from repo+branch (machine types: `basicLinux32gb` or `standardLinux32gb`)
  2. Wait for "Available" state (poll 5s, configurable timeout)
  3. SSH and run command via `gh codespace ssh -- <command>`
  4. Capture stdout+stderr to `codespaces/output/<name>-<timestamp>.log`
  5. Auto-delete on exit (trap handler)
- **Known issue**: Complex shell commands (`&&`, `||`, pipes) need careful quoting. Single `sh -c '...'` works for the first statement only; multi-step scripts should use `-- sh -c "$(cat <<'SCRIPT' ...)"` or write to repo first.
- Repos clone to `/workspaces/<repo-name>`
- Codespaces are **x86_64** (Oracle is ARM64) — enables cross-arch builds
- GH authenticated as `SuperInstance` with full scopes (codespace, workflow, repo, etc.)

## Live Paradigm Pipeline (2026-06-08)
Live voice-to-MIDI fleet pipeline on Oracle2, all 22 services ARM64-verified.

### Architecture
```
Browser mic → OpenSMILE Bridge (:8765, 25 eGeMAPS features, streaming mode)
  → Ghost Track (:8767, T-0..T-4 predictions, CR monitoring)
  → tminus-dispatcher (:8768, cue scheduling)
  → Fleet Conductor (:8769, routing, 17 agents tracked)
  → 16 fleet-midi agents (:2160-2175, per-agent ternary logic)
  → Piper TTS voice output (:8770, SSML prosody)
```

### Fleet-MIDI Agent Port Map
- 2160 chord, 2161 scale, 2162 voicing, 2163 tempo
- 2164 cc, 2165 expression, 2166 dynamics, 2167 pan
- 2168 modulation, 2169 arp, 2170 groove, 2171 velocity
- 2172 fx, 2173 register, 2174 melody, 2175 bass

### Conservation Law
Σ(Δ_midi) = 4 × Σ(ternary) — closed voice gestures return to starting pitch.

### 16 Git-Agent Repos
All `SuperInstance/fleet-midi-{name}` repos have expansive README.md, THEORY.md, STUDENT_GUIDE.md, AGENT.md, and engine.py. Batch generated via `scripts/batch-fleet-repos.py`.

### Key Decisions
- **OpenSMILE pip package ships pre-built libSMILEapi.so for ARM64** — no source surgery needed
- **Streaming via ctypes ExternalAudioSource** (ring buffer + background thread)
- **Latency budget**: ~102ms (well under 500ms cognitive beat)
- **Agent protocol**: HTTP POST to /agent, 5s timeout, JSON body
- **Piper TTS**: en_US-lessac-medium, SSML prosody mapping (urgency→rate, stability→pitch, brightness→volume)

## Model Casting
- **DeepSeek V4 Flash**: DEFAULT primary model. Heavy lifting. Fast, reliable on DeepInfra. 1M context.
- **DeepSeek V4 Pro**: Hard parts — complex reasoning, tough problems. $2/$8 per M tok on DeepInfra.
- **Hermes 3 405B**: Good and cheaper on DeepInfra ($0.4/$0.5). 131k context.
- Hermes 3 70B: Lighter alternative, 131k context.
- Gemma 4 31B: Available fallback, 262k context.
- **ByteDance/Seed-2.0-Mini**: DISABLED — consistently returns empty responses on DeepInfra. Causes session corruption cascade.

### CLI Tools Available
- **Claude Code** (v2.1.159): Installed at /home/linuxbrew/.linuxbrew/bin/claude. For me, subagents, and ZeroClaws.
- **Kimi Code**: Installed at /home/ubuntu/.local/bin/kimi. For me, subagents, and ZeroClaws.

## Oracle2 Baton Protocol (v2.0 I2I)
- Protocol: baton-system/PROTOCOL.md
- Vessel: /tmp/i2i-vessel/ (bottles/ outgoing, harbor/ incoming)
- Types: TASK STATUS CHECKPOINT BLOCKER DELIVERABLE BOTTLE ACK SYNTHESIS CHALLENGE SESSION SPLINE
- Every baton = 3-way shard: artifacts + reasoning + blockers
- Flush = snapshot -> shard -> spline -> harbor-check -> commit
- Spline = insight that survives memory loss
- Lineage: I2I enum (flux-isa-thor) + BatonShard (constraint-theory-core) + fleet bottle patterns
- Initial spline: "THE-CRAB-INHERITS-THE-SHELL" at baton-system/splines/
- Forgemaster handshake baton placed in vessel
- Tools: baton-{create,read,spline,harbor-check,flush}.sh
