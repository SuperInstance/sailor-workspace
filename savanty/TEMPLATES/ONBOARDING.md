# 🧩 savanty — Engineer Onboarding

**From 0 to LLM-validated ASP in 5 days.**

---

## 🎒 Day 1: The Lay of the Land

### Morning (30 min)
- [ ] Read [README.md](../README.md) — understand the hook
- [ ] Read the [TUTORIALS.md](../TUTORIALS.md) — run Tutorial 1
- [ ] Install: `pip install savanty` or `cargo install savanty`

### Afternoon (2 hours)
- [ ] Run the basic scheduling example:
  ```bash
  savanty solve "Schedule 2 meetings in 1 room"
  ```
- [ ] Inspect the ASP output:
  ```bash
  savanty solve --verbose "2 meetings, 1 room"
  ```
- [ ] Try different problem types (assignment, routing, packing)

### Evening (optional)
- [ ] Read `docs/ASP-GUIDE.md`
- [ ] Experiment with `--backend clasp` vs `--backend clingo`

**🎯 Checkpoint:** You can go from natural language to solved ASP in one command.

---

## ⚡ Day 2: Constraint Crafting

### Morning (1 hour)
- [ ] Write your own constraints in JSON format
- [ ] Run Tutorial 2 — symmetry violations
- [ ] Understand how TernaryL gates work:
  ```python
  from savanty.ternary import Trit, Gate
  # +1 = must satisfy, 0 = optional, -1 = must avoid
  ```

### Afternoon (2 hours)
- [ ] Create a complex multi-constraint problem
- [ ] Run it with different solver backends
- [ ] Compare solution quality and solve time

### Evening (optional)
- [ ] Read `docs/LLM-TO-ASP.md`
- [ ] Try the `--explain` flag to see how LLM parsed your input

**🎯 Checkpoint:** You can craft custom constraints and understand how the LLM→ASP pipeline works.

---

## 🔀 Day 3: Symmetry + Veto

### Morning (1.5 hours)
- [ ] Run Tutorial 3 — SAEP veto
- [ ] Implement a custom veto rule
- [ ] Test with a known bad solution

### Afternoon (2 hours)
- [ ] Run Tutorial 4 — TDA clustering
- [ ] Load 10+ problems, cluster them, inspect prototypes
- [ ] Create a Symmetry-Skeptic with custom tolerance

### Evening (optional)
- [ ] Read `docs/SYMMETRY-SKEPTIC.md`
- [ ] Read `docs/VETO-ENGINE.md`

**🎯 Checkpoint:** Your solutions are validated by symmetry checks and protected by SAEP vetoes.

---

## 🔗 Day 4: Integration + Fleet

### Morning (1 hour)
- [ ] Connect savanty to pincher reflex storage:
  ```python
  from savanty.integrations import PincherBridge
  bridge = PincherBridge()
  bridge.store_solution("deploy-plan", solution)
  ```
- [ ] Verify reflexes are stored: `pincher reflexes | grep deploy-plan`

### Afternoon (2 hours)
- [ ] Set up the CI/CD pipeline from Tutorial 5
- [ ] Write a `.savanty.yml` config:
  ```yaml
  backend: clingo
  default_veto: portfolio
  symmetry_tolerance: 0.3
  reflexes:
    enable: true
    bridge: pincher
  ```

### Evening (optional)
- [ ] Share topological clusters with market-manifold
- [ ] Read `docs/TDA-CLUSTERING.md`

**🎯 Checkpoint:** Savanty is integrated with the fleet. Solutions persist as pincher reflexes.

---

## 🚢 Day 5: Custom Application

### All Day
- [ ] Design your own savanty application:
  - Deployment validation
  - Resource allocation
  - Route optimization
  - Constraint-based testing
- [ ] Create custom templates in `TEMPLATES/`
- [ ] Write your application in `examples/my-app/`

### Stretch Goals
- [ ] Implement a custom solver backend
- [ ] Add a new symmetry-violation pattern
- [ ] Create a TDA clustering visualization
- [ ] Contribute a template back to the repo

**🎯 Checkpoint:** You have a production-ready savanty-based optimization pipeline.

---

## 📚 Quick Reference

| Resource | What It Is | Read When |
|----------|-----------|-----------|
| `README.md` | Hook, install, architecture | Day 1 |
| `TUTORIALS.md` | Path from 0 to first solution | Day 1–2 |
| `docs/ASP-GUIDE.md` | ASP fundamentals | Day 1 evening |
| `docs/LLM-TO-ASP.md` | NLP→constraint pipeline | Day 2 evening |
| `docs/SYMMETRY-SKEPTIC.md` | Topological validation | Day 3 |
| `docs/VETO-ENGINE.md` | SAEP veto hierarchy | Day 3 |
| `docs/TDA-CLUSTERING.md` | Problem clustering | Day 4 |
| `TEMPLATES/python-solver/` | Python solver boilerplate | Day 5 |
| `TEMPLATES/rust-solver/` | Rust solver boilerplate | Day 5 |
| `TEMPLATES/ci-pipeline/` | CI/CD integration | Day 4 |
| `examples/` | Real-world example projects | Day 5 |

---

## ❓ Getting Help

- **Bug or feature?** Open a GitHub issue
- **Fleet coordination?** Post to `construct-coordination` repo
- **Pincher integration?** See `savanty/src/integrations/pincher.rs`

---

*The cortex plans. The spinal cord validates. The gate decides.*
