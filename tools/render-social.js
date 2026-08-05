// Instagram stills, rendered from the game's own painters.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the
// build only bundles src/gate.js and src/main.js, and the dependency runs one
// way: this file imports from src/, never the reverse. Output lands in
// work/social/, which is gitignored.
//
// Four sets, from docs/social-teaser-plan.md:
//
//   posters    one cabinet one-sheet per image, blown up off the hub wall
//   styles     one hero in all nine cabinets, as a 3x3 contact sheet
//   cabinets   one lit machine in a dead concourse, one image per cabinet
//   locked     the same machine unplugged, caught mid static-burst
//   menuboard  the food court's menu, still advertising
//
// The point of generating these rather than exporting them by hand is that
// nothing here is promo art in its own right — every pixel is a call into
// src/sprites or src/engine/stylePacks. When the cast's look changes, re-run
// this the same way you re-run tools/render-icon.js and the posts are current.
// Where a composition needs something the game does not have (a spotlight on a
// bare wall, a contact-sheet grid), that framing is painted here and flagged in
// a comment; the art inside the frame is always the game's.
//
// Usage: node tools/render-social.js [set] [--flags]
//   set          all | posters | styles | cabinets | menuboard  (default all)
//   --out=DIR    output directory                       (default work/social)
//   --ss=N       supersample factor, reduced in-page     (default 2)
//   --hero=ID    hero for the styles sheet               (default lorenzo)
//   --crop=N     logical scene units per styles tile     (default 176)
//   --only=ID    render one cabinet id from a set
//   --no-gpu     rasterize on CPU (fallback; much slower)
import { resolve, dirname, join } from 'path';
import { bundleEntry, openArtPage, paintPng, writePng } from './lib/art-page.js';
import { CABINETS } from '../src/data/cabinets.js';
import { TOON_SPECS } from '../src/sprites/toons.js';

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

const SETS = ['posters', 'styles', 'cabinets', 'locked', 'menuboard'];
const [setArg = 'all'] = positional;
const sets = setArg === 'all' ? SETS : [setArg];
for (const s of sets) {
  if (!SETS.includes(s)) {
    console.error(`unknown set "${s}" — try one of: all, ${SETS.join(', ')}`);
    process.exit(1);
  }
}

const OUT_DIR = resolve(ROOT, typeof flags.out === 'string' ? flags.out : 'work/social');
const SS = Math.max(1, Math.round(num('ss', 2)));
const HERO = typeof flags.hero === 'string' ? flags.hero : 'lorenzo';
if (!TOON_SPECS[HERO]) {
  console.error(`unknown hero "${HERO}" — try one of: ${Object.keys(TOON_SPECS).join(', ')}`);
  process.exit(1);
}
// 120 logical units of a 270-tall scene: the ground line lands about two thirds
// down a tile and the hero reads at a fifth of its height. Wider crops turn the
// sheet into nine skies.
const CROP = Math.max(48, num('crop', 120));
const ONLY = typeof flags.only === 'string' ? flags.only : null;
if (ONLY && !CABINETS.some((c) => c.id === ONLY)) {
  console.error(`unknown cabinet "${ONLY}" — try one of: ${CABINETS.map((c) => c.id).join(', ')}`);
  process.exit(1);
}
const USE_GPU = flags.gpu !== 'false' && !flags['no-gpu'];

// Instagram's two useful frames. 4:5 is the tallest a feed post may be, so it
// buys the most screen for a portrait composition; 1:1 is what a contact sheet
// wants. Both are even in each axis, which keeps them safe for video reuse.
const FEED = { w: 1080, h: 1350 };
const SQUARE = { w: 1080, h: 1080 };
// The logical frame both cabinet sets are composed in. Bigger is further back:
// the machine is a fixed 48x85 in logical units, so widening the frame is the
// only zoom control these shots have.
//
// 140 puts the 48-wide cabinet at 34% of the frame, stepped back from the 44% it
// filled at 110. Enough room to read as a machine standing in a room rather than
// a product shot cropped to the object, without going as far as the locked video
// loop's 320, where it is deliberately a seventh of the picture.
const CAB_FRAME = { w: 140, h: 175 };
// Where the floor line sits, as a fraction of the frame — and the reason the
// frame above could be opened up at all.
//
// paintConcourse's default stacking is proportional (LH * 0.10 + cabinet height),
// which is correct only while the machine is most of the picture. Step back with
// that in force and the same proportions march the ground line up the frame and
// hand the bottom 40% to floor tiles. 0.718 is the fraction the tight 110x137.5
// framing produced, pinned so the extra room a wider frame buys goes into WALL
// ABOVE the machine — which is what stepping back from something actually looks
// like — and the floor keeps the bottom quarter it always had.
const CAB_GROUND = 0.718;

const cabinets = CABINETS.filter((c) => !ONLY || c.id === ONLY);

// ------------------------------------------------- the painters, in-browser
// One bundle, four painters on window. Every one draws in logical units and is
// handed a context already scaled to the output frame, so the same code makes a
// 1080px post or a 4K one.
const ENTRY = `
import { H } from '../src/engine/renderer.js';
import { drawWorldEntity } from '../src/game/draw.js';
import { makeObstacle } from '../src/game/entities.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { CABINETS, CABINET_BY_ID } from '../src/data/cabinets.js';
import { drawToon } from '../src/sprites/toons.js';
import { cabinetPalette } from '../src/sprites/arcade.js';
import {
  drawPoster, POSTER_W, POSTER_H, drawWallBase, drawWallBay, BAY_W, WALL_H,
} from '../src/sprites/backwall.js';
import { drawText, drawTextCentered, textWidth } from '../src/engine/sprites.js';
import {
  GROUND_Y, HERO_H, pose, distinctHazards, paintConcourse, burstTime,
} from './lib/concourse-art.js';

// ================================================================ 1. posters
// One cabinet one-sheet, filling a 4:5 frame. The sheet is the game's own
// drawPoster at every detail — stock, art plate, star, wordmark, tape, fold —
// just hung larger than the concourse ever hangs it (the hub's own tap-to-read
// zoom does the same thing, which is why the type scales with the sheet).
//
// The wall behind it is the game's drawWallBase. The spotlight and the vignette
// are this tool's framing, not the hub's lighting model: the concourse dims a
// wall with a horizontal falloff between ceiling fixtures, which is right for a
// room you walk through and wrong for a single sheet you want someone to read.
window.paintPoster = (ctx, LW, LH, { cabId }) => {
  const cab = CABINET_BY_ID[cabId];
  const pal = cabinetPalette(cab, true);

  // Drawn taller than the frame so the skirting band at the base of the wall
  // falls below it. A skirting in shot puts the sheet at floor height.
  drawWallBase(ctx, -LW * 0.06, -LH * 0.06, LW * 1.12, LH * 1.34);

  // The fixture above it, doing what the hub's ceiling lights do to a bay.
  const glow = ctx.createRadialGradient(LW * 0.5, -LH * 0.10, 0, LW * 0.5, LH * 0.30, LH * 0.95);
  glow.addColorStop(0, 'rgba(246,211,60,0.20)');
  glow.addColorStop(0.45, 'rgba(246,211,60,0.06)');
  glow.addColorStop(1, 'rgba(246,211,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LW, LH);

  // Corners fall away, so nothing competes with the sheet.
  const vig = ctx.createRadialGradient(LW * 0.5, LH * 0.46, LH * 0.20, LW * 0.5, LH * 0.5, LH * 0.80);
  vig.addColorStop(0, 'rgba(8,5,14,0)');
  vig.addColorStop(1, 'rgba(8,5,14,0.72)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, LW, LH);

  const ph = LH * 0.74;
  const pw = ph * (POSTER_W / POSTER_H);
  const topY = (LH - ph) / 2;
  const tilt = -0.018;

  // Paper on a wall casts a shadow; the hub never needs one because its sheets
  // are 40px wide and lit by a failing tube.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = LH * 0.035;
  ctx.shadowOffsetY = LH * 0.012;
  ctx.translate(LW / 2, topY + ph / 2);
  ctx.rotate(tilt);
  ctx.fillStyle = '#000';
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.restore();

  // lit: 1 — a poster in a promo shot is a poster somebody pointed a light at.
  drawPoster(ctx, LW / 2, topY, pw, ph, { pal, tilt, torn: cab.id === 'crypt', seed: cab.id, lit: 1 });
};

// ================================================================= 2. styles
// One hero, nine cabinets, as a 3x3 contact sheet: the premise in one image.
// Each cell is a real scene — the cabinet's own style pack, its own hazards, the
// same hero at the size a run actually draws him — cropped square so the sheet
// fills a 1:1 post. The grid, the gutters and the captions are this tool's;
// everything inside a cell is the game's.
window.paintStyles = (ctx, LW, LH, { hero, crop }) => {
  const MARGIN = 20, GAP = 8;
  const tile = (LW - MARGIN * 2 - GAP * 2) / 3;
  const hazards = distinctHazards(CABINETS);

  ctx.fillStyle = '#12101a';
  ctx.fillRect(0, 0, LW, LH);

  CABINETS.forEach((cab, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const tx = MARGIN + col * (tile + GAP);
    const ty = MARGIN + row * (tile + GAP);

    // A per-cabinet phase and camera, so nine tiles are not nine copies of the
    // same instant — clouds, sweeps and hazard spacing all differ.
    const t = 0.7 + i * 0.31;
    const camX = 120 + i * 37;
    const pack = getStylePack(cab.style, {});
    // Both subjects are placed as fractions of the crop, so retuning --crop
    // reframes the tile without walking the hero or the hazard out of it.
    const heroX = 240 - crop * 0.28;
    const hazardX = 240 + crop * 0.30;
    const hazard = hazards.get(cab.id);
    const obstacles = hazard ? [makeObstacle(hazard, camX + hazardX)] : [];

    ctx.save();
    ctx.beginPath();
    ctx.rect(tx, ty, tile, tile);
    ctx.clip();
    // Square crop of the 480x270 scene: full logical height is 270, so a crop
    // narrower than that is a zoom in. Anchored on the ground line rather than
    // centred, because the bottom of the frame is where the game happens — and
    // a crop wide enough to show all 270 rows spends two thirds of every tile
    // on empty sky, which is what made the first sheet read as nine gradients.
    const k = tile / crop;
    ctx.translate(tx, ty);
    ctx.scale(k, k);
    ctx.translate(-(240 - crop / 2), -(H - crop));
    if (pack.bg) pack.bg(ctx, t, camX, cab, 1000);
    if (pack.ground) pack.ground(ctx, camX, cab, obstacles);
    for (const o of obstacles) drawWorldEntity(ctx, o, camX, t, pack, {});
    drawToon(ctx, hero, pose('run', t), heroX, GROUND_Y, HERO_H);
    if (pack.post) pack.post(ctx, t);
    ctx.restore();

    // Caption inside the cell: nine cells is nine game titles, and without them
    // the sheet is a mood board rather than a line-up.
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx, ty, tile, tile);
    ctx.clip();
    const barH = tile * 0.15;
    const scrim = ctx.createLinearGradient(0, ty + tile - barH, 0, ty + tile);
    scrim.addColorStop(0, 'rgba(10,7,18,0)');
    scrim.addColorStop(1, 'rgba(10,7,18,0.85)');
    ctx.fillStyle = scrim;
    ctx.fillRect(tx, ty + tile - barH, tile, barH);
    // One size for all nine, chosen off the longest name — a sheet whose cells
    // are each set to their own measure reads as nine different posters.
    const widest = Math.max(...CABINETS.map((c) => textWidth(c.name, 1, 'title')));
    const s = Math.min(tile * 0.10, (tile * 0.88) / widest);
    drawText(ctx, cab.name, tx + tile * 0.055, ty + tile - barH * 0.86, '#f6d33c', s, 'title');
    ctx.restore();

    // A hairline, so adjacent skies do not bleed into one another.
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx + 0.75, ty + 0.75, tile - 1.5, tile - 1.5);
  });
};

// ================================================= 3. cabinets (lit / locked)
// One machine in a room where nothing else is — running, or unplugged with static
// on the glass. The whole composition lives in tools/lib/concourse-art.js so the
// still and the video loop can never drift; this is only the clock choice.
//
// Lit: any clock will do, the sweep rolls continuously.
//
// Locked: it will NOT. deadScreenBurst holds the static on for 0.42s out of a
// 6.5-11.7s period, so 94% of clocks render a black screen and a still sampled at
// an arbitrary time is a picture of a cabinet that is simply off. burstTime solves
// for the phase instead — 0.16 is mid-plateau, where the amplitude is at full and
// the bright spark is firing.
window.paintCabinet = (ctx, LW, LH, { cabId, locked = false, showStar = true, groundAt = null }) => {
  const cab = CABINET_BY_ID[cabId];
  const t = locked ? burstTime(cabinetPalette(cab, false).seed, 0.16) : 1.4;
  // One machine and the floor it stands on. No poster and no neighbours: the
  // sheet and the row are concourse context, and what these are for is the
  // machine. The floor stays — without it the cabinet floats, and the light it
  // pools on the tiles is what puts it in a room.
  paintConcourse(ctx, LW, LH, {
    cab, locked, t, poster: false, neighbours: 0, showStar, groundAt,
  });
};

// ============================================================== 4. menuboard
// The food court's menu, still bolted up over a room that has not served food
// in years. Straight drawWallBay — the board, the struck-through items, the
// prices re-marked in plugs, NOW SERVING stuck on 0, and the health grade
// re-graded by hand — hung at readable size with the room falling away above
// and below it. Nothing here is drawn by this tool but the darkness.
window.paintMenuBoard = (ctx, LW, LH) => {
  // The bay is 130x170 and its content sits in the upper-left of that box: the
  // panel spans 0.06..0.955 of the width, and the counter display and the health
  // grade take the right third down to 0.59 of the height. So the thing worth
  // photographing is that sub-rectangle, and the bay is offset to centre it —
  // letting the rest run off the frame, since the bottom of a bay is skirting,
  // which belongs under a counter rather than under a poster of the menu.
  //
  // The frame is sized in the caller to leave a margin around that content. It
  // has to: flush to the bay's own edges, the grade card ends up shaved by the
  // right edge of the image and the whole board reads as a bad crop.
  const contentW = BAY_W * 0.895;
  const contentH = WALL_H * 0.52;
  const bx = (LW - contentW) / 2 - BAY_W * 0.06;
  const by = (LH - contentH) / 2 - WALL_H * 0.07;

  const top = by + WALL_H * 0.07;
  const bottom = top + contentH;

  drawWallBase(ctx, -LW * 0.1, -LH * 0.2, LW * 1.2, LH * 1.6);

  // The room, put out BEFORE the board goes up, so the board is the only thing
  // in the frame that was never darkened.
  //
  // Darkening only the strips above and below it does not work: the wall between
  // them keeps its full value, and a full-width band of lit wall with the board
  // inside it reads as a lit stripe across the picture rather than as one
  // powered object. So the whole wall drops to a floor first and falls further
  // toward the edges — this is framing, not the hub's lighting model, which runs
  // horizontally between ceiling fixtures and has no vertical term at all.
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = '#08050e';
  ctx.fillRect(-LW * 0.1, -LH * 0.2, LW * 1.2, LH * 1.6);
  ctx.restore();
  const fall = (yEdge, yFrame) => {
    const g = ctx.createLinearGradient(0, yEdge, 0, yFrame);
    g.addColorStop(0, 'rgba(8,5,14,0)');
    g.addColorStop(1, 'rgba(8,5,14,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(-LW * 0.1, Math.min(yEdge, yFrame), LW * 1.2, Math.abs(yFrame - yEdge));
  };
  fall(top, -LH * 0.2);
  fall(bottom, LH * 1.2);

  // lit: 0.95 — the hub gives this bay 0.42 in a dead stretch (its own selfLit
  // floor, because a lightbox never goes fully dark). A post is a photograph
  // taken of the one thing still on, so it gets the light it would have had.
  drawWallBay(ctx, bx, by, BAY_W, WALL_H, 'menuboard', { t: 0, seed: 7, lit: 0.95, base: false });

  // What the lightbox throws back onto the wall it is bolted to. Above only:
  // below it is a counter nobody has stood at in years.
  const warm = ctx.createLinearGradient(0, top - contentH * 0.42, 0, top);
  warm.addColorStop(0, 'rgba(246,211,60,0)');
  warm.addColorStop(1, 'rgba(246,211,60,0.13)');
  ctx.fillStyle = warm;
  ctx.fillRect(-LW * 0.1, top - contentH * 0.42, LW * 1.2, contentH * 0.42);
};
`;

// ------------------------------------------------------------------- render

console.log(`sets       ${sets.join(', ')}`);
const bundleJs = await bundleEntry(ENTRY, join(ROOT, 'tools'));
const { browser, page } = await openArtPage(bundleJs, { gpu: USE_GPU });
console.log(`fonts      Lilita One, Fredoka, Permanent Marker — loaded`);
console.log(`output     ${OUT_DIR}  (ss ${SS}${USE_GPU ? ', GPU' : ', CPU'})`);

let count = 0;
let bytes = 0;
const emit = async (name, painter, frame, logical, arg) => {
  const buf = await paintPng(page, painter, {
    w: frame.w, h: frame.h, logicalW: logical.w, logicalH: logical.h, ss: SS, arg,
  });
  bytes += writePng(join(OUT_DIR, name), buf);
  count += 1;
  console.log(`  ${name}  ${frame.w}x${frame.h}  ${(buf.length / 1024).toFixed(0)} KB`);
};

try {
  if (sets.includes('posters')) {
    console.log('\nposters');
    for (const cab of cabinets) {
      // Logical units are output pixels here, and that is load-bearing rather
      // than cosmetic. drawPoster stamps its star from starPlate(), which
      // supersamples 3x the size it is ASKED for — sized for a 40px sheet on a
      // wall. Lay this out in a small logical space and the plate is cached at a
      // few hundred pixels and then magnified ~9x into the frame, which is a
      // visibly blurry hero on an otherwise razor-sharp poster. Everything in
      // the painter is proportional to LW/LH, so asking for the layout in output
      // pixels changes nothing about the composition and hands the plate cache a
      // size worth rendering at.
      await emit(`poster-${cab.id}.png`, 'paintPoster', FEED, { w: FEED.w, h: FEED.h }, { cabId: cab.id });
    }
  }

  if (sets.includes('styles')) {
    console.log('\nstyles');
    // Logical units are output pixels here: a contact sheet's layout is defined
    // in the frame it ships in, not in the game's 480x270 space.
    await emit(`styles-${HERO}.png`, 'paintStyles', SQUARE,
      { w: SQUARE.w, h: SQUARE.h }, { hero: HERO, crop: CROP });
  }

  if (sets.includes('cabinets')) {
    console.log('\ncabinets');
    for (const cab of cabinets) {
      // Framing is CAB_FRAME + CAB_GROUND — see the notes on both. Short version:
      // the frame says how far back you are standing, the pinned ground line says
      // the room grows upward as you step back rather than the floor swallowing
      // the shot.
      await emit(`cabinet-${cab.id}.png`, 'paintCabinet', FEED, CAB_FRAME,
        { cabId: cab.id, groundAt: CAB_GROUND });
      // The same shot with the glass showing only its own background. Two images
      // rather than a flag, because the pair is the point: the machine and its
      // style pack are the subject here, and whether a character helps or is a
      // second thing competing for the eye depends on the cabinet and on what
      // the post is captioned — so both get rendered and the choice is made at
      // posting time, not by re-running the tool.
      await emit(`cabinet-${cab.id}-empty.png`, 'paintCabinet', FEED, CAB_FRAME,
        { cabId: cab.id, showStar: false, groundAt: CAB_GROUND });
    }
  }

  if (sets.includes('locked')) {
    console.log('\nlocked');
    // One image, not nine. cabinetPalette(cab, false) returns the SAME dark
    // palette for every cabinet — an unplugged machine has no chassis colour, no
    // screen and no marquee, and its poster loses its motif too, so nine of these
    // would be nine near-identical pictures. The only thing the cabinet still
    // decides is the burst seed, which sets where the noise bands land; plumber's
    // happens to land a dense stack rather than two broad blocks. --only=ID picks
    // another seed if you want a different scatter.
    // Same framing as the lit ones — it is the same shot with the power off, and
    // the pair only reads as a pair if the machine is the same size in both.
    const seedFrom = ONLY || 'plumber';
    await emit('locked-cabinet.png', 'paintCabinet', FEED, CAB_FRAME,
      { cabId: seedFrom, locked: true, groundAt: CAB_GROUND });
  }

  if (sets.includes('menuboard')) {
    console.log('\nmenuboard');
    // The board's content is 116x88 logical. 128x160 is 4:5 around it with about
    // 6 units of wall on each side — enough that the grade card is inside the
    // frame rather than touching it.
    await emit('menuboard.png', 'paintMenuBoard', FEED, { w: 128, h: 160 }, null);
  }
} finally {
  await browser.close();
}

console.log(`\nwrote      ${count} image${count === 1 ? '' : 's'}, ${(bytes / 1e6).toFixed(1)}MB total`);
