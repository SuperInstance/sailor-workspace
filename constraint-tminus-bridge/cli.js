#!/usr/bin/env node

/**
 * CLI for running constraint solvers with t-minus integration.
 *
 * Usage:
 *   node cli.js                          — solve a 3-agent sequential alignment problem
 *   node cli.js --demo                   — run all demo scenarios
 *   node cli.js --mode seq               — sequential alignment demo
 *   node cli.js --mode parallel          — parallel alignment demo
 *   node cli.js --mode resonant          — resonant alignment demo
 *   node cli.js --interactive            — step through alignment incrementally
 *   node cli.js --agents 5               — solve with 5 agents
 *   node cli.js --unsat                  — demonstrate an unsatisfiable problem
 */

const {
  CognitiveConstraint,
  CueVariable,
  AlignmentSolver,
  ResonanceConstraint,
  PhaseConstraint,
  createCognitiveNetwork,
} = require('./src/index');

function runSequentialDemo() {
  console.log('\n🔷 SEQUENTIAL ALIGNMENT DEMO');
  console.log('   Agents must fire one after another in strict order.');
  console.log('');

  const { problem, solver, variables, constraints } = createCognitiveNetwork({
    groupName: 'alpha',
    agentIds: ['agent-sensor-01', 'agent-processor-02', 'agent-actuator-03'],
    mode: 'seq',
  });

  console.log(`  Variables: ${variables.map(v => v.name).join(', ')}`);
  console.log(`  Constraints: ${constraints.map(c => c.toString()).join(', ')}`);
  console.log('');

  // Simulate state transitions
  console.log('  Simulating sequential firing...');
  const states = ['OFFLINE', 'REGISTERED', 'LISTENING', 'CUED', 'PRIMED', 'FIRING', 'COMPLETE'];

  // Advance each agent sequentially through all states
  for (let step = 0; step < 7; step++) {
    for (const v of variables) {
      // Each agent advances one step per cycle, staggered
      const nextStates = v.validNextStates;
      if (nextStates.length > 0 && v.value < CueVariable.STATES.COMPLETE) {
        // Try each valid next state and see if constraints allow it
        for (const next of nextStates) {
          const saved = v.value;
          v.transitionTo(next);
          let allOk = true;
          for (const c of constraints) {
            if (!c.isSatisfied()) { allOk = false; break; }
          }
          if (allOk) break;
          // Otherwise, revert — not supported in simple model, but let's see
        }
      }
    }
  }

  // Now solve
  const result = solver.solve();
  solver.printSummary(result);

  return result;
}

function runParallelDemo() {
  console.log('\n🔷 PARALLEL ALIGNMENT DEMO');
  console.log('   All agents must be at the same phase simultaneously.');
  console.log('');

  const { problem, solver, variables, constraints } = createCognitiveNetwork({
    groupName: 'echo',
    agentIds: ['agent-A', 'agent-B', 'agent-C'],
    mode: 'parallel',
  });

  console.log(`  Variables: ${variables.map(v => v.name).join(', ')}`);
  console.log(`  Constraints: ${constraints.map(c => c.toString()).join(', ')}`);
  console.log('');

  const result = solver.solve();
  solver.printSummary(result);

  return result;
}

function runResonantDemo() {
  console.log('\n🔷 RESONANT ALIGNMENT DEMO');
  console.log('   Agents must have matching cognitive beat frequencies (ν ≈ ν*).');
  console.log('');

  const variables = [
    new CueVariable('agent-alpha', 0, 'zeta', 'resonant'),
    new CueVariable('agent-beta', 1, 'zeta', 'resonant'),
    new CueVariable('agent-gamma', 2, 'zeta', 'resonant'),
  ];

  const constraints = [];
  const targetFreq = 2.0;

  constraints.push(new ResonanceConstraint(
    variables[0], variables[1], targetFreq, 'reso_AB', { tolerance: 0.15 }
  ));
  constraints.push(new ResonanceConstraint(
    variables[1], variables[2], targetFreq, 'reso_BC', { tolerance: 0.15 }
  ));

  const solver = new AlignmentSolver(variables, constraints);

  console.log(`  Target frequency: ${targetFreq} Hz`);
  console.log(`  Variables: ${variables.map(v => v.name).join(', ')}`);
  console.log(`  Constraints: ${constraints.map(c => c.toString()).join(', ')}`);
  console.log('');

  // Simulate frequency building through transitions
  console.log('  Simulating cognitive beat synchronization...');
  const beatSequence = [
    [AGENT_STATES.LISTENING, AGENT_STATES.LISTENING, AGENT_STATES.LISTENING],
    [AGENT_STATES.CUED, AGENT_STATES.LISTENING, AGENT_STATES.LISTENING],
    [AGENT_STATES.CUED, AGENT_STATES.CUED, AGENT_STATES.LISTENING],
    [AGENT_STATES.CUED, AGENT_STATES.CUED, AGENT_STATES.CUED],
    [AGENT_STATES.PRIMED, AGENT_STATES.CUED, AGENT_STATES.CUED],
    [AGENT_STATES.PRIMED, AGENT_STATES.PRIMED, AGENT_STATES.CUED],
    [AGENT_STATES.PRIMED, AGENT_STATES.PRIMED, AGENT_STATES.PRIMED],
    [AGENT_STATES.FIRING, AGENT_STATES.PRIMED, AGENT_STATES.PRIMED],
    [AGENT_STATES.FIRING, AGENT_STATES.FIRING, AGENT_STATES.PRIMED],
    [AGENT_STATES.FIRING, AGENT_STATES.FIRING, AGENT_STATES.FIRING],
    [AGENT_STATES.COMPLETE, AGENT_STATES.FIRING, AGENT_STATES.FIRING],
    [AGENT_STATES.COMPLETE, AGENT_STATES.COMPLETE, AGENT_STATES.FIRING],
    [AGENT_STATES.COMPLETE, AGENT_STATES.COMPLETE, AGENT_STATES.COMPLETE],
  ];

  for (const states of beatSequence) {
    // Small delay to simulate realistic timing
    variables.forEach((v, i) => {
      if (v.value !== states[i]) {
        v.transitionTo(states[i]);
      }
    });

    const metrics = constraints[0].getMetrics();
    progressBar(metrics.resonanceGap, 0.15, `ν_gap=${metrics.resonanceGap.toFixed(4)} φ_lock=${metrics.phaseLock}`);
  }

  const result = solver.solve();
  solver.printSummary(result);

  return result;
}

function runUnsatisfiableDemo() {
  console.log('\n🔷 UNSATISFIABLE DEMO');
  console.log('   Demonstrating conflict detection: contradictory constraints.');
  console.log('');

  const a = new CueVariable('agent-A', 0, 'conflict', 'seq');
  const b = new CueVariable('agent-B', 1, 'conflict', 'seq');

  // A must fire before B (sequential order)
  const c1 = new PhaseConstraint(a, b, 'A_before_B', { strict: true });

  // A must fire AFTER B (contradiction!)
  const c2 = new PhaseConstraint(b, a, 'B_before_A', { strict: true });

  const solver = new AlignmentSolver([a, b], [c1, c2]);

  console.log('  Contradictory constraints:');
  console.log(`    1. ${c1.toString()}`);
  console.log(`    2. ${c2.toString()}`);
  console.log('');

  const result = solver.solve();
  solver.printSummary(result);

  return result;
}

function runInteractiveDemo() {
  console.log('\n🔷 INTERACTIVE INCREMENTAL ALIGNMENT');
  console.log('   Stepping through alignment one transition at a time.');
  console.log('');

  const { problem, solver, variables, constraints } = createCognitiveNetwork({
    groupName: 'pulse',
    agentIds: ['sensor', 'compute', 'actuator'],
    mode: 'seq',
  });

  const stateNames = CueVariable.STATE_NAMES;
  let currentStates = new Map(variables.map(v => [v.index, v.value]));

  console.log('  Starting incremental solve...\n');

  for (let step = 0; step < 8; step++) {
    console.log(`  Step ${step}:`);
    for (const v of variables) {
      const current = currentStates.get(v.index);
      console.log(`    ${v.agentId.padEnd(12)} = ${stateNames[current]} (${current})`);
    }

    const result = solver.solveIncremental(currentStates);
    if (result) {
      currentStates = result;
      const done = variables.every(v => currentStates.get(v.index) === CueVariable.STATES.COMPLETE);
      if (done) {
        console.log('\n  ✅ All agents reached COMPLETE. Alignment solved!\n');
        break;
      }
    } else {
      console.log('\n  ⚠️  No valid next transition. Stuck.\n');
      break;
    }
    console.log('');
  }
}

function progressBar(value, threshold, label) {
  const width = 30;
  const filled = Math.min(width, Math.max(0, Math.round((1 - value / threshold) * width)));
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  console.log(`    [${bar}] ${label}`);
}

// Resolve forward reference
const AGENT_STATES = {
  OFFLINE: 0, REGISTERED: 1, LISTENING: 2,
  CUED: 3, PRIMED: 4, FIRING: 5, COMPLETE: 6
};

// ---- MAIN ----
const args = process.argv.slice(2);

if (args.includes('--demo')) {
  runSequentialDemo();
  runParallelDemo();
  runResonantDemo();
  runUnsatisfiableDemo();
} else if (args.includes('--mode')) {
  const modeIdx = args.indexOf('--mode') + 1;
  const mode = args[modeIdx] || 'seq';
  switch (mode) {
    case 'seq': runSequentialDemo(); break;
    case 'parallel': runParallelDemo(); break;
    case 'resonant': runResonantDemo(); break;
    default: console.error(`Unknown mode: ${mode}`); process.exit(1);
  }
} else if (args.includes('--unsat')) {
  runUnsatisfiableDemo();
} else if (args.includes('--interactive')) {
  runInteractiveDemo();
} else {
  // Default: sequential 3-agent
  runSequentialDemo();
}
