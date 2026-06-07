# SAEP Veto Engine

## The 4-Tier Hierarchy

```
Market ─────── Global override (fleet-wide)
  ▲
Portfolio ──── All solvers on this instance
  ▲
Sector ─────── Group of related constraints
  ▲
Room ───────── Single constraint
```

### In Savanty

```python
from savanty import VetoEngine

# Create veto with specific level
veto = VetoEngine(level="portfolio")

# Add custom veto rules
veto.add_rule("safety_check", lambda s: not s.has_dangerous_assignments())
veto.add_rule("budget_check", lambda s: s.total_cost < 1000)

# Apply veto
result = veto.check(solution)
if result.blocked:
    print(f"🚫 Blocked by: {result.reason}")
    print(f"At level: {result.level}")
```

### Veto Propagation

A veto at any tier propagates upward:
- Room veto → blocks that single constraint
- Sector veto → blocks all constraints in the group
- Portfolio veto → blocks the entire solution
- Market veto → blocks solution + broadcasts to fleet

Each veto includes a reason string and can be overridden by an authenticated clearance at a higher tier.
