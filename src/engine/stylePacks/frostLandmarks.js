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
const DEER = {
  body: '#7a5a46', dark: '#5a4234', belly: '#d8c0a2', rump: '#f4ece0', antler: '#6a5240', eye: '#1a1210',
};
export const FROST_HERD_WINDOW = [0.78, 0.95];
const HERD = [
  // [offset behind the leader, stride phase, size]
  [0, 0.0, 1.0], [24, 0.35, 0.92], [44, 0.7, 1.06], [66, 0.15, 0.88], [86, 0.55, 0.96],
];
function drawDeer(ctx, x, y, s, phase, tilt = 0) {
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
/**
 * The herd, `k` 0..1 through its crossing (0 = the leader entering at the left edge of
 * `view`, 1 = the last deer gone past the right). Feet on the far crest.
 */
export function drawFrostReindeer(ctx, t, k, view, crest) {
  const from = view.left - 30, to = view.left + view.width + 30 + HERD[HERD.length - 1][0];
  const lead = from + (to - from) * k;
  ctx.save();
  // ON the snow, and BEHIND it (Peter, 24 Sep: "landing properly on top of the hills and
  // disappearing behind rocks"): each deer stands on the crest tilted to its slope, hooves
  // sunk a pixel in, and the herd is clipped to the sky side of the crest, so going over
  // the brow they drop out of sight behind it. Rocks and fortresses on this ridge are
  // drawn after the herd, so it passes behind those too.
  ctx.beginPath();
  ctx.moveTo(view.left - 40, -200);
  ctx.lineTo(view.left + view.width + 40, -200);
  for (let x = view.left + view.width + 40; x >= view.left - 40; x -= 2) ctx.lineTo(x, crest(x) + 1.2);
  ctx.closePath();
  ctx.clip();
  for (let i = HERD.length - 1; i >= 0; i--) {
    const [behind, ph, s] = HERD[i];
    const x = lead - behind;
    if (x < view.left - 30 || x > view.left + view.width + 30) continue;
    const tilt = Math.atan2(crest(x + 5) - crest(x - 5), 10) * 0.8;
    drawDeer(ctx, x, crest(x) + 1.2, 0.95 * s, (t * 2.2 + ph) % 1, tilt);
  }
  ctx.restore();
}
