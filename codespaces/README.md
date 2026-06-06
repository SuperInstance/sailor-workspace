# Codespaces as Workers

Run arbitrary commands in ephemeral GitHub Codespaces — turning cloud
VMs into disposable compute workers for CI/CD, agent tasks, and
ad‑hoc builds.

## Why?

The main OpenClaw host runs on **Oracle ARM64**. Many tools we need
(Claude Code, certain Rust crates, x86_64‑only binaries) work best on
**amd64 Linux**. Codespaces give us:

- **x86_64 execution** on demand — no emulation, no cross-compilation
- **Ephemeral lifecycle** — create, work, destroy. Zero cleanup
- **Rich base image** — Rust, Python, Node, Go, Docker, and more
- **Billing by the minute** — pay only for active compute
- **Devcontainer support** — any repo with `.devcontainer/devcontainer.json`
  gets its exact environment

## Usage

```bash
# Basic: run `cargo build` in pincher's default branch
./codespace-worker.sh -R SuperInstance/pincher -- cargo build --release

# Different repo and branch with explicit machine type
./codespace-worker.sh -R SuperInstance/pincher -b feature/foo -m basic -- cargo test

# Run Claude Code inside a codespace
./codespace-worker.sh -R SuperInstance/pincher -- claude

# Dry run to see what would happen
./codespace-worker.sh -R SuperInstance/pincher -n -- echo hi

# Create a codespace and leave it running for interactive use
./codespace-worker.sh -R SuperInstance/pincher

# Custom machine and timeout
./codespace-worker.sh -R SuperInstance/pincher -m premium -t 600 -- make bench
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-R, --repo` | `SuperInstance/pincher` | Repository `owner/name` |
| `-b, --branch` | `main` | Branch to create from |
| `-m, --machine` | *(auto)* | Machine type: `basic`, `standard`, `premium`, `large` |
| `-t, --timeout` | `300` | Max seconds to wait for codespace creation |
| `--idle-timeout` | `10m` | Inactivity before auto‑stop |
| `--retention` | `1h` | Retention after stop before auto‑delete |
| `-o, --output-dir` | `./output` | Where to save command logs |
| `-d, --display-name` | *(auto)* | Friendly name (max 48 chars) |
| `-n, --dry-run` | off | Print configuration without creating |
| `-v, --verbose` | off | Detailed debug logging |

## Architecture

```
┌────────────────────┐     gh cs create      ┌─────────────────────┐
│   ARM64 Host       │ ─────────────────────→ │  x86_64 Codespace  │
│  (OpenClaw)        │                        │   (ephemeral VM)    │
│                    │     gh cs ssh -- cmd    │                     │
│  codespace-        │ ─────────────────────→ │  • Run command      │
│  worker.sh         │                        │  • Capture output   │
│                    │     gh cs delete       │  • Exit             │
│                    │ ←───────────────────── │                     │
└────────────────────┘                        └─────────────────────┘
```

## How It Works

1. **Create** — `gh codespace create` with `--default-permissions` (no
   interactive prompts), an idle timeout, and a retention period.
   Output is the codespace name.
2. **Wait** — Poll `gh codespace view --json state` until state is
   `Available` (with configurable timeout).
3. **Execute** — `gh codespace ssh --codespace <name> -- <command>`.
   Stdout+stderr are captured to a timestamped log file in `output/`.
4. **Cleanup** — On success, failure, or timeout, the codespace is
   deleted via `gh codespace delete --force`. A `trap` handler ensures
   cleanup even if the script itself is interrupted.

## Cost Considerations

| Machine | vCPUs | RAM | Storage | Cost/hr (approx) |
|---------|-------|-----|---------|------------------|
| Basic   | 2     | 4 GB | 32 GB   | $0.18/hr         |
| Standard| 4     | 8 GB | 32 GB   | $0.36/hr         |
| Premium | 8     | 16 GB| 64 GB   | $0.72/hr         |
| Large   | 16    | 32 GB| 128 GB  | $1.44/hr         |

**Pricing notes:**
- You are billed only while the codespace is **running**.
- Idle timeout auto‑stops after inactivity (default 10 min).
- Retention period auto‑deletes after stop (default 1h prevents orphan
  accumulation even if cleanup fails).
- Test/CI workloads typically cost $0.02–$0.10 per run depending on
  machine type and duration.
- GitHub Free plan includes 120 core‑hours/month (30h of basic × 4
  cores or similar). Pro/Team plans have higher limits.
- Budget alert: set `--idle-timeout 5m` and `--retention 30m` for
  shortest possible billing window.

## Output Files

Logs are saved to `output/<codespace-name>-<timestamp>.log`.
Each log contains:
- Full stdout/stderr of the executed command
- Last 20 lines appended at the end of the file for quick inspection
- Exit code is returned via the script's exit status

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Codespace creation fails | Exit code 3, no cleanup needed |
| Codespace creation times out | Exit code 4, cleanup attempted |
| Codespace enters bad state | Exit code 5, cleanup attempted |
| Command inside codespace fails | Exit code is preserved, cleanup still happens |
| SSH connection fails | Exit code preserved, cleanup attempted |
| Script interrupted (Ctrl+C) | Trap handler deletes codespace |
| Cleanup delete fails | Warning logged, script exits normally |

## Rate Limits

- **API rate limit**: 5,000 requests/hour for authenticated users
  (each create/view/delete costs ~3-4 requests)
- **Codespace limits**: Concurrent codespace counts vary by plan:
  - Free: 2 concurrent
  - Pro: 8 concurrent
  - Organization: 16+ concurrent
- **Creation rate**: ~1-3 codespaces per minute (limited by VM
  provisioning time, not API rate)

## Integration Ideas

### As a CLI wrapper for Claude Code

```bash
# Run Claude Code on a file/query in an ephemeral x86_64 environment
alias claude-remote='./codespace-worker.sh -R SuperInstance/pincher -- claude'
```

### In scripts

```bash
if ./codespace-worker.sh -R SuperInstance/pincher -- cargo test; then
    echo "All tests passed!"
else
    echo "Tests failed — see output/ for logs"
fi
```

### Parallel workers with TaskFlow

Spawn multiple `codespace-worker.sh` instances in parallel, each
working on a different task. The `-d` (display-name) flag helps identify
them in the GitHub dashboard.

## Prerequisites

- **GitHub CLI** (`gh`) 2.40+ with:
  - Authentication to `github.com`
  - Codespace creation permissions
  - Scopes: `repo`, `codespace`, `admin:public_key`
- **SSH client** — used by `gh codespace ssh` internally
- The repository must have:
  - A `devcontainer.json` (optional — universal image used otherwise)
  - GitHub Codespaces enabled (Settings → Codespaces)

### One-time Auth Setup

The GitHub CLI token needs the `codespace` OAuth scope. Run the setup script
to add it — this triggers an interactive browser device-code flow:

```bash
./setup-codespaces.sh
```

This will:
1. Check if the `codespace` scope is already present
2. If missing, start a device code flow
3. Print a code and URL — open the URL in a browser, enter the code, and authorize
4. Confirm the scope is now active

Alternatively, run the underlying command directly:

```bash
gh auth refresh -h github.com -s codespace
```

## Troubleshooting

- **"No codespace scope"**: Run `gh auth refresh -h github.com -s codespace`
- **"Codespace creation failed"**: Check the repo has Codespaces enabled
  and you have permission
- **"SSH connection refused"**: The base image might lack an SSH server.
  Add `"features": {"ghcr.io/devcontainers/features/sshd:1": {}}` to
  `devcontainer.json`
- **Command exit codes not propagating**: `gh codespace ssh` should
  pass through exit codes; verify with `-- echo $?`
