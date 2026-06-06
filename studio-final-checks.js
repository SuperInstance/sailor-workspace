const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SITE = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';
const WORKSPACE = '/home/ubuntu/.openclaw/workspace';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));

  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // =====================================================================
  // TEST 1: Drag two blocks and snap them together (stacking)
  // =====================================================================
  console.log('='.repeat(70));
  console.log('TEST: Stack two blocks by snapping');
  console.log('='.repeat(70));

  // Drag first block (move) to workspace center
  const pos = await page.evaluate(() => {
    const block = document.querySelector('.palette-block');
    const ws = document.querySelector('#workspace');
    const wsRect = ws.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    return {
      block: { x: blockRect.x + blockRect.width/2, y: blockRect.y + blockRect.height/2 },
      wsCenter: { x: wsRect.x + wsRect.width/2, y: wsRect.y + wsRect.height/2 },
      wsBounds: { x: wsRect.x, y: wsRect.y, w: wsRect.width, h: wsRect.height },
    };
  });

  // Drag first block
  await page.mouse.move(pos.block.x, pos.block.y);
  await sleep(80);
  await page.mouse.down();
  await sleep(80);
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(
      pos.block.x + (pos.wsCenter.x - pos.block.x) * (i / 20),
      pos.block.y + (pos.wsCenter.y - 100 - pos.block.y) * (i / 20)
    );
    await sleep(25);
  }
  await page.mouse.up();
  await sleep(300);

  // Get first block position
  const firstPos = await page.evaluate(() => {
    const inst = document.querySelector('.block-instance');
    return inst ? {
      left: parseInt(inst.style.left),
      top: parseInt(inst.style.top),
      rect: inst.getBoundingClientRect(),
    } : null;
  });
  console.log(`   First block placed at: (${firstPos?.left}, ${firstPos?.top})`);

  // Now open Looks and get "say" block position, drag it below first block  
  const sayBlockInfo = await page.evaluate(() => {
    const looksCat = [...document.querySelectorAll('.cat')].find(c => c.dataset.cat === 'looks');
    if (!looksCat) return null;
    // Open looks if closed
    const body = looksCat.querySelector('.cat-body');
    const header = looksCat.querySelector('.cat-header');
    if (!body.classList.contains('open')) header.click();
    
    const sayBlock = looksCat.querySelector('.palette-block');
    if (!sayBlock) return null;
    const rect = sayBlock.getBoundingClientRect();
    return { cx: rect.x + rect.width/2, cy: rect.y + rect.height/2 };
  });

  if (sayBlockInfo) {
    console.log(`   "say" block at: (${Math.round(sayBlockInfo.cx)}, ${Math.round(sayBlockInfo.cy)})`);
    console.log(`   First block workspace position: (${firstPos?.left}, ${firstPos?.top})`);
    
    // Drag "say" block to workspace near the "move" block, but NOT on palette
    // Target: below the first block in the workspace area
    const wsRect = pos.wsBounds;
    
    // The workspace area starts at x=280. Make sure end position is well inside it
    const endX = wsRect.x + 60;
    const endY = firstPos ? firstPos.rect.y + firstPos.rect.height + 50 : wsRect.y + 300;

    await page.mouse.move(sayBlockInfo.cx, sayBlockInfo.cy);
    await sleep(80);
    await page.mouse.down();
    await sleep(80);
    
    // Drag in steps
    for (let i = 1; i <= 20; i++) {
      const x = sayBlockInfo.cx + (endX - sayBlockInfo.cx) * (i / 20);
      const y = sayBlockInfo.cy + (endY - sayBlockInfo.cy) * (i / 20);
      await page.mouse.move(x, y);
      await sleep(25);
    }
    await page.mouse.up();
    await sleep(500);
  }

  const afterStack = await page.evaluate(() => {
    return {
      instanceCount: document.querySelectorAll('.block-instance').length,
      instances: [...document.querySelectorAll('.block-instance')].map(el => ({
        text: el.querySelector('.block-body')?.textContent?.trim().substring(0, 60),
        left: el.style.left,
        top: el.style.top,
      })),
    };
  });
  console.log(`   After stacking attempt: ${afterStack.instanceCount} blocks`);
  for (const inst of afterStack.instances) {
    console.log(`     "${inst.text}" at (${inst.left}, ${inst.top})`);
  }

  // Run the stacked program
  await page.evaluate(() => document.getElementById('btn-run')?.click());
  await sleep(300);
  
  const stackedRun = await page.evaluate(() => {
    const output = document.getElementById('output-content');
    return {
      status: document.getElementById('output-status')?.textContent,
      text: output?.textContent?.trim().substring(0, 500),
    };
  });
  console.log(`   Run result status: ${stackedRun.status}`);
  console.log(`   Output: ${stackedRun.text}`);

  await page.evaluate(() => document.getElementById('btn-clear')?.click());
  await sleep(300);

  // =====================================================================
  // TEST: Delete by dragging back to palette
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('TEST: Delete block by dragging to palette');
  console.log('='.repeat(70));

  // Drag a block to workspace first
  const moveBlock2 = await page.evaluate(() => {
    const block = document.querySelector('.palette-block');
    const rect = block.getBoundingClientRect();
    return { cx: rect.x + rect.width/2, cy: rect.y + rect.height/2 };
  });

  const wsInfo = await page.evaluate(() => {
    const ws = document.querySelector('#workspace');
    const rect = ws.getBoundingClientRect();
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  });

  await page.mouse.move(moveBlock2.cx, moveBlock2.cy);
  await sleep(80);
  await page.mouse.down();
  await sleep(80);
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(
      moveBlock2.cx + (wsInfo.x + wsInfo.w/2 - moveBlock2.cx) * (i / 20),
      moveBlock2.cy + (wsInfo.y + 100 - moveBlock2.cy) * (i / 20)
    );
    await sleep(25);
  }
  await page.mouse.up();
  await sleep(300);

  const afterPlace = await page.evaluate(() => document.querySelectorAll('.block-instance').length);
  console.log(`   Block on workspace: ${afterPlace}`);

  // Now drag it back to the palette to delete
  const deleteInfo = await page.evaluate(() => {
    const inst = document.querySelector('.block-instance');
    const palette = document.querySelector('.palette');
    if (!inst || !palette) return null;
    const instRect = inst.getBoundingClientRect();
    const palRect = palette.getBoundingClientRect();
    return {
      block: { cx: instRect.x + instRect.width/2, cy: instRect.y + instRect.height/2 },
      paletteCenter: { x: palRect.x + palRect.width/2, y: palRect.y + palRect.height/2 },
    };
  });

  if (deleteInfo) {
    console.log(`   Dragging block back to palette...`);

    await page.mouse.move(deleteInfo.block.cx, deleteInfo.block.cy);
    await sleep(80);
    await page.mouse.down();
    await sleep(80);
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(
        deleteInfo.block.cx + (deleteInfo.paletteCenter.x - deleteInfo.block.cx) * (i / 20),
        deleteInfo.block.cy + (deleteInfo.paletteCenter.y - deleteInfo.block.cy) * (i / 20)
      );
      await sleep(25);
    }
    await page.mouse.up();
    await sleep(500);

    const afterDelete = await page.evaluate(() => {
      return {
        instanceCount: document.querySelectorAll('.block-instance').length,
        emptyHintVisible: document.getElementById('empty-hint')?.style.display !== 'none',
      };
    });
    console.log(`   Blocks remaining: ${afterDelete.instanceCount}`);
    console.log(`   Empty hint: ${afterDelete.emptyHintVisible ? '✅ visible' : 'hidden'}`);
  }

  // =====================================================================
  // FINAL: Run with no blocks
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('TEST: Run with no blocks');
  console.log('='.repeat(70));

  await page.evaluate(() => document.getElementById('btn-run')?.click());
  await sleep(300);
  
  const emptyRun = await page.evaluate(() => {
    return {
      status: document.getElementById('output-status')?.textContent,
      output: document.getElementById('output-content')?.textContent?.trim(),
    };
  });
  console.log(`   Status: ${emptyRun.status}`);
  console.log(`   Output: ${emptyRun.output}`);

  // =====================================================================
  // RESPONSIVE: Check mobile layout differences
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('RESPONSIVE: Desktop vs Mobile comparison');
  console.log('='.repeat(70));

  const desktopLayout = await page.evaluate(() => {
    const ws = document.querySelector('#workspace');
    const pal = document.querySelector('.palette');
    const header = document.querySelector('header');
    return {
      wsRect: ws ? ws.getBoundingClientRect() : null,
      palRect: pal ? pal.getBoundingClientRect() : null,
      headerRect: header ? header.getBoundingClientRect() : null,
      mainAreaFlexDirection: document.querySelector('.main-area') ? 
        getComputedStyle(document.querySelector('.main-area')).flexDirection : 'N/A',
    };
  });
  console.log(`   Desktop - main-area flex-direction: ${desktopLayout.mainAreaFlexDirection}`);
  console.log(`   Desktop - palette: ${Math.round(desktopLayout.palRect?.x || 0)},${Math.round(desktopLayout.palRect?.y || 0)} (${Math.round(desktopLayout.palRect?.width || 0)}x${Math.round(desktopLayout.palRect?.height || 0)})`);
  console.log(`   Desktop - workspace: ${Math.round(desktopLayout.wsRect?.x || 0)},${Math.round(desktopLayout.wsRect?.y || 0)} (${Math.round(desktopLayout.wsRect?.width || 0)}x${Math.round(desktopLayout.wsRect?.height || 0)})`);

  // Now mobile
  await page.setViewport({ width: 390, height: 844 });
  await sleep(1500);

  const mobileLayout = await page.evaluate(() => {
    const ws = document.querySelector('#workspace');
    const pal = document.querySelector('.palette');
    const header = document.querySelector('header');
    const mainArea = document.querySelector('.main-area');
    return {
      wsRect: ws ? ws.getBoundingClientRect() : null,
      palRect: pal ? pal.getBoundingClientRect() : null,
      headerRect: header ? header.getBoundingClientRect() : null,
      mainAreaFlexDirection: mainArea ? getComputedStyle(mainArea).flexDirection : 'N/A',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  console.log(`   Mobile (${mobileLayout.viewportWidth}x${mobileLayout.viewportHeight}):`);
  console.log(`   Mobile - main-area flex-direction: ${mobileLayout.mainAreaFlexDirection}`);
  console.log(`   Mobile - palette: ${Math.round(mobileLayout.palRect?.x || 0)},${Math.round(mobileLayout.palRect?.y || 0)} (${Math.round(mobileLayout.palRect?.width || 0)}x${Math.round(mobileLayout.palRect?.height || 0)})`);
  console.log(`   Mobile - workspace: ${Math.round(mobileLayout.wsRect?.x || 0)},${Math.round(mobileLayout.wsRect?.y || 0)} (${Math.round(mobileLayout.wsRect?.width || 0)}x${Math.round(mobileLayout.wsRect?.height || 0)})`);

  await browser.close();
  console.log('\n🏁 Final checks complete.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
