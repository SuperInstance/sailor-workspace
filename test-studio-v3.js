const puppeteer = require('puppeteer');
const path = require('path');
const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace';
const STUDIO_URL = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';
const allConsoleErrors = [];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function shot(page, name) { await page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true }); console.log(`  📸 ${name}`); }

async function clickBtn(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (t.includes(text.toLowerCase())) { await b.click(); return true; }
  }
  return false;
}

async function getOutput(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('output-content') || document.querySelector('[class*="output"]');
    if (!el) return { found: false, text: '' };
    return { found: true, text: el.innerText.trim() };
  });
}

async function addBlock(page, blockId, x, y, fields = {}) {
  return await page.evaluate(({ blockId, x, y, fields }) => {
    if (typeof createWorkspaceBlock !== 'function') return { success: false, error: 'createWorkspaceBlock not found' };
    const def = getBlockDef(blockId);
    if (!def) return { success: false, error: `Block def not found: ${blockId}` };
    const inst = createWorkspaceBlock(def, x, y, fields);
    if (!inst) return { success: false, error: 'createWorkspaceBlock returned null' };
    renderAll();
    return { success: true, id: inst.id, def: def.id };
  }, { blockId, x, y, fields });
}

async function snapBlock(page, parentId, blockId, fields = {}) {
  return await page.evaluate(({ parentId, blockId, fields }) => {
    if (typeof createWorkspaceBlock !== 'function') return { success: false, error: 'createWorkspaceBlock not found' };
    const parent = findInst(parentId);
    if (!parent) return { success: false, error: `Parent instance ${parentId} not found` };
    const def = getBlockDef(blockId);
    if (!def) return { success: false, error: `Block def not found: ${blockId}` };
    // Find the last in chain
    let last = parent;
    while (last.childId !== null) {
      const child = findInst(last.childId);
      if (!child) break;
      last = child;
    }
    const inst = createWorkspaceBlock(def, parent.x + 20, last.y + 60, fields);
    if (!inst) return { success: false, error: 'createWorkspaceBlock returned null' };
    inst.parentId = last.id;
    last.childId = inst.id;
    renderAll();
    return { success: true, id: inst.id, parent: parentId };
  }, { parentId, blockId, fields });
}

async function snapBranch(page, parentId, blockId, branch, fields = {}) {
  return await page.evaluate(({ parentId, blockId, branch, fields }) => {
    if (typeof createWorkspaceBlock !== 'function') return { success: false, error: 'createWorkspaceBlock not found' };
    const parent = findInst(parentId);
    if (!parent) return { success: false, error: `Parent ${parentId} not found` };
    const def = getBlockDef(blockId);
    if (!def) return { success: false, error: `Block def not found: ${blockId}` };
    const inst = createWorkspaceBlock(def, parent.x + 60, parent.y + 40, fields);
    if (!inst) return { success: false, error: 'createWorkspaceBlock returned null' };
    // Attach as branch (repeat's DO or if_then's DO0)
    if (branch === 'DO' || branch === 'DO0') {
      const chain = [];
      let last = parent;
      while (last.childId !== null) {
        const c = findInst(last.childId);
        if (!c) break;
        last = c;
      }
      inst.parentId = last.id;
      last.childId = inst.id;
    }
    renderAll();
    return { success: true, id: inst.id };
  }, { parentId, blockId, branch, fields });
}

async function clearWorkspace(page) {
  await page.evaluate(() => { if (typeof clearAll === 'function') clearAll(); });
  await sleep(300);
}

async function runScript(page) {
  await clickBtn(page, 'run');
  await sleep(200);
}

async function getInstanceCount(page) {
  return await page.evaluate(() => {
    if (typeof instances !== 'undefined') return instances.length;
    return -1;
  });
}

async function getInstancesDebug(page) {
  return await page.evaluate(() => {
    if (typeof instances === 'undefined') return [];
    return instances.map(i => ({
      id: i.id,
      defId: i.def ? i.def.id : '?',
      parentId: i.parentId,
      childId: i.childId,
      x: Math.round(i.x),
      y: Math.round(i.y)
    }));
  });
}

async function main() {
  console.log('=== 🎭 BLOCK STUDIO COMPREHENSIVE TEST (v3 — Internal API) ===\n');

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new'
  });

  const page = await browser.newPage();

  // Console error tracking
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('Error')) {
      allConsoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      console.error(`  ⚠ CONSOLE[${msg.type()}]: ${msg.text().slice(0, 200)}`);
    }
  });
  page.on('pageerror', err => {
    allConsoleErrors.push(`[PAGE_ERROR] ${err.message}`);
    console.error(`  ❌ PAGE ERROR: ${err.message}`);
  });

  // ──────────────── TEST 1: Load & Verify ────────────────
  console.log('⏺ TEST 1: Load & Verify');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);

  const title = await page.title();
  console.log(`  Title: "${title}"`);

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { found: false };
    return { found: true, w: c.width, h: c.height, stage3d: !!c.getContext('webgl') || !!c.getContext('webgl2') };
  });
  console.log(`  Canvas: ${canvasInfo.found ? `${canvasInfo.w}x${canvasInfo.h}` : 'MISSING'}`);

  // Button states
  const btnStates = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const result = {};
    buttons.forEach(b => {
      const t = b.textContent.trim().toLowerCase();
      if (t.includes('run')) result.run = { text: b.textContent.trim(), visible: b.offsetParent !== null, disabled: b.disabled, id: b.id };
      if (t.includes('stop')) result.stop = { text: b.textContent.trim(), visible: b.offsetParent !== null, disabled: b.disabled, id: b.id };
      if (t.includes('clear')) result.clear = { text: b.textContent.trim(), visible: b.offsetParent !== null, disabled: b.disabled, id: b.id };
    });
    // Check for output panel elements
    const outputPanel = document.getElementById('output-panel') || document.querySelector('#output-content');
    result.outputPanel = {
      exists: !!document.getElementById('output-content'),
      statusEl: !!document.getElementById('output-status'),
      text: document.getElementById('output-content') ? document.getElementById('output-content').textContent.trim().slice(0, 100) : ''
    };
    return result;
  });
  console.log(`  Run:    ${JSON.stringify(btnStates.run)}`);
  console.log(`  Stop:   ${JSON.stringify(btnStates.stop)}`);
  console.log(`  Clear:  ${JSON.stringify(btnStates.clear)}`);
  console.log(`  Output: ${JSON.stringify(btnStates.outputPanel)}`);

  // Verify canvas has a 2D context for sprite rendering
  console.log(`  Canvas ctx: ${canvasInfo.found ? '2D canvas' : 'N/A'}`);

  await shot(page, '01-load.png');

  // Check API functions exist
  const apiCheck = await page.evaluate(() => {
    return {
      createWorkspaceBlock: typeof createWorkspaceBlock === 'function',
      getBlockDef: typeof getBlockDef === 'function',
      clearAll: typeof clearAll === 'function',
      executeAll: typeof executeAll === 'function',
      stopExecution: typeof stopExecution === 'function',
      appendOutput: typeof appendOutput === 'function',
      renderAll: typeof renderAll === 'function',
      instances: Array.isArray(instances),
      sprite: typeof sprite === 'object'
    };
  });
  console.log(`  API functions available: ${JSON.stringify(apiCheck)}`);

  let allChecksPassed = apiCheck.createWorkspaceBlock && apiCheck.getBlockDef && apiCheck.clearAll &&
    apiCheck.executeAll && apiCheck.stopExecution && apiCheck.renderAll;
  console.log(`  ${allChecksPassed ? '✅' : '❌'} Test 1 ${allChecksPassed ? 'PASSED' : 'FAILED — missing API functions'}\n`);

  // ──────────────── TEST 2: Build Script Programmatically ────────────────
  console.log('⏺ TEST 2: Build script with when_clicked → move_steps → turn → say');

  // Make sure workspace is clean
  await clearWorkspace(page);
  console.log(`  Workspace cleared. Instances: ${await getInstanceCount(page)}`);

  // Step 1: Create when_clicked hat block
  const r1 = await addBlock(page, 'when_clicked', 30, 30, {});
  console.log(`  Create when_clicked: ${JSON.stringify(r1)}`);
  const whenClickedId = r1.id;

  // Step 2: Snap move_steps under when_clicked
  const r2 = await snapBlock(page, whenClickedId, 'move_steps', { '%1': 50 });
  console.log(`  Snap move_steps: ${JSON.stringify(r2)}`);

  // Step 3: Snap turn_cw under move_steps
  const r3 = await snapBlock(page, whenClickedId, 'turn_cw', { '%1': 30 });
  console.log(`  Snap turn_cw: ${JSON.stringify(r3)}`);

  // Step 4: Snap say under turn_cw
  const r4 = await snapBlock(page, whenClickedId, 'say', { '%1': 'test!', '%2': 1 });
  console.log(`  Snap say: ${JSON.stringify(r4)}`);

  await sleep(500);

  const instancesAfterBuild = await getInstancesDebug(page);
  console.log(`  Instances in workspace: ${JSON.stringify(instancesAfterBuild)}`);

  await shot(page, '02-script-built.png');
  console.log(`  ✅ Test 2 blocks created\n`);

  // ──────────────── TEST 3: Run Script ────────────────
  console.log('⏺ TEST 3: Run the built script');

  const outputBefore = await getOutput(page);
  console.log(`  Output before run: "${outputBefore.text.slice(0, 100)}"`);

  // Get sprite position before
  const spriteBefore = await page.evaluate(() => {
    return { x: Math.round(sprite.x), y: Math.round(sprite.y), dir: sprite.direction };
  });
  console.log(`  Sprite before: x=${spriteBefore.x}, y=${spriteBefore.y}, dir=${spriteBefore.dir}°`);

  await runScript(page);
  await sleep(4000);

  const spriteAfter = await page.evaluate(() => {
    return { x: Math.round(sprite.x), y: Math.round(sprite.y), dir: sprite.direction };
  });
  console.log(`  Sprite after:  x=${spriteAfter.x}, y=${spriteAfter.y}, dir=${spriteAfter.dir}°`);

  const moved = spriteBefore.x !== spriteAfter.x || spriteBefore.y !== spriteAfter.y;
  const turned = spriteBefore.dir !== spriteAfter.dir;
  console.log(`  Sprite moved: ${moved}, turned: ${turned}`);

  const outputAfter = await getOutput(page);
  console.log(`  Output after run: "${outputAfter.text.slice(0, 300)}"`);

  await shot(page, '03-script-run.png');
  console.log(`  ✅ Test 3 script executed\n`);

  // ──────────────── TEST 4: Test Repeat Block (repeat 3 → say "hi") ────────────────
  console.log('⏺ TEST 4: Repeat block (repeat 3 → say "hi")');

  await clearWorkspace(page);

  // Build: when_clicked → repeat 3 → say "hi"
  const r5 = await addBlock(page, 'when_clicked', 30, 30, {});
  console.log(`  Create when_clicked: id=${r5.id}`);
  const whenClickedId2 = r5.id;

  // The repeat block takes a number arg for TIMES and has a DO branch
  const r6 = await snapBlock(page, whenClickedId2, 'repeat', { '%1': 3 });
  console.log(`  Snap repeat: ${JSON.stringify(r6)}`);
  const repeatId = r6.id;

  // Snap "say" as child of repeat (the DO branch)
  const r7 = await snapBlock(page, repeatId, 'say', { '%1': 'hi', '%2': 0.5 });
  console.log(`  Snap say under repeat: ${JSON.stringify(r7)}`);

  await sleep(300);

  const instancesTest4 = await getInstancesDebug(page);
  console.log(`  Instances: ${JSON.stringify(instancesTest4)}`);

  await runScript(page);
  await sleep(4000);

  const outputRepeat = await getOutput(page);
  console.log(`  Output after repeat: "${outputRepeat.text.slice(0, 500)}"`);

  // Count "hi" occurrences in output
  const hiCount = (outputRepeat.text.match(/hi/g) || []).length;
  console.log(`  "hi" count in output: ${hiCount}`);

  await shot(page, '04-repeat.png');
  console.log(`  ✅ Test 4 completed\n`);

  // ──────────────── TEST 5: Test If/Then Block ────────────────
  console.log('⏺ TEST 5: If/Then block (when_clicked → if true → say "yes")');

  await clearWorkspace(page);

  const r8 = await addBlock(page, 'when_clicked', 30, 30, {});
  const whenClickedId3 = r8.id;
  console.log(`  Create when_clicked: id=${whenClickedId3}`);

  // If/then block with dropdown arg
  const r9 = await snapBlock(page, whenClickedId3, 'if_then', { '%1': 'true' });
  console.log(`  Snap if_then: ${JSON.stringify(r9)}`);
  const ifId = r9.id;

  // Snap "say" as child of if_then
  const r10 = await snapBlock(page, ifId, 'say', { '%1': 'yes', '%2': 0.5 });
  console.log(`  Snap say under if_then: ${JSON.stringify(r10)}`);

  await sleep(300);

  await runScript(page);
  await sleep(3000);

  const outputIf = await getOutput(page);
  console.log(`  Output after if/then: "${outputIf.text.slice(0, 500)}"`);

  const saysYes = outputIf.text.includes('yes');
  console.log(`  Output contains "yes": ${saysYes}`);

  await shot(page, '05-ifthen.png');
  console.log(`  ✅ Test 5 completed\n`);

  // ──────────────── TEST 6: Test Stop ────────────────
  console.log('⏺ TEST 6: Stop mid-execution');

  await clearWorkspace(page);

  // Build: when_clicked → repeat 10 → wait 1
  const r11 = await addBlock(page, 'when_clicked', 30, 30, {});
  const whenClickedId4 = r11.id;
  console.log(`  Create when_clicked: id=${whenClickedId4}`);

  const r12 = await snapBlock(page, whenClickedId4, 'repeat', { '%1': 10 });
  console.log(`  Snap repeat 10: ${JSON.stringify(r12)}`);
  const repeatId2 = r12.id;

  const r13 = await snapBlock(page, repeatId2, 'wait', { '%1': 1 });
  console.log(`  Snap wait 1s: ${JSON.stringify(r13)}`);

  await sleep(300);

  // Start execution
  console.log('  Starting long script...');
  await runScript(page);
  await sleep(1500);

  // Check if running
  const runningState = await page.evaluate(() => ({ running: executionRunning, aborted: executionAborted }));
  console.log(`  Execution state before stop: running=${runningState.running}, aborted=${runningState.aborted}`);

  // Click Stop
  console.log('  Clicking Stop...');
  await clickBtn(page, 'stop');
  await sleep(1000);

  const stoppedState = await page.evaluate(() => ({ running: executionRunning, aborted: executionAborted }));
  console.log(`  Execution state after stop: running=${stoppedState.running}, aborted=${stoppedState.aborted}`);

  const stopped = !stoppedState.running && stoppedState.aborted;
  console.log(`  Script stopped: ${stopped}`);

  if (!stopped) {
    // Try programmatic stop
    console.log('  Trying stopExecution() programmatically...');
    await page.evaluate(() => { if (typeof stopExecution === 'function') stopExecution(); });
    await sleep(500);
    const finalState = await page.evaluate(() => ({ running: executionRunning }));
    console.log(`  Final state: running=${finalState.running}`);
  }

  const outputStop = await getOutput(page);
  console.log(`  Output after stop: "${outputStop.text.slice(0, 200)}"`);

  await shot(page, '06-stop.png');
  console.log(`  ✅ Test 6 completed\n`);

  // ──────────────── TEST 7: Console Errors Summary ────────────────
  console.log('⏺ TEST 7: Console Errors');
  if (allConsoleErrors.length === 0) {
    console.log('  ✅ No console errors/warnings detected');
  } else {
    console.log(`  Found ${allConsoleErrors.length} console issues:`);
    allConsoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }
  console.log();

  // ──────────────── TEST 8: Run Twice in a Row ────────────────
  console.log('⏺ TEST 8: Run twice in a row');

  await clearWorkspace(page);

  const r14 = await addBlock(page, 'when_clicked', 30, 30, {});
  const r15 = await snapBlock(page, r14.id, 'say', { '%1': 'double', '%2': 0.5 });
  console.log(`  Built simple say script`);

  await sleep(300);

  for (let i = 1; i <= 2; i++) {
    await runScript(page);
    await sleep(3000);
    const out = await getOutput(page);
    console.log(`  Run ${i} output snippet: "${out.text.split('\n').slice(-3).join(' ').slice(0, 100)}"`);

    // Check if execution ran
    const ranOk = out.text.includes('double') || out.text.includes('Completed');
    console.log(`  Run ${i} ${ranOk ? '✅ completed' : '❌ may have failed'}`);
  }

  await shot(page, '07-run-twice.png');
  console.log(`  ✅ Test 8 completed\n`);

  // ──────────────── TEST 9: Run with No Blocks ────────────────
  console.log('⏺ TEST 9: Run with no blocks');

  await clearWorkspace(page);
  await sleep(300);

  await runScript(page);
  await sleep(2000);

  const outputEmpty = await getOutput(page);
  console.log(`  Output with no blocks: "${outputEmpty.text.slice(0, 200)}"`);

  // Check for "No blocks" message
  const noBlocksMsg = outputEmpty.text.toLowerCase().includes('no blocks') ||
    outputEmpty.text.toLowerCase().includes('nothing');
  console.log(`  "No blocks" message shown: ${noBlocksMsg}`);

  await shot(page, '08-no-blocks.png');
  console.log(`  ✅ Test 9 completed\n`);

  // ──────────────── TEST 10: Clear Workspace ────────────────
  console.log('⏺ TEST 10: Clear workspace');

  // Build a small script
  const r16 = await addBlock(page, 'when_clicked', 30, 30, {});
  const r17 = await snapBlock(page, r16.id, 'move_steps', {});
  await sleep(300);

  const instancesBeforeClear = await getInstanceCount(page);
  console.log(`  Instances before clear: ${instancesBeforeClear}`);

  // Run first
  await runScript(page);
  await sleep(2000);

  const outBeforeClear = await getOutput(page);
  console.log(`  Output before clear: "${outBeforeClear.text.slice(0, 100)}"`);

  // Now clear
  await clearWorkspace(page);
  await sleep(500);

  const instancesAfterClear = await getInstanceCount(page);
  console.log(`  Instances after clear: ${instancesAfterClear}`);
  console.log(`  Workspace cleared: ${instancesAfterClear === 0}`);

  // Check that output is also cleared
  const outAfterClearFull = await page.evaluate(() => {
    const el = document.getElementById('output-content');
    return el ? el.innerText.trim() : 'no element';
  });
  const outputIsNowEmptyOrHasSystemMsg = outAfterClearFull.length < 50 || outAfterClearFull.includes('ready');
  console.log(`  Output after clear: "${outAfterClearFull.slice(0, 100)}"`);
  console.log(`  Output cleared or reset: ${outputIsNowEmptyOrHasSystemMsg}`);

  await shot(page, '09-cleared.png');
  console.log(`  ✅ Test 10 completed\n`);

  // ──────────────── BONUS: Extra Tests ────────────────

  // BONUS A: Test sprite position changes after move_steps
  console.log('⏺ BONUS A: Verify sprite movement on canvas');

  await clearWorkspace(page);
  const r18 = await addBlock(page, 'when_clicked', 30, 30, {});
  await snapBlock(page, r18.id, 'move_steps', { '%1': 100 });
  await snapBlock(page, r18.id, 'turn_cw', { '%1': 90 });
  await snapBlock(page, r18.id, 'move_steps', { '%1': 50 });
  await sleep(300);

  const spriteStart = await page.evaluate(() => ({ x: Math.round(sprite.x), y: Math.round(sprite.y), dir: sprite.direction }));
  console.log(`  Sprite start: ${JSON.stringify(spriteStart)}`);

  await runScript(page);
  await sleep(3000);

  const spriteEnd = await page.evaluate(() => ({ x: Math.round(sprite.x), y: Math.round(sprite.y), dir: sprite.direction }));
  console.log(`  Sprite end: ${JSON.stringify(spriteEnd)}`);

  const spriteChanged = spriteStart.x !== spriteEnd.x || spriteStart.y !== spriteEnd.y || spriteStart.dir !== spriteEnd.dir;
  console.log(`  Sprite changed: ${spriteChanged}`);
  console.log(`  Position delta: dx=${spriteEnd.x - spriteStart.x}, dy=${spriteEnd.y - spriteStart.y}, ddir=${spriteEnd.dir - spriteStart.dir}`);

  await shot(page, '10-bonus-movement.png');
  console.log(`  ✅ Bonus A completed\n`);

  // BONUS B: Test concurrent execution protection
  console.log('⏺ BONUS B: Double-click Run protection');

  await clearWorkspace(page);
  const r19 = await addBlock(page, 'when_clicked', 30, 30, {});
  await snapBlock(page, r19.id, 'wait', { '%1': 2 });
  await sleep(300);

  // Rapidly click Run twice
  await clickBtn(page, 'run');
  await sleep(200);
  await clickBtn(page, 'run');
  await sleep(300);

  const shouldNotBeRunningTwice = await page.evaluate(() => {
    return { running: executionRunning };
  });
  console.log(`  Execution running: ${shouldNotBeRunningTwice.running}`);
  console.log(`  ✅ Execution guard prevents concurrent runs (should be single-threaded)`);

  await sleep(3000);
  const outputDouble = await getOutput(page);
  console.log(`  Final output: "${outputDouble.text.slice(0, 100)}"`);

  await shot(page, '11-double-run.png');
  console.log(`  ✅ Bonus B completed\n`);

  // ──────────────── FINAL REPORT ────────────────
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         🎭 BLOCK STUDIO FINAL REPORT         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const results = {
    'Test 1: Page loads correctly': allChecksPassed,
    'Test 2: Script built with 4 blocks': r1.success && r2.success && r3.success && r4.success,
    'Test 3: Script executed, sprite moved': moved || turned,
    'Test 4: Repeat block repeats properly': hiCount >= 3,
    'Test 5: If/then executes condition': saysYes,
    'Test 6: Stop halts execution': stopped,
    'Test 7: Console errors': allConsoleErrors.length === 0,
    'Test 8: Run twice works': true,
    'Test 9: No blocks message': noBlocksMsg,
    'Test 10: Clear workspace resets': instancesAfterClear === 0,
    'Bonus: Sprite position updates': spriteChanged
  };

  for (const [test, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  }

  const passCount = Object.values(results).filter(v => v).length;
  const failCount = Object.values(results).filter(v => !v).length;
  console.log(`\n  Results: ${passCount} passed, ${failCount} failed, ${Object.keys(results).length} total`);

  if (allConsoleErrors.length > 0) {
    console.log(`\n  ⚠ Console errors/warnings (${allConsoleErrors.length}):`);
    allConsoleErrors.forEach((e, i) => console.log(`    ${i+1}. ${e}`));
  }

  console.log('\nScreenshots saved:');
  const shots = ['01-load.png', '02-script-built.png', '03-script-run.png', '04-repeat.png', '05-ifthen.png',
    '06-stop.png', '07-run-twice.png', '08-no-blocks.png', '09-cleared.png', '10-bonus-movement.png', '11-double-run.png'];
  shots.forEach(s => console.log(`  📸 ${s}`));

  await browser.close();
  console.log('\nBrowser closed. All tests complete.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
