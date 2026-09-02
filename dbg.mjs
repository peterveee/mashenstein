import { chromium } from '/Users/Peter/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://localhost:8001/?fps&goto=stage&cab=rhythm&stage=rhythm-3&invuln', { waitUntil: 'load' });
await page.waitForFunction(() => window.__mash_booted, null, { timeout: 20000 });
for (let i=0;i<3;i++){ await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
await page.waitForFunction(() => window.__mash_state === 'RunState', null, {timeout:20000});
await page.waitForTimeout(12000);
console.log('__bg_marks =', await page.evaluate(() => window.__bg_marks));
await page.locator('#game').screenshot({ path: '/Users/Peter/mashenstein/work/local/beatground/dbg.png' });
await b.close();
