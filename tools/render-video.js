// Offline MP4 render of a jukebox visualizer driven by a rendered music bank.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the
// build only bundles src/gate.js and src/main.js, and the dependency runs one
// way: this file imports from src/, never the reverse. Output lands in dist/,
// which is gitignored.
//
// The song comes from the GAME'S OWN ENGINE via tools/lib/render-bank-browser.js
// (the same render render-track.js writes, so the video's audio is byte-identical
// to the WAV audition — and it carries src/data/mix.js, which the old JS mirror
// could not see), and the picture comes from src/engine/visualizers.js in Chromium on
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
//   --size=WxH  render an arbitrary frame, cover-cropped   (e.g. 1080x1350, IG 4:5)
//   --fade=N    seconds of audio fade-out at the end       (default 0)
//   --ss=N      supersample factor, downsampled in-page    (default 2)
//   --pixel     draw at 480x270 and nearest-upscale instead of rendering native
//   --crf=N     x264 quality, lower is better              (default 12)
//   --seed=N    visualizer RNG seed                        (default 0x7042ade)
//   --frames=N  stop after N frames (smoke test)           (default whole song)
//   --workers=N parallel render workers                    (default min(4, cores-4))
//   --no-gpu    rasterize on CPU (fallback; ~5x slower)
//   --keep      leave the intermediate WAV directory on disk
//
// e.g.: node tools/render-video.js megamix "TOASTER SKY PARADE" dist/megamix-toasters.mp4
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, renameSync, existsSync } from 'fs';
import { tmpdir, cpus } from 'os';
import { join, dirname, basename, resolve } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer, SR } from './lib/wav.js';
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
const CRF = num('crf', 12);
const FADE = Math.max(0, num('fade', 0));

// --size=WxH renders to an arbitrary frame, e.g. 1080x1350 for an Instagram
// 4:5 post. The logical 480x270 frame is scaled to *cover* it and centred, so a
// portrait target crops the sides rather than distorting or letterboxing.
const sizeArg = typeof flags.size === 'string' ? /^(\d+)x(\d+)$/.exec(flags.size) : null;
if (flags.size && !sizeArg) {
  console.error(`--size must look like 1080x1350, got "${flags.size}"`);
  process.exit(1);
}
const SIZE = sizeArg ? { w: Number(sizeArg[1]), h: Number(sizeArg[2]) } : null;
if (SIZE && PIXEL) {
  console.error('--size and --pixel are incompatible: one crops to an arbitrary frame, the other preserves an integer nearest-neighbour upscale');
  process.exit(1);
}
if (SIZE && (SIZE.w % 2 || SIZE.h % 2)) {
  console.error(`--size must be even in both axes for yuv420p, got ${SIZE.w}x${SIZE.h}`);
  process.exit(1);
}
// In pixel mode the canvas stays logical and ffmpeg does the nearest upscale;
// otherwise the canvas is the finished frame and ffmpeg never resamples.
const OUT_W = SIZE ? SIZE.w : (PIXEL ? W : W * SCALE);
const OUT_H = SIZE ? SIZE.h : (PIXEL ? H : H * SCALE);
const SEED = num('seed', 0x7042ade) >>> 0;
// Each worker is a whole Chromium plus an x264 process, so leave the machine
// some headroom rather than saturating every core.
const WORKERS = Math.max(1, Math.round(num('workers', Math.min(4, Math.max(1, cpus().length - 4)))));

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
const { outL, outR, seconds, blocks, peak, percussion } = await renderBankBrowser(track.bank, {
  repeat: REPEAT, trackId: track.id,
});
// The analyser downstream wants one channel, the way the game's own AnalyserNode
// sees the master; the file itself stays stereo.
const pcm = new Float32Array(outL.length);
for (let i = 0; i < pcm.length; i++) pcm[i] = (outL[i] + outR[i]) / 2;
const norm = 1;                       // unity: the mix is the point — see render-track.js
const FRAMES = Math.min(Math.ceil(seconds * FPS), Math.round(num('frames', Infinity)) || Infinity);
console.log(`audio      ${seconds.toFixed(1)}s, peak ${peak.toFixed(3)}, ${blocks * 2} bars`);
console.log(`visualizer ${visualName} (#${visualIndex}), seed 0x${SEED.toString(16)}`);
console.log(`video      ${FRAMES} frames @ ${FPS}fps, ${OUT_W}x${OUT_H}`
  + (PIXEL ? ' (480x270 nearest-upscaled)' : `, drawn at ${OUT_W * SS}x${OUT_H * SS}`)
  + (SIZE ? `, cover-cropped from 16:9 (keeps ${(W * Math.max(OUT_W / W, OUT_H / H) > OUT_W ? OUT_W / Math.max(OUT_W / W, OUT_H / H) : W).toFixed(0)}/${W} logical px wide)` : ''));

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
function analyseSong(samples, bpm, percussionAt = []) {
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

  // The engine's own kit timeline, not a second guess at it: renderBankBrowser
  // hands back the times scheduleStep() queued while it laid the song down. Same
  // four-beat density window and two-beat drumless gap _readPercussion() uses.
  const hits = [...percussionAt].sort((a, b) => a - b);
  const beatSeconds = 60 / bpm;
  let hitAt = 0;
  let heardFrom = 0;

  const frames = [];
  let bass = 0;
  let mid = 0;
  let treble = 0;
  let level = 0;
  let peak = 0;
  let drums = 0;
  let hit = 0;
  for (let f = 0; f < FRAMES; f++) {
    const t = f / FPS;
    const end = Math.round(t * SR);
    // RMS over the unwindowed time-domain window, matching what the engine
    // reads out of getByteTimeDomainData(). The byte quantisation the live path
    // goes through is far below the resolution any of this drives.
    let square = 0;
    for (let i = 0; i < N; i++) {
      const at = end - N + i;
      const s = at >= 0 && at < samples.length ? samples[at] : 0;
      square += s * s;
    }
    const rms = Math.sqrt(square / N);
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
    // Loudness, same shape as musicAnalysis(): fast attack / slow release on the
    // level, a reference that jumps to new peaks and decays over ~30s, and a
    // perceptual square root on the ratio. A rendered clip has to slow down in
    // the same places the live jukebox does.
    level += (rms - level) * (rms > level ? 0.45 : 0.12);
    if (level > peak) peak = level;
    else peak += (level - peak) * 0.0006;
    const dynamics = peak > 0.01 ? Math.max(0, Math.min(1, Math.sqrt(level / peak))) : 0;

    // Two indices walking the same sorted list: `hitAt` is the playhead and
    // `heardFrom` the trailing edge of the four-beat window, so this stays O(1)
    // a frame instead of rescanning the song's hits every sixtieth of a second.
    const wasAt = hitAt;
    while (hitAt < hits.length && hits[hitAt] <= t) hitAt++;
    while (heardFrom < hitAt && hits[heardFrom] < t - beatSeconds * 4) heardFrom++;
    drums += (Math.min(1, (hitAt - heardFrom) / 4) - drums) * 0.08;
    const drumless = !(hitAt > 0 && hits[hitAt - 1] >= t - beatSeconds * 2);
    // The onset, mirroring _readPercussion(): the playhead advancing over a hit
    // IS the frame that hit is heard, which is the same test the engine makes
    // when its pending queue drains. Same 0.55 fall, so a preset choreographed
    // on `hit` cuts identically in a rendered clip and in the browser.
    hit = hitAt > wasAt ? 1 : hit * 0.55;

    const beat = (t * bpm) / 60;
    const beatPhase = ((beat % 1) + 1) % 1;
    frames.push({
      bass, mid, treble, level, dynamics, drums, drumless, hit, beat, beatPhase,
      beatPulse: Math.pow(1 - beatPhase, 5),
      spectrum: Array.from(spectrum),
    });
  }
  return frames;
}

console.log('analysing  song…');
const analysis = analyseSong(pcm, track.bank.bpm, percussion);
const avg = (key) => analysis.reduce((a, f) => a + f[key], 0) / analysis.length;
const max = (key) => analysis.reduce((a, f) => Math.max(a, f[key]), 0);
const min = (key) => analysis.reduce((a, f) => Math.min(a, f[key]), Infinity);
console.log(`           bass ${avg('bass').toFixed(2)}/${max('bass').toFixed(2)}  `
  + `mid ${avg('mid').toFixed(2)}/${max('mid').toFixed(2)}  `
  + `treble ${avg('treble').toFixed(2)}/${max('treble').toFixed(2)}  (mean/peak)`);
const drumlessFrames = analysis.filter((f) => f.drumless).length;
console.log(`           level ${avg('level').toFixed(3)}/${max('level').toFixed(3)}  `
  + `dynamics ${min('dynamics').toFixed(2)}-${max('dynamics').toFixed(2)} `
  + `(mean ${avg('dynamics').toFixed(2)})`);
console.log(`           kit ${percussion.length} hits, drums mean ${avg('drums').toFixed(2)}, `
  + `drumless ${(drumlessFrames / analysis.length * 100).toFixed(0)}% of the song`);

// ------------------------------------------------------------- scratch dir

const work = mkdtempSync(join(tmpdir(), 'mash-video-'));
const wavPath = join(work, 'song.wav');
writeFileSync(wavPath, wavBuffer([outL, outR], norm));

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

// The game's faces, on the same stylesheet src/gate.js injects at boot. Only
// EMERALD CODE RAIN draws real text, but it bakes a glyph atlas the first time
// it draws, so the face has to be resident before any frame is rendered or the
// whole clip keeps the fallback.
const GAME_FONT_URL = 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400..600&family=Permanent+Marker&display=swap';
const GAME_FONT_FACES = ["400 32px 'Lilita One'", "500 12px 'Fredoka'", "400 12px 'Permanent Marker'"];

const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${GAME_FONT_URL}">
<style>html,body{margin:0;background:#000}</style>
<script>${bundleJs.replace(/<\/script>/g, '<\\/script>')}<\/script>`;

// Headless Chromium defaults to rasterizing Canvas2D on the CPU (SwiftShader),
// which for a 4K canvas full of gradients and sprite blits is by far the most
// expensive thing this tool does — enabling the real GPU measured ~5.6x faster
// end to end. --no-gpu falls back for machines where ANGLE/Metal is unavailable.
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
const USE_GPU = flags.gpu !== 'false' && !flags['no-gpu'];

// The visualizer integrates state in update() and draws from it without ever
// writing back — no RNG draws, no mutation in draw() or its helpers. So a
// worker can reach any frame by replaying update() alone and will land in
// exactly the state a serial run would have. Replay costs ~0.01ms/frame
// against ~50-250ms to draw one, which is what makes splitting the song into
// independent ranges practically free.
async function renderRange(from, to, segmentPath, onProgress) {
  const browser = await chromium.launch({ args: USE_GPU ? GPU_ARGS : [] });
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  await page.setContent(html, { waitUntil: 'load' });
  // Offline or a slow font response falls back rather than failing the render:
  // a clip in Trebuchet beats no clip at all.
  await page.evaluate((faces) => Promise.all(faces.map((face) => document.fonts.load(face).catch(() => {}))), GAME_FONT_FACES);

  await page.evaluate(({ index, seed, bpm, fps, w, h, outW, outH, ss, skip }) => {
    // The visualizer draws in logical 480x270 coordinates. Scaling the context
    // instead of the finished bitmap means its gradients, strokes and 8x-baked
    // prop sprites are all rasterized at output resolution — the same drawing
    // code, just never asked to squeeze itself into 480x270 first.
    const draw = document.createElement('canvas');
    draw.width = outW * ss;
    draw.height = outH * ss;
    const dctx = draw.getContext('2d', { alpha: false });
    // Cover, not stretch: scale by the larger ratio and centre the overflow, so
    // a portrait frame crops the sides instead of distorting the art. For a
    // 16:9 target both ratios are equal and this is a plain uniform scale.
    const fit = Math.max(draw.width / w, draw.height / h);
    dctx.setTransform(fit, 0, 0, fit, (draw.width - w * fit) / 2, (draw.height - h * fit) / 2);
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
    const advance = (a) => {
      a.spectrum = Uint8Array.from(a.spectrum);
      vis.update(dt, a);
    };
    // Replay this worker's lead-in without drawing.
    for (const a of skip) advance(a);

    // One discarded frame. Chromium rasterizes a canvas's very first draw on a
    // different path — the surface is only promoted to GPU acceleration once it
    // has been drawn to — so without this a worker's opening frame differs from
    // the serial render by a few subpixels. Warming the destination makes the
    // parallel output bit-identical (measured: 0 differing subpixels, where an
    // unwarmed worker differed on ~70). draw() writes no state, so this costs
    // one frame and changes nothing.
    dctx.fillStyle = '#000';
    dctx.fillRect(0, 0, w, h);
    vis.draw(dctx);
    if (ss !== 1) octx.drawImage(draw, 0, 0, outW, outH);

    // One batch of frames per round trip: stepping and PNG-encoding in the page
    // keeps the CDP traffic to the encoded images instead of raw pixels.
    window.__batch = (chunk) => {
      const pngs = [];
      for (const a of chunk) {
        advance(a);
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
    // Lead-in frames are replayed inside the page so only this worker's own
    // range crosses the bridge as images.
    skip: analysis.slice(0, from),
  });

  // ffmpeg is started before the first frame and fed over a pipe, so encoding
  // overlaps capture and a 1080p render never lands on disk as a PNG pile.
  const ff = spawn('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
    // Nearest-neighbour keeps an integer upscale pixel-exact rather than soft.
    ...(PIXEL ? ['-vf', `scale=${W * SCALE}:${H * SCALE}:flags=neighbor`] : []),
    // -tune animation is aimed squarely at flat cel-style content like this:
    // stronger deblocking across the big smooth sky gradient (which is where
    // 8-bit banding would otherwise show) without eating the hard vector edges.
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(CRF),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-an', '-f', 'mp4', segmentPath,
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
  let bytes = 0;
  for (let i = from; i < to; i += BATCH) {
    const pngs = await page.evaluate((c) => window.__batch(c), analysis.slice(i, Math.min(i + BATCH, to)));
    for (const png of pngs) {
      const buf = Buffer.from(png, 'base64');
      bytes += buf.length;
      await write(buf);
    }
    onProgress(pngs.length);
  }
  await browser.close();

  ff.stdin.end();
  const status = await ffDone;
  if (status !== 0) throw new Error(`ffmpeg failed (${ffError ? ffError.message : `exit ${status}`})`);
  return bytes;
}

// ------------------------------------------------------------------ encode

mkdirSync(dirname(OUT), { recursive: true });

// An mp4 has no moov atom until the encode finishes, so the destination would
// otherwise hold an unopenable file for the whole render — and a previous good
// version would be gone from the first byte. Encode beside it and rename into
// place only on success; same directory, so the rename is atomic.
const PARTIAL = join(dirname(OUT), `.${basename(OUT)}.partial`);

// Ranges are contiguous and equal; every segment opens on its own IDR, so the
// concat demuxer can stitch them without re-encoding.
const bounds = [0];
for (let k = 1; k <= WORKERS; k++) bounds.push(Math.round((FRAMES * k) / WORKERS));
const ranges = [];
for (let k = 0; k < WORKERS; k++) {
  if (bounds[k + 1] > bounds[k]) {
    ranges.push({ from: bounds[k], to: bounds[k + 1], path: join(work, `seg${k}.mp4`) });
  }
}
console.log(`workers    ${ranges.length}${USE_GPU ? ', GPU rasterization' : ', CPU rasterization'}`);

let drawn = 0;
let bytes = 0;
const startedAt = process.hrtime.bigint();
const tick = (n) => {
  drawn += n;
  const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e9;
  const eta = (elapsed / drawn) * (FRAMES - drawn);
  process.stdout.write(`\rframes     ${drawn}/${FRAMES} (${((drawn / FRAMES) * 100).toFixed(1)}%) `
    + `${(drawn / elapsed).toFixed(1)} fps, eta ${eta.toFixed(0)}s   `);
};

try {
  const sizes = await Promise.all(ranges.map((r) => renderRange(r.from, r.to, r.path, tick)));
  bytes = sizes.reduce((a, b) => a + b, 0);
} catch (err) {
  cleanup();
  console.error(`\n${err.message}`);
  process.exit(1);
}
process.stdout.write(`\rframes     ${drawn}/${FRAMES} drawn, ${(bytes / 1e6).toFixed(0)}MB piped`
  + ' '.repeat(24) + '\n');

// Stitch the segments and mux the song in. -c:v copy means the video is never
// re-encoded here, so joining costs seconds and loses nothing.
console.log('encoding   joining segments + muxing audio…');
const listPath = join(work, 'segments.txt');
writeFileSync(listPath, ranges.map((r) => `file '${r.path}'\n`).join(''));
const mux = spawn('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', listPath,
  '-i', wavPath,
  '-c:v', 'copy',
  // Cutting a song short lands mid-waveform, which clicks. A short fade over
  // the tail costs nothing musically and removes it.
  ...(FADE > 0 ? ['-af', `afade=t=out:st=${Math.max(0, FRAMES / FPS - FADE).toFixed(3)}:d=${FADE}`] : []),
  '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
  '-movflags', '+faststart', '-shortest',
  '-f', 'mp4', PARTIAL,
], { stdio: ['ignore', 'inherit', 'inherit'] });
const status = await new Promise((done) => {
  mux.on('error', () => done(-1));
  mux.on('close', (code) => done(code));
});

cleanup();
if (status !== 0) {
  rmSync(PARTIAL, { force: true });
  console.error(`ffmpeg mux failed (exit ${status})`);
  process.exit(1);
}
if (!existsSync(PARTIAL)) {
  console.error('ffmpeg reported success but wrote no file');
  process.exit(1);
}
renameSync(PARTIAL, OUT);
console.log(`\nwrote      ${OUT}`);
