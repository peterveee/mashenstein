// Capture the engine's current output as the null test's reference.
//
// `npm run baseline`. Run it ONLY from an engine you have just listened to and
// believe: everything the null test says afterwards is measured against this, so a
// baseline taken from a broken engine makes the breakage the new normal.
//
// Written as raw Float32 (the left channel, which is what the comparison uses) plus
// a WAV of both channels for listening. ~68MB for the five tracks, which is why they
// live outside git — see .gitignore.
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { MIX } from '../src/data/mix.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'baselines/engine');
const DEFAULT = ['plumber', 'speed', 'title', 'shop', 'megamix'];

const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const list = ids.length ? ids : DEFAULT;
mkdirSync(DIR, { recursive: true });

const renderer = await openRenderer();
try {
  for (const track of list.map(resolveOrExit)) {
    // Two references per song, because they answer two different questions.
    //
    // `<id>.f32` is mix: null — the ENGINE, with no mix laid over it. A trim in
    // mix.js must never be able to hide or fake an engine regression.
    //
    // `<id>.mix.f32` is the song as the game actually plays it, bank + MIX. That
    // one exists because the echo moved: a lane used to be on the delay because of
    // the kind of lane it was, so the bare engine covered the echo path. Now each
    // song's sends are in mix.js, and without this the whole delay bus would be
    // untested — which is how a doubled aux return could have shipped.
    for (const [suffix, mix] of [['', null], ['.mix', MIX[track.id] || null]]) {
      const out = await renderer.render(track.bank, { repeat: 1, mix, trackId: track.id });
      writeFileSync(join(DIR, `${track.id}${suffix}.f32`),
        Buffer.from(out.outL.buffer, out.outL.byteOffset, out.outL.byteLength));
      writeFileSync(join(DIR, `${track.id}${suffix}.wav`), wavBuffer([out.outL, out.outR], 1));
      console.log(`${(track.id + suffix).padEnd(14)} ${out.seconds.toFixed(1)}s  peak ${out.peak.toFixed(3)}`
        + `  ${(out.outL.length * 4 / 1e6).toFixed(1)}MB`);
    }
  }
} finally {
  await renderer.close();
}
console.log(`\nwrote ${list.length} baseline${list.length === 1 ? '' : 's'} to ${DIR.replace(ROOT + '/', '')}`);
console.log('the null test compares against these — see tests/null-test.js');
