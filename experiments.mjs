import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WS = ws => path.resolve(__dirname, ws);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const p = WS(`workspace/${name}`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  ✅ Screenshot saved: ${name}`);
}

function logSection(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

// ---- EXPERIMENT 1: Hex Explorer ----
async function experiment1(page) {
  logSection('EXPERIMENT 1: Hex Explorer Mode Switcher');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('https://superinstance.github.io/hex-lattice-explorer/', {
    waitUntil: 'networkidle0', timeout: 30000
  });
  console.log('  Page loaded, title:', await page.title());

  // Wait for canvas
  await page.waitForSelector('canvas', { timeout: 10000 }).catch(() => console.log('  ⚠️ No canvas element'));
  await sleep(1000);

  // Find the select element for grid mode
  let selectFound = false;
  const selectors = ['select', '#grid-mode', '#mode-select', 'select[name="mode"]', '.mode-selector select'];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      console.log(`  Found select: ${sel}`);
      selectFound = true;

      // Get all options
      const options = await page.evaluate(() => {
        const s = document.querySelector('select');
        if (!s) return [];
        return Array.from(s.options).map(o => ({ text: o.text, value: o.value }));
      });
      console.log('  Select options:', JSON.stringify(options));

      // Try to switch to modes we want
      const wantedModes = ['all', 'ring', 'p48'];
      for (const mode of wantedModes) {
        try {
          await page.select(sel, mode);
          console.log(`  Switched to mode: ${mode}`);
          await sleep(800);
          await screenshot(page, `hex-mode-${mode}.png`);
        } catch (e) {
          console.log(`  ⚠️ Could not switch to '${mode}': ${e.message}`);
        }
      }
      break;
    }
  }

  if (!selectFound) {
    console.log('  ⚠️ No select element found, looking for buttons/links instead');
    // Try buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a')).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().slice(0, 30),
        id: el.id,
        class: el.className
      }));
    });
    console.log('  Available buttons/links:', JSON.stringify(buttons, null, 2));

    // Screenshot whatever state we have
    await screenshot(page, 'hex-mode-all.png');
  }

  if (errors.length) console.log('  ⚠️ Page errors:', errors);
  return { errors };
}

// ---- EXPERIMENT 2: Game Engine ----
async function experiment2(page) {
  logSection('EXPERIMENT 2: Game Engine Interaction');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('https://voxelworks-fix.casey-digennaro.workers.dev/game', {
    waitUntil: 'networkidle0', timeout: 30000
  });
  console.log('  Game page loaded, title:', await page.title());

  // Wait for Phaser canvas
  await sleep(3000);

  // Check for canvas
  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    return Array.from(canvases).map((c, i) => {
      const r = c.getBoundingClientRect();
      return {
        index: i,
        width: c.width,
        height: c.height,
        rx: r.x, ry: r.y, rw: r.width, rh: r.height
      };
    });
  });
  console.log('  Canvases found:', JSON.stringify(canvasInfo));

  if (canvasInfo.length > 0) {
    // Click on the canvas at position (512, 400) for PLAY button
    const canvas = canvasInfo[0];
    const x = (canvas.rx || 0) + 512;
    const y = (canvas.ry || 0) + 400;
    console.log(`  Clicking canvas at (${x}, ${y})`);
    await page.mouse.click(x, y);
    await sleep(2000);
    await screenshot(page, 'game-playing.png');
  } else {
    // Check if it's a different element
    const gameElements = await page.evaluate(() => {
      return document.body.innerHTML.slice(0, 2000);
    });
    console.log('  Page body (first 2k):', gameElements);
    await screenshot(page, 'game-playing.png');
  }

  if (errors.length) console.log('  ⚠️ Page errors:', errors);
  return { errors, canvasInfo };
}

// ---- EXPERIMENT 3: Hub Navigation ----
async function experiment3(page) {
  logSection('EXPERIMENT 3: Hub Navigation');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('https://voxelworks-fix.casey-digennaro.workers.dev/hub', {
    waitUntil: 'networkidle0', timeout: 30000
  });
  console.log('  Hub page loaded, title:', await page.title());
  await sleep(1500);

  // Find doors/clickable elements
  const elements = await page.evaluate(() => {
    // Find all clickable things
    const clickables = [];
    document.querySelectorAll('a, button, [role="button"], [onclick], .door, [class*="door"], [class*="portal"], [class*="room"], canvas, img, [class*="click"], [class*="enter"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        clickables.push({
          tag: el.tagName,
          id: el.id,
          text: (el.textContent || '').trim().slice(0, 40),
          href: el.href || '',
          class: el.className || '',
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          center: { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) }
        });
      }
    });
    return clickables;
  });
  console.log(`  Found ${elements.length} clickable elements:`);
  elements.slice(0, 20).forEach(el => {
    console.log(`    ${el.tag} "${el.text}" at (${el.center.x}, ${el.center.y}) class="${el.class.slice(0,40)}"`);
  });

  // Try clicking the first promising door/button/link
  let clicked = false;
  for (const el of elements) {
    if (el.href && !el.href.includes('#') && el.href.startsWith('http')) {
      console.log(`  Clicking link: "${el.text}" -> ${el.href}`);
      await page.click(el.href); // this won't work for DOM element
      await sleep(2000);
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    // Try clicking by coordinates
    for (const el of elements) {
      // Prefer elements labeled like doors
      if (el.text.toLowerCase().includes('door') || el.text.toLowerCase().includes('enter') || 
          el.class.toLowerCase().includes('door') || el.class.toLowerCase().includes('portal') ||
          el.tag === 'A' || el.tag === 'BUTTON') {
        console.log(`  Clicking at (${el.center.x}, ${el.center.y}): "${el.text}"`);
        await page.mouse.click(el.center.x, el.center.y);
        await sleep(2500);
        clicked = true;
        break;
      }
    }
  }

  if (!clicked && elements.length > 0) {
    const el = elements[0];
    console.log(`  Clicking first element at (${el.center.x}, ${el.center.y}): "${el.text}"`);
    await page.mouse.click(el.center.x, el.center.y);
    await sleep(2500);
  }

  const finalUrl = page.url();
  console.log(`  Final URL after nav: ${finalUrl}`);
  await screenshot(page, 'hub-navigate.png');

  if (errors.length) console.log('  ⚠️ Page errors:', errors);
  return { errors, elements, finalUrl };
}

// ---- EXPERIMENT 4: Nebula API ----
async function experiment4(page) {
  logSection('EXPERIMENT 4: Nebula Query Results');
  const results = { status: null, message: null };

  try {
    // GET /api/status
    console.log('  Fetching GET /api/status...');
    const statusResp = await page.evaluate(async () => {
      try {
        const r = await fetch('https://fleet-murmur-worker.casey-digennaro.workers.dev/api/status');
        return { ok: r.ok, status: r.status, body: await r.text() };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('  Status response:', JSON.stringify(statusResp, null, 2));
    results.status = statusResp;

    // POST /api/agent/message with intents
    const intents = ["what is the fleet status", "what rooms are available", "fleet crate test status"];
    const messageResp = await page.evaluate(async (intents) => {
      try {
        const r = await fetch('https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intents })
        });
        const text = await r.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        return { ok: r.ok, status: r.status, body: parsed };
      } catch (e) {
        return { error: e.message };
      }
    }, intents);
    console.log('  Message response:', JSON.stringify(messageResp, null, 2));
    results.message = messageResp;
  } catch (e) {
    console.log('  ⚠️ API fetch error:', e.message);
  }

  return results;
}

// ---- EXPERIMENT 5: All Rooms Screenshot ----
async function experiment5(page) {
  logSection('EXPERIMENT 5: All Rooms Screenshot Pass');
  const errors = {};
  const rooms = ['hub', 'studio', 'lab', 'deck', 'game'];

  for (const room of rooms) {
    const url = `https://voxelworks-fix.casey-digennaro.workers.dev/${room}`;
    console.log(`\n  Loading ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });
      await sleep(1500);
      console.log(`  Title: ${await page.title()}`);
      await screenshot(page, `room-${room}.png`);
      errors[room] = null;
    } catch (e) {
      console.log(`  ⚠️ Error loading ${room}: ${e.message}`);
      // Try with less strict wait
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await sleep(2000);
        console.log(`  Title (fallback): ${await page.title()}`);
        await screenshot(page, `room-${room}.png`);
        errors[room] = e.message;
      } catch (e2) {
        console.log(`  ❌ Failed ${room}: ${e2.message}`);
        errors[room] = e2.message;
      }
    }
  }

  return errors;
}

// ---- MAIN ----
async function main() {
  const results = {};

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader'
    ],
    headless: true,
    defaultViewport: { width: 1280, height: 720 }
  });

  // Use default browser context
  const context = browser.defaultBrowserContext();

  try {
    // Hex Explorer
    // Use fresh pages from default context
    // Hex Explorer
    const page1 = await browser.newPage();
    results.experiment1 = await experiment1(page1);
    await page1.close();

    // Game Engine
    const page2 = await browser.newPage();
    results.experiment2 = await experiment2(page2);
    await page2.close();

    // Hub Navigation
    const page3 = await browser.newPage();
    results.experiment3 = await experiment3(page3);
    await page3.close();

    // Nebula API (can use a fresh page)
    const page4 = await browser.newPage();
    results.experiment4 = await experiment4(page4);
    await page4.close();

    // All Rooms
    const page5 = await browser.newPage();
    results.experiment5 = await experiment5(page5);
    await page5.close();

  } catch (e) {
    console.error('\n❌ Fatal error:', e.message);
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  // Write results to JSON
  await writeFile(WS('workspace/experiment-results.json'), JSON.stringify(results, null, 2));
  console.log('\n' + '='.repeat(70));
  console.log('  RESULTS WRITTEN TO: workspace/experiment-results.json');
  console.log('='.repeat(70));
}

main().catch(e => {
  console.error('CRASH:', e);
  process.exit(1);
});
