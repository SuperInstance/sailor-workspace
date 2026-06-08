#!/usr/bin/env node

'use strict';

/**
 * Integration Test for Composite Headspace.
 * 
 * Tests the full pipeline:
 *   1. Start the t-minus WebSocket dispatcher
 *   2. Create and connect two shell agents (bass + treble)
 *   3. Feed them a reasoning problem
 *   4. Capture the symmetry analysis
 *   5. Validate key outputs
 *   6. Clean shutdown
 * 
 * Run: node test/integration.test.js
 *      node test/integration.test.js --verbose  (extra output)
 */

const { Coordinator } = require('../src/coordinator.js');
const { ReasoningTask } = require('../src/reasoning-task.js');
const { SymmetryDetector } = require('../src/symmetry-detector.js');

const VERBOSE = process.argv.includes('--verbose');
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[36m→\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}`);
    failed++;
  }
}

function log(...args) {
  if (VERBOSE) console.log(`  ${INFO}`, ...args);
}

async function runTest() {
  console.log('\n\x1b[1m\x1b[96m  🧪 Composite Headspace Integration Test\x1b[0m');
  console.log('  \x1b[90m══════════════════════════════════════\x1b[0m\n');

  // ── Test 1: ReasoningTask ──
  console.log('\x1b[94m  📋 ReasoningTask Tests\x1b[0m');
  const task = new ReasoningTask({
    id: 'test-001',
    prompt: 'Why do distributed systems eventually become inconsistent?',
    type: 'architectural',
    difficulty: 'medium',
    expectedInsights: ['CAP theorem', 'FLP impossibility'],
  });
  assert(task.id === 'test-001', 'ReasoningTask: sets id');
  assert(task.type === 'architectural', 'ReasoningTask: sets type');
  assert(task.difficulty === 'medium', 'ReasoningTask: sets difficulty');
  assert(task.prompt.length > 0, 'ReasoningTask: has prompt');

  const validation = task.validate();
  assert(validation.valid, 'ReasoningTask: validate returns valid for good task');

  const badTask = new ReasoningTask({ prompt: 'hi', type: 'invalid', difficulty: 'extreme' });
  const badValidation = badTask.validate();
  assert(!badValidation.valid, 'ReasoningTask: validate catches bad values');
  assert(badValidation.errors.length > 0, 'ReasoningTask: returns error messages');

  const problems = ReasoningTask.sampleProblems();
  assert(problems.length >= 4, 'ReasoningTask: sampleProblems returns 4+ problems');
  assert(problems[0].type === 'architectural', 'ReasoningTask: sample 1 is architectural');
  assert(problems[1].type === 'pattern-matching', 'ReasoningTask: sample 2 is pattern-matching');
  assert(problems[2].type === 'debug-analysis', 'ReasoningTask: sample 3 is debug-analysis');
  assert(problems[3].type === 'design-decision', 'ReasoningTask: sample 4 is design-decision');

  const fromPrompt = ReasoningTask.fromPrompt('Test problem');
  assert(fromPrompt.prompt === 'Test problem', 'ReasoningTask: fromPrompt works');

  // ── Test 2: SymmetryDetector ──
  console.log('\n\x1b[94m  🔬 SymmetryDetector Tests\x1b[0m');
  const detector = new SymmetryDetector({ mode: 'deep' });

  const mockShellA = {
    content: 'FIRST_PRINCIPLES: The system must handle consistency through event sourcing. ' +
      'CAP theorem trade-offs require careful consideration of partition tolerance. ' +
      'Invariants are maintained through conflict resolution strategies.',
    shellId: 'shell-alpha',
    frequency: 'bass',
    resonance: 0.75,
  };

  const mockShellB = {
    content: 'PATTERN: This is classic accumulating entropy. The 47-minute cycle suggests ' +
      'a garbage collection or connection pool recycling pattern. Analogous to working ' +
      'memory overload in cognitive systems.',
    shellId: 'shell-beta',
    frequency: 'treble',
    resonance: 0.65,
  };

  const analysis = detector.analyze(mockShellA, mockShellB, task);
  assert(analysis.convergenceScore > 0, 'SymmetryDetector: produces convergence score');
  assert(analysis.divergencePoints.length > 0, 'SymmetryDetector: finds divergence points');
  assert(analysis.symmetryBreaks.length > 0, 'SymmetryDetector: classifies symmetry breaks');
  assert(analysis.dissonance.resonanceR > 0, 'SymmetryDetector: computes resonance metric');
  assert(analysis.syntheticInsight.insight.length > 0, 'SymmetryDetector: generates synthetic insight');
  assert(analysis.shellA.id === 'shell-alpha', 'SymmetryDetector: captures shell A id');
  assert(analysis.shellB.id === 'shell-beta', 'SymmetryDetector: captures shell B id');

  // Check symmetry break types
  const types = analysis.symmetryBreaks.map(b => b.type);
  assert(types.includes('contradiction'), 'SymmetryDetector: includes contradiction break');
  assert(types.includes('extension'), 'SymmetryDetector: includes extension break');
  assert(types.includes('nuance'), 'SymmetryDetector: includes nuance break');
  assert(types.includes('blindSpot'), 'SymmetryDetector: includes blindSpot break');

  // Report generation
  const report = detector.generateReport(mockShellA, mockShellB, task);
  assert(report.title.includes('Symmetry'), 'SymmetryDetector: report has title');
  assert(report.summary.length > 0, 'SymmetryDetector: report has summary');
  assert(report.recommendations.length > 0, 'SymmetryDetector: report has recommendations');
  assert(report.cognitiveParallax.disparity >= 0, 'SymmetryDetector: report has parallax');

  log('Sample divergence points:', analysis.divergencePoints.slice(0, 2).map(d => d.point));
  log('Convergence score:', analysis.convergenceScore);
  log('Dissonance level:', analysis.dissonance.dissonanceLevel);

  // ── Test 3: Full Integration (Coordinator + Shells) ──
  console.log('\n\x1b[94m  🚀 Integration Test (Coordinator + Shells)\x1b[0m');

  const coordinator = new Coordinator({ port: 9091, detectorMode: 'simple' });

  try {
    await coordinator.start();
    assert(true, 'Coordinator: starts t-minus dispatcher');

    const headspace = coordinator.createCompositeHeadspace();
    assert(headspace.shellA.id === 'shell-alpha', 'CompositeHeadspace: creates shell A');
    assert(headspace.shellB.id === 'shell-beta', 'CompositeHeadspace: creates shell B');
    assert(headspace.shellA.frequency === 'bass', 'CompositeHeadspace: shell A is bass');
    assert(headspace.shellB.frequency === 'treble', 'CompositeHeadspace: shell B is treble');
    assert(headspace.fusionMechanism === 'harmonic_sum', 'CompositeHeadspace: default fusion');

    // Connect shells
    await Promise.all([
      headspace.shellA.connect(),
      headspace.shellB.connect(),
    ]);
    assert(headspace.shellA.phase !== 'error', 'Shell A: connects to dispatcher');
    assert(headspace.shellB.phase !== 'error', 'Shell B: connects to dispatcher');
    log('Shell A phase:', headspace.shellA.phase);
    log('Shell B phase:', headspace.shellB.phase);

    // Run the task
    const testTask = ReasoningTask.sampleProblems()[4];
    log('Running task:', testTask.prompt.substring(0, 80));

    const result = await headspace.runTask(testTask);
    assert(result.elapsedMs > 0, 'Integration: task completes with elapsed time');
    assert(result.report !== null, 'Integration: report is generated');
    assert(result.shellA.content.length > 0, 'Integration: shell A produces a-box content');
    assert(result.shellB.content.length > 0, 'Integration: shell B produces a-box content');
    assert(result.report.analysis.convergenceScore > 0, 'Integration: convergence score computed');
    assert(result.report.analysis.dissonance.resonanceR > 0, 'Integration: resonance metric computed');

    log('Elapsed:', result.elapsedMs + 'ms');
    log('Convergence score:', result.report.analysis.convergenceScore);
    log('Resonance R:', result.report.analysis.dissonance.resonanceR);
    log('Dissonance level:', result.report.analysis.dissonance.dissonanceLevel);

    // Check waveform and mix
    const waveform = headspace.getWaveform();
    assert(waveform.length > 0, 'CompositeHeadspace: produces waveform');

    const mix = headspace.getMix();
    assert(mix.shellA.count > 0, 'CompositeHeadspace: shell A in mix');
    assert(mix.shellB.count > 0, 'CompositeHeadspace: shell B in mix');

    // Cross-illuminate
    headspace.crossIlluminate();
    assert(true, 'CompositeHeadspace: cross-illumination runs without error');

    // Get headspace state
    const state = headspace.getState();
    assert(state.shells.length === 2, 'CompositeHeadspace: getState returns both shells');
    assert(state.convergenceScore > 0, 'CompositeHeadspace: getState includes convergence score');

    // Disconnect
    headspace.disconnect();
    assert(headspace.shellA.phase === 'disconnected', 'Shell A: disconnects cleanly');
    assert(headspace.shellB.phase === 'disconnected', 'Shell B: disconnects cleanly');

    await coordinator.stop();
    assert(!coordinator.isRunning, 'Coordinator: stops cleanly');

  } catch (err) {
    assert(false, `Integration test error: ${err.message}`);
    console.error(`  ${FAIL} ${err.stack}`);
    await coordinator.stop().catch(() => {});
  }

  // ── Results ──
  const total = passed + failed;
  console.log('\n\x1b[90m  ══════════════════════════════════════\x1b[0m');
  console.log(`  \x1b[1mResults: ${passed}/${total} passed\x1b[0m`);
  if (failed > 0) {
    console.log(`  \x1b[31m${failed} test(s) failed\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`  \x1b[32mAll tests passed!\x1b[0m\n`);
    process.exit(0);
  }
}

runTest();
