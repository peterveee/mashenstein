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
  copyLayerData, setCrls1Filter, setRmnd2Mode,
} from '../tools/mixer-voice-editor.js';
import { VOICES } from '../src/data/voices.js';
import { VoiceRack } from '../src/engine/voices.js';
import { WAVE_GLYPHS } from '../tools/lib/wave-glyphs.js';
import { synthDisplayName } from '../tools/lib/synth-display.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);

for (const [stored, branded] of [['Synth', 'CRLS-1'], ['MonoSynth', 'CRLS-1'], ['drum', 'KLNG-8']]) {
  if (synthDisplayName(stored) !== branded) fail(`${stored} is branded ${synthDisplayName(stored)}, not ${branded}`);
}
if (!failed) ok('legacy CRLS-1 aliases and the drum kind use their public UI brands');

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

// Every supported family resolves its own Simple surface from the current voice. CRLS-1
// is adaptive because the Synth/MonoSynth merge deliberately retains filterless presets.
const SIMPLE_LABELS = {
  'MRDR-3': ['LEVEL', 'TRANSPOSE', 'ATTACK', 'DECAY', 'RELEASE', 'CUTOFF', 'RESONANCE',
    'ENV AMOUNT', 'VIBRATO'],
  'TNGR-2': ['LEVEL', 'TRANSPOSE', 'POSITION', 'MOTION', 'CUTOFF', 'ATTACK', 'RELEASE', 'VIBRATO'],
  'KNDO-5': ['WAVE', 'LEVEL', 'TRANSPOSE', 'ATTACK', 'RELEASE', 'VIBRATO', 'CUTOFF'],
  'WNDR-9': ['LEVEL', 'TRANSPOSE', 'ATTACK', 'RELEASE', 'VIBRATO', 'BRIGHTNESS', 'PERCUSSION'],
  'CRLS-1': ['WAVE', 'LEVEL', 'TRANSPOSE', 'ATTACK', 'RELEASE', 'VIBRATO'],
  // The bare fixture carries no `modulationIndex`, which IS how a preset says amplitude
  // modulation — so this is RMND-2's AM surface. The FM one is asserted just below.
  'RMND-2': ['CARRIER', 'LEVEL', 'TRANSPOSE', 'ATTACK', 'RELEASE', 'VIBRATO', 'RATIO'],
};
for (const [synth, labels] of Object.entries(SIMPLE_LABELS)) {
  const surface = stripPanelSpec({ kind: 'tone', synth });
  const actual = surface.groups[0]?.rows.map((row) => row.label);
  if (surface.mode !== 'quick' || surface.groups[0]?.title !== 'Simple'
    || !isDeepStrictEqual(actual, labels)) {
    fail(`${synth} Simple surface is ${JSON.stringify(actual)}, not ${JSON.stringify(labels)}`);
  } else if (actual.includes('FINE')) {
    fail(`${synth} Simple surface exposes FINE`);
  } else if (['KNDO-5', 'CRLS-1', 'RMND-2'].includes(synth)) {
    const graphical = surface.groups[0]?.rows.find((row) => row.graphical === 'wave');
    const expectedLabel = synth === 'RMND-2' ? 'CARRIER' : 'WAVE';
    if (actual[0] !== expectedLabel || !graphical
      || !graphical.options.every((option) => WAVE_GLYPHS[option])) {
      fail(`${synth} Simple waveform selector is not first and graphical`);
    } else ok(`${synth} Simple starts with the shared graphical waveform selector`);
  }
}
if (!failed) ok('supported synths expose the exact Simple controls, with Fine reserved for Advanced');

const crls1Filtered = {
  kind: 'tone',
  synth: 'CRLS-1',
  options: {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.4, sustain: 0.8, release: 0.2 },
    filter: { type: 'lowpass', Q: 1, rolloff: -24 },
    filterEnvelope: {
      attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.2, baseFrequency: 220,
    },
  },
};
const crls1FilteredSimple = stripPanelSpec(crls1Filtered).groups[0]?.rows.map((row) => row.label);
const crls1FilteredRows = stripPanelSpec(crls1Filtered).groups[0]?.rows || [];
const crls1Vibrato = crls1FilteredRows.find((row) => row.label === 'VIBRATO');
if (!isDeepStrictEqual(crls1FilteredSimple, [
  'WAVE', 'LEVEL', 'TRANSPOSE', 'ATTACK', 'RELEASE', 'VIBRATO', 'CUTOFF', 'RESONANCE',
]) || crls1FilteredRows.find((row) => row.label === 'ATTACK')?.startRow
  || crls1Vibrato?.startRow || crls1Vibrato?.path !== '$vibrato.depth'
  || crls1Vibrato?.max !== 1 || crls1Vibrato?.scale !== 3
  || crls1FilteredRows.some((row) => row.label === 'UNISON')) {
  fail(`CRLS-1 filtered Simple surface is ${JSON.stringify(crls1FilteredSimple)}`);
} else if (!crls1FilteredSimple.includes('CUTOFF') || !crls1FilteredSimple.includes('RESONANCE')) {
  fail('CRLS-1 filtered Simple surface omitted its filter controls');
} else ok('CRLS-1 adds musical CUTOFF and RESONANCE only when the preset has a filter');

const crls1FilterGroup = panelSpec({ synth: 'CRLS-1' }).groups.find((group) => group.key === 'filter');
if (crls1FilterGroup?.optional !== 'options.filter'
  || !crls1FilterGroup?.onTip?.includes('CRLS-1')
  || !crls1FilterGroup?.offTip?.includes('CRLS-1')
  || /Mono ?Synth|plain Synth/.test(`${crls1FilterGroup?.onTip} ${crls1FilterGroup?.offTip}`)) {
  fail('CRLS-1 Filter card does not expose the Synth/Mono Synth engine toggle');
} else ok('CRLS-1 Filter card exposes the engine-class toggle');
const crls1FilterEnvGroup = panelSpec({ synth: 'CRLS-1' }).groups
  .find((group) => group.key === 'filterEnvelope');
if (crls1FilterEnvGroup?.when || typeof crls1FilterEnvGroup?.bodyWhen !== 'function') {
  fail('CRLS-1 Filter Env is hidden rather than disabled when Filter is Off');
} else ok('CRLS-1 Filter Env stays visible and disables with the Filter switch');

const crls1ToggleVoice = {
  kind: 'tone', synth: 'CRLS-1', options: {
    oscillator: { type: 'square' },
    envelope: { attack: 0.02, decay: 0.4, sustain: 0.7, release: 0.2 },
    filter: { type: 'highpass', rolloff: -24, Q: 3.2 },
    filterEnvelope: {
      attack: 0.03, decay: 0.8, sustain: 0.35, release: 0.6,
      baseFrequency: 720, octaves: 2.4,
    },
  },
};
const authoredFilter = structuredClone(crls1ToggleVoice.options);
setCrls1Filter(crls1ToggleVoice, false);
const heldFilter = crls1ToggleVoice.bypassed?.['options.filter'];
if (crls1ToggleVoice.options.filter !== undefined
  || crls1ToggleVoice.options.filterEnvelope !== undefined
  || !heldFilter?.filter || !heldFilter?.filterEnvelope) {
  fail('CRLS-1 Filter Off did not remove both MonoSynth option sections and hold them');
} else if (fullLayout(crls1ToggleVoice).bands[0].cols !== 5) {
  fail('CRLS-1 Filter Off changed the five-card Advanced board width');
} else {
  setCrls1Filter(crls1ToggleVoice, true);
  if (!isDeepStrictEqual(crls1ToggleVoice.options, authoredFilter)
    || fullLayout(crls1ToggleVoice).bands[0].cols !== 5) {
    fail('CRLS-1 Filter On did not restore the authored filter and MonoSynth layout');
  } else ok('CRLS-1 Filter Off/On switches engines and restores the authored filter');
}

// ---- RMND-2: one synth, two destinations ------------------------------------
//
// The merge's whole claim is that a player sees ONE instrument. So the two things that
// could give it away are asserted here: Simple grows exactly one row in FM and nothing
// else moves, and the MODE switch is lossless in both directions.

const rmnd2Fm = {
  kind: 'tone',
  synth: 'RMND-2',
  options: {
    harmonicity: 3, modulationIndex: 8,
    oscillator: { type: 'sine' }, modulation: { type: 'sine' },
    envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
    modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
  },
};
const rmnd2FmSimple = stripPanelSpec(rmnd2Fm).groups[0]?.rows.map((row) => row.label);
const rmnd2FmRows = stripPanelSpec(rmnd2Fm).groups[0]?.rows || [];
if (!isDeepStrictEqual(rmnd2FmSimple, [
  'CARRIER', 'LEVEL', 'TRANSPOSE', 'ATTACK', 'RELEASE', 'VIBRATO', 'RATIO', 'FM DEPTH',
]) || !isDeepStrictEqual(rmnd2FmSimple.slice(0, 7), SIMPLE_LABELS['RMND-2'])
  || rmnd2FmRows.find((row) => row.label === 'ATTACK')?.startRow) {
  fail(`RMND-2 FM Simple surface is ${JSON.stringify(rmnd2FmSimple)}`);
} else ok('RMND-2 Simple adds FM DEPTH for a frequency-modulated preset and nothing else');

// FM DEPTH is GREYED in Advanced rather than dropped, so the board never changes width —
// the opposite policy to Simple, and deliberate: Advanced is where the switch lives, so
// it is where a disabled control still has something to explain it.
const rmnd2DepthRow = panelSpec(rmnd2Fm).groups
  .find((group) => group.key === 'mod')?.rows.find((row) => row.label === 'FM DEPTH');
const rmnd2ModeRowSpec = panelSpec(rmnd2Fm).groups
  .find((group) => group.key === 'mod')?.rows.find((row) => row.label === 'MODE');
if (typeof rmnd2DepthRow?.when !== 'function'
  || rmnd2DepthRow.when(rmnd2Fm) !== true
  || rmnd2DepthRow.when({ kind: 'tone', synth: 'RMND-2', options: {} }) !== false) {
  fail('RMND-2 FM DEPTH is not guarded by the modulation destination');
} else if (!rmnd2ModeRowSpec?.derived || rmnd2ModeRowSpec.path !== 'modulationIndex'
  || !rmnd2ModeRowSpec.section) {
  fail('RMND-2 MODE does not own the modulationIndex key as a derived, class-changing row');
} else if (fullLayout(rmnd2Fm).bands[0].cols
  !== fullLayout({ kind: 'tone', synth: 'RMND-2', options: {} }).bands[0].cols) {
  fail('RMND-2 MODE changes the Advanced board width');
} else ok('RMND-2 FM DEPTH greys with MODE and the Advanced board keeps its width');

// Lossless both ways: AM has nowhere to keep a depth, so the switch has to, and a preset
// that has never been FM must still open somewhere Tone would have put it.
const rmnd2Toggle = structuredClone(rmnd2Fm);
rmnd2Toggle.options.modulationIndex = 25;
setRmnd2Mode(rmnd2Toggle, 'am');
if (rmnd2Toggle.options.modulationIndex !== undefined
  || rmnd2Toggle.bypassed?.['options.modulationIndex'] !== 25) {
  fail('RMND-2 AM did not remove the modulation index and hold it');
} else {
  setRmnd2Mode(rmnd2Toggle, 'fm');
  const restored = structuredClone(rmnd2Toggle);
  delete restored.bypassed;
  if (rmnd2Toggle.options.modulationIndex !== 25
    || !isDeepStrictEqual(restored.options, { ...rmnd2Fm.options, modulationIndex: 25 })) {
    fail('RMND-2 FM did not restore the authored modulation index exactly');
  } else ok('RMND-2 MODE round-trips the authored FM depth through AM and back');
}
const rmnd2NeverFm = { kind: 'tone', synth: 'RMND-2', options: { harmonicity: 1 } };
setRmnd2Mode(rmnd2NeverFm, 'fm');
if (rmnd2NeverFm.options.modulationIndex !== 10) {
  fail(`RMND-2 first switch to FM opened at ${rmnd2NeverFm.options.modulationIndex}, not Tone's 10`);
} else ok('RMND-2 first switch to FM opens at Tone\u2019s own modulation index');

// The engine picks the Tone class from that same structure, so the panel and the rack
// cannot drift about which instrument a preset actually is.
const rmnd2Class = (voice) => VoiceRack.buildSpec(voice);
if (rmnd2Class(rmnd2Fm) && rmnd2Class({ kind: 'tone', synth: 'RMND-2', options: {} })) {
  ok('RMND-2 builds a spec in both modes');
}

for (const [synth, isFm] of [['FMSynth', true], ['AMSynth', false]]) {
  const voice = isFm ? { ...rmnd2Fm, synth } : {
    kind: 'tone', synth,
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    },
  };
  const labels = stripPanelSpec(voice).groups[0]?.rows.map((row) => row.label);
  const expected = isFm ? rmnd2FmSimple : SIMPLE_LABELS['RMND-2'];
  if (stripPanelSpec(voice).mode !== 'quick' || !isDeepStrictEqual(labels, expected)
    || !fullLayout(voice) || checkFullLayout(voice).length
    || synthDisplayName(synth) !== 'RMND-2') {
    fail(`${synth} legacy alias did not resolve to the matching RMND-2 editor`);
  } else ok(`${synth} legacy alias resolves to the RMND-2 Simple/Advanced editor`);
}

for (const [synth, filtered] of [['Synth', false], ['MonoSynth', true]]) {
  const voice = filtered ? { ...crls1Filtered, synth } : {
    kind: 'tone', synth,
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.8, release: 0.2 },
    },
  };
  const labels = stripPanelSpec(voice).groups[0]?.rows.map((row) => row.label);
  const expected = filtered ? crls1FilteredSimple : SIMPLE_LABELS['CRLS-1'];
  if (stripPanelSpec(voice).mode !== 'quick' || !isDeepStrictEqual(labels, expected)
    || !fullLayout(voice) || checkFullLayout(voice).length) {
    fail(`${synth} legacy alias did not resolve to the matching CRLS-1 editor`);
  } else ok(`${synth} legacy alias resolves to the adaptive CRLS-1 Simple/Advanced editor`);
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
  // One band of six single-column cells: the drum window is read ACROSS the signal path,
  // and each card is narrow enough that its own rows read DOWN it. A card that grew back
  // to two columns would be one that had quietly gone wide again.
  if (Ld.bands.length !== 1) fail(`KLNG8: expected 1 band, got ${Ld.bands.length}`);
  const cells = Ld.bands[0]?.cells || [];
  if (cells.length !== 6) fail(`KLNG8: expected 6 columns, got ${cells.length}`);
  if (cells.some((c) => (c.span || 1) !== 1)) fail('KLNG8: a card is wider than one column');
  // The column is fixed at the width the four-pot grid was tuned against, so adding or
  // dropping a column resizes the WINDOW rather than the cards. Without a track the band
  // divides whatever width it is given and every card would move whenever one was added.
  if (Ld.bands[0]?.track !== 259) {
    fail(`KLNG8: the band's track is ${Ld.bands[0]?.track}, not a fixed 259px column`);
  }
  // FM is stacked under the oscillator it bends, in that oscillator's column — and it is
  // still a CARD there, with its own header and switch, not a rule inside the OSC card.
  const cards = cells.flatMap((c) => (c.kind === 'stack' ? c.cards : [c]));
  if (cards.length !== 8) fail(`KLNG8: expected 8 cards, got ${cards.length}`);
  // TWO stacked columns, and they must be the same shape: the two oscillators are one
  // section built twice, so a modulator that stayed under only one of them would be the
  // panel disagreeing with `_playDrum`'s single `buildOsc`.
  const stacks = cells.filter((c) => c.kind === 'stack');
  if (stacks.length !== 2) fail(`KLNG8: expected two stacked columns, got ${stacks.length}`);
  const stackKeys = stacks.map((s) => (s.cards || []).map((c) => c.card?.key));
  if (!isDeepStrictEqual(stackKeys, [['osc', 'osc.fm'], ['osc2', 'osc2.fm']])) {
    fail(`KLNG8: the stacked columns are ${JSON.stringify(stackKeys)},`
      + ' not each oscillator over its own modulator');
  }
  // What Master absorbed: Drive and Humanise as rules under its own rows, Taps as a door
  // in its header. Those three are what freed the columns the signal sections need.
  const cellFor = (key) => cards.find((c) => c.card?.key === key);
  const subsOf = (key) => (cellFor(key)?.card?.sub || []).map((s) => s.rule);
  // The four SOURCE levels lie along the top of their cards as faders, the way TNGR-2's
  // two oscillators have theirs. Master is not a source and has no LEVEL to lay down.
  const faders = cards.filter((c) => c.fader).map((c) => c.card?.key);
  if (!isDeepStrictEqual(faders, ['osc', 'osc2', 'noise', 'ring', 'metal'])) {
    fail(`KLNG8: LEVEL is a fader on ${JSON.stringify(faders)}, not the five sources`);
  }
  for (const key of faders) {
    const row = (cellFor(key)?.card?.rows || []).find((r) => r.label === 'LEVEL');
    if (!row) fail(`KLNG8: the ${key} card asks for a LEVEL fader with no LEVEL row to drive`);
  }
  if (!isDeepStrictEqual(subsOf('note'), ['DRIVE', 'HUMANISE'])) {
    fail(`KLNG8: Master carries ${JSON.stringify(subsOf('note'))}, not Drive and Humanise`);
  }
  const resonatorGroup = panelSpec(DRUM).groups.find((g) => g.key === 'metal.resonator');
  const metalSub = cellFor('metal')?.card?.sub?.find((s) => s.group?.key === 'metal.resonator');
  if (resonatorGroup?.optional !== 'metal.resonator' || resonatorGroup.rows?.length
    || metalSub?.group?.optional !== 'metal.resonator' || metalSub.rule !== 'RESONANT TAIL') {
    fail('KLNG8: Metal does not expose the 808 Resonator as a user switch');
  } else {
    ok('KLNG8: Metal exposes a reversible Resonant Tail switch');
  }
  const doors = (cellFor('note')?.card?.panels || []);
  if (!doors.some((p) => p.taps)) fail('KLNG8: Taps is not a door on the Master card');
  // A sub-section's and a door's rows are still that section's own — taken from the card
  // they came from, not copied — so the exactly-once walk above proves nothing was lost.
  if ((cellFor('note')?.card?.sub || []).some((s) => !s.rows?.length)) {
    fail('KLNG8: a Master sub-section came through with no rows');
  }
  // THE TWO OSCILLATORS ARE ONE SECTION, DRAWN TWICE. `_playDrum` builds them from a
  // single `buildOsc`, so a control that means one thing on the first and another on the
  // second is the panel disagreeing with the engine — and a row list copied for the
  // second card would pass every other check here and still be exactly that drift. The
  // labels and the order are compared with the section name factored out, which is what
  // makes this a claim about the CONTROLS rather than about the paths.
  //
  // KNOCK is the one row the first card has that the second does not: a fixed 300 Hz
  // punch that predates `osc2` and stays a pot — see the gate in `_playDrum`.
  const allRows = (key) => {
    const card = cellFor(key)?.card;
    return [...(card?.rows || []), ...(card?.foot || [])];
  };
  const shapeOf = (key, sec) => allRows(key)
    .map((r) => `${r.label}|${r.path.replace(sec, '<sec>')}`)
    .filter((r) => !r.startsWith('KNOCK|'));
  for (const [a, b, secA, secB] of [['osc', 'osc2', 'osc', 'osc2'],
    ['osc.fm', 'osc2.fm', 'osc', 'osc2']]) {
    const one = shapeOf(a, secA);
    const two = shapeOf(b, secB);
    if (!one.length || !isDeepStrictEqual(one, two)) {
      fail(`KLNG8: ${b} does not draw the same controls as ${a}`
        + ` (${JSON.stringify(one)} vs ${JSON.stringify(two)})`);
    }
  }
  // The curve door, on every card that has a curve to put behind it. Left in the grid,
  // CURVE and RATE CURVE cost a full-width row each on the three longest cards.
  const withCurves = cards.filter((c) => c.curves).map((c) => c.card?.key);
  if (!isDeepStrictEqual(withCurves, ['osc', 'osc2', 'noise', 'ring'])) {
    fail(`KLNG8: the curve door is on ${JSON.stringify(withCurves)},`
      + ' not osc/osc2/noise/ring');
  }
  for (const key of withCurves) {
    if (!(cellFor(key)?.card?.rows || []).some((r) => r.door === 'curve')) {
      fail(`KLNG8: the ${key} card asks for a curve door with no curve row to put in it`);
    }
  }
} catch (err) {
  fail(`KLNG8: fullLayout threw — ${err.message}`);
}
if (!failed) ok('KLNG8 builds one complete band of five narrow columns');

// ---- TNGR-2 -----------------------------------------------------------------
//
// The wavetable synth was in the full window with no test behind it. `pot-coverage` only
// sees its ROOT key — every one of its sixty-odd paths counts as `tngr2` there — so this
// is the only place a control that went missing, or got placed twice, would be caught.
const TNGR = { synth: 'TNGR-2' };
const tngrProblems = checkFullLayout(TNGR);
if (tngrProblems.length) {
  for (const p of tngrProblems) fail(`TNGR-2: ${p}`);
} else {
  const { common, groups } = panelSpec(TNGR);
  const rows = common.rows.length + groups.reduce((n, g) => n + (g.rows || []).length, 0);
  ok(`TNGR-2 — ${rows} controls, every one placed exactly once`);
}
try {
  const Lt = fullLayout(TNGR);
  for (const b of Lt.bands) {
    const span = b.cells.reduce((n, c) => n + (c.span || 1), 0);
    if (span !== b.cols) fail(`TNGR-2: band '${b.name}' spans ${span}, not ${b.cols}`);
  }
  // One row of six columns, two of which hold a STACKED pair — a card alone in a column
  // is as tall as the tallest card beside it, so the short ones pair up rather than
  // standing in their own air. See `buildTngr2FullLayout`.
  const cells = Lt.bands.flatMap((b) => b.cells);
  const cards = cells.flatMap((c) => (c.kind === 'stack' ? c.cards : [c]));
  if (Lt.bands.length !== 1) fail(`TNGR-2: expected 1 row, got ${Lt.bands.length}`);
  if (cells.length !== 4) fail(`TNGR-2: expected 4 columns, got ${cells.length}`);
  // The band's track is one POT wide, so a cell spans as many tracks as its widest row
  // has knobs and every pot on the window sits on the same pitch. See `potsFor`.
  const spans = cells.map((c) => c.span);
  if (JSON.stringify(spans) !== JSON.stringify([4, 4, 4, 4])) {
    fail(`TNGR-2: column widths are ${spans.join('/')} tracks, not 4/4/4/4`);
  }
  if (Lt.bands[0].cols !== 16) fail(`TNGR-2: band is ${Lt.bands[0].cols} tracks, not 16`);
  for (const [i, c] of cells.entries()) {
    if (c.span !== c.cards[0].card.pots) {
      fail(`TNGR-2: column ${i} spans ${c.span} tracks but its cards put ${c.cards[0].card.pots} pots on a line`);
    }
  }
  // FILTER and FILTER ENV read as one thing, so they sit side by side on the top row.
  const topRow = cells.map((c) => c.cards[0].card.key);
  if (JSON.stringify(topRow) !== JSON.stringify(['oscA', 'filter', 'filterenv', 'note'])) {
    fail(`TNGR-2: the top row is ${topRow.join(', ')}, not oscA/filter/filterenv/note`);
  }
  if (cards.length !== 8) fail(`TNGR-2: expected 8 cards, got ${cards.length}`);
  // Every column is a PAIR — the oscillators included. An oscillator card is about the
  // height of one envelope card, so a column of its own was a card and an equal amount of
  // air, and the band was as tall as the pairs beside it either way.
  if (cells.filter((c) => c.kind === 'stack').length !== 4) {
    fail('TNGR-2: expected every column to be a stacked pair');
  }
  if (cells.filter((c) => c.kind === 'stack').some((c) => c.cards.length !== 2)) {
    fail('TNGR-2: a stacked column does not hold exactly two cards');
  }
  // The four cards whose subject is a SHAPE draw it. Motion, Filter Env and Amp are
  // envelopes, Filter is a response curve; the oscillators, Settings and Effects are not.
  // Sorted, because WHICH cards carry a graph is the contract here and where they sit in
  // the band is the layout's business — see the top-row check above for that.
  const graphed = cards.filter((c) => c.graph).map((c) => `${c.card?.key}:${c.graph}`).sort();
  if (!isDeepStrictEqual(graphed, ['amp:env', 'filter:filter', 'filterenv:env', 'motion:env'])) {
    fail(`TNGR-2: graphs are on ${JSON.stringify(graphed)}, not motion/filter/filterenv/amp`);
  }
  // Graphs at the shared default height, which is what MRDR-3 draws at — a TNGR-2 graph
  // that asked for its own size would be the same control at two sizes across the panels.
  const odd = cards.filter((c) => c.graph && c.graphHeight);
  if (odd.length) {
    fail(`TNGR-2: ${odd.map((c) => c.card.key).join(', ')} ask for a non-default graph height`);
  }
} catch (err) {
  fail(`TNGR-2: fullLayout threw — ${err.message}`);
}

// Every envelope on the panel begins a fresh row. The strip grid is four columns and a
// pick spans two, so without `startRow` an ADSR block starts wherever the control above
// it happened to stop — the filter envelope used to begin in column 2 and wrap, which
// reads as four unrelated pots rather than as one envelope.
for (const group of panelSpec(TNGR).groups) {
  const rows = group.rows || [];
  const heads = rows.filter((r) => r.label === 'ATTACK');
  for (const head of heads) {
    if (!head.startRow) fail(`TNGR-2: ${group.key}'s ATTACK does not start a new row`);
  }
  // A stage that follows its own ATTACK must NOT start one, or the block breaks up again.
  for (const label of ['DECAY', 'SUSTAIN', 'RELEASE']) {
    const row = rows.find((r) => r.label === label);
    if (row?.startRow) fail(`TNGR-2: ${group.key}'s ${label} breaks its envelope onto a new row`);
  }
}
if (!failed) ok('TNGR-2 builds four paired columns of eight cards with its envelopes on their own rows');

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

// A section's missing ATTACK must use the drum engine's short strike fallback, not the
// same section's DECAY fallback. The shipped open hat has only METAL, so its Simple
// values also provide a direct regression for the preset that exposed this mismatch.
const openHatRows = quickRows(VOICES.ds808OpenHat);
const openHatAttack = byLabel(openHatRows, 'ATTACK');
const openHatDecay = byLabel(openHatRows, 'DECAY');
if (openHatAttack.read(undefined, VOICES.ds808OpenHat) !== 0.001) {
  fail(`KLNG-8 Simple open-hat ATTACK reads ${openHatAttack.read(undefined, VOICES.ds808OpenHat)}s, not the 1ms engine fallback`);
} else if (openHatDecay.read(undefined, VOICES.ds808OpenHat) !== VOICES.ds808OpenHat.metal.decay) {
  fail(`KLNG-8 Simple open-hat DECAY reads ${openHatDecay.read(undefined, VOICES.ds808OpenHat)}s, not the authored ${VOICES.ds808OpenHat.metal.decay}s`);
} else ok('KLNG-8 Simple open-hat ATTACK and DECAY mirror the engine and authored preset');

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

// The new Simple projections must retain optional sections and paired-voice relationships
// just as the established MRDR/KLNG8 macros do.
const gameSimple = { synth: 'KNDO-5' };
const gameBefore = structuredClone(gameSimple);
const gameCutoff = byLabel(quickRows(gameSimple), 'CUTOFF');
if (gameCutoff.read(undefined, gameSimple) !== 18000) {
  fail('KNDO-5 raw waveform does not read as an open Simple CUTOFF');
}
gameCutoff.write(2400, gameSimple);
if (gameSimple.filter?.freq !== 2400 || gameSimple.filter?.to !== 2400) {
  fail('KNDO-5 Simple CUTOFF did not create a stationary optional filter');
}
gameCutoff.write(18000, gameSimple);
if (!isDeepStrictEqual(gameSimple, gameBefore)) {
  fail('KNDO-5 Simple CUTOFF did not restore the exact no-filter preset');
} else ok('KNDO-5 Simple CUTOFF creates and exactly releases its optional filter seed');

const additiveSimple = {
  synth: 'WNDR-9', additive: { damp: 0.75, perc: { ratio: 3, gain: 0.72, decay: 0.08 } },
};
const additiveBefore = structuredClone(additiveSimple);
const additiveRows = quickRows(additiveSimple);
const additiveBrightness = byLabel(additiveRows, 'BRIGHTNESS');
const additivePercussion = byLabel(additiveRows, 'PERCUSSION');
if (additiveBrightness.read(undefined, additiveSimple) !== 75) {
  fail('Additive Simple BRIGHTNESS does not read inverse DAMP');
}
additiveBrightness.write(50, additiveSimple);
if (additiveSimple.additive.damp !== 1.5) fail('Additive Simple BRIGHTNESS did not write DAMP');
additiveBrightness.write(75, additiveSimple);
additivePercussion.write(0, additiveSimple);
additivePercussion.write(0.72, additiveSimple);
if (!isDeepStrictEqual(additiveSimple, additiveBefore)) {
  fail('Additive Simple controls did not restore authored damping/percussion state');
} else ok('Additive Simple Brightness and Percussion round-trip authored state');


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
  { synth: 'TNGR-2' },
  { synth: 'KNDO-5' },
  { synth: 'WNDR-9' },
  { synth: 'RMND-2' },
  { synth: 'RMND-2', options: { modulationIndex: 8 } },
];
let checkedAliases = 0;
let taperDrift = 0;
for (const voice of aliasVoices) {
  const advanced = advancedRows(voice);
  for (const row of quickRows(voice)) {
    // A `$quick.*` path is a macro over several Advanced keys and has no single twin.
    if (row.path.startsWith('$quick.')) continue;
    // Two Advanced rows can share one stored property — WAVE and VOICING over
    // `oscillator.type`, MODE and FM DEPTH over `modulationIndex`. The twin is the one
    // that OWNS the property, which is the one not marked `derived`; matching the other
    // compares a pot's range against a row of pills that has none.
    const sharing = advanced.filter((r) => r.path === row.path);
    const twin = sharing.find((r) => !r.derived) || sharing[0];
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

// ---- the newly full-window families -------------------------------------------
// KNDO-5 is 3: its Pitch Env, its filter response, and the Filter Env card that
// replaced the SWEEP TO / SWEEP TIME pair when this panel took MRDR-3's filter model.
const GRAPH_COUNTS = {
  'KNDO-5': 3, 'WNDR-9': 1, 'CRLS-1': 3, 'RMND-2': 2,
};
for (const [synth, graphCount] of Object.entries(GRAPH_COUNTS)) {
  const voice = { kind: 'tone', synth };
  const problems = checkFullLayout(voice);
  if (problems.length) {
    for (const problem of problems) fail(`${synth}: ${problem}`);
    continue;
  }
  const layout = fullLayout(voice);
  const spec = panelSpec(voice);
  const expectedRows = spec.common.rows.length
    + spec.groups.reduce((total, group) => total + (group.rows || []).length, 0);
  if (!layout || layout.total !== expectedRows) {
    fail(`${synth}: layout total ${layout?.total} does not match ${expectedRows} panel rows`);
    continue;
  }
  let graphs = 0;
  for (const band of layout.bands) {
    const span = band.cells.reduce((total, cell) => total + (cell.span || 1), 0);
    if (span !== band.cols) fail(`${synth}: band ${band.name} spans ${span}, not ${band.cols}`);
    for (const cell of band.cells) {
      if (cell.graph) graphs++;
      if (cell.kind === 'stack') graphs += cell.cards.filter((item) => item.graph).length;
    }
  }
  if (graphs !== graphCount) {
    fail(`${synth}: full editor has ${graphs} envelope/filter graphs, not ${graphCount}`);
  }
}
const filteredCrlsLayout = fullLayout(crls1Filtered);
const filteredCrlsGraphs = filteredCrlsLayout.bands[0].cells
  .filter((cell) => cell.kind === 'card')
  .reduce((count, cell) => count + (cell.graph ? 1 : 0), 0);
const filteredCrlsPots = filteredCrlsLayout.bands[0].cells
  .filter((cell) => cell.kind === 'card')
  .map((cell) => cell.card?.pots);
if (filteredCrlsGraphs !== 3 || filteredCrlsLayout.bands[0].cols !== 5
  || filteredCrlsPots.some((pots) => pots !== 4)) {
  fail(`CRLS-1 filtered Advanced has ${filteredCrlsGraphs} graphs and `
    + `${filteredCrlsLayout.bands[0].cols} columns/${JSON.stringify(filteredCrlsPots)} pots, `
    + `not 3 graphs, 5 columns and four pots per card`);
} else ok('CRLS-1 filtered Advanced adds graphs and four-pot card columns');
if (!failed) ok('supported families place every Advanced row and reuse all applicable graphs');

// SETTINGS is the shared orientation anchor: it belongs at the right edge of each
// pitched Advanced board, as it already does on the MRDR-3/TNGR-2 reference boards.
const settingsBands = {
  'MRDR-3': 'layer',
  'TNGR-2': 'tngr2',
  'KNDO-5': 'kndo-5',
  'WNDR-9': 'wndr-9',
  'CRLS-1': 'crls-1',
  'RMND-2': 'rmnd-2',
};
const cellHasSettings = (cell) => cell?.kind === 'card'
  ? cell.card?.title === 'Settings'
  : cell?.kind === 'stack'
    ? cell.cards.some((item) => item.card?.title === 'Settings')
    : false;
for (const [synth, bandName] of Object.entries(settingsBands)) {
  const band = fullLayout({ synth }).bands.find((candidate) => candidate.name === bandName);
  if (!band || !cellHasSettings(band.cells.at(-1))) {
    fail(`${synth}: SETTINGS is not the rightmost card on ${bandName}`);
  }
}
if (!failed) ok('pitched Advanced editors keep SETTINGS on the right edge');

const additiveBand = fullLayout({ synth: 'WNDR-9' }).bands[0];
const additiveStackTitles = additiveBand.cells.map((cell) => cell.kind === 'stack'
  ? cell.cards.map((item) => item.card.title)
  : [cell.card?.title]);
const additiveShape = JSON.stringify(additiveStackTitles);
if (additiveBand.cols !== 4
  || additiveShape !== JSON.stringify([
    ['Character', 'Drawbars'], ['Pitch Env', 'Percussion'],
    ['Amp', 'Humanise'], ['Settings', 'Effects'],
  ])) {
  fail(`WNDR-9 Advanced columns are not Character/Drawbars, Pitch Env/Percussion, `
    + `Envelope/Humanise, Settings/Effects: ${additiveShape}`);
} else ok('WNDR-9 Advanced uses four normal-width columns with the requested stacks');
// Every column a PAIR: a lone card in a stacked band holds half a column of air, which is
// what PERCUSSION did before the Effects card gave SETTINGS its partner.
if (additiveBand.cells.some((cell) => cell.kind !== 'stack' || cell.cards.length !== 2)) {
  fail('WNDR-9 Advanced leaves a column unpaired');
} else ok('WNDR-9 Advanced pairs all four columns');

// RMND-2's board is the SAME BOARD in both modes — same cards, same order, same width.
// That is the point of the merge: MODE greys one pot rather than rebuilding the window,
// so a preset does not move under you when you change what its modulator reaches.
for (const [mode, options] of [['am', {}], ['fm', { modulationIndex: 8 }]]) {
  const voice = { synth: 'RMND-2', options };
  const band = fullLayout(voice).bands[0];
  const firstStack = band.cells[0]?.kind === 'stack'
    ? band.cells[0].cards.map((item) => item.card?.title) : [];
  const cardTitles = band.cells.filter((cell) => cell.kind === 'card')
    .map((cell) => cell.card?.title);
  const expectedStack = ['Osc', 'Mod'];
  const expectedCards = ['Mod Env', 'Amp', 'Settings'];
  if (JSON.stringify(firstStack) !== JSON.stringify(expectedStack)
    || JSON.stringify(cardTitles) !== JSON.stringify(expectedCards)) {
    fail(`RMND-2 ${mode} Advanced order is not OSC, MOD ENV, AMP, SETTINGS: `
      + `${JSON.stringify({ firstStack, cardTitles })}`);
  } else {
    ok(`RMND-2 ${mode} Advanced puts OSCILLATORS on top and VCA after MODULATION ENV`);
  }
}

/**
 * EVERY SEAMED CARD IS SEAMED THE SAME WAY, AND ON EVERY BOARD THAT HAS IT.
 *
 * A card holding two unrelated things is split — the second block pinned to the card's
 * floor, the spare height opening between them (`splitCard`). It is the one arrangement
 * rule these boards share across eight engines, and it is exactly the kind of rule that
 * gets applied to the board being worked on and forgotten on the other seven: a new family
 * copies a neighbour's layout, misses the split, and its SETTINGS card is ten rows of one
 * undifferentiated list while every other board's is two blocks.
 *
 * So it is checked here rather than trusted. For each board, the card is FOUND by title and
 * then asserted three ways — hung from the top, spreading its slack, and carrying the named
 * control at the head of its foot block. A board without the card is skipped; a board with
 * it and no seam fails.
 */
const SEAMS = [
  ['MRDR-3', 'layer', 'Settings', 'VIB DEPTH'],
  ['MRDR-3', 'shared', 'Effects', 'CHORUS'],
  ['TNGR-2', 'tngr2', 'Settings', 'VIB DEPTH'],
  ['TNGR-2', 'tngr2', 'Effects', 'CHORUS'],
  ['TNGR-2', 'tngr2', 'Motion', 'LFO WAVE'],
  ['KNDO-5', 'kndo-5', 'Settings', 'VIB DEPTH'],
  ['KNDO-5', 'kndo-5', 'Effects', 'CHORUS'],
  ['KNDO-5', 'kndo-5', 'Osc', 'ATTACK'],
  ['WNDR-9', 'wndr-9', 'Settings', 'VIB DEPTH'],
  ['WNDR-9', 'wndr-9', 'Effects', 'CHORUS'],
  ['WNDR-9', 'wndr-9', 'Percussion', 'ATTACK'],
  ['RMND-2', 'rmnd-2', 'Settings', 'VIB DEPTH'],
];
const findCard = (band, title) => {
  for (const cell of band?.cells || []) {
    const cards = cell.kind === 'stack' ? cell.cards : [cell];
    for (const one of cards) if (one.card?.title === title) return one.card;
  }
  return null;
};
let seamFails = 0;
for (const [synth, bandName, title, head] of SEAMS) {
  const band = fullLayout(synth === 'drum' ? { kind: 'drum' } : { synth })
    .bands.find((candidate) => candidate.name === bandName);
  const card = findCard(band, title);
  if (!card) { seamFails++; fail(`${synth}: no '${title}' card on ${bandName} to seam`); continue; }
  if (!card.top || !card.spread) {
    seamFails++;
    fail(`${synth} '${title}' is not hung from the top and spread (top=${!!card.top}, spread=${!!card.spread})`);
  }
  if (card.foot?.[0]?.label !== head) {
    seamFails++;
    fail(`${synth} '${title}' seams at ${JSON.stringify(card.foot?.[0]?.label ?? null)}, not '${head}'`);
  }
  if ((card.rows || []).some((row) => row.label === head)) {
    seamFails++;
    fail(`${synth} '${title}' left '${head}' above the seam as well as below it`);
  }
}
// The KLNG8's source cards were the first to do this, before it was a rule; they seam
// on `foot` set per ROW rather than by label, so they are checked for the shape only.
const drumBand = fullLayout({ kind: 'drum' }).bands[0];
for (const title of ['Osc 1', 'FM 1', 'Osc 2', 'FM 2', 'Noise', 'Ring', 'Metal']) {
  const card = findCard(drumBand, title);
  if (!card?.top || !card?.spread || card.foot?.[0]?.label !== 'ATTACK') {
    seamFails++;
    fail(`KLNG8 '${title}' no longer seams its envelope onto the card's floor`);
  }
}
if (!seamFails) {
  ok(`${SEAMS.length + 7} two-concept cards across eight boards seam the same way`);
}

// The old names are still valid persisted identities, but now route to CRLS-1. Retired
// synths remain untouched and keep their detailed strip-only editor.
for (const synth of ['Synth', 'MonoSynth']) {
  if (fullLayout({ synth }) === null || stripPanelSpec({ kind: 'tone', synth }).mode !== 'quick') {
    fail(`${synth} did not resolve to the CRLS-1 editor`);
  }
}
// The same guarantee for the other rename. Ten song files carry `GameSynth` inside
// serialised `voiceParams` and were deliberately not migrated, so the alias IS the
// compatibility story: a preset stored under the old name has to reach the same two
// surfaces the new name does, or the rename silently broke every one of those songs.
for (const [stored, became] of [['GameSynth', 'KNDO-5'], ['AdditiveSynth', 'WNDR-9']]) {
  if (fullLayout({ synth: stored }) === null
    || stripPanelSpec({ kind: 'tone', synth: stored }).mode !== 'quick') {
    fail(`${stored} did not resolve to the ${became} editor`);
  }
  if (!isDeepStrictEqual(
    stripPanelSpec({ kind: 'tone', synth: stored }).groups[0]?.rows.map((r) => r.label),
    SIMPLE_LABELS[became],
  )) {
    fail(`a stored ${stored} preset draws a different Simple surface than ${became}`);
  }
}

for (const synth of ['MetalSynth', 'MembraneSynth']) {
  if (fullLayout({ synth }) !== null || stripPanelSpec({ kind: 'tone', synth }).mode !== 'detailed') {
    fail(`${synth} editor changed despite being outside the rollout`);
  }
}
if (fullLayout({ kind: 'noise' }) !== null || stripPanelSpec({ kind: 'noise' }).mode !== 'detailed') {
  fail('NoiseSynth editor changed despite being outside the rollout');
}
if (!failed) ok('every retired spelling resolves to the family it became, and retiring synth editors remain untouched');

console.log(failed ? `\nSYNTH FULL LAYOUT: ${failed} FAILED` : '\nSYNTH FULL LAYOUT: PASSED');
process.exit(failed ? 1 : 0);
