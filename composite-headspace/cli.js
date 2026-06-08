#!/usr/bin/env node

'use strict';

/**
 * CLI runner for the Composite Headspace system.
 * 
 * Usage:
 *   node cli.js --problem 'Your reasoning problem here' [options]
 *   node cli.js --sample <index>        # Run a sample problem by index (1-5)
 *   node cli.js --list                   # List sample problems
 * 
 * Options:
 *   --port <number>      WebSocket dispatcher port (default: 9090)
 *   --detector <mode>    Detection mode: 'simple'|'deep' (default: simple)
 *   --format <format>    Output format: 'text'|'json' (default: text)
 *   --color              Force colored output
 *   --no-color           Disable colored output
 */

const { Coordinator } = require('./src/coordinator.js');
const { ReasoningTask } = require('./src/reasoning-task.js');

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

function colorize(text, color, useColor) {
  return useColor ? `${color}${text}${colors.reset}` : text;
}

function printBanner(useColor) {
  const c = colorize;
  console.log('');
  console.log(c('  ╔══════════════════════════════════════════════╗', colors.cyan, useColor));
  console.log(c('  ║        🧠 COMPOSITE HEADSPACE v0.1          ║', colors.cyan, useColor));
  console.log(c('  ║   Symphony of Shells — Cognitive DAW v0.1   ║', colors.cyan, useColor));
  console.log(c('  ╚══════════════════════════════════════════════╝', colors.cyan, useColor));
  console.log('');
}

function printDivider(char = '─', width = 60, useColor = false) {
  console.log(colorize(`  ${char.repeat(width)}`, colors.dim, useColor));
}

function printReport(report, format, useColor) {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const c = colorize;
  const analysis = report.analysis;
  const summary = report.summary || '';
  const recommendations = report.recommendations || [];

  console.log('');
  printDivider('═', 60, useColor);
  console.log(c(`  🎼 ${report.title}`, colors.bold + colors.yellow, useColor));
  printDivider('═', 60, useColor);
  console.log('');
  
  // Shell Information
  console.log(c('  🐚 Shell Profiles', colors.bold + colors.cyan, useColor));
  console.log(c(`    Shell A (α): ${analysis.shellA?.id || 'N/A'}`, colors.blue, useColor));
  console.log(c(`      Frequency: ${analysis.shellA?.frequency || 'N/A'}`, colors.dim, useColor));
  console.log(c(`      Resonance: ${(analysis.shellA?.resonance || 0).toFixed(3)}`, colors.dim, useColor));
  console.log(c(`    Shell B (β): ${analysis.shellB?.id || 'N/A'}`, colors.magenta, useColor));
  console.log(c(`      Frequency: ${analysis.shellB?.frequency || 'N/A'}`, colors.dim, useColor));
  console.log(c(`      Resonance: ${(analysis.shellB?.resonance || 0).toFixed(3)}`, colors.dim, useColor));
  console.log('');
  
  // Convergence Score
  const score = analysis.convergenceScore || 0;
  const scoreColor = score > 0.7 ? colors.green : score > 0.4 ? colors.yellow : colors.red;
  console.log(c('  📊 Convergence Analysis', colors.bold + colors.cyan, useColor));
  console.log(c(`    Convergence Score: ${(score * 100).toFixed(1)}%`, scoreColor, useColor));
  console.log(c(`    Dissonance Level: ${analysis.dissonance?.dissonanceLevel || 'unknown'}`, 
    analysis.dissonance?.dissonanceLevel === 'locked' ? colors.green :
    analysis.dissonance?.dissonanceLevel === 'productive' ? colors.yellow : colors.red, useColor));
  console.log(c(`    Resonance Metric R: ${(analysis.dissonance?.resonanceR || 0).toFixed(4)}`, colors.dim, useColor));
  console.log('');
  
  // Dissonance Detail
  console.log(c('  📝 Dissonance Assessment', colors.bold + colors.cyan, useColor));
  console.log(`    ${analysis.dissonance?.detail || 'No assessment available'}`);
  console.log('');
  
  // Divergence Points
  console.log(c('  🔬 Divergence Points', colors.bold + colors.cyan, useColor));
  if (analysis.divergencePoints && analysis.divergencePoints.length > 0) {
    for (const dp of analysis.divergencePoints) {
      const sigColor = dp.significance > 0.7 ? colors.red : dp.significance > 0.4 ? colors.yellow : colors.dim;
      console.log(c(`  ■ ${dp.point}`, colors.bold, useColor));
      console.log(c(`    α: ${dp.shellA}`, colors.blue, useColor));
      console.log(c(`    β: ${dp.shellB}`, colors.magenta, useColor));
      console.log(c(`    Type: ${dp.type} | Significance: ${(dp.significance * 100).toFixed(0)}%`, sigColor, useColor));
      console.log('');
    }
  } else {
    console.log('    No divergence points detected.');
    console.log('');
  }
  
  // Symmetry Breaks
  console.log(c('  ⚡ Symmetry Breaks', colors.bold + colors.cyan, useColor));
  if (analysis.symmetryBreaks && analysis.symmetryBreaks.length > 0) {
    for (const sb of analysis.symmetryBreaks) {
      const typeIcon = {
        contradiction: '⚔️',
        extension: '🔗',
        nuance: '🎯',
        blindSpot: '👁️',
      }[sb.type] || '•';
      console.log(`  ${typeIcon} ${c(sb.type.toUpperCase(), colors.yellow, useColor)}`);
      console.log(`    ${sb.description}`);
      console.log(c(`    💡 ${sb.insight}`, colors.italic, useColor));
      console.log('');
    }
  }
  
  // Synthetic Insight
  console.log(c('  🌟 Synthetic Insight (Fused)', colors.bold + colors.cyan, useColor));
  console.log(c(`    ${analysis.syntheticInsight?.insight || 'No synthetic insight generated.'}`, colors.italic + colors.white, useColor));
  console.log(c(`    Style: ${analysis.syntheticInsight?.type || 'N/A'}`, colors.dim, useColor));
  console.log('');
  
  // Cognitive Parallax
  const parallax = report.cognitiveParallax;
  if (parallax) {
    console.log(c('  👁️  Cognitive Parallax', colors.bold + colors.cyan, useColor));
    console.log(`    ${parallax.interpretation || 'No parallax data.'}`);
    console.log('');
  }
  
  // Recommendations
  console.log(c('  💡 Recommendations', colors.bold + colors.cyan, useColor));
  for (const rec of recommendations) {
    console.log(`    ${rec}`);
  }
  console.log('');
  
  // Timing
  const elapsed = report.analysis?.shellA && report.analysis?.shellB 
    ? `${((report.analysis.shellA?.resonance || 0) * 100).toFixed(0)}% / ${((report.analysis.shellB?.resonance || 0) * 100).toFixed(0)}%`
    : 'N/A';
  console.log(c(`  ⏱  Shell resonance split: ${elapsed}`, colors.dim, useColor));
  printDivider('═', 60, useColor);
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    problem: null,
    sample: null,
    list: false,
    port: 9090,
    detector: 'simple',
    format: 'text',
    color: process.stdout.isTTY,
  };

  // Naive arg parser (no dependency)
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--problem':
      case '-p':
        options.problem = args[++i];
        break;
      case '--sample':
      case '-s':
        options.sample = parseInt(args[++i], 10);
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
      case '--port':
        options.port = parseInt(args[++i], 10);
        break;
      case '--detector':
        options.detector = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--color':
        options.color = true;
        break;
      case '--no-color':
        options.color = false;
        break;
      case '--help':
      case '-h':
      default:
        console.log(`
  Composite Headspace CLI

  Usage:
    node cli.js --problem 'Your problem' [options]
    node cli.js --sample <n>        (1-5)
    node cli.js --list

  Options:
    --problem, -p   Reasoning problem
    --sample, -s    Sample problem index (1-5)
    --list, -l      List sample problems
    --port          WS port (default: 9090)
    --detector      Detection mode (simple|deep)
    --format        Output format (text|json)
    --color         Force color
    --no-color      Disable color
    --help, -h      This help
  
  Example:
    node cli.js -p "Why do all distributed systems eventually become inconsistent?"
`);
        process.exit(0);
    }
  }

  const useColor = options.color;

  // Show sample problems
  if (options.list) {
    const problems = ReasoningTask.sampleProblems();
    console.log(colorize('\n  📋 Sample Reasoning Problems:', colors.bold + colors.cyan, useColor));
    problems.forEach((p, i) => {
      console.log(`\n  ${colorize(`${i + 1}.`, colors.yellow, useColor)} [${p.type}] (${p.difficulty})`);
      console.log(`     ${p.prompt}`);
    });
    console.log('');
    process.exit(0);
  }

  // Determine the task
  let task;
  if (options.sample !== null) {
    const problems = ReasoningTask.sampleProblems();
    const idx = options.sample - 1;
    if (idx < 0 || idx >= problems.length) {
      console.error(colorize(`  ❌ Invalid sample index ${options.sample}. Use 1-${problems.length}.`, colors.red, useColor));
      process.exit(1);
    }
    task = problems[idx];
  } else if (options.problem) {
    task = ReasoningTask.fromPrompt(options.problem);
  } else {
    // Default: use first sample problem
    task = ReasoningTask.sampleProblems()[0];
  }

  printBanner(useColor);
  console.log(colorize(`  📋 Task: ${task.type} / ${task.difficulty}`, colors.bold, useColor));
  console.log(`  ${task.prompt}\n`);

  // Create the coordinator
  const coordinator = new Coordinator({
    port: options.port,
    detectorMode: options.detector,
  });

  try {
    // Start the t-minus dispatcher
    await coordinator.start();

    // Create the composite headspace
    const headspace = coordinator.createCompositeHeadspace();

    // Connect both shells
    await Promise.all([
      headspace.shellA.connect(),
      headspace.shellB.connect(),
    ]);
    console.log('');

    // Run the task
    const result = await headspace.runTask(task);

    // Print the report
    const report = result.report;
    printReport(report, options.format, useColor);

    // Stop the coordinator
    await coordinator.stop();

    process.exit(0);
  } catch (err) {
    console.error(colorize(`\n  ❌ Error: ${err.message}`, colors.red, useColor));
    console.error(err.stack);
    await coordinator.stop().catch(() => {});
    process.exit(1);
  }
}

main();
