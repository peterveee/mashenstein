// Flat-cartoon vector props: obstacles, pickups, villains, scenery.
// Same language as the heroes (sprites/toons.js) — flat colors, soft dark
// outlines, no pixel grids. Each painter draws into a normalized w-by-h box,
// so art is resolution independent; painters are rasterized once into
// supersampled offscreen canvases and drawn smoothly at any size.

// The four animal hazards live in their own module and register through the
// five spreads below — one line per table. Nothing else in this file knows
// about them, which is what keeps art work on the animals off this file's
// diff. animals.js imports nothing back, so there is no cycle.
import {
  ANIMAL_PAINTERS, ANIMAL_NAMES, ANIMAL_FRAMES, ANIMAL_FPS, ANIMAL_TALL, ANIMAL_DETAIL,
  ANIMAL_VISUAL,
} from './animals.js';

export const OUTLINE = 'rgba(26,16,40,0.34)';

// ------------------------------------------------------------- helpers
// Exported so sibling art modules (sprites/arcade.js) draw in the same
// language — same outline weight, same rounded-rect maths — instead of
// forking a second set that drifts.
function ol(ctx, u) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(0.55, 0.055 * u); }
export function shape(ctx, fill, u, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ol(ctx, u);
  ctx.stroke();
}
// Hairline version for small world props. These objects are rasterized at
// extra internal detail, so a fine translucent contour survives reduction
// without turning into the broad dark border used by the older shared shape().
function fineShape(ctx, fill, u, pathFn, color = OUTLINE, scale = 0.02) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.2, scale * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function cappedLine(u, minimum, growth, maximum) {
  return Math.min(maximum, Math.max(minimum, growth * u));
}
export function plain(ctx, fill, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
export function star(ctx, cx, cy, R, r, n, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = rot + (i * Math.PI) / n;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// simple round-cap line
export function stroke(ctx, col, w, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

// The lightning bolt, in the 28x18 cell grid the battery pickup is laid out on.
// The grid outlives the HUD cell it was shared with — the health meter is a
// segmented shell now and carries no bolt — because the pickup's proportions,
// and BATTERY_FOCUS below, are still read off it.
//
// Placed by CENTROID, not by bounding box. A bolt is a diagonal with its mass in
// the broad upper-left arm and a thin tail trailing below-right, so a placement
// that centres its extents leaves the shape itself reading low and left of the
// cell it sits in. These points put the centroid on the body's centre of (12, 9)
// — the earlier bounding-box placement had it at (13, 9.5), which is invisible
// at 11px of HUD cell and unmissable at pickup size.
const BOLT_PTS = [[13, 4.5], [9, 10], [12, 10], [11, 13.5], [15, 8], [12, 8]];
const boltPath = (c, X, Y) => {
  BOLT_PTS.forEach(([bx, by], i) => (i ? c.lineTo(X(bx), Y(by)) : c.moveTo(X(bx), Y(by))));
  c.closePath();
};

// Where the world battery's art sits inside its painter box. The art spans
// X 1.5..26.5 and Y 2.5..15.5 of the cell grid — 25 units by 13 — so the pickup
// takes the box's full width and lets that aspect decide its height, centred.
// Shared with BATTERY_FOCUS below so the drawing and anything aiming at the
// drawing are reading off one layout.
const batteryGrid = (w, h) => {
  const AW = w * 0.96, AH = AW * (13 / 25);
  return {
    X: (n) => w * 0.02 + ((n - 1.5) / 25) * AW,
    Y: (n) => (h - AH) / 2 + ((n - 2.5) / 13) * AH,
  };
};
// The centre of the battery's CELL, as fractions of its painter box — the point
// an effect should radiate from. Not the box centre and not the silhouette's:
// the nub hangs off the right, which drags both about a pixel right of the green
// cell the eye actually tracks. On an 8px sprite that is 11% of its width, and a
// halo centred there visibly leaks out from beside the battery instead of from
// inside it. Vertically the cell is already the box centre; only x moves.
export const BATTERY_FOCUS = (() => {
  const { X, Y } = batteryGrid(1, 1);
  return { x: X(12), y: Y(9) };
})();

// --- the HUD health meter ---------------------------------------------------
// ONE battery lying on its side with a segment per hit left, replacing the row
// of four separate cells this used to be. Four batteries in a row said "four
// batteries"; one battery with four bars says "one hero, this much left", which
// is the thing the meter is actually measuring. The shell is always the full
// length, so the row still states the maximum while the segments state what is
// left — the job the outlined spent cell used to do.
//
// Every dimension is a fraction of the HEIGHT, so the meter is one drawing at
// whatever size the HUD asks for and hudBatteryW() is the width that layout
// falls out to. The pill sizes itself off that same function: the drawing and
// the layout cannot disagree about how wide this is.
const BATT = {
  ink: 0.11,   // shell stroke
  pad: 0.06,   // shell interior to segment
  seg: 0.36,   // one segment's width
  gap: 0.12,   // between segments
  nub: 0.19,   // terminal, hung off the right edge — same way round as the pickup
  nubH: 0.42,
};
// The shell sits a touch brighter than UI_PANEL_BORDER: it is a readout inside
// the panel, not another edge of it.
const BATT_SHELL = 'rgba(255,255,255,0.34)';
// Four warmth steps down to empty: green, then a limier green at three, amber
// at two, red at one. Three is still green because three hits left is not yet
// trouble — but it is the last comfortable number, so it warms rather than
// staying the colour of full.
//
// Keyed on hits REMAINING rather than on a fraction of the maximum, because
// with the storebrand cell fitted two left has to look exactly as bad as two
// left does without it — a ratio would paint the same danger green on the
// longer meter.
const BATT_INKS = ['#e04848', '#f0a726', '#b4d43c', '#74c947'];
const BATT_INK = (left) => BATT_INKS[Math.min(BATT_INKS.length, Math.max(1, left)) - 1];

export function hudBatteryW(segs, h) {
  if (segs <= 0) return 0;
  const inner = segs * BATT.seg * h + (segs - 1) * BATT.gap * h;
  return inner + 2 * (BATT.ink + BATT.pad) * h + BATT.nub * h;
}

function hudBatteryArt(ctx, w, h, segs, filled, outerR) {
  const ink = BATT.ink * h, pad = BATT.pad * h, half = ink / 2;
  const bodyW = w - BATT.nub * h;
  // A stroke is centred on its path, so the shell is inset by half its width or
  // the outer half of the ink hangs off the sprite and the raster clips it —
  // and for the same reason the path's corner is half a stroke tighter than the
  // one asked for, because the corner that has to nest is the one the eye sees
  // on the OUTSIDE of the ink.
  stroke(ctx, BATT_SHELL, ink, (c) =>
    rr(c, half, half, bodyW - ink, h - ink, Math.max(0, outerR - half)));
  // The terminal butts against the shell's outer edge and rounds only its OUTER
  // corners, which is the one shape that gets both halves of this right. The
  // ink is translucent, so any overlap composites twice and prints a bright
  // lump where the nub crosses the shell — and a fully rounded nub set flush
  // instead leaves two notches where its left corners curve away from a flat
  // edge. Square on the left, round on the right: no overlap, no notch.
  const nubH = BATT.nubH * h, nubW = BATT.nub * h;
  const nubY = (h - nubH) / 2, nubR = Math.min(nubH * 0.35, nubW);
  plain(ctx, BATT_SHELL, (c) => {
    c.moveTo(bodyW, nubY);
    c.arcTo(bodyW + nubW, nubY, bodyW + nubW, nubY + nubH, nubR);
    c.arcTo(bodyW + nubW, nubY + nubH, bodyW, nubY + nubH, nubR);
    c.lineTo(bodyW, nubY + nubH);
    c.closePath();
  });
  const segW = BATT.seg * h, gap = BATT.gap * h;
  const segH = h - 2 * (ink + pad), col = BATT_INK(filled);
  for (let i = 0; i < filled; i++) {
    plain(ctx, col, (c) =>
      rr(c, ink + pad + i * (segW + gap), ink + pad, segW, segH, segH * 0.2));
  }
}

// Not a PROP_PAINTERS entry: the sprite cache is keyed by name and frame, and
// this drawing takes three numbers. It caches on all of them, which is at most
// a canvas per (length, charge) pair — a dozen for the two lengths a run has.
//
// `outerR` is the corner the shell shows, passed in rather than picked here:
// the meter sits inside a rounded panel, and the only radius that nests in that
// panel's curve is the panel's own less the gap around the meter. The caller is
// the one holding both of those numbers.
export function drawHudBattery(ctx, x, y, w, h, segs, filled, outerR) {
  const spr = rasterize(`hudBattery|${w}x${h}|${segs}/${filled}|r${outerR}`, w, h,
    (c, cw, ch) => hudBatteryArt(c, cw, ch, segs, filled, outerR));
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spr, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
}

// Cold metal for the CHALLENGE trophy, lit from the upper left — the same
// direction as coin/hudCoin, so everything in a HUD row agrees about where the
// light is. A gradient rather than a flat fill because in an 8x8 box a flat
// fill leaves nothing to separate bowl from stem from base: the whole icon
// reads as one lump.
//
// SILVER, not gold. The TOASTER plug beside it is gold — it is literally the
// GOLDEN TOASTER — and two warm metal icons in a three-slot row read as one
// smear at 8px however different their silhouettes are. Steel rather than
// white silver: the MISSION plug on the other side is a cream board, so the
// cool blue-grey is what keeps this from blurring into THAT instead. The
// row now runs cool-cream / cool-steel / warm-gold, which separates by hue
// before shape has to do any work.
function trophySilver(ctx, w, h) {
  const g = ctx.createLinearGradient(w * 0.22, 0, w * 0.86, h);
  g.addColorStop(0, '#f4f8fd');
  g.addColorStop(0.44, '#b9c4d4');
  g.addColorStop(1, '#67748a');
  return g;
}
// Cool dark contour rather than the shared purple-black OUTLINE: this draws on
// the plug row's #181820 tile, where a neutral dark edge merges with the fill
// and eats the foot.
const TROPHY_INK = 'rgba(26,34,50,0.55)';
// How far the trophy's handle loops reach from the centre, as a fraction of the
// box. Was 0.44 with a 0.48 control point, which put the widest part of the
// stroke essentially on the edge of the tile: against a bowl whose half-width is
// 0.26 the handles were the widest thing in the icon, and at plug sizes the
// trophy read as a cup with wings. 0.36 keeps the loops clearly outboard of the
// bowl — which is what stops the silhouette reverting to a tulip — without them
// being the feature.
const TROPHY_HANDLE_SPREAD = 0.36;
// Handle stroke weight, as a fraction of the box. Separate axis from the reach
// above: spread decides where the loops sit, this decides how heavy they are.
// Was 0.1, which at HUD size put a nearly one-pixel bar around a bowl whose own
// contour is a 0.028 hairline — the handles read as cast iron bolted to sheet
// metal. 0.07 still closes into a solid mark at 5px but stops out-weighing the
// cup it belongs to.
const TROPHY_HANDLE_WEIGHT = 0.07;

// ------------------------------------------------------------- painters
// Each: (ctx, w, h) drawing inside [0..w] x [0..h]. Ground props sit on h.
// The eye drone's strip length. Declared up here because both the painter and
// PROP_FRAMES need it and they must never disagree — a painter that cycles on a
// different count from the table it is rasterized against jumps at the seam.

// ---------------------------------------------- standing-hazard primitives
// Shared by the six props ported out of the gallery's hazard bake-off. They
// are kept apart from the older helpers above for one reason: every one of
// them is authored on a NORMALIZED PHASE rather than on a clock. A prop is
// rasterized into PROP_FRAMES fixed canvases, so a wobble that is not an
// integer multiple of the ring's period lands frame N-1 somewhere frame 0 is
// not, and the loop visibly ticks once a cycle.
//
// `hzPhase` is the whole convention: it turns a frame index into 0..TAU across
// the ring, and everything downstream multiplies it by whole numbers only.
const HZ_TAU = Math.PI * 2;
const HZ_INK = '#171522';
// Outer, mid, core, edge-ink. Three nested tongues rather than a gradient: at
// 13px a gradient is a beige smudge, and separate value steps still read.
const HZ_FIRE = ['#f2621d', '#ffb02e', '#ffef9e', '#6d2410'];

function hzPhase(frame, frames) { return ((frame % frames) + frames) % frames / frames * HZ_TAU; }

function hzPath(ctx, fill, stroke, width, fn) {
  ctx.beginPath();
  fn(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  }
}
function hzRR(c, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  c.moveTo(x + q, y);
  c.lineTo(x + w - q, y); c.quadraticCurveTo(x + w, y, x + w, y + q);
  c.lineTo(x + w, y + h - q); c.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  c.lineTo(x + q, y + h); c.quadraticCurveTo(x, y + h, x, y + h - q);
  c.lineTo(x, y + q); c.quadraticCurveTo(x, y, x + q, y); c.closePath();
}
function hzBox(ctx, x, y, w, h, r, fill, ink = HZ_INK, width = 0.6) {
  hzPath(ctx, fill, ink, width, (c) => hzRR(c, x, y, w, h, r));
}
function hzLine(ctx, color, width, fn) { hzPath(ctx, null, color, width, fn); }
function hzDot(ctx, x, y, r, fill, ink = null, width = 0.5) {
  hzPath(ctx, fill, ink, width, (c) => c.arc(x, y, Math.max(0.05, r), 0, HZ_TAU));
}
function hzTri(ctx, x, y, halfW, height, fill, ink = HZ_INK, width = 0.5) {
  hzPath(ctx, fill, ink, width, (c) => {
    c.moveTo(x - halfW, y); c.lineTo(x, y - height); c.lineTo(x + halfW, y); c.closePath();
  });
}
// The warm pool a fire throws on the ground. Without it the flame floats: it is
// the brightest thing in the tile and nothing else on screen acknowledges it.
function hzGlow(ctx, x, y, rx, ry, color, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, HZ_TAU); ctx.fill(); ctx.restore();
}
// One tongue, three layers, each licking on its own INTEGER harmonic of p.
function hzFlame(ctx, x, base, w, h, p, seed = 0, pal = HZ_FIRE) {
  // Three tongues, and the important part is that they are NOT concentric. The
  // first pass nested them on one axis with a symmetric quadratic tip, and at
  // lane size that draws a pointed dome — a rocket nose, not a fire. Each layer
  // now sits on its own side bias and leans on its own harmonic, so the shape
  // is asymmetric in every frame and the inner core is visible off-centre
  // rather than as a smaller copy of the outline around it.
  for (let layer = 0; layer < 3; layer++) {
    const k = 1 - layer * 0.36;         // width falls off faster than height
    const hk = 1 - layer * 0.26;
    const cx = x + (layer === 1 ? -0.16 : layer === 2 ? 0.12 : 0) * w;
    const lean = Math.sin(p * 2 + seed + layer * 2.4) * w * (layer ? 0.2 : 0.12);
    const tip = base - h * hk * (0.86 + 0.16 * Math.sin(p * 3 + seed + layer));
    hzPath(ctx, pal[layer], layer === 0 ? pal[3] : null, Math.max(0.16, w * 0.05), (c) => {
      c.moveTo(cx - w * 0.5 * k, base);
      c.bezierCurveTo(cx - w * 0.66 * k, base - h * hk * 0.34,
        cx - w * 0.26 * k + lean, base - h * hk * 0.62, cx + lean, tip);
      c.bezierCurveTo(cx + w * 0.34 * k + lean, base - h * hk * 0.56,
        cx + w * 0.66 * k, base - h * hk * 0.3, cx + w * 0.5 * k, base);
      c.closePath();
    });
  }
}
function hzEmbers(ctx, x, base, w, h, p, n, seed = 0, color = '#ffca55') {
  for (let i = 0; i < n; i++) {
    const rise = (p / HZ_TAU + i / n + seed * 0.31) % 1;
    const ex = x + Math.sin(seed + i * 2.1 + rise * HZ_TAU) * w * 0.45;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - rise) * 0.9;
    hzDot(ctx, ex, base - rise * h, Math.max(0.14, w * 0.05 * (1 - rise * 0.55)), color);
    ctx.restore();
  }
}
// Hazard chevrons on plate steel. `phase` slides the bands; pass an integer
// multiple of the frame index so the slide wraps with the ring.
function hzStripe(ctx, x, y, w, h, phase = 0) {
  ctx.save();
  ctx.beginPath(); hzRR(ctx, x, y, w, h, Math.min(h * 0.3, 0.6)); ctx.clip();
  ctx.fillStyle = '#f2c53c'; ctx.fillRect(x, y, w, h);
  const band = h * 1.1;
  for (let bx = -h * 2 + (phase % (band * 2)); bx < w + h * 2; bx += band * 2) {
    hzPath(ctx, '#1d1c26', null, 0, (c) => {
      c.moveTo(x + bx, y + h); c.lineTo(x + bx + h, y);
      c.lineTo(x + bx + h + band, y); c.lineTo(x + bx + band, y + h); c.closePath();
    });
  }
  ctx.restore();
}
// Circular blade. `rot` is absolute so the caller owns the seam.
function hzBlade(ctx, x, y, r, rot, teeth) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  hzPath(ctx, '#c9d3de', '#2b323c', Math.max(0.14, r * 0.07), (c) => {
    for (let i = 0; i < teeth; i++) {
      const a = i * HZ_TAU / teeth, a2 = (i + 0.5) * HZ_TAU / teeth;
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(Math.cos(a2) * r * 0.82, Math.sin(a2) * r * 0.82);
    }
    c.closePath();
  });
  hzDot(ctx, 0, 0, r * 0.6, '#98a3b1', '#2b323c', Math.max(0.12, r * 0.06));
  for (let i = 0; i < 3; i++) {
    const a = i * HZ_TAU / 3 + 0.4;
    hzDot(ctx, Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.13, '#4a535e');
  }
  ctx.restore();
}
function hzSparks(ctx, x, y, r, frame, frames, seed, n) {
  for (let i = 0; i < n; i++) {
    const k = ((frame / frames) * 2 + i / n + seed * 0.37) % 1;
    const a = -1.9 + Math.sin(seed + i * 3.1) * 0.9;
    ctx.save(); ctx.globalAlpha = 1 - k;
    hzLine(ctx, i % 2 ? '#fff0b0' : '#ffb03a', Math.max(0.16, r * 0.13), (c) => {
      c.moveTo(x + Math.cos(a) * r * k * 2.2, y + Math.sin(a) * r * k * 2.2 + k * k * r * 1.6);
      c.lineTo(x + Math.cos(a) * r * k * 2.6, y + Math.sin(a) * r * k * 2.6 + k * k * r * 2);
    });
    ctx.restore();
  }
}
// A drum: body, shaded side, three bands. Shared so the fire barrel and any
// later variant are the same object rather than two drawings of one.
function hzBarrel(ctx, x, y, bw, bh, fill, dark, bandCol = '#4a5460') {
  // TWO bands, thin, and a waist rather than a rectangle. Three fat bands with
  // a shaded right edge drew a chest of drawers at lane size — the bands were
  // reading as drawer fronts and the fire's glow holes as their handles.
  hzPath(ctx, fill, HZ_INK, Math.max(0.2, bw * 0.05), (c) => {
    c.moveTo(x + bw * 0.06, y);
    c.lineTo(x + bw * 0.94, y);
    c.quadraticCurveTo(x + bw * 1.04, y + bh * 0.5, x + bw * 0.94, y + bh);
    c.lineTo(x + bw * 0.06, y + bh);
    c.quadraticCurveTo(x - bw * 0.04, y + bh * 0.5, x + bw * 0.06, y);
    c.closePath();
  });
  hzPath(ctx, dark, null, 0, (c) => {
    c.moveTo(x + bw * 0.74, y + bh * 0.02);
    c.lineTo(x + bw * 0.93, y + bh * 0.02);
    c.quadraticCurveTo(x + bw * 1.02, y + bh * 0.5, x + bw * 0.93, y + bh * 0.98);
    c.lineTo(x + bw * 0.74, y + bh * 0.98);
    c.closePath();
  });
  for (const f of [0.3, 0.72]) {
    hzBox(ctx, x - bw * 0.02, y + bh * f - bh * 0.03, bw * 1.04, bh * 0.06, bh * 0.015,
      bandCol, HZ_INK, Math.max(0.12, bw * 0.02));
  }
}

const DRONE_EYE_FRAMES = 16;

// The finish-line dog (the `finishDog` def in game/entities.js) wears the dog
// rigs through these ALIASES rather than the pack names, for exactly one
// reason: detail. Rasters cache per name and the detail scale keys off the
// name, so the pack dogs' carefully-argued detail 2 (see ANIMAL_DETAIL in
// sprites/animals.js) can't be raised for one showcase prop without paying for
// it on every dog in every lane. The finish dog is the biggest hazard box in
// the game and the star of the last three seconds of every plumber stage, so
// its aliases take detail 3 — at its 22-unit box the detail-2 raster is
// fractionally MAGNIFIED on the top density rung, which is the case the
// pack dogs never hit and the whole reason the exception exists. Everything
// else — painter, frames, gait rate, stature, overdraw, self-outline — is the
// base dog's, read from the same tables so the two can never drift.
const FINISH_DOG_ALIASES = {
  finishSnarler: 'dogSnarler', finishBruiser: 'dogBruiser', finishFeral: 'dogFeral',
};
const finishDogTable = (src, override) => Object.fromEntries(
  Object.entries(FINISH_DOG_ALIASES).map(([alias, base]) => [alias, override ?? src[base]]));

// ------------------------------------------------- Don K. Eggshell, PhD
// The villain, in the heroes' flat-toon language rather than the pixel grid
// world.js still carries: an ape in a clown-copter tub. Won a twelve-way body
// bake-off and a ten-way vehicle bake-off on 3 Sep 2026 — the approved looks
// are in docs/shots/eggshell/. Three painters share ONE ape:
//   eggshell         the bust in the tub, 24x20 — speech card, intro, relic
//   eggshellCopter   the bust under a three-quarter rotor, 28x28, four frames
//                    — drawCopter (chase missions) and the Act I boss
//   eggshellBalloon  the bust under a striped balloon, 28x46 — the Act III
//                    boss. The balloon is that fight's weak point: see the
//                    surge section of docs/BOSS_REDESIGN_PLAN.md.
// Every mark is a fraction of the ape's own 24x20 box; the copter and the
// balloon translate to a sub-box and call the same two functions, so the
// portrait and the vehicles cannot drift apart.
const EG_INK = '#1a1028', EG_CREAM = '#e8e0c8', EG_RED = '#c83030', EG_FUR = '#7a4c2e';
const EG_GOLD = '#f6d33c', EG_LENS = '#c8e0f8', EG_GREEN = '#48c848', EG_GREEN_DK = '#2c7d33';
const EG_TAU = Math.PI * 2;
const EG_APE_W = 24, EG_APE_H = 20;
// FINE INK, WEIGHTED LIKE THE HERO'S. The props' shared OUTLINE is a 1u line
// at 34% — on a busy pale backdrop that is a blur, and Peter asked for "fine
// lines, not thick blurry ones". Half a unit of opaque ink then read "too
// thick and dark vs hero": the toons draw their contour as a hairline at 32%.
// So: 0.3u, a hair heavier than the hero's, at 55% — a touch darker than his
// because the copter sits on the pale sky band, not the floor. It is the
// contour that separates him from the scenery, not a rim or a glow.
const EG_LINE = 'rgba(26,16,40,0.55)';
const EG_LW = 0.0125 * EG_APE_W;
function egP(c, fill, fn, ink = null, lw = 0) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink && lw > 0) {
    c.strokeStyle = ink; c.lineWidth = lw;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
  }
}
function egLine(c, ink, lw, fn) { egP(c, null, fn, ink, lw); }
function egDot(c, fill, x, y, r, ink = null, lw = 0) { egP(c, fill, (k) => k.arc(x, y, r, 0, EG_TAU), ink, lw); }
// An egg: one width, two heights. The equator sits eq*ry below the centre so
// the dome above is taller than the bowl below — the difference between an
// egg and an ellipse.
function eggPath(c, cx, cy, rx, ry, eq = 0.18) {
  const ey = ry * eq;
  c.ellipse(cx, cy + ey, rx, ry - ey, 0, 0, Math.PI);
  c.ellipse(cx, cy + ey, rx, ry + ey, 0, Math.PI, EG_TAU);
}
// The logo: two lobes, thick at the philtrum, sweeping out to a tip that
// curls up. BRICK BONK's wall is this shape.
function egMustache(c, cx, cy, span, drop, lift = 0) {
  for (const s of [-1, 1]) {
    egP(c, EG_RED, (k) => {
      k.moveTo(cx, cy - drop * 0.3);
      k.quadraticCurveTo(cx + s * span * 0.45, cy - drop * 0.95, cx + s * span, cy - drop * 0.35 + lift * drop * 1.5);
      k.quadraticCurveTo(cx + s * span * 0.82, cy + drop * 0.3 + lift * drop * 1.2, cx + s * span * 0.42, cy + drop * 0.6);
      k.quadraticCurveTo(cx + s * span * 0.16, cy + drop * 0.8, cx, cy + drop * 0.55);
      k.closePath();
    });
  }
}
// Tiny science goggles on a strap round the head.
function egGoggles(c, cx, cy, r, gap, strap, pupilScale = 1) {
  const L = cx - gap / 2 - r, R = cx + gap / 2 + r;
  egLine(c, EG_INK, r * 0.6, (k) => { k.moveTo(strap[0], cy + r * 0.1); k.lineTo(strap[1], cy + r * 0.1); });
  egLine(c, EG_INK, r * 0.5, (k) => { k.moveTo(L, cy); k.lineTo(R, cy); });
  for (const x of [L, R]) {
    egDot(c, EG_INK, x, cy, r);
    egDot(c, EG_LENS, x, cy, r * 0.7);
    egDot(c, EG_INK, x + (x < cx ? r * 0.12 : -r * 0.12), cy + r * 0.12, r * 0.3 * pupilScale);
    egDot(c, 'rgba(255,255,255,0.85)', x - r * 0.28, cy - r * 0.3, r * 0.17);
  }
}
// Spikes standing off an ellipse arc, tips outward.
function egSpikesArc(c, fill, cx, cy, rx, ry, a0, a1, n, len, ink, lw) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + 0.5) / n;
    const da = (a1 - a0) / n * 0.42;
    egP(c, fill, (k) => {
      k.moveTo(cx + Math.cos(a - da) * rx, cy + Math.sin(a - da) * ry);
      k.lineTo(cx + Math.cos(a) * rx * (1 + len), cy + Math.sin(a) * ry * (1 + len));
      k.lineTo(cx + Math.cos(a + da) * rx, cy + Math.sin(a + da) * ry);
      k.closePath();
    }, ink, lw);
  }
}
// The ape from the shoulders up: green spiked shell behind, fur, cream
// face-plate, goggles, mustache. X/Y are pure scales of his 24x20 box.
//
// EACH MARK IS A PART ON A SEAM. A part is (c, X, Y, lw, shocked) drawing one
// thing; the bust runs them in order. A bake-off swaps ONE part and keeps the
// rest (src/dev/eggshell-redesigns.js), so a candidate differs from the
// shipped villain in exactly the mark it is testing, the way drawToon's
// spec/pal seam carries hero candidates. Production never passes parts.
function egShell(c, X, Y, lw) {
  egSpikesArc(c, EG_GREEN, X(0.5), Y(0.56), X(0.36), Y(0.2), -Math.PI * 0.95, -Math.PI * 0.05, 6, 0.5, EG_GREEN_DK, lw * 0.5);
  egP(c, EG_GREEN, (k) => k.ellipse(X(0.5), Y(0.56), X(0.36), Y(0.2), 0, 0, EG_TAU), EG_GREEN_DK, lw * 0.6);
}
function egBody(c, X, Y, lw) {
  egP(c, EG_FUR, (k) => k.ellipse(X(0.5), Y(0.62), X(0.27), Y(0.15), 0, 0, EG_TAU), EG_LINE, lw);
}
function egHead(c, X, Y, lw) {
  egDot(c, EG_FUR, X(0.5), Y(0.36), X(0.165), EG_LINE, lw);
}
function egFace(c, X, Y) {
  egP(c, EG_CREAM, (k) => eggPath(k, X(0.5), Y(0.4), X(0.11), Y(0.13)));
}
// SHOCKED: the lenses go wide with the pupils small inside them, the
// mustache flies up and out, and a small open mouth appears under it. The
// same marks as the calm face, moved — a second face drawing would drift.
function egEyes(c, X, Y, lw, shocked) {
  if (shocked) egGoggles(c, X(0.5), Y(0.34), X(0.058), X(0.035), [X(0.33), X(0.67)], 0.34);
  else egGoggles(c, X(0.5), Y(0.35), X(0.045), X(0.04), [X(0.35), X(0.65)]);
}
function egMouth(c, X, Y, lw, shocked) {
  if (shocked) {
    egP(c, EG_INK, (k) => k.ellipse(X(0.5), Y(0.53), X(0.035), Y(0.045), 0, 0, EG_TAU));
    egMustache(c, X(0.5), Y(0.44), X(0.23), Y(0.075), -0.5);
  } else {
    egMustache(c, X(0.5), Y(0.46), X(0.2), Y(0.07));
  }
}
const EG_BUST_ORDER = ['shell', 'body', 'head', 'face', 'hair', 'eyes', 'mouth'];
export const EGGSHELL_PARTS = Object.freeze({
  shell: egShell, body: egBody, head: egHead, face: egFace, hair: null, eyes: egEyes, mouth: egMouth,
  tub: eggshellTub, hands: eggshellHands,
});
function eggshellBust(c, X, Y, lw, shocked = false, p = EGGSHELL_PARTS) {
  for (const k of EG_BUST_ORDER) if (p[k]) p[k](c, X, Y, lw, shocked);
}
// The clown-copter tub he grips the rim of: cream, red stripes, two lamps,
// two skids, and his hands on the rim.
function eggshellTub(c, X, Y, lw) {
  for (const s of [0.2, 0.64]) egP(c, EG_CREAM, (k) => rr(k, X(s), Y(0.9), X(0.16), Y(0.08), X(0.02)), EG_LINE, lw * 0.7);
  egP(c, '#f0f0f8', (k) => rr(k, X(0.12), Y(0.6), X(0.76), Y(0.34), X(0.07)), EG_LINE, lw);
  for (const s of [0.24, 0.46, 0.68]) egP(c, EG_RED, (k) => rr(k, X(s), Y(0.66), X(0.08), Y(0.24), X(0.01)));
  egP(c, '#d0d0dc', (k) => rr(k, X(0.1), Y(0.58), X(0.8), Y(0.08), X(0.03)), EG_LINE, lw * 0.7);
  egDot(c, EG_GOLD, X(0.19), Y(0.8), X(0.045), EG_LINE, lw * 0.5);
  egDot(c, EG_GOLD, X(0.81), Y(0.8), X(0.045), EG_LINE, lw * 0.5);
}
// His fists. Part of the ape, not the tub, so a bonk lifts them with him —
// hands still gripping a rim he is no longer sitting in is the joke.
function eggshellHands(c, X, Y, lw) {
  egDot(c, EG_FUR, X(0.24), Y(0.6), X(0.06), EG_LINE, lw);
  egDot(c, EG_FUR, X(0.76), Y(0.6), X(0.06), EG_LINE, lw);
}
// The whole ape-in-tub at a sub-box origin inside a larger painter's box.
// `pop` (0..1) knocks him UP OUT OF HIS SEAT: the tub stays put, he and his
// fists rise off it, and he pulls a shocked face. Five units at full pop is
// about the gap between his chin and the rim — as far as he can go and still
// read as the same drawing.
export function eggshellApe(c, ox, oy, pop = 0, parts = null) {
  const p = parts ? { ...EGGSHELL_PARTS, ...parts } : EGGSHELL_PARTS;
  const X = (f) => EG_APE_W * f, Y = (f) => EG_APE_H * f, lw = EG_LW;
  c.save(); c.translate(ox, oy);
  const lift = pop * 5;
  c.save(); c.translate(0, -lift);
  eggshellBust(c, X, Y, lw, pop > 0.05, p);
  c.restore();
  if (p.tub) p.tub(c, X, Y, lw);
  c.save(); c.translate(0, -lift);
  if (p.hands) p.hands(c, X, Y, lw);
  c.restore();
  c.restore();
}
// His inks and pens, for the redesign file only: a candidate drawn with these
// sits beside the shipped ape at the same weight, so what differs is the
// design and never the line.
export const EGGSHELL_ART = Object.freeze({
  INK: EG_INK, CREAM: EG_CREAM, RED: EG_RED, FUR: EG_FUR, GOLD: EG_GOLD, LENS: EG_LENS,
  GREEN: EG_GREEN, GREEN_DK: EG_GREEN_DK, LINE: EG_LINE, LW: EG_LW, W: EG_APE_W, H: EG_APE_H, TAU: EG_TAU,
  P: egP, line: egLine, dot: egDot, egg: eggPath, mustache: egMustache, goggles: egGoggles, spikesArc: egSpikesArc, rr,
});

// The copter drawing, with the rotor's geometry as options so the gallery
// can bake off shapes against the shipped one (COPTER_ROTOR is what ships).
//   R    disc radius in the 28u box (13 spans nearly the box)
//   sq   the disc's tilt toward the camera: 1 is a circle, 0 is edge-on
//   hy   hub height in the box
//   blade  blade stroke weight; disc  draw the translucent disc at all
// SHIPS: bake-off option I (4 Sep 2026). Blades and their sweeps, NO disc —
// Peter: "it gives the illusion without being a permanent disc on screen".
// The translucent ellipse tinted everything behind it and never went away;
// two blades and their trailing arcs say "turning" only while they turn.
// R 10.5 keeps the span inside the tub's width, sq 0.16 is the tilt toward
// the camera (edge-on would be a line).
export const COPTER_ROTOR = { R: 10.5, sq: 0.16, hy: 6, blade: 1, disc: false };
export function eggshellCopterArt(ctx, w, h, frame = 0, o = {}) {
  //   parts  overrides for the ape's parts (EGGSHELL_PARTS); body  a painter
  //          (ctx) drawn in the 28x28 box INSTEAD of the ape and tub; mastTo
  //          where the mast ends, the top of his head unless the body says
  const { R, sq, hy, blade: bw, disc: withDisc, pop = 0, parts = null, body = null, mastTo = 8 + EG_APE_H * 0.34 } = { ...COPTER_ROTOR, ...o };
  ctx.save();
  ctx.scale(w / 28, h / 28);
  // sq is the disc's tilt toward the camera. 0.42 read as a disc but ate a
  // third of the box; 0.24 is still a disc (edge-on is a line) and gives the
  // room back to the ape. Peter: "flatten the propeller a bit".
  const cx = 14;
  const a = (frame % 12) * (Math.PI / 12);
  const blades = [a, a + Math.PI];
  const disc = (from, to) => { if (withDisc) egP(ctx, 'rgba(200,200,216,0.22)', (k) => k.ellipse(cx, hy, R, R * sq, 0, from, to)); };
  // THE TRAILS ARE THE MOTION. With the disc gone (option I) these arcs are
  // the only thing saying the rotor turns, and at the 36u the lane draws him
  // the first cut was too faint to notice — longer, wider and more opaque, and
  // a second fainter arc further back, so the blur reads at lane size and not
  // only in a gallery close-up.
  const sweep = (b) => {
    egLine(ctx, 'rgba(206,212,228,0.5)', 2.1 * bw, (k) => k.ellipse(cx, hy, R * 0.82, R * sq * 0.82, 0, b - 1.5, b));
    egLine(ctx, 'rgba(206,212,228,0.22)', 1.5 * bw, (k) => k.ellipse(cx, hy, R * 0.82, R * sq * 0.82, 0, b - 2.5, b - 1.4));
  };
  const blade = (b) => {
    egLine(ctx, '#3a3a48', 1.0 * bw, (k) => { k.moveTo(cx + Math.cos(b) * R * 0.1, hy + Math.sin(b) * R * sq * 0.1); k.lineTo(cx + Math.cos(b) * R, hy + Math.sin(b) * R * sq); });
    egLine(ctx, '#9a9aa8', 0.38 * bw, (k) => { k.moveTo(cx + Math.cos(b) * R * 0.2, hy + Math.sin(b) * R * sq * 0.2); k.lineTo(cx + Math.cos(b) * R * 0.92, hy + Math.sin(b) * R * sq * 0.92); });
  };
  // far half of the disc and whichever blade is on it, the mast, him, then
  // the near half over the top of his head
  disc(Math.PI, EG_TAU);
  for (const b of blades) if (Math.sin(b) < 0) { sweep(b); blade(b); }
  egLine(ctx, '#3a3a48', 0.85, (k) => { k.moveTo(cx, hy); k.lineTo(cx, mastTo); });
  if (body) body(ctx); else eggshellApe(ctx, 2, 8, pop, parts);
  disc(0, Math.PI);
  for (const b of blades) if (Math.sin(b) >= 0) { sweep(b); blade(b); }
  if (withDisc) egLine(ctx, 'rgba(236,236,246,0.45)', 0.35, (k) => k.ellipse(cx, hy, R, R * sq, 0, 0, EG_TAU));
  egDot(ctx, '#8a8a98', cx, hy, 1, EG_LINE, 0.5);
  ctx.restore();
}

export const PROP_PAINTERS = {
  ...ANIMAL_PAINTERS,
  ...finishDogTable(ANIMAL_PAINTERS),
  // --- ground hazards ---------------------------------------------------
  // A thorn cactus: saguaro silhouette — fat trunk, two arms elbowing upward —
  // bristling with pale spines. This slot cycled through shrub drawings and a
  // fire before landing here; a cactus is the one desert prop whose silhouette
  // survives 13x12, because everyone already knows the shape.
  //
  // Red-orange, not green, ON PURPOSE: the guide teaches RED = AVOID, and the
  // plumber cabinet's turf is #3a9c48 — a green cactus vanishes into exactly
  // the ground it spawns on. (A red shrub was where this art began, for the
  // same reason.)
  cactus(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const base = h * 0.995;
    // A slow sway, like the whole plant is grooving to the cabinet music: the
    // body shears about its base (feet planted, top swinging) while each arm
    // bobs on its own offset of the same cycle. Shear rather than rotation so
    // the base never lifts off the ground line.
    const p = (frame % 6) * (Math.PI / 3);
    const k = 0.045 * Math.sin(p);
    ctx.save();
    ctx.transform(1, 0, -k, 1, k * base, 0);
    const armBobL = h * 0.02 * Math.sin(p + 1.1);
    const armBobR = h * 0.02 * Math.sin(p + 3.9);
    const arm = (c, x0, y0, aw, rise, dir) => {
      // an elbow: out sideways, then up, rounded at both turns
      c.moveTo(x0, y0 + aw);
      c.lineTo(x0 + dir * (aw * 1.7), y0 + aw);
      c.arcTo(x0 + dir * (aw * 2.6), y0 + aw, x0 + dir * (aw * 2.6), y0, aw * 0.9);
      c.lineTo(x0 + dir * (aw * 2.6), y0 - rise);
      c.arcTo(x0 + dir * (aw * 2.6), y0 - rise - aw, x0 + dir * (aw * 1.6), y0 - rise - aw, aw);
      c.arcTo(x0 + dir * (aw * 0.8), y0 - rise - aw, x0 + dir * (aw * 0.8), y0 - rise, aw * 0.8);
      c.lineTo(x0 + dir * (aw * 0.8), y0 - aw * 0.2);
      c.closePath();
    };
    fineShape(ctx, '#d84828', u, (c) => {
      // trunk: slightly waisted, domed top
      c.moveTo(w * 0.38, base);
      c.lineTo(w * 0.38, h * 0.3);
      c.arc(w * 0.5, h * 0.3, w * 0.12, Math.PI, 0, false);
      c.lineTo(w * 0.62, base);
      c.closePath();
      arm(c, w * 0.38, h * 0.52 + armBobL, w * 0.1, h * 0.16 - armBobL, -1); // left arm, lower
      arm(c, w * 0.62, h * 0.4 + armBobR, w * 0.1, h * 0.1 - armBobR, 1);    // right arm, higher
    });
    // Ribs: two darker grooves down the trunk, one per arm.
    stroke(ctx, '#a83020', Math.max(0.5, w * 0.045), (c) => {
      c.moveTo(w * 0.46, h * 0.26); c.lineTo(w * 0.46, base - h * 0.04);
      c.moveTo(w * 0.55, h * 0.28); c.lineTo(w * 0.55, base - h * 0.04);
      c.moveTo(w * 0.16, h * 0.42); c.lineTo(w * 0.16, h * 0.56);
      c.moveTo(w * 0.85, h * 0.32); c.lineTo(w * 0.85, h * 0.44);
    });
    // Spines: short pale ticks angling off the trunk and arm edges. These are
    // the "thorn" in thorn cactus — without them it is a red glove.
    stroke(ctx, '#f8d0a0', Math.max(0.45, w * 0.04), (c) => {
      const ticks = [
        [0.38, 0.34, -1, -0.2], [0.38, 0.62, -1, 0.15], [0.38, 0.86, -1, -0.1],
        [0.62, 0.5, 1, -0.15], [0.62, 0.74, 1, 0.2], [0.62, 0.92, 1, -0.1],
        [0.44, 0.2, -0.5, -1], [0.58, 0.2, 0.5, -1],
        [0.09, 0.38, -0.8, -0.6], [0.24, 0.38, 0.6, -0.8],
        [0.78, 0.28, -0.6, -0.8], [0.92, 0.28, 0.8, -0.6],
      ];
      for (const [tx, ty, dx, dy] of ticks) {
        c.moveTo(w * tx, h * ty);
        c.lineTo(w * (tx + dx * 0.06), h * (ty + dy * 0.06));
      }
    });
    ctx.restore();
    // A little sand mound so it grows out of the ground rather than standing
    // on it. Outside the sway shear: the ground does not dance.
    plain(ctx, '#8a2018', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.34, h * 0.04, 0, 0, Math.PI * 2));
  },
  cactusBig(ctx, w, h, frame = 0) { PROP_PAINTERS.cactus(ctx, w, h, frame); },
  // --- standing hazards, ported from the ten-family bake-off ------------
  // These six came out of the hazard sheet in the gallery (see the section
  // "Stationary hazards"). What changed on the way in is the ANIMATION, not the
  // drawing: the gallery painters run on a wall clock and are free to have a
  // safe window, and a shipped prop is rasterized into a fixed ring of frames
  // and has to be dangerous in every one of them.
  //
  // So each cycle here is authored on a normalized phase — `p` runs 0..TAU
  // across PROP_FRAMES — and every wobble inside it is an INTEGER multiple of
  // that phase. Anything else lands the last frame somewhere the first frame is
  // not, and the loop point ticks. See hzFlame/hzEmbers for the pattern.
  //
  // The pop-up spikes are the one place where a look had to be traded against
  // the hitbox: the bake-off version drops fully out of sight for two thirds of
  // its cycle, which is a timing puzzle the spawner has no way to budget for
  // (`action: 'jump'` means "dangerous now"). Shipped, they never fully retract
  // — they ride between two-thirds and full extension — so the mechanism still
  // reads as live and the box never lies.
  //
  // It is a plate SET INTO the road, and it used to be drawn as two slabs
  // stacked on top of it: a frame that stopped short of the bottom of the box
  // and a second, wider plinth under that. Two visible bottom edges and two
  // ink lines is the picture of something parked on the grass. Now the frame
  // runs past the bottom of the box and is cut flat by the ground line and the
  // plinth is gone, so the plate has no visible foot at all. The BURYING is
  // done by the RENDERER, not here (see BED_SINK and the `bedded` branch in
  // draw.js): the art is seated 4px below the ground line and clipped at it,
  // so only the top sliver of the plate face survives above the road — which
  // is why the chevron stripe rides directly under the top edge below, not
  // partway down the face where it was authored.
  popSpikes(ctx, w, h, frame = 0) {
    const f = ((frame % 8) + 8) % 8;
    const p = hzPhase(frame, 8);
    // 0.62..1 rather than 0..1. Always out, always lethal, still moving.
    const up = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(p));
    // Was 0.62. The teeth keep their full travel wherever this sits, because
    // they are measured from the plate, not from the box.
    const plateY = h * 0.6;
    const n = 5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -h, w, plateY + h);
    ctx.clip();
    for (let i = 0; i < n; i++) {
      const x = w * (0.15 + i * 0.7 / (n - 1));
      hzTri(ctx, x, plateY + h * 0.05, w * 0.06, h * (0.1 + 0.54 * up),
        i % 2 ? '#e4eaf1' : '#b9c4d0', '#232a34', Math.max(0.12, w * 0.018));
    }
    ctx.restore();
    // 0.46 tall from 0.6 reaches h * 1.06 — deliberately past the bottom of the
    // canvas, so the rounded corners and the ink line at the foot are cut off
    // rather than drawn. A shape with no visible bottom edge continues.
    hzBox(ctx, w * 0.03, plateY, w * 0.94, h * 0.46, h * 0.06, '#454f5c', HZ_INK, Math.max(0.14, w * 0.02));
    // The chevron chase slides with the FRAME, not with the spike height. Tied
    // to the height it inherited the sine's mirror symmetry, and a plate whose
    // frames 1 and 3 are the same picture is a four-frame animation wearing an
    // eight-frame cache.
    //
    // Directly under the plate's top edge, with the tooth slots punched
    // THROUGH it afterwards, because that top strip is all of the face the
    // road leaves visible (see the burial note above). Where it used to sit —
    // 0.15h down the face — is underground now, and a hazard stripe nobody
    // can see marks nothing.
    hzStripe(ctx, w * 0.06, plateY + h * 0.035, w * 0.88, h * 0.07, f * h * 0.028);
    // Narrower than they were (0.13w): five slots at that width ate nearly
    // the whole stripe and the band read as black with yellow flecks. 0.09
    // still brackets each tooth and leaves the chevrons legible between them.
    for (let i = 0; i < n; i++) {
      const x = w * (0.15 + i * 0.7 / (n - 1));
      hzBox(ctx, x - w * 0.045, plateY + h * 0.035, w * 0.09, h * 0.06, h * 0.02,
        '#12161d', '#2b323c', Math.max(0.1, w * 0.014));
    }
  },

  // A settled campfire: crossed logs with the flame sitting INSIDE the pile
  // rather than balanced on top of it, which is the difference between a fire
  // and a bonfire-shaped sticker.
  campfire(ctx, w, h, frame = 0) {
    const p = hzPhase(frame, 8);
    hzGlow(ctx, w * 0.5, h * 0.96, w * 0.52, h * 0.07, '#ff8a2c', 0.34);
    for (const [x0, y0, x1, y1, col] of [
      [0.12, 0.96, 0.7, 0.8, '#8a5a35'], [0.88, 0.96, 0.3, 0.8, '#5b3a22'], [0.22, 0.88, 0.8, 0.92, '#7a4c2c'],
    ]) {
      hzLine(ctx, '#2c1a10', Math.max(0.34, w * 0.15), (c) => { c.moveTo(w * x0, h * y0); c.lineTo(w * x1, h * y1); });
      hzLine(ctx, col, Math.max(0.24, w * 0.11), (c) => { c.moveTo(w * x0, h * y0); c.lineTo(w * x1, h * y1); });
    }
    hzFlame(ctx, w * 0.5, h * 0.88, w * 0.52, h * 0.66, p, 0);
    hzFlame(ctx, w * 0.3, h * 0.92, w * 0.26, h * 0.32, p, 2);
    hzFlame(ctx, w * 0.69, h * 0.92, w * 0.23, h * 0.28, p, 4);
    hzEmbers(ctx, w * 0.5, h * 0.52, w, h * 0.5, p, 5, 1);
  },

  // The drum fire. Rust-through holes lit from inside are the detail that says
  // the fire is IN the barrel rather than sitting on the rim — worth the two
  // extra dots, because at 13px the flame itself is most of the drawing.
  fireBarrel(ctx, w, h, frame = 0) {
    const p = hzPhase(frame, 8);
    hzGlow(ctx, w * 0.5, h * 0.98, w * 0.55, h * 0.035, '#ff8a2c', 0.3);
    const bx = w * 0.17, by = h * 0.42, bw = w * 0.66, bh = h * 0.57;
    hzBarrel(ctx, bx, by, bw, bh, '#a4603a', '#7c4526');
    // Rust-through, as torn SLITS between the bands rather than as round holes.
    // Round and centred, they read as handles on the thing the bands had
    // already made look like a cabinet.
    for (const [fx, fy, rw, rh] of [[0.3, 0.52, 0.1, 0.05], [0.6, 0.86, 0.07, 0.04], [0.46, 0.16, 0.06, 0.035]]) {
      hzPath(ctx, '#ffb03a', '#5e2f16', Math.max(0.12, w * 0.016), (c) => {
        c.ellipse(bx + bw * fx, by + bh * fy, bw * rw, bh * rh, 0.25, 0, HZ_TAU);
      });
    }
    hzPath(ctx, '#2a1a12', '#120c09', Math.max(0.18, w * 0.024), (c) => {
      c.ellipse(bx + bw * 0.5, by, bw * 0.5, bh * 0.1, 0, 0, HZ_TAU);
    });
    hzFlame(ctx, w * 0.5, by + h * 0.02, w * 0.58, h * 0.4, p, 0);
    hzFlame(ctx, w * 0.35, by + h * 0.02, w * 0.24, h * 0.19, p, 2);
    hzFlame(ctx, w * 0.65, by + h * 0.01, w * 0.22, h * 0.22, p, 4);
    hzEmbers(ctx, w * 0.5, by - h * 0.05, w * 0.8, h * 0.32, p, 4, 1);
  },

  // Chest-height fire on three legs. This is the Crypt's one lit object, so the
  // bowl of coals under the flame matters: it keeps something warm on screen in
  // the frames where the flame licks short.
  brazier(ctx, w, h, frame = 0) {
    const p = hzPhase(frame, 8);
    hzGlow(ctx, w * 0.5, h * 0.97, w * 0.5, h * 0.04, '#ff9a3c', 0.28);
    const bowlY = h * 0.52;
    for (const s of [-1, 0.15, 1]) {
      hzLine(ctx, '#333b46', Math.max(0.28, w * 0.09), (c) => {
        c.moveTo(w * (0.5 + s * 0.15), bowlY + h * 0.07);
        c.lineTo(w * (0.5 + s * 0.34), h * 0.98);
      });
    }
    hzLine(ctx, '#5d6774', Math.max(0.2, w * 0.05), (c) => {
      c.moveTo(w * 0.22, h * 0.78); c.lineTo(w * 0.78, h * 0.78);
    });
    hzPath(ctx, '#4d4038', '#231b16', Math.max(0.2, w * 0.045), (c) => {
      c.moveTo(w * 0.18, bowlY); c.lineTo(w * 0.82, bowlY);
      c.quadraticCurveTo(w * 0.72, bowlY + h * 0.2, w * 0.5, bowlY + h * 0.21);
      c.quadraticCurveTo(w * 0.28, bowlY + h * 0.2, w * 0.18, bowlY);
      c.closePath();
    });
    hzPath(ctx, '#6a5a4c', '#231b16', Math.max(0.16, w * 0.035), (c) => {
      c.ellipse(w * 0.5, bowlY, w * 0.32, h * 0.05, 0, 0, HZ_TAU);
    });
    for (let i = 0; i < 4; i++) {
      const heat = 0.5 + 0.5 * Math.sin(p * 2 + i * 1.6);
      hzDot(ctx, w * (0.33 + i * 0.113), bowlY + h * 0.005, w * 0.055, heat > 0.6 ? '#ffbe4c' : '#d3491a');
    }
    hzFlame(ctx, w * 0.5, bowlY - h * 0.005, w * 0.46, h * 0.44, p, 0);
    hzFlame(ctx, w * 0.36, bowlY, w * 0.2, h * 0.2, p, 3);
    hzFlame(ctx, w * 0.64, bowlY, w * 0.18, h * 0.22, p, 5);
    hzEmbers(ctx, w * 0.5, bowlY - h * 0.09, w * 0.7, h * 0.34, p, 4, 1);
  },

  // Half-buried blade in a slotted plate. The 8-frame ring turns the disc by
  // exactly one tooth, so the loop point is invisible and the spin never
  // strobes backwards the way an arbitrary frame count does.
  floorSaw(ctx, w, h, frame = 0) {
    const f = ((frame % 8) + 8) % 8;
    // Was 0.66, with the plate stopping exactly on the bottom of the box: two
    // rounded corners and an ink line at the floor, which is a slab standing on
    // the road. Same fix as the spike plate — sit it lower, run it past the
    // bottom edge so the foot is cut rather than drawn, and bed the corners.
    const slotY = h * 0.62;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -h, w, slotY + h);
    ctx.clip();
    // Centred just below the slot with a big radius, so roughly the top half of
    // the disc stands above the plate. The first pass sank it: 4px of white
    // bump over a yellow-and-black plinth is a lump, not a blade.
    hzBlade(ctx, w * 0.5, slotY + h * 0.12, Math.min(w * 0.42, h * 0.62), (f / 8) * (HZ_TAU / 12), 12);
    ctx.restore();
    hzBox(ctx, w * 0.02, slotY, w * 0.96, h * 0.44, h * 0.06, '#454f5c', HZ_INK, Math.max(0.14, w * 0.02));
    // Stripe at the very top of the plate, blade slot punched through it —
    // same reason as the spike plate's (see its burial note): the road leaves
    // only the top sliver of the face visible, and the stripe's old berth
    // 0.14h down the face is underground.
    hzStripe(ctx, w * 0.05, slotY + h * 0.025, w * 0.9, h * 0.08, f * 1.6);
    hzBox(ctx, w * 0.2, slotY + h * 0.03, w * 0.6, h * 0.08, h * 0.025, '#10141a', '#2b323c', Math.max(0.1, w * 0.014));
    hzSparks(ctx, w * 0.28, slotY, Math.min(w, h) * 0.16, f, 8, 1, 3);
    hzSparks(ctx, w * 0.72, slotY, Math.min(w, h) * 0.16, f, 8, 4, 3);
  },

  // The razor hurdle — a short ground-standing jump (registered under the legacy
  // `boomBarrier` id; see OBSTACLES.boomBarrier).
  // The whole drawing is the hitbox now: matching grey uprights, feet and rail
  // form one low piece of ground furniture. Teeth point UP so the action reads
  // as jump before the player has to infer anything from its height.
  // The 8-frame cycle is warning light/electrical activity; the blade never
  // moves — a rising gate would be a timing puzzle `action: 'duck'` cannot
  // declare. Its teeth stop at the old arm's painted lower edge, preserving
  // the forgiving visual clearance above the crouched hero.
  boomBarrier(ctx, w, h, frame = 0) {
    const f = ((frame % 8) + 8) % 8;
    const p = hzPhase(frame, 8);
    const railTop = h * 0.31, railBot = h * 0.49;
    const railH = railBot - railTop;
    // Twin posts: same width, same feet, same grey value. They sit behind the
    // rail so the upward teeth remain the first read, not two switches.
    const postW = w * 0.13;
    const postTop = railTop + railH * 0.3;
    const postH = h - postTop;
    const leftPostX = w * 0.04, rightPostX = w * 0.83;
    for (const [px, footX] of [[leftPostX, w * 0.005], [rightPostX, w * 0.745]]) {
      hzBox(ctx, footX, h * 0.9, w * 0.25, h * 0.1, h * 0.02,
        '#333b46', HZ_INK, Math.max(0.2, w * 0.03));
      hzBox(ctx, px, postTop, postW, postH, w * 0.02,
        '#454f5c', HZ_INK, Math.max(0.2, w * 0.03));
      hzLine(ctx, '#687482', Math.max(0.16, w * 0.018), (c) => {
        c.moveTo(px + postW * 0.32, railBot + h * 0.055);
        c.lineTo(px + postW * 0.32, h * 0.88);
      });
    }
    // A dark structural rail with a continuous row of steel teeth on TOP. The
    // old downward teeth said duck even after the frame became a hurdle; this
    // silhouette says jump and keeps the opening beneath visually irrelevant.
    const drawH = railH;
    const bladeStart = w * 0.1;
    const bladeEnd = w * 0.9;
    const bladeW = bladeEnd - bladeStart;
    const toothBase = railTop;
    const toothTip = h * 0.035;
    hzBox(ctx, bladeStart, railTop, bladeW, drawH, drawH * 0.12,
      '#414b57', HZ_INK, Math.max(0.25, w * 0.035));
    // A narrow warning inset keeps the roadwork ancestry without turning the
    // whole object back into a harmless parking stripe.
    hzBox(ctx, bladeStart + w * 0.035, railTop + drawH * 0.28, bladeW - w * 0.07, drawH * 0.22,
      drawH * 0.04, '#c83b32', '#6d201e', Math.max(0.1, w * 0.012));
    for (let i = 0; i < 5; i++) {
      const x0 = bladeStart + bladeW * i / 5;
      const x1 = bladeStart + bladeW * (i + 1) / 5;
      hzPath(ctx, i % 2 ? '#aeb9c5' : '#d5dde5', '#232a34', Math.max(0.18, w * 0.022), (c) => {
        c.moveTo(x0, toothBase);
        c.lineTo((x0 + x1) * 0.5, toothTip);
        c.lineTo(x1, toothBase);
        c.closePath();
      });
    }
    // Hot seam and a travelling spit of current: activity without a moving
    // collision shape or an implied safe window.
    hzLine(ctx, '#ff8a3d', Math.max(0.16, w * 0.018), (c) => {
      c.moveTo(bladeStart + w * 0.02, toothBase);
      c.lineTo(bladeEnd - w * 0.02, toothBase);
    });
    // The spit rides sin(p) and its glow bobs on cos(p): one sinusoid alone
    // retraces itself over the back half of the loop, so frame 4 would land
    // exactly on frame 0 and the 8-frame cycle would only ever show 7 poses.
    const sparkX = bladeStart + bladeW * (0.5 + Math.sin(p) * 0.34);
    hzGlow(ctx, sparkX, toothBase - h * 0.01 * (1 + Math.cos(p)), w * 0.08, h * 0.035,
      '#ff9a42', 0.14 + 0.1 * Math.cos(p * 2));
    hzSparks(ctx, sparkX, toothBase, Math.min(w, h) * 0.08, f, 8, 3, 2);
    // Boxed hinge and post-mounted beacon. Keeping the lamp off the free tip
    // removes the button/switch read; it is now plainly a warning attached to
    // the machine holding the blade.
    for (const hx of [leftPostX + postW * 0.5, rightPostX + postW * 0.5]) {
      hzBox(ctx, hx - w * 0.065, railTop - h * 0.01, w * 0.13, drawH * 1.05,
        w * 0.02, '#252c36', HZ_INK, Math.max(0.2, w * 0.028));
      hzDot(ctx, hx, railTop + drawH * 0.52, w * 0.018,
        '#a8b1bc', '#11151b', Math.max(0.1, w * 0.012));
    }
    const bx = rightPostX + postW * 0.5, by = railTop - h * 0.13;
    const heat = 0.55 + 0.45 * Math.sin(p);
    hzGlow(ctx, bx, by, w * 0.11, h * 0.07, '#ff4b35', 0.16 + 0.2 * heat);
    hzBox(ctx, bx - w * 0.045, by - h * 0.035, w * 0.09, h * 0.07,
      w * 0.018, heat > 0.45 ? '#ff5a3c' : '#842a24', HZ_INK, Math.max(0.16, w * 0.02));
    hzLine(ctx, '#ffd9b0', Math.max(0.12, w * 0.014), (c) => {
      c.moveTo(bx - w * 0.018, by - h * 0.012); c.lineTo(bx + w * 0.018, by - h * 0.012);
    });
  },

  // The green cactus from the bake-off's THORNS row, as an occasional skin on
  // the red one (see `skins` on OBSTACLES.cactus).
  //
  // The red cactus's own note argues green is unshippable because plumber turf
  // is #3a9c48 and a green plant disappears into it. That objection is real and
  // it is answered here rather than ignored: this body is a full value step
  // darker than the turf, its contour is heavy, it is the one cactus that does
  // NOT self-outline (so the shared two-pass hazard rim lands around it), and
  // the magenta flower on top is a colour that appears nowhere in any cabinet's
  // ground. The red one still carries the rule; this is the exception that
  // proves a lane can hold both.
  cactusGreen(ctx, w, h, frame = 0) {
    const p = hzPhase(frame, 6);
    const base = h * 0.995;
    const k = 0.04 * Math.sin(p);
    ctx.save();
    ctx.transform(1, 0, -k, 1, k * base, 0);
    const armBobL = h * 0.02 * Math.sin(p + 1.1);
    const armBobR = h * 0.02 * Math.sin(p + 3.9);
    const ink = '#16331d';
    const lineW = Math.max(0.3, w * 0.05);
    hzPath(ctx, '#2f7a3c', ink, lineW, (c) => {
      hzRR(c, w * 0.38, h * 0.1, w * 0.24, h * 0.9, w * 0.12);
    });
    for (const [s, y0, rise, bob] of [[-1, 0.5, 0.2, armBobL], [1, 0.4, 0.26, armBobR]]) {
      const bx = w * (0.5 + s * 0.11), by = h * (y0 + bob / h);
      hzPath(ctx, '#2f7a3c', ink, lineW, (c) => {
        c.moveTo(bx, by);
        c.lineTo(bx + s * w * 0.16, by);
        c.quadraticCurveTo(bx + s * w * 0.28, by, bx + s * w * 0.28, by - h * 0.08);
        c.lineTo(bx + s * w * 0.28, by - h * rise);
        c.quadraticCurveTo(bx + s * w * 0.28, by - h * (rise + 0.09), bx + s * w * 0.19, by - h * (rise + 0.09));
        c.quadraticCurveTo(bx + s * w * 0.11, by - h * (rise + 0.09), bx + s * w * 0.11, by - h * rise);
        c.lineTo(bx + s * w * 0.11, by - h * 0.09);
        c.quadraticCurveTo(bx + s * w * 0.11, by - h * 0.01, bx, by - h * 0.05);
        c.closePath();
      });
    }
    hzLine(ctx, '#4e9c53', Math.max(0.25, w * 0.035), (c) => {
      c.moveTo(w * 0.44, h * 0.18); c.lineTo(w * 0.44, h * 0.94);
      c.moveTo(w * 0.56, h * 0.18); c.lineTo(w * 0.56, h * 0.94);
    });
    // Paired spines every rib. Without them this is a friendly green plant, and
    // a friendly-looking hazard is the failure mode the red one exists to avoid.
    hzLine(ctx, '#f2e8c6', Math.max(0.28, w * 0.038), (c) => {
      for (let i = 0; i < 7; i++) {
        const y = h * (0.2 + i * 0.11);
        c.moveTo(w * 0.38, y); c.lineTo(w * 0.3, y - h * 0.03);
        c.moveTo(w * 0.62, y); c.lineTo(w * 0.7, y - h * 0.03);
      }
      for (let i = 0; i < 3; i++) {
        c.moveTo(w * 0.21, h * (0.34 + i * 0.08)); c.lineTo(w * 0.13, h * (0.32 + i * 0.08));
        c.moveTo(w * 0.79, h * (0.24 + i * 0.08)); c.lineTo(w * 0.87, h * (0.22 + i * 0.08));
      }
    });
    hzDot(ctx, w * 0.5, h * 0.09, w * 0.1, '#e8557f', '#7a2340', Math.max(0.2, w * 0.03));
    hzDot(ctx, w * 0.5, h * 0.09, w * 0.038, '#ffe07a');
    ctx.restore();
    plain(ctx, '#1d4a26', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.34, h * 0.04, 0, 0, Math.PI * 2));
  },

  // Frost Fortress swaps the desert hazard for this hostile little snowman.
  // It keeps the cactus hitbox and red "avoid" read, but belongs to the ice
  // cabinet: blue-shadowed snow, coal eyes, carrot nose, and a broad red scarf.
  // Six shivering poses move the twig arms while the bottom snowball stays
  // planted on the ground line.
  snowman(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath();
      pathFn(ctx);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(26,16,40,0.24)';
      ctx.lineWidth = Math.max(0.24, u * 0.013);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };
    const p = (frame % 6) * (Math.PI / 3);
    const sway = Math.sin(p);
    const shiver = Math.cos(p);
    const cx = w * (0.5 + sway * 0.018);
    const bodyY = h * (0.765 + (1 - shiver) * 0.006);
    const headY = h * (0.37 - shiver * 0.012);
    const armLine = Math.max(0.55, u * 0.052);

    // Twig arms sit behind the snowballs. Their opposing wave makes the
    // shiver readable even at the ordinary 13-pixel obstacle width.
    stroke(ctx, '#513849', armLine, (c) => {
      c.moveTo(cx - w * 0.23, h * 0.58);
      c.lineTo(w * 0.12, h * (0.46 + sway * 0.035));
      c.lineTo(w * 0.035, h * (0.39 + sway * 0.055));
      c.moveTo(w * 0.12, h * (0.46 + sway * 0.035));
      c.lineTo(w * 0.07, h * (0.5 + sway * 0.02));
      c.moveTo(cx + w * 0.23, h * 0.57);
      c.lineTo(w * 0.88, h * (0.43 - sway * 0.035));
      c.lineTo(w * 0.965, h * (0.34 - sway * 0.055));
      c.moveTo(w * 0.88, h * (0.43 - sway * 0.035));
      c.lineTo(w * 0.94, h * (0.47 - sway * 0.02));
    });

    // Two simple, flat snowballs with the shared soft outline.
    fineShape('#eaf6ff', (c) => {
      c.ellipse(cx, bodyY, w * (0.34 + shiver * 0.006), h * (0.23 - shiver * 0.004), 0, 0, Math.PI * 2);
    });
    plain(ctx, '#b9d9ee', (c) => {
      c.ellipse(cx - w * 0.13, bodyY + h * 0.045, w * 0.075, h * 0.14, -0.22, 0, Math.PI * 2);
    });
    fineShape('#f7fbff', (c) => {
      c.ellipse(cx, headY, w * 0.285, h * 0.235, sway * 0.025, 0, Math.PI * 2);
    });
    plain(ctx, '#c9e3f2', (c) => {
      c.ellipse(cx - w * 0.12, headY + h * 0.03, w * 0.06, h * 0.125, -0.15, 0, Math.PI * 2);
    });

    // The scarf is deliberately broad and red: on the pale ice palette this
    // replaces the cactus's red body as the instant hazard cue.
    fineShape('#d84848', (c) => rr(c, cx - w * 0.255, h * 0.515, w * 0.51, h * 0.105, h * 0.045));
    plain(ctx, '#a83038', (c) => {
      c.moveTo(cx + w * 0.105, h * 0.585);
      c.lineTo(cx + w * (0.28 + sway * 0.025), h * 0.64);
      c.lineTo(cx + w * (0.23 + sway * 0.02), h * 0.82);
      c.lineTo(cx + w * 0.08, h * 0.69);
      c.closePath();
    });
    // A simple three-button row down the torso.
    plain(ctx, '#2b2440', (c) => {
      c.arc(cx - w * 0.012, h * 0.69, w * 0.034, 0, Math.PI * 2);
      c.arc(cx + w * 0.014, h * 0.79, w * 0.034, 0, Math.PI * 2);
      c.arc(cx - w * 0.02, h * 0.89, w * 0.034, 0, Math.PI * 2);
    });

    // Oversized rounded-rectangle glasses turn the hazard into a visual joke.
    // The pupils
    // are deliberately mismatched—both generally watch the player to the left,
    // but they cannot quite agree on where the player is.
    const glassesColor = 'rgba(55,35,76,0.78)';
    const glassesLine = cappedLine(u, 0.34, 0.022, 0.58);
    stroke(ctx, glassesColor, glassesLine, (c) => {
      c.moveTo(cx - w * 0.235, headY - h * 0.055); c.lineTo(cx - w * 0.29, headY - h * 0.085);
      c.moveTo(cx + w * 0.235, headY - h * 0.055); c.lineTo(cx + w * 0.29, headY - h * 0.085);
      c.moveTo(cx - w * 0.02, headY - h * 0.055); c.lineTo(cx + w * 0.02, headY - h * 0.055);
    });
    ctx.beginPath();
    rr(ctx, cx - w * 0.25, headY - h * 0.12, w * 0.22, h * 0.11, h * 0.032);
    rr(ctx, cx + w * 0.03, headY - h * 0.12, w * 0.22, h * 0.11, h * 0.032);
    ctx.fillStyle = '#f7fbff';
    ctx.fill();
    ctx.strokeStyle = glassesColor;
    ctx.lineWidth = glassesLine;
    ctx.lineJoin = 'round';
    ctx.stroke();
    plain(ctx, '#172238', (c) => {
      c.ellipse(cx - w * 0.148, headY - h * 0.072, w * 0.034, h * 0.048, -0.12, 0, Math.PI * 2);
      c.ellipse(cx + w * 0.087, headY - h * 0.052, w * 0.034, h * 0.048, 0.18, 0, Math.PI * 2);
    });
    plain(ctx, '#fff', (c) => {
      c.arc(cx - w * 0.16, headY - h * 0.097, w * 0.011, 0, Math.PI * 2);
      c.arc(cx + w * 0.075, headY - h * 0.079, w * 0.011, 0, Math.PI * 2);
    });
    // A darker rounded root sits inside the snow head; the carrot cone emerges
    // from it and draws over the glasses, so it is both embedded and in front.
    plain(ctx, '#c95b25', (c) => {
      c.ellipse(cx - w * 0.006, headY + h * 0.004, w * 0.045, h * 0.05, -0.08, 0, Math.PI * 2);
    });
    plain(ctx, '#ef7b32', (c) => {
      c.moveTo(cx - w * 0.006, headY - h * 0.038);
      c.lineTo(cx - w * 0.37, headY + h * (0.005 - sway * 0.008));
      c.lineTo(cx - w * 0.018, headY + h * 0.045);
      c.closePath();
    });
    // One understated crooked mouth completes the face without competing with
    // the glasses or turning into another row of coal.
    stroke(ctx, 'rgba(37,29,57,0.72)', cappedLine(u, 0.3, 0.018, 0.44), (c) => {
      c.moveTo(cx - w * 0.085, headY + h * 0.093);
      c.quadraticCurveTo(cx - w * 0.005, headY + h * 0.103, cx + w * 0.08, headY + h * 0.101);
    });
    plain(ctx, '#91b9d2', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.34, h * 0.035, 0, 0, Math.PI * 2));
  },
  snowmanBig(ctx, w, h, frame = 0) { PROP_PAINTERS.snowman(ctx, w, h, frame); },
  crate(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(50,30,12,0.24)';
      ctx.lineWidth = Math.max(0.12, u * 0.01);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // Flat, rounded construction: one fine frame and one inset wooden face.
    // Depth belongs to the flying toaster; this stays in the prop language.
    fineShape('#8a6432', (c) => rr(c, w * 0.04, h * 0.05, w * 0.92, h * 0.9, w * 0.17));
    plain(ctx, '#c89858', (c) => rr(c, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.14));
    plain(ctx, 'rgba(255,230,176,0.3)', (c) => rr(c, w * 0.13, h * 0.14, w * 0.74, h * 0.08, h * 0.035));
    stroke(ctx, 'rgba(106,70,30,0.48)', Math.max(0.32, w * 0.028), (c) => {
      c.moveTo(w * 0.14, h * 0.39); c.lineTo(w * 0.86, h * 0.39);
      c.moveTo(w * 0.14, h * 0.63); c.lineTo(w * 0.86, h * 0.63);
    });
    stroke(ctx, '#8a5a2a', Math.max(0.5, w * 0.055), (c) => {
      c.moveTo(w * 0.19, h * 0.22); c.lineTo(w * 0.81, h * 0.79);
      c.moveTo(w * 0.81, h * 0.22); c.lineTo(w * 0.19, h * 0.79);
    });
    plain(ctx, '#5a4020', (c) => {
      for (const [x, y] of [[0.14, 0.15], [0.86, 0.15], [0.14, 0.85], [0.86, 0.85]])
        c.arc(w * x, h * y, w * 0.025, 0, Math.PI * 2);
    });
  },
  // THE CARD BOX. A crate's box and a crate's silhouette on purpose — it stands
  // where a crate stands and it is the same 12x11 — so everything that says
  // SHOOT rather than JUMP has to be carried by the paint.
  //
  // Three marks do it. The card is paler and greyer than the crate's warm pine
  // (a crate is timber; this is board), the cross-braces are gone in favour of
  // ONE tape seam down the middle, and the face carries a target ring in
  // #f890b8 — the exact pink the beat ribbon draws its ability glyph in (see
  // drawBeatRibbon in game/hud.js). That shared colour is the whole lesson: the
  // circle on the strip and the circle on the box are one instruction, and the
  // player learns the pairing the first time they meet it.
  //
  // A ring rather than a bullseye. At twelve world px a filled disc is a dot
  // and a three-band bullseye is mud; an open ring with a cross-hair tick at
  // each side reads as "aim here" at the size the lane actually draws it.
  cardBox(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(48,32,16,0.26)';
      ctx.lineWidth = Math.max(0.12, u * 0.01);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // Board, not timber: a cool card brown with a paler face inset.
    fineShape('#8a6a3a', (c) => rr(c, w * 0.04, h * 0.05, w * 0.92, h * 0.9, w * 0.14));
    plain(ctx, '#c8a068', (c) => rr(c, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.11));
    // The flap line across the top and the one tape seam down from it. Packing
    // tape is lighter than the card and slightly translucent, so it is a pale
    // wash rather than a drawn line.
    stroke(ctx, 'rgba(90,62,30,0.42)', Math.max(0.3, w * 0.026), (c) => {
      c.moveTo(w * 0.12, h * 0.3); c.lineTo(w * 0.88, h * 0.3);
    });
    plain(ctx, 'rgba(246,232,200,0.5)', (c) => rr(c, w * 0.43, h * 0.1, w * 0.14, h * 0.8, w * 0.03));
    // The target. Ring first, then four short ticks at the compass points —
    // the ticks are what stop the ring reading as a printed logo.
    stroke(ctx, '#f890b8', Math.max(0.55, w * 0.075), (c) => {
      c.arc(w * 0.5, h * 0.56, w * 0.2, 0, Math.PI * 2);
    });
    stroke(ctx, '#e04898', Math.max(0.4, w * 0.05), (c) => {
      c.moveTo(w * 0.5, h * 0.24); c.lineTo(w * 0.5, h * 0.33);
      c.moveTo(w * 0.5, h * 0.79); c.lineTo(w * 0.5, h * 0.88);
      c.moveTo(w * 0.14, h * 0.56); c.lineTo(w * 0.24, h * 0.56);
      c.moveTo(w * 0.76, h * 0.56); c.lineTo(w * 0.86, h * 0.56);
    });
  },
  qcrate(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const outlinedShape = (fill, pathFn, strokeStyle = 'rgba(58,38,8,0.22)',
      lineWidth = cappedLine(u, 0.12, 0.009, 0.18)) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // Flat partner to the ordinary crate: rounded gold frame and inset face.
    // Its hairline perimeter keeps the block crisp without turning it into a
    // dark badge after the high-resolution art is reduced into the world.
    outlinedShape('#b88a18', (c) => rr(c, w * 0.04, h * 0.05, w * 0.92, h * 0.9, w * 0.18),
      'rgba(58,38,8,0.18)', cappedLine(u, 0.08, 0.006, 0.12));
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.14));
    plain(ctx, '#ffe56a', (c) => rr(c, w * 0.13, h * 0.14, w * 0.74, h * 0.1, h * 0.045));

    // One brief, dim glint every three seconds. Most of the loop is deliberately
    // quiet, so the block catches the light rather than constantly shimmering.
    const cycleFrame = frame % 36;
    if (cycleFrame >= 3 && cycleFrame <= 7) {
      const glintT = (cycleFrame - 3) / 4;
      const glintX = w * (-0.12 + glintT * 1.16);
      ctx.save();
      ctx.beginPath();
      rr(ctx, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.14);
      ctx.clip();
      plain(ctx, 'rgba(255,255,235,0.18)', (c) => {
        c.moveTo(glintX - w * 0.075, h * 0.84);
        c.lineTo(glintX + w * 0.025, h * 0.16);
        c.lineTo(glintX + w * 0.09, h * 0.16);
        c.lineTo(glintX - w * 0.01, h * 0.84);
        c.closePath();
      });
      stroke(ctx, 'rgba(255,255,248,0.5)', Math.max(0.1, w * 0.008), (c) => {
        c.moveTo(glintX - w * 0.005, h * 0.74);
        c.lineTo(glintX + w * 0.065, h * 0.27);
      });
      ctx.restore();
    }

    // Hand-drawn punctuation: broad curved crown, aggressively tapered stem,
    // and an oversized oval dot. Only the upper stroke moves: its lower tip is
    // the pendulum pivot, while the dot remains completely fixed beneath it.
    const phase = cycleFrame * Math.PI / 18;
    const tilt = Math.sin(phase) * 0.085;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.69);
    ctx.rotate(tilt);
    ctx.translate(0, -h * 0.17);
    outlinedShape('#82531f', (c) => {
      c.moveTo(-w * 0.11, -h * 0.25);
      c.quadraticCurveTo(-w * 0.105, -h * 0.3, -w * 0.055, -h * 0.31);
      c.lineTo(w * 0.115, -h * 0.34);
      c.quadraticCurveTo(w * 0.15, -h * 0.345, w * 0.13, -h * 0.29);
      c.lineTo(w * 0.025, h * 0.14);
      c.quadraticCurveTo(w * 0.02, h * 0.17, 0, h * 0.17);
      c.lineTo(-w * 0.025, h * 0.165);
      c.quadraticCurveTo(-w * 0.05, h * 0.16, -w * 0.075, h * 0.12);
      c.closePath();
    });
    plain(ctx, 'rgba(255,229,130,0.18)', (c) => {
      c.moveTo(-w * 0.075, -h * 0.245);
      c.quadraticCurveTo(-w * 0.065, -h * 0.27, -w * 0.035, -h * 0.275);
      c.lineTo(w * 0.055, -h * 0.29);
      c.lineTo(-w * 0.035, h * 0.11);
      c.lineTo(-w * 0.065, h * 0.105);
      c.closePath();
    });
    ctx.restore();
    outlinedShape('#82531f', (c) => c.ellipse(w * 0.5, h * 0.81, w * 0.078, h * 0.065, -0.32, 0, Math.PI * 2));
  },
  // The surface pipe is sealed: only a real tunnel mouth gets to imply a way
  // down. These fixed guide rails keep the full hazard silhouette visible while
  // the cap settles inside them, so its art never lies about the collision box.
  pipe(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const phase = hzPhase(frame, 8);
    const lift = Math.sin(phase) * h * 0.11;
    const pressure = 0.5 + 0.5 * Math.cos(phase);
    const capY = h * 0.18 - lift;
    const collarY = h * 0.76;
    const ramY = capY + h * 0.13;

    fineShape(ctx, '#174e58', u, (c) => rr(c, w * 0.1, h * 0.08, w * 0.21, h * 0.7, w * 0.07));
    fineShape(ctx, '#174e58', u, (c) => rr(c, w * 0.69, h * 0.08, w * 0.21, h * 0.7, w * 0.07));
    fineShape(ctx, '#258b7f', u, (c) => rr(c, w * 0.27, ramY, w * 0.46, collarY - ramY + h * 0.06, w * 0.06));
    fineShape(ctx, '#40cbb7', u, (c) => rr(c, w * 0.06, capY, w * 0.88, h * 0.19, w * 0.06));
    fineShape(ctx, '#70ecda', u, (c) => rr(c, w * 0.14, capY + h * 0.035, w * 0.72, h * 0.065, w * 0.03));
    stroke(ctx, 'rgba(255,255,255,0.42)', Math.max(0.35, w * 0.045), (c) => {
      c.moveTo(w * 0.22, capY + h * 0.07);
      c.lineTo(w * 0.78, capY + h * 0.07);
    });

    fineShape(ctx, '#155963', u, (c) => rr(c, w * 0.04, collarY, w * 0.92, h * 0.2, w * 0.05));
    fineShape(ctx, '#a83945', u, (c) => rr(c, w * 0.12, collarY + h * 0.045, w * 0.76, h * 0.07, w * 0.02));
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + i * 0.22);
      plain(ctx, '#f6d33c', (c) => {
        c.moveTo(x - w * 0.035, collarY + h * 0.11);
        c.lineTo(x + w * 0.025, collarY + h * 0.045);
        c.lineTo(x + w * 0.075, collarY + h * 0.045);
        c.lineTo(x + w * 0.015, collarY + h * 0.11);
        c.closePath();
      });
    }
    for (const x of [w * 0.18, w * 0.82]) fineShape(ctx, '#d9f2ea', u,
      (c) => c.arc(x, collarY + h * 0.145, w * 0.042, 0, Math.PI * 2));
    fineShape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.16, h * (0.42 - pressure * 0.07), w * 0.09, h * 0.075, w * 0.025));
  },
  switch(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b8e0f8', u, (c) => rr(c, w * 0.1, h * 0.32, w * 0.8, h * 0.6, w * 0.16)); // frozen housing
    stroke(ctx, '#e04848', Math.max(0.6, w * 0.14), (c) => { c.moveTo(w * 0.5, h * 0.6); c.lineTo(w * 0.76, h * 0.16); });
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.76, h * 0.16, w * 0.14, 0, Math.PI * 2));
  },
  // THE BEAT BAR, and it is a STACK OF CHEVRONS because the answer to it is a
  // jump.
  //
  // It used to be a pink lozenge — a shape that says "an obstacle is here" and
  // nothing about what to do with it. Every other hazard in the game can afford
  // that, because the instinct it wants is the one the player already has. This
  // one is the beat cabinet's signature prop and it stands in a lane that now
  // also cuts holes, so the two things a rhythm stage asks for are both "jump"
  // and only one of them looks like it.
  //
  // Chevrons rather than one arrow. A single arrowhead on a shaft is the
  // obvious drawing and at 8 world px wide it is a knob on a stick; three
  // strokes with nothing between them have no shaft to be mistaken for
  // anything, and repetition is what turns a direction into an instruction —
  // the same reason a fire exit paints three and not one.
  //
  // IT LAUNCHES ON THE BEAT. `beatSync` pumps the box height with the song (see
  // RunState.update) and the prop is bottom-anchored at the road, so the top of
  // the box is what moves. The chevrons are spread across whatever height the
  // box currently has, which means the whole stack rises AND opens out on the
  // beat — three marks travelling up, rather than one shape breathing.
  //
  // The top one is lit. An even stack reads as a texture; one bright mark at
  // the head of it gives the eye somewhere to travel to, and the direction of
  // travel is the whole message.
  beatBar(ctx, w, h) {
    const n = 3;
    // Thickness measured VERTICALLY, and the chevron is the band between two
    // parallel Vs offset by it. Drawn as one filled polygon rather than as a
    // thick stroke under a thinner one: two round-capped strokes of different
    // widths do not make an even border, they make a halo that bulges at the
    // point and thins along the arms, which is what the first pass of this
    // looked like. A filled band takes the shared contour (shape/ol) the same
    // way every other prop in this file does, at the same weight.
    const rise = w * 0.46;
    const band = Math.max(1.2, w * 0.26);
    // The stack spans the box EXACTLY: the top chevron's point is at y 0 and the
    // bottom one's trailing edge is at y h. So `beatSync` growing the box
    // spreads the three apart and lifts the point, and the lowest mark never
    // creeps below the road it is standing on.
    const step = (h - (rise + band)) / (n - 1);
    const x0 = w * 0.06, x1 = w / 2, x2 = w * 0.94;
    const chev = (i, fill) => {
      const tip = i * step;
      shape(ctx, fill, Math.max(w, h), (c) => {
        c.moveTo(x0, tip + rise);
        c.lineTo(x1, tip);
        c.lineTo(x2, tip + rise);
        c.lineTo(x2, tip + rise + band);
        c.lineTo(x1, tip + band);
        c.lineTo(x0, tip + rise + band);
        c.closePath();
      });
    };
    // Bottom up, so each mark's contour is overlaid by the one above it rather
    // than printed across it — the stack reads as three things in front of each
    // other instead of three outlines crossing.
    for (let i = n - 1; i >= 0; i--) chev(i, i === 0 ? '#f890c8' : '#e04898');
  },
  barrel(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(42,24,10,0.32)';
      ctx.lineWidth = Math.max(0.32, u * 0.024);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // A flat, front-on barrel: BELLIED silhouette, stave rhythm and hoops.
    // No top plane or receding side—the toaster owns the 3D exception.
    //
    // The body was a rounded rectangle and read as one: a barrel is not a box
    // with soft corners, it is widest across its belly and pulled in at both
    // ends, and that taper is the shape's whole job. Same overall width as the
    // rounded rect had — the belly still reaches 0.9w — so the hoops, staves
    // and highlight all sit where they always did, and nothing that measures
    // this prop moved. The LCD panel's tower barrel is the same silhouette at
    // sixteen pixels (stylePacks, LCD_BARREL_SHAPE 'ingame'); they are one
    // object in the world and may not be two drawings.
    fineShape('#b87838', (c) => {
      const y0 = h * 0.04, y1 = h * 0.96;
      const end = w * 0.16, mid = w * 0.04;
      c.moveTo(end, y0);
      c.lineTo(w - end, y0);
      c.quadraticCurveTo(w - mid, h * 0.5, w - end, y1);
      c.lineTo(end, y1);
      c.quadraticCurveTo(mid, h * 0.5, end, y0);
      c.closePath();
    });
    plain(ctx, 'rgba(216,160,88,0.42)', (c) => rr(c, w * 0.18, h * 0.1, w * 0.13, h * 0.8, w * 0.065));
    plain(ctx, 'rgba(112,60,26,0.22)', (c) => rr(c, w * 0.69, h * 0.1, w * 0.13, h * 0.8, w * 0.065));
    stroke(ctx, '#5e4e46', Math.max(0.65, h * 0.065), (c) => {
      c.moveTo(w * 0.13, h * 0.25); c.lineTo(w * 0.87, h * 0.25);
      c.moveTo(w * 0.13, h * 0.72); c.lineTo(w * 0.87, h * 0.72);
    });
    stroke(ctx, 'rgba(106,58,24,0.62)', Math.max(0.28, w * 0.025), (c) => {
      c.moveTo(w * 0.36, h * 0.1); c.lineTo(w * 0.36, h * 0.9);
      c.moveTo(w * 0.52, h * 0.08); c.lineTo(w * 0.52, h * 0.92);
      c.moveTo(w * 0.68, h * 0.1); c.lineTo(w * 0.68, h * 0.9);
    });
    stroke(ctx, 'rgba(255,220,160,0.5)', Math.max(0.3, w * 0.025), (c) => {
      c.moveTo(w * 0.2, h * 0.34); c.lineTo(w * 0.2, h * 0.62);
    });
  },
  // THE JUMP SIGN. Not scenery and not a hazard: a hint the run puts in the
  // lane after the player has gone into the same kind of hole twice, and the
  // only prop in the game whose job is to be read as a WORD.
  //
  // The word is drawn as strokes rather than set in the pixel font. The font is
  // a 5px grid and "JUMP" in it is 24px wide at scale 1 — wider than the whole
  // sign — and scaling a pixel grid down blurs it into four grey smudges.
  // Four hand-cut glyphs on a 19px board give roughly 3.5 world px a letter,
  // which is 7 screen px at the run's zoom: short, expected, all-caps, and
  // therefore readable at a size no font would survive.
  //
  // It leans. A sign hammered in straight reads as signage the level shipped
  // with; a couple of degrees off vertical reads as something somebody stuck
  // there in a hurry, which is what this is.
  // BEWARE OF DOG, planted a screen before the finish on the stages that have
  // a dog (see RunState.spawnFinishDog). Same board, post and tilt as jumpSign
  // — they are the same object in the world's vocabulary and should not be two
  // different objects on the eye — and the same contract in play: `sign`, so
  // running through it breaks it for nothing.
  //
  // A PICTOGRAM, not words. jumpSign spends its whole board on four hand-cut
  // letters because the pixel font dies at this size, and JUMP is four
  // characters; BEWARE OF DOG is eleven, which is three times the word on the
  // same 13x9 board. There is no version of that which is readable. A dog's
  // head in silhouette is what an actual warning sign uses for the same
  // reason, it survives being 7 screen pixels tall, and it says the one thing
  // the player needs to know without depending on their reading English.
  //
  // RED board, not the jump sign's yellow. Yellow is this game's "here is a
  // thing you do"; the guide teaches RED = AVOID, and every other red mark in
  // the lane is a hazard. The dog is the only hazard the level announces
  // ahead of time, so the announcement should be wearing the hazard colour.
  dogSign(ctx, w, h) {
    const u = Math.max(w, h);
    // Everything inside 0..h — see the note on jumpSign: a painter has no
    // canvas outside its own box, and that sign lost its ascenders to exactly
    // this before it was caught.
    const tilt = -0.035;
    const postX = w * 0.455, postW = w * 0.085;
    // A SQUARER board than its two siblings. Theirs are long and low because
    // they carry a word; this one carries a head, and a head in a letterbox is
    // a head drawn small with cream either side of it. Narrower and taller
    // gives the pictogram a cell it can nearly fill, which is the whole
    // difference between a dog and a dark smudge at world size.
    const bw = w * 0.62, bh = h * 0.5;
    const bx = postX + postW / 2 - bw / 2, by = h * 0.03;
    const cy = by + bh / 2;
    shape(ctx, '#7a5230', u, (c) => rr(c, postX, by + bh * 0.6, postW, h - by - bh * 0.6, postW * 0.3));
    plain(ctx, 'rgba(40,24,12,0.35)', (c) => rr(c, postX + postW * 0.58, by + bh * 0.7, postW * 0.42, h - by - bh * 0.72, postW * 0.2));
    ctx.save();
    ctx.translate(postX + postW / 2, cy);
    ctx.rotate(tilt);
    const lx = bx - (postX + postW / 2), ly = by - cy;
    shape(ctx, '#d83828', u, (c) => rr(c, lx, ly, bw, bh, bh * 0.16));
    // The pale panel the head sits on. A dark silhouette needs something light
    // behind it or it merges with the board's own contour at world size.
    const px = lx + bw * 0.11, py = ly + bh * 0.12;
    const pw = bw * 0.78, ph = bh * 0.7;
    plain(ctx, '#f6e4c8', (c) => rr(c, px, py, pw, ph, bh * 0.08));
    plain(ctx, 'rgba(40,10,6,0.3)', (c) => rr(c, lx + bw * 0.05, ly + bh * 0.86, bw * 0.9, bh * 0.1, bh * 0.04));

    // The head, facing LEFT — the way the dog actually arrives, so the sign
    // and the animal agree. Authored in unit coordinates across the panel so
    // the drawing is a SHAPE rather than a pile of magic numbers, and so it
    // fills whatever cell the board gives it.
    //
    // One closed path, not a head plus a muzzle plus ears: at this size any
    // gap between two parts closes into a blot, and a single silhouette stays
    // legible all the way down. Everything in the outline is doing
    // identification work — two pricked ears, a long snout and an open jaw are
    // the whole difference between "dog", "bear" and "unreadable" — and the
    // marks punched back OUT of it (eye, fangs, nostril) are what stop it
    // being a black blob once there is room for them. They only survive
    // because this sign rasterizes at triple detail; at double they filled in.
    const X = (t) => px + ((t + 1) / 2) * pw;
    const Y = (t) => py + ((t + 1) / 2) * ph;
    plain(ctx, '#241a14', (c) => {
      c.moveTo(X(-0.98), Y(0.02));            // nose
      c.lineTo(X(-0.88), Y(-0.26));           // bridge of the snout
      c.quadraticCurveTo(X(-0.54), Y(-0.44), X(-0.24), Y(-0.46)); // brow
      // The ears: two clean triangles with one notch dropped between them.
      // An earlier pass sculpted them with extra points at the base and the
      // rake, which at this size stopped reading as ears at all and became a
      // row of spikes — a small silhouette wants fewer corners, not more.
      c.lineTo(X(-0.18), Y(-0.54));
      c.lineTo(X(-0.05), Y(-1));              // front ear, tip
      c.lineTo(X(0.14), Y(-0.56));
      c.lineTo(X(0.24), Y(-0.44));            // the notch between them
      c.lineTo(X(0.31), Y(-0.60));
      c.lineTo(X(0.46), Y(-0.92));            // back ear, tip
      c.lineTo(X(0.68), Y(-0.42));
      c.lineTo(X(0.76), Y(-0.26));            // back of the skull
      c.quadraticCurveTo(X(0.94), Y(0.12), X(0.86), Y(0.64)); // nape into the chest
      c.lineTo(X(0.3), Y(0.88));
      c.quadraticCurveTo(X(-0.12), Y(0.82), X(-0.36), Y(0.52)); // throat to the chin
      // The open jaw: a wedge bitten out of the muzzle. A closed mouth reads
      // as a pet, and this sign is not about a pet.
      c.lineTo(X(-0.99), Y(0.74));
      c.lineTo(X(-0.74), Y(0.30));
      c.lineTo(X(-0.99), Y(0.24));
      c.closePath();
    });
    // Everything below is punched back out in the panel's own cream, so the
    // marks are holes in the silhouette rather than a second colour on top of
    // it — a paler ink would grey the whole head down at world size.
    const cut = '#f6e4c8';
    // The eye: one notch, angled. It turns a black shape into a face and it is
    // the cheapest mark on the board.
    plain(ctx, cut, (c) => {
      c.ellipse(X(-0.34), Y(-0.18), pw * 0.052, ph * 0.048, -0.3, 0, Math.PI * 2);
    });
    // Two fangs in the gape — upper and lower, offset so they read as a bite
    // rather than as a gap in the paint.
    plain(ctx, cut, (c) => {
      c.moveTo(X(-0.90), Y(0.34)); c.lineTo(X(-0.78), Y(0.33)); c.lineTo(X(-0.845), Y(0.50)); c.closePath();
      c.moveTo(X(-0.95), Y(0.66)); c.lineTo(X(-0.85), Y(0.65)); c.lineTo(X(-0.90), Y(0.50)); c.closePath();
    });
    // The nostril, and the crease where the muzzle wrinkles back off the
    // teeth. Two marks, and between them they are the snarl.
    plain(ctx, cut, (c) => {
      c.ellipse(X(-0.90), Y(-0.06), pw * 0.026, ph * 0.026, 0, 0, Math.PI * 2);
    });
    stroke(ctx, cut, Math.max(0.18, pw * 0.022), (c) => {
      c.moveTo(X(-0.72), Y(-0.16));
      c.quadraticCurveTo(X(-0.62), Y(-0.05), X(-0.50), Y(-0.02));
    });
    ctx.restore();
  },

  jumpSign(ctx, w, h) {
    const u = Math.max(w, h);
    // EVERYTHING INSIDE 0..h. The first pass hung the board off a translate at
    // h*0.3 and drew it upward from there, which put its top edge — and the tops
    // of the letters with it — at negative y, outside the box the painter is
    // rasterized into. The raster clipped them flat, so the word arrived in the
    // lane with its ascenders sliced off. A prop painter has no canvas outside
    // its own box; the box is the whole world.
    const tilt = -0.035;
    const postX = w * 0.455, postW = w * 0.085;
    const bx = w * 0.05, by = h * 0.04, bw = w * 0.9, bh = h * 0.4;
    const cy = by + bh / 2;
    shape(ctx, '#7a5230', u, (c) => rr(c, postX, by + bh * 0.5, postW, h - by - bh * 0.5, postW * 0.3));
    plain(ctx, 'rgba(40,24,12,0.35)', (c) => rr(c, postX + postW * 0.58, by + bh * 0.6, postW * 0.42, h - by - bh * 0.62, postW * 0.2));
    ctx.save();
    ctx.translate(postX + postW / 2, cy);
    ctx.rotate(tilt);
    const lx = bx - (postX + postW / 2), ly = by - cy;
    shape(ctx, '#f2c53c', u, (c) => rr(c, lx, ly, bw, bh, bh * 0.2));
    plain(ctx, '#c99a1e', (c) => rr(c, lx + bw * 0.04, ly + bh * 0.8, bw * 0.92, bh * 0.12, bh * 0.05));
    // J U M P, as strokes. The pixel font is a 5px grid and "JUMP" in it is
    // 24px wide at scale 1 — wider than the whole sign — and scaling a grid
    // down blurs it into four grey smudges. Four hand-cut glyphs on an 18px
    // board give about 3.5 world px a letter, which is 7 screen px at the run's
    // zoom: short, expected, all-caps, and readable at a size no font survives.
    //
    // FINE strokes. At bh*0.15 the letters were fat enough to close their own
    // counters — the U filled in, the P's bowl became a blob — and a word that
    // has lost its holes is a row of marks.
    const lw = Math.max(0.4, bh * 0.11);
    const top = ly + bh * 0.24, bot = ly + bh * 0.68;
    // Per-glyph widths rather than one cell size for all five. The M needs more
    // room than the P and the bang needs almost none — given equal cells the M
    // closes up and the bang floats in the middle of a hole the width of a
    // letter, which reads as a full stop that has come loose.
    const WIDTHS = [1, 1, 1.15, 1, 0.42];
    const gap = bw * 0.045;
    const unit = (bw * 0.86 - gap * (WIDTHS.length - 1))
      / WIDTHS.reduce((acc, k) => acc + k, 0);
    let gx = lx + bw * 0.5
      - (unit * WIDTHS.reduce((acc, k) => acc + k, 0) + gap * (WIDTHS.length - 1)) / 2;
    let gi = 0;
    const letter = (fn) => {
      const cw = unit * WIDTHS[gi];
      stroke(ctx, '#2a1e0e', lw, (c) => fn(c, gx, cw));
      gx += cw + gap;
      gi++;
    };
    // J — stem down the right, hooking left at the foot.
    letter((c, x, cw) => {
      c.moveTo(x + cw * 0.72, top);
      c.lineTo(x + cw * 0.72, bot - cw * 0.26);
      c.quadraticCurveTo(x + cw * 0.72, bot, x + cw * 0.2, bot - cw * 0.06);
    });
    // U — down, across, up.
    letter((c, x, cw) => {
      c.moveTo(x + cw * 0.16, top);
      c.lineTo(x + cw * 0.16, bot - cw * 0.22);
      c.quadraticCurveTo(x + cw * 0.5, bot + cw * 0.1, x + cw * 0.84, bot - cw * 0.22);
      c.lineTo(x + cw * 0.84, top);
    });
    // M — two stems and a shallow V. A deep V closes up at this size.
    letter((c, x, cw) => {
      c.moveTo(x + cw * 0.12, bot);
      c.lineTo(x + cw * 0.12, top);
      c.lineTo(x + cw * 0.5, top + (bot - top) * 0.5);
      c.lineTo(x + cw * 0.88, top);
      c.lineTo(x + cw * 0.88, bot);
    });
    // P — stem and a bowl on the top half only.
    letter((c, x, cw) => {
      c.moveTo(x + cw * 0.16, bot);
      c.lineTo(x + cw * 0.16, top);
      c.lineTo(x + cw * 0.56, top);
      c.quadraticCurveTo(x + cw * 0.92, top + (bot - top) * 0.25, x + cw * 0.56, top + (bot - top) * 0.5);
      c.lineTo(x + cw * 0.16, top + (bot - top) * 0.5);
    });
    // ! — the stem strokes with the letters; the dot is its own filled disc.
    // Drawn as a stub of the same stroke it came out a horizontal dash: a
    // segment shorter than its own line width is all end-cap, and two round
    // caps meeting draw a lozenge lying the wrong way. A circle is one path and
    // it is the shape actually wanted.
    const bangX = gx + unit * WIDTHS[gi] * 0.5;
    letter((c, x, cw) => {
      c.moveTo(x + cw * 0.5, top);
      c.lineTo(x + cw * 0.5, top + (bot - top) * 0.62);
    });
    plain(ctx, '#2a1e0e', (c) => c.arc(bangX, bot - lw * 0.2, lw * 0.62, 0, Math.PI * 2));
    ctx.restore();
  },
  // The jump sign's sibling for a hole you are meant to go INTO: same post,
  // same hurriedly-leaning board, but a single filled arrow pointing at the
  // floor instead of a word. One glyph rather than four because it stands in
  // the crypt, where the light radius gives you less time to read anything —
  // an arrow survives a squint that letters do not.
  downSign(ctx, w, h) {
    const u = Math.max(w, h);
    const tilt = -0.035;
    const postX = w * 0.455, postW = w * 0.085;
    const bx = w * 0.05, by = h * 0.04, bw = w * 0.9, bh = h * 0.4;
    const cy = by + bh / 2;
    shape(ctx, '#7a5230', u, (c) => rr(c, postX, by + bh * 0.5, postW, h - by - bh * 0.5, postW * 0.3));
    plain(ctx, 'rgba(40,24,12,0.35)', (c) => rr(c, postX + postW * 0.58, by + bh * 0.6, postW * 0.42, h - by - bh * 0.62, postW * 0.2));
    ctx.save();
    ctx.translate(postX + postW / 2, cy);
    ctx.rotate(tilt);
    const lx = bx - (postX + postW / 2), ly = by - cy;
    shape(ctx, '#f2c53c', u, (c) => rr(c, lx, ly, bw, bh, bh * 0.2));
    plain(ctx, '#c99a1e', (c) => rr(c, lx + bw * 0.04, ly + bh * 0.8, bw * 0.92, bh * 0.12, bh * 0.05));
    // The arrow, filled: stem then head, drawn as one polygon so the ink never
    // thins at the joint. Head takes over half the drop — at board size a
    // slender arrow is a tadpole, and it is the head that says DOWN.
    const ax = lx + bw * 0.5;
    const top = ly + bh * 0.16, bot = ly + bh * 0.84;
    const stemW = bw * 0.09, headW = bw * 0.22, headTop = top + (bot - top) * 0.42;
    plain(ctx, '#2a1e0e', (c) => {
      c.moveTo(ax - stemW, top);
      c.lineTo(ax + stemW, top);
      c.lineTo(ax + stemW, headTop);
      c.lineTo(ax + headW, headTop);
      c.lineTo(ax, bot);
      c.lineTo(ax - headW, headTop);
      c.lineTo(ax - stemW, headTop);
      c.closePath();
    });
    ctx.restore();
  },
  tombstone(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#9a9ab0', u, (c) => {
      c.moveTo(w * 0.12, h);
      c.lineTo(w * 0.12, h * 0.36);
      c.arc(w * 0.5, h * 0.36, w * 0.38, Math.PI, 0);
      c.lineTo(w * 0.88, h);
      c.closePath();
    });
    stroke(ctx, '#6a6a80', Math.max(0.5, w * 0.07), (c) => {
      c.moveTo(w * 0.5, h * 0.28); c.lineTo(w * 0.5, h * 0.66);
      c.moveTo(w * 0.32, h * 0.44); c.lineTo(w * 0.68, h * 0.44);
    });
  },
  cardboardMonster(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#c8a068', u, (c) => rr(c, w * 0.06, h * 0.12, w * 0.88, h * 0.86, w * 0.14));
    // googly eyes + jagged tape mouth
    plain(ctx, '#fff', (c) => { c.ellipse(w * 0.34, h * 0.4, w * 0.13, h * 0.16, 0, 0, Math.PI * 2); c.ellipse(w * 0.66, h * 0.4, w * 0.13, h * 0.16, 0, 0, Math.PI * 2); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.36, h * 0.43, w * 0.06, 0, Math.PI * 2); c.arc(w * 0.68, h * 0.43, w * 0.06, 0, Math.PI * 2); });
    stroke(ctx, '#8a6a3a', Math.max(0.5, w * 0.06), (c) => {
      c.moveTo(w * 0.28, h * 0.72); c.lineTo(w * 0.42, h * 0.62);
      c.lineTo(w * 0.56, h * 0.74); c.lineTo(w * 0.72, h * 0.64);
    });
  },
  chair(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#3a4a5a', u, (c) => rr(c, w * 0.1, h * 0.04, w * 0.28, h * 0.66, w * 0.08)); // back
    fineShape(ctx, '#4a5a6c', u, (c) => rr(c, w * 0.08, h * 0.52, w * 0.84, h * 0.22, w * 0.08)); // seat
    stroke(ctx, '#2a3542', Math.max(0.6, w * 0.07), (c) => { c.moveTo(w * 0.5, h * 0.72); c.lineTo(w * 0.5, h * 0.86); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.28, h * 0.92, w * 0.1, 0, Math.PI * 2); c.arc(w * 0.72, h * 0.92, w * 0.1, 0, Math.PI * 2); });
  },
  printer(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b0b0c0', u, (c) => rr(c, w * 0.04, h * 0.3, w * 0.92, h * 0.66, w * 0.12));
    plain(ctx, '#fff', (c) => rr(c, w * 0.24, h * 0.02, w * 0.52, h * 0.34, w * 0.04)); // paper
    plain(ctx, '#e04848', (c) => rr(c, w * 0.14, h * 0.52, w * 0.24, h * 0.14, h * 0.06));
    plain(ctx, '#48e0c8', (c) => c.arc(w * 0.74, h * 0.6, w * 0.08, 0, Math.PI * 2));
  },
  // A bright orange traffic cone with two white reflective bands. Small
  // footprint (10×13) so it reads easily in clusters; the Speed Zone cabinet's
  // orange ground means the white bands do the heavy lifting for visibility.
  trafficCone(ctx, w, h) {
    const u = Math.max(w, h);
    // Square base — rounded rect sitting on the ground line
    fineShape(ctx, '#e86020', u, (c) => rr(c, w * 0.14, h * 0.78, w * 0.72, h * 0.18, w * 0.06));
    // Tapered cone body with a BLUNT top. A real cone is moulded, not
    // sharpened — and a true point is the first thing to vanish at gameplay
    // size anyway, so the apex was spending its only pixel on a spike. The
    // straight sides run to y=0.19 and a short quadratic caps them, which puts
    // the crown at about 0.13h and leaves a dome roughly a twelfth of the box
    // across.
    const conePath = (c) => {
      c.moveTo(w * 0.22, h * 0.82);
      c.lineTo(w * 0.458, h * 0.19);
      c.quadraticCurveTo(w * 0.5, h * 0.075, w * 0.542, h * 0.19);
      c.lineTo(w * 0.78, h * 0.82);
      c.closePath();
    };
    ctx.beginPath();
    conePath(ctx);
    ctx.fillStyle = '#e86020';
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,16,40,0.22)';
    ctx.lineWidth = Math.max(0.2, u * 0.012);
    ctx.lineJoin = 'round';
    ctx.stroke();
    // White reflective bands — clipped to the cone so they never poke out
    ctx.save();
    ctx.beginPath();
    conePath(ctx);
    ctx.clip();
    const bandH = h * 0.05;
    // Bands sit lower on the body: high up they crowded the tip and left
    // the widest, most visible part of the cone plain orange.
    for (const by of [h * 0.60, h * 0.44]) {
      const half = w * 0.18 + (w * 0.60) * ((h * 0.82 - by) / (h * 0.74));
      plain(ctx, '#f8f8ff', (c) => {
        c.moveTo(w * 0.5 - half, by - bandH);
        c.lineTo(w * 0.5 + half, by - bandH);
        c.lineTo(w * 0.5 + half * 0.96, by + bandH);
        c.lineTo(w * 0.5 - half * 0.96, by + bandH);
        c.closePath();
      });
    }
    ctx.restore();
    // Subtle highlight stripe down the left side
    plain(ctx, 'rgba(255,255,255,0.13)', (c) => {
      c.moveTo(w * 0.26, h * 0.78);
      c.lineTo(w * 0.48, h * 0.12);
      c.lineTo(w * 0.45, h * 0.12);
      c.lineTo(w * 0.24, h * 0.78);
      c.closePath();
    });
  },
  // THE BANANA PEEL, drawn from the flat-vector reference Peter brought in.
  //
  // It is a peel LYING on the road with one skin risen out of the pile carrying
  // the stalk — not the Mario Kart item standing on its base, which is what the
  // first three passes drew. That earlier shape read (it has a real silhouette)
  // and it was never right, and the bake-off in src/dev/banana-candidates.js is
  // where seven of them were put side by side to find out why. Three things
  // separate this one from all of those, and each is deliberate:
  //
  //   NO CONTOUR — or as near as this game can afford. Every other prop here is
  //     outlined; this one separates its parts by TONE, four warm values from
  //     cream to deep orange, and the absence of the dark hairline is most of
  //     why it reads clean rather than busy. What survives is a whisper of warm
  //     contour, kept for one specific reason: Speed Zone's road is #c88848 and
  //     Frost's is near-white, and an unoutlined warm prop disappears into the
  //     first and floats on the second. At 0.014 it is a separation, not a
  //     border — an eighth the weight the cactus carries.
  //   WARM, NOT LEMON. Golds and oranges instead of the #f2e42c the earlier
  //     passes used. It separates from turf better and it stops the prop reading
  //     as the same yellow as a coin, which at lane size was a real confusion.
  //   ONE TALL ARC. Not a fan of equal skins around a stub. A single sweeping
  //     skin rises out of the pile and carries the stalk at its top, everything
  //     else lies down around it. That is what buys a silhouette while keeping
  //     the prop low — a peak without a tower.
  //
  // The stalk is a chunky dark block rather than a taper, and it is doing more
  // work than its size suggests: it is the only non-warm mark in the drawing and
  // it sits at the top of the silhouette, which is where the eye lands.
  bananaPeel(ctx, w, h) {
    const gy = h * 0.97;
    // THE CONTOUR, and it is a real decision rather than a default.
    //
    // The reference has no outline at all, and drawn that way the peel loses its
    // lower edge into Speed Zone's road — #c88848 is close enough to the peel's
    // own yellow that the skins resting on the ground simply merge with it. The
    // first attempt at a fix went the other way and was so faint that the
    // OVERLAPS stopped reading: four skins on top of each other became one
    // silhouette with a stalk. The house dark (rgba(26,16,40,.34), what the
    // cactus and crate wear) works but goes grey against this much yellow, and
    // anything heavier turns the prop into a sticker with a brown border.
    //
    // Warm, mid-weight, is the one that does both jobs: it separates the peel
    // from every ground in the game AND separates the skins from each other,
    // while still reading as flat vector art rather than as an outlined sprite.
    const INK = 'rgba(122,80,10,0.55)';
    const P = {
      lit: '#ffe14a',    // the arc's lit face
      main: '#fcd420',   // the two skins reaching left — the colour of the thing
      deep: '#f0c008',   // the lobe lying behind and right
      tip: '#7a5a1e',    // stalk, and the point on each outer end
    };

    // A SKIN: a centreline offset along its own normal, which is the only way
    // that reliably gives a long strip a point on the end. Hand-placed edge
    // curves were tried against both references and every one came out a
    // rounded lump — two curves do not hold their relationship as a path bends,
    // and this drawing is nothing BUT long thin strips with points on them.
    //
    // `floor` holds the strip open at both ends instead of closing to a point.
    // The two reaching skins want the point; the arc, which has the stalk
    // balanced on its top, wants a band.
    const skin = (rx, ry, kx, ky, tx, ty, halfMax, rootF = 0.9, tipF = 0) => {
      const N = 16;
      const top = [], bot = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, mt = 1 - t;
        const x = mt * mt * rx + 2 * mt * t * kx + t * t * tx;
        const y = mt * mt * ry + 2 * mt * t * ky + t * t * ty;
        const dx = 2 * mt * (kx - rx) + 2 * t * (tx - kx);
        const dy = 2 * mt * (ky - ry) + 2 * t * (ty - ky);
        const len = Math.hypot(dx, dy) || 1;
        // Widest nearer the root than the middle: a peeled skin is broadest
        // where it is still attached and narrows the whole way out.
        //
        // The two floors are what hold the strip OPEN at each end, and `rootF`
        // in particular is not cosmetic. A plain sine closes both ends to a
        // point, and a peel built that way has no pile in the middle — every
        // strip meets its neighbours at a needle, so the arc's own blunt foot
        // had nothing covering it and stuck out below the drawing. A fat root
        // is what makes the centre a mass the arc can grow out of.
        const floor = rootF * (1 - t) + tipF * t;
        const half = halfMax * Math.max(floor, Math.sin(Math.PI * Math.pow(t, 0.62)));
        top.push([x - dy / len * half, y + dx / len * half]);
        bot.push([x + dy / len * half, y - dx / len * half]);
      }
      // The root end is ROUNDED rather than closed with a straight line across
      // the two edges. A flat cut there is a hard vertical edge in the middle of
      // the pile — it reads as a strip that has been guillotined, which is the
      // one thing none of the references has. The nose bulges out along the
      // reverse tangent by about its own half-width.
      const nx = rx - kx, ny = ry - ky;
      const nl = Math.hypot(nx, ny) || 1;
      const nose = halfMax * rootF * 0.9;
      const path = (c) => {
        c.moveTo(top[0][0], top[0][1]);
        for (const [x, y] of top) c.lineTo(x, y);
        for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
        c.quadraticCurveTo(rx + nx / nl * nose, ry + ny / nl * nose, top[0][0], top[0][1]);
        c.closePath();
      };
      // The browned point on the outer end, cut back along the strip so it is a
      // wedge continuing the taper rather than a bead stuck on the tip.
      const cap = (c) => {
        // An eighth of the strip, not a fifth. At N-3 the browned end ran a
        // fifth of the way back down the skin and read as a dagger blade; in
        // both references it is a short dark nick on the very point.
        const m = N - 2;
        c.moveTo(tx, ty);
        c.lineTo(top[m][0], top[m][1]);
        c.quadraticCurveTo((top[m][0] + bot[m][0]) / 2, (top[m][1] + bot[m][1]) / 2,
          bot[m][0], bot[m][1]);
        c.closePath();
      };
      return { path, cap };
    };

    // Contact smear, so the peel sits ON the road rather than above it.
    plain(ctx, 'rgba(8,6,12,0.15)', (c) => {
      c.ellipse(w * 0.48, gy - h * 0.005, w * 0.42, h * 0.03, 0, 0, Math.PI * 2);
    });

    // THE FOUR PARTS, back to front. `k` below is height above the road as a
    // fraction of the box, and the parts that sit HIGH are the ones lying
    // further away — the reference is drawn at a shallow plan angle, and that
    // is the only depth cue in it. Nothing here is floating.
    const K = (k) => gy - h * k;
    // ORDER MATTERS, and it is the fix for the arc's foot. A strip built from a
    // centreline has a blunt end, and the arc's belongs INSIDE the pile — drawn
    // last it stood proud of everything and its flat foot read as a separate
    // slab dropped into the middle of the drawing. So the arc goes down third
    // and the lower reaching skin goes over it, exactly as in the reference,
    // where that skin passes in front of the arc's base.
    const parts = [
      // The lobe lying behind and to the right. Deeper yellow, which is what
      // pushes it back — and FLAT: fattened it becomes a teardrop sitting beside
      // the peel instead of a skin tucked behind it.
      { s: skin(w * 0.530, K(0.24), w * 0.780, K(0.36), w * 0.985, K(0.20), h * 0.092), col: P.deep, cap: true },
      // The upper skin reaching LEFT. The thinnest thing in the drawing — this
      // is the strip that, with the arc's inner edge, encloses the open lens of
      // background that the reference is really built around. Fatten it and the
      // gap closes and the whole peel becomes one solid mass.
      { s: skin(w * 0.570, K(0.54), w * 0.34, K(0.70), w * 0.020, K(0.47), h * 0.056, 0.7), col: P.main, cap: true },
      // THE ARC. Rises out of the pile and carries the stalk, LEANING right the
      // whole way rather than going up straight and kinking over at the top —
      // the control point sits right of the chord, which is what turns a hook
      // into the smooth cant the reference has.
      // Rooted DEEP and narrow at the foot: a fat root here pushes its rounded
      // nose out from under the skin that is meant to be covering it, and the
      // bulge reads as a notch in the middle of the pile.
      { s: skin(w * 0.500, K(0.215), w * 0.552, K(0.56), w * 0.655, K(0.865), w * 0.052, 0.72, 0.44), col: P.lit },
      // The lower skin reaching left, thicker and resting on the road. Last, so
      // it covers the arc's foot.
      { s: skin(w * 0.580, K(0.19), w * 0.36, K(0.24), w * 0.070, K(0.11), h * 0.098, 0.95), col: P.main, cap: true },
    ];
    for (const { s: sk, col, cap } of parts) {
      fineShape(ctx, col, Math.max(w, h), sk.path, INK, 0.020);
      if (cap) plain(ctx, P.tip, sk.cap);
    }

    // The stalk: a short dark NUB tilted off the top of the arc. In both
    // references it is barely a tenth of the height and it does its work by
    // being the only dark mark in an otherwise entirely yellow drawing — drawn
    // longer it stops being part of the peel and becomes a brown peg leaning
    // against it.
    // It continues the arc's own lean rather than setting off at its own angle,
    // which is what made it read as a peg propped against the peel.
    // Started BELOW the arc's point so the two overlap. Begun at the point
    // itself, the round cap left a hairline of background between stalk and
    // peel, and the nub read as a brown capsule hovering over the tip.
    stroke(ctx, P.tip, Math.max(0.45, w * 0.034), (c) => {
      c.moveTo(w * 0.646, K(0.815));
      c.lineTo(w * 0.674, K(0.930));
    });
  },
  zombieWalk(ctx, w, h) {
    const u = Math.max(w, h);
    // slouched green office zombie
    fineShape(ctx, '#5a6a8a', u, (c) => rr(c, w * 0.18, h * 0.42, w * 0.64, h * 0.42, w * 0.16));
    stroke(ctx, '#9ec89e', Math.max(0.7, w * 0.16), (c) => { c.moveTo(w * 0.2, h * 0.52); c.lineTo(w * 0.02, h * 0.44); });
    stroke(ctx, '#9ec89e', Math.max(0.7, w * 0.16), (c) => { c.moveTo(w * 0.3, h * 0.84); c.lineTo(w * 0.28, h); c.moveTo(w * 0.68, h * 0.84); c.lineTo(w * 0.7, h); });
    fineShape(ctx, '#9ec89e', u, (c) => c.arc(w * 0.5, h * 0.26, w * 0.3, 0, Math.PI * 2));
    plain(ctx, '#d83030', (c) => { c.arc(w * 0.4, h * 0.24, w * 0.06, 0, Math.PI * 2); c.arc(w * 0.62, h * 0.24, w * 0.06, 0, Math.PI * 2); });
    stroke(ctx, '#4a6a4a', Math.max(0.5, w * 0.06), (c) => { c.moveTo(w * 0.38, h * 0.4); c.lineTo(w * 0.64, h * 0.4); });
  },
  resident(ctx, w, h) {
    const u = Math.max(w, h);
    // A worried but very much ALIVE office resident: bright safety vest,
    // ordinary skin tone, glasses and a raised hand. This must never read as
    // the green, red-eyed zombie hazard standing beside it.
    shape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.18, h * 0.42, w * 0.64, h * 0.42, w * 0.14));
    plain(ctx, '#48a8b8', (c) => rr(c, w * 0.42, h * 0.44, w * 0.16, h * 0.38, w * 0.03)); // vest stripe
    stroke(ctx, '#f2c9a0', Math.max(0.7, w * 0.14), (c) => { c.moveTo(w * 0.78, h * 0.54); c.lineTo(w * 0.96, h * 0.25); }); // wave
    stroke(ctx, '#3a4a5a', Math.max(0.7, w * 0.14), (c) => { c.moveTo(w * 0.32, h * 0.84); c.lineTo(w * 0.3, h); c.moveTo(w * 0.68, h * 0.84); c.lineTo(w * 0.72, h); });
    shape(ctx, '#f2c9a0', u, (c) => c.arc(w * 0.5, h * 0.25, w * 0.3, 0, Math.PI * 2));
    stroke(ctx, '#3a4a5a', Math.max(0.45, w * 0.055), (c) => { c.arc(w * 0.4, h * 0.25, w * 0.09, 0, Math.PI * 2); c.arc(w * 0.61, h * 0.25, w * 0.09, 0, Math.PI * 2); c.moveTo(w * 0.49, h * 0.25); c.lineTo(w * 0.52, h * 0.25); });
    plain(ctx, '#5a3212', (c) => rr(c, w * 0.22, h * 0.02, w * 0.56, h * 0.15, w * 0.08));
  },
  // --- flyers -----------------------------------------------------------
  // The lane runs two drones. They share one hitbox, one behaviour and one
  // palette, and differ only in what sits on top — which at a 12x7 box is the
  // entire silhouette. Which one an instance wears is fixed at spawn, so a row
  // of them is a mixed patrol rather than a repeated sticker.
  //
  // Both replace a drone that was a lozenge under a straight bar: the bar read
  // as a shelf, and nothing on it turned, so once the buzzbird beside it started
  // flapping the drone looked switched off.

  // The workhorse. Same silhouette as the old one, with the bar turned into a
  // rotor that foreshortens through its cycle and a lamp that blinks on the
  // beat. The rotor's width repeats every half turn, so a marked blade tip
  // carries the direction — it orbits the mast and lands somewhere different
  // every frame, which is what makes it spin rather than wobble.
  drone(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ang = (frame / 6) * Math.PI * 2;
    const span = 0.12 + 0.82 * Math.abs(Math.cos(ang)); // rotor seen edge-on to flat
    const x0 = w * (0.5 - span / 2);
    const x1 = w * (0.5 + span / 2);
    // The bar's width repeats every half turn, so a marked blade tip carries the
    // direction: it orbits the mast and is in a different place every frame.
    stroke(ctx, 'rgba(200,200,216,0.75)', cappedLine(u, 0.4, 0.06, 1.3),
      (c) => { c.moveTo(x0, h * 0.16); c.lineTo(x1, h * 0.16); });
    plain(ctx, '#e8e0f8', (c) => c.arc(w * (0.5 + Math.cos(ang) * span * 0.5),
      h * (0.16 + Math.sin(ang) * 0.035), Math.max(0.3, h * 0.05), 0, Math.PI * 2));
    fineShape(ctx, '#8858c8', u, (c) => rr(c, w * 0.14, h * 0.3, w * 0.72, h * 0.56, h * 0.26));
    // Lamp blinks rather than staring — a running machine, not a painted dot.
    const lit = frame % 6 < 4;
    plain(ctx, lit ? '#f6d33c' : '#7a6a2a', (c) => c.arc(w * 0.36, h * 0.56, h * 0.14, 0, Math.PI * 2));
    plain(ctx, '#c8b8e8', (c) => rr(c, w * 0.56, h * 0.44, w * 0.22, h * 0.16, h * 0.06));
    stroke(ctx, '#5a3890', cappedLine(u, 0.35, 0.05, 1.1), (c) => {
      c.moveTo(w * 0.34, h * 0.3); c.lineTo(w * 0.4, h * 0.3);
      c.moveTo(w * 0.66, h * 0.3); c.lineTo(w * 0.6, h * 0.3);
    });
  },
  // The armed variant is the workhorse with a muzzle — it inherits the rotor and
  // the blinking lamp by construction, so the two can never drift apart.
  shooterDrone(ctx, w, h, frame = 0) {
    PROP_PAINTERS.drone(ctx, w, h, frame);
    plain(ctx, '#e04848', (c) => c.arc(w * 0.5, h * 0.86, Math.max(w, h) * 0.08, 0, Math.PI * 2)); // muzzle
  },

  // The watcher. A lens in a ring housing under a single rotor, with a thruster
  // wash beneath. Surveillance rather than delivery — the one prop in the lane
  // that looks back at you.
  //
  // Two speeds in one frame set, which is why it has sixteen frames where the
  // workhorse has six. The rotor has to blur and the eye has to drift, and those
  // are an order of magnitude apart: at the rotor's rate the lens snapped
  // between positions like something malfunctioning. So the strip is cut for the
  // SLOW half — sixteen steps across one lazy sweep, 1.3s end to end — and the
  // rotor is given five whole turns inside that. Five and sixteen share no
  // factors, so the rotor never lands twice in the same place and the two
  // motions never visibly sync up.
  droneEye(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = (frame / DRONE_EYE_FRAMES) * Math.PI * 2;
    const spin = ph * 5;                                  // five turns per sweep
    const span = 0.2 + 0.6 * Math.abs(Math.cos(spin));
    stroke(ctx, 'rgba(200,200,216,0.7)', cappedLine(u, 0.4, 0.055, 1.2),
      (c) => { c.moveTo(w * (0.5 - span / 2), h * 0.14); c.lineTo(w * (0.5 + span / 2), h * 0.14); });
    // Marked blade tip, as on the workhorse. It earns its place twice: it gives
    // the rotor a direction instead of a wobble, and it is the only thing here
    // that is unique per frame — the rotor's width is an |cos| and the lens is a
    // sin, and those two symmetries line up, so without the tip frames 1 and 7
    // are the same drawing.
    plain(ctx, '#e8e0f8', (c) => c.arc(w * (0.5 + Math.cos(spin) * span * 0.5),
      h * (0.14 + Math.sin(spin) * 0.03), Math.max(0.28, h * 0.045), 0, Math.PI * 2));
    stroke(ctx, '#5a3890', cappedLine(u, 0.35, 0.05, 1.1),
      (c) => { c.moveTo(w * 0.5, h * 0.14); c.lineTo(w * 0.5, h * 0.32); });
    // Thruster wash under the housing, breathing on the slow clock so it reads
    // as the machine idling rather than as a second flicker.
    plain(ctx, `rgba(246,211,60,${(0.18 + 0.16 * (0.5 + 0.5 * Math.sin(ph))).toFixed(3)})`,
      (c) => c.ellipse(w * 0.5, h * 0.96, w * 0.26, h * 0.1, 0, 0, Math.PI * 2));
    fineShape(ctx, '#8858c8', u, (c) => c.ellipse(w * 0.5, h * 0.58, w * 0.36, h * 0.3, 0, 0, Math.PI * 2));
    // The lens drifts across and eases at each end, because sin is already
    // slowest where it turns around — a scan that pauses to look rather than a
    // metronome.
    const look = Math.sin(ph) * w * 0.06;
    plain(ctx, '#c8b8e8', (c) => c.arc(w * 0.5, h * 0.58, h * 0.2, 0, Math.PI * 2));
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.5 + look, h * 0.58, h * 0.12, 0, Math.PI * 2));
    plain(ctx, '#1a1028', (c) => c.arc(w * 0.5 + look * 1.3, h * 0.58, h * 0.05, 0, Math.PI * 2));
  },
  // Six frames of wingbeat. The drone hovers on rotors and holds still; this is
  // the one flier that is alive, and a bird that tracks across the lane without
  // moving a feather reads as a sticker. The body and head are fixed and only
  // the wing works — a whole bird bouncing inside its own sprite fights the
  // entity bob that is already moving it.
  //
  // Frame 0 is the neutral pose, identical to the old static art, because that
  // is what reduced motion holds and what every off-lane caller (debris, the
  // field guide, the gallery) draws.
  //
  // It faces LEFT. The hero runs left to right, so everything in the lane
  // travels right to left across the screen — a bird with its beak on the
  // trailing edge is flying backwards into the hero, tail first. The whole
  // painter is drawn in its original right-facing coordinates and mirrored
  // once, so the wing geometry below reads the way it was worked out.
  buzzbird(ctx, w, h, frame = 0) {
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    PROP_PAINTERS.buzzbirdBody(ctx, w, h, frame);
    ctx.restore();
  },
  buzzbirdBody(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = (frame / 6) * Math.PI * 2;
    const beat = Math.sin(ph);                          // -1 down, +1 up
    // Sweep, tilt and thickness together. Height and tilt run off sin, which is
    // symmetric about the top of the stroke — on its own that makes frames 1
    // and 2 the same drawing, and the same for 4 and 5. Thickness runs off
    // SIGNED cos instead, so the downstroke and the recovery are told apart:
    // the wing is broad when it is pushing air and feathered on the way back,
    // which is both what a wing does and what keeps all six frames distinct.
    const wingY = h * (0.42 - beat * 0.24);
    const wingAngle = -0.3 - beat * 0.75;
    const wingRy = h * (0.30 - Math.cos(ph) * 0.09);
    fineShape(ctx, '#f0a860', u, (c) => c.ellipse(w * 0.28, wingY, w * 0.24, wingRy, wingAngle, 0, Math.PI * 2)); // wing
    fineShape(ctx, '#d87830', u, (c) => c.ellipse(w * 0.58, h * 0.5, w * 0.34, h * 0.36, 0, 0, Math.PI * 2));
    plain(ctx, '#f6d33c', (c) => { c.moveTo(w * 0.9, h * 0.42); c.lineTo(w, h * 0.54); c.lineTo(w * 0.88, h * 0.62); c.closePath(); });
    plain(ctx, '#1a1028', (c) => c.arc(w * 0.74, h * 0.4, w * 0.06, 0, Math.PI * 2));
  },
  icicle(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b8e0f8', u, (c) => {
      c.moveTo(w * 0.1, 0); c.lineTo(w * 0.9, 0); c.lineTo(w * 0.55, h); c.closePath();
    });
    plain(ctx, '#e8f8ff', (c) => { c.moveTo(w * 0.24, h * 0.06); c.lineTo(w * 0.44, h * 0.06); c.lineTo(w * 0.4, h * 0.62); c.closePath(); });
  },
  paperwork(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f0f0f8', u, (c) => rr(c, w * 0.06, h * 0.1, w * 0.88, h * 0.8, w * 0.08));
    stroke(ctx, '#8a8a98', Math.max(0.5, h * 0.09), (c) => {
      c.moveTo(w * 0.2, h * 0.38); c.lineTo(w * 0.8, h * 0.38);
      c.moveTo(w * 0.2, h * 0.62); c.lineTo(w * 0.66, h * 0.62);
    });
  },
  // --- pickups ----------------------------------------------------------
  coin(ctx, w, h) {
    const u = Math.max(w, h);
    const r = Math.min(w, h) * 0.46;
    const gold = ctx.createRadialGradient(w * 0.36, h * 0.29, r * 0.08, w * 0.5, h * 0.52, r);
    gold.addColorStop(0, '#fff3a0');
    gold.addColorStop(0.34, '#f8d84a');
    gold.addColorStop(1, '#d69b18');
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.44, h * 0.46, 0, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = 'rgba(105,67,10,0.4)';
    ctx.lineWidth = Math.max(0.2, u * 0.018);
    ctx.stroke();

    // A fine embossed rim survives the 16-to-8 downsample as tonal detail
    // instead of becoming the thick dark washer in the old sprite. No centre
    // stamp: at pickup size it read as an odd dark oval, not an engraving.
    stroke(ctx, 'rgba(166,111,16,0.72)', Math.max(0.18, u * 0.017), (c) => {
      c.ellipse(w / 2, h / 2, w * 0.33, h * 0.35, 0, 0, Math.PI * 2);
    });
    plain(ctx, 'rgba(255,251,204,0.9)', (c) => c.ellipse(w * 0.35, h * 0.29, w * 0.075, h * 0.095, -0.45, 0, Math.PI * 2));
  },
  // Laid out landscape with the terminal on the RIGHT, the same way round as
  // the HUD's health meter: a pickup that points one way and the meter it feeds
  // pointing the other made the player read them as two different objects.
  //
  // Drawn on the 28x18 cell grid rather than on eyeballed fractions of the
  // box, so the two are the same battery at two sizes. That matters because the
  // pickup's def box is SQUARE (8x8): fitting the art to that box turns a
  // battery into a lozenge, and the family resemblance goes with it. Instead the
  // art takes the box's full width and lets its height fall where the HUD
  // proportions put it — around half the box — with PROP_VISUAL_SCALE paying
  // back the presence that flatter silhouette costs. The chunky pickup greens
  // stay: this one still has to hold up as a thing in the world.
  battery(ctx, w, h) {
    const u = Math.max(w, h);
    const { X, Y } = batteryGrid(w, h);
    fineShape(ctx, '#48c848', u, (c) => rr(c, X(1.5), Y(2.5), X(22.5) - X(1.5), Y(15.5) - Y(2.5), (X(5) - X(1.5))));
    plain(ctx, '#2a8a2a', (c) => rr(c, X(23), Y(6), X(26.5) - X(23), Y(12) - Y(6), X(3) - X(1.5)));
    plain(ctx, '#eaffea', (c) => boltPath(c, X, Y));
  },
  // --- HUD-only art -----------------------------------------------------
  // The health meter is not in this table: it takes a segment count and a
  // charge, which a name-keyed painter has nowhere to put. See drawHudBattery.
  //
  // The coin beside it. The world `coin` is a flat disc with an embossed
  // rim, which at 12 units in a dark panel reads as a washer; this one is a
  // lit sphere — gradient plus a warm rim — so it holds its shape and stays
  // legibly gold against the slate fill.
  hudCoin(ctx, w, h) {
    const r = Math.min(w, h) / 2;
    const g = ctx.createRadialGradient(w * 0.36, h * 0.32, r * 0.15, w * 0.5, h * 0.5, r);
    g.addColorStop(0, '#ffe07a');
    g.addColorStop(1, '#f0b419');
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r - r / 12, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#d99a10';
    ctx.lineWidth = r / 6;
    ctx.stroke();
  },
  capShield(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#48a8f0', u, (c) => {
      c.moveTo(w * 0.5, h * 0.04);
      c.lineTo(w * 0.92, h * 0.24);
      c.quadraticCurveTo(w * 0.92, h * 0.8, w * 0.5, h * 0.98);
      c.quadraticCurveTo(w * 0.08, h * 0.8, w * 0.08, h * 0.24);
      c.closePath();
    });
    plain(ctx, '#d8f0ff', (c) => { c.moveTo(w * 0.5, h * 0.2); c.lineTo(w * 0.74, h * 0.32); c.quadraticCurveTo(w * 0.72, h * 0.66, w * 0.5, h * 0.78); c.closePath(); });
  },
  capMagnet(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#e04848', u, (c) => {
      c.arc(w * 0.5, h * 0.52, w * 0.4, Math.PI, 0);
      c.lineTo(w * 0.9, h * 0.76); c.lineTo(w * 0.62, h * 0.76);
      c.lineTo(w * 0.62, h * 0.52);
      c.arc(w * 0.5, h * 0.52, w * 0.12, 0, Math.PI, true);
      c.lineTo(w * 0.38, h * 0.76); c.lineTo(w * 0.1, h * 0.76);
      c.closePath();
    });
    plain(ctx, '#c8d8e8', (c) => { rr(c, w * 0.1, h * 0.76, w * 0.28, h * 0.2, w * 0.04); rr(c, w * 0.62, h * 0.76, w * 0.28, h * 0.2, w * 0.04); });
  },
  capStar(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#f6d33c', u, (c) => star(c, w / 2, h * 0.52, w * 0.48, w * 0.2, 5));
    plain(ctx, '#fff8c0', (c) => star(c, w / 2, h * 0.5, w * 0.22, w * 0.09, 5));
  },
  capAirJump(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#72d8f0', u, (c) => { c.moveTo(w * 0.5, h * 0.04); c.lineTo(w * 0.92, h * 0.84); c.lineTo(w * 0.5, h * 0.68); c.lineTo(w * 0.08, h * 0.84); c.closePath(); });
    plain(ctx, '#e8fbff', (c) => { c.moveTo(w * 0.5, h * 0.22); c.lineTo(w * 0.7, h * 0.62); c.lineTo(w * 0.5, h * 0.54); c.lineTo(w * 0.3, h * 0.62); c.closePath(); });
  },
  capSpeed(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#f89048', u, (c) => { c.moveTo(w * 0.16, h * 0.2); c.lineTo(w * 0.62, h * 0.2); c.lineTo(w * 0.46, h * 0.48); c.lineTo(w * 0.84, h * 0.48); c.lineTo(w * 0.28, h * 0.9); c.lineTo(w * 0.42, h * 0.6); c.lineTo(w * 0.1, h * 0.6); c.closePath(); });
    plain(ctx, '#fff0c8', (c) => { c.moveTo(w * 0.48, h * 0.3); c.lineTo(w * 0.66, h * 0.3); c.lineTo(w * 0.5, h * 0.5); c.lineTo(w * 0.32, h * 0.5); c.closePath(); });
  },
  capLowGrav(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b888f0', u, (c) => c.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2));
    plain(ctx, '#5c3c98', (c) => c.arc(w * 0.6, h * 0.46, w * 0.24, 0, Math.PI * 2));
    plain(ctx, '#f4e8ff', (c) => { c.arc(w * 0.27, h * 0.28, w * 0.08, 0, Math.PI * 2); c.arc(w * 0.35, h * 0.68, w * 0.05, 0, Math.PI * 2); });
  },
  capUnpeel(ctx, w, h) {
    // the potato that cannot be peeled: humble spud, unreasonable aura
    const u = Math.max(w, h);
    stroke(ctx, '#e8e8f0', Math.max(0.5, w * 0.09), (c) => c.ellipse(w * 0.5, h * 0.5, w * 0.45, h * 0.45, 0, 0, Math.PI * 2));
    fineShape(ctx, '#c89058', u, (c) => c.ellipse(w * 0.5, h * 0.54, w * 0.34, h * 0.28, 0.3, 0, Math.PI * 2));
    plain(ctx, '#8a6038', (c) => {
      c.ellipse(w * 0.38, h * 0.46, w * 0.07, h * 0.06, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.62, h * 0.62, w * 0.06, h * 0.05, 0, 0, Math.PI * 2);
    });
  },
  capRewind(ctx, w, h) {
    // The ◀◀ scrub glyph, dark on a solid mint disc. Dark-on-light rather
    // than a reel with a light glyph: at the native 8px a ring swallowed the
    // triangles and the capsule read as a lifesaver. Two fat dark notches on
    // an unbroken mint field survive the shrink, and mint alone already says
    // "rewind" — no other capsule owns green.
    const u = Math.max(w, h);
    fineShape(ctx, '#7ce8a0', u, (c) => c.arc(w * 0.5, h * 0.5, w * 0.46, 0, Math.PI * 2));
    plain(ctx, '#1c4834', (c) => {
      c.moveTo(w * 0.84, h * 0.24); c.lineTo(w * 0.84, h * 0.76); c.lineTo(w * 0.52, h * 0.5); c.closePath();
      c.moveTo(w * 0.48, h * 0.24); c.lineTo(w * 0.48, h * 0.76); c.lineTo(w * 0.16, h * 0.5); c.closePath();
    });
  },
  appliance(ctx, w, h, frame = 0, finish = null) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(55,35,12,0.22)';
      ctx.lineWidth = Math.max(0.24, u * 0.015);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    };
    const wingShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(64,61,78,0.4)';
      ctx.lineWidth = Math.max(0.34, u * 0.02);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    };

    // Build in the reference's three-quarter view, then flip the complete
    // construction so its body, lever and unequal wings all travel rightward.
    ctx.save();
    // The 24x20 pickup reserves its top four pixels for the toast launch.
    // Compress the appliance construction back to its intended 24x16 body and
    // bottom-anchor it inside that taller transparent canvas.
    ctx.translate(0, h * 0.2);
    ctx.scale(1, 0.8);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    // Pitch the complete appliance toward its front-right corner. Because the
    // authored construction is mirrored, this slight counter-clockwise local
    // roll appears clockwise on screen: the near-right corner sits lower.
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-0.065);
    ctx.translate(-w * 0.5, -h * 0.5);
    const phase = (frame % 12) * Math.PI / 6;
    const lift = Math.cos(phase);
    const sweep = Math.sin(phase);
    // Toast runs on its own four-second cycle, offset from the quick wing flap.
    const toastBand = Math.floor((frame % 96) / 12);
    const toastPhase = (frame % 96) * Math.PI / 48 + Math.PI / 6;
    // Spend most of the slow cycle raised, dip fully into the slot only
    // briefly, then return. Frame zero starts visibly raised in static views.
    // Band three is reserved for genuinely toastless appliances.  Previously
    // it merely landed near the bottom of the animation curve, which still
    // left a small slice visible on most wing frames.
    const toastOpen = toastBand === 3 ? 0
      : Math.pow(Math.max(0, 0.5 + Math.cos(toastPhase) * 0.5), 0.35);
    const toastRise = h * 0.48 * toastOpen;
    const toastSway = w * 0.002 * Math.sin(toastPhase);

    // Small rear wing tucked behind the toaster's top shoulder.
    ctx.save();
    ctx.translate(w * 0.34, h * 0.44);
    // This wing extends left in the authored view, so its hinge rotation must
    // oppose the foreground wing for both tips to rise and fall together.
    ctx.rotate(0.28 + lift * 0.26 - sweep * 0.02);
    ctx.scale(1.08, 1.08);
    wingShape('#d5d4dc', (c) => {
      c.moveTo(0, h * 0.08);
      c.bezierCurveTo(-w * 0.1, -h * 0.01, -w * 0.22, -h * 0.03, -w * 0.29, h * 0.01);
      c.quadraticCurveTo(-w * 0.22, h * 0.11, -w * 0.15, h * 0.11);
      c.quadraticCurveTo(-w * 0.11, h * 0.19, -w * 0.05, h * 0.15);
      c.closePath();
    });
    stroke(ctx, '#9999a8', Math.max(0.24, u * 0.014), (c) => {
      c.moveTo(-w * 0.25, h * 0.025); c.quadraticCurveTo(-w * 0.12, h * 0.06, 0, h * 0.1);
      c.moveTo(-w * 0.17, h * 0.035); c.lineTo(-w * 0.08, h * 0.135);
    });
    ctx.restore();

    // Flat reference construction: one narrow side plane, one broad face and
    // one sloped cap. Avoid a separate round centre panel.
    fineShape(finish?.back || '#a97816', (c) => {
      c.moveTo(w * 0.16, h * 0.36);
      c.quadraticCurveTo(w * 0.17, h * 0.35, w * 0.2, h * 0.36);
      c.lineTo(w * 0.31, h * 0.39);
      c.lineTo(w * 0.32, h * 0.92);
      c.lineTo(w * 0.21, h * 0.9);
      c.quadraticCurveTo(w * 0.16, h * 0.88, w * 0.16, h * 0.82);
      c.lineTo(w * 0.16, h * 0.36);
      c.closePath();
    });
    fineShape(finish?.side || '#f4c934', (c) => {
      c.moveTo(w * 0.31, h * 0.39);
      c.lineTo(w * 0.74, h * 0.35);
      c.quadraticCurveTo(w * 0.8, h * 0.34, w * 0.8, h * 0.41);
      c.lineTo(w * 0.79, h * 0.81);
      c.quadraticCurveTo(w * 0.79, h * 0.86, w * 0.73, h * 0.88);
      c.lineTo(w * 0.36, h * 0.92);
      c.quadraticCurveTo(w * 0.32, h * 0.92, w * 0.32, h * 0.88);
      c.lineTo(w * 0.31, h * 0.39);
      c.closePath();
    });
    fineShape(finish?.top || '#ffe16a', (c) => {
      c.moveTo(w * 0.17, h * 0.36);
      c.lineTo(w * 0.31, h * 0.28);
      c.quadraticCurveTo(w * 0.32, h * 0.27, w * 0.35, h * 0.27);
      c.lineTo(w * 0.68, h * 0.27);
      c.quadraticCurveTo(w * 0.7, h * 0.27, w * 0.72, h * 0.29);
      c.lineTo(w * 0.79, h * 0.34);
      c.quadraticCurveTo(w * 0.8, h * 0.36, w * 0.77, h * 0.36);
      c.lineTo(w * 0.35, h * 0.39);
      c.quadraticCurveTo(w * 0.32, h * 0.4, w * 0.3, h * 0.38);
      c.closePath();
    });
    stroke(ctx, 'rgba(178,124,22,0.55)', Math.max(0.2, u * 0.011), (c) => {
      c.moveTo(w * 0.35, h * 0.39);
      c.lineTo(w * 0.77, h * 0.36);
    });

    // The ejector lives on the narrow side plane. Its thumb rises as the
    // independent toast cycle opens, making the mechanism legible without the
    // old floating knob.
    stroke(ctx, '#6e4518', Math.max(0.26, u * 0.014), (c) => {
      c.moveTo(w * 0.235, h * 0.49);
      c.lineTo(w * 0.235, h * 0.74);
    });
    const sliderY = h * (0.67 - toastOpen * 0.13);
    fineShape('#4a2b12', (c) => rr(c, w * 0.19, sliderY, w * 0.09, h * 0.07, w * 0.022));

    // A very small travelling gleam keeps the collectible feeling prized
    // without competing with the toast or feather animation.
    const glimmer = Math.max(0, Math.sin(toastPhase * 2 - 0.45));
    ctx.save();
    ctx.globalAlpha = 0.22 + glimmer * 0.62;
    plain(ctx, '#fff8c8', (c) => star(c, w * 0.67, h * 0.56, w * (0.012 + glimmer * 0.014), w * 0.005, 4));
    ctx.restore();

    // Clip the full square slice at the slot line: at the bottom of its slow
    // cycle it is genuinely inside the casing; at the top it rises almost
    // completely clear. The tiny lateral settle keeps all 96 poses distinct.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.325);
    ctx.rotate(-0.07);
    ctx.translate(-w * 0.5, -h * 0.325);
    ctx.beginPath();
    ctx.rect(0, -h, w, h * 1.335);
    ctx.clip();
    ctx.translate(toastSway, -toastRise);
    // A slight shear makes the slice lean toward the visible right-side plane
    // while its lower edge remains aligned with the slot.
    ctx.transform(1, 0, 0.07, 1, -h * 0.021, 0);
    fineShape('#93602a', (c) => rr(c, w * 0.385, h * 0.345, w * 0.23, h * 0.345, w * 0.03));
    plain(ctx, '#d9a84f', (c) => rr(c, w * 0.415, h * 0.38, w * 0.17, h * 0.275, w * 0.022));
    ctx.restore();

    // One clean recessed opening; the dark capsule carries enough depth
    // without an extra metallic rim competing with the toast.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.325);
    ctx.rotate(-0.07);
    ctx.translate(-w * 0.5, -h * 0.325);
    plain(ctx, '#4a2b12', (c) => rr(c, w * 0.36, h * 0.309, w * 0.28, h * 0.036, h * 0.016));
    ctx.restore();

    // Large foreground wing wraps across the side. Separate feather tips make
    // the wing survive reduction without reverting to a thick dark outline.
    ctx.save();
    ctx.translate(w * 0.57, h * 0.52);
    ctx.rotate(-0.08 - lift * 0.31 + sweep * 0.025);
    ctx.scale(1.08, 1.08);
    wingShape('#f6f5fa', (c) => {
      c.moveTo(-w * 0.05, -h * 0.06);
      c.bezierCurveTo(w * 0.08, -h * 0.14, w * 0.21, -h * 0.15, w * 0.36, -h * 0.11);
      c.quadraticCurveTo(w * 0.4, -h * 0.04, w * 0.34, h * 0.015);
      c.quadraticCurveTo(w * 0.39, h * 0.08, w * 0.31, h * 0.12);
      c.quadraticCurveTo(w * 0.34, h * 0.2, w * 0.25, h * 0.2);
      c.quadraticCurveTo(w * 0.23, h * 0.28, w * 0.14, h * 0.23);
      c.quadraticCurveTo(w * 0.08, h * 0.29, w * 0.02, h * 0.18);
      c.closePath();
    });
    stroke(ctx, '#aaaab8', Math.max(0.24, u * 0.014), (c) => {
      c.moveTo(-w * 0.02, h * 0.02); c.quadraticCurveTo(w * 0.17, h * 0.02, w * 0.34, -h * 0.08);
      c.moveTo(w * 0.1, h * 0.04); c.lineTo(w * 0.31, h * 0.1);
      c.moveTo(w * 0.08, h * 0.08); c.lineTo(w * 0.24, h * 0.19);
      c.moveTo(w * 0.04, h * 0.1); c.lineTo(w * 0.14, h * 0.23);
    });
    ctx.restore();

    ctx.restore();
  },
  cord(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(26,16,40,0.28)';
      ctx.lineWidth = Math.max(0.28, u * 0.02);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    };
    // A loose extension-cord S: dark edging keeps the thin cable intact over
    // bright stages, while the orange centre distinguishes it from fuse wire.
    const cable = (c) => {
      c.moveTo(w * 0.18, h * 0.3);
      c.bezierCurveTo(w * 0.38, h * 0.22, w * 0.3, h * 0.8, w * 0.54, h * 0.72);
      c.bezierCurveTo(w * 0.73, h * 0.66, w * 0.64, h * 0.3, w * 0.82, h * 0.42);
    };
    stroke(ctx, 'rgba(26,16,40,0.4)', Math.max(1, h * 0.16), cable);
    stroke(ctx, '#e07820', Math.max(0.62, h * 0.085), cable);

    // Male plug at left, female socket at right. Their opposite faces make a
    // single fragment read as something that can reconnect into a longer cord.
    fineShape('#d8d8e4', (c) => rr(c, w * 0.04, h * 0.14, w * 0.17, h * 0.3, h * 0.07));
    plain(ctx, '#6a6a78', (c) => {
      rr(c, 0, h * 0.19, w * 0.055, h * 0.055, h * 0.015);
      rr(c, 0, h * 0.33, w * 0.055, h * 0.055, h * 0.015);
    });
    fineShape('#707080', (c) => rr(c, w * 0.78, h * 0.27, w * 0.2, h * 0.34, h * 0.09));
    plain(ctx, '#242430', (c) => {
      c.ellipse(w * 0.845, h * 0.44, w * 0.018, h * 0.035, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.92, h * 0.44, w * 0.018, h * 0.035, 0, 0, Math.PI * 2);
    });
    plain(ctx, '#fff', (c) => c.ellipse(w * 0.815, h * 0.33, w * 0.018, h * 0.025, 0, 0, Math.PI * 2));
  },
  fuse(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#d8b088', u, (c) => rr(c, w * 0.14, h * 0.24, w * 0.72, h * 0.56, h * 0.2));
    plain(ctx, '#8a8a98', (c) => { rr(c, w * 0.02, h * 0.34, w * 0.16, h * 0.34, h * 0.06); rr(c, w * 0.82, h * 0.34, w * 0.16, h * 0.34, h * 0.06); });
    stroke(ctx, '#e04848', Math.max(0.5, h * 0.12), (c) => { c.moveTo(w * 0.28, h * 0.52); c.lineTo(w * 0.72, h * 0.52); });
  },
  // The speed ramp. Bake-off winner (candidate A, black and gold): the drawing
  // lives with the other candidates further down so the section that decided
  // it stays honest, and this is the one line that ships it. The pre-bake-off
  // pad is kept as boostPadLegacy.
  boostPad(ctx, w, h, frame = 0) { PROP_PAINTERS.rampChevron(ctx, w, h, frame); },
  // Spring-pad bake-off winner C: the arcade plunger. One red button crown on
  // one polished shaft is a stronger lane silhouette than the old stack of
  // floating bars, and it belongs to the cabinet fiction without borrowing the
  // boost pad's black-and-gold identity. The 16x6 gameplay box is unchanged;
  // PROP_TALL only buys the visible machine above it.
  springPad(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    const wind = Math.min(1, p / 0.625);
    const release = p > 0.625 ? (p - 0.625) / 0.375 : 0;
    const squash = p <= 0.625
      ? 1 - 0.36 * wind * wind
      : 0.64 + 0.36 * release + 0.18 * Math.sin(release * Math.PI);
    const crownY = h * (0.72 - 0.43 * squash);

    // Ground shadow and cream bolted housing. It stays still while the crown
    // works, which makes the compression legible as motion rather than scale.
    plain(ctx, 'rgba(5,7,12,.2)', (c) => c.ellipse(w / 2, h * 0.96, w * 0.47, h * 0.035, 0, 0, Math.PI * 2));
    fineShape(ctx, '#f2d8a7', u, (c) => rr(c, w * 0.015, h * 0.82, w * 0.97, h * 0.16, h * 0.038),
      'rgba(8,10,18,.72)', 0.025);
    plain(ctx, 'rgba(255,255,255,.34)',
      (c) => rr(c, w * 0.055, h * 0.839, w * 0.89, h * 0.029, h * 0.012));
    for (const x of [0.12, 0.88]) {
      fineShape(ctx, '#d8e1e8', u,
        (c) => c.arc(w * x, h * 0.9, Math.max(0.45, w * 0.035), 0, Math.PI * 2),
        '#29303d', 0.012);
    }

    // Polished centre shaft: one moving support instead of three abstract bars.
    fineShape(ctx, '#aeb9c8', u,
      (c) => rr(c, w * 0.43, crownY + h * 0.1, w * 0.14, h * 0.69 - crownY, w * 0.035),
      '#343b49', 0.025);
    plain(ctx, '#5d6877',
      (c) => rr(c, w * 0.47, crownY + h * 0.12, w * 0.035, h * 0.64 - crownY, w * 0.015));

    // Red arcade-button crown. It flashes cream on release, so the firing pose
    // is visible without adding arrows or effects outside the machine.
    fineShape(ctx, release ? '#ffefb5' : '#ee554d', u, (c) => {
      c.moveTo(w * 0.14, crownY + h * 0.14);
      c.quadraticCurveTo(w * 0.17, crownY, w * 0.31, crownY - h * 0.035);
      c.quadraticCurveTo(w * 0.5, crownY - h * 0.1, w * 0.69, crownY - h * 0.035);
      c.quadraticCurveTo(w * 0.83, crownY, w * 0.86, crownY + h * 0.14);
      c.closePath();
    }, '#49212c', 0.03);
    plain(ctx, 'rgba(255,255,255,.5)',
      (c) => c.ellipse(w * 0.43, crownY + h * 0.015, w * 0.2, h * 0.035, -0.08, 0, Math.PI * 2));
  },
  target(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#fff', u, (c) => c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2));
    plain(ctx, '#e04848', (c) => c.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2));
    plain(ctx, '#fff', (c) => c.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2));
    plain(ctx, '#e04848', (c) => c.arc(w / 2, h / 2, w * 0.08, 0, Math.PI * 2));
  },
  // --- scenery / villains ----------------------------------------------
  portal(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, 'rgba(72,224,200,0.28)', u, (c) => c.ellipse(w / 2, h / 2, w * 0.44, h * 0.48, 0, 0, Math.PI * 2));
    stroke(ctx, '#48e0c8', Math.max(0.7, w * 0.16), (c) => c.ellipse(w / 2, h / 2, w * 0.36, h * 0.42, 0, 0, Math.PI * 2));
    stroke(ctx, '#c8fff0', Math.max(0.5, w * 0.07), (c) => c.ellipse(w * 0.42, h * 0.4, w * 0.16, h * 0.2, -0.4, 0.6, 2.4));
  },
  // The bust: the portrait every taunt card shows, the intro panel, the relic.
  eggshell(ctx, w, h) {
    ctx.save();
    ctx.scale(w / EG_APE_W, h / EG_APE_H);
    eggshellApe(ctx, 0, 0);
    ctx.restore();
  },
  // The clown-copter: the bust under a two-blade rotor seen three-quarter,
  // so the disc reads as a disc and the near blade crosses in front of his
  // head every turn. Twelve frames cover half a revolution — the blade pair is
  // symmetric under a half turn — at 24fps, which is one turn a second.
  // The old drawing had no rotor at all; the grey bar over it was a rect
  // drawCopter jittered above the box.
  eggshellCopter(ctx, w, h, frame = 0) { eggshellCopterArt(ctx, w, h, frame); },
  // The finale's ride: a striped clown balloon with the tub as its basket.
  // Slower than a walking plumber, which is the forty-year losing streak
  // explained. Twice the copter's height on purpose — it lives in the sky
  // band, and it is the thing you pop.
  eggshellBalloon(ctx, w, h) {
    ctx.save();
    ctx.scale(w / 28, h / 46);
    const cx = 14, cy = 12.5, rx = 12.5, ry = 13, lw = EG_LW;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, EG_TAU); ctx.clip();
    ctx.fillStyle = EG_CREAM; ctx.fillRect(0, 0, 28, 28);
    for (let i = 0; i < 7; i += 2) { ctx.fillStyle = EG_RED; ctx.fillRect(cx - rx + i * (2 * rx / 7), 0, 2 * rx / 7, 28); }
    ctx.restore();
    egLine(ctx, EG_LINE, lw, (k) => k.ellipse(cx, cy, rx, ry, 0, 0, EG_TAU));
    egP(ctx, '#3a3f4a', (k) => { k.moveTo(11.3, 25); k.lineTo(16.7, 25); k.lineTo(15.7, 27.5); k.lineTo(12.3, 27.5); k.closePath(); }, EG_LINE, lw * 0.6);
    // three ropes to the rim, drawn first so he covers where they cross him
    egLine(ctx, '#5a4a3a', 0.4, (k) => {
      k.moveTo(12.4, 27.5); k.lineTo(2 + EG_APE_W * 0.13, 26 + EG_APE_H * 0.6);
      k.moveTo(14, 27.5); k.lineTo(14, 26 + EG_APE_H * 0.34);
      k.moveTo(15.6, 27.5); k.lineTo(2 + EG_APE_W * 0.87, 26 + EG_APE_H * 0.6);
    });
    eggshellApe(ctx, 2, 26);
    ctx.restore();
  },
  dustdevil(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(35,23,38,0.27)';
      ctx.lineWidth = Math.max(0.18, u * 0.012);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    const detailLine = Math.max(0.16, u * 0.009);

    // A real upright-vacuum silhouette: loop grip and steel spine first, then
    // the bag/chamber, motor pod and a wide floor nozzle.
    stroke(ctx, '#3a3040', Math.max(0.34, u * 0.025), (c) => {
      c.moveTo(w * 0.41, h * 0.52);
      c.lineTo(w * 0.61, h * 0.14);
      c.quadraticCurveTo(w * 0.64, h * 0.08, w * 0.7, h * 0.07);
      c.lineTo(w * 0.79, h * 0.07);
    });
    stroke(ctx, '#aeb2bc', Math.max(0.17, u * 0.011), (c) => {
      c.moveTo(w * 0.42, h * 0.51);
      c.lineTo(w * 0.625, h * 0.145);
      c.quadraticCurveTo(w * 0.65, h * 0.1, w * 0.7, h * 0.095);
      c.lineTo(w * 0.785, h * 0.095);
    });
    fineShape('#8f2630', (c) => rr(c, w * 0.73, h * 0.035, w * 0.18, h * 0.09, w * 0.035));

    // Flexible hose loops from the motor up the spine—a strong appliance cue
    // that is quieter and more believable than the old floating plug.
    stroke(ctx, '#4b4650', Math.max(0.24, u * 0.017), (c) => {
      c.moveTo(w * 0.59, h * 0.72);
      c.bezierCurveTo(w * 0.88, h * 0.61, w * 0.79, h * 0.27, w * 0.64, h * 0.21);
    });
    stroke(ctx, '#777783', Math.max(0.1, u * 0.006), (c) => {
      c.moveTo(w * 0.59, h * 0.72);
      c.bezierCurveTo(w * 0.85, h * 0.6, w * 0.76, h * 0.3, w * 0.64, h * 0.22);
    });

    // Tapered dust chamber hangs from the spine instead of reading as a
    // featureless rounded box.
    fineShape('#9e2028', (c) => {
      c.moveTo(w * 0.3, h * 0.27);
      c.quadraticCurveTo(w * 0.32, h * 0.23, w * 0.38, h * 0.23);
      c.lineTo(w * 0.52, h * 0.27);
      c.lineTo(w * 0.59, h * 0.67);
      c.quadraticCurveTo(w * 0.57, h * 0.72, w * 0.5, h * 0.73);
      c.lineTo(w * 0.3, h * 0.7);
      c.quadraticCurveTo(w * 0.26, h * 0.68, w * 0.27, h * 0.62);
      c.closePath();
    });
    plain(ctx, '#c93a3e', (c) => {
      c.moveTo(w * 0.32, h * 0.29);
      c.lineTo(w * 0.39, h * 0.27);
      c.lineTo(w * 0.43, h * 0.66);
      c.lineTo(w * 0.32, h * 0.65);
      c.closePath();
    });
    // An amber beacon sits physically above the chamber, away from the face.
    plain(ctx, 'rgba(246,211,60,0.24)', (c) => rr(c, w * 0.325, h * 0.19, w * 0.075, h * 0.065, h * 0.02));
    fineShape('#f6d33c', (c) => rr(c, w * 0.337, h * 0.2, w * 0.052, h * 0.048, h * 0.016));

    // A quiet pair of cartoon eyes sits directly on the red chamber. Small,
    // close-set ovals with no sockets or outline register on a second look
    // instead of turning the whole appliance into a face.
    plain(ctx, '#f4eee4', (c) => {
      c.ellipse(w * 0.416, h * 0.408, w * 0.023, h * 0.032, -0.05, 0, Math.PI * 2);
      c.ellipse(w * 0.472, h * 0.41, w * 0.023, h * 0.032, 0.05, 0, Math.PI * 2);
    });
    plain(ctx, '#26313d', (c) => {
      c.ellipse(w * 0.423, h * 0.414, w * 0.0085, h * 0.012, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.479, h * 0.416, w * 0.0085, h * 0.012, 0, 0, Math.PI * 2);
    });

    // Low motor housing bridges the tall chamber to the cleaning head.
    fineShape('#be3036', (c) => {
      c.moveTo(w * 0.18, h * 0.66);
      c.quadraticCurveTo(w * 0.2, h * 0.61, w * 0.29, h * 0.61);
      c.lineTo(w * 0.58, h * 0.63);
      c.quadraticCurveTo(w * 0.67, h * 0.65, w * 0.7, h * 0.74);
      c.lineTo(w * 0.69, h * 0.82);
      c.lineTo(w * 0.16, h * 0.82);
      c.closePath();
    });
    plain(ctx, '#e05252', (c) => rr(c, w * 0.23, h * 0.65, w * 0.28, h * 0.045, h * 0.018));

    // Broad wedge-shaped floor head and dark brush lip finish the read.
    fineShape('#8f1c25', (c) => {
      c.moveTo(w * 0.08, h * 0.835);
      c.lineTo(w * 0.74, h * 0.825);
      c.lineTo(w * 0.89, h * 0.9);
      c.quadraticCurveTo(w * 0.9, h * 0.95, w * 0.84, h * 0.96);
      c.lineTo(w * 0.06, h * 0.96);
      c.quadraticCurveTo(w * 0.02, h * 0.94, w * 0.04, h * 0.88);
      c.closePath();
    });
    plain(ctx, '#c9363d', (c) => {
      c.moveTo(w * 0.1, h * 0.845); c.lineTo(w * 0.72, h * 0.84);
      c.lineTo(w * 0.8, h * 0.88); c.lineTo(w * 0.08, h * 0.89); c.closePath();
    });
    plain(ctx, '#4b2730', (c) => rr(c, w * 0.06, h * 0.92, w * 0.79, h * 0.035, h * 0.014));
    // Its small transport wheels are recessed under the head; showing them
    // here adds two face-like circles without strengthening the vacuum read.
    stroke(ctx, 'rgba(238,108,108,0.65)', detailLine, (c) => {
      c.moveTo(w * 0.19, h * 0.9); c.lineTo(w * 0.68, h * 0.89);
    });
  },
  // PLUG_ICONS[1], the CHALLENGE plug. This is never a world prop: it is only
  // ever drawn at size-3 of the plug box — 10x10 in the stage-select list,
  // 8x8 in the in-run HUD, 5x5 in the Trophy Room's level records — and it
  // spends most of its life at ALPHA_EMPTY (0.22), because an unearned
  // challenge is the default state. Everything here is decided at those sizes.
  //
  // The previous drawing had no handles, so its silhouette was a tulip rather
  // than a trophy; a straight rim, so the top read as a lid; and no contour at
  // all on the stem and base, so against the plug tile's #181820 fill the foot
  // dissolved and the cup floated. The wide-narrow-wide profile below is what
  // the eye actually reads as "trophy" once the detail is gone at 5px.
  plugTrophy(ctx, w, h) {
    PROP_PAINTERS.plugTrophyAt(ctx, w, h, TROPHY_HANDLE_SPREAD);
  },
  // The trophy, with the handle reach as a parameter so it can be tuned against
  // the sizes it actually renders at. Everything else is fixed.
  plugTrophyAt(ctx, w, h, spread = TROPHY_HANDLE_SPREAD) {
    const u = Math.max(w, h);
    // Handles go down FIRST, behind the bowl, so their join is covered rather
    // than seamed — a seam is the first thing to break up at 8 pixels. Open
    // loops rather than solid ears: the hole does close at the smallest size,
    // but the round outer sweep still reads as a handle where a triangle reads
    // as a chip out of the rim.
    //
    // `spread` is how far the widest point of the loop sits from the centre, as
    // a fraction of the box. The bowl's own half-width is 0.26, so this is the
    // ratio that decides whether the handles look like part of the cup or like
    // a pair of wings bolted to it — and the stroke adds another half-linewidth
    // outside whatever it is set to.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8f9db2';
    ctx.lineWidth = Math.max(0.32, u * TROPHY_HANDLE_WEIGHT);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * (0.5 + s * 0.23), h * 0.16);
      ctx.quadraticCurveTo(w * (0.5 + s * (spread + 0.04)), h * 0.17, w * (0.5 + s * spread), h * 0.32);
      ctx.quadraticCurveTo(w * (0.5 + s * (spread - 0.04)), h * 0.44, w * (0.5 + s * 0.13), h * 0.42);
      ctx.stroke();
    }
    ctx.restore();
    // Squat, wide bowl — short enough that the star has room without having to
    // narrow the base to find it.
    fineShape(ctx, trophySilver(ctx, w, h), u, (c) => {
      c.moveTo(w * 0.24, h * 0.1);
      c.lineTo(w * 0.76, h * 0.1);
      c.quadraticCurveTo(w * 0.72, h * 0.44, w * 0.5, h * 0.52);
      c.quadraticCurveTo(w * 0.28, h * 0.44, w * 0.24, h * 0.1);
      c.closePath();
    }, TROPHY_INK, 0.028);
    // Rim band. The one horizontal that stops the top edge reading as a lid.
    plain(ctx, '#f6faff', (c) => rr(c, w * 0.25, h * 0.1, w * 0.5, h * 0.065, h * 0.028));
    // Dark star, not light: on a metal bowl the punched-out read carries much
    // further down than an embossed one, which just goes the colour of the rim
    // highlight and vanishes.
    plain(ctx, 'rgba(30,40,58,0.62)', (c) => star(c, w * 0.5, h * 0.27, u * 0.145, u * 0.06, 5));
    // Stem and a two-tier plinth, each with the same contour as the bowl so the
    // foot stays a separate object on a dark tile instead of dissolving.
    fineShape(ctx, '#a3aec0', u, (c) => rr(c, w * 0.44, h * 0.5, w * 0.12, h * 0.16, w * 0.03), TROPHY_INK, 0.026);
    fineShape(ctx, '#c3cddd', u, (c) => rr(c, w * 0.28, h * 0.64, w * 0.44, h * 0.11, w * 0.035), TROPHY_INK, 0.026);
    fineShape(ctx, '#8593a8', u, (c) => rr(c, w * 0.18, h * 0.75, w * 0.64, h * 0.16, w * 0.05), TROPHY_INK, 0.026);
  },
  // Handle-reach candidates, kept ONLY for the gallery's spread bake-off. They
  // exist because the icon lives at 5-10px and the reach cannot be judged at any
  // other size. Delete them with that section once a value is pinned.
  plugTrophyWide(ctx, w, h) { PROP_PAINTERS.plugTrophyAt(ctx, w, h, 0.44); },   // as shipped before this pass
  plugTrophyTight(ctx, w, h) { PROP_PAINTERS.plugTrophyAt(ctx, w, h, 0.30); },
  // The pre-bake-off trophy, kept ONLY so the gallery's was/is section can show
  // what changed. Nothing in the game references it; delete it with that
  // section once the new one is pinned.
  plugTrophyLegacy(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => {
      c.moveTo(w * 0.24, h * 0.08); c.lineTo(w * 0.76, h * 0.08);
      c.quadraticCurveTo(w * 0.72, h * 0.56, w * 0.5, h * 0.6);
      c.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.24, h * 0.08);
      c.closePath();
    });
    plain(ctx, '#c8a020', (c) => { rr(c, w * 0.42, h * 0.58, w * 0.16, h * 0.22, w * 0.03); rr(c, w * 0.26, h * 0.8, w * 0.48, h * 0.16, w * 0.05); });
  },

  // PLUG_ICONS[2], the TOASTER plug. HUD-only art, and deliberately NOT the
  // `appliance` world prop above — the same split as hudCoin/coin and the
  // health meter/battery, for the same reason.
  //
  // The world appliance cannot serve as this icon. It reserves the top fifth
  // of its box for the toast launch and bottom-anchors the body in what is
  // left, so in an 8x8 plug tile the toaster itself only ever got 8x6.4. Worse,
  // the plug row calls drawProp with no frame, so it always drew frame 0 — and
  // frame 0 is authored to start with the toast visibly raised, which meant the
  // icon was a squashed toaster with a slice sticking out of the top of it.
  // Dropping the toast returns that reserved fifth to the body, which is
  // exactly the weight it was missing next to the trophy.
  //
  // Front-on rather than the world prop's three-quarter view: at 8px the
  // receding side plane is one ambiguous pixel column, and spending it on the
  // body instead buys the slot enough width to actually read.
  plugToaster(ctx, w, h) {
    const u = Math.max(w, h);
    const g = ctx.createLinearGradient(w * 0.15, 0, w * 0.9, h);
    g.addColorStop(0, '#f7cf62');
    g.addColorStop(0.45, '#dfa523');
    g.addColorStop(1, '#8a5f0e');
    // Feet first, so the body's contour closes over the top of them.
    plain(ctx, '#5a3c08', (c) => {
      rr(c, w * 0.18, h * 0.8, w * 0.17, h * 0.15, w * 0.04);
      rr(c, w * 0.65, h * 0.8, w * 0.17, h * 0.15, w * 0.04);
    });
    // Body fills the box. This is a HUD icon, not something standing in a
    // lane, so there is no ground line to leave headroom for.
    fineShape(ctx, g, u, (c) => rr(c, w * 0.06, h * 0.14, w * 0.88, h * 0.72, w * 0.15),
      'rgba(58,36,4,0.55)', 0.03);
    // Chrome top lip, directly analogous to the trophy's rim band: one bright
    // horizontal hard against the top edge. This is what stopped the trophy
    // reading as a flat lid and it does the same job here — a gradient alone
    // has no EDGE in it, so the body stayed a plain lozenge no matter how much
    // tone was in the fill.
    plain(ctx, '#fff0b8', (c) => rr(c, w * 0.11, h * 0.163, w * 0.78, h * 0.055, h * 0.025));
    // The slot. One dark horizontal below the lip carries the entire toaster
    // read — without it this icon is a box with a knob.
    plain(ctx, 'rgba(46,28,4,0.85)', (c) => rr(c, w * 0.19, h * 0.245, w * 0.62, h * 0.105, w * 0.045));
    // Specular pair down the lit cheek: one broad streak and one thin one
    // beside it. Two marks rather than one because a single soft band reads as
    // a smudge, where a wide-then-narrow pair reads as a curved metal face
    // catching the light — the same trick as the trophy's bowl streak.
    plain(ctx, 'rgba(255,246,214,0.6)', (c) => rr(c, w * 0.145, h * 0.44, w * 0.085, h * 0.3, w * 0.04));
    plain(ctx, 'rgba(255,246,214,0.3)', (c) => rr(c, w * 0.255, h * 0.47, w * 0.042, h * 0.25, w * 0.02));
    // Shadowed lower tier, so the body has a lit half and a dark half instead
    // of one even ramp. The trophy gets this from its plinth being a separate
    // darker shape; a single-volume toaster has to be given it.
    plain(ctx, 'rgba(58,36,4,0.32)', (c) => rr(c, w * 0.1, h * 0.72, w * 0.8, h * 0.11, w * 0.04));
    // Lever breaks the right silhouette so the box has one asymmetric tell at
    // any size, and carries its own nick of highlight so it reads as the same
    // metal rather than a sticker.
    fineShape(ctx, '#e8ae2c', u, (c) => rr(c, w * 0.82, h * 0.44, w * 0.15, h * 0.22, w * 0.05),
      'rgba(58,36,4,0.55)', 0.028);
    plain(ctx, 'rgba(255,246,214,0.55)', (c) => rr(c, w * 0.845, h * 0.47, w * 0.05, h * 0.1, w * 0.02));
  },
  // SUPERSEDED by plugOrder, and kept only so the gallery's was/is row can show
  // what the MISSION slot used to be. Not referenced by PLUG_ICONS any more.
  // Delete it alongside that gallery section.
  //
  // It was never a legibility failure — it is still the cleanest small-size
  // drawing in the set, and the notes below on why it beat the red-lever switch
  // and the plug head all still hold. It lost on MEANING: a wall socket is the
  // reward, and drawing the reward inside the column headed PLUGS made the row
  // read as one plug plus two other prizes. See plugOrder.
  //
  // The old icon it replaced spent three colours on three unrelated ideas: a
  // pale blue housing occupying only the bottom two thirds of the box, a red
  // lever at 0.14w — one pixel at HUD size — and a yellow knob the same colour
  // as the trophy sitting next to it. Nothing in it was bigger than its smallest
  // feature, which is backwards for an icon that has to survive 5x5.
  //
  // A wall socket, front-on: two slots over a round earth pin is the most
  // recognizable three-mark arrangement available, and it is the one thing in
  // the set that still resolves as three separate marks at 5px. Cream plate
  // rather than white so it sits below the trophy's rim highlight in value,
  // and cool-cream against the trophy's steel and the toaster's gold gives the
  // row three distinct hues before shape has to do any work.
  plugSocket(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#e6e3da', u, (c) => rr(c, w * 0.09, h * 0.05, w * 0.82, h * 0.9, w * 0.2),
      'rgba(30,22,14,0.5)', 0.03);
    plain(ctx, '#282420', (c) => {
      rr(c, w * 0.28, h * 0.2, w * 0.13, h * 0.32, w * 0.055);
      rr(c, w * 0.59, h * 0.2, w * 0.13, h * 0.32, w * 0.055);
    });
    plain(ctx, '#282420', (c) => c.arc(w * 0.5, h * 0.69, u * 0.115, 0, Math.PI * 2));
  },
  // PARKED, NOT DEAD. The runner-up for the MISSION slot: the mains plug
  // itself, prongs up, cord out of the bottom — the object the whole mechanic
  // is named after, and the only candidate that put a cool teal in the row.
  // plugSocket won on small-size legibility (three separate marks still resolve
  // at 5px, where these prongs merge), but this is kept whole and drawn in the
  // gallery so the choice can be revisited without redrawing it. Swap
  // PLUG_ICONS[0] to 'plugHead' and it ships as-is.
  plugHead(ctx, w, h) {
    const u = Math.max(w, h);
    // Prongs first so the body caps them cleanly.
    plain(ctx, '#cdd0dc', (c) => {
      rr(c, w * 0.28, h * 0.04, w * 0.13, h * 0.32, w * 0.045);
      rr(c, w * 0.59, h * 0.04, w * 0.13, h * 0.32, w * 0.045);
    });
    fineShape(ctx, '#48c8b0', u, (c) => rr(c, w * 0.14, h * 0.3, w * 0.72, h * 0.46, w * 0.15),
      'rgba(12,40,36,0.5)', 0.03);
    plain(ctx, 'rgba(230,255,248,0.5)', (c) => rr(c, w * 0.22, h * 0.37, w * 0.14, h * 0.26, w * 0.06));
    // Cord stub out of the bottom, which is what stops the body reading as a
    // plain lozenge once the prongs blur together.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f3a52';
    ctx.lineWidth = Math.max(0.4, u * 0.11);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.74);
    ctx.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.72, h * 0.93);
    ctx.stroke();
    ctx.restore();
  },

  // ---- MISSION-slot bake-off — A (plugOrder) WON, and ships ------------------
  // Why the socket was replaced at all: it draws the reward. The column is
  // headed PLUGS and the three icons say how each plug was earned, but slot 0
  // being a wall socket made the row read as one plug plus two other prizes
  // instead of three plugs earned three ways. The winner had to be the
  // ASSIGNMENT, not the payout.
  //
  // It also has to be generic. The mission is `reach` in only ten of the 27
  // stages — the rest are targets, cords, chase, rescue, onbeat, fuse, escape
  // and blackout — so a breaker switch depicts one mission in three. The trophy
  // beside it gets this right already: it stands for CHALLENGE, not for
  // coins-or-no-damage.
  //
  // All three candidates keep a cream or teal read so the row still separates by
  // hue before shape has to do any work, and none of them is thinner anywhere
  // than the socket's slots were — the 5px column in the Trophy Room records is
  // the gate, same as last time.

  // Candidate A, and the one that SHIPS as PLUG_ICONS[0]. Closest to the game's
  // own fiction — you clock in for a SHIFT and the briefing hands you the job —
  // and nobody looks at a clipboard and thinks they are collecting clipboards.
  //
  // Built on the same three-tier arrangement the socket won on: a mark at the
  // top, then two below it, with the tiers spaced like the socket's
  // slots-over-earth-pin rather than evenly. Cream board holds slot 0's existing
  // place in the row's hue plan, and the clip spends the cool teal the plug head
  // was liked for on the one feature that breaks the silhouette.
  plugOrder(ctx, w, h) {
    const u = Math.max(w, h);
    // Board inset at the top so the clip can sit proud of it.
    fineShape(ctx, '#e6e3da', u, (c) => rr(c, w * 0.095, h * 0.14, w * 0.81, h * 0.82, w * 0.17),
      'rgba(30,22,14,0.5)', 0.03);
    // Two ruled lines, not three. The board is barely five pixels tall in the
    // records row and a third line closes both gaps; the second runs short so
    // the pair reads as writing rather than as a grille.
    //
    // Thin and mid-tone rather than thick and near-black, which is the whole
    // difference between this reading as a board and reading as a device with a
    // screen in it. At 5px the two lines merge whatever they weigh — so they are
    // authored to merge into a soft grey TEXTURE on a still-cream board, not
    // into a black bar that takes over the tile. Same balance the socket keeps:
    // its three marks are small against a dominant plate. Below 8px the identity
    // is carried by hue and by the clip, which is what the row is designed for.
    plain(ctx, '#4a453e', (c) => {
      rr(c, w * 0.25, h * 0.42, w * 0.5, h * 0.105, w * 0.05);
      rr(c, w * 0.25, h * 0.63, w * 0.33, h * 0.105, w * 0.05);
    });
    // The clip, and the only thing crossing the top edge. This is the
    // asymmetric tell that keeps the icon off being a plain cream tile once the
    // ruled lines blur together — the same job the toaster's lever does on its
    // right-hand side.
    fineShape(ctx, '#48c8b0', u, (c) => rr(c, w * 0.28, h * 0.02, w * 0.44, h * 0.21, w * 0.07),
      'rgba(12,40,36,0.5)', 0.03);
    plain(ctx, 'rgba(230,255,248,0.5)', (c) => rr(c, w * 0.33, h * 0.06, w * 0.13, h * 0.09, w * 0.04));
  },

  // Candidate B: the finish flag. The most universal "this was the objective"
  // mark available, and the only candidate with an asymmetric silhouette — mass
  // in the top corner, pole below — which is a different kind of shape from the
  // trophy's centred cup and the toaster's filled box.
  //
  // Four cloth cells, never more: a 3x3 chequer at 5px is three pixels of
  // dither and reads as grey noise, where 2x2 keeps every cell a pixel and a
  // half on a side. Risk to judge in the 5px column is the opposite of the plug
  // head's — not marks merging, but the bottom third being bare pole, which is
  // the flaw the old switch icon had upside down.
  plugFlag(ctx, w, h) {
    const u = Math.max(w, h);
    // Pole full height, so the cloth has a hard vertical to hang off. A flag
    // without one is a rectangle.
    fineShape(ctx, '#48c8b0', u, (c) => rr(c, w * 0.12, h * 0.04, w * 0.15, h * 0.92, w * 0.055),
      'rgba(12,40,36,0.5)', 0.028);
    const cw = w * 0.33, ch = h * 0.3, cx = w * 0.25, cy = h * 0.1;
    fineShape(ctx, '#e6e3da', u, (c) => rr(c, cx, cy, cw * 2, ch * 2, w * 0.045),
      'rgba(30,22,14,0.5)', 0.03);
    // Dark cells on the diagonal. Drawn as plain rects inside the cream body so
    // the chequer never grows a contour of its own at size.
    plain(ctx, '#2b2a30', (c) => {
      c.rect(cx, cy, cw, ch);
      c.rect(cx + cw, cy + ch, cw, ch);
    });
    plain(ctx, 'rgba(230,255,248,0.45)', (c) => rr(c, w * 0.145, h * 0.12, w * 0.055, h * 0.3, w * 0.03));
  },

  // Candidate C: the objective marker. The safest of the three at 5px by
  // construction — concentric rings have no thin gaps to lose, so nothing here
  // is narrower than an eighth of the box and the icon cannot degrade into
  // fewer marks than it started with.
  //
  // The cost is flavour: it says "objective" in the abstract where the work
  // order says it in MASHENSTEIN's own voice. Also the only round silhouette in
  // the row, which cuts both ways — distinct from the toaster's box, but worth
  // checking against the trophy's bowl at 5px, and against hudCoin, which is a
  // gold disc. The teal is what keeps it off reading as currency.
  plugTarget(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#48c8b0', u, (c) => c.arc(w * 0.5, h * 0.5, u * 0.45, 0, Math.PI * 2),
      'rgba(12,40,36,0.5)', 0.03);
    plain(ctx, '#e6e3da', (c) => c.arc(w * 0.5, h * 0.5, u * 0.29, 0, Math.PI * 2));
    plain(ctx, '#2b2a30', (c) => c.arc(w * 0.5, h * 0.5, u * 0.13, 0, Math.PI * 2));
    // Upper-left specular, the same light direction as the trophy and the
    // toaster, so the disc reads as a domed object rather than a printed roundel.
    plain(ctx, 'rgba(230,255,248,0.4)', (c) => c.arc(w * 0.29, h * 0.25, u * 0.075, 0, Math.PI * 2));
  },

  // ==================================================================
  // BAKE-OFF CANDIDATES — GALLERY ONLY. Nothing in src/ draws these yet.
  // Each one is a complete prop painter with real cached frames, so what
  // the gallery animates is exactly what would ship the moment a name is
  // swapped into an entity def (the ramps) or into drawPortal(). Delete a
  // losing candidate together with its gallery section.
  //
  // Every painter here is FLAT-FILL ONLY — no canvas gradients. The frame
  // test in tests/props.js traces animated painters through a recording
  // proxy, and a proxy has no gradient object to add stops to.
  // ==================================================================

  // --- SPEED RAMP ---------------------------------------------------
  // The shipped boostPad is a 14x4 decal: a yellow lozenge with three
  // static chevrons. At lane speed it is a smear on the floor, it never
  // announces itself on approach, and because nothing about it moves it
  // never confirms that it fired. Each candidate keeps that 14x4 hitbox
  // exactly and buys presence on the one axis a floor pad has spare —
  // HEIGHT, via PROP_TALL's bottom-anchored overdraw — plus motion.

  // A — SHIPS as boostPad. The pad, done properly, and nothing above it: the
  // whole thing is the pad, and the whole animation happens inside it.
  //
  // Black and gold, borrowed from the gate candidate's marquee. Gold-on-gold
  // was the first pass's weakness — an orange chevron on a yellow deck is a
  // two-step of the same hue, so at lane speed the pad collapsed into one warm
  // smear and the chase inside it was invisible. Gold on near-black is the
  // widest value gap the palette has, so the chevrons stay separate marks all
  // the way down to the 5px they occupy on screen.
  //
  // The earlier version threw fading darts up off the leading edge. They read
  // well but they were art OUTSIDE the pad, above the floor line, on a prop
  // that cannot hurt you and does not want that much attention.
  // It is a TRENCH, not a slab. The pad sat proud of the floor casting a
  // shadow, which put a 9px kerb in a lane the hero runs flat along; sunk in,
  // it stops being an obstacle-shaped thing that happens not to be one. The
  // recess is drawn rather than cut — a prop painter cannot carve the ground —
  // so everything here is doing the job an actual hole would: a dark well, a
  // lit rim on the FAR side only (light comes from above and in front, so a
  // real trench catches it on its back wall), no bottom contour and no cast
  // shadow. A drop shadow is the one mark that would give it away as sitting
  // on top, which is why the pad no longer has one.
  rampChevron(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    // Sunk further than the first trench pass. The mouth starts a third of the
    // way down the cell and the well runs off the BOTTOM of the raster, so the
    // ground itself is what ends the drawing — the art carries no bottom edge
    // of its own to give away that it is a decal sat on the floor.
    const top = h * 0.46, band = h * 0.9;
    // The floor's own lip, above the recess: a thin dark line the ground
    // appears to break along.
    plain(ctx, 'rgba(10,8,18,0.45)', (c) => rr(c, 0, top - h * 0.11, w, h * 0.14, h * 0.04));
    // Corners stay nearly square. A rounded box is an OBJECT sitting on the
    // floor; a cut in the floor has crisp ends, and that one difference did
    // more for the recess than any amount of shading.
    fineShape(ctx, '#171c2b', u, (c) => rr(c, 0, top, w, band, h * 0.07), 'rgba(6,6,14,0.65)', 0.018);
    // Far wall catching the light, and a gold rail sat on it. One rail, not
    // two: two boxed the chevrons in and the pad read as a crate lid.
    plain(ctx, 'rgba(120,132,164,0.35)', (c) => rr(c, w * 0.015, top + h * 0.02, w * 0.97, h * 0.09, h * 0.03));
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.03, top + h * 0.075, w * 0.94, h * 0.04, h * 0.02));
    // Chevrons. Every sloped edge is EXACTLY 45 degrees: the arm's horizontal
    // run is half the chevron's height, and the inner edge is the outer edge
    // translated straight back along x, which preserves both slopes exactly.
    // The painter box and the world draw box share an aspect ratio, so 45 in
    // here is still 45 on screen. Chunk comes from the thickness `t`, not from
    // steepening the arms — a fatter dart was the old failure.
    // The band ends exactly at the ground line, and the chevron is exactly as
    // tall as the band — so the POINT lands dead centre of what you can see.
    // Running the band off the bottom of the cell looked more like a trench but
    // pushed every point down into the last quarter of the visible mark, which
    // is the one thing a chevron cannot survive.
    const dx = w * 0.03, dy = top + h * 0.16, dw = w * 0.94, dh = h - dy;
    const run = dh * 0.5, t = dh * 0.5, step = w * 0.23;
    ctx.save();
    ctx.beginPath();
    rr(ctx, dx, dy, dw, dh, h * 0.05);
    ctx.clip();
    for (let i = -1; i < 5; i++) {
      const cx = dx + (i + p) * step;
      plain(ctx, '#f6d33c', (c) => {
        c.moveTo(cx - run, dy);
        c.lineTo(cx, dy + run);
        c.lineTo(cx - run, dy + dh);
        c.lineTo(cx - run - t, dy + dh);
        c.lineTo(cx - t, dy + run);
        c.lineTo(cx - run - t, dy);
        c.closePath();
      });
    }
    ctx.restore();
    // The leading lip flashes on the half-cycle the chevrons arrive at it, so
    // the pad has a beat as well as a direction.
    plain(ctx, p < 0.5 ? '#fff6d0' : 'rgba(255,246,208,0.35)',
      (c) => rr(c, w * 0.9, dy + dh * 0.06, w * 0.045, dh * 0.88, h * 0.04));
  },

  // The pad as it shipped before the bake-off, kept drawable so the WAS tile
  // in that section stays an honest comparison rather than showing the new art
  // twice. Delete it with the section.
  boostPadLegacy(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => rr(c, 0, h * 0.1, w, h * 0.8, h * 0.35));
    plain(ctx, '#e07820', (c) => {
      for (let i = 0; i < 3; i++) {
        const x = w * (0.16 + i * 0.26);
        c.moveTo(x, h * 0.24); c.lineTo(x + w * 0.16, h * 0.5); c.lineTo(x, h * 0.76); c.closePath();
      }
    });
  },

  // B: stop drawing a decal and draw a RAMP. The silhouette itself says
  // "up and forward" before any colour does, which is the one thing a flat
  // pad can never do — and it is the only candidate whose shape survives
  // being seen for a sixth of a second.
  rampWedge(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    const lip = h * 0.26;
    const deck = (c) => {
      c.moveTo(w * 0.02, h * 0.96);
      c.lineTo(w * 0.14, h * 0.72);
      c.quadraticCurveTo(w * 0.55, lip + h * 0.02, w * 0.88, lip);
      c.lineTo(w * 0.96, lip + h * 0.12);
      c.lineTo(w * 0.96, h * 0.96);
      c.closePath();
    };
    plain(ctx, 'rgba(16,10,28,0.28)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.04, 0, 0, Math.PI * 2));
    fineShape(ctx, '#f6d33c', u, deck, 'rgba(44,28,8,0.5)', 0.02);
    ctx.save();
    ctx.beginPath();
    deck(ctx);
    ctx.clip();
    // Shaded body along the FLOOR, not under the deck surface. The first pass
    // shaded everything below the top curve, which left a hairline of gold
    // around a solid orange lump — the wedge lost the one thing it was drawn
    // for, which is a lit surface climbing away from a dark base.
    plain(ctx, '#c08420', (c) => {
      c.moveTo(0, h);
      c.lineTo(0, h * 0.86);
      c.quadraticCurveTo(w * 0.55, h * 0.62, w, h * 0.5);
      c.lineTo(w, h);
      c.closePath();
    });
    // Chevrons climbing the deck, sheared to lie along the slope rather than
    // standing upright on a ramp that is not flat.
    for (let i = -1; i < 5; i++) {
      const q = (i + p) / 4;
      const tx = w * (0.04 + q * 0.9);
      const ty = h * 0.9 - q * (h * 0.9 - lip) + h * 0.12;
      plain(ctx, '#e07820', (c) => {
        c.moveTo(tx, ty - h * 0.16);
        c.lineTo(tx + w * 0.1, ty - h * 0.05);
        c.lineTo(tx, ty + h * 0.06);
        c.lineTo(tx - w * 0.05, ty + h * 0.06);
        c.lineTo(tx + w * 0.05, ty - h * 0.05);
        c.lineTo(tx - w * 0.05, ty - h * 0.16);
        c.closePath();
      });
    }
    ctx.restore();
    plain(ctx, '#fff6d0', (c) => rr(c, w * 0.78, lip - h * 0.04, w * 0.19, h * 0.09, h * 0.04));
    for (let i = 0; i < 3; i++) {
      const q = (p + i / 3) % 1;
      plain(ctx, `rgba(255,232,140,${(0.95 - q * 0.72).toFixed(2)})`,
        (c) => rr(c, w * (0.62 + q * 0.36), lip - h * (0.06 + q * 0.24),
          w * (0.14 + 0.12 * (1 - q)), h * 0.05, h * 0.025));
    }
  },

  // C: a floor vent with a turbine under it. The only candidate that is a
  // MACHINE rather than a marking — it is doing something whether or not
  // anyone is standing on it, and the plume gives it a silhouette above the
  // floor that survives being scrolled past.
  rampTurbine(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const a = (frame % 8) * (Math.PI / 8);
    const p = (frame % 8) / 8;
    const top = h * 0.6;
    const cx = w * 0.5, cy = top + h * 0.19;
    const r = Math.min(w * 0.26, h * 0.16); // the window the fan lives inside
    plain(ctx, 'rgba(16,10,28,0.28)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.045, 0, 0, Math.PI * 2));
    // Plume first: it belongs behind the housing it is coming out of. Tapered
    // and warm-bright at the mouth — the first pass drew flat discs at 25%
    // alpha, which over a dark lane is smoke, not thrust.
    for (let i = 0; i < 3; i++) {
      const q = (p + i / 3) % 1;
      plain(ctx, `rgba(190,255,244,${(0.8 - q * 0.66).toFixed(2)})`,
        (c) => rr(c, cx - w * (0.1 + q * 0.2), top - q * h * 0.55 - h * 0.04,
          w * (0.2 + q * 0.4), h * 0.07, h * 0.035));
    }
    fineShape(ctx, '#2b2a30', u, (c) => rr(c, 0, top, w, h * 0.37, h * 0.07), 'rgba(10,8,18,0.55)', 0.022);
    plain(ctx, '#141420', (c) => c.arc(cx, cy, r * 1.16, 0, Math.PI * 2));
    // The fan is CLIPPED to its window. Unclipped, four blades on a 4px-tall
    // pad throw a pinwheel out the top of the housing and the thing stops
    // reading as a vent at all.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      plain(ctx, '#48c8b0', (c) => c.ellipse(r * 0.52, 0, r * 0.5, r * 0.24, 0.45, 0, Math.PI * 2));
    }
    ctx.restore();
    plain(ctx, '#e6e3da', (c) => c.arc(cx, cy, r * 0.2, 0, Math.PI * 2));
    // Two slats across the window, so it reads as a vent you are looking INTO
    // rather than a propeller bolted to the floor.
    plain(ctx, 'rgba(20,18,30,0.7)', (c) => {
      c.rect(cx - r * 1.2, cy - r * 0.5, r * 2.4, r * 0.16);
      c.rect(cx - r * 1.2, cy + r * 0.34, r * 2.4, r * 0.16);
    });
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.03, top + h * 0.32, w * 0.94, h * 0.05, h * 0.025));
    for (let i = 0; i < 2; i++) {
      const q = (p + i / 2) % 1;
      plain(ctx, `rgba(255,255,255,${(0.85 - q * 0.7).toFixed(2)})`,
        (c) => c.arc(w * (0.26 + i * 0.48), top - q * h * 0.5, w * 0.05, 0, Math.PI * 2));
    }
  },

  // D: the loudest option — a gate you run THROUGH. Its art is as tall as
  // the hero, so it is legible from the far edge of the screen and the
  // player can commit to the lane early. The cost is that a 24px structure
  // over a 4px hitbox is the biggest art-to-box lie in the game; it is only
  // defensible because a boost pad cannot hurt you.
  rampGate(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    const chev = (c, cx, y0, y1) => {
      const m = (y0 + y1) / 2;
      c.moveTo(cx, y0);
      c.lineTo(cx + w * 0.1, m);
      c.lineTo(cx, y1);
      c.lineTo(cx - w * 0.05, y1);
      c.lineTo(cx + w * 0.05, m);
      c.lineTo(cx - w * 0.05, y0);
      c.closePath();
    };
    plain(ctx, 'rgba(16,10,28,0.28)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.03, 0, 0, Math.PI * 2));
    fineShape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.06, h * 0.9, w * 0.88, h * 0.075, h * 0.035),
      'rgba(44,28,8,0.5)', 0.016);
    ctx.save();
    ctx.beginPath();
    rr(ctx, w * 0.06, h * 0.9, w * 0.88, h * 0.075, h * 0.035);
    ctx.clip();
    for (let i = -1; i < 4; i++) plain(ctx, '#e07820', (c) => chev(c, w * (0.06 + (i + p) * 0.3), h * 0.9, h * 0.975));
    ctx.restore();
    for (const px of [w * 0.04, w * 0.82]) {
      fineShape(ctx, '#2b2a30', u, (c) => rr(c, px, h * 0.24, w * 0.14, h * 0.68, w * 0.05),
        'rgba(10,8,18,0.55)', 0.016);
      plain(ctx, '#48c8b0', (c) => rr(c, px + w * 0.03, h * 0.27, w * 0.08, h * 0.6, w * 0.035));
    }
    fineShape(ctx, '#1f2436', u, (c) => rr(c, 0, h * 0.05, w, h * 0.2, h * 0.045), 'rgba(8,8,16,0.55)', 0.016);
    ctx.save();
    ctx.beginPath();
    rr(ctx, w * 0.04, h * 0.08, w * 0.92, h * 0.14, h * 0.03);
    ctx.clip();
    for (let i = -1; i < 4; i++) plain(ctx, '#f6d33c', (c) => chev(c, w * (0.04 + (i + p) * 0.3), h * 0.08, h * 0.22));
    ctx.restore();
    // Chasing bulbs: one lit, advancing. A marquee is the arcade's own way
    // of saying "this way", which is the fiction the whole game sits in.
    for (let i = 0; i < 5; i++) {
      const lit = i === Math.floor(p * 8) % 5;
      plain(ctx, lit ? '#fff6d0' : 'rgba(246,211,60,0.35)',
        (c) => c.arc(w * (0.12 + i * 0.19), h * 0.27, w * (lit ? 0.055 : 0.04), 0, Math.PI * 2));
    }
  },

  // --- OBJECTIVE FLAG -----------------------------------------------
  // The existing plugFlag is a 2x2 chequer on a pole, authored for the 5px
  // MISSION slot and static. These four are the same idea drawn to be seen:
  // every one of them ripples, and every one is authored SQUARE so it still
  // works as a plug-row icon if it ends up back there instead of, or as
  // well as, standing in the world.

  // A: the classic, waving. Chequer cloth on a teal pole with a gold
  // finial, the sheet twisting on a travelling wave rather than sliding.
  flagWave(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = ((frame % 8) / 8) * Math.PI * 2;
    flagPole(ctx, w, h, u);
    fineShape(ctx, '#f6d33c', u, (c) => c.arc(w * 0.16, h * 0.075, w * 0.09, 0, Math.PI * 2),
      'rgba(50,34,6,0.5)', 0.026);
    chequerCloth(ctx, u, w * 0.2, h * 0.12, w * 0.97, h * 0.62, h * 0.055, ph, frame % 8);
  },

  // B: not a race flag at all — a pennant with the game's own lightning
  // bolt on it. The most asymmetric silhouette of the four and the only one
  // that reads as ENERGY rather than as a finish line, which matters when
  // the thing being marked is a plug socket.
  flagPennant(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = ((frame % 8) / 8) * Math.PI * 2;
    const x0 = w * 0.2, x1 = w * 0.99, y0 = h * 0.1, y1 = h * 0.6;
    const amp = h * 0.06;
    flagPole(ctx, w, h, u);
    const pennant = (c) => {
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 + (x1 - x0) * 0.5, y0 + Math.sin(ph) * amp * 1.6,
        x1, (y0 + y1) / 2 + Math.sin(ph + 1.2) * amp * 2);
      c.quadraticCurveTo(x0 + (x1 - x0) * 0.5, y1 + Math.sin(ph + 0.6) * amp * 1.6, x0, y1);
      c.closePath();
    };
    fineShape(ctx, '#48c8b0', u, pennant, 'rgba(10,34,30,0.55)', 0.028);
    ctx.save();
    ctx.beginPath();
    pennant(ctx);
    ctx.clip();
    // The bolt shears with the snap instead of sitting flat on a moving
    // sheet — a printed mark that ignores the cloth is what makes a waving
    // flag read as a sticker.
    const k = Math.sin(ph + 0.4) * 0.14;
    ctx.save();
    ctx.transform(1, 0, k, 1, -k * (y0 + y1) / 2, 0);
    plain(ctx, '#e6e3da', (c) => {
      const bx = x0 + (x1 - x0) * 0.24, by = y0 + (y1 - y0) * 0.14;
      const bw = (x1 - x0) * 0.34, bh = (y1 - y0) * 0.72;
      c.moveTo(bx + bw * 0.62, by);
      c.lineTo(bx, by + bh * 0.56);
      c.lineTo(bx + bw * 0.44, by + bh * 0.56);
      c.lineTo(bx + bw * 0.3, by + bh);
      c.lineTo(bx + bw, by + bh * 0.38);
      c.lineTo(bx + bw * 0.5, by + bh * 0.38);
      c.closePath();
    });
    ctx.restore();
    plain(ctx, 'rgba(230,255,248,0.4)', (c) => c.rect(x0, y0, (x1 - x0) * 0.07, y1 - y0));
    ctx.restore();
  },

  // C: flag plus a rotating beacon. The lamp sweeps a full turn over the
  // eight frames, so this is the only candidate with motion that does not
  // depend on the cloth — it still animates at 5px, where a ripple has
  // nowhere to happen.
  flagBeacon(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const f = frame % 8;
    const beam = (f / 8) * Math.PI * 2;
    // Two cones, not one: a short bright throw inside a longer soft one. A
    // single low-alpha wedge a whole box long went olive over the lane and
    // read as a stain rather than as light.
    plain(ctx, 'rgba(255,214,90,0.16)', (c) => {
      c.moveTo(w * 0.16, h * 0.13);
      c.arc(w * 0.16, h * 0.13, w * 0.72, beam - 0.3, beam + 0.3);
      c.closePath();
    });
    plain(ctx, 'rgba(255,238,170,0.34)', (c) => {
      c.moveTo(w * 0.16, h * 0.13);
      c.arc(w * 0.16, h * 0.13, w * 0.36, beam - 0.24, beam + 0.24);
      c.closePath();
    });
    flagPole(ctx, w, h, u);
    chequerCloth(ctx, u, w * 0.2, h * 0.34, w * 0.96, h * 0.74, h * 0.045, (f / 8) * Math.PI * 2, f);
    plain(ctx, '#2b2a30', (c) => rr(c, w * 0.05, h * 0.13, w * 0.22, h * 0.07, w * 0.025));
    fineShape(ctx, Math.cos(beam) > 0.35 ? '#fff6d0' : '#f6d33c', u,
      (c) => c.arc(w * 0.16, h * 0.14, w * 0.11, Math.PI, 0), 'rgba(50,34,6,0.5)', 0.026);
  },

  // D: the literal reading of the name. Cream cloth carrying the plug the
  // whole mechanic is named after — the only candidate that says WHICH
  // objective, not just that there is one. Judge whether the prongs survive
  // the ripple, since that is where it can fall apart.
  flagPlug(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = ((frame % 8) / 8) * Math.PI * 2;
    const x0 = w * 0.2, x1 = w * 0.97, y0 = h * 0.12, y1 = h * 0.62;
    const amp = h * 0.055;
    flagPole(ctx, w, h, u);
    fineShape(ctx, '#f6d33c', u, (c) => c.arc(w * 0.16, h * 0.075, w * 0.09, 0, Math.PI * 2),
      'rgba(50,34,6,0.5)', 0.026);
    const cloth = (c) => clothPath(c, x0, y0, x1, y1, amp, ph);
    fineShape(ctx, '#e6e3da', u, cloth, 'rgba(30,22,14,0.5)', 0.028);
    ctx.save();
    ctx.beginPath();
    cloth(ctx);
    ctx.clip();
    const cx = x0 + (x1 - x0) * 0.52;
    const cy = (y0 + y1) / 2 + clothWave(0.52, ph, amp);
    const s = (y1 - y0) * 0.62;
    // Prongs proud of the body, body clearly narrower than it is wide, cord
    // thin. Every one of those is what keeps this off reading as one dark
    // blob once the sheet is moving and the whole mark is 4px across.
    plain(ctx, '#2f8f84', (c) => {
      c.rect(cx - s * 0.3, cy - s * 0.54, s * 0.16, s * 0.44);
      c.rect(cx + s * 0.14, cy - s * 0.54, s * 0.16, s * 0.44);
    });
    plain(ctx, '#2b2a30', (c) => rr(c, cx - s * 0.46, cy - s * 0.14, s * 0.92, s * 0.5, s * 0.14));
    stroke(ctx, '#2b2a30', Math.max(0.18, u * 0.032), (c) => {
      c.moveTo(cx + s * 0.1, cy + s * 0.36);
      c.quadraticCurveTo(cx + s * 0.56, cy + s * 0.46, cx + s * 0.6, cy + s * 0.04);
    });
    plain(ctx, 'rgba(24,16,34,0.14)', (c) => {
      const bu = (0.1 + ((frame % 8) / 8) * 0.9) % 1;
      c.rect(x0 + (x1 - x0) * bu - (x1 - x0) * 0.08, y0 - amp * 2, (x1 - x0) * 0.16, (y1 - y0) + amp * 4);
    });
    ctx.restore();
    ctx.beginPath();
    cloth(ctx);
    ctx.strokeStyle = 'rgba(30,22,14,0.5)';
    ctx.lineWidth = Math.max(0.2, u * 0.028);
    ctx.stroke();
  },

  // --- RELAY PORTAL -------------------------------------------------
  // The shipped portal is three ellipses: a translucent teal blob, a ring,
  // and a highlight arc, pulsed 2px by drawPortal(). It is the hinge of the
  // whole run — you change hero through it — and it currently looks like a
  // decal. All four candidates are drawn into the same 12x40-ish column so
  // the pass-through box stays where the player has learned it is; what
  // changes is entirely what happens INSIDE that column.

  // A: a built object. Posts, a dome and a thickness, with the energy as a
  // membrane climbing the opening. Reads as ARCHITECTURE — something the
  // arcade installed — which is the most legible thing to run at.
  portalArch(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 12) / 12;
    // Opening widened to 60% of the column and the crown flattened. The first
    // pass was a 52%-wide semicircular arch with a gold cap on top, which from
    // any distance was a bottle, not a doorway.
    const ix0 = w * 0.2, ix1 = w * 0.8, itop = h * 0.16, ibot = h * 0.98;
    plain(ctx, 'rgba(72,224,200,0.24)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.52, h * 0.026, 0, 0, Math.PI * 2));
    fineShape(ctx, '#48c8b0', u, (c) => archPath(c, w * 0.03, w * 0.97, h * 0.04, h * 0.99),
      'rgba(10,34,30,0.55)', 0.012);
    plain(ctx, '#2f8f84', (c) => archPath(c, w * 0.12, w * 0.88, h * 0.1, h * 0.99));
    ctx.save();
    ctx.beginPath();
    archPath(ctx, ix0, ix1, itop, ibot);
    ctx.clip();
    plain(ctx, '#0d3336', (c) => c.rect(0, 0, w, h));
    for (let i = 0; i < 6; i++) {
      const q = ((i / 6) + p) % 1;
      const s = Math.sin(q * Math.PI);
      plain(ctx, `rgba(196,255,244,${(0.28 + 0.6 * s).toFixed(2)})`,
        (c) => c.ellipse(w * 0.5, ibot - q * (ibot - itop), w * 0.3 * (0.55 + 0.45 * s), h * 0.02, 0, 0, Math.PI * 2));
    }
    plain(ctx, 'rgba(210,255,246,0.32)', (c) => rr(c, w * 0.43, itop, w * 0.14, ibot - itop, w * 0.07));
    ctx.restore();
    ctx.beginPath();
    archPath(ctx, ix0, ix1, itop, ibot);
    ctx.strokeStyle = 'rgba(8,26,26,0.5)';
    ctx.lineWidth = Math.max(0.2, u * 0.012);
    ctx.stroke();
    plain(ctx, 'rgba(230,255,248,0.45)', (c) => rr(c, w * 0.06, h * 0.4, w * 0.05, h * 0.42, w * 0.025));
    // Gold sill rather than a gold crown: it reads as a threshold you step
    // over, and it is the mark that anchors the whole thing to the floor.
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.06, h * 0.93, w * 0.88, h * 0.055, h * 0.022));
    plain(ctx, 'rgba(10,34,30,0.4)', (c) => {
      for (const [rx, ry] of [[0.105, 0.24], [0.895, 0.24], [0.105, 0.88], [0.895, 0.88]]) {
        c.moveTo(w * rx + w * 0.035, h * ry);
        c.arc(w * rx, h * ry, w * 0.035, 0, Math.PI * 2);
      }
    });
  },

  // B: no object at all — a tear. White-hot core, teal bleed, a magenta
  // fringe down one edge, and a jagged outline that re-cuts itself every
  // frame. The most "this should not be here" of the four, and the only one
  // whose edges never settle.
  portalRift(ctx, w, h, frame = 0) {
    const f = frame % 12;
    // Eleven samples a side, joined by curves rather than straight segments.
    // The first pass used seven and lineTo, which is fine at the 14px the lane
    // draws — and reads as a stack of faceted slabs the moment anything draws
    // it bigger, which the credits hand-off does. Facet length scales with the
    // draw size; a curve does not.
    const N = 11;
    const jag = (i, seed) => Math.sin((i * 2.7 + f * 1.31 + seed) * 1.7) * w * 0.055;
    const rift = (grow, off = 0) => (c) => {
      const pts = [];
      for (let side = -1; side <= 1; side += 2) {
        for (let n = 0; n <= N; n++) {
          const i = side < 0 ? n : N - n;
          const t01 = i / N;
          const taper = Math.sin(t01 * Math.PI);
          // Both the width and the jitter fade out at the ends, so the cut
          // closes to a point instead of a blunt stub.
          const half = (w * 0.145 * Math.pow(taper, 0.75) + w * 0.012) * grow;
          const x = w * 0.5 + off + side * half + jag(i, side * 3) * taper;
          const y = h * (0.03 + t01 * 0.94);
          // The two tips are entered twice: a repeated control point pulls the
          // smoothing onto it, so the ends stay sharp while everything between
          // them rounds off.
          if (i === 0 || i === N) pts.push([x, y]);
          pts.push([x, y]);
        }
      }
      smoothClosedPath(c, pts);
    };
    // A dark halo under everything, and a dark core surround inside the teal.
    // Neither shows on the packs the rift was drawn against — over crypt or
    // neon they are invisible — and both are what saves it on the light ones.
    // The read test put this over all nine cabinets and the white core simply
    // disappeared into the doodle sheet and the frost sky: a light-on-light
    // shape with no dark anywhere in it has nothing to be seen against, and
    // this is the one prop in the game the player has to aim at.
    plain(ctx, 'rgba(16,10,28,0.3)', rift(2.7));
    plain(ctx, 'rgba(72,224,200,0.16)', rift(2.3));
    // Chromatic fringe: the same cut, offset a twentieth of the column, so
    // the edge separates into colour the way a bad signal does.
    plain(ctx, 'rgba(232,116,214,0.3)', rift(1.3, -w * 0.05));
    plain(ctx, 'rgba(72,224,200,0.62)', rift(1.25));
    plain(ctx, 'rgba(10,52,54,0.85)', rift(0.78));
    plain(ctx, '#eafff8', rift(0.46));
    for (let i = 0; i < 3; i++) {
      const q = ((f / 12) + i / 3) % 1;
      plain(ctx, `rgba(234,255,248,${(0.75 * (1 - q)).toFixed(2)})`,
        (c) => c.arc(w * (0.5 + (i - 1) * 0.22 * q), h * (0.9 - q * 0.8), w * 0.05, 0, Math.PI * 2));
    }
  },

  // C: a column of spinning rings. Each ring is one horizontal ellipse
  // whose width tracks its own phase, so the stack reads as one surface
  // rotating rather than as nine separate hoops. No frame, no housing —
  // pure effect, and the cheapest of the four to read at true size.
  portalRings(ctx, w, h, frame = 0) { portalRingsArt(ctx, w, h, frame); },

  // The two AFTERMATH strips of the shipped portal. Both are the same drawing
  // as portalRings with a state argument — see portalRingsArt for what each
  // state does and why they exist as separate cached painters rather than as
  // extra frames on the live cycle.
  portalRingsSpent(ctx, w, h, frame = 0) {
    portalRingsArt(ctx, w, h, 0, { spend: frame / (PORTAL_SPEND_FRAMES - 1) });
  },
  portalRingsWilt(ctx, w, h, frame = 0) {
    portalRingsArt(ctx, w, h, 0, { wilt: frame / (PORTAL_WILT_FRAMES - 1) });
  },

  // D: the fiction, taken literally. MASHENSTEIN is an arcade and the
  // mechanic is called plugging in — so the way through is a screen on a
  // plinth with a cable running out of it. Vortex, scanlines, a live LED.
  // The only candidate that could not belong to any other game.
  portalTube(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 12) / 12;
    plain(ctx, 'rgba(16,10,28,0.3)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.022, 0, 0, Math.PI * 2));
    stroke(ctx, '#48c8b0', Math.max(0.35, w * 0.085), (c) => {
      c.moveTo(w * 0.24, h * 0.94);
      c.quadraticCurveTo(w * -0.08, h * 0.88, w * 0.04, h * 0.99);
    });
    // Wider, squarer plinth and a squarer bezel. Round corners on a tall
    // silver slab is a phone; an arcade tube is a heavy frame with a small
    // radius, and it needs a base you can see it is bolted to.
    fineShape(ctx, '#2b2a30', u, (c) => rr(c, w * 0.02, h * 0.85, w * 0.96, h * 0.14, h * 0.012),
      'rgba(8,8,16,0.55)', 0.012);
    fineShape(ctx, '#8f9bb0', u, (c) => rr(c, w * 0.02, h * 0.02, w * 0.96, h * 0.85, w * 0.09),
      'rgba(26,34,50,0.6)', 0.014);
    plain(ctx, '#39414f', (c) => rr(c, w * 0.08, h * 0.05, w * 0.84, h * 0.79, w * 0.07));
    const sx = w * 0.13, sy = h * 0.075, sw = w * 0.74, sh = h * 0.75;
    plain(ctx, '#0d1c24', (c) => rr(c, sx, sy, sw, sh, w * 0.06));
    ctx.save();
    ctx.beginPath();
    rr(ctx, sx, sy, sw, sh, w * 0.06);
    ctx.clip();
    ctx.save();
    ctx.translate(sx + sw / 2, sy + sh / 2);
    for (let i = 0; i < 5; i++) {
      const q = ((i / 5) + p) % 1;
      stroke(ctx, `rgba(72,224,200,${(0.85 * q).toFixed(2)})`, Math.max(0.25, w * 0.06),
        (c) => c.ellipse(0, 0, sw * (0.06 + 0.42 * (1 - q)), sh * (0.04 + 0.46 * (1 - q)), 0,
          p * 6.3 + i, p * 6.3 + i + 4.2));
    }
    plain(ctx, '#eafff8', (c) => c.ellipse(0, 0, sw * 0.1, sh * 0.05, 0, 0, Math.PI * 2));
    ctx.restore();
    plain(ctx, 'rgba(8,20,26,0.32)', (c) => {
      for (let y = sy; y < sy + sh; y += h * 0.035) c.rect(sx, y, sw, h * 0.013);
    });
    ctx.restore();
    plain(ctx, p < 0.5 ? '#f6d33c' : 'rgba(246,211,60,0.3)',
      (c) => c.arc(w * 0.5, h * 0.92, w * 0.055, 0, Math.PI * 2));
  },
};

// ------------------------------------------------- relay portal states
// How long the two aftermath strips are, in frames and in seconds. The frame
// counts are what the raster cache stores; the times are what drawPortal()
// divides elapsed seconds by. They live here rather than at the call site
// because the strips are cut for them: six frames over a third of a second is
// a discharge, six frames over half a second is a wilt, and swapping either
// number without recutting the other would change what the drawing means.
export const PORTAL_SPEND_FRAMES = 6, PORTAL_SPEND_TIME = 0.34;
export const PORTAL_WILT_FRAMES = 6, PORTAL_WILT_TIME = 0.5;
// Where the discharge ends and the collapse begins, as a fraction of a spend.
// The blowout is deliberately shorter than one frame's worth of the strip is
// wide: it has to land entirely on frame 0 so the brightest moment is the
// frame the hero is standing in the doorway, not the one after it.
const PORTAL_FLASH = 0.2;
// props.js otherwise hardcodes every colour. The portal is the exception
// because its aftermath is a continuous fade of the SAME hardware rather than
// a second palette — writing out six darkened variants of five colours would
// be thirty constants nobody could keep in step with the live five.
function portalRgb(c) {
  const n = parseInt(String(c).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function portalMix(a, b, t) {
  const A = portalRgb(a), B = portalRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
const PORTAL_INK = '#12262a';   // what dead portal hardware darkens toward

// The shipped relay portal, in three states.
//
// LIVE (both zeroes) is the drawing as authored: a bolted plate with thirteen
// hoops of light standing on it.
//
// SPEND is a hero going THROUGH. It opens on a white blowout — the shaft and
// every hoop overdriven for one frame — and then the hoops sink into the slot
// and go out, leaving the plinth dark. The hoops do not fade in place: they
// are pulled down into the thing they came out of, because a doorway that has
// just been used should look emptied rather than switched off. The three that
// appear to come forward with the hero are particles, thrown by the run — a
// cached sprite cannot follow something that has left its own box.
//
// WILT is a hero going OVER. No flash, nothing discharges: the column simply
// sags — the stack compresses toward the plate, the hoops narrow and dim, the
// shaft thins out. The plinth stays mostly lit, because nothing was spent. It
// has to read as clearly DIFFERENT from a spend at a glance and while moving
// off the back of the frame, which is the whole reason it is a separate strip
// rather than a shorter spend.
//
// Both are separate painters rather than extra frames on portalRings because
// propSprite() takes frame indices modulo PROP_FRAMES — a seventh frame on a
// twelve-frame cycle would silently be frame 0 of the live loop.
function portalRingsArt(ctx, w, h, frame = 0, state = {}) {
  // spend is null for a LIVE portal and 0..1 for one being spent — a spend of
  // exactly 0 is the discharge frame, not the live drawing, so the two cannot
  // share a value.
  const { spend = null, wilt = 0 } = state;
  const s = spend == null ? 0 : spend;
  const u = Math.max(w, h);
  const p = (frame % 12) / 12;
  const RINGS = 13;             // thirteen thin hoops, not nine fat ones
  const BASE_Y = h * 0.945;
  const WIDEST = 0.44;          // half-width of the widest ring, in w
  // The blowout, and how far the hoops have collapsed. The flash is gone by
  // the second frame of the strip; the sink runs the whole length of it.
  const flash = spend == null ? 0 : Math.max(0, 1 - s / PORTAL_FLASH);
  const sink = s;
  // How dead the hardware looks. A spend kills it; a miss only dims it,
  // because a portal nobody used has not spent anything.
  const plinthOff = Math.min(1, s * 0.85 + wilt * 0.3);
  const lampOff = Math.min(1, s * 1.15 + wilt * 0.45);
  const dark = (c, amount) => portalMix(c, PORTAL_INK, amount);
  // The base is a BOLTED PLATE, not a disc. An ellipse of light under a
  // column of light is more of the same substance, so it floated: it read as
  // the bottom ring rather than as the thing the rings come out of. This is
  // hard-edged, flat-bottomed, wider than the widest ring (0.88w), and it
  // has a front face and two feet — a fabricated object sitting ON a floor,
  // which is the only way a stack of light gets anchored to one.
  plain(ctx, 'rgba(10,26,28,0.35)', (c) => rr(c, w * 0.03, h * 0.975, w * 0.94, h * 0.022, h * 0.008));
  // Feet first, so the plate's own contour closes over their tops.
  plain(ctx, dark('#2a6f68', plinthOff * 0.7), (c) => {
    rr(c, w * 0.07, BASE_Y + h * 0.03, w * 0.12, h * 0.045, h * 0.008);
    rr(c, w * 0.81, BASE_Y + h * 0.03, w * 0.12, h * 0.045, h * 0.008);
  });
  // Front face: the thickness you are looking at slightly from above.
  fineShape(ctx, dark('#2f8f84', plinthOff * 0.7), u,
    (c) => rr(c, w * 0.05, BASE_Y + h * 0.006, w * 0.9, h * 0.045, h * 0.01),
    'rgba(8,30,28,0.6)', 0.01);
  // Top plate, proud of the front face on both sides so it reads as a lip.
  // It takes the discharge: the rim is the part of the hardware closest to the
  // slot, so it is the part that should look overdriven when the slot blows.
  fineShape(ctx, flash > 0 ? portalMix('#48c8b0', '#ffffff', flash * 0.8) : dark('#48c8b0', plinthOff * 0.75), u,
    (c) => rr(c, w * 0.01, BASE_Y - h * 0.022, w * 0.98, h * 0.034, h * 0.009),
    'rgba(8,30,28,0.6)', 0.01);
  // The slot the column rises out of, and the light standing in it.
  plain(ctx, 'rgba(8,38,40,0.8)', (c) => rr(c, w * 0.33, BASE_Y - h * 0.016, w * 0.34, h * 0.018, h * 0.006));
  if (lampOff < 1) {
    ctx.globalAlpha = 1 - lampOff;
    // The slot flares wider than its own light for the length of the flash —
    // this is the only place the discharge has anywhere to go.
    const lampW = w * (0.28 + 0.34 * flash);
    plain(ctx, '#c8fff0', (c) => rr(c, w * 0.5 - lampW / 2, BASE_Y - h * 0.013, lampW, h * 0.009, h * 0.004));
    ctx.globalAlpha = 1;
  }
  // The shaft of light, stopping ON the plinth rather than running through it.
  // It blows out with the flash, then goes down with the hoops.
  const shaftAlpha = Math.max(0, (0.16 + 0.5 * flash) * (1 - sink) * (1 - wilt * 0.88));
  const shaftTop = h * 0.07 + (BASE_Y - h * 0.165) * Math.max(sink, wilt * 0.5);
  if (shaftAlpha > 0.01) {
    const shaftW = w * (0.2 + 0.14 * flash);
    plain(ctx, `rgba(200,255,240,${shaftAlpha.toFixed(3)})`,
      (c) => rr(c, w * 0.5 - shaftW / 2, shaftTop, shaftW, Math.max(0, BASE_Y - h * 0.025 - shaftTop), w * 0.1));
  }
  for (let i = 0; i < RINGS; i++) {
    const t01 = i / (RINGS - 1);
    const a = p * Math.PI * 2 + t01 * 3.2;
    // Where this hoop sits, once the state has had its way with it. A spend
    // drags every hoop down onto the slot; a wilt compresses the stack toward
    // the plate without moving the bottom of it, which is what makes one read
    // as draining and the other as slumping.
    const y0 = h * 0.075 + t01 * (BASE_Y - h * 0.11);
    const y = y0 + (BASE_Y - h * 0.02 - y0) * (sink * sink * (1 - t01 * 0.35) + wilt * 0.5);
    // Wide hoops narrow as they go: the column closes as much as it falls.
    const halfW = w * (0.14 + (WIDEST - 0.14) * Math.abs(Math.cos(a)))
      * (1 - sink * 0.85) * (1 - wilt * 0.42) * (1 + flash * 0.08);
    if (halfW < w * 0.01) continue;
    const ring = (c) => c.ellipse(w * 0.5, y, halfW, h * 0.015, 0, 0, Math.PI * 2);
    // BOTH passes fade together. Fading only the bright one leaves the dark
    // backing behind at full strength — a spent portal ended on a grey smear
    // standing where the column had been, and a wilted one went muddy rather
    // than dim, because the separation pass was outliving the thing it was
    // separating.
    ctx.globalAlpha = Math.max(0, (1 - sink) * (1 - wilt * 0.62));
    // A dark pass under every ring. Over crypt or neon it is invisible; over
    // the doodle sheet and the frost sky it is the only reason the pale half
    // of the stack does not dissolve into the background. Same two-pass trick
    // the plug row's frame uses, and the same reason. Kept only a little
    // wider than the hoop it backs — at twice the width it stopped reading as
    // separation and started reading as a thick grey donut with a bright
    // core, which is what made the column look coarse rather than fine.
    stroke(ctx, 'rgba(10,30,34,0.28)', Math.max(0.3, w * 0.058), ring);
    // Lit half and shadowed half. The flash overrides both — a discharge has
    // no near side and far side — and the wilt drags both toward the dim
    // teal, so the stack loses its contrast before it loses its shape.
    const lit = Math.cos(a) > 0 ? '#c8fff0' : '#3fa9a0';
    const col = flash > 0 ? portalMix(lit, '#ffffff', flash)
      : wilt > 0 ? portalMix(lit, '#2a6f68', wilt * 0.8) : lit;
    // The discharge is BLOOM, not weight. Widening the hoop's own stroke was
    // the first attempt and it read as the hoops getting chunky — a thicker
    // white band is a fatter object, not a brighter one. Light spills OUTWARD
    // instead: two wide, faint passes of the same colour around the hoop, with
    // the core stroke left at exactly the width it has when the portal is
    // idle. Nothing about the hoop changes except what surrounds it.
    if (flash > 0) {
      const core = ctx.globalAlpha;
      for (const [mult, a01] of [[4.4, 0.1], [2.2, 0.26]]) {
        ctx.globalAlpha = core * flash * a01;
        stroke(ctx, col, Math.max(0.4, w * 0.034 * mult), ring);
      }
      ctx.globalAlpha = core;
    }
    stroke(ctx, col, Math.max(0.2, w * 0.034), ring);
    ctx.globalAlpha = 1;
  }
  // The two loose sparks orbiting the column. They are the first thing to go
  // in either state: they are the portal's idle fidget, and a portal that has
  // discharged or given up is not fidgeting.
  const sparkAlpha = Math.max(0, 1 - Math.max(sink * 2.2, wilt * 1.6));
  if (sparkAlpha > 0.01) {
    ctx.globalAlpha = sparkAlpha;
    for (let i = 0; i < 2; i++) {
      const a = p * Math.PI * 2 * (i ? -1 : 1) + i * 2.1;
      plain(ctx, flash > 0 ? '#ffffff' : '#fff6d0',
        (c) => c.arc(w * (0.5 + 0.42 * Math.cos(a)), h * (0.3 + i * 0.34 + 0.06 * Math.sin(a)), w * 0.04, 0, Math.PI * 2));
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------- bake-off candidate helpers
// Shared by the flag and portal candidates above. Hoisted function
// declarations, so they can live next to the block they serve rather than
// at the top of a file whose other helpers are all shipped.

// The height of a rippling sheet at 0..1 across it. Amplitude grows toward
// the fly end, because the hoist is nailed to a pole and cannot move.
function clothWave(t01, phase, amp) {
  return Math.sin(phase + t01 * 4.6) * amp * (0.25 + t01);
}

// One cloth outline. The bottom edge runs the same wave a fifth of a cycle
// behind the top one, so the sheet TWISTS instead of sliding up and down as
// a rigid band. Control points are placed so each quadratic passes through
// the sampled midpoint.
function clothPath(c, x0, y0, x1, y1, amp, phase) {
  const dx = x1 - x0;
  const top = (t01) => y0 + clothWave(t01, phase, amp);
  const bot = (t01) => y1 + clothWave(t01, phase + 0.9, amp);
  c.moveTo(x0, top(0));
  for (let i = 1; i <= 4; i++) {
    const a = (i - 1) / 4, b = i / 4, m = (a + b) / 2;
    c.quadraticCurveTo(x0 + dx * m, top(m) * 2 - (top(a) + top(b)) / 2, x0 + dx * b, top(b));
  }
  c.lineTo(x1, bot(1));
  for (let i = 4; i >= 1; i--) {
    const a = i / 4, b = (i - 1) / 4, m = (a + b) / 2;
    c.quadraticCurveTo(x0 + dx * m, bot(m) * 2 - (bot(a) + bot(b)) / 2, x0 + dx * b, bot(b));
  }
  c.closePath();
}

// Cream sheet, two dark cells on the diagonal, a travelling fold shadow,
// and the contour restated on top so the ripple keeps an edge over the dark
// cells at any size. The cells ride the local wave rather than sitting flat.
function chequerCloth(ctx, u, x0, y0, x1, y1, amp, phase, frame) {
  const cloth = (c) => clothPath(c, x0, y0, x1, y1, amp, phase);
  fineShape(ctx, '#e6e3da', u, cloth, 'rgba(30,22,14,0.5)', 0.028);
  ctx.save();
  ctx.beginPath();
  cloth(ctx);
  ctx.clip();
  const cw = (x1 - x0) / 2, ch = (y1 - y0) / 2;
  plain(ctx, '#2b2a30', (c) => {
    for (const [ix, iy] of [[0, 0], [1, 1]]) {
      const shift = clothWave((ix + 0.5) / 2, phase, amp);
      const ry = iy === 0 ? y0 - amp * 1.5 : y0 + ch;
      c.rect(x0 + ix * cw, ry + shift, cw, ch + amp * 1.5);
    }
  });
  plain(ctx, 'rgba(24,16,34,0.14)', (c) => {
    const bu = (0.1 + (frame / 8) * 0.9) % 1;
    c.rect(x0 + (x1 - x0) * bu - (x1 - x0) * 0.08, y0 - amp * 2, (x1 - x0) * 0.16, (y1 - y0) + amp * 4);
  });
  ctx.restore();
  ctx.beginPath();
  cloth(ctx);
  ctx.strokeStyle = 'rgba(30,22,14,0.5)';
  ctx.lineWidth = Math.max(0.2, u * 0.028);
  ctx.stroke();
}

// The shared pole: full height, teal, with a lit left edge. A flag without
// a hard vertical to hang off is a rectangle.
function flagPole(ctx, w, h, u) {
  fineShape(ctx, '#3ba894', u, (c) => rr(c, w * 0.09, h * 0.06, w * 0.14, h * 0.92, w * 0.055),
    'rgba(10,34,30,0.55)', 0.026);
  plain(ctx, 'rgba(230,255,248,0.45)', (c) => rr(c, w * 0.115, h * 0.16, w * 0.05, h * 0.3, w * 0.025));
}

// A closed path through `pts` with every corner rounded off: each point is used
// as a quadratic control and the curve passes through the midpoints between
// them. Straight segments between sampled points look identical to this at the
// size a prop is authored for and fall apart as facets the moment something
// draws it larger, because facet length scales with the draw and curvature
// does not. Repeat a point to hold a corner sharp.
function smoothClosedPath(c, pts) {
  const n = pts.length;
  if (n < 3) return;
  const mid = (i, j) => [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
  const [sx, sy] = mid(n - 1, 0);
  c.moveTo(sx, sy);
  for (let i = 0; i < n; i++) {
    const [mx, my] = mid(i, (i + 1) % n);
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  c.closePath();
}

// A doorway outline: two uprights closed by a semicircular head.
function archPath(c, x0, x1, top, bottom) {
  const r = (x1 - x0) / 2;
  c.moveTo(x0, bottom);
  c.lineTo(x0, top + r);
  c.arc(x0 + r, top + r, r, Math.PI, 0, false);
  c.lineTo(x1, bottom);
  c.closePath();
}

// ------------------------------------------------------------- cache
const cache = new Map();
const SS = 8; // supersample factor for the offscreen rasterization

// Which drawing the relay portal ships. Every place that paints a portal —
// the run, the tutorial, the credits hand-off, the menu legend — reads this,
// so swapping the art is one edit rather than four that can drift apart.
export const PORTAL_SPRITE = 'portalRings';
// Its aftermath: the strip played when a hero goes THROUGH one, and the strip
// played when one goes over the top. Both are cut to portalRings' geometry, so
// they are named next to it — swapping PORTAL_SPRITE to another candidate means
// cutting these two again, not just repointing them.
export const PORTAL_SPENT_SPRITE = 'portalRingsSpent';
export const PORTAL_WILT_SPRITE = 'portalRingsWilt';
// The box the portal is AUTHORED in. Every caller sizes off this rather than
// picking its own width: the old portal was an ellipse and did not care how it
// was stretched, but a cut with a taper and a jitter does — the credits were
// drawing it 22 wide by 40 tall, which is 1.7x the authored proportion, and it
// fattened every curve into a slab.
export const PORTAL_ART_W = 14, PORTAL_ART_H = 44;
export const portalArtWidth = (h) => Math.round(h * (PORTAL_ART_W / PORTAL_ART_H));

export function hasProp(name) { return !!PROP_PAINTERS[name]; }

// Props that animate: name -> how many frames the painter cycles through.
// Anything absent is static. Frames are rasterized and cached individually, so
// an animated prop costs one canvas per frame per size and still draws with a
// single drawImage — no per-frame vector work in the hot loop.
export const PROP_FRAMES = {
  // Half a rotor turn — the blade pair repeats every half turn — in twelve
  // 15-degree steps. Four 45-degree steps strobed: the disc is a third of the
  // hero's height and every frame was a different drawing.
  eggshellCopter: 12,
  ...ANIMAL_FRAMES,
  ...finishDogTable(ANIMAL_FRAMES),
  cactus: 6, cactusBig: 6, snowman: 6, snowmanBig: 6, qcrate: 36, appliance: 96,
  buzzbird: 6,
  // Standing hazards. Eight is the ring these were authored against — see
  // hzPhase — and the saw's eight turn the disc by exactly one tooth, so the
  // seam between the last frame and the first is the same seam as every other
  // frame boundary. The green cactus takes the red one's six, because it is a
  // skin of it and the two sway together in a row.
  popSpikes: 8, campfire: 8, fireBarrel: 8, brazier: 8, floorSaw: 8,
  boomBarrier: 8, pipe: 8,
  cactusGreen: 6,
  drone: 6, shooterDrone: 6, droneEye: DRONE_EYE_FRAMES,
  // Bake-off candidates. Eight frames for the ramps and flags — one chevron
  // cell and one cloth cycle respectively, so the loop point is the art's own
  // period rather than an arbitrary count. The portals get twelve: they are
  // the largest art in the set and a six-frame vortex strobes.
  boostPad: 8,
  springPad: 8,
  rampChevron: 8, rampWedge: 8, rampTurbine: 8, rampGate: 8,
  flagWave: 8, flagPennant: 8, flagBeacon: 8, flagPlug: 8,
  portalArch: 12, portalRift: 12, portalRings: 12, portalTube: 12,
  // Not loops. These two are STRIPS: frame 0 is the moment of the event and
  // the last frame is where the drawing rests until it scrolls off. drawPortal
  // clamps into them off a timer rather than cycling them off the clock.
  portalRingsSpent: PORTAL_SPEND_FRAMES, portalRingsWilt: PORTAL_WILT_FRAMES,
};
// A bird beats its wings faster than a cactus sways. At 16fps the six frames
// come round about 2.7 times a second, which is quick enough to read as flapping
// and slow enough that the individual poses still register.
// Rotors read as spinning only well above the flap rate — at 11fps the six
// poses strobe into a slow wobble instead of blurring. The eye drone is the
// exception and runs SLOW: its strip is cut for the lens sweep, not the rotor,
// so sixteen frames at 12fps is one unhurried 1.3s scan with the rotor's five
// turns folded inside it.
const PROP_FPS = {
  // The copter's rotor is normally driven off the song's beat (draw.js
  // copterFrame); this is the rate the strip runs at when no song is playing.
  eggshellCopter: 24,
  ...ANIMAL_FPS,
  ...finishDogTable(ANIMAL_FPS),
  qcrate: 12, appliance: 24, buzzbird: 16,
  // Fire is fast or it looks like jelly; the spike plate is slow because it is
  // a machine breathing, not a machine cycling. The saw is the fastest thing in
  // the table: below ~20 the eight tooth-steps read as a wobble rather than a
  // spin, which is the same failure the rotors had at 11.
  popSpikes: 9, campfire: 14, fireBarrel: 14, brazier: 12, floorSaw: 22,
  // The razor hurdle's cycle is only its beacon/current breathing — spike-plate slow.
  boomBarrier: 10, pipe: 4,
  drone: 24, shooterDrone: 24, droneEye: 12,
  // Bake-off candidates. The ramps run fast: a chevron chase reads as speed
  // only when it outruns the lane scroll. Cloth is the opposite — a flag
  // ripple at 16fps is a flutter, at 10 it is a wave. The portals sit in
  // between, slow enough that the vortex turns rather than flickers.
  boostPad: 16,
  springPad: 16,
  rampChevron: 16, rampWedge: 16, rampTurbine: 20, rampGate: 14,
  flagWave: 10, flagPennant: 10, flagBeacon: 10, flagPlug: 10,
  portalArch: 12, portalRift: 14, portalRings: 12, portalTube: 12,
};

// Visual overdraw: props drawn taller than their def box, bottom-anchored, so
// the art gains stature without touching the hitbox (hazards already render
// 1.33x their box — bigger art is generous, never unfair).
export const PROP_TALL = {
  ...ANIMAL_TALL,
  ...finishDogTable(ANIMAL_TALL),
  cactus: 1.55, cactusBig: 1.4, snowman: 1.55, snowmanBig: 1.4,
  // Standing hazards, over UNCHANGED boxes. Every one of these buys its
  // presence upward, the same trade the boost pad makes, and every one of them
  // buys it with something that cannot hurt you: flame above a barrel, flame
  // above a bowl, teeth above a plate. The box is the metal.
  //
  // The two fires take the most because a fire is mostly the part of it that is
  // not solid — 1.7 over a 13x13 barrel is 22px of art, of which the drum is 13.
  popSpikes: 1.5, campfire: 1.3, fireBarrel: 1.7, brazier: 1.55, floorSaw: 1.45,
  // A sign is mostly post. 1.5 over the 13x9 box puts the board at head height
  // where a sign belongs, and leaves the box around the part you walk into.
  jumpSign: 1.5,
  downSign: 1.5,
  dogSign: 1.5,
  cactusGreen: 1.55,
  // Speed ramp candidates over the unchanged 14x4 boostPad box. This is the
  // entire proposal for three of the four: the pad cannot get wider without
  // lying about where the boost starts, so everything it gains it gains
  // upward. rampGate takes that furthest — 4.5 puts its art at roughly the
  // hero's own height, which is the point of it and also the objection to it.
  // The winner ships at 1.35, down from the 2.4 it was proposed at. 2.4 was
  // headroom for the thrown darts; 1.7 was that minus the darts; 1.35 is the
  // trench, which wants to be a groove in the floor rather than a kerb the
  // hero appears to be about to trip over. The hitbox is still 14x4.
  // 1.15, down again from 1.35. Nothing can be drawn BELOW the ground line, so
  // "deeper in the floor" only ever means "less of it standing above the
  // floor" — the depth is bought by making the whole mark flatter, not by
  // moving it down. The hitbox is still 14x4.
  boostPad: 1.15,
  // Bake-off winner C is deliberately shorter than the old stacked bars:
  // 2.5 over the unchanged 16x6 box produces a compact 21x20 world sprite.
  springPad: 2.5,
  rampChevron: 1.15, rampWedge: 3, rampTurbine: 3.25, rampGate: 4.5,
};
export function propTall(name) { return PROP_TALL[name] || 1; }

// Extra internal art scale for props with fine expression or reflective detail.
// Their painters receive at least a 2x box before supersampling; the world draw
// size and gameplay hitbox do not change.
const PROP_DETAIL_SCALE = {
  // The villain's goggles are 1u lenses on a 24u portrait; the copter's blades
  // are 1u lines. Neither survives single detail.
  eggshell: 2, eggshellCopter: 2, eggshellBalloon: 2,
  ...ANIMAL_DETAIL,
  ...finishDogTable(null, 3), // the one detail-3 exception — see FINISH_DOG_ALIASES
  // The sign's head is the finest drawing in the lane per pixel: a silhouette
  // with fangs and a nostril inside a board about 17px wide. At detail 2 the
  // notches closed up into the black.
  dogSign: 3,
  cactus: 2, cactusBig: 2,
  // Standing hazards. All six ship between 7 and 22px, which is exactly the
  // range this table exists for: a spike's point, a barrel band and a spine are
  // all sub-pixel marks at single detail and survive as tone at double.
  popSpikes: 2, campfire: 2, fireBarrel: 2, brazier: 2, floorSaw: 2, cactusGreen: 2,
  boomBarrier: 2,
  snowman: 2, snowmanBig: 2,
  crate: 2, qcrate: 2, pipe: 2, switch: 2,
  zombieWalk: 2, icicle: 2,
  buzzbird: 2, drone: 2, shooterDrone: 2, droneEye: 2,
  printer: 2, chair: 2,
  trafficCone: 2,
  // Four overlapping skins, a stalk nub and two browned points inside a box SIX
  // pixels tall. Three rather than the usual two: at 2x the arc's neck and the
  // lens of background between it and the upper skin — the two marks the whole
  // drawing is built on — both close up when rasterized this small, and the peel
  // collapses into one yellow smear with a dark speck on it.
  bananaPeel: 3,
  coin: 2, battery: 2,
  capShield: 2, capMagnet: 2, capStar: 2, capAirJump: 2,
  capSpeed: 2, capLowGrav: 2, capUnpeel: 2, capRewind: 2,
  appliance: 2, cord: 2, resident: 2, dustdevil: 2,
  // Plug-row icons. These ship at 5-10px, which is the range this table exists
  // for: the painter gets a 2x box before supersampling, so a rim band, a
  // toaster slot and a hairline contour survive as tone instead of snapping
  // away. plugTrophyLegacy is here only to keep the gallery's was/is row an
  // honest comparison — without it the old drawing would be handicapped by a
  // rasterization difference rather than judged on the drawing.
  plugOrder: 2, plugTrophy: 2, plugToaster: 2,
  // Gallery-only: the pre-pass trophy for the was/is row, the two handle reaches
  // either side of the shipped one, and the wall socket the MISSION slot used to
  // point at. Same treatment as the shipped icon so those comparisons turn on
  // the drawing rather than on a rasterization difference. Delete each alongside
  // its gallery section.
  plugTrophyLegacy: 2, plugTrophyWide: 2, plugTrophyTight: 2, plugSocket: 2,
  // Parked MISSION-slot alternative. Keeps the shipped treatment so that if it
  // is ever swapped in it needs no other change.
  plugHead: 2,
  // The two MISSION-slot candidates that lost to plugOrder. Kept drawable for
  // the same reason as the trophy handle reaches: the bake-off section stays as
  // the record of the decision, and it has to keep rendering to be worth
  // anything. Delete them with that section.
  plugFlag: 2, plugTarget: 2,
  // Bake-off candidates. The ramps and flags are small enough to need the
  // double box — a flag's chequer at 5px and a chevron's inner notch are
  // exactly the marks this table exists to keep. The portals are NOT here on
  // purpose: at 14x44 they are already the biggest vector art in the game, and
  // doubling them would quadruple a twelve-frame cache for detail SS is
  // already resolving.
  boostPad: 2, boostPadLegacy: 2,
  springPad: 2,
  rampChevron: 2, rampWedge: 2, rampTurbine: 2, rampGate: 2,
  flagWave: 2, flagPennant: 2, flagBeacon: 2, flagPlug: 2,
};
export function propDetailScale(name) { return PROP_DETAIL_SCALE[name] || 1; }

// World-only visual size. Snowmen overdraw their unchanged collision boxes a
// little farther so they feel substantial without making their jumps harder.
//
// The fliers are here for readability rather than heft. A drone's box is 12x7,
// which even with the standard 1.33x hazard overdraw draws about 16x9 against a
// 24px hero — small enough that at speed it reads as a smudge in the lane
// rather than as the thing you are meant to duck or shoot. 1.35 puts it at
// roughly 22x13: unmistakable, and still visibly smaller than the hero.
//
// It stops there on purpose. This is ART over an UNCHANGED collision box, so
// every step up widens the gap between what you see and what can hit you. At
// 1.35 the total overdraw is 1.8x the box; 1.5 takes it to 2.0x, where a clean
// pass under a drone starts to look like it should have connected. The error is
// in the forgiving direction either way — you are only ever hit well inside the
// art — but a hazard that looks bigger than it bites is still a hazard you
// misjudge.
const PROP_VISUAL_SCALE = {
  ...ANIMAL_VISUAL,
  ...finishDogTable(ANIMAL_VISUAL),
  // The dog sign draws over its box, where its two siblings do not. They
  // carry a word, which is legible or not at any size; this one carries a
  // DRAWING, and a drawing needs room before its detail is worth having.
  // The hitbox is untouched — it is a breakable sign, so the only thing the
  // extra size costs is a slightly earlier break, and a warning you brush
  // rather than walk into is the right way round.
  dogSign: 1.3,
  // The battery keeps the HUD's 25:13 proportions inside a square 8x8 def box,
  // so its art only fills about half the box's height. Without this it reads as
  // a smaller pickup than the coin it spawns beside, which is backwards — it is
  // the more valuable of the two.
  //
  // Capped at 1.15 rather than pushed further, and the cap comes from the
  // HITBOX, not from taste. Overdraw on a HAZARD is generous — art wider than
  // the box means a hit that looked like it should have connected does not. On a
  // PICKUP the same overdraw runs the other way: art you can visibly touch
  // without collecting. The standard 4/3 inflation already puts this at ~11.5px
  // of drawing across an 8px box, about 1.8px of overhang a side, which is in
  // the same range as the coin beside it. 1.3 took it past 13px and made the
  // battery the one pickup whose nose you could run through for nothing.
  battery: 1.15,
  snowman: 1.15, snowmanBig: 1.15,
  drone: 1.35, shooterDrone: 1.35, buzzbird: 1.35, droneEye: 1.35,
};
export function propVisualScale(name) { return PROP_VISUAL_SCALE[name] || 1; }
// The largest any prop's art is scaled up from its box. Culling needs it: an
// entity whose BOX is off screen can still have ink on it, and the bound has to
// come from the art rather than from a number someone guessed once.
export function maxPropVisualScale() {
  let m = 1;
  for (const v of Object.values(PROP_VISUAL_SCALE)) if (v > m) m = v;
  return m;
}

// Refined props carry their own high-resolution hairline. The shared two-pass
// hazard rim would sit outside it as a second broad border at desktop scale,
// undoing the lighter authored contour.
const SELF_OUTLINED_PROPS = new Set([
  ...ANIMAL_NAMES,
  ...Object.keys(FINISH_DOG_ALIASES),
  'cactus', 'cactusBig', 'snowman', 'snowmanBig',
  // The five standing hazards author heavy INK contours of their own. The
  // shared rim outside those would ring a flame in dark paint, which is the one
  // thing fire must never have.
  //
  // cactusGreen is deliberately NOT here. It is the only prop in the game whose
  // body colour is a near match for a cabinet's turf (plumber's #3a9c48), and
  // the two-pass hazard rim is exactly the tool for that: it puts a dark inner
  // and a pulsing light outer edge around the silhouette, which is what buys
  // the separation the red cactus gets for free from being red.
  'popSpikes', 'campfire', 'fireBarrel', 'brazier', 'floorSaw',
  // The razor hurdle's rail and teeth carry their own heavy ink contour.
  'boomBarrier',
  'crate', 'pipe', 'zombieWalk', 'icicle',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair', 'trafficCone',
  // The peel is drawn flat, with a whisper of warm contour and no dark one at
  // all — the absence of a hard border is most of what makes it read clean. The
  // shared two-pass hazard rim is a broad dark border around the whole box and
  // would undo exactly that, as well as closing the gaps between the skins.
  'bananaPeel',
]);
export function propHazardRim(name) {
  return !SELF_OUTLINED_PROPS.has(name);
}

// Props whose painter centres its art in the box instead of standing it on the
// box floor. Nearly everything here is a ground prop, so the draw path anchors
// art to the bottom — correct for a cactus, wrong for the battery, whose HUD
// proportions leave the box half empty ABOVE and BELOW the drawing. Anchored to
// the floor, that spare room all collects on top: the art rides ~3px high of its
// own hitbox, and anything the draw path centres on the box — the heal halo —
// centres 3px below the thing it is meant to be haloing.
const BOX_CENTRED_PROPS = new Set(['battery']);
export function propBoxCentred(name) { return BOX_CENTRED_PROPS.has(name); }

export function propFrames(name) { return PROP_FRAMES[name] || 1; }
export function propFps(name) { return PROP_FPS[name] || 11; }

// --- cache accounting -------------------------------------------------------
// Every entry in this cache is a canvas that is never freed, and every one of
// them is built lazily on the first frame that draws it. Both of those are
// things worth being able to see a number for: the resident total says how
// close a long session is to the canvas memory iOS will eventually take back,
// and a creation that happens while the visible world is being drawn IS the
// hitch — a 96-frame appliance walking on screen rasterizes a fresh canvas on
// ~96 consecutive frames.
//
// Resident bytes and creations are counted always: they only tick when a canvas
// is built, which is rare, and eviction will need the total. Hits and misses
// are per-draw and so are gated behind the profiler.
let cacheBytes = 0;
let cacheCreations = 0;
let cacheProfile = null;
// Set while the visible world is being painted, so a creation can be blamed on
// the frame the player was watching rather than on warm-up.
let inVisibleDraw = false;

export function setPropCacheProfile(on) {
  cacheProfile = on ? { hits: 0, misses: 0, creations: 0, visibleMisses: 0, bytes: 0 } : null;
}
// Session totals and per-window counters are named apart on purpose: they answer
// different questions (how much is resident overall vs what did THIS window
// build), and folding them into one `creations` key let the zeroed profile
// fallback silently overwrite the real total.
export function propCacheStats() {
  const p = cacheProfile;
  return {
    entries: cache.size,
    residentBytes: cacheBytes,
    creations: cacheCreations,
    hits: p ? p.hits : 0,
    misses: p ? p.misses : 0,
    windowCreations: p ? p.creations : 0,
    visibleMisses: p ? p.visibleMisses : 0,
    windowBytes: p ? p.bytes : 0,
  };
}
export function resetPropCacheProfile() { if (cacheProfile) setPropCacheProfile(true); }
// run.js brackets its world/actor painting with this. Anything built inside the
// bracket was art the game needed before it had been prepared.
export function setPropDrawPhase(on) { inVisibleDraw = on; }

// Drop every cached canvas whose prop is not named in `keepNames`. Keys all
// begin `name|`, so the prop is the prefix; glow and spark entries are keyed by
// colour rather than by prop and are a few KB each, so they stay.
//
// This exists because warming a stage up front is the opposite trade from
// building art lazily: it removes the hitch and raises the resident total, and
// nothing here was ever freed. One stage is ~56MB of canvas, and the code has
// a comment elsewhere about iOS reclaiming canvas memory out from under a page
// that holds too much — so the ceiling has to be a real one.
export function evictPropsExcept(keepNames) {
  let freed = 0;
  for (const [key, c] of cache) {
    const cut = key.indexOf('|');
    const name = cut < 0 ? key : key.slice(0, cut);
    if (name === 'glow' || name === 'spark' || keepNames.has(name)) continue;
    freed += c.width * c.height * 4;
    cache.delete(key);
  }
  cacheBytes -= freed;
  return freed;
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (cacheProfile) { if (hit) cacheProfile.hits++; else cacheProfile.misses++; }
  return hit;
}

function cacheSet(key, c) {
  cacheBytes += c.width * c.height * 4;
  cacheCreations++;
  if (cacheProfile) {
    cacheProfile.creations++;
    cacheProfile.bytes += c.width * c.height * 4;
    if (inVisibleDraw) cacheProfile.visibleMisses++;
  }
  cache.set(key, c);
  return c;
}

// Rasterize any vector painter into the shared cache at SS x its logical size.
// The key is the caller's whole identity — name, size, and anything else that
// changes the pixels (a frame index here, a palette id in sprites/arcade.js).
export function rasterize(key, w, h, paintFn) {
  const hit = cacheGet(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * SS));
  c.height = Math.max(1, Math.round(h * SS));
  const x = c.getContext('2d');
  x.scale(SS, SS);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  paintFn(x, w, h);
  cacheSet(key, c);
  return c;
}

// Cached vector prop rasterized at SS x its logical size.
export function propSprite(name, w, h, frame = 0) {
  const f = frame % propFrames(name);
  const paint = PROP_PAINTERS[name];
  if (!paint) return null;
  const detail = propDetailScale(name);
  const rw = w * detail, rh = h * detail;
  return rasterize(`${name}|${w}x${h}|${detail}x|${f}`, rw, rh, (x) => paint(x, rw, rh, f));
}

// Flat silhouette of a prop in one color — used for hazard rim outlines.
export function propTinted(name, w, h, color, frame = 0) {
  const f = frame % propFrames(name);
  const key = `${name}|${w}x${h}|${color}|${f}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const src = propSprite(name, w, h, f);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  cacheSet(key, c);
  return c;
}

// Union of two offset silhouettes in one cached canvas — the hazard rim
// becomes a single drawImage per color instead of two.
export function propRimPair(name, w, h, color, axis, frame = 0) {
  const f = frame % propFrames(name);
  const key = `${name}|${w}x${h}|rim|${color}|${axis}|${f}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const sil = propTinted(name, w, h, color, f);
  if (!sil) return null;
  const pad = propDetailScale(name) * SS;
  const c = document.createElement('canvas');
  c.width = sil.width + 2 * pad;
  c.height = sil.height + 2 * pad;
  const x = c.getContext('2d');
  const [dx, dy] = axis === 'x' ? [pad, 0] : [0, pad];
  x.drawImage(sil, pad - dx, pad - dy);
  x.drawImage(sil, pad + dx, pad + dy);
  cacheSet(key, c);
  return c;
}

// Soft radial glow (for power capsules and other shiny things) — cached.
export function glowSprite(color, r = 16) {
  const key = `glow|${color}|${r}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 * 4;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(r * 4, r * 4, r, r * 4, r * 4, r * 4);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  cacheSet(key, c);
  return c;
}

// A soft 4-point sparkle (for coin twinkles and anything shiny) — cached.
export function sparkSprite(color) {
  const key = `spark|${color}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.translate(32, 32);
  x.fillStyle = color;
  for (const rot of [0, Math.PI / 2]) {
    x.save();
    x.rotate(rot);
    x.beginPath();
    x.moveTo(-30, 0);
    x.quadraticCurveTo(0, -5, 30, 0);
    x.quadraticCurveTo(0, 5, -30, 0);
    x.closePath();
    x.globalAlpha = 0.9;
    x.fill();
    x.restore();
  }
  x.globalAlpha = 1;
  x.beginPath();
  x.arc(0, 0, 5, 0, Math.PI * 2);
  x.fill();
  cacheSet(key, c);
  return c;
}

// Convenience: draw a vector prop smoothly into a logical-coordinate box.
export function drawProp(ctx, name, x, y, w, h, frame = 0) {
  const spr = propSprite(name, w, h, frame);
  if (!spr) return false;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spr, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
  return true;
}

// A rare visualiser-only appliance finish still uses the original vector
// painter, so only its authored casing planes change colour—not the toast,
// wings, outlines, or transparent bounds as with a post-process tint.
export function drawApplianceFinish(ctx, x, y, w, h, frame, finish) {
  const f = frame % propFrames('appliance');
  const detail = propDetailScale('appliance');
  const rw = w * detail, rh = h * detail;
  const spr = rasterize(`appliance|${w}x${h}|${detail}x|${f}|finish:${finish.id}`,
    rw, rh, (paintCtx) => PROP_PAINTERS.appliance(paintCtx, rw, rh, f, finish));
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spr, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
  return true;
}
