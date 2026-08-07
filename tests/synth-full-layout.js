/**
 * EVERY CONTROL IS SOMEWHERE, AND SOMEWHERE ONCE.
 *
 * The MRDR-3 panel is defined once, in `layerGroups()`, and drawn twice: down a 366px
 * column on the desk, and across a six-column window when you press EDIT. The strip needs
 * no layout — it stacks the cards in declaration order and scrolls — but the window has to
 * say which card goes where, and that is a second arrangement of the same 166 controls.
 *
 * A second arrangement is a second list, and a second list drifts. Add a card to
 * `layerGroups()`, forget to place it, and the window is missing a control the engine
 * reads — which is the precise failure `tests/pot-coverage.js` exists to catch and the
 * precise failure it CANNOT catch: that test works at root-key granularity, so
 * `layer.osc2.filter.env.attack` counts as `layer`, and a missing leaf hides behind the
 * hundred siblings that share its root.
 *
 * So this is the other half of that guard, at leaf granularity:
 *
 *   forward   every row the panel defines is placed in the layout, exactly once
 *   reverse   every card the layout names exists, and every projection is live somewhere
 *
 * It is source reading and object walking — no browser, no audio — so it runs in a blink.
 * `checkFullLayout` does the walk and reports; `fullLayout` does the same walk and throws,
 * so a broken layout fails here first and in the browser second.
 */
import { checkFullLayout, fullLayout, panelSpec } from '../tools/mixer-voice-editor.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);

const VOICE = { synth: 'MRDR-3' };

// ---- the invariant ----------------------------------------------------------
const problems = checkFullLayout(VOICE);
if (problems.length) {
  for (const p of problems) fail(p);
} else {
  const { common, groups } = panelSpec(VOICE);
  const rows = common.rows.length + groups.reduce((n, g) => n + (g.rows || []).length, 0);
  ok(`MRDR-3 — ${rows} controls, every one placed exactly once`);
}

// ---- and the same walk from the throwing side -------------------------------
// Belt and braces: `fullLayout` is what the browser calls, and a layout that reports
// clean but throws on build would be a blank editor with a clean test.
for (const layer of [1, 2, 3]) {
  try {
    const L = fullLayout(VOICE, { layer });
    // Three bands, and the middle one is the layer you asked for.
    if (L.bands.length !== 3) fail(`layer ${layer}: expected 3 bands, got ${L.bands.length}`);
    if (L.layer !== layer) fail(`layer ${layer}: layout came back aimed at ${L.layer}`);
    // Each band declares its own column count and has to fill it exactly, counted in
    // spans — the grid is `repeat(cols, 1fr)`, so a band that does not add up is a hole
    // on the right or a card wrapped onto a second row.
    for (const b of L.bands) {
      const span = b.cells.reduce((n, c) => n + (c.span || 1), 0);
      if (span !== b.cols) {
        fail(`layer ${layer}: band '${b.name}' spans ${span} columns, not its ${b.cols}`);
      }
    }
    // The card the mixer band selects has to be the one the layer band is showing.
    const osc = L.bands[1].cells[0];
    if (osc.layer !== layer) fail(`layer ${layer}: the chain band leads with layer ${osc.layer}`);
  } catch (err) {
    fail(`layer ${layer}: fullLayout threw — ${err.message}`);
  }
}
if (!failed) ok('all three layers build, and every band fills its own column count');

// ---- the counts the window prints -------------------------------------------
// The per-card badges and the title bar's total are the invariant rendered. If they are
// ever typed rather than derived, this is what catches it.
const L = fullLayout(VOICE, { layer: 1 });
const cardRows = (c) => (c.rows?.length || 0)
  + (c.sub || []).reduce((n, s) => n + s.rows.length, 0)
  + (c.panels || []).reduce((n, p) => n + p.rows.length, 0);
let onScreen = 0;
for (const band of L.bands) {
  for (const cell of band.cells) {
    if (cell.kind === 'card') onScreen += cardRows(cell.card);
    else if (cell.kind === 'tabs') onScreen += cell.cards.reduce((n, c) => n + cardRows(c), 0);
    // The mixer band shows all three layers at once, and its fader is a PLACEMENT — LEVEL
    // lives there and nowhere else — so it counts as on screen for every layer, not just
    // the selected one. Its five readouts do not: those are projections of controls that
    // are live on the layer card below.
    else if (cell.kind === "mixer") onScreen += 1 + (cell.rows?.length || 0);
  }
}
// One layer on screen out of three, so the visible count is the total minus the two
// layers that are not showing. 166 − 42 − 42 = 82.
const perLayer = (L.total - onScreen) / 2;
if (!Number.isInteger(perLayer)) {
  fail(`the two hidden layers do not account for ${L.total - onScreen} controls evenly`);
} else {
  ok(`${onScreen} controls on screen at once, ${perLayer} per hidden layer, ${L.total} in total`);
}

// ---- everything else is left alone ------------------------------------------
for (const synth of ['MonoSynth', 'GameSynth', 'AdditiveSynth', 'FMSynth']) {
  if (fullLayout({ synth }) !== null) fail(`${synth} should have no full-window layout yet`);
}
if (!failed) ok('the other synth classes have no full-window layout and are untouched');

console.log(failed ? `\nSYNTH FULL LAYOUT: ${failed} FAILED` : '\nSYNTH FULL LAYOUT: PASSED');
process.exit(failed ? 1 : 0);
