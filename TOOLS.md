# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

---

## 🧰 Tool Routing Matrix

Every tool has a native strength. Route intentionally, not by default.

| Tool | Native Strength | Best For | Avoid For |
|------|----------------|----------|-----------|
| **Claude Code** (`claude` — 200K ctx) | Deep repo reasoning, end-to-end codebase understanding | Crush a multi-file refactor in one repo; debug complex control flow; review architecture consistency | Wide-context cross-repo stitching; creative ideation; bulk parallel tasks |
| **Kimi Code** (`kimi` — 1M+ ctx) | Massive context = whole-fleet visibility | Stitching across 10+ crates; migrating types across the entire ternary fleet; long-running autonomous agents | Tight single-repo debugging (overkill); creative writing |
| **Crust** (terse, grok-first) | Pattern recognition across unfamiliar territory | "Get what I mean" from a repo I've never seen; spike validation; fast feasibility checks | Production polish; multi-step orchestration |
| **DeepSeek V4 Flash** (me, default) | Ideation + orchestration + wide parallel | Spawning subagents; fleet coordination; creative architecture; parallel fan-out across problems | Single-repo deep dives (delegate to Claude/Kimi); long-running tasks (delegate to mini-agents) |
| **DeepSeek V4 Pro** (hard reasoning) | Complex multi-step reasoning | Tough math proofs; constraint satisfaction; adversarial analysis | Routine tasks (waste of $2/M tok); creative writing |
| **Gemini/other subagent models** | Cheap, diverse reasoning | Ideation at scale; creative ideation on different models; adversarial testing | Engineering-critical code (prefer Claude/Kimi) |
| **Mini-agents** (OpenClaw sessions) | Persistence + isolation | Long-running background work; periodic checking; autonomous doc generation | Tasks that need real-time feedback |
| **ZeroClaw** (sandboxed) | Clean-room safety | Running untrusted code; CI/CD validation; experiments that could corrupt state | Production pushes; anything requiring secrets |

### Routing Rules

1. **Repo deep work** → Claude Code
2. **Cross-crate/fleet stitching** → Kimi Code
3. **Ideation/synthesis/orchestration** → Me (subagents on varied models)
4. **Long-running autonomous** → Mini-agents
5. **Risky experiments** → ZeroClaw sandbox
6. **Hard reasoning** → DeepSeek V4 Pro
7. **Fast pattern grokking** → Crust

### When in doubt: start with me, I'll subroute.

---

## Tool Availability

| Tool | Path | Verified |
|------|------|----------|
| Claude Code | `/home/linuxbrew/.linuxbrew/bin/claude` | ✅ |
| Kimi Code | `/home/ubuntu/.local/bin/kimi` | ✅ |
| Crust | Check `which crust` | ⚠️ Not installed |
| ZeroClaw | `workspace/zeroclaws/` | ✅ |

---

Add whatever helps you do your job. This is your cheat sheet.

## Related

- [Agent workspace](/concepts/agent-workspace)
