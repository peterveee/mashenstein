import { chromium } from 'playwright';
import { buildPage } from '../tools/character-editor.js';

const html = await buildPage();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
await page.setContent(html);
await page.evaluate(() => window.characterEditor.freeze(.18));
const beforeNow = await page.evaluate(() => {
  const a = window.characterEditor.pixels('run', 'now'); let h = 2166136261;
  for (const x of a) h = Math.imul(h ^ x, 16777619); return h >>> 0;
});
const beforeEdit = await page.evaluate(() => {
  const a = window.characterEditor.pixels('run', 'edit'); let h = 2166136261;
  for (const x of a) h = Math.imul(h ^ x, 16777619); return h >>> 0;
});
await page.evaluate(() => window.characterEditor.setDial('tall', 1.15));
const afterEdit = await page.evaluate(() => {
  const a = window.characterEditor.pixels('run', 'edit'); let h = 2166136261;
  for (const x of a) h = Math.imul(h ^ x, 16777619); return h >>> 0;
});
const afterNow = await page.evaluate(() => {
  const a = window.characterEditor.pixels('run', 'now'); let h = 2166136261;
  for (const x of a) h = Math.imul(h ^ x, 16777619); return h >>> 0;
});
if (beforeEdit === afterEdit) throw new Error('edited run pixels did not change');
if (beforeNow !== afterNow) throw new Error('NOW changed with draft');
await page.evaluate(() => window.characterEditor.setBodyShape('tapered'));
if (await page.locator('[data-dial="waistScale"] input').count() !== 2) throw new Error('tapered waist control is missing');
await page.evaluate(() => window.characterEditor.setBodyShape('round'));
if (!(await page.locator('[data-dial="waistScale"]').evaluate((el) => el.classList.contains('off')))) throw new Error('round body did not disable waist control');
await page.evaluate(() => window.characterEditor.setMode('attack'));
if (!(await page.locator('[data-pose="attack"]').count())) throw new Error('attack preview card is missing');
await page.locator('.help').first().hover();
if (!(await page.locator('#tooltip-layer.show').count())) throw new Error('tooltip did not open');
const viewport = await page.evaluate(() => window.characterEditor.viewport());
if (!(Number(viewport.drawH) > 0 && Number(viewport.width) > 0 && Number(viewport.height) > 0)) throw new Error('viewport metrics are missing');
await page.evaluate(() => window.characterEditor.hero('gnash'));
if (!(await page.locator('[data-control="pose"] option[value="attack"]').isDisabled())) throw new Error('unsupported attack was not disabled');
if (await page.locator('[data-pose="attack"]').count()) throw new Error('unsupported hero received an empty attack card');
if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
console.log('CHARACTER EDITOR BROWSER: PASSED');
