// The fake soundtrack album, for a social carousel: front cover candidates, the
// back cover with its tracklist, and one card per track.
//
// Dev tooling — this never ships, same as render-social.js, and it is built the
// same way: every picture is a call into the game's own painters. A track's art
// is the cover the jukebox already hangs on that cabinet's song on the lock
// screen (song-art.js paintCabinetArt — the cabinet's scenery, from somewhere
// along one of its stages); the wordmark is the title screen's, seams and all.
// Which spot along the stages each cover is taken from is a pinned `view` per
// track, picked off the `views` contact sheet: most random spots are open sky
// or an empty field, and a cover wants the castle, the tower, the skyline.
// What this file adds is the record sleeve around them: the black, the type and
// the tracklist.
//
// One track per cabinet, in cabinet order. DÉJÀ VIEW has no scenery of its own —
// its backdrop is the other eight looks cut in on the beat, and song-art skips it
// for that reason — so its art is exactly that: the other eight, in eight strips.
//
// Everything is square. An Instagram carousel takes its shape from the first
// slide, and a record sleeve is square anyway.
//
// Usage: node tools/render-album.js [set] [--flags]
//   set          all | front | back | tracks | views  (default all; views is not in all)
//   --out=DIR    output directory                     (default work/social/album)
//   --ss=N       supersample factor                   (default 2)
//   --seed=N     shift every cabinet's view by N (a reroll of the lot)
//   --hero=ID    the face on front cover D            (default lorenzo)
//   --only=ID    one track card, by cabinet id
//   --sky        views: the sheet of the jukebox's sky-only covers (a track's `sky: true`)
//   --no-gpu     rasterize on CPU (fallback; much slower)
import { resolve, dirname, join } from 'path';
import { bundleEntry, openArtPage, paintPng, writePng } from './lib/art-page.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { TOON_SPECS } from '../src/sprites/toons.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

// ------------------------------------------------------------------ the album
// Peter's titles, 8 Oct 2026. The running times are invented, like the album —
// plausible single lengths, no two alike. Edit them here. `view` is the column
// of `node tools/render-album.js views` the track's art is taken from.
const ALBUM = {
  title: 'MASHENSTEIN',
  subtitle: 'ORIGINAL ARCADE SOUNDTRACK',
  // True: the game synthesizes every note live through Web Audio.
  credit: 'EVERY NOTE SYNTHESIZED LIVE IN YOUR BROWSER · NO SAMPLES',
};
const TRACKS = [
  { cab: 'plumber', title: 'Your Technician Will Arrive Between Eight and Five', time: '3:12', view: 2 },
  { cab: 'speed', title: 'The Horizon Keeps Leaving Without Us', time: '2:58', view: 5 },
  { cab: 'rhythm', title: 'The Offbeat Was Written Off', time: '3:41', view: 6 },
  { cab: 'frost', title: 'Our Breath Hangs in the Great Hall', time: '4:07', view: 0 },
  { cab: 'crypt', title: 'Somebody Down There Is Asking Questions', time: '3:36', view: 6 },
  { cab: 'neon', title: 'The Doors Are Closing, Please Stand Clear', time: '2:44', view: 5 },
  { cab: 'cardboard', title: 'This Side Up (Mostly)', time: '3:19', view: 1 },
  { cab: 'office', title: 'You’ve Been on Mute the Whole Time', time: '3:53', view: 0 },
  { cab: 'surge', title: 'Too Many Plugs in One Power Strip', time: '4:26' },
].map((t, i) => ({ ...t, n: i + 1, cabName: CABINET_BY_ID[t.cab].name }));
// Where the record turns over: five and four.
const SIDE_B_FROM = 6;

const FRONTS = [
  { file: 'front-a-machine.png', look: 'machine' },
  { file: 'front-b-screens.png', look: 'screens' },
  { file: 'front-c-toaster.png', look: 'toaster' },
  { file: 'front-d-face.png', look: 'face' },
];

// ---------------------------------------------------------------- arguments

const flags = {};
const positional = [];
for (const arg of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
  else positional.push(arg);
}
const SETS = ['front', 'back', 'tracks'];
const [setArg = 'all'] = positional;
const sets = setArg === 'all' ? SETS : [setArg];
for (const s of sets) {
  if (!SETS.includes(s) && s !== 'views') {
    console.error(`unknown set "${s}" — try one of: all, ${SETS.join(', ')}, views`);
    process.exit(1);
  }
}
const OUT_DIR = resolve(ROOT, typeof flags.out === 'string' ? flags.out : 'work/social/album');
const SS = Math.max(1, Math.round(Number(flags.ss) || 2));
const SEED = Math.round(Number(flags.seed) || 0);
const HERO = typeof flags.hero === 'string' ? flags.hero : 'lorenzo';
if (!TOON_SPECS[HERO]) {
  console.error(`unknown hero "${HERO}" — try one of: ${Object.keys(TOON_SPECS).join(', ')}`);
  process.exit(1);
}
const ONLY = typeof flags.only === 'string' ? flags.only : null;
if (ONLY && !TRACKS.some((t) => t.cab === ONLY)) {
  console.error(`unknown cabinet "${ONLY}" — try one of: ${TRACKS.map((t) => t.cab).join(', ')}`);
  process.exit(1);
}
const USE_GPU = !flags['no-gpu'];
const SQUARE = { w: 1080, h: 1080 };

// ------------------------------------------------- the painters, in-browser
// Laid out in output pixels (1080 square). The scenes inside are drawn under a
// scale of their own, and the type is set as vector text at its final size — the
// glyph-sprite path caches each glyph at the size it is asked for, which is
// right for the HUD and blurry blown up.
const ENTRY = `
import { drawTextVector, textWidth, GLYPH_PX } from '../src/engine/sprites.js';
import { paintCabinetArt } from '../src/game/song-art.js';
import { drawToonFace, setInk, INK } from '../src/sprites/toons.js';
import { PROP_PAINTERS } from '../src/sprites/props.js';
import { ensureKanaFonts, kanaFontVersion } from '../src/engine/kana.js';
import { CABINETS, CABINET_BY_ID } from '../src/data/cabinets.js';
import { W, H } from '../src/engine/renderer.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { drawWorldEntity } from '../src/game/draw.js';
import { makeObstacle } from '../src/game/entities.js';
import { drawToon } from '../src/sprites/toons.js';
import { CABINET_STAR } from '../src/sprites/backwall.js';
import {
  paintConcourse, distinctHazards, pose, GROUND_Y, HERO_H,
} from './lib/concourse-art.js';

const BLACK = '#0b0912';
const CREAM = '#f3ecdc';
const GREY = '#8d86a0';
const GOLD = '#ffcf33';
const BLUE = '#8fb0f5';   // the title screen's subtitle ink

// TERMINAL VELOCITY's signs are kana, in two subset webfonts the stage asks for
// when it starts. Asked for here before anything paints, and waited on, or the
// neon art is drawn with the fallback face.
window.prepFonts = async () => {
  ensureKanaFonts();
  const until = performance.now() + 9000;
  while (kanaFontVersion() < 2 && performance.now() < until) await new Promise((r) => setTimeout(r, 100));
  return kanaFontVersion();
};

// ------------------------------------------------------------------ type
const scaleFor = (px) => px / GLYPH_PX;
function text(ctx, str, x, y, px, color, style = 'title', align = 'left') {
  const s = scaleFor(px);
  const w = textWidth(str, s, style);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  drawTextVector(ctx, str, x0, y, color, s, style);
  return w;
}
// Small caps labels, letter-spaced by hand: the game's styles carry a hair of
// tracking, which is right for a menu row and too tight for a sleeve's small print.
function spaced(ctx, str, x, y, px, color, { track = 0.2, align = 'left', style = 'bold' } = {}) {
  const s = scaleFor(px);
  const chars = [...str];
  const ws = chars.map((ch) => textWidth(ch, s, style));
  const total = ws.reduce((a, b) => a + b, 0) + px * track * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  chars.forEach((ch, i) => {
    if (ch !== ' ') drawTextVector(ctx, ch, cx, y, color, s, style);
    cx += ws[i] + px * track;
  });
  return total;
}
// One line if it fits, else the two-line break with the shorter longest line —
// greedy wrapping leaves "and Five" on a line by itself.
function balance(str, px, style, maxW) {
  const s = scaleFor(px);
  if (textWidth(str, s, style) <= maxW) return [str];
  const words = str.split(' ');
  let best = null, bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(textWidth(a, s, style), textWidth(b, s, style));
    if (w < bestW) { bestW = w; best = [a, b]; }
  }
  return best;
}
function fitLines(str, px, style, maxW) {
  for (let p = px; p > 10; p -= 1) {
    const lines = balance(str, p, style, maxW);
    if (lines.every((l) => textWidth(l, scaleFor(p), style) <= maxW)) return { lines, px: p };
  }
  return { lines: [str], px: 10 };
}

// The title screen's wordmark (menus.js drawRetainedMarquee): MASHENSTEIN in the
// marquee cut, a dark offset copy under it, and the six stitches across it. Drawn
// at the title screen's own scale and scaled as a whole, so the outline, the
// tracking and the stitches all keep their proportions. Returns its height.
const LOGO_S = 4.4;
function drawLogo(ctx, cx, top, width) {
  const lw = textWidth('MASHENSTEIN', LOGO_S, 'marquee');
  const k = width / lw;
  ctx.save();
  ctx.translate(cx - width / 2, top);
  ctx.scale(k, k);
  drawTextVector(ctx, 'MASHENSTEIN', 1.5, 1.5, '#a8791f', LOGO_S, 'marquee');
  drawTextVector(ctx, 'MASHENSTEIN', 0, 0, GOLD, LOGO_S, 'marquee');
  const seamK = LOGO_S / 4;
  const seamTop = 4 * seamK, seamBot = 22 * seamK;
  ctx.strokeStyle = 'rgba(42,30,5,0.85)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const sx = (lw * (i + 0.5)) / 6 - 4;
    ctx.beginPath(); ctx.moveTo(sx, seamTop); ctx.lineTo(sx + 8, seamBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 8, seamTop); ctx.lineTo(sx, seamBot); ctx.stroke();
  }
  ctx.restore();
  return 26 * seamK * k;
}
function drawMasthead(ctx, LW, top, width, sub = BLUE) {
  const h = drawLogo(ctx, LW / 2, top, width);
  const subPx = width * 0.034;
  spaced(ctx, ${JSON.stringify(ALBUM.subtitle)}, LW / 2, top + h + subPx * 0.9, subPx, sub, { align: 'center', track: 0.32 });
  return top + h + subPx * 2.4;
}

// ------------------------------------------------------------------ art
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const idHash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// A track's art: a still out of a run at the spot its track pins (\`view\`) —
// the cabinet's scenery, its lane, one of its hazards, and its poster star
// running at it. Cached per spot, so front B, the surge strips and the track
// card all show the same picture.
//
// The jukebox's own cover for a cabinet's song is the scenery alone, sky down to
// the lane (song-art.js paintCabinetArt); a track with \`sky: true\` takes that
// instead. It is lovely for FROST FORTRESS and TERMINAL VELOCITY and close to
// blank for CARDBOARD KINGDOM (two cut-out hills) and CORPORATE KOMBAT (a sheet
// of graph paper), whose look lives in the lane, the props and the ink — and a
// carousel of nine reads as a set only if all nine are the same kind of picture.
const VIEWS = ${JSON.stringify(Object.fromEntries(TRACKS.filter((t) => t.view !== undefined).map((t) => [t.cab, t.view])))};
const SKY = ${JSON.stringify(Object.fromEntries(TRACKS.filter((t) => t.sky).map((t) => [t.cab, true])))};
const artCache = new Map();
function cabinetArt(id, px, seed, { view = VIEWS[id] || 0, sky = !!SKY[id], bare = false } = {}) {
  const key = [id, px, view + seed, sky, bare].join('|');
  if (!artCache.has(key)) {
    // the same random draws as paintScenery's, in the same order, so a view
    // number is the same place along the stages in either kind of art
    const random = rng(idHash(id) + (view + seed) * 7919);
    artCache.set(key, id === 'surge' ? surgeArt(px, seed, sky)
      : sky ? paintCabinetArt(id, px, random) : sceneArt(id, px, random, bare));
  }
  return artCache.get(key);
}

// Square, bottom on the frame's bottom edge: the lane and a strip of ground
// under it, and the scenery up to about two thirds of the way to the top.
const SCENE_CROP = 176;
const cropX = 240 - SCENE_CROP / 2, cropY = H - SCENE_CROP;
// As the styles sheet frames a scene: the runner left of centre, the hazard right.
const HERO_X = 240 - SCENE_CROP * 0.26, HAZARD_DX = 240 + SCENE_CROP * 0.24;
let hazards = null;
function sceneArt(id, px, random, bare = false) {
  const cab = CABINET_BY_ID[id];
  hazards = hazards || distinctHazards(CABINETS);
  // Painted into a canvas of the whole frame's shape and cropped after, as
  // paintScenery does: the packs' bakes measure the canvas they are on.
  const k = px / SCENE_CROP;
  const frame = document.createElement('canvas');
  frame.width = Math.round(W * k);
  frame.height = Math.round(H * k);
  const g = frame.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const stageIndex = 1 + Math.floor(random() * 3);
  const progress = random();
  const total = 3000;
  const t = 4 + random() * 60;
  const camX = progress * total;
  const bc = { stageIndex, progress };
  const pack = getStylePack(cab.style, {});
  const hazard = !bare && hazards.get(id);
  const obstacles = hazard ? [makeObstacle(hazard, camX + HAZARD_DX)] : [];
  pack.bg(g, t, camX, cab, total, id === 'rhythm' ? { stageIndex, beat: 0 } : bc, 0, bc);
  if (pack.ground) pack.ground(g, camX, cab, obstacles);
  for (const o of obstacles) drawWorldEntity(g, o, camX, t, pack, {});
  if (!bare) drawToon(g, CABINET_STAR[id], pose('run', t), HERO_X, GROUND_Y, HERO_H);
  if (pack.post) pack.post(g, t);
  const c = document.createElement('canvas');
  c.width = c.height = px;
  c.getContext('2d').drawImage(frame, Math.round(cropX * k), Math.round(cropY * k), px, px, 0, 0, px, px);
  frame.width = frame.height = 0;
  return c;
}

// DÉJÀ VIEW: the other eight cabinets' looks cut together, one strip each,
// every strip from the same place across the frame — one landscape in eight
// styles, which is what the cabinet does to them on the beat. Its own star runs
// across the cuts: Gary, at its own hazard.
const SURGE_FROM = ['plumber', 'speed', 'rhythm', 'frost', 'crypt', 'neon', 'cardboard', 'office'];
function surgeArt(px, seed, sky) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const strip = px / SURGE_FROM.length;
  SURGE_FROM.forEach((id, i) => {
    const x0 = Math.round(i * strip), x1 = Math.round((i + 1) * strip);
    g.drawImage(cabinetArt(id, px, seed, { sky, bare: true }), x0, 0, x1 - x0, px, x0, 0, x1 - x0, px);
  });
  g.fillStyle = 'rgba(8,5,14,0.9)';
  for (let i = 1; i < SURGE_FROM.length; i++) g.fillRect(Math.round(i * strip) - px * 0.002, 0, px * 0.004, px);
  if (!sky) {
    hazards = hazards || distinctHazards(CABINETS);
    const k = px / SCENE_CROP, t = 9.3, camX = 1200;
    g.setTransform(k, 0, 0, k, -cropX * k, -cropY * k);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const hazard = hazards.get('surge');
    if (hazard) drawWorldEntity(g, makeObstacle(hazard, camX + HAZARD_DX), camX, t, getStylePack('surge', {}), {});
    drawToon(g, CABINET_STAR.surge, pose('run', t), HERO_X, GROUND_Y, HERO_H);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  return c;
}
function drawArt(ctx, id, x, y, size, ss, seed) {
  ctx.drawImage(cabinetArt(id, Math.round(size * ss), seed), x, y, size, size);
}
function sleeveShadow(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = w * 0.05;
  ctx.shadowOffsetY = w * 0.015;
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// song-art.js's backdrops, for the two fronts that borrow its subjects.
function backdrop(ctx, S, bg, glow) {
  const g = ctx.createLinearGradient(0, 0, S, S);
  for (const [at, c] of bg) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const r = ctx.createRadialGradient(S * 0.34, S * 0.24, 0, S * 0.42, S * 0.42, S * 0.72);
  for (const [at, c] of glow) r.addColorStop(at, c);
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, S, S);
}
const TEAL = {
  bg: [[0, '#2aa9a7'], [0.52, '#12657a'], [1, '#082c49']],
  glow: [[0, 'rgba(116,240,211,0.34)'], [0.58, 'rgba(41,164,168,0.08)'], [1, 'rgba(4,18,37,0)']],
};
const NIGHT = {
  bg: [[0, '#4a2a8a'], [0.55, '#21134a'], [1, '#0a0620']],
  glow: [[0, 'rgba(201,160,255,0.3)'], [0.6, 'rgba(120,80,200,0.08)'], [1, 'rgba(10,6,32,0)']],
};
// A wash down from the top edge, so the wordmark sits on something even.
function topScrim(ctx, LW, h, a = 0.55) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(8,5,14,' + a + ')');
  g.addColorStop(1, 'rgba(8,5,14,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LW, h);
}

// ================================================================ the front
window.paintFront = (ctx, LW, LH, { look, ss, seed, hero }) => {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, LW, LH);
  const LOGO_W = LW * 0.72, LOGO_TOP = LH * 0.06;

  if (look === 'machine') {
    // A: one lit machine in the dark room, as the cabinet stills shoot it, with
    // the wordmark on the wall above it. FIELD SERVICE: track one, and the first
    // cabinet anyone plays.
    const F = 160;
    ctx.save();
    ctx.scale(LW / F, LH / F);
    paintConcourse(ctx, F, F, {
      cab: CABINET_BY_ID.plumber, t: 1.4, poster: false, neighbours: 0, groundAt: 0.84,
    });
    ctx.restore();
    drawMasthead(ctx, LW, LOGO_TOP, LOGO_W);
  } else if (look === 'screens') {
    // B: the nine covers, the album's nine songs, under the wordmark.
    const below = drawMasthead(ctx, LW, LOGO_TOP, LOGO_W);
    const gap = LW * 0.008;
    const gridH = LH - below - LH * 0.055;
    const tile = (gridH - gap * 2) / 3;
    const gx = (LW - (tile * 3 + gap * 2)) / 2;
    ${JSON.stringify(TRACKS.map((t) => t.cab))}.forEach((id, i) => {
      drawArt(ctx, id, gx + (i % 3) * (tile + gap), below + Math.floor(i / 3) * (tile + gap), tile, ss, seed);
    });
  } else if (look === 'toaster') {
    // C: THE GOLDEN APPLIANCE, wings up, in the night sky the jukebox flies it
    // across (song-art.js paintToaster).
    backdrop(ctx, LW, NIGHT.bg, NIGHT.glow);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [x, y, r] of [[0.08, 0.36, 0.005], [0.93, 0.33, 0.006], [0.06, 0.62, 0.004], [0.16, 0.9, 0.005],
      [0.74, 0.93, 0.004], [0.94, 0.72, 0.006], [0.86, 0.5, 0.003], [0.22, 0.47, 0.003]]) {
      ctx.beginPath(); ctx.arc(LW * x, LH * y, LW * r, 0, Math.PI * 2); ctx.fill();
    }
    const w = LW * 0.62, h = w * 18 / 22;
    ctx.save();
    ctx.translate((LW - w) / 2, LH * 0.6 - h / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    PROP_PAINTERS.appliance(ctx, w, h, 3);
    ctx.restore();
    topScrim(ctx, LW, LH * 0.34, 0.45);
    drawMasthead(ctx, LW, LOGO_TOP, LOGO_W);
  } else if (look === 'face') {
    // D: a hero's face on the home-screen icon's teal, as the lock screen shows
    // it, set low so the wordmark has the sky.
    backdrop(ctx, LW, TEAL.bg, TEAL.glow);
    const was = { ...INK };
    setInk({ body: 0.38, face: 0.42, alpha: 5, brow: 1, browA: 1, browL: 0.15 });
    try {
      const fs = LW * 0.74;
      drawToonFace(ctx, hero, (LW - fs) / 2, LH - fs * 0.97, fs, fs, { light: false });
    } finally {
      setInk(was);
    }
    topScrim(ctx, LW, LH * 0.34, 0.4);
    drawMasthead(ctx, LW, LOGO_TOP, LOGO_W);
  }
};

// ================================================================= the back
window.paintBack = (ctx, LW, LH, { tracks, sideB, credit, total }) => {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, LW, LH);
  const top = drawMasthead(ctx, LW, LH * 0.05, LW * 0.5);

  const L = LW * 0.1, R = LW * 0.9;
  const numX = L, titleX = L + LW * 0.062;
  // One size for every row, set off the longest title — a list whose rows are
  // each fitted to their own measure reads as nine different typesetters.
  const TITLE_STYLE = 'bold';
  const timeW = textWidth('0:00', scaleFor(28), 'bold') + LW * 0.03;
  const avail = R - timeW - titleX;
  const widest = Math.max(...tracks.map((t) => textWidth(t.title, 1, TITLE_STYLE)));
  const tPx = Math.min(31, (avail / widest) * GLYPH_PX);
  const cabPx = 14;
  const rowH = 74, sideH = 48;
  const listH = sideH * 2 + rowH * tracks.length;
  const footY = LH * 0.935;
  let y = top + (footY - top - listH) / 2;

  const side = (name) => {
    const w = spaced(ctx, name, L, y + 14, 15, GREY, { track: 0.4 });
    ctx.fillStyle = 'rgba(141,134,160,0.28)';
    ctx.fillRect(L + w + LW * 0.02, y + 22, R - L - w - LW * 0.02, 1.5);
    y += sideH;
  };
  side('SIDE A');
  for (const t of tracks) {
    if (t.n === sideB) side('SIDE B');
    text(ctx, String(t.n).padStart(2, '0'), numX, y, 26, GOLD, 'title');
    text(ctx, t.title, titleX, y - 1, tPx, CREAM, TITLE_STYLE);
    spaced(ctx, t.cabName, titleX, y + tPx * 1.15, cabPx, GREY, { track: 0.28 });
    text(ctx, t.time, R, y, 26, GREY, 'ui', 'right');
    y += rowH;
  }
  spaced(ctx, credit, LW / 2, footY, 13, GREY, { align: 'center', track: 0.3 });
  spaced(ctx, 'TOTAL ' + total, LW / 2, footY + 26, 13, 'rgba(141,134,160,0.7)', { align: 'center', track: 0.3 });
};

// ============================================================ the views sheet
// Every cabinet's cover from \`count\` spots along its stages, one row each, with
// the column numbers a track's \`view\` takes.
window.paintViews = (ctx, LW, LH, { ids, count, tile, pad, label, ss, seed, sky }) => {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, LW, LH);
  for (let v = 0; v < count; v++) {
    text(ctx, String(v + seed), label + v * (tile + pad) + tile / 2, pad * 0.6, 26, GOLD, 'title', 'center');
  }
  ids.forEach((id, r) => {
    const y = pad * 2 + 26 + r * (tile + pad);
    spaced(ctx, id.toUpperCase(), pad, y + tile / 2 - 9, 15, GREY, { track: 0.2 });
    for (let v = 0; v < count; v++) {
      ctx.drawImage(cabinetArt(id, Math.round(tile * ss), 0, { view: v + seed, sky }), label + v * (tile + pad), y, tile, tile);
    }
  });
};

// =============================================================== a track card
// The cover the jukebox hangs on the song, on black, and the song under it.
window.paintTrack = (ctx, LW, LH, { track, count, ss, seed }) => {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, LW, LH);
  const size = LW * 0.64;
  const ax = (LW - size) / 2, ay = LH * 0.075;
  sleeveShadow(ctx, ax, ay, size, size);
  drawArt(ctx, track.cab, ax, ay, size, ss, seed);

  let y = ay + size + LH * 0.045;
  const label = String(track.n).padStart(2, '0') + ' / ' + String(count).padStart(2, '0')
    + '   ·   ' + track.cabName + '   ·   ' + track.time;
  // 22 is the floor: a 1080 post is shown about 390 points wide on a phone
  spaced(ctx, label, LW / 2, y, 22, GREY, { align: 'center', track: 0.24 });
  y += 22 * 2.1;
  const { lines, px } = fitLines(track.title, 56, 'title', LW * 0.84);
  for (const line of lines) {
    text(ctx, line, LW / 2, y, px, CREAM, 'title', 'center');
    y += px * 1.12;
  }
};
`;

// ------------------------------------------------------------------- render

const totalSec = TRACKS.reduce((s, t) => {
  const [m, sec] = t.time.split(':').map(Number);
  return s + m * 60 + sec;
}, 0);
const TOTAL = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;

console.log(`sets       ${sets.join(', ')}`);
const bundleJs = await bundleEntry(ENTRY, join(ROOT, 'tools'));
const { browser, page } = await openArtPage(bundleJs, { gpu: USE_GPU });
const kana = await page.evaluate(() => window.prepFonts());
if (kana < 2) console.warn('warning    kana webfonts did not both arrive; TERMINAL VELOCITY signs may use a fallback face');
console.log(`output     ${OUT_DIR}  (ss ${SS}, seed ${SEED}${USE_GPU ? ', GPU' : ', CPU'})`);

let count = 0;
const emit = async (name, painter, arg) => {
  const buf = await paintPng(page, painter, {
    w: SQUARE.w, h: SQUARE.h, logicalW: SQUARE.w, logicalH: SQUARE.h, ss: SS, arg: { ...arg, ss: SS, seed: SEED },
  });
  writePng(join(OUT_DIR, name), buf);
  count += 1;
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(0)} KB`);
};

try {
  if (sets.includes('front')) {
    console.log('\nfront');
    for (const f of FRONTS) await emit(f.file, 'paintFront', { look: f.look, hero: HERO });
  }
  if (sets.includes('back')) {
    console.log('\nback');
    await emit('back-tracklist.png', 'paintBack', {
      tracks: TRACKS, sideB: SIDE_B_FROM, credit: ALBUM.credit, total: TOTAL,
    });
  }
  if (sets.includes('views')) {
    console.log('\nviews');
    const ids = TRACKS.filter((t) => t.view !== undefined).map((t) => t.cab);
    const cols = 8, tile = 220, pad = 16, label = 150;
    const w = label + cols * (tile + pad), h = pad * 2 + 26 + ids.length * (tile + pad);
    const buf = await paintPng(page, 'paintViews', {
      w, h, logicalW: w, logicalH: h, ss: SS, arg: { ids, count: cols, tile, pad, label, ss: SS, seed: SEED, sky: !!flags.sky },
    });
    const name = flags.sky ? 'views-sky.png' : 'views.png';
    writePng(join(OUT_DIR, name), buf);
    count += 1;
    console.log(`  ${name}  ${w}x${h}`);
  }
  if (sets.includes('tracks')) {
    console.log('\ntracks');
    for (const t of TRACKS.filter((tr) => !ONLY || tr.cab === ONLY)) {
      await emit(`track-${String(t.n).padStart(2, '0')}-${t.cab}.png`, 'paintTrack', { track: t, count: TRACKS.length });
    }
  }
} finally {
  await browser.close();
}
console.log(`\nwrote      ${count} image${count === 1 ? '' : 's'}`);
