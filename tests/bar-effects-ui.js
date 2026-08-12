// The Bar Effects popup is an editor, not merely a list of effect names. Exercise the
// real served desk so staged parameters, bypass/order changes, reload restoration and
// the final arrangement write all travel through the same DOM paths a user clicks.
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
const warnings = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text());
});

await page.addInitScript(() => {
  if (sessionStorage.getItem('mash-bar-fx-test-seeded')) return;
  sessionStorage.setItem('mash-bar-fx-test-seeded', '1');
  localStorage.setItem('mash-mixer-tutorial-seen', '1');
  localStorage.setItem('mash-mixer-song', 'plumber');
  localStorage.setItem('mash-mixer-desk-session', JSON.stringify({
    version: 1,
    song: 'plumber',
    lane: 'bass',
    selection: { key: 'bass', from: 1, to: 1 },
    position: 0,
    loop: { on: false, locA: null, locB: null },
    lowerView: 'mixer',
    effectsOpen: false,
    libraryOpen: false,
    drawerOpen: false,
    voiceEditor: null,
    popup: {
      kind: 'barEffects', laneKey: 'bass', from: 1, to: 1, x: 260, y: 90,
      chain: [{ id: 'delay', params: { sync: 0, delayMs: 321, feedback: 0.3, wet: 0.6 } }],
      fields: [], active: -1, scrollTop: 0,
    },
    scroll: { arrangement: 0, mixer: 0, effects: 0, roll: null, kit: null },
  }));
});

const ready = async () => {
  await page.waitForSelector('#regionedit.barfxmodal.show .barfxdevice', { timeout: 20000 });
  await page.waitForTimeout(250);
};

const popupState = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('#regionedit.barfxmodal .barfxdevice')];
  const parameter = (card, label) => [...(card?.querySelectorAll('.row') || [])]
    .find((row) => row.querySelector('.k')?.textContent.trim() === label)
    ?.querySelector('input, select');
  return {
    names: cards.map((card) => card.querySelector('h4')?.textContent || ''),
    bypassed: cards.map((card) => card.classList.contains('bypassed')),
    feedback: parameter(cards.find((card) => card.querySelector('h4')?.textContent === 'Delay'), 'FEEDBACK')?.value,
    cardControls: cards.map((card) => card.querySelectorAll('.devgrid input, .devgrid select').length),
    status: document.querySelector('#regionedit.barfxmodal .barfxstatus')?.textContent || '',
    addDisabled: !!document.querySelector('#regionedit.barfxmodal .regcontrol select + button')?.disabled,
    applyPlay: !![...document.querySelectorAll('#regionedit.barfxmodal button')]
      .find((button) => button.textContent.trim() === 'Apply + Play'),
    popup: document.querySelector('#regionedit')?.classList.contains('show'),
  };
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await ready();
  const opened = await popupState();
  assert(opened.names[0] === 'Delay' && opened.cardControls[0] >= 4,
    'a restored bar effect opens as a parameterised effect card');
  assert(opened.addDisabled && opened.applyPlay && opened.status.includes('Apply + Play'),
    'the editor starts with an explicit effect choice and a direct Apply + Play audition path');

  await page.evaluate(() => {
    const card = document.querySelector('#regionedit.barfxmodal .barfxdevice');
    const feedback = [...card.querySelectorAll('.row')]
      .find((row) => row.querySelector('.k')?.textContent.trim() === 'FEEDBACK')
      ?.querySelector('input[type="range"]');
    feedback.value = '0.71';
    feedback.dispatchEvent(new Event('input', { bubbles: true }));
    card.querySelector('.devtoggle').click();
    const addRow = [...document.querySelectorAll('#regionedit.barfxmodal .regcontrol')]
      .find((row) => row.querySelector('span')?.textContent === 'Add effect');
    const picker = addRow.querySelector('select'); picker.value = 'filter';
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    addRow.querySelector('button').click();
    const cards = document.querySelectorAll('#regionedit.barfxmodal .barfxdevice');
    cards[1].querySelector('.barfxmove').click();
  });

  const staged = await popupState();
  assert(JSON.stringify(staged.names) === '["Filter","Delay"]',
    'bar-effect cards can be reordered before Apply');
  assert(staged.status.startsWith('Filter + Delay replaces'),
    'the editor names the active bar chain and the exact bars it replaces');
  assert(staged.bypassed[1] && Math.abs(Number(staged.feedback) - 0.71) < 1e-6,
    'bypass and exact parameter changes remain staged on the moved card');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await ready();
  // Capture the restored controls and press Apply + Play in one browser turn. The popup is
  // intentionally dismissed when its tab loses focus; splitting these into separate
  // automation turns can manufacture that blur between the assertion and the click.
  const restored = await page.evaluate(() => {
    const root = document.querySelector('#regionedit.barfxmodal.show');
    const cards = [...(root?.querySelectorAll('.barfxdevice') || [])];
    const delay = cards.find((card) => card.querySelector('h4')?.textContent === 'Delay');
    const feedback = [...(delay?.querySelectorAll('.row') || [])]
      .find((row) => row.querySelector('.k')?.textContent.trim() === 'FEEDBACK')
      ?.querySelector('input[type="range"]')?.value;
    const state = {
      names: cards.map((card) => card.querySelector('h4')?.textContent || ''),
      bypassed: cards.map((card) => card.classList.contains('bypassed')),
      feedback,
      foundApply: !!root?.querySelector('.regapply'),
      buttons: [...(root?.querySelectorAll('button') || [])].map((button) => button.textContent.trim()),
    };
    root?.querySelector('.barfxplay')?.click();
    const bar = document.querySelector('.arrrow[data-lane="bass"]')?.querySelectorAll('.arrbar')[1];
    return { ...state, showing: root?.classList.contains('show'),
      playing: document.querySelector('#play')?.classList.contains('on') || false,
      title: bar?.title || '', text: bar?.textContent || '' };
  });
  assert(JSON.stringify(restored.names) === '["Filter","Delay"]'
    && restored.bypassed[1] && Math.abs(Number(restored.feedback) - 0.71) < 1e-6,
  'unapplied editable cards survive a genuine reload');
  assert(restored.foundApply && restored.playing && restored.showing,
    'Apply + Play keeps the staged editor open and starts the transport');
  if (!restored.foundApply) {
    console.error(`Bar Effects buttons after reload: ${JSON.stringify(restored.buttons)}`);
    console.error(`Browser warnings: ${JSON.stringify(warnings)}`);
  }
  assert(restored.title.includes('2 bar effects') || restored.text.includes('FX2'),
    'Apply writes the edited two-effect snapshot to the selected bar');

  await page.evaluate(() => {
    document.querySelector('#stop')?.click();
    document.querySelector('#regionedit .regclose')?.click();
    const bar = document.querySelector('.arrrow[data-lane="bass"] .arrbar[data-bar="0"]');
    bar?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 240, clientY: 140 }));
    [...document.querySelectorAll('#regionedit button')]
      .find((button) => button.textContent.trim() === 'Note FX…')?.click();
  });
  await page.waitForSelector('#regionedit.notefxmodal.show', { timeout: 20000 });
  const barNote = await page.evaluate(() => {
    const root = document.querySelector('#regionedit.notefxmodal');
    const strum = root.querySelector('input[type="checkbox"]');
    strum.checked = true;
    strum.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.regapply')?.click();
    return {
      apply: root.querySelector('.regapply')?.textContent || '',
      help: root.querySelector('.notefxhelp')?.textContent || '',
      showing: root.classList.contains('show'),
      playing: document.querySelector('#play')?.classList.contains('on') || false,
    };
  });
  assert(barNote.apply === 'Apply + Play' && barNote.showing && barNote.playing
    && barNote.help.includes('leaves this window open'),
  'bar Note FX applies, starts playback, and leaves its editor open');

  await page.evaluate(() => {
    document.querySelector('#stop')?.click();
    document.querySelector('#regionedit .regclose')?.click();
    const head = document.querySelector('.arrrow[data-lane="bass"] .arrhead-cell');
    head?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 240, clientY: 140 }));
    [...document.querySelectorAll('#regionedit button')]
      .find((button) => button.textContent.trim() === 'Note FX…')?.click();
  });
  await page.waitForSelector('#regionedit.notefxmodal.show', { timeout: 20000 });
  const trackNote = await page.evaluate(() => {
    const root = document.querySelector('#regionedit.notefxmodal');
    const strum = root.querySelector('input[type="checkbox"]');
    strum.checked = true;
    strum.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.regapply')?.click();
    return {
      apply: root.querySelector('.regapply')?.textContent || '',
      help: root.querySelector('.notefxhelp')?.textContent || '',
      showing: root.classList.contains('show'),
      playing: document.querySelector('#play')?.classList.contains('on') || false,
    };
  });
  assert(trackNote.apply === 'Apply' && trackNote.showing && !trackNote.playing
    && trackNote.help.includes('does not start playback'),
  'track Note FX applies without starting playback and leaves its editor open');
  assert(errors.length === 0,
    `the editable Bar Effects workflow raises no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (error) {
  console.error(`FAIL: Bar Effects browser test — ${error.message}`);
  failed = true;
} finally {
  await browser.close();
}

console.log(failed ? '\nMIXER EFFECTS UI: FAILED' : '\nMIXER EFFECTS UI: PASSED');
process.exit(failed ? 1 : 0);
