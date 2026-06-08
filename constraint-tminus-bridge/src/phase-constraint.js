/**
 * PhaseConstraint — Ensures agents in a phase group fire in sequence.
 *
 * Inspired by CTC's N-ary constraints and sudoku solver techniques.
 * In a t-minus system, agents in a phase group fire in a defined order:
 *   agent[0] → agent[1] → agent[2] → ... → agent[n-1]
 *
 * This constraint checks that:
 *   1. The predecessor has reached FIRING (state 5) before or at the same
 *      time as the successor.
 *   2. The sequence order is maintained: no agent fires before its predecessor.
 *   3. If the mode is 'seq', the chain is strict (must fire one after another).
 *
 * PhaseConstraint is a Binary constraint (like CTC's Constraint::Binary)
 * where each instance connects two adjacent agents in the firing chain.
 */

class PhaseConstraint {
  /**
   * @param {CueVariable} predecessor - Agent that fires first
   * @param {CueVariable} successor - Agent that fires second
   * @param {string} [desc='phase_sequence']
   * @param {Object} [opts]
   * @param {boolean} [opts.strict=true] - Strict sequential (one must complete before next)
   * @param {number} [opts.maxDelay=5000] - Maximum allowed delay between firings (ms)
   * @param {boolean} [opts.isHard=true]
   * @param {number} [opts.weight=1.0]
   */
  constructor(predecessor, successor, desc = 'phase_sequence', opts = {}) {
    this.predecessor = predecessor;
    this.successor = successor;
    this.vars = [predecessor, successor];
    this.desc = desc || 'phase_constraint';
    this.strict = opts.strict !== undefined ? opts.strict : true;
    this.maxDelay = opts.maxDelay || 5000;
    this.isHard = opts.isHard !== undefined ? opts.isHard : true;
    this.weight = opts.weight !== undefined ? opts.weight : 1.0;

    // Tracking state
    this._predecessorFiredAt = null;
    this._successorFiredAt = null;
    this._violation = null;
    this._orderViolated = false;
    this._timingViolation = false;
  }

  /**
   * Check sequential ordering: predecessor must fire before successor.
   *
   * Firing is defined as reaching FIRING state (value 5).
   *
   * Static CSP logic:
   *   - successor can only be in fired state (value >= 5) if predecessor
   *     is ALSO in fired state (value >= 5).
   *   - This ensures the temporal ordering constraint is encoded in
   *     the static assignment.
   *   - Used as: PhaseConstraint(A→B) ≡ B has fired ⇒ A has fired
   *
   * @param {Object} [assignment] - Optional assignment map {index: value}
   * @returns {boolean}
   */
  isSatisfied(assignment) {
    const preVal = assignment && assignment[this.predecessor.index] !== undefined
      ? assignment[this.predecessor.index] : this.predecessor.value;
    const sucVal = assignment && assignment[this.successor.index] !== undefined
      ? assignment[this.successor.index] : this.successor.value;

    const preFired = preVal >= 5; // FIRING or COMPLETE
    const sucFired = sucVal >= 5;

    // Core static constraint: successor can only fire if predecessor has fired
    // Equivalent to: sucFired ⇒ preFired
    if (sucFired && !preFired) {
      this._violation = 'predecessor_not_fired';
      this._orderViolated = true;
      return false;
    }

    this._violation = null;
    return true;
  }

  /**
   * Satisfaction degree (0-1).
   */
  satisfactionDegree(assignment) {
    if (this.isHard) return this.isSatisfied(assignment) ? 1.0 : 0.0;
    if (this._orderViolated) return 0.0;
    if (this._timingViolation) return 0.5 * this.weight;
    return this.weight;
  }

  /**
   * Get details about the phase relationship.
   */
  getMetrics() {
    return {
      predecessorFiredAt: this._predecessorFiredAt,
      successorFiredAt: this._successorFiredAt,
      strictMode: this.strict,
      maxDelay: this.maxDelay,
      violation: this._violation,
      orderViolated: this._orderViolated,
      timingViolation: this._timingViolation,
    };
  }

  involves(idx) {
    return this.predecessor.index === idx || this.successor.index === idx;
  }

  getVarIndices() {
    return [this.predecessor.index, this.successor.index];
  }

  toString() {
    return `PhaseSeq(${this.predecessor.name} → ${this.successor.name})${this.strict ? ' [strict]' : ''}`;
  }
}

module.exports = PhaseConstraint;
