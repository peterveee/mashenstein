// THE ROAD SHOWS ITS ASKS.
//
// A beat stage's lane is already quantised — BeatSpawner lays chart slot k at
// `playerX + (k - beat) * pxPerBeat` and re-anchors every fill — so every
// action the chart wants has an exact place on the ground as well as an exact
// moment in the song. This paints that place: a stripe across the road wherever
// a button is owed, swelling on the beat the way the ribbon's glyphs do.
//
// IT ADDS NO INFORMATION. The beat ribbon (hud.js) already names every upcoming
// action four and a half beats out; this moves that same reading off a strip at
// the top of the screen and into the band the eye is already on. Which is a
// thing this game has done before and kept: markCrossingStones lays one coin at
// the exact takeoff point, and calls itself "the cheapest assist there is" on a
// cabinet whose difficulty is WHEN rather than WHERE.
//
// ONLY THE ASKS, AND ONLY THE THREE VERBS. There is no mark on every beat. A
// grid was drawn here first and taken out: the metronome is already audible,
// already on the ribbon, and already in the beat bars, and a stripe on every
// beat spent most of its ink saying nothing was owed. What is left says one
// thing only, which is the thing worth saying.
//
// PAINT ON THE ROAD, NOT LIGHT OVER IT. The one way this fails is the way the
// boost pad's pre-glow failed, twice: a translucent wash ahead of the hero,
// attached to nothing, reading as a UI element someone left on the field (see
// drawBoostReaction in draw.js). So the mark is bedded, sunk, conformed to the
// local slope, and sized to the art rather than to a hitbox — the mistake that
// retired the high-contrast outlines. If it stops looking like something
// painted onto the lane, it is wrong, however well it reads.

import { GROUND_Y } from '../engine/camera.js';
import { LCD_ROAD_INK } from '../engine/stylePacks/index.js';

// THE SAME GLYPHS AS THE RIBBON. SHAPE IS THE INPUT.
//
// This started as a plain stripe across the lane and it barely read: a soft
// gold bar on the LCD panel's pale yellow-green is two colours of nearly the
// same hue AND the same value, so there was no edge anywhere in it. Colour was
// being asked to carry the whole mark, and on this cabinet colour is the one
// thing that cannot. (The gold itself is gone now too — see ACTION_INK — but
// the lesson that retired the bar is the reason these are shapes at all.)
//
// So the road draws the ribbon's own shapes — up-arrow to jump, down-arrow to
// duck, ring to shoot — under the ribbon's own law: the direction is read off
// the SHAPE, and the colour only confirms which object is arriving. It costs
// nothing to learn, because it is not a second vocabulary; it is the strip's
// vocabulary, painted where the feet are. And an arrow painted on a road is
// what road paint has always looked like, so leaning into signage here is not
// a departure from "paint on the road" — it is the most literal reading of it.
//
// EVERY GLYPH IS OUTLINED. One pixel of the road's own dark ink around the fill
// is what makes a light shape survive a light road; without it the arrow is
// only as legible as the contrast between its colour and whatever it is lying
// on, which is exactly the bet that failed. This is not the mistake that
// retired the high-contrast outlines — those were drawn at hitbox size around
// art a third larger, so they fitted nothing. This outline is the glyph's own
// edge, at the glyph's own size.
//
// Sunk below the surface line rather than sitting on it: the lcd road caps
// itself with LCD_ROAD_INK of opaque ink, and a glyph drawn into that is a glyph
// drawn under something. One past the cap and no more — the mark wants to be ON
// the lip, close enough that it reads as belonging to the edge the hero runs
// along rather than as something lying further down the road's face. Derived
// rather than copied: the cap came down from 3 to 1, and the hardcoded 4 this
// used to be would have left every glyph floating clear of the edge it belongs
// to — marked on the road's face instead of on its lip.
const SINK = LCD_ROAD_INK + 1;
// World px, and deliberately smaller than the hero (12 wide) — a marking the
// runner passes over, not a sign he stands beside.
const GLYPH_HALF_W = 3.6;
const GLYPH_H = 5.5;
// Thin enough to be an edge rather than a second shape. A heavier line at this
// size stops reading as a border and starts eating the fill it is meant to
// define, which is the whole failure mode of outlining something small.
const OUTLINE_W = 1;

// The ribbon's own swell, on the ribbon's own curve (RIBBON_PULSE, hud.js:146):
// the glyph is 25% larger on the beat and back to its own size by the end of
// it. Kept identical on purpose — the strip and the road are showing the same
// event, and two different heartbeats for one chart is how they start looking
// like two systems.
const PULSE = 0.25;

// THE ROAD ONLY EVER ASKS FOR A BUTTON. Jump, duck, shoot — the three verbs the
// game actually has — and nothing else. A coin is not an ask: it is scored by
// running into it, it needs no timing, and marking one puts a stripe on the
// road that answers a question nobody was posed. The ribbon still carries them,
// which is the right place for a thing worth knowing about and not worth
// acting on.
const ASKS = new Set(['jump', 'duck', 'ability']);

// COLOUR IS THE OBJECT. Exported and imported BY the ribbon rather than copied
// from it: the strip and the road are drawing the same events, and two lists of
// the same four colours is how they start disagreeing about what colour a
// barrel is. An action with no ink here is an action neither surface speaks
// about.
//
// JUMP IS GREEN, NOT GOLD. Gold was the first ink here and it lost on two
// counts. It is the coin's colour everywhere else in the game — the pill, the
// bonus panel, the pickup itself — so the one mark on the road that means DO
// SOMETHING wore the livery of the one thing that asks for nothing. And on this
// cabinet it had no value contrast to spend: the LCD road is pale yellow-green,
// gold is pale yellow, and a bake-off of the two surfaces side by side (the
// strip's dark plate and the road's cream) showed the road glyph surviving on
// its outline alone. Green is the one hue the strip had left — cyan is duck,
// wood is the barrel, pink is the ability ring, white is the coin tick, and the
// playhead took vermilion — and it is a full value step down from the road.
//
// The duck keeps its cyan. Deepening it read better on the road in the bake-off
// and worse where it counts — the ribbon's dark plate is the surface duck most
// needs to survive, and a heavier blue goes muddy on it. On the road the duck
// is carried by its outline and its direction, as it was.
//
// The pair stays SHAPE-first: the direction is read off the triangle, and these
// two only confirm it.
export const ACTION_INK = {
  jump: '#3fbf5a',
  duck: '#72d8f0',
  barrel: '#d4a35e',
  ability: '#f890b8',
};

// The edge every glyph is drawn with, on the strip and on the road alike. Dark
// enough to hold a light shape against a light road, and on the ribbon's dark
// plate it reads as the inset that makes the two families look built the same
// way.
export const GLYPH_OUTLINE = 'rgba(18,24,46,0.9)';

function finite(n) { return typeof n === 'number' && Number.isFinite(n); }

/**
 * How much bigger a mark stands on this fraction of a beat, 1..1+PULSE.
 *
 * Phase, not `beatPulse`: the ribbon swells its glyphs off the chart clock and
 * pulses only its playhead off the analyser, deliberately, because the two
 * answer different questions. A mark on the road is a glyph.
 */
export function beatSwell(beat) {
  if (!finite(beat)) return 1;
  const phase = ((beat % 1) + 1) % 1;
  return 1 + PULSE * (1 - phase) ** 3;
}

/**
 * The gaps on screen, in WORLD x. The apron ticks skip holes for a reason — a
 * row of dashes marching over the void was the one mark on screen insisting
 * there was still ground there — and a stripe does the same thing louder.
 */
function gapSpans(obstacles) {
  const out = [];
  for (const ob of obstacles || []) {
    if (ob.live && ob.def && ob.def.isGap) out.push([ob.x, ob.x + ob.w]);
  }
  return out;
}

function inAnySpan(x, spans, pad = 0) {
  for (const [a, b] of spans) if (x > a - pad && x < b + pad) return true;
  return false;
}

/**
 * The chart's asks, in WORLD x, deduped by the position they stand at.
 *
 * The same sources the ribbon reads, for the same reason: the lane is the
 * authority on what was actually laid, and a mark derived from the chart rather
 * than from the lane would draw asks on beats a quiet pass skipped. Entities
 * carry `actionX` already — it IS "where the player must jump" — so only the
 * crossing set-pieces need placing, and they are placed off the grid origin
 * BeatSpawner itself snapped them to.
 */
export function beatGroundMarks(run, currentBeat, playerWorldX, pxPerBeat) {
  const marks = new Map();
  const add = (action, x, prop) => {
    if (!finite(x)) return;
    // Keyed to the pixel, not to the beat: two events that resolve to one spot
    // on the road are one stripe.
    const key = `${action}:${Math.round(x)}`;
    if (!marks.has(key)) marks.set(key, { action, worldX: x, prop });
  };
  for (const e of run.obstacles || []) {
    if (e.live && ASKS.has(e.chartAction)) add(e.chartAction, e.actionX, e.type);
  }
  // Pickups are read for the ability slot only. A card box asks for a button;
  // the coins beside it do not, and they are the bulk of what is in this list.
  for (const e of run.pickups || []) {
    if (e.live && ASKS.has(e.chartAction)) add(e.chartAction, e.actionX, e.type);
  }
  // An ability slot can be a timing marker with no entity of its own, so it is
  // the one thing that has to come off the lane's instance list to be seen.
  for (const e of run.spawner?.eventInstances || []) {
    if (e.live && e.chartAction === 'ability') add(e.chartAction, e.actionX, null);
  }
  // A crossing's ask is answered on a route stone rather than on a lane entity,
  // so it has a beat and no x of its own.
  for (const e of run.rhythmSetEvents || []) {
    if (!finite(e.beat) || !ASKS.has(e.action)) continue;
    if (!finite(playerWorldX) || !finite(currentBeat) || !finite(pxPerBeat)) continue;
    add(e.action, playerWorldX + (e.beat - currentBeat) * pxPerBeat, null);
  }
  return [...marks.values()];
}

/**
 * Paint the chart's asks onto the road. Called from drawFrame inside the world
 * band, after the routes and before the actors: on the road, under everything
 * that stands on it.
 */
export function drawBeatGround(ctx, run, cam, viewW, opts = {}) {
  const { beat, settings = null, laneCuts = null } = opts;
  if (!finite(beat) || !finite(cam) || !finite(viewW) || viewW <= 0) return;
  const speed = run.speed;
  const bpm = run.spawner?.bank?.bpm || 0;
  if (!finite(speed) || speed <= 0 || !bpm) return;
  // Derived from the LIVE speed rather than from a constant, which is what
  // makes ASSIST SPEED free: it scales baseSpeed, so it scales the marks with
  // the lane instead of sliding one against the other.
  const pxPerBeat = speed * 60 / bpm;
  if (!finite(pxPerBeat) || pxPerBeat <= 0) return;

  const playerWorldX = run.playerWorldX();
  if (!finite(playerWorldX)) return;
  // The ribbon adds the spawner's epoch because actionBeat values are minted in
  // the spawner's numbering; rhythmSetEvents are too, so the marks need the
  // same unwrapped clock.
  const currentBeat = beat + (run.spawner?.beatEpoch || 0);
  // REDUCED FLASHING KEEPS THE MARK AND DROPS THE SWELL. The mark is how the
  // stage is read, so it stays; what goes is the part that moves.
  const swell = settings?.reducedFlashing ? 1 : beatSwell(currentBeat);

  const gaps = gapSpans(run.obstacles);
  const cuts = (laneCuts || []).map((sp) => [sp.x, sp.x + sp.w]);
  const left = cam - GLYPH_HALF_W * 2;
  const right = cam + viewW + GLYPH_HALF_W * 2;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineJoin = 'round';
  for (const mark of beatGroundMarks(run, currentBeat, playerWorldX, pxPerBeat)) {
    if (mark.worldX < left || mark.worldX > right) continue;
    if (inAnySpan(mark.worldX, gaps, GLYPH_HALF_W) || inAnySpan(mark.worldX, cuts, GLYPH_HALF_W)) continue;
    const ink = ACTION_INK[mark.prop === 'barrel' ? 'barrel' : mark.action];
    if (!ink) continue;
    const hw = GLYPH_HALF_W * swell;
    const h = GLYPH_H * swell;
    // Centred on the action point — NOT rounded to it. Rounding a
    // camera-derived position is what turns a scrolling row of identical marks
    // into flicker rather than motion.
    const x = mark.worldX - hw;
    run.drawAtGround(ctx, x, () => {
      // GROUND_Y, not GROUND_Y + SINK: drawAtGround has already translated the
      // whole draw down by SINK, and adding it again here sank the glyph twice.
      drawGlyph(ctx, mark.action, mark.worldX - cam, GROUND_Y, hw, h, ink);
    }, hw * 2, SINK, cam);
  }
  ctx.restore();
}

/**
 * One ribbon glyph, painted flat on the road with `top` as its upper edge.
 *
 * Outline first and fill over it, so the dark edge is a halo the fill sits
 * inside rather than a stroke eating half the shape's own width.
 */
function drawGlyph(ctx, action, cx, top, hw, h, ink) {
  const bottom = top + h;
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = GLYPH_OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  if (action === 'ability') {
    // A RING, as on the strip. The shoot slot is the one ask with no direction
    // in it, so it is the one glyph without a point on it either.
    const r = Math.min(hw, h / 2);
    ctx.beginPath(); ctx.arc(cx, top + h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  if (action === 'jump') {
    ctx.moveTo(cx, top); ctx.lineTo(cx - hw, bottom); ctx.lineTo(cx + hw, bottom);
  } else {
    ctx.moveTo(cx, bottom); ctx.lineTo(cx - hw, top); ctx.lineTo(cx + hw, top);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.fill();
}
