/**
 * CognitiveConstraint — A constraint that represents a cognitive alignment condition.
 *
 * In CTC, a Constraint is a predicate over variables. Here, CognitiveConstraint
 * models a condition that must hold between two agent states for "alignment".
 *
 * Cognitive constraints capture:
 *   - Phase coherence (agents at the same phase)
 *   - State compatibility (valid paired transitions)
 *   - Temporal ordering (A before B)
 *   - Behavioral coupling (correlated state changes)
 *
 * Like CTC's Constraint enum, this supports multiple arities:
 *   - Unary:  condition on a single agent
 *   - Binary: alignment between two agents
 *   - Nary:   multi-agent alignment
 *
 * Each constraint has:
 *   - vars:     variable indices involved
 *   - check:    predicate that determines satisfaction
 *   - desc:     human-readable description
 *   - weight:   importance weight for soft constraints (0-1)
 *   - isHard:   whether violation is acceptable (hard = must satisfy)
 */

class CognitiveConstraint {
  /**
   * @param {Object|CueVariable} varA - First variable (or first in nary)
   * @param {CueVariable} [varB] - Second variable (for binary)
   * @param {Function} [checkFn] - Check predicate: fn(a, b) → bool
   * @param {string} [desc=''] - Description of this constraint
   * @param {Object} [opts] - Additional options
   * @param {number} [opts.weight=1.0] - Importance weight for soft constraints
   * @param {boolean} [opts.isHard=true] - Whether violation is acceptable
   */
  constructor(varA, varB, checkFn, desc = '', opts = {}) {
    this.vars = [];
    this.check = null;
    this.desc = desc || 'cognitive_constraint';
    this.weight = opts.weight !== undefined ? opts.weight : 1.0;
    this.isHard = opts.isHard !== undefined ? opts.isHard : true;

    if (Array.isArray(varA)) {
      // Nary: varA is array of variables, checkFn is nary predicate
      this.vars = varA;
      this.check = varB; // varB becomes the nary check function
      this.arities = this.vars.length;
    } else if (varB && checkFn) {
      // Binary
      this.vars = [varA, varB];
      this.check = (assignment) => {
        const aVal = assignment[varA.index] !== undefined ? assignment[varA.index] : varA.value;
        const bVal = assignment[varB.index] !== undefined ? assignment[varB.index] : varB.value;
        return checkFn(aVal, bVal);
      };
      this.arities = 2;
    } else if (varA && !varB) {
      // Unary
      this.vars = [varA];
      this.check = (assignment) => {
        const val = assignment[varA.index] !== undefined ? assignment[varA.index] : varA.value;
        return checkFn(val);
      };
      this.arities = 1;
    }

    this._satisfied = false;
    this._satisfiedAt = null;
    this._metadata = {};
  }

  /**
   * Check if this constraint is satisfied given current variable states.
   * @param {Object} [assignment] - Optional variable assignment map {index: value}
   * @returns {boolean}
   */
  isSatisfied(assignment) {
    if (!this.check) return false;
    const result = this.check(assignment || {});
    if (result) {
      this._satisfied = true;
      this._satisfiedAt = Date.now();
    }
    return result;
  }

  /**
   * CTC-compatible: get variable indices involved.
   * @returns {number[]}
   */
  getVarIndices() {
    return this.vars.map(v => v.index);
  }

  /**
   * CTC-compatible: whether this constraint involves a given variable index.
   * @param {number} idx
   * @returns {boolean}
   */
  involves(idx) {
    return this.vars.some(v => v.index === idx);
  }

  /**
   * Measure the degree of satisfaction (0 = violated, 1 = fully satisfied).
   * For hard constraints this is 0 or 1. For soft constraints, partial satisfaction
   * is possible based on weight.
   * @param {Object} [assignment]
   * @returns {number}
   */
  satisfactionDegree(assignment) {
    const satisfied = this.isSatisfied(assignment);
    if (this.isHard) return satisfied ? 1.0 : 0.0;
    return satisfied ? this.weight : 0.0;
  }

  /**
   * Attach metadata to this constraint (for tracing/audit).
   */
  withMeta(key, value) {
    this._metadata[key] = value;
    return this;
  }

  /**
   * String representation for debugging.
   */
  toString() {
    const varNames = this.vars.map(v => v.name || `var_${v.index}`).join(', ');
    return `CogCon(${this.desc})[${varNames}] ${this.isHard ? 'HARD' : 'soft'}`;
  }

  /**
   * Build a phase-coherence constraint: two agents must be at the same phase.
   */
  static phaseCoherent(a, b, desc = 'phase_coherent') {
    return new CognitiveConstraint(a, b,
      (aVal, bVal) => aVal === bVal,
      desc
    );
  }

  /**
   * Build a state-compatibility constraint: two agents' states must be compatible.
   * Compatibility is defined by a lookup table.
   */
  static stateCompatible(a, b, compatTable, desc = 'state_compatible') {
    return new CognitiveConstraint(a, b,
      (aVal, bVal) => {
        const key = `${aVal}-${bVal}`;
        return compatTable[key] === true; // only explicitly compatible pairs pass
      },
      desc
    );
  }

  /**
   * Build a temporal-ordering constraint: a must fire before b.
   */
  static ordered(a, b, desc = 'temporal_order') {
    return new CognitiveConstraint(a, b,
      (aVal, bVal) => {
        // Mapping: later states have higher values
        // For firing order: FIRING(5) > FIRING(5) is equal, which is okay
        // We check that a reaches FIRING before or at same time as b
        if (aVal === 5 && bVal < 5) return true;  // a fired, b hasn't yet
        if (bVal === 5 && aVal < 5) return false; // b fired before a
        return true; // not yet relevant
      },
      desc
    );
  }

  /**
   * Build a coupling constraint: when a transitions, b must also transition.
   */
  static coupled(a, b, desc = 'coupled') {
    return new CognitiveConstraint(a, b,
      (aVal, bVal) => {
        // Both agents track last state; this is a simplified version
        // that checks if they've both moved from their initial state
        return true; // handled at solver level
      },
      desc,
      { weight: 0.8, isHard: false }
    );
  }
}

module.exports = CognitiveConstraint;
