// A song's own way in and repeat: `arrangement.loop = { startBar, fromBar, toBar }`.
//
// Playback begins at `startBar`, runs to `toBar`, and then repeats `fromBar`–`toBar`
// for ever — so the bars between the start and the loop are heard exactly once. That
// one-time stretch is the whole reason the field exists: a cabinet screen can arrive on
// a flourish without hearing it again every thirty seconds.
//
// Three claims are worth pinning, and they are pinned at three different levels:
//
//   the ARITHMETIC — bars in, steps out, clamped to a song that may have been
//     shortened under the loop since it was written
//   the ROUND TRIP — the markers survive a bar edit, which they do not by default:
//     `entryOf` rebuilds the arrangement from scratch and drops what it does not know
//     about, so a note edit would silently delete them
//   the SEQUENCER — the intro is scheduled once and the loop for ever, which needs the
//     real engine and so runs in a browser at the end
//
// The second is the one that would go missing for weeks: nothing about a bar edit looks
// like it should touch a loop, and the failure is a field quietly emptying itself.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loopSteps, arrangementIssues } from '../src/data/arrangements.js';
import {
  draftOf, entryOf, setSongLoop, deleteBars, insertSilence, duplicateBars, setTempo,
} from '../tools/lib/arrangement-edit.js';
import { bankSource } from '../tools/lib/song-source.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A twelve-bar song: six two-bar sections, played in order. Long enough to hold a start
// bar, an intro and a loop that is none of the above.
const rest = () => new Array(32).fill(null);
const BANK = {
  bpm: 120,
  bass: rest(),
  bassLen: rest(),
  sections: [{}, {}, {}, {}, {}, {}],
  order: [0, 1, 2, 3, 4, 5],
};

// ---- the arithmetic ---------------------------------------------------------------

assert(eq(loopSteps({ startBar: 5, fromBar: 8, toBar: 12 }, 12),
  { start: 64, loop: { start: 112, end: 192 } }),
'start at bar 5 and loop bars 8-12 is step 64, looping 112-192');

assert(eq(loopSteps({ fromBar: 1, toBar: 4 }, 12), { start: 0, loop: { start: 0, end: 64 } }),
  'no start bar means the top of the song');

assert(eq(loopSteps({ startBar: 3 }, 8), { start: 32, loop: null }),
  'a start bar with no region is a way in and no repeat — the whole form from there');

assert(loopSteps(null, 12) === null && loopSteps({ fromBar: 1, toBar: 2 }, 0) === null,
  'no markers, or no song to measure them against, is no loop at all');

// Bars deleted from under a loop that used to fit. The engine cannot ask what was meant,
// and must not hand the region back to the sequencer's modulo, which would play the
// whole form with nothing to show for it.
assert(eq(loopSteps({ startBar: 5, fromBar: 8, toBar: 99 }, 12),
  { start: 64, loop: { start: 112, end: 192 } }),
'a loop ending past the end of the song is clamped to the last bar it has');

assert(eq(loopSteps({ startBar: 20, fromBar: 24, toBar: 28 }, 8),
  { start: 112, loop: { start: 112, end: 128 } }),
'a loop entirely past the end collapses onto the last bar the song has');

// Not repaired into something reachable — that would be guessing which of the two
// numbers was meant. The song plays its form from the start bar, and the desk refuses
// to save it in the first place.
assert(eq(loopSteps({ startBar: 9, fromBar: 2, toBar: 4 }, 12), { start: 128, loop: null }),
  'a loop the start bar has already passed is dropped rather than jumped backwards into');

// ---- what the desk refuses to save ------------------------------------------------

const issues = (loop) => arrangementIssues(BANK, { order: BANK.order, loop });
assert(issues({ startBar: 5, fromBar: 8, toBar: 12 }).length === 0,
  'a loop inside the song is playable and says nothing');
assert(issues({ startBar: 0, fromBar: 2, toBar: 4 })[0]?.includes('counted from 1'),
  'bar 0 is refused — the desk counts bars from 1 and so does the file');
assert(issues({ startBar: 9, fromBar: 2, toBar: 4 })[0]?.includes('never reaches'),
  'a loop before the start bar is refused, because the song never reaches it');
assert(issues({ fromBar: 8, toBar: 4 })[0]?.includes('no bars at all'),
  'a backwards loop is refused');
assert(issues({ fromBar: 8, toBar: 40 })[0]?.includes('12 bars long'),
  'a loop past the end is refused, and the message says how long the song actually is');
assert(issues({ fromBar: 4 })[0]?.includes('one end of itself'),
  'half a loop is refused rather than guessed at');
assert(issues({ startBar: 5 }).length === 0,
  'a start bar on its own is a complete thought');

// ---- the round trip ---------------------------------------------------------------
//
// `draftOf` → edit → `entryOf` is the path EVERY bar edit takes. Both ends rebuild the
// arrangement from the keys they know, so anything they do not carry is not ignored —
// it is deleted by the next thing anybody does to a bar.

const LOOP = { startBar: 5, fromBar: 8, toBar: 12 };
{
  const back = entryOf(BANK, draftOf(BANK, { order: BANK.order, loop: LOOP }));
  assert(eq(back.loop, LOOP), 'a loop survives a draft round trip with no edit at all');
}
{
  // A tempo change: an edit that does not touch a single bar, and the one most likely
  // to be made while a loop is set.
  const edited = setTempo(draftOf(BANK, { order: BANK.order, loop: LOOP }), 96);
  const back = entryOf(BANK, edited);
  assert(eq(back.loop, LOOP) && back.bpm === 96, 'and a tempo change beside it');
}
{
  const edited = deleteBars(draftOf(BANK, { order: BANK.order, loop: LOOP }), 0, 0);
  const back = entryOf(BANK, edited);
  assert(eq(back.loop, { startBar: 4, fromBar: 7, toBar: 11 }),
    'and a bar delete — the edit that would otherwise eat it — with the markers a bar earlier');
}

// ---- the markers follow their bars -------------------------------------------------
//
// A loop is written in bar NUMBERS, so an edit that inserts or removes bars moves the
// music out from under it. Two ways that showed, and both of them on real songs:
// deleting bar 1 of a song looping 8-12 left the loop a phrase late, and on the three
// songs whose loop ends on their LAST bar — rhythm, hub, speed — any delete at all left
// the loop pointing past the end. `arrangementIssues` refuses that, the desk undoes what
// it refuses, and so Delete Bars did nothing at all on those songs.

const loopAfter = (edit, loop = LOOP) =>
  entryOf(BANK, edit(draftOf(BANK, { order: BANK.order, loop })))?.loop ?? null;

assert(eq(loopAfter((d) => deleteBars(d, 0, 1)), { startBar: 3, fromBar: 6, toBar: 10 }),
  'bars taken from ahead of a loop pull all three markers back by as many');
assert(eq(loopAfter((d) => deleteBars(d, 8, 9)), { startBar: 5, fromBar: 8, toBar: 10 }),
  'bars taken from inside it shorten it and leave its start where it was');
assert(eq(loopAfter((d) => deleteBars(d, 11, 11), { fromBar: 5, toBar: 12 }),
  { fromBar: 5, toBar: 11 }),
'a loop that ends on the last bar follows the song when that bar goes — the edit that used to be refused');
assert(arrangementIssues(BANK, entryOf(BANK,
  deleteBars(draftOf(BANK, { order: BANK.order, loop: { fromBar: 5, toBar: 12 } }), 11, 11))).length === 0,
'and the entry it writes is one the desk will accept');
assert(eq(loopAfter((d) => deleteBars(d, 9, 11)), { startBar: 5, fromBar: 8, toBar: 9 }),
  'a delete that eats the end of a loop and the end of the song brings it back to the last bar left');
assert(eq(loopAfter((d) => deleteBars(d, 6, 11)), { startBar: 5 }),
  'and one that eats the whole of it takes the loop, keeping only where the song starts');

assert(eq(loopAfter((d) => insertSilence(d, 8, 2)), { startBar: 5, fromBar: 8, toBar: 14 }),
  'silence inserted inside a loop lengthens it — those bars are part of the repeat now');
assert(eq(loopAfter((d) => insertSilence(d, 2, 2)), { startBar: 7, fromBar: 10, toBar: 14 }),
  'silence inserted ahead of it pushes all three markers later, so the loop keeps its music');
assert(eq(loopAfter((d) => insertSilence(d, 12, 2), { fromBar: 5, toBar: 12 }),
  { fromBar: 5, toBar: 12 }),
'silence appended after the last bar of a loop stays outside it');
assert(eq(loopAfter((d) => insertSilence(d, 0, 2), { fromBar: 1, toBar: 12 }),
  { fromBar: 3, toBar: 14 }),
'silence at the very top of a song with no start bar does not become a start bar skipping it');
assert(eq(loopAfter((d) => duplicateBars(d, 8, 9)), { startBar: 5, fromBar: 8, toBar: 14 }),
  'and a repeat inside a loop grows it by the bars it added');
{
  // The seven cabinets that are a bare two-bar loop have no order of their own, so
  // `entryOf` has nothing to write but this. Without the loop counting on its own, the
  // markers would be unsettable on exactly the songs most likely to want them.
  const plain = { bpm: 120, bass: rest(), bassLen: rest() };
  const back = entryOf(plain, setSongLoop(draftOf(plain, null), { fromBar: 1, toBar: 2 }));
  assert(eq(back, { loop: { fromBar: 1, toBar: 2 } }),
    'a loop is writable on a song with no arrangement otherwise — it counts on its own');
  assert(entryOf(plain, draftOf(plain, null)) === null,
    'and a song nobody has touched still compacts back to no entry at all');
}

// ---- the desk's own clamp ----------------------------------------------------------

{
  const d = draftOf(BANK, null);
  assert(eq(setSongLoop(d, { startBar: 5, fromBar: 8, toBar: 12 }).loop, LOOP),
    'setSongLoop keeps a loop that fits');
  assert(eq(setSongLoop(d, { startBar: 40, fromBar: 40, toBar: 40 }).loop,
    { startBar: 12, fromBar: 12, toBar: 12 }),
  'and pulls one past the end back to the last bar rather than refusing to type');
  assert(eq(setSongLoop(d, { startBar: 9, fromBar: 2, toBar: 4 }).loop,
    { startBar: 9, fromBar: 9, toBar: 9 }),
  'a loop before the start bar is pushed to the start bar, where it is at least reached');
  assert(setSongLoop(d, null).loop === null, 'and null clears it');
  assert(setSongLoop(d, { startBar: 1 }).loop === null,
    'as does a start bar of 1 with no region — that is the song as written');
}

// ---- the file ----------------------------------------------------------------------
//
// The desk writes an arrangement through `bankSource`, which serialises whatever keys
// it is given. Asserted rather than assumed: the whole storage decision rests on a
// nested object needing no serialiser of its own.

{
  const entry = { order: BANK.order, bpm: 96, loop: LOOP };
  const dir = mkdtempSync(join(tmpdir(), 'mash-loop-'));
  const file = join(dir, 'entry.js');
  writeFileSync(file, `export const arrangement = ${bankSource(entry)};\n`);
  const { arrangement } = await import(`file://${file}`);
  assert(eq(arrangement.loop, LOOP) && arrangement.bpm === 96,
    'an arrangement round-trips through the source writer with its loop intact');
}

// ---- the sequencer -----------------------------------------------------------------
//
// The claim the rest of it exists to support: the intro is scheduled once and the loop
// for ever. Needs the real engine, so it needs a browser.

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { registerTrack } from ${JSON.stringify(join(ROOT, 'src/data/tracks.js'))};
window.__Audio = Audio;
window.__registerTrack = registerTrack;
`;

async function sequencer() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    return { steps: null };
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><meta charset="utf-8">`
    + `<script>${bundleJs.replace(/<\/script/gi, '<\\/script')}<\/script>`,
  { waitUntil: 'load' });

  const out = await page.evaluate(async (loop) => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100 * 8, 44100);
    const rest32 = () => new Array(32).fill(null);
    const bank = {
      bpm: 120, bass: rest32(), bassLen: rest32(), bassGain: 0.2,
      sections: [{}, {}, {}, {}, {}, {}], order: [0, 1, 2, 3, 4, 5],
    };
    bank.bass[0] = 220;
    bank.bassLen[0] = 1;
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    // Registered so the bank has an id: the markers are looked up through it, the same
    // way the tempo and the mix are, and an unregistered bank is a song the engine has
    // no file for.
    window.__registerTrack({ id: 'looptest', bank, title: 'Loop Test', slug: 'looptest' });
    // Through setBank with an arrangement, which is the whole point of arming there: the
    // game never calls armSongLoop itself, it just changes song.
    Audio.setBank(bank, null, { loop });
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);

    const armed = { step: Audio.step, start: Audio.loopStart, end: Audio.loopEnd, own: Audio.formLoopArmed };

    // Walked by hand rather than by the interval, so the sequence is exact.
    const steps = [];
    for (let i = 0; i < 260; i++) { steps.push(Audio.step); Audio.scheduleStep(); }

    // And the same markers with the playhead already inside the region: re-arming under
    // a running song must not move it.
    Audio.step = 130;
    Audio.armSongLoop();
    const rearmed = Audio.step;

    // A locator loop over the top, then let go — the song falls back to its own markers
    // rather than to the whole form, which is what a level does when it takes over from
    // a cabinet screen.
    Audio.setLoop(0, 32);
    const overridden = { start: Audio.loopStart, end: Audio.loopEnd, own: Audio.formLoopArmed };
    Audio.setLoop();
    Audio.armSongLoop();
    const restored = { start: Audio.loopStart, end: Audio.loopEnd, own: Audio.formLoopArmed };

    return { armed, steps, rearmed, overridden, restored };
  }, LOOP);

  await browser.close();
  for (const error of errors) assert(false, `page error — ${error}`);
  return out;
}

const seq = await sequencer();
if (seq.steps) {
  assert(seq.armed.step === 64 && seq.armed.start === 112 && seq.armed.end === 192
    && seq.armed.own === true,
  'setBank alone starts the song on bar 5 with bars 8-12 armed behind it');
  // The way in: every step from the start bar to the end of the loop, once, in order.
  const intro = seq.steps.slice(0, 128);
  assert(intro.every((s, i) => s === 64 + i),
    'the way in is played straight through — bars 5 to 12, no repeats and no jumps');
  // And then the region, for ever. 260 steps is the intro plus two full passes and a bit.
  const after = seq.steps.slice(128);
  assert(after[0] === 112 && after.every((s) => s >= 112 && s < 192),
    'and after it the song never leaves bars 8-12 again');
  assert(after[80] === 112,
    'the loop is 80 steps long and comes back to its first bar exactly on time');
  assert(!seq.steps.some((s) => s < 64),
    'bars 1-4 are never scheduled — they are not this song, they are what came before it');
  assert(seq.rearmed === 130,
    're-arming the same markers under a running song leaves the playhead where it is');
  assert(seq.overridden.start === 0 && seq.overridden.own === false,
    'a locator loop takes the transport, and stops being the song’s own');
  assert(seq.restored.start === 112 && seq.restored.end === 192 && seq.restored.own === true,
    'and letting it go lands back on the song’s markers, not on the whole form');
}

console.log(failed ? 'SONG LOOP: FAILED' : 'SONG LOOP: PASSED');
process.exit(failed ? 1 : 0);
