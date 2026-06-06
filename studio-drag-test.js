const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SITE = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';
const WORKSPACE = '/home/ubuntu/.openclaw/workspace';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function screenshot(page, name) {
  const dest = path.join(WORKSPACE, name);
  await page.screenshot({ path: dest, fullPage: true });
  console.log(`  📸 ${name}`);
  return dest;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
  });
  const page = await browser.newPage();

  // Console monitoring
  page.on('console', msg => console.log(`  [CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`  [PAGE_ERROR] ${err.message}`));

  console.log('='.repeat(70));
  console.log('🔷 DEEP DRAG, RUN, CLEAR & CATEGORY TEST');
  console.log('='.repeat(70));

  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, 'studio-initial.png');

  // =====================================================================
  // CATEGORY EXPANSION - Verify all 4 categories exist
  // =====================================================================
  console.log('\n📋 CATEGORY EXPANSION');
  
  const catInfo = await page.evaluate(() => {
    const cats = document.querySelectorAll('.cat');
    return [...cats].map(c => ({
      dataCat: c.dataset.cat,
      headerText: c.querySelector('.cat-header')?.textContent?.trim(),
      hasBody: !!c.querySelector('.cat-body'),
      bodyOpen: c.querySelector('.cat-body')?.classList.contains('open'),
      blockCount: c.querySelectorAll('.palette-block').length,
      blocks: [...c.querySelectorAll('.palette-block')].map(b => ({
        text: b.querySelector('.block-body')?.textContent?.trim(),
        class: b.className,
      })),
    }));
  });

  for (const c of catInfo) {
    console.log(`   ${c.headerText}: open=${c.bodyOpen}, blocks=${c.blockCount}`);
    for (const b of c.blocks) {
      console.log(`     📦 ${b.text}`);
    }
  }

  // Toggle categories: close Motion, open Looks, then close Looks, open Control, etc.
  const toggleRes = await page.evaluate(() => {
    const results = [];
    const cats = document.querySelectorAll('.cat');
    for (const cat of cats) {
      const header = cat.querySelector('.cat-header');
      const body = cat.querySelector('.cat-body');
      const arrow = cat.querySelector('.arrow');
      const wasOpen = body.classList.contains('open');
      
      // Click header to toggle
      header.click();
      
      results.push({
        category: cat.dataset.cat,
        wasOpen,
        nowOpen: body.classList.contains('open'),
        arrowOpen: arrow.classList.contains('open'),
      });
    }
    return results;
  });

  console.log('\n   Toggle results (all cats toggled):');
  for (const r of toggleRes) {
    console.log(`     ${r.category}: wasOpen=${r.wasOpen} → nowOpen=${r.nowOpen} (arrow: ${r.arrowOpen})`);
  }
  
  await screenshot(page, 'studio-all-closed.png');

  // Open them all back
  await page.evaluate(() => {
    const cats = document.querySelectorAll('.cat');
    for (const cat of cats) {
      const header = cat.querySelector('.cat-header');
      const body = cat.querySelector('.cat-body');
      if (!body.classList.contains('open')) {
        header.click();
      }
    }
  });
  await sleep(300);

  const afterAllOpen = await page.evaluate(() => {
    return [...document.querySelectorAll('.cat')].map(c => ({
      name: c.dataset.cat,
      open: c.querySelector('.cat-body')?.classList.contains('open'),
    }));
  });
  console.log('   After reopening all:');
  for (const a of afterAllOpen) console.log(`     ${a.name}: ${a.open ? '✅ open' : '❌ closed'}`);

  await screenshot(page, 'studio-all-open.png');

  // =====================================================================
  // PERFORM REAL MOUSE DRAG FROM PALETTE TO WORKSPACE
  // =====================================================================
  console.log('\n📋 MOUSE DRAG: move 10 steps palette block → workspace');

  // Get bounding boxes for drag targets
  const dragTargets = await page.evaluate(() => {
    const palette = document.querySelector('.palette');
    const workspace = document.querySelector('#workspace');
    const firstBlock = document.querySelector('.palette-block');
    
    if (!palette || !workspace || !firstBlock) {
      return { error: 'Missing elements' };
    }

    const palRect = palette.getBoundingClientRect();
    const wsRect = workspace.getBoundingClientRect();
    const blockRect = firstBlock.getBoundingClientRect();

    return {
      palette: { x: palRect.x, y: palRect.y, w: palRect.width, h: palRect.height },
      workspace: { x: wsRect.x, y: wsRect.y, w: wsRect.width, h: wsRect.height },
      block: { 
        x: blockRect.x, y: blockRect.y, 
        cx: blockRect.x + blockRect.width/2,
        cy: blockRect.y + blockRect.height/2,
        w: blockRect.width, h: blockRect.height 
      },
      workspace_center: {
        x: wsRect.x + wsRect.width/2,
        y: wsRect.y + wsRect.height/2,
      }
    };
  });

  console.log(`   Block at: (${Math.round(dragTargets.block.x)}, ${Math.round(dragTargets.block.y)})`);
  console.log(`   Workspace center: (${Math.round(dragTargets.workspace_center.x)}, ${Math.round(dragTargets.workspace_center.y)})`);

  // Perform real mouse drag: mousedown on block, mousemove to workspace, mouseup
  const startX = dragTargets.block.cx;
  const startY = dragTargets.block.cy;
  const endX = dragTargets.workspace_center.x;
  const endY = dragTargets.workspace_center.y;

  console.log(`   Dragging from (${Math.round(startX)}, ${Math.round(startY)}) → (${Math.round(endX)}, ${Math.round(endY)})`);

  // mousedown on the palette block
  await page.mouse.move(startX, startY);
  await sleep(100);
  await page.mouse.down();
  await sleep(100);

  // move incrementally
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await sleep(30);
  }
  await sleep(200);

  // mouseup in workspace center
  await page.mouse.up();
  await sleep(500);

  const afterDrag = await page.evaluate(() => {
    const instances = document.querySelectorAll('.block-instance');
    const workspace = document.querySelector('#workspace');
    const emptyHint = document.querySelector('#empty-hint');
    
    return {
      instanceCount: instances.length,
      instances: [...instances].map(el => ({
        id: el.dataset.id,
        text: el.querySelector('.block-body')?.textContent?.trim(),
        left: el.style.left,
        top: el.style.top,
        class: el.className,
      })),
      workspaceChildren: workspace ? workspace.children.length : 0,
      emptyHintVisible: emptyHint ? window.getComputedStyle(emptyHint).display !== 'none' : 'N/A',
    };
  });

  console.log(`   Blocks in workspace: ${afterDrag.instanceCount}`);
  for (const inst of afterDrag.instances) {
    console.log(`     id=${inst.id} "${inst.text}" at (${inst.left}, ${inst.top})`);
  }
  console.log(`   Empty hint visible: ${afterDrag.emptyHintVisible}`);

  await screenshot(page, 'studio-after-drag.png');

  // =====================================================================
  // DRAG A SECOND BLOCK AND SNAP IT
  // =====================================================================
  console.log('\n📋 MOUSE DRAG: second block (say hello) → snap to first block');

  const secondBlockInfo = await page.evaluate(() => {
    // The "say" block is in the Looks category (currently closed)
    // First open Looks, then find the "say" block
    const cats = document.querySelectorAll('.cat');
    for (const cat of cats) {
      if (cat.dataset.cat === 'looks') {
        const header = cat.querySelector('.cat-header');
        const body = cat.querySelector('.cat-body');
        if (!body.classList.contains('open')) {
          header.click();
        }
        // Find the say block
        const sayBlock = cat.querySelector('.palette-block');
        if (sayBlock) {
          const rect = sayBlock.getBoundingClientRect();
          return {
            cx: rect.x + rect.width/2,
            cy: rect.y + rect.height/2,
            text: sayBlock.textContent?.trim(),
          };
        }
      }
    }
    return null;
  });

  if (secondBlockInfo) {
    console.log(`   Second block: "${secondBlockInfo.text}" at (${Math.round(secondBlockInfo.cx)}, ${Math.round(secondBlockInfo.cy)})`);

    // Drag it to workspace somewhere near the first block
    const afterDragState = await page.evaluate(() => {
      const first = document.querySelector('.block-instance');
      if (!first) return null;
      const rect = first.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    });

    // mousedown on the say block
    await page.mouse.move(secondBlockInfo.cx, secondBlockInfo.cy);
    await sleep(100);
    await page.mouse.down();
    await sleep(100);

    // Drag to position near first block (below it)
    const targetX = afterDragState ? afterDragState.x : 400;
    const targetY = afterDragState ? (afterDragState.y + afterDragState.h + 10) : 400;
    
    console.log(`   Dragging to (${Math.round(targetX)}, ${Math.round(targetY)})`);

    const steps2 = 15;
    for (let i = 1; i <= steps2; i++) {
      const x = secondBlockInfo.cx + (targetX - secondBlockInfo.cx) * (i / steps2);
      const y = secondBlockInfo.cy + (targetY - secondBlockInfo.cy) * (i / steps2);
      await page.mouse.move(x, y);
      await sleep(50);
    }
    await sleep(200);
    await page.mouse.up();
    await sleep(500);

    const afterSecondDrag = await page.evaluate(() => {
      return {
        totalInstances: document.querySelectorAll('.block-instance').length,
        instances: [...document.querySelectorAll('.block-instance')].map(el => ({
          text: el.querySelector('.block-body')?.textContent?.trim(),
          pos: `${el.style.left}, ${el.style.top}`,
        })),
      };
    });
    console.log(`   After second drag: ${afterSecondDrag.totalInstances} instances`);
    for (const inst of afterSecondDrag.instances) {
      console.log(`     "${inst.text}" at (${inst.pos})`);
    }

    await screenshot(page, 'studio-two-blocks.png');

  } else {
    console.log('   ❌ Could not find second block');
  }

  // =====================================================================
  // RUN THE PROGRAM
  // =====================================================================
  console.log('\n📋 CLICK RUN BUTTON');

  const runResult = await page.evaluate(() => {
    const runBtn = document.getElementById('btn-run');
    if (!runBtn) return { clicked: false, err: 'btn-run not found' };
    runBtn.click();
    return { clicked: true, text: runBtn.textContent };
  });
  console.log(`   Run clicked: ${runResult.clicked}`);

  await sleep(500);

  // Check output panel
  const outputState = await page.evaluate(() => {
    const output = document.getElementById('output-content');
    const status = document.getElementById('output-status');
    return {
      status: status?.textContent,
      outputHTML: output?.innerHTML?.substring(0, 2000),
      outputText: output?.textContent?.trim(),
    };
  });
  console.log(`   Output status: "${outputState.status}"`);
  console.log(`   Output text: ${outputState.outputText}`);

  await screenshot(page, 'studio-after-run.png');

  // =====================================================================
  // CLICK CLEAR
  // =====================================================================
  console.log('\n📋 CLICK CLEAR BUTTON');

  const clearResult = await page.evaluate(() => {
    const clearBtn = document.getElementById('btn-clear');
    if (!clearBtn) return { clicked: false };
    clearBtn.click();
    return { clicked: true };
  });
  console.log(`   Clear clicked: ${clearResult.clicked}`);
  await sleep(500);

  const afterClear = await page.evaluate(() => {
    return {
      instanceCount: document.querySelectorAll('.block-instance').length,
      emptyHintVisible: document.getElementById('empty-hint') ? 
        window.getComputedStyle(document.getElementById('empty-hint')).display !== 'none' : 'N/A',
      outputText: document.getElementById('output-content')?.textContent?.trim(),
      outputStatus: document.getElementById('output-status')?.textContent,
    };
  });
  console.log(`   Instances remaining: ${afterClear.instanceCount}`);
  console.log(`   Empty hint visible: ${afterClear.emptyHintVisible}`);
  console.log(`   Output status: "${afterClear.outputStatus}"`);

  await screenshot(page, 'studio-after-clear.png');

  // =====================================================================
  // KEYBOARD SHORTCUT: R to run
  // =====================================================================
  console.log('\n📋 KEYBOARD SHORTCUT: Press R to run');

  // First drag a block back so we have something to run
  const thirdBlockInfo = await page.evaluate(() => {
    const motionBlock = document.querySelector('.palette-block');
    if (!motionBlock) return null;
    const rect = motionBlock.getBoundingClientRect();
    return { cx: rect.x + rect.width/2, cy: rect.y + rect.height/2 };
  });

  if (thirdBlockInfo) {
    await page.mouse.move(thirdBlockInfo.cx, thirdBlockInfo.cy);
    await sleep(100);
    await page.mouse.down();
    await sleep(80);

    const wsCenter = dragTargets.workspace_center;
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(
        thirdBlockInfo.cx + (wsCenter.x - thirdBlockInfo.cx) * (i / 15),
        thirdBlockInfo.cy + (wsCenter.y - thirdBlockInfo.cy) * (i / 15)
      );
      await sleep(30);
    }
    await page.mouse.up();
    await sleep(300);
  }

  const beforeKeyRun = await page.evaluate(() => document.querySelectorAll('.block-instance').length);
  console.log(`   Blocks before R key: ${beforeKeyRun}`);

  await page.keyboard.press('r');
  await sleep(500);

  const afterKeyRun = await page.evaluate(() => {
    return {
      outputText: document.getElementById('output-content')?.textContent?.trim(),
      outputStatus: document.getElementById('output-status')?.textContent,
    };
  });
  console.log(`   After R key - output: "${afterKeyRun.outputText}"`);
  console.log(`   Status: "${afterKeyRun.outputStatus}"`);

  await screenshot(page, 'studio-keyboard-run.png');

  // =====================================================================
  // CHECK NETWORK REQUESTS
  // =====================================================================
  console.log('\n📋 CHECK RUN BUTTON NETWORK REQUESTS');

  // Set up network capture
  const runRequests = [];
  page.on('request', req => {
    if (req.isNavigationRequest()) return;
    runRequests.push(`${req.method()} ${req.url().substring(0, 120)}`);
  });

  // Click run
  await page.evaluate(() => document.getElementById('btn-run')?.click());
  await sleep(500);

  console.log(`   New requests triggered by Run: ${runRequests.length}`);
  for (const r of runRequests) {
    console.log(`     ${r}`);
  }

  // =====================================================================
  // CHECK JS STATE (instances array)
  // =====================================================================
  console.log('\n📋 CHECK JAVASCRIPT STATE');

  const jsState = await page.evaluate(() => {
    // Access the closure variable - we can check DOM for block-instance elements
    // which are the workspace instances
    const instances = document.querySelectorAll('.block-instance');
    
    // Check for the instances array in the script
    const scripts = [...document.querySelectorAll('script')];
    const mainScript = scripts[0]?.textContent || '';
    
    // Try to find the instances variable in the capture
    return {
      domInstanceCount: instances.length,
      scriptHasInstanceState: mainScript.includes('let instances = ['),
      scriptHasDragState: mainScript.includes('let drag = null'),
      scriptHasCatDefs: mainScript.includes('const CATEGORIES = ['),
      instanceElements: [...instances].map(el => ({
        id: el.dataset.id,
        left: el.style.left,
        top: el.style.top,
        text: el.querySelector('.block-body')?.textContent?.trim().substring(0, 60),
      })),
    };
  });
  console.log(`   DOM block-instance elements: ${jsState.domInstanceCount}`);
  console.log(`   Script has instances state variable: ${jsState.scriptHasInstanceState}`);
  console.log(`   Script has category definitions: ${jsState.scriptHasCatDefs}`);

  // =====================================================================
  // FINAL SUMMARY
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL DEEP TEST RESULTS');
  console.log('='.repeat(70));

  const summary = await page.evaluate(() => {
    return {
      title: document.title,
      paletteBlockCount: document.querySelectorAll('.palette-block').length,
      catCount: document.querySelectorAll('.cat').length,
      catNames: [...document.querySelectorAll('.cat')].map(c => c.dataset.cat),
      buttonTexts: [...document.querySelectorAll('button')].map(b => b.textContent?.trim()),
      workspaceInstanceCount: document.querySelectorAll('.block-instance').length,
      hasEmptyHint: document.getElementById('empty-hint')?.style.display !== 'none',
      viewportMeta: document.querySelector('meta[name="viewport"]')?.content,
      totalDOM: document.querySelectorAll('*').length,
    };
  });

  console.log(`   Title: ${summary.title}`);
  console.log(`   Palette blocks: ${summary.paletteBlockCount}`);
  console.log(`   Categories (${summary.catCount}): ${summary.catNames.join(', ')}`);
  console.log(`   Buttons: ${summary.buttonTexts.join(', ')}`);
  console.log(`   Workspace instances: ${summary.workspaceInstanceCount}`);
  console.log(`   Empty hint ${summary.hasEmptyHint ? 'visible' : 'hidden'}`);
  console.log(`   Viewport meta: ${summary.viewportMeta}`);
  console.log(`   Total DOM elements: ${summary.totalDOM}`);

  await browser.close();
  console.log('\n🏁 Deep test complete.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
