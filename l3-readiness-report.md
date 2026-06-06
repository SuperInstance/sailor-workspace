# L3 Readiness Report

> **Generated:** 2026-06-06T03:39:00Z
> **Generator:** Oracle2 Repo-Agent Kickstart Specialist
> **Audit Scope:** Fleet core repos → L3 agent readiness

---

## Executive Summary

**7 of 8 targeted repos** are now L3-ready. Each has:
- ✅ `.devcontainer/devcontainer.json` — compute environment definition
- ✅ `docs/AGENT_INTERFACE.md` — what an agent can do here *(NEW)*
- ✅ `docs/GETTING_STARTED.md` — agent onboarding (pre-existing or created by doc-factory)
- ✅ `.github/workflows/agent-workflow.yml` — CI/CD for ephemeral agent tasks *(NEW)*
- ✅ Reference template at `doc-templates/agent-workflow.yml`

**1 flagged:** ternary-conserve does not exist yet.

---

## Per-Repo Readiness

| Repo | Language | Devcontainer | AGENT_INTERFACE | Agent Workflow | GETTING_STARTED |
|------|----------|:---:|:---:|:---:|:---:|
| **pincher** | Rust | ✅ pre-existing | ✅ created | ✅ created | ✅ pre-existing |
| **polychora-temporal** | Rust | ✅ created | ✅ created | ✅ created | ✅ pre-existing |
| **DeckBoss** | TypeScript (pnpm) | ✅ created | ✅ created | ✅ created | ✅ pre-existing |
| **cocapn-marine** | Rust | ✅ created | ✅ created | ✅ created | ✅ pre-existing |
| **sonar-vision** | TypeScript/Python | ✅ created | ✅ created | ✅ created | ✅ pre-existing |
| **handy-marine-voice** | Rust | ✅ created | ✅ created | ✅ created | ✅ pre-existing |
| **construct-coordination** | Markdown/notes | ✅ created | ✅ created | ✅ created | n/a (coordination surface) |
| **ternary-conserve** | — | ⛔ REPO MISSING | ⛔ REPO MISSING | ⛔ REPO MISSING | ⛔ REPO MISSING |

---

## Files Created

### `.devcontainer/devcontainer.json` — 6 created

Each is customized for the repo's tech stack:

| Repo | Base Image | Key Features | PostCreate |
|------|-----------|-------------|------------|
| **polychora-temporal** | `rust:1-bullseye` | Rust + GH CLI | `cargo build` |
| **DeckBoss** | `typescript-node:20` | Node 20 + GH CLI + ESLint | `npm install && npm run build` |
| **cocapn-marine** | `rust:1-bullseye` | Rust + Python 3.11 + GH CLI | `cargo build` |
| **sonar-vision** | `typescript-node:20` | Node 20 + Python 3.11 + GH CLI | `npm install` + pip |
| **handy-marine-voice** | `rust:1-bullseye` | Rust + GH CLI + Audio features | `cargo build` |
| **construct-coordination** | `universal:2` | GH CLI + Markdown + Mermaid | echo workspace ready |

All include `AGENT_NAME`, `AGENT_ROLE`, DEEPINFRA/OPENAI env remapping, and VS Code extensions tuned to the repo's tech.

### `docs/AGENT_INTERFACE.md` — 7 created

Standardized template fields filled for each repo:

- **Primary Actions table** — 5-7 actions with CLI entry points and descriptions
- **Environment Variables Required** — broken into Required / Optional sections
- **Entry Points** — CLI, library/API, and test execution paths
- **How to Report Back** — Nail protocol for construct-coordination
- **Inter-repo Communication** — table of which repos to talk to and why
- **Dev Container** — codespace creation command

Each interface is **contextually accurate** — a Rust cargo build won't document `npm install`, and construct-coordination won't show a library API since it's a coordination surface.

### `.github/workflows/agent-workflow.yml` — 7 created + 1 template

Universal workflow pattern with repo-specific build steps:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agent_task` | string | varies | Shell command to execute |
| `agent_model` | string | deepseek-ai/DeepSeek-V4-Flash | Model preference |
| `output_format` | choice | markdown | markdown / json / yaml |
| `commit_results` | choice | true | auto-commit toggle |

Standard pipeline:
1. `actions/checkout@v4` (full depth)
2. Agent identity header
3. Toolchain setup (Rust/Node/Python as needed)
4. Build step (cargo build / npm build / skip for docs)
5. Execute task → tee to `agent-output/result.*`
6. Optionally commit results back
7. Upload artifact (7-day retention)
8. GitHub step summary

Reference template at `doc-templates/agent-workflow.yml` for copying into new repos.

---

## Flags & Known Issues

### 🔴 ternary-conserve — Repo Does Not Exist
The ternary-conserve repo was referenced as "just created" but is not present in the workspace. This repo will need:
- `.devcontainer/devcontainer.json` (Rust-based)
- `docs/AGENT_INTERFACE.md`
- `docs/GETTING_STARTED.md`
- `.github/workflows/agent-workflow.yml`

### 🟡 No Push Verification
These files are created locally in the workspace. If these are local clones, changes will need `git add`, `git commit`, `git push` for each repo. If they are being tracked by git, the current state is uncommitted.

### 🟡 deckboss / cocapn-marine / handy-marine-voice — Missing `.github/` directories
These repos had no `.github/` directory — directories were created from scratch. Verify the `.github/workflows/` paths match the expected GitHub remote structure.

---

## Standard Devcontainer Template Reference

For future repos, use this pattern:

```json
{
    "name": "<Repo Name> Development",
    "image": "mcr.microsoft.com/devcontainers/<lang>:<version>",
    "features": {
        "ghcr.io/devcontainers/features/github-cli:1": { "version": "latest" }
    },
    "remoteEnv": {
        "AGENT_NAME": "<agent-name>",
        "AGENT_ROLE": "<role>",
        "DEEPINFRA_API_URL": "https://api.deepinfra.com/v1",
        "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}",
        "DEEPINFRA_API_KEY": "${localEnv:DEEPINFRA_API_KEY}",
        "OPENAI_API_KEY": "${localEnv:OPENAI_API_KEY}"
    },
    "customizations": {
        "vscode": {
            "extensions": [ "lang-specific-extensions" ],
            "settings": { "editor.formatOnSave": true }
        }
    },
    "postCreateCommand": "cargo build || npm install",
    "remoteUser": "vscode"
}
```

Key principles:
1. **Lang-specific base image** — `rust:1`, `typescript-node:20`, `universal:2`
2. **GH CLI always** — every L3 agent needs `gh` for repo interaction
3. **API keys via `localEnv`** — never hardcode secrets
4. **Agent identity env vars** — `AGENT_NAME`, `AGENT_ROLE` for runtime awareness
5. **postCreateCommand** — fast path to 'ready' (build or install)

---

## Quick Start — Creating L3 Readiness for a New Repo

```bash
# 1. Create devcontainer
mkdir -p <repo>/.devcontainer
cp doc-templates/agent-workflow.yml <repo>/.github/workflows/agent-workflow.yml

# 2. Create AGENT_INTERFACE.md
mkdir -p <repo>/docs
cp <template>/AGENT_INTERFACE.md <repo>/docs/

# 3. Customize for repo's language and entry points
# (edit devcontainer.json image, env vars, extensions)
# (edit AGENT_INTERFACE.md actions, CLI paths, inter-repo links)
```
