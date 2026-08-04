// THE null test: at defaults, the channel strips must be inaudible.
//
// Every song was balanced by ear against the engine as it was BEFORE it grew a
// mixing desk — faders, pans, EQ, sends, effect slots, the lot. All of that is
// supposed to be a pass-through until someone moves something, and "supposed to be"
// is not a thing you can hear: a strip that is 0.3dB down or 6ms late sounds fine on
// its own and wrong next to everything else. So this renders the real engine offline
// and compares it, sample for sample, against dumps taken before the desk existed.
//
// It has already caught silent breakage more than once — a deleted
// `widthNode.output.connect(musicBus)` that left only the effect returns audible,
// and a delay line rebuilt at a longer maxDelayTime, which Chrome does not render
// identically even at the same delay time.
//
// The baselines are ~68MB of Float32, so they are not in git. Make them with:
//     npm run baseline
// and only ever from an engine you have just heard and believe. If they are missing
// this suite says so and passes — a missing reference is not a regression, but it is
// not a green light either.
//
// FAILURE vs WARNING. The two passes below are different claims and only one of them
// can be broken by accident. The bare-engine pass says the ENGINE is unchanged: nobody
// edits that on purpose without meaning to, so a difference there is a regression and
// fails the run. The `.mix` pass says the SONG is unchanged — and moving a fader is
// exactly what the desk is for. A rebalance is a deliberate edit that arrives through
// src/data/songs/, so it WARNS instead: it reports the drift, names the re-render, and
// lets the suite pass. Anything else means every mix session ends with a red suite that
// has to be argued with, which is how a real failure gets waved through.
//
// Exit 2 means "passed, with warnings" — tests/run-all.js collects those and repeats
// them at the very end of the run, so they cannot scroll past unread.
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer } from '../tools/lib/render-bank-browser.js';
import { resolveTrack } from '../src/data/tracks.js';
import { MIX } from '../src/data/mix.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_DIR = join(ROOT, 'baselines/engine');

// Float32 comparison, not bit-equality: Web Audio is allowed to sum in a different
// order between runs. 5e-6 is about -106dBFS — six orders of magnitude below
// anything audible, and still tight enough to catch a gain that moved by 0.01dB.
export const TOLERANCE = 5e-6;

// plumber covers the melodic lanes and the echo; megamix walks every song's voices
// in one render. Between them they touch nearly every branch of scheduleStep.
// MASH_NULL_ALL=1 does the full set, which is what to run before believing a big
// engine change.
const QUICK = ['plumber', 'megamix'];
const ALL = ['plumber', 'speed', 'title', 'shop', 'megamix'];

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const wanted = process.env.MASH_NULL_ALL ? ALL : QUICK;
  const have = wanted.filter((id) => existsSync(join(BASELINE_DIR, `${id}.f32`)));
  if (!have.length) {
    console.log(`no baselines in ${BASELINE_DIR.replace(ROOT + '/', '')} — skipping.`);
    console.log('  make them with:  npm run baseline');
    console.log('NULL TEST: SKIPPED');
    process.exit(0);
  }

  let failed = false;
  const warnings = [];
  const renderer = await openRenderer();
  try {
    for (const id of have) {
      // Two passes per song. `mix: null` asks whether the ENGINE still sounds the
      // same — a trim in mix.js must not be able to hide an engine regression, or
      // mask one either. `bank + MIX` asks whether the SONG does, which is the pass
      // that covers the sends: since the echo stopped being a property of the kind
      // of lane and became a send in the mix, the bare engine no longer touches the
      // delay bus at all.
      for (const [suffix, mix] of [['', null], ['.mix', MIX[id] || null]]) {
        const file = join(BASELINE_DIR, `${id}${suffix}.f32`);
        if (!existsSync(file)) continue;
        const buf = readFileSync(file);
        const ref = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
        const out = await renderer.render(resolveTrack(id).bank, { repeat: 1, mix, trackId: id });
        const what = `${id}${suffix ? ' with its mix' : ''}`;
        // A mix pass is allowed to drift; the bare engine is not. See the note at the
        // top of the file for why these two are graded differently.
        const soft = suffix === '.mix';
        if (out.outL.length !== ref.length) {
          const msg = `${what} is ${out.outL.length} frames, baseline is ${ref.length}`;
          if (soft) { console.warn(`WARN: ${msg}`); warnings.push(msg); }
          else { console.error(`FAIL: ${msg}`); failed = true; }
          continue;
        }
        let max = 0, at = -1;
        for (let i = 0; i < ref.length; i++) {
          const d = Math.abs(out.outL[i] - ref[i]);
          if (d > max) { max = d; at = i; }
        }
        if (max < TOLERANCE) {
          console.log(`ok: ${what} is identical to the baseline (max diff ${max.toExponential(2)})`);
        } else {
          const msg = `${what} differs by ${max.toExponential(3)} at sample ${at}`
            + ` (${(at / 44100).toFixed(2)}s) — tolerance is ${TOLERANCE.toExponential(0)}`;
          if (soft) { console.warn(`WARN: ${msg}`); warnings.push(msg); }
          else { console.error(`FAIL: ${msg}`); failed = true; }
        }
      }
    }
  } finally {
    await renderer.close();
  }
  const skipped = wanted.length - have.length;
  if (skipped) console.log(`(${skipped} baseline${skipped === 1 ? '' : 's'} missing, not checked)`);
  if (warnings.length) {
    console.log(`\n${warnings.length} mix${warnings.length === 1 ? ' no longer matches' : 'es no longer match'}`
      + ' its baseline. If the rebalance was intended, re-render with:  npm run baseline');
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (failed) console.log('\nNULL TEST: FAILED');
  else if (warnings.length) console.log(`\nNULL TEST: PASSED (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`);
  else console.log('\nNULL TEST: PASSED');
  process.exit(failed ? 1 : warnings.length ? 2 : 0);
}
