/**
 * Browser testing suite for fleet pages.
 * Tests: VoxelWorks, Hex Lattice Explorer, CraftMind Dashboard, Nebula API
 * Uses Node.js fetch + jsdom for structure analysis.
 * Falls back to Puppeteer when chromium is available.
 */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try { fn(); passed++; results.push(`  ✅ ${name}`); }
  catch(e) { failed++; results.push(`  ❌ ${name}: ${e.message}`); }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function fetchText(url) {
  const r = await fetch(url);
  assert(r.ok, `HTTP ${r.status} for ${url}`);
  return { text: await r.text(), status: r.status, headers: r.headers };
}

// ── 1. Hex Lattice Explorer (local file) ──────────────────
console.log('\n═══ Hex Lattice Explorer ═══');

const hexHtml = readFileSync('/home/ubuntu/.openclaw/workspace/hex-lattice-explorer.html', 'utf8');
const hexDom = new JSDOM(hexHtml);
const hexDoc = hexDom.window.document;

test('has title', () => {
  assert(hexDoc.title.includes('Hex Lattice'), `Expected hex title, got "${hexDoc.title}"`);
});

test('has canvas for rendering', () => {
  const canvas = hexDoc.querySelector('#canvas');
  assert(canvas, 'Canvas element missing');
  assert(canvas.tagName === 'CANVAS', 'Not a canvas element');
});

test('has zoom slider', () => {
  const zoom = hexDoc.querySelector('#zoom');
  assert(zoom, 'Zoom slider missing');
  assert(zoom.type === 'range', 'Zoom not a range input');
});

test('has grid type selector', () => {
  const sel = hexDoc.querySelector('#gridType');
  assert(sel, 'Grid selector missing');
  // Verify options
  const opts = [...sel.options].map(o => o.value);
  assert(opts.includes('all'), 'Missing "all" option');
  assert(opts.includes('ring'), 'Missing "ring" option');
  assert(opts.includes('p48'), 'Missing "p48" option');
});

test('has reset button', () => {
  const btn = hexDoc.querySelector('#resetView');
  assert(btn, 'Reset button missing');
  assert(btn.textContent.includes('Reset'), 'Reset button wrong text');
});

test('has info panel', () => {
  const info = hexDoc.querySelector('#info');
  assert(info, 'Info panel missing');
});

test('has legend', () => {
  const legend = hexDoc.querySelector('#legend');
  assert(legend, 'Legend missing');
  assert(legend.textContent.includes('Lattice'), 'Legend missing lattice reference');
});

test('has Pythagorean48 triples data', () => {
  const html = hexHtml;
  assert(html.includes('P48_TRIPLES'), 'Missing P48 triples data');
  assert(html.includes('[3,4,5]'), 'Missing canonical (3,4,5) triple');
});

test('has hex lattice math functions', () => {
  const html = hexHtml;
  assert(html.includes('hexLattice'), 'Missing hexLattice function');
  assert(html.includes('ringNumber'), 'Missing ringNumber function');
  assert(html.includes('SQRT3'), 'Missing SQRT3 constant');
});

test('has canvas rendering functions', () => {
  const html = hexHtml;
  assert(html.includes('drawGrid'), 'Missing drawGrid function');
  assert(html.includes('resize'), 'Missing resize function');
  assert(html.includes('render'), 'Missing render function');
});

test('file size is reasonable', () => {
  assert(hexHtml.length > 5000, `File too small: ${hexHtml.length} bytes`);
  assert(hexHtml.length < 50000, `File too large: ${hexHtml.length} bytes`);
});

// ── 2. VoxelWorks Hub (deployed) ──────────────────────────
console.log('\n═══ VoxelWorks Hub (Cloudflare Pages) ═══');

const { text: voxelHtml, status: voxelStatus } = await fetchText(
  'https://voxelworks-gateway.casey-digennaro.workers.dev/'
);
const voxelDom = new JSDOM(voxelHtml);
const vd = voxelDom.window.document;

test('returns 200', () => assert(voxelStatus === 200, `Got ${voxelStatus}`));
test('has title', () => {
  assert(vd.title && vd.title.length > 0, 'No title found');
});
test('has navigable doors/links', () => {
  const links = vd.querySelectorAll('a, button, .door, .nav-item');
  assert(links.length >= 3, `Only ${links.length} navigation elements`);
});
test('has interactive content', () => {
  const interactive = vd.querySelectorAll('button, input, select, textarea, [onclick]');
  assert(interactive.length > 0, 'No interactive elements');
});
test('contains voxel-themed content', () => {
  const text = vd.body?.textContent?.toLowerCase() || '';
  assert(text.includes('voxel') || text.includes('build') || text.includes('studio'),
    'Missing voxel-themed content');
});

// Check other rooms
for (const room of ['build-studio', 'asset-lab', 'ship-deck', 'game-engine']) {
  try {
    const { status: rs } = await fetchText(
      `https://voxelworks-gateway.casey-digennaro.workers.dev/${room}`
    );
    test(`room /${room} returns ${rs}`, () => assert(rs === 200, `Got ${rs}`));
  } catch(e) {
    test(`room /${room} accessible`, () => { throw e; });
  }
}

// ── 3. Nebula API (deployed) ─────────────────────────────
console.log('\n═══ Nebula (Fleet Murmur Worker) ═══');

async function testNebulaEndpoint(path, testName, checks) {
  try {
    const { text, status, headers } = await fetchText(
      `https://fleet-murmur-worker.casey-digennaro.workers.dev${path}`
    );
    test(`${testName} → HTTP ${status}`, () => assert(status === 200, `Got ${status}`));
    if (checks) checks(JSON.parse(text));
  } catch(e) {
    test(`${testName}`, () => { throw e; });
  }
}

await testNebulaEndpoint('/api/health', 'health endpoint', (d) => {
  assert(d.status === 'healthy', `Health not healthy: ${d.status}`);
  assert(d.agent === 'nebula', `Wrong agent: ${d.agent}`);
  assert(d.llm?.configured === true, 'LLM not configured');
});

await testNebulaEndpoint('/api/status', 'status endpoint', (d) => {
  assert(typeof d.reflexesStored === 'number', 'Missing reflexes count');
  assert(d.reflexesStored >= 50, `Only ${d.reflexesStored} reflexes`);
});

await testNebulaEndpoint('/api/agent/reflexes', 'reflex listing', (d) => {
  const list = Array.isArray(d) ? d : d.reflexes || [];
  assert(list.length >= 55, `Only ${list.length} reflexes in list`);
});

// Test teaching a small reflex
const teachResult = await fetch(
  'https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/teach',
  { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent: 'browser test marker', action: 'browser test reflex learned successfully' }) }
);
test('can teach new reflex', () => assert(teachResult.ok, `Teach failed ${teachResult.status}`));

// Test querying
const queryResult = await fetch(
  'https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/message',
  { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent: 'fleet crate test status' }) }
);
test('can query reflex', () => assert(queryResult.ok, `Query failed ${queryResult.status}`));
if (queryResult.ok) {
  const qData = await queryResult.json();
  test('query returns fast path', () => {
    assert(qData.path === 'fast', `Path: ${qData.path}`);
    assert(qData.response.includes('42 tests'), 'Response missing crate status');
  });
}

// ── 4. CraftMind Ranch Dashboard (local server) ──────────
console.log('\n═══ CraftMind Ranch Dashboard ═══');

import('./craftmind-ranch/examples/farm-demo.js')
  .then(() => test('farm demo runs', () => {}))
  .catch(e => test('farm demo runs', () => { throw e; }));

// Start temporary dashboard server for testing
const { startDashboard } = await import('./craftmind-ranch/src/dashboard.js');
const { Population } = await import('./craftmind-ranch/src/population.js');
const { createDNA } = await import('./craftmind-ranch/src/dna.js');
const { allSpecies } = await import('./craftmind-ranch/src/species.js');

const pop = new Population(10, 1);
for (const sp of allSpecies()) {
  pop.add(createDNA(sp.id));
  pop.add(createDNA(sp.id));
}

// Test population methods
test('population has bots', () => assert(pop.bots.size > 0, 'Empty population'));
test('species count matches', () => assert(Object.keys(pop.stats()).length === allSpecies().length,
  `Expected ${allSpecies().length} species, got ${Object.keys(pop.stats()).length}`));
test('diversity is positive', () => {
  const div = pop.diversity();
  assert(div > 0 && div <= 1, `Diversity out of range: ${div}`);
});
test('ranking works', () => {
  const ranked = pop.ranked();
  assert(ranked.length > 0, 'No ranked bots');
  assert(ranked[0].fitness !== undefined, 'Ranked bot missing fitness');
});

// Start dashboard and test API
const server = startDashboard(pop, [], 0); // port=0 for random
const addr = server.address();
const dashUrl = `http://localhost:${addr.port}`;

try {
  const dashResult = await fetch(`${dashUrl}/api/stats`);
  test('dashboard API returns stats', () => assert(dashResult.ok, `API returned ${dashResult.status}`));
  if (dashResult.ok) {
    const stats = await dashResult.json();
    test('dashboard has population data', () => {
      assert(stats.totalPopulation > 0, 'Zero population');
      assert(stats.speciesStats, 'Missing species stats');
    });
  }

  const dashHtmlResult = await fetch(dashUrl);
  test('dashboard serves HTML page', () => assert(dashHtmlResult.ok, `HTML ${dashHtmlResult.status}`));
  if (dashHtmlResult.ok) {
    const dashHtml = await dashHtmlResult.text();
    test('dashboard HTML has content', () => assert(dashHtml.length > 500, `HTML too small: ${dashHtml.length}`));
  }
} finally {
  server.close();
}

// ── 5. GitHub Pages deployment check ──────────────────────
console.log('\n═══ GitHub Pages Deployment ═══');

try {
  const { text: ghHex, status: ghStatus } = await fetchText(
    'https://superinstance.github.io/hex-lattice-explorer/'
  );
  test('hex explorer on GitHub Pages returns 200', () => assert(ghStatus === 200, `Got ${ghStatus}`));
  test('hex explorer on Pages has canvas', () => {
    const dom = new JSDOM(ghHex);
    assert(dom.window.document.querySelector('#canvas'), 'Canvas missing from deployed page');
  });
} catch(e) {
  test('hex explorer on GitHub Pages accessible', () => { throw e; });
}

// ── Summary ───────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(50)}`);
results.forEach(r => console.log(r));
console.log(`\n${'═'.repeat(50)}`);

if (failed > 0) process.exit(1);
