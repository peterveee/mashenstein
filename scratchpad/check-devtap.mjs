// iPhone portrait: five taps on the rotate heading must replace the card with
// the dev menu in place, and the menu must be drivable and escapable by thumb.
import { chromium, devices } from 'playwright';

const out = '/private/tmp/claude-502/-Users-Peter-mashenstein/cff5dd42-aed2-48b4-9a9f-43b1ca40f3f1/scratchpad';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));

const state = () => page.evaluate(() => ({
  open: !!window.__mash_dev?.open,
  depth: window.__mash_dev?.stack.length || 0,
  title: window.__mash_dev?.top()?.title || null,
  card: !document.getElementById('portrait-overlay').hidden,
  screen: window.__mash_cur?.constructor?.name,
  paused: !!window.__mash_lifecycle && window.__mash_lifecycle.currentPolicy().paused,
}));
const show = (label, s) => console.log(label.padEnd(34),
  `menu=${s.open} depth=${s.depth} ${String(s.title)} | card=${s.card} paused=${s.paused} state=${s.screen}`);

await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__mash_booted === true, null, { timeout: 30000 });
await page.waitForSelector('#portrait-overlay:not([hidden])', { timeout: 10000 });
show('portrait, before the taps', await state());

const title = page.locator('#portrait-overlay-title');
const openMenu = async () => {
  for (let i = 0; i < 5; i++) await title.click();
  await page.waitForTimeout(700);
};
// Recomputed per tap: the letterboxed band moves when a destination screen
// claims the whole viewport for itself.
const tap = async (lx, ly, ms = 400) => {
  const r = await page.evaluate(() => {
    const b = document.getElementById('game').getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  await page.mouse.click(r.x + (lx / 480) * r.w, r.y + (ly / 270) * r.h);
  await page.waitForTimeout(ms);
};

await openMenu();
show('after five heading taps', await state());
await tap(60, 30);
show('tapped row 0 (STAGES)', await state());
await tap(120, 10);
show('tapped the top bar (back)', await state());
await tap(120, 10, 700);
show('tapped the top bar (close)', await state());
await page.screenshot({ path: `${out}/devmenu-portrait-card-back.png` });

// A landscape-only destination must land its transition and then hand the
// screen back to the rotate card rather than freezing half-way through it.
await openMenu();
await tap(60, 70, 2500);   // TROPHY ROOM
show('launched the trophy room', await state());
await page.screenshot({ path: `${out}/devmenu-portrait-landscape-dest.png` });

// A portrait-capable destination keeps the screen: no card, no rotation.
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(1500);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
await openMenu();
await tap(60, 175);        // VISUALISERS
show('tapped VISUALISERS', await state());
await tap(60, 30, 2500);   // first preset
show('launched a visualizer', await state());
await page.screenshot({ path: `${out}/devmenu-portrait-jukebox.png` });

await browser.close();
