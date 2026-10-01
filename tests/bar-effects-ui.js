// The Spot FX popup is a live editor, like an insert card: every gesture is written as it
// is made. Exercise the real served desk so parameter, bypass and order changes, the
// one-drag-one-undo rule, reload restoration, Play and Close all travel through the same
// DOM paths a user clicks.
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
// The desk mirrors its diagnostics log to work/local/mixer-diagnostics.csv, the file a live
// desk on the same checkout is writing too. Answered here, so a test never overwrites it.
await page.route('**/diagnostics-log', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
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
  const root = document.querySelector('#regionedit.barfxmodal');
  const slots = [...(root?.querySelectorAll('.barfxslot') || [])];
  const card = root?.querySelector('.barfxcard .barfxdevice');
  const parameter = (label) => [...(card?.querySelectorAll('.row') || [])]
    .find((row) => row.querySelector('.k')?.textContent.trim() === label)
    ?.querySelector('input, select');
  return {
    names: slots.map((slot) => slot.querySelector('.fxname')?.textContent || ''),
    bypassed: slots.map((slot) => !slot.classList.contains('on')),
    selected: slots.findIndex((slot) => slot.classList.contains('selected')),
    cardName: card?.querySelector('h4')?.textContent || '',
    cardBypassed: !!card?.classList.contains('bypassed'),
    cardControls: card ? card.querySelectorAll('.devgrid input, .devgrid select').length : 0,
    feedback: card?.querySelector('h4')?.textContent === 'Delay' ? parameter('FEEDBACK')?.value : undefined,
    status: root?.querySelector('.barfxstatus')?.textContent || '',
    plus: !!root?.querySelector('.barfxslots > .barfxaddslot:not(:disabled)'),
    oldParts: !!root?.querySelector('.regcontrol, .barfxguide, .barfxmove'),
    buttons: [...(root?.querySelectorAll('button') || [])].map((button) => button.textContent.trim()),
    title: root?.querySelector('.regtitle')?.textContent || '',
    popup: document.querySelector('#regionedit')?.classList.contains('show'),
  };
});

// What the desk has written for bass, bar 2 — read from the draft it persists, because
// Spot FX has no Apply: the draft IS the result of every gesture.
const written = () => page.evaluate(() => {
  const all = JSON.parse(localStorage.getItem('mash-mixer-arrangement') || '{}');
  const fx = all.plumber?.automation?.bass?.fx || [];
  // Sixteenths in the editor's draft, [bar, step] in the file format: either is a place.
  const at = (p) => (Array.isArray(p) ? (p[0] - 1) * 16 + (p[1] || 0) : Number(p));
  const chain = fx.find((section) => at(section.from) <= 16 && at(section.to) > 16)?.chain || [];
  return {
    ids: chain.map((effect) => effect.id),
    bypass: chain.map((effect) => !!effect.bypass),
    feedback: chain.find((effect) => effect.id === 'delay')?.params?.feedback,
  };
});
// Which step-painting mode the window is in, and whose steps Where is showing.
const modeNow = () => page.evaluate(() => {
  const root = document.querySelector('#regionedit.barfxmodal');
  return {
    pressed: root?.querySelector('.barfxmodeseg .segbtn.on')?.textContent || '',
    where: root?.querySelector('.barfxwherehead > span')?.textContent || '',
    minis: root?.querySelectorAll('.barfxslot .barfxmini').length || 0,
  };
});
// The effects written on bar 2's first and third beats.
const beats = () => page.evaluate(() => {
  const all = JSON.parse(localStorage.getItem('mash-mixer-arrangement') || '{}');
  const fx = all.plumber?.automation?.bass?.fx || [];
  const at = (p) => (Array.isArray(p) ? (p[0] - 1) * 16 + (p[1] || 0) : Number(p));
  const covering = (step) => fx.find((s) => at(s.from) <= step && at(s.to) > step)?.chain.map((e) => e.id) || [];
  return JSON.stringify({ beat1: covering(16), beat3: covering(24) });
});
const clickIn = (text, scope = '') => page.evaluate(([label, within]) => {
  [...document.querySelectorAll(`#regionedit.barfxmodal ${within} button`)]
    .find((button) => button.textContent.trim() === label)?.click();
}, [text, scope]);
// Out with None, then the first four 1/16 steps — beat 1 — painted back in one stroke.
const paintBeat1 = async () => {
  await clickIn('None', '.barfxwherehead');
  const stepCells = page.locator('#regionedit.barfxmodal .barfxrow:first-child .barfxcell');
  const firstStep = await stepCells.nth(0).boundingBox();
  const fourthStep = await stepCells.nth(3).boundingBox();
  await page.mouse.move(firstStep.x + firstStep.width / 2, firstStep.y + firstStep.height / 2);
  await page.mouse.down();
  await page.mouse.move(fourthStep.x + fourthStep.width / 2, fourthStep.y + fourthStep.height / 2, { steps: 5 });
  await page.mouse.up();
};
const frames = (n = 2) => page.evaluate((count) => new Promise((done) => {
  let left = count;
  const tick = () => (--left <= 0 ? done() : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
}), n);
// The Delay card has to be the one showing: one card at a time, the selected slot's.
const setFeedback = (value) => page.evaluate((v) => {
  const card = [...document.querySelectorAll('#regionedit.barfxmodal .barfxcard .barfxdevice')]
    .find((c) => c.querySelector('h4')?.textContent === 'Delay');
  const input = [...card.querySelectorAll('.row')]
    .find((row) => row.querySelector('.k')?.textContent.trim() === 'FEEDBACK')
    ?.querySelector('input[type="range"]');
  input.value = String(v);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}, value);

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await ready();
  const opened = await popupState();
  assert(JSON.stringify(opened.names) === '["Delay"]' && opened.selected === 0
    && opened.cardName === 'Delay' && opened.cardControls >= 4,
    'a restored Spot FX chain opens as a slot, with its parameterised card beside it');
  assert(opened.title.startsWith('Spot FX') && opened.plus && !opened.oldParts,
    'the editor is called Spot FX and adds through a + slot, not a dropdown');
  assert(opened.buttons.includes('▶ Play') && !opened.buttons.some((b) => /Apply/.test(b)),
    'the footer has a Play button and no Apply');

  // A knob is written with nothing pressed.
  await setFeedback(0.71);
  await frames(3);
  const knob = await written();
  assert(JSON.stringify(knob.ids) === '["delay"]' && Math.abs(Number(knob.feedback) - 0.71) < 1e-6,
    'a parameter change is in the draft at once, with nothing to apply');

  // Bypass the Delay on its card, then add a Filter through the + and the catalogue.
  const catalogue = await page.evaluate(() => {
    const root = document.querySelector('#regionedit.barfxmodal');
    root.querySelector('.barfxcard .devtoggle').click();
    const plus = () => root.querySelector('.barfxaddslot');
    plus().click();
    const picker = document.querySelector('#fxpicker');
    const offered = [...picker.querySelectorAll('button')].map((b) => b.querySelector('span')?.textContent || '');
    const open = picker.classList.contains('show') && root.classList.contains('show');
    plus().click();
    const toggled = !picker.classList.contains('show') && root.classList.contains('show');
    plus().click();
    [...picker.querySelectorAll('button')].find((b) => b.querySelector('span')?.textContent === 'Filter').click();
    return { offered, open, toggled, closedOnPick: !picker.classList.contains('show') };
  });
  assert(catalogue.open && catalogue.offered.includes('Stutter') && catalogue.offered.includes('Bit Crusher')
    && !catalogue.offered.some((name) => /Compressor|Limiter|Noise Gate|Tape Saturation|Vibrato|Pitch Shift/.test(name)),
  `the + opens the catalogue over the window with what a section can hold (${catalogue.offered.length} effects)`);
  assert(catalogue.toggled && catalogue.closedOnPick,
    'the + puts the catalogue away again, and picking from it closes it and keeps the window');
  const added = await popupState();
  assert(JSON.stringify(added.names) === '["Delay","Filter"]' && added.selected === 1 && added.cardName === 'Filter',
    'a picked effect lands at the end of the chain with its card showing');
  // Drag the Filter's slot onto the Delay's: one shared DataTransfer, as a browser makes.
  await page.evaluate(() => {
    const slots = [...document.querySelectorAll('#regionedit.barfxmodal .barfxslot')];
    const data = new DataTransfer();
    slots[1].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: data }));
    slots[0].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
    slots[0].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
    slots[1].dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: data }));
  });
  const live = await popupState();
  const liveWritten = await written();
  assert(JSON.stringify(live.names) === '["Filter","Delay"]' && live.selected === 0 && live.cardName === 'Filter'
    && live.bypassed[1] && JSON.stringify(liveWritten.ids) === '["filter","delay"]' && liveWritten.bypass[1],
  'bypass, add and a dragged reorder are each written as they are made, and the selection follows its effect');
  assert(live.status.includes('Filter + Delay: all of bar 2') && live.status.includes('ahead of its own inserts'),
    'the status says where the chain plays, and that it runs ahead of the channel inserts');

  // ALL EFFECTS, the default: one set of steps for the whole chain. Painted down to beat 1, the
  // Filter and the Delay both go with it.
  const shared = await modeNow();
  assert(shared.pressed === 'All effects' && shared.where === 'Where' && shared.minis === 0,
    `the window opens painting one set of steps for every effect (${JSON.stringify(shared)})`);
  await paintBeat1();
  const together = await beats();
  assert(together === '{"beat1":["filter","delay"],"beat3":[]}',
    `on All effects a stroke moves the whole chain (${together})`);
  await clickIn('All', '.barfxwherehead');
  const before = await beats();
  // EACH EFFECT is a way of looking: switching to it writes nothing.
  await clickIn('Each effect');
  const each = await modeNow();
  const unchanged = await beats();
  assert(each.pressed === 'Each effect' && each.where === 'Where · Filter' && each.minis === 2
    && unchanged === before && before === '{"beat1":["filter","delay"],"beat3":["filter","delay"]}',
  `Each effect shows the selected effect's own steps, with a coverage strip per slot, and writes nothing (${JSON.stringify(each)})`);

  // Each effect lights its own steps. The Filter (selected) taken off the bar and painted back
  // on beat 1 only, with the Delay still across the bar: beat 1 is Filter into Delay, the rest
  // Delay alone — two sections.
  await paintBeat1();
  const split = await page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('mash-mixer-arrangement') || '{}');
    const fx = all.plumber?.automation?.bass?.fx || [];
    const at = (p) => (Array.isArray(p) ? (p[0] - 1) * 16 + (p[1] || 0) : Number(p));
    const covering = (step) => fx.find((s) => at(s.from) <= step && at(s.to) > step)?.chain.map((e) => e.id) || [];
    const root = document.querySelector('#regionedit.barfxmodal');
    return {
      beat1: covering(16), beat3: covering(24),
      where: root.querySelector('.barfxwherehead > span')?.textContent || '',
      lit: root.querySelectorAll('.barfxcell[data-state="on"]').length,
      also: root.querySelectorAll('.barfxcell[data-also="1"]').length,
    };
  });
  assert(JSON.stringify(split.beat1) === '["filter","delay"]' && JSON.stringify(split.beat3) === '["delay"]',
    `an effect lit on beat 1 only is written as its own section beside the effect lit across the bar (${JSON.stringify(split)})`);
  assert(split.where === 'Where · Filter' && split.lit === 4 && split.also === 12,
    'Where shows the selected effect\'s steps, with the other effect\'s marked faintly behind them');
  const perEffect = await popupState();
  assert(perEffect.status.includes('Filter: 1 beat of bar 2') && perEffect.status.includes('Delay: all of bar 2'),
    'the status says where each effect plays');
  // Back to All effects with steps that differ: every effect takes the ones showing — the
  // Filter's beat 1 — written as a change, and ⌘Z puts the Delay's bar back on Each effect.
  await clickIn('All effects');
  const unified = await beats();
  const unifiedMode = await modeNow();
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true })));
  await frames(3);
  const restoredSplit = await beats();
  const restoredMode = await modeNow();
  assert(unified === '{"beat1":["filter","delay"],"beat3":[]}' && unifiedMode.pressed === 'All effects',
    `All effects again gives every effect the steps of the one showing (${unified})`);
  assert(restoredSplit === '{"beat1":["filter","delay"],"beat3":["delay"]}'
    && restoredMode.pressed === 'Each effect' && restoredMode.where === 'Where · Filter',
  `⌘Z brings the effects' own steps back, and the window back on Each effect (${restoredSplit}, ${JSON.stringify(restoredMode)})`);
  // ↓ on the focused slot chooses the next one, and its card comes up.
  await page.evaluate(() => {
    const slot = document.querySelector('#regionedit.barfxmodal .barfxslot.selected');
    slot.focus();
    slot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  });
  const stepped = await popupState();
  assert(stepped.selected === 1 && stepped.cardName === 'Delay' && stepped.cardBypassed
    && Math.abs(Number(stepped.feedback) - 0.71) < 1e-6,
  'the arrow keys choose a slot, and the card that comes up is that effect as written');

  // One drag, one ⌘Z: several frames of one knob coalesce on the card's tag.
  for (const v of [0.5, 0.55, 0.6, 0.65]) { await setFeedback(v); await frames(2); }
  const dragged = await written();
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true })));
  await frames(3);
  const undone = await written();
  const reopened = await popupState();
  assert(Math.abs(Number(dragged.feedback) - 0.65) < 1e-6 && Math.abs(Number(undone.feedback) - 0.71) < 1e-6
    && JSON.stringify(undone.ids) === '["filter","delay"]',
  'a whole knob drag undoes as one ⌘Z step');
  assert(reopened.popup && reopened.cardName === 'Delay' && Math.abs(Number(reopened.feedback) - 0.71) < 1e-6,
    'the open window shows the undone value on the same card, not the one it was undone from');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await ready();
  // Capture the restored controls and press Play in one browser turn. The popup is
  // intentionally dismissed when its tab loses focus; splitting these into separate
  // automation turns can manufacture that blur between the assertion and the click.
  const restored = await page.evaluate(() => {
    const root = document.querySelector('#regionedit.barfxmodal.show');
    const slots = [...(root?.querySelectorAll('.barfxslot') || [])];
    const card = root?.querySelector('.barfxcard .barfxdevice');
    const feedback = [...(card?.querySelectorAll('.row') || [])]
      .find((row) => row.querySelector('.k')?.textContent.trim() === 'FEEDBACK')
      ?.querySelector('input[type="range"]')?.value;
    const state = {
      names: slots.map((slot) => slot.querySelector('.fxname')?.textContent || ''),
      bypassed: slots.map((slot) => !slot.classList.contains('on')),
      cardName: card?.querySelector('h4')?.textContent || '',
      feedback,
      mode: root?.querySelector('.barfxmodeseg .segbtn.on')?.textContent || '',
      foundPlay: !!root?.querySelector('.barfxplay'),
    };
    root?.querySelector('.barfxplay')?.click();
    return { ...state, showing: root?.classList.contains('show'),
      playing: document.querySelector('#play')?.classList.contains('on') || false };
  });
  assert(JSON.stringify(restored.names) === '["Filter","Delay"]' && restored.bypassed[1]
    && restored.cardName === 'Delay' && Math.abs(Number(restored.feedback) - 0.71) < 1e-6
    && restored.mode === 'Each effect',
  'the written chain comes back after a genuine reload, on the card that was showing, painting each effect');
  assert(restored.foundPlay && restored.playing && restored.showing,
    'Play starts the transport and keeps the editor open');

  // Close keeps everything: there is nothing staged to lose.
  await page.evaluate(() => {
    document.querySelector('#stop')?.click();
    [...document.querySelectorAll('#regionedit.barfxmodal button')]
      .find((button) => button.textContent.trim() === 'Close')?.click();
  });
  const closed = await written();
  const gone = await page.evaluate(() => !document.querySelector('#regionedit.barfxmodal.show'));
  assert(gone && JSON.stringify(closed.ids) === '["filter","delay"]',
    'Close closes the editor and keeps what was written');

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
    root.querySelector('.notefxapply')?.click();
    return {
      apply: root.querySelector('.notefxapply')?.textContent || '',
      applyClose: root.querySelector('.regapply')?.textContent || '',
      help: root.querySelector('.notefxhelp')?.textContent || '',
      showing: root.classList.contains('show'),
      playing: document.querySelector('#play')?.classList.contains('on') || false,
    };
  });
  // Two applies, and this is the one that auditions: it saves, plays the bars it was
  // opened on, and stays up so the next tweak is one click away. The primary button
  // beside it is the one that finishes.
  assert(barNote.apply === 'Apply + Play' && barNote.showing && barNote.playing
    && barNote.applyClose === 'Apply & Close'
    && barNote.help.includes('leaving this window open'),
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
    root.querySelector('.notefxapply')?.click();
    return {
      apply: root.querySelector('.notefxapply')?.textContent || '',
      help: root.querySelector('.notefxhelp')?.textContent || '',
      showing: root.classList.contains('show'),
      playing: document.querySelector('#play')?.classList.contains('on') || false,
    };
  });
  assert(trackNote.apply === 'Apply' && trackNote.showing && !trackNote.playing
    && trackNote.help.includes('leaves this window open'),
  'track Note FX applies without starting playback and leaves its editor open');

  // The primary is the one that finishes: it saves and the window goes. Pressed here
  // rather than described, because a staged editor that will not close is the failure
  // this button exists to prevent.
  const applyClosed = await page.evaluate(() => {
    document.querySelector('#regionedit.notefxmodal .regapply')?.click();
    return !document.querySelector('#regionedit.notefxmodal.show');
  });
  assert(applyClosed, 'Apply & Close saves the Note FX and closes the editor');
  assert(errors.length === 0,
    `the live Spot FX workflow raises no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (error) {
  console.error(`FAIL: Spot FX browser test — ${error.message}`);
  failed = true;
} finally {
  await browser.close();
}

console.log(failed ? '\nMIXER EFFECTS UI: FAILED' : '\nMIXER EFFECTS UI: PASSED');
process.exit(failed ? 1 : 0);
