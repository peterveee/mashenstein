// What lies at the bottom of a hole in the floor.
//
// A `gap` obstacle carves the ground away and the style packs draw the hole by
// NOT drawing — so the sky, the hills and any road below all show straight
// through it (see drawGapsAwareGround). That is the right picture for a hole
// and it is not, on its own, a picture of a FATAL hole: a break with nothing in
// it is only distinguishable from the lane either side by the ground stopping,
// which is the least a pit can say for itself now that falling in ends the run.
//
// This is the other half. A cabinet names a fill (`pitFill` in data/cabinets.js)
// and every pit on it gets that material lying on the FLOOR of the break — not
// plugging it. The break stays open above the material, which is the whole
// finding of the bake-off (src/dev/pit-candidates.js): the top of a hole is for
// seeing through, and the bottom of it is for the thing that kills you.
//
// Painters draw into a local box: x from 0 to w, y from 0 at the groundline
// down to y = d at the bottom of the apron. They may not paint above y = 0 and
// they may not paint across the open part of the break.

// The two HARD fills — spike beds and gear works — live in their own module,
// which also decides which of the shipped designs each pit gets.
import { spikes, gears } from './pitFillHard.js';

// The authored pit shaft is 38 world pixels deep. Keep the liquid surface and
// its local detail independent of the presentation frame: portrait expands the
// visible canvas height, but it does not move the material's near surface.
export const PIT_APRON_DEPTH = 38;

// Where the material's surface sits, as a fraction of the apron.
//
// AND THE APRON IS TWICE AS DEEP AS IT LOOKS. The 38-world-pixel apron is
// the camera magnifies the world band by ZOOM — so 38 world px of apron is 76
// screen px against a frame with only 38 below the groundline. The bottom half
// of every pit in this game is off the bottom of the screen, and the camera only
// reaches it when the crane lifts for a jump.
//
// So "at the bottom" has to mean the bottom of what is VISIBLE, not the bottom
// of what is modelled. 0.32 puts the surface 12 world px down, leaving about
// seven of tar between it and the fold at 19 — a band you can see from the road,
// standing still, without jumping. At 0.72 (which is where this started, and
// where the bake-off sheet drew it) the material was 27 world px down: correct
// on a card that shows the whole shaft, and invisible in the game.
//
// Kept in step with PIT_SURFACE_Y in game/run.js, which is what a falling hero
// stops at. The number the death lands on and the number the art draws to have
// to be the same one, or he sinks into thin air.
export const PIT_FLOOR = 0.32;

// HOW HIGH THE TEETH REACH, as a fraction of the apron — measured from the
// groundline down, so a SMALLER number is a taller spike.
//
// Just under the lip, and deliberately not level with it. Tips flush with the
// road would be a line, and a line is what the broken edge of the ground
// already draws; a hand's breadth of shadow above them is what says these are
// standing IN a hole rather than lying on a floor. It is also the altitude a
// falling hero stops at (SPIKE_SURFACE_Y in game/run.js), which is the other
// reason it cannot drift: he lands on the tips the art draws, or on nothing.
export const SPIKE_TIPS = 0.13;
// The same measurement for the works: where the top of the wheels comes to.
//
// Deeper than the teeth, because a gear is a body rather than a point — its
// widest part is well below whatever the lip can see, and bringing the rim up
// to spike height would put half a wheel above the ground line with nothing to
// turn in. A fifth of the apron leaves the top third of the wheel visible from
// the road standing still, which is all it needs: what says GEAR is the turning,
// and the turning is at the rim.
export const GEAR_TOPS = 0.2;

// Portrait gives the pit apron much more vertical room than the shipped
// landscape frame. Keep the hazard at the authored scale, then close a dry
// mechanical bay with a short boundary line instead of extending a shaft.
export const HARD_FILL_BORDER_GAP = 12;
export const HARD_FILL_LANDSCAPE_DEPTH = 96;
// Dry portrait bays are rendered in the same one-pixel logical grid as the
// rest of the authored canvas. Keep the cutoff on that grid, and always round
// it toward the lower edge of the visible background so the hazard silhouette
// never gets covered by its own closing rule.
export const HARD_FILL_GRID = 1;

const DRY_PIT_LINE_LIGHT = '#59636f';
const DRY_PIT_LINE_DARK = '#232a34';

const TAU = Math.PI * 2;

function ellipse(ctx, cx, cy, rx, ry, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.2, rx), Math.max(0.15, ry), 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Portrait gives the fill body more room to run, but the readable liquid
// surface stays at the authored shaft depth. The body itself still uses the
// caller's full `d`, so lava and tar continue all the way to the screen edge.
export function liquidSurfaceDepth(d) {
  return Math.min(d, PIT_APRON_DEPTH);
}

function snapHardFillCutoff(value, d) {
  return Math.min(d, Math.ceil(value / HARD_FILL_GRID) * HARD_FILL_GRID);
}

// BOILING TAR — candidate C. Black, unlit, and the cheapest fill on the sheet:
// no gradient, no particles, four bubbles and a sheen.
//
// The sheen is not decoration. Tar is black and the bottom of a hole is dark,
// so without a highlight the material is indistinguishable from shadow and the
// pit is back to being empty. One pale ellipse is the entire difference between
// a liquid and a hole that happens to be darker at the bottom.
function tar(ctx, w, d, t) {
  const detailD = liquidSurfaceDepth(d);
  const surf = detailD * PIT_FLOOR;
  ctx.fillStyle = '#141019';
  ctx.beginPath();
  ctx.moveTo(0, surf);
  ctx.quadraticCurveTo(w * 0.28, surf - detailD * 0.025, w * 0.52, surf);
  ctx.quadraticCurveTo(w * 0.78, surf + detailD * 0.02, w, surf - detailD * 0.012);
  ctx.lineTo(w, d); ctx.lineTo(0, d); ctx.closePath();
  ctx.fill();
  ellipse(ctx, w * 0.4, surf + detailD * 0.09, w * 0.26, detailD * 0.035, '#6b5c80', 0.32);
  ellipse(ctx, w * 0.76, surf + detailD * 0.15, w * 0.13, detailD * 0.025, '#8a7f99', 0.16);
  // Bubbles inflate above the surface, then pop into a ring. Phased off the
  // pit's own x so two holes on one screen are never in step — the give-away
  // that a hazard is a stamp rather than a place.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.26) % 1;
    const x = w * (0.14 + i * 0.24);
    const rMax = detailD * (i % 2 === 0 ? 0.09 : 0.055);
    if (p < 0.74) {
      const r = rMax * (0.25 + p);
      ctx.fillStyle = '#1d1826';
      ctx.beginPath(); ctx.arc(x, surf - r * 0.5, Math.max(0.2, r), 0, TAU); ctx.fill();
      ctx.strokeStyle = '#08060c';
      ctx.lineWidth = Math.max(0.3, w * 0.008);
      ctx.stroke();
      ellipse(ctx, x - r * 0.32, surf - r * 0.9, r * 0.24, r * 0.24, '#7a6b8f');
    } else {
      const k = (p - 0.74) / 0.26;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#5b4d6e';
      ctx.lineWidth = Math.max(0.35, w * 0.01);
      ctx.beginPath();
      ctx.arc(x, surf - rMax * 0.35, Math.max(0.2, rMax * (0.45 + k * 0.45)), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Shared bits for the ported bake-off painters. `poly` is the sheet's `path`
// helper trimmed to what these three use; the glow and ember helpers keep the
// sheet's shapes but everything above the groundline is gone — drawPitFill
// clips at y = 0, so the sheet's SPILL device (light thrown onto the road)
// cannot survive the port and is dropped rather than half-drawn.
function poly(ctx, fill, stroke, width, fn) {
  ctx.beginPath();
  fn(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function glowUp(ctx, w, surf, span, color, alpha) {
  const top = Math.max(0, surf - span);
  if (surf <= top) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, surf, 0, top);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, surf - top);
  ctx.restore();
}

// OPEN AIR — candidate A, and free. Nothing but grit falling off the broken
// edges: the minimum motion that says the hole is real and still coming apart.
// Cardboard's pick on purpose — a kingdom whose castle is four inches tall gets
// a hole that is honestly just a hole cut out of the set.
function voidFill(ctx, w, d, t) {
  const bottom = hardFillCutoff('void', w, d);
  const gritDepth = Math.min(d, bottom);
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.29) % 1;
    const x = w * (i % 2 ? 0.08 : 0.9) + Math.sin(i * 3) * w * 0.02;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - p * 0.7);
    ctx.fillStyle = '#2a2c36';
    ctx.fillRect(x, gritDepth * 0.05 + p * gritDepth * 0.9,
      Math.max(0.25, w * 0.012), Math.max(0.25, w * 0.022));
    ctx.restore();
  }
  if (bottom < d) drawDryPitLine(ctx, w, bottom);
}

// MOLTEN CHANNEL — candidate B, ported for Speed's collapsing road. The one
// fill that throws light: the glow climbs the break toward the groundline, so
// the mouth reads hot even while the material sits below the fold. Two value
// steps instead of a gradient (a gradient collapses into one beige band at
// lane size), crust plates so it is a material and not a lamp. The sheet's
// road-spill and haze do not survive the y=0 clip and are dropped.
function lava(ctx, w, d, t) {
  const detailD = liquidSurfaceDepth(d);
  const surf = detailD * PIT_FLOOR;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, surf - detailD * 0.06, w, d - surf + detailD * 0.06); ctx.clip();
  poly(ctx, '#f2621d', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 8; i++) p.lineTo(w * (i / 8), surf + Math.sin(t * 1.6 + i * 0.9) * detailD * 0.018);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  ctx.save(); ctx.globalAlpha = 0.8;
  for (let i = 0; i < 4; i++) {
    const k = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.6);
    ctx.fillStyle = k > 0.6 ? '#ffef9e' : '#ffb02e';
    ctx.beginPath();
    ctx.ellipse(w * (0.16 + i * 0.23), surf + detailD * (0.13 + 0.04 * k), w * 0.1, detailD * 0.055 * (0.6 + k), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const x = ((t * 3.5 + i * w * 0.42) % (w * 1.3)) - w * 0.15;
    poly(ctx, '#40201a', '#6d2410', Math.max(0.12, w * 0.008), (p) => {
      p.moveTo(x, surf + detailD * 0.03); p.lineTo(x + w * 0.16, surf + detailD * 0.01);
      p.lineTo(x + w * 0.2, surf + detailD * 0.09); p.lineTo(x + w * 0.03, surf + detailD * 0.1); p.closePath();
    });
  }
  ctx.restore();
  glowUp(ctx, w, surf, detailD * 0.38, 'rgba(255,120,30,1)', 0.34);
  // Embers off the melt. They rise past the groundline and the clip eats them
  // there, which is fine — they have faded to nearly nothing by then anyway.
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.4 + i / 5) % 1;
    const ex = w * (0.12 + ((i * 0.37) % 0.76)) + Math.sin(i * 2.1 + p * 4.6) * w * 0.05;
    const er = w * 0.016 * (1 - p * 0.5);
    ellipse(ctx, ex, detailD * 0.4 - p * detailD * 0.8, er, er, '#ffca55', Math.max(0, 1 - p) * 0.85);
  }
}

// BLACK SLUSH — candidate H, Frost's. Black water, pale floes with dark
// undersides at the waterline, and cold vapour that DRIFTS rather than rises —
// the frost cabinet's whole idiom is slow, and a fast plume would read as
// steam and therefore hot.
function slush(ctx, w, d, t) {
  const detailD = liquidSurfaceDepth(d);
  const surf = detailD * PIT_FLOOR;
  poly(ctx, '#0d2334', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 6; i++) p.lineTo(w * (i / 6), surf + Math.sin(t * 1.1 + i * 1.2) * detailD * 0.01);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  ellipse(ctx, w * 0.46, surf + detailD * 0.09, w * 0.28, detailD * 0.03, '#79b6d8', 0.22);
  for (let i = 0; i < 3; i++) {
    const x = ((t * 1.6 + i * w * 0.4) % (w * 1.2)) - w * 0.12;
    poly(ctx, '#2b5b74', null, 0, (p) => {
      p.moveTo(x, surf + detailD * 0.02); p.lineTo(x + w * 0.17, surf + detailD * 0.005);
      p.lineTo(x + w * 0.15, surf + detailD * 0.07); p.lineTo(x + w * 0.02, surf + detailD * 0.075); p.closePath();
    });
    poly(ctx, '#cfe9f5', '#7ba8c0', Math.max(0.1, w * 0.007), (p) => {
      p.moveTo(x, surf + detailD * 0.02); p.lineTo(x + w * 0.16, surf - detailD * 0.005);
      p.lineTo(x + w * 0.17, surf + detailD * 0.005); p.lineTo(x + w * 0.005, surf + detailD * 0.03); p.closePath();
    });
  }
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.22 + i * 0.34) % 1;
    const vr = w * (0.05 + 0.1 * p);
    ellipse(ctx, w * (0.25 + i * 0.26) + p * w * 0.1, Math.max(0, surf - p * detailD * 0.3),
      vr, vr, '#cfe9f5', 0.2 * (1 - p));
  }
}

// IRON TEETH and THE WORKS — the crossings' materials, and the only fills in
// the set that are not liquids. They are painted in game/pitFillHard.js (the
// 24 Sep bake-off's winners, mixed per pit); what stays here is the geometry
// they share with game/run.js — SPIKE_TIPS, GEAR_TOPS, the portrait cutoff.
//
// A hole in this game is SEEN THROUGH — the sky, the hills and the parallax
// all read straight down it — so a hard fill is the hazard and the plate under
// it and nothing laid across the break; the depth comes from the ROAD standing
// up either side (CROSSING_ROAD_RISE in game/run.js).

/**
 * Return the lower boundary of a dry pit. `d` is the full apron depth passed by
 * the world renderer. Landscape's apron is short enough that the historical
 * full-depth treatment is unchanged; portrait puts a line just below the
 * authored teeth, gear train, or empty bay and leaves the normal background
 * visible below it.
 */
export function hardFillCutoff(id, w, d) {
  if (!(d > HARD_FILL_LANDSCAPE_DEPTH)) return d;
  const detailD = liquidSurfaceDepth(d);
  if (id === 'void') {
    // An open-air pit has no hazard to seat, but it still needs a finite
    // portrait bay so the background does not read as an endless shaft.
    return snapHardFillCutoff(detailD * 0.84, d);
  }
  if (id === 'spikes') {
    return snapHardFillCutoff(detailD * 0.5 + HARD_FILL_BORDER_GAP, d);
  }
  if (id === 'gears') {
    const pitch = 26;
    const n = Math.max(2, Math.round(w / pitch));
    const step = w / n;
    const big = Math.min(step * 0.52, detailD * 0.26);
    // Gear teeth can reach 1.15r beyond the wheel centre. Leave a small
    // breathing gap below that silhouette before the bay's bottom edge.
    // The wheel centre is one radius below its top, and the teeth extend 1.15r
    // beyond that centre. The boundary must clear the complete silhouette.
    return snapHardFillCutoff(
      detailD * GEAR_TOPS + big * 2.15 + HARD_FILL_BORDER_GAP, d);
  }
  return d;
}

function drawDryPitLine(ctx, w, y) {
  ctx.fillStyle = DRY_PIT_LINE_LIGHT;
  ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = DRY_PIT_LINE_DARK;
  ctx.fillRect(0, y + 1, w, 1);
}

const FILLS = { tar, void: voidFill, lava, slush, spikes, gears };

/**
 * WHAT A FALLING HERO MEETS, per material — and whether it takes him.
 *
 * A liquid has a surface he goes UNDER, which is what PIT_FLOOR describes and
 * what every fill here used to be. The two hard fills stop him on top of
 * themselves instead, and where they stop him is the height their art actually
 * reaches: the tips of the teeth, the top of the wheels. One number each, read
 * by game/run.js for the death and by the painters for the drawing, or he is
 * impaled on air.
 *
 * `hard` is the rest of the beat: no plunge, no sink, and the harder cue.
 */
export const FILL_SURFACE = {
  spikes: { at: SPIKE_TIPS, hard: true },
  gears: { at: GEAR_TOPS, hard: true },
};
export function fillSurface(id) { return FILL_SURFACE[id] || { at: PIT_FLOOR, hard: false }; }

/**
 * Paint one pit's material. `x`/`y0` are the screen position of the break's
 * top-left — its left lip on the groundline — and `d` is the apron depth below
 * that. `phase` shifts the animation so neighbouring pits are out of step.
 * `groundFill` is the level's ordinary ground colour for the solid section
 * below a portrait dry-pit boundary; liquid fills leave it unused.
 * `env` is only read by the hard fills (game/pitFillHard.js): `seed` (the pit's
 * world x — which design each bay gets), `cab`, `crossing`, `beat`,
 * `paperSlab`. Every key is optional.
 *
 * Clipped to the break, so a fill can never bleed onto the road either side:
 * the ground has already been drawn by the time this runs, and a material that
 * painted over it would be reporting a hole wider than the one you fall into.
 */
export function drawPitFill(ctx, id, x, y0, w, d, t = 0, phase = 0, lift = 0, groundFill = null, env = null) {
  const paint = FILLS[id];
  if (!paint || w <= 0 || d <= 0) return;
  ctx.save();
  ctx.beginPath();
  // `lift` opens the clip UPWARD by however far the ground rises above the flat
  // line over this break — see shaft(). Zero everywhere the lane is flat, which
  // is most cabinets, and the only reason a painter may put anything above y=0.
  // The body uses the full presentation apron. Liquid painters clamp only
  // their surface/detail depth so portrait lava and tar reach the lower edge.
  ctx.rect(x, y0 - lift, w, d + lift);
  ctx.clip();
  ctx.translate(x, y0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // A dry pit has a real ground/floor beneath its hazard. Paint that lower
  // section before the hazard painter so the boundary line remains on top and
  // the level's normal texture/post pass can continue across the fill.
  const bottom = hardFillCutoff(id, w, d);
  if (bottom < d && groundFill) {
    ctx.fillStyle = groundFill;
    // Overlap the boundary by one logical pixel. The dry-pit line is painted
    // afterward, so this closes fractional-scaling seams without softening the
    // visible edge.
    const floorTop = Math.max(0, bottom - 1);
    ctx.fillRect(-1, floorTop, w + 2, Math.max(0, d - floorTop + 1));
  }
  paint(ctx, w, d, t + phase, lift, env);
  ctx.restore();
}

export function hasPitFill(id) { return !!FILLS[id]; }
