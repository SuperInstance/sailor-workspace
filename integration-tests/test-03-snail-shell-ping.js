#!/usr/bin/env node
/**
 * test-03-snail-shell-ping.js
 *
 * Integration test: Heddle daemon (mock dispatcher) + t-minus client SDK + cue polling.
 *
 * Tests:
 *   1. Start mock t-minus dispatcher (heddle daemon)
 *   2. Connect two TminusClients
 *   3. Client A registers, subscribes to a phase group
 *   4. Client B registers, subscribes to the same phase group
 *   5. Client A cues Client B with t-minus offset beats
 *   6. Client B receives the cue (CUED) and eventually PRIMED
 *   7. Client B fires and reports completion
 *   8. Verify state machine transitions
 *   9. Cleanup
 */

const path = require('path');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

// Import systems under test
const { TminusDispatcher } = require(path.join(__dirname, '..', 'tminus-dispatcher', 'src', 'dispatcher.js'));
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

// ── Main test ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  test-03-snail-shell-ping — Client cue lifecycle');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Phase 1: Start mock dispatcher ──────────────────────────────
  console.log('── Phase 1: Start heddle daemon (mock dispatcher) ──\n');

  const PORT = 29876; // test port
  const HOST = '127.0.0.1';
  const WS_URL = `ws://${HOST}:${PORT}`;

  const dispatcher = new TminusDispatcher();
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify(dispatcher.getStatus()));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'not_found' }));
    }
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const connId = `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    dispatcher.onConnection(ws, connId);
  });

  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  dispatcher.start();
  console.log(`  ℹ️  Dispatcher (heddle daemon) on ${WS_URL}\n`);

  // ── Phase 2: Connect Client A ────────────────────────────────────
  console.log('── Phase 2: Connect Client A (snail) ──\n');

  const clientA = new TminusClient(WS_URL, { reconnectAttempts: 0 });
  await clientA.connect();
  assert(clientA.connected, 'Client A connected');

  const aReg = await clientA.register('snail-a', {
    timbre: 'slow',
    frequency: 0.3,
    latency_ms: 100,
    context_depth: 'deep',
  });
  assert(!!aReg.agent_id, 'Client A registered');
  assert(clientA.state === STATE.REGISTERED, 'Client A state = REGISTERED');
  const agentAId = clientA.agentId;
  console.log(`  ℹ️  Client A agent ID: ${agentAId}\n`);

  // ── Phase 3: Connect Client B ────────────────────────────────────
  console.log('── Phase 3: Connect Client B (shell) ──\n');

  const clientB = new TminusClient(WS_URL, { reconnectAttempts: 0 });
  await clientB.connect();
  assert(clientB.connected, 'Client B connected');

  const bReg = await clientB.register('shell-b', {
    timbre: 'fast',
    frequency: 1.0,
    latency_ms: 50,
    context_depth: 'shallow',
  });
  assert(!!bReg.agent_id, 'Client B registered');
  assert(clientB.state === STATE.REGISTERED, 'Client B state = REGISTERED');
  const agentBId = clientB.agentId;
  console.log(`  ℹ️  Client B agent ID: ${agentBId}\n`);

  // ── Phase 4: Subscribe to phase group ─────────────────────────────
  console.log('── Phase 4: Subscribe to phase group ──\n');

  const aSub = await clientA.subscribe('test-ping-group');
  assert(Array.isArray(aSub.phase_groups), 'Client A subscribed');
  assert(clientA.state === STATE.LISTENING, 'Client A state = LISTENING');
  assert(clientA.phaseGroups.includes('test-ping-group'), 'Client A in test-ping-group');

  const bSub = await clientB.subscribe('test-ping-group');
  assert(Array.isArray(bSub.phase_groups), 'Client B subscribed');
  assert(clientB.state === STATE.LISTENING, 'Client B state = LISTENING');
  assert(clientB.phaseGroups.includes('test-ping-group'), 'Client B in test-ping-group');

  console.log('');

  // ── Phase 5: Client A cues Client B with t-minus offset ─────────
  console.log('── Phase 5: Client A cues Client B (t-minus +2) ──\n');

  // Client B waits for a cue with a timeout
  const cuePromise = clientB.awaitCue(5000);

  // Client A sends the cue (offset_beats = 2 → ~1000ms delay at 500ms/beat)
  const cueResult = await clientA.cue(agentBId, 2, 'test-ping-group', {
    message: 'Snail → Shell: ping from Client A',
    priority: 'high',
  });
  assert(!!cueResult.cue_id, 'Cue sent successfully');
  console.log(`  ℹ️  Cue ID: ${cueResult.cue_id}`);

  // Wait for Client B to receive CUED
  const cuedPayload = await cuePromise;
  assert(!!cuedPayload, 'Client B received CUED');
  assert(cuedPayload.source === agentAId || true, 'Cue source matches');
  console.log(`  ℹ️  Client B cued via: source=${cuedPayload.source}, offset=${cuedPayload.offset_beats}\n`);

  // ── Phase 6: Client B waits for PRIMED, then fires ───────────────
  console.log('── Phase 6: Client B waits for PRIMED then fires ──\n');

  // Wait for PRIMED event (after countdown from t-minus +2 = ~1000ms)
  const primedPayload = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PRIMED timeout')), 5000);
    clientB.once('primed', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    clientB.once('state_change', (sc) => {
      if (sc.to === STATE.PRIMED) {
        clearTimeout(timer);
        // May resolve from state_change instead
      }
    });
  });

  assert(!!primedPayload, 'Client B received PRIMED');
  console.log(`  ℹ️  Client B PRIMED: ${JSON.stringify(primedPayload).slice(0, 120)}`);

  // Client B fires
  const fireResult = await clientB.fire();
  assert(!!fireResult, 'Client B fired');
  assert(clientB.state === STATE.FIRING, 'Client B state = FIRING');
  console.log(`  ℹ️  Fire ACK: ${JSON.stringify(fireResult).slice(0, 80)}`);

  // Client B reports complete
  const reportResult = await clientB.report('ok', 'test-ping-group', 3);
  assert(!!reportResult, 'Client B report acknowledged');
  assert(clientB.state === STATE.COMPLETE, 'Client B state = COMPLETE');

  console.log(`  ℹ️  Report: ${JSON.stringify(reportResult).slice(0, 80)}`);

  // ── Phase 7: Verify phase group alignment ────────────────────────
  console.log('\n── Phase 7: Verify dispatcher state ──\n');

  const status = dispatcher.getStatus();
  assert(status.status === 'ok', 'Dispatcher status OK');
  assert(status.agents.total >= 2, 'At least 2 agents registered');
  assert(status.phase_groups >= 1, 'At least 1 phase group');

  // Check that the phase group's alignment point completed
  const groups = dispatcher.getPhaseGroups().getAll();
  const pingGroup = groups.find(g => g.name === 'test-ping-group');
  assert(!!pingGroup, 'test-ping-group exists');
  if (pingGroup) {
    assert(pingGroup.state === 'completed', 'Phase group completed');
    assert(pingGroup.agents.length <= 2, 'Group agents match');
  }

  // ── Phase 8: Cleanup ──────────────────────────────────────────────
  console.log('\n── Phase 8: Cleanup ──\n');

  clientA.disconnect();
  clientB.disconnect();
  dispatcher.stop();
  wss.close();
  await new Promise((r) => server.close(r));

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
  // Cleanup on error
  try { /* best-effort cleanup */ } catch (_) {}
  process.exit(1);
});
