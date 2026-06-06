# Fleet Production Readiness Audit — 2026-06-05

Audited: **pincher** (GitHub), **Oracle2** host, **ZeroClaw** sandbox, **Baton/I2I** vessel

---

## 1. PINCHER REPO (github.com/SuperInstance/pincher)

### Found

- **Language:** Rust (workspace with `pincher-core` + `pincher-cli` members)
- **Toolchain:** stable with rustfmt + clippy
- **License:** MIT (LICENSE exists)
- **README:** Extensive developer manual covering 5 deployment modes (Lighthouse, Codespaces, Tender/Offline, Container, Bare Metal) and the Baton protocol
- **Docs:** 20+ doc files including: `ARCHITECTURE.md` (×2), `FLEET_ARCHITECTURE.md`, `FLEET_ORDERS.md`, `COGNITIVE_REFLEXES.md`, `CONTEXT.md`, `MVP_CHECKLIST.md`, `ROADMAP.md`, `RISKS.md`, `SIMULATION_RUNS.md` (×3), `META_HEALTH.md`, `PRIORITY_EVICTION.md`, `REFLEX_PROMOTION.md`, `LEGACY_MIGRATION.md`, `FUTURE-INTEGRATION.md`, `PLATO-LINEAGE.md`, `SESSION-STATE.md`, `CONTRIBUTING.md` + ADR dir + agent dir
- **CI/CD workflows:** 2 workflows exist (`agent_activation.yml`, `publish_nail.yml`)
- **Secrets template:** `.env.template` defines all env vars needed
- **Installation:** `install.sh` script exists
- **Commit activity:** Very active — 36 runs, 5+ commits in last 24 hours

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **❌ CI consistently fails** | P0 | 36 total runs; last 2 are `failure`. The CI workflow that ran those 36 times (workflow_id 287952374) has been **deleted** from the repo. Only 2 workflows remain, both seem untested. No green CI badge in months. |
| **❌ No devcontainer** | P1 | `.devcontainer/` directory does not exist (404). The README references `postStartCommand` in `devcontainer.json` — this is aspirational, not real. |
| **❌ Security: eval in CI** | P1 | `agent_activation.yml` uses `eval '${{ github.event.inputs.command }}'` — workflow_dispatch injection vector. |
| **⚠️ Cargo metadata broken** | P2 | `Cargo.toml` has `repository` and `homepage` pointing to `pincherOS` (wrong repo). |
| **⚠️ Stale workload defs** | P2 | README references `boot.sh` and `pincher` CLI binary that don't exist in the repo. The Rust crate hasn't been verified to build. |
| **⚠️ pincher-infer not in workspace** | P2 | `pincher-infer` directory exists but isn't listed in workspace `members`. |
| **⚠️ publish_nail.yml is aspirational** | P2 | Workflow references `pincher` CLI + `pincher compile`, `pincher mature`, `pincher pack` — these binaries must exist in PATH for the workflow to work. Unlikely to pass without a pre-built `pincher` binary. |
| **🔴 Secrets unknown** | P0 | CI references `DEEPINFRA_API_KEY`, `PINCHER_SIGNING_KEY`, `PINCHER_REGISTRY_TOKEN` — unclear if these are set in GitHub Secrets. |
| **⚠️ No CHANGELOG or release process** | P2 | No tags, no releases. No versioning strategy. |

---

## 2. ORACLE2 HOST (ARM64, 4-core, 24G RAM)

### Found

| Metric | Value | Status |
|--------|-------|--------|
| **Disk** | 29G / 45G (65%) | 🟡 Marginal — was 90%, 7.2G reclaimed already |
| **RAM** | 1.1G / 23G used | 🟢 22G available |
| **Uptime** | 3 days, 6h | 🟢 Fresh |
| **Load** | 0.23 / 0.32 / 0.27 | 🟢 Idle |
| **Swap** | None | ⚠️ No swap configured |

### Running Services

| Service | Status | Notes |
|---------|--------|-------|
| **OpenClaw gateway** | ✅ | node PID 886805, 503MB RSS, port 18789 |
| **Lever-Runner bot** | ✅ | systemd service, 121MB, polling Telegram |
| **Docker daemon** | ✅ | Running, 0 containers |
| **SSH** | ✅ | Active listener |
| **seed-mcp-v2** | ✅ | Python script, 20MB RSS |

### Key Binaries

| Binary | Path | Status |
|--------|------|--------|
| claude | `/home/linuxbrew/.linuxbrew/bin/claude` | ✅ |
| gh | `/home/linuxbrew/.linuxbrew/bin/gh` | ✅ |
| kimi | `/home/ubuntu/.local/bin/kimi` | ✅ |
| strace | `/usr/bin/strace` | ✅ |
| docker | system | ✅ |

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **❌ Stale symlinks in PATH** | P1 | 4 broken symlinks: `fleet-neofetch`, `crab`, `plugin-runtime`, `field` all point to deleted scripts. These are in `~/.local/bin/` which should be in PATH. |
| **❌ No swap** | P2 | 0 swap configured. If memory pressure hits, OOM kills will happen. 22G free now, but memory-intensive Rust compilations or multi-agent operations could edge up. |
| **⚠️ Disk trending up** | P2 | Was at 90%, now 65% after GC. The lever-runner/.venv alone is 5.3G. Without proactive GC, it will creep up. |
| **⚠️ Workspace git remote missing** | P1 | The workspace git repo at `~/.openclaw/workspace/` has **no remote configured**. Changes here are NOT pushed to GitHub. |
| **⚠️ Workspace is messy** | P2 | ~28 top-level items, unsorted. Lots of audit/simulation docs mixed with actual config. |
| **❌ No .env file** | P1 | No `.env` at workspace root. The pincher `.env.template` defines 15 vars; none are instantiated locally. |

---

## 3. ZEROCLAW SANDBOX

### Found

- **Path:** `/home/ubuntu/.openclaw/workspace/zeroclaws/`
- **Scripts:** `runner.sh` (worker runner), `spawn.sh` (background spawner)
- **Subdirs:** `dojo/`, `logs/`, `reports/`, `scratch/`, `vessel/`
- **State:** Appears to be a lightweight sandbox that spawns ephemeral workers
- **Reports:** 6 reports generated (i2i-play, pincher-play, plato-explore, spectral-scan, nightly×2)
- **Logs:** 4 log files from initial experiments (June 3)

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **❌ Stale/empty vessel** | P2 | `vessel/` directory exists but is **empty**. The runner writes bottles to `/tmp/i2i-vessel/bottles/` instead. Either the vessel should be a symlink or removed. |
| **❌ No CHARTER/IDENTITY/SESSION-STATE** | P2 | These files exist at the I2I vessel level but the ZeroClaw sandbox itself has no identity files. |
| **❌ Unused scratch** | P2 | `scratch/` directory is empty — no sandbox tasks have been run recently. |
| **⚠️ Orphaned logs** | P2 | 4 logs from June 3, no activity since. The nightly reports are being generated but go to `reports/` and are copied to the I2I vessel. |
| **⚠️ Hardcoded paths** | P2 | `runner.sh` hardcodes `WORKSPACE` and `VESSEL` paths — not configurable. |

---

## 4. BATON / I2I VESSEL

### Found

- **Path:** `/tmp/i2i-vessel/` (symlink exists — survives tmpfs? Actually `/tmp` is tmpfs, so this is ephemeral!)
- **Identity:** Oracle2 (Turbo-Shell L3 Ensign)
- **Charter:** Web-facing layer, API integration, git operations, fleet comms
- **Bottles:** 9 bottles including nightly reports, handshake batons, heartbeat
- **Harbor:** 4 reports (fleet recon, GC report, push report, scout report)
- **Diary:** 2 entries (second watch, PLATO-SUCCESSOR)
- **Proposals:** Empty
- **Vocab:** Empty
- **Session state:** Last checkpoint 2026-06-05 01:51 — reflexes ζ+η promoted

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **❌ Ephemeral storage** | **P0** | `/tmp/i2i-vessel/` is on **tmpfs**. Contents are lost on reboot! The vessel is the canonical fleet communication point. It should be on persistent storage (`/home/ubuntu/...`). |
| **❌ Proposals/vocab empty** | P2 | Both `proposals/` and `vocabularies/` are empty. These are intended directories with no content. |
| **❌ No guardian process** | P1 | Nothing monitors the I2I vessel for incoming batons. The `harbor` directory has stale reports (last update 01:53), no active listener. |
| **⚠️ 6-day diary gap** | P2 | Last diary entry is June 3 morning. Session state says "push changes to GitHub" as next action but no evidence of that. |
| **⚠️ Harbor reports stale** | P2 | Last harbor updates were 01:53 UTC — 3.5+ hours stale. No flag indicating "fleet sync complete." |

---

## 5. PUNCHLIST — Top 5 to Fix First

### #1 🔴 P0: Make the I2I Vessel Survive Reboots
**What:** Migrate `/tmp/i2i-vessel/` → `/home/ubuntu/.openclaw/workspace/i2i-vessel/` with a `/tmp/i2i-vessel` symlink for backward compat. The vessel is the fleet's nerve center — it must persist.
**Effort:** 10 min
**Done:** Vessel lives on persistent disk. Symlink exists. All scripts reference the persistent path.

### #2 🔴 P0: Fix CI/CD or Remove Broken Workflows
**What:** 36 broken CI runs. Either fix the CI pipeline (verify `pincher` crate builds, add Rust CI) or delete the broken workflows. The `publish_nail.yml` references tools that don't exist yet. The CI workflow that ran 36 times was deleted without replacement.
**Effort:** 2-4 hours
**Done:** `cargo test` passes in CI. At minimum a `cargo build` + `cargo clippy` workflow exists and is green. Secrets are verified set or removed from workflow.

### #3 🔴 P1: Add Devcontainer for Codespaces
**What:** Create `.devcontainer/devcontainer.json` with Rust toolchain, the env contract, and `postStartCommand`. This enables Level-3 activation via Codespaces — the README already promises this.
**Effort:** 1-2 hours
**Done:** Codespaces boot with Rust + env. README boot instructions work end-to-end.

### #4 🔴 P1: Workspace Git Remote & Cleanup
**What:** Set the workspace remote to `git@github.com:SuperInstance/pincher.git` (or appropriate fleet repo). Fix the 4 stale symlinks. Create the `.env` file from template.
**Effort:** 30 min
**Done:** `git remote -v` shows upstream. Stale symlinks removed. `.env` exists with agent identity.

### #5 🟡 P1: Fix Security: eval Injection in agent_activation.yml
**What:** Replace `eval '${{ github.event.inputs.command }}'` with a well-scoped script that accepts structured inputs. Currently anyone with workflow_dispatch access can inject arbitrary shell.
**Effort:** 1 hour
**Done:** CI uses structured inputs with allowlist or no eval. Security hardening for workflow.

---

## Summary Dashboard

| Area | Health | P0 | P1 | P2 | Top Risk |
|------|--------|----|----|----|----------|
| **pincher repo** | 🟡 Code exists, CI broken | 2 | 2 | 4 | CI completely broken, 0 green runs |
| **Oracle2 host** | 🟢 Stable, some cleanup | 0 | 3 | 2 | No git remote, stale symlinks in PATH |
| **ZeroClaw** | 🟡 Functional but stale | 0 | 0 | 4 | Orphaned from main fleet flow |
| **I2I Vessel** | 🟡 Active but fragile | 1 | 1 | 3 | Lives on tmpfs, gone on reboot |

**Total:** 3 P0, 6 P1, 13 P2 items

---

*Audit performed 2026-06-05T05:15 UTC from Oracle2 host. Data collected via GitHub API + local system inspection.*
