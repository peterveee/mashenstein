// Offline MP4 render of a silent drone flyby over a star field.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the
// dependency runs one way (this file imports from src/), and output lands in
// work/social/ alongside the other social exports, which is gitignored.
//
// The picture is the game's own droneEye prop painter running in headless
// Chromium on a real Canvas2D, so what flies past is the same art the lane
// draws, not a stand-in. Frames are stepped at a fixed dt rather than
// wall-clock, so the render is deterministic and never drops one.
//
// The piece is a count escalation in four acts: one drone crosses alone, then
// two, then the sky fills, then it fades to black. Silent by design — ffmpeg is
// given -an and no audio is rendered at all, so there is no bank to wait for and
// no mux step.
//
// Resolution: none of this art is pixel art. Props are vector painters baked at
// 8x (props.js SS), so the canvas is sized to the OUTPUT and the context is
// scaled to match — the same logical 480x270 drawing code, rasterized at 1080p.
// --pixel opts back into the game's own presentation (draw small, nearest
// upscale).
//
// Usage: node tools/render-drones.js [outPath] [--flags]
//   --seconds=N   total length                            (default 18)
//   --fps=N       frame rate                              (default 60)
//   --scale=N     resolution multiple of 480x270           (default 4 -> 1920x1080)
//   --size=WxH    arbitrary frame, REFRAMED not cropped (see LOG_H below)
//   --zoom=N      push the camera in; everything drawn N x larger  (default 1)
//   --ss=N        supersample factor, downsampled in-page  (default 2)
//   --pixel       draw at 480x270 and nearest-upscale
//   --crf=N       x264 quality, lower is better            (default 12)
//   --seed=N      star field + flight path RNG seed        (default 0x7042ade)
//   --frames=N    stop after N frames (smoke test)
//   --no-gpu      fall back to software rasterization
//
// e.g.: node tools/render-drones.js work/social/drone-swarm.mp4 --seconds=20
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, statSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, resolve, basename } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
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

const SECONDS = Math.max(1, num('seconds', 18));
const FPS = Math.max(1, Math.round(num('fps', 60)));
const SCALE = Math.max(1, Math.round(num('scale', 4)));
const PIXEL = !!flags.pixel;
const SS = PIXEL ? 1 : Math.max(1, Math.round(num('ss', 2)));
const CRF = num('crf', 12);
const SEED = num('seed', 0x7042ade) >>> 0;

const sizeArg = typeof flags.size === 'string' ? /^(\d+)x(\d+)$/.exec(flags.size) : null;
if (flags.size && !sizeArg) {
  console.error(`--size must look like 1080x1350, got "${flags.size}"`);
  process.exit(1);
}
const SIZE = sizeArg ? { w: Number(sizeArg[1]), h: Number(sizeArg[2]) } : null;
if (SIZE && PIXEL) {
  console.error('--size and --pixel are incompatible: one reframes the scene, the other preserves an integer nearest-neighbour upscale');
  process.exit(1);
}
if (SIZE && (SIZE.w % 2 || SIZE.h % 2)) {
  console.error(`--size must be even in both axes for yuv420p, got ${SIZE.w}x${SIZE.h}`);
  process.exit(1);
}
const OUT_W = SIZE ? SIZE.w : (PIXEL ? W : W * SCALE);
const OUT_H = SIZE ? SIZE.h : (PIXEL ? H : H * SCALE);

// --size REFRAMES rather than crops, which is where this tool deliberately parts
// company with render-video.js.
//
// That tool cover-crops the logical 480x270 into the target, and its own notes
// say why that is the right default there and the wrong one here: cropping suits
// radial compositions, where shards leaving frame reads as energy, and suits
// "wide travelling compositions" badly, because the horizontal spread IS the
// composition. This scene is nothing but horizontal travel — a 4:5 crop keeps
// 216 of 480 logical px and 9:16 keeps 152, so every crossing would be cut to a
// third of its length and the whole one-then-two-then-many escalation would
// happen mostly off-frame.
//
// So the logical WIDTH is held at 480 and the logical HEIGHT is derived from the
// output aspect. Crossing distances, speeds and pacing are therefore identical
// at every aspect, and a taller frame spends its extra room on what a portrait
// cut actually wants: more sky for the swarm to spread through.
// --zoom pushes the camera in: the logical viewport shrinks by that factor, so
// everything in it — drones, stars, parallax — is drawn that much larger. It is
// a real zoom rather than a prop-size multiplier, so the scene keeps its own
// proportions instead of turning into big drones over an unchanged sky.
//
// Crossing TIMES are unaffected, because speed is solved from the frame width
// (`(w + dw*2) / cross`); a narrower frame simply needs less speed to cross in
// the same seconds. Star and swarm counts follow the area, so a zoomed frame
// holds proportionally fewer of both at the same on-screen density — the sky
// looks as full as before, with everything in it bigger.
const ZOOM = Math.max(1, num('zoom', 1));
const LOG_W = Math.round(W / ZOOM);
const LOG_H = SIZE ? Math.round(LOG_W * SIZE.h / SIZE.w) : Math.round(H / ZOOM);
// Density and population follow the area, so a taller frame is not a sparser
// one — 40 drones over 600px of sky reads as a thin scatter next to 40 over 270.
const AREA_K = (LOG_W * LOG_H) / (W * H);
const TOTAL = Math.round(SECONDS * FPS);
const FRAMES = Math.min(TOTAL, Math.round(num('frames', Infinity)) || Infinity);
const OUT = resolve(ROOT, positional[0] || 'work/social/drone-swarm.mp4');

console.log(`scene   ${SECONDS}s — 1 drone, then 2, then the sky fills, then black`);
console.log(`frame   ${LOG_W}x${LOG_H} logical`
  + (ZOOM !== 1 ? ` @ ${ZOOM}x zoom` : '')
  + (SIZE ? ` (reframed for ${OUT_W}x${OUT_H}, not cropped)` : '')
  + ` — ${AREA_K.toFixed(2)}x the baseline area`);
console.log(`video   ${FRAMES} frames @ ${FPS}fps, ${OUT_W}x${OUT_H}`
  + (PIXEL ? ' (nearest-upscaled)' : `, drawn at ${OUT_W * SS}x${OUT_H * SS}`)
  + `, silent, crf ${CRF}, seed 0x${SEED.toString(16)}`);

// ------------------------------------------------------------- page bundle

const work = mkdtempSync(join(tmpdir(), 'mash-drones-'));
const cleanup = () => { try { rmSync(work, { recursive: true, force: true }); } catch {} };

const esbuild = require('esbuild');
const entry = join(work, 'entry.js');
// Only the prop painters are needed — no engine, no game state. buildAllSprites
// is what fills the raster cache the painters draw through.
writeFileSync(entry, `
import { drawProp, propFrames, propFps } from ${JSON.stringify(join(ROOT, 'src/sprites/props.js'))};
import { buildAllSprites } from ${JSON.stringify(join(ROOT, 'src/game/draw.js'))};
buildAllSprites();
window.__drawProp = drawProp;
window.__propFrames = propFrames;
window.__propFps = propFps;
`);
let bundleJs;
try {
  const bundle = await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'iife',
    target: ['es2020'], minify: false, write: false, logLevel: 'silent',
  });
  bundleJs = bundle.outputFiles[0].text;
} catch (err) {
  console.error('bundle failed:', err.message);
  cleanup();
  process.exit(1);
}

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

// Headless Chromium rasterizes Canvas2D on the CPU by default (SwiftShader),
// which for a 4K canvas is by far the most expensive thing here — the real GPU
// measured ~5.6x faster end to end on the video tool. --no-gpu falls back.
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
const USE_GPU = flags.gpu !== 'false' && !flags['no-gpu'];

// ------------------------------------------------------------ draw frames

const browser = await chromium.launch({ args: USE_GPU ? GPU_ARGS : [] });
const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.setContent(html, { waitUntil: 'load' });

await page.evaluate(({ seed, fps, w, h, outW, outH, ss, total, areaK }) => {
  const draw = document.createElement('canvas');
  draw.width = outW * ss;
  draw.height = outH * ss;
  const dctx = draw.getContext('2d', { alpha: false });
  // The logical frame already matches the output aspect (see LOG_H), so this is
  // a plain uniform scale with nothing cropped or letterboxed. Uniform matters:
  // scaling the axes independently is invisible at 16:9 and stretches the art at
  // every other aspect.
  const fit = draw.width / w;
  dctx.setTransform(fit, 0, 0, fit, 0, 0);
  dctx.lineJoin = 'round';
  dctx.lineCap = 'round';
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';

  // Supersampling resolves in-page so the extra pixels never cross the CDP
  // bridge — only the finished frame does.
  const out = ss === 1 ? draw : document.createElement('canvas');
  let octx = dctx;
  if (ss !== 1) {
    out.width = outW;
    out.height = outH;
    octx = out.getContext('2d', { alpha: false });
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
  }

  // Deterministic RNG — the render must be reproducible from the seed alone.
  let s = seed || 1;
  const rnd = () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };

  // ---- the star field ----------------------------------------------------
  // Three parallax layers. The far layer barely moves and carries the density;
  // the near layer is sparse, brighter and quick, which is what sells depth at
  // this frame size. Twinkle is per-star so the sky never pulses in unison.
  const LAYERS = [
    { n: 150, speed: 2.5, r: [0.28, 0.6], a: [0.28, 0.55] },
    { n: 70, speed: 7, r: [0.45, 0.9], a: [0.45, 0.75] },
    { n: 26, speed: 16, r: [0.7, 1.3], a: [0.7, 1.0] },
  ];
  const stars = [];
  for (let li = 0; li < LAYERS.length; li++) {
    const L = LAYERS[li];
    const n = Math.round(L.n * areaK);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rnd() * w, y: rnd() * h, layer: li,
        r: L.r[0] + rnd() * (L.r[1] - L.r[0]),
        a: L.a[0] + rnd() * (L.a[1] - L.a[0]),
        tw: rnd() * Math.PI * 2,
        twRate: 0.6 + rnd() * 1.8,
      });
    }
  }

  // ---- the drones --------------------------------------------------------
  // Every drone is the same prop the lane spawns, so the piece is a showcase of
  // the real asset rather than a re-drawing of it. They travel right to left,
  // the direction the lane scrolls, and each carries its own altitude, size,
  // speed and bob so a crowd never reads as a grid.
  //
  // `enter` is when it first crosses the right edge. The escalation is entirely
  // in these numbers: one, then a second, then a wave.
  // The ending: the swarm FLIES OUT, and only then does the picture go to black.
  //
  // The first cut dissolved the drones where they hovered, which made them
  // evaporate mid-flight — the fade was doing the exiting for them. Now every
  // drone is guaranteed to leave the frame under its own power by EXIT_BY, and
  // the last stretch is an empty star field going down. Nothing with a drone in
  // it is ever faded.
  const SECS = total / fps;
  const TAIL = 2.2;                   // empty sky, then black
  const EXIT_BY = SECS - TAIL;
  const BOX_W = 12;
  const BOX_H = 7;
  const OVERDRAW = 4 / 3 * 1.35;      // hazard overdraw x flier visual scale
  // Speeds are set from CROSSING TIME, not picked as pixel rates. The frame is
  // only 480 logical px wide, so a drone at 30px/s takes 21 seconds to get
  // across it and the opening act is an empty sky — which is exactly what the
  // first cut did. Solving for the time instead keeps the piece honest at any
  // frame size.
  const drones = [];
  const addDrone = (enter, opts = {}) => {
    const scale = opts.scale ?? (0.8 + rnd() * 1.4);
    const dw = BOX_W * OVERDRAW * scale;
    let cross = opts.cross ?? (2.6 + rnd() * 3.4);
    // Nobody is allowed to still be on screen when the lights go down. A drone
    // that cannot make it across in the time left is given the speed to do it;
    // one that would have to break the sky to manage it is not sent at all.
    //
    // The clamp is to a RANDOM fraction of the time left rather than to all of
    // it. Clamping to the deadline itself makes every straggler arrive at the
    // left edge on the same frame, and the flock leaves as a vertical wall —
    // which looks like the scene ending rather than like drones flying away.
    // Staggering the deadline scatters the exits across the last few seconds and
    // the sky empties from the back, one drone at a time.
    const left = EXIT_BY - enter;
    if (left < 1.4) return;
    const latest = left * (0.5 + rnd() * 0.5);
    if (cross > latest) cross = latest;
    drones.push({
      enter,
      speed: (w + dw * 2) / cross,
      y: opts.y ?? (18 + rnd() * (h - 56)),
      scale,
      // A phase offset per drone so their rotors and lens sweeps are not in
      // lockstep — a formation of identically-posed drones reads as wallpaper.
      phase: rnd() * 1000,
      bobAmp: 1.5 + rnd() * 4,
      bobRate: 0.5 + rnd() * 1.1,
    });
  };

  // Act 1 — one drone, alone, big and unhurried enough to be looked at. It
  // clears the frame before anything else arrives.
  addDrone(0.4, { cross: 5.0, y: h * 0.46, scale: 2.4 });
  // Act 2 — two more, at their own altitudes and paces.
  addDrone(5.0, { cross: 4.4, y: h * 0.26, scale: 1.9 });
  addDrone(5.9, { cross: 5.4, y: h * 0.68, scale: 2.1 });
  // Act 3 — the sky fills. Entries tighten as it goes, so the count ramps into a
  // swarm rather than arriving as one block.
  // The cadence is solved against the ACT WINDOW, not chosen as a gap and hoped
  // for. Entries accelerate geometrically, and for a ratio r over N entries the
  // gaps sum to g0*(1-r^N)/(1-r) — so g0 falls out of the window instead of the
  // window falling out of g0.
  //
  // Picking g0 by hand is what broke the portrait cut: the count scales with the
  // frame area, and 89 drones at a hand-set 0.5s opening gap ran the act out to
  // ~24 seconds inside an 18-second video. Most of the swarm never arrived and
  // the tall frame looked emptier than the wide one it was derived from.
  // Entries stop well before EXIT_BY so the last arrivals still have room to
  // cross at a believable speed rather than being flung out. The swarm therefore
  // peaks, thins, and clears — which is the shape the ending wants: a flock
  // passing through, not a flock being switched off.
  const ACT3_IN = 9.4;
  const swarm = Math.round(40 * areaK);
  const window3 = Math.max(1, EXIT_BY - 3.4 - ACT3_IN);
  const r = 0.96;
  const g0 = window3 * (1 - r) / (1 - Math.pow(r, swarm));
  let t0 = ACT3_IN;
  for (let i = 0; i < swarm; i++) {
    addDrone(t0);
    t0 += g0 * Math.pow(r, i);
  }

  const frames = window.__propFrames('droneEye');
  const propFps = window.__propFps('droneEye');
  const dt = 1 / fps;

  function paint(frameIndex) {
    const t = frameIndex * dt;

    // Deep space, with a faint vertical lift so the frame is not a flat black
    // field — the drones' own dark contours need something to sit against.
    const sky = dctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05040c');
    sky.addColorStop(0.55, '#0b0a1c');
    sky.addColorStop(1, '#05040c');
    dctx.fillStyle = sky;
    dctx.fillRect(0, 0, w, h);

    for (const st of stars) {
      const L = LAYERS[st.layer];
      // Wrap on width so the field scrolls forever without reseeding.
      const x = ((st.x - t * L.speed) % w + w) % w;
      const tw = 0.72 + 0.28 * Math.sin(t * st.twRate + st.tw);
      dctx.globalAlpha = st.a * tw;
      dctx.fillStyle = '#fff';
      dctx.beginPath();
      dctx.arc(x, st.y, st.r, 0, Math.PI * 2);
      dctx.fill();
    }
    dctx.globalAlpha = 1;

    for (const d of drones) {
      const age = t - d.enter;
      if (age < 0) continue;
      const dw = BOX_W * OVERDRAW * d.scale;
      const dh = BOX_H * OVERDRAW * d.scale;
      // Right to left, entering off the right edge and retired once fully past
      // the left one.
      const x = w + dw - age * d.speed;
      if (x < -dw) continue;
      const y = d.y + Math.sin(t * d.bobRate + d.phase) * d.bobAmp;
      const f = Math.floor((t + d.phase) * propFps) % frames;
      // The prop bakes a soft thruster wash under the housing, which was tuned
      // against a lit arcade floor. Over deep space that same translucent gold
      // reads as a murky olive slab — it looks like a plinth the drone is
      // standing on. An additive glow under it turns the wash back into light:
      // 'lighter' cannot darken anything, so the sky shows through it.
      dctx.save();
      dctx.globalCompositeOperation = 'lighter';
      const gx = x + dw / 2;
      const gy = y + dh * 0.94;
      const gr = dw * 0.55;
      const glow = dctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      glow.addColorStop(0, 'rgba(246,211,60,0.5)');
      glow.addColorStop(0.45, 'rgba(214,150,40,0.16)');
      glow.addColorStop(1, 'rgba(120,80,20,0)');
      dctx.fillStyle = glow;
      dctx.beginPath();
      dctx.ellipse(gx, gy, gr, gr * 0.42, 0, 0, Math.PI * 2);
      dctx.fill();
      dctx.restore();
      window.__drawProp(dctx, 'droneEye', x, y, dw, dh, f);
    }

    // ---- the sky goes down ----------------------------------------------
    // Starts at EXIT_BY, which is the moment the last drone is guaranteed to be
    // off frame — so this only ever darkens an empty star field. The drones are
    // never faded; they leave, and then the lights do.
    //
    // Smoothstep over the tail. A squared ramp was tried first and read as the
    // picture dimming slightly and then cutting; smoothstep eases in and out
    // around a linear middle, so it commits early enough to be a fade and still
    // lands exactly on black.
    if (t > EXIT_BY) {
      const k = Math.min(1, (t - EXIT_BY) / TAIL);
      const eased = k * k * (3 - 2 * k);
      dctx.fillStyle = `rgba(0,0,0,${eased.toFixed(4)})`;
      dctx.fillRect(0, 0, w, h);
    }

    if (ss !== 1) octx.drawImage(draw, 0, 0, outW, outH);
  }

  // One discarded frame. Chromium rasterizes a canvas's very first draw on a
  // different path — the surface is promoted to GPU acceleration only once it
  // has been drawn to — so warming it keeps the opening frame identical to
  // every later one.
  paint(0);

  // One batch per round trip: stepping and PNG-encoding in the page keeps the
  // CDP traffic down to the encoded images instead of raw pixels.
  window.__batch = (from, count) => {
    const pngs = [];
    for (let i = 0; i < count; i++) {
      paint(from + i);
      pngs.push(out.toDataURL('image/png').slice('data:image/png;base64,'.length));
    }
    return pngs;
  };
}, { seed: SEED, fps: FPS, w: LOG_W, h: LOG_H, outW: OUT_W, outH: OUT_H, ss: SS,
     total: TOTAL, areaK: AREA_K });

mkdirSync(dirname(OUT), { recursive: true });

// An MP4 has no moov atom until the last moment, so a half-finished render is
// unopenable with or without +faststart. Encode beside the destination and
// rename atomically on success, so the output path always holds either a
// complete video or the previous one.
const PARTIAL = join(dirname(OUT), `.${basename(OUT)}.partial`);

// ffmpeg starts before the first frame and is fed over a pipe, so encoding
// overlaps capture and a 1080p render never lands on disk as a PNG pile.
// -an: silent by design, so there is no audio stream at all.
const ff = spawn('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  ...(PIXEL ? ['-vf', `scale=${W * SCALE}:${H * SCALE}:flags=neighbor`] : []),
  // -tune animation suits flat cel-style content: stronger deblocking across
  // the smooth sky gradient, where 8-bit banding would otherwise show, without
  // eating the hard vector edges.
  '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(CRF),
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-an', '-movflags', '+faststart', '-f', 'mp4', PARTIAL,
], { stdio: ['pipe', 'inherit', 'inherit'] });

let ffError = null;
const ffDone = new Promise((done) => {
  ff.on('error', (err) => { ffError = err; done(-1); });
  ff.on('close', (code) => done(code));
});

const BATCH = 12;
const started = Date.now();
let written = 0;
for (let from = 0; from < FRAMES; from += BATCH) {
  const count = Math.min(BATCH, FRAMES - from);
  const pngs = await page.evaluate(
    ({ f, c }) => window.__batch(f, c), { f: from, c: count });
  for (const b64 of pngs) {
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    written++;
  }
  const pct = ((written / FRAMES) * 100).toFixed(0);
  const rate = written / ((Date.now() - started) / 1000);
  process.stdout.write(`\rframes  ${written}/${FRAMES} (${pct}%)  ${rate.toFixed(1)} fps  `);
}
process.stdout.write('\n');

ff.stdin.end();
const status = await ffDone;
await browser.close();
cleanup();

if (status !== 0) {
  console.error(`ffmpeg failed (${ffError ? ffError.message : `exit ${status}`})`);
  try { rmSync(PARTIAL, { force: true }); } catch {}
  process.exit(1);
}
if (!existsSync(PARTIAL)) {
  console.error('ffmpeg reported success but wrote no file');
  process.exit(1);
}
renameSync(PARTIAL, OUT);
const mb = statSync(OUT).size / 1024 / 1024;
console.log(`wrote   ${OUT} (${mb.toFixed(1)} MB, ${(FRAMES / FPS).toFixed(1)}s, silent)`);
