// Halloween costume stills of the cast, for social posts (26 Oct 2026).
//
// Dev tooling — this never ships. The costumes live in
// src/dev/halloween-costumes.js and ride drawToon's spec/pal seam, so nothing on
// the roster changes; output lands in work/social/halloween/, which is
// gitignored.
//
// Each costume is one 1080x1350 PNG on plain black, one subject, plus a contact
// sheet per hero with the candidates lettered for picking. `walk` is the
// trick-or-treat video: the line walks in from off screen to a song, on its bars.
//
// Usage: node tools/render-halloween.js [hero|all] [--only=ID] [--ss=N] [--calib] [--plain]
//        node tools/render-halloween.js portraits [--only=ID] [--size=WxH]   (Gary, 2160x2700)
//        node tools/render-halloween.js walk [--still] [--at=SEC] [--fps=30] [--smile]
//                                       [--song=halloweeen-mix] [--enter-bar=3]
//                                       [--stop-bar=12] [--tape=SEC] [--title=2.6] [--crop=145]
//                                       [--size=1080x1350] [--bottom=252]
import { dirname, resolve, join } from 'path';
import { bundleEntry, openArtPage, paintPng, writePng } from './lib/art-page.js';
import { pipeFrames, FRAME_BUFFER_SRC } from './lib/mp4-pipe.js';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';
import { spawn } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { COSTUMES, GARY_PORTRAITS } from '../src/dev/halloween-costumes.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const OUT = join(ROOT, 'work/social/halloween');

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (const arg of argv) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
  else positional.push(arg);
}
const which = positional[0] || 'all';
const heroes = which === 'all' ? Object.keys(COSTUMES) : [which];
const SS = Math.max(1, Number(flags.ss) || 2);

// The walk: the five picks trick-or-treating across the Crypt Shift night.
// The frame is cut out of the 480x270 stage; CROP is that cut as [x, y, w, h],
// bottom-anchored so the lane and the line of costumes sit low with the night
// sky above them.
const WALK = which === 'walk';
const PORTRAITS = which === 'portraits';
const HATS = which === 'kiko-hats';
const LOOKS = which === 'kiko-looks';
const FACES = which === 'alive-faces';
const FPS = Number(flags.fps) || 30;
// The video is cut to the song: BARS of it, the cast setting off on ENTER_BAR.
const SONG = resolveOrExit(typeof flags.song === 'string' ? flags.song : 'halloweeen-mix');
// A song the desk saved to src/data/imported/ carries its mix (voices, levels,
// effects) and its arrangement in its own file, and the MIX/ARRANGEMENTS
// registries the renderer consults only hold the game's songs. Without these
// the render falls back to default voices — not the song as the mixer plays it.
const SONG_FILE = await import(`../src/data/imported/${SONG.id}.js`).catch(() => null);
const BPM = bpmOf(SONG.bank, SONG.id);
const BAR_S = (4 * 60) / BPM;
// The ending: a TAPE STOP. Over the last two beats before STOP_BAR the song and
// the picture slow together to a dead halt (the walk winds down with the tape),
// the frame cuts quickly to black as it stops, and HAPPY HALLOWEEN comes up on
// the black in the game's marquee lettering for TITLE seconds.
const STOP_BAR = Number(flags['stop-bar']) || 12;
const BARS = STOP_BAR - 1;                       // bars of song played
const SONG_END = BARS * BAR_S;
const TAPE = Number(flags.tape) || 2 * (60 / BPM);    // the slowdown, seconds
const TAPE_AT = SONG_END - TAPE;
const TITLE = Number(flags.title) || 2.6;
const SECONDS = SONG_END + TITLE;
// Scene time under the tape stop: speed falls linearly from 1 to 0 across TAPE,
// so the scene advances half as far as the clock and then holds.
const sceneTime = (t) => (t <= TAPE_AT ? t
  : TAPE_AT + (Math.min(t, SONG_END) - TAPE_AT) - (Math.min(t, SONG_END) - TAPE_AT) ** 2 / (2 * TAPE));
const ENTER_AT = ((Number(flags['enter-bar']) || 3) - 1) * BAR_S;
const sizeArg = typeof flags.size === 'string' ? /^(\d+)x(\d+)$/.exec(flags.size) : null;
const OUT_W = sizeArg ? Number(sizeArg[1]) : 1080;
const OUT_H = sizeArg ? Number(sizeArg[2]) : 1350;
const SMILE = !!flags.smile;                        // big grins instead of the walk's own face
const NAME = SMILE ? 'trick-or-treat-smile' : 'trick-or-treat';
const CROP_H = Number(flags.crop) || 145;          // 170 was the first cut; closer reads better in a feed
// The backdrop lowered under that closer crop so the crypt's flying witch is in shot.
// Split between lowering the backdrop and raising the frame: the backdrop's
// ground-standing props (the lamp post, the graves) sink into the lane when
// it drops, so it drops only 15 and the frame comes up 8.
const BG_DROP = flags['bg-drop'] === undefined ? 50 : Number(flags['bg-drop']);
const CROP_W = Math.round(CROP_H * OUT_W / OUT_H);
const CROP_BOTTOM = Number(flags.bottom) || 240;   // the lane is at 232: keep a strip of road, not all of it
const CROP = [240 - CROP_W / 2, CROP_BOTTOM - CROP_H, CROP_W, CROP_H];

const ENTRY = `
import { paintCostume, paintSheet, paintWalkFrame, paintPortrait } from '${join(ROOT, 'src/dev/halloween-costumes.js')}';
window.paintPortrait = paintPortrait;
import { paintKikoHatSheet, paintKikoLookSheet } from '${join(ROOT, 'src/dev/halloween-costumes.js')}';
window.paintKikoHatSheet = paintKikoHatSheet;
window.paintKikoLookSheet = paintKikoLookSheet;
import { paintAliveFaceSheet } from '${join(ROOT, 'src/dev/halloween-costumes.js')}';
window.paintAliveFaceSheet = paintAliveFaceSheet;
window.paintCostume = paintCostume;
window.paintSheet = paintSheet;
window.paintWalkFrame = paintWalkFrame;
import { drawTextVectorCentered, textWidth, GLYPH_PX } from '${join(ROOT, 'src/engine/sprites.js')}';
// HAPPY / HALLOWEEN made the way the title screen makes MASHENSTEIN (menus.js
// drawRetainedMarquee): the marquee lettering over a dark offset copy of
// itself, with X stitches sewn across it at even spacing — about one per two
// letters, as the title's six are across eleven. Pumpkin orange instead of gold.
function stitchedWord(ctx, word, cx, y, s, ink, shade) {
  const k = s / 4;                                // the title's seamK
  const lw = textWidth(word, s, 'marquee');
  drawTextVectorCentered(ctx, word, cx + 1.5 * k, y + 1.5 * k, shade, s, 'marquee');
  drawTextVectorCentered(ctx, word, cx, y, ink, s, 'marquee');
  const n = Math.max(2, Math.round(word.length * 6 / 11));
  const top = y + 4 * k, bot = y + 22 * k, half = 4 * k;
  ctx.strokeStyle = 'rgba(42,30,5,0.85)';
  ctx.lineWidth = 1.4 * k;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sx = cx - lw / 2 + (lw * (i + 0.5)) / n;
    ctx.beginPath(); ctx.moveTo(sx - half, top); ctx.lineTo(sx + half, bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + half, top); ctx.lineTo(sx - half, bot); ctx.stroke();
  }
}
function paintTitle(ctx, w, h, a) {
  ctx.save();
  ctx.globalAlpha = a;
  const s2 = (w * 0.84) / textWidth('HALLOWEEN', 1, 'marquee');
  const s1 = s2 * 0.82;
  const lh = GLYPH_PX * s2;
  stitchedWord(ctx, 'HAPPY', w / 2, h * 0.5 - lh * 0.95, s1, '#ff8a1e', '#a8541a');
  stitchedWord(ctx, 'HALLOWEEN', w / 2, h * 0.5 + lh * 0.05, s2, '#ff8a1e', '#a8541a');
  ctx.restore();
}
window.paintTitleTest = (ctx, w, h) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); paintTitle(ctx, w, h, 1); };
${FRAME_BUFFER_SRC}
let fb = null;
window.__batch = (from, n) => {
  const crop = ${JSON.stringify(CROP)};
  fb = fb || makeFrameBuffer(${OUT_W}, ${OUT_H}, 1);
  const out = [];
  for (let i = from; i < from + n; i++) {
    const k = ${OUT_H} / crop[3];
    fb.hx.setTransform(k, 0, 0, k, 0, 0);
    fb.hx.fillStyle = '#000';
    fb.hx.fillRect(0, 0, crop[2], crop[3]);
    const t = i / ${FPS};
    // scene time under the tape stop (sceneTime, with this run's numbers)
    const TAPE_AT = ${TAPE_AT}, SONG_END = ${SONG_END}, TAPE = ${TAPE};
    const ts = (${sceneTime.toString()})(t);
    // black comes in fast over the last fifth of the tape stop
    const fade = Math.min(1, Math.max(0, (t - ${SONG_END - TAPE * 0.35}) / ${TAPE * 0.35}));
    if (fade < 1) paintWalkFrame(fb.hx, crop[2], crop[3], { t: ts, crop, smile: ${SMILE}, enterAt: ${ENTER_AT}, bgDrop: ${BG_DROP} });
    if (fade > 0) {
      fb.hx.fillStyle = 'rgba(0,0,0,' + fade + ')';
      fb.hx.fillRect(0, 0, crop[2], crop[3]);
    }
    const title = Math.min(1, Math.max(0, (t - ${SONG_END + 0.25}) / 0.35));
    if (title > 0) paintTitle(fb.hx, crop[2], crop[3], title);
    fb.reduce();
    out.push(fb.png());
  }
  return out;
};
`;

const js = await bundleEntry(ENTRY, ROOT);
const { browser, page } = await openArtPage(js, { gpu: !flags['no-gpu'] });
try {
  if (WALK) {
    const poster = await paintPng(page, 'paintWalkFrame', {
      w: OUT_W, h: OUT_H, logicalW: CROP[2], logicalH: CROP[3], ss: 1,
      arg: { t: Number(flags.at) || TAPE_AT - 1, crop: CROP, smile: SMILE, enterAt: ENTER_AT, bgDrop: BG_DROP },
    });
    const titlePng = await paintPng(page, 'paintTitleTest', { w: OUT_W, h: OUT_H, logicalW: CROP[2], logicalH: CROP[3], ss: 2 });
    writePng(join(OUT, `${NAME}-title.png`), titlePng);
    const stillPath = join(OUT, `${NAME}-still.png`);
    writePng(stillPath, poster);
    console.log(stillPath);
    if (!flags.still) {
      const work = mkdtempSync(join(tmpdir(), 'mash-tot-'));
      try {
        // The song, bars 1..BARS, from the game's own engine.
        const { outL, outR, peak } = await renderBankBrowser(SONG.bank, {
          trackId: SONG.id, range: { startStep: 0, endStep: BARS * 16 }, tail: 1,
          ...(SONG_FILE?.mix ? { mix: SONG_FILE.mix } : {}),
          ...(SONG_FILE?.arrangement ? { arrangement: SONG_FILE.arrangement } : {}),
        });
        // The tape stop, on the PCM: from TAPE_AT the read head slows linearly to
        // a halt at SONG_END (pitch and tempo fall together, as a tape does),
        // then silence. A few ms of fade on the last samples so it ends without
        // a click.
        const SR_ = 44100;
        const n0 = Math.round(TAPE_AT * SR_), nEnd = Math.round(SONG_END * SR_), nAll = Math.round(SECONDS * SR_);
        const L = new Float32Array(nAll), R = new Float32Array(nAll);
        L.set(outL.subarray(0, n0)); R.set(outR.subarray(0, n0));
        const tapeN = nEnd - n0;
        for (let n = 0; n < tapeN; n++) {
          const u = n / tapeN;
          const pos = n0 + tapeN * (u - u * u / 2);     // integral of (1 - u)
          const i0 = Math.floor(pos), f = pos - i0;
          const g = n > tapeN - 400 ? (tapeN - n) / 400 : 1;
          L[n0 + n] = ((outL[i0] || 0) * (1 - f) + (outL[i0 + 1] || 0) * f) * g;
          R[n0 + n] = ((outR[i0] || 0) * (1 - f) + (outR[i0 + 1] || 0) * f) * g;
        }
        const wavPath = join(work, 'song.wav');
        writeFileSync(wavPath, wavBuffer([L, R], peak > 0.9 ? 0.9 / peak : 1));
        const silent = join(work, 'silent.mp4');
        await pipeFrames({ page, total: Math.round(SECONDS * FPS), fps: FPS, crf: 14, outPath: silent });
        const outPath = join(OUT, `${NAME}.mp4`);
        const graph = '[1:a]anull[a]';
        await new Promise((done, fail) => {
          const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-i', wavPath,
            '-filter_complex', graph, '-map', '0:v', '-map', '[a]',
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', SECONDS.toFixed(3),
            '-movflags', '+faststart', '-f', 'mp4', `${outPath}.partial`], { stdio: 'inherit' });
          ff.on('close', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg mux exit ${code}`))));
        });
        renameSync(`${outPath}.partial`, outPath);
        console.log(`${outPath}  (${SONG.title}, ${BPM} bpm: ${BARS} bars, tape stop ${TAPE_AT.toFixed(2)}–${SONG_END.toFixed(2)}s, title to ${SECONDS.toFixed(2)}s; cast in at ${ENTER_AT.toFixed(2)}s)`);
      } finally { rmSync(work, { recursive: true, force: true }); }
    }
  }
  if (HATS) {
    // Kiko's hat bake-off: six hats across, three moments of her walk down, at the
    // walk's own scale (one cell is 68x85 stage units at the video's 1080/136 zoom).
    const ids = typeof flags.ids === 'string' ? flags.ids.split(',') : undefined;
    const n = ids ? ids.length : 6;
    const cell = [54, 60], times = [20, 20.27, 20.55];
    const buf = await paintPng(page, 'paintKikoHatSheet', {
      w: Math.round(cell[0] * n * 1080 / 136), h: Math.round(cell[1] * 3 * 1080 / 136),
      logicalW: cell[0] * n, logicalH: cell[1] * 3, ss: 1, arg: { cell, times, ids },
    });
    const path = join(OUT, 'kiko-hats.png');
    writePng(path, buf);
    console.log(path);
  }
  if (LOOKS) {
    const cell = [54, 60];
    const buf = await paintPng(page, 'paintKikoLookSheet', {
      w: Math.round(cell[0] * 5 * 1080 / 136), h: Math.round(cell[1] * 1080 / 136),
      logicalW: cell[0] * 5, logicalH: cell[1], ss: 1, arg: { cell, t: 20 },
    });
    const path = join(OUT, 'kiko-looks.png');
    writePng(path, buf);
    console.log(path);
  }
  if (FACES) {
    const buf = await paintPng(page, 'paintAliveFaceSheet', { w: 1800, h: 900, logicalW: 1200, logicalH: 600, ss: 2 });
    const path = join(OUT, 'gary', 'alive-faces.png');
    writePng(path, buf);
    console.log(path);
  }
  if (PORTRAITS) {
    // Instagram's portrait post at twice its display size, so it survives the
    // feed's own downscale; --size overrides.
    const [pw, ph] = sizeArg ? [OUT_W, OUT_H] : [2160, 2700];
    for (const p of GARY_PORTRAITS.filter((v) => !flags.only || v.id === flags.only)) {
      const buf = await paintPng(page, 'paintPortrait', { w: pw, h: ph, logicalW: 400, logicalH: 500, ss: SS, arg: { id: p.id, face: p.id === 'alive' && typeof flags.face === 'string' ? flags.face : null } });
      const path = join(OUT, 'gary', `gary-${p.id}.png`);
      writePng(path, buf);
      console.log(path);
    }
  }
  for (const hero of WALK || PORTRAITS || HATS || LOOKS || FACES ? [] : heroes) {
    if (flags.plain) {
      // The bare figure with the landmark grid, for placing a new costume's layers.
      const buf = await paintPng(page, 'paintCostume', {
        w: 1080, h: 1350, logicalW: 400, logicalH: 500, ss: SS, arg: { hero, id: null, calib: true },
      });
      const path = join(ROOT, 'work/local', `halloween-calib-${hero}.png`);
      writePng(path, buf);
      console.log(path);
      continue;
    }
    const list = COSTUMES[hero].filter((c) => !flags.only || c.id === flags.only);
    for (const c of list) {
      const buf = await paintPng(page, 'paintCostume', {
        w: 1080, h: 1350, logicalW: 400, logicalH: 500, ss: SS,
        arg: { hero, id: c.id, calib: !!flags.calib },
      });
      const path = join(OUT, `${hero}-${c.letter}-${c.id}.png`);
      writePng(path, buf);
      console.log(path);
    }
    if (!flags.only) {
      const cols = 3, rows = Math.ceil(list.length / cols);
      const buf = await paintPng(page, 'paintSheet', {
        w: 1080 * cols / 2, h: 1350 * rows / 2, logicalW: 400 * cols, logicalH: 500 * rows, ss: SS,
        arg: { hero, cols },
      });
      const path = join(OUT, `${hero}-sheet.png`);
      writePng(path, buf);
      console.log(path);
    }
  }
} finally {
  await browser.close();
}
