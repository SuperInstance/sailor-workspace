# Kimi Code Fleet Worker Integration

> **Version:** 1.37.0
> **Binary:** `/home/ubuntu/.local/bin/kimi` (symlink → uv-managed tool)
> **Source:** https://moonshotai.github.io/kimi-cli/
> **GitHub:** https://github.com/MoonshotAI/kimi-cli

---

## Philosophy

Kimi Code is not just another LLM CLI. It's a **code-aware agent** designed to run
in the same places your CI runs — headless, scriptable, disposable. The fleet
worker pattern treats each Kimi invocation as a stateless task: spin up a
Codespace (or use any Linux host), pipe in a prompt, get back output, collect
the exit code. No state, no TTY requirement, no babysitting.

The whole point: **your agent fleet should execute tasks, not host conversations.**
Kimi's `--quiet` + `--config` flags make this possible without a single config
file on disk. You can provision a worker, run 50 Kimi tasks, and destroy it —
and never once wonder where a session file got left behind.

---

## 1. CLI Capabilities

Kimi Code can run in **both interactive and batch (non-interactive) modes**.

### Interactive Mode (default)

```sh
kimi                          # start interactive shell session
kimi -w /path/to/project      # start in a specific working directory
```

Interactive sessions have full TUI: tool calls, file viewing, prompt editing,
slash commands, and multi-turn conversation.

### Batch / Headless Mode (`--print` / `--quiet`)

This is the key flag for fleet/CI integration:

```sh
# via --prompt / -p flag
kimi --print -p "Add type annotations to src/utils.py"

# via stdin piping
echo "Explain this Makefile" | kimi --print

# quiet mode = print + text output + final message only
kimi --quiet -p "Write a commit message for the current diff"
```

| Flag | Effect |
|------|--------|
| `--print` | Non-interactive; auto-approves all tool calls (implied `--yolo`); outputs to stdout |
| `--quiet` | Shortcut for `--print --output-format text --final-message-only` |
| `--final-message-only` | Suppresses intermediate tool call output; only final assistant message |
| `--yolo` | Auto-approve all actions (can be used standalone) |
| `--plan` | Start in plan mode (review-before-execute) |

**Exit codes** make CI integration reliable:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Permanent failure (config/auth/quota errors) |
| `75` | Retryable failure (429/5xx/timeouts) |

### JSON Streaming Mode

For programmatic pipelines:

```sh
# JSON output
kimi --print -p "Hello" --output-format=stream-json

# JSON input + output (stdin/stdout)
echo '{"role":"user","content":"Hello"}' |
  kimi --print --input-format=stream-json --output-format=stream-json
```

### ACP / Wire Mode

- `kimi acp` — Run as ACP (Agent Client Protocol) server, for IDE integration
- `kimi web` — Browser UI with session management
- `kimi --wire` — Experimental Wire protocol server

---

## 2. API Key Requirements

**An API key is mandatory.** Kimi Code requires at least one configured LLM provider.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `KIMI_API_KEY` | API key for `kimi`-type providers (Moonshot/Kimi Code) |
| `KIMI_BASE_URL` | Base URL override for kimi-type providers |
| `KIMI_MODEL_NAME` | Model identifier override |
| `OPENAI_API_KEY` | API key for OpenAI-compatible providers |
| `OPENAI_BASE_URL` | Base URL override for OpenAI-compatible providers |
| `KIMI_SHARE_DIR` | Custom config dir (default `~/.kimi`) |
| `KIMI_CLI_NO_AUTO_UPDATE` | Set to `1` to disable updates |

### Configuration File

Default location: `~/.kimi/config.toml`

You can also pass config inline:

```sh
kimi --config '{"default_model":"my-model","providers":{...},"models":{...}}' --quiet -p "hello"
```

Or via file:

```sh
kimi --config-file /path/to/config.toml --quiet -p "hello"
```

### Supported Provider Types

| Type | Description | API Key Env Var |
|------|-------------|-----------------|
| `kimi` | Moonshot / Kimi Code API | `KIMI_API_KEY` |
| `openai_legacy` | OpenAI Chat Completions API | `OPENAI_API_KEY` |
| `openai_responses` | OpenAI Responses API | `OPENAI_API_KEY` |
| `anthropic` | Anthropic Claude API | — (in config) |
| `gemini` | Google Gemini API | — (in config) |
| `vertexai` | Google Vertex AI | — (in config + env) |

---

## 3. Model Support

Any LLM accessible through the supported API protocols can be used. Models are
defined in the config file under `[models.*]`.

### Example: OpenAI model

```toml
[providers.openai]
type = "openai_legacy"
base_url = "https://api.openai.com/v1"
api_key = "sk-..."

[models.gpt-4o]
provider = "openai"
model = "gpt-4o"
max_context_size = 128000
capabilities = ["thinking"]
```

### Example: Moonshot / Kimi model

```toml
[providers.moonshot]
type = "kimi"
base_url = "https://api.moonshot.cn/v1"
api_key = "sk-..."

[models.kimi-k2-thinking]
provider = "moonshot"
model = "kimi-k2-thinking-turbo"
max_context_size = 262144
capabilities = ["thinking", "always_thinking", "image_in"]
```

### Model Capabilities

| Capability | Description |
|------------|-------------|
| `thinking` | Deep reasoning (togglable) |
| `always_thinking` | Always deep reasoning (can't disable) |
| `image_in` | Image input support |
| `video_in` | Video input support |

---

## 4. Codespace Worker Integration

Kimi Code works well in headless Codespace environments. Here is how to deploy it.

### Prerequisites

- **Python 3.12–3.14** (3.13 recommended) — the tool is uv-managed; uv handles its own Python
- **`uv` installed** (Python package manager); installation script auto-installs it
- **Network access** to the configured LLM API endpoint
- **~256MB disk** for the uv tool cache + kimi installation

### Installation in a Codespace

```sh
# Quick install (auto-installs uv if missing)
curl -LsSf https://code.kimi.com/install.sh | bash

# Or if uv is already present:
uv tool install --python 3.13 kimi-cli

# Verify
kimi --version
```

### Recommended Codespace Config

Add to your `devcontainer.json` or `.devcontainer/Dockerfile`:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/python:1": {},
    "ghcr.io/devcontainers/features/uv:1": {}
  },
  "postCreateCommand": "uv tool install kimi-cli && kimi --version",
  "remoteEnv": {
    "KIMI_API_KEY": "${secrets:KIMI_API_KEY}",
    "KIMI_CLI_NO_AUTO_UPDATE": "1"
  }
}
```

### Fleet Worker Pattern

For running Kimi as an unattended worker in a fleet of Codespaces:

```sh
# 1. Configure via inline JSON (no config file needed)
CONFIG='{
  "default_model": "my-model",
  "providers": {
    "my-provider": {
      "type": "openai_legacy",
      "base_url": "https://api.openai.com/v1",
      "api_key": "'"$OPENAI_API_KEY"'"
    }
  },
  "models": {
    "my-model": {
      "provider": "my-provider",
      "model": "gpt-4o",
      "max_context_size": 128000
    }
  }
}'

# 2. Run batch task
kimi --config "$CONFIG" --quiet -p "Your task description here"

# 3. Check exit code for retry logic
if [ $? -eq 75 ]; then
  echo "Transient error, retrying..."
  sleep 10
  kimi --config "$CONFIG" --quiet -p "Your task description here"
fi
```

### Expected Disk/Resource Usage

| Resource | Estimate |
|----------|----------|
| Installation size | ~50–80 MB (uv-managed Python + kimi-cli) |
| Config file | < 1 KB |
| Sessions/logs | Variable; clean with `rm -rf ~/.kimi/sessions` |
| RAM per invocation | ~200–400 MB during execution |
| CPU | Single core during execution |

---

## 5. Limitations & Considerations

### Issues Found

1. **No API key → instant failure** (exit code 1). Must pre-configure at least one provider.

2. **`--print` mode implicitly enables `--yolo` (auto-approve)**. All tool calls (Shell, Read/Write files, etc.) are automatically executed. Be careful in untrusted environments — the AI can run shell commands.

3. **No built-in sandboxing.** Kimi Code will run arbitrary shell commands on the host. A fleet worker must use containerization (Docker/Codespace) or restrict capabilities externally.

4. **Session persistence.** Failed sessions create session files in `~/.kimi/sessions/`. These can accumulate. Cleanup may be needed for long-running workers.

5. **TTY not required** ✅ — fully works headless. Confirmed with `echo "hello" | kimi --print` in a non-TTY environment.

6. **No `execute` subcommand like Claude Code.** Unlike `claude execute`, Kimi does not have a dedicated one-shot subcommand — but `--quiet -p "task"` achieves the same result.

7. **Model context size matters.** If tasks involve large files, ensure `max_context_size` is set high enough (e.g., 128K for GPT-4o, 256K for kimi-k2).

8. **Services (search/fetch) only available on Kimi Code platform.** When using OpenAI, Anthropic, etc. as providers, the `SearchWeb` tool is unavailable and `FetchURL` falls back to local fetching.

---

## 6. Quick Reference Card

```sh
# Interactive session
kimi
kimi -w /project/path
kimi -m gpt-4o

# Batch one-shot (text output)
kimi --quiet -p "Write a test for function X"

# Batch one-shot (JSON streaming)
kimi --print -p "Analyze this" --output-format=stream-json

# Stdin batch
echo "Summarize this file" | kimi --print

# Custom config file
kimi --config-file /path/to/config.toml --quiet -p "Task"

# Inline config (no file needed)
kimi --config '{"default_model":"m","providers":{"m":{"type":"openai_legacy","base_url":"https://api.openai.com/v1","api_key":"sk-..."}},"models":{"m":{"provider":"m","model":"gpt-4o","max_context_size":128000}}}' --quiet -p "Task"

# ACP server (IDE integration)
kimi acp --port 9090

# Upgrade
uv tool upgrade kimi-cli
```

---

## 7. Fleet Architecture Notes

### Worker Lifecycle

```
┌────────────┐     ┌───────────────┐     ┌──────────────┐
│ Provision  │ ──> │ Configure &   │ ──> │ Execute      │
│ Codespace  │     │ Set API Keys  │     │ Kimi Task    │
└────────────┘     └───────────────┘     └──────┬───────┘
                                                │
                                                ▼
┌────────────┐     ┌───────────────┐     ┌──────────────┐
│ Collect    │ <── │ Cleanup       │ <── │ Capture      │
│ Results    │     │ Session Files │     │ Exit Code    │
└────────────┘     └───────────────┘     └──────────────┘
```

The `codespace-worker.sh` script in this repo automates steps 1-6. You provide a
repo, a branch, and a Kimi command. It handles provisioning, waiting, running,
capturing, and cleanup.

### Why Inline Config?

Inline JSON config means you don't need to ship a `~/.kimi/config.toml` to every
Codespace. The config lives in the environment variable or the invocation line.
This is critical for fleet workers — you want zero mutable state on the worker
disk beyond what the task produces.

### Related

- **`codespace-worker.sh`** — Creates ephemeral Codespaces, runs commands, cleans up
- **`setup-codespaces.sh`** — Bulk-provisions Codespaces for parallel task execution
- **`i2i-vessel/`** — The I2I message bus (bottles between fleet nodes)

---

*Last updated: 2026-06-05*
