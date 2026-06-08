'use strict';

const crypto = require('crypto');

/**
 * Headspace Manager (ℍ)
 * Creates/manages bounded cognitive environments with Composite (ℂ) support.
 *
 * ℍ = ⟨ shells[], context_boundary, sovereign_channel, damping_factor ⟩
 * ℂ = ⟨ headspaces[], crosstalk_channel, fusion_mechanism, phase_delta ⟩
 *
 * Fusion mechanisms: resonance_max, dissonance_min, harmonic_sum, adversarial_gate
 */

const FUSION_MECHANISMS = Object.freeze({
  RESONANCE_MAX:  'resonance_max',
  DISSONANCE_MIN: 'dissonance_min',
  HARMONIC_SUM:   'harmonic_sum',
  ADVERSARIAL_GATE: 'adversarial_gate',
});

class Headspace {
  /**
   * @param {object} spec
   * @param {string} [spec.id] - Auto-generated if omitted
   * @param {Array} [spec.shells=[]] - Shell instances in this headspace
   * @param {number} [spec.contextBoundary=8192] - Shared awareness window (tokens)
   * @param {string} [spec.sovereignChannel='main'] - Where Field-Sovereign's intent enters
   * @param {number} [spec.dampingFactor=0.7] - Dissonance correction sensitivity
   * @param {string} [spec.name] - Optional human-readable name
   */
  constructor(spec = {}) {
    this.id = spec.id || `ℍ_${crypto.randomBytes(6).toString('hex')}`;
    this.name = spec.name || this.id;
    this.shells = [...(spec.shells || [])];
    this.contextBoundary = spec.contextBoundary ?? 8192;
    this.sovereignChannel = spec.sovereignChannel !== undefined ? spec.sovereignChannel : 'main';
    this.dampingFactor = spec.dampingFactor ?? 0.7;
    this.createdAt = Date.now();
    this._aBoxIds = [];
  }

  /**
   * Add a shell to this headspace.
   * @param {object} shell
   */
  addShell(shell) {
    this.shells.push(shell);
  }

  /**
   * Remove a shell by ID.
   * @param {string} shellId
   * @returns {boolean} whether shell was found and removed
   */
  removeShell(shellId) {
    const idx = this.shells.findIndex(s => s.id === shellId);
    if (idx === -1) return false;
    this.shells.splice(idx, 1);
    return true;
  }

  /**
   * Register an a-box ID as belonging to this headspace.
   * @param {string} aBoxId
   */
  registerABox(aBoxId) {
    this._aBoxIds.push(aBoxId);
  }

  /**
   * Get the damping characteristic.
   * @returns {string}
   */
  getDampingCharacteristic() {
    if (this.dampingFactor < 0.5) return 'underdamped';
    if (this.dampingFactor <= 0.85) return 'critically damped';
    return 'overdamped';
  }

  /**
   * Minimum headspace requirement check (C1):
   * Must contain at least 2 shells or 1 shell + 1 sovereign channel.
   * @returns {boolean}
   */
  isValid() {
    return this.shells.length >= 2 || (this.shells.length === 1 && this.sovereignChannel != null);
  }
}

class CompositeHeadspace {
  /**
   * @param {object} spec
   * @param {string} [spec.id] - Auto-generated if omitted
   * @param {Headspace[]} spec.headspaces - At minimum 2
   * @param {string} [spec.crosstalkChannel='bridge'] - La-link path connecting them
   * @param {string} [spec.fusionMechanism='adversarial_gate'] - How outputs are merged
   * @param {number} [spec.phaseDelta=0.3] - Intentional processing offset
   */
  constructor(spec = {}) {
    if (!spec.headspaces || spec.headspaces.length < 2) {
      throw new Error('CompositeHeadspace requires at minimum 2 headspaces');
    }
    if (!Object.values(FUSION_MECHANISMS).includes(spec.fusionMechanism)) {
      throw new Error(`Invalid fusion mechanism: ${spec.fusionMechanism}`);
    }

    this.id = spec.id || `ℂ_${crypto.randomBytes(6).toString('hex')}`;
    this.headspaces = spec.headspaces;
    this.crosstalkChannel = spec.crosstalkChannel || 'bridge';
    this.fusionMechanism = spec.fusionMechanism || FUSION_MECHANISMS.ADVERSARIAL_GATE;
    this.phaseDelta = spec.phaseDelta ?? 0.3;
    this.createdAt = Date.now();
  }

  /**
   * Compute the frequency separation between the two headspaces.
   * Average shell frequency in headspace 1 vs headspace 2.
   * @param {function} getFrequency - function(shell) => nu
   * @returns {number} octaves apart
   */
  frequencySeparation(getFrequency) {
    const avgNu = (hs) => {
      if (hs.shells.length === 0) return 0;
      const sum = hs.shells.reduce((s, sh) => s + (getFrequency(sh) || 0), 0);
      return sum / hs.shells.length;
    };

    const nu1 = avgNu(this.headspaces[0]);
    const nu2 = avgNu(this.headspaces[1]);
    if (nu1 <= 0 || nu2 <= 0) return 0;

    const ratio = Math.max(nu1, nu2) / Math.min(nu1, nu2);
    return Math.log2(ratio);
  }

  /**
   * Fusion: merge a-box outputs from both headspaces according to mechanism.
   * @param {object[]} outputsA - a-box outputs from headspace A
   * @param {object[]} outputsB - a-box outputs from headspace B
   * @returns {object[]} fused outputs
   */
  fuse(outputsA, outputsB) {
    switch (this.fusionMechanism) {
      case FUSION_MECHANISMS.RESONANCE_MAX:
        // Take the highest-confidence a-box from each set
        return [this._pickMaxConfidence(outputsA), this._pickMaxConfidence(outputsB)];

      case FUSION_MECHANISMS.DISSONANCE_MIN:
        // Take the lowest-confidence (most dissonant), highlighting disagreement
        return [this._pickMinConfidence(outputsA), this._pickMinConfidence(outputsB)];

      case FUSION_MECHANISMS.HARMONIC_SUM:
        // Pair outputs and combine via harmonic mean of confidence scores
        return this._harmonicFuse(outputsA, outputsB);

      case FUSION_MECHANISMS.ADVERSARIAL_GATE:
        // Output the higher-conf dataset, but annotate with the lower-conf one as critique
        return this._adversarialGate(outputsA, outputsB);

      default:
        return [...outputsA, ...outputsB];
    }
  }

  /** @private */
  _pickMaxConfidence(outputs) {
    if (outputs.length === 0) return null;
    return outputs.reduce((best, o) => (o.confidence || 0) > (best.confidence || 0) ? o : best);
  }

  /** @private */
  _pickMinConfidence(outputs) {
    if (outputs.length === 0) return null;
    return outputs.reduce((worst, o) => (o.confidence || 1) < (worst.confidence || 1) ? o : worst);
  }

  /** @private */
  _harmonicFuse(outputsA, outputsB) {
    const results = [];
    const maxLen = Math.max(outputsA.length, outputsB.length);
    for (let i = 0; i < maxLen; i++) {
      const a = outputsA[i];
      const b = outputsB[i];
      if (a && b) {
        const harmonicConf = (a.confidence > 0 && b.confidence > 0)
          ? 2 * a.confidence * b.confidence / (a.confidence + b.confidence)
          : 0;
        results.push({
          ...a,
          confidence: harmonicConf,
          _fusedWith: b.id,
        });
      } else if (a) {
        results.push(a);
      } else if (b) {
        results.push(b);
      }
    }
    return results;
  }

  /** @private */
  _adversarialGate(outputsA, outputsB) {
    const avgConfA = outputsA.reduce((s, o) => s + (o.confidence || 0), 0) / outputsA.length;
    const avgConfB = outputsB.reduce((s, o) => s + (o.confidence || 0), 0) / outputsB.length;

    const [primary, secondary] = avgConfA >= avgConfB
      ? [outputsA, outputsB]
      : [outputsB, outputsA];

    return primary.map((p, i) => ({
      ...p,
      _critique: secondary[i % secondary.length] || null,
      _gated: true,
    }));
  }
}

class HeadspaceManager {
  constructor() {
    this._headspaces = new Map();
    this._composites = new Map();
  }

  /**
   * Create a new headspace.
   * @param {object} spec
   * @returns {Headspace}
   */
  createHeadspace(spec = {}) {
    const hs = new Headspace(spec);
    this._headspaces.set(hs.id, hs);
    return hs;
  }

  /**
   * Get a headspace by ID.
   * @param {string} id
   * @returns {Headspace|undefined}
   */
  getHeadspace(id) {
    return this._headspaces.get(id);
  }

  /**
   * Create a Composite Headspace from an existing headspace + a sidecar shell.
   * @param {string} mainHeadspaceId
   * @param {object} sidecarShell - The specialist sidecar shell
   * @param {object} [options]
   * @returns {CompositeHeadspace}
   */
  spawnSidecar(mainHeadspaceId, sidecarShell, options = {}) {
    const main = this._headspaces.get(mainHeadspaceId);
    if (!main) throw new Error(`Headspace not found: ${mainHeadspaceId}`);

    const sidecar = new Headspace({
      shells: [sidecarShell],
      contextBoundary: options.contextBoundary || main.contextBoundary,
      sovereignChannel: main.sovereignChannel,
      dampingFactor: options.dampingFactor || main.dampingFactor,
    });
    this._headspaces.set(sidecar.id, sidecar);

    const composite = new CompositeHeadspace({
      headspaces: [main, sidecar],
      crosstalkChannel: options.crosstalkChannel || 'bridge',
      fusionMechanism: options.fusionMechanism || 'adversarial_gate',
      phaseDelta: options.phaseDelta || Math.random() * 0.4 + 0.1,
    });
    this._composites.set(composite.id, composite);
    return composite;
  }

  /**
   * Get a composite by ID.
   * @param {string} id
   * @returns {CompositeHeadspace|undefined}
   */
  getComposite(id) {
    return this._composites.get(id);
  }

  /**
   * Get all headspaces.
   * @returns {Headspace[]}
   */
  allHeadspaces() {
    return [...this._headspaces.values()];
  }

  /**
   * Get all composites.
   * @returns {CompositeHeadspace[]}
   */
  allComposites() {
    return [...this._composites.values()];
  }

  /**
   * Remove a headspace.
   * @param {string} id
   * @returns {boolean}
   */
  removeHeadspace(id) {
    return this._headspaces.delete(id);
  }

  /**
   * Remove a composite.
   * @param {string} id
   * @returns {boolean}
   */
  removeComposite(id) {
    return this._composites.delete(id);
  }
}

module.exports = {
  Headspace,
  CompositeHeadspace,
  HeadspaceManager,
  FUSION_MECHANISMS,
};
