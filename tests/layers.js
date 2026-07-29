// Duplicating and deleting a track on the mixing desk.
//
// Both are edits to the SHAPE of a song — which channels it has — where every other
// desk edit is about balance. That makes them the two edits with the widest blast
// radius: they change what `activeLanes` returns, which changes the rack, the
// arrangement, the stem renderer and the strips the engine builds. So this pins the
// one function they both go through, `deskBank`, and the three properties everything
// downstream depends on:
//
//   1. A mix that says neither hands the bank BACK — the same object, untouched.
//      That identity is what keeps tests/null-test.js sample-exact: every song in the
//      game today takes a path that allocates nothing and re-keys nothing.
//   2. A layer is a real lane by the time anyone looks at it, sections included.
//   3. A deleted lane is gone from the sections too — they are partial banks spread
//      over the whole at schedule time, so a lane left in one would come back in it.
//
// Plus the seams: a layer's key has to resolve back to the lane it copies from the
// key alone, everywhere it turns up, and its voice has to live in bank keys of its
// own or choosing one would reach across into the part it was copied from.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deskBank, deskLanes, activeLanes, laneList, laneUsesEcho, LANE_KEYS } from '../src/engine/lanes.js';
import { seamFor, baseLane, isLayer, voicesFor, voiceOf, VOICE_LANES } from '../src/data/voices.js';
// One song's mix as the file holds it. src/data/mix.js is assembled from the song
// folder now, so a temp copy of it cannot be imported on its own — the module under
// test is the serialiser, and this builds just enough of one to import.
import { mixEntrySource } from '../tools/lib/mix-source.js';

const renderMixFile = (mix) => `export const MIX = {\n${Object.entries(mix)
  .map(([id, e]) => [id, mixEntrySource(e, '  ')]).filter(([, x]) => x)
  .map(([id, x]) => `  ${JSON.stringify(id)}: ${x},\n`).join('')}};\n`;
import { resolveTrack } from '../src/data/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const bank = resolveTrack('plumber').bank;

// ---- the untouched path ----------------------------------------------------
// The whole of the null test rests on this: nothing about layers may cost a song
// that has none so much as a copied object.
assert(deskBank(bank, null) === bank, 'no mix at all hands the bank straight back');
assert(deskBank(bank, {}) === bank, 'a mix with no layers and nothing deleted hands the bank back');
assert(deskBank(bank, { layers: [], off: [] }) === bank,
  'an empty layer list and an empty delete list are the same as none');
assert(deskBank(bank, { master: -3, lanes: { bass: { gain: -2 } } }) === bank,
  'balance decisions do not reshape the song');
assert(laneList(bank) === laneList(bank) && laneList(bank).every((l) => LANE_KEYS.includes(l.key)),
  'a bank with no layers has exactly the engine’s own lane list');

// ---- duplicate -------------------------------------------------------------
const dup = deskBank(bank, { layers: [{ key: 'bass2', from: 'bass' }] });
assert(dup !== bank, 'duplicating a track gives back a new bank');
assert(bank.bass2 === undefined, 'and leaves the song it was made from alone');
assert(dup.bass2 === dup.bass, 'the layer plays the same notes — by reference, not a copy');
assert(dup.sections.every((s) => (s.bass ? s.bass2 === s.bass : s.bass2 === undefined)),
  'every section that has the part has the layer, and no section invents one');
assert(activeLanes(dup, 1).some((l) => l.key === 'bass2'),
  'the layer is an active lane, so it gets a strip and an arrangement row');
const order = deskLanes(dup, 1).map((l) => l.key);
assert(order.indexOf('bass2') === order.indexOf('bass') + 1,
  'the layer sits immediately after the part it copies, on the desk');

// Two layers of one part, in the order they were made.
const two = deskBank(bank, { layers: [{ key: 'bass2', from: 'bass' }, { key: 'bass3', from: 'bass' }] });
const twoOrder = deskLanes(two, 1).map((l) => l.key);
assert(twoOrder.indexOf('bass') + 1 === twoOrder.indexOf('bass2')
  && twoOrder.indexOf('bass2') + 1 === twoOrder.indexOf('bass3'),
  'a second layer follows the first, not the other way round');

// An independently sequenced percussion sound is a layer for voice/mixer purposes,
// but it starts with rests instead of copying the source pattern.
const extra = deskBank(bank, {
  layers: [{ key: 'tom2', from: 'tom', independent: true, label: 'Cowbell' }],
});
assert(extra.tom2.length === 32 && extra.tom2.every((v) => v === false),
  'an added percussion sound starts as its own silent 32-step lane');
assert(extra.tom2Voice === 'tom',
  'an added percussion sound with no chosen preset falls back to an audible Tom voice');
assert(extra.sections.every((s) => s.tom2.length === 32 && s.tom2.every((v) => v === false)),
  'the independent lane exists through every section rather than copying tom notes');
assert(activeLanes(extra, 1).some((l) => l.key === 'tom2'),
  'an empty independent sound still gets a mixer strip and pattern row');
assert(laneList(extra).find((l) => l.key === 'tom2')?.label === 'Cowbell',
  'the added sound carries its chosen voice name onto the strip and row');
const chosenExtra = deskBank(bank, {
  layers: [{ key: 'tom2', from: 'tom', independent: true }],
  voice: { tom2Voice: 'cowbell' },
});
assert(chosenExtra.tom2Voice == null,
  'the fallback stays out of the shaped bank when the mix names a voice that will be merged later');
const ownPattern = new Array(32).fill(false); ownPattern[5] = true;
const extraEdited = deskBank({ ...bank, sections: [
  ...bank.sections, { base: 0, tom2: ownPattern },
] }, { layers: [{ key: 'tom2', from: 'tom', independent: true }] });
assert(extraEdited.sections.at(-1).tom2 === ownPattern,
  'an arrangement pattern on the extra sound is preserved rather than blanked or doubled');

// A layer of a lane the song does not play is a row that would play nothing.
assert(deskBank(bank, { layers: [{ key: 'crash2', from: 'crash' }] }).crash2 === undefined
  || !bank.crash, 'a layer of a silent lane never becomes an active lane');

// Junk in the mix file must not become a lane: the key has to be a layer key the
// seams can resolve, and the source has to be a lane the engine has.
for (const bad of [
  { key: 'bass', from: 'bass' },          // that is the lane itself
  { key: 'bass2', from: 'nosuchlane' },
  { key: 'nosuchlane2', from: 'bass' },   // no seam — nothing could play it
  { key: '', from: 'bass' },
]) {
  const out = deskBank(bank, { layers: [bad] });
  assert(out === bank || !(out.__layers || []).length,
    `a layer of ${JSON.stringify(bad)} is dropped rather than half-built`);
}

// ---- delete ----------------------------------------------------------------
const gone = deskBank(bank, { off: ['hats'] });
assert(gone.hats === undefined, 'a deleted track is off the bank');
assert(gone.sections.every((s) => s.hats === undefined),
  'and off every section — a section is a partial bank, and one left in would bring it back');
assert(bank.hats !== undefined, 'the song itself is untouched: deleting is a mix decision');
assert(!deskLanes(gone, 1).some((l) => l.key === 'hats'),
  'so the desk has no strip and no arrangement row for it');
assert(deskLanes(gone, 1).length === deskLanes(bank, 1).length - 1,
  'and nothing else moves');

// A layer of a deleted part would be a copy of nothing.
const both = deskBank(bank, { off: ['bass'], layers: [{ key: 'bass2', from: 'bass' }] });
assert(both.bass === undefined && both.bass2 === undefined,
  'deleting a part takes any layer of it with it');

// ---- the seams -------------------------------------------------------------
assert(baseLane('bass2') === 'bass' && baseLane('leadHarm3') === 'leadHarm',
  'a layer key resolves back to the lane it copies, from the key alone');
assert(baseLane('bass') === 'bass' && baseLane('ohats') === 'ohats',
  'a real lane resolves to itself');
assert(LANE_KEYS.every((k) => !isLayer(k)),
  'no lane the engine ships reads as a layer — none of them end in a digit');
assert(isLayer('bass2') && isLayer('kick4') && !isLayer('bass') && !isLayer('nosuchlane2'),
  'and a layer is a key whose base IS a lane, not any key ending in a number');

const seam = seamFor('bass2');
assert(seam.voiceKey === 'bass2Voice' && seam.gainKey === 'bass2Gain' && seam.durKey === 'bass2Dur',
  'a layer keeps its voice, gain and length in bank keys of its own');
assert(seam.voiceKey !== VOICE_LANES.bass.voiceKey,
  'so choosing a voice for the layer can never change the part it was copied from');
assert(seamFor('kick2').note === VOICE_LANES.kick.note && seamFor('kick2').noteKey === 'kick2Note',
  'a percussion layer is struck at the same note its source is, and can be retuned on its own');
assert(seamFor('organChords2').typeKey === undefined,
  'a layer of a lane with no waveform key has none either');
assert(seamFor('sweeps2') === null && seamFor('gliss2') === null,
  'a lane no voice can play cannot be layered — a layer with no voice is silence');

// ---- what a layer is allowed to play ---------------------------------------
const forLayer = voicesFor('bass2');
assert(forLayer.length > 0, 'a layer has presets to choose from');
assert(forLayer.every((v) => v.kind !== 'engine'),
  'but no ENGINE preset: those are bank keys the hand-written lane reads, and a layer has no hand-written lane');
assert(voicesFor('bass').some((v) => v.kind === 'engine'),
  'while the lane itself still offers them');
assert(voiceOf({ bass2Voice: 'engFilteredSaw' }, 'bass2') === null,
  'an engine preset named on a layer resolves to nothing rather than to silence you cannot see');
const toneId = forLayer[0].id;
assert(voiceOf({ bass2Voice: toneId }, 'bass2')?.id === toneId,
  'a synth preset on a layer resolves normally');
assert(voiceOf({ bassVoice: toneId }, 'bass2') === null,
  'and the layer reads its OWN key — the part’s voice is not inherited at play time');

// ---- the sends -------------------------------------------------------------
assert(laneUsesEcho(dup, 'bass2') === laneUsesEcho(dup, 'bass'),
  'a layer taps the delay wherever its source does');
assert(laneUsesEcho(bank, 'lead2') === laneUsesEcho(bank, 'lead'),
  'including the melodic lanes, which echo by default');

// ---- the file ---------------------------------------------------------------
// Same risk as every other field in the serialiser: a shape decision that is not
// emitted is a duplicated track that vanishes on Save.
const dir = mkdtempSync(join(tmpdir(), 'mash-layers-'));
const roundTrip = async (entry) => {
  const p = join(dir, `${Math.abs(JSON.stringify(entry).length)}-${Object.keys(entry).join('')}.js`);
  writeFileSync(p, renderMixFile({ plumber: entry }));
  return (await import(p)).MIX.plumber;
};

const rt = await roundTrip({
  layers: [{ key: 'bass2', from: 'bass' }, { key: 'lead2', from: 'lead' }],
  off: ['crash'],
  voice: { bass2Voice: toneId },
  lanes: { bass2: { gain: -4.5, send: { reverb: 0.3 } } },
});
assert(JSON.stringify(rt.layers) === JSON.stringify([{ key: 'bass2', from: 'bass' }, { key: 'lead2', from: 'lead' }]),
  'round-trip: duplicated tracks survive Save, in order');
assert(JSON.stringify(rt.off) === JSON.stringify(['crash']),
  'round-trip: a deleted track survives Save');
assert(rt.voice?.bass2Voice === toneId, 'round-trip: a layer keeps the voice it was given');
assert(rt.lanes?.bass2?.gain === -4.5 && rt.lanes.bass2.send.reverb === 0.3,
  'round-trip: a layer keeps its channel — it is a strip like any other');

const extraRt = await roundTrip({
  layers: [{ key: 'tom2', from: 'tom', independent: true, label: 'Cowbell' }],
  voice: { tom2Voice: 'cowbell' },
});
assert(extraRt.layers[0].independent === true && extraRt.layers[0].label === 'Cowbell',
  'round-trip: an independent added sound keeps its mode and display name');

const shapeOnly = await roundTrip({ off: ['crash'] });
assert(shapeOnly && JSON.stringify(shapeOnly.off) === JSON.stringify(['crash']),
  'a song whose only decision is a deleted track is still written out');

console.log(failed ? '\nLAYERS: FAILED' : '\nLAYERS: PASSED');
process.exit(failed ? 1 : 0);
