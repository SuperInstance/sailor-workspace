# GC Report — 2026-06-06 22:51 UTC

## Pre-GC Disk State
- **Total:** 45G
- **Used:** 33G
- **Free:** 13G
- **Usage:** 73%

## GC Script Run
Ran `scripts/gc-system.sh --execute` successfully. The script:
- Evicted `lever-runner/.venv` (not present — already clean)
- Ran `git gc --aggressive --prune=now` on legacy pincher repos (minimal savings)
- Cleaned pip cache (already small at 880K)

## Manual Cleanup (Cargo Build Artifacts)

The script inventories but does **not** delete `target/` directories. Manual cleanup removed:

| Target | Size | Status |
|--------|------|--------|
| `pincher/target/` | 1.7 GB | ✅ Removed |
| `constraint-theory-core/target/` | 627 MB | ✅ Removed |
| `ternary-spatial/target/` | 151 MB | ✅ Removed |
| `ternary-types/target/` | 116 MB | ✅ Removed |
| `eisenstein-quantize/target/` | 88 MB | ✅ Removed |
| `deadband-snr/target/` | 66 MB | ✅ Removed |
| `pythagorean48/target/` | 63 MB | ✅ Removed |
| `silo-core/target/` | 19 MB | ✅ Removed |
| `ternary-fleet/*/target/` (21 crates) | ~121 MB | ✅ Removed |
| `/tmp/*/target/` (10 dirs) | ~133 MB | ✅ Removed |
| `/home/ubuntu/.npm/_cacache/` | 267 MB | ✅ Removed |
| **Total reclaimed** | **~3.3 GB** | |

## Post-GC Disk State
- **Total:** 45G
- **Used:** 30G
- **Free:** 16G
- **Usage:** 66% (was 73% — **7% improvement**)

## Left Intentionally
- `/home/ubuntu/.cache/puppeteer/` — 379 MB (headless Chromium, needed for browser tools)
- `/home/ubuntu/.cache/Homebrew/` — 56 MB (brew bottles)
- `/home/ubuntu/.cache/zig/` — 36 MB (zig compiler cache)
- `__pycache__` dirs — negligible (44K total)
- No `.venv` found in workspace
- `workspace/target/` — does not exist (no root cargo project)
- Memory files, config, git repos — preserved (immortal tier)

## Health Check
- **Disk:** Healthy at 66% — under 80% threshold
- **RAM:** Not checked (no issues flagged)
- **`target/` growth:** Cargo projects accumulate ~3 GB of build artifacts — recommend GC every 2-4 weeks or after major rebuild cycles
