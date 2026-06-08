#!/usr/bin/env node
/**
 * test-01-tminus-wire.js
 *
 * Integration test: I2I bottle transport + Fleet Bridge routing + t-minus integration.
 *
 * Tests:
 *   1. Start t-minus dispatcher on a test port
 *   2. Fleet Bridge: I2I bottle transport (init, send, beachcomb, integrity)
 *   3. Fleet Bridge: Route table resolution
 *   4. Fleet Bridge: TminusTransport connects to dispatcher
 *   5. t-minus Client: connect, register, subscribe to fleet bridge
 *   6. I2I bottle dropped into harbor with integrity verification
 *   7. Clean up all processes
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

// Import systems under test
const { TminusDispatcher } = require(path.join(__dirname, '..', 'tminus-dispatcher', 'src', 'dispatcher.js'));
const { FleetBridge } = require(path.join(__dirname, '..', 'fleet-bridge', 'src', 'fleet-bridge.js'));
const { I2IBottleTransport, BOTTLE_TYPES } = require(path.join(__dirname, '..', 'fleet-bridge', 'src', 'i2i-transport.js'));
const { TminusTransport } = require(path.join(__dirname, '..', 'fleet-bridge', 'src', 'tminus-transport.js'));
const { RouteTable } = require(path.join(__dirname, '..', 'fleet-bridge', 'src', 'route-table.js'));
const { HealthMonitor } = require(path.join(__dirname, '..', 'fleet-bridge', 'src', 'health-monitor.js'));
const { TminusClient, STATE, MSG } = require(path.join(__dirname, '..', 'tminus-client', 'src', 'client.js'));

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

// ── Helpers ──────────────────────────────────────────────────────────────

function makeTempVesselDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tminus-wire-test-'));
  fs.mkdirSync(path.join(dir, 'bottles'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'harbor'), { recursive: true });
  return dir;
}

function cleanupDir(dir) {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
}

// ── Main test ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  test-01-tminus-wire — Multi-transport Integration');
  console.log('═══════════════════════════════════════════════════\n');

  const PORT = 19876;
  const HOST = '127.0.0.1';
  const WS_URL = `ws://${HOST}:${PORT}`;
  const vesselDir = makeTempVesselDir();
  let tempDir = vesselDir;

  // ── Phase 1: Start t-minus dispatcher ──────────────────────────
  console.log('── Phase 1: Start t-minus dispatcher ──\n');

  const dispatcher = new TminusDispatcher();
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(req.url === '/health' ? 200 : 404);
    res.end(JSON.stringify(
      req.url === '/health' ? dispatcher.getStatus() : { error: 'not_found' }
    ));
  });

  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws, req) => {
    dispatcher.onConnection(ws, `conn_${Date.now().toString(36)}`);
  });

  await new Promise(r => server.listen(PORT, HOST, r));
  dispatcher.start();

  const status = dispatcher.getStatus();
  assert(status.status === 'ok', 'Dispatcher started and healthy');
  console.log(`  ℹ️  Dispatcher on ${WS_URL}\n`);

  // ── Phase 2: Fleet Bridge I2I transport ─────────────────────────
  console.log('── Phase 2: Fleet Bridge — I2I Bottle Transport ──\n');

  const i2i = new I2IBottleTransport({
    vesselDir,
    agentId: 'bridge-test',
  });
  i2i.init();

  // Test bottle sending with integrity
  const sentBottle = i2i.sendBottle('agent-receiver', 'TASK', {
    artifacts: { message: 'Hello through the I2I vessel!' },
    reasoning: ['Phase 2: verifying bottle transport'],
    blockers: [],
  });

  assert(!!sentBottle.id, 'Bottle ID generated');
  assert(sentBottle.type === 'TASK', 'Bottle type set');
  assert(sentBottle.from === 'bridge-test', 'Sender set');
  assert(sentBottle.to === 'agent-receiver', 'Receiver set');
  assert(!!sentBottle.integrity, 'Integrity hash computed');

  const { integrity: hash, ...bodyForHash } = sentBottle;
  const rehash = i2i.hashBottle(bodyForHash);
  assert(hash === rehash, 'Bottle integrity hash verifies correctly');
  console.log(`  ℹ️  Bottle integrity: ${hash.slice(0, 16)}...\n`);

  // ── Phase 3: Route Table + Health Monitor ───────────────────────
  console.log('── Phase 3: Fleet Bridge — Route Table + Health Monitor ──\n');

  const routes = new RouteTable();
  routes.loadDefaults();
  routes.register('custom-agent-1', 'i2i', { description: 'I2I custom agent' });
  routes.register('custom-agent-2', 'tminus', { description: 't-minus custom agent' });
  routes.register('custom-agent-3', 'both', { description: 'dual-transport agent' });

  const routeList = routes.list();
  assert(routeList.length >= 3, 'Route table has custom entries');
  assert(routes.resolve('custom-agent-1') === 'i2i', 'Agent-1 resolves to i2i');
  assert(routes.resolve('custom-agent-2') === 'tminus', 'Agent-2 resolves to tminus');
  assert(routes.resolve('custom-agent-3') === 'both', 'Agent-3 resolves to both');

  console.log(`  ℹ️  Route table has ${routeList.length} entries ([${routeList.map(r => r.agentId).join(', ')}])`);

  const health = new HealthMonitor({ checkInterval: 50000, heartbeatThreshold: 60000 });
  health.register('custom-agent-1', 'i2i');
  health.register('custom-agent-2', 'tminus');
  health.start();

  health.heartbeat('custom-agent-1');
  health.heartbeat('custom-agent-2');
  const alive = health.aliveNodes();
  assert(alive.length === 2, 'Health monitor tracks 2 alive nodes');
  health.stop();

  console.log('');

  // ── Phase 4: TminusTransport → dispatcher ───────────────────────
  console.log('── Phase 4: Fleet Bridge — TminusTransport connects ──\n');

  const tmTransport = new TminusTransport(WS_URL);
  const connected = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 3000);
    tmTransport.connect().then(() => {
      clearTimeout(timer);
      resolve(true);
    }).catch(() => {
      clearTimeout(timer);
      resolve(false);
    });
  });

  assert(connected === true, 'TminusTransport connected to dispatcher');
  assert(tmTransport.isConnected() === true, 'isConnected() returns true');

  // Register a cue handler
  let tmCueReceived = false;
  tmTransport.onCue(() => { tmCueReceived = true; });

  console.log(`  ℹ️  Transport connected: ${tmTransport.url}\n`);

  // ── Phase 5: TminusClient connected to same dispatcher ──────────
  console.log('── Phase 5: t-minus Client SDK integration ──\n');

  const clientA = new TminusClient(WS_URL, { reconnectAttempts: 0 });
  const clientB = new TminusClient(WS_URL, { reconnectAttempts: 0 });

  await Promise.all([clientA.connect(), clientB.connect()]);
  assert(clientA.connected, 'Client A connected');
  assert(clientB.connected, 'Client B connected');

  const regA = await clientA.register('sender-alpha', {
    timbre: 'neutral', frequency: 1.0, latency_ms: 50,
  });
  const regB = await clientB.register('receiver-beta', {
    timbre: 'neutral', frequency: 1.0, latency_ms: 50,
  });
  assert(!!regA.agent_id, 'Client A registered');
  assert(!!regB.agent_id, 'Client B registered');

  const agentAId = clientA.agentId;
  const agentBId = clientB.agentId;
  console.log(`  ℹ️  Agent A: ${agentAId}`);
  console.log(`  ℹ️  Agent B: ${agentBId}`);

  // Both subscribe to a phase group
  await Promise.all([
    clientA.subscribe('wire-test-group'),
    clientB.subscribe('wire-test-group'),
  ]);
  assert(clientA.state === STATE.LISTENING, 'Client A listening');
  assert(clientB.state === STATE.LISTENING, 'Client B listening');

  // Verify dispatcher sees them
  const agentCount = dispatcher.getRegistry().count();
  assert(agentCount >= 2, `Dispatcher has ${agentCount} agents`);

  console.log('');

  // ── Phase 6: Client A → TminusTransport → client B cue ─────────
  console.log('── Phase 6: I2I bottle beachcomb + integrity check ──\n');

  // Drop a bottle in harbor via I2I (simulating what another agent would do)
  const harborBottle = i2i.sendBottle(clientB.agentId, 'SYNTHESIS', {
    artifacts: {
      cycleComplete: true,
      message: 'Hello from I2I via Fleet Bridge routing!',
    },
    reasoning: ['Cross-transport integration test'],
    blockers: [],
  });

  // Send directly to harbor/ (where the bridge would watch)
  // Copy the bottle file to harbor/
  const bottleJson = JSON.stringify(harborBottle, null, 2);
  const harborPath = path.join(vesselDir, 'harbor', `bottle-${Date.now()}.json`);
  fs.writeFileSync(harborPath, bottleJson);
  console.log(`  📝 Bottle written to harbor: ${harborPath}`);

  // Beachcomb (the bridge's watcher does this internally)
  const bottles = i2i.beachcomb();
  assert(bottles.length >= 1, 'Bottles found in harbor via beachcomb');
  if (bottles.length > 0) {
    const found = bottles[0];
    assert(found._integrityOk === true, 'Bottle integrity verified on beachcomb');
    assert(found.from === 'bridge-test', 'Bottle sender preserved');
    assert(found.type === 'SYNTHESIS', 'Bottle type preserved');
    console.log(`  ℹ️  Beachcombed bottle: ${found.type} ${found.from} → ${found.to}`);
  }

  // Harbor should be empty now (beachcomb deletes .json files)
  const harborFiles = fs.readdirSync(path.join(vesselDir, 'harbor')).filter(f => f.endsWith('.json'));
  assert(harborFiles.length === 0, 'Bottle files cleaned from harbor after beachcomb');

  // ── Phase 7: Full Fleet Bridge lifecycle test ───────────────────
  console.log('\n── Phase 7: Fleet Bridge lifecycle ──\n');

  const bridge = new FleetBridge({
    vesselDir: makeTempVesselDir(),
    agentId: 'lifecycle-bridge',
    wsUrl: WS_URL,
    pollIntervalMs: 500,
    forwarding: true,
    heartbeatThresholdMs: 60000,
  });

  bridge.init();
  assert(bridge.agentId === 'lifecycle-bridge', 'Bridge agent ID set');
  assert(Array.isArray(bridge.routes.list()), 'Bridge has route table');

  const bStatus = bridge.status();
  assert(bStatus.running === false, 'Bridge not running initially');
  assert(bStatus.vesselDir !== undefined, 'Bridge has vessel dir');
  assert(bStatus.wsUrl === WS_URL, 'Bridge has correct WS URL');

  // Register agents
  bridge.registerAgent('test-i2i-agent', 'i2i', {});
  bridge.registerAgent('test-tminus-agent', 'tminus', {});

  // Cleanup bridge resources
  bridge.stop();
  cleanupDir(bStatus.vesselDir);

  console.log('');

  // ── Phase 8: Cleanup ─────────────────────────────────────────────
  console.log('── Phase 8: Cleanup ──\n');

  // Cleanup t-minus clients
  clientA.disconnect();
  clientB.disconnect();
  tmTransport.disconnect();

  // Stop dispatcher
  dispatcher.stop();
  wss.close();
  await new Promise(r => server.close(r));

  // Cleanup temp dirs
  cleanupDir(tempDir);

  console.log('  🧹 Cleanup complete\n');

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
  if (tempDir) cleanupDir(tempDir);
  process.exit(1);
});
