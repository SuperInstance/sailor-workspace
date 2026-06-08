/**
 * constraint-tminus-bridge — Cognitive Constraint Network
 *
 * Bridges constraint-theory-core (CTC) concepts with the t-minus dispatcher.
 * Models agent state transitions as constraint satisfaction problems (CSPs),
 * where t-minus cues are variables and alignment conditions are constraints.
 *
 * Core Insight:
 *   Every cue is a constraint waiting to be satisfied.
 *   Every state transition is a variable assignment.
 *   Alignment = all constraints satisfied simultaneously.
 *
 * Modules:
 *   CognitiveConstraint  — A constraint representing a cognitive alignment condition
 *   CueVariable          — Wraps a t-minus cue as a CTC-style variable
 *   AlignmentSolver      — Solves constraint networks where variables = agent states
 *   ResonanceConstraint  — Checks if two cognitive frequencies are in resonance (ν ≈ ν*)
 *   PhaseConstraint      — Ensures agents in a phase group fire in sequential order
 *
 * Inspired by CTC's ConstraintProblem, Variable, and solver types.
 */

const CognitiveConstraint = require('./cognitive-constraint');
const CueVariable = require('./cue-variable');
const AlignmentSolver = require('./alignment-solver');
const ResonanceConstraint = require('./resonance-constraint');
const PhaseConstraint = require('./phase-constraint');

/**
 * Create a full cognitive constraint network from a phase group specification.
 *
 * @param {Object} spec - Phase group specification
 * @param {string} spec.groupName - Name of the phase group
 * @param {string[]} spec.agentIds - Agents in this group
 * @param {'seq'|'parallel'|'resonant'} spec.mode - Coordination mode
 * @param {number} [spec.targetFrequency] - Target resonance frequency (Hz)
 * @returns {{ problem, solver, variables, constraints }}
 */
function createCognitiveNetwork(spec) {
  const variables = spec.agentIds.map((id, i) =>
    new CueVariable(id, i, spec.groupName, spec.mode)
  );

  const constraints = [];

  switch (spec.mode) {
    case 'seq':
      // Sequential: each agent fires in order
      for (let i = 0; i < variables.length - 1; i++) {
        constraints.push(new PhaseConstraint(
          variables[i], variables[i + 1],
          `seq_${spec.groupName}_${i}`
        ));
      }
      break;

    case 'parallel':
      // Parallel: all agents must be at the same phase concurrently
      for (let i = 0; i < variables.length - 1; i++) {
        constraints.push(new CognitiveConstraint(
          variables[i], variables[i + 1],
          (a, b) => a.phaseValue === b.phaseValue,
          `parallel_${spec.groupName}_${i}`
        ));
      }
      break;

    case 'resonant':
      // Resonant: frequencies must closely match
      for (let i = 0; i < variables.length - 1; i++) {
        constraints.push(new ResonanceConstraint(
          variables[i], variables[i + 1],
          spec.targetFrequency || 2.0,
          `resonant_${spec.groupName}_${i}`
        ));
      }
      break;

    default:
      throw new Error(`Unknown coordination mode: ${spec.mode}`);
  }

  const solver = new AlignmentSolver(variables, constraints);

  return { problem: { variables, constraints }, solver, variables, constraints };
}

module.exports = {
  CognitiveConstraint,
  CueVariable,
  AlignmentSolver,
  ResonanceConstraint,
  PhaseConstraint,
  createCognitiveNetwork,
  VERSION: '1.0.0',
};
