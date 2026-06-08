/**
 * AlignmentSolver — Solves constraint networks where variables are agent states
 * and constraints are phase alignment requirements.
 *
 * Inspired by CTC's CSP solver architecture:
 *   - AC-3 arc consistency (from ac3.rs)
 *   - Backtracking with MRV heuristic (from backtracking.rs)
 *   - Conflict recording (from cdcl.rs)
 *
 * The AlignmentSolver takes:
 *   - Variables: CueVariable instances representing agent lifecycle positions
 *   - Constraints: CognitiveConstraint, ResonanceConstraint, PhaseConstraint
 *
 * And finds an assignment (state for each agent) that satisfies all constraints.
 */

const CueVariable = require('./cue-variable');

class AlignmentSolver {
  /**
   * @param {CueVariable[]} variables - Agent state variables
   * @param {Array} constraints - Cognitive/Phase/Resonance constraints
   */
  constructor(variables, constraints) {
    this.variables = variables;
    this.constraints = constraints;
    this.varMap = new Map(variables.map(v => [v.index, v]));

    // Solver state
    this._domains = [];
    this._assignment = new Map();
    this._maxDepth = 100;

    // Statistics
    this.stats = {
      nodesVisited: 0,
      backtracks: 0,
      propagations: 0,
      conflicts: 0,
      startTime: null,
      endTime: null,
    };

    this._solved = false;
    this._solution = null;
    this._searchCount = 0;
  }

  /**
   * Enforce arc consistency (AC-3). Returns true if consistent.
   */
  propagate() {
    const queue = [];

    for (const c of this.constraints) {
      for (const idx of c.getVarIndices()) {
        queue.push({ constraint: c, varIdx: idx });
      }
    }

    while (queue.length > 0) {
      const { constraint, varIdx } = queue.shift();
      const neighbors = constraint.getVarIndices().filter(i => i !== varIdx);
      const domain = this._domains[varIdx];
      const toRemove = [];

      for (const val of domain) {
        let hasSupport = false;

        if (neighbors.length === 0) {
          try { hasSupport = constraint.isSatisfied({ [varIdx]: val }); }
          catch { hasSupport = true; }
        } else if (neighbors.length === 1) {
          const nIdx = neighbors[0];
          for (const nVal of this._domains[nIdx]) {
            try {
              if (constraint.isSatisfied({ [varIdx]: val, [nIdx]: nVal })) {
                hasSupport = true;
                break;
              }
            } catch { hasSupport = true; break; }
          }
        } else {
          hasSupport = neighbors.some(ni => this._domains[ni].length > 0);
        }

        if (!hasSupport) toRemove.push(val);
      }

      if (toRemove.length > 0) {
        this._domains[varIdx] = domain.filter(v => !toRemove.includes(v));
        this.stats.propagations++;
        if (this._domains[varIdx].length === 0) return false;

        for (const c of this.constraints) {
          if (c.involves(varIdx)) {
            for (const oi of c.getVarIndices()) {
              if (oi !== varIdx) queue.push({ constraint: c, varIdx: oi });
            }
          }
        }
      }
    }
    return true;
  }

  /**
   * MRV: pick unassigned variable with smallest remaining domain.
   */
  _mrv(assigned) {
    let bestIdx = null;
    let bestSize = Infinity;
    for (let i = 0; i < this._domains.length; i++) {
      if (assigned.has(i)) continue;
      if (this._domains[i].length === 0) return null;
      if (this._domains[i].length < bestSize) {
        bestSize = this._domains[i].length;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /**
   * LCV: order values by least-constraining (fewest neighbor eliminations).
   */
  _lcv(varIdx, assigned) {
    const values = this._domains[varIdx];
    if (values.length <= 1) return values;

    const scored = values.map(val => {
      let conflicts = 0;
      for (const c of this.constraints) {
        if (!c.involves(varIdx)) continue;
        for (const nIdx of c.getVarIndices()) {
          if (nIdx === varIdx || assigned.has(nIdx)) continue;
          for (const nVal of this._domains[nIdx]) {
            try {
              if (!c.isSatisfied({ [varIdx]: val, [nIdx]: nVal })) conflicts++;
            } catch { /* skip */ }
          }
        }
      }
      return { val, conflicts };
    });
    scored.sort((a, b) => a.conflicts - b.conflicts);
    return scored.map(s => s.val);
  }

  /**
   * Check a single value assignment against all binary constraints.
   */
  _check(varIdx, val, assigned) {
    for (const c of this.constraints) {
      const indices = c.getVarIndices();
      if (indices.length === 1 && indices[0] === varIdx) {
        try { if (!c.isSatisfied({ [varIdx]: val })) return false; }
        catch { /* skip */ }
      }
      // Binary check: if neighbor is assigned too, check the pair
      if (indices.length === 2) {
        const other = indices[0] === varIdx ? indices[1] : indices[0];
        if (assigned.has(other)) {
          const oVal = this._assignment.get(other);
          if (oVal !== null) {
            try {
              if (!c.isSatisfied({ [varIdx]: val, [other]: oVal })) return false;
            } catch { /* skip */ }
          }
        }
      }
    }
    return true;
  }

  /**
   * Forward check: prune neighbor domains after assigning varIdx=val.
   * Returns false if any neighbor domain empties.
   */
  _forwardCheck(varIdx, val) {
    for (const c of this.constraints) {
      if (!c.involves(varIdx)) continue;
      for (const nIdx of c.getVarIndices()) {
        if (nIdx === varIdx) continue;
        if (this._assignment.get(nIdx) !== null) continue;

        const originalLen = this._domains[nIdx].length;
        this._domains[nIdx] = this._domains[nIdx].filter(nVal => {
          try { return c.isSatisfied({ [varIdx]: val, [nIdx]: nVal }); }
          catch { return true; }
        });
        if (this._domains[nIdx].length === 0) return false;
      }
    }
    return true;
  }

  /**
   * Recursive backtracking: MRV + forward checking.
   * Uses explicit stack to avoid infinite recursion issues.
   */
  search() {
    const assigned = new Set();
    const stack = [{ type: 'branch', state: null }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      if (frame.type === 'branch') {
        // Find next unassigned variable
        const varIdx = this._mrv(assigned);
        if (varIdx === null) {
          // All assigned — check full assignment
          let allOk = true;
          for (const c of this.constraints) {
            try {
              const indices = c.getVarIndices();
              const ta = {};
              for (const idx of indices) {
                const val = this._assignment.get(idx);
                if (val === null) { allOk = false; break; }
                ta[idx] = val;
              }
              if (!allOk) break;
              if (!c.isSatisfied(ta)) { allOk = false; break; }
            } catch { /* skip */ }
          }
          if (allOk) {
            // Build and return solution
            return new Map(this.variables.map(v => [v.index, this._assignment.get(v.index)]));
          }
          stack.pop();
          continue;
        }

        const values = this._lcv(varIdx, assigned);
        frame.varIdx = varIdx;
        frame.values = values;
        frame.valIndex = 0;
        frame.savedDomains = this._domains.map(d => [...d]);

        // Skip if no values to try
        if (values.length === 0) {
          this.stats.backtracks++;
          stack.pop();
          continue;
        }

        const val = values[0];
        frame.valIndex = 1;

        // Check consistency with assigned neighbors
        if (!this._check(varIdx, val, assigned)) {
          this.stats.backtracks++;
          continue;
        }

        // Forward check
        const fcOk = this._forwardCheck(varIdx, val);
        this.stats.nodesVisited++;

        if (fcOk) {
          this._assignment.set(varIdx, val);
          assigned.add(varIdx);
          // Move to next branch
          stack.push({ type: 'branch', state: null });
        } else {
          // Restore domains
          this._domains = frame.savedDomains.map(d => [...d]);
          this.stats.backtracks++;
        }

      } else if (frame.type === 'backtrack') {
        // Pop and continue
        stack.pop();
      }
    }

    return null;
  }

  /**
   * Full solve pipeline: propagate AC-3, then backtracking search.
   */
  solve() {
    this.stats.startTime = Date.now();

    this._domains = this.variables.map(v => [...v.domain]);
    this._assignment = new Map(this.variables.map(v => [v.index, null]));
    this._solved = false;
    this._solution = null;

    // Phase 1: AC-3 propagation
    if (!this.propagate()) {
      this.stats.endTime = Date.now();
      this.stats.conflicts++;
      return {
        solution: null,
        stats: { ...this.stats, elapsed: this.stats.endTime - this.stats.startTime },
        constraints: this._evalConstraints(null),
        conflicts: ['propagation_failed'],
        unsatisfiable: true,
      };
    }

    // Phase 2: Backtracking search
    const solution = this.search();
    this.stats.endTime = Date.now();

    return {
      solution,
      stats: { ...this.stats, elapsed: this.stats.endTime - this.stats.startTime },
      constraints: this._evalConstraints(solution),
      conflicts: solution === null ? ['unsatisfiable'] : [],
      unsatisfiable: solution === null,
    };
  }

  _evalConstraints(solution) {
    const assignment = {};
    if (solution) {
      for (const [idx, val] of solution) {
        assignment[idx] = val;
      }
    }
    return this.constraints.map(c => {
      let satisfied = false;
      try {
        satisfied = c.isSatisfied(Object.keys(assignment).length > 0 ? assignment : undefined);
      } catch { /* need live vars */ }
      return {
        desc: c.desc,
        toString: c.toString(),
        satisfied,
        varIndices: c.getVarIndices(),
        varsInvolved: c.vars ? c.vars.map(v => v.name) : [],
        isHard: c.isHard,
        weight: c.weight,
      };
    });
  }

  printSummary(result) {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Cognitive Constraint Network — Solve Result   ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Variables:     ${this.variables.length}`);
    console.log(`  Constraints:   ${this.constraints.length}`);
    console.log(`  Satisfiable:   ${result.unsatisfiable ? '❌ NO' : '✅ YES'}`);
    console.log(`  Nodes visited: ${result.stats.nodesVisited}`);
    console.log(`  Backtracks:    ${result.stats.backtracks}`);
    console.log(`  Propagations:  ${result.stats.propagations}`);
    console.log(`  Time:          ${result.stats.elapsed}ms`);
    console.log('');

    if (result.solution) {
      console.log('  Solution:');
      for (const [idx, val] of result.solution) {
        const v = this.varMap.get(idx);
        if (v && val !== null) {
          console.log(`    ${v.agentId.padEnd(16)} → ${CueVariable.STATE_NAMES[val]} (state=${val})`);
        }
      }
    }

    console.log('');
    console.log('  Constraint Results:');
    for (const cr of result.constraints) {
      const icon = cr.satisfied ? '✅' : '❌';
      console.log(`    ${icon} ${cr.toString}`);
    }
  }

  solveIncremental(_currentStates) {
    return this.solve().solution;
  }
}

module.exports = AlignmentSolver;
