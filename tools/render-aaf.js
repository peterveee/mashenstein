// One song as an AAF for a DAW: every stem on its own track from bar 1, the audio
// embedded, so the .aaf is the whole delivery.
//
// The stems come from tools/render-stems.js, the game's own engine at the mix's own
// gain, so at unity they keep the mix's balance. (Each stem ran the master chain on
// its own, so a master compressor or exciter leaves the sum close to the mix, not
// equal to it.) tools/stems-to-aaf.py then packs the folder (pyaaf2, in
// tools/.venv-audio). Its header explains why each stereo stem is a dual-mono .L/.R pair.
//
// AAF carries no tempo. After import, set the project to the BPM printed at the end,
// or drag in the .mid from the same folder and accept its tempo. Every region starts
// at bar 1, so changing the tempo moves nothing.
//
// Usage: node tools/render-aaf.js [trackId] [repeats] [--no-loop] [--reuse] [--interleaved]
//   --reuse        pack the stems already in work/stems/<slug>/ instead of re-rendering
//   --interleaved  one stereo track per stem instead of .L/.R pairs (see stems-to-aaf.py)
// e.g.:  node tools/render-aaf.js shop
//        → work/stems/shop-theme/shop-theme.aaf
import { existsSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { resolveOrExit } from './lib/tracks.js';
import { applyArrangement, bpmOf } from '../src/data/arrangements.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PY = join(ROOT, 'tools/.venv-audio/bin/python');
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const [trackId = 'shop', repeatArg = '1'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const REUSE = flags.includes('--reuse');

const track = resolveOrExit(trackId);
const DIR = `work/stems/${track.slug}`;
const OUT = join(DIR, `${track.slug}.aaf`);

if (!existsSync(PY)) {
  console.error('render-aaf: no tools/.venv-audio. Set it up with:\n'
    + '  python3 -m venv tools/.venv-audio\n'
    + '  tools/.venv-audio/bin/pip install pedalboard pyobjc-framework-Cocoa pyaaf2');
  process.exit(1);
}

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (!REUSE) {
  // The packer takes every stem in the folder, so stems a previous render left behind
  // (a lane the song has since dropped) would come back as extra tracks.
  if (existsSync(DIR)) {
    for (const f of readdirSync(DIR)) if (/^\d+-.*\.wav$/i.test(f)) rmSync(join(DIR, f));
  }
  run(process.execPath, ['tools/render-stems.js', trackId, repeatArg, DIR,
    ...flags.filter((f) => f === '--no-loop')]);
}

run(PY, ['tools/stems-to-aaf.py', DIR, OUT, '--title', track.title,
  ...flags.filter((f) => f === '--interleaved')]);

const bpm = bpmOf(applyArrangement(track.bank, track.id), track.id);
console.log(`  tempo: ${bpm} bpm. AAF carries none, so set it in the DAW (or import ${track.slug}.mid and keep its tempo)`);
