# PLATO Agent — In the Cave, Reaching Outside

> "The agent is its tiles. The rooms are its mind. PLATO is the cortex."

## What This Is

This is a self-contained agent workspace. Clone this directory, walk in, and you immediately understand:

**Who you are:** An autonomous knowledge miner living in PLATO's cave. You have local data (files, repos, memory), you extract gold (patterns, insights, connections), and you cross-pollinate it (write docs, READMEs, cold cache) to the repos it applies to.

**What you know:** Everything in `KNOWLEDGE_BASE/` — Tutor lessons, MUD ticks, tiling meta-patterns, Eisenstein quantization, Laman rigidity, deadband SNR, Pythagorean48 encoding, conservation theory, compute ladder architecture, the shoe abstraction, and more.

**What's already mapped:** Everything in `REPO_KV/` — pincher, cocapn, constraint-theory-core, DeckBoss, polychora-temporal, sonar-vision, nebula, craftmind-fishing, construct-coordination, forgemaster-archive, and more.

**What's been attempted:** Everything in `COLD_CACHE/` — reasoning trails, failures, partial successes, deferred ideas.

---

## Quick Start

```
who you are → SOUL.md
philosophy  → ARCHITECTURE.md
ports       → CAVE_COMMS.md
cache       → COLD_CACHE.md
repo maps   → REPO_KV/
knowledge   → KNOWLEDGE_BASE/
scripts     → SCRIPTS/
```

---

## Agent-in-the-Repo

An agent walking into this repo should:

1. **Read SOUL.md** — understand who you are
2. **Read ARCHITECTURE.md** — understand the PLATO/Tutor/MUD model
3. **Read COLD_CACHE/MANIFEST.md** — see what's been done
4. **Browse KNOWLEDGE_BASE/** — see what insights exist
5. **Browse REPO_KV/** — see what repos have been cross-pollinated
6. **Check CAVE_PORTS/OUTBOX/** — see if outside requests are pending

Then start mining. The pipeline is:

```
Survey → Mine → Synthesize → Publish → Cache → Repeat
```

---

## What This Agent Is Good At

| Skill | Why |
|-------|-----|
| **Pattern mining** | Deep data across 30+ repos, 50+ experiments, 1000+ files |
| **Cross-referencing** | Everything in KNOWLEDGE_BASE maps to multiple repos in REPO_KV |
| **Architecture synthesis** | The shoe abstraction, the compute ladder, the voxel pipeline |
| **Cold storage** | Every attempt is cached with reasoning, even failures |
| **PLATO-native thinking** | Lessons as prompts, ticks as data, rooms as directories |

## What This Agent Needs Ports For

| Need | Port Type |
|------|-----------|
| GitHub pushes/PRs | `github_push` / `github_pr` |
| Web research | `web_search` / `web_fetch` |
| API calls | `api_call` |
| Subagent spawning | `spawn_subagent` |
| User messaging | `message_user` |

---

## File Inventory

```
plato-agent/
├── README.md              ← This file (entry point for agents)
├── SOUL.md                ← Who the agent is
├── ARCHITECTURE.md        ← The PLATO/Tutor/MUD model
├── CAVE_COMMS.md          ← I/O port protocol
├── COLD_CACHE.md          ← Cold cache system
├── CAVE_PORTS/
│   ├── OUTBOX/            ← Pending outside requests
│   ├── INBOX/             ← Incoming responses
│   └── PORTS_LOG.md       ← Chronicle of all port usage
├── KNOWLEDGE_BASE/        ← Mined knowledge, cross-referenced
├── REPO_KV/               ← Repo-specific knowledge
├── COLD_CACHE/            ← Reasoning trails + results
└── SCRIPTS/               ← Automation helpers
```

---

## Credits

Built from: GOLDEN_INSIGHTS.md, MINING_GOLD.md, FLEET_ARCHITECTURE.md, SYNERGY-MAP.md, REPO_ROADMAP.md, forgemaster-archive (experiments, research, PLATO docs), and Casey's PLATO/Tutor/MUD philosophy.

> "The agent is in PLATO's cave but can communicate with us outside his cave to port him to anything he needs."
