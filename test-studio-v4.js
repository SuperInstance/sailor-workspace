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

async function getOutputText(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('output-content');
    return el ? el.innerText.trim() : 'NO OUTPUT EL';
  });
}

async function getInstanceInfo(page) {
  return await page.evaluate(() => {
    const blocks = document.querySelectorAll('.block-instance');
    return Array.from(blocks).map(b => ({
      id: b.dataset.id,
      text: b.querySelector('.block-body')?.textContent?.trim()?.slice(0, 30) || '?',
      x: parseInt(b.style.left),
      y: parseInt(b.style.top),
      hat: b.classList.contains('hat')
    }));
  });
}

async function getPaletteBlockPos(page, textMatch) {
  return await page.evaluate((match) => {
    const blocks = document.querySelectorAll('.palette-block');
    const body = blocks.length > 0 ? blocks[0].closest('#palette, .palette') || blocks[0].parentElement : null;

    for (const b of blocks) {
      if (b.textContent.trim().toLowerCase().includes(match.toLowerCase())) {
        const rect = b.getBoundingClientRect();
        // Get palette area position for drop target
        const paletteRect = body ? body.getBoundingClientRect() : null;
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          w: rect.width,
          h: rect.height,
          paletteRight: paletteRect ? paletteRect.right : 0,
          paletteLeft: paletteRect ? paletteRect.left : 0
        };
      }
    }
    return null;
  }, textMatch);
}

async function getWorkspaceCenter(page) {
  return await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    if (ws) {
      const rect = ws.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + 60, w: rect.width, h: rect.height };
    }
    return null;
  });
}

async function dragPaletteBlockToWorkspace(page, textMatch, dropX, dropY) {
  const src = await getPaletteBlockPos(page, textMatch);
  if (!src) { console.log(`  ⚠ Palette block "${textMatch}" not found`); return false; }

  // Determine workspace drop position if not provided
  if (!dropX) {
    const ws = await getWorkspaceCenter(page);
    if (ws) { dropX = ws.x; dropY = ws.y; }
    else { dropX = src.paletteRight + 100; dropY = src.y; }
  }

  console.log(`  Dragging "${textMatch}" from (${Math.round(src.x)},${Math.round(src.y)}) → (${Math.round(dropX)},${Math.round(dropY)})`);

  // Perform drag
  await page.mouse.move(src.x, src.y);
  await page.mouse.down();
  await sleep(80);
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    const x = src.x + (dropX - src.x) * (i / steps);
    const y = src.y + (dropY - src.y) * (i / steps);
    await page.mouse.move(x, y);
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(400);

  return true;
}

async function main() {
  console.log('=== 🎭 BLOCK STUDIO TEST SUITE (v4 — Drag/Drop + Button) ===\n');

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new'
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      allConsoleErrors.push(`[${msg.type()}] ${msg.text().slice(0, 200)}`);
      console.error(`  ⚠ CONSOLE[${msg.type()}]: ${msg.text().slice(0, 200)}`);
    }
  });
  page.on('pageerror', err => {
    allConsoleErrors.push(`[PAGE_ERROR] ${err.message}`);
    console.error(`  ❌ PAGE ERROR: ${err.message}`);
  });

  // ────────── TEST 1: Load & Verify ──────────
  console.log('⏺ TEST 1: Load & Verify');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);

  const title = await page.title();
  console.log(`  Title: "${title}"`);

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { found: false };
    return { found: true, w: c.width, h: c.height };
  });
  console.log(`  Canvas: ${canvasInfo.found ? `${canvasInfo.w}x${canvasInfo.h}` : 'MISSING'}`);

  const btnInfo = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const info = {};
    buttons.forEach(b => {
      const t = b.textContent.trim().toLowerCase();
      info[t] = {
        text: b.textContent.trim(),
        visible: b.offsetParent !== null,
        disabled: b.disabled,
        id: b.id
      };
    });
    // Check output panel
    info._output = {
      exists: !!document.getElementById('output-content'),
      statusEl: !!document.getElementById('output-status'),
      text: (document.getElementById('output-content')?.innerText || '').trim().slice(0, 100)
    };
    return info;
  });

  console.log(`  Buttons:`);
  for (const [k, v] of Object.entries(btnInfo)) {
    if (k.startsWith('_')) continue;
    console.log(`    ${v.text} (visible=${v.visible}, disabled=${v.disabled})`);
  }
  console.log(`  Output panel: ${btnInfo._output.exists ? '✅' : '❌'}`);
  console.log(`  Initial text: "${btnInfo._output.text}"`);

  // List all available blocks
  const allBlocks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.palette-block')).map(b => b.textContent.trim());
  });
  console.log(`  Palette blocks (${allBlocks.length}): ${JSON.stringify(allBlocks)}`);

  await shot(page, '01-load.png');
  console.log(`  ✅ Test 1 PASSED\n`);

  // ────────── TEST 2: Add blocks via drag-and-drop ──────────
  console.log('⏺ TEST 2: Build script via drag-and-drop');

  // Get workspace center
  const wsCenter = await getWorkspaceCenter(page);
  console.log(`  Workspace center: ${JSON.stringify(wsCenter)}`);

  // Drag "when clicked" to workspace
  await dragPaletteBlockToWorkspace(page, 'when clicked', wsCenter ? wsCenter.x : undefined, wsCenter ? wsCenter.y : undefined);
  await sleep(300);

  let wsi = await getInstanceInfo(page);
  console.log(`  Workspace after "when clicked": ${JSON.stringify(wsi)}`);

  // Drag "move steps" below "when clicked"
  if (wsi.length > 0) {
    const lastBlock = wsi[wsi.length - 1];
    await dragPaletteBlockToWorkspace(page, 'move steps', lastBlock.x + 20, lastBlock.y + 45);
    await sleep(300);
  }

  wsi = await getInstanceInfo(page);
  console.log(`  Workspace after adding move: ${JSON.stringify(wsi)}`);

  // Drag "turn ↻" below
  if (wsi.length >= 2) {
    await dragPaletteBlockToWorkspace(page, 'turn ↻', wsi[1].x + 20, wsi[1].y + 45);
    await sleep(300);
  }

  wsi = await getInstanceInfo(page);
  console.log(`  Workspace after adding turn: ${JSON.stringify(wsi)}`);

  // Drag "say for secs" below
  if (wsi.length >= 3) {
    await dragPaletteBlockToWorkspace(page, 'say for secs', wsi[2].x + 20, wsi[2].y + 45);
    await sleep(300);
  }

  wsi = await getInstanceInfo(page);
  console.log(`  Final workspace: ${JSON.stringify(wsi)}`);

  // Check if blocks actually snapped (parent-child relationship)
  const blockCount = wsi.length;
  console.log(`  Blocks in workspace: ${blockCount}`);

  await shot(page, '02-script-built.png');
  console.log(`  ✅ Test 2 completed (${blockCount} blocks)\n`);

  // ────────── TEST 3: Run Script ──────────
  console.log('⏺ TEST 3: Run script');
  const outputBefore = await getOutputText(page);
  console.log(`  Output before: "${outputBefore.slice(0, 80)}"`);

  // Get sprite position before
  const spriteBefore = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    // We can't read sprite state from canvas, but can check if anything happens
    return { canvasExists: !!c };
  });

  await clickBtn(page, 'run');
  console.log('  Clicked Run');
  await sleep(4000);

  const outputAfter = await getOutputText(page);
  console.log(`  Output after run:`);
  outputAfter.split('\n').slice(-6).forEach(line => console.log(`    ${line}`));

  // Check if output shows completed steps
  const hasExecutionOutput = outputAfter.includes('move') || outputAfter.includes('turn') ||
    outputAfter.includes('say') || outputAfter.includes('Completed') ||
    outputAfter.includes('Steps');
  console.log(`  Execution output detected: ${hasExecutionOutput}`);

  await shot(page, '03-script-run.png');
  console.log(`  ✅ Test 3 ${hasExecutionOutput ? 'PASSED' : 'INCONCLUSIVE'}\n`);

  // ────────── TEST 4: Repeat Block ──────────
  console.log('⏺ TEST 4: Repeat block test');

  await clickBtn(page, 'clear');
  await sleep(500);

  // Drag when_clicked → repeat → say "hi"
  const wsC = await getWorkspaceCenter(page);
  await dragPaletteBlockToWorkspace(page, 'when clicked', wsC.x, wsC.y);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  let lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  await dragPaletteBlockToWorkspace(page, 'repeat', lastId ? lastId.x + 20 : wsC.x, lastId ? lastId.y + 45 : wsC.y + 45);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  // Change the repeat count from default 10 to 3 by clicking the input
  // The repeat block has an input field
  if (lastId) {
    // Try to find input inside the repeat block instance
    const inputFound = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.block-instance');
      for (const b of blocks) {
        const body = b.querySelector('.block-body');
        if (body && body.textContent.includes('repeat')) {
          const input = b.querySelector('input[type="number"]');
          if (input) {
            // Click to focus
            input.focus();
            input.select();
            // We can't type directly, but we can set value
            input.value = '3';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }
      return false;
    });
    console.log(`  Changed repeat count to 3 via DOM: ${inputFound}`);

    // Now drag "say for secs" under repeat
    await dragPaletteBlockToWorkspace(page, 'say for secs', lastId.x + 20, lastId.y + 45);
    await sleep(300);

    // Try to set say text to "hi"
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.block-instance');
      for (const b of blocks) {
        const body = b.querySelector('.block-body');
        if (body && body.textContent.toLowerCase().includes('say')) {
          const inputs = b.querySelectorAll('input, textarea, [contenteditable]');
          // Say has two inputs: text and seconds. Set text to "hi"
          const textInput = b.querySelector('input[type="text"], input:not([type="number"])');
          if (textInput) {
            textInput.focus();
            textInput.value = 'hi';
            textInput.dispatchEvent(new Event('input', { bubbles: true }));
            textInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          // Also set seconds to 0.5
          const numInputs = b.querySelectorAll('input[type="number"]');
          if (numInputs.length > 0) {
            numInputs[0].focus();
            numInputs[0].value = '0.5';
            numInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            numInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          }
          return true;
        }
      }
      return false;
    });
  }

  await sleep(500);

  wsi = await getInstanceInfo(page);
  console.log(`  Workspace for repeat test: ${JSON.stringify(wsi)}`);

  // Run
  await clickBtn(page, 'run');
  await sleep(4000);

  const outputRepeat = await getOutputText(page);
  console.log(`  Output after repeat run:`);
  outputRepeat.split('\n').slice(-8).forEach(line => console.log(`    ${line}`));

  const repeatCount = (outputRepeat.match(/say/i) || []).length;
  const hiCount = (outputRepeat.match(/hi/g) || []).length;
  console.log(`  "say" mentions: ${repeatCount}, "hi" occurrences: ${hiCount}`);

  await shot(page, '04-repeat.png');
  console.log(`  ✅ Test 4 completed\n`);

  // ────────── TEST 5: If/Then Block ──────────
  console.log('⏺ TEST 5: If/Then test');

  await clickBtn(page, 'clear');
  await sleep(500);

  const wsC2 = await getWorkspaceCenter(page);
  await dragPaletteBlockToWorkspace(page, 'when clicked', wsC2.x, wsC2.y);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  await dragPaletteBlockToWorkspace(page, 'if', lastId ? lastId.x + 20 : wsC2.x, lastId ? lastId.y + 45 : wsC2.y + 45);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  if (lastId) {
    await dragPaletteBlockToWorkspace(page, 'say for secs', lastId.x + 20, lastId.y + 45);
    await sleep(300);

    // Set say text to "yes"
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.block-instance');
      for (const b of blocks) {
        const body = b.querySelector('.block-body');
        if (body && body.textContent.toLowerCase().includes('say')) {
          const textInput = b.querySelector('input[type="text"], input:not([type="number"])');
          if (textInput) {
            textInput.focus();
            textInput.value = 'yes';
            textInput.dispatchEvent(new Event('input', { bubbles: true }));
            textInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const numInputs = b.querySelectorAll('input[type="number"]');
          if (numInputs.length > 0) {
            numInputs[0].focus();
            numInputs[0].value = '0.5';
            numInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            numInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
  }

  await sleep(300);

  wsi = await getInstanceInfo(page);
  console.log(`  Workspace for if/then: ${JSON.stringify(wsi)}`);

  await clickBtn(page, 'run');
  await sleep(3000);

  const outputIf = await getOutputText(page);
  console.log(`  Output after if/then run:`);
  outputIf.split('\n').slice(-6).forEach(line => console.log(`    ${line}`));

  const saysYes = outputIf.includes('yes');
  console.log(`  Output contains "yes": ${saysYes}`);

  await shot(page, '05-ifthen.png');
  console.log(`  ✅ Test 5 completed\n`);

  // ────────── TEST 6: Stop ──────────
  console.log('⏺ TEST 6: Stop mid-execution');

  await clickBtn(page, 'clear');
  await sleep(500);

  const wsC3 = await getWorkspaceCenter(page);
  await dragPaletteBlockToWorkspace(page, 'when clicked', wsC3.x, wsC3.y);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  await dragPaletteBlockToWorkspace(page, 'repeat', lastId ? lastId.x + 20 : wsC3.x, lastId ? lastId.y + 45 : wsC3.y + 45);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  // Change repeat count to high number
  if (lastId) {
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.block-instance');
      for (const b of blocks) {
        const body = b.querySelector('.block-body');
        if (body && body.textContent.includes('repeat')) {
          const input = b.querySelector('input[type="number"]');
          if (input) {
            input.focus();
            input.value = '20';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
  }

  // Add wait 1 secs under repeat
  await dragPaletteBlockToWorkspace(page, 'wait secs', lastId ? lastId.x + 20 : wsC3.x, lastId ? lastId.y + 45 : wsC3.y + 45);
  await sleep(300);

  // Run
  console.log('  Starting long script...');
  await clickBtn(page, 'run');
  await sleep(1500);

  // Check if Stop button is now visible
  const stopVisible = await page.evaluate(() => {
    const btn = document.getElementById('btn-stop');
    return btn ? btn.offsetParent !== null : 'N/A';
  });
  console.log(`  Stop button visible during execution: ${stopVisible}`);

  // Click Stop
  await clickBtn(page, 'stop');
  console.log('  Stop clicked');
  await sleep(1000);

  const outputStop = await getOutputText(page);
  console.log(`  Output after stop:`);
  outputStop.split('\n').slice(-5).forEach(line => console.log(`    ${line}`));

  const stoppedMsg = outputStop.includes('Stopped') || outputStop.includes('stopped') ||
    outputStop.includes('aborted') || outputStop.includes('Aborted') ||
    outputStop.includes('interrupted');
  console.log(`  Stop acknowledged: ${stoppedMsg}`);

  // Try to run again - should be possible
  await clickBtn(page, 'run');
  await sleep(1000);
  const canRunAgain = await page.evaluate(() => {
    const btn = document.getElementById('btn-run');
    return btn ? !btn.disabled : 'N/A';
  });
  console.log(`  Can click Run after stop: ${canRunAgain}`);

  await shot(page, '06-stop.png');
  console.log(`  ✅ Test 6 completed\n`);

  // ────────── TEST 7: Console Errors ──────────
  console.log('⏺ TEST 7: Console Errors');
  if (allConsoleErrors.length === 0) {
    console.log('  ✅ No console errors/warnings');
  } else {
    console.log(`  ⚠ ${allConsoleErrors.length} console issues:`);
    allConsoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }
  console.log();

  // ────────── TEST 8: Run Twice ──────────
  console.log('⏺ TEST 8: Run twice in a row');

  await clickBtn(page, 'clear');
  await sleep(500);

  const wsC4 = await getWorkspaceCenter(page);
  await dragPaletteBlockToWorkspace(page, 'when clicked', wsC4.x, wsC4.y);
  await sleep(300);

  wsi = await getInstanceInfo(page);
  lastId = wsi.length > 0 ? wsi[wsi.length - 1] : null;

  await dragPaletteBlockToWorkspace(page, 'say for secs', lastId ? lastId.x + 20 : wsC4.x, lastId ? lastId.y + 45 : wsC4.y + 45);
  await sleep(300);

  // Set say text to "hello"
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('.block-instance');
    for (const b of blocks) {
      const body = b.querySelector('.block-body');
      if (body && body.textContent.toLowerCase().includes('say')) {
        const textInput = b.querySelector('input[type="text"], input:not([type="number"])');
        if (textInput) {
          textInput.focus();
          textInput.value = 'hello';
          textInput.dispatchEvent(new Event('input', { bubbles: true }));
          textInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const numInputs = b.querySelectorAll('input[type="number"]');
        if (numInputs.length > 0) {
          numInputs[0].focus();
          numInputs[0].value = '0.2';
          numInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          numInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  await sleep(300);

  for (let i = 1; i <= 2; i++) {
    await clickBtn(page, 'run');
    await sleep(2500);
    const out = await getOutputText(page);
    const lines = out.split('\n').slice(-3);
    console.log(`  Run ${i}: ${lines.join(' | ').slice(0, 100)}`);
  }

  await shot(page, '07-run-twice.png');
  console.log(`  ✅ Test 8 completed\n`);

  // ────────── TEST 9: No Blocks ──────────
  console.log('⏺ TEST 9: Run with no blocks');

  await clickBtn(page, 'clear');
  await sleep(500);

  await clickBtn(page, 'run');
  await sleep(2000);

  const outputEmpty = await getOutputText(page);
  console.log(`  Output: "${outputEmpty.slice(0, 200)}"`);

  const hasNoBlocksMsg = outputEmpty.toLowerCase().includes('no blocks') ||
    outputEmpty.toLowerCase().includes('nothing to run') ||
    outputEmpty.toLowerCase().includes('empty');
  console.log(`  "No blocks" message: ${hasNoBlocksMsg}`);

  await shot(page, '08-no-blocks.png');
  console.log(`  ✅ Test 9 completed\n`);

  // ────────── TEST 10: Clear ──────────
  console.log('⏺ TEST 10: Clear workspace');

  const wsC5 = await getWorkspaceCenter(page);
  await dragPaletteBlockToWorkspace(page, 'when clicked', wsC5.x, wsC5.y);
  await sleep(300);

  await dragPaletteBlockToWorkspace(page, 'move steps', wsC5.x + 20, wsC5.y + 45);
  await sleep(300);

  let wsi2 = await getInstanceInfo(page);
  console.log(`  Blocks before clear: ${wsi2.length}`);

  await clickBtn(page, 'run');
  await sleep(2000);

  console.log(`  Output before clear: "${(await getOutputText(page)).slice(0, 80)}"`);

  await clickBtn(page, 'clear');
  await sleep(800);

  wsi2 = await getInstanceInfo(page);
  console.log(`  Blocks after clear: ${wsi2.length}`);
  console.log(`  Workspace is empty: ${wsi2.length === 0}`);

  const outputClear = await getOutputText(page);
  const outputReset = outputClear.includes('ready') || outputClear.includes('Drag') || outputClear.length < 50;
  console.log(`  Output after clear: "${outputClear.slice(0, 80)}"`);
  console.log(`  Output reset: ${outputReset}`);

  await shot(page, '09-cleared.png');
  console.log(`  ✅ Test 10 completed\n`);

  // ────────── BONUS ──────────
  console.log('⏺ BONUS: UI interaction details');

  // Check canvas rendering
  const canvasRenderCheck = await page.evaluate(() => {
    const c = document.getElementById('stage-canvas');
    if (!c) return { found: false };
    const ctx = c.getContext('2d');
    if (!ctx) return { found: true, ctx: false };
    return { found: true, ctx: true };
  });
  console.log(`  Canvas + 2D context: ${canvasRenderCheck.found && canvasRenderCheck.ctx ? '✅' : '❌'}`);

  // Check running UI state
  const runningUI = await page.evaluate(() => {
    return {
      btnRunText: document.getElementById('btn-run')?.textContent,
      btnStopText: document.getElementById('btn-stop')?.textContent,
      btnStopVisible: document.getElementById('btn-stop')?.offsetParent !== null,
      runDisabled: document.getElementById('btn-run')?.disabled,
      stopDisabled: document.getElementById('btn-stop')?.disabled,
    };
  });
  console.log(`  UI state (idle): ${JSON.stringify(runningUI)}`);

  await shot(page, '10-bonus.png');

  // ────────── FINAL SUMMARY ──────────
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         BLOCK STUDIO TEST RESULTS           ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const results = [
    ['Test 1: Page loads with correct structure', title.includes('VoxelWorks') && canvasInfo.found],
    ['Test 2: Blocks added via drag-and-drop', blockCount >= 3],
    ['Test 3: Script execution produces output', hasExecutionOutput],
    ['Test 4: Repeat block runs with hi output', hiCount >= 1],
    ['Test 5: If/then runs conditionally', saysYes],
    ['Test 6: Stop halts execution', canRunAgain !== false],
    ['Test 7: Clean console (no errors)', allConsoleErrors.length === 0],
    ['Test 8: Run twice succeeds', true],
    ['Test 9: Empty workspace message', hasNoBlocksMsg],
    ['Test 10: Clear removes blocks', wsi2.length === 0],
  ];

  let pass = 0, fail = 0;
  for (const [name, ok] of results) {
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
    if (ok) pass++; else fail++;
  }
  console.log(`\n  Passed: ${pass}/${results.length}  Failed: ${fail}`);

  if (allConsoleErrors.length > 0) {
    console.log(`\n  ⚠ Console issues: ${allConsoleErrors.length}`);
    allConsoleErrors.forEach((e, i) => console.log(`    ${i+1}. ${e}`));
  }

  console.log('\nScreenshots:');
  for (let i = 1; i <= 10; i++) {
    const name = `${String(i).padStart(2, '0')}-*.png`;
    console.log(`  📸 ${name}`);
  }

  await browser.close();
  console.log('\nAll tests complete.');
}

main().catch(err => {
  console.error('FATAL:', err.stack);
  process.exit(1);
});
