/**
 * EVERY CONTROL IS SOMEWHERE, AND SOMEWHERE ONCE.
 *
 * The MRDR-3 panel is defined once, in `layerGroups()`, and drawn twice: down a 366px
 * column on the desk, and across a six-column window when you press EDIT. The strip needs
 * no layout — it stacks the cards in declaration order and scrolls — but the window has to
 * say which card goes where, and that is a second arrangement of the same 169 controls.
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
import { isDeepStrictEqual } from 'node:util';
import {
  checkFullLayout, fullLayout, panelSpec, quickRows, stripPanelSpec,
  copyLayerData,
} from '../tools/mixer-voice-editor.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);

const VOICE = { synth: 'MRDR-3' };
const DRUM = { kind: 'drum' };

// Layer copying is a whole subtree operation: live values, nested optional sections,
// and the bypassed values that make an Off layer reversible all travel together.
const copyVoice = {
  synth: 'MRDR-3',
  layer: { osc1: { type: 'square', fm: { ratio: 2 }, gain: 0.72 }, osc2: { type: 'sine' } },
  bypassed: {
    'layer.osc1.filter': { type: 'highpass', freq: 880 },
    'layer.osc2.fm': { ratio: 4 },
  },
};
const copyBefore = structuredClone(copyVoice);
copyLayerData(copyVoice, 1, 2);
if (JSON.stringify(copyVoice.layer.osc2) !== JSON.stringify(copyBefore.layer.osc1)
  || JSON.stringify(copyVoice.bypassed['layer.osc2.filter'])
    !== JSON.stringify(copyBefore.bypassed['layer.osc1.filter'])
  || copyVoice.bypassed['layer.osc2.fm'] !== undefined) {
  fail('MRDR layer copy did not duplicate the live subtree and remap bypassed sections');
} else ok('MRDR layer copy duplicates live and bypassed layer state exactly');

// The strip surface must be resolved from the newly selected voice. In particular, a
// GameSynth patch has no Quick macro surface and must not inherit MRDR-3's compact rack
// when the lane changes presets while its editor is open.
const mrdrStrip = stripPanelSpec({ kind: 'tone', synth: 'MRDR-3' });
const gameStrip = stripPanelSpec({ kind: 'tone', synth: 'GameSynth' });
if (mrdrStrip.mode !== 'quick' || mrdrStrip.groups[0]?.title !== 'Quick') {
  fail('MRDR-3 strip did not select the Quick surface');
} else if (gameStrip.mode !== 'detailed'
  || !gameStrip.groups.some((g) => g.title === 'Game Synth')
  || !gameStrip.groups.some((g) => g.title === 'Note')) {
  fail('GameSynth strip did not select its detailed synth controls');
} else {
  ok('switching from MRDR-3 to GameSynth selects the correct strip surface');
}

// DuoSynth is the one pooled class that already has a vibrato LFO inside Tone.DuoSynth.
// Its native amount/rate controls must not sit beside the rack-wide `$vibrato` controls,
// or the editor presents two pitch modulators for one sound.
const duoSpec = panelSpec({ kind: 'tone', synth: 'DuoSynth' });
const duoCommonVibrato = duoSpec.common.rows.filter((r) => r.path?.startsWith('$vibrato'));
const duoGroup = duoSpec.groups.find((g) => g.title === 'Duo');
if (duoCommonVibrato.length || !duoGroup
  || !duoGroup.rows.some((r) => r.path === 'vibratoAmount')
  || !duoGroup.rows.some((r) => r.path === 'vibratoRate')) {
  fail('DuoSynth exposes duplicate generic and native vibrato controls');
} else {
  ok('DuoSynth exposes one authoritative native vibrato pair');
}
const duoRatio = duoGroup?.rows.find((r) => r.path === 'harmonicity');
if (!duoRatio || duoRatio.step !== 0.0001 || duoRatio.fmt(1.003) !== '1.0030' || duoRatio.scale !== 3) {
  fail('DuoSynth ratio does not provide fine near-unison control');
} else {
  ok('DuoSynth ratio reaches 1.003 with a fine nonlinear control');
}

// Each DuoSynth voice is a Tone MonoSynth internally, so each needs its own filter
// rather than inheriting one shared/hidden filter.  Keep this leaf-level check close to
// the vibrato/ratio checks: a title-only assertion would let a card be present but empty.
for (const [title, prefix] of [['Voice 1 Filter', 'voice0.'], ['Voice 2 Filter', 'voice1.']]) {
  const filterGroup = duoSpec.groups.find((g) => g.title === title);
  const paths = new Set((filterGroup?.rows || []).map((r) => r.path));
  const expected = [
    `${prefix}filter.type`,
    `${prefix}filter.rolloff`,
    `${prefix}filterEnvelope.baseFrequency`,
    `${prefix}filter.Q`,
    `${prefix}filterEnvelope.octaves`,
    `${prefix}filterEnvelope.attack`,
    `${prefix}filterEnvelope.decay`,
    `${prefix}filterEnvelope.sustain`,
    `${prefix}filterEnvelope.release`,
  ];
  const missing = expected.filter((path) => !paths.has(path));
  if (!filterGroup || missing.length) {
    fail(`${title} is missing exposed filter controls${missing.length ? `: ${missing.join(', ')}` : ''}`);
  } else {
    ok(`${title} exposes filter, cutoff, resonance and filter-envelope controls`);
  }
}

// ---- the invariant ----------------------------------------------------------
const problems = checkFullLayout(VOICE);
if (problems.length) {
  for (const p of problems) fail(p);
} else {
  const { common, groups } = panelSpec(VOICE);
  const rows = common.rows.length + groups.reduce((n, g) => n + (g.rows || []).length, 0);
  ok(`MRDR-3 — ${rows} controls, every one placed exactly once`);
  const sync = common.rows.find((r) => r.path === '$sync');
  if (!sync || sync.label !== 'OSC SYNC'
    || JSON.stringify(sync.options) !== JSON.stringify(['off', '1+2', '1+3', '1+2+3'])) {
    fail('MRDR-3 Note card does not expose the four oscillator-sync states');
  } else {
    ok('MRDR-3 exposes OFF, 1+2, 1+3 and ALL as one compact Note-card control');
  }
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

// KLNG8 uses the same window renderer but has no layer/mixer band. Its source cards
// still have to satisfy the same exactly-once invariant, including the new Master Tune
// row and Ring/Metal Attack rows.
const drumProblems = checkFullLayout(DRUM);
if (drumProblems.length) {
  for (const p of drumProblems) fail(`KLNG8: ${p}`);
} else {
  const { common, groups } = panelSpec(DRUM);
  const rows = common.rows.length + groups.reduce((n, g) => n + (g.rows || []).length, 0);
  ok(`KLNG8 — ${rows} controls, every one placed exactly once`);
}
try {
  const Ld = fullLayout(DRUM);
  for (const b of Ld.bands) {
    const span = b.cells.reduce((n, c) => n + (c.span || 1), 0);
    if (span !== b.cols) fail(`KLNG8: band '${b.name}' spans ${span}, not ${b.cols}`);
  }
  if (Ld.total !== panelSpec(DRUM).common.rows.length
    + panelSpec(DRUM).groups.reduce((n, g) => n + (g.rows || []).length, 0)) {
    fail(`KLNG8: layout total ${Ld.total} does not match panel rows`);
  }
  // One band of six single-column cards: the drum window is read ACROSS the signal path,
  // and each card is narrow enough that its own rows read DOWN it. A card that grew back
  // to two columns would be one that had quietly gone wide again.
  if (Ld.bands.length !== 1) fail(`KLNG8: expected 1 band, got ${Ld.bands.length}`);
  const cells = Ld.bands[0]?.cells || [];
  if (cells.length !== 6) fail(`KLNG8: expected 6 cards, got ${cells.length}`);
  if (cells.some((c) => (c.span || 1) !== 1)) fail('KLNG8: a card is wider than one column');
  // What Master absorbed: Drive and Humanise as rules under its own rows, Taps as a door
  // in its header. Those three are what freed the columns the six signal sections need.
  const cellFor = (key) => cells.find((c) => c.card?.key === key);
  const subsOf = (key) => (cellFor(key)?.card?.sub || []).map((s) => s.rule);
  if (!isDeepStrictEqual(subsOf('note'), ['DRIVE', 'HUMANISE'])) {
    fail(`KLNG8: Master carries ${JSON.stringify(subsOf('note'))}, not Drive and Humanise`);
  }
  const doors = (cellFor('note')?.card?.panels || []);
  if (!doors.some((p) => p.taps)) fail('KLNG8: Taps is not a door on the Master card');
  // A sub-section's and a door's rows are still that section's own — taken from the card
  // they came from, not copied — so the exactly-once walk above proves nothing was lost.
  if ((cellFor('note')?.card?.sub || []).some((s) => !s.rows?.length)) {
    fail('KLNG8: a Master sub-section came through with no rows');
  }
  // The curve door, on every card that has a curve to put behind it. Left in the grid,
  // CURVE and RATE CURVE cost a full-width row each on the three longest cards.
  const withCurves = cells.filter((c) => c.curves).map((c) => c.card?.key);
  if (!isDeepStrictEqual(withCurves, ['osc', 'noise', 'ring'])) {
    fail(`KLNG8: the curve door is on ${JSON.stringify(withCurves)}, not osc/noise/ring`);
  }
  for (const key of withCurves) {
    if (!(cellFor(key)?.card?.rows || []).some((r) => r.door === 'curve')) {
      fail(`KLNG8: the ${key} card asks for a curve door with no curve row to put in it`);
    }
  }
} catch (err) {
  fail(`KLNG8: fullLayout threw — ${err.message}`);
}
if (!failed) ok('KLNG8 builds one complete band of six narrow cards');

// Quick is data too: its collective rows must preserve envelope ratios and its Taps row
// must never flatten authored tap spacing just to change the count.
const byLabel = (rows, label) => rows.find((r) => r.label === label);
const mrdrQuick = {
  synth: 'MRDR-3', layer: {
    osc1: { vca: 'env', attack: 0.01, decay: 0.2, release: 0.03 },
    osc2: { vca: 'env', attack: 0.02, decay: 0.4, release: 0.06 },
    osc3: { vca: 'through', attack: 0.8, decay: 0.9, release: 0.8 },
  }, global: { vca: { attack: 0.04, decay: 0.8, release: 0.12 } },
};
const mrdrAttack = byLabel(quickRows(mrdrQuick), 'ATTACK');
const mrdrBefore = mrdrAttack.read(undefined, mrdrQuick);
const mrdrAuthored = structuredClone(mrdrQuick);
mrdrAttack.write(0.08, mrdrQuick);
if (mrdrBefore !== 0.04 || mrdrQuick.layer.osc1.attack !== 0.02
  || mrdrQuick.layer.osc2.attack !== 0.04 || mrdrQuick.global.vca.attack !== 0.08
  || mrdrQuick.layer.osc3.attack !== 0.8) {
  fail('MRDR Quick VCA aggregation does not preserve ratios or exclude THROUGH');
} else ok('MRDR Quick VCA aggregation preserves ratios and excludes THROUGH');
mrdrAttack.write(mrdrBefore, mrdrQuick);
if (!isDeepStrictEqual(mrdrQuick, mrdrAuthored)) {
  fail('MRDR Quick VCA aggregation did not restore the authored envelope on a round trip');
} else ok('MRDR Quick VCA aggregation restores the authored envelope on a round trip');

const sameAtZ = (authored, label, y, z) => {
  const direct = structuredClone(authored);
  const via = structuredClone(authored);
  byLabel(quickRows(direct), label).write(z, direct);
  const viaRow = byLabel(quickRows(via), label);
  viaRow.write(y, via);
  viaRow.write(z, via);
  return isDeepStrictEqual(direct, via);
};

for (const label of ['ATTACK', 'DECAY', 'RELEASE']) {
  if (!sameAtZ(mrdrAuthored, label, 0.091, 0.067)) {
    fail(`MRDR Quick ${label} changes sound at z depending on the route to z`);
  }
}
if (!failed) ok('MRDR Quick envelope positions are independent of the route taken');

const drumQuick = {
  kind: 'drum', noise: { attack: 0.002, decay: 0.1 },
  taps: [0, 0.011, 0.029], tapDecays: [0.2, 0.4, 0.6],
};
const drumRows = quickRows(drumQuick);
const drumDecay = byLabel(drumRows, 'DECAY');
if (drumDecay.read(undefined, drumQuick) !== 0.6) fail('Drum Quick did not include tapDecays');
const beforeDecay = structuredClone(drumQuick);
drumDecay.write(1.2, drumQuick);
if (!isDeepStrictEqual(drumQuick.tapDecays, [0.4, 0.8, 1.2])) {
  fail('Drum Quick Decay did not scale authored per-hit decays');
}
drumDecay.write(0.6, drumQuick);
if (!isDeepStrictEqual(drumQuick, beforeDecay)) {
  fail('Drum Quick Decay did not restore the authored envelope on a round trip');
} else ok('Drum Quick Decay restores the authored envelope on a round trip');
for (const label of ['ATTACK', 'DECAY']) {
  if (!sameAtZ(beforeDecay, label, 0.83, 0.47)) {
    fail(`Drum Quick ${label} changes sound at z depending on the route to z`);
  }
}
if (!failed) ok('Drum Quick envelope positions are independent of the route taken');
const tapCount = byLabel(drumRows, 'TAPS');
const beforeTaps = structuredClone(drumQuick);
tapCount.write(2, drumQuick);
tapCount.write(3, drumQuick);
if (!isDeepStrictEqual(drumQuick, beforeTaps)) {
  fail('Drum Quick Taps did not restore authored spacing and falloff on a round trip');
} else ok('Drum Quick Taps restores authored tap data exactly on a round trip');
const fourTapDrum = {
  kind: 'drum', noise: { decay: 0.1 }, taps: [0, 0.011, 0.029, 0.052], tapFalloff: 0.61,
};
if (!sameAtZ(fourTapDrum, 'TAPS', 2, 3)) {
  fail('Drum Quick Taps changes sound at z depending on the route to z');
} else ok('Drum Quick Taps positions are independent of the route taken');

// Advanced Global Filter cutoff may lift, but never lowers, the independent final driven
// low-pass ceiling. Quick CUTOFF is a collective view of the active filter frequencies,
// rather than a second alias of the Drive card's specific TONE parameter.
const mrdrFilterVoice = {
  synth: 'MRDR-3', drive: 0.5, tone: { freq: 700 },
  global: { filter: { freq: 1150 } },
};
const mrdrGlobalCutoff = panelSpec(VOICE).groups
  .find((g) => g.key === 'global.filter').rows.find((r) => r.path === '$global.filter.freq');
mrdrGlobalCutoff.after(2400, mrdrFilterVoice, 1150);
mrdrGlobalCutoff.after(900, mrdrFilterVoice, 2400);
if (mrdrFilterVoice.tone.freq !== 2400) {
  fail('MRDR Advanced Global Filter changed the independent Drive Tone on a downward move');
} else ok('MRDR Advanced Global Filter only lifts the independent Drive Tone ceiling');

const mrdrQuickCutoffVoice = {
  synth: 'MRDR-3', drive: 0.5,
  layer: {
    osc1: { gain: 1, filter: { type: 'lowpass', freq: 600, Q: 1.2 } },
    osc2: { gain: 1, filter: { type: 'lowpass', freq: 1200, Q: 2.4 } },
  },
  global: { filter: { freq: 3000, Q: 4 } },
  tone: { type: 'lowpass', freq: 900, Q: 4 },
};
const mrdrQuickCutoff = byLabel(quickRows(mrdrQuickCutoffVoice), 'CUTOFF');
if (!mrdrQuickCutoff || byLabel(quickRows(mrdrQuickCutoffVoice), 'TONE')) {
  fail('MRDR Quick still exposes TONE instead of CUTOFF');
} else if (mrdrQuickCutoff.read(undefined, mrdrQuickCutoffVoice) !== 600) {
  fail('MRDR Quick CUTOFF did not read the darkest active filter cutoff');
}
const beforeQuickCutoff = structuredClone(mrdrQuickCutoffVoice);
mrdrQuickCutoff.write(1200, mrdrQuickCutoffVoice);
if (mrdrQuickCutoffVoice.layer.osc1.filter.freq !== 1200
  || mrdrQuickCutoffVoice.layer.osc2.filter.freq !== 2400
  || mrdrQuickCutoffVoice.global.filter.freq !== 6000
  || mrdrQuickCutoffVoice.tone.freq !== 1800
  || mrdrQuickCutoffVoice.layer.osc1.filter.Q !== 1.2
  || mrdrQuickCutoffVoice.tone.Q !== 4) {
  fail('MRDR Quick CUTOFF did not scale all active filter cutoffs together');
}
mrdrQuickCutoff.write(600, mrdrQuickCutoffVoice);
if (!isDeepStrictEqual(mrdrQuickCutoffVoice, beforeQuickCutoff)) {
  fail('MRDR Quick CUTOFF did not restore the authored filter relationship');
} else ok('MRDR Quick CUTOFF scales and restores all MRDR filter cutoffs');
if (!sameAtZ(beforeQuickCutoff, 'CUTOFF', 900, 750)) {
  fail('MRDR Quick CUTOFF changes sound at z depending on the route to z');
} else ok('MRDR Quick CUTOFF positions are independent of the route taken');

// An Advanced cutoff edit is a new authored baseline for the collective macro. The Quick
// reading must follow it, and a later round trip must not restore the stale pre-edit shape.
mrdrQuickCutoffVoice.layer.osc1.filter.freq = 450;
if (mrdrQuickCutoff.read(undefined, mrdrQuickCutoffVoice) !== 450) {
  fail('MRDR Advanced cutoff did not update the Quick CUTOFF reading');
}
const afterMrdrAdvancedCutoff = structuredClone(mrdrQuickCutoffVoice);
mrdrQuickCutoff.write(900, mrdrQuickCutoffVoice);
mrdrQuickCutoff.write(450, mrdrQuickCutoffVoice);
if (!isDeepStrictEqual(mrdrQuickCutoffVoice, afterMrdrAdvancedCutoff)) {
  fail('MRDR Quick CUTOFF overwrote an Advanced filter edit with a stale baseline');
} else ok('MRDR Advanced filter edits stay synchronized with Quick CUTOFF');

const mrdrEnvAmountVoice = {
  synth: 'MRDR-3', drive: 0.5, tone: { freq: 700 },
  global: { filter: { freq: 1150, env: { octaves: 0 } } },
};
const mrdrEnvAmount = byLabel(quickRows(mrdrEnvAmountVoice), 'ENV AMOUNT');
const beforeEnvAmount = structuredClone(mrdrEnvAmountVoice);
mrdrEnvAmount.write(1, mrdrEnvAmountVoice);
mrdrEnvAmount.write(0, mrdrEnvAmountVoice);
const mrdrResVoice = { synth: 'MRDR-3', drive: 0.5, tone: { freq: 700 } };
const mrdrResonance = byLabel(quickRows(mrdrResVoice), 'RESONANCE');
const beforeResonance = structuredClone(mrdrResVoice);
mrdrResonance.write(8, mrdrResVoice);
mrdrResonance.write(0.7, mrdrResVoice);
if (!isDeepStrictEqual(mrdrEnvAmountVoice, beforeEnvAmount)
  || !isDeepStrictEqual(mrdrResVoice, beforeResonance)) {
  fail('MRDR Quick Env Amount/Resonance left a filter or changed Tone after returning home');
} else ok('MRDR Quick Env Amount/Resonance round trips restore the exact authored sound');
if (!sameAtZ(beforeEnvAmount, 'ENV AMOUNT', 2, 1)
  || !sameAtZ(beforeResonance, 'RESONANCE', 12, 8)) {
  fail('MRDR Quick Env Amount/Resonance changes sound at z depending on the route to z');
} else ok('MRDR Quick Env Amount/Resonance positions are independent of the route taken');

// ...and with no drive there is no tone filter in the signal path, so nothing may touch
// the stored cutoff — the panel must not rewrite the parameter it has greyed out.
const mrdrDrylessVoice = {
  synth: 'MRDR-3', tone: { freq: 700 },
  global: { filter: { freq: 1150 } },
};
mrdrGlobalCutoff.after(9000, mrdrDrylessVoice, 1150);
if (mrdrDrylessVoice.tone.freq !== 700) {
  fail('MRDR Advanced filter rewrote Tone on a voice with no drive');
} else ok('MRDR Tone is left alone when DRIVE is zero and the filter is not built');

const drumFilterVoice = {
  kind: 'drum', drive: 0.5, tone: { type: 'lowpass', freq: 700 },
  noise: { freq: 2600, Q: 0.7 }, ring: { freq: 400, Q: 40 },
  metal: { hp: 3000, Q: 0.7 },
};
const drumResVoice = {
  kind: 'drum', drive: 0.5, tone: { type: 'lowpass', freq: 700 },
  metal: { hp: 3000, Q: 0.7 },
};
const drumNoiseCutoff = panelSpec(DRUM).groups
  .find((g) => g.key === 'noise').rows.find((r) => r.path === '$noise.freq');
const drumMetalQ = panelSpec(DRUM).groups
  .find((g) => g.key === 'metal').rows.find((r) => r.path === '$metal.Q');
drumNoiseCutoff.after(4200, drumFilterVoice, 2600);
drumMetalQ.after(8, drumResVoice, 0.7);
if (drumFilterVoice.tone.freq !== 4200 || drumResVoice.tone.freq !== 3000) {
  fail('Drum source filters did not synchronize the Advanced Drive Tone ceiling');
} else ok('Drum source filters remain audible below the Advanced Drive Tone');

const drumQuickCutoffVoice = {
  kind: 'drum', drive: 0.5,
  noise: { type: 'lowpass', freq: 800, to: 400, Q: 2 },
  ring: { type: 'bandpass', freq: 400, to: 300, Q: 40 },
  metal: { freq: 700, hp: 2400, hpTo: 1200, Q: 0.8 },
  tone: { type: 'lowpass', freq: 6000, Q: 3 },
};
const drumQuickCutoff = byLabel(quickRows(drumQuickCutoffVoice), 'CUTOFF');
if (!drumQuickCutoff || byLabel(quickRows(drumQuickCutoffVoice), 'TONE')) {
  fail('Drum Quick still exposes TONE instead of CUTOFF');
} else if (drumQuickCutoff.read(undefined, drumQuickCutoffVoice) !== 800) {
  fail('Drum Quick CUTOFF did not read the darkest active filter cutoff');
}
const beforeDrumQuickCutoff = structuredClone(drumQuickCutoffVoice);
drumQuickCutoff.write(1600, drumQuickCutoffVoice);
if (drumQuickCutoffVoice.noise.freq !== 1600
  || drumQuickCutoffVoice.noise.to !== 800
  || drumQuickCutoffVoice.metal.hp !== 4800
  || drumQuickCutoffVoice.metal.hpTo !== 2400
  || drumQuickCutoffVoice.tone.freq !== 12000
  || drumQuickCutoffVoice.ring.freq !== 400
  || drumQuickCutoffVoice.metal.freq !== 700) {
  fail('Drum Quick CUTOFF did not scale filter cutoffs while preserving pitch');
}
drumQuickCutoff.write(800, drumQuickCutoffVoice);
if (!isDeepStrictEqual(drumQuickCutoffVoice, beforeDrumQuickCutoff)) {
  fail('Drum Quick CUTOFF did not restore authored filter and sweep values');
} else ok('Drum Quick CUTOFF scales filters, sweep destinations, and restores pitch');
drumQuickCutoffVoice.noise.freq = 500;
if (drumQuickCutoff.read(undefined, drumQuickCutoffVoice) !== 500) {
  fail('Drum Advanced cutoff did not update the Quick CUTOFF reading');
} else ok('Drum Advanced filter edits stay synchronized with Quick CUTOFF');

// ---- Quick and Advanced are one control, so they must turn the same way -------
//
// A Quick pot that aliases an Advanced parameter is not a second control over the same
// key — it is the same control on a smaller panel, so it has to carry that parameter's
// RANGE and its TAPER. Most inherit both from the helper the two panels share
// (`envTime`, `cutoffHz`, `resQ`); the ones written out longhand can drift silently,
// which is exactly how Quick's VIBRATO came to be linear over a range Advanced cubes.
// Linear, a 0–12 semitone pot puts every depth in the library (0.05–0.35) inside the
// first three percent of the travel — a value you cannot aim at, on the panel meant for
// aiming quickly.
const advancedRows = (voice) => {
  const spec = panelSpec(voice);
  return [...spec.common.rows, ...spec.groups.flatMap((g) => g.rows || [])];
};
// A row's taper may be a function of the voice — see the Mod LFO's rate — so resolve it
// the way the editor does before comparing. Absent means linear.
const taperOf = (row, voice) =>
  (typeof row.scale === 'function' ? row.scale(voice) : row.scale) ?? 1;
const aliasVoices = [
  { synth: 'MRDR-3', drive: 0.5, vibrato: { depth: 0.1 }, layer: { osc1: { gain: 1 } } },
  { kind: 'drum', drive: 0.5, osc: { from: 190, to: 52 }, noise: { decay: 0.1 } },
];
let checkedAliases = 0;
let taperDrift = 0;
for (const voice of aliasVoices) {
  const advanced = advancedRows(voice);
  for (const row of quickRows(voice)) {
    // A `$quick.*` path is a macro over several Advanced keys and has no single twin.
    if (row.path.startsWith('$quick.')) continue;
    const twin = advanced.find((r) => r.path === row.path);
    if (!twin) continue;                     // Quick-only, or absent on this voice
    checkedAliases++;
    const where = `${row.label} / ${twin.label} (${row.path})`;
    if (row.min !== twin.min || row.max !== twin.max || row.step !== twin.step) {
      taperDrift++;
      fail(`Quick and Advanced disagree on the range of ${where}`);
    }
    if (taperOf(row, voice) !== taperOf(twin, voice)) {
      taperDrift++;
      fail(`Quick and Advanced disagree on the taper of ${where}: `
        + `${taperOf(row, voice)} vs ${taperOf(twin, voice)}`);
    }
  }
}
if (!checkedAliases) fail('no Quick pot aliases an Advanced parameter — the check found nothing');
else if (!taperDrift) {
  ok(`${checkedAliases} Quick aliases carry their Advanced range and taper exactly`);
}

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
// layers that are not showing. 169 − 33 − 33 = 103.
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
