// Gallery-only FATAL PIT treatments. Eight fills for the one hole in the floor.
//
// A pit is not a prop. Every other hazard in the game is an object that stands
// in the lane and can be drawn; this one is an ABSENCE — the `gap` obstacle
// carves the ground away and both terrain renderers leave a rectangle of
// nothing behind. What goes in that rectangle today is a flat black fill, one
// per style pack, and that is the whole of the art.
//
// It was enough while a pit cost a battery cell and hopped you back out. It is
// not enough now that falling in ends the run at the last checkpoint, because a
// hazard that expensive has to announce itself, and a hole has nothing to
// announce itself WITH. It has no silhouette: there is not one pixel of it
// above the floor line, and the floor line is where the player is looking.
//
// THE HOLE IS OPEN, AND IT IS A TOTAL SIDE-ON VIEW. That is the rule every
// candidate here is built on and the one thing none of them may break. A gap is
// a BREAK IN THE FLOOR — the ground is a slab seen edge-on and the gap is a
// straight notch out of it — so the background shows straight through it (the
// hills, the parallax, the sky, at full strength, with no wall and no
// perspective anywhere), and the deadly material lies on the FLOOR of the
// break, a long way down. The flat black fill the style packs paint today gets this
// backwards: it plugs the hole with the darkest value in the frame, which turns
// a hole into an object and hides the one thing that makes the drop read as a
// drop, which is being able to see past the road you are standing on.
//
// It also decides the whole sheet. With the top open and the material on the
// floor, the fill is BELOW the fold — see the geometry note — so what the
// player actually sees on the approach is the lip, and the light the material
// throws up the shaft. The three devices, named as the READ on every card:
//
//   LIP — furniture at the edges, on the ground rather than in the hole. Free,
//   works at any speed, invisible until you are nearly on it.
//   SPILL — light thrown up out of the pit onto the ground either side. The only
//   device that reads before the mouth is on screen; needs a luminous fill.
//   BREACH — something that crosses the floor line: haze, an arc, a spark, a
//   thrown ember. Strongest read, most expensive frame, and the hardest to earn
//   now that the material it comes off is at the bottom of the shaft.
//
// GEOMETRY, and it is tighter than it looks. A gap is 56 world px wide (72 off
// a boost pad) against a 24u hero, and the apron below the groundline is 38 —
// of which the camera at rest shows the top 19. That is the dashed REST line on
// the lane read, and it falls ABOVE every material band on this sheet. So a
// player standing on the road sees the hills through the break and nothing
// else; the lava is a glow before it is lava. That is the trade the open break makes, and
// judging these fills means judging their light and their lip first and their
// surface second.
//
// Painters fill a local box: x from 0 to w, y from 0 at the floor line down to
// y = d at the bottom of the apron, and they may draw ABOVE y = 0 for lip and
// breach. Nothing is drawn across the open part of the break: the caller's own
// background shows through it, and a fill that painted its own backdrop there
// would be a hole into a different world. Nothing
// here is registered as a gameplay entity and no fill is wired to any cabinet.
// Port a winner by moving its painter into the style packs' gap branch
// (engine/stylePacks/index.js); delete this file when the sheet is settled.

const TAU = Math.PI * 2;

const INK = '#171522';
const STEEL = '#98a3b1';
const STEEL_MID = '#5d6774';
const STEEL_DARK = '#333b46';
const WOOD = '#8a5a35';
const WOOD_DARK = '#4a3120';

// ------------------------------------------------------------------- helpers
function path(c, fill, stroke, line, fn) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) {
    c.strokeStyle = stroke; c.lineWidth = line;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
  }
}

function rr(c, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  c.moveTo(x + q, y);
  c.lineTo(x + w - q, y); c.quadraticCurveTo(x + w, y, x + w, y + q);
  c.lineTo(x + w, y + h - q); c.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  c.lineTo(x + q, y + h); c.quadraticCurveTo(x, y + h, x, y + h - q);
  c.lineTo(x, y + q); c.quadraticCurveTo(x, y, x + q, y); c.closePath();
}

function box(c, x, y, w, h, r, fill, ink = INK, line = 0.6) {
  path(c, fill, ink, line, (p) => rr(p, x, y, w, h, r));
}

function line(c, color, width, fn) { path(c, null, color, width, fn); }

function dot(c, x, y, r, fill, ink = null, width = 0.5) {
  path(c, fill, ink, width, (p) => p.arc(x, y, Math.max(0.05, r), 0, TAU));
}

function tri(c, x, y, halfW, height, fill, ink = INK, width = 0.5) {
  path(c, fill, ink, width, (p) => {
    p.moveTo(x - halfW, y); p.lineTo(x, y - height); p.lineTo(x + halfW, y); p.closePath();
  });
}

// THE BREAK IS NOT DRAWN. There is no shaft painter on this sheet any more, and
// that is the finding rather than an omission.
//
// Three passes got this wrong before it got it right. First a flat black fill
// (what the game ships): a hole plugged with the darkest value in the frame,
// which turns an absence into an object. Then a sky gradient painted into the
// mouth: the same mistake in a paler colour, and it read as a lightbox. Then
// tapered side walls and a shadow cast down the hole — a three-quarter view
// smuggled into what is a total side-on elevation, and there is no far wall in
// an elevation to catch either.
//
// What is actually correct is nothing at all. The ground is a slab seen
// edge-on; a gap is a straight notch out of it; the caller stops painting
// ground at one edge and starts again at the other, and THAT termination is the
// whole drawing. The background behind the lane — the same hills, the same
// value, unbroken — shows straight through. No inner faces, no lip furniture,
// no horizontal anything in line with the surface the hero is running on,
// because a line across the mouth is the one mark that makes a hole look like
// something you could walk over.
//
// So a painter here draws its MATERIAL and nothing else, at the bottom of the
// apron. What tells the player it is a hole is the ground stopping, and what
// tells them it is fatal is what is lying on the floor of it.

// The floor band the two MACHINE candidates are bedded into — the same band a
// liquid candidate gets, in steel rather than fluid. Without it the rollers and
// the rails hang in the background the break is showing, which reads as
// floating rather than as sitting at the bottom of a pit.
function bay(c, w, d, top, fill = '#141821', lip = '#2c3340') {
  path(c, fill, null, 0, (p) => { p.rect(0, top, w, d - top); });
  path(c, lip, null, 0, (p) => { p.rect(0, top, w, Math.max(0.4, d * 0.012)); });
}

// Where every material band on this sheet starts, as a fraction of the apron —
// the same number the game paints to (PIT_FLOOR in game/pitFill.js), and one
// number rather than eight so no candidate can win by quietly floating its
// surface up into the lane.
//
// It was 0.72 — the bottom of the shaft — until the first pit was rendered
// through the real camera and turned out to have nothing visible in it. The
// apron is 38 WORLD px and the camera magnifies the world band, so only its top
// 19 are ever on screen at rest: a fill at 0.72 sits 27 down, which is eight px
// below the bottom edge of the frame. Correct on a card that draws the whole
// shaft, invisible in the game the card is for.
//
// 0.32 is the bottom of what a player can actually SEE, which is the only
// bottom that matters. It also unwinds this sheet's loudest finding — every
// fill is below the fold, so only light and lip can carry a pit — because at
// this depth the material itself is in shot from the road.
const FLOOR = 0.32;

// Light thrown UP out of the pit onto the ground either side of it. Drawn above
// y = 0 in `lighter`, so it adds to whatever ground the style pack painted and
// never has to know what colour that was. The one device on this sheet that can
// be seen before the mouth itself is.
function spill(c, w, color, reach = 9, alpha = 0.5) {
  // A DOME, not a band. The first pass was a linear gradient over a fillRect,
  // which falls off vertically and not at all horizontally — so the light ended
  // at two hard vertical edges a few pixels past the lip and read as a pale
  // slab lying on the ground rather than as anything glowing out of the hole.
  // A radial falloff centred on the mouth has no edges to give itself away.
  const cx = w / 2;
  const r = w * 0.62 + reach;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha;
  const g = c.createRadialGradient(cx, 0, 0, cx, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  // Above the floor line only. Light spilling DOWN the shaft would be lighting
  // the pit with the pit's own glow, on top of whatever the fill already did.
  c.beginPath(); c.rect(cx - r, -r, r * 2, r); c.fill();
  c.restore();
}

// Light climbing off the material — and only just off it.
//
// The first pass ran this gradient from the surface to the top of the break at
// half strength, which is a WASH over the whole hole. A wash is
// indistinguishable from more sky: on the speed cabinet, whose sky is already
// orange, the lava pit stopped reading as a hole at all and read as a warm
// panel with some crust at the bottom. A glow has to have a top, or the break
// it is in stops being a break.
//
// A third of the depth, at a third of the strength. Enough that the material
// announces itself up the hole; short enough that the hills are still plainly
// visible above it, which is the thing the whole sheet is built on.
function glowUp(c, w, d, surf, color, rise = 0.32, alpha = 0.34) {
  const top = Math.max(0, surf - d * rise);
  if (surf <= top) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha;
  const g = c.createLinearGradient(0, surf, 0, top);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, top, w, surf - top);
  c.restore();
}

// Rising heat: vertical strokes that waver and fade, crossing the floor line.
function haze(c, w, t, color = '#ffb35c', n = 4, reach = 8, alpha = 0.3) {
  c.save(); c.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const x = w * (0.14 + i * (0.72 / Math.max(1, n - 1)));
    line(c, color, Math.max(0.3, w * 0.014), (p) => {
      p.moveTo(x, 1);
      p.quadraticCurveTo(x + Math.sin(t * 3.4 + i * 1.3) * w * 0.035, -reach * 0.55, x, -reach);
    });
  }
  c.restore();
}

function embers(c, w, d, t, n = 5, color = '#ffca55', rise = 14) {
  for (let i = 0; i < n; i++) {
    const p = (t * 0.4 + i / n) % 1;
    const ex = w * (0.12 + ((i * 0.37) % 0.76)) + Math.sin(i * 2.1 + p * 4.6) * w * 0.05;
    const ey = d * 0.4 - p * rise;
    c.save(); c.globalAlpha = Math.max(0, 1 - p) * 0.85;
    dot(c, ex, ey, Math.max(0.14, w * 0.016 * (1 - p * 0.5)), color);
    c.restore();
  }
}

function hazardStripe(c, x, y, w, h, phase = 0) {
  c.save();
  c.beginPath(); rr(c, x, y, w, h, Math.min(h * 0.3, 0.6)); c.clip();
  c.fillStyle = '#f2c53c'; c.fillRect(x, y, w, h);
  const band = h * 1.1;
  for (let bx = -h * 2 + (phase % (band * 2)); bx < w + h * 2; bx += band * 2) {
    path(c, '#1d1c26', null, 0, (p) => {
      p.moveTo(x + bx, y + h); p.lineTo(x + bx + h, y);
      p.lineTo(x + bx + h + band, y); p.lineTo(x + bx + band, y + h); p.closePath();
    });
  }
  c.restore();
}

// A jagged arc re-cut on a step clock. Electricity that wiggles smoothly reads
// as a rope; it has to SNAP between shapes.
function bolt(c, x0, y0, x1, y1, t, seed, color, width, chaos = 0.3) {
  const step = Math.floor(t * 14 + seed * 7);
  const rnd = (i) => {
    const s = Math.sin((step * 12.9898 + i * 78.233 + seed * 37.719)) * 43758.5453;
    return s - Math.floor(s) - 0.5;
  };
  const n = 5;
  line(c, color, width, (p) => {
    p.moveTo(x0, y0);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      p.lineTo(x0 + (x1 - x0) * k + rnd(i) * (x1 - x0 === 0 ? width * 6 : Math.abs(y1 - y0)) * chaos,
        y0 + (y1 - y0) * k + rnd(i + 40) * Math.abs(x1 - x0) * chaos * 0.5);
    }
    p.lineTo(x1, y1);
  });
}

// ================================================================ A. OPEN AIR
// The control, and under the open-shaft rule it is now the honest one: a hole
// with nothing in it. You see the hills straight through it, the road's cut edge at each
// lip, and the dark gathering at the bottom where there is no floor to catch
// the light. Every other candidate has to beat this, and it costs nothing.
function drawVoid(c, w, d, t) {
  // Grit falling off the broken edges. Three specks, no light, no colour: the
  // minimum motion that says the hole is real and still coming apart. It reads
  // against the sky now, which is the one thing the black fill never allowed.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.29) % 1;
    const x = w * (i % 2 ? 0.08 : 0.9) + Math.sin(i * 3) * w * 0.02;
    c.save(); c.globalAlpha = 0.55 * (1 - p * 0.7);
    c.fillStyle = '#2a2c36';
    c.fillRect(x, d * 0.05 + p * d * 0.9, Math.max(0.25, w * 0.012), Math.max(0.25, w * 0.022));
    c.restore();
  }
}

// ================================================================== B. MOLTEN
// Lava on the floor of the shaft, and the only candidate whose fill can be seen
// from off screen. The spill is doing all of the work: at rest the player sees
// the hills through the break with a hot glow at the bottom of it, and the lava itself
// is the reward for being in the air.
function drawLava(c, w, d, t) {
  const surf = d * FLOOR;
  c.save();
  c.beginPath(); c.rect(0, surf - d * 0.06, w, d - surf + d * 0.06); c.clip();
  path(c, '#f2621d', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 8; i++) {
      p.lineTo(w * (i / 8), surf + Math.sin(t * 1.6 + i * 0.9) * d * 0.018);
    }
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  // The core is a separate value step rather than a gradient. At lane size a
  // gradient collapses into one beige band; two steps survive the shrink.
  c.save(); c.globalAlpha = 0.8;
  for (let i = 0; i < 4; i++) {
    const k = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.6);
    c.fillStyle = k > 0.6 ? '#ffef9e' : '#ffb02e';
    c.beginPath();
    c.ellipse(w * (0.16 + i * 0.23), surf + d * (0.13 + 0.04 * k), w * 0.1, d * 0.055 * (0.6 + k), 0, 0, TAU);
    c.fill();
  }
  c.restore();
  // Crust plates drifting on it, dark against the glow. Without them the pit is
  // a lamp; with them it is a material.
  for (let i = 0; i < 3; i++) {
    const x = ((t * 3.5 + i * w * 0.42) % (w * 1.3)) - w * 0.15;
    path(c, '#40201a', '#6d2410', Math.max(0.12, w * 0.008), (p) => {
      p.moveTo(x, surf + d * 0.03); p.lineTo(x + w * 0.16, surf + d * 0.01);
      p.lineTo(x + w * 0.2, surf + d * 0.09); p.lineTo(x + w * 0.03, surf + d * 0.1); p.closePath();
    });
  }
  c.restore();
  glowUp(c, w, d, surf, 'rgba(255,120,30,1)', 0.34, 0.38);
  embers(c, w, d, t, 5, '#ffca55', d * 0.8);
  haze(c, w, t, '#ff8a3c', 4, 8, 0.22);
  spill(c, w, 'rgba(255,120,30,0.75)', 9, 0.45);
}

// ===================================================================== C. TAR
// Boiling tar, pooled at the bottom. The first pass had it nearly full so the
// bubbles broke into the lane — the strongest breach on the sheet, and it is
// gone: with the material on the floor the bubbles pop nine world px below the
// fold and nobody standing on the road ever sees one. What is left is a black
// fill that throws no light, so this candidate now stands or falls on its LIP
// alone, and that is a fair test rather than a rigged one.
function drawTar(c, w, d, t) {
  const surf = d * FLOOR;
  path(c, '#141019', null, 0, (p) => {
    p.moveTo(0, surf);
    p.quadraticCurveTo(w * 0.28, surf - d * 0.025, w * 0.52, surf);
    p.quadraticCurveTo(w * 0.78, surf + d * 0.02, w, surf - d * 0.012);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  // The gloss. Tar is black, and black on black is nothing — the sheen is what
  // makes it a liquid rather than a shadow, and it is the whole read.
  c.save(); c.globalAlpha = 0.32;
  path(c, '#6b5c80', null, 0, (p) => {
    p.ellipse(w * 0.4, surf + d * 0.09, w * 0.26, d * 0.035, 0.05, 0, TAU);
  });
  c.globalAlpha = 0.16;
  path(c, '#8a7f99', null, 0, (p) => {
    p.ellipse(w * 0.76, surf + d * 0.15, w * 0.13, d * 0.025, -0.04, 0, TAU);
  });
  c.restore();
  // Bubbles inflate above the surface, then pop into a ring.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.26) % 1;
    const x = w * (0.14 + i * 0.24);
    const rMax = d * (i % 2 === 0 ? 0.09 : 0.055);
    if (p < 0.74) {
      const r = rMax * (0.25 + p);
      dot(c, x, surf - r * 0.5, r, '#1d1826', '#08060c', Math.max(0.1, w * 0.008));
      dot(c, x - r * 0.32, surf - r * 0.9, r * 0.22, '#7a6b8f');
    } else {
      const k = (p - 0.74) / 0.26;
      c.save(); c.globalAlpha = 1 - k;
      dot(c, x, surf - rMax * 0.35, rMax * (0.5 + k * 0.6), null, '#5b4d6e', Math.max(0.12, w * 0.01));
      c.restore();
    }
  }
}

// ================================================================= D. COOLANT
// Not a hole in the ground — a TANK under the road, opened. The trough sits on
// the floor of the shaft with its own steel sides, so the hole above it is
// still open, and the chevron plates at the lips are the read. The only
// candidate that reads as maintained equipment rather than as damage, which is
// what lets it appear on a cabinet where a broken road would be a continuity
// error.
function drawCoolant(c, w, d, t) {
  const top = d * (FLOOR - 0.1);
  // The tank, sunk into the bottom of the shaft.
  box(c, w * 0.05, top, w * 0.9, d - top, w * 0.02, '#2b333d', '#12161c', Math.max(0.12, w * 0.008));
  for (let i = 0; i < 4; i++) {
    dot(c, w * (0.14 + i * 0.24), top + d * 0.035, Math.max(0.16, w * 0.012), '#8f9aa6');
  }
  const surf = top + d * 0.1;
  c.save();
  c.beginPath(); c.rect(w * 0.06, surf - d * 0.06, w * 0.88, d - surf); c.clip();
  path(c, '#2f7a3a', null, 0, (p) => { p.rect(0, surf, w, d); });
  // Ripple rings rather than waves: a flat top with concentric rings on it is
  // how a still liquid reads at this size, and it animates for almost nothing.
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.4 + i * 0.33) % 1;
    c.save(); c.globalAlpha = 0.4 * (1 - k);
    path(c, null, '#a8ec5c', Math.max(0.14, w * 0.01), (p) => {
      p.ellipse(w * 0.5, surf + d * 0.05, w * (0.06 + k * 0.4), d * (0.012 + k * 0.035), 0, 0, TAU);
    });
    c.restore();
  }
  // Meniscus: the bright line where the liquid meets the wall. Take it away and
  // the green is a painted floor.
  line(c, '#eaffc0', Math.max(0.16, w * 0.012), (p) => {
    p.moveTo(w * 0.06, surf + Math.sin(t * 1.8) * d * 0.006);
    p.lineTo(w * 0.94, surf + Math.sin(t * 1.8 + 1) * d * 0.006);
  });
  c.restore();
  glowUp(c, w, d, surf, 'rgba(110,240,90,1)', 0.26, 0.26);
  c.save(); c.globalAlpha = 0.4;
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.3 + i * 0.34) % 1;
    dot(c, w * (0.3 + i * 0.22), surf - p * d * 0.4, w * 0.02, '#a8ec5c');
  }
  c.restore();
  spill(c, w, 'rgba(110,240,90,0.5)', 6, 0.3);
}

// ================================================================= E. GRINDER
// Machinery under the road. The one treatment where the pit is not a substance
// at all, and the one with a rhythm: the rollers turn at a fixed rate, so the
// hazard has a beat the lane can be cut against. The rollers sit ON the floor
// of the shaft — half of each is below the frame's bottom edge, which is what a
// machine bedded into a service trench should look like.
function drawGrinder(c, w, d, t) {
  bay(c, w, d, d * FLOOR);
  // Two counter-rotating toothed rollers. Counter-rotating matters: two wheels
  // turning the same way is a conveyor, and a conveyor is not frightening.
  const R = Math.min(w * 0.2, d * 0.26);
  const cy = d * 0.94;
  for (const [cx, dir] of [[w * 0.3, 1], [w * 0.7, -1]]) {
    dot(c, cx, cy, R, '#4a535e', '#12161c', Math.max(0.14, w * 0.01));
    const a0 = t * 3.2 * dir;
    for (let i = 0; i < 8; i++) {
      const a = a0 + (i / 8) * TAU;
      c.save(); c.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.rotate(a + Math.PI / 2);
      tri(c, 0, 0, R * 0.2, R * 0.34, i % 2 ? '#dfe6ee' : '#a9b4c0', '#12161c', Math.max(0.1, w * 0.007));
      c.restore();
    }
    dot(c, cx, cy, R * 0.26, '#7d8894', '#12161c', Math.max(0.12, w * 0.008));
    line(c, '#20262e', Math.max(0.14, w * 0.01), (p) => {
      p.moveTo(cx - Math.cos(a0) * R * 0.24, cy - Math.sin(a0) * R * 0.24);
      p.lineTo(cx + Math.cos(a0) * R * 0.24, cy + Math.sin(a0) * R * 0.24);
    });
  }
  // Sparks thrown up out of the bite. They are launched hard enough to clear
  // the fold, which is this candidate's whole claim to a breach now that the
  // machine making them is at the bottom of the shaft.
  for (let i = 0; i < 7; i++) {
    const p = (t * 1.4 + i * 0.14) % 1;
    const vx = ((i % 2) ? 1 : -1) * (0.4 + (i % 3) * 0.28);
    const x = w * 0.5 + vx * p * w * 0.45;
    const y = cy - R - p * d * 1.5;
    c.save(); c.globalAlpha = Math.max(0, 1 - p * 1.05);
    c.fillStyle = p < 0.4 ? '#ffef9e' : '#ffb02e';
    c.fillRect(x, y, Math.max(0.22, w * 0.014), Math.max(0.22, w * 0.022));
    c.restore();
  }
  spill(c, w, 'rgba(255,190,70,0.35)', 5, 0.22);
}

// ================================================================== F. SPIKES
// The dry pit. No light, no liquid, no machine — teeth on the floor of the
// shaft, and a plank lip left over from whatever used to cover it. Cheapest
// frame on the sheet after the open air, and the only fill that tells you a
// story about how it got there. It is also the candidate that loses most to
// the open break: the teeth used to reach for the floor line and now they do
// not, so the boards over the mouth are carrying the read on their own.
function drawSpikeTrench(c, w, d, t) {
  // A rubble floor for them to be rooted in, so the teeth are not standing on
  // the background the rest of the break is showing.
  path(c, '#20232c', null, 0, (p) => {
    p.moveTo(0, d * (FLOOR + 0.06));
    for (let i = 0; i <= 6; i++) p.lineTo(w * (i / 6), d * (FLOOR + 0.02 + (i % 2) * 0.05));
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = w * (0.1 + i * (0.8 / (n - 1)));
    const hgt = d * (i % 2 === 0 ? 0.3 : 0.21);
    tri(c, x, d * 0.99, w * 0.035, hgt, i % 3 ? '#dfe6ee' : '#b6c0cc', '#12161c', Math.max(0.1, w * 0.008));
  }
  // One travelling glint along the teeth. The family's claim is that a still
  // hazard can read; this is the one concession, and it costs a single stroke.
  const g = (t * 0.55) % 1;
  if (g < 0.5) {
    c.save(); c.globalAlpha = Math.sin(g * 2 * Math.PI) * 0.85;
    line(c, '#ffffff', Math.max(0.16, w * 0.01), (p) => {
      const x = w * (0.14 + g * 1.5);
      p.moveTo(x, d * 0.85); p.lineTo(x + w * 0.012, d * 0.75);
    });
    c.restore();
  }
}

// ============================================================== G. LIVE RAILS
// A service trench with the bus bars still energised, bedded at the bottom of
// the shaft. The arc is the point: on a step clock it is the brightest thing on
// the sheet, and because it is arcing in an OPEN hole the light climbs the
// whole shaft and comes out over the lip. It is also the only fill that goes
// intermittently quiet, which is a trap none of the others can set — the trench
// is exactly as fatal on the dark beats.
function drawBusbar(c, w, d, t) {
  bay(c, w, d, d * FLOOR, '#0d1020', '#242a44');
  const railY = d * (FLOOR + 0.02);
  // Cable runs along the back of the trench, below the fold.
  for (let i = 0; i < 2; i++) {
    line(c, i ? '#3a3f66' : '#2a2e4c', Math.max(0.18, w * 0.012), (p) => {
      p.moveTo(w * 0.06, railY - d * (0.06 - i * 0.03));
      p.quadraticCurveTo(w * 0.5, railY - d * (0.02 - i * 0.03), w * 0.94, railY - d * (0.065 - i * 0.03));
    });
  }
  for (let r = 0; r < 2; r++) {
    const y = railY + r * d * 0.14;
    box(c, w * 0.02, y, w * 0.96, Math.max(0.5, d * 0.045), 0.3, r ? '#7a5a2e' : '#8a6a34', '#2a1e0e', Math.max(0.1, w * 0.007));
    line(c, '#d8a85a', Math.max(0.14, w * 0.009), (p) => {
      p.moveTo(w * 0.03, y + d * 0.01); p.lineTo(w * 0.97, y + d * 0.01);
    });
    for (let i = 0; i < 3; i++) {
      box(c, w * (0.16 + i * 0.3), y + d * 0.04, w * 0.05, d * 0.05, 0.2, '#3c4358', '#12161c', Math.max(0.1, w * 0.007));
    }
  }
  // Two beats dark, one beat live. The dark beats are what make the live one
  // land, and they are also the lie.
  const cycle = (t * 1.4) % 1;
  const live = cycle < 0.34;
  if (live) {
    const k = Math.min(1, cycle / 0.34);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      bolt(c, w * (0.2 + i * 0.42), railY + d * 0.01, w * (0.3 + i * 0.4), railY + d * 0.15,
        t, i * 3.1, i ? '#bfe4ff' : '#ffffff', Math.max(0.2, w * 0.012), 0.5);
    }
    // One arc climbing the open break — earthing to the road's cut face rather
    // than jumping across the mouth, which is what an open hole allows and a
    // plugged one never did.
    bolt(c, w * 0.42, railY, w * 0.06, d * 0.06, t, 7.7, '#9fd8ff', Math.max(0.18, w * 0.011), 0.45);
    c.restore();
    glowUp(c, w, d, railY, 'rgba(120,200,255,1)', 0.4, 0.3 + 0.22 * k);
    spill(c, w, 'rgba(120,200,255,0.8)', 8, 0.3 + 0.25 * k);
  } else {
    // A guttering pilot glow between beats, so the trench is never simply off.
    c.save(); c.globalAlpha = 0.45 + 0.2 * Math.sin(t * 11);
    dot(c, w * 0.5, railY + d * 0.07, w * 0.028, '#7fc4ff');
    c.restore();
    spill(c, w, 'rgba(90,160,255,0.4)', 5, 0.16);
  }
}

// =================================================================== H. SLUSH
// Black water under broken ice, at the bottom of the shaft. The shelf is the
// trick: the ice does not stop at the lip, it OVERHANGS it, so the mouth is
// narrower than the hole and the edge you can see is not the edge you fall off.
// The only candidate that is deliberately dishonest about its own hitbox, which
// is either the best idea on the sheet or the reason to bin it — and with the
// shaft open you can see straight past the shelf to the water, which makes the
// lie legible instead of cheap.
function drawSlush(c, w, d, t) {
  const surf = d * FLOOR;
  path(c, '#0d2334', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 6; i++) p.lineTo(w * (i / 6), surf + Math.sin(t * 1.1 + i * 1.2) * d * 0.01);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  c.save(); c.globalAlpha = 0.22;
  path(c, '#79b6d8', null, 0, (p) => {
    p.ellipse(w * 0.46, surf + d * 0.09, w * 0.28, d * 0.03, 0, 0, TAU);
  });
  c.restore();
  // Floes, drifting slowly. Pale tops, dark undersides showing at the waterline
  // — an ice sheet drawn with one value is a sheet of paper.
  for (let i = 0; i < 3; i++) {
    const x = ((t * 1.6 + i * w * 0.4) % (w * 1.2)) - w * 0.12;
    path(c, '#2b5b74', null, 0, (p) => {
      p.moveTo(x, surf + d * 0.02); p.lineTo(x + w * 0.17, surf + d * 0.005);
      p.lineTo(x + w * 0.15, surf + d * 0.07); p.lineTo(x + w * 0.02, surf + d * 0.075); p.closePath();
    });
    path(c, '#cfe9f5', '#7ba8c0', Math.max(0.1, w * 0.007), (p) => {
      p.moveTo(x, surf + d * 0.02); p.lineTo(x + w * 0.16, surf - d * 0.005);
      p.lineTo(x + w * 0.17, surf + d * 0.005); p.lineTo(x + w * 0.005, surf + d * 0.03); p.closePath();
    });
  }
  // Cold vapour off the water, drifting rather than rising: the frost cabinet's
  // whole idiom is slow, and a fast plume would read as steam and therefore hot.
  c.save();
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.22 + i * 0.34) % 1;
    c.globalAlpha = 0.2 * (1 - p);
    dot(c, w * (0.25 + i * 0.26) + p * w * 0.1, surf - p * d * 0.62, w * (0.05 + 0.1 * p), '#cfe9f5');
  }
  c.restore();
  spill(c, w, 'rgba(150,220,255,0.35)', 5, 0.18);
}

const DRAW = {
  void: drawVoid,
  lava: drawLava,
  tar: drawTar,
  coolant: drawCoolant,
  grinder: drawGrinder,
  spikeTrench: drawSpikeTrench,
  busbar: drawBusbar,
  slush: drawSlush,
};

// `read` is the load-bearing field: what a player sees BEFORE the mouth is
// under their feet, named as one of the three devices in the header. `cabinets`
// is a proposal about where the fill belongs, not a wiring. `cost` is an honest
// note on what the treatment asks of a frame that is already drawing a lane.
export const PIT_CANDIDATES = [
  ['void', 'A', 'OPEN AIR', 'still', 'nothing — a few specks of grit fall through it',
    ['any'], 'free',
    'The control: a break with nothing in it. Costs nothing, so anything that beats it has to beat it by more than it costs, and the question it puts to the other seven is whether a runner reading the lane at speed can tell a notch of hills from the hills.'],
  ['lava', 'B', 'MOLTEN CHANNEL', 'flows', 'LIGHT — the glow climbs the break and spills onto the road either side',
    ['speed', 'plumber', 'surge'], 'gradient + 12 particles',
    'The only fill that can be read before the mouth is on screen, because it is the only one that throws light out of the hole. The lava itself sits below the fold; what a standing player gets is the glow, which is the whole argument for a luminous material.'],
  ['tar', 'C', 'BOILING TAR', 'bubbles', 'nothing above the floor line — a black gloss on the floor of the break',
    ['plumber', 'crypt', 'office'], '4 bubbles, no light',
    'The dark, cheap answer to the lava, and the shape the whole sheet was cut back to. Throws no light, so it is candidate A with something fatal at the bottom — either enough on the pale cabinets or the proof that a fill alone cannot warn anybody.'],
  ['coolant', 'D', 'COOLANT VAT', 'ripples', 'LIGHT — a soft green wash up the break',
    ['neon', 'office', 'surge'], 'clip + 3 rings',
    'A tank under the road rather than damage to it: steel sides, a meniscus, and acid green. The one material that reads as equipment, which is what lets it sit on a cabinet where a broken road would be a continuity error. Half the lava\'s reach for a quarter of its light.'],
  ['grinder', 'E', 'GRINDER', 'spins', 'SPARKS — thrown off the bite hard enough to clear the floor line',
    ['plumber', 'office'], '16 teeth + 7 sparks',
    'The pit as machine. Has a rhythm the lane can be cut against, and its sparks are the only thing on the sheet that gets above the road without a prop to do it — a material that throws part of itself into the lane is the one honest kind of breach.'],
  ['spikeTrench', 'F', 'SPIKE TRENCH', 'still', 'nothing — teeth on the floor, and one glint travelling along them',
    ['crypt', 'cardboard'], 'free',
    'Dry, unlit, and the most legible thing at the bottom of a break: white teeth read at any size against any floor. No light and nothing above the road, so it is competing with A and C on the same terms and winning on silhouette alone.'],
  ['busbar', 'G', 'LIVE RAILS', 'arcs', 'LIGHT — an arc lights the whole break on a step clock, then goes dark',
    ['neon', 'surge'], '3 bolts, 34% duty',
    'The brightest read on the sheet and the only one that goes intermittently quiet. The dark beats are a lie — the trench is exactly as fatal — which is a trap none of the others can set, and the reason to be careful where it is used.'],
  ['slush', 'H', 'BLACK SLUSH', 'drifts', 'nothing — black water and pale floes at the bottom',
    ['frost'], '3 floes + vapour',
    'The frost cabinet\'s answer, and the hardest case on the sheet: a pale cabinet, a pale background through the break, and a dark fill at the bottom of it. If the floes are what makes it read, that is a finding about value rather than about ice.'],
].map(([id, letter, name, motion, read, cabinets, cost, note]) =>
  ({ id, letter, name, motion, read, cabinets, cost, note }));

/**
 * One pit fill, into a local box whose mouth spans x 0..w at y = 0 and whose
 * break runs down to y = d. Painters may draw above y = 0 — lip furniture, glow
 * spill and anything that breaches the floor line — so a caller placing one in
 * a lane must not clip to the mouth.
 *
 * Total side-on elevation, and nothing is drawn across the open part of the
 * break: the caller's own background shows through it, and the ground band the
 * caller stops painting at each edge is what draws the hole.
 */
export function drawPitCandidate(ctx, id, w, d, t = 0) {
  const draw = DRAW[id];
  if (!draw) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, d, t);
  ctx.restore();
}
