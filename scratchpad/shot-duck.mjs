import { chromium } from '/Users/Peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 3 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///Users/Peter/mashenstein/dist/gallery.html');
await p.waitForTimeout(400);
await p.fill('#filter', 'mochi');
await p.waitForTimeout(900);
const vis = p.locator('#heroes .card:visible');
await vis.nth(3).screenshot({ path: 'scratchpad/duck.png' });   // duck
await vis.nth(0).screenshot({ path: 'scratchpad/idle1.png' });  // idle
console.log('visible count:', await vis.count(), 'errors:', errs.length?errs:'none');
await b.close();
