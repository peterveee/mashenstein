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

// Where the material's surface sits, as a fraction of the apron.
//
// AND THE APRON IS TWICE AS DEEP AS IT LOOKS. `H - GROUND_Y` is 38 WORLD px, and
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

// BOILING TAR — candidate C. Black, unlit, and the cheapest fill on the sheet:
// no gradient, no particles, four bubbles and a sheen.
//
// The sheen is not decoration. Tar is black and the bottom of a hole is dark,
// so without a highlight the material is indistinguishable from shadow and the
// pit is back to being empty. One pale ellipse is the entire difference between
// a liquid and a hole that happens to be darker at the bottom.
function tar(ctx, w, d, t) {
  const surf = d * PIT_FLOOR;
  ctx.fillStyle = '#141019';
  ctx.beginPath();
  ctx.moveTo(0, surf);
  ctx.quadraticCurveTo(w * 0.28, surf - d * 0.025, w * 0.52, surf);
  ctx.quadraticCurveTo(w * 0.78, surf + d * 0.02, w, surf - d * 0.012);
  ctx.lineTo(w, d); ctx.lineTo(0, d); ctx.closePath();
  ctx.fill();
  ellipse(ctx, w * 0.4, surf + d * 0.09, w * 0.26, d * 0.035, '#6b5c80', 0.32);
  ellipse(ctx, w * 0.76, surf + d * 0.15, w * 0.13, d * 0.025, '#8a7f99', 0.16);
  // Bubbles inflate above the surface, then pop into a ring. Phased off the
  // pit's own x so two holes on one screen are never in step — the give-away
  // that a hazard is a stamp rather than a place.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.26) % 1;
    const x = w * (0.14 + i * 0.24);
    const rMax = d * (i % 2 === 0 ? 0.09 : 0.055);
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

const FILLS = { tar };

/**
 * Paint one pit's material. `x`/`y0` are the screen position of the break's
 * top-left — its left lip on the groundline — and `d` is the apron depth below
 * that. `phase` shifts the animation so neighbouring pits are out of step.
 *
 * Clipped to the break, so a fill can never bleed onto the road either side:
 * the ground has already been drawn by the time this runs, and a material that
 * painted over it would be reporting a hole wider than the one you fall into.
 */
export function drawPitFill(ctx, id, x, y0, w, d, t = 0, phase = 0) {
  const paint = FILLS[id];
  if (!paint || w <= 0 || d <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y0, w, d);
  ctx.clip();
  ctx.translate(x, y0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  paint(ctx, w, d, t + phase);
  ctx.restore();
}

export function hasPitFill(id) { return !!FILLS[id]; }
