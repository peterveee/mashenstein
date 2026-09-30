// Audition sweep: the Frost sleigh's carol — a Christmas tune, minor, on a vibraphone,
// over FROST FORTRESS as the game plays it.
//
// Every phrase in SLEIGH_CAROLS (engine/audio.js) renders two ways:
//
//   <name>.wav      over bars 12-15 of the song, its strong beat on bar 13's downbeat —
//                   D minor, the band in full.
//   <name>-dry.wav  the phrase alone, in D, for the instrument.
//
// No render across Frost's key change: a phrase is held in one key and the game places it
// inside one (run.js cueSleighCarol), so there is no such moment to hear.
//
// The cue is rendered through the real engine (tools/lib/cue-render.js) and the song
// through the real engine with its arranged order (render-bank-browser), then summed
// here at unity. Nothing is normalised: the level between the two is the level to judge.
//
// Usage: node tools/render-carol-auditions.js [name ...] [--fresh-bed]
//        (default: every phrase; out to work/auditions/sleigh-carol)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, SR } from './lib/wav.js';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { openCueRenderer } from './lib/cue-render.js';
import * as frost from '../src/data/songs/frost.js';
import { SLEIGH_CAROLS, SLEIGH_CAROL } from '../src/engine/audio.js';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT = join(ROOT, 'work', 'auditions', 'sleigh-carol');
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const FRESH = args.includes('--fresh-bed');
const names = args.filter((a) => !a.startsWith('--'));
const pick = names.length ? names : Object.keys(SLEIGH_CAROLS);
for (const n of pick) {
  if (!SLEIGH_CAROLS[n]) { console.error(`no carol "${n}" — have ${Object.keys(SLEIGH_CAROLS).join(', ')}`); process.exit(1); }
}

const BPM = frost.bank.bpm;
const SPB = 60 / BPM;
const D = 587.33;                        // the song's tonic where the carol is heard here
const barSec = (bar) => (bar - 1) * 4 * SPB;

// ---- the bed: the song in its arranged order ------------------------------------------

function readWav16(path) {
  const b = readFileSync(path);
  let off = 12, data = null, nch = 2;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4); const len = b.readUInt32LE(off + 4);
    if (id === 'fmt ') nch = b.readUInt16LE(off + 10);
    if (id === 'data') { data = b.subarray(off + 8, off + 8 + len); break; }
    off += 8 + len;
  }
  const frames = data.length / (2 * nch);
  const L = new Float32Array(frames), R = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    L[i] = data.readInt16LE(i * 2 * nch) / 32767;
    R[i] = data.readInt16LE(i * 2 * nch + 2 * (nch - 1)) / 32767;
  }
  return { L, R };
}

const BED = join(OUT, '_bed-frost-arranged.wav');
let bed;
if (!FRESH && existsSync(BED)) {
  bed = readWav16(BED);
  console.log(`bed        ${BED} (cached; --fresh-bed to re-render)`);
} else {
  console.log('bed        rendering FROST FORTRESS, arranged order...');
  const r = await renderBankBrowser(frost.bank, {
    repeat: 1, trackId: frost.id, mix: frost.mix, arrangement: frost.arrangement,
  });
  bed = { L: r.outL, R: r.outR };
  writeFileSync(BED, wavBuffer([bed.L, bed.R]));
  console.log(`bed        ${r.seconds.toFixed(1)}s, peak ${r.peak.toFixed(3)}`);
}

// ---- the carols ----------------------------------------------------------------------

const rmsDb = (L, R) => {
  let s = 0, n = 0;
  for (let i = 0; i < L.length; i++) { const v = (L[i] + R[i]) / 2; if (Math.abs(v) > 1e-4) { s += v * v; n++; } }
  return n ? 10 * Math.log10(s / n) : -Infinity;
};
const peakDb = (L, R) => {
  let p = 0; for (let i = 0; i < L.length; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  return 20 * Math.log10(p || 1e-9);
};

function over(fromBar, toBar, cue, cueAtSec) {
  const a = Math.round(barSec(fromBar) * SR);
  const b = Math.min(bed.L.length, Math.round((barSec(toBar + 1) + 1.2) * SR));
  const L = bed.L.slice(a, b), R = bed.R.slice(a, b);
  const at = Math.round((cueAtSec - barSec(fromBar)) * SR);
  for (let i = 0; i < cue.L.length && at + i < L.length; i++) {
    if (at + i < 0) continue;
    L[at + i] += cue.L[i]; R[at + i] += cue.R[i];
  }
  return [L, R];
}

const cues = await openCueRenderer();
try {
  for (const name of pick) {
    const c = SLEIGH_CAROLS[name];
    const secs = c.notes.reduce((m, [bt, , d]) => Math.max(m, bt + d), 0) * SPB + 3;

    // In D: strong beat on bar 13's downbeat.
    const strongD = barSec(13);
    const dry = await cues.render('sleighCarol', { carol: name, tonic: D, bpm: BPM }, secs);
    writeFileSync(join(OUT, `${name}-dry.wav`), wavBuffer([dry.L, dry.R]));
    writeFileSync(join(OUT, `${name}.wav`),
      wavBuffer(over(12, 15, dry, strongD - c.downbeat * SPB)));

    console.log(`${name.padEnd(14)} ${(secs - 3).toFixed(2)}s  dry RMS ${rmsDb(dry.L, dry.R).toFixed(1)} dBFS, `
      + `peak ${peakDb(dry.L, dry.R).toFixed(1)}${name === SLEIGH_CAROL ? '   <- ships' : ''}`);
  }
} finally {
  await cues.close();
}
console.log(`\nwrote ${OUT}`);
