// Offline MP4 render of a jukebox visualizer driven by a rendered music bank.
//
// The song comes from tools/lib/render-bank.js (the same DSP render-track.js
// uses, so the video's audio is byte-identical to the WAV audition), and the
// picture comes from src/engine/visualizers.js running in headless Chromium on
// a real 480x270 Canvas2D — the same surface the game draws to. Frames are
// stepped at a fixed dt instead of wall-clock, so the render is deterministic
// and never drops a frame no matter how slow the capture is.
//
// The visualizer's beat/bass/mid/treble reactions come from an offline
// reimplementation of the engine's AnalyserNode readout (see analyseSong
// below), fed the actual rendered samples. So the toasters react to the mix
// rather than to a stand-in clock.
//
// Resolution: by default the canvas is --scale x the logical 480x270 and the
// context is scaled to match, so every path, gradient and prop is rasterized at
// the output resolution. That matters because none of this art is pixel art —
// props are vector painters baked at 8x (props.js SS), and the sky is a
// gradient — so drawing small and upscaling throws away detail the painters
// would happily have drawn. --pixel opts back into the game's own look: draw at
// 480x270 and upscale with nearest neighbour.
//
// Usage: node tools/render-video.js [trackId] [visualizer] [outPath] [--flags]
//   trackId     megamix | hub | title | finale | shop | cabinet id  (default megamix)
//   visualizer  name or index into VISUALIZER_NAMES        (default TOASTER SKY PARADE)
//   --repeat=N  times to walk the song form                (default 1)
//   --fps=N     video frame rate                           (default 60)
//   --scale=N   resolution multiple of 480x270             (default 4 -> 1920x1080)
//   --ss=N      supersample factor, downsampled in-page    (default 2)
//   --pixel     draw at 480x270 and nearest-upscale instead of rendering native
//   --crf=N     x264 quality, lower is better              (default 14)
//   --seed=N    visualizer RNG seed                        (default 0x7042ade)
//   --frames=N  stop after N frames (smoke test)           (default whole song)
//   --keep      leave the intermediate WAV directory on disk
//
// e.g.: node tools/render-video.js megamix "TOASTER SKY PARADE" dist/megamix-toasters.mp4
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, resolve } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { renderBank, wavBuffer, SR } from './lib/render-bank.js';
import { resolveOrExit } from './lib/tracks.js';
import { VISUALIZER_NAMES } from '../src/engine/visualizers.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const W = 480;
const H = 270;

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (const arg of argv) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
  else positional.push(arg);
}
const num = (key, fallback) => {
  const v = flags[key];
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const [trackId = 'megamix', visualArg = 'TOASTER SKY PARADE', outArg = null] = positional;
const REPEAT = Math.max(1, Math.round(num('repeat', 1)));
const FPS = Math.max(1, Math.round(num('fps', 60)));
const SCALE = Math.max(1, Math.round(num('scale', 4)));
const PIXEL = !!flags.pixel;
const SS = PIXEL ? 1 : Math.max(1, Math.round(num('ss', 2)));
const CRF = num('crf', 14);
// In pixel mode the canvas stays logical and ffmpeg does the nearest upscale;
// otherwise the canvas is the finished frame and ffmpeg never resamples.
const OUT_W = PIXEL ? W : W * SCALE;
const OUT_H = PIXEL ? H : H * SCALE;
const SEED = num('seed', 0x7042ade) >>> 0;

const track = resolveOrExit(trackId);
const visualIndex = /^\d+$/.test(String(visualArg))
  ? Number(visualArg) % VISUALIZER_NAMES.length
  : VISUALIZER_NAMES.indexOf(String(visualArg).toUpperCase());
if (visualIndex < 0) {
  console.error(`unknown visualizer "${visualArg}" — try one of:\n  ${VISUALIZER_NAMES.join('\n  ')}`);
  process.exit(1);
}
const visualName = VISUALIZER_NAMES[visualIndex];
const visualSlug = visualName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const OUT = resolve(ROOT, outArg || `dist/${track.slug}-${visualSlug}.mp4`);

// ------------------------------------------------------------------- audio

console.log(`track      ${track.title} (${track.id}), ${REPEAT}x form`);
const { out: pcm, seconds, blocks, peak } = renderBank(track.bank, { repeat: REPEAT });
const norm = peak > 0 ? 0.9 / peak : 1;
const FRAMES = Math.min(Math.ceil(seconds * FPS), Math.round(num('frames', Infinity)) || Infinity);
console.log(`audio      ${seconds.toFixed(1)}s, peak ${peak.toFixed(3)}, ${blocks * 2} bars`);
console.log(`visualizer ${visualName} (#${visualIndex}), seed 0x${SEED.toString(16)}`);
console.log(`video      ${FRAMES} frames @ ${FPS}fps, ${W * SCALE}x${H * SCALE}`
  + (PIXEL ? ' (480x270 nearest-upscaled)' : `, drawn at ${OUT_W * SS}x${OUT_H * SS}`));

// -------------------------------------------------------- offline analysis

// In-place iterative radix-2 FFT.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const xr = re[i + k + half];
        const xi = im[i + k + half];
        const vr = xr * cr - xi * ci;
        const vi = xr * ci + xi * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/**
 * Reproduce Audio.musicAnalysis() offline, one step per video frame.
 *
 * The engine reads a 256-point AnalyserNode (smoothingTimeConstant 0.72) once
 * per rendered frame, so a per-frame step over the rendered samples lands on
 * the same numbers the jukebox screensaver sees. Everything here mirrors the
 * Web Audio spec: Blackman window, magnitudes normalised by fftSize, exponential
 * smoothing on the linear magnitudes, then dB mapped across [-100, -30] to 0..255.
 * `beat` comes from the bank's own tempo, matching songBeat()'s procedural clock.
 */
function analyseSong(samples, bpm) {
  const N = 256;             // engine's songAnalyser.fftSize
  const BINS = N / 2;
  const TAU_SMOOTH = 0.72;   // engine's smoothingTimeConstant
  const MIN_DB = -100;
  const MAX_DB = -30;
  const nyquist = SR / 2;

  const window = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    window[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / N) + 0.08 * Math.cos((4 * Math.PI * i) / N);
  }

  const smoothed = new Float64Array(BINS);
  const spectrum = new Uint8Array(BINS);
  const re = new Float64Array(N);
  const im = new Float64Array(N);

  // _analysisBand(lo, hi): mean of the byte bins covering [lo, hi), /255.
  const bandRange = (lo, hi) => {
    const a = Math.max(0, Math.floor((lo / nyquist) * BINS));
    const b = Math.min(BINS, Math.max(a + 1, Math.ceil((hi / nyquist) * BINS)));
    return [a, b];
  };
  const BASS = bandRange(55, 240);
  const MID = bandRange(240, 2200);
  const TREBLE = bandRange(2200, 9000);
  const band = ([a, b]) => {
    let sum = 0;
    for (let i = a; i < b; i++) sum += spectrum[i];
    return sum / ((b - a) * 255);
  };

  const frames = [];
  let bass = 0;
  let mid = 0;
  let treble = 0;
  for (let f = 0; f < FRAMES; f++) {
    const t = f / FPS;
    const end = Math.round(t * SR);
    for (let i = 0; i < N; i++) {
      const at = end - N + i;
      re[i] = (at >= 0 && at < samples.length ? samples[at] : 0) * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < BINS; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / N;
      smoothed[k] = TAU_SMOOTH * smoothed[k] + (1 - TAU_SMOOTH) * mag;
      const db = smoothed[k] > 0 ? 20 * Math.log10(smoothed[k]) : MIN_DB;
      const scaled = (255 * (db - MIN_DB)) / (MAX_DB - MIN_DB);
      spectrum[k] = Math.max(0, Math.min(255, Math.round(scaled)));
    }
    // The extra feature-level one-pole from musicAnalysis().
    bass += (band(BASS) - bass) * 0.34;
    mid += (band(MID) - mid) * 0.30;
    treble += (band(TREBLE) - treble) * 0.38;

    const beat = (t * bpm) / 60;
    const beatPhase = ((beat % 1) + 1) % 1;
    frames.push({
      bass, mid, treble, beat, beatPhase,
      beatPulse: Math.pow(1 - beatPhase, 5),
      spectrum: Array.from(spectrum),
    });
  }
  return frames;
}

console.log('analysing  song…');
const analysis = analyseSong(pcm, track.bank.bpm);
const avg = (key) => analysis.reduce((a, f) => a + f[key], 0) / analysis.length;
const max = (key) => analysis.reduce((a, f) => Math.max(a, f[key]), 0);
console.log(`           bass ${avg('bass').toFixed(2)}/${max('bass').toFixed(2)}  `
  + `mid ${avg('mid').toFixed(2)}/${max('mid').toFixed(2)}  `
  + `treble ${avg('treble').toFixed(2)}/${max('treble').toFixed(2)}  (mean/peak)`);

// ------------------------------------------------------------- scratch dir

const work = mkdtempSync(join(tmpdir(), 'mash-video-'));
const wavPath = join(work, 'song.wav');
writeFileSync(wavPath, wavBuffer(pcm, norm));

const cleanup = () => {
  if (!flags.keep) rmSync(work, { recursive: true, force: true });
  else console.log(`kept       ${work}`);
};

// ------------------------------------------------- bundle the browser shim

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const entry = join(work, 'entry.js');
writeFileSync(entry, `
import { createVisualizer } from ${JSON.stringify(join(ROOT, 'src/engine/visualizers.js'))};
window.__mkVisualizer = (index, seed, track) => createVisualizer(index, seed, track);
`);
const bundle = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,
  write: false,
  logLevel: 'silent',
});
const bundleJs = bundle.outputFiles[0].text;

// ------------------------------------------------------------ draw frames

// Playwright is a devDependency, but resolve it leniently so a fresh checkout
// that only ran `npm i --omit=dev` still gets a useful error.
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('playwright is required: npm install');
  cleanup();
  process.exit(1);
}

const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000}</style>
<script>${bundleJs.replace(/<\/script>/g, '<\\/script>')}<\/script>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
await page.setContent(html, { waitUntil: 'load' });

await page.evaluate(({ index, seed, bpm, fps, w, h, outW, outH, ss }) => {
  // The visualizer draws in logical 480x270 coordinates. Scaling the context
  // instead of the finished bitmap means its gradients, strokes and 8x-baked
  // prop sprites are all rasterized at output resolution — the same drawing
  // code, just never asked to squeeze itself into 480x270 first.
  const draw = document.createElement('canvas');
  draw.width = outW * ss;
  draw.height = outH * ss;
  const dctx = draw.getContext('2d', { alpha: false });
  dctx.scale(draw.width / w, draw.height / h);
  dctx.lineJoin = 'round';
  dctx.lineCap = 'round';
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';

  // Supersampling is resolved here rather than in ffmpeg so the extra pixels
  // never cross the CDP bridge — only the finished frame does.
  const out = ss === 1 ? draw : document.createElement('canvas');
  let octx = dctx;
  if (ss !== 1) {
    out.width = outW;
    out.height = outH;
    octx = out.getContext('2d', { alpha: false });
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
  }

  const vis = window.__mkVisualizer(index, seed, { bpm });
  const dt = 1 / fps;
  // One batch of frames per round trip: stepping and PNG-encoding in the page
  // keeps the CDP traffic to the encoded images instead of raw pixels.
  window.__batch = (chunk) => {
    const pngs = [];
    for (const a of chunk) {
      a.spectrum = Uint8Array.from(a.spectrum);
      vis.update(dt, a);
      dctx.fillStyle = '#000';
      dctx.fillRect(0, 0, w, h);
      vis.draw(dctx);
      if (ss !== 1) octx.drawImage(draw, 0, 0, outW, outH);
      pngs.push(out.toDataURL('image/png').slice('data:image/png;base64,'.length));
    }
    return pngs;
  };
}, {
  index: visualIndex, seed: SEED, bpm: track.bank.bpm, fps: FPS,
  w: W, h: H, outW: OUT_W, outH: OUT_H, ss: SS,
});

// ------------------------------------------------------------------ encode

// ffmpeg is started before the first frame and fed over a pipe, so encoding
// overlaps capture and a 1080p render never lands on disk as a PNG pile.
mkdirSync(dirname(OUT), { recursive: true });
const ff = spawn('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  '-i', wavPath,
  // Nearest-neighbour keeps an integer upscale pixel-exact rather than soft.
  ...(PIXEL ? ['-vf', `scale=${W * SCALE}:${H * SCALE}:flags=neighbor`] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF),
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
  '-movflags', '+faststart', '-shortest',
  OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });

let ffError = null;
const ffDone = new Promise((done) => {
  ff.on('error', (err) => { ffError = err; done(-1); });
  ff.on('close', (code) => done(code));
});
ff.stdin.on('error', (err) => { ffError = ffError || err; });

const write = (buf) => new Promise((done, fail) => {
  if (ffError) { fail(ffError); return; }
  if (ff.stdin.write(buf)) done();
  else ff.stdin.once('drain', done);
});

const BATCH = 20;
let drawn = 0;
let bytes = 0;
const startedAt = process.hrtime.bigint();
for (let i = 0; i < FRAMES; i += BATCH) {
  const pngs = await page.evaluate((c) => window.__batch(c), analysis.slice(i, i + BATCH));
  for (const png of pngs) {
    const buf = Buffer.from(png, 'base64');
    bytes += buf.length;
    await write(buf);
  }
  drawn += pngs.length;
  const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e9;
  const eta = (elapsed / drawn) * (FRAMES - drawn);
  process.stdout.write(`\rframes     ${drawn}/${FRAMES} (${((drawn / FRAMES) * 100).toFixed(1)}%) `
    + `${(drawn / elapsed).toFixed(1)} fps, eta ${eta.toFixed(0)}s   `);
}
process.stdout.write(`\rframes     ${drawn}/${FRAMES} drawn, ${(bytes / 1e6).toFixed(0)}MB piped`
  + ' '.repeat(24) + '\n');
await browser.close();

console.log('encoding   flushing ffmpeg…');
ff.stdin.end();
const status = await ffDone;

cleanup();
if (status !== 0) {
  console.error(`ffmpeg failed (${ffError ? ffError.message : `exit ${status}`})`);
  process.exit(1);
}
if (!existsSync(OUT)) {
  console.error('ffmpeg reported success but wrote no file');
  process.exit(1);
}
console.log(`\nwrote      ${OUT}`);
