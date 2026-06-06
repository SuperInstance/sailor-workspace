# Forgemaster Lessons — Autonomous Agent Patterns

**Source:** forgemaster-archive/memory/lessons-learned.md, MINING_GOLD.md

## The Core Insights

### GC in Three Layers
Build artifacts → source archives → batch scripts. Each layer has a different retention policy. Forgemaster's approach is the proven model.

### Rate Limiting
60 req/min = 1 req/sec sustained. Detection + backoff mandatory. GitHub API has hard limits.

### Tool Agent OOM
- Claude Code for architecture work (deep reasoning, multi-file)
- Direct file write for code generation (no tool overhead)
- Kimi Code for single-file < 200 line changes

### crates.io Checklist
- Max 5 keywords
- No git dependencies
- Edition 2021
- Test with `--dry-run`

### Rebase Dance
Every push needs `pull --rebase` before push. This catches fork drift.

## Cross-Pollination

| Repo | Application |
|------|------------|
| **pincher** | Install these patterns as CI conventions |
| **all fleet repos** | Standardize on Forgemaster's lesson learned as pre-commit hooks |
| **cocapn** | Rate limiting and retry logic for API calls |
