// Ten candidates for "your special move is off cooldown" — rendered to WAV so one
// can be picked by ear.  Usage: node tools/render-ready-auditions.js [name ...]
//
// The cue's job is unusual and it constrains the shapes below. It fires while you are
// running, unprompted, over the music, and it fires AGAIN a few seconds later, all
// game long — so it has to be readable at a glance and forgettable at the same time.
// Anything with an arpeggio in it (coin, power, star, win) is already spoken for by
// a pickup, and a cue that sounds like a pickup will be heard as one. That rules the
// whole rising-square family out and leaves three honest directions, which is why the
// ten below cluster into three:
//
//   mechanical  — latch, tick2, pluck, ratchet:  a weapon reloading. No pitch content
//                 to fight the song, and the metaphor is exactly right.
//   tonal       — chime, bell, fifth, blip:      a small interval, well above the mix.
//   textural    — swell, breath:                 no pitch at all, just air arriving.
//
// Each candidate is written against the engine's own primitives — osc() and noise(),
// the same two every cue in audio.js is built from — so whichever wins is lifted from
// here into a `case 'abilityReady'` unchanged, with nothing to re-create.
//
// Levelling: `shoot` and `power` render alongside as references. The ready cue must sit
// UNDER the move it announces — it is a notification, not an event — so compare its RMS
// against shoot's and expect it several dB down. See the audio-cue-levels rule.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, SR } from './lib/wav.js';

const require = createRequire(import.meta.url);
const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const SECONDS = 2;

// Bodies, not functions: each is evaluated in the page with `A` bound to Audio, and
// each is a paste-ready cue body. Keep them that way — a candidate that only works
// through a helper this tool owns is a candidate that cannot ship.
const CANDIDATES = {
  // --- mechanical: a weapon coming back to the ready ---------------------------
  // A latch dropping home: bright click, a short metal ring, a low seat under it.
  latch: `
    A.noise(0.035, 0.10, 'highpass', 3200);
    A.osc('triangle', 2400, 1900, 0.07, 0.045, 0.004);
    A.osc('sine', 200, 130, 0.09, 0.07, 0.004);`,
  // Two ticks, 45ms apart — the smallest gesture that reads as "done" rather than
  // as one stray click in the mix. Pure click, no pitch to argue with the song.
  tick2: `
    A.noise(0.018, 0.09, 'highpass', 4000);
    A.noise(0.022, 0.075, 'highpass', 2600, 0.045);
    A.osc('square', 1600, 1600, 0.02, 0.03, 0.045);`,
  // A muted string plucked once: noise transient, then a fast triangle decay. Warm,
  // and the least like any of the pickups.
  pluck: `
    A.noise(0.012, 0.07, 'bandpass', 1800);
    A.osc('triangle', 784, 760, 0.16, 0.10);
    A.osc('triangle', 1568, 1520, 0.07, 0.035);`,
  // A ratchet winding the last two teeth — three accelerating ticks. The most
  // literal "recharged", and the one most at risk of sounding like debris.
  ratchet: `
    [0, 0.035, 0.062].forEach((w, i) => {
      A.noise(0.016, 0.055 + i * 0.015, 'bandpass', 2200 + i * 700, w);
    });
    A.osc('square', 1200, 1500, 0.03, 0.04, 0.062);`,

  // --- tonal: a small interval, placed above the music -------------------------
  // Two sines a fifth apart, the second overlapping the first. Soft, bell-ish,
  // no attack transient at all.
  chime: `
    A.osc('sine', 1047, 1047, 0.11, 0.075, 0, null, 0.3);
    A.osc('sine', 1568, 1568, 0.16, 0.06, 0.055, null, 0.25);`,
  // A struck bell: fundamental plus an inharmonic partial, which is what makes a
  // bell a bell rather than a beep. Longest tail here.
  bell: `
    A.osc('sine', 1318, 1310, 0.35, 0.065);
    A.osc('sine', 3520, 3480, 0.10, 0.022);
    A.osc('sine', 2637, 2620, 0.20, 0.028, 0.006);`,
  // The interval alone, both notes struck together — one event, not two. Triangle
  // so it carries over the mix without the square's bite.
  fifth: `
    A.osc('triangle', 880, 880, 0.13, 0.055, 0, null, 0.35);
    A.osc('triangle', 1319, 1319, 0.13, 0.045, 0, null, 0.35);`,
  // One retro blip sweeping up. The cheapest possible cue, here so the others have
  // a floor to beat — if this is enough, nothing more is warranted.
  blip: `
    A.osc('square', 1200, 1700, 0.055, 0.065);`,

  // --- textural: air, no pitch -------------------------------------------------
  // Bandpass noise climbing in three overlapping bands: a fizz topping up. Reads as
  // energy returning, and cannot be mistaken for a note.
  swell: `
    [[900, 0], [1600, 0.06], [2600, 0.11]].forEach(([f, w], i) => {
      A.noise(0.13, 0.05 + i * 0.012, 'bandpass', f, w);
    });`,
  // An intake of breath and a soft landing on one note — the gentlest of the ten,
  // for judging how quiet this cue can get and still register.
  breath: `
    A.noise(0.14, 0.045, 'highpass', 1800, 0, 0.5);
    A.osc('sine', 1175, 1175, 0.12, 0.05, 0.11, null, 0.3);`,

  // --- round two: `fifth` won the shape, then lost to the music ----------------
  // "Hard to hear with everything going on" is a masking complaint, and gain is
  // only one of the two answers to it. Measured over plumber-panic and neon, the
  // mix rolls off smoothly from 200Hz with no hole to drop a cue into — but there
  // is ~6dB more room above 2.4kHz than at 880Hz, where the shipped cue's lower
  // note sits, and ~11dB at 4kHz. So these move the cue rather than only raising
  // it: an octave up buys clearance the fader would have to pay for.
  //
  // Render them over a song with `--over work/tracks/plumber-panic.wav`, which is
  // the only test that answers the complaint. Dry, all six sound fine.

  // The shipped cue, louder. The floor: if this is enough, take it.
  fifthLoud: `
    A.osc('triangle', 880, 880, 0.13, 0.095, 0, null, 0.35);
    A.osc('triangle', 1319, 1319, 0.13, 0.078, 0, null, 0.35);`,
  // The same interval an octave up, at the SHIPPED gain — so any improvement is
  // the placement, not the fader.
  fifthUp: `
    A.osc('triangle', 1760, 1760, 0.13, 0.055, 0, null, 0.35);
    A.osc('triangle', 2637, 2637, 0.13, 0.045, 0, null, 0.35);`,
  // Octave up and louder: both levers at once.
  fifthUpLoud: `
    A.osc('triangle', 1760, 1760, 0.13, 0.09, 0, null, 0.35);
    A.osc('triangle', 2637, 2637, 0.13, 0.072, 0, null, 0.35);`,
  // The shipped cue with a transient in front of it. A click at 4kHz costs almost
  // no loudness and lands where the bed is 11dB down — it is the cheapest way to
  // make a sustained tone announce itself, and it is why `latch` and `tick2` were
  // never in danger of being masked.
  fifthTick: `
    A.noise(0.014, 0.075, 'highpass', 4000);
    A.osc('triangle', 880, 880, 0.13, 0.075, 0.006, null, 0.35);
    A.osc('triangle', 1319, 1319, 0.13, 0.062, 0.006, null, 0.35);`,
  // Everything: up an octave, louder, and struck.
  fifthUpTick: `
    A.noise(0.014, 0.075, 'highpass', 4000);
    A.osc('triangle', 1760, 1760, 0.14, 0.09, 0.006, null, 0.35);
    A.osc('triangle', 2637, 2637, 0.14, 0.072, 0.006, null, 0.35);`,

  // --- round three: repeat it, don't move it ----------------------------------
  // Peter's idea, and a better one than either of mine: strike the SAME interval
  // several times, fast, with no pitch change. Level and placement both fight the
  // music on its own ground — the spectrum — where the bed has every advantage.
  // A fast identical repeat competes somewhere the music is not: it gives the cue
  // a temporal signature, and nothing in a 112bpm bed repeats at 20Hz.
  //
  // The gap is the whole design, and there are two ways to lose:
  //
  //   TOO SLOW and the repeats are heard as separate events on the beat grid — at
  //   112bpm a 16th is 134ms and a 32nd is 67ms, so a gap near either fuses INTO
  //   the song instead of standing out from it, and the gap that is safe at one
  //   tempo is the grid at another. Under ~60ms the repeats stop being rhythm and
  //   become one grainy gesture, which is tempo-proof.
  //
  //   TOO LONG overall and a notification becomes an announcement. Three hits at
  //   50ms is 0.23s all in; the shipped single is 0.13s. Past about a third of a
  //   second this stops being something you can ignore, which is the whole job.
  //
  // Each hit carries the SHIPPED per-strike gain, so these differ from fifthLoud
  // in pattern only — any improvement is the repeat, not the fader. The note is
  // shortened to 0.075s so the strikes stay distinct instead of smearing into a
  // held chord, except in fifthX2Wide where the gap is long enough not to.
  fifthX2: `
    [0, 0.075].forEach((w) => {
      A.osc('triangle', 880, 880, 0.075, 0.095, w, null, 0.2);
      A.osc('triangle', 1319, 1319, 0.075, 0.078, w, null, 0.2);
    });`,
  fifthX2Wide: `
    [0, 0.115].forEach((w) => {
      A.osc('triangle', 880, 880, 0.10, 0.095, w, null, 0.3);
      A.osc('triangle', 1319, 1319, 0.10, 0.078, w, null, 0.3);
    });`,
  fifthX3: `
    [0, 0.06, 0.12].forEach((w) => {
      A.osc('triangle', 880, 880, 0.065, 0.095, w, null, 0.2);
      A.osc('triangle', 1319, 1319, 0.065, 0.078, w, null, 0.2);
    });`,
  // The same three, fast enough to fuse into one grainy gesture at any tempo.
  fifthX3Tight: `
    [0, 0.045, 0.09].forEach((w) => {
      A.osc('triangle', 880, 880, 0.05, 0.095, w, null, 0.2);
      A.osc('triangle', 1319, 1319, 0.05, 0.078, w, null, 0.2);
    });`,
  // Four, tighter still — the point at which it stops reading as strikes at all.
  // Here to find the boundary, not because four is likely to win.
  fifthX4: `
    [0, 0.04, 0.08, 0.12].forEach((w) => {
      A.osc('triangle', 880, 880, 0.045, 0.095, w, null, 0.2);
      A.osc('triangle', 1319, 1319, 0.045, 0.078, w, null, 0.2);
    });`,
  // Three strikes that fall away, so the cue has a direction and a clear end
  // rather than stopping. Closest to a real object bouncing.
  fifthX3Decay: `
    [[0, 1], [0.055, 0.72], [0.105, 0.5]].forEach(([w, a]) => {
      A.osc('triangle', 880, 880, 0.065, 0.095 * a, w, null, 0.2);
      A.osc('triangle', 1319, 1319, 0.065, 0.078 * a, w, null, 0.2);
    });`,
  // Peter's repeat crossed with the octave-up placement: three strikes where the
  // bed already has ~6dB more room. Both levers, neither of them the fader.
  fifthUpX3: `
    [0, 0.055, 0.11].forEach((w) => {
      A.osc('triangle', 1760, 1760, 0.06, 0.09, w, null, 0.2);
      A.osc('triangle', 2637, 2637, 0.06, 0.072, w, null, 0.2);
    });`,

  // --- round four: all three levers at once ------------------------------------
  // The tick, the octave and the repeat are independent — attack, spectral room,
  // and a pattern the music has not got — so they stack rather than overlap.
  // These are the crosses worth hearing.
  //
  // Whether the tick belongs on EVERY strike or only the first is the open
  // question: on each it is a ratchet and unmistakable, and risks reading as
  // machinery rather than as a chime; on the first only the cue keeps one attack
  // and the repeats ring under it.
  fifthUpTickX2: `
    [0, 0.075].forEach((w) => {
      A.noise(0.012, 0.07, 'highpass', 4000, w);
      A.osc('triangle', 1760, 1760, 0.075, 0.09, w + 0.005, null, 0.25);
      A.osc('triangle', 2637, 2637, 0.075, 0.072, w + 0.005, null, 0.25);
    });`,
  fifthUpTickX3: `
    [0, 0.055, 0.11].forEach((w) => {
      A.noise(0.012, 0.07, 'highpass', 4000, w);
      A.osc('triangle', 1760, 1760, 0.06, 0.09, w + 0.005, null, 0.25);
      A.osc('triangle', 2637, 2637, 0.06, 0.072, w + 0.005, null, 0.25);
    });`,
  // One attack, three rings.
  fifthUpTickX3First: `
    A.noise(0.014, 0.075, 'highpass', 4000);
    [0, 0.055, 0.11].forEach((w) => {
      A.osc('triangle', 1760, 1760, 0.06, 0.09, w + 0.005, null, 0.25);
      A.osc('triangle', 2637, 2637, 0.06, 0.072, w + 0.005, null, 0.25);
    });`,
  // The same cross at the SHIPPED pitch, so the octave can be judged on its own
  // with the tick and the repeat held constant.
  // --- SHIPPED: the pair, with its gap quantised -------------------------------
  // fifthX2Wide with the gap set to a sixteenth at the beat cabinet's 124bpm
  // (60/124/4 = 0.1210s) instead of the 0.115s it was auditioned at. Six
  // milliseconds: the point is not that it sounds different, it is that both
  // strikes now land on lines the song is already playing. Render it with
  // `--over work/tracks/rhythm-bankruptcy.wav --grid 124` against the same cue
  // without `--grid` — that A/B is the only thing that shows what quantising buys.
  fifthX2Sixteenth: `
    [0, 0.120967].forEach((w) => {
      A.osc('triangle', 880, 880, 0.10, 0.072, w, null, 0.3);
      A.osc('triangle', 1319, 1319, 0.10, 0.059, w, null, 0.3);
    });`,

  fifthTickX3: `
    [0, 0.055, 0.11].forEach((w) => {
      A.noise(0.012, 0.07, 'highpass', 4000, w);
      A.osc('triangle', 880, 880, 0.06, 0.095, w + 0.005, null, 0.25);
      A.osc('triangle', 1319, 1319, 0.06, 0.078, w + 0.005, null, 0.25);
    });`,
};

// Minimal 16-bit PCM reader, for `--over`. The beds in work/tracks are written by
// tools/render-track.js and are always 16-bit — this is not a general decoder.
function readWav(path) {
  const b = readFileSync(path);
  let off = 12; let fmt = null; let data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12) };
    if (id === 'data') data = b.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${path}: no fmt/data chunk`);
  const frames = Math.floor(data.length / 2 / fmt.ch);
  const L = new Float32Array(frames); const R = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    L[i] = data.readInt16LE(i * fmt.ch * 2) / 32768;
    R[i] = data.readInt16LE((i * fmt.ch + (fmt.ch > 1 ? 1 : 0)) * 2) / 32768;
  }
  return { L, R, sr: fmt.sr, frames };
}

// Drop the cue onto the bed four times, spaced far enough apart to hear each one
// arrive cold. Not four in a row: the complaint is about the FIRST one landing,
// and a listener who knows exactly when the next is coming cannot judge that.
const OVER_SECONDS = 14;
const OVER_AT = [1.6, 5.1, 8.3, 11.9];

/**
 * Drop the cue onto the bed, either where it falls or on the song's sixteenth
 * grid (`--grid <bpm>`, which is what a rhythm stage does).
 *
 * On-grid placement only means anything if the EXCERPT starts on a line, so the
 * start is snapped back to a whole beat from sample 0 — tools/render-track.js
 * bounces from the top of the form, so sample 0 is beat 0 and the grid is a
 * plain multiple from there. Without that the excerpt begins mid-beat and every
 * "quantised" cue is quantised to the wrong clock, which sounds exactly like the
 * unquantised version and would have made this whole comparison meaningless.
 */
function mixOver(bed, cueL, cueR, bpm) {
  const n = Math.min(bed.frames, Math.ceil(OVER_SECONDS * SR));
  const beatSec = bpm ? 60 / bpm : 0;
  let start = Math.floor(bed.frames * 0.3);
  if (bpm) start = Math.round(Math.round(start / (beatSec * SR)) * beatSec * SR);
  const L = new Float32Array(n); const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = (start + i) % bed.frames;
    L[i] = bed.L[j]; R[i] = bed.R[j];
  }
  for (const at of OVER_AT) {
    // Snap to the next sixteenth at or after the nominal spot, the same rule
    // run.cueAbilityReady applies — minus the output-latency lead, which is a
    // live-playback problem an offline render does not have.
    const sec = bpm ? Math.ceil(at / (beatSec / 4)) * (beatSec / 4) : at;
    const o = Math.floor(sec * SR);
    for (let i = 0; i < cueL.length && o + i < n; i++) { L[o + i] += cueL[i]; R[o + i] += cueR[i]; }
  }
  return { L, R };
}

// Fired as-is from the engine, for levelling only — not candidates.
const REFERENCES = ['shoot', 'power'];

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = Audio;
`;

async function main() {
  const argv = process.argv.slice(2);
  // `--over <wav>` mixes each cue onto a song bed. Dry, every candidate here is
  // audible; the question this tool exists to answer now is whether it survives
  // the music, and that cannot be answered by one cue alone in a file.
  const overAt = argv.indexOf('--over');
  const bedPath = overAt >= 0 ? argv[overAt + 1] : null;
  // `--grid <bpm>` places the cue on the bed's sixteenths instead of where it
  // falls, so the rhythm cabinet's behaviour can be heard against the same bed.
  const gridAt = argv.indexOf('--grid');
  const gridBpm = gridAt >= 0 ? Number(argv[gridAt + 1]) : 0;
  const drop = new Set([overAt, overAt + 1, gridAt, gridAt + 1].filter((i) => i >= 0));
  const args = argv.filter((_, i) => !drop.has(i));
  const bed = bedPath ? readWav(resolve(bedPath)) : null;
  if (bedPath && bed.sr !== SR) {
    console.error(`${bedPath}: ${bed.sr}Hz, expected ${SR}`);
    process.exit(1);
  }
  const names = args.length ? args : [...Object.keys(CANDIDATES), ...REFERENCES];
  for (const n of names) {
    if (!(n in CANDIDATES) && !REFERENCES.includes(n)) {
      console.error(`no candidate "${n}" — one of ${Object.keys(CANDIDATES).join(', ')}`);
      process.exit(1);
    }
  }

  let chromium;
  try { ({ chromium } = require('playwright')); } catch {
    console.error('playwright is required: npm install && npx playwright install chromium');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;

  const outDir = join(ROOT, 'work', 'auditions', 'ready');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // A fresh page per cue: Audio is a singleton and `ensure` binds one context for
  // its lifetime — the same reason tools/render-cues.js does it this way.
  for (const name of names) {
    const body = CANDIDATES[name] || null;
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(`<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
    const out = await page.evaluate(async ({ body, name, seconds, sr }) => {
      const A = window.__Audio;
      const ctx = new OfflineAudioContext(2, sr * seconds, sr);
      A.setCaptureEnabled(false);
      A.setNoiseSeed(1);
      A.ensure(ctx);
      if (A.mixer) await A.mixer.ready;
      // songTrim sits at silence until a bank opens it; a cue riding musicBus renders
      // as nothing at all unless it is opened by hand.
      A.songTrim.gain.cancelScheduledValues(0);
      A.songTrim.gain.setValueAtTime(1, 0);
      if (body) new Function('A', body)(A); else A.sfx(name);
      const buf = await ctx.startRendering();
      const L = Array.from(buf.getChannelData(0));
      const R = Array.from(buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0));
      let peak = 0; let last = 0;
      for (let i = 0; i < L.length; i++) {
        const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        if (a > peak) peak = a;
        if (a > 1e-4) last = i;
      }
      return { L, R, peak, tail: last / sr };
    }, { body, name, seconds: SECONDS, sr: SR });
    await page.close();
    for (const e of errors) console.error(`${name}: ${e}`);

    const L = Float32Array.from(out.L);
    const R = Float32Array.from(out.R);
    const label = body ? name : `ref-${name}`;
    const bedName = bed ? `-over-${bedPath.split('/').pop().replace(/\.wav$/, '')}` : '';
    const file = join(outDir, `${label}${bedName}${gridBpm ? '-on16th' : ''}.wav`);
    const mixed = bed ? mixOver(bed, L, R, gridBpm) : null;
    writeFileSync(file, wavBuffer(mixed ? [mixed.L, mixed.R] : [L, R], 1));
    // RMS over the cue's own length, not the padded render — see render-cues.js on
    // why peak is the wrong question when the shapes differ this much.
    const heard = Math.max(1, Math.ceil((out.tail + 0.05) * SR));
    let sum = 0;
    for (let i = 0; i < heard; i++) sum += (L[i] * L[i] + R[i] * R[i]) / 2;
    const rms = Math.sqrt(sum / heard);
    const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');
    // The cue's own peak and RMS, measured before the bed is added — mixing the
    // song in would report the song. `over` is the margin that actually matters:
    // how far the cue stands above the bed it has to be heard through.
    let over = '';
    if (bed) {
      const from = Math.floor(bed.frames * 0.3);
      let bsum = 0; const bn = Math.min(bed.frames - from, SR * 10);
      for (let i = 0; i < bn; i++) {
        const j = from + i;
        bsum += (bed.L[j] * bed.L[j] + bed.R[j] * bed.R[j]) / 2;
      }
      const bedRms = Math.sqrt(bsum / bn);
      over = `  over bed ${(20 * Math.log10(rms / bedRms)).toFixed(1).padStart(6)}dB`;
    }
    console.log(`${label.padEnd(12)} ${out.tail.toFixed(2)}s  peak ${db(out.peak).padStart(6)}`
      + `  rms ${db(rms).padStart(6)}${over}  ${file.replace(`${ROOT}/`, '')}`);
  }
  await browser.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
