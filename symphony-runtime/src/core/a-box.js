'use strict';

/**
 * a-box Manager (▣)
 * Manages cognitive artifact snapshots with decision points and confidence scoring.
 *
 * ▣ = ⟨ id, content_hash, waveform_segment, parent_la_links, resonance_state ⟩
 *
 * Resonance states: active, latent, dissonant, resolved, archived
 */

const crypto = require('crypto');

const RESONANCE_STATES = Object.freeze({
  ACTIVE:    'active',
  LATENT:    'latent',
  DISSONANT: 'dissonant',
  RESOLVED:  'resolved',
  ARCHIVED:  'archived',
});

class ABox {
  /**
   * @param {object} spec
   * @param {string} [spec.id] - Auto-generated if omitted
   * @param {*} spec.content - The cognitive content payload
   * @param {Array} [spec.parentLinks=[]] - Parent ⧁ la-link references
   * @param {string} [spec.state='active'] - Resonance state
   * @param {number} [spec.confidence=0.5] - Decision confidence score [0,1]
   * @param {number} [spec.cognitiveMass=1.0] - Cognitive mass for waveform amplitude
   */
  constructor(spec = {}) {
    this.id = spec.id || `▣_${crypto.randomBytes(8).toString('hex')}`;
    this.content = spec.content;
    this.contentHash = this._hash(spec.content);
    this.parentLinks = spec.parentLinks || [];
    this.state = spec.state || RESONANCE_STATES.ACTIVE;
    this.confidence = spec.confidence ?? 0.5;
    this.cognitiveMass = spec.cognitiveMass ?? 1.0;
    this.timestamp = spec.timestamp !== undefined ? spec.timestamp : Date.now();
    this.waveformSegment = spec.waveformSegment || null;
    this.metadata = spec.metadata || {};
  }

  /**
   * Compute a deterministic content hash.
   * @private
   */
  _hash(content) {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * The waveform amplitude for this a-box in the cognitive DAW.
   * amplitude(▣ᵢ) = resonance_score(▣ᵢ) · cognitive_mass(content)
   * @returns {number}
   */
  get amplitude() {
    return this.confidence * this.cognitiveMass;
  }

  /**
   * Add a parent la-link reference.
   * @param {object} link - The ⧁ la-link object
   */
  addParentLink(link) {
    this.parentLinks.push(link);
  }

  /**
   * Set the decision confidence score.
   * @param {number} score - 0..1
   */
  setConfidence(score) {
    this.confidence = Math.max(0, Math.min(1, score));
  }

  /**
   * Transition to a new resonance state.
   * @param {string} newState - Must be a valid RESONANCE_STATES value
   * @throws {Error} if invalid state
   */
  transitionTo(newState) {
    if (!Object.values(RESONANCE_STATES).includes(newState)) {
      throw new Error(`Invalid resonance state: ${newState}`);
    }
    this.state = newState;
  }

  /**
   * Serialize for emission/wire format.
   */
  toEmission() {
    return {
      id: this.id,
      content: this.content,
      timestamp: this.timestamp,
      frequency: this.metadata.frequency,
      resonance: this.confidence,
      parentLinks: this.parentLinks,
      state: this.state,
    };
  }

  /**
   * Parse an <A-BOX> formatted emission back into an instance.
   * @param {object} data
   * @returns {ABox}
   */
  static fromEmission(data) {
    return new ABox({
      id: data.id,
      content: data.content,
      parentLinks: data.parentLinks || [],
      state: data.state || 'active',
      confidence: data.resonance ?? 0.5,
      timestamp: data.timestamp,
    });
  }

  /**
   * Calculate the waveform decay factor at time t from emission.
   * Ψ(𝓢, t) = Σᵢ amplitude(▣ᵢ) · exp(-λ|t - tᵢ|)
   * @param {number} currentTime - Current cognitive beat
   * @param {number} [decayConstant=0.5] - λ decay constant
   * @returns {number}
   */
  decayedAmplitude(currentTime, decayConstant = 0.5) {
    const delta = Math.abs(currentTime - this.timestamp);
    return this.amplitude * Math.exp(-decayConstant * delta);
  }
}

class ABoxManager {
  constructor() {
    this._boxes = new Map();
  }

  /**
   * Create and register a new a-box.
   * @param {object} spec
   * @returns {ABox}
   */
  create(spec = {}) {
    const box = new ABox(spec);
    this._boxes.set(box.id, box);
    return box;
  }

  /**
   * Retrieve an a-box by ID.
   * @param {string} id
   * @returns {ABox|undefined}
   */
  get(id) {
    return this._boxes.get(id);
  }

  /**
   * Find all a-boxes in a given resonance state.
   * @param {string} state
   * @returns {ABox[]}
   */
  findByState(state) {
    return [...this._boxes.values()].filter(b => b.state === state);
  }

  /**
   * Calculate the dissonance budget (Composition Rule C3):
   * Ratio of dissonant a-boxes to total.
   * @returns {number} 0..1
   */
  dissonanceRatio() {
    if (this._boxes.size === 0) return 0;
    const dissonant = this.findByState(RESONANCE_STATES.DISSONANT).length;
    return dissonant / this._boxes.size;
  }

  /**
   * Check if system is in critical dissonance (>30% dissonant).
   * @returns {boolean}
   */
  isCriticalDissonance() {
    return this.dissonanceRatio() > 0.3;
  }

  /**
   * Remove an a-box by ID.
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    return this._boxes.delete(id);
  }

  /**
   * Get all active a-boxes.
   * @returns {ABox[]}
   */
  all() {
    return [...this._boxes.values()];
  }

  /**
   * Get count of a-boxes.
   * @returns {number}
   */
  get size() {
    return this._boxes.size;
  }
}

module.exports = { ABox, ABoxManager, RESONANCE_STATES };
