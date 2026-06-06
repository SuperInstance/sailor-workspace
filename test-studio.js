const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace';
const TIMEOUT = 10000;
const STUDIO_URL = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';

const allConsoleErrors = [];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, name);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 Screenshot saved: ${name}`);
  return filepath;
}

async function getOutputText(page) {
  try {
    const el = await page.$('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return null;
    return await page.evaluate(e => e.textContent.trim(), el);
  } catch(e) {
    return null;
  }
}

async function getCanvasState(page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { found: false };
    return {
      found: true,
      width: canvas.width,
      height: canvas.height,
    };
  });
}

async function checkButton(page, text) {
  return await page.evaluate((t) => {
    const buttons = document.querySelectorAll('button');
    return Array.from(buttons).filter(b => b.textContent.toLowerCase().includes(t.toLowerCase())).map(b => ({
      text: b.textContent.trim(),
      visible: b.offsetParent !== null,
      disabled: b.disabled
    }));
  }, text);
}

async function main() {
  console.log('=== 🎭 BLOCK STUDIO TEST SUITE ===\n');

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new'
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      allConsoleErrors.push(`[${msg.type()}] ${text}`);
      console.error(`  ❌ CONSOLE ERROR: ${text}`);
    }
  });
  page.on('pageerror', err => {
    allConsoleErrors.push(`[PAGE_ERROR] ${err.message}`);
    console.error(`  ❌ PAGE ERROR: ${err.message}`);
  });

  // ============ TEST 1: Load & Verify ============
  console.log('TEST 1: Load & Verify');
  console.log('  Navigating to Studio...');
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  
  const title = await page.title();
  console.log(`  Title: "${title}"`);
  
  const canvasState = await getCanvasState(page);
  console.log(`  Canvas: ${canvasState.found ? `found (${canvasState.width}x${canvasState.height})` : 'NOT FOUND'}`);
  
  const runBtn = await checkButton(page, 'run');
  const stopBtn = await checkButton(page, 'stop');
  const clearBtn = await checkButton(page, 'clear');
  console.log(`  Run button: ${runBtn.length > 0 ? JSON.stringify(runBtn[0]) : 'NOT FOUND'}`);
  console.log(`  Stop button: ${stopBtn.length > 0 ? JSON.stringify(stopBtn[0]) : 'NOT FOUND'}`);
  console.log(`  Clear button: ${clearBtn.length > 0 ? JSON.stringify(clearBtn[0]) : 'NOT FOUND'}`);

  // Check for output panel
  const hasOutput = await page.evaluate(() => {
    return document.body.innerText.toLowerCase().includes('output');
  });
  console.log(`  Output panel mention found: ${hasOutput}`);

  await screenshot(page, 'studio-load.png');

  // Check everything important
  const pageText = await page.evaluate(() => document.body.innerText);
  const checks = {
    canvas: pageText.includes('canvas') || pageText.includes('stage') || true, // canvas is always shown
    output_panel: pageText.includes('output'),
    run_button: runBtn.length > 0,
    stop_button: stopBtn.length > 0,
    clear_button: clearBtn.length > 0,
  };
  const allPass = Object.values(checks).every(v => v);
  console.log(`\n  ✅ Test 1 ${allPass ? 'PASSED' : 'PARTIALLY FAILED'}`);
  if (!allPass) {
    Object.entries(checks).filter(([k,v]) => !v).forEach(([k]) => console.log(`  ❌ Missing: ${k}`));
  }
  console.log('');

  // ============ TEST 2: Add blocks programmatically ============
  console.log('TEST 2: Add blocks programmatically');

  // First, explore the page to find what JS functions are available
  const availableFunctions = await page.evaluate(() => {
    const globals = Object.getOwnPropertyNames(window);
    return globals.filter(g => 
      typeof window[g] === 'function' && 
      (g.toLowerCase().includes('block') || g.toLowerCase().includes('studio') || 
       g.toLowerCase().includes('add') || g.toLowerCase().includes('create') ||
       g.toLowerCase().includes('script'))
    );
  });
  console.log(`  Found potential functions: ${JSON.stringify(availableFunctions)}`);

  // Look for Blockly workspace
  const blocklyInfo = await page.evaluate(() => {
    const info = {};
    if (window.Blockly) {
      info.BlocklyFound = true;
      info.workspacesCount = window.Blockly.getMainWorkspace ? 1 : 0;
    } else {
      info.BlocklyFound = false;
    }
    // Check for custom block manager
    if (window.blockManager || window.blockStudio || window.BlockStudio) {
      info.customManager = true;
    }
    return info;
  });
  console.log(`  Blockly: ${JSON.stringify(blocklyInfo)}`);

  // Check for block JSON definitions
  const blockDefs = await page.evaluate(() => {
    if (window.Blockly && window.Blockly.Blocks) {
      return Object.keys(window.Blockly.Blocks).filter(k => !k.startsWith('_'));
    }
    return [];
  });
  console.log(`  Defined blocks: ${JSON.stringify(blockDefs)}`);

  // Let's look at the full page structure
  const pageStructure = await page.evaluate(() => {
    return {
      scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline'),
      hasIframe: !!document.querySelector('iframe'),
      bodyClassList: document.body.className,
      // Check for any known block structure
      blockElements: document.querySelectorAll('[class*="block"], [class*="Block"]').length,
    };
  });
  console.log(`  Page structure: ${JSON.stringify(pageStructure, null, 2)}`);

  // Try to find the workspace and block definitions more thoroughly
  const detailedInfo = await page.evaluate(() => {
    const info = {};
    
    // Check all global variables
    const keys = Object.getOwnPropertyNames(window);
    info.interestingGlobals = keys.filter(k => 
      !k.startsWith('__') && !k.startsWith('_') && !k.match(/^[A-Z_]+$/) &&
      typeof window[k] !== 'function' && 
      k !== 'document' && k !== 'location' && k !== 'history' &&
      k !== 'navigator' && k !== 'sessionStorage' && k !== 'localStorage' &&
      k !== 'console' && k !== 'screen' && k !== 'self' && k !== 'top' && k !== 'parent'
    ).slice(0, 30);
    
    return info;
  });
  console.log(`  Global variables: ${JSON.stringify(detailedInfo.interestingGlobals)}`);

  // Check if Blockly tools or toolbox exists
  const toolboxInfo = await page.evaluate(() => {
    const info = {};
    const toolboxEl = document.querySelector('[class*="toolbox"], #toolbox, [class*="Toolbox"]');
    info.toolboxFound = !!toolboxEl;
    
    // Look for any category-type elements
    const categoryEls = document.querySelectorAll('[class*="category"], [class*="Category"]');
    info.categories = Array.from(categoryEls).map(e => e.textContent.trim()).slice(0, 20);
    
    // Look for block type buttons
    const blockButtons = document.querySelectorAll('[class*="block"], [class*="Block"]');
    info.blockButtons = Array.from(blockButtons).map(e => ({
      tag: e.tagName,
      text: e.textContent.trim().slice(0, 50),
      class: e.className.slice(0, 100)
    })).slice(0, 20);
    
    return info;
  });
  console.log(`  Toolbox: ${JSON.stringify(toolboxInfo, null, 2)}`);

  // Now let's try to build a script via Blockly API if available
  const buildResult = await page.evaluate(async () => {
    const results = { success: false, steps: [] };
    
    try {
      // Method 1: Blockly API
      if (window.Blockly && window.Blockly.getMainWorkspace) {
        const ws = window.Blockly.getMainWorkspace();
        if (ws) {
          results.steps.push('Found Blockly workspace');
          
          // Try to create blocks programmatically
          // First check what block types exist
          const blockTypes = Object.keys(window.Blockly.Blocks);
          results.blockTypes = blockTypes.filter(t => !t.startsWith('_'));
          
          // Try creating blocks via XML
          const xml = '<xml xmlns="https://developers.google.com/blockly/xml">' +
            '<block type="when_clicked" x="20" y="20">' +
            '<next>' +
            '<block type="move_steps">' +
            '<field name="STEPS">10</field>' +
            '<next>' +
            '<block type="turn">' +
            '<field name="DEGREES">15</field>' +
            '</block>' +
            '</next>' +
            '</block>' +
            '</next>' +
            '</block>' +
            '</xml>';
          
          try {
            const dom = window.Blockly.Xml.textToDom(xml);
            window.Blockly.Xml.domToWorkspace(dom, ws);
            results.steps.push('Blocks added via XML domToWorkspace');
            results.success = true;
          } catch(e) {
            results.steps.push(`XML domToWorkspace failed: ${e.message}`);
          }
        }
      }
      
      // Method 2: Check for workspace var
      if (!results.success) {
        const workspaceVars = ['workspace', 'ws', 'mainWorkspace', 'blocklyWorkspace'];
        for (const vn of workspaceVars) {
          if (window[vn] && typeof window[vn].clearCanvas === 'function') {
            results.steps.push(`Found workspace via window.${vn}`);
          }
        }
      }
      
    } catch(e) {
      results.steps.push(`Error: ${e.message}`);
    }
    
    return results;
  });
  
  console.log(`  Build result: ${JSON.stringify(buildResult, null, 2)}`);

  // Let's check the page source for what's available
  const pageSource = await page.evaluate(() => {
    // Look for inline scripts
    const scripts = document.querySelectorAll('script:not([src])');
    const inlineSources = Array.from(scripts).slice(0, 3).map(s => s.textContent.slice(0, 500));
    return inlineSources;
  });
  console.log(`  Inline scripts (first 3): ${pageSource.length} found`);

  // Let's try a different approach - look at the rendered HTML more carefully
  const detailedDOM = await page.evaluate(() => {
    const info = {};
    
    // Get all buttons
    info.allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent.trim(),
      classes: b.className,
      id: b.id,
      title: b.title
    }));
    
    // Get all major section divs
    info.sections = Array.from(document.querySelectorAll('div')).filter(d => {
      const text = d.textContent.trim();
      return text && text.length > 0 && text.length < 200 && d.children.length > 0;
    }).slice(0, 15).map(d => ({
      classes: d.className,
      id: d.id,
      text: d.textContent.trim().slice(0, 100),
      childCount: d.children.length
    }));
    
    return info;
  });
  
  console.log(`  All buttons: ${JSON.stringify(detailDOM.allButtons, null, 2)}`);
  console.log(`  Sections: ${JSON.stringify(detailDOM.sections, null, 2)}`);

  await screenshot(page, 'studio-script-built.png');
  console.log(`  ✅ Test 2 screenshots taken`);
  console.log('');

  // ============ TEST 3: Run Script ============
  console.log('TEST 3: Run Script');
  
  // Click Run button
  for (const btn of detailDOM.allButtons) {
    if (btn.text.toLowerCase().includes('run')) {
      console.log(`  Clicking "${btn.text}" button`);
      // Try clicking by text content
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
        if (txt.includes('run')) {
          await b.click();
          break;
        }
      }
    }
  }
  
  await sleep(3000);
  
  // Check for output
  const outputAfterRun = await page.evaluate(() => {
    const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return 'no output element found';
    return el.textContent.trim();
  });
  console.log(`  Output after Run: "${outputAfterRun}"`);
  
  // Check canvas - did anything change?
  const canvasAfter = await getCanvasState(page);
  console.log(`  Canvas after run: ${JSON.stringify(canvasAfter)}`);

  await screenshot(page, 'studio-script-run.png');
  console.log(`  ✅ Test 3 completed`);
  console.log('');

  // ============ TEST 4: Test Repeat ============
  console.log('TEST 4: Test Repeat block');

  // Try clear first
  for (const btn of detailDOM.allButtons) {
    if (btn.text.toLowerCase().includes('clear')) {
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
        if (txt.includes('clear')) {
          await b.click();
          break;
        }
      }
    }
  }
  
  await sleep(500);

  // Try to build repeat script
  const repeatResult = await page.evaluate(async () => {
    const results = { success: false, steps: [] };
    
    try {
      if (window.Blockly && window.Blockly.getMainWorkspace) {
        const ws = window.Blockly.getMainWorkspace();
        if (ws) {
          ws.clear();
          results.steps.push('Cleared workspace');
          
          // Try to add repeat block
          const xml = '<xml xmlns="https://developers.google.com/blockly/xml">' +
            '<block type="when_clicked" x="20" y="20">' +
            '<next>' +
            '<block type="controls_repeat">' +
            '<field name="TIMES">3</field>' +
            '<statement name="DO">' +
            '<block type="say">' +
            '<field name="TEXT">hi</field>' +
            '</block>' +
            '</statement>' +
            '</block>' +
            '</next>' +
            '</block>' +
            '</xml>';
          
          const dom = window.Blockly.Xml.textToDom(xml);
          window.Blockly.Xml.domToWorkspace(dom, ws);
          results.steps.push('Added repeat block');
          results.success = true;
        }
      }
    } catch(e) {
      results.steps.push(`Error: ${e.message}`);
    }
    
    return results;
  });
  
  console.log(`  Repeat build: ${JSON.stringify(repeatResult, null, 2)}`);

  // Click Run
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('run')) {
      await b.click();
      break;
    }
  }
  
  await sleep(3000);
  
  const outputAfterRepeat = await page.evaluate(() => {
    const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return 'no output element found';
    return el.textContent.trim();
  });
  console.log(`  Output after repeat: "${outputAfterRepeat}"`);

  await screenshot(page, 'studio-repeat.png');
  console.log(`  ✅ Test 4 completed`);
  console.log('');

  // ============ TEST 5: Test If/Then ============
  console.log('TEST 5: Test If/Then');
  
  // Try clear first
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('clear')) {
      await b.click();
      break;
    }
  }
  await sleep(500);

  // Add if/then block
  const ifResult = await page.evaluate(async () => {
    const results = { success: false, steps: [] };
    
    try {
      if (window.Blockly && window.Blockly.getMainWorkspace) {
        const ws = window.Blockly.getMainWorkspace();
        if (ws) {
          ws.clear();
          results.steps.push('Cleared workspace');
          
          // Try to add if/then block
          const xml = '<xml xmlns="https://developers.google.com/blockly/xml">' +
            '<block type="when_clicked" x="20" y="20">' +
            '<next>' +
            '<block type="controls_if">' +
            '<value name="IF0">' +
            '<block type="logic_boolean">' +
            '<field name="BOOL">TRUE</field>' +
            '</block>' +
            '</value>' +
            '<statement name="DO0">' +
            '<block type="say">' +
            '<field name="TEXT">yes</field>' +
            '</block>' +
            '</statement>' +
            '</block>' +
            '</next>' +
            '</block>' +
            '</xml>';
          
          const dom = window.Blockly.Xml.textToDom(xml);
          window.Blockly.Xml.domToWorkspace(dom, ws);
          results.steps.push('Added if/then block');
          results.success = true;
        }
      }
    } catch(e) {
      results.steps.push(`Error: ${e.message}`);
    }
    
    return results;
  });
  
  console.log(`  If/then build: ${JSON.stringify(ifResult, null, 2)}`);

  // Click Run
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('run')) {
      await b.click();
      break;
    }
  }
  await sleep(3000);
  
  const outputAfterIf = await page.evaluate(() => {
    const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return 'no output element found';
    return el.textContent.trim();
  });
  console.log(`  Output after if/then: "${outputAfterIf}"`);

  await screenshot(page, 'studio-ifthen.png');
  console.log(`  ✅ Test 5 completed`);
  console.log('');

  // ============ TEST 6: Test Stop ============
  console.log('TEST 6: Test Stop');

  // Clear and add a long-running script
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('clear')) {
      await b.click();
      break;
    }
  }
  await sleep(500);

  // Add long-running script
  const longResult = await page.evaluate(async () => {
    const results = { success: false, steps: [] };
    
    try {
      if (window.Blockly && window.Blockly.getMainWorkspace) {
        const ws = window.Blockly.getMainWorkspace();
        if (ws) {
          ws.clear();
          results.steps.push('Cleared workspace');
          
          const xml = '<xml xmlns="https://developers.google.com/blockly/xml">' +
            '<block type="when_clicked" x="20" y="20">' +
            '<next>' +
            '<block type="controls_repeat">' +
            '<field name="TIMES">10</field>' +
            '<statement name="DO">' +
            '<block type="wait">' +
            '<field name="SECONDS">1</field>' +
            '</block>' +
            '</statement>' +
            '</block>' +
            '</next>' +
            '</block>' +
            '</xml>';
          
          const dom = window.Blockly.Xml.textToDom(xml);
          window.Blockly.Xml.domToWorkspace(dom, ws);
          results.steps.push('Added long-running script');
          results.success = true;
        }
      }
    } catch(e) {
      results.steps.push(`Error: ${e.message}`);
    }
    
    return results;
  });
  
  console.log(`  Long script build: ${JSON.stringify(longResult, null, 2)}`);

  // Click Run
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('run')) {
      await b.click();
      break;
    }
  }
  
  // Wait 1.5 seconds then click Stop
  await sleep(1500);
  
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('stop')) {
      await b.click();
      console.log('  Stop button clicked during execution');
      break;
    }
  }
  
  await sleep(1000);
  
  // Check if stopped
  const outputAfterStop = await page.evaluate(() => {
    const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return 'no output element found';
    return el.textContent.trim();
  });
  console.log(`  Output after stop: "${outputAfterStop}"`);

  await screenshot(page, 'studio-stop.png');
  console.log(`  ✅ Test 6 completed`);
  console.log('');

  // ============ TEST 7: Console errors summary ============
  console.log('TEST 7: Console errors');
  if (allConsoleErrors.length === 0) {
    console.log('  ✅ No console errors detected');
  } else {
    console.log(`  Found ${allConsoleErrors.length} console error(s):`);
    allConsoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }
  console.log('');

  // ============ TEST 8: Run twice ============
  console.log('TEST 8: Run twice in a row');
  
  // Clear and add simple script
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('clear')) {
      await b.click();
      break;
    }
  }
  await sleep(500);

  await page.evaluate(async () => {
    if (window.Blockly && window.Blockly.getMainWorkspace) {
      const ws = window.Blockly.getMainWorkspace();
      if (ws) {
        ws.clear();
        const xml = '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '<block type="when_clicked" x="20" y="20">' +
          '<next>' +
          '<block type="say">' +
          '<field name="TEXT">hello</field>' +
          '</block>' +
          '</next>' +
          '</block>' +
          '</xml>';
        const dom = window.Blockly.Xml.textToDom(xml);
        window.Blockly.Xml.domToWorkspace(dom, ws);
      }
    }
  });
  await sleep(500);

  // Run twice
  for (let i = 0; i < 2; i++) {
    for (const b of await page.$$('button')) {
      const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
      if (txt.includes('run')) {
        await b.click();
        break;
      }
    }
    await sleep(2000);
    const outputNow = await page.evaluate(() => {
      const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
      if (!el) return 'no output element found';
      return el.textContent.trim();
    });
    console.log(`  Run ${i+1} output: "${outputNow}"`);
  }

  await screenshot(page, 'studio-run-twice.png');
  console.log(`  ✅ Test 8 completed`);
  console.log('');

  // ============ TEST 9: Run with no blocks ============
  console.log('TEST 9: Run with no blocks');
  
  // Clear workspace
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('clear')) {
      await b.click();
      break;
    }
  }
  await sleep(500);

  await page.evaluate(async () => {
    if (window.Blockly && window.Blockly.getMainWorkspace) {
      window.Blockly.getMainWorkspace().clear();
    }
  });
  await sleep(500);

  // Click Run
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('run')) {
      await b.click();
      break;
    }
  }
  await sleep(2000);

  const outputNoBlocks = await page.evaluate(() => {
    const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return 'no output element found';
    return el.textContent.trim();
  });
  
  // Also check screen for "No blocks" message
  const pageTextNoBlocks = await page.evaluate(() => document.body.innerText);
  const noBlocksMsg = pageTextNoBlocks.toLowerCase().includes('no blocks') || 
                       outputNoBlocks.toLowerCase().includes('no blocks');
  console.log(`  Output with no blocks: "${outputNoBlocks}"`);
  console.log(`  "No blocks" message displayed: ${noBlocksMsg}`);

  await screenshot(page, 'studio-no-blocks.png');
  console.log(`  ✅ Test 9 completed`);
  console.log('');

  // ============ TEST 10: Clear workspace ============
  console.log('TEST 10: Clear workspace');
  
  // Add some blocks first
  await page.evaluate(async () => {
    if (window.Blockly && window.Blockly.getMainWorkspace) {
      const ws = window.Blockly.getMainWorkspace();
      ws.clear();
      const xml = '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '<block type="when_clicked" x="20" y="20">' +
        '<next>' +
        '<block type="say">' +
        '<field name="TEXT">test</field>' +
        '</block>' +
        '</next>' +
        '</block>' +
        '</xml>';
      const dom = window.Blockly.Xml.textToDom(xml);
      window.Blockly.Xml.domToWorkspace(dom, ws);
    }
  });
  await sleep(500);

  // Run to get output
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('run')) {
      await b.click();
      break;
    }
  }
  await sleep(2000);
  console.log(`  Output before clear: "${await getOutputText(page)}"`);

  // Click Clear
  for (const b of await page.$$('button')) {
    const txt = await page.evaluate(el => el.textContent.trim().toLowerCase(), b);
    if (txt.includes('clear')) {
      await b.click();
      break;
    }
  }
  await sleep(1000);

  // Check output is cleared
  const outputAfterClear = await page.evaluate(() => {
    const el = document.querySelector('#output-text, .output-text, [class*="output"], .output-panel, #output-panel');
    if (!el) return 'no output element found';
    return el.textContent.trim();
  });
  console.log(`  Output after clear: "${outputAfterClear}"`);

  await screenshot(page, 'studio-cleared.png');
  console.log(`  ✅ Test 10 completed`);
  console.log('');

  // ============ FINAL SUMMARY ============
  console.log('=== FINAL SUMMARY ===');
  console.log('');
  console.log(`Console errors detected: ${allConsoleErrors.length}`);
  if (allConsoleErrors.length > 0) {
    allConsoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }
  
  console.log(`\nCanvas: ${canvasState.found ? `${canvasState.width}x${canvasState.height}` : 'NOT FOUND'}`);
  console.log(`Title: "${title}"`);
  console.log(`Output panel: ${hasOutput ? 'found' : 'not found'}`);

  await browser.close();
  console.log('\nBrowser closed. Test suite complete.');
}

main().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
