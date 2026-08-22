/**
 * A DROPDOWN REDRAWS ITSELF.
 *
 * The panel's pills do — `buildSeg` moves its own `on` class the moment one is clicked —
 * and the long-list control that stands in for them where sixteen options will not fit
 * (`dropRow`, today WAVE TABLE on both TNGR-2 oscillators) did not: it captured the
 * current value when the row was built and waited for a repaint that neither surface
 * asks for. The strip passes no `onChange` at all; the full window passes `redrawGraphs`,
 * which only re-reads the graphs.
 *
 * What that looked like from the front: pick a family, the sound changes on the next note
 * and the menu goes on naming the family you started with — and then the click that would
 * put it BACK does nothing, because the stale value is what the "already on this one"
 * guard compares against. A control that lies about its value and then refuses to move.
 *
 * So this suite clicks the real menu in a real document, and asserts the three things a
 * pick has to change together: what is stored, what the closed row says, and which option
 * is marked. Chromium rather than a DOM shim, for the reason tests/voice-edit.js is:
 * `details`/`summary`, `classList` and click dispatch are the things being asserted about.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The editor is a panel, and the window is a second panel over the same preset — so the
// harness has to hand the first the factory for the second, exactly as the desk does.
const ENTRY = `
import { createVoiceEditor } from ${JSON.stringify(join(ROOT, 'tools/mixer-voice-editor.js'))};
import { createSynthFull } from ${JSON.stringify(join(ROOT, 'tools/mixer-synth-full.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
window.__VOICES = VOICES;
window.__mount = (id) => {
  const el = document.createElement('div');
  document.body.append(el);
  // A pot is not what is being tested and a real one needs a layout, so the knob factory
  // is a stub with the two members the rows touch: a wrapper and a label.
  const knob = () => {
    const wrap = document.createElement('div');
    const label = document.createElement('span');
    wrap.append(label);
    return { wrap, label, set: () => {} };
  };
  let full = null;
  const ed = createVoiceEditor({
    el, knob,
    toast: () => {}, refresh: () => {}, noiseBuf: null, sampleRate: 44100,
    onChanged: () => {}, assign: () => {}, close: () => {},
    canFile: () => false, isDevUser: () => true, liveCompensation: false,
    createFull: ({ kit }) => {
      const host = document.createElement('div');
      const backdrop = document.createElement('div');
      document.body.append(host, backdrop);
      full = host;
      return createSynthFull({ kit, el: host, backdrop });
    },
  });
  // A library preset opens read-only on the strip unless the caller says otherwise, and
  // the pick is the same pick either way.
  ed.open(id, { allowLibraryUpdate: true, laneKey: 'lane1', laneLabel: 'Lane 1' });
  ed.openFull();
  return { full, ed };
};
`;

const results = [];
const assert = (cond, msg) => results.push({ ok: !!cond, msg });

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: built.outputFiles[0].text });

  const out = await page.evaluate(() => {
    const id = Object.keys(window.__VOICES).find((k) => window.__VOICES[k].synth === 'TNGR-2');
    const { full, ed } = window.__mount(id);
    const rows = [...full.querySelectorAll('.vedroprow')];
    const row = rows.find((r) => r.querySelector('.k')?.textContent === 'WAVE TABLE');
    if (!row) return { rows: rows.map((r) => r.querySelector('.k')?.textContent) };
    const summary = row.querySelector('summary');
    const options = [...row.querySelectorAll('.vedropoption')];
    const marked = () => row.querySelector('.vedropoption.on')?.textContent;
    const state = () => ({
      stored: ed.voice.tngr2.oscA.table, says: summary.textContent, marked: marked(),
    });
    const opened = state();
    const other = options.find((o) => !o.classList.contains('on'));
    other.click();
    const picked = { ...state(), wanted: other.textContent };
    // The click the stale guard used to swallow: back to the family it opened on.
    options.find((o) => o.textContent === opened.says).click();

    // AND THE OPEN LIST STAYS INSIDE THE BOX THAT CLIPS IT. `.sfbody` is the window's one
    // scroll container, so a menu measured by a viewport fraction runs past its padding
    // box and the last families are drawn over the keyboard — there, live, unreachable.
    // The harness has no stylesheet, so the clipping ancestor is made here: a short body
    // that scrolls, which is exactly what a real window on a laptop screen is.
    const body = full.querySelector('.sfbody');
    body.style.height = '260px';
    body.style.overflowY = 'auto';
    const details = row.querySelector('details');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    const menuBox = row.querySelector('.vedropmenu').getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    const fit = { overhang: Math.round(menuBox.bottom - bodyBox.bottom) };
    details.open = false;
    return { id, options: options.length, opened, picked, back: state(), fit };
  });

  assert(!out.rows, `the Advanced window draws a WAVE TABLE menu${out.rows ? ` (found: ${out.rows.join(', ')})` : ''}`);
  if (!out.rows) {
    assert(out.options === 16, 'all sixteen families are in it');
    assert(out.opened.says === out.opened.marked,
      'it opens naming the family the preset is on, with that option marked');
    assert(out.picked.stored !== out.opened.stored, 'picking another family stores it');
    assert(out.picked.says === out.picked.wanted,
      '...and the closed row says the family that was picked, not the one it opened on');
    assert(out.picked.marked === out.picked.wanted, '...and the mark moves with it');
    assert(out.back.stored === out.opened.stored,
      'picking the original back takes — the guard compares against the LIVE value');
    assert(out.back.says === out.opened.says && out.back.marked === out.opened.marked,
      '...and the row is left exactly as it opened');
    assert(out.fit.overhang <= 0,
      `the open list stays inside the box that clips it (overhang ${out.fit.overhang}px)`);
  }

  await browser.close();
  if (errors.length) assert(false, `page errors: ${errors.join('; ')}`);

  let failed = 0;
  for (const r of results) {
    if (r.ok) console.log(`ok: ${r.msg}`);
    else { console.error(`FAIL: ${r.msg}`); failed++; }
  }
  console.log(failed ? `\n${failed} FAILED` : '\nSYNTH DROPDOWN: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(`FAIL: ${e.message}`); process.exit(1); });
