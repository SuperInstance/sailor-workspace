# Codespace Engineering Report — L3 Pusher

**Date:** 2026-06-06  
**Author:** Oracle2 Code-Workspace Engineer  
**Status:** ✓ Complete

---

## Executive Summary

The L3 Pusher toolchain has been built — a suite of scripts and templates enabling git-native AI agent operations inside ephemeral GitHub Codespaces. The system supports Claude Code, Kimi Code, and custom entrypoints, with full lifecycle management: create → inject → run → harvest → delete.

**Three artifacts produced:**

| Artifact | Location | Purpose |
|---|---|---|
| `codespace-agent.sh` | `scripts/codespace-agent.sh` | L3 agent runner — creates, injects, executes, harvests, cleans |
| `agent-devcontainer.json` | `templates/agent-devcontainer.json` | Standardized L3 devcontainer template for all SuperInstance repos |
| `codespace-engineering-report.md` | `./codespace-engineering-report.md` | This report — integration analysis and documentation |

---

## 1. `codespace-agent.sh` — The Agent Runner

### What It Does

Creates an ephemeral GitHub Codespace from a SuperInstance repo, injects task instructions, runs an AI coding agent inside it, captures ALL output (logs, generated files, git diffs), optionally pushes changes, then nukes the codespace.

### Agent Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌─────────────┐
│  Pre-flight  │───>│  Codespace   │───>│  Inject Task  │───>│  Run Agent  │
│  (gh scope,  │    │  Create      │    │  Instructions │    │  (claude /   │
│   repo check)│    │              │    │  + Runner     │    │   kimi /     │
└─────────────┘    └──────────────┘    └───────────────┘    │   custom)    │
                                                             └──────┬──────┘
                                                                    │
┌─────────────┐    ┌──────────────┐    ┌───────────────┐           │
│  FINAL:     │<───│  Harvest     │<───│  [Optional]   │<──────────┘
│  report +   │    │  Artifacts   │    │  Git Push     │
│  cleanup    │    │  (logs,      │    │               │
│             │    │   diffs,     │    └───────────────┘
│             │    │   files)     │
└─────────────┘    └──────────────┘
```

### Key Features

| Feature | Implementation |
|---|---|
| **Entrypoints** | `--entrypoint claude` (default), `--entrypoint kimi`, `--entrypoint custom` |
| **Task injection** | `--task "..."` inline or `--task-file task.md` file (both can be combined) |
| **Env injection** | `--env KEY=VAL` (repeatable), written as `.agent-env` sourceable file |
| **Output capture** | Full stdout/stderr log + artifact harvest directory (logs, files, git status, diffs) |
| **Git push** | `--push` auto-commits all changes with structured commit messages |
| **Keep for debug** | `--keep` skips codespace deletion, prints SSH connect command |
| **Dry-run** | `--dry-run` prints full configuration without actually creating anything |
| **Fallback agent install** | If claude/kimi not found in codespace, attempts npm/pip install |
| **Diagnostic mode** | If no agent binary found, runs repo exploration and generates a report |

### Architecture: Runner Injection

Instead of multi-step SSH commands, the agent runner script is written as a template with placeholders, resolved locally, then injected into the codespace as a single tar stream:

```
Temp staging dir          Codespace (/workspace)
┌─────────────┐          ┌─────────────────────┐
│ AGENT_      │──tar──>  │ AGENT_INSTRUCTIONS   │
│ INSTRUCTIONS│          │ .md                  │
│ .md         │          │                      │
│             │          │                      │
│ agent_runner│──tar──>  │ _agent_runner.sh     │
│ _resolved.sh│          │                      │
└─────────────┘          └─────────────────────┘
                              │
                              v
                         bash _agent_runner.sh
```

This approach minimizes SSH round-trips and ensures atomic injection.

### Usage Examples

```bash
# Basic: Run Claude Code on pincher to explore and test
./scripts/codespace-agent.sh -R SuperInstance/pincher \
  --entrypoint claude \
  --task "Read the README, run cargo test, report results" \
  --output-dir ./results/pincher-audit/

# Kimi Code for cross-crate stitching with env injection
./scripts/codespace-agent.sh -R SuperInstance/ternary-sort \
  --entrypoint kimi \
  --entrypoint-args "--quiet" \
  --task-file ./tasks/stitch-ternary-types.md \
  --env DEEPINFRA_API_KEY="sk-..." \
  --push

# Custom entrypoint for a Python agent
./scripts/codespace-agent.sh -R SuperInstance/pincher \
  --entrypoint custom \
  --entrypoint-cmd "python3 /workspace/agent.py --config /workspace/config.yaml" \
  --keep

# Dry run to validate configuration
./scripts/codespace-agent.sh -R SuperInstance/pincher \
  --entrypoint claude \
  --task "cargo test" \
  --dry-run
```

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | Agent task completed successfully (or dry-run) |
| 2 | Missing dependency (gh CLI missing, missing --entrypoint-cmd for custom) |
| 3 | Codespace creation failed or entered unexpected state |
| 4 | Agent script/instructions injection into codespace failed |
| 5 | Agent command failed (exit code propagated) |
| 6 | Output harvest failed |
| 7 | Timeout waiting for codespace to become Available |
| * | Shell-level error from the agent command |

---

## 2. `agent-devcontainer.json` — The L3 Devcontainer Template

### Purpose

A standardized devcontainer configuration that ALL SuperInstance repos should adopt for L3 (git-native agent) readiness. Installed at:

```
templates/agent-devcontainer.json
```

Repos should copy this to `.devcontainer/devcontainer.json` and customize as needed.

### Feature Set

| Feature | Purpose |
|---|---|
| **GitHub CLI** | `gh` for codespace lifecycle, PR operations, repo queries |
| **Rust** | `cargo`, `rustc`, `rustup` — complete profile with clippy, rustfmt |
| **Python 3.13** | Agent scripts, data processing, pip packages |
| **Node 22** | For Claude Code (npm-based) and TypeScript tooling |
| **Docker-in-Docker** | Container builds inside the codespace |
| **sshd** | SSH access for `gh codespace ssh` connections |

### Environment Variables

All major API keys are wired through `${localEnv:...}` resolution, meaning they're pulled from the **host machine's** environment at codespace creation time — no secrets in the repo:

- `GITHUB_TOKEN` — for git push, API calls
- `DEEPINFRA_API_KEY` — DeepInfra inference
- `OPENAI_API_KEY` — OpenAI models
- `ANTHROPIC_API_KEY` — Claude Code API
- `KIMI_API_KEY` — Kimi Code API
- Fleet credentials (Matrix homeserver/user/password) for fleet coordination

### How to Deploy to a Repo

```bash
# Copy the template into a repo
cp templates/agent-devcontainer.json /path/to/repo/.devcontainer/devcontainer.json

# Or reference the shared template if your repo has devcontainer.json support:
# (Most SuperInstance repos use .devcontainer/devcontainer.json directly)
```

---

## 3. Integration with the Ecosystem

### spreader-tool

The spreader tool distributes work across the fleet. `codespace-agent.sh` is the **execution backend** that spreader calls — it takes a repo+task+entrypoint and realizes it inside an actual codespace.

**Integration points:**

| Spreader concept | codespace-agent.sh equivalent |
|---|---|
| Dispatch work item | `-R <repo> -t "<task>"` |
| Worker type | `--entrypoint claude|kimi|custom` |
| Results collection | `--output-dir` + harvest directory |
| Retry | Loop over exit codes 3, 4, 7 (infra failures) |
| Timeout | `--idle-timeout` + `--retention` |
| Credentials | `--env KEY=VAL` passthrough |

**Example spreader integration:**

```bash
# Pseudo-code — spreader dispatches work items to codespace-agent.sh
for repo in $(spreader list-eligible); do
    ./scripts/codespace-agent.sh \
        -R "$repo" \
        --entrypoint claude \
        --task "Audit dependencies and report CVEs" \
        --output-dir "./fleet-audit/$(basename $repo)/" \
        --push \
        --skip-health
done
```

### fleet-murmur

`fleet-murmur` handles inter-agent communication and status propagation. The codespace-agent.sh tool generates structured metadata (in `agent-meta.json`) that murmurer can pick up:

**Metadata emitted per run:**

```json
{
  "timestamp": "20260606T033900",
  "duration_seconds": 240,
  "exit_code": 0,
  "entrypoint": "claude",
  "instructions_file": "/workspace/AGENT_INSTRUCTIONS.md",
  "push_enabled": true
}
```

**How murmurer consumes this:**

1. After `codespace-agent.sh` completes, murmurer watches the `--output-dir` for new `last-run.json` files
2. Parses `harvest-*/agent-meta.json` for per-agent metadata
3. Publishes status to fleet via Matrix (the codespace already has fleet credentials via env vars)
4. Aggregates results across all dispatched agents

**Example murmurer hook:**

```bash
# In murmurer's watch loop:
if [ -f "$OUTPUT_DIR/last-run.json" ]; then
    STATUS=$(python3 -c "import json; d=json.load(open('$OUTPUT_DIR/last-run.json')); print(d['exit_code'])")
    if [ "$STATUS" = "0" ]; then
        murmurer publish "✓ $(basename $(dirname $OUTPUT_DIR)): Agent completed in ${DURATION}s"
    else
        murmurer publish "✗ $(basename $(dirname $OUTPUT_DIR)): Agent failed ($STATUS)"
    fi
fi
```

### i2i-vessel

The existing codespace infrastructure includes an `i2i-vessel` (inter-instruction interface vessel) that connects codespaces to the host filesystem. The L3 devcontainer template preserves this pattern via the `DOCKER_IN_DOCKER` feature, allowing agent results to be written to shared volumes.

---

## 4. Build Details

### Files Created

| File | Size | Mode |
|---|---|---|
| `scripts/codespace-agent.sh` | ~30 KB | 0755 (executable) |
| `templates/agent-devcontainer.json` | ~3.7 KB | 0644 |
| `codespace-engineering-report.md` | ~12 KB | 0644 |

### Dependencies

- **Runtime:** `gh` (GitHub CLI) with `codespace` scope — required on the host
- **Codespace-side:** The devcontainer provides Rust, Python, Node, Docker, and SSH
- **Agent tools:** Claude Code (npm), Kimi Code (pip) — auto-installed as fallback

### Tests Performed

- [x] Script parses all flags correctly (arg parsing validation)
- [x] Dry-run mode produces correct summary output
- [x] All three entrypoint types are recognized and validated
- [x] --entrypoint custom without --entrypoint-cmd produces error
- [x] Missing task file produces error
- [x] Multiple --env flags accumulate correctly
- [x] Default task generated when neither --task nor --task-file given
- [x] Runner script template placeholders resolve correctly
- [x] Output directory auto-creation works

---

## 5. Future Work

| Item | Priority | Notes |
|---|---|---|
| **Parallel execution** | Medium | Fan-out to N codespaces concurrently for fleet-scale work |
| **Result merging** | Medium | Aggregate harvest directories across parallel runs into single report |
| **Retry logic** | Low | Automatic re-creation on codespace infra failures (exit 3, 4, 7) |
| **SSH key injection** | Low | For secure git push without relying on GITHUB_TOKEN |
| **Codespace name tagging** | Low | Generate display names from task+repo for better dashboard visibility |
| **Artifact dedup** | Low | Skip re-downloading unchanged files from harvest |

---

## Appendix: File Tree

```
/home/ubuntu/.openclaw/workspace/
├── codespace-engineering-report.md   ◄— You are here
├── scripts/
│   ├── codespace-agent.sh            ◄— L3 Agent Runner
│   ├── codespace-worker.sh           ◄— Base ephemeral codespace runner
│   ├── ...
├── templates/
│   ├── agent-devcontainer.json       ◄— L3 Devcontainer Template
│   └── ...
└── codespaces/
    ├── README.md                     ◄— Existing codespace docs
    ├── codespace-worker.sh           ◄— Original worker script
    └── setup-codespaces.sh           ◄— One-time setup
```
