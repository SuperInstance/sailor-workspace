#!/usr/bin/env python3
"""
Savanty Custom Solver — Boilerplate

Usage: python solve.py --input problem.json [--backend clingo|clasp]
"""

import argparse
import json
from savanty import Solver, VetoEngine, SymmetrySkeptic

def main():
    parser = argparse.ArgumentParser(description="Savanty custom solver")
    parser.add_argument("--input", required=True, help="Problem JSON file")
    parser.add_argument("--backend", default="clingo", choices=["clingo", "clasp"])
    parser.add_argument("--output", default="solution.json")
    args = parser.parse_args()

    with open(args.input) as f:
        problem = json.load(f)

    solver = Solver(backend=args.backend)
    solution = solver.solve(problem)

    checker = SymmetrySkeptic(tolerance=0.3)
    if not checker.verify(solution):
        print("⚠️ Symmetry violation — rebalancing")
        solution = solver.rebalance(solution, symmetry=True)

    veto = VetoEngine(level="portfolio")
    result = veto.check(solution)

    if result.blocked:
        print(f"🚫 Vetoed: {result.reason}")
        return

    with open(args.output, "w") as f:
        json.dump(result.solution, f, indent=2)

    print(f"✅ Solution written to {args.output}")

if __name__ == "__main__":
    main()
