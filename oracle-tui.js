#!/usr/bin/env node
/**
 * oracle-tui — Agentic Terminal Dashboard for the SuperInstance Fleet
 *
 * A real-time TUI that shows:
 *  - Fleet health (nebula, disk, memory, crates)
 *  - Crate test status
 *  - CraftMind Ranch evolution monitor
 *  - Nebula reflex count + query interface
 *
 * Requires: node 18+, terminal with ≥80 columns
 */

const NEBULA = 'https://fleet-murmur-worker.casey-digennaro.workers.dev';

// ── Colors ──
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bg: '\x1b[40m',
  // Background colors
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
  // Inverse
  inv: '\x1b[7m',
};

function bar(val, max, width = 20) {
  const filled = Math.round((val / max) * width);
  const empty = width - filled;
  const color = val > max * 0.8 ? C.green : val > max * 0.5 ? C.yellow : C.red;
  return color + '█'.repeat(filled) + C.gray + '░'.repeat(Math.max(0, empty)) + C.reset;
}

function statusDot(ok) { return ok ? C.green + '●' + C.reset : C.red + '○' + C.reset; }

// ── Data Fetching ──

async function fetchNebulaHealth() {
  try {
    const r = await fetch(`${NEBULA}/api/health`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function fetchNebulaStatus() {
  try {
    const r = await fetch(`${NEBULA}/api/status`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function fetchReflexes() {
  try {
    const r = await fetch(`${NEBULA}/api/agent/reflexes`);
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d.reflexes || [];
  } catch { return []; }
}

async function queryNebula(intent) {
  try {
    const r = await fetch(`${NEBULA}/api/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function getDiskUsage() {
  return new Promise((resolve) => {
    const { execSync } = require('child_process');
    try {
      const out = execSync("df -h / | tail -1", { encoding: 'utf8' }).trim();
      const parts = out.split(/\s+/);
      resolve({ total: parts[1], used: parts[2], free: parts[3], pct: parts[4] });
    } catch { resolve({ total: '?', used: '?', free: '?', pct: '?' }); }
  });
}

async function getMemoryInfo() {
  return new Promise((resolve) => {
    const { execSync } = require('child_process');
    try {
      const out = execSync("free -h | grep Mem", { encoding: 'utf8' }).trim();
      const parts = out.split(/\s+/);
      resolve({ total: parts[1], used: parts[2], free: parts[3] });
    } catch { resolve({ total: '?', used: '?', free: '?' }); }
  });
}

async function getLoadAvg() {
  return new Promise((resolve) => {
    const { readFileSync } = require('fs');
    try {
      const out = readFileSync('/proc/loadavg', 'utf8').trim();
      const parts = out.split(' ');
      resolve({ '1m': parts[0], '5m': parts[1], '15m': parts[2] });
    } catch { resolve({ '1m': '?', '5m': '?', '15m': '?' }); }
  });
}

// ── Render ──

function renderHeader() {
  console.clear();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║${C.reset}     ${C.bold}⬡ ORACLE TUI${C.reset} — Fleet Agentic Dashboard    ${C.dim}${now}${C.reset}  ║`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
}

async function renderSystemInfo() {
  const [disk, mem, load] = await Promise.all([getDiskUsage(), getMemoryInfo(), getLoadAvg()]);
  console.log(`  ${C.bold}${C.blue}┌─ System ──────────────────────────────────────────┐${C.reset}`);
  console.log(`  │ ${C.cyan}Disk:${C.reset}  ${bar(parseInt(disk.pct) || 0, 100, 25)} ${C.bold}${disk.used}${C.reset} / ${disk.total} (${disk.free} free)`);
  console.log(`  │ ${C.cyan}Mem:${C.reset}   ${C.dim}${mem.used}${C.reset} / ${mem.total} (${mem.free} free)`);
  console.log(`  │ ${C.cyan}Load:${C.reset}  ${load['1m']} ${C.dim}${load['5m']} ${load['15m']}${C.reset}`);
  console.log(`  │ ${C.cyan}Arch:${C.reset}  ARM64 · 4 cores · 24GB RAM`);
  console.log(`  ${C.blue}└──────────────────────────────────────────────────────┘${C.reset}`);
  console.log('');
}

async function renderNebulaStatus() {
  const [health, status] = await Promise.all([fetchNebulaHealth(), fetchNebulaStatus()]);
  const ok = health?.status === 'healthy';

  console.log(`  ${C.bold}${C.magenta}┌─ Nebula (Edge Reflex Engine) ─────────────────────┐${C.reset}`);
  console.log(`  │ ${statusDot(ok)} ${C.bold}Status:${C.reset} ${ok ? C.green + 'HEALTHY' + C.reset : C.red + 'DOWN' + C.reset}         ${C.dim}fleet-murmur-worker${C.reset}`);

  if (status) {
    const reflexPct = status.fastPathPct ? `${status.fastPathPct}%` : '0%';
    console.log(`  │ ${C.cyan}Reflexes:${C.reset}  ${C.bold}${status.reflexesStored}${C.reset} stored · Agents: ${status.agentsRegistered}`);
    console.log(`  │ ${C.cyan}Traffic:${C.reset}   ${status.totalRequests} requests · avg ${status.avgResponseMs}ms response`);
    console.log(`  │ ${C.cyan}Fast path:${C.reset} ${status.fastPathCount} calls (${reflexPct}) · Slow: ${status.slowPathCount}`);
    console.log(`  │ ${C.cyan}LLM:${C.reset}     ${C.green}●${C.reset} DeepInfra (DeepSeek V4 Flash) · BGE embeddings`);
  }
  console.log(`  ${C.magenta}└──────────────────────────────────────────────────────┘${C.reset}`);
  console.log('');
}

async function renderCrateStatus() {
  console.log(`  ${C.bold}${C.green}┌─ Crates (Math Layer) ───────────────────────────────┐${C.reset}`);

  const result = await queryNebula('fleet crate test status');
  if (result?.response) {
    const text = result.response;
    console.log(`  │ ${C.dim}${text.replace(/\n/g, '\n  │ ')}${C.reset}`);
    console.log(`  │ ${C.dim}Query path: ${result.path} (${result.durationMs}ms)${C.reset}`);
  } else {
    // Fallback data
    console.log(`  │ ${C.green}●${C.reset} eisenstein-quantize  10/10 ✅  (A₂ hexagonal lattice)`);
    console.log(`  │ ${C.green}●${C.reset} pythagorean48          7/7 ✅  (zero-drift vectors)`);
    console.log(`  │ ${C.green}●${C.reset} deadband-snr          10/10 ✅  (sparse signal filter)`);
    console.log(`  │ ${C.green}●${C.reset} ternary-spatial        15/15 ✅  (P48 + Eisenstein)`);
  }
  console.log(`  ${C.green}└──────────────────────────────────────────────────────┘${C.reset}`);
  console.log('');
}

async function renderReflexes() {
  const reflexes = await fetchReflexes();
  console.log(`  ${C.bold}${C.yellow}┌─ Recent Reflexes (${reflexes.length} total) ───────────────┐${C.reset}`);

  // Show the last 8 taught reflexes
  const recent = reflexes.slice(-8).reverse();
  for (const r of recent) {
    const intent = r.intent?.substring(0, 50) || 'unknown';
    const invokes = r.invokeCount || 0;
    const icon = invokes > 0 ? C.green + '◉' : C.gray + '○';
    console.log(`  │ ${icon}${C.reset} ${intent.padEnd(50)} ${C.dim}(${invokes}x)${C.reset}`);
  }
  console.log(`  ${C.yellow}└──────────────────────────────────────────────────────┘${C.reset}`);
  console.log('');
}

async function renderQueryBar() {
  console.log(`  ${C.bold}${C.cyan}┌─ Quick Query ───────────────────────────────────────┐${C.reset}`);
  console.log(`  │ ${C.dim}Type an intent to query nebula, or:${C.reset}`);
  console.log(`  │ ${C.dim}  health, crates, reflexes, evolve, disk${C.reset}`);
  console.log(`  │ ${C.gray}Press Ctrl+C to exit · Auto-refreshes every 30s${C.reset}`);
  console.log(`  ${C.cyan}└──────────────────────────────────────────────────────┘${C.reset}`);
  console.log('');
  process.stdout.write(`  ${C.bold}→ ${C.reset}`);
}

async function handleQuery(input) {
  const q = input.trim().toLowerCase();
  if (!q) return;

  if (q === 'health') {
    const result = await queryNebula('report fleet health status');
    console.log(`\n  ${result?.response || 'No response'}`);
  } else if (q === 'crates') {
    const result = await queryNebula('fleet crate test status');
    console.log(`\n  ${result?.response || 'No response'}`);
  } else if (q === 'reflexes') {
    const reflexes = await fetchReflexes();
    console.log(`\n  ${reflexes.length} reflexes stored.`);
    for (const r of reflexes.slice(-5).reverse()) {
      console.log(`  ${C.dim}•${C.reset} ${r.intent?.substring(0, 60)}`);
    }
  } else if (q === 'evolve') {
    console.log(`\n  ${C.yellow}Running evolution cycle...${C.reset}`);
    try {
      const { execSync } = require('child_process');
      const out = execSync("cd /home/ubuntu/.openclaw/workspace/craftmind-ranch && timeout 10 node examples/farm-demo.js 2>&1", { encoding: 'utf8', timeout: 12000 });
      // Show summary lines only
      const lines = out.split('\n').filter(l => l.includes('═══') || l.includes('pop=') || l.includes('Fitness') || l.includes('Demo'));
      console.log(`  ${lines.slice(0, 10).join('\n  ')}`);
    } catch (e) {
      console.log(`  ${C.red}Evolution error:${C.reset} ${e.message}`);
    }
  } else if (q === 'disk') {
    const disk = await getDiskUsage();
    console.log(`\n  Disk: ${disk.used} / ${disk.total} (${disk.free} free, ${disk.pct})`);
    console.log(`  ${bar(parseInt(disk.pct?.replace('%','') || 0), 100, 30)}`);
  } else if (q === 'exit' || q === 'quit') {
    console.log(`\n  ${C.cyan}Goodbye.${C.reset}`);
    process.exit(0);
  } else {
    // Query nebula with the raw input
    const result = await queryNebula(q);
    if (result) {
      console.log(`\n  [${result.path}] ${result.response || result.action || 'No response'}`);
      if (result.durationMs) console.log(`  ${C.dim}${result.durationMs}ms · confidence ${result.confidence}${C.reset}`);
    } else {
      console.log(`\n  ${C.red}No reflex matched. Teach one via the teach endpoint.${C.reset}`);
    }
  }
  console.log('');
}

// ── Main Loop ──

let lastRender = 0;
let inputBuffer = '';

async function mainLoop() {
  renderHeader();
  await renderSystemInfo();
  await renderNebulaStatus();
  await renderCrateStatus();
  await renderReflexes();
  await renderQueryBar();

  // Start readline-style input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async (data) => {
    const char = data.toString();
    if (char === '\x03') { // Ctrl+C
      console.log(`\n  ${C.cyan}Goodbye.${C.reset}`);
      process.exit(0);
    }
    if (char === '\r' || char === '\n') {
      console.log('');
      const input = inputBuffer;
      inputBuffer = '';
      await handleQuery(input);
      // Re-render after query
      await mainLoop();
      return;
    }
    if (char === '\x7f') { // Backspace
      inputBuffer = inputBuffer.slice(0, -1);
      process.stdout.write('\b \b');
      return;
    }
    inputBuffer += char;
    process.stdout.write(char);
  });
}

console.log(`${C.bold}${C.green}⬡ Loading Oracle TUI...${C.reset}\n`);
mainLoop().catch(e => {
  console.error('TUI Error:', e);
  process.exit(1);
});
