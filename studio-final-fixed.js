const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeMove(page, x, y) {
  if (!isFinite(x) || !isFinite(y)) {
    console.log(`     ⚠️ SKIP invalid move to (${x}, ${y})`);
    return false;
  }
  await page.mouse.move(x, y);
  return true;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log(`  [CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`  [PAGE_ERROR] ${err.message}`));

  await page.goto('https://voxelworks-fix.casey-digennaro.workers.dev/studio', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // ===========================================================
  // FULL STACKING TEST
  // ===========================================================
  console.log('='.repeat(70));
  console.log('TEST: Stack two blocks via snap, then run stacked program');
  console.log('='.repeat(70));

  // Get positions
  const coords = await page.evaluate(() => {
    const block = document.querySelector('.palette-block');
    const ws = document.querySelector('#workspace');
    const pal = document.querySelector('.palette');
    const br = block.getBoundingClientRect();
    const wr = ws.getBoundingClientRect();
    const pr = pal.getBoundingClientRect();
    return {
      block: { cx: br.x + br.width/2, cy: br.y + br.height/2 },
      wsCenter: { cx: wr.x + wr.width/2, cy: wr.y + wr.height/2 },
      ws: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
      pal: { x: pr.x, y: pr.y, w: pr.width, h: pr.height },
    };
  });

  // Drag move block to workspace
  await page.mouse.move(coords.block.cx, coords.block.cy);
  await sleep(50);
  await page.mouse.down();
  await sleep(50);
  const steps = 20;
  const dragTarget = { x: coords.wsCenter.cx - 60, y: coords.ws.y + 80 };
  for (let i = 1; i <= steps; i++) {
    const x = coords.block.cx + (dragTarget.x - coords.block.cx) * (i / steps);
    const y = coords.block.cy + (dragTarget.y - coords.block.cy) * (i / steps);
    await page.mouse.move(x, y);
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(300);

  const firstBlock = await page.evaluate(() => {
    const inst = document.querySelector('.block-instance');
    if (!inst) return null;
    const r = inst.getBoundingClientRect();
    return { id: inst.dataset.id, left: parseInt(inst.style.left), top: parseInt(inst.style.top), cx: r.x + r.width/2, cy: r.y + r.height/2, w: r.width, h: r.height };
  });
  console.log(`   Block 1: id=${firstBlock?.id} at workspace (${firstBlock?.left}, ${firstBlock?.top}), screen (${Math.round(firstBlock?.cx)}, ${Math.round(firstBlock?.cy)})`);

  // Now open Looks, drag "say" block and snap below first block
  const sayBlock = await page.evaluate(() => {
    const looksCat = [...document.querySelectorAll('.cat')].find(c => c.dataset.cat === 'looks');
    if (!looksCat) return null;
    const body = looksCat.querySelector('.cat-body');
    const header = looksCat.querySelector('.cat-header');
    if (!body.classList.contains('open')) header.click();
    const sayBlock = looksCat.querySelector('.palette-block');
    if (!sayBlock) return null;
    const r = sayBlock.getBoundingClientRect();
    return { cx: r.x + r.width/2, cy: r.y + r.height/2 };
  });

  if (sayBlock && firstBlock) {
    // Drag to workspace JUST below the first block (same x, y below)
    const endX = coords.ws.x + firstBlock.left + 30; // slightly right of first block's workspace x
    const endY = firstBlock.cy + firstBlock.h + 20;  // just below the first block
    
    console.log(`   Say block at: (${Math.round(sayBlock.cx)}, ${Math.round(sayBlock.cy)})`);
    console.log(`   Dragging to: (${Math.round(endX)}, ${Math.round(endY)})`);
    
    await page.mouse.move(sayBlock.cx, sayBlock.cy);
    await sleep(50);
    await page.mouse.down();
    await sleep(50);
    for (let i = 1; i <= 20; i++) {
      const x = sayBlock.cx + (endX - sayBlock.cx) * (i / 20);
      const y = sayBlock.cy + (endY - sayBlock.cy) * (i / 20);
      const ok = await safeMove(page, x, y);
      if (!ok) break;
      await sleep(20);
    }
    await page.mouse.up();
    await sleep(500);
  }

  let finalStack = await page.evaluate(() => {
    return {
      count: document.querySelectorAll('.block-instance').length,
      blocks: [...document.querySelectorAll('.block-instance')].map(el => {
        const r = el.getBoundingClientRect();
        return {
          text: el.querySelector('.block-body')?.textContent?.trim().substring(0, 60),
          left: el.style.left,
          top: el.style.top,
          screenX: Math.round(r.x),
          screenY: Math.round(r.y),
        };
      }),
    };
  });
  console.log(`   Workspace blocks after stacking: ${finalStack.count}`);
  for (const b of finalStack.blocks) console.log(`     "${b.text}" at ws(${b.left}, ${b.top}) screen(${b.screenX}, ${b.screenY})`);

  // Run the program
  await page.evaluate(() => document.getElementById('btn-run')?.click());
  await sleep(300);
  const runOut = await page.evaluate(() => ({
    status: document.getElementById('output-status')?.textContent,
    text: document.getElementById('output-content')?.textContent?.trim(),
  }));
  console.log(`   Run: status=${runOut.status}`);
  console.log(`   Output: ${runOut.text}`);

  // Clear
  await page.evaluate(() => document.getElementById('btn-clear')?.click());
  await sleep(300);
  const cleared = await page.evaluate(() => ({
    instances: document.querySelectorAll('.block-instance').length,
    status: document.getElementById('output-status')?.textContent,
  }));
  console.log(`   After clear: ${cleared.instances} instances, status=${cleared.status}`);

  // ===========================================================
  // RESPONSIVE: No CSS media queries means desktop layout only
  // ===========================================================
  console.log('\n' + '='.repeat(70));
  console.log('RESPONSIVE DESIGN CHECK (no media query fallback)');
  console.log('='.repeat(70));

  // Desktop (1280x800)
  await page.setViewport({ width: 1280, height: 800 });
  await sleep(500);
  const desktop = await page.evaluate(() => ({
    w: window.innerWidth, h: window.innerHeight,
    palW: document.querySelector('.palette')?.offsetWidth,
    wsW: document.querySelector('#workspace')?.offsetWidth,
    headerH: document.querySelector('header')?.offsetHeight,
    outputH: document.querySelector('.output-panel')?.offsetHeight,
  }));
  console.log(`   1280x800: palette=${desktop.palW}px, workspace=${desktop.wsW}px, header=${desktop.headerH}px, output=${desktop.outputH}px`);

  // Small desktop (1024x600)
  await page.setViewport({ width: 1024, height: 600 });
  await sleep(500);
  const small = await page.evaluate(() => ({
    w: window.innerWidth, h: window.innerHeight,
    palW: document.querySelector('.palette')?.offsetWidth,
    wsW: document.querySelector('#workspace')?.offsetWidth,
    headerH: document.querySelector('header')?.offsetHeight,
    outputH: document.querySelector('.output-panel')?.offsetHeight,
  }));
  console.log(`   1024x600: palette=${small.palW}px, workspace=${small.wsW}px, header=${small.headerH}px, output=${small.outputH}px`);

  // Mobile (390x844)
  await page.setViewport({ width: 390, height: 844 });
  await sleep(500);
  const mobile = await page.evaluate(() => ({
    w: window.innerWidth, h: window.innerHeight,
    palW: document.querySelector('.palette')?.offsetWidth,
    wsW: document.querySelector('#workspace')?.offsetWidth,
    headerH: document.querySelector('header')?.offsetHeight,
    outputH: document.querySelector('.output-panel')?.offsetHeight,
    palOverflow: getComputedStyle(document.querySelector('.palette')).overflow,
    wsOverflow: getComputedStyle(document.querySelector('#workspace')).overflow,
  }));
  console.log(`   390x844: palette=${mobile.palW}px, workspace=${mobile.wsW}px, header=${mobile.headerH}px, output=${mobile.outputH}px`);
  console.log(`   palette overflow: ${mobile.palOverflow}, workspace overflow: ${mobile.wsOverflow}`);

  await browser.close();
  console.log('\n🏁 Done.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
