// The song-wide key shift — `arrangement.transpose`, the desk's TRANSPOSE readout.
//
// One number for the whole song, beside its tempo and swing: every pitched part played
// that many semitones up or down, drums untouched, on top of whatever a bar's own
// transpose says. The claims worth pinning are the ones that would fail quietly:
//
//   · it is never spread onto the bars — a save writes `transpose: 3` once and the
//     order it writes is the order it would have written anyway;
//   · it survives the next edit, because `copy` rebuilds drafts from the keys it names;
//   · it ADDS to a bar's transpose, so a song with a key change keeps its key change;
//   · drums do not move.
import {
  applyArrangement, arrangementIssues, songTransposeOf, TRANSPOSE_MAX,
} from '../src/data/arrangements.js';
import {
  draftOf, entryOf, setSongTranspose, setLanesOff, setSwing,
} from '../tools/lib/arrangement-edit.js';
import { renderArrangementsFile } from '../tools/lib/arrangements-source.js';
import { midiBuffer } from '../tools/lib/render-midi-bank.js';
import { resolveTrack } from '../tools/lib/tracks.js';
import { parseMidi } from '../tools/lib/midi-parse.js';
import * as OFFICE from '../src/data/songs/office.js';
import { seq } from '../src/engine/notes.js';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const json = (v) => JSON.stringify(v);

// ---- the number ----------------------------------------------------------------
assert(songTransposeOf({ transpose: 3 }) === 3 && songTransposeOf({ transpose: -5 }) === -5,
  'songTransposeOf reads the shift off a shaped bank');
assert(songTransposeOf({}) === 0 && songTransposeOf(null) === 0,
  'and a song that names none is in the key it is written in');
assert(songTransposeOf({ transpose: 2.5 }) === 0 && songTransposeOf({ transpose: TRANSPOSE_MAX + 1 }) === 0,
  'a half semitone or an out-of-range shift is not played rather than played wrong');
assert(arrangementIssues({ bpm: 120 }, { transpose: 2.5 }).some((s) => /transpose/.test(s))
  && arrangementIssues({ bpm: 120 }, { transpose: 30 }).some((s) => /transpose/.test(s)),
  'and the desk is told why');
assert(!arrangementIssues({ bpm: 120 }, { transpose: -12 }).some((s) => /transpose/.test(s)),
  'a whole octave down is fine');

// ---- the draft and the entry ---------------------------------------------------
const office = OFFICE.bank;
const base = draftOf(office, OFFICE.arrangement);
const up3 = entryOf(office, setSongTranspose(base, 3));
const plain = entryOf(office, base);
assert(up3.transpose === 3, 'setSongTranspose writes the number onto the entry');
assert(json(up3.order) === json(plain?.order),
  'and ONLY the number: the order it saves is the order it would have saved without it');
assert(Array.isArray(up3.order) && up3.order.length > 8 && !json(up3.order).includes('"transpose":3')
  // The theme's own per-bar lane transposes survive untouched. Read off the song rather than
  // pinned: the theme changes (CORP FUNKHY 4 replaced it on 25 Oct 2026, with a chords6 +12).
  && up3.order.every((e, i) => json(e.transpose ?? null) === json(plain.order[i]?.transpose ?? null))
  && up3.order.some((e) => e.transpose && typeof e.transpose === 'object'),
  `no bar picks up a +3 of its own, and the bars that had a transpose keep exactly that (${up3.order.length} entries)`);
assert(entryOf(office, setSongTranspose(draftOf(office, up3), 0))?.transpose === undefined,
  'clicking it back to 0 takes the key out of the entry again');
assert(setSongTranspose(base, 40).transpose === TRANSPOSE_MAX
  && setSongTranspose(base, -40).transpose === -TRANSPOSE_MAX,
  'a drag past the end stops at an octave either way');

const plumber = resolveTrack('plumber').bank;
const bare = { bpm: 120, lead: seq('C4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .') };
const onlyKey = entryOf(bare, setSongTranspose(draftOf(bare, null), -2));
assert(json(onlyKey) === json({ transpose: -2 }),
  'a song whose only change is its key writes the key alone');
assert(applyArrangement(bare, 'x', { x: onlyKey }).transpose === -2,
  'and applyArrangement hands it to the engine on the bank');
assert(applyArrangement(bare, 'x', { x: onlyKey }).order === bare.order,
  'without touching the order');

const afterEdit = entryOf(plumber,
  setLanesOff(draftOf(plumber, entryOf(plumber, setSongTranspose(draftOf(plumber, null), 4))), 2, 3, ['kick'], true));
assert(afterEdit.transpose === 4, 'a bar edit made after a key change keeps the key');
const afterSwing = entryOf(plumber, setSwing(draftOf(plumber, { transpose: 4 }), 60));
assert(afterSwing.transpose === 4 && afterSwing.swing === 60, 'and so does a swing change');

// ---- the file ------------------------------------------------------------------
{
  const dir = mkdtempSync(join(tmpdir(), 'mash-transpose-'));
  const path = join(dir, 'arrangements.js');
  writeFileSync(path, '// head\n// ---- THE DESK WRITES BELOW HERE\n');
  const src = renderArrangementsFile({ x: { transpose: 3 } }, path) ?? readFileSync(path, 'utf8');
  assert(/transpose: 3,/.test(String(src)), 'the arrangements file writes a key-only entry');
}

// ---- what it does to the notes -------------------------------------------------
// The MIDI export walks bars the way the sequencer does (barBank in render-midi-bank),
// so it is where "adds to the bar, leaves the drums" can be checked without a browser.
const notesOf = (res, name) => {
  const t = parseMidi(Buffer.from(res.buffer)).tracks.find((tr) => tr.name === name);
  return (t?.events || []).filter((e) => e.type === 144 && e.b > 0).map((e) => e.a);
};
{
  const kb = {
    bpm: 120,
    lead: seq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
    kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    order: [{ s: null, bars: 1 }, { s: null, bars: 1, from: 1, transpose: { lead: 2 } }],
  };
  const plainMidi = midiBuffer(kb, { title: 't' });
  const shifted = midiBuffer({ ...kb, transpose: 3 }, { title: 't' });
  const leadPlain = notesOf(plainMidi, 'Lead');
  const leadShift = notesOf(shifted, 'Lead');
  assert(json(leadPlain) === json([60, 62]), `the bar's own +2 is there to start with (${leadPlain})`);
  assert(json(leadShift) === json([63, 65]),
    `every lead note three up, the bar's own +2 kept on top (${leadShift})`);
  const kicks = (r) => parseMidi(Buffer.from(r.buffer)).tracks.find((tr) => /kick/i.test(tr.name))
    ?.events.filter((e) => e.type === 144 && e.ch === 9 && e.b > 0).map((e) => e.a);
  assert(json(kicks(plainMidi)) === json(kicks(shifted)) && kicks(shifted)?.length === 2,
    'and the kick has not moved');
}

if (failed) { console.error('\nSONG TRANSPOSE: FAILED'); process.exit(1); }
console.log('\nSONG TRANSPOSE: PASSED');
