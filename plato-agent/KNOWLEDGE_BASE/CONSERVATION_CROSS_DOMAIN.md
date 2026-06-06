# Cross-Domain Conservation Parametric Model

**Source:** Golden Insights, SYNERGY-MAP.md, conservation-thesis

## The Core Insight

A single `ConservationDomain` struct can budget **fish stocks, crew attention span, boat fuel, electrical battery, and inference tokens** using the same Budget→Profile→Detect→Report cycle.

When fish stocks drop, reroute changes fuel consumption, which changes crew schedule, which changes inference budgets. The cascade is automatic because the units are parameterized, not hardcoded.

**Why this matters:** This treats the whole system as a single resource organism. The user doesn't watch 5 gauges — the conservation engine tells them what matters.

## Cross-Pollination

| Repo | Application | Priority |
|------|------------|----------|
| **pincher** | Resource PID controller applies conservation to agent memory/budget | P1 |
| **constraint-theory-core** | Implement the ConservationDomain struct | P1 |
| **DeckBoss** | Marine resource tracking (fuel, fish, crew time) | P2 |
| **Sonar-vision** | Sensor energy budget conservation | P2 |
| **nebula** | Edge inference budget: when confidence is high, don't burn tokens | P1 |

## Expansion Potential

Create a `conservation-core` crate with:
- `ConservationDomain<T>` — generic resource domain
- Budget::new() → Profile::new() → Detect::new() → Report::new()
- Automatic cascade across linked domains

One struct, any resource, automatic system-wide awareness.
