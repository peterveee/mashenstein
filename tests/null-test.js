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
        if (out.outL.length !== ref.length) {
          console.error(`FAIL: ${what} is ${out.outL.length} frames, baseline is ${ref.length}`);
          failed = true;
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
          console.error(`FAIL: ${what} differs by ${max.toExponential(3)} at sample ${at}`
            + ` (${(at / 44100).toFixed(2)}s) — tolerance is ${TOLERANCE.toExponential(0)}`);
          failed = true;
        }
      }
    }
  } finally {
    await renderer.close();
  }
  const skipped = wanted.length - have.length;
  if (skipped) console.log(`(${skipped} baseline${skipped === 1 ? '' : 's'} missing, not checked)`);
  console.log(failed ? '\nNULL TEST: FAILED' : '\nNULL TEST: PASSED');
  process.exit(failed ? 1 : 0);
}
