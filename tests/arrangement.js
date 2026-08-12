// The arrangement layer: the format, the resolver, and the editing seam.
//
// The load-bearing assertion is the first one. Every song in the game was balanced
// and arranged by ear against the engine as it is, so an arrangement layer that is
// EMPTY has to be provably nothing at all — same bank object, same order, same
// sound. `tests/null-test.js` proves that at the sample; this proves it at the
// object, which is faster and says which song broke.
//
// The rest is the trap that makes bar editing hard: lane arrays are shared by object
// identity across sections and across lane keys, and `order` reuses sections, so a
// naive write to "bar 3" changes bar 1 as well — and, in `shop`, changes five other
// lanes with it.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listTracks, resolveTrack } from '../tools/lib/tracks.js';
import { renderArrangementsFile } from '../tools/lib/arrangements-source.js';
import {
  ARRANGEMENTS, applyArrangement, resolveSection, expandOrder, orderOf, arrangementIssues, bpmOf,
  swingOf, SWING_MAX, SWING_STRAIGHT,
} from '../src/data/arrangements.js';
import {
  draftOf, entryOf, planToOrder, setLanesOff, setLanesDeleted, transposeBars, offsetBars,
  gainBars, panBars, copyBars, pasteBars, insertSilence, copyLaneBars, silenceBars, deleteBars,
  duplicateBars, buildUp, breakdown, forkBar, writeBarNotes, writeBarNotesShared, removeLanes,
  copyLaneArrangement,
  compactSections, patternStarts, barCount, setTempo, setSwing, readBarLane,
  DRUM_LANES,
} from '../tools/lib/arrangement-edit.js';
import { discardSongDraft, restoreSongDraft } from '../tools/lib/mixer-drafts.js';
import {
  sharedPatternGroups, sharedPatternDescription, playheadCell, playheadWindow, drumRowOrder,
  KITS,
} from '../tools/mixer-step-seq.js';
import { VOICES, isKitVoice, baseLane } from '../src/data/voices.js';
import {
  LANE_KEYS, songBlocks, songBars, barPlan, activeLanes, laneActivity, laneUsesEcho, deskBank,
  isLenKey,
} from '../src/engine/lanes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const tracks = listTracks().map((t) => resolveTrack(t.id)).filter((t) => t && t.bank);
const banks = Object.fromEntries(tracks.map((t) => [t.id, t.bank]));
const withSections = tracks.filter((t) => t.bank.sections?.length);
const json = (v) => JSON.stringify(v);

/**
 * Is this song's order the LEGACY form — a flat list of section indices?
 *
 * The equivalence checks below hold the bar-based rewrite to answering exactly what
 * the code it replaced answered, and that question only has an answer for an order
 * the old code could read. `{s: 0, bars: 1}` is the thing bars ADDED: a single bar of
 * a section, which the legacy walk (`order[floor(step / 32)]`, `e < sections.length`)
 * cannot express and the legacy blocks builder turns into a spread of `undefined`.
 *
 * This is not a hypothetical: a scratch song created with an odd bar count gets one —
 * `orderForBars` in tools/lib/new-song.js has always ended an odd song on a single
 * bar — so a five-bar song in the drawer used to fail three assertions here for a
 * reason that had nothing to do with the song or the rewrite.
 */
const legacyOrder = (t) => orderOf(t.bank).every((e) => typeof e === 'number');
const legacyTracks = tracks.filter(legacyOrder);
const legacySections = withSections.filter(legacyOrder);
const barLevel = tracks.filter((t) => !legacyOrder(t));

// ---- one song is always two draft halves ------------------------------------

{
  const mixes = {
    plumber: { layers: [{ key: 'bass2', from: 'bass' }] },
    shop: { master: -2 },
  };
  const arrangements = {
    plumber: { order: [0], sections: [{ base: 0, rim: [true] }] },
    shop: { order: [1] },
  };
  discardSongDraft(mixes, arrangements, 'plumber');
  assert(!('plumber' in mixes) && !('plumber' in arrangements),
    'discard removes both the added instruments and painted patterns for one song');
  assert(mixes.shop.master === -2 && arrangements.shop.order[0] === 1,
    'discard leaves every other song draft untouched');

  restoreSongDraft(mixes, arrangements, 'plumber', { master: -4 }, { order: [2] });
  assert(mixes.plumber.master === -4 && arrangements.plumber.order[0] === 2,
    'history restore replaces the mix and arrangement as one moment');
  restoreSongDraft(mixes, arrangements, 'plumber', null, null);
  assert(mixes.plumber.master === 0 && arrangements.plumber === null,
    'a historical version with no entries removes later instruments and patterns');
  assert(mixes.shop.master === -2 && arrangements.shop.order[0] === 1,
    'history restore cannot leak into a different song');
}

// ---- an empty layer is nothing at all ---------------------------------------

assert(Object.keys(ARRANGEMENTS).length === 0 || Object.keys(ARRANGEMENTS).every((id) => banks[id]),
  'every arrangement entry names a real track');
const unarrangedSongs = tracks.filter((t) => !ARRANGEMENTS[t.id]);
const arrangedSongs = tracks.filter((t) => ARRANGEMENTS[t.id]);
assert(unarrangedSongs.every((t) => applyArrangement(t.bank, t.id) === t.bank),
  `a song with no arrangement is handed back the SAME bank object, not a copy `
  + `(${unarrangedSongs.length} of ${tracks.length} tracks)`);
// And a song WITH one must not be: it plays a different order, so it needs its own
// object — the bank in the module is the composition and is never patched in place.
assert(arrangedSongs.every((t) => applyArrangement(t.bank, t.id) !== t.bank),
  `a song with an arrangement gets a patched copy (${arrangedSongs.length} arranged)`);
// Identity is not a nicety: trackIdOf is a WeakMap on the bank, so a song handed a
// clone would lose its own mix on the way to being played.
assert(applyArrangement(banks.plumber, 'plumber', { plumber: {} }) === banks.plumber,
  'an entry that says nothing is also a no-op, not a clone');

// ---- expansion is what the engine already does ------------------------------

// audio.js:1595 — `sections[order[floor(step/32) % order.length] % sections.length]`
// with `s = step % 32`. A bar plan has to compute the same two numbers for every
// step of every song, or the null test is where we would find out.
let mismatches = 0;
let stepsChecked = 0;
for (const t of legacySections) {
  const bank = t.bank;
  const order = orderOf(bank);
  const plan = expandOrder(order, true);
  if (plan.length !== order.length * 2) { mismatches++; continue; }
  for (let step = 0; step < order.length * 32; step++) {
    const engineSec = order[Math.floor(step / 32) % order.length];
    const engineS = step % 32;
    const bar = plan[Math.floor(step / 16) % plan.length];
    const planS = (step % 16) + bar.half * 16;
    stepsChecked++;
    if (bar.sec !== engineSec || planS !== engineS) { mismatches++; break; }
  }
}
assert(mismatches === 0,
  `a legacy order expands to exactly what scheduleStep computes today `
  + `(${legacySections.length} songs, ${stepsChecked} steps)`);
assert(legacySections.every((t) => orderOf(t.bank).every((e) => e < t.bank.sections.length)),
  'no song\'s order points past its own section list, so the engine\'s wrap-around never fires');
// The songs the legacy walk cannot describe are still held to the property that
// matters for them: a bar-level entry is worth exactly the bars it claims, so the
// plan is as long as the song says it is.
assert(barLevel.every((t) => expandOrder(orderOf(t.bank), true).length
  === orderOf(t.bank).reduce((sum, e) => sum + (typeof e === 'number' ? 2 : (e.bars ?? 2)), 0)),
`a bar-level order expands to exactly the bars it names (${barLevel.length} songs)`);

const sectionless = tracks.filter((t) => !t.bank.sections?.length);
assert(sectionless.every((t) => expandOrder(orderOf(t.bank), false).every((b) => b.sec === null)),
  `a bank with no sections expands to bare bars (${sectionless.length} songs)`);

// One bar of a section, and the second bar of one.
const half = expandOrder([{ s: 2, bars: 1 }, { s: 3, bars: 1, from: 1 }], true);
assert(half.length === 2 && half[0].sec === 2 && half[0].half === 0
  && half[1].sec === 3 && half[1].half === 1,
  'an entry can name one bar, and can name the SECOND bar of a section');
const masked = expandOrder([{ s: 1, off: ['snare', 'clap'] }], true);
assert(masked.length === 2 && masked.every((b) => json(b.off) === json(['snare', 'clap'])),
  'a mute mask lands on every bar the entry covers');
assert(masked[0].off !== masked[1].off,
  'and each bar gets its own copy of it — two bars sharing one array change together');

// ---- the rebuilt lane helpers answer exactly what they used to ---------------
//
// `songBlocks`, `activeLanes`, `laneActivity` and `laneUsesEcho` are built on bars
// now. For every song in the game that has to be a rewrite nobody can hear or see,
// so each is checked against the implementation it replaced, kept here verbatim.

const legacyBlocks = (bank, repeat = 1) => {
  const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
  const blocks = [];
  for (let r = 0; r < repeat; r++) {
    for (const oi of order) blocks.push(bank.sections ? { ...bank, ...bank.sections[oi] } : bank);
  }
  return blocks;
};
const legacyActivity = (bank, repeat = 1, cellsPerBar = 4) => {
  const blocks = legacyBlocks(bank, repeat);
  const stepsPerCell = 16 / cellsPerBar;
  const cells = blocks.length * 2 * cellsPerBar;
  return activeLanes(bank, repeat).map((lane) => {
    const density = new Array(cells).fill(0);
    const steps = Array.from({ length: cells }, () => []);
    blocks.forEach((b, bi) => {
      const arr = b[lane.key];
      if (!arr) return;
      for (let c = 0; c < 2 * cellsPerBar; c++) {
        let hits = 0;
        const cell = bi * 2 * cellsPerBar + c;
        for (let i = c * stepsPerCell; i < (c + 1) * stepsPerCell; i++) {
          const v = arr[i];
          if (v === true || (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length)) hits++;
          steps[cell].push(v ?? null);
        }
        density[cell] = hits / stepsPerCell;
      }
    });
    return { ...lane, density, steps, cellsPerBar };
  });
};

let blocksSame = 0, activitySame = 0, echoSame = 0, barsSame = 0;
for (const t of legacyTracks) {
  const bank = t.bank;
  for (const repeat of [1, 2]) {
    if (json(songBlocks(bank, repeat)) === json(legacyBlocks(bank, repeat))) blocksSame++;
  }
  if (json(laneActivity(bank, 1, 4)) === json(legacyActivity(bank, 1, 4))) activitySame++;
  // The one cell size the desk uses for a long song, as well as the default.
  if (json(laneActivity(bank, 1, 1)) === json(legacyActivity(bank, 1, 1))) activitySame++;
  if (songBars(bank, 1).length === legacyBlocks(bank, 1).length * 2) barsSame++;
  if (LANE_KEYS.filter((k) => k !== 'tom')
    .every((k) => laneUsesEcho(bank, k) === legacyEcho(bank, k))) echoSame++;
}
function legacyEcho(bank, key) {
  const blocks = legacyBlocks(bank, 1);
  const ECHO = {
    bass: (b) => !!b.bassEcho || !!b.echoEverything,
    vox: (b) => !!b.echoEverything, shout: (b) => !!b.echoEverything,
    kick: (b) => !!b.echoEverything, snare: (b) => !!b.echoEverything,
    clap: (b) => !!b.echoEverything, hats: (b) => !!b.echoEverything,
    ohats: (b) => !!b.echoEverything, crash: (b) => !!b.crashEcho || !!b.echoEverything,
  };
  const test = ECHO[key];
  return test ? blocks.some(test) : true;
}
assert(blocksSame === legacyTracks.length * 2,
  `songBlocks built on bars is identical to what it returned before (${legacyTracks.length} songs, repeat 1 and 2)`);
assert(barsSame === legacyTracks.length, 'and a song is exactly twice as many bars as it was blocks');
assert(activitySame === legacyTracks.length * 2,
  `laneActivity is identical, cell for cell, at 4 cells a bar and at 1 (${legacyTracks.length} songs)`);
assert(echoSame === legacyTracks.length,
  `laneUsesEcho answers the same for every lane of every song (${legacyTracks.length} songs)`);
assert(!laneUsesEcho(banks.plumber, 'tom'),
  'the new tom lane follows the kit dry-by-default routing');

// ---- resolveSection ----------------------------------------------------------

assert(resolveSection(banks.plumber, 0) === banks.plumber.sections[0],
  'a bank\'s own section resolves to itself, untouched');
assert(resolveSection(banks.plumber, 99) === null && resolveSection(banks.plumber, -1) === null,
  'an index off the end resolves to nothing rather than throwing');

const layered = { ...banks.plumber, sections: [...banks.plumber.sections, { base: 1, lead: ['X'] }] };
const delta = resolveSection(layered, 6);
assert(delta.lead[0] === 'X' && delta.echoLevel === banks.plumber.sections[1].echoLevel,
  'a layer section carrying `base` replaces the lanes it names and inherits the rest');
assert(!('base' in delta), 'and the marker itself does not reach the sequencer');
assert(banks.plumber.sections[1].lead !== delta.lead,
  'resolving does not write the delta back into the section it is based on');

const chained = { ...banks.plumber, sections: [...banks.plumber.sections, { base: 1, lead: ['X'] }, { base: 6, bass: ['Y'] }] };
const deep = resolveSection(chained, 7);
assert(deep.lead[0] === 'X' && deep.bass[0] === 'Y', 'a delta on a delta resolves through the chain');
const cyclic = { ...banks.plumber, sections: [...banks.plumber.sections, { base: 6, lead: ['X'] }] };
assert(resolveSection(cyclic, 6)?.lead[0] === 'X',
  'a section based on itself answers instead of hanging — a hand-edited file is not a stack overflow');

// ---- applying a real layer ---------------------------------------------------

const before = json(banks.plumber);
const arranged = applyArrangement(banks.plumber, 'plumber', {
  plumber: { order: [0, 0, { s: 1, bars: 1, off: ['snare'] }, 1, 2], sections: [{ base: 1, lead: ['X'] }] },
});
assert(arranged !== banks.plumber && json(banks.plumber) === before,
  'applying a layer copies the bank and leaves the original exactly as it was');
assert(arranged.sections.length === banks.plumber.sections.length + 1,
  'layer sections are appended after the bank\'s own, so existing indices still mean what they meant');
assert(expandOrder(arranged.order, true).length === 9,
  'the layer\'s order is what plays: 4 whole blocks and a single bar');

// ---- opening a song and saving it writes nothing -----------------------------

let dirty = [];
for (const t of tracks) {
  const draft = draftOf(t.bank, null);
  if (entryOf(t.bank, draft) !== null) dirty.push(t.id);
}
assert(dirty.length === 0,
  `a song opened on the desk and saved untouched leaves no entry (${tracks.length} tracks)`);

let roundTripped = 0;
for (const t of withSections) {
  const order = orderOf(t.bank);
  if (json(planToOrder(expandOrder(order, true))) === json(order)) roundTripped++;
}
assert(roundTripped === withSections.length,
  `every hand-written order survives bars-and-back unchanged, numbers included (${roundTripped}/${withSections.length})`);

// ---- the edits ---------------------------------------------------------------

const plumber = banks.plumber;
const base = draftOf(plumber, null);
assert(barCount(base) === orderOf(plumber).length * 2, 'a draft is one entry per bar');
const basePatternStarts = patternStarts(base.plan);
assert(!basePatternStarts[2] && basePatternStarts[4],
  'pattern dividers ignore a repeated section and mark the actual section change');
const firstShared = sharedPatternGroups(base.plan, 0, 0);
assert(json(firstShared[0].bars) === json([0, 2]),
  'shared-pattern scope names only matching halves of a repeated section');
const openingShared = sharedPatternGroups(base.plan, 0, 1);
assert(json(openingShared.map((g) => g.bars)) === json([[0, 2], [1, 3]]),
  'a two-bar selection names both shared pattern groups without merging their halves');
assert(sharedPatternDescription(base.plan, 0, 0) === 'Bar 1 pattern changes bars 1, 3',
  'the sequencer can state the exact bars a shared edit will change');
assert(json(playheadCell(31.875)) === json({ bar: 1, step: 15 }),
  'the fractional audible playhead resolves to an integer pattern-grid column');
assert(playheadCell(null) === null,
  'no audible playhead clears the pattern-grid column');
assert(json(playheadWindow(31.875, 8)) === json({ from: 0, to: 1 })
  && json(playheadWindow(32, 8)) === json({ from: 2, to: 3 }),
  'pattern follow pages through aligned two-bar windows');
assert(json(playheadWindow(64, 5)) === json({ from: 4, to: 4 }),
  'an odd final pattern page shows its remaining bar alone');
const initialKitRows = drumRowOrder(['kick', 'hats']);
assert(json(initialKitRows) === json(['kick', 'hats']),
  'the pattern editor shows the percussion the song actually plays, not the canonical eight');
assert(json(drumRowOrder(['bass', 'kick', 'lead', 'hats'])) === json(['kick', 'hats']),
  'and only the percussion — the melodic channels belong to the roll');
assert(json(drumRowOrder(['hats', 'kick'])) === json(['hats', 'kick']),
  'in the order the desk hands them over, so the two track lists read as one list');
const rowsAfterAddingSnare = drumRowOrder(['kick', 'snare', 'hats'], initialKitRows);
assert(json(rowsAfterAddingSnare) === json(['kick', 'hats', 'snare']),
  'a drum that arrives is appended rather than inserted — a row must never move under'
  + ' the pointer painting into the row below it');
const rowsAfterErasing = drumRowOrder(['kick', 'hats'], rowsAfterAddingSnare);
assert(rowsAfterErasing === rowsAfterAddingSnare,
  'and erasing a lane’s last note leaves its row standing, drawn unused — the row must'
  + ' not vanish under the pointer that emptied it');
const rowsAfterExtraSound = drumRowOrder(['kick', 'hats', 'tom2'], rowsAfterAddingSnare);
assert(json(rowsAfterExtraSound) === json(['kick', 'hats', 'snare', 'tom2']),
  'an added percussion sound is appended after the drums the song has, without moving them');
assert(json(drumRowOrder(['kick', 'hats'], rowsAfterExtraSound))
  === json(['kick', 'hats', 'snare']),
  'and an added sound whose channel is gone is the one row that leaves on its own');
// The kits of sounds. A typo'd preset id here is silent — the lane simply keeps the
// voice it had, or falls back to Tom — so it is checked rather than looked at.
const kitPairs = KITS.flatMap(([name, voices]) =>
  Object.entries(voices).map(([lane, id]) => ({ name, lane, id })));
const badLane = kitPairs.filter(({ lane }) => !DRUM_LANES.includes(lane));
const badVoice = kitPairs.filter(({ id }) => !VOICES[id] || !isKitVoice(VOICES[id]));
const engineVoice = kitPairs.filter(({ id }) => VOICES[id]?.kind === 'engine');
assert(KITS.length > 0 && !badLane.length,
  `every kit names drum lanes only${badLane.map((b) => ` (${b.name}: ${b.lane})`).join('')}`);
assert(!badVoice.length,
  `and names a kit voice that exists${badVoice.map((b) => ` (${b.name}: ${b.id})`).join('')}`);
assert(!engineVoice.length,
  'and none of them is an engine preset, so an ADDED drum can play it too — an engine'
  + ' voice is a bundle of bank keys a hand-written lane reads, and a layer has none'
  + `${engineVoice.map((b) => ` (${b.name}: ${b.id})`).join('')}`);

const muted = setLanesOff(base, 4, 5, ['snare', 'clap']);
assert(json(muted.plan[4].off) === json(['clap', 'snare']) && !base.plan[4].off,
  'muting lanes in a range returns a new draft and leaves the old one alone');
assert(!muted.plan[3].off && !muted.plan[6].off, 'and touches no bar outside the range');
assert(!setLanesOff(muted, 4, 5, ['clap'], false).plan[4].off?.includes('clap'),
  'and lets them back in again');
const silent = silenceBars(base, 2, 2);
assert(silent.plan[2].off.length === LANE_KEYS.length, 'silence takes every lane out and keeps the bar');

const cut = deleteBars(base, 0, 1);
assert(barCount(cut) === barCount(base) - 2 && cut.plan[0].sec === base.plan[2].sec,
  'delete is a ripple: the bars come out and everything after moves earlier');
const emptied = deleteBars(base, 0, barCount(base) - 1);
assert(emptied.refused && barCount(emptied) === barCount(base),
  'deleting every bar is refused — plan[n % 0] is silence and a NaN playhead');

const doubled = duplicateBars(base, 0, 1, 1);
assert(barCount(doubled) === barCount(base) + 2
  && doubled.plan[2].sec === base.plan[0].sec && doubled.plan[4].sec === base.plan[2].sec,
  'duplicate puts the copy immediately after the range, not at the end');

const barEdited = gainBars(offsetBars(transposeBars(base, 0, 1, ['bass'], 5), 0, 1, ['bass'], 1), 0, 1, ['bass'], -3);
assert(barEdited.plan[0].transpose.bass === 5 && barEdited.plan[1].offset.bass === 1
  && barEdited.plan[0].gain.bass === -3,
  'transpose, 1/32 timing and gain stay scoped to the selected lane and bars');
const barRoundTrip = expandOrder(planToOrder(barEdited.plan), true);
assert(barRoundTrip[0].transpose.bass === 5 && barRoundTrip[1].offset.bass === 1
  && barRoundTrip[0].gain.bass === -3,
  'bar transpose, timing and gain survive order serialisation');
// Pan is the only bar edit that is an OFFSET rather than a value — the number the pot
// shows, added to wherever the channel is panned — so what is checked here is that the
// number survives the file, and that asking for somewhere past hard left gives back hard
// left rather than a pan of -1.2 for the mixer to make sense of.
const panned = panBars(base, 0, 1, ['bass'], -20);
assert(panned.plan[0].pan.bass === -20 && panned.plan[1].pan.bass === -20
  && panned.plan[2].pan == null,
  'a bar pan offset stays scoped to the selected lane and bars');
assert(expandOrder(planToOrder(panned.plan), true)[0].pan.bass === -20,
  'bar pan survives order serialisation');
assert(panBars(base, 0, 0, ['bass'], -400).plan[0].pan.bass === -100
  && panBars(base, 0, 0, ['bass'], 400).plan[0].pan.bass === 100
  && panBars(base, 0, 0, ['bass'], 12.4).plan[0].pan.bass === 12,
  'bar pan clamps to the pot\'s own range and lands on whole units');
assert(panBars(panned, 0, 1, ['bass'], 0).plan[0].pan == null,
  'a bar pan back at zero leaves nothing behind in the file');

const lowerBounds = gainBars(offsetBars(transposeBars(base, 0, 0, ['bass'], -12), 0, 0, ['bass'], -8), 0, 0, ['bass'], -12);
const upperBounds = gainBars(offsetBars(transposeBars(base, 0, 0, ['bass'], 12), 0, 0, ['bass'], 8), 0, 0, ['bass'], 12);
assert(lowerBounds.plan[0].transpose.bass === -12 && lowerBounds.plan[0].offset.bass === -8
  && lowerBounds.plan[0].gain.bass === -12
  && upperBounds.plan[0].transpose.bass === 12 && upperBounds.plan[0].offset.bass === 8
  && upperBounds.plan[0].gain.bass === 12,
  'the region editor boundaries are valid: ±12 semitones, ±1/4 note in 1/32 steps, and ±12 dB');
const wholeTrackEdit = gainBars(offsetBars(transposeBars(base, 0, barCount(base) - 1, ['bass'], 7),
  0, barCount(base) - 1, ['bass'], -3), 0, barCount(base) - 1, ['bass'], 2.5);
assert(wholeTrackEdit.plan.every((bar) => bar.transpose?.bass === 7
  && bar.offset?.bass === -3 && bar.gain?.bass === 2.5),
  'the same region controls can cover every bar of one track');
const deletedLane = setLanesDeleted(base, 0, 1, ['bass']);
assert(deletedLane.plan[0].delete.includes('bass') && !deletedLane.plan[2].delete,
  'bar deletion is reversible metadata and touches only the requested range');
const restoredLane = setLanesDeleted(deletedLane, 0, 1, ['bass'], false);
assert(!restoredLane.plan[0].delete && !entryOf(plumber, restoredLane),
  'restoring a deleted lane removes the decision when nothing else changed');
const extraLaneDraft = {
  plan: [
    { sec: 0, half: 0, off: ['snare', 'tom2'], transpose: { bass: 5, tom2: 7 } },
    { sec: 0, half: 1, delete: ['tom2'], offset: { tom2: -1 }, gain: { tom2: -3 } },
  ],
  sections: [{ base: 0, kick: [true], tom2: [false, true] }],
};
const withoutExtraLane = removeLanes(extraLaneDraft, ['tom2']);
assert(!withoutExtraLane.sections[0].tom2 && withoutExtraLane.sections[0].kick
  && withoutExtraLane.plan.length === extraLaneDraft.plan.length
  && json(withoutExtraLane.plan[0].off) === json(['snare'])
  && withoutExtraLane.plan[0].transpose.bass === 5
  && withoutExtraLane.plan.every((bar) => !bar.delete?.includes('tom2')
    && bar.transpose?.tom2 == null && bar.offset?.tom2 == null && bar.gain?.tom2 == null),
  'deleting an independent sound removes its notes and bar edits without touching other lanes or song bars');
assert(extraLaneDraft.sections[0].tom2 && extraLaneDraft.plan[0].off.includes('tom2'),
  'removing a lane returns a new arrangement and leaves the prior undo snapshot intact');
// The desk holds the lane and its layers as a Set, and passes that straight in. This
// asserted only against an array until Delete track threw on the Set and left the
// strip on screen with the mix unchanged — the whole of the delete is downstream.
assert(json(removeLanes(extraLaneDraft, new Set(['tom2']))) === json(withoutExtraLane),
  'a lane set removes exactly what the same lanes as an array do');
// Duplicating a track: the notes come across through deskBank, the per-BAR decisions
// have to be copied, because every one of them is keyed by the literal lane name. A
// duplicate that ignored them was a second strip playing through the bars the part it
// copied drops out of — see tests/layers.js for that at the bank.
const carried = copyLaneArrangement(extraLaneDraft, 'tom2', 'tom3');
assert(json(carried.plan[0].off) === json(['snare', 'tom2', 'tom3'])
  && carried.plan[1].delete.includes('tom3')
  && carried.plan[0].transpose.tom3 === 7 && carried.plan[1].offset.tom3 === -1
  && carried.plan[1].gain.tom3 === -3,
  'a duplicated lane inherits the mutes, the deletions and the per-lane bar edits of the one it copies');
assert(carried.plan[0].transpose.bass === 5 && json(carried.sections) === json(extraLaneDraft.sections)
  && carried.plan[0].off.includes('tom2') && carried.plan[1].delete.includes('tom2'),
  'and takes nothing away from the source lane or from any other, notes included');
assert(json(extraLaneDraft.plan[0].off) === json(['snare', 'tom2'])
  && json(copyLaneArrangement(carried, 'tom2', 'tom3')) === json(carried)
  && copyLaneArrangement(extraLaneDraft, 'tom2', 'tom2') === extraLaneDraft,
  'copying returns a new draft, says the same thing twice running, and refuses to copy a lane onto itself');
// The same draft back, by identity, and for the reason removeLanes hands one back: the
// desk writes what this returns, so a new object here would give an unarranged song an
// arrangement entry the first time a track was duplicated on it.
assert(copyLaneArrangement(extraLaneDraft, 'kick', 'kick2') === extraLaneDraft,
  'a lane with no bar decisions of its own copies nothing — a duplicate is not an edit by itself');
const clip = copyBars(plumber, base, 0, 1);
const pasted = pasteBars(plumber, base, 2, clip);
assert(pasted.plan.length === base.plan.length + 2
  && pasted.plan[2].sec === base.plan[0].sec,
  'copy/paste repeats a structural range at the insertion point');
const silentInsert = insertSilence(base, 2, 2, ['bass', 'lead']);
assert(silentInsert.plan[2].delete.includes('bass') && silentInsert.plan[3].delete.includes('lead')
  && silentInsert.plan.length === base.plan.length + 2,
  'insert silence adds the selected number of bars and keeps them silent');
const laneClip = copyLaneBars(plumber, base, 0, 1, 'bass');
assert(laneClip.bars.length === 2 && laneClip.bars[0].length === 16,
  'track-region copy captures one instrument without copying the whole song');

const built = buildUp(base, 0, 1, 4);
assert(barCount(built) === barCount(base) + 6, 'a 4-pass build-up over 2 bars is 8 bars');
const kitIn = (bar) => DRUM_LANES.filter((k) => !(bar.off || []).includes(k)).length;
assert(kitIn(built.plan[0]) < kitIn(built.plan[7]) && kitIn(built.plan[7]) === DRUM_LANES.length,
  'the kit comes in across the passes and is whole by the last one');
assert(kitIn(breakdown(base, 0, 1, 4).plan[0]) === DRUM_LANES.length,
  'a breakdown is the same thing the other way up: full kit first');
// The build-up decides what plays on the lanes it is given, rather than only ever
// taking more away. Building over bars you have just silenced is the normal way to
// use it, and the version that only added to the mute mask made that sixteen bars
// of nothing that still called itself a build-up.
const fromSilence = buildUp(silenceBars(base, 0, 1), 0, 1, 4);
assert(kitIn(fromSilence.plan[fromSilence.plan.length - 1]) === DRUM_LANES.length,
  'a build-up over silenced bars still arrives at the whole kit');
assert(kitIn(fromSilence.plan[0]) >= 1, 'and starts with something in it');
assert((fromSilence.plan[0].off || []).includes('bass'),
  'while lanes it was not asked about stay exactly as they were');

// ---- the trap ----------------------------------------------------------------
//
// plumber's order is [0, 0, 1, 1, 2, 3, 4, 5], so bars 0-3 all play section 0.
// Writing into bar 3 must not touch bars 0-2, and must not write through the shared
// arrays into another lane or another section.

// 999Hz, not 440: plumber's lead opens on A4, which IS 440, and a sentinel that
// collides with the real note proves nothing about which half was written.
const NEW = 999;
const bankBefore = json(plumber);
const written = writeBarNotes(plumber, base, 3, 'lead', new Array(16).fill(NEW));
const editedPatternStarts = patternStarts(written.plan);
assert(editedPatternStarts[3] && editedPatternStarts[4],
  'a one-bar fork is visibly bounded on both sides as its own pattern');
assert(json(plumber) === bankBefore, 'writing notes does not modify the bank in any way');
assert(written.plan[3].sec !== written.plan[2].sec,
  'the edited bar forks: bar 3 gets a section of its own');
assert(written.plan[0].sec === base.plan[0].sec && written.plan[2].sec === base.plan[2].sec,
  'and bars 0-2, which played the same section, are left pointing where they were');
const forkedSection = written.sections[written.plan[3].sec - plumber.sections.length];
assert(forkedSection.base === base.plan[3].sec,
  'the fork is a delta over what the bar already played, not a copy of it');
assert(forkedSection.lead.length === 32 && forkedSection.lead[16] === NEW && forkedSection.lead[31] === NEW,
  'the written bar takes the new notes at its own half of the section');
assert(forkedSection.lead.slice(0, 16).every((v, i) => v === plumber.lead[i]),
  'and the OTHER bar of that section keeps every note it played');

// shop is the worst case: section 0 puts one array on lead, leadHarm, twinkle, bass
// and clap at once, and 61 arrays are shared somewhere in the bank.
const shop = banks.shop;
const shopBefore = json(shop);
const shopDraft = writeBarNotes(shop, draftOf(shop, null), 2, 'lead', new Array(16).fill(220));
assert(json(shop) === shopBefore,
  'the same holds for shop, where one array is on five lanes of one section');
const shopFork = shopDraft.sections[shopDraft.plan[2].sec - shop.sections.length];
assert(shopFork.lead.some((v) => v === 220) && json(shop.sections[0].leadHarm) === json(shop.sections[0].leadHarm),
  'and the lanes that shared the array it was written from are untouched');

// A second write to the same bar reuses its fork rather than stacking another.
const twice = writeBarNotes(plumber, written, 3, 'bass', new Array(16).fill(110));
assert(twice.sections.length === written.sections.length,
  'a second edit to the same bar goes into the fork it already has');
assert(twice.sections[twice.plan[3].sec - plumber.sections.length].lead[16] === NEW,
  'and keeps the first edit');

// ---- compaction --------------------------------------------------------------

const orphaned = deleteBars(written, 3, 3);
const tidied = compactSections(plumber, orphaned);
assert(tidied.sections.length === 0,
  'a layer section nothing points at any more is dropped on the way to the file');
const idle = forkBar(plumber, base, 3);
assert(idle.sections.length === 1 && compactSections(plumber, idle).sections.length === 0,
  'a fork nobody wrote into collapses back to the section it was based on');

// Bars 1 and 3 are both the second half of section 0 — plumber opens `[0, 0, …]` —
// so the same edit to each produces the same delta, and the file should hold one.
const twoWrites = writeBarNotes(plumber, writeBarNotes(plumber, base, 3, 'lead', new Array(16).fill(NEW)),
  1, 'lead', new Array(16).fill(NEW));
const folded = compactSections(plumber, twoWrites);
assert(twoWrites.sections.length === 2 && folded.sections.length === 1,
  'two bars given the same edit become one section in the file');
assert(folded.plan[3].sec === folded.plan[1].sec, 'and both bars point at it');

// ---- an edit that changed nothing leaves nothing ------------------------------
//
// The step grid writes a whole bar on every click, so toggling a hit on and then off
// again hands back exactly the sixteen steps the bar already had. That has to come
// out the far end as NO ENTRY AT ALL. Otherwise every song anyone opens and fiddles
// with keeps an arrangement that does not arrange anything, and the null test starts
// proving it about a file full of noise.
//
// plumber's bar 3 is the second half of section 0, and section 0 says nothing about
// the kick — so the steps it plays are the bank's, which is the case a naive
// "compare against the resolved section" gets wrong.
const kickBar3 = plumber.kick.slice(16, 32);
const noop = writeBarNotes(plumber, base, 3, 'kick', kickBar3);
assert(noop.sections.length === 1, 'writing a bar forks it, even when the steps are unchanged');
assert(json(noop.sections[0].kick) === json(plumber.kick),
  'and the fork holds the whole lane, both halves of it');
assert(entryOf(plumber, noop) === null,
  'but a lane written back exactly as it was is not a decision, and leaves no entry');

// The same for the first half, where the UNTOUCHED half is the one copied verbatim.
const noopFirst = writeBarNotes(plumber, base, 2, 'kick', plumber.kick.slice(0, 16));
assert(entryOf(plumber, noopFirst) === null, 'the same holds writing the first bar of a section');

// On, then off again: two real writes, and still nothing to say at the end of them.
const hitOn = plumber.kick.slice(16, 32).map((v, i) => (i === 5 ? true : v));
const onThenOff = writeBarNotes(plumber, writeBarNotes(plumber, base, 3, 'kick', hitOn),
  3, 'kick', kickBar3);
assert(entryOf(plumber, writeBarNotes(plumber, base, 3, 'kick', hitOn)) !== null,
  'adding a kick to bar 3 is an entry');
assert(entryOf(plumber, onThenOff) === null, 'and taking it out again is not');

// ---- writing the loop rather than the bar --------------------------------------
//
// plumber plays section 0 for bars 0-3, so "the hats are wrong in this loop" has to
// change all four rather than fork one and leave three behind.

const sharedEdit = writeBarNotesShared(plumber, base, 3, 'kick', new Array(16).fill(true));
assert(json(plumber) === bankBefore, 'the shared write does not modify the bank either');
const sharedSecs = new Set(sharedEdit.plan.slice(0, 4).map((b) => b.sec));
assert(sharedSecs.size === 1, 'every bar that played the section is repointed at the fork together');
assert(sharedEdit.plan[0].sec !== base.plan[0].sec, 'and it is a fork, not the bank section');
const sharedFork = sharedEdit.sections[sharedEdit.plan[3].sec - plumber.sections.length];
assert(sharedFork.base === 0 && sharedFork.kick.slice(16).every((v) => v === true),
  'the delta carries the new steps at the edited half');
assert(json(sharedFork.kick.slice(0, 16)) === json(plumber.kick.slice(0, 16)),
  'and the other half of the loop is untouched');
assert(entryOf(plumber, sharedEdit) !== null, 'a shared edit is a decision like any other');

// A bar forked on its own is deliberately independent, and a later shared edit to the
// section it came from must not reach back into it.
const forkedThenShared = writeBarNotesShared(plumber,
  writeBarNotes(plumber, base, 1, 'kick', new Array(16).fill(false)), 3, 'kick', new Array(16).fill(true));
assert(forkedThenShared.plan[1].sec !== forkedThenShared.plan[3].sec,
  'a bar forked on its own is left out of a later shared edit');
const loneFork = forkedThenShared.sections[forkedThenShared.plan[1].sec - plumber.sections.length];
assert(loneFork.kick.slice(16).every((v) => v === false), 'and keeps the edit it was given');

// ---- a delta may only ever be a delta over the BANK -----------------------------
//
// The rule that keeps an edit inside the bars it was made in, and the bug it is here
// about: a fork off a section the desk can still write into inherits every later edit
// to that section. Fork bar 4 out of the loop bars 1-4 are playing, then edit the loop,
// and a note appears in bar 4 — a bar nobody touched, on a lane nobody touched. On an
// imported song, whose parts live only in its sections with no bank part underneath,
// the same chain is how a whole track goes silent: compaction drops a section no BAR
// points at, the base pointing at it is renumbered against a list it is no longer in,
// and the bar comes back inheriting nothing at all.
//
// So a fork off a layer section copies that section's overrides in and bases itself on
// whatever the section ultimately extends. `base:` points into the bank, always.
const sharedLoop = writeBarNotesShared(plumber, base, 0, 'kick', new Array(16).fill(true));
const layerBase = plumber.sections.length;
const bornOfShared = writeBarNotes(plumber, sharedLoop, 3, 'snare', new Array(16).fill(true));
const child = bornOfShared.sections[bornOfShared.plan[3].sec - layerBase];
assert(child.base < layerBase, 'a bar forked off a layer section is a delta over the BANK');
assert(json(child.kick) === json(sharedLoop.sections[0].kick),
  'and carries what it was playing at the moment it forked');
const before3 = readBarLane(plumber, bornOfShared, 3, 'kick');
// Now write the loop those other bars are still playing, in place — the gesture the
// leak rode in on.
const loopAgain = writeBarNotesShared(plumber, bornOfShared, 0, 'kick', new Array(16).fill(false));
assert(json(readBarLane(plumber, loopAgain, 0, 'kick')) === json(new Array(16).fill(false)),
  'a shared edit still reaches every bar that plays the loop');
assert(json(readBarLane(plumber, loopAgain, 3, 'kick')) === json(before3),
  'and never reaches the bar that was forked out of it');

// The invariant itself, over every song with sections: nothing the seam writes may
// leave one layer section based on another.
for (const t of withSections.slice(0, 6)) {
  const d0 = draftOf(t.bank, null);
  const at = t.bank.sections.length;
  let d = writeBarNotesShared(t.bank, d0, 0, 'kick', new Array(16).fill(true));
  d = writeBarNotes(t.bank, d, Math.min(1, barCount(d) - 1), 'kick', new Array(16).fill(false));
  d = writeBarNotes(t.bank, d, 0, 'snare', new Array(16).fill(true));
  const chained = d.sections.filter((s) => s.base != null && s.base >= at);
  assert(chained.length === 0, `${t.id}: no layer section is based on another`);
}

// ---- compaction may not drop a section something still points at -----------------
//
// `used` is what compaction keeps, and it was built from the BARS alone. A section
// reached only through another section's `base` — which is every arrangement saved
// before the rule above existed — was dropped from under it, and `base` was then
// renumbered against a list without it: `base: NaN`, which JSON writes as `null` and
// a reopened song reads as "inherits nothing".
const chainBank = { ...plumber };
const chainEntry = {
  order: [{ s: chainBank.sections.length + 1, bars: 2 }, ...orderOf(plumber).slice(1)],
  sections: [
    { base: 0, kick: new Array(32).fill(true) },
    { base: chainBank.sections.length, snare: new Array(32).fill(true) },
  ],
};
const chainDraft = draftOf(chainBank, chainEntry);
const compactedChain = compactSections(chainBank, chainDraft);
for (const s of compactedChain.sections) {
  assert(s.base == null || (Number.isInteger(s.base) && s.base >= 0
    && s.base < chainBank.sections.length + compactedChain.sections.length),
  'every base compaction writes points at a section that is really there');
}
assert(json(readBarLane(chainBank, compactedChain, 0, 'kick')) === json(new Array(16).fill(true))
  && json(readBarLane(chainBank, compactedChain, 0, 'snare')) === json(new Array(16).fill(true)),
'and the bar goes on playing everything it inherited through the chain');

// Five of the arrangements already saved to the file have a chain in them, so the rule
// cannot be enforced only where new deltas are made: a section with a dependent is not
// ours to write in place either, however it got that way.
const legacy = {
  order: [chainBank.sections.length, { s: chainBank.sections.length + 1, bars: 2 },
    ...orderOf(plumber).slice(2)],
  sections: [
    { base: 0, kick: new Array(32).fill(true) },
    { base: chainBank.sections.length, snare: new Array(32).fill(true) },
  ],
};
const legacyDraft = draftOf(chainBank, legacy);
const childBar = legacyDraft.plan.findIndex((b) => b.sec === chainBank.sections.length + 1);
const parentBar = legacyDraft.plan.findIndex((b) => b.sec === chainBank.sections.length);
const childKick = readBarLane(chainBank, legacyDraft, childBar, 'kick');
for (const [write, what] of [[writeBarNotes, 'a single-bar edit'], [writeBarNotesShared, 'a shared edit']]) {
  const hit = write(chainBank, legacyDraft, parentBar, 'kick', new Array(16).fill(false));
  assert(json(readBarLane(chainBank, hit, parentBar, 'kick')) === json(new Array(16).fill(false)),
    `${what} to a section an old delta is based on lands where it was aimed`);
  assert(json(readBarLane(chainBank, hit, childBar, 'kick')) === json(childKick),
    `${what} to it does not reach through into the bar based on it`);
}

// The same rule on a real song rather than a built one — see "a delta keeps inheriting
// an added track" below for what it is about. An imported .mid is where it bites: every
// voice past the first on a lane is a layer key, so bass2, chords2 and lead3 are all
// added tracks, and there is no bank part underneath them to fall back to.
const imported = tracks.find((t) => (t.bank.sections || [])
  .some((s) => Object.keys(s).some((k) => Array.isArray(s[k]) && !isLenKey(k) && !LANE_KEYS.includes(k))));
if (imported) {
  const parts = [...new Set((imported.bank.sections || [])
    .flatMap((s) => Object.keys(s).filter((k) => Array.isArray(s[k]) && !isLenKey(k))))];
  // Every part the song plays that is not one of the engine's own lanes is an added
  // track, declared in the mix — which is how a .mid with two basses in it arrives. Read
  // off the song rather than written out, so this is the song's real layer set.
  const kitPlus = {
    layers: [
      ...parts.filter((k) => !LANE_KEYS.includes(k))
        .map((key) => ({ key, from: baseLane(key), independent: true })),
      { key: 'tom2', from: 'tom', independent: true },       // and one more from the kit's +
    ],
    lanes: { tom2: {} },
  };
  const impEdit = deskBank(imported.bank, kitPlus);
  const impView = (e) => deskBank(applyArrangement(imported.bank, imported.id,
    { [imported.id]: e || {} }), kitPlus);
  const heard = (e) => {
    const vb = impView(e);
    const d = draftOf(vb, null);
    return parts.map((l) => d.plan.map((_, i) => json(readBarLane(vb, d, i, l))).join('|'));
  };
  const asComposed = heard(null);
  // "On 2 and 4", the whole song, on the track just added from the kit's `+`.
  let laid = draftOf(impEdit, null);
  const backbeat = Array.from({ length: 16 }, (_, i) => i === 4 || i === 12);
  for (let b = 0; b < barCount(laid); b++) {
    laid = writeBarNotes(impEdit, laid, b, 'tom2', backbeat.slice(), new Array(16).fill(null));
  }
  const lost = parts.filter((_, i) => heard(entryOf(impEdit, laid))[i] !== asComposed[i]);
  assert(lost.length === 0,
    `a figure across the whole song leaves every other part of an imported song alone${
      lost.length ? ` — lost ${lost.join(', ')}` : ''}`);
}

// ---- the property, over every song in the game ----------------------------------
//
// One note edited changes ONE note. Not another bar, not another lane, not another
// track — the thing the desk is for. Every song, every lane it plays, forty edits
// deep, because the leaks that got out were all several edits in: the first write
// looks perfect and the damage arrives when a later one lands next to it.
const laneNotes = (bank, draft, b, lane) => json(readBarLane(bank, draft, b, lane));
let collateral = 0;
let collateralSays = '';
for (const t of tracks) {
  const lanes = LANE_KEYS.filter((k) => Array.isArray(t.bank[k])
    || (t.bank.sections || []).some((s) => Array.isArray(s?.[k])));
  if (!lanes.length) continue;
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (const linked of [false, true]) {
    const write = linked ? writeBarNotesShared : writeBarNotes;
    let draft = draftOf(t.bank, null);
    const nbars = barCount(draft);
    const snap = () => {
      const m = new Map();
      for (let b = 0; b < nbars; b++) for (const l of lanes) m.set(`${b}|${l}`, laneNotes(t.bank, draft, b, l));
      return m;
    };
    let before = snap();
    for (let e = 0; e < 40 && !collateral; e++) {
      const b = Math.floor(rnd() * nbars);
      const lane = lanes[Math.floor(rnd() * lanes.length)];
      const step = Math.floor(rnd() * 16);
      const notes = readBarLane(t.bank, draft, b, lane).slice();
      notes[step] = notes[step] ? false : true;
      // Through the file and back, exactly as the desk does on every commit.
      draft = draftOf(t.bank, entryOf(t.bank, write(t.bank, draft, b, lane, notes, null)));
      const after = snap();
      for (const [k, v] of after) {
        if (before.get(k) === v) continue;
        const [bb, l] = k.split('|');
        // The cell that was edited, and — in shared mode only — the same cell in the
        // other bars playing the same part, which is what shared editing IS.
        if (l === lane && (linked || Number(bb) === b)) continue;
        collateral++;
        collateralSays = `${t.id}${linked ? ' [shared]' : ''}: editing ${lane} step ${step + 1}`
          + ` of bar ${b + 1} also changed ${l} in bar ${Number(bb) + 1}`;
        break;
      }
      before = after;
    }
  }
  if (collateral) break;
}
assert(!collateral, `a single note edit changes a single note, in every song${collateral ? ` — ${collateralSays}` : ''}`);

// ---- a delta keeps inheriting an added track -------------------------------------
//
// The bug this pins deleted whole tracks out of a song, and it was not in the seam at
// all: `deskBank` materialises an added track as 32 rests in every block that has not
// got it, so the lane exists everywhere and gets a row and a strip. That is right for
// the bank and for a bank section — both are complete partial banks — and catastrophic
// for a DELTA, which says only what its bar changes and inherits the rest through
// `base`. Rests written into a delta are an override, and `resolveSection` merges the
// delta over its base, so the rests won: every added track fell silent in every bar
// anybody had edited. A figure laid across the whole song forks every bar, which took
// every added track out of the whole song at one click.
//
// Read the way the engine reads it — through `deskBank(applyArrangement(...))` — because
// that is the only place it was ever visible. The seam's own read is innocent.
// A song whose added track really carries a part — which is every song that came in
// from a .mid, where the extra voices ARE layer keys and every note they play lives in
// the bank's sections.
const layerPart = new Array(32).fill(440);
const layerSong = {
  ...plumber,
  sections: (plumber.sections || []).map((s) => ({ ...s, lead2: layerPart.slice() })),
};
const withLayer = { layers: [{ key: 'lead2', from: 'lead', independent: true, label: 'Double' }] };
const layerBank = deskBank(layerSong, withLayer);
// The song plays that added track, bar by bar, as an arrangement would leave it.
const playsLayer = (arrEntry) => {
  const view = deskBank(applyArrangement(layerSong, 'layered', { layered: arrEntry }), withLayer);
  const d = draftOf(layerBank, arrEntry);
  return d.plan.map((bar) => {
    const merged = { ...view, ...(bar.sec != null ? resolveSection(view, bar.sec) || {} : {}) };
    const arr = merged.lead2;
    return Array.isArray(arr)
      ? arr.slice(bar.half * 16, bar.half * 16 + 16).filter((v) => v != null && v !== false).length : 0;
  });
};
const layerBefore = playsLayer(null);
assert(layerBefore.every((n) => n === 16), 'the added track plays in every bar of the song');
// One drum note in one bar — the smallest edit there is.
const oneNote = new Array(16).fill(false);
oneNote[4] = true;
const afterOne = entryOf(layerBank, writeBarNotes(layerBank, draftOf(layerBank, null), 3, 'kick', oneNote));
assert(json(playsLayer(afterOne)) === json(layerBefore),
  'one drum note leaves the added track playing every note it had');
// And the gesture that took the whole song out: a figure in every bar, which forks
// every bar, which used to put a rest-filled override on every one of them.
let figured = draftOf(layerBank, null);
for (let b = 0; b < barCount(figured); b++) {
  figured = writeBarNotes(layerBank, figured, b, 'kick', oneNote, new Array(16).fill(null));
}
assert(json(playsLayer(entryOf(layerBank, figured))) === json(layerBefore),
  'and a figure laid across the whole song leaves it playing too');

// ---- clearing a track ---------------------------------------------------------
//
// The desk's Clear writes empty bars rather than flagging the lane deleted: a flag
// left every note in the file and in the roll, and Reset track undid the clear. This
// is that write, and what it has to survive is the trip out to a saved arrangement
// and back — the lane is only empty if the reopened song is empty too.
const clearedLane = 'bass';
const clearRest = new Array(16).fill(null);
let cleared = base;
for (let bar = 0; bar < base.plan.length; bar++) {
  cleared = writeBarNotesShared(plumber, cleared, bar, clearedLane, clearRest);
}
const clearedNotes = (bank, order) => expandOrder(order, true).reduce((sum, bar) => {
  const arr = (resolveSection(bank, bar.sec) || {})[clearedLane] ?? bank[clearedLane];
  return sum + (Array.isArray(arr) ? arr.slice(bar.half * 16, bar.half * 16 + 16)
    .filter((v) => v !== null && v !== false).length : 0);
}, 0);
const barsWithBass = expandOrder(orderOf(plumber), true)
  .filter((bar) => clearedNotes(plumber, [{ s: bar.sec, bars: 1, from: bar.half }])).length;
assert(clearedNotes(plumber, orderOf(plumber)) > 0
  && barsWithBass === expandOrder(orderOf(plumber), true).length,
'plumber plays bass in every bar, which is what a clear has to remove');
const clearEntry = entryOf(plumber, cleared);
const clearedBank = applyArrangement(plumber, 'cleared', { cleared: clearEntry });
assert(clearedNotes(clearedBank, clearEntry.order) === 0,
  'clearing a track empties every bar of it, through the arrangement a save would write');
assert(json(plumber.bass) === json(resolveTrack('plumber').bank.bass),
  'and the song it was cleared out of still has its own notes');
// One delta per section, not one per bar: a section four bars long is emptied once.
assert(clearEntry.sections.length <= (plumber.sections?.length || 0)
  && clearEntry.sections.length < base.plan.length,
'a shared clear forks each pattern once rather than once per bar');

const entry = entryOf(plumber, written);
assert(entry && entry.order && entry.sections?.length === 1, 'a real edit does produce an entry');
// Bars 0-1 still play section 0 whole, so they stay the number they always were.
// Bars 2-3 no longer match: bar 2 is section 0's first half, bar 3 is the fork's
// second. Two one-bar entries, and nothing else in the song moves.
assert(json(entry.order.slice(0, 3)) === json([0, { s: 0, bars: 1 }, { s: 6, bars: 1, from: 1 }]),
  'and the order stays readable: whole blocks as plain numbers, only the split one spelled out');
assert(json(entry.order.slice(3)) === json(orderOf(plumber).slice(2)),
  'every block after the edit is written back exactly as it was');
assert(arrangementIssues(plumber, entry, LANE_KEYS).length === 0, 'what it writes is playable');

// ---- saving and reopening ----------------------------------------------------
//
// The property that catches a whole class of bug at once: whatever the desk holds,
// writing it to a file and reading it back has to give the same bars. An index that
// means one thing on the way out and another on the way in is silence, or somebody
// else's notes, and it shows up here rather than in a song.

const bars = (bank, draft) => json(compactSections(bank, draft).plan);
function survivesSave(bank, id, draft, what) {
  const saved = entryOf(bank, draft);
  const reopened = draftOf(applyArrangement(bank, id, { [id]: saved || {} }), saved);
  assert(bars(bank, draft) === json(reopened.plan), `saved and reopened: ${what}`);
}

survivesSave(plumber, 'plumber', written, 'a song with a forked bar');
survivesSave(plumber, 'plumber', setLanesOff(base, 4, 5, ['snare', 'clap']), 'a song with muted bars');
survivesSave(plumber, 'plumber', buildUp(base, 0, 1, 4), 'a build-up');
survivesSave(plumber, 'plumber', deleteBars(base, 2, 3), 'a song with bars cut out of it');

// ---- editing a song that ALREADY has an arrangement ----------------------------
//
// The second edit is the one that catches this, and only note editing can reach it:
// `applyArrangement` appends the layer sections onto `bank.sections`, so a draft built
// against the ARRANGED bank counts them twice. `sec` then addresses a list one longer
// than the file will have, the saved order points one past the end, and the bar falls
// back to the bare bank — the first edit's notes silently gone.
//
// So the editing seam is always handed the song's OWN bank. The desk keeps this with
// `editBank()`, deliberately not `viewBank()`.

const ON16 = new Array(16).fill(true);
const firstSave = entryOf(plumber, writeBarNotes(plumber, draftOf(plumber, null), 3, 'kick', ON16));
const secondSave = entryOf(plumber, writeBarNotes(plumber, draftOf(plumber, firstSave), 3, 'snare', ON16));
assert(arrangementIssues(plumber, secondSave, LANE_KEYS).length === 0,
  'a second edit to a song that already has an arrangement is playable');
const reopenedView = applyArrangement(plumber, 'plumber', { plumber: secondSave });
const reopenedBar = draftOf(plumber, secondSave).plan[3];
const reopenedSec = resolveSection(reopenedView, reopenedBar.sec) || {};
assert(reopenedSec.kick?.slice(16).every((v) => v === true)
  && reopenedSec.snare?.slice(16).every((v) => v === true),
  'and the bar plays BOTH edits — saving the second does not lose the first');
assert(secondSave.sections.length === 1,
  'the two edits fold into one delta rather than a chain of them');

// The failure this pins, from the other side: build the draft against the arranged
// bank and the same edit is unplayable. Better caught here than by a bar going quiet.
const arrangedView = applyArrangement(plumber, 'plumber', { plumber: firstSave });
const fromArranged = entryOf(arrangedView,
  writeBarNotes(arrangedView, draftOf(arrangedView, firstSave), 3, 'snare', ON16));
assert(arrangementIssues(plumber, fromArranged, LANE_KEYS).length > 0,
  'while building the draft against the ARRANGED bank double-counts the layer and does not play');

// The seven bare-loop cabinets are the awkward case: their bars point at no section
// at all, so the first note edit has to give the others one to point at.
const neon = banks.neon;
assert(neon && !neon.sections?.length, 'neon is one of the bare two-bar cabinets');
const neonEdit = writeBarNotes(neon, draftOf(neon, null), 1, 'lead', new Array(16).fill(NEW));
const neonEntry = entryOf(neon, neonEdit);
assert(neonEntry.sections.length === 2 && !Object.keys(neonEntry.sections[0]).length,
  'editing one bar of a sectionless song gives the OTHER bars an identity section to point at');
assert(neonEntry.order.length === 2 && neonEntry.order[0].s !== neonEntry.order[1].s,
  'so the two bars are written as two different sections, not both as 0');
survivesSave(neon, 'neon', neonEdit, 'a bare two-bar cabinet with one bar edited');
const neonApplied = applyArrangement(neon, 'neon', { neon: neonEntry });
assert(resolveSection(neonApplied, 0) && !Object.keys(resolveSection(neonApplied, 0)).length,
  'and the untouched bar resolves to a section that changes nothing about the bank');
assert(entryOf(neon, compactSections(neon, draftOf(neon, neonEntry))) !== null
  && entryOf(neon, draftOf(neon, null)) === null,
  'while the same song untouched still writes nothing at all');

// ---- the tempo ---------------------------------------------------------------
//
// The desk's bpm drag used to be audition-only and was lost the moment you left the
// song. It is saved on the arrangement now, for the reason the order is: the song stays
// written at the tempo it was written at, and the arrangement says what it is played
// at. So the assertions worth having are the ones about NOT losing it — through another
// edit, through a save, and back out again — plus the one that says a tempo equal to
// the composed one leaves no trace.

const writtenBpm = plumber.bpm;
assert(typeof writtenBpm === 'number' && writtenBpm > 0, 'plumber is written at a tempo');

const tempoOnly = entryOf(plumber, setTempo(draftOf(plumber, null), writtenBpm + 8));
assert(json(tempoOnly) === json({ bpm: writtenBpm + 8 }),
  'a song whose only change is its tempo writes the tempo alone — no order restating the bank\'s');
assert(applyArrangement(plumber, 'plumber', { plumber: tempoOnly }).bpm === writtenBpm + 8,
  'and the song plays at it');
assert(applyArrangement(plumber, 'plumber', { plumber: tempoOnly }).order === plumber.order,
  'while its order is untouched — a tempo change is not an arrangement rewrite');
assert(bpmOf(plumber, 'plumber', { plumber: tempoOnly }) === writtenBpm + 8
  && bpmOf(plumber, 'plumber', {}) === writtenBpm,
  'bpmOf answers the same question for the callers that only hold one number');

assert(entryOf(plumber, setTempo(draftOf(plumber, null), writtenBpm)) === null,
  'a drag that lands back on the composed tempo is not a decision and leaves no entry');
assert(entryOf(plumber, setTempo(draftOf(plumber, tempoOnly), null)) === null,
  'and clicking the readout to go back clears it out again');

// The trap this is here for: every bar edit builds its result through `copy`, so a
// tempo carried on the draft rather than in `copy` would be dropped by the next mute.
const afterBarEdit = entryOf(plumber,
  setLanesOff(draftOf(plumber, tempoOnly), 2, 3, ['kick'], true));
assert(afterBarEdit.bpm === writtenBpm + 8 && afterBarEdit.order.length,
  'a bar edit made after a tempo change keeps the tempo AND the bars');
const afterNoteEdit = entryOf(plumber,
  writeBarNotes(plumber, draftOf(plumber, afterBarEdit), 3, 'kick', ON16));
assert(afterNoteEdit.bpm === writtenBpm + 8 && afterNoteEdit.sections.length,
  'and so does a note edit, which goes through compaction on the way out');

assert(draftOf(plumber, afterNoteEdit).bpm === writtenBpm + 8,
  'reopening the song reads the tempo back off the entry');
assert(draftOf(plumber, null).bpm === null,
  'while a song nobody retuned has no tempo of its own to state');

assert(arrangementIssues(plumber, { bpm: 104 }, LANE_KEYS).length === 0,
  'a tempo-only entry is playable');
assert(arrangementIssues(plumber, { bpm: 0 }, LANE_KEYS).length > 0
  && arrangementIssues(plumber, { bpm: -120 }, LANE_KEYS).length > 0
  && arrangementIssues(plumber, { bpm: 12000 }, LANE_KEYS).length > 0,
  'a tempo the sequencer cannot divide by is refused rather than played');

survivesSave(plumber, 'plumber', setTempo(draftOf(plumber, null), 104),
  'a song played at a tempo it was not written at');

// ---- swing: the feel a song is played with ------------------------------------
//
// The tempo's twin, and it rides the same rails, so the assertions are the same ones:
// it must survive another edit, a save, and a reopen, and it must leave no trace at all
// when the drag lands back on straight. What it adds over the tempo is a claim about the
// ARITHMETIC — a swing that is a third of a sixteenth at 66.7% and nothing whatsoever at
// 50 — because that number is the whole feature and a plausible-looking wrong one would
// still sound like something.

const swungOnly = entryOf(plumber, setSwing(draftOf(plumber, null), 62));
assert(json(swungOnly) === json({ swing: 62 }),
  'a song whose only change is its swing writes the swing alone');
assert(applyArrangement(plumber, 'plumber', { plumber: swungOnly }).swing === 62,
  'and the song plays with it');
assert(applyArrangement(plumber, 'plumber', { plumber: swungOnly }).order === plumber.order,
  'while its order is untouched — a shuffle is not an arrangement rewrite');
assert(swingOf(plumber, 'plumber', { plumber: swungOnly }) === 62
  && swingOf(plumber, 'plumber', {}) === SWING_STRAIGHT,
  'swingOf answers for the callers that only hold one number — the MIDI export above all');

assert(applyArrangement(plumber, 'plumber', { plumber: {} }) === plumber,
  'an entry that says nothing hands back the very same bank — what makes an empty '
  + 'ARRANGEMENTS provably a no-op, and the premise the null test rests on');

assert(entryOf(plumber, setSwing(draftOf(plumber, null), SWING_STRAIGHT)) === null,
  'a drag that lands back on straight is not a decision and leaves no entry');
assert(entryOf(plumber, setSwing(draftOf(plumber, swungOnly), null)) === null,
  'and clicking the readout to go back to straight clears it out again');

// The same trap the tempo has: `copy` rebuilds a draft from the keys it names, so a
// swing carried on the draft and not in `copy` would be dropped by the next mute.
const swingAfterBarEdit = entryOf(plumber,
  setLanesOff(draftOf(plumber, swungOnly), 2, 3, ['kick'], true));
assert(swingAfterBarEdit.swing === 62 && swingAfterBarEdit.order.length,
  'a bar edit made after a swing change keeps the swing AND the bars');
const swingAfterNoteEdit = entryOf(plumber,
  writeBarNotes(plumber, draftOf(plumber, swingAfterBarEdit), 3, 'kick', ON16));
assert(swingAfterNoteEdit.swing === 62 && swingAfterNoteEdit.sections.length,
  'and so does a note edit, which goes through compaction on the way out');

const bothOnly = entryOf(plumber, setSwing(setTempo(draftOf(plumber, null), 104), 66));
assert(json(bothOnly) === json({ bpm: 104, swing: 66 }),
  'a tempo and a swing together are still one entry and still no order');

assert(draftOf(plumber, swingAfterNoteEdit).swing === 62,
  'reopening the song reads the swing back off the entry');
assert(draftOf(plumber, null).swing === null,
  'while a song nobody swung has no swing of its own to state — null, not 50, so '
  + 'entryOf can tell it apart from one dragged back to straight');

assert(arrangementIssues(plumber, { swing: 62 }, LANE_KEYS).length === 0,
  'a swing-only entry is playable');
assert(arrangementIssues(plumber, { swing: SWING_STRAIGHT }, LANE_KEYS).length === 0
  && arrangementIssues(plumber, { swing: SWING_MAX }, LANE_KEYS).length === 0,
  'and both ends of the range are in it');
assert(arrangementIssues(plumber, { swing: 40 }, LANE_KEYS).length > 0
  && arrangementIssues(plumber, { swing: 90 }, LANE_KEYS).length > 0
  && arrangementIssues(plumber, { swing: 'shuffle' }, LANE_KEYS).length > 0,
  'a swing before the beat or past the dotted shuffle is refused rather than played');

assert(setSwing(draftOf(plumber, null), 20).swing === SWING_STRAIGHT
  && setSwing(draftOf(plumber, null), 200).swing === SWING_MAX,
  'a value restored from a snapshot or typed in arrives somewhere the engine can mean');

// THE ARITHMETIC. `swing` is the on-grid sixteenth's share of its pair, so the odd one
// moves by spb*(pct-50)/50 — a third of a sixteenth at the triplet shuffle, half of one
// at the dotted, and exactly nothing at straight. This is the engine's expression, kept
// here so a change to it has to be a deliberate one.
const swingShift = (pct, spb) => spb * (pct - 50) / 50;
assert(Math.abs(swingShift(200 / 3, 1) - 1 / 3) < 1e-12,
  'at 66.7% the off-beat sixteenth is a third of a sixteenth late — a true 2:1 triplet');
assert(swingShift(SWING_STRAIGHT, 1) === 0 && swingShift(SWING_MAX, 1) === 0.5,
  'straight is exactly zero — not nearly — and the dotted shuffle is half a sixteenth');

survivesSave(plumber, 'plumber', setSwing(draftOf(plumber, null), 62),
  'a song played with a swing it was not written with');

// ---- the file the desk writes ------------------------------------------------
//
// Same risk as mix.js's serialiser, and the same test: it emits readable source
// field by field, so a field nobody thought to emit is silently dropped on save.
// That is exactly how effect chains were lost from mix.js for months.

const tmp = mkdtempSync(join(tmpdir(), 'mash-arr-'));
const arrPath = join(tmp, 'arrangements.js');
const fixture = {
  plumber: {
    // Up to 8, not 9: plumber's own 6 sections plus the 3 layer sections below make
    // nine, and they are addressed 0-8. The validator caught this fixture doing it.
    order: [0, 0, { s: 1, bars: 1, transpose: { bass: 5 }, offset: { bass: 1 }, gain: { bass: -3 } },
      { s: 1, bars: 1, from: 1, off: ['snare', 'clap'], delete: ['bass'] },
      { s: 2, off: ['crash'] }, 3, 4, 5, 6, 7, 8],
    sections: [
      { base: 1, lead: Array.from({ length: 32 }, (_, i) => (i % 4 === 0 ? 440 + i : null)) },
      { base: 0, kick: Array.from({ length: 32 }, (_, i) => i % 8 === 0) },
      { chords: Array.from({ length: 32 }, (_, i) => (i === 0 ? [220, 277, 330] : null)) },
    ],
  },
};
writeFileSync(arrPath, renderArrangementsFile(fixture, null));
const { ARRANGEMENTS: back } = await import(arrPath);

assert(json(back.plumber.order) === json(fixture.plumber.order),
  'round-trip: the order survives — plain numbers, single bars, halves, lane delete and bar edits');
assert(back.plumber.sections.length === 3 && back.plumber.sections[0].base === 1,
  'round-trip: layer sections survive, and keep what they are based on');
assert(json(back.plumber.sections[0].lead) === json(fixture.plumber.sections[0].lead),
  'round-trip: a written lane keeps all 32 steps, rests included');
assert(json(back.plumber.sections[1].kick) === json(fixture.plumber.sections[1].kick),
  'round-trip: a percussion lane keeps its booleans');
assert(json(back.plumber.sections[2].chords) === json(fixture.plumber.sections[2].chords),
  'round-trip: a chord keeps every note of it');
assert(arrangementIssues(banks.plumber, back.plumber, LANE_KEYS).length === 0,
  'and what came back is playable');

// A song with nothing in it leaves no entry, the way mix.js works.
const emptyPath = join(tmp, 'empty.js');
writeFileSync(emptyPath, renderArrangementsFile({ plumber: { order: [], sections: [] }, shop: null }, null));
const { ARRANGEMENTS: none } = await import(emptyPath);
assert(Object.keys(none).length === 0, 'a song carrying no arrangement is left out of the file entirely');

// The file's own code — orderOf, resolveSection, applyArrangement — lives below the
// generated object and has to survive being rewritten, or the first save takes the
// engine's ability to read the file with it.
const realPath = new URL('../src/data/arrangements.js', import.meta.url).pathname;
const rewritten = renderArrangementsFile({}, realPath);
assert(rewritten.includes('export function applyArrangement')
  && rewritten.includes('export function resolveSection')
  && rewritten.includes('export function expandOrder'),
  'rewriting the file keeps the code underneath it');
assert(rewritten.includes('The arrangement layer — written by the mixing desk'),
  'and the documented header above it');
const rewrittenPath = join(tmp, 'rewritten.js');
// The file's header imports the song folder relatively, which does not resolve from
// a temp directory — pointed at the real one so what is imported is otherwise the
// exact text the writer produced.
writeFileSync(rewrittenPath, rewritten.replace(
  "'./songs/index.js'",
  JSON.stringify(new URL('../src/data/songs/index.js', import.meta.url).pathname),
));
const round2 = await import(rewrittenPath);
assert(typeof round2.applyArrangement === 'function' && Object.keys(round2.ARRANGEMENTS).length === 0,
  'and the result is a module that still loads and still works');

// ---- the live hook -----------------------------------------------------------
//
// The desk pushes an arrangement onto a PLAYING song, so this has to change what
// plays without stopping it — and, more importantly, without writing into the song.

const { Audio } = await import('../src/engine/audio.js');
const liveSong = banks.plumber;
const composed = json(liveSong.order);
Audio.bank = liveSong; Audio.sourceBank = liveSong; Audio.step = 40;

// Reload used to build the live bank first and restore `Audio.arrangement` second.
// The grid therefore reopened with the saved pattern while the scheduler still held
// the composed song; touching any step called setArrangement and appeared to wake the
// whole pattern up. The override must take part in the initial bank build.
const reloadKick = [...(resolveSection(liveSong, 0)?.kick ?? liveSong.kick)];
const addedKickAt = reloadKick.findIndex((v) => !v);
reloadKick[addedKickAt] = true;
const reloadSection = liveSong.sections.length;
const reloadArrangement = {
  order: [reloadSection],
  sections: [{ base: 0, kick: reloadKick }],
};
Audio.setBank(liveSong, { lanes: {} }, reloadArrangement);
assert(Audio.arrangement === reloadArrangement && barPlan(Audio.bank).length === 2,
  'setBank loads the desk arrangement into the first scheduled bank after reload');
const reloadedPattern = resolveSection(Audio.bank, barPlan(Audio.bank)[0].sec);
assert(reloadedPattern.kick[addedKickAt] === true
  && (resolveSection(liveSong, 0)?.kick ?? liveSong.kick)[addedKickAt] !== true,
  'the reloaded bank immediately plays the added note without a wake-up edit');
Audio.reapplyBank(liveSong, { lanes: {} }, reloadArrangement);
const refreshedPattern = resolveSection(Audio.bank, barPlan(Audio.bank)[0].sec);
assert(refreshedPattern.kick[addedKickAt] === true,
  'a live preset refresh keeps the reloaded pattern in the scheduled bank');
Audio.bank = liveSong; Audio.sourceBank = liveSong; Audio.step = 40;

Audio.setArrangement({ order: [0, 0, { s: 1, bars: 1, off: ['kick'] }, 2], sections: [] });
assert(barPlan(Audio.bank).length === 7, 'setArrangement: the sequencer is playing the new bar count');
assert(json(barPlan(Audio.bank)[4]) === json({ sec: 1, half: 0, off: ['kick'] }),
  'and the bar that drops a lane drops it');
assert(Audio.step === 40, 'and the transport did not move — you are still in the bar you were listening to');
// The one that matters. With no layers and no voice overrides, applyMix hands the
// sequencer the module's own bank object, so a write into `this.bank.order` would
// edit the SONG — for every later play of it, with nothing on screen saying so.
assert(json(liveSong.order) === composed,
  'setArrangement does not write into the song it is playing');
assert(Audio.bank !== liveSong, 'it plays a copy, which is how that stays true');

Audio.step = 100;
Audio.setArrangement({ order: [0] });
assert(barPlan(Audio.bank).length === 2 && Audio.step === 4,
  'a song cut shorter than the playhead wraps it, rather than playing past the end');

Audio.setArrangement(null);
assert(barPlan(Audio.bank).length === barPlan(liveSong).length,
  'and no arrangement at all is the song as it was composed');

// The audio loop wraps at its selected range, while the tracker draws a position
// from songBeat(). A one-bar loop must never report the end of the surrounding
// two-bar phrase during that wrap.
const savedClock = {
  ctx: Audio.ctx, bpm: Audio.bpm, tempo: Audio.tempo, nextTime: Audio.nextTime,
  step: Audio.step, loopStart: Audio.loopStart, loopEnd: Audio.loopEnd,
  loopHasWrapped: Audio.loopHasWrapped, bank: Audio.bank,
};
const loopSpb = (60 / 120) / 4;
Audio.ctx = { currentTime: 10, outputLatency: 0 };
Audio.bpm = 120; Audio.tempo = 1; Audio.nextTime = 10 + loopSpb * 2;
Audio.bank = liveSong; Audio.step = 0; Audio.setLoop(0, 16);
assert(Math.abs(Audio.songBeat() - 3.5) < 1e-9,
  'a one-bar loop wraps its tracker within that bar, not at the end of bar 2');
// A locator loop can be armed while Play from start is still in the intro. The clock
// must not present the loop's end before the scheduler has reached locator A.
Audio.step = 0; Audio.setLoop(32, 64); Audio.step = 0;
assert(Audio.songBeat() < 0,
  'an armed locator loop leaves the song clock in the intro until locator A is reached');
Audio.loopHasWrapped = true;
assert(Audio.songBeat() > 7.5,
  'after the scheduler wraps, the song clock is normalized inside the locator span');
Audio.ctx = savedClock.ctx; Audio.bpm = savedClock.bpm; Audio.tempo = savedClock.tempo;
Audio.nextTime = savedClock.nextTime; Audio.step = savedClock.step;
Audio.loopStart = savedClock.loopStart; Audio.loopEnd = savedClock.loopEnd;
Audio.loopHasWrapped = savedClock.loopHasWrapped; Audio.bank = savedClock.bank;

// The bug this pins: everything that re-applies a mix — a fader, a mute, a solo, an
// effect, a rebuild — rebuilds the bank from the SONG. An arrangement that lived only
// in `Audio.bank` was thrown away by the next such call, so the grid went on drawing
// bars the sequencer had stopped playing. `Audio.arrangement` is what survives it.
Audio.setArrangement({ order: [0, { s: 1, bars: 1, off: ['kick'] }] });
const afterEdit = barPlan(Audio.bank).length;
const remixed = Audio.applyMix(liveSong, { master: -3, lanes: {} });
assert(barPlan(remixed).length === afterEdit && afterEdit === 3,
  'an arrangement survives the mix being re-applied over it');
assert(json(barPlan(remixed)[2]) === json({ sec: 1, half: 0, off: ['kick'] }),
  'and so does the bar that drops a lane');
Audio.arrangement = null;
assert(barPlan(Audio.applyMix(liveSong, { lanes: {} })).length === barPlan(liveSong).length,
  'while an explicit "no arrangement" means composed, not "look it up in the file"');
Audio.arrangement = undefined;
assert(barPlan(Audio.applyMix(liveSong, { lanes: {} })).length === barPlan(liveSong).length,
  'and no opinion at all falls back to the file');

// ---- the validator -----------------------------------------------------------

assert(arrangementIssues(plumber, { order: [0, 99] }).some((s) => s.includes('99')),
  'an order pointing past the section list is reported');
assert(arrangementIssues(plumber, { order: [{ s: 0, off: ['guitar'] }] }, LANE_KEYS)
  .some((s) => s.includes('guitar')), 'a mute mask naming something that is not a lane is reported');
assert(arrangementIssues(plumber, { order: [] }).length > 0, 'an empty order is reported');

console.log(failed ? '\nARRANGEMENT: FAILED' : '\nARRANGEMENT: PASSED');
process.exit(failed ? 1 : 0);
