// "Nine cabinets in nine seconds" — one second of each cabinet, cut on the beat.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the build
// only bundles src/gate.js and src/main.js, and the dependency runs one way:
// this file imports from src/, never the reverse. Output lands in dist/, which
// is gitignored.
//
// Video #7 from docs/social-teaser-plan.md. Each clip is a real scene from that
// cabinet's own style pack — its sky, its ground renderer, the hazards its own
// pattern bank spawns, scrolling at the speed its own speedBonus gives a run —
// with the hero that fronts its poster running through it. The whole point is
// the cut: nine hard cuts on the downbeat, and the art is unrecognisable across
// every one of them.
//
// Unlike render-video.js this needs no audio analysis. Nothing here reacts to
// the mix; the cuts land on a beat grid computed from the track's own bpm, so
// the picture is a pure function of the frame index. That also means it needs no
// worker replay — a nine-second reel is ~540 frames and renders serially in well
// under a minute with GPU rasterization on.
//
// Usage: node tools/render-cabinet-reel.js [trackId] [outPath] [--flags]
//   trackId       megamix | hub | title | finale | shop | cabinet id (default megamix)
//   --beats=N     beats of music per cabinet             (default 2)
//   --fps=N       video frame rate                       (default 60)
//   --size=WxH    output frame                           (default 1080x1350)
//   --band=N      caption band height in px              (default 20% of height)
//   --from-bar=N  start the music N bars in              (default 0)
//   --ss=N        supersample factor, reduced in-page    (default 2)
//   --crf=N       x264 quality, lower is better          (default 12)
//   --fade=N      seconds of audio fade at the end       (default 0.4)
//   --speed=N     base scroll px/s before speedBonus     (default 160, the game's)
//   --no-flash    drop the power-on flash on each cut
//   --no-labels   drop the caption band text
//   --no-gpu      rasterize on CPU (fallback; much slower)
//   --frames=N    stop after N frames (smoke test)
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, renameSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, basename, resolve } from 'path';
import { spawn } from 'child_process';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';
import { bundleEntry, openArtPage } from './lib/art-page.js';
import { pipeFrames, FRAME_BUFFER_SRC } from './lib/mp4-pipe.js';
import { CABINETS } from '../src/data/cabinets.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

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

const [trackId = 'megamix', outArg = null] = positional;
const FPS = Math.max(1, Math.round(num('fps', 60)));
const BEATS = Math.max(0.5, num('beats', 2));
const SS = Math.max(1, Math.round(num('ss', 2)));
const CRF = num('crf', 12);
const FADE = Math.max(0, num('fade', 0.4));
const FROM_BAR = Math.max(0, Math.round(num('from-bar', 0)));
const SPEED = Math.max(1, num('speed', 160));
// Logical world rows visible in the scene box. 150 of the world's 270 puts the
// ground line about three quarters down and the hero at a sixth of the box
// height; showing all 270 spends 86% of the frame on sky.
const ZOOM = Math.max(40, num('zoom', 150));
const FLASH = flags.flash !== 'false' && !flags['no-flash'];
const LABELS = flags.labels !== 'false' && !flags['no-labels'];
const USE_GPU = flags.gpu !== 'false' && !flags['no-gpu'];

const sizeArg = typeof flags.size === 'string' ? /^(\d+)x(\d+)$/.exec(flags.size) : null;
if (flags.size && !sizeArg) {
  console.error(`--size must look like 1080x1350, got "${flags.size}"`);
  process.exit(1);
}
// --reel is the 9:16 Instagram Reels / Stories frame, i.e. --size=1080x1920. It
// needs no other special casing: the band scales as a fraction of the frame and
// the scene box is framed by --zoom in logical rows, so both follow the height.
const REEL = flags.reel === true || flags.reel === 'true';
const OUT_W = sizeArg ? Number(sizeArg[1]) : 1080;
const OUT_H = sizeArg ? Number(sizeArg[2]) : (REEL ? 1920 : 1350);
if (OUT_W % 2 || OUT_H % 2) {
  console.error(`--size must be even in both axes for yuv420p, got ${OUT_W}x${OUT_H}`);
  process.exit(1);
}

// The band is what makes this postable. A 480x270 world cover-cropped into a 4:5
// frame would lose two thirds of its width, so the scene keeps a squarer crop at
// the top and the leftover height becomes a caption — which is also where the
// nine-cabinet count lives. --band=0 gives the scene the whole frame.
//
// A fifth of the frame, not a fixed 270px: at 4:5 that is the same 270 it always
// was, and at 9:16 it grows with the frame instead of leaving a caption stranded
// under a very tall picture.
const BAND = Math.max(0, Math.min(OUT_H - 2,
  Math.round(num('band', OUT_H > OUT_W ? OUT_H * 0.2 : 0))));
const SCENE_H = OUT_H - BAND;

const track = resolveOrExit(trackId);
const bpm = bpmOf(track.bank, track.id);
const FRAMES_PER_CAB = Math.max(1, Math.round((FPS * 60 * BEATS) / bpm));
const TOTAL = Math.min(FRAMES_PER_CAB * CABINETS.length, Math.round(num('frames', Infinity)) || Infinity);
const OUT = resolve(ROOT, outArg || 'work/social/nine-cabinets.mp4');

// Bars, not seconds, so an offset can never land the reel off the beat grid the
// cuts are computed against. Every bank in the game is in 4/4.
const FROM_SEC = (FROM_BAR * 4 * 60) / bpm;

console.log(`track      ${track.title} (${track.id}), ${bpm} bpm`);
console.log(`cuts       ${CABINETS.length} cabinets x ${BEATS} beats = ${FRAMES_PER_CAB} frames each, `
  + `${(TOTAL / FPS).toFixed(2)}s total`);
console.log(`frame      ${OUT_W}x${OUT_H}, scene ${OUT_W}x${SCENE_H}${BAND ? ` + ${BAND}px band` : ''}`);

// ------------------------------------------------------------------- audio

const { outL, outR, seconds, peak } = await renderBankBrowser(track.bank, {
  repeat: 1, trackId: track.id,
});
// One channel for the analyser below; the file stays stereo.
const pcm = new Float32Array(outL.length);
for (let i = 0; i < pcm.length; i++) pcm[i] = (outL[i] + outR[i]) / 2;
const norm = peak > 0 ? 0.9 / peak : 1;
const needed = FROM_SEC + TOTAL / FPS;
if (seconds < needed) {
  console.error(`the ${track.id} bank is ${seconds.toFixed(1)}s but this reel needs `
    + `${needed.toFixed(1)}s from bar ${FROM_BAR} — lower --from-bar or --beats`);
  process.exit(1);
}
console.log(`audio      ${seconds.toFixed(1)}s rendered, peak ${peak.toFixed(3)}, `
  + `using from ${FROM_SEC.toFixed(2)}s`);

const work = mkdtempSync(join(tmpdir(), 'mash-reel-'));
const wavPath = join(work, 'song.wav');
writeFileSync(wavPath, wavBuffer([outL, outR], norm));
const cleanup = () => rmSync(work, { recursive: true, force: true });

// ---------------------------------------------------------- the frame painter

const ENTRY = `
import { drawWorldEntity } from '../src/game/draw.js';
import { makeObstacle } from '../src/game/entities.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { CABINETS } from '../src/data/cabinets.js';
import { drawToon } from '../src/sprites/toons.js';
import { CABINET_STAR } from '../src/sprites/backwall.js';
import { drawTextCentered, textWidth } from '../src/engine/sprites.js';
import { GROUND_Y, HERO_H, pose, obstacleTypes } from './lib/concourse-art.js';

${FRAME_BUFFER_SRC}

const HERO_X = 185;     // left of centre, so the hazard ahead is always in shot
const JUMP_H = 34;      // apex above the ground line
const JUMP_DUR = 0.62;  // seconds from take-off to landing

// THE SURGE is the payoff cut and the one cabinet that cannot show what it is in
// a second of real time: its pack cycles through the other eight, holding each
// for seven seconds, so a one-second clip is just whichever style it happened to
// open on, drawn in the surge cabinet's own dark palette. Feeding it a
// fast-forwarded clock is the fix — the pack does exactly what it always does,
// several styles' worth of it, inside the clip. 21 seconds of pack time is about
// three styles at its current period; if that period changes, the count changes
// but the clip still flips, which is the property worth keeping.
const SURGE_PACK_SECONDS = 21;

// One clip's worth of world, precomputed. Hazards are laid out so that the hero
// meets one mid-clip and the rest sweep in behind it, and the spacing is derived
// from the scroll speed rather than fixed — at 264px/s (THE SURGE) a fixed
// spacing puts two hazards on the hero at once, and he cannot jump both.
function buildClip(cab, index, speed, clipDur) {
  const start = 400 + index * 97;   // so nine ground renderers do not all open on the same tile
  const types = obstacleTypes(cab, 5);
  const spacing = Math.max(150, speed * 0.95);
  // The first crossing is placed 55% through the clip: late enough that the run
  // reads before the jump, early enough that the landing is on screen.
  const firstX = start + HERO_X + speed * clipDur * 0.55;
  const obstacles = [];
  const crossings = [];
  for (let j = -2; j <= 4; j++) {
    const worldX = firstX + j * spacing;
    const type = types.length ? types[((j % types.length) + types.length) % types.length] : null;
    if (!type) continue;
    const o = makeObstacle(type, worldX);
    // Entities draw from their left edge; drawToon takes a centre. Shifting the
    // hazard back by half its width makes worldX its CENTRE, so the arc apex and
    // the thing being jumped land on the same column — off by half a hazard
    // otherwise, which is invisible in motion and obvious in a screenshot, and
    // people screenshot reels.
    o.x -= o.w / 2;
    obstacles.push(o);
    crossings.push((worldX - start - HERO_X) / speed);
  }
  return { start, obstacles, crossings, pack: getStylePack(cab.style, {}), speed };
}

// How high the hero is off the ground at clip time t: a parabola over the window
// around each crossing. Not the game's jump integration — this is footage of the
// art, and faking the arc is honest where sliding a runner through a cactus is
// not.
function lift(crossings, t) {
  for (const tc of crossings) {
    const u = (t - (tc - JUMP_DUR / 2)) / JUMP_DUR;
    if (u > 0 && u < 1) return JUMP_H * Math.sin(Math.PI * u);
  }
  return 0;
}

window.__init = (cfg) => {
  const { outW, outH, sceneH, ss, fps, framesPerCab, band, speed, flash, labels } = cfg;

  const fb = makeFrameBuffer(outW, outH, ss);
  const hi = fb.hi;
  const hx = fb.hx;

  const clipDur = framesPerCab / fps;
  const clips = CABINETS.map((cab, i) =>
    buildClip(cab, i, speed * (1 + (cab.speedBonus || 0)), clipDur));

  // What the scene box looks at, in logical world units.
  //
  // Cover-fitting the whole 480x270 frame into a square box is the obvious thing
  // and it is wrong: GROUND_Y is 232 of 270, so 86% of every clip comes out as
  // empty sky and the hero is a 4%-tall speck. Frame it instead — cfg.zoom
  // logical rows, ground line 76% down the box and hero 30% across it, so the
  // subject and the hazard it is jumping both sit where an eye looks first.
  const viewH = cfg.zoom;
  const viewW = viewH * (outW / sceneH);
  const viewY = GROUND_Y - viewH * 0.76;
  const viewX = HERO_X - viewW * 0.30;
  const fit = (sceneH * ss) / viewH;
  const offX = -viewX * fit;
  const offY = -viewY * fit;

  // One size for all nine names, chosen off the longest — nine captions each set
  // to their own measure reads as nine different lower-thirds.
  const widestName = Math.max(...CABINETS.map((c) => textWidth(c.name, 1, 'title')));
  const nameS = Math.min(band * 0.0022 * 40, (outW * 0.86) / widestName);

  const drawFrame = (frame) => {
    const idx = Math.min(CABINETS.length - 1, Math.floor(frame / framesPerCab));
    const clipFrame = frame - idx * framesPerCab;
    const t = clipFrame / fps;
    const cab = CABINETS[idx];
    const clip = clips[idx];
    const camX = clip.start + clip.speed * t;

    hx.setTransform(1, 0, 0, 1, 0, 0);
    hx.fillStyle = '#12101a';
    hx.fillRect(0, 0, hi.width, hi.height);

    // ------------------------------------------------------------- the scene
    hx.save();
    hx.beginPath();
    hx.rect(0, 0, outW * ss, sceneH * ss);
    hx.clip();
    hx.setTransform(fit, 0, 0, fit, offX, offY);
    // The pack gets its own clock (see SURGE_PACK_SECONDS); the hero's run cycle
    // and the hazards stay on real clip time.
    const packT = cab.id === 'surge' ? (t / clipDur) * SURGE_PACK_SECONDS : t;
    const up = lift(clip.crossings, t);
    if (clip.pack.bg) clip.pack.bg(hx, packT, camX, cab, 100000);
    if (clip.pack.ground) clip.pack.ground(hx, camX, cab, clip.obstacles);
    for (const o of clip.obstacles) drawWorldEntity(hx, o, camX, t, clip.pack, {});
    drawToon(hx, CABINET_STAR[cab.id] || 'lorenzo',
      pose(up > 0.5 ? 'jump' : 'run', t), HERO_X, GROUND_Y - up, HERO_H);
    if (clip.pack.post) clip.pack.post(hx, packT);
    hx.restore();

    // The machine coming on. A hard cut at 60fps reads as a dropped frame; four
    // frames of the incoming cabinet's own sky sells it as a screen powering up.
    if (flash && clipFrame < 4) {
      hx.setTransform(1, 0, 0, 1, 0, 0);
      hx.save();
      hx.globalAlpha = 0.5 * (1 - clipFrame / 4);
      hx.fillStyle = cab.sky[1] || cab.sky[0];
      hx.fillRect(0, 0, outW * ss, sceneH * ss);
      hx.restore();
    }

    // -------------------------------------------------------------- the band
    if (band > 0) {
      hx.setTransform(ss, 0, 0, ss, 0, 0);
      const by = sceneH;
      hx.fillStyle = '#12101a';
      hx.fillRect(0, by, outW, band);
      // A hairline of the cabinet's own screen colour where the scene meets the
      // band: nine cuts, nine different colours on that line.
      hx.fillStyle = cab.sky[0];
      hx.fillRect(0, by - 3, outW, 3);

      if (labels) {
        // Faded in over the first eight frames of the clip, so the caption
        // arrives with the cut instead of snapping a frame before it registers.
        hx.save();
        hx.globalAlpha = Math.min(1, clipFrame / 8);
        drawTextCentered(hx, cab.name, outW / 2, by + band * 0.16, '#f6d33c', nameS, 'title');
        const gs = nameS * 0.42;
        drawTextCentered(hx, cab.genre, outW / 2, by + band * 0.52, 'rgba(200,200,216,0.78)', gs);
        hx.restore();

        // Nine pips, one per cabinet: which machine this is, and that there are
        // nine of them. The count is the pitch.
        const r = band * 0.022;
        const gap = r * 4.2;
        const x0 = outW / 2 - (gap * (CABINETS.length - 1)) / 2;
        for (let i = 0; i < CABINETS.length; i++) {
          hx.beginPath();
          hx.arc(x0 + i * gap, by + band * 0.82, i === idx ? r * 1.5 : r, 0, Math.PI * 2);
          hx.fillStyle = i === idx ? '#f6d33c' : (i < idx ? 'rgba(246,211,60,0.34)' : 'rgba(200,200,216,0.16)');
          hx.fill();
        }
      }
    }

    fb.reduce();
  };

  // One warm-up frame, discarded. Chromium rasterizes a canvas's first draw on a
  // different path — the surface is only promoted to GPU acceleration once it has
  // been drawn to — and the difference is visible on frame 0 otherwise. See the
  // same note in render-video.js.
  drawFrame(0);

  window.__batch = (from, count) => {
    const pngs = [];
    for (let f = from; f < from + count; f++) {
      drawFrame(f);
      pngs.push(fb.png());
    }
    return pngs;
  };
};
`;

// ------------------------------------------------------------ render frames

const bundleJs = await bundleEntry(ENTRY, join(ROOT, 'tools'));
let browser;
let page;
try {
  ({ browser, page } = await openArtPage(bundleJs, { gpu: USE_GPU }));
} catch (err) {
  cleanup();
  console.error(err.message);
  process.exit(1);
}
console.log(`workers    1${USE_GPU ? ', GPU rasterization' : ', CPU rasterization'}`);

await page.evaluate((cfg) => window.__init(cfg), {
  outW: OUT_W, outH: OUT_H, sceneH: SCENE_H, ss: SS, fps: FPS,
  framesPerCab: FRAMES_PER_CAB, band: BAND, speed: SPEED, flash: FLASH, labels: LABELS,
  zoom: ZOOM,
});

mkdirSync(dirname(OUT), { recursive: true });
// An mp4 has no moov atom until the encode finishes, so writing straight to the
// destination would leave an unopenable file there for the whole render — and
// take out a previous good version from the first byte.
const PARTIAL = join(dirname(OUT), `.${basename(OUT)}.partial`);
const silent = join(work, 'silent.mp4');

try {
  await pipeFrames({ page, total: TOTAL, fps: FPS, crf: CRF, outPath: silent });
} catch (err) {
  await browser.close();
  cleanup();
  console.error(`\n${err.message}`);
  process.exit(1);
}
await browser.close();


// -------------------------------------------------------------- mux the song

console.log('encoding   muxing audio…');
const dur = TOTAL / FPS;
const mux = spawn('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', silent,
  // Seek on the input so the trim is sample-exact and the beat grid the cuts
  // were computed against still lines up with what is heard.
  ...(FROM_SEC > 0 ? ['-ss', FROM_SEC.toFixed(6)] : []), '-i', wavPath,
  '-c:v', 'copy',
  // Cutting a song mid-waveform clicks. A short tail fade costs nothing.
  ...(FADE > 0 ? ['-af', `afade=t=out:st=${Math.max(0, dur - FADE).toFixed(3)}:d=${FADE}`] : []),
  '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
  '-movflags', '+faststart', '-shortest',
  '-f', 'mp4', PARTIAL,
], { stdio: ['ignore', 'inherit', 'inherit'] });
const mStatus = await new Promise((done) => {
  mux.on('error', () => done(-1));
  mux.on('close', (code) => done(code));
});
cleanup();
if (mStatus !== 0 || !existsSync(PARTIAL)) {
  rmSync(PARTIAL, { force: true });
  console.error(`ffmpeg mux failed (exit ${mStatus})`);
  process.exit(1);
}
renameSync(PARTIAL, OUT);
console.log(`\nwrote      ${OUT}  (${dur.toFixed(2)}s)`);
