import { chromium } from '/Users/Peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file:///Users/Peter/mashenstein/dist/gallery.html');
await p.waitForTimeout(400);
// Keep only 'idle' tiles across all heroes for a clean height comparison.
await p.fill('#filter', 'idle');
await p.waitForTimeout(1000);
const sec = p.locator('#heroes');
await sec.screenshot({ path: 'scratchpad/all-idle.png' });
await b.close();
console.log('done');
