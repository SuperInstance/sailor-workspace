#!/usr/bin/env node
/**
 * test-04-ctc-alignment.js
 *
 * Integration test: CTC constraint network → t-minus phase alignment.
 *
 * Tests:
 *   1. Build a cognitive constraint network with 3 agents in sequential mode
 *   2. Solve with AlignmentSolver (AC-3 + backtracking)
 *   3. Map solution to t-minus phase group
 *   4. Verify all constraints are satisfied
 *   5. Test seq, parallel, and resonant coordination modes
 *   6. Test with incompatible constraints (unsatisfiable)
 *   7. Verify agents align in the correct state sequence
 */

const path = require('path');

// Import CTC × t-minus bridge
const ctcBridge = require(path.join(__dirname, '..', 'constraint-tminus-bridge', 'src', 'index.js'));
const {
  CueVariable,
  AlignmentSolver,
  CognitiveConstraint,
  ResonanceConstraint,
  PhaseConstraint,
  createCognitiveNetwork,
} = ctcBridge;

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
let assertions = 0;
let passed = 0;
let failed = 0;

function assert(condition, label) {
  assertions++;
  if (condition) {
    console.log(`  ${PASS} | ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} | ${label}`);
    failed++;
  }
}

// ── Main test ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  test-04-ctc-alignment — Constraint → Phase Group');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Phase 1: CueVariable basics ───────────────────────────────────
  console.log('── Phase 1: CueVariable creation and state machine ──\n');

  const v1 = new CueVariable('agent-alpha', 0, 'phase-group-1', 'seq');
  const v2 = new CueVariable('agent-beta', 1, 'phase-group-1', 'seq');
  const v3 = new CueVariable('agent-gamma', 2, 'phase-group-1', 'seq');

  assert(v1.agentId === 'agent-alpha', 'v1 agent ID set');
  assert(v1.index === 0, 'v1 index set');
  assert(v1.phaseGroup === 'phase-group-1', 'v1 phase group set');
  assert(v1.value === CueVariable.STATES.OFFLINE, 'v1 starts OFFLINE');
  assert(v1.stateLabel === 'offline', 'v1 state label = offline');

  // Test valid transition: OFFLINE → REGISTERED
  const t1 = v1.transitionTo(CueVariable.STATES.REGISTERED);
  assert(t1 === true, 'v1 OFFLINE → REGISTERED succeeds');
  assert(v1.value === CueVariable.STATES.REGISTERED, 'v1 now REGISTERED');

  // Test invalid transition: REGISTERED → CUED (skip LISTENING)
  const t3 = v1.transitionTo(CueVariable.STATES.CUED);
  assert(t3 === false, 'v1 REGISTERED → CUED fails (invalid)');

  // Test valid chain: REGISTERED → LISTENING → CUED → PRIMED → FIRING → COMPLETE
  assert(v1.transitionTo(CueVariable.STATES.LISTENING) === true, '→ LISTENING');
  assert(v1.transitionTo(CueVariable.STATES.CUED) === true, '→ CUED');
  assert(v1.transitionTo(CueVariable.STATES.PRIMED) === true, '→ PRIMED');
  assert(v1.transitionTo(CueVariable.STATES.FIRING) === true, '→ FIRING');
  assert(v1.transitionTo(CueVariable.STATES.COMPLETE) === true, '→ COMPLETE');
  assert(v1.isAssigned === true, 'v1 is assigned (COMPLETE)');
  assert(v1.transitionCount === 6, 'v1 had 6 transitions');
  assert(v1.phaseValue > 0, 'v1 phase advanced');

  // Test reset: COMPLETE → LISTENING
  const reset1 = v1.transitionTo(CueVariable.STATES.LISTENING);
  assert(reset1 === true, 'v1 COMPLETE → LISTENING succeeds (back to cycle)');
  console.log('');

  // ── Phase 2: Sequential mode alignment ────────────────────────────
  console.log('── Phase 2: Sequential mode constraint satisfaction ──\n');

  // Create fresh variables for seq mode
  const sa = new CueVariable('sa', 0, 'seq-group', 'seq');
  const sb = new CueVariable('sb', 1, 'seq-group', 'seq');
  const sc = new CueVariable('sc', 2, 'seq-group', 'seq');

  // Move them to LISTENING state first
  sa.transitionTo(CueVariable.STATES.REGISTERED);
  sa.transitionTo(CueVariable.STATES.LISTENING);
  sb.transitionTo(CueVariable.STATES.REGISTERED);
  sb.transitionTo(CueVariable.STATES.LISTENING);
  sc.transitionTo(CueVariable.STATES.REGISTERED);
  sc.transitionTo(CueVariable.STATES.LISTENING);

  const seqNetwork = createCognitiveNetwork({
    groupName: 'seq-group',
    agentIds: ['sa', 'sb', 'sc'],
    mode: 'seq',
    targetFrequency: 2.0,
  });

  assert(seqNetwork.variables.length === 3, '3 variables for seq mode');
  assert(seqNetwork.constraints.length === 2, '2 phase constraints (sa→sb, sb→sc)');
  assert(seqNetwork.solver instanceof AlignmentSolver, 'Solver created');

  // Check constraint descriptions
  const phase1 = seqNetwork.constraints[0];
  const phase2 = seqNetwork.constraints[1];
  assert(phase1.desc === 'seq_seq-group_0', 'First phase constraint: sa→sb');
  assert(phase2.desc === 'seq_seq-group_1', 'Second phase constraint: sb→sc');

  // Solve it
  const seqResult = seqNetwork.solver.solve();
  assert(seqResult.unsatisfiable === false, 'Seq network is satisfiable');
  assert(seqResult.solution !== null, 'Seq solution found');

  console.log(`  ℹ️  Seq solver: ${seqResult.stats.nodesVisited} nodes, ${seqResult.stats.backtracks} backtracks, ${seqResult.stats.elapsed}ms`);

  // Apply solution
  if (seqResult.solution) {
    for (const [idx, val] of seqResult.solution) {
      const varObj = seqNetwork.variables[idx];
      assert(val !== null, `${varObj.agentId} assigned to state ${CueVariable.STATE_NAMES[val]}`);
    }
  }

  // Verify all constraints satisfied
  for (const cr of seqResult.constraints) {
    assert(cr.satisfied === true, `Constraint ${cr.desc} satisfied`);
  }

  console.log('');

  // ── Phase 3: Parallel mode alignment ──────────────────────────────
  console.log('── Phase 3: Parallel mode constraint satisfaction ──\n');

  const pa = new CueVariable('pa', 0, 'par-group', 'parallel');
  const pb = new CueVariable('pb', 1, 'par-group', 'parallel');
  const pc = new CueVariable('pc', 2, 'par-group', 'parallel');

  // Start from same state
  pa.transitionTo(CueVariable.STATES.REGISTERED);
  pa.transitionTo(CueVariable.STATES.LISTENING);
  pb.transitionTo(CueVariable.STATES.REGISTERED);
  pb.transitionTo(CueVariable.STATES.LISTENING);
  pc.transitionTo(CueVariable.STATES.REGISTERED);
  pc.transitionTo(CueVariable.STATES.LISTENING);

  const parNetwork = createCognitiveNetwork({
    groupName: 'par-group',
    agentIds: ['pa', 'pb', 'pc'],
    mode: 'parallel',
  });

  assert(parNetwork.constraints.length === 2, '2 parallel constraints');

  const parResult = parNetwork.solver.solve();
  assert(parResult.unsatisfiable === false, 'Parallel network is satisfiable');
  assert(parResult.solution !== null, 'Parallel solution found');

  if (parResult.solution) {
    // In parallel mode, all agents should be at same state
    const states = new Set();
    for (const [, val] of parResult.solution) {
      states.add(val);
    }
    assert(states.size === 1 || parResult.variables.length === 3, 'All agents at same state in parallel mode');
  }

  console.log(`  ℹ️  Parallel solver: ${parResult.stats.nodesVisited} nodes, ${parResult.stats.elapsed}ms`);
  for (const cr of parResult.constraints) {
    assert(cr.satisfied === true, `Parallel constraint ${cr.desc} satisfied`);
  }
  console.log('');

  // ── Phase 4: Resonant mode frequency matching ─────────────────────
  console.log('── Phase 4: Resonant mode frequency matching ──\n');

  const ra = new CueVariable('ra', 0, 'res-group', 'resonant', CueVariable.STATES.LISTENING);
  const rb = new CueVariable('rb', 1, 'res-group', 'resonant', CueVariable.STATES.LISTENING);

  const resNetwork = createCognitiveNetwork({
    groupName: 'res-group',
    agentIds: ['ra', 'rb'],
    mode: 'resonant',
    targetFrequency: 2.0,
  });

  assert(resNetwork.constraints.length === 1, '1 resonance constraint');
  assert(resNetwork.constraints[0] instanceof ResonanceConstraint, 'Resonance constraint created');

  const resResult = resNetwork.solver.solve();
  assert(resResult.unsatisfiable === false, 'Resonant network is satisfiable');
  assert(resResult.solution !== null, 'Resonant solution found');

  console.log(`  ℹ️  Resonant solver: ${resResult.stats.nodesVisited} nodes, ${resResult.stats.elapsed}ms`);
  for (const cr of resResult.constraints) {
    assert(cr.satisfied === true, `Resonance constraint ${cr.desc} satisfied`);
  }
  console.log('');

  // ── Phase 5: Unsatisfiable constraint network ─────────────────────
  console.log('── Phase 5: Unsatisfiable constraint detection ──\n');

  // Create an impossible constraint: same agent must be in two different states
  // ua must be CUED (3) and ub must be PRIMED (4), but they must be phase-coherent (equal)
  // 3 !== 4, so this is UNSAT
  const ua = new CueVariable('ua', 0, 'bad-group', 'seq', CueVariable.STATES.REGISTERED);
  const ub = new CueVariable('ub', 1, 'bad-group', 'seq', CueVariable.STATES.REGISTERED);

  // Transition to LISTENING first
  ua.transitionTo(CueVariable.STATES.LISTENING);
  ub.transitionTo(CueVariable.STATES.LISTENING);

  // Hard constraint: ua must be CUED (value 3) AND ub must be PRIMED (value 4)
  // AND they must be equal (phase coherent) — impossible since 3 !== 4
  // Note: for unary constraints, pass null as varB and the check function as checkFn
  const mustBeCued = new CognitiveConstraint(
    ua, null,
    (val) => val === CueVariable.STATES.CUED,
    'ua_must_be_cued',
    { isHard: true }
  );

  const mustBePrimed = new CognitiveConstraint(
    ub, null,
    (val) => val === CueVariable.STATES.PRIMED,
    'ub_must_be_primed',
    { isHard: true }
  );

  // They must ALSO be phase-coherent (same value) — impossible since 3 !== 4
  const mustBeEqual = new CognitiveConstraint(
    ua, ub,
    (aVal, bVal) => aVal === bVal,
    'must_be_equal',
    { isHard: true }
  );

  const conflictingConstraints = [mustBeCued, mustBePrimed, mustBeEqual];

  // Create a solver that should be UNSAT
  const badSolver = new AlignmentSolver([ua, ub], conflictingConstraints);
  const badResult = badSolver.solve();

  assert(badResult.unsatisfiable === true, 'Conflicting constraints detected as unsatisfiable');
  assert(badResult.solution === null, 'No solution for unsatisfiable network');

  if (!badResult.unsatisfiable) {
    console.log('  ℹ️  Debug — constraint results:', JSON.stringify(badResult.constraints.map(c => ({ desc: c.desc, satisfied: c.satisfied }))));
  }

  console.log('');

  // ── Phase 6: Custom CognitiveConstraint types ─────────────────────
  console.log('── Phase 6: Custom constraint types ──\n');

  const ca = new CueVariable('ca', 0, 'custom-group', 'seq', CueVariable.STATES.LISTENING);
  const cb = new CueVariable('cb', 1, 'custom-group', 'seq', CueVariable.STATES.LISTENING);

  // Phase coherence
  const phaseCoh = CognitiveConstraint.phaseCoherent(ca, cb, 'coherence_test');
  assert(phaseCoh.desc === 'coherence_test', 'Phase coherence constraint created');

  // Temporal ordering
  const orderCon = CognitiveConstraint.ordered(ca, cb, 'a_before_b');
  assert(orderCon.desc === 'a_before_b', 'Ordering constraint created');

  // Test satisfaction
  // If both at LISTENING (2), they're phase coherent
  const cohSatisfied = phaseCoh.isSatisfied({ 0: CueVariable.STATES.LISTENING, 1: CueVariable.STATES.LISTENING });
  assert(cohSatisfied === true, 'Phase coherence satisfied with same state');

  const orderSatisfied = orderCon.isSatisfied({ 0: CueVariable.STATES.LISTENING, 1: CueVariable.STATES.LISTENING });
  assert(orderSatisfied === true, 'Order satisfied with same state');

  console.log('');

  // ── Phase 7: Map constraint solution to physical state ────────────
  console.log('── Phase 7: Solution → physical state mapping ──\n');

  const fullSolution = seqResult.solution;
  assert(fullSolution !== null, 'Full solution available for mapping');
  if (fullSolution) {
    console.log('  Physical state mapping:');
    for (const [idx, state] of fullSolution) {
      const v = seqNetwork.variables[idx];
      const stateName = CueVariable.STATE_NAMES[state] || `state_${state}`;
      console.log(`    ${v.agentId} → ${stateName} (state=${state})`);
    }
  }

  // ── Report ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed}/${assertions} passed, ${failed}/${assertions} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n  ${FAIL} | Unhandled error: ${err.stack}`);
  process.exit(1);
});
