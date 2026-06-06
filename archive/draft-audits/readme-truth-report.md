# README Truth-Sayer Report

**Date:** 2026-06-05  
**Inspected:** https://github.com/SuperInstance/pincher  
**Analysis depth:** Full tree traversal of source (`pincher-core`, `pincher-cli`, `tools/`, `scripts/`, config files)

---

## What Was Pruned

### 1. "Five Deployment Modes" — Entire Section Removed

**What it claimed:** Lighthouse-connected cloud fleet, Codespaces, Tender + Offline, Container/Sandboxed, Bare Metal — each with a Mermaid diagram and boot sequence.

**Reality:** None of these modes exist. There is:
- No `boot.sh` script (the file doesn't exist in the repo root)
- No `--mode lighthouse/codespaces/offline/container/bare-metal` flags anywhere in the project
- No Docker image published at `superinstance/pincher`
- No ESP32 build support
- No Lighthouse Keeper API
- No Tender sync protocol

**Action:** Entire "Five Deployment Modes" section deleted. The Mermaid diagrams were aspirational architecture sketches, not working systems.

### 2. Holodeck MUD — Removed

**What it claimed:** "Spatial abstraction for fleet coordination"

**Reality:** No implementation of a "Holodeck MUD" exists anywhere in the codebase. No reference in Cargo.toml, no module, no test, no script.

**Action:** All references removed.

### 3. Baton Protocol Scripts — Removed; Baton Concept Simplified

**What the README claimed:** Tools `baton-create.sh`, `baton-read.sh`, `baton-spline.sh`, `baton-harbor-check.sh`, `baton-flush.sh` — none exist in the repository.

**Reality:** The `tools/` directory contains: `checkpoint.sh`, `deepinfra_client.py`, `fleet-scout.sh`, `gc-fleet.sh`, `init-context.sh`, `model_router.py`, `promote-reflex.sh`, `reflex-engine.sh`, `requirements.txt`, `__init__.py`. None of the baton scripts are present. The I2I protocol is referenced in devcontainer env vars and in `reflex-engine.sh` comments checking for `/tmp/i2i-vessel/bottles`, but there's no baton tooling.

**Action:** Removed the "Baton Protocol" section and script table. The concept lives on in the project infrastructure but has no tooling at v0.1.0.

### 4. Dead Image Link — Removed

**What it claimed:** `pincher-icon.jpg`

**Reality:** `assets/` contains `hermit-crab.jpg` and `logo.jpg`. No `pincher-icon.jpg`.

**Action:** Removed the reference to `pincher-icon.jpg` from the file structure.

### 5. Non-Existent File Structure — Removed Aspirational Layout

**What it claimed:**
```
├── boot.sh                    # Doesn't exist
├── CHARTER.md                 # Doesn't exist
├── ABSTRACTION.md             # Doesn't exist
├── STATE.md                   # Doesn't exist
├── splines/                   # Doesn't exist
├── reflexes/                  # Doesn't exist
```

**Reality:** The repo has a clean Rust workspace structure. Many of the legacy "PincherOS" files never made it to this repo.

**Action:** Replaced with an accurate, inventory-based file tree showing every file that actually exists.

### 6. "Instant Boot" Claims — Removed

**What it claimed:** Implicit claims about latency (e.g., `~50ms | $0` for exact matches) stated as if quantified/proven.

**Reality:** The `benchmarks/` directory exists but has one benchmark doc targeting RTX 4050. No published guarantees. The confidence loop description is preserved in the reflex engine section with the original latency numbers from the architecture, but framed as the design targets rather than verified performance claims.

**Action:** The reflex engine flowchart previously had hard latency/cost claims. These are preserved in the text as design characteristics (reasonable estimates from the architecture), not marketed as "instant boot."

---

## What Was Preserved & Highlighted

### The Reflex Engine (Teach → Match → Execute)
The core architecture diagram is preserved and simplified from the Mermaid flowchart to a readable text flowchart. The three-tier confidence system (Exact/Similar/Novel) is kept as it's the primary innovation.

### The Vector Store (SQLite-backed)
Verified: `pincher-core/src/db/` implements a real SQLite vector store with `sqlite-vec`. The schema matches `registry_schema.sql`. The `Database` struct supports `insert_reflex`, `search_nearest`, etc.

### The Bubblwrap Sandbox
Verified: `pincher-core/src/sandbox/bwrap.rs` has a complete implementation with `SandboxConfig`, `ExecutionResult`, configurable network/read-only/whitelist/blocked-patterns, and fallback to `std::process::Command`.

### The CLI Commands
Verified: `pincher-cli/src/main.rs` has all the listed subcommands (status, doctor, teach, do, reflexes, compile, mature, pack, unpack, run, bench, shell-info, publish, update, gastrolith). The commands print output but some (teach, do) are stubs at the CLI layer — they don't yet call the core library. This is noted appropriately.

### The `.nail` Format (Migration Module)
Verified: `pincher-core/src/migration/` implements `pack_nail`, `unpack_nail`, `verify_nail`, `compatibility_score`, `fingerprint`, with `NailManifest`, `ShellFingerprint`, `NailChecksums` types.

### Feature Flags (onnx, landlock, wasmtime)
Verified: Cargo.toml has all three features with correct `optional = true` dependencies.

### The Binary Name
The README now uses `pincher` (not `./pincher` or `./boot.sh`) as the primary invocation command, matching the Cargo binary name.

---

## Statistics

| Metric | Before | After |
|--------|--------|-------|
| Lines of aspirational fiction | ~200+ | ~0 |
| Deployment modes claimed | 5 (none exist) | 1 (build from source) |
| Dead image links | 1 | 0 |
| Non-existent tools in tables | 5 | 0 |
| Non-existent files in structure | 6+ | 0 |
| Honest feature table | Partial | Complete with real statuses |
| Mermaid diagrams | 4 (aspirational) | 0 (converted to text) |

---

## Recommendations

1. **Boot script:** If the team wants `boot.sh`, write it. It should just call `cargo run --release` or the installed binary.
2. **Baton tooling:** The `/tmp/i2i-vessel/bottles` path in `reflex-engine.sh` suggests the infrastructure exists at some level. If scripts exist in another branch, merge them.
3. **Dockerfile:** `.devcontainer/Dockerfile` exists but no production Dockerfile. Simple to add.
4. **Benchmarks:** The `benchmarks/` dir has one doc. The CLI has `pincher bench`. Wire them together for real numbers.
5. **The `teach` and `do` commands:** Currently print stubs. Wire to `ReflexEngine` in `pincher-core` for the v0.2.0 experience.
