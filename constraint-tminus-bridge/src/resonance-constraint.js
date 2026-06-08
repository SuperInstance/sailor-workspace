/**
 * ResonanceConstraint — Checks if two cognitive frequencies are in resonance.
 *
 * Inspired by CTC's hidden_dimensions formula and curvature modules.
 * In physics, resonance occurs when ν₁ ≈ ν₂ (frequencies closely match).
 * In cognitive systems, resonance means two agents' cognitive beat frequencies
 * are close enough to synchronize.
 *
 * The resonance condition:
 *   |ν₁ - ν₂| / max(ν₁, ν₂) < ε
 *
 * Where ε is the tolerance (default: 0.1, i.e., 10% frequency mismatch allowed).
 *
 * This mirrors CTC's precision tolerance: hidden_dimensions(ε) gives the number
 * of bits needed to represent the constraint exactly.
 */

class ResonanceConstraint {
  /**
   * @param {CueVariable} varA - First agent variable
   * @param {CueVariable} varB - Second agent variable
   * @param {number} [targetFrequency=2.0] - Target resonance frequency in Hz
   * @param {string} [desc='resonance']
   * @param {Object} [opts]
   * @param {number} [opts.tolerance=0.1] - Frequency match tolerance (ε)
   * @param {number} [opts.phaseTolerance=0.5] - Phase alignment tolerance (radians)
   * @param {boolean} [opts.isHard=true] - Whether resonance is required
   * @param {number} [opts.weight=1.0] - Soft constraint weight
   */
  constructor(varA, varB, targetFrequency = 2.0, desc = 'resonance', opts = {}) {
    this.varA = varA;
    this.varB = varB;
    this.vars = [varA, varB];
    this.targetFrequency = targetFrequency;
    this.desc = desc || 'resonance_constraint';
    this.tolerance = opts.tolerance !== undefined ? opts.tolerance : 0.1;
    this.phaseTolerance = opts.phaseTolerance !== undefined ? opts.phaseTolerance : 0.5;
    this.isHard = opts.isHard !== undefined ? opts.isHard : true;
    this.weight = opts.weight !== undefined ? opts.weight : 1.0;

    // Resonance state
    this._resonanceGap = Infinity;
    this._phaseLock = false;
    this._lastCheck = null;

    // Hidden dimension equivalent: ε determines precision bits
    // (mirroring CTC's hidden_dimensions count)
    this._precisionBits = this._computePrecisionBits();
  }

  /**
   * Check if two variables are in frequency resonance.
   * Resonance condition: |ν₁ - ν₂| / max(ν₁, ν₂) < ε
   *
   * @param {Object} [assignment] - Optional assignment map
   * @returns {boolean}
   */
  isSatisfied(assignment) {
    const freqA = assignment && assignment[this.varA.index] !== undefined
      ? assignment[this.varA.index] : this.varA.frequency;
    const freqB = assignment && assignment[this.varB.index] !== undefined
      ? assignment[this.varB.index] : this.varB.frequency;

    // Also check frequency proximity to target
    const targetOk = this.targetFrequency > 0
      ? Math.abs(freqA - this.targetFrequency) / Math.max(freqA, this.targetFrequency, 0.001) < this.tolerance
        && Math.abs(freqB - this.targetFrequency) / Math.max(freqB, this.targetFrequency, 0.001) < this.tolerance
      : true;

    // Frequency match between agents
    const maxFreq = Math.max(freqA, freqB, 0.001);
    this._resonanceGap = Math.abs(freqA - freqB) / maxFreq;
    const freqMatch = this._resonanceGap < this.tolerance;

    // Phase lock check: φ₁ ≈ φ₂ (mod 2π)
    const phaseDiff = Math.abs(this.varA.phaseValue - this.varB.phaseValue);
    const wrappedDiff = Math.min(phaseDiff, 2 * Math.PI - phaseDiff);
    this._phaseLock = wrappedDiff < this.phaseTolerance;

    this._lastCheck = {
      freqA, freqB, targetOk, freqMatch,
      resonanceGap: this._resonanceGap,
      phaseDiff: wrappedDiff,
      phaseLock: this._phaseLock,
    };

    return targetOk && freqMatch && this._phaseLock;
  }

  /**
   * Satisfaction degree (0-1), allowing partial soft satisfaction.
   */
  satisfactionDegree(assignment) {
    if (this.isHard) return this.isSatisfied(assignment) ? 1.0 : 0.0;
    if (!this._lastCheck) this.isSatisfied(assignment);
    // Continuous measure: 1 / (1 + resonanceGap/tolerance)
    const gap = this._resonanceGap || 1.0;
    const score = Math.max(0, 1 - (gap / this.tolerance));
    return Math.min(1.0, score * this.weight);
  }

  /**
   * Get resonance quality metrics.
   */
  getMetrics() {
    return {
      resonanceGap: this._resonanceGap,
      phaseLock: this._phaseLock,
      tolerance: this.tolerance,
      targetFrequency: this.targetFrequency,
      precisionBits: this._precisionBits,
      lastCheck: this._lastCheck,
    };
  }

  /** Compute hidden-dimension-equivalent precision bits from tolerance. */
  _computePrecisionBits() {
    // Mirroring CTC: k = ⌈log₂(1/ε)⌉
    if (this.tolerance <= 0) return Infinity;
    return Math.ceil(Math.log2(1 / this.tolerance));
  }

  involves(idx) {
    return this.varA.index === idx || this.varB.index === idx;
  }

  getVarIndices() {
    return [this.varA.index, this.varB.index];
  }

  toString() {
    return `Resonance(${this.varA.name}, ${this.varB.name})[ν*=${this.targetFrequency}Hz ε=${this.tolerance} k=${this._precisionBits}bits]`;
  }
}

module.exports = ResonanceConstraint;
