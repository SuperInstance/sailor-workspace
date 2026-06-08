'use strict';

/**
 * Beat Normalizer
 * Converts between raw milliseconds and cognitive beats (ν-normalized).
 *
 * 1 beat(𝓢) = τ_latency(𝓢) · context_depth(𝓢)
 *
 * Frequency Bands (ν range):
 *   Sub-bass:   0.001–0.01 Hz   — Deep contemplative
 *   Bass:       0.01–0.1 Hz     — Slow reasoning
 *   Mid:        0.1–1 Hz        — Conversational
 *   Treble:     1–10 Hz         — Rapid response
 *   Ultrasonic: >10 Hz          — Reflexive
 */

const FREQUENCY_BANDS = Object.freeze({
  SUB_BASS:   { label: 'sub-bass',   min: 0.001, max: 0.01 },
  BASS:       { label: 'bass',       min: 0.01,  max: 0.1 },
  MID:        { label: 'mid',        min: 0.1,   max: 1 },
  TREBLE:     { label: 'treble',     min: 1,     max: 10 },
  ULTRASONIC: { label: 'ultrasonic', min: 10,    max: Infinity },
});

class BeatNormalizer {
  /**
   * @param {object} timbre - The shell's Cognitive Timbre (𝓣)
   * @param {number} timbre.latencyMs - Mean latency in ms
   * @param {number} [timbre.contextDepth=1.0] - Relative context depth scaling factor
   */
  constructor(timbre) {
    this.latencyMs = timbre.latencyMs;
    this.contextDepth = timbre.contextDepth || 1.0;
  }

  /**
   * Calculate the cognitive beat duration in ms for this timbre.
   * 1 beat(𝓢) = τ_latency(𝓢) · context_depth(𝓢)
   * @returns {number} ms per cognitive beat
   */
  beatDurationMs() {
    return this.latencyMs * this.contextDepth;
  }

  /**
   * Convert ms to cognitive beats.
   * @param {number} ms
   * @returns {number} beats
   */
  msToBeats(ms) {
    return ms / this.beatDurationMs();
  }

  /**
   * Convert cognitive beats to ms.
   * @param {number} beats
   * @returns {number} ms
   */
  beatsToMs(beats) {
    return beats * this.beatDurationMs();
  }

  /**
   * Calculate cognitive frequency ν(𝓢) in Hz from timbre + context utilization.
   * ν(𝓢) = f(𝓣, context_utilization)
   * Higher utilization = slower frequency (more processing per cycle).
   * @param {number} [contextUtilization=0.5] - 0..1 how loaded the shell is
   * @returns {number} ν in Hz
   */
  calculateFrequency(contextUtilization = 0.5) {
    const rawHz = 1000 / this.latencyMs;
    const loadFactor = 1 - contextUtilization * 0.9; // 1 (idle) → 0.1 (maxed)
    return rawHz * loadFactor;
  }

  /**
   * Classify which frequency band a given ν falls into.
   * @param {number} nu - frequency in Hz
   * @returns {string} band label
   */
  static classifyBand(nu) {
    for (const band of Object.values(FREQUENCY_BANDS)) {
      if (nu >= band.min && nu < band.max) {
        return band.label;
      }
    }
    return 'ultrasonic';
  }

  /**
   * Get the center frequency of a band (geometric mean of bounds).
   * @param {string} label - band label
   * @returns {number}
   */
  static bandCenter(label) {
    const band = Object.values(FREQUENCY_BANDS).find(b => b.label === label);
    if (!band) return 1;
    if (band.max === Infinity) return band.min * 2;
    return Math.sqrt(band.min * band.max);
  }

  /**
   * Calculate how many octaves apart two frequencies are.
   * Used by Composition Rule C2 (minimum 0.5 octaves separation in Composite Headspace).
   * @param {number} nu1
   * @param {number} nu2
   * @returns {number} octaves
   */
  static octavesApart(nu1, nu2) {
    if (nu1 <= 0 || nu2 <= 0) return 0;
    const ratio = Math.max(nu1, nu2) / Math.min(nu1, nu2);
    return Math.log2(ratio);
  }
}

module.exports = { BeatNormalizer, FREQUENCY_BANDS };
