#!/usr/bin/env node
/**
 * Block Studio Comprehensive Puppeteer Test
 * Tests: load, category expansion, drag, run, clear, console, keyboard, network, responsive
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const WORKSPACE = '/home/ubuntu/.openclaw/workspace';
const SITE = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function screenshot(page, name) {
  const dest = path.join(WORKSPACE, name);
  await page.screenshot({ path: dest, fullPage: true });
  console.log(`  📸 Saved screenshot: ${name}`);
  return dest;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔷 BLOCK STUDIO COMPREHENSIVE TEST');
  console.log('='.repeat(70));
  console.log(`URL: ${SITE}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
  });

  const page = await browser.newPage();

  // Collect ALL console messages
  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];
  const networkRequests = [];

  page.on('console', msg => {
    const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(entry);
    console.log(`  🖥️  CONSOLE: ${entry}`);
  });

  page.on('pageerror', err => {
    const entry = `[PAGE_ERROR] ${err.message}`;
    pageErrors.push(entry);
    console.error(`  ❌ PAGE_ERR: ${entry}`);
  });

  page.on('request', req => {
    if (req.isNavigationRequest() || req.url().includes('data:')) return;
    networkRequests.push({ url: req.url(), method: req.method(), type: req.resourceType() });
  });

  page.on('response', resp => {
    // Track responses too
  });

  // Inject a helper function to wait for dynamic content
  await page.evaluateOnNewDocument(() => {
    window.__testState = window.__testState || { interactions: [] };
  });

  // =====================================================================
  // 1. LOAD & VERIFY
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 1: Load & Verify');
  console.log('─'.repeat(70));

  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, 'studio-loaded.png');

  // Check title
  const title = await page.title();
  console.log(`   Title: "${title}"`);
  console.log(`   Expected: "VoxelWorks Block Studio"`);
  console.log(`   ✅ Match: ${title === 'VoxelWorks Block Studio' ? 'YES' : 'NO'}`);

  // Check for category headers
  const expectedCategories = ['Motion', 'Looks', 'Control', 'Sound'];
  for (const cat of expectedCategories) {
    const found = await page.evaluate((c) => {
      const body = document.body.innerText;
      return body.includes(c);
    }, cat);
    console.log(`   Category "${cat}" visible in page: ${found ? '✅' : '❌'}`);
  }

  // Dump page structure info
  const pageInfo = await page.evaluate(() => {
    return {
      bodyTag: document.body.tagName,
      bodyClasses: document.body.className,
      divCount: document.querySelectorAll('div').length,
      buttonCount: document.querySelectorAll('button').length,
      headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      allText: document.body.innerText.substring(0, 2000),
      htmlSize: document.documentElement.outerHTML.length,
    };
  });
  console.log(`   Body classes: "${pageInfo.bodyClasses}"`);
  console.log(`   Divs: ${pageInfo.divCount}, Buttons: ${pageInfo.buttonCount}, Headings: ${pageInfo.headingCount}`);
  console.log(`   DOM size: ${pageInfo.htmlSize} chars`);

  // =====================================================================
  // 2. CATEGORY EXPANSION
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 2: Category Expansion');
  console.log('─'.repeat(70));

  // Try to find clickable category elements
  const categoryClickInfo = await page.evaluate(() => {
    // Try various selectors for categories
    const results = [];
    
    // Look for elements with category text
    const motions = [...document.querySelectorAll('*')].filter(el => 
      el.children.length === 0 && el.textContent.trim() === 'Motion'
    );
    results.push({ selector: 'elements with text "Motion"', count: motions.length, tag: motions[0]?.tagName, class: motions[0]?.className });

    // Look for divs that might be sidebar/category containers
    const possibleCategories = [...document.querySelectorAll('[class*="categor"], [class*="palette"], [class*="sidebar"], [class*="block"], [class*="category"]')];
    results.push({ selector: 'class-contains-category/palette/block/sidebar', count: possibleCategories.length, samples: possibleCategories.slice(0,5).map(e => `${e.tagName}.${e.className}`) });

    // Look for all button-like elements
    const buttons = [...document.querySelectorAll('button, [role="button"], [onclick], .clickable')];
    results.push({ selector: 'all clickable elements', count: buttons.length, texts: buttons.slice(0,20).map(b => b.textContent?.trim()).filter(Boolean) });

    // Check if page uses Shadow DOM
    results.push({ selector: 'shadow roots', count: document.querySelectorAll('*').length - document.querySelectorAll(':not(:defined)').length });

    return results;
  });

  console.log('   Category DOM analysis:');
  for (const r of categoryClickInfo) {
    console.log(`     ${r.selector}: count=${r.count}`);
    if (r.samples) console.log(`       samples: ${JSON.stringify(r.samples)}`);
    if (r.texts) console.log(`       button texts: ${JSON.stringify(r.texts)}`);
  }

  // Try clicking on text elements containing category names
  const clickResults = [];
  for (const cat of expectedCategories) {
    const result = await page.evaluate((c) => {
      // Find text node or element containing exactly this category name
      const allEls = [...document.querySelectorAll('*')];
      const target = allEls.find(el => 
        el.children.length === 0 && 
        el.textContent?.trim() === c &&
        el.offsetParent !== null // visible
      );
      if (target) {
        const rect = target.getBoundingClientRect();
        target.click();
        return { found: true, tag: target.tagName, text: target.textContent?.trim(), rect: `${rect.x},${rect.y} ${rect.width}x${rect.height}`, class: target.className, id: target.id };
      }
      // Fallback: find any visible element containing the text
      const fallback = allEls.find(el => 
        el.textContent?.trim() === c && el.offsetParent !== null
      );
      if (fallback) {
        fallback.click();
        return { found: true, tag: fallback.tagName, text: fallback.textContent?.trim(), class: fallback.className, fallback: true };
      }
      return { found: false };
    }, cat);
    clickResults.push({ category: cat, result });
    console.log(`   Click "${cat}": ${result.found ? '✅ clicked' : '❌ not found'}`);
    if (result.found) {
      console.log(`     element: <${result.tag}${result.id ? '#'+result.id : ''} class="${result.class}">${result.text}</${result.tag}>`);
      if (result.rect) console.log(`     rect: ${result.rect}`);
    }
  }

  // Take screenshots after each click attempt (re-use click results to screenshot named states)
  for (const cat of expectedCategories) {
    await screenshot(page, `studio-category-${cat.toLowerCase()}.png`);
  }

  // After all clicks, check if anything changed
  const afterClickState = await page.evaluate(() => {
    return {
      scrollY: window.scrollY,
      bodyInnerHTML: document.body.innerHTML.substring(0, 500),
    };
  });

  // =====================================================================
  // 3. DRAG A BLOCK
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 3: Drag a Block');
  console.log('─'.repeat(70));

  const blockDragInfo = await page.evaluate(() => {
    const results = {};
    
    // Look for draggable elements
    const draggables = [...document.querySelectorAll('[draggable="true"], .draggable, [class*="drag"]')];
    results.draggableElements = draggables.map(el => ({
      tag: el.tagName,
      class: el.className,
      id: el.id,
      text: el.textContent?.trim().substring(0, 100),
      draggableAttr: el.getAttribute('draggable'),
    }));

    // Look for elements that look like blocks (colored, shaped divs)
    const blockLikes = [...document.querySelectorAll('[class*="block"], [class*="Block"]')];
    results.blockElements = blockLikes.map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.textContent?.trim().substring(0, 80),
      rect: (() => { try { const r = el.getBoundingClientRect(); return `${r.x},${r.y} ${r.width}x${r.height}`; } catch(e) { return 'hidden'; } })(),
    }));

    // Check for canvas / SVG elements (scratch uses canvas sometimes)
    results.canvasElements = [...document.querySelectorAll('canvas, svg')].map(el => ({
      tag: el.tagName,
      class: el.className,
      width: el.width || el.getAttribute?.('width'),
      height: el.height || el.getAttribute?.('height'),
    }));

    // Look for a workspace area
    const workspaceEls = [...document.querySelectorAll('[class*="workspace"], [class*="Work"], [class*="stage"], [class*="Stage"], [id*="workspace"], [id*="Work"]')];
    results.workspaceElements = workspaceEls.map(el => ({
      tag: el.tagName,
      class: el.className,
      id: el.id,
      rect: (() => { try { const r = el.getBoundingClientRect(); return `${r.x},${r.y} ${r.width}x${r.height}`; } catch(e) { return 'hidden'; } })(),
    }));

    return results;
  });

  console.log(`   Draggable elements: ${blockDragInfo.draggableElements.length}`);
  for (const el of blockDragInfo.draggableElements) {
    console.log(`     <${el.tag} class="${el.class}" draggable=${el.draggableAttr}> ${el.text}`);
  }

  console.log(`   Block-like elements: ${blockDragInfo.blockElements.length}`);
  for (const el of blockDragInfo.blockElements) {
    console.log(`     <${el.tag} class="${el.class}"> ${el.text} [${el.rect}]`);
  }

  console.log(`   Canvas/SVG elements: ${blockDragInfo.canvasElements.length}`);
  for (const el of blockDragInfo.canvasElements) {
    console.log(`     <${el.tag} x ${el.width} y ${el.height}>`);
  }

  console.log(`   Workspace areas: ${blockDragInfo.workspaceElements.length}`);
  for (const el of blockDragInfo.workspaceElements) {
    console.log(`     <${el.tag}${el.id ? '#'+el.id : ''} class="${el.class}"> [${el.rect}]`);
  }

  // Try to simulate drag
  const dragResult = await page.evaluate(() => {
    // Find best block candidate
    const candidates = [...document.querySelectorAll('[class*="block"], [class*="Block"], [class*="drag"]')];
    if (candidates.length === 0) return { success: false, reason: 'No block candidates found' };
    
    const block = candidates[0];
    const rect = block.getBoundingClientRect();
    
    // Try creating and dispatching drag events
    const dataTransfer = new DataTransfer();
    const dragStart = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer });
    const drag = new DragEvent('drag', { bubbles: true, cancelable: true, dataTransfer });
    
    const dragResult = block.dispatchEvent(dragStart);
    block.dispatchEvent(drag);
    
    return {
      success: true,
      blockText: block.textContent?.trim().substring(0, 100),
      rect: `${rect.x},${rect.y} ${rect.width}x${rect.height}`,
      dragStartResult: dragResult,
      dataTransferItems: dataTransfer.items.length,
    };
  });
  console.log(`   Drag attempt: ${dragResult.success ? '✅' : '❌'} ${dragResult.reason || ''}`);
  if (dragResult.success) {
    console.log(`     Block: "${dragResult.blockText}" at [${dragResult.rect}]`);
    console.log(`     dragStart dispatched: ${dragResult.dragStartResult}`);
    console.log(`     dataTransfer items: ${dragResult.dataTransferItems}`);
  }

  await screenshot(page, 'studio-drag-block.png');

  // =====================================================================
  // 4. TEST THE RUN BUTTON
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 4: Test the Run Button');
  console.log('─'.repeat(70));

  const runButtonInfo = await page.evaluate(() => {
    const results = [];
    const buttons = [...document.querySelectorAll('button, [role="button"], [class*="btn"], [class*="Btn"]')];
    for (const btn of buttons) {
      const text = btn.textContent?.trim();
      if (text && (text.toLowerCase().includes('run') || text.toLowerCase().includes('play') || text.toLowerCase().includes('start') || text.toLowerCase().includes('▶') || text.toLowerCase().includes('▷'))) {
        const rect = btn.getBoundingClientRect();
        results.push({
          tag: btn.tagName,
          text,
          class: btn.className,
          id: btn.id,
          rect: `${rect.x},${rect.y} ${rect.width}x${rect.height}`,
          visible: btn.offsetParent !== null,
          onclick: btn.getAttribute('onclick') || btn.getAttribute('ng-click') || '(none)',
        });
      }
    }
    // Also check for any element with run/play aria or title
    const others = [...document.querySelectorAll('[aria-label*="run" i], [aria-label*="play" i], [title*="run" i], [title*="play" i]')];
    for (const el of others) {
      results.push({
        tag: el.tagName,
        text: el.textContent?.trim(),
        'aria-label': el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        class: el.className,
      });
    }
    return results;
  });

  if (runButtonInfo.length > 0) {
    console.log(`   Found ${runButtonInfo.length} Run button candidates:`);
    for (const btn of runButtonInfo) {
      console.log(`     "${btn.text}" <${btn.tag} class="${btn.class}"> visible=${btn.visible} rect=[${btn.rect}]`);
      if (btn.onclick && btn.onclick !== '(none)') console.log(`       onclick: ${btn.onclick}`);
    }

    // Click the first visible run button
    const clickResult = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button, [role="button"], [class*="btn"], [class*="Btn"]')];
      const runBtn = buttons.find(b => {
        const t = b.textContent?.trim().toLowerCase();
        return (t?.includes('run') || t?.includes('play') || t?.includes('start') || t?.includes('▶') || t === '▶');
      });
      if (!runBtn || runBtn.offsetParent === null) return { clicked: false, reason: 'No visible run button found' };
      runBtn.click();
      return { clicked: true, text: runBtn.textContent?.trim(), class: runBtn.className };
    });
    console.log(`   Click result: ${clickResult.clicked ? '✅ clicked' : '❌ ' + clickResult.reason}`);
  } else {
    console.log(`   ❌ No Run button found`);
    
    // Broader search
    const allButtons = await page.evaluate(() => {
      return [...document.querySelectorAll('button')].map(b => ({
        text: b.textContent?.trim(),
        class: b.className,
        rect: (() => { try { const r = b.getBoundingClientRect(); return `${r.x},${r.y}`; } catch(e) { return 'hidden'; } })(),
      }));
    });
    console.log(`   All buttons on page (${allButtons.length}):`, JSON.stringify(allButtons));
  }

  await screenshot(page, 'studio-run.png');

  // =====================================================================
  // 5. TEST THE CLEAR BUTTON
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 5: Test the Clear Button');
  console.log('─'.repeat(70));

  const clearButtonInfo = await page.evaluate(() => {
    const results = [];
    const buttons = [...document.querySelectorAll('button, [role="button"], [class*="btn"], [class*="Btn"]')];
    for (const btn of buttons) {
      const text = btn.textContent?.trim();
      if (text && (text.toLowerCase().includes('clear') || text.toLowerCase().includes('reset') || text.toLowerCase().includes('delete') || text.toLowerCase().includes('trash'))) {
        const rect = btn.getBoundingClientRect();
        results.push({
          tag: btn.tagName,
          text,
          class: btn.className,
          id: btn.id,
          rect: `${rect.x},${rect.y} ${rect.width}x${rect.height}`,
          visible: btn.offsetParent !== null,
        });
      }
    }
    return results;
  });

  if (clearButtonInfo.length > 0) {
    console.log(`   Found ${clearButtonInfo.length} Clear button candidates:`);
    for (const btn of clearButtonInfo) {
      console.log(`     "${btn.text}" <${btn.tag} class="${btn.class}"> visible=${btn.visible}`);
    }

    const clickResult = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button, [role="button"], [class*="btn"], [class*="Btn"]')];
      const clearBtn = buttons.find(b => {
        const t = b.textContent?.trim().toLowerCase();
        return t?.includes('clear') || t?.includes('reset') || t?.includes('trash');
      });
      if (!clearBtn || clearBtn.offsetParent === null) return { clicked: false, reason: 'No visible clear button' };
      clearBtn.click();
      return { clicked: true, text: clearBtn.textContent?.trim(), class: clearBtn.className };
    });
    console.log(`   Click result: ${clickResult.clicked ? '✅ clicked' : '❌ ' + clickResult.reason}`);
  } else {
    console.log(`   ❌ No Clear button found`);
  }

  await screenshot(page, 'studio-clear.png');

  // =====================================================================
  // 6. CONSOLE LOG SUMMARY
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 6: Console Log Summary');
  console.log('─'.repeat(70));

  console.log(`   Console messages: ${consoleLogs.length}`);
  for (const log of consoleLogs) {
    console.log(`     ${log}`);
  }
  console.log(`   Page errors: ${pageErrors.length}`);
  for (const err of pageErrors) {
    console.log(`     ${err}`);
  }

  // =====================================================================
  // 7. WORKPLACE STATE CHECK
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 7: Workplace State Check');
  console.log('─'.repeat(70));

  const workspaceState = await page.evaluate(() => {
    const state = {};

    // Check workspace div content
    const workspaceEls = [...document.querySelectorAll('[class*="workspace"], [class*="Work"], [id*="workspace"], [id*="Work"]')];
    state.workspaceDivs = workspaceEls.map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      childCount: el.children.length,
      innerHTML: el.innerHTML.substring(0, 300),
      textContent: el.textContent?.trim().substring(0, 200),
    }));

    // Check for dynamically added elements
    state.allElements = document.querySelectorAll('*').length;
    state.styleTags = document.querySelectorAll('style').length;
    state.scriptTags = document.querySelectorAll('script').length;
    state.linkTags = document.querySelectorAll('link').length;
    state.svgElements = document.querySelectorAll('svg').length;
    state.canvasElements = document.querySelectorAll('canvas').length;
    state.iframeElements = document.querySelectorAll('iframe').length;

    // Check window/global state for block-related JS
    const globalKeys = Object.keys(window).filter(k => 
      k.toLowerCase().includes('block') || 
      k.toLowerCase().includes('studio') || 
      k.toLowerCase().includes('workspace') ||
      k.toLowerCase().includes('scratch') ||
      k.toLowerCase().includes('vm') ||
      k.toLowerCase().includes('voxel')
    );
    state.windowBlockKeys = globalKeys;

    // Check for any custom elements
    const customElements = [...document.querySelectorAll(':defined')].filter(el => el.tagName.includes('-'));
    state.customElementTags = [...new Set(customElements.map(el => el.tagName))];

    return state;
  });

  console.log(`   Workspace divs: ${workspaceState.workspaceDivs.length}`);
  for (const w of workspaceState.workspaceDivs) {
    console.log(`     <${w.tag}${w.id ? '#'+w.id : ''} class="${w.class}">`);
    console.log(`       children: ${w.childCount}`);
    console.log(`       content: ${w.textContent}`);
  }

  console.log(`   Total DOM elements: ${workspaceState.allElements}`);
  console.log(`   Style tags: ${workspaceState.styleTags}`);
  console.log(`   Script tags: ${workspaceState.scriptTags}`);
  console.log(`   SVG elements: ${workspaceState.svgElements}`);
  console.log(`   Canvas elements: ${workspaceState.canvasElements}`);
  console.log(`   IFrames: ${workspaceState.iframeElements}`);
  console.log(`   Custom element tags: ${JSON.stringify(workspaceState.customElementTags)}`);

  if (workspaceState.windowBlockKeys.length > 0) {
    console.log(`   Block-related window keys: ${workspaceState.windowBlockKeys.join(', ')}`);
  } else {
    console.log(`   Block-related window keys: (none found)`);
  }

  // Check for any JS state via globalThis
  const jsState = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script')];
    // Try to find if blockly/scratch-blocks is loaded
    const hasBlockly = typeof window.Blockly !== 'undefined';
    const hasScratchVM = typeof window.VirtualMachine !== 'undefined' || typeof window.ScratchVM !== 'undefined';
    const hasBlockStudio = typeof window.BlockStudio !== 'undefined' || typeof window.Studio !== 'undefined';
    
    return {
      hasBlockly,
      hasScratchVM,
      hasBlockStudio,
      scriptCount: scripts.length,
      scriptContents: scripts.map(s => ({
        src: s.src || '(inline)',
        type: s.type || '(default)',
        length: s.textContent?.length || 0,
      })),
    };
  });
  console.log(`   Blockly loaded: ${jsState.hasBlockly}`);
  console.log(`   ScratchVM loaded: ${jsState.hasScratchVM}`);
  console.log(`   BlockStudio loaded: ${jsState.hasBlockStudio}`);
  console.log(`   Scripts on page: ${jsState.scriptCount}`);
  for (const s of jsState.scriptContents) {
    console.log(`     ${s.src ? s.src : 'inline'} type=${s.type} len=${s.length}`);
  }

  // =====================================================================
  // 8. KEYBOARD INTERACTIONS
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 8: Keyboard Interactions');
  console.log('─'.repeat(70));

  // Focus the page body
  await page.click('body', { clickCount: 1 });
  await sleep(300);

  const keysToTest = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'];

  for (const key of keysToTest) {
    const beforeState = await page.evaluate(() => document.activeElement?.tagName || '(body)');
    await page.keyboard.press(key);
    await sleep(200);
    const domChanged = await page.evaluate((before) => {
      // Simple state diff
      return { activeElement: document.activeElement?.tagName || '(body)' };
    }, beforeState);
    console.log(`   Key "${key}": activeElement was ${beforeState}, now ${domChanged.activeElement}`);
  }

  await screenshot(page, 'studio-keyboard.png');

  // =====================================================================
  // 9. NETWORK REQUESTS
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 9: Network Requests');
  console.log('─'.repeat(70));

  console.log(`   Total network requests tracked: ${networkRequests.length}`);
  const requestByType = {};
  for (const req of networkRequests) {
    if (!requestByType[req.type]) requestByType[req.type] = [];
    requestByType[req.type].push(req.url);
  }
  for (const [type, urls] of Object.entries(requestByType)) {
    console.log(`   Type: ${type} (${urls.length})`);
    for (const url of urls) {
      console.log(`     ${url.substring(0, 150)}`);
    }
  }

  // =====================================================================
  // 10. MOBILE/RESPONSIVE
  // =====================================================================
  console.log('\n' + '─'.repeat(70));
  console.log('📋 TEST 10: Mobile/Responsive Design');
  console.log('─'.repeat(70));

  const responsiveInfo = await page.evaluate(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const mediaQueries = [...document.querySelectorAll('style, link[rel="stylesheet"]')].reduce((acc, el) => {
      if (el.tagName === 'STYLE' && el.textContent) {
        const matches = el.textContent.match(/@media[^{]+/g);
        if (matches) acc.push(...matches);
      }
      return acc;
    }, []);
    return {
      viewportMeta: metaViewport ? metaViewport.content : '(none)',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      mediaQueryCount: mediaQueries.length,
      mediaQueryExamples: mediaQueries.slice(0, 10),
      hasFlexbox: document.body.innerHTML.includes('flex'),
      hasGrid: document.body.innerHTML.includes('grid'),
      cssClassCount: document.querySelectorAll('[class]').length,
    };
  });

  console.log(`   Viewport meta: ${responsiveInfo.viewportMeta}`);
  console.log(`   Viewport: ${responsiveInfo.viewportWidth}x${responsiveInfo.viewportHeight} @${responsiveInfo.devicePixelRatio}x`);
  console.log(`   Media queries found: ${responsiveInfo.mediaQueryCount}`);
  for (const mq of responsiveInfo.mediaQueryExamples) {
    console.log(`     ${mq.trim()}`);
  }
  console.log(`   Uses flexbox: ${responsiveInfo.hasFlexbox ? '✅' : '❌'}`);
  console.log(`   Uses grid: ${responsiveInfo.hasGrid ? '✅' : '❌'}`);
  console.log(`   CSS class assignments: ${responsiveInfo.cssClassCount}`);

  // Also test with a mobile viewport
  console.log(`\n   📱 Testing mobile viewport (iPhone 12 Pro: 390x844)...`);
  await page.setViewport({ width: 390, height: 844 });
  await sleep(1000);
  await screenshot(page, 'studio-mobile.png');

  const mobileInfo = await page.evaluate(() => {
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      visibleButtons: [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).length,
      visibleElements: [...document.querySelectorAll('*')].filter(el => {
        try { return el.offsetParent !== null; } catch(e) { return false; }
      }).length,
    };
  });
  console.log(`   Mobile viewport: ${mobileInfo.viewportWidth}x${mobileInfo.viewportHeight}`);
  console.log(`   Visible buttons: ${mobileInfo.visibleButtons}`);
  console.log(`   Visible elements: ${mobileInfo.visibleElements}`);

  // Reset viewport
  await page.setViewport({ width: 1280, height: 800 });
  await sleep(500);

  // =====================================================================
  // FINAL SUMMARY
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`   Title: "${title}" (expected "VoxelWorks Block Studio"): ${title === 'VoxelWorks Block Studio' ? '✅' : '❌'}`);
  
  // Check for Scratch/Blockly-related globals  
  const finalCheck = await page.evaluate(() => {
    const globals = [];
    for (const key of Object.getOwnPropertyNames(window)) {
      if (key.toLowerCase().includes('block') || key.toLowerCase().includes('scratch') || 
          key.toLowerCase().includes('studio') || key.toLowerCase().includes('voxel') ||
          key.toLowerCase().includes('vm')) {
        globals.push(key);
      }
    }
    return globals;
  });

  console.log(`   Window globals (block/studio/scratch/voxel related): ${finalCheck.join(', ') || '(none)'}`);
  console.log(`   Console messages: ${consoleLogs.length}`);
  console.log(`   Page errors: ${pageErrors.length}`);
  console.log(`   Network requests: ${networkRequests.length}`);
  console.log(`   All button texts: ${await page.evaluate(() => [...document.querySelectorAll('button, [role="button"]')].map(b => b.textContent?.trim()).filter(Boolean).join(', '))}`);

  console.log('\n📸 Screenshots saved:');
  const files = fs.readdirSync(WORKSPACE).filter(f => f.startsWith('studio-') && f.endsWith('.png'));
  for (const f of files) {
    console.log(`   workspace/${f}`);
  }

  await browser.close();
  console.log('\n🏁 Test complete.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
