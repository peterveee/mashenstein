// The desk reloads as a workspace: transport remains stopped, but the exact song,
// channel, bar range, working loop, lower view, inspector and staged popup return.
// Run against the local mixer (`npm run mixer`) so the same bundled page a user has
// open receives a genuine browser reload and lifecycle events.
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
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.addInitScript(() => {
  if (sessionStorage.getItem('mash-session-test-seeded')) return;
  sessionStorage.setItem('mash-session-test-seeded', '1');
  localStorage.setItem('mash-mixer-tutorial-seen', '1');
  localStorage.setItem('mash-mixer-song', 'plumber');
  localStorage.setItem('mash-mixer-desk-session', JSON.stringify({
    version: 1,
    song: 'plumber',
    lane: 'bass',
    selection: { key: 'bass', from: 1, to: 2 },
    position: 21,
    loop: { on: true, locA: null, locB: null },
    lowerView: 'roll',
    effectsOpen: true,
    libraryOpen: false,
    drawerOpen: false,
    voiceEditor: null,
    popup: { kind: 'noteFx', laneKey: 'bass', scope: { from: 1, to: 2 },
      x: 300, y: 180, scrollTop: 0, fields: [], active: -1 },
    scroll: { arrangement: 0, mixer: 0, effects: 0,
      roll: { top: 240, left: 80, followX: false, selection: [] },
      kit: { top: 0, left: 0, followX: true, selection: [] } },
  }));
});

const ready = async () => {
  await page.waitForFunction(() => document.querySelector('#nowsong')?.textContent !== '—'
    && document.querySelectorAll('.arrrow').length > 0
    && document.querySelector('#regionedit.show'), null, { timeout: 20000 });
  await page.waitForTimeout(450);
};

const state = () => page.evaluate(() => {
  const row = document.querySelector('.arrrow[data-lane="bass"]');
  const roll = document.querySelector('#pianoroll .ssqscroll');
  const popup = document.querySelector('#regionedit.show');
  const field = (label) => [...(popup?.querySelectorAll('label') || [])]
    .find((item) => item.textContent.trim().startsWith(label))
    ?.querySelector('input, select, [role="combobox"]');
  return {
    song: document.querySelector('#nowsong')?.textContent,
    lane: row?.classList.contains('sel'),
    selected: row ? [...row.querySelectorAll('.arrbar')]
      .map((bar, index) => bar.classList.contains('sel') ? index : -1).filter((i) => i >= 0) : [],
    loop: document.querySelector('#looptoggle')?.classList.contains('on'),
    view: document.querySelector('#desk')?.dataset.lowerView,
    effects: document.querySelector('#devices')?.classList.contains('fxwindow-open'),
    popup: popup?.querySelector('.regtitle')?.textContent || '',
    popupLeft: Number.parseFloat(popup?.style.left) || 0,
    popupTop: Number.parseFloat(popup?.style.top) || 0,
    arpOn: field('Arpeggiator')?.checked,
    repeat: field('Repeat pattern')?.checked,
    gap: field('Gap')?.value,
    playing: document.querySelector('#play')?.classList.contains('on'),
    playhead: Number.parseFloat(document.querySelector('#playhead')?.style.left) || 0,
    rollTop: roll?.scrollTop || 0,
    rollLeft: roll?.scrollLeft || 0,
    snapshot: JSON.parse(localStorage.getItem('mash-mixer-desk-session') || 'null'),
  };
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await ready();
  const first = await state();
  assert(first.snapshot?.song === 'plumber' && first.song && first.song !== '—',
    'the remembered song returns');
  assert(first.lane, 'the remembered track is selected in the arrangement');
  assert(JSON.stringify(first.selected) === '[1,2]', 'the remembered bar range returns');
  assert(first.loop, 'the working bar loop returns armed');
  assert(first.view === 'roll' && first.effects, 'the lower workspace and Effects inspector return');
  assert(first.popup.includes('Note FX') && first.popup.includes('bars 2–3'),
    'the staged bar Note FX popup returns at its original scope');
  assert(first.popupLeft === 300 && first.popupTop === 180,
    'the popup returns to its saved position');
  assert(!first.playing, 'reload restores position without autoplaying audio');
  assert(first.playhead > 0, 'the parked playhead returns away from the song start');
  assert(first.rollTop > 0, 'the piano-roll pitch viewport returns');

  // Leave unapplied values in the modeless editor. They are workspace state until
  // Apply, and a reload should not silently throw that unfinished adjustment away.
  await page.evaluate(() => {
    const popup = document.querySelector('#regionedit.show');
    const field = (label) => [...popup.querySelectorAll('label')]
      .find((item) => item.textContent.trim().startsWith(label))
      ?.querySelector('input, select, [role="combobox"]');
    const arp = field('Arpeggiator'); arp.checked = true;
    const repeat = field('Repeat pattern'); repeat.checked = false;
    const gap = field('Gap'); gap.value = '37';
    for (const input of [arp, repeat, gap]) input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // This second load is the real capture path: beforeunload writes the live desk,
  // and the init script deliberately does not seed it again in this tab.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await ready();
  const second = await state();
  assert(second.snapshot?.position === 21 && second.playhead > 0,
    'beforeunload captures and restores the parked transport position');
  assert(JSON.stringify(second.selected) === '[1,2]' && second.loop,
    'a genuine second reload preserves selection and loop');
  assert(second.popup.includes('Note FX') && second.effects && second.view === 'roll',
    'a genuine second reload preserves popup and workspace windows');
  assert(second.arpOn === true && second.repeat === false && second.gap === '37',
    'unapplied popup values survive the reload');
  assert(!second.playing, 'the second reload remains silent until Play');
  assert(errors.length === 0, `the two reloads raise no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (error) {
  console.error(`FAIL: mixer session browser test — ${error.message}`);
  failed = true;
} finally {
  await browser.close();
}

console.log(failed ? '\nMIXER SESSION: FAILED' : '\nMIXER SESSION: PASSED');
process.exit(failed ? 1 : 0);
