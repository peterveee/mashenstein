// Offline MP4 render of a jukebox visualiser driven by a rendered music bank.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the
// build only bundles src/gate.js and src/main.js, and the dependency runs one
// way: this file imports from src/, never the reverse. Output lands in dist/,
// which is gitignored.
//
// The song comes from the GAME'S OWN ENGINE via tools/lib/render-bank-browser.js
// (the same render render-track.js writes, so the video's audio is byte-identical
// to the WAV audition — and it carries src/data/mix.js, which the old JS mirror
// could not see), and the picture comes from src/engine/visualisers.js in Chromium on
// a real 480x270 Canvas2D — the same surface the game draws to. Frames are
// stepped at a fixed dt instead of wall-clock, so the render is deterministic
// and never drops a frame no matter how slow the capture is.
//
// The visualiser's beat/bass/mid/treble reactions come from an offline
// reimplementation of the engine's AnalyserNode readout (analyseSong in
// tools/lib/song-analysis.js), fed the actual rendered samples. So the toasters
// react to the mix rather than to a stand-in clock. That module is shared with
// the file-driven visualiser page rather than copied into it — a hand-maintained
// mirror is what got tools/lib/render-bank.js deleted.
//
// Resolution: by default the canvas is --scale x the logical 480x270 and the
// context is scaled to match, so every path, gradient and prop is rasterized at
// the output resolution. That matters because none of this art is pixel art —
// props are vector painters baked at 8x (props.js SS), and the sky is a
// gradient — so drawing small and upscaling throws away detail the painters
// would happily have drawn. --pixel opts back into the game's own look: draw at
// 480x270 and upscale with nearest neighbour.
//
// Usage: node tools/render-video.js [trackId] [visualiser] [outPath] [--flags]
//   trackId     megamix | hub | title | finale | shop | cabinet id  (default megamix)
//   visualiser  name or index into VISUALISER_NAMES        (default TOASTER SKY PARADE)
//   --repeat=N  times to walk the song form                (default 1)
//   --fps=N     video frame rate                           (default 60)
//   --scale=N   resolution multiple of 480x270             (default 4 -> 1920x1080)
//   --size=WxH  render an arbitrary frame, cover-cropped   (e.g. 1080x1350, IG 4:5)
//   --fade=N    seconds of audio fade-out at the end       (default 0)
//   --ss=N      supersample factor, downsampled in-page    (default 2)
//   --pixel     draw at 480x270 and nearest-upscale instead of rendering native
//   --crf=N     x264 quality, lower is better              (default 12)
//   --seed=N    visualiser RNG seed                        (default 0x7042ade)
//   --frames=N  stop after N frames (smoke test)           (default whole song)
//   --workers=N parallel render workers                    (default min(4, cores-4))
//   --no-gpu    rasterize on CPU (fallback; ~5x slower)
//   --keep      leave the intermediate WAV directory on disk
//
// e.g.: node tools/render-video.js megamix "TOASTER SKY PARADE" work/video/megamix-toasters.mp4
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, renameSync, existsSync } from 'fs';
import { tmpdir, cpus } from 'os';
import { join, dirname, basename, resolve } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { analyseSong } from './lib/song-analysis.js';
import { wavBuffer, SR } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';
import { VISUALISER_NAMES } from '../src/engine/visualisers.js';

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
// The tempo the song is PLAYED at, which is what the beat clock has to run on: the
// visualisers pulse off it, and a song the desk retuned would otherwise flash against
// its own downbeats for the whole video. See bpmOf.
const BPM = bpmOf(track.bank, track.id);
const visualIndex = /^\d+$/.test(String(visualArg))
  ? Number(visualArg) % VISUALISER_NAMES.length
  : VISUALISER_NAMES.indexOf(String(visualArg).toUpperCase());
if (visualIndex < 0) {
  console.error(`unknown visualiser "${visualArg}" — try one of:\n  ${VISUALISER_NAMES.join('\n  ')}`);
  process.exit(1);
}
const visualName = VISUALISER_NAMES[visualIndex];
const visualSlug = visualName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const OUT = resolve(ROOT, outArg || `work/video/${track.slug}-${visualSlug}.mp4`);

// ------------------------------------------------------------------- audio

console.log(`track      ${track.title} (${track.id}), ${REPEAT}x form`);
// The song's own start bar and loop, like render-track.js, so the video's audio is
// still byte-identical to the bounce. `--no-loop` walks the whole form instead.
const SONG_LOOP = !process.argv.includes('--no-loop');
const { outL, outR, seconds, blocks, peak, percussion, loop } = await renderBankBrowser(track.bank, {
  repeat: REPEAT, trackId: track.id, songLoop: SONG_LOOP,
});
// The analyser downstream wants one channel, the way the game's own AnalyserNode
// sees the master; the file itself stays stereo.
const pcm = new Float32Array(outL.length);
for (let i = 0; i < pcm.length; i++) pcm[i] = (outL[i] + outR[i]) / 2;
const norm = 1;                       // unity: the mix is the point — see render-track.js
const FRAMES = Math.min(Math.ceil(seconds * FPS), Math.round(num('frames', Infinity)) || Infinity);
console.log(`audio      ${seconds.toFixed(1)}s, peak ${peak.toFixed(3)}, `
  + (loop?.loop
    ? `in on bar ${loop.start / 16 + 1}, then ${REPEAT} × bars ${loop.loop.start / 16 + 1}-${loop.loop.end / 16}`
    : `${blocks * 2} bars`));
console.log(`visualiser ${visualName} (#${visualIndex}), seed 0x${SEED.toString(16)}`);
console.log(`video      ${FRAMES} frames @ ${FPS}fps, ${OUT_W}x${OUT_H}`
  + (PIXEL ? ' (480x270 nearest-upscaled)' : `, drawn at ${OUT_W * SS}x${OUT_H * SS}`)
  + (SIZE ? `, cover-cropped from 16:9 (keeps ${(W * Math.max(OUT_W / W, OUT_H / H) > OUT_W ? OUT_W / Math.max(OUT_W / W, OUT_H / H) : W).toFixed(0)}/${W} logical px wide)` : ''));

console.log('analysing  song…');
const analysis = analyseSong(pcm, BPM, percussion, { fps: FPS, frames: FRAMES, sampleRate: SR });
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
import { createVisualiser } from ${JSON.stringify(join(ROOT, 'src/engine/visualisers.js'))};
window.__mkVisualiser = (index, seed, track) => createVisualiser(index, seed, track);
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

// The visualiser integrates state in update() and draws from it without ever
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
    // The visualiser draws in logical 480x270 coordinates. Scaling the context
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

    const vis = window.__mkVisualiser(index, seed, { bpm });
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
    index: visualIndex, seed: SEED, bpm: BPM, fps: FPS,
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
