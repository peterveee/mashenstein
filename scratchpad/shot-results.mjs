import { chromium } from 'playwright';

const hero = process.argv[2] || 'fernwick';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 620 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto(`http://127.0.0.1:8000/?fps&mute&goto=stage&cab=plumber&stage=plumber-1&hero=${hero}&invuln&time=6`);
await p.waitForFunction(() => window.__mash_booted, null, { timeout: 20000 });
await p.keyboard.press('Enter');
await p.waitForTimeout(400);
await p.keyboard.press('Enter');
// Wait for the run to auto-finish into results.
await p.waitForFunction(() => window.__mash_state === 'ResultsState', null, { timeout: 30000 })
  .catch(() => console.log('state now:', null));
console.log('state:', await p.evaluate(() => window.__mash_state));
for (const [i, wait] of [[1, 900], [2, 700], [3, 700], [4, 700]]) {
  await p.waitForTimeout(wait);
  await p.locator('#game').screenshot({ path: `/Users/Peter/mashenstein/scratchpad/results-${hero}-${i}.png` });
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
