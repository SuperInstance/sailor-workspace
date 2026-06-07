# 🧩 savanty

**A hermit crab doesn't grow a new shell. It finds one that fits, moves in, and makes it home.**

---

> 🚀 **The Hook:**  
> *LLM outputs → ASP (Answer Set Programming) optimization, wrapped in ternary logic, symmetry validation, and SAEP veto — because generative answers need structural guarantees.*

---

## 🛠️ Quickstart

```bash
# 1. Install
pip install savanty
# Or: cargo install savanty

# 2. Run the solver on a natural language problem
savanty solve "Schedule 3 meetings in 2 rooms with 5 people, avoiding conflicts"

# 3. Validate with Symmetry-Skeptic
savanty validate --solution output.json --symmetry-check

# 4. Apply SAEP veto layer
savanty gate --solution output.json --veto-level portfolio

# 5. Visualize the constraint topology
savanty visualize --solution output.json --tda
```

### In Python

```python
from savanty import Solver, VetoEngine, SymmetrySkeptic

# Natural language → ASP constraints
problem = "Find the optimal delivery route for 10 packages with 3 drivers"
solver = Solver(backend="clingo")

# Solve
solution = solver.solve(problem)

# Validate topological symmetry
checker = SymmetrySkeptic()
if checker.verify(solution):
    # Apply SAEP veto
    veto = VetoEngine(level="portfolio")
    final = veto.check(solution)
    print(f"Optimal plan: {final}")
else:
    print("Symmetry violation detected — solution rejected")
```

### In Rust

```rust
use savanty::{Solver, VetoEngine, SymmetrySkeptic};

fn main() {
    let mut solver = Solver::new("clingo");
    let solution = solver.solve(
        "Schedule 3 meetings in 2 rooms with 5 people",
    ).unwrap();

    let checker = SymmetrySkeptic::new(0.3);
    if checker.verify(&solution) {
        let veto = VetoEngine::new(Portfolio);
        let final_plan = veto.check(solution);
        println!("✅ Plan approved: {:?}", final_plan);
    }
}
```

---

## 📐 The la-link (Architecture)

```
                    ┌─────────────────────────────────────────────┐
                    │              savanty                        │
                    │                                              │
  ┌─────────┐       │  ┌─────────────┐   ┌──────────────────┐    │
  │ Natural  │       │  │  LLM Parser  │   │   ASP Solver     │    │
  │ Language │──────▶│  │  (NLP→Trits) │──▶│ (clingo/clasp)   │    │
  │ Problem  │       │  └─────────────┘   └────────┬─────────┘    │
  └─────────┘       │                              │              │
                    │                              ▼              │
                    │  ┌──────────────────────────────────────┐   │
                    │  │      Symmetry-Skeptic Validation     │   │
                    │  │  ┌──────────┐  ┌──────────────────┐  │   │
                    │  │  │  Ternary │  │  Topological     │  │   │
                    │  │  │  Gate    │  │  Wasserstein     │  │   │
                    │  │  │  Check   │  │  Distance Check  │  │   │
                    │  │  └──────────┘  └──────────────────┘  │   │
                    │  └──────────────────────────────────────┘   │
                    │                      │                      │
                    │                      ▼                      │
                    │  ┌──────────────────────────────────────┐   │
                    │  │         SAEP Veto Engine              │   │
                    │  │  Room → Sector → Portfolio → Market   │   │
                    │  └──────────────────────────────────────┘   │
                    │                      │                      │
                    │                      ▼                      │
                    │  ┌──────────────────────────────────────┐   │
                    │  │      Output (Validated Solution)      │   │
                    │  └──────────────────────────────────────┘   │
                    └─────────────────────────────────────────────┘
```

**Three-tier compute pipeline:**

```
Fast  (ms):   LLM parsing + ternary gate encoding
Medium (s):   ASP solving (clingo/clasp)
Slow   (s):   Symmetry validation + veto check
```

---

## 📚 The Knowledge Path

### 🧭 Path A: "What is ASP and why use it for LLM outputs?"

➡️ **[`docs/ASP-GUIDE.md`](./docs/ASP-GUIDE.md)**

ASP (Answer Set Programming) is a declarative constraint-solving paradigm. It takes a set of logical rules and finds "answer sets" that satisfy all constraints. Unlike SAT solvers that find *any* satisfying assignment, ASP finds *minimal* ones — which maps perfectly to optimization problems.

### 🧭 Path B: "How does savanty convert natural language to ASP?"

➡️ **[`docs/LLM-TO-ASP.md`](./docs/LLM-TO-ASP.md)**

1. LLM extracts entities, constraints, and objectives from natural language
2. Entities → ASP atoms (variables)
3. Constraints → ASP rules (integrity constraints)
4. Objectives → ASP optimization statements
5. Output is wrapped in **TernaryL Gates** ({−1, 0, +1}) for validation

### 🧭 Path C: "What is Symmetry-Skeptic Validation?"

➡️ **[`docs/SYMMETRY-SKEPTIC.md`](./docs/SYMMETRY-SKEPTIC.md)**

Before presenting a solution to the user, savanty runs it through a symmetry checker. If the solution breaks a topological symmetry (e.g., swapping two identical resources should yield the same optimality), it's marked as a "Symmetry-Violation" and re-solved.

### 🧭 Path D: "How does the Veto Layer work?"

➡️ **[`docs/VETO-ENGINE.md`](./docs/VETO-ENGINE.md)**

The 4-tier SAEP veto hierarchy wraps ASP output:
- Room: Reject a single constraint violation
- Sector: Reject conflicts in a constraint group
- Portfolio: Reject the entire solution if unsafe
- Market: Fleet-wide override (external signal)

### 🧭 Path E: "TDA-Savanty — clustering optimization problems"

➡️ **[`docs/TDA-CLUSTERING.md`](./docs/TDA-CLUSTERING.md)**

Use persistent homology to cluster similar optimization problems. Savanty learns "prototypical constraints" — patterns that reappear across different problem instances — and suggests them to the LLM before solving.

---

## 🔌 Ecosystem Connection

```
SuperInstance Fleet
├── savanty                        ← YOU ARE HERE (LLM→ASP)
├── pincher                        → Reflex runtime for constraint memory
├── market-manifold                → TDA analysis (shared homologies)
├── plato-engine-block-c           → Embedded sensor → alarm (ternary)
├── construct-coordination         → Fleet intent tracking
└── ternary-types                  → Z₃ math primitives
```

**Key integration points:**
- **Pincher**: Store validated ASP solutions as reflex patterns (`.nail` bundles)
- **Market Manifold**: Share topological homology representations across domains
- **Plato Engine**: Feed ASP-validated decisions as ternary state into embedded systems

---

## 🧪 Tests

```bash
# Python
pytest tests/

# Rust
cargo test

# End-to-end
savanty test --suite basic
savanty test --suite symmetry-violations
savanty test --suite veto-hierarchy
```

---

## 📄 License

MIT OR Apache-2.0

---

*The cortex plans. The spinal cord validates. The gate decides.*
