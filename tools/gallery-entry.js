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
import { buildAllSprites, drawWorldEntity, drawHeroSprite, drawPowerPose, HERO_DRAW_W, HERO_DRAW_H } from '../src/game/draw.js';
import { OBSTACLES, PICKUPS, makeObstacle, makePickup } from '../src/game/entities.js';
import { HERO_BY_ID } from '../src/data/heroes.js';
import { PROP_PAINTERS, drawProp, propFrames, propTall, glowSprite, sparkSprite } from '../src/sprites/props.js';
import { WORLD_SPRITES } from '../src/sprites/world.js';
import {
  cabinetPalette, cabinetStyle, drawCabinetShell, drawCabinetScreen, drawScreenSweep,
  drawDoor, DOOR_PALETTES, OVERTIME_PALETTE, CABINET_STYLES, CABINET_STYLE,
} from '../src/sprites/arcade.js';
import { WALL_DRESSINGS, drawWallBay, shadeWall, wallLitAt, BAY_W, WALL_H, WALL_BASE } from '../src/sprites/backwall.js';
import { TOON_SPECS, drawToon, drawToonFace, setInk, setRim, LORENZO_FACES, setLorenzoFace } from '../src/sprites/toons.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { CABINETS } from '../src/data/cabinets.js';
import { UNLOCKS } from '../src/data/stages.js';
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
  a.dataset.target = id;
  a.textContent = title;
  nav.appendChild(a);
  return grid;
}

// A nav label with no target section — just a visual break before the lab
// cluster, so "still iterating on this" reads as a different kind of content
// from the production reference sections above it.
function navSeparator(label) {
  const sep = document.createElement('span');
  sep.className = 'nav-sep';
  sep.textContent = label;
  nav.appendChild(sep);
}

// One tile. `draw(ctx, t)` paints into a w-by-h logical canvas. The backing
// canvas can be rendered at a denser scale so saved PNGs match the smooth,
// high-resolution treatment used by the Cast Roll.
//
// `hires` is true (follow the global resolution control), false (pin to 1x), or
// a NUMBER pinning this tile to its own scale regardless of the control. A tile
// pinned above the zoom renders denser than it displays, which supersamples it:
// the browser downsamples the backing store on the way to the screen, so
// sub-pixel stroke differences survive as tone instead of snapping to whole
// pixels. That is the only honest way to eyeball a 1.2px-vs-0.7px line.
function tile(grid, name, sub, w, h, draw, { animated = false, wide = false, hires = true } = {}) {
  const card = document.createElement('div');
  card.className = 'card' + (wide ? ' wide' : '');
  card.dataset.search = (name + ' ' + (sub || '')).toLowerCase();
  const canvas = document.createElement('canvas');
  const logicalW = Math.max(1, Math.round(w));
  const logicalH = Math.max(1, Math.round(h));
  const rs = typeof hires === 'number' ? hires : hires ? renderScale : 1;
  canvas.width = Math.max(1, Math.round(logicalW * rs));
  canvas.height = Math.max(1, Math.round(logicalH * rs));
  const label = document.createElement('div');
  label.className = 'name';
  label.innerHTML = `<b>${name}</b>` + (sub ? `<br>${sub}` : '');
  card.append(canvas, label);
  grid.appendChild(card);

  const ctx = canvas.getContext('2d');
  const entry = { card, canvas, ctx, draw, animated, visible: true, w: logicalW, h: logicalH, name, hires, renderScale: rs };
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
    entry.renderScale = typeof entry.hires === 'number' ? entry.hires : entry.hires ? renderScale : 1;
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

// What a real run actually shows the instant an ability fires: poseFromPlayer's
// ability-specific pose fields plus drawPowerPose()'s overlay flourish where one
// exists. Shared by the per-hero section and the all-cast comparison below, so
// the two can never drift apart.
//
// Loops the same 0..0.3s (0..0.5s for the eat bite) countdown useAbility() sets
// player.powerPoseT to, rather than freezing on one alpha, so the flourish
// visibly flashes in instead of holding at a single frame.
const POWERPOSE_PERIOD = 1.4;
const powerPoseAlpha = (t, budget) => Math.min(1, Math.max(0, budget - (t % POWERPOSE_PERIOD)) * 5);
// Kept in sync with poseFromPlayer, not reinvented here. `local` is "seconds
// since this pulse's ability fired", matching the bite's own time-reset in
// poseFromPlayer so biteWave() opens from a closed mouth.
function powerupExtra(type, local) {
  if (type === 'dash') return { lean: 0.26 };
  if (type === 'roll') return { kind: 'duck', roll: true };
  if (type === 'compress') return { kind: 'duck' };
  if (type === 'fist') return { headless: true };
  if (type === 'shoot') return { menuAction: 'aim' };
  if (type === 'eat') return { menuAction: 'chomp', time: local };
  return {};
}
// One power-up tile: the ability pose plus its flourish, feet at `feetY`.
// `poseScale` maps drawPowerPose's in-run 24px offsets onto a taller gallery toon.
function drawPowerupTile(ctx, id, hero, t, cx, feetY, hh) {
  const type = hero.ability.type;
  const budget = type === 'eat' ? 0.5 : 0.3; // matches useAbility()'s powerPoseT
  const local = t % POWERPOSE_PERIOD;
  drawToon(ctx, id, pose('run', t, powerupExtra(type, local)), cx, feetY, hh);
  drawPowerPose(ctx, cx, feetY, type, powerPoseAlpha(t, budget), hh / HERO_DRAW_H);
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
    + 'Celebrate is the results-screen victory routine: each hero\'s signature bounce, then their big move. '
    + 'Power up is what a real run actually shows the instant their ability fires — poseFromPlayer\'s '
    + 'ability-specific pose fields (lean/roll/duck/headless/menuAction) plus drawPowerPose()\'s overlay '
    + 'flourish where one exists. Stomp and axe read from their world-space effect instead (a shockwave, '
    + 'a thrown prop) rather than a body-pose change, so those two tiles show the bare cast animation.');
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
    // Gary is cast-roll flavour, not a roster member — he has no ability to show.
    const hero = HERO_BY_ID[id];
    if (!hero) continue;
    const th = HH * 1.3;
    tile(grid, id, `powerup · ${hero.ability.label}`, HH * 0.9, th, (ctx, t) => {
      drawPowerupTile(ctx, id, hero, t, (HH * 0.9) / 2, th - HH * 0.05, HH);
    }, { animated: true });
  }
}

// ---------------------------------------------------------- 2a. pose comparison
// The same cast, grouped by pose instead of by hero: "All Idle", "All Run", etc.
// The heroes section above is one row per hero across every pose — great for
// judging one character, bad for spotting the one hero whose run cycle reads
// wrong next to everyone else's. This is that comparison, the other way round.
{
  const ids = Object.keys(TOON_SPECS);
  const secId = 'pose-compare';
  const title = 'Heroes — pose comparison';
  const s = document.createElement('section');
  s.id = secId;
  s.innerHTML = `<h2 id="h-${secId}">${title}</h2>`
    + `<p class="note">The whole cast doing the same pose, lined up together — an outlier `
    + 'stands out fast here in a way it does not when every hero only appears next to their '
    + 'own other poses.</p>';
  root.appendChild(s);
  const navLink = document.createElement('a');
  navLink.href = `#h-${secId}`;
  navLink.dataset.target = secId;
  navLink.textContent = title;
  nav.appendChild(navLink);

  const HH = 60;
  const LABELS = {
    idle: 'All Idle', run: 'All Run', jump: 'All Jump', duck: 'All Duck',
    celebrate: 'All Celebrate', powerup: 'All Special Move',
  };
  const subhead = (text, note) => {
    const h3 = document.createElement('h3');
    h3.className = 'subhead';
    h3.textContent = text;
    s.appendChild(h3);
    if (note) {
      const p = document.createElement('p');
      p.className = 'note';
      p.textContent = note;
      s.appendChild(p);
    }
    const grid = document.createElement('div');
    grid.className = 'grid';
    s.appendChild(grid);
    return grid;
  };
  for (const kind of ['idle', 'run', 'jump', 'duck', 'celebrate']) {
    const grid = subhead(LABELS[kind]);
    // Mirrors the heroes section's own tile heights so a side-by-side glance
    // between the two sections compares like for like.
    const th = kind === 'celebrate' ? HH * 1.62 : HH * 1.3;
    for (const hid of ids) {
      tile(grid, hid, kind, HH * 0.9, th, (ctx, t) => {
        drawToon(ctx, hid, pose(kind, t, kind === 'celebrate' ? { menu: true } : {}), (HH * 0.9) / 2, th - HH * 0.05, HH);
      }, { animated: true });
    }
  }
  // The row the other five never gave you: every ability firing at once. Two
  // heroes are absent by design — gary and dolores are cast-roll flavour with no
  // roster entry, so there is no ability to fire. Stomp and axe change the world
  // rather than the body (a shockwave, a thrown prop), so those tiles look like
  // a plain run next to the others; that is the honest comparison, and seeing
  // them side by side is the fastest way to notice which specials do not read.
  {
    const roster = ids.filter((hid) => HERO_BY_ID[hid]);
    const grid = subhead(LABELS.powerup,
      `${roster.length} of ${ids.length} heroes — the ability pose plus drawPowerPose()'s flourish, `
      + 'pulsing on the same countdown a real run gives it.');
    const th = HH * 1.3;
    for (const hid of roster) {
      const hero = HERO_BY_ID[hid];
      tile(grid, hid, `${hero.ability.label} · ${hero.ability.type}`, HH * 0.9, th, (ctx, t) => {
        drawPowerupTile(ctx, hid, hero, t, (HH * 0.9) / 2, th - HH * 0.05, HH);
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

// ------------------------------------------------------- 3b. food court furniture
{
  const grid = section('foodcourt', 'Food court furniture',
    'The hub concourse, at the size HubState draws it: nine cabinets lit and dead '
    + '(sprites/arcade.js), the overtime machine, and every service door. '
    + 'Cabinet colours come straight from each CABINETS entry.');
  const CW = 40, CH = 90, DW = 44, DH = 84;
  const cabTile = (cab, unlocked) => {
    const pal = cabinetPalette(cab, unlocked);
    // The first cabinet has no unlock threshold at all, so UNLOCKS has no entry
    // for it — say "free" rather than "undefined plugs".
    tile(grid, cab.id + (unlocked ? '' : ' (locked)'), unlocked ? cab.genre : `${UNLOCKS[cab.id] ?? 0} plugs`,
      CW + 8, CH + 8, (ctx, t) => {
        drawCabinetShell(ctx, 4, 4, CW, CH, pal);
        const scr = drawCabinetScreen(ctx, 4, 4, CW, CH, pal);
        if (scr) drawScreenSweep(ctx, scr, t, pal.seed);
      }, { animated: unlocked });
  };
  for (const cab of CABINETS) cabTile(cab, true);
  for (const cab of CABINETS) cabTile(cab, false);
  tile(grid, 'overtime', 'OVERTIME_PALETTE', CW + 8, CH + 8,
    (ctx) => drawCabinetShell(ctx, 4, 4, CW, CH, OVERTIME_PALETTE));
  for (const [type, pal] of Object.entries(DOOR_PALETTES)) {
    tile(grid, type, `${pal.icon} sign`, DW + 8, DH + 8,
      (ctx) => drawDoor(ctx, 4, 4, DW, DH, pal));
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

// ==================================================================
// LAB & BAKE-OFFS — dev-only comparisons kept below the production
// reference sections above. These render real code paths but decide or
// audit a still-open art question rather than document a shipped asset.
// ==================================================================
navSeparator('lab / bake-offs');

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

// --------------------------------------------------- 3c. cabinet style bake-off
// Four silhouettes of the same machine, so the choice can be made by looking
// rather than by describing. Every style shares the hardware (controls, coin
// door, marquee art) and differs only in outline and proportion. Whichever wins
// becomes CABINET_STYLE in sprites/arcade.js — a one-word edit.
{
  const grid = section('cabinet-styles', 'Cabinet style bake-off',
    'The same cabinets drawn in each candidate silhouette. '
    + `Active style is "${CABINET_STYLE}". `
    + 'Rows are the styles; each is shown at hub size against a representative '
    + 'spread of palettes — bright, dark, pale — plus a locked one.');
  // A spread that stresses the palette maths: a bright cabinet, a near-black
  // one, a near-white one, and the remix cabinet.
  const PICKS = ['plumber', 'crypt', 'office', 'surge'];
  for (const [name, st] of Object.entries(CABINET_STYLES)) {
    for (const id of PICKS) {
      const cab = CABINETS.find((c) => c.id === id);
      const pal = cabinetPalette(cab, true);
      tile(grid, `${name} — ${id}`, `${st.w}x${st.h}${name === CABINET_STYLE ? ' (active)' : ''}`,
        st.w + 8, st.h + 8, (ctx, t) => {
          drawCabinetShell(ctx, 4, 4, st.w, st.h, pal, name);
          const scr = drawCabinetScreen(ctx, 4, 4, st.w, st.h, pal, name);
          if (scr) drawScreenSweep(ctx, scr, t, pal.seed);
        }, { animated: true });
    }
    const locked = cabinetPalette(CABINETS.find((c) => c.id === 'rhythm'), false);
    tile(grid, `${name} — locked`, 'unplugged', st.w + 8, st.h + 8,
      (ctx) => drawCabinetShell(ctx, 4, 4, st.w, st.h, locked), { animated: false });
  }
}

// ------------------------------------------------- 3d. back wall bake-off
// Five candidate dressings for the wall behind the cabinets, which is currently
// one flat fill. Each is shown three ways: the bay lit, the bay dark, and the
// bay as the concourse actually frames it — with a cabinet standing in front,
// which is the only view that says how much of the art survives the occlusion.
// The strip at the end is the real pitch: one painter, lit on the left, falling
// off to nothing on the right as the ceiling lights run out.
{
  const grid = section('backwall', 'Back wall bake-off',
    'Candidate dressings for the wall band behind the concourse (y 40..190, one '
    + `${BAY_W}px ceiling-light bay each). Columns: fully lit, unlit, and with a `
    + 'cabinet in front at hub scale. Lighting is wallLitAt() falloff, not a '
    + 'per-bay on/off — so detail fades with distance from the nearest working light.');
  const BW = BAY_W, BH = WALL_H;
  const CS = cabinetStyle();
  const litPal = cabinetPalette(CABINETS[0], true);

  for (const [id, d] of Object.entries(WALL_DRESSINGS)) {
    tile(grid, d.name, 'lit', BW, BH,
      (ctx, t) => drawWallBay(ctx, 0, 0, BW, BH, id, { t, seed: 3, lit: 1, pal: litPal }),
      { animated: true });
    tile(grid, d.name, 'unlit — same art, no power', BW, BH,
      (ctx, t) => drawWallBay(ctx, 0, 0, BW, BH, id, { t, seed: 3, lit: 0.12, pal: litPal }),
      { animated: true });
    tile(grid, d.name, 'in place, cabinet in front', BW, BH,
      (ctx, t) => {
        drawWallBay(ctx, 0, 0, BW, BH, id, { t, seed: 3, lit: 0.9, pal: litPal });
        // Hub geometry: floor line at 190 within this band, cabinet standing on it.
        const cy = BH - 2 - CS.h;
        drawCabinetShell(ctx, BW / 2 - CS.w / 2, cy, CS.w, CS.h, litPal);
        const scr = drawCabinetScreen(ctx, BW / 2 - CS.w / 2, cy, CS.w, CS.h, litPal);
        if (scr) drawScreenSweep(ctx, scr, t, pal.seed);
      }, { animated: true });
  }

  // The falloff itself: four bays of one dressing, lit only at the left end.
  // Every machine is PLUGGED IN here — the ones on the right are dim because
  // nothing is lighting them, not because they are locked. The shading pass is
  // deliberately last and covers the cabinets too, so the darkness reads as the
  // room running out of light rather than as the wall alone going out.
  const falloff = (x) => wallLitAt(x, 2, BW);
  for (const [id, d] of Object.entries(WALL_DRESSINGS)) {
    tile(grid, `${d.name} — falloff`, '4 bays, 2 lights working, one lit gradient over the lot', BW * 4, BH,
      (ctx, t) => {
        for (let b = 0; b < 4; b++) {
          drawWallBay(ctx, b * BW, 0, BW, BH, id, { t, seed: b, lit: 1, pal: litPal });
        }
        for (let b = 0; b < 4; b++) {
          const bx = b * BW;
          const pal = cabinetPalette(CABINETS[b % CABINETS.length], true);
          const cy = BH - 2 - CS.h;
          drawCabinetShell(ctx, bx + BW / 2 - CS.w / 2, cy, CS.w, CS.h, pal);
          const scr = drawCabinetScreen(ctx, bx + BW / 2 - CS.w / 2, cy, CS.w, CS.h, pal);
          if (scr) drawScreenSweep(ctx, scr, t, pal.seed);
        }
        shadeWall(ctx, 0, 0, BW * 4, BH, falloff);
        // Fixtures last, at the hub's y 46 within the wall band: a dead tube
        // should not be lit by its own glow, and a live one is the light source.
        for (let b = 0; b < 4; b++) {
          ctx.fillStyle = b < 2 ? '#f6d33c' : '#30303f';
          ctx.fillRect(b * BW + BW / 2 - 13, 6, 26, 4);
        }
      }, { animated: true, wide: true });
  }
}

// The eye ring is currently 0.02u wide on an eye 0.11u across, while the body
// contour it sits inside is 0.016u — so the darkest, thinnest-looking line on
// the hero is in fact the FATTEST one he owns, wrapped around his smallest
// feature. Slice an eye horizontally at u=60 and it goes ring 1.2 / white 1.1 /
// pupil 3.1 / white 1.1 / ring 1.2: the outline is wider than the sclera.
//
// Four ways out, and they are not interchangeable — thinning the face leaves the
// silhouette's weight alone, thinning everything changes the hero's whole read,
// and dropping alpha changes neither width but risks losing the figure against
// the room. The 24px column is the one that decides it: `u` is 24 in a real run
// (drawHeroSprite passes HERO_DRAW_H), which is small enough that the Math.max
// floors bind and hand back a HEAVIER-than-proportional line. A treatment that
// looks right at gallery size and dissolves at 24px is not a treatment.
{
  const grid = section('ink-bakeoff', 'Outline weight bake-off',
    'One rig, five ink weights. `face` scales the eye/brow/mouth strokes, `body` scales the '
    + 'contour `ow`, `alpha` scales the outline colors — see INK in toons.js. `current` is what '
    + 'ships; `was` winds the face strokes back to their pre-2026-07-22 weights, when the eye '
    + 'ring was drawn wider than the contour around it. Each row is the same hero at three '
    + 'scales: the 60u gallery pose, the 32px HUD face crop, and the real in-run 24u sprite at '
    + '2x world zoom. Judge on the 24u column, not the big one — the stroke floors only bind '
    + 'down there, and that is where the game actually lives.');

  // Rebased on the shipped weights. `was` is the pre-thin-face rig — face 1.818
  // is 1/0.55, which winds the baked 0.011u ring back to the 0.020u it used to
  // be — kept so the change stays visible and reversible by eye rather than by
  // archaeology. The rest are the NEXT levers, not the ones already spent.
  const TREATMENTS = [
    ['current', 'shipped — 0.011u ring, 0.016u contour', { body: 1, face: 1, alpha: 1 }],
    ['was', 'pre-thin-face — 0.020u ring over a 0.016u contour', { body: 1, face: 1.818, alpha: 1 }],
    ['thinner face', 'ring →0.008u, if current still reads heavy', { body: 1, face: 0.72, alpha: 1 }],
    ['thin body', 'contour 0.016u→0.011u · face as shipped', { body: 0.7, face: 1, alpha: 1 }],
    ['soft', 'no geometry change · outline alpha 0.32→0.20', { body: 1, face: 1, alpha: 0.62 }],
  ];
  // grumpos is the complaint (bald, beard-gap mouth, brows); lorenzo carries a
  // mustache and a nose; b33p's eyes are LED bars, a different face dialect that
  // a face-only dial could easily wreck while the other two look fine.
  const IDS = ['grumpos', 'lorenzo', 'b33p'];

  const HH = 60;

  // Head-to-head, which is the only layout that actually settles this. Five
  // full-body cards stacked down the page put ~250px of gap and a scroll between
  // the things being compared, and a 0.009u stroke difference does not survive
  // that trip. Same feature, touching, same frozen phase, magnified — and
  // rendered at 6x into a 3x display so the extra density comes back as tone
  // rather than as a fatter run of whole pixels.
  //
  // Each row keeps its OWN u and scales the context to match sizes on screen.
  // Blowing 24u up to 60u instead would relax the Math.max stroke floors and
  // quietly show a sprite the game never draws.
  const CELL = 78, LABEL_W = 62, HEAD_ROWS = [['60u', HH], ['24u', HERO_DRAW_H]];
  const HEAD_SPAN = 0.62;  // fraction of u the crop covers, top of skull to chin
  const headCell = (ctx, id, h, cellX, cellY, phase) => {
    // Where drawHumanoid parks the head, in u above the feet: see `headY`.
    const anchor = TOON_SPECS[id].heavy ? 0.978 : 0.76;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX, cellY, CELL, CELL);
    ctx.clip();
    ctx.translate(cellX + CELL / 2, cellY + CELL / 2);
    ctx.scale(CELL / (HEAD_SPAN * h), CELL / (HEAD_SPAN * h));
    // feet at +anchor*h below the cell center puts the head center ON it
    drawToon(ctx, id, pose('run', phase), 0, anchor * h, h);
    ctx.restore();
  };

  const PHASE = 0.42; // frozen: an A/B that bobs is an A/B you cannot read
  for (const id of IDS) {
    const cmpW = LABEL_W + TREATMENTS.length * CELL;
    const cmpH = 14 + HEAD_ROWS.length * CELL;
    tile(grid, `${id} — head to head`, 'all five treatments, frozen, 6x supersampled', cmpW, cmpH, (ctx) => {
      ctx.font = 'bold 7px ui-monospace, monospace';
      ctx.fillStyle = '#8a8a9a';
      ctx.textBaseline = 'alphabetic';
      TREATMENTS.forEach(([name], i) => {
        ctx.fillText(name, LABEL_W + i * CELL + 4, 9);
      });
      HEAD_ROWS.forEach(([rowLabel, h], r) => {
        const y = 14 + r * CELL;
        ctx.fillStyle = '#8a8a9a';
        ctx.fillText(rowLabel, 4, y + CELL / 2);
        TREATMENTS.forEach(([, , ink], i) => {
          setInk(ink);
          try {
            headCell(ctx, id, h, LABEL_W + i * CELL, y, PHASE);
          } finally {
            setInk();
          }
        });
      });
      // Hairlines between cells so the eye has an edge to compare across.
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let i = 0; i <= TREATMENTS.length; i++) {
        ctx.moveTo(LABEL_W + i * CELL, 12);
        ctx.lineTo(LABEL_W + i * CELL, cmpH);
      }
      for (let r = 0; r <= HEAD_ROWS.length; r++) {
        ctx.moveTo(LABEL_W, 14 + r * CELL);
        ctx.lineTo(cmpW, 14 + r * CELL);
      }
      ctx.stroke();
    }, { wide: true, hires: 6 });
  }

  const POSE_W = Math.round(HH * 0.9), POSE_H = Math.round(HH * 1.3);
  const FACE = 34;
  const RUN_Z = 2; // stand-in for the world zoom drawHeroSprite renders under
  const RUN_W = (HERO_DRAW_W + 10) * RUN_Z, RUN_H = (HERO_DRAW_H + 8) * RUN_Z;
  const GAP = 6;
  const TW = POSE_W + GAP + FACE + GAP + RUN_W;
  const TH = Math.max(POSE_H, FACE, RUN_H);

  for (const id of IDS) {
    for (const [name, note, ink] of TREATMENTS) {
      tile(grid, `${id} — ${name}`, note, TW, TH, (ctx, t) => {
        setInk(ink);
        try {
          drawToon(ctx, id, pose('run', t), POSE_W / 2, POSE_H - HH * 0.05, HH);

          const fx = POSE_W + GAP;
          drawToonFace(ctx, id, fx, (TH - FACE) / 2, FACE, FACE);

          // The honest one: u = HERO_DRAW_H exactly as a run passes it, then a
          // world-zoom scale on top. Scaling the CONTEXT (not the unit) is what
          // the game does, so the floors bind at 24 and magnify from there.
          ctx.save();
          ctx.translate(fx + FACE + GAP, 0);
          ctx.scale(RUN_Z, RUN_Z);
          drawToon(ctx, id, pose('run', t), (HERO_DRAW_W + 10) / 2, RUN_H / RUN_Z - 4, HERO_DRAW_H);
          ctx.restore();
        } finally {
          setInk(); // never leak a treatment into the next tile
        }
      }, { animated: true, wide: true });
    }
  }
}

// ------------------------------------------------------- 2d. lorenzo face lab
// The complaint: his cap hem is a flat chord at -0.12R while his eyes top out
// at -0.38R, so the hat crosses 42% of the way down the eye — and the focus
// brows, at -0.45R..-0.29R, are drawn entirely inside the hat. They only show
// because the face paints after the hat. See LORENZO_FACES in toons.js; every
// candidate below renders through the real drawHead path, dialed by
// setLorenzoFace the same way the ink bake-off dials setInk.
{
  const grid = section('lorenzo-face', 'Lorenzo — cap & face bake-off',
    'Six candidates for the brow line. `current` is the shipped geometry, reproduced exactly. '
    + '`lifted` and `arched` raise the hem off the eyes and leave the face alone; `low face` keeps the '
    + 'low cap as his brow line and drops the mask under it instead; `bushy` and `pushed back` restyle '
    + 'the face itself, trading the ink hairlines for brown caterpillar brows that match the mustache. '
    + 'The head-to-head grid is frozen and supersampled — judge the brow line there, then check the '
    + 'animated strips for what a blink, a scowl and a whoop do to it.');

  const HH = 60;
  // Same crop machinery as the ink bake-off: each row keeps its OWN u and
  // scales the context, so the stroke floors bind where the game binds them.
  const CELL = 84, LABEL_W = 60;
  const HEAD_SPAN = 0.62;
  const headCell = (ctx, cellX, cellY, h, p) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX, cellY, CELL, CELL);
    ctx.clip();
    ctx.translate(cellX + CELL / 2, cellY + CELL / 2);
    ctx.scale(CELL / (HEAD_SPAN * h), CELL / (HEAD_SPAN * h));
    drawToon(ctx, 'lorenzo', p, 0, 0.76 * h, h);
    ctx.restore();
  };
  // Three rows that between them expose every failure mode: the idle face has
  // NO brows at all (they are keyed to focus), the running face is the one that
  // put brows on the hat, and the 24u row is what a real run draws.
  const ROWS = [
    ['idle 60u', HH, () => pose('idle', 0.7)],
    ['run 60u', HH, () => pose('run', 0.42)],
    ['run 24u', HERO_DRAW_H, () => pose('run', 0.42)],
  ];
  const cmpW = LABEL_W + LORENZO_FACES.length * CELL;
  const cmpH = 14 + ROWS.length * CELL;
  tile(grid, 'lorenzo — head to head', 'six variants, frozen, 6x supersampled', cmpW, cmpH, (ctx) => {
    ctx.font = 'bold 7px ui-monospace, monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8a8a9a';
    LORENZO_FACES.forEach((v, i) => ctx.fillText(v.label, LABEL_W + i * CELL + 4, 9));
    ROWS.forEach(([rowLabel, h, mk], r) => {
      const y = 14 + r * CELL;
      ctx.fillStyle = '#8a8a9a';
      ctx.fillText(rowLabel, 4, y + CELL / 2);
      LORENZO_FACES.forEach((v, i) => {
        setLorenzoFace(v.id);
        try {
          headCell(ctx, LABEL_W + i * CELL, y, h, mk());
        } finally {
          setLorenzoFace();
        }
      });
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    for (let i = 0; i <= LORENZO_FACES.length; i++) {
      ctx.moveTo(LABEL_W + i * CELL, 12);
      ctx.lineTo(LABEL_W + i * CELL, cmpH);
    }
    for (let r = 0; r <= ROWS.length; r++) {
      ctx.moveTo(LABEL_W, 14 + r * CELL);
      ctx.lineTo(cmpW, 14 + r * CELL);
    }
    ctx.stroke();
  }, { wide: true, hires: 6 });

  // Live strips: full body, HUD face crop, and the four poses whose expressions
  // move the brow line (blink lives inside idle; celebrate opens the grin).
  const POSE_W = Math.round(HH * 0.9), POSE_H = Math.round(HH * 1.35);
  const FACE = 40;
  const GAP = 6;
  const KINDS = ['idle', 'run', 'jump', 'duck', 'celebrate'];
  const TW = POSE_W + GAP + FACE + GAP + KINDS.length * POSE_W;
  for (const v of LORENZO_FACES) {
    tile(grid, `lorenzo — ${v.label}`, v.note, TW, POSE_H, (ctx, t) => {
      setLorenzoFace(v.id);
      try {
        drawToon(ctx, 'lorenzo', pose('run', t), POSE_W / 2, POSE_H - HH * 0.05, HH);
        drawToonFace(ctx, 'lorenzo', POSE_W + GAP, (POSE_H - FACE) / 2, FACE, FACE);
        KINDS.forEach((kind, i) => {
          const cx = POSE_W + GAP + FACE + GAP + i * POSE_W + POSE_W / 2;
          drawToon(ctx, 'lorenzo', pose(kind, t, kind === 'celebrate' ? { menu: true } : {}), cx, POSE_H - HH * 0.05, HH);
        });
      } finally {
        setLorenzoFace(); // never leak a variant into the next tile
      }
    }, { animated: true, wide: true });
  }
}

// The bevel on grumpos's skull: is the lit-side rim reading as a raised edge,
// and which lever fixes it. Laid out like the ink bake-off next door, with one
// axis it needs and that one does not — the BACKDROP. A canvas stroke straddles
// its path, so half the contour lands on the background and half on the fill;
// the whole effect is that dark-on-black is a no-op while dark-on-skin is not.
// An A/B run only against the gallery's black cannot see that, and the game
// stands its cast on a lit wall.
{
  const grid = section('rim-bakeoff', 'Lit-side rim bake-off',
    'The key light lays a warm rim over the middle `RIM.w` of the contour, leaving dark ink on '
    + 'both sides of it — see RIM in toons.js. Against near-black the OUTER dark is invisible '
    + 'and the INNER dark is not, so the edge reads light-then-dark: an embossed rim rather than '
    + 'an outline. Every row runs twice, on the gallery black and on the hub\'s own WALL_BASE, '
    + 'because the whole question is what the ink has to darken. `inside` clips the rim to its '
    + 'shape so it can only warm the fill; `full` lets it eat the whole contour (the version '
    + 'that used to delete the leading shoulder); `half` touches alpha and no geometry. Note '
    + 'INK.alpha does NOT reach the rim, so the ink bake-off\'s `soft` column shifts this ratio '
    + 'toward the light half as a side effect. Judge the 24u rows.');

  const TREATMENTS = [
    ['current', 'shipped — centred, w 0.6, alpha 0.34', { w: 0.6, a: 1 }],
    ['inside', 'clipped to the shape · same band, all of it on the fill side', { w: 0.6, a: 1, inside: true }],
    ['inside thin', 'clipped and halved, so dark ink still survives inboard', { w: 0.3, a: 1, inside: true }],
    ['full', 'w 0.6→1.0 · rim covers the contour outright on the lit side', { w: 1, a: 1 }],
    ['half', 'no geometry change · rim alpha 0.34→0.17', { w: 0.6, a: 0.5 }],
    ['none', 'rim off entirely — contour and form ramps only', { w: 0, a: 0 }],
  ];

  // grumpos is the complaint: #ded9d2 is the palest fill in the cast, so his
  // inner dark sliver has the most to bite on. gnash is the opposite end — a
  // #4a50d2 head, where the fill is darker than the ink and the rim is the only
  // edge there is. lorenzo carries both at once, pale skin under a dark cap.
  const IDS = ['grumpos', 'gnash', 'lorenzo'];

  const CELL = 72, LABEL_W = 62;
  const HEAD_SPAN = 0.62;
  // Same u twice, once per backdrop — never one u stretched to stand in for the
  // other, for the reason the ink bake-off spells out: blowing 24u up to 60u
  // relaxes the stroke floors and shows a sprite the game never draws.
  const HEAD_ROWS = [
    ['60u', 60, null],
    ['60u ·wall', 60, WALL_BASE],
    ['24u', HERO_DRAW_H, null],
    ['24u ·wall', HERO_DRAW_H, WALL_BASE],
  ];
  const headCell = (ctx, id, h, cellX, cellY, phase, bg) => {
    const anchor = TOON_SPECS[id].heavy ? 0.978 : 0.76;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX, cellY, CELL, CELL);
    ctx.clip();
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(cellX, cellY, CELL, CELL); }
    ctx.translate(cellX + CELL / 2, cellY + CELL / 2);
    ctx.scale(CELL / (HEAD_SPAN * h), CELL / (HEAD_SPAN * h));
    drawToon(ctx, id, pose('run', phase), 0, anchor * h, h);
    ctx.restore();
  };

  const PHASE = 0.42; // frozen, same as the ink bake-off, so the two compare
  for (const id of IDS) {
    const cmpW = LABEL_W + TREATMENTS.length * CELL;
    const cmpH = 14 + HEAD_ROWS.length * CELL;
    tile(grid, `${id} — rim head to head`, 'six treatments x two backdrops, frozen', cmpW, cmpH, (ctx) => {
      ctx.font = 'bold 7px ui-monospace, monospace';
      ctx.fillStyle = '#8a8a9a';
      ctx.textBaseline = 'alphabetic';
      TREATMENTS.forEach(([name], i) => {
        ctx.fillText(name, LABEL_W + i * CELL + 4, 9);
      });
      HEAD_ROWS.forEach(([rowLabel, h, bg], r) => {
        const y = 14 + r * CELL;
        ctx.fillStyle = '#8a8a9a';
        ctx.fillText(rowLabel, 4, y + CELL / 2);
        TREATMENTS.forEach(([, , rim], i) => {
          setRim(rim);
          try {
            headCell(ctx, id, h, LABEL_W + i * CELL, y, PHASE, bg);
          } finally {
            setRim(); // never leak a treatment into the next cell
          }
        });
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let i = 0; i <= TREATMENTS.length; i++) {
        ctx.moveTo(LABEL_W + i * CELL, 12);
        ctx.lineTo(LABEL_W + i * CELL, cmpH);
      }
      for (let r = 0; r <= HEAD_ROWS.length; r++) {
        ctx.moveTo(LABEL_W, 14 + r * CELL);
        ctx.lineTo(cmpW, 14 + r * CELL);
      }
      ctx.stroke();
    }, { wide: true, hires: 5 });
  }

  // The bevel is an EDGE effect, and a head crop still shows it wrapped around
  // a curve where a highlight and a contour are hard to tell apart. One full
  // body per treatment, on the wall, is the check that whatever wins the crop
  // has not quietly deleted a shoulder or flattened the whole figure.
  const POSE_W = 54, POSE_H = 78;
  for (const [name, note, rim] of TREATMENTS) {
    tile(grid, `full figure — ${name}`, note, POSE_W * IDS.length, POSE_H, (ctx, t) => {
      ctx.fillStyle = WALL_BASE;
      ctx.fillRect(0, 0, POSE_W * IDS.length, POSE_H);
      setRim(rim);
      try {
        IDS.forEach((id, i) => {
          drawToon(ctx, id, pose('run', t), POSE_W * i + POSE_W / 2, POSE_H - 3, 60);
        });
      } finally {
        setRim();
      }
    }, { animated: true, wide: true });
  }
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

// Nav pills get a tile count so you can tell a 6-tile section from a 90-tile
// one before clicking in, and the pill for whichever section is scrolled to
// the top of the viewport lights up — scanning by eye across ~15 sections is
// exactly what the nav exists to save you from.
for (const a of nav.querySelectorAll('a[data-target]')) {
  const sec = document.getElementById(a.dataset.target);
  const badge = document.createElement('span');
  badge.className = 'nav-count';
  badge.textContent = sec ? sec.querySelectorAll('.card').length : 0;
  a.appendChild(badge);
}
const navSpy = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    for (const a of nav.querySelectorAll('a[data-target]')) {
      a.classList.toggle('active', a.dataset.target === en.target.id);
    }
  }
}, { rootMargin: '-96px 0px -70% 0px' });
for (const s of root.querySelectorAll('section')) navSpy.observe(s);

// Each h2 collapses its own section — useful now that the gallery runs to
// several hundred tiles and a session is usually spent in one or two of them.
for (const h2 of root.querySelectorAll('section > h2')) {
  h2.addEventListener('click', () => h2.closest('section').classList.toggle('collapsed'));
}
const collapseAllEl = document.getElementById('collapseAll');
collapseAllEl.addEventListener('click', () => {
  const sections = [...root.querySelectorAll('section')];
  const collapsing = !sections.every((s) => s.classList.contains('collapsed'));
  for (const s of sections) s.classList.toggle('collapsed', collapsing);
  collapseAllEl.textContent = collapsing ? 'expand all' : 'collapse all';
});

document.querySelector('h1 small').textContent =
  `dev build · click any tile to save a PNG · ${tiles.length} tiles across ${root.querySelectorAll('section').length} sections`;

// ---------------------------------------------------------------- controls
function applyZoom() {
  for (const t of tiles) {
    t.canvas.style.width = (t.fixed ? t.w : t.w * zoom) + 'px';
    t.canvas.style.height = (t.fixed ? t.h : t.h * zoom) + 'px';
  }
}
const zoomEl = document.getElementById('zoom');
zoomEl.addEventListener('change', () => { zoom = +zoomEl.value; applyZoom(); });

const resolutionEl = document.getElementById('resolution');
resolutionEl.addEventListener('change', () => {
  renderScale = +resolutionEl.value;
  resizeTiles();
});

// Backgrounds are full scenes; 3x would be 1440px wide. Cap them at 1x.
function applyBackdrop(mode) {
  document.body.classList.remove('bg-checker', 'bg-dark', 'bg-light', 'bg-none');
  document.body.classList.add('bg-' + mode);
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
  // Filtering forces collapsed sections open (via the .filtering CSS hook) so
  // a match hiding inside a collapsed section is never invisible.
  document.body.classList.toggle('filtering', !!q);
  for (const t of tiles) t.card.style.display = !q || t.card.dataset.search.includes(q) ? '' : 'none';
});

applyZoom();
applyBackdrop(bdEl.value);
// Scene tiles stay at 1x regardless of the zoom control.
for (const t of tiles) {
  if (t.w === W && t.h === H) {
    t.canvas.style.width = W + 'px';
    t.canvas.style.height = H + 'px';
    t.fixed = true;
  }
}
