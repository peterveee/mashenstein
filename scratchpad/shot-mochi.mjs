import { chromium } from '/Users/Peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto('file:///Users/Peter/mashenstein/dist/gallery.html');
await p.waitForTimeout(400);
// filter to mochi so only Poyo's tiles show across every section
await p.fill('#filter', 'mochi');
await p.waitForTimeout(1200);
await p.screenshot({ path: 'scratchpad/mochi-gallery.png', fullPage: true });
console.log('errors:', errs.length ? errs : 'none');
await b.close();
