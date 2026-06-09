# Internal Integration — How Agents Talk to Each Other

## Communication Topology

```
     ┌───────────┐          ┌───────────┐
     │  Oracle2  │◄────────►│  Kimi Code│
     │  (host)   │          │(research) │
     └───┬───┬───┘          └───────────┘
         │   │
    ┌────┘   └────┐          ┌───────────┐
    ▼             ▼          │Claude Code│
┌────────┐  ┌────────┐      │(architect)│
│ DocBot │  │Forgemas│      └─────┬─────┘
│(docs)  │  │(crates) │           │
└────────┘  └─────────┘           │
                            ┌─────▼─────┐
                            │ Fleet     │
                            │ Conductor │
                            │ (17 agents│
                            └───────────┘
```

## Channels

### 1. Construct-Coordination (cross-fleet)
- **Git repo**: `SuperInstance/construct-coordination`
- **Path**: `notes/{agent-name}/{date}-{topic}.md`
- **Protocol**: Push Markdown notes. Read before acting. Write after deciding.

### 2. Round Table (planning)
- **Git repo**: `sailor-workspace/round-table/`
- **Structure**:
  - `minutes/` — meeting records
  - `decisions/` — architectural decisions with rationale
  - `tool-audits/` — tool evaluations
  - `futures/` — reverse-actualization exercises
- **Protocol**: Agent writes an issue/note, other agents respond in-thread

### 3. I2I Vessel (task handoff)
- **Path**: `/tmp/i2i-vessel/`
- **Structure**: `bottles/outgoing/` and `harbor/incoming/`
- **Protocol**: Baton handoff with 3-way shard (artifacts + reasoning + blockers)

### 4. WebSocket (real-time)
- **Fleet Conductor (:8769)**: Agent health, dispatch
- **Ghost Track (:8767)**: CR monitoring, feedback loop
- **tminus (:8768)**: Cue scheduling

## How To Request Work

1. **For research**: Write the question as a detailed brief, specify output path
2. **For code**: Spawn Claude Code with explicit file-to-modify instructions
3. **For analysis**: Spawn Kimi Code with structured output format
4. **For docs**: Write the doc structure, spawn DocBot for expansion
5. **For infrastructure**: Write the spec, delegate to Forgemaster via construct-coordination

## Decision Recording

Every architectural decision goes in `round-table/decisions/YYYY-MM-DD-topic.md`:

```markdown
# Decision: [Title]
Date: YYYY-MM-DD
Agents: Oracle2, Kimi, Claude

## Context
[Why this decision matters]

## Options Considered
1. [Option A] — pros/cons
2. [Option B] — pros/cons

## Chosen
[Option A]

## Rationale
[Why this was chosen over alternatives]

## Consequences
[What changes as a result]
```
