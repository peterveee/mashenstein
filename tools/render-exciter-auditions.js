// Render a song through the Exciter at a spread of settings, so it can be heard.
//
// tools/measure-exciter.js proves the effect does what it says on tones. This is the
// other half: what it does to music, which no spectrum answers. The dry take is written
// first from the same render, so every file in the folder is an A/B against the song as
// it stands rather than against a memory of it.
//
// Unity gain, like every render here — the whole question an exciter poses is how much
// brighter and how much louder, and normalising would answer half of it for you.
//
// Usage: node tools/render-exciter-auditions.js [trackId] [repeats] [lane]
// e.g.:  node tools/render-exciter-auditions.js plumber 1
//        node tools/render-exciter-auditions.js shop 1 hats
//
// With no lane the chain goes on the MASTER, which is where an exciter usually belongs;
// name a lane and it goes on that channel instead.
//
// Writes dist/exciter-auditions/<lane>-<setting>.wav.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { MIX } from '../src/data/mix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [trackId = 'plumber', repeatArg = '1', lane = null] = args;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const track = resolveOrExit(trackId);
const outDir = join(root, 'work', 'auditions', 'exciter');
mkdirSync(outDir, { recursive: true });

// The song's own saved mix underneath, so the audition is the song as it is heard — its
// trims, sends and effect chains — with the exciter added and nothing else changed.
const base = MIX[track.id] || {};

// Chosen to walk the two knobs that change the CHARACTER rather than to sample the grid.
// `defaults` is what a fresh insert sounds like, and is the one the others are judged
// against; `mix 1` is not a setting anyone would use, it is the effect on its own, which
// is the only way to hear what it is actually adding.
const TAKES = [
  ['dry', null],
  ['defaults', { }],
  ['air', { tune: 6000, drive: 0.35, timbre: 1, mix: 0.35 }],
  ['presence', { tune: 2000, drive: 0.5, timbre: 0.5, mix: 0.3 }],
  ['odd-hard', { tune: 3000, drive: 0.7, timbre: 0, mix: 0.3 }],
  ['even-sweet', { tune: 3000, drive: 0.7, timbre: 1, mix: 0.3 }],
  ['wet-only', { tune: 3000, drive: 0.5, timbre: 0.6, mix: 1 }],
];

const renderer = await openRenderer();
try {
  for (const [name, params] of TAKES) {
    let mix = base;
    if (params) {
      const fx = { id: 'exciter', params };
      mix = lane
        // Onto the end of whatever that lane already runs: an exciter in front of a
        // channel's own chain is a different effect than one after it.
        ? { ...base,
          lanes: { ...(base.lanes || {}),
            [lane]: { ...(base.lanes?.[lane] || {}),
              effects: [...(base.lanes?.[lane]?.effects || []), fx] } } }
        : { ...base, masterEffects: [...(base.masterEffects || []), fx] };
    }
    const { outL, outR, seconds, peak } = await renderer.render(track.bank, {
      repeat: REPEAT, mix, trackId: track.id,
    });
    const out = join(outDir, `${lane || 'master'}-${name}.wav`);
    writeFileSync(out, wavBuffer([outL, outR]));
    console.log(`${out.replace(`${root}/`, '')}  ${seconds.toFixed(1)}s  peak ${dbfs(peak)}`
      + (peak > 1 ? '  ** CLIPS **' : ''));
  }
} finally {
  await renderer.close();
}
console.log(`\n${track.id} on the ${lane || 'master'}: ${TAKES.length} takes`
  + ' — dist/exciter-auditions/');
