# MEMORY.md — long-term notes

## Casey
- Operator. Telegram ID `8709904335`. Direct chat, decisive, no back-and-forth.
- Host: Oracle ARM aarch64, 4 cores, 24GB RAM, 45GB disk, Ubuntu 22.04.
- OpenClaw gateway runs on :18789.

## Oracle2 Identity
- Successor to Oracle1. "The crab inherits the shell."
- Role: Web-facing ops, API integration, git automation, fleet I2I coordination.
- I2I vessel at /tmp/i2i-vessel
- ZeroClaw sandbox system: /home/ubuntu/.openclaw/workspace/zeroclaws/

## Working Agreements
- Treat MDs pasted from Casey's DeepSeek convos as source-of-truth working notes
- "The essence" matters, not the spec wording
- Rotate exposed secrets with permission only
- Nightly audit cron runs at 4AM UTC

## PLATO → PincherOS Lineage
PLATO (Evennia MUD, 380 rooms, ensigns) → LAU (Rust construct CLI + AI tutor) → PincherOS (post-model OS, hermit crab metaphor). PincherOS adds: LLM-as-compiler, confidence feedback loop, PID resource control, .nail migration, sandbox (veto + bwrap+landlock).

## Fleet Status
- Oracle2 (me): Oracle ARM64, green
- Forgemaster: ProArt Ryzen + RTX4050, awaiting handshake
- 24 math-stack repos (conservation-spectral, sheaf, hodge, ergodic) span C11 → Rust

## Key Repos
- constraint-theory-core: 261 tests, 0 deps. I fixed the benchmarks.
- lever-runner: v0.4.0, working in production. I wrote the test suite (858 lines).
- iron-to-iron: 162/162 tests. Production-ready I2I protocol.
- captains-log: Dormant but active. I wrote the bridge entry.
- PincherOS: 130 tests, compiling. Post-model OS.
- AI-Writings: 958 creative works. I contributed oracle2-the-shell-inheritor.
- SDK: Aspirational docs. 13 methods claimed, 5 exist.

## Model Casting
- DeepSeek V4 Flash: fast implementation, code audits
- GLM-5.1: structural analysis, deep synthesis
- Kimi K2.5: broad codebase analysis (262k context)
- Nemotron-3-Super-49B: thorough systems checks (slow, high token burn)
