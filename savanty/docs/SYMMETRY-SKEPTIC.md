# Symmetry-Skeptic Validation

## The Problem

ASP solvers can produce solutions that are mathematically correct but structurally biased. Consider two workers with identical skills — a good solver might always assign Work-X to Task-A and Worker-Y to Task-B, even though swapping them would be equally valid.

This is a **symmetry violation**: the solver has an implicit preference that breaks the problem's natural symmetry.

## The Solution: Symmetry-Skeptic

Savanty's Symmetry-Skeptic checks solutions for topological symmetry violations:

```python
from savanty import SymmetrySkeptic

# tolerance: how much asymmetry is acceptable (0.0 = strict, 1.0 = relaxed)
checker = SymmetrySkeptic(tolerance=0.3)

if not checker.verify(solution):
    print("Symmetry violation detected")
    # The solver will rebalance
    new_solution = solver.rebalance(solution, symmetry=True)
```

### How It Works

1. **Resource equivalence detection**: Identify which resources are interchangeable
2. **Permutation test**: Check if swapping equivalent resources changes the solution
3. **Wasserstein distance**: Compute the topological distance between the original and permuted solution
4. **Threshold check**: If the distance exceeds tolerance, flag as violation

### Integration with TDA

The Symmetry-Skeptic uses persistent homology (Betti numbers) to compute the topological signature of a solution:
- Solutions with similar β₀, β₁, β₂ are structurally equivalent
- Swapping symmetric resources should preserve the topological signature
