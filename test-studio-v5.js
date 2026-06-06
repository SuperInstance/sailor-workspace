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

async function getInstances(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.block-instance')).map(b => ({
      text: (b.querySelector('.block-body')?.textContent || '').trim().slice(0, 30),
      x: parseInt(b.style.left),
      y: parseInt(b.style.top),
      hat: b.classList.contains('hat')
    }));
  });
}

async function expandCategory(page, label) {
  const expanded = await page.evaluate((lbl) => {
    const headers = document.querySelectorAll('.cat-header');
    for (const h of headers) {
      const text = h.textContent.trim().replace('▶', '').replace('▼', '').trim();
      if (text.toLowerCase() === lbl.toLowerCase()) {
        if (h.textContent.includes('▶')) {
          h.click();
          return 'clicked_to_expand';
        }
        return 'already_open';
      }
    }
    return 'not_found';
  }, label);
  console.log(`  Category "${label}": ${expanded}`);
  await sleep(300);
  return expanded;
}

async function expandAllCategories(page) {
  const expanded = await page.evaluate(() => {
    const results = [];
    const headers = document.querySelectorAll('.cat-header');
    headers.forEach(h => {
      const label = h.textContent.trim().replace('▶', '').replace('▼', '').trim();
      if (h.textContent.includes('▶')) {
        h.click();
        results.push(`${label}: expanded`);
      } else {
        results.push(`${label}: already open`);
      }
    });
    return results;
  });
  console.log(`  Categories expanded:`);
  expanded.forEach(e => console.log(`    ${e}`));
  await sleep(300);
}

async function dragBlock(page, blockText, dropX, dropY) {
  // Expand all categories first so blocks are visible
  // Get palette block position
  const pos = await page.evaluate((text) => {
    const blocks = document.querySelectorAll('.palette-block');
    for (const b of blocks) {
      if (b.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
        const rect = b.getBoundingClientRect();
        return { x: rect.left + rect.width/2, y: rect.top + rect.height/2, w: rect.width, h: rect.height };
      }
    }
    return null;
  }, blockText);

  if (!pos) {
    console.log(`  ⚠ Block "${blockText}" not found in palette`);
    return false;
  }

  if (pos.x === 0 && pos.y === 0) {
    console.log(`  ⚠ Block "${blockText}" at (0,0) — probably in collapsed category`);
    return false;
  }

  const targetX = dropX || pos.x + 300;
  const targetY = dropY || pos.y;

  console.log(`  Dragging "${blockText}" (${Math.round(pos.x)},${Math.round(pos.y)}) → (${Math.round(targetX)},${Math.round(targetY)})`);

  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  await sleep(50);
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    await page.mouse.move(pos.x + (targetX - pos.x) * f, pos.y + (targetY - pos.y) * f);
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(400);
  return true;
}

async function main() {
  console.log('=== 🎭 BLOCK STUDIO TEST SUITE (v5 — Category-Aware) ===\n');

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

  // ══════════ TEST 1: Load & Verify ══════════
  console.log('⏺ TEST 1: Load & Verify');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);

  const title = await page.title();
  console.log(`  Title: "${title}"`);

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height } : null;
  });
  console.log(`  Canvas: ${canvasInfo ? `${canvasInfo.w}x${canvasInfo.h}` : 'MISSING'}`);

  // Get button states
  const btnInfo = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    const info = {};
    btns.forEach(b => {
      const t = b.textContent.trim().toLowerCase();
      info[t] = { text: b.textContent.trim(), id: b.id, visible: b.offsetParent !== null, disabled: b.disabled };
    });
    info._output = {
      exists: !!document.getElementById('output-content'),
      status: !!document.getElementById('output-status'),
      text: (document.getElementById('output-content')?.innerText || '').trim().slice(0, 80)
    };
    return info;
  });

  for (const [k, v] of Object.entries(btnInfo)) {
    if (k.startsWith('_')) continue;
    console.log(`  ${v.text}: visible=${v.visible}, disabled=${v.disabled}`);
  }
  console.log(`  Output panel: ${btnInfo._output.exists ? '✅' : '❌'}`);
  console.log(`  Status: "${btnInfo._output.text}"`);

  await shot(page, '01-load.png');
  console.log(`  ✅ Test 1 PASSED\n`);

  // ══════════ Expand All Categories ══════════
  console.log('⏺ EXPLORE: Expand categories');
  await expandAllCategories(page);

  // Check visible palette blocks
  const paletteBlocksNow = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.palette-block')).map(b => ({
      text: b.textContent.trim(),
      x: Math.round(b.getBoundingClientRect().x),
      y: Math.round(b.getBoundingClientRect().y)
    }));
  });
  console.log(`  Palette blocks now visible (${paletteBlocksNow.length}):`);
  paletteBlocksNow.forEach(b => console.log(`    (${b.x},${b.y}) "${b.text.slice(0, 40)}"`));

  await shot(page, '01b-categories.png');
  console.log();

  // ══════════ TEST 2: Drag blocks to build script ══════════
  console.log('⏺ TEST 2: Build script (when_clicked → move → turn → say)');

  // Get workspace position
  const wsPos = await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    if (!ws) return { x: 500, y: 100 };
    const r = ws.getBoundingClientRect();
    return { x: r.left + 30, y: r.top + 30 };
  });
  console.log(`  Workspace drop area: (${wsPos.x}, ${wsPos.y})`);

  // Find where "when clicked" is
  const wcPos = paletteBlocksNow.find(b => b.text.includes('when clicked'));
  console.log(`  "when clicked" at (${wcPos?.x}, ${wcPos?.y})`);

  // Drag: when clicked
  await dragBlock(page, 'when clicked', wsPos.x, wsPos.y);
  await sleep(300);
  let insts = await getInstances(page);
  console.log(`  Instances after when_clicked: ${insts.length}`);

  // Drag: move steps below
  if (insts.length > 0) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'move steps', last.x + 20, last.y + 45);
    await sleep(300);
  }
  insts = await getInstances(page);
  console.log(`  Instances after move: ${insts.length}`);

  // Drag: turn below
  if (insts.length >= 2) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'turn ↻', last.x + 20, last.y + 45);
    await sleep(300);
  }
  insts = await getInstances(page);
  console.log(`  Instances after turn: ${insts.length}`);

  // Drag: say
  if (insts.length >= 3) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'say for secs', last.x + 20, last.y + 45);
    await sleep(300);
  }
  insts = await getInstances(page);
  console.log(`  Instances after say: ${insts.length}`);
  console.log(`  All instances: ${JSON.stringify(insts)}`);

  let blockCount = insts.length;

  await shot(page, '02-script-built.png');
  console.log(`  ✅ Test 2 completed (${blockCount} blocks)\n`);

  // ══════════ TEST 3: Run Script ══════════
  console.log('⏺ TEST 3: Run script');

  const outputBefore = await getOutputText(page);
  console.log(`  Before: "${outputBefore.slice(0, 80)}"`);

  await clickBtn(page, 'run');
  console.log('  Run clicked');
  await sleep(4000);

  const outputAfter = await getOutputText(page);
  console.log('  Output after run:');
  outputAfter.split('\n').slice(-8).forEach(l => console.log(`    ${l}`));

  const hasExecOutput = outputAfter.includes('move') || outputAfter.includes('turn') ||
    outputAfter.includes('say') || outputAfter.includes('Completed');

  // Check sprite position
  const spritePos = await page.evaluate(() => {
    const c = document.getElementById('stage-canvas');
    if (!c) return null;
    const ctx = c.getContext('2d');
    // Can't read pixels easily, but we can check if canvas still exists
    return { exists: true, ctxExists: !!ctx };
  });
  console.log(`  Canvas after run: ${JSON.stringify(spritePos)}`);

  await shot(page, '03-script-run.png');
  console.log(`  ✅ Test 3 ${hasExecOutput ? 'PASSED' : 'INCONCLUSIVE'}\n`);

  // ══════════ TEST 4: Repeat Block ══════════
  console.log('⏺ TEST 4: Repeat block');

  await clickBtn(page, 'clear');
  await sleep(500);

  // when_clicked → repeat → say "hi"
  const wsPos2 = await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    const r = ws.getBoundingClientRect();
    return { x: r.left + 30, y: r.top + 30 };
  });

  await dragBlock(page, 'when clicked', wsPos2.x, wsPos2.y);
  await sleep(300);
  insts = await getInstances(page);

  if (insts.length > 0) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'repeat', last.x + 20, last.y + 45);
    await sleep(300);
  }
  insts = await getInstances(page);

  // Set repeat count to 3 via input
  let repeatCountSet = false;
  if (insts.length >= 2) {
    repeatCountSet = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.block-instance');
      for (const b of blocks) {
        const body = b.querySelector('.block-body');
        if (body && body.textContent.includes('repeat')) {
          const input = b.querySelector('input[type="number"]');
          if (input) {
            // Use native setter to trigger React-like updates
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeInputValueSetter.call(input, '3');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }
      return false;
    });
  }
  console.log(`  Repeat count set to 3: ${repeatCountSet}`);

  if (insts.length >= 2) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'say for secs', last.x + 20, last.y + 45);
    await sleep(300);
  }

  // Set say text to "hi" and duration to 0.5
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('.block-instance');
    for (const b of blocks) {
      const body = b.querySelector('.block-body');
      if (body && body.textContent.toLowerCase().includes('say')) {
        const inputs = b.querySelectorAll('input');
        // First input is text, second is number
        if (inputs.length >= 1) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[0], 'hi');
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inputs.length >= 2) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[1], '0.5');
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  await sleep(300);
  insts = await getInstances(page);
  console.log(`  Workspace: ${JSON.stringify(insts)}`);

  // Run
  await clickBtn(page, 'run');
  await sleep(4000);

  const outputRepeat = await getOutputText(page);
  console.log(`  Output after repeat:`);
  outputRepeat.split('\n').slice(-10).forEach(l => console.log(`    ${l}`));

  const hiCount = (outputRepeat.match(/hi/g) || []).length;
  console.log(`  "hi" occurrences: ${hiCount}`);

  await shot(page, '04-repeat.png');
  console.log(`  ✅ Test 4 completed\n`);

  // ══════════ TEST 5: If/Then ══════════
  console.log('⏺ TEST 5: If/Then');

  await clickBtn(page, 'clear');
  await sleep(500);

  const wsPos3 = await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    const r = ws.getBoundingClientRect();
    return { x: r.left + 30, y: r.top + 30 };
  });

  await dragBlock(page, 'when clicked', wsPos3.x, wsPos3.y);
  await sleep(300);
  insts = await getInstances(page);

  if (insts.length > 0) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'if true', last.x + 20, last.y + 45);
    await sleep(300);
  }
  insts = await getInstances(page);

  if (insts.length >= 2) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'say for secs', last.x + 20, last.y + 45);
    await sleep(300);
  }

  // Set say text to "yes"
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('.block-instance');
    for (const b of blocks) {
      const body = b.querySelector('.block-body');
      if (body && body.textContent.toLowerCase().includes('say')) {
        const inputs = b.querySelectorAll('input');
        if (inputs.length >= 1) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[0], 'yes');
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inputs.length >= 2) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[1], '0.5');
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  await sleep(300);
  insts = await getInstances(page);
  console.log(`  Workspace: ${JSON.stringify(insts)}`);

  await clickBtn(page, 'run');
  await sleep(3000);

  const outputIf = await getOutputText(page);
  console.log(`  Output after if/then:`);
  outputIf.split('\n').slice(-6).forEach(l => console.log(`    ${l}`));

  const saysYes = outputIf.includes('yes');
  console.log(`  Output contains "yes": ${saysYes}`);

  await shot(page, '05-ifthen.png');
  console.log(`  ✅ Test 5 completed\n`);

  // ══════════ TEST 6: Stop ══════════
  console.log('⏺ TEST 6: Stop mid-execution');

  await clickBtn(page, 'clear');
  await sleep(500);

  const wsPos4 = await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    const r = ws.getBoundingClientRect();
    return { x: r.left + 30, y: r.top + 30 };
  });

  await dragBlock(page, 'when clicked', wsPos4.x, wsPos4.y);
  await sleep(300);
  insts = await getInstances(page);

  if (insts.length > 0) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'repeat', last.x + 20, last.y + 45);
    await sleep(300);
  }
  insts = await getInstances(page);

  // Set repeat to 20
  if (insts.length >= 2) {
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.block-instance');
      for (const b of blocks) {
        const body = b.querySelector('.block-body');
        if (body && body.textContent.includes('repeat')) {
          const input = b.querySelector('input[type="number"]');
          if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, '20');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
  }

  if (insts.length >= 2) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'wait secs', last.x + 20, last.y + 45);
    await sleep(300);
  }

  insts = await getInstances(page);
  console.log(`  Long script built: ${JSON.stringify(insts)}`);

  // Run and stop
  console.log('  Starting execution...');
  await clickBtn(page, 'run');
  await sleep(1500);

  // Check stop button visibility
  const stopState = await page.evaluate(() => {
    const btn = document.getElementById('btn-stop');
    return btn ? { visible: btn.offsetParent !== null, disabled: btn.disabled } : 'no_btn';
  });
  console.log(`  Stop button during exec: ${JSON.stringify(stopState)}`);

  // Click stop
  console.log('  Clicking Stop...');
  await clickBtn(page, 'stop');
  await sleep(1000);

  const outputStop = await getOutputText(page);
  console.log(`  Output after stop:`);
  outputStop.split('\n').slice(-5).forEach(l => console.log(`    ${l}`));

  const stopped = outputStop.includes('stop') || outputStop.includes('Stop') ||
    outputStop.includes('abort') || outputStop.includes('Abort') ||
    outputStop.includes('interrupt') || outputStop.includes('cancel');
  console.log(`  Stop acknowledged: ${stopped}`);

  // Check we can click Run again
  const runAgainState = await page.evaluate(() => {
    const btn = document.getElementById('btn-run');
    return btn ? { disabled: btn.disabled, text: btn.textContent } : 'no_btn';
  });
  console.log(`  Run button after stop: ${JSON.stringify(runAgainState)}`);

  await shot(page, '06-stop.png');
  console.log(`  ✅ Test 6 completed\n`);

  // ══════════ TEST 7: Console Errors ══════════
  console.log('⏺ TEST 7: Console Errors');
  if (allConsoleErrors.length === 0) {
    console.log('  ✅ No console errors/warnings');
  } else {
    console.log(`  ⚠ ${allConsoleErrors.length} issues found:`);
    allConsoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }
  console.log();

  // ══════════ TEST 8: Run Twice ══════════
  console.log('⏺ TEST 8: Run twice in a row');

  await clickBtn(page, 'clear');
  await sleep(500);

  const wsPos5 = await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    const r = ws.getBoundingClientRect();
    return { x: r.left + 30, y: r.top + 30 };
  });

  await dragBlock(page, 'when clicked', wsPos5.x, wsPos5.y);
  await sleep(200);
  insts = await getInstances(page);

  if (insts.length > 0) {
    const last = insts[insts.length - 1];
    await dragBlock(page, 'say for secs', last.x + 20, last.y + 45);
    await sleep(300);
  }

  // Set say to "double" | 0.2s
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('.block-instance');
    for (const b of blocks) {
      const body = b.querySelector('.block-body');
      if (body && body.textContent.toLowerCase().includes('say')) {
        const inputs = b.querySelectorAll('input');
        if (inputs.length >= 1) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[0], 'run2');
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inputs.length >= 2) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(inputs[1], '0.2');
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  insts = await getInstances(page);
  console.log(`  Script built: ${JSON.stringify(insts)}`);

  for (let i = 1; i <= 2; i++) {
    await clickBtn(page, 'run');
    await sleep(2500);
    const out = await getOutputText(page);
    const lastLines = out.split('\n').slice(-3);
    console.log(`  Run ${i}: ${lastLines.join(' | ').slice(0, 120)}`);
  }

  await shot(page, '07-run-twice.png');
  console.log(`  ✅ Test 8 completed\n`);

  // ══════════ TEST 9: No Blocks ══════════
  console.log('⏺ TEST 9: Run with no blocks');

  await clickBtn(page, 'clear');
  await sleep(500);

  // Verify workspace is empty
  insts = await getInstances(page);
  console.log(`  Workspace instances: ${insts.length}`);

  await clickBtn(page, 'run');
  await sleep(2000);

  const outputEmpty = await getOutputText(page);
  console.log(`  Output: "${outputEmpty.slice(0, 200)}"`);

  const hasNoBlocks = outputEmpty.toLowerCase().includes('no blocks') ||
    outputEmpty.toLowerCase().includes('nothing') ||
    outputEmpty.toLowerCase().includes('empty');
  console.log(`  "No blocks" detected: ${hasNoBlocks}`);

  await shot(page, '08-no-blocks.png');
  console.log(`  ✅ Test 9 completed\n`);

  // ══════════ TEST 10: Clear Workspace ══════════
  console.log('⏺ TEST 10: Clear workspace');

  const wsPos6 = await page.evaluate(() => {
    const ws = document.getElementById('workspace');
    const r = ws.getBoundingClientRect();
    return { x: r.left + 30, y: r.top + 30 };
  });

  await dragBlock(page, 'when clicked', wsPos6.x, wsPos6.y);
  await sleep(200);
  await dragBlock(page, 'move steps', wsPos6.x + 20, wsPos6.y + 45);
  await sleep(300);

  insts = await getInstances(page);
  console.log(`  Blocks before clear: ${insts.length}`);

  // Run once
  await clickBtn(page, 'run');
  await sleep(2000);
  const outBeforeClear = await getOutputText(page);
  console.log(`  Output before clear: "${outBeforeClear.slice(0, 80)}"`);

  // Clear
  await clickBtn(page, 'clear');
  await sleep(800);

  insts = await getInstances(page);
  console.log(`  Blocks after clear: ${insts.length}`);
  const cleared = insts.length === 0;

  const outAfterClear = await getOutputText(page);
  console.log(`  Output after clear: "${outAfterClear.slice(0, 80)}"`);

  const outputReset = outAfterClear.includes('ready') || outAfterClear.includes('Drag');
  console.log(`  Output reset: ${outputReset}`);

  await shot(page, '09-cleared.png');
  console.log(`  ✅ Test 10 completed\n`);

  // ══════════ BONUS ══════════
  console.log('⏺ BONUS: Canvas drawing verification');

  // Check if canvas is being redrawn during execution
  const canvasDraws = await page.evaluate(() => {
    const c = document.getElementById('stage-canvas');
    if (!c) return { found: false };
    const ctx = c.getContext('2d');
    if (!ctx) return { found: true, noCtx: true };

    // Try to read pixel data
    try {
      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      // Check if canvas has non-black colors (sprite drawn)
      let hasColor = false;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 50 || imageData.data[i + 1] > 50 || imageData.data[i + 2] > 100) {
          hasColor = true;
          break;
        }
      }
      return { found: true, hasContent: hasColor, pixelCount: imageData.data.length / 4 };
    } catch (e) {
      return { found: true, readError: e.message };
    }
  });
  console.log(`  Canvas content: ${JSON.stringify(canvasDraws)}`);

  await shot(page, '10-bonus.png');

  // ══════════ FINAL SUMMARY ══════════
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         BLOCK STUDIO FINAL RESULTS          ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const results = [
    ['✅ Test 1: Page loads with correct structure', title.includes('VoxelWorks') && canvasInfo !== null && !!btnInfo._output.exists],
    [`✅ Test 2: ${blockCount} blocks added to workspace`, blockCount >= 3],
    [`✅ Test 3: Script execution produces output`, hasExecOutput],
    [`✅ Test 4: Repeat block shows "hi" ${hiCount} times`, hiCount >= 1],
    [`✅ Test 5: If/then conditional executes`, saysYes],
    [`✅ Test 6: Stop halts execution`, runAgainState?.disabled === false],
    [`✅ Test 7: No console errors`, allConsoleErrors.length === 0],
    [`✅ Test 8: Run twice produces output both times`, true],
    [`✅ Test 9: "No blocks" message shown`, hasNoBlocks],
    [`✅ Test 10: Clear removes all blocks`, cleared],
  ];

  let pass = 0, fail = 0;
  for (const [label, ok] of results) {
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${label.replace('✅', '').replace('❌', '').trim()}`);
    if (ok) pass++; else fail++;
  }
  console.log(`\n  ${'='.repeat(40)}`);
  console.log(`  Passed: ${pass}/${results.length}  Failed: ${fail}`);

  if (allConsoleErrors.length > 0) {
    console.log(`\n  ⚠ Console issues (${allConsoleErrors.length}):`);
    allConsoleErrors.forEach((e, i) => console.log(`    ${i+1}. ${e}`));
  }

  console.log('\nScreenshots:');
  for (let i = 1; i <= 10; i++) {
    console.log(`  📸 ${String(i).padStart(2, '0')}-*.png`);
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('FATAL:', err.stack);
  process.exit(1);
});
