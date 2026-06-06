import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WS = ws => path.resolve(__dirname, ws);

function logSection(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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

  try {
    // ---- EXPERIMENT 4 FIX: Nebula API with singular intent ----
    logSection('EXPERIMENT 4 (FIXED): Nebula API - singular intent');
    const page4 = await browser.newPage();
    await page4.goto('about:blank');

    // Try with singular "intent"
    const intents = [
      "what is the fleet status",
      "what rooms are available",
      "fleet crate test status"
    ];

    const messageResults = {};
    for (const intent of intents) {
      console.log(`  Sending intent: "${intent}"`);
      const resp = await page4.evaluate(async (intent) => {
        try {
          const r = await fetch('https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intent })
          });
          const text = await r.text();
          let parsed;
          try { parsed = JSON.parse(text); } catch { parsed = text; }
          return { ok: r.ok, status: r.status, body: parsed };
        } catch (e) {
          return { error: e.message };
        }
      }, intent);
      console.log(`  Response:`, JSON.stringify(resp, null, 2));
      messageResults[intent] = resp;
    }

    // Also try with message field instead
    console.log('\n  Trying with "message" field...');
    const messageResp = await page4.evaluate(async () => {
      try {
        const r = await fetch('https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "what is the fleet status" })
        });
        const text = await r.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        return { ok: r.ok, status: r.status, body: parsed };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log(`  Message field response:`, JSON.stringify(messageResp, null, 2));

    // Try with query field
    console.log('\n  Trying with "query" field...');
    const queryResp = await page4.evaluate(async () => {
      try {
        const r = await fetch('https://fleet-murmur-worker.casey-digennaro.workers.dev/api/agent/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: "what is the fleet status" })
        });
        const text = await r.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        return { ok: r.ok, status: r.status, body: parsed };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log(`  Query field response:`, JSON.stringify(queryResp, null, 2));

    results.experiment4Fixed = {
      intents: messageResults,
      messageField: messageResp,
      queryField: queryResp
    };

    await page4.close();

    // ---- EXPERIMENT 3 FIX: Hub - click room items ----
    logSection('EXPERIMENT 3 (EXTENDED): Hub Room Navigation');
    const page3 = await browser.newPage();
    await page3.goto('https://voxelworks-fix.casey-digennaro.workers.dev/hub', {
      waitUntil: 'networkidle0', timeout: 30000
    });
    await sleep(2000);

    // First click the door to open the "Where to?" menu
    console.log('  Clicking door at (985, 432)...');
    await page3.mouse.click(985, 432);
    await sleep(1000);

    // Now click "🎨 Build Studio" room item (center at 640, 265)
    console.log('  Clicking "🎨 Build Studio" room item at (640, 265)...');
    await page3.mouse.click(640, 265);
    await sleep(3000);

    const studioUrl = page3.url();
    console.log(`  URL after clicking Build Studio: ${studioUrl}`);

    // Check what page we ended up on
    const pageTitle = await page3.title();
    console.log(`  Page title: ${pageTitle}`);

    const navScreenshots = [];
    // Screenshot whatever happened
    if (studioUrl.includes('studio') || studioUrl.includes('hub')) {
      await page3.screenshot({ path: '/home/ubuntu/.openclaw/workspace/workspace/hub-nav-studio.png', fullPage: true });
      console.log('  ✅ Screenshot: hub-nav-studio.png');
      navScreenshots.push('hub-nav-studio.png');
    }

    // Go back to hub and try another
    await page3.goto('https://voxelworks-fix.casey-digennaro.workers.dev/hub', {
      waitUntil: 'networkidle0', timeout: 30000
    });
    await sleep(2000);

    // Click door again
    await page3.mouse.click(985, 432);
    await sleep(1000);

    // Click "🧩 Asset Lab" (640, 326)
    console.log('\n  Clicking "🧩 Asset Lab" room item at (640, 326)...');
    await page3.mouse.click(640, 326);
    await sleep(3000);

    const labUrl = page3.url();
    console.log(`  URL after clicking Asset Lab: ${labUrl}`);
    console.log(`  Page title: ${await page3.title()}`);

    if (labUrl.includes('lab')) {
      await page3.screenshot({ path: '/home/ubuntu/.openclaw/workspace/workspace/hub-nav-lab.png', fullPage: true });
      console.log('  ✅ Screenshot: hub-nav-lab.png');
      navScreenshots.push('hub-nav-lab.png');
    }

    results.experiment3Extended = {
      studioUrl,
      labUrl,
      navScreenshots
    };

    await page3.close();

  } catch (e) {
    console.error('\n❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  await writeFile('/home/ubuntu/.openclaw/workspace/workspace/experiment-results-fixed.json', JSON.stringify(results, null, 2));
  console.log('\n' + '='.repeat(70));
  console.log('  FIXED RESULTS WRITTEN');
  console.log('='.repeat(70));
}

main().catch(e => {
  console.error('CRASH:', e);
  process.exit(1);
});
