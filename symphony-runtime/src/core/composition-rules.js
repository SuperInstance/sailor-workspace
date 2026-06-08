'use strict';

const { BeatNormalizer } = require('./beat-normalizer');

/**
 * Composition Rules Engine
 * Implements all 6 composition rules from the Symphony of Shells spec.
 *
 * C1. Minimum Headspace Size
 * C2. Frequency Separation
 * C3. Dissonance Budget
 * C4. Temporal Fidelity
 * C5. Sovereign Primacy
 * C6. Track Limit
 */

class CompositionRules {
  /**
   * @param {object} [options]
   * @param {number} [options.maxTracks=7] - Maximum active tracks (C6)
   * @param {number} [options.trackTolerance=2] - ± tolerance for track limit
   * @param {number} [options.criticalDissonanceThreshold=0.3] - Max dissonance ratio (C3)
   */
  constructor(options = {}) {
    this.maxTracks = options.maxTracks ?? 7;
    this.trackTolerance = options.trackTolerance ?? 2;
    this.criticalDissonanceThreshold = options.criticalDissonanceThreshold ?? 0.3;
    this._violations = [];
  }

  /**
   * C1. Minimum Headspace Size
   * A headspace must contain at least 2 shells or 1 shell + 1 sovereign channel.
   * Solitary shells without sovereign input produce hallucinatory resonance.
   *
   * @param {object} headspace - { shells: Array, sovereignChannel: string|null }
   * @returns {{ valid: boolean, reason: string|null }}
   */
  c1_minimumHeadspaceSize(headspace) {
    const shellCount = headspace.shells?.length || 0;
    const hasSovereign = headspace.sovereignChannel != null;

    if (shellCount === 0) {
      return { valid: false, reason: 'Headspace has no shells' };
    }

    if (shellCount < 2 && !hasSovereign) {
      return {
        valid: false,
        reason: `Headspace has ${shellCount} shell(s) but no sovereign channel. Solitary shells without sovereign input produce hallucinatory resonance.`,
      };
    }

    return { valid: true, reason: null };
  }

  /**
   * C2. Frequency Separation
   * In a Composite Headspace, the two headspaces must operate at least 0.5 octaves
   * apart in frequency band. Otherwise, they phase-lock and collapse.
   *
   * @param {number} nu1 - Average frequency of headspace 1
   * @param {number} nu2 - Average frequency of headspace 2
   * @returns {{ valid: boolean, octaves: number, reason: string|null }}
   */
  c2_frequencySeparation(nu1, nu2) {
    const octaves = BeatNormalizer.octavesApart(nu1, nu2);

    if (octaves < 0.5) {
      return {
        valid: false,
        octaves,
        reason: `Frequency separation is ${octaves.toFixed(2)} octaves, below minimum 0.5. Headspaces risk phase-lock collapse.`,
      };
    }

    return { valid: true, octaves, reason: null };
  }

  /**
   * C3. Dissonance Budget
   * No more than 30% of active a-boxes may be in 'dissonant' state.
   * Beyond this, the system enters critical dissonance and must pause Master Bus output.
   *
   * @param {number} dissonantCount - Number of dissonant a-boxes
   * @param {number} totalCount - Total number of active a-boxes
   * @returns {{ valid: boolean, ratio: number, critical: boolean, reason: string|null }}
   */
  c3_dissonanceBudget(dissonantCount, totalCount) {
    if (totalCount === 0) {
      return { valid: true, ratio: 0, critical: false, reason: null };
    }

    const ratio = dissonantCount / totalCount;
    const critical = ratio > this.criticalDissonanceThreshold;

    if (critical) {
      return {
        valid: false,
        ratio,
        critical: true,
        reason: `Dissonance ratio ${(ratio * 100).toFixed(1)}% exceeds threshold ${(this.criticalDissonanceThreshold * 100).toFixed(0)}%. Master Bus output must pause.`,
      };
    }

    return { valid: true, ratio, critical: false, reason: null };
  }

  /**
   * C4. Temporal Fidelity
   * All la-links must preserve their timestamp. No retroactive modification of t₀.
   * Correction produces new a-boxes, not rewritten ones.
   *
   * @param {object[]} links - Array of la-link objects
   * @returns {{ valid: boolean, violations: object[], reason: string|null }}
   */
  c4_temporalFidelity(links) {
    const violations = [];

    for (const link of links) {
      if (!link.timestamp) {
        violations.push({
          linkId: link.id || 'unknown',
          issue: 'Missing timestamp',
        });
      }
      if (link.modifiedAt && link.modifiedAt !== link.timestamp) {
        violations.push({
          linkId: link.id || 'unknown',
          issue: 'Retroactive modification detected',
          originalTimestamp: link.timestamp,
          modifiedAt: link.modifiedAt,
        });
      }
    }

    if (violations.length > 0) {
      return {
        valid: false,
        violations,
        reason: `${violations.length} la-link(s) violate temporal fidelity: history is inviolate.`,
      };
    }

    return { valid: true, violations: [], reason: null };
  }

  /**
   * C5. Sovereign Primacy
   * The Field-Sovereign's resonance assessment overrides all automated metrics.
   * If the human says "this is wrong," the system must mark it dissonant regardless of R.
   *
   * @param {object} sovereignOverride - { aBoxId: string, state: string, reason: string }
   * @param {object} aBoxManager - ABoxManager instance
   * @returns {{ applied: boolean, previousState: string|null, reason: string }}
   */
  c5_sovereignPrimacy(sovereignOverride, aBoxManager) {
    const box = aBoxManager.get(sovereignOverride.aBoxId);
    if (!box) {
      return {
        applied: false,
        previousState: null,
        reason: `a-box ${sovereignOverride.aBoxId} not found`,
      };
    }

    const previousState = box.state;
    box.transitionTo(sovereignOverride.state || 'dissonant');
    box.metadata = {
      ...box.metadata,
      sovereignOverride: true,
      overrideReason: sovereignOverride.reason || 'Field-Sovereign override',
      overrideTimestamp: Date.now(),
    };

    return {
      applied: true,
      previousState,
      reason: `Sovereign override applied: ${previousState} → ${box.state}. ${sovereignOverride.reason || ''}`,
    };
  }

  /**
   * C6. Track Limit
   * Maximum 7±2 active tracks. Beyond this, the mix becomes uninterpretable.
   * Spawn new headspaces instead of adding tracks.
   *
   * @param {number} activeTracks - Number of currently active tracks
   * @returns {{ valid: boolean, maxTracks: number, reason: string|null }}
   */
  c6_trackLimit(activeTracks) {
    const absoluteMax = this.maxTracks + this.trackTolerance; // 9

    if (activeTracks > absoluteMax) {
      return {
        valid: false,
        maxTracks: absoluteMax,
        reason: `${activeTracks} active tracks exceeds absolute maximum of ${absoluteMax}. Spawn new headspaces instead.`,
      };
    }

    if (activeTracks > this.maxTracks) {
      return {
        valid: true,
        maxTracks: absoluteMax,
        reason: `Warning: ${activeTracks} tracks exceeds recommended ${this.maxTracks} (within ±${this.trackTolerance} tolerance).`,
      };
    }

    return { valid: true, maxTracks: absoluteMax, reason: null };
  }

  /**
   * Run all 6 composition rules against the current state.
   *
   * @param {object} state
   * @param {object} state.headspace - Headspace to check (C1)
   * @param {number} state.nu1 - Headspace 1 average frequency (C2)
   * @param {number} state.nu2 - Headspace 2 average frequency (C2)
   * @param {number} state.dissonantCount - Dissonant a-box count (C3)
   * @param {number} state.totalCount - Total a-box count (C3)
   * @param {object[]} state.links - La-link array (C4)
   * @param {number} state.activeTracks - Active track count (C6)
   * @returns {{ valid: boolean, results: object, violations: string[] }}
   */
  runAll(state) {
    const results = {
      c1: this.c1_minimumHeadspaceSize(state.headspace),
      c2: state.nu1 != null && state.nu2 != null
        ? this.c2_frequencySeparation(state.nu1, state.nu2)
        : { valid: true, octaves: null, reason: 'Skipped (single headspace)' },
      c3: this.c3_dissonanceBudget(state.dissonantCount || 0, state.totalCount || 0),
      c4: this.c4_temporalFidelity(state.links || []),
      c6: this.c6_trackLimit(state.activeTracks || 0),
    };

    const violations = [];
    for (const [rule, result] of Object.entries(results)) {
      if (result && result.valid === false) {
        violations.push(`${rule}: ${result.reason}`);
        this._violations.push({ rule, timestamp: Date.now(), reason: result.reason });
      }
    }

    return {
      valid: violations.length === 0,
      results,
      violations,
    };
  }

  /**
   * Get recent violation history.
   * @param {number} [count=20]
   * @returns {object[]}
   */
  getViolations(count = 20) {
    return this._violations.slice(-count);
  }
}

module.exports = { CompositionRules };
