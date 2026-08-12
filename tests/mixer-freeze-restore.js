// User-chosen freeze-bundle persistence. Native file pickers are replaced with an
// Origin Private File System handle: it has the same structured-clone/file APIs,
// survives reload in IndexedDB, and needs no real dialog or access to personal files.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const url = process.env.MASH_MIXER_URL || 'http://127.0.0.1:8010/';
let failed = false;
const assert = (condition, message) => {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${message}`);
  if (!condition) failed = true;
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
const warnings = [];
const renderRequests = [];
const cacheRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text());
});
page.on('request', (request) => {
  if (request.url().includes('render-frame')) renderRequests.push(request.url());
  if (request.url().includes('/freeze-cache')) cacheRequests.push(request.url());
});

await page.addInitScript(() => {
  const chosenHandle = async (create = false) => {
    const root = await navigator.storage.getDirectory();
    return root.getFileHandle('chosen-location.mashfreeze', { create });
  };
  Object.defineProperty(globalThis, 'showSaveFilePicker', {
    configurable: true,
    value: async (options) => {
      sessionStorage.setItem('mash-freeze-save-picker-count',
        String(Number(sessionStorage.getItem('mash-freeze-save-picker-count') || 0) + 1));
      sessionStorage.setItem('mash-freeze-suggested-name', options?.suggestedName || '');
      return chosenHandle(true);
    },
  });
  Object.defineProperty(globalThis, 'showOpenFilePicker', {
    configurable: true,
    value: async () => {
      sessionStorage.setItem('mash-freeze-open-picker-count',
        String(Number(sessionStorage.getItem('mash-freeze-open-picker-count') || 0) + 1));
      return [await chosenHandle(false)];
    },
  });
  if (sessionStorage.getItem('mash-freeze-restore-seeded')) return;
  sessionStorage.setItem('mash-freeze-restore-seeded', '1');
  localStorage.setItem('mash-mixer-tutorial-seen', '1');
  localStorage.setItem('mash-mixer-song', 'velvet-kitten');
  localStorage.setItem('mash-mixer-frozen-tracks', JSON.stringify({
    version: 2,
    songs: { 'velvet-kitten': [{ lane: 'lead', from: 1, to: 1, whole: false }] },
  }));
});

const waitForQuestion = (title) => page.waitForFunction((wanted) =>
  document.querySelector('#ask.show #asktitle')?.textContent === wanted,
title, { timeout: 20000 });
const openDrawer = async () => {
  if (!await page.locator('#navdrawer.show').count()) await page.locator('#navbtn').click();
  await page.waitForSelector('#navdrawer.show');
};

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await waitForQuestion('Refreeze selection?');
  assert((await page.locator('#askbody').textContent()).includes('no current saved render'),
    'a remembered range with no chosen bundle offers the refreeze fallback');

  const started = Date.now();
  await page.locator('#askok').click();
  await page.waitForSelector('.arrrow[data-lane="lead"].partially-frozen', { timeout: 2000 });
  assert(Date.now() - started < 1500, 'a wholly empty selected range refreezes immediately');
  assert(await page.evaluate(() => Number(sessionStorage.getItem('mash-freeze-save-picker-count') || 0)) === 0,
    'freezing neither prompts to save nor opens a picker automatically');
  assert(cacheRequests.length === 0, 'freezing makes no automatic server-cache request');

  const frozenBars = await page.locator('.arrrow[data-lane="lead"] .arrbar.frozen').evaluateAll(
    (bars) => bars.map((bar) => Number(bar.dataset.bar)));
  assert(frozenBars.length === 1 && frozenBars[0] === 1,
    'the selected-bar freeze marks only its covered bar');

  await page.locator('#play').click();
  await page.waitForFunction(() => document.querySelector('#play')?.classList.contains('on'));
  await page.waitForTimeout(250);
  await openDrawer();
  assert(await page.locator('#exportfreezes').isEnabled(),
    'Export Freezes becomes available when this song has frozen audio');
  await page.locator('#exportfreezes').click();
  await waitForQuestion('Export 1 freeze?');
  const exportQuestion = await page.locator('#askbody').textContent();
  assert(/Approximately \d+(?:\.\d+)? (?:bytes|KB|MB)/.test(exportQuestion)
    && exportQuestion.includes('one lossless bundle'),
  'the export warning states the projected size and that all freezes share one file');
  assert(await page.evaluate(() => Number(sessionStorage.getItem('mash-freeze-save-picker-count') || 0)) === 0,
    'the size warning appears before the save-location picker');
  await page.locator('#askok').click();
  await page.waitForFunction(() => !document.querySelector('#play')?.classList.contains('on'));
  assert(!await page.locator('#play').evaluate((button) => button.classList.contains('on')),
    'confirming Freeze export stops live playback before encoding the bundle');
  await page.waitForFunction(() => Number(sessionStorage.getItem('mash-freeze-save-picker-count') || 0) === 1);
  await page.waitForFunction(() => document.querySelector('#toast')?.textContent?.includes('Freeze bundle saved to'));

  const saved = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const file = await (await root.getFileHandle('chosen-location.mashfreeze')).getFile();
    const magic = [...new Uint8Array((await file.arrayBuffer()).slice(0, 8))];
    const records = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mash-mixer-freeze-files', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const all = request.result.transaction('handles').objectStore('handles').getAll();
        all.onsuccess = () => resolve(all.result); all.onerror = () => reject(all.error);
      };
    });
    const diagnostics = JSON.parse(localStorage.getItem('mash-mixer-loop-log') || '[]')
      .filter((row) => String(row.status || '').startsWith('FREEZE EXPORT'));
    return { size: file.size, magic, records: records.map((item) => ({
      key: item.key, trackId: item.trackId, lane: item.lane,
      name: item.name, hasHandle: !!item.handle,
    })), suggested: sessionStorage.getItem('mash-freeze-suggested-name'), diagnostics };
  });
  assert(saved.size > 0 && saved.magic.join(',') === '77,83,72,70,82,90,66,49',
    'Export Freezes writes the versioned multi-freeze bundle format');
  assert(saved.records.length === 1 && saved.records[0].key === 'bundle\u0000velvet-kitten'
    && saved.records[0].name === 'chosen-location.mashfreeze' && saved.records[0].hasHandle
    && saved.records[0].lane == null,
  'IndexedDB remembers one reusable bundle handle for the song, not one record per range');
  assert(saved.suggested.endsWith('--freezes.mashfreeze'),
    'the suggested filename identifies the file as the song-wide freeze bundle');
  assert(saved.diagnostics.length === 2
    && saved.diagnostics[0].status === 'FREEZE EXPORT START'
    && saved.diagnostics[1].status === 'FREEZE EXPORT END'
    && saved.diagnostics[1].operationBytes === saved.size
    && saved.diagnostics[1].operationSegments === 1
    && Number.isFinite(saved.diagnostics[1].operationDurationMs),
  'freeze export logs start/end, exact bytes, segment count, duration and heap telemetry');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await waitForQuestion('Load saved freezes?');
  const loadQuestion = await page.locator('#askbody').textContent();
  assert(loadQuestion.includes('lossless rendered audio exported for this song')
    && loadQuestion.includes('instead of rendering'),
  'reload explains that the current frozen ranges can come from the remembered bundle');
  const loadStarted = Date.now();
  await page.locator('#askok').click();
  await page.waitForSelector('.arrrow[data-lane="lead"].partially-frozen', { timeout: 2000 });
  assert(Date.now() - loadStarted < 1500, 'saved PCM is reinstalled immediately');
  assert(renderRequests.length === 0 && cacheRequests.length === 0,
    'loading the bundle invokes neither the renderer nor the removed server cache');

  // Intent is the authority after export. Use the actual menu to explicitly unfreeze:
  // the older bundle still contains PCM, but reload must not resurrect that range.
  await page.locator('.arrrow[data-lane="lead"] .arrbar[data-bar="1"]').click({ button: 'right' });
  await page.getByRole('button', { name: 'Unfreeze Selected Bars', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.arrrow[data-lane="lead"]')?.classList.contains('frozen'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(500);
  assert(await page.locator('#ask.show').count() === 0
    && await page.locator('.arrrow[data-lane="lead"].frozen').count() === 0,
  'an explicitly unfrozen range is not restored merely because an older bundle contains it');

  await openDrawer();
  await page.locator('#importfreezes').click();
  await page.waitForFunction(() => Number(sessionStorage.getItem('mash-freeze-open-picker-count') || 0) === 1);
  await page.waitForSelector('.arrrow[data-lane="lead"].partially-frozen', { timeout: 2000 });
  assert((await page.evaluate(() => localStorage.getItem('mash-mixer-frozen-tracks')))?.includes('lead'),
    'manual Import Freezes reinstalls compatible entries and their reload intent');
  assert(errors.length === 0,
    `the bundle export/import flow raises no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (error) {
  const state = await page.evaluate(() => ({
    ask: document.querySelector('#ask.show #asktitle')?.textContent || '',
    toast: document.querySelector('#toast')?.textContent || '',
    frozenClass: document.querySelector('.arrrow[data-lane="lead"]')?.className || '',
  })).catch(() => ({}));
  console.error(`FAIL: mixer freeze restore browser test — ${error.message}`);
  console.error(`state: ${JSON.stringify(state)}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`
    + `${warnings.length ? ` warnings: ${warnings.join(' | ')}` : ''}`);
  failed = true;
} finally {
  await browser.close();
}

console.log(failed ? '\nMIXER FREEZE RESTORE: FAILED' : '\nMIXER FREEZE RESTORE: PASSED');
process.exit(failed ? 1 : 0);
