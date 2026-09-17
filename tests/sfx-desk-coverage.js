// EVERY CUE THE ENGINE CAN PLAY IS ON THE DESK, AND HAS A BIRTHDAY.
//
// The SFX desk (tools/sfx-desk.js, `npm run sfx`) is the only place a cue can
// be heard beside the others and levelled against them, and its rows are typed
// by hand. That is fine — the descriptions are worth writing — but it means a
// cue added to audio.js is a cue nobody can hear on the desk, and for a long
// time seventeen of them were exactly that: every menu step, every fanfare, the
// title sign's buzz, the firework shells, and the deck the frost block lays.
// None of them are in the lane, so none of them were ever missed.
//
// And the record of WHEN each one arrived (src/data/sfx-birthdays.js, generated
// from git by tools/sfx-birthdays.js) only stays complete if something fails
// when it is not. That is this.
import { readFileSync } from 'node:fs';
import { installDom } from './dom-stub.js';
installDom();

const { SFX_BIRTHDAYS } = await import('../src/data/sfx-birthdays.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// The cues the engine can actually play: every case label in the sfx switch.
const audio = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
const start = audio.indexOf('switch (name)');
const body = audio.slice(start, audio.indexOf('\n  }', start));
const cues = [...new Set([...body.matchAll(/case '([A-Za-z0-9_]+)':/g)].map((m) => m[1]))].sort();
assert(cues.length > 40, `the sfx switch parses (${cues.length} cues)`);

// The desk's rows. Read as SOURCE rather than imported: the entry module pulls
// in the whole engine and a DOM, and what is being checked is the list itself.
const desk = readFileSync(new URL('../tools/sfx-desk-entry.js', import.meta.url), 'utf8');
const listed = new Set([...desk.matchAll(/cue: '([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
// The weapon groups are built from the engine's own per-hero tables rather than
// typed, so their two cue names never appear as literals.
for (const built of ['launch', 'contact']) listed.add(built);

const offDesk = cues.filter((c) => !listed.has(c));
assert(offDesk.length === 0,
  `every engine cue has a desk row${offDesk.length ? ` — missing: ${offDesk.join(' ')}` : ` (${cues.length})`}`);

const undated = cues.filter((c) => !(c in SFX_BIRTHDAYS));
assert(undated.length === 0,
  `every engine cue is in the birthday record${undated.length
    ? ` — run node tools/sfx-birthdays.js for: ${undated.join(' ')}` : ` (${cues.length})`}`);

// A date, once written, is the day the cue arrived — so it may be null while a
// cue is still uncommitted, but never a malformed string.
const bad = Object.entries(SFX_BIRTHDAYS)
  .filter(([, d]) => d != null && !/^\d{4}-\d{2}-\d{2}$/.test(d));
assert(bad.length === 0, `every recorded date is a plain YYYY-MM-DD${bad.length ? ` — ${bad.map(([c]) => c).join(' ')}` : ''}`);

// And nothing in the record that the engine no longer plays: a cue deleted from
// audio.js leaves a date behind pointing at a sound that does not exist.
const ghosts = Object.keys(SFX_BIRTHDAYS).filter((c) => !cues.includes(c));
assert(ghosts.length === 0, `no dates left behind for retired cues${ghosts.length ? ` — ${ghosts.join(' ')}` : ''}`);

process.exit(failed ? 1 : 0);
