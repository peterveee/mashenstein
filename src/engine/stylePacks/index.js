import { efficiencyProfile } from '../render-efficiency.js';
// Style packs: renderer-only modules. One draw interface, zero game logic.
// Every pack draws: bg(ctx,t,camX,cab,totalDist,scene),
// ground(ctx,camX,cab,obstacles), post(ctx,t). `scene` is optional renderer
// context: most packs ignore it, while LCD reads the rhythm stage and heard
// beat without importing game or audio state into this renderer-only module.
// Hitboxes/timings are style-independent; reduced flashing tames effects.
//
// `lightBg: true` opts a pack out of the GPU scene bloom. The bloom bright-pass
// (glfx.js FS_BRIGHT) keeps anything above ~0.8 luma, and the final composite
// adds it back at 0.45 — so a pale sky or paper background qualifies almost
// everywhere, gets ~1.4x its own value, and clips to flat white, erasing the
// linework and parallax layers drawn on it. Bloom cannot be threshold-tuned out
// of this: a coin (#f6d33c) sits at 0.80 luma, BELOW a pastel sky at 0.92, so no
// cutoff separates "bright detail" from "bright background". Light packs opt out
// wholesale instead; their art carries its own drawn highlights.
import { H, W, bakeSS, onPresentationChanged } from '../renderer.js';
import { GROUND_Y, ZOOM, PAN_MAX } from '../camera.js';
import { backgroundParallaxOffset } from '../scenery-layout.js';
import { glowSprite } from '../../sprites/props.js';
// The 5x7 pixel font's raw rows. The LCD panel lays its own cells, so it takes
// the letterforms and not the blitter — see lcdSkyBanner.
import { drawTextVectorCentered, pixelGlyph, textYForMid, textWidth } from '../sprites.js';
// What lies at the bottom of a hole, when the cabinet names one. A pack draws a
// gap by not drawing; the fill is the other half of that bargain.
import { drawPitFill } from '../../game/pitFill.js';
import { neonBladeSign, NEON_SIGN_WORDS, NEON_BACK_SIGN_WORDS } from '../kana.js';
import { terrainGroundY } from '../../game/terrain.js';
import {
  drawDesertPumpjacks, drawDesertSpeedTrap, drawDesertJet, drawDesertCoyote,
  drawDesertDustDevil, drawDesertTumbleweed,
} from './desertLandmarks.js';
import { drawDesertHorizonProp, isDesertHorizonProp } from './desertHorizonProps.js';
import {
  drawPlumberBarn, drawPlumberWindmill, drawPlumberBalloon, drawPlumberSheep, drawPlumberPatchwork,
} from './plumberLandmarks.js';
import {
  PLUMBER_BUSH_TYPES, PLUMBER_BUSH_LAYERS, plumberBushSeed, paintPlumberBushLayer,
  blitPlumberBushSprite, drawPlumberRobinHedge, plumberRobinShowT,
} from './plumberBushes.js';
import {
  PLUMBER_HOUSE_TYPES, PLUMBER_HOUSE_BODIES, paintPlumberHouseBody, drawPlumberHouseLive,
} from './plumberHouses.js';
import {
  drawFrostChairLift, frostLiftX, FROST_LIFT_AT_PX, drawFrostReindeer, FROST_HERD_WINDOW,
} from './frostLandmarks.js';
import { drawFrostWildlife } from './frostWildlife.js';
import { frostFortressShape } from './frostFortresses.js';
import { FROST_COMBINED_SCENERY_FINISH } from './frostSceneryFinish.js';

import {
  PAPER_MATERIALS,
  PAPER_TEXTURE_BLEND,
  paperTextureSource as sharedPaperTextureSource,
  paperPatternFor as sharedPaperPatternFor,
  anchorPaperPattern,
  paperShadowPass as sharedPaperShadowPass,
  paperFinishPass as sharedPaperFinishPass,
  PAPER_TEXTURE_SPEED_DEFAULT,
  paperTextureCameraX,
  paperTextureSpeedOf,
  paperStrengthsOf,
} from '../paper-material.js';
import { drawSoftContactShadow } from '../shadows.js';

// Every layer back here scrolls a FRACTION of the foreground, and the camera now
// magnifies that foreground — so each parallax factor is scaled by the same
// amount to keep the depth ratio the run was tuned with. Without it the world
// races past a backdrop that has effectively frozen. Layer sizes are untouched:
// the groundline these layers hang off does not move at any zoom. ZOOM is a live
// camera binding; do not snapshot it at module load because portrait rewrites it.

function backgroundY(context, layer) {
  return backgroundParallaxOffset(context?.cameraShiftY, layer);
}

function sceneryBandY(context, bandName, fallback) {
  const band = context?.sceneryLayout?.bands?.[bandName];
  return Number.isFinite(Number(band?.center)) ? Number(band.center) : fallback;
}

// Return the centre of a band while keeping a finite-sized sky object inside
// it whenever the band is large enough.  A band describes the object's visible
// envelope, not just the point at which its painter happens to be anchored;
// using the raw centre for an 80px sun made its halo/rays visibly escape above
// the celestial diagnostic range on short portrait frames.
function sceneryBandPointY(context, bandName, fallback, extent = 0) {
  const band = context?.sceneryLayout?.bands?.[bandName];
  if (!band || !Number.isFinite(Number(band.top))
    || !Number.isFinite(Number(band.bottom))
    || !Number.isFinite(Number(band.center))) return fallback;
  const radius = Math.max(0, Number(extent) || 0);
  const lo = Number(band.top) + radius;
  const hi = Number(band.bottom) - radius;
  const center = Number(band.center);
  if (lo > hi) return center;
  return Math.max(lo, Math.min(hi, center));
}

const DESERT_SUN_RADIUS = 40;

function sceneryRidgeBaseY(context, bandName, amplitude, fallback = GROUND_Y) {
  if (!context?.sceneryLayout) return fallback;
  return sceneryBandY(context, bandName, fallback - amplitude) + amplitude;
}

function portraitCloudY(context, index, fallback) {
  const bands = context?.sceneryLayout?.bands;
  if (!bands) return fallback;
  const names = ['upperCloud', 'upperCloud', 'middleCloud', 'middleCloud',
    'upperCloud', 'lowerCloud', 'middleCloud', 'lowerCloud'];
  const band = bands[names[index % names.length]] || bands.middleCloud;
  if (!band) return fallback;
  const spread = Math.min(band.height * 0.35, 18);
  return band.center + ((index % 3) - 1) * spread;
}

// The playable preview may audition a portrait-only cloud lift without
// changing authored terrain or production scenery. Production and landscape
// paths stay at zero; negative values move the sky layer upward.
function portraitCloudOffset(context = null) {
  if (context?.sceneryLayout) return 0;
  const n = Number(context?.cloudOffsetY);
  return Number.isFinite(n) ? Math.max(-100, Math.min(60, n)) : 0;
}

function portraitSunOffset(context = null) {
  if (context?.sceneryLayout) return 0;
  const n = Number(context?.sunOffsetY);
  return Number.isFinite(n) ? Math.max(-100, Math.min(60, n)) : 0;
}

// Portrait has substantially more sky above the playable groundline than the
// landscape frame. Lift the mountain/terrain backdrop into that space while
// leaving the authored lane, hero and touch controls on their existing anchors.
function portraitSceneryOffset(context = null) {
  if (context?.sceneryLayout) return 0;
  const n = Number(context?.sceneryOffsetY);
  return Number.isFinite(n) ? Math.max(-120, Math.min(40, n)) : 0;
}

// Landscape's shorter sky-to-ground composition leaves the Plumber hills
// tucked behind too much of the foreground apron. Raise the complete country
// layer together so the mountain range, volcano, near ridge, and its props
// keep their existing depth and planting. Portrait has its own resolved band
// geometry and keeps that composition unchanged.
const PLUMBER_LANDSCAPE_SCENERY_LIFT = 34;

function plumberLandscapeSceneryOffset(context = null) {
  return (context?.portrait === true || context?.sceneryLayout)
    ? 0 : -PLUMBER_LANDSCAPE_SCENERY_LIFT;
}

// Camera-derived positions in here are deliberately NOT rounded to whole
// pixels. Rounding looks harmless per frame and is a stutter in motion: the
// world scrolls a fractional number of pixels per tick (2.54 at a typical
// speed), so a snapped element steps 3, then 2, then 3 while everything drawn
// through drawWorldEntity glides. The ground draws inside the world transform
// at ZOOM 2, so one world pixel of snap is two canvas pixels — about twenty
// device pixels on a 5K panel — and it lands on the repeating ground pattern,
// which is the worst possible carrier for it. A row of identical marks all
// jumping together is read as flicker rather than as motion.
//
// Two places still round on purpose and must stay that way: the LCD pack
// quantizes to its segment pitch because a segment display cannot scroll
// smoothly, and the half-pixel strokeRect offsets exist to keep a 1px line
// crisp rather than to position anything.
// The solid stretches of road on screen, in SCREEN x, with every gap taken out
// of them. Two packs need this and they draw their ground nothing like each
// other — one lays a flat apron, one lays a five-row checkered perspective road
// — so what they share is the arithmetic of where the road ISN'T.

function solidRuns(camX, obstacles, viewW = W) {
  const right = Math.max(0, Number.isFinite(viewW) ? viewW : W);
  const cuts = [];
  for (const ob of obstacles || []) {
    if (ob.live && ob.def && ob.def.isGap) cuts.push([ob.x - camX, ob.x - camX + ob.w]);
  }
  cuts.sort((a, b) => a[0] - b[0]);
  const runs = [];
  let open = 0;
  for (const [a, b] of cuts) {
    if (a > open) runs.push([open, Math.min(a, right)]);
    open = Math.max(open, b);
  }
  if (open < right) runs.push([open, right]);
  return runs.filter(([a, b]) => b > a);
}

// The pixel pack's apron is the ground UNDER the lane, not the lane surface.
// A tunnel roof owns that space, so foreground texture has to stop there even
// though the playable road continues across the overhang.
function apronRuns(camX, obstacles, overhangs = [], viewW = W) {
  const cut = (overhangs || []).map((sp) => [sp.x - camX, sp.x + sp.w - camX]);
  const body = [];
  for (const [a, b] of solidRuns(camX, obstacles, viewW)) {
    let pieces = [[a, b]];
    for (const [ca, cb] of cut) {
      const next = [];
      for (const [p, q] of pieces) {
        if (ca > p) next.push([p, Math.min(q, ca)]);
        if (cb < q) next.push([Math.max(p, cb), q]);
      }
      pieces = next.filter(([p, q]) => q > p);
    }
    body.push(...pieces);
  }
  return body;
}

function drawGapsAwareGround(ctx, camX, cab, obstacles, colTop, colBody, overhangs = [], t = 0, viewW = W) {
  // A gap is drawn by NOT drawing, rather than by painting a black rectangle
  // over ground that has already been laid.
  //
  // The old way put `#08060c` down every hole in the game, which is a colour
  // that belongs to nothing else on screen — and once a lower route existed it
  // was actively wrong, because looking down a hole should show you what is
  // under it: the sky, the hills, and the ground of the area below. A hole you
  // can see through is the whole difference between a level with two heights in
  // it and a level with a black rectangle in it.
  const runs = apronRuns(camX, obstacles, overhangs, viewW);
  // `overhangs` are WORLD-x spans with a second area running under them. The
  // apron below the line is 38px of body colour painted clean across the frame
  // with no idea of that, so over a chamber it is left hanging in mid-air with
  // a flat bottom edge — the one shape in the picture that cannot be ground.
  // The lane's lit surface still gets drawn there: you run along it. What stops
  // is the fill UNDER it, which belongs to the tunnel's roof slab instead.
  for (const [a, b] of runs) {
    if (b <= a) continue;
    // The cap goes with the body. It is drawn at the FLAT groundline while the
    // terrain rolls above it, so over a chamber — where the body it belongs to
    // has been cut away — it is left as a green bar hanging in the air under
    // the island. What the lane's surface is up there is the island's own cap.
    ctx.fillStyle = colBody;
    ctx.fillRect(a, GROUND_Y, b - a, H - GROUND_Y);
    ctx.fillStyle = colTop;
    ctx.fillRect(a, GROUND_Y, b - a, 3);
  }
  // ...and what is in the holes. After the ground, because the fill is clipped
  // to its own break and would otherwise be painted over by the apron either
  // side of it. Nothing is drawn if the cabinet names no material: an open
  // break is a legitimate answer and it is what eight of the nine still use.
  drawPitFills(ctx, camX, cab, obstacles, t, false, null, viewW, colBody);
}

// One material per cabinet, in every hole on it. Split out so the packs that
// draw their ground some other way — the checkered road, the neon grid — can
// call it without also inheriting drawGapsAwareGround's idea of what a road is.
export function drawPitFills(ctx, camX, cab, obstacles, t = 0, ownOnly = false,
  liftOf = null, viewW = W, groundFill = null, hard = null) {
  if (!cab) return;
  const right = Math.max(0, Number.isFinite(viewW) ? viewW : W);
  // `hard` is what only the caller knows and only the hard fills read (see
  // game/pitFillHard.js): `beat`, the song clock the piston bed fires on, and
  // `paperSlab`, the pack's paper finish the gear works wear.
  // TAR EVERYWHERE, until a cabinet says otherwise. An empty break is a
  // legitimate picture and it is the wrong DEFAULT: a pit is fatal now, and the
  // one thing every hole has to do is look like it will kill you. `pitFill` is
  // the per-cabinet override the bake-off exists to fill in — 'none' opts a
  // cabinet back out to open air.
  const cabId = cab.pitFill || 'tar';
  for (const ob of obstacles || []) {
    if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel) continue;
    // A HOLE MAY NAME ITS OWN MATERIAL, and one does: a stepping-stone crossing
    // is spiked whatever the cabinet is filled with, because the fill is the
    // only thing that says the sequence is fatal before the first hop. Read off
    // the obstacle first and the cabinet second — the cabinet is the default,
    // not the authority.
    // TWO PASSES, and every hole is painted by exactly one of them. A hole that
    // names its own material is drawn by the run itself (see RunState.draw), so
    // that a crossing's spikes do not depend on which of the nine packs happens
    // to call this function — three of them draw their ground themselves and
    // never do. Everything else is the cabinet's, and is drawn from here.
    if (!!ob.fill !== ownOnly) continue;
    const id = ob.fill || cabId;
    if (id === 'none') continue;
    const x = ob.x - camX;
    if (x + ob.w < -4 || x > right + 4) continue;
    // Phased off world x so two pits on one screen never bubble in step.
    // How far the ground stands above the flat line over this break, so a fill
    // that draws a floor can reach up behind a raised lip instead of leaving a
    // seam of sky under it. Only the run knows (the rise is its own), so it is
    // handed in rather than looked up.
    // A spike bed or gear works also takes which design this pit wears, keyed
    // off its world x (and its stones, when it is a crossing).
    const env = (id === 'spikes' || id === 'gears')
      ? { seed: ob.x, cab: cab.id, crossing: ob.crossing || null, beat: hard?.beat, paperSlab: hard?.paperSlab }
      : null;
    drawPitFill(ctx, id, x, GROUND_Y, ob.w, H - GROUND_Y, t, ob.x * 0.013,
      liftOf ? liftOf(ob) : 0, groundFill, env);
  }
}

// ----------------------------------------------------------- the ice bridge
//
// WHAT THE POWER BLOCK ACTUALLY BUILDS. The hole it answers used to simply stop
// existing when the block was hit — the ground healed over and the tar went
// with it — so the reward for finding the one prop on the ice you have to go
// out of your way to hit was a stretch of road that looked like it had never
// been broken. Nothing said a bridge had been built, because nothing was.
//
// So the break stays a break (isOpenGap in game/entities.js is what makes it
// safe without making it vanish) and this fills it with ICE. Blocks, not
// planks: the first cut was a slatted timber deck and it read as scaffolding
// slung UNDER the road — the hero ran along the top of a hole with a lid on it,
// visibly not touching the thing he was standing on. Ice cubes rising to road
// level are the opposite claim. They are ground: their top face IS the lane,
// they are the cabinet's own material, and a frozen fortress freezing a hole
// shut needs no explaining.
//
// FLUSH WITH THE ROAD, and that is the whole geometry. The top of every cube
// sits exactly on the surface the hero's feet are on, which on a frost lane is
// not the flat line — the ground rises, so the lift over this break is handed
// in the way drawPitFills takes it. Getting that wrong is what put the first
// version a few pixels under the road with the hero floating over it.
//
// THEY COME UP LEFT TO RIGHT, in the hero's own direction of travel, and FAST —
// a fifth of a second, the same clock as the block's own hop (SWITCH_THROW_T).
// The movement is there so the eye catches WHAT happened, not so anybody waits
// for it: by the time he looks up, the crossing is already there.
export const BRIDGE_LAY_T = 0.2;
const ICE_BLOCK_W = 7;             // world px per cube

export function drawBridgeDecks(ctx, camX, obstacles, viewW = W, groundAt = null) {
  const right = Math.max(0, Number.isFinite(viewW) ? viewW : W);
  for (const ob of obstacles || []) {
    if (!ob.live || !ob.def || !ob.def.isGap || !ob.bridged || ob.tunnel) continue;
    const x = ob.x - camX;
    if (x + ob.w < -8 || x > right + 8) continue;
    const p = Math.min(1, (ob.bridgeT || 0) / BRIDGE_LAY_T);

    // A cube at each lip overlaps the ground by a pixel, so the crossing is
    // keyed into the road rather than wedged between two clean edges.
    const x0 = x - 1, span = ob.w + 2;
    const count = Math.max(2, Math.round(span / ICE_BLOCK_W));
    const cw = span / count;
    // THE FRONT RUNS PAST THE FAR LIP, and it has to. Each cube settles over
    // the distance the front travels BEYOND it, so a front that stops exactly
    // at the end of the span leaves the last cube — and to a lesser degree the
    // one before it — frozen part-way through its drop, sitting a couple of
    // pixels low for the rest of the run. Overshooting by a cube and a half is
    // what lets every one of them arrive.
    const front = p * (span + ICE_BLOCK_W * 1.5);
    for (let i = 0; i < count; i++) {
      const cx = x0 + i * cw;
      const at = cx + cw / 2 - x0;
      if (at > front) continue;   // the front has not reached this one yet
      // How settled this cube is: 0 the instant it arrives, 1 once it is home.
      const set = Math.min(1, (front - at) / (ICE_BLOCK_W * 1.5));
      // THE TOP FACE IS THE ROAD, sampled per cube at that cube's own world x.
      // Not the flat GROUND_Y: a frost lane has a terrain profile, so the road
      // either side of a hole routinely stands a dozen pixels above the flat
      // line, and a crossing laid on the flat line is a crossing the hero is
      // visibly running above. Per cube rather than once per hole, so the ice
      // follows a sloped lane instead of stepping off the lip.
      const top = groundAt ? groundAt(camX + cx + cw / 2, ob.route) : GROUND_Y;
      // It comes UP out of the hole and overshoots by a pixel, so the eye reads
      // a thing being placed rather than a rectangle switching on.
      const rise = (1 - set) * (1 - set) * 7 - (set < 1 ? (1 - set) * 1.2 : 0);
      const y = top + rise;
      // Depth varies per cube, keyed off world x so it does not shimmer as the
      // camera moves: a crossing of identical bricks is a wall lying down.
      const deep = 9 + ((Math.floor(ob.x + i * 7) % 3) * 2);
      // The body, its lit top face, and the shadowed underside that stops the
      // block reading as a flat card.
      ctx.fillStyle = '#9fc4dd';
      ctx.fillRect(cx, y + 2, cw - 0.6, deep);
      ctx.fillStyle = '#dff0ff';
      ctx.fillRect(cx, y, cw - 0.6, deep * 0.55);
      ctx.fillStyle = '#f4fbff';
      ctx.fillRect(cx, y, cw - 0.6, 1.4);
      // One highlight down the left face of each cube: at this size it is the
      // only thing that says these are solid lumps rather than one blue bar.
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(cx + 0.6, y + 1.6, 0.8, deep * 0.4);
    }
  }
}

// Hills render ONCE into a seamlessly-tiling strip (|sin| has period pi*wl),
// then scroll as GPU texture blits instead of re-tracing a 60-segment path
// on the CPU every frame.
const hillCache = new Map();
// Tiles are baked at the render density and logical frame height, so a density
// change (rotation, a window resize, an adaptive step) invalidates every one of
// them. The height is part of the key because portrait can change H without
// changing density; the factor guard drops stale canvases instead of leaving
// both generations resident.
let hillCacheSS = 0;
// `opts.peak` swaps the rounded |sin| ridge for a triangular one with a lower
// shoulder — hills become mountains. `opts.rock` and `opts.snow` then band them:
// each fills everything above its own altitude line, clipped to the ridge
// silhouette, so only crests rising through a line pick up that color (the
// shoulders reach rock but not snow). Both lines wobble at integer multiples of
// the tile period, so they meet themselves at the seam.
//
// OVER (below) is why there is no seam line: a path edge landing exactly on
// x=0/x=period antialiases into a half-covered column, and two abutting tiles
// put two of those together — a translucent gap showing sky. Overdrawing past
// both edges (the fill clips to the canvas) keeps the edge columns fully
// opaque. Rounded hills never showed it because ridge(0) sits at ground level,
// hidden behind the near layer; a triangular shoulder crest lands at the tile
// edge and lifts that seam into open sky.
// Blits at a fractional x antialias their own dest-rect edge against the sky,
// and two abutting tiles put two of those together — a translucent gap showing
// sky. Overdrawing past both edges keeps the edge columns fully opaque. Frost
// uses a continuous ridge instead of relying on this cached-tile seam
// treatment, because its translucent wash makes the partial-alpha overlap
// visible in either orientation.
const MARGIN = 2;
const OVER = MARGIN + 4;
const TREE_MAX = 18; // tallest crown, reserved as tile headroom

// Small per-cabinet scenery accents. These are deliberately quieter than the
// foreground gameplay art: a few strong silhouettes give each empty backdrop
// a place without turning the horizon into confetti.
const FROST_SCENERY_PALETTE = Object.freeze({
  far: '#66879d', near: '#416579', snow: '#d8e9ef', shadow: '#304b5b',
  ice: '#789eb5', iceShadow: '#3b6077', landmark: '#304d66', warm: '#e4ba68',
});
// DAY TO DUSK ACROSS THE THREE STAGES.
//
// Frost 1 opens on a flat white afternoon, Frost 2 has the sun on the way down,
// and Frost 3 is the evening the aurora and the fortress's lit windows were
// always drawn for. It is one light per stage rather than a wash over the
// finished frame: a wash greys the aurora and the snow together, and the whole
// point is that as the sky goes down the aurora comes UP.
//
// Every field here is a light, not a decoration, which is why the lane is in
// the table. Snow is the brightest thing in the picture because of what is
// falling on it, so a dusk sky over a noon lane reads as a lit stage set. The
// one thing that does not move is `warm`, the fortress's windows: they are
// emitting, not reflecting, and they are the only warm mark left by stage 3.
//
// `tint` and `tintAmount` are what the stage does to the SCENERY palette before
// aerial perspective hazes it — less light reaching the rock, applied first, so
// the haze still mixes toward the sky that stage actually has.
const FROST_STAGE_LIGHT = Object.freeze([
  null,
  Object.freeze({
    name: 'day',
    // Stage 1 is the shipped cabinet palette, unchanged: the ramp starts from
    // the picture that was signed off, and only stages 2 and 3 are new.
    sky: Object.freeze(['#b8d8f0', '#e0ecf8']),
    far: '#a8c8e8', hills: '#88a8c8',
    ground: '#c8e0f0', groundDark: '#98b8d8',
    foreground: '#5b7e96', haze: '#e6f1fa',
    tint: '#ffffff', tintAmount: 0,
  }),
  Object.freeze({
    name: 'low sun',
    // The sun is off to one side and low: the top of the sky deepens while the
    // horizon takes the warmth. The snow barely moves yet — it is still day.
    sky: Object.freeze(['#93b7de', '#f2ddc6']),
    far: '#9cb7d8', hills: '#7d99bf',
    ground: '#c3d8ea', groundDark: '#92aecd',
    foreground: '#56768f', haze: '#eae9f0',
    tint: '#e9c9a4', tintAmount: 0.16,
  }),
  Object.freeze({
    name: 'dusk',
    // Twilight over snow: deep blue overhead, the last of the sun on the
    // horizon, and a lane that has gone blue-violet because nothing white is
    // lighting it any more. The traps still read — that was checked against the
    // real 16x8 mark before this palette was kept.
    sky: Object.freeze(['#41568a', '#dda283']),
    far: '#6f80ab', hills: '#56658e',
    ground: '#9aa9c9', groundDark: '#6c7ca2',
    foreground: '#3e4a6d', haze: '#c9c6dd',
    tint: '#6b6ea0', tintAmount: 0.42,
  }),
]);

function frostStageLight(stageIndex) {
  return FROST_STAGE_LIGHT[Math.max(1, Math.min(3, Number(stageIndex) || 1))];
}

// The first feature in each ridge tile is the authored landmark rhythm. A
// small secondary slot makes the long portrait window feel inhabited without
// turning the playable lane into a wall of props.
const FROST_FAR_SECONDARY_FEATURES = Object.freeze([
  Object.freeze({ kind: 'ice-rock', at: 0.47, scale: 0.84 }),
  Object.freeze({ kind: 'snowbank', at: 0.88, scale: 0.58 }),
]);
// Portrait has a taller viewing window but the same world-space ridge period.
// Add one quiet third slot there so the extra sky is inhabited without
// shortening the hill wavelength or making the scenery look stamped.
const FROST_FAR_PORTRAIT_EXTRA_FEATURES = Object.freeze([
  Object.freeze({ kind: 'snowbank', at: 0.62, scale: 0.46 }),
]);
const FROST_NEAR_SECONDARY_FEATURES = Object.freeze([
  Object.freeze({ kind: 'ice-rock', at: 0.50, scale: 0.84 }),
  Object.freeze({ kind: 'snowbank', at: 0.88, scale: 0.64 }),
]);
const FROST_NEAR_PORTRAIT_EXTRA_FEATURES = Object.freeze([
  Object.freeze({ kind: 'pine', at: 0.06, scale: 0.95 }),
]);
const FROST_SCENERY_LIFT = 16;
// Landscape has much less sky above the lane, so the same Frost country
// settles too close to the apron. Move the complete Frost stack up only in
// landscape; portrait keeps its resolved band geometry and existing lift.
const FROST_LANDSCAPE_SCENERY_LIFT = 36;
// Frost props are painted immediately after their own ridge. The ridge is
// still opaque so its color remains the support plane, while the scenery's
// exact footprint can stay visible instead of being buried several pixels
// below the snow line.
const FROST_SCENERY_ALPHA = 1;
const FROST_HILL_ALPHA = 1;
// A separate foreground sheet restores the depth that translucency used to
// provide, without asking the gameplay ridge to do two jobs. It is decorative
// only: the opaque near ridge still owns all prop occlusion, while this broad
// fold passes in front of it at a restrained alpha and never owns a hitbox.
const FROST_FOREGROUND_HILL_ALPHA = 0.22;
const FROST_FOREGROUND_HILL_DEPTH = 0.55;
const FROST_FOREGROUND_HILL_AMP = 28;
const FROST_FOREGROUND_HILL_WL = 88;
const FROST_FOREGROUND_HILL_OFFSET = 14;
const FROST_FOREGROUND_HILL_COLOR = '#5b7e96';
const CRYPT_SCENERY_PALETTE = Object.freeze({
  far: '#665371', near: '#4b3859', edge: '#2d2238', lit: '#876f8c',
});
const OFFICE_SCENERY_PALETTE = Object.freeze({
  line: '#68748b', fill: 'rgba(191,198,212,0.58)', shade: '#9aa4b7',
  warm: '#c28672',
});
const SURGE_SCENERY_PALETTE = Object.freeze({
  pixel: '#687f9c', faux: '#5b777d', edge: '#273247', signal: '#d6c35a',
});
// Slower than the far hill layer's 0.15: the volcano sits behind that range,
// so it must drift more slowly than the crests occluding it.
const VOLCANO_PLX = 0.09;
// How far a hill's body is baked BELOW the bottom of the frame.
//
// A hill tile used to stop at `H`, which is right for as long as the background
// only ever moves down. Going below the lane moves the whole background UP, and
// then everything under the ridge simply ran out — leaving a straight-edged
// strip of nothing where the hills should have carried on. Patching that strip
// with a flat fill at the caller only moved the problem: a solid colour butted
// against a shaded tile is a seam in a different place. The body is a fill, so
// baking more of it costs one taller canvas per hill layer and nothing per
// frame.
const HILL_UNDERFILL = 220;

// The ridge line itself, factored out of the tile bake so that anything which
// has to STAND on a crest reads the same curve the tile was cut from.
//
// This existed twice for one afternoon — once here and once in the caller that
// puts cacti on the desert ridge — and the copy was wrong in a way that only
// showed up after a few thousand pixels of scroll. `period` is ROUNDED to a
// whole pixel (163 where pi*wl is 163.363), so a caller that reconstructs the
// phase from raw camX drifts against the baked tile by a third of a pixel per
// period and the cacti slowly lift off the hills. Sampling the same function
// through the same modulo is the only version of this that cannot drift.
// The peaked far range's summits, as fractions of one tile period. Feet
// overlap on purpose: neighbouring flanks cross well above the base line, so
// the range is a continuous skyline with saddles in it rather than a row of
// separate cones standing on a flat horizon. The last summit wraps across the
// seam, which is why its foot reaches past 1.
//
// `at` centre of the base, `w` base width, `h` height as a fraction of amp,
// `skew` how far the apex leans off centre (-1..1, negative leans left).
//
// SPACING IS A CONSTRAINT, not a free parameter. The frame is 480 wide against
// a 628px period, so about three quarters of the range is on screen at once.
// The first cut clustered the two big summits in the first half and put two
// low foothills in the second, and for a good few seconds of running the far
// range dropped entirely behind the near hills and left a bare sky. The
// summits are therefore spread at a roughly even 0.18 of period, and the two
// tallest sit 0.35 apart — closer than the frame is wide, so one of them is
// always in the picture.
const PEAK_SUMMITS = Object.freeze([
  // The one the eye lands on: broad, snow-capped, apex left of its base so the
  // eastern flank runs long into the saddle behind it.
  Object.freeze({ at: 0.20, w: 0.36, h: 1.00, skew: -0.18 }),
  // Its east shoulder, rock but no snow — part of the same massif, and the
  // band cut-off is what makes it the lesser of the two.
  Object.freeze({ at: 0.38, w: 0.18, h: 0.58, skew: 0.30 }),
  // A separate horn across a real valley — narrower, steeper, leaning the
  // other way so the two big summits are not each other's mirror.
  Object.freeze({ at: 0.55, w: 0.25, h: 0.86, skew: -0.28 }),
  // The low point of the range: rock only, and the widest saddle either side.
  Object.freeze({ at: 0.74, w: 0.22, h: 0.56, skew: 0.20 }),
  // A third capped summit straddling the seam, well short of the other two.
  Object.freeze({ at: 0.92, w: 0.26, h: 0.74, skew: -0.12 }),
]);

// Triangle wave, -1..1 over one cycle of `u`. Used for the altitude lines
// below: a sine boundary undulates, and undulating is a sand dune — a
// triangle wave has CORNERS, and corners are what read as rock and ice.
const triWave = (u) => 2 * Math.abs(u - Math.floor(u + 0.5)) - 1;

// One summit's own height at `u`, 0 outside its base. The composite ridge is
// the max of these. THE FLANKS ARE STRAIGHT ON PURPOSE: a broken, cragged
// silhouette was tried here and lost — the clean triangle is the look, and
// the sharpness the range needs belongs to the snow line, not the outline.
function peakSummitTop(u, m) {
  const d = ((u - m.at + 1.5) % 1) - 0.5;              // signed wrapped offset
  const half = m.w / 2;
  if (Math.abs(d) >= half) return 0;
  const apex = half * m.skew;
  const flank = d >= apex ? half - apex : half + apex;
  return m.h * (1 - Math.abs(d - apex) / flank);
}

function ridgeProfile(px, yBase, amp, wl, period, peak, mesa, dunes) {
  if (!peak && !mesa && !dunes) return yBase - Math.abs(Math.sin(px / wl)) * amp;
  const u = (((px % period) + period) % period) / period; // px may go negative
  if (dunes) {
    // A plain |sin| ridge makes every hill exactly the same height, and a row
    // of identical humps reads as a pattern rather than as country. Dunes are
    // three humps of stated width and height inside one period — varied, and
    // still seamless because the variation IS the period.
    // Read from DESERT_DUNES so the cacti can be planted on the peaks by name
    // rather than by guessing at an x — see the note there.
    let top = 0;
    for (const d of DESERT_DUNES) {
      const dist = Math.abs(((u - d.at + 1.5) % 1) - 0.5);   // wrapped distance
      const half = d.w / 2;
      if (dist >= half) continue;
      top = Math.max(top, d.h * (0.5 + 0.5 * Math.cos((dist / half) * Math.PI)));
    }
    return yBase - top * amp;
  }
  if (!mesa) {
    // A RANGE, NOT A STAMP. This used to be one symmetric triangle filling the
    // tile with a 0.55 shoulder either side, and at 283px of period that meant
    // the same isosceles cone every 283px across the sky — the shape reads as
    // wallpaper the moment two of them are on screen at once. The dunes above
    // already solved this for the desert: state several summits of different
    // width, height and lean inside ONE period, so the variation is the period
    // and the tile still meets itself at the seam.
    //
    // `skew` moves the apex off the middle of the base, which is what stops
    // these looking drafted: a mountain has a long flank and a short one. Each
    // summit's `h` is chosen against the altitude bands in parallaxHills —
    // rock at 0.46 of amp, snow at 0.62 — so the table also decides which
    // crests get a cap: two summits carry snow, one is bare rock, and the two
    // foothills stay the range's own colour.
    let top = 0;
    for (const m of PEAK_SUMMITS) top = Math.max(top, peakSummitTop(u, m));
    return yBase - top * amp;
  }
  // A MESA is a trapezoid: steep sides, a dead-flat cap, and FLAT GROUND
  // between one and the next. A rounded sine ridge could be any landscape on
  // earth; a cut-off cap can only be desert.
  //
  // The first cut got this by clamping a triangle — min(1, peak * 2.2) — and
  // it was wrong in a way that only showed once the near ridge and the haze
  // were drawn under it. Clamping ties the cap width to the slope angle: the
  // multiplier that made the sides steep also made the flat top 55% of the
  // period, so at the far layer's 110 wavelength the ridge became one
  // continuous plateau running the width of the screen — a wall, not a
  // country. Stating the two independently is the whole fix.
  const shelf = (centre, width, slope, height) => {
    const d = Math.abs(((u - centre + 1.5) % 1) - 0.5);   // wrapped distance
    const half = width / 2;
    if (d <= half) return height;
    if (d >= half + slope) return 0;
    return height * (1 - (d - half) / slope);
  };
  // A big one and a smaller sibling at a distance that is not half a period,
  // so the tile reads as country rather than as an obvious repeat.
  return yBase - Math.max(
    shelf(0.5, 0.24, 0.085, 1),
    shelf(0.08, 0.13, 0.06, 0.56),
  ) * amp;
}

// One transform for every painter that belongs to a ridge.  The hill tile,
// the object standing on it, and the diagnostic sampler must agree on both
// the fractional camera offset and the absolute tile number. Keeping those
// values together prevents a second implementation from slowly separating an
// attached prop after a portrait zoom or a long scroll.
function ridgeScroll(camX, factor, period) {
  const travel = camX * factor * ZOOM;
  return {
    off: ((travel % period) + period) % period,
    tile: Math.floor(travel / period),
  };
}

// Screen y of a hill layer's crest at screen x, for the same (amp, wl, factor)
// that layer was drawn with. This is how you plant something on a ridge: the
// offset is reconstructed exactly as the blit loop below computes it, so the
// answer is the pixel the tile actually put there.
export function ridgeYAt(screenX, camX, yBase, amp, wl, factor, opts) {
  const period = Math.max(16, Math.round(Math.PI * wl));
  const off = ridgeScroll(camX, factor, period).off;
  const coverageLeft = Number.isFinite(Number(opts?.coverageLeft))
    ? Number(opts.coverageLeft) : 0;
  const px = ((screenX - coverageLeft + off) % period + period) % period;
  return ridgeProfile(px, yBase, amp, wl, period,
    !!(opts && opts.peak), !!(opts && opts.mesa), !!(opts && opts.dunes));
}

// The local tangent is part of the ridge attachment contract too. A feature
// with a horizontal foot on a steep dune looks pinned into the face instead
// of growing from it, even when its base y is sampled from the right curve.
// Canvas rotation uses the same screen-space convention as the ridge: a
// positive slope (down toward the right) is a positive rotation.
function ridgeTangentAngle(px, yBase, amp, wl, period, peak, mesa, dunes) {
  const step = 2;
  const before = ridgeProfile(px - step, yBase, amp, wl, period, peak, mesa, dunes);
  const after = ridgeProfile(px + step, yBase, amp, wl, period, peak, mesa, dunes);
  return Math.atan2(after - before, step * 2);
}

// Keep the tree positions and silhouettes in one recipe. Plumber's hillside
// accents use these samples to leave a little breathing room around the trees
// that parallaxHills() bakes into the near-ridge tile.
function ridgeTreeSamples(period, treeScale = 1) {
  const n = Math.max(2, Math.round(period / 38));
  const samples = [];
  for (let i = 0; i < n; i++) {
    const j = Math.sin(i * 12.9898) * 43758.5453;
    const f = j - Math.floor(j);
    const k = Math.sin(i * 78.233 + 1.7) * 24634.6345;
    const g = k - Math.floor(k);
    const tx = ((i + 0.2 + g * 0.6) / n) * period;
    const th = (9 + f * 5) * treeScale;
    const broadleaf = g >= 0.45;
    // These are the widest extents of the actual baked crown recipes. The
    // extra pixel is supplied by the flower clearance check below.
    const halfWidth = broadleaf ? th * 0.30 * 1.63 : th * 0.34;
    samples.push({ tx, th, broadleaf, halfWidth });
  }
  return samples;
}

// Split a peaked range at its natural low points so each visible mountain is
// treated as its own paper sheet. Rounded near hills already have one crest per
// period, so their period itself is one sheet and does not need extra cuts.
function paperRidgeSheetRanges(ridge, period, split = false) {
  if (!split) return [[0, period]];
  const step = 2;
  const samples = Math.max(2, Math.ceil(period / step));
  const values = new Array(samples);
  for (let i = 0; i < samples; i++) values[i] = ridge(i * period / samples);
  const cuts = [0];
  for (let i = 1; i < samples; i++) {
    const prev = values[i - 1];
    const current = values[i];
    const next = values[(i + 1) % samples];
    // Screen y is larger in a valley. Strictness avoids collecting the flat
    // portions that can occur in a future mesa profile.
    if (current >= prev && current >= next && (current > prev || current > next)) {
      cuts.push(i * period / samples);
    }
  }
  cuts.push(period);
  cuts.sort((a, b) => a - b);
  const ranges = [];
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i] - cuts[i - 1] > 1) ranges.push([cuts[i - 1], cuts[i]]);
  }
  return ranges.length ? ranges : [[0, period]];
}

function drawSeamFreeHill(ctx, camX, color, yBase, amp, wl, factor, options = {}) {
  const coverage = backgroundPaintCoverage(ctx);
  const period = Math.max(16, Math.round(Math.PI * wl));
  const scroll = ridgeScroll(camX, factor, period).off;
  const peak = !!options.peak;
  const mesa = !!options.mesa;
  const dunes = !!options.dunes;
  const start = coverage.left - 8;
  const end = coverage.right + 8;
  const ridgeAt = (screenX) => {
    // `screenX` is in the current background's local picture space. The
    // cached-tile path below starts its first ridge at coverage.left, so the
    // continuous path must use the same local origin or portrait and
    // landscape will resolve the same world ridge at different phases.
    const px = ((screenX - coverage.left + scroll) % period + period) % period;
    return ridgeProfile(px, yBase, amp, wl, period, peak, mesa, dunes);
  };
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(start, H + HILL_UNDERFILL);
    for (let x = start; x <= end; x += 2) ctx.lineTo(x, ridgeAt(x));
    ctx.lineTo(end, H + HILL_UNDERFILL);
    ctx.closePath();
  };
  if (options.paper) {
    paperShadowPass(ctx, path, PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, path, PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
  }
  ctx.fillStyle = color;
  path();
  ctx.fill();
  if (options.paper) {
    paperFinishPass(ctx, path,
      sharedPaperPatternFor(ctx, options.paperMaterial || 'cardstockClear'), {
        grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA * (options.paperStrength ?? 1),
        rim: false,
      });
  }
}

function parallaxHills(ctx, camX, color, yBase, amp, wl, factor, opts) {
  const period = Math.max(16, Math.round(Math.PI * wl));
  const top = yBase - amp;
  const peak = !!(opts && opts.peak);
  const mesa = !!(opts && opts.mesa);
  const dunes = !!(opts && opts.dunes);
  const snow = (opts && opts.snow) || null;
  const rock = (opts && opts.rock) || null;
  const trees = (opts && opts.trees) || null;
  const treeScale = trees ? Math.max(0.8, Number(trees.scale) || 1) : 1;
  const surface = (opts && opts.surface) || null;
  const paper = !!(opts && opts.paper);
  const paperMaterial = (opts && opts.paperMaterial) || 'cardstockClear';
  const paperStrength = paperStrengthsOf({
    paperSceneryStrength: opts && opts.paperStrength,
  }).scenery;
  const strata = Array.isArray(opts && opts.strata) ? opts.strata : null;
  if (opts && opts.seamFree) {
    drawSeamFreeHill(ctx, camX, color, yBase, amp, wl, factor, {
      paper, paperMaterial, paperStrength, peak, mesa, dunes,
    });
    return;
  }
  const strataKey = strata
    ? strata.map((stripe) => `${stripe.fromTop}|${stripe.height}|${stripe.color}|${stripe.alpha}`).join(';')
    : '';
  // A tree standing on a crest has its base at `top`, so its crown would reach
  // above the tile and get sliced flat by the canvas edge. Give the tile that
  // much headroom and blit from there.
  const tileTop = top - (trees ? TREE_MAX * treeScale : 0);
  const key = `${H}|${color}|${yBase}|${amp}|${wl}|${peak ? 1 : 0}|${mesa ? 1 : 0}|${dunes ? 1 : 0}|${rock || ''}|${snow || ''}|surface:${surface || ''}|`
    + (trees ? `${trees.leaf}${trees.trunk}|${treeScale}` : '')
    + `|paper:${paper ? 1 : 0}|material:${paperMaterial}|strength:${paperStrength}|strata:${strataKey}`;
  const SS = bakeSS();
  if (SS !== hillCacheSS) { hillCache.clear(); hillCacheSS = SS; }
  let tile = hillCache.get(key);
  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = (period + MARGIN * 2) * SS;
    tile.height = Math.max(1, (H - tileTop + HILL_UNDERFILL) * SS);
    const x = tile.getContext('2d');
    x.scale(SS, SS);
    x.translate(MARGIN, -tileTop); // tile-local 0 is ridge x 0; the margin sits left of it
    const ridge = (px) => ridgeProfile(px, yBase, amp, wl, period, peak, mesa, dunes);
    const ridgePath = () => {
      x.beginPath();
      x.moveTo(-OVER, H + HILL_UNDERFILL);
      for (let px = -OVER; px <= period + OVER; px += 2) x.lineTo(px, ridge(px));
      x.lineTo(period + OVER, H + HILL_UNDERFILL);
      x.closePath();
    };
    const paperSheets = paperRidgeSheetRanges(ridge, period, paper && (peak || mesa || dunes));
    const sheetEdge = (from, to) => {
      x.beginPath();
      x.moveTo(from, ridge(from));
      for (let px = from + 2; px < to; px += 2) x.lineTo(px, ridge(px));
      x.lineTo(to, ridge(to));
    };
    const sheetShadow = (from, to, depth) => {
      x.beginPath();
      x.moveTo(from, ridge(from));
      for (let px = from + 2; px < to; px += 2) x.lineTo(px, ridge(px));
      x.lineTo(to, ridge(to) + depth);
      for (let px = to - 2; px >= from; px -= 2) x.lineTo(px, ridge(px) + depth);
      x.closePath();
    };
    if (paper) {
      // Shadows are baked with the ridge, so the per-frame path remains the
      // existing tile blit. This is the important performance boundary for the
      // preview: no multiply fill or repeated hill trace during gameplay.
      for (const [from, to] of paperSheets) {
        paperShadowPass(x, () => sheetShadow(from, to, 8),
          PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
        paperShadowPass(x, () => sheetShadow(from, to, 3),
          PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
      }
    }
    ridgePath();
    x.fillStyle = color;
    x.fill();
    // Altitude bands, low to high. Each re-traces the ridge to clip against:
    // restore() rolls back the clip but NOT the current path, so a second band
    // would otherwise clip itself to the first band's polygon.
    // THE SNOW LINE IS A ROW OF TEETH, not a wave. This is the one thing the
    // flat-vector mountain reference does that the shipped range did not: the
    // cap does not end on a curve, it ends in sharp Vs where the snow has run
    // further down the gullies than down the ribs between them. It was a pair
    // of low sines, which drew one broad bulge per summit and made the cap
    // read as a sticker laid over the peak.
    //
    // The SILHOUETTE stays a clean triangle. A cragged outline was tried with
    // this and lost: the sharpness belongs to the ice, and a mountain that is
    // jagged in both places is just noisy.
    //
    // Every wave count is a WHOLE NUMBER of cycles per period, so the line
    // meets itself at the seam. That constraint is why the teeth are stated
    // as cycle counts rather than as a pixel wavelength. At 628px of period,
    // 13 cycles is a tooth about every 48px — four or five across the big
    // summit's cap, which is the reference's count. Finer than that and they
    // stop resolving: the ridge is traced every 2px, and this range is drawn
    // at the far layer's scale.
    const ROCK_LINE = Object.freeze([
      Object.freeze({ cycles: 5, amp: 3.0 }),
      Object.freeze({ cycles: 13, amp: 2.5 }),
    ]);
    // The 3-cycle drift is the reason no two caps come down to the same
    // depth; the 13 and 29 are the teeth, at amplitudes that beat against each
    // other so no two are the same size either.
    const SNOW_LINE = Object.freeze([
      Object.freeze({ cycles: 3, amp: 2.0 }),
      Object.freeze({ cycles: 13, amp: 5.0 }),
      Object.freeze({ cycles: 29, amp: 2.5 }),
    ]);
    const ROUND_LINE = Object.freeze([
      Object.freeze({ cycles: 2, amp: 3.5, round: true }),
      Object.freeze({ cycles: 5, amp: 2.0, round: true }),
    ]);
    const bandLineY = (px, frac, waves) => {
      let y = yBase - amp * frac;
      for (const w of waves) {
        const u = (px / period) * w.cycles;
        y += w.amp * (w.round ? Math.sin(u * Math.PI * 2) : triWave(u));
      }
      return y;
    };
    const band = (col, frac, waves) => {
      x.save();
      ridgePath();
      x.clip();
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(-OVER, top);
      x.lineTo(period + OVER, top);
      for (let px = period + OVER; px >= -OVER; px -= 2) {
        x.lineTo(px, bandLineY(px, frac, waves));
      }
      x.closePath();
      x.fill();
      x.restore();
    };
    // Rounded hills keep the soft line they always had; only the peaked range
    // gets the cornered one, because only it is meant to read as rock.
    const rockLine = peak ? ROCK_LINE : ROUND_LINE;
    const snowLine = peak ? SNOW_LINE : ROUND_LINE;
    if (rock) band(rock, 0.46, rockLine);
    if (snow) band(snow, 0.62, snowLine);
    if (strata) {
      // Sedimentary bands are clipped to the mesa body, so they disappear at
      // the cut face instead of becoming sky lines. The slight alpha keeps
      // the cool rock readable through paper grain without suggesting shrubs.
      for (const stripe of strata) {
        const fromTop = Math.max(0, Math.min(1, Number(stripe.fromTop) || 0));
        const y = top + amp * fromTop;
        const height = Math.max(1, Number(stripe.height) || 1);
        x.save();
        ridgePath();
        x.clip();
        x.globalAlpha = Number.isFinite(Number(stripe.alpha))
          ? Math.max(0, Math.min(1, Number(stripe.alpha))) : 1;
        x.fillStyle = stripe.color || color;
        x.fillRect(-OVER, y, period + OVER * 2, height);
        x.restore();
      }
    }
    if (surface) {
      desertHillSurfaceDetails(x, ridge, ridgePath, period, yBase, amp, surface);
    }
    // Trunk-and-crown trees along the ridge, baked in so they cost nothing per
    // frame. Each is drawn at tx-period and tx+period too: the ridge is
    // periodic, so one straddling the tile edge shows its other half on the
    // neighbouring copy. The crown is three overlapping circles rather than one
    // — a lone circle reads as a lollipop at this size.
    const paintTrees = () => {
      // A trunk with a horizontal foot cannot stand on a sloped ridge. The
      // near crest falls two thirds of a pixel per pixel here, so across a
      // trunk barely three pixels wide the downhill corner floats over open
      // grass while the uphill corner buries — and the trunk's own flat
      // bottom edge shows as a cut in the hillside. Clip each trunk to the
      // SKY SIDE of the ridge and run it well past the crest: the cut is then
      // the ground line itself, at every x across the trunk, on any slope.
      // The crowns stay unclipped — one growing near a downslope is meant to
      // overhang the hill behind it.
      const skyPath = () => {
        x.beginPath();
        x.moveTo(-OVER, tileTop - 8);
        x.lineTo(period + OVER, tileTop - 8);
        for (let px = period + OVER; px >= -OVER; px -= 2) x.lineTo(px, ridge(px));
        x.closePath();
      };
      for (const tree of ridgeTreeSamples(period, treeScale)) {
        const { tx, th, broadleaf } = tree;
        const by = ridge(tx) + 1;                       // bite into the hill
        for (const dx of [-period, 0, period]) {
          const cx = tx + dx;
          const trunkTop = by - th * 0.55;
          x.save();
          skyPath();
          x.clip();
          x.fillStyle = trees.trunk;
          // Down to the floor of the tile; the clip decides where it ends.
          x.fillRect(cx - th * 0.07, trunkTop, th * 0.14,
            H + HILL_UNDERFILL - trunkTop);
          x.restore();
          x.fillStyle = trees.leaf;
          if (!broadleaf) {
            // pine: two stacked tiers, narrowing to a point
            const w = th * 0.34;
            x.beginPath();
            x.moveTo(cx, by - th);
            x.lineTo(cx + w * 0.72, by - th * 0.52);
            x.lineTo(cx - w * 0.72, by - th * 0.52);
            x.closePath();
            x.fill();
            x.beginPath();
            x.moveTo(cx, by - th * 0.78);
            x.lineTo(cx + w, by - th * 0.22);
            x.lineTo(cx - w, by - th * 0.22);
            x.closePath();
            x.fill();
          } else {
            // broadleaf: three overlapping circles — one alone reads as a lollipop
            const r = th * 0.30;
            const crownCircle = (px, py, radius) => {
              x.beginPath();
              x.arc(px, py, radius, 0, Math.PI * 2);
              x.fill();
            };
            const crownEllipse = (px, py, rx, ry) => {
              x.beginPath();
              x.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
              x.fill();
            };
            // Each lobe is a separate path. Appending complete circles to one
            // path makes Canvas connect their endpoints with straight lines;
            // the resulting compound winding was the triangular sky hole on
            // the right-hand join.
            crownCircle(cx, by - th * 0.72, r);
            crownCircle(cx - r * 0.85, by - th * 0.52, r * 0.78);
            crownCircle(cx + r * 0.85, by - th * 0.52, r * 0.78);
            // The three lower lobes can leave an open sky notch at the upper
            // joins when the tree is enlarged. Broad connector ellipses make
            // the crown one continuous silhouette while keeping the lobed
            // outline visible at gameplay scale.
            crownEllipse(cx - r * 0.58, by - th * 0.64, r * 0.82, r * 0.58);
            crownEllipse(cx + r * 0.58, by - th * 0.64, r * 0.82, r * 0.58);
          }
        }
      }
    };
    if (paper) {
      // Keep one continuous material fill across the cached tile so the
      // texture cannot expose raster seams at sheet boundaries. The shadow and
      // contour remain per-sheet, which is the visual cue that separates the
      // hills without painting vertical cuts into the body.
      paperFinishPass(x, ridgePath, sharedPaperPatternFor(x, paperMaterial), {
        grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA * paperStrength,
        rim: false,
      });
      for (const [from, to] of paperSheets) {
        x.save();
        x.strokeStyle = PAPER_LANDMARK_RIM_COLOR;
        x.lineWidth = PAPER_LANDMARK_RIM_WIDTH;
        strokePaperPath(x, () => sheetEdge(from, to));
        x.restore();
      }
    }
    // Trees go down LAST. The crest rim highlight is a stroke centred on the
    // ridge, so drawn after the trees it painted a pale bar straight across
    // the bark; behind them it reads as the ground passing behind the trunk.
    if (trees) paintTrees();
    hillCache.set(key, tile);
  }
  const off = ridgeScroll(camX, factor, period).off;
  const prev = ctx.imageSmoothingEnabled;
  // The cached tile already contains its antialiased ridge. Smoothing the
  // destination rectangle again makes fractional portrait tile edges sample
  // transparent texels and exposes a one-pixel join; nearest-neighbour keeps
  // the abutting copies closed while the outer canvas scaling remains smooth.
  ctx.imageSmoothingEnabled = false;
  const coverage = backgroundPaintCoverage(ctx);
  const fullH = H - tileTop + HILL_UNDERFILL;
  // DO NOT RASTERIZE THE PART OF THE TILE THAT IS UNDER THE FLOOR OF THE SCREEN.
  //
  // The tile is baked to `H + HILL_UNDERFILL` so that a background driven UP
  // (going below the lane) never runs out of body — see the note on
  // HILL_UNDERFILL. In landscape that overshoot is small. In portrait H is ~1041
  // AND the whole pass is scaled by backgroundZoom around the groundline, so the
  // tile is drawn into local y 166..1261 while only about -236..349 is on the
  // canvas: better than four fifths of every blit is fill the GPU throws away,
  // once per horizontal tile per parallax layer per frame.
  //
  // Only the BOTTOM is clipped, and the source rect keeps its origin at row
  // zero with the height rounded UP to a whole source row. That holds the
  // vertical mapping at exactly 1/SS, so the rows that do survive land on the
  // same destinations as before and the blit cannot resample differently — the
  // picture is identical, there is simply less of it below the frame.
  const band = backgroundPaintBand(ctx);
  const clipped = Math.min(fullH, Math.max(0, band.bottom - tileTop));
  // A layer whose crest has gone below the bottom of the screen clips to
  // nothing. Keep one source row rather than skipping the blit outright: the
  // cost is already negligible at that point, and it means an arithmetic slip
  // in the band can never express itself as hills that vanish.
  const sh = clipped < fullH
    ? Math.min(tile.height, Math.max(1, Math.ceil(clipped * SS))) : 0;
  const dh = sh ? sh / SS : fullH;
  // Start one tile early so a positive portrait shift also fills the left
  // edge. The canvas clips the extra copy in the identity path.
  for (let x0 = coverage.left - off - period; x0 < coverage.right; x0 += period) {
    if (sh) {
      ctx.drawImage(tile, 0, 0, tile.width, sh,
        x0 - MARGIN, tileTop, period + MARGIN * 2, dh);
    } else {
      ctx.drawImage(tile, x0 - MARGIN, tileTop,
        period + MARGIN * 2, fullH);
    }
  }
  ctx.imageSmoothingEnabled = prev;
}

// PLUMBER NEAR-HILL SCENERY -------------------------------------------------
// Small handmade vignettes keep Plumber's open hills from feeling empty. The
// placement sequence is deterministic scenery data, separate from gameplay
// RNG, and each finished prop is baked once at the current render density.
const PLUMBER_SCENERY_SPACING = 122;
const PLUMBER_SCENERY_CULL_MARGIN = 74;
const PLUMBER_NEAR_TREE_SCALE = 1.45;
const PLUMBER_NEAR_TREE_WL = 50;
const PLUMBER_NEAR_TREE_FACTOR = 0.35;
const PLUMBER_NEAR_TREE_PERIOD = Math.max(16, Math.round(Math.PI * PLUMBER_NEAR_TREE_WL));
const PLUMBER_SCENERY_SPRITE_PAD = 3;
// Bushes and houses are not in this table: their boxes live with their art in
// plumberBushes.js (PLUMBER_BUSH_LAYERS) and plumberHouses.js (PLUMBER_HOUSE_BODIES),
// baked here under the kinds 'bush:<layer>' and 'house:<type>'.
const PLUMBER_SCENERY_SPRITE_DIMENSIONS = Object.freeze({
  flower: [20, 12], grass: [14, 9], fence: [34, 16],
});
// Houses are landmarks, not scenery wallpaper. One reserved slot every 48
// placement cells gives a one-to-two-house level at the current stage lengths,
// while keeping the exact cell deterministic across cameras and wraps. At ZOOM 2 a
// landscape stage (52-58 cells) meets only band 0's house (cell 28); portrait (ZOOM
// 3.5, 91-101 cells) also meets band 1's (cell 70, stepped off 69 to clear a flock;
// see plumberHouseCellForBand).
const PLUMBER_SCENERY_HOUSE_BLOCK = 48;
const PLUMBER_SCENERY_HOUSE_START = 12;
const PLUMBER_SCENERY_PALETTE = Object.freeze({
  stem: '#4f8650', leaf: '#6d9c55', petal: '#eee4bf', petalPink: '#cf8d9c',
  pollen: '#bd9546',
  timber: '#c9b78b', timberShade: '#a18b65',
});
const plumberScenerySpriteCache = new Map();
let plumberSceneryCacheSS = 0;

function plumberSceneryHash(value) {
  let x = (Number(value) | 0) ^ 0x6d2b79f5;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0);
}

// A house never stands in a sheep flock. The flock (drawPlumberLife: one on every summit
// tile plumberFlockTile() picks) spreads ~72 px either side of its summit, dog included,
// and a house ~30 px, both in the same near-ridge plane (x = cell * SPACING against
// k * PERIOD + summit, whatever the zoom or camera). So a band's hashed house cell steps
// RIGHT a cell at a time until no flock tile lies within PLUMBER_HOUSE_FLOCK_CLEAR of
// it. Checked against every tile the flock rule allows, so the landmark exclusion (which
// only removes flocks) cannot matter: clear on every stage, in every orientation. Today
// this moves band 1's house 69 -> 70 (and band 6's, 314 -> 315, past any stage);
// band 0's (cell 28) is already clear.
const PLUMBER_HOUSE_FLOCK_CLEAR = 110;
const plumberHouseCellCache = new Map();
function plumberHouseCellForBand(band) {
  const cached = plumberHouseCellCache.get(band);
  if (cached !== undefined) return cached;
  const base = band * PLUMBER_SCENERY_HOUSE_BLOCK + PLUMBER_SCENERY_HOUSE_START
    + (plumberSceneryHash(band * 37 + 211) % 17);
  const P = PLUMBER_NEAR_TREE_PERIOD;
  const summit = plumberNearSummit(P);
  const clearOfFlocks = (cell) => {
    const x = cell * PLUMBER_SCENERY_SPACING;
    for (let k = Math.floor((x - summit - PLUMBER_HOUSE_FLOCK_CLEAR) / P);
      k <= Math.ceil((x - summit + PLUMBER_HOUSE_FLOCK_CLEAR) / P); k++) {
      if (plumberFlockTile(k) && Math.abs(k * P + summit - x) < PLUMBER_HOUSE_FLOCK_CLEAR) return false;
    }
    return true;
  };
  let cell = base;
  for (let d = 0; d < 8; d++) if (clearOfFlocks(base + d)) { cell = base + d; break; }
  if (plumberHouseCellCache.size > 64) plumberHouseCellCache.clear();
  plumberHouseCellCache.set(band, cell);
  return cell;
}

function plumberSceneryClusterForCell(cell) {
  const houseBand = Math.floor(cell / PLUMBER_SCENERY_HOUSE_BLOCK);
  if (cell === plumberHouseCellForBand(houseBand)) return 'house';
  const slot = plumberSceneryHash(cell) % 100;
  if (slot < 22) return 'flowers';
  if (slot < 27) return 'fence';
  if (slot < 37) return 'bush';
  return null;
}

// Which of the four shipped houses (plumberHouses.js: rose, pink, farm, hut) stands
// in house cell `cell` on plumber stage `stage`. Every stage starts at camera 0, so
// the house cells are the same on all three; the stage offsets the cycle so each
// stage's first house differs, and each later band steps it on (+3, i.e. back one),
// so consecutive houses always differ. Landscape sees band 0 only: plumber-1 rose,
// plumber-2 pink, plumber-3 farm. Portrait adds band 1: plumber-1 hut, plumber-2
// rose, plumber-3 pink — so the hut is the one house seen only in portrait.
function plumberHouseTypeFor(cell, stage = 1) {
  const band = Math.floor(cell / PLUMBER_SCENERY_HOUSE_BLOCK);
  const s = Math.max(1, Math.round(Number(stage) || 1));
  const n = PLUMBER_HOUSE_TYPES.length;
  return PLUMBER_HOUSE_TYPES[(((s - 1 + 3 * band) % n) + n) % n];
}

// Which of the three shipped bushes (plumberBushes.js: hedgerow, gorse, robin) a
// bush-bearing cell plants. The 'bush' and 'fence' clusters carry exactly one bush
// (a house brings its own garden), so bushes are counted cell by cell within each
// house band (PLUMBER_SCENERY_HOUSE_BLOCK cells) and take the types in rotation from
// a hashed start, stepping forwards or backwards per band. So the mix is an even
// third each, consecutive bushes always differ inside a band, and only a band
// boundary can repeat one (1 in 3).
const PLUMBER_BUSH_CLUSTERS = new Set(['bush', 'fence']);
const plumberBushTypeCache = new Map();
function plumberBushTypeForCell(cell) {
  const cached = plumberBushTypeCache.get(cell);
  if (cached) return cached;
  const band = Math.floor(cell / PLUMBER_SCENERY_HOUSE_BLOCK);
  let ordinal = 0;
  for (let c = band * PLUMBER_SCENERY_HOUSE_BLOCK; c < cell; c++) {
    if (PLUMBER_BUSH_CLUSTERS.has(plumberSceneryClusterForCell(c))) ordinal++;
  }
  const bandHash = plumberSceneryHash(band * 53 + 907);
  const step = bandHash & 1 ? 1 : 2;
  const type = PLUMBER_BUSH_TYPES[(bandHash % 3 + ordinal * step) % 3];
  if (plumberBushTypeCache.size > 512) plumberBushTypeCache.clear();
  plumberBushTypeCache.set(cell, type);
  return type;
}

function plumberNearTreeCenters(ctx, camX) {
  const coverage = backgroundPaintCoverage(ctx);
  const off = ridgeScroll(camX, PLUMBER_NEAR_TREE_FACTOR, PLUMBER_NEAR_TREE_PERIOD).off;
  const trees = ridgeTreeSamples(PLUMBER_NEAR_TREE_PERIOD, PLUMBER_NEAR_TREE_SCALE);
  const centers = [];
  for (let x0 = coverage.left - off - PLUMBER_NEAR_TREE_PERIOD;
    x0 < coverage.right; x0 += PLUMBER_NEAR_TREE_PERIOD) {
    for (const tree of trees) {
      centers.push({ x: x0 + tree.tx, halfWidth: tree.halfWidth });
    }
  }
  return centers;
}

function plumberFlowerOverlapsTree(treeCenters, x, scale = 1) {
  const flowerHalfWidth = (PLUMBER_SCENERY_SPRITE_DIMENSIONS.flower[0]
    + PLUMBER_SCENERY_SPRITE_PAD * 2) * scale * 0.5;
  return treeCenters.some((tree) =>
    Math.abs(x - tree.x) <= flowerHalfWidth + tree.halfWidth + 1);
}

function plumberSceneryFill(ctx, source, color, paper, paperMaterial, paperStrength, options = {}) {
  if (paper) {
    drawPaperShape(ctx, source, color, {
      pattern: sharedPaperPatternFor(ctx, paperMaterial),
      deep: options.deep || PAPER_SUBTLE_DEEP_OFFSET,
      contact: options.contact || PAPER_SUBTLE_CONTACT_OFFSET,
      deepColor: options.deepColor || PAPER_SUBTLE_DEEP_COLOR,
      contactColor: options.contactColor || PAPER_SUBTLE_CONTACT_COLOR,
      grainAlpha: PAPER_GRAIN_ALPHA * paperStrength,
      rim: options.rim !== false,
      strokeStyle: options.strokeStyle,
      lineWidth: options.lineWidth,
    });
  } else {
    ctx.fillStyle = color;
    fillPaperPath(ctx, source);
  }
}

function plumberSceneryRect(ctx, x, y, width, height, color, paper, material, strength) {
  plumberSceneryFill(ctx, () => {
    ctx.beginPath(); ctx.rect(x, y, width, height);
  }, color, paper, material, strength, { rim: false });
}

function plumberScenerySprite(kind, variant, paper, paperMaterial, paperStrength) {
  const SS = bakeSS();
  if (SS !== plumberSceneryCacheSS) {
    plumberScenerySpriteCache.clear();
    plumberSceneryCacheSS = SS;
  }
  const key = `${kind}|${variant}|${paper ? 1 : 0}|${paperMaterial}|${paperStrength}|${SS}`;
  const cached = plumberScenerySpriteCache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;
  // 'bush:<layer>' — a layer of one of the shipped bushes (plumberBushes.js),
  // painted with its base centre at the origin in the box's own units.
  const bushLayer = typeof kind === 'string' && kind.startsWith('bush:') ? kind.slice(5) : null;
  const bushBox = bushLayer ? PLUMBER_BUSH_LAYERS[bushLayer] : null;
  // 'house:<type>' — one shipped house's static body (plumberHouses.js), baked over
  // its own box [x0, y0, w, h] in local units; the sprite carries x0/y0 to seat it.
  const houseType = typeof kind === 'string' && kind.startsWith('house:') ? kind.slice(6) : null;
  const houseBox = houseType ? PLUMBER_HOUSE_BODIES[houseType] : null;
  const dimensions = bushBox ? [bushBox.width, bushBox.height]
    : houseBox ? [houseBox[2], houseBox[3]] : PLUMBER_SCENERY_SPRITE_DIMENSIONS[kind];
  if (!dimensions) return null;
  const [width, height] = dimensions;
  // A few paper passes extend beyond the nominal silhouette. Keep a small
  // logical pad in the source canvas so a rim/shadow cannot be clipped; the
  // draw path below subtracts that pad when recovering the attached baseline.
  const pad = bushBox ? bushBox.pad : houseBox ? 0 : PLUMBER_SCENERY_SPRITE_PAD;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((width + pad * 2) * SS);
    canvas.height = Math.ceil((height + pad * 2) * SS);
    const g = canvas.getContext('2d');
    if (!g) return null;
    if (typeof g.setTransform === 'function') g.setTransform(SS, 0, 0, SS, 0, 0);
    else g.scale(SS, SS);
    g.translate(pad, pad);
    const p = PLUMBER_SCENERY_PALETTE;
    const fill = (source, color, options) => plumberSceneryFill(
      g, source, color, paper, paperMaterial, paperStrength, options);
    const petal = (cx, cy, rx, ry, color = p.petal) => fill(() => {
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }, color);

    if (bushLayer) {
      g.translate(width * 0.5, height);
      paintPlumberBushLayer(g, bushLayer, plumberBushSeed(variant), { grained: !!paper });
    } else if (kind === 'flower') {
      g.lineCap = 'round'; g.strokeStyle = p.stem; g.lineWidth = 0.8;
      for (const [x, top] of [[4, 6], [10, 3.5], [16, 5.2]]) {
        g.beginPath(); g.moveTo(x, height); g.lineTo(x + (x % 3) - 1, top + 2); g.stroke();
        g.fillStyle = x === 10 ? p.leaf : p.stem;
        g.beginPath(); g.moveTo(x + 0.1, top + 4.8); g.lineTo(x + 3.2, top + 3.4);
        g.lineTo(x + 1.1, top + 6.1); g.closePath(); g.fill();
      }
      const pink = (variant % 3) === 2;
      for (const [x, y, r] of [[4, 4, 1.6], [10, 1.8, 1.9], [16, 3.2, 1.6]]) {
        const c = pink && x === 16 ? p.petalPink : p.petal;
        petal(x - r, y, r * 0.95, r * 0.58, c); petal(x + r, y, r * 0.95, r * 0.58, c);
        petal(x, y - r * 0.78, r * 0.58, r * 0.95, c); petal(x, y + r * 0.78, r * 0.58, r * 0.95, c);
        petal(x, y, r * 0.62, r * 0.62, p.pollen);
      }
    } else if (kind === 'grass') {
      for (const [x, lean, c] of [[3, -2, p.stem], [7, 1, p.leaf], [11, -1, p.stem]]) {
        g.fillStyle = c; g.beginPath(); g.moveTo(x, height); g.lineTo(x + lean, 1);
        g.lineTo(x + 2.2, height); g.closePath(); g.fill();
      }
    } else if (kind === 'fence') {
      g.fillStyle = p.timberShade;
      g.beginPath(); g.moveTo(2, 6); g.lineTo(31, 4.5); g.lineTo(31, 6.5); g.lineTo(2, 8); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(3, 10); g.lineTo(30, 9); g.lineTo(30, 11); g.lineTo(3, 12); g.closePath(); g.fill();
      for (const [x, lean] of [[3, -0.5], [17, 0.4], [30, -0.35]]) {
        fill(() => { g.beginPath(); g.moveTo(x - 1 + lean, height); g.lineTo(x - 0.75, 2.5); g.lineTo(x + 1.35, 2.8); g.lineTo(x + 1 + lean, height); g.closePath(); }, p.timber, { rim: false });
        plumberSceneryRect(g, x + 0.7, 3.3, 0.6, 11, p.timberShade, false, paperMaterial, paperStrength);
      }
    } else if (houseBox) {
      g.translate(-houseBox[0], -houseBox[1]);
      paintPlumberHouseBody(g, houseType, !!paper);
    }
    const sprite = { canvas, width: width + pad * 2, height: height + pad * 2, pad };
    if (houseBox) { sprite.x0 = houseBox[0]; sprite.y0 = houseBox[1]; }
    plumberScenerySpriteCache.set(key, sprite);
    return sprite;
  } catch {
    return null;
  }
}

function plumberSceneryPlacements(ctx, camX, layerBaseY = GROUND_Y) {
  const view = backgroundPaintCoverage(ctx);
  const travel = camX * PLUMBER_NEAR_TREE_FACTOR * ZOOM;
  const treeCenters = plumberNearTreeCenters(ctx, camX);
  const first = Math.floor((travel - PLUMBER_SCENERY_CULL_MARGIN) / PLUMBER_SCENERY_SPACING);
  const last = Math.ceil((travel + view.width + PLUMBER_SCENERY_CULL_MARGIN) / PLUMBER_SCENERY_SPACING);
  const placements = [];
  const add = (cell, anchorX, kind, dx, scale = 1, variant = 0, baseOffset = 0) => {
    const x = anchorX + dx;
    if (outsideView(ctx, x, PLUMBER_SCENERY_CULL_MARGIN)) return;
    if (kind === 'flower' && plumberFlowerOverlapsTree(treeCenters, x, scale)) return;
    const crest = ridgeYAt(x, camX, layerBaseY, 34, PLUMBER_NEAR_TREE_WL,
      PLUMBER_NEAR_TREE_FACTOR, { coverageLeft: view.left });
    const prop = { cell, kind, x, baseY: crest + 1 + baseOffset, scale, variant };
    if (kind === 'bush') prop.bush = plumberBushTypeForCell(cell);
    placements.push(prop);
  };
  for (let cell = first; cell <= last; cell++) {
    const cluster = plumberSceneryClusterForCell(cell);
    if (!cluster) continue;
    const anchorX = view.left + cell * PLUMBER_SCENERY_SPACING - travel;
    const variant = plumberSceneryHash(cell + 19) % 3;
    if (cluster === 'flowers') {
      add(cell, anchorX, 'flower', -6, 0.9, variant); add(cell, anchorX, 'flower', 7, 0.78, (variant + 1) % 3); add(cell, anchorX, 'grass', -14, 0.85, variant);
    } else if (cluster === 'fence') {
      add(cell, anchorX, 'fence', 0, 0.92, variant, 17); add(cell, anchorX, 'bush', -18, 0.78, variant, 12); add(cell, anchorX, 'flower', 18, 0.68, (variant + 1) % 3, 4);
    } else if (cluster === 'bush') {
      add(cell, anchorX, 'bush', 0, 0.9, variant, 12); if (variant === 1) add(cell, anchorX, 'flower', -10, 0.62, 2, 5);
    } else if (cluster === 'house') {
      // The house brings its own garden (lawn, fence, planting): no separate bush or
      // fence. It stands at full scale, its foot 29px into the hill face.
      add(cell, anchorX, 'house', 0, 1, variant, 28);
    }
  }
  return placements;
}

// One shipped bush (plumberBushes.js) in bush units, its base centre at the origin.
// Hedgerow and gorse are one baked blit; the robin hedge is two baked sheets and a
// baked bird composed per frame at time `t` (`seed` keeps each robin on its own clock).
function drawPlumberBush(ctx, type, variant, t, seed, paper, paperMaterial, paperStrength) {
  const sprite = (layer) => plumberScenerySprite(`bush:${layer}`, variant, paper, paperMaterial, paperStrength);
  if (type === 'robin') {
    const back = sprite('robinBack'); const front = sprite('robinFront');
    if (!back || !front) return false;
    drawPlumberRobinHedge(ctx, t, seed, back, front,
      plumberScenerySprite('bush:robinBird', 0, paper, paperMaterial, paperStrength));
    return true;
  }
  const body = sprite(type);
  if (!body) return false;
  blitPlumberBushSprite(ctx, body);
  return true;
}

// One shipped house (plumberHouses.js) in local units, its foot centre at the origin:
// the baked body, then its moving parts (smoke, washing, gate, dog, hens, lamb) live.
function drawPlumberHouse(ctx, type, t, paper, paperMaterial, paperStrength) {
  const body = plumberScenerySprite(`house:${type}`, 0, paper, paperMaterial, paperStrength);
  if (!body) return false;
  ctx.drawImage(body.canvas, body.x0, body.y0, body.width, body.height);
  drawPlumberHouseLive(ctx, type, t, !!paper);
  return true;
}

// `t` animates the robin hedges and the houses; `stage` (the plumber stage index)
// picks which house stands in each house cell (plumberHouseTypeFor).
function drawPlumberScenery(ctx, camX, layerBaseY, paper, paperMaterial, paperStrength, t = 0, stage = 1) {
  const coverage = backgroundPaintCoverage(ctx);
  const clipToRidge = (prop, width) => {
    const left = prop.x - width * 0.5 - 2;
    const right = prop.x + width * 0.5 + 2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = left + (right - left) * i / 6;
      const y = ridgeYAt(x, camX, layerBaseY, 34, 50, 0.35,
        { coverageLeft: coverage.left });
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(right, H + HILL_UNDERFILL); ctx.lineTo(left, H + HILL_UNDERFILL); ctx.closePath();
    ctx.clip();
  };
  // The bake-off seam (src/dev/plumber-bush-candidates.js, plumber-house-candidates.js):
  // a harness may set ctx.__mashPlumberSceneryOverride(ctx, prop, t, stage). It is
  // called for each bush and house in that prop's own frame (origin at its foot, scaled,
  // a bush already crest-clipped); returning true skips the shipped painter. Unset in game.
  const override = typeof ctx.__mashPlumberSceneryOverride === 'function'
    ? ctx.__mashPlumberSceneryOverride : null;
  for (const prop of plumberSceneryPlacements(ctx, camX, layerBaseY)) {
    if (prop.kind === 'bush') {
      const box = PLUMBER_BUSH_LAYERS.hedgerow;
      ctx.save();
      clipToRidge(prop, (box.width + box.pad * 2) * prop.scale);
      ctx.translate(prop.x, prop.baseY);
      ctx.scale(prop.scale, prop.scale);
      if (!(override && override(ctx, prop, t, stage))) {
        drawPlumberBush(ctx, prop.bush, prop.variant, t, prop.cell * 7 + 3,
          paper, paperMaterial, paperStrength);
      }
      ctx.restore();
      continue;
    }
    if (prop.kind === 'house') {
      // Not clipped to the crest: the roof and chimney stand up over the ridge line.
      ctx.save();
      ctx.translate(prop.x, prop.baseY);
      ctx.scale(prop.scale, prop.scale);
      if (!(override && override(ctx, prop, t, stage))) {
        drawPlumberHouse(ctx, plumberHouseTypeFor(prop.cell, stage), t,
          paper, paperMaterial, paperStrength);
      }
      ctx.restore();
      continue;
    }
    const sprite = plumberScenerySprite(prop.kind, prop.variant, paper, paperMaterial, paperStrength);
    if (!sprite) continue;
    const width = sprite.width * prop.scale; const height = sprite.height * prop.scale;
    const pad = sprite.pad * prop.scale;
    const x = prop.x; const baseY = prop.baseY;
    const embedded = prop.kind === 'fence';
    if (embedded) ctx.save();
    if (embedded) clipToRidge(prop, width);
    ctx.drawImage(sprite.canvas, x - width * 0.5, baseY - height + pad, width, height);
    if (embedded) ctx.restore();
  }
}

// A single volcano, pinned to one spot in the level rather than tiled: it lives
// in the background parallax, so its screen x is chosen to put it at centre
// exactly when the camera reaches `atCam`.
//
// It sits BEHIND the far hill range — drawn before that layer, so the range's
// crests cut across its flanks and only the summit clears the ridgeline. That
// occlusion is the depth cue doing the work; scale alone cannot sell distance
// against flat silhouettes. Two things follow from being back there:
//
//   - Its height is set against its occluder, not chosen freely: the far crests
//     reach ~96px, so the cone must clear that to exist at all, but only by
//     enough to show its molten cap. Overshoot it and the volcano towers over
//     the range instead of standing behind it, which reads as foreground again.
//   - It parallaxes SLOWER than the far layer, so it drifts behind the range
//     as the camera moves rather than travelling locked to it.
//
// It is drawn in the same flat-cartoon language as the props (sprites/props.js):
// flat fills, one dark outline, no gradients — a mauve-slate cone with a lit
// face and a shadow face, a molten cap that has overflowed the crater and
// congealed in drips down the upper slopes, flows running the rest of the way,
// and billowing smoke off the summit.
//
// Distance here is carried ENTIRELY by occlusion, scale and parallax — not by
// haze. An earlier pass also desaturated the palette and thinned the outline,
// which is the usual way to push something back, but it made the volcano read
// as atmosphere rather than as art: the whole point is that it is a drawn
// cartoon object in the reference's style, and bold linework is what says so.
// So the ink and fills stay at reference weight even back here.
//
// Palette note: the lava yellow tops out around 0.75 luma, under the glfx.js
// bloom bright-pass cutoff (~0.8). Pushing it to a true cartoon #ffd400 (0.84)
// makes the summit clip to flat white through the bloom composite.
const V_ROCK = '#7a6b76';        // lit face
const V_ROCK_DK = '#5f515f';     // shadow face
// Lava ramp, hottest first. Index 0 sits at the crater mouth and the ramp
// cools outward down the cap, so the vent reads as the source. Note this is
// upside down physically — real lava is yellow-white at the vent and reddens
// as it cools — but red-at-the-mouth is the cartoon convention the reference
// and every arcade volcano use, and it is what makes the crater legible.
const V_LAVA = ['#b8352a', '#c8452a', '#d55b2c', '#de742f', '#e58c34', '#e5a23c'];
const V_INK = 'rgba(22,14,30,0.72)';
// Opaque twin of V_INK, for the smoke layer: that puff is composited solid and
// faded once at the blit, so an alpha ink there would double up.
const V_INK_SOLID = '#3a3040';
// Depth of field. The volcano is flattened and blurred ONCE, as a single image,
// which is the one distance cue that does not fight the bold reference palette:
// it recedes without desaturating anything. Blurring each shape as it is drawn
// would be wrong — every internal edge would soften separately and the overlaps
// would go muddy.
//
// Held to the point where the cap's scalloped drips still read as separate
// tongues. That fringe is the most recognisable thing in the silhouette, and it
// is only ~40px tall on screen, so it is the first detail the blur eats: at the
// 1.15 this used to sit at, the tongues smeared into one soft band and the cap
// stopped looking poured. Anything below ~0.3 loses the recession entirely and
// the ink outline starts to alias against the sky.
//
// ctx.filter is unsupported in a few older engines; there it silently no-ops
// and the volcano simply draws sharp, which is a fine degradation.
const V_BLUR = 0.6;
// Plume shape: `sc` scales the puffs, `rise` how far the column climbs. Kept
// module-level because the composite layer must reserve headroom for whatever
// they add up to — a hardcoded margin silently crops the plume the moment
// either is raised.
const V_SMOKE_SC = 0.85, V_SMOKE_RISE = 1.6;
// tallest puff centre above the vent, plus its own radius, plus slack
const V_SMOKE_TOP = Math.ceil((8 + 92 * V_SMOKE_RISE + 28) * V_SMOKE_SC) + 16;
const V_SS = 2;

// The volcano is expensive to draw and almost entirely STATIC. Every path in
// it — the cone, the shadow faces, the scalloped lava fringe, the crater
// crescent — is fixed geometry, and horizontal parallax is pure translation:
// it changes where the layer lands on screen, not one pixel of what is inside
// it. Rebuilding all of that per frame cost ~1.1ms of the ~2.3ms this function
// used to spend, for an image identical to the previous frame's.
//
// So the fixed stack is rasterised ONCE into bake canvases, and the layer is
// composed at a FIXED subpixel phase (`CXB`) instead of at the live `cx`. The
// fractional parallax offset moves to the final blit — which is where it
// already was — so motion is unchanged; only the interior stops being rebuilt.
// A side benefit: the interior no longer re-rasterises at a different subpixel
// phase every frame, which is what made the ink edges shimmer as it drifted.
//
// TWO bakes rather than one, because the animated highlight sweep composites
// in the MIDDLE of the stack: over the lava gradient, under the cap's ink
// outline and the crater crescent. `under` is everything below the sweep,
// `over` everything above it.

// ---- fixed geometry (none of it depends on camera position) ----
// Proportioned against the far range rather than as a standalone cone: those
// crests are ~96 tall over a ~141 half-width (ratio ~0.7), so a tall narrow
// spire reads as a different kind of landform sitting among them. The flanks
// also follow a power curve instead of a straight line — `flankX` widens
// fastest near the summit, which blunts the apex the way a real massif is
// blunt. A straight-sided triangle is what made it read as pointy.
const V_HGT = 82, V_HALF_BASE = 104, V_NOTCH = 15;
// GROUNDED: the volcano stands on the same groundline as everything else.
//
// An earlier version lifted its base toward the horizon so it could be shrunk
// and still clear the 96px range in front of it. That bought smallness at the
// cost of looking unanchored, and it made the cone read as pointy — with the
// summit only just clearing the crests, the sole visible part was the steep
// tip, whatever the overall ratio said.
//
// Standing on the groundline means it CANNOT out-rise the range at this size,
// and that is the accepted trade: the peaks hide it, it shows through the
// valleys between them, and the plume carries it the rest of the time. Size
// is therefore chosen against the range's SHOULDER peaks (~0.55 * 96 = 53)
// rather than its main crests — high enough to clear the shoulders, low
// enough that the main peaks still cut across it.
const V_BASE_Y = GROUND_Y;
const V_APEX = V_BASE_Y - V_HGT;
const vFlankX = (f) => V_HALF_BASE * Math.pow(f, 0.72); // f: 0 at apex, 1 at base
// The silhouette does NOT stop at V_HALF_BASE. `V_BASE_Y` only sets
// proportions — the cone keeps descending to GROUND_Y, so the flanks are
// extrapolated past f=1 and the true half-width at the groundline is
// vFlankX(V_F_BASE), which is wider than V_HALF_BASE and grows every time the
// base is lifted. Sizing the layer or the cull off V_HALF_BASE slices that
// skirt off at a hard vertical edge, so both use the real extent.
const V_F_BASE = (GROUND_Y - V_APEX) / V_HGT;
const V_MAX_HALF = vFlankX(V_F_BASE);
// Layer bounds. The plume climbs well above the summit and is part of the same
// image, so it has to fit inside the blurred layer too — clipping it at the
// summit would leave a hard cut where the smoke crosses the edge.
const V_PAD = 6;
const V_LY = V_APEX - V_SMOKE_TOP;                                  // layer top, absolute y
const V_LW = Math.ceil(V_MAX_HALF * 2 + V_PAD * 2);
const V_LH = Math.ceil(GROUND_Y + 2 - V_LY);
// Where the summit sits inside the layer. Everything below is drawn against
// this instead of the live `cx`, which is what makes the bake reusable.
const CXB = V_MAX_HALF + V_PAD;
// The cone is TRUNCATED: `V_NOTCH` is wide enough (~1/4 of the base) that the
// flanks stop well short of `V_APEX` and the top is cut off, leaving a real
// rim-to-rim crater. Earlier passes kept a near-pointed peak and took a small
// nick out of it, and no depth of nick ever read as a volcano — a pointed
// mountain with a dent is still a pointed mountain. Widening the mouth is
// what does the work; the dish between the rims can then stay very shallow.
//
// `V_APEX` is therefore virtual — the tip the flanks are aimed at, not a place
// on the silhouette. `V_RIM_Y` is the real summit, so everything that used to
// hang off the apex (lava gradient, smoke origin) hangs off the rim instead.
const V_F_T = Math.pow(V_NOTCH / V_HALF_BASE, 1 / 0.72); // where the flank meets the rim
const V_RIM_Y = V_APEX + V_HGT * V_F_T;
const V_CRATER_D = 1.9;  // shallow dish across a wide rim, not a notch in a point
// The cap has to END ABOVE the far range's crests (~96) or the drips — the
// most recognisable part of the silhouette — sit behind the ridgeline and
// never show. That is what pins this fraction, not the look of the cone.
const V_CAP_BOT = V_BASE_Y - V_HGT * 0.70;
const V_LAVA_BOT = V_CAP_BOT + 10;

// The crater is a dip in the SILHOUETTE rather than a shape painted on top: an
// ellipse drawn on a convex outline always reads as a disc resting on the
// mountain, because nothing occludes it. A quadratic's midpoint sits halfway
// to its control point, so the control goes 2x the wanted depth down.
//
// `V_BASE_Y` sets the volcano's PROPORTIONS, but the silhouette still runs all
// the way down to GROUND_Y. Ending the polygon at V_BASE_Y left a flat cut
// edge hanging in mid-air wherever the range dipped below it — the cone has to
// keep descending until something covers it. So the flanks are extrapolated
// past f=1 to whatever fraction lands on the groundline; that extra skirt is
// always hidden behind the hills.
function vConePath() {
  const p = new Path2D();
  p.moveTo(CXB - vFlankX(V_F_BASE), GROUND_Y);
  for (let f = V_F_BASE; f >= V_F_T; f -= 0.03) p.lineTo(CXB - vFlankX(f), V_APEX + V_HGT * f);
  p.quadraticCurveTo(CXB, V_RIM_Y + V_CRATER_D * 2, CXB + V_NOTCH, V_RIM_Y);
  for (let f = V_F_T; f <= V_F_BASE; f += 0.03) p.lineTo(CXB + vFlankX(f), V_APEX + V_HGT * f);
  p.lineTo(CXB + vFlankX(V_F_BASE), GROUND_Y);
  p.closePath();
  return p;
}
// Molten cap: the lava has overflowed and set into a scalloped fringe of drips
// over the upper third, exactly as in the reference. The fringe is one path —
// a sine-scalloped lower edge whose scallop depth varies per lobe, so it reads
// as poured rather than as a cut band.
//
// `envelope` is what stops the fringe reading as a scalloped ribbon: it makes
// a few lobes run much longer than their neighbours, so the edge is a row of
// uneven tongues (the reference's silhouette) rather than even scallops.
//
// The drip waves are keyed to PIXELS, not to px/V_HALF_BASE. At the cap's
// altitude the cone is only ~43px half-wide, so a wave with a period in
// base-widths spans a third of a cycle across everything visible and the
// fringe flattens into a straight band. Pixel frequencies put ~5 tongues
// across the width that is actually on-cone.
function vCapPath() {
  const p = new Path2D();
  p.moveTo(CXB - V_HALF_BASE, V_APEX - 6);
  p.lineTo(CXB + V_HALF_BASE, V_APEX - 6);
  for (let px = V_HALF_BASE; px >= -V_HALF_BASE; px -= 1.5) {
    // Raised cosine, not |sin|: |sin| has a cusp at every zero, which turns
    // the fringe into a row of sawteeth. (1-cos)/2 is smooth at both ends, so
    // each lobe is a rounded tongue with a rounded notch beside it.
    const envelope = 0.4 + 0.6 * (0.5 - 0.5 * Math.cos(px * 0.16 + 0.7));
    const drip = (0.5 - 0.5 * Math.cos(px * 0.38)) * 10 * envelope
      + (0.5 - 0.5 * Math.cos(px * 0.8 + 1.4)) * 2.5;
    p.lineTo(CXB + px, V_CAP_BOT + drip);
  }
  p.closePath();
  return p;
}

// `cone` and `cap` are kept for the per-frame highlight clip — it needs BOTH,
// see the note where it is drawn. `under`/`over` are the baked halves of the
// static stack.
const volcBake = { under: null, over: null, cone: null, cap: null, ss: 0, paper: false, material: 'cardstockClear' };
// Layer-local drawing happens in ABSOLUTE y and CXB-relative x, so every
// context that touches the volcano wants the same transform.
function volcCtx(canvas, ss) {
  const g = canvas.getContext('2d');
  g.setTransform(ss, 0, 0, ss, 0, -V_LY * ss);
  return g;
}
// Rasterise `paint` into a supersampled full-layer scratch, then resolve the
// band [y0, y1) down to 1x THROUGH the depth-of-field blur.
//
// Baking the blur is the point. The volcano used to composite into a layer and
// blit it back under `ctx.filter = blur(...)` every frame, and that one
// filtered, downscaling blit was the single most expensive thing in the whole
// background — more than every path in the cone put together. A filter on a
// static image is a constant, so it belongs in the bake; the per-frame blit is
// then an ordinary unfiltered one.
//
// The band is tight in Y for the same reason: `under` only needs the cone's
// own ~94 rows, `over` only the ~40 around the cap. Blitting the full layer
// height would drag the plume's 172 rows of empty headroom along with it.
// `out` is the density the slice RESOLVES to. It used to resolve to 1x logical,
// which was invisible while the world rendered at 2-3x and glaring at 5.69x,
// where the cone was being blown up almost six-fold from its own raster. The
// callers still blit at logical size, so only the texel count changes.
//
// Both the source supersample and the blur radius have to follow `out`: the
// blur is specified in the destination canvas's own pixels, so leaving it at
// V_BLUR would shrink the depth-of-field softening to a sixth of its intent.
function bakeSlice(paint, y0, y1, out) {
  const ss = Math.max(V_SS, out);
  const sc = document.createElement('canvas');
  sc.width = V_LW * ss;
  sc.height = V_LH * ss;
  paint(volcCtx(sc, ss));
  const h = Math.ceil(y1 - y0);
  const c = document.createElement('canvas');
  c.width = V_LW * out;
  c.height = h * out;
  const g = c.getContext('2d');
  g.filter = `blur(${V_BLUR * out}px)`;
  g.drawImage(sc, 0, (y0 - V_LY) * ss, V_LW * ss, h * ss, 0, 0, V_LW * out, h * out);
  return { c, y: y0, h };
}
function bakeVolcano(paper = false, paperMaterial = 'cardstockClear') {
  const out = bakeSS();
  // A density change makes the existing bakes the wrong resolution, not merely
  // stale — hold the factor they were built at rather than re-baking blindly.
  if (volcBake.under && volcBake.ss === out && volcBake.paper === paper
    && volcBake.material === paperMaterial) return;
  volcBake.ss = out;
  volcBake.paper = paper;
  volcBake.material = paperMaterial;
  const cone = vConePath(), cap = vCapPath();
  volcBake.cone = cone;
  volcBake.cap = cap;

  // ---- under: rock, ink outline, shadow faces, lava gradient ----
  volcBake.under = bakeSlice((g) => {
  if (paper) {
    paperShadowPass(g, cone, PAPER_DEEP_OFFSET);
    paperShadowPass(g, cone, PAPER_CONTACT_OFFSET, PAPER_CONTACT_COLOR);
  }
  g.fillStyle = V_ROCK;
  g.fill(cone);
  g.strokeStyle = V_INK;
  g.lineWidth = 1.4;
  g.stroke(cone);
  // Shadow face: the right flank plus a wedge down the middle, which is what
  // gives the reference cone its two-plane look at a glance.
  g.save();
  g.clip(cone);
  g.fillStyle = V_ROCK_DK;
  g.beginPath();
  g.moveTo(CXB + V_NOTCH * 0.3, V_APEX);
  g.lineTo(CXB + V_HALF_BASE * 1.4, GROUND_Y);
  g.lineTo(CXB + V_HALF_BASE * 0.28, GROUND_Y);
  g.lineTo(CXB + V_NOTCH * 0.1, V_BASE_Y - V_HGT * 0.44);
  g.closePath();
  g.fill();
  g.beginPath();                             // small gully on the lit face
  g.moveTo(CXB - V_NOTCH * 0.5, V_APEX + 6);
  g.lineTo(CXB - V_HALF_BASE * 0.46, GROUND_Y);
  g.lineTo(CXB - V_HALF_BASE * 0.74, GROUND_Y);
  g.closePath();
  g.fill();
  g.restore();
  // The lava is ONE continuous gradient, reddest at the crater mouth and
  // cooling to orange down the fringe. An earlier pass stacked discrete flat
  // fills instead and stepped visibly — at this size the cap is only ~40px
  // tall, so any band count coarse enough to animate is also coarse enough to
  // read as stripes. A gradient sidesteps the tradeoff entirely.
  g.save();
  g.clip(cone);
  if (paper) {
    g.fillStyle = V_LAVA[Math.floor(V_LAVA.length * 0.55)];
    g.fill(cap);
  } else {
    const grad = g.createLinearGradient(0, V_RIM_Y - 2, 0, V_LAVA_BOT);
    for (let i = 0; i < V_LAVA.length; i++) {
      grad.addColorStop(i / (V_LAVA.length - 1), V_LAVA[i]);
    }
    g.fillStyle = grad;
    g.fill(cap);
  }
  g.restore();
  if (paper) paperFinishPass(g, cone, sharedPaperPatternFor(g, paperMaterial),
    { grainAlpha: 1, rim: false });
  // The cone's own band: the ink stroke's half-width above the summit, down to
  // just past the groundline. Everything above is plume, which is drawn live.
  }, V_RIM_Y - 2, GROUND_Y + 2, out);

  // ---- over: the cap's ink outline and the crater's inner wall ----
  volcBake.over = bakeSlice((h) => {
  h.save();
  h.clip(cone);
  h.strokeStyle = V_INK;
  h.lineWidth = 1.1;
  h.stroke(cap);
  // Inner wall: a crescent hugging the underside of the crater dip, which is
  // the far wall of the bowl seen from slightly below. Two arcs of the same
  // span, the lower one deeper, filled between. This is all the crater needs
  // now that the silhouette carries it — an opaque shape here would put the
  // disc back.
  h.beginPath();
  h.moveTo(CXB - V_NOTCH, V_RIM_Y);
  h.quadraticCurveTo(CXB, V_RIM_Y + V_CRATER_D * 2, CXB + V_NOTCH, V_RIM_Y);
  h.quadraticCurveTo(CXB, V_RIM_Y + (V_CRATER_D + 1.1) * 2, CXB - V_NOTCH, V_RIM_Y);
  h.closePath();
  h.fillStyle = 'rgba(58,32,38,0.24)';
  h.fill();
  h.restore();
  // Rim to the bottom of the longest drip, plus slack for the blur.
  }, V_RIM_Y - 3, V_CAP_BOT + 18, out);
}

function drawVolcano(ctx, t, camX, atCam, yOffset = 0, paper = false, paperMaterial = 'cardstockClear') {
  const cx = viewCenterX(ctx) + (atCam - camX) * VOLCANO_PLX * ZOOM;
  // Culled against the real edges of the picture, so the cone cannot wink into
  // existence while part of it is already on screen. The margin covers the
  // plume and the bake's own overhang past V_MAX_HALF.
  if (outsideView(ctx, cx + V_MAX_HALF, 120)
    && outsideView(ctx, cx - V_MAX_HALF, 120)) return; // off screen
  bakeVolcano(paper, paperMaterial);
  // Straight onto the scene, no intermediate layer: the bakes already carry the
  // depth blur, so there is nothing left that has to be flattened before it can
  // be filtered. `translate` puts the parallax offset on the context, which
  // means the cached cone/cap paths keep working as clips without rebuilding.
  ctx.save();
  ctx.translate(cx - CXB, yOffset);

  // Smoke goes down first so the plume passes BEHIND the summit — puffs that
  // overlap the crater lip read as sitting on top of it otherwise.
  drawVolcanoSmoke(ctx, t, CXB, V_RIM_Y + V_CRATER_D, V_SMOKE_SC, V_SMOKE_RISE);
  const under = volcBake.under;
  ctx.drawImage(under.c, 0, under.y, V_LW, under.h);
  // Motion comes from a soft highlight travelling down the slope instead of
  // from moving the colour fronts. Its alpha follows sin(pi*u), so it fades in
  // at the mouth and out at the fringe rather than popping when it wraps.
  if (!paper) {
    const u = (t * 0.15) % 1;
    const hy = V_RIM_Y + (V_LAVA_BOT - V_RIM_Y) * u;
    const band = 13;
    const hg = ctx.createLinearGradient(0, hy - band, 0, hy + band);
    const a = 0.3 * Math.sin(Math.PI * u);
    hg.addColorStop(0, 'rgba(255,198,96,0)');
    hg.addColorStop(0.5, `rgba(255,198,96,${a})`);
    hg.addColorStop(1, 'rgba(255,198,96,0)');
    ctx.save();
    // BOTH clips, in this order. The cap path spans the full base width, but at
    // the cap's altitude the cone is only ~43px half-wide — the cone clip is
    // what trims the fringe back to the silhouette. Clipping to the cap alone
    // lets the sweep run out into open sky as a warm smear either side of the
    // summit, which is exactly what it did until this line was fixed.
    ctx.clip(volcBake.cone);
    ctx.clip(volcBake.cap);
    ctx.fillStyle = hg;
    ctx.fillRect(CXB - V_HALF_BASE, hy - band, V_HALF_BASE * 2, band * 2);
    ctx.restore();
  }
  const over = volcBake.over;
  ctx.drawImage(over.c, 0, over.y, V_LW, over.h);
  ctx.restore();
}

// Billowing cartoon smoke off the summit: each puff is a cluster of lobes (a
// single circle reads as a bubble, not smoke) that rises, expands and fades on
// its own phase of a shared cycle, so the column is continuous rather than
// pulsing in lockstep. Lobe offsets come from index hashes, not RNG, so the
// plume is identical frame to frame at a given `t` — nothing here is stateful.
const V_PUFFS = 5;
function drawVolcanoSmoke(ctx, t, cx, apex, sc = 1, rise = 1) {
  for (let i = 0; i < V_PUFFS; i++) {
    const p = (t * 0.13 + i / V_PUFFS) % 1;
    // Drift widens as it climbs, and each puff leans a different way, so the
    // column spreads into a head instead of rising as a straight pipe.
    const lean = Math.sin(i * 2.7) * 0.9 + 0.35;
    const x = cx + (lean * 34 * Math.pow(p, 1.3) + Math.sin(t * 0.6 + i) * 3 * p) * sc;
    const y = apex - (8 + (p * 74 + Math.pow(p, 2) * 18) * rise) * sc;
    const r = (6 + p * 22) * sc;
    // Fade in fast off the crater, out slowly at the top.
    const a = Math.min(1, p * 6) * (1 - p * 0.85) * 0.8;
    smokePuff(ctx, x, y, r, a, i);
  }
}
// One baked sprite per puff seed, drawn once and then scaled.
//
// A puff's cluster is SELF-SIMILAR in `r` — the lobe offsets and radii are all
// fractions of it, and the seed only picks lobe angles — so the shape a puff
// has at r=28 is the shape it has at r=8, scaled. Compositing it from arcs on
// every frame (which is what this used to do, five times a frame) rebuilds an
// image that differs from the baked one only by a scale factor.
//
// The one term that is NOT proportional is the outline width's `max(0.9, …)`
// floor, which only bites below r≈10.6 — the freshly-emerged puffs at the vent,
// still fading in, under a 1.15px blur. Their ink runs a hair thinner than it
// used to; nothing else changes.
const SMOKE_SS = 2; // supersample, so the blit is not soft at device res
// Bake radius. Set to the largest a puff actually reaches — (6 + 22) * V_SMOKE_SC
// — so sprites are only ever scaled DOWN (never blown up past their raster) and
// the biggest, most visible puffs draw at ~1:1, where the baked blur is exactly
// the blur they would have got. Overshooting this shrinks every puff's effective
// blur for nothing.
const PUFF_R0 = Math.ceil((6 + 22) * V_SMOKE_SC);
const puffSprites = [];
let puffOutSS = 0;   // bake factor the cached puffs were resolved at

// The outline is a DILATED SILHOUETTE, not a stroke. Stroking the cluster path
// would trace every circle in full, including the arcs buried inside the union,
// so the puff would read as a clump of bubbles instead of one cloud. Filling
// the same cluster at radius+ow in ink and then the normal radii on top leaves
// exactly the union's outer ring showing.
//
// That requires the body fill to be OPAQUE — a translucent body would let the
// ink layer beneath it darken the whole interior. So the puff is composited
// opaque into a scratch layer and the fade is applied once, at the blit. Doing
// it per-fill instead is what produced the previous soft-blob look.
function puffCluster(g, cx, cy, r, seed, grow) {
  g.beginPath();
  g.arc(cx, cy, r + grow, 0, Math.PI * 2);
  for (let k = 0; k < 4; k++) {
    const a = seed * 1.9 + k * 1.7;
    const lx = cx + Math.cos(a) * r * 0.8, ly = cy + Math.sin(a) * r * 0.55;
    const lr = r * 0.62 + grow;
    g.moveTo(lx + lr, ly);
    g.arc(lx, ly, lr, 0, Math.PI * 2);
  }
}
function puffSprite(seed) {
  // Same story as the volcano slices: the resolve target was 1x logical, so at
  // native density every puff was magnified from its own raster. Keyed on the
  // bake factor so a density change rebuilds rather than reusing the wrong one.
  const out = bakeSS();
  if (puffOutSS !== out) { puffSprites.length = 0; puffOutSS = out; }
  let s = puffSprites[seed];
  if (s) return s;
  const r = PUFF_R0;
  const ow = Math.max(0.9, r * 0.085);
  const half = Math.ceil(r * 1.55 + ow + 2);
  const size = half * 2;
  const ss = Math.max(SMOKE_SS, out);
  const sc = document.createElement('canvas');
  sc.width = sc.height = size * ss;
  const g = sc.getContext('2d');
  g.setTransform(ss, 0, 0, ss, 0, 0);
  const m = size / 2;
  puffCluster(g, m, m, r, seed, ow);
  g.fillStyle = V_INK_SOLID;
  g.fill();
  puffCluster(g, m, m, r, seed, 0);
  g.fillStyle = '#b9bcc6';
  g.fill();
  // Lighter cap on the upper lobes so the cloud is shaded rather than flat —
  // clipped to the cluster, or it spills past the outline.
  g.save();
  puffCluster(g, m, m, r, seed, 0);
  g.clip();
  g.fillStyle = '#d4d6de';
  g.beginPath();
  g.arc(m - r * 0.3, m - r * 0.5, r * 0.72, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // Resolve to 1x through the same depth blur the cone is baked with, so the
  // plume still recedes with the rest of the volcano now that nothing is
  // filtered at draw time. The blur is baked at the sprite's full size and
  // therefore shrinks with it — a puff at the vent ends up crisper than one at
  // the top of the column. Under a translucent grey cloud that reads as the
  // near end of the plume being slightly sharper, which is not wrong.
  const c = document.createElement('canvas');
  c.width = c.height = size * out;
  const o = c.getContext('2d');
  o.filter = `blur(${V_BLUR * out}px)`;
  o.drawImage(sc, 0, 0, size * ss, size * ss, 0, 0, size * out, size * out);
  s = { c, half };
  puffSprites[seed] = s;
  return s;
}
function smokePuff(ctx, x, y, r, alpha, seed) {
  if (alpha <= 0.01) return;
  const s = puffSprite(seed);
  const half = s.half * (r / PUFF_R0);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(s.c, x - half, y - half, half * 2, half * 2);
  ctx.globalAlpha = prev;
}

// Portrait may translate the complete background before it is composited over
// the frame. The painter's ordinary 480px fill then stops short of one phone
// edge, exposing the unshifted base sky underneath as a vertical seam. The
// renderer publishes the visible local x-range here for full-surface fills and
// periodic hill tiles; the identity range keeps every landscape caller byte-
// compatible.
const DEFAULT_BACKGROUND_COVERAGE = Object.freeze({ left: 0, right: W, width: W });
function backgroundCoverage(ctx) {
  const c = ctx && ctx.__mashBackgroundCoverage;
  if (!c || !Number.isFinite(c.left) || !Number.isFinite(c.right)
    || c.right <= c.left) return DEFAULT_BACKGROUND_COVERAGE;
  return c;
}

// Give edge-bound background painters a staging interval beyond the physical
// frame. The renderer expresses this lead in the same pre-scale local units as
// the coverage, so enlarged portrait art gets the same screen-space warning
// distance without changing the actual canvas clip or picture centre.
function backgroundPaintCoverage(ctx) {
  const c = backgroundCoverage(ctx);
  const lead = Number.isFinite(Number(c.lookahead))
    ? Math.max(0, Number(c.lookahead)) : 0;
  if (lead <= 0) return c;
  return { left: c.left - lead, right: c.right + lead, width: c.width + lead * 2 };
}

// WRAP A DRIFTING OBJECT INTO THE VISIBLE BAND, NOT INTO THE AUTHORED FRAME.
//
// Everything that tiles across the sky — clouds, the pal, vultures, a skyline,
// a castle on a stick — used to wrap inside `0..W` plus a margin, because in
// landscape the picture IS the authored 480px frame and those are the same
// interval.
//
// Portrait moves the whole backdrop sideways (the hero column sits further
// left to buy runway), so the visible local range is no longer `0..W`: at the
// shipped anchor it is about 131..611. An object wrapping at `W + 65` then
// winks out of existence 66 pixels INSIDE the right edge of the picture, in
// full view. That is the pop-in.
//
// So the window comes from the coverage the renderer publishes for this pass.
// With the identity coverage this is arithmetically the old expression, which
// is why landscape is untouched.
function wrapIntoView(ctx, value, margin) {
  const c = backgroundPaintCoverage(ctx);
  const span = c.width + margin * 2;
  // The modulo is taken on the raw value, exactly as the inline expressions
  // did, and only the window it lands in moves. Folding the window's origin
  // into the modulo instead would slide every object sideways by the margin,
  // which in landscape is a silent art change.
  return c.left - margin + (((value % span) + span) % span);
}

// The vertical companion to backgroundCoverage: the local y-band that actually
// lands on the canvas for this pass. Portrait publishes it (see
// portraitBackgroundBand in run.js); landscape publishes nothing and gets an
// unbounded band, which is what keeps every existing caller byte-compatible.
const UNBOUNDED_BACKGROUND_BAND = Object.freeze({ top: -Infinity, bottom: Infinity });
function backgroundPaintBand(ctx) {
  const b = ctx && ctx.__mashBackgroundBand;
  if (!b || !Number.isFinite(b.bottom) || !Number.isFinite(b.top)
    || b.bottom <= b.top) return UNBOUNDED_BACKGROUND_BAND;
  return b;
}

// The matching cull: "far enough past the edge of what is actually on screen
// to stop drawing", rather than past the edge of the authored frame.
// A landmark pinned to one spot in the level arrives at the middle of the
// PICTURE when the camera reaches it. In portrait the picture's middle is not
// W/2 — the backdrop is shifted — so a butte anchored at W/2 sits about 131px
// left of centre and, worse, is culled while a third of it is still on screen.
function viewCenterX(ctx) {
  const c = backgroundCoverage(ctx);
  return c.left + c.width / 2;
}

function outsideView(ctx, x, margin) {
  const c = backgroundPaintCoverage(ctx);
  return x < c.left - margin || x > c.right + margin;
}

// Exposed for tests/background-wrap.js, which holds the wrap rule to its two
// claims: identical to the old inline arithmetic in landscape, and tied to the
// view in portrait.
export const __testing = {
  wrapIntoView, outsideView, backgroundCoverage, backgroundPaintCoverage, viewCenterX,
  // The solid spans of a frame, so a ground bake-off in src/dev can lay its
  // candidate texture over exactly the runs the shipping painter does — a card
  // that draws its own idea of where the holes are is comparing two things.
  apronRuns,
  backgroundPaintBand,
  sceneryBandPointY, desertThermals, ridgeYAt, ridgeTangentAngle,
  plumberSceneryPlacements, plumberSceneryClusterForCell, plumberNearTreeCenters, plumberBushTypeForCell,
  plumberHouseTypeFor,
  plumberFlowerOverlapsTree,
  plumberLandscapeSceneryOffset,
  get PLUMBER_LANDSCAPE_SCENERY_LIFT() { return PLUMBER_LANDSCAPE_SCENERY_LIFT; },
  get PLUMBER_SCENERY_SPACING() { return PLUMBER_SCENERY_SPACING; },
  DESERT_SUN_RADIUS, windTurbineRotation, satelliteDishScanAngle,
  get DESERT_SUN_PORTRAIT_OFFSET() { return DESERT_SUN_PORTRAIT_OFFSET; },
  get DESERT_SUN_PORTRAIT_X_INSET() { return DESERT_SUN_PORTRAIT_X_INSET; },
  desertSunX,
  get DESERT_FAR_AMP() { return DESERT_FAR.amp; },
  get DESERT_FAR_PORTRAIT_AMP() { return DESERT_FAR_PORTRAIT_AMP; },
  get DESERT_FAR_PORTRAIT_DROP() { return DESERT_FAR_PORTRAIT_DROP; },
  get DESERT_SCENERY_LIFT() { return DESERT_SCENERY_LIFT; },
  get DESERT_SCENERY_LIFT_PORTRAIT() { return DESERT_SCENERY_LIFT_PORTRAIT; },
  get DESERT_LANDSCAPE_BACK_LIFT() { return DESERT_LANDSCAPE_BACK_LIFT; },
  desertSceneryLift,
  get DESERT_HIGH_MESA_PHASE() { return DESERT_HIGH_MESA_PHASE; },
  get DESERT_LOWER_MESA_PHASE() { return DESERT_LOWER_MESA_PHASE; },
  desertHorizonPropKind,
  desertCactusPlacements,
  desertNearSurfacePlacements,
  frostSceneryPlacements, cryptSceneryPlacements, surgeSceneryPlacements,
  get FROST_SCENERY_EMBED() { return FROST_SCENERY_EMBED; },
  get FROST_PINE_EMBED() { return FROST_PINE_EMBED; },
  frostSceneryUsesPaperShadow,
  frostFeatureSkirt,
  frostStageLight,
  get FROST_STAGE_LIGHT() { return FROST_STAGE_LIGHT; },
  frostBlizzardRamp,
  frostBlizzardRung,
  frostBlizzardAt,
  get FROST_BLIZZARD_LADDER() { return FROST_BLIZZARD_LADDER; },
  get FROST_BLIZZARD_MAX() { return FROST_BLIZZARD_MAX; },
  get FROST_FEATURE_FOOTPRINTS() { return FROST_FEATURE_FOOTPRINTS; },
  get FROST_FEATURE_MARGIN() { return FROST_FEATURE_MARGIN; },
  setFrostAtmosphere, frostAtmosphericPalette,
  get FROST_ATMOSPHERE() { return FROST_ATMOSPHERE; },
  frostAuroraRect,
  frostAuroraBounds,
  get FROST_AURORA_BLUR() { return FROST_AURORA_BLUR; },
  get FROST_SCENERY_LIFT() { return FROST_SCENERY_LIFT; },
  get FROST_LANDSCAPE_SCENERY_LIFT() { return FROST_LANDSCAPE_SCENERY_LIFT; },
  get FROST_AURORA_CURTAINS() { return FROST_AURORA_CURTAINS; },
  get FROST_AURORA_STAGE_GAIN() { return FROST_AURORA_STAGE_GAIN; },
  get FROST_AURORA_STAGE_CURTAINS() { return FROST_AURORA_STAGE_CURTAINS; },
  desertWaterTowerPlacements, desertLandmarkPropPlacements,
  desertWindTurbinePlacements, desertTelegraphPlacements,
  desertSpeedLimitPlacements,
  desertSignPostHeight,
  get DESERT_ROAD_SIGNS() { return DESERT_ROAD_SIGNS; },
  get DESERT_DUNES() { return DESERT_DUNES; },
  get DESERT_MID_SURFACE() { return DESERT_MID_SURFACE; },
  get CACTUS_OF_DUNE() { return CACTUS_OF_DUNE; },
  get CACTUS_PORTRAIT_OF_DUNE() { return CACTUS_PORTRAIT_OF_DUNE; },
  get DESERT_SPEED_SIGN_RAISE() { return DESERT_SPEED_SIGN_RAISE; },
  get DESERT_SPEED_SIGN_LANDSCAPE_DROP() { return DESERT_SPEED_SIGN_LANDSCAPE_DROP; },
  get CACTUS_BURY() { return CACTUS_BURY; },
  get CACTUS_PORTRAIT_BURY() { return CACTUS_PORTRAIT_BURY; },
  paperCutoutPreviewRequested,
  // The pinned landmarks, so a test can watch ONE of them cross the picture
  // instead of trying to pick it out of a whole painted background. Both are
  // presented with the SAME (ctx, camX, atCam) shape: their real signatures
  // differ, and a test that has to remember which is which is a test that
  // silently measures nothing.
  drawButte: (ctx, camX, atCam) => drawButte(ctx, camX, atCam),
  drawVolcano: (ctx, camX, atCam) => drawVolcano(ctx, 0, camX, atCam, 0),
};

// Per-frame gradient construction is surprisingly costly at device res —
// cache gradients by their color stops (they are reusable frame to frame).
const gradCache = new Map();
function skyGrad(ctx, c0, c1) {
  const key = c0 + '|' + c1;
  let g = gradCache.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    gradCache.set(key, g);
  }
  ctx.fillStyle = g;
  // Up to PAN_MAX above the frame as well: the camera cranes the whole
  // background down on a tall jump, and without that headroom the strip it
  // opens at the top of the screen is whatever was in the backbuffer. The
  // gradient itself still runs 0..GROUND_Y as authored — a canvas gradient
  // clamps outside its stops, so the extra rows are flat sky, not a stretch.
  const coverage = backgroundPaintCoverage(ctx);
  // A shifted portrait backdrop can have a different local origin from the
  // canvas's fallback sky. Give the LCD-style full-surface fill a whole frame
  // of sideways bleed in that case, so a stale/undersized coverage interval
  // can never show through as a vertical seam at the phone edge. Landscape's
  // identity path remains the same rectangle.
  const bleed = coverage.left !== 0 || coverage.right !== W ? W : 0;
  // AND A WHOLE FRAME MORE ABOVE THAT. On the sky road in portrait the backdrop is carried
  // further down than PAN_MAX (the frame fit's groundline shift plus the road's climb),
  // and the strip it opened showed run.js's fallback sky — the CABINET's colours, which
  // on Frost are the day's: a pale band over frost-3's dusk (Peter, 25 Sep 2026: "jumping
  // too high on the upper level shows incomplete picture on the edge"). The extra rows
  // are flat sky in this pack's own top colour, so there is no seam to see.
  ctx.fillRect(coverage.left - bleed, -PAN_MAX - H,
    coverage.width + bleed * 2, GROUND_Y + PAN_MAX + H);
}

// Full-screen textures (scanlines, dot lattices) as tiny repeating patterns:
// one GPU-tiled fill instead of thousands of per-frame fillRects.
const patCache = new Map();
function patternFill(ctx, key, tw, th, paint) {
  let pat = patCache.get(key);
  if (!pat) {
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    paint(c.getContext('2d'));
    pat = ctx.createPattern(c, 'repeat');
    patCache.set(key, pat);
  }
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
  }
}

// PLUMBER PAPER STUDY -------------------------------------------------------
//
// This checkout keeps the paper treatment active for Plumber's Panic while the
// direction is being evaluated. `settings.paperCutout:false` and `?paper=off`
// remain comparison seams; the normal game path no longer needs a flag.
const PAPER_GRAIN_ALPHA = 1;
const PAPER_SURFACE_ALPHA = 1;
const PAPER_SKY_SURFACE_ALPHA = 1;
// Scenery gets a lift, not a second silhouette. Keep the offsets and alpha
// short enough that clouds remain part of the sky instead of casting a long
// game-object shadow across it.
const PAPER_DEEP_OFFSET = Object.freeze({ x: 2, y: 4 });
const PAPER_CONTACT_OFFSET = Object.freeze({ x: 0.75, y: 1.5 });
const PAPER_DEEP_COLOR = 'rgba(15,23,36,0.10)';
const PAPER_CONTACT_COLOR = 'rgba(0,0,0,0.04)';
// Clouds and islands only need a quiet lift from the page. Keep their shadow
// close to the silhouette so it reads as a paper edge instead of a cast blob.
const PAPER_SUBTLE_DEEP_OFFSET = Object.freeze({ x: 1, y: 2 });
const PAPER_SUBTLE_CONTACT_OFFSET = Object.freeze({ x: 0.35, y: 0.75 });
const PAPER_SUBTLE_DEEP_COLOR = 'rgba(15,23,36,0.055)';
const PAPER_SUBTLE_CONTACT_COLOR = 'rgba(0,0,0,0.018)';
const PAPER_RIM_COLOR = 'rgba(255,255,255,0.24)';
const PAPER_RIM_WIDTH = 1.15;
// Broad scenery silhouettes need a little more separation than clouds or the
// full-sky wash. Keep this local to the cached mountain/hill tiles so the
// surface can read as cardstock without making the whole frame noisy again.
const PAPER_LANDMARK_DEEP_COLOR = 'rgba(15,23,36,0.15)';
const PAPER_LANDMARK_CONTACT_COLOR = 'rgba(0,0,0,0.06)';
const PAPER_LANDMARK_RIM_COLOR = 'rgba(255,255,255,0.32)';
const PAPER_LANDMARK_RIM_WIDTH = 1.25;
const PAPER_LANDMARK_GRAIN_ALPHA = 1;
const paperSurfaceCache = new Map();
// Celestial paper is part of the cloud/sun cutout, not a second sheet sliding
// underneath it. Bake these small surfaces once so their fibres travel with
// the object, as they do on the cached mountain tiles. The ground remains a
// world surface and keeps its camera-anchored motion.
const paperCloudSpriteCache = new Map();
const paperSunDiscCache = new Map();
const paperPresetName = (value) => value === 'cardstockSoft' || value === 'cardstockQuiet'
  || value === 'cardstockClear' || value === 'felt'
  ? value : 'cardstockClear';

function paperCutoutPreviewRequested(settings = {}) {
  // The paper treatment is intentionally the active Plumber study for this
  // checkout. Keep the explicit false seam so focused tests and comparisons
  // can still render the original treatment without changing source again.
  if (settings.paperCutout === false || settings.paperCutout === 'off') return false;
  if (settings.paperCutout === true || settings.paperCutout === 'plumber') return true;
  if (typeof window === 'undefined' || !window.location) return true;
  try {
    const paper = new URLSearchParams(window.location.search || '').get('paper');
    return paper !== 'off' && paper !== '0';
  } catch {
    return true;
  }
}

function paperTextureSource() {
  return sharedPaperTextureSource('cardstockClear');
}

function paperPatternFor(ctx) {
  return sharedPaperPatternFor(ctx, 'cardstockClear');
}

function paperPath(ctx, source) {
  if (typeof source === 'function') source();
  else if (source) return source;
  return null;
}

function fillPaperPath(ctx, source) {
  const path = paperPath(ctx, source);
  if (path) ctx.fill(path);
  else if (typeof source === 'function') ctx.fill();
}

function strokePaperPath(ctx, source) {
  const path = paperPath(ctx, source);
  if (path) ctx.stroke(path);
  else if (typeof source === 'function') ctx.stroke();
}

function paperShadowPass(ctx, source, offset, color = PAPER_DEEP_COLOR) {
  ctx.save();
  ctx.translate(offset.x, offset.y);
  ctx.fillStyle = color;
  fillPaperPath(ctx, source);
  ctx.restore();
}

function paperFinishPass(ctx, source, pattern = paperPatternFor(ctx), rim = {}) {
  ctx.save();
  if (pattern) {
    // Neutral midpoint stays neutral, so the paper field embosses the colour
    // instead of laying a dirty one-way dark wash over it.
    ctx.globalCompositeOperation = rim.compositeOperation || PAPER_TEXTURE_BLEND;
    ctx.globalAlpha = rim.grainAlpha ?? PAPER_GRAIN_ALPHA;
    ctx.fillStyle = pattern;
    fillPaperPath(ctx, source);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (rim !== false && rim.rim !== false) {
    ctx.strokeStyle = rim.strokeStyle || PAPER_RIM_COLOR;
    ctx.lineWidth = rim.lineWidth || PAPER_RIM_WIDTH;
    strokePaperPath(ctx, rim.edgeSource || source);
  }
  ctx.restore();
}

function drawPaperShape(ctx, source, fillColor, options = {}) {
  const deep = options.deep || PAPER_DEEP_OFFSET;
  const contact = options.contact || PAPER_CONTACT_OFFSET;
  ctx.save();
  paperShadowPass(ctx, source, deep, options.deepColor);
  paperShadowPass(ctx, source, contact, options.contactColor || PAPER_CONTACT_COLOR);
  ctx.fillStyle = fillColor;
  fillPaperPath(ctx, source);
  paperFinishPass(ctx, source, options.pattern || paperPatternFor(ctx), options);
  ctx.restore();
}

const PAPER_CLOUD_SPRITE = Object.freeze({ x: -30, y: -20, width: 60, height: 40 });

function paperCloudSprite(fill, paperMaterial, paperStrength = 1) {
  const out = bakeSS();
  const key = `${fill}|${paperMaterial}|${paperStrength}|${out}`;
  let sprite = paperCloudSpriteCache.get(key);
  if (sprite) return sprite;
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PAPER_CLOUD_SPRITE.width * out;
    canvas.height = PAPER_CLOUD_SPRITE.height * out;
    const g = canvas.getContext('2d');
    if (!g) return null;
    if (typeof g.setTransform === 'function') g.setTransform(out, 0, 0, out, 0, 0);
    else g.scale(out, out);
    g.translate(-PAPER_CLOUD_SPRITE.x, -PAPER_CLOUD_SPRITE.y);
    drawPaperShape(g, () => cloudPath(g), fill, {
      pattern: sharedPaperPatternFor(g, paperMaterial),
      deep: PAPER_SUBTLE_DEEP_OFFSET,
      contact: PAPER_SUBTLE_CONTACT_OFFSET,
      deepColor: PAPER_SUBTLE_DEEP_COLOR,
      contactColor: PAPER_SUBTLE_CONTACT_COLOR,
      grainAlpha: PAPER_GRAIN_ALPHA * paperStrength,
    });
    sprite = { canvas, ...PAPER_CLOUD_SPRITE };
    paperCloudSpriteCache.set(key, sprite);
    return sprite;
  } catch {
    return null;
  }
}

function paperSunDisc(paperMaterial, paperStrength = 1) {
  const out = bakeSS();
  const key = `${paperMaterial}|${paperStrength}|${out}`;
  let disc = paperSunDiscCache.get(key);
  if (disc) return disc;
  if (typeof document === 'undefined') return null;
  try {
    const radius = 17;
    const size = radius * 2 + 4;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * out;
    const g = canvas.getContext('2d');
    if (!g) return null;
    if (typeof g.setTransform === 'function') g.setTransform(out, 0, 0, out, 0, 0);
    else g.scale(out, out);
    const center = size / 2;
    g.beginPath();
    g.arc(center, center, 15, 0, Math.PI * 2);
    g.fillStyle = '#f6d33c';
    g.fill();
    const pattern = sharedPaperPatternFor(g, paperMaterial);
    if (pattern) {
      g.globalCompositeOperation = PAPER_TEXTURE_BLEND;
      g.globalAlpha = PAPER_GRAIN_ALPHA * paperStrength;
      g.fillStyle = pattern;
      g.beginPath();
      g.arc(center, center, 15, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    disc = { canvas, x: -center, y: -center, size };
    paperSunDiscCache.set(key, disc);
    return disc;
  } catch {
    return null;
  }
}

// A whole-sky grain pass is cached at the current backing-store density. A
// per-frame pattern fill over a phone-height portrait frame is needlessly
// expensive; this is one ordinary image blit after the first bake. The source
// is a local-width strip so the translated portrait coverage is still filled.
function drawPaperSurface(ctx, coverage, key = 'plumber-paper-sky', material = 'skySmooth', strength = 1) {
  const source = sharedPaperTextureSource(material) || paperTextureSource();
  if (!source || !ctx?.canvas || !coverage?.width) return;
  const cacheKey = `${key}:${material}:${PAPER_MATERIALS[material]?.revision}`;
  const cv = ctx.canvas;
  const sx = cv.width / Math.max(1, W);
  const sy = cv.height / Math.max(1, H);
  const width = Math.max(1, Math.ceil(coverage.width * sx));
  // Match the sky gradient's vertical overscan so camera/background movement
  // cannot expose the untextured prefill as a horizontal wash boundary.
  const logicalTop = -PAN_MAX;
  const logicalHeight = H + PAN_MAX * 2;
  const height = Math.max(1, Math.ceil(logicalHeight * sy));
  let bake = paperSurfaceCache.get(cacheKey);
  if (!bake || bake.pixelWidth !== width || bake.pixelHeight !== height
    || bake.logicalWidth !== coverage.width || bake.logicalTop !== logicalTop
    || bake.logicalHeight !== logicalHeight) {
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const b = layer.getContext('2d');
    if (!b) return;
    b.setTransform(sx, 0, 0, sy, 0, 0);
    const pattern = anchorPaperPattern(b.createPattern(source, 'repeat'));
    if (!pattern) return;
    b.fillStyle = pattern;
    // The offscreen bitmap has a positive origin. Translate the logical
    // overscan into that bitmap before painting. The translated origin maps
    // `logicalTop` to backing row zero, so the fill must still start at
    // `logicalTop`; filling from logical zero would leave the top of the bake
    // empty and expose a strip when the background is shifted.
    b.translate(0, -logicalTop);
    b.fillRect(0, logicalTop, coverage.width, logicalHeight);
    bake = {
      layer,
      pixelWidth: width,
      pixelHeight: height,
      logicalWidth: coverage.width,
      logicalTop,
      logicalHeight,
    };
    paperSurfaceCache.set(cacheKey, bake);
  }
  ctx.save();
  // The sky sheet uses the same neutral emboss blend as scenery. It preserves
  // the cabinet's flat sky colour while giving the surface a soft paper lift.
  ctx.globalCompositeOperation = PAPER_TEXTURE_BLEND;
  ctx.globalAlpha = PAPER_SKY_SURFACE_ALPHA * strength;
  ctx.drawImage(bake.layer, 0, 0, bake.pixelWidth, bake.pixelHeight,
    coverage.left, bake.logicalTop, bake.logicalWidth, bake.logicalHeight);
  ctx.restore();
}

// A repeating texture that covers the WHOLE screen every frame is cheaper
// baked once into a backbuffer-sized layer and blitted than re-tiled by the
// rasterizer each frame (measured: 3.3ms -> 0.4ms per fill). Re-bakes only
// when the backbuffer is resized.
const bakeCache = new Map();
function bakedFill(ctx, key, tw, th, paint) {
  const cv = ctx.canvas;
  let baked = bakeCache.get(key);
  if (!baked || baked.width !== cv.width || baked.height !== cv.height) {
    baked = document.createElement('canvas');
    baked.width = cv.width;
    baked.height = cv.height;
    const c = baked.getContext('2d');
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    const tile = document.createElement('canvas');
    tile.width = tw;
    tile.height = th;
    paint(tile.getContext('2d'));
    const pat = c.createPattern(tile, 'repeat');
    if (!pat) return;
    c.fillStyle = pat;
    c.fillRect(0, 0, W, H);
    bakeCache.set(key, baked);
  }
  ctx.drawImage(baked, 0, 0, W, H);
}

// THE CITY ITSELF, baked. This panel is beat-driven rather than time-driven —
// lcdSceneFrame floors the HEARD beat — so at 124 BPM the picture changes about
// twice a second while the frame is redrawn sixty times a second, and most of
// what it redraws (facades, line art, unlit windows) is identical between those
// changes. That share is painted once into a backbuffer-sized layer and
// blitted, exactly as bakedFill does for a tiling texture; only the parts a
// beat can actually move are still drawn per frame.
//
// TRANSPARENT, and deliberately not carrying the sky. The commuter train runs
// on a viaduct BEHIND the skyline, so it has to be painted between the sky and
// the facades — a bake that owned the sky as well would have to cover it. The
// sky is two fills; leaving them live costs nothing and keeps the paint order
// exactly what it has always been.
//
// ONE canvas, not a map. The key carries `phase`, which steps four times in a
// run (LCD_PHASES), and the stage — twelve combinations, and a map of them
// would hold ~56MB of canvas at 3x where one slot holds ~4.7MB. Repaints land
// on a phase change, a stage change and a resize: about four in a run.
//
// Headless it draws STRAIGHT THROUGH, which is what keeps the op-sequence
// recorder in tests/lcd-background.js seeing every fill this painter has always
// issued. THE createImageData PROBE IS THE WHOLE POINT AND MUST NOT BE SOFTENED
// TO A typeof CHECK — under tests/dom-stub.js the context is a proxy that
// answers every unknown property with a no-op, so a typeof asks "is there a
// real canvas here?" and is always told yes. Same probe, and the same reason,
// as makeSurface in visualisers.js.
let cityBake = null;
function lcdBakeSurface(w, h, reuse) {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = reuse || document.createElement('canvas');
    // Assigning either dimension clears the backing store, which is the reset
    // this needs anyway when only the key changed.
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const probe = ctx.createImageData?.(2, 2);
    if (!probe?.data || probe.data.length !== 16) return null;
    return { canvas, ctx };
  } catch { return null; }
}
//
// `top` IS HOW FAR ABOVE THE AUTHORED FRAME THIS CITY REACHES, and it is not
// an optimisation — it is the difference between a skyline and a row of
// facades with their tops cut off. The surface was always W x H, which is
// every pixel a 480x270 panel can hold and, in portrait, about two thirds of
// the city: the lift grows the buildings up into sky that has negative local
// y, and a bake anchored at 0 clipped exactly that part away. The banks and
// masts that are drawn live stayed where they belonged, so the panel showed
// meters floating over headless buildings.
//
// The band keeps the SAME device rows per logical row — the surface grows
// with it rather than squeezing more city into the old one — so the blit is
// still 1:1 and no pixel of this panel is resampled.
function bakedCity(ctx, key, paint, slices = null, top = 0) {
  const cv = ctx.canvas;
  if (!cv || !cv.width || !cv.height) { paint(ctx); return; }
  const band = Math.min(0, Math.floor(top));
  const height = Math.round(cv.height * (H - band) / H);
  const sized = cityBake && cityBake.c.width === cv.width && cityBake.c.height === height;
  if (!sized || cityBake.key !== key) {
    const made = lcdBakeSurface(cv.width, height, sized ? cityBake.c : null);
    if (!made) { cityBake = null; paint(ctx); return; }
    made.ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, -band * (cv.height / H));
    paint(made.ctx);
    cityBake = { key, c: made.canvas, top: band };
  }
  // ONE BLIT, unless the city is still arriving. `slices` is the assembly's
  // whole cost on this path: a list of {x, w, dy} column windows onto the SAME
  // bake, each drawn at its own vertical offset, so a skyline that walks into
  // place still pays for exactly one baked surface. Rebaking per structure —
  // or dropping the bake for the opening bars — would have made the eight
  // beats nobody sees twice the most expensive in the stage.
  //
  // A column is safe to slice because this skyline is authored with air in it:
  // the structures sit ~12px apart, so a window one pixel proud of a facade on
  // each side carries its line art and nothing of its neighbour's.
  const baked = cityBake.top;
  const bandH = H - baked;
  if (!slices) { ctx.drawImage(cityBake.c, 0, baked, W, bandH); return; }
  const sx = cityBake.c.width / W;
  for (const { x, w, dy } of slices) {
    ctx.drawImage(cityBake.c, x * sx, 0, w * sx, cityBake.c.height, x, baked + dy, w, bandH);
  }
}

// --- level-1 sky pals: a plain, dignified sun (suns don't bop) and a nosy
// cartoon cloud that wanders the whole sky, drifts in and out of view, looks
// around with big eyes, and reacts to hero hits — gasping in sympathy or,
// just as often, laughing. Game code pings sunShock() from takeHit.
let cloudShockT = 0, cloudLaughT = 0, cloudLastT = 0;
const PAL_S = 1.4; // the pal outsizes every plain cloud so the face reads first
// Background clouds stay at the light end of the cabinet palette. The three
// values retain just enough separation for the flock to have depth without a
// darker puff becoming a second focal point against the sky.
const PIXEL_CLOUD_LIGHT = '#ffffff';
const PIXEL_CLOUD_MID = '#eceff5';
const PIXEL_CLOUD_SHADE = '#dde1ea';
export function sunShock() {
  if (Math.random() < 0.55) cloudLaughT = 1.7;
  else cloudShockT = 1.4;
}

function drawStaticSun(ctx, t, bgShift = 0, backgroundContext = null, paper = false,
  paperMaterial = 'cardstockClear', paperStrength = 1) {
  // Animated but dignified: it slowly arcs across the sky like a day passing,
  // its rays rotate and breathe, and its halo pulses. It does not bop.
  const view = backgroundPaintCoverage(ctx);
  const sx = (t * 3.2) % (view.width + 150);
  const x = view.right + 60 - sx;                     // drifts right to left
  const u = (x - (view.left + view.width / 2)) / Math.max(1, view.width / 2);
  // Base sits below the HUD pill row (~y 23) plus the halo/ray radius (~30),
  // so the sun never hides behind the score furniture at the apex of its arc.
  // This helper applies the celestial compensation itself below (`y -
  // bgShift`), so do not add backgroundY here as well or the sun would cancel
  // the camera twice when the common scene context is present.
  const y = sceneryBandY(backgroundContext, 'celestial',
    58 + portraitSunOffset(backgroundContext)) + 26 * u * u;
  const breathe = 1 + 0.06 * Math.sin(t * 1.1);
  ctx.save();
  // The Plumber background is drawn in a shifted context so the hills follow
  // a raised road. The sun belongs to the sky, not that scenery: cancel that
  // context shift here so a jump cannot carry the sun along with the camera.
  ctx.translate(x, y - bgShift);
  if (paper) {
    // The sun is animated, so keep its small geometry live, but still give the
    // disc the same cardstock lift as the cached mountain layers. The full
    // paper pass is tiny compared with the background surface.
    ctx.save();
    ctx.translate(PAPER_DEEP_OFFSET.x, PAPER_DEEP_OFFSET.y);
    ctx.beginPath();
    ctx.arc(0, 0, 15 * breathe, 0, Math.PI * 2);
    ctx.fillStyle = PAPER_DEEP_COLOR;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(PAPER_CONTACT_OFFSET.x, PAPER_CONTACT_OFFSET.y);
    ctx.beginPath();
    ctx.arc(0, 0, 15 * breathe, 0, Math.PI * 2);
    ctx.fillStyle = PAPER_CONTACT_COLOR;
    ctx.fill();
    ctx.restore();
  }
  // halo
  ctx.beginPath();
  ctx.arc(0, 0, 30 * breathe, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(248,200,64,${0.14 + 0.05 * Math.sin(t * 1.7)})`;
  ctx.fill();
  // rays: slow rotation, alternating lengths that shimmer
  ctx.fillStyle = '#f8c840';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.18;
    const r2 = (23 + (i % 2) * 4 + 1.6 * Math.sin(t * 2.3 + i)) * breathe;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.1) * 17, Math.sin(a - 0.1) * 17);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.lineTo(Math.cos(a + 0.1) * 17, Math.sin(a + 0.1) * 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 15 * breathe, 0, Math.PI * 2);
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  if (paper) {
    // Draw a cached disc so the fibre field stays fixed to the sun while the
    // sun's halo/rays continue their deliberately gentle animation.
    const disc = paperSunDisc(paperMaterial, paperStrength);
    if (disc) {
      ctx.save();
      ctx.scale(breathe, breathe);
      ctx.drawImage(disc.canvas, disc.x, disc.y, disc.size, disc.size);
      ctx.restore();
    }
    ctx.strokeStyle = PAPER_RIM_COLOR;
    ctx.lineWidth = PAPER_RIM_WIDTH;
  } else {
    ctx.strokeStyle = 'rgba(26,16,40,0.25)';
    ctx.lineWidth = 1;
  }
  ctx.stroke();
  ctx.restore();
}

// The one puffy silhouette every sky cloud shares — the cloud pal wears it
// with a face, the background clouds wear it plain. Draw at origin; callers
// translate/scale first.
function cloudPath(ctx) {
  ctx.beginPath();
  for (const [px, py, rx, ry] of [[-15, 3, 10, 8], [0, -5, 13, 10], [15, 3, 10, 8], [0, 4, 17, 9]]) {
    ctx.moveTo(px + rx, py);
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
  }
}

function drawCloudBody(ctx, fill, paper = false, paperMaterial = 'cardstockClear', paperStrength = 1) {
  if (paper) {
    // The cloud is a moving paper cutout. Keep its fibre field on the cutout
    // instead of letting a live canvas pattern swim through it each frame.
    const sprite = paperCloudSprite(fill, paperMaterial, paperStrength);
    if (sprite) {
      ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.width, sprite.height);
    } else {
      drawPaperShape(ctx, () => cloudPath(ctx), fill,
        { pattern: sharedPaperPatternFor(ctx, paperMaterial),
          deep: PAPER_SUBTLE_DEEP_OFFSET, contact: PAPER_SUBTLE_CONTACT_OFFSET,
          deepColor: PAPER_SUBTLE_DEEP_COLOR, contactColor: PAPER_SUBTLE_CONTACT_COLOR,
          grainAlpha: PAPER_GRAIN_ALPHA * paperStrength });
    }
    return;
  }
  cloudPath(ctx);
  // Stroke BEFORE fill: the fill then covers every stroke segment inside the
  // union, leaving only the outer silhouette outlined — otherwise each lobe's
  // full ellipse shows and the puff reads as a clump of bubbles on any fill
  // that isn't washed out by bloom. Double width because fill eats the inner
  // half of the stroke.
  ctx.strokeStyle = 'rgba(26,16,40,0.2)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCloudPal(ctx, t, backgroundContext = null, paper = false,
  paperMaterial = 'cardstockClear', paperStrength = 1) {
  if (t < cloudLastT) { cloudShockT = 0; cloudLaughT = 0; } // new run: compose yourself
  const dt = Math.max(0, Math.min(0.1, t - cloudLastT));
  cloudLastT = t;
  if (cloudShockT > 0) cloudShockT -= dt;
  if (cloudLaughT > 0) cloudLaughT -= dt;
  const laughing = cloudLaughT > 0;
  const shocked = !laughing && cloudShockT > 0;

  // Wandering path: crosses the whole sky slowly, then exits and stays gone
  // for a stretch before floating back in from the left.
  const x = wrapIntoView(ctx, t * 13, 95);
  if (outsideView(ctx, x, 45)) return; // off having a private moment
  // Sits just under the HUD, not down in the middle of the sky: at PAL_S the
  // silhouette reaches ~21px above its origin and the pill row owns everything
  // down to y 23, so the top of the bob is tuned to land at y ~28 — as high as
  // the pal can ride while its face still clears the score.
  let y = portraitCloudY(backgroundContext, 1, 61 + portraitCloudOffset(backgroundContext))
    + Math.sin(t * 0.33) * 9.5 + Math.sin(t * 0.9) * 2.5
    + backgroundY(backgroundContext, 'clouds');
  let jx = 0;
  if (laughing) { y -= Math.abs(Math.sin(t * 15)) * 3; jx = Math.sin(t * 21) * 1.2; }
  if (shocked) jx = Math.sin(t * 26) * 1.2;

  ctx.save();
  ctx.translate(x + jx, y);
  ctx.scale(PAL_S, PAL_S); // the pal is the big one; the flock stays smaller
  drawCloudBody(ctx, PIXEL_CLOUD_LIGHT, paper, paperMaterial, paperStrength);

  // idle micro-expressions: every ~8s slot, briefly giggle or doze
  const slot = Math.floor(t / 8);
  const hash = Math.abs(Math.sin(slot * 127.13));
  const inSlot = t - slot * 8 < 1.6;
  const idle = (!laughing && !shocked && inSlot) ? (hash < 0.25 ? 'giggle' : hash < 0.45 ? 'sleepy' : 'normal') : 'normal';

  // eyes
  ctx.lineCap = 'round';
  const gx = shocked || laughing ? 0 : Math.sin(t * 0.6) * 1.7 - 1.1;
  const gy = shocked || laughing ? 0 : Math.cos(t * 0.45) * 1.3 + 1.0;
  const blink = !laughing && !shocked && idle === 'normal' && Math.sin(t * 1.3) > 0.995;
  for (const sx of [-1, 1]) {
    const ex = sx * 6.5, ey = -4;
    if (laughing) {
      // happy closed arcs: ^ ^
      ctx.strokeStyle = '#1a1028';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey + 2, 3.4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    const er = shocked ? 5.4 : 4.2;
    ctx.beginPath();
    ctx.ellipse(ex, ey, er * 0.85, blink ? 0.8 : idle === 'sleepy' ? er * 0.55 : er, 0, 0, Math.PI * 2);
    // white-on-white-cloud: the eye whites need a REAL outline or only the
    // pupils read and the gaze looks unmoored
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,16,40,0.85)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    if (!blink) {
      ctx.beginPath();
      ctx.arc(ex + gx, ey + gy + (idle === 'sleepy' ? 1.2 : 0), shocked ? 1.1 : 2, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1028';
      ctx.fill();
    }
    if (idle === 'sleepy') { // heavy lid
      ctx.beginPath();
      ctx.ellipse(ex, ey - er * 0.45, er * 0.9, er * 0.45, 0, Math.PI, 0);
      ctx.fillStyle = PIXEL_CLOUD_LIGHT;
      ctx.fill();
    }
  }
  // brows
  if (shocked) {
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -11); ctx.lineTo(-4, -13.5);
    ctx.moveTo(10, -11); ctx.lineTo(4, -13.5);
    ctx.stroke();
  }
  // mouth
  if (laughing) {
    // wide-open cackle + tongue + a squeezed-out tear
    ctx.beginPath();
    ctx.ellipse(0, 4.5, 4.6, 4 + Math.abs(Math.sin(t * 15)) * 1.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 6.8, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f890b8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10.5, -1 + Math.sin(t * 7) * 1.2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#8ac8f0';
    ctx.fill();
  } else if (shocked) {
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 3.4, 4.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
  } else if (idle === 'giggle') {
    ctx.beginPath();
    ctx.ellipse(0, 4, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 2.5, 6.5, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(248,120,80,0.3)';
    ctx.beginPath();
    ctx.ellipse(-9.5, 2, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.ellipse(9.5, 2, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------- SPEED ZONE
//
// The desert cabinet's background. It was the plainest in the game and the
// reason was measurable rather than a matter of taste: faux3d drew a sky, a
// fixed sun blob, three ridges and a few distant landmarks, it never touched
// `t` — the only pack whose background had no motion of its own — and it never
// drew `cab.hills`, a colour the cabinet defines and paid for.
//
// Everything below is gated on `cab.id === 'speed'` at the call site, exactly
// as the plumber cabinet's sun, volcano and clouds are: faux3d is not
// SPEED ZONE's alone. THE SURGE cycles all eight packs, and the hub cabinet
// screens, the gallery and the social renderers all instantiate it too.

// Nearest silhouettes and their hazed cousins. Land stays in warm clay, but
// the far mesas borrow a desaturated sage/blue-gray so depth is not a stack of
// browns — the sky is #f08048 to #f8c060 and a black bird against that is a
// hole punched in it rather than a bird.
const TAU_BG = Math.PI * 2;
const DESERT_INK = '#4a2a1c';
const DESERT_INK_FAR = '#667c79';
// Background saguaros need to read as vegetation without becoming a foreground
// hazard. A dark, desaturated sage separates them from the warm clay ridge.
const DESERT_CACTUS_INK = '#3f5b43';
const DESERT_SAGE_INK = '#526c54';
const DESERT_SAGE_LIGHT = '#87936d';
const DESERT_ROCK = '#a97558';
const DESERT_ROCK_LIT = '#c69a6f';
const DESERT_ROCK_DARK = '#755a58';
// Near-ridge outcrops need their own small-scale contrast. Keep the butte and
// its strata palette above unchanged; these colors give the occasional rock a
// cleaner edge against the warm hill without making it a foreground hazard.
const DESERT_NEAR_ROCK = '#b8845e';
const DESERT_NEAR_ROCK_LIT = '#d9aa76';
const DESERT_NEAR_ROCK_DARK = '#654e4a';
const DESERT_NEAR_ROCK_EDGE = '#514840';
// The near ridge's own numbers, in one place because THREE things read them:
// the layer itself, the cacti standing on its crest, and the haze that has to
// know where the horizon is.
// THREE ranges, not two. Far mesas, a middle range, then the dune line the
// cacti stand on. The middle one is what turns two bands into distance: with
// only a far and a near layer the eye reads a backdrop and a foreground, and
// there is nothing in between for them to be far from.
//
// `dunes` on the two nearer ranges so the hills vary in size — a plain |sin|
// ridge makes every hump identical, which is the thing that reads as wallpaper.
//
// Raised about half again from the amplitudes they were first cut at (50 / 42
// / 34). The ground line sits at 232 of a 270 frame, so at those numbers the
// tallest thing on the horizon reached a fifth of the way up the sky and the
// whole country hugged the road — the layers were there, and the picture was
// still mostly empty orange. The RATIO between the three is what carries the
// depth, so all three go up together and the far range stays the tallest.
// Sized against PLUMBER PANIC, which is the cabinet that gets this right: its
// far range runs amp 96 at wl 90, so the mountains fill a good third of the
// frame and the near hills sit low in front of them. The desert was drawing
// everything much flatter and reading as a strip of country along the bottom.
// SHALLOW. The heights are roughly where they were, but the wavelengths are
// nearly doubled, and that ratio is the whole look: a hump 88 tall over 150px
// of ground is a cone, and the same hump over 350px is a hill. Plumber's near
// range runs amp 34 at wl 50 — its slopes are gentle, and the desert's were
// climbing about twice as steeply for the same reason its hills read as
// pointy. Height alone was never the problem.
const DESERT_FAR = { amp: 100, wl: 230, factor: 0.12 };
// Portrait has enough vertical sky that the far mesa does not need to rise
// into the prop clearance band. Lower its body and drop the crest a little;
// landscape keeps the authored silhouette exactly as before.
const DESERT_FAR_PORTRAIT_AMP = 56;
const DESERT_FAR_PORTRAIT_DROP = 24;
// The portrait celestial band sits behind the compact objective cards once
// the authored backdrop is enlarged around GROUND_Y. Keep the Speed sun just
// below that HUD while still above the lifted mesa; landscape keeps the
// original anchor.
const DESERT_SUN_PORTRAIT_OFFSET = 6;
// Leave enough local room for the full glow rectangle at the right edge of the
// portrait coverage. The inset is applied before the backdrop scale, so the
// sun stays aligned on phones with different widths and safe areas.
const DESERT_SUN_PORTRAIT_X_INSET = 45;
// Lift the complete Speed Zone country composition inside the scenery pass.
// These are painter-local offsets: the road, hero, camera, and sky bands keep
// their authored anchors, while terrain and its attached props fill more of
// the available frame in both orientations.
const DESERT_SCENERY_LIFT = 22;
const DESERT_SCENERY_LIFT_PORTRAIT = 36;
// Landscape has less vertical room above the road, so raise only the distant
// country another step. The near ridge and roadside signs keep their shared
// landscape lift, preserving the depth separation and planting.
const DESERT_LANDSCAPE_BACK_LIFT = 12;

function desertSceneryLift(portrait = false) {
  return portrait ? DESERT_SCENERY_LIFT_PORTRAIT : DESERT_SCENERY_LIFT;
}

function desertSunX(ctx, portrait = false) {
  if (!portrait) return 380;
  return backgroundCoverage(ctx).right - DESERT_SUN_PORTRAIT_X_INSET;
}
// Keep the tower repeat on the same period as the mesa cap. A free-running
// spacing slowly walks towers onto the steep outer face, where a leg can end
// against the sky and read as floating. The cap centre is the only stable
// horizontal ground contract for a distant tower in either orientation.
const DESERT_FAR_PERIOD = Math.max(16, Math.round(Math.PI * DESERT_FAR.wl));
const DESERT_MID = { amp: 78, wl: 200, factor: 0.22, color: '#b78f68' };
const DESERT_RIDGE = { amp: 52, wl: 150, factor: 0.35 };
const DESERT_MID_SURFACE = 'desert-mid-surface';

// Sparse infrastructure gives the horizon a journey without turning it into
// a row of props. A stage only travels slots 0–3 of the six-mesa cycle (the wind
// farm lands at ≈91–100%), so every stage used to show the same four. Now slot 0
// holds a landmark of that stage's own (DESERT_HORIZON_STAGE_PROPS), slot 1 is the
// BIG EAR telescope that replaced the three-dish cluster, slot 2 the lower-mesa
// water tower (the radio mast instead on speed-2), slot 3 the wind farm. All share
// the same screen coverage and parallax travel as the mesa caps they stand on.
const DESERT_HORIZON_PROP_SPACING = DESERT_FAR_PERIOD;
const DESERT_HORIZON_PROP_SLOTS = 6;
const DESERT_HIGH_MESA_PHASE = Math.round(DESERT_FAR_PERIOD * 0.5);
const DESERT_LOWER_MESA_PHASE = Math.round(DESERT_FAR_PERIOD * 0.08);
// Stay inside the broad cap while giving the portrait tower a little more
// clearance from the centred goal/bonus cards.
const DESERT_WATER_TOWER_PORTRAIT_PHASE_OFFSET = -30;
// A lower-mesa prop can be about one cap-width left of a high-mesa prop. Keep
// the slot enumerator alive far enough beyond the viewport to include it, then
// cull the final, type-specific x position below.
const DESERT_HORIZON_PROP_CULL_MARGIN = 120
  + Math.abs(DESERT_HIGH_MESA_PHASE - DESERT_LOWER_MESA_PHASE);
const DESERT_TELEGRAPH_SPACING = 172;
const DESERT_TELEGRAPH_PHASE = 24;
const DESERT_WATER_TOWER_INK = '#526b72';
const DESERT_WATER_TOWER_DARK = '#40545c';
const DESERT_WATER_TOWER_LIGHT = '#9baba6';
const DESERT_SATELLITE_INK = '#4f6f6a';
const DESERT_SATELLITE_DARK = '#324e52';
const DESERT_SATELLITE_LIGHT = '#99aa96';
const DESERT_WIND_INK = '#566f70';
const DESERT_WIND_DARK = '#344f54';
const DESERT_WIND_LIGHT = '#9ca895';
// Muted cool bands echo the larger butte's strata. They are intentionally
// geological rather than green: the eye should read sedimentary layers, not a
// row of vegetation, especially after the portrait mesa is shortened.
const DESERT_MESA_STRATA = Object.freeze([
  { fromTop: 0.16, height: 5, color: '#a5b1a5', alpha: 0.34 },
  { fromTop: 0.34, height: 4, color: '#6f8582', alpha: 0.28 },
  { fromTop: 0.52, height: 7, color: '#9a9d89', alpha: 0.22 },
  { fromTop: 0.71, height: 4, color: '#657b7a', alpha: 0.26 },
  { fromTop: 0.86, height: 5, color: '#8b927f', alpha: 0.18 },
]);
const DESERT_TELEGRAPH_INK = '#586b68';
const DESERT_TELEGRAPH_WIRE = 'rgba(76,82,77,0.56)';
const DESERT_TELEGRAPH_WIRE_WIDTH = 0.78;
// Keep the portrait weight, where the extra vertical scenery needs the stronger
// read, but use a lighter desktop stroke so the lines stay background detail
// instead of becoming rails.
const DESERT_TELEGRAPH_WIRE_DESKTOP_WIDTH = 0.58;
// Keep the off-screen endpoint alive for the complete wire interval. If the
// left pole is culled as soon as it crosses the edge, its segment to the next
// pole vanishes in one frame and the line visibly pops in.
const DESERT_TELEGRAPH_WIRE_MARGIN = DESERT_TELEGRAPH_SPACING + 48;
// Roadside signs are distant landmarks, not a roadside UI ticker. One sign per
// long stretch gives the eye time to register its silhouette and keeps the
// five-sign vocabulary feeling like a journey rather than a repeated texture.
const DESERT_SPEED_SIGN_SPACING = 1120;
const DESERT_SPEED_SIGN_PHASE = 350;
const DESERT_SPEED_SIGN_FACTOR = 0.42;
const DESERT_SPEED_SIGN_BASE_OFFSET = -7;
// Raise every board above the 24px hero silhouette with a 6px breathing
// margin. This includes landscape's +5 layer base and +18 board drop; the
// post painter compensates so the roadside foot does not move.
const DESERT_SPEED_SIGN_RAISE = 37;
// Landscape has enough vertical room to let the sign sit into the dune a bit
// more, but the clearance above the hero still wins. Portrait keeps the same
// safe board height for the tighter sky/ground split.
const DESERT_SPEED_SIGN_LANDSCAPE_DROP = 18;
const DESERT_SPEED_SIGN_FACE = '#d8c493';
const DESERT_SPEED_SIGN_TRIM = '#5d7778';
const DESERT_SPEED_SIGN_INK = '#4c3f3e';
const DESERT_WARNING_FACE = '#f1e8d5';
const DESERT_WARNING_TRIM = '#a85f55';
const DESERT_WARNING_INK = '#3f3130';
const DESERT_AUTOBAHN_FACE = '#3f6571';
// A sign can be geometrically planted and still read as a sticker if its last
// pixel simply stops against a similarly flat dune. This is deliberately a
// small disturbed-soil cue, not a ring: a soft flattened shadow plus an
// irregular collar makes the post's contact legible at distant scale.
const DESERT_SPEED_SIGN_CONTACT_SOIL = 'rgba(123,88,61,0.78)';
const DESERT_SPEED_SIGN_CONTACT_LIGHT = 'rgba(213,165,108,0.56)';
const DESERT_SPEED_SIGN_CONTACT_STONE = 'rgba(92,64,47,0.62)';
const DESERT_SPEED_SIGN_CONTACT_DROP = 2;
// Speed limits are cosmetic: choose a fresh two-digit value per sign index when
// a pixel-pack run is created, then cache it so the number does not flicker
// between frames. Highway boards keep their deterministic silly cycle.
const DESERT_HIGHWAY_VALUES = Object.freeze(['13', '404', 'πr²', '∞', '7']);
const DESERT_SPEED_LIMIT_RANDOM_VALUES = new Map();
function randomSpeedLimitValue(index, cache = DESERT_SPEED_LIMIT_RANDOM_VALUES) {
  if (!cache.has(index)) cache.set(index, String(10 + Math.floor(Math.random() * 90)));
  return cache.get(index);
}
// Except on the speed-trap stage (Peter, 25 Sep): sign 0 is the only SPEED LIMIT
// the hero passes before the camera — it starts left of the trap's lot and scrolls
// faster — and it always reads 67.
const DESERT_TRAP_SPEED_LIMIT = '67';
const DESERT_ROAD_SIGNS = Object.freeze([
  {
    kind: 'speed', w: 62, top: -58, bottom: -26,
    face: DESERT_SPEED_SIGN_FACE, trim: DESERT_SPEED_SIGN_TRIM,
    label: 'SPEED LIMIT', value: '50', labelCell: 0.72, valueCell: 1.9, scale: 0.88,
  },
  {
    kind: 'highway', w: 70, top: -55, bottom: -25,
    face: '#416b56', trim: '#ead9a5', ink: '#fff1bd',
    label: 'HIGHWAY', value: '13', labelCell: 0.82, valueCell: 2.2, scale: 0.84,
  },
  {
    // The old Route 66 shield was the live route slot. Keep the slot's fixed
    // placement semantics, but use the actual square Autobahn symbol instead.
    kind: 'route', shape: 'autobahn',
    // Keep the planted lower edge fixed while using the requested tall panel.
    w: 32, top: -60, bottom: -12, scale: 0.80,
    face: DESERT_AUTOBAHN_FACE, trim: '#ffffff', ink: '#ffffff', icon: '#ffffff',
    label: '', value: '', labelCell: 0, valueCell: 0,
  },
  {
    kind: 'caution', shape: 'triangle', w: 44, top: -57, bottom: -18,
    face: DESERT_WARNING_FACE, trim: DESERT_WARNING_TRIM, ink: DESERT_WARNING_INK,
    warningFormula: 'mc²', warningFormulaScale: 1.7,
    // Set the formula below the triangle's optical midpoint so the raised ²
    // clears the sloping terracotta border instead of crowding its shoulder.
    warningFormulaOffset: 0.14, warningFormulaPadding: 0.16, warningMarkOffset: 0,
    label: '', value: '', labelCell: 0, valueCell: 0, scale: 0.82,
  },
  {
    kind: 'exit', w: 70, top: -55, bottom: -25,
    face: '#416b56', trim: '#ead9a5', ink: '#fff1bd',
    label: 'NEXT EXIT', value: '42', labelCell: 0.75, valueCell: 1.9, scale: 0.84,
  },
]);

// Where the dunes are, as fractions of one tile. `ridgeProfile`'s dune mode
// builds each ridge from exactly these three humps, so anything that needs to
// stand ON a dune — the cacti — can be placed at a peak rather than dropped at
// an arbitrary x and left wherever the curve happens to be. That was the bug
// in the first cut: fixed x positions land in a TROUGH about as often as on a
// crest, and a cactus standing in a valley between two dunes reads as floating
// in front of the hills rather than growing out of them.
// The widths OVERLAP — they sum to well over one period — and that is the
// whole difference between a range of hills and a row of cones. Cut narrow
// (0.36 / 0.25 / 0.30) each hump stood alone with flat ground either side, so
// every one ran up to a point and down again; widened until neighbours meet,
// the max() between them fills the troughs and what is left is a rolling ridge
// with rounded tops.
//
// Each summit still clears its neighbours' reach, so a peak is a real peak and
// the cacti planted on them are not standing on the shoulder of a bigger hump.
const DESERT_DUNES = [
  { at: 0.17, w: 0.56, h: 1 },
  { at: 0.52, w: 0.40, h: 0.6 },
  { at: 0.81, w: 0.48, h: 0.84 },
];

// Broad, broken contour bands give the middle hills a surface instead of
// leaving them as three uninterrupted brown sine waves. They are painted
// inside the cached ridge tile, and every y sample is taken from that tile's
// own ridge function, so the bands inherit the exact same parallax and cannot
// slide free of the hill when the camera moves.
function desertHillSurfaceDetails(ctx, ridge, ridgePath, period, yBase, amp, surface) {
  if (surface !== DESERT_MID_SURFACE) return;
  const contour = ({ from, span, depth, phase, color, alpha, width }) => {
    ctx.save();
    ridgePath();
    ctx.clip();
    const start = Math.max(0, Math.min(1, from)) * period;
    // A contour may trail around most of a hill, but never the complete arc.
    // Keeping this as a span cap lets each shelf stop at a different place
    // while avoiding a set of lines that simply traces the whole ridge.
    const arcSpan = Math.max(0.06, Math.min(0.75, span));
    const end = Math.min(period, start + arcSpan * period);
    const fade = Math.min(26, (end - start) * 0.2);
    const rgba = (value, a) => {
      const match = /^#([0-9a-f]{6})$/i.exec(value);
      if (!match) return value;
      const rgb = Number.parseInt(match[1], 16);
      return `rgba(${(rgb >> 16) & 0xff},${(rgb >> 8) & 0xff},${rgb & 0xff},${a})`;
    };
    const stroke = ctx.createLinearGradient(start, 0, end, 0);
    stroke.addColorStop(0, rgba(color, 0));
    stroke.addColorStop(Math.min(0.24, fade / (end - start)), rgba(color, alpha * 0.72));
    stroke.addColorStop(0.5, rgba(color, alpha));
    stroke.addColorStop(Math.max(0.76, 1 - fade / (end - start)), rgba(color, alpha * 0.72));
    stroke.addColorStop(1, rgba(color, 0));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    // Keep the contour readable, but soften its whole length like pigment
    // sinking into paper rather than leaving a crisp painted stripe.
    ctx.shadowColor = rgba(color, alpha * 0.46);
    ctx.shadowBlur = Math.max(2.5, width * 1.05);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'bevel';
    ctx.beginPath();
    for (let px = start; px <= end; px += 4) {
      const wobble = Math.sin(px * 0.026 + phase) * 1.8
        + Math.sin(px * 0.057 + phase * 0.63) * 0.75;
      const y = ridge(px) + depth + wobble;
      if (px === start) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Four candidate shelves with deliberately different arc lengths and
  // thicknesses. Their staggered starts and gaps mean one dune reads with
  // three bands while another gets a fourth, rather than every hill becoming
  // a uniform stack. The longest one still stops before it can wrap the whole
  // hill.
  // Keep the stack near the crest. The lower half of the middle ridge is
  // legitimately covered by the near ridge, so deep offsets made the third
  // and fourth shelves technically present but practically invisible.
  contour({ from: 0.04, span: 0.36, depth: 7, phase: 0.6,
    color: DESERT_ROCK_LIT, alpha: 0.58, width: 3.0 });
  contour({ from: 0.16, span: 0.75, depth: 16, phase: 2.4,
    color: DESERT_ROCK_DARK, alpha: 0.44, width: 7.0 });
  contour({ from: 0.38, span: 0.30, depth: 26, phase: 4.2,
    color: DESERT_ROCK_LIT, alpha: 0.52, width: 4.5 });
  contour({ from: 0.60, span: 0.25, depth: 35, phase: 5.5,
    color: DESERT_ROCK_DARK, alpha: 0.38, width: 2.6 });
}

// One vulture, wingspan `s`, centred on the origin.
//
// The silhouette has one requirement above looking nice: it must not read as a
// HAZARD. The lane already teaches that a thing in the sky is a buzzbird or a
// drone — something to slide — and buzzbird is drawn in hazard orange with a
// fast six-frame flap. So this is its opposite on every axis carrying that
// meaning: warm dark with no hazard colour anywhere, wings in the flat
// dihedral V of a soaring bird, and a flap that is mostly absent.
function drawVulture(ctx, s, flap, ink) {
  const half = s / 2;
  // The V. Even at rest the tips sit above the body, and that dihedral is the
  // single most recognisable thing about a vulture at distance — drawn with
  // flat wings it reads as a gull.
  const rise = s * (0.13 + flap * 0.1);
  const tail = s * 0.055;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-half, -rise);
  ctx.quadraticCurveTo(-half * 0.42, -s * 0.055, -s * 0.05, -s * 0.012);
  ctx.lineTo(s * 0.05, -s * 0.012);
  ctx.quadraticCurveTo(half * 0.42, -s * 0.055, half, -rise);
  ctx.quadraticCurveTo(half * 0.46, tail * 0.6, s * 0.06, tail);
  ctx.lineTo(-s * 0.06, tail);
  ctx.quadraticCurveTo(-half * 0.46, tail * 0.6, -half, -rise);
  ctx.closePath();
  ctx.fill();
  // Head and tail nubs — two or three pixels each, and what stops the shape
  // reading as a boomerang.
  ctx.fillRect(-s * 0.03, -s * 0.075, s * 0.06, s * 0.06);
  ctx.fillRect(-s * 0.045, tail * 0.7, s * 0.09, s * 0.06);
}

// Thermals, not flight paths. A bird crossing the lane horizontally is exactly
// what a flyer hazard does; one going round a slow circle cannot be mistaken
// for one, and it is also what vultures actually do.
//
// The ellipse is a circle in perspective — wide in x, shallow in y — and each
// bird scales with its phase so the near side is bigger, which is what sells
// it as a ring in the air rather than an oval on the glass.
const DESERT_THERMALS = [
  { x: 118, y: 60, rx: 48, ry: 11, n: 3, s: 21, rate: 0.40, plx: 0.17, ink: DESERT_INK },
  { x: 352, y: 40, rx: 31, ry: 7, n: 2, s: 13, rate: 0.55, plx: 0.09, ink: DESERT_INK_FAR },
];

function desertThermals(backgroundContext) {
  const band = backgroundContext?.sceneryLayout?.bands?.birds;
  if (!band || !Number.isFinite(Number(band.top))
    || !Number.isFinite(Number(band.bottom)) || !Number.isFinite(Number(band.center))) {
    return DESERT_THERMALS;
  }
  const height = Math.max(0, Number(band.bottom) - Number(band.top));
  const inBand = (source, fraction, orbitFraction) => {
    const ry = Math.min(source.ry, Math.max(3, height * orbitFraction));
    const requested = Number(band.top) + height * fraction;
    const lo = Number(band.top) + ry;
    const hi = Number(band.bottom) - ry;
    return {
      ...source,
      y: lo <= hi ? Math.max(lo, Math.min(hi, requested)) : Number(band.center),
      ry,
    };
  };
  // Two staggered envelopes use the whole authored birds band instead of
  // leaving both thermals in the celestial strip. Their local coordinates are
  // intentional: the caller applies the clouds' shared depth offset once.
  return [
    inBand(DESERT_THERMALS[0], 0.34, 0.12),
    inBand(DESERT_THERMALS[1], 0.68, 0.09),
  ];
}

function drawVultures(ctx, t, camX, backgroundContext = null) {
  const thermals = desertThermals(backgroundContext);
  for (const th of thermals) {
    for (let i = 0; i < th.n; i++) {
      const a = t * th.rate + (i * TAU_BG) / th.n;
      const drift = camX * th.plx * ZOOM;
      const x = wrapIntoView(ctx, th.x + Math.cos(a) * th.rx - drift, 80);
      const y = th.y + Math.sin(a) * th.ry;
      // Nearer on the front of the circle. The size difference is small on
      // purpose: enough to give the ring depth, not enough to read as a bird
      // approaching the camera, which would be a hazard again.
      const depth = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(a));
      // Mostly zero. The subtraction clips the sine so a flap is a brief event
      // between long glides — the cadence that separates soaring from
      // flapping, where buzzbird runs a continuous six-frame cycle at 16fps.
      const flap = Math.max(0, Math.sin(t * 1.7 + i * 2.3) - 0.8) * 4.4;
      // Banking into the turn: cos(a) is the x velocity, so the roll follows
      // the direction of travel and the bird leans the way it is going.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.sin(a) * 0.22);
      drawVulture(ctx, th.s * depth, flap, th.ink);
      ctx.restore();
    }
  }
}

// Saguaros standing on the near ridge — the pixel pack's trees-on-crests idea
// in desert form, drawn as their own pass rather than through parallaxHills'
// `trees` option because a saguaro is not a tree shape and that option bakes
// one crown.
//
// FEW and BIG. A first pass put eight 9-to-20px cacti up there and produced
// eight little glyphs: at that size an arm is three pixels of elbow and the
// whole thing reads as a digit rather than a plant.
//
// The arms are STROKED CURVES, and that is the whole difference between a
// cactus and a numeral. Built from rectangles — out along a bar, then up a
// column — every arm meets the trunk at a hard right angle, and a vertical
// stem with a right-angled arm at half height is a drawn 4. Nothing about the
// colour or the size fixes that; the corner has to go. A quadratic whose
// control point sits AT the corner sweeps the elbow into the arc a saguaro
// actually grows, and round caps finish the tips without a separate dome.
//
// Nothing in the set is a bare vertical either, for the same reason: an
// armless column is a line, and a line on a hill is a fence post. Every entry
// has at least one arm, and variety comes from HEIGHT, arm count and which
// side the arm is on rather than from different species. Two other species
// were tried at this size and both failed: a barrel cactus is a squat ellipse,
// which at eleven pixels is a dark egg sitting on a hill, and a prickly pear's
// pads collapse into a paw print. A silhouette that has to be explained is
// worse than a fourth saguaro.
// One cactus per DUNE, planted on the peak, rather than five at fixed x
// offsets. Fixed offsets land in a trough as often as on a crest, and a
// cactus in a valley reads as floating in front of the hills — which is
// exactly what it was doing.
//
// These are local background units. Landscape keeps the cacti substantial at
// the distant 42% landmark relationship; portrait gets a stronger silhouette
// because its enlarged near ridge occupies the readable part of the phone
// frame. The two scales are deliberately larger now so the plants describe a
// desert skyline instead of reading as punctuation on the dunes.
// Most distant saguaros carry three side branches; the smaller third dune keeps
// two so the repeated silhouette still has a little species-level variation.
const PLANT = [{ arms: 3 }, { arms: 3 }, { arms: 2 }];
const CACTUS_OF_DUNE = 0.42;
// Portrait keeps the scenery at landscape physical scale, but the near ridge
// occupies much more of the phone frame. Give its plants a stronger silhouette
// there instead of letting the crop make them read as punctuation.
const CACTUS_PORTRAIT_OF_DUNE = 0.72;
const CACTUS_MIN_HEIGHT = 8;
// Only let the ridge occlude the contact end. A deeper landscape bite made
// the cactus look buried even though its crest sample was correct; keeping
// both orientations on the same contact fraction makes the attachment read
// as one rule after responsive resizing.
const CACTUS_BURY = 0.10;
const CACTUS_PORTRAIT_BURY = CACTUS_BURY;
const CACTUS_STROKE = 0.14;
const CACTUS_MIN_STROKE = 1.5;

// Return the geometry before painting it. Both the hill tile and the cactus
// now use `ridgeScroll`, and the crest is evaluated from the SAME tile-local
// x that is blitted to the screen. That makes the attachment a contract rather
// than a second camera calculation, including across fractional scroll.
function desertCactusPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const { amp, wl, factor } = DESERT_RIDGE;
  const portrait = !!options.portrait;
  const cactusScale = portrait ? CACTUS_PORTRAIT_OF_DUNE : CACTUS_OF_DUNE;
  const cactusBury = portrait ? CACTUS_PORTRAIT_BURY : CACTUS_BURY;
  const period = Math.max(16, Math.round(Math.PI * wl));
  const scroll = ridgeScroll(camX, factor, period);
  const view = backgroundPaintCoverage(ctx);
  // Match parallaxHills() exactly: its first cached tile starts at the
  // coverage edge, not at logical x=0. The old cactus pass used `k * period`
  // here, which was harmless in landscape but lost the portrait crop's
  // shifted left edge after the backdrop was resized and lifted.
  const firstX = view.left - scroll.off - period;
  const placements = [];
  for (let tileIndex = 0, tileX = firstX;
    tileX < view.right + period;
    tileIndex++, tileX += period) {
    const tile = scroll.tile + tileIndex - 1;
    for (let i = 0; i < DESERT_DUNES.length; i++) {
      // Every third dune is left bare. A cactus on every peak is an orchard;
      // the gaps are what make it desert.
      if (((tile + i) % 3 + 3) % 3 === 2) continue;
      const dune = DESERT_DUNES[i];
      const spec = PLANT[i];
      const parity = (((tile + i) % 2) + 2) % 2;
      // A small, fixed-pixel offset keeps the plants from becoming a repeated
      // row of centre marks without pushing one down a dune shoulder.
      const localX = (dune.at + (parity ? 3 : -4) / period) * period;
      const x = tileX + localX;
      if (outsideView(ctx, x, 70)) continue;
      const height = Math.max(CACTUS_MIN_HEIGHT, dune.h * amp * cactusScale);
      const crest = ridgeProfile(localX, layerBaseY, amp, wl, period, false, false, true);
      placements.push({
        tile, duneIndex: i, x, localX, crest,
        baseY: crest + height * cactusBury,
        height,
        lineWidth: Math.max(CACTUS_MIN_STROKE, height * CACTUS_STROKE),
        flip: parity ? 1 : -1,
        arms: spec.arms,
      });
    }
  }
  return placements;
}

function drawCactusShape(ctx, cactus) {
  const { x, baseY: y, height: h, lineWidth: wdt, flip, arms } = cactus;
  ctx.lineWidth = wdt;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + wdt * 0.5);
  ctx.stroke();
  // Out, then up, in one sweep. The control point is the corner an earlier
  // version drew literally — as rectangles it met the trunk at a right angle
  // and the whole thing read as a drawn 4. As a quadratic the corner becomes
  // the bend a saguaro actually grows.
  const arm = (dir, atFrac, reach, rise) => {
    const ay = y - h * atFrac;
    ctx.lineWidth = wdt * 0.82;
    ctx.beginPath();
    ctx.moveTo(x, ay);
    ctx.quadraticCurveTo(x + dir * reach, ay, x + dir * reach, ay - rise);
    ctx.stroke();
  };
  arm(-flip, 0.56, h * 0.28, h * 0.42);
  if (arms > 1) arm(flip, 0.38, h * 0.24, h * 0.34);
  if (arms > 2) arm(flip, 0.72, h * 0.20, h * 0.22);
}

function drawSaguaros(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const paper = !!options.paper;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const placements = desertCactusPlacements(ctx, camX, layerBaseY, options);
  for (const cactus of placements) {
    if (paper) {
      ctx.save();
      ctx.translate(PAPER_DEEP_OFFSET.x, PAPER_DEEP_OFFSET.y);
      ctx.strokeStyle = PAPER_DEEP_COLOR;
      drawCactusShape(ctx, cactus);
      ctx.restore();
      ctx.save();
      ctx.translate(PAPER_CONTACT_OFFSET.x, PAPER_CONTACT_OFFSET.y);
      ctx.strokeStyle = PAPER_CONTACT_COLOR;
      drawCactusShape(ctx, cactus);
      ctx.restore();
    }
    // Tinted toward the layer it stands on rather than drawn in the nearest
    // ink. The lower part is occluded by the ridge in the caller, so this is
    // part of that scenery plane instead of a foreground prop.
    ctx.strokeStyle = DESERT_CACTUS_INK;
    drawCactusShape(ctx, cactus);
    if (paper) {
      const pattern = sharedPaperPatternFor(ctx, paperMaterial);
      if (pattern) {
        ctx.save();
        ctx.globalCompositeOperation = PAPER_TEXTURE_BLEND;
        ctx.globalAlpha = PAPER_GRAIN_ALPHA;
        ctx.strokeStyle = pattern;
        drawCactusShape(ctx, cactus);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

// Small, widely spaced foreground texture for the near ridge. These features
// are intentionally placed between cactus peaks rather than sprinkled at
// arbitrary screen positions: a rock or sage tuft gets the same ridge sample
// and parallax offset as the hill it grows from.
const DESERT_NEAR_SURFACE_FEATURES = Object.freeze([
  Object.freeze([
    Object.freeze({ at: 0.30, kind: 'rock', scale: 0.65 }),
    Object.freeze({ at: 0.67, kind: 'sage', scale: 0.88 }),
  ]),
  Object.freeze([
    Object.freeze({ at: 0.24, kind: 'sage', scale: 0.92 }),
    Object.freeze({ at: 0.73, kind: 'rock', scale: 0.58 }),
  ]),
]);

function desertNearSurfacePlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const { amp, wl, factor } = DESERT_RIDGE;
  const period = Math.max(16, Math.round(Math.PI * wl));
  const scroll = ridgeScroll(camX, factor, period);
  const view = backgroundPaintCoverage(ctx);
  const firstX = view.left - scroll.off - period;
  const portrait = !!options.portrait;
  const placements = [];
  for (let tileIndex = 0, tileX = firstX;
    tileX < view.right + period;
    tileIndex++, tileX += period) {
    const tile = scroll.tile + tileIndex - 1;
    const set = DESERT_NEAR_SURFACE_FEATURES[
      ((tile % DESERT_NEAR_SURFACE_FEATURES.length)
        + DESERT_NEAR_SURFACE_FEATURES.length) % DESERT_NEAR_SURFACE_FEATURES.length
    ];
    for (let featureIndex = 0; featureIndex < set.length; featureIndex++) {
      const spec = set[featureIndex];
      // Rocks are a rare geological accent, not a second vegetation rhythm.
      // Keep the alternating sage beat, but let an outcrop appear only every
      // other ridge period so a long run does not acquire a dotted rock line.
      if (spec.kind === 'rock'
        && (((tile % 2) + 2) % 2) !== 0) continue;
      const parity = (((tile + featureIndex) % 2) + 2) % 2;
      const localX = spec.at * period + (parity ? 3 : -4);
      const x = tileX + localX;
      if (outsideView(ctx, x, 60)) continue;
      const ridgeY = ridgeProfile(localX, layerBaseY, amp, wl, period,
        false, false, true);
      placements.push({
        tile, featureIndex, kind: spec.kind, x, localX, ridgeY,
        // Follow the hill's local slope and sink the foot a little into the
        // fill. The ridge is painted after these details, so the buried edge
        // is naturally occluded instead of needing a fake contact shadow.
        baseY: ridgeY + 2,
        angle: ridgeTangentAngle(localX, layerBaseY, amp, wl, period,
          false, false, true),
        scale: spec.scale * (portrait ? 1.10 : 1),
      });
    }
  }
  return placements;
}

function desertRockPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-9, -5);
  ctx.lineTo(-3, -10);
  ctx.lineTo(4, -8);
  ctx.lineTo(10, -3);
  ctx.lineTo(11, 0);
  ctx.closePath();
}

function drawDesertRockShape(ctx, color = null) {
  desertRockPath(ctx);
  if (color) ctx.fillStyle = color;
  ctx.fill();
}

function drawDesertRockDetail(ctx) {
  ctx.fillStyle = DESERT_NEAR_ROCK;
  drawDesertRockShape(ctx, DESERT_NEAR_ROCK);
  ctx.fillStyle = DESERT_NEAR_ROCK_DARK;
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(1, -2);
  ctx.lineTo(6, -5);
  ctx.lineTo(11, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = DESERT_NEAR_ROCK_LIT;
  ctx.beginPath();
  ctx.moveTo(-8, -5);
  ctx.lineTo(-3, -10);
  ctx.lineTo(4, -8);
  ctx.lineTo(7, -4);
  ctx.lineTo(1, -2);
  ctx.lineTo(-5, -4);
  ctx.closePath();
  ctx.fill();
  // A single restrained edge is what separates the small outcrop from the
  // hill. It follows the same rotated local geometry, so it cannot float or
  // become a dark sticker when the ridge turns.
  desertRockPath(ctx);
  ctx.strokeStyle = DESERT_NEAR_ROCK_EDGE;
  ctx.lineWidth = 0.85;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawDesertRockSilhouette(ctx) {
  desertRockPath(ctx);
}

// A sage tuft is a low starburst, not a miniature saguaro. Pointed blades
// radiate from one buried crown with deliberately uneven heights and spread;
// the wide side points do most of the silhouette work at the distant scale.
const DESERT_SAGE_BLADES = Object.freeze([
  Object.freeze([-16, -3, 1.8]),
  Object.freeze([-13, -8, 1.8]),
  Object.freeze([-9, -12, 1.7]),
  Object.freeze([-5, -16, 1.6]),
  Object.freeze([-1, -13, 1.5]),
  Object.freeze([4, -17, 1.6]),
  Object.freeze([8, -12, 1.7]),
  Object.freeze([13, -8, 1.8]),
  Object.freeze([16, -3, 1.8]),
]);

function drawDesertSageShape(ctx, color = DESERT_SAGE_INK) {
  ctx.fillStyle = color;
  for (const [tipX, tipY, halfWidth] of DESERT_SAGE_BLADES) {
    const length = Math.hypot(tipX, tipY) || 1;
    const nx = (-tipY / length) * halfWidth;
    const ny = (tipX / length) * halfWidth;
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(-nx, -ny);
    ctx.closePath();
    ctx.fill();
  }
  // Keep the crown low and broad so the points do not leave a visible trunk.
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 2.1, 0, 0, TAU_BG);
  ctx.fill();
}

function drawDesertSageSilhouette(ctx) {
  drawDesertSageShape(ctx, PAPER_DEEP_COLOR);
}

function drawDesertNearSurfaceFeature(ctx, feature, options = {}) {
  const paper = !!options.paper;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  ctx.save();
  ctx.translate(feature.x, feature.baseY);
  ctx.scale(feature.scale, feature.scale);
  const silhouette = feature.kind === 'rock'
    ? () => drawDesertRockSilhouette(ctx)
    : () => drawDesertSageSilhouette(ctx);
  const detail = () => {
    if (feature.kind === 'rock') drawDesertRockDetail(ctx);
    else {
      drawDesertSageShape(ctx, DESERT_SAGE_INK);
      ctx.save();
      ctx.globalAlpha = 0.62;
      drawDesertSageShape(ctx, DESERT_SAGE_LIGHT);
      ctx.restore();
    }
  };
  // The rock's foot is authored along its local x-axis. Rotating that axis to
  // the ridge tangent makes the outcrop emerge from the hill rather than
  // cutting across its slope like a loose sticker.
  ctx.rotate(feature.angle || 0);
  if (paper) {
    paperShadowPass(ctx, silhouette, PAPER_DEEP_OFFSET,
      PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, silhouette, PAPER_CONTACT_OFFSET,
      PAPER_LANDMARK_CONTACT_COLOR);
  }
  detail();
  if (paper) {
    paperFinishPass(ctx, silhouette, sharedPaperPatternFor(ctx, paperMaterial), {
      grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA,
      rim: false,
    });
  }
  ctx.restore();
}

function drawDesertNearSurfaceFeatures(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const placements = desertNearSurfacePlacements(ctx, camX, layerBaseY, options);
  for (const feature of placements) {
    drawDesertNearSurfaceFeature(ctx, feature, options);
  }
}

function periodicDesertXs(ctx, camX, factor, spacing, phase, margin = 96) {
  const view = backgroundPaintCoverage(ctx);
  const travel = camX * factor * ZOOM;
  const first = Math.floor((travel - phase - margin) / spacing);
  const last = Math.ceil((travel - phase + view.width + margin) / spacing);
  const points = [];
  for (let index = first; index <= last; index++) {
    const x = view.left + phase + index * spacing - travel;
    if (!outsideView(ctx, x, margin)) points.push({ index, x });
  }
  return points;
}

// The non-desert cabinets use the same planting rule as Speed: choose a local
// point inside the ridge tile and sample that exact tile-local curve. Frost
// plants each full footprint against the deepest part of the ridge; its own
// hill is painted first so the scenery can sit on the snow instead of vanishing
// behind it.
const FROST_FAR_SCENERY_FEATURES = Object.freeze([
  Object.freeze({ kind: 'glacier', at: 0.21, scale: 1.45 }),
  Object.freeze({ kind: 'landmark', at: 0.72, scale: 1.00 }),
]);
const FROST_NEAR_SCENERY_FEATURES = Object.freeze([
  Object.freeze({ kind: 'pine', at: 0.24, scale: 1.25 }),
  Object.freeze({ kind: 'ice-rock', at: 0.72, scale: 1.28 }),
  Object.freeze({ kind: 'pine', at: 0.36, scale: 1.50 }),
  Object.freeze({ kind: 'snowbank', at: 0.82, scale: 0.76 }),
]);
const CRYPT_SCENERY_FEATURES = Object.freeze([
  Object.freeze({ kind: 'dead-tree', at: 0.28, scale: 0.92 }),
  Object.freeze({ kind: 'stone', at: 0.72, scale: 0.72 }),
]);
const SURGE_SCENERY_FEATURES = Object.freeze([
  Object.freeze({ kind: 'signal-pylon', at: 0.48, scale: 0.90 }),
  Object.freeze({ kind: 'signal-pylon', at: 0.92, scale: 0.72 }),
]);

// A feature is planted from the deepest point of its whole foot, not just
// from the ridge sample underneath its centre. That matters on a sloping
// hill: the wide base of a large ice formation can otherwise peek out on one
// side even though its centre is correctly attached. Frost scenery is painted
// after its support hill, so the footprint ends exactly on the snow instead of
// leaving a buried flat-bottom silhouette.
const FROST_FEATURE_FOOTPRINTS = Object.freeze({
  // A MASSIF, NOT A THING STANDING ON THE HILL. Everything else here has a foot
  // that meets the snow, and the contour clip is what buries it. A glacier has
  // no foot to bury: it is the mountain the snow field is lying against, so it
  // runs from its peaks all the way down past the lane and is cut by the NEAR
  // ridge, which is painted after it. Clipping it to its own ridge instead put a
  // perfectly straight horizontal edge across the one shape in the picture that
  // should never have one, and left the peaks floating over a hill they were
  // supposed to be part of.
  glacier: Object.freeze({ halfWidth: 31, bottom: 2, massif: true }),
  // Stage 2 is the widest fortress silhouette, so its full footprint is the
  // safe width for every stage-specific landmark shape.
  landmark: Object.freeze({ halfWidth: 23, bottom: 2 }),
  // Rocks and drifts LIE ON the hill, so they take its angle. A pine grows
  // vertically and a fortress is built level whatever it is built on, so both
  // stay upright; a glacier is a mountain rather than something resting on one.
  'ice-rock': Object.freeze({ halfWidth: 13, bottom: 2, lean: 1 }),
  // A DRIFT, not an object standing on the hill. Everything else here is a hard
  // thing with a foot, and lifting it to the high ground and sweeping its
  // silhouette down to the snow is what makes that foot read. A snow bank is
  // already snow: give it the same treatment and the sweep shows up as a pale
  // straight edge running off down the slope, which is the one shape a drift
  // cannot have. So it plants on the ground under its own middle and takes no
  // skirt — the contour clip buries its uphill side, and being half-swallowed
  // by the slope is exactly what a drift does.
  snowbank: Object.freeze({ halfWidth: 18, bottom: 2, drift: true, lean: 1 }),
  // The trunk extends below the lowest boughs to the actual planting point.
  pine: Object.freeze({ halfWidth: 9, bottom: 3 }),
});
const FROST_SCENERY_EMBED = 0;
// Past the footprint on both sides, for the contour clip and the foot scan: a
// silhouette may be a little wider than the width it is planted on, and a clip
// that ends inside the art is a vertical cut, which is the same crime as the
// horizontal one.
const FROST_FEATURE_MARGIN = 4;
// A leaning silhouette reaches further sideways than the width it is planted
// on, so the contour it is clipped against has to be sampled wider still. A
// clip that is too wide costs nothing; one that ends inside the art is a
// vertical cut through it.
const FROST_LEAN_MARGIN = 12;

function frostFeatureLean(kind) {
  return FROST_FEATURE_FOOTPRINTS[kind]?.lean || 0;
}

function frostFeatureHalfSpan(kind, scale) {
  const footprint = FROST_FEATURE_FOOTPRINTS[kind];
  if (!footprint) return 0;
  return footprint.halfWidth * scale + FROST_FEATURE_MARGIN
    + (footprint.lean ? FROST_LEAN_MARGIN * scale : 0);
}
// Keep the trunk just inside the snow line. This is a real planting bite, not
// a cast shadow, and is small enough that the trunk remains visible.
const FROST_PINE_EMBED = 1.25;

// NOTHING ON THE FROST RIDGES CASTS A PAPER SHADOW.
//
// This used to be true of pines only, on the grounds that a bigger feature could
// carry cardstock depth. It cannot. An offset copy behind a fortress or a rock
// is the one mark in this picture that says "sheet lying on top of a sheet", and
// it fights the thing the ridges are for: distance. A drop shadow is a statement
// about how close something is to the surface behind it, and a peak on the far
// ridge is kilometres from it.
//
// Kept as a named predicate rather than deleted so the rule stays one decision
// with one place to argue about it, and so the suite can pin it.
function frostSceneryUsesPaperShadow() {
  return false;
}

// PLANT FROM THE CENTRE, THEN BURY AND EXTEND TO FIT.
//
// This used to plant from the DEEPEST point of the whole footprint, which was
// the only way to guarantee nothing hung in the air while the feature was drawn
// flat on top of the hill. It bought that at the price of the thing it was
// hiding: on a curved ridge the deepest edge of a wide foot can be twenty or
// thirty pixels below the ground under the feature's middle, so the feature
// stood that far down the slope with a horizontal line under it.
//
// Now the foot is solved properly instead. The feature is planted where the
// ridge is under its MIDDLE, which is simply where a thing standing there would
// be; frostFeatureFoot() reports how much further the ground falls away inside
// the footprint, and the painter extends the silhouette down by that much so
// there is material all the way to the snow on the downhill side. The contour
// clip then cuts both back to the hill. Nothing hangs, nothing is flat.
function frostRidgeAt(localX, dx, layerBaseY, amp, wl, period, options) {
  return ridgeProfile(localX + dx, layerBaseY, amp, wl, period,
    !!options.peak, !!options.mesa, !!options.dunes);
}

// How far the ground rises above and falls below the line the feature's base
// will lie on, across its footprint. For an upright feature that line is
// horizontal and this is simply the highest and lowest ground under it; for one
// that leans with the hill it is the ridge TANGENT, which is the whole value of
// leaning — the linear part of the slope disappears into the tilt and only the
// curvature is left for the lift and the skirt to deal with.
function frostFootprintRange(spec, localX, layerBaseY, amp, wl, period, options, slope = 0) {
  const scale = Math.max(0.1, Number(spec.scale) || 1);
  const centre = frostRidgeAt(localX, 0, layerBaseY, amp, wl, period, options);
  // The same span the contour clip covers, so the skirt can never stop short of
  // ground the clip is still showing.
  const halfWidth = frostFeatureHalfSpan(spec.kind, scale);
  let high = Infinity;
  let deep = -Infinity;
  const step = Math.max(1, halfWidth / 8);
  const sample = (dx) => {
    const rel = frostRidgeAt(localX, dx, layerBaseY, amp, wl, period, options)
      - centre - slope * dx;
    if (rel < high) high = rel;
    if (rel > deep) deep = rel;
  };
  for (let dx = -halfWidth; dx <= halfWidth + 0.001; dx += step) sample(dx);
  sample(-halfWidth);
  sample(halfWidth);
  return { centre, high: centre + high, deep: centre + deep };
}

// The angle a feature lies at: the ridge tangent under it, times how much of it
// that kind takes.
function frostFeatureAngle(spec, localX, layerBaseY, amp, wl, period, options) {
  const lean = frostFeatureLean(spec.kind);
  if (!lean) return 0;
  return ridgeTangentAngle(localX, layerBaseY, amp, wl, period,
    !!options.peak, !!options.mesa, !!options.dunes) * lean;
}

function frostEmbeddedBaseY(spec, localX, layerBaseY, amp, wl, period, options = {}, slope = 0) {
  const footprint = FROST_FEATURE_FOOTPRINTS[spec.kind];
  if (!footprint) return frostRidgeAt(localX, 0, layerBaseY, amp, wl, period, options) + 1;
  const scale = Math.max(0.1, Number(spec.scale) || 1);
  const embed = spec.kind === 'pine' ? FROST_PINE_EMBED : FROST_SCENERY_EMBED;
  const range = frostFootprintRange(spec, localX, layerBaseY, amp, wl, period, options, slope);
  const ground = footprint.drift ? range.centre : range.high;
  return ground - footprint.bottom * scale + embed;
}

/**
 * How far the ground falls below the planting point inside a feature's
 * footprint, in world pixels. The painter turns this into a skirt under the
 * silhouette; it is 0 on flat ground and on the uphill side, where the contour
 * clip does the work instead.
 */
function frostFeatureFoot(spec, localX, layerBaseY, amp, wl, period, options = {}, slope = 0) {
  const footprint = FROST_FEATURE_FOOTPRINTS[spec.kind];
  if (!footprint || footprint.drift) return 0;
  const { high, deep } = frostFootprintRange(spec, localX, layerBaseY, amp, wl, period, options, slope);
  // A pixel past the deepest sample: the clip is sampled at its own rate and a
  // skirt that stops exactly on the contour can leave a hairline of hill.
  return Math.max(0, deep - high) + 1;
}

// THE SKIRT IS THE SILHOUETTE, SWEPT DOWN — not a box under it.
//
// A rectangle was tried first and is what a rock outcrop looks like when it has
// gone wrong: the art ends on its own outline and then a slab of flat colour
// with two vertical sides carries on to the snow. Tapering the slab is worse
// again, because the contour clip is already cutting the bottom off, so the
// taper only pulls the sides in ABOVE the snow line and puts back the flat base
// this whole mechanism exists to remove.
//
// So the skirt is the feature's OWN silhouette, filled a few times on the way
// down. The union of those copies is the shape swept along its fall line, which
// means the foot keeps the sides the art had — and one path per copy, two or
// three copies at most, is the cheap way to get it.
// Small enough that a silhouette with a notch in its side sweeps down smoothly
// instead of stepping; large enough that the deepest foot on either ridge costs
// three extra paths, not ten.
const FROST_SKIRT_STEP = 4;
// The colour under each kind: what that silhouette's own base band is painted
// in by the shape above it.
const FROST_SKIRT_COLORS = Object.freeze({
  glacier: 'ice', 'ice-rock': 'iceShadow', snowbank: 'snow',
  pine: 'shadow', landmark: 'landmark',
});

function frostFeatureSkirt(kind) {
  const color = FROST_SKIRT_COLORS[kind];
  return color ? { color } : null;
}

// THE SNOW LINE IS THE BOTTOM EDGE, NOT A STRAIGHT CUT.
//
// A feature is planted from the DEEPEST point of its footprint, which is the
// only way to guarantee no part of it hangs in the air. On a slope that leaves
// the rest of its flat base standing proud of the hill: the fortress reads as a
// cut-out propped against the snow rather than something standing in it, and the
// giveaway is a perfectly horizontal line under a picture with no other
// horizontals in it.
//
// So the feature is clipped to the hill it stands on. Sample the ridge across
// the footprint and hand the placement that contour; the painter clips every
// pass to the region above it, and the snow itself — already painted, since
// Frost draws its scenery after its support hill — becomes the base. The shallow
// side is buried exactly as deep as the hill rises, which is what burial looks
// like.
function frostFeatureSurface(spec, localX, layerBaseY, amp, wl, period, options = {}) {
  const footprint = FROST_FEATURE_FOOTPRINTS[spec.kind];
  if (!footprint) return null;
  const scale = Math.max(0.1, Number(spec.scale) || 1);
  const half = frostFeatureHalfSpan(spec.kind, scale);
  const points = [];
  // Sixteen samples across. The contour is a smooth ridge, not terrain detail;
  // finer than this buys nothing and the array is rebuilt every frame.
  const step = (half * 2) / 16;
  for (let i = 0; i <= 16; i++) {
    const dx = -half + step * i;
    points.push({
      dx,
      y: ridgeProfile(localX + dx, layerBaseY, amp, wl, period,
        !!options.peak, !!options.mesa, !!options.dunes),
    });
  }
  return points;
}

function ridgeSceneryPlacements(ctx, camX, layerBaseY, options = {}) {
  const amp = Number(options.amp) || 40;
  const wl = Number(options.wl) || 70;
  const factor = Number(options.factor) || 0.3;
  const features = Array.isArray(options.features) && options.features.length
    ? options.features : FROST_NEAR_SCENERY_FEATURES;
  const secondaryFeatures = Array.isArray(options.secondaryFeatures)
    && options.secondaryFeatures.length ? options.secondaryFeatures : null;
  const extraFeatures = Array.isArray(options.extraFeatures)
    && options.extraFeatures.length ? options.extraFeatures : null;
  const period = Math.max(16, Math.round(Math.PI * wl));
  const scroll = ridgeScroll(camX, factor, period);
  const view = backgroundPaintCoverage(ctx);
  const firstX = view.left - scroll.off - period;
  const placements = [];
  for (let tileIndex = 0, tileX = firstX;
    tileX < view.right + period;
    tileIndex++, tileX += period) {
    const tile = scroll.tile + tileIndex - 1;
    const primary = features[((tile % features.length) + features.length) % features.length];
    const specs = secondaryFeatures
      ? [primary, secondaryFeatures[((tile % secondaryFeatures.length)
        + secondaryFeatures.length) % secondaryFeatures.length]]
      : [primary];
    if (extraFeatures) {
      specs.push(extraFeatures[((tile + 2) % extraFeatures.length
        + extraFeatures.length) % extraFeatures.length]);
    }
    for (let slotIndex = 0; slotIndex < specs.length; slotIndex++) {
      const spec = specs[slotIndex];
      // tileIndex is only the current screen iteration; it shifts by one when
      // the camera crosses a period. World-tile keys keep the same prop and
      // its small offset fixed through that wrap in both orientations.
      const parity = (((tile + slotIndex) % 2) + 2) % 2;
      const localX = spec.at * period + (parity ? 3 : -3);
      const x = tileX + localX;
      if (outsideView(ctx, x, 48)) continue;
      const crest = ridgeProfile(localX, layerBaseY, amp, wl, period,
        !!options.peak, !!options.mesa, !!options.dunes);
      // The angle the feature lies at, and the slope that follows from it: both
      // the planting and the skirt are measured against THAT line rather than a
      // horizontal one, so a rock lying along the hill needs almost no foot.
      const lean = options.embedFeatures
        ? frostFeatureAngle(spec, localX, layerBaseY, amp, wl, period, options) : 0;
      const leanSlope = lean ? Math.tan(lean) : 0;
      const baseY = options.embedFeatures
        ? frostEmbeddedBaseY(spec, localX, layerBaseY, amp, wl, period, options, leanSlope)
        : crest + 1;
      placements.push({
        ...spec, tile, slotIndex, localX, x, crest, baseY, lean,
        surface: options.embedFeatures
          ? frostFeatureSurface(spec, localX, layerBaseY, amp, wl, period, options)
          : null,
        foot: options.embedFeatures
          ? frostFeatureFoot(spec, localX, layerBaseY, amp, wl, period, options, leanSlope)
          : 0,
        angle: ridgeTangentAngle(localX, layerBaseY, amp, wl, period,
          !!options.peak, !!options.mesa, !!options.dunes),
      });
    }
  }
  return placements;
}

function frostSceneryPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const far = options.layer === 'far';
  const secondaryFeatures = options.secondaryFeatures === undefined
    ? (far ? FROST_FAR_SECONDARY_FEATURES : FROST_NEAR_SECONDARY_FEATURES)
    : options.secondaryFeatures;
  const extraFeatures = options.extraFeatures === undefined
    ? (options.portrait
      ? (far ? FROST_FAR_PORTRAIT_EXTRA_FEATURES : FROST_NEAR_PORTRAIT_EXTRA_FEATURES)
      : null)
    : options.extraFeatures;
  return ridgeSceneryPlacements(ctx, camX, layerBaseY, {
    amp: far ? 66 : 40,
    wl: far ? 130 : 70,
    factor: far ? 0.12 : 0.3,
    features: far ? FROST_FAR_SCENERY_FEATURES : FROST_NEAR_SCENERY_FEATURES,
    secondaryFeatures,
    extraFeatures,
    embedFeatures: true,
  });
}

function cryptSceneryPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const far = options.layer === 'far';
  return ridgeSceneryPlacements(ctx, camX, layerBaseY, {
    amp: far ? 55 : 32,
    wl: far ? 100 : 56,
    factor: far ? 0.15 : 0.35,
    features: CRYPT_SCENERY_FEATURES,
  });
}

function surgeSceneryPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  return ridgeSceneryPlacements(ctx, camX, layerBaseY, {
    amp: Number(options.amp) || 50,
    wl: Number(options.wl) || 110,
    factor: Number(options.factor) || 0.12,
    features: SURGE_SCENERY_FEATURES,
  });
}

function frostPineShape(ctx, palette = FROST_SCENERY_PALETTE) {
  ctx.fillStyle = palette.shadow || palette.trunk;
  // Extend the trunk to the planting point. The lower bough stops above it,
  // leaving a visible trunk all the way down to the snow line.
  ctx.fillRect(-1.2, -18, 2.4, 21);
  ctx.fillStyle = palette.far || palette.leaf;
  for (const [tipY, halfWidth, shoulderY] of [[-18, 5, -11], [-13, 7, -5], [-8, 9, -3]]) {
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(halfWidth, shoulderY);
    ctx.lineTo(-halfWidth, shoulderY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = palette.snow;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(2.2, -14.3);
  ctx.lineTo(-1.2, -14.3);
  ctx.closePath();
  ctx.fill();
}

function frostFill(ctx, color, path) {
  ctx.fillStyle = color;
  ctx.beginPath();
  path(ctx);
  ctx.closePath();
  ctx.fill();
}

// THE GLACIER IS A MOUNTAIN, SO IT IS DRAWN LIKE ONE: peaks at the top, flanks
// that SPLAY as they fall, and a base far below the planting point — 40 units,
// which at its 1.45 scale is ~58px, the whole distance from the far ridge down
// past the lane. Nothing sees that base: the near ridge paints over it, and the
// edge where the two meet is the near ridge's own curve. That is the point. The
// old shape stopped at the planting line with a flat bottom and was then clipped
// to the ridge contour, which on flat ground is a ruler-straight horizontal line
// under a peak — the one giveaway that a mountain is a sticker.
function frostGlacierPath(ctx) {
  ctx.moveTo(-34, 44);
  ctx.lineTo(-29, 4);
  ctx.lineTo(-23, -13);
  ctx.lineTo(-14, -31);
  ctx.lineTo(-8, -20);
  ctx.lineTo(1, -47);
  ctx.lineTo(8, -27);
  ctx.lineTo(15, -36);
  ctx.lineTo(22, -13);
  ctx.lineTo(28, 6);
  ctx.lineTo(34, 44);
}

function frostGlacierShape(ctx, palette) {
  // Body first, then the shadowed half, then the lit face, then the caps. The
  // body is the SHADOW tone rather than the ice tone: a formation this size is
  // mostly rock in its own shade, and the ice is the light coming off the faces
  // that turn toward the sky. Painted the other way round it was a pale cut-out
  // the same value as the hills it stands behind.
  frostFill(ctx, palette.iceShadow || palette.shadow, frostGlacierPath);
  // The lit flank of each peak: everything east of the ridge line catches the
  // sky, so the peaks read as solid rather than as outlines.
  frostFill(ctx, palette.ice || palette.far, (c) => {
    c.moveTo(1, -47); c.lineTo(8, -27); c.lineTo(12, 2); c.lineTo(18, 44);
    c.lineTo(34, 44); c.lineTo(28, 6); c.lineTo(22, -13); c.lineTo(15, -36);
    c.lineTo(11, -24); c.closePath();
  });
  frostFill(ctx, palette.ice || palette.far, (c) => {
    c.moveTo(-14, -31); c.lineTo(-8, -20); c.lineTo(-6, 44); c.lineTo(-14, 44);
    c.closePath();
  });
  // Snow caps, on the three summits and down the main peak's shoulder.
  frostFill(ctx, palette.snow, (c) => {
    c.moveTo(1, -47); c.lineTo(6, -33); c.lineTo(3, -32); c.lineTo(0, -27);
    c.lineTo(-5, -23); c.lineTo(-2, -32); c.closePath();
  });
  frostFill(ctx, palette.snow, (c) => {
    c.moveTo(15, -36); c.lineTo(18, -28); c.lineTo(15, -27); c.lineTo(12, -24);
    c.closePath();
  });
  frostFill(ctx, palette.snow, (c) => {
    c.moveTo(-14, -31); c.lineTo(-11, -24); c.lineTo(-14, -23); c.lineTo(-17, -20);
    c.closePath();
  });
}

function frostIceRockPath(ctx) {
  ctx.moveTo(-13, 2);
  ctx.lineTo(-12, -6);
  ctx.lineTo(-5, -11);
  ctx.lineTo(3, -9);
  ctx.lineTo(10, -4);
  ctx.lineTo(13, 2);
}

function frostIceRockShape(ctx, palette) {
  frostFill(ctx, palette.iceShadow || palette.shadow, frostIceRockPath);
  frostFill(ctx, palette.ice || palette.near, (c) => {
    c.moveTo(-12, -6); c.lineTo(-5, -11); c.lineTo(3, -9);
    c.lineTo(-1, -3); c.lineTo(-9, -2); c.closePath();
  });
  frostFill(ctx, palette.snow, (c) => {
    c.moveTo(-5, -11); c.lineTo(3, -9); c.lineTo(0, -6); c.lineTo(-5, -7);
    c.closePath();
  });
}

function frostSnowbankPath(ctx) {
  ctx.moveTo(-18, 2);
  ctx.quadraticCurveTo(-16, -7, -8, -6);
  ctx.quadraticCurveTo(-3, -14, 5, -7);
  ctx.quadraticCurveTo(13, -10, 18, 2);
}

function frostSnowbankShape(ctx, palette) {
  frostFill(ctx, palette.iceShadow || palette.shadow, frostSnowbankPath);
  frostFill(ctx, palette.snow, (c) => {
    c.moveTo(-17, -1); c.quadraticCurveTo(-12, -7, -7, -5);
    c.quadraticCurveTo(-2, -11, 5, -5); c.quadraticCurveTo(11, -7, 16, -1);
    c.lineTo(16, 2); c.lineTo(-17, 2); c.closePath();
  });
  ctx.strokeStyle = palette.ice || palette.near;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-11, -2); ctx.quadraticCurveTo(-6, -5, -2, -2);
  ctx.moveTo(5, -2); ctx.quadraticCurveTo(10, -5, 13, -2);
  ctx.stroke();
}

function frostLandmarkPath(ctx, stageIndex = 1) {
  if (stageIndex === 2) {
    ctx.moveTo(-22, 2); ctx.lineTo(-20, -11); ctx.lineTo(-13, -16);
    ctx.lineTo(-8, -10); ctx.lineTo(-5, -25); ctx.lineTo(1, -31);
    ctx.lineTo(7, -22); ctx.lineTo(9, -13); ctx.lineTo(16, -18);
    ctx.lineTo(22, -10); ctx.lineTo(23, 2); return;
  }
  if (stageIndex === 3) {
    ctx.moveTo(-13, 2); ctx.lineTo(-11, -24); ctx.lineTo(-5, -28);
    ctx.lineTo(-4, -37); ctx.lineTo(0, -41); ctx.lineTo(4, -37);
    ctx.lineTo(5, -28); ctx.lineTo(11, -24); ctx.lineTo(13, 2); return;
  }
  ctx.moveTo(-18, 2); ctx.lineTo(-16, -17); ctx.lineTo(-11, -17);
  ctx.lineTo(-11, -26); ctx.lineTo(-5, -22); ctx.lineTo(0, -29);
  ctx.lineTo(6, -22); ctx.lineTo(11, -26); ctx.lineTo(11, -17);
  ctx.lineTo(16, -17); ctx.lineTo(18, 2);
}

// THE LIT FACE RUNS THE FULL HEIGHT OF THE WALL. It used to stop at the
// planting line while the silhouette below it carried on into the snow on the
// skirt, so the one bright band in the picture ended in mid-wall with a hand's
// width of dark stone under it. `depth` is how far the skirt sweeps past the
// base (in the feature's own units), and the band is taken to the bottom of it;
// the snow contour clip is then the only thing that decides where it stops,
// which is the same rule the silhouette follows.
//
// WINDOWS ARE THE ONLY LIGHT IN ACT II, and there are never more than THREE of
// them on a fortress. A grid of them turns the one building in the picture into
// an apartment block: regular spacing is the single strongest signal a shape can
// send that it is modern, occupied and municipal, which is three things a frozen
// keep is not. Five was still a row of offices; three is a place with somebody
// in it. They are placed by hand, no two sharing a row or a column, in slightly
// different sizes.
//
// They blink: each one keeps its own slow clock, seeded off the world tile the
// fortress stands on, so the pattern belongs to THAT fortress and does not slide
// with the camera — and a blink is a dimming to the wall's own shade, not a hole
// punched in the wall.
const FROST_WINDOW_DIM = 0.78;
function frostWindows(ctx, palette, cells, lights = {}) {
  const t = Number(lights.t) || 0;
  const seed = Math.abs(Math.round(Number(lights.seed) || 0));
  const lit = palette.warm;
  // Mixed toward the wall rather than to nothing: an unlit window is still a
  // window, and at this size a transparent one is just a missing pixel.
  const dark = frostMix(lit, palette.landmark || palette.shadow || '#39506b',
    FROST_WINDOW_DIM);
  for (let i = 0; i < cells.length; i++) {
    const [x, y, w, h] = cells[i];
    const key = seed * 31 + i * 7;
    // 2.6–4.7s per window, each starting somewhere else in its own cycle. With
    // three windows on a clock this short something in the building is always
    // just about to go dark, which is the whole point of the light being there:
    // at the far end of a blizzard a steady lamp is a texture and a flickering
    // one is a person.
    const period = 2.6 + (key % 8) * 0.3;
    const u = ((t / period) + ((key * 0.6180339887) % 1)) % 1;
    // A blink and a second one right behind it for two windows in three: one
    // clean on/off reads as a bulb, two reads as somebody walking past the
    // glass.
    const blink = u < 0.06 || (key % 3 !== 0 && u > 0.1 && u < 0.15);
    ctx.fillStyle = blink ? dark : lit;
    ctx.fillRect(x, y, w, h);
  }
}

function frostLandmarkShape(ctx, palette, stageIndex = 1, options = {}) {
  const depth = Math.max(0, Number(options.depth) || 0);
  const foot = 2 + depth;
  frostFill(ctx, palette.landmark || palette.shadow, (c) => frostLandmarkPath(c, stageIndex));
  if (stageIndex === 2) {
    frostFill(ctx, palette.ice || palette.near, (c) => {
      c.moveTo(-20, -11); c.lineTo(-13, -16); c.lineTo(-8, -10);
      c.lineTo(-10, foot); c.lineTo(-20, foot); c.closePath();
    });
    frostFill(ctx, palette.snow, (c) => {
      c.moveTo(-5, -25); c.lineTo(1, -31); c.lineTo(7, -22); c.lineTo(3, -22);
      c.lineTo(0, -26); c.lineTo(-3, -21); c.closePath();
    });
    frostWindows(ctx, palette, [
      [-16.5, -6.5, 2.6, 3], [2.5, -8, 2.4, 2.8], [12.5, -3, 2.2, 2.4],
    ], options);
    return;
  }
  if (stageIndex === 3) {
    frostFill(ctx, palette.ice || palette.near, (c) => {
      c.moveTo(-10, -23); c.lineTo(-4, -27); c.lineTo(-4, foot); c.lineTo(-10, foot);
      c.closePath();
    });
    ctx.strokeStyle = palette.warm;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -31); ctx.lineTo(4, -34); ctx.lineTo(-4, -37);
    ctx.stroke();
    // The tower is the tallest thing on the ridge and the one the player sees
    // most of: it gets a whole stack of windows up the dark face, two abreast,
    // and a lone pair down where the snow is about to take the wall.
    frostWindows(ctx, palette, [
      [-1.4, -24.5, 2.6, 3], [4, -14, 2.2, 2.4], [-1, -5, 2.4, 3],
    ], options);
    return;
  }
  // THE CROWN NEEDS LEGS.
  //
  // The cap fills the WHOLE interior of the crenellation with snow, offset
  // three units below the sawtooth and then carried on down to y = -14, so the
  // merlons survive as a 3-unit dark rim with nine to twelve units of snow
  // under them. Snow would be fine if it read as snow. On Frost 1 it does not:
  // the act opens on a flat white afternoon and the landmark takes 0.46 x 0.8
  // haze toward that sky, so hazed #d8e9ef and the sky behind the fortress land
  // on the same value. The field reads as background showing through and the
  // rim floats over the building with nothing holding it up.
  //
  // TAKING THE SNOW AWAY IS THE WRONG FIX. It was tried — cap shortened to a
  // ribbon lying on the parapet — and it turns the merlons into spikes. The
  // band is the right shape; what it was missing is the two uprights that make
  // it a crown rather than a mark. So each end merlon gets a leg down the outer
  // edge of the crown to the foot of the cap, and the shape closes.
  //
  // 1.6 is the lightest weight that does it, picked over 2.6 in the gallery: the
  // leg is a stroke closing a drawn shape, not a second wall, and at the rim's
  // own weight it stopped being a crown and became a box. Its top follows the
  // merlon's own slope so it can never poke above the silhouette.
  const CROWN_LEG = 1.6;
  frostFill(ctx, palette.snow, (c) => {
    c.moveTo(-16, -17); c.lineTo(-11, -17); c.lineTo(-11, -23);
    c.lineTo(-5, -19); c.lineTo(0, -26); c.lineTo(6, -19); c.lineTo(11, -23);
    c.lineTo(11, -17); c.lineTo(16, -17); c.lineTo(13, -14); c.lineTo(-13, -14);
    c.closePath();
  });
  // Slopes of the two outer merlons: (-11,-26)->(-5,-22) is 4/6, and
  // (11,-26)->(6,-22) is 4/5. The leg's inner top sits on that line.
  frostFill(ctx, palette.landmark || palette.shadow, (c) => {
    c.moveTo(-11, -26);
    c.lineTo(-11 + CROWN_LEG, -26 + (4 / 6) * CROWN_LEG);
    c.lineTo(-11 + CROWN_LEG, -14); c.lineTo(-11, -14);
    c.closePath();
  });
  frostFill(ctx, palette.landmark || palette.shadow, (c) => {
    c.moveTo(11, -26);
    c.lineTo(11 - CROWN_LEG, -26 + (4 / 5) * CROWN_LEG);
    c.lineTo(11 - CROWN_LEG, -14); c.lineTo(11, -14);
    c.closePath();
  });
  frostWindows(ctx, palette, [
    [-11.5, -10.5, 2.6, 3], [1, -6, 2.2, 2.4], [8.5, -11, 2.4, 2.8],
  ], options);
}

function frostFeatureSilhouette(ctx, feature, stageIndex = 1) {
  if (feature.kind === 'pine') {
    ctx.moveTo(0, -18); ctx.lineTo(5, -11); ctx.lineTo(7, -5);
    ctx.lineTo(9, -1); ctx.lineTo(-9, -1); ctx.lineTo(-7, -5); ctx.lineTo(-5, -11);
    ctx.closePath();
    return;
  }
  if (feature.kind === 'glacier') {
    frostGlacierPath(ctx); return;
  }
  if (feature.kind === 'ice-rock') {
    frostIceRockPath(ctx); return;
  }
  if (feature.kind === 'snowbank') {
    frostSnowbankPath(ctx); return;
  }
  frostLandmarkPath(ctx, stageIndex);
}

// Mix a hex toward another hex. Distance is a COLOUR operation here, not an
// alpha one: dropping the opacity of a peak lets the ridge's own edge show
// through it, and two overlapping peaks then read as glass.
function frostMix(hex, toward, amount) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(toward.slice(1), 16);
  const f = Math.max(0, Math.min(1, amount));
  const ch = (shift) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * f);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// AERIAL PERSPECTIVE, NOT A DARKER BLUE.
//
// The Frost scenery palette was authored against nothing and read as a set of
// near-black cut-outs pasted onto a pale blue country — the far ridge's peaks
// were the highest-contrast thing in the frame, which is exactly backwards.
// Every colour is mixed toward what is actually behind that layer (the sky for
// the far ridge, the far ridge's own hill for the near one), which keeps the
// palette's internal order — snow lightest, shadow darkest — while moving the
// whole set into the family of its surroundings.
// Picked off the ladder in the gallery. Further than this and the fortress
// stops being a landmark; nearer and the peaks are still the highest-contrast
// thing in a pale frame, which is backwards for the most distant object in it.
const FROST_ATMOSPHERE = Object.freeze({ far: 0.46, near: 0.2 });
// HAZE BY WHAT THE THING IS, not only by which sheet it is on.
//
// The far ridge carries two features with opposite jobs. A glacier is a
// mountain on the horizon and should be most of the way to sky — left at the
// layer's own strength it was the tallest, hardest-edged thing in the frame,
// standing over the hills instead of behind them. The fortress on the same
// sheet is the level's landmark and the one thing on that ridge the player is
// meant to pick out, so it gets LESS than the layer, not more.
//
// REVISED for the massif: 1.6 was the right number for a peak floating on the
// horizon, and the wrong one for a mountain the near hills are standing in front
// of. At that haze the formation was the same value as the ridge it rose out of
// and the silhouette disappeared; the depth now comes from the near ridge
// crossing it, which only reads if there is something there to cross. It still
// takes MORE haze than its own layer — it is the most distant thing in the
// picture — just not most of the way to sky.
const FROST_HAZE_BY_KIND = Object.freeze({
  glacier: 0.8, landmark: 0.8,
});
const FROST_HAZE_MAX = 0.86;
// Gallery seam: a bake-off dials the pair without a second copy of the palette.
let frostAtmosphereOverride = null;
function setFrostAtmosphere(next) { frostAtmosphereOverride = next || null; }
const frostAtmospherePalettes = new Map();

function frostAtmosphericPalette(layer, cab, kind, stageIndex = 1) {
  const light = frostStageLight(stageIndex);
  const far = layer === 'far';
  // Toward the sky THIS STAGE has. Aerial perspective is a statement about what
  // is behind a thing, so it has to follow the light rather than a fixed day.
  const toward = far ? light.sky[0] : light.far;
  const table = frostAtmosphereOverride || FROST_ATMOSPHERE;
  const amount = Math.min(FROST_HAZE_MAX,
    (far ? table.far : table.near) * (FROST_HAZE_BY_KIND[kind] ?? 1));
  const key = `${layer}|${toward}|${amount}|${light.name}`;
  let palette = frostAtmospherePalettes.get(key);
  if (palette) return palette;
  palette = {};
  for (const [name, hex] of Object.entries(FROST_SCENERY_PALETTE)) {
    // The lit window stays the warm accent it is: haze washes the rock, not the
    // one thing in the picture that is emitting — and by dusk it is the only
    // warm mark left, so the stage tint skips it too.
    palette[name] = name === 'warm' ? hex
      : frostMix(frostMix(hex, light.tint, light.tintAmount), toward, amount);
  }
  palette = Object.freeze(palette);
  frostAtmospherePalettes.set(key, palette);
  return palette;
}

function frostPaperPalette(palette, color) {
  return {
    ...palette, far: color, near: color, snow: color, shadow: color,
    ice: color, iceShadow: color, landmark: color, warm: color,
  };
}

// Clip to the snow. Called after the translate to the planting point and BEFORE
// the feature's own scale, because the contour arrives in world pixels — it was
// sampled across a footprint that already had the feature's scale in it.
function frostClipToSnow(ctx, feature) {
  const surface = feature.surface;
  if (!Array.isArray(surface) || surface.length < 2) return;
  const first = surface[0];
  const last = surface[surface.length - 1];
  // Tall enough to clear anything on either ridge; the sky end of the clip is
  // never the edge that matters.
  const top = -400;
  ctx.beginPath();
  ctx.moveTo(first.dx, top);
  for (const point of surface) ctx.lineTo(point.dx, point.y - feature.baseY);
  ctx.lineTo(last.dx, top);
  ctx.closePath();
  ctx.clip();
}

function drawFrostSceneryFeature(ctx, feature, options = {}) {
  const stageIndex = Math.max(1, Math.min(3, Number(options.stageIndex) || 1));
  const hazed = frostAtmosphericPalette(options.layer, options.cab, feature.kind, stageIndex);
  const palette = options.layer === 'far'
    ? { ...hazed, far: hazed.far }
    : { ...hazed, far: hazed.near };
  // Gallery seam (the rocks-and-fortresses bake-off, src/dev/frost-rock-fortress-
  // candidates.js): a study may swap a kind's painter AND its silhouette, so the skirt,
  // the paper shadow and the grain follow the new shape. It paints from the same hazed
  // palette keys, which is what lets the paper passes flatten it. The game passes none.
  // The fortresses themselves come the same way (frostFortresses.js): the redrawn set, a
  // Crystal Citadel every fifth site, and frost-2's original ruin (null: the painter below)
  // alternating with its redrawn one.
  // A study naming a kind with null asks for the shipped painter (a bake-off's "as it was").
  const studyShapes = options.sceneryStudy?.shapes;
  const alt = studyShapes && feature.kind in studyShapes ? studyShapes[feature.kind]
    : (feature.kind === 'landmark' ? frostFortressShape(stageIndex, feature.tile) : null);
  const footDepth = feature.foot > 0.5 ? feature.foot / Math.max(0.1, Number(feature.scale) || 1) : 0;
  const silhouette = (c) => (alt
    ? alt.silhouette(c, feature, stageIndex, footDepth) : frostFeatureSilhouette(c, feature, stageIndex));
  const paint = (paintPalette) => {
    if (alt) {
      alt.paint(ctx, paintPalette, stageIndex, {
        feature, t: options.t,
        depth: feature.foot > 0.5 ? feature.foot / Math.max(0.1, Number(feature.scale) || 1) : 0,
        seed: (Number(feature.tile) || 0) * 3 + (Number(feature.slotIndex) || 0),
      });
      return;
    }
    switch (feature.kind) {
      case 'glacier': frostGlacierShape(ctx, paintPalette); break;
      case 'ice-rock': frostIceRockShape(ctx, paintPalette); break;
      case 'snowbank': frostSnowbankShape(ctx, paintPalette); break;
      case 'landmark':
        frostLandmarkShape(ctx, paintPalette, stageIndex, {
          // How far the skirt sweeps past the base, in the feature's own units,
          // so the lit face reaches the snow instead of stopping at the base.
          depth: feature.foot > 0.5
            ? feature.foot / Math.max(0.1, Number(feature.scale) || 1) : 0,
          t: options.t,
          // The world tile the fortress stands on: the same fortress keeps the
          // same window pattern however the camera moves past it.
          seed: (Number(feature.tile) || 0) * 3 + (Number(feature.slotIndex) || 0),
        });
        break;
      default: frostPineShape(ctx, paintPalette); break;
    }
  };
  const massif = !!FROST_FEATURE_FOOTPRINTS[feature.kind]?.massif;
  ctx.save();
  ctx.translate(feature.x, feature.baseY);
  // The clip is world-space snow, so it goes on before the feature's own frame.
  // A MASSIF IS NOT CLIPPED: it does not stand on the snow line, it passes
  // through it and keeps going, and the near ridge painted after it is what cuts
  // it off — with the near ridge's own curve rather than a horizontal rule.
  if (!massif) frostClipToSnow(ctx, feature);
  // Then lie the thing along the hill. A rock and a drift take the ridge's
  // angle; a pine and a fortress do not, and get 0 here.
  if (feature.lean) ctx.rotate(feature.lean);
  ctx.scale(feature.scale, feature.scale);
  // The skirt first, so the silhouette's own colours win everywhere they exist
  // and the skirt is only ever the strip between the art and the snow.
  // And it takes no skirt either — the sweep exists to close the gap between a
  // foot and the snow, and this shape has already gone past both.
  // A shape that draws its own foot to the snow (`ownFoot`, frostFortresses.js) takes no
  // skirt: stepped copies of a leaning outline come out as a sawtooth edge.
  const skirt = (!massif && feature.foot > 0.5 && !alt?.ownFoot) ? frostFeatureSkirt(feature.kind) : null;
  if (skirt) {
    const scale = Math.max(0.1, Number(feature.scale) || 1);
    const depth = feature.foot / scale;
    const steps = Math.max(1, Math.ceil(depth / FROST_SKIRT_STEP));
    ctx.fillStyle = palette[skirt.color] || palette.shadow;
    // Deepest copy first: the nearer ones lie over it, so the union comes out
    // with the silhouette's own edges rather than the deepest copy's.
    for (let i = steps; i >= 1; i--) {
      ctx.save();
      ctx.translate(0, (depth * i) / steps);
      ctx.beginPath();
      silhouette(ctx);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  if (options.paper && frostSceneryUsesPaperShadow(feature)) {
    paperShadowPass(ctx, () => paint(frostPaperPalette(palette, PAPER_DEEP_COLOR)),
      PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, () => paint(frostPaperPalette(palette, PAPER_CONTACT_COLOR)),
      PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
  }
  paint(palette);
  // The selected snow finish shares this same planted, clipped feature frame.
  // Gallery cards can substitute an earlier study for comparison.
  if (!alt) options.sceneryStudy?.feature?.(ctx, feature, palette, stageIndex);
  if (options.paper) {
    paperFinishPass(ctx, () => {
      silhouette(ctx);
    },
      sharedPaperPatternFor(ctx, options.paperMaterial || 'cardstockClear'), {
        grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA * (options.paperStrength ?? 1), rim: false,
      });
  }
  ctx.restore();
}

function drawFrostScenery(ctx, camX, layerBaseY, options = {}) {
  for (const feature of frostSceneryPlacements(ctx, camX, layerBaseY, options)) {
    drawFrostSceneryFeature(ctx, feature, options);
  }
}

// --- Frost aurora ----------------------------------------------------------
//
// Frost is painted as cut paper, so the aurora is translucent vellum laid over
// the sky rather than an additive glow — the same material rule the rest of the
// cabinet follows, and the reason it takes a grain pass but no drop shadow
// (light casts nothing, which is also why a Frost pine is off the shadow list).
//
// THE RAYS ARE THE SILHOUETTE. A smooth arch with brightened columns inside it
// reads, at any alpha that survives this pale sky, as a loaf of green bread. So
// a curtain is built as two shapes:
//
//   1. a continuous lower BAND hugging the baseline — the crisp under-edge a
//      real curtain has, and the only part solid all the way across;
//   2. a COMB of near-parallel rays standing on that band, open sky between.
//
// Three ray shapes were tried and two are traps. Needles tapering to a point
// read as grass or a crown; wide triangles read as a picket fence. A ray is a
// COLUMN that narrows only slightly, and it ends by FADING, not by stopping.
//
// That last rule is why the heights are quantised. A canvas gradient bakes the
// transform it was built under, so one gradient shared across rays of different
// heights leaves every shorter ray stopping on a blunt, still-opaque cap — the
// single most obvious tell that this is drawn geometry. A gradient per ray
// fixes it and costs a few dozen gradients a frame, which this file already
// warns is the expensive thing to do at device resolution. So ray heights snap
// to a handful of steps and one gradient is built per step: every tip lands on
// its own fade, and a curtain pays for FROST_AURORA_RAY_STEPS gradients rather
// than one per ray. The steps are invisible — real curtains bunch anyway.
//
// Both shapes taper to nothing at the two ends through the sin(pi·f) envelope:
// a curtain that stops on a vertical edge reads as a torn rectangle and gives
// the wrap point away. And the whole thing sits high in the sky — placed near
// the ridges it stops being weather in the upper atmosphere and becomes a green
// cloud bank sitting on the hills.
const FROST_AURORA_TOP = 6;
// The lifted far ridge crests around y=130, and the curtain's blurred lower
// edge has to stay off it: the moment the aurora touches the hills it stops
// being sky and becomes a glow sitting on the snow.
const FROST_AURORA_BOTTOM = 124;
// Ray width as a fraction of its slot. Below roughly 0.6 the comb opens into
// separate spikes; at 1 it closes back into the solid arch this shape exists to
// avoid — and portrait's backing density fills the gaps in first.
const FROST_AURORA_RAY_DUTY = 0.82;
const FROST_AURORA_RAY_TAPER = 0.72;
// Rays are field-aligned, so they splay gently away from the middle of the
// curtain rather than standing parallel like a fence.
const FROST_AURORA_RAY_SPLAY = 0.12;
// Seven steps across fifteen rays: at five, enough rays shared a height that
// the comb read as a repeating bar chart.
const FROST_AURORA_RAY_STEPS = 7;
const FROST_AURORA_RAY_FLOOR = 0.34;
// The lower band, as a fraction of the curtain height.
const FROST_AURORA_BAND = 0.26;
// How hard the curtain is defocused, in authored pixels. The blur happens ONCE
// inside the bake, so it is free at the blit however heavy it gets — and heavy
// is the point: an aurora has no edge, and the comb's job at this radius is to
// survive as vertical STRIATION rather than as countable rays.
const FROST_AURORA_BLUR = 10;
// A Gaussian conserves energy but this shape is mostly transparent gap, so the
// blur spends a lot of it on sky and the curtain reads dimmer the harder it is
// defocused. Give the alpha back what the radius took, or "softer" silently
// also means "fainter" and the two decisions stop being separable.
const FROST_AURORA_BLUR_LIFT = 0.032;
const FROST_AURORA_STEPS = 18;
// Per stage: how hard the whole pass is pushed. Frost 1 is a first hint, 3 is
// the night the fortress is actually under.
const FROST_AURORA_STAGE_GAIN = Object.freeze([0, 0.74, 1, 1.3]);
const FROST_AURORA_STAGE_CURTAINS = Object.freeze([0, 2, 3, 3]);

// `y` is a fraction of the aurora rectangle and `h` a fraction of the headroom
// above that baseline, so portrait's much taller resolved sky stretches the
// whole display and no curtain can ever reach past the top of the rectangle.
const FROST_AURORA_CURTAINS = Object.freeze([
  {
    at: 0.05, y: 0.70, h: 0.94, w: 430, amp: 8, wl: 250, rays: 24,
    color: '#6ed3a6', tip: '#9db2e8', alpha: 0.32, drift: 0.028, phase: 0,
  },
  {
    at: 0.38, y: 0.86, h: 0.78, w: 360, amp: 6, wl: 210, rays: 20,
    color: '#7cd8c2', tip: '#a89ae2', alpha: 0.27, drift: 0.042, phase: 1.7,
  },
  {
    at: 0.70, y: 0.52, h: 0.9, w: 500, amp: 10, wl: 300, rays: 28,
    color: '#5fc79a', tip: '#9aabe2', alpha: 0.2, drift: 0.018, phase: 3.1,
  },
]);

// WHERE A THING CROSSING THE FROST SKY STARTS AND HOW HIGH IT GETS, in the
// pack's own local space — the finish flypast today, anything else that goes
// past tomorrow.
//
// It flies an ARC over the finish mast: in low over the left, cresting just
// above the pole's finial, and out over the right edge. So the shape is pinned
// to the POLE, not to the frame, and that is the whole trick — it is why this
// composes itself in portrait instead of needing a second set of numbers.
//
// A frame-pinned arc cannot do that. The authored 0..232 sky is not the sky a
// phone shows (a 393x852 handset is a 480x1041 logical frame whose sky runs from
// 144 to a groundline at 765, through a 1.778x backdrop zoom), so an arc aimed
// at the top of the picture climbs three times as far in portrait as it does in
// landscape and leaves the flypast a speck over the HUD. Aimed at the mast, both
// orientations fly the same picture: the pole is drawn through the world camera,
// so it is already where the composition put it.
//
// START is a fraction of the way from the groundline up to that crest, so a low
// crest gets a shallow arc and the team never begins above the height it is
// climbing to — which is exactly what happened the first time this was measured
// off the picture instead: in portrait the "half way up the frame" start sat
// higher than the pole it was supposed to be climbing towards.
const FLYPAST_START_UP = 0.45;

/**
 * The arc's two fixed heights, in the pack's local space: where it comes in and
 * where it crests.
 *
 * `poleTopY` is the finial, already converted into local space by the caller.
 * The clearance over it is a FRACTION OF THE POLE'S OWN DRAWN HEIGHT rather than
 * a flat number, which is what makes one rule work in both orientations: the
 * mast is drawn through the world camera, so in portrait it stands 3.5x tall
 * against a 1.778x backdrop and a landscape-sized gap over it reads as a near
 * miss. Proportional, it is about 28 local px in landscape and half as much
 * again in portrait, where the picture has the room for it.
 *
 * `hudKeep` is the other end of that: the top of a landscape frame belongs to
 * the GOAL/BONUS panel on the right, and a flypast cresting into it is a sleigh
 * flying behind the readout. It clamps the crest down, and it is why the crest
 * is never simply "as high as it likes".
 */
export function frostFlypastArc(context = null, poleTopY = null, {
  clear = 0.18, clearMin = 18, hudKeep = 44, over = 0,
} = {}) {
  const band = context?.backgroundBand;
  const top = Number.isFinite(Number(band?.top)) ? Number(band.top) : 0;
  const pole = Number(poleTopY);
  let apex;
  if (Number.isFinite(pole)) {
    apex = pole - Math.max(clearMin, (GROUND_Y - pole) * clear);
  } else {
    // No mast to clear (a preview, a card, a stage without a marker).
    apex = top + (GROUND_Y - top) * 0.25;
  }
  // Never into the HUD, never so low the arc has nothing to do. `over` is the
  // extra rise the flight takes AFTER the crest, so the clamp has to hold room
  // for it too or the levelling-out is what lands in the readout.
  apex = Math.max(top + hudKeep + Math.max(0, over), Math.min(apex, GROUND_Y - 40));
  return { apex, start: GROUND_Y - (GROUND_Y - apex) * FLYPAST_START_UP };
}

// The aurora owns the top of the sky. Portrait resolves a much taller sky than
// the authored frame, so take the rectangle from the composition bands where
// they exist rather than lifting the landscape numbers by a fudge factor.
function frostAuroraRect(context = null) {
  const bands = context?.sceneryLayout?.bands;
  const top = Number(bands?.celestial?.top);
  const bottom = Number(bands?.upperCloud?.bottom);
  if (Number.isFinite(top) && Number.isFinite(bottom) && bottom - top > 40) {
    return { top, height: bottom - top };
  }
  return { top: FROST_AURORA_TOP, height: FROST_AURORA_BOTTOM - FROST_AURORA_TOP };
}

// A ray fades out in its OWN colour. Ramping to transparent white gains
// luminance on the way down, so against a dark sky the tip brightens as it
// thins and the column looks like it stopped rather than dissolved.
function frostAuroraFade(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
}

// The span envelope: 1 in the middle, 0 at both ends.
function frostAuroraEnvelope(f) {
  return Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, f))), 0.5);
}

// Local space: the curtain's own baseline is y = 0.
function frostAuroraWaveY(f, k, amp, phase) {
  return Math.sin(phase + f * k) * amp;
}

// Which height step this ray stands at, as a fraction of the curtain height.
function frostAuroraRayStep(i, rays, phase) {
  const f = (i + 0.5) / rays;
  const raw = frostAuroraEnvelope(f)
    * (0.66 + 0.34 * (0.5 + 0.5 * Math.sin(phase * 1.7 + i * 2.3)));
  const step = Math.round(raw * (FROST_AURORA_RAY_STEPS - 1));
  return step / (FROST_AURORA_RAY_STEPS - 1);
}

// The crisp under-edge, continuous across the whole span.
function frostAuroraBandPath(ctx, w, h, amp, k, phase) {
  ctx.beginPath();
  for (let i = 0; i <= FROST_AURORA_STEPS; i++) {
    const f = i / FROST_AURORA_STEPS;
    const py = frostAuroraWaveY(f, k, amp, phase);
    if (i === 0) ctx.moveTo(0, py); else ctx.lineTo(w * f, py);
  }
  for (let i = FROST_AURORA_STEPS; i >= 0; i--) {
    const f = i / FROST_AURORA_STEPS;
    ctx.lineTo(w * f,
      frostAuroraWaveY(f, k, amp, phase) - h * FROST_AURORA_BAND * frostAuroraEnvelope(f));
  }
  ctx.closePath();
}

// One gradient per height step, built in the curtain's local space so each
// ray's fade ends exactly at that ray's tip.
function frostAuroraGradient(ctx, spec, height) {
  const grad = ctx.createLinearGradient(0, spec.amp, 0, -height);
  grad.addColorStop(0, spec.color);
  grad.addColorStop(0.58, spec.color);
  grad.addColorStop(0.86, spec.tip);
  grad.addColorStop(1, frostAuroraFade(spec.tip));
  return grad;
}

function frostAuroraRays(ctx, spec, h, k, phase) {
  const { w, amp, rays } = spec;
  const slot = w / rays;
  const grads = new Array(FROST_AURORA_RAY_STEPS).fill(null);
  for (let i = 0; i < rays; i++) {
    const level = frostAuroraRayStep(i, rays, phase);
    if (level <= 0) continue;
    const rh = h * (FROST_AURORA_RAY_FLOOR + (1 - FROST_AURORA_RAY_FLOOR) * level);
    const slot4 = Math.round(level * (FROST_AURORA_RAY_STEPS - 1));
    if (!grads[slot4]) grads[slot4] = frostAuroraGradient(ctx, spec, rh);
    const wobble = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(i * 1.27 + phase * 0.9));
    const half = slot * FROST_AURORA_RAY_DUTY * 0.5 * wobble;
    const tipHalf = half * FROST_AURORA_RAY_TAPER;
    const slide = Math.sin(i * 0.83 + phase * 2.1) * slot * 0.18;
    const cx = slot * (i + 0.5) + slide;
    const f = Math.max(0, Math.min(1, cx / w));
    const foot = frostAuroraWaveY(f, k, amp, phase);
    const lean = (cx - w / 2) * FROST_AURORA_RAY_SPLAY * level;
    ctx.fillStyle = grads[slot4];
    ctx.beginPath();
    ctx.moveTo(cx - half, foot);
    ctx.lineTo(cx + lean - tipHalf, foot - rh);
    ctx.lineTo(cx + lean + tipHalf, foot - rh);
    ctx.lineTo(cx + half, foot);
    ctx.closePath();
    ctx.fill();
  }
}

const frostAuroraSpriteCache = new Map();
let frostAuroraCacheSS = 0;

// A CURTAIN IS BAKED, NOT REPAINTED.
//
// Drawn live, this pass cost 7.9ms a frame against 0.06ms for the whole rest of
// the Frost background — a hundred-fold, and the measurement said it is the
// FILLS, not the gradients (24 gradients built from scratch measured 0.007ms).
// Forty-odd translucent gradient-shaded paths is simply a lot of shaded area,
// and portrait pays for it at its ladder ceiling.
//
// So each curtain is rasterised once into its own sprite and afterwards the
// frame does three drawImage calls. What that costs is the per-ray shimmer: the
// phase is frozen at the authored value, and the life comes from the two things
// that are free at blit time — each curtain drifting at its own rate, and a slow
// breathe on alpha. At this size and alpha the shimmer was never the thing that
// read; the drift is.
//
// Baked at full opacity with the curtain's own alpha applied on the blit, so
// stage gain never multiplies the number of sprites.
// Bake at the density of the SURFACE being drawn into, not the device's.
// bakeSS() is the right answer in the run, where the pack paints into a context
// already scaled to the screen — but the gallery renders tiles at its own
// resolution control, and a sprite baked at the device ratio and blitted into a
// 3x tile is resampled soft. A bake-off judged on a softened curtain is a
// bake-off about the wrong thing.
function frostAuroraBakeScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const scale = m && Number.isFinite(m.a) && m.a > 0 ? m.a : bakeSS();
  return Math.max(1, Math.min(6, Math.ceil(scale)));
}

function frostAuroraSprite(ctx, spec, h, options) {
  const ss = frostAuroraBakeScale(ctx);
  if (ss !== frostAuroraCacheSS) {
    frostAuroraSpriteCache.clear();
    frostAuroraCacheSS = ss;
  }
  const material = options.paper ? (options.paperMaterial || 'cardstockClear') : '';
  const strength = Math.max(0, Math.min(1.25, Number(options.paperStrength) || 1));
  const blur = Math.max(0, Number.isFinite(Number(options.blur))
    ? Number(options.blur) : FROST_AURORA_BLUR);
  const key = `${spec.color}|${spec.tip}|${spec.w}|${spec.rays}|${spec.amp}|${spec.wl}|${spec.phase}|${h.toFixed(2)}|${material}|${strength}|${blur}`;
  let sprite = frostAuroraSpriteCache.get(key);
  if (sprite !== undefined) return sprite;
  sprite = null;
  if (typeof document !== 'undefined') {
    // The wave swings the baseline by +/- amp, and a Gaussian reaches about
    // three radii, so the sprite is padded on all four sides by that much or the
    // blur is sliced off square at its own edges — which is a harder line than
    // the one it was there to remove.
    const pad = 2 + Math.ceil(blur * 3);
    const width = spec.w + pad * 2;
    const height = h + spec.amp * 2 + pad * 2;
    const baseY = height - spec.amp - pad;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * ss));
    canvas.height = Math.max(1, Math.ceil(height * ss));
    const g = canvas.getContext('2d');
    if (g) {
      if (typeof g.setTransform === 'function') g.setTransform(ss, 0, 0, ss, 0, 0);
      else g.scale(ss, ss);
      g.translate(pad, baseY);
      // Canvas filters are not everywhere; where they are missing the curtain
      // simply keeps its drawn edges rather than losing the pass.
      let blurred = false;
      if (blur > 0) {
        try {
          g.filter = `blur(${blur}px)`;
          blurred = g.filter !== 'none' && g.filter !== '';
        } catch { blurred = false; }
      }
      const k = (spec.w / spec.wl) * Math.PI * 2;
      frostAuroraRays(g, spec, h, k, spec.phase);
      const band = () => frostAuroraBandPath(g, spec.w, h, spec.amp, k, spec.phase);
      g.fillStyle = frostAuroraGradient(g, spec, h * FROST_AURORA_BAND);
      band();
      g.fill();
      if (options.paper) {
        paperFinishPass(g, band, sharedPaperPatternFor(g, material),
          { grainAlpha: PAPER_GRAIN_ALPHA * strength * 0.5, rim: false });
      }
      if (blurred) g.filter = 'none';
      sprite = { canvas, width, height, baseY, originX: pad, blur: blurred ? blur : 0 };
    }
  }
  frostAuroraSpriteCache.set(key, sprite);
  return sprite;
}

// Where each curtain's INK actually lands, which is not where its sprite lands:
// the sprite is padded by three sigma of blur on every side so the Gaussian is
// not sliced off square, and almost all of that padding is empty. One sigma is
// the honest edge, and it is what the geometry has to be judged against — the
// sprite box would report the aurora sitting on the ridges when it is not.
function frostAuroraBounds(rect, spec, blur) {
  const baseY = rect.top + rect.height * spec.y;
  const h = Math.max(8, (baseY - rect.top - blur) * spec.h);
  return { baseY, h, top: baseY - h - spec.amp - blur, bottom: baseY + spec.amp + blur };
}

/**
 * Paint the Frost aurora. `t` is the pack clock in seconds.
 */
export function drawFrostAurora(ctx, t, camX, options = {}) {
  const stageIndex = Math.max(1, Math.min(3, Number(options.stageIndex) || 1));
  const gain = (options.gain ?? FROST_AURORA_STAGE_GAIN[stageIndex]);
  if (!(gain > 0)) return;
  // Gallery candidates ride this seam — a different curtain TABLE through the
  // one production painter — so a bake-off can never drift from what ships.
  const specs = Array.isArray(options.specs) && options.specs.length
    ? options.specs : FROST_AURORA_CURTAINS;
  const count = Math.min(specs.length,
    options.curtains ?? FROST_AURORA_STAGE_CURTAINS[stageIndex]);
  const rect = frostAuroraRect(options.backgroundContext);
  const blur = Math.max(0, Number.isFinite(Number(options.blur))
    ? Number(options.blur) : FROST_AURORA_BLUR);
  const clock = Number(t) || 0;
  for (let i = 0; i < count; i++) {
    const spec = specs[i];
    // The blur spreads the curtain past its own geometry in every direction, so
    // it is paid for out of the headroom rather than out of the frame: at this
    // radius a curtain authored to fill the sky otherwise puts its softest and
    // most visible edge up underneath the HUD.
    const { baseY, h } = frostAuroraBounds(rect, spec, blur);
    const sprite = frostAuroraSprite(ctx, spec, h, options);
    if (!sprite) continue;
    // Spread over the whole wrap cycle, not over the authored frame: three
    // curtains authored at fractions of W travel as one clump and leave the
    // rest of the sky empty.
    const cycle = backgroundPaintCoverage(ctx).width + spec.w * 2;
    const x = wrapIntoView(ctx, spec.at * cycle - camX * spec.drift * ZOOM, spec.w);
    const breathe = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(clock * 0.21 + spec.phase));
    const lift = 1 + sprite.blur * FROST_AURORA_BLUR_LIFT;
    ctx.save();
    ctx.globalAlpha = Math.min(1, spec.alpha * gain * breathe * lift);
    // Blit on whole pixels: a fractional destination resamples the sprite and
    // the curtain comes out softer than it was baked.
    ctx.drawImage(sprite.canvas, Math.round(x - sprite.originX),
      Math.round(baseY - sprite.baseY), sprite.width, sprite.height);
    ctx.restore();
  }
}

// --- Frost blizzard --------------------------------------------------------
//
// Snow in FRONT of everything, including the hero — that is the whole point of
// running through it, and it is why this lives in post(), which the run calls
// after the world band and the cast but before the HUD.
//
// THREE RULES, and the first two are about fairness rather than looks:
//
//  - the veil is a GRADIENT, heaviest in the sky and nearly gone by the
//    groundline. A flat wash over the whole frame hides bear traps, and Frost
//    is the cabinet where you are already sliding into things you meant to
//    avoid. Reduced visibility has to cost atmosphere, not reads.
//  - the near layer is the only one that moves fast, and it is thin. A dense
//    foreground is the difference between weather and a dirty screen.
//  - every layer is a SCROLLED TILE, not particles. Three pattern fills a frame
//    regardless of how thick the snow gets, which is what lets the near layer be
//    generous without the cost scaling with it.
//
// Each layer is baked once, at the density of the surface being drawn into, for
// the same reason the aurora is: a tile baked at the device ratio and blitted
// into a denser gallery tile is resampled to mush, and snow is the art in this
// pack least able to survive that.
const FROST_BLIZZARD_LAYERS = Object.freeze([
  // tile, flakes, length, width, alpha, and how fast the layer answers the
  // camera and the wind. Depth reads off all of them at once.
  { tile: 128, n: 86, len: 2.6, wide: 0.7, alpha: 0.30, depth: 0.10, wind: 26, seed: 1 },
  { tile: 168, n: 62, len: 6.5, wide: 1.1, alpha: 0.40, depth: 0.34, wind: 62, seed: 2 },
  { tile: 240, n: 34, len: 15, wide: 1.9, alpha: 0.50, depth: 0.95, wind: 130, seed: 3 },
]);
// The wind blows across and slightly down; a streak lies along its own travel.
const FROST_BLIZZARD_SLOPE = 0.42;
const FROST_BLIZZARD_HAZE = '#e6f1fa';
// How much of the frame the veil covers before it gives up: the lane and the
// apron below it stay clear.
const FROST_BLIZZARD_VEIL_FLOOR = (GROUND_Y - 34) / H;
// HOW THE WEATHER ARRIVES: ONE RUNG PER CHECKPOINT.
//
// The blizzard is ONE STORM ACROSS THE WHOLE CABINET rather than a setting each
// level carries. Act II opens on a clear day, the snow starts at the first
// checkpoint of Frost 1, and every checkpoint after that — in this level and in
// the two that follow — turns it up one rung, so the last checkpoint of Frost 3
// stands in the worst of it and the closing straight is run inside a whiteout.
//
// THE CHECKPOINT IS THE RUNG because it is the one line the level already draws
// across itself: it is where the run banks, where the battery comes back, and
// on a ramping stage where the tempo steps. Hanging the weather off the
// odometer instead means a death and a replay run the same stretch of road
// under two different skies; hanging it off the checkpoints means the storm a
// player sees at a given point is the storm every attempt sees there.
//
// Indexed by CHECKPOINTS CROSSED SINCE THE CABINET OPENED. With the standard two
// per stage (layout.js DEFAULT_CHECKPOINTS) that is rung 0 on the Frost 1 start
// line, rung 2 as Frost 2 opens, rung 4 as Frost 3 opens, and rung 6 at the last
// checkpoint of the act.
//
// The steps taper rather than being even sixths: the arrival has to be a flurry
// nobody can name the moment of (0.27 is around the gallery's "weather you
// notice and never fight"), the middle of the act does the real climbing, and
// the top two rungs are closer together because by then every further step is
// bought against the trap read. The run eases between rungs over several
// seconds — see blizzardTarget in run.js — so a crossing is never a cut.
// THE CEILING IS 1.5, NOT 1. 1 was the strength the pass was BUILT at — the
// point past which the veil was judged and the three streak layers were dialled
// against the bear trap — and the act wanted somewhere worse than that to end
// up. So the whole ladder was lifted by half again rather than the top rung
// alone: an act that spends its last level above the old maximum has to climb
// to it, or the step onto Frost 3 is the only weather anybody notices.
//
// Everything above 1 is the same three layers and the same gradient veil, which
// is why it can go there at all: the veil still gives up by the lane (it is the
// wash over the ground, not the snow in the air, that eats a trap), and the
// layer alphas at 1.5 are 0.45 / 0.60 / 0.75 — thick, and still short of a
// white screen. Check the trap read in the gallery's top card before raising it
// any further.
const FROST_BLIZZARD_MAX = 1.5;
const FROST_BLIZZARD_LADDER = Object.freeze([0, 0.27, 0.45, 0.72, 1.02, 1.32, 1.5]);

/**
 * Blizzard strength at a point on the ladder. `f` is 0..1 across the CABINET —
 * all three Frost levels, not one of them — so the rungs land on it at even
 * spacing and everything between two rungs is a straight line.
 */
function frostBlizzardAt(f) {
  const rungs = FROST_BLIZZARD_LADDER.length - 1;
  const p = Math.max(0, Math.min(1, Number(f) || 0)) * rungs;
  const i = Math.min(rungs - 1, Math.floor(p));
  const a = FROST_BLIZZARD_LADDER[i];
  return a + (FROST_BLIZZARD_LADDER[i + 1] - a) * (p - i);
}

/**
 * Blizzard strength after `banked` checkpoints of stage `stageIndex`, where the
 * stage has `perStage` of them. This is the live path: the run counts the lines
 * it has crossed and reads its weather off here.
 */
export function frostBlizzardRung(stageIndex, banked, perStage = 2) {
  const stage = Math.max(1, Math.min(3, Number(stageIndex) || 1));
  const per = Math.max(1, Math.round(Number(perStage) || 0) || 1);
  const rung = Math.max(0, Math.min(per, Math.round(Number(banked) || 0)));
  return frostBlizzardAt(((stage - 1) * per + rung) / (per * 3));
}

/**
 * The same ladder read continuously, for the runs and the pictures that have no
 * checkpoints to count: a ONE-HIT or overtime attempt banks none, and a gallery
 * tile or a stage preview is not a run at all. Progress the run has not
 * published counts as 0 — the start line — so a static preview of Frost 1 is the
 * clear day it opens on, not a squall.
 */
export function frostBlizzardRamp(stageIndex, progress) {
  const stage = Math.max(1, Math.min(3, Number(stageIndex) || 1));
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  return frostBlizzardAt((stage - 1 + p) / 3);
}

const frostBlizzardTiles = new Map();
let frostBlizzardTileSS = 0;

// Deterministic placement: the same tile every session, so a flake pattern can
// be judged once and stays judged.
function frostBlizzardRandom(seed) {
  let x = seed * 1013904223 + 1;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

function frostBlizzardTile(ctx, layer, ss) {
  if (ss !== frostBlizzardTileSS) {
    frostBlizzardTiles.clear();
    frostBlizzardTileSS = ss;
  }
  let pattern = frostBlizzardTiles.get(layer.seed);
  if (pattern !== undefined) return pattern;
  pattern = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(layer.tile * ss));
    canvas.height = Math.max(1, Math.round(layer.tile * ss));
    const g = canvas.getContext('2d');
    if (g) {
      if (typeof g.setTransform === 'function') g.setTransform(ss, 0, 0, ss, 0, 0);
      else g.scale(ss, ss);
      g.strokeStyle = '#ffffff';
      g.lineCap = 'round';
      g.lineWidth = layer.wide;
      const rnd = frostBlizzardRandom(layer.seed);
      g.beginPath();
      for (let i = 0; i < layer.n; i++) {
        const x = rnd() * layer.tile;
        const y = rnd() * layer.tile;
        // A little length variation, or the layer reads as one stamped mark.
        const len = layer.len * (0.6 + 0.8 * rnd());
        g.moveTo(x, y);
        g.lineTo(x - len, y + len * FROST_BLIZZARD_SLOPE);
      }
      g.stroke();
      pattern = ctx.createPattern(canvas, 'repeat');
    }
  }
  frostBlizzardTiles.set(layer.seed, pattern);
  return pattern;
}

/**
 * The near snow sheet: a translucent fold of hill in front of the ridges, with
 * no hitbox and no scenery on it. Its crest sits just below the opaque near
 * ridge so it adds a foreground plane without cutting across object feet.
 *
 * Split out of the pack's bg() for the bake-off that asked whether it belonged
 * on the other side of the weather; it does not (see the call site), and the
 * split is kept because a named painter is easier to read than eight lines
 * inline in the middle of the ridge loop.
 */
export function drawFrostForegroundHill(ctx, camX, backgroundContext = null, options = {}) {
  const foregroundY = sceneryRidgeBaseY(backgroundContext, 'near',
    FROST_FOREGROUND_HILL_AMP, GROUND_Y)
    - (backgroundContext?.portrait
      ? FROST_SCENERY_LIFT : FROST_LANDSCAPE_SCENERY_LIFT)
    + FROST_FOREGROUND_HILL_OFFSET;
  ctx.save();
  ctx.translate(0, backgroundY(backgroundContext, FROST_FOREGROUND_HILL_DEPTH));
  ctx.globalAlpha = FROST_FOREGROUND_HILL_ALPHA;
  parallaxHills(ctx, camX, options.color || FROST_FOREGROUND_HILL_COLOR, foregroundY,
    FROST_FOREGROUND_HILL_AMP, FROST_FOREGROUND_HILL_WL,
    FROST_FOREGROUND_HILL_DEPTH, {
      paper: !!options.paper, paperMaterial: options.paperMaterial,
      paperStrength: options.paperStrength, seamFree: true,
    });
  ctx.restore();
}

/**
 * Paint the Frost blizzard over the finished frame. `strength` is 0..1.
 */
export function drawFrostBlizzard(ctx, t, camX, options = {}) {
  const stageIndex = Math.max(1, Math.min(3, Number(options.stageIndex) || 1));
  const raw = options.strength ?? frostBlizzardRamp(stageIndex, options.progress);
  const strength = Math.max(0, Math.min(FROST_BLIZZARD_MAX, Number(raw) || 0));
  if (strength <= 0) return;
  const clock = Number(t) || 0;
  // Gusts: the whole thing surges rather than falling at one rate, which is the
  // difference between weather and a screensaver.
  const gust = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(clock * 0.37)
    * Math.sin(clock * 0.13 + 1.9));
  const amount = strength * gust;

  // The veil, heaviest overhead and gone by the lane — and in the colour of the
  // light this stage is under. A daylight haze laid over a dusk sky is fog lit
  // by a sun that has set.
  const haze = options.light?.haze || FROST_BLIZZARD_HAZE;
  const clear = frostAuroraFade(haze);
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, haze);
  veil.addColorStop(FROST_BLIZZARD_VEIL_FLOOR * 0.55, haze);
  veil.addColorStop(FROST_BLIZZARD_VEIL_FLOOR, clear);
  veil.addColorStop(1, clear);
  ctx.save();
  ctx.globalAlpha = 0.34 * amount;
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // A PATTERN MUST BE FILLED AT ITS OWN SCALE.
  //
  // The tile is baked at the surface's density, and the context is already
  // scaled by that same density — so filling through the live transform draws
  // the pattern magnified by it a second time, and every pixel goes through
  // bilinear resampling. Measured, that was 58ms a frame against 0.17ms for the
  // entire rest of the Frost frame: full-screen fills are cheap here, a
  // RESAMPLED full-screen fill is not. Undo the density for the fill and the
  // tile lands one-for-one on the device grid, which is also the only way the
  // streaks come out as crisp as they were drawn.
  //
  // The scroll offset is rounded in that same device space for the same reason:
  // a fractional origin puts the whole sheet back on the slow path.
  const ss = frostAuroraBakeScale(ctx);
  ctx.save();
  ctx.scale(1 / ss, 1 / ss);
  for (const layer of FROST_BLIZZARD_LAYERS) {
    const pattern = frostBlizzardTile(ctx, layer, ss);
    if (!pattern) continue;
    // The camera term is what makes it feel like running THROUGH the snow
    // rather than standing in it; the wind term is what it does on its own.
    const travel = camX * layer.depth * ZOOM + clock * layer.wind;
    const span = layer.tile * ss;
    const ox = -Math.round((travel * ss) % span);
    const oy = Math.round((travel * FROST_BLIZZARD_SLOPE * ss) % span);
    ctx.save();
    ctx.globalAlpha = layer.alpha * amount;
    ctx.translate(ox, oy);
    ctx.fillStyle = pattern;
    ctx.fillRect(-ox, -oy, W * ss, H * ss);
    ctx.restore();
  }
  ctx.restore();
}

function frostSkyRibbonPath(ctx, x, y, width, height, tilt = 0) {
  ctx.moveTo(x, y + height * 0.55);
  ctx.quadraticCurveTo(x + width * 0.24, y - tilt, x + width * 0.52, y + height * 0.35);
  ctx.quadraticCurveTo(x + width * 0.78, y + height * 0.72, x + width, y + height * 0.2);
  ctx.lineTo(x + width, y + height * 0.75);
  ctx.quadraticCurveTo(x + width * 0.74, y + height * 1.04, x + width * 0.48, y + height * 0.67);
  ctx.quadraticCurveTo(x + width * 0.22, y + height * 0.34, x, y + height);
}

function drawFrostSky(ctx, camX, options = {}) {
  const coverage = backgroundPaintCoverage(ctx);
  const stageIndex = Math.max(1, Math.min(3, Number(options.stageIndex) || 1));
  const strength = Math.max(0, Math.min(1.25, Number(options.paperStrength) || 1));
  // The aurora is the furthest thing in the picture: the pale wisp ribbons
  // below are weather, and weather passes in front of the light.
  drawFrostAurora(ctx, options.t, camX, options);
  const ribbons = stageIndex === 3
    ? [
      { at: 0.12, y: 42, w: 230, h: 15, tilt: 4, color: '#a2b4db', alpha: 0.18 },
      { at: 0.56, y: 82, w: 270, h: 18, tilt: -4, color: '#8cc8d1', alpha: 0.16 },
    ]
    : [
      { at: 0.08, y: 44, w: 220, h: 14, tilt: 4, color: '#8bc4d4', alpha: 0.15 },
      { at: 0.52, y: 88, w: 250, h: 16, tilt: -4, color: '#a5b4d5', alpha: 0.14 },
    ];
  for (const ribbon of ribbons) {
    // The ribbon hangs RIGHT of x, so it may only wrap once all of it is off the
    // left edge: the margin is its own width (plus the paper shadow). A 40 px margin
    // on a 220 px ribbon jumped it to the far side with most of it still on screen —
    // a band across the sky that vanished in one frame (Peter, 25 Sep).
    const x = wrapIntoView(ctx, ribbon.at * 480 - camX * 0.045 * ZOOM, ribbon.w + 6);
    const path = () => {
      ctx.beginPath();
      frostSkyRibbonPath(ctx, x, ribbon.y, ribbon.w, ribbon.h, ribbon.tilt);
      ctx.closePath();
    };
    ctx.save();
    ctx.globalAlpha = ribbon.alpha;
    if (options.paper) {
      paperShadowPass(ctx, path, PAPER_SUBTLE_DEEP_OFFSET, PAPER_SUBTLE_DEEP_COLOR);
      paperShadowPass(ctx, path, PAPER_SUBTLE_CONTACT_OFFSET, PAPER_SUBTLE_CONTACT_COLOR);
    }
    ctx.fillStyle = ribbon.color;
    path();
    ctx.fill();
    if (options.paper) {
      paperFinishPass(ctx, path,
        sharedPaperPatternFor(ctx, options.paperMaterial || 'cardstockClear'), {
          grainAlpha: PAPER_GRAIN_ALPHA * strength * 0.7, rim: false,
        });
    }
    ctx.restore();
  }
}

function cryptDeadTreeShape(ctx, color = CRYPT_SCENERY_PALETTE.near) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 1); ctx.lineTo(-1, -23);
  ctx.moveTo(-1, -10); ctx.lineTo(-10, -17); ctx.lineTo(-14, -16);
  ctx.moveTo(-1, -15); ctx.lineTo(7, -21); ctx.lineTo(11, -20);
  ctx.moveTo(-1, -6); ctx.lineTo(6, -11);
  ctx.stroke();
  ctx.restore();
}

function cryptStoneShape(ctx, fill = CRYPT_SCENERY_PALETTE.near) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-8, 1); ctx.lineTo(-7, -10); ctx.quadraticCurveTo(-6, -16, 0, -17);
  ctx.quadraticCurveTo(6, -16, 7, -10); ctx.lineTo(8, 1); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CRYPT_SCENERY_PALETTE.lit;
  ctx.fillRect(-4.5, -10, 1.5, 6);
}

function drawCryptSceneryFeature(ctx, feature, options = {}) {
  const far = options.layer === 'far';
  const color = far ? CRYPT_SCENERY_PALETTE.far : CRYPT_SCENERY_PALETTE.near;
  ctx.save();
  ctx.translate(feature.x, feature.baseY);
  ctx.scale(feature.scale, feature.scale);
  if (feature.kind === 'stone') {
    ctx.rotate(feature.angle || 0);
    cryptStoneShape(ctx, color);
    ctx.strokeStyle = CRYPT_SCENERY_PALETTE.edge;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else {
    cryptDeadTreeShape(ctx, color);
  }
  ctx.restore();
}

function drawCryptScenery(ctx, camX, layerBaseY, options = {}) {
  for (const feature of cryptSceneryPlacements(ctx, camX, layerBaseY, options)) {
    drawCryptSceneryFeature(ctx, feature, options);
  }
}

function drawOfficeBuilding(ctx, building, baseY = GROUND_Y - 2) {
  const { x, w, h, roof, variant = 0 } = building;
  const top = baseY - h;
  ctx.fillStyle = OFFICE_SCENERY_PALETTE.fill;
  ctx.fillRect(x, top, w, h);
  ctx.strokeStyle = OFFICE_SCENERY_PALETTE.line;
  ctx.lineWidth = 1.3;
  ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
  ctx.beginPath();
  if (roof === 'step') {
    ctx.moveTo(x, top); ctx.lineTo(x + w * 0.28, top - 5);
    ctx.lineTo(x + w * 0.72, top - 5); ctx.lineTo(x + w, top);
  } else {
    ctx.moveTo(x, top); ctx.lineTo(x + w, top);
  }
  ctx.stroke();
  const cols = w > 45 ? 3 : 2;
  const rows = h > 48 ? 3 : 2;
  ctx.fillStyle = variant % 2 ? OFFICE_SCENERY_PALETTE.shade : OFFICE_SCENERY_PALETTE.line;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ww = 4;
      const wh = 3;
      const wx = x + 8 + col * ((w - 16 - ww) / Math.max(1, cols - 1));
      const wy = top + 12 + row * ((h - 22 - wh) / Math.max(1, rows - 1));
      ctx.fillRect(wx, wy, ww, wh);
    }
  }
  if (roof === 'antenna') {
    ctx.strokeStyle = OFFICE_SCENERY_PALETTE.warm;
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, top); ctx.lineTo(x + w * 0.5, top - 13);
    ctx.moveTo(x + w * 0.5 - 5, top - 9); ctx.lineTo(x + w * 0.5 + 5, top - 9);
    ctx.stroke();
  }
}

function drawOfficeScenery(ctx) {
  const coverage = backgroundPaintCoverage(ctx);
  const left = coverage.left;
  const width = coverage.width;
  const buildings = [
    { x: left + width * 0.08, w: width * 0.13, h: 38, roof: 'flat', variant: 0 },
    { x: left + width * 0.25, w: width * 0.15, h: 56, roof: 'antenna', variant: 1 },
    { x: left + width * 0.45, w: width * 0.12, h: 31, roof: 'step', variant: 0 },
    { x: left + width * 0.61, w: width * 0.17, h: 48, roof: 'flat', variant: 1 },
    { x: left + width * 0.83, w: width * 0.12, h: 64, roof: 'antenna', variant: 0 },
  ];
  ctx.save();
  ctx.globalAlpha = 0.78;
  for (const building of buildings) drawOfficeBuilding(ctx, building);
  ctx.restore();
}

function surgePylonShape(ctx, palette = SURGE_SCENERY_PALETTE) {
  ctx.save();
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(0, 1); ctx.lineTo(0, -26);
  ctx.moveTo(-7, -7); ctx.lineTo(7, -7);
  ctx.moveTo(-10, -17); ctx.lineTo(10, -17);
  ctx.stroke();
  ctx.fillStyle = palette.signal;
  ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-8, -18); ctx.lineTo(8, -18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = palette.pixel || palette.faux;
  ctx.fillRect(-3, -4, 6, 4);
  ctx.restore();
}

function drawSurgeScenery(ctx, camX, layerBaseY, options = {}) {
  const palette = options.mode === 'pixel'
    ? { ...SURGE_SCENERY_PALETTE, edge: SURGE_SCENERY_PALETTE.edge, pixel: SURGE_SCENERY_PALETTE.pixel }
    : SURGE_SCENERY_PALETTE;
  for (const feature of surgeSceneryPlacements(ctx, camX, layerBaseY, options)) {
    ctx.save();
    ctx.translate(feature.x, feature.baseY);
    ctx.scale(feature.scale, feature.scale);
    surgePylonShape(ctx, palette);
    ctx.restore();
  }
}

function desertFarAmplitude(options = {}) {
  return options.portrait ? DESERT_FAR_PORTRAIT_AMP : DESERT_FAR.amp;
}

// What stands on each slot of the six-mesa cycle. Slots 0–3 are what a stage
// actually passes; 4 and 5 only come round in overtime. Per stage, slot 0 is that
// level's own landmark and speed-2 swaps its water tower for the radio mast — the
// mast appears once in the cabinet ("also D once").
const DESERT_HORIZON_SLOT_PROPS = Object.freeze([null, 'big-ear', 'water', 'wind', 'big-ear', null]);
const DESERT_HORIZON_STAGE_PROPS = Object.freeze({
  1: Object.freeze({ 0: 'wind-pump' }),
  2: Object.freeze({ 0: 'lookout', 2: 'mast' }),
  3: Object.freeze({ 0: 'launch-pad' }),
});
// The mast replaces the water tower, so it stands where the tower did.
const DESERT_LOWER_MESA_PROPS = new Set(['water', 'mast']);

function desertHorizonPropKind(index, stageIndex = 1) {
  const slot = ((index % DESERT_HORIZON_PROP_SLOTS)
    + DESERT_HORIZON_PROP_SLOTS) % DESERT_HORIZON_PROP_SLOTS;
  const stage = DESERT_HORIZON_STAGE_PROPS[Number(stageIndex)] || DESERT_HORIZON_STAGE_PROPS[1];
  return stage[slot] ?? DESERT_HORIZON_SLOT_PROPS[slot];
}

function desertHorizonPropPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const view = backgroundPaintCoverage(ctx);
  const highPhase = DESERT_HIGH_MESA_PHASE;
  const lowerPhase = DESERT_LOWER_MESA_PHASE
    + (options.portrait ? DESERT_WATER_TOWER_PORTRAIT_PHASE_OFFSET : 0);
  return periodicDesertXs(ctx, camX, DESERT_FAR.factor,
    DESERT_HORIZON_PROP_SPACING, highPhase, DESERT_HORIZON_PROP_CULL_MARGIN)
    .flatMap(({ index, x }) => {
      const kind = desertHorizonPropKind(index, options.stageIndex);
      if (!kind) return [];
      const slot = ((index % DESERT_HORIZON_PROP_SLOTS)
        + DESERT_HORIZON_PROP_SLOTS) % DESERT_HORIZON_PROP_SLOTS;
      const propPhase = DESERT_LOWER_MESA_PROPS.has(kind) ? lowerPhase : highPhase;
      // A rare wind slot is a tiny three-turbine farm rather than a lone
      // stick. Every other slot is one prop on the cap's centre. All anchors
      // stay on the same broad cap, but each base is still sampled at its own
      // x so the contract remains correct if the cap is ever narrowed.
      const offsets = kind === 'wind' ? [-42, 0, 42] : [0];
      return offsets.map((offset, variant) => {
        const propX = x + propPhase - highPhase + offset;
        if (outsideView(ctx, propX, 120)) return null;
        return {
          kind,
          slot,
          index,
          variant,
          x: propX,
          baseY: ridgeYAt(propX, camX, layerBaseY, desertFarAmplitude(options),
            DESERT_FAR.wl, DESERT_FAR.factor,
            { mesa: true, coverageLeft: view.left }) + 2,
          scale: kind === 'water' ? 0.92
            : kind === 'wind' ? (variant === 1 ? 0.82 : 0.72)
            : 1,
        };
      }).filter(Boolean);
    });
}

function desertWaterTowerPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  return desertHorizonPropPlacements(ctx, camX, layerBaseY, options)
    .filter((prop) => prop.kind === 'water')
    .map(({ kind, slot, ...tower }) => tower);
}

// The single-prop horizon landmarks (desertHorizonProps.js): the big ear, mast,
// wind pump, launch pad and lookout.
function desertLandmarkPropPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  return desertHorizonPropPlacements(ctx, camX, layerBaseY, options)
    .filter((prop) => isDesertHorizonProp(prop.kind));
}

function desertWindTurbinePlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  return desertHorizonPropPlacements(ctx, camX, layerBaseY, options)
    .filter((prop) => prop.kind === 'wind')
    .map(({ kind, slot, ...turbine }) => turbine);
}

function desertTelegraphPlacements(ctx, camX, layerBaseY = GROUND_Y) {
  const view = backgroundPaintCoverage(ctx);
  return periodicDesertXs(ctx, camX, DESERT_MID.factor,
    DESERT_TELEGRAPH_SPACING, DESERT_TELEGRAPH_PHASE,
    DESERT_TELEGRAPH_WIRE_MARGIN)
    .map(({ index, x }) => {
      const baseY = ridgeYAt(x, camX, layerBaseY, DESERT_MID.amp,
        DESERT_MID.wl, DESERT_MID.factor,
        { dunes: true, coverageLeft: view.left }) + 1;
      const height = index % 3 === 0 ? 40 : 36;
      return { index, x, baseY, height, topY: baseY - height };
    });
}

function desertSignOverRoadGap(sign, camX, options = {}) {
  const gaps = Array.isArray(options.roadGaps) ? options.roadGaps : [];
  if (!gaps.length) return false;

  // Signs are painted in the backdrop's local screen space while gaps are
  // authored world spans. Compare their final screen positions, then invert
  // the backdrop transform once. This keeps the culling correct when the
  // portrait backdrop is enlarged or the lane is shifted left.
  const backgroundZoom = Number.isFinite(Number(options.backgroundZoom))
    && Number(options.backgroundZoom) > 0 ? Number(options.backgroundZoom) : 1;
  const worldZoom = Number.isFinite(Number(options.worldZoom))
    && Number(options.worldZoom) > 0 ? Number(options.worldZoom) : 1;
  const backgroundXOffset = Number.isFinite(Number(options.backgroundXOffset))
    ? Number(options.backgroundXOffset) : 0;
  const worldXOffset = Number.isFinite(Number(options.worldXOffset))
    ? Number(options.worldXOffset) : 0;
  const fromScreenX = (screenX) =>
    (screenX - backgroundXOffset - W / 2) / backgroundZoom + W / 2;
  const postHalfWidth = Math.max(2, sign.scale * 1.3);
  const postLeft = sign.x - postHalfWidth;
  const postRight = sign.x + postHalfWidth;

  return gaps.some((gap) => {
    if (!gap || !Number.isFinite(Number(gap.x)) || !Number.isFinite(Number(gap.w))) {
      return false;
    }
    const gapLeftScreen = (Number(gap.x) - camX) * worldZoom + worldXOffset;
    const gapRightScreen = (Number(gap.x) + Number(gap.w) - camX)
      * worldZoom + worldXOffset;
    const gapLeft = fromScreenX(Math.min(gapLeftScreen, gapRightScreen));
    const gapRight = fromScreenX(Math.max(gapLeftScreen, gapRightScreen));
    return postRight >= gapLeft && postLeft <= gapRight;
  });
}

function desertSpeedLimitPlacements(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const phase = DESERT_SPEED_SIGN_PHASE + (options.portrait ? 120 : 70);
  const landscapeDrop = options.portrait ? 0 : DESERT_SPEED_SIGN_LANDSCAPE_DROP;
  return periodicDesertXs(ctx, camX, DESERT_SPEED_SIGN_FACTOR,
    DESERT_SPEED_SIGN_SPACING, phase, 96)
    .map(({ index, x }) => {
      const sign = DESERT_ROAD_SIGNS[((index % DESERT_ROAD_SIGNS.length)
        + DESERT_ROAD_SIGNS.length) % DESERT_ROAD_SIGNS.length];
      const cycle = sign.kind === 'highway'
        ? ((Math.floor(index / DESERT_ROAD_SIGNS.length) % DESERT_HIGHWAY_VALUES.length)
          + DESERT_HIGHWAY_VALUES.length) % DESERT_HIGHWAY_VALUES.length
        : 0;
      const value = sign.kind === 'speed'
        ? (options.speedTrap && index === 0 ? DESERT_TRAP_SPEED_LIMIT
          : randomSpeedLimitValue(index, options.speedLimitValues))
        : sign.kind === 'highway' ? DESERT_HIGHWAY_VALUES[cycle] : sign.value;
      return {
        ...sign,
        index,
        value,
        x,
        // The post ends just beyond this base, leaving a visible planted foot
        // against the horizon in both aspect ratios. The smaller scale and the
        // slower x-parallax put the sign in the middle distance without losing
        // the text read.
        baseY: layerBaseY + DESERT_SPEED_SIGN_BASE_OFFSET
          - DESERT_SPEED_SIGN_RAISE + landscapeDrop,
        // Keep the foot in the roadside plane even when the board is lowered
        // for landscape. Drawing from this explicit target prevents the post
        // from ending halfway down a hill after an orientation-specific lift.
        postFootY: layerBaseY + DESERT_SPEED_SIGN_BASE_OFFSET + sign.scale * 33,
      };
    })
    .filter((sign) => !desertSignOverRoadGap(sign, camX, options));
}

function waterTowerTank(ctx) {
  ctx.beginPath();
  // A shallow rounded drum reads as a municipal tank at horizon scale. The
  // old ellipse made the top look like a balloon; this keeps the soft corners
  // while giving the tank a flatter crown, straighter sides, and a steadier
  // bottom for the legs to meet.
  ctx.moveTo(-11, -57);
  ctx.quadraticCurveTo(0, -59, 11, -57);
  ctx.quadraticCurveTo(16, -56, 16, -50);
  ctx.lineTo(16, -43);
  ctx.quadraticCurveTo(16, -38, 11, -37);
  ctx.quadraticCurveTo(0, -35.5, -11, -37);
  ctx.quadraticCurveTo(-16, -38, -16, -43);
  ctx.lineTo(-16, -50);
  ctx.quadraticCurveTo(-16, -56, -11, -57);
  ctx.closePath();
}

function waterTowerLegs(ctx) {
  ctx.beginPath();
  ctx.moveTo(-9, -39); ctx.lineTo(-15, 0);
  ctx.moveTo(9, -39); ctx.lineTo(15, 0);
  // A centre post and two braced bays make this read as a supported tower,
  // rather than a ladder leaning under the tank.
  ctx.moveTo(0, -39); ctx.lineTo(0, 0);
  ctx.moveTo(-11, -36); ctx.lineTo(11, -22);
  ctx.moveTo(11, -36); ctx.lineTo(-11, -22);
  ctx.moveTo(-12, -21); ctx.lineTo(14, -5);
  ctx.moveTo(12, -21); ctx.lineTo(-14, -5);
  ctx.moveTo(-12, -20); ctx.lineTo(12, -20);
  ctx.moveTo(-14, -5); ctx.lineTo(14, -5);
}

function waterTowerFoundation(ctx) {
  ctx.beginPath();
  ctx.moveTo(-19, -1);
  ctx.lineTo(19, -1);
  ctx.lineTo(17, 3);
  ctx.lineTo(-17, 3);
  ctx.closePath();
}

function drawWaterTower(ctx, tower, options = {}) {
  const paper = !!options.paper;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  const portraitHeightScale = options.portrait ? 1.45 : 1;
  ctx.save();
  ctx.translate(tower.x, tower.baseY);
  // Portrait gives the far horizon much more vertical room. Stretch the
  // planted mast upward in that mode so the tower can clear the lifted nearer
  // dunes without moving its feet off the exact far-mesa crest.
  ctx.scale(tower.scale, tower.scale * portraitHeightScale);
  const tank = () => waterTowerTank(ctx);
  const foundation = () => waterTowerFoundation(ctx);
  const paintLegs = (color) => {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    waterTowerLegs(ctx);
    ctx.stroke();
  };
  const paintFoundation = (color) => {
    ctx.fillStyle = color;
    foundation();
    ctx.fill();
  };
  if (paper) {
    ctx.save();
    ctx.translate(PAPER_DEEP_OFFSET.x, PAPER_DEEP_OFFSET.y);
    paintLegs(PAPER_DEEP_COLOR);
    paintFoundation(PAPER_DEEP_COLOR);
    ctx.restore();
    ctx.save();
    ctx.translate(PAPER_CONTACT_OFFSET.x, PAPER_CONTACT_OFFSET.y);
    paintLegs(PAPER_CONTACT_COLOR);
    paintFoundation(PAPER_CONTACT_COLOR);
    ctx.restore();
  }
  paintLegs(DESERT_WATER_TOWER_DARK);
  paintFoundation(DESERT_WATER_TOWER_INK);
  ctx.fillStyle = DESERT_WATER_TOWER_LIGHT;
  ctx.fillRect(-17, -1, 34, 1);
  ctx.strokeStyle = DESERT_WATER_TOWER_DARK;
  ctx.lineWidth = 0.9;
  foundation();
  ctx.stroke();
  if (paper) {
    paperShadowPass(ctx, tank, PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, tank, PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
  }
  ctx.fillStyle = DESERT_WATER_TOWER_INK;
  tank();
  ctx.fill();
  ctx.fillStyle = DESERT_WATER_TOWER_LIGHT;
  ctx.fillRect(-15, -54, 30, 4);
  ctx.fillStyle = DESERT_WATER_TOWER_DARK;
  ctx.fillRect(-13, -40, 26, 3);
  if (paper) {
    paperFinishPass(ctx, tank,
      sharedPaperPatternFor(ctx, paperMaterial), {
        grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA,
        strokeStyle: PAPER_LANDMARK_RIM_COLOR,
        lineWidth: PAPER_LANDMARK_RIM_WIDTH,
      });
  } else {
    ctx.strokeStyle = DESERT_WATER_TOWER_DARK;
    ctx.lineWidth = 1.2;
    tank();
    ctx.stroke();
  }
  ctx.restore();
}

function drawWaterTowers(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  ctx.save();
  ctx.globalAlpha = 0.78;
  for (const tower of desertWaterTowerPlacements(ctx, camX, layerBaseY, options)) {
    drawWaterTower(ctx, tower, options);
  }
  ctx.restore();
}

function satelliteDishBowl(ctx) {
  ctx.beginPath();
  ctx.moveTo(-15, -31);
  ctx.arc(0, -31, 15, Math.PI * 0.15, Math.PI * 0.85);
  ctx.lineTo(11, -21);
  ctx.lineTo(-10, -24);
  ctx.closePath();
}

function satelliteDishBase(ctx, color, highlight = null) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-11, 1);
  ctx.lineTo(-8, -3);
  ctx.lineTo(8, -3);
  ctx.lineTo(11, 1);
  ctx.lineTo(9, 3);
  ctx.lineTo(-9, 3);
  ctx.closePath();
  ctx.fill();
  if (highlight) {
    ctx.fillStyle = highlight;
    ctx.fillRect(-6.5, -2.4, 13, 1.1);
  }
}

function satelliteDishMast(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -21); ctx.lineTo(0, 0);
  ctx.moveTo(0, 0); ctx.lineTo(-9, 0);
  ctx.moveTo(0, 0); ctx.lineTo(9, 0);
  ctx.moveTo(-5, -10); ctx.lineTo(5, -10);
  ctx.stroke();
}

function satelliteDishArm(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(3, -28); ctx.lineTo(12, -38);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(13, -39, 2, 0, TAU_BG);
  ctx.fill();
}

function satelliteDishHead(ctx, scanAngle, paint) {
  // The mast stays planted; the bowl and feed arm turn together around their
  // shared head pivot, making the fake signal search read as one mechanism.
  ctx.save();
  ctx.translate(0, -28);
  ctx.rotate(scanAngle);
  ctx.translate(0, 28);
  paint();
  ctx.restore();
}

export function satelliteDishScanAngle(t = 0, index = 0) {
  const time = Number(t);
  if (!Number.isFinite(time)) return 0;
  // A restrained left-right sweep sells signal seeking without making the tiny
  // distant dishes look like spinning pinwheels. Phase the landmarks apart so
  // the horizon does not move as one synchronized row.
  return Math.sin(time * 1.35 + Number(index || 0) * 1.7) * 0.34;
}

function satelliteDishFeedPoint(dish, options = {}) {
  const scanAngle = satelliteDishScanAngle(
    options.t,
    dish.index + Number(dish.variant || 0) * 0.75,
  );
  const cos = Math.cos(scanAngle);
  const sin = Math.sin(scanAngle);
  // The feed dot is at (13,-39), rotated around the shared head pivot (0,-28)
  // by the same angle as the bowl and arm. Apply the painter's non-uniform
  // portrait scale only after that local rotation, exactly as drawSatelliteDish.
  const localX = 13 * cos + 11 * sin;
  const localY = -28 + 13 * sin - 11 * cos;
  const portraitHeightScale = options.portrait ? 1.18 : 1;
  return {
    x: dish.x + localX * dish.scale,
    y: dish.baseY + localY * dish.scale * portraitHeightScale,
  };
}

function drawSatelliteSignalLinks(ctx, dishes, options = {}) {
  const clusters = new Map();
  for (const dish of dishes) {
    const key = Number(dish.index);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(dish);
  }
  for (const cluster of clusters.values()) {
    if (cluster.length < 3) continue;
    cluster.sort((a, b) => Number(a.variant || 0) - Number(b.variant || 0));
    const points = cluster.map((dish) => satelliteDishFeedPoint(dish, options));
    ctx.save();
    ctx.globalAlpha = 0.74 * (options.paper ? 0.12 : 0.18);
    ctx.strokeStyle = DESERT_SATELLITE_LIGHT;
    ctx.lineWidth = 1.15;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawSatelliteDish(ctx, dish, options = {}) {
  const paper = !!options.paper;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  const scanAngle = satelliteDishScanAngle(
    options.t,
    dish.index + Number(dish.variant || 0) * 0.75,
  );
  ctx.save();
  ctx.translate(dish.x, dish.baseY);
  const portraitHeightScale = options.portrait ? 1.18 : 1;
  ctx.scale(dish.scale, dish.scale * portraitHeightScale);
  if (paper) {
    ctx.save();
    ctx.translate(PAPER_DEEP_OFFSET.x, PAPER_DEEP_OFFSET.y);
    satelliteDishBase(ctx, PAPER_DEEP_COLOR);
    satelliteDishMast(ctx, PAPER_DEEP_COLOR);
    satelliteDishHead(ctx, scanAngle, () => satelliteDishArm(ctx, PAPER_DEEP_COLOR));
    ctx.restore();
    ctx.save();
    ctx.translate(PAPER_CONTACT_OFFSET.x, PAPER_CONTACT_OFFSET.y);
    satelliteDishBase(ctx, PAPER_CONTACT_COLOR);
    satelliteDishMast(ctx, PAPER_CONTACT_COLOR);
    satelliteDishHead(ctx, scanAngle, () => satelliteDishArm(ctx, PAPER_CONTACT_COLOR));
    ctx.restore();
    paperShadowPass(ctx, () => satelliteDishHead(ctx, scanAngle,
      () => satelliteDishBowl(ctx)), PAPER_DEEP_OFFSET,
      PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, () => satelliteDishHead(ctx, scanAngle,
      () => satelliteDishBowl(ctx)), PAPER_CONTACT_OFFSET,
      PAPER_LANDMARK_CONTACT_COLOR);
  }
  satelliteDishBase(ctx, DESERT_SATELLITE_DARK, DESERT_SATELLITE_LIGHT);
  satelliteDishMast(ctx, DESERT_SATELLITE_DARK);
  satelliteDishHead(ctx, scanAngle, () => satelliteDishArm(ctx, DESERT_SATELLITE_DARK));
  satelliteDishHead(ctx, scanAngle, () => {
    ctx.fillStyle = DESERT_SATELLITE_INK;
    satelliteDishBowl(ctx);
    ctx.fill();
    ctx.fillStyle = DESERT_SATELLITE_LIGHT;
    ctx.fillRect(-9, -29, 15, 2);
  });
  if (paper) {
    paperFinishPass(ctx, () => satelliteDishHead(ctx, scanAngle,
      () => satelliteDishBowl(ctx)),
      sharedPaperPatternFor(ctx, paperMaterial), {
        grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA,
        strokeStyle: PAPER_LANDMARK_RIM_COLOR,
        lineWidth: PAPER_LANDMARK_RIM_WIDTH,
      });
  } else {
    ctx.strokeStyle = DESERT_SATELLITE_DARK;
    ctx.lineWidth = 1.05;
    satelliteDishHead(ctx, scanAngle, () => {
      satelliteDishBowl(ctx);
      ctx.stroke();
    });
  }
  ctx.restore();
}

// The mesa-top landmarks that replaced the satellite-dish cluster (24 Sep 2026).
// `options.skyOffset` is the far layer's translate, so each prop samples its haze
// at the screen height it actually stands at.
function drawDesertLandmarkProps(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const view = backgroundPaintCoverage(ctx);
  const amp = desertFarAmplitude(options);
  const seat = (x) => ridgeYAt(x, camX, layerBaseY, amp, DESERT_FAR.wl, DESERT_FAR.factor,
    { mesa: true, coverageLeft: view.left }) + 2;
  for (const prop of desertLandmarkPropPlacements(ctx, camX, layerBaseY, options)) {
    // A review harness may paint its own candidate in this slot (returning true skips
    // the shipped prop). Only the lab gallery sets it; the game never does.
    if (ctx.__mashDesertHorizonOverride?.(ctx, prop, { ...options, seat, view })) continue;
    drawDesertHorizonProp(ctx, prop.kind, {
      t: options.t, x: prop.x, baseY: prop.baseY, seat,
      skyY: prop.baseY + (options.skyOffset || 0) - 24,
      portrait: !!options.portrait,
      launch: prop.kind === 'launch-pad' ? desertRocketLaunchClock(prop.x, view) : null,
    });
  }
}

// THE ROCKET LAUNCHES (Peter, 24 Sep: "can the rocket take off?"). Its clock is the
// pad's own travel across the screen, not the wall clock: ignition as the pad
// passes DESERT_ROCKET_LAUNCH_AT of the picture, then one second of launch per
// DESERT_ROCKET_SCROLL px it has scrolled since. So a rewind, a retry or a paused
// frame shows the rocket exactly where it was for that camera, and at the stage's
// opening the pad is on screen for a moment before it goes. The scroll rate is the
// far layer's at speed-3's cruising pace; a boost just hurries the climb along.
const DESERT_ROCKET_LAUNCH_AT = 0.62;
const DESERT_ROCKET_SCROLL = 38;
function desertRocketLaunchClock(padX, view) {
  return (view.left + view.width * DESERT_ROCKET_LAUNCH_AT - padX) / DESERT_ROCKET_SCROLL;
}

function windTurbineMast(ctx, color) {
  // A tapered filled tower reads as a wind turbine at this scale; two thin
  // crossbars retain the hand-built roadside silhouette without turning the
  // mast into a telephone pole.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-5.5, 0);
  ctx.lineTo(-1.15, -39);
  ctx.lineTo(1.15, -39);
  ctx.lineTo(5.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(-3.8, -14); ctx.lineTo(3.8, -14);
  ctx.moveTo(-4.7, -27); ctx.lineTo(4.7, -27);
  ctx.stroke();
}

export function windTurbineRotation(t = 0, index = 0) {
  const time = Number(t);
  if (!Number.isFinite(time)) return 0;
  // A quick, readable three-blade turn. Slight phase offsets keep a distant
  // cluster from looking mechanically stamped while every frame shares one clock.
  return time * 2.4 + Number(index || 0) * 0.22;
}

function windTurbineRotor(ctx, color, rotation = 0) {
  ctx.save();
  ctx.translate(0, -41);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(i * TAU_BG / 3);
    ctx.beginPath();
    ctx.moveTo(-1, -2);
    ctx.lineTo(3, -8);
    ctx.lineTo(2, -20);
    ctx.lineTo(-2, -17);
    ctx.lineTo(-3, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 2.7, 0, TAU_BG);
  ctx.fill();
  ctx.restore();
}

function drawWindTurbine(ctx, turbine, options = {}) {
  const paper = !!options.paper;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  const rotation = windTurbineRotation(options.t,
    turbine.index + Number(turbine.variant || 0) * 0.7);
  ctx.save();
  ctx.translate(turbine.x, turbine.baseY);
  const portraitHeightScale = options.portrait ? 1.18 : 1;
  ctx.scale(turbine.scale, turbine.scale * portraitHeightScale);
  if (paper) {
    ctx.save();
    ctx.translate(PAPER_DEEP_OFFSET.x, PAPER_DEEP_OFFSET.y);
    windTurbineMast(ctx, PAPER_DEEP_COLOR);
    ctx.restore();
    ctx.save();
    ctx.translate(PAPER_CONTACT_OFFSET.x, PAPER_CONTACT_OFFSET.y);
    windTurbineMast(ctx, PAPER_CONTACT_COLOR);
    ctx.restore();
    paperShadowPass(ctx, () => windTurbineRotor(ctx, PAPER_DEEP_COLOR, rotation),
      PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, () => windTurbineRotor(ctx, PAPER_CONTACT_COLOR, rotation),
      PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
  }
  windTurbineMast(ctx, DESERT_WIND_DARK);
  windTurbineRotor(ctx, DESERT_WIND_INK, rotation);
  ctx.fillStyle = DESERT_WIND_LIGHT;
  ctx.beginPath();
  ctx.arc(0, -41, 2, 0, TAU_BG);
  ctx.fill();
  if (paper) {
    paperFinishPass(ctx, () => windTurbineRotor(ctx, DESERT_WIND_INK, rotation),
      sharedPaperPatternFor(ctx, paperMaterial), {
        grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA,
        rim: false,
      });
  }
  ctx.restore();
}

function drawWindTurbines(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  ctx.save();
  ctx.globalAlpha = 0.70;
  for (const turbine of desertWindTurbinePlacements(ctx, camX, layerBaseY, options)) {
    drawWindTurbine(ctx, turbine, options);
  }
  ctx.restore();
}

function drawTelegraphPole(ctx, pole, color = DESERT_TELEGRAPH_INK) {
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(pole.x, pole.baseY);
  ctx.lineTo(pole.x, pole.topY);
  ctx.moveTo(pole.x - 11, pole.topY + 8);
  ctx.lineTo(pole.x + 11, pole.topY + 8);
  ctx.moveTo(pole.x - 8, pole.topY + 17);
  ctx.lineTo(pole.x + 8, pole.topY + 17);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(pole.x - 1.5, pole.topY + 5, 3, 3);
  ctx.fillRect(pole.x - 1.5, pole.topY + 14, 3, 3);
}

function drawTelegraphWires(ctx, poles, wireColor = DESERT_TELEGRAPH_WIRE,
  lineWidth = DESERT_TELEGRAPH_WIRE_WIDTH) {
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = wireColor;
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1];
    for (const dy of [8, 17]) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.topY + dy);
      ctx.lineTo((a.x + b.x) / 2, (a.topY + b.topY) / 2 + dy + 3);
      ctx.lineTo(b.x, b.topY + dy);
      ctx.stroke();
    }
  }
}

function drawTelegraphField(ctx, poles, poleColor = DESERT_TELEGRAPH_INK,
  wireColor = DESERT_TELEGRAPH_WIRE, wireWidth = DESERT_TELEGRAPH_WIRE_WIDTH) {
  drawTelegraphWires(ctx, poles, wireColor, wireWidth);
  for (const pole of poles) drawTelegraphPole(ctx, pole, poleColor);
}

function drawTelegraphPoleField(ctx, poles, poleColor = DESERT_TELEGRAPH_INK) {
  for (const pole of poles) drawTelegraphPole(ctx, pole, poleColor);
}

function drawTelegraphPoles(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  const poles = desertTelegraphPlacements(ctx, camX, layerBaseY);
  if (!poles.length) return;
  const paper = !!options.paper;
  const portrait = !!options.portrait;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  const wireWidth = portrait
    ? DESERT_TELEGRAPH_WIRE_WIDTH : DESERT_TELEGRAPH_WIRE_DESKTOP_WIDTH;
  ctx.save();
  ctx.globalAlpha = 0.76;
  if (paper) {
    ctx.save();
    ctx.translate(PAPER_DEEP_OFFSET.x, PAPER_DEEP_OFFSET.y);
    drawTelegraphPoleField(ctx, poles, PAPER_DEEP_COLOR);
    ctx.restore();
    ctx.save();
    ctx.translate(PAPER_CONTACT_OFFSET.x, PAPER_CONTACT_OFFSET.y);
    drawTelegraphPoleField(ctx, poles, PAPER_CONTACT_COLOR);
    ctx.restore();
  }
  drawTelegraphField(ctx, poles, DESERT_TELEGRAPH_INK,
    DESERT_TELEGRAPH_WIRE, wireWidth);
  if (paper) {
    const pattern = sharedPaperPatternFor(ctx, paperMaterial);
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = PAPER_TEXTURE_BLEND;
      ctx.globalAlpha = PAPER_GRAIN_ALPHA;
      drawTelegraphField(ctx, poles, pattern, pattern, wireWidth);
      ctx.restore();
    }
  }
  ctx.restore();
}

// Sign lettering is small, but it is still typography rather than LCD data.
// Keep the old `cell` values as the authored height contract, then rasterize
// the loaded game face directly at that size so the letters stay smooth after
// the sign is scaled for portrait or a distant landscape placement.
function drawRoadSignText(ctx, text, x, centerY, cell, color) {
  if (!text || !cell) return;
  const scale = Math.max(0.52, Number(cell) * 7 / 8.2);
  drawTextVectorCentered(
    ctx,
    String(text).toUpperCase(),
    x,
    textYForMid(centerY, scale, 'bold'),
    color,
    scale,
    'bold',
  );
}

function desertSignLocalFootY(sign) {
  const scale = Math.max(0.01, Number(sign?.scale) || 1);
  return Number.isFinite(Number(sign?.postFootY))
    ? (Number(sign.postFootY) - Number(sign.baseY)) / scale
    : 33 + DESERT_SPEED_SIGN_RAISE / scale;
}

function desertSignPostHeight(sign) {
  const bottom = Number.isFinite(Number(sign?.bottom)) ? Number(sign.bottom) : 0;
  return Math.max(0, desertSignLocalFootY(sign) - bottom);
}

function drawRoadSign(ctx, sign, options = {}) {
  const paper = !!options.paper;
  const paperMaterial = options.paperMaterial || 'cardstockClear';
  ctx.save();
  ctx.translate(sign.x, sign.baseY);
  ctx.scale(sign.scale, sign.scale);
  const shape = sign.shape || (sign.kind === 'route' ? 'shield'
    : sign.kind === 'caution' ? 'diamond' : 'rectangle');
  const flatVector = shape === 'autobahn' || shape === 'triangle';
  const footY = desertSignLocalFootY(sign);
  // Keep the post's endpoint authoritative, then let the soil sit just below
  // it with a small overlap. That makes the dirt read as gathered around the
  // pole rather than as a separate mark shifted up its shaft.
  const contactY = footY + DESERT_SPEED_SIGN_CONTACT_DROP;
  const roundedRect = (x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  };
  const autobahnFace = () => {
    const inset = sign.w * 12.5 / 600;
    const radius = sign.w * 19.2 / 600;
    ctx.beginPath();
    roundedRect(-sign.w / 2 + inset, sign.top + inset,
      sign.w - inset * 2, sign.bottom - sign.top - inset * 2, radius);
    ctx.closePath();
  };
  const board = () => {
    ctx.beginPath();
    if (shape === 'shield') {
      // A simple highway-shield silhouette: broad shoulders at the top and a
      // tapered lower point, still legible when it is a distant prop.
      ctx.moveTo(-sign.w * 0.44, sign.top + 2);
      ctx.lineTo(sign.w * 0.44, sign.top + 2);
      ctx.lineTo(sign.w * 0.5, sign.top + 13);
      ctx.lineTo(sign.w * 0.36, sign.bottom - 7);
      ctx.lineTo(0, sign.bottom);
      ctx.lineTo(-sign.w * 0.36, sign.bottom - 7);
      ctx.lineTo(-sign.w * 0.5, sign.top + 13);
    } else if (shape === 'triangle') {
      // Upright warning triangle with tangent rounded corners. Each quadratic
      // turn starts and ends along its neighboring edge, so the border is a
      // smooth warning-sign silhouette rather than three softened kinks.
      const height = sign.bottom - sign.top;
      const tip = [0, sign.top + height * 0.06];
      const right = [sign.w * 0.46, sign.bottom - height * 0.08];
      const left = [-sign.w * 0.46, sign.bottom - height * 0.08];
      const corner = Math.min(sign.w * 0.095, height * 0.11);
      const toward = (a, b, distance) => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const length = Math.hypot(dx, dy) || 1;
        return [a[0] + dx / length * distance, a[1] + dy / length * distance];
      };
      const tipToRight = toward(tip, right, corner);
      const rightToTip = toward(right, tip, corner);
      const rightToLeft = toward(right, left, corner);
      const leftToRight = toward(left, right, corner);
      const leftToTip = toward(left, tip, corner);
      const tipToLeft = toward(tip, left, corner);
      ctx.moveTo(...tipToRight);
      ctx.lineTo(...rightToTip);
      ctx.quadraticCurveTo(...right, ...rightToLeft);
      ctx.lineTo(...leftToRight);
      ctx.quadraticCurveTo(...left, ...leftToTip);
      ctx.lineTo(...tipToLeft);
      ctx.quadraticCurveTo(...tip, ...tipToRight);
    } else if (shape === 'diamond') {
      const mid = (sign.top + sign.bottom) / 2;
      ctx.moveTo(0, sign.top);
      ctx.lineTo(sign.w / 2, mid);
      ctx.lineTo(0, sign.bottom);
      ctx.lineTo(-sign.w / 2, mid);
    } else if (shape === 'circle') {
      const mid = (sign.top + sign.bottom) / 2;
      ctx.arc(0, mid, Math.min(sign.w, sign.bottom - sign.top) * 0.5,
        0, TAU_BG);
    } else if (shape === 'arrow') {
      const mid = (sign.top + sign.bottom) / 2;
      const tip = sign.w * 0.5;
      ctx.moveTo(-sign.w * 0.5, sign.top);
      ctx.lineTo(sign.w * 0.22, sign.top);
      ctx.lineTo(sign.w * 0.22, sign.top + 7);
      ctx.lineTo(tip, mid);
      ctx.lineTo(sign.w * 0.22, sign.bottom - 7);
      ctx.lineTo(sign.w * 0.22, sign.bottom);
      ctx.lineTo(-sign.w * 0.5, sign.bottom);
    } else if (shape === 'milepost') {
      const radius = Math.min(3.5, sign.w * 0.12);
      ctx.moveTo(-sign.w / 2 + radius, sign.top);
      ctx.lineTo(sign.w / 2 - radius, sign.top);
      ctx.quadraticCurveTo(sign.w / 2, sign.top,
        sign.w / 2, sign.top + radius);
      ctx.lineTo(sign.w / 2, sign.bottom - radius);
      ctx.quadraticCurveTo(sign.w / 2, sign.bottom,
        sign.w / 2 - radius, sign.bottom);
      ctx.lineTo(-sign.w / 2 + radius, sign.bottom);
      ctx.quadraticCurveTo(-sign.w / 2, sign.bottom,
        -sign.w / 2, sign.bottom - radius);
      ctx.lineTo(-sign.w / 2, sign.top + radius);
      ctx.quadraticCurveTo(-sign.w / 2, sign.top,
        -sign.w / 2 + radius, sign.top);
    } else if (shape === 'autobahn') {
      // German Zeichen 330.1: the outer white panel and its blue face are
      // separate shapes. The proportions below follow the public-domain
      // StVO vector rather than approximating the rim with a thin stroke.
      roundedRect(-sign.w / 2, sign.top, sign.w, sign.bottom - sign.top,
        sign.w * 29.2 / 600);
    } else {
      ctx.rect(-sign.w / 2, sign.top, sign.w, sign.bottom - sign.top);
    }
    ctx.closePath();
  };
  const groundCollar = () => {
    ctx.beginPath();
    // Three low humps make this a disturbed patch of soil rather than a
    // symmetrical washer. It overlaps the post at the top and settles below
    // it at the front edge.
    ctx.moveTo(-8.5, contactY + 0.9);
    ctx.quadraticCurveTo(-5.2, contactY - 1.9, -1.2, contactY - 0.9);
    ctx.quadraticCurveTo(1.3, contactY - 2.2, 4.2, contactY - 0.5);
    ctx.quadraticCurveTo(7.1, contactY - 1.6, 8.8, contactY + 0.8);
    ctx.quadraticCurveTo(5.7, contactY + 4.1, 1.5, contactY + 3.8);
    ctx.quadraticCurveTo(-2.7, contactY + 4.7, -5.7, contactY + 3.3);
    ctx.quadraticCurveTo(-8.2, contactY + 3.0, -8.5, contactY + 0.9);
    ctx.closePath();
  };
  const groundHighlight = () => {
    ctx.beginPath();
    ctx.moveTo(-6.3, contactY + 0.2);
    ctx.quadraticCurveTo(-3.3, contactY - 1.2, -0.4, contactY - 0.3);
    ctx.quadraticCurveTo(2.8, contactY - 1.2, 6.2, contactY + 0.1);
    ctx.quadraticCurveTo(3.4, contactY + 0.9, 0.2, contactY + 0.55);
    ctx.quadraticCurveTo(-3.0, contactY + 1.2, -6.3, contactY + 0.2);
    ctx.closePath();
  };
  const groundStones = () => {
    ctx.beginPath();
    ctx.arc(-8.8, contactY + 2.0, 0.85, 0, TAU_BG);
    ctx.arc(8.3, contactY + 2.9, 0.65, 0, TAU_BG);
  };
  const warningFormula = (centerY) => {
    const formula = sign.warningFormula || 'mc²';
    const desiredScale = Number(sign.warningFormulaScale) || 1.7;
    const height = sign.bottom - sign.top;
    const faceTop = sign.top + height * 0.06;
    const faceBottom = sign.bottom - height * 0.08;
    const progress = Math.max(0, Math.min(1,
      (centerY - faceTop) / Math.max(1, faceBottom - faceTop)));
    const halfTriangleWidth = sign.w * 0.46 * progress;
    const borderWidth = sign.w * 0.08;
    const sidePadding = sign.w * (Number(sign.warningFormulaPadding) || 0);
    const availableWidth = Math.max(1,
      halfTriangleWidth * 2 - borderWidth - sidePadding - 1.0);
    const measuredWidth = textWidth(formula, desiredScale, 'bold');
    const scale = measuredWidth > 0
      ? Math.min(desiredScale, desiredScale * availableWidth / measuredWidth)
      : desiredScale;
    drawTextVectorCentered(
      ctx,
      formula,
      0,
      textYForMid(centerY, scale, 'bold'),
      sign.ink || DESERT_SPEED_SIGN_INK,
      scale,
      'bold',
    );
  };
  const post = () => {
    // The placement owns the planted world-space foot. Convert it back into
    // this sign's local coordinates so a portrait lift or landscape drop can
    // never leave the pole suspended above the roadside plane.
    ctx.beginPath();
    // `rect` takes a height, so this must be the distance from the board's
    // bottom to the foot. Using `footY` directly leaves a gap whenever the
    // board bottom is above the local origin, which is every sign here.
    // The rounded triangle's visible base is inset by its lower corner
    // clearance, so begin the pole at that edge instead of leaving a gap down
    // to the sign's nominal bounding-box bottom.
    const postTop = shape === 'triangle'
      ? sign.bottom - (sign.bottom - sign.top) * 0.08
      : sign.bottom;
    ctx.rect(-1.3, postTop, 2.6, desertSignLocalFootY(sign) - postTop);
    ctx.closePath();
  };
  if (paper && !flatVector) {
    paperShadowPass(ctx, post, PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, board, PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, post, PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
    paperShadowPass(ctx, board, PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
    paperShadowPass(ctx, groundCollar, PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, groundCollar, PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
  }
  // Put the contact shadow down first so the post and soil collar sit into it.
  // The collar is painted after the post below, hiding its final edge the way
  // loose dirt would gather around a driven roadside stake.
  // Offset the soft shadow slightly down-right so it reads as contact with
  // the dune, not as a dark oval bolted onto the bottom of the pole.
  drawSoftContactShadow(ctx, 2.5, contactY + 3.6, 11.5, 2.1, {
    alpha: 0.72 * 0.22,
    ink: '76,63,62',
  });
  // Roadside sign shafts use the same muted utility-pole ink as the nearby
  // telegraph field; the warning border remains red on the board itself.
  ctx.fillStyle = DESERT_TELEGRAPH_INK;
  post();
  ctx.fill();
  ctx.fillStyle = DESERT_SPEED_SIGN_CONTACT_SOIL;
  groundCollar();
  ctx.fill();
  ctx.fillStyle = DESERT_SPEED_SIGN_CONTACT_LIGHT;
  groundHighlight();
  ctx.fill();
  ctx.fillStyle = DESERT_SPEED_SIGN_CONTACT_STONE;
  groundStones();
  ctx.fill();
  if (shape === 'autobahn') {
    ctx.fillStyle = sign.trim;
    board();
    ctx.fill();
    ctx.fillStyle = sign.face;
    autobahnFace();
    ctx.fill();
  } else {
    ctx.fillStyle = sign.face;
    board();
    ctx.fill();
  }
  if (shape !== 'autobahn') {
    ctx.strokeStyle = sign.trim;
    ctx.lineWidth = shape === 'shield' ? 1.8
      : shape === 'triangle' ? sign.w * 0.08 : 1.6;
    ctx.lineJoin = shape === 'triangle' ? 'round' : 'miter';
    ctx.lineCap = shape === 'triangle' ? 'round' : 'butt';
    board();
    ctx.stroke();
  }
  if (shape === 'autobahn') {
    // Exact Zeichen 330.1 glyph geometry, normalized from the 601 x 601
    // reference vector into this sign's local box. It is two upper roadway
    // blades, one bridge deck with its two piers, and two lower carriageways.
    const height = sign.bottom - sign.top;
    const point = (x, y) => [
      (x / 601.00134 - 0.5) * sign.w,
      sign.top + y / 601.00159 * height,
    ];
    const polygon = (points) => {
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        const [px, py] = point(x, y);
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    };
    const rectangle = (x0, y0, x1, y1) => {
      const [left, top] = point(x0, y0);
      const [right, bottom] = point(x1, y1);
      ctx.fillRect(left, top, right - left, bottom - top);
    };
    ctx.save();
    ctx.fillStyle = sign.icon || sign.ink || '#ffffff';
    polygon([[211.25, 219.229], [264.39, 65.742],
      [291.485, 65.742], [285.576, 219.229]]);
    polygon([[315.425, 219.229], [309.536, 65.742],
      [336.626, 65.742], [389.77, 219.229]]);
    rectangle(65.7425, 237.2953, 535.25875, 255.3166);
    rectangle(115.4, 255.3166, 160.5475, 282.4566);
    rectangle(440.459, 255.3166, 485.6, 282.4566);
    polygon([[101.846, 535.273], [189.365, 282.457],
      [283.14, 282.457], [273.413, 535.273]]);
    polygon([[327.588, 535.273], [317.881, 282.457],
      [411.636, 282.457], [499.155, 535.273]]);
    ctx.restore();
  }
  if (paper && !flatVector) {
    paperFinishPass(ctx, board, sharedPaperPatternFor(ctx, paperMaterial), {
      grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA,
      strokeStyle: PAPER_LANDMARK_RIM_COLOR,
      lineWidth: PAPER_LANDMARK_RIM_WIDTH,
    });
  }
  const ink = sign.ink || DESERT_SPEED_SIGN_INK;
  const mid = (sign.top + sign.bottom) / 2;
  const triangleFaceMid = (sign.top + (sign.bottom - sign.top) * 0.06
    + sign.bottom - (sign.bottom - sign.top) * 0.08) / 2;
  if (shape === 'autobahn') {
    // Symbol-only sign; the glyph is the complete message.
  } else if (sign.kind === 'caution' && !sign.showText) {
    warningFormula(triangleFaceMid + (sign.bottom - sign.top)
      * ((Number(sign.warningFormulaOffset) || 0)
        + (Number(sign.warningMarkOffset) || 0)));
  } else if (shape === 'arrow') {
    const textX = -sign.w * 0.12;
    drawRoadSignText(ctx, sign.label, textX,
      sign.top + (sign.bottom - sign.top) * 0.30, sign.labelCell, ink);
    drawRoadSignText(ctx, sign.value, textX,
      sign.bottom - (sign.bottom - sign.top) * 0.30, sign.valueCell, ink);
  } else {
    const textX = sign.kind === 'exit' ? 4 : sign.motif === 'motorway' ? sign.w * 0.13 : 0;
    drawRoadSignText(ctx, sign.label, textX,
      sign.top + (sign.bottom - sign.top) * 0.28, sign.labelCell, ink);
    drawRoadSignText(ctx, sign.value, textX,
      sign.kind === 'route' ? mid + 6 : sign.bottom - (sign.bottom - sign.top) * 0.31,
      sign.valueCell, ink);
    if (sign.kind === 'exit') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(-sign.w * 0.34, mid);
      ctx.lineTo(-sign.w * 0.22, mid);
      ctx.moveTo(-sign.w * 0.34, mid);
      ctx.lineTo(-sign.w * 0.27, mid - 5);
      ctx.moveTo(-sign.w * 0.34, mid);
      ctx.lineTo(-sign.w * 0.27, mid + 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSpeedLimitSigns(ctx, camX, layerBaseY = GROUND_Y, options = {}) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  for (const sign of desertSpeedLimitPlacements(ctx, camX, layerBaseY, options)) {
    drawRoadSign(ctx, sign, options);
  }
  ctx.restore();
}

// The authoring gallery needs to inspect the things that live inside a level
// without recreating their silhouettes. Keep this small adapter beside the
// real painters: each item below still goes through the same source path and
// the same authored scale/alpha used by the Speed Zone background.
export function drawSpeedSceneryItem(ctx, kind, options = {}) {
  const t = Number.isFinite(Number(options.t)) ? Number(options.t) : 0;
  const layerOptions = { ...options, t };
  switch (kind) {
    case 'cactus': {
      const height = Number.isFinite(Number(options.height)) ? Number(options.height) : 22;
      const cactus = {
        x: 0,
        baseY: 0,
        height,
        lineWidth: Math.max(CACTUS_MIN_STROKE, height * CACTUS_STROKE),
        flip: 1,
        arms: 3,
      };
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = DESERT_CACTUS_INK;
      drawCactusShape(ctx, cactus);
      ctx.restore();
      return;
    }
    case 'rock':
    case 'sage': {
      const scale = Number.isFinite(Number(options.scale)) ? Number(options.scale) : 1;
      ctx.save();
      ctx.globalAlpha = 1;
      drawDesertNearSurfaceFeature(ctx, {
        x: 0,
        baseY: 0,
        scale,
        angle: Number.isFinite(Number(options.angle)) ? Number(options.angle) : 0,
        kind,
      }, layerOptions);
      ctx.restore();
      return;
    }
    case 'water-tower':
      ctx.save();
      ctx.globalAlpha = 0.78;
      drawWaterTower(ctx, { x: 0, baseY: 0, scale: options.scale || 0.92 }, layerOptions);
      ctx.restore();
      return;
    case 'satellite-dish':
      ctx.save();
      ctx.globalAlpha = 0.74;
      drawSatelliteDish(ctx, { x: 0, baseY: 0, scale: options.scale || 0.86, index: 0, variant: 1 }, layerOptions);
      ctx.restore();
      return;
    case 'satellite-dish-cluster': {
      const dishes = [-24, 0, 24].map((x, variant) => ({
        x,
        baseY: 0,
        scale: variant === 1 ? 0.86 : 0.68,
        index: 0,
        variant,
      }));
      ctx.save();
      ctx.globalAlpha = 0.74;
      drawSatelliteSignalLinks(ctx, dishes, layerOptions);
      for (const dish of dishes) drawSatelliteDish(ctx, dish, layerOptions);
      ctx.restore();
      return;
    }
    case 'wind-turbine':
      ctx.save();
      ctx.globalAlpha = 0.70;
      drawWindTurbine(ctx, { x: 0, baseY: 0, scale: options.scale || 0.82, index: 0, variant: 1 }, layerOptions);
      ctx.restore();
      return;
    case 'telegraph-pole':
      ctx.save();
      ctx.globalAlpha = 0.76;
      drawTelegraphPole(ctx, { x: 0, baseY: 0, topY: -40 });
      ctx.restore();
      return;
    case 'road-sign': {
      const source = options.sign
        || (options.liveWarning
          ? DESERT_ROAD_SIGNS.find((item) => item.kind === 'caution')
          : DESERT_ROAD_SIGNS[2]);
      const sign = {
        ...source,
        x: 0,
        baseY: 0,
        postFootY: (source.scale || 1) * (source.postFoot || 33),
      };
      ctx.save();
      ctx.globalAlpha = 0.92;
      drawRoadSign(ctx, sign, layerOptions);
      ctx.restore();
      return;
    }
    default:
      throw new Error(`Unknown Speed Zone scenery item: ${kind}`);
  }
}

// The same small adapter for the scenery owned by the other cabinets. Keeping
// these calls next to the production painters means the gallery can review a
// prop at source-backed scale without inventing a second silhouette.
export function drawLevelSceneryItem(ctx, kind, options = {}) {
  const scale = Number.isFinite(Number(options.scale)) ? Number(options.scale) : 1;
  const drawPlumberSprite = (spriteKind) => {
    const sprite = plumberScenerySprite(
      spriteKind,
      Number.isFinite(Number(options.variant)) ? Number(options.variant) : 1,
      false,
      'scenery',
      1,
    );
    if (!sprite) return;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    ctx.drawImage(sprite.canvas, -width * 0.5, -height, width, height);
  };
  // A shipped bush standing on y = 0: options.bush names the type (hedgerow, gorse,
  // robin), else the variant picks one. The robin hedge is caught with its bird up.
  const drawPlumberBushItem = () => {
    const variant = Number.isFinite(Number(options.variant)) ? Number(options.variant) : 1;
    const type = PLUMBER_BUSH_TYPES.includes(options.bush)
      ? options.bush : PLUMBER_BUSH_TYPES[((variant % 3) + 3) % 3];
    const seed = 3;
    ctx.save();
    ctx.scale(scale, scale);
    drawPlumberBush(ctx, type, variant, plumberRobinShowT(seed), seed, false, 'scenery', 1);
    ctx.restore();
  };
  switch (kind) {
    case 'plumber-flower':
      drawPlumberSprite('flower');
      return;
    case 'plumber-bush':
      drawPlumberBushItem();
      return;
    case 'plumber-house': {
      // A shipped house (plumberHouses.js) standing on y = 0: options.house names the
      // type (rose, pink, farm, hut), else the variant picks one; options.t its moment.
      const variant = Number.isFinite(Number(options.variant)) ? Number(options.variant) : 0;
      const n = PLUMBER_HOUSE_TYPES.length;
      const type = PLUMBER_HOUSE_TYPES.includes(options.house)
        ? options.house : PLUMBER_HOUSE_TYPES[((variant % n) + n) % n];
      ctx.save();
      ctx.scale(scale, scale);
      drawPlumberHouse(ctx, type, Number.isFinite(Number(options.t)) ? Number(options.t) : 2.9,
        false, 'scenery', 1);
      ctx.restore();
      return;
    }
    case 'plumber-cluster': {
      ctx.save();
      ctx.translate(-18, 0);
      drawPlumberSprite('flower');
      ctx.restore();
      ctx.save();
      ctx.translate(14, 0);
      drawPlumberBushItem();
      ctx.restore();
      ctx.save();
      ctx.translate(0, -2);
      drawPlumberSprite('fence');
      ctx.restore();
      return;
    }
    case 'frost-pine':
      drawFrostSceneryFeature(ctx, { kind: 'pine', x: 0, baseY: 0, scale }, {
        layer: options.layer || 'near', sceneryStudy: FROST_COMBINED_SCENERY_FINISH,
      });
      return;
    case 'crypt-dead-tree':
      drawCryptSceneryFeature(ctx, { x: 0, baseY: 0, scale, kind: 'dead-tree' }, { layer: options.layer || 'near' });
      return;
    case 'crypt-stone':
      drawCryptSceneryFeature(ctx, { x: 0, baseY: 0, scale, kind: 'stone', angle: options.angle || 0 }, { layer: options.layer || 'near' });
      return;
    case 'office-building':
      drawOfficeBuilding(ctx, { x: -26, w: 52, h: 43, roof: options.roof || 'antenna', variant: 1 }, 0);
      return;
    case 'surge-pylon':
      ctx.save();
      ctx.scale(scale, scale);
      surgePylonShape(ctx, SURGE_SCENERY_PALETTE);
      ctx.restore();
      return;
    default:
      throw new Error(`Unknown level scenery item: ${kind}`);
  }
}

// Campfire smoke plumes billowing through the middle distance.
//
// Peter asked about tornadoes and these are the desert version of that idea,
// deliberately. A tornado implies a STORM — dark base, heavy sky, something
// arriving — and this cabinet is a clear orange sunset that would be arguing
// with it. It also implies threat, which is the trap the vultures had: anything
// that looks like weather coming for you is something the player expects to
// matter. Smoke is quieter: it suggests a campfire hidden behind the near
// ridge without adding a visible flame or another playable hazard.
//
// Use the same cool, outlined puff language as the Plumber volcano. The inked
// silhouette gives each billow a readable edge against the sunset instead of
// letting a stack of translucent blobs collapse into a dirt smear.
//
// They live on the MIDDLE range's parallax and are drawn behind the near ridge,
// so they can never be mistaken for something standing in the lane.
// Tall enough to CLEAR the near ridge, which is the whole trick. The foot
// stands on the middle distance and is hidden behind the near dunes — correct,
// and what puts them out on the plain rather than in the lane — so everything
// the player actually sees is the upper column. Cut at the height they were
// first drawn (54) the entire plume sat below the near crest and the effect
// was invisible on every frame.
const DESERT_SMOKE_PLUMES = [
  { x: 245, h: 172, w: 15, rate: 0.55, drift: 5.5, plx: 0.19, lean: 0.08, alpha: 0.70 },
];

function drawCampfireSmoke(ctx, t, camX, layerBaseY = GROUND_Y) {
  // A wrap span far wider than the screen, so most of the time you are looking
  // at one plume or none. That keeps the smoke a background discovery rather
  // than turning the country into a row of active fires.
  const span = backgroundPaintCoverage(ctx).width * 4;
  ctx.save();
  for (const d of DESERT_SMOKE_PLUMES) {
    // Its OWN drift on top of the parallax, so it crosses the plain even when
    // the camera is still.
    const wander = t * d.drift;
    const view = backgroundPaintCoverage(ctx);
    const x = view.left - 110
      + (((d.x - camX * d.plx * ZOOM - wander) % span) + span) % span;
    if (outsideView(ctx, x, 60)) continue;
    // The unseen fire sits on the middle range's ground line, not the frame's.
    // The near ridge hides this lower portion and leaves the smoke to explain
    // a campfire that the player never sees.
    const base = layerBaseY - 4;
    // Reuse the Plumber volcano's outlined, multi-lobed puff sprite. A fuller,
    // lighter chain reads like one layered smoke signal: overlapping rising
    // marks at an occasional location, not constant background weather.
    const N = 6;
    for (let i = 0; i < N; i++) {
      // Each puff has a staggered rise phase. It fades in behind the ridge,
      // travels upward, then fades out before the phase wraps into a new puff
      // at the hidden source — no suspended beads hovering in place.
      const riseRate = 0.08 + d.rate * 0.01;
      const risePhase = (t * riseRate + (i + 0.5) / N) % 1;
      const u = 0.06 + risePhase * 0.88;
      const drift = Math.sin(t * d.rate + i * 1.7 + d.x) * (1.5 + u * 5.5);
      const sway = Math.sin(t * d.rate * 0.64 + i * 2.1 + d.x * 0.02) * 2.6;
      const cx = x + d.lean * d.h * u * u + drift + sway;
      const cy = base - d.h * u;
      // Start slightly narrow behind the ridge, then broaden as the plume
      // rises. This makes the smoke feel volumetric without becoming a solid
      // column, while the volcano sprite supplies the dark outer contour and
      // lighter upper cap.
      const r = d.w * (0.52 + u * 0.42);
      const fadeIn = Math.min(1, risePhase / 0.12);
      const fadeOut = Math.min(1, (1 - risePhase) / 0.18);
      const alpha = d.alpha * fadeIn * fadeOut * 0.26;
      smokePuff(ctx, cx, cy, r, alpha, i + (d.x >= 700 ? 5 : 0));
    }
  }
  ctx.restore();
}

// A landmark pinned to a WORLD position, the way the plumber cabinet's volcano
// is. It parallaxes slower than the far ridge (0.09 against 0.12) so it drifts
// behind it and reads as genuinely distant rather than as another hill.
//
// The point of a landmark is not decoration: it is that the run acquires a
// destination. A stage with one thing on the horizon that slowly gets closer is
// a journey; a stage with a repeating ridge is a treadmill.
// Keep the butte only modestly above the far mesa. The original 74px half-width
// and 128px rise made the landmark dominate the country instead of anchoring it.
const DESERT_BUTTE_HALF_WIDTH = 62;
const DESERT_BUTTE_HEIGHT = 108;

function drawButte(ctx, camX, atCam, layerBaseY = GROUND_Y,
  paper = false, paperMaterial = 'cardstockClear') {
  const cx = viewCenterX(ctx) + (atCam - camX) * 0.09 * ZOOM;
  const halfW = DESERT_BUTTE_HALF_WIDTH;
  // The margin has to cover the WIDEST ink this painter can put down, not the
  // silhouette's nominal half-width: the talus and shadow reach about 26px
  // further left than `cx - halfW`, and at the old 40 the landmark's first
  // frame appeared that far inside the picture. Cheap insurance — being
  // generous here costs one draw call at the very edge of the crossing.
  if (outsideView(ctx, cx + halfW + 70, 120) && outsideView(ctx, cx - halfW, 120)) return;
  const baseY = layerBaseY - 4;
  // Raised with the ranges. The landmark only works if it stands clearly over
  // the far mesas, and at the old 96 it was level with them once they went up.
  const capY = baseY - DESERT_BUTTE_HEIGHT;
  ctx.save();
  ctx.translate(cx, 0);
  // Talus slope out to a flat cap: steep sides, dead-flat top, the same
  // silhouette logic as the mesa ridge at a size that can carry strata.
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-halfW, baseY);
    ctx.lineTo(-halfW * 0.62, capY + 14);
    ctx.lineTo(-halfW * 0.52, capY);
    ctx.lineTo(halfW * 0.5, capY);
    ctx.lineTo(halfW * 0.6, capY + 12);
    ctx.lineTo(halfW, baseY);
    ctx.closePath();
  };
// The smaller sibling goes down FIRST and to the left, so the main butte
  // overlaps it. One butte on an empty horizon reads as a prop; two at
  // different distances read as country.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = DESERT_ROCK_DARK;
  ctx.beginPath();
  ctx.moveTo(-halfW - 56, baseY);
  ctx.lineTo(-halfW - 38, capY + 52);
  ctx.lineTo(-halfW - 10, capY + 52);
  ctx.lineTo(-halfW - 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  if (paper) {
    paperShadowPass(ctx, body, PAPER_DEEP_OFFSET, PAPER_LANDMARK_DEEP_COLOR);
    paperShadowPass(ctx, body, PAPER_CONTACT_OFFSET, PAPER_LANDMARK_CONTACT_COLOR);
  }
  body();
  ctx.fillStyle = DESERT_ROCK;
  ctx.fill();
  // Strata, clipped to the silhouette so the bands stop at the cut faces
  // rather than running out into the sky.
  ctx.save();
  body();
  ctx.clip();
  for (const [y, h, col] of [
    [capY, 7, DESERT_ROCK_LIT], [capY + 22, 5, DESERT_ROCK_DARK],
    [capY + 44, 9, DESERT_ROCK_DARK], [capY + 68, 6, DESERT_ROCK_LIT],
  ]) {
    ctx.fillStyle = col;
    ctx.fillRect(-halfW, y, halfW * 2, h);
  }
  ctx.restore();
  if (paper) {
    paperFinishPass(ctx, body, sharedPaperPatternFor(ctx, paperMaterial), {
      grainAlpha: PAPER_LANDMARK_GRAIN_ALPHA,
      strokeStyle: PAPER_LANDMARK_RIM_COLOR,
      lineWidth: PAPER_LANDMARK_RIM_WIDTH,
    });
  }
  ctx.restore();
}

// Heat haze at the horizon lived here and has been cut. It was auditioned on
// its own, where it read as heat, and it survived one round at reduced
// strength — but with three hill ranges under it the softest version that did
// anything was still the first thing your eye went to, and a background whose
// most noticeable element is a wash over the horizon is a background arguing
// with the road. The depth it was faking is now done properly by the middle
// range instead.

// ---------------------------------------------------------------------------
// Plumber's foreground apron: broad grass bands rather than Speed's checker
// road. The marks grow with distance down the apron and their scroll rates
// separate gently, so portrait's extra lower runway reads as moving ground
// without turning the platformer's surface into a racing strip.
const PLUMBER_APRON_STRATA = Object.freeze([
  { y: 9, h: 3, span: 64, width: 24, rate: 0.72, color: 'rgba(112, 196, 92, 0.30)' },
  { y: 21, h: 5, span: 108, width: 58, rate: 0.98, color: 'rgba(24, 92, 42, 0.22)' },
  { y: 32, h: 5, span: 156, width: 94, rate: 1.24, color: 'rgba(112, 196, 92, 0.22)' },
]);

function drawPlumberApronStrata(ctx, camX, obstacles, overhangs, viewW) {
  const runs = apronRuns(camX, obstacles, overhangs, viewW);
  const travel = camX;
  ctx.save();
  for (const band of PLUMBER_APRON_STRATA) {
    const y = GROUND_Y + band.y;
    const phase = ((travel * band.rate) % band.span + band.span) % band.span;
    ctx.fillStyle = band.color;
    for (const [a, b] of runs) {
      if (b <= a) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a, y, b - a, band.h);
      ctx.clip();
      for (let x = -band.span - phase; x < viewW + band.span; x += band.span) {
        ctx.fillRect(x, y, band.width, band.h);
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawPaperApronTexture(ctx, camX, obstacles, overhangs, viewW,
  material = 'cardstockClear', textureSpeed = PAPER_TEXTURE_SPEED_DEFAULT, strength = 1) {
  const patternCamX = paperTextureCameraX(camX, textureSpeed);
  const pattern = anchorPaperPattern(sharedPaperPatternFor(ctx, material), patternCamX, 0)
    || anchorPaperPattern(paperPatternFor(ctx), patternCamX, 0);
  if (!pattern) return;
  const runs = apronRuns(camX, obstacles, overhangs, viewW);
  ctx.save();
  ctx.globalCompositeOperation = PAPER_TEXTURE_BLEND;
  ctx.globalAlpha = PAPER_SURFACE_ALPHA * strength;
  ctx.fillStyle = pattern;
  for (const [a, b] of runs) {
    if (b > a) ctx.fillRect(a, GROUND_Y, b - a, H - GROUND_Y);
  }
  ctx.restore();
}

/**
 * THE GROUND TEXTURE CARRIES ON OVER A STAGED EXIT, one step lower.
 *
 * A pack's apron has to stop for the whole of a tunnel — its flat body would
 * hang in the air over the chamber — and that cut used to take the texture with
 * it right to the end of the span. So the ground died at the chamber and came
 * back only once the lane had fully levelled out, a screen and a half later,
 * with a blank stripe in between. Out on the staged exit (routes.js,
 * TUNNEL_EXIT_SHELF) there IS ground: a shelf a step below the lane, climbing
 * home. Only the TEXTURE belongs there — the apron body still does not.
 *
 * Drawn in its own pass because the pack's ground goes down before the terrain
 * and the routes, and the hillside over the shelf is painted by those: anything
 * laid here in the ground pass is buried by the time the frame is finished.
 * Each dash sits at the depth under its own middle, so a row tilts with the
 * climb rather than stepping down it.
 */
function drawShelfTexture(ctx, camX, cab, shelves, viewW = W, material = null) {
  if (!shelves || !shelves.length) return;
  const travel = camX;
  const spans = [];
  for (const sp of shelves) {
    const a = Math.max(0, sp.x - camX);
    const b = Math.min(viewW, sp.x + sp.w - camX);
    if (b > a) spans.push([a, b, sp]);
  }
  if (!spans.length) return;
  ctx.save();
  if (cab.id === 'plumber') {
    for (const band of PLUMBER_APRON_STRATA) {
      const y = GROUND_Y + band.y;
      const phase = ((travel * band.rate) % band.span + band.span) % band.span;
      ctx.fillStyle = band.color;
      for (const [a, b, sp] of spans) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(a, y, b - a, band.h + 80);
        ctx.clip();
        for (let x = -band.span - phase; x < viewW + band.span; x += band.span) {
          if (x + band.width < a || x > b) continue;
          ctx.fillRect(x, y + sp.depthAt(camX + x + band.width / 2), band.width, band.h);
        }
        ctx.restore();
      }
    }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (const [a, b, sp] of spans) {
      for (let x = -(camX % 24); x < viewW; x += 24) {
        if (x < a || x + 10 > b) continue;
        ctx.fillRect(x, GROUND_Y + 8 + sp.depthAt(camX + x + 5), 10, 2);
      }
    }
  }
  ctx.restore();
}

// PLUMBER PANIC'S LANDMARKS AND FLOCKS (Peter, 24 Sep 2026, from the countryside ideas
// bake-off; the art is stylePacks/plumberLandmarks.js).
//
// A DIFFERENT PLACE EACH LEVEL: plumber-1 passes the barn and silo near the start and
// comes out into patchwork fields near the end; plumber-2 has two hot-air balloons drift
// over; plumber-3 has the windmill on a hilltop halfway. The barn and the mill are pinned
// to a point in the stage the way the volcano is, and stand on the near ridge's summit
// nearest that point. THE SHEEP AND THEIR DOG ARE ON EVERY STAGE, a flock on about one
// near summit in seventeen, never on the barn's or the mill's.
const PLUMBER_BARN_AT_PX = 700;          // world px: near the start of plumber-1
const PLUMBER_MILL_AT = 0.35;            // fraction of plumber-3 (the volcano owns 0.5)
const PLUMBER_BALLOONS_AT = [0.22, 0.66];  // fractions of plumber-2
const PLUMBER_BALLOON_FACTOR = 0.1;      // they drift across slower than the far range
// Plumber-1's patchwork is LAND THAT RAMPS UP. Neither a fade, nor a lift, nor a grow
// (Peter, 24 Sep — all three tried): nothing animates. The fields are a slope in the
// country itself, anchored in each band's own parallax plane, and they become visible
// because the run travels onto higher ground. The slope's toe enters at the picture's
// right edge at PLUMBER_FIELDS_AT of the stage and the land reaches full relief
// PLUMBER_FIELDS_RAMP screen px behind it.
const PLUMBER_FIELDS_AT = 0.7;
const PLUMBER_FIELDS_RAMP = 320;
let plumberNearSummitPx = null;
function plumberNearSummit(period) {
  if (plumberNearSummitPx != null) return plumberNearSummitPx;
  let best = 0, bestY = Infinity;
  for (let px = 0; px < period; px += 0.5) {
    const y = ridgeProfile(px, 0, 34, PLUMBER_NEAR_TREE_WL, period, false, false, false);
    if (y < bestY) { bestY = y; best = px; }
  }
  plumberNearSummitPx = best;
  return best;
}
// `near(x)` is the near crest's y at screen x in the current coordinates; `nearTop` the
// highest the crest reaches.
function drawPlumberLife(ctx, t, camX, totalDist, stageIndex, progress, near, nearTop, paper, hill) {
  const view = backgroundPaintCoverage(ctx);
  const P = PLUMBER_NEAR_TREE_PERIOD;
  const f = PLUMBER_NEAR_TREE_FACTOR * ZOOM;
  const summit = plumberNearSummit(P);
  const summitX = (k) => view.left - camX * f + k * P + summit;
  // The summit tile that arrives mid-picture when the camera reaches atCam.
  const tileAt = (atCam) => Math.round((atCam * f + W / 2 - summit) / P);
  const staged = Number.isFinite(totalDist) && totalDist > 0;
  const seat = { near, far: near };
  let landmarkTile = null;
  if (stageIndex === 1) {
    const k = tileAt(PLUMBER_BARN_AT_PX);
    landmarkTile = k;
    const x = summitX(k);
    if (!outsideView(ctx, x, 60)) drawPlumberBarn(ctx, t, x, seat, paper);
  } else if (stageIndex === 3 && staged) {
    const k = tileAt(totalDist * PLUMBER_MILL_AT);
    landmarkTile = k;
    const x = summitX(k);
    if (!outsideView(ctx, x, 40)) drawPlumberWindmill(ctx, t, x, seat, paper, hill);
  }
  // The flock: every sixth-ish summit, chosen by hash, clear of the landmark's.
  const first = Math.floor((camX * f - 100) / P) - 1;
  for (let k = first; k <= first + Math.ceil((view.width + 200) / P) + 2; k++) {
    if (landmarkTile != null && Math.abs(k - landmarkTile) <= 2) continue;
    if (!plumberFlockTile(k)) continue;
    const x = summitX(k);
    if (!outsideView(ctx, x, 80)) drawPlumberSheep(ctx, t, x, seat, paper);
  }
}
function hashUnit(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
// Whether near summit tile `k` may carry a flock: every tenth tile, 60% of those by hash.
// drawPlumberLife further skips any within 2 tiles of the stage's barn or mill. The
// houses read this too (plumberHouseCellForBand), to stand clear of every flock.
function plumberFlockTile(k) {
  return ((k % 10) + 10) % 10 === 3 && hashUnit(k * 7.31 + 2) <= 0.6;
}

function pixelPack(settings) {
  const requested = paperCutoutPreviewRequested(settings);
  const speedLimitValues = new Map();
  const paperPreview = requested && ((settings.paperCabinet || 'plumber') === 'plumber'
    || !!settings.paperPreset);
  const paperPreset = paperPresetName(settings.paperPreset);
  const textureSpeed = paperTextureSpeedOf(settings.paperTextureSpeed);
  const paperStrengths = paperStrengthsOf(settings);
  return {
    name: 'pixel',
    lightBg: paperPreview,
    paperSkyStatic: paperPreview && (settings.paperCabinet || 'plumber') === 'plumber',
    paperSlab: paperPreview ? {
      shadow: (ctx, source, options = {}) => sharedPaperShadowPass(ctx, source,
        options.subtle ? PAPER_SUBTLE_DEEP_OFFSET : PAPER_DEEP_OFFSET,
        options.subtle ? PAPER_SUBTLE_DEEP_COLOR : PAPER_DEEP_COLOR),
      contact: (ctx, source, options = {}) => sharedPaperShadowPass(ctx, source,
        options.subtle ? PAPER_SUBTLE_CONTACT_OFFSET : PAPER_CONTACT_OFFSET,
        options.subtle ? PAPER_SUBTLE_CONTACT_COLOR : PAPER_CONTACT_COLOR),
      finish: (ctx, source, options = {}) => sharedPaperFinishPass(ctx, source,
        anchorPaperPattern(sharedPaperPatternFor(ctx, paperPreset),
          paperTextureCameraX(ctx.__paperCamX || 0, textureSpeed), 0),
        { alpha: paperStrengths.ground, ...options, rim: false }),
      material: PAPER_MATERIALS[paperPreset],
      textureSpeed,
      groundStrength: paperStrengths.ground,
      paper: true,
    } : null,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      if (cab.id === 'plumber' && paperPreview) {
        // THE VISIBLE BAND, not `0..W`.
        //
        // This fill happens in the SHIFTED space, where portrait's picture runs
        // from about 131 to 611 rather than 0 to 480 — so a fill of `0..W` left
        // the rightmost strip of the sky unpainted, and with run.js's own sky
        // fill skipped for this study there was nothing underneath it. The
        // static fibre sheet below is the opposite case and wants the base
        // frame, because it resets the transform first; the two were swapped.
        const coverage = backgroundPaintCoverage(ctx) || DEFAULT_BACKGROUND_COVERAGE;
        ctx.fillStyle = cab.sky[0];
        // OVERSCANNED SIDEWAYS, for the same reason it is overscanned by
        // PAN_MAX vertically: this is one flat colour, and a sky that falls
        // even a few pixels short of the picture leaves the page showing
        // through. The published coverage came up 22 logical px shy of the
        // right-hand edge in portrait — measured as 18 canvas columns at alpha
        // 101 instead of 255 — so the fill is given a frame's width of slack
        // either side rather than being trusted to be exact. Overdrawing a
        // fillRect costs nothing; coming up short costs the sky.
        ctx.fillRect(coverage.left - W, -PAN_MAX,
          coverage.width + W * 2, H + PAN_MAX * 2);
        // AND THE WHOLE CANVAS, IN THE BASE FRAME.
        //
        // PAN_MAX of headroom is only enough for the crane. On a sky road the
        // backdrop also takes climb * BG_FOLLOW, so bgShift runs past PAN_MAX
        // and the shifted fill above stops short of the top of the screen.
        // run.js skips its own sky prefill for the paper study, and the fibre
        // sheet below IS pinned to the base frame — so that strip showed the
        // fibre over bare canvas, which reads as TV static. A flat colour has
        // no seam to worry about, so pin it where the fibre is pinned.
        if (typeof ctx.setTransform === 'function' && ctx.canvas) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.restore();
        }
      } else skyGrad(ctx, cab.sky[0], cab.sky[1]);
      if (cab.id === 'plumber' && paperPreview) {
        // The fibre belongs to the sheet of sky, not to the camera move. Draw
        // it in the renderer's base logical space before the moving scenery is
        // painted over it, so it stays pinned while hills and clouds scroll.
        ctx.save();
        if (typeof ctx.setTransform === 'function' && ctx.canvas) {
          ctx.setTransform(ctx.canvas.width / Math.max(1, W), 0, 0,
            ctx.canvas.height / Math.max(1, H), 0, 0);
          // THE BASE FRAME, not the camera's coverage.
          //
          // The transform has just been reset to the renderer's base logical
          // space, which is what pins the fibre to the sheet of sky instead of
          // letting it scroll. The published coverage describes the visible
          // band in the SHIFTED space — in portrait it starts around 131, not
          // 0 — so handing it to a pass that draws in base space laid the sheet
          // 131px to the right and ran it off the edge, leaving the sky
          // textured in a band with bare stripes either side. Measured: band
          // edges at logical x 140 and 400 of a 480-wide frame.
          drawPaperSurface(ctx, DEFAULT_BACKGROUND_COVERAGE,
            'plumber-paper-sky-static', paperPreset, paperStrengths.sky);
        } else {
          // Keep lightweight renderer test doubles compatible; they do not
          // expose a real backing canvas or transform state.
          drawPaperSurface(ctx, backgroundCoverage(ctx),
            'plumber-paper-sky', paperPreset, paperStrengths.sky);
        }
        ctx.restore();
      }
      const sceneryOffset = portraitSceneryOffset(backgroundContext);
      const plumberLandscapeOffset = cab.id === 'plumber'
        ? plumberLandscapeSceneryOffset(backgroundContext) : 0;
      const farAmp = cab.id === 'plumber' ? 96 : 60;
      const nearAmp = 34;
      const farBaseY = sceneryRidgeBaseY(backgroundContext, 'farLandmark', farAmp, GROUND_Y);
      const nearBaseY = sceneryRidgeBaseY(backgroundContext, 'near', nearAmp, GROUND_Y);
      if (cab.id === 'plumber') {
        drawStaticSun(ctx, t, bgShift, backgroundContext, paperPreview, paperPreset,
          paperStrengths.sky);
      }
      // PLUMBER PANIC's far layer is a snow-capped range; the near green hills
      // stay rounded so the two layers read as distance, not repetition. It gets
      // extra amplitude because the near layer eats the bottom third of it —
      // at the shared amp of 60 the caps barely cleared the green.
      // The volcano goes down BEFORE the far range, so those crests overlap its
      // flanks and it reads as standing behind them.
      // Overtime runs have no midpoint (totalDist is Infinity), so no volcano.
      if (cab.id === 'plumber' && Number.isFinite(totalDist) && totalDist > 0) {
        ctx.save();
        ctx.translate(0, sceneryOffset + plumberLandscapeOffset
          + backgroundY(backgroundContext, 'far'));
        drawVolcano(ctx, t, camX, totalDist * 0.5,
          farBaseY - GROUND_Y, paperPreview, paperPreset);
        ctx.restore();
      }
      // THE CLOUDS GO DOWN LAST, AFTER THE RANGES.
      //
      // They used to be painted before the hills, which was invisible for as
      // long as the frame was 270px tall: the sky ended where the crests
      // began and the two never met. A portrait frame composes the clouds
      // into bands that DO cross the ridges, and painting them first meant a
      // cloud dragged below the skyline simply disappeared behind a hill.
      //
      // A cloud is weather in front of the country, not a sticker behind it,
      // so it passes in front of every range. Depth is still the depth table's
      // job — the clouds travel at their own rate — and this is only the
      // question of who is in front when they overlap.
      const paintClouds = () => {
        if (cab.id === 'plumber') {
          // Faceless cousins of the cloud pal: identical silhouette so the sky
          // reads as one weather system, parallax-scrolled at varied sizes —
          // a few bigger than the pal, a few small and distant. Greys mixed in
          // so the flock isn't a stamp sheet. Drawn BEFORE the pal so it always
          // floats in front of its plain cousins.
          for (const [off, cy, s, tint] of [
            [30, 34, 0.8, PIXEL_CLOUD_LIGHT],
            [110, 20, 1.15, PIXEL_CLOUD_LIGHT],
            [180, 68, 0.55, PIXEL_CLOUD_SHADE],
            [255, 44, 0.95, PIXEL_CLOUD_MID],
            [305, 26, 0.65, PIXEL_CLOUD_LIGHT],
            [390, 78, 1.1, PIXEL_CLOUD_LIGHT],
            [430, 58, 0.7, PIXEL_CLOUD_MID],
            [510, 36, 0.6, PIXEL_CLOUD_SHADE],
          ]) {
            const cx = wrapIntoView(ctx, off - camX * 0.2 * ZOOM - t * 4, 65);
            ctx.save();
            ctx.translate(cx, portraitCloudY(backgroundContext, [30, 110, 180, 255, 305, 390, 430, 510]
              .indexOf(off), cy) + backgroundY(backgroundContext, 'clouds'));
            ctx.scale(s, s);
            drawCloudBody(ctx, tint, paperPreview, paperPreset, paperStrengths.sky);
            ctx.restore();
          }
          drawCloudPal(ctx, t, backgroundContext,
            paperPreview, paperPreset, paperStrengths.sky);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.82)';
          for (let i = 0; i < 5; i++) {
            const cx = wrapIntoView(ctx, i * 137 - camX * 0.2 * ZOOM, 30);
            const cy = portraitCloudY(backgroundContext, i, 30 + (i * 37) % 60)
              + backgroundY(backgroundContext, 'clouds');
            ctx.fillRect(cx, cy, 34, 8);
            ctx.fillRect(cx + 6, cy - 5, 20, 5);
          }
        }
      };
      // The ranges and their ridge props are a single depth layer. Lift them
      // together so the mountain bases still flow behind the foreground lane.
      ctx.save();
      ctx.translate(0, sceneryOffset + plumberLandscapeOffset
        + backgroundY(backgroundContext, 'far'));
      if (cab.id === 'plumber') {
        // Rock and snow are haze-desaturated toward the sky rather than true
        // brown/white: distance reads better, and it keeps the cap under the
        // bloom bright-pass. Pure white snow (#eef6ff, luma .96) sailed past
        // the smoothstep(0.8, 0.97) cutoff in glfx.js and glowed like neon.
        // WAVELENGTH 200, not the 90 this shipped at. The peaked profile is
        // now five summits inside one period (PEAK_SUMMITS), and at pi*90 =
        // 283px of period the biggest of them would be 108px wide and 96 tall
        // — a spike, not a mountain. 200 puts the main summit's base at about
        // 239px, the same slope the single cone had, and gives the smaller
        // crests room to be different sizes rather than notches on one shape.
        // It also means the 480px frame shows three quarters of one authored
        // range instead of one and a half copies of the same triangle.
        parallaxHills(ctx, camX, cab.far, farBaseY, 96, 200, 0.15,
          { peak: true, rock: '#5e6e7c', snow: '#b9c8d8', paper: paperPreview,
            paperMaterial: paperPreset, paperStrength: paperStrengths.scenery });
      } else {
        if (cab.id === 'surge') {
          drawSurgeScenery(ctx, camX, farBaseY, {
            amp: 60, wl: 90, factor: 0.15, mode: 'pixel',
          });
        }
        parallaxHills(ctx, camX, cab.far, farBaseY, 60, 90, 0.15);
      }
      ctx.restore();
      // The near crest in these (untranslated) coordinates, for the countryside pieces.
      const nearShift = sceneryOffset + plumberLandscapeOffset + backgroundY(backgroundContext, 'near');
      const nearLeft = backgroundPaintCoverage(ctx).left;
      const nearCrest = (x) => ridgeYAt(x, camX, nearBaseY, nearAmp, PLUMBER_NEAR_TREE_WL,
        PLUMBER_NEAR_TREE_FACTOR, { coverageLeft: nearLeft }) + nearShift;
      const nearTop = nearBaseY - nearAmp + nearShift;
      const plumberStage = backgroundContext?.stageIndex ?? scene?.stageIndex ?? 1;
      const plumberProgress = backgroundContext?.progress;
      if (cab.id === 'plumber' && plumberStage === 1 && Number.isFinite(plumberProgress)
        && totalDist > 0) {
        const view = backgroundPaintCoverage(ctx);
        const viewR = view.left + view.width;
        // How far each band has scrolled since the toe sat at the right edge: world px
        // travelled since PLUMBER_FIELDS_AT, times that band's own parallax.
        const since = (plumberProgress - PLUMBER_FIELDS_AT) * totalDist;
        const BAND_F = [0.18, 0.24];
        if (since * BAND_F[0] * ZOOM > -20) {
          const heightAt = (band, x) => {
            const k = (x - viewR + since * BAND_F[band] * ZOOM) / PLUMBER_FIELDS_RAMP;
            const c = Math.max(0, Math.min(1, k));
            return c * c * (3 - 2 * c);
          };
          drawPlumberPatchwork(ctx, t, camX, { near: nearCrest, far: nearCrest }, paperPreview, 1,
            { view, nearTop, heightAt });
        }
      }
      ctx.save();
      ctx.translate(0, sceneryOffset + plumberLandscapeOffset
        + backgroundY(backgroundContext, 'near'));
      parallaxHills(ctx, camX, cab.hills, nearBaseY, nearAmp,
        PLUMBER_NEAR_TREE_WL, PLUMBER_NEAR_TREE_FACTOR,
        cab.id === 'plumber'
          ? { trees: { leaf: '#3c8c4c', trunk: '#6b4a30', scale: PLUMBER_NEAR_TREE_SCALE }, paper: paperPreview,
            paperMaterial: paperPreset, paperStrength: paperStrengths.scenery }
          : null);
      if (cab.id === 'plumber') {
        drawPlumberScenery(ctx, camX, nearBaseY, paperPreview, paperPreset,
          paperStrengths.scenery, t, plumberStage);
      }
      ctx.restore();
      if (cab.id === 'plumber') {
        drawPlumberLife(ctx, t, camX, totalDist, plumberStage, plumberProgress,
          nearCrest, nearTop, paperPreview, cab.hills);
        // Plumber-2's two balloons, each crossing once, slower than the far range.
        if (plumberStage === 2 && Number.isFinite(totalDist) && totalDist > 0) {
          PLUMBER_BALLOONS_AT.forEach((at, i) => {
            const x = viewCenterX(ctx) + (totalDist * at - camX) * PLUMBER_BALLOON_FACTOR * ZOOM;
            if (outsideView(ctx, x, 30)) return;
            const y = backgroundY(backgroundContext, 'clouds') + (i ? 58 : 44) + Math.sin(t * 0.4 + i * 2) * 4;
            drawPlumberBalloon(ctx, t, x, y, { paper: paperPreview, phase: i * 3.7, variant: i });
          });
        }
      }
      paintClouds();
    },
    // The texture over a staged exit, laid AFTER the terrain and the routes —
    // see drawShelfTexture. Optional on a pack; only this one has ground
    // texture to carry.
    shelfTexture(ctx, camX, cab, shelves, viewW = W) {
      drawShelfTexture(ctx, camX, cab, shelves, viewW, paperPreview ? paperPreset : null);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t, drawW);
      if (cab.id === 'plumber') {
        drawPlumberApronStrata(ctx, camX, obstacles, overhangs, drawW);
        // Terrain routes, including floating islands, are painted afterward by
        // game/terrain.js. Terrain and route surfaces receive the same adapter
        // after this base pass, so the material stays continuous across joins.
        if (paperPreview) drawPaperApronTexture(ctx, camX, obstacles, overhangs, drawW,
          paperPreset, textureSpeed, paperStrengths.ground);
        return;
      }
      // Scrolling ground ticks — a texture ON the apron, so they stop where the
      // apron does. Left to run they hang in open air: under a road that has a
      // chamber below it, and — until now — straight across every hole in the
      // floor, where a row of dashes marching over the void was the one mark on
      // screen insisting there was still ground there.
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      const skip = (overhangs || []).map((sp) => [sp.x - camX, sp.x + sp.w - camX]);
      const solid = solidRuns(camX, obstacles, drawW);
      for (let x = -(camX % 24); x < drawW; x += 24) {
        if (skip.some(([a, b]) => x + 10 > a && x < b)) continue;
        // Whole ticks only. Clipping one to a lip would leave a two-pixel stub
        // hanging off the edge, which reads as debris rather than as texture.
        if (!solid.some(([a, b]) => x >= a && x + 10 <= b)) continue;
        ctx.fillRect(x, GROUND_Y + 8, 10, 2);
      }
    },
    post() {},
  };
}

// SPEED ZONE'S LANDMARKS AND WILDLIFE (Peter, 24 Sep 2026, from the desert ideas
// bake-off; the art is stylePacks/desertLandmarks.js).
//
// ONE LANDMARK A LEVEL, so the three stages are three places: speed-1 has the oil field,
// speed-2 the villain's speed-trap billboard, speed-3 the jet going supersonic overhead.
// Each is pinned to one point in its stage the way the butte is, and seated on the
// summit of the range it stands on nearest that point, so it moves with that range and
// never slides over the dunes under it.
//
// THE WILDLIFE IS EVERYWHERE, more than once a stage: a coyote on a bare near summit,
// dust devils wandering the middle dunes, tumbleweeds bowling along the near crest on
// the wind. Each is an infinite row in its range's own space — a coyote per chosen
// tile, a tumbleweed every DESERT_WEED_SPACING px drifting right at DESERT_WEED_WIND —
// so nothing ever pops in or out: an item is on screen exactly when its spot is.
const DESERT_LANDMARK_BY_STAGE = { 1: 'pumpjacks', 2: 'speedTrap', 3: 'jet' };
const DESERT_LANDMARK_AT = 0.45;      // fraction of the stage the landmark arrives at
// ...except the speed trap, which is pinned to a DISTANCE: speed-2 is the chase stage and
// Eggshell flies in two bars after the start, and Peter wants the police car seen before
// he does (24 Sep). 320 world px puts the billboard on the right of the opening frame and
// mid-picture about two seconds in.
const DESERT_TRAP_AT_PX = 320;
const DESERT_JET_PASS = 1600;         // world px of the run the jet's pass lasts
const DESERT_WEED_SPACING = 640;      // near-layer px between tumbleweed slots
const DESERT_WEED_WIND = 26;          // near-layer px/s the wind rolls them to the right
const DESERT_PUMP_AT = 0.49;          // between DESERT_DUNES[0] and [2], so both rigs sit on summits
const desertHash = (i) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// Screen x of a point at layer-space position L on a range scrolling at `factor`: the
// same origin parallaxHills lays its first tile from (the coverage's left edge).
function desertLayerX(view, camX, factor, L) {
  return view.left - camX * factor * ZOOM + L;
}
// The index of the tile whose summit `at` arrives mid-picture when the camera reaches
// atCam, optionally restricted to tiles where `keep(k)`.
function desertTileAt(atCam, factor, period, at, keep = () => true) {
  const k0 = Math.round((atCam * factor * ZOOM + W / 2 - at * period) / period);
  for (let d = 0; d < 6; d++) {
    if (keep(k0 + d)) return k0 + d;
    if (keep(k0 - d)) return k0 - d;
  }
  return k0;
}
// THE COYOTES PERFORM (Peter, 24 Sep 2026, from the coyote bake-off). A stage passes
// two coyote summits (near tiles 11 and 14, at about 63% and 81% of a 60 s lap), so
// each stage's pair is a mix, dealt by the summit's order in the stage: speed-1 howls
// then yawns, speed-2 sings with a pup then howls, speed-3 yawns then sings. Past the
// pattern (an overtime run) the pair repeats. The shows are the painter's own
// (desertLandmarks.js drawDesertCoyote `mode`).
const DESERT_COYOTE_SHOWS = { 1: ['howl', 'yawn'], 2: ['chorus', 'howl'], 3: ['yawn', 'chorus'] };
// SPEED-3'S WINKER IS AT THE FINISH (Peter, 25 Sep 2026: "The winking coyote needs to be
// near the finish line in level 2-3"). It is not one of the hashed coyotes — the last of
// those comes at about 81% — but its own, seated as near the tape as it can get in the
// frame the camera parks on. Not held to a bare summit: bare ones can be 770 px apart
// and portrait's picture is 270 wide, so the finish frame often has none. It takes the
// nearest spot DESERT_WINK_CLEAR from every saguaro instead (they stand on the other
// dunes' summits), which is sometimes a valley. Hashed coyotes within a tile of it
// stand down, so the finish has one.
// The run says where (`finish`: the parked camera, and the tape's fraction across the
// picture, the heroFrac convention, since portrait shifts and zooms the backdrop).
function desertFinishWinkL(view, finish, nearP, nearF, portrait) {
  const frac = finish.frac - (portrait ? 0 : DESERT_WINK_BEHIND);
  const target = frac * view.width + finish.camX * nearF * ZOOM;
  const saguaros = [];
  const k0 = Math.floor(target / nearP);
  for (let k = k0 - 2; k <= k0 + 2; k++) {
    for (let i = 0; i < DESERT_DUNES.length; i++) {
      if ((((k + i) % 3) + 3) % 3 !== 2) saguaros.push((k + DESERT_DUNES[i].at) * nearP);
    }
  }
  for (let d = 0; d <= nearP; d++) {
    for (const L of [target - d, target + d]) {
      if (saguaros.every((c) => Math.abs(L - c) >= DESERT_WINK_CLEAR)) return { k: Math.floor(L / nearP), L };
    }
  }
  return null;
}
// Ledge half-width (26) plus a saguaro's arms and a little air.
const DESERT_WINK_CLEAR = 44;
// Landscape aims a little behind the tape, or the ledge sits right behind the pole
// and the hero celebrating at it. Portrait needs none: heroFrac's mapping already
// lands it ~40 px left of the pole there, and it has no room to spare on that side.
const DESERT_WINK_BEHIND = 0.14;
// A show starts as its ledge comes into view (the howl keeps its own loop), so it is
// never caught half over; the latch is keyed per summit and re-arms like the speed
// trap's — moving back ahead of the line, or time running backwards (a rewind or a new
// run), starts it again. Portrait crosses its narrow picture in about 2.3 s against
// 4.2 s, so there the show plays DESERT_COYOTE_PORTRAIT_PACE times faster.
const DESERT_COYOTE_ENTRY = 25;          // px inside the visible right edge
const DESERT_COYOTE_PORTRAIT_PACE = 1.5;
const desertCoyoteLatch = new Map();
// Screen x of everything in the desert backdrop that moves on its own — the campfire
// plumes, the horizon's dishes and turbines, and the coyotes — so a dust devil can keep
// its distance. The plume and coyote rules are their painters' own, repeated here.
function desertBusyXs(ctx, t, camX, view, nearP, nearF, summit0, bare, trapTile, wink = null) {
  const xs = [];
  const span = view.width * 4;
  for (const d of DESERT_SMOKE_PLUMES) {
    xs.push(view.left - 110 + (((d.x - camX * d.plx * ZOOM - t * d.drift) % span) + span) % span);
  }
  for (const p of desertHorizonPropPlacements(ctx, camX, GROUND_Y)) {
    if (p.kind !== 'water') xs.push(p.x);
  }
  const travel = camX * nearF * ZOOM;
  for (let k = Math.floor((travel - 60) / nearP); k <= Math.ceil((travel + view.width + 60) / nearP); k++) {
    if (!bare(k) || desertHash(k + 3) > 0.5) continue;
    if (trapTile != null && Math.abs(k - trapTile) <= 3) continue;
    if (wink && Math.abs(k - wink.k) <= 1) continue;
    xs.push(desertLayerX(view, camX, nearF, k * nearP + summit0 * nearP));
  }
  if (wink) xs.push(desertLayerX(view, camX, nearF, wink.L));
  return xs;
}
// THE SPEED CAMERA FIRES AS THE HERO PASSES IT (Peter, 24 Sep: "show SMILE first, then the
// flash and then the snapshot... while hero is on screen"). A latch, not a loop: SMILE!
// until the camera pole comes level with the hero, the flash on that frame, and the
// snapshot held while the board scrolls away. Moving back ahead of the pole (a rewind)
// re-arms it. Only a run passes `heroX`; the gallery keeps the camera's own loop.
const DESERT_TRAP_POLE_DX = -44;     // the camera pole, from the lot's centre
const DESERT_TRAP_FIRE_LEAD = 100;   // px ahead of the hero the pole is when it fires: early enough that the snapshot holds ~2s on screen
// PORTRAIT IS NARROW AND QUICK (Peter, 24 Sep: "doesn't really fire in portrait, it needs
// to be very quick"): the board crosses a narrow picture in a moment, so there it fires
// as soon as the whole board is in view, and the gag plays at DESERT_TRAP_PORTRAIT_PACE.
const DESERT_TRAP_PORTRAIT_PACE = 2.2;
const desertTrapLatch = { firedAt: null, pending: false };
export const desertSpeedTrapStage = (stageIndex) => DESERT_LANDMARK_BY_STAGE[stageIndex] === 'speedTrap';
// True once per camera fire, for the run to play the shutter (cameraClick).
export function takeDesertTrapShutter() {
  const p = desertTrapLatch.pending;
  desertTrapLatch.pending = false;
  return p;
}
function drawDesertLife(ctx, t, camX, totalDist, stageIndex, seat, jetY, heroId = 'lorenzo', heroFrac = null, portrait = false, finish = null, finishPadT = null) {
  const view = backgroundPaintCoverage(ctx);
  const nearP = Math.max(16, Math.round(Math.PI * DESERT_RIDGE.wl));
  const midP = Math.max(16, Math.round(Math.PI * DESERT_MID.wl));
  const nearF = DESERT_RIDGE.factor, midF = DESERT_MID.factor;
  const summit0 = DESERT_DUNES[0].at;
  // The pack leaves every third near summit-0 bare (desertCactusPlacements): the
  // near-dune items stand only there, so none of them is planted through a saguaro.
  const bare = (k) => ((k % 3) + 3) % 3 === 2;
  const landmark = Number.isFinite(totalDist) && totalDist > 0
    ? DESERT_LANDMARK_BY_STAGE[stageIndex] : null;
  const atCam = !landmark ? 0 : landmark === 'speedTrap' ? DESERT_TRAP_AT_PX : totalDist * DESERT_LANDMARK_AT;
  // Not held to a bare summit: pinned near the start, the nearest bare one can be a whole
  // tile past the opening frame. The lot's berm covers a saguaro on its summit.
  const trapTile = landmark === 'speedTrap' ? desertTileAt(atCam, nearF, nearP, summit0) : null;
  const wink = stageIndex === 3 && finish ? desertFinishWinkL(view, finish, nearP, nearF, portrait) : null;

  if (landmark === 'pumpjacks') {
    const k = desertTileAt(atCam, midF, midP, DESERT_PUMP_AT);
    const x = desertLayerX(view, camX, midF, k * midP + DESERT_PUMP_AT * midP);
    if (!outsideView(ctx, x, 300)) drawDesertPumpjacks(ctx, t, x, seat);
  }
  // Dust devils: on fewer than half the middle tiles, wandering a little, and kept clear
  // of everything else that moves back here (Peter, 24 Sep: "less dust devils and make
  // sure they are not near the smoke... not near other moving objects"). The oil field
  // shares their range, so a devil on its tiles is simply not dealt; the smoke, the
  // horizon's dishes and turbines and the coyotes scroll at other rates, so a devil
  // that one of them passes fades out and back rather than popping.
  {
    const travel = camX * midF * ZOOM;
    const pumpTile = landmark === 'pumpjacks' ? desertTileAt(atCam, midF, midP, DESERT_PUMP_AT) : null;
    const busy = desertBusyXs(ctx, t, camX, view, nearP, nearF, summit0, bare, trapTile, wink);
    for (let k = Math.floor((travel - 120) / midP); k <= Math.ceil((travel + view.width + 120) / midP); k++) {
      if (desertHash(k + 7) > 0.42) continue;
      if (pumpTile != null && Math.abs(k - pumpTile) <= 1) continue;
      const L = k * midP + 0.33 * midP + 30 * Math.sin(t * 0.15 + k);
      const x = desertLayerX(view, camX, midF, L);
      if (outsideView(ctx, x, 60)) continue;
      let near = Infinity;
      // Measured from the middle of its lean (it tilts ~45px right at the top).
      for (const bx of busy) near = Math.min(near, Math.abs(bx - (x + 20)));
      const clear = Math.max(0, Math.min(1, (near - 110) / 60));
      if (clear <= 0) continue;
      ctx.save();
      ctx.globalAlpha *= clear * clear * (3 - 2 * clear);
      drawDesertDustDevil(ctx, t, x, seat);
      ctx.restore();
    }
  }
  if (landmark === 'speedTrap') {
    const x = desertLayerX(view, camX, nearF, trapTile * nearP + summit0 * nearP);
    let since;
    if (Number.isFinite(heroFrac)) {
      const heroX = view.left + heroFrac * view.width;
      // Landscape: the pole a little ahead of the hero. Portrait: the moment the whole
      // board (and its car) is on screen, whichever comes first.
      const fireAt = portrait
        ? Math.max(heroX + DESERT_TRAP_FIRE_LEAD, view.left + view.width - 75 + DESERT_TRAP_POLE_DX)
        : heroX + DESERT_TRAP_FIRE_LEAD;
      if (x + DESERT_TRAP_POLE_DX > fireAt) desertTrapLatch.firedAt = null;
      else if (desertTrapLatch.firedAt == null || desertTrapLatch.firedAt > t) {
        desertTrapLatch.firedAt = t;
        desertTrapLatch.pending = true;
      }
      since = desertTrapLatch.firedAt == null ? null
        : (t - desertTrapLatch.firedAt) * (portrait ? DESERT_TRAP_PORTRAIT_PACE : 1);
    }
    if (!outsideView(ctx, x, 100)) drawDesertSpeedTrap(ctx, t, x, seat, heroId, since);   // ink x-90..x+75
  }
  // Coyotes: on about half the bare summits, never next to the speed trap.
  {
    const travel = camX * nearF * ZOOM;
    const isCoyote = (k) => bare(k) && desertHash(k + 3) <= 0.5
      && !(trapTile != null && Math.abs(k - trapTile) <= 3)
      && !(wink && Math.abs(k - wink.k) <= 1);
    const shows = DESERT_COYOTE_SHOWS[stageIndex] || ['howl'];
    const seen = backgroundCoverage(ctx);
    const entry = seen.right - DESERT_COYOTE_ENTRY;
    // Its show starts as its ledge comes into view, latched like the others'.
    if (wink) {
      const x = desertLayerX(view, camX, nearF, wink.L);
      let since = null;
      if (Number.isFinite(heroFrac)) {
        const key = `wink:${stageIndex}`;
        if (x > entry) desertCoyoteLatch.delete(key);
        else {
          if (!desertCoyoteLatch.has(key) || desertCoyoteLatch.get(key) > t) desertCoyoteLatch.set(key, t);
          since = t - desertCoyoteLatch.get(key);
        }
      }
      // It saves the wink for the finish pad (desertLandmarks.js 'winkWait'): until the
      // hero lands on it, it only blinks. A picture with no run (the gallery) keeps the
      // looped show.
      if (!outsideView(ctx, x, 40)) {
        drawDesertCoyote(ctx, t, x, seat, 1, Number.isFinite(heroFrac)
          ? { mode: 'winkWait', since: finishPadT, pace: 1 }
          : { mode: 'wink', since, pace: portrait ? DESERT_COYOTE_PORTRAIT_PACE : 1 });
      }
    }
    for (let k = Math.floor((travel - 60) / nearP); k <= Math.ceil((travel + view.width + 60) / nearP); k++) {
      if (!isCoyote(k)) continue;
      const x = desertLayerX(view, camX, nearF, k * nearP + summit0 * nearP);
      // Half of them howl the other way (Peter, 24 Sep). Hashed on the summit AND the
      // stage, since every stage passes the same summits.
      const facing = desertHash(k * 7 + stageIndex * 13 + 11) < 0.5 ? -1 : 1;
      let order = 0;
      for (let j = Math.max(0, k - 600); j < k; j++) if (isCoyote(j)) order++;
      const mode = shows[order % shows.length];
      // Only a run passes heroFrac; the gallery loops every show on its clock.
      let since = null;
      if (mode !== 'howl' && Number.isFinite(heroFrac)) {
        const key = stageIndex * 1e6 + k;
        if (x > entry) desertCoyoteLatch.delete(key);
        else {
          if (!desertCoyoteLatch.has(key) || desertCoyoteLatch.get(key) > t) {
            if (desertCoyoteLatch.size > 32) desertCoyoteLatch.clear();
            desertCoyoteLatch.set(key, t);
          }
          since = t - desertCoyoteLatch.get(key);
        }
      }
      if (!outsideView(ctx, x, 40)) {
        drawDesertCoyote(ctx, t, x, seat, facing,
          { mode, since, pace: portrait ? DESERT_COYOTE_PORTRAIT_PACE : 1 });
      }
    }
  }
  // Tumbleweeds: a slot every DESERT_WEED_SPACING, three in five filled, all rolling
  // right on the wind.
  {
    const travel = camX * nearF * ZOOM;
    const drift = DESERT_WEED_WIND * t;
    for (let k = Math.floor((travel - drift - 40) / DESERT_WEED_SPACING);
      k <= Math.ceil((travel - drift + view.width + 40) / DESERT_WEED_SPACING); k++) {
      if (desertHash(k + 13) > 0.6) continue;
      const L = k * DESERT_WEED_SPACING + drift;
      const x = desertLayerX(view, camX, nearF, L);
      if (outsideView(ctx, x, 30)) continue;
      drawDesertTumbleweed(ctx, t, x, seat, Math.floor(desertHash(k + 29) * 3), L);
    }
  }
  if (landmark === 'jet') {
    const k = (camX - atCam) / DESERT_JET_PASS;
    if (k >= 0 && k < 1) drawDesertJet(ctx, k, view.left - 40, view.right + 40, jetY);
  }
}

function faux3dPack(settings) {
  const paperPreview = !!(settings?.paperPreset
    && settings.paperCutout !== false && settings.paperCutout !== 'off');
  const speedLimitValues = new Map();
  const paperPreset = paperPresetName(settings?.paperPreset);
  const paperStrengths = paperStrengthsOf(settings);
  return {
    name: 'faux3d',
    lightBg: paperPreview,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      // SPEED ZONE only. faux3d also renders in THE SURGE's cycle, the hub
      // cabinet screens, the gallery and the social renderers, and none of
      // those are the desert.
      const desert = cab.id === 'speed';
      const portrait = !!backgroundContext?.portrait;
      // Keep every country layer in one composition. The offset is applied to
      // the layer translates, rather than to individual ridge bases, so each
      // cactus, pole, tower, dish, and turbine remains attached to the exact
      // crest it was sampled from. Celestial art and birds deliberately do not
      // use this offset, and the gameplay ground remains at GROUND_Y.
      const sceneryOffset = desert ? -desertSceneryLift(portrait) : 0;
      const backSceneryOffset = desert && !portrait
        ? sceneryOffset - DESERT_LANDSCAPE_BACK_LIFT : sceneryOffset;
      const farAmp = desert
        ? (portrait ? DESERT_FAR_PORTRAIT_AMP : DESERT_FAR.amp) : 50;
      const middleAmp = DESERT_MID.amp;
      const nearAmp = DESERT_RIDGE.amp;
      const farBaseY = sceneryRidgeBaseY(backgroundContext, 'farLandmark', farAmp, GROUND_Y)
        + (desert && portrait ? DESERT_FAR_PORTRAIT_DROP : 0);
      const middleBaseY = sceneryRidgeBaseY(backgroundContext, 'middle', middleAmp, GROUND_Y);
      const nearBaseY = sceneryRidgeBaseY(backgroundContext, 'near', nearAmp, GROUND_Y);
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      if (desert && paperPreview) {
        // The speed cabinet's paper sheet is a screen surface, while its
        // ridges remain moving paper cutouts below. Keep this pass in the
        // backdrop so the sky texture cannot scroll with the hills.
        drawPaperSurface(ctx, backgroundPaintCoverage(ctx),
          `speed-paper-sky:${paperPreset}`, paperPreset, paperStrengths.sky);
      }
      // chunky "pre-rendered" sun with gradient shading
      const celestialOffset = backgroundY(backgroundContext, 'celestial');
      // This is the speed-zone sun's one canonical placement. It belongs to
      // the celestial band, never the birds/cloud band, and the anchor is
      // clamped by the complete 80px visible envelope when the portrait band
      // has room for it. The layer offset is applied exactly once below.
      const sunLocalX = desertSunX(ctx, desert && portrait);
      const sunLocalY = sceneryBandPointY(backgroundContext, 'celestial', 60, DESERT_SUN_RADIUS)
        + (desert && portrait ? DESERT_SUN_PORTRAIT_OFFSET : 0);
      const sunY = sunLocalY + celestialOffset;
      ctx.save();
      ctx.translate(0, celestialOffset);
      const g = ctx.createRadialGradient(sunLocalX, sunLocalY, 6,
        sunLocalX, sunLocalY, 30);
      g.addColorStop(0, '#fff0c0'); g.addColorStop(1, 'rgba(248,192,96,0)');
      ctx.fillStyle = g; ctx.fillRect(sunLocalX - 40, sunLocalY - 40, 80, 80);
      ctx.restore();
      if (desert && paperPreview) {
        const pattern = sharedPaperPatternFor(ctx, paperPreset);
        if (pattern) {
          ctx.save();
          ctx.translate(0, celestialOffset);
          ctx.globalCompositeOperation = PAPER_TEXTURE_BLEND;
          ctx.globalAlpha = PAPER_GRAIN_ALPHA * paperStrengths.sky;
          ctx.fillStyle = pattern;
          ctx.beginPath();
          ctx.arc(sunLocalX, sunLocalY, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      // Draw order is depth order. The butte goes down BEFORE the far range so
      // those crests overlap its flanks and it sits behind them — the same
      // reason the volcano precedes plumber's hills. Overtime has no midpoint
      // (totalDist is Infinity), so it gets no landmark, exactly as plumber
      // gets no volcano there.
      if (desert && Number.isFinite(totalDist) && totalDist > 0) {
        ctx.save();
        ctx.translate(0, backSceneryOffset + backgroundY(backgroundContext, 'far'));
        drawButte(ctx, camX, totalDist * 0.55, farBaseY, paperPreview, paperPreset);
        ctx.restore();
      }
      // Mesas rather than rounded sine hills on the desert: a cut-off cap is
      // the one silhouette that can only be desert.
      ctx.save();
      ctx.translate(0, backSceneryOffset + backgroundY(backgroundContext, 'far'));
      if (desert) {
        // Paint distant infrastructure before the mesa. The mesa then naturally
        // covers each last foot pixel, so towers, dishes, and turbines are
        // embedded in the crest rather than ending on top of its outline.
        const horizonStage = backgroundContext?.stageIndex ?? scene?.stageIndex ?? 1;
        drawWaterTowers(ctx, camX, farBaseY, {
          paper: paperPreview, paperMaterial: paperPreset,
          portrait: !!backgroundContext?.portrait,
          stageIndex: horizonStage,
        });
        drawDesertLandmarkProps(ctx, camX, farBaseY, {
          portrait: !!backgroundContext?.portrait,
          stageIndex: horizonStage,
          skyOffset: backSceneryOffset + backgroundY(backgroundContext, 'far'),
          t,
        });
        drawWindTurbines(ctx, camX, farBaseY, {
          paper: paperPreview, paperMaterial: paperPreset,
          portrait,
          stageIndex: horizonStage,
          t,
        });
      }
      if (!desert && cab.id === 'surge') {
        drawSurgeScenery(ctx, camX, farBaseY, {
          amp: farAmp, wl: 110, factor: 0.12, mode: 'faux',
        });
      }
      parallaxHills(ctx, camX, cab.far, farBaseY,
        farAmp, desert ? DESERT_FAR.wl : 110,
        desert ? DESERT_FAR.factor : 0.12,
        desert ? {
          mesa: true,
          strata: DESERT_MESA_STRATA,
          paper: paperPreview,
          paperMaterial: paperPreset,
          paperStrength: paperStrengths.scenery,
        } : null);
      ctx.restore();
      // Birds after the far range and before the near one: they fly in front
      // of the distance and behind anything close.
      if (desert) {
        ctx.save();
        ctx.translate(0, backgroundY(backgroundContext, 'clouds'));
        drawVultures(ctx, t, camX, backgroundContext);
        ctx.restore();
      }
      if (desert) {
        // The middle range — the layer that makes the other two read as far
        // and near rather than as backdrop and foreground.
        // Campfire smoke goes BEHIND the middle range, not in front of it. The
        // hidden fire sits on the middle ground line, so the hills cut off the
        // base and each plume rises out of the country rather than standing on
        // top of it. The base is never visible, which keeps the fire implied.
        ctx.save();
        ctx.translate(0, backSceneryOffset + backgroundY(backgroundContext, 'middle'));
        drawCampfireSmoke(ctx, t, camX, middleBaseY);
        const m = DESERT_MID;
        drawTelegraphPoles(ctx, camX, middleBaseY, {
          paper: paperPreview, paperMaterial: paperPreset,
          portrait: !!backgroundContext?.portrait,
        });
        parallaxHills(ctx, camX, m.color, middleBaseY, m.amp, m.wl, m.factor,
          { dunes: true, surface: DESERT_MID_SURFACE,
            paper: paperPreview, paperMaterial: paperPreset,
            paperStrength: paperStrengths.scenery });
        ctx.restore();
        // The layer the cabinet always defined and this pack never drew.
        const { amp, wl, factor } = DESERT_RIDGE;
        ctx.save();
        ctx.translate(0, sceneryOffset + backgroundY(backgroundContext, 'near'));
        drawDesertNearSurfaceFeatures(ctx, camX, nearBaseY, {
          paper: paperPreview,
          paperMaterial: paperPreset,
          portrait: !!backgroundContext?.portrait,
        });
        // Cacti belong to this ridge, not to the surface of the frame. Draw
        // them first and let the ridge occlude the buried base; drawing them
        // after the filled hill made every trunk visibly sit on top of it.
        drawSaguaros(ctx, camX, nearBaseY, {
          paper: paperPreview,
          paperMaterial: paperPreset,
          portrait: !!backgroundContext?.portrait,
        });
        parallaxHills(ctx, camX, cab.hills, nearBaseY, amp, wl, factor,
          { dunes: true, paper: paperPreview, paperMaterial: paperPreset,
            paperStrength: paperStrengths.scenery });
        ctx.restore();
        // The stage's landmark and the desert's wildlife, after the near dunes (the
        // painters clip themselves behind every nearer crest) and before the roadside
        // signs, which stand in front of everything back here.
        drawDesertLife(ctx, t, camX, totalDist, backgroundContext?.stageIndex ?? scene?.stageIndex ?? 1, {
          far: (x) => ridgeYAt(x, camX, farBaseY, farAmp, DESERT_FAR.wl, DESERT_FAR.factor,
            { mesa: true, coverageLeft: backgroundPaintCoverage(ctx).left })
            + backSceneryOffset + backgroundY(backgroundContext, 'far'),
          mid: (x) => ridgeYAt(x, camX, middleBaseY, DESERT_MID.amp, DESERT_MID.wl, DESERT_MID.factor,
            { dunes: true, coverageLeft: backgroundPaintCoverage(ctx).left })
            + backSceneryOffset + backgroundY(backgroundContext, 'middle'),
          near: (x) => ridgeYAt(x, camX, nearBaseY, DESERT_RIDGE.amp, DESERT_RIDGE.wl, DESERT_RIDGE.factor,
            { dunes: true, coverageLeft: backgroundPaintCoverage(ctx).left })
            + sceneryOffset + backgroundY(backgroundContext, 'near'),
        // The jet's altitude: 104 in landscape; in portrait, up in the tall sky on the
        // layout's top cloud band (Peter, 24 Sep: "up relatively high in portrait").
        }, (portrait ? sceneryBandY(backgroundContext, 'upperCloud', 104) : 104)
          + backgroundY(backgroundContext, 'clouds'), backgroundContext?.heroId,
        Number.isFinite(backgroundContext?.heroFrac) ? backgroundContext.heroFrac : null, portrait,
        backgroundContext?.finish || null,
        Number.isFinite(backgroundContext?.finishPadT) ? backgroundContext.finishPadT : null);
        // Roadside signs are a very-near background plane: they sit above the
        // road shoulder, in front of the near dunes, but still behind every
        // gameplay actor and obstacle drawn after the background pass.
        drawSpeedLimitSigns(ctx, camX, GROUND_Y + 5 + sceneryOffset, {
          paper: paperPreview,
          paperMaterial: paperPreset,
          portrait: !!backgroundContext?.portrait,
          roadGaps: backgroundContext?.roadGaps,
          backgroundZoom: backgroundContext?.backgroundZoom,
          backgroundXOffset: backgroundContext?.backgroundXOffset,
          worldZoom: backgroundContext?.worldZoom,
          worldXOffset: backgroundContext?.worldXOffset,
          speedLimitValues,
          speedTrap: Number.isFinite(totalDist) && totalDist > 0
            && DESERT_LANDMARK_BY_STAGE[backgroundContext?.stageIndex ?? scene?.stageIndex ?? 1] === 'speedTrap',
        });
      }
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      // pseudo-3D checkered road
      // A HOLE IS DRAWN BY NOT DRAWING, here as everywhere else. This pack used
      // to lay the whole checkered road and then punch `#08060c` down every gap
      // in it — a colour belonging to nothing else on screen, and a lie besides:
      // looking down a hole should show you what is under it. So the road is
      // clipped to the solid runs instead, and what shows through the break is
      // the sky and the mesas the background painter already put there.
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      const runs = solidRuns(camX, obstacles, drawW);
      for (const [ra, rb] of runs) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ra, GROUND_Y, rb - ra, H - GROUND_Y);
        ctx.clip();
        ctx.fillStyle = cab.groundDark;
        ctx.fillRect(ra, GROUND_Y, rb - ra, H - GROUND_Y);
        for (let row = 0; row < 5; row++) {
          const y = GROUND_Y + row * 8;
          const size = 16 + row * 8;
          const off = (camX * (1 + row * 0.25)) % (size * 2);
          for (let x = -off; x < drawW; x += size * 2) {
            ctx.fillStyle = row % 2 === 0 ? cab.ground : cab.groundDark;
            ctx.fillRect(x, y, size, 8);
          }
        }
        // The lane's yellow edge stops at the lip with everything else. Run
        // across the break it is a tightrope drawn over a hole.
        ctx.fillStyle = '#f6d33c';
        ctx.fillRect(ra, GROUND_Y, rb - ra, 2);
        ctx.restore();
      }
      drawPitFills(ctx, camX, cab, obstacles, t, false, null, drawW, cab.groundDark);
    },
    post(ctx, t) {
      // soft vertical sheen, very "rendered in 1994"
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
  };
}

// ---------------------------------------------------------------- NEON city
//
// TERMINAL VELOCITY' BACKDROP IS A STACK, AND ON STAGE 1 IT ARRIVES.
//
// What this replaced was three layers: a 40-dot starfield at 0.05, ONE row of
// eight wireframe blocks at 0.25, and six flat rules on the horizon. Two of
// those barely moved, and one parallax layer is not parallax — it is a sheet
// the lane slides across. Six layers came out of the gallery bake-off (see
// git history for the four cities it was chosen from): stars, haze, a
// silhouette mass, two wireframe rows at different rates, and the smog that
// keeps the base of the city out of the player's way.
//
// THE FLYER BAND IS WHY THE SMOG EXISTS. Drones sit at world alt 13 and targets
// at 40, and the camera doubles world units on the way to the frame, so
// everything the player must read lives between screen y 130 and the groundline
// at 232 — exactly where a skyline's base wants to be. The veil is a gradient of
// the sky's own lower stop painted IN FRONT of the city: the towers keep their
// bright tops, the lane keeps a quiet field for a lit drone to be read against.
const NEON_CYAN = '#38d8f8';
const NEON_MAGENTA = '#e838f8';
const NEON_AMBER = '#f6d33c';
const NEON_LAMP = '#ff5a7a';
// A target's crown, in screen px. Bright ink below this line competes with the
// thing that is about to hit you.
//
// IT IS A RATIO OF TWO CAMERAS, not a constant and not the world zoom alone.
// A target sits at world alt 40 and is 11 tall, and the world is magnified by
// the run's ZOOM on the way to the frame — but this painter does not draw in
// world space, it draws in the BACKDROP's, which portrait scales by its own
// backgroundZoom about the same groundline. So the hazard's height in the
// coordinates this veil is painted in is the world zoom OVER the background
// zoom. In landscape that is ZOOM / 1, and on a phone 3.5 / 1.78 — which lands
// within a couple of pixels of the same place, and is the reason the first cut
// (a bare `51 * ZOOM`) covered nearly the whole portrait picture.
const NEON_TARGET_TOP_WORLD = 51;
function neonFlyerBandTop(context = null) {
  const world = Number(context?.worldZoom);
  const backdrop = Number(context?.backgroundZoom);
  const ratio = Number.isFinite(world) && world > 0 && Number.isFinite(backdrop) && backdrop > 0
    ? world / backdrop : ZOOM;
  return GROUND_Y - NEON_TARGET_TOP_WORLD * ratio;
}

// WHERE A ROW OF TOWERS SITS, AND HOW TALL IT IS — from the band the
// composition tuner owns (npm run composition), not from a number in here.
//
// Every scenery band is a normalised pair inside the scenery rectangle, and for
// a ridge (see sceneryRidgeBaseY) it is where the crest lives. A skyline is not
// a ridge: its buildings STAND ON THE LANE and vary in height, so the band is
// read as the row's ROOFLINE ENVELOPE — the tallest roof in the row touches the
// band's top, the shortest touches its bottom, and every foot stays on the
// groundline. Dragging a band's top therefore changes how tall that row is;
// dragging the pair moves the whole row's skyline up or down. Both of the
// tuner's handles mean something, which is the test of a good mapping.
//
// Landscape publishes no layout, so it gets the authored numbers untouched and
// this whole path is inert there — the same contract every other pack has.
function neonRowRoofs(context, bandName, minH, maxH) {
  const band = context?.sceneryLayout?.bands?.[bandName];
  if (!band || !Number.isFinite(Number(band.top)) || !Number.isFinite(Number(band.bottom))) {
    return { minH, maxH };
  }
  // A roof below the lane is not a building. Clamped rather than rejected so a
  // band dragged to the floor reads as a squat row instead of vanishing.
  const tall = Math.max(8, GROUND_Y - Number(band.top));
  const short = Math.max(6, Math.min(tall - 2, GROUND_Y - Number(band.bottom)));
  return { minH: short, maxH: tall };
}

// THE STARFIELD IS THREE BANDS NOW, one per depth layer, and they are the
// tuner's own UPPER / MIDDLE / LOWER CLOUD (Peter, 22 Sep). It used to take the
// whole scenery rectangle as a single field on the grounds that stars are a
// field rather than a composed element — which is true of one layer and false
// of three. The three drift at different rates and pulse on different clocks,
// so they were already reading as depth; giving each one a band is what lets
// that depth be COMPOSED, which on a tall phone is the difference between a
// sky with distance in it and a sky with an even sprinkle over all of it.
//
// A cabinet with no clouds in it is exactly where those three handles were
// going spare, and the tuner already draws and labels them.
//
// The celestial band is still the moon's — it is the one the tuner labels
// SUN / MOON, and sharing it would mean dragging the moon to move the stars.
const NEON_STAR_BANDS = Object.freeze(['upperCloud', 'middleCloud', 'lowerCloud']);
// Which band the comets ride. They are drawn with the stars because that is
// what one is — a star, leaving — so they take a star band rather than a
// fourth of their own.
const NEON_COMET_BAND = 'middleCloud';

/**
 * The band a star layer fills, in local px. `name` is a tuner band; with no
 * layout (landscape, the gallery, a poster) it falls back to the whole scenery
 * rectangle, which is what every layer used to get.
 */
function neonStarBandFor(context, name = null) {
  const rect = context?.sceneryLayout?.localRect;
  const named = name ? context?.sceneryLayout?.bands?.[name] : null;
  const src = (named && Number.isFinite(Number(named.top))
    && Number.isFinite(Number(named.bottom))) ? named : rect;
  const top = Number(src?.top);
  const bottom = Number(src?.bottom);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom - top < 24) return null;
  // Stop above the smog whatever the band says: a star inside the hazard band
  // is a star nobody sees and one more thing drawn under the veil. A band
  // dragged into it is clamped rather than dropped, so the handle still moves.
  return { top, bottom: Math.max(top + 24, Math.min(bottom, neonFlyerBandTop(context) - 10)) };
}

// Deterministic per-index noise. Every layer is generated rather than authored,
// so the city has to come back the same on every run — a replay, a retry and a
// checkpoint restore all have to show the same skyline.
function neonHash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// A NEON LINE IS TWO STROKES: a wide, faint one for the light the tube throws,
// and a thin bright one for the glass. Cheaper than a shadowBlur, and the same
// idea as the prop bloom — light around the art, not a halo on a box.
// The tubes' halo, scene-wide — off in neon-1's golden hour (see setGlowSprites).
let neonGlowScale = 1;
export function setNeonGlow(k) { neonGlowScale = Math.max(0, Math.min(1, Number(k) || 0)); }

function neonTube(ctx, color, width, glow, draw) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  glow *= neonGlowScale;
  if (glow > 0) {
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * glow;
    ctx.lineWidth = width * 4;
    ctx.beginPath(); draw(ctx); ctx.stroke();
    ctx.globalAlpha = a;
  }
  ctx.lineWidth = width;
  ctx.beginPath(); draw(ctx); ctx.stroke();
}

// TOKYO TOWER, on neon-2 and neon-3 (Peter, 24 Sep, from the Tokyo ideas bake-off). One
// landmark a level, pinned to a point in it the way the desert's butte is: it stands
// behind the far city, crosses the skyline slowly at a far layer's rate, and holds the
// picture for about half the stage. Drawn as the city's own tubes — orange-and-white
// lattice legs braced in X panels, the two observation decks lit, the antenna's lamp
// blinking — and its height comes from the far row's roofline so a portrait crane
// keeps it standing over that skyline.
const NEON_TOWER_AT = 0.5;          // where in the stage it is centred (fraction of totalDist)
const NEON_TOWER_FACTOR = 0.05;     // parallax, below the far mass's 0.07
const NEON_TOWER_ORANGE = '#ff6a3c';
const NEON_TOWER_WHITE = '#fff0e6';
function neonTokyoTower(ctx, t, camX, atCam, height, flare = 0) {
  const cx = viewCenterX(ctx) + (atCam - camX) * NEON_TOWER_FACTOR * ZOOM;
  const foot = height * 0.2;
  if (outsideView(ctx, cx, foot + 12)) return;
  const base = GROUND_Y;
  const top = base - height;
  const antenna = height * 0.2;
  const trunkTop = top + antenna;               // where the lattice ends and the mast begins
  const halfAt = (y) => {
    // Legs flare out toward the ground: a steep taper high up, splaying at the foot.
    const k = (base - y) / (base - trunkTop);   // 0 at the ground, 1 at the mast
    return 2 + (foot - 2) * Math.pow(1 - k, 2.2);
  };
  const deck1 = base - (base - trunkTop) * 0.42;
  const deck2 = base - (base - trunkTop) * 0.78;
  ctx.save();
  // The legs.
  neonTube(ctx, NEON_TOWER_ORANGE, 1.2, 0.3, (c) => {
    for (const side of [-1, 1]) {
      c.moveTo(cx + side * halfAt(base), base);
      for (let y = base; y >= trunkTop; y -= 4) c.lineTo(cx + side * halfAt(y), y);
      c.lineTo(cx + side * halfAt(trunkTop), trunkTop);
    }
  });
  // X-bracing between the legs, in panels that shorten as the tower narrows; the
  // panels alternate orange and white, as the real paint does in bands.
  const panels = [];
  for (let y = base, h = height * 0.075; y > trunkTop + 3; y -= h, h = Math.max(4, h * 0.9)) panels.push([y, Math.max(trunkTop, y - h)]);
  panels.forEach(([y0, y1], i) => {
    const color = Math.floor(i / 2) % 2 ? NEON_TOWER_WHITE : NEON_TOWER_ORANGE;
    neonTube(ctx, color, 0.6, 0.18, (c) => {
      const a = halfAt(y0), b = halfAt(y1);
      c.moveTo(cx - a, y0); c.lineTo(cx + b, y1);
      c.moveTo(cx + a, y0); c.lineTo(cx - b, y1);
      c.moveTo(cx - b, y1); c.lineTo(cx + b, y1);
    });
  });
  // The arch between the feet.
  neonTube(ctx, NEON_TOWER_ORANGE, 0.8, 0.2, (c) => {
    c.moveTo(cx - foot * 0.7, base); c.quadraticCurveTo(cx, base - foot * 0.9, cx + foot * 0.7, base);
  });
  // The two observation decks: a lit band of windows in a white frame.
  for (const [y, w, h] of [[deck1, halfAt(deck1) + 5, 6], [deck2, halfAt(deck2) + 3, 4]]) {
    ctx.fillStyle = 'rgba(20,16,40,0.9)';
    ctx.fillRect(cx - w, y - h, w * 2, h);
    ctx.fillStyle = '#ffd58a';
    for (let x = cx - w + 1.5; x < cx + w - 1.5; x += 2.5) ctx.fillRect(x, y - h + 1.5, 1.4, h - 3);
    neonTube(ctx, NEON_TOWER_WHITE, 0.7, 0.3, (c) => c.rect(cx - w, y - h, w * 2, h));
  }
  // The mast, in bands, and its lamp: a slow blink, bright on and a long dark.
  neonTube(ctx, NEON_TOWER_WHITE, 1, 0.25, (c) => { c.moveTo(cx, trunkTop); c.lineTo(cx, top); });
  for (let i = 0; i < 3; i++) {
    const y = trunkTop - (i + 0.5) * antenna / 3;
    neonTube(ctx, NEON_TOWER_ORANGE, 1.6, 0.15, (c) => { c.moveTo(cx, y - 2); c.lineTo(cx, y + 2); });
  }
  if ((t % 1.6) < 0.5) {
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath(); ctx.arc(cx, top, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha *= 0.35 * neonGlowScale;
    ctx.beginPath(); ctx.arc(cx, top, 4, 0, Math.PI * 2); ctx.fill();
  }
  // STRUCK (the storm bolt lands on its antenna when it is in view): the legs and the
  // mast run white-hot, dying back with the strokes. `flare` is the bolt's brightness.
  if (flare > 0) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    const frame = (c) => {
      for (const side of [-1, 1]) {
        c.moveTo(cx + side * halfAt(base), base);
        for (let y = base; y >= trunkTop; y -= 4) c.lineTo(cx + side * halfAt(y), y);
        c.lineTo(cx + side * halfAt(trunkTop), trunkTop);
      }
      c.moveTo(cx, trunkTop); c.lineTo(cx, top);
    };
    for (const [width, color, a] of [[6, '#8cf0ff', 0.3], [2.6, '#ffffff', 0.55], [1.1, '#ffffff', 1]]) {
      ctx.globalAlpha = a * flare;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath(); frame(ctx); ctx.stroke();
    }
  }
  ctx.restore();
}

function neonRectPath(x, y, w, h) {
  return (c) => c.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
}

// THE ROAD IS MOTION, NOT SURFACE — the answer the ground bake-off settled on.
//
// What was here before was one texture: parallel diagonals every 40 world px
// raking a constant -20. They never converged and never moved relative to each
// other, so the whole apron slid sideways as a single sheet — wallpaper, on the
// cabinet named after speed.
//
// NINETEEN WORLD PIXELS is why nothing more structural could replace it. The
// frame is 270 tall, the groundline is 232, and the lane is drawn through the
// run's camera — so the apron below the lit edge is 38 SCREEN px and, at the
// landscape zoom, about 19 WORLD px before it falls off the bottom. A
// vanishing-point floor, a perspective checker, a reflected skyline: none of
// them have the depth to be what they are. A grid drawn properly (fanning off a
// vanishing point, with transverse rungs) was tried and read as the same sheet
// with more lines in it.
//
// So the surface is gone and what crosses it is motion blur, at THREE RATES —
// the slowest a little faster than the lane, the fastest passing it outright.
// Length and brightness scale with rate, because that is how a streak says how
// fast it is going. There is no grid to notice, so there is nothing to notice
// repeating.
//
// Everything here is DIM. Drones sit at world alt 13 and targets at 40, and the
// one thing this road is allowed to spend brightness on is its 1px cyan edge —
// a bright apron would put light under the hazards the player has to read.
// RELATIVE TO THE LANE, which is the number that decides how frantic the road
// is — not the cabinet's speed, which the streaks inherit either way.
//
// The first cut was 1.35 / 2.1 / 3.2 and it was too much: at Neon's opening 208
// world px/s the fastest streak crossed at 666, and the apron read as a panic
// rather than as speed. It is worth knowing WHY that felt like such a jump. The
// diagonals it replaced sat at exactly 1.0 — they were part of the road surface
// and moved with it — so anything over 1 was new, and three times over 1 was a
// different cabinet.
//
// The slowest is under 1 on purpose. A streak the lane overtakes reads as
// further away, which is the only parallax this 19px strip can hold; the other
// two still pass, so the road keeps the thing the bake-off picked it for.
const NEON_STREAK_RATES = [0.85, 1.2, 1.75];
// One alpha per rate, paired with the line above, because the two dials that
// decide how loud this road is are speed and ink and they want to be nudged
// independently. Brightness rises with rate — a streak going faster is closer,
// and a road where the slow ones were as bright as the fast ones read as one
// flat sheet of dashes rather than three planes.
//
// These are DIM on purpose and they were dimmed again after the first cut.
// Drones sit at world alt 13 and targets at 40; the only thing this cabinet's
// road is allowed to spend real brightness on is its 1px cyan edge, and an
// apron that competes with the hazards is an apron the player has to look past.
const NEON_STREAK_ALPHA = [0.16, 0.30, 0.44];
// THE BAND IS A FIXED DEPTH, NOT THE WHOLE APRON, and portrait is why.
//
// Landscape's apron is the 19 world px the 2x camera leaves under the lane, and
// it is all road. Portrait's is not: the lane sits three quarters of the way
// down a 1041-tall frame, so its skirt is about 230 world px — twelve times as
// deep. Filling that is a wall of blur; every other layer in the cabinet is
// reading as one thing and the road is reading as twelve. So the streaks get
// the SAME DEPTH in both orientations and the rest of the portrait apron stays
// the slab's own black, which is what the road is over anyway: a viaduct with
// nothing under it.
//
// 19 = (270 - GROUND_Y) / ZOOM — the landscape frame, written out because H is
// presentation-dependent and is 1041 by the time portrait asks.
const NEON_STREAK_BAND = 19;
// World px SQUARED of band per streak. An area rather than a count or a pitch,
// so portrait — which shows barely half the runway at 3.5x — gets the same
// density over its narrower view instead of the same number of streaks.
const NEON_STREAK_AREA = 244;
// Where the band starts giving out, as a fraction of it. Without this the
// streaks would stop on a ruled line across the portrait apron, which is a
// harder edge than anything else the cabinet draws down there.
//
// It applies ONLY where the band is actually cut short. In landscape the band
// IS the whole visible apron, so there is no edge to hide and fading would just
// thin the road toward the bottom of the frame for nothing — so landscape fills
// to the last pixel and portrait gets the falloff.
const NEON_STREAK_FADE_FROM = 0.55;
// IN THE DAY the road is paint, not light (Peter, 24 Sep: "the ground markings pre
// transition should be different colours too... or perhaps they are not as animated
// yet"): warm white and gold dashes, at half the rate and dimmer, so the road is calm
// until the strike — and then it lights up magenta and cyan and gets its speed back.
const NEON_DAY_STREAK_INK = ['255,246,224', '255,236,200', '255,207,90'];
export function drawNeonSpeedStreaks(ctx, { camX = 0, viewW = W / ZOOM, zoom = ZOOM, day = false } = {}) {
  // The wrap span runs past the right edge so a streak enters from off-picture
  // rather than appearing at it.
  const span = Math.max(80, viewW) + 120;
  // How much of the apron the live camera actually shows. A streak seeded below
  // that line is a streak nobody sees, and it would quietly thin the road every
  // time the game zoomed in — so the band is clamped to it as well as to its
  // own depth.
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : ZOOM;
  const apron = (H - GROUND_Y) / z;
  const band = Math.max(6, Math.min(apron, NEON_STREAK_BAND));
  // Only a band that stops short of the apron has an edge worth hiding.
  const clipped = apron > NEON_STREAK_BAND + 0.5;
  const count = Math.max(9, Math.round((span * band) / NEON_STREAK_AREA));
  for (let r = 0; r < NEON_STREAK_RATES.length; r++) {
    const rate = NEON_STREAK_RATES[r] * (day ? 0.5 : 1);
    // The fastest rate is the magenta one: the thing overtaking you is the
    // thing that gets the second tube.
    const ink = day ? NEON_DAY_STREAK_INK[r] : (r === 2 ? '232,56,248' : '56,216,248');
    const alpha = NEON_STREAK_ALPHA[r] * (day ? 0.8 : 1);
    const len = 10 + r * 16;
    for (let i = r; i < count; i += NEON_STREAK_RATES.length) {
      const u = neonHash(i * 3 + 11);
      const y = GROUND_Y + 2 + u * (band - 3);
      const fade = !clipped || u <= NEON_STREAK_FADE_FROM
        ? 1
        : 1 - (u - NEON_STREAK_FADE_FROM) / (1 - NEON_STREAK_FADE_FROM);
      if (fade <= 0.02) continue;
      ctx.fillStyle = `rgba(${ink},${(alpha * fade).toFixed(3)})`;
      const x = span - ((camX * rate + neonHash(i) * span) % span);
      ctx.fillRect(x, Math.round(y), len + neonHash(i * 5) * 14, 1);
    }
  }
}

// Layer 1: THE SAME STARFIELD THE TITLE SCREEN HAS, which is a different thing
// from a scatter of one-pixel dots.
//
// drawRetainedTitleStars is the recipe: every star is a soft radial glow rather
// than a rect, sizes and colour temperatures vary (warm, cool and neutral
// cores), the brightest one in thirteen gets a cross flare, and the field is
// split into LAYERS that each breathe on their own slow clock. That is what
// makes the title's sky look deep instead of speckled.
//
// It is also why the title BAKES it: ninety radial gradients a frame is not a
// thing a runner can pay for. So each layer is drawn once into a retained
// canvas and blitted twice per frame at a wrap offset, which gives the field
// something the title's cannot have — its own parallax. Three layers at three
// rates, and the stars behind the city move slower than the stars in front of
// it.
const NEON_STAR_LAYERS = 3;
const NEON_STAR_COUNT = 96;
const neonStarSheets = [];

// BAKED ONCE, AT A CANONICAL SIZE. The height this is asked for comes from the
// scenery rectangle, and a rectangle is allowed to move — a resize, an
// orientation change, a tuner drag. Keying the bake on the exact height means a
// pixel of movement rebuilds ninety radial gradients inside a frame, which is a
// stutter you would feel and never find. So the sheet is baked at one height
// and the blit scales it: drawImage is doing that work anyway.
const NEON_STAR_SHEET_H = 160;

function neonStarSheet(layer, w, h, ss) {
  const slot = neonStarSheets[layer] || (neonStarSheets[layer] = {});
  const key = `${w}|${h}|${ss}`;
  if (slot.key === key) return slot;
  if (!slot.canvas || slot.w !== w || slot.h !== h || slot.ss !== ss) {
    slot.canvas = document.createElement('canvas');
    slot.canvas.width = Math.max(1, Math.round(w * ss));
    slot.canvas.height = Math.max(1, Math.round(h * ss));
    slot.ctx = slot.canvas.getContext('2d');
    slot.w = w;
    slot.h = h;
    slot.ss = ss;
  }
  const x = slot.ctx;
  if (!x) return slot;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
  x.setTransform(ss, 0, 0, ss, 0, 0);
  for (let i = layer; i < NEON_STAR_COUNT; i += NEON_STAR_LAYERS) {
    const sx = 2 + neonHash(i * 3 + 7) * (w - 4);
    const sy = 2 + neonHash(i * 5 + 19) * (h - 4);
    const bright = i % 13 === 0;
    const radius = bright
      ? 1.05 + neonHash(i + 7) * 0.65
      : 0.35 + neonHash(i + 11) * 0.55;
    const spread = radius * (bright ? 4.1 : 3.0);
    // Temperature, not hue. Saturated cores were tried first — the cabinet's own
    // magenta on one star in nine — and a bright magenta point at this size
    // reads as a planet, or worse as something collectable, sitting beside the
    // moon. A star is white with a lean in it.
    const warm = i % 9 === 0;
    const cool = i % 5 === 0;
    const core = warm ? '236,206,255' : cool ? '196,228,255' : '226,232,255';
    const star = x.createRadialGradient(sx, sy, 0, sx, sy, spread);
    star.addColorStop(0, `rgba(${core},0.98)`);
    star.addColorStop(0.22, `rgba(${core},0.72)`);
    star.addColorStop(1, `rgba(${core},0)`);
    x.fillStyle = star;
    x.fillRect(sx - spread, sy - spread, spread * 2, spread * 2);
    if (bright) {
      x.fillStyle = `rgba(${core},0.66)`;
      x.fillRect(sx - radius * 2.8, sy - 0.18, radius * 5.6, 0.36);
      x.fillRect(sx - 0.18, sy - radius * 2.8, 0.36, radius * 5.6);
    }
  }
  slot.key = key;
  return slot;
}

function neonStarfield(ctx, shift, t, { top = 4, bottom = 150, context = null } = {}) {
  const band = backgroundPaintBand(ctx);
  const lo = Number.isFinite(band.top) ? Math.min(top, band.top + 4) : top;
  const hi = Number.isFinite(band.bottom) ? Math.max(bottom, Math.min(band.bottom, GROUND_Y - 82)) : bottom;
  // One frame wide. At the slowest layer's rate that is a repeat every sixteen
  // thousand world px — about one per level, and never in view twice.
  const sheetW = W;
  const ss = 2;
  for (let layer = 0; layer < NEON_STAR_LAYERS; layer++) {
    const slot = neonStarSheet(layer, sheetW, NEON_STAR_SHEET_H, ss);
    if (!slot.canvas) continue;
    // An authored band wins over the visible sky — the tuner owns where this
    // layer sits. With no layout every layer resolves to the same rectangle,
    // which is exactly the single field this used to be.
    const authored = neonStarBandFor(context, NEON_STAR_BANDS[layer]);
    const from = authored ? authored.top : lo;
    const to = authored ? authored.bottom : hi;
    const h = Math.max(24, to - from);
    // Each layer at its own rate, so the field has depth of its own rather
    // than sliding as one sheet. SLOW: stars are the furthest thing in the
    // picture and the eye reads distance as stillness — at the first rates the
    // field drifted like a near layer and gave the sky a current.
    const rate = 0.5 + layer * 0.3;
    const off = ((shift * rate) % sheetW + sheetW) % sheetW;
    // The breath, straight off the title: three clocks, none of them in step.
    const pulse = 0.76 + Math.sin(t * (0.55 + layer * 0.17) + layer * 2.1) * 0.14;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.imageSmoothingEnabled = true;
    // TWO BLITS, never more. Starting a sheet-width to the left of the view put
    // a whole extra copy off screen on every layer — nine large alpha blits a
    // frame instead of six, for nothing.
    const cov = backgroundPaintCoverage(ctx);
    // NOT ROUNDED. The sheet is baked at twice the frame's density, so a
    // fractional x resamples into a smooth slide; rounded, a field this slow
    // sits still for several frames and then jumps a whole pixel, which is the
    // one motion artefact a starfield cannot afford.
    for (let x = cov.left - off; x < cov.right; x += sheetW) {
      ctx.drawImage(slot.canvas, x, from, sheetW, h);
    }
    ctx.restore();
  }
}

// A COMET, THREE TIMES A LEVEL, and it is on the ODOMETER rather than on the
// clock. Authored against progress, a crossing happens at the same place in the
// level on every run — three per stage whatever the speed tier, whatever the
// hero, and identical on a replay. Authored against time it would be three per
// stage only for a player who runs it in the expected minute, and none at all
// for anyone who dies twice on the way.
//
// They are placed off the phrase boundaries on purpose: a comet arriving on the
// same beat as a checkpoint reads as a reward for the checkpoint.
const NEON_COMET_AT = [0.19, 0.52, 0.81];
// How much of the level one crossing occupies. At Neon's opening speed the
// stage is about ninety seconds, so this is a little under five seconds in the
// sky — long enough to be seen by someone watching the lane, short enough that
// it is gone before it becomes scenery.
const NEON_COMET_SPAN = 0.052;

/**
 * The comet in flight at this progress, or null. `u` runs 0..1 across the
 * crossing. Exported for the gallery sheet and tests/neon-city-arrival.js: how
 * many there are and where they fall is a thing to hold still.
 */
export function neonCometAt(progress) {
  const p = Number(progress);
  if (!Number.isFinite(p)) return null;
  for (let i = 0; i < NEON_COMET_AT.length; i++) {
    const u = (p - NEON_COMET_AT[i]) / NEON_COMET_SPAN;
    if (u >= 0 && u <= 1) return { index: i, u };
  }
  return null;
}

function neonComet(ctx, context) {
  const flight = neonCometAt(context?.progress);
  if (!flight) return;
  const { index, u } = flight;
  const cov = backgroundPaintCoverage(ctx);
  const band = neonStarBandFor(context, NEON_COMET_BAND);
  const top = band ? band.top + 6 : 10;
  const bottom = band ? Math.min(band.bottom, top + 96) : 104;
  // Right to left and downward: the lane travels right, so a comet crossing
  // against it reads as something moving of its own accord rather than as one
  // more thing the camera is passing.
  const y0 = top + neonHash(index * 7 + 2) * (bottom - top) * 0.45;
  const y1 = y0 + 26 + neonHash(index * 11 + 5) * 38;
  const x0 = cov.right + 40;
  const x1 = cov.left - 40;
  // Eased so it arrives already travelling and leaves still travelling; a comet
  // that accelerates from rest at the edge of the picture is a rocket.
  const x = x0 + (x1 - x0) * u;
  const y = y0 + (y1 - y0) * u;
  // In and out at the ends of the crossing. Nothing in this sky is allowed to
  // pop, least of all the only thing in it that moves on its own.
  const fade = Math.min(1, Math.min(u, 1 - u) / 0.14);
  if (fade <= 0) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tail = 74 + neonHash(index * 3 + 1) * 40;
  ctx.save();
  ctx.globalAlpha = fade;
  // The tail, as a tapering wedge behind the head — a stroke cannot taper, and
  // a tail of even width is a scratch on the glass.
  const tx = x - ux * tail;
  const ty = y - uy * tail;
  const half = 2.1;
  ctx.beginPath();
  ctx.moveTo(x + uy * half, y - ux * half);
  ctx.lineTo(x - uy * half, y + ux * half);
  ctx.lineTo(tx, ty);
  ctx.closePath();
  const trail = ctx.createLinearGradient(x, y, tx, ty);
  trail.addColorStop(0, 'rgba(226,240,255,0.85)');
  trail.addColorStop(0.35, 'rgba(160,210,255,0.35)');
  trail.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = trail;
  ctx.fill();
  // The head: a small bloom and a hard core, so it survives the phone resample
  // as something rather than as a smudge.
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
  glow.addColorStop(0, 'rgba(236,246,255,0.95)');
  glow.addColorStop(0.35, 'rgba(160,210,255,0.42)');
  glow.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 10, y - 10, 20, 20);
  ctx.fillStyle = '#eef6ff';
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  ctx.restore();
}

// Layer 2. The glow the city throws up into its own smog. Anchored rather than
// scrolled: haze has no parallax, and giving it some is what makes a backdrop
// feel painted on a moving wall.
function neonHorizonHaze(ctx, { color = NEON_MAGENTA, height = 84, alpha = 0.18 } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const g = ctx.createLinearGradient(0, GROUND_Y - height, 0, GROUND_Y);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cov.left, GROUND_Y - height, cov.width, height);
  ctx.globalAlpha = 1;
}

// Layer 3. Filled blocks, no linework: the back of the city is a mass, and the
// eye reads mass before it reads edges. One lit rule along each roof is all the
// neon it gets — that far away the tubes have merged.
function neonFarMass(ctx, shift, {
  seed = 2, span = 38, count = 20, minH = 46, maxH = 92, wMin = 14, wMax = 30,
  fill = '#221862', crown = NEON_CYAN, crownAlpha = 0.4, alpha = 1,
} = {}) {
  for (let i = 0; i < count; i++) {
    const r = neonHash(seed + i);
    const x = wrapIntoView(ctx, i * span - shift, 70);
    const w = wMin + neonHash(seed + i + 41) * (wMax - wMin);
    const h = minH + r * (maxH - minH);
    const top = GROUND_Y - h;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    // DOWN TO THE FRAME BOTTOM, not to GROUND_Y. Everywhere but a hole this
    // extra band is under the road and costs nothing; in a hole it is the
    // difference between seeing the city through the break and seeing a flat
    // edge at exactly road height, which reads as more ground.
    ctx.fillRect(Math.round(x), Math.round(top), Math.round(w), H - Math.round(top));
    ctx.globalAlpha = alpha * crownAlpha;
    ctx.fillStyle = crown;
    ctx.fillRect(Math.round(x), Math.round(top), Math.round(w), 1);
  }
  ctx.globalAlpha = 1;
}

// Layers 4 and 5. A wireframe block with a window lattice and, on the tall ones,
// a mast with an aviation lamp. The lattice is the point: it is what turns a row
// of rectangles into a city. Two rows of these at 0.15 and 0.3 are the depth.
// The two wire rows' layout, shared by the painter below and neonWireTowers, so a
// storm bolt aimed at a tower and the tower the pack paints are the same building.
const NEON_WIRE_ROWS = {
  middle: { factor: 0.15, seed: 7, span: 74, count: 9, w: 26, roofs: [58, 112] },
  near: { factor: 0.3, seed: 23, span: 132, count: 7, w: 42, roofs: [84, 158] },
};
/**
 * Where a wire row's towers stand right now, in background px (the row's parallax
 * offset included): each tower's box, whether it carries a mast, and its tip — the
 * mast's lamp, or the roof. `i` and `block` name a building for as long as it is on
 * screen (see neonWireRow). Asked by the storm bolt's spire bake-off.
 */
export function neonWireTowers(ctx, camX, context, rowName = 'middle') {
  const row = NEON_WIRE_ROWS[rowName];
  const { minH, maxH } = neonRowRoofs(context, rowName, row.roofs[0], row.roofs[1]);
  const shift = camX * row.factor * ZOOM;
  const period = backgroundPaintCoverage(ctx).width + 90 * 2;
  const dy = backgroundY(context, rowName);
  const lower = rowName === 'near' ? context?.neonLowTower : null;
  const out = [];
  for (let i = 0; i < row.count; i++) {
    const raw = i * row.span - shift;
    const x = Math.round(wrapIntoView(ctx, raw, 90));
    const bw = Math.round(row.w * (0.7 + neonHash(row.seed + i + 17) * 0.6));
    const h = lower && lower.i === i && lower.block === Math.floor(raw / period)
      ? lower.h : minH + neonHash(row.seed + i) * (maxH - minH);
    const top = Math.round(GROUND_Y - h) + dy;
    const mast = h > maxH * 0.78;
    out.push({
      i, block: Math.floor(raw / period), x, bw, top, mast, ink: i % 2 ? NEON_CYAN : NEON_MAGENTA,
      tipX: x + bw / 2, tipY: mast ? top - 14 : top,
    });
  }
  return out;
}

function neonWireRow(ctx, shift, t, {
  seed = 7, span = 78, count = 10, minH = 60, maxH = 132, w = 34,
  stroke = 1, glow = 0.14, alpha = 1, windows = true, masts = true,
  inkA = NEON_MAGENTA, inkB = NEON_CYAN, lit = NEON_AMBER, lamp = NEON_LAMP,
  onTower = null, lower = null,
} = {}) {
  if (alpha <= 0) return;
  // The row repeats every `period` of shift; which repeat a tower is in is what makes
  // it a particular building along the street rather than tower i of every block —
  // see neonBladeSigns, which hangs a sign on one building in every other repeat.
  const period = backgroundPaintCoverage(ctx).width + 90 * 2;
  for (let i = 0; i < count; i++) {
    const r = neonHash(seed + i);
    const raw = i * span - shift;
    const x = Math.round(wrapIntoView(ctx, raw, 90));
    const bw = Math.round(w * (0.7 + neonHash(seed + i + 17) * 0.6));
    // `lower` stands one building of the row lower than its hash says: the storm
    // bolt's sign building in bake-off L, so the strike has sky to fall through.
    const h = lower && lower.i === i && lower.block === Math.floor(raw / period)
      ? lower.h : minH + r * (maxH - minH);
    const top = Math.round(GROUND_Y - h);
    const ink = i % 2 ? inkB : inkA;
    ctx.globalAlpha = alpha;
    // See neonFarMass: the tower is drawn to the bottom of the frame so a pit
    // shows its body rather than its footing. `h` stays the ABOVE-ROAD height,
    // because that is what the mast test and the tuner bands are about.
    neonTube(ctx, ink, stroke, glow, neonRectPath(x, top, bw, H - top));
    // Floor plates. Spaced by the building rather than by a constant, so a row
    // of towers does not band together into one horizontal stripe.
    const step = 7 + Math.round(neonHash(seed + i + 5) * 5);
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = top + step; y < H - 2; y += step) {
      ctx.moveTo(x + 0.5, y + 0.5);
      ctx.lineTo(x + bw + 0.5, y + 0.5);
    }
    ctx.stroke();
    if (windows) {
      // Lit cells on their own slow clock. A window that never changes is a
      // texture; one that changes every frame is a fault.
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = lit;
      for (let k = 0; k < 7; k++) {
        const wr = neonHash(seed * 3 + i * 13 + k);
        if (wr > 0.55) continue;
        if (Math.sin(t * 0.55 + wr * 90 + i) <= -0.2) continue;
        const wy = top + step + Math.floor(wr * 9) * step;
        if (wy > H - 6) continue;
        ctx.fillRect(x + 3 + Math.floor(neonHash(i * 7 + k) * (bw - 7)), wy + 2, 2, 2);
      }
    }
    if (masts && h > maxH * 0.78) {
      ctx.globalAlpha = alpha;
      neonTube(ctx, ink, stroke, glow * 0.6, (c) => {
        c.moveTo(x + bw / 2 + 0.5, top + 0.5);
        c.lineTo(x + bw / 2 + 0.5, top - 12.5);
      });
      ctx.globalAlpha = alpha * (Math.sin(t * 2.2 + i) > 0 ? 1 : 0.2);
      ctx.fillStyle = lamp;
      ctx.fillRect(x + bw / 2 - 1, top - 15, 2, 2);
    }
    if (onTower) {
      ctx.globalAlpha = 1;
      onTower({ x, top, bw, i, block: Math.floor(raw / period), ink });
    }
  }
  ctx.globalAlpha = 1;
}

// BLADE SIGNS, hung off SOME of the near towers (Peter, 23 Sep: "on SOME buildings
// (not all though) and no more than one on screen at a time ideally... spread them
// right out"). One building in every SECOND repeat of the row carries one. A repeat is
// the whole painted width plus its margins, so two signs are always more than a full
// screen apart — in portrait too, whose repeat is its own narrower width.
//
// Scenery only: it sits behind the smog veil with the city and asks nothing of the
// player. The words rotate — いそげ (hurry), しぶや (Shibuya), がんばれ (you can do
// it), やまのて (Yamanote) — by which block it is. `lit` below 1 is the golden hour:
// signs are on in the day but their tubes are pale against the sun.
//
// THE BACK ROW carries them too, smaller and dimmer, saying what a street's shop signs
// say — see NEON_BACK_SIGN_WORDS. AT MOST ONE OF EACH ON SCREEN (Peter, 24 Sep: "one
// front and one back at any given point... don't want 3 at once"): each row hangs its
// sign on the SAME building in every repeat of the row, so two signs in one row are
// always exactly one repeat apart — and a repeat is the whole painted width plus its
// margins, wider than any screen. Every repeat, rather than every other, so there is
// nearly always one of each in view; only the word changes from one to the next.
function neonBladeSigns(ctx, {
  lit = 1, words = NEON_SIGN_WORDS, scale = 1, dim = 1, tower = 3, blown = null, stood = null,
  faulty = null, t = 0,
} = {}) {
  const cov = backgroundCoverage(ctx);
  return ({ x, top, bw, i, block, ink }) => {
    if (i !== tower) return;
    // THE STRUCK TOWER CARRIES THE STREET'S SIGN while it is about (`stood`), so the
    // row's own stays dark then — at most one front sign on screen. Decided while a
    // sign is out of the picture and held while it is in, so none ever blinks out.
    if (stood !== null) {
      const inView = x + bw + 30 > cov.left && x < cov.right;
      if (!inView) neonSignStoodDown.set(block, !!stood);
      else if (!neonSignStoodDown.has(block)) neonSignStoodDown.set(block, false);
      if (neonSignStoodDown.size > 64) neonSignStoodDown.clear();
      if (neonSignStoodDown.get(block)) return;
    }
    const word = words[((block % words.length) + words.length) % words.length];
    const phase = blown && blown.block === block ? neonSignBlowout(blown.s, block)
      : block === faulty ? neonSignFlicker(t, block) : null;
    neonPaintBladeSign(ctx, { x, top, bw, ink, word, lit, dim, scale, phase });
  };
}
const neonSignStoodDown = new Map();
// THE FAULTY TUBE (Peter, 25 Sep 2026: "could the occasional building sign flicker?
// rare - one per level perhaps"). One front sign a stage — the one on the street when
// the camera is NEON_FAULTY_AT of the way in, which is hashed per stage — has a tube on
// its way out: lit, and every couple of seconds, not every time, it stutters to dark
// glass for half a second and catches again.
function neonFaultySignBlock(ctx, context, totalDist) {
  if (!Number.isFinite(totalDist) || totalDist <= 0) return null;
  const at = 0.3 + 0.4 * neonHash((context?.stageIndex ?? 1) * 7 + 3);
  const tw = neonWireTowers(ctx, totalDist * at, context, 'near').find((w) => w.i === 3);
  return tw ? tw.block : null;
}
function neonSignFlicker(t, block) {
  const w = Math.floor(t / 2.2);
  if (neonHash(block * 13 + w) > 0.6) return null;
  if (t - w * 2.2 > 0.55) return null;
  return { lit: neonHash(block * 29 + Math.floor(t * 16)) > 0.5 ? 0.85 : 0.06, over: 0 };
}
// One blade sign off a tower's right shoulder, a little down from the roof, on a
// bracket — lit, or part-way through blowing out (`phase`, neonSignBlowout).
function neonPaintBladeSign(ctx, { x, top, bw, ink, word, lit = 1, dim = 1, scale = 1, phase = null }) {
  const sign = neonBladeSign(word, ink);
  if (!sign) return;
  const sx = x + bw + 3 * scale;
  const sy = top + 10 * scale;
  const pad = sign.pad * scale;
  const paint = (canvas, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, sx - pad, sy - pad, sign.w * scale, sign.h * scale);
  };
  ctx.globalAlpha = lit * dim;
  ctx.fillStyle = ink;
  ctx.fillRect(x + bw, sy + 4 * scale, 3 * scale, 1);
  // THE SIGN BLOWS OUT: this building took the strike. It overloads white-hot,
  // stutters, and dies — and stays dead while it scrolls away.
  if (!phase) paint(sign.canvas, lit * dim);
  else {
    const dead = neonBladeSign(word, ink, { dead: true });
    if (dead) paint(dead.canvas, dim);
    if (phase.lit > 0) paint(sign.canvas, phase.lit * lit * dim);
    if (phase.over > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      paint(sign.canvas, phase.over);
      paint(sign.canvas, phase.over);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

// THE STRUCK TOWER (storm-bolt bake-off L, SHIPPED 25 Sep 2026). Peter: "Should the
// lightning be striking the ground or something? It just seems like it's overlaid",
// "What if we struck a larger building with a sign and the sign could blow out", "Might
// it work a bit better if the building was lower?" — then "We can also do 1 and 2 just
// in case… there is a second lighting strike later". Ahead of each strike the run PLACES
// a low sign tower in the near row (context.neonStruck: its layer position L, planned
// while it is out of the picture so that it arrives mid-picture on the strike beat, then
// held), the bolt lands on its roof, and its sign blows (neonSignBlowout, from
// `since`, the seconds since the strike began). The run's fallbacks, when it is not in
// view: the Tokyo Tower, then the nearest middle-row mast (neonPickMast).
const NEON_STRUCK_HEIGHT = 0.22;   // of the near row's roof range: 100 px of landscape's 84..158
const NEON_STRUCK_W = 40;
export const neonStruckX = (L, camX) => Math.round(L - camX * NEON_WIRE_ROWS.near.factor * ZOOM);
/**
 * The L that puts the struck tower's roof `frac` of the way across the picture with the
 * camera at camX. Right of centre, because it keeps scrolling left for the whole strike.
 */
export function neonStruckPlanL(ctx, camX, frac = 0.5) {
  const c = backgroundCoverage(ctx);
  return c.left + c.width * frac - NEON_STRUCK_W / 2 + camX * NEON_WIRE_ROWS.near.factor * ZOOM;
}
export function neonStruckTower(ctx, camX, context) {
  const st = context?.neonStruck;
  if (!st || !Number.isFinite(st.L)) return null;
  const row = NEON_WIRE_ROWS.near;
  const { minH, maxH } = neonRowRoofs(context, 'near', row.roofs[0], row.roofs[1]);
  const h = minH + NEON_STRUCK_HEIGHT * (maxH - minH);
  const x = neonStruckX(st.L, camX);
  const top = Math.round(GROUND_Y - h) + backgroundY(context, 'near');
  const cov = backgroundCoverage(ctx);
  return {
    x, top, bw: NEON_STRUCK_W, mast: false, ink: NEON_CYAN, tipX: x + NEON_STRUCK_W / 2, tipY: top,
    word: NEON_SIGN_WORDS[(st.n || 0) % NEON_SIGN_WORDS.length], since: st.since,
    inView: x + NEON_STRUCK_W > cov.left + 8 && x < cov.right - 8,
  };
}
function drawNeonStruckTower(ctx, t, tw, { alpha = 1, lit = 1, ink = tw.ink } = {}) {
  if (alpha <= 0 || outsideView(ctx, tw.x + tw.bw / 2, tw.bw + 40)) return;
  ctx.globalAlpha = alpha;
  neonTube(ctx, ink, 1.2, 0.18, neonRectPath(tw.x, tw.top, tw.bw, H - tw.top));
  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = tw.top + 9; y < H - 2; y += 9) { ctx.moveTo(tw.x + 0.5, y + 0.5); ctx.lineTo(tw.x + tw.bw + 0.5, y + 0.5); }
  ctx.stroke();
  const phase = tw.since != null ? neonSignBlowout(tw.since, 7) : null;
  neonPaintBladeSign(ctx, { x: tw.x, top: tw.top, bw: tw.bw, ink, word: tw.word, lit, dim: alpha, phase });
  ctx.globalAlpha = 1;
}
/** The middle-row mast nearest x (else the nearest roof), named so it can be followed. */
export function neonPickMast(ctx, camX, context, x) {
  // Not a row that has not arrived yet (neon-1's city assembles; neonCityReveal).
  if (neonCityReveal(context?.stageIndex ?? 1, context?.progress).midWire < 0.6) return null;
  const towers = neonWireTowers(ctx, camX, context, 'middle');
  const masts = towers.filter((t) => t.mast && Math.abs(t.tipX - x) < 130);
  const pool = masts.length ? masts : towers;
  let best = pool[0];
  for (const t of pool) if (Math.abs(t.tipX - x) < Math.abs(best.tipX - x)) best = t;
  return best ? { i: best.i, block: best.block } : null;
}
export function neonTowerNow(ctx, camX, context, pick) {
  if (!pick) return null;
  const towers = neonWireTowers(ctx, camX, context, 'middle');
  return towers.find((t) => t.i === pick.i && t.block === pick.block) || towers.find((t) => t.i === pick.i) || null;
}
/**
 * The Tokyo Tower's antenna tip in background px, and whether it is in the picture —
 * on neon-2 and -3 the storm strikes it when it is (Peter, 25 Sep: "If Tokyo tower is
 * on screen can we strike it?"). Null where there is no tower.
 */
export function neonTokyoTowerTip(ctx, camX, context, totalDist) {
  if ((context?.stageIndex ?? 1) < 2 || !Number.isFinite(totalDist) || totalDist <= 0) return null;
  const farRoofs = neonRowRoofs(context, 'farLandmark', 46, 92);
  const height = farRoofs.maxH * 1.9;
  const cx = viewCenterX(ctx) + (totalDist * NEON_TOWER_AT - camX) * NEON_TOWER_FACTOR * ZOOM;
  const cov = backgroundCoverage(ctx);
  return {
    tipX: cx, tipY: GROUND_Y - height + backgroundY(context, 'far'),
    inView: cx > cov.left + 24 && cx < cov.right - 24,
  };
}
// How lit a blown sign is at `s` seconds into the strike: whole until the bolt lands,
// an overload flash, a stutter that dies, then dark with the odd weak buzz.
function neonSignBlowout(s, block) {
  if (s < 0.16) return null;
  if (s < 0.34) return { lit: 1, over: 1 - (s - 0.16) / 0.18 * 0.4 };
  const q = Math.floor(s * 18);
  const coin = neonHash(block * 31 + q);
  if (s < 1.3) {
    const odds = 0.75 * (1 - (s - 0.34) / 0.96);
    return { lit: coin < odds ? 0.35 + 0.65 * odds : 0, over: 0 };
  }
  return { lit: coin < 0.03 ? 0.25 : 0, over: 0 };
}

// Layer 6. The smog, in front of the city and behind everything the player
// plays with. See the header: this is what buys the hazard band back.
function neonBandVeil(ctx, cab, { alpha = 0.72, top = null, context = null, tint = null } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const from = Number.isFinite(top) ? top : neonFlyerBandTop(context) - 24;
  tint = tint || (cab && cab.sky ? cab.sky[1] : '#1a1048');
  // The gradient is keyed to GROUND_Y — that is where the smog is thickest —
  // but it is PAINTED to the bottom of the frame, holding its final colour.
  // Stopping it at the road put a brightness step across every hole at exactly
  // road height, which is the one horizontal a pit must not have.
  const g = ctx.createLinearGradient(0, from, 0, GROUND_Y);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, tint);
  g.addColorStop(1, tint);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cov.left, from, cov.width, H - from);
  ctx.globalAlpha = 1;
}

// THE MOON, top right, and it is a SIGN rather than an astronomical body.
//
// Everything else back here is drawn in tube, so a photographic moon would be
// the one object in the cabinet that came from a different world. This is a
// crescent of glass with the city's own light in it: a faint disc for the dark
// limb, a bright tube crescent, and a bloom.
//
// IT DOES NOT WRAP AND IT DOES NOT SCROLL, and the two go together. A moon
// that came round again every few seconds would be a lamp on a conveyor, so it
// does not wrap — and the moment it does not wrap, any parallax factor at all
// walks it off the side of the picture and never brings it back. The first cut
// gave it 0.012 "so it is not welded to the glass"; a third of the way into
// Neon 1 the moon had left the frame. Celestial depth is 0 for exactly this
// reason, which is also what the desert sun does.
//
// Its band is the one the tuner labels SUN / MOON, so its height on a phone is
// authored rather than hardcoded.
const NEON_MOON_RADIUS = 10;
// How far in from the right edge of the PICTURE, not of the authored frame:
// portrait shifts the backdrop sideways, and a moon inset from x=480 would
// sit a long way inside the corner it is supposed to own.
// Both numbers are set by the HUD, not by taste: the bonus pill owns the top
// right corner of the frame, and a moon tucked into the corner proper sits
// behind it with its halo washing the text. It hangs just clear, below and
// inboard of the pill.
const NEON_MOON_X_INSET = 58;
const NEON_MOON_LANDSCAPE_Y = 48;

function neonMoonCenter(ctx, context) {
  // backgroundCoverage, NOT backgroundPaintCoverage: the paint coverage is
  // padded by the lookahead so tiling painters draw past both edges, and an
  // object inset from THAT edge hangs off the side of the picture. The desert
  // sun anchors off the same unpadded interval, for the same reason.
  const cov = backgroundCoverage(ctx);
  return {
    x: cov.right - NEON_MOON_X_INSET,
    // The band is where the moon may sit; the point helper keeps the whole
    // disc inside it rather than centring a 42px object on a 20px band.
    y: sceneryBandPointY(context, 'celestial', NEON_MOON_LANDSCAPE_Y, NEON_MOON_RADIUS + 4),
  };
}

// A PHASE IS ONE NUMBER, and the shape falls out of it.
//
// The lit face of a moon is bounded by two curves: the limb — a semicircle,
// always — and the terminator, which is the day/night line seen at an angle,
// and therefore an ELLIPSE with the same height as the moon and a width that
// depends on where the sun is. That width, signed, IS the phase: at -1 the
// ellipse hugs the right limb and nothing is lit; at 0 it is a straight line
// and exactly half is; at +1 it is the left limb and the moon is full.
//
// This replaced a crescent built from two circular arcs. Two circles can draw
// one crescent, and the first cut drew a good one, but they cannot walk it to
// full — the second circle has to leave the disc for that, and the shape comes
// apart on the way. An ellipse does the whole lunation with one parameter.
const NEON_MOON_NEW = -0.62;   // the crescent Neon 1 opens on

function neonMoonLit(cx, cy, r, k) {
  const wide = Math.abs(k) * r;
  return (c) => {
    // The lit limb: the right half of the disc, always.
    c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    // The terminator, back to the top horn. Which WAY it bulges is the whole
    // phase: right of centre while the moon is a crescent, left of it once it
    // is past half. Canvas sweeps from PI/2 to -PI/2 through PI unless told
    // otherwise, so the counterclockwise flag is what picks the near side —
    // and with it the wrong way round the moon wanes across the act instead of
    // waxing, which is how this was caught.
    c.ellipse(cx, cy, wide, r, 0, Math.PI / 2, -Math.PI / 2, k < 0);
    c.closePath();
  };
}

// HOW FULL THE MOON IS, 0..1, across the first TWO stages.
//
// Neon 1 opens on a new moon and Neon 2 finishes under a full one — half a
// lunation per stage — and the moon is never seen to go backwards. Filling it
// inside a single stage was the other option and it makes each stage a whole
// month, so Neon 2 would have to open on the crescent it just finished filling.
//
// Neon 3 is already full when it starts, and stays full: it used to be the
// eclipse (see neonMoonEclipse, retired 25 Sep 2026).
//
// Exported for the gallery sheet and tests/neon-city-arrival.js.
export function neonMoonPhase(stageIndex, progress) {
  const stage = Number(stageIndex);
  const p = Number(progress);
  const index = Number.isFinite(stage) ? Math.max(1, Math.min(3, stage)) : 1;
  // A picture that is not a run — a poster, an attract shot, the gallery's
  // production tiles — hands no progress and gets the stage's opening sky.
  const within = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  return Math.max(0, Math.min(1, (index - 1 + within) / 2));
}

// THE ECLIPSE, 0..1 — RETIRED 25 Sep 2026 (Peter: "can we lose the lunar eclipse
// from the 3rd terminal velocity level"). It used to run the umbra across Neon
// 3's full moon from the leading edge to dead centre at the tape. Every stage now
// answers 0, so Neon 3 finishes under a clear full moon. neonMoonUmbra and
// NEON_ECLIPSE_DEEPEST stay drawable: put `return clamp(progress)` back for
// stage 3 to restore it.
export function neonMoonEclipse(stageIndex, progress) { // eslint-disable-line no-unused-vars
  return 0;
}

// THE UMBRA, and it is not a hole punched in the moon.
//
// An eclipsed moon goes COPPER rather than black, because the only light
// reaching it is bent round the Earth's edge — it is lit by every sunrise on
// the planet at once. So the shadow here darkens and then puts the red back:
// one pass to take the moonlight out, a second to give it the colour it gets
// instead. Its edge is soft, because the Earth has an atmosphere.
// A PARTIAL ECLIPSE, and it stops where it stops. The umbra's deepest reach is
// a shadow centred half a radius off the moon's own centre, which leaves a lit
// limb down the trailing edge for the whole of Neon 3 — the moon is bitten, not
// put out. Totality was the first cut and it takes the moon off the board: the
// one cold light in the frame goes copper and the top right corner of the
// picture empties.
const NEON_ECLIPSE_DEEPEST = 0.5;

function neonMoonUmbra(ctx, cx, cy, r, e) {
  const R = r * 1.34;
  // The shadow arrives from the leading edge and settles at its deepest at the
  // tape: at e = 0 it is clear of the disc, at e = 1 it has taken the bite it
  // is going to take.
  const deepest = cx - r * NEON_ECLIPSE_DEEPEST;
  const clear = cx - (R + r * 1.05);
  const ux = clear + (deepest - clear) * e;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2);
  ctx.clip();
  const dark = ctx.createRadialGradient(ux, cy, R * 0.55, ux, cy, R);
  dark.addColorStop(0, 'rgba(14,6,26,0.94)');
  dark.addColorStop(0.72, 'rgba(14,6,26,0.86)');
  dark.addColorStop(1, 'rgba(14,6,26,0)');
  ctx.fillStyle = dark;
  ctx.fillRect(ux - R, cy - R, R * 2, R * 2);
  // And the sunrise light that gets there anyway.
  ctx.globalCompositeOperation = 'lighter';
  const copper = ctx.createRadialGradient(ux, cy, R * 0.2, ux, cy, R);
  copper.addColorStop(0, 'rgba(168,52,34,0.50)');
  copper.addColorStop(0.7, 'rgba(120,30,28,0.34)');
  copper.addColorStop(1, 'rgba(120,30,28,0)');
  ctx.fillStyle = copper;
  ctx.fillRect(ux - R, cy - R, R * 2, R * 2);
  ctx.restore();
}

function neonMoon(ctx, t, context) {
  const { x: cx, y } = neonMoonCenter(ctx, context);
  const r = NEON_MOON_RADIUS;
  const phase = neonMoonPhase(context?.stageIndex, context?.progress);
  const eclipse = neonMoonEclipse(context?.stageIndex, context?.progress);
  const k = NEON_MOON_NEW + phase * (1 - NEON_MOON_NEW);
  // TWO CLOCKS, and only one of them touches the moon itself.
  //
  // The flicker is the tube's, held to a hair: the moon is the one steady thing
  // on screen and a blinking moon reads as a fault rather than as a sign.
  const flicker = 0.93 + 0.07 * Math.sin(t * 1.3) * Math.sin(t * 0.41);
  // The pulse is the HALO's, and it is a slow breath — seven seconds in and
  // out, a quarter either side. It is on the light the moon throws and never on
  // the disc: swell the body and the moon reads as coming toward you, swell
  // only what it lights and it reads as glowing.
  const breath = Math.sin(t * 0.9);
  const pulse = 1 + 0.26 * breath;
  const reach = 3.1 * (1 + 0.09 * breath);
  ctx.save();
  // The light it throws, and it throws more of it as it fills — the halo is
  // the only part of this that the player reads without looking up.
  const halo = ctx.createRadialGradient(cx, y, r * 0.5, cx, y, r * reach);
  // The light goes OUT as the umbra lands, and what is left of it goes copper.
  // A sky that keeps its cold moonlight through an eclipse is a sky with two
  // moons in it, one of them invisible.
  // 0.62 of what it was: the moon kept reading as foreground because its halo
  // was the brightest soft light in the frame. Distance is value, not size.
  const lit = (0.124 + 0.10 * phase) * flicker * pulse * (1 - eclipse * 0.42);
  const core = eclipse > 0 ? `rgba(${Math.round(180 + 40 * eclipse)},${
    Math.round(240 - 80 * eclipse)},${Math.round(255 - 110 * eclipse)},${lit.toFixed(3)})`
    : `rgba(180,240,255,${lit.toFixed(3)})`;
  halo.addColorStop(0, core);
  halo.addColorStop(0.45, `rgba(${Math.round(120 + 100 * eclipse)},${
    Math.round(190 - 120 * eclipse)},${Math.round(255 - 190 * eclipse)},${(lit * 0.34).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(120,190,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * reach, y - r * reach, r * reach * 2, r * reach * 2);
  // The dark limb: the sphere the lit face is part of. Barely above the sky,
  // because a filled moon at this size competes with a target.
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#2b2266';
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The lit face: filled soft, then bent in glass.
  const face = neonMoonLit(cx, y, r, k);
  ctx.globalAlpha = 0.34 * flicker;
  ctx.fillStyle = '#7fd8f8';
  ctx.beginPath(); face(ctx); ctx.fill();
  // The glass goes down with the light. The umbra clips at the limb, so half
  // the stroke width always survives outside it — left at full strength that
  // leaves a bright white ring round a copper moon, which is the one thing an
  // eclipse does not look like.
  ctx.globalAlpha = 0.72 * flicker * (1 - eclipse * 0.4);
  neonTube(ctx, '#d8f8ff', 1.1, 0.22, face);
  ctx.globalAlpha = 1;
  if (eclipse > 0) neonMoonUmbra(ctx, cx, y, r, eclipse);
  // Craters LAST, and darker than the lit face rather than lighter than the
  // dark limb: for two stages of three this moon is mostly lit, so that is the
  // half they have to read on. On the thin crescent they fall in shadow and
  // disappear, which is what a crater on an unlit limb does anyway. Drawn
  // before the phase they would need drawing twice, and a full moon would come
  // out a blank lamp.
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = '#35508c';
  for (const [dx, dy, cr] of [[-0.38, -0.3, 1.9], [-0.1, 0.44, 1.3], [0.33, -0.5, 1.4]]) {
    ctx.beginPath();
    ctx.arc(cx + r * dx, y + r * dy, cr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// THE TRAINS ARE NOT DRAWN HERE ANY MORE.
//
// This file used to carry two bespoke painters: a train that swept past on a
// raised rail, and a last train that drove in and parked beside the tape. Both
// are gone, and what replaced them is one mechanism in src/game/terrain.js —
// see trainArrival(). Every neon train is an ISLAND ROUTE that flies in from
// behind the player, overtakes him in the air, brakes and lands on its own
// berth, so the pass and the thing he boards are the same train at two moments.
//
// That came out of Peter asking to jump onto one while it was moving. Routes
// are static world geometry and there is no moving collision in this engine, so
// a sliding roof is a roof nobody can land on; a FLYING train that sets down
// gives the same beat with the landing doing the work. It also deleted a whole
// scheduling table — an overtake had to be timed against stage progress so it
// did not collide with a train section, while an arrival is timed off the
// camera's distance to the berth and cannot clash with anything by construction.
const NEON_TRAIN_H = 34;
const NEON_RAIL_RISE = 33;

// THE CITY ARRIVES ON STAGE 1, and this table is the schedule.
//
// Neon 1 opens on an empty sky — stars, haze and a veil with nothing behind it
// to veil — and assembles itself as the run goes: the mass at the back first,
// then the far wireframe row, then the near one. By the time the player is two
// thirds of the way through they are running past the whole six-layer city.
//
// It is scoped to the FIRST stage. Neon 2 and 3 open finished: the arrival is
// the cabinet introducing itself, and a cabinet that re-introduces itself every
// stage is a cabinet with a loading screen.
//
// `at` is stage progress (distance / totalDist) and `over` is how much progress
// the fade takes. They are smoothstepped, so no layer ever snaps on — the whole
// point is that nobody can name the frame a row of towers appeared.
//
// SOONER AND QUICKER since the song turns early (Peter, 24 Sep: "it can start just
// before the transition and proceed a bit quicker so that it is mostly done by the
// time we get onto the first train"). The minor turn lands about a tenth of the way
// in, and the first train that stands for the hero is at 0.30 — so the back mass
// starts just ahead of the turn and the near row is up by 0.27.
const NEON_CITY_ARRIVALS = [
  { key: 'farMass', at: 0.07, over: 0.08 },
  { key: 'midWire', at: 0.12, over: 0.08 },
  { key: 'nearWire', at: 0.19, over: 0.08 },
];

// How far in each of the three city layers is, 0..1. Exported for the gallery
// sheet and tests/neon-city-arrival.js, so neither can quote a schedule the
// cabinet has stopped using.
export function neonCityReveal(stageIndex, progress) {
  const full = { farMass: 1, midWire: 1, nearWire: 1 };
  if (Number(stageIndex) !== 1) return full;
  const p = Number(progress);
  if (!Number.isFinite(p)) return full;
  const out = {};
  for (const { key, at, over } of NEON_CITY_ARRIVALS) {
    const u = Math.max(0, Math.min(1, (p - at) / over));
    out[key] = u * u * (3 - 2 * u);
  }
  return out;
}

// ------------------------------------------------------------ NEON MOODS
// The same city in another light, through the bg() mood seam below. neon-1 opens in
// GOLDEN HOUR and turns to NIGHT when the song does; the night later grows an AURORA.
// The when is src/engine/stylePacks/neonMoods.js; this is the what. Approved in the
// neon-mood bake-off, 23 Sep 2026, with the rays taken all the way round.

// Golden hour's sun: low on the left, just over the far skyline, with its rays
// radiating the WHOLE circle (Peter: "sun rays to extend ALL the way around") and
// turning about once a minute so the sky breathes without flickering. One path, one
// radial fade, drawn additively: every ray is lightest at the sun and gone well
// before it could wash out the hazard band.
// SUNSET: the disc's centre sits a touch BELOW the horizon line (Peter, 23 Sep: "can
// the center of the sun be at the horizon (or even slightly lower) it IS sunset"), so
// the far city cuts through it and only the top of it is ever whole. The rays turn a
// little faster than they did and each one breathes on its own slow cycle, so the
// fan is visibly alive without strobing.
const goldenGradients = new WeakMap();
// THE GOLDEN HOUR IS CUT PAPER (Peter, 24 Sep: "could we try the paper aesthetic on it?
// perhaps on the sun's rays as well for more dramatic change when we go to neon"). The day
// is made of card — a grained sky, the rays as paper strips with a drop shadow and a white
// cut edge, a paper sun, and Fuji in layered sheets — so the strike's switch to neon tube
// and glow is a change of MATERIAL, not only of light. `mood.paper === false` draws the
// old light-ray look (the gallery keeps both to compare).
const NEON_GOLDEN_PAPER_MATERIAL = 'cardstockClear';
function neonGoldenSky(ctx, t, camX = 0, context = null) {
  const paper = context?.neonMood?.paper !== false;
  if (paper) return neonGoldenPaperSky(ctx, t, context);
  const cov = backgroundCoverage(ctx);
  const x = cov.left + cov.width * 0.2;
  const y = GROUND_Y + 6;
  const reach = Math.max(cov.width, 480) * 1.2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const turn = t * 0.07;          // a full turn in about ninety seconds (Peter, 24 Sep: slower)
  ctx.beginPath();
  const RAYS = 24;
  for (let i = 0; i < RAYS; i++) {
    const a = turn + (i / RAYS) * Math.PI * 2;
    const breathe = 1 + 0.35 * Math.sin(t * 0.35 + i * 1.7);
    const half = (i % 2 ? 0.022 : 0.045) * breathe;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - half) * reach, y + Math.sin(a - half) * reach);
    ctx.lineTo(x + Math.cos(a + half) * reach, y + Math.sin(a + half) * reach);
    ctx.closePath();
  }
  // The two gradients are built once per context and sun position, not per frame —
  // `addColorStop` showed in the gameplay profile (docs/NEON_AUDIO_HANDOVER.md §3).
  const r = 26;
  const key = `${Math.round(x)}|${Math.round(y)}|${Math.round(reach)}`;
  let grads = goldenGradients.get(ctx);
  if (!grads || grads.key !== key) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, reach * 0.7);
    g.addColorStop(0, 'rgba(255,240,192,0.34)');
    g.addColorStop(0.35, 'rgba(255,224,160,0.12)');
    g.addColorStop(1, 'rgba(255,224,160,0)');
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    bloom.addColorStop(0, 'rgba(255,250,210,1)');
    bloom.addColorStop(0.25, 'rgba(255,200,120,0.4)');
    bloom.addColorStop(1, 'rgba(255,200,120,0)');
    grads = { key, g, bloom };
    goldenGradients.set(ctx, grads);
  }
  ctx.fillStyle = grads.g;
  ctx.fill();
  // The disc and its bloom.
  ctx.fillStyle = grads.bloom;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.restore();
  neonFuji(ctx, cov, context?.progress, false);
}

function neonGoldenPaperSky(ctx, t, context) {
  const cov = backgroundCoverage(ctx);
  const x = cov.left + cov.width * 0.2;
  const y = GROUND_Y + 6;
  const reach = Math.max(cov.width, 480) * 1.2;
  // The sheet of sky itself, grained — one cached blit.
  drawPaperSurface(ctx, cov, 'neon-golden-paper-sky', NEON_GOLDEN_PAPER_MATERIAL, 0.8);
  // The rays: alternate strips of two creams, cut from card, turning slowly round the
  // sun. Each colour is one path so its shadow and grain are one pass.
  const turn = t * 0.07;
  const RAYS = 24;
  const strips = [new Path2D(), new Path2D()];
  for (let i = 0; i < RAYS; i++) {
    const a = turn + (i / RAYS) * Math.PI * 2;
    const breathe = 1 + 0.35 * Math.sin(t * 0.35 + i * 1.7);
    const halfA = (i % 2 ? 0.022 : 0.045) * breathe;
    const q = strips[i % 2];
    q.moveTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30);
    q.lineTo(x + Math.cos(a - halfA) * reach, y + Math.sin(a - halfA) * reach);
    q.lineTo(x + Math.cos(a + halfA) * reach, y + Math.sin(a + halfA) * reach);
    q.closePath();
  }
  const pattern = sharedPaperPatternFor(ctx, NEON_GOLDEN_PAPER_MATERIAL);
  ctx.save();
  ctx.globalAlpha *= 0.62;
  for (const [q, fill] of [[strips[0], '#ffe6b8'], [strips[1], '#fff2d6']]) {
    drawPaperShape(ctx, q, fill, {
      pattern, deep: PAPER_DEEP_OFFSET, contact: PAPER_CONTACT_OFFSET,
      deepColor: 'rgba(120,52,40,0.16)', contactColor: 'rgba(90,40,30,0.08)',
    });
  }
  ctx.restore();
  // The sun: a paper disc on the horizon with a paper halo ring behind it.
  const halo = new Path2D();
  halo.arc(x, y, 38, 0, Math.PI * 2);
  drawPaperShape(ctx, halo, 'rgba(255,214,150,0.7)', {
    pattern, deep: PAPER_SUBTLE_DEEP_OFFSET, contact: PAPER_SUBTLE_CONTACT_OFFSET,
    deepColor: 'rgba(120,52,40,0.12)',
  });
  const disc = new Path2D();
  disc.arc(x, y, 26, 0, Math.PI * 2);
  drawPaperShape(ctx, disc, '#ffe28a', {
    pattern, deep: PAPER_DEEP_OFFSET, contact: PAPER_CONTACT_OFFSET,
    deepColor: 'rgba(140,60,30,0.2)',
  });
  neonFuji(ctx, cov, context?.progress, true);
}

// MOUNT FUJI behind the city in neon-1's golden hour, and only then (Peter, 24 Sep, from
// the Tokyo ideas bake-off: "a bit smaller and only in the day part of level 1", and "make
// sure fuji is at ground level"). It is part of the golden mood's sky, so the strike that
// turns the day to night takes it with the sun. At infinity like the sun: pinned to the
// picture, not the camera, right of the sun so the rays fan out beside it. Its foot is on
// the groundline — the haze and the city bury it, as they bury every tower's — and it is
// the bake-off's mountain extended to the ground at 0.78 scale, which still lifts the
// snowcap clear of the tallest far roofs. The cap's ragged lower edge is what says Fuji.
// AND THE RUN LEAVES IT BEHIND (Peter, 24 Sep: "we are going away from it so ideally it
// should be faded before the buildings fully appear"): it fades over `fade` of the
// stage, gone before the near row finishes arriving (NEON_CITY_ARRIVALS, full by ~0.27).
// No progress — a gallery card — is the start of the stage.
const NEON_FUJI = {
  at: 0.62, scale: 0.78, alpha: 0.74,
  fade: [0.03, 0.2],
  // Rock: the face turned to the low sun on the left, the far face in shade.
  rockLit: '#6a5292', rockShade: '#3a2d68', gully: 'rgba(28,20,58,0.35)', rim: '#ffcf9a',
  // Snow: warm where the golden light catches it, cool blue-lilac in shade.
  snowLit: '#fff3e8', snowShade: '#b3b6e6', snowStreak: 'rgba(150,140,210,0.45)',
};
export function neonFujiAlpha(progress) {
  const [a, b] = NEON_FUJI.fade;
  const p = Number.isFinite(progress) ? progress : 0;
  const k = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return 1 - k * k * (3 - 2 * k);
}
// THE MOUNTAIN, drawn once into a canvas and blitted: its layers overlap, and faded as
// one image it stays one translucent mountain rather than a stack of see-through sheets.
// Local space: summit centre at x 0, the groundline at y 0, all in scale-k units.
//
// The shape is Fuji's: CONCAVE flanks — steep under the summit, flattening out into the
// long skirt — and a flat crater rim with a notch or two. The snow is what makes it
// read: a cap down to about 40% of the height that runs on down the gullies in long
// fingers of unequal length, a few pale ridge streaks inside it, warm on the sunlit face
// and blue in shade, with a thin gold rim where the low sun catches the left edge.
const fujiCache = new Map();
function neonFujiArt(k, paper = false) {
  const SS = bakeSS();
  const key = `${k}|${SS}|${paper ? 'paper' : 'flat'}`;
  if (fujiCache.has(key)) return fujiCache.get(key);
  let art = null;
  if (typeof document !== 'undefined') {
    const F = NEON_FUJI;
    const Hh = 162 * k, half = 365 * k, cap = 34 * k;
    const pad = 4;
    const cw = half * 2 + pad * 2, ch = Hh + pad * 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(cw * SS); c.height = Math.ceil(ch * SS);
    const g = c.getContext('2d');
    g.scale(SS, SS);
    g.translate(cw / 2, Hh + pad);
    // A sheet: flat fill, or — paper on — a card cutout with its drop shadow, grain
    // and white cut edge. `lift` scales the drop, so a sheet laid on the mountain
    // sits close to it and the mountain on the sky sits further off.
    const pattern = paper ? sharedPaperPatternFor(g, NEON_GOLDEN_PAPER_MATERIAL) : null;
    const sheet = (pathFn, fill, lift = 1, rim = true) => {
      const q = new Path2D(); pathFn(q);
      if (!paper) { g.fillStyle = fill; g.fill(q); return; }
      drawPaperShape(g, q, fill, {
        pattern, rim,
        deep: { x: PAPER_DEEP_OFFSET.x * lift * 0.5, y: PAPER_DEEP_OFFSET.y * lift * 0.5 },
        contact: PAPER_CONTACT_OFFSET,
        deepColor: 'rgba(60,30,50,0.22)', contactColor: 'rgba(40,20,40,0.1)',
      });
    };
    const rimPts = [[-cap, -Hh + 1.2 * k], [-cap * 0.55, -Hh - 0.6 * k], [-cap * 0.2, -Hh + 0.9 * k],
      [cap * 0.15, -Hh - 0.3 * k], [cap * 0.6, -Hh + 1.1 * k], [cap, -Hh + 0.8 * k]];
    const flank = (side) => {
      // Shoulder to foot, bowing in: steep first, flat last.
      const sx = side * cap, fx = side * half;
      return { sx, fx, cx: side * (cap + (half - cap) * 0.22), cy: -Hh * 0.2 };
    };
    const L = flank(-1), R = flank(1);
    const outline = (q) => {
      q.moveTo(L.fx, 0);
      q.quadraticCurveTo(L.cx, L.cy, L.sx, -Hh + 1.2 * k);
      for (const [x, y] of rimPts.slice(1)) q.lineTo(x, y);
      q.quadraticCurveTo(R.cx, R.cy, R.fx, 0);
      q.closePath();
    };
    // Rock, shade then the lit face: the terminator runs from just left of the summit to
    // a little right of centre at the foot.
    sheet(outline, F.rockShade, 1.6);
    g.save();
    g.beginPath(); outline(g); g.clip();
    const lit = (q) => { q.moveTo(-half - 4, 4); q.lineTo(-cap * 0.25, -Hh - 4); q.lineTo(half * 0.14, 4); q.closePath(); };
    sheet(lit, F.rockLit, 0.5, false);
    // Gullies: faint darker lines raked down the flanks, following their curve.
    g.strokeStyle = F.gully; g.lineWidth = 0.7 * k; g.lineCap = 'round';
    for (const u of [-0.8, -0.62, -0.45, -0.3, -0.16, 0.05, 0.2, 0.36, 0.52, 0.7, 0.86]) {
      const topX = u * cap * 1.6, footX = u * half * 0.95;
      g.beginPath();
      g.moveTo(topX, -Hh * 0.62);
      g.quadraticCurveTo(topX + (footX - topX) * 0.35, -Hh * 0.25, footX, -Hh * 0.02);
      g.stroke();
    }
    // The snowcap: a line at about 40% down, with fingers running on down the gullies.
    // The line itself sags and lifts across the mountain, and the tongues below it are
    // BROAD and uneven — [centre across the cap, length as a share of the height, width]
    // — full near the line and rounding off at the tip, not hanging teeth.
    const lineY = -Hh * 0.7;
    const fingers = [[-0.92, 0.06, 9], [-0.74, 0.16, 12], [-0.55, 0.09, 8], [-0.4, 0.21, 13],
      [-0.22, 0.12, 9], [-0.06, 0.25, 14], [0.1, 0.1, 8], [0.26, 0.19, 12], [0.44, 0.08, 9],
      [0.58, 0.15, 11], [0.76, 0.07, 8], [0.9, 0.12, 10]];
    const W = cap + (half - cap) * 0.36;
    const snowEdge = (x) => {
      let d = 0;
      for (const [fu, len, wid] of fingers) {
        const t = 1 - Math.abs(x - fu * W) / (wid * k);
        // Elliptical: full near the line, ROUNDED at the tip.
        if (t > 0) d = Math.max(d, len * Hh * Math.sqrt(1 - (1 - t) * (1 - t)));
      }
      // Ragged, not ruled: the line wanders on three scales.
      const j = Math.sin(x * 0.07 / k + 0.4) * 3.2 + Math.sin(x * 0.55 / k) * 1.1
        + Math.sin(x * 1.9 / k + 1.3) * 0.5;
      return lineY + d + j * k;
    };
    const snow = (q) => {
      q.moveTo(-half, -Hh - 6);
      q.lineTo(half, -Hh - 6);
      for (let x = W + 8 * k; x >= -W - 8 * k; x -= 1) q.lineTo(x, snowEdge(x));
      q.closePath();
    };
    // Broken snow streaks running on down the gullies below the longest tongues.
    const streaks = (q) => {
      for (const [fu, len, wid] of fingers) {
        if (len < 0.12) continue;
        // A long thin trail on down the gully, drifting outward with the slope, in two
        // broken pieces.
        const x0 = fu * W, y0 = lineY + len * Hh - 1.5 * k;
        for (const [from, to, w] of [[0, 9, 1.3], [12, 19, 0.9]]) {
          const ya = y0 + from * k, yb = y0 + to * k;
          const xa = x0 + fu * from * 0.9 * k, xb = x0 + fu * to * 0.9 * k;
          q.moveTo(xa - w * k, ya); q.lineTo(xa + w * k, ya);
          q.lineTo(xb + 0.2 * k, yb); q.lineTo(xb - 0.2 * k, yb); q.closePath();
        }
      }
    };
    sheet((q) => { snow(q); streaks(q); }, F.snowShade, 1);
    g.save();
    g.beginPath(); lit(g); g.clip();
    sheet((q) => { snow(q); streaks(q); }, F.snowLit, 0, false);
    g.restore();
    // Ridge streaks inside the snow, and a shadow under the lip of the crater.
    g.save();
    g.beginPath(); snow(g); g.clip();
    g.strokeStyle = F.snowStreak; g.lineWidth = 0.8 * k;
    for (const [fu, len] of fingers) {
      const x = fu * W * 0.55;
      g.beginPath();
      g.moveTo(x * 0.6, -Hh + 3 * k);
      g.quadraticCurveTo(x * 0.9, lineY * 0.8, fu * W, lineY + len * Hh * 0.7);
      g.stroke();
    }
    g.fillStyle = 'rgba(120,110,190,0.35)';
    g.beginPath(); g.ellipse(0, -Hh + 2.2 * k, cap * 0.8, 2.2 * k, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.restore();
    // The low sun's gold along the lit edge of the upper flank.
    g.save();
    g.beginPath(); outline(g); g.clip();
    g.strokeStyle = F.rim; g.lineWidth = 1.6 * k; g.globalAlpha = 0.7;
    g.beginPath(); g.moveTo(L.sx, -Hh + 1.2 * k); g.quadraticCurveTo(L.cx, L.cy, L.fx, 0);
    g.stroke();
    g.restore();
    art = { canvas: c, w: cw, h: ch, pad };
  }
  fujiCache.set(key, art);
  return art;
}
function neonFuji(ctx, cov, progress, paper = false) {
  const fade = neonFujiAlpha(progress);
  if (fade <= 0) return;
  const art = neonFujiArt(NEON_FUJI.scale, paper);
  if (!art) return;
  const cx = cov.left + cov.width * NEON_FUJI.at;
  ctx.save();
  ctx.globalAlpha *= (paper ? 0.9 : NEON_FUJI.alpha) * fade;
  ctx.drawImage(art.canvas, cx - art.w / 2, GROUND_Y - art.h + art.pad, art.w, art.h);
  ctx.restore();
}

export const NEON_GOLDEN_MOOD = Object.freeze({
  id: 'golden',
  sky: ['#ff9a6b', '#ffe0a0'],
  skyExtra: neonGoldenSky,
  skyLayer: 'far',
  stars: 0,
  moon: false,
  haze: { color: '#fff0c0', alpha: 0.35 },
  mass: { fill: '#b8606e', crown: '#fff4c0', crownAlpha: 0.8 },
  wire: { inkA: '#ffffff', inkB: '#ffcf5a', lit: '#ffffff', lamp: '#ff5a7a' },
  veil: { tint: '#ffc08a', alpha: 0.5 },
  signs: 0.45,
});

// THE AURORA: three additive curtains — mint, ice, violet — rippling on slow sines.
// Painted to a small offscreen canvas at ~15fps and blitted each frame: it is soft,
// it moves slowly, and five hundred gradient columns a frame is not a price the
// background pays for a sky.
// TALL, reaching the top of the frame (Peter, 23 Sep: "should reach the moon — even
// the top of the screen"). A real curtain is brightest along its LOWER edge and fades
// as it climbs, so each band is anchored at its base and rises the full height of the
// sky; the base ripples, and the height breathes, on their own slow sines.
// [colour, base as a fraction of H, alpha, height as a fraction of H]
// Bases lifted clear of the skyline (Peter, 24 Sep: "can the bottom of the borealis
// also move up?"): the curtains hang in the upper sky and stop well above the towers.
const AURORA_BANDS = [
  ['#3bf5c8', 0.27, 0.2, 0.85],
  ['#7ab8ff', 0.33, 0.13, 0.95],
  ['#b07cff', 0.22, 0.1, 0.75],
];
// The canvas reaches this far ABOVE the frame, for portrait's taller sky.
const AURORA_ABOVE = 0.6;
let auroraCanvas = null;
let auroraKey = '';
function neonAurora(ctx, t, strength) {
  if (!(strength > 0) || typeof document === 'undefined') return;
  const cov = backgroundPaintCoverage(ctx);
  const top = -H * AURORA_ABOVE;
  const w = Math.ceil(cov.width / 2);
  const h = Math.ceil((H - top) / 2);
  const frame = Math.floor(t * 15);
  const key = `${w}x${h}|${frame}`;
  if (key !== auroraKey) {
    if (!auroraCanvas || auroraCanvas.width !== w || auroraCanvas.height !== h) {
      auroraCanvas = document.createElement('canvas');
      auroraCanvas.width = w;
      auroraCanvas.height = h;
    }
    const g = auroraCanvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.scale(0.5, 0.5);
    g.translate(0, -top);
    g.globalCompositeOperation = 'lighter';
    const tt = frame / 15;
    for (const [col, fb, alpha, fh] of AURORA_BANDS) {
      // Unit gradient: bright at the base (y 1), gone at the top (y 0).
      const grad = g.createLinearGradient(0, 0, 0, 1);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.72, col);
      grad.addColorStop(0.9, col);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.globalAlpha = alpha;
      for (let x = 0; x < cov.width; x += 4) {
        const wx = x + cov.left;
        const base = H * fb + Math.sin(wx * 0.018 + tt * 0.35 + fb * 9) * 16 + Math.sin(wx * 0.05 + tt * 0.2) * 6;
        const ch = H * fh * (0.8 + 0.2 * Math.sin(wx * 0.021 + tt * 0.45 + fh * 5));
        g.save();
        g.translate(x, base - ch);
        g.scale(1, ch);
        g.fillRect(0, 0, 4, 1);
        g.restore();
      }
    }
    auroraKey = key;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, strength);
  ctx.drawImage(auroraCanvas, cov.left, top, cov.width, h * 2);
  ctx.restore();
}

// Night is the night that ships — its own sky, moon, inks and smog — plus the aurora
// at whatever strength the level has reached. At nothing, it is no mood at all, and
// the pack paints exactly what it always has.
const nightMoods = new Map();
export function neonNightMood(aurora = 0) {
  const k = Math.round(Math.max(0, Math.min(1, aurora)) * 40) / 40;
  if (k <= 0) return null;
  let m = nightMoods.get(k);
  if (!m) {
    m = Object.freeze({ id: 'night', skyExtra: (ctx, t) => neonAurora(ctx, t, k) });
    nightMoods.set(k, m);
  }
  return m;
}

function neonPack(settings) {
  // What bg() leaves for ground(); see the note at the latch below.
  let neonFrame = null;
  return {
    name: 'neon',
    dark: true,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      // ground() is handed no scene and no context, and the overtake is a STAGE
      // event — so the frame's progress travels to the lane pass exactly the way
      // frost's weather does: bg() always runs first in the same frame and
      // leaves what ground() needs here. Pack-local, so a run and a gallery tile
      // alive at once cannot cross wires.
      neonFrame = {
        stageIndex: backgroundContext?.stageIndex ?? scene?.stageIndex ?? 1,
        progress: backgroundContext?.progress ?? scene?.progress,
        totalDist,
        // The road is painted in the day's colours while the city is (see ground).
        day: (backgroundContext?.neonMood ?? scene?.neonMood)?.id === 'golden',
      };
      // THE MOOD SEAM. An optional palette-and-hooks object that repaints the same
      // city in another light: neon-1's golden hour, and the aurora over the night
      // (NEON MOODS, above). Absent, every value below falls back to the plain night,
      // which is what a gallery card or a run that never sets one paints.
      const mood = backgroundContext?.neonMood ?? scene?.neonMood ?? null;
      const sky = mood?.sky || cab.sky;
      skyGrad(ctx, sky[0], sky[1]);
      // Six layers, back to front, each at its own fraction of the camera. The
      // factor is scaled by ZOOM because the camera magnifies the FOREGROUND:
      // a parallax factor that is not scaled by the same amount leaves the
      // backdrop effectively frozen. See neonCityReveal for the stage-1 ramp.
      const reveal = neonCityReveal(
        backgroundContext?.stageIndex ?? scene?.stageIndex ?? 1,
        backgroundContext?.progress ?? scene?.progress,
      );
      const layer = (depth, f, draw) => {
        ctx.save();
        ctx.translate(0, backgroundY(backgroundContext, depth));
        draw(camX * f * ZOOM);
        ctx.restore();
      };
      // Each row's height range comes from the band the composition tuner
      // owns — see neonRowRoofs. The numbers below are the LANDSCAPE
      // composition and the fallback for anything with no layout.
      const farRoofs = neonRowRoofs(backgroundContext, 'farLandmark', 46, 92);
      const midRoofs = neonRowRoofs(backgroundContext, 'middle', 58, 112);
      const nearRoofs = neonRowRoofs(backgroundContext, 'near', 84, 158);
      // The mood's sky — golden hour's sun, the night's aurora — rides the celestial
      // band like the moon, so a portrait crane moves it with the sky it is in.
      // The golden sun sits ON the horizon, so it rides the far city's band ('far');
      // the aurora is sky and rides the moon's ('celestial').
      if (mood?.skyExtra) {
        layer(mood.skyLayer || 'celestial', 0, () => mood.skyExtra(ctx, t, camX, backgroundContext));
      }
      const starAlpha = mood?.stars ?? 1;
      if (starAlpha > 0) {
        layer('stars', 0.014, (shift) => {
          ctx.globalAlpha = starAlpha;
          neonStarfield(ctx, shift, t, { context: backgroundContext });
          // Three a level, on the odometer. Drawn with the stars because that is
          // what it is — one of them, leaving.
          neonComet(ctx, backgroundContext);
          ctx.globalAlpha = 1;
        });
      }
      if (mood?.moon !== false) layer('celestial', 0, () => neonMoon(ctx, t, backgroundContext));
      layer('far', 0.02, () => neonHorizonHaze(ctx, mood?.haze || {}));
      // Tokyo Tower behind the far city on neon-2 and neon-3 (see neonTokyoTower).
      // Overtime runs have no midpoint (totalDist is Infinity), so no tower.
      if (neonFrame.stageIndex >= 2 && Number.isFinite(totalDist) && totalDist > 0) {
        layer('far', 0, () => neonTokyoTower(ctx, t, camX, totalDist * NEON_TOWER_AT, farRoofs.maxH * 1.9,
          backgroundContext?.neonTokyoFlare || 0));
      }
      if (reveal.farMass > 0) {
        layer('far', 0.07, (shift) => neonFarMass(ctx, shift, {
          minH: farRoofs.minH, maxH: farRoofs.maxH, alpha: reveal.farMass, ...(mood?.mass || {}),
        }));
      }
      if (reveal.midWire > 0) {
        const row = NEON_WIRE_ROWS.middle;
        layer('middle', row.factor, (shift) => neonWireRow(ctx, shift, t, {
          seed: row.seed, span: row.span, count: row.count, minH: midRoofs.minH, maxH: midRoofs.maxH, w: row.w,
          stroke: 1, glow: 0.1, alpha: 0.46 * reveal.midWire, ...(mood?.wire || {}),
          onTower: reveal.midWire >= 1 ? neonBladeSigns(ctx, {
            lit: mood?.signs ?? 1, words: NEON_BACK_SIGN_WORDS, scale: 0.72, dim: 0.62, tower: 6,
          }) : null,
        }));
      }
      // A bolt that strikes INTO the city (the storm-bolt bake-off's depth mock-up) is
      // painted here, between the rows, so the near row and the smog stand in front.
      if (typeof backgroundContext?.neonBehindNear === 'function') backgroundContext.neonBehindNear(ctx);
      if (reveal.nearWire > 0) {
        const row = NEON_WIRE_ROWS.near;
        layer('near', row.factor, (shift) => neonWireRow(ctx, shift, t, {
          seed: row.seed, span: row.span, count: row.count, minH: nearRoofs.minH, maxH: nearRoofs.maxH, w: row.w,
          stroke: 1.2, glow: 0.18, alpha: reveal.nearWire, ...(mood?.wire || {}),
          lower: backgroundContext?.neonLowTower || null,
          onTower: reveal.nearWire >= 1 ? neonBladeSigns(ctx, {
            lit: mood?.signs ?? 1, blown: backgroundContext?.neonSignBlown || null,
            faulty: neonFaultySignBlock(ctx, backgroundContext, totalDist), t,
            stood: backgroundContext && 'neonStruck' in backgroundContext ? !!backgroundContext.neonStruck : null,
          }) : null,
        }));
      }
      // The struck tower stands whether or not the near row has arrived: on neon-1 the
      // first strike (the turn, a tenth of the way in) comes before the city does, so
      // it is the first building up, and the one the storm finds.
      const struck = neonStruckTower(ctx, camX, backgroundContext);
      if (struck) {
        drawNeonStruckTower(ctx, t, struck, { lit: mood?.signs ?? 1, ink: mood?.wire?.inkB || struck.ink });
      }
      // In front of the city, behind everything the player plays with.
      layer('near', 0, () => neonBandVeil(ctx, cab, { context: backgroundContext, ...(mood?.veil || {}) }));
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null,
      world = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      // A HOLE IS DRAWN BY NOT DRAWING, and this pack was the one place in the
      // game still doing it the other way: it laid the road clean across the
      // frame and then painted `#000` over the break. That is a black rectangle
      // rather than a hole — you cannot see the city through it, and the cut
      // has no edges, so the one thing a pit has to say (there is nothing here)
      // is said by a colour that belongs to nothing else on screen.
      //
      // apronRuns() is what every other pack uses for this; it hands back the
      // spans that still have ground in them. The road, its lit surface and its
      // grid are now painted per run, and each cut face gets a vertical in the
      // lane's own cyan — so the hole is bounded by the same line the surface
      // is, which is what makes it read as a piece of this road with a piece
      // missing.
      const runs = apronRuns(camX, obstacles, overhangs, drawW);
      for (const [a, b] of runs) {
        if (b <= a) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(a, GROUND_Y, b - a, H - GROUND_Y);
        ctx.clip();
        ctx.fillStyle = '#0c0c20';
        ctx.fillRect(a, GROUND_Y, b - a, H - GROUND_Y);
        // The streaks, clipped to the run so they stop at the cut instead of
        // flying through the empty air below it. `viewW` and not `drawW`: the
        // lane pass is inside the world transform, so the span the player can
        // actually see is the camera's world width — drawW is the 480 of the
        // authored FRAME and seeding against it halves the density.
        drawNeonSpeedStreaks(ctx, { camX, viewW, zoom: world?.worldZoom, day: !!neonFrame?.day });
        ctx.restore();
        // THE LIT SURFACE AND THE TWO CUT FACES, and the corner where they meet
        // is the whole reason this is written the long way round.
        //
        // The run's edges are camera-derived and fractional (114.07, not 114).
        // A 1px fillRect at a fractional x is spread across two columns at
        // partial alpha, so the vertical came out dimmer and half a pixel wide
        // while the horizontal beside it was crisp — and the join read as a
        // notch with the surface line overshooting into thin air. Snapping ONLY
        // the drawn edges fixes it: the apron body and its clip stay on the
        // exact fractional span, so nothing about the hole's position moves,
        // and the lines land on whole pixels where a corner can actually close.
        const ea = Math.round(a);
        const eb = Math.round(b);
        // The lane's edge: the cyan tube at night, a pale painted line by day.
        ctx.fillStyle = neonFrame?.day ? '#fff0c8' : '#38d8f8';
        ctx.fillRect(ea, GROUND_Y, eb - ea, 1);
        // The face fades DOWN rather than sitting at one flat alpha. At a
        // constant 0.55 the corner was a bright pixel meeting a dim one, which
        // is a join you can see; starting at the surface's own brightness makes
        // the two one mark, and the falloff is the light going away down the
        // cut — which is what the inside of a hole does anyway.
        const face = ctx.createLinearGradient(0, GROUND_Y, 0, H);
        face.addColorStop(0, 'rgba(56,216,248,1)');
        face.addColorStop(0.35, 'rgba(56,216,248,0.5)');
        face.addColorStop(1, 'rgba(56,216,248,0.22)');
        ctx.fillStyle = face;
        // Below the surface line, not through it, so the corner pixel is the
        // horizontal's and the two never double up into a brighter dot.
        //
        // A FACE MEANS A HOLE, and apronRuns ends a run for two different
        // reasons: because the road stops, and because the DRAW WINDOW stops.
        // Painting one at both ends of every run put a lit cyan wall down the
        // left edge of the landscape picture and both edges of the portrait
        // one — the frame boundary dressed as a pit. A boundary sitting on the
        // window edge gets the surface and no face; only a real cut gets both.
        if (a > 0.5) ctx.fillRect(ea, GROUND_Y + 1, 1, H - GROUND_Y - 1);
        if (b < drawW - 0.5) ctx.fillRect(eb - 1, GROUND_Y + 1, 1, H - GROUND_Y - 1);
      }
      // Whatever the cabinet names at the bottom of its holes, after the road
      // so the fill is not painted over by the apron either side of it.
      drawPitFills(ctx, camX, cab, obstacles, t, false, null, drawW, '#0c0c20');
    },
    post(ctx, t) {
      ctx.fillStyle = 'rgba(56,16,88,0.1)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // Additive bloom around the art rather than a rectangle around the
      // hitbox — round props stay round, and the light still reads as neon.
      const color = e.kind === 'pickup' ? 'rgba(246,211,60,0.5)' : 'rgba(232,56,248,0.45)';
      const r = Math.max(e.w, e.h) * 0.85 + 5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(glowSprite(color, r), x + e.w / 2 - r, y + e.h / 2 - r, r * 2, r * 2);
      ctx.restore();
    },
  };
}

function watercolorPack(settings) {
  const paperPreview = !!(settings?.paperPreset
    && settings.paperCutout !== false && settings.paperCutout !== 'off');
  // post() is handed only (ctx, t) — no cabinet, no scene — but the blizzard is
  // weather belonging to one cabinet and dialled by the scene. bg() always runs
  // first in the same frame, so it leaves what post() needs here. Pack-local, so
  // two packs alive at once (the run and a gallery tile) cannot cross wires.
  let frostFrame = null;
  const paperPreset = paperPresetName(settings?.paperPreset);
  const paperStrengths = paperStrengthsOf(settings);
  return {
    name: 'watercolor',
    lightBg: true,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      // Frost runs day to dusk across its three stages, and the light is ONE
      // table: sky, both ridges, the foreground sheet, the lane and the snow
      // haze all come out of it, because a dusk sky over a noon lane reads as a
      // lit stage set rather than an evening.
      const frostLight = cab.id === 'frost'
        ? frostStageLight(backgroundContext?.stageIndex) : null;
      const frostSceneryFinish = cab.id === 'frost'
        ? (backgroundContext?.frostSceneryStudy === undefined
          ? FROST_COMBINED_SCENERY_FINISH : backgroundContext.frostSceneryStudy)
        : null;
      const sky = frostLight ? frostLight.sky : cab.sky;
      skyGrad(ctx, sky[0], sky[1]);
      frostFrame = cab.id === 'frost'
        ? {
          camX,
          stageIndex: backgroundContext?.stageIndex,
          // How far through the level the run is, which is what makes the
          // weather arrive rather than simply be on.
          progress: backgroundContext?.progress,
          strength: backgroundContext?.blizzard,
          // ground() and weather() are handed no scene, so the light travels
          // with the latch the same way the camera and the stage already do.
          light: frostLight,
        }
        : null;
      if (cab.id === 'frost') {
        if (paperPreview) {
          drawPaperSurface(ctx, backgroundPaintCoverage(ctx), `frost-paper-sky:${paperPreset}`,
            paperPreset, paperStrengths.sky);
        }
        drawFrostSky(ctx, camX, {
          paper: paperPreview, paperMaterial: paperPreset,
          paperStrength: paperStrengths.sky,
          stageIndex: backgroundContext?.stageIndex,
          t,
          backgroundContext,
          // The scene may dial the aurora, including to nothing. The gallery
          // bake-off rides this rather than a second copy of the painter.
          gain: backgroundContext?.auroraGain,
        });
      }
      // blotchy hills with irregular edges
      for (const [color, yb, amp, wl, f, depth] of [
        [frostLight ? frostLight.far : cab.far,
          sceneryRidgeBaseY(backgroundContext, 'farLandmark', 66, GROUND_Y), 66, 130, 0.12, 'far'],
        [frostLight ? frostLight.hills : cab.hills,
          sceneryRidgeBaseY(backgroundContext, 'near', 40, GROUND_Y), 40, 70, 0.3, 'near'],
      ]) {
        const frostY = cab.id === 'frost'
          ? yb - (backgroundContext?.portrait
            ? FROST_SCENERY_LIFT : FROST_LANDSCAPE_SCENERY_LIFT)
          : yb;
        ctx.save();
        ctx.translate(0, backgroundY(backgroundContext, depth));
        const frost = cab.id === 'frost';
        ctx.globalAlpha = frost ? FROST_HILL_ALPHA : 0.7;
        if (cab.id === 'surge') {
          const hillAlpha = ctx.globalAlpha;
          drawFrostScenery(ctx, camX, frostY, {
            layer: depth, paper: paperPreview, paperMaterial: paperPreset,
            paperStrength: paperStrengths.scenery,
            stageIndex: backgroundContext?.stageIndex,
            portrait: backgroundContext?.portrait === true,
            // The fortress windows blink on their own clock; nothing else on
            // these ridges is animated.
            t,
            cab,
            secondaryFeatures: null,
          });
          ctx.globalAlpha = hillAlpha;
        }
        const hillOptions = cab.id === 'frost'
          ? {
            paper: paperPreview, paperMaterial: paperPreset,
            paperStrength: paperStrengths.scenery, seamFree: true,
          }
          : paperPreview
            ? { paper: true, paperMaterial: paperPreset, paperStrength: paperStrengths.scenery }
            : null;
        // Gallery seam (src/dev/frost-landmark-ideas.js): a bake-off's candidate landmark,
        // in the slot the lift and the herd use, on either ridge — `behind` before the
        // ridge is laid (a peak it hides the foot of), `on` after it (something standing
        // on its crest, in front of the ridge and behind that ridge's rocks). The game
        // never passes one.
        const landmarkStudy = frost ? backgroundContext?.frostLandmarkStudy : null;
        const studyFrame = landmarkStudy && ((when) => {
          const view = backgroundPaintCoverage(ctx);
          return {
            when, t, camX, depth, view, factor: f, light: frostLight, color,
            crest: (x) => ridgeYAt(x, camX, frostY, amp, wl, f, { coverageLeft: view.left }),
            peak: frostY - amp,
            // What this ridge carries (rocks, fortresses, pines), in these coordinates.
            scenery: () => frostSceneryPlacements(ctx, camX, frostY, {
              layer: depth, stageIndex: backgroundContext?.stageIndex,
              portrait: backgroundContext?.portrait === true,
            }),
          };
        });
        if (landmarkStudy) {
          const a = ctx.globalAlpha; ctx.globalAlpha = 1;
          landmarkStudy(ctx, studyFrame('behind'));
          ctx.globalAlpha = a;
        }
        parallaxHills(ctx, camX, color, frostY, amp, wl, f,
          hillOptions);
        if (frost) {
          const coverage = backgroundPaintCoverage(ctx);
          frostSceneryFinish?.hill?.(ctx, {
            camX, baseY: frostY, amp, wl, factor: f, layer: depth,
            color, coverage, travel: camX * f * ZOOM,
            ridgeY: (x) => ridgeYAt(x, camX, frostY, amp, wl, f,
              { coverageLeft: coverage.left }),
          });
        }
        // The stage landmarks on the far ridge (stylePacks/frostLandmarks.js): the chair
        // lift over frost-1, the reindeer herd near the end of frost-2. After the ridge
        // and BEFORE its rocks and fortresses, which stand in front of a lift tower
        // rather than behind it (Peter, 24 Sep: a tower drawn over a spire read as
        // floating); the near hills still bury the feet of all of them.
        if (frost && depth === 'far') {
          ctx.globalAlpha = 1;
          const view = backgroundPaintCoverage(ctx);
          const crest = (x) => ridgeYAt(x, camX, frostY, amp, wl, f, { coverageLeft: view.left });
          const stage = backgroundContext?.stageIndex ?? 1;
          if (stage === 1 && Number.isFinite(totalDist) && totalDist > 0) {
            const x = frostLiftX(viewCenterX(ctx), camX, FROST_LIFT_AT_PX);
            // The ridge's own peak, so the line is hung off the HILLS rather than off a
            // screen y — see LIFT.rise.
            if (!outsideView(ctx, x - 230, 260)) drawFrostChairLift(ctx, t, x, crest, frostY - amp);
          }
          const progress = backgroundContext?.progress;
          if (stage === 2 && Number.isFinite(progress)) {
            const [a0, a1] = FROST_HERD_WINDOW;
            const k = (progress - a0) / (a1 - a0);
            if (k > 0 && k < 1) {
              // The rocks and fortresses this ridge carries, as x-spans on the crest:
              // the herd passes behind them, and they end AT the snow line, so the
              // herd is cut there rather than a sunk hoof's depth below it.
              const hides = frostSceneryPlacements(ctx, camX, frostY, {
                layer: depth, stageIndex: stage, portrait: backgroundContext?.portrait === true,
              })
                .filter((f) => f.kind !== 'pine' && Array.isArray(f.surface) && f.surface.length > 1)
                .map((f) => [f.x + f.surface[0].dx, f.x + f.surface[f.surface.length - 1].dx]);
              drawFrostReindeer(ctx, t, k, view, crest, hides);
            }
          }
        }
        if (landmarkStudy) {
          ctx.globalAlpha = 1;
          landmarkStudy(ctx, studyFrame('on'));
        } else if (frost && depth === 'near') {
          // The near ridge's wildlife and hill dwellings (frostWildlife.js): the fox,
          // polar bears, wolves, igloo, cabin and sled, each pinned to a point in its
          // stage, in the same slot — after the ridge, before its rocks and pines.
          ctx.globalAlpha = 1;
          const view = backgroundPaintCoverage(ctx);
          drawFrostWildlife(ctx, {
            t, camX, depth, view, color, light: frostLight, totalDist,
            stageIndex: backgroundContext?.stageIndex ?? 1,
            portrait: backgroundContext?.portrait === true,
            run: Number.isFinite(backgroundContext?.heroFrac),
            crest: (x) => ridgeYAt(x, camX, frostY, amp, wl, f, { coverageLeft: view.left }),
            scenery: () => frostSceneryPlacements(ctx, camX, frostY, {
              layer: depth, stageIndex: backgroundContext?.stageIndex,
              portrait: backgroundContext?.portrait === true,
            }),
            // The same ridge at another camera: an item's spot is settled once, from the
            // picture it passes mid-screen in, and then never moves.
            crestAt: (cam) => (x) => ridgeYAt(x, cam, frostY, amp, wl, f, { coverageLeft: view.left }),
            sceneryAt: (cam) => frostSceneryPlacements(ctx, cam, frostY, {
              layer: depth, stageIndex: backgroundContext?.stageIndex,
              portrait: backgroundContext?.portrait === true,
            }),
          });
        }
        if (frost) {
          // Frost scenery belongs to this ridge, so let the ridge establish
          // the support surface before placing the art. This keeps the full
          // fortress/rock silhouette visible and leaves the pine trunk down
          // to the snow line, while the following near sheet still naturally
          // occludes far scenery where the two layers overlap.
          ctx.globalAlpha = FROST_SCENERY_ALPHA;
          drawFrostScenery(ctx, camX, frostY, {
            layer: depth, paper: paperPreview, paperMaterial: paperPreset,
            paperStrength: paperStrengths.scenery,
            stageIndex: backgroundContext?.stageIndex,
            portrait: backgroundContext?.portrait === true,
            // The fortress windows blink on their own clock; nothing else on
            // these ridges is animated.
            t,
            cab,
            sceneryStudy: frostSceneryFinish,
            secondaryFeatures: undefined,
          });
        }
        // The offset second wash is useful watercolor texture elsewhere, but
        // on Frost it is a translucent duplicate ridge: its exposed edge
        // crosses the fortress/rock feet and recreates the floating hard line.
        // Frost gets one continuous opaque snow sheet instead.
        if (!frost) {
          ctx.globalAlpha = 0.4;
          parallaxHills(ctx, camX + 13, color, frostY + 4, amp, wl * 1.1, f,
            hillOptions);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (cab.id === 'frost') {
        const hill = (surface) => drawFrostForegroundHill(surface, camX, backgroundContext, {
          paper: paperPreview, paperMaterial: paperPreset,
          paperStrength: paperStrengths.scenery,
          color: frostLight.foreground,
        });
        // SETTLED — the near sheet lies UNDER the snow. Painting it over the
        // weather was tried (the gallery ran the two orders side by side at both
        // the Frost 3 opening and the ceiling): snow passing behind the near
        // bank is a real parallax cue, and it is not worth what it costs, which
        // is a translucent wash laid over the snow flattening the one thing in
        // the frame that is supposed to have depth in it.
        hill(ctx);
      }
      // The wash blobs are this cabinet's clouds, and they follow the same
      // rule as the Plumber flock: weather passes in front of the country, so
      // a blob composed into a low band still reads instead of vanishing
      // behind a hill.
      const cloudOffset = backgroundY(backgroundContext, 'clouds');
      for (let i = 0; i < 6; i++) {
        const bx = wrapIntoView(ctx, i * 120 - camX * 0.1 * ZOOM, 60);
        const by = portraitCloudY(backgroundContext, i, 30 + (i * 47) % 80) + cloudOffset;
        const g = ctx.createRadialGradient(bx, by, 4, bx, by, 40);
        g.addColorStop(0, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bx - 40, by - 40, 80, 80);
      }
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      // Snow is bright because of what is falling on it, so the lane goes down
      // with the sky. Only the two colours are swapped — the cabinet itself is
      // handed through untouched, because terrain and pits read it by identity.
      const light = cab.id === 'frost' ? (frostFrame?.light || frostStageLight(1)) : null;
      ctx.globalAlpha = 0.85;
      drawGapsAwareGround(ctx, camX, cab, obstacles,
        light ? light.ground : cab.ground,
        light ? light.groundDark : cab.groundDark, overhangs, t, drawW);
      ctx.globalAlpha = 1;
    },
    // WEATHER IS NOT A FRAME TREATMENT, so it does not live in post().
    //
    // post() paints into the backbuffer, and the hero does not: he is queued to
    // a separate full-resolution overlay that composites ON TOP of that. Snow
    // painted in post() is therefore snow BEHIND the player, which is the exact
    // opposite of the point — you are supposed to be running through it. The run
    // calls this hook on the overlay instead, after the hero and before the HUD.
    weather(ctx, t) {
      const snow = frostFrame;
      if (snow) drawFrostBlizzard(ctx, t, snow.camX, snow);
    },
    post(ctx, t) {
      if (paperPreview) return;
      // paper grain: sparse dot lattice (tiled pattern — one fill)
      patternFill(ctx, 'paperGrain', 6, 8, (c) => {
        c.fillStyle = 'rgba(120,100,80,0.06)';
        c.fillRect(0, 0, 1, 1);
        c.fillRect(2, 4, 1, 1);
      });
      ctx.fillStyle = 'rgba(255,250,240,0.05)';
      ctx.fillRect(0, 0, W, H);
    },
  };
}

function vhsPack(settings) {
  return {
    name: 'vhs',
    dark: true,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      const farBaseY = sceneryRidgeBaseY(backgroundContext, 'farLandmark', 55, GROUND_Y);
      const nearBaseY = sceneryRidgeBaseY(backgroundContext, 'near', 32, GROUND_Y);
      ctx.save();
      ctx.translate(0, backgroundY(backgroundContext, 'far'));
      if (cab.id === 'crypt' || cab.id === 'surge') {
        drawCryptScenery(ctx, camX, farBaseY, { layer: 'far' });
      }
      parallaxHills(ctx, camX, cab.far, farBaseY, 55, 100, 0.15);
      ctx.restore();
      ctx.save();
      ctx.translate(0, backgroundY(backgroundContext, 'near'));
      if (cab.id === 'crypt' || cab.id === 'surge') {
        drawCryptScenery(ctx, camX, nearBaseY, { layer: 'near' });
      }
      parallaxHills(ctx, camX, cab.hills, nearBaseY, 32, 56, 0.35);
      ctx.restore();
      // fog
      ctx.fillStyle = 'rgba(140,120,160,0.12)';
      const coverage = backgroundPaintCoverage(ctx);
      ctx.fillRect(coverage.left, GROUND_Y - 40, coverage.width, 40);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t, drawW);
    },
    post(ctx, t) {
      // scanlines (tiled pattern — one fill)
      patternFill(ctx, 'vhsScan', 1, 3, (c) => {
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(0, 0, 1, 1);
      });
      // chroma edges
      ctx.fillStyle = 'rgba(255,0,80,0.05)';
      ctx.fillRect(1, 0, W, H);
      ctx.fillStyle = 'rgba(0,255,240,0.05)';
      ctx.fillRect(-1, 0, W, H);
      // tracking wobble band
      {
        const y = (t * 40) % (H + 30) - 15;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, y, W, 8);
      }
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(W - 46, H - 14, 4, 6); // "PLAY ▶" glyph-ish
      ctx.beginPath();
      ctx.moveTo(W - 38, H - 14); ctx.lineTo(W - 38, H - 8); ctx.lineTo(W - 32, H - 11);
      ctx.closePath(); ctx.fill();
    },
  };
}

// Game Boy Color as remembered rather than photographed: a reflective
// yellow-green screen, dark blue-green linework and a tiny handful of crude
// spot colours. The art stays vector-authored and finely described; the
// limitation is the palette, not the geometry.
// HOW THICK THE ROAD'S EDGE IS, in WORLD px — and thinner than every other
// pack's, on purpose.
//
// Eight packs cap their apron with 3px of their own ground colour, and on those
// it is a lit surface: near in value to the body under it, so it reads as a
// highlight along the lip. This one is INK on a pale panel — the hardest edge
// on the screen — and at the same 3 it stopped being an edge and became a bar.
//
// The number is bigger here than it looks, because the road is drawn INSIDE the
// world transform and the camera multiplies it. At the resting ZOOM of 2, 3px is
// 6 backbuffer px; on a phone, where the zoom tier goes higher, nearer 7 — a
// quarter of the 24px hero standing on it. At 1 the contrast still carries it at
// every zoom, which is the whole reason this pack can afford to go thinner than
// the others: none of them could.
export const LCD_ROAD_INK = 1;

const LCD_PANEL = '#a8c66c';
// GRAPHITE, not navy: a near-black neutral, which is what a Game & Watch's
// segments are on its grey-green screen. Chosen 2 Sep 2026 from a sheet of
// five (work/local/_lcd-ink-sheet.mjs); every other ink on the panel — wall
// lines, ghost cells, furniture print, the lattice — is this family at an
// alpha, so the panel is one ink and the coral.
const LCD_INK = '#3c3f45';
// The screen colour as it reaches the lane. A hole clearing its own mouth has
// to restore this exact value or the break reads as a lit strip.
const LCD_PANEL_LIT = '#dce49a';

// The phone portrait panel is the same 480px-wide logical screen in a narrow
// CSS viewport. Keep a coarser six-pixel lattice there: it survives the phone
// resample as a readable grid instead of the three-pixel landscape lattice's
// moire, while preserving the authored building lines in both orientations.
export const LCD_SCREEN_GRID_CELL = 3;
export const LCD_PORTRAIT_SCREEN_GRID_CELL = 6;
const LCD_PORTRAIT_GRID_LINE_W = 2;
export function lcdScreenGridCellSize(settings = {}) {
  return settings?.portraitPresentation
    ? LCD_PORTRAIT_SCREEN_GRID_CELL : LCD_SCREEN_GRID_CELL;
}
// Portrait LCD's periodic lattice starts its two-pixel rule at cell - 2.
// Mechanical pit bottoms use the same rule, rounded toward the lower side of
// the panel so a wheel can never be clipped by the closing line. The argument
// is SCREEN space: the world painter supplies the inverse camera transform
// when it needs to place this rule in its own coordinates.
export function lcdPortraitGridLineY(y) {
  const unit = LCD_PORTRAIT_SCREEN_GRID_CELL;
  const origin = unit - LCD_PORTRAIT_GRID_LINE_W;
  const value = Number(y);
  if (!Number.isFinite(value)) return origin;
  return origin + Math.ceil((value - origin) / unit) * unit;
}

// The post() lattice uses the same origin on x as it does on y. Pit openings
// are cut by the world painter, so a raw obstacle edge can land between two
// printed rules after the portrait zoom and presentation shift. Expand the
// rendered interval to the surrounding rules: the road cut, dry-bay fill and
// both walls then own one identical interval, with no one-pixel city sliver
// left beside the frame.
function lcdPortraitGridLineX(x, direction = 'nearest') {
  const unit = LCD_PORTRAIT_SCREEN_GRID_CELL;
  const origin = unit - LCD_PORTRAIT_GRID_LINE_W;
  const value = Number(x);
  if (!Number.isFinite(value)) return origin;
  const n = (value - origin) / unit;
  if (direction === 'floor') return origin + Math.floor(n) * unit;
  if (direction === 'ceil') return origin + Math.ceil(n) * unit;
  return origin + Math.round(n) * unit;
}

// THREE SCENES, not one city with its gain turned up. These are the authored
// backdrops for RHYTHM BANKRUPTCY's three stages; only the cells inside and
// above them switch. Coordinates are screen-space because this cabinet keeps
// its skyline fixed to the display while the lane runs underneath it.
// EVERY HEIGHT IN THIS TABLE WENT UP 8 WHEN GROUND_Y CAME DOWN 8, and that is
// the rule rather than a coincidence to be tidied away. A roof is
// `GROUND_Y - h`, so raising both by the same number leaves every roof on the
// exact screen y it was authored at — the gorilla, his barrel, the plane's lane
// under the beat ribbon, the clock bay, the masts the crossing is measured
// against: the whole pinned stack above the skyline comes out byte-identical.
// What changed is the BOTTOM. The eight pixels the camera took off the apron
// went into the FACADES, so the city stands eight deeper into the frame instead
// of the road's dirt doing nothing with them, which is the entire reason the
// groundline moved at all. Move GROUND_Y again and these move with it, or the
// skyline slides down the panel and takes every authored contact above it.
// ON THE GRAPH PAPER. The screen lattice (see post()) rules a line every
// three pixels, at every coordinate that is 2 mod 3, and since 2 Sep 2026 the
// buildings are drawn ON it: a wall stands on a rule (x ≡ 2 mod 3), a roof
// lies on a rule (h ≡ 2 mod 3, because GROUND_Y is 232), a width is a whole
// number of cells, and a facade's width is set by how many windows it has —
// LCD_FACADE_W[cols] — so every two-window building is one width and every
// three-window building another. Windows and wall lines follow from the same
// rule: see lcdWindowCells and lcdLeanDetail. Roof furniture is centred on
// the facade and not held to the grid; Peter asked for the BUILDINGS.
//
// AND EQUIDISTANT. Within a stage every gap between neighbours is the same
// whole number of cells — 12 on stage 1 (its eight structures, the tower
// among them, are the widest set), 15 on stages 2 and 3 — with what
// is left over split between the two screen edges. A gap is a multiple of 3
// and so is every width, so walking left to right from a wall on a rule keeps
// every wall on a rule.
const LCD_U = LCD_SCREEN_GRID_CELL;                // one graph-paper cell
const LCD_FACADE_W = { 2: 36, 3: 51 };             // 5N + 2 cells: 2u margin, 3u window, 2u gutter
const LCD_COL_PITCH = 15;                          // window + gutter, 5 cells
const LCD_ROW_PITCH = 12;                          // window + gutter, 4 cells
const LCD_CELL_W = 8;                              // the fill inside a 3-cell box
const LCD_CELL_H = 5;                              // the fill inside a 2-cell box
// `bankCell`/`bankPitch` are the rooftop meter's own cells (lcdEqualizer). They
// ride the grid because a meter printed at the landscape pitch on a facade
// printed at the portrait one reads as a second, finer building standing on
// the first — the one scale break a zoomed-in city cannot hide.
//
// `chuteReach` is how far past his wall Kong's barrel falls when there is no
// neighbour to centre it between (lcdChuteX). It rides the grid because the
// two panels draw their walls at different weights, but it stays near the
// barrel's own width in both: the sprite does not scale, and the distance that
// says the barrel is HIS is the one measured off his brickwork, not the one
// measured in facades (Peter: "barrels closer to Kong's building").
const LCD_GRID = Object.freeze({
  unit: LCD_U, colPitch: LCD_COL_PITCH, rowPitch: LCD_ROW_PITCH,
  cellW: LCD_CELL_W, cellH: LCD_CELL_H, lineW: 1, bankCell: 3, bankPitch: 5,
  chuteReach: 17,
});
// Portrait gets a larger, lower-density print grid. The authored landscape
// grid remains three-pixel graph paper; these metrics are used only by the
// tagged rhythm-1 portrait facades so the windows and wall rules survive the
// phone's narrower physical presentation.
const LCD_PORTRAIT_GRID = Object.freeze({
  unit: 4, colPitch: 20, rowPitch: 16, cellW: 12, cellH: 8, lineW: 2,
  bankCell: 4, bankPitch: 7,
  // TEN OF AIR, not a quarter of the facade. Scaling the gap with the wall it
  // falls past was the obvious reading of "proportional" and it was wrong in
  // the eye: the barrel is one fixed sprite, so what says "his" is the
  // ABSOLUTE distance from his brickwork, and a wider facade beside the same
  // barrel just reads as a barrel somebody else dropped. Two up from the
  // landscape panel's nine, because the portrait wall is drawn heavier.
  chuteReach: 18,
});
const lcdGridFor = (building) => building?.[4] === 'portrait-grid'
  ? LCD_PORTRAIT_GRID : LCD_GRID;
const LCD_PORTRAIT_COMBO_W = 2 * LCD_PORTRAIT_GRID.unit
  + 3 * LCD_PORTRAIT_GRID.colPitch;
// Portrait's LCD city is a scenic backplate, not the playable lane. Move the
// complete authored panel a small, fixed amount so the rooftop gorilla clears
// the phone's left crop and gets more headroom. Landscape and all non-LCD
// cabinets remain unchanged; the renderer supplies the portrait contract.
export const LCD_PORTRAIT_CITY_SHIFT = Object.freeze({ x: 52, y: -12 });
const LCD_CITY_SCENES = [
  null,
  {
    // Reading order, left to right: the clock tower opens the scene, three
    // buildings walk up to the invader billboard, THEN the DONKEY KONG tower,
    // and the skyline continues past it. This authored arrangement is shared
    // by landscape and must not be changed by portrait composition work.
    //
    // 125 TALL, AND THE CRASH STILL SETS IT — but it is no longer a ceiling.
    // Everything above this roof is one rigid stack: his skull tops out at
    // roof-42, the barrel rests on his raised hands at roof-43 and reaches
    // roof-57. While the plane's lane was pinned hard under the beat ribbon's
    // band the contact depth was simply 119 - roof, so every pixel of tower
    // drove the aircraft further down the barrel and closer to his scalp: at
    // 118 the barrel's top was ON the ribbon line and the belly passed two
    // pixels off his hair, which read as landing on the gorilla, and 110 (118
    // in today's numbers, after GROUND_Y) was as tall as he could stand.
    //
    // THE RIBBON MOVED TO THE TOP OF THE SCREEN, and the stack went up with it
    // WHOLE. BEAT_RIBBON_BOTTOM was 40 and is 24, so sixteen rows of sky opened
    // between the strip and this skyline — and the answer was not to redesign
    // the contact but to TRANSLATE it: the tower up twelve (113 -> 125) and both
    // ends of the crossing up twelve with it (plane.from 68 -> 56, plane.to
    // 55 -> 43). A rigid translate is the only edit that cannot change the gag,
    // because the strike is solved from the difference between the two and the
    // difference did not move: barrel top 50, striking belly 56, straight
    // through the top of the barrel exactly as before, and the crossings that
    // MISS still clear his skull by eighteen (see LCD_PLANE_MISS_LIFT).
    // What the twelve buys is the SKY: the lane clears the transmitter's
    // outermost signal ring and the smokestack's plume for the first time, and
    // the tower stands twelve deeper into a frame that just got taller. The
    // three buildings this stack has to stay clear of never moved, so every one
    // of those clearances went UP by twelve and none of them went down.
    buildings: [
      [17, 36, 149, 'clockworks'], [65, 51, 101, 'storefront'], [128, 36, 125, 'deco'],
      [176, 36, 95, 'fire-escape'],
      [323, 51, 113, 'office'], [386, 36, 74, 'storefront'], [434, 36, 89, 'workshop'],
    ],
    // UP TWELVE WITH THE REST OF THE SKY. They were authored under a ribbon
    // whose band ended at 40 and they kept those rows after it moved to 24,
    // which left sixteen empty pixels above them and the wisps sitting down
    // among the rooftop furniture. Four lattice rules up, same spread.
    // The cloud band is above the tallest rooftop detail, not merely above
    // the facades. The transmitter's outer ring reaches y=51; keeping the
    // cloud bodies below y=48 leaves a real gap even after the long-run wrap
    // carries any cloud across the whole panel.
    clouds: [[28, 28], [184, 30], [346, 34]],
    // THE CLOCK IS THE BUILDING. [building index, dial radius] — the dial is
    // SET INTO the tower's own facade, in a clock stage with a lintel over it
    // and a sill under it, not stood on the roof on braced feet.
    //
    // Which is why the spec stopped being screen-space. A rooftop case had to
    // name its own y and then be kept in step with a roof it merely rested on,
    // and every change to the tower's height was two edits that had to agree.
    // The stage is a course of the shaft now, so it is solved from the building
    // (see lcdClockBay) and there is nothing left to drift.
    //
    // AND THE TOWER GREW INTO THE ROOM THAT FREED UP — twice over, because the
    // case was costing sky at both ends. It stood 8px above the roof, and it
    // was also the thing the plane's ENTRY altitude was set to slide under: 101
    // -> 140, with `plane.from` lifted 78 -> 68 to match, which is the one
    // number that was only ever low because something stood on this roof.
    // The binding case is the plane's first two steps, still climbing over this
    // end of the skyline; at 140 its belly cleared the tower's crown blocks by
    // five, and since the lane went up twelve with the beat ribbon it clears
    // them by seventeen. The lane levels at 43 and tops out at 44, ten under
    // the strip, and the gorilla tops the skyline at y 64.
    clock: [0, 16],
    // The DONKEY KONG tower: open girder floors zigzagging down its whole
    // face, the big rooftop gorilla on top and a little runner two floors
    // below him. [x, w, h]. The gorilla lives HERE now, so this scene sets no
    // rooftopGorilla of its own.
    gameWatch: [224, 87, 125],
    // Beat-stepped rooftop furniture: pixel billboards on the buildings at
    // these indices, a transmitter mast whose signal rings walk outward a
    // step per beat, chimneys whose puff columns live on the beat, and a
    // pixel plane that crosses the sky once every sixteen bars. Billboards
    // and the mast suppress their building's own crown; a chimney shares its
    // roof with whatever crown is already there.
    billboards: [[1, 'chart'], [3, 'invader'], [5, 'burger'], [6, 'cassette']],
    transmitter: 2,
    smokestacks: [[4, 20]],
    // In low over the left-hand roofs, level by the tower's centre line
    // (224 + 88/2). Snapped to the 2px grid the cruise is y 44, so the belly
    // runs at 56: through the top of the raised barrel (top 50) and eight
    // clear of the gorilla's skull (top 64).
    //
    // BOTH ENDS WENT UP TWELVE WITH THE TOWER, and neither number was chosen
    // again — 68/55 became 56/43 because the whole pinned stack translated
    // when the beat ribbon left the sky (see the note on the tower above). The
    // two things this lane is measured against on the way past are the ones
    // that did NOT move: the transmitter's outermost signal ring (y 51) and
    // the smokestack's plume (top 64), and the crossing now passes clear of
    // both instead of drawing through them.
    //
    // THIS IS THE LANE OF THE CROSSING THAT HITS THE BARREL. The two that miss
    // it fly ten higher — cruise 34, belly 46, eighteen over his skull — and
    // that still leaves ten of clear sky under the strip. See
    // LCD_PLANE_MISS_LIFT.
    // ...AND IT ALWAYS TOWS SOMETHING. A banner plane with a blank banner is
    // the one prop on this skyline that is drawn and says nothing — it used to
    // trail a single unlettered pixel, which reads as a flag nobody finished.
    //
    // `tow` is the rotation, one line per crossing, so the sky is a different
    // sentence every sixteen bars rather than the same advert on a timer. Short
    // and long on purpose: a two-letter banner and an eleven-letter one are
    // different SHAPES at a distance, which is what stops the rotation reading
    // as one prop with the text swapped.
    //
    // `banner` is the one pass that carries something else — the KEY CHANGE
    // announcement, in front of the modulation at bar 61 (the +4 the whole band
    // takes in rhythm.js's arrangement and keeps to the end of the form). One
    // authored bar, because that arrangement moves its transpose eight times
    // and only this one is the modulation — the rest are two-bar lifts.
    // tests/lcd-background.js checks the bar names a real one.
    plane: {
      from: 56, to: 43, level: 268,
      tow: ['INSERT COIN', 'GG', '♥♥♥'],
      banner: { text: 'KEY CHANGE', bar: 61 },
    },
  },
  {
    // EIGHT structures with even air, like the other two scenes.
    buildings: [
      // THE RAIL IS THE CEILING. Peter (2026-09-03): "raise the monorail a bit
      // more and lower any other buildings so they don't extend past it". The
      // girder rules y 55 and the cars ride 43-55, and nothing on this
      // skyline — facade, board or meter — reaches above it.
      //
      // THE CEILING WENT UP TWELVE when the beat ribbon left the sky
      // (BEAT_RIBBON_BOTTOM 40 -> 24), and the rail took the tall spire with
      // it: train.y 53 -> 41 and the spire (index 3) 155 -> 167, so its roof is
      // still exactly twelve clear of the girder and the rail still passes over
      // it rather than landing tangent to it. Only those two moved. Every other
      // roof stayed where it was authored and simply gained twelve pixels of
      // air under the service, which is the point — a rail with daylight over
      // the city reads as elevated, and one grazing the rooftops reads as a
      // line drawn on them.
      //
      // AND DOWN TWO AGAIN when the ribbon itself thickened (RIBBON_H 12 -> 15,
      // BEAT_RIBBON_BOTTOM 24 -> 25.5): train.y 41 -> 43, the girder with it,
      // preserving the one-clear gap the corner clouds need under it. Nothing
      // else moved — the ceiling only gained air, which is always safe.
      //
      // The spire's roof is BARE because a 37px meter bank on it would stand
      // above the rail. It was 51 wide and 167 tall for an afternoon, when the
      // service stopped on it and needed a platform; the width is back to what
      // this row was authored with. The far spire came down from 149 to
      // 134 so its chase board's top (roof - 8 - 22 = 68) sits under the
      // girder, and now sits fifteen under it; the washer's deco (5) keeps its
      // 146 because its roof is bare now (bareRoofs) and 86 was under the rail
      // on its own even before it rose.
      // THE CHART'S ROOF IS NOT A LANDMARK. It answers to the run, so it
      // belongs below the traffic: 104 lands the board's top edge at 88,
      // thirty-five clear of the rail, so the board and the service never
      // share a line. The opener beside it came up to 89 with it; both were
      // the two stubs at this end of the skyline and the pair now stand as a
      // step up into the spire rather than as a gap in front of it.
      // The combo board's building is three wide; the music hall beside it is
      // two, so the row's total and its gaps are unchanged.
      [20, 36, 89, 'speaker'], [71, 51, 104, 'deco'], [137, 36, 80, 'music-hall'],
      [188, 36, 167, 'spire'], [239, 51, 59, 'speaker'], [305, 36, 146, 'deco'],
      [356, 51, 74, 'music-hall'], [422, 36, 134, 'spire'],
    ],
    // IN THE TOP CORNERS, ABOVE THE RAIL — Peter: "keep clouds in top right and
    // top left above monorail line". The strip between the beat ribbon's band
    // and the cars is fifteen rows, and a cloud with its bob is fifteen; so
    // they sit at 29, filling it exactly: top row 28, two clear of the strip
    // above, bottom row 42, one clear of the cars below.
    //
    // MOVED DOWN TWO WITH THE RIBBON'S OWN GROWTH: BEAT_RIBBON_BOTTOM went
    // 24 -> 25.5 when the girder-ring pass thickened the strip (RIBBON_H 12 ->
    // 15), and these clouds kept authoring against the old figure — the
    // regression tests caught it (top row 26 against a strip now ending 25.5,
    // not the two-clear this comment always claimed). The girder and the cars
    // moved the same two, in lockstep, so the one-clear gap below survives.
    //
    // AND THEY ARE OUT OF THE STRIP ENTIRELY NOW, not merely out of its
    // columns. Under the old geometry the band was y 25-38 across x 120-360
    // and these three sat at 38 in the corners, overlapping its ROWS and
    // dodging it sideways. The ribbon has since moved to the top of the screen
    // and grown wider (its plate reaches x 73-407 at the desktop zoom), which
    // would have put the middle cloud under it — so the corner dodge is gone
    // and the clearance is vertical, which is the kind that does not depend on
    // a zoom tier.
    //
    // They do not cross the panel: each SWAYS within its corner, `cloudSway`
    // pixels out and back at its own pace, see lcdCloudLayer. They spent an
    // hour under the rail instead, behind the skyline, and showed straight
    // through the walls — a facade is a 7% wash.
    clouds: [[8, 29], [378, 29], [434, 29]],
    cloudSway: 24,
    // Stage 2 was the one panel with no sky or rooftop life at all — windows,
    // equalizers and clouds and nothing else. It gets the working city: a
    // searchlight sweeping off each music hall, a commuter service on a monorail
    // over the skyline, and a window washer who is having a day.
    //
    // NO REPOSSESSION HELICOPTER, and it was here for months. It crossed on a
    // cable and the billboard it passed over left with it, which is the joke
    // the cabinet is named for — except the joke never played: it named a roof
    // with no sign on it, so it took nothing, and it was drawn already loaded,
    // so there was no before and no after. Both were fixed, Peter watched the
    // repaired version, and cut it anyway: "the helicopter gag is weak". A gag
    // that needs a paragraph to explain why it is a gag is not one. What
    // carries this panel is the working city, not a punchline crossing it.
    //
    // NO PLANE EITHER. It used to tow a line through y 62-74, which is
    // the same band the service runs in and the band both billboards
    // hang their boards over — three things crossing one lane, and the sky read
    // as traffic rather than as a city. Stage 2 is the panel with the most
    // going on at roof height already: two searchlights, a train and a washer.
    // The crossing belongs to stages 1 and 3, which have the air for
    // it; here the train IS the thing that crosses.
    // ONE LAMP ON EACH MUSIC HALL. The second is Peter's ("could we have 2
    // spotlights? and with a bit more reach"), and building 6 is the only free
    // roof that is not standing in a canyon: 0 and 4 have a tower over them on
    // both sides, and every other roof already carries a board or the washer.
    //
    // EACH LAMP STANDS BETWEEN ITS OWN METER AND THE MIDDLE OF THE PANEL — 2's
    // at 161 with its bank at 148-161, 6's at 365 with its bank at 372-393 —
    // because the beam leans inward (see lcdSearchlight) and a beam leaning
    // over its own equalizer washes the one thing on that roof that is a
    // READING. Mounted at the outboard end instead, 6's lamp raked straight up
    // its bank at full strength and pinked out three rows of cells.
    searchlights: [[2, 24], [6, 9]],
    // THE LANE: the girder on rule 53 (y + 12), the cars on 41-53 above every
    // other roof. FOUR cars, a hundred pixels of train on a 480 panel. It
    // dropped to three for an hour while the service still stopped at a
    // platform and had to fit one; nothing stops now, so it is back to the
    // length it was authored with. It ran at 77 once, behind the tallest
    // tower, then at 65; see the buildings note above for why it rose twice.
    // The
    // service runs from the first phase (it waited for the second; Peter:
    // "don't wait so long for the first monorail") — from the beat the skyline
    // has landed. The viaduct is drawn live from beat one (lcdViaduct).
    train: { y: 43, cars: 4, fromPhase: 0 },
    washer: [5, 20],
    // ROOFS THAT CARRY NO METER. The washer's, because the roof carries one
    // thing and his is the man on the cradle (Peter: "remove led from roof of
    // window washer building"); and the tall spire's, because a bank on it
    // would be the one thing on this panel standing above the rail.
    bareRoofs: [3, 5],
    // Same swap as stage 1, for the same reason: the chart near the hero,
    // the cassette out at the edge.
    // The far roof runs the maze game's attract screen — see lcdChaseGrid. It
    // took the cassette's berth: a cassette is a still life, and this end of
    // the skyline is the one that had nothing moving on it.
    // One building fewer, so the two boards move down an index each: the chart
    // still hangs on the second facade and the chase board on the gorilla's.
    billboards: [[1, 'chart'], [6, 'chase']],
  },
  {
    // EIGHT structures with even air between them, like stage 1. The
    // gorilla's deco stands at 131 so the crossing clears his raised barrel
    // rather than being eclipsed by it (see `plane` below), and his thrown
    // barrels fall down a ghosted chute beside his building (barrelDrop).
    //
    // HE STANDS ON SIX NOW, NOT FOUR, and the swap is the lane's doing rather
    // than the skyline's. The barrels he drops are real hazards on this stage:
    // one comes down the chute, reaches the street and then comes FORWARD out
    // of the backdrop into the road, and the road it has to cross to get there
    // is the whole of the effect. From building 4 the chute stood at screen
    // 292, which is barely two beats of travel from the hero and gave the
    // barrel no room to arrive from anywhere — it simply appeared beside him.
    // Building 6 puts the chute at 410, a dozen pixels from where a lane
    // barrel first crosses into frame, so the thing that lands at the foot of
    // the chute and the thing that rolls at you are in the same place at the
    // same moment and read as one object.
    //
    // Only the height and the style move; the x/w grid and its even air are
    // untouched. Four takes six's relay-126 (its mast still tops out at 79,
    // the number the plane's lane is measured against) and six takes the
    // gorilla's deco.
    buildings: [
      // THE OPENING PAIR STANDS UP: 65 -> 89 and 86 -> 110. They were the two
      // stubs the panel opened on, and the ceiling over each is its own. The
      // transmitter's building carries a mast whose outermost signal ring tops
      // out a fixed 56 above its roof — at 89 that is y 87, and the crossing's
      // rig bottoms out at 58-60 over these columns, so the broadcast climbs
      // twenty-seven clear of the aircraft. The board's building answers to the
      // same lane: at 110 the board's top edge is 82 against a rig bottom of 52
      // over its span, thirty of air, and the beat ribbon's band ends at 24 well
      // above that. Both clearances grew by twelve when the crossing rose with
      // the beat ribbon; neither of these two buildings moved. Only the heights
      // moved; the x/w grid and its even air are untouched.
      // FOUR THREE-WIDE FACADES — the combo board's, the two tall ones and the
      // closer — with the gaps closed to 15 to fit them, so the board's
      // building starts at 59 and the sign's centre lands near 84: a little
      // LEFT of the hero, who stands at screen x 112-160. The opener stays two
      // wide on purpose; widening it pushed the sign right, under him. Edges
      // 8 and 4.
      // ONE GAP IS DOUBLE THE REST, and it is the chute's. The barrel that
      // falls beside the gorilla had 15px of air to come down — the barrel is
      // 16 wide, so it kissed both walls the whole way and the drop read as
      // scraping past the neighbour. His right-hand gap is 30 (+5 cells), and
      // the whole row moved 2 cells LEFT to pay for it, so the skyline keeps
      // its width and only the air around the chute changed.
      // THE WHOLE ROW SITS ONE GAP LEFT of where it was drawn. With the gorilla
      // moved to the end, his chute had only the sliver between his wall and the
      // frame edge to fall through and the barrel came down flush against his
      // brickwork; before the move it had clear air either side. Shifting every
      // building by one 15-cell gap gives that back without touching the
      // spacing between them — the skyline is the same skyline, one step over,
      // and the leftmost facade runs off the edge as a city should.
      // SEVEN BUILDINGS, NOT EIGHT, AND THEY BREATHE. Shifting the row left to
      // give the chute its air ran the first facade off the panel; rather than
      // live with a cut-off building, the shortest one (the 53-high workshop,
      // third along) comes out and the rest re-space across the whole width.
      // Gaps go from 15 to 21, which is the room the panel has once a building
      // is gone — and the skyline reads better for it, since the workshop was
      // the one facade with nothing on its roof.
      //
      // The gorilla's building does not move: his chute is centred on it, so
      // everything else spaces up to him.
      [8, 36, 89, 'ducts'], [65, 51, 110, 'relay'], [137, 51, 125, 'industrial'],
      // The fifth is the SHORT one now. Losing the workshop took the panel's
      // only genuinely low roof with it, and a skyline whose facades are all
      // within sixty px of each other reads as one wall — the backdrop test
      // holds stage 3 to a roof at or under 56 and a tower at or over 134, and
      // it is right to. Fifty-two on this one restores the range without
      // putting a building back.
      [209, 51, 134, 'relay'], [281, 36, 52, 'ducts'],
      // THE GORILLA STANDS ON THE LAST BUILDING. He was second from the right,
      // which put him in the middle of the villain's roam — the copter had to
      // dip under him on every pass — and left the finish flag to cross his
      // face at the end of the stage. Last, he is out of both: the roam does
      // not reach that far and the flag arrives beyond him. The two entries
      // simply trade places, so the skyline's grid is unchanged.
      [338, 51, 77, 'industrial'], [410, 36, 131, 'deco'],
    ],
    // UP TWELVE WITH THE CROSSING AND THE GORILLA, for the reason given on
    // the plane below: the ribbon left the sky and the whole sky followed it.
    // The third cloud got one more pixel down when the ribbon itself thickened
    // (BEAT_RIBBON_BOTTOM 24 -> 25.5) — it was the only one of the three that
    // strip growth actually reached; the other two already cleared it.
    clouds: [[18, 34], [264, 40], [398, 29]],
    // THE HIGH LANE, AND ON THIS PANEL IT CLEARS HIM. Stage 1 owns the gag
    // where the plane flies into the barrel; stage 3 has no barrel to take, so
    // its crossing has to read as a plain miss — and for a long time it did
    // not. The aircraft went behind his face for four beats, disappeared whole
    // for one, and came back out through his raised arm. Drawn-behind is not
    // the same as missed: he is opaque and he is drawn after the plane, so all
    // the eclipse bought was a clean edge on a picture of a collision.
    //
    // What the lane has to clear is the BARREL he raises once a bar to
    // roof-57, and the rig's underside is the number that clears it: the towed
    // banner is 11 tall and hangs from the fuselage, so plane and banner bottom
    // out together twelve under the aircraft's own y.
    //
    // BOTH ENDS WENT UP TWELVE WHEN THE BEAT RIBBON DID, AND HIS BUILDING WITH
    // THEM (119 -> 131). The clearance is a DIFFERENCE, and a difference only
    // survives if everything inside it moves together — so this is one rigid
    // translate rather than three numbers chosen again, and what it was tuned
    // for comes out unchanged: eighteen pixels over his skull (top 59), two
    // between the towed banner (bottom 42) and the raised barrel (top 44) on
    // the one beat of the bar they share a column.
    //
    // What the twelve buys is everything the lane passes on the way. The seven
    // buildings that did NOT move each gained twelve pixels of daylight under
    // it — the transmitter's signal rings on building 0 (top 87), the relay
    // mast on 4 (top 79), the counting board on 1 (top 92) — and the cruise
    // still stops six short of the strip. He is the tallest thing on this
    // skyline by twenty.
    plane: { from: 54, to: 30, level: 200, tow: ['HIGH SCORE', 'ONE MORE GO', 'PRESS START'] },
    // ...AND ONCE IN A WHILE IT TOWS SOMETHING ELSE. The witch's threat off the
    // Emerald City's sky, on the crossing this panel already flies — RARELY,
    // which is what makes it a gag rather than a fourth line in the rotation.
    // The run rolls it (RunState.skyOmenBeat) and hands the panel a clock;
    // the first crossing to take off after that clock starts tows this instead
    // of its turn's line, and the rotation is not consumed by it. Without a
    // roll the panel draws what it always drew. See lcdPlaneCyc.
    omen: { text: 'SURRENDER DOROTHY' },
    // THE SHARE PRICE FOLLOWS THE PLAYER INTO THE LAST STAGE. Stages 1 and 2
    // both hang the chart on their second building, over the roof the hero at
    // screen x 56 is actually under, and stage 3 was the one panel that lost
    // it — so the board that answers to the run went dark exactly where the
    // run gets hard, and the cheer thumb had nowhere to appear. Same berth as
    // the other two: building 1, roof 116, so the board's top lands at 84.
    // The crossing is still climbing over this column — belly 48 — and the beat
    // ribbon's band ends at 24, so it slots under one and over the other with
    // room either side, and the building's own relay mast and lamp cap step
    // aside for the board (see crowned).
    billboards: [[1, 'chart']],
    // ...which makes him the last one. The chute reads its x off this index,
    // and with no building to its right it falls in the air between his wall
    // and the frame edge — see lcdChuteX, which already has that case.
    rooftopGorilla: 6,
    barrelDrop: true,
    // THE QUIET PANEL GETS A WORKING HALF. Stage 3 was the emptiest of the
    // three by a wide margin — a measured 7.5% of its pixels ever moved against
    // 13% for the other two — and nearly all of what did was in the sky: the
    // clouds, the crossing, and the gorilla away on the right. The whole left
    // and centre of the skyline stood still for the entire run, which is the
    // last stage of the cabinet and the one that should be busiest.
    //
    // Both pieces are the existing painters on existing hooks, not new art.
    // This panel already owns the vocabulary — it is a city of clockworks and
    // relays — and the two it was missing are the two that carry the most
    // motion on the stages that do have them.
    //
    // WHERE THEY CAN STAND IS SET BY THE CROSSING, not by taste. A plume's top
    // cell sits a fixed 55px above the roof it stands on (see lcdSmokestack,
    // whose column is authored to top out at y 65 on scene 1's roof-120
    // building), so a boiler house on a TALL roof puts smoke through the
    // aircraft. Building 5's roof is 161, which tops the plume at 106 — well
    // under a crossing whose belly is 58 at its lowest. The transmitter's
    // beacon stands 31 above its roof, so building 0 — now roof 143 — tops it
    // at 112 with the signal rings still clear of the crossing.
    //
    // Building 0 also happens to be where the panel was deadest: the far left,
    // which carried nothing at all below the clouds.
    transmitter: 0,
    smokestacks: [[5, 20]],
  },
];

// Portrait-only composition for rhythm-1. Keep the authored scene above as
// the landscape contract; the phone gets its own sparse, taller foreground so
// the combo and Kong landmarks can use the full narrow frame without rewriting
// landscape spacing or rooftop traffic.
const LCD_PORTRAIT_STAGE_1 = Object.freeze({
  ...LCD_CITY_SCENES[1],
  buildings: Object.freeze([
    // Portrait keeps only the two landmarks that carry the rhythm-1 read. The
    // combo facade is exactly three windows wide on the larger 4px grid — the
    // same three-column read as its landscape counterpart, not a four-column
    // block stretched to fill the phone.
    [224, LCD_PORTRAIT_COMBO_W, 176, 'storefront', 'portrait-grid'],
  ]),
  // Keep the sparse foreground, but restore the authored sky traffic. These
  // are scene art, not part of the removed city visualiser.
  // Portrait's taller Kong facade reaches the local roof at y=24. Keep the
  // wisps high in the open sky, with the lowest one still above the foreground
  // roofs after the portrait city shift.
  clouds: Object.freeze([[0, 28], [150, 18], [300, 12]]),
  // 120px is 30 portrait-grid cells: a broad Kong facade that still fits
  // inside the shifted/zoomed portrait panel without clipping its right wall.
  // Its x=336 placement leaves the same practical outer gutter as the combo's
  // x=224 placement, with only a 16px grid gap between the two facades.
  gameWatch: Object.freeze([336, 120, 208, 'game-watch', 'portrait-grid']),
  clock: null,
  billboards: Object.freeze([[0, 'chart']]),
  transmitter: null,
  rooftopGorilla: null,
  smokestacks: Object.freeze([]),
  // Kong's portrait roof is 83px higher than the authored landscape roof.
  // Translate the whole flight lane by that same amount: the normal pass then
  // crosses the raised barrel over Kong, while lcdPassAltitude lifts the
  // non-striking phases further clear so the collision remains occasional.
  plane: Object.freeze({
    ...LCD_CITY_SCENES[1].plane,
    from: -27,
    to: -40,
  }),
});

// Each stage's sky pair, which LCD_SKY_PHASES phase 0 opens on. The tinted
// building planes and stage-specific cloud inks that used to live here are
// gone with the OLED treatment: every wall is LCD_FACADE_WASH and every cloud
// uses the shared lighter graphite declared with the rest of the panel inks.
const LCD_GBC_PALETTES = [
  null,
  { sky: ['#e7e7a3', '#a8cf8a'] },
  { sky: ['#e7dfa2', '#91c2a8'] },
  { sky: ['#dad98d', '#88ae91'] },
];

// THE LIGHT SHIFTS A LITTLE. One authored sky pair per phase per stage, and
// phase 0 is the pair each stage has always opened on, so nothing about a
// run's first twenty-odd seconds changes.
//
// It USED to run the whole way to dusk — a full morning-haze-to-evening ramp
// over ninety seconds — and the end of a run went gloomy for it. What the sky
// is actually here to do is give the windows something to come on against, and
// that needs a hint of evening, not the whole of it: these pairs walk 45% of
// the distance the old ones did, so the last phase is a warmer afternoon
// rather than a sunset. The rest of "the stage gets later" is unchanged and
// does the real work — window rows lighting floor by floor, the transmitter
// tipping, and stage 2's searchlights and washer working through it.
const LCD_SKY_PHASES = [
  null,
  [['#e7e7a3', '#a8cf8a'], ['#e6e29e', '#a4cc86'], ['#e3dc97', '#9fc685'], ['#ded090', '#96bd84']],
  [['#e7dfa2', '#91c2a8'], ['#e5db9e', '#8cbea5'], ['#e1d397', '#86b7a3'], ['#dac68f', '#7dae9d']],
  [['#dad98d', '#88ae91'], ['#d8d488', '#84aa8e'], ['#d3cc83', '#7da38b'], ['#cbbd7b', '#759a84']],
];

const LCD_EQ_LEVELS = [2, 4, 3, 6, 4, 5, 2, 4, 6, 3, 5, 4, 2, 5, 3, 6];
// Cloud wind, in whole px per heard beat, one pace per cloud slot — the spread
// is what gives the flat sky a hint of depth. And a one-pixel bob per bar,
// stepped through a fixed four-bar figure rather than eased, because nothing
// on this screen eases.
const LCD_CLOUD_DRIFT = [2, 1, 3];
const LCD_CLOUD_BOB = [0, 1, 0, -1];
// Lower edge of the reserved sky band. These are the highest rows occupied by
// rooftop scenery plus a small gap: stage 1's transmitter ring (51), stage
// 2's roof traffic/sign band (44), and stage 3's raised gorilla arm (56).
// Clouds wrap horizontally for the life of a level, so the vertical contract
// is what keeps them clear of a billboard/building after an arbitrary number
// of song loops, not their starting x positions.
export const LCD_CLOUD_CLEARANCE_BOTTOM = Object.freeze([null, 48, 44, 56]);
const LCD_CLOUD_BODY_H = 13;
const LCD_CLOUD_CLEAR_GAP = 1;
const LCD_WINDOW_OFF = 'rgba(80,85,92,0.24)';
const LCD_MOTION_GHOST = 'rgba(80,85,92,0.12)';
const LCD_WINDOW_ON = 'rgba(211,91,67,0.82)';
const LCD_PRINT = 'rgba(60,63,69,0.72)';
const LCD_PRINT_SOFT = 'rgba(80,85,92,0.48)';
const lcdMod = (n, d) => ((n % d) + d) % d;

// ---- the OLED screen ------------------------------------------------------
//
// THE PANEL AS SHIPPED, settled 2 Sep 2026 after a six-round bake-off (gallery
// section `lcd-finish-bakeoff`, now retired). The brief was "nostalgic but
// slick", and the answer was to think of the toy as an OLED Game & Watch: the
// authored city is untouched — the same structures, windows, crowns and roof
// furniture on the same pixels — and the TREATMENT is what a modern panel
// would give it.
//
//  - NO COLOUR PLANES. A facade is one faint wash so it separates from the
//    sky; the tinted translucent planes that muddied against each other are
//    gone.
//  - ONE INK, ONE WEIGHT. The facade outline is LCD_INK at 1px; the lines on
//    the wall, and every rooftop crown above them, are the same ink at one
//    softer alpha, one pixel wide, laid in the window gutters (see
//    lcdLeanDetail) and on the parapet (see gbcBuildingLineArt). The silhouette
//    is the dark; anything STANDING on a roof is the light, so a crown and the
//    aerial next to it are the same weight of object.
//  - A SEGMENT THAT IS OFF IS A GHOST. Unlit windows are one uniform cell at
//    one alpha, no glass glint.
//  - A SEGMENT THAT IS ON GLOWS. Lit windows are the coral at full strength
//    with three rings of falloff (LCD_GLOW) — an OLED emits, it is not printed.
//  - THE GRID STAYS, FAINTER. The cell lattice at half the old strength, both
//    directions, as an OLED's subpixel gaps; and no soft-light wash, because
//    the light is coming from the panel.
const LCD_FACADE_WASH = 'rgba(60,63,69,0.07)';
const LCD_WALL_LINE = 'rgba(60,63,69,0.55)';
const LCD_CLOUD_INK = LCD_WALL_LINE;
// An unlit window cell — and stage 3's roof plates, which are the same kind
// of off segment. Fainter and in the outline's own blue rather than
// LCD_WINDOW_OFF, which the rest of the panel's ghost cells keep.
const LCD_WINDOW_GHOST = 'rgba(60,63,69,0.14)';
const LCD_WINDOW_LIT = '#d35b43';
// Outermost ring first: each [pad, colour] is a rectangle `pad` px proud of
// the cell, so the three make a soft falloff.
const LCD_GLOW = [[3, 'rgba(211,91,67,0.07)'], [2, 'rgba(211,91,67,0.16)'], [1, 'rgba(211,91,67,0.38)']];

// HOW MANY PHASES A STAGE PASSES THROUGH. The panel changes over a run — the
// sky gets later, more windows come on, actors arrive — but it STEPS between
// four states rather than drifting through them, because nothing on this
// screen eases. Four is one change every twenty-odd seconds: often enough to
// notice on a first run, rare enough that each one is an event.
const LCD_PHASES = 4;

// rhythm-1's own maximum: CROSSING_ROAD_RISE (7) + STAGE_WAVES['rhythm-1'].amp
// (4). It is the largest of the three stages, so a caller that does not know
// which stage it is drawing is safe with it. tests/lcd-background.js pins this
// against the real terrain constants so the two cannot drift apart.
export const LCD_DEFAULT_ROAD_RISE = 11;

function lcdSceneFrame(scene) {
  const stageIndex = Math.max(1, Math.min(3, Math.trunc(scene?.stageIndex) || 1));
  const live = Number.isFinite(scene?.beat);
  const beat = live ? Math.floor(scene.beat) : 0;
  const p = Number.isFinite(scene?.progress) ? Math.max(0, Math.min(1, scene.progress)) : 0;
  // ONE scan of the sixteen bins, not four. `spectrum` and `audio` ride the same
  // gate — see the note on each below — and asking twice per field meant this
  // ran four times a frame between bg() and drawLCDCity.
  const heard = lcdHeardSpectrum(scene?.audio);
  return {
    stageIndex,
    live,
    step: lcdMod(beat, 16),
    // WHERE IN THE BEAT WE ARE, 0 to 1. Everything else on this panel steps on
    // whole beats and wants nothing finer; the verb sign flashes three-quarters
    // on and a quarter off, which is a thing that happens INSIDE a beat and is
    // the only reason this is here. A missing live beat uses phase zero.
    beatPhase: live && Number.isFinite(scene.beat) ? scene.beat - Math.floor(scene.beat) : 0,
    beat4: lcdMod(beat, 4),
    beatAbs: beat,
    bar: Math.floor(beat / 4),
    phrase: Math.floor(beat / 16),
    phase: Math.min(LCD_PHASES - 1, Math.floor(p * LCD_PHASES)),
    // What the player is hearing, or null when no analyser is available. The
    // hub, gallery and tests use the deterministic beat-driven fallback, which
    // is the authored panel rather than a degraded version of it.
    // ONE GATE FOR THE WHOLE REACTIVE LAYER. The vetted spectrum decides
    // whether there is an analyser here at all, and `audio` rides with it:
    // without a real one the deterministic fallback reports fixed constants,
    // which is not a quiet room, it is a permanent bias on every meter. No
    // analyser means the panel lights itself the authored way, exactly as it
    // did before any of this — the same path the hub, gallery and tests take.
    spectrum: heard,
    audio: heard ? scene.audio : null,
    // THE STAGE IS OVER, or still in its live run. Rhythm 3 uses this one
    // presentation bit to hand the rooftop gorilla from his barrel loop to a
    // friendly wave; it is not gameplay state and no other scene reads it.
    finish: !!scene?.finish,
    // HOW THE RUN IS GOING, and the one crack in "no gameplay reaches this
    // painter". It is deliberately narrow: the count of clean beats in a row
    // (RunState.beatCombo) and a boolean that goes true for a couple of seconds
    // every eighth of them — no chart events, no obstacles, no player position.
    // The counting board on the roof the hero runs under spends both; nothing
    // else on the panel reads them.
    //
    // A 0..1 `form` scalar used to ride here too, for a share-price trace that
    // tilted with it. Both are gone: the fiction was one joke resting on the
    // cabinet's name, and a tilting squiggle on a rooftop is not a thing a
    // player reads as "how you are doing" — the count is.
    //
    streak: !Number.isFinite(scene?.streak) ? 0
      : Math.max(0, Math.trunc(scene.streak)),
    cheer: !!scene?.cheer,
    // WHEN THE NEXT BARREL REACHES THE FOOT OF THE CHUTE, as an absolute beat,
    // or null. The second crack in "no gameplay reaches this painter" and it is
    // narrower than the first: not a position, not an event, one beat number
    // that says a thing the player can already see coming is coming.
    //
    // It exists because stage 3's barrels are no longer scenery. A barrel in
    // the lane IS one of the ones the gorilla drops, and the only way the two
    // can be the same object is for the chute to deliver when the lane says so
    // rather than on a clock of its own. Without it the chute ran every bar
    // whether or not a barrel was coming, which is precisely what made the
    // thing on the roof and the thing in the road read as unrelated.
    //
    barrelBeat: !Number.isFinite(scene?.barrelBeat) ? null
      : scene.barrelBeat,
    // AND THE GRID THE GORILLA'S SWING IS PHASED TO — the snapped delivery
    // beat of the last real barrel, kept after it has landed so the stream
    // stays in step for the next one (see lcdSwingPhase). A caller that names a
    // barrel without a grid gets the barrel's own beat as the grid, which is
    // what the run would have handed over anyway.
    barrelGrid: Number.isFinite(scene?.barrelGrid) ? scene.barrelGrid
      : Number.isFinite(scene?.barrelBeat) ? scene.barrelBeat : null,
    // WHICH FACE THE GORILLA WEARS, or null for the authored smile. DEV ONLY:
    // no run sets it — the gallery's bake-off does, so the candidates can be
    // judged on the real panel by the real painter rather than in a copy of
    // him. It never overrides the startle; see lcdRooftopGorilla.
    gorillaExpr: typeof scene?.gorillaExpr === 'string' ? scene.gorillaExpr : null,
    // And how tightly the two nostrils sit on the muzzle. DEV ONLY: the
    // gallery crosses this with the real expressions before one spacing is
    // allowed to replace the authored 2.5px half-gap.
    gorillaNostrils: typeof scene?.gorillaNostrils === 'string' ? scene.gorillaNostrils : null,
    // And which BROW treatment, same deal: null means the one the panel ships.
    gorillaBrow: typeof scene?.gorillaBrow === 'string' ? scene.gorillaBrow : null,
    // And which INK he is drawn in — fur, arm core, face, skin, chest — same
    // deal: null means the one the panel ships. See LCD_GORILLA_INKS.
    gorillaInk: typeof scene?.gorillaInk === 'string' ? scene.gorillaInk : null,
    // And HOW HE IS BUILT — stacked ovals or a hard-edged segment, see
    // LCD_GORILLA_BUILD_STYLES. Null means the construction the panel ships.
    gorillaBuild: typeof scene?.gorillaBuild === 'string' ? scene.gorillaBuild : null,
    // The two dials on the ovals: how the ARMPIT is defined and what TUFT the
    // skull wears. See LCD_GORILLA_PIT_STYLES / LCD_GORILLA_TUFT_STYLES.
    gorillaPit: typeof scene?.gorillaPit === 'string' ? scene.gorillaPit : null,
    gorillaTuft: typeof scene?.gorillaTuft === 'string' ? scene.gorillaTuft : null,
    // Which SHOCKED mouth he wears — see LCD_GORILLA_SHOCK_STYLES.
    gorillaShock: typeof scene?.gorillaShock === 'string' ? scene.gorillaShock : null,
    // And how far the EARS stick out — see LCD_GORILLA_EAR_STYLES.
    gorillaEar: typeof scene?.gorillaEar === 'string' ? scene.gorillaEar : null,
    // And which SPIKE spec the crest is cut to — see LCD_GORILLA_SPIKE_STYLES.
    gorillaSpikes: typeof scene?.gorillaSpikes === 'string' ? scene.gorillaSpikes : null,
    // HOW STRONG THE SHOULDER BALL'S INK IS, 1 down to 0.5, or null for the
    // one the panel ships — see LCD_GORILLA_SHOULDER_ALPHAS.
    gorillaShoulder: Number.isFinite(scene?.gorillaShoulder) ? scene.gorillaShoulder : null,
    // And WHAT SHAPE the ball is — see LCD_GORILLA_SHOULDER_SHAPE_STYLES.
    gorillaShoulderShape: typeof scene?.gorillaShoulderShape === 'string' ? scene.gorillaShoulderShape : null,
    // The girder cell's size and the barrel's SILHOUETTE — see
    // LCD_BARREL_CELL_STYLES and LCD_BARREL_SHAPE_STYLES. Null ships.
    barrelCell: typeof scene?.barrelCell === 'string' ? scene.barrelCell : null,
    barrelShape: typeof scene?.barrelShape === 'string' ? scene.barrelShape : null,
    // Whether the runner wears a RIM, and in which ink — see
    // LCD_RUNNER_OUTLINE_STYLES. Null ships.
    runnerOutline: typeof scene?.runnerOutline === 'string' ? scene.runnerOutline : null,
    // IS THIS A RUN OPENING, and HOW FAR INTO IT — the pair that gates the
    // city's arrival, see lcdArrival.
    //
    // THE TIMING IS THE RUN'S, NOT THE SONG'S. It was the song's beat, which
    // this frame already has, and that was wrong in both directions: the song
    // is already playing under the act banner and the run-in, so half the
    // skyline walked on before the player ever saw the panel; and the heard
    // beat is a position INSIDE the loop, so every time the song came round the
    // count fell back through zero and the city dismantled itself and rebuilt
    // in the middle of a run. The run counts its own opening instead
    // (RunState.advanceCityIntro) and hands the number over here — monotonic,
    // anchored to the frame the world starts moving, and never reset by a
    // death, so a retry arrives long past the assembly.
    //
    intro: !!scene?.intro,
    introBeat: !Number.isFinite(scene?.intro?.beat) ? null
      : Math.floor(scene.intro.beat),
    // HOW MANY BEATS SINCE THE OMEN TOOK OFF, or null when this run never rolled
    // one — negative while it is still on the ground. The run's own monotonic
    // clock, for the reason the opening's is: the song's beat comes round every
    // loop, and a threat that flew past on every lap would be an advert. Only a
    // scene that authors `omen` reads it; see lcdPlaneCyc.
    omenStep: Number.isFinite(scene?.omen) ? Math.floor(scene.omen) : null,
    // WHICH VERB THE SIGN IS SHOUTING, or null — `{ action, ink }`.
    //
    // The fourth and last crack in "no gameplay reaches this painter": one verb
    // name and one colour, and no position, no event and no timing. The run
    // decides WHEN a verb is worth shouting about; the panel decides what a
    // shout looks like. Everything outside a run passes none and the share
    // price keeps its board.
    verbCue: !scene?.verbCue?.action ? null
      : {
        action: String(scene.verbCue.action),
        // One colour or several: a slide answers a barrel and a drone on the
        // stages that stage both, and it shows a mark for each.
        ink: Array.isArray(scene.verbCue.ink) ? scene.verbCue.ink.slice(0, 3)
          : [scene.verbCue.ink || LCD_WINDOW_ON],
      },
    // The highest the lane can climb on this stage — see lcdLightFloor. A run
    // knows it exactly; every other caller draws no road and keeps rhythm-1's.
    maxRoadRise: Number.isFinite(scene?.maxRoadRise)
      ? Math.max(0, scene.maxRoadRise) : LCD_DEFAULT_ROAD_RISE,
  };
}

// ONE BAND OF THE SPECTRUM, quantised to whole cells.
//
// The analyser publishes 128 bins of a 256-point FFT, and almost all the music
// lives in the bottom third of them — so this walks a SKEWED range (the square
// of the band's position) rather than a linear slice, or twenty of twenty-four
// bars would sit dead all song. Returns 0..steps, already rounded: this panel
// lights whole cells, so the rounding belongs here rather than at each caller.
// A SILENT SPECTRUM IS NOT A QUIET ONE. Offline renders, the browserless
// tests and any device without an AnalyserNode publish 128 zeroes while
// bass/mid/level still report from the deterministic fallback — and a meter
// that believes them switches every window in the city off. The bottom bins
// carry the whole kit: all zero means there is no analyser here, only the
// fallback, and the panel should light itself the authored way instead.
function lcdHeardSpectrum(audio) {
  const spec = audio?.spectrum;
  if (!spec || spec.length < 16) return null;
  for (let i = 0; i < 16; i++) if (spec[i]) return spec;
  return null;
}

function lcdBandLevel(spec, band, bands, steps) {
  if (!spec) return null;
  const lo = Math.floor((band / bands) ** 1.7 * 96);
  const hi = Math.max(lo + 1, Math.floor(((band + 1) / bands) ** 1.7 * 96));
  let sum = 0;
  for (let i = lo; i < hi && i < spec.length; i++) sum += spec[i];
  const avg = sum / Math.max(1, hi - lo) / 255;
  // A gentle knee: the raw average sits low even in a loud bar, and a meter
  // that never leaves its bottom two cells is not a meter.
  return Math.max(0, Math.min(steps, Math.round(avg ** 0.7 * steps * 1.35)));
}

// ---- the skyline equalizer ----------------------------------------------
//
// The visualiser layer, and it is the SKYLINE ITSELF: twenty-four bars rising
// out of the ground behind the buildings, so the city stands in front of its
// own meter and occludes the feet of every bar. Drawn straight after the sky
// and before the first facade.
//
// Deliberately quiet. This is behind the lane the player is reading, so the
// lit cells are ghost ink rather than the coral every foreground cell uses —
// present at a glance, never competing with a hazard. And it is cells, not a
// curve: whole 2px blocks on the billboards' own grid.
//
// With no analyser (the hub, the gallery or a test) it falls back to the
// authored LCD_EQ_LEVELS table walked by the beat, which is the
// same still meter stage 2's rooftop banks have always shown.
const LCD_EQ_BARS = 16;
const LCD_EQ_CELL = 3;                    // 2px block + 1px gap, vertically
const LCD_EQ_TOP = 44;                    // never into the beat ribbon's band

// THE SILHOUETTE, AS A FUNCTION. A meter drawn through a facade turns the
// building into glass — the planes are 0.18–0.28 alpha, so every hidden cell
// showed through as grey striping AND was paid for. Roughly seven cells in ten
// were behind a building. Derived from the scene's own data and memoised per
// stage: static in, static out, so it can never disagree with what is drawn.
const lcdSkyFloors = [];
function lcdSkyFloor(stageIndex) {
  if (lcdSkyFloors[stageIndex]) return lcdSkyFloors[stageIndex];
  const art = LCD_CITY_SCENES[stageIndex];
  const spans = art.buildings.map(([x, w, h]) => [x, x + w, GROUND_Y - h]);
  if (art.gameWatch) {
    const [gx, gw, gh] = art.gameWatch;
    spans.push([gx, gx + gw, GROUND_Y - gh]);
  }
  lcdSkyFloors[stageIndex] = spans;
  return spans;
}

// NOT IN THE GAME, and that is a decision rather than an oversight.
//
// Clipped behind the skyline you never see a whole bar — only the fragments
// standing in the gaps between buildings — so in a run it read as vertical
// banding in the sky rather than as an instrument, in the one band the plane,
// the clouds and the smoke already live in. The city meters the song five
// other ways that ARE legible (windows, the rooftop banks, billboards on the
// drum, the plume, the transmitter's reach), so the sky is better left alone.
//
// The jukebox is the opposite case: the sky IS the show there and nobody is
// reading a lane through it, so the preset asks for the bars and a run does
// not.
//
// NO TIPS. Each bar used to wear a bright coral cell on its top block, on the
// argument that it was what turned a column of ghost ink into a reading. On a
// meter that is CLIPPED BY A SKYLINE it does the opposite: a bar's visible top
// is wherever the roof in front of it happens to end, not where the band
// actually peaked, so sixteen bright cells were sixteen confident readings of
// the buildings rather than of the song. Left as plain columns the layer says
// what it honestly knows — how much is lit — and stays the quiet thing behind
// the city that it is.
function lcdSkylineEq(ctx, frame) {
  const rows = Math.floor((GROUND_Y - LCD_EQ_TOP) / LCD_EQ_CELL);
  const barW = Math.floor(W / LCD_EQ_BARS);
  const spans = lcdSkyFloor(frame.stageIndex);
  for (let b = 0; b < LCD_EQ_BARS; b++) {
    const live = frame.skyLevels[b];
    const n = live == null
      ? Math.round(LCD_EQ_LEVELS[lcdMod(frame.step + b * 3, LCD_EQ_LEVELS.length)] * rows / 8)
      : live;
    const x = b * barW + 1;
    // Where this bar meets the city. Everything below it is behind a facade.
    let floorY = GROUND_Y;
    for (const [sx, ex, top] of spans) {
      if (x + barW - 2 > sx && x < ex && top < floorY) floorY = top;
    }
    ctx.fillStyle = 'rgba(80,85,92,0.10)';
    for (let i = 0; i < n; i++) {
      const y = GROUND_Y - 2 - i * LCD_EQ_CELL;
      if (y + 2 > floorY) continue;
      ctx.fillRect(x, y, barW - 2, 2);
    }
  }
}

// HOW FAR DOWN A FACADE MAY LIGHT, and why it is not a free choice.
//
// The road RISES above the groundline — terrainGroundY is GROUND_Y minus the
// terrain height — so the lane climbs over the bottom of the city, and a lit
// window under it is swallowed as the lane rolls past and flickers at the edge
// while it does. The lowest lightable row is therefore the lowest one whose
// whole tile still clears the highest the road can ever reach on this stage.
//
// That is the whole content of the constant this replaces. It was written
// `y <= GROUND_Y - 28` with no note, and 28 was exactly rhythm-1's two rise
// sources plus a tile: CROSSING_ROAD_RISE + the stage wave's amp + 6. Both
// sources came down to give the city back its feet, so the floor followed them
// without a line changing here — which is the point of deriving it.
// Stated that way it is also stage-specific, which the constant was not —
// rhythm-2 and rhythm-3 declare no stage wave, so their road only ever climbs
// 10 and a flat 28 was costing them twelve pixels of city for a roll that
// cannot happen there. That band is the part of the panel closest to the lane,
// which is the part a player on a phone is actually looking at.
//
// `maxRoadRise` rides on the scene frame. Callers outside a run — the hub's
// attract screens, the jukebox preset, the tests — draw no road at all and pass
// nothing, and default to rhythm-1's 22 so the panel they have always drawn is
// the panel they still draw.
const LCD_WINDOW_H = 6;
const lcdLightFloor = (maxRoadRise) => GROUND_Y - (maxRoadRise + LCD_WINDOW_H);

// THE GRID IS PURE GEOMETRY — a building's authored [x, w, h, style] and
// nothing else — so it is built once per building instead of 182-223 plain
// objects and a fresh array on every frame. Keyed on the authored array's own
// identity, which LCD_CITY_SCENES hands back unchanged every time.
const lcdCellCache = new WeakMap();
// WHERE THE CLOCK STAGE SITS IN THE TOWER, solved from the building it is part
// of. The scene names a building index and a dial radius and nothing else, so
// raising the tower carries the dial up with it — the one failure the old
// rooftop case invited, where a screen-space y and a roof height had to be kept
// in agreement by hand.
//
// A clock stage is a COURSE of the shaft: no windows in it, a lintel over and a
// sill under, the dial centred between them. `left`/`right` stop short of the
// facade's corner masonry so the two pilasters frame the dial rather than being
// swallowed by it.
// EQUIDISTANT FROM THE TOP AND BOTH SIDES, which is one number rather than
// three: the dial is centred across the shaft, so its side margins are both
// w/2 - r, and dropping its centre by exactly w/2 makes the margin over it the
// same. Nothing to author and nothing to keep in agreement — the dial sits in
// the corner of the tower the way a stone would be set, and a change to either
// the width or the height moves it correctly on its own.
const LCD_CLOCK_MARGIN = 2;   // clear wall kept around the dial, drawn on by nothing
function lcdClockBay(art) {
  if (!art || !art.clock) return null;
  const [index, r] = art.clock;
  const [x, w, h] = art.buildings[index];
  const roof = GROUND_Y - h;
  const cy = roof + Math.round(w / 2);
  return {
    index, r, cx: Math.round(x + w / 2), cy,
    // FULL WIDTH, because the clock stage is a storey of the tower and not a
    // panel hung on it. Half-width left the cornice and the two corner
    // pilasters running past the dial with a pixel or two of air, and at this
    // pitch that pair of verticals under a horizontal is a frame — the exact
    // thing that had to go. Above the sill the shaft is plain wall.
    left: x, right: x + w,
    top: cy - r - LCD_CLOCK_MARGIN,
    bottom: cy + r + LCD_CLOCK_MARGIN,
  };
}
const lcdBayHits = (bay, x, y, w, h) => !!bay
  && x + w > bay.left && x < bay.right && y + h > bay.top && y < bay.bottom;

function lcdWindowCells(building, bay = null) {
  let hit = lcdCellCache.get(building);
  if (hit) return hit;
  const [x, w, h] = building;
  const grid = lcdGridFor(building);
  const top = GROUND_Y - h;
  // Columns follow from the width, which was set from the columns: see
  // LCD_FACADE_W. A window is the fill inside a 3x2-cell box whose rules are
  // x + 6 + 15·col and top + 6 + 12·row, so the box's edges are grid lines
  // and the fill sits one pixel inside them.
  const cols = Math.max(2, Math.round((w - 2 * grid.unit) / grid.colPitch));
  // Rows the beat may light: those whose box clears the quiet 27px above the
  // lane. The rest run on down past the road for a pit to show.
  const activeRows = Math.max(2, Math.floor((h - 27 - 2 * grid.unit) / grid.rowPitch));
  const rows = Math.max(activeRows, Math.floor((H - top - 2 * grid.unit - 1) / grid.rowPitch));
  const cells = [];
  for (let row = 0; row < rows; row++) {
    const y = top + 2 * grid.unit + 1 + row * grid.rowPitch;
    if (y + grid.cellH > H) continue;
    for (let col = 0; col < cols; col++) {
      const cellX = x + 2 * grid.unit + 1 + col * grid.colPitch;
      // The clock stage has no windows in it. Dropped at BUILD time rather than
      // masked at draw time, so the lit half cannot light a cell the dial is
      // standing on — and so the baked layer and the live one agree by
      // construction instead of by both remembering to check.
      if (lcdBayHits(bay, cellX, y, grid.cellW, grid.cellH)) continue;
      cells.push({ row, col, x: cellX, y });
    }
  }
  const built = { cells, cols, activeRows, grid };
  lcdCellCache.set(building, built);
  return built;
}

// THE UNLIT HALF, which is about nine tenths of this painter's fills and the
// same on every frame whatever the beat is doing. It goes into the baked city
// layer; see bakedCity.
//
// Big, solid tiles: closer to a GBC game's readable window blocks than the
// old fine H-shaped LCD segments.
function lcdWindowGridBase(ctx, building, bay, minY = -Infinity) {
  const { cells, grid } = lcdWindowCells(building, bay);
  const firstY = Number.isFinite(Number(minY)) ? Number(minY) : -Infinity;
  // One uniform ghost cell, no glint: a segment that is off.
  ctx.fillStyle = LCD_WINDOW_GHOST;
  for (const cell of cells) {
    if (cell.y >= firstY) ctx.fillRect(cell.x, cell.y, grid.cellW, grid.cellH);
  }
}

// THE LIT HALF, and the only part of the grid a beat can move.
function lcdWindowGridLit(ctx, building, index, frame, bay) {
  const { cells, cols, activeRows, grid } = lcdWindowCells(building, bay);
  const floorY = lcdLightFloor(frame.maxRoadRise);
  const lightable = (cell) => cell.row < activeRows && cell.y <= floorY;
  const active = [];
  // THE BUILDING HEARS ITS OWN BAND. Each facade is assigned one slice of the
  // spectrum, and that slice decides how many rows light from the bottom —
  // the block becomes a VU meter standing on end, which is what a lit office
  // tower already looks like. The authored beat cycle still picks which
  // COLUMN, so the choreography that was here survives underneath the level.
  //
  // Rows fill from the bottom because that is how a meter reads and how a
  // building fills up in the evening; `phase` adds a floor, so the city has
  // more lights on at the end of a run than at the start.
  // ADDITIVE, not a replacement. The level says HOW MANY cells; the authored
  // per-stage cycle still says WHICH — so the first city still walks its single
  // cell, CHORUS DISTRICT still alternates its column parity and OVERDRAFT
  // SKYLINE still runs two cells in opposite directions. Replacing those
  // branches outright made all three stages the same city the moment music
  // played, which is the one thing this panel's variety cannot afford. And
  // `phase` raises the floor with or without an analyser, so the city wakes up
  // in the hub and in offline renders too.
  const floor = frame.windowLevels[index];
  if (frame.stageIndex === 1) {
    const row = lcdMod(frame.step + index, activeRows);
    const col = lcdMod(Math.floor(frame.step / 4) + index, cols);
    active.push(...cells.filter((cell) => lightable(cell) && cell.row === row && cell.col === col));
  } else if (frame.stageIndex === 2) {
    const parity = frame.beat4 === 1 || frame.beat4 === 3 ? 1 : 0;
    const row = lcdMod(Math.floor(frame.step / 2) + index, activeRows);
    active.push(...cells.filter((cell) => lightable(cell) && cell.row === row && cell.col % 2 === parity));
  } else {
    const dir = (index + frame.phrase) % 2 === 0 ? 1 : -1;
    const rowA = lcdMod(frame.step * dir + index, activeRows);
    const rowB = lcdMod(rowA + Math.max(1, Math.floor(activeRows / 2)), activeRows);
    const colA = lcdMod(frame.step + index, cols);
    const colB = lcdMod(cols - 1 - colA, cols);
    active.push(...cells.filter((cell) => lightable(cell) && ((cell.row === rowA && cell.col === colA)
      || (cell.row === rowB && cell.col === colB))));
  }
  if (floor > 0) {
    const col = lcdMod(Math.floor(frame.step / 2) + index, cols);
    active.push(...cells.filter((cell) => lightable(cell) && cell.col === col
      && cell.row >= activeRows - floor));
  }
  // AN EMISSIVE CELL: the glow's rings first, outermost in, then the cell
  // itself at full strength with nothing printed on it.
  for (const [pad, colour] of LCD_GLOW) {
    ctx.fillStyle = colour;
    for (const cell of active) {
      ctx.fillRect(cell.x - pad, cell.y - pad, grid.cellW + pad * 2, grid.cellH + pad * 2);
    }
  }
  ctx.fillStyle = LCD_WINDOW_LIT;
  for (const cell of active) ctx.fillRect(cell.x, cell.y, grid.cellW, grid.cellH);
}

function lcdStrokePath(ctx, points, close = false) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  if (close) ctx.closePath();
  ctx.stroke();
}

function gbcBuildingLineArt(ctx, building, crowned, bay = null) {
  const [x, w, h, style] = building;
  const grid = lcdGridFor(building);
  const top = GROUND_Y - h;
  const detailBottom = GROUND_Y - 27;
  const cx = Math.round(x + w / 2);

  ctx.strokeStyle = LCD_INK;
  // `crowned` MEANS THE ROOF IS SPOKEN FOR — by the gorilla, a billboard or the
  // transmitter — and every style that draws a rooftop crown has to honour it.
  // Half of them did not: storefront, clockworks, relay, speaker and music-hall
  // painted their crown box
  // unconditionally, which is invisible until something stands on that roof and
  // then shows as a parapet cage in the gap between a billboard's legs. Nothing
  // stage 1's share price and its burger have stood on storefront roofs all
  // along with the shop's own parapet cage showing between their legs.
  // The facade continues to the bottom of the display. The road apron masks
  // this lower portion everywhere except a pit, where it becomes the actual
  // background seen through the opening.
  ctx.lineWidth = grid.lineW;
  ctx.strokeRect(x + 0.5, top + 0.5, w, H - top);
  // The lines on the wall: one pixel wide, in the window gutters, one
  // signature element per style — see lcdLeanDetail. The lower 27px remain
  // quiet so this never becomes false lane furniture. Everything below this
  // line is the CROWN each style wears above its roof.
  ctx.fillStyle = LCD_WALL_LINE;
  lcdLeanDetail(ctx, building, bay, detailBottom);

  // THE ROOF FURNITURE IS ONE SHADE, AND IT IS THE LIGHTER ONE. A crown used to
  // be stroked in LCD_INK while everything else standing on a roof printed at a
  // softer alpha — the transmitter mast and the aerials at LCD_PRINT_SOFT, and
  // the crowns' OWN caps, finials and nubs at LCD_WALL_LINE, because the fill
  // style was never reset after the wall lines. So a single crown could be a
  // black box with a grey lump on it, and a roof carrying both a crown and an
  // aerial read as two unrelated families of object on one parapet. Peter, on
  // stage 3's industrial roof: "some objects on top of buildings are darker
  // than others; keep all objects on top the lighter shade."
  //
  // The crowns take the wall line's ink, which is the one they were already
  // half drawn in, so every crown is now one tone and that tone is the aerial's
  // neighbourhood. The FACADE keeps LCD_INK: the silhouette against the sky is
  // still the darkest thing on the panel, and the crown sits on it instead of
  // competing with it.
  ctx.strokeStyle = LCD_WALL_LINE;

  if (style === 'storefront') {
    if (!crowned) {
      ctx.strokeRect(x + 5.5, top - 5.5, w - 11, 5);
      ctx.fillRect(x + 8, top - 3, w - 16, 1);
    }
  } else if (style === 'clockworks') {
    if (!crowned) { ctx.fillRect(x + 5, top - 3, 7, 3); ctx.fillRect(x + w - 12, top - 3, 7, 3); }
  } else if (style === 'workshop') {
    if (!crowned) {
      lcdStrokePath(ctx, [[x + 1, top], [x + 8, top - 6], [x + 15, top],
        [x + 22, top - 6], [x + w - 1, top]]);
    }
  } else if (style === 'deco') {
    if (!crowned) {
      ctx.strokeRect(cx - 9.5, top - 5.5, 19, 5);
      ctx.strokeRect(cx - 5.5, top - 10.5, 11, 5);
      ctx.fillRect(cx - 1, top - 14, 2, 4);
    }
  } else if (style === 'fire-escape') {
    // No crown; the rail and landings are the wall's (lcdLeanDetail).
  } else if (style === 'water-tower') {
    if (!crowned) {
      // A TANK ON LEGS, and it has to say so from the lane. The old crown was
      // a 15x7 outlined box on two stubs with a diagonal across it, which at
      // this size is not a water tower, it is a road sign with a slash through
      // it — the one rooftop on this skyline nobody could name. What reads as
      // a water tower is the silhouette, and it is three things: a CONICAL CAP
      // with a finial, a DRUM that tapers toward its base, and FOUR SPLAYED
      // LEGS with bracing between them. Drawn tall enough to be those three
      // things separately rather than one small box.
      const ty = top - 17;             // where the drum meets the cap
      const tb = top - 8;              // where the drum meets the legs
      lcdStrokePath(ctx, [[cx - 8, ty], [cx, ty - 4], [cx + 8, ty]]);
      ctx.fillRect(cx, ty - 6, 1, 3);
      lcdStrokePath(ctx, [[cx - 8, ty], [cx - 7, tb], [cx + 7, tb], [cx + 8, ty]]);
      // One hoop around the staves. Soft, so it bands the drum without
      // cutting the silhouette in half the way the old inner line did.
      ctx.fillRect(cx - 7, ty + 4, 14, 1);
      // The legs: an outer pair splaying past the drum's width and an inner
      // pair dropping nearly straight, cross-braced at the halfway point.
      lcdStrokePath(ctx, [[cx - 6, tb], [cx - 8, top]]);
      lcdStrokePath(ctx, [[cx + 6, tb], [cx + 8, top]]);
      lcdStrokePath(ctx, [[cx - 2, tb], [cx - 3, top]]);
      lcdStrokePath(ctx, [[cx + 2, tb], [cx + 3, top]]);
      ctx.fillRect(cx - 7, tb + 5, 5, 1);
      ctx.fillRect(cx + 3, tb + 5, 5, 1);
    }
  } else if (style === 'office') {
  } else if (style === 'speaker') {
    if (!crowned) ctx.strokeRect(cx - 9.5, top - 5.5, 19, 5);
  } else if (style === 'music-hall') {
    if (!crowned) {
      ctx.strokeRect(cx - 11.5, top - 5.5, 23, 5);
      ctx.fillRect(cx - 8, top - 3, 16, 1);
    }
  } else if (style === 'spire') {
    if (!crowned) {
      lcdStrokePath(ctx, [[cx - 10, top], [cx - 6, top - 6], [cx - 3, top - 6],
        [cx, top - 15], [cx + 3, top - 6], [cx + 6, top - 6], [cx + 10, top]]);
      ctx.fillRect(cx, top - 21, 1, 7);
    }
  } else if (style === 'ducts') {
    if (!crowned) {
      ctx.strokeRect(x + 6.5, top - 6.5, 7, 6);
      ctx.fillRect(x + 8, top - 10, 3, 4);
      lcdStrokePath(ctx, [[x + w - 15, top], [x + w - 15, top - 8],
        [x + w - 7, top - 8], [x + w - 7, top]]);
    }
  } else if (style === 'relay') {
    if (!crowned) {
      ctx.strokeRect(cx - 9.5, top - 4.5, 19, 4);
      ctx.fillRect(cx - 6, top - 2, 12, 1);
    }
  } else if (style === 'industrial') {
    if (!crowned) {
      ctx.strokeRect(x + 5.5, top - 5.5, 8, 5);
      ctx.strokeRect(x + w - 13.5, top - 8.5, 8, 8);
      ctx.fillRect(x + w - 11, top - 12, 3, 4);
    }
  }
}

// THE WALL'S LINES, and why they belong to the window grid. Peter's diagnosis
// of the old panel's roughness, looking at a 4x crop: the detail lines were a
// mix of one and two pixels wide and none of them agreed with the windows — a
// spine two wide beside cells seven wide, courses on a twenty-pixel pitch over
// rows on an eleven-pixel pitch, corner pilasters one pixel off the first
// column. So:
//
// EVERY LINE IS ONE PIXEL AND LIES ON A RULE OF THE GRAPH PAPER — the middle
// rule of the two-cell gutter between window columns, the middle rule of the
// gutter between rows, the rule half-way between the roof and the first row —
// so nothing crosses a cell and every line is parallel to, and evenly spaced
// from, the cells beside it. And there are FEWER of them: a cornice on every
// wall, then ONE signature element per style. The crowns above the roof are
// untouched; they are the silhouette.
//
// Everything is derived from lcdWindowCells so the lines cannot drift from
// the grid they are aligned to. The stroke and fill styles are the caller's.
function lcdLeanDetail(ctx, building, bay, detailBottom) {
  const [x, w, h, style] = building;
  const top = GROUND_Y - h;
  const { cells, cols, grid } = lcdWindowCells(building, bay);
  // Wall to wall, inside the outline.
  const left = x + 1;
  const right = x + w;
  const span = right - left;
  // Column gutters: the middle rule between neighbouring cells of one row.
  // Solved from row 0's cells when the bay leaves it standing, else from the
  // first row it does.
  const rowOf = (r) => cells.filter((c) => c.row === r).sort((a, b) => a.col - b.col);
  let ref = [];
  for (let r = 0; ref.length < cols && r < 40; r++) ref = rowOf(r);
  const gutters = [];
  for (let i = 1; i < ref.length; i++) {
    gutters.push(Math.floor((ref[i - 1].x + grid.cellW + ref[i].x) / 2));
  }
  // Row gutters: the rule between two window rows' boxes.
  const rowGutter = (r) => top + 2 * grid.unit + (r + 1) * grid.rowPitch - grid.unit;
  const rows = Math.floor((detailBottom - (top + 2 * grid.unit)) / grid.rowPitch);
  // Lines are deliberately heavier in the portrait grid, skipping anything
  // the clock bay owns.
  const hline = (y) => {
    if (!lcdBayHits(bay, left, y, span, grid.lineW)) {
      ctx.fillRect(left, y, span, grid.lineW);
    }
  };
  const vline = (gx, y0, y1) => {
    if (y1 <= y0) return;
    if (lcdBayHits(bay, gx, y0, grid.lineW, y1 - y0)) {
      // Pick up under the bay's sill, exactly as the shipped spine does.
      if (bay && bay.bottom < y1) {
        ctx.fillRect(gx, bay.bottom, grid.lineW, y1 - bay.bottom);
      }
      return;
    }
    ctx.fillRect(gx, y0, grid.lineW, y1 - y0);
  };
  const wallTop = top + 2 * grid.unit;
  // The cornice, on the rule half-way between the roof and the first row.
  // Not on a clock tower: the dial owns that storey.
  if (!bay) hline(top + grid.unit);
  switch (style) {
    case 'clockworks':
    case 'spire':
      // A spine down the centre gutter. On an even column count the centre
      // IS a gutter; on an odd one it would be a cell, so the two gutters
      // either side of it carry the line instead.
      if (gutters.length % 2 === 1) vline(gutters[(gutters.length - 1) / 2], wallTop, detailBottom);
      else for (const g of gutters) vline(g, wallTop, detailBottom);
      if (style === 'clockworks') for (let r = 2; r < rows; r += 3) hline(rowGutter(r));
      break;
    case 'deco':
    case 'industrial':
      // Fluting: a line in every gutter. INDUSTRIAL FLUTES TOO, and on this
      // cabinet that is not a duplicate signature: deco is only ever authored
      // two windows wide and industrial only ever three, so the same painter
      // draws one centre spine on the one and a pair of piers on the other.
      // Industrial used to take the default fascia — a single course under the
      // top row and nothing below it — which on a 125-tall wall read as one
      // stray horizontal near the crown. Piers give the tall wall its height.
      for (const g of gutters) vline(g, wallTop, detailBottom);
      break;
    case 'office':
    case 'relay':
    case 'water-tower':
      // Banded: a course every second row.
      for (let r = 1; r < rows; r += 2) hline(rowGutter(r));
      break;
    case 'fire-escape': {
      // A rail down the last gutter, landings from it to the wall at each
      // row gutter.
      const rail = gutters[gutters.length - 1];
      if (rail == null) break;
      vline(rail, wallTop, detailBottom);
      for (let r = 0; r < rows; r++) {
        const y = rowGutter(r);
        if (!lcdBayHits(bay, rail, y, right - rail, 1)) ctx.fillRect(rail, y, right - rail, 1);
      }
      break;
    }
    case 'music-hall':
      // The marquee: a one-pixel frame on the rules around the first row of
      // windows — the margins' middle rules for its sides, the cornice rule
      // and the first course rule for its top and bottom.
      ctx.strokeRect(x + LCD_U + 0.5, top + LCD_U + 0.5, w - 2 * LCD_U, LCD_ROW_PITCH);
      break;
    case 'speaker':
      // The cones are the building; they stay.
      for (const [cy, r] of [[top + 15, 5], [top + 29, 7]]) {
        if (cy + r >= detailBottom) continue;
        ctx.beginPath(); ctx.arc(Math.round(x + w / 2), cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(Math.round(x + w / 2), cy, Math.max(1, r - 3), 0, Math.PI * 2); ctx.stroke();
      }
      break;
    default:
      // storefront, workshop, ducts: the fascia — one course
      // under the first row.
      if (rows > 1) hline(rowGutter(0));
  }
}

function lcdCloud(ctx, x, y, pose) {
  const a = [[0, 8], [3, 4], [8, 4], [11, 0], [19, 0], [23, 5], [29, 5], [34, 9], [31, 12], [3, 12]];
  const b = [[2, 7], [5, 3], [11, 3], [14, 0], [21, 1], [24, 5], [31, 5], [36, 9], [33, 12], [5, 12]];
  // The live pose in ink, and no ghost of the other one under it: a cloud
  // rather than a diagram of where a cloud could be.
  ctx.strokeStyle = LCD_CLOUD_INK;
  lcdStrokePath(ctx, (pose ? b : a).map(([px, py]) => [x + px, y + py]), true);
}

// THE HIGHEST ROW THE MASONRY REACHES, and it exists because the bake that
// masonry lives in is a window rather than a canvas. Facades, their line art
// and their crowns are painted once into bakedCity and blitted every frame;
// that surface used to be anchored at the authored frame's own top, so a scene
// whose roofs stand above it lost them, while everything drawn live over those
// roofs — a bank, a mast, a gorilla — stayed exactly where it belonged. A lit
// meter over a headless building is the shape of that bug.
//
// The crown is the one thing the bake puts ABOVE a roof (gbcBuildingLineArt:
// parapets, stacks, pediments, the tallest of them 21), so a roof plus that is
// the whole of what has to fit.
// Where a searchlight's beam stops in the authored panel: under the beat
// strip's band, which is also why the landscape clouds sit at 27. A scene with
// its own sky (the portrait ones) names its own in `skyTop`.
const LCD_BEAM_CEILING = 26;
const LCD_CROWN_REACH = 21;
// The bank's cabinet: six cells of meter and a pixel of air top and bottom.
const LCD_EQ_BANK_ROWS = 6;
const lcdBankH = (grid) => LCD_EQ_BANK_ROWS * grid.bankPitch + 7;
const lcdAntennaH = (index) => 13 + (index % 3) * 3;
function lcdBakedTop(art) {
  let roof = GROUND_Y;
  for (const building of art.buildings) roof = Math.min(roof, GROUND_Y - building[2]);
  if (art.gameWatch) roof = Math.min(roof, GROUND_Y - art.gameWatch[2]);
  return roof - LCD_CROWN_REACH;
}

// The cloud floor is not just a stage constant. Portrait rhythm-1 swaps in a
// taller Kong tower and keeps the chart billboard on the neighbouring roof;
// after the portrait city lift those are the first things a cloud can touch.
// Derive the tightest ceiling from the scene actually being painted so a new
// building, billboard size, or portrait lift cannot leave the old cloud band
// sitting on a roof.
/**
 * THE TOP EDGE OF THE BOARD STANDING ON BUILDING `i`, or null where none does.
 *
 * A billboard is the tallest thing this city puts on a roof that is not alive,
 * so it is what the two clearances above the skyline are actually measured
 * against: the cloud band here, and — on the stage with a service — the height
 * a scene has to hang its monorail at. Solved from the sign's own art rather
 * than written down, so a taller board moves the things that must clear it.
 */
export function lcdBoardTop(art, i) {
  const entry = (art?.billboards || []).find(([bi]) => bi === i);
  const building = entry && art.buildings?.[i];
  if (!building) return null;
  const sign = LCD_BILLBOARD_ART[entry[1]];
  const frame = sign?.frames?.[0];
  const ph = entry[1] === 'chart' ? LCD_BOARD_H : frame ? frame.length * 2 + 8 : 0;
  return ph > 0 ? GROUND_Y - building[2] - LCD_BOARD_LEGS - ph : null;
}

function lcdCloudClearanceBottom(art, stageIndex) {
  let bottom = LCD_CLOUD_CLEARANCE_BOTTOM[stageIndex] ?? H;
  const roofOf = (building) => GROUND_Y - building[2];
  for (const building of art.buildings || []) bottom = Math.min(bottom, roofOf(building));
  if (art.gameWatch) bottom = Math.min(bottom, roofOf(art.gameWatch));
  for (let i = 0; i < (art.buildings?.length || 0); i++) {
    const top = lcdBoardTop(art, i);
    if (top != null) bottom = Math.min(bottom, top);
  }
  return bottom - LCD_CLOUD_CLEAR_GAP;
}

function lcdCloudLayer(ctx, art, frame, backgroundContext = null) {
  // The sky was the one part of the panel that never moved. Each cloud now
  // drifts leftward in whole-pixel steps on the heard beat — a different pace
  // per cloud so the layer has depth — wrapping off one edge of the display
  // and back on the other, with a one-pixel bob on the bar. Quantized like
  // everything else here: the beat advances it, nothing else does, and reduced
  // motion (beat 0 forever) gets a parked sky.
  const beatAbs = frame.bar * 4 + frame.beat4;
  for (let i = 0; i < art.clouds.length; i++) {
    const [cx0, cy0] = art.clouds[i];
    const pace = LCD_CLOUD_DRIFT[i % LCD_CLOUD_DRIFT.length];
    // A scene with `cloudSway` keeps its clouds where they are authored: each
    // one drifts that far leftward at its own pace and comes back, a whole
    // pixel a step, rather than crossing the panel. See stage 2's `clouds`.
    let x;
    if (art.cloudSway) {
      const p = lcdMod(beatAbs * pace, art.cloudSway * 2);
      x = cx0 - (p < art.cloudSway ? p : art.cloudSway * 2 - p);
    } else {
      // Wraps off the edge of what is ON SCREEN. In portrait the panel is
      // drawn through a shifted coverage, so a cloud wrapping at the authored
      // frame's edge would disappear well inside the glass. The `+ 36` is the
      // authored phase and stays inside the modulo, or every cloud on the
      // panel slides sideways by a margin.
      x = Math.round(wrapIntoView(ctx, cx0 + 36 - beatAbs * pace, 36));
    }
    const naturalY = cy0 + portraitCloudOffset(backgroundContext)
      + LCD_CLOUD_BOB[lcdMod(frame.bar + i, LCD_CLOUD_BOB.length)];
    const clearanceBottom = lcdCloudClearanceBottom(art, frame.stageIndex);
    const maxY = clearanceBottom == null ? naturalY
      : clearanceBottom - LCD_CLOUD_BODY_H - LCD_CLOUD_CLEAR_GAP;
    const y = Math.min(naturalY, maxY);
    lcdCloud(ctx, x, y, lcdMod(frame.bar + frame.phrase + i, 2));
  }
}

// ---- the portrait city ----------------------------------------------------
//
// THREE BUILDINGS, NOT EIGHT, AND THE SAME THREE EVERY TIME.
//
// A phone shows 270 of this panel's 480 authored columns and shows them 1.78x
// bigger, so a skyline authored for a 480-wide frame arrives as a crowd of
// half-facades with their landmarks off the edge. rhythm-1 solved that a while
// ago by authoring its own portrait scene — two structures, a coarser print
// grid, the sky left open — and these are the other two stages done the same
// way. Peter: "fewer buildings in both, à la 3-1".
//
// WHAT SURVIVES THE CUT is what the stage is about. The combo board opens
// every one of them, on the roof nearest the hero, because it is the thing
// answering to the run. Then the stage's own landmark: the window washer on
// rhythm-2, Kong on rhythm-3. The third is the panel's other picture — the
// maze attract board on 2, the relay mast on 3 — and it is there because two
// facades in a 270px window is a gap with bookends.
//
// TALL ENOUGH TO BE A CITY, WITH THE SKY STILL THE SKY. The roofs started at
// rhythm-1's own band and came up twenty-eight from there (Peter: "all the
// buildings could be a bit taller, can we go a bit higher with all") — and the
// whole sky stack came up the same twenty-eight, rigidly, because the wisps
// and the service are measured against the skyline rather than against the
// frame. What that spends is the empty band at the top of the panel, which is
// the only thing on a phone nobody is looking at; what it keeps is a cloud
// band with air above and below it, on every portrait aspect.
//
// AND THE TWO KONGS STAND AT THE SAME HEIGHT. Peter, with rhythm-1 on a phone:
// "here's the building level for 1-1 with Kong — can we do the same in 3-3".
// rhythm-1's tower is 208 tall, so rhythm-3's gorilla facade is 208 too, and
// the rest of its skyline steps down from him exactly as it did. A player
// meeting the same ape on two stages of one cabinet should meet him at the
// same place in the frame; that is a fact about the cabinet rather than about
// either scene, which is why the number is quoted rather than re-chosen.
//
// EVEN SPACING, ON THE GRID. 68px is three portrait-grid columns, the same
// three-window read rhythm-1's combo facade has; 48 is two. The x's are the
// visible window (scene 205..474 after the portrait city shift) divided up
// with equal gaps — except beside Kong, where the gap is the chute's and is
// twice the rest for the reason the landscape scene gives at `barrelDrop`.
// THE HIGHEST ROW A PORTRAIT SCENE MAY DRAW ON, and it is measured rather
// than judged. A phone paints its beat rail across the top of the scenery
// band, so what is left is not the frame's sky but the sky under that plate —
// and how much that is depends on the shape of the phone. The first free row,
// in this panel's own coordinates, on the frames worth supporting:
//
//   430x932  -141     414x896  -133     768x1024 (4:3)  -160
//   393x852  -121     360x740   -89     834x1194        -210
//
// The 360x740 Android is the tightest of them and therefore the one every
// scene is authored against; this keeps nine rows of air under even that.
// Nothing in a portrait scene — a wisp, a board, the service, the crossing —
// may cross this line, and tests/lcd-background.js holds all three to it.
export const LCD_PORTRAIT_SKY_TOP = -80;
const LCD_PORTRAIT_FACADE_W = LCD_PORTRAIT_COMBO_W;                      // 68: three windows
const LCD_PORTRAIT_NARROW_W = 2 * LCD_PORTRAIT_GRID.unit
  + 2 * LCD_PORTRAIT_GRID.colPitch;                                      // 48: two

// RHYTHM-2: the combo board, the window washer, and the maze board.
//
// THE RAIL IS THE CEILING, AND A ROOF IS NOT THE THING IT HAS TO CLEAR. A
// board stands eight of leg and thirty-two of panel above its roof, and on
// this skyline that is the highest thing there is, so the girder is measured
// off the BOARD (lcdBoardTop) and never off the masonry.
//
// AND THE SERVICE RUNS AT KONG'S LEVEL. Peter: "3-2 can have the monorail at
// Kong's level, and bring up the building under that". The other two stages of
// this cabinet put a gorilla at the top of the picture — his roof at 24, his
// raised barrel at -33 — so this one puts its cars in that same band, -30 to
// -18, and the city comes up underneath until every roof and board is ten
// clear of the girder. Ten is the clearance a phone can afford: at this zoom
// it is a clean band of sky between the rail and the city, where the same ten
// in landscape is the last of the air.
const LCD_PORTRAIT_STAGE_2 = Object.freeze({
  ...LCD_CITY_SCENES[2],
  skyTop: LCD_PORTRAIT_SKY_TOP,
  // Twenty between facades, the same as rhythm-3's: two cities on one cabinet,
  // seen through the same window, spaced alike.
  buildings: Object.freeze([
    [216, LCD_PORTRAIT_FACADE_W, 200, 'deco', 'portrait-grid'],
    [304, LCD_PORTRAIT_FACADE_W, 230, 'deco', 'portrait-grid'],
    [392, LCD_PORTRAIT_FACADE_W, 210, 'music-hall', 'portrait-grid'],
  ]),
  clouds: Object.freeze([[228, -56], [330, -64], [420, -52]]),
  cloudSway: 24,
  // THE MAZE BOARD TAKES THE THIRD ROOF. It runs the attract screen of a game
  // this cabinet is old enough to remember, a cell per heard beat — the one
  // other picture on this panel that keeps the tempo, and worth more on a
  // phone than the meter cabinet that stood here (Peter: "make the third
  // building the Pac-Man billboard"). Its board is 22 tall against the combo's
  // 32, so it is comfortably under the rail on a roof eight lower.
  billboards: Object.freeze([[0, 'chart'], [2, 'chase']]),
  // The washer's roof carries the man on the cradle and nothing else — the
  // same reason it is bare in landscape.
  bareRoofs: Object.freeze([1]),
  washer: Object.freeze([1, 34]),
  // On the maze board's roof, outboard of its legs, exactly as the landscape
  // scene stands its second lamp on the board's own building.
  searchlights: Object.freeze([[2, 10]]),
  train: Object.freeze({ ...LCD_CITY_SCENES[2].train, y: -30 }),
});

// RHYTHM-3: the combo board, the relay mast, and Kong on the last roof.
//
// KONG STANDS AT THE RIGHT-HAND END, where the landscape scene puts him and
// where Peter wants him, and the air to his right is the barrel's rather than
// the panel's. The chute stands a fixed reach past his wall now (see
// lcdChuteX), and it falls CLOSE to him: ten of air, near enough that the
// barrel reads as leaving his hands rather than as passing by. That is ten
// the skyline gets to keep, so the row is spaced on what is left — twenty
// between facades against seventeen — with his wall at 434, the chute at 452
// and the barrel drawn 444..460 inside a window that ends at 473.
const LCD_PORTRAIT_STAGE_3 = Object.freeze({
  ...LCD_CITY_SCENES[3],
  skyTop: LCD_PORTRAIT_SKY_TOP,
  buildings: Object.freeze([
    [210, LCD_PORTRAIT_FACADE_W, 192, 'relay', 'portrait-grid'],
    [298, LCD_PORTRAIT_NARROW_W, 172, 'industrial', 'portrait-grid'],
    // 208 is rhythm-1's own Kong tower, to the pixel: see below.
    [366, LCD_PORTRAIT_FACADE_W, 208, 'deco', 'portrait-grid'],
  ]),
  clouds: Object.freeze([[222, -54], [322, -42], [422, -60]]),
  billboards: Object.freeze([[0, 'chart']]),
  rooftopGorilla: 2,
  transmitter: 1,
  smokestacks: Object.freeze([]),
  // THE CROSSING KEEPS ITS CLEARANCE, which is a difference and not a height:
  // Kong's portrait roof is 46, so his raised barrel tops out at -11, and the
  // lane is set so the towed banner bottoms out two above it exactly as it does
  // in landscape. Both ends move together; the climb itself is done by x 200,
  // well left of anything a phone shows, so what crosses the visible panel is
  // the levelled-off lane at `to`.
  plane: Object.freeze({ ...LCD_CITY_SCENES[3].plane, from: -23, to: -47 }),
});

// The phone's scene per stage, or null for a stage that has none.
const LCD_PORTRAIT_SCENES = Object.freeze([null,
  LCD_PORTRAIT_STAGE_1, LCD_PORTRAIT_STAGE_2, LCD_PORTRAIT_STAGE_3]);

/**
 * THE SCENE THIS FRAME IS ACTUALLY PAINTING, which is the one thing every
 * painter, the window-cell cache and the panel key have to agree about.
 *
 * Landscape hands back the authored table by identity, so nothing about that
 * path changed.
 */
export function lcdArtFor(stageIndex, context) {
  return (context?.portrait && LCD_PORTRAIT_SCENES[stageIndex])
    || LCD_CITY_SCENES[stageIndex];
}

// ---- the chase ----------------------------------------------------------
//
// A maze-game attract screen on a rooftop: three ghosts running, a few pellets
// left in the corridor behind them, and the round one coming up on those.
// Everything steps ONE CELL PER HEARD BEAT and he chomps on the same beat,
// which is the only clock anything on this panel keeps — so the chase is
// quarter notes, and a player watching the board is watching the tempo.
//
// Built as a STRIP that the board is a window onto, rather than as a list of
// authored frames: the cast is forty cells long against a thirteen-cell board,
// so frames would be forty near-identical pictures. A strip says it once and
// the window does the walking. Forty cells is ten bars, so the chase comes
// round on a bar line rather than mid-phrase.
//
// THE GAPS ARE THE PICTURE. Four sprites at an even pitch is a queue, not a
// chase — what says one thing is after another is the DISTANCE between them,
// and what says he is gaining is the row of pellets lying in it. The ghosts run
// nose to tail; eleven cells of corridor and three dots separate the last of
// them from him, and the SAME again separates him from the pack coming round.
// Without that second gap the strip's wrap put him nose to tail with the ghost
// he is chasing, which is the one arrangement that says he has caught them.
const LCD_CHASE_W = 13;
const LCD_CHASE_H = 7;
const LCD_CHASE_LEN = 48;
// Where each of them stands on the strip, in cells. Left to right is the order
// they are seen in, and they all travel left, so the ones in front are the ones
// being chased.
const LCD_CHASE_CAST = [
  { at: 0, ghost: 'A' }, { at: 7, ghost: 'B' }, { at: 14, ghost: 'C' },
  { at: 31, ghost: null },
];
const LCD_CHASE_PELLETS = [22, 25, 28];
// A ghost: domed head, scalloped skirt, and eyes with WHITES and pupils rather
// than holes punched in the body. The holes were the cheap version and they
// read as a mask — an eye is a light thing with a dark thing in it, and the
// pupils sit to the left of their whites because that is the way he is running.
const lcdGhostCells = (k, pose) => [
  '..XX..',
  '.XXXX.',
  'XXXXXX',
  'WWXWWX',
  'pWXpWX',
  'XXXXXX',
  pose ? 'X.XX.X' : '.XX.XX',
].map((row) => row.replaceAll('X', k));
// ...and the round one, facing the way he is travelling, chomping on the beat,
// WITH AN EYE. Without it he is a pie chart.
//
// SEVEN BY SEVEN, because he is a circle and a circle needs a square to stand
// in. At six wide against seven tall the closed pose was an egg on its end —
// the one sprite in the game whose whole identity is that it is round, drawn
// out of round. The mouth is a wedge cut from the leading edge to the middle,
// so it opens where he is going.
const lcdPacCells = (pose) => [
  '..PPP..',
  '.PPPePP',
  pose ? 'PPPPPPP' : '..PPPPP',
  pose ? 'PPPPPPP' : '...PPPP',
  pose ? 'PPPPPPP' : '..PPPPP',
  '.PPPPP.',
  '..PPP..',
];
function lcdChaseStrip(pose) {
  const cells = [];
  for (let r = 0; r < LCD_CHASE_H; r++) cells.push(new Array(LCD_CHASE_LEN).fill('.'));
  for (const m of LCD_CHASE_CAST) {
    const art = m.ghost ? lcdGhostCells(m.ghost, pose) : lcdPacCells(pose);
    for (let r = 0; r < LCD_CHASE_H; r++) {
      for (let c = 0; c < art[r].length; c++) {
        if (art[r][c] !== '.') cells[r][(m.at + c) % LCD_CHASE_LEN] = art[r][c];
      }
    }
  }
  // On the corridor's centreline, which is where a maze game puts its dots and
  // is the row his mouth is open on.
  for (const at of LCD_CHASE_PELLETS) cells[3][at % LCD_CHASE_LEN] = 'd';
  return cells.map((row) => row.join(''));
}
const LCD_CHASE_STRIPS = [lcdChaseStrip(0), lcdChaseStrip(1)];
function lcdChaseGrid(frame) {
  const strip = LCD_CHASE_STRIPS[frame.beat4 % 2];
  const off = lcdMod(frame.bar * 4 + frame.beat4, LCD_CHASE_LEN);
  return strip.map((row) => {
    let out = '';
    for (let c = 0; c < LCD_CHASE_W; c++) out += row[(off + c) % LCD_CHASE_LEN];
    return out;
  });
}

// ---- rooftop billboards -------------------------------------------------
//
// Big framed panels on legs, with COARSE PIXEL images — 2px cells lit against
// a dark board the way window cells are lit against a facade. The old rooftop
// crowns were 5px frames with nothing on them; these are signs you can read
// from the lane. The invader does its classic two-frame dance on the bar.
const LCD_BILLBOARD_ART = {
  invader: {
    // Half tempo: the dance lands on beats 1 and 3, not on every quarter.
    rate: 2,
    ink: { X: '#b9cf79' },
    frames: [[
      '..X.....X..',
      '...X...X...',
      '..XXXXXXX..',
      '.XX.XXX.XX.',
      'XXXXXXXXXXX',
      'X.XXXXXXX.X',
      'X.X.....X.X',
      '...XX.XX...',
    ], [
      '..X.....X..',
      'X..X...X..X',
      'X.XXXXXXX.X',
      'XXX.XXX.XXX',
      'XXXXXXXXXXX',
      '.XXXXXXXXX.',
      '..X.....X..',
      '.X.......X.',
    ]],
  },
  burger: {
    ink: { B: '#d4a35e', K: LCD_WINDOW_ON, L: '#b9cf79', P: '#8a5a35' },
    frames: [[
      '...BBBBB...',
      '..BBBBBBB..',
      '.BBBBBBBBB.',
      '.KKKKKKKKK.',
      '.LLLLLLLLL.',
      '.PPPPPPPPP.',
      '.BBBBBBBBB.',
      '..BBBBBBB..',
    ]],
  },
  // A cassette for the rhythm cabinet: solid shell, cream label with a red
  // stripe, round-ish reel hubs joined by the tape through the window, and a
  // chamfered base. The first draft's two big square reels on an empty shell
  // read as a robot's eyes; the label band and the tape line are what say
  // CASSETTE at this resolution.
  // Three ghosts and the round one behind them, walking a cell a beat. The
  // picture is generated (see lcdChaseGrid); `frames` is here to size the
  // board and to be what a caller with no clock draws.
  chase: {
    ink: {
      A: '#b9cf79', B: LCD_WINDOW_ON, C: '#d4a35e', P: '#f6d33c',
      W: '#e1d68c', p: LCD_PRINT, e: LCD_PRINT, d: '#e1d68c',
    },
    grid: lcdChaseGrid,
    frames: [lcdChaseGrid({ bar: 0, beat4: 0 })],
  },
  cassette: {
    ink: { S: '#b9cf79', L: '#e1d68c', K: LCD_WINDOW_ON, O: LCD_PRINT, T: '#8a5a35' },
    frames: [[
      'SSSSSSSSSSSSS',
      'SLLLLLLLLLLLS',
      'SKKKKKKKKKKKS',
      'SSSOSSSSSOSSS',
      'SSOOOTTTOOOSS',
      'SSSOSSSSSOSSS',
      'SSSSSSSSSSSSS',
      '.SSSSSSSSSSS.',
    ]],
  },
};

// THE SHARE PRICE, drawn from how the run is actually going.
//
// `form` is the one gameplay number this city is allowed to see: 0.5 at the
// start of a stage, climbing a step per on-beat jump or slide, dropping on a
// missed beat and dropping hard on a hit. Everything else about the trace is
// authored — a fixed wobble so the line reads as a market rather than a ramp —
// and the form only sets where the RIGHT-HAND end of it lands. Null form (the
// hub, the gallery, or any cabinet that is not a live run) draws
// the flat mid-board trace, which is the authored sign it has always been.
//
// THE BOARD IS DRAWN AS A CHART, not as a shape that happens to slope. The
// first pass filled every riser between two neighbouring points, which at two
// pixels a cell welded the whole line into one fat diagonal worm — legible as
// a blob and nothing else. Two things fix it and both are what a chart has:
// ONE CELL PER COLUMN (neighbouring cells touch at the corner, which is how a
// line reads at this pitch), and RULINGS — an unlit axis up the left edge and
// along the bottom — so the eye has something for the trace to be high or low
// against. The slope is clamped to a cell per column for the same reason: a
// two-cell step is a wall, and a wall is a blob again.

// The reward for a clean run of beats: the board drops the market and puts up
// a thumb. Solid like the invader — outlines vanish at this cell size — with
// two dark creases doing the work of curled fingers.
// ---- the board that counts -------------------------------------------------
//
// THE BOARD ON THE ROOF THE HERO RUNS UNDER REPORTS THE RUN, and what it reports
// is the ON BEAT STREAK: the count, with the word under it.
//
// It drew a SHARE PRICE for most of its life — a trace that tilted with a hidden
// scalar — and that lost on two counts. The fiction was one joke resting on the
// cabinet's name and nothing else in the game; and the trace was decoration
// wearing information's clothes, because a tilting squiggle on a rooftop is not
// a thing a player reads as "how you are doing". The run was already counting
// something they could: clean beats in a row (RunState.beatCombo).
//
// THE WORD IS NOT DECORATION. A naked 47 on a rooftop could be a score, a lap, a
// level or a countdown; COMBO under it is what makes it a streak. And it puts
// this board on the same stack as the verb sign beside it — a big mark on top,
// its word underneath — so the roof reads as one sign changing its mind rather
// than two signs sharing a post.
//
// IT FILLS THE FACE EXACTLY. Fourteen pixels of digits, three of gap and seven
// of word is the twenty-four this board has, which is why there is no trace
// under it and no room for one: the graph did not lose a bake-off so much as
// run out of board.
const LCD_COMBO_WORD = 'COMBO';
// 2px cells, and the same size at every count. 3px digits are fifteen wide, so
// two fit this board and three do not — and sizing to fit would shrink the
// number the moment a run passed ninety-nine, which is the run where it matters
// most. A counter that changes size as it climbs is a counter nobody trusts.
const LCD_COMBO_SCALE = 2;

/** Print a run of glyphs at `scale` px per cell, left edge at x, top at y. */
function lcdPrintNumber(ctx, text, x, y, scale) {
  let cx = x;
  for (const ch of text) {
    const glyph = pixelGlyph(ch);
    if (glyph) {
      for (let r = 0; r < glyph.length; r++) {
        for (let c = 0; c < 5; c++) {
          if (glyph[r][c] === '1') ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
        }
      }
    }
    cx += (5 + 1) * scale;
  }
}
function lcdNumberW(text, scale) {
  return text.length * (5 + 1) * scale - scale;
}

/**
 * The board, counting.
 *
 * Paints its own hardware (lcdBoardFrame) so it is identical to the verb sign
 * that takes this roof over during the opening bars — same legs, same rim, same
 * size, whichever is up.
 *
 * THE CHEER IS THE NUMBER GOING GOLD. Every eighth clean beat the run raises
 * `cheer` for a couple of seconds; the board does not become a different sign
 * for it, it gilds the fact it is already showing. That is what retired a whole
 * bake-off of thumbs, stars and meters — the celebration and the readout turned
 * out to be the same object. The WORD stays cream throughout: it is a label,
 * not a reading, and gilding it too would flash the whole board when what is
 * being celebrated is the number.
 */
function lcdComboBoard(ctx, building, frame) {
  const { cx, top } = lcdBoardFrame(ctx, building, LCD_BOARD_W, LCD_BOARD_H);
  const streak = Math.max(0, Math.trunc(frame.streak || 0));
  const n = String(streak);
  const stack = 7 * LCD_COMBO_SCALE + LCD_SIGN_GAP + 7;
  const y = top + Math.round((LCD_BOARD_H - stack) / 2);
  // A ZERO IS LIT LIKE ANY OTHER COUNT. It was ghosted first — drawn in the ink
  // every other off cell on this panel uses, so the first clean beat would be a
  // light coming on — and that lost on the only ground that matters here: at
  // 2px on a board seen from the lane, an unlit digit is not a quiet digit, it
  // is an unreadable one. This board is the one place on the skyline the player
  // is meant to READ rather than glance at, and legibility outranks the cue.
  ctx.fillStyle = frame.cheer ? '#f6d33c' : LCD_PANEL_LIT;
  lcdPrintNumber(ctx, n, cx - Math.round(lcdNumberW(n, LCD_COMBO_SCALE) / 2), y, LCD_COMBO_SCALE);
  ctx.fillStyle = LCD_PANEL_LIT;
  lcdPrintNumber(ctx, LCD_COMBO_WORD,
    cx - Math.round(lcdNumberW(LCD_COMBO_WORD, 1) / 2), y + 7 * LCD_COMBO_SCALE + LCD_SIGN_GAP, 1);
}

// ---- the sign that shouts a verb ------------------------------------------
//
// THE SHARE PRICE IS THE BOARD THAT ANSWERS TO THE RUN, so it is the board that
// says a verb is about to be needed. It already gives its whole face over to a
// streak reward on a clean run (lcdStreakBoard), so a sign that stops being a chart
// for a few bars is not a new idea here — it is the one board on this skyline
// that was always allowed to. And it is on the right roof: the price sits
// second from the left BECAUSE the hero runs at screen x 56, which makes it the
// sign the player is already under.
//
// IT IS ITS OWN PAINTER RATHER THAN ANOTHER GRID, and the words are why. Every
// other board on this skyline is an 11x8 image of 2px cells — twenty-two pixels
// across — and the smallest lettering this panel owns needs thirty-five to say
// ATTACK. So this sign is drawn at two resolutions: the MARK in coarse strokes
// like everything else here, and the WORD in the fine 1px letters the plane's
// banner is written in. That is not an inconsistency, it is the distinction the
// panel already makes — pictures are coarse, print is fine.
//
// THE MARK IS THE RIBBON'S TRIANGLE, not an arrow. A plain triangle up for
// jump, plain triangles down for slide, a ring for the power: the exact shapes
// the beat ribbon draws (hud.js) and the road repeats under the hero's feet
// (beatground.js). A stemmed arrow was drawn here first and it was wrong for a
// reason that outranks how it looked — it was a FOURTH shape for a thing the
// player is about to meet twice more in a different one.
//
// SLIDE CAN CARRY TWO OF THEM, and that is the ribbon's law again rather than a
// flourish. Shape says which button; COLOUR says which object is arriving. Two
// different things are slid under on this cabinet — a barrel coming along the
// floor in the wood the player watched come down the gorilla's chute, and a
// drone hanging still overhead in cyan — and the strip already draws that
// distinction (hud.js, `marker.prop === 'barrel'`). A stage that asks for both
// shows both, in the order the run hands them over.
const LCD_SIGN_WORD = { jump: 'JUMP', slide: 'SLIDE', ability: 'ATTACK' };
const LCD_SIGN_TRACK = 1;    // between letters, as the banner sets it
// RIM TO CONTENTS. Three, not one — the sign used to run its longest word from
// rim to rim, which reads as a board that could not hold what was put on it. A
// border is what makes a sign look like a sign rather than a crop.
//
// It is the one number here that cannot be paid for by scaling: the letters are
// already at 1px, which is the panel's floor, so the six characters of ATTACK
// are thirty-five pixels wide whatever else changes. The border therefore has
// to come out of the BOARD, which grows four pixels — and the marks come down a
// pixel each so the contents do not grow with it and eat the room back.
const LCD_SIGN_PAD = 3;      // rim to contents
const LCD_SIGN_GAP = 3;      // mark to word
// The mark's half-width and half-height, and the ring's radius. A square board
// has height to spend that the old letterbox did not, so these are bigger than
// the 11x8 boards' own art and read from the lane rather than from the gallery.
const LCD_SIGN_MARK_W = 6, LCD_SIGN_MARK_H = 6, LCD_SIGN_RING_R = 5;
const LCD_SIGN_MARK_GAP = 4; // between two marks, when a verb carries two

function lcdSignWordW(word) {
  return word.length * (5 + LCD_SIGN_TRACK) - LCD_SIGN_TRACK;
}

/**
 * How big the board on this roof is — a RECTANGLE, sized to the sign.
 *
 * ONE SIZE, WHATEVER IS ON IT. The price and the verb sign trade this board
 * back and forth mid-stage, and a board that changed shape as they did would
 * read as two different signs being swapped rather than one sign changing its
 * mind. So the size is a property of the ROOF, solved here and used by both.
 *
 * IT IS SOLVED FROM THE SIGN, not chosen and not taken from the facade. The
 * width is the widest label this cabinet has to print — ATTACK, thirty-five
 * pixels of 1px lettering — and the height is a mark, a gap and a line of text.
 * A square board was tried first, at the facade's own width, and it failed at
 * both ends: it was a pixel too narrow for the word on the two thirty-six wide
 * roofs that carry it, and once made wide enough it left the share price a
 * small squiggle adrift in a lot of empty panel. A rectangle that the sign
 * exactly fills is what both things wanted.
 */
const LCD_BOARD_W = Math.max(...Object.values(LCD_SIGN_WORD).map(lcdSignWordW))
  + (LCD_SIGN_PAD + 1) * 2;
// AND THE HEIGHT IS THE TALLER OF THE TWO THINGS THAT STAND ON IT. The verb
// sign stacks a mark, a gap and a word; the counting board stacks two-pixel
// digits, a gap and a word, and those digits are a pixel taller than the mark.
// Sized to the sign alone, the count ran four clear pixels above and two below —
// a stack pushed against the bottom rim, which is exactly the crop the border
// was added to stop. Both stacks are CENTRED in the result, so each gets the
// same air top and bottom whatever it is showing.
const LCD_BOARD_H = Math.max(7 * 2, LCD_SIGN_MARK_H * 2)
  + LCD_SIGN_GAP + 7 + (LCD_SIGN_PAD + 1) * 2;

/** How much air a board stands on over its roof — see lcdBoardFrame. */
const LCD_BOARD_LEGS = 8;

/** The hardware every board on this roof stands on: legs, brace, panel, rim. */
function lcdBoardFrame(ctx, building, pw, ph) {
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  const left = cx - Math.round(pw / 2), top = roof - LCD_BOARD_LEGS - ph;
  ctx.fillStyle = LCD_PRINT;
  // ONE PIXEL A LEG, like every line on the wall, with the brace run leg to
  // leg so the three pieces are one frame and not a table.
  ctx.fillRect(cx - 8, roof - LCD_BOARD_LEGS, 1, LCD_BOARD_LEGS);
  ctx.fillRect(cx + 7, roof - LCD_BOARD_LEGS, 1, LCD_BOARD_LEGS);
  ctx.fillRect(cx - 8, roof - 4, 16, 1);
  ctx.fillRect(left, top, pw, ph);
  ctx.strokeStyle = 'rgba(220,228,154,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 1.5, top + 1.5, pw - 3, ph - 3);
  return { cx, left, top };
}

/** One of the ribbon's marks, centred on (mx, my), in one action colour. */
function lcdSignMark(ctx, action, mx, my, ink) {
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  if (action === 'ability') {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, LCD_SIGN_RING_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  const up = action !== 'slide';
  ctx.beginPath();
  ctx.moveTo(mx, my + (up ? -LCD_SIGN_MARK_H : LCD_SIGN_MARK_H));
  ctx.lineTo(mx - LCD_SIGN_MARK_W, my + (up ? LCD_SIGN_MARK_H : -LCD_SIGN_MARK_H));
  ctx.lineTo(mx + LCD_SIGN_MARK_W, my + (up ? LCD_SIGN_MARK_H : -LCD_SIGN_MARK_H));
  ctx.closePath();
  ctx.fill();
}

/**
 * The rooftop sign, shouting one verb: the mark (or marks) over the word.
 *
 * IT FLASHES ON EVERY BEAT — three quarters lit, the last quarter dark.
 *
 * That is a shorter, harder pulse than anything else on this panel does, and it
 * is deliberate: the rest of the city STEPS on the beat, which says "there is a
 * tempo here", and this sign BLINKS on it, which is what a sign does when it
 * wants to be read now. It is also the reason the duty cycle is three-quarters
 * rather than a half — a lamp that is dark as often as it is lit reads as
 * broken, and the message has to survive being looked at during the off part.
 *
 * The phase is the MUSIC's, not the opening clock's: the sign is lit against
 * the same beat the player is hearing and jumping on. Under reduced flashing it
 * stands lit — the sign carries something the player needs, so the fallback is
 * the message without the strobe, never no message.
 */
const LCD_SIGN_DUTY = 0.75;
// THE REAL BARREL'S RIM FLASHES ON THE SAME DUTY. A steady 2px rim on a 16px
// barrel at the far end of a skyline is a thing you can miss; a rim that beats
// with the song is a thing that catches the eye from the road. Same three
// quarters on, same reason as the sign.
function lcdRimOn(frame) {
  return frame.signOn;
}
function lcdVerbSign(ctx, building, cue, frame) {
  const word = LCD_SIGN_WORD[cue.action];
  if (!word) return;
  const inks = Array.isArray(cue.ink) ? cue.ink : [cue.ink];
  if (!inks.length) return;
  const { cx, left, top } = lcdBoardFrame(ctx, building, LCD_BOARD_W, LCD_BOARD_H);
  if (!frame.signOn) return;

  // The block of marks and the word under them, centred in the board.
  const markW = LCD_SIGN_MARK_W * 2;
  const span = inks.length * markW + (inks.length - 1) * LCD_SIGN_MARK_GAP;
  // Off the mark's HEIGHT, not its width. The two are equal today, so this was
  // right by luck; a taller triangle than it is wide would have hung the whole
  // stack off centre and nothing would have said why.
  const blockH = LCD_SIGN_MARK_H * 2 + LCD_SIGN_GAP + 7;
  const my = top + Math.round((LCD_BOARD_H - blockH) / 2) + LCD_SIGN_MARK_H;
  let mx = cx - Math.round(span / 2) + LCD_SIGN_MARK_W;
  for (const ink of inks) {
    lcdSignMark(ctx, cue.action, mx, my, ink);
    mx += markW + LCD_SIGN_MARK_GAP;
  }

  // The word, in the panel's own lit cream rather than an action's colour. On
  // this cabinet colour means WHICH OBJECT is arriving and shape means what to
  // do about it; a word is neither, and printing SLIDE in the barrel's wood
  // would claim the letters carry a reading of their own — which is exactly the
  // reading the two marks above it are there to make.
  let lx = cx - Math.round(lcdSignWordW(word) / 2);
  const ly = my + LCD_SIGN_MARK_H + LCD_SIGN_GAP;
  ctx.fillStyle = LCD_PANEL_LIT;
  for (const ch of word) {
    const rows = pixelGlyph(ch);
    if (rows) {
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < 5; c++) {
          if (rows[r][c] === '1') ctx.fillRect(lx + c, ly + r, 1, 1);
        }
      }
    }
    lx += 5 + LCD_SIGN_TRACK;
  }
}

function lcdBillboard(ctx, building, artName, frame) {
  const art = LCD_BILLBOARD_ART[artName];
  if (!art) return;
  // A sign on a drum. `hit` is 1 on the frame a kit piece is actually heard
  // and decays from there, so the board's dark panel washes pale on the snare
  // and settles between hits — the one place the city answers a single sound
  // rather than the beat grid.
  const strike = frame.strike;
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  // A sign may generate its picture instead of stepping authored frames — the
  // chart does, because what it says is the run's own business.
  const live = art.grid ? art.grid(frame) : null;
  const rows = (live || art.frames[0]).length, cols = (live || art.frames[0])[0].length;
  // THE PRICE'S BOARD IS THE VERB SIGN'S BOARD, and the price fills it.
  //
  // This is the one sign on the skyline that trades its face with something
  // else mid-stage, so its size is fixed (LCD_BOARD_W/H) whatever is currently
  // on it — a board that changed shape as they swapped would read as two signs
  // rather than one changing its mind. But a fixed board is wider than the 11x8
  // picture drawn at the 2px cells every other sign here uses, and the trace
  // adrift in a field of empty panel looked like a fault. So THIS board's cells
  // are scaled to fit it: the largest whole pixel that still lands eleven cells
  // across and eight down, which is the same coarse-picture idea one size up
  // rather than a second way of drawing a sign.
  //
  // Every other board on the skyline still takes its size from its own picture
  // and draws at 2, because nothing ever replaces those.
  // Every board left on this skyline takes its size from its own picture. The
  // one that did not — the counting roof — is not drawn through here any more:
  // it and the verb sign paint themselves at a shared fixed size, because they
  // trade one board between them. See lcdComboBoard.
  const fixed = false;
  const pw = fixed ? LCD_BOARD_W : cols * 2 + 8;
  const ph = fixed ? LCD_BOARD_H : rows * 2 + 8;
  const left = cx - Math.round(pw / 2), top = roof - 8 - ph;
  // THE SAME STAND AS EVERY OTHER BOARD — one pixel a leg, brace leg to leg
  // in the same ink, exactly what lcdBoardFrame draws. This painter kept its
  // own copy with two-pixel legs and a soft brace, and the two stands read as
  // two designs side by side on one skyline. Then the board: dark panel, thin
  // lit inner rim.
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(cx - 8, roof - 8, 1, 8);
  ctx.fillRect(cx + 7, roof - 8, 1, 8);
  ctx.fillRect(cx - 8, roof - 4, 16, 1);
  ctx.fillStyle = strike ? 'rgba(120,140,110,0.85)' : LCD_PRINT;
  ctx.fillRect(left, top, pw, ph);
  ctx.strokeStyle = 'rgba(220,228,154,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 1.5, top + 1.5, pw - 3, ph - 3);
  // The image steps a frame every `rate` heard beats (default every beat) —
  // a one-frame sign simply stands lit.
  const step = Math.floor((frame.bar * 4 + frame.beat4) / (art.rate || 1));
  const grid = live || art.frames[lcdMod(step, art.frames.length)];
  // The cell, and how far in the picture starts. A fixed board fills itself;
  // every other sign keeps the 2px cell and the 4px margin it was drawn for.
  const cell = fixed
    ? Math.max(2, Math.min(Math.floor((pw - (LCD_SIGN_PAD + 1) * 2) / cols),
      Math.floor((ph - (LCD_SIGN_PAD + 1) * 2) / rows)))
    : 2;
  const ox = left + Math.round((pw - cols * cell) / 2);
  const oy = top + Math.round((ph - rows * cell) / 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inkColor = art.ink[grid[r][c]];
      if (!inkColor) continue;
      ctx.fillStyle = inkColor;
      ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
    }
  }
}

// ---- the smoke stacks ---------------------------------------------------
//
// A BANK OF THREE, not one chimney. A single stack on a roof is a domestic
// thing — a house has one — and this roof is the industry in a skyline whose
// other buildings are a clock works, a broadcast mast and a record shop. Three
// stacks of stepped heights, shoulder to shoulder, read as a plant from across
// the panel, and they give the plume a reason: the tall one is working, and the
// short one beside it is idling out a wisp.
//
// THEY ARE OUTLINED, NOT SOLID. Every other thing standing on this skyline is
// linework — the facades, the crowns, the mast, the billboards are all stroked
// boxes over the panel — and the chimney was the one filled slab among them,
// which at this size read as a domino someone had left on the roof. Two
// mullions and a capped mouth say stack with the panel showing through, and
// they say it in the same hand as the building underneath.
//
// AND THEY STAND ON A BOILER HOUSE, TAPERED. Outlined parallel-sided tubes on
// a bare roof are three table legs standing in a row — nothing joins them and
// nothing holds them up. A low outlined shed under all three, and a shaft that
// steps out one pixel a side into a footing, is what turns the bank into a
// plant: the stacks come out of a building of their own, and each one widens
// where it meets it the way a chimney does.
//
// ONLY THE TALL ONE MAKES THE PLUME. Three columns of smoke over one 46px roof
// is a grey wash, not a bank of stacks — so the tall stack carries the authored
// plume and the left-hand stub carries two small puffs that die at the height
// the plume is only starting from. The heights are what say the rest.
//
// THE PLUME IS SEPARATE PUFFS, not a column. The first draft ran seven cells
// six pixels apart while the cells themselves were eight to ten tall, so they
// overlapped into one continuous grey stripe leaning off the roof — which is
// what a smear of exhaust looks like, not what smoke looks like. Five cells
// with real air between them, each one wider, fainter and further downwind
// than the last, so the plume comes APART as it climbs. The lowest still sits
// close enough to the mouth to be read as coming out of it (three pixels of
// air, not nineteen — that gap was the first draft's other mistake), and the
// top cell holds under the plane's cruising lane.
//
// The puffs are PIXEL blobs on the same 2px grid the billboards use — soft
// ellipses floated like production smoke against a coarse-pixel skyline. The
// cells are fixed; the beat gives them life: each puff drifts on its own cycle
// and the higher ones come and go.
const LCD_PUFFS = [
  ['.XX.',
   'XOOX',
   'XOOX',
   '.XX.'],
  ['..XX..',
   '.XOOX.',
   'XOOOOX',
   '.XXOX.',
   '..XX..'],
  ['..XXX...',
   '.XOOOX.X',
   'XOOOX.XX',
   '.XOX..X.',
   '..X.....'],
  ['.XXX..XX..',
   'XOOX..XOX.',
   '.XX....XX.',
   '..X.......'],
];
// The idling stub's wisp: a puff and a torn one, and that is the whole of it.
const LCD_WISPS = [['XX', 'OO', 'XX'], ['X.X', '.XX', 'X..']];
function lcdSmokestack(ctx, building, dx, frame) {
  const [x, bw, h] = building;
  const roof = GROUND_Y - h;
  let sx = Math.round(x + dx);
  // THE PLANT OWNS THE WHOLE ROOF. The bank used to stand in the middle third
  // of a 46px roof in one-pixel line, three slim tubes with air either side,
  // and at desktop magnification that is a set of railings — the roof read as
  // empty with something small on it. So the boiler house runs the full width
  // of the building it stands on, bar a two-pixel margin, and the stacks are
  // spread across it rather than huddled at its centre.
  const shedTop = roof - 6;
  const shedL = x + 2, shedR = x + bw - 2;
  // MINIMAL RECTANGLES. The boiler house is a one-pixel box the width of the
  // roof, and each stack is a one-pixel hollow rectangle standing on it — no
  // cap lip, no footing jog, no rim bands. THREE THE SAME WIDTH, EVENLY
  // SPACED: six wide, six apart, six in from each end of a forty-two-pixel
  // shed, so stack and gap are the one measure. The middle one is the working
  // stack and the tallest; the pair beside it are level with each other. All
  // of it is filled with the wall's own wash, then outlined, so the plant is
  // masonry of the same house rather than ink furniture stood on it. The
  // plume does the rest.
  const SW = 6;
  const gap = Math.round((shedR - shedL - SW * 3) / 4);
  const at = (k) => shedL + gap + k * (SW + gap);
  const stubX = at(0);
  const stubTop = roof - 14;
  sx = at(1);
  const box = (lx, top, w) => {
    ctx.fillStyle = LCD_FACADE_WASH;
    ctx.fillRect(lx, top, w, shedTop - top);
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(lx, top, w, 1);
    ctx.fillRect(lx, top, 1, shedTop - top);
    ctx.fillRect(lx + w - 1, top, 1, shedTop - top);
  };
  ctx.fillStyle = LCD_FACADE_WASH;
  ctx.fillRect(shedL, shedTop, shedR - shedL, roof - shedTop);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(shedL, shedTop, shedR - shedL, 1);
  ctx.fillRect(shedL, shedTop, 1, roof - shedTop);
  ctx.fillRect(shedR - 1, shedTop, 1, roof - shedTop);
  box(at(0), roof - 14, SW);
  box(at(1), roof - 20, SW);
  box(at(2), roof - 14, SW);
  // Offsets from the ROOF, so raising the stack raises nothing else: the first
  // puff clears the working lip by a pixel and the rest are spaced off the
  // building. The lean grows with height, so the column bends downwind rather
  // than sliding sideways as a whole, and the gaps widen as it goes — the plume
  // is coming apart, not marching. Each x is the grid's LEFT edge, walked left
  // as the puffs widen so the column's centre line is what leans. The top cell
  // stops short of the plane's cruising lane (belly y 62 over this end of the
  // skyline; the top puff tops out at 65).
  const cells = [[0, -29], [-5, -38], [-14, -47], [-26, -55]];
  // The plume breathes with the mix: a quiet bar is three puffs, a loud one
  // carries the whole column. Quantised to whole puffs, like everything here.
  // THREE IS THE FLOOR, not two: two cells on a stack this size is a plant
  // that has just been lit, and the roof spent most of a quiet bar looking
  // switched off.
  const puffs = frame.puffs;
  for (let i = 0; i < puffs; i++) {
    // SPORADIC, AND MORE SO WITH HEIGHT. The lowest puff is always there —
    // smoke leaving a stack does not stutter at the mouth — and above it the
    // chance of a cell sitting the beat out grows one eighth per step, so the
    // crown of the plume is in pieces most bars and whole occasionally. It is
    // a beat-stepped pattern rather than a random one: same beat, same sky.
    if (i > 0 && (frame.beat4 * 3 + i * 5) % 8 < i) continue;
    const [px, py] = cells[i];
    // Each puff drifts on its own three-beat cycle, so they pull apart from
    // one another instead of shimmying in step.
    const wob = (((frame.beat4 + i) % 3) - 1) * 2;
    lcdPuffGrid(ctx, LCD_PUFFS[i], sx + px + wob, roof + py, 0.4 - i * 0.06);
  }
  // The stub only shows it is lit when the plant is working — under four
  // puffs on the tall stack the roof falls quiet but for the one column.
  if (puffs < 4) return;
  for (let k = 0; k < LCD_WISPS.length; k++) {
    if ((frame.beat4 * 5 + k * 3) % 4 === 1) continue;
    lcdPuffGrid(ctx, LCD_WISPS[k], stubX + (k === 0 ? -1 : -5) + (frame.beat4 % 2) * 2,
      stubTop - 1 + (k === 0 ? -6 : -14), 0.28 - k * 0.08);
  }
}

// SMOKE HAS A CORE. A puff painted at one alpha is a grey rectangle with a
// ragged edge — the eye reads a smudge, not a volume — so the grids carry two
// inks: `X` is the fringe and `O` the thicker middle, half again as dense. Two
// passes rather than two colours, so the puffs still sit on the panel's own
// blue-grey and still stack correctly where they overlap.
function lcdPuffGrid(ctx, grid, x, y, alpha) {
  for (const [mark, weight] of [['X', 1], ['O', 1.55]]) {
    ctx.fillStyle = `rgba(80,85,92,${Math.min(0.75, alpha * weight).toFixed(2)})`;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === mark) ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
      }
    }
  }
}

// ---- the pixel plane ----------------------------------------------------
//
// An 11x6 coarse-pixel aeroplane that crosses the sky once every sixteen
// bars, 14px per heard beat, flying INTO the cloud wind so the sky has two
// speeds. The propeller is a two-cell blur alternating on the beat, and the
// tail wears the panel's one red. Idle frames use beat 0, where the plane is
// still off-screen — a parked sky stays parked.
//
// The ALTITUDE is scene data, because the one thing a flight lane has to clear
// is whatever the scene put on its tallest roof. A NUMBER is a level crossing
// at that y. An OBJECT — { from, to, level } — is a CLIMB: the plane enters
// low at `from`, gains height as it crosses, and is level at `to` by the time
// it reaches screen x `level`.
//
// Stage 1 climbs, and the beat ribbon is why. The strip used to end at y 38
// and the plane flew along that line, in the last of the sky above it. The
// ribbon is twice the size now and ends at 49, so that lane is inside the
// strip — and the only clear air left on this panel is the slot BELOW the
// ribbon and ABOVE the skyline. That slot is 15px tall at the one place it
// matters (the ribbon at 49, the gorilla's head topping out at 64) and the
// plane's body is 12, so a level crossing at that height would spend the whole
// left half of the panel ploughing through roofs to earn three spare pixels
// over the gorilla. Climbing spends the room where there is room: in low over
// the short buildings on the left, up over the transmitter mast, level from
// the tower onward with its belly just clear of the gorilla's head.
//
// That is the lane the crossing that TAKES THE BARREL flies. A crossing that
// misses climbs higher over the same skyline — see LCD_PLANE_MISS_LIFT.
const LCD_PLANE = [
  '.X.........',
  '.XX........',
  '.XXXXXXXX..',
  'XXXOXOXOXX.',
  '.XXXXXXXXX.',
  '....XX.....',
];
const LCD_PLANE_Y = 46;
// The climb, as a fraction of the way from the entry x to the levelling-off x.
// Eased rather than linear so the plane rotates out of the climb instead of
// hitting its cruise height and stopping dead on one beat — the panel steps
// every cell it draws, and a corner in a flight path reads as a mistake where a
// corner in a walk cycle reads as the toy working.
// Snapped to the panel's 2px grid by its caller, like every other cell it
// draws: the plane is beat-stepped rather than continuous, so that is one fixed
// altitude per step and not a rounding that judders under a moving camera.
function planeClimb({ from, to, level }, x) {
  const k = Math.max(0, Math.min(1, (x - LCD_PLANE_X0) / (level - LCD_PLANE_X0)));
  return from + (to - from) * k * (2 - k);
}
// Where the plane enters, how far it moves per heard beat, how long it is on
// screen, and how big its body is. Named because three things now measure
// against them: the crossing, the climb, and the barrel it is going to hit.
const LCD_PLANE_X0 = -30, LCD_PLANE_STEP = 14, LCD_PLANE_BEATS = 44;
const LCD_PLANE_W = 22, LCD_PLANE_H = 12;

// Where the plane is on a given step of its crossing, or null once it has gone.
// The one place the flight path is solved, so the barrel's fate and the plane's
// own draw cannot disagree about where it was.
function lcdPlaneAt(cyc, altitude, beats = LCD_PLANE_BEATS) {
  if (cyc >= beats) return null;
  const x = LCD_PLANE_X0 + cyc * LCD_PLANE_STEP;
  const y = typeof altitude === 'number' ? altitude
    : 2 * Math.round(planeClimb(altitude, x) / 2);
  return { x, y };
}
// ---- the banner pass ------------------------------------------------------
//
// A plane over a city tows an advert, and this one tows the only announcement
// a rhythm cabinet could make: the song is about to change key. The bar it
// changes on is AUTHORED, in the scene's own `plane.banner`, and it has to be:
// this arrangement moves its transpose eight times in seventy-six bars, most of
// them two-bar colour shifts, and which of those is THE modulation is a
// musical judgement rather than a fact the data states. tests/lcd-background.js
// keeps the authored bar standing on a transpose the song really makes.
//
// The pass is aimed so the rig is DEAD CENTRE on the downbeat it announces —
// the words at their most readable on the bar they are about it. It flew a full
// crossing earlier at first, clearing the frame as the key landed, and that was
// the wrong instinct: an announcement that has left before the thing happens is
// a thing nobody read. `lcdBannerStart` solves the step from the rig's own
// length, so a shorter line still lands mid-screen on the beat.
const LCD_PLANE_CYCLE = 64;
// One panel pixel per glyph cell, not two. Every other mark on this panel is a
// 2px cell, and at that size ten letters would be a hundred and twenty pixels
// of banner on a four-hundred-and-eighty pixel sky — a quarter of the display,
// and taller than the aircraft towing it. The plane's own tail tick is already
// 1px, so the fine grid is not new here; it is what letters need.
const LCD_BANNER_PAD = 1;
const LCD_BANNER_GAP = 6;     // tow line, plane tail to banner
// A BANNER MAY CARRY A PICTURE INSTEAD OF A LETTER, and one does. The font's
// own heart is a battery cell — a small solid blob at five wide — and what was
// asked for is the OTHER heart, the seven-by-seven container off an adventure
// game's status bar, which is a different shape and is red rather than ink.
// Keyed by the character that stands for it in a tow line, so the data stays a
// plain string and the rotation stays a list of them.
const LCD_BANNER_ART = {
  '♥': {
    ink: LCD_WINDOW_ON,
    cells: [
      '.XX.XX.',
      'XXXXXXX',
      'XXXXXXX',
      'XXXXXXX',
      '.XXXXX.',
      '..XXX..',
      '...X...',
    ],
  },
};
const LCD_BANNER_TRACK = 1;
function lcdBannerMark(ch) {
  const art = LCD_BANNER_ART[ch];
  if (art) return { rows: art.cells, w: art.cells[0].length, ink: art.ink, on: 'X' };
  const rows = ch === ' ' ? null : pixelGlyph(ch);
  return { rows, w: 5, ink: LCD_PRINT, on: '1' };
}
function lcdBannerBox(text) {
  let w = LCD_BANNER_PAD * 2 + 2;
  for (const ch of text) w += lcdBannerMark(ch).w + LCD_BANNER_TRACK;
  return { w: w - LCD_BANNER_TRACK, h: 7 + LCD_BANNER_PAD * 2 + 2 };
}
function lcdSkyBanner(ctx, rightX, midY, text) {
  const { w, h } = lcdBannerBox(text);
  const x = Math.round(rightX - w);
  const y = Math.round(midY - h / 2);
  ctx.fillStyle = LCD_PANEL_LIT;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  let cx = x + 1 + LCD_BANNER_PAD;
  const cy = y + 1 + LCD_BANNER_PAD;
  for (const ch of text) {
    const mark = lcdBannerMark(ch);
    if (mark.rows) {
      ctx.fillStyle = mark.ink;
      for (let r = 0; r < mark.rows.length; r++) {
        for (let c = 0; c < mark.w; c++) {
          if (mark.rows[r][c] === mark.on) ctx.fillRect(cx + c, cy + r, 1, 1);
        }
      }
    }
    cx += mark.w + LCD_BANNER_TRACK;
  }
}

// WHERE THE ANNOUNCEMENT'S PASS STARTS, so the rig is mid-screen on the beat it
// announces. Solved from the geometry rather than set by hand: the rig runs from
// the banner's left edge to the plane's nose, and the step of the crossing that
// puts the middle of THAT on the middle of the display depends on how long the
// words are. A shorter banner is a shorter rig and starts a beat later.
function lcdBannerStart(keyBeat, text) {
  const rigLeft = -LCD_BANNER_GAP - lcdBannerBox(text).w;
  const centreOff = (rigLeft + LCD_PLANE_W) / 2;
  const cyc = Math.round((W / 2 - centreOff - LCD_PLANE_X0) / LCD_PLANE_STEP);
  return keyBeat - Math.max(0, Math.min(LCD_PLANE_BEATS - 1, cyc));
}

// Whether an ordinary crossing takes off at all.
//
// ONE crossing gives way to the announcement, not two, and the difference is a
// dead line in the rotation. Grounding everything that overlaps the banner pass
// grounds the crossing before it AND the one after — and this song's form loops
// bars 21 to 76, which is three and a half crossings long, so with two of them
// grounded the sky only ever had room for two of the three lines and the third
// was never once flown.
//
// So what gives way is the crossing that would still be MID-SKY when the
// announcement opens. One starting after it is a plane entering at the left
// while the banner leaves at the right, which is a busy sky rather than a
// broken one — the thing that cannot happen is two rigs crossing each other.
const LCD_PLANE_SHARE_CLEAR = 30;
function lcdFreePassFlies(pass, start) {
  if (start == null) return true;
  const from = pass * LCD_PLANE_CYCLE;
  if (from < start) return from + LCD_PLANE_BEATS <= start;
  return from >= start + LCD_PLANE_SHARE_CLEAR;
}

/**
 * Which line THIS crossing tows.
 *
 * Counted in crossings FLOWN, not in slots of the clock, and that distinction is
 * the whole of this function. Off the raw pass number the grounded crossing
 * still consumes a line — with three lines and the third pass grounded, the
 * fourth comes back round to the first and the third line is never once in the
 * sky. Counting what actually flew hands every line its turn.
 *
 * The first crossing of the song flies CLEAN, which is why the count is offset
 * by one: a panel whose every plane tows a sign has no plane in it, only signs.
 * That opener establishes what the thing is — tail wagging, nothing behind it —
 * and every crossing after it is the same aircraft having been sold advertising.
 * The song's own loop starts at bar 21, so pass zero happens once and never
 * again.
 */
// How many free crossings actually got off the ground before this one.
function lcdFlownBefore(passNo, start) {
  let flown = 0;
  for (let p = 0; p < passNo; p++) if (lcdFreePassFlies(p, start)) flown++;
  return flown;
}

function lcdTowLine(towList, passNo, start) {
  if (!towList || !towList.length || passNo <= 0) return null;
  const flown = lcdFlownBefore(passNo, start);
  return flown > 0 ? towList[lcdMod(flown - 1, towList.length)] : null;
}

// HOW MANY BEATS LATE THIS CROSSING TAKES OFF, one entry per crossing flown.
//
// It is the whole of "the plane only sometimes gets the barrel", and it works
// horizontally because vertically there is nothing to work with: the slot
// between the beat ribbon's band and the gorilla's skull is twelve pixels, the
// plane is twelve pixels, and the raised barrel is inside it — there is no
// altitude that misses, which is why the panel never tried one.
//
// So the plane is somewhere else instead. The barrel is only up on beat one,
// the crossing steps 14px a beat, and the overlap window either side of the
// gorilla is 19px — so the barrel-up beats land the plane at 56px intervals and
// only some of those intervals fall on him. Taking off ONE beat late moves
// every barrel-up beat of the crossing 14px along and the whole pass misses;
// two late, likewise; three late brings the next barrel-up beat back onto him.
// [0, 1, 2] is therefore one strike in three, and the strike is still the same
// authored moment of the crossing it always was — the gag did not become a
// collision, it became occasional.
const LCD_PLANE_DODGE = [0, 1, 2];

// AND A PASS WITH NO BARREL TO TAKE FLIES OVER HIM, not past his ear.
//
// The dodge above is horizontal because vertically there was nothing to spend:
// the slot between the ribbon's band and the skull was twelve pixels and the
// plane is twelve. The strip gave six of those back when it thinned
// (BEAT_RIBBON_BOTTOM was 49), and this is what that room is for. The STRIKING crossing still flies the
// authored lane — the gag is the plane in the barrel and it cannot be flown any
// other way — and the two that miss climb clear of it. Which is the difference
// between a plane that missed and a plane that nearly didn't; at eight pixels a
// miss read as a near miss every time, and a gag that always looks like it
// half-connected has no clean pass to be measured against.
//
// TEN, AND THE GORILLA PAID FOR FOUR OF THEM. Six is what the ribbon freed, and
// spending only that put the lane hard under the strip — a plane touching the
// thing above it is the same crowded reading at the other end. So the tower lost
// four as well (gameWatch 118 -> 114) and the striking lane came down four with
// it, which leaves the contact identical and moves the gorilla out from under
// the miss instead. Cruise top 56 -> 46: clear air under the strip above it, and
// eighteen over his skull instead of eight.
const LCD_PLANE_MISS_LIFT = 10;
// The lane THIS crossing flies. Lifted only where the scene stages the strike
// at all (stage 3's plane passes BEHIND its gorilla and has no barrel to meet)
// and only on the phases that miss — and the lift cannot turn a miss into a
// hit, because it only ever moves the plane further from the barrel, so the
// strike is still solved once off the authored lane and nothing downstream of
// it has to know this happened.
const lcdLiftedLane = new WeakMap();

function lcdPassAltitude(art, pass, altitude) {
  if (!art.gameWatch || lcdBarrelStrike(art, pass.phase) >= 0) return altitude;
  if (typeof altitude === 'number') return altitude - LCD_PLANE_MISS_LIFT;
  let lifted = lcdLiftedLane.get(altitude);
  if (!lifted) {
    lifted = {
      from: altitude.from - LCD_PLANE_MISS_LIFT,
      to: altitude.to - LCD_PLANE_MISS_LIFT,
      level: altitude.level,
    };
    lcdLiftedLane.set(altitude, lifted);
  }
  return lifted;
}

/**
 * WHICH PASS THE PLANE IS ON, or null while the sky is its own.
 *
 * One answer for the draw and for the barrel it is going to hit, because the
 * gag is authored against the step of the crossing and the two may not disagree
 * about which step that is.
 *
 * Ordinarily the crossing free-runs every sixteen bars. When the scene names a
 * banner bar, one pass is nailed to it instead — and the free-running one is
 * suppressed anywhere it would still be in the air when the announcement is
 * due, because a plane that vanished mid-sky to let another one in is two
 * planes, and this panel only ever has one of anything.
 */
function lcdPlaneCyc(art, frame) {
  const beat = frame.bar * 4 + frame.beat4;
  const plane = art && art.plane;
  const banner = plane && plane.banner;
  const cyc = lcdMod(beat, LCD_PLANE_CYCLE);
  // Which line this crossing is carrying. Off the pass NUMBER, not off the beat
  // inside it, or the banner would change words halfway across the sky.
  //
  // THE FIRST CROSSING OF THE SONG FLIES CLEAN, and that is the whole reason
  // the plain aircraft is still worth drawing. A panel whose every plane tows a
  // sign has no plane in it, only signs — the first pass establishes what the
  // thing IS, tail wagging and nothing behind it, and every one after it is
  // that same aircraft having been sold advertising. The song's own loop starts
  // at bar 21, so pass zero happens once, at the top, and never again.
  const towList = plane && plane.tow
    ? (Array.isArray(plane.tow) ? plane.tow : [plane.tow]) : null;
  const passNo = Math.floor(beat / LCD_PLANE_CYCLE);
  // Authored bars are 1-based, the way the desk counts them; the panel's beat
  // clock starts at zero.
  const keyBeat = banner && Number.isFinite(banner.bar) ? (banner.bar - 1) * 4 : null;
  const start = keyBeat == null ? null : lcdBannerStart(keyBeat, banner.text);
  if (start != null) {
    // The announcement pass is NOT dodged. It is aimed so the words are dead
    // centre on the downbeat they are about, and a beat of delay is the one
    // thing that would take them off it. Its phase is wherever that aim put it.
    if (beat >= start && beat < start + LCD_PLANE_BEATS) {
      return { cyc: beat - start, banner: banner.text, phase: lcdMod(start, 4), beats: LCD_PLANE_BEATS };
    }
    if (!lcdFreePassFlies(passNo, start)) return null;
  }
  // A free crossing takes off late by its turn in the dodge rotation. The
  // rotation is indexed by crossings FLOWN, the same count the tow lines use,
  // so a line and the dodge it flies with travel together — and a grounded
  // crossing consumes neither.
  const flown = lcdFlownBefore(passNo, start);
  const dodge = LCD_PLANE_DODGE[lcdMod(flown, LCD_PLANE_DODGE.length)];
  if (cyc < dodge) return null;
  // THE OMEN, if the run rolled one, rides the first crossing to take off
  // after its clock started: the omen's step at THIS crossing's take-off is
  // inside one cycle, so exactly one crossing qualifies — not the one already
  // mid-sky when the clock started (it would change words in the air), and not
  // the one after (the cycle has passed). It replaces the turn's line rather
  // than taking a turn, so the rotation comes round exactly as it would have.
  // Its rig is longer than any line the rotation tows, so its pass runs to the
  // length that gets the whole rig off the right edge — see lcdRigBeats.
  const omen = art.omen && frame.omenStep != null
    && frame.omenStep - (cyc - dodge) >= 0 && frame.omenStep - (cyc - dodge) < LCD_PLANE_CYCLE
    ? art.omen.text : null;
  const beats = omen ? lcdRigBeats(omen) : LCD_PLANE_BEATS;
  if (cyc - dodge >= beats) return null;
  // The cycle is a multiple of four, so the crossing's phase in the bar IS its
  // dodge.
  return {
    cyc: cyc - dodge,
    banner: omen || lcdTowLine(towList, passNo, start),
    phase: lcdMod(dodge, 4),
    beats,
  };
}

/**
 * The middle of the aircraft on this beat, in screen px, or null when there is
 * nothing in the sky. Same three calls lcdPlane makes to draw it — the plane's
 * position is solved once, here, so a thing that WATCHES the plane cannot
 * drift from the thing that draws it.
 */
function lcdPlanePoint(art, frame, altitude = LCD_PLANE_Y) {
  if (!art?.plane) return null;
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return null;
  const pos = lcdPlaneAt(pass.cyc, lcdPassAltitude(art, pass, altitude), pass.beats);
  return pos ? [pos.x + LCD_PLANE_W / 2, pos.y + LCD_PLANE_H / 2] : null;
}

function lcdPlane(ctx, art, frame, altitude = LCD_PLANE_Y) {
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return;
  const pos = lcdPlaneAt(pass.cyc, lcdPassAltitude(art, pass, altitude), pass.beats);
  if (!pos) return;
  lcdPlaneRig(ctx, frame, pos, pass.banner);
}

// HOW LONG A PASS TOWING THIS LINE IS, in beats: the crossing runs until the
// whole rig — aircraft, tow line and banner — has left the right edge. The
// rotation's lines all fit inside LCD_PLANE_BEATS; the omen's does not, and a
// rig that vanished with its tail still on screen would be the one thing on
// this panel that disappears rather than leaves.
function lcdRigBeats(text) {
  const rigW = LCD_PLANE_W + LCD_BANNER_GAP + lcdBannerBox(text).w;
  return Math.ceil((W + rigW - LCD_PLANE_X0) / LCD_PLANE_STEP) + 1;
}

// The aircraft and whatever it tows, at a solved position.
function lcdPlaneRig(ctx, frame, { x, y }, banner) {
  // The banner first, so the tow line runs under the tail rather than over it.
  if (banner) {
    // A towed banner sags and lifts; one pixel on the off beats is the whole of
    // it, and it is the same tick the tail already wags on.
    const sag = frame.beat4 % 2 === 0 ? 0 : 1;
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(x - LCD_BANNER_GAP, y + 6, LCD_BANNER_GAP, 1);
    lcdSkyBanner(ctx, x - LCD_BANNER_GAP, y + 6 + sag, banner);
  }
  for (let r = 0; r < LCD_PLANE.length; r++) {
    for (let c = 0; c < LCD_PLANE[r].length; c++) {
      const cell = LCD_PLANE[r][c];
      if (cell === '.') continue;
      ctx.fillStyle = cell === 'O' ? LCD_PANEL_LIT : LCD_PRINT;
      ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    }
  }
  ctx.fillStyle = LCD_WINDOW_ON;
  ctx.fillRect(x + 2, y, 2, 2);
  // The tail's own wag, and only when there is no banner: with one on the tow
  // line this reads as a second, blank flag flying off the nose.
  if (banner) return;
  ctx.fillStyle = LCD_PRINT_SOFT;
  if (frame.beat4 % 2 === 0) ctx.fillRect(x + 22, y + 3, 1, 8);
  else ctx.fillRect(x + 22, y + 5, 1, 4);
}

// ---- the barrel the plane takes out ---------------------------------------
//
// The plane's lane runs between the beat ribbon's band and the gorilla's skull
// (see the flight lane above), and the barrel he holds over his head is inside
// that gap. There is no altitude that misses it. So it does not miss it: once
// every sixteen bars the plane flies into the barrel and the barrel goes.
//
// This is AUTHORED, not a collision. Both bodies step on the heard beat off
// fixed numbers, so the step they meet on is solved once from the scene and is
// the same every cycle — and it lands on a downbeat, because the barrel is only
// up on beat one. A Game & Watch panel does not do physics; it does the same
// gag at the same moment of the loop forever, and the player learns to watch
// for it. Two cells: the strike, then the staves flung out and already ghosting.
const LCD_BARREL_UP_BEAT = 0, LCD_BARREL_UP_DY = -50;
// How many poses his swing is cut into — one per beat of the bar.
const LCD_BARREL_POSES = 4;
const LCD_BARREL_RX = 8, LCD_BARREL_RY = 7;
// Offsets in 2px cells from the barrel's centre.
const LCD_BURST_STAR = [
  [0, -3], [0, -2], [0, 2], [0, 3], [-3, 0], [-2, 0], [2, 0], [3, 0],
  [-2, -2], [2, -2], [-2, 2], [2, 2], [-1, -1], [1, -1], [-1, 1], [1, 1],
];
const LCD_BURST_DEBRIS = [
  [-6, -4], [-5, -5], [6, -4], [5, -5], [-6, 4], [-5, 5], [6, 4], [5, 5],
  [0, -6], [0, 6],
];

// Which step of the crossing puts the plane inside the raised barrel, or -1 if
// the two never meet. Solved by walking the flight path rather than tested per
// frame: both sides are authored constants, so the answer is a property of the
// scene and is cached on it.
// `phase` is where the crossing's own step 0 falls in the bar — 0 for a pass
// that took off on a downbeat, 1 for one a beat late, and so on. It is what
// makes the gag occasional: the barrel is up on beat one of the bar and the
// plane's position is counted from take-off, so a crossing that started late
// arrives at every barrel-up beat somewhere else. Solved per phase, and cached
// per phase, because it is still a property of the scene and not of a frame.
const lcdStrikeCache = new WeakMap();
function lcdBarrelStrike(art, phase = 0) {
  let byPhase = lcdStrikeCache.get(art);
  if (!byPhase) lcdStrikeCache.set(art, byPhase = new Map());
  const key = lcdMod(phase, 4);
  if (byPhase.has(key)) return byPhase.get(key);
  let strike = -1;
  if (art.plane && art.gameWatch) {
    const [gx, gw, gh] = art.gameWatch;
    const bx = Math.round(gx + gw / 2), by = GROUND_Y - gh + LCD_BARREL_UP_DY;
    for (let cyc = 0; cyc < LCD_PLANE_BEATS && strike < 0; cyc++) {
      if (lcdMod(cyc + key, 4) !== LCD_BARREL_UP_BEAT) continue;
      const p = lcdPlaneAt(cyc, art.plane);
      if (p && Math.abs(bx - (p.x + LCD_PLANE_W / 2)) < LCD_PLANE_W / 2 + LCD_BARREL_RX
        && Math.abs(by - (p.y + LCD_PLANE_H / 2)) < LCD_PLANE_H / 2 + LCD_BARREL_RY) strike = cyc;
    }
  }
  byPhase.set(key, strike);
  return strike;
}

// 0 on the beat of the strike, 1 on the beat after, -1 the rest of the time.
function lcdBurstPhase(art, frame) {
  // Off the pass the plane is ACTUALLY on. The gag is solved in steps of the
  // crossing, and a banner pass is a crossing like any other — read against the
  // free-running clock instead, the barrel would burst on a beat with nothing
  // in the sky to burst it.
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return -1;
  const strike = lcdBarrelStrike(art, pass.phase);
  if (strike < 0) return -1;
  const phase = pass.cyc - strike;
  return phase === 0 || phase === 1 ? phase : -1;
}

// AND THE THROW THAT NEVER HAPPENS. `lcdBurstPhase` covers the two beats of
// wreckage over the gorilla's head; this covers the twelve after it. The barrel
// the plane destroyed is the one he was about to send down the tower, so it is
// missing from the girder chain for the whole descent it would have made —
// cell index 0 on the beat of the strike, 1 on the next, and so on. Returns the
// cell the chain is short of, or -1. Without this he is empty-handed on the
// roof while the barrel he is not holding rolls down the face underneath him.
// THE ONE THING THE CITY TELLS THE RUN. Everything else here flows the other
// way — the panel is told the beat and paints itself — but the crash is a
// sound as well as a picture, and only this file knows which beat of the loop
// the plane and the barrel meet on. Given a stage and an absolute beat, is
// this the beat the barrel goes? The run asks once per beat and fires the cue;
// nothing about the drawing depends on the answer.
/**
 * Where the barrel chute stands on the panel, in screen px, or null on a stage
 * that has no chute.
 *
 * The run needs it to work out WHEN a lane barrel is at the foot of the chute,
 * and it is derived from the same building the painter uses rather than written
 * down twice — move the gorilla and both ends move together, which is the whole
 * reason this is a function and not a constant in run.js.
 */
export function lcdChuteScreenX(stageIndex, portrait = false) {
  const index = Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1));
  // THE SCENE THE PLAYER IS LOOKING AT. A phone draws its own skyline, and on
  // rhythm-3 that moves Kong from the last facade to the middle one — so a run
  // still asking the landscape table would hand the lane a barrel timed to a
  // chute a hundred and fifty pixels from the one on screen.
  const art = lcdArtFor(index, portrait ? { portrait: true } : null);
  if (!art?.barrelDrop || !Number.isInteger(art.rooftopGorilla)) return null;
  // Portrait paints the whole panel through one fixed shift; the run works in
  // the shifted space, so the chute is reported there too.
  return lcdChuteX(art) + (portrait ? LCD_PORTRAIT_CITY_SHIFT.x : 0);
}

/**
 * The chute's screen x for an already-resolved scene: centred in whatever gap
 * the gorilla's building leaves to its right-hand neighbour, so widening that
 * gap for clearance moves the drop with it rather than leaving it hugging his
 * wall. On the last building there is no neighbour and the old 15px gap is
 * assumed.
 */
function lcdChuteX(art) {
  const building = art.buildings[art.rooftopGorilla];
  const [gx, gw] = building;
  const next = art.buildings[art.rooftopGorilla + 1];
  // With a neighbour the chute splits the gap between the two facades. With
  // NONE — the gorilla is the last building — it stands its facade's own reach
  // past his wall instead (see chuteReach). The old fallback was a flat 15,
  // which parked the barrel eight px off his brickwork however much room there
  // actually was; halving the remaining air fixed that and then overshot the
  // other way, walking the drop out into the middle of a phone's margin.
  const wall = gx + gw;
  const gap = next ? next[0] - wall : Math.max(0, W - wall);
  return wall + Math.min(lcdGridFor(building).chuteReach, Math.round(gap / 2));
}

/**
 * Where the rooftop gorilla's HEAD sits on the panel, in screen px, or null on
 * a stage without one. The gallery crops his face out of the real panel with
 * it rather than writing his address down a second time.
 */
export function lcdGorillaHeadPos(stageIndex) {
  const art = LCD_CITY_SCENES[Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1))];
  // Stage 1 stands him on the DONKEY KONG tower, stage 3 on a plain rooftop —
  // same painter, two addresses, and the caller should not have to know which.
  const spec = Number.isInteger(art?.rooftopGorilla)
    ? art.buildings[art.rooftopGorilla] : art?.gameWatch;
  if (!spec) return null;
  const [gx, gw, gh] = spec;
  return { x: Math.round(gx + gw / 2), y: GROUND_Y - gh - 31 };
}

// How many cells the barrel chute has, and so how many beats early the lane has
// to name a barrel for the drop to be drawn whole. Four cells is a bar, and the
// delivery — top cell to street — is the three steps between them.
export const LCD_CHUTE_CELLS = 4;
// WHERE THOSE CELLS ARE, and both ends are DERIVED rather than the pitch being
// authored. The top cell hangs just under the roof he throws from and the
// bottom one stops a beat short of the road, which the lane's own barrel then
// rolls onto; the three steps between are whatever that leaves.
//
// It was four fixed 34px steps off the roof for a long time, and that is the
// same class of bug as the monorail's hand-written crossing length: correct at
// exactly one building height — the one it was written at. When the gorilla's
// deco went up twelve to keep its clearance under the risen crossing, a fixed
// pitch left the last barrel hanging thirty-three pixels over the street with
// no beat left to fall, so the drop simply stopped in the air beside him. At
// his old height this returns the identical four numbers it always did.
const LCD_CHUTE_FOOT = 21;
function lcdChuteCells(roof) {
  const top = roof - 4, foot = GROUND_Y - LCD_CHUTE_FOOT;
  const step = (foot - top) / (LCD_CHUTE_CELLS - 1);
  return Array.from({ length: LCD_CHUTE_CELLS }, (_, i) => Math.round(top + i * step));
}
/** How many heard beats the chute takes: one per cell, the last a beat short
 *  of the road, which the lane's own barrel then rolls onto. */
export const LCD_CHUTE_BEATS = LCD_CHUTE_CELLS;
// AND HOW LONG HE HOLDS IT FIRST. His four authored poses are one swing —
// overhead, out, low, empty — so three of them have a barrel in them and the
// fourth is the release, which is also the beat the chute's top cell takes it.
// Three in the hand plus four in the chute is SEVEN drawn positions, and the
// road is the eighth beat: over his head, down his arm, at his side, then four
// cells to the street. See lcdRooftopGorilla.
const LCD_CHUTE_HOLD_BEATS = LCD_BARREL_POSES - 1;
/** How many beats out a barrel is when it appears over his head — which is
 *  also the count of drawn positions, since it steps one per beat and the road
 *  is due 0. Seven positions, eight beats counting the road. */
export const LCD_CHUTE_LEAD_BEATS = LCD_CHUTE_BEATS + LCD_CHUTE_HOLD_BEATS;

// WHERE IN HIS SWING THE GORILLA IS, 0..3, and the one place the phase of the
// whole rig — his arms AND the chute — is decided.
//
// THE RIG IS ONE STREAM. He raises a barrel on phase 0, brings it down his arm
// on 1 and 2, and on 3 his hand is empty because the barrel is in the chute's
// top cell; it takes the other three cells on the next 0, 1, 2 and the road
// has it on the 3 after that. Every barrel he ever picks up makes that same
// eight-beat journey through the same seven places, a new one is raised every
// four, so there is always one in his hands and one in the chute, and the only
// thing that marks the real one is the lit rim riding it down (see
// lcdRooftopGorilla and the chute in drawLCDCity).
//
// AND THE STREAM IS PHASED TO THE LANE, not the bar. The chart's barrels reach
// the foot of the chute on whatever beat the road's geometry says — it is a
// physics number, not a bar line — so if the swing ran on `beat4` the real
// barrel would have to enter the stream mid-arm, or the road one would land a
// beat or two off the lit one. Instead the run hands over `barrelGrid`, the
// snapped delivery beat of the last real barrel, and the swing is counted from
// it: the raise is seven beats before the road, so phase 0 falls on
// `grid - 7`, and the barrels the chart lays after it (one slot, one speed)
// land on the same phase with no re-phase at all. Before the first real one
// the bar is as good a clock as any.
function lcdSwingPhase(frame) {
  if (frame.barrelGrid == null) return frame.beat4;
  return lcdMod(frame.beatAbs - frame.barrelGrid + LCD_CHUTE_HOLD_BEATS, LCD_BARREL_POSES);
}

export function lcdBarrelStrikeAt(stageIndex, beat, portrait = false) {
  if (!Number.isFinite(beat)) return false;
  const index = Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1));
  const art = portrait && index === 1 ? LCD_PORTRAIT_STAGE_1 : LCD_CITY_SCENES[index];
  if (!art) return false;
  // Asked of the same crossing the picture is drawing, so the cue cannot fire
  // on a pass where nothing was destroyed. lcdPlaneCyc reads only these two
  // fields of a frame.
  const b = Math.floor(beat);
  const pass = lcdPlaneCyc(art, { bar: Math.floor(b / 4), beat4: lcdMod(b, 4) });
  if (!pass) return false;
  const strike = lcdBarrelStrike(art, pass.phase);
  return strike >= 0 && pass.cyc === strike;
}

function lcdVanishedBarrelCell(art, frame) {
  // Counted within the crossing that did the destroying, not against a
  // free-running clock: on a pass that missed there is no wreck and no gap in
  // the chain, and the sixteen beats are the sixteen after THIS plane's
  // strike — one per cell of the chain the throw would have ridden.
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return -1;
  const strike = lcdBarrelStrike(art, pass.phase);
  if (strike < 0) return -1;
  const since = pass.cyc - strike;
  return since >= 0 && since < 16 ? since : -1;
}

function lcdBarrelBurst(ctx, bx, by, phase) {
  const x = Math.round(bx), y = Math.round(by);
  // The staves go out in PRINT_SOFT, not the motion ghost. A ghost cell on this
  // panel means "a position this thing also occupies" — the off frames of a
  // cycle — and the wreck is not that: it is the one beat of debris, receding
  // but real, and at ghost alpha it was not there at all.
  ctx.fillStyle = phase === 0 ? LCD_WINDOW_ON : LCD_PRINT_SOFT;
  for (const [cx, cy] of phase === 0 ? LCD_BURST_STAR : LCD_BURST_DEBRIS) {
    ctx.fillRect(x + cx * 2 - 1, y + cy * 2 - 1, 2, 2);
  }
  if (phase !== 0) return;
  // The one gold cell the barrel wore, thrown clear of its own wreck.
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(x - 1, y - 9, 2, 2);
}

// ---- the searchlight ----------------------------------------------------
//
// A rooftop lamp sweeping the sky in eight authored angles, one per heard
// beat, bouncing at the ends rather than snapping back — a lamp that jumped
// from one end to the other would read as two lamps. The beam is a wedge of
// 2px cells stepping outward from the lens, ghosted at the angles it is not
// on, exactly like the transmitter's rings.
const LCD_BEAM_ANGLES = [-1.22, -1.05, -0.88, -0.71, -0.54, -0.71, -0.88, -1.05];
// HOW FAR THE BEAM THROWS, and the one number that says so: the falloff is
// solved from it, so the far cell lands at the same faint value whatever the
// reach becomes. It was 86 against a hand-written fade, which put the tip about
// as far as the next roof — a lamp lighting its neighbour rather than the sky.
const LCD_BEAM_REACH = 132;
/**
 * @param n which lamp on the panel this is, in the order the scene lists them.
 *   Two lamps drawn from one painter have to be kept from reading as one
 *   mechanism drawn twice, and both things that do it are DERIVED here rather
 *   than authored per lamp:
 *
 *   - each leans toward the MIDDLE of the panel, because that is where the sky
 *     is. The skyline's tall towers stand at its ends; a lamp raking outward
 *     spends its new reach on a facade, and the pair now open inward and cross
 *     over the low roof in the centre.
 *   - each starts half a sweep on from the one before, so when one is standing
 *     up the other is out flat. Lockstep is what a premiere looks like; this
 *     panel is a working city.
 */
function lcdSearchlight(ctx, building, dx, n, frame, ceiling = LCD_BEAM_CEILING) {
  const [x, , h] = building;
  const roof = GROUND_Y - h;
  const sx = Math.round(x + dx);
  // The housing: a squat box on a swivel, the lens end lit on the downbeat.
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(sx - 4, roof - 5, 8, 5);
  ctx.fillRect(sx - 1, roof - 8, 2, 3);
  ctx.fillStyle = frame.beat4 === 0 ? LCD_WINDOW_ON : LCD_WINDOW_OFF;
  ctx.fillRect(sx - 2, roof - 10, 4, 3);
  const step = frame.bar * 4 + frame.beat4 + n * (LCD_BEAM_ANGLES.length / 2);
  const a = LCD_BEAM_ANGLES[lcdMod(step, LCD_BEAM_ANGLES.length)];
  const ca = Math.cos(a) * (sx < W / 2 ? 1 : -1), sa = Math.sin(a);
  // Cells marching up the beam, widening as they go: near cells are bright,
  // far ones fade into the sky the way a real beam loses itself.
  for (let d = 6; d < LCD_BEAM_REACH; d += 4) {
    const bx = sx + ca * d;
    const by = roof - 9 + sa * d;
    // The sky has a ceiling — the beat strip hangs across everything above it,
    // which is why the clouds sit just under — and a beam stops there too. It
    // is the SCENE's ceiling rather than a number: a phone's strip is nowhere
    // near the authored one, and a lamp on a roof that has been raised past a
    // landscape ceiling would otherwise throw no beam at all.
    if (by < ceiling) break;
    const spread = Math.max(3, Math.round(d / 9)) * 2;
    ctx.fillStyle = `rgba(232,238,176,${(0.62 - 0.5 * (d / LCD_BEAM_REACH)).toFixed(3)})`;
    ctx.fillRect(Math.round(bx - spread / 2), Math.round(by), spread, 4);
  }
}

// ---- the elevated train -------------------------------------------------
//
// A commuter service on a viaduct behind the skyline: one car-length per
// heard beat, right to left, windows lit like a facade's. It runs BEHIND the
// buildings (drawn before them would hide it entirely, so it goes after the
// skyline but sits high enough to read over the low roofs), and it is the one
// piece of this city that is unambiguously still working.
//
// THE RAIL AND THE TRAIN ARE TWO DIFFERENT THINGS, and they used to be one
// function that drew both or neither. The viaduct is masonry: it stands from
// the first frame of the stage whether or not anything is running on it
// (lcdViaduct, drawn whole in front of the skyline). Only the cars answer to
// the beat, and they are an EVENT — see the lap below.
const LCD_TRAIN_CAR = 26;
// THE TIMETABLE, and it is the whole of it: a crossing right to left, a wait,
// a crossing left to right, a wait. Six bars each way at a car-length a beat,
// two bars of empty rail between, so the service comes round every sixteen —
// four phrases, which is a length the ear already has.
//
// Half the bars go back to the skyline on purpose. The first version ran a lap
// exactly as long as one crossing, so there was a train on the panel about
// ninety percent of a run and the cars sat permanently across the billboards
// and the rooftop meters: the rail read as a smear rather than as a line
// something occasionally runs along. A train ARRIVING is something you can
// notice arriving, and it can only arrive if it has been away.
//
// IT COMES BACK THE OTHER WAY. It used to leave one edge and reappear at the
// same one, which is not a service, it is a loop of tape — a city has trains
// going both ways and the return is what says the one you watched leave went
// somewhere. Peter: "make it go right to left and then left to right after a
// wait... simplify".
const LCD_TRAIN_WAIT = 8;                                    // two bars of empty rail

/**
 * How long a crossing takes, in beats — DERIVED, never authored.
 *
 * The train moves a car-length a beat, so the number of beats it needs to get
 * from wholly off one edge to wholly off the other follows from how long the
 * train is. That was a hand-written 24 for exactly one afternoon, and the
 * afternoon it stopped being true was the one the train went from three cars
 * to four: the fourth car was still eight pixels on the panel when the
 * crossing's last beat culled it, so the service blinked out mid-screen. The
 * mirror of that bug puts a train ON the panel mid-screen, which is what Peter
 * asked never to see. Neither can happen if the beat count is solved from the
 * geometry, whatever the car count later becomes.
 *
 * Rounded up to whole bars, because the wait either side of it is counted in
 * bars and the lap wants to come round on one. Any slack is spent off-panel.
 */
function lcdTrainCross(cars) {
  const trainW = cars * LCD_TRAIN_CAR - 4;
  const beats = Math.ceil((W + trainW) / LCD_TRAIN_CAR) + 1;
  return Math.ceil(beats / 4) * 4;
}
/** The timetable for one service: its crossing, its leg and its whole lap. */
function lcdTrainLegs(spec) {
  const cars = spec.cars ?? 4;
  const cross = lcdTrainCross(cars);
  const leg = cross + LCD_TRAIN_WAIT;
  return { cars, cross, leg, lap: leg * 2 };
}

// The viaduct, in the panel's own hand: ONE INK, ONE PIXEL, ONE LINE.
//
// It was a 2px soft-grey bar with 2px stubs hanging ten pixels under it — the
// last piece of furniture still drawn the old way after the OLED pass. Now it
// is a single 1px ink line on a lattice rule, across the whole panel, with the
// cars riding it. No deck box and no piers: a pier that stopped in the air was
// exactly what Peter's rule is about ("how are the girders suspended?"), and
// piers carried to the street would have crossed the skyline everywhere. One
// line reads as an elevated rail seen edge-on, and it is the least this panel
// can draw and still have a rail on it.
// How far under the cars the girder rules. The scenes author the cars' row and
// this is the rest of the rail, so a scene that moves the service moves both.
const LCD_VIADUCT_DROP = 12;
function lcdViaduct(ctx, art) {
  ctx.fillStyle = LCD_INK;
  ctx.fillRect(0, art.train.y + LCD_VIADUCT_DROP, W, 1);
}

// ---- the service ---------------------------------------------------------
//
// SETTLED 2026-09-03 off a three-round bake-off (gallery section
// `monorail-bakeoff`, retired). The old service was four teal boxes sliding
// past once a lap, and Peter called it bland. What ships is two of the cuts he
// took — LAMPS + SPARKS (a fading headlamp beam that flickers on the offbeat,
// a red tail lamp on the backbeat, a collector spark at the rail on the
// downbeat) and PASSENGERS (seated silhouettes, and one standing walker
// working toward the back a window a beat) — on a service that crosses, waits,
// and comes back the other way.
//
// THE STOP IS GONE, and it was most of this file for an afternoon: the train
// pulled in at a named tower, dwelled two bars with its doors open, and stood
// on a platform slab cantilevered off that roof, under a canopy with a station
// clock and a lamp. Every piece of it worked and every piece of it came out —
// Peter: "lose the slab and don't stop the monorail at all... simplify". What
// is left says the same thing with nothing added to the skyline: a service
// that goes somewhere and comes back is a working city, and the buildings
// under it are just buildings.
//
// Losers, deleted rather than hidden: INK CARS (facade-hand cars), SUSPENDED
// (a hanging monorail that swayed), TWO-WAY SERVICE (both directions at once,
// which overlapped into a blob mid-panel — this is that idea done in series
// instead, which is the version that reads).
const LCD_TRAIN_BODY = 'rgba(70,121,137,0.5)';
const LCD_TRAIN_GLASS = 'rgba(220,228,154,0.7)';

/**
 * Which way the service is running this beat and where its left-hand car
 * stands, or NULL on the beats the rail is empty — which is a quarter of them.
 *
 * `dir` is -1 outbound (right to left, the way it has always run) and +1 on
 * the return. Both legs start wholly off their own edge and end wholly off the
 * far one, so neither pops into or out of existence on the panel.
 */
function lcdTrainRun(spec, frame) {
  const { cross, leg, lap } = lcdTrainLegs(spec);
  const k = lcdMod(frame.beatAbs, lap);
  const step = lcdMod(k, leg);
  if (step >= cross) return null;
  // THE TWO ENDS OF A CROSSING, both wholly off the panel by construction: the
  // near end level with the right edge, the far end far enough past the left
  // one that the last car has cleared it (see lcdTrainCross). The return walks
  // the very same positions in reverse, so it cannot begin anywhere the
  // outbound leg could not end — no leg starts mid-panel, either way round.
  const from = W;
  const to = from - (cross - 1) * LCD_TRAIN_CAR;
  const dir = k < leg ? -1 : 1;
  const x0 = dir < 0 ? from - step * LCD_TRAIN_CAR : to + step * LCD_TRAIN_CAR;
  return { dir, x0, step };
}

function lcdTrain(ctx, spec, frame) {
  const run = lcdTrainRun(spec, frame);
  if (!run) return;
  const { dir, x0 } = run;
  const { y, cars = 4 } = spec;
  const body = LCD_TRAIN_CAR - 4;
  // The walker: one standing passenger, a window a beat toward the BACK of the
  // train — which is the right-hand end going left and the left-hand end
  // coming back, so he walks against the way the panel is moving either way.
  const slots = cars * 4;
  const walked = lcdMod(frame.beatAbs, slots);
  const walker = dir < 0 ? walked : slots - 1 - walked;
  for (let c = 0; c < cars; c++) {
    const cx = Math.round(x0 + c * LCD_TRAIN_CAR);
    if (cx > W + 4 || cx + LCD_TRAIN_CAR < -4) continue;
    // The lead car is whichever end is in front, so the lamps swap with the
    // direction rather than the train running backwards on the way home.
    const lead = dir < 0 ? c === 0 : c === cars - 1;
    const last = dir < 0 ? c === cars - 1 : c === 0;
    const nose = dir < 0 ? cx - 2 : cx + body;
    const tail = dir < 0 ? cx + body : cx - 2;
    ctx.fillStyle = LCD_TRAIN_BODY;
    ctx.fillRect(cx, y, body, 12);
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(cx, y + 11, body, 2);
    ctx.fillStyle = LCD_TRAIN_GLASS;
    for (let wdw = 0; wdw < 4; wdw++) ctx.fillRect(cx + 3 + wdw * 5, y + 3, 3, 4);
    // The passengers: seated heads low in the glass in a fixed pattern, and
    // the walker standing taller.
    ctx.fillStyle = LCD_PRINT;
    for (let wdw = 0; wdw < 4; wdw++) {
      const g = c * 4 + wdw;
      const wx = cx + 4 + wdw * 5;
      if (g === walker) ctx.fillRect(wx, y + 3, 2, 3);
      else if ((g * 7) % 3 === 0) ctx.fillRect(wx, y + 5, 2, 2);
    }
    if (lead) {
      // The headlamp, and its beam: three cells fading along the lane ahead, a
      // cell shorter on the offbeat so it flickers the way a lamp on a moving
      // thing does.
      ctx.fillStyle = LCD_WINDOW_ON;
      ctx.fillRect(nose, y + 5, 2, 3);
      const cells = frame.beat4 % 2 ? 2 : 3;
      const fade = ['rgba(211,91,67,0.5)', 'rgba(211,91,67,0.28)', 'rgba(211,91,67,0.14)'];
      for (let i = 0; i < cells; i++) {
        ctx.fillStyle = fade[i];
        ctx.fillRect(nose + dir * (2 + i * 2), y + 5, 2, 3);
      }
      // The collector spark, at the rail under the lead bogie, on the downbeat:
      // the train is drawing power from the beam.
      if (frame.beat4 === 0) {
        ctx.fillStyle = 'rgba(232,238,176,0.95)';
        ctx.fillRect(dir < 0 ? cx + 2 : cx + body - 4, y + 11, 2, 2);
      }
    }
    // And a red tail lamp on the last car, blinking on the backbeat.
    if (last && frame.beat4 % 2 === 1) {
      ctx.fillStyle = LCD_WINDOW_ON;
      ctx.fillRect(tail, y + 5, 2, 3);
    }
  }
}

// ---- the window washer --------------------------------------------------
//
// A cradle winching up a facade, one window-aligned stop every beat, with the
// little figure's squeegee arm swapping sides as he works. In the last phase
// of the run, the cradle tips and he hangs off one end — the city cannot afford
// the other cable either.
//
// EIGHT WINDOWS, SIXTEEN BEATS, FOUR BARS. He climbs one real window row per
// beat through the first two bars, phased one painter beat ahead so the visible
// rung change lands with the kick rather than trailing onto the snare. He
// reaches the bottom on beat 13 and waits there through the phrase boundary;
// every moving step is the facade's 12px pitch and beat 16 is beat 0 again.
const LCD_WASHER_RUNGS = [6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6, 7, 7, 7];
function lcdWasherHat(ctx, headX, headY, headW) {
  // A tiny hard hat: two rows of crown and a brim one pixel wider on either
  // side. PANEL_LIT keeps it distinct from his skin, overalls and the coral
  // windows without introducing a colour the LCD scene does not already own.
  ctx.fillStyle = LCD_PANEL_LIT;
  ctx.fillRect(headX, headY - 2, headW, 2);
  ctx.fillRect(headX - 1, headY, headW + 2, 1);
}
function lcdWasher(ctx, building, dx, frame) {
  const [x, , h] = building;
  const roof = GROUND_Y - h;
  const cx = Math.round(x + dx);
  // lcdWindowCells starts each row at roof + 7 and its cell is 5px tall, so
  // these cradle heights are exactly the lower edge of its eight window rows.
  // Start one row below the facade's first window: the hard hat now clears the
  // roof at the top stop, and the whole eight-position journey ends one window
  // lower too.
  //
  // OFF THE FACADE'S OWN GRID, because the phone prints this wall on the
  // coarser portrait one (lcdGridFor): a cradle stepping the landscape's 12px
  // rows down a wall whose windows are 16 apart is a man ignoring the floors.
  const pitch = lcdGridFor(building).rowPitch;
  const stops = Array.from({ length: 8 }, (_, row) => roof + pitch + (row + 1) * pitch);
  const step = lcdMod(frame.bar * 4 + frame.beat4, LCD_WASHER_RUNGS.length);
  const y = stops[LCD_WASHER_RUNGS[step]];
  const tipped = frame.phase >= 3;
  // Two cables from the roof down to the cradle.
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(cx - 7, roof, 1, y - roof);
  ctx.fillRect(cx + 7, roof, 1, y - roof + (tipped ? 9 : 0));
  ctx.fillStyle = LCD_PRINT;
  if (tipped) {
    // The cradle hangs by one end; he is holding on to the high corner.
    ctx.fillRect(cx - 8, y, 9, 2);
    ctx.fillRect(cx + 1, y + 5, 8, 2);
    ctx.fillStyle = '#22608c';
    ctx.fillRect(cx - 6, y + 2, 3, 4);
    // Legs here too, dangling rather than standing — he is holding on, not
    // working — but the body still has to end somewhere the eye can find.
    ctx.fillRect(cx - 6, y + 6, 1, 2);
    ctx.fillRect(cx - 4, y + 6, 1, 2);
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(cx - 6, y - 2, 3, 3);
    lcdWasherHat(ctx, cx - 6, y - 2, 3);
    return;
  }
  ctx.fillRect(cx - 8, y, 17, 2);
  ctx.fillRect(cx - 8, y - 3, 1, 3);
  ctx.fillRect(cx + 8, y - 3, 1, 3);
  // The man: overalls, a face, LEGS, and an arm that changes sides on the beat.
  //
  // The legs are not detail, they are what stops him reading as a torso bolted
  // to the rail. His body used to run all the way down to the cradle, and with
  // a 17px bar under a 4px block the eye took the bar for a pair of legs
  // planted wide — the figure was the wrong shape and the cradle stopped being
  // a cradle. Two pixels of daylight between his feet is the whole fix: the
  // gap says where the body ends, and the bar goes back to being something he
  // stands ON. Same overall height as before, so nothing else on the mast moves.
  ctx.fillStyle = '#22608c';
  ctx.fillRect(cx - 2, y - 6, 4, 4);
  ctx.fillRect(cx - 2, y - 2, 1, 2);
  ctx.fillRect(cx + 1, y - 2, 1, 2);
  ctx.fillStyle = '#f2c9a0';
  ctx.fillRect(cx - 2, y - 10, 4, 4);
  lcdWasherHat(ctx, cx - 2, y - 10, 4);
  ctx.fillStyle = LCD_PRINT;
  const arm = frame.beat4 % 2 === 0 ? cx + 2 : cx - 5;
  ctx.fillRect(arm, y - 9, 3, 2);
}

// ---- the transmitter mast -----------------------------------------------
//
// A lattice radio mast on one rooftop, beaming ON the beat: four authored
// signal rings stand in the sky above the beacon, all four printed as faint
// off-cells, and the one the beat is on lit — so the broadcast walks outward
// a step per beat and snaps home on the downbeat, exactly like the window
// cells. Reduced flashing keeps the mast and the printed rings but leaves the
// beacon and the lit ring in their composed state.
// The four authored ring sizes, widest last, each an upper arc in 2px cells.
const LCD_RINGS = [
  ['.XXX.', 'X...X'],
  ['..XXXXX..', '.X.....X.', 'X.......X'],
  ['...XXXXXXX...', '..X.......X..', '.X.........X.', 'X...........X'],
  ['....XXXXXXXXX....', '..XX.........XX..', '.X.............X.', 'X...............X'],
];
function lcdTransmitter(ctx, building, frame) {
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  const top = roof - 24;
  ctx.fillStyle = LCD_PRINT_SOFT;
  // A PIXEL MAST. Stroked legs were the one diagonal on a panel of squared
  // cells — a vector triangle among pixel things. Circles are the panel's
  // agreed exception (the dial, the speaker cones); a lattice mast is not. So
  // each leg is four one-pixel columns stepping in a pixel every six rows, and
  // the crossbars sit on the steps at exactly the legs' width there.
  for (let k = 0; k < 4; k++) {
    const y1 = roof - 6 * k;
    const y0 = Math.max(top, roof - 6 * (k + 1));
    ctx.fillRect(cx - 5 + k, y0, 1, y1 - y0);
    ctx.fillRect(cx + 4 - k, y0, 1, y1 - y0);
    if (k > 0) ctx.fillRect(cx - 5 + k, y1, 10 - 2 * k, 1);
  }
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(cx - 1, top - 3, 2, 4);
  // The beacon, lit on the downbeat.
  ctx.fillStyle = frame.beat4 === 0 ? LCD_WINDOW_ON : LCD_WINDOW_OFF;
  ctx.fillRect(cx - 2, top - 7, 4, 4);
  // PIXEL rings on the billboards' own 2px grid — authored arc blobs, not
  // stroked curves, so the broadcast wears the same resolution as the signs.
  const cy = top - 5;
  for (let i = 0; i < LCD_RINGS.length; i++) {
    const grid = LCD_RINGS[i];
    // The live ring still steps on the beat; how far the broadcast CARRIES is
    // the treble's business, so a bright bar pushes a second ring out behind
    // the first and a dull one keeps it close to the mast.
    const reach = frame.antennaReach;
    const carried = i > frame.beat4 && i <= frame.beat4 + reach;
    ctx.fillStyle = i === frame.beat4
      ? LCD_WINDOW_ON
      : carried ? 'rgba(80,85,92,0.3)' : LCD_MOTION_GHOST;
    const ox = cx - grid[0].length;
    const oy = cy - [9, 15, 21, 27][i];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 'X') ctx.fillRect(ox + c * 2, oy + r * 2, 2, 2);
      }
    }
  }
}

// One cogwheel of the machinery a pit opens onto: eight square teeth on a dark
// disc, with a printed hub so the wheel reads as a part and not a blot. Drawn
// in INK — the same weight the spikes it replaced carried, because it is the
// same message.
function lcdGear(ctx, cx, cy, r, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = LCD_INK;
  ctx.beginPath(); ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-1.5, -r, 3, 3.5);
  }
  ctx.fillStyle = 'rgba(220,228,154,0.55)';
  ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = LCD_INK;
  ctx.fillRect(-0.5, -0.5, 1, 1);
  ctx.restore();
}

// THE CLOCK STAGE, and everything in it a beat cannot move: the lintel and sill
// that say the dial is a course of the tower rather than a thing standing on
// it, the bezel, the hour marks and the four unlit hand slots.
//
// It used to be a rooftop case on braced feet, and as furniture it was the one
// piece of this skyline you could have lifted off and set down on any other
// roof. A clock TOWER is a different building: the shaft carries the dial, the
// masonry courses break for it and resume under it, and the roofline above is
// unbroken. That is also what bought the tower its height — see the scene's
// `clock` note.
function lcdClockCase(ctx, bay) {
  const { cx, cy, r } = bay;
  // NO FRAME. The bay had a lintel and a sill, and with the dial moved up to
  // sit equidistant from the roofline and both walls there is barely a pixel
  // between the circle and them — the pair stopped reading as masonry courses
  // and started reading as a box drawn round the clock. What says the dial is
  // set INTO the tower is the wall it is set into: the facade's own linework
  // and window rows break for it and pick up underneath, and nothing is drawn
  // around it at all.
  ctx.strokeStyle = LCD_PRINT;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = LCD_PRINT_SOFT;
  for (let n = 0; n < 12; n++) {
    const a = n * Math.PI / 6;
    const tx = Math.round(cx + Math.sin(a) * (r - 5));
    const ty = Math.round(cy - Math.cos(a) * (r - 5));
    ctx.fillRect(tx - (n % 3 === 0 ? 1 : 0), ty - 1, n % 3 === 0 ? 3 : 1, 2);
  }
  ctx.fillStyle = LCD_WINDOW_OFF;
  for (const slot of lcdClockSlots(bay)) ctx.fillRect(...slot);
}

// The four cardinal slots, in beat order. One list, so the printed slots and
// the lit one cannot disagree about where a hand goes.
function lcdClockSlots({ cx, cy, r }) {
  return [
    [cx - 1, cy - r + 4, 3, r - 3],
    [cx + 2, cy - 1, r - 3, 3],
    [cx - 1, cy + 2, 3, r - 3],
    [cx - r + 4, cy - 1, r - 3, 3],
  ];
}

// The hand, which is the only part of the clock a beat moves.
function lcdClockHand(ctx, bay, beat4) {
  ctx.fillStyle = LCD_WINDOW_ON;
  ctx.fillRect(...lcdClockSlots(bay)[lcdMod(beat4, 4)]);
  ctx.fillRect(bay.cx - 1, bay.cy - 1, 3, 3);
}

function lcdEqualizer(ctx, building, index, frame) {
  const [x, w, h] = building;
  const top = GROUND_Y - h;
  const max = LCD_EQ_BANK_ROWS;
  const grid = lcdGridFor(building);
  const pitch = grid.bankPitch, cell = grid.bankCell;
  const bankH = lcdBankH(grid);
  const cols = w >= 44 ? 3 : 2;
  const bankW = cols * pitch - (pitch - cell);
  const left = Math.round(x + w / 2 - bankW / 2);
  ctx.strokeStyle = LCD_PRINT_SOFT;
  ctx.strokeRect(left - 2.5, top - bankH - 0.5, bankW + 5, bankH);
  for (let col = 0; col < cols; col++) {
    const cx = left + col * pitch;
    // This painter was always a meter; it just had no source. The authored
    // table stands in whenever the analyser is absent.
    const band = index * cols + col;
    const heard = frame.roofLevels[band];
    const level = heard != null ? heard
      : LCD_EQ_LEVELS[lcdMod(frame.step + index * 2 + col * 5, LCD_EQ_LEVELS.length)];
    ctx.fillStyle = LCD_WINDOW_OFF;
    for (let n = 0; n < max; n++) ctx.fillRect(cx, top - pitch - n * pitch, cell, cell);
    ctx.fillStyle = LCD_WINDOW_ON;
    for (let n = 0; n < level; n++) ctx.fillRect(cx, top - pitch - n * pitch, cell, cell);
  }
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(left - 1, top - 2, bankW + 2, 2);
}

function lcdAntenna(ctx, building, index, frame) {
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const top = GROUND_Y - h;
  const tall = lcdAntennaH(index);
  ctx.strokeStyle = LCD_PRINT_SOFT;
  if (index % 3 === 0) {
    lcdStrokePath(ctx, [[cx - 5, top], [cx, top - tall], [cx + 5, top], [cx - 3, top - 5],
      [cx + 3, top - 5], [cx - 2, top - 9], [cx + 2, top - 9]]);
  } else if (index % 3 === 1) {
    ctx.fillStyle = LCD_PRINT_SOFT;
    ctx.fillRect(cx, top - tall, 1, tall);
    ctx.beginPath(); ctx.arc(cx + 4, top - tall + 6, 5, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();
    ctx.fillRect(cx + 1, top - tall + 5, 5, 1);
  } else {
    ctx.fillStyle = LCD_PRINT_SOFT;
    ctx.fillRect(cx - 2, top - tall + 4, 1, tall - 4);
    ctx.fillRect(cx + 2, top - tall + 4, 1, tall - 4);
    for (let y = top - tall + 6; y < top; y += 4) ctx.fillRect(cx - 2, y, 5, 1);
    ctx.fillRect(cx, top - tall, 1, 5);
  }
  ctx.fillStyle = LCD_WINDOW_OFF;
  ctx.fillRect(cx - 2, top - tall - 3, 5, 4);
  if (lcdMod(frame.step + frame.phrase - index, 5) === 0) {
    ctx.fillStyle = LCD_WINDOW_ON;
    ctx.fillRect(cx - 2, top - tall - 3, 2, 2);
    ctx.fillRect(cx + 1, top - tall - 3, 2, 2);
  }
}

function gbcEllipse(ctx, x, y, rx, ry, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function gbcGorillaLimb(ctx, points, color, width, highlight = null) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  lcdStrokePath(ctx, points);
  if (highlight) {
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(1, width - 4);
    lcdStrokePath(ctx, points);
  }
}

// A BARREL rolling at us side-on: wood-tan body, VERTICAL end hoops and
// horizontal plank seams. The old version — round, orange, with two
// horizontal hoop curves — read as a basketball from three buildings away;
// a rolling barrel's hoops stand upright near its ends, and its planks run
// the way it rolls. The ORANGE was the other half of it and went later, when
// the girder cells were settled: see LCD_BARREL_BODY below.
// `live` is the one Kong is dropping into the LANE — see the chute in
// drawLCDCity. He handles a barrel on every beat of his cycle and most of them
// are theatre, so the one that is about to become a hazard has to be findable
// at a glance: it wears the panel's own lit colour on its hoops and a gold pip,
// which is the same vocabulary every other live cell on this screen uses (a
// window that is on, the clock's cardinal hand, the share price's last cell).
// Not a new idiom, just this panel's existing one pointed at the right barrel.
// ONE WOOD FOR EVERY BARREL ON THE PANEL. The amber this used to be was the
// other half of the basketball: dark wood with near-ink hoops is a barrel
// before you have read a single mark on it. The girder cells (lcdMiniBarrel)
// take the same three colours, because the thing Kong holds IS the thing that
// rolls down the tower and the thing that arrives in the lane, and one picture
// may not hold two different barrels.
//
// AND THE LINEWORK IS FINE, not chunky. Everything on a barrel except its
// silhouette is grain: at nine pixels across, a seam in solid near-ink and a
// full-weight hoop stroke put more ink on the thing than the outline holding
// it together, and it stops reading as wood and starts reading as a logo. So
// the seams are a WASH the body still shows through, the hoops are drawn
// three-quarter weight, and the middle band — the one that made it a
// basketball in the first place — is gone from the small cell entirely.
// IS IT A BALL BECAUSE IT HAS NO PERSPECTIVE? The shipped barrel is an
// ellipse with its two hoops mirrored about the centre and its seams mirrored
// about both axes — a shape with two axes of symmetry, which is the family a
// ball belongs to and a barrel does not. A real one is seen from SOMEWHERE:
// the end pointed at you is a flat lid, the far end falls away, and that one
// asymmetry is most of what says cylinder rather than sphere.
//
// Against that: this is a Game & Watch panel, and segment art is flat on
// purpose. So it is a bake-off, not an argument — four silhouettes at both
// sizes on the real tower. See LCD_BARREL_SHAPE_STYLES.
const LCD_BARREL_BODY = '#a9743a';
const LCD_BARREL_SEAM = 'rgba(95,61,31,0.6)';
const LCD_BARREL_HI = 'rgba(226,166,88,0.62)';
const LCD_BARREL_LID = '#c48b4c';    // the end face, one step up from the wood
// The stave JOINTS, which are not seams and must not be drawn like them. The
// lane barrel draws its joints as a quarter-opacity hairline and its shading
// as a separate, heavier block; this panel had only the heavy one, so the
// girder cell had to go without joints entirely and read as a plain wooden
// box. A hairline at 1px is an alpha, not a width.
const LCD_BARREL_HAIR = 'rgba(95,61,31,0.3)';
// The girder cell's OUTLINE, lighter than the print the big barrel is drawn
// with. At sixteen pixels a full-strength rim is the line holding the thing
// together; at ten it is a third of everything on the barrel, and the wood
// inside it stops being the subject. It cannot get thinner — one pixel is the
// floor — so it gets fainter, which is the same thing to the eye.
// THIN AND DARK, not thin-BY-being-pale. Fading the rim to half strength made
// it finer and also made it fuzzy: a 1px line at half alpha is a grey smear
// with no edge, which is the opposite of sharp. The width is what should give
// way — six tenths of a pixel, at nearly full ink — so the line is smaller AND
// more definite than the one it replaces. Everything inside the cell follows
// the same rule.
const LCD_BARREL_RIM_FINE = 'rgba(60,63,69,0.92)';
const LCD_BARREL_HAIR_FINE = 'rgba(95,61,31,0.6)';
const LCD_BARREL_FINE_W = 0.6;
const LCD_BARREL_HOOP = 0.75;

// HOW FAR A BARREL TURNS BETWEEN ONE CELL AND THE NEXT, in radians. A thrown
// barrel is the one thing on this panel that has to look like it is ROLLING,
// and a chain of cells all drawn upright reads as a barrel sliding down the
// steel on its side. This is not the physical angle — a ten-pixel barrel that
// travels sixteen pixels has turned most of a full revolution, and a chain
// drawn honestly would be a random-looking scatter — it is the READABLE one:
// about thirty degrees a cell, so no two neighbours share an attitude, four
// cells make a visible quarter-turn, and nothing ever comes back round to
// upright inside a single girder.
const LCD_BARREL_ROLL = 0.55;

// The angle of cell `i` of the tower's twelve-cell barrel chain, accumulated
// from the top with the SIGN of the girder it is on: the chain snakes, so a
// barrel rolls left along the top floor, right along the next, and unwinds
// exactly as far as it wound when it turns the corner. Four cells to a floor
// (i >> 2 is the floor), even floors running left.
function lcdRollSpin(i) {
  let a = 0;
  for (let j = 0; j <= i; j++) a += ((j >> 2) % 2 === 0 ? -1 : 1) * LCD_BARREL_ROLL;
  return a;
}

// SHIPPED: the lane barrel's own drawing. The thing the gorilla holds, the
// thing that comes down the chute and the thing that rolls at you in the lane
// are one object, so they are one picture — and the recipe that already exists
// is the lane's (props.js barrel), not a second one invented for the panel.
// It also settles the perspective question by not having any: the lane barrel
// is deliberately flat and front-on ('no top plane or receding side, the
// toaster owns the 3D exception') and this now inherits that.
const LCD_BARREL_SHAPE = 'ingame';
export const LCD_BARREL_SHAPE_STYLES = [
  { id: 'round', name: 'ROUND', note: 'what shipped before — an ellipse, both ends curved, hoops mirrored. The ball.' },
  { id: 'ingame', name: 'INGAME', note: 'SHIPPED — the LANE barrel\'s own recipe, in the panel\'s palette: rounded-rect body, two horizontal hoops, vertical staves, a lit stave and a shaded one. The barrel that comes down the chute IS this one, so it should be one picture.' },
  { id: 'drum', name: 'DRUM', note: 'flat top and bottom, both ends still curved — the ball gone without giving the panel a viewpoint.' },
  { id: 'lid', name: 'LID', note: 'perspective: the near end a flat cut on the RIGHT, where the run comes from, with the end face a step lighter and the far end curved away.' },
];
const LCD_BARREL_SHAPES = new Set(LCD_BARREL_SHAPE_STYLES.map((b) => b.id));

// The silhouette as a PATH, so the fill, the print outline and the ghost are
// all the same shape and only this function knows which one it is.
//
// The two flat-ended shapes are built the same way and differ in one number:
// DRUM's near end is a rounded cap like its far one, LID's is a straight
// vertical cut. Both TAPER their ends — a barrel is widest at its belly, and
// an end as tall as the middle is a bucket.
//
// AND THE NEAR END IS ON THE RIGHT. It was on the left, and that put the
// barrel's point of view against every other one in the game: the hero runs
// RIGHT, every hazard travels left toward him (OBSTACLES.barrel, vx -40), and
// a lid on the left reads as a barrel arriving from the wrong side of the
// screen. The lane's own barrel is deliberately flat and front-on — see
// props.js, 'no top plane or receding side, the toaster owns the 3D exception'
// — so there is no lid there to disagree with; the one thing that does have a
// receding side, hzBarrel's drum, shades its RIGHT edge. Right it is.
function lcdBarrelPath(ctx, x, y, rx, ry, shape) {
  ctx.beginPath();
  if (shape === 'ingame') {
    // props.js barrel() — snapped, bellied, and LYING ON ITS SIDE.
    //
    // The lane barrel is drawn standing up, because it SPINS: draw.js rolls it
    // as it comes at you, so which way up it was authored never shows. Nothing
    // on this panel spins. The gorilla lifts it overhead with a hand at each
    // END — his hands are the barrel's own half-width apart, which is what
    // makes the grip read — and the girder cells roll along the steel on their
    // sides. Drawn upright, he was gripping the staves and the cells were
    // barrels standing on a moving floor. So the panel's barrel is the lane's
    // barrel turned a quarter: hoops upright near the ends, staves running the
    // way it rolls, the lid facing the hand that holds it.
    //
    // The silhouette stays a snapped polygon on three heights — the ends
    // pulled in, a shoulder, the full height across the belly — because a
    // radius large enough to read as a barrel is the ellipse again and one
    // small enough to stay crisp is a crate. Every vertex is a half-pixel off
    // an integer, so the 1px rim lands on the grid.
    const RX = Math.round(rx), RY = Math.round(ry);
    const cx = Math.round(x), cy = Math.round(y);
    const L = cx - RX, T = cy - RY, W = RX * 2, H = RY * 2;
    const END = RY >= 7 ? 2 : 1;     // how far each end pulls in
    const SH = END - 1;              // the shoulder between end and belly
    const r = RY >= 7 ? 2 : 0;       // how far along the length the shoulder runs
    const a = RY >= 7 ? 4 : 3;       // half the belly's flat run
    const x0 = L + 0.5, x1 = L + W - 0.5;
    // Breakpoints along the TOP edge, left to right, as [x, rows inset].
    const top = r
      ? [[x0, END], [x0 + r, SH], [cx - a, 0], [cx + a, 0], [x1 - r, SH], [x1, END]]
      : [[x0, END], [cx - a, 0], [cx + a, 0], [x1, END]];
    ctx.moveTo(top[0][0], T + top[0][1] + 0.5);
    for (const [px, i] of top) ctx.lineTo(px, T + i + 0.5);
    for (let k = top.length - 1; k >= 0; k--) {
      ctx.lineTo(top[k][0], T + H - top[k][1] - 0.5);
    }
    ctx.closePath();
    return;
  }
  if (shape !== 'drum' && shape !== 'lid') {
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    return;
  }
  const eh = ry * 0.74;             // how tall an end is against the belly
  const bx = rx * 0.3;              // where the belly stops being flat
  if (shape === 'lid') {
    ctx.moveTo(x + rx, y - eh);
    ctx.lineTo(x + rx, y + eh);
  } else {
    ctx.moveTo(x + rx - 0.5, y - eh);
    ctx.ellipse(x + rx - 0.5, y, rx * 0.3, eh, 0, -Math.PI / 2, Math.PI / 2);
  }
  ctx.quadraticCurveTo(x + rx * 0.6, y + ry, x + bx, y + ry);
  ctx.lineTo(x - bx, y + ry);
  ctx.quadraticCurveTo(x - rx * 0.75, y + ry, x - rx, y + eh * 0.55);
  ctx.quadraticCurveTo(x - rx * 1.05, y, x - rx, y - eh * 0.55);
  ctx.quadraticCurveTo(x - rx * 0.75, y - ry, x - bx, y - ry);
  ctx.lineTo(x + bx, y - ry);
  ctx.quadraticCurveTo(x + rx * 0.6, y - ry, x + rx, y - eh);
  ctx.closePath();
}

// ONE PAINTER, ANY SIZE. `rx, ry` are the body's half-extents; everything on
// it — hoop spacing, hoop height, seam length, the pip — is placed in
// proportion, and the INK IS NOT: a stroke does not get thinner because the
// thing it is on got smaller, so the line weights are scaled down with the
// body and floored where a canvas stroke stops being a line. That is what
// makes the girder cell the gorilla's barrel and not a heavier drawing of a
// different one: the same silhouette, the same hoops at the same fraction of
// the body, the same seams as a wash, at half the size.
//
// `ghost` is false, true (a filled ghost, the way the gorilla's spare arms and
// the chute are drawn) or 'outline' (the silhouette alone, for a chain of off
// cells where four filled discs in a row would out-weigh the one lit barrel).
//
// `spin` TILTS THE WHOLE BARREL about its own centre, and it is the difference
// between a barrel that has been THROWN and one that is sliding. Four cells
// straight down the chute at the same angle is a lift, not a drop; the same
// four each turned a little further is a thing rolling. Every cell of a chain
// carries its own angle — ghosts included, because a ghost is a position this
// barrel also occupies and it occupies it at that attitude — so the tumble is
// readable in a still frame as well as in motion, which is exactly how a real
// Game & Watch draws its barrel segments.
//
// The tilt is applied as a transform around the SNAPPED centre, so an upright
// barrel (spin 0, the gorilla's held one) is the same pixel-exact drawing it
// always was and only a turned one pays for the rotation.
function lcdBarrelAt(ctx, x, y, rx, ry, ghost = false, live = false, shape = null, spin = 0) {
  if (spin) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(spin);
    ctx.translate(-Math.round(x), -Math.round(y));
    lcdBarrelAt(ctx, x, y, rx, ry, ghost, live, shape, 0);
    ctx.restore();
    return;
  }
  const form = LCD_BARREL_SHAPES.has(shape) ? shape : LCD_BARREL_SHAPE;
  const k = rx / LCD_BARREL_RX;
  const body = Math.max(0.5, k);            // outline
  const hoop = Math.max(0.45, LCD_BARREL_HOOP * k);
  lcdBarrelPath(ctx, x, y, rx, ry, form);
  if (ghost === 'outline') {
    ctx.strokeStyle = LCD_MOTION_GHOST; ctx.lineWidth = 1; ctx.stroke();
    return;
  }
  ctx.fillStyle = ghost ? LCD_MOTION_GHOST : LCD_BARREL_BODY; ctx.fill();
  const fineRim = form === 'ingame' && rx < LCD_BARREL_RX;
  ctx.strokeStyle = ghost ? LCD_MOTION_GHOST
    : fineRim ? LCD_BARREL_RIM_FINE : LCD_PRINT;
  // The snapped shape wants a whole-pixel rim at full size and a thinner one
  // on the girder cell; the curved ones still scale theirs, because a 1px
  // stroke on a 10px ellipse is the chunk this all started with.
  ctx.lineWidth = fineRim ? LCD_BARREL_FINE_W : (ghost || form === 'ingame') ? 1 : body;
  ctx.stroke();
  ctx.lineWidth = 1;
  if (ghost) return;
  if (live) {
    ctx.strokeStyle = LCD_WINDOW_ON;
    ctx.lineWidth = 2;
    lcdBarrelPath(ctx, x, y, rx + 1, ry + 1, form);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // THE LANE BARREL'S OWN MARKS, remapped. props.js draws its body inset in
  // the sprite box and lays every mark against that inset; here the body IS
  // the box, so each of its fractions is re-based onto the body rather than
  // copied raw. Two HORIZONTAL hoops and VERTICAL staves — the opposite of the
  // ellipse's arrangement, and the right one, because the lane barrel is drawn
  // front-on and spun (draw.js rolls it), never side-on.
  //
  // At cell size the full set is nine marks across ten pixels, so the three
  // stave seams and the shaded stave drop out below the gorilla's size and the
  // two hoops, the lit stave and the highlight carry it.
  if (form === 'ingame') {
    // EVERY MARK IS A FILLRECT ON THE GRID, and every one of them is the lane
    // barrel's, turned with the body: its vertical staves are horizontal here
    // and its horizontal hoops stand upright near the ends. Strokes at
    // three-quarter weight and marks at fractional offsets are what made this
    // mushy — a 0.6px line is not a thin line, it is a grey one.
    const RX = Math.round(rx), RY = Math.round(ry);
    const cx = Math.round(x), cy = Math.round(y);
    const L = cx - RX, T = cy - RY, W = RX * 2, H = RY * 2;
    const wide = W >= 16;
    const a = RY >= 7 ? 4 : 3;          // half the belly's flat run
    // The hoops sit closer in than the belly's edge on the CELL. At ten across
    // a hoop at the belly edge lands one pixel off the rim, and the two run
    // together into a two-pixel end that reads as a heavy black cap.
    const hoopIn = wide ? 4 : 2;
    // The lit stave along the top and, on the big barrel, the shaded one under
    // it. Both kept inside the belly's flat run so neither can hang off a
    // tapered end.
    const bw = a * 2 + 1;
    ctx.fillStyle = LCD_BARREL_HI;
    ctx.fillRect(cx - a, T + 1, bw, wide ? 2 : 1);
    if (wide) {
      ctx.fillStyle = LCD_BARREL_SEAM;
      ctx.fillRect(cx - a, T + H - 3, bw, 2);
    }
    // STAVE JOINTS running the length of the barrel, the way it rolls — and on
    // the cell too. They are the marks that sell wood rather than a box, and
    // the reason the cell had none was that the only ink available was the
    // shading block's; at a third opacity a 1px joint is a hairline and eight
    // rows have room for two of them.
    ctx.fillStyle = wide ? LCD_BARREL_HAIR : LCD_BARREL_HAIR_FINE;
    for (const u of (wide ? [0.36, 0.64] : [0.42, 0.72])) {
      ctx.fillRect(L + 1, T + Math.round(H * u), W - 2, wide ? 1 : LCD_BARREL_FINE_W);
    }
    // THE HOOPS, standing upright at the shoulders — the marks that say barrel
    // at any size, and the pair his hands close on.
    ctx.fillStyle = wide ? LCD_PRINT : LCD_BARREL_RIM_FINE;
    const hw = wide ? 1 : LCD_BARREL_FINE_W + 0.15;
    for (const hx of [cx - hoopIn, cx + hoopIn]) ctx.fillRect(hx, T + 1, hw, H - 2);
    return;
  }

  // THE LID, on the shape that has one: the sliver behind the flat edge, a
  // step lighter than the wood, with the print line that separates it from the
  // staves. That line is the only mark on the barrel that says which end is
  // pointed at you.
  const lidW = form === 'lid' ? Math.max(1, 2 * k) : 0;
  if (lidW) {
    const eh = ry * 0.74;
    ctx.fillStyle = LCD_BARREL_LID;
    ctx.beginPath();
    ctx.rect(x + rx - lidW, y - eh, lidW, eh * 2);
    ctx.fill();
    ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = hoop;
    ctx.beginPath();
    ctx.moveTo(x + rx - lidW, y - eh); ctx.lineTo(x + rx - lidW, y + eh);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // The hoops stand upright half-way out to each end, the way they do on a
  // barrel rolling toward you. LID has a lid where the near one would be, so
  // it carries one; TAPER carries two of different heights, which is the whole
  // of its perspective.
  const hrx = Math.max(0.9, 1.8 * k), hry = ry * (5.8 / 7);
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = hoop;
  if (form === 'taper') {
    ctx.beginPath(); ctx.ellipse(x - rx * 0.46, y, hrx, ry * 0.94, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + rx * 0.40, y, hrx * 0.8, ry * 0.66, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(x - rx / 2, y, hrx, hry, 0, 0, Math.PI * 2); ctx.stroke();
    if (!lidW) { ctx.beginPath(); ctx.ellipse(x + rx / 2, y, hrx, hry, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.lineWidth = 1;
  // Three seams, the outer pair a little shorter, as a wash the wood shows
  // through. On a small body the middle one is the stripe that made it a
  // ball, so below the gorilla's size only the outer pair is drawn. On TAPER
  // they converge toward the far end; on LID they stop at the lid line.
  const sy = Math.max(1, Math.round(3 * (ry / 7)));
  const s0 = Math.round(6 * k), s1 = Math.round(7 * k);
  const xr = Math.round(x);
  const lidX = Math.round(x + rx - lidW) - 1;
  const left = (n) => xr - n;
  const wide = (n) => (lidW ? Math.min(xr + n, lidX) : xr + n) - (xr - n);
  ctx.fillStyle = LCD_BARREL_SEAM;
  if (form === 'taper') {
    ctx.fillRect(left(s0), y - sy, wide(s0), 1);
    if (k >= 1) ctx.fillRect(left(s1), y, wide(s1), 1);
    ctx.fillRect(left(s0), y + sy, wide(s0), 1);
  } else {
    ctx.fillRect(left(s0), y - sy, wide(s0), 1);
    if (k >= 1) ctx.fillRect(left(s1), y, wide(s1), 1);
    ctx.fillRect(left(s0), y + sy, wide(s0), 1);
  }
  ctx.fillStyle = LCD_BARREL_HI;
  const pip = k >= 1 ? 2 : 1;
  ctx.fillRect(xr - 1, y - Math.round(ry - 2 * k), 2, pip);
}

function gbcGorillaBarrel(ctx, x, y, ghost = false, live = false, shape = null, spin = 0) {
  lcdBarrelAt(ctx, x, y, LCD_BARREL_RX, LCD_BARREL_RY, ghost, live, shape, spin);
}

// The cells his shock radiates. OUTSIDE the head AND outside the arms, which
// is the whole difficulty: on the beat this fires his arms are up over his
// head, so a tick at any comfortable radius lands on a forearm and reads as
// nothing. These sit past the elbow (x 18 from centre, 7 wide) at head height,
// and stay BELOW the wreck, which is already occupying the cells above him. In
// print, not the soft ink: they have the sky behind them and nothing else.
const LCD_STARTLE_MARKS = [
  [-13, -4], [-14, -1], [-13, 2], [-12, 5],
  [13, -4], [14, -1], [13, 2], [12, 5],
];

// ---- HIS FACE, AND THE HANDFUL OF THINGS IT SAYS ---------------------------
//
// The head is drawn once and the FACE is a spec, so the panel can vary his read
// without a second gorilla existing anywhere in this file. Every expression is
// built from the parts already on his head — two brows, two eyes, a muzzle —
// because a new mark on a 22px face at a building's remove is not an
// expression, it is a smudge.
//
//   brow   arch  the authored pair, raised in the middle
//          flat  two level strokes: nothing is happening
//          cock  one up, one down
//   eye    open | narrow (lidded) | wide | shut (two curves, no whites)
//   mouth  smile | line | frown | hoot | smirk | oh
//   look   which way the pupils sit, -1 left, +1 right (0 = straight at you)
//
// `smile` and `startled` are the two the panel has always drawn and are exact:
// nothing below moves a pixel of either. The rest are bake-off candidates —
// see the gallery's `gorilla-face-bakeoff` — and reach the painter only through
// the dev-only `gorillaExpr` on the scene, so a run still shows the authored
// face until one of them is chosen.
const LCD_GORILLA_FACES = {
  smile: { brow: 'arch', browDy: 0, eye: 'open', mouth: 'smile' },
  neutral: { brow: 'flat', browDy: 1, eye: 'open', mouth: 'line' },
  // The angry read with the ANGLE TAKEN OFF: flat brows over the same lidded
  // eyes and turned-down mouth. The slanted pair was the loudest mark on the
  // face and it made him a villain; level, the same mouth lands somewhere
  // sadder — and a gorilla who is a bit put out is cuter company on a skyline
  // for four beats than one who is furious.
  sad: { brow: 'flat', browDy: 0, eye: 'narrow', mouth: 'frown' },
  effort: { brow: 'arch', browDy: -1, eye: 'shut', mouth: 'hoot' },
  sly: { brow: 'cock', browDy: 1, eye: 'open', mouth: 'smirk', look: 1 },
  startled: { brow: 'arch', browDy: -1, eye: 'wide', mouth: 'oh', shock: true },
};

// ---- the SHOCKED mouth, which is the one mark on his face with no inside ---
//
// Every other mouth he owns is a LINE — the smile, the frown, the smirk, the
// smirk — drawn on the muzzle and letting the tan through. The
// shocked one is a solid four-by-five ellipse of print, so at panel scale it
// is not a mouth that has opened, it is a hole punched in his face, and it
// sits dark enough to pull the eye off the wide eyes above it, which are the
// thing actually doing the reading.
//
// Six treatments, all at the muzzle's own address so nothing else moves.
// SETTLED, 3 Sep 2026: BLOB. The five alternatives all put a RIM on the
// mouth, and at panel scale a rimmed opening on a four-pixel muzzle reads as
// a little door rather than a face — the solid mark is the one that still
// reads as a mouth at the size it is actually seen. The losers stay below as
// the record; nothing but this constant chooses between them.
const LCD_GORILLA_SHOCK = 'blob';
const LCD_GORILLA_SHOCKS = {
  // AND IT SITS OFF THE CHIN. The muzzle is an ellipse centred at roof-25 with
  // a 4.5 half-height, so its floor is roof-20.5 — and the mouth's own bottom
  // reached roof-20.6, a tenth of a pixel short of it. Solid ink against the
  // muzzle's lower rim merges into it, which is why the shape read as a blob
  // hanging off his jaw rather than a mouth inside his face. The TOP is left
  // exactly where it was, under the nostrils; the bottom comes up a full pixel,
  // so there is tan under the mouth at every column. Same trick, same reason,
  // as the frown below — see the note on it.
  blob: { fill: true, rx: 2, ry: 1.9, dy: -1 },
  ring: { rx: 2, ry: 2.4, dy: 0 },
  gasp: { rx: 2.7, ry: 1.9, dy: 0 },
  howl: { rx: 1.7, ry: 2.9, dy: 1 },
  teeth: { rx: 2.1, ry: 2.6, dy: 0, teeth: true },
  jaw: { rx: 2.2, ry: 2.4, dy: 1, square: true },
};
export const LCD_GORILLA_SHOCK_STYLES = [
  { id: 'blob', name: 'BLOB', note: 'ships today — a solid ellipse of print. The control, and the only mouth on him with no muzzle showing through.' },
  { id: 'ring', name: 'RING', note: 'the same O drawn as a rim: an open mouth rather than a hole. One change, and the smallest.' },
  { id: 'gasp', name: 'GASP', note: 'rimmed and wider than tall — a caught breath rather than a shout.' },
  { id: 'howl', name: 'HOWL', note: 'rimmed, taller than wide and dropped a pixel: the jaw has actually gone down.' },
  { id: 'teeth', name: 'TEETH', note: 'a rimmed O with the upper lip lit — the cartoon shock mouth, and the most ink of the six.' },
  { id: 'jaw', name: 'JAW', note: 'not an O at all: a squared-off dropped jaw, flat along the top where the lip is.' },
];

// `roof - 23` is the muzzle's mouth line, shared with every other mouth.
function lcdShockMouth(ctx, cx, my, id, lw) {
  const st = LCD_GORILLA_SHOCKS[id] || LCD_GORILLA_SHOCKS[LCD_GORILLA_SHOCK];
  const y = my + (st.dy || 0);
  if (st.fill) { gbcEllipse(ctx, cx, y, st.rx, st.ry, LCD_PRINT); return; }
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (st.square) {
    // A jaw, not a hole: flat where the top lip is and rounded under.
    ctx.moveTo(cx - st.rx, y - st.ry);
    ctx.lineTo(cx + st.rx, y - st.ry);
    ctx.lineTo(cx + st.rx, y + st.ry * 0.4);
    ctx.quadraticCurveTo(cx, y + st.ry * 1.5, cx - st.rx, y + st.ry * 0.4);
    ctx.closePath();
  } else {
    ctx.ellipse(cx, y, st.rx, st.ry, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  if (st.teeth) {
    // The lit upper lip, inside the rim and only where the O is widest.
    ctx.fillStyle = '#f3edb1';
    ctx.fillRect(Math.round(cx - st.rx) + 1, Math.round(y - st.ry) + 1, Math.round(st.rx * 2) - 1, 1);
  }
}

/** The bake-off's running order, with what each read is FOR. */
export const LCD_GORILLA_EXPRESSIONS = [
  { id: 'smile', name: 'SMILE', note: 'the authored face — the control. Nothing about it changes.' },
  { id: 'neutral', name: 'NEUTRAL', note: 'brows level, mouth a flat line: a machine between throws.' },
  { id: 'sad', name: 'SAD', note: 'level brows over lidded eyes and a turned-down mouth — put out rather than furious.' },
  { id: 'effort', name: 'EFFORT', note: 'eyes squeezed shut, brows up, mouth a small O: the throw grunt.' },
  { id: 'sly', name: 'SLY', note: 'a cocked brow and a lopsided smirk, both pupils looking away.' },
  { id: 'startled', name: 'STARTLED', note: 'the crash face, unchanged: shock ticks, sweat bead, small O.' },
];

// The eyes sit at +/-3.5px while the shipped nostrils sit at +/-2.5px. That
// near-vertical echo is the question this sheet isolates: every candidate only
// changes the nostril centres, in small enough steps to find the optical sweet
// spot; the last cut deliberately lets the ellipses touch as a guardrail.
// SETTLED 3 Sep 2026: N7. It breaks the eye-column echo while the 0.9px air
// between the two ellipses still keeps them distinct at panel scale.
const LCD_GORILLA_NOSTRIL = 'n7';
const LCD_GORILLA_NOSTRILS = {
  n0: 2.5,
  n1: 2.35,
  n2: 2.2,
  n3: 2.05,
  n4: 1.9,
  n5: 1.75,
  n6: 1.6,
  n7: 1.45,
  n8: 1.3,
  n9: 1.15,
  n10: 1,
};
export const LCD_GORILLA_NOSTRIL_STYLES = [
  { id: 'n0', name: 'N0 · OLD', note: '2.50px from centre; 5.00px centre-to-centre. The former spacing.' },
  { id: 'n1', name: 'N1', note: '2.35px from centre; the smallest inward move.' },
  { id: 'n2', name: 'N2', note: '2.20px from centre; 0.60px closer across the pair.' },
  { id: 'n3', name: 'N3', note: '2.05px from centre; just over one pixel closer across the pair.' },
  { id: 'n4', name: 'N4', note: '1.90px from centre; clearly breaks the eye-column echo.' },
  { id: 'n5', name: 'N5', note: '1.75px from centre; compact, with 1.50px of air between the marks.' },
  { id: 'n6', name: 'N6', note: '1.60px from centre; the tight-end guardrail, still two marks.' },
  { id: 'n7', name: 'N7 · SHIPS', note: '1.45px from centre; 0.90px of air between the marks. Peter’s pick.' },
  { id: 'n8', name: 'N8', note: '1.30px from centre; a compact pair with only 0.60px of air.' },
  { id: 'n9', name: 'N9', note: '1.15px from centre; near-touching, but still separated in the vector.' },
  { id: 'n10', name: 'N10', note: '1.00px from centre; the ellipses touch — the one-mark guardrail.' },
];

// ---- AND THE BROWS, WHICH ARE THE OTHER HALF OF EVERY ONE OF THEM ----------
//
// The SHAPE of a brow is the expression (arch, flat, vee, cock, above); its
// WEIGHT AND SPAN are a separate question, and the answer applies to all of
// them at once — including the startle, which has worn the heavy pair since it
// was drawn. So the two axes are separate here: pick a shape per face, pick a
// treatment once for the whole gorilla.
//
// Every style is measured on the head it sits on: the eyes are 4.8px across and
// their outer edges are 5.9px from centre, so a 14px brow at 1.5px thick is
// wider than the eye AND as heavy as the muzzle line under it. That is the
// thing being judged.
//
//   w     stroke weight
//   span  how far from centre the outer end reaches (the eye ends at 5.9)
//   dy    pushed DOWN toward the eye from the authored roof-35
//   lift  how much an arch rises in the middle
//   drop  how far a vee's inner end falls onto the eye
//   inner where the inner end starts (a tuft leaves the inner half bare)
//   cells 2px grid squares instead of a stroke — the panel's own pixel idiom
// WHICH TREATMENT THE PANEL WEARS. One constant for the whole gorilla, every
// stage, every expression — the bake-off exists to change this line and nothing
// else. It was `heavy` — 14px of 1.5px ink up on the forehead — until the
// bake-off showed that at that height the brow is drawn on his SKULL, dark on
// dark, and reads as a lump rather than a brow. `short` sits it down on the
// pale face plane, no wider than the eyes under it.
const LCD_GORILLA_BROW = 'short';

const LCD_GORILLA_BROWS = {
  heavy: { w: 1.5, span: 7, dy: 0, lift: 2, drop: 3.5, inner: 0 },
  thin: { w: 1, span: 6.5, dy: 0.5, lift: 2, drop: 3, inner: 1 },
  short: { w: 1.25, span: 5.5, dy: 1.5, lift: 1.5, drop: 2.5, inner: 1.5 },
  tuft: { w: 1.75, span: 7, dy: 0.5, lift: 1.5, drop: 2.5, inner: 3.5 },
  soft: { w: 1.25, span: 6.5, dy: 0.5, lift: 2, drop: 3, inner: 1, ink: LCD_PRINT_SOFT },
  cells: { cells: true, span: 6.5, dy: 0, lift: 2, drop: 3, inner: 1.5 },
  // THE THING THE FIRST SHEET ACTUALLY SHOWED. At the authored height the brow
  // is drawn on the SKULL — dark ink on the dark plane — so it reads as a lump
  // on his forehead rather than as a brow, and every treatment that stayed up
  // there lost for the same reason. The pale face plane is only 13px across at
  // that height; a brow has to be short enough and low enough to sit ON it.
  lowcells: { cells: true, span: 5.5, dy: 2, lift: 1.5, drop: 2.5, inner: 1.5 },
  arc: { w: 1.25, span: 6, dy: 2.5, lift: 1.5, drop: 2.5, inner: 1.5 },
};

/** The brow treatments, in bake-off order. `heavy` is what ships today. */
export const LCD_GORILLA_BROW_STYLES = [
  { id: 'heavy', name: 'HEAVY', note: '1.5px, 14px wide, up on the forehead — the control, and the one called too much.' },
  { id: 'thin', name: 'THIN', note: 'same shapes at 1px and a half-pixel lower: the drawing, not the marker.' },
  { id: 'short', name: 'SHORT', note: '1.25px, no wider than the eyes and sat down on them — a brow, not a banner.' },
  { id: 'tuft', name: 'TUFT', note: 'the outer half only, thicker: a ridge over the eye with the inner end bare.' },
  { id: 'soft', name: 'SOFT', note: 'thin, in the soft ink the fur strokes use, so the brow is quieter than the mouth.' },
  { id: 'cells', name: 'CELLS', note: 'three 2px squares a side on the panel grid — the billboards\' own idiom.' },
  { id: 'lowcells', name: 'LOW CELLS', note: 'the same 2px squares, short and sat on the pale plane where they can be seen.' },
  { id: 'arc', name: 'ARC', note: 'a thin curve low over the eyes, fully inside the face plane: the quietest of them.' },
];

// One brow. Drawn as its own path so an asymmetric pair costs no extra code.
// `b` is the treatment; `kind` is the shape the expression asked for.
function lcdGorillaBrow(ctx, cx, y0, side, kind, b) {
  const y = y0 + b.dy;
  const inner = cx + side * b.inner, outer = cx + side * b.span;
  const mid = cx + side * (b.inner + b.span) / 2;
  // The four shapes, as three heights: where the inner end sits, where the
  // middle sits, where the outer end sits. Every treatment reads the same three.
  let iy = y, my = y - b.lift, oy = y;
  if (kind === 'flat') { my = y; }
  else if (kind === 'cock') {
    if (side < 0) { iy = y - 1.5; my = y - b.lift - 1; oy = y - 1; }
    else { iy = y + 1.5; my = y + 1.2; oy = y + 1; }
  } else if (side < 0) { iy = y + 1; my = y - b.lift; oy = y; }
  else { iy = y + 1; my = y - b.lift; oy = y; }

  if (b.cells) {
    // Squares on the 2px grid, snapped the way every other pixel cell on this
    // panel is: three per brow, at the three heights.
    ctx.fillStyle = LCD_PRINT;
    for (const [px, py] of [[inner, iy], [mid, my], [outer, oy]]) {
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
    }
    return;
  }
  ctx.strokeStyle = b.ink || LCD_PRINT;
  ctx.lineWidth = b.w;
  ctx.beginPath();
  ctx.moveTo(inner, iy);
  ctx.quadraticCurveTo(mid, my, outer, oy);
  ctx.stroke();
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 1.5;
}

// The face, centred on the head at (cx, roof - 31). Draws in the order it
// always has — whites, pupils, brows, nostrils, mouth — because the head plane
// is already down and every one of these sits on top of the one before it.
// WHERE HE IS LOOKING WHEN NOTHING IS HAPPENING. The eyes SNAP, like every
// other moving thing on this panel — his arms step between four poses, the
// barrels step between cells, and a pair of pupils that slid between positions
// would be the one tweened thing on a screen made of segments.
//
// So the only dial is how OFTEN, and it was too often. Indexed by the bar, a
// glance lasted four beats and he was moving his eyes about as fast as he
// moves his arms, which reads as a nervous animal rather than a watchful one.
// Two bars a glance, and more than half the table is dead ahead: he mostly
// stares, looks down at the road where the hero is now and then, and gives the
// odd glance to each side. Sixteen entries at two bars each is thirty-two bars
// before the pattern comes round, which is longer than anything else he does.
const LCD_GAZE_IDLE = [
  [0, 0], [0, 0], [-1, 0], [0, 0], [0, 1], [0, 0], [0, 0], [1, 0],
  [0, 0], [0, 1], [0, 0], [0, 0], [-1, 1], [0, 0], [1, 1], [0, 0],
];
const LCD_GAZE_BARS = 2;      // how long one idle glance is held
// A point on the panel turned into a pupil direction, each axis -1..1. The
// distance is thrown away on purpose: an eye that looks HALF way at a thing
// reads as an eye pointed at nothing, so anything worth watching gets the
// full throw and the only question is which way.
function lcdGazeTo(cx, eyeY, target, frame) {
  if (!target) {
    const [dx, dy] = LCD_GAZE_IDLE[lcdMod(Math.floor(frame.bar / LCD_GAZE_BARS), LCD_GAZE_IDLE.length)];
    return { dx, dy };
  }
  const ax = target[0] - cx, ay = target[1] - eyeY;
  const n = Math.max(1, Math.hypot(ax, ay));
  const clamp = (v) => Math.max(-1, Math.min(1, v * 1.7));
  return { dx: clamp(ax / n), dy: clamp(ay / n) };
}

function lcdGorillaFace(ctx, cx, roof, exprId, browStyle, thin = false, gaze = null, shock = null, nostrilStyle = null) {
  const f = LCD_GORILLA_FACES[exprId] || LCD_GORILLA_FACES.smile;
  const brow = LCD_GORILLA_BROWS[browStyle] || LCD_GORILLA_BROWS[LCD_GORILLA_BROW];
  const eyeY = roof - 31;
  // The mouth's and the shut eye's weight. The brow keeps its own (SHORT,
  // settled on its own sheet); `thin` is the gorilla-wide line weight.
  const lw = thin ? 1.1 : 1.5;
  if (f.eye === 'shut') {
    // No whites at all: two lines that curve the way a squeezed eye does.
    ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = lw;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 6, eyeY + 0.5);
      ctx.quadraticCurveTo(cx + side * 3.5, eyeY - 3, cx + side * 1, eyeY + 0.5);
      ctx.stroke();
    }
  } else {
    const eyeR = f.eye === 'wide' ? 2.7 : 2.4;
    const eyeH = f.eye === 'wide' ? 3.1 : f.eye === 'narrow' ? 2 : 2.8;
    gbcEllipse(ctx, cx - 3.5, eyeY, eyeR, eyeH, '#f3edb1');
    gbcEllipse(ctx, cx + 3.5, eyeY, eyeR, eyeH, '#f3edb1');
    // The expression's own sideways look plus wherever he is watching. The
    // throw is kept inside the white — a pupil on the rim reads as a mistake
    // rather than a glance — so it is a pixel and a half across and one down.
    const px = (f.look || 0) * 1.4 + (gaze?.dx || 0) * 1.5;
    const py = (gaze?.dy || 0) * 1.1;
    gbcEllipse(ctx, cx - 3 + px, eyeY + 0.5 + py, 1.1, 1.4, LCD_PRINT);
    gbcEllipse(ctx, cx + 3 + px, eyeY + 0.5 + py, 1.1, 1.4, LCD_PRINT);
    // A lidded eye is a white with its top bitten off, not a smaller white:
    // the lid is where the glare lives.
    if (f.eye === 'narrow') {
      ctx.fillStyle = LCD_PRINT;
      ctx.fillRect(cx - 6, eyeY - 2.4, 5, 1.4);
      ctx.fillRect(cx + 1, eyeY - 2.4, 5, 1.4);
    }
  }
  ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = lw;
  const browY = roof - 35 + (f.browDy || 0);
  lcdGorillaBrow(ctx, cx, browY, -1, f.brow, brow);
  lcdGorillaBrow(ctx, cx, browY, 1, f.brow, brow);
  ctx.lineWidth = lw; // the brow painter resets it to its own weight
  // THE NOSTRILS RIDE HIGH ON THE MUZZLE, a pixel up from where they sat. The
  // muzzle runs roof-29.5 to roof-20.5 and they were at its middle, which left
  // the whole bottom half to the mouth and crowded whatever the mouth was
  // doing right under them. Up here they read as the top of the snout and the
  // mouth gets the room.
  const nostrilX = LCD_GORILLA_NOSTRILS[nostrilStyle] || LCD_GORILLA_NOSTRILS[LCD_GORILLA_NOSTRIL];
  gbcEllipse(ctx, cx - nostrilX, roof - 27, 1, 0.8, LCD_PRINT);
  gbcEllipse(ctx, cx + nostrilX, roof - 27, 1, 0.8, LCD_PRINT);
  const m = f.mouth;
  if (m === 'oh') {
    lcdShockMouth(ctx, cx, roof - 23, shock, lw);
  } else if (m === 'hoot') {
    // WIDE, NOT TALL. At 2.6 by 3.2 on the mouth line its bottom reached
    // roof-19.8 and the muzzle's floor is roof-20.5 — the grunt was hanging a
    // pixel through his own jaw. There is only 5.7px between the nostrils and
    // that floor, so the size had to come out of the HEIGHT; it goes back into
    // the width, where the muzzle is seven across and has room to spare. A
    // wide flat O is a better shout than a tall one anyway, and it stays the
    // biggest mouth he owns.
    gbcEllipse(ctx, cx, roof - 23.6, 3, 2, LCD_PRINT);
  } else if (m === 'line') {
    ctx.beginPath(); ctx.moveTo(cx - 4, roof - 22.8); ctx.lineTo(cx + 4, roof - 22.8); ctx.stroke();
  } else if (m === 'frown') {
    // Seated INSIDE the muzzle, which is the whole difficulty: the muzzle is an
    // ellipse, so its floor climbs as you go out, and a turned-down mouth puts
    // its two lowest points exactly where the room runs out. At the authored
    // half-width of 4 the muzzle's edge is at roof - 21.3 and the corners' own
    // stroke reached roof - 21.25 — they hit the rim. Pulled in to 3.5 and up
    // to roof - 22.7, the corners clear the tan by most of a pixel, and the
    // shallower drop keeps the arc off the nostrils above it.
    ctx.beginPath(); ctx.moveTo(cx - 3.5, roof - 22.7); ctx.quadraticCurveTo(cx, roof - 25.9, cx + 3.5, roof - 22.7); ctx.stroke();
  } else if (m === 'smirk') {
    ctx.beginPath(); ctx.moveTo(cx - 4.5, roof - 22.6); ctx.quadraticCurveTo(cx + 0.5, roof - 21.2, cx + 5, roof - 24.6); ctx.stroke();
    } else {
    ctx.beginPath(); ctx.moveTo(cx - 4, roof - 23.5); ctx.quadraticCurveTo(cx, roof - 21.5, cx + 4, roof - 23.5); ctx.stroke();
  }
  if (f.shock) {
    ctx.fillStyle = LCD_PRINT;
    for (const [mx, my] of LCD_STARTLE_MARKS) {
      ctx.fillRect(cx + mx * 2, roof - 31 + my * 2, 2, 2);
    }
    ctx.fillStyle = '#b9cf79';
    ctx.fillRect(cx + 12, roof - 36, 2, 2);
    ctx.fillRect(cx + 12, roof - 33, 2, 3);
  }
}

// WHICH FACE, BEAT BY BEAT — and the rule is that he changes at most once a
// BAR, never once a beat. A face that moves every beat is a face the eye keeps
// going back to, and every one of those beats is a beat spent off the lane. So
// the smile is his resting face and everything else is rationed.
//
// Two things spend the ration. The first is the LOOP COUNTER: one bar of one
// borrowed expression per 16-beat loop, cycling through six loops so the same
// variation never lands twice running and a player who watches him for a
// minute sees the whole set. The second is the PLUMBER, and that one is not a
// clock at all — see the journey in lcdGameWatch, where the beats the little
// man is up on the gorilla's own girder carry the face to wear on them. He is
// ANGRY while the man is close, SMIRKING on the beat the barrel gets him, and
// back to the smile immediately: the toy does not gloat any longer than it
// sulks.
//
// Nothing here is random. This panel does the same thing at the same moment of
// the loop forever, and the player gets to learn it.
const LCD_GORILLA_LOOP_MOODS = [
  null,           // a loop he just smiles through, so the change is felt
  [1, 'neutral'],
  [0, 'sly'],     // bar 0, as far from the plumber's bar 3 as the loop allows:
                  // next door to it he smirks, drops to sad, then smirks again,
                  // and the gag reads as fidgeting rather than as a reaction.
  null,
  [0, 'neutral'],
  [2, 'effort'],  // a bar of hooting with his eyes shut
];
// SAD IS NOT IN HERE ON PURPOSE. It is the only face on the panel that is
// about something — the little man arriving on his girder — and a face that
// also turns up on a timer stops being about anything. The smirk is in the
// rotation and still lands on the hit, and that is the other way round for the
// same reason: he is a gorilla who smirks, and one of the things he smirks at
// is a plumber getting flattened.
// Bar 3 is never authored here: those four beats belong to the plumber.
function lcdGorillaMood(frame, hint = null) {
  if (frame.gorillaExpr) return frame.gorillaExpr;
  if (hint) return hint;
  const loop = LCD_GORILLA_LOOP_MOODS[lcdMod(frame.phrase, LCD_GORILLA_LOOP_MOODS.length)];
  return loop && loop[0] === Math.floor(frame.step / 4) ? loop[1] : 'smile';
}

// `burst` is the phase from lcdBurstPhase, or -1: on those two beats the barrel
// he is holding is not there to be drawn, because the plane just removed it.
// ---- WHAT COLOUR HE IS ------------------------------------------------------
//
// The question that came back on 3 Sep 2026 was "why is Kong blue?", and the
// answer is the ARM CORE: each active arm is a 7px stroke of the graphite print
// with a 3px TEAL stroke run down its middle (rgba(70,121,137)), a highlight
// left over from the Game Boy Color palette this pack started in. On the
// grey-green panel the graphite composites to an olive grey, so the teal is
// the most saturated thing on him and the arms are the biggest thing on him —
// which is why the whole figure reads blue from a lane away.
//
// One palette for the whole gorilla, every stage, every pose; the bake-off
// exists to change LCD_GORILLA_INK and nothing else. SETTLED 3 Sep 2026:
// ONE INK — the teal core went, and the arms lost nothing without it. A Game
// & Watch segment is one ink, and now so is he. Five planes:
//
//   fur    the body, limbs, skull and ear rims
//   core   the stroke run down the middle of an active arm, or null for none
//   face   the pale plane the expression is drawn on
//   skin   muzzle, inner ears and hands
//   chest  the plane between the shoulders
//
// The face painter keeps its own ink (print pupils, print brows, straw whites)
// so an expression reads the same on every candidate.
const LCD_GORILLA_INK = 'oneink';

const LCD_GORILLA_INKS = {
  ships: { fur: LCD_PRINT, core: 'rgba(70,121,137,0.72)', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The Game & Watch answer: he is a segment, and a segment is one ink. The arm
  // core simply goes; the round stroke's own edge is the only modelling.
  oneink: { fur: LCD_PRINT, core: null, face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // ---- the head as a SOLID plane. `head` overrides the fur for the ears,
  // skull and tuft only: the body stays translucent, because the shade where
  // an arm crosses the shoulder is what separates the two and going solid
  // everywhere flattens him into one mass. The values are MEASURED, not
  // guessed: the translucent head reads (101,107,93) over stage 1's sky and
  // (96,102,90) over stage 3's, so #63695c is the tone that reads the same on
  // both to within about three units.
  solidhead: { fur: LCD_PRINT, core: null, head: '#63695c', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  solidheadlight: { fur: LCD_PRINT, core: null, head: '#6e7466', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  solidheadlighter: { fur: LCD_PRINT, core: null, head: '#7a8071', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The whole figure's ink lightened, still translucent, so the overlaps still
  // separate him. #545e is two steps up from the graphite.
  lightink: { fur: 'rgba(84,88,94,0.72)', core: null, face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  lighterink: { fur: 'rgba(96,100,106,0.72)', core: null, face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // ---- TWO FLAT TONES, which is how the reference cartoon does it: a lighter
  // body with darker limbs IN FRONT of it, and no translucency anywhere, so
  // nothing stacks. `body` is the torso, shoulders, legs and head; `limb` is
  // the arms, and setting it moves them to the front. The numbers start from
  // the measured single-fill tone, (96,102,90) over the panel: the body goes
  // up from it, the arms down.
  twotone: { fur: LCD_PRINT, core: null, body: '#6e7466', head: '#6e7466', limb: '#4f5450', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  twotonewide: { fur: LCD_PRINT, core: null, body: '#7a8071', head: '#7a8071', limb: '#464b4a', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // Half the gap: the body barely lighter than the tone it has now.
  twotonesoft: { fur: LCD_PRINT, core: null, body: '#666c60', head: '#666c60', limb: '#575c56', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The arms alone: body left exactly as it is, translucent, with opaque dark
  // arms in front of it. The smallest change that gives the arm an edge.
  darklimbs: { fur: LCD_PRINT, core: null, limb: '#4f5450', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // ---- THE SHOULDER BALL ALONE, at three strengths of the SAME ink. The body
  // is 0.72; the ball drops to half that and less, so the joint stops piling
  // up. Nothing else changes.
  litshoulder: { fur: LCD_PRINT, core: null, shoulder: 'rgba(60,63,69,0.5)', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  litshoulderwide: { fur: LCD_PRINT, core: null, shoulder: 'rgba(60,63,69,0.34)', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  litshoulderfaint: { fur: LCD_PRINT, core: null, shoulder: 'rgba(60,63,69,0.2)', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // And the faintest ball with the arms brought to the front in their own dark,
  // so the joint has a light side and a dark side rather than one edge.
  litshoulderdark: { fur: LCD_PRINT, core: null, shoulder: 'rgba(60,63,69,0.6)', limb: '#4f5450', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // And the same lighter ink with a solid head matched to IT: 0.72 of
  // (84,88,94) over the same skies lands at about (113,119,108).
  lightinksolid: { fur: 'rgba(84,88,94,0.72)', core: null, head: '#71776c', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The same, at the ink's full strength: a lit segment is opaque, and every
  // other figure on the panel is the print at 0.72 BECAUSE it is scenery.
  solid: { fur: LCD_INK, core: null, face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The panel's own second ink instead of a third colour: the core in the
  // coral the windows and the live barrel ring use.
  coral: { fur: LCD_PRINT, core: LCD_WINDOW_ON, face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The gorilla everybody knows: brown fur, a lighter brown down the arm, and
  // the chest in the same tan as the muzzle.
  brown: { fur: 'rgba(104,66,34,0.9)', core: 'rgba(146,98,54,0.8)', face: '#e1d68c', skin: '#d4a35e', chest: '#d4a35e' },
  // Brown, but kept in the panel's family: a dark olive-sepia that sits between
  // the graphite and the barrel's wood rather than importing a hue.
  sepia: { fur: 'rgba(84,62,42,0.88)', core: 'rgba(122,92,60,0.78)', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
  // The panel's own green pushed dark: fur in the screen's hue, so he is a
  // shadow ON the screen rather than a thing printed over it.
  olive: { fur: 'rgba(56,72,34,0.88)', core: 'rgba(96,120,56,0.8)', face: '#e1d68c', skin: '#d4a35e', chest: '#b9cf79' },
};

// THE SOLID HEAD LOST, 3 Sep 2026, and for a reason worth writing down: the
// arms are drawn BEFORE the head, so on the beats they are up beside it the
// translucent skull lets them show through as a darker shape. Make the head
// opaque and the arm behind it simply vanishes — the thing that separates arm
// from body here IS the doubled translucency. LCD_GORILLA_INKS keeps the four
// solid candidates drawable.
/** How the fur is TONED — the open question, 3 Sep 2026. */
export const LCD_GORILLA_TONE_STYLES = [
  { id: 'oneink', name: 'SHIPS', note: 'graphite print at 72% over the panel — the control. One ink, so an arm crossing the body is only a darker patch, and the armpit stacks three deep into a near-black blob.' },
  { id: 'litshoulderdark', name: 'SOFT SHOULDER + DARK ARMS', note: 'the softened ball with the arms brought to the front in their own dark: the joint gets a light side and a dark side.' },
  { id: 'twotone', name: 'TWO TONE', note: 'the reference\'s answer — a lighter body and darker arms, both FLAT, with the arms moved in FRONT. Nothing stacks, so the armpit blob is gone and the arm has a real edge.' },
  { id: 'twotonesoft', name: 'TWO TONE · SOFT', note: 'half the gap between the two tones: as little separation as still reads.' },
  { id: 'twotonewide', name: 'TWO TONE · WIDE', note: 'twice the gap: the body lighter still and the arms nearly black.' },
  { id: 'darklimbs', name: 'DARK LIMBS ONLY', note: 'body left exactly as it is, translucent, with flat dark arms in front of it — the smallest change that gives the arm an edge.' },
];

/** The ink candidates, in bake-off order. `oneink` ships; `ships` is the teal it replaced. */
export const LCD_GORILLA_INK_STYLES = [
  { id: 'ships', name: 'TEAL CORE', note: 'graphite print with a teal core down each active arm — what shipped before, and the blue.' },
  { id: 'oneink', name: 'ONE INK', note: 'the same graphite, no arm core: a Game & Watch segment is one ink. SHIPS.' },
  { id: 'solid', name: 'SOLID INK', note: 'the ink at full strength: a lit segment is opaque, and only scenery is at 0.72.' },
  { id: 'coral', name: 'CORAL CORE', note: 'graphite, with the arm core in the panel\'s coral rather than a third colour.' },
  { id: 'brown', name: 'DK BROWN', note: 'brown fur, lighter brown down the arm, tan chest: the gorilla everybody knows.' },
  { id: 'sepia', name: 'SEPIA', note: 'brown kept in the panel\'s family — between the graphite and the barrel\'s wood.' },
  { id: 'olive', name: 'OLIVE', note: 'the screen\'s own green pushed dark: a shadow on the panel, not a print over it.' },
];

// ---- HOW HE IS BUILT --------------------------------------------------------
//
// The ovals are a Game Boy Color leftover too. He was drawn as "proper vector
// anatomy" — stacked ellipses for shoulders, thighs and feet, a curved torso,
// round-capped arms — to stay expressive at phone scale in a pack that was then
// a GBC screen, and the OLED Game & Watch settlement for the backdrops never
// reached him. A real Game & Watch figure is the opposite of that: a flat,
// hard-edged, one-ink silhouette, its head, body and each arm pose a separate
// segment with a hair of screen between them. The girders under him are
// already drawn that way.
//
// So the candidates share ONE PLAN — the same planes at the same addresses,
// so the face painter lands on every one of them unchanged — and differ only
// in how the plan is put on the panel:
//
//   ovals     the shipped construction, ellipses and curves
//   hard      the same planes with straight edges and chamfered corners
//   segments  HARD, but every plane its own segment with a 1px gutter of
//             screen between them, the way the toy's figures are cut
//   cells     HARD rasterised onto the 2px grid the billboards use
//   line      HARD as line art — a light fill and an ink outline, the way the
//             buildings are drawn
//
// Everything below is in ROOF-RELATIVE units: x from the figure's centre, y
// from the roof line, negative up. The addresses are the ovals' own extents.
const LCD_GORILLA_BUILD = 'ovals';

// A chamfered box: [x0, y0, x1, y1] with `c` cut off each corner.
function lcdChamfer(x0, y0, x1, y1, c) {
  return { poly: [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]] };
}

// The plan. `fur` is the silhouette; the rest are the planes drawn over it.
// Arms are not here — they come from the pose — and nor are the hands.
function lcdGorillaPlan() {
  return {
    fur: [
      // torso with the shoulders built in: the ovals' shoulders reached ±17
      // at roof-18, the belly ±14 at the roof
      { poly: [[-13, -25], [13, -25], [17, -21], [17, -10], [14, -2], [-14, -2], [-17, -10], [-17, -21]] },
      { rect: [-12, -12, -2, -2] }, { rect: [2, -12, 12, -2] },     // thighs
      { rect: [-17, -4, -1, 2] }, { rect: [1, -4, 17, 2] },         // feet
      { rect: [-15, -34, -10, -26] }, { rect: [10, -34, 15, -26] }, // ears
      lcdChamfer(-12, -42, 12, -20, 4),                             // head
    ],
    skin: [
      { rect: [-13, -32, -10, -28] }, { rect: [10, -32, 13, -28] }, // inner ears
      lcdChamfer(-7, -29.5, 7, -20.5, 2),                           // muzzle
    ],
    face: [lcdChamfer(-8.5, -36, 8.5, -22, 2.5)],
    chest: [lcdChamfer(-7, -19, 7, -3, 2)],
  };
}

function lcdPlanPath(ctx, shape, cx, roof) {
  if (shape.rect) {
    const [x0, y0, x1, y1] = shape.rect;
    ctx.rect(cx + x0, roof + y0, x1 - x0, y1 - y0);
    return;
  }
  shape.poly.forEach(([px, py], i) => (i ? ctx.lineTo(cx + px, roof + py) : ctx.moveTo(cx + px, roof + py)));
  ctx.closePath();
}

// Point-in-shape, done here rather than with isPointInPath so it is
// independent of whatever transform the panel is being drawn through — and so
// the recording context the tests use can run it.
function lcdPlanInside(shape, x, y) {
  if (shape.rect) {
    const [x0, y0, x1, y1] = shape.rect;
    return x >= x0 && x < x1 && y >= y0 && y < y1;
  }
  const p = shape.poly;
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function lcdSegInside(points, w, x, y) {
  const r2 = (w / 2) * (w / 2);
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const ex = ax + t * dx - x, ey = ay + t * dy - y;
    if (ex * ex + ey * ey <= r2) return true;
  }
  return false;
}

// Rasterise a predicate onto the 2px grid over the figure's box. The grid is
// anchored to even screen coordinates like every other cell on the panel.
function lcdGorillaCells(ctx, cx, roof, color, inside) {
  ctx.fillStyle = color;
  const x0 = Math.floor((cx - 28) / 2) * 2, y0 = Math.floor((roof - 48) / 2) * 2;
  for (let y = y0; y < roof + 4; y += 2) {
    for (let x = x0; x < cx + 30; x += 2) {
      if (inside(x + 1, y + 1)) ctx.fillRect(x, y, 2, 2);
    }
  }
}

// Every build but the ovals. Ghosts, arms, planes and hands; the face painter
// and the barrel are the caller's, as they are for the ovals.
function lcdGorillaHardBody(ctx, cx, roof, poses, pose, ink, build) {
  const plan = lcdGorillaPlan();
  const hands = pose.hands.map(([hx, hy]) => ({ rect: [hx - cx - 3.5, hy - roof - 3, hx - cx + 3.5, hy - roof + 3] }));
  if (build === 'cells') {
    const anyOf = (shapes) => (x, y) => shapes.some((sh) => lcdPlanInside(sh, x - cx, y - roof));
    for (const ghost of poses) {
      lcdGorillaCells(ctx, cx, roof, LCD_MOTION_GHOST, (x, y) => ghost.arms.some((a) => lcdSegInside(a, 5, x, y)));
      if (ghost.barrel) gbcGorillaBarrel(ctx, ghost.barrel[0], ghost.barrel[1], true, false, frame.barrelShape);
    }
    lcdGorillaCells(ctx, cx, roof, ink.fur, (x, y) => pose.arms.some((a) => lcdSegInside(a, 7, x, y)) || anyOf(plan.fur)(x, y));
    lcdGorillaCells(ctx, cx, roof, ink.face, anyOf(plan.face));
    lcdGorillaCells(ctx, cx, roof, ink.skin, anyOf(plan.skin));
    lcdGorillaCells(ctx, cx, roof, ink.chest, anyOf(plan.chest));
    lcdGorillaCells(ctx, cx, roof, ink.skin, anyOf(hands));
    return;
  }
  const line = build === 'line';
  // The gutters are cut in the LIT panel colour, which is what the sky he
  // stands against is; in the unlit panel they read as a green outline.
  const gutter = build === 'segments';
  // The fills. LINE keeps the ink for the outline and lightens the plane.
  const furFill = line ? 'rgba(60,63,69,0.22)' : ink.fur;
  const plane = (shapes, fill) => {
    for (const sh of shapes) {
      ctx.beginPath();
      lcdPlanPath(ctx, sh, cx, roof);
      ctx.fillStyle = fill; ctx.fill();
      if (line) { ctx.strokeStyle = LCD_INK; ctx.lineWidth = 1; ctx.stroke(); }
      if (gutter) { ctx.strokeStyle = LCD_PANEL_LIT; ctx.lineWidth = 1; ctx.stroke(); }
    }
  };
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'bevel';
  for (const ghost of poses) {
    for (const arm of ghost.arms) gbcGorillaLimb(ctx, arm, LCD_MOTION_GHOST, 5);
    if (ghost.barrel) gbcGorillaBarrel(ctx, ghost.barrel[0], ghost.barrel[1], true, false, frame.barrelShape);
  }
  for (const arm of pose.arms) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'bevel';
    if (gutter) gbcGorillaLimb(ctx, arm, LCD_PANEL_LIT, 9);
    if (line) {
      gbcGorillaLimb(ctx, arm, LCD_INK, 7);
      gbcGorillaLimb(ctx, arm, LCD_PANEL_LIT, 5);
      gbcGorillaLimb(ctx, arm, furFill, 5);
    } else {
      gbcGorillaLimb(ctx, arm, ink.fur, 7);
    }
  }
  plane(plan.fur, furFill);
  plane(plan.face, ink.face);
  plane(plan.skin, ink.skin);
  plane(plan.chest, ink.chest);
  plane(hands, ink.skin);
  if (!line) {
    ctx.strokeStyle = ink.fur; ctx.lineWidth = 0.75;
    for (const [hx, hy] of pose.hands) {
      for (let finger = -1; finger <= 1; finger++) {
        ctx.beginPath(); ctx.moveTo(hx + finger * 1.5, hy - 1); ctx.lineTo(hx + finger * 1.5, hy + 1.5); ctx.stroke();
      }
    }
  }
}

/** The constructions, in bake-off order. `ovals` is what ships today. */
export const LCD_GORILLA_BUILD_STYLES = [
  { id: 'ovals', name: 'OVALS', note: 'stacked ellipses and curves, round-capped arms — the control, and the Game Boy Color leftover.' },
  { id: 'hard', name: 'HARD', note: 'the same planes with straight edges and chamfered corners, butt-capped arms: one flat silhouette.' },
  { id: 'segments', name: 'SEGMENTS', note: 'HARD, with a 1px gutter of screen between head, body, legs and each arm — cut the way the toy\'s figures are.' },
  { id: 'cells', name: 'CELLS', note: 'HARD rasterised onto the 2px grid the billboards use; the face painter still draws on top.' },
  { id: 'line', name: 'LINE ART', note: 'HARD as an ink outline over a light fill, the way the buildings are drawn.' },
];
const LCD_GORILLA_BUILDS = new Set(LCD_GORILLA_BUILD_STYLES.map((b) => b.id));

// ---- THE ARMPIT, AND THE TUFT --------------------------------------------
//
// What came back on the construction sheet was not "make him a segment" but
// two things about the ovals: the ARMPIT is indistinct — the shoulder ball,
// the torso's bulge and the 7px arm are all the same ink and meet in one
// bell-shaped mass, so the arm never visibly LEAVES the body — and the skull
// is a perfect circle, which wants a tuft. Two dials, one constant each.
//
//   pit    shoulder  where the shoulder ball sits and how big it is [x, y, rx, ry]
//          torso     the torso's top corner and its bulge control point
//          crease    a line along the arm's underside from the armpit, in
//                    the ink, or in the lit panel ('cut') so it is a gap
//          outline   the active arm drawn with an ink edge under it
//          arm       the active arm's stroke width; the ghosts are 2 thinner
//          thin      THINNER LINES OVERALL: the ear rims, the mouth, the fur
//                    strokes, the finger cuts and the hand's edge, not just
//                    the arm — asked for as one thing, so it is one flag
const LCD_GORILLA_PIT = 'ships';
const LCD_GORILLA_PITS = {
  ships: { shoulder: [11, -18, 6, 7], torso: [[13, -20], [15, -8]] },
  // The reference's answer: an ink line where the arm meets the body.
  crease: { shoulder: [11, -18, 6, 7], torso: [[13, -20], [15, -8]], crease: true },
  // The whole active arm edged in full-strength ink, so it reads OVER the
  // body it comes out of rather than merging with it.
  outline: { shoulder: [11, -18, 6, 7], torso: [[13, -20], [15, -8]], outline: true },
  // Open the armpit up: a smaller shoulder ball set higher and in, and the
  // torso pulled in at the top, so a notch of sky shows under a raised arm.
  hollow: { shoulder: [10, -20, 5.5, 6.5], torso: [[11, -21], [14, -6]] },
  hollowcrease: { shoulder: [10, -20, 5.5, 6.5], torso: [[11, -21], [14, -6]], crease: true },
  // The same line, but a GAP rather than a mark: cut in the lit panel colour.
  cut: { shoulder: [11, -18, 6, 7], torso: [[13, -20], [15, -8]], crease: 'cut' },
  // THINNER ARMS. At 7px the arm is as wide as the shoulder ball is tall, so
  // the two are one shape; at 5 it is a limb coming off a body.
  thin: { shoulder: [11, -18, 6, 7], torso: [[13, -20], [15, -8]], arm: 5, thin: true },
  thinhollow: { shoulder: [10, -20, 5.5, 6.5], torso: [[11, -21], [14, -6]], arm: 5, thin: true },
  thinhollowcrease: { shoulder: [10, -20, 5.5, 6.5], torso: [[11, -21], [14, -6]], arm: 5, crease: true, thin: true },
};
// The two that survived 3 Sep 2026. CREASE, CUT, OUTLINE and every THIN
// combination were looked at and rejected — the ink line and the ink edge both
// put a mark on him nothing else on the panel has, and thinning the lines took
// weight off a figure that is only 40px tall. LCD_GORILLA_PITS keeps them all
// drawable; only this list is the sheet.
/** The armpit treatments, in bake-off order. `ships` is what ships today. */
export const LCD_GORILLA_PIT_STYLES = [
  { id: 'ships', name: 'SHIPS', note: 'shoulder ball at ±11 and roof-18, 6x7; the torso\'s top corner at ±13 bulging out to ±15 — the control, and one mass.' },
  { id: 'hollow', name: 'HOLLOW', note: 'the same parts moved: shoulder ball 1px in, 2px up and half a pixel smaller, and the torso\'s top corner pulled 2px in so its widest point sits lower. A notch of sky opens under a raised arm.' },
];

// ---- HOW FAR THE EARS STICK OUT ---------------------------------------------
//
// They are drawn before the skull, so the skull covers their inner half and
// what is left is the rim standing out either side. The dial is where the
// ellipse sits and how big it is: pull it in and the rim gets shorter, because
// more of it is under the skull. [dx, dy, rx, ry, inner rx, inner ry], all
// roof-relative; the skull is 12x11 at roof-31.
// The RIM is the fur ring between the two ellipses — the ear's outline. It is
// 2px on the shipped ear, which is as heavy as the muzzle line, on a part that
// is 8px across. Thinning it is the other way to make an ear read as tucked:
// less black around it rather than less of it sticking out.
// HEIGHT IS FIXED at roof-30. Sitting the ear lower was tried on 3 Sep 2026
// and rejected — it read as a jaw, not an ear.
const LCD_GORILLA_EAR = 'ships';
const LCD_GORILLA_EARS = {
  ships: [11, -30, 4, 5, 2, 3],
  // Same ear, moved 1.5px in: the rim goes from 3px of daylight to 1.5px.
  tucked: [9.5, -30, 4, 5, 2, 3],
  // In and smaller, so the outline is shorter AND shallower.
  tight: [9, -30, 3.5, 4.5, 1.75, 2.75],
  // THE OUTLINE THINNED, ear where it is: the inner ellipse comes out to
  // within a pixel of the edge, so the ring is 1px rather than 2.
  thinrim: [11, -30, 4, 5, 3, 4],
  // Both: the thin ring on the pulled-in ear.
  thintucked: [9.5, -30, 4, 5, 3, 4],
  // The thin ring on the smaller ear, which is the least ear of the five.
  thintight: [9, -30, 3.5, 4.5, 2.6, 3.6],
};
/** The ear positions, in bake-off order. `ships` is what ships today. */
export const LCD_GORILLA_EAR_STYLES = [
  { id: 'ships', name: 'SHIPS', note: 'ellipse at ±11, 4x5, a 2px fur ring around a 2x3 inner — the control.' },
  { id: 'tucked', name: 'TUCKED', note: 'the same ear moved 1.5px in, so half as much of it clears the skull.' },
  { id: 'tight', name: 'TIGHT', note: 'in 2px and a size down: less ear, same ring.' },
  { id: 'thinrim', name: 'THIN RIM', note: 'the ear where it is, its outline halved to 1px — less black around it rather than less of it.' },
  { id: 'thintucked', name: 'THIN RIM + TUCKED', note: 'the 1px outline on the pulled-in ear.' },
  { id: 'thintight', name: 'THIN RIM + TIGHT', note: 'the 1px outline on the smaller ear: the quietest of them.' },
];

// HOW BIG THE SHOULDER BALL IS, AND WHAT SHAPE. The shipped one is 6 wide by 7
// TALL, so it stands upright and its crown reaches roof-25 — level with the
// muzzle, which is what makes it crowd the jaw and read as a bicep rather than
// a shoulder. Everything here is [x from centre, y from roof, rx, ry]; the
// crown is y - ry, and that number is the one to watch.
// SETTLED 3 Sep 2026: `wide6` — the shipped ball's own width, 6, but lying
// down at 5.25 instead of standing at 7. Its crown drops from roof-25 to
// roof-22.75, which is what takes it off the jaw, and the shape reads across
// the shoulder as a deltoid rather than up it as a bicep. Narrower than 6 and
// the arm stops having anything to come out of.
const LCD_GORILLA_SHOULDER_SHAPE = 'wide6';
const LCD_GORILLA_SHOULDER_SHAPES = {
  tall: [11, -18, 6, 7],
  // The WIDE family: one height, 5.25, and the width stepped down a quarter of
  // a pixel at a time. 6.75 was the first cut and the ask was for less width at
  // the same height, so the crown stays at roof-22.75 all the way along and
  // only the reach across the shoulder changes.
  wide: [11, -17.5, 6.75, 5.25],
  wide65: [11, -17.5, 6.5, 5.25],
  wide625: [11, -17.5, 6.25, 5.25],
  wide6: [11, -17.5, 6, 5.25],
  wide575: [11, -17.5, 5.75, 5.25],
  flat: [11, -17, 7.25, 4.75],
  // Circles, 6 and under.
  circle: [11, -18, 6, 6],
  circle575: [11, -18, 5.75, 5.75],
  circle55: [11, -18, 5.5, 5.5],
};
/** The shoulder shapes, in bake-off order. `tall` is what ships today. */
export const LCD_GORILLA_SHOULDER_SHAPE_STYLES = [
  { id: 'tall', name: 'TALL · WAS', note: '6 wide by 7 tall, crown at roof-25 — upright, and level with the muzzle.' },
  { id: 'wide', name: 'WIDE · 6.75', note: 'the first cut: 6.75 by 5.25, crown at roof-22.75.' },
  { id: 'wide65', name: 'WIDE · 6.5', note: 'a quarter pixel narrower, same height.' },
  { id: 'wide625', name: 'WIDE · 6.25', note: 'half a pixel narrower, same height.' },
  { id: 'wide6', name: 'WIDE · 6.0 · SHIPS', note: 'as wide as the old ball but flatter — the same footprint, lying down, and it reads as a deltoid.' },
  { id: 'wide575', name: 'WIDE · 5.75', note: 'narrower than the shipped ball and still flat: the least of the wide family.' },
  { id: 'flat', name: 'FLAT · 7.25', note: '7.25 by 4.75, crown down at roof-21.75: a shoulder line rather than a ball.' },
  { id: 'circle', name: 'CIRCLE · 6', note: 'a true circle at 6: a pixel off the crown and no taller than it is wide.' },
  { id: 'circle575', name: 'CIRCLE · 5.75', note: 'the same circle a quarter pixel in.' },
  { id: 'circle55', name: 'CIRCLE · 5.5', note: 'the narrowest circle before the arm has nothing to come out of.' },
];

// HOW STRONG THE SHOULDER BALL IS. The body is 0.72 and the ball was the same,
// so the two stacked and the joint went dark — with the arm under both it was
// three fills deep and nearly the raw ink. Weakening the ball's ink is the
// whole dial: same hue, less of it, so the armpit stops piling up and the
// ball's outer cap reads lighter than the body instead of darker.
// SETTLED 3 Sep 2026: 0.6. Below the body's 0.72, so the joint stops piling up
// and the ball's outer cap reads as its own rounded plane — distinct, but
// still a muscle rather than an edge. 0.5 lost the shape entirely.
const LCD_GORILLA_SHOULDER = 0.6;
/** The strengths swept, 1.0 down to 0.5. 0.6 ships; 0.72 is the body's own. */
export const LCD_GORILLA_SHOULDER_ALPHAS = [
  { a: 1, name: 'SOLID · 1.0', note: 'the raw ink at full strength: the ball darker than the body, not lighter.' },
  { a: 0.9, name: '0.9', note: 'still heavier than the body.' },
  { a: 0.8, name: '0.8', note: 'a shade heavier than the body.' },
  { a: 0.72, name: '0.72 · WAS', note: 'the body\'s own strength — what it was, and the stack that made the joint black.' },
  { a: 0.65, name: '0.65', note: 'the first step that lifts the joint at all.' },
  { a: 0.6, name: '0.6 · SHIPS', note: 'the cap reads as its own plane, and the joint is still a muscle rather than an edge.' },
  { a: 0.55, name: '0.55', note: 'a shade softer again.' },
  { a: 0.5, name: '0.5', note: 'half the body: the softest of the sweep.' },
];

// THE SPIKES, AS A SPEC. `gap` is how far the left point sits from the middle
// one (the right is 0.77 of it), `mid` and `out` are the tip heights, `hw` is
// each base's half-width, `lean` swings the OUTER two points outward from
// their bases, and `inset` is how far inside the skull every base corner is
// seated. All roof-relative, all in panel px.
// SETTLED 3 Sep 2026: LEAN, dropped 0.6px — `leanH6`. The outer two points are
// swung away from their bases, which gives the crest a direction instead of
// three parallel teeth, and every tip sits 0.6px below the full height: at the
// full height the points read as antennae against the barrel, and by a whole
// pixel down the rake flattens into bumps. The sweep either side of it is kept
// in the specs below.
const LCD_GORILLA_SPIKES = 'leanH6';
const LCD_GORILLA_SPIKE_SPECS = {
  now: { gap: 3.91, mid: -46.3, out: -45, hw: 3.1, lean: 0, inset: 2.3 },
  taller: { gap: 3.91, mid: -47.6, out: -46.1, hw: 3.1, lean: 0, inset: 2.3 },
  tallest: { gap: 3.91, mid: -48.8, out: -47.1, hw: 3.1, lean: 0, inset: 2.3 },
  shorter: { gap: 3.91, mid: -45.2, out: -44.1, hw: 3.1, lean: 0, inset: 2.3 },
  wider: { gap: 4.6, mid: -46.3, out: -45, hw: 3.1, lean: 0, inset: 2.3 },
  widest: { gap: 5.3, mid: -46.3, out: -45, hw: 3.1, lean: 0, inset: 2.3 },
  tighter: { gap: 3.3, mid: -46.3, out: -45, hw: 3.1, lean: 0, inset: 2.3 },
  lean: { gap: 3.91, mid: -46.3, out: -45, hw: 3.1, lean: 1.3, inset: 2.3 },
  // The height sweep on the leaning crest: every tip down together, 0.2px at a
  // time, from the full height to the short one. The outer points stay 1.3px
  // below the middle throughout, which is the proportion the crest was cut to.
  leanH2: { gap: 3.91, mid: -46.1, out: -44.8, hw: 3.1, lean: 1.3, inset: 2.3 },
  leanH4: { gap: 3.91, mid: -45.9, out: -44.6, hw: 3.1, lean: 1.3, inset: 2.3 },
  leanH6: { gap: 3.91, mid: -45.7, out: -44.4, hw: 3.1, lean: 1.3, inset: 2.3 },
  leanH8: { gap: 3.91, mid: -45.5, out: -44.2, hw: 3.1, lean: 1.3, inset: 2.3 },
  leanH10: { gap: 3.91, mid: -45.3, out: -44, hw: 3.1, lean: 1.3, inset: 2.3 },
  leanH11: { gap: 3.91, mid: -45.2, out: -43.9, hw: 3.1, lean: 1.3, inset: 2.3 },
  leanmore: { gap: 3.91, mid: -46.3, out: -45, hw: 3.1, lean: 2.4, inset: 2.3 },
  tallLean: { gap: 3.91, mid: -47.6, out: -46.1, hw: 3.1, lean: 1.3, inset: 2.3 },
  wideLean: { gap: 4.6, mid: -46.3, out: -45, hw: 3.1, lean: 1.6, inset: 2.3 },
  tallWideLean: { gap: 4.6, mid: -47.6, out: -46.1, hw: 3.1, lean: 1.6, inset: 2.3 },
  fatbase: { gap: 3.91, mid: -46.3, out: -45, hw: 3.9, lean: 0, inset: 2.3 },
  thinbase: { gap: 3.91, mid: -46.3, out: -45, hw: 2.4, lean: 0, inset: 2.3 },
  thinTall: { gap: 3.91, mid: -47.6, out: -46.1, hw: 2.4, lean: 0, inset: 2.3 },
  deep: { gap: 3.91, mid: -46.3, out: -45, hw: 3.1, lean: 0, inset: 3.4 },
};
/**
 * The spike variants, in bake-off order. LEAN ships; the sweep under it is the
 * open question, and NOW (no lean) is kept as the thing it replaced.
 */
export const LCD_GORILLA_SPIKE_STYLES = [
  { id: 'lean', name: 'LEAN · FULL', note: 'the leaning crest at its full height — the top of the sweep.' },
  { id: 'leanH2', name: 'LEAN · −0.2', note: 'every tip down a fifth of a pixel.' },
  { id: 'leanH4', name: 'LEAN · −0.4', note: 'down two fifths.' },
  { id: 'leanH6', name: 'LEAN · −0.6', note: 'down three fifths — SHIPS.' },
  { id: 'leanH8', name: 'LEAN · −0.8', note: 'down four fifths.' },
  { id: 'leanH10', name: 'LEAN · −1.0', note: 'down a full pixel.' },
  { id: 'leanH11', name: 'LEAN · SHORT', note: 'the bottom of the sweep, level with the SHORTER crest that had no lean.' },
  { id: 'now', name: 'NO LEAN', note: 'the crest as it was before the lean, at full height — what LEAN replaced.' },
  { id: 'leanmore', name: 'LEAN · MORE', note: 'twice the fan at full height, for reference on how far the rake can go.' },
];

// The skull's top is at roof-42. Each tuft adds SUBPATHS to the silhouette
// path the skull is part of — it does not fill — so it is the same fill as
// the head: joined to it, the same colour, and no darker where they overlap.
// Everything is traced clockwise on screen to match ctx.ellipse, which the
// nonzero rule needs for the union to fill rather than punch holes.
// SETTLED 3 Sep 2026: SPIKES.
const LCD_GORILLA_TUFT = 'spikes';
const LCD_GORILLA_TUFTS = {
  none: null,
  swoop(ctx, cx, roof) {
    ctx.moveTo(cx - 4, roof - 41);
    ctx.quadraticCurveTo(cx, roof - 49, cx + 8, roof - 46);
    ctx.quadraticCurveTo(cx + 4, roof - 45, cx + 4, roof - 40.5);
    ctx.closePath();
  },
  spikes(ctx, cx, roof, frame) {
    // Three points across the crown. Each base corner is given its own y so it
    // sits INSIDE the skull, whose edge falls away fast out here: at x 7.5 the
    // ellipse is already down at roof-39.6, so the outer spike's base used to
    // hang most of a pixel off the head. The outer two are leaned inward and
    // their outer corners dropped, which seats them on the curve.
    // [x0, y0, tip x, tip y, x2, y2], roof-relative. The set sits 0.75px lower
    // than first drawn — half of the 1.5px drop that was tried on 3 Sep 2026
    // and came back too low. Only the part above the dome is visible, so
    // lowering the tuft necessarily shortens it: at 1.5 the points had lost a
    // third of their height, and this is the split.
    // THREE POINTS ACROSS THE CROWN, generated from a spec rather than typed
    // out, so height, spread, base width and the outward LEAN of the outer two
    // are each a number that can be swept — see LCD_GORILLA_SPIKE_STYLES.
    //
    // Base corners are not authored at all: each one is placed on the skull's
    // own curve and pushed `inset` px inside it, so a spike cannot end up
    // hanging off the head no matter what the spread is. That was a real bug
    // when the corners were hand-written — the outer one sat 0.9px off the
    // dome, because the ellipse falls away fast that far out.
    const sp = LCD_GORILLA_SPIKE_SPECS[frame?.gorillaSpikes] || LCD_GORILLA_SPIKE_SPECS[LCD_GORILLA_SPIKES];
    // The dome, roof-relative: the skull is 12 x 11 centred at roof-31.
    const dome = (x) => -31 - 11 * Math.sqrt(Math.max(0, 1 - (x / 12) ** 2));
    const MID = 0.6; // the middle point is a shade right of centre, as drawn
    // The right gap is the narrower of the two, which is how the crest was
    // hand-drawn and what stops it reading as a symmetrical comb.
    const bases = [MID - sp.gap, MID, MID + sp.gap * 0.77];
    const tips = [bases[0] - sp.lean, MID, bases[2] + sp.lean];
    const tipY = [sp.out, sp.mid, sp.out];
    for (let i = 0; i < 3; i++) {
      const x0 = bases[i] - sp.hw, x2 = bases[i] + sp.hw;
      ctx.moveTo(cx + x0, roof + dome(x0) + sp.inset);
      ctx.lineTo(cx + tips[i], roof + tipY[i]);
      ctx.lineTo(cx + x2, roof + dome(x2) + sp.inset);
      ctx.closePath();
    }
  },
  cells(ctx, cx, roof) {
    // On the 2px grid, anchored to even screen coordinates like every other
    // cell on the panel: a little stepped flame leaning right.
    const gx = Math.floor(cx / 2) * 2, gy = Math.floor(roof / 2) * 2;
    for (const [dx, dy] of [[-2, -42], [0, -42], [0, -44], [2, -44], [2, -46]]) ctx.rect(gx + dx, gy + dy, 2, 2);
  },
  crest(ctx, cx, roof) {
    const rot = -0.3;
    ctx.moveTo(cx + 2 + 5 * Math.cos(rot), roof - 43 + 5 * Math.sin(rot));
    ctx.ellipse(cx + 2, roof - 43, 5, 3.5, rot, 0, Math.PI * 2);
  },
};
/** The tufts, in bake-off order. `none` is what ships today. */
export const LCD_GORILLA_TUFT_STYLES = [
  { id: 'none', name: 'NONE', note: 'the perfect circle — the control.' },
  { id: 'swoop', name: 'SWOOP', note: 'one curl licking up and to the right, the reference\'s.' },
  { id: 'spikes', name: 'SPIKES', note: 'three little points across the crown.' },
  { id: 'cells', name: 'CELLS', note: 'five 2px squares stepping up to the right — the billboards\' own idiom.' },
  { id: 'crest', name: 'CREST', note: 'a low tilted bump on the crown, the quietest of them.' },
];

/**
 * `lookAt` is a point on the panel he is watching this beat, or null for the
 * idle wander — see lcdGazeTo. Callers supply it because only they know what
 * is worth watching: the tower knows where its plumber is, the city knows
 * where the plane and the chute's live barrel are.
 */
function lcdRooftopGorilla(ctx, building, frame, burst = -1,
  mood = null, lookAt = null) {
  const [x, w, h] = building;
  const ink = LCD_GORILLA_INKS[frame.gorillaInk] || LCD_GORILLA_INKS[LCD_GORILLA_INK];
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  const poses = [
    {
      arms: [
        [[cx - 12, roof - 19], [cx - 18, roof - 31], [cx - 8, roof - 43]],
        [[cx + 12, roof - 19], [cx + 18, roof - 31], [cx + 8, roof - 43]],
      ], hands: [[cx - 8, roof - 43], [cx + 8, roof - 43]], barrel: [cx, roof + LCD_BARREL_UP_DY],
    },
    {
      arms: [
        [[cx - 12, roof - 18], [cx - 18, roof - 10], [cx - 18, roof - 4]],
        [[cx + 12, roof - 19], [cx + 19, roof - 31], [cx + 13, roof - 37]],
      ], hands: [[cx - 18, roof - 4], [cx + 13, roof - 37]], barrel: [cx + 21, roof - 38],
    },
    {
      arms: [
        [[cx - 12, roof - 19], [cx - 18, roof - 13], [cx - 18, roof - 6]],
        [[cx + 12, roof - 19], [cx + 21, roof - 27], [cx + 19, roof - 20]],
      ], hands: [[cx - 18, roof - 6], [cx + 19, roof - 20]], barrel: [cx + 24, roof - 20],
    },
    // BEAT FOUR IS THE EMPTY HAND, and it is the only beat of the four that
    // says he is THROWING rather than juggling. The hand height falls all the
    // way down the bar — 43 over the roof, 37, 20, 5 — so the four cells are
    // one swing, and the last of them is the release: his fist is at the mouth
    // of the chute with nothing in it, and the chute's top cell lights on the
    // very next beat with the barrel he just let go. Drawing a barrel here as
    // well gave him a fourth one on the beat he is supposed to be empty, and
    // the swing read as a juggle that never let anything go.
    //
    // POSE 0 KEEPS ITS BARREL WHATEVER ELSE MOVES: LCD_BARREL_UP_BEAT names
    // it, the plane's crossing is authored to meet it, and the wreck is drawn
    // at its position for both beats after a strike.
    {
      arms: [
        [[cx - 12, roof - 18], [cx - 18, roof - 10], [cx - 18, roof - 4]],
        [[cx + 12, roof - 18], [cx + 18, roof - 11], [cx + 14, roof - 5]],
      ], hands: [[cx - 18, roof - 4], [cx + 14, roof - 5]], barrel: null,
    },
  ];

  // THE PLAYER MADE IT. On 3-3 the thrower stops being a hazard and gets to
  // acknowledge the runner: one arm stays planted while the other waves from
  // two stepped hand positions. There is deliberately no barrel on either
  // pose, and the normal throw ghosts are replaced by the two wave positions.
  // It is still beat-stepped, so the greeting belongs to this panel's idiom.
  const finale = frame.stageIndex === 3 && frame.finish;
  const wavePoses = [
    {
      arms: [
        [[cx - 12, roof - 19], [cx - 20, roof - 29], [cx - 17, roof - 41]],
        [[cx + 12, roof - 19], [cx + 19, roof - 11], [cx + 14, roof - 5]],
      ], hands: [[cx - 17, roof - 41], [cx + 14, roof - 5]], barrel: null,
    },
    {
      arms: [
        [[cx - 12, roof - 19], [cx - 18, roof - 26], [cx - 11, roof - 38]],
        [[cx + 12, roof - 19], [cx + 19, roof - 11], [cx + 14, roof - 5]],
      ], hands: [[cx - 11, roof - 38], [cx + 14, roof - 5]], barrel: null,
    },
  ];

  // THE SWING IS ONE STREAM WITH THE CHUTE, phased to the lane — see
  // lcdSwingPhase, which is the whole of the timing. His poses used to be
  // picked by `beat4` while the chute below him counted backward from the beat
  // the lane needs a barrel: two clocks with no common phase, so the barrel he
  // was visibly throwing was almost never the one that then lit in the chute,
  // and a second lit in his hands while the first was still falling. Now the
  // phase decides the pose and the chute's cell alike, and the real barrel is
  // simply the one in the stream that carries the rim: seven beats out it is
  // over his head, six down his arm, five at his side — and then the chute's.
  //
  // Stage 1 has no chute, so it never sees a grid or a due barrel: it runs on
  // the bar exactly as it always has, which keeps the plane's strike on pose 0
  // of beat 0.
  const due = frame.barrelBeat != null ? Math.round(frame.barrelBeat - frame.beatAbs) : null;
  const cued = due != null && due > LCD_CHUTE_BEATS && due <= LCD_CHUTE_LEAD_BEATS;
  const pose = finale ? wavePoses[lcdMod(frame.beatAbs, wavePoses.length)]
    : poses[lcdSwingPhase(frame)];
  const poseSet = finale ? wavePoses : poses;
  const build = LCD_GORILLA_BUILDS.has(frame.gorillaBuild) ? frame.gorillaBuild : LCD_GORILLA_BUILD;
  const tuft = LCD_GORILLA_TUFTS[frame.gorillaTuft in LCD_GORILLA_TUFTS ? frame.gorillaTuft : LCD_GORILLA_TUFT];
  if (build !== 'ovals') {
    lcdGorillaHardBody(ctx, cx, roof, poseSet, pose, ink, build);
  } else {
    // The slow GBC panel remembers the other three arm/barrel positions, but
    // only as a faint contour. The active pose below is proper vector anatomy,
    // not a pile of rectangular segments.
    const pit = LCD_GORILLA_PITS[frame.gorillaPit] || LCD_GORILLA_PITS[LCD_GORILLA_PIT];
    const armW = pit.arm || 7;
    for (const ghost of poseSet) {
      for (const arm of ghost.arms) gbcGorillaLimb(ctx, arm, LCD_MOTION_GHOST, armW - 2);
      if (ghost.barrel) gbcGorillaBarrel(ctx, ghost.barrel[0], ghost.barrel[1], true, false, frame.barrelShape);
    }
    // WHEN THE ARMS ARE A DIFFERENT TONE THEY GO IN FRONT. With one ink the
    // order is invisible — two fills of the same colour composite the same
    // either way — so the arms have always been painted first and read as a
    // darker patch where they cross. Give them a tone of their own and the
    // order starts to matter, and the arm belongs in front of the chest.
    if (!ink.limb) {
      for (const arm of pose.arms) {
        if (pit.outline) gbcGorillaLimb(ctx, arm, LCD_INK, armW + 2);
        gbcGorillaLimb(ctx, arm, ink.fur, armW, ink.core);
      }
    }

    // Broad shoulders, tapered belly, bent knees and planted feet create a
    // gorilla silhouette before any facial detail is read. Each is its own
    // fill ON PURPOSE: the fur is translucent print, so where an arm crosses
    // the head or a shoulder sits on the torso it goes a shade darker, and
    // that shade is what separates them. One fill for the lot was tried on
    // 3 Sep 2026 and the arms and head blended into one mass; only the TUFT
    // shares a fill, with the skull, below.
    const [sx, sy, srx, sry] = LCD_GORILLA_SHOULDER_SHAPES[frame.gorillaShoulderShape]
      || LCD_GORILLA_SHOULDER_SHAPES[LCD_GORILLA_SHOULDER_SHAPE] || pit.shoulder;
    const [[tx, ty], [bx, by]] = pit.torso;
    const bodyInk = ink.body || ink.fur;
    // THE SHOULDER BALL is what makes the armpit black. It is laid down before
    // the torso in the body's own ink, so the two stack a shade darker, and
    // with the arm under both the joint is three fills deep and nearly the raw
    // ink. `shoulder` gives the ball a WEAKER ink of its own — same hue, less
    // alpha — so it contributes less to that stack and its outer cap reads
    // lighter than the body. It stays where it is in the order: a translucent
    // ball drawn after the torso would darken the body rather than lighten it.
    const shoulderA = frame.gorillaShoulder != null ? frame.gorillaShoulder : null;
    const shoulderInk = ink.shoulder
      || `rgba(60,63,69,${shoulderA != null ? shoulderA : LCD_GORILLA_SHOULDER})`;
    gbcEllipse(ctx, cx - sx, roof + sy, srx, sry, shoulderInk);
    gbcEllipse(ctx, cx + sx, roof + sy, srx, sry, shoulderInk);
    ctx.beginPath();
    ctx.moveTo(cx - tx, roof + ty);
    ctx.quadraticCurveTo(cx - bx, roof + by, cx - 8, roof - 2);
    ctx.quadraticCurveTo(cx, roof + 1, cx + 8, roof - 2);
    ctx.quadraticCurveTo(cx + bx, roof + by, cx + tx, roof + ty);
    ctx.quadraticCurveTo(cx, roof - 25, cx - tx, roof + ty);
    ctx.closePath(); ctx.fillStyle = bodyInk; ctx.fill();
    gbcEllipse(ctx, cx - 7, roof - 5, 5, 7, bodyInk);
    gbcEllipse(ctx, cx + 7, roof - 5, 5, 7, bodyInk);
    gbcEllipse(ctx, cx - 9, roof - 1, 8, 3, bodyInk);
    gbcEllipse(ctx, cx + 9, roof - 1, 8, 3, bodyInk);
    // THE HEAD IS ONE PATH FILLED ONCE — ears, skull and tuft together. The
    // fur is translucent, so anything filled twice composites at 92% instead
    // of 72% and comes out a shade darker: that is what put a dark crescent
    // where each ear went under the skull, and what made the tuft read darker
    // than the head it grows out of. The TUFT is the exception and is left out
    // here, because it has to be drawn after the barrel he holds overhead —
    // The TUFT is in here too, so it is the same one fill as the skull — and
    // so it goes BEHIND the barrel he holds overhead, which is drawn last. It
    // was briefly drawn after the barrel instead; the points then sat on top
    // of the wood, and the barrel is the thing in front up there.
    const [ex, ey, erx, ery, eirx, eiry] = LCD_GORILLA_EARS[frame.gorillaEar] || LCD_GORILLA_EARS[LCD_GORILLA_EAR];
    const headInk = ink.head || ink.body || ink.fur;
    ctx.beginPath();
    ctx.moveTo(cx - ex + erx, roof + ey);
    ctx.ellipse(cx - ex, roof + ey, erx, ery, 0, 0, Math.PI * 2);
    ctx.moveTo(cx + ex + erx, roof + ey);
    ctx.ellipse(cx + ex, roof + ey, erx, ery, 0, 0, Math.PI * 2);
    ctx.moveTo(cx + 12, roof - 31);
    ctx.ellipse(cx, roof - 31, 12, 11, 0, 0, Math.PI * 2);
    if (tuft) tuft(ctx, cx, roof, frame);
    ctx.fillStyle = headInk; ctx.fill();
    if (pit.crease) {
      // Along the underside of the upper arm, starting where it leaves the
      // body: the arm's lower edge is half its width off its centre line, on
      // the side that faces down.
      ctx.strokeStyle = pit.crease === 'cut' ? LCD_PANEL_LIT : LCD_INK;
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (const [[ax, ay], [ex, ey]] of pose.arms) {
        const dx = ex - ax, dy = ey - ay, len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len, ny = dx / len;
        if (ny < 0) { nx = -nx; ny = -ny; }
        const px = ax + nx * (armW / 2 - 0.5), py = ay + ny * (armW / 2 - 0.5);
        ctx.beginPath();
        ctx.moveTo(px + (dx / len) * 1.5, py + (dy / len) * 1.5);
        ctx.lineTo(px + (dx / len) * 8, py + (dy / len) * 8);
        ctx.stroke();
      }
    }
    // Inner ears: a thinner rim when the lines are thin.
    const earIn = pit.thin ? [eirx + 0.75, eiry + 0.75] : [eirx, eiry];
    gbcEllipse(ctx, cx - ex, roof + ey, earIn[0], earIn[1], ink.skin);
    gbcEllipse(ctx, cx + ex, roof + ey, earIn[0], earIn[1], ink.skin);
    gbcEllipse(ctx, cx, roof - 29, 8.5, 7, ink.face);
    gbcEllipse(ctx, cx, roof - 25, 7, 4.5, ink.skin);
  }
  // WHAT HIS FACE DOES WHEN THE PLANE TAKES THE BARREL. Five reads of this were
  // drawn and compared; the one that won says it AROUND the head rather than on
  // it. His face barely moves — whites a shade wider, brows up one, the smile
  // shrunk to a small O — and the PANEL does the shouting: shock ticks
  // radiating off him on the 2px grid the billboards use, plus a sweat bead at
  // the temple. That is this toy's own idiom, and it beat the louder faces
  // (bulging eyes, a dropped jaw, vanished pupils) for the same reason it
  // exists: those four beats of a gorilla mugging on the skyline are four
  // beats the player is not reading the lane. He is back to the authored face
  // on the third beat, because the toy does not sulk.
  //
  // THE CRASH ALWAYS WINS. `frame.gorillaExpr` is the bake-off seam and it
  // cannot override the startle: whatever face is being tried, the two beats
  // the wreck is over his head are the wreck's.
  const thinLines = build === 'ovals' && !!(LCD_GORILLA_PITS[frame.gorillaPit] || LCD_GORILLA_PITS[LCD_GORILLA_PIT]).thin;
  // ON THE BEATS THE PLANE TAKES THE BARREL HE LOOKS AT THE WRECK, whatever
  // else was worth watching: it is directly over his head and it is his.
  const watching = burst >= 0 ? [poses[LCD_BARREL_UP_BEAT].barrel[0],
    poses[LCD_BARREL_UP_BEAT].barrel[1]] : lookAt;
  lcdGorillaFace(ctx, cx, roof, finale ? 'smile' : burst >= 0 ? 'startled' : lcdGorillaMood(frame, mood),
    frame.gorillaBrow, thinLines, lcdGazeTo(cx, roof - 31, watching, frame), frame.gorillaShock,
    frame.gorillaNostrils);

  if (build === 'ovals') {
    // Chest plane, collar shadow and sparse fur strokes.
    const frontPit = LCD_GORILLA_PITS[frame.gorillaPit] || LCD_GORILLA_PITS[LCD_GORILLA_PIT];
    const thin = !!frontPit.thin;
    const armWFront = frontPit.arm || 7;
    gbcEllipse(ctx, cx, roof - 11, 7, 8, ink.chest);
    ctx.strokeStyle = LCD_PRINT_SOFT; ctx.lineWidth = thin ? 0.75 : 1;
    ctx.beginPath(); ctx.moveTo(cx - 5, roof - 15); ctx.quadraticCurveTo(cx, roof - 12, cx + 5, roof - 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, roof - 11); ctx.quadraticCurveTo(cx, roof - 8, cx + 5, roof - 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 12, roof - 19); ctx.lineTo(cx - 8, roof - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 12, roof - 19); ctx.lineTo(cx + 8, roof - 16); ctx.stroke();

    // The front arms, if this palette has a limb tone of its own — after the
    // chest so they cross it, before the hands so a hand still caps its arm.
    if (ink.limb) for (const arm of pose.arms) gbcGorillaLimb(ctx, arm, ink.limb, armWFront);

    // Hands sit above the arm strokes, with individual finger cuts visible.
    for (const [hx, hy] of pose.hands) {
      gbcEllipse(ctx, hx, hy, 3.5, 3, ink.skin, ink.limb || ink.fur, thin ? 0.75 : 1);
      ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = thin ? 0.5 : 0.75;
      for (let finger = -1; finger <= 1; finger++) {
        ctx.beginPath(); ctx.moveTo(hx + finger * 1.5, hy - 1); ctx.lineTo(hx + finger * 1.5, hy + 1.5); ctx.stroke();
      }
    }
  }
  // The wreck stays where the barrel WAS — over his head, poses[0] — for both
  // beats of it. Drawing it at `pose.barrel` would walk the explosion down his
  // arm on the second beat, following a barrel that no longer exists.
  // The barrel in his HANDS is lit for the three beats he holds a real one,
  // and the chute takes the same lit barrel over on the next beat — see the
  // swing note above. `barrelBeat` is only ever set while one is genuinely due
  // (run.js updateBarrelArrivals), so he cannot cry wolf with it.
  if (!finale && burst >= 0) {
    lcdBarrelBurst(ctx, poses[LCD_BARREL_UP_BEAT].barrel[0],
      poses[LCD_BARREL_UP_BEAT].barrel[1], burst);
  } else if (!finale && pose.barrel) {
    // Lit on the three hold beats of a real one and on nothing else. The swing
    // is phased so those three beats ARE poses 0, 1 and 2 (lcdSwingPhase), so
    // no test on the pose is needed here. Flashing, see lcdRimOn.
    gbcGorillaBarrel(ctx, pose.barrel[0], pose.barrel[1], false,
      cued && lcdRimOn(frame), frame.barrelShape);
  }
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

// ---- the DONKEY KONG tower ---------------------------------------------
//
// Stage 1's landmark: a construction-tower BUILDING in the skyline — not a
// handheld — wearing the Game & Watch's playfield on its face. The big
// rooftop gorilla (the same painter stages 1 and 3 have always used) stands
// on its roof lobbing barrels; open girder floors zigzag down the facade with
// ladders between them, and a blocky moustachioed runner two floors down hops
// the barrels in time. It plays by this panel's one law — every cell steps on
// the heard musical beat and nothing else. A barrel lives in eight authored
// cells (four per girder); the off cells stay ghosted the way the gorilla's
// spare arms do, and the two lit cells walk the cycle a step per beat, so a
// throw lands top-left on the downbeat and the runner clears the last cell on
// beat four.

// ---- AND THE TWELVE THINGS ROLLING DOWN IT --------------------------------
//
// THE BASKETBALL PROBLEM, second half. The barrel Kong holds was fixed for it
// once already (see gbcGorillaBarrel): round, amber, with horizontal hoop
// curves reads as a basketball from three buildings away, and the fix was the
// real thing's own geometry. The twelve cells on the girders never got that
// pass, and at 9x6 they were the worse offender of the two — one dark band
// across a round orange body is a basketball and very little else.
//
// The bake-off that settled it ran two axes against each other and the finding
// was that THE SILHOUETTE IS DOING IT. Better marks on the ellipse — hoops
// pushed out to the ends, three plank seams running the way it rolls, which is
// the big barrel's own recipe — buy a better-decorated ball: at panel scale it
// still reads round. A darker wood on the ellipse changes almost nothing, so
// "it is the orange" was not the answer either. What works is taking the
// CIRCLE away: an octagon with a flat top and bottom stops being a ball on the
// first glance, and nothing else on this tower is round to argue with it.
//
// So the cell is all three at once — flat top and bottom, hoops at the ends,
// planks along it, in wood. The ghost cells carry the same octagon, because an
// off cell says "a barrel is also here" with the silhouette and nothing else,
// and a round ghost under a cask body gives the whole thing away.
// The body: 9 across, 7 tall, corners clipped a pixel and a half. A path so
// the fill and the ink outline are the same shape and the ghost can borrow it.
// THE CELL IS THE GORILLA'S BARREL AT HALF SIZE, and nothing else. The octagon
// that replaced the ellipse here beat it on one axis — it stopped being a ball
// — and lost on the one that matters more: it was not the barrel he is
// holding thirty pixels above it, and a chain of nine-pixel casks under a
// sixteen-pixel drum is two props, not one thing rolling. What actually made
// the ellipse a ball at this size was its INK, not its outline: a full-weight
// print rim plus two full-weight hoops on a body five pixels of wood wide is a
// dark disc with an orange glint, at any silhouette. lcdBarrelAt scales the
// line weights with the body, which is the whole of the fix.
//
// `size` is the dev seam the bake-off rides — see LCD_BARREL_CELL_STYLES;
// null is the cell the panel ships.
const LCD_BARREL_CELL = 'half';
const LCD_BARREL_CELLS = {
  half: [5, 4],
  snug: [4.5, 3.5],
  wide: [5.5, 4.5],
};
export const LCD_BARREL_CELL_STYLES = [
  { id: 'half', name: 'HALF', note: '10x8 — the held barrel at 5/8 scale, body 2px up on the old cask.' },
  { id: 'snug', name: 'SNUG', note: '9x7 — the old cask\'s own box, ellipse and scaled ink.' },
  { id: 'wide', name: 'WIDE', note: '11x9 — a pixel past half; closes the girder gap to a whisker.' },
];
function lcdMiniBarrel(ctx, bx, by, ghost = false, size = null, shape = null, spin = 0) {
  const [rx, ry] = LCD_BARREL_CELLS[size] || LCD_BARREL_CELLS[LCD_BARREL_CELL];
  lcdBarrelAt(ctx, bx, by, rx, ry, ghost ? 'outline' : false, false, shape, spin);
}

// The runner. Deliberately BLOCKY — rectangles, not curves — because he is a
// toy inside a toy, and he wears LORENZO'S colours (heroes.js lorenzo.pal):
// purple cap with the gold emblem, teal shirt, blue overalls, brown
// moustache. `mode` is one of:
//   { kind: 'run', stride, dir }  — walking a girder, facing dir (+1 right)
//   { kind: 'climb', arms }       — on a ladder from behind, arms alternating
//   { kind: 'hit' }               — clipped by a barrel: arms up, cap popped
//   { kind: 'jump', dir }         — the split, over a barrel
//
// FOUR THINGS CAME OUT OF THE BAKE-OFF THAT SETTLED HIM, and every one of them
// is two or three pixels — he is eight across and seventeen tall, on a tower on
// the far side of a street, so there was never a redesign available:
//
//   THE BIB. The two loose strap ticks are joined into an overall bib with a
//     gold button at each top corner, and the teal survives as a sleeve either
//     side of it. That is the whole difference between a man in a teal shirt
//     and a man in overalls, and it costs two pixels of gold.
//   BOOTS AND HANDS. A brown boot row under each leg, poking a pixel past the
//     toe, and a skin pixel where each arm ends. The jump had both already —
//     its toes are the whole of what says it is a split — and the other
//     fifteen cells were the ones going without.
//   THE CAP. Three rows of crown instead of two, and a brim a pixel longer.
//     The cap is what says which way he is walking at a tower's remove, and at
//     two rows it was the same height as its own brim.
//   THE STRIDE. Two walk cells rather than a step and a stand: the shipped pair
//     spent one frame of every two with the feet together and square, so half
//     the walk was a man standing still being carried along the girder. The
//     arm swings against the legs, forward and up on one cell, back and low on
//     the other.
//
// THE OUTLINE, 3 Sep 2026. He is the only thing on the tower with no ink at
// all: the gorilla is outlined, the barrel he dodges has a print rim, the
// girders and ladders are ink, and eight by seventeen pixels of flat teal and
// blue on the ochre wash sat on the panel like a sticker rather than a
// segment. The rim is a DILATED SILHOUETTE, never a stroke per rectangle —
// he is a stack of fillRects and stroking each puts lines through his waist
// and neck. Every cell is recorded once as an expanded rect into ONE path
// and filled once, so a translucent ink does not double where they overlap;
// then the colours go on top. `e` is in pack pixels: the pack draws at ZOOM 2,
// so 0.5 is one device pixel — "very fine" — and 1 is the weight the barrel
// bake-off showed turns a body this small into a dark disc.
//
// SETTLED 3 Sep 2026: PRINT ½ SHIPS. The sweep ran the alpha of that one
// device pixel from 48% to 100% — Peter's eye landed on 70, and 70 is the
// panel's own print (72%) to within anything a pixel can show, so he wears
// LCD_PRINT itself rather than a second ink two points off it: one ink on
// the panel, and the rim follows if the print is ever retuned. SOFT (48%)
// was liked first and lost to being barely there on the ochre; INK and 90
// turn the cap into a dark block; the whole-pixel guardrail did what the
// barrel bake-off said it would.
//
// `style` is the dev seam the bake-off rode — see LCD_RUNNER_OUTLINE_STYLES;
// null is the rim the panel ships.
const LCD_RUNNER_OUTLINE = 'print';
const LCD_RUNNER_OUTLINES = {
  none: null,
  print: [0.5, LCD_PRINT],
  print60: [0.5, 'rgba(60,63,69,0.6)'],
  print70: [0.5, 'rgba(60,63,69,0.7)'],
  print80: [0.5, 'rgba(60,63,69,0.8)'],
  print90: [0.5, 'rgba(60,63,69,0.9)'],
  ink: [0.5, LCD_INK],
  soft: [0.5, LCD_PRINT_SOFT],
  soft34: [0.75, LCD_PRINT_SOFT],
  heavy: [1, LCD_PRINT],
};
export const LCD_RUNNER_OUTLINE_STYLES = [
  { id: 'none', name: 'NONE', note: 'flat fills, no rim — how he was until 3 Sep 2026.' },
  { id: 'print', name: 'PRINT ½', note: 'SHIPS — one device pixel of the panel print (72% graphite).' },
  { id: 'print60', name: 'PRINT 60 ½', note: 'the same pixel at 60% — a notch softer than the print, a notch firmer than SOFT.' },
  { id: 'print70', name: 'PRINT 70 ½', note: 'the same pixel at 70%, a hair under the print.' },
  { id: 'print80', name: 'PRINT 80 ½', note: 'the same pixel at 80%.' },
  { id: 'print90', name: 'PRINT 90 ½', note: 'the same pixel at 90% — a step short of the full ink.' },
  { id: 'ink', name: 'INK ½', note: 'one device pixel of the full outline ink, as the gorilla and girders wear.' },
  { id: 'soft', name: 'SOFT ½', note: 'one device pixel of the soft print (48%) — barely there.' },
  { id: 'soft34', name: 'SOFT ¾', note: 'the soft print at three quarters of a pack pixel: a device pixel and a half, so the second pixel comes out at half strength.' },
  { id: 'heavy', name: 'PRINT 1', note: 'guardrail: a whole pack pixel of print, the weight that made the barrel a disc.' },
];
// Where he was last drawn, in panel coordinates — read by the gallery so a
// close-up can find him without knowing the journey. Dev only.
export const lcdRunnerProbe = { rx: 0, fy: 0, mode: null, barrels: [] };
function lcdRunnerFigure(ctx, rx, footY, mode, style = null) {
  const rim = LCD_RUNNER_OUTLINES[style] || LCD_RUNNER_OUTLINES[LCD_RUNNER_OUTLINE];
  if (rim) {
    const [e, ink] = rim;
    ctx.beginPath();
    const recorder = {
      set fillStyle(v) {},
      fillRect: (x, y, w, h) => ctx.rect(x - e, y - e, w + 2 * e, h + 2 * e),
    };
    lcdRunnerCells(recorder, rx, footY, mode, true);
    ctx.fillStyle = ink;
    ctx.fill();
  }
  lcdRunnerCells(ctx, rx, footY, mode, false);
}
// `silhouette` is the outline pass: the same cells, minus the things that are
// not him — the hit's sparks are flying off his body, and a spark with a dark
// rim is a dark speck.
function lcdRunnerCells(ctx, rx, footY, mode, silhouette) {
  let y = footY;
  // Mirror helper for the few side-specific cells when he faces left.
  const dir = mode.dir || 1;
  const M = (o, w) => (dir === 1 ? o : 1 - o - w);
  // A boot is the bottom row of a leg in Lorenzo's brown, poking one pixel
  // past the toe — the same trick the jump's split already uses, where the
  // toe is the whole of what says it is a split. Leaves the fill blue, which
  // is what every caller here wants next.
  const boot = (bx, bw, by = y - 1) => {
    ctx.fillStyle = '#5a3212';
    ctx.fillRect(dir === 1 ? bx : bx - 1, by, bw + 1, 1);
    ctx.fillStyle = '#22608c';
  };
  const hand = (hx, hy) => { ctx.fillStyle = '#f2c9a0'; ctx.fillRect(hx, hy, 1, 1); };
  if (mode.kind === 'climb') {
    ctx.fillStyle = '#22608c';
    ctx.fillRect(rx - 3, y - 4, 3, 4);
    ctx.fillRect(rx + 1, y - 4, 3, 4);
    boot(rx - 3, 3); boot(rx + 1, 3);
    ctx.fillRect(rx - 3, y - 7, 8, 3);
    ctx.fillStyle = '#2ea8a0';
    ctx.fillRect(rx - 3, y - 10, 8, 3);
    // One arm reaching, one at the rail, swapping as he climbs.
    const upX = mode.arms ? rx - 5 : rx + 4;
    const dnX = mode.arms ? rx + 4 : rx - 5;
    ctx.fillRect(upX, y - 13, 2, 4);
    ctx.fillRect(dnX, y - 9, 2, 4);
    // From behind the bib is a back panel between the straps — the same two
    // pixels the front pose spends, seen the other way round.
    ctx.fillStyle = '#22608c';
    ctx.fillRect(rx - 2, y - 9, 6, 2);
    // The reaching hand is at the top of its arm, the resting one at the
    // bottom of its.
    hand(upX + (mode.arms ? 0 : 1), y - 13);
    hand(dnX + (mode.arms ? 1 : 0), y - 6);
    // The back of his head is all cap.
    ctx.fillStyle = '#7b4bd0';
    ctx.fillRect(rx - 3, y - 16, 7, 6);
    return;
  }
  const hit = mode.kind === 'hit';
  const air = mode.kind === 'jump';
  if (air) y -= 11;
  ctx.fillStyle = '#22608c';
  if (air) {
    // A SPLIT, both legs out sideways at hip level with the feet ticking UP
    // at the tips — toes to the sky, the way a jumped leg reads. One cell, no
    // in-between — the toy has exactly two leg drawings, walking and this. Symmetric about the body's centre at rx+1.
    //
    // AT THE SAME SCALE AS THE REST OF HIM, which is the whole of what this
    // number is for. It was 7 a side: a 22px span on an 8px torso, so the one
    // frame in sixteen where he leaves the girder was nearly three times as
    // wide as the fifteen either side of it, and at a tower's remove it read as
    // a table rather than as a man. Four a side is a whole leg out and still
    // inside the silhouette the other fifteen cells established — a 16px span
    // on an 8px torso, half what the first draft asked for.
    const SPLIT = 4;
    ctx.fillRect(rx - 3 - SPLIT, y - 7, SPLIT, 3);
    ctx.fillRect(rx + 5, y - 7, SPLIT, 3);
    // The boots are Lorenzo's brown (heroes.js lorenzo.pal.f), not the
    // overalls' blue: at 2px a foot the same colour as the leg is just a
    // longer leg, and the toe is the whole of what says this is a split.
    ctx.fillStyle = '#5a3212';
    ctx.fillRect(rx - 3 - SPLIT, y - 9, 2, 2);
    ctx.fillRect(rx + 3 + SPLIT, y - 9, 2, 2);
    ctx.fillStyle = '#22608c';
  } else if (mode.kind === 'run' && mode.stride) {
    // The cell as authored: back foot planted, leading foot out in front and a
    // row off the steel.
    ctx.fillRect(rx + M(-4, 3), y - 4, 3, 4);
    ctx.fillRect(rx + M(1, 4), y - 3, 4, 3);
    boot(rx + M(-4, 3), 3); boot(rx + M(1, 4), 4);
  } else if (mode.kind === 'run') {
    // And the other half of the step, which is where he used to stand to
    // attention instead: the FRONT foot has landed and the back one is
    // trailing with the heel up. It stays welded to the hips — a lifted leg
    // that also leaves a row of daylight under the overalls is a detached blue
    // box at this size, not a leg.
    ctx.fillRect(rx + M(1, 3), y - 4, 3, 4);
    ctx.fillRect(rx + M(-5, 4), y - 4, 4, 3);
    boot(rx + M(1, 3), 3); boot(rx + M(-5, 4), 4, y - 2);
  } else {
    ctx.fillRect(rx - 3, y - 4, 3, 4);
    ctx.fillRect(rx + 1, y - 4, 3, 4);
    boot(rx - 3, 3); boot(rx + 1, 3);
  }
  ctx.fillRect(rx - 3, y - 7, 8, 3);
  ctx.fillStyle = '#2ea8a0';
  ctx.fillRect(rx - 3, y - 10, 8, 3);
  if (hit) {
    ctx.fillRect(rx - 5, y - 13, 2, 4);
    ctx.fillRect(rx + 4, y - 13, 2, 4);
    hand(rx - 5, y - 13); hand(rx + 5, y - 13);
  } else if (mode.kind === 'run') {
    // The arm swings against the legs: forward and up on the striding cell,
    // back and low on the other one.
    const ax = rx + M(mode.stride ? 4 : -5, 2);
    const ay = mode.stride ? y - 11 : y - 9;
    ctx.fillRect(ax, ay, 2, 3);
    hand(dir === 1 ? ax + 1 : ax, mode.stride ? ay : ay + 2);
  } else {
    const ax = rx + M(3, 2);
    ctx.fillRect(ax, y - 10, 2, 3);
    hand(dir === 1 ? ax + 1 : ax, y - 8);
  }
  // The bib, and the buttons on it.
  ctx.fillStyle = '#22608c';
  ctx.fillRect(rx - 1, y - 9, 4, 2);
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(rx - 1, y - 9, 1, 1);
  ctx.fillRect(rx + 2, y - 9, 1, 1);
  ctx.fillStyle = '#f2c9a0';
  ctx.fillRect(rx - 2, y - 14, 6, 4);
  ctx.fillStyle = '#5a3212';
  ctx.fillRect(rx + M(1, 3), y - 11, 3, 1);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(rx + M(1, 1), y - 13, 1, 1);
  ctx.fillStyle = '#7b4bd0';
  const capLift = hit ? 3 : 0;
  const capTop = y - 17 - capLift;
  ctx.fillRect(rx - 3, capTop, 7, 3);
  if (!hit) ctx.fillRect(rx + M(3, 4), y - 15, 4, 1);
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(rx - 1, capTop, 1, 1);
  if (hit && !silhouette) {
    // Two gold sparks where his composure was.
    ctx.fillRect(rx - 5, y - 17, 2, 2);
    ctx.fillRect(rx + 5, y - 16, 2, 2);
  }
}

// `burst` rides through to the gorilla on his roof — see lcdBurstPhase. The
// tower is the only thing between the scene, which knows where the plane is,
// and the gorilla, who is holding what it hits. `vanished` is the girder cell
// that hit takes out of the chain — see lcdVanishedBarrelCell.
function lcdGameWatch(ctx, spec, frame, burst = -1, vanished = -1,
  planeAt = null) {
  const [x, w, h] = spec;
  const grid = lcdGridFor(spec);
  const top = GROUND_Y - h;
  const span = w - 10;
  const FLOOR_PITCH = 32;
  const KONG_LEVELS = 3;
  // The portrait tower is a building still going up: its lower facade has
  // ordinary ghost windows, while the three upper floors are the open Kong
  // playfield. The plumber appears on that boundary, so the windows stop below
  // him and the girders above read as the special levels built on top.
  const constructionWindowTop = spec?.[4] === 'portrait-grid'
    ? top + FLOOR_PITCH * KONG_LEVELS : null;
  // THE LADDERS ARE ON THE PANEL'S OWN GRID. Everything else on this screen is
  // laid out in graph-paper cells (LCD_U) and the ladders were not: seven
  // pixels wide, at whatever x the tower's own offsets happened to give, so
  // they cut across the lattice instead of sitting in it. Three cells wide,
  // snapped to the grid, and the rungs on it too — which also gives the runner
  // a rail either side of him instead of one under each hand.
  const LADDER_W = grid.unit * 3;
  const snapU = (v) => Math.round(v / grid.unit) * grid.unit;
  const ladA = snapU(x + 26), ladB = snapU(x + 56), ladRoof = snapU(x + 70);
  // The old roof ladder offset was authored for the landscape tower's wider
  // panel. In portrait the narrower Kong facade uses a larger grid, so x+70
  // puts the ladder rails beyond the right wall. Keep landscape byte-for-byte
  // identical, but fit the portrait ladder inside its own facade and grid.
  const roofLadderInset = spec?.[4] === 'portrait-grid'
    ? Math.max(grid.unit, w - LADDER_W - grid.unit) : 70;
  const portraitLadRoof = spec?.[4] === 'portrait-grid'
    ? snapU(x + roofLadderInset) : ladRoof;
  const ladMid = (lx) => lx + (LADDER_W - 1) / 2;
  // The facade obeys every rule the other buildings do: a colour plane, a
  // print outline running to the bottom of the display (so a pit in front of
  // it exposes real tower, not a void), a cornice, corner masonry, and — on
  // portrait — a lower windowed section that stops below the Kong playfield.
  ctx.fillStyle = 'rgba(211,139,66,0.26)';
  ctx.fillRect(x + 1, top + 1, w - 1, H - top - 1);
  if (constructionWindowTop !== null) {
    lcdWindowGridBase(ctx, spec, null, constructionWindowTop);
  }
  ctx.strokeStyle = LCD_PRINT;
  // Match the portrait facade print weight to its larger window grid. The
  // landscape grid remains one pixel, so this is also a no-op for the authored
  // landscape tower.
  ctx.lineWidth = grid.lineW;
  // THE ROOF IS OPEN WHERE THE TOP LADDER COMES THROUGH. In the arcade the
  // climb ends by going UP through the girders, not by stopping under a solid
  // parapet — and this tower already draws that last ladder from the roof down
  // to the top floor, past the spot where the barrel always gets him. It ran
  // into a sealed line, so the way up was drawn and then contradicted one
  // pixel later. There is nothing above it to reach (no Pauline on this
  // panel), which is the joke: the opening is right there and he never takes
  // it. The bottom edge is off the display, as it always was, so only the
  // left, top and right are drawn.
  //
  // THE OPENING IS THE SPACE BETWEEN THE RAILS, not the ladder's whole width.
  // Cut at the ladder's outer edges the roof stopped a pixel short of the left
  // rail and restarted half a pixel into the right one, so the climb arrived
  // at a hole it did not touch on either side — a ladder drawn near the roof
  // rather than through it. The rails stand in the two columns
  // portraitLadRoof and portraitLadRoof + LADDER_W - 1, so the roof line now
  // runs across BOTH of them and stops between: whole-pixel endpoints, one
  // dark pixel directly over each rail's top, and the grid-sized daylight the
  // man would climb through.
  const roofGap = [portraitLadRoof + 1, portraitLadRoof + LADDER_W - 1];
  ctx.beginPath();
  ctx.moveTo(x + 0.5, H + 0.5);
  ctx.lineTo(x + 0.5, top + 0.5);
  ctx.lineTo(roofGap[0], top + 0.5);
  ctx.moveTo(roofGap[1], top + 0.5);
  ctx.lineTo(x + w + 0.5, top + 0.5);
  ctx.lineTo(x + w + 0.5, H + 0.5);
  ctx.stroke();
  // No cornice, no corner masonry, no rivets: girders and ladders ARE the
  // tower, and an inner box drawn around them read as a stage with a frame.
  ctx.fillStyle = LCD_PRINT_SOFT;
  const detailBottom = GROUND_Y - 27;

  // GIRDER FLOORS zigzagging down the WHOLE face, each tipped 4px the other
  // way — the Game & Watch playfield worn as architecture. They run past the
  // lane band and off the bottom of the display the same way every other
  // facade's window rows do: the road apron masks that stretch, and a pit
  // opening in front of the tower exposes girders, not blank wall. The girder
  // y at a given x is shared with the barrel cells and the runner, so
  // everything stands ON the steel rather than near it.
  //
  // THE STACK STARTS ONE FULL PITCH BELOW THE ROOF, and the roof ladder is
  // therefore the same length as every other ladder on the tower. It began 28
  // down instead — four short — and that four is what put a girder on the road.
  //
  // A tower 113 tall (top 119) laid four floors at 147/179/211/243 with the
  // last one under the apron, which is the shape this face is drawn for: three
  // storeys of steel and a fourth the road hides, there only so a pit exposes
  // girders rather than blank wall. When the tower grew twelve with the beat
  // ribbon's sky, the same 28 put five floors at 135/167/199/231/263 — and 231
  // is one pixel above GROUND_Y, so the fourth girder surfaced through the road
  // as a sliver at its high end. Peter caught it, not a test.
  //
  // At one pitch the four floors land at 139/171/203/235: the same three
  // storeys and the same hidden fourth, three clear under the road. Both
  // numbers were arbitrary; this one at least says something — every climb on
  // this tower is one floor — and tests/lcd-background.js now asserts no steel
  // breaks the road surface, so the next height change fails loudly instead of
  // growing another sliver.
  const floors = [];
  for (let fy = top + FLOOR_PITCH; fy < H - 6; fy += FLOOR_PITCH) floors.push(fy);
  // Slope parity is set by the RUNNER's route: he travels right on even
  // floors and left on odd ones, and every girder RISES the way he walks —
  // uphill all the way, like the arcade. The barrels roll the other way,
  // downhill, which is what makes meeting one a jump.
  const floorY = (i, cx) => {
    const t = (cx - x - 5) / span;
    return floors[i] + 4 * (i % 2 === 0 ? 1 - t : t);
  };
  // LADDERS FIRST, GIRDERS OVER THEM. A ladder's rails run a pixel INTO the
  // steel at both ends and the girder is painted on top, so the joint is
  // clean by construction — no gap, no soft rail showing over the ink —
  // whatever fraction of a pixel the sloped girder's edge falls on there.
  // One ladder between each pair of floors, swapping sides as they descend.
  ctx.fillStyle = LCD_PRINT_SOFT;
  const ladder = (lx, t, b) => {
    ctx.fillRect(lx, t, grid.lineW, b - t);
    ctx.fillRect(lx + LADDER_W - grid.lineW, t, grid.lineW, b - t);
    // Rungs every two cells, on the grid's own rows rather than a fixed step
    // from a sloped girder — so every ladder's rungs line up with every other
    // ladder's, and with the lattice behind them. The series starts at the
    // FIRST grid row the rails reach rather than a cell into them: on the roof
    // ladder that puts a rung right under the ceiling, so the climb visibly
    // meets the opening instead of starting three pixels below it. Under a
    // girder the same rule lands the first rung just clear of the steel, which
    // is where it already was.
    for (let ry = snapU(t + 1); ry < b - 2; ry += grid.unit * 2) {
      ctx.fillRect(lx + grid.lineW, ry, LADDER_W - grid.lineW * 2, grid.lineW);
    }
  };
  for (let i = 0; i + 1 < floors.length; i++) {
    const lx = i % 2 === 0 ? ladA : ladB;
    ladder(lx, Math.round(floorY(i, lx)), Math.round(floorY(i + 1, lx)) + 1);
  }
  // And one ladder from the top girder to the ROOF itself — past the spot
  // where the barrel always gets him, so the way up visibly exists and he
  // visibly never takes it. That is the whole tragedy of the toy.
  ladder(portraitLadRoof, top + 1,
    Math.round(floorY(0, ladMid(portraitLadRoof))) + 1);
  // THE GIRDERS, bolted at the HIGH end and open at the low one, like the
  // arcade's: each runs from the wall it rises toward and stops a barrel's
  // width short of the other, which is the gap the barrel drops through to
  // the floor below. Even floors rise to the right, odd to the left (see
  // floorY), so the wall alternates. The runner and the barrels read floorY
  // as they always did.
  const GIRDER_GAP = 12;
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 2;
  for (let i = 0; i < floors.length; i++) {
    const x0 = i % 2 === 0 ? x + 1 + GIRDER_GAP : x + 1;
    const x1 = i % 2 === 0 ? x + w - 1 : x + w - 1 - GIRDER_GAP;
    lcdStrokePath(ctx, [[x0, floorY(i, x0)], [x1, floorY(i, x1)]]);
  }
  ctx.lineWidth = 1;

  // The barrel's sixteen authored cells snake down the top three floors —
  // right, then left past the runner, then right again — plus the four it
  // occupies between them, so a throw rides the tower ALL the way down without
  // ever jumping a gap. Ghost the whole path, light the four cells the cycle
  // is on (one per floor and one in the air, four beats apart). Two ghost-only
  // cells on the fourth floor carry the path below the road, where only a pit
  // ever shows them.
  //
  // AND EVERY CELL IS TURNED FURTHER THAN THE ONE BEFORE IT. Twelve barrels
  // down a tower at the same attitude is twelve barrels SLIDING; the roll is
  // the only thing that says a gorilla threw them. The angle accumulates along
  // the chain — one step per cell — and its SIGN is the direction of travel on
  // that girder, so a barrel heading left turns anticlockwise and one heading
  // right turns clockwise, which is the only way round a rolling thing can
  // turn. It carries across the turn at the end of a girder too, because the
  // barrel that drops to the floor below is the same barrel still spinning.
  // THE FALLS HUG THE WALL, because that is where the girder stops. Even
  // floors are bolted at the right and open at the left, odd ones the other
  // way (GIRDER_GAP), so the barrel leaves the steel into the gap between the
  // girder's open end and the wall — and a barrel falling down the middle of
  // the room was falling from nowhere.
  const fallLeft = x + Math.round((1 + GIRDER_GAP) / 2);
  const fallRight = x + w - Math.round((1 + GIRDER_GAP) / 2);
  // THE CHAIN IN TRUE PATH ORDER, one cell per beat of the descent: in at the
  // roof ladder, along the top girder, off its open end, along the next, and
  // so on. The lit set is the beat and every fourth cell after it, so the four
  // barrels on screen are ONE barrel four beats apart — which only reads if
  // the array is the path. Ordered any other way the falls arrive after the
  // barrel they belong to has already landed and rolled on.
  //
  // AND THE SPIN GOES WITH THE TRAVEL. A cell's attitude is the one before it
  // plus a step, turned the way that girder runs — anticlockwise heading left,
  // clockwise heading right — carried across each fall, because the barrel
  // that drops is the same barrel still turning.
  // AND IT TURNS A HALF-TURN FURTHER THAN IT LOOKS. The readable step is
  // LCD_BARREL_ROLL, about thirty degrees a cell, and on its own that implies
  // a barrel twenty-nine pixels across — seven times the real one, which is a
  // barrel SLIDING down the steel with a slow wobble.
  //
  // The honest number cannot be used either, and not for the usual reason. A
  // ten-by-eight barrel tumbling covers its own perimeter, about thirty-two
  // pixels, in one revolution, and the cells are sixteen pixels apart — so an
  // honest cell-to-cell turn is EXACTLY A HALF TURN. The silhouette is
  // symmetric about both axes, so a half turn is the one angle that looks
  // identical to no turn at all: drawn honestly the chain reads as a barrel
  // sliding, which is precisely what the roll exists to prevent.
  //
  // So: a half turn PLUS the readable step. The silhouette steps thirty
  // degrees a cell exactly as before, which is what the eye tracks, and the
  // barrel underneath it has genuinely turned 212 degrees — thirty off the
  // truth instead of a hundred and fifty. What that buys is the lit stave and
  // the hoops going round WITH it, over the top and under the bottom, which is
  // the thing that actually says rolling rather than rocking.
  const TOWER_ROLL = Math.PI + LCD_BARREL_ROLL;
  let spinAcc = 0;
  const spun = (dir) => (spinAcc += dir * TOWER_ROLL);
  const onFloor = (cx, floor, dir) =>
    [cx, Math.round(floorY(floor, cx) - 5), spun(dir)];
  const FALL = 16;             // half the 32px floor pitch: clear of both girders
  const fell = (cx, floor, dir) =>
    [cx, Math.round(floorY(floor, cx) - 5) + FALL, spun(dir)];
  const path = [
    // Down the roof ladder, high under the eaves — it was halfway to the top
    // girder and read as a second barrel already on it. It enters with no
    // attitude yet: it has only just left his hands.
    [ladMid(portraitLadRoof), top + 9, 0],
    onFloor(x + 70, 0, -1), onFloor(x + 54, 0, -1),
    onFloor(x + 38, 0, -1), onFloor(x + 22, 0, -1),
    fell(fallLeft, 0, -1),
    onFloor(x + 18, 1, 1), onFloor(x + 34, 1, 1),
    onFloor(x + 50, 1, 1), onFloor(x + 66, 1, 1),
    fell(fallRight, 1, 1),
    onFloor(x + 68, 2, -1), onFloor(x + 52, 2, -1),
    onFloor(x + 36, 2, -1), onFloor(x + 20, 2, -1),
    fell(fallLeft, 2, -1),
  ];
  // AND THE PATH IS PHASED AGAINST HIS ARM. He raises the barrel on beat one,
  // swings it down across two and three, and on beat FOUR his fist is at the
  // mouth of the tower with nothing in it — that is the release (see the pose
  // table in lcdRooftopGorilla). So beat four is the beat the barrel has to be
  // at the TOP of the ladder, not the beat after it, and not, as the unphased
  // array had it, the beat a barrel reaches the bottom of a girder. Rotating
  // the path by three puts cell zero on that beat and every cell after it
  // follows down the tower, high to low, one per beat.
  //
  // The top girder's schedule is unchanged by the rotation — it comes out at
  // x+70, x+54, x+38, x+22 on beats one to four exactly as it always did, so
  // the hit and the bail the runner is authored around still land on the beats
  // they were written for. Floors two and three shift, and his jumps move with
  // them; see the journey below.
  const THROW_PHASE = 3;
  const cells = path.map((_, i) => path[(i + path.length - THROW_PHASE) % path.length]);
  // Two more belong to the fourth floor, which exists only where a pit opens;
  // everything above it is the authored sixteen-cell cycle.
  if (floors.length > 3) {
    cells.push(onFloor(x + 24, 3, 1), onFloor(x + 44, 3, 1));
  }
  const live = cells;
  for (const [bx, by, spin] of live) {
    lcdMiniBarrel(ctx, bx, by, true, frame.barrelCell, frame.barrelShape, spin);
  }
  lcdRunnerProbe.barrels = [];
  for (let p = frame.beat4; p < 16; p += 4) {
    // The exploded throw leaves a gap in the chain rather than a ghost: a
    // ghost cell means "a position this thing also occupies", and this barrel
    // does not exist to occupy one.
    if (p === vanished) continue;
    lcdRunnerProbe.barrels.push([cells[p][0], cells[p][1]]);
    lcdMiniBarrel(ctx, cells[p][0], cells[p][1], false, frame.barrelCell, frame.barrelShape, cells[p][2]);
  }

  // THE RUNNER'S WHOLE CLIMB, one cell per heard beat — and it takes EIGHT
  // bars, not four, because a toy that does exactly the same sixteen cells
  // forever is a clock rather than a character. The first loop is the route he
  // has always run: along the bottom girder, up the right ladder, back along
  // the middle one, up the left ladder, and out along the top, where the live
  // barrel rolling past x+56 clips him (cap popped, sparks) and the empty cell
  // after it says "respawning". The second loop climbs the same zigzag and
  // then DOES NOT WALK INTO IT: he scrambles back the way he came as the top
  // girder's barrel sweeps through, and it goes past him. Same barrel cells,
  // same beats, two endings — so the hit is an event again instead of a tick.
  //
  // Every barrel here is the authored one on that beat (cells[], above): a
  // barrel is at x+70, x+54, x+38, x+22 on the top girder on beats 0-3 of any
  // bar, and each cell below is placed against the one that is actually there.
  //
  // `mood` is what the gorilla wears on that beat — the only thing on this
  // panel he reacts to. See lcdGorillaMood.
  const climbY = (lx, topF, botF, frac) => {
    const a = floorY(topF, ladMid(lx)), b2 = floorY(botF, ladMid(lx));
    return b2 - (b2 - a) * frac;
  };
  const at = (floor, rx, m, mood) => ({ rx, fy: floorY(floor, rx), m, mood });
  const onLadder = (lad, topF, botF, frac, arms, mood) => ({
    rx: ladMid(lad), fy: climbY(lad, topF, botF, frac), m: { kind: 'climb', arms }, mood,
  });
  // Coming up from the street: the ladder below the bottom girder, a third of
  // the way out of it. It was six tenths, which put his head level with the
  // steel — and on the beat he arrives there is now a barrel at x+36 on that
  // floor, so he surfaced straight into it. A third leaves the barrel passing
  // over his head, which is the picture anyway. floors[] is solved from the
  // building's height, so a tower
  // ever too short to have a floor under the road falls back to the standing
  // start this replaced rather than climbing a ladder that isn't there.
  const fromStreet = (arms) => (floors.length > 3
    ? onLadder(ladA, 2, 3, 0.35, arms)
    : at(2, x + 16, { kind: 'run', stride: arms, dir: 1 }));
  const journey = [
    // HE COMES UP OUT OF THE STREET, and that is where every run of the tower
    // starts. He used to be simply THERE on the bottom girder on the downbeat,
    // which is the one moment of the loop that has to say "again": a figure
    // that appears is a figure being redrawn, and a figure climbing out of the
    // bottom ladder is the same man having walked back round. The tower already
    // has the ladder — the girders run past the lane band and off the bottom of
    // the display, and this is the pair of rails below the bottom floor — so
    // the trip he makes off-panel is the one the panel implies anyway.
    fromStreet(0),
    at(2, x + 34, { kind: 'run', stride: 1, dir: 1 }),
    at(2, x + 43, { kind: 'run', stride: 0, dir: 1 }),
    // THE JUMP MOVED TO BEAT FOUR. This floor's barrel used to be at x+36 on
    // beat three and is at x+52 on beat four now that the chain is phased to
    // his throw — so the beat he must be airborne on moved with it, and he
    // clears it at the far end of the girder instead of the middle. It is
    // under him exactly: x+52 against x+52.
    at(2, x + 52, { kind: 'jump', dir: 1 }),
    onLadder(ladB, 1, 2, 0.38, 0),
    onLadder(ladB, 1, 2, 0.8, 1),
    at(1, x + 56, { kind: 'run', stride: 1, dir: -1 }),
    // Head-on, and a beat later than it used to be: this floor runs the other
    // way to his walk, so he and the barrel close on each other and meet where
    // its cell is x+50 — which is beat four of the bar now, not beat three.
    at(1, x + 48, { kind: 'jump', dir: -1 }),
    at(1, x + 38, { kind: 'run', stride: 0, dir: -1 }),
    // x+32, not x+30: the barrel coming the other way along this floor is at
    // x+18 on this beat, and at x+30 his back foot touched its rim. Two pixels
    // of daylight, and the next beat he is on the ladder as it rolls through.
    at(1, x + 32, { kind: 'run', stride: 1, dir: -1 }),
    onLadder(ladA, 0, 1, 0.38, 0),
    // HE WAITS ON THE LADDER. The top girder's barrel is at x+22 on this beat,
    // which is directly over this ladder's head, and at eight tenths up his
    // cap and shoulder were inside it. The arcade move is the only move: hold
    // a rung below the steel until it has gone past. 0.41 is the highest rung
    // that keeps two pixels between his cap and the barrel's underside; the
    // next beat he is up and through behind it. A rung on from beat 10, other
    // arm — he creeps, he does not climb.
    onLadder(ladA, 0, 1, 0.41, 1),
    // Out onto the gorilla's own girder, with a barrel already sweeping down
    // it from the right — which is the whole of why his face falls up here.
    at(0, x + 32, { kind: 'run', stride: 0, dir: 1 }, 'sad'),
    // x+40, not x+44: this is the beat before the hit, with the barrel that
    // gets him at x+54 and rolling at him, and at x+44 his forward hand was
    // already two pixels inside it — the collision a beat early. Two pixels
    // of daylight here, and the next beat the barrel is at x+38 and on him.
    //
    // EVERY OTHER BEAT KEEPS TWO PIXELS between him and any solid barrel —
    // tests/lcd-background.js walks all 32 and fails on less. The hit is the
    // one overlap, and it is the point.
    at(0, x + 40, { kind: 'run', stride: 1, dir: 1 }, 'sad'),
    // The one he doesn't clear: the live cell rolls through x+38 right as he
    // arrives beside it. He knew — see the smirk.
    { rx: x + 44, fy: floorY(0, x + 44), m: { kind: 'hit' }, mood: 'sly' },
    null,
    // ---- and the loop where he lives ---------------------------------------
    // Same climb out of the street, opposite arm — the two loops read as the
    // same man twice rather than as one animation played again.
    fromStreet(1),
    at(2, x + 34, { kind: 'run', stride: 0, dir: 1 }),
    at(2, x + 43, { kind: 'run', stride: 1, dir: 1 }),
    at(2, x + 52, { kind: 'jump', dir: 1 }),
    onLadder(ladB, 1, 2, 0.38, 1),
    onLadder(ladB, 1, 2, 0.8, 0),
    at(1, x + 56, { kind: 'run', stride: 0, dir: -1 }),
    at(1, x + 48, { kind: 'jump', dir: -1 }),
    at(1, x + 38, { kind: 'run', stride: 1, dir: -1 }),
    at(1, x + 32, { kind: 'run', stride: 0, dir: -1 }),
    onLadder(ladA, 0, 1, 0.38, 1),
    onLadder(ladA, 0, 1, 0.41, 0),
    at(0, x + 32, { kind: 'run', stride: 1, dir: 1 }, 'sad'),
    at(0, x + 40, { kind: 'run', stride: 0, dir: 1 }, 'sad'),
    // THE BACK-OFF, and it is a back-off DOWN. Backing along the girder buys
    // him nothing — every barrel on this panel comes at him head-on, and the
    // top one sweeps the whole floor from x+70 to x+22 in four beats, so there
    // is no cell on it to retreat to. The ladder he came up is the only way
    // off the steel: he bails onto it and drops below the girder line while
    // the barrel rolls through the cell he was standing in.
    // 0.45, not 0.6: at six tenths his reaching hand was in the corner of the
    // barrel he is bailing from. Now he hangs two pixels under it.
    onLadder(ladA, 0, 1, 0.45, 0, 'sad'),
    // Past him and rolling away to the left. He climbs back out, looking after
    // it, and the next downbeat starts him at the bottom of the tower.
    // x+36, not x+34: the barrel that missed him is at x+22 on this beat and
    // at x+34 his heel was on its rim. Two pixels, and he is looking after it.
    at(0, x + 36, { kind: 'run', stride: 0, dir: -1 }, 'neutral'),
  ];
  // EIGHT bars of journey against a four-bar `step`, so this counts its own.
  const leg = journey[lcdMod(frame.bar * 4 + frame.beat4, journey.length)];
  if (leg) {
    lcdRunnerProbe.rx = leg.rx; lcdRunnerProbe.fy = Math.round(leg.fy); lcdRunnerProbe.mode = leg.m;
    lcdRunnerFigure(ctx, leg.rx, Math.round(leg.fy), leg.m, frame.runnerOutline);
  }

  // And the thrower himself: the SAME big gorilla painter the other scenes
  // put on a rooftop, standing on this one. His authored poses land the
  // downbeat throw right where the top girder's first cell lights.
  // WHAT HE IS WATCHING FROM UP THERE, in order of how much it is his problem.
  // The little man on his OWN girder outranks everything — that is the one
  // thing on this panel he is doing something about, and his face already
  // falls when it happens (leg.mood), so the eyes going with it is the same
  // sentence finished. Then the aircraft, but only once it is genuinely near:
  // eyes that track a plane across the whole sky are eyes that never rest.
  // Otherwise the wander.
  const onHisGirder = leg && floors.length > 1 && leg.fy < floors[1];
  const planeNear = planeAt && Math.abs(planeAt[0] - Math.round(x + w / 2)) < 70;
  const watch = onHisGirder ? [leg.rx, leg.fy] : planeNear ? planeAt : null;
  lcdRooftopGorilla(ctx, [x, w, h], frame, burst, leg?.mood || null, watch);
}

/**
 * THE WHOLE PANEL, sky and all — the one entry point anything outside a run
 * uses to draw this city.
 *
 * It exists so tooling and other callers can use the same city painter as the
 * production background without maintaining a second copy that would drift
 * the first time a billboard moved.
 *
 * `scene` is the same optional context bg() takes — { stageIndex, beat,
 * progress, audio } — and every field is optional.
 */
// Direct oracle for visual tooling and cache parity tests; no global-mode mutation.
export function drawLCDPanelUncached(ctx, scene, settings = {}) {
  const sky = settings.skyMeter !== false;
  const context = settings.backgroundContext || null;
  const { frame, art } = prepareLCDPanel(scene, sky, false, context);
  paintLCDCity(ctx, frame, sky, context, art);
}

export function drawLCDPanel(ctx, scene, settings = {}) {
  // `skyMeter` on: an authoring or audition caller wants the analyser in the sky.
  drawLCDCity(ctx, scene, settings.skyMeter !== false, settings.backgroundContext || null);
}

/** The screen treatment on its own: the soft-light wash and the cell lattice. */
export function lcdScreenFinish(ctx, t = 0) {
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(168,198,108,0.22)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  bakedFill(ctx, 'gbcCells', 3, 3, (c) => {
    c.fillStyle = 'rgba(50,53,58,0.11)';
    c.fillRect(2, 0, 1, 3);
    c.fillRect(0, 2, 3, 1);
  });
  ctx.fillStyle = `rgba(255,244,180,${0.008 + Math.sin(t * 6.3) * 0.008})`;
  ctx.fillRect(0, 0, W, H);
}

// A building whose roof carries scene furniture — the gorilla, a billboard, the
// transmitter — skips its own crown so the two never interleave. Static: it
// reads the authored scene and never the frame, which is what lets the crowns
// and the roof caps live in the baked layer alongside the facades.
// The stages whose own rooftop kit stands on every plain roof — stage 2's
// equalizer bank. Listed rather than inferred because it is a fact about the
// authored panel, not about the painters: a stage could hang its kit on two
// roofs out of eight and still want the other six crowned.
const LCD_STAGE_ROOF_KIT = new Set([2]);
function lcdCrowned(art, i) {
  return i === art.rooftopGorilla || i === art.transmitter
    || (art.bareRoofs || []).includes(i)
    || (art.billboards || []).some(([bi]) => bi === i);
}

// EVERYTHING ON THIS PANEL A BEAT CANNOT MOVE. Painted once into the baked city
// layer per (stage, phase) — see bakedCity — and blitted every frame after.
// Carries no sky: the train runs behind the skyline and has to be painted
// between the two.
function paintLCDStaticCity(ctx, stageIndex, art = LCD_CITY_SCENES[stageIndex]) {
  ctx.lineWidth = 1;
  const clockBay = lcdClockBay(art);
  for (let i = 0; i < art.buildings.length; i++) {
    const building = art.buildings[i];
    const [x, w, h] = building;
    const crowned = lcdCrowned(art, i);
    // One faint wash, the same on every wall: enough to stand the facade off
    // the sky, and no more. The ink does the drawing.
    ctx.fillStyle = LCD_FACADE_WASH;
    const top = GROUND_Y - h;
    ctx.fillRect(x + 1, top + 1, w - 1, H - top - 1);
    // A STAGE THAT HANGS KIT ON EVERY PLAIN ROOF LEAVES NO PLAIN ROOF. Stage 2
    // puts an equalizer bank on every building a billboard is not already
    // standing on, and every crown this skyline uses — speaker's parapet,
    // deco's stack, music-hall's box, spire's pediment and finial — is centred
    // and between 5 and 21 tall, which is to say all of them were drawn INSIDE
    // the bank's 37px cabinet. On the spires it was unreadable: the pediment
    // and its mast fanned out beneath the lit cells and the pair read as one
    // object, a meter on a launch gantry, which is nothing this city contains.
    // `crowned` already means the roof is spoken for, and a meter speaks for a
    // roof as surely as a billboard does. The roof carries one thing.
    const bay = clockBay && clockBay.index === i ? clockBay : null;
    gbcBuildingLineArt(ctx, building, crowned || LCD_STAGE_ROOF_KIT.has(stageIndex), bay);
    lcdWindowGridBase(ctx, building, bay);
    // The roof cap's plate is static; only its three lamps carry the offbeat,
    // and those stay live below.
    if (bay) lcdClockCase(ctx, bay);
    if (stageIndex === 3 && !crowned) {
      ctx.fillStyle = LCD_WINDOW_GHOST;
      ctx.fillRect(x + 5, GROUND_Y - h - 5, Math.max(5, w - 10), 3);
    }
  }
  // THE RAIL IS NOT HERE. It was — masonry that never moves belongs in the
  // bake — but the bake is blitted one building-wide slice at a time while the
  // city walks on, and a rail inside those slices arrived in eight pieces,
  // each riding its own building down. It is drawn in drawLCDCity instead,
  // whole, straight after this layer: the same picture once the skyline is
  // standing, and one unbroken girder from the first beat.
}

// ---- the opening bars -----------------------------------------------------
//
// THE CITY IS NOT THERE WHEN THE SONG STARTS, and it walks on in reading order.
//
// This is the one animation on the panel that happens once. Everything else
// here loops — the chase comes round every ten bars, the chute runs whenever a
// barrel is coming, the clouds wrap — because a panel is a picture that repeats.
// The assembly is the exception, and it earns it by being the thing that says
// the song has begun: the first downbeat has a skyline arriving on it, so the
// player's first reading of the tempo is a structure landing rather than a
// number on a strip.
//
// IT STEPS. It does not slide, ease or tween, and the difference matters more
// here than the word "slide" suggests: this panel's whole grammar is that the
// beat advances things and nothing else does — the clouds drift in whole pixels
// on the heard beat, the mast's rings walk a step per beat, the chase moves one
// cell. A structure gliding smoothly into place would be the only continuously
// animated object on a Game & Watch and it would read as a different, later
// machine. Four authored positions, one per beat, is a slide in this cabinet's
// own language, and it is also what a segment display can actually do.
const LCD_ARRIVE = [30, 13, 4, 0];
// One structure per beat, so the eight in this skyline are all standing by the
// eleventh — LCD_ARRIVE.length - 1 beats after the last one starts.
const LCD_ARRIVE_STEP = 1;

/**
 * The scene's structures in READING ORDER, left to right, with the column of
 * the bake each one occupies.
 *
 * Sorted by x rather than authored in order, because the two lists this walks
 * are authored for different reasons: `buildings` is the facade table and
 * `gameWatch` is a single named tower that happens to stand fifth. Reading
 * order is a fact about where they are, so it is solved from x and cannot drift
 * when a building is inserted.
 */
function lcdStructures(art) {
  const out = art.buildings.map((b, i) => ({ kind: 'building', i, x: b[0], w: b[1] }));
  if (art.gameWatch) out.push({ kind: 'gameWatch', i: -1, x: art.gameWatch[0], w: art.gameWatch[1] });
  out.sort((a, b) => a.x - b.x);
  return out;
}

/**
 * How far below home each structure is drawn this beat, or null once the whole
 * skyline has landed.
 *
 * Returns a map keyed the way drawLCDCity asks: `b<index>` for a facade and
 * `gameWatch` for the tower. A structure whose beat has not come yet is absent
 * from the map entirely, which is the difference that matters — absent means
 * DO NOT DRAW, and 0 means standing. The two must not be the same value or a
 * building that has not arrived yet paints itself at home on beat zero.
 */
function lcdArrival(art, frame) {
  // NO INTRO MEANS A CITY THAT IS SIMPLY THERE — the hub, the gallery, reduced
  // motion and every test.
  if (!frame.intro) return null;
  // THE OPENING'S OWN CLOCK, not the song's — see the note on `introBeat`. A
  // run that has not started moving yet has none, and a city that has not been
  // told the opening has begun is a city already standing: the assembly is the
  // first thing the player sees the stage do, so it may not have happened
  // behind the act banner.
  const t = frame.introBeat;
  if (t == null) return null;
  const order = lcdStructures(art);
  const last = (order.length - 1) * LCD_ARRIVE_STEP + LCD_ARRIVE.length - 1;
  if (t > last) return null;
  const at = new Map();
  for (let k = 0; k < order.length; k++) {
    const step = t - k * LCD_ARRIVE_STEP;
    if (step < 0) continue;
    const s = order[k];
    at.set(s.kind === 'gameWatch' ? 'gameWatch' : `b${s.i}`,
      { dy: LCD_ARRIVE[Math.min(step, LCD_ARRIVE.length - 1)], x: s.x, w: s.w });
  }
  return at;
}

// One composed surface, never a collection of historical beats. Pixel parity
// and a full-engine rhythm spectrum replay are covered by lcd-cache-browser.js.
let lcdPanelCacheEnabled = true;
let lcdPanelBake = null;
const panelKey = [];
const windowLevels = [], roofLevels = [], skyLevels = [];
const FRAME_SCALARS = new Set(`stageIndex live step beat4 beatAbs bar phrase phase finish
  streak cheer barrelBeat barrelGrid gorillaExpr gorillaNostrils gorillaBrow gorillaInk
  gorillaBuild gorillaPit gorillaTuft gorillaShock gorillaEar gorillaSpikes gorillaShoulder
  gorillaShoulderShape barrelCell barrelShape runnerOutline intro introBeat omenStep
  maxRoadRise`.split(/\s+/));
const FRAME_RESOLVED = new Set(['beatPhase', 'spectrum', 'audio', 'verbCue',
  'windowLevels', 'roofLevels', 'skyLevels', 'signOn', 'strike', 'puffs', 'antennaReach']);

export function clearLCDPanelCache() {
  lcdPanelBake = null;
  efficiencyProfile.lcdBytes = 0;
}
export function setLCDPanelCacheEnabled(enabled) {
  lcdPanelCacheEnabled = !!enabled;
  clearLCDPanelCache();
}

// Rotation changes the logical frame and usually the backing store as well.
// Drop retained surfaces tied to either so the first frame in the new
// orientation cannot reuse an old-height hill, pattern, or skyline bake.
export function clearPresentationCaches() {
  hillCache.clear();
  hillCacheSS = 0;
  gradCache.clear();
  patCache.clear();
  paperSurfaceCache.clear();
  plumberScenerySpriteCache.clear();
  plumberSceneryCacheSS = 0;
  frostAuroraSpriteCache.clear();
  frostAuroraCacheSS = 0;
  bakeCache.clear();
  cityBake = null;
  clearLCDPanelCache();
}

onPresentationChanged(clearPresentationCaches);

// Resolve the exact existing cell/flash decisions once, shared by key and painter.
// No new quantization and no retained references to mutable analyser/ink buffers.
function prepareLCDPanel(scene, skyMeter, keyNeeded = false, backgroundContext = null) {
  const frame = lcdSceneFrame(scene);
  // The SCENE BEING PAINTED, not the authored table: portrait grows the
  // buildings, and a window level resolved against the landscape row count
  // would light a grown facade to the wrong height. See lcdArtFor.
  const art = lcdArtFor(frame.stageIndex, backgroundContext);
  const bay = lcdClockBay(art);
  windowLevels.length = art.buildings.length;
  roofLevels.length = 0;
  skyLevels.length = skyMeter ? LCD_EQ_BARS : 0;
  for (let i = 0; i < art.buildings.length; i++) {
    const building = art.buildings[i];
    const { activeRows } = lcdWindowCells(building, bay?.index === i ? bay : null);
    windowLevels[i] = Math.min(activeRows, frame.phase + (lcdBandLevel(frame.spectrum, i, 8, activeRows) ?? 0));
    if (frame.stageIndex === 2 && !lcdCrowned(art, i)) {
      const cols = building[1] >= 44 ? 3 : 2;
      for (let col = 0; col < cols; col++) {
        const band = i * cols + col;
        roofLevels[band] = lcdBandLevel(frame.spectrum, band, 24, 6);
      }
    }
  }
  for (let b = 0; b < skyLevels.length; b++) {
    skyLevels[b] = lcdBandLevel(frame.spectrum, b, LCD_EQ_BARS,
      Math.floor((GROUND_Y - LCD_EQ_TOP) / LCD_EQ_CELL));
  }
  frame.windowLevels = windowLevels; frame.roofLevels = roofLevels; frame.skyLevels = skyLevels;
  frame.signOn = frame.beatPhase < LCD_SIGN_DUTY;
  frame.strike = !!art.billboards?.some(([, name]) => name !== 'chart')
    && (frame.audio?.hit || 0) > 0.55;
  const heard = frame.audio ? frame.audio.level : null;
  frame.puffs = !art.smokestacks?.length || heard == null ? 4 : Math.max(3, Math.min(4, 3 + Math.round(heard)));
  frame.antennaReach = Number.isInteger(art.transmitter) && frame.audio
    ? Math.round((frame.audio.treble || 0) * 2.2) : 0;
  if (!keyNeeded) return { frame, art, supported: true };
  panelKey.length = 0;
  panelKey.push(skyMeter, !!frame.audio);
  let supported = true;
  for (const key in frame) {
    if (FRAME_SCALARS.has(key)) panelKey.push(frame[key]);
    else if (!FRAME_RESOLVED.has(key)) supported = false;
  }
  panelKey.push(frame.signOn, frame.strike, frame.puffs, frame.antennaReach,
    frame.verbCue?.action, frame.verbCue?.ink.length ?? 0);
  if (frame.verbCue) for (const ink of frame.verbCue.ink) panelKey.push(ink);
  for (const levels of [windowLevels, roofLevels, skyLevels]) {
    panelKey.push(levels.length);
    for (const level of levels) panelKey.push(level);
  }
  return { frame, art, supported };
}

function drawLCDCity(ctx, scene, skyMeter = false,
  backgroundContext = null) {
  const { frame, art, supported } = prepareLCDPanel(scene, skyMeter, lcdPanelCacheEnabled,
    backgroundContext);
  const cv = ctx.canvas;
  const coverage = backgroundPaintCoverage(ctx);
  const shiftedCoverage = coverage.left !== 0 || coverage.right !== W;
  panelKey.push(ctx.imageSmoothingEnabled);
  panelKey.push(backgroundContext?.portrait ? 1 : 0);
  panelKey.push(backgroundContext?.cloudOffsetY || 0);
  const sceneryRect = backgroundContext?.sceneryLayout?.screenRect;
  panelKey.push(sceneryRect?.top || 0, sceneryRect?.bottom || 0,
    sceneryRect?.height || 0);
  // Grouping semi-transparent operations changes nonstandard compositing. Keep
  // those callers direct, and keep the operation recorder's real-surface fallback.
  if (shiftedCoverage || !lcdPanelCacheEnabled || !supported || ctx.globalAlpha !== 1
    || ctx.globalCompositeOperation !== 'source-over' || !cv?.width || !cv?.height) {
    paintLCDCity(ctx, frame, skyMeter, backgroundContext, art);
    return;
  }
  let bake = lcdPanelBake;
  const sized = bake && bake.c.width === cv.width && bake.c.height === cv.height;
  const hit = sized && bake.owner === ctx && bake.key.length === panelKey.length
    && panelKey.every((value, i) => Object.is(value, bake.key[i]));
  if (hit) {
    if (efficiencyProfile.enabled) efficiencyProfile.lcdHits++;
  } else {
    // Reuse storage without resizing it on every changed audio cell. Resizing
    // a canvas can flush outstanding GPU work and reallocates its backing store.
    const made = sized ? { canvas: bake.c, ctx: bake.ctx } : lcdBakeSurface(cv.width, cv.height);
    if (!made) {
      clearLCDPanelCache();
      paintLCDCity(ctx, frame, skyMeter, backgroundContext, art);
      return;
    }
    const started = efficiencyProfile.enabled ? performance.now() : 0;
    const c = made.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.lineWidth = 1; c.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
    paintLCDCity(c, frame, skyMeter, backgroundContext, art);
    bake = { c: made.canvas, ctx: made.ctx, owner: ctx, key: panelKey.slice() };
    lcdPanelBake = bake;
    efficiencyProfile.lcdBytes = cv.width * cv.height * 4;
    if (efficiencyProfile.enabled) {
      efficiencyProfile.lcdMisses++;
      efficiencyProfile.lcdRepaintMs += performance.now() - started;
    }
  }
  ctx.save();
  ctx.drawImage(bake.c, 0, 0, W, H);
  ctx.restore();
}

function paintLCDCity(ctx, frame, skyMeter = false, backgroundContext = null,
  art = lcdArtFor(frame.stageIndex, backgroundContext)) {
  const palette = LCD_GBC_PALETTES[frame.stageIndex];
  // The sky is painted HERE rather than by each caller, so the scene frame is
  // derived once per frame instead of once by bg() and again on the way in.
  // Below the groundline: the sky's own bottom colour, NOT LCD_PANEL_LIT. The
  // band a pit exposes has to be the same green the backdrop meets the ground
  // with — a flat panel-lit slab down there made every hole open onto a
  // different, yellower screen than the one above it. The road apron is
  // ground()'s business and stays panel-lit.
  const sky = LCD_SKY_PHASES[frame.stageIndex][frame.phase] || palette.sky;
  skyGrad(ctx, sky[0], sky[1]);
  ctx.fillStyle = sky[1];
  const coverage = backgroundPaintCoverage(ctx);
  // Keep the lower city fill under the same sideways bleed as skyGrad(). A
  // pit is allowed to reveal this band, so letting it stop at a narrower
  // fallback interval would trade the original left-edge seam for a seam
  // visible precisely through the opening.
  const bleed = coverage.left !== 0 || coverage.right !== W ? W : 0;
  ctx.fillRect(coverage.left - bleed, GROUND_Y,
    coverage.width + bleed * 2, H - GROUND_Y);
  ctx.lineWidth = 1;
  // RHYTHM 2'S CLOUDS ARE THE BACK OF THE CITY. This stage's elevated rail,
  // train, searchlight and roof traffic all cross their band, and painting the
  // clouds after those objects made the wisps cut across them. Put this one
  // cloud layer straight onto the sky so every object remains in front.
  if (frame.stageIndex === 2) lcdCloudLayer(ctx, art, frame, backgroundContext);
  if (skyMeter) lcdSkylineEq(ctx, frame);
  // WHICH STRUCTURES ARE STILL WALKING ON, or null once the skyline is standing
  // — which is every frame of every stage but the first eleven beats of a run,
  // and every frame of the hub, the gallery and the tests. See lcdArrival.
  const arrive = lcdArrival(art, frame);
  // How far below home one structure is drawn, or NULL for one whose beat has
  // not come. Null means draw nothing at all: a building that has not arrived
  // has no lit windows, no billboard and no chimney, because it is not there.
  const riseOf = (key) => {
    if (!arrive) return 0;
    const a = arrive.get(key);
    return a ? a.dy : null;
  };
  // The facades, their line art and every unlit window, in one blit — or, while
  // the city is arriving, one column window per structure at its own offset.
  // The lift is in the key because it is in the masonry: a taller city is a
  // different bake, and a rotation or a resize that changes it must not blit
  // the skyline it drew for the frame before.
  bakedCity(ctx, `${frame.stageIndex}|${frame.phase}|${backgroundContext?.portrait ? 'portrait' : 'landscape'}`,
    (c) => paintLCDStaticCity(c, frame.stageIndex, art),
    arrive
      ? [...arrive.entries()].filter(([k]) => k !== 'gameWatch')
        .map(([, a]) => ({ x: a.x - 1, w: a.w + 3, dy: a.dy }))
      : null,
    lcdBakedTop(art));
  // THE RAIL, IN FRONT OF THE SKYLINE, AS ONE PIECE, FROM BEAT ONE. It ran
  // behind the facades once, and a line seen only in the gaps between eight
  // buildings is eight short lines: it read as chopped, not as far. In front
  // it is one girder across the whole panel, which is what a monorail through
  // a city looks like from the street. And it is drawn HERE, live, rather
  // than baked with the masonry it belongs to: the bake above is blitted a
  // building at a time while the city walks on, and a rail inside those
  // slices arrived in pieces, each riding its own building down. A viaduct
  // is the one thing on this skyline that is there before the buildings are.
  if (art.train) lcdViaduct(ctx, art);
  ctx.lineWidth = 1;
  const clockBay = lcdClockBay(art);
  for (let i = 0; i < art.buildings.length; i++) {
    const rise = riseOf(`b${i}`);
    if (rise === null) continue;
    const building = art.buildings[i];
    const [x, w, h] = building;
    const crowned = lcdCrowned(art, i);
    if (rise) ctx.save();
    if (rise) ctx.translate(0, rise);
    lcdWindowGridLit(ctx, building, i, frame, clockBay && clockBay.index === i ? clockBay : null);
    // AND `crowned` GOVERNS THE ROOFTOP KIT TOO, not just the crown. Each
    // stage hangs its own hardware off every roof — stage 2's equalizer bank,
    // stage 3's antenna and lamp cap — and all of it is drawn from the roof
    // UPWARD into exactly the airspace a billboard's legs and board occupy.
    // A board covers most of a 37px bank, so what was left was the bank's
    // frame poking out over the top edge and its bottom row of cells lit in
    // the 8px gap between the legs: a sign with scaffolding behind it. The
    // roof carries one thing.
    if (frame.stageIndex === 2 && !crowned) lcdEqualizer(ctx, building, i, frame);
    if (frame.stageIndex === 3) {
      if (!crowned) lcdAntenna(ctx, building, i, frame);
      if (!crowned) {
        // The plate itself is in the baked layer; these are its three lamps,
        // which carry the offbeat change. Reduced flashing keeps the roof
        // hardware but leaves it in a composed printed state.
        const capY = GROUND_Y - h - 5;
        if ((i + frame.beat4) % 2 === 0) {
          ctx.fillStyle = LCD_WINDOW_ON;
          const span = Math.max(1, w - 16);
          for (let lamp = 0; lamp < 3; lamp++) {
            ctx.fillRect(Math.round(x + 7 + span * lamp / 2), capY, 2, 2);
          }
        }
      }
    }
    if (rise) ctx.restore();
  }
  // The cars, on the rail the baked layer just laid in front of the facades:
  // in front of the skyline like the girder it runs on.
  // FROM THE FIRST PHASE AND FROM THE FIRST BEAT. It waited for the second
  // phase once (Peter: "don't wait so long for the first monorail"), and then
  // it waited for the skyline's walk-on to finish, which was worse: the walk-on
  // ends on whatever beat it ends on, and the service is somewhere in the
  // middle of its lap by then, so a train SNAPPED INTO EXISTENCE mid-panel on
  // the beat the city finished assembling. That is the one thing on this rail
  // Peter asked never to see. The viaduct is already the one piece of this
  // skyline that stands before the buildings do; a service running on it while
  // they walk on is the same claim, and it is the claim that has no seam in it.
  if (art.train && frame.phase >= (art.train.fromPhase ?? 0)) {
    lcdTrain(ctx, art.train, frame);
  }
  // Stages 1 and 3 keep their authored mid-scene cloud depth. Rhythm 2 is the
  // exception above: its monorail and other sky traffic must cover every wisp.
  if (frame.stageIndex !== 2) lcdCloudLayer(ctx, art, frame, backgroundContext);
  const towerRise = riseOf('gameWatch');
  if (art.gameWatch && towerRise !== null) {
    if (towerRise) ctx.save();
    if (towerRise) ctx.translate(0, towerRise);
    lcdGameWatch(ctx, art.gameWatch, frame,
      lcdBurstPhase(art, frame),
      lcdVanishedBarrelCell(art, frame), lcdPlanePoint(art, frame, art.plane));
    if (towerRise) ctx.restore();
  }
  // EVERY ROOF FURNISHING BELONGS TO A ROOF, so each one is drawn through its
  // own building's arrival: absent while that building is, and riding its
  // offset while it climbs. A billboard standing at its authored height over a
  // facade still two beats below it is the one way an assembling skyline comes
  // apart, and it comes apart badly — the sign reads as the thing the city is
  // being built underneath.
  const onRoof = (bi, paint) => {
    const rise = riseOf(`b${bi}`);
    if (rise === null) return;
    if (rise) ctx.save();
    if (rise) ctx.translate(0, rise);
    paint();
    if (rise) ctx.restore();
  };
  for (const [bi, artName] of art.billboards || []) {
    // THE PRICE STANDS DOWN WHILE THE SIGN IS SHOUTING. Same roof, same legs,
    // same rim — the board is showing something else for a few bars, which is
    // the one thing this particular sign has always been allowed to do.
    onRoof(bi, () => {
      // THE COUNTING ROOF HAS TWO STATES and no third. The verb it needs
      // shouted wins the board over the opening bars; the streak count has it
      // the rest of the run. There is no share price any more and no separate
      // celebration — see lcdComboBoard.
      if (artName !== 'chart') {
        lcdBillboard(ctx, art.buildings[bi], artName, frame);
      } else if (frame.verbCue) {
        lcdVerbSign(ctx, art.buildings[bi], frame.verbCue, frame);
      } else {
        lcdComboBoard(ctx, art.buildings[bi], frame);
      }
    });
  }
  (art.searchlights || []).forEach(([bi, dx], n) => {
    onRoof(bi, () => lcdSearchlight(ctx, art.buildings[bi], dx, n, frame, art.skyTop ?? LCD_BEAM_CEILING));
  });
  if (art.washer) {
    onRoof(art.washer[0], () => lcdWasher(ctx, art.buildings[art.washer[0]], art.washer[1], frame));
  }
  if (Number.isInteger(art.transmitter)) {
    onRoof(art.transmitter, () => lcdTransmitter(ctx, art.buildings[art.transmitter], frame));
  }
  for (const [bi, dx] of art.smokestacks || []) {
    onRoof(bi, () => lcdSmokestack(ctx, art.buildings[bi], dx, frame));
  }
  if (art.plane) lcdPlane(ctx, art, frame, art.plane);
  // THE GORILLA IS IN FRONT OF THE SKY, and that is what buys stage 3 a plane
  // at all. He stands on a roof at y 100 and his raised barrel reaches the beat
  // ribbon's band, so there is no altitude over that column a plane could take:
  // every lane that clears the antennae goes straight through him. Drawn after
  // the crossing he simply eclipses it — the aircraft goes behind the ape and
  // comes out the other side, which is what a panel with two opaque layers does
  // and what stage 1 could not do (its gorilla is inside the tower, drawn long
  // before this, which is why THAT plane has to hit the barrel instead).
  //
  // Nothing else moves: scene 3 declares no billboard, mast or chimney, so
  // this block has only the plane and the clock to be reordered
  // against, and the two scenes that own those furnishings own no gorilla.
  const gorillaRise = Number.isInteger(art.rooftopGorilla)
    ? riseOf(`b${art.rooftopGorilla}`) : null;
  if (Number.isInteger(art.rooftopGorilla) && gorillaRise !== null) {
    // He and his chute ride his own roof up, for the reason every roof
    // furnishing does — see onRoof above. The chute is authored FROM the roof
    // (`GROUND_Y - gh`), so the whole rig moves as one under the offset.
    if (gorillaRise) ctx.save();
    if (gorillaRise) ctx.translate(0, gorillaRise);
    // The barrel chute: four authored cells falling down the side of the
    // gorilla's building, ghosted like every off cell on this panel, with
    // the live one stepping a cell per heard beat — thrown at the roof on
    // the downbeat, at the street on beat four. Drawn BEFORE the gorilla so
    // his own held barrel stays the scene's front-most one.
    // WHAT THE FINALE'S GORILLA WATCHES. He has no little man to look down at,
    // so the variety has to come from the panel's own traffic: the barrel he
    // just sent down his chute — hardest when it is the LIVE one, wearing the
    // rim that says this is the one coming for you — and the aircraft when it
    // is close enough to be worth turning for. Set inside the chute block
    // because that is where those positions are solved; read at the gorilla,
    // below, where they are needed.
    let watch = null;
    if (art.barrelDrop && !frame.finish) {
      const [, , gh] = art.buildings[art.rooftopGorilla];
      const roof = GROUND_Y - gh;
      const dropX = lcdChuteX(art);
      const chute = lcdChuteCells(roof);
      // AND EACH CELL IS TURNED FURTHER THAN THE ONE ABOVE IT — see
      // LCD_BARREL_ROLL. Four barrels in a vertical line at the same attitude
      // is a barrel being lowered; the same four each turned another thirty
      // degrees is a barrel that was thrown. It turns clockwise because the
      // chute is on the RIGHT of his building and he throws it that way.
      const spinOf = (i) => (i + 1) * LCD_BARREL_ROLL;
      chute.forEach((cy, i) => gbcGorillaBarrel(ctx, dropX, cy, true, false, frame.barrelShape, spinOf(i)));
      // WHICH CELL HAS THE BARREL: always exactly one, and it is the swing's
      // to say (lcdSwingPhase). He lets go on phase 3, so the top cell is
      // phase 3's and each cell below is the phase after — the same barrel he
      // raised four beats earlier, still falling, while he raises the next.
      // The chute never stands empty and never runs on a clock of its own.
      const cue = lcdMod(lcdSwingPhase(frame) + 1, LCD_CHUTE_CELLS);
      // WHICH ONE IS LIT is the one place on this panel where the lane gets a
      // say. In a run, `barrelBeat` is the beat a real barrel reaches the foot
      // of this chute (see lcdSceneFrame); it is in the chute for the four
      // beats before that — top cell four out, bottom cell one out — and on the
      // delivery beat itself the cell that would be lit is the road's. The
      // gorilla drops barrels because that is what a gorilla does; the rim is
      // the promise made explicit: this is the one that is coming for you, in
      // the same wood the ribbon's arrow is drawn in.
      const due = frame.barrelBeat != null ? Math.round(frame.barrelBeat - frame.beatAbs) : null;
      const live = due != null && due >= 1 && due <= LCD_CHUTE_BEATS
        && lcdRimOn(frame);
      gbcGorillaBarrel(ctx, dropX, chute[cue], false, live, frame.barrelShape, spinOf(cue));
      // He follows the live one all the way down and only glances at the rest:
      // a head that tracks every barrel he throws is a gorilla admiring his own
      // work, and the rim exists to mean something.
      if (live || lcdMod(frame.bar, 3) === 0) watch = [dropX, chute[cue]];
    }
    if (!watch) {
      const planeAt = lcdPlanePoint(art, frame, art.plane);
      const gx = art.buildings[art.rooftopGorilla];
      if (planeAt && Math.abs(planeAt[0] - (gx[0] + gx[1] / 2)) < 70) watch = planeAt;
    }
    lcdRooftopGorilla(ctx, art.buildings[art.rooftopGorilla], frame, -1, null, watch);
    if (gorillaRise) ctx.restore();
  }
  // The case is in the baked layer with the rest of the facade; only the hand
  // is redrawn, and it is drawn LAST so nothing on this end of the skyline
  // crosses the one mark the player reads the beat off.
  if (clockBay) {
    const bayRise = riseOf(`b${clockBay.index}`);
    if (bayRise !== null) {
      if (bayRise) ctx.save();
      if (bayRise) ctx.translate(0, bayRise);
      lcdClockHand(ctx, clockBay, frame.beat4);
      if (bayRise) ctx.restore();
    }
  }
}

function lcdPack(settings) {
  return {
    name: 'lcd',
    // The screen treatment belongs to the scenery. The cast — hero, hazards,
    // pickups — draws on top in its production colours, as the things the
    // player is meant to track.
    actorsAbovePost: true,
    // NO SOFT SHADE ON THIS GROUND. A segment display has two states per cell
    // and no greys between them, so a gradient ellipse under the hero is the
    // one mark on the screen that could not be printed by the thing the whole
    // pack is imitating. The cast draws above post() here, so the shadow would
    // land on top of the conversion rather than being converted by it — a wash
    // laid over a Game & Watch.
    heroShadow: false,
    // THIS PACK FILLS EVERY HOLE ITSELF, and it fills them all with the same
    // thing. ground() cuts cogwheels into the bedrock under any break it draws,
    // so the run's own pass for a hole that names its own material (a
    // crossing's spikes) would lay a bed of teeth over the works — one pit with
    // two fatal materials in it, while the hole ten paces back had one. A
    // cabinet may have exactly one answer to "what is at the bottom", and on
    // this one the answer is the machinery.
    ownPitFills: true,
    // ...and its own SURFACE, walked off terrainGroundY column by column. So
    // drawTerrain has nothing to add over a crossing's road rise: painting the
    // rise a second time stepped the ink line where its clipped run began and
    // repainted the apron over the road dashes, which is why they stopped
    // following the lane exactly where it climbed. Same argument as the stage
    // wave, which that painter already declines for the same reason.
    ownSurface: true,
    // The panel does not crane with the camera. Everything bg() draws here —
    // backplate art, bezel, screen plate — is fixed to the display; sliding it
    // down on a jump would move the physical handheld, not the picture.
    bgPan: 0,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      // Sky and all — drawLCDPanel above is the same call, for callers outside
      // a run. The city is alive, but the glass still does not travel. It
      // changes by switching cells between fixed authored poses on heard
      // musical beats; neither camX nor gameplay chart data enters the painter.
      const shift = backgroundContext?.portrait ? LCD_PORTRAIT_CITY_SHIFT : null;
      const previousCoverage = ctx.__mashBackgroundCoverage;
      if (shift) {
        ctx.save();
        ctx.translate(shift.x, shift.y);
        // Coverage is published in the unshifted local background space. Move
        // the interval with the city as well, otherwise a shifted portrait
        // fill can leave a one-sided sky seam at the phone edge.
        if (previousCoverage) {
          ctx.__mashBackgroundCoverage = {
            ...previousCoverage,
            left: previousCoverage.left - shift.x,
            right: previousCoverage.right - shift.x,
          };
        }
      }
      try {
        drawLCDCity(ctx, scene, false, backgroundContext);
      } finally {
        if (shift) {
          if (previousCoverage === undefined) delete ctx.__mashBackgroundCoverage;
          else ctx.__mashBackgroundCoverage = previousCoverage;
          ctx.restore();
        }
      }
      // No hardware frame around the screen any more: the bezel cost more
      // than it said (it doubled against facades, and its restore pass caused
      // the phantom-line saga), and the city reads as a place, not a toy.
    },
    // `viewW` is how much world this frame actually shows — W / z, taken from
    // the frame's own interpolated zoom. It matters here more than anywhere
    // else in the pack: this road is a column walk, and walking a fixed 480
    // inside the world transform painted ~45% of its columns off the right edge
    // on a phone (218 world px visible at the 2.2 tier), each one paying a
    // terrainGroundY — two Math.sin and a pair of smoothsteps — and a linear
    // scan of the cut list before it was thrown away. Defaults to W so every
    // other caller, and every other pack, is unchanged.
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null,
      worldContext = null) {
      const right = Math.max(0, Number.isFinite(portraitViewW) ? portraitViewW : viewW);
      const portrait = !!settings?.portraitPresentation;
      const worldZoom = Number.isFinite(Number(worldContext?.worldZoom))
        && Number(worldContext.worldZoom) > 0 ? Number(worldContext.worldZoom) : null;
      const worldXOffset = Number.isFinite(Number(worldContext?.worldXOffset))
        ? Number(worldContext.worldXOffset) : 0;
      const canSnapPortrait = portrait && worldZoom !== null
        && Number.isFinite(Number(worldContext?.groundScreenY));
      const screenXFor = (worldX) => {
        const x = worldXOffset + worldX * (worldZoom || 1);
        return worldContext?.mirror ? W - x : x;
      };
      const worldXForScreen = (screenX) => {
        const x = worldContext?.mirror ? W - screenX : screenX;
        return (x - worldXOffset) / (worldZoom || 1);
      };
      const pits = [];
      for (const ob of obstacles || []) {
        if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel) continue;
        // Round the two world-space edges, then derive the width. Rounding the
        // width independently lets the right wall, floor overscan and cut mask
        // disagree by one pixel for fractional obstacle positions.
        let x = Math.round(ob.x - camX);
        let edge = Math.round(ob.x + ob.w - camX);
        if (canSnapPortrait) {
          // The post() lattice is screen-fixed, while this painter is below
          // the world scale. Expand the opening to the surrounding vertical
          // rules in SCREEN space, then invert the same transform the run
          // applied. Doing this before building `cuts` is important: a wall
          // that snaps without its apron mask leaves a thin road overlap at
          // the corner, which is the exact seam this contract is meant to
          // prevent.
          const a = screenXFor(x);
          const b = screenXFor(edge);
          const left = Math.min(a, b);
          const rightEdge = Math.max(a, b);
          const snappedLeft = lcdPortraitGridLineX(left, 'floor');
          const snappedRight = lcdPortraitGridLineX(rightEdge, 'ceil');
          const snappedA = worldXForScreen(snappedLeft);
          const snappedB = worldXForScreen(snappedRight);
          x = Math.min(snappedA, snappedB);
          edge = Math.max(snappedA, snappedB);
        }
        const w = edge - x;
        if (w <= 0 || edge < -4 || x > right + 4) continue;
        pits.push({
          x, w,
          // Once an edge has been moved to a printed rule, sample the surface
          // at that same rendered edge so a rolling lane cannot leave a tiny
          // height mismatch at the wall. Landscape keeps the old obstacle
          // sample and therefore the old picture.
          wx: canSnapPortrait ? camX + x : ob.x,
          wxRight: canSnapPortrait ? camX + edge : ob.x + ob.w,
        });
      }
      // Merge the visible openings into a mask. The city has already been
      // drawn all the way down; this apron covers it everywhere except here.
      const cuts = pits
        .map(({ x, w }) => ({ from: Math.max(0, x), to: Math.min(right, x + w) }))
        .filter((cut) => cut.to > cut.from)
        .sort((a, b) => a.from - b.from)
        .reduce((merged, cut) => {
          const last = merged[merged.length - 1];
          if (last && cut.from <= last.to) last.to = Math.max(last.to, cut.to);
          else merged.push({ ...cut });
          return merged;
        }, []);
      // Opaque foreground road, walked in world-snapped columns that FOLLOW
      // THE SURFACE — terrainGroundY is the one definition of it, so where
      // rhythm-1's rolling window lifts the lane the panel body, the ink line
      // and the dashes all ride the same curve, exactly like every other
      // cabinet's road. (drawTerrain deliberately does not paint a flat
      // cabinet's stage wave; this pack owns its whole road.) Because it is
      // drawn in columns clipped at the cuts rather than painted and then
      // erased, a pit keeps the true city pixels behind it.
      //
      // The columns are COALESCED before they are drawn: consecutive ones at
      // the same surface height become one rect. The walk still asks
      // terrainGroundY per column, so a rolling lane is stepped exactly as
      // before — but a rhythm stage is flat almost everywhere (only rhythm-1
      // has a wave, windowed to the middle of it), so a screen of road that
      // used to be ~240 columns x 2 fills is now a handful of long rects
      // between the pits. Same picture, and no seams down a flat road.
      const inCut = (a, b) => cuts.some((cut) => b > cut.from && a < cut.to);
      const STEP = 2;
      const spans = [];
      let span = null;
      for (let wx = Math.floor(camX / STEP) * STEP; wx < camX + right + STEP; wx += STEP) {
        const sx = wx - camX;
        // Keep the solid portion of boundary columns. Dropping a whole 2wu
        // column for a fractional cut exposed a vertical strip of scenery
        // beside each wall, continuing all the way below the pit floor.
        let pieces = [{ from: sx, to: sx + STEP }];
        for (const cut of cuts) {
          pieces = pieces.flatMap((piece) => {
            if (piece.to <= cut.from || piece.from >= cut.to) return [piece];
            const kept = [];
            if (piece.from < cut.from) kept.push({ from: piece.from, to: cut.from });
            if (piece.to > cut.to) kept.push({ from: cut.to, to: piece.to });
            return kept;
          });
        }
        const y = terrainGroundY(cab, wx);
        for (const piece of pieces) {
          const w = piece.to - piece.from;
          if (span && span.y === y && Math.abs(span.x + span.w - piece.from) < 1e-9) span.w += w;
          else spans.push((span = { x: piece.from, y, w }));
        }
        if (!pieces.length) span = null;
      }
      ctx.fillStyle = LCD_PANEL_LIT;
      for (const sp of spans) ctx.fillRect(sp.x, sp.y, sp.w, H - sp.y);
      ctx.fillStyle = LCD_INK;
      for (const sp of spans) ctx.fillRect(sp.x, sp.y, sp.w, LCD_ROAD_INK);
      // The dashes scroll smoothly but at HALF the lane speed — full speed
      // strobed at this pitch. They are read as texture, not as a distance
      // reference, so the softer drift wins. Each dash sits DASH_DROP under the
      // surface at its own SCREEN position, so the line stays parallel to the
      // road through the rolls.
      //
      // THE DASHES BELONG ON THE LIP, level with the road's own markings. At 7
      // they sat below the tip of every beatground glyph — a second band of
      // road texture further down the face, with a strip of blank panel between
      // it and the arrows, which made the lane read as two lanes. Derived from
      // the same gauge the glyphs sink by: beatground sinks a glyph LCD_ROAD_INK
      // + 1 and draws it GLYPH_H (5.5) tall, so its waist is a shade under
      // LCD_ROAD_INK + 4, and a 3px dash starting two under the ink straddles
      // exactly that. Thin the road's cap and both move together.
      // Fractional x AND y on purpose: the backbuffer is scaled up, so a
      // whole-pixel round here becomes a conspicuous multi-screen-pixel hop
      // as the lane rolls — the same lesson the beat ribbon's offset learned.
      const PITCH = 16, DASH_DROP = LCD_ROAD_INK + 2;
      ctx.fillStyle = 'rgba(60,63,69,0.14)';
      for (let x = -((camX * 0.5) % PITCH); x < right; x += PITCH) {
        if (inCut(x, x + 8)) continue;
        ctx.fillRect(x, terrainGroundY(cab, camX + x + 4) + DASH_DROP, 8, 3);
      }
      // The exposed city makes the opening honest; dark-blue GEARS keep the
      // mechanical danger unequivocal without painting over that background.
      // Cogwheels, not spikes: this city is clockworks and relays, and a hole
      // in its road opens onto the machinery underneath. Adjacent wheels
      // counter-rotate like a real train, and the rotation is quantized to the
      // same 16px world pitch the road dashes step at — the works ratchet past
      // as the panel scrolls, and hold still when it does.
      const GEAR_R = 9;
      // The wheels live at the BOTTOM of the shaft — cut into the flat
      // bedrock the hole opens onto, not hanging at the mouth. The camera
      // shows the top of them from the road and the rest as the crane lifts.
      const GEAR_CY = GROUND_Y + 16;
      // Portrait gives the machinery a finite little bay. Below this line the
      // ordinary panel ground takes over; the side walls stop with the bay so
      // a gear pit cannot read as a shaft running to the phone's bottom edge.
      // This is a WORLD y for the painter below. In the live portrait run the
      // candidate is first projected through the actual frame camera and
      // snapped to the screen lattice, then inverted. The old code snapped
      // 261 directly, which only happened to look right at zoom one; at the
      // phone zoom it put the closing rule between two post() grid rules.
      const portraitGroundScreenY = Number(worldContext?.groundScreenY);
      const gearBottom = GEAR_CY + GEAR_R + 4;
      const gearBottomScreen = canSnapPortrait
        ? portraitGroundScreenY + (gearBottom - GROUND_Y) * worldZoom
        : gearBottom;
      const snappedPitLineScreen = portrait
        ? lcdPortraitGridLineY(gearBottomScreen) : gearBottomScreen;
      const GEAR_PIT_LINE_Y = canSnapPortrait
        ? GROUND_Y + (snappedPitLineScreen - portraitGroundScreenY) / worldZoom
        : snappedPitLineScreen;
      const pitInk = canSnapPortrait ? LCD_PORTRAIT_GRID_LINE_W / worldZoom : LCD_ROAD_INK;
      // The daylight the train keeps off the shaft walls. The frame gauge is
      // `pitInk`: landscape keeps the road's one-world-pixel ink, while live
      // portrait inverts the two-pixel screen-grid rule through the zoom so
      // the clearance and the walls stay on the same displayed gauge.
      const GEAR_PITCH = GEAR_R * 2 - 2;
      const GEAR_CLEAR = 3;

      const ratchet = Math.round(camX / PITCH) * (Math.PI / 8);
      for (const { x, w, wx, wxRight } of pits) {
        // The cut edges, full depth — from the LOCAL surface, not from the
        // flat groundline, so a rolled lip and its wall meet exactly. Wall
        // thickness is the same `pitInk` gauge as the hole's closing rule, so
        // the frame and the surface it is cut into read as ONE piece of steel
        // meeting at the lip. A wall heavier than the road it is cut into is
        // two gauges at a corner, and the corner is where that shows worst.
        //
        // A held-back 2px floor was tried here and rejected on sight: the
        // argument for it — that a hole is read down INTO, so a hairline stops
        // reading as a shaft — is real but loses to the joint. The mouth still
        // reads as an opening because of the FULL-DEPTH ink either side and the
        // works at the bottom of it, neither of which is the wall's thickness.
        const topL = terrainGroundY(cab, wx);
        const topR = terrainGroundY(cab, wxRight);
        const wallBottom = portrait ? GEAR_PIT_LINE_Y + pitInk : H;

        if (portrait) {
          // Start directly under the bottom ink. Starting above it left a
          // bright extra stripe inside the bay. Overscan sideways underneath
          // the solid apron so antialiasing cannot uncover the background.
          ctx.fillStyle = LCD_PANEL_LIT;
          const floorTop = GEAR_PIT_LINE_Y;
          ctx.fillRect(x - pitInk, floorTop,
            w + pitInk * 2, Math.max(0, H - floorTop + 1));
        }

        ctx.fillStyle = LCD_INK;
        ctx.fillRect(x, topL, pitInk, Math.max(0, wallBottom - topL));
        ctx.fillRect(x + w - pitInk, topR, pitInk, Math.max(0, wallBottom - topR));
        // Mitred lips: the surface line turns the corner into the wall as one
        // continuous piece — the column walk alone leaves a stepped joint.
        ctx.fillRect(x - pitInk, topL, pitInk * 2, pitInk);
        ctx.fillRect(x + w - pitInk, topR, pitInk * 2, pitInk);
        // Wheels meshed across the opening, centres pitched a hair under two
        // radii so the teeth interleave. Anchored to the pit (world space), so
        // the train stands still in the hole as the panel steps past it.
        //
        // CENTRED at a fixed pitch, not stretched to the opening. Dividing the
        // width by a wheel count made one number do two jobs and did both
        // badly: it set the mesh, so the teeth interleaved by a different
        // amount in every hole, and it pinned the outer wheels to the walls —
        // a tooth tip overlapped the ink by one to three pixels at EVERY
        // authored width, so no hole could be widened out of it. The works
        // read as jammed into the shaft rather than running through it.
        // Now the pitch alone sets the mesh, the count is however many wheels
        // fit clear of both walls, and the slack is split as daylight.
        const inner = w - 2 * (LCD_ROAD_INK + GEAR_CLEAR);
        const n = Math.max(1, Math.floor((inner - GEAR_R * 2) / GEAR_PITCH) + 1);
        const first = x + w / 2 - ((n - 1) * GEAR_PITCH) / 2;
        for (let i = 0; i < n; i++) {
          const cx = first + GEAR_PITCH * i;
          const dir = i % 2 === 0 ? 1 : -1;
          lcdGear(ctx, cx, GEAR_CY, GEAR_R, dir * ratchet + (i % 2) * (Math.PI / 8));
        }
        if (portrait) {
          // This is the bottom edge of the dry mechanical pit. The filled panel
          // ground below it is deliberately the same surface as outside the
          // opening, rather than an empty background showing through forever.
          ctx.fillStyle = LCD_INK;
          ctx.fillRect(x, GEAR_PIT_LINE_Y, w, pitInk);
        }
      }
      // NO frame restore here. ground() runs inside the world transform, so a
      // strokeRect(5,5,…) lands at WORLD x5 and the camera magnifies its left
      // edge into a phantom full-height line beside the real bezel — it hid
      // behind a facade for as long as one happened to stand at x12. The
      // hardware is restored in post(), which draws in screen space.
    },
    post(ctx, t) {
      // NO WASH. The soft-light pass that tied the old spot palette together
      // muddied it as much as it tied it; an OLED's light comes from the
      // panel, and the glow on the lit cells is the whole of that idea.
      // Landscape keeps its fine, faint LCD lattice. Portrait uses a coarser
      // and stronger rule so the grid survives the phone resample and reads
      // as clearly as the landscape version.
      const cell = lcdScreenGridCellSize(settings);
      if (cell) {
        const portraitGrid = !!settings?.portraitPresentation;
        const line = portraitGrid ? LCD_PORTRAIT_GRID_LINE_W : 1;
        bakedFill(ctx, `gbcCellsFaint:${cell}`, cell, cell, (c) => {
          c.fillStyle = portraitGrid
            ? 'rgba(50,53,58,0.10)' : 'rgba(50,53,58,0.055)';
          c.fillRect(cell - line, 0, line, cell);
          c.fillRect(0, cell - line, cell, line);
        });
      }
      // A tiny reflective-screen shimmer, not a broad white flash.
      ctx.fillStyle = `rgba(255,244,180,${0.008 + Math.sin(t * 6.3) * 0.008})`;
      ctx.fillRect(0, 0, W, H);
    },
    // No decorate. The old segment-ghost outline — a faint square trailing
    // every entity — read as a rendering bug beside the toaster and the
    // capsules, not as LCD relaxation. Legibility wins; the ghosting idea
    // lives on only where cells are authored for it (the city, the tower).
  };
}

function cardboardPack(settings) {
  const paperPreview = !!(settings?.paperPreset
    && settings.paperCutout !== false && settings.paperCutout !== 'off');
  const paperPreset = paperPresetName(settings?.paperPreset);
  return {
    name: 'cardboard',
    lightBg: true,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      const wob = Math.sin(t * 2) * 1.5;
      const farBaseY = sceneryRidgeBaseY(backgroundContext, 'farLandmark', 56, GROUND_Y) + wob;
      const nearBaseY = sceneryRidgeBaseY(backgroundContext, 'near', 34, GROUND_Y) - wob;
      // cardboard cutout hills with corrugation ticks
      ctx.save();
      ctx.translate(0, backgroundY(backgroundContext, 'far'));
      parallaxHills(ctx, camX, cab.far, farBaseY, 56, 120, 0.15,
        paperPreview ? { paper: true, paperMaterial: paperPreset } : null);
      ctx.fillStyle = 'rgba(90,64,32,0.3)';
      const coverage = backgroundPaintCoverage(ctx);
      for (let x = Math.floor(coverage.left / 10) * 10; x < coverage.right; x += 10) {
        ctx.fillRect(x, farBaseY - 60, 2, 6);
      }
      ctx.restore();
      ctx.save();
      ctx.translate(0, backgroundY(backgroundContext, 'near'));
      parallaxHills(ctx, camX, cab.hills, nearBaseY, 34, 60, 0.35,
        paperPreview ? { paper: true, paperMaterial: paperPreset } : null);
      ctx.restore();
      // a "distant" castle that is obviously four inches tall, on a stick
      const cx = wrapIntoView(ctx, 300 - camX * 0.4 * ZOOM, 100);
      ctx.save();
      ctx.translate(0, backgroundY(backgroundContext, 'landmark'));
      ctx.fillStyle = '#b89058';
      ctx.fillRect(cx, GROUND_Y - 40, 24, 20);
      ctx.fillRect(cx + 2, GROUND_Y - 46, 5, 6);
      ctx.fillRect(cx + 17, GROUND_Y - 46, 5, 6);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(cx + 11, GROUND_Y - 20, 3, 20); // the visible stick
      ctx.restore();
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t, drawW);
      // Corrugation ON the apron, and only where there is apron — the same rule
      // the pixel pack's ticks follow. Cardboard has pits from its first stage,
      // so a run of ticks across a hole is not a hypothetical here.
      ctx.fillStyle = 'rgba(90,64,32,0.4)';
      const solid = solidRuns(camX, obstacles, drawW);
      for (let x = -(camX % 10); x < drawW; x += 10) {
        if (!solid.some(([a, b]) => x >= a && x + 2 <= b)) continue;
        ctx.fillRect(x, GROUND_Y + 4, 2, 5);
      }
    },
    post(ctx, t) {
      if (paperPreview) return;
      ctx.fillStyle = 'rgba(200,160,104,0.05)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // visible tape corner
      ctx.fillStyle = 'rgba(232,232,240,0.5)';
      ctx.fillRect(x - 1, y - 1, 4, 3);
    },
  };
}

// A dried coffee ring. The previous attempt stroked an uneven circle, which
// still read as a drawn O — because a stain has no edges at all. What actually
// identifies one:
//   - it is SOAKED IN, so it multiplies the page rather than covering it, and
//     the rules stay visible through it, darkened;
//   - the rim is a soft band, not a line — liquid wicks into paper fibre, so
//     both sides of it fade out;
//   - the mug got set down more than once.
// So it is built from soft radial-gradient annuli instead of strokes. Three
// near-coincident passes make the rim uneven where they overlap, which beats
// any deliberate wobble, and a fourth offset pass is the second placement.
function coffeeRing(ctx, cx, cy, r, a2) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const blot = (x, y, rr, a, squash) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash); // a mug is never set down square on
    const R = rr * 1.18;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0.00, `rgba(158,112,64,${(a * 0.05).toFixed(3)})`); // barely-tinted centre
    g.addColorStop(0.60, `rgba(150,104,58,${(a * 0.12).toFixed(3)})`);
    g.addColorStop(0.82, `rgba(132,88,46,${(a * 0.45).toFixed(3)})`);
    g.addColorStop(0.90, `rgba(112,72,34,${a.toFixed(3)})`);          // solids pile up here
    g.addColorStop(0.97, `rgba(126,84,42,${(a * 0.22).toFixed(3)})`); // wicked into the fibre
    g.addColorStop(1.00, 'rgba(126,84,42,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  blot(cx, cy, r, 0.30, 0.94);
  blot(cx + r * 0.05, cy - r * 0.03, r * 0.98, 0.24, 0.96);
  blot(cx - r * 0.04, cy + r * 0.05, r * 1.03, 0.20, 0.92);
  // The mug was set down, lifted, and put back a little off its own print —
  // so the second ring nearly covers the first and is much fainter, being one
  // pass of liquid rather than the pile-up of the cup that sat there.
  const d = r * 0.36;
  blot(cx + Math.cos(a2) * d, cy + Math.sin(a2) * d * 0.9, r * 0.95, 0.10, 0.95);
  ctx.restore();
}

function doodlePack(settings) {
  // Which way the mug shifted when it was put back down. Rolled once here, in
  // the factory — getStylePack() runs on run entry, so this is fixed for the
  // whole run (the sheet cannot change while you are looking at it) and fresh
  // on the next one. Cosmetic only, so it takes Math.random rather than the
  // seeded gameplay rng; nothing about the run may depend on it.
  const a2 = Math.random() * Math.PI * 2;
  return {
    name: 'doodle',
    lightBg: true,
    // The sheet IS the screen: one page, held still, with the action drawn on
    // it like a flipbook. So NOTHING in the paper layer takes camX — not the
    // rules, not the margin, not the stain, not the punches. A scrolling grid
    // under a fixed margin line reads as two sheets sliding over each other,
    // and the punches made that contradiction impossible to miss. Speed is
    // carried by the terrain and obstacles, which are the ink, not the paper.
    // The camera's crane is the same argument in y: the sheet is held still and
    // the ink is redrawn higher up it, so the page does not travel either.
    bgPan: 0,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      // graph paper — a warm off-white, not near-#fff, so blue ink reads
      const coverage = backgroundPaintCoverage(ctx);
      ctx.fillStyle = '#eceadf';
      ctx.fillRect(coverage.left, 0, coverage.width, H);
      ctx.lineWidth = 1;
      // Minor cells, then a heavier rule every 4th to give the page structure.
      const firstCell = Math.floor(coverage.left / 16) * 16;
      for (let x = firstCell, i = Math.round(firstCell / 16); x < coverage.right; x += 16, i++) {
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(88,132,200,0.55)' : 'rgba(88,132,200,0.3)';
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
      }
      for (let y = 0, i = 0; y < H; y += 16, i++) {
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(88,132,200,0.55)' : 'rgba(88,132,200,0.3)';
        ctx.beginPath(); ctx.moveTo(coverage.left, y + 0.5); ctx.lineTo(coverage.right, y + 0.5); ctx.stroke();
      }
      if (cab.id === 'office' || cab.id === 'surge') drawOfficeScenery(ctx);
      // margin line + coffee ring
      ctx.strokeStyle = 'rgba(210,70,70,0.55)';
      ctx.beginPath(); ctx.moveTo(30.5, 0); ctx.lineTo(30.5, H); ctx.stroke();
      // Loose-leaf punches: the page came out of a binder.
      // Spaced down the band between the HUD's left column (which runs to ~y80)
      // and the highest the terrain crest reaches, so nothing is ever drawn on
      // top of a hole — ink over a punch would give the illusion away.
      // Solid, not translucent: a punch is an absence of page, so no rule line
      // may show through it.
      ctx.fillStyle = '#000';
      for (const hy of [110, 170]) {
        ctx.beginPath(); ctx.arc(15, hy, 4.6, 0, Math.PI * 2); ctx.fill();
      }
      // Parked upper-right, clear of the HUD's left column and the name plate.
      coffeeRing(ctx, 392, 76, 28, a2);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : W;
      // wobbly ballpoint ground line, re-jittered at ~3fps
      const jitterSeed = Math.floor(performance.now() / 333);
      ctx.strokeStyle = '#3a3a58';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= drawW; x += 12) {
        const j = Math.sin((x + jitterSeed * 77) * 12.9898) * 1.5;
        if (x === 0) ctx.moveTo(x, GROUND_Y + j); else ctx.lineTo(x, GROUND_Y + j);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          const x = ob.x - camX;
          ctx.fillStyle = '#eceadf';
          ctx.fillRect(x, GROUND_Y - 4, ob.w, 10);
          ctx.strokeStyle = '#3a3a58';
          ctx.strokeRect(x + 0.5, GROUND_Y + 2.5, ob.w, 20); // a pit, annotated
        }
      }
    },
    post(ctx, t) {},
    decorate(ctx, e, x, y) {
      // A biro underline instead of a box: still reads as margin-doodle
      // annotation, but never cages the art. Jitter is per-entity, so it
      // sits still instead of twitching every frame.
      const j = Math.sin(e.id * 12.9898) * 1.2;
      const by = y + e.h + 2;
      ctx.strokeStyle = 'rgba(58,58,88,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 1, by + j * 0.3);
      ctx.quadraticCurveTo(x + e.w / 2, by + 2.5 - j, x + e.w + 1, by + j * 0.3);
      ctx.stroke();
    },
  };
}

function surgePack(settings) {
  // Cycles through the other packs with glitch cuts.
  const packs = [pixelPack(settings), faux3dPack(settings), neonPack(settings), watercolorPack(settings), vhsPack(settings), lcdPack(settings), cardboardPack(settings), doodlePack(settings)];
  const period = 7; // seconds per style
  function pick(t) { return packs[Math.floor(t / period) % packs.length]; }
  return {
    name: 'surge',
    dark: true,
    // Read fresh each frame by the run's draw, so the cast is held back past
    // post() only while the cycle is sitting on a pack that converts the frame.
    get actorsAbovePost() { return pick(this._t || 0).actorsAbovePost === true; },
    // Same deal for the bloom gate: the cycle passes through the light packs,
    // and their backgrounds clip just as hard here as they do standalone.
    get lightBg() { return pick(this._t || 0).lightBg === true; },
    // ...and for the crane: the cycle passes through lcd and doodle, whose
    // backgrounds are screen furniture and must stay put while it is on them.
    get bgPan() { return pick(this._t || 0).bgPan ?? 1; },
    // ...and whether a soft contact shadow may be laid on the ground, which is
    // the LCD pack's to refuse for the same reason it owns its surface.
    get heroShadow() { return pick(this._t || 0).heroShadow !== false; },
    // ...and for the two claims a pack can make on the ground: whether it fills
    // its own holes and whether it walks its own surface. Both are true only
    // while the cycle is sitting on the LCD pack, and both are read fresh by
    // the run's draw for exactly that reason.
    get ownPitFills() { return pick(this._t || 0).ownPitFills === true; },
    get ownSurface() { return pick(this._t || 0).ownSurface === true; },
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, backgroundContext = null) {
      pick(t).bg(ctx, t, camX, cab, totalDist, scene, bgShift, backgroundContext);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      pick(this._t || 0).ground(ctx, camX, cab, obstacles, overhangs, t, viewW, portraitViewW);
    },
    post(ctx, t) {
      this._t = t;
      pick(t).post(ctx, t);
      const phase = (t % period) / period;
      if (phase > 0.96) {
        // glitch cut: horizontal slice offsets
        ctx.fillStyle = 'rgba(232,56,248,0.15)';
        for (let i = 0; i < 5; i++) ctx.fillRect(0, (i * 61 + t * 200) % H, W, 3);
      }
    },
    decorate(ctx, e, x, y) {
      const p = pick(this._t || 0);
      if (p.decorate) p.decorate(ctx, e, x, y);
    },
  };
}

const FACTORIES = {
  pixel: pixelPack, faux3d: faux3dPack, neon: neonPack, watercolor: watercolorPack,
  vhs: vhsPack, lcd: lcdPack, cardboard: cardboardPack, doodle: doodlePack, surge: surgePack,
};

export function getStylePack(name, settings) {
  const f = FACTORIES[name] || FACTORIES.pixel;
  const pack = f(settings || {});
  // Preview-only material injection for non-Plumber cabinets. Their authored
  // style painter remains intact, while shared terrain/routes can be audited
  // with the same cardstock and shadow treatment through `?paper=...`.
  if (settings?.paperPreset && settings.paperCutout !== false && settings.paperCutout !== 'off' && !pack.paperSlab) {
    const preset = paperPresetName(settings.paperPreset);
    const paperStrengths = paperStrengthsOf(settings);
    pack.paperSlab = {
      shadow: (ctx, source, options = {}) => sharedPaperShadowPass(ctx, source,
        options.subtle ? PAPER_SUBTLE_DEEP_OFFSET : PAPER_DEEP_OFFSET,
        options.subtle ? PAPER_SUBTLE_DEEP_COLOR : PAPER_DEEP_COLOR),
      contact: (ctx, source, options = {}) => sharedPaperShadowPass(ctx, source,
        options.subtle ? PAPER_SUBTLE_CONTACT_OFFSET : PAPER_CONTACT_OFFSET,
        options.subtle ? PAPER_SUBTLE_CONTACT_COLOR : PAPER_CONTACT_COLOR),
      finish: (ctx, source, options = {}) => sharedPaperFinishPass(ctx, source,
        anchorPaperPattern(sharedPaperPatternFor(ctx, preset),
          paperTextureCameraX(ctx.__paperCamX || 0, paperTextureSpeedOf(settings.paperTextureSpeed)), 0),
        { alpha: paperStrengths.ground, ...options, rim: false }),
      material: PAPER_MATERIALS[preset], paper: true,
      textureSpeed: paperTextureSpeedOf(settings.paperTextureSpeed),
      groundStrength: paperStrengths.ground,
    };
    pack.lightBg = true;
    pack.paperSkyStatic = false;
    // Keep each preview cabinet's authored ground painter and palette, then
    // lay one shared material over its solid apron. Routes and terrain receive
    // the same adapter below in run.js; gaps and tunnel overhangs stay cut out.
    if (typeof pack.ground === 'function') {
      const authoredGround = pack.ground;
      pack.ground = (ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) => {
        authoredGround(ctx, camX, cab, obstacles, overhangs, t, viewW, portraitViewW);
        const width = Number.isFinite(portraitViewW) ? portraitViewW
          : Number.isFinite(viewW) ? viewW : W;
        if (cab?.id !== 'plumber') {
          drawPaperApronTexture(ctx, camX, obstacles, overhangs, width, preset,
            paperTextureSpeedOf(settings.paperTextureSpeed), paperStrengths.ground);
        }
      };
    }
  }
  if (!pack.decorate) pack.decorate = null;
  return pack;
}
