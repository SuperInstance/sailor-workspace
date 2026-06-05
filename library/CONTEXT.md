# CONTEXT.md — Session-Relevant Context
# Initialized: 2026-06-05T01:17:00Z
# This file is ephemeral. Immortal facts go in MEMORY.md.
# CONTEXT.md is archived to memory/archive/ on each session start.

## Active Tasks
- Reflex system stable: 7 reflexes (α, β, γ, δ, ε, ζ, η)
- Next: Gap ν (correlated failures) — dependency-sampler script
- Fleet recon complete — 50 repos mapped

## Recent State Changes
- Session resumed at 2026-06-05T01:36:00Z
- Iteration 3 artifacts pushed to GitHub
- Baton protocol v2.1 published (REFLECT/PROMOTE types)
- Reflex ζ (Dedup) + η (Archive GC) promoted
- Fleet recon: 50 repos, 38 ternary-* crates, pincher most active
- dedup-reflexes.sh fixed, archive-gc.sh created, both pushed to GitHub

## Reflex Fire Timestamps
| Reflex | Last Fired | Expected Window |
|--------|-----------|-----------------|
| α | 2026-06-05 01:17 | 24h (on-demand only) |
| β | 2026-06-05 01:17 | 24h (on-demand only) |
| γ | 2026-06-05 01:17 | 1h (every major action) |
| δ | 2026-06-05 01:00 | 30m (heartbeat-triggered) |
| ζ | 2026-06-05 01:50 | 30d (on-demand, after promotions) |
| η | 2026-06-05 01:50 | 7d (on-demand, after GC runs) |

## Fleet Status
- Total repos: 50 (46 public, 4 private)
- Active push window: all within 7 days
- Largest: construct-coordination (30.6 MB), pincher (1.2 MB)
- Ternary crate cluster: ~38 coordinated Rust crates
- Fleet recon report: i2i-vessel/harbor/fleet-recon-20260605-0153.md

## Blocker/Alert State
- No blockers
- No critical alerts
