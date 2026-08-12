// Where the tracks sit on the desk, once somebody has dragged one.
//
// Order used to be entirely derived — `DESK_ORDER` in src/engine/lanes.js, then
// whatever LANES says — which is a good order for the game's own songs and no order at
// all for an imported one, where every part is a layer. So the desk can now write an
// `order` onto the mix, beside `layers` and `off`, and this pins the three things that
// makes true and the two it must not break:
//
//   1. A song with no `order` is ordered EXACTLY as it was before the key existed —
//      including handing the bank back untouched, which tests/null-test.js rests on.
//   2. An order is read as decisions about the keys it names and nothing about the keys
//      it does not: it is written by a drag on a desk that may since have gained a
//      layer or lost a track, and a lane it never saw must land beside the lane it
//      belongs beside rather than in a pile at the bottom.
//   3. It never changes the lane SET. Order is a view decision that happens to be
//      worth saving; it may not make a track appear or disappear.
//
// Plus the round trip, because an order that does not reach the file is a drag you do
// again every morning.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deskBank, deskLanes, activeLanes } from '../src/engine/lanes.js';
import { mixEntrySource } from '../tools/lib/mix-source.js';
import { mixSignature, mixChanged } from '../tools/lib/mix-signature.js';
import { resolveTrack } from '../src/data/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const bank = resolveTrack('plumber').bank;
const keys = (b) => deskLanes(b, 1).map((l) => l.key);
const view = (entry) => keys(deskBank(bank, entry));

// The order this song has had all along. Everything below is measured against it.
const DEFAULT = keys(bank);
assert(DEFAULT.join(' ') === 'kick snare clap hats ohats bass lead leadHarm chords keyGliss shout',
  'the engine’s own order is unchanged: kit, bass, then the melodic lanes');

// ---- a song nobody has dragged ---------------------------------------------
assert(deskBank(bank, null) === bank, 'no mix at all still hands the bank straight back');
assert(deskBank(bank, {}) === bank, 'a mix with no order still hands the bank back');
assert(deskBank(bank, { order: [] }) === bank,
  'an empty order is the same as none — no key, no copy, no change');
assert(view({ order: [] }).join(' ') === DEFAULT.join(' '),
  'and the desk reads exactly the order it always did');

// ---- a drag ----------------------------------------------------------------
const moved = view({ order: ['bass', 'kick', 'snare', 'clap', 'hats', 'ohats', 'lead', 'leadHarm', 'chords', 'keyGliss', 'shout'] });
assert(moved.join(' ') === 'bass kick snare clap hats ohats lead leadHarm chords keyGliss shout',
  'a stored order puts the bass at the top, where DESK_ORDER never would');
assert(deskBank(bank, { order: DEFAULT }) !== bank,
  'an order-only mix does reshape the bank — it has something to carry');
assert(view({ order: DEFAULT }).join(' ') === DEFAULT.join(' '),
  'and an order that says what the default said changes nothing about the result');

// The bank an order-only mix hands back is the same content under a new name: the lane
// arrays and `sections` are the very same objects, so nothing is copied to reorder a desk.
const shallow = deskBank(bank, { order: ['bass'] });
assert(shallow.bass === bank.bass && shallow.sections === bank.sections,
  'an order shares every lane array and the section list by reference');

// ---- an order is never the whole truth --------------------------------------
// It was written on a desk that has since changed, and it is read against today's song.
// A drag always writes the WHOLE order, so a partial one only ever arrives stale or
// hand-typed — and the rule for both is the same: a name says where it sits relative to
// the other NAMES, and nothing about anything else. Everything unnamed rebuilds around
// them in default order, which is what makes a stale list safe to carry forward instead
// of throwing away the one decision it still records.
assert(view({ order: ['bass', 'crash', 'tom'] }).join(' ') === DEFAULT.join(' '),
  'keys this song does not have are ignored rather than leaving holes in the desk');
assert(view({ order: ['shout'] }).join(' ') === DEFAULT.join(' '),
  'one surviving name is no order at all — it has nothing to sit before or after');
assert(view({ order: ['lead'] }).join(' ') === DEFAULT.join(' '),
  'and that holds wherever in the desk the one name happens to be');

// Two names is an order, and the smallest one there is.
assert(view({ order: ['shout', 'kick'] }).join(' ')
  === 'shout kick snare clap hats ohats bass lead leadHarm chords keyGliss',
  'two names pin their own sequence: shout before kick drags the vox to the top');
assert(view({ order: ['shout', 'bass'] }).join(' ')
  === 'kick snare clap hats ohats shout bass lead leadHarm chords keyGliss',
  'and the unnamed lanes rebuild around that pair rather than being pushed past it');

// ---- a layer the drag never saw ---------------------------------------------
// The case this rule exists for: reorder a song, then duplicate a track. The copy is
// not in the stored order, and appending it would put it at the bottom of the desk
// instead of under the part it doubles.
const late = view({
  layers: [{ key: 'bass2', from: 'bass' }],
  order: ['lead', 'kick', 'snare', 'clap', 'hats', 'ohats', 'bass', 'leadHarm', 'chords', 'keyGliss', 'shout'],
});
assert(late.join(' ') === 'lead kick snare clap hats ohats bass bass2 leadHarm chords keyGliss shout',
  'a layer made after the drag lands under its source, not at the end of the desk');

// And the same rule from the other side: a track dragged to the top takes nothing with
// it that the order does not name, but a layer named right after it still follows.
const withLayer = {
  layers: [{ key: 'bass2', from: 'bass' }],
  order: ['bass', 'bass2', 'kick', 'snare', 'clap', 'hats', 'ohats', 'lead', 'leadHarm', 'chords', 'keyGliss', 'shout'],
};
assert(view(withLayer).join(' ')
  === 'bass bass2 kick snare clap hats ohats lead leadHarm chords keyGliss shout',
  'a track and its layer move together when the order says so');

// ---- order is not shape ------------------------------------------------------
const setOf = (b) => activeLanes(b, 1).map((l) => l.key).sort().join(' ');
assert(setOf(deskBank(bank, { order: ['shout', 'bass'] })) === setOf(bank),
  'no order changes which lanes the song has');
assert(view({ order: ['bass'], off: ['crash'] }).length === DEFAULT.length,
  'and deleting a lane the song never had leaves the desk the length it was');

// ---- the file ---------------------------------------------------------------
const dir = mkdtempSync(join(tmpdir(), 'track-order-'));
const renderMixFile = (mix) => `export const MIX = {\n${Object.entries(mix)
  .map(([id, e]) => [id, mixEntrySource(e, '  ')]).filter(([, x]) => x)
  .map(([id, x]) => `  ${JSON.stringify(id)}: ${x},\n`).join('')}};\n`;
const roundTrip = async (entry, name) => {
  const p = join(dir, `${name}.js`);
  writeFileSync(p, renderMixFile({ plumber: entry }));
  return (await import(p)).MIX.plumber;
};

const ORDER = ['bass', 'kick', 'snare', 'clap', 'hats', 'ohats', 'lead', 'leadHarm', 'chords', 'keyGliss', 'shout'];
const rt = await roundTrip({ order: ORDER }, 'order-only');
assert(rt && JSON.stringify(rt.order) === JSON.stringify(ORDER),
  'round-trip: a dragged order survives Save, exactly as dragged');
assert(view(rt).join(' ') === ORDER.join(' '),
  'round-trip: and reading the file back gives the desk that was saved');

assert(mixEntrySource({ order: [] }) === null,
  'a song whose only "decision" is an empty order writes nothing at all');
assert(mixEntrySource({}) === null, 'and neither does an empty mix, as before');

// The desk asks "has this changed away from the file?" constantly. A drag has to be a
// yes, or the Save button stays disabled over an edit that only exists in localStorage.
assert(mixSignature({ order: ORDER })?.order?.length === ORDER.length,
  'the signature carries the order — a dragged strip is a decision to save');
assert(mixSignature({ order: [] }) === null,
  'an empty order is not a decision, so a song holding one is still an unsaved-nothing');
assert(mixChanged({ order: ORDER }, {}), 'so moving a track marks the song dirty');
assert(!mixChanged({ order: ORDER }, { order: ORDER }), 'and putting it back does not');

console.log(failed ? '\nTRACK ORDER: FAILED' : '\nTRACK ORDER: PASSED');
process.exit(failed ? 1 : 0);
