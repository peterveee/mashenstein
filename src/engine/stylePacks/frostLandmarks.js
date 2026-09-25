// FROST FORTRESS's landmarks (Peter, 24 Sep 2026, from the frost ideas bake-off,
// src/dev/frost-ideas.js): the CHAIR LIFT on frost-1 and the REINDEER herd near the end
// of frost-2. Both stand on the FAR ridge and are drawn inside that layer's pass, after
// its snow and scenery and before the near hills, which bury their feet exactly as they
// bury the fortresses'. The pack hands in `crest(x)`, the far ridge's crest y at screen x
// in the current ctx coordinates, so both hold in portrait.
//
// Nothing here imports stylePacks/index.js: that module imports this one.
import { ZOOM } from '../camera.js';

const TAU = Math.PI * 2;
// A rounded rectangle from quadratic corners (the test canvas has no roundRect or arcTo).
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.moveTo(x + k, y);
  c.lineTo(x + w - k, y); c.quadraticCurveTo(x + w, y, x + w, y + k);
  c.lineTo(x + w, y + h - k); c.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  c.lineTo(x + k, y + h); c.quadraticCurveTo(x, y + h, x, y + h - k);
  c.lineTo(x, y + k); c.quadraticCurveTo(x, y, x + k, y);
  c.closePath();
}
const FAR_FACTOR = 0.12;          // the far ridge's parallax; a landmark rides it
const INK = 'rgba(52,74,98,0.55)';

function fillPath(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function inked(ctx, color, path, lw = 0.5) {
  ctx.beginPath(); path(ctx);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
}
function line(ctx, color, lw, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}

// ------------------------------------------------------------------ the chair lift
// Near the start of frost-1 (Peter, 24 Sep: "near the beginning of the level going down
// and disappearing behind hills"): a gondola line that comes DOWN out of the sky from the
// left, over lattice towers planted in the far ridge on concrete footings, and runs into
// the hills on the right — no station; the cable and its cabins go on out of sight
// behind the slope, because everything here is clipped to the sky side of the crest.
// Cabins ride down one cable and up the other, evenly spaced, each on its own sway.
const LIFT = {
  span: 460,                      // px from where the cable meets the hill back to where it leaves the frame
  // HOW HIGH THE LINE LEAVES, measured UP FROM THE RIDGE'S PEAK — not a screen y.
  // It used to be `topY: -46`, which is just above the frame in landscape. Portrait
  // lifts the far layer about 200px and shows a far taller sky, so the same -46 sat
  // BELOW the ridge's own peaks: the cable fell 37px over 460 (5 degrees against
  // landscape's 27), ran into the hills to its left and was clipped away, leaving one
  // flat scrap in a valley. Hung off the peak it keeps landscape to the pixel (the far
  // ridge peaks at y130 there, so 130 - 176 = -46) and in portrait it climbs out of
  // the top of the picture at the same angle, clearing the ridges it crosses.
  rise: 176,
  sag: 12,
  towers: [90, 185, 290],         // px back up the line from the hill
  cabins: 6,
  speed: 0.02,                    // of the line per second
  tower: '#5f7c98', towerLit: '#8fa9c2', cable: 'rgba(52,74,98,0.8)',
  cabin: ['#e8503a', '#f6c23c'], glass: '#dff0fa', roof: '#f4faff',
};
export const FROST_LIFT_AT_PX = 700;   // world px into frost-1 where the line meets the hill mid-picture
// The cable's y at screen x: from (x0 - span, topY) down to (x0, y0), sagging between.
function liftCableY(x0, y0, topY, x, drop = 0) {
  const u = (x - (x0 - LIFT.span)) / LIFT.span;      // 0 at the top, 1 at the hill
  return topY + (y0 - topY) * u + LIFT.sag * Math.sin(Math.PI * u) + drop;
}
/**
 * The gondola line. x0 is where the cable meets the far ridge (it disappears into the
 * hill there); the line reaches back up and to the left, out of the top of the frame.
 * Ink runs from x0 - LIFT.span to about x0 + 10.
 */
export function drawFrostChairLift(ctx, t, x0, crest, peak) {
  const y0 = crest(x0) + 8;                         // it goes INTO the slope
  // `peak` is the far ridge's highest y in these coordinates. Without it (an old
  // caller) the landscape constant stands.
  const topY = Number.isFinite(peak) ? peak - LIFT.rise : -46;
  const skyTop = Math.min(-200, topY - 60);
  ctx.save();
  // Everything on the sky side of the crest: where the line meets the hill it is gone.
  ctx.beginPath();
  ctx.moveTo(x0 - LIFT.span - 20, skyTop);
  ctx.lineTo(x0 + 40, skyTop);
  for (let x = x0 + 40; x >= x0 - LIFT.span - 20; x -= 3) ctx.lineTo(x, crest(x) + 1);
  ctx.closePath();
  ctx.clip();
  // Towers, where the cable runs high enough over the ridge to need one.
  for (const back of LIFT.towers) {
    const x = x0 - back;
    const foot = crest(x) + 2;
    const top = liftCableY(x0, y0, topY, x) - 1.5;
    if (foot - top < 10) continue;
    const spread = Math.min(6, (foot - top) * 0.12);
    line(ctx, LIFT.tower, 1.1, (c) => { c.moveTo(x - spread, foot); c.lineTo(x - 0.8, top + 3); c.moveTo(x + spread, foot); c.lineTo(x + 0.8, top + 3); });
    line(ctx, LIFT.towerLit, 0.5, (c) => {
      const n = Math.max(2, Math.floor((foot - top) / 7));
      for (let i = 0; i < n; i++) {
        const ya = foot - (foot - top - 3) * (i / n), yb = foot - (foot - top - 3) * ((i + 1) / n);
        const wa = spread * (1 - i / n) + 0.8 * (i / n), wb = spread * (1 - (i + 1) / n) + 0.8 * ((i + 1) / n);
        c.moveTo(x - wa, ya); c.lineTo(x + wb, yb);
      }
    });
    // A concrete footing sunk in a snow mound, so the tower stands IN the ridge.
    fillPath(ctx, '#8e9aa6', (c) => c.rect(x - spread - 1.6, foot - 2.2, (spread + 1.6) * 2, 3));
    fillPath(ctx, '#f4faff', (c) => { c.ellipse(x, foot + 0.6, spread + 4.5, 2.2, 0, Math.PI, 0); c.closePath(); });
    line(ctx, LIFT.tower, 1.2, (c) => { c.moveTo(x - 5, top + 3); c.lineTo(x + 5, top + 3); });
    fillPath(ctx, LIFT.tower, (c) => { c.arc(x - 4, top + 2.5, 1.2, 0, TAU); c.moveTo(x + 5.2, top + 2.5); c.arc(x + 4, top + 2.5, 1.2, 0, TAU); });
  }
  // The two cables.
  const x1 = x0 - LIFT.span - 10;
  for (const drop of [0, 3.5]) {
    line(ctx, LIFT.cable, 0.7, (c) => {
      c.moveTo(x1, liftCableY(x0, y0, topY, x1, drop));
      for (let x = x1 + 8; x <= x0 + 30; x += 8) c.lineTo(x, liftCableY(x0, y0, topY, x, drop));
    });
  }
  // Cabins: down the near cable toward the hill, up the far one out of it.
  for (let i = 0; i < LIFT.cabins * 2; i++) {
    const down = i < LIFT.cabins;
    const j = down ? i : i - LIFT.cabins;
    let u = ((j / LIFT.cabins) + t * LIFT.speed * (down ? 1 : -1) + (down ? 0 : 0.08)) % 1;
    if (u < 0) u += 1;
    const x = x0 - LIFT.span + u * (LIFT.span + 24);
    const drop = down ? 0 : 3.5;
    const cy = liftCableY(x0, y0, topY, x, drop);
    // Up where the line leaves the picture there is nothing to see — in both
    // orientations, which is why this is relative to the line and not a screen y.
    if (cy < topY + 16) continue;
    const swing = Math.sin(t * 1.3 + i) * 0.6;
    line(ctx, LIFT.cable, 0.5, (c) => { c.moveTo(x, cy); c.lineTo(x + swing, cy + 5); });
    const bx = x + swing, by = cy + 5;
    inked(ctx, LIFT.cabin[i % 2], (c) => rr(c, bx - 3.5, by, 7, 6, 1.6));
    fillPath(ctx, LIFT.glass, (c) => { c.rect(bx - 2.6, by + 1.2, 2.2, 2); c.rect(bx + 0.4, by + 1.2, 2.2, 2); });
    fillPath(ctx, LIFT.roof, (c) => rr(c, bx - 3.6, by - 0.4, 7.2, 1.3, 0.6));
  }
  ctx.restore();
}
// Screen x of the point where the line meets the hill, pinned so it arrives mid-picture
// at atCam and rides the far ridge.
export function frostLiftX(viewCenter, camX, atCam) {
  return viewCenter + (atCam - camX) * FAR_FACTOR * ZOOM;
}

// ------------------------------------------------------------------ the reindeer
// A herd galloping along the far snowfield, overtaking the run, near the end of frost-2.
// They cross the picture once, over a window of the stage, left to right, heads up and
// antlers back; each on its own stride so the herd never marches in step.
// THE FIRST DEER, kept drawable as the bake-off's control (A): superseded on 25 Sep by
// the cut-paper deer below.
const DEER = {
  body: '#7a5a46', dark: '#5a4234', belly: '#d8c0a2', rump: '#f4ece0', antler: '#6a5240', eye: '#1a1210',
};
export const FROST_HERD_WINDOW = [0.78, 0.95];
const HERD = [
  // [offset behind the leader, stride phase, size]
  [0, 0.0, 1.0], [24, 0.35, 0.92], [44, 0.7, 1.06], [66, 0.15, 0.88], [86, 0.55, 0.96],
];
function drawDeerV1(ctx, x, y, s, phase, tilt = 0) {
  // `phase` 0..1 through a gallop: gathered (legs under) to extended (legs flung out).
  const ext = 0.5 - 0.5 * Math.cos(phase * TAU);
  // A small hop at the gathered part of the stride only: the hooves stay on the snow.
  const lift = Math.max(0, Math.sin(phase * TAU)) * 0.45;
  ctx.save();
  ctx.translate(x, y - lift * s);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  // Legs: far pair first, darker.
  const legs = (dx, spread, color) => line(ctx, color, 1.1, (c) => {
    c.moveTo(dx, -6); c.lineTo(dx + spread * 0.6, -3); c.lineTo(dx + spread, 0);
  });
  legs(5, 3 + ext * 4, DEER.dark);            // far foreleg reaching
  legs(-5, -3 - ext * 4, DEER.dark);          // far hind leg pushing
  // Body, belly, white rump and tail.
  inked(ctx, DEER.body, (c) => c.ellipse(0, -8, 7.5, 3.4, -0.05, 0, TAU), 0.4);
  fillPath(ctx, DEER.belly, (c) => c.ellipse(0.5, -6.2, 5.5, 1.4, 0, 0, TAU));
  fillPath(ctx, DEER.rump, (c) => c.ellipse(-6.6, -8.4, 1.8, 2.2, 0, 0, TAU));
  // Neck and head, stretched forward at the gallop.
  inked(ctx, DEER.body, (c) => {
    c.moveTo(4.5, -10.5); c.quadraticCurveTo(7.5, -13.5, 9.5, -13.8);
    c.lineTo(10.2, -11.6); c.quadraticCurveTo(8, -10.5, 6, -7.2); c.closePath();
  }, 0.4);
  inked(ctx, DEER.body, (c) => c.ellipse(11, -13.2, 2.6, 1.5, 0.25, 0, TAU), 0.4);
  fillPath(ctx, DEER.dark, (c) => c.arc(13.3, -12.6, 0.55, 0, TAU));
  fillPath(ctx, DEER.eye, (c) => c.arc(10.9, -13.7, 0.4, 0, TAU));
  // Antlers: two swept-back beams with tines.
  line(ctx, DEER.antler, 0.6, (c) => {
    c.moveTo(10, -14.4); c.quadraticCurveTo(8.5, -18.5, 5.8, -20);
    c.moveTo(8.9, -17.1); c.lineTo(10.4, -19.2);
    c.moveTo(7.3, -19.2); c.lineTo(8, -21.2);
    c.moveTo(10.6, -14.6); c.quadraticCurveTo(10.2, -18.8, 8.2, -20.8);
  });
  // Near legs over the body.
  legs(4, -2 + ext * 6, DEER.body);
  legs(-4, 2 - ext * 6, DEER.body);
  ctx.restore();
}
// THE HERD'S DEER — CUT PAPER (Peter, 25 Sep 2026: "Let's do D - drop the red nose
// though"; the reindeer bake-off, src/dev/reindeer-candidates.js). Frost is cut paper,
// so the deer is too: flat pieces with no ink line, each laid over a hazy copy of itself
// a hair down and back (the cabinet's paper-shadow move), in colours pulled toward the
// far ridge so the herd sits in the landscape. The anatomy is a caribou's, simplified to
// what paper can cut: body over a paler belly, a pale rump, the neck with its hanging
// pale mane, a long head with a dark muzzle and a NOSE, an ear, flat strip antlers with
// the brow tine over the face, and jointed legs in a rotary gallop.
//
// `info.nose(ctx, x, y, r)` replaces the nose bead — the bake-off's red-nosed lead;
// the game never passes one.
const PAPER_DEER = {
  body: '#80634f', under: '#b49a80', mane: '#efe9df', rump: '#f6f2ea', head: '#8a6c57',
  muzzle: '#5a4538', nose: '#241a14', eye: '#1c1511', leg: '#5c4637', hoof: '#2c221b',
  // Mid tan, not the cream they were cut in (Peter, 25 Sep 2026: "the reindeers antlers
  // don't read so great against the background", then "go with c"): cream on the pale
  // snow sky vanished. Tan reads against it and stays lighter than the head.
  antler: '#9a7658', shadow: 'rgba(52,74,98,0.28)',
};
function strokePath(ctx, color, w, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
// A jointed leg: `ang` swings it from the hip (0 = straight down, + = forward), `bend`
// folds the lower half at the knee/hock, and the hoof is a short dark cap.
function deerLeg(ctx, hx, hy, ang, bend, l1, l2, w, color, hoof) {
  const kx = hx + Math.sin(ang) * l1, ky = hy + Math.cos(ang) * l1;
  const fx = kx + Math.sin(ang + bend) * l2, fy = ky + Math.cos(ang + bend) * l2;
  strokePath(ctx, color, w, (c) => { c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(fx, fy); });
  strokePath(ctx, hoof, w * 1.05, (c) => {
    c.moveTo(fx - Math.sin(ang + bend) * 0.7, fy - Math.cos(ang + bend) * 0.7); c.lineTo(fx, fy);
  });
}
function deerAntlers(c) {
  c.moveTo(10.2, -15.7); c.lineTo(8.9, -19.2); c.lineTo(6.4, -21.2);
  c.moveTo(8.9, -19.2); c.lineTo(9.9, -21.6);
  c.moveTo(7.6, -20.3); c.lineTo(7.7, -22.8);
  c.moveTo(11, -15.9); c.lineTo(10.7, -20); c.lineTo(8.6, -22.6);
  c.moveTo(10.7, -20); c.lineTo(12.1, -21.8);
  c.moveTo(11, -16.6); c.lineTo(12.8, -16.9); c.lineTo(13, -16);
}
function drawDeer(ctx, x, y, s, phase, tilt = 0, info = {}) {
  const P = PAPER_DEER;
  // A rotary gallop: fore pair reaching while the hind pair drives, each pair a little
  // out of step so the legs never scissor as one; knees fold as a foreleg comes forward.
  const a = phase * TAU;
  const foreBend = (v) => -0.9 * Math.max(0, Math.cos(v));
  const lift = Math.max(0, Math.sin(a)) * 0.45;
  const piece = (color, path) => {
    ctx.save(); ctx.translate(-0.35, 0.45); fillPath(ctx, P.shadow, path); ctx.restore();
    fillPath(ctx, color, path);
  };
  ctx.save();
  ctx.translate(x, y - lift * s);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  deerLeg(ctx, 4.2, -6.3, 0.62 * Math.sin(a - 0.5), foreBend(a - 0.5), 3.2, 3.4, 1.15, P.leg, P.hoof);
  deerLeg(ctx, -5, -6.7, 0.55 * Math.sin(a + Math.PI * 0.9 - 0.5), -0.35, 3.3, 3.5, 1.25, P.leg, P.hoof);
  piece(P.body, (c) => {
    c.moveTo(-7.8, -8.4); c.lineTo(-6.4, -11); c.lineTo(-1.5, -11.4); c.lineTo(3.8, -11.3);
    c.lineTo(6.6, -9.8); c.lineTo(6.6, -6.2); c.lineTo(0.5, -5.4); c.lineTo(-5.8, -5.8); c.closePath();
  });
  fillPath(ctx, P.under, (c) => { c.moveTo(-5, -6.6); c.lineTo(5.6, -7); c.lineTo(5.8, -6.2); c.lineTo(0.5, -5.5); c.lineTo(-5.2, -5.9); c.closePath(); });
  fillPath(ctx, P.rump, (c) => { c.moveTo(-7.9, -8.5); c.lineTo(-7, -10.2); c.lineTo(-6.3, -8.8); c.lineTo(-6.8, -7.1); c.closePath(); });
  // The neck in the body colour, the mane as a narrow hanging fringe under it.
  piece(P.body, (c) => {
    c.moveTo(3.4, -10.8); c.lineTo(6.8, -14.4); c.lineTo(9.6, -14.2); c.lineTo(9.8, -11.6); c.lineTo(7.4, -9.2); c.closePath();
  });
  fillPath(ctx, P.mane, (c) => {
    c.moveTo(5.2, -10.2); c.lineTo(9.7, -12.3); c.lineTo(9.3, -11); c.lineTo(8.3, -9.4);
    c.lineTo(7.7, -7.4); c.lineTo(7.1, -8.4); c.lineTo(6.5, -7.2); c.lineTo(6.1, -8.6); c.closePath();
  });
  piece(P.head, (c) => {
    c.moveTo(8.5, -15.1); c.lineTo(11.4, -16); c.lineTo(14.8, -13); c.lineTo(14.2, -11.5); c.lineTo(10.4, -11.4); c.closePath();
  });
  fillPath(ctx, P.muzzle, (c) => { c.moveTo(12.8, -14.3); c.lineTo(14.8, -13); c.lineTo(14.2, -11.5); c.lineTo(12.4, -11.5); c.closePath(); });
  if (info.nose) info.nose(ctx, 14.5, -12.6, 0.62);
  else fillPath(ctx, P.nose, (c) => c.arc(14.5, -12.6, 0.62, 0, TAU));
  fillPath(ctx, P.eye, (c) => c.arc(11.3, -14.4, 0.42, 0, TAU));
  piece(P.head, (c) => { c.moveTo(9.6, -15.4); c.lineTo(7.9, -17.1); c.lineTo(10.1, -16); c.closePath(); });
  // Antlers as cut strips: flat, a little broader than a stroke, over their shadow.
  // `info.antler` ({ fill, edge, edgeWidth }) is the antler bake-off's seam (Peter,
  // 25 Sep: make them stand out more); the game passes none.
  const antler = info.antler || {};
  ctx.save(); ctx.translate(-0.35, 0.45); strokePath(ctx, P.shadow, 0.85, deerAntlers); ctx.restore();
  if (antler.edge) strokePath(ctx, antler.edge, 0.85 + 2 * (antler.edgeWidth ?? 0.35), deerAntlers);
  strokePath(ctx, antler.fill || P.antler, 0.85, deerAntlers);
  deerLeg(ctx, 3.8, -6.2, 0.62 * Math.sin(a), foreBend(a), 3.2, 3.4, 1.25, P.leg, P.hoof);
  deerLeg(ctx, -5.4, -6.7, 0.55 * Math.sin(a + Math.PI * 0.9), -0.35, 3.3, 3.5, 1.35, P.leg, P.hoof);
  ctx.restore();
}

// Gallery seam (the reindeer bake-off, src/dev/reindeer-candidates.js): a candidate
// deer painter with drawDeer's signature plus `{ i, t }` — which deer of the herd (0 is
// the leader) and the clock — so a bake-off draws the real herd, on the real crest,
// under the real clip, with nothing forked. Null is the shipped deer.
let deerOverride = null;
export function setFrostDeerPainter(fn) { deerOverride = fn || null; }
export { drawDeer as drawFrostDeer, drawDeerV1 as drawFrostDeerV1, PAPER_DEER as FROST_DEER_PALETTE };

/**
 * The herd, `k` 0..1 through its crossing (0 = the leader entering at the left edge of
 * `view`, 1 = the last deer gone past the right). Feet on the far crest.
 */
export function drawFrostReindeer(ctx, t, k, view, crest, hides = []) {
  const from = view.left - 30, to = view.left + view.width + 30 + HERD[HERD.length - 1][0];
  const lead = from + (to - from) * k;
  ctx.save();
  // ON the snow, and BEHIND it (Peter, 24 Sep: "landing properly on top of the hills and
  // disappearing behind rocks"): each deer stands on the crest tilted to its slope, hooves
  // sunk a pixel in, and the herd is clipped to the sky side of the crest, so going over
  // the brow they drop out of sight behind it. Rocks and fortresses on this ridge are
  // drawn after the herd, so it passes behind those too.
  //
  // BUT A ROCK STOPS AT THE CREST. Scenery on this ridge is clipped to the snow line
  // exactly (frostClipToSnow), and the hooves are sunk 1.2 below it — so behind every
  // rock and fortress a sliver of hoof showed under its base (Peter, 24 Sep: "you can see
  // the bottom of their feet below the rocks on the hill"). `hides` are the x-spans of
  // the scenery standing on this crest; across them the herd is cut a touch ABOVE the
  // crest, so a deer walking behind a rock is hidden by it all the way down. On open
  // snow nothing changes.
  const hidden = (x) => hides.some(([a, b]) => x >= a && x <= b);
  ctx.beginPath();
  ctx.moveTo(view.left - 40, -200);
  ctx.lineTo(view.left + view.width + 40, -200);
  for (let x = view.left + view.width + 40; x >= view.left - 40; x -= 1) {
    ctx.lineTo(x, crest(x) + (hidden(x) ? -0.6 : 1.2));
  }
  ctx.closePath();
  ctx.clip();
  for (let i = HERD.length - 1; i >= 0; i--) {
    const [behind, ph, s] = HERD[i];
    const x = lead - behind;
    if (x < view.left - 30 || x > view.left + view.width + 30) continue;
    const tilt = Math.atan2(crest(x + 5) - crest(x - 5), 10) * 0.8;
    (deerOverride || drawDeer)(ctx, x, crest(x) + 1.2, 0.95 * s, (t * 2.2 + ph) % 1, tilt, { i, t });
  }
  ctx.restore();
}
