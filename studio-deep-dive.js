const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SITE = 'https://voxelworks-fix.casey-digennaro.workers.dev/studio';
const WORKSPACE = '/home/ubuntu/.openclaw/workspace';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: 'new',
  });
  const page = await browser.newPage();

  // Capture ALL console output
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));

  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dump the FULL HTML
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  console.log('\n=== FULL PAGE HTML SOURCE ===');
  console.log(html);
  fs.writeFileSync(path.join(WORKSPACE, 'studio-full-source.html'), html);
  console.log('\n(Saved to studio-full-source.html)');

  // Check all computed styles to understand layout
  const layoutInfo = await page.evaluate(() => {
    const palette = document.querySelector('.palette');
    const workspace = document.querySelector('.workspace');
    const header = document.querySelector('header');
    
    function getStyles(el) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        flexDirection: cs.flexDirection,
        overflow: cs.overflow,
        visibility: cs.visibility,
      };
    }

    return {
      palette: getStyles(palette),
      workspace: getStyles(workspace),
      header: getStyles(header),
      paletteChildren: palette ? [...palette.children].map(c => ({
        tag: c.tagName,
        class: c.className,
        text: c.textContent?.trim().substring(0, 80),
        style: getComputedStyle(c).display,
        rect: (() => { try { const r = c.getBoundingClientRect(); return `${r.x},${r.y} ${r.width}x${r.height}`; } catch(e) { return 'hidden'; } })(),
      })) : [],
    };
  });

  console.log('\n=== LAYOUT ANALYSIS ===');
  console.log(JSON.stringify(layoutInfo, null, 2));

  // List all CSS rules
  const cssRules = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.cssText && rule.selectorText && 
              (rule.selectorText.includes('palette') || rule.selectorText.includes('categor') || 
               rule.selectorText.includes('block') || rule.selectorText.includes('motion') ||
               rule.selectorText.includes('sound') || rule.selectorText.includes('control') ||
               rule.selectorText.includes('looks'))) {
            rules.push(rule.cssText);
          }
        }
      } catch(e) {
        rules.push(`[CORS blocked] sheet ${sheet.href}`);
      }
    }
    return rules;
  });

  console.log('\n=== CATEGORY-RELATED CSS RULES ===');
  for (const r of cssRules) console.log(r);

  // Check the inline script for content
  const scriptContent = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    return scripts[0]?.textContent || '(no inline script)';
  });
  console.log('\n=== INLINE SCRIPT (first 5000 chars) ===');
  console.log(scriptContent.substring(0, 5000));

  console.log('\n=== INLINE SCRIPT (5000-10000 chars) ===');
  console.log(scriptContent.substring(5000, 10000));

  console.log('\n=== INLINE SCRIPT (10000-15000 chars) ===');
  console.log(scriptContent.substring(10000, 15000));

  console.log('\n=== INLINE SCRIPT (15000-23767 chars) ===');
  console.log(scriptContent.substring(15000));

  // Check element attributes more carefully
  const paletteDetails = await page.evaluate(() => {
    const palette = document.querySelector('.palette');
    if (!palette) return 'No palette found';
    
    // Check all attributes of palette
    const attrs = {};
    for (const attr of palette.attributes) {
      attrs[attr.name] = attr.value;
    }

    // Check all descendants recursively (up to depth 5)
    const tree = [];
    function walk(el, depth) {
      if (depth > 5) return;
      const entry = {
        tag: el.tagName,
        class: el.className,
        id: el.id,
        text: el.childNodes.length === 1 && el.firstChild?.nodeType === 3 ? el.textContent?.trim().substring(0, 50) : undefined,
        attrs: {},
      };
      for (const attr of el.attributes) {
        entry.attrs[attr.name] = attr.value;
      }
      
      if (el.children.length > 0) {
        entry.children = [];
        for (const child of el.children) {
          entry.children.push(walk(child, depth + 1));
        }
      }
      return entry;
    }
    for (const child of palette.children) {
      tree.push(walk(child, 1));
    }
    return { attributes: attrs, tree };
  });
  
  console.log('\n=== PALETTE DETAILED WALK ===');
  console.log(JSON.stringify(paletteDetails, null, 2).substring(0, 10000));

  await browser.close();
}
main().catch(err => { console.error(err); process.exit(1); });
