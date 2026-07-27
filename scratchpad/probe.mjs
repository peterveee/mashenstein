import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__mash_booted === true, null, { timeout: 30000 });
await page.waitForSelector('#portrait-overlay:not([hidden])');
const title = page.locator('#portrait-overlay-title');
for (let i = 0; i < 5; i++) await title.click();
await page.waitForTimeout(700);
const tap = async (lx, ly, ms = 400) => {
  const r = await page.evaluate(() => {
    const b = document.getElementById('game').getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  await page.mouse.click(r.x + (lx / 480) * r.w, r.y + (ly / 270) * r.h);
  await page.waitForTimeout(ms);
};
await tap(60, 70, 2500);   // TROPHY ROOM
console.log(await page.evaluate(() => ({
  state: window.__mash_cur?.constructor?.name,
  portraitMode: window.__mash_cur?.constructor?.portraitMode ?? null,
  devOpen: window.__mash_dev?.open,
  allowPortrait: window.__mash_lifecycle.allowPortrait(),
  policy: window.__mash_lifecycle.currentPolicy(),
  cardHidden: document.getElementById('portrait-overlay').hidden,
  innerW: window.innerWidth, innerH: window.innerHeight,
  matches: window.matchMedia('(orientation: portrait)').matches,
})));
await browser.close();
