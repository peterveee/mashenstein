import { chromium } from '/Users/Peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('file:///Users/Peter/mashenstein/galleries/poyo-pikachu-concept.html');
await p.waitForTimeout(600);
// crop to the "Proposed" run tile (2nd tile of 2nd section). Grab the whole
// proposed section twice, a beat apart, to see the run cheeks shift.
const sec = p.locator('section').nth(1);
await sec.screenshot({ path: 'scratchpad/pika-runA.png' });
await p.waitForTimeout(230);   // ~quarter stride later
await sec.screenshot({ path: 'scratchpad/pika-runB.png' });
console.log('errors:', errs.length ? errs : 'none');
await b.close();
