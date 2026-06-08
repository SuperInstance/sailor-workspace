#!/usr/bin/env node
/**
 * Pipeline test — simulates browser sending MIDI data through the full
 * feedback loop: Ghost Track → (processNote → CR check → reharmonize)
 * → conductor (forwardToAgent → HTTP POST /agent → agent response)
 * → Ghost Track (POST /feedback → processFeedback → accumulator)
 */
const WebSocket = require('ws');
const http = require('http');

const GHOST_WS = 'ws://127.0.0.1:8767';
const CONDUCTOR = 'http://127.0.0.1:8769';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testPipeline() {
  console.log('=== Pipeline Feedback Loop Test ===\n');

  // 1. Connect to Ghost Track
  console.log('1. Connecting to Ghost Track...');
  const ws = new WebSocket(GHOST_WS);
  ws.on('error', () => {});
  
  await new Promise(r => ws.on('open', r));
  console.log('   Connected ✓');

  // 2. Wait for welcome message
  const welcome = await new Promise(r => ws.once('message', d => r(JSON.parse(d))));
  console.log(`   Session: ${welcome.sessionId}`);
  console.log(`   CR threshold: ${welcome.config.crThreshold}`);
  console.log(`   Feedback: ${welcome.config.feedbackEndpoint}\n`);

  // 3. Send MIDI notes with high CR (predictable pattern)
  console.log('2. Sending MIDI data (high CR — major thirds)...');
  for (let i = 0; i < 10; i++) {
    // Major third interval (+4 semitones from last) = trit +1, CR stays high
    ws.send(JSON.stringify({
      type: 'midi',
      note: 60 + (i * 4) % 24,  // climbs in major thirds
      velocity: 100,
      trit: 1,                    // approve (major)
      bpm: 120,
      cc: { mod: 64, breath: 80 }
    }));
  }
  await sleep(500);

  // 4. Send "surprise" note (different trit) to trigger CR drop
  console.log('3. Sending surprise note (trit flip → CR < 0.7)...');
  ws.send(JSON.stringify({
    type: 'midi',
    note: 35,       // Low note — surprise
    velocity: 80,
    trit: -1,       // reject (minor) — opposite of previous
    bpm: 120,
    cc: { mod: 100, breath: 50 }
  }));
  await sleep(200);

  // 5. Send more to sustain the pattern
  for (let i = 0; i < 5; i++) {
    ws.send(JSON.stringify({
      type: 'midi',
      note: 40 + i * 3,
      velocity: 90,
      trit: -1,
      bpm: 120,
      cc: { mod: 80, breath: 60 }
    }));
  }
  await sleep(500);

  // 6. Check reharmonization state
  console.log('4. Checking reharmonization...');
  const reharmResp = await new Promise(r => {
    http.get('http://127.0.0.1:8767/reharmonize', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r(JSON.parse(d)));
    });
  });

  if (reharmResp.length > 0) {
    const session = reharmResp[0];
    if (session.activeReharm) {
      console.log(`   ✅ Reharmonization triggered!`);
      console.log(`   Label: ${session.activeReharm.label}`);
      console.log(`   Shift: ${session.activeReharm.shift}`);
      console.log(`   Confidence: ${session.activeReharm.confidence}`);
      console.log(`   Alternate trits: [${session.activeReharm.alternateTrits}]`);
    } else {
      console.log(`   ⚠️  No active reharmonization (CR may not have dropped enough)`);
    }
    if (session.reharmonizer && session.reharmonizer.pivotCount > 0) {
      console.log(`   Pivot count: ${session.reharmonizer.pivotCount}`);
      console.log(`   Pivot history entries: ${session.reharmonizer.pivotHistory ? session.reharmonizer.pivotHistory.length : 0}`);
    }
  } else {
    console.log('   ❌ No sessions found');
  }

  // 7. Send agent feedback via HTTP
  console.log('\n5. Simulating agent feedback (conductor → Ghost Track)...');
  const feedbackPayload = JSON.stringify({
    agentId: 'chord',
    ternary_vector: [-1, 0, 0],
    source: 'fleet-conductor'
  });
  const fbResp = await new Promise(r => {
    const post = http.request('http://127.0.0.1:8767/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r(JSON.parse(d)));
    });
    post.write(feedbackPayload);
    post.end();
  });
  console.log(`   Accumulator delta: ${fbResp.accumulatorDelta}`);
  console.log(`   Closed gesture: ${fbResp.closedGesture}`);

  // 8. Check accumulator state
  console.log('\n6. Checking accumulator...');
  const accResp = await new Promise(r => {
    http.get('http://127.0.0.1:8767/accumulator', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r(JSON.parse(d)));
    });
  });
  if (accResp.length > 0) {
    const acc = accResp[0];
    console.log(`   Agent feedback count: ${acc.agentFeedbackCount}`);
    if (acc.lastFeedback) {
      console.log(`   Last feedback: ${acc.lastFeedback.agentId} → [${acc.lastFeedback.ternary_vector}]`);
    }
  }

  // 9. Close
  ws.close();
  console.log('\n=== Test Complete ===');
}

testPipeline().catch(e => console.error('Test failed:', e.message));
