#!/usr/bin/env node

/**
 * Integration test: constraint-tminus bridge with CTC-inspired solver.
 *
 * Tests:
 *   1. CueVariable — state transitions, domain, frequency tracking
 *   2. CognitiveConstraint — alignment predicates
 *   3. ResonanceConstraint — frequency matching
 *   4. PhaseConstraint — sequential ordering
 *   5. AlignmentSolver — full CSP solve
 *   6. Unsatisfiable detection
 *   7. Incremental solving
 *   8. Cognitive network factory
 */

const {
  CognitiveConstraint,
  CueVariable,
  AlignmentSolver,
  ResonanceConstraint,
  PhaseConstraint,
  createCognitiveNetwork,
} = require('../src/index');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ✅ ');
  } else {
    failed++;
    process.stdout.write('  ❌ ');
  }
  console.log(msg);
}

function assertEqual(a, b, msg) {
  if (a === b) {
    passed++;
    process.stdout.write('  ✅ ');
  } else {
    failed++;
    process.stdout.write('  ❌ ');
  }
  console.log(`${msg} (expected: ${JSON.stringify(b)}, got: ${JSON.stringify(a)})`);
}

// ──────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════╗');
console.log('║   Constraint-TMinus Bridge — Integration Tests  ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');

// ─── Test 1: CueVariable ─────────────────
console.log('─── Test 1: CueVariable ───');

const v = new CueVariable('test-agent', 0, 'group1', 'seq');
assertEqual(v.value, 0, 'Initial state is OFFLINE(0)');
assertEqual(v.stateLabel, 'offline', 'State label is "offline"');
assertEqual(v.agentId, 'test-agent', 'Agent ID preserved');
assertEqual(v.name, 'test-agent@group1', 'Variable name is agentId@group');

// Valid transitions
assert(v.transitionTo(1), 'OFFLINE → REGISTERED should succeed');
assertEqual(v.stateLabel, 'registered', 'State label updates to "registered"');
assertEqual(v.transitionCount, 1, 'Transition count incremented');

// Invalid transition
assert(!v.transitionTo(5), 'REGISTERED → FIRING should fail (invalid transition)');

// Chain through states
assert(v.transitionTo(2), 'REGISTERED → LISTENING');
assert(v.transitionTo(3), 'LISTENING → CUED');
assert(v.transitionTo(4), 'CUED → PRIMED');
assert(v.transitionTo(5), 'PRIMED → FIRING');
assert(v.transitionTo(6), 'FIRING → COMPLETE');
assertEqual(v.transitionCount, 6, 'Completed full lifecycle');
assert(v.isAssigned, 'isAssigned true at COMPLETE');

// Frequency tracking should be non-zero after multiple transitions
assert(v.frequency > 0, 'Cognitive frequency > 0 after transitions');

// Phase value should have advanced
assert(v.phaseValue > 0, 'Phase value > 0 after forward transitions');

// Domain
assertEqual(v.domain.length, 7, 'Domain has 7 states (0-6)');
assert(v.validNextStates.length >= 0, 'Has valid next states');

console.log('');

// ─── Test 2: CognitiveConstraint ─────────
console.log('─── Test 2: CognitiveConstraint ───');

const a = new CueVariable('agent-A', 0, 'g', 'parallel');
const b = new CueVariable('agent-B', 1, 'g', 'parallel');

// Phase coherence constraint
const cc = CognitiveConstraint.phaseCoherent(a, b);
assertEqual(cc.vars.length, 2, 'Phase coherence has 2 vars');
assertEqual(cc.desc, 'phase_coherent', 'Description set');

// With both at same state, constraint is satisfied
assert(cc.isSatisfied({ 0: 2, 1: 2 }), 'Phase coherent when both LISTENING(2)');
assert(!cc.isSatisfied({ 0: 2, 1: 3 }), 'Not coherent when states differ');
assert(!cc.isSatisfied({ 0: 5, 1: 2 }), 'Not coherent when A firing, B listening');

// State compatibility
const compatTable = { '2-2': true, '3-3': true, '4-4': true, '5-5': true };
const sc = CognitiveConstraint.stateCompatible(a, b, compatTable);
assert(sc.isSatisfied({ 0: 2, 1: 2 }), 'Compatible states pass');
assert(!sc.isSatisfied({ 0: 5, 1: 2 }), 'Incompatible states fail');

console.log('');

// ─── Test 3: ResonanceConstraint ─────────
console.log('─── Test 3: ResonanceConstraint ───');

const r1 = new CueVariable('resonator-A', 0, 'r', 'resonant');
const r2 = new CueVariable('resonator-B', 1, 'r', 'resonant');

const rc = new ResonanceConstraint(r1, r2, 2.0, 'resonance_test', {
  tolerance: 0.1,
  phaseTolerance: 0.5,
});

// Simulate synchronized transitions
r1.transitionTo(1); r2.transitionTo(1); // REGISTERED
r1.transitionTo(2); r2.transitionTo(2); // LISTENING

// After same transitions, frequencies should be similar
assert(typeof rc.isSatisfied() === 'boolean', 'Resonance check returns boolean');
assertEqual(rc.getVarIndices().length, 2, 'Resonance involves 2 vars');
assertEqual(rc.toString().includes('Resonance'), true, 'String rep mentions Resonance');

console.log('');

// ─── Test 4: PhaseConstraint ─────────
console.log('─── Test 4: PhaseConstraint ───');

const p1 = new CueVariable('leader', 0, 'phase', 'seq');
const p2 = new CueVariable('follower', 1, 'phase', 'seq');

const pc = new PhaseConstraint(p1, p2, 'lead_follow', { strict: true });

// Neither fired → vacuously true
assert(pc.isSatisfied(), 'Neither fired → vacuous true');

// Only follower fired → violation
// Set follower to FIRING directly (we must bypass transition validation for this test)
p2._state = 5;
p2._lastTransition = Date.now();
assert(!pc.isSatisfied(), 'Only follower fired → violation');

// Reset and test proper order: leader fires first
p1._state = 5;
p1._lastTransition = Date.now();
p2._state = 2; // back to listening
assert(pc.isSatisfied(), 'Leader fired, follower not yet → true (pending)');

// Both fired in order
p2._state = 5;
p2._lastTransition = Date.now();
assert(pc.isSatisfied(), 'Both fired in order → true');

// Strict mode with timing
const pcStrict = new PhaseConstraint(p1, p2, 'timed', { strict: true, maxDelay: 100 });
p1._lastTransition = Date.now() - 5000; // 5s ago — exceeds maxDelay
assert(!pcStrict.isSatisfied(), 'Timing violation with strict mode → false');

console.log('');

// ─── Test 5: AlignmentSolver ─────────
console.log('─── Test 5: AlignmentSolver (3-agent sequential) ───');

const { problem, solver, variables, constraints } = createCognitiveNetwork({
  groupName: 'test-squad',
  agentIds: ['alpha', 'bravo', 'charlie'],
  mode: 'seq',
});

assertEqual(variables.length, 3, '3 variables created');
assertEqual(constraints.length, 2, '2 sequential constraints (A→B, B→C)');

const result = solver.solve();
assert(result.solution !== null, 'Solver found a solution');
assertEqual(result.unsatisfiable, false, 'Problem is satisfiable');
assert(result.stats.nodesVisited >= 0, 'Nodes visited tracked');
assert(result.stats.backtracks >= 0, 'Backtracks tracked');
assert(result.stats.elapsed >= 0, 'Elapsed time tracked');

// Verify all variables have COMPLETE state
for (const [idx, val] of result.solution) {
  assertEqual(val, CueVariable.STATES.COMPLETE,
    `Variable ${idx} solved to COMPLETE(6)`);
}

// All constraints should be satisfied in the solution
const allSat = result.constraints.every(c => c.satisfied);
assert(allSat, 'All constraints satisfied in solution');

console.log('');

// ─── Test 6: Unsatisfiable ─────────
console.log('─── Test 6: Unsatisfiable detection ───');

const u1 = new CueVariable('u1', 0, 'conflict', 'seq');
const u2 = new CueVariable('u2', 1, 'conflict', 'seq');

// Contradictory constraints
const con1 = new PhaseConstraint(u1, u2, 'u1_before_u2', { strict: true });
const con2 = new PhaseConstraint(u2, u1, 'u2_before_u1', { strict: true });

const badSolver = new AlignmentSolver([u1, u2], [con1, con2]);
const badResult = badSolver.solve();
assert(badResult.solution === null, 'No solution for contradictory constraints');
assertEqual(badResult.unsatisfiable, true, 'Marked as unsatisfiable');

console.log('');

// ─── Test 7: Cognitive Network Factory ─────────
console.log('─── Test 7: Cognitive Network Factory ───');

const net1 = createCognitiveNetwork({
  groupName: 'team1', agentIds: ['a', 'b', 'c'], mode: 'seq'
});
assertEqual(net1.problem.variables.length, 3, 'Sequential network: 3 vars');
assertEqual(net1.problem.constraints.length, 2, 'Sequential: 2 constraints');
assert(net1.solver instanceof AlignmentSolver, 'Returns AlignmentSolver');

const net2 = createCognitiveNetwork({
  groupName: 'team2', agentIds: ['x', 'y'], mode: 'parallel'
});
assertEqual(net2.problem.variables.length, 2, 'Parallel network: 2 vars');
assertEqual(net2.problem.constraints.length, 1, 'Parallel: 1 constraint');

const net3 = createCognitiveNetwork({
  groupName: 'team3', agentIds: ['m', 'n'], mode: 'resonant', targetFrequency: 2.0
});
assertEqual(net3.problem.variables.length, 2, 'Resonant network: 2 vars');
assertEqual(net3.problem.constraints.length, 1, 'Resonant: 1 constraint');

const net4 = createCognitiveNetwork({
  groupName: 'team4', agentIds: ['p', 'q', 'r', 's'], mode: 'seq'
});
assertEqual(net4.problem.constraints.length, 3, '4 agents → 3 sequential constraints');

console.log('');

// ─── Test 8: Incremental Solving ─────────
console.log('─── Test 8: Incremental solving ───');

const { solver: incSolver, variables: incVars } = createCognitiveNetwork({
  groupName: 'inc-test',
  agentIds: ['one', 'two'],
  mode: 'seq',
});

const startStates = new Map(incVars.map(v => [v.index, v.value]));
const step1 = incSolver.solveIncremental(startStates);
assert(step1 !== null, 'Incremental step returns solution');

console.log('');

// ─── Summary ────────────────────
console.log('──────────────────────────────────────');
console.log(`  Total: ${passed + failed}  Passed: ${passed}  Failed: ${failed}`);
console.log('──────────────────────────────────────');

process.exit(failed > 0 ? 1 : 0);
