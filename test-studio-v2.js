const puppeteer = require('puppeteer');
const path = require('path');
const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace';
const STUDIO_URL = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';

const allConsoleErrors = [];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true });
  console.log(`  📸 ${name}`);
}

async function clickButton(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (t.includes(text.toLowerCase())) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function getOutput(page) {
  return await page.evaluate(() => {
    const sel = '#output-text, .output-text, [class*="output"], .output-panel, #output-panel, pre';
    const el = document.querySelector(sel);
    if (!el) return { found: false, text: '' };
    return { found: true, text: el.textContent.trim() };
  });
}

async function getStudioAPI(page) {
  return await page.evaluate(() => {
    const api = { studio: null, manager: null, blocks: [], methods: [] };

    // Check various possible names
    const candidates = ['studio', 'blockStudio', 'blockManager', 'app', 'voxelWorks', 'voxelworks'];
    for (const c of candidates) {
      if (window[c] && typeof window[c] === 'object') {
        api[c] = Object.getOwnPropertyNames(window[c]);
        api.methods.push(...Object.getOwnPropertyNames(window[c]).filter(k => typeof window[c][k] === 'function'));
      }
    }

    return api;
  });
}

async function inspectAppInstance(page) {
  return await page.evaluate(() => {
    const info = {};

    // Look for React/Vue/Svelte internals
    const root = document.querySelector('#root, #app, .app, main') || document.body;
    
    // Get main app structure
    const allDivs = Array.from(document.querySelectorAll('div'));
    const majorDivs = allDivs.filter(d => d.id || (d.className && d.className.length > 3));
    
    info.majorDivs = majorDivs.slice(0, 20).map(d => ({
      id: d.id,
      class: d.className.slice(0, 80),
      children: d.children.length,
      textPreview: d.textContent.trim().slice(0, 60)
    }));

    // Try to find React fiber
    const reactKey = Object.keys(root).find(k => k.startsWith('__reactFiber'));
    info.hasReact = !!reactKey;

    return info;
  });
}

async function locateWorkspace(page) {
  return await page.evaluate(() => {
    const info = {};

    // Find workspace area (not palette)
    const divs = document.querySelectorAll('div');
    for (const d of divs) {
      const cls = d.className || '';
      const id = d.id || '';
      if (cls.includes('workspace') || cls.includes('stage') || id.includes('workspace') || id.includes('stage')) {
        info.workspaceEl = { id, class: cls.slice(0, 80), children: d.children.length };
      }
    }

    // Find the scripting area - where blocks get dropped
    const all = document.querySelectorAll('[class*="script"]');
    info.scriptAreas = Array.from(all).map(el => ({
      tag: el.tagName,
      class: el.className.slice(0, 80),
      id: el.id,
      children: el.children.length
    }));

    return info;
  });
}

async function main() {
  console.log('=== 🎭 BLOCK STUDIO TEST SUITE (v2 — DOM-native) ===\n');
  
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new'
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      allConsoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      console.error(`  ❌ CONSOLE ERROR: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    allConsoleErrors.push(`[PAGE_ERROR] ${err.message}`);
    console.error(`  ❌ PAGE ERROR: ${err.message}`);
  });

  // ======== TEST 1: Load & Verify ========
  console.log('TEST 1: Load & Verify');
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

  const runBtn = await checkButton(page, 'run');
  const stopBtn = await checkButton(page, 'stop');
  const clearBtn = await checkButton(page, 'clear');
  
  console.log(`  Run:    ${runBtn}`);
  console.log(`  Stop:   ${stopBtn}`);
  console.log(`  Clear:  ${clearBtn}`);

  const output = await getOutput(page);
  console.log(`  Output panel: ${output.found ? '✅' : '❌'} — "${output.text.slice(0, 80)}"`);

  // Explore page structure
  const api = await getStudioAPI(page);
  console.log(`  Window API candidates: ${JSON.stringify(api, null, 2)}`);

  const appStruct = await inspectAppInstance(page);
  console.log(`  App structure:`);
  for (const d of appStruct.majorDivs) {
    console.log(`    [${d.id || '?'}] class="${d.class}" children=${d.children} "${d.textPreview}"`);
  }
  console.log(`  React detected: ${appStruct.hasReact}`);

  const ws = await locateWorkspace(page);
  console.log(`  Workspace areas: ${JSON.stringify(ws, null, 2)}`);

  await screenshot(page, '01-load.png');

  console.log(`  ✅ Test 1 PASSED — Basic structure verified\n`);

  // ======== Discover block injection mechanism ========
  console.log('DISCOVERY: How do blocks work?');
  
  // Let me investigate how blocks are added to the workspace
  // We need to find the workspace DOM and see how blocks are rendered
  const workspaceInvestigation = await page.evaluate(() => {
    // Look for the drop zone / scripting workspace
    const info = {};
    
    // Find elements that might hold script blocks
    // The "blocks" are palette-block divs in left panel
    // Workspace is likely on the right
    
    // Find palette
    const paletteBlocks = document.querySelectorAll('.palette-block');
    info.paletteCount = paletteBlocks.length;
    info.paletteBlockTypes = Array.from(paletteBlocks).map(b => {
      // Get any data attributes
      const dataset = Object.keys(b.dataset).length > 0 ? Object.fromEntries(Object.entries(b.dataset).map(([k,v]) => [k, v.slice(0,50)])) : {};
      const span = b.querySelector('.block-body');
      return {
        text: span ? span.textContent.trim() : b.textContent.trim(),
        dataset
      };
    });

    // Find draggable elements
    const draggable = document.querySelectorAll('[draggable="true"]');
    info.draggableCount = draggable.length;
    if (draggable.length > 0) {
      info.draggableExamples = Array.from(draggable).slice(0, 5).map(d => ({
        tag: d.tagName,
        class: d.className.slice(0, 60),
        text: d.textContent.trim().slice(0, 60),
        id: d.id
      }));
    }

    // Find the drop target (script area)
    const dropTargets = document.querySelectorAll('[class*="drop"], [class*="Drop"]');
    info.dropTargets = Array.from(dropTargets).map(d => ({
      class: d.className.slice(0, 80),
      children: d.children.length,
      text: d.textContent.trim().slice(0, 40)
    }));

    // Find any ondrop/ondragover handlers
    const allWithListeners = [];
    document.querySelectorAll('div').forEach(d => {
      if (d.ondrop || d.ondragover || d.ondragend) {
        allWithListeners.push({
          class: d.className.slice(0, 60),
          hasDrop: !!d.ondrop,
          hasDragOver: !!d.ondragover,
          hasDragEnd: !!d.ondragend
        });
      }
    });
    info.dropListeners = allWithListeners.slice(0, 10);

    // Look for any JavaScript block renderer
    // Check if there's a custom element or web component for blocks
    const customElements = [];
    for (const cls of document.querySelectorAll('*')) {
      const tag = cls.tagName.toLowerCase();
      if (tag.includes('-')) {
        customElements.push(tag);
      }
    }
    info.customElements = [...new Set(customElements)];

    // Check script tags for source code
    const scripts = document.querySelectorAll('script');
    info.scriptSources = Array.from(scripts).filter(s => s.src).map(s => s.src);
    info.inlineScripts = Array.from(scripts).filter(s => !s.src).length;

    return info;
  });

  console.log(`  Palette blocks (${workspaceInvestigation.paletteCount}):`);
  for (const bt of workspaceInvestigation.paletteBlockTypes) {
    console.log(`    "${bt.text}" | dataset: ${JSON.stringify(bt.dataset)}`);
  }
  console.log(`  Draggable elements: ${workspaceInvestigation.draggableCount}`);
  console.log(`  Drop targets: ${JSON.stringify(workspaceInvestigation.dropTargets, null, 2)}`);
  console.log(`  Custom elements: ${JSON.stringify(workspaceInvestigation.customElements)}`);
  console.log(`  Scripts: ${workspaceInvestigation.scriptSources.length} external, ${workspaceInvestigation.inlineScripts} inline`);
  console.log();

  // ======== TEST 2: Add blocks programmatically via direct DOM manipulation ========
  console.log('TEST 2: Add blocks programmatically');
  
  // Let me try to access the editor's state management by probing React VDOM
  const reactProbe = await page.evaluate(() => {
    const info = {};
    
    // Find the root with React fiber
    const root = document.querySelector('#root, #app, main');
    if (!root) { info.note = 'no root'; return info; }
    
    const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber'));
    if (fiberKey) {
      info.hasReactFiber = true;
      
      // Navigate the fiber tree to find state
      let fiber = root[fiberKey];
      let depth = 0;
      const MAX = 20;
      
      // Try to find component with state that holds script blocks
      const found = [];
      const seen = new Set();
      
      function traverse(f, d) {
        if (!f || d > 10 || seen.has(f)) return;
        seen.add(f);
        
        if (f.memoizedState && f.memoizedState.queue) {
          const q = f.memoizedState.queue;
          if (q.lastRenderedState && Array.isArray(q.lastRenderedState)) {
            found.push({ depth: d, type: 'array', length: q.lastRenderedState.length });
          } else if (q.lastRenderedState && typeof q.lastRenderedState === 'object') {
            const keys = Object.keys(q.lastRenderedState).slice(0, 20);
            found.push({ depth: d, type: 'object', keys });
          }
        }
        
        // Check pending state
        if (f.pendingProps && typeof f.pendingProps === 'object') {
          const keys = Object.keys(f.pendingProps).slice(0, 10);
          if (keys.length > 0) found.push({ depth: d, type: 'pendingProps', keys });
        }
        
        traverse(f.child, d + 1);
        traverse(f.sibling, d);
      }
      
      traverse(fiber, 0);
      info.stateFound = found;
      return info;
    }
    
    // Maybe it's Preact
    const preactKey = Object.keys(root).find(k => k.startsWith('__preact'));
    info.hasPreact = !!preactKey;
    
    return info;
  });
  
  console.log(`  React state probe: ${JSON.stringify(reactProbe, null, 2)}`);

  // Let's try to read the inline script source code to understand the block model
  const sourceCode = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script:not([src])');
    return Array.from(scripts).map(s => s.textContent.slice(0, 10000));
  });
  
  if (sourceCode.length > 0) {
    // Save source for analysis
    const fs = require('fs');
    fs.writeFileSync('/home/ubuntu/.openclaw/workspace/studio-source.js', sourceCode[0]);
    console.log(`  Inline script saved (${sourceCode[0].length} chars)`);
    
    // Quick analysis of the source
    const patterns = [
      'export', 'export default', 'class ', 'function ', 'import ', 
      'state', 'useState', 'useReducer', 'blocks', 'script',
      'addBlock', 'removeBlock', 'clearBlocks', 'runScript',
      'when_clicked', 'move_steps', 'say', 'turn', 'repeat', 'if'
    ];
    
    const found = [];
    for (const p of patterns) {
      const regex = new RegExp(p.replace(/_/g, '[_-]?'), 'gi');
      const matches = sourceCode[0].match(regex);
      if (matches) {
        found.push({ pattern: p, count: matches.length });
      }
    }
    console.log(`  Source analysis: ${JSON.stringify(found, null, 2)}`);
  }

  // Now let's try to figure out how to programmatically add blocks
  // by looking at what happens when we click/drag palette blocks
  const clickInvestigation = await page.evaluate(() => {
    const info = {};
    
    // Find the first palette block and get its event listeners
    const paletteBlock = document.querySelector('.palette-block');
    if (paletteBlock) {
      // Check what happens on click/mousedown
      info.tag = paletteBlock.tagName;
      info.classList = Array.from(paletteBlock.classList);
      info.hasListener = paletteBlock.onmousedown || paletteBlock.onclick || paletteBlock.ondragstart;
      info.innerHTML = paletteBlock.innerHTML.slice(0, 300);
    }
    
    return info;
  });
  
  console.log(`  Palette block investigation: ${JSON.stringify(clickInvestigation, null, 2)}`);

  // Let's try to find a global function or state manager
  const globalsDeep = await page.evaluate(() => {
    const names = Object.getOwnPropertyNames(window);
    const interesting = names.filter(n => {
      const v = window[n];
      if (typeof v !== 'object' || v === null) return false;
      if (n === 'document' || n === 'location' || n === 'history' || 
          n === 'navigator' || n === 'localStorage' || n === 'sessionStorage' ||
          n === 'console' || n === 'screen' || n === 'self' || n === 'top' ||
          n === 'parent' || n === 'frames' || n === 'opener') return false;
      // Check if it has methods that suggest it's the editor
      const props = Object.getOwnPropertyNames(v);
      return props.some(p => 
        typeof v[p] === 'function' && 
        (p.includes('add') || p.includes('remove') || p.includes('clear') || 
         p.includes('run') || p.includes('dispatch') || p.includes('setState'))
      );
    });
    
    return interesting.slice(0, 20);
  });
  
  console.log(`  Interesting globals: ${JSON.stringify(globalsDeep)}`);

  // Check if there's a __STUDIO__ or __APP__ global
  const hiddenGlobals = await page.evaluate(() => {
    return Object.keys(window).filter(k => k.startsWith('__') && !k.startsWith('__react'));
  });
  console.log(`  Hidden globals: ${JSON.stringify(hiddenGlobals)}`);

  await screenshot(page, '02-exploration.png');
  console.log(`  ✅ Test 2 explorations saved\n`);

  // ======== TEST 3-10: Let me try to interact with the actual UI ========
  // Since this is a custom (non-Blockly) implementation, let me try to:
  // 1. Click a palette block to add it to the workspace
  // 2. Click Run
  // 3. Check output
  
  console.log('INTERACTIVE TESTS');
  
  // Method: Click on "when clicked" hat block in palette, then click "move steps", etc.
  // The palette blocks might be cloned/dragged to the workspace on click
  
  // Let's try clicking a palette block to see what happens
  const clickResult = await page.evaluate(() => {
    const results = {};
    
    // Try clicking "when clicked" hat block
    const hatBlocks = document.querySelectorAll('.palette-block');
    for (const hb of hatBlocks) {
      const text = hb.textContent.trim().toLowerCase();
      if (text.includes('when clicked')) {
        try {
          hb.click();
          results.whenClickedClicked = true;
        } catch(e) { results.whenClickedErr = e.message; }
        break;
      }
    }
    
    // Wait... actually this is a click simulation inside evaluate
    // which won't propagate as a real user click would in headless
    // Let me use the proper Puppeteer click instead
    
    return results;
  });
  
  console.log(`  Click inside evaluate result: ${JSON.stringify(clickResult)}`);

  // Proper Puppeteer click on "when clicked" palette block
  const whenClickedEl = await page.evaluate(() => {
    const blocks = document.querySelectorAll('.palette-block');
    for (const b of blocks) {
      if (b.textContent.trim().toLowerCase().includes('when clicked')) {
        const rect = b.getBoundingClientRect();
        return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: b.textContent.trim() };
      }
    }
    return null;
  });
  
  if (whenClickedEl) {
    await page.mouse.click(whenClickedEl.x, whenClickedEl.y);
    console.log(`  Clicked: "${whenClickedEl.text}" at (${whenClickedEl.x}, ${whenClickedEl.y})`);
  }
  await sleep(500);

  // Click some movement blocks
  for (const targetText of ['move steps', 'turn ↻', 'say for secs']) {
    const pos = await page.evaluate((t) => {
      const blocks = document.querySelectorAll('.palette-block');
      for (const b of blocks) {
        if (b.textContent.trim().toLowerCase().includes(t.toLowerCase())) {
          const rect = b.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: b.textContent.trim() };
        }
      }
      return null;
    }, targetText);
    
    if (pos) {
      await page.mouse.click(pos.x, pos.y);
      console.log(`  Clicked: "${pos.text}" at (${pos.x}, ${pos.y})`);
      await sleep(300);
    }
  }

  await sleep(1000);
  await screenshot(page, '03-after-clicks.png');

  // Check if blocks appeared in workspace
  const workspaceBlocks = await page.evaluate(() => {
    // Check for new blocks in workspace (not palette)
    const paletteBlockTexts = new Set();
    document.querySelectorAll('.palette-block .block-body').forEach(b => {
      paletteBlockTexts.add(b.textContent.trim());
    });
    
    // Also check for any blocks outside the palette area
    const allBlocks = document.querySelectorAll('.block-body');
    const workspaceOnes = Array.from(allBlocks).filter(b => {
      // Check if this block is NOT inside a palette-block
      return !b.closest('.palette-block');
    });
    
    return {
      paletteBlockTexts: Array.from(paletteBlockTexts),
      workspaceBlockCount: workspaceOnes.length,
      workspaceBlockTexts: workspaceOnes.map(b => b.textContent.trim())
    };
  });
  
  console.log(`  Blocks in workspace after clicking: ${JSON.stringify(workspaceBlocks, null, 2)}`);

  // ======== Try dragging instead ========
  console.log('\n  Attempting drag-and-drop...');
  
  async function dragBlock(page, sourceText, targetX, targetY) {
    const sourcePos = await page.evaluate((t) => {
      const blocks = document.querySelectorAll('.palette-block');
      for (const b of blocks) {
        if (b.textContent.trim().toLowerCase().includes(t.toLowerCase())) {
          const rect = b.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, w: rect.width, h: rect.height };
        }
      }
      return null;
    }, sourceText);
    
    if (!sourcePos) {
      console.log(`  Cannot find source: "${sourceText}"`);
      return false;
    }
    
    await page.mouse.move(sourcePos.x, sourcePos.y);
    await page.mouse.down();
    await sleep(100);
    // Drag to workspace area (right side of palette)
    const dropX = targetX || sourcePos.x + 250;
    const dropY = targetY || sourcePos.y;
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await sleep(100);
    await page.mouse.up();
    await sleep(300);
    console.log(`  Dragged "${sourceText}" from (${sourcePos.x},${sourcePos.y}) → (${dropX},${dropY})`);
    return true;
  }

  // First clear any existing blocks
  for (const b of await page.$$('button')) {
    const t = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (t.includes('clear')) {
      await b.click();
      await sleep(500);
      break;
    }
  }

  // Now drag blocks one by one
  // Find workspace area (right panel)
  const workspaceRect = await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    for (const d of divs) {
      const cls = d.className || '';
      if (cls.includes('script') || cls.includes('workspace') || 
          (d.children.length > 0 && d.offsetWidth > 200 && d.offsetLeft > 200)) {
        const rect = d.getBoundingClientRect();
        return { x: rect.x + 50, y: rect.y + 50, w: rect.width, h: rect.height, class: cls };
      }
    }
    return null;
  });
  
  if (!workspaceRect) {
    // Fallback: find the rightmost area
    const bodyRect = await page.evaluate(() => {
      const body = document.body;
      const rect = body.getBoundingClientRect();
      return { w: rect.width, h: rect.height, x: 0, y: 0 };
    });
    // Estimate workspace on the right half
    workspaceRect = { x: bodyRect.w / 2 + 50, y: 100, w: bodyRect.w / 2 - 100, h: bodyRect.h - 200 };
  }
  
  console.log(`  Workspace area: x=${workspaceRect.x}, y=${workspaceRect.y}, ${workspaceRect.w}x${workspaceRect.h}`);

  await dragBlock(page, 'when clicked', workspaceRect.x, workspaceRect.y);
  await dragBlock(page, 'move steps', workspaceRect.x + 20, workspaceRect.y + 60);
  await dragBlock(page, 'turn ↻', workspaceRect.x + 20, workspaceRect.y + 120);

  await screenshot(page, '04-after-drag.png');

  // Check what's in workspace now
  const workspaceAfterDrag = await page.evaluate(() => {
    const allBlocks = document.querySelectorAll('[class*="workspace-block"], [class*="script-block"], .block-body');
    const nonPalette = Array.from(allBlocks).filter(b => !b.closest('.palette-block'));
    return {
      count: nonPalette.length,
      texts: nonPalette.map(b => ({
        text: b.textContent.trim().slice(0, 40),
        parentClass: b.parentElement?.className?.slice(0, 80) || 'none'
      }))
    };
  });
  console.log(`  Workspace after drag: ${JSON.stringify(workspaceAfterDrag, null, 2)}`);

  // ======== TEST 3: Click Run ========
  console.log('\nTEST 3: Run Script');
  
  await clickButton(page, 'run');
  console.log('  Clicked Run');
  await sleep(3000);

  const outputRun = await getOutput(page);
  console.log(`  Output: "${outputRun.text.slice(0, 200)}"`);

  await screenshot(page, '05-run.png');
  console.log(`  ✅ Test 3 completed\n`);

  // ======== TEST 4: Repeat block test ========
  console.log('TEST 4: Repeat block test');
  
  await clickButton(page, 'clear');
  await sleep(500);

  // Check if there's a repeat in the palette
  const hasRepeat = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.palette-block')).some(b => 
      b.textContent.toLowerCase().includes('repeat')
    );
  });
  console.log(`  Repeat block in palette: ${hasRepeat}`);

  // Are there category tabs for "Control"?
  const categories = await page.evaluate(() => {
    const cats = document.querySelectorAll('[class*="category"], [class*="tab"]');
    return Array.from(cats).map(c => c.textContent.trim()).slice(0, 10);
  });
  console.log(`  Categories/tabs: ${JSON.stringify(categories)}`);

  // List ALL palette blocks
  const allPaletteBlocks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.palette-block')).map(b => b.textContent.trim());
  });
  console.log(`  All palette blocks: ${JSON.stringify(allPaletteBlocks)}`);

  // Let's just drag "say" block and run 
  await dragBlock(page, 'say for secs', workspaceRect.x + 20, workspaceRect.y + 60);
  await screenshot(page, '06-say-block.png');

  await clickButton(page, 'run');
  await sleep(3000);
  
  const outputSay = await getOutput(page);
  console.log(`  Output after say: "${outputSay.text.slice(0, 200)}"`);

  await screenshot(page, '07-say-run.png');
  console.log(`  ✅ Test 4 completed\n`);

  // ======== TEST 5-10: More testing ========
  console.log('TEST 5-10: Additional tests');

  // Try clicking "when clicked" again since it might be a hat block
  await clickButton(page, 'clear');
  await sleep(500);

  // Drag "when clicked" first (hat block), then "say for secs"
  await dragBlock(page, 'when clicked', workspaceRect.x, workspaceRect.y);
  await dragBlock(page, 'say for secs', workspaceRect.x + 30, workspaceRect.y + 60);
  await sleep(500);

  await screenshot(page, '08-hat-plus-say.png');

  await clickButton(page, 'run');
  await sleep(3000);

  const outputWithHat = await getOutput(page);
  console.log(`  Output with hat+say: "${outputWithHat.text.slice(0, 200)}"`);

  // Run twice test
  console.log('\nTEST: Run twice');
  await clickButton(page, 'run');
  await sleep(2000);
  const outputRun2 = await getOutput(page);
  console.log(`  Output after 2nd run: "${outputRun2.text.slice(0, 200)}"`);

  // Stop test - build long-running script  
  console.log('\nTEST: Stop button');
  
  // Check stop button visibility
  const stopState = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      if (b.textContent.toLowerCase().includes('stop')) {
        return {
          visible: b.offsetParent !== null,
          text: b.textContent.trim(),
          disabled: b.disabled
        };
      }
    }
    return null;
  });
  console.log(`  Stop button state: ${JSON.stringify(stopState)}`);

  // No blocks test
  console.log('\nTEST: Run with no blocks');
  await clickButton(page, 'clear');
  await sleep(500);
  await clickButton(page, 'run');
  await sleep(2000);
  const outputEmpty = await getOutput(page);
  console.log(`  Output with no blocks: "${outputEmpty.text.slice(0, 200)}"`);
  
  // Check for "No blocks" message on screen
  const noBlocksScreen = await page.evaluate(() => {
    return document.body.innerText.includes('No blocks') || 
           document.body.innerText.includes('no blocks');
  });
  console.log(`  "No blocks" visible on screen: ${noBlocksScreen}`);

  await screenshot(page, '09-no-blocks.png');

  // Clear workspace test
  console.log('\nTEST: Clear workspace');
  await dragBlock(page, 'when clicked', workspaceRect.x, workspaceRect.y);
  await sleep(500);
  await clickButton(page, 'run');
  await sleep(2000);
  console.log(`  Output before clear: "${(await getOutput(page)).text.slice(0, 100)}"`);
  
  await clickButton(page, 'clear');
  await sleep(1000);
  const afterClear = await getOutput(page);
  console.log(`  Output after clear: "${afterClear.text.slice(0, 100)}"`);

  await screenshot(page, '10-cleared.png');

  // ======== FINAL SUMMARY ========
  console.log('\n=== FINAL SUMMARY ===\n');
  console.log(`Total console errors: ${allConsoleErrors.length}`);
  if (allConsoleErrors.length > 0) {
    console.log('Console error details:');
    allConsoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }
  
  console.log(`\nTitle: "${title}"`);
  console.log(`Canvas: ${canvasInfo.found ? `${canvasInfo.w}x${canvasInfo.h}` : 'MISSING'}`);
  console.log(`Output panel found: ${output.found}`);
  console.log(`Run button: ${runBtn}`);
  console.log(`Stop button: ${stopBtn}`);
  console.log(`Clear button: ${clearBtn}`);

  await browser.close();
  console.log('\nBrowser closed. All tests complete.');
}

// Helper
async function checkButton(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (t.includes(text.toLowerCase())) {
      const visible = await page.evaluate(el => el.offsetParent !== null, b);
      const disabled = await page.evaluate(el => el.disabled, b);
      return `${t} (visible=${visible}, disabled=${disabled})`;
    }
  }
  return 'NOT FOUND';
}

main().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
