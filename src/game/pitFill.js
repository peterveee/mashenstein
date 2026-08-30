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
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.29) % 1;
    const x = w * (i % 2 ? 0.08 : 0.9) + Math.sin(i * 3) * w * 0.02;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - p * 0.7);
    ctx.fillStyle = '#2a2c36';
    ctx.fillRect(x, d * 0.05 + p * d * 0.9, Math.max(0.25, w * 0.012), Math.max(0.25, w * 0.022));
    ctx.restore();
  }
}

// MOLTEN CHANNEL — candidate B, ported for Speed's collapsing road. The one
// fill that throws light: the glow climbs the break toward the groundline, so
// the mouth reads hot even while the material sits below the fold. Two value
// steps instead of a gradient (a gradient collapses into one beige band at
// lane size), crust plates so it is a material and not a lamp. The sheet's
// road-spill and haze do not survive the y=0 clip and are dropped.
function lava(ctx, w, d, t) {
  const surf = d * PIT_FLOOR;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, surf - d * 0.06, w, d - surf + d * 0.06); ctx.clip();
  poly(ctx, '#f2621d', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 8; i++) p.lineTo(w * (i / 8), surf + Math.sin(t * 1.6 + i * 0.9) * d * 0.018);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  ctx.save(); ctx.globalAlpha = 0.8;
  for (let i = 0; i < 4; i++) {
    const k = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.6);
    ctx.fillStyle = k > 0.6 ? '#ffef9e' : '#ffb02e';
    ctx.beginPath();
    ctx.ellipse(w * (0.16 + i * 0.23), surf + d * (0.13 + 0.04 * k), w * 0.1, d * 0.055 * (0.6 + k), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const x = ((t * 3.5 + i * w * 0.42) % (w * 1.3)) - w * 0.15;
    poly(ctx, '#40201a', '#6d2410', Math.max(0.12, w * 0.008), (p) => {
      p.moveTo(x, surf + d * 0.03); p.lineTo(x + w * 0.16, surf + d * 0.01);
      p.lineTo(x + w * 0.2, surf + d * 0.09); p.lineTo(x + w * 0.03, surf + d * 0.1); p.closePath();
    });
  }
  ctx.restore();
  glowUp(ctx, w, surf, d * 0.38, 'rgba(255,120,30,1)', 0.34);
  // Embers off the melt. They rise past the groundline and the clip eats them
  // there, which is fine — they have faded to nearly nothing by then anyway.
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.4 + i / 5) % 1;
    const ex = w * (0.12 + ((i * 0.37) % 0.76)) + Math.sin(i * 2.1 + p * 4.6) * w * 0.05;
    const er = w * 0.016 * (1 - p * 0.5);
    ellipse(ctx, ex, d * 0.4 - p * d * 0.8, er, er, '#ffca55', Math.max(0, 1 - p) * 0.85);
  }
}

// BLACK SLUSH — candidate H, Frost's. Black water, pale floes with dark
// undersides at the waterline, and cold vapour that DRIFTS rather than rises —
// the frost cabinet's whole idiom is slow, and a fast plume would read as
// steam and therefore hot.
function slush(ctx, w, d, t) {
  const surf = d * PIT_FLOOR;
  poly(ctx, '#0d2334', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 6; i++) p.lineTo(w * (i / 6), surf + Math.sin(t * 1.1 + i * 1.2) * d * 0.01);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  ellipse(ctx, w * 0.46, surf + d * 0.09, w * 0.28, d * 0.03, '#79b6d8', 0.22);
  for (let i = 0; i < 3; i++) {
    const x = ((t * 1.6 + i * w * 0.4) % (w * 1.2)) - w * 0.12;
    poly(ctx, '#2b5b74', null, 0, (p) => {
      p.moveTo(x, surf + d * 0.02); p.lineTo(x + w * 0.17, surf + d * 0.005);
      p.lineTo(x + w * 0.15, surf + d * 0.07); p.lineTo(x + w * 0.02, surf + d * 0.075); p.closePath();
    });
    poly(ctx, '#cfe9f5', '#7ba8c0', Math.max(0.1, w * 0.007), (p) => {
      p.moveTo(x, surf + d * 0.02); p.lineTo(x + w * 0.16, surf - d * 0.005);
      p.lineTo(x + w * 0.17, surf + d * 0.005); p.lineTo(x + w * 0.005, surf + d * 0.03); p.closePath();
    });
  }
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.22 + i * 0.34) % 1;
    const vr = w * (0.05 + 0.1 * p);
    ellipse(ctx, w * (0.25 + i * 0.26) + p * w * 0.1, Math.max(0, surf - p * d * 0.3),
      vr, vr, '#cfe9f5', 0.2 * (1 - p));
  }
}

// IRON TEETH — the crossing's material, and the only fill in the set that is
// not a liquid.
//
// The other three are things you sink into, which is why they are painted as a
// surface with weather on it. A spike bed has no surface: it is a row of
// objects, and everything it has to say it says with silhouette — which is
// lucky, because it says it at lane size, from the road, standing still, with
// no glow and no animation to lean on. A player who has never seen this hole
// before has to know from one glance that it is not a hole to land in.
//
// Fixed PITCH rather than a fixed count. A crossing is several hundred pixels
// wide and an ordinary pit is sixty, and teeth that divided the width would be
// railings on one and a comb on the other. Nine pixels puts a tooth roughly
// every hero-width, so the bed reads the same in both.
function spikes(ctx, w, d, t) {
  const tip = d * SPIKE_TIPS;
  // The bed the teeth are set in — a little under half the apron, which is the
  // whole of what the camera actually shows below the lane (see PIT_FLOOR).
  const bed = d * 0.44;
  // THE SHAFT IS PART OF THE FILL, and it is the one thing the other three
  // materials do not have to draw.
  //
  // They are poured into holes the style packs have already cut: a pixel or a
  // watercolour lane paints its own dark apron either side of the break, so tar
  // only has to be the thing lying at the bottom of it. Three of the nine packs
  // paint no apron at all — an LCD lane is a line and a hole in it is a lighter
  // line — and a crossing is on the stage whatever the cabinet is. Teeth
  // floating on the panel background read as scenery. A dark shaft under the
  // lip reads as a hole, everywhere, for the price of one rectangle.
  ctx.fillStyle = '#171620';
  ctx.fillRect(0, 0, w, d);
  ctx.fillStyle = '#211f2b';
  ctx.fillRect(0, bed, w, d - bed);
  const pitch = 9;
  const n = Math.max(2, Math.round(w / pitch));
  const step = w / n;
  const half = step * 0.44;
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    // Alternating heights, and the short ones are not decoration: a row of
    // identical teeth reads as a texture and a ragged one reads as a thing that
    // has been used. The long ones are the ones the eye measures the gap by.
    const top = i % 2 === 0 ? tip : tip + d * 0.1;
    // Two facets, split down the spine: steel catches the light on one side of
    // a point and is in its own shadow on the other, and drawing the pair is
    // the whole of why these read as metal rather than as grey triangles.
    ctx.fillStyle = '#96a3b1';
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx - half, bed + d * 0.02);
    ctx.lineTo(cx, bed + d * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a5460';
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx + half, bed + d * 0.02);
    ctx.lineTo(cx, bed + d * 0.02);
    ctx.closePath();
    ctx.fill();
    // The point itself, kept pale against both facets. At lane size a tooth is
    // a few pixels of triangle and the tip is one of them, so it is drawn
    // rather than left to the fill to imply.
    ctx.fillStyle = '#e4eaf1';
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx - half * 0.34, top + d * 0.055);
    ctx.lineTo(cx + half * 0.34, top + d * 0.055);
    ctx.closePath();
    ctx.fill();
  }
  // ONE glint, travelling. The bed is otherwise still, and a hazard with no
  // motion at all falls out of the eye on a scrolling screen — but teeth do not
  // bubble or flicker, so what moves is the LIGHT on them: once across the row,
  // slowly, the way a highlight crosses a knife.
  const p = (t * 0.22) % 1.6;
  const gx = -w * 0.1 + p * w * 0.75;
  if (gx > -w * 0.05 && gx < w * 1.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ellipse(ctx, gx, tip + d * 0.04, Math.max(0.5, w * 0.012), d * 0.06, '#ffffff');
    ctx.restore();
  }
}

const FILLS = { tar, void: voidFill, lava, slush, spikes };

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
