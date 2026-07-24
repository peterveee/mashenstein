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
import { PROP_PAINTERS, drawProp, propFrames, propFps, propTall, glowSprite, sparkSprite } from '../src/sprites/props.js';
import { WORLD_SPRITES } from '../src/sprites/world.js';
import {
  cabinetPalette, cabinetStyle, drawCabinetShell, drawCabinetScreen, drawScreenSweep,
  drawDoor, DOOR_PALETTES, OVERTIME_PALETTE, CABINET_STYLES, CABINET_STYLE,
} from '../src/sprites/arcade.js';
import { WALL_DRESSINGS, drawWallBay, shadeWall, wallLitAt, BAY_W, WALL_H, WALL_BASE } from '../src/sprites/backwall.js';
import {
  TOON_SPECS, drawToon, drawToonFace, toonEffectEllipse, setInk, setRim,
  ACTIVE_CELEBRATION_STYLE, ACTIVE_LOCOMOTION_STYLE,
  TITLE_PARADE_ACTIONS, titleParadeAction, transitionCameoAction,
  b33pTitleShotPose,
  LORENZO_FACES, setLorenzoFace, LORENZO_PANTS, setLorenzoPants,
} from '../src/sprites/toons.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { CABINETS } from '../src/data/cabinets.js';
import { UNLOCKS } from '../src/data/stages.js';
import { POWER_DEFS } from '../src/game/powerups.js';
import { drawPlugRow, PLUG_ICONS, PLUG_NAMES, PLUG_ROW_W } from '../src/game/plugs.js';
import { drawFloatie, drawSpeech, drawActBanner, drawFailBanner } from '../src/game/hud.js';
import { STAGES } from '../src/data/stages.js';

const GROUND_Y = 232; // mirrors stylePacks/index.js + run.js

buildAllSprites();

// ---------------------------------------------------------------- framework
const root = document.getElementById('root');
const nav = document.getElementById('nav');
const tiles = []; // {el, canvas, ctx, draw, animated, visible}
let zoom = 3;
let renderScale = 3;
let animate = true;
const SMOOTH_PREVIEW_PROPS = new Set(['appliance', 'cord', 'crate', 'qcrate', 'barrel', 'dustdevil', 'coin']);
const smoothPreviewScale = (name) => name === 'dustdevil' || name === 'coin' ? 10 : 6;

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
function tile(grid, name, sub, w, h, draw, { animated = false, wide = false, hires = true, smooth = false } = {}) {
  const card = document.createElement('div');
  card.className = 'card' + (wide ? ' wide' : '');
  card.dataset.search = (name + ' ' + (sub || '')).toLowerCase();
  const canvas = document.createElement('canvas');
  if (smooth) canvas.classList.add('smooth-preview');
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
  if (type === 'stomp') return local <= 0.3 ? { menuAction: 'smash', actionTime: local } : {};
  if (type === 'dash') return { lean: 0.26 };
  if (type === 'roll') return { kind: 'duck', roll: true };
  if (type === 'compress') return { kind: 'duck' };
  if (type === 'fist') return { headless: true };
  if (type === 'axe') return { axeThrown: true };
  if (type === 'shoot') return local <= 0.3 ? { menuAction: 'aim', actionTime: local } : {};
  if (type === 'eat') return { menuAction: 'chomp', time: local };
  return {};
}
// One power-up tile: the ability pose plus its flourish, feet at `feetY`.
// `poseScale` maps drawPowerPose's in-run 24px offsets onto a taller gallery toon.
function drawPowerupTile(ctx, id, hero, t, cx, feetY, hh) {
  const type = hero.ability.type;
  const budget = type === 'eat' ? 0.5 : 0.3; // matches useAbility()'s powerPoseT
  const local = t % POWERPOSE_PERIOD;
  if (id === 'chompo' && local <= 0.42) {
    // The run removes collision immediately but keeps the eaten sprite for this
    // visual handoff. Reproduce that staging here so the ability reference does
    // not show a character merely chomping at empty air.
    const q = Math.max(0, Math.min(1, local / 0.42));
    const e = q * q * (3 - 2 * q);
    const fromX = cx + 0.78 * hh, fromY = feetY - 0.38 * hh;
    const mouthX = cx + 0.37 * hh, mouthY = feetY - 0.44 * hh;
    const x = fromX + (mouthX - fromX) * e;
    const y = fromY + (mouthY - fromY) * e - Math.sin(q * Math.PI) * 0.13 * hh;
    const s = Math.max(0.18, 1 - e * 0.82);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(e * 0.8); ctx.scale(s, s);
    drawProp(ctx, 'crate', -0.25 * hh, -0.23 * hh, 0.5 * hh, 0.46 * hh);
    ctx.restore();
  }
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
  }, {
    animated: true,
    // Selected small vector props render at twice their display density, then
    // the browser downsamples them smoothly. Other world sprites retain the
    // gallery's deliberately pixelated inspection mode.
    hires: SMOOTH_PREVIEW_PROPS.has(e.type) ? smoothPreviewScale(e.type) : true,
    smooth: SMOOTH_PREVIEW_PROPS.has(e.type),
  });
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
    `${ids.length} heroes across the five shared poses plus each playable hero's special, drawn by drawToon() at 3x the in-game ${HERO_DRAW_W}x${HERO_DRAW_H} box. `
    + 'Celebrate is the results-screen victory routine: each hero\'s signature bounce, then their big move. '
    + 'Power up is what a real run actually shows the instant their ability fires — poseFromPlayer\'s '
    + 'ability-specific pose fields (lean/roll/duck/headless/menuAction) plus drawPowerPose()\'s overlay '
    + 'flourish where one exists. World-space projectiles are not duplicated here, but Grumpos does lose '
    + 'the axe from his back while it is in flight and Lorenzo shows the grounded wrench-smash body action.');
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
    // Gary and Dolores are cast-roll flavour, not roster members — neither has
    // a gameplay ability to show.
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
  // roster entry, so there is no ability to fire. Axe is a thrown prop out in
  // the world; Lorenzo's grounded smash drives his arm and hand-held wrench.
  // Those tiles exercise the same action pose production now supplies. That is the honest
  // comparison, and lined up together it is the fastest way to see which
  // specials do not read as specials.
  {
    const roster = ids.filter((hid) => HERO_BY_ID[hid]);
    const grid = subhead(LABELS.powerup,
      `${roster.length} of ${ids.length} heroes — the ability pose plus drawPowerPose()'s flourish, `
      + 'pulsing on the same countdown a real run gives it.');
    const th = HH * 1.3;
    for (const hid of roster) {
      const hero = HERO_BY_ID[hid];
      const tw = hid === 'chompo' ? HH * 1.55 : HH * 0.9;
      tile(grid, hid, `${hero.ability.label} · ${hero.ability.type}`, tw, th, (ctx, t) => {
        drawPowerupTile(ctx, hid, hero, t, hid === 'chompo' ? HH * 0.48 : tw / 2, th - HH * 0.05, HH);
      }, { animated: true });
    }
  }
}

// ----------------------------------------- 2b. complete character animation map
// The primary rows above own the shared locomotion, duck transitions,
// celebrations and one ability per playable hero. This section records the
// production-only branches that used to be invisible in the gallery: both
// menu systems, multi-state abilities, and title-screen reactions.
{
  const ids = Object.keys(TITLE_PARADE_ACTIONS);
  const HH = 60, TW = 58, TH = 92, FEET = 86;
  const grid = section('character-animation-map', 'Hero animations — complete production map',
    'Completes the shared Idle / Run / Jump / Duck / Celebrate and Special rows above. '
    + 'TITLE BEAT calls the exact title-parade choreography helper used by the game; TRANSITION calls '
    + 'the exact shutter-cameo helper. The final tiles cover ability substates and shared title reactions '
    + 'that are not visible in a single standard pose. No gallery-only choreography is used here.');

  for (const id of ids) {
    tile(grid, id, `TITLE BEAT · ${TITLE_PARADE_ACTIONS[id]}`, TW, TH, (ctx, t) => {
      const p = (t % 1.35) / 1.35;
      const action = titleParadeAction(id, t, p);
      const titlePose = pose('run', t, { menu: true, ...action.pose });
      drawToon(ctx, id, titlePose, TW / 2, FEET - action.feetLift * HH, HH);
    }, { animated: true });
  }

  for (const id of ids) {
    tile(grid, id, 'TRANSITION CAMEO', TW, TH, (ctx, t) => {
      const cameoPose = pose('idle', t, { menu: true, ...transitionCameoAction(id) });
      drawToon(ctx, id, cameoPose, TW / 2, FEET, HH);
    }, { animated: true });
  }

  const variants = [
    ['lorenzo', 'AIR STOMP · airborne ability branch', (t) => pose('jump', t, {
      grounded: false, stomp: true, vy: 420,
    })],
    ['mochi', 'FLOAT · held-jump branch', (t) => pose('jump', t, {
      grounded: false, float: true, vy: -45,
    })],
    ['grumpos', 'AXE AWAY · projectile in flight', (t) => pose('run', t, {
      axeThrown: true,
    })],
    ['b33p', 'TITLE TAP · cannon recoil', (t) => pose('run', t, {
      menu: true, ...b33pTitleShotPose(t % 0.7),
    })],
  ];
  for (const [id, label, makePose] of variants) {
    tile(grid, id, label, TW, TH, (ctx, t) => {
      drawToon(ctx, id, makePose(t), TW / 2, FEET, HH);
    }, { animated: true });
  }

  tile(grid, 'shared title entry', 'RUNNING LEAP · all heroes', TW, TH, (ctx, t) => {
    const p = (t % 2.1) / 2.1;
    const y = Math.sin((1 - p) * Math.PI / 2) * 0.83 * HH;
    drawToon(ctx, 'lorenzo', pose('run', t, {
      menu: true, grounded: false, vy: -260 + p * 260,
    }), TW / 2, FEET - y, HH);
  }, { animated: true });

  tile(grid, 'shared title tap', 'STARTLED HOP · all except B-33P', TW, TH, (ctx, t) => {
    const p = (t % 0.8) / 0.8;
    const active = p < 0.5 ? p * 2 : 0;
    drawToon(ctx, 'lorenzo', pose(active ? 'jump' : 'run', t, {
      menu: true, grounded: !active,
    }), TW / 2, FEET - Math.sin(active * Math.PI) * 0.42 * HH, HH);
  }, { animated: true });

  tile(grid, 'shared title hit', 'KNOCKED-OUT TUMBLE · all heroes', 92, TH, (ctx, t) => {
    const q = (t % 1.9) / 1.9;
    ctx.save();
    ctx.translate(46 + q * 16, FEET - (q * 0.75 - 0.5 * q * q) * HH);
    ctx.rotate(q * 7);
    const s = 1 + q * 0.8;
    drawToon(ctx, 'lorenzo', pose('jump', t, { menu: true, grounded: false }), 0, 0, HH * s);
    ctx.restore();
  }, { animated: true, wide: true });
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

// Stable shield envelopes at the exact gameplay size. Unlike the generic
// in-run row above, these tiles leave enough room for the fitted glass around
// ears, axes and cannon poses; the label exposes the normalized geometry so an
// accidental fallback or implausible fit is visible before opening a PNG.
{
  const grid = section('hero-shields', 'Heroes — fitted shield envelopes',
    'One stable per-hero ellipse, measured from ordinary gameplay poses and drawn through '
    + 'the real drawHeroSprite() path. It does not resize with the live footfall.');
  const HERO_CX = 70, TW = 54, TH = 54, FLOOR = 47;
  for (const id of Object.keys(HERO_BY_ID)) {
    const player = {
      hero: {}, anim: 0, vy: 0, grounded: true, ducking: false, rolling: false,
      compressT: 0, landedT: 0, dashT: 0, floating: false, stomping: false,
      headless: 0, fistThrown: false, y: 0, invuln: 0, powers: {},
      deflectFlashT: 0, powerPoseT: 0,
    };
    const fit = toonEffectEllipse(id);
    tile(grid, id, `rx ${fit.rx.toFixed(2)} · ry ${fit.ry.toFixed(2)}`, TW, TH, (ctx, t) => {
      ctx.translate(TW / 2 - HERO_CX, 0);
      player.anim = t * 1.6;
      drawHeroSprite(ctx, player, id, t, 0, false,
        { flat: true, groundY: FLOOR, shield: 1, settings: {} });
    }, { animated: true, hires: 4 });
  }
}

// Reuse gameplay dimensions for the magnified source side of prop comparisons.
// A painter may be shared by more than one definition; the first matching
// obstacle/pickup is the same convention the original gallery used.
function propNominalSize(name) {
  const def = Object.values(OBSTACLES).find((d) => d.sprite === name)
    || Object.values(PICKUPS).find((d) => d.sprite === name);
  return def ? { w: def.w, h: def.h } : { w: 16, h: 16 };
}

// ------------------------------------------------------- 3. prop scale comparison
{
  const names = Object.keys(PROP_PAINTERS);
  const grid = section('props', 'Props — gameplay vs large',
    'LEFT magnifies the exact gameplay-sized raster. RIGHT rerenders the vector painter at the same large display size. '
    + 'Compare them directly to judge which outlines should stay thick when small but stop growing when large.');
  const TILE_W = 128;
  const TILE_H = 72;
  const PAD = 4;
  const GAP = 4;
  const LABEL_H = 8;
  const COL_W = (TILE_W - PAD * 2 - GAP) / 2;
  const ART_H = TILE_H - LABEL_H - PAD;
  for (const n of names) {
    const { w, h } = propNominalSize(n);
    const fh = Math.round(h * propTall(n));
    const frames = propFrames(n);
    tile(grid, n, `${w}x${fh} source · left gameplay / right rerender${frames > 1 ? ` · ${frames}f` : ''}`,
      TILE_W, TILE_H, (ctx, t) => {
        const f = frames > 1 ? Math.floor(t * propFps(n)) % frames : 0;
        const scale = Math.min(COL_W / w, ART_H / fh);
        const dw = w * scale;
        const dh = fh * scale;

        ctx.fillStyle = 'rgba(34,38,52,0.58)';
        ctx.font = '4px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME', PAD + COL_W / 2, LABEL_H / 2);
        ctx.fillText('LARGE', PAD + COL_W + GAP + COL_W / 2, LABEL_H / 2);
        ctx.fillStyle = 'rgba(34,38,52,0.12)';
        ctx.fillRect(TILE_W / 2 - 0.25, LABEL_H, 0.5, ART_H);

        const leftX = PAD + (COL_W - dw) / 2;
        const artY = LABEL_H + (ART_H - dh) / 2;
        ctx.save();
        ctx.translate(leftX, artY);
        ctx.scale(scale, scale);
        drawProp(ctx, n, 0, 0, w, fh, f);
        ctx.restore();

        const rightX = PAD + COL_W + GAP + (COL_W - dw) / 2;
        drawProp(ctx, n, rightX, artY, dw, dh, f);
      }, { animated: frames > 1, hires: 3, smooth: true });
  }
}

// ------------------------------------------------------- 3a. food court furniture
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
    const frames = propFrames(type);
    entityTile(grid, type, `${def.w}x${def.h}${frames > 1 ? ` · ${frames}f` : ''}${def.power ? ' · ' + def.power : ''}`, e, style);
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

// ---------------------------------------------------------------- 9. floaties
// One floatie per KIND, drawn by hud.js's real drawFloatie. Colour is the only
// signal these carry, so the section is a contrast check first and a catalogue
// second: one card per ink, plus the two shape variants (a centred impact word,
// and the opaque hazard card). Rendering all sixty-odd strings proved nothing
// the representative one does not — they differ in wording, not in legibility.
//
// The ratios in the labels are measured against the card as it actually
// composites over the LIGHTEST pack (the doodle sheet, #eceadf), which is the
// worst case: the panel is translucent, so it lands near rgb(108,112,126)
// there and every ink is at its weakest. Anything at or above ~3.0 holds.
{
  const grid = section('floaties', 'Floaties — one of each kind',
    'Real drawFloatie() from hud.js, on the real card. Ratios are WCAG contrast against the '
    + 'card over the lightest pack — the worst case. Use the backdrop control to swing them '
    + 'between light and dark.');

  // The game's own geometry: PLAYER_X through the resting zoom is the column
  // every card hangs off, and FLOAT_BASE_Y is where the stack starts.
  const HERO_X = 92;          // PLAYER_X * resting zoom, as run.js computes it
  const CARD_Y = 128;         // FLOAT_BASE_Y
  const TILE_W = 300, TILE_H = 34;

  function floatieTile(label, text, color, solid = false) {
    tile(grid, text, label, TILE_W, TILE_H, (ctx) => {
      // Shift the world so the card's own screen position lands in the tile.
      ctx.translate(-(HERO_X - 8), -(CARD_Y - 8));
      drawFloatie(ctx, { text, color, y: CARD_Y, solid }, { heroX: HERO_X });
    }, { wide: true });
  }

  for (const [label, text, color] of [
    ['gold — a beat landed · 3.4', 'WRENCH SMASH', '#f6d33c'],
    ['teal — mission progress · 3.0', 'CORD PIECE 3/5', '#48e0c8'],
    ['green — banked · 3.0', 'CHECKPOINT. +2 CELLS. SINCERELY.', '#8ddd8d'],
    ['pale blue — defensive · 3.6', 'SHIELD BROKE. IT DID ITS JOB.', '#a8e6ff'],
    ['bone — unpeelable · 4.1', 'UNPEELABLE.', '#e8e8f0'],
    ['pink — Miss Chompo · 3.0', 'DEE-LIGHTFUL. THANK YOU.', '#f7bacc'],
    ['pink — B-33P · 3.0', 'DEFINITELY NOT NORMAL PHYSICS', '#ffb7c3'],
    ['tan — Lorenzo · 3.0', 'THE AXE LODGED IN THE SCENERY. INTENDED.', '#ecc3a1'],
    ['sage — resident · 3.0', 'A RESIDENT FOLLOWS YOU. CONFUSED BUT GAME.', '#b2d3b2'],
  ]) floatieTile(label, text, color);

  // Shape variants, not new inks. The impact word is the only card that centres
  // on the hero instead of ragging off their column, and the hazard card is the
  // only one that is opaque — red cannot be lightened without ceasing to mean
  // danger, so it keeps its ink and the card carries the contrast instead.
  floatieTile('gold — impact word, centred · 3.4', 'PEW', '#f6d33c');
  floatieTile('RED — hazard, opaque card · 4.5', 'THE FUSE SURVIVED. BARELY. IT SAW EVERYTHING.', '#e04848', true);
}

// ------------------------------------------------------- 10. banners & speech
// The full-screen text the game puts OVER a run, one tile per ink. Same idea as
// the floaties section above and the same reason for existing: these are the
// strings that have to stay readable against whatever the stage happens to look
// like at that moment, and the only way to check that is to put them there.
//
// So each tile paints a real style pack underneath rather than sitting on the
// gallery backdrop. An act card judged over flat black is a card you have not
// judged: the dim is part of the design, and what it is dimming is the point.
{
  const grid = section('banners', 'Banners & speech — one of each ink',
    'drawActBanner(), drawFailBanner() and drawSpeech() from hud.js, each over a real pack. '
    + 'The light speech pair sits on the concourse wall instead, which is the only place '
    + 'that variant is used.');

  // The brightest, busiest thing any of these has to survive.
  const cab = CABINETS[0];
  const pack = getStylePack(cab.style, {});
  const props = [makeObstacle('crate', 180), makeObstacle('barrel', 300)];
  const runBg = (ctx, t) => {
    if (pack.bg) pack.bg(ctx, t, t * 60, cab, 1000);
    if (pack.ground) pack.ground(ctx, t * 60, cab, props);
    if (pack.post) pack.post(ctx, t);
  };
  // The food court wall: #241c30, the surface the light plate was built for.
  const hubBg = (ctx) => { ctx.fillStyle = '#241c30'; ctx.fillRect(0, 0, W, H); };

  const banner = (name, sub, bg, paint, animated = false) =>
    tile(grid, name, sub, W, H, (ctx, t) => { bg(ctx, t); paint(ctx, t); }, { animated });

  const actIntro = (STAGES.find((st) => st.intro && st.intro.startsWith('ACT ')) || {}).intro
    || 'ACT I. THE ARCADE GOES DARK.';

  banner('ACT card', 'white core, #c83030 + #48e0c8 ghosts, #c8c8d8 tail',
    runBg, (ctx, t) => drawActBanner(ctx, actIntro, { t }), true);
  banner('fail banner', '#e04848 on the opaque hazard card',
    runBg, (ctx) => drawFailBanner(ctx, 'UNPLUGGED FOR SCHEDULED MAINTENANCE'));
  banner('speech — ally', '#d0f0e8, portrait',
    runBg, (ctx) => drawSpeech(ctx, { text: 'RUN THROUGH THE PORTAL TO TAG IN THE NEXT HERO.', who: 'lorenzo' }));
  banner('speech — Eggshell', '#f0a0a0, portrait',
    runBg, (ctx) => drawSpeech(ctx, { text: 'THAT ONE DID NOT COUNT. I AM DISPUTING ALL OF IT.', who: 'eggshell' }));
  banner('speech — the game itself', '#d0f0e8, no portrait (tutorials, station notes)',
    runBg, (ctx) => drawSpeech(ctx, { text: 'EVERY HERO HAS A POWER. PRESS RIGHT/D.', who: null }));
  banner('speech — ally, light plate', '#332b45 on #ece9f6 — the hub variant',
    hubBg, (ctx) => drawSpeech(ctx, { text: 'THE FOOD COURT IS TECHNICALLY STILL OPEN.', who: 'lorenzo' }, { light: true }));
  banner('speech — Eggshell, light plate', '#8e1f36 on #ece9f6 — the hub variant',
    hubBg, (ctx) => drawSpeech(ctx, { text: 'I OWN THIS CONCOURSE. ALLEGEDLY.', who: 'eggshell' }, { light: true }));
}

// ==================================================================
// LAB & BAKE-OFFS — dev-only comparisons kept below the production
// reference sections above. These render real code paths but decide or
// audit a still-open art question rather than document a shipped asset.
// ==================================================================
navSeparator('lab / bake-offs');

// ------------------------------------------- special-move follower proposal
// A universal companion gauge is more truthful than a weapon/projectile: every
// hero owns a special move, while its result ranges from a stomp to a float.
// The circle stays close to the runner's trailing shoulder and the fill alone
// reports cooldown progress, so the same language works on keyboard and touch.
function followerChargeColor(fill, ready) {
  if (ready) return '#e874d6';
  if (fill >= 0.85) return '#b979df';
  if (fill >= 0.5) return '#72cb62';
  if (fill >= 0.18) return '#48d5c3';
  return '#4ca6c7';
}

const FOLLOWER_CROWN = {
  lorenzo: 0.99, gnash: 1.08, fernwick: 1.05, b33p: 0.93,
  mochi: 0.84, chompo: 0.86, raymn: 0.9, grumpos: 1.18,
};

function drawSpecialMoveFollower(ctx, cx, cy, fill, t, { ready = false, fire = 0 } = {}) {
  const r = 5.5;
  const launch = Math.max(0, Math.min(1, fire));
  const bob = launch ? 0 : Math.sin(t * 4.5) * 1.25;
  const x = cx + launch * 38;
  const y = cy + bob - Math.sin(launch * Math.PI) * 5;
  const energy = followerChargeColor(fill, ready);
  const rim = ready ? energy : '#596273';

  ctx.save();
  if (launch) {
    ctx.globalAlpha = 1 - launch * 0.35;
    ctx.strokeStyle = energy;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 2);
    ctx.lineTo(x - 4, y + 1);
    ctx.stroke();
  }

  if (ready && !launch) {
    const pulse = 1 + 0.13 * (0.5 + 0.5 * Math.sin(t * 5.5));
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = energy;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, (r + 4) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The muted shell makes an empty cooldown readable against bright scenery.
  ctx.fillStyle = '#111722';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Clip the energy, then raise it from the floor exactly as the recharge does.
  if (fill > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.clip();
    const level = y + r - (r * 2 * Math.max(0, Math.min(1, fill)));
    ctx.fillStyle = energy;
    ctx.fillRect(x - r, level, r * 2, r * 2);
    if (fill < 1) {
      ctx.fillStyle = '#d7fff6';
      ctx.fillRect(x - r, level, r * 2, 1);
    }
    ctx.restore();
  }

  ctx.strokeStyle = rim;
  ctx.lineWidth = ready ? 2.2 : 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

{
  const grid = section('special-move-follower', 'Special move follower — circle fill proposal',
    'GALLERY ONLY — a universal in-world cooldown companion for every hero. The first five cards show its state changes; '
    + 'the remaining cards compare the ready follower beside every playable hero at the same in-run scale. '
    + 'It follows the trailing shoulder, fills from the bottom, flashes once at full charge, and darts forward when used.');
  const TW = 126, TH = 98, HERO_X = 78, FEET = 89, HERO_H = 60;
  const states = [
    ['empty', 'COOLDOWN JUST STARTED', 0, {}],
    ['charging 1/3', 'CHARGING · 33%', 1 / 3, {}],
    ['charging 2/3', 'CHARGING · 67%', 2 / 3, {}],
    ['ready', 'SPECIAL READY', 1, { ready: true }],
    ['activation', 'SPECIAL USED', 1, { fire: 0.45 }],
  ];
  for (const [name, sub, fill, opts] of states) {
    tile(grid, name, sub, TW, TH, (ctx, t) => {
      ctx.fillStyle = '#202838';
      ctx.fillRect(0, 0, TW, TH);
      ctx.fillStyle = '#303b4d';
      ctx.fillRect(0, FEET + 1, TW, 2);
      ctx.fillStyle = '#17202d';
      ctx.fillRect(0, FEET + 3, TW, TH - FEET - 3);
      drawToon(ctx, 'lorenzo', pose('run', t), HERO_X, FEET, HERO_H);
      drawSpecialMoveFollower(ctx, HERO_X - 43, FEET - HERO_H * FOLLOWER_CROWN.lorenzo, fill, t, opts);
    }, { animated: true, hires: 4, smooth: true });
  }
  for (const heroId of Object.keys(HERO_BY_ID)) {
    tile(grid, heroId, 'SPECIAL READY · RUN SCALE', TW, TH, (ctx, t) => {
      ctx.fillStyle = '#202838';
      ctx.fillRect(0, 0, TW, TH);
      ctx.fillStyle = '#303b4d';
      ctx.fillRect(0, FEET + 1, TW, 2);
      ctx.fillStyle = '#17202d';
      ctx.fillRect(0, FEET + 3, TW, TH - FEET - 3);
      drawToon(ctx, heroId, pose('run', t), HERO_X, FEET, HERO_H);
      drawSpecialMoveFollower(ctx, HERO_X - 43, FEET - HERO_H * FOLLOWER_CROWN[heroId], 1, t, { ready: true });
    }, { animated: true, hires: 4, smooth: true });
  }
}

// ------------------------------------------------ body-proportion candidates
// Gallery-only reconstruction of the earlier silhouette proposal. Humanoids
// adjust torso/waist/limb dimensions while retaining the exact same heads,
// faces, clothing, poses and animation. For figures whose body is also their
// head (Mochi and Chompo), and Ray's disconnected floating rig, the complete
// figure is scaled about the planted feet. Every temporary spec edit is
// restored synchronously after its one draw.
{
  const CANDIDATES = {
    lorenzo: {
      label: 'compact handyman · broader chest · shorter stance',
      spec: { torsoWidth: 1.06, waistScale: 0.94, legLength: 0.94 },
    },
    gnash: {
      label: 'sprinter · narrow core · longer, lighter limbs',
      spec: { torsoWidth: 0.9, legLength: 1.1, legWidth: 0.9, armWidth: 0.9 },
    },
    fernwick: {
      label: 'rangy adventurer · narrower waist · longer stride',
      spec: { torsoWidth: 0.93, waistScale: 0.9, legLength: 1.08 },
    },
    b33p: {
      label: 'armoured machine · boxier hull · heavier short legs',
      spec: { torsoWidth: 1.1, waistScale: 1.02, legLength: 0.92, legWidth: 1.1 },
    },
    mochi: {
      label: 'rounder mascot · slightly wider, lower silhouette',
      spec: { figureScaleX: 1.07, figureScaleY: 0.96 },
    },
    chompo: {
      label: 'stronger chomper disc · wider, more grounded silhouette',
      spec: { figureScaleX: 1.08, figureScaleY: 0.95 },
    },
    gary: {
      label: 'lanky zombie · narrow torso · longer loose limbs',
      spec: { torsoWidth: 0.92, legLength: 1.1, armLength: 1.08 },
    },
    dolores: {
      label: 'grounded cafeteria shape · fuller waist · shorter stance',
      spec: { torsoWidth: 1.04, taper: 1.08, legLength: 0.92 },
    },
    raymn: {
      label: 'lanky floating hero · narrower, taller assembly',
      spec: { figureScaleX: 0.91, figureScaleY: 1.07 },
    },
    grumpos: {
      label: 'stronger V · broader shoulders · tighter waist and arms',
      spec: { torsoWidth: 1.07, waistScale: 0.9, armWidth: 1.05 },
    },
  };

  const withSpec = (id, patch, draw) => {
    const spec = TOON_SPECS[id];
    const previous = {};
    for (const key of Object.keys(patch)) {
      previous[key] = { owned: Object.hasOwn(spec, key), value: spec[key] };
      spec[key] = patch[key];
    }
    try { draw(); } finally {
      for (const [key, old] of Object.entries(previous)) {
        if (old.owned) spec[key] = old.value;
        else delete spec[key];
      }
    }
  };

  const grid = section('body-shapes', 'Hero body shapes — current / proposed',
    'GALLERY ONLY — no production proportions have changed. Each card compares the exact current '
    + 'rig with the earlier differentiation direction in both idle and the same synchronized run '
    + 'phase. Humanoid heads and facial features are identical on both sides; only the body '
    + 'dimensions named under the card move.');
  const HH = 60, WIDE = 216, FEET = 82;
  for (const id of Object.keys(TOON_SPECS)) {
    const candidate = CANDIDATES[id];
    tile(grid, `${id} — body before / after`, candidate.label, WIDE, 94, (ctx, t) => {
      const samples = [
        [27, 'idle', null, 'CURRENT'],
        [79, 'idle', candidate.spec, 'PROPOSED'],
        [137, 'run', null, 'CURRENT'],
        [189, 'run', candidate.spec, 'PROPOSED'],
      ];
      for (const [x, kind, patch, label] of samples) {
        const draw = () => drawToon(ctx, id, pose(kind, t), x, FEET, HH);
        if (patch) withSpec(id, patch, draw); else draw();
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '6px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${kind.toUpperCase()} ${label}`, x, 92);
      }
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#8a8a9e';
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(108, 7); ctx.lineTo(108, 93); ctx.stroke();
      ctx.restore();
    }, { animated: true, wide: true, hires: 4 });
  }
}

// ---------------------------------------------------- jump / duck comparison
{
  const grid = section('jump-duck-motion', 'Jump and duck — legacy / improved',
    'The improved jump responds continuously to vertical velocity: launch stretch, an apex tuck, '
    + 'then a wider landing preparation. The improved duck settles weight through bent knees or '
    + 'character-specific feet and braces the hands/appendages around the lower silhouette. '
    + 'Standing proportions are unchanged. Both columns use the same clock and jump velocity.');
  const HH = 60, FEET = 84, CW = 66;
  for (const id of Object.keys(TOON_SPECS)) {
    tile(grid, `${id} — jump / duck before / after`, 'jump legacy · jump improved · duck legacy · duck improved',
      CW * 4, 98, (ctx, t) => {
        const vy = Math.sin(t * 2.1) * 460;
        const duckCycle = t % 2;
        const duckAmount = duckCycle < 0.14 ? duckCycle / 0.14
          : duckCycle < 0.9 ? 1
            : duckCycle < 1 ? 1 - (duckCycle - 0.9) / 0.1 : 0;
        const duckDirection = duckCycle < 0.14 ? 1 : duckCycle < 0.9 ? 0 : -1;
        const samples = [
          ['jump', 'legacy', 'JUMP L'],
          ['jump', ACTIVE_LOCOMOTION_STYLE, 'JUMP I'],
          ['duck', 'legacy', 'DUCK L'],
          ['duck', ACTIVE_LOCOMOTION_STYLE, 'DUCK I'],
        ];
        for (let i = 0; i < samples.length; i++) {
          const [kind, motionStyle, label] = samples[i];
          const x = i * CW + CW / 2;
          drawToon(ctx, id, pose(kind, t, {
            motionStyle,
            vy: kind === 'jump' ? vy : 0,
            grounded: kind !== 'jump',
            duckAmount: kind === 'duck' && motionStyle !== 'legacy' ? duckAmount : 1,
            duckDirection: kind === 'duck' && motionStyle !== 'legacy' ? duckDirection : 0,
          }), x, FEET, HH);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '7px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, 96);
        }
      }, { animated: true, wide: true, hires: 4 });
  }
}

// ------------------------------------------------------- head yaw candidates
// This is deliberately a pose field that production never supplies. Body turn
// already has its own sheet below; this one asks the narrower question: does a
// directional face improve the run without changing the character silhouette?
{
  const ids = Object.keys(TOON_SPECS);
  const YAWS = [0, 12, 20, 28];
  const grid = section('head-yaw', 'Head yaw — unresolved before / candidates',
    'GALLERY ONLY — production remains at 0°. Columns are current 0°, subtle 12°, medium 20°, '
    + 'strong 28°. Every row shares one live run phase; the second tile reproduces the normal '
    + 'run camera: a 24-world-unit rig drawn through the 2× camera, approximately 48 logical '
    + 'screen pixels before device-density scaling.');

  for (const id of ids) {
    const largeW = 4 * 66, largeH = 78;
    tile(grid, `${id} — inspection`, '0° current · 12° · 20° · 28°', largeW, largeH, (ctx, t) => {
      for (let i = 0; i < YAWS.length; i++) {
        const x = i * 66 + 33;
        drawToon(ctx, id, pose('run', t, { headTurn: YAWS[i] }), x, 68, 60);
        ctx.fillStyle = '#8a8a9e'; ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${YAWS[i]}°`, x, 77);
      }
    }, { animated: true, wide: true, hires: 4 });

    const runW = 4 * 60, runH = 64;
    tile(grid, `${id} — normal run size`, '24-unit rig × 2× camera = ~48px · 0° / 12° / 20° / 28°', runW, runH, (ctx, t) => {
      for (let i = 0; i < YAWS.length; i++) {
        // Match applyWorld() rather than passing h=48: stroke floors are chosen
        // from the real 24-unit rig first, then the camera magnifies the result.
        ctx.save();
        ctx.translate(i * 60 + 30, 60);
        ctx.scale(2, 2);
        drawToon(ctx, id, pose('run', t, { headTurn: YAWS[i] }), 0, 0, HERO_DRAW_H);
        ctx.restore();
      }
    }, { animated: true, wide: true, hires: 6 });
  }
}

// ------------------------------------------ raised-arm celebration candidates
// The whole cast's retired routines remain here beside the shipped rework.
{
  const grid = section('celebrate-arms', 'Celebration poses — legacy / shipped',
    'The shipped column is now the production results-screen treatment. It contains clearer raised '
    + 'arms for Lorenzo and Gary; character-specific turns, '
    + 'presentation, salute, bites, glove work and clapping for the rest of the cast; synchronized '
    + 'hop details for Mochi; and Grumpos\'s three-beat flex study. '
    + 'The small row uses the results screen\'s real 18u minimum and 32u maximum hero heights.');
  const IDS = [
    ['lorenzo', 'wider fists · outward elbows'],
    ['gnash', 'sky point · real step-turn · no flat spin'],
    ['fernwick', 'champion clasp · shield presentation'],
    ['b33p', 'planted cannon salute · compact sweep'],
    ['mochi', 'body · ears · face synchronized to two hops'],
    ['chompo', 'snack lunge · hard snap · satisfied bounce'],
    ['gary', 'steady shoulder · compact wave'],
    ['raymn', 'floating-glove high-five · raised-fist finish'],
    ['dolores', 'restrained clap · formal bow'],
    ['grumpos', 'overhead · horizontal biceps · front flex'],
  ];
  const proposed = (t) => pose('celebrate', t, { menu: true, celebrateStyle: ACTIVE_CELEBRATION_STYLE });
  const current = (t) => pose('celebrate', t, { menu: true, celebrateStyle: 'legacy' });

  for (const [id, note] of IDS) {
    // Live, large A/B: both halves receive the exact same time so differences
    // come from the arm study, not from comparing two different dance frames.
    tile(grid, `${id} — animated before / after`, `legacy · shipped — ${note}`,
      150, 100, (ctx, t) => {
        drawToon(ctx, id, current(t), 39, 88, 60);
        drawToon(ctx, id, proposed(t), 111, 88, 60);
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '8px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEGACY', 39, 98);
        ctx.fillText('SHIPPED', 111, 98);
      }, { animated: true, wide: true, hires: 4 });

    // Six synchronized samples expose the path itself. A live loop can hide a
    // one-frame elbow reversal; the strip cannot.
    const FRAME_W = 52, PAD = 8, stripW = PAD * 2 + FRAME_W * 6;
    tile(grid, `${id} — motion path`, 'legacy above · shipped below · six cycle samples',
      stripW, 190, (ctx) => {
        for (let i = 0; i < 6; i++) {
          const t = i * 2.6 / 6;
          const proposedT = i * (id === 'grumpos' ? 3.4 : 2.6) / 6;
          const x = PAD + FRAME_W * i + FRAME_W / 2;
          drawToon(ctx, id, current(t), x, 84, 52);
          drawToon(ctx, id, proposed(proposedT), x, 174, 52);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '7px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(i + 1), x, 91);
          ctx.fillText(String(i + 1), x, 181);
        }
        ctx.save();
        ctx.translate(4, 48); ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#8a8a9e'; ctx.font = '7px ui-monospace, monospace'; ctx.textAlign = 'center';
        ctx.fillText('CURRENT', 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(4, 138); ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#8a8a9e'; ctx.font = '7px ui-monospace, monospace'; ctx.textAlign = 'center';
        ctx.fillText('PROPOSED', 0, 0);
        ctx.restore();
      }, { wide: true, hires: 4 });

    // These pass h=18 and h=32 to drawToon rather than shrinking a 60u render,
    // preserving the same stroke floors and simplification decisions used by
    // the real results screen.
    tile(grid, `${id} — results-screen sizes`, '18u min and 32u max · legacy / shipped',
      164, 68, (ctx, t) => {
        const samples = [
          [22, 18, current(t), '18 L'], [52, 18, proposed(t), '18 S'],
          [96, 32, current(t), '32 L'], [140, 32, proposed(t), '32 S'],
        ];
        for (const [x, h, p, label] of samples) {
          drawToon(ctx, id, p, x, 61, h);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '6px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, 67);
        }
      }, { animated: true, wide: true, hires: 6 });
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
        if (scr) drawScreenSweep(ctx, scr, t, litPal.seed);
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

// ------------------------------------------------------ 2d. lorenzo cap: was/is
// Settled 2026-07-23. The complaint: his cap hem was a flat chord at -0.12R
// while his eyes top out at -0.38R, so the hat crossed 42% of the way down the
// eye — and the focus brows, at -0.45R..-0.29R, were drawn entirely inside it,
// showing only because the face paints after the hat. Eight candidates went
// through this section to get here; what is left is the before and the after,
// both rendered through the real drawHead path via setLorenzoFace, so this
// cannot drift from what the game draws. See LORENZO_FACES in toons.js.
{
  const grid = section('lorenzo-face', 'Lorenzo — cap & face (was / is)',
    'What changed, and why each piece had to. The band is flat across the brows and drops to the '
    + 'ears only at the temples, so it clears the brow line without turning him into forehead. The '
    + 'sides slope inward off the band, so the cap follows the skull rather than resting on it like '
    + 'a dome on a sphere. The hat rocks back 12 deg about the HEAD CENTER — the one pivot that '
    + 'leaves every point of it equidistant from the skull, so the raised side cannot lift away — '
    + 'while the oval bill holds level against that rotation. Ink brow hairlines became brown '
    + 'caterpillars in the mustache colour, and they move with the mood instead of holding a scowl '
    + 'through a grin. A tufted fringe shows under the band, deepest at the temples and shallowest '
    + 'at the nose, because that is where the brows are. And the face mask sits 0.067R lower, which '
    + 'is what opens the forehead the fringe hangs into. Head proportions are otherwise unchanged: '
    + 'an earlier pass moved the face twice as far AND raised the crown AND tapered the sides, and '
    + 'the skull came out egg-shaped — the crown and the taper were the culprits.');

  const HH = 60;
  // Same crop machinery as the ink bake-off: each row keeps its OWN u and
  // scales the context, so the stroke floors bind where the game binds them.
  // Two columns now, so they can be big: this is a before/after, and the whole
  // point is that the difference survives being looked at closely.
  const CELL = 110, LABEL_W = 58;
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
  // Four rows that between them expose every failure the old geometry had: the
  // idle face draws NO brows at all (they are keyed to focus), the running face
  // is the one that put brows on the hat, the 24u row is what a real run draws,
  // and the celebrate beat at t=0.5 is the squeezed-shut ^ ^ where a brow that
  // does not move with the mood reads as two expressions on one face.
  const ROWS = [
    ['idle 60u', HH, () => pose('idle', 0.7)],
    ['run 60u', HH, () => pose('run', 0.42)],
    ['run 24u', HERO_DRAW_H, () => pose('run', 0.42)],
    ['celebrate', HH, () => pose('celebrate', 0.5, { menu: true })],
  ];
  const cmpW = LABEL_W + LORENZO_FACES.length * CELL;
  const cmpH = 14 + ROWS.length * CELL;
  tile(grid, 'lorenzo — head to head', 'six variants, frozen, 6x supersampled', cmpW, cmpH, (ctx) => {
    ctx.font = 'bold 7px ui-monospace, monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8a8a9a';
    // Clip each header to its own cell: at ten columns the long labels ran into
    // their neighbours, and a bake-off you cannot read the axis of is a mural.
    LORENZO_FACES.forEach((v, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(LABEL_W + i * CELL, 0, CELL - 2, 12);
      ctx.clip();
      ctx.fillText(v.label, LABEL_W + i * CELL + 3, 9);
      ctx.restore();
    });
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
    'SETTLED — `current` is the clipped rim, `was` is the centred one it replaced. The rim used '
    + 'to be a stroke centred on the contour, which put a warm band OUTSIDE the silhouette and '
    + 'left the dark ink inside it: measured across grumpos\'s skull at 24u on the wall, +68 out '
    + 'against -67 in, which reads as an embossed edge rather than an outlined one. Every hero '
    + 'but chompo carried one. Clipping the rim to its own shape confines it to the fill; see '
    + 'RIM in toons.js. Rows run twice, on the gallery black and on the hub\'s own WALL_BASE, '
    + 'because the whole question is what the ink has to darken — the outer half of a contour '
    + 'moves the wall four levels out of 255, so it was never doing the work the centred rim '
    + 'assumed it was. `wide` is the clip taken too far (it eats the inner dark line as well); '
    + '`full` is the old failure that deleted the leading shoulder. Note INK.alpha does NOT '
    + 'reach the rim, so the ink bake-off\'s `soft` column still shifts this balance toward the '
    + 'light half as a side effect. Judge the 24u rows.');

  // Every column spells out `inside`. setRim() defaults each field it is not
  // given to the SHIPPED value — which is what makes the bare setRim() in the
  // finally below a restore — so a centred column that omitted it would quietly
  // inherit the clip and render as a duplicate of `current`.
  const TREATMENTS = [
    ['current', 'shipped — clipped to the shape, surviving band 0.3', { w: 0.3, a: 1, inside: true }],
    ['was', 'pre-2026-07-22 — centred at 0.6, halo +68 outside vs -67 in', { w: 0.6, a: 1, inside: false }],
    ['wide', 'clipped but double the band — eats the inner dark line too', { w: 0.6, a: 1, inside: true }],
    ['full', 'centred at 1.0 · rim covers the contour outright on the lit side', { w: 1, a: 1, inside: false }],
    ['half', 'centred, no geometry change · rim alpha 0.34→0.17', { w: 0.6, a: 0.5, inside: false }],
    ['none', 'rim off entirely — contour and form ramps only', { w: 0, a: 0, inside: false }],
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

// Brow weight. Carved off the ink bake-off because the thin-face pass moved the
// eye ring and the brows on one dial, and only the ring was the defect — the
// brow is the mark the expression hangs on. The axis that matters here is SIZE,
// not backdrop: BROW_W * u only clears BROW_MIN above u=38, so the HUD cell and
// the in-run sprite draw the same absolute brow no matter what the multiplier
// does to the 60u menus. A column that only looks right at 60 has not answered
// the question.
{
  const grid = section('brow-bakeoff', 'Eyebrow weight bake-off',
    'One dial — `INK.brow` — on the eyebrow hairline alone, leaving the eye rings and mouths at '
    + 'their shipped thin-face weights. `current` is 0.01u, `was` the 0.018u the pass cut it '
    + 'from. Read the SIZE columns against each other, not just down: the brow is '
    + '`max(BROW_MIN, BROW_W * u)`, and BROW_MIN (0.38) binds below u=38 — so at 60u the '
    + 'multiplier moves a proportional width, while at 34u and 24u it is scaling the FLOOR, and '
    + 'those two sites draw an identical brow despite being different sizes. That is why the '
    + 'thinning reads much harder in the menus and the cast parade than it does in a run. '
    + 'grumpos is `gruff`, gnash and raymn are `cocky`, the rest draw brows off `focus` while '
    + 'running; fernwick (`bright`) and b33p (robot LEDs) draw none and are not shown.');

  // Width is settled at 0.018u, so this axis is now DARKNESS. `thin dark` is the
  // pre-restore brow — thin geometry at full ink — kept as the anchor the whole
  // thread started from, and `wide dark` is the restore before BROW_A, which is
  // what made the scowl read as a bar. The rest walk the alpha down at the
  // shipped width. NOTE the width multiplier scales the FLOOR too, which the
  // shipped code does not — see BROW_W in toons.js.
  // [label, note, widthMul, opacity, lighten]. The two `a-only` columns are the
  // failed attempt kept as anchors: opacity alone had to go translucent to soften
  // the tone, so the war paint and the shaded skull show through and the mark
  // goes muddy. The shipped column lightens the ink and stays near-opaque.
  const TREATMENTS = [
    ['current', 'shipped — lighten 0.30 at opacity 0.92', 1, 0.92, 0.3],
    ['full ink', 'no lighten, fully opaque — the bar', 1, 1, 0],
    ['a-only .72', 'opacity 0.72, no lighten — the first try, too dark', 1, 0.72, 0],
    ['a-only .58', 'opacity 0.58, no lighten — too light AND translucent', 1, 0.58, 0],
    ['lighter', 'lighten 0.42 at opacity 0.92 — a notch further', 1, 0.92, 0.42],
  ];

  // Every hero here must actually DRAW the ink hairline. lorenzo and mochi were
  // in this list and rendered dead cells for it: lorenzo's cap variant hands his
  // brows to bushyBrows via faceEx.brow, and mochi is a `pika` rig that never
  // reaches this stroke — as do chompo (`disc`), fernwick (mood 'bright', which
  // opts out) and b33p (LED eyes, a different dialect entirely). That leaves the
  // five below, of which gary is the one that matters most: his p.e is #d83030,
  // the only non-black brow ink in the cast, and the only one where lightening
  // costs hue as well as tone. See BROW_L_SCALE.
  const IDS = ['grumpos', 'gary', 'gnash', 'raymn'];

  // A frozen brow comparison has to dodge two separate suppressors at once, and
  // this section has now been caught by both. `relaxed` unclenches grumpos for
  // 2.2s of every 8.3 mid-run and drops his brows (the ink bake-off's 0.42 lands
  // inside it); and every hero blinks on their own seeded clock, which closes
  // the eyes and takes the brows with them. Swept at 0.25s across 2..7, the
  // holes are 2.75 (gnash), 3 (gary) and 5 (raymn) — 4 is the phase furthest
  // from all of them, with a clean quarter-second either side.
  //
  // Note gary's HUD row is brow-less no matter what this is set to, and that is
  // the rig, not the section: drawToonFace poses neutral, so `focus` is off, and
  // brows then need mood 'cocky' or 'gruff'. gary is 'soft'. Only the scowlers
  // and the cocky ones carry brows into a HUD cell.
  const BROW_T = 4;

  // The three sites, at their REAL units — 60u menus, the HUD face crop, and the
  // in-run sprite. Scaling one to stand in for another would relax the floor and
  // show a brow the game never draws, which is the whole point of the section.
  const CELL = 66, LABEL_W = 74;
  const SITES = [
    ['60u menu', (ctx, id, x, y) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip();
      ctx.translate(x + CELL / 2, y + CELL / 2);
      ctx.scale(CELL / (0.62 * 60), CELL / (0.62 * 60));
      drawToon(ctx, id, pose('run', BROW_T), 0, (TOON_SPECS[id].heavy ? 0.978 : 0.76) * 60, 60);
      ctx.restore();
    }],
    ['34u HUD face', (ctx, id, x, y) => {
      // drawToonFace's own path at the size the HUD asks for, then magnified as
      // a whole — the ink lands at 34 and is blown up, exactly as a player sees
      // it on a high-density screen.
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip();
      ctx.translate(x, y);
      ctx.scale(CELL / 34, CELL / 34);
      drawToonFace(ctx, id, 0, 0, 34, 34);
      ctx.restore();
    }],
    ['24u in-run', (ctx, id, x, y) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip();
      ctx.translate(x + CELL / 2, y + CELL / 2);
      ctx.scale(CELL / (0.62 * HERO_DRAW_H), CELL / (0.62 * HERO_DRAW_H));
      drawToon(ctx, id, pose('run', BROW_T), 0, (TOON_SPECS[id].heavy ? 0.978 : 0.76) * HERO_DRAW_H, HERO_DRAW_H);
      ctx.restore();
    }],
  ];

  for (const id of IDS) {
    const cmpW = LABEL_W + TREATMENTS.length * CELL;
    const cmpH = 14 + SITES.length * CELL;
    tile(grid, `${id} — brow weight`, 'five weights x three real sites, frozen', cmpW, cmpH, (ctx) => {
      ctx.font = 'bold 7px ui-monospace, monospace';
      ctx.fillStyle = '#8a8a9a';
      ctx.textBaseline = 'alphabetic';
      TREATMENTS.forEach(([name], i) => ctx.fillText(name, LABEL_W + i * CELL + 4, 9));
      SITES.forEach(([siteLabel, paintCell], r) => {
        const y = 14 + r * CELL;
        ctx.fillStyle = '#8a8a9a';
        ctx.fillText(siteLabel, 4, y + CELL / 2);
        TREATMENTS.forEach(([, , brow, browA, browL], i) => {
          setInk({ brow, browA, browL });
          try {
            paintCell(ctx, id, LABEL_W + i * CELL, y);
          } finally {
            setInk();
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
      for (let r = 0; r <= SITES.length; r++) {
        ctx.moveTo(LABEL_W, 14 + r * CELL);
        ctx.lineTo(cmpW, 14 + r * CELL);
      }
      ctx.stroke();
    }, { wide: true, hires: 6 });
  }
}

// --------------------------------------------------- 2e. lorenzo trouser colour
// `p.p` is one garment — legs, trouser front and braces all read from it — so
// each candidate is drawn as the whole lower body, not as a swatch. Judged on
// THREE backdrops on purpose: a colour picked against the gallery's black can
// behave completely differently on the wall he actually stands in front of.
// Charcoal is the case in point, and the top row is where you can see it.
{
  const grid = section('lorenzo-pants', 'Lorenzo — trouser colour bake-off',
    'Blue is shipped, and is also the most recognisable borrowed note left in the design: cap plus '
    + 'mustache plus blue trousers is a silhouette everyone already knows. Each row is one candidate '
    + 'on the hub wall (#241c30), a stage sky, and the gallery black, at the 60u gallery size and '
    + 'again at the real in-run 24u. Judge the 24u panels and the hub-wall column — a trouser colour '
    + 'that only works on a bright stage is not a trouser colour. See LORENZO_PANTS in toons.js; '
    + 'setLorenzoPants drives the real draw path, so nothing here is a mock-up.');

  const BACKS = [['hub wall', WALL_BASE], ['stage sky', '#8ed0f0'], ['gallery black', '#12121a']];
  const HH = 74, PANEL = 96, PAD = 6;
  const TW = BACKS.length * PANEL;
  const TH = 116;
  for (const cand of LORENZO_PANTS) {
    tile(grid, cand.label, `${cand.hex} — ${cand.note}`, TW, TH, (ctx, t) => {
      setLorenzoPants(cand.hex);
      try {
        BACKS.forEach(([, bg], i) => {
          const x = i * PANEL;
          ctx.fillStyle = bg;
          ctx.fillRect(x, 0, PANEL - 2, TH);
          // 60u on the left of the panel, the honest 24u on the right at 2x —
          // scaling the CONTEXT, not the unit, so the stroke floors bind where
          // the game binds them.
          drawToon(ctx, 'lorenzo', pose('run', t), x + PANEL * 0.3, TH - PAD, HH);
          ctx.save();
          ctx.translate(x + PANEL * 0.62, TH - PAD - 30);
          ctx.scale(2, 2);
          drawToon(ctx, 'lorenzo', pose('run', t), 12, 15, HERO_DRAW_H);
          ctx.restore();
        });
      } finally {
        setLorenzoPants();   // never leak a candidate into the next tile
      }
    }, { animated: true, wide: true });
  }
}

// ------------------------------------------- Dolores girth bake-off (lab only)
{
  const grid = section('dolores-girth', 'Dolores — fatter / rounder body bake-off',
    'GALLERY ONLY — production proportions are unchanged; the slimmer shipped rig stayed. '
    + 'Two degrees of a wider, rounder torso against it, in idle and the same synchronized run '
    + 'phase. Only torso dimensions move: head, apron cut, straps and limbs are the identical '
    + 'rig, so what you are judging is silhouette girth rather than a redraw. The apron '
    + 'measures off the torso, so it widens with her instead of sitting on top like a board.');
  // waistScale > 1 UN-tapers the waist, so she reads as a barrel rather than a
  // wider triangle. That roundness is the point, not simply extra width.
  const CANDIDATES = [
    { key: 'rounder', label: 'rounder — torso +16%, waist +14% (un-tapered)',
      spec: { torsoWidth: 1.16, waistScale: 1.14 } },
    { key: 'fattest', label: 'fattest — torso +30%, waist +26%, legs −6%',
      spec: { torsoWidth: 1.3, waistScale: 1.26, legLength: 0.94 } },
  ];
  const withSpec = (id, patch, draw) => {
    const spec = TOON_SPECS[id];
    const previous = {};
    for (const key of Object.keys(patch)) {
      previous[key] = { owned: Object.hasOwn(spec, key), value: spec[key] };
      spec[key] = patch[key];
    }
    try { draw(); } finally {
      for (const [key, old] of Object.entries(previous)) {
        if (old.owned) spec[key] = old.value;
        else delete spec[key];
      }
    }
  };
  const HH = 60, WIDE = 216, FEET = 82;
  for (const cand of CANDIDATES) {
    tile(grid, `dolores — shipped / ${cand.key}`, cand.label, WIDE, 94, (ctx, t) => {
      const samples = [
        [27, 'idle', null, 'SHIPPED'],
        [79, 'idle', cand.spec, 'CANDIDATE'],
        [137, 'run', null, 'SHIPPED'],
        [189, 'run', cand.spec, 'CANDIDATE'],
      ];
      for (const [x, kind, patch, label] of samples) {
        const draw = () => drawToon(ctx, 'dolores', pose(kind, t), x, FEET, HH);
        if (patch) withSpec('dolores', patch, draw); else draw();
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '6px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${kind.toUpperCase()} ${label}`, x, 92);
      }
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#8a8a9e';
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(108, 7); ctx.lineTo(108, 93); ctx.stroke();
      ctx.restore();
    }, { animated: true, wide: true, hires: 4 });
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
