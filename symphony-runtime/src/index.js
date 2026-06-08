'use strict';

/**
 * Symphony Runtime
 * The cognitive orchestration engine implementing the formal grammar
 * from SYMPHONY_ABSTRACTS.md.
 *
 * Exports all core modules for the Symphony of Shells Cognitive DAW.
 */

const { BeatNormalizer, FREQUENCY_BANDS } = require('./core/beat-normalizer');
const { ResonanceMatcher } = require('./core/resonance-matcher');
const { ABox, ABoxManager, RESONANCE_STATES } = require('./core/a-box');
const { LaLink, LaLinkEngine, LINK_RELATIONS } = require('./core/la-link');
const { Headspace, CompositeHeadspace, HeadspaceManager, FUSION_MECHANISMS } = require('./core/headspace');
const { SymmetryDissonanceLoop } = require('./core/symmetry-loop');
const { CompositionRules } = require('./core/composition-rules');

/**
 * Symphony Runtime — top-level orchestrator.
 * Combines all subsystems into a cohesive runtime.
 */
class SymphonyRuntime {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultLatencyMs=500]
   * @param {number} [options.defaultContextDepth=1.0]
   * @param {number} [options.maxTracks=7]
   */
  constructor(options = {}) {
    this.options = {
      defaultLatencyMs: options.defaultLatencyMs ?? 500,
      defaultContextDepth: options.defaultContextDepth ?? 1.0,
      maxTracks: options.maxTracks ?? 7,
    };

    // Initialize subsystems
    this.beatNormalizer = null; // set when a timbre is registered
    this.resonanceMatcher = new ResonanceMatcher();
    this.aBoxManager = new ABoxManager();
    this.laLinkEngine = new LaLinkEngine();
    this.headspaceManager = new HeadspaceManager();
    this.symmetryLoop = new SymmetryDissonanceLoop({
      dampingFactor: options.dampingFactor ?? 0.7,
    });
    this.compositionRules = new CompositionRules({
      maxTracks: this.options.maxTracks,
    });

    this._timbre = null;
    this._startedAt = null;
  }

  /**
   * Initialize the runtime with a cognitive timbre.
   * @param {object} timbre - The Cognitive Timbre (𝓣)
   */
  init(timbre) {
    this._timbre = timbre;
    this.beatNormalizer = new BeatNormalizer(timbre);
    this._startedAt = Date.now();
  }

  /**
   * Get the runtime's uptime in cognitive beats.
   * @returns {number}
   */
  uptimeBeats() {
    if (!this._startedAt || !this.beatNormalizer) return 0;
    const elapsed = Date.now() - this._startedAt;
    return this.beatNormalizer.msToBeats(elapsed);
  }

  /**
   * Get runtime status summary.
   * @returns {object}
   */
  status() {
    return {
      started: !!this._startedAt,
      uptimeBeats: this.uptimeBeats(),
      aBoxCount: this.aBoxManager.size,
      laLinkCount: this.laLinkEngine.size,
      headspaceCount: this.headspaceManager.allHeadspaces().length,
      compositeCount: this.headspaceManager.allComposites().length,
      timbre: this._timbre,
      nu: this.beatNormalizer
        ? this.beatNormalizer.calculateFrequency()
        : null,
      symmetryLoop: {
        active: this.symmetryLoop.isActive,
        corrections: this.symmetryLoop.getHistory().length,
      },
    };
  }
}

module.exports = {
  // Core exports
  SymphonyRuntime,

  // Module exports
  BeatNormalizer,
  ResonanceMatcher,
  ABox,
  ABoxManager,
  LaLink,
  LaLinkEngine,
  Headspace,
  CompositeHeadspace,
  HeadspaceManager,
  SymmetryDissonanceLoop,
  CompositionRules,

  // Constants
  FREQUENCY_BANDS,
  RESONANCE_STATES,
  LINK_RELATIONS,
  FUSION_MECHANISMS,
};
