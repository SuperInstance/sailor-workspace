/**
 * Reharmonization Engine — generates alternative ternary paths when CR < 0.7.
 * 
 * When the Conservation Ratio drops below threshold, the system has
 * detected a "surprise" — an event that doesn't follow the accumulator
 * invariant (Δ = trit × 4). This module generates alternative harmonic
 * interpretations to re-align the ghost tracks.
 * 
 * The engine maintains a pivot table of precomputed harmonic alternatives
 * per ternary state, enabling <1ms lookup for routine pivots.
 */

// ─── Pivot Table ───
// Maps current ternary vector → alternative paths
// Each alternative: { shift, label, confidence, alternateTrits }
const PIVOT_TABLE = {
  // Major contexts
  '[1,0,0]': [
    { shift: -1, label: 'relative minor', confidence: 0.85, alternateTrits: [-1, 0, 0] },
    { shift: 1, label: 'dominant of V', confidence: 0.70, alternateTrits: [1, 1, 0] },
    { shift: -4, label: 'subdominant pivot', confidence: 0.65, alternateTrits: [1, -1, 0] },
    { shift: 7, label: 'parallel minor', confidence: 0.55, alternateTrits: [-1, 1, 1] }
  ],
  // Minor contexts
  '[-1,0,0]': [
    { shift: 3, label: 'relative major', confidence: 0.85, alternateTrits: [1, 0, 0] },
    { shift: -2, label: 'harmonic minor', confidence: 0.75, alternateTrits: [-1, 1, 0] },
    { shift: 5, label: 'dorian pivot', confidence: 0.60, alternateTrits: [0, 1, 0] },
    { shift: -5, label: 'phrygian pivot', confidence: 0.50, alternateTrits: [-1, -1, 1] }
  ],
  // Neutral/ambiguous contexts
  '[0,0,0]': [
    { shift: 0, label: 'tonicize', confidence: 0.60, alternateTrits: [1, 0, 0] },
    { shift: 0, label: 'minorize', confidence: 0.55, alternateTrits: [-1, 0, 0] },
    { shift: 7, label: 'dominant approach', confidence: 0.50, alternateTrits: [1, -1, 1] },
    { shift: -5, label: 'subdominant approach', confidence: 0.45, alternateTrits: [-1, 1, 0] }
  ]
};

// ─── Interval Affinity Matrix ───
// Measures how likely a shift sounds natural given current context
const INTERVAL_AFFINITY = {
  '1': 1.0,   // unison — strongest resolution
  '5': 0.9,   // perfect fifth — most consonant shift
  '4': 0.85,  // perfect fourth
  '3': 0.70,  // major third
  '6': 0.60,  // major sixth
  '-3': 0.65, // minor third
  '-6': 0.55, // minor sixth
  '2': 0.40,  // major second (dissonant but singable)
  '-2': 0.35, // minor second (most dissonant)
  '7': 0.30,  // major seventh
  '-7': 0.25, // minor seventh
  '-4': 0.45, // tritone
  '-5': 0.20, // tritone (other direction)
};

class Reharmonizer {
  constructor() {
    this.pivotCount = 0;
    this.lastPivotTime = 0;
    this.pivotHistory = [];  // { timestamp, fromTrit, toTrit, reason }
    this.cooldownMs = 500;   // Minimum ms between reharmonizations
    this.activePivot = null; // Currently active alternative path
  }

  /**
   * Evaluate whether reharmonization is needed.
   * Called when CR drops below threshold.
   * 
   * @param {number} cr — Current Conservation Ratio (0-1)
   * @param {number[]} currentTrits — Current ternary vector [t0, t1, t2]
   * @param {number} currentNote — Current MIDI note
   * @param {number} avgCR — Rolling average CR
   * @returns {object|null} Reharmonization plan or null if none needed
   */
  evaluate(cr, currentTrits, currentNote, avgCR) {
    const now = Date.now();

    // Rate limit — don't reharmonize more than every 500ms
    if (now - this.lastPivotTime < this.cooldownMs) {
      return null;
    }

    // Three-tier reharmonization trigger
    let urgency = 0;
    if (cr < 0.7) urgency = 1;  // Standard — explore alternatives
    if (cr < 0.5) urgency = 2;  // Urgent — strong pivot needed
    if (cr < 0.3) urgency = 3;  // Critical — dramatic change

    if (urgency === 0) return null;

    // Find alternatives from pivot table
    const lookup = JSON.stringify(currentTrits || [0, 0, 0]);
    const alternatives = PIVOT_TABLE[lookup] || PIVOT_TABLE['[0,0,0]'];

    // Pick best alternative based on urgency
    // Higher urgency -> lower confidence alternatives become viable
    const viable = alternatives.filter(a => {
      if (urgency >= 3) return a.confidence >= 0.3;
      if (urgency >= 2) return a.confidence >= 0.5;
      return a.confidence >= 0.6;
    });

    if (viable.length === 0) return null;

    // Pick alternative — weighted by confidence + affinity
    const pick = this._pickWeighted(viable, currentNote);
    
    this.lastPivotTime = now;
    this.pivotCount++;
    this.activePivot = pick;
    
    this.pivotHistory.push({
      timestamp: now,
      fromTrit: currentTrits,
      toTrit: pick.alternateTrits,
      shift: pick.shift,
      label: pick.label,
      confidence: pick.confidence,
      urgency,
      cr
    });

    // Keep history bounded
    if (this.pivotHistory.length > 50) this.pivotHistory.shift();

    return {
      type: 'reharmonize',
      reason: `CR ${cr.toFixed(3)} < threshold, urgency ${urgency}`,
      urgency,
      shift: pick.shift,
      label: pick.label,
      confidence: pick.confidence,
      fromTrits: currentTrits,
      alternateTrits: pick.alternateTrits,
      targetNote: currentNote + pick.shift,
      alternatives: viable.slice(0, 3).map(v => ({
        shift: v.shift,
        label: v.label,
        confidence: v.confidence
      }))
    };
  }

  /**
   * Weighted random pick from alternative paths.
   */
  _pickWeighted(alternatives, currentNote) {
    // Add interval affinity weighting
    const weighted = alternatives.map(a => {
      const intervalKey = String(a.shift);
      const affinity = INTERVAL_AFFINITY[intervalKey] || 0.5;
      return {
        ...a,
        _weight: a.confidence * affinity
      };
    });

    // Sort by weight descending, pick top
    weighted.sort((a, b) => b._weight - a._weight);

    // Deterministic for now — pick highest-weighted
    // (In a later version, add randomness proportional to urgency)
    return weighted[0];
  }

  /**
   * Get the current active pivot state.
   */
  getState() {
    return {
      activePivot: this.activePivot,
      pivotCount: this.pivotCount,
      lastPivotTime: this.lastPivotTime,
      pivotHistory: this.pivotHistory.slice(-10) // Last 10 pivots
    };
  }

  /**
   * Reset the reharmonizer state.
   */
  reset() {
    this.pivotCount = 0;
    this.lastPivotTime = 0;
    this.pivotHistory = [];
    this.activePivot = null;
  }
}

export { Reharmonizer, PIVOT_TABLE, INTERVAL_AFFINITY };
export default Reharmonizer;
