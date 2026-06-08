/**
 * CueVariable — Wraps a t-minus cue as a CTC-style variable.
 *
 * In CTC, a Variable has a name and a domain of possible integer values.
 * Here, CueVariable represents an agent's lifecycle position within a
 * t-minus phase group. Its domain is the set of valid agent states.
 *
 * State → Domain Mapping (inspired by t-minus AGENT_STATES):
 *   0  = OFFLINE
 *   1  = REGISTERED
 *   2  = LISTENING
 *   3  = CUED
 *   4  = PRIMED
 *   5  = FIRING
 *   6  = COMPLETE
 *
 * CueVariable supports:
 *   - State transitions as value assignments
 *   - Phase alignment tracking (phaseValue)
 *   - Cognitive frequency estimation (ν ≈ beat rate)
 *   - Constraint satisfaction checks with other variables
 */

const AGENT_STATES_MAP = Object.freeze({
  OFFLINE:    0,
  REGISTERED: 1,
  LISTENING:  2,
  CUED:       3,
  PRIMED:     4,
  FIRING:     5,
  COMPLETE:   6,
});

const STATE_NAMES = Object.freeze([
  'offline', 'registered', 'listening', 'cued', 'primed', 'firing', 'complete'
]);

/** Valid transitions modeled after t-minus VALID_TRANSITIONS */
const VALID_NEXT = Object.freeze({
  0: [1],          // OFFLINE → REGISTERED
  1: [2, 0],       // REGISTERED → LISTENING | OFFLINE
  2: [3, 4, 0],    // LISTENING → CUED | PRIMED | OFFLINE
  3: [4, 2, 0],    // CUED → PRIMED | LISTENING | OFFLINE
  4: [5, 2, 0],    // PRIMED → FIRING | LISTENING | OFFLINE
  5: [6, 2, 0],    // FIRING → COMPLETE | LISTENING | OFFLINE
  6: [2, 0],       // COMPLETE → LISTENING | OFFLINE
});

class CueVariable {
  /**
   * @param {string} agentId - Unique agent identifier
   * @param {number} index - Variable index in the constraint problem
   * @param {string} phaseGroup - Phase group this agent belongs to
   * @param {string} mode - Coordination mode ('seq' | 'parallel' | 'resonant')
   * @param {number} [initialState=0] - Initial agent state (default: OFFLINE)
   */
  constructor(agentId, index, phaseGroup, mode, initialState = 0) {
    this.agentId = agentId;
    this.index = index;
    this.phaseGroup = phaseGroup;
    this.mode = mode;
    this._state = initialState;
    this._name = `${agentId}@${phaseGroup}`;

    // Cognitive parameters
    this._frequency = 0;       // ν — cognitive beat frequency (Hz)
    this._phaseValue = 0;      // φ — current phase in the cycle
    this._lastTransition = Date.now();
    this._transitionCount = 0;
    this._history = [initialState];
  }

  /** CTC-compatible variable name */
  get name() { return this._name; }

  /** Current state / assigned value */
  get value() { return this._state; }
  set value(newVal) { this.transitionTo(newVal); }

  /** Full integer domain (all possible states) */
  get domain() {
    return Object.values(AGENT_STATES_MAP);
  }

  /** Domain size (CTC compatibility) */
  get domainSize() { return this.domain.length; }

  /** Current phase value φ ∈ [0, 2π) */
  get phaseValue() { return this._phaseValue; }

  /** Cognitive beat frequency ν in Hz */
  get frequency() { return this._frequency; }

  /** Number of transitions made */
  get transitionCount() { return this._transitionCount; }

  /** Human-readable state name */
  get stateLabel() { return STATE_NAMES[this._state] || 'unknown'; }

  /** Whether this variable is assigned to its terminal (COMPLETE) state */
  get isAssigned() { return this._state === AGENT_STATES_MAP.COMPLETE; }

  /** Get the set of valid next states (CTC-compatible neighbor domain) */
  get validNextStates() { return VALID_NEXT[this._state] || []; }

  /**
   * Transition to a new state if the transition is valid.
   * Returns true if transition succeeded, false otherwise.
   * Updates phase value and frequency on transition.
   *
   * @param {number} newState - Target state value
   * @returns {boolean} success
   */
  transitionTo(newState) {
    const allowed = VALID_NEXT[this._state];
    if (!allowed || !allowed.includes(newState)) {
      return false;
    }

    const now = Date.now();
    const elapsed = (now - this._lastTransition) / 1000; // seconds

    // Update cognitive frequency (exponential moving average)
    // Use a minimum elapsed to avoid division by zero for rapid transitions
    const effectiveElapsed = Math.max(elapsed, 0.001);
    if (this._transitionCount > 0) {
      const instantFreq = 1.0 / effectiveElapsed;
      this._frequency = this._frequency * 0.7 + instantFreq * 0.3;
    }

    // Update phase: each forward transition advances phase by π/3
    // (each state is 1/6 of a full cognitive cycle)
    if (newState > this._state) {
      this._phaseValue = (this._phaseValue + Math.PI / 3) % (2 * Math.PI);
    } else if (newState < this._state) {
      // Backward transition (reset) — phase drops
      this._phaseValue = (this._phaseValue - Math.PI / 3 + 2 * Math.PI) % (2 * Math.PI);
    }

    this._state = newState;
    this._lastTransition = now;
    this._transitionCount++;
    this._history.push(newState);
    return true;
  }

  /**
   * CTC-compatible: check if a specific domain value is consistent.
   * A value is consistent if it's a valid next state from current.
   *
   * @param {number} val - Candidate state value
   * @returns {boolean}
   */
  isConsistent(val) {
    return this.validNextStates.includes(val);
  }

  /**
   * Clone for solver backtracking (shallow state copy).
   * @returns {CueVariable}
   */
  clone() {
    const clone = new CueVariable(
      this.agentId, this.index, this.phaseGroup, this.mode, this._state
    );
    clone._frequency = this._frequency;
    clone._phaseValue = this._phaseValue;
    clone._lastTransition = this._lastTransition;
    clone._transitionCount = this._transitionCount;
    clone._history = [...this._history];
    return clone;
  }

  /**
   * String representation for debugging.
   */
  toString() {
    return `CueVar(${this._name})[${this.stateLabel}] ν=${this._frequency.toFixed(2)}Hz φ=${this._phaseValue.toFixed(3)}`;
  }

  /** CTC-style statics */
  static get STATES() { return AGENT_STATES_MAP; }
  static get STATE_NAMES() { return STATE_NAMES; }
  static get VALID_TRANSITIONS() { return VALID_NEXT; }
}

module.exports = CueVariable;
