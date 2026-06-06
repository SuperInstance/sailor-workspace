# MUD Tick Model → Structured Data Flow

**Source:** Casey's zmud/tintin experience, PLATO MUD architecture

## The Core Insight

A MUD is a tick-based system. Each tick:
1. **Gathers** state (player positions, mob actions, room state)
2. **Processes** triggers (if north north north → auto-walk)
3. **Resolves** hooks (pattern triggers → callback fires)
4. **Advances** time (next tick)

The power isn't the game — it's the **scripting**. zmud/tintin let you:
- Define triggers on text patterns
- Auto-walk complex paths (north north east south east...)
- Auto-combat with variable-sensitive logic
- Dynamically toggle status bars, prompt bars, channel visibility
- Choose which channels are on (gossip off when questing, on when organizing)

## In Our Context

```
MUD Tick = structured data batch
Trigger = { condition: "file pattern matches", action: "write to REPO_KV" }
Hook = { pattern: "repo contains craftmind-", callback: "cross-ref Eisenstein" }
Channel Toggle = { mode: "mining mode", channels: [experiments, repos, knowledge_base] }
```

The file system becomes the MUD world:
- Directories = rooms
- Files = objects/players
- Patterns = triggers
- Port requests = channels

## Applied To

| Repo | How MUD Ticks Apply |
|------|---------------------|
| **pincher** | Reflex engine IS a trigger system. Pattern match → execute action. |
| **cocapn** | Tile processing loop = tick loop. Gather → process → advance. |
| **fleet coordination** | I2I bottles = MUD ticks. Bottle arrives → triggers processed → action taken. |
| **This agent** | Mining saga IS a MUD tick. Survey → mine → synthesize → publish → commit. |

## Expansion Potential

Build a `mud-tick` protocol crate that defines the tick/trigger/hook pattern with:
- Type-safe trigger conditions
- Priority-ordered hook chains
- Channel-based filtering (only process ticks matching your channel)
- Dynamic channel toggle (agents choose what they pay attention to)
