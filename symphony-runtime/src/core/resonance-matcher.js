'use strict';

const { BeatNormalizer } = require('./beat-normalizer');

/**
 * Resonance Matcher
 * Matches cognitive frequencies between shells (ν matching, ν* calculation).
 *
 * ν*(𝓢) = argmax[ resonance( L0_experience, L7_intent ) ]
 * R(𝓢) = 1 - ∥ ν(𝓢) - ν*(𝓢) ∥ / ν_max
 */

class ResonanceMatcher {
  /**
   * @param {object} [options]
   * @param {number} [options.nuMax=100] - Maximum ν for normalization denominator
   */
  constructor(options = {}) {
    this.nuMax = options.nuMax || 100;
    this._history = [];  // Track resonance readings over time
  }

  /**
   * Calculate the Resonant Frequency ν* given L0 experience a-box and L7 intent a-box.
   * ν* is the frequency at which the distance between L0 and L7 is minimized.
   *
   * @param {object} l0Box - L0 raw experience a-box
   * @param {object} l7Box - L7 high-level intent a-box
   * @param {number} contextUtilization - current load factor
   * @returns {number} ν* in Hz
   */
  calculateTargetFrequency(l0Box, l7Box, contextUtilization = 0.5) {
    // Compute the semantic distance as a proxy for resonance alignment
    const semanticDelta = this._computeSemanticDistance(l0Box, l7Box);

    // The target frequency is inversely related to the gap: bigger gap = slower frequency needed
    const baseFrequency = 1000 / (contextUtilization * 100 + 50);
    const alignmentFactor = 1 - Math.min(semanticDelta, 0.9);

    return baseFrequency * (0.5 + alignmentFactor * 2);
  }

  /**
   * Compute resonance metric R ∈ [0,1].
   * R(𝓢) = 1 - ∥ ν(𝓢) - ν*(𝓢) ∥ / ν_max
   *
   * @param {number} nuCurrent - current cognitive frequency of the shell
   * @param {number} nuTarget - target resonant frequency ν*
   * @returns {number} R in [0, 1]
   */
  calculateResonance(nuCurrent, nuTarget) {
    const delta = Math.abs(nuCurrent - nuTarget);
    const raw = 1 - delta / this.nuMax;
    return Math.max(0, Math.min(1, raw));
  }

  /**
   * Determine if two shells are in coupled resonance.
   * R > 0.8 is "locked".
   * @param {number} nu1 - frequency of shell 1
   * @param {number} nu2 - frequency of shell 2
   * @returns {boolean}
   */
  isLocked(nu1, nu2) {
    return this.calculateResonance(nu1, nu2) > 0.8;
  }

  /**
   * Determine if dissonance correction is needed.
   * R < 0.3 triggers dissonance correction.
   * @param {number} nuCurrent
   * @param {number} nuTarget
   * @returns {boolean}
   */
  needsCorrection(nuCurrent, nuTarget) {
    return this.calculateResonance(nuCurrent, nuTarget) < 0.3;
  }

  /**
   * Record a resonance reading for trend analysis.
   * @param {number} nuCurrent
   * @param {number} nuTarget
   * @param {number} [resonance]
   */
  recordReading(nuCurrent, nuTarget, resonance) {
    if (resonance === undefined) {
      resonance = this.calculateResonance(nuCurrent, nuTarget);
    }
    this._history.push({
      timestamp: Date.now(),
      nuCurrent,
      nuTarget,
      resonance,
    });
    // Keep last 1000 readings
    if (this._history.length > 1000) {
      this._history.shift();
    }
  }

  /**
   * Get resonance trend over recent readings.
   * @param {number} [count=10]
   * @returns {{ direction: 'improving'|'degrading'|'stable', avgResonance: number }}
   */
  getTrend(count = 10) {
    const recent = this._history.slice(-count);
    if (recent.length < 2) {
      return { direction: 'stable', avgResonance: recent[0]?.resonance ?? 0.5 };
    }

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avg1 = firstHalf.reduce((s, r) => s + r.resonance, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((s, r) => s + r.resonance, 0) / secondHalf.length;
    const avgAll = recent.reduce((s, r) => s + r.resonance, 0) / recent.length;

    let direction = 'stable';
    if (avg2 - avg1 > 0.05) direction = 'improving';
    else if (avg1 - avg2 > 0.05) direction = 'degrading';

    return { direction, avgResonance: avgAll };
  }

  /**
   * Compute the harmonic mean of two frequencies (used in RESONATE operator).
   * @param {number} nu1
   * @param {number} nu2
   * @returns {number} coupled frequency
   */
  static harmonicMean(nu1, nu2) {
    if (nu1 <= 0 || nu2 <= 0) return 0;
    return 2 * nu1 * nu2 / (nu1 + nu2);
  }

  /**
   * Compute semantic distance between two a-boxes.
   * Uses a simplified content hash/Jaccard comparison.
   * @private
   */
  _computeSemanticDistance(boxA, boxB) {
    const a = typeof boxA?.content === 'string' ? boxA.content : JSON.stringify(boxA || '');
    const b = typeof boxB?.content === 'string' ? boxB.content : JSON.stringify(boxB || '');

    const tokensA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const tokensB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));

    if (tokensA.size === 0 && tokensB.size === 0) return 0;
    if (tokensA.size === 0 || tokensB.size === 0) return 1;

    const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);
    const jaccard = intersection.size / union.size;

    return 1 - jaccard;
  }
}

module.exports = { ResonanceMatcher };
