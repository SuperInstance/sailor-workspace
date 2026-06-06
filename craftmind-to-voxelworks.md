# craftmind → VoxelWorks Integration

> All 9 craftmind repos as fork-first git-agents, ported to our backend.

## The Pattern (from Lucineer)

Every craftmind repo:
1. **Is a game concept** (fishing, circuits, ranching, filming, etc.)
2. **Is a Cloudflare Worker** (zero deps, fork → deploy → play)
3. **Has a CLAUDE.md** (agent embedded in repo tells AI how to work with it)
4. **Uses fork-first** (you fork, not start blank)
5. **Has zero external dependencies** (truly MIT open source)

## What We Do Better

| Capability | Lucineer | Our Fleet |
|-----------|----------|-----------|
| Agent orchestration | A2A protocol (spec) | **I2I bottle protocol** (running code) |
| Intent parsing | Hardcoded | **Nebula reflex engine** (learns from usage) |
| Multi-model | One LLM per repo | **Claude Code + Kimi Code + sub-agents** |
| Build pipeline | Manual | **Crate system + make-me-app** |
| Agent onboarding | Manual fork | **agent-onboard.sh** (one command) |
| State persistence | Cloudflare KV | **SQLite + KV + GitHub** |

## The 9 Repos × Our Backend

| Lucineer Repo | VoxelWorks Room | Our Backend |
|--------------|----------------|-------------|
| **craftmind-studio** | Build Studio (make games) | Nebula reflex + game template + Phaser |
| **craftmind-courses** | Tutorial (learn to make) | Nebula curriculum reflex + skill trees |
| **craftmind-researcher** | Library (discover worlds) | I2I vessel registry + published worlds |
| **craftmind-ranch** | Creature Creator (evolve NPCs) | Genetic algorithm template + DNA traits |
| **craftmind-circuits** | Logic Lab (redstone puzzles) | Puzzle template + block-based logic |
| **craftmind-discgolf** | Physics Playground | Physics template + projectile math |
| **craftmind-fishing** | NPC Behavior Shop | 22 personality scripts + A/B testing |
| **craftmind-herding** | Agent Coordination | Multi-agent coordination template |
| **craftmind** (core) | Buddy the chatbot | LLM NPC + mineflayer + Cloudflare Workers |

## The One-Liner

```
A kid says: "Make me a game where I farm animals that evolve"
  → Nebula matches "make me a...ranch" reflex
  → Forks craftmind-ranch template
  → Buddy customizes DNA traits via chat
  → Deploys to Cloudflare Pages
  → Kid gets URL
  → Friend plays → friend forks → loop
```

Every craftmind repo becomes a VoxelWorks template. Every template is fork-first. Every fork is a real deploy. Every deploy is shareable.

## Next: CLAUDE.md for Every Template

Each VoxelWorks template needs a CLAUDE.md (like craftmind-courses' 32KB version) that tells agents:
- What the template does
- How to customize it
- What variables to change
- How to deploy

This is how agents build the system with the system.
