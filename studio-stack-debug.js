const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log(`  [CONSOLE] ${msg.text()}`));

  await page.goto('https://voxelworks-fix.casey-digennaro.workers.dev/studio', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // Ensure all categories open
  await page.evaluate(() => {
    document.querySelectorAll('.cat-header').forEach(h => h.click());
    document.querySelectorAll('.cat-header').forEach(h => h.click()); // all open
  });
  await sleep(300);

  // Get workspace position for reference
  const ref = await page.evaluate(() => {
    const ws = document.querySelector('#workspace');
    const wr = ws.getBoundingClientRect();
    const pal = document.querySelector('.palette');
    const pr = pal.getBoundingClientRect();
    return { ws: { x: wr.x, y: wr.y, w: wr.width, h: wr.height }, pal: { x: pr.x, y: pr.y, w: pr.width, h: pr.height } };
  });
  console.log(`   palette: x=${ref.pal.x} w=${ref.pal.w}`);
  console.log(`   workspace: x=${ref.ws.x} w=${ref.ws.w}`);

  // Drag "move" block to workspace (well inside)
  const mBlock = await page.evaluate(() => {
    const b = document.querySelector('.palette-block');
    const r = b.getBoundingClientRect();
    return { cx: r.x + r.width/2, cy: r.y + r.height/2 };
  });
  console.log(`   move block at: (${Math.round(mBlock.cx)}, ${Math.round(mBlock.cy)})`);

  // Drag to workspace center-ish
  const dest1 = { x: ref.ws.x + 60, y: ref.ws.y + 60 };
  
  await page.mouse.move(mBlock.cx, mBlock.cy);
  await sleep(50);
  await page.mouse.down();
  await sleep(50);
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(
      mBlock.cx + (dest1.x - mBlock.cx) * (i / 15),
      mBlock.cy + (dest1.y - mBlock.cy) * (i / 15)
    );
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(300);

  const block1 = await page.evaluate(() => {
    const i = document.querySelector('.block-instance');
    if (!i) return null;
    const r = i.getBoundingClientRect();
    return { id: i.dataset.id, x: parseInt(i.style.left), y: parseInt(i.style.top), screenX: Math.round(r.x), screenY: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log(`   Block 1 at workspace(${block1?.x}, ${block1?.y}) screen(${block1?.screenX}, ${block1?.screenY})`);

  // Now get the "when clicked" hat block (Control, first block) - it's a hat, doesn't overlap
  const cBlock = await page.evaluate(() => {
    const controlCat = [...document.querySelectorAll('.cat')].find(c => c.dataset.cat === 'control');
    if (!controlCat) return null;
    const body = controlCat.querySelector('.cat-body');
    const header = controlCat.querySelector('.cat-header');
    if (!body.classList.contains('open')) header.click();
    
    // The hat block might be first
    const first = controlCat.querySelector('.palette-block');
    if (!first) return null;
    const r = first.getBoundingClientRect();
    return { cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2), text: first.textContent?.trim() };
  });
  console.log(`   Control "when clicked" at: (${cBlock?.cx}, ${cBlock?.cy}) "${cBlock?.text}"`);

  if (cBlock && block1) {
    // Drag it to the workspace, BELOW the move block, at same x
    // Target: same X as block1, Y just below block1
    const targetX = block1.screenX + 20;
    const targetY = block1.screenY + block1.h + 40;
    
    console.log(`   Dragging to: (${targetX}, ${targetY})`);
    console.log(`   Palette right edge: ${ref.pal.x + ref.pal.w}`);
    console.log(`   In workspace? x=${targetX >= ref.ws.x && targetX <= ref.ws.x + ref.ws.w}, y=${targetY >= ref.ws.y && targetY <= ref.ws.y + ref.ws.h}`);

    await page.mouse.move(cBlock.cx, cBlock.cy);
    await sleep(50);
    await page.mouse.down();
    await sleep(50);
    for (let i = 1; i <= 20; i++) {
      const x = cBlock.cx + (targetX - cBlock.cx) * (i / 20);
      const y = cBlock.cy + (targetY - cBlock.cy) * (i / 20);
      if (isFinite(x) && isFinite(y)) {
        await page.mouse.move(x, y);
        await sleep(15);
      }
    }
    await page.mouse.up();
    await sleep(500);
  }

  const after = await page.evaluate(() => {
    const instances = document.querySelectorAll('.block-instance');
    return {
      count: instances.length,
      blocks: [...instances].map(el => ({
        text: el.querySelector('.block-body')?.textContent?.trim().substring(0, 50),
        left: el.style.left,
        top: el.style.top,
      })),
      state: typeof window.__internalInstances !== 'undefined' ? 'has state' : 'no state access',
    };
  });
  console.log(`   After second drag: ${after.count} blocks`);
  for (const b of after.blocks) console.log(`     "${b.text}" at (${b.left}, ${b.top})`);

  // Now try with the SAME block type (move steps) - drag directly next to existing block
  // Clear first
  await page.evaluate(() => document.getElementById('btn-clear')?.click());
  await sleep(300);

  // Place one block
  await page.mouse.move(mBlock.cx, mBlock.cy);
  await sleep(50);
  await page.mouse.down();
  await sleep(50);
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(
      mBlock.cx + (dest1.x - mBlock.cx) * (i / 15),
      mBlock.cy + (dest1.y - mBlock.cy) * (i / 15)
    );
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(300);

  const b1 = await page.evaluate(() => {
    const i = document.querySelector('.block-instance');
    if (!i) return null;
    const r = i.getBoundingClientRect();
    return { id: i.dataset.id, x: parseInt(i.style.left), y: parseInt(i.style.top), screenX: Math.round(r.x), screenY: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log(`\n   Second attempt - block 1 at (${b1?.screenX}, ${b1?.screenY})`);

  // Drag another move block very close below the first one  
  const closeTarget = { x: b1.screenX + 10, y: b1.screenY + b1.h + 15 };
  console.log(`   Dragging second move block to (${closeTarget.x}, ${closeTarget.y})`);

  await page.mouse.move(mBlock.cx, mBlock.cy);
  await sleep(50);
  await page.mouse.down();
  await sleep(50);
  for (let i = 1; i <= 20; i++) {
    const x = mBlock.cx + (closeTarget.x - mBlock.cx) * (i / 20);
    const y = mBlock.cy + (closeTarget.y - mBlock.cy) * (i / 20);
    await page.mouse.move(x, y);
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(500);

  const final = await page.evaluate(() => ({
    count: document.querySelectorAll('.block-instance').length,
    blocks: [...document.querySelectorAll('.block-instance')].map(el => ({
      text: el.querySelector('.block-body')?.textContent?.trim().substring(0, 50),
      left: parseInt(el.style.left),
      top: parseInt(el.style.top),
      id: el.dataset.id,
    })),
    jsState: typeof instances !== 'undefined' ? instances.length : '(inaccessible)',
  }));
  console.log(`   Final: ${final.count} blocks`);
  for (const b of final.blocks) console.log(`     id=${b.id} "${b.text}" at (${b.left}, ${b.top})`);

  // Check if blocks have parent-child relationships
  const snapCheck = await page.evaluate(() => {
    // The instances array is in a closure, not accessible from here
    // But we can check the DOM structure
    const instances = document.querySelectorAll('.block-instance');
    // Check data attributes for parent references
    return [...instances].map(el => ({
      id: el.dataset.id,
      parent: el.dataset.parent,
    }));
  });
  console.log(`   Instance parent refs: ${JSON.stringify(snapCheck)}`);

  // Final test: Drag a hat block (when clicked) - should snap on top
  console.log(`\n   Testing hat block positioning...`);
  const hatBlock = await page.evaluate(() => {
    const controlCat = [...document.querySelectorAll('.cat')].find(c => c.dataset.cat === 'control');
    const hat = controlCat?.querySelector('.palette-block.hat');
    if (hat) {
      const r = hat.getBoundingClientRect();
      return { cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2), text: hat.textContent?.trim() };
    }
    return null;
  });
  if (hatBlock) {
    const hatDest = { x: b1.screenX, y: b1.screenY - 30 };
    console.log(`   Hat block at (${hatBlock.cx}, ${hatBlock.cy}), target (${hatDest.x}, ${hatDest.y})`);
    
    await page.mouse.move(hatBlock.cx, hatBlock.cy);
    await sleep(50);
    await page.mouse.down();
    await sleep(50);
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(
        hatBlock.cx + (hatDest.x - hatBlock.cx) * (i / 20),
        hatBlock.cy + (hatDest.y - hatBlock.cy) * (i / 20)
      );
      await sleep(15);
    }
    await page.mouse.up();
    await sleep(500);

    const final2 = await page.evaluate(() => ({
      count: document.querySelectorAll('.block-instance').length,
      blocks: [...document.querySelectorAll('.block-instance')].map(el => ({
        text: el.querySelector('.block-body')?.textContent?.trim().substring(0, 50),
        left: parseInt(el.style.left),
        top: parseInt(el.style.top),
        id: el.dataset.id,
      })),
    }));
    console.log(`   After hat drag: ${final2.count} blocks`);
    for (const b of final2.blocks) console.log(`     id=${b.id} "${b.text}" at (${b.left}, ${b.top})`);
  }

  await browser.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
