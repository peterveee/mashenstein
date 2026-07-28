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
  ARRANGEMENTS, applyArrangement, resolveSection, expandOrder, orderOf, arrangementIssues,
} from '../src/data/arrangements.js';
import {
  draftOf, entryOf, planToOrder, setLanesOff, silenceBars, deleteBars, duplicateBars,
  buildUp, breakdown, forkBar, writeBarNotes, compactSections, barCount, DRUM_LANES,
} from '../tools/lib/arrangement-edit.js';
import {
  LANE_KEYS, songBlocks, songBars, barPlan, activeLanes, laneActivity, laneUsesEcho,
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

// ---- an empty layer is nothing at all ---------------------------------------

assert(Object.keys(ARRANGEMENTS).length === 0 || Object.keys(ARRANGEMENTS).every((id) => banks[id]),
  'every arrangement entry names a real track');
assert(tracks.every((t) => applyArrangement(t.bank, t.id) === t.bank),
  `an unarranged song is handed back the SAME bank object, not a copy (${tracks.length} tracks)`);
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
for (const t of withSections) {
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
  + `(${withSections.length} songs, ${stepsChecked} steps)`);
assert(withSections.every((t) => orderOf(t.bank).every((e) => e < t.bank.sections.length)),
  'no song\'s order points past its own section list, so the engine\'s wrap-around never fires');

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
for (const t of tracks) {
  const bank = t.bank;
  for (const repeat of [1, 2]) {
    if (json(songBlocks(bank, repeat)) === json(legacyBlocks(bank, repeat))) blocksSame++;
  }
  if (json(laneActivity(bank, 1, 4)) === json(legacyActivity(bank, 1, 4))) activitySame++;
  // The one cell size the desk uses for a long song, as well as the default.
  if (json(laneActivity(bank, 1, 1)) === json(legacyActivity(bank, 1, 1))) activitySame++;
  if (songBars(bank, 1).length === legacyBlocks(bank, 1).length * 2) barsSame++;
  if (LANE_KEYS.every((k) => laneUsesEcho(bank, k) === legacyEcho(bank, k))) echoSame++;
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
assert(blocksSame === tracks.length * 2,
  `songBlocks built on bars is identical to what it returned before (${tracks.length} songs, repeat 1 and 2)`);
assert(barsSame === tracks.length, 'and a song is exactly twice as many bars as it was blocks');
assert(activitySame === tracks.length * 2,
  `laneActivity is identical, cell for cell, at 4 cells a bar and at 1 (${tracks.length} songs)`);
assert(echoSame === tracks.length,
  `laneUsesEcho answers the same for every lane of every song (${tracks.length} songs)`);

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
    order: [0, 0, { s: 1, bars: 1 }, { s: 1, bars: 1, from: 1, off: ['snare', 'clap'] },
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
  'round-trip: the order survives — plain numbers, single bars, halves and mute masks');
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
writeFileSync(rewrittenPath, rewritten);
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
