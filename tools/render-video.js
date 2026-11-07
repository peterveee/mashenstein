// Offline MP4 render of a jukebox visualiser driven by a rendered music bank.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the
// build only bundles src/gate.js and src/main.js, and the dependency runs one
// way: this file imports from src/, never the reverse. Output lands in
// work/video/, which is gitignored.
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
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir, cpus } from 'os';
import { join, dirname, resolve } from 'path';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { analyseSong } from './lib/song-analysis.js';
import { wavBuffer, SR } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';
import { renderVisualiserVideo } from './lib/visualiser-render.js';
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

// --------------------------------------------------------- shared renderer

mkdirSync(dirname(OUT), { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'mash-video-'));
const wavPath = join(work, 'song.wav');
writeFileSync(wavPath, wavBuffer([outL, outR], norm));
const cleanup = () => {
  if (!flags.keep) rmSync(work, { recursive: true, force: true });
  else console.log(`kept       ${work}`);
};

const startedAt = process.hrtime.bigint();
let drawn = 0;
try {
  const rendered = await renderVisualiserVideo({
    analysis, audioPath: wavPath, visualIndex, seed: SEED, bpm: BPM, fps: FPS,
    startFrame: 0, frameCount: FRAMES, outW: PIXEL ? W : OUT_W, outH: PIXEL ? H : OUT_H,
    ss: SS, pixel: PIXEL, pixelScale: SCALE, crf: CRF, workers: WORKERS, fade: FADE,
    noGpu: !!flags['no-gpu'] || flags.gpu === 'false', keep: !!flags.keep, out: OUT,
    onProgress: (n) => {
      drawn += n;
      const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const eta = drawn ? (elapsed / drawn) * (FRAMES - drawn) : 0;
      process.stdout.write(`\rframes     ${drawn}/${FRAMES} (${((drawn / FRAMES) * 100).toFixed(1)}%) `
        + `${(drawn / elapsed).toFixed(1)} fps, eta ${eta.toFixed(0)}s   `);
    },
  });
  process.stdout.write(`\rframes     ${drawn}/${FRAMES} complete\n`);
  console.log(`\nwrote      ${rendered.out}`);
} catch (err) {
  console.error(`\n${err.message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
