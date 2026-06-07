# ASP Guide

## What is Answer Set Programming?

ASP (Answer Set Programming) is a declarative problem-solving paradigm. You describe *what* the problem is, not *how* to solve it. The solver finds solutions.

### Example: Graph Coloring

```prolog
% colors available
color(red). color(green). color(blue).

% each node gets one color
1 { assign(N, C) : color(C) } 1 :- node(N).

% adjacent nodes can't share a color
:- node(A), node(B), edge(A, B),
   color(C), assign(A, C), assign(B, C).
```

This tiny program tells the ASP solver: "Find a coloring where no adjacent nodes share a color." The solver does the rest.

## Why ASP for LLM Outputs?

LLMs generate plausible but not necessarily *correct* outputs. ASP provides:

1. **Guaranteed correctness**: All constraints must be satisfied
2. **Explainability**: The solver can tell you *which* constraint was violated
3. **Optimality**: Finds the best solution, not just any solution
4. **Multiple solutions**: Can enumerate all valid answer sets

## Integration with TernaryL Gates

In savanty, ASP constraints are wrapped in TernaryL Gates:

- **+1**: Must satisfy (hard constraint — solution rejected if violated)
- **0**: Should satisfy (soft constraint — penalized but allowed)
- **−1**: Must avoid (anti-constraint — blocks specific patterns)
