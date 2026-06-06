# Circuit Breaker Rules — Oracle2 Experimental Guardrails

## Hard Limits (Will Not Cross)
| Resource | Limit | Reasoning |
|----------|-------|-----------|
| RAM usage | ≤ 14GB per experiment | Leaves 7GB for system + OpenClaw |
| Disk usage | ≤ 85% | Leaves 6.75GB headroom on 45G drive |
| CPU cores | ≤ 3 simultaneous | Leaves 1 core for system/OpenClaw |
| Build timeout | 300s default | Catches infinite compiles |
| Parallel builds | 1 at a time in /tmp | Rustc memory usage is unpredictable |

## Pre-Flight Checks (Every Experiment)
1. `free -m` — available RAM must be ≥ 7GB
2. `df -h /` — disk must be ≤ 85%
3. `uptime` — load average must be < 3.0
4. Check for existing heavy builds (`find /tmp -name "Cargo.lock" -newer`)

## Safe Experiments (Proven ✅)
- Room runtime builds: ~0.5GB
- Ternary crate builds: ~0.3GB each
- Cross-crate refactors: ~0.5GB
- rustc benchmarks on small code: ~1GB
- Web search / web research: no compute
- Subagent spawning: uses model API, not local

## Dangerous Experiments (Blocked)
- Full polychora build (vulkano + wasmtime + egui): ~18GB → exceeds 14GB limit
- Multi-crate parallel builds: >3 simultaneous → kills system
- Large data generation without disk checks
- Any build consuming >14GB resident memory

## Recovery (If Breached)
1. `kill -9 $(pgrep -f "rustc|cargo")` — kill all Rust compilation
2. `rm -rf /tmp/*/target/` — clear build artifacts
3. `df -h /; free -h` — verify recovery
4. Log what triggered the breach in `circuit-breaker-log.json`
