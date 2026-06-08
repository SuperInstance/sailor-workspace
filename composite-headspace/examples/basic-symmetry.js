#!/usr/bin/env node

'use strict';

/**
 * Basic Example: Composite Headspace with a default reasoning problem.
 * 
 * Runs the full pipeline:
 *   1. Creates a coordinator (t-minus dispatcher on port 9090)
 *   2. Creates Shell A (deep/bass) and Shell B (fast/treble)
 *   3. Feeds them a reasoning problem about distributed systems
 *   4. Runs symmetry analysis
 *   5. Outputs formatted report
 *   6. Exits cleanly
 */

const { Coordinator } = require('../src/coordinator.js');
const { ReasoningTask } = require('../src/reasoning-task.js');

// ANSI colors for pretty output
const c = (text, color) => `\x1b[${color}m${text}\x1b[0m`;

function printHeader() {
  console.log('');
  console.log(c('  ╔══════════════════════════════════════════════════╗', 96));
  console.log(c('  ║  🧠 Composite Headspace — Example Run            ║', 96));
  console.log(c('  ║  Symphony of Shells · Cognitive DAW Prototype   ║', 96));
  console.log(c('  ╚══════════════════════════════════════════════════╝', 96));
  console.log('');
}

async function main() {
  printHeader();

  const task = ReasoningTask.sampleProblems()[4]; // "Why do distributed systems eventually become inconsistent?"
  
  console.log(c(`  📋 Task: ${c(task.type, 93)} / ${c(task.difficulty, 93)}`, 1));
  console.log(`  ${task.prompt}\n`);

  const coordinator = new Coordinator({ port: 9090, detectorMode: 'simple' });

  try {
    // 1. Start the t-minus dispatcher
    console.log(c('  🎼 Step 1: Starting T-Minus Dispatcher...', 94));
    await coordinator.start();

    // 2. Create the composite headspace (two shells)
    console.log(c('  🐚 Step 2: Creating Composite Headspace...', 94));
    const headspace = coordinator.createCompositeHeadspace();

    // 3. Connect both shells
    console.log(c('  🔗 Step 3: Connecting Shells...\n', 94));
    await Promise.all([
      headspace.shellA.connect(),
      headspace.shellB.connect(),
    ]);

    // 4. Add cross-illumination callback
    headspace.onABox = (aBox) => {
      // Could log each emission, but it's already logged by the shells
    };

    // 5. Run the task through the composite headspace
    console.log(c('  🚀 Step 4: Running Task Through Composite Headspace...\n', 94));
    const result = await headspace.runTask(task);

    // 6. Cross-illuminate
    console.log(c('  🔄 Step 5: Cross-Illuminating Shells...\n', 94));
    headspace.crossIlluminate();

    // 7. Print the report
    console.log('\n' + c('  ════════════════════════════════════════════', 90));
    console.log(c('            FINAL REPORT', 93));
    console.log(c('  ════════════════════════════════════════════\n', 90));

    const report = result.report;
    const analysis = report.analysis;

    // Summary
    console.log(c('  📊 CONVERGENCE', 96));
    console.log(c(`  Score: ${(analysis.convergenceScore * 100).toFixed(1)}%`, 
      analysis.convergenceScore > 0.7 ? 92 : 93));
    console.log(c(`  Dissonance: ${analysis.dissonance.dissonanceLevel}`, 
      analysis.dissonance.dissonanceLevel === 'locked' ? 92 : 
      analysis.dissonance.dissonanceLevel === 'productive' ? 93 : 91));
    console.log(`  Resonance R: ${analysis.dissonance.resonanceR.toFixed(4)}`);
    console.log('');

    // Divergence points
    console.log(c('  🔬 KEY DIVERGENCES', 96));
    for (const dp of analysis.divergencePoints.slice(0, 3)) {
      console.log(`  • ${dp.point}`);
    }
    console.log('');

    // Symmetry breaks
    console.log(c('  ⚡ SYMMETRY BREAKS', 96));
    for (const sb of analysis.symmetryBreaks) {
      console.log(`  • ${sb.type}: ${sb.insight.substring(0, 120)}...`);
    }
    console.log('');

    // Synthetic insight
    console.log(c('  🌟 SYNTHETIC INSIGHT', 96));
    console.log(`  ${analysis.syntheticInsight.insight}`);
    console.log('');

    // Timing & metadata
    console.log(c('  ⏱  METADATA', 90));
    console.log(`  Elapsed: ${result.elapsedMs}ms`);
    console.log(`  Shell A a-box: ${result.shellA.id}`);
    console.log(`  Shell B a-box: ${result.shellB.id}`);
    console.log(`  Fusion mechanism: ${headspace.fusionMechanism}`);
    console.log('');

    console.log(c('  ✅ Example completed successfully.\n', 92));
    
    // 8. Clean shutdown
    headspace.disconnect();
    await coordinator.stop();
    process.exit(0);
  } catch (err) {
    console.error(c(`\n  ❌ Error: ${err.message}`, 91));
    console.error(err.stack);
    await coordinator.stop().catch(() => {});
    process.exit(1);
  }
}

main();
