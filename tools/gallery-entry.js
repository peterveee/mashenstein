// Dev asset gallery: renders every drawable in the game into its own canvas by
// calling the REAL draw functions, so the page can never drift from the source.
// Built by tools/build-gallery.js into a standalone dist/gallery.html.
//
// Everything here is display-only. Nothing in src/ is modified or stubbed —
// the one accommodation is that entity tiles crop the game's fixed 480x270
// world space (entities always draw relative to GROUND_Y) down to a tile by
// translating the context, rather than by changing how entities draw.
import { W, H } from '../src/engine/renderer.js';
import { ZOOM, VIEW_W, ZOOM_MIN, applyWorld } from '../src/engine/camera.js';
// The game's cameras, read from the modules that own them so the zoom-levels
// section can never quote a number the game has stopped using.
import { ZOOM_NORMAL, ZOOM_CLOSE, ZOOM_PHONE } from '../src/game/run.js';
import { HUB_ZOOM, OVERTIME_POSTER_PALETTE, posterLook } from '../src/game/hub/index.js';
import { INTRO_ZOOM_START, OUTRO_ZOOM } from '../src/game/tutorial.js';
import { getSprite } from '../src/engine/sprites.js';
import {
  buildAllSprites, drawWorldEntity, drawHeroSprite, drawPowerPose, drawPortal,
  HERO_DRAW_W, HERO_DRAW_H,
} from '../src/game/draw.js';
import { OBSTACLES, PICKUPS, makeObstacle, makePickup } from '../src/game/entities.js';
import { HERO_BY_ID } from '../src/data/heroes.js';
import {
  PROP_PAINTERS, drawProp, propFrames, propFps, propTall, glowSprite, sparkSprite, PORTAL_SPRITE,
  PORTAL_SPENT_SPRITE, PORTAL_WILT_SPRITE, PORTAL_SPEND_TIME, PORTAL_WILT_TIME,
} from '../src/sprites/props.js';
import { WORLD_SPRITES } from '../src/sprites/world.js';
import {
  cabinetPalette, cabinetStyle, drawCabinetShell, drawCabinetScreen, drawScreenSweep,
  drawDoor, DOOR_PALETTES, OVERTIME_PALETTE, CABINET_STYLES, CABINET_STYLE,
} from '../src/sprites/arcade.js';
import {
  WALL_BASE, drawPoster, POSTER_W, POSTER_H, CABINET_STAR,
} from '../src/sprites/backwall.js';
import {
  TOON_SPECS, drawToon, drawToonFace, toonEffectEllipse, setInk, setRim,
  setContour, setInkScale, setInkDensity,
  ACTIVE_CELEBRATION_STYLE,
  TITLE_PARADE_ACTIONS, titleParadeAction, transitionCameoAction,
  b33pTitleShotPose,
} from '../src/sprites/toons.js';
import { getStylePack } from '../src/engine/stylePacks/index.js';
import { CABINETS } from '../src/data/cabinets.js';
import { UNLOCKS } from '../src/data/stages.js';
import { POWER_DEFS } from '../src/game/powerups.js';
import {
  drawPlugRow, PLUG_ICONS, PLUG_NAMES, PLUG_ROW_W, PLUG_FRAME_COLORS,
} from '../src/game/plugs.js';
import { drawFloatie, drawSpeech, drawActBanner, drawFailBanner } from '../src/game/hud.js';
import { STAGES } from '../src/data/stages.js';
import { HANDOFF_VARIANTS } from '../src/game/credits-handoff.js';
import { BOOST_FX_VARIANTS } from '../src/game/boostFx.js';
import {
  FINISH_MARKER_BY_ID, plungerStandY, PLUNGER_CX,
} from '../src/game/finishMarker.js';
import { PLAYER_X } from '../src/game/player.js';
// Roads are built by the SAME function the run builds them with, off the SAME
// cabinet data, and drawn through the SAME painters. Anything less and this
// page becomes a second implementation of the art it is supposed to be the
// reference for — which is the one thing a gallery may never be.
import { buildRoutes, routeRise } from '../src/game/routes.js';
import {
  drawRoutes, drawSubsoil, drawTerrain, tunnelOverhangs, terrainGroundY, soilOf, ISLAND_THICKNESS,
} from '../src/game/terrain.js';
// Cast candidates — proposals with no entry in any production registry. See the
// raider bake-off at the bottom of this file, and src/dev/hero-candidates.js.
import { RAIDER_CANDIDATES } from '../src/dev/hero-candidates.js';

const GROUND_Y = 232; // mirrors stylePacks/index.js + run.js

buildAllSprites();

// ---------------------------------------------------------------- framework
const root = document.getElementById('root');
const nav = document.getElementById('nav');
const tiles = []; // {el, canvas, ctx, draw, animated, visible}
// SCREEN SCALE: screen px per logical frame px. The game is never presented at
// 1:1 — renderer.js fits the 480x270 frame to the viewport at
// min(winW/480, winH/270), which on any desktop is between about 3.1 (maximised
// browser, 14" laptop) and 5 (maximised on a 1440p panel). Every rung below 6 is
// a device somebody actually plays on; there is deliberately none that is not.
//
// The default is 3x, the 14" laptop maximised — the smallest DESKTOP
// presentation and the one most of this work is actually looked at on. The
// phone rung (1.4x) is still there and still the tightest real presentation:
// in landscape the 16:9 frame letterboxes into the phone's short side, so the
// scale is 393/270 = 1.46 on a 15 Pro and 375/270 = 1.39 on an SE — 1.4, the
// same figure hud.js sizes its touch targets against. It was the default for a
// while on the argument that judging at the tightest size is the opposite of
// 1x/2x flattery, and that argument still holds for a FINAL check — but it made
// every first look at the page a squint, and a page nobody can read at a glance
// does not get read. Every rung here is still a device somebody plays on and
// there is deliberately none that is not, so the honesty is in the LIST rather
// than in which one opens.
// Keep in step with the shell's options.
let zoom = 3;
let renderScale = 3;
let animate = true;
const SMOOTH_PREVIEW_PROPS = new Set(['appliance', 'cord', 'crate', 'qcrate', 'barrel', 'dustdevil', 'coin']);
// Halved from 6/10 because world-scale tiles now bake WORLD_Z in: samples per
// world unit are WORLD_Z * hires, so 3 and 5 land where 6 and 10 used to.
const smoothPreviewScale = (name) => name === 'dustdevil' || name === 'coin' ? 5 : 3;

// The camera magnification every world sprite is drawn through in the run —
// applyWorld(ctx, ZOOM, pan). A tile that draws world units 1:1 is showing art
// at half the density the game gives it, and any zoom-relative stroke floor
// binds in the wrong place. World-scale tiles scale the CONTEXT by this, which
// is what the run does, rather than resizing the art.
const WORLD_Z = ZOOM;

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
// `hires` is true (follow the global resolution control), false (1:1 with the
// source, for tiles whose content IS a raster and has nothing denser to give),
// or a NUMBER pinning this tile to its own scale regardless of the control. A
// tile pinned above the screen scale renders denser than it displays, which
// supersamples it: the browser downsamples the backing store on the way to the
// screen, so sub-pixel stroke differences survive as tone instead of snapping to
// whole pixels. That is the only honest way to eyeball a 1.2px-vs-0.7px line.
// `pixel` opts a tile back into nearest-neighbour display. Reserve it for real
// pre-rendered rasters (WORLD_SPRITES); vector art is smooth by default now
// that the game itself presents its frame with imageRendering 'auto'.
//
// `world` says this tile's logical box is measured in WORLD units rather than
// frame pixels — a lane scene that draws the hero at his in-run 24u without
// scaling the context by the camera. The run magnifies those units by ZOOM
// before the frame is ever presented, so the tile has to as well or it shows the
// scene at half size. Tiles that scale the context by WORLD_Z themselves are
// already in frame pixels and must NOT set this.
function tile(grid, name, sub, w, h, draw,
  { animated = false, wide = false, hires = true, pixel = false, world = false } = {}) {
  const card = document.createElement('div');
  card.className = 'card' + (wide ? ' wide' : '');
  card.dataset.search = (name + ' ' + (sub || '')).toLowerCase();
  const canvas = document.createElement('canvas');
  if (pixel) canvas.classList.add('pixel-preview');
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
  const entry = {
    card, canvas, ctx, draw, animated, visible: true,
    w: logicalW, h: logicalH, name, hires, world, renderScale: rs,
  };
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
  // The tile is supersampled, not enlarged: say so, or the toon painter reads
  // the transform as a camera push-in and relaxes its ink floors, and every
  // hero in the gallery comes back thinner than the game draws them.
  setInkDensity(entry.renderScale);
  try {
    entry.draw(ctx, t);
  } catch (err) {
    entry.stack = err.stack;
    entry.card.classList.add('err');
    entry.card.querySelector('.name').innerHTML = `<b>${entry.name}</b><br>${err.message}`;
    entry.draw = () => {}; // don't spam the same throw every frame
  } finally {
    setInkDensity();
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
// What a held duck IS per hero, mirroring poseFromPlayer's own gate: playable
// humanoid and ray rigs ship the POWER SLIDE, the other rigs keep their
// crouch — and so do Gary and Dolores, who are cast-roll flavour with no run
// to duck in. Every production duck tile draws through this so the gallery
// cannot drift from the game.
function duckExtra(id) {
  const rig = TOON_SPECS[id]?.rig;
  return HERO_BY_ID[id] && (rig === 'humanoid' || rig === 'ray')
    ? { duckStyle: 'slide' } : {};
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
// edge lands at pad. Nothing about the entity's own drawing changes — the tile
// is sized in FRAME px (world units through WORLD_Z) and the context carries
// the zoom, which is the same arrangement the run uses.
function entityTile(grid, label, sub, e, style, pad = 12) {
  const w = (e.w + pad * 2) * WORLD_Z;
  const h = (e.h + pad * 2) * WORLD_Z;
  tile(grid, label, sub, w, h, (ctx, t) => {
    // Scale first, then work in world units — the order applyWorld() uses, so
    // anything zoom-relative inside the entity painters binds where it binds
    // in the run. Every number below this line is a world unit, as before.
    ctx.scale(WORLD_Z, WORLD_Z);
    ctx.translate(0, -(GROUND_Y - e.alt - e.h - pad));
    drawWorldEntity(ctx, e, e.x - pad, t, style, {});
  }, {
    animated: true,
    // Selected small vector props render denser still, for silhouette work.
    hires: SMOOTH_PREVIEW_PROPS.has(e.type) ? smoothPreviewScale(e.type) : true,
  });
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
    + 'the axe from his back while it is in flight and Lorenzo shows the grounded wrench-smash body action. '
    + 'Duck is the shipped POWER SLIDE on the humanoid rigs, per-hero garments and all; B-33P, Mochi, '
    + 'Chompo and Ray M\'n keep their crouch, exactly as poseFromPlayer serves it.');
  const HH = 60; // draw tall: these are vector toons, not pixel grids
  for (const id of ids) {
    for (const kind of ['idle', 'run', 'jump', 'duck', 'celebrate']) {
      // The victory routine hops/spins up to ~0.26*HH above standing, so its
      // tile is taller; the feet baseline keeps the same bottom padding. The
      // standing tile clears 1.3*HH so the tallest hero's gear (grumpos's axe
      // rides ~1.25 above his feet) isn't cropped at the tile's top edge.
      const th = kind === 'celebrate' ? HH * 1.62 : HH * 1.3;
      tile(grid, id, kind, HH * 0.9, th, (ctx, t) => {
        drawToon(ctx, id, pose(kind, t, kind === 'celebrate' ? { menu: true } : kind === 'duck' ? duckExtra(id) : {}), (HH * 0.9) / 2, th - HH * 0.05, HH);
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
    if (kind === 'duck') {
      // The whole cast's duck in ONE row on one clock — the humanoid slides
      // and the other rigs' crouches shoulder to shoulder, exactly the split
      // poseFromPlayer serves. The per-hero tiles below stay for close study;
      // this row is where an outlier jumps out.
      const COL = 74, FEET = 48;
      tile(grid, 'all duck — in a row', 'one clock, whole cast · humanoids slide, the other rigs keep their crouch',
        COL * ids.length, 62, (ctx, t) => {
          ids.forEach((hid, i) => {
            drawToon(ctx, hid, pose('duck', t, duckExtra(hid)), COL * (i + 0.5), FEET, HH);
            ctx.fillStyle = '#8a8a9e';
            ctx.font = '7px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(hid, COL * (i + 0.5), 58);
          });
        }, { animated: true, wide: true, hires: 4 });
    }
    for (const hid of ids) {
      tile(grid, hid, kind, HH * 0.9, th, (ctx, t) => {
        drawToon(ctx, hid, pose(kind, t, kind === 'celebrate' ? { menu: true } : kind === 'duck' ? duckExtra(hid) : {}), (HH * 0.9) / 2, th - HH * 0.05, HH);
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

// ------------------------------------------------------------- zoom levels
// Every magnification the game actually puts a hero through, one hero, one
// pose, one tile each — the answer to "how big is Lorenzo, really?", asked once
// per device and once per scene instead of being averaged into a single
// gallery-wide guess.
//
// The numbers are imported, never retyped: ZOOM_NORMAL/CLOSE/PHONE come out of
// run.js's applyFraming, HUB_ZOOM out of the food court, and the two tutorial
// cameras out of tutorial.js. Change one at the source and this section moves
// with it.
//
// Each tile is a real crop of the 480x270 frame — the SAME crop every time, and
// the same world x for the hero — so the only thing separating the tiles is the
// camera. camYFor pins world GROUND_Y to frame y 232 at every zoom, which is why
// the groundline sits on one line straight across the row and the figures grow
// upward off it. The crop starts high enough to hold the 5.5x intro's crown.
{
  const CAMERAS = [
    ['food court', HUB_ZOOM, 'hub/index.js HUB_ZOOM — the concourse, not a run'],
    ['desktop / laptop', ZOOM_NORMAL, 'run.js ZOOM_NORMAL — the default framing on a desktop'],
    ['desktop ZOOM IN · iPad', ZOOM_CLOSE, 'run.js ZOOM_CLOSE — the OPTIONS toggle, and what every tablet gets'],
    ['phone', ZOOM_PHONE, 'run.js ZOOM_PHONE — iPhone and Android handsets'],
    ['tutorial — outro', OUTRO_ZOOM, 'tutorial.js OUTRO_ZOOM — the push-in on the hand-off'],
    ['tutorial — intro', INTRO_ZOOM_START, 'tutorial.js INTRO_ZOOM_START — tight on Gary, the biggest camera in the game'],
  ];
  // The crop: full frame width, and vertically from just above the intro's
  // crown down through the ground apron. 5.5 * 24 = 132px of hero, so a top of
  // 84 leaves 16px of air above the tallest one.
  const CROP_TOP = 84;
  const CROP_H = H - CROP_TOP;

  const grid = section('zoom-levels', 'Zoom levels — one hero, every camera',
    'Lorenzo at each magnification the game uses, drawn by the same drawToon() at the same in-run 24u, '
    + `standing on the same mark (PLAYER_X = ${PLAYER_X} world px right of camX). Each tile is the full `
    + `480px frame width cropped to its bottom ${CROP_H}px, presented at the screen scale — so these are `
    + 'the sizes on a real display, not a diagram of them. '
    + '<b>Read two things.</b> Vertically, how big the hero is: that is the whole argument for why a phone '
    + 'pulls IN rather than out — a handheld shows a smaller picture in your vision than a monitor does, '
    + 'so it can least afford a wide frame. Horizontally, how far right his column slides and how much '
    + 'runway is left in front of him: that is the bill. The label states the world width each camera '
    + 'shows, which is what decides when an enemy may fire and where the finish tape is planted. '
    + `Two cameras are not tiles here because they land on numbers already shown: the dolly's floor `
    + `(camera.js ZOOM_MIN = ${ZOOM_MIN}, what framingFor() falls to under a cape jump) is the food court's `
    + 'framing, and the tutorial\'s own run body just uses whatever resting zoom the device gets.');

  for (const [label, z, note] of CAMERAS) {
    const viewW = W / z;
    tile(grid, `${label} — ${z}x`,
      `${note}<br>hero ${(HERO_DRAW_H * z).toFixed(0)}px tall · column x ${(PLAYER_X * z).toFixed(0)} · `
      + `shows ${viewW.toFixed(0)} world px of lane`,
      W, CROP_H, (ctx, t) => {
        // The lane, in frame space: the groundline is pinned to 232 at every
        // zoom, so it lands identically in every tile.
        ctx.fillStyle = '#202838';
        ctx.fillRect(0, 0, W, CROP_H);
        ctx.fillStyle = '#303b4d';
        ctx.fillRect(0, GROUND_Y - CROP_TOP, W, 2);
        ctx.fillStyle = '#17202d';
        ctx.fillRect(0, GROUND_Y - CROP_TOP + 2, W, CROP_H - (GROUND_Y - CROP_TOP) - 2);
        // A tick every 24 world px, so the horizontal squeeze is countable
        // rather than a feeling — the ticks bunch up as the camera pushes in.
        ctx.fillStyle = 'rgba(246,211,60,0.16)';
        for (let wx = 0; wx * z < W; wx += 24) ctx.fillRect(Math.round(wx * z), 0, 1, CROP_H);

        ctx.save();
        ctx.translate(0, -CROP_TOP);
        applyWorld(ctx, z, 0);
        drawToon(ctx, 'lorenzo', pose('run', t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
        ctx.restore();
      }, { animated: true });
  }
}

{
  const grid = section('hero-run', 'Heroes — in-run render',
    'drawHeroSprite() with opts.flat — the gameplay path, shadow included. '
    + 'Without flat it routes through pushOverlayDraw and paints nothing here. '
    + `Drawn through the run's ${WORLD_Z}x world zoom, so a hero here is the same `
    + 'number of frame pixels tall as one on screen.');
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
    tile(grid, id, 'drawHeroSprite', tw * WORLD_Z, th * WORLD_Z, (ctx, t) => {
      ctx.scale(WORLD_Z, WORLD_Z);
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
    tile(grid, id, `rx ${fit.rx.toFixed(2)} · ry ${fit.ry.toFixed(2)}`, TW * WORLD_Z, TH * WORLD_Z, (ctx, t) => {
      ctx.scale(WORLD_Z, WORLD_Z);
      ctx.translate(TW / 2 - HERO_CX, 0);
      player.anim = t * 1.6;
      drawHeroSprite(ctx, player, id, t, 0, false,
        { flat: true, groundY: FLOOR, shield: 1, settings: {} });
    }, { animated: true, hires: 3 });
  }
}

// Reuse gameplay dimensions for the magnified source side of prop comparisons.
// A painter may be shared by more than one definition; the first matching
// obstacle/pickup is the same convention the original gallery used.
// Bake-off candidates are not wired to an entity yet, so there is no def to
// measure them by and the 16x16 fallback would show a floor pad as a square.
// These are the boxes their own sections propose: the ramps inherit boostPad's
// 14x4 (their height comes from PROP_TALL), the flags are authored square so
// they can double as plug-row icons, and the portals match the 12x40 column
// drawPortal already passes.
const BAKEOFF_SIZES = {
  rampChevron: { w: 14, h: 4 }, rampWedge: { w: 14, h: 4 },
  rampTurbine: { w: 14, h: 4 }, rampGate: { w: 14, h: 4 },
  flagWave: { w: 16, h: 16 }, flagPennant: { w: 16, h: 16 },
  flagBeacon: { w: 16, h: 16 }, flagPlug: { w: 16, h: 16 },
  portalArch: { w: 14, h: 44 }, portalRift: { w: 14, h: 44 },
  portalRings: { w: 14, h: 44 }, portalTube: { w: 14, h: 44 },
};

function propNominalSize(name) {
  if (BAKEOFF_SIZES[name]) return BAKEOFF_SIZES[name];
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
      }, { animated: frames > 1, hires: 3 });
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

// ------------------------------------------------------- 3b. cabinet posters
// The one-sheet that hangs over each machine, next to the machines themselves.
// Every sheet is drawn by the hub's own drawPoster at the hub's own sizes, so
// there are exactly two rungs here because the game only ever shows two: the
// wall (POSTER_W through HUB_ZOOM — small, tilted, half the type a smudge) and
// the tap-to-read blow-up (DST_H 216, straightened, fully lit), which is where
// the wordmark and tagline become set type. A rung between them would be a size
// nobody sees.
//
// The hang — tilt, tear, crease — comes from posterLook(), the hub's function,
// fed one bay stride per cabinet: the gallery has no station x, and inventing a
// second hanging rule here is how the row stops matching the wall. `lit: 1`
// throughout, because the concourse's falloff is a property of the room and the
// question this section answers is what is printed on the paper.
{
  const grid = section('posters', 'Cabinet posters',
    `${CABINETS.length} machines plus OVERTIME, each with its own sheet — drawPoster() from `
    + 'sprites/backwall.js, stock and ink straight from the cabinet palette. Top rung is wall '
    + `size (${POSTER_W}x${POSTER_H} through the hub's ${HUB_ZOOM}x zoom); below it, the same sheet at `
    + 'the size tapping it opens, where the type is meant to be read.');

  // Cabinet order, then the post-game machine — the order they hang in.
  const sheets = CABINETS.map((cab, i) => ({
    id: cab.id,
    name: cab.name,
    sub: `${cab.id} · star: ${CABINET_STAR[cab.id] || '—'}`,
    pal: cabinetPalette(cab, true),
    look: posterLook(i * 64),
  }));
  sheets.push({
    id: 'overtime',
    name: 'OVERTIME',
    sub: 'no campaign hero — punch clock art',
    pal: OVERTIME_POSTER_PALETTE,
    look: posterLook(sheets.length * 64),
  });

  // A tilted sheet leans outside its own box, so every tile carries a margin
  // proportional to the sheet rather than a fixed few pixels — at the read size
  // the same tilt swings four times as far.
  const posterTile = (sheet, h, sub, tilt) => {
    const w = h * (POSTER_W / POSTER_H);
    const pad = Math.round(h * 0.09);
    tile(grid, sheet.name, sub, Math.round(w + pad * 2), Math.round(h + pad * 2), (ctx) => {
      drawPoster(ctx, pad + w / 2, pad, w, h, {
        pal: sheet.pal, tilt, torn: sheet.look.torn, seed: sheet.look.seed, lit: 1,
      });
    });
  };

  for (const s of sheets) posterTile(s, POSTER_H * HUB_ZOOM, `${s.sub} · on the wall`, s.look.tilt);
  // 216 is HubState.drawPosterZoom's DST_H, and it straightens as it comes
  // forward: held up to read, it is just the sheet.
  for (const s of sheets) posterTile(s, 216, `${s.sub} · tap-to-read`, 0);

  // One tile, not nine. The locked palette carries no motif, so drawPoster gets
  // no star, no wordmark and no badge — and its stock is the same dead #20242c
  // on every machine, so all nine unplugged sheets are this sheet.
  posterTile(
    { name: 'locked', look: posterLook(0), pal: cabinetPalette(CABINETS[0], false) },
    POSTER_H * HUB_ZOOM, 'any unplugged machine · no motif, no star, no type', posterLook(0).tilt,
  );
}

// ---------------------------------------------------------------- 4. world sprites
{
  const keys = Object.keys(WORLD_SPRITES);
  const grid = section('world', 'World sprites (pixel grids)',
    `${keys.length} pixel-grid sprites from WORLD_SPRITES, built by buildAllSprites() and read back via getSprite().`);
  for (const k of [...keys, 'zombieWalk']) {
    const spr = getSprite(k);
    if (!spr) { tile(grid, k, 'not in cache', 16, 16, () => {}); continue; }
    // The only genuinely pixel-quantised assets left in the gallery: these are
    // pre-rendered rasters, so nearest-neighbour is the honest presentation and
    // there is no point rendering them denser than 1:1.
    tile(grid, k, `${spr.width}x${spr.height}`, spr.width + 4, spr.height + 4,
      (ctx) => ctx.drawImage(spr, 2, 2), { hires: false, pixel: true });
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

// ------------------------------------------------------------- 5b. the fliers
// The three animated fliers, at the size they actually are and then frame by
// frame. `drone` and `droneEye` are two bodies on ONE hitbox — makeObstacle
// picks between them per instance, so a patrol is mixed — and `shooterDrone` is
// the workhorse plus a muzzle, so it inherits the rotor by construction.
//
// The top row is the only one that reports the read: 12x7 through drawProp with
// the 1.33x hazard overdraw and the 1.35x flier scale, which is exactly what
// scrolls past at 112-160 px/s. The strips below are for catching a bad pose,
// which motion hides and a static row does not.
{
  const FLIERS = [
    ['drone', 'drone — workhorse', 'Spinning rotor, blinking lamp. The common body.'],
    ['droneEye', 'drone — watcher', 'Second body on the same hitbox. Lens drifts on a slow 1.3s scan with five rotor turns inside it.'],
    ['shooterDrone', 'shooter drone', 'Workhorse plus muzzle — shares the rotor painter.'],
    ['buzzbird', 'buzzbird', 'Six-frame wingbeat, broad on the downstroke and feathered on the recovery. Faces left, into the scroll.'],
  ];
  const BOX = { w: 12, h: 7 };
  const OVERDRAW = 4 / 3 * 1.35;
  {
    const grid = section('fliers-size', 'Fliers — true size in the lane',
      'Drawn at the real 12x7 box with the hazard overdraw and flier scale applied, '
      + `through the run's ${WORLD_Z}x world zoom. `
      + 'The bar at the left of each tile is 24px — the hero\'s drawn height — for scale.');
    for (const [name, label, note] of FLIERS) {
      const frames = propFrames(name);
      const dw = BOX.w * OVERDRAW;
      const dh = BOX.h * OVERDRAW;
      tile(grid, label, `${name} · ${frames}f @ ${propFps(name)}fps`, 56 * WORLD_Z, 30 * WORLD_Z, (ctx, t) => {
        ctx.scale(WORLD_Z, WORLD_Z);
        const f = frames > 1 ? Math.floor(t * propFps(name)) % frames : 0;
        ctx.fillStyle = 'rgba(120,130,160,0.45)';
        ctx.fillRect(5, 15 - 12, 1.5, 24);
        drawProp(ctx, name, 24, 15 - dh / 2, dw, dh, f);
      }, { animated: frames > 1, hires: 3 });
    }
  }
  {
    const grid = section('fliers-frames', 'Fliers — frame strips',
      'Every pose, static. Animation hides a bad frame; this does not. Same '
      + 'in-lane size and world zoom as the row above, so a frame that only '
      + 'reads at a flattering magnification is caught here.');
    for (const [name, label, note] of FLIERS) {
      const frames = propFrames(name);
      const CELL = 26;
      tile(grid, label, note, (CELL * frames + 4) * WORLD_Z, 30 * WORLD_Z, (ctx) => {
        ctx.scale(WORLD_Z, WORLD_Z);
        const dw = BOX.w * OVERDRAW;
        const dh = BOX.h * OVERDRAW;
        for (let f = 0; f < frames; f++) {
          drawProp(ctx, name, 2 + f * CELL + (CELL - dw) / 2, 15 - dh / 2, dw, dh, f);
        }
      }, { animated: false, hires: 3, wide: frames > 4 });
    }
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

// ---------------------------------------------------------------- 7b. backgrounds
// Last of the world sections rather than first of the page. A background is the
// thing everything above stands in front of, so it reads as context once you
// know the cast and the props — and as wallpaper before you do. It is also the
// only section whose tiles are whole 480x270 frames, which made the top of the
// gallery a wall of scenery you had to scroll past to reach the art under
// review.
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

// ------------------------------------------------------- 7c. raised routes
// The roads that leave the lane, and the ground they are cut out of.
//
// Built with buildRoutes() off PLUMBER's own cabinet data, so every number on
// this page — heights, spans, the width of a hole — is the number the stage
// actually ships. Each tile then frames one WINDOW of one road and paints it
// with the run's own drawSubsoil/drawRoutes, at the run's world zoom. Nothing
// here re-implements any of it; that is the whole reason routes.js exists as a
// module rather than as a method on RunState.
{
  const cab = CABINETS.find((c) => c.id === 'plumber');
  const style = getStylePack(cab.style, {});
  // The plumber stage's real length and base speed. `dwell` is in SECONDS, so a
  // road's span only exists once you say how fast the stage runs.
  const TOTAL = 9072;
  const SPEED = 160;
  const CLOUD_FROM = 108;
  const CLOUD_TO = 168;
  const groundAt = (wx) => terrainGroundY(cab, wx);
  const routes = buildRoutes(cab, { totalDist: TOTAL, speed: SPEED, groundYAt: groundAt });
  // Exactly what RunState.routeGroundY does, and the profile inside it is the
  // run's own.
  const topAt = (wx, r) => (r.kind === 'island' ? r.topY : groundAt(wx) - routeRise(wx, r));

  // One window on the world: `ww` world units wide, centred on (cx, midY).
  //
  // Framed by its CENTRE rather than by an anchor line, because these tiles are
  // looking at things the run's camera never frames the same way twice — a
  // chamber roof, a cut face, the last column of a road — and "put this bit in
  // the middle" is the only instruction that serves all of them.
  // The lane's own fill stops where a tunnel runs under it, and the hill is
  // grass down to the depth of the deepest road. Both are the run's numbers,
  // read from the run's own helpers — a tile that skipped them would show a
  // picture the game never draws, which is the one thing this page may not do.
  const laneCuts = tunnelOverhangs(routes);
  const hillDepth = routes.reduce((d, r) => (r.kind === 'tunnel' ? Math.max(d, r.rise) : d), 0);
  // A tunnel's mouth is a gap obstacle in the lane, exactly as spawnRouteEntries
  // lays it, and both terrain renderers carve it from that. Without it the tiles
  // draw an entrance with no way in.
  const laneHoles = [];
  for (const r of routes) {
    if (r.kind !== 'tunnel') continue;
    for (const sp of [...(r.ramp ? [] : [{ x: r.x, w: r.mouthW }]), ...(r.holes || [])]) {
      const hole = makeObstacle('gap', sp.x, {});
      hole.w = sp.w;
      hole.tunnel = r;
      laneHoles.push(hole);
    }
  }

  const routeTile = (grid, name, sub, cx, ww, midY, opts = {}) => {
    const wh = ww * (H / W);
    tile(grid, name, sub, ww * WORLD_Z, wh * WORLD_Z, (ctx) => {
      const camX = cx - ww / 2;
      const topY = midY - wh / 2;
      // Flat sky rather than the pack's bg(). A background is drawn in SCREEN
      // space against a 480x270 frame — the run calls it OUTSIDE the world
      // transform — so putting one inside a tile's own scale and translate
      // paints a horizon in the wrong place and makes the road look wrong for a
      // reason that has nothing to do with the road. Everything below this line
      // is world-space, and is exactly what the run draws.
      ctx.fillStyle = cab.sky ? cab.sky[1] : '#a8e0f8';
      ctx.fillRect(0, 0, ww * WORLD_Z, wh * WORLD_Z);
      ctx.save();
      ctx.scale(WORLD_Z, WORLD_Z);
      ctx.translate(0, -topY);
      const obs = [...laneHoles, ...(opts.obstacles || [])];
      if (style.ground) style.ground(ctx, camX, cab, obs, laneCuts);
      drawTerrain(ctx, camX, cab, obs, GROUND_Y, ww, laneCuts);
      drawSubsoil(ctx, cab, ww, topY + wh, camX, laneCuts, hillDepth);
      drawRoutes(ctx, camX, cab, routes, topAt, ww,
        { groundAt, cloudFrom: CLOUD_FROM, cloudTo: CLOUD_TO, bottomY: topY + wh, hillDepth });
      ctx.restore();
    }, { animated: false, hires: 2, wide: ww > 200 });
  };

  const steps = routes.filter((r) => r.stack);
  const sky = routes.find((r) => r.sky);
  const tunnel = routes.find((r) => r.kind === 'tunnel');

  {
    const grid = section('routes-ground', 'Ground — cross-section',
      `drawSubsoil(): turf, root zone, an 8px blend, then three soil bands (${soilOf(cab)}) parted by `
      + 'seams that wander, with pebbles set through all of them and the odd boulder straddling one. '
      + 'A gradient reads as a brown wash — earth in section is layered, and the boundaries wobble. '
      + 'These layers are what the cut at an opening is a cut THROUGH, which is why no opening needs '
      + 'an edge drawn on it.');
    // Plain lane, well clear of any road: the point of these is the soil, and a
    // window over a tunnel is mostly the hole in it.
    //
    // Deep windows on purpose. The first seam is 44px under the line and the
    // second 112, so a shallow tile shows a brown rectangle and a caption
    // claiming layers — which is worse than showing nothing, because the page
    // is supposed to be the thing you check the claim against.
    routeTile(grid, 'the whole profile',
      'turf, root zone, topsoil, the first seam, the packed band, the second seam',
      1000, 240, GROUND_Y + 64);
    routeTile(grid, 'a boulder in it', 'four times its neighbours, and across a seam rather than inside a band',
      5900, 150, GROUND_Y + 62);
  }

  if (tunnel) {
    const grid = section('routes-tunnel', 'Tunnel — the low road',
      `${Math.round(tunnel.w)}px of span, ${-tunnel.peak}px deep. Deeper than the best jumper in the `
      + 'cast can clear, because that is the only thing keeping him down there — there is no ceiling '
      + 'collision and there should not be one: the whole mechanism works because there is only ever ONE floor.');
    routeTile(grid, 'entrance',
      `${Math.round(tunnel.mouthW)}px — ${Math.round(tunnel.mouthW / 8)} hero-widths, cleared on purpose`,
      tunnel.x + tunnel.mouthW / 2, 84, GROUND_Y + 6);
    for (const h of tunnel.holes || []) {
      routeTile(grid, 'mid-span hole',
        `${Math.round(h.w)}px — a stride, not a second decision`,
        h.x + h.w / 2, 84, GROUND_Y + 6);
    }
    routeTile(grid, 'the chamber', 'roof rim lit from below, floor keeps the lane\'s own ground line',
      tunnel.x + tunnel.w * 0.42, 150, GROUND_Y + tunnel.rise * 0.55);
    routeTile(grid, 'a skeleton',
      'one per tunnel, pinned just under the floor — the only deep earth ever on screen',
      2910, 92, GROUND_Y + tunnel.rise + 12);
    routeTile(grid, 'climbing out',
      'the merge: the floor rises to meet the lane, so the route drops away with nothing to fall',
      tunnel.x + tunnel.w * 0.95, 150, GROUND_Y + tunnel.rise * 0.34);
  }

  if (sky) {
    const grid = section('routes-sky', 'Sky road — the high road',
      `Enters at ${sky.entry}px — spring only, three times a jump — climbs to ${sky.peak}, holds, and `
      + `stops at ${sky.end} in MID-AIR: you fall the last stretch, because a road that eases back down `
      + `to the lane has no ending. Drawn as dirt below ${CLOUD_FROM}px of rise and as cloud above ${CLOUD_TO}.`);
    // Framed on the ROAD rather than on a height guessed from the data: `topAt`
    // is the same function the run stands the hero on, so a tile cannot end up
    // pointed at the sky above a road that turned out to be somewhere else.
    const onRoad = (f, drop = 12) => topAt(sky.x + sky.w * f, sky) + drop;
    routeTile(grid, 'the lip', 'where the spring puts you down — flat, and honest ground',
      sky.x + sky.w * sky.lip * 0.5, 92, onRoad(sky.lip * 0.5));
    routeTile(grid, 'the climb', 'dirt becoming weather on the way up',
      sky.x + sky.w * (sky.lip + sky.climb * 0.62), 92, onRoad(sky.lip + sky.climb * 0.62));
    routeTile(grid, 'the top', `cloud, ${sky.peak}px above the lane`,
      sky.x + sky.w * 0.62, 92, onRoad(0.62));
    routeTile(grid, 'the end', `it stops in the air — the last ${sky.end}px is a fall`,
      sky.x + sky.w - 22, 92, onRoad(0.985, 22));
  }

  if (steps.length) {
    const grid = section('routes-islands', 'Islands — staircases',
      'Treads GROW as the climb does: the bottom step is a foothold you are off in a stride, and the run '
      + 'you spend time on is the high one with the reward. An equal-length low tread is a road a few '
      + `pixels above the lane, which is neither. Slab body is ${ISLAND_THICKNESS}px of soil under a 3px `
      + 'turf cap — the same number the fairness sweep measures a hazard against.');
    for (const id of [...new Set(steps.map((r) => r.stack))]) {
      const st = steps.filter((r) => r.stack === id);
      // The first steps rather than the whole flight. A four-step stack spans
      // nearly six hundred world px, and at the world zoom this page insists on
      // — no tile may show art smaller than the game does — that is a card
      // three thousand pixels wide. The caption carries the full figures; the
      // picture carries what the climb LOOKS like, which is the bottom of it.
      const from = st[0].x - 24;
      routeTile(grid, `${st.length}-step stack — the bottom of the climb`,
        `rises ${st.map((r) => r.entry).join(' / ')}px · treads ${st.map((r) => Math.round(r.w)).join(' → ')}px`,
        from + 150, 300, GROUND_Y - st[Math.min(1, st.length - 1)].entry / 2 + 6);
    }
    const top = steps[steps.length - 1];
    routeTile(grid, 'a slab, close up',
      'turf cap overhanging both ends, soil, a scalloped underside, stones set into the cut face',
      top.x + top.w / 2, 66, top.topY + 6);
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

  // Not `wide`. A floatie card is 300x34 — a full-width row per tile turned a
  // contrast check into eleven screens of scrolling with a metre of dead space
  // beside each one, and comparing two inks meant remembering the first. At the
  // default screen scale these flow several to a row and the whole palette is
  // one glance.
  function floatieTile(label, text, color, solid = false) {
    tile(grid, text, label, TILE_W, TILE_H, (ctx) => {
      // Shift the world so the card's own screen position lands in the tile.
      ctx.translate(-(HERO_X - 8), -(CARD_Y - 8));
      drawFloatie(ctx, { text, color, y: CARD_Y, solid }, { heroX: HERO_X });
    });
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
    }, { animated: true, hires: 4 });
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
    }, { animated: true, hires: 4 });
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
    // Guarded. This table was written against a fixed roster but is indexed by
    // whatever TOON_SPECS currently holds, so a hero added to the cast without
    // a row here took the WHOLE PAGE down — one undefined lookup in a lab
    // section and nothing after it draws, including every production section.
    if (!candidate) continue;
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

// The jump/duck legacy-vs-improved comparison used to sit here. The improved
// motion shipped as ACTIVE_LOCOMOTION_STYLE and the section came out.

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
    ['gnash', 'sky point clear of the head · arm sweeps the step-turn'],
    ['fernwick', 'shield raised clear of the face · swung down and presented'],
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

// The turned run sheet used to sit here. It came out of the gallery; the turn
// itself is still in drawToon via pose({ turn }).

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

// ------------------------------------------- 2b2. limb style port (lab only)
// The Lorenzo limb-motion spec — knee fold, heel/toe roll, hip depth, the three
// -beat jump — carried across every hero who shares drawHumanoid, plus the one
// line of it a legless rig can take. `limbStyle: 'legacy'` in the pose is the
// painter's own rollback switch, so the left half of every pair below is the
// real shipped painter and not a reconstruction of it.
{
  const STYLED = Object.keys(TOON_SPECS).filter((id) => TOON_SPECS[id].limbStyle);
  const grid = section('limb-styles', 'Cast — limb style port',
    'Lorenzo\'s reviewed run and jump spec ported to the whole shared humanoid painter. '
    + 'Every pair is legacy on the left or above, styled on the right or below, at the same '
    + 'phase and the same size. Fernwick and Grumpos keep their SHIPPED leg swing and take the '
    + 'new foot and jump only — Grumpos because his skirt hem was cut to his shipped knee to the '
    + '0.0001u and there is no room to move it. Raymn has no legs, so he takes the ankle roll '
    + 'and nothing else. The bare-legged five carry the spec\'s cadence and feet on shipped leg '
    + 'BONES — see the thigh bake-off at the end of this section for why the geometry came back.');

  const legacy = (p) => ({ ...p, limbStyle: 'legacy' });

  // Live A/B. Both halves take the same t, so any difference is the style.
  for (const id of STYLED) {
    const style = TOON_SPECS[id].limbStyle;
    tile(grid, `${id} — run, before / after`, `legacy · ${style} — live cycle`,
      150, 100, (ctx, t) => {
        const p = pose('run', t);
        drawToon(ctx, id, legacy(p), 39, 88, 60);
        drawToon(ctx, id, p, 111, 88, 60);
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '8px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEGACY', 39, 98);
        ctx.fillText(style.toUpperCase(), 111, 98);
      }, { animated: true, wide: true, hires: 4 });
  }

  // Eight frames is the resolution the spec was reviewed at, and a live loop
  // cannot be checked against it — 3/8 is the elbow-open peak, 2/8 and 4/8 take
  // half of it, and 4-5 are where the toe-off has to still be holding.
  {
    const FW = 54, PAD = 10, stripW = PAD * 2 + FW * 8;
    for (const id of STYLED) {
      tile(grid, `${id} — 8-frame run`, 'legacy above · styled below · 3/8 is the elbow-open peak',
        stripW, 196, (ctx) => {
          for (let i = 0; i < 8; i++) {
            const p = pose('run', 0, { phase: i / 8, time: i / 8 });
            const x = PAD + FW * i + FW / 2;
            drawToon(ctx, id, legacy(p), x, 86, 54);
            drawToon(ctx, id, p, x, 178, 54);
            ctx.fillStyle = i === 3 ? '#d8b24a' : '#8a8a9e';
            ctx.font = '8px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${i}/8`, x, 94);
            ctx.fillText(`${i}/8`, x, 186);
          }
        }, { wide: true, hires: 4 });
    }
  }

  // The jump is the half of the spec that cannot be seen in a run strip: the
  // shipped rig holds one symmetric pose for the whole arc, so the three beats
  // only show up sampled against velocity.
  {
    const BEATS = [[380, 'RISE'], [120, ''], [0, 'APEX'], [-120, ''], [-380, 'FALL']];
    const FW = 60, PAD = 10, stripW = PAD * 2 + FW * BEATS.length;
    for (const id of STYLED.filter((x) => TOON_SPECS[x].rig === 'humanoid')) {
      tile(grid, `${id} — jump arc`, 'legacy above · styled below · sampled across vy',
        stripW, 210, (ctx) => {
          BEATS.forEach(([vy, label], i) => {
            const p = pose('jump', 0.3, { vy, phase: 0.25 });
            const x = PAD + FW * i + FW / 2;
            drawToon(ctx, id, legacy(p), x, 92, 58);
            drawToon(ctx, id, p, x, 192, 58);
            ctx.fillStyle = '#8a8a9e';
            ctx.font = '8px ui-monospace, monospace';
            ctx.textAlign = 'center';
            if (label) { ctx.fillText(label, x, 100); ctx.fillText(label, x, 200); }
          });
        }, { wide: true, hires: 4 });
    }
  }

  // Size rungs. These pass the real h to drawToon rather than shrinking one big
  // render, so each keeps the stroke floors and simplifications the game uses at
  // that size — which is the whole point of the 24u rung: the silhouette has to
  // still read as ONE figure there, not as two sticks under a body.
  {
    const RUNGS = [[24, 'in-run 24u'], [60, 'menu 60u'], [144, 'review 144u']];
    for (const id of STYLED) {
      const w = 40 + RUNGS.reduce((a, [h]) => a + h * 1.5 + 16, 0);
      tile(grid, `${id} — size rungs`, 'phase 3/8 · legacy / styled at each real draw height',
        w, 190, (ctx) => {
          let x = 20;
          for (const [h, label] of RUNGS) {
            const p = pose('run', 0, { phase: 0.375, time: 0.375 });
            drawToon(ctx, id, legacy(p), x + h * 0.36, 170, h);
            drawToon(ctx, id, p, x + h * 1.1, 170, h);
            ctx.fillStyle = '#8a8a9e';
            ctx.font = '8px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, x + h * 0.73, 184);
            x += h * 1.5 + 16;
          }
        }, { wide: true, hires: 4 });
    }
  }

  // The thigh, which is what the first cut of this port got wrong. Its stride,
  // lift and leg length ran well over shipped while `seg` shortened the bones,
  // so the extension cap had to lengthen the thigh 17.5% to stop the shin
  // stretching — and a long thigh plus a hip split applied along the TRAVEL
  // axis swung it past horizontal for six frames of eight, knee above the hip.
  // A figure sitting down. Same cadence and the same feet in all three columns;
  // only the leg geometry differs.
  {
    const RUNGS = [
      ['legacy', 'shipped', 'thigh 0.171u · 4/8 flat · max 96°'],
      ['snapWide', 'first port', 'thigh 0.201u · 6/8 flat · max 111°'],
      ['snap', 'shipped now', 'thigh 0.171u · 4/8 flat · max 91°'],
    ];
    const CAPPED = ['lorenzo', 'gnash', 'b33p', 'gary', 'dolores'];
    const CW = 92, PAD = 10;

    // 6/8 is where the first port put the knee above the hip.
    for (const id of CAPPED) {
      tile(grid, `${id} — thigh, before / after`,
        'phase 6/8 · the frame the knee climbed above the hip',
        PAD * 2 + CW * RUNGS.length, 138, (ctx) => {
          RUNGS.forEach(([limbStyle, label, note], i) => {
            const x = PAD + CW * i + CW / 2;
            drawToon(ctx, id, pose('run', 0, { phase: 0.75, time: 0.75, limbStyle }), x, 106, 62);
            ctx.fillStyle = i === 1 ? '#c46a6a' : i === 2 ? '#d8b24a' : '#8a8a9e';
            ctx.font = '9px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, 120);
            ctx.fillStyle = '#8a8a9e';
            ctx.font = '7px ui-monospace, monospace';
            ctx.fillText(note, x, 131);
          });
        }, { wide: true, hires: 4 });
    }

    // Pelvis bake-off. Zeroing hipSplit was collateral from the thigh fix — it was
  // the single biggest contributor to the sitting read, so it went to zero
  // without checking whether a smaller value would have done. It would have.
  //
  // The two dials are NOT equivalent. hipSplit offsets in x, and in a profile
  // run x is the direction of travel, so it puts one hip in front of the other
  // and drags the thigh toward horizontal: past 0.015 it tips straight from
  // four flat frames to six. hipDepth offsets in y and costs almost nothing —
  // 0.060u of separation still reads at shipped's own 96 degrees. If the pelvis
  // wants to look wider, depth is where the room is.
  {
    const FW = 54, GUT = 104, ROW = 86, PAD = 8;
    const strip = (label, rows) => {
      tile(grid, `lorenzo — pelvis, ${label}`, 'one row per setting · same eight frames · the other dial at its shipped value',
        GUT + FW * 8 + PAD * 2, PAD * 2 + ROW * rows.length + 12, (ctx) => {
          rows.forEach(([name, note, extra], r) => {
            const y = PAD + ROW * r;
            for (let i = 0; i < 8; i++) {
              drawToon(ctx, 'lorenzo',
                pose('run', 0, { phase: i / 8, time: i / 8, ...extra }),
                GUT + FW * i + FW / 2, y + ROW - 14, 56);
            }
            ctx.textAlign = 'left';
            ctx.fillStyle = extra.__hi ? '#d8b24a' : '#cfcfdb';
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(name, PAD, y + ROW / 2 - 2);
            ctx.fillStyle = '#8a8a9e';
            ctx.font = '8px ui-monospace, monospace';
            ctx.fillText(note, PAD, y + ROW / 2 + 10);
          });
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '8px ui-monospace, monospace';
          ctx.textAlign = 'center';
          for (let i = 0; i < 8; i++) ctx.fillText(`${i}/8`, GUT + FW * i + FW / 2, PAD + ROW * rows.length + 8);
        }, { wide: true, hires: 4 });
    };

    strip('hipSplit (fore/aft)', [
      ['shipped', 'one root · 4/8 flat · 96°', { limbStyle: 'legacy' }],
      ['0.000', 'gap 0.000u · 4/8 flat · 91°', { hipSplit: 0 }],
      ['0.015', 'gap 0.030u · roots too near centre', { hipSplit: 0.015 }],
      ['0.026', 'gap 0.052u', { hipSplit: 0.026 }],
      ['0.035  (shipped now)', 'gap 0.070u · reads off the hip', { hipSplit: 0.035, __hi: true }],
      ['0.052  (spec)', 'gap 0.104u · 6/8 flat · 101°', { hipSplit: 0.052 }],
    ]);

    strip('hipDepth (near/far)', [
      ['shipped', 'one root · 4/8 flat · 96°', { limbStyle: 'legacy' }],
      ['0', 'gap 0.000u', { hipDepth: 0 }],
      ['1', 'gap 0.020u', { hipDepth: 1 }],
      ['2  (shipped now)', 'gap 0.040u · 4/8 flat · 97°', { hipDepth: 2, __hi: true }],
      ['3', 'gap 0.060u · still 4/8 flat', { hipDepth: 3 }],
    ]);

    // The cadence anchor. `hold` makes the clock dwell at two points of the
    // cycle and whip between them — the snap. With no anchor the dwell lands on
    // the contact onset, which is the one pose where the thigh is up with the
    // shin plumb under it: a figure in a chair, held for 13/32 of the cycle.
    // Rotating the anchor to 0.3 parks the dwell on mid-stance and the
    // mid-recovery tuck instead — both running shapes — and the plant becomes
    // the thing the clock snaps THROUGH. Same hold, same hips, same feet.
    strip('cadence anchor (holdAt)', [
      ['shipped', 'no snap clock · 8/32 chair', { limbStyle: 'legacy' }],
      ['anchor 0  (was)', 'dwell ON the plant · the sitting read', { gaitTune: { holdAt: 0 } }],
      ['anchor .35  (shipped now)', 'dwell on stance + tuck · 6/32 chair', { gaitTune: { holdAt: 0.35 }, __hi: true }],
      ['hold 1  (no snap at all)', 'linear clock', { gaitTune: { hold: 1 } }],
    ]);

    // The bone split. Both leg bones shipped equal, and a 1:1 fold is a lap:
    // knee at the midpoint, thigh and shin mirror-symmetric about it. Giving
    // the thigh the femur's larger share moves the knee down the leg and the
    // raised-leg fold stops reading as sitting — the thigh peaks BELOW
    // horizontal at 0.54 where 1:1 peaks past it. A shorter thigh does the
    // opposite, violently. The trade is the knee riding lower through the
    // swing, dipping under the lifted shoe on more frames (at a third of the
    // depth the shipped 1:1 rig already dips).
    strip('thigh : shin split', [
      ['shipped 1:1', 'chair 8/32 · peak 97°', { limbStyle: 'legacy' }],
      ['0.46  (shipped now)', 'chair 8/32 · peak 111° · compact thigh, judged by eye', { gaitTune: { thigh: 0.46 }, __hi: true }],
      ['0.50 equal', 'chair 6/32 · peak 101°', { gaitTune: { thigh: 0.5 } }],
      ['0.54 anatomical', 'chair 6/32 · peak 92° · the metric\'s pick', { gaitTune: { thigh: 0.54 } }],
      ['0.58 longer still', 'chair 5/32 · peak 85° · knee dips more', { gaitTune: { thigh: 0.58 } }],
    ]);

    // Stance. The run was riding LOW: mean leg extension had fallen to 0.537
    // against shipped's 0.620, so the knee stayed folded right through the
    // cycle. Raising the hip stretches the hip-to-ankle span over unchanged
    // bones — the leg straightens and the body lifts together, one dial. What
    // it costs is torso: the shoulders do not move when the hip rises, so the
    // body shortens by whatever the legs gain. That trade is why this dial is
    // narrow, and why the rungs below stop at 1.12.
    strip('stance (hip height)', [
      ['shipped', 'hip 0.248 · meanExt 0.620 · torso 0.381', { limbStyle: 'legacy' }],
      ['1.00  (was — the low read)', 'hip 0.236 · meanExt 0.537 · torso 0.381', { gaitTune: { stance: 1, extend: 0.9 } }],
      ['1.04', 'hip 0.246 · meanExt 0.578', { gaitTune: { stance: 1.04 } }],
      ['1.085  (shipped now)', 'hip 0.258 · meanExt 0.602 · torso 0.360', { gaitTune: { stance: 1.085 }, __hi: true }],
      ['1.12 further still', 'hip 0.266 · shorter torso again', { gaitTune: { stance: 1.12 } }],
    ]);

    // The two most likely answers, moving, against shipped and against the spec.
    const LIVE = [
      ['shipped', { limbStyle: 'legacy' }],
      ['stance 1.0\n(the low read)', { gaitTune: { stance: 1, extend: 0.9 } }],
      ['stance 1.085\nSHIPPED NOW', {}],
      ['stance 1.12', { gaitTune: { stance: 1.12 } }],
      ['anchor 0\n(the chair)', { gaitTune: { holdAt: 0 } }],
    ];
    tile(grid, 'lorenzo — pelvis, live', 'same clock in every lane',
      PAD * 2 + 78 * LIVE.length, 128, (ctx, t) => {
        LIVE.forEach(([label, extra], i) => {
          const x = PAD + 78 * i + 39;
          drawToon(ctx, 'lorenzo', pose('run', t, extra), x, 100, 60);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '9px ui-monospace, monospace';
          ctx.textAlign = 'center';
          label.split('\n').forEach((ln, j) => ctx.fillText(ln, x, 114 + j * 10));
        });
      }, { animated: true, wide: true, hires: 4 });
  }

  // Live, because a stroll is something you see in motion and not in one frame.
    tile(grid, 'thigh rework — live, all three',
      'lorenzo · same clock in every lane', PAD * 2 + CW * RUNGS.length, 124,
      (ctx, t) => {
        RUNGS.forEach(([limbStyle, label], i) => {
          const x = PAD + CW * i + CW / 2;
          drawToon(ctx, 'lorenzo', pose('run', t, { limbStyle }), x, 106, 62);
          ctx.fillStyle = '#8a8a9e';
          ctx.font = '9px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, 119);
        });
      }, { animated: true, wide: true, hires: 4 });
  }
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
      // Composited from a TWxTH offscreen raster, so there is nothing denser to
      // render and nearest-neighbour is what the filter actually produced.
      }, { animated: true, hires: false, pixel: true });
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

// The back wall bake-off used to sit here. The dressing was chosen and the
// section came out of the gallery; WALL_DRESSINGS still holds the candidates.

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
    // That scale is a MAGNIFYING GLASS, not a camera: it exists so a 0.009u
    // difference survives the trip to your eye. Pin the ink to the zoom this
    // row is actually about — the 60u row is a menu at 1:1, the 24u row is the
    // in-run sprite at the world zoom — or the cell blows the stroke floors
    // open by 5x and shows ink the game never draws at either size.
    setInkScale(h === HERO_DRAW_H ? WORLD_Z : 1);
    try {
      // feet at +anchor*h below the cell center puts the head center ON it
      drawToon(ctx, id, pose('run', phase), 0, anchor * h, h);
    } finally {
      setInkScale();
    }
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
  const RUN_W = (HERO_DRAW_W + 10) * WORLD_Z, RUN_H = (HERO_DRAW_H + 8) * WORLD_Z;
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
          ctx.scale(WORLD_Z, WORLD_Z);
          drawToon(ctx, id, pose('run', t), (HERO_DRAW_W + 10) / 2, RUN_H / WORLD_Z - 4, HERO_DRAW_H);
          ctx.restore();
        } finally {
          setInk(); // never leak a treatment into the next tile
        }
      }, { animated: true, wide: true });
    }
  }
}

// The Lorenzo cap & face was/is section used to sit here. Settled 2026-07-23
// and removed from the gallery on 2026-08-05; LORENZO_FACES and setLorenzoFace
// in toons.js still hold the before and the after.

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
    // Magnifying glass, not a camera — see the ink bake-off's headCell.
    setInkScale(h === HERO_DRAW_H ? WORLD_Z : 1);
    try {
      drawToon(ctx, id, pose('run', phase), 0, anchor * h, h);
    } finally {
      setInkScale();
    }
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
      setInkScale(1);
      try {
        drawToon(ctx, id, pose('run', BROW_T), 0, (TOON_SPECS[id].heavy ? 0.978 : 0.76) * 60, 60);
      } finally {
        setInkScale();
      }
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
      setInkScale(1);
      try {
        drawToonFace(ctx, id, 0, 0, 34, 34);
      } finally {
        setInkScale();
      }
      ctx.restore();
    }],
    ['24u in-run', (ctx, id, x, y) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip();
      ctx.translate(x + CELL / 2, y + CELL / 2);
      ctx.scale(CELL / (0.62 * HERO_DRAW_H), CELL / (0.62 * HERO_DRAW_H));
      setInkScale(WORLD_Z);
      try {
        drawToon(ctx, id, pose('run', BROW_T), 0, (TOON_SPECS[id].heavy ? 0.978 : 0.76) * HERO_DRAW_H, HERO_DRAW_H);
      } finally {
        setInkScale();
      }
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

// --------------------------------------------- Facial expressions (lab only)
// Every hop currently wears the exact same surprised O-mouth — expressionFor's
// `jf` lookup (toons.js) can now vary that per jump, but nothing in run.js
// rolls a random one yet. This is the review gate before that gets wired up:
// the whole cast across all 4 candidate jump faces, side by side, so a bad one
// (or a hero it doesn't suit) shows up before it's live in a real run. A 5th,
// neutral, was cut after review for reading too close to determined.
{
  const ids = Object.keys(TOON_SPECS);
  const VARIANTS = [
    ['Surprised', 0, "today's only jump face — the O-mouth"],
    ['Excited', 1, 'happy-arc eyes + a modest grin — reuses the joy face'],
    ['Determined', 2, 'brows-down, forward-look eyes — the same face heroes already wear mid-run'],
    ['Startled', 3, 'O-mouth + lifted brows — the combo the Gary title cameo already ships'],
  ];
  const secId = 'facial-expressions';
  const title = 'Facial expressions';
  const s = document.createElement('section');
  s.id = secId;
  s.innerHTML = `<h2 id="h-${secId}">${title}</h2>`
    + `<p class="note">GALLERY ONLY — pose.jumpFace is not yet rolled by run.js; this drives it `
    + 'directly to preview all 4 candidates before the random pick goes live. Frozen at the jump\'s '
    + 'first frame (t=0) so blink/cheer timing doesn\'t add noise to the comparison.</p>';
  root.appendChild(s);
  const navLink = document.createElement('a');
  navLink.href = `#h-${secId}`;
  navLink.dataset.target = secId;
  navLink.textContent = title;
  nav.appendChild(navLink);

  const HH = 60;
  const th = HH * 1.3;
  for (const [label, jumpFace, note] of VARIANTS) {
    const h3 = document.createElement('h3');
    h3.className = 'subhead';
    h3.textContent = label;
    s.appendChild(h3);
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = note;
    s.appendChild(p);
    const grid = document.createElement('div');
    grid.className = 'grid';
    s.appendChild(grid);
    for (const id of ids) {
      tile(grid, id, label.toLowerCase(), HH * 0.9, th, (ctx) => {
        drawToon(ctx, id, pose('jump', 0, { jumpFace }), (HH * 0.9) / 2, th - HH * 0.05, HH);
      });
    }
  }
}

// The Lorenzo trouser-colour bake-off used to sit here. Blue shipped and the
// section came out of the gallery; LORENZO_PANTS and setLorenzoPants are still
// in toons.js if the question is ever reopened.

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

// ------------------------------------------------- plug frame & trophy shape
// All three slots are settled — the was/is record, the parked plug head and the
// MISSION bake-off have all come out of the gallery. What is left is the two
// open questions about the frame and the trophy's handles. These icons are
// never world props: they are only ever drawn at size-3 of the plug box, which
// is 10x10 in the stage-select list (PIP 13), 8x8 in the in-run HUD and 5x5 in
// the Trophy Room's level records, and they spend most of their life at
// ALPHA_EMPTY.
{
  // Every size drawPlugRow is ever called at, and where from.
  const PLUG_SIZES = [[13, 'stage select'], [11, 'in-run HUD'], [8, 'records']];

  function plugRowTile(grid, label, note, icons, wide = true, frame = undefined) {
    // 6 + rows(43/37/28) + gaps + right margin.
    return tile(grid, label, note, 134, 26, (ctx) => {
      let x = 6;
      for (const [size, where] of PLUG_SIZES) {
        drawPlugRow(ctx, x, 6, [true, true, true], undefined, size, icons, frame);
        ctx.fillStyle = 'rgba(120,130,160,0.5)';
        ctx.font = '4px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${size - 3}px · ${where}`, x + PLUG_ROW_W(size) / 2 - 2, 8 + size);
        x += PLUG_ROW_W(size) + 6;
      }
    }, { animated: false, hires: 6, wide });
  }


  // How far the handles reach. The bowl's half-width is 0.26, so this is really
  // a ratio question — at 0.44 the loops were the widest thing in the icon and
  // it read as a cup with wings, but pulled in too far the silhouette goes back
  // to the tulip the handles were added to fix. Judged at the three sizes it is
  // actually drawn at, because at any larger size all three look fine.
  {
    const grid = section('trophy-handle-spread', 'CHALLENGE trophy — handle reach',
      'Real drawPlugRow at all three call sizes. The number is how far the widest point of the handle '
      + 'loop sits from centre as a fraction of the box; the bowl\'s half-width is 0.26 for reference. '
      + 'The stroke adds another half-linewidth outside whatever it is set to.');
    for (const [icon, label, note] of [
      ['plugTrophyWide', '0.44 — was', 'As shipped before this pass. Handles wider than the bowl and nearly the full tile.'],
      ['plugTrophy', '0.36 — now', 'Clearly outboard of the bowl without being the feature.'],
      ['plugTrophyTight', '0.30 — tighter', 'Only just proud of the bowl. Watch for the silhouette closing back up into a tulip at 5px.'],
    ]) {
      plugRowTile(grid, label, `${note} (${icon})`, [PLUG_ICONS[0], icon, PLUG_ICONS[2]]);
    }
  }

  // The frame is the last gold thing in the row. On a banked plug the border
  // and the toaster it contains are the same hue, so the tile reads as one gold
  // blob at 8px — the same collision that sent the trophy to silver, one layer
  // out. Only `banked` is in question: live stays green and empty stays slate,
  // because those two are carrying state rather than decoration.
  {
    const grid = section('plug-frame-colour', 'Plug frame colour bake-off',
      'Real drawPlugRow with only PLUG_FRAME_COLORS.banked swapped. Each tile shows the three states '
      + 'left to right — banked, live, not earned — at HUD size, then the banked row again at all three '
      + 'call sizes. Judge the FIRST group: that is a fully-cleared stage, the state the row sits in '
      + 'longest, and the one where a gold frame around a gold toaster loses the icon. Live green and '
      + 'empty slate are identical in every tile.');
    const FRAMES = [
      ['was — gold', '#f6d33c', 'The same #f6d33c as the toaster icon and the coin counter. Read as earned, but flattened the toaster into its own border.'],
      ['A — bone', '#e8e6de', 'Neutral warm white, within a shade of the MISSION board\'s own cream. Frames all three icons without claiming a hue any of them uses — though it is now close enough to slot 0 to be worth checking it does not fuse with it.'],
      ['SHIPPED — steel', '#93a3ba', 'The trophy\'s metal, and what PLUG_FRAME_COLORS.banked is now. The quietest of the five, so the check is that it still reads as EARNED beside the slate empty frame rather than as another off state.'],
      ['C — teal', '#48e0c8', 'The HUD\'s existing accent — the plug counter already writes in this colour, so the frame would agree with the number beside it.'],
      ['D — dim bronze', '#a8842e', 'Keeps gold\'s "earned" association at about two thirds the brightness, so the toaster can out-value its own frame.'],
    ];
    for (const [label, banked, note] of FRAMES) {
      const frame = { ...PLUG_FRAME_COLORS, banked };
      // 5 + three HUD rows (37 each) + divider + the 13/11/8 ladder + margin.
      tile(grid, label, `${banked} · ${note}`, 258, 26, (ctx) => {
        let x = 5;
        const states = [[[true, true, true], undefined], [[false, false, false], [true, true, true]],
          [[false, false, false], undefined]];
        for (const [bk, lv] of states) {
          drawPlugRow(ctx, x, 6, bk, lv, 11, PLUG_ICONS, frame);
          x += PLUG_ROW_W(11) + 5;
        }
        ctx.fillStyle = 'rgba(120,130,160,0.35)';
        ctx.fillRect(x + 1, 5, 0.5, 15);
        x += 7;
        for (const size of [13, 11, 8]) {
          drawPlugRow(ctx, x, 6, [true, true, true], undefined, size, PLUG_ICONS, frame);
          x += PLUG_ROW_W(size) + 5;
        }
      }, { animated: false, hires: 6, wide: true });
    }
  }

  // "More antialiased." The hairline is thinner than the pixel it lands in, so
  // its coverage swings between nearly full and nearly none along the corner
  // arcs — the ring looks stepped not because antialiasing is off but because a
  // 0.35px line gives it almost no partial coverage to work with. A wide, very
  // transparent pass underneath gives the edge room to ramp.
  {
    const grid = section('plug-frame-softness', 'Plug frame — edge softness',
      'The frame is now two strokes: a 1.15px pass at 30% alpha, then the 0.35px hairline on top. Same '
      + 'colour, and close to the same total ink, but the edge has about three times the falloff to ramp '
      + 'across. Widening the hairline instead was tried long ago and a 1px ring read as a heavy border '
      + 'that fought the icon. Look at the corner arcs, and at the 5px column where the effect is largest.');
    for (const [label, haloAlpha, note] of [
      ['was — hairline only', 0, 'A single 0.35px stroke. Watch the four corners step.'],
      ['SHIPPED — hairline + halo', 0.3, 'The soft pass underneath. Same weight to the eye, continuous corners.'],
      ['heavier halo — 0.5', 0.5, 'For reference. Starts to read as a glow rather than an edge, which is the thing to avoid.'],
    ]) {
      plugRowTile(grid, label, `haloAlpha ${haloAlpha} · ${note}`, PLUG_ICONS,
        true, { ...PLUG_FRAME_COLORS, haloAlpha });
    }
  }
}

// ------------------------------------------- credits relay hand-off staging
{
  const grid = section('credits-handoff', 'Credits relay hand-off — bake-off (PAIR ships)',
    'OPEN. The hand-off block between departments in the credits crawl. PAIR is what ships and is here as '
    + 'the control: two figures either side of the portal, which reads as a tableau of the mechanic rather '
    + 'than the mechanic happening. Every candidate calls the same painters the crawl does '
    + '(src/game/credits-handoff.js), so what is on screen here is what would ship. '
    + 'The block is 48u tall at full screen width; these tiles are the same height so the vertical crowding '
    + 'is honest. Progress in the crawl is keyed to the block\'s position ON SCREEN, not to a free clock — '
    + 'a candidate that animates a whole swap plays it out exactly as it scrolls past, which is why A and D '
    + 'are judged on the whole cycle rather than on any one frame. Watch for: does it still read at a '
    + 'glance while scrolling, and does it survive the two dialogue lines sitting directly underneath it.');

  // Lorenzo -> Gnash, the crawl's first hand-off, so the bake-off is judged on
  // a pair the screen actually uses rather than on a flattering one.
  for (const v of HANDOFF_VARIANTS) {
    tile(grid, v.name, v.note, 260, 48, (ctx, t) => {
      const cycle = 3.4;
      v.draw(ctx, {
        from: 'lorenzo', to: 'gnash', t,
        progress: (t % cycle) / cycle,
        x: 0, y: 0, w: 260, h: 48,
      });
    }, { animated: true, wide: true });
  }
}

// The credits sky sections — the far dust plane and the micro-meteor flecks —
// used to sit here. Both settled and came out of the gallery; drawCreditsSky
// still paints what they chose.

// ======================================================================
// THREE ASSETS, REDRAWN — speed ramp, objective flag, relay portal.
// Every candidate is a real painter in sprites/props.js with real cached
// frames (PROP_FRAMES / PROP_FPS / PROP_TALL), so these tiles are running
// the shipping code path at the shipping frame rate, not a preview of one.
// Nothing in src/ points at them yet: picking a winner is a one-line swap.
// ======================================================================

// A strip of a lane to judge against: floor line, dark below, and the hero at
// his real 24u so nothing here can quietly flatter itself on scale.
//
// The box a laneStrip fills is measured in WORLD units, not frame pixels — the
// hero is 24 of them tall, the same 24 the run hands drawToon. Every tile built
// on one therefore passes `world: true`, which is what puts the run's camera in
// front of it on the way to the screen. Without that they were shown at half
// the magnification the game gives them, and a floor effect judged at half size
// is a floor effect judged on the wrong question.
function laneStrip(ctx, w, h, groundY) {
  ctx.fillStyle = '#202838';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#303b4d';
  ctx.fillRect(0, groundY, w, 2);
  ctx.fillStyle = '#17202d';
  ctx.fillRect(0, groundY + 2, w, h - groundY - 2);
}

// The size drawWorldEntity would actually paint a prop at: the 4/3 inflation
// every entity gets, times PROP_TALL, over the def box. Returned alongside the
// box itself so a tile can report the overdraw honestly.
function worldArtSize(boxW, boxH, name) {
  const artH = boxH * propTall(name);
  return {
    boxW, boxH, artH,
    w: Math.round(boxW * 4 / 3),
    h: Math.round(artH * 4 / 3),
  };
}

// Every frame of a candidate, side by side and static. Motion sells a bad
// pose; a strip does not. Drawn at the SAME size as the section's live row on
// purpose — a different size is a different raster, and a twelve-frame portal
// cached twice is 4MB spent to look at the same drawing.
function frameStrip(grid, name, label, note, w, h, cell) {
  const n = propFrames(name);
  tile(grid, label, note, cell * n + 4, h + 8, (ctx) => {
    for (let f = 0; f < n; f++) {
      drawProp(ctx, name, 2 + f * cell + (cell - w) / 2, 4, w, h, f);
    }
  }, { animated: false, hires: 5, wide: true, world: true });
}

// ------------------------------------------------- 1. speed ramp bake-off
{
  const RAMPS = [
    ['boostPadLegacy', 'WAS — the pre-bake-off pad',
      'A 14x4 lozenge with three static chevrons, drawn 19x5. At lane speed it is a yellow smear on the '
      + 'floor: it does not announce itself on the approach and, because nothing about it moves, it never '
      + 'confirms that it fired. This is the thing that was beaten.'],
    ['rampChevron', 'A — black and gold · SHIPS',
      'PICKED. The pad, done properly, and nothing above it: the whole thing is the pad and the whole '
      + 'animation happens inside it. Black and gold is borrowed from D\'s marquee, and it is what fixed '
      + 'the first pass — an orange chevron on a yellow deck is a two-step of the same hue, so at lane '
      + 'speed the pad collapsed into one warm smear and the chase inside it disappeared. Gold on '
      + 'near-black is the widest value gap in the palette, so the chevrons stay separate marks down to '
      + 'the 5px they get on screen. The thrown darts are gone: they read well, but they were art OUTSIDE '
      + 'the pad and above the floor line, on a prop that cannot hurt you. Art dropped 2.4x to 1.7x with '
      + 'them, since that headroom was only ever there to hold them.'],
    ['rampWedge', 'B — launch wedge',
      'Stops being a decal and becomes a RAMP: the silhouette itself says up-and-forward, which is the one '
      + 'thing a flat pad can never do. Treads climb the deck, a cream kick lip caps it, sparks leave the '
      + 'top. The shape survives being seen for a sixth of a second, which is all it gets.'],
    ['rampTurbine', 'C — floor turbine',
      'A machine rather than a marking — it is doing something whether or not anyone is standing on it. '
      + 'The fan turns behind slats and the plume gives it a silhouette ABOVE the floor, which is the part '
      + 'that survives being scrolled past. Watch the fan for strobing: 8 blade positions at 20fps.'],
    ['rampGate', 'D — boost gate',
      'The loud one. Art as tall as the hero, so it is legible from the far edge of the screen and the '
      + 'lane can be committed to early — a marquee, which is the arcade\'s own way of saying THIS WAY. '
      + 'The objection is in the label: 24px of structure over a 4px hitbox is the biggest art-to-box gap '
      + 'in the game. It is only defensible because a boost pad cannot hurt you.'],
  ];

  const grid = section('speed-ramp-bakeoff', 'Speed ramp — bake-off (A ships)',
    'SETTLED: A ships as boostPad, in black and gold, with the darts dropped. The boost pad was the only '
    + 'prop in the lane that GIVES you something and it read as less than a crate. Every candidate keeps '
    + 'the 14x4 hitbox exactly as it is and buys presence on the one axis a floor pad has spare: HEIGHT, '
    + 'through PROP_TALL\'s bottom-anchored overdraw, plus motion. The label on each tile states the art '
    + 'size over that unchanged box. B, C and D are kept drawable as the record of the decision — the '
    + 'gate in particular is the one to come back to if the pad still under-reads in a real run, since it '
    + 'is the only candidate legible from the far edge of the screen.');

  const TW = 122, TH = 54, GY = 44;
  for (const [name, label, note] of RAMPS) {
    const s = worldArtSize(14, 4, name);
    tile(grid, label, `${name} · art ${s.w}x${s.h} over a 14x4 box · ${propFrames(name)}f @ ${propFps(name)}fps<br>${note}`,
      TW, TH, (ctx, t) => {
        laneStrip(ctx, TW, TH, GY);
        const f = Math.floor(t * propFps(name)) % propFrames(name);
        // Same placement drawWorldEntity uses: art centred on the box, bottom
        // on the ground line, box left edge at x.
        drawProp(ctx, name, 66 - (s.w - s.boxW) / 2, GY - s.h, s.w, s.h, f);
        ctx.strokeStyle = 'rgba(246,211,60,0.35)';
        ctx.lineWidth = 0.4;
        ctx.strokeRect(66, GY - s.boxH, s.boxW, s.boxH); // the untouched hitbox
        drawToon(ctx, 'lorenzo', pose('run', t), 30, GY, 24);
      }, { animated: true, hires: 6, wide: true, world: true });
  }
  for (const [name, label] of RAMPS) {
    const s = worldArtSize(14, 4, name);
    frameStrip(grid, name, `${label} · frames`,
      `${name} · every frame, static, at lane size. A chase that does not land on a whole cell stutters at the loop point.`,
      s.w, s.h, 26);
  }
}


// ------------------------------------------------- 3. relay portal bake-off
{
  const PORTALS = [
    ['portal', 'WAS — the shipped portal',
      'Three ellipses: a translucent teal blob, a ring, and a highlight arc. drawPortal() pulses the whole '
      + 'thing 2px on a sine because the art itself does not move. This is the hinge of the entire run — '
      + 'you change HERO through it — and it currently reads as a decal on the backdrop.'],
    ['portalArch', 'A — the gate',
      'A built object: posts, a dome, a real thickness in the reveal, with the energy as a membrane '
      + 'climbing the opening. Reads as ARCHITECTURE — something the arcade installed — which is the most '
      + 'legible thing to run at, and it gives the hero-face signage above it something to hang from.'],
    ['portalRift', 'B — the rift · runner-up',
      'Briefly shipped, then reconsidered. Kept whole because two fixes it forced are worth not losing: '
      + 'its outline is now sampled at eleven points a side and joined by CURVES rather than straight '
      + 'segments (facet length scales with the draw size, curvature does not — at credits scale it read '
      + 'as a stack of slabs), and it carries a dark halo and a dark core surround so a white-hot shape '
      + 'still has something to be seen against on the light packs. '
      + 'No object at all: a tear. White-hot core, teal bleed, a magenta fringe down one edge, and a jagged '
      + 'outline that re-cuts itself every frame. The most "this should not be here" of the four. Check it '
      + 'against a busy background — the thing that makes it good is also what could make it noise.'],
    ['portalRings', 'C — the ring column · SHIPS',
      'PICKED. Live in the run, the tutorial, the credits hand-off and the menu legend. '
      + 'Nine horizontal ellipses whose widths track one shared rotation, so the stack reads as a single '
      + 'surface turning rather than as nine hoops. Pure effect, no housing, and the cheapest of the four '
      + 'to read at true size. Watch the top and bottom rings for the phase wrapping badly.'],
    ['portalTube', 'D — the arcade tube',
      'The fiction, taken literally. MASHENSTEIN is an arcade and the mechanic is called plugging in, so '
      + 'the way through is a screen on a plinth with a cable running out of it: vortex, scanlines, a live '
      + 'LED. The only candidate that could not belong to any other game — and the only one that has to '
      + 'survive a bezel eating a third of its width.'],
  ];

  const grid = section('relay-portal-bakeoff', 'Relay portal — bake-off (C ships)',
    'SETTLED: C, the ring column, ships. See the read test below for how it holds up over every cabinet. '
    + 'All four are drawn into the same narrow '
    + 'column the player has already learned to aim at: the pass-through box stays 12 wide by 40 tall and '
    + 'what changes is entirely what happens INSIDE it. Art is 14x44, a hair proud of the box on every '
    + 'side, which errs toward the portal being slightly easier to hit than it looks. '
    + 'NOTE none of them use drawPortal()\'s 2px height pulse: that pulse exists precisely because the '
    + 'current art is static, and it is not free any more — varying the drawn height re-rasterizes the '
    + 'whole frame set at each new size, so a twelve-frame portal would cache five copies of itself. These '
    + 'move on their own instead. The hero-face plate and the callout the real portal hangs above itself '
    + 'are not drawn here; this row is about the column.');

  const TW = 118, TH = 58, GY = 52, PW = 14, PH = 44;
  for (const [name, label, note] of PORTALS) {
    const isOld = name === 'portal';
    const w = isOld ? 12 : PW, h = isOld ? 40 : PH;
    tile(grid, label, `${name} · ${w}x${h} · ${propFrames(name)}f @ ${propFps(name)}fps<br>${note}`,
      TW, TH, (ctx, t) => {
        laneStrip(ctx, TW, TH, GY);
        const f = Math.floor(t * propFps(name)) % propFrames(name);
        // The shipped portal has no frames of its own, so it keeps the 2px
        // sine drawPortal() gives it — otherwise the control would be judged
        // more still than it actually is.
        const pulse = isOld ? Math.round(Math.sin(t * 5) * 2) : 0;
        drawProp(ctx, name, 62, GY - h - pulse, w, h + pulse, f);
        ctx.fillStyle = '#48e0c8';
        ctx.fillRect(62 + w / 2 - 2, GY - 2, 4, 2); // the contact mark, as drawn in-run
        drawToon(ctx, 'lorenzo', pose('run', t), 26, GY, 24);
      }, { animated: true, hires: 5, wide: true, world: true });
  }
  for (const [name, label] of PORTALS) {
    if (name === 'portal') continue; // one frame; the strip would be one cell
    frameStrip(grid, name, `${label} · frames`,
      `${name} · every frame, static. Look for a frame the loop jumps at.`, 14, 44, 22);
  }
}

// ------------------------------------------- 3b. portal read test (ships: B)
// The bake-off row judged the four drawings against each other on a flat grey
// lane. That is the right way to compare them and the wrong way to accept one:
// the rift is a white-hot shape with a magenta fringe, and the only question
// left is whether it still reads as A WAY THROUGH over nine backgrounds it was
// never drawn against — including the doodle sheet, which is nearly white.
{
  const grid = section('portal-read-test', 'Relay portal — read test (over every cabinet)',
    'The shipped portal standing in every stage it can appear in, drawn by the same drawPortal() the run '
    + 'calls, over each pack\'s real bg() + ground(). TOP a cropped band of the frame; BOTTOM the whole '
    + '480x270 frame, both through the run camera and both presented at the screen scale, which is the '
    + 'only view that answers the question — a portal that needs magnifying to find is a portal that '
    + 'failed. '
    + 'This row is why the rift grew a dark halo before it was set aside: over the doodle sheet and the '
    + 'frost sky its white core simply disappeared. The ring column has the opposite risk — it is mostly '
    + 'teal, and teal is the game\'s own accent, so watch whether it separates from the neon pack and from '
    + 'anything else already using it.');

  // A band of a real stage, assembled the way run.js assembles a frame — which
  // it did NOT used to be. bg() is a screen-space painter and goes down flat;
  // ground(), the portal and the hero are world-space and go through
  // applyWorld(), so the camera magnifies them by ZOOM exactly as the run does.
  // Without that transform every one of these tiles drew the world at 1:1 and
  // the "true size" claim on the full-frame row was out by a factor of two on
  // top of the CSS pin — the portal was being judged at a quarter of its real
  // area. applyWorld pins world GROUND_Y to frame y 232 at every zoom, so the
  // band's floorY shift lands the groundline where the crop wants it.
  //
  // Positions are world px now (they were frame px), because that is what the
  // painters take once the camera is in front of them.
  const BAND_W = 150, BAND_H = 76, BAND_FLOOR = 60;
  function stageBand(ctx, cab, t, portalX, heroX, w, h, floorY) {
    const style = getStylePack(cab.style, {});
    // World x, spaced so nothing collides with the portal in EITHER crop: in
    // the band the crate sits off the right edge, in the full frame it lands
    // between the hero and the portal.
    const obstacles = [makeObstacle('crate', 90), makeObstacle('barrel', 200)];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.translate(0, floorY - GROUND_Y);
    if (style.bg) style.bg(ctx, t, t * 60, cab, 1000);
    ctx.save();
    applyWorld(ctx, WORLD_Z, 0);
    if (style.ground) style.ground(ctx, t * 60, cab, obstacles);
    drawPortal(ctx, { x: portalX, hero: 'gnash' }, 0, t, 1, true, {});
    drawToon(ctx, 'lorenzo', pose('run', t), heroX, GROUND_Y, 24);
    ctx.restore();
    if (style.post) style.post(ctx, t);
    ctx.restore();
  }

  for (const cab of CABINETS) {
    tile(grid, cab.id, `${cab.style} · ${PORTAL_SPRITE} · ${BAND_W}x${BAND_H} crop of the frame`,
      BAND_W, BAND_H, (ctx, t) => {
        stageBand(ctx, cab, t, 50, 16, BAND_W, BAND_H, BAND_FLOOR);
      }, { animated: true, hires: 6, wide: true });
  }

  // The whole frame, at the scale a desktop presents it. This is the real read:
  // if the portal cannot be found here it has failed, and no amount of
  // magnification in the row above changes that.
  for (const cab of CABINETS) {
    tile(grid, `${cab.id} — full frame`, `${cab.style} · the whole 480x270 frame, hero on his real mark`,
      W, H, (ctx, t) => {
        stageBand(ctx, cab, t, 150, PLAYER_X, W, H, GROUND_Y);
      }, { animated: true });
  }
}

// ------------------------------------------------ 3c. portal aftermath
// What the portal does once it has been REACHED. Until now it did nothing: on
// contact the entity was nulled and the whole column vanished between one frame
// and the next, and a portal you jumped over scrolled away looking exactly like
// one you could still take. Two strips fix both — see portalRingsArt.
{
  const grid = section('portal-aftermath', 'Relay portal — aftermath (spend + wilt)',
    'TOP the two events at true size on a lane, looping: live column, the moment of contact, and what is '
    + 'left afterwards. A SPEND opens on a one-frame white blowout and then drags the hoops down into the '
    + 'slot, leaving the plinth dark — the hardware stays, the light is gone. The three hoops that come '
    + 'FORWARD out of the stack in the run are particles thrown by RunState.portalDischarge and are not in '
    + 'these tiles; a cached sprite cannot follow something that has left its own box. '
    + 'A WILT is the miss: no flash, nothing discharges, the column just sags toward the plate and dims '
    + 'while the plinth stays mostly lit. '
    + 'The question for both is whether they read at speed and from the corner of the eye, and whether '
    + 'they read as DIFFERENT from each other — a wilt that looks like a faint spend teaches that you '
    + 'half-tagged. BOTTOM every frame of each strip, static, so the collapse can be checked for a step '
    + 'that jumps. Note the wilt is a sixth of a second longer than the spend: a missed portal has about '
    + 'half a second of screen time behind the hero, and it should still be moving for most of it.');

  const TW = 118, TH = 58, GY = 52;
  const EVENTS = [
    ['spend', PORTAL_SPENT_SPRITE, PORTAL_SPEND_TIME, 'SPEND — a hero went through',
      'Contact at t=0.9s of the loop. Watch the blowout frame: it is one frame, and it has to land ON the '
      + 'crossing rather than after it, which is why the strip starts with it rather than building to it.'],
    ['wilt', PORTAL_WILT_SPRITE, PORTAL_WILT_TIME, 'WILT — a hero went over the top',
      'The hero clears it at t=0.9s. This is the only feedback a missed tag has ever had.'],
  ];
  const LOOP = 2.4;
  for (const [key, sprite, time, label, note] of EVENTS) {
    tile(grid, label, `${sprite} · ${propFrames(sprite)}f over ${time}s<br>${note}`, TW, TH, (ctx, t) => {
      laneStrip(ctx, TW, TH, GY);
      const loop = t % LOOP;
      const since = loop - 0.9;
      // drawPortal is given the same entity shape the run gives it, so the
      // tile cannot drift from the game: the state IS the two fields.
      const portal = { x: 0, hero: 'gnash' };
      if (since >= 0) portal[key === 'spend' ? 'spent' : 'wilt'] = since;
      ctx.save();
      ctx.translate(0, GY - GROUND_Y);
      drawPortal(ctx, { ...portal, x: 62 }, 0, t, 1, true, {});
      ctx.restore();
      // The hero, arriving on the same clock: through the column on a spend,
      // over the top of it on a wilt.
      const hx = 26 + (loop / LOOP) * 76;
      const jump = key === 'wilt' ? Math.max(0, Math.sin((loop - 0.55) * 2.6) * 46) : 0;
      drawToon(ctx, 'lorenzo', pose(jump > 1 ? 'jump' : 'run', t), hx, GY - jump, 24);
    }, { animated: true, hires: 5, wide: true, world: true });
  }
  for (const [, sprite, , label] of EVENTS) {
    frameStrip(grid, sprite, `${label} · frames`,
      `${sprite} · every frame, static, left to right. The last frame is what rests on screen.`, 14, 44, 22);
  }
}

// ------------------------------------------- 1b. "we are speeding up" bake-off
{
  const grid = section('boost-fx-bakeoff', 'Boost pad — "we are speeding up" bake-off',
    `SETTLED: C+B with TAPERING chevrons ships — the ground rush carrying it, a quieter version of the `
    + `trail underneath, and each chevron shrinking as it falls behind. `
    + `${BOOST_FX_VARIANTS.length - 2} earlier candidates plus the control are kept drawable as the record. Each is drawn by the same `
    + 'game/boostFx.js the run calls, at the same 24px hero and the same lane speed. The question is only '
    + 'this: without the pad in shot, does the frame say YOU ARE GOING FASTER? '
    + 'The control is the first tile and it is what shipped first — loose rectangles with no taper, no '
    + 'vanishing point and nothing attached to them, which is why they read as HUD that escaped onto the '
    + 'field rather than as motion. '
    + 'Judge them at true size with the hero. '
    + 'ONE ROW ONLY now that it is settled: the slope check and the three light-pack rows are gone — '
    + 'they were the rows that decided it, and a decided question does not need 42 tiles standing over '
    + 'it. What is left is the comparison itself, kept for reference.');

  const TW = 150, TH = 60, GY = 48, HX = 84;
  const heroPose = (t) => pose('run', t, { lean: 0.17 });
  for (const v of BOOST_FX_VARIANTS) {
    tile(grid, v.name, `${v.id}<br>${v.note}`, TW, TH, (ctx, t) => {
      laneStrip(ctx, TW, TH, GY);
      // Loops the effect's own 0.5s life on a 1.4s cycle, so each tile shows
      // the whole decay rather than freezing at full strength — an effect that
      // only looks right at q=1 is an effect that flashes and vanishes.
      const cycle = (t % 1.4) / 1.4;
      const q = cycle < 0.36 ? 1 - cycle / 0.36 : 0;
      if (q <= 0) {
        drawToon(ctx, 'lorenzo', pose('run', t), HX, GY, 24);
      } else {
        v.draw(ctx, {
          x: HX, groundY: GY, t, q, w: TW, h: TH,
          drawHero: () => drawToon(ctx, 'lorenzo', heroPose(t), HX, GY, 24),
          drawHeroAt: (gx, gy, alpha) => drawToon(ctx, 'lorenzo', heroPose(t), gx, gy, 24, { alpha }),
        });
      }
    }, { animated: true, hires: 5, smooth: true, wide: true, world: true });
  }

}

// ------------------------------------------- 1c. finish marker
// The end of every stage: the pole, the plunger and the box. SETTLED, and the
// alternates are gone with the bake-off that rejected them — what is left is the
// shipped marker and the one behaviour worth re-checking whenever the payoff is
// touched (CLUNK). FINISH_MARKER_VARIANTS still holds the losers if the question
// is ever reopened.
{
  const grid = section('finish-marker', 'Finish marker — the payoff, scored and clunked',
    'D1b, what ships: the trigger taken out of the box and stood at the foot of the pole as a plunger, the '
    + 'box moved clear to the right with nothing on it to touch, and a cable joining them. '
    + '<b>Row 1</b> is the marker running its full payoff — push, spark along the cable, lamps, current up '
    + 'the pole, flag. '
    + '<b>Row 2 (CLUNK)</b> is the player who never jumps and just runs into the pole: the stage still '
    + 'clears, so the fiction still has to resolve, and only the amount of celebration changes. That pair '
    + 'is the whole reason the section is still here — the difference has to read as "worth less", never '
    + 'as "did not work".');

  // A full flip, looped. The approach is deliberately the long half — it is
  // most of what a player actually sees of this object.
  const CYCLE = 4;
  const THROW_AT = 2.4;
  const beat = (t) => {
    const c = t % CYCLE;
    const raw = c < THROW_AT ? 0 : Math.min(1, (c - THROW_AT) / 0.18);
    return {
      t, thrown: raw * raw * (3 - 2 * raw), live: true, armed: c < THROW_AT,
      reducedMotion: false, phase: c,
    };
  };

  const TW = 132, TH = 118, GY = 108, FX = 56;
  const runIn = (ctx, t, s, toX) => {
    const run = Math.min(1, (s.phase / THROW_AT) ** 1.4);
    drawToon(ctx, 'lorenzo', pose('run', t, { lean: 0.14 }), 8 + run * toX, GY, 26);
  };

  // ---- the marker, running its payoff --------------------------------------
  for (const id of ['plunger']) {
    const v = FINISH_MARKER_BY_ID[id];
    if (!v) continue;
    tile(grid, `SHIPPED · ${v.name}`, `${id}<br>${v.note}`, TW, TH, (ctx, t) => {
      laneStrip(ctx, TW, TH, GY);
      const s = beat(t);
      v.draw(ctx, FX, GY, s);
      if (s.armed) runIn(ctx, t, s, 34);
      else drawToon(ctx, 'lorenzo', pose('jump', t), FX - 4, GY - 22, 26);
    }, { animated: true, hires: 5, smooth: true, wide: true, world: true });
  }

  // ---- CLUNK ---------------------------------------------------------------
  // Nothing forces the jump — the finish dash carries the hero to the pole under
  // its own power — so a player who holds still runs into the base and shoulders
  // the lever over. That is a CLUNK, worth zero points, and the stage clears.
  //
  // Which means the power came back, which means the flag has to fly. A cleared
  // stage that leaves the flag dead would be the marker calling the player a
  // failure for finishing the level. So the grade lives in HOW MUCH the payoff
  // celebrates, never in whether the fiction resolves at all.
  for (const id of ['plunger']) {
    const v = FINISH_MARKER_BY_ID[id];
    if (!v) continue;
    tile(grid, `CLUNK · ${v.name.split('—')[0].trim()} — ran across, never jumped`,
      `${id} with live=false. Power returns and the flag raises, plainly — no surge, no sparks, cloth two `
      + 'thirds slower. Compare against the same tile in row 1: the difference has to read as "worth less", '
      + 'never as "did not work".',
      TW, TH, (ctx, t) => {
        laneStrip(ctx, TW, TH, GY);
        const s = beat(t);
        v.draw(ctx, FX, GY, { ...s, live: false });
        if (s.armed) runIn(ctx, t, s, 38);
        else drawToon(ctx, 'lorenzo', pose('run', t, { lean: 0.2 }), FX - 14, GY, 26);
      }, { animated: true, hires: 5, smooth: true, wide: true, world: true });
  }

}

// ------------------------------------------- 1c-ii. the cling, per hero
// The pose the whole finish mechanic rests on. It used to be the JUMP pose
// standing in — a hero with nothing in his hands, sliding down a pole he was
// visibly not holding — and it was the outstanding art debt on the marker.
{
  const grid = section('finish-cling', 'Finish cling — the pole ride, per hero',
    'Every playable hero running the whole finale on the REAL marker, on a loop: catch the pole, ride it '
    + 'down, land on the plunger, celebrate. Not a pose sheet — the marker art, the plunger travel and '
    + 'the hero are all the shipping code at the shipping size, so what these tiles are actually testing '
    + 'is the ALIGNMENT. Two things to watch on each one: the hand has to land on the mast, and the feet '
    + 'have to land in the middle of the cap. '
    + 'Gary and Dolores are not here — they work the shop and the serving line, will never run a stage '
    + 'and so will never touch a finish marker. '
    + '<br><br>The pose starts as the hero\'s own IDLE with the pole-side arm reaching out to take the '
    + 'mast — and then it DEVELOPS down the ride instead of switching on whole at the catch. The legs '
    + 'borrow the celebration hop\'s bent-knee shape: near-straight at the catch, drawing up as the cap '
    + 'approaches — a person gathering their legs to meet the ground — and extending into the touchdown, '
    + 'so the ride lands in the very shape the celebration starts from. The smile grows the same way, '
    + 'from a grin at the catch to the full whoop at the bottom (Grumpos\'s beard-grin, which has no size '
    + 'to grow, starts partway down instead). Both ride one number: the run\'s own descent progress. '
    + 'Front-on throughout, because the celebration is front-on — a hero who rides down in profile and '
    + 'lands facing you would swap bodies on the last frame. '
    + '<br><br>And the MARKER wears the offset, not the hero. The mast stands one hero-reach right of the '
    + 'plunger, so he rides the whole way down already centred on the cap he is about to land on — where '
    + 'before, the two shared a centre line and he had to shuffle sideways between the ride and the '
    + 'payoff. Mochi, Chompo and Raymn are the exception: no arms, so they hold the pole with their whole '
    + 'body and step out to it, which is the only shuffle left in the sequence.');

  // The full finale on a loop: run in, catch, ride, land, payoff, hold.
  const CTW = 122, CTH = 132, CGY = 120, CFX = 52;
  const RIDE_AT = 1.5, RIDE_FOR = 0.9, HOLD = 2.6;
  const CCYCLE = RIDE_AT + RIDE_FOR + HOLD;
  const clingBeat = (t) => {
    const c = t % CCYCLE;
    const ride = Math.max(0, Math.min(1, (c - RIDE_AT) / RIDE_FOR));
    // Same shape the run drives: the grab comes on fast because a catch is an
    // event, and it lets go over the last of the ride as the feet find the cap.
    const cling = Math.min(1, ride / 0.14) * (1 - Math.max(0, (ride - 0.86) / 0.14));
    const raw = c < RIDE_AT + RIDE_FOR ? 0 : Math.min(1, (c - RIDE_AT - RIDE_FOR) / 0.18);
    return {
      c, ride, cling, running: c < RIDE_AT,
      thrown: raw * raw * (3 - 2 * raw), live: true, armed: c < RIDE_AT + RIDE_FOR,
      t, reducedMotion: false,
    };
  };
  for (const id of ['lorenzo', 'gnash', 'fernwick', 'b33p', 'grumpos', 'mochi', 'chompo', 'raymn']) {
    tile(grid, `${id} — the whole finale`,
      'Catch, ride, land, celebrate. Watch the hand against the mast and the feet against the cap.',
      CTW, CTH, (ctx, t) => {
        laneStrip(ctx, CTW, CTH, CGY);
        const s = clingBeat(t);
        FINISH_MARKER_BY_ID.plunger.draw(ctx, CFX, CGY, s);
        // The hero stands on the cap itself, so his feet ride plungerStandY —
        // he bounces with the thing he is standing on rather than hovering
        // while it moves under him, exactly as run.js seats him.
        const seat = CGY - plungerStandY(s.thrown);
        if (s.running) {
          const run = Math.min(1, (s.c / RIDE_AT) ** 1.4);
          drawToon(ctx, id, pose('run', t, { lean: 0.14 }), 6 + run * (CFX + PLUNGER_CX - 6), CGY, 24);
        } else {
          // The descent: he catches high and comes down accelerating onto the
          // cap, which is a fall with a hand on a pole rather than a lift being
          // lowered — the same easing the slide uses.
          const drop = s.ride * s.ride;
          const y = s.armed ? seat - (1 - drop) * 46 : seat;
          drawToon(ctx, id, {
            kind: s.armed ? 'jump' : 'celebrate', grounded: !s.armed, vy: 90,
            time: t, phase: 0, facing: 1, cling: s.cling, clingRide: s.ride,
          }, CFX + PLUNGER_CX, y, 24);
        }
      }, { animated: true, hires: 5, smooth: true, wide: true, world: true });
  }
}

// The breaker box shape bake-off used to sit here. The shape was picked and
// the section came out of the gallery; BREAKER_BOX_VARIANTS still holds them.

// The contour taper bake-off used to sit here. 0.5 shipped and the section
// came out of the gallery; CONTOUR in toons.js still carries the exponent.

// ------------------------------------------- new hero: raider bake-off (lab)
// A cast CANDIDATE, not cast. Nothing here is registered in TOON_SPECS or
// HERO_SPRITES — the specs and palettes live in src/dev/hero-candidates.js and
// are handed to the shipped painter through drawToon's spec/pal seam, so a look
// nobody has picked yet cannot leak into the roster every production section
// above enumerates. Pick one and it moves the other way: into TOON_SPECS, into
// HERO_SPRITES with a pixel grid, into HEROES — and this section comes out.
{
  const grid = section('raider-bakeoff', 'New hero — raider heroine, five cuts',
    'GALLERY ONLY. One character, five treatments, on the SHIPPED humanoid rig: same gait, same ink, '
    + 'same light, same two-bone limbs as Lorenzo and Gary. Everything that differs is a flag the rig '
    + 'already reads plus the gear pieces added beside them (three long-hair cuts, bare arms, gloves, '
    + 'belt, bandolier, crossed harness, open jacket, cropped top, shorts, thigh and hip holsters, boot '
    + 'shafts, and one or two pistols in the hands). A look bake-off can only answer "which look" if the '
    + 'answer is not also contaminated by "which rig". '
    + '<br><br>Two groups. <b>A / B / C are the COVERED reads</b> — full-length trousers into tall boots. '
    + '<b>D and E come from the references</b>: D is the 3D chibi figurine taken head-on (turquoise crop '
    + 'tank, bare midriff, brown shorts, bare thigh, plait, twin holsters, big brass buckle) with squat '
    + '<code>stout</code> proportions and TWIN pistols on the power move; E is the 2D vector Lara '
    + '(charcoal sleeveless tank, crossed harness straps, wide belt, olive cargo trousers, knee-high '
    + 'boots, streaming ponytail) — sleeveless but covered, the middle ground. '
    + '<br><br>What to watch on the skin builds: at hero size a bare leg and a trouser leg differ by one '
    + 'colour, so D has to earn its lower silhouette from the boot line and the shorts hem, and the '
    + 'buckle has to be big enough to break the column of skin down the middle — that is why it is at '
    + '1.35x and the crop hem carries its own line. And the <b>turquoise</b>: three heroes already own it '
    + '(Lorenzo #2ea8a0, Ray M\'n #28a8a0, Dolores #6fa89c), so a fourth is a collision rather than a '
    + 'homage. A takes it deep and cool, D at reference strength, B goes field olive, C oxblood, E '
    + 'charcoal. The "beside the cast" tile below is where that gets settled. '
    + '<br><br>What all five keep, because this is one character in five cuts and not five characters: '
    + 'her face, her skin, her auburn hair, brass hardware, boots, and a gun on her hip.');

  const CANDS = RAIDER_CANDIDATES;
  const opts = (c) => ({ spec: c.spec, pal: c.pal });
  // Shared with the fighter section below — same tiles, same clock, so the two
  // proposals are looked at on identical terms.
  window.__candidateTiles = { opts };
  // The power move, through the same poseFromPlayer fields a run would hand the
  // painter (powerupExtra), on useAbility's own 0.3s countdown — so this is
  // what a run shows and not a pose sheet.
  //
  // The CLOCK is the one thing that differs from the production power-up tiles.
  // Those run the real 1.4s cooldown, which spends 1.1s of every cycle back in
  // a plain run — correct for an ability reference, useless for a tile whose
  // entire question is whether the shot reads. This fires every 1.1s and holds
  // the arm out between shots, so the pose is on screen almost all the time.
  const RAIDER_SHOT = 1.1;
  const raiderPose = (kind, t) => (kind === 'power'
    ? pose('run', t, powerupExtra('shoot', Math.min(0.3, t % RAIDER_SHOT)))
    : pose(kind, t, {}));

  // One tile per POSE with all three candidates in it, rather than one tile per
  // candidate: the comparison this section exists to make is A-against-B-against-C
  // at the same instant, and that only works if they are adjacent and on the
  // same clock.
  const RH = 62, RCOL = 82, RFEET = 92;
  for (const [kind, note] of [
    ['idle', 'Standing. The read to check first — it is the hub, the stage select and every menu.'],
    ['run', 'The pose she is in for 95% of a stage. Hair swings on the stride clock.'],
    ['power', 'The shot: pistol out of the holster it was in a frame ago, muzzle flash on the frame it fires, recoil recovering over the same 0.3s the run gives the pose.'],
    ['jump', 'Airborne. Watch the hair against the raised knee.'],
    ['duck', 'Crouched. The plait tucks over her shoulder here — at its standing length the tie ends up through the floor.'],
  ]) {
    tile(grid, `raider — ${kind}`, note, RCOL * CANDS.length, RH * 1.62, (ctx, t) => {
      CANDS.forEach((c, i) => {
        drawToon(ctx, c.id, raiderPose(kind, t), RCOL * (i + 0.5), RFEET, RH, opts(c));
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '6px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, RCOL * (i + 0.5), RH * 1.55);
      });
    }, { animated: true, wide: true, hires: 4 });
  }

  // The HUD cell. Every hero owns one, it is the smallest thing their design has
  // to survive, and a cut that only works at full height is not a cut.
  tile(grid, 'raider — face crops', 'drawToonFace(), the size the HUD and the portal crop actually use.',
    RCOL * CANDS.length, 54, (ctx) => {
      CANDS.forEach((c, i) => {
        drawToonFace(ctx, c.id, RCOL * i + 14, 2, 44, 44, opts(c));
        ctx.fillStyle = '#8a8a9e';
        ctx.font = '6px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, RCOL * (i + 0.5), 50);
      });
    }, { animated: false, wide: true, hires: 6 });

  // The question no amount of studying her alone can answer: does she belong to
  // this cast? Same size, same pose, same clock as four heroes who already
  // shipped — which is also where a palette collision shows up, since the teal
  // in A is one hero away from Lorenzo's here.
  const CAST_ROW = ['lorenzo', 'gnash', 'fernwick', 'grumpos'];
  tile(grid, 'raider — beside the cast', 'Four shipped heroes and every candidate, same size and pose. '
    + 'Watch for a candidate that reads as a different game, and for A\'s teal against Lorenzo\'s.',
    RCOL * (CAST_ROW.length + CANDS.length), RH * 1.62, (ctx, t) => {
      const row = [
        ...CAST_ROW.map((id) => [id, null, id]),
        ...CANDS.map((c) => [c.id, c, c.name]),
      ];
      row.forEach(([id, cand, label], i) => {
        drawToon(ctx, id, pose('idle', t), RCOL * (i + 0.5), RFEET, RH, cand ? opts(cand) : {});
        ctx.fillStyle = cand ? '#c8b98a' : '#7a7a8e';
        ctx.font = '6px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, RCOL * (i + 0.5), RH * 1.55);
      });
    }, { animated: true, wide: true, hires: 4 });

  // ...and the size she is actually PLAYED at. Everything above is a study;
  // this is the tile that decides it. Real lane, real 24px hero, real camera
  // magnification — a look that only reads on the study row does not read.
  {
    const LW = 24 + CANDS.length * 62 + 40, LH = 62, LGY = 46;
    tile(grid, 'raider — in the lane, at size',
      `Real ${HERO_DRAW_H}px hero through the run's own camera. Running and firing, side by side.`,
      LW * WORLD_Z, LH * WORLD_Z, (ctx, t) => {
        ctx.scale(WORLD_Z, WORLD_Z);
        laneStrip(ctx, LW, LH, LGY);
        CANDS.forEach((c, i) => {
          const x = 24 + i * 62;
          drawToon(ctx, c.id, raiderPose('run', t), x, LGY, HERO_DRAW_H, opts(c));
          drawToon(ctx, c.id, raiderPose('power', t), x + 26, LGY, HERO_DRAW_H, opts(c));
        });
      }, { animated: true, wide: true, world: true, hires: 5 });
  }
  window.__candidateTiles.raiderPose = raiderPose;
}

// The martial-artist bake-offs used to sit here — first her LOOK, then her whole
// HEAD. Both are settled and shipped: split skirt and blue, then jaw-length hair, a
// W cut into the hairline with hair piled on the crown, two ribbon cut ends per bun
// beside the long tails, a gold band on the bun/hair join, ears with studs, and
// brows in her own hair rather than the face ink. All of it is in TOON_SPECS.kiko
// and HERO_SPRITES.kiko now, so every production section above draws her with it
// and a lab comparison would only be quoting decisions back.
//
// The painter pieces stay in toons.js: `head: 'buns'`, `dress: 'split'`, `puffs`,
// `bracers`, `kiblast`, `waistRise`, plus HAIR_CUTS, FRINGES and BUN_STUBS. What is
// NOT still in there is the losing options — three fringe shapes, two hair lengths,
// three stub sets — because each was a second copy of a path that the winner's
// construction would now have to be maintained alongside. docs/notes/kiko-persona.md
// is the record of what they were and why they lost.

// The duck-replacement bake-off used to sit here — four candidates for
// Lorenzo (the shipped crouch, a tuck roll, the power slide, a belly dive),
// then the winning POWER SLIDE mocked across five builds with per-hero
// garments. It is settled and SHIPPED: poseFromPlayer sets duckStyle 'slide'
// on every humanoid rig's duck, the tip-back arrival rides the 0.14s duck
// blend, and the production sections above draw it wherever a duck appears
// (see duckExtra). The slide painter (drawDuckSlide + duckTorsoCapsule) lives
// in toons.js; the tuck-roll and belly-dive painters stay there too, out of
// the running. Still open, and why a lab section may return: the non-humanoid
// rigs (B-33P, Mochi, Chompo, Ray M'n) keep the crouch and need their own
// treatment, and hero gear (Fernwick's shield, Gnash's tail) is not in the
// slide yet.

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
// A world-unit tile owes its content the run's camera on top of the screen
// scale, because that is the order the game does it in: world units are
// magnified by ZOOM into the 480x270 frame, and the frame is then presented at
// the screen scale. Everything else is already in frame pixels.
function applyZoom() {
  for (const t of tiles) {
    const s = zoom * (t.world ? WORLD_Z : 1);
    t.canvas.style.width = (t.w * s) + 'px';
    t.canvas.style.height = (t.h * s) + 'px';
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

// Nearest-neighbour across every tile. The game presents its frame smoothly, so
// this is an inspection aid — "show me the samples" — not a preview of the run.
const pixelateEl = document.getElementById('pixelate');
pixelateEl.addEventListener('change', () => {
  document.body.classList.toggle('pixelate', pixelateEl.checked);
});

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
// Full-frame tiles used to be pinned here to 480x270 CSS px and called "true
// screen size". They were nothing of the kind: nobody has ever played this game
// at 1:1. A desktop presents that frame at three to five times the size, so a
// pinned tile was showing the whole composition at a third of its real read —
// which is exactly the flattery this page exists to avoid. They follow the
// screen scale with everything else now.
