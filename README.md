# 🚀 Codespace Worker

Run commands remotely in ephemeral GitHub Codespaces. Perfect for cross-arch builds, agent offloads, and batch processing.

## Features

- Spawn codespaces from any GitHub repo
- Run multi-line commands with pipes and redirects
- Collect output from runs
- Auto-destroy codespaces when done
- Support for base64 file transfers

## Quick Start

```bash
codespace-worker.sh SuperInstance/repo "npm run build && npm test"
```

## Usage

```bash
codespace-worker.sh <repo> <command> [output-file]
```

## What it does:

1. Creates a lightweight codespace
2. Waits for it to be ready
3. Runs your command
4. Returns exit code
5. Destroys the codespace

## Example: Cross-arch build

```bash
codespace-worker.sh SuperInstance/pincher "cargo build --release" target/release/pincher
```

## Full example:

```bash
codespace-worker.sh SuperInstance/our-music-app "pip install -r requirements.txt && python3 run.py" /tmp/output.wav
```

For more advanced usage, check out `stunt-double.sh`. This is the core offload system that powers all our x86 work.
