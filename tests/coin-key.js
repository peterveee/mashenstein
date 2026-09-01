// The coin cue, in the key of the song.
//
// A coin is two square pings a fourth apart, and the combo ladder used to walk
// them up in SEMITONES: eight coins in a row through E minor sounded four notes
// the song plays and four it does not, and the four it does not are the ones the
// ear picks out. The loop-ring climb had already conceded the point from the
// other side — it deliberately tops out BELOW the coins so the two do not
// collide (see loopClimbNotes) — which only works while the coins are the thing
// you cannot tune. Now they are tuned, so what has to be true is:
//
//   - every note the cue can produce is a note the song itself plays
//   - a run of coins still RISES, rather than flattening onto one rung
//   - the fourth survives snapping: it is still a leap, not a step
//   - and with no song loaded, the cue is bit-for-bit what it always was
//
// Driven through the live engine — Audio.coinNotes, the same call the cue makes
// — rather than through a copy of the arithmetic here, because the claim is
// about the game's notes and not about a formula in this file.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Audio } from '../src/engine/audio.js';
import { barPlan } from '../src/engine/lanes.js';
import { resolveSection } from '../src/data/arrangements.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const pitchClass = (f) => ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
const MELODIC = ['bass', 'lead', 'chords', 'arp', 'pad', 'lead2', 'lead3', 'bass2'];
// The two callers that reach furthest: the pickup's combo ladder, capped at 12
// (run.js), and the flip tally's ten-coin payout at 1 + 0.05n. Plus the menus'
// random spread, which is the only caller that goes BELOW 1.
const COMBO_PITCHES = Array.from({ length: 13 }, (_, i) => Math.pow(1.06, i));
const FLIP_PITCHES = Array.from({ length: 10 }, (_, i) => 1 + 0.05 * i);
const MENU_PITCHES = [0.9, 1.05, 1.25];
const ALL_PITCHES = [...COMBO_PITCHES, ...FLIP_PITCHES, ...MENU_PITCHES];

function songClasses(b) {
  const set = new Set();
  for (const lane of MELODIC) {
    const seq = b[lane];
    if (!Array.isArray(seq)) continue;
    for (const v of seq) {
      if (Array.isArray(v)) { for (const n of v) if (n > 0) set.add(pitchClass(n)); }
      else if (typeof v === 'number' && v > 0) set.add(pitchClass(v));
    }
  }
  return set;
}

// ---- with the music off, nothing changed ------------------------------------
{
  Audio.bank = null;
  const [lo, hi] = Audio.coinNotes(1);
  assert(lo === 988 && hi === 1319, 'no song: the cue is the pair it always was');
  const [lo2, hi2] = Audio.coinNotes(1.5);
  assert(lo2 === 988 * 1.5 && hi2 === 1319 * 1.5, 'and `pitch` still scales it raw');
}

// ---- across the whole song library ------------------------------------------
// Section by section through the engine's own bar plan, which is the only way to
// be sure the cue follows a modulation rather than pinning the first section's
// key — Audio.songKey memoises per section, and reading it off `step` is what
// the cue does at the moment a coin is grabbed.
const songDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'songs');
let sections = 0, strays = 0, flat = 0, squashed = 0, keyless = 0;
let worstFlat = null, worstStray = null;
for (const file of readdirSync(songDir).filter((f) => f.endsWith('.js'))) {
  let mod;
  try { mod = await import(join(songDir, file)); } catch { continue; }
  const bank = mod.bank;
  if (!bank || !Array.isArray(bank.bass)) continue;
  Audio.bank = bank;
  const plan = barPlan(bank) || [];
  const seen = new Set();
  for (let bar = 0; bar < plan.length; bar++) {
    const secIdx = bank.sections?.length && plan[bar]?.sec != null
      ? plan[bar].sec % bank.sections.length : -1;
    if (seen.has(secIdx)) continue;
    seen.add(secIdx);
    Audio.step = bar * 16;
    // A section with no melodic lane has no key to be in; the cue falls back to
    // the pair it always was, which the first block above already pins.
    if (!Audio.songKey()) { keyless++; continue; }
    let b = bank;
    if (secIdx >= 0) {
      const sec = resolveSection(bank, secIdx);
      if (sec) b = { ...bank, ...sec };
    }
    const inSong = songClasses(b);
    if (!inSong.size) { keyless++; continue; }
    sections++;
    for (const p of ALL_PITCHES) {
      const [lo, hi] = Audio.coinNotes(p);
      for (const [which, f] of [['lo', lo], ['hi', hi]]) {
        if (inSong.has(pitchClass(f))) continue;
        strays++;
        if (!worstStray) worstStray = `${mod.id || file} sec ${secIdx}: ${which} ${Math.round(f)}Hz`;
      }
      if (hi < lo * 1.15) squashed++;
    }
    // The combo run is the ramp that matters: thirteen rungs of 1.06 span an
    // octave unsnapped, and a ladder that could not follow it would flatten the
    // run onto one note — in key, and useless. Half an octave is the floor
    // because the snapping is to the SONG's rungs, and a five-note scale has
    // fewer of them than the chromatic ramp asks for.
    const run = COMBO_PITCHES.map((p) => Audio.coinNotes(p)[0]);
    const rises = run.filter((f, i) => i > 0 && f > run[i - 1]).length;
    const span = run[run.length - 1] / run[0];
    if (span < 1.5 || rises < 4) {
      flat++;
      if (!worstFlat) {
        worstFlat = `${mod.id || file} sec ${secIdx}: ${span.toFixed(2)}x over ${rises} steps`;
      }
    }
  }
}

assert(sections > 100, `checked the whole song library (${sections} sections, ${keyless} with no melodic lane)`);
assert(strays === 0, `every note a coin can play is a note the song plays (${strays} strays${worstStray ? `, e.g. ${worstStray}` : ''})`);
assert(flat === 0, `and a run of coins still climbs in every key${worstFlat ? ` (${worstFlat})` : ''}`);
assert(squashed === 0, `and the fourth is still a leap, never a step (${squashed} squashed)`);

// ---- the modulation the rhythm cabinet needs --------------------------------
// SPEED ZONE walks its lap through three keys. A cue pinned to the first would
// be wrong for two thirds of the track, so the coin has to MOVE with it.
{
  const bank = (await import('../src/data/songs/speed.js')).bank;
  Audio.bank = bank;
  const heard = new Set();
  for (let bar = 0; bar < (barPlan(bank) || []).length; bar++) {
    Audio.step = bar * 16;
    heard.add(Math.round(Audio.coinNotes(1)[0]));
  }
  assert(heard.size > 1, `the coin moves with the song's modulation (${heard.size} notes over the track)`);
}

Audio.bank = null;
if (failed) process.exit(1);
console.log('\ncoin-key: all checks passed');
