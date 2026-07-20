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

// One tile. `draw(ctx, t)` paints into a w-by-h logical canvas; CSS scales it
// up by the zoom factor, which is exactly how the game presents its 480x270.
function tile(grid, name, sub, w, h, draw, { animated = false, wide = false } = {}) {
  const card = document.createElement('div');
  card.className = 'card' + (wide ? ' wide' : '');
  card.dataset.search = (name + ' ' + (sub || '')).toLowerCase();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const label = document.createElement('div');
  label.className = 'name';
  label.innerHTML = `<b>${name}</b>` + (sub ? `<br>${sub}` : '');
  card.append(canvas, label);
  grid.appendChild(card);

  const ctx = canvas.getContext('2d');
  const entry = { card, canvas, ctx, draw, animated, visible: true, w: canvas.width, h: canvas.height, name };
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
  try {
    entry.draw(ctx, t);
  } catch (err) {
    entry.stack = err.stack;
    entry.card.classList.add('err');
    entry.card.querySelector('.name').innerHTML = `<b>${entry.name}</b><br>${err.message}`;
    entry.draw = () => {}; // don't spam the same throw every frame
  }
}

function savePng(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/[^\w.-]+/g, '_') + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
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
    `${ids.length} heroes x 3 poses, drawn by drawToon() at 3x the in-game ${HERO_DRAW_W}x${HERO_DRAW_H} box.`);
  const HH = 60; // draw tall: these are vector toons, not pixel grids
  for (const id of ids) {
    for (const kind of ['run', 'jump', 'duck']) {
      tile(grid, id, kind, HH * 0.9, HH * 1.15, (ctx, t) => {
        drawToon(ctx, id, pose(kind, t), (HH * 0.9) / 2, HH * 1.1, HH);
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
window.__gallery = { tiles, paint, get errors() { return tiles.filter((t) => t.stack); } };

// ---------------------------------------------------------------- controls
function applyZoom() {
  document.getElementById('zoomv').textContent = zoom + 'x';
  for (const t of tiles) {
    t.canvas.style.width = t.w * zoom + 'px';
    t.canvas.style.height = t.h * zoom + 'px';
  }
}
const zoomEl = document.getElementById('zoom');
zoomEl.addEventListener('input', () => { zoom = +zoomEl.value; applyZoom(); });

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
