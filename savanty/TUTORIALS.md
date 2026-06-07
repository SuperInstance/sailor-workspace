# 🧩 savanty — TUTORIALS

## The Hacker's la-link: From 0 to First ASP Solution in 15 Minutes

---

### 🎯 Tutorial 1: "I want to solve a scheduling conflict"

**Goal:** 3 meetings, 2 rooms, 5 people, no double-booking.

**Time:** 5 minutes

```bash
# Save this as problem.json
cat > problem.json << 'EOF'
{
  "type": "scheduling",
  "meetings": ["Standup", "Review", "Planning"],
  "rooms": ["Room-A", "Room-B"],
  "people": ["Alice", "Bob", "Carol", "Dave", "Eve"],
  "duration_minutes": 30,
  "constraints": {
    "Alice_cant_attend_morning": "Standup",
    "Room_A_has_projector": true,
    "Planning_needs_projector": true
  }
}
EOF

# Solve it
savanty solve problem.json --output schedule.json

# Look at the result
cat schedule.json | jq .
```

**Expected output:**

```json
{
  "solutions": [{
    "assignments": [
      {"meeting": "Standup", "room": "Room-A", "time": "09:00", "attendees": ["Bob","Carol","Dave","Eve"]},
      {"meeting": "Review",  "room": "Room-B", "time": "09:00", "attendees": ["Alice","Bob","Carol","Dave","Eve"]},
      {"meeting": "Planning","room": "Room-A", "time": "09:30", "attendees": ["Alice","Carol","Dave","Eve"]}
    ],
    "score": 1.0,
    "constraints_satisfied": 5,
    "constraints_violated": 0
  }]
}
```

---

### 🎯 Tutorial 2: "I want to see what happens with symmetry violations"

**Goal:** Two identical resources — swapping them should yield the same optimality.

**Time:** 5 minutes

```python
from savanty import Solver, SymmetrySkeptic

problem = {
    "type": "assignment",
    "workers": ["Worker-X", "Worker-Y"],  # identical skills
    "tasks": [{"id": "A", "skill": "general"},
              {"id": "B", "skill": "general"}],
}

solver = Solver("clingo")
solution = solver.solve(problem)

# The solution might assign Worker-X→Task-A, Worker-Y→Task-B
# But swapping should be equally valid — that's symmetry
checker = SymmetrySkeptic(tolerance=0.3)

if not checker.verify(solution):
    print("⚠️ Symmetry violation: Workers are interchangeable "
          "but solution favors one assignment path")
    # This flags a potential solver bias
    solution = solver.rebalance(solution, symmetry=True)

print(f"✅ Rebalanced: {solution}")
```

---

### 🎯 Tutorial 3: "I want to add a SAEP veto constraint"

**Goal:** Block any solution that schedules more than 2 meetings in the same room.

**Time:** 5 minutes

```python
from savanty import Solver, VetoEngine

solver = Solver("clingo")
solution = solver.solve("Schedule 5 meetings in 2 rooms")

# Add a portfolio-level veto
veto = VetoEngine(level="portfolio")
veto.add_rule("max_two_per_room", lambda s: all(
    len([m for m in s.assignments if m.room == r]) <= 2
    for r in set(a.room for a in s.assignments)
))

result = veto.check(solution)
if result.blocked:
    print(f"🚫 Vetoed: {result.reason}")
    # Savanty will now re-solve with the veto as a hard constraint
    solution = solver.solve(
        "Schedule 5 meetings in 2 rooms, max 2 per room"
    )
```

---

### 🎯 Tutorial 4: "I want to cluster similar problems with TDA"

**Goal:** Group optimization problems by their constraint topology.

**Time:** 10 minutes

```python
from savanty import TDAnalyzer

analyst = TDAnalyzer()

# Load past problems
problems = analyst.load_problems("history/")

# Compute persistence diagrams for each
diagrams = [analyst.persistence(p) for p in problems]

# Cluster by topological similarity (Wasserstein distance)
clusters = analyst.cluster(diagrams, method="betti")

for cid, members in clusters.items():
    print(f"\nCluster {cid} — {len(members)} problems:")
    for p in members[:3]:
        print(f"  • {p.name} (β₀={p.betti[0]}, β₁={p.betti[1]})")

    # Suggest prototypical constraints for this cluster
    prototype = analyst.prototype(clusters[cid])
    print(f"  → Prototype: {prototype.constraints}")
```

---

### 🎯 Tutorial 5: "I want to use savanty in a CI/CD pipeline"

**Goal:** Validate deployment decisions against ASP constraints.

**Time:** 10 minutes

```yaml
# .github/workflows/deploy-validate.yml
name: Deploy Validation
on: [deployment]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate with Savanty
        run: |
          pip install savanty
          savanty solve deploy-constraints.json --output validation.json
          savanty validate --solution validation.json --symmetry-check
          savanty gate --solution validation.json --veto-level portfolio
```

---

## 🔬 Quick Reference

| Command | Purpose | Docs |
|---------|---------|------|
| `savanty solve <input>` | Solve a natural language/JSON problem | `README.md` |
| `savanty validate --solution` | Check topological symmetry | `docs/SYMMETRY-SKEPTIC.md` |
| `savanty gate --solution` | Apply SAEP veto layer | `docs/VETO-ENGINE.md` |
| `savanty visualize` | TDA visualization of constraint space | `docs/TDA-CLUSTERING.md` |
| `savanty cluster` | Cluster problems by topology | `docs/TDA-CLUSTERING.md` |
| `savanty test --suite` | Run test suites | `README.md` |

---

## 🏆 From Here

- ➡️ [ONBOARDING.md](./TEMPLATES/ONBOARDING.md) — Day 1 → Day 5 plan
- ➡️ [README.md](./README.md) — Full docs & quickstart
- ➡️ [TEMPLATES/](./TEMPLATES/) — Boilerplate for custom solvers
- ➡️ [docs/ASP-GUIDE.md](./docs/ASP-GUIDE.md) — ASP fundamentals
- ➡️ [docs/LLM-TO-ASP.md](./docs/LLM-TO-ASP.md) — NLP pipeline
