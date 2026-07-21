// Dev asset gallery: renders every drawable in the game into its own canvas by
// calling the REAL draw functions, so the page can never drift from the source.
// Built by tools/build-gallery.js into a standalone dist/gallery.html.
//
// Everything here is display-only. Nothing in src/ is modified or stubbed —
// the one accommodation is that entity tiles crop the game's fixed 480x270
// world space (entities always draw relative to GROUND_Y) down to a tile by
// translating the context, rather than by changing how entities draw.
import { W, H } from '../src/engine/renderer.js';
import { getSprite } from '../src/engine/sprites.js';
import { buildAllSprites, drawWorldEntity, drawHeroSprite, HERO_DRAW_W, HERO_DRAW_H } from '../src/game/draw.js';
import { OBSTACLES, PICKUPS, makeObstacle, makePickup } from '../src/game/entities.js';
import { PROP_PAINTERS, drawProp, propFrames, propTall, glowSprite, sparkSprite } from '../src/sprites/props.js';
import { WORLD_SPRITES } from '../src/sprites/world.js';
import { TOON_SPECS, drawToon, drawToonFace } from '../src/sprites/toons.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { CABINETS } from '../src/data/cabinets.js';
import { POWER_DEFS } from '../src/game/powerups.js';
import { drawPlugRow, PLUG_ICONS, PLUG_NAMES, PLUG_ROW_W } from '../src/game/plugs.js';

const GROUND_Y = 232; // mirrors stylePacks/index.js + run.js

buildAllSprites();

// ---------------------------------------------------------------- framework
const root = document.getElementById('root');
const nav = document.getElementById('nav');
const tiles = []; // {el, canvas, ctx, draw, animated, visible}
let zoom = 3;
let renderScale = 3;
let animate = true;

function section(id, title, note) {
  const s = document.createElement('section');
  s.id = id;
  s.innerHTML = `<h2 id="h-${id}">${title}</h2>` + (note ? `<p class="note">${note}</p>` : '');
  const grid = document.createElement('div');
  grid.className = 'grid';
  s.appendChild(grid);
  root.appendChild(s);
  const a = document.createElement('a');
  a.href = `#h-${id}`;
  a.textContent = title;
  nav.appendChild(a);
  return grid;
}

// One tile. `draw(ctx, t)` paints into a w-by-h logical canvas. The backing
// canvas can be rendered at a denser scale so saved PNGs match the smooth,
// high-resolution treatment used by the Cast Roll.
function tile(grid, name, sub, w, h, draw, { animated = false, wide = false, hires = true } = {}) {
  const card = document.createElement('div');
  card.className = 'card' + (wide ? ' wide' : '');
  card.dataset.search = (name + ' ' + (sub || '')).toLowerCase();
  const canvas = document.createElement('canvas');
  const logicalW = Math.max(1, Math.round(w));
  const logicalH = Math.max(1, Math.round(h));
  canvas.width = Math.max(1, Math.round(logicalW * renderScale));
  canvas.height = Math.max(1, Math.round(logicalH * renderScale));
  const label = document.createElement('div');
  label.className = 'name';
  label.innerHTML = `<b>${name}</b>` + (sub ? `<br>${sub}` : '');
  card.append(canvas, label);
  grid.appendChild(card);

  const ctx = canvas.getContext('2d');
  const entry = { card, canvas, ctx, draw, animated, visible: true, w: logicalW, h: logicalH, name, hires, renderScale: hires ? renderScale : 1 };
  tiles.push(entry);

  canvas.title = `${name} — ${canvas.width}x${canvas.height} — click to save PNG`;
  canvas.addEventListener('click', () => savePng(canvas, name));
  return entry;
}

function paint(entry, t) {
  const { ctx, canvas } = entry;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(entry.renderScale, 0, 0, entry.renderScale, 0, 0);
  try {
    entry.draw(ctx, t);
  } catch (err) {
    entry.stack = err.stack;
    entry.card.classList.add('err');
    entry.card.querySelector('.name').innerHTML = `<b>${entry.name}</b><br>${err.message}`;
    entry.draw = () => {}; // don't spam the same throw every frame
  }
}

function resizeTiles() {
  for (const entry of tiles) {
    entry.renderScale = entry.hires ? renderScale : 1;
    entry.canvas.width = Math.max(1, Math.round(entry.w * entry.renderScale));
    entry.canvas.height = Math.max(1, Math.round(entry.h * entry.renderScale));
    entry.ctx = entry.canvas.getContext('2d');
    entry.canvas.title = `${entry.name} — ${entry.canvas.width}x${entry.canvas.height} — click to save PNG`;
  }
  for (const entry of tiles) paint(entry, 0);
}

function savePng(canvas, name) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name.replace(/[^\w.-]+/g, '_') + '.png';
  a.click();
}

// ---------------------------------------------------------------- helpers
// A stand-in player for drawHeroSprite / a pose object for drawToon.
function pose(kind, t, extra = {}) {
  return {
    kind, phase: (t * 1.6) % 1, time: t, vy: kind === 'jump' ? -160 : 0,
    grounded: kind !== 'jump', squash: 0, lean: 0, roll: false, float: false,
    stomp: false, headless: false, facing: 1, ...extra,
  };
}

// Entities always draw against the world's fixed GROUND_Y. To crop one into a
// small tile: put it at x = pad via camX, then shift the context up so its top
// edge lands at pad. Nothing about the entity's own drawing changes.
function entityTile(grid, label, sub, e, style, pad = 12) {
  const w = e.w + pad * 2;
  const h = e.h + pad * 2;
  tile(grid, label, sub, w, h, (ctx, t) => {
    ctx.translate(0, -(GROUND_Y - e.alt - e.h - pad));
    drawWorldEntity(ctx, e, e.x - pad, t, style, {});
  }, { animated: true });
}

// ---------------------------------------------------------------- 1. backgrounds
{
  const grid = section('backgrounds', 'Backgrounds',
    `${CABINETS.length} cabinets, each with its own style pack. Full 480x270 scene: pack.bg() + pack.ground().`);
  for (const cab of CABINETS) {
    const style = getStylePack(cab.style, {});
    // A few obstacles so ground renderers that cut gaps have something to chew on.
    const obstacles = [makeObstacle('crate', 180), makeObstacle('barrel', 300)];
    tile(grid, cab.name, `${cab.id} · style: ${cab.style} · act ${cab.act}`, W, H, (ctx, t) => {
      if (style.bg) style.bg(ctx, t, t * 60, cab, 1000);
      if (style.ground) style.ground(ctx, t * 60, cab, obstacles);
      if (style.post) style.post(ctx, t);
    }, { animated: true });
  }
}

// ---------------------------------------------------------------- 2. heroes
{
  const ids = Object.keys(TOON_SPECS);
  const grid = section('heroes', 'Heroes — poses',
    `${ids.length} heroes x 4 poses, drawn by drawToon() at 3x the in-game ${HERO_DRAW_W}x${HERO_DRAW_H} box. `
    + 'Celebrate is the results-screen victory routine: each hero\'s signature bounce, then their big move.');
  const HH = 60; // draw tall: these are vector toons, not pixel grids
  for (const id of ids) {
    for (const kind of ['idle', 'run', 'jump', 'duck', 'celebrate']) {
      // The victory routine hops/spins up to ~0.26*HH above standing, so its
      // tile is taller; the feet baseline keeps the same bottom padding. The
      // standing tile clears 1.3*HH so the tallest hero's gear (grumpos's axe
      // rides ~1.25 above his feet) isn't cropped at the tile's top edge.
      const th = kind === 'celebrate' ? HH * 1.62 : HH * 1.3;
      tile(grid, id, kind, HH * 0.9, th, (ctx, t) => {
        drawToon(ctx, id, pose(kind, t, kind === 'celebrate' ? { menu: true } : {}), (HH * 0.9) / 2, th - HH * 0.05, HH);
      }, { animated: true });
    }
  }
}

// ------------------------------------------------- 2a. grumpos build lab
{
  // Torso-shape options for grumpos: heavy alone reads as belly, so these
  // trade barrel width for an inverted taper, deltoid caps and chest shading.
  // Each tile temporarily swaps TOON_SPECS.grumpos around its own draw — the
  // spec is the only thing that varies, so the comparison is honest.
  const BUILDS = [
    ['A · barrel', 'no taper — the pre-change baseline', { taper: 1 }],
    ['B · mild taper', 'waist 0.82 of the shoulders — SHIPPING', {}],
    ['C · hard taper', 'waist 0.68 — full V', { taper: 0.68 }],
    ['D · taper + delts', 'C plus deltoid caps', { taper: 0.68, delts: true }],
    ['E · the works', 'D plus pec/sternum shading', { taper: 0.68, delts: true, pecs: true }],
    ['F · wide + hard V', 'shoulders +12%, waist 0.62 of that', { shoulders: 1.12, taper: 0.62, delts: true, pecs: true }],
  ];
  const grid = section('grumpos-build', 'Grumpos — build lab',
    'Torso silhouette options, idle and run side by side. Display-only: the shipping '
    + 'look is whatever TOON_SPECS.grumpos carries in src/sprites/toons.js.');
  const HH = 60;
  const base = { ...TOON_SPECS.grumpos };
  for (const [name, note, mods] of BUILDS) {
    for (const kind of ['idle', 'run']) {
      const th = HH * 1.15;
      tile(grid, name, `${kind} · ${note}`, HH * 0.9, th, (ctx, t) => {
        TOON_SPECS.grumpos = { ...base, ...mods };
        drawToon(ctx, 'grumpos', pose(kind, t), (HH * 0.9) / 2, th - HH * 0.05, HH);
        TOON_SPECS.grumpos = base;
      }, { animated: true });
    }
  }
}

{
  const ids = Object.keys(TOON_SPECS);
  const grid = section('faces', 'Heroes — faces', 'drawToonFace(), as used for HUD cells and portal crops.');
  for (const id of ids) {
    tile(grid, id, 'face', 32, 32, (ctx) => drawToonFace(ctx, id, 0, 0, 32, 32));
  }
}

{
  const grid = section('hero-run', 'Heroes — in-run render',
    'drawHeroSprite() with opts.flat — the gameplay path, shadow included. '
    + 'Without flat it routes through pushOverlayDraw and paints nothing here.');
  // drawHeroSprite bakes cx = PLAYER_X + 6 (=70), so shift x rather than fight it.
  const HERO_CX = 70;
  const PAD = 6;
  const tw = HERO_DRAW_W + PAD * 2;
  const th = HERO_DRAW_H + PAD * 2;
  for (const id of Object.keys(TOON_SPECS)) {
    const player = {
      hero: {}, anim: 0, vy: 0, grounded: true, ducking: false, rolling: false,
      compressT: 0, landedT: 0, dashT: 0, floating: false, stomping: false,
      headless: 0, fistThrown: false, y: 0, invuln: 0, powers: {},
    };
    tile(grid, id, 'drawHeroSprite', tw * 3, th * 3, (ctx, t) => {
      ctx.scale(3, 3);
      ctx.translate(tw / 2 - HERO_CX, 0);
      player.anim = t * 1.6;
      // groundY puts the feet inside the tile instead of at the world's GROUND_Y.
      drawHeroSprite(ctx, player, id, t, 0, false, { flat: true, groundY: th - PAD });
    }, { animated: true });
  }
}

// -------------------------------------------------------------- 2a. turn sheet
{
  // Angle labels are measured INWARD FROM A RIGHT-FACING PROFILE, matching a
  // character travelling left-to-right. Thus 25° here is a 65° yaw from the
  // camera, not the almost-front-facing 25° interpretation used previously.
  const IDS = [
    ['grumpos', 'KRATOS / GRUMPOS'],
    ['lorenzo', 'LORENZO'],
    ['b33p', 'B-33P'],
  ];
  const ANGLES = [20, 25, 30];
  const HH = 60;
  const PAD = 12;
  const phaseAt = (i) => i / 6;

  function drawTurned(ctx, id, phase, profileTurn, cx, feetY, h = HH) {
    const yawFromFront = 90 - profileTurn;
    drawToon(ctx, id, pose('run', phase / 1.6, { time: phase, turn: yawFromFront }), cx, feetY, h);
  }

  const grid = section('angled-run', 'Turned run sheet — first pass',
    'Kratos/Grumpos, Lorenzo and B-33P. Angles are measured toward camera from a '
    + 'right-facing profile: the main 25° pose is therefore 65° from front. The arm '
    + 'swing follows the left-to-right travel axis with bounded two-bone IK; screen-left '
    + 'limbs are foreground and screen-right limbs recede behind the torso.');

  // Angle comparison: each hero gets one row of the three candidate turns at
  // the same mid-stride phase, so the silhouette choice is easy to compare.
  const refW = IDS.length * 3 * 54 + PAD * 2;
  const refH = IDS.length * 74 + PAD * 2;
  tile(grid, 'ANGLE REFERENCE', 'same run phase · 20° / 25° / 30° inward from profile', refW, refH,
    (ctx) => {
      for (let row = 0; row < IDS.length; row++) {
        const [id, label] = IDS[row];
        const y = PAD + row * 74;
        for (let col = 0; col < ANGLES.length; col++) {
          const x = PAD + col * 54 + 27;
          drawTurned(ctx, id, 0.25, ANGLES[col], x, y + 59, HH);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${label} · ${ANGLES[col]}° in`, x, y + 71);
        }
      }
    }, { animated: false, wide: true });

  // Filmstrips make the arm path legible: each strip is six evenly spaced
  // samples across one run cycle, all sharing the same 25° turn.
  const stripW = 6 * 54 + PAD * 2;
  const stripH = 80;
  for (const [id, label] of IDS) {
    tile(grid, label, '25° inward from profile · six-frame contact strip', stripW, stripH,
      (ctx) => {
        for (let i = 0; i < 6; i++) {
          const x = PAD + i * 54 + 27;
          drawTurned(ctx, id, phaseAt(i), 25, x, stripH - 10, HH);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(i + 1), x, stripH - 1);
        }
      }, { animated: true, wide: true });
  }
}

// --------------------------------------------------------- 2b. grumpos walk cycle
{
  const HH = 60;
  const ANGLE_FROM_PROFILE = 25;
  const YAW_FROM_FRONT = 90 - ANGLE_FROM_PROFILE;
  const PAD = 12;
  const FRAMES = ['contact', 'down', 'pass', 'up', 'contact', 'down', 'pass', 'up'];

  function drawGrumposWalk(ctx, phase, time, cx, feetY) {
    drawToon(ctx, 'grumpos', pose('run', phase / 1.6, {
      time,
      turn: YAW_FROM_FRONT,
      walk: true,
    }), cx, feetY, HH);
  }

  const grid = section('grumpos-walk', 'Grumpos — walk cycle',
    'Eight-frame 3/4 walk at 25° inward from profile, with the curved belt and skirt restored '
    + 'over the corrected pelvis and hip attachments.');

  tile(grid, 'GRUMPOS WALK — LIVE', 'one complete cycle · 0.9 cycles/sec', 72, 96,
    (ctx, t) => {
      const phase = (t * 0.9) % 1;
      drawGrumposWalk(ctx, phase, t, 36, 90);
    }, { animated: true });

  const stripW = 8 * 54 + PAD * 2;
  const stripH = 100;
  tile(grid, 'GRUMPOS WALK — 8 FRAMES', 'contact · down · pass · up · mirrored repeat', stripW, stripH,
    (ctx) => {
      for (let i = 0; i < 8; i++) {
        const phase = i / 8;
        const x = PAD + i * 54 + 27;
        drawGrumposWalk(ctx, phase, phase, x, 88);
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1} ${FRAMES[i]}`, x, stripH - 2);
      }
    }, { animated: false, wide: true });
}

// ---------------------------------------------------------------- 2c. hero filter lab
{
  const ids = Object.keys(TOON_SPECS);
  const grid = section('hero-filters', 'Heroes — filter lab',
    'The drawToon() run cycle pushed through canvas post-treatments — texture and grit '
    + 'experiments for de-sterilizing the cast. Display-only: nothing here is wired into the game.');

  const HH = 60;
  const TW = Math.round(HH * 0.9);
  const TH = Math.round(HH * 1.15);

  // Shared scratch canvases; tiles paint one at a time, so reuse is safe.
  const heroC = document.createElement('canvas');
  heroC.width = TW; heroC.height = TH;
  const auxC = document.createElement('canvas');

  function heroSrc(id, t) {
    const c = heroC.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, TW, TH);
    drawToon(c, id, pose('run', t), TW / 2, HH * 1.1, HH);
    return heroC;
  }

  // Deterministic noise: stable per (pixel, frame), so grain shimmers with time
  // instead of boiling differently on every repaint.
  function hash(x, y, f) {
    let h = (x * 374761393 + y * 668265263 + (f + 1) * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  // Tint only where the hero already has pixels; the tile stays transparent.
  function atop(ctx, style, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = style;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const FILTERS = [
    ['clean', (ctx, src) => ctx.drawImage(src, 0, 0)],

    ['film grain', (ctx, src, w, h, t) => {
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const f = Math.floor(t * 12);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!d[i + 3]) continue;
        const n = (hash(x, y, f) - 0.5) * 60;
        d[i] += n; d[i + 1] += n; d[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    }],

    ['crt', (ctx, src, w, h) => {
      // Shift R a pixel left and B a pixel right, dim alternate scanlines.
      const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
      const out = ctx.createImageData(w, h);
      const o = out.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const l = (y * w + Math.max(0, x - 1)) * 4;
        const r = (y * w + Math.min(w - 1, x + 1)) * 4;
        const a = Math.max(sd[i + 3], sd[l + 3], sd[r + 3]);
        if (!a) continue;
        const dim = y & 1 ? 0.7 : 1.06;
        o[i] = sd[l] * dim; o[i + 1] = sd[i + 1] * dim; o[i + 2] = sd[r + 2] * dim;
        o[i + 3] = a;
      }
      ctx.putImageData(out, 0, 0);
    }],

    ['vhs', (ctx, src, w, h, t) => {
      const f = Math.floor(t * 10);
      for (let y = 0; y < h; y += 2) {
        const tear = hash(0, y, f) < 0.05 ? 3 : 0;
        const off = Math.sin(t * 6 + y * 0.3) * 1.2 + tear;
        ctx.drawImage(src, 0, y, w, 2, off, y, w, 2);
      }
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'hue-rotate(120deg)';
      ctx.drawImage(src, 1.5, 0);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
      ctx.restore();
    }],

    ['chunky pixels', (ctx, src, w, h) => {
      const s = 3;
      auxC.width = Math.ceil(w / s); auxC.height = Math.ceil(h / s);
      const a = auxC.getContext('2d');
      a.imageSmoothingEnabled = true;
      a.drawImage(src, 0, 0, auxC.width, auxC.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(auxC, 0, 0, auxC.width * s, auxC.height * s);
    }],

    ['halftone', (ctx, src, w, h) => {
      const d = src.getContext('2d').getImageData(0, 0, w, h).data;
      const cell = 3;
      for (let y = 1; y < h; y += cell) for (let x = 1; x < w; x += cell) {
        const i = (y * w + x) * 4;
        if (!d[i + 3]) continue;
        const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
        ctx.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.7 + lum * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }],

    ['posterize', (ctx, src, w, h) => {
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        d[i] = Math.round(d[i] / 64) * 64;
        d[i + 1] = Math.round(d[i + 1] / 64) * 64;
        d[i + 2] = Math.round(d[i + 2] / 64) * 64;
      }
      ctx.putImageData(img, 0, 0);
    }],

    ['gameboy', (ctx, src, w, h) => {
      const PAL = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        const p = PAL[Math.min(3, Math.floor(lum / 64))];
        d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
      }
      ctx.putImageData(img, 0, 0);
    }],

    ['neon glow', (ctx, src) => {
      ctx.save();
      ctx.filter = 'blur(3px) saturate(2.5) brightness(1.5)';
      ctx.drawImage(src, 0, 0);
      ctx.drawImage(src, 0, 0);
      ctx.filter = 'none';
      ctx.drawImage(src, 0, 0);
      ctx.restore();
    }],

    ['ink sketch', (ctx, src, w, h, t) => {
      const f = Math.floor(t * 8);
      ctx.save();
      ctx.filter = 'saturate(0.12) contrast(1.35) brightness(1.08)';
      ctx.drawImage(src, 0, 0);
      ctx.globalAlpha = 0.35;
      for (let p = 0; p < 2; p++) {
        const jx = (hash(p, 7, f) - 0.5) * 1.6;
        const jy = (hash(p, 13, f) - 0.5) * 1.6;
        ctx.drawImage(src, jx, jy);
      }
      ctx.restore();
    }],

    ['warm grade', (ctx, src, w, h) => {
      ctx.drawImage(src, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,166,77,0.35)');
      g.addColorStop(1, 'rgba(120,40,120,0.3)');
      atop(ctx, g, w, h);
    }],
  ];

  for (const [fname, fn] of FILTERS) {
    for (const id of ids) {
      tile(grid, id, fname, TW, TH, (ctx, t) => {
        fn(ctx, heroSrc(id, t), TW, TH, t);
      }, { animated: true, hires: false });
    }
  }
}

// ---------------------------------------------------------------- 3. props
{
  const names = Object.keys(PROP_PAINTERS);
  const grid = section('props', 'Props (vector painters)',
    `${names.length} entries in PROP_PAINTERS, drawn via drawProp(). Multi-frame props cycle.`);
  // Nominal box: reuse the gameplay size where a def references this sprite.
  const sizeOf = (n) => {
    const def = Object.values(OBSTACLES).find((d) => d.sprite === n)
      || Object.values(PICKUPS).find((d) => d.sprite === n);
    return def ? { w: def.w, h: def.h } : { w: 16, h: 16 };
  };
  for (const n of names) {
    const { w, h } = sizeOf(n);
    const fh = Math.round(h * propTall(n));
    const frames = propFrames(n);
    tile(grid, n, `${w}x${fh}${frames > 1 ? ` · ${frames}f` : ''}`, w + 8, fh + 8, (ctx, t) => {
      const f = frames > 1 ? Math.floor(t * 8) % frames : 0;
      drawProp(ctx, n, 4, 4, w, fh, f);
    }, { animated: frames > 1 });
  }
}

// ---------------------------------------------------------------- 4. world sprites
{
  const keys = Object.keys(WORLD_SPRITES);
  const grid = section('world', 'World sprites (pixel grids)',
    `${keys.length} pixel-grid sprites from WORLD_SPRITES, built by buildAllSprites() and read back via getSprite().`);
  for (const k of [...keys, 'zombieWalk']) {
    const spr = getSprite(k);
    if (!spr) { tile(grid, k, 'not in cache', 16, 16, () => {}); continue; }
    tile(grid, k, `${spr.width}x${spr.height}`, spr.width + 4, spr.height + 4,
      (ctx) => ctx.drawImage(spr, 2, 2));
  }
}

// ---------------------------------------------------------------- 5. obstacles
{
  const grid = section('obstacles', 'Obstacles (in-world)',
    'Real drawWorldEntity() path — shadow, bob, telegraphs and all. Styled with the pixel pack.');
  const style = getStylePack('pixel', {});
  for (const type of Object.keys(OBSTACLES)) {
    const def = OBSTACLES[type];
    const e = makeObstacle(type, 100);
    // Gaps are holes in the ground, not art: drawWorldEntity skips them and the
    // pack's ground() cuts them. An empty tile here is correct, so say so.
    const sub = def.isGap
      ? `${def.w}x${def.h} · no art — cut by ground()`
      : `${def.w}x${def.h} · ${def.action}${def.breakable ? ' · breakable' : ''}`;
    entityTile(grid, type, sub, e, style);
  }
}

// ---------------------------------------------------------------- 6. pickups
{
  const grid = section('pickups', 'Pickups (in-world)', 'Real drawWorldEntity() path, pixel pack.');
  const style = getStylePack('pixel', {});
  for (const type of Object.keys(PICKUPS)) {
    const def = PICKUPS[type];
    const e = makePickup(type, 100);
    entityTile(grid, type, `${def.w}x${def.h}${def.power ? ' · ' + def.power : ''}`, e, style);
  }
}

// ---------------------------------------------------------------- 7. obstacles x styles
{
  const grid = section('style-matrix', 'Style matrix',
    'The same crate through every style pack — decorate() is what differs.');
  for (const cab of CABINETS) {
    const style = getStylePack(cab.style, {});
    const e = makeObstacle('crate', 100);
    entityTile(grid, cab.style, cab.id, e, style);
  }
}

// ---------------------------------------------------------------- 8. effects + hud
{
  const grid = section('effects', 'Effects & HUD bits', 'Glow/spark sprite factories and the plug row.');
  for (const [id, def] of Object.entries(POWER_DEFS)) {
    const g = glowSprite(def.color, 16);
    tile(grid, id, `glow · ${def.name}`, g.width, g.height, (ctx) => ctx.drawImage(g, 0, 0));
  }
  for (const [id, def] of Object.entries(POWER_DEFS)) {
    const s = sparkSprite(def.color);
    tile(grid, id, 'spark', s.width + 8, s.height + 8, (ctx) => ctx.drawImage(s, 4, 4));
  }
  const size = 11;
  tile(grid, 'plug row', `${PLUG_NAMES.join('/')} — banked/live/empty`, PLUG_ROW_W(size) + 8, size + 8,
    (ctx, t) => drawPlugRow(ctx, 4, 4, Math.floor(t) % 4, [false, true, false], size), { animated: true });
  tile(grid, 'plug icons', PLUG_ICONS.join(' · '), 16 * 3 + 8, 24, (ctx) => {
    PLUG_ICONS.forEach((n, i) => drawProp(ctx, n, 4 + i * 16, 4, 14, 14));
  });
}

// ---------------------------------------------------------------- driver
// Only visible tiles animate; static tiles paint once. Keeps ~200 canvases cheap.
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    const t = tiles.find((x) => x.card === en.target);
    if (t) t.visible = en.isIntersecting;
  }
}, { rootMargin: '200px' });
for (const t of tiles) io.observe(t.card);

for (const t of tiles) paint(t, 0);

let start = performance.now();
function frame(now) {
  // Clamp: a rAF timestamp is the frame's start time and can predate a
  // performance.now() sampled after it, so `now - start` goes slightly
  // negative on the first frame. surgePack.pick() indexes packs[] by
  // floor(t/period) % len, and a negative t lands on packs[-1] === undefined.
  const t = Math.max(0, (now - start) / 1000);
  if (animate) for (const e of tiles) if (e.animated && e.visible) paint(e, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Poke at tiles from the devtools console: __gallery.tiles[0].stack, repaint(), etc.
// drawToon/TOON_SPECS ride along for silhouette measuring: every tile crops at
// its own height, so "how tall is this hero really?" needs a scratch canvas.
window.__gallery = {
  tiles, paint, drawToon, TOON_SPECS, HERO_DRAW_H,
  get errors() { return tiles.filter((t) => t.stack); },
};

// ---------------------------------------------------------------- controls
function applyZoom() {
  document.getElementById('zoomv').textContent = zoom + 'x';
  for (const t of tiles) {
    t.canvas.style.width = (t.fixed ? t.w : t.w * zoom) + 'px';
    t.canvas.style.height = (t.fixed ? t.h : t.h * zoom) + 'px';
  }
}
const zoomEl = document.getElementById('zoom');
zoomEl.addEventListener('input', () => { zoom = +zoomEl.value; applyZoom(); });

const resolutionEl = document.getElementById('resolution');
resolutionEl.addEventListener('change', () => {
  renderScale = +resolutionEl.value;
  resizeTiles();
});

// Backgrounds are full scenes; 3x would be 1440px wide. Cap them at 1x.
function applyBackdrop(mode) {
  document.body.className = 'bg-' + mode;
}
const bdEl = document.getElementById('backdrop');
bdEl.addEventListener('change', () => applyBackdrop(bdEl.value));

const animEl = document.getElementById('animate');
animEl.addEventListener('change', () => {
  animate = animEl.checked;
  if (!animate) return;
  start = performance.now();
});

const filterEl = document.getElementById('filter');
filterEl.addEventListener('input', () => {
  const q = filterEl.value.trim().toLowerCase();
  for (const t of tiles) t.card.style.display = !q || t.card.dataset.search.includes(q) ? '' : 'none';
});

applyZoom();
applyBackdrop(bdEl.value);
// Scene tiles stay at 1x regardless of the zoom slider.
for (const t of tiles) {
  if (t.w === W && t.h === H) {
    t.canvas.style.width = W + 'px';
    t.canvas.style.height = H + 'px';
    t.fixed = true;
  }
}
