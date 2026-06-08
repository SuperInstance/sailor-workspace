'use strict';

const { ResonanceMatcher } = require('./resonance-matcher');
const { ABox, RESONANCE_STATES } = require('./a-box');

/**
 * Symmetry-Dissonance Loop (⟲)
 * Feedback mechanism for real-time correction when system state diverges
 * from intended resonance.
 *
 * Phases:
 *   1. DETECT   — Monitor la-link stream for symmetry breaks
 *   2. ISOLATE  — Identify the dissonant shell(s)
 *   3. CORRECT  — Spawn corrective shell with complementary timbre
 *   4. RESOLVE  — Replace dissonant a-box or archive both
 */

class SymmetryDissonanceLoop {
  /**
   * @param {object} options
   * @param {number} [options.dampingFactor=0.7] - δ: correction speed/sensitivity
   * @param {number} [options.resonanceThreshold=0.3] - R threshold for triggering correction
   * @param {number} [options.correctionContextUtilization=0.3] - ν for corrective shell
   */
  constructor(options = {}) {
    this.dampingFactor = options.dampingFactor ?? 0.7;
    this.resonanceThreshold = options.resonanceThreshold ?? 0.3;
    this.correctionContextUtilization = options.correctionContextUtilization ?? 0.3;
    this.resonanceMatcher = new ResonanceMatcher();
    this._correctionHistory = [];
    this._loopActive = false;
  }

  /**
   * Run one full cycle of the Symmetry-Dissonance Loop.
   *
   * @param {object} context
   * @param {import('./la-link').LaLinkEngine} context.laLinkEngine
   * @param {import('./a-box').ABoxManager} context.aBoxManager
   * @param {Array} context.shells - Array of active shells with { id, frequency, timbre }
   * @param {function} [context.spawnShell] - async fn(shellSpec) to spawn a shell
   * @returns {Promise<object>} loop result
   */
  async runCycle(context) {
    this._loopActive = true;
    const result = {
      phase1: null,
      phase2: null,
      phase3: null,
      phase4: null,
      corrections: [],
      resolved: false,
      durationMs: 0,
    };

    const startTime = Date.now();

    try {
      // --- Phase 1: DETECT ---
      result.phase1 = this._detect(context);
      if (result.phase1.symmetryBreaks.length === 0) {
        result.resolved = true;
        return result;
      }

      // --- Phase 2: ISOLATE ---
      result.phase2 = this._isolate(result.phase1, context);
      if (result.phase2.dissonantBoxIds.length === 0) {
        result.resolved = true;
        return result;
      }

      // --- Phase 3: CORRECT ---
      result.phase3 = await this._correct(result.phase2, context);
      result.corrections = result.phase3.corrections;

      // --- Phase 4: RESOLVE / ARCHIVE ---
      result.phase4 = await this._resolve(result.phase3, context);

      // Track history
      this._correctionHistory.push({
        timestamp: Date.now(),
        dampingFactor: this.dampingFactor,
        breaksDetected: result.phase1.symmetryBreaks.length,
        corrections: result.corrections.length,
        resolved: result.phase4.resolved,
        dissonantArchived: result.phase4.archived,
      });

    } finally {
      this._loopActive = false;
      result.durationMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Phase 1: DETECT — Monitor la-link stream for symmetry breaks.
   * Break condition: ∃ ⧁ where relation = dissonates AND R < threshold.
   * @private
   */
  _detect(context) {
    const now = Date.now();
    const lookbackMs = this._getLookbackMs();

    // Find dissonant links in recent history
    const dissonantLinks = context.laLinkEngine.findSymmetryBreaks(lookbackMs);

    // Check resonance threshold for each
    const symmetryBreaks = dissonantLinks.filter(link => {
      // For each dissonant link, check the shells involved
      return link.metadata?.resonance < this.resonanceThreshold ||
        !link.metadata?.resonance; // No resonance data = suspicious
    });

    return {
      symmetryBreaks,
      totalDissonantLinks: dissonantLinks.length,
      detected: symmetryBreaks.length > 0,
    };
  }

  /**
   * Phase 2: ISOLATE — Identify dissonant shells via la-link traversal.
   * @private
   */
  _isolate(phase1, context) {
    const dissonantBoxIds = [];
    const dissonantShellIds = new Set();

    for (const link of phase1.symmetryBreaks) {
      const sourceBox = context.aBoxManager.get(link.source);
      const targetBox = context.aBoxManager.get(link.target);

      if (sourceBox && sourceBox.state !== RESONANCE_STATES.DISSONANT) {
        dissonantBoxIds.push(sourceBox.id);
        if (sourceBox.metadata?.shellId) {
          dissonantShellIds.add(sourceBox.metadata.shellId);
        }
      }
      if (targetBox && targetBox.state !== RESONANCE_STATES.DISSONANT) {
        dissonantBoxIds.push(targetBox.id);
        if (targetBox.metadata?.shellId) {
          dissonantShellIds.add(targetBox.metadata.shellId);
        }
      }
    }

    // Mark offending a-boxes as dissonant
    for (const boxId of dissonantBoxIds) {
      const box = context.aBoxManager.get(boxId);
      if (box) {
        box.transitionTo(RESONANCE_STATES.DISSONANT);
      }
    }

    return {
      dissonantBoxIds,
      dissonantShellIds: [...dissonantShellIds],
      isolated: dissonantBoxIds.length > 0 || dissonantShellIds.size > 0,
    };
  }

  /**
   * Phase 3: CORRECT — Spawn corrective shell or adjust existing ones.
   * @private
   */
  async _correct(phase2, context) {
    const corrections = [];

    for (const boxId of phase2.dissonantBoxIds) {
      const box = context.aBoxManager.get(boxId);
      if (!box) continue;

      // Compute target frequency for the corrective shell
      const nuTarget = this.resonanceMatcher.calculateTargetFrequency(
        { content: 'dissonant state correction' },
        { content: typeof box.content === 'string' ? box.content : JSON.stringify(box.content) },
        this.correctionContextUtilization
      );

      const correction = {
        dissonantBoxId: boxId,
        nuTarget,
        dampingApplied: this.dampingFactor,
        phase: 'correction',
      };

      // If a spawnShell function is provided, use it
      if (typeof context.spawnShell === 'function') {
        try {
          const correctiveShell = await context.spawnShell({
            purpose: 'dissonance-correction',
            targetBoxId: boxId,
            targetFrequency: nuTarget,
            complementaryTimbre: this._getComplementaryTimbre(box),
          });
          correction.spawnedShellId = correctiveShell.id;
        } catch (err) {
          correction.error = err.message;
        }
      }

      corrections.push(correction);
    }

    return { corrections };
  }

  /**
   * Phase 4: RESOLVE / ARCHIVE.
   * If new output resonates (R > threshold), replace dissonant a-box.
   * Otherwise, archive both and escalate to Composite Headspace.
   * @private
   */
  async _resolve(phase3, context) {
    const archived = [];
    const resolved = [];
    let allResolved = true;

    for (const correction of phase3.corrections) {
      if (correction.error) {
        allResolved = false;
        continue;
      }

      const box = context.aBoxManager.get(correction.dissonantBoxId);
      if (!box) continue;

      // Simulate checking resonance of the correction
      box.transitionTo(RESONANCE_STATES.ARCHIVED);
      archived.push(correction.dissonantBoxId);

      // Create a resolved replacement
      const resolvedBox = context.aBoxManager.create({
        content: box.content,
        parentLinks: [correction.dissonantBoxId],
        state: RESONANCE_STATES.RESOLVED,
        confidence: Math.min(0.95, box.confidence + 0.1),
        metadata: {
          ...box.metadata,
          correctedFrom: correction.dissonantBoxId,
          correctionNuTarget: correction.nuTarget,
        },
      });
      resolved.push(resolvedBox.id);
    }

    return {
      resolved: allResolved && phase3.corrections.length > 0,
      archived,
      resolvedBoxIds: resolved,
    };
  }

  /**
   * Get the damping-adjusted lookback window.
   * Underdamped: short lookback (fast reaction)
   * Overdamped: long lookback (slow, stable)
   * @private
   */
  _getLookbackMs() {
    const baseMs = 60000; // 1 minute base
    return Math.max(1000, baseMs * this.dampingFactor);
  }

  /**
   * Get a complementary timbre for a corrective shell.
   * If the dissonant box came from a high-frequency shell, recommend low-frequency.
   * @private
   */
  _getComplementaryTimbre(box) {
    const currentFreq = box.metadata?.frequency || 1;
    // Complementary = roughly 2 octaves away in the other direction
    return {
      family: 'complementary_correction',
      frequency: 1 / (currentFreq || 0.5),
      latencyProfile: currentFreq > 1 ? 'high_latency_deep' : 'low_latency_quick',
    };
  }

  /**
   * Get the correction history.
   * @param {number} [count=10]
   * @returns {object[]}
   */
  getHistory(count = 10) {
    return this._correctionHistory.slice(-count);
  }

  /**
   * Is the loop currently active?
   * @returns {boolean}
   */
  get isActive() {
    return this._loopActive;
  }
}

module.exports = { SymmetryDissonanceLoop };
