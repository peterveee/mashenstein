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
import { deskBank, deskLanes, activeLanes, laneActivity, laneList, laneUsesEcho, LANE_KEYS } from '../src/engine/lanes.js';
import { seamFor, baseLane, isLayer, voicesFor, voiceOf, VOICE_LANES } from '../src/data/voices.js';
// One song's mix as the file holds it. src/data/mix.js is assembled from the song
// folder now, so a temp copy of it cannot be imported on its own — the module under
// test is the serialiser, and this builds just enough of one to import.
import { mixEntrySource } from '../tools/lib/mix-source.js';
// The desk's own duplicate path: the mix gets the layer, the arrangement gets the bars
// the source does not play in. Both halves are asserted below, against the same bank.
import {
  draftOf, entryOf, setLanesOff, writeBarNotes, copyLaneArrangement,
} from '../tools/lib/arrangement-edit.js';
import { applyArrangement, resolveSection, arrangementIssues } from '../src/data/arrangements.js';

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
assert(dup.sections.every((s) => (Object.hasOwn(s, 'bass')
  ? s.bass2 === s.bass : !Object.hasOwn(s, 'bass2'))),
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

// A copy of a layer in the MIDDLE of a family. The desk splices it into `layers`
// directly after its source, and that list is the order — so a duplicate lands on the
// next row down rather than at the bottom of the family. It cannot be done by naming:
// the free key here is bass5, and the number in a layer key is a bank key, not a
// position. This is the case a duplicate of lead5 in an imported song hits, where the
// copy arrived as lead8, three strips below the part it doubles.
const middle = deskBank(bank, {
  layers: [
    { key: 'bass2', from: 'bass' },
    { key: 'bass5', from: 'bass2' },      // the duplicate, spliced in after its source
    { key: 'bass3', from: 'bass' },
    { key: 'bass4', from: 'bass' },
  ],
});
assert(deskLanes(middle, 1).map((l) => l.key).join(' ').includes('bass bass2 bass5 bass3 bass4'),
  'a duplicate sits directly under the track it copies, whatever number its key got');

// And a copy of the LANE the family is named after goes in front of that family: the
// lane itself is not in `layers` at all, so the desk inserts before its first layer
// rather than appending, which would have put a second bass under bass4.
const ofLane = deskBank(bank, {
  layers: [
    { key: 'bass5', from: 'bass' },       // the duplicate, inserted before the rest
    { key: 'bass2', from: 'bass' },
    { key: 'bass3', from: 'bass' },
  ],
});
assert(deskLanes(ofLane, 1).map((l) => l.key).join(' ').includes('bass bass5 bass2 bass3'),
  'a duplicate of the lane itself lands above the layers already under it');

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

// ---- what a duplicate is, bar for bar --------------------------------------
// The two masks meet on opposite sides of deskBank, and that is what made a duplicate
// stop being one. Notes go through the ARRANGEMENT — a deleted note is a forked section,
// and the layer materialises over the already-edited section, so it follows for free.
// The mute mask is a list of literal lane keys applied AFTER the layer exists, so a
// duplicate of a bass that drops out for the middle eight played straight through it:
// two strips, audibly different parts, from the moment the copy was made. The desk
// answers that in the draft, at the moment of duplication — see copyLaneArrangement —
// because a duplicate is a second strip with its own row and its own mute on every bar
// of it, not a lane that can never be heard where its source is silent.
{
  const id = 'plumber';
  const LANE = 'bass', DUP = 'bass2';
  const MUTED = 6;
  let draft = draftOf(bank, null);
  draft = writeBarNotes(bank, draft, 2, LANE, new Array(16).fill(null));
  draft = setLanesOff(draft, MUTED, MUTED, [LANE], true);

  const sounding = (d) => {
    const arranged = applyArrangement(bank, id, { [id]: entryOf(bank, d) });
    const desk = deskBank(arranged, { layers: [{ key: DUP, from: LANE }] });
    return d.plan.map((p) => {
      const block = { ...desk, ...(resolveSection(desk, p.sec) || {}) };
      const off = [...(p.off || []), ...(p.delete || [])];
      const notes = (key) => (off.includes(key) ? 0 : (block[key] || [])
        .slice(p.half * 16, p.half * 16 + 16).filter((v) => v != null && v !== false).length);
      return [notes(LANE), notes(DUP)];
    });
  };
  const before = sounding(draft);
  const after = sounding(copyLaneArrangement(draft, LANE, DUP));
  assert(before[2][0] === 0 && before[2][1] === 0 && before.some(([a]) => a > 0),
    'a note deleted on the source is already gone from the duplicate — the layer is the edited array');
  assert(before[MUTED][0] === 0 && before[MUTED][1] > 0,
    'but the bar mute is keyed by lane name, so the raw duplicate plays where its source is muted');
  assert(after.every(([a, b]) => a === b),
    'carrying the source lane’s bar decisions across makes the duplicate the part, bar for bar');
}

// ---- the section that says "not here" --------------------------------------
// A section names what it plays, and `bass: null` is a section saying it does NOT play
// the bass — the middle eight it sits out. Six of the game's songs are written that way.
// Read as "nothing to copy", the layer was left unset in that section, fell through to
// the whole-bank part underneath, and played the very bars its source is silent for: the
// copy was a second part rather than a second strip, and no arrangement edit could put it
// right because the bars it played in were not bars anybody had asked for. Presence, not
// truthiness — a duplicate follows its source out of the song as well as into it.
{
  const part = new Array(32).fill(220);
  const song = {
    bpm: 120,
    bass: part,
    sections: [{ bass: part }, { bass: null }],
    order: [0, 1],
  };
  const out = deskBank(song, { layers: [{ key: 'bass2', from: 'bass' }] });
  assert(out.sections[0].bass2 === part,
    'the layer takes the part in a section that plays it');
  assert(Object.hasOwn(out.sections[1], 'bass2') && out.sections[1].bass2 === null,
    'and drops out with it in a section that does not, rather than falling back to the bank’s own line');
  const act = laneActivity(out, 1, 1);
  const src = act.find((l) => l.key === 'bass');
  const copy = act.find((l) => l.key === 'bass2');
  assert(src.density.some((d) => d > 0) && src.density.some((d) => d === 0),
    'the song this is asked of does have a bar the part sits out');
  assert(JSON.stringify(src.density) === JSON.stringify(copy.density),
    'so the duplicate sounds in exactly the bars its source does, and in no others');
}

// ---- a duplicate of a duplicate --------------------------------------------
// A layer's source can be another layer, and it has to be able to be: every part of an
// IMPORTED song is an added track, so the engine lane a layer key is named after — the
// `tom` behind `tom2` — is a lane those songs do not have at all. Copying that instead of
// the lane the user actually pointed at gave them a strip playing the engine's own tom
// where the song has one, and an empty row where it does not: "I duplicated this track
// and it didn't duplicate all the bars".
{
  const own = new Array(32).fill(false);
  own[3] = true; own[19] = true;
  const imported = { bpm: 120, sections: [{ tom2: own }], order: [0] };
  const out = deskBank(imported, {
    layers: [
      { key: 'tom2', from: 'tom', independent: true, label: 'Cowbell' },
      { key: 'tom3', from: 'tom2' },
    ],
  });
  assert(out.sections[0].tom3 === own,
    'a duplicate of an added track plays the added track’s pattern, not the lane it is named after');
  const act = laneActivity(out, 1, 1);
  const added = act.find((l) => l.key === 'tom2');
  const copy = act.find((l) => l.key === 'tom3');
  assert(copy && JSON.stringify(added.density) === JSON.stringify(copy.density),
    'bar for bar, which is the whole of what Duplicate track promises');
  const named = laneList(out).find((l) => l.key === 'tom3');
  assert(named?.group === 'drums' && named?.label === 'tom 3',
    'and it is named and grouped off the engine lane at the bottom of the chain, not off tom2');
  assert(deskLanes(out, 1).map((l) => l.key).join(' ').includes('tom2 tom3'),
    'the copy sits immediately after the track it copies, as any other layer does');
  // The chain is walked in declaration order, which is creation order: a copy is always
  // declared after the thing it copies. One that is not is an entry nothing can build.
  const backwards = deskBank(imported, {
    layers: [{ key: 'tom3', from: 'tom2' }, { key: 'tom2', from: 'tom', independent: true }],
  });
  assert(!(backwards.__layers || []).some((l) => l.key === 'tom3'),
    'a layer standing on one that does not exist yet is dropped rather than half-built');
}

// ---- a duplicate of a track that is silent in the BANK ----------------------
// The desk writes note edits into the arrangement, never into the composition, so an
// added track that was played in entirely on the desk has nothing in the bank at all:
// it is a lane because it is `independent`, not because anything here can hear it. Its
// copy is neither, and activity alone dropped it — the one shape where "the same notes
// as my source" and "notes of my own" are both nothing.
//
// It then failed twice, because the desk validates an arrangement against this lane
// list. Duplicate copies the source's per-bar decisions onto the new key, that read as
// an arrangement naming a lane the song does not have, the edit was refused, and the
// refusal undid the mix edit that had just added the layer. Duplicate did nothing, and
// said it had: "Celeste 2 copy added under Celeste 2", with no new track anywhere.
{
  const silent = { bpm: 120, sections: [{}], order: [0] };
  const out = deskBank(silent, {
    layers: [
      { key: 'tom2', from: 'tom', independent: true, label: 'Cowbell' },
      { key: 'tom3', from: 'tom2' },
    ],
  });
  const keys = deskLanes(out, 1).map((l) => l.key);
  assert(keys.includes('tom2'), 'an added track with no notes yet is still a track');
  assert(keys.includes('tom3'),
    'and so is a duplicate of it — a copy is as present as the track it copies');
  assert(!arrangementIssues(silent, { order: [{ s: 0, off: ['tom3'] }] }, keys).length,
    'so the arrangement Duplicate writes for it is playable rather than refused');
}

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

// Scratch templates deliberately expose silent starter lanes. Their visibility
// marker is part of the lane's shape and has to be removed with the lane itself.
const scratchBank = {
  bpm: 120,
  lead: new Array(32).fill(null),
  bass: new Array(32).fill(null),
  starterLanes: ['lead', 'bass'],
};
const scratchGone = deskBank(scratchBank, { off: ['lead'] });
assert(!scratchGone.starterLanes.includes('lead') && scratchGone.starterLanes.includes('bass'),
  'deleting a scratch starter lane removes its silent-track visibility marker');
assert(!deskLanes(scratchGone, 1).some((l) => l.key === 'lead')
  && deskLanes(scratchGone, 1).some((l) => l.key === 'bass'),
  'a deleted scratch starter has no strip or arrangement row while the other starter remains');

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
// The gestures used to be the exception here: no seam, so nothing to layer. They have
// one now — a preset on the real lane makes the engine stand its hand-written body down
// — and a layer of one is a preset and nothing else, so it layers like any other lane.
assert(seamFor('sweeps2').voiceKey === 'sweeps2Voice' && seamFor('gliss2').voiceKey === 'gliss2Voice',
  'the gesture lanes carry a seam of their own now, so they layer like the rest');
assert(LANE_KEYS.every((k) => seamFor(k) && seamFor(`${k}2`)),
  'and there is no lane left that cannot be: every one the engine ships has a seam');
assert(seamFor('nosuchlane2') === null && seamFor('nosuchlane') === null && seamFor('') === null,
  'while a key whose base is not a lane has none — a layer of nothing is silence');

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
