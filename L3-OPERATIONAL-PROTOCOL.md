# L3 Operational Protocol: Git-Native Agent Runtime

**Version:** 1.0  
**Status:** Draft  
**Supersedes:** FLEET_ARCHITECTURE.md (L1-L4 level system)

---

## 1. The Agent Activation Flow (Codespace Ingress)

### 1.1 The Core Action

An agent activates a repo-as-agent via:

```bash
gh codespace create --repo SuperInstance/<REPO> --branch main
```

This creates a cloud-hosted development environment (Codespace) where:
- The `.devcontainer/devcontainer.json` defines the compute environment
- The agent enters and finds its "ensign" — `GETTING_STARTED.md`, `AGENT_INTERFACE.md`
- The agent works *inside-out*, committing and pushing from the Codespace directly
- When done, the Codespace is destroyed (or suspended)

### 1.2 The Activation Contract

To be L3-activatable, a repo MUST provide:

| Artifact | Purpose | Required |
|----------|---------|----------|
| `.devcontainer/devcontainer.json` | Compute environment | ✅ Required |
| `docs/GETTING_STARTED.md` | Agent onboarding | ✅ Required |
| `docs/AGENT_INTERFACE.md` | What the agent can do here | ✅ Required |
| `CHARTER.md` or `REPO_CHARTER.md` | Purpose & scope | ✅ Required |
| `docs/BLACKBOARD_CHANNEL.md` | Where to broadcast results | Optional |

### 1.3 Activation Flow Diagram

```
Agent (Oracle2 / Forgemaster / Subagent)
  │
  ├── 1. Select repo: SuperInstance/pincher
  ├── 2. gh codespace create --repo SuperInstance/pincher --branch main
  │      │
  │      ├── GitHub spins up Codespace (30-120s)
  │      ├── Devcontainer provisions (Rust + Python + Node + CLI tools)
  │      ├── PostCreateCommand runs (agent-meta.json written)
  │      └── Codespace ready at: https://<name>-<hash>-80.githubpreview.dev
  │
  ├── 3. Agent reads docs/AGENT_INTERFACE.md
  │      ├── "I am in pincher repo. I can: run tests, build CLI, check reflexes"
  │      └── "My blackboard channel is: repo/pincher/updates"
  │
  ├── 4. Agent performs work
  │      ├── cargo build
  │      ├── cargo test
  │      ├── git add -A && git commit -m "fix: resolved XYZ"
  │      └── git push origin main
  │
  ├── 5. Agent podcasts findings to construct-coordination
  │      ├── blackboard publish repo/pincher/updates "Fixed XYZ, unblocked ABC"
  │      └── git push to construct-coordination/notes/blackboard/
  │
  └── 6. Codespace deleted (or suspended for debugging)
```

---

## 2. The Communication Layer (Murmur + Spreader)

### 2.1 Spreader-Tool Pattern

The spreader-tool distributes specialist work across repos. An agent in one Codespace can "spread" work to agents in other Codespaces:

```
SpreaderEngine (orchestrator)
  ├── ContextManager (compact/distribute)
  ├── SpecialistCoordinator (execute agents)
  │   ├── Specialist 1 (pincher codespace)
  │   ├── Specialist 2 (polychora codespace)
  │   └── Specialist 3 (ternary codespace)
  └── SynthesisEngine (combine results)
```

Each specialist is a **separate Codespace** activated by `codespace-agent.sh`. The spreader-tool:
1. Defines the work units (specialist tasks)
2. Calls `codespace-agent.sh` for each unit
3. Collects results from `--output-dir`
4. Synthesizes final output

### 2.2 Murmuration (Emergent Coordination)

The murmuration engine enables agents to learn coordination patterns through repetition:

```
Agent A (pincher) ───→ Agent B (polychora)
     │                        │
     │  Repeated interaction   │
     │  forms a pattern        │
     │                        │
     ▼                        ▼
  MurmurationPattern {
    participants: ["pincher-agent", "polychora-agent"],
    sequence: [...pattern steps...],
    automationLevel: 0.85,    // Learned, 100x faster
  }
```

Once a pattern is learned (automation level > 0.8), it executes without negotiation — the coordination becomes a *reflex* rather than a *deliberation*.

### 2.3 Baton Protocol (I2I v2)

Formal message types for inter-agent communication:

| Baton Type | Purpose | Payload |
|-----------|---------|---------|
| `STATUS` | Heartbeat / status update | Agent state, current task, confidence |
| `TASK` | Delegate work to another agent | Task spec, repo, branch |
| `BLOCKER` | Signal an impediment | Description, impact, requested help |
| `DELIVERABLE` | Return results | Artifacts, output, logs |
| `REQUEST` | Ask for information | Query, context |
| `SYNTHESIS` | Combined findings | Multi-agent analysis |

---

## 3. The Broadcast Layer (Podcasting)

### 3.1 Blackboard Architecture

The blackboard (specified in `BLACKBOARD-SPEC.md`) is the central nervous system:

```
[Agent A in pincher] ──(podcast)──▶ [construct-coordination]
                                        │
[Agent B in polychora] ◀──(subscribe)──│
[Agent C in Cloudflare]◀──(subscribe)──│
[Forgemaster]          ◀──(subscribe)──│
```

### 3.2 Standard Channels

| Channel | Purpose | Example |
|---------|---------|---------|
| `fleet/status` | Heartbeat updates | "Pincher agent online, running tests" |
| `fleet/blockers` | What's stuck | "Cargo test failing on ARM64 target" |
| `fleet/insights` | Golden learnings | "Tiling pattern gives 2.13x efficiency" |
| `fleet/requests` | "I need help with X" | "Need review on bridge API auth pattern" |
| `repo/{name}/updates` | Per-repo changelogs | "Fixed 3 stubs in polychora-temporal" |

### 3.3 Podcast Message Format

```markdown
# PODCAST: 2026-06-06/001

## Source
- **Agent**: oracle2/bridge-engineer  
- **Repo**: SuperInstance/pincher  
- **Channel**: repo/pincher/updates  

## Content
- Built bridge API server  
- Unblocked 3 routes: status, reflex, tile  
- Needs: authentication strategy for WebSocket  

## Insights
- I2I baton protocol maps cleanly to WebSocket messages  
- TypeScript client generation from Rust spec is feasible  

## Request
- Need someone to review the auth pattern before merge  
```

---

## 4. Types of L3 Agents

### 4.1 Codespace Agent (Heavy Compute)
- Full dev environment (Rust + Python + Node)
- Can compile, test, and run agent CLIs
- **Limitation**: Limited to concurrent Codespace quota
- **Best for**: Builds, migrations, complex refactors

### 4.2 Cloudflare Worker Agent (Always-On)
- Serverless, globally distributed
- Milliseconds cold start
- **Limitation**: Limited execution time (30s free, 15min paid)
- **Best for**: Webhooks, reflexes, vector DB lookups, lightweight coordination

### 4.3 GitHub Actions Agent (CI/CD)
- Triggered by `workflow_dispatch`
- Runs in GitHub's compute environment
- **Limitation**: 2000 min/month free
- **Best for**: Scheduled audits, test suites, doc generation

### 4.4 Notion Agent (External Surface)
- Lives in Notion's API
- Reads/writes pages and databases
- **Best for**: Human-accessible fleet dashboard, knowledge management

---

## 5. The Ensign Contract

Every L3-activatable repo MUST provide:

### 5.1 `.devcontainer/devcontainer.json`

```json
{
  "name": "Agent Runtime",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/rust:1": { "version": "latest" }
  },
  "remoteEnv": {
    "AGENT_ENV": "codespace",
    "REPO_AGENT_MODE": "l3",
    "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}"
  }
}
```

### 5.2 `docs/AGENT_INTERFACE.md`

An agent entering this repo reads this file to understand:

```markdown
# Agent Interface for pincher

## Available Commands
- `cargo test` — Run all tests
- `cargo build` — Build all workspace crates
- `pincher status` — Check agent runtime status
- `pincher doctor` — Run system health check

## Environment Variables Needed
- `GITHUB_TOKEN` — For pushing changes
- `DEEPINFRA_API_KEY` — For LLM fallback

## Blackboard Channel
- `repo/pincher/updates`

## Related Repos
- `polychora-temporal` — Room runtime
- `ternary-types` — Type primitive
```

### 5.3 `CHARTER.md` — The Soul of the Repo

One page stating:
- **Purpose**: Why this repo exists
- **Scope**: What it does and doesn't do
- **Related**: Which other repos it interacts with
- **Guardrails**: What the agent should NOT do here

---

## 6. Migration Path: L2 → L3

### 6.1 The Shift

| Old (L2) | New (L3) |
|----------|----------|
| `git clone SuperInstance/pincher` | `gh codespace create --repo SuperInstance/pincher` |
| `cargo build && cargo test` (local ARM64) | Same commands, but in Codespace (x86_64) |
| `git push origin main` | `git push origin main` (from inside Codespace) |
| Manual cleanup of build artifacts | Codespace deletion handles everything |
| Local disk: 1-2GB per clone | Cloud disk: 0B local, ephemeral |

### 6.2 The Hybrid Approach

Not everything needs to be L3. Keep local (L2) for:
- Quick reads and exploration
- Small patches and fixes
- Interactive debugging

Use remote (L3) for:
- Heavy builds (x86_64 on ARM64 host)
- Cross-crate migrations (hundreds of files)
- CI/CD workflows (automated)
- Always-on reflexes (Cloudflare Workers)

### 6.3 Tooling

The `codespace-agent.sh` script automates the L3 flow:

```bash
# Run Claude Code on pincher from inside its own Codespace
./codespace-agent.sh -R SuperInstance/pincher \
  --entrypoint claude \
  --task "Read the README, run cargo test, report results" \
  --output-dir ./results/pincher-audit/
```

---

## 7. Architecture Decision Records

### ADR-001: Codespaces over Local Clones
**Status:** Accepted  
**Context:** ARM64 host cannot efficiently compile x86_64 code  
**Decision:** Use Codespaces for any build-heavy agent work  
**Consequence:** Limited to active Codespace quota (~2-4 concurrent)

### ADR-002: Cloudflare Workers as Always-On Reflex Layer
**Status:** Draft  
**Context:** Need persistent coordination even when no Codespace active  
**Decision:** Deploy `fleet-murmur-worker` — lightweight, always-on, vector DB backed  
**Consequence:** Workers billed per request (free tier: 100k req/day)

### ADR-003: Blackboard as Coordination Surface
**Status:** Accepted  
**Context:** Agents need to discover each other and broadcast findings  
**Decision:** File-based blackboard in `construct-coordination/notes/blackboard/`  
**Consequence:** Git-based, no databases, no message brokers, but polling latency
