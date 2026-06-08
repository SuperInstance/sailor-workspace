#!/usr/bin/env node
/**
 * test-02-composite-symphony.js
 *
 * Integration test: Composite Headspace + Symphony Runtime composition rules.
 *
 * Tests:
 *   C1: Minimum Headspace Size — at least 2 shells or 1 shell + sovereign channel
 *   C2: Frequency Separation — minimum 0.5 octaves between shell frequencies
 *   C3: Dissonance Budget — max 30% dissonant a-boxes
 *   C4: Temporal Fidelity — la-links preserve their timestamps
 *   C5: Sovereign Primacy — human override of automatic metrics
 *   C6: Track Limit — max 7±2 active tracks
 *
 *   Also: ν (nu) frequency tracking across cognitive beats
 */

const path = require('path');

// Import Symphony Runtime
const symphonyRuntime = require(path.join(__dirname, '..', 'symphony-runtime', 'src', 'index.js'));
const { CompositionRules } = symphonyRuntime;
const { BeatNormalizer, FREQUENCY_BANDS } = symphonyRuntime;

// Import Composite Headspace
const { CompositeHeadspace, Coordinator } = require(path.join(__dirname, '..', 'composite-headspace', 'src', 'coordinator.js'));
const { ShellAgent, TIMBRE_PRESETS, FREQUENCY_BANDS: CH_FREQ_BANDS } = require(path.join(__dirname, '..', 'composite-headspace', 'src', 'shell-agent.js'));
const { SymmetryDetector } = require(path.join(__dirname, '..', 'composite-headspace', 'src', 'symmetry-detector.js'));

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

function assertAlmostEqual(a, b, tolerance, label) {
  const diff = Math.abs(a - b);
  assert(diff <= tolerance, `${label} (expected ${b} ± ${tolerance}, got ${a})`);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function mockABox(resonance, state = 'resonant') {
  return {
    id: `abox-${Math.random().toString(36).slice(2, 8)}`,
    shellId: 'mock-shell',
    frequency: 'mid',
    resonance,
    timestamp: Date.now(),
    cognitiveBeat: 42,
    state,
    content: 'Mock analysis content for testing...',
  };
}

function mockLaLink(timestamp, modifiedAt) {
  return {
    id: `link-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: timestamp || Date.now(),
    modifiedAt: modifiedAt || null,
    source: 'mock',
    target: 'mock',
    type: 'analysis',
  };
}

// ── Main test ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  test-02-composite-symphony — Headspace + Rules');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Phase 1: Create Composite Headspace shells ────────────────────
  console.log('── Phase 1: Create shells with different frequency bands ──\n');

  const shellA = new ShellAgent({
    id: 'test-shell-alpha',
    timbre: TIMBRE_PRESETS['deep-architect'],
    frequency: 'bass',
    track: 1,
  });

  const shellB = new ShellAgent({
    id: 'test-shell-beta',
    timbre: TIMBRE_PRESETS['fast-pattern-matcher'],
    frequency: 'treble',
    track: 2,
  });

  assert(shellA.frequency === 'bass', 'Shell A is bass frequency');
  assert(shellB.frequency === 'treble', 'Shell B is treble frequency');
  assert(shellA.track === 1, 'Shell A on track 1');
  assert(shellB.track === 2, 'Shell B on track 2');

  // Verify frequency band separation via CH_FREQ_BANDS
  const bassBand = CH_FREQ_BANDS['bass'];
  const trebleBand = CH_FREQ_BANDS['treble'];
  assert(bassBand.latencyMs !== trebleBand.latencyMs, 'Different latency profiles');
  console.log(`  ℹ️  Bass latency: ${bassBand.latencyMs}ms, Treble latency: ${trebleBand.latencyMs}ms\n`);

  // ── Phase 2: Create Composite Headspace ───────────────────────────
  console.log('── Phase 2: Create Composite Headspace with symmetry detector ──\n');

  const headspace = new CompositeHeadspace({
    shellA,
    shellB,
    fusionMechanism: 'harmonic_sum',
    phaseDelta: 0.3,
    detector: new SymmetryDetector({ mode: 'deep' }),
  });

  assert(headspace.shellA === shellA, 'Headspace has shellA');
  assert(headspace.shellB === shellB, 'Headspace has shellB');
  assert(headspace.fusionMechanism === 'harmonic_sum', 'Fusion mechanism set');
  assert(headspace.phaseDelta === 0.3, 'Phase delta set');

  const state = headspace.getState();
  assert(state.shells.length === 2, 'State contains 2 shells');
  assert(state.fusionMechanism === 'harmonic_sum', 'State fusion mechanism');
  assert(state.isRunning === false, 'Headspace not running initially');
  console.log('');

  // ── Phase 3: Test ν frequency tracking via BeatNormalizer ────────
  console.log('── Phase 3: ν frequency tracking ──\n');

  const timbre1 = { latencyMs: 1500, contextDepth: 1.0 }; // bass-like
  const timbre2 = { latencyMs: 200, contextDepth: 1.0 };  // treble-like

  const normalizer1 = new BeatNormalizer(timbre1);
  const normalizer2 = new BeatNormalizer(timbre2);

  // Test beat duration
  const beat1 = normalizer1.beatDurationMs();
  const beat2 = normalizer2.beatDurationMs();
  assertAlmostEqual(beat1, 1500, 1, 'Bass beat = 1500ms');
  assertAlmostEqual(beat2, 200, 1, 'Treble beat = 200ms');

  // Test frequency calculation
  const nuBass = normalizer1.calculateFrequency(0.5);
  const nuTreble = normalizer2.calculateFrequency(0.5);
  console.log(`  ℹ️  ν bass = ${nuBass.toFixed(4)} Hz, ν treble = ${nuTreble.toFixed(4)} Hz`);

  // Hz calculation: rawHz = 1000/1500 = 0.666..., loadFactor = 1 - 0.5*0.9 = 0.55
  // => 0.666... * 0.55 = 0.3666...
  assert(nuBass > 0.1, `ν bass positive (${nuBass.toFixed(4)})`);
  assert(nuTreble > nuBass, `ν treble > ν bass (${nuTreble.toFixed(4)} vs ${nuBass.toFixed(4)})`);

  // Test ms ↔ beats conversion
  const ms2500 = normalizer1.msToBeats(2500);
  assertAlmostEqual(ms2500, 2500 / 1500, 0.01, 'msToBeats(2500ms) for bass');

  const beats5 = normalizer1.beatsToMs(5);
  assertAlmostEqual(beats5, 5 * 1500, 1, 'beatsToMs(5) for bass');

  // Test band classification
  const bandBass = BeatNormalizer.classifyBand(0.05);
  const bandMid = BeatNormalizer.classifyBand(0.5);
  const bandTreble = BeatNormalizer.classifyBand(5);
  assert(bandBass === 'bass', `0.05 Hz → bass (got: ${bandBass})`);
  assert(bandMid === 'mid', `0.5 Hz → mid (got: ${bandMid})`);
  assert(bandTreble === 'treble', `5 Hz → treble (got: ${bandTreble})`);

  // Test octave separation
  const octaves = BeatNormalizer.octavesApart(0.05, 5);
  assertAlmostEqual(octaves, Math.log2(5 / 0.05), 0.01, 'Octaves between bass and treble');
  console.log(`  ℹ️  Octaves apart: ${octaves.toFixed(2)}\n`);

  // ── Phase 4: Test Composition Rules (C1-C6) ──────────────────────
  console.log('── Phase 4: Composition Rules C1-C6 ──\n');

  const rules = new CompositionRules({ maxTracks: 7 });

  // C1: Minimum Headspace Size
  console.log('  C1: Minimum Headspace Size');
  const c1Valid = rules.c1_minimumHeadspaceSize({ shells: [shellA, shellB] });
  assert(c1Valid.valid === true, '2-shell headspace passes C1');

  const c1Single = rules.c1_minimumHeadspaceSize({ shells: [shellA], sovereignChannel: null });
  assert(c1Single.valid === false, 'Single shell without sovereign fails C1');

  const c1WithSov = rules.c1_minimumHeadspaceSize({ shells: [shellA], sovereignChannel: 'human' });
  assert(c1WithSov.valid === true, 'Single shell with sovereign passes C1');

  const c1Empty = rules.c1_minimumHeadspaceSize({ shells: [] });
  assert(c1Empty.valid === false, 'Empty headspace fails C1');

  // C2: Frequency Separation
  console.log('  C2: Frequency Separation');
  const c2Valid = rules.c2_frequencySeparation(0.05, 5.0);
  assert(c2Valid.valid === true, `Bass(0.05Hz) + Treble(5Hz) separated by ${c2Valid.octaves.toFixed(2)} octaves`);

  const c2Close = rules.c2_frequencySeparation(1.0, 1.2);
  assert(c2Close.valid === false, 'Close frequencies fail C2 (< 0.5 octaves)');

  // C3: Dissonance Budget
  console.log('  C3: Dissonance Budget');
  const c3Valid = rules.c3_dissonanceBudget(2, 20);
  assert(c3Valid.valid === true, '2/20 dissonant (10%) passes C3');

  const c3Critical = rules.c3_dissonanceBudget(10, 20);
  assert(c3Critical.valid === false, '10/20 dissonant (50%) fails C3');
  assert(c3Critical.critical === true, 'C3 is critical at 50%');

  const c3Edge = rules.c3_dissonanceBudget(0, 0);
  assert(c3Edge.valid === true, 'Empty a-box list passes C3');

  // C4: Temporal Fidelity
  console.log('  C4: Temporal Fidelity');
  const c4Valid = rules.c4_temporalFidelity([
    mockLaLink(Date.now() - 1000),
    mockLaLink(Date.now()),
  ]);
  assert(c4Valid.valid === true, 'Clean la-links pass C4');

  const c4Violation = rules.c4_temporalFidelity([
    mockLaLink(Date.now() - 1000, Date.now()),
  ]);
  assert(c4Violation.valid === false, 'Modified la-link fails C4');

  const c4Missing = rules.c4_temporalFidelity([
    { id: 'bad-link', modifiedAt: Date.now() },
  ]);
  assert(c4Missing.valid === false, 'Link missing timestamp fails C4');

  // C5: Sovereign Primacy
  console.log('  C5: Sovereign Primacy');
  const { ABox, ABoxManager } = symphonyRuntime;
  const aBoxMgr = new ABoxManager();
  const sovBox = aBoxMgr.create({
    content: { analysis: 'test cognitive artifact' },
    state: 'active',
    confidence: 0.8,
    cognitiveMass: 1.0,
  });

  const c5Applied = rules.c5_sovereignPrimacy(
    { aBoxId: sovBox.id, state: 'dissonant', reason: 'Human says wrong' },
    aBoxMgr
  );
  assert(c5Applied.applied === true, 'Sovereign override applied');
  assert(sovBox.state === 'dissonant', 'Box state overridden to dissonant');
  assert(sovBox.metadata.sovereignOverride === true, 'Sovereign override metadata set');

  const c5Missing = rules.c5_sovereignPrimacy(
    { aBoxId: 'nonexistent', state: 'dissonant', reason: 'test' },
    aBoxMgr
  );
  assert(c5Missing.applied === false, 'Sovereign override on missing box fails');

  // C6: Track Limit
  console.log('  C6: Track Limit');
  const c6Valid = rules.c6_trackLimit(3);
  assert(c6Valid.valid === true, '3 tracks passes C6');

  const c6Warning = rules.c6_trackLimit(8);
  assert(c6Warning.valid === true, '8 tracks gets warning but passes tolerance');

  const c6Exceeded = rules.c6_trackLimit(10);
  assert(c6Exceeded.valid === false, '10 tracks exceeds absolute limit fails C6');

  // ── Phase 5: Run all rules together ───────────────────────────────
  console.log('\n── Phase 5: Run all 6 composition rules together ──\n');

  const allResults = rules.runAll({
    headspace: { shells: [shellA, shellB], sovereignChannel: null },
    nu1: 0.05,
    nu2: 5.0,
    dissonantCount: 1,
    totalCount: 15,
    links: [mockLaLink(Date.now() - 500), mockLaLink(Date.now())],
    activeTracks: 3,
  });

  assert(allResults.valid === true, 'All 6 composition rules pass with valid state');
  assert(allResults.results.c1.valid === true, 'C1 passes in runAll');
  assert(allResults.results.c2.valid === true, 'C2 passes in runAll');
  assert(allResults.results.c3.valid === true, 'C3 passes in runAll');
  assert(allResults.results.c4.valid === true, 'C4 passes in runAll');
  assert(allResults.results.c6.valid === true, 'C6 passes in runAll');

  const violatingResults = rules.runAll({
    headspace: { shells: [shellA], sovereignChannel: null },
    nu1: 1.0,
    nu2: 1.2,
    dissonantCount: 10,
    totalCount: 20,
    links: [mockLaLink(Date.now() - 1000, Date.now())],
    activeTracks: 12,
  });

  assert(violatingResults.valid === false, 'Violating state fails');
  assert(violatingResults.violations.length >= 3, 'Multiple violations found');

  console.log(`  ℹ️  Violations found: ${violatingResults.violations.length}`);
  for (const v of violatingResults.violations) {
    console.log(`     ❌ ${v}`);
  }

  // ── Phase 6: Run a Composite Headspace task ───────────────────────
  console.log('\n── Phase 6: Run a composite headspace task ──\n');

  // Create a mock task
  const task = {
    id: 'task-001',
    prompt: 'Analyze the optimal architecture for a distributed cognitive agent system with 7 agents operating across 3 frequency bands',
    type: 'architectural-analysis',
    constraints: { maxAgents: 7, minBands: 3, topology: 'mesh' },
  };

  // Run the composite headspace task
  const result = await headspace.runTask(task);

  assert(result.report !== undefined, 'Result has symmetry report');
  assert(result.shellA !== undefined, 'Shell A produced a-box');
  assert(result.shellB !== undefined, 'Shell B produced a-box');
  assert(result.shellA.frequency === 'bass', 'Shell A a-box is bass frequency');
  assert(result.shellB.frequency === 'treble', 'Shell B a-box is treble frequency');
  assert(result.elapsedMs > 0, 'Task took measurable time');

  console.log(`  ℹ️  Task elapsed: ${result.elapsedMs}ms`);
  console.log(`  ℹ️  Shell A resonance: ${result.shellA.resonance.toFixed(3)}`);
  console.log(`  ℹ️  Shell B resonance: ${result.shellB.resonance.toFixed(3)}`);

  // Verify waveform and mix
  const waveform = headspace.getWaveform();
  assert(waveform.length >= 2, 'Waveform has entries for both shells');

  const mix = headspace.getMix();
  assert(mix.shellA.weight === 0.6, 'Shell A weight in mix');
  assert(mix.shellB.weight === 0.4, 'Shell B weight in mix');

  // ── Phase 7: Cleanup ──────────────────────────────────────────────
  console.log('\n── Phase 7: Cleanup ──\n');
  headspace.disconnect();

  // ── Report ────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
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
