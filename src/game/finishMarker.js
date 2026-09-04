// "This is the end of the level, and this is the thing you throw" — candidate
// treatments for the finish marker.
//
// BAKE-OFF, undecided. The shipped one is whichever id FINISH_MARKER points at;
// every other variant here stays drawable so the gallery section that decides
// it renders candidates through the exact code that would ship them. Same shape
// as BOOST_FX_VARIANTS in boostFx.js, and for the same reason.
//
// What is being decided is TWO things at once, because they are one object on
// screen: the pole (a striped barrier pole today, a flag in every candidate)
// and the switch (a small recessed box today). They are baked together because
// judging either alone is how the current one happened — a height gauge and a
// wall fitting, each defensible, reading together as a barrier standing next to
// an electrical box rather than as the end of a level.
//
// Every variant draws into WORLD space: `fx` is the pole's left edge, `gy` the
// ground under it. State comes in as
//   t              seconds, for idle motion (cloth, lamps)
//   thrown         0..1, smoothstepped, the lever's swing. 0 = untouched.
//   live           the throw scored — a CLUNK throws the lever and lights nothing
//   armed          the finish dash is running and the flip has not happened yet
//   reducedMotion  freeze anything that only decorates
//
// The results card is NOT here. It is gameplay UI drawn unscaled by run.js over
// whichever marker ships, and every candidate has to leave room for it in the
// same place. A flip bracket and a BREAKER/JUMP! signage plate used to sit there
// too; both were cut, and drawFinishMarker in run.js keeps the reasons.

import { drawProp, propFrames, propFps } from '../sprites/props.js';
import { CLING_POLE_X } from '../sprites/toons.js';

// The pole's height is a gameplay constant, not a drawing one: at 80px
// Lorenzo's 89px peak carried him clean off the top and into the HUD chips on a
// good flip, which reads as overshooting the goal rather than topping it out.
// 96 clears the tallest single jump in the cast, so a PERFECT always lands ON
// the pole. Mochi's second jump still goes over, which is Mochi being Mochi.
export const POLE_H = 96;
// And its width, which the flip bracket and the signage are both placed off.
// Two. It was five (a post), then three, and three still carried a visible
// batter and a lit edge inside it — at this size that is three tones across a
// shaft, which is what kept reading as chunky. Two is one tone plus a contour,
// which is what a flagpole is. The pole is drawn here rather than taken from
// the flag prop (whose own shaft is 5 at this art size), so the cloth stays the
// size it wants while the mast under it gets finer.
export const POLE_W = 2;

// Where the plunger's centre sits relative to the marker anchor. The hero has
// to land dead on this — it is the cap he stands on to celebrate — so run.js
// snaps him to it rather than stopping him wherever the dash's last frame fell.
export const PLUNGER_CX = POLE_W / 2;
// How far RIGHT of the plunger the mast stands, in marker pixels.
//
// The marker's anchor is the PLUNGER — the thing the hero lands on and
// celebrates on top of — and the pole is offset from it, rather than the two
// sharing a centre line and the hero shuffling sideways between the ride and
// the payoff. It is exactly one hero's reach: he rides down standing over the
// cap with his pole-side arm out, and when he lets go he is already where he
// needs to be.
//
// 24 is HERO_DRAW_H. It is not imported: that constant lives in draw.js, which
// imports run.js, which imports this file — a three-module cycle to fetch one
// integer is worse than the integer.
//
// NOT rounded, and the arithmetic is exact rather than eyeballed. The mast and
// the plunger are drawn off the same PLUNGER_CX base offset, so with the hero
// centred on the plunger, mast centre = anchor + POLE_STANDOFF + PLUNGER_CX and
// hand = anchor + PLUNGER_CX + reach — equal precisely when this is the reach.
// Round it and the hand sits a pixel off the shaft it is supposed to be
// holding, which at lane size is the difference between gripping a pole and
// pointing at one.
export const POLE_STANDOFF = CLING_POLE_X * 24;

// The flag props are authored SQUARE and the pole they hang on is 96 tall, so
// every flag variant is drawn in two pieces: the art supplies the top — cloth,
// finial, upper pole — and the shaft is continued underneath in the prop's own
// teal so the join is invisible. 36 is chosen because the art's pole (w * 0.14)
// lands on exactly the 5px the striped pole was, which keeps the flip bracket,
// the switch and the signage sitting where they already sit.
const FLAG_ART = 36;

// ------------------------------------------------------------------ the ink
//
// Every hard edge on this marker used to be drawn as a slightly larger black
// shape behind a fill. That is a cheap outline and it has two costs: the weight
// is whatever the offset happens to be (typically a full pixel, which the
// camera then magnifies), and the corners are as square as the rectangle that
// made them. Stacked up — flange, post, cap, pad, leg, head — it turned an
// instrument into a set of black-bordered blocks.
//
// So the marker's hardware is stroked instead: one ink, a fraction of a pixel
// wide, with round joins and caps. Fine enough to read as a drawn contour
// rather than a border, and rounded everywhere, which is what makes cast metal
// look cast rather than cut.
const INK = 'rgba(11,11,20,0.75)';
const INK_W = 0.5;

// A rounded rectangle, clamped so a radius can never exceed the shape — the
// small parts here (a 4px cap, a 3px bolt) would otherwise invert.
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// Fill a path and lay the marker's contour on it.
function inked(ctx, fill, pathFn, { lw = INK_W, ink = INK } = {}) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

// A closed polygon with every corner rounded off — for the shapes here that are
// not rectangles (the tapered shaft, the slanted head of the box).
function roundPoly(c, pts, r) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.moveTo(...mid(pts[n - 1], pts[0]));
  for (let i = 0; i < n; i++) {
    const cur = pts[i], next = pts[(i + 1) % n];
    c.arcTo(cur[0], cur[1], ...mid(cur, next), r);
    c.lineTo(...mid(cur, next));
  }
  c.closePath();
}

// The mast, drawn here rather than borrowed from the prop. Fine, tapered, and
// carrying enough hardware to be an object: a swaged base, three collars up the
// shaft, a cleat where a halyard would be made off, and a proper finial. None of
// it costs more than a fill, and together they are the difference between a
// flagpole and a green rectangle.
function mast(ctx, fx, gy, { lit = true } = {}) {
  const cx = fx + POLE_W / 2;
  const top = gy - POLE_H;
  // RED dead, GREEN live — the same two colours the lamp pair is wired with, so
  // the pole is a third indicator rather than a piece of scenery that happens to
  // change hue. It also means the whole marker answers at once: from across the
  // lane you read the pole, up close you read the lamps, and they can never
  // disagree because both are driven by the one flag.
  //
  // The teal it replaces was the game's own accent, which is exactly why it had
  // to go: teal says MASHENSTEIN, it does not say off or on.
  const body = lit ? '#3fb45e' : '#a4392c';
  const dark = lit ? 'rgba(10,40,20,0.55)' : 'rgba(46,12,10,0.55)';
  const lite = lit ? 'rgba(226,255,232,0.5)' : 'rgba(255,214,206,0.22)';
  // Taper: the shaft is POLE_W at the top and a touch over at the foot, drawn
  // as a trapezium. A parallel-sided pole 96 tall is the thing that reads as a
  // plank; two pixels of batter is all it takes to stop.
  const halfTop = POLE_W / 2, halfBot = POLE_W / 2 + 0.7;
  const shaft = (c) => {
    c.moveTo(cx - halfTop, top);
    c.lineTo(cx + halfTop, top);
    c.lineTo(cx + halfBot, gy);
    c.lineTo(cx - halfBot, gy);
    c.closePath();
  };
  // One stroked shaft rather than a fill sitting on a fatter dark copy of
  // itself: on a 2px mast that copy WAS the pole, and it read as a black stick
  // with a green core.
  inked(ctx, body, shaft, { lw: 0.45, ink: dark });
  // Lit edge down the left, stopping short of the base so the shaft reads as
  // round rather than as a flat strip with a stripe on it.
  ctx.fillStyle = lite;
  ctx.fillRect(cx - halfTop + 0.2, top + 6, 0.6, POLE_H * 0.62);
  // Collars. Three, unevenly spaced — evenly spaced reads as a scale.
  for (const f of [0.22, 0.55, 0.8]) {
    const y = top + POLE_H * f;
    const half = halfTop + (halfBot - halfTop) * f + 0.6;
    inked(ctx, lit ? '#2b8c48' : '#7d2a20',
      (c) => rr(c, cx - half, y, half * 2, 1.1, 0.5), { lw: 0.3 });
  }
  // Cleat: the small horn a halyard is made off on. It is the one asymmetric
  // mark on the shaft, which is what stops the pole reading as a mirror of
  // itself, and it sits at hand height because that is where a cleat goes.
  const cleat = lit ? '#9ec4a8' : '#c08c82';
  inked(ctx, cleat, (c) => rr(c, cx + halfBot - 0.3, gy - 34, 2.6, 0.9, 0.4), { lw: 0.28 });
  inked(ctx, cleat, (c) => rr(c, cx + halfBot + 1.7, gy - 35.2, 0.9, 2.6, 0.4), { lw: 0.28 });
  // Finial: a ball, and nothing above it. The spike is gone — on a 2px mast it
  // was a third mark stacked on a shaft that already ends in one, and at lane
  // size the three collapsed into a smudge.
  //
  // RED, matching the plunger cap. Gold put the top of the pole in the same
  // colour as the coins, the boost pads and the HUD chips; red is worn by
  // exactly two things at the end of a stage — the thing you press and the thing
  // that goes up when you press it — which is a pairing worth spending the
  // game's rarest colour on.
  inked(ctx, lit ? '#d8452f' : '#8f3226',
    (c) => c.arc(cx, top - 1.5, 2.6, 0, Math.PI * 2), { lw: 0.4 });
  ctx.fillStyle = lit ? '#f89070' : '#b85c4a';
  ctx.beginPath();
  ctx.arc(cx - 0.7, top - 2.2, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

// The flag prop supplies the CLOTH only. Its authored shaft and finial are
// clipped off at the hoist so the fine mast above can stand in their place —
// the cloth starts at 0.2 of the art box and the shaft ends at 0.23, so there
// is a clean seam to cut on that costs no cloth.
function flagCloth(ctx, fx, gy, name, { t, reducedMotion }, flagT = 1) {
  const top = gy - POLE_H - FLAG_ART * 0.06;
  const frame = reducedMotion ? 0 : Math.floor(t * propFps(name)) % propFrames(name);
  // The cut has to clear the prop's OWN hardware, not just start where its
  // cloth does. flagWave draws a teal staff spanning 0.09–0.23 of the art box
  // and a gold finial disc spanning 0.07–0.25, and a seam at 0.2 left slivers
  // of both: a yellow crumb sitting on the flag's top corner and a teal thread
  // hanging below the cloth, which read as a second little flagpole drawn on
  // the fabric of the first. Cutting at 0.25 removes the staff, the finial and
  // the thread in one line — and the art box shifts the same 0.05 to the left
  // so the surviving cloth lands exactly where it always did.
  const artX = fx - FLAG_ART * 0.14;
  const hoist = artX + FLAG_ART * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(hoist, top - FLAG_ART, FLAG_ART * 2, FLAG_ART * 2 * flagT + (flagT >= 1 ? FLAG_ART : 0));
  ctx.clip();
  drawProp(ctx, name, artX, top, FLAG_ART, FLAG_ART, frame);
  ctx.restore();
}

function flagPole(ctx, fx, gy, name, s) {
  mast(ctx, fx, gy, { lit: true });
  flagCloth(ctx, fx, gy, name, s, s.flagT === undefined ? 1 : s.flagT);
}

// The pole that ships today: twelve gold/black chequer segments. Correct as a
// height gauge and completely mute about what it marks.
function chequerPole(ctx, fx, gy) {
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f6d33c' : '#0b0b14';
    ctx.fillRect(fx, gy - POLE_H + i * 8, POLE_W, 8);
  }
}

// ------------------------------------------------------------- the switches

// The switch that ships today. A recessed housing, four corner bolts and a
// sunken slot for the lever to sit in — eight fills that make it an object with
// fixtures instead of a shape. It used to be one flat rectangle, which read as
// a doorway with a yellow plank taped across it.
function boxSwitch(ctx, fx, gy, { thrown, live }) {
  ctx.fillStyle = '#232f3c';
  ctx.fillRect(fx + 6, gy - 36, 20, 36);
  ctx.fillStyle = '#3a4a5a';
  ctx.fillRect(fx + 7, gy - 34, 18, 33);
  ctx.fillStyle = '#4d6172';                       // top bevel, so it has a lid
  ctx.fillRect(fx + 7, gy - 34, 18, 2);
  ctx.fillStyle = '#1a2430';                       // the slot the lever throws in
  ctx.fillRect(fx + 11, gy - 30, 10, 20);
  ctx.fillStyle = '#5d7385';                       // bolts
  for (const [bx, by] of [[8, -32], [23, -32], [8, -4], [23, -4]]) ctx.fillRect(fx + bx, gy + by, 2, 2);
  // The lit face. Dead grey until the lever lands, then warm — the smallest
  // possible version of the power-restore payoff. The SLOT lights and a rim
  // runs round the face; flooding the whole face read as a second door rather
  // than as something switching on, and the lever lost its silhouette against it.
  if (live) {
    ctx.fillStyle = `rgba(246,211,60,${(0.2 + 0.6 * thrown).toFixed(3)})`;
    ctx.fillRect(fx + 11, gy - 30, 10, 20);
    ctx.fillStyle = `rgba(255,240,160,${(0.55 * thrown).toFixed(3)})`;
    ctx.fillRect(fx + 7, gy - 34, 18, 1);
    ctx.fillRect(fx + 7, gy - 2, 18, 1);
    ctx.fillRect(fx + 7, gy - 34, 1, 33);
    ctx.fillRect(fx + 24, gy - 34, 1, 33);
  }
  // The lever. Rest is cocked up and back; the throw sweeps it forward through
  // its pivot, which is what the hero's weight is doing to it. Pivoted at the
  // centre of the slot so the whole sweep stays on the box face, and stubby —
  // at 12 long and 4 wide it read as a plank leaning on a door.
  ctx.save();
  ctx.translate(fx + 16, gy - 20);
  ctx.rotate(-0.9 + 1.8 * thrown);
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(-3, -10, 6, 11);       // dark backing, so it reads against the lit slot
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(-2, -9, 4, 10);
  ctx.fillStyle = '#fff0a0';
  ctx.fillRect(-2, -9, 4, 3);         // the grip
  ctx.restore();
  ctx.fillStyle = '#5d7385';
  ctx.fillRect(fx + 15, gy - 21, 2, 2);   // pivot pin
}

// A knife switch: open contacts, a long handled blade, and an arc that snaps
// between the jaws as it closes. The point of it is that the mechanism is
// OUTSIDE the housing — you can see the circuit being completed, where the box
// hides the entire event inside a slot 10px wide.
function knifeSwitch(ctx, fx, gy, { thrown, live, t, reducedMotion }) {
  const bx = fx + 5;
  // Backplate: slate, bevelled, standing on two feet so it reads as bolted to
  // the ground rather than floating on the lane.
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(bx, gy - 40, 30, 40);
  ctx.fillStyle = '#33445a';
  ctx.fillRect(bx + 1, gy - 38, 28, 37);
  ctx.fillStyle = '#4d6172';
  ctx.fillRect(bx + 1, gy - 38, 28, 2);
  ctx.fillStyle = '#5d7385';
  for (const [ox, oy] of [[2, -36], [26, -36], [2, -4], [26, -4]]) ctx.fillRect(bx + ox, gy + oy, 2, 2);
  // The two contacts. Lower jaw is the one the blade lands in.
  const jawX = bx + 22, jawY = gy - 12, pivX = bx + 7, pivY = gy - 26;
  ctx.fillStyle = '#8c6a2f';
  ctx.fillRect(jawX - 2, jawY - 4, 5, 9);
  ctx.fillRect(pivX - 2, pivY - 3, 5, 7);
  ctx.fillStyle = '#c89a3e';
  ctx.fillRect(jawX - 1, jawY - 3, 3, 7);
  ctx.fillRect(pivX - 1, pivY - 2, 3, 5);
  // The blade, hinged at the upper contact and swinging down into the jaw.
  const a0 = -1.15, a1 = Math.atan2(jawY - pivY, jawX - pivX);
  const ang = a0 + (a1 - a0) * thrown;
  const len = Math.hypot(jawX - pivX, jawY - pivY);
  ctx.save();
  ctx.translate(pivX, pivY);
  ctx.rotate(ang);
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(-1, -3, len + 3, 6);
  ctx.fillStyle = '#c8d4e0';
  ctx.fillRect(0, -2, len + 1, 4);
  ctx.fillStyle = '#eef4fa';
  ctx.fillRect(0, -2, len + 1, 1);        // top light, same direction as the box
  ctx.fillStyle = '#d8452f';              // the handle, the only red on the marker
  ctx.fillRect(len - 4, -4, 6, 8);
  ctx.fillStyle = '#f08060';
  ctx.fillRect(len - 4, -4, 6, 2);
  ctx.restore();
  ctx.fillStyle = '#5d7385';
  ctx.fillRect(pivX - 1, pivY - 1, 2, 2);
  // The arc. It strikes across the closing gap in the last third of the swing,
  // which is the whole reason to draw an open mechanism — and then holds as a
  // steady band of light between the jaws once the circuit is made.
  if (thrown > 0.62) {
    const strike = Math.min(1, (thrown - 0.62) / 0.2);
    const flick = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.abs(Math.sin(t * 41));
    ctx.strokeStyle = `rgba(190,240,255,${(strike * flick * (live ? 1 : 0.5)).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(pivX, pivY);
    for (let i = 1; i <= 4; i++) {
      const p = i / 4;
      const jitter = reducedMotion ? 0 : (((i * 7 + Math.floor(t * 24)) % 5) - 2) * 1.1 * (1 - p);
      ctx.lineTo(pivX + (jawX - pivX) * p + jitter, pivY + (jawY - pivY) * p + jitter);
    }
    ctx.stroke();
  }
}

// A wall panel: the lever plus two lamps and a needle that swings across a
// dial. The only candidate that STATES the result rather than implying it —
// red goes dark, green comes up, the needle pins. Busiest of the three, and the
// one most likely to read as HUD stuck to a wall.
// POWER IS NOT THE GRADE. Everything in here keys on `thrown` rather than on
// `live`: the stage clears whether the flip scored or not, so the power came
// back either way and the panel has to say so. A CLUNK is worth zero POINTS —
// it is not a level that stayed dark. What `live` gates is the flourish (the
// surge up the pole, the sparks, how hard the flag snaps out), which is the
// right place for a grade to live: how much the payoff celebrates, not whether
// the fiction resolves.
function panelSwitch(ctx, fx, gy, { thrown, live, t, reducedMotion, noLever = false }) {
  const bx = fx + 5, W = 30, H = 54;
  const top = gy - H;
  // SUNK, not stood on. Everything on this marker used to sit on the ground
  // line like furniture placed on a shelf; three pixels below it and a shadow
  // pooled at the foot is all it takes for the cabinet to be planted in the
  // world the hero is running through.
  const foot = gy + 3;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#0b0b14';
  ctx.beginPath();
  ctx.ellipse(bx + W / 2, gy + 1, W * 0.62, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Carcass, with a lid that overhangs — a box whose top plane is the same
  // width as its front is a rectangle, and every real cabinet has a drip edge.
  ctx.fillStyle = '#141c26';
  ctx.fillRect(bx - 1, top - 2, W + 2, H + 5);
  ctx.fillStyle = '#33445a';
  ctx.fillRect(bx, top, W, foot - top);
  ctx.fillStyle = '#4d6172';
  ctx.fillRect(bx - 1.5, top - 2, W + 3, 3);        // lid, proud of the body
  ctx.fillStyle = '#5d7385';
  ctx.fillRect(bx - 1.5, top - 2, W + 3, 1);
  ctx.fillStyle = '#28374a';                        // shadow under the lid
  ctx.fillRect(bx, top + 1, W, 1.5);

  // Door: a seam down the right third, hinges on its left, latch on its right.
  const seam = bx + W * 0.16;
  ctx.fillStyle = '#28374a';
  ctx.fillRect(seam, top + 3, 1, H - 6);
  ctx.fillStyle = '#3a4c62';
  ctx.fillRect(seam + 1, top + 3, 0.8, H - 6);
  ctx.fillStyle = '#5d7385';
  for (const hy of [top + 8, gy - 12]) {            // hinge barrels
    ctx.fillRect(seam - 2.2, hy, 3, 4);
    ctx.fillStyle = '#8496a8';
    ctx.fillRect(seam - 2.2, hy, 3, 1);
    ctx.fillStyle = '#5d7385';
  }
  ctx.fillStyle = '#8496a8';                        // latch
  ctx.fillRect(bx + W - 4, gy - 26, 2.4, 5);
  ctx.fillStyle = '#c8d4e0';
  ctx.fillRect(bx + W - 4, gy - 26, 2.4, 1.4);

  // Corner screws, cross-slotted. Four marks that cost two fills each and do
  // more for "this is a made thing" than any amount of shading.
  ctx.fillStyle = '#8496a8';
  for (const [sx, sy] of [[3, 4], [W - 3, 4], [3, H - 5], [W - 3, H - 5]]) {
    ctx.fillRect(bx + sx - 1, top + sy - 1, 2, 2);
    ctx.fillStyle = '#2a3a4c';
    ctx.fillRect(bx + sx - 1, top + sy - 0.2, 2, 0.6);
    ctx.fillStyle = '#8496a8';
  }

  // Louvres. Four slots at the bottom left, angled by drawing each as a lit
  // lip over a dark mouth — vents are how a metal box says it has something
  // running inside it.
  for (let i = 0; i < 4; i++) {
    const ly = gy - 11 + i * 2.6;
    ctx.fillStyle = '#121a24';
    ctx.fillRect(bx + 3, ly, 10, 1.4);
    ctx.fillStyle = '#5d7385';
    ctx.fillRect(bx + 3, ly + 1.4, 10, 0.6);
  }

  // Label plate: a pale strip with three bars of "text" on it. At lane size it
  // is texture; at gallery size it reads as a rating plate, which is exactly
  // what a breaker cabinet carries.
  ctx.fillStyle = '#c8d4e0';
  ctx.fillRect(bx + 16, gy - 11, 11, 8);
  ctx.fillStyle = '#8496a8';
  ctx.fillRect(bx + 16, gy - 11, 11, 1.2);
  ctx.fillStyle = '#3a4c62';
  for (let i = 0; i < 3; i++) ctx.fillRect(bx + 17.2, gy - 8.6 + i * 2, 8 - i * 2.4, 0.9);

  // Warning chevrons along the very bottom: the one place on the marker the
  // old striped pole's black-and-gold survives, doing a job it is actually
  // good at.
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, gy - 2.4, W, 2.4);
  ctx.clip();
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(bx, gy - 2.4, W, 2.4);
  ctx.fillStyle = '#0b0b14';
  for (let i = -1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + i * 4, gy);
    ctx.lineTo(bx + i * 4 + 2, gy);
    ctx.lineTo(bx + i * 4 + 4.4, gy - 2.4);
    ctx.lineTo(bx + i * 4 + 2.4, gy - 2.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Dial, in a bezel. The bezel is the difference between a gauge and a hole:
  // a ring of light on top, a shadow under, and the face recessed inside it.
  const dx = bx + 15, dy = gy - 32;
  ctx.fillStyle = '#5d7385';
  ctx.beginPath();
  ctx.arc(dx, dy, 10.5, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8496a8';
  ctx.beginPath();
  ctx.arc(dx, dy, 10.5, Math.PI, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#101823';
  ctx.beginPath();
  ctx.arc(dx, dy, 9, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a2634';                        // glass, catching the sky
  ctx.beginPath();
  ctx.arc(dx, dy, 9, Math.PI, Math.PI * 1.35);
  ctx.closePath();
  ctx.fill();
  // Ticks: minor every eighth, major every quarter, and a red band at the top
  // end so the needle pinning there means something.
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const long = i % 2 === 0;
    ctx.fillStyle = i >= 7 ? '#e24a3a' : '#8496a8';
    ctx.fillRect(dx + Math.cos(a) * (long ? 6.4 : 7) - 0.5, dy + Math.sin(a) * (long ? 6.4 : 7) - 0.5,
      long ? 1.4 : 1, long ? 1.4 : 1);
  }
  ctx.fillStyle = 'rgba(226,74,58,0.5)';
  ctx.beginPath();
  ctx.arc(dx, dy, 8, Math.PI * 1.86, Math.PI * 2);
  ctx.arc(dx, dy, 6.6, Math.PI * 2, Math.PI * 1.86, true);
  ctx.closePath();
  ctx.fill();
  // Idle needle drifts; the throw pins it hard right and it settles with a
  // single overshoot, which is what a meter slammed to full actually does.
  const idle = reducedMotion ? 0.12 : 0.12 + 0.05 * Math.sin(t * 2.3);
  const settle = thrown >= 1 ? 1 + 0.05 * Math.sin(t * 12) * Math.max(0, 1 - (t % 4)) : thrown;
  const nd = idle + (0.95 - idle) * settle;
  const na = Math.PI + nd * Math.PI;
  ctx.strokeStyle = '#0b0b14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(dx + Math.cos(na) * 7.6, dy + Math.sin(na) * 7.6);
  ctx.stroke();
  ctx.strokeStyle = thrown > 0.5 ? '#ffe486' : '#e8eef4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(dx + Math.cos(na) * 7.6, dy + Math.sin(na) * 7.6);
  ctx.stroke();
  ctx.fillStyle = '#8496a8';                        // spindle
  ctx.beginPath();
  ctx.arc(dx, dy, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Two lamps in bezels, hard-wired opposites so the panel can only ever say
  // one thing.
  const lamp = (lx, on, hot, cold) => {
    ctx.fillStyle = '#5d7385';
    ctx.beginPath();
    ctx.arc(lx, gy - 20, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0b14';
    ctx.beginPath();
    ctx.arc(lx, gy - 20, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? hot : cold;
    ctx.beginPath();
    ctx.arc(lx, gy - 20, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // A lit lamp throws; an unlit one is a dark bead. Without the halo both are
    // the same object in two colours and the panel reads as painted rather than
    // as switched. The pinprick is the filament.
    if (on) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = hot;
      ctx.beginPath();
      ctx.arc(lx, gy - 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(lx - 0.7, gy - 20.8, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const done = thrown > 0.6;
  lamp(bx + 7, !done, '#e24a3a', '#4a201e');
  lamp(bx + 23, done, '#60dc78', '#1c4024');

  // Cable gland: where the cable from the plunger enters the carcass. Without
  // it the cable ends against a flat wall and the two objects are joined by a
  // line rather than wired together.
  ctx.fillStyle = '#5d7385';
  ctx.fillRect(bx - 3, gy - 9, 4, 4);
  ctx.fillStyle = '#8496a8';
  ctx.fillRect(bx - 3, gy - 9, 4, 1.2);
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(bx - 4, gy - 8.4, 2, 2.8);

  // The lever, in a slot along the bottom so it does not fight the dial. The
  // plunger variant suppresses it: once the trigger stands on its own at the
  // pole, a second thing that looks throwable on the box is a lie.
  if (noLever) return;
  ctx.fillStyle = '#101823';
  ctx.fillRect(bx + 5, gy - 12, 18, 10);
  ctx.save();
  ctx.translate(bx + 14, gy - 7);
  ctx.rotate(-0.85 + 1.7 * thrown);
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(-2.5, -9, 5, 10);
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(-1.5, -8, 3, 9);
  ctx.fillStyle = '#fff0a0';
  ctx.fillRect(-1.5, -8, 3, 3);
  ctx.restore();
}

// The switch built INTO the pole: the shaft widens into a housing at the base
// and the lever comes straight out of it, so pole and switch are one silhouette
// instead of two objects standing next to each other. The narrowest candidate
// by a long way, which is the argument for it — see the framing row.
function mastSwitch(ctx, fx, gy, { thrown, live }) {
  const cx = fx + POLE_W / 2;
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(cx - 9, gy - 30, 18, 30);
  ctx.fillStyle = '#2f8f84';                 // the pole's own teal, not steel
  ctx.fillRect(cx - 8, gy - 28, 16, 27);
  ctx.fillStyle = '#48c8b0';
  ctx.fillRect(cx - 8, gy - 28, 16, 2);
  ctx.fillStyle = '#12312c';
  ctx.fillRect(cx - 5, gy - 24, 10, 16);
  ctx.fillStyle = '#1b4a44';
  for (const [ox, oy] of [[-7, -26], [5, -26], [-7, -4], [5, -4]]) ctx.fillRect(cx + ox, gy + oy, 2, 2);
  if (live) {
    ctx.fillStyle = `rgba(246,211,60,${(0.2 + 0.6 * thrown).toFixed(3)})`;
    ctx.fillRect(cx - 5, gy - 24, 10, 16);
    ctx.fillStyle = `rgba(255,240,160,${(0.5 * thrown).toFixed(3)})`;
    ctx.fillRect(cx - 8, gy - 28, 16, 1);
  }
  ctx.save();
  ctx.translate(cx, gy - 16);
  ctx.rotate(-0.95 + 1.85 * thrown);
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(-3, -11, 6, 12);
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(-2, -10, 4, 11);
  ctx.fillStyle = '#fff0a0';
  ctx.fillRect(-2, -10, 4, 3);
  ctx.restore();
  ctx.fillStyle = '#48c8b0';
  ctx.fillRect(cx - 1, gy - 17, 2, 2);
}

// --------------------------------------------------------- the dead flag
// The fiction problem, and the fix for it.
//
// A chequered race flag is the single most "CROSS THIS LINE" symbol there is,
// and crossing a line is not the verb here — the verb is jump and throw. Flown
// on the approach it promises a finish you run through, and then a lever swings
// and lamps come on with no causal link between the two: the flag marks the end
// and the switch causes it, and nothing on screen says why one leads to the
// other.
//
// So the flag stops being a marker and becomes the RESULT. The stage is dark
// because the power is out — that is the whole premise — so the flag hangs dead
// on its pole: drained of colour, limp, not moving. It is the same information
// ("this is the end") with none of the false promise, because a dead flag is
// obviously waiting for something. Throw the switch and it unfurls, takes its
// colour back and flies. Cause, then effect, on one object: you did not cross
// the flag, you switched it on.
//
// A CLUNK leaves it dead, which is the harshest and clearest reading of a flip
// worth nothing the game has.
function deadFlag(ctx, fx, gy) {
  const top = gy - POLE_H;
  // Same mast, drained: the moment it lights is a change in the whole object
  // rather than in the cloth alone, so the pole has to be visibly out too.
  mast(ctx, fx, gy, { lit: false });
  // The cloth, hanging. Gravity does all the work: one heavy fold down the pole
  // with a kink two thirds of the way, which is what a sheet with no wind in it
  // does. Never symmetrical, or it reads as a banner.
  //
  // Deliberately WIDE. The first pass drew it 8px across and it read as a smear
  // down the pole rather than as a flag waiting — at the size this sits on
  // screen a hanging sheet needs enough width to still be a quadrilateral.
  const cx = fx + POLE_W - 1;
  const fold = (c) => {
    c.moveTo(cx, top + 3);
    c.quadraticCurveTo(cx + 15, top + 13, cx + 11, top + 27);
    c.quadraticCurveTo(cx + 9, top + 37, cx + 13, top + 45);
    c.lineTo(cx + 1, top + 41);
    c.quadraticCurveTo(cx + 3, top + 24, cx, top + 3);
    c.closePath();
  };
  ctx.fillStyle = '#6e7076';
  ctx.beginPath();
  fold(ctx);
  ctx.fill();
  // Two dark cells, so the chequer survives the fold and the flag that comes up
  // is recognisably the same flag that was hanging there.
  ctx.save();
  ctx.beginPath();
  fold(ctx);
  ctx.clip();
  ctx.fillStyle = '#31313a';
  ctx.fillRect(cx + 7, top, 12, 22);
  ctx.fillRect(cx - 2, top + 22, 10, 26);
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,18,22,0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  fold(ctx);
  ctx.stroke();
}

// The live flag revealed from the hoist outward, which is a sheet catching wind
// rather than a picture fading in. `k` runs 0..1 over the first half-second
// after the throw.
function wakingFlag(ctx, fx, gy, name, s, k) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx - FLAG_ART, gy - POLE_H - FLAG_ART,
    FLAG_ART + POLE_W + FLAG_ART * k, POLE_H + FLAG_ART * 2);
  ctx.clip();
  flagPole(ctx, fx, gy, name, s);
  ctx.restore();
}

// ------------------------------------------------------------- the payoff
// What the throw does OUTSIDE the switch. The shipped marker keeps everything
// inside a 10px slot, which is why the flip lands as a lever moving rather than
// as power coming back — and why the framing question is on the table at all:
// none of this is worth drawing if it happens 6px from the right edge.

// Light climbing the pole from the switch to the finial, arriving as the cloth
// lights. The pole is already the tallest thing on screen, so it is the biggest
// surface the payoff can use without adding an object.
function poleSurge(ctx, fx, gy, { thrown, live }) {
  if (!live || thrown <= 0) return;
  // A travelling BAND, not a fill. The first pass lit the whole shaft from the
  // switch up and held it there, which turned a teal pole into a beige stick
  // for the rest of the frame — the payoff read as the marker changing colour
  // rather than as current running through it. A pulse passes and leaves the
  // pole exactly as it found it, which is what current does.
  const BAND = 20;
  const rise = Math.min(1, thrown * 1.35);
  const head = gy - (POLE_H + BAND) * rise;
  ctx.save();
  // Body of the pulse, fading off behind the head.
  for (let i = 0; i < 5; i++) {
    const y = head + i * (BAND / 5);
    if (y > gy) break;
    ctx.globalAlpha = 0.5 * (1 - i / 5) * (1 - Math.max(0, thrown - 0.8) / 0.2);
    ctx.fillStyle = '#ffe486';
    ctx.fillRect(fx - 1, y, POLE_W + 2, BAND / 5 + 0.5);
  }
  // The head itself, white and narrow. This is the only mark that has to be
  // seen; everything behind it is the tail it drags.
  if (head >= gy - POLE_H - 2 && head <= gy) {
    ctx.globalAlpha = 0.95 * (1 - Math.max(0, thrown - 0.8) / 0.2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 2, head, POLE_W + 4, 2.5);
  }
  // Arrival bloom at the finial: the pulse reaching the top is the moment the
  // flag has its reason to fly, so it lands ON the flag rather than under it.
  if (rise > 0.82) {
    const bloom = Math.min(1, (rise - 0.82) / 0.18) * (1 - Math.max(0, thrown - 0.85) / 0.15);
    // Kept small on purpose: at ten pixels of radius it read as a moon rising
    // behind the flag rather than as the finial taking the charge.
    ctx.globalAlpha = Math.max(0, bloom) * 0.55;
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath();
    ctx.arc(fx + POLE_W / 2, gy - POLE_H + 2, 3 + bloom * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Sparks off the contact, thrown FORWARD along the lane. This is the mark that
// needs the room: it lands to the right of the switch, which is exactly where
// the frame edge is today.
function contactSparks(ctx, fx, gy, { thrown, live }) {
  if (!live || thrown <= 0) return;
  const age = thrown;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const spread = (i - 3) / 3;
    const dist = age * (14 + i * 6);
    const sx = fx + 20 + dist;
    const sy = gy - 18 - spread * 12 * age - age * age * 6;
    ctx.globalAlpha = Math.max(0, 0.9 - age * 0.9);
    ctx.fillStyle = i % 2 ? '#fff6d0' : '#ffd447';
    ctx.fillRect(sx, sy, 2, 1);
  }
  ctx.restore();
}

export const FINISH_MARKER_VARIANTS = [
  {
    id: 'chequer',
    name: 'WAS — striped pole + recessed box',
    note: 'The control, and the thing being replaced. Twelve gold/black chequer segments and a small '
      + 'recessed housing with a lever in a slot. Every part of it is defensible on its own and the pair '
      + 'reads as a barrier pole standing next to an electrical box — nothing says END OF LEVEL, and the '
      + 'whole payoff happens inside a slot 10px wide, so the flip lands as a lever moving rather than as '
      + 'power coming back.',
    draw(ctx, fx, gy, s) {
      chequerPole(ctx, fx, gy);
      boxSwitch(ctx, fx, gy, s);
    },
  },
  {
    id: 'flagBox',
    name: 'A — flag + the box as-is',
    note: 'The minimum change: the bake-off\'s picked flag (flagWave, chequer cloth on a teal pole with a '
      + 'gold finial) hung on the same 96px pole, with today\'s switch untouched underneath. Answers "was '
      + 'the pole the problem?" on its own. The cloth waves on the approach, so the marker is alive '
      + 'before you reach it, which the striped pole never was.',
    draw(ctx, fx, gy, s) {
      flagPole(ctx, fx, gy, 'flagWave', s);
      boxSwitch(ctx, fx, gy, s);
    },
  },
  {
    id: 'flagSurge',
    name: 'B — flag + box, payoff climbs the pole',
    note: 'A plus the thing A cannot do: the throw sends light UP the pole to the flag instead of '
      + 'staying in the slot. The pole is the tallest object on screen and it costs no new furniture to '
      + 'use it, so this is the cheapest way to make the flip read at the size the frame actually gives '
      + 'it. Sparks are thrown forward along the lane, which is the mark that needs the extra room.',
    draw(ctx, fx, gy, s) {
      flagPole(ctx, fx, gy, 'flagWave', s);
      boxSwitch(ctx, fx, gy, s);
      poleSurge(ctx, fx, gy, s);
      contactSparks(ctx, fx, gy, s);
    },
  },
  {
    id: 'knife',
    name: 'C — flag + knife switch',
    note: 'The mechanism moved OUTSIDE the housing: two brass contacts, a long steel blade with a red '
      + 'handle, and an arc that strikes across the closing gap in the last third of the swing. You watch '
      + 'the circuit complete rather than watching a lever disappear into a slot. Widest silhouette of the '
      + 'four and the only red on the marker — judge whether that red fights the gold.',
    draw(ctx, fx, gy, s) {
      flagPole(ctx, fx, gy, 'flagWave', s);
      knifeSwitch(ctx, fx, gy, s);
      poleSurge(ctx, fx, gy, s);
      contactSparks(ctx, fx, gy, s);
    },
  },
  {
    id: 'panel',
    name: 'D — flag + lamp panel',
    note: 'The only candidate that STATES the result: a needle that pins across a dial and two lamps '
      + 'wired as opposites, red going dark as green comes up. Unmissable, and the most likely of the '
      + 'four to read as a piece of HUD bolted to a wall — the game says everything else in this run with '
      + 'shape and light, not with indicators.',
    draw(ctx, fx, gy, s) {
      flagPole(ctx, fx, gy, 'flagWave', s);
      panelSwitch(ctx, fx, gy, s);
      poleSurge(ctx, fx, gy, s);
    },
  },
  {
    id: 'mast',
    name: 'E — one object: switch in the pole base',
    note: 'Pole and switch as a single silhouette. The shaft widens into a teal housing at the base and '
      + 'the lever comes straight out of it, so there is one thing at the end of the level rather than '
      + 'two standing side by side. Half the footprint of C, which is the argument for it if the framing '
      + 'row below does not go your way — and the flag RAISES on the throw, so the payoff is the marker '
      + 'itself finishing rather than a light coming on next to it.',
    draw(ctx, fx, gy, s) {
      flagPole(ctx, fx, gy, 'flagWave', { ...s, flagT: s.live ? 0.25 + 0.75 * s.thrown : 1 });
      mastSwitch(ctx, fx, gy, s);
      poleSurge(ctx, fx, gy, s);
    },
  },
  {
    id: 'pennant',
    name: 'F — bolt pennant + knife switch',
    note: 'C with the flag half swapped: the bake-off\'s runner-up cloth, a pennant carrying the game\'s '
      + 'own lightning bolt. Reads as ENERGY rather than as a finish line, which is arguably the more '
      + 'honest thing to fly over a breaker — and arguably the wrong one, because the object being marked '
      + 'is the END, and a chequer flag is the only mark that means that without being taught.',
    draw(ctx, fx, gy, s) {
      flagPole(ctx, fx, gy, 'flagPennant', s);
      knifeSwitch(ctx, fx, gy, s);
      poleSurge(ctx, fx, gy, s);
      contactSparks(ctx, fx, gy, s);
    },
  },
];

// --- ROUND TWO: D, with the logic fixed ------------------------------------
// D won on looks and lost on sense: a flag flying over a switch says the level
// ends when you CROSS it, then a lever moves and lamps light with nothing
// joining the two events. All three below keep D's panel exactly as it is and
// change only what the flag is doing, which is the part that was lying.

// A conduit from the panel up the pole. The cheapest possible statement that
// these are one circuit rather than two objects that happen to be adjacent —
// and it gives the surge something to travel along instead of climbing bare
// metal.
function conduit(ctx, fx, gy, { thrown, live }) {
  const cx = fx + POLE_W + 1.5;
  ctx.strokeStyle = '#1b2430';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(fx + 12, gy - 44);
  ctx.quadraticCurveTo(cx + 3, gy - 52, cx, gy - 62);
  ctx.lineTo(cx, gy - POLE_H + 8);
  ctx.stroke();
  ctx.strokeStyle = '#3a4a5a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(fx + 12, gy - 44);
  ctx.quadraticCurveTo(cx + 3, gy - 52, cx, gy - 62);
  ctx.lineTo(cx, gy - POLE_H + 8);
  ctx.stroke();
  // Two saddles, so it reads as fixed to the pole rather than draped over it.
  ctx.fillStyle = '#5d7385';
  ctx.fillRect(fx + POLE_W - 1, gy - 74, 4, 2);
  ctx.fillRect(fx + POLE_W - 1, gy - 90, 4, 2);
  if (thrown > 0) {
    ctx.strokeStyle = `rgba(255,246,208,${(0.8 * Math.min(1, thrown * 1.6) * (live ? 1 : 0.45)).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx + 12, gy - 44);
    ctx.quadraticCurveTo(cx + 3, gy - 52, cx, gy - 62);
    ctx.lineTo(cx, gy - POLE_H + 8);
    ctx.stroke();
  }
}

FINISH_MARKER_VARIANTS.push({
  id: 'panelWake',
  name: 'D1 — the flag is the RESULT, not the marker',
  note: 'D with the fiction fixed, and the fix is one idea: the power is out, so the flag is out. It '
    + 'hangs dead on the pole through the whole approach — drained of colour, limp, not moving — which '
    + 'says END OF LEVEL exactly as well as a flying flag does and promises nothing about crossing a '
    + 'line, because a dead flag is visibly WAITING for something. Throw the breaker and it unfurls from '
    + 'the hoist, takes its colour back and flies. Cause then effect, on one object: you did not cross '
    + 'the flag, you switched it on. A CLUNK leaves it dead, which is the plainest reading of a flip '
    + 'worth nothing in the game.',
  draw(ctx, fx, gy, s) {
    // Raised by ANY throw — see panelSwitch. A clunk still restores the power,
    // it just does it plainly: the cloth takes two thirds longer to come out and
    // there is no surge behind it.
    if (s.thrown > 0) wakingFlag(ctx, fx, gy, 'flagWave', s, Math.min(1, s.thrown * (s.live ? 1.8 : 0.7)));
    else deadFlag(ctx, fx, gy);
    panelSwitch(ctx, fx, gy, s);
    poleSurge(ctx, fx, gy, s);
  },
});

FINISH_MARKER_VARIANTS.push({
  id: 'panelConduit',
  name: 'D2 — dead flag + conduit, wired to the panel',
  note: 'D1 plus the wire. A conduit runs out of the panel, up the pole and into the flag head, so the '
    + 'two halves are visibly ONE circuit before anything is thrown — the approach already answers the '
    + 'question rather than waiting for the payoff to answer it. The surge travels the conduit instead '
    + 'of climbing bare metal. Costs a line of clutter down the pole, which is the pole the flip bracket '
    + 'also has to be read against; judge those two together.',
  draw(ctx, fx, gy, s) {
    if (s.thrown > 0) wakingFlag(ctx, fx, gy, 'flagWave', s, Math.min(1, s.thrown * (s.live ? 1.8 : 0.7)));
    else deadFlag(ctx, fx, gy);
    conduit(ctx, fx, gy, s);
    panelSwitch(ctx, fx, gy, s);
    poleSurge(ctx, fx, gy, s);
  },
});

FINISH_MARKER_VARIANTS.push({
  id: 'panelSign',
  name: 'D3 — no race flag at all: the bolt pennant as signage',
  note: 'The other way out of the same problem. Instead of making the flag a result, stop it being a '
    + 'finish line: the bolt pennant is the substation\'s own sign, and a sign makes no promise about '
    + 'crossing anything — it labels the thing underneath it, which is the switch. Flies the whole time, '
    + 'so the marker is alive on the approach, and the payoff stays entirely in the panel and the surge. '
    + 'The cost is that a pennant does not say END the way a chequer does; it says ENERGY, and the player '
    + 'has to learn once that this object is where a stage finishes.',
  draw(ctx, fx, gy, s) {
    flagPole(ctx, fx, gy, 'flagPennant', s);
    conduit(ctx, fx, gy, s);
    panelSwitch(ctx, fx, gy, s);
    poleSurge(ctx, fx, gy, s);
  },
});

// --- ROUND THREE: D1 with the trigger pulled out of the box ----------------
// D1 was right about the flag and vague about the thing you hit: the trigger
// was a small lever in a slot on the panel's face, which at lane size is a pale
// nub sitting among two lamps and a dial. Three marks that all look like
// fittings, and one of them is the only one you can act on.
//
// So the trigger comes OUT of the box and stands on its own at the foot of the
// pole, as a plunger — a broad cap on a short post, the one shape in the whole
// game whose entire meaning is PUSH ME DOWN. The box moves clear to the right
// and becomes purely a readout: lamps and a dial, nothing to touch. A cable
// joins them along the ground.
//
// That split is what buys the chain its beats. Push, pulse along the cable,
// lamps flip, current up the pole, flag flies — five events with an order,
// where D1 had two happening at once inside one housing.
const stage = (thrown, a, b) => Math.max(0, Math.min(1, (thrown - a) / (b - a)));

// The plunger's cap, and so the floor the hero ends the stage standing on.
// REST is the height of the cap's top surface above the ground with nothing on
// it; TRAVEL is how far it goes down under him.
// 11, down from 20. At 20 there were eight clear pixels of bare shaft between
// the flange and the cap and the thing read as a lamp-post with a lid — and
// standing a hero on top of it put him nearly a third of his own height above
// the lane on a 4px stick. A plunger is a squat object; the cap wants to look
// like it is sitting on its housing, not carried above it.
export const PLUNGER_REST = 11;
// The top of the housing the cap comes down onto, above ground. It has to fall
// with the cap: left at its old 7.5 against an 11px rest there was a single
// pixel of shaft between the two and the stroke had nowhere to go, so the
// housing gets shorter by nearly as much as the cap came down and the daylight
// between them — which is the stroke — survives.
const FLANGE_TOP = 3.2;
// It goes nearly the whole way down. At 5 the cap stopped three quarters of the
// way up its own post with a visible length of shaft still showing under it,
// which reads as a button that stuck rather than a breaker that was MADE — and
// the hero standing on it barely moved, so the one moment his weight is meant
// to be the thing that throws the switch had no weight in it.
//
// Derived, not picked, so lowering the cap cannot quietly drive it through its
// own housing: the stroke is whatever daylight there is between the underside
// of the cap at rest and the top of the flange, plus the 0.3 of overlap that
// stops the two reading as separate objects at the bottom of the stroke. It
// used to be a literal 8.2 tuned against a 20px rest, and at 15 that number
// would have buried the cap in the base.
const PLUNGER_TRAVEL = PLUNGER_REST - 4.6 - FLANGE_TOP + 0.3;

// How far the cap has travelled at a given point in the chain — and the reason
// this is a function rather than a lerp: it OVERSHOOTS and settles. He lands on
// it with his whole weight, so it gives, springs back a little past where it
// finishes, and comes to rest. Exported as a height because run.js stands the
// hero on it: the hero's feet ride this exact number, so he bounces with the
// thing he is standing on instead of hovering while it moves underneath him.
function plungerTravel(thrown) {
  // The strike is FAST and the recovery is slow, which is the whole difference
  // between a thing being hit and a thing being lowered. Squared, not
  // smoothstepped: smoothstep eases INTO the bottom, and a plunger does not
  // decelerate before it lands.
  const drive = stage(thrown, 0, 0.09);
  const settle = stage(thrown, 0.09, 0.52);
  // ONE definite bounce, then a much smaller second one, then still. Nearly
  // half the travel given back — big enough to see at lane size, which the old
  // 2.2 spread over 2.6 cycles was not: that read as a wobble, and a wobble is
  // a loose part, not a spring. Written as a FRACTION of the stroke rather than
  // the 3.6px it used to be, so a shorter plunger rings proportionally instead
  // of springing further than it travelled.
  const ring = Math.sin(settle * Math.PI * 2) * (1 - settle) ** 3 * (PLUNGER_TRAVEL * 0.44);
  return PLUNGER_TRAVEL * (drive * drive) - ring;
}

export function plungerStandY(thrown) {
  return PLUNGER_REST - plungerTravel(thrown);
}

// The plunger. Cap travels down onto the base and stays down — it is a breaker
// being made, not a button being tapped.
function plunger(ctx, fx, gy, { thrown, live }) {
  const cx = fx + PLUNGER_CX;
  // The shaft's top, which is the one number the cap's height owns: it has to
  // start just under the cap at rest or a grey stick pokes out above it. Was
  // hardcoded to gy - 16 against a 20px rest; derived, it follows the cap down.
  const shaftTop = PLUNGER_REST - 4;
  const push = stage(thrown, 0, 0.12);
  const drop = plungerTravel(thrown);
  // SUNK. The foot used to be a slab resting on the ground line, which reads as
  // a prop set down on the lane rather than as something bolted into it. It now
  // runs three pixels under, with a shadow pooled around it and a lip of earth
  // pushed up at either side — the same treatment the cabinet gets, so the two
  // read as installed by the same hands.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#0b0b14';
  ctx.beginPath();
  ctx.ellipse(cx, gy + 1, 15, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The post and its spring, drawn BEFORE the flange so the housing covers
  // them: at full travel the shaft has to disappear into the base, which is
  // where a plunger's stroke actually goes. Drawn after, the post sat on top of
  // the flange it was supposed to be sliding into.
  //
  // The spring is stroked as coils rather than stacked as three dark bars: at
  // this weight a bar is a notch cut into the post, and a round-capped line is
  // a wire wound round it. The coils close up as it goes down — the gap term
  // shrinks with `push` — which is the part that says SPRUNG rather than
  // "cylinder that moved".
  // The shaft runs from under the cap to a fixed floor just below grade — so it
  // SHORTENS as the cap comes down, which is what going into a housing looks
  // like. Growing it with the stroke (the first attempt) pushed a grey stick
  // out of the bottom of the base and into the ground.
  inked(ctx, '#5d7385', (c) => rr(c, cx - 2, gy - shaftTop + drop, 4, shaftTop + 2 - drop, 1.4), { lw: 0.4 });
  ctx.save();
  ctx.strokeStyle = 'rgba(11,11,20,0.4)';
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const y = gy - (shaftTop - 1.4) + drop + i * (2.4 - push * 1.1);
    ctx.beginPath();
    ctx.moveTo(cx - 2.6, y + 0.5);
    ctx.quadraticCurveTo(cx, y - 0.5, cx + 2.6, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
  // The flange: one rounded body with a contour on it, not a black slab with a
  // smaller slab on top. The top light stays a fill, clipped inside the same
  // rounded shape so it cannot run out past the corner radius.
  inked(ctx, '#33445a', (c) => rr(c, cx - 10, gy - FLANGE_TOP, 20, FLANGE_TOP + 2.5, 2.4));
  ctx.save();
  ctx.beginPath();
  rr(ctx, cx - 10, gy - FLANGE_TOP, 20, FLANGE_TOP + 2.5, 2.4);
  ctx.clip();
  ctx.fillStyle = '#4d6172';
  ctx.fillRect(cx - 10, gy - FLANGE_TOP, 20, 1.6);
  ctx.restore();
  // Anchor bolts through the flange, at ground level where they would be. The
  // RIGHT one is placed on the mast's own centre line rather than at a fixed
  // offset: the pole comes down through it, so the two read as one bolted
  // assembly rather than as a post standing next to a base. Derived, so that
  // stays true if the hero's reach — which is what sets POLE_STANDOFF — is ever
  // retuned; hardcoded at +6 it was a pixel adrift of the shaft and read as a
  // near miss, which is worse than no rivet there at all.
  for (const boltCx of [cx - 7, cx + POLE_STANDOFF]) {
    inked(ctx, '#8496a8', (c) => rr(c, boltCx - 1, gy - Math.min(4, FLANGE_TOP - 1.4), 2, 2, 0.9), { lw: 0.35 });
  }
  // The cap. Red, domed, and proud of everything else on the marker: it is the
  // only thing here the player is meant to touch, so it is the only thing here
  // wearing a colour nothing else wears.
  const capY = gy - PLUNGER_REST + drop;
  // DOMED, and the roundest thing on the marker. It is the one part the player
  // is asked to hit, so it gets the softest silhouette in the set — a hard
  // black-edged bar was the single worst offender in the old drawing, reading
  // as a strip of tape stuck across the pole.
  const cap = (c) => rr(c, cx - 8, capY, 16, 4.6, 2.2);
  inked(ctx, live && thrown > 0.14 ? '#f0603f' : '#d8452f', cap, { lw: 0.55 });
  ctx.save();
  ctx.beginPath();
  cap(ctx);
  ctx.clip();
  ctx.fillStyle = '#f89070';
  ctx.fillRect(cx - 8, capY, 16, 1.6);          // top light, same as everything else
  ctx.restore();
  // Struck: a hard ring of light off the cap the instant it bottoms out.
  if (live && push > 0.5) {
    const hit = 1 - stage(thrown, 0.15, 0.3);
    ctx.save();
    ctx.globalAlpha = hit * 0.8;
    ctx.strokeStyle = '#fff6d0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, capY + 2, 10 + (1 - hit) * 12, 4 + (1 - hit) * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// The cable from the plunger to the readout box, lying along the ground with a
// sag in it. The pulse that runs down it is the whole reason the two objects can
// stand apart: without a mark travelling between them they are furniture that
// happens to react at the same time.
const BOX_X = 34;                   // the box's own left edge, relative to the pole
function cable(ctx, fx, gy, { thrown, live, reducedMotion, boxId }) {
  // Both ends are TUCKED: it leaves under the plunger's flange and arrives under
  // the box's gland, so neither end is a stroke stopping in mid-air against a
  // panel. It used to start 9px clear of the pole at flange height, which read
  // as a wire lying beside the plunger rather than one coming out of it.
  const x0 = fx + POLE_W / 2 + 7, x1 = fx + BOX_X + boxInlet(boxId) - 3;
  const y0 = gy - 2.6, y1 = gy - 7;
  // Deeper sag on a finer cable. Weight is carried by the CURVE now that it is
  // not carried by thickness: 5px of droop on a 3px-thick line reads as a bar
  // that happens to bend, 6.5 on a 1.5px one reads as something limp lying on
  // the ground between two fixed points.
  const sag = 6.5;
  const at = (u) => [
    x0 + (x1 - x0) * u,
    // The same quadratic the stroke draws, sampled — so the spark rides the
    // sag instead of cutting the chord.
    (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (y0 + sag) + u * u * y1,
  ];
  const path = (c) => {
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, y0 + sag, x1, y1);
  };
  // Three passes, all of them fine. The old build was a 3px black stroke with a
  // 1.6 body on it — a rope with a heavy outline, and the widest black line
  // anywhere on the marker. Now it is a hairline contour, a 1.5px body and a
  // half-pixel of light along the top: the same three tones, a third of the
  // weight, and round caps so the ends taper into their fittings instead of
  // stopping square.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The shadow it casts on the ground, not an outline around it — offset down,
  // soft, and only under the belly of the sag where the cable is nearest the
  // floor. This is what stops a fine line from reading as a scratch on the
  // backdrop, and it is the reason the black outline is no longer needed.
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#0b0b14';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 1.6);
  ctx.quadraticCurveTo((x0 + x1) / 2, y0 + sag + 1.6, x1, y1 + 1.6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(11,11,20,0.55)';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  path(ctx);
  ctx.stroke();
  ctx.strokeStyle = '#3a4c62';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  path(ctx);
  ctx.stroke();
  // The lit edge rides the TOP of the cable rather than sitting centred on it,
  // which is what turns a flat line into a round one.
  ctx.strokeStyle = 'rgba(178,198,218,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 0.45);
  ctx.quadraticCurveTo((x0 + x1) / 2, y0 + sag - 0.45, x1, y1 - 0.45);
  ctx.stroke();
  ctx.restore();

  // THE SPARK. This is the beat that earns the two objects standing apart, so
  // it is drawn as an object rather than as a lit segment of cable: a bright
  // head with a tail behind it and a halo around it, crawling the whole span
  // over a third of the payoff. The first pass clipped a bright stroke to a
  // moving window, which at lane size was a flicker on a wire — you could not
  // tell it was travelling, which is the only thing it had to say.
  // It crosses in about half a second of the 1.4s chain. Faster than this and
  // the beat that earns the two objects standing apart is over before the eye
  // finds it — the point of the spark is that it TRAVELS, and travel needs
  // enough frames to be a journey rather than a flash at each end.
  const run = stage(thrown, 0.03, 0.36);
  if (!live || run <= 0 || run >= 1) return;
  const [hx, hy] = at(run);
  ctx.save();
  for (let i = 1; i <= 4; i++) {                 // tail, sampled back along the cable
    const u = Math.max(0, run - i * 0.05);
    const [tx, ty] = at(u);
    ctx.globalAlpha = 0.5 * (1 - i / 5);
    ctx.fillStyle = '#ffd447';
    ctx.beginPath();
    ctx.arc(tx, ty, 2.2 - i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ffe486';
  ctx.beginPath();
  ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Two short legs of crackle off the head, redrawn each frame so it fizzes.
  if (!reducedMotion) {
    ctx.strokeStyle = 'rgba(190,240,255,0.8)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 2; i++) {
      const a = (Math.floor(run * 40) * 2.4 + i * 2.1) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(a) * 4, hy + Math.sin(a) * 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// The box, with nothing on it to touch. Same lamps and dial as D1's panel, on
// its own feet, standing clear of the pole.
// ------------------------------------------------ the breaker box bake-off
// The cabinet is its own decision, so it is its own set of variants. What is
// FIXED across all of them, because it won on sight: the gauge and the
// red/green lamp pair. Everything else — silhouette, roof, materials, how it
// meets the ground — is what is being chosen between.
//
// Each variant draws with its own left edge at `bx` and its base on `gy`, and
// every one of them puts the cable gland on the left side about 9 above the
// ground, because the cable that arrives there is not theirs to move.

// The gauge, done properly. The first one was a filled half-disc with square
// ticks and a straight needle — a diagram of a gauge. What separates an
// instrument from a diagram is almost entirely in the parts nobody looks at:
// the scale is PRINTED on the face as a fine arc rather than implied by the
// ticks; the ticks are graded (majors longer AND brighter, minors hairline);
// the needle is a tapered blade with a counterweight tail behind the pivot,
// which is the single most recognisable thing about a real moving-iron meter;
// and there is glass over it, carrying one soft specular sweep that does not
// move with the needle.
function gaugeFace(ctx, cx, cy, r, { thrown, t, reducedMotion }) {
  // Bezel: a steel ring with a lit upper-left quadrant, screwed down at the
  // corners of its own square rather than floating on the panel.
  ctx.fillStyle = '#42536a';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2.2, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8496a8';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2.2, Math.PI, Math.PI * 1.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d7385';
  ctx.fillRect(cx - r - 2.2, cy - 0.35, (r + 2.2) * 2, 0.7);  // the bezel's flat
  // Face: navy, not black. Black takes the ticks with it at this size.
  ctx.fillStyle = '#141d2b';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  const A0 = Math.PI * 1.04, A1 = Math.PI * 1.96;   // the swept arc, inset from flat
  const at = (u) => A0 + (A1 - A0) * u;
  // Printed scale arc. One hairline, which is what a real dial has — the ticks
  // hang off it instead of floating in the middle of the face.
  ctx.strokeStyle = 'rgba(200,214,228,0.55)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, A0, A1);
  ctx.stroke();
  // Danger band: a thick arc over the top fifth, INSIDE the scale line so the
  // needle crosses onto it rather than under it.
  ctx.strokeStyle = '#e24a3a';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, at(0.8), A1);
  ctx.stroke();
  // Ticks, graded. Eleven of them; every third is a major.
  for (let i = 0; i <= 10; i++) {
    const a = at(i / 10), major = i % 5 === 0, mid = i % 5 !== 0 && i % 2 === 0;
    const len = major ? r * 0.2 : mid ? r * 0.13 : r * 0.08;
    const w = major ? 0.7 : 0.35;
    ctx.strokeStyle = major ? '#e8eef4' : 'rgba(200,214,228,0.6)';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74);
    ctx.lineTo(cx + Math.cos(a) * (r * 0.74 - len), cy + Math.sin(a) * (r * 0.74 - len));
    ctx.stroke();
  }

  // Needle. Idle drifts; the throw pins it and it settles with one overshoot,
  // which is what a meter slammed to full actually does.
  const idle = reducedMotion ? 0.1 : 0.1 + 0.04 * Math.sin(t * 2.3);
  const settle = thrown >= 1 ? 1 + 0.045 * Math.sin(t * 12) * Math.max(0, 1 - (t % 4)) : thrown;
  const nd = idle + (0.92 - idle) * settle;
  const a = at(nd);
  const dxu = Math.cos(a), dyu = Math.sin(a);
  const px = -dyu, py = dxu;                       // perpendicular, for the taper
  const tip = r * 0.78, tail = r * 0.26, half = 0.6;
  ctx.fillStyle = thrown > 0.5 ? '#ffe486' : '#e8eef4';
  ctx.beginPath();
  ctx.moveTo(cx + dxu * tip, cy + dyu * tip);                       // sharp tip
  ctx.lineTo(cx + px * half, cy + py * half);
  ctx.lineTo(cx - dxu * tail + px * half * 1.3, cy - dyu * tail + py * half * 1.3);
  ctx.lineTo(cx - dxu * tail - px * half * 1.3, cy - dyu * tail - py * half * 1.3);
  ctx.lineTo(cx - px * half, cy - py * half);
  ctx.closePath();
  ctx.fill();
  // Pivot: a small dome with its own highlight, over the needle so the needle
  // reads as passing under it.
  ctx.fillStyle = '#5d7385';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8d4e0';
  ctx.beginPath();
  ctx.arc(cx - 0.35, cy - 0.35, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Glass. One soft sweep across the upper left, clipped to the face — it does
  // NOT track the needle, because glass does not know where the needle is, and
  // a highlight that moves with the pointer is the tell that there is no glass.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.45, cy - r * 1.15, cx + r * 0.1, cy - r * 0.98);
  ctx.lineTo(cx - r * 0.5, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// The lamp pair. Kept as one function so no variant can drift the thing that
// was already settled: red and green wired as opposites, in bezels, with a
// filament pinprick and a thrown halo on whichever is live.
function lampPair(ctx, x0, x1, y, done, r = 2.4) {
  const lamp = (lx, on, hot, cold) => {
    ctx.fillStyle = '#5d7385';
    ctx.beginPath();
    ctx.arc(lx, y, r + 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8496a8';
    ctx.beginPath();
    ctx.arc(lx, y, r + 1.3, Math.PI, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0b0b14';
    ctx.beginPath();
    ctx.arc(lx, y, r + 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? hot : cold;
    ctx.beginPath();
    ctx.arc(lx, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (on) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = hot;
      ctx.beginPath();
      ctx.arc(lx, y, r + 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(lx - r * 0.3, y - r * 0.35, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  lamp(x0, !done, '#e24a3a', '#4a201e');
  lamp(x1, done, '#60dc78', '#1c4024');
}

// Shared furniture every carcass wants: the shadow it sits in, and the gland
// the cable lands on.
function boxShadow(ctx, cx, gy, w) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#0b0b14';
  ctx.beginPath();
  ctx.ellipse(cx, gy + 1, w * 0.62, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
// Where the cable actually lands on each carcass, as an offset from its left
// edge. A box meets the cable at its own flank; the post has no flank down
// there — its body is in the air — so the cable has to terminate on the LEG,
// which is 8.5 in from where the head starts. Getting this wrong is not subtle:
// the gland floats in open grass and the two objects stop being wired together,
// which is the one thing the cable exists to say.
const BOX_INLET = { cabinet: 0, transformer: 0, kiosk: 0, totem: 0, riveted: 0, post: 8.5 };
export const boxInlet = (id = BREAKER_BOX) => BOX_INLET[id] || 0;

// The fitting the cable enters. Small enough that it was three flat rectangles;
// rounded and inked now like the rest of the hardware, with the throat it plugs
// into drawn as a dark round-ended stub so the wire visibly goes INTO something
// rather than stopping against a wall.
function cableGland(ctx, x, gy) {
  inked(ctx, '#5d7385', (c) => rr(c, x - 3, gy - 9, 4.4, 4, 1.4), { lw: 0.35 });
  ctx.save();
  ctx.beginPath();
  rr(ctx, x - 3, gy - 9, 4.4, 4, 1.4);
  ctx.clip();
  ctx.fillStyle = '#8496a8';
  ctx.fillRect(x - 3, gy - 9, 4.4, 1.2);
  ctx.restore();
  inked(ctx, '#1b2430', (c) => rr(c, x - 4.4, gy - 8.4, 2.6, 2.8, 1.1), { lw: 0.3 });
}
function screws(ctx, pts, size = 2) {
  const h = size / 2;
  for (const [x, y] of pts) {
    ctx.fillStyle = '#8496a8';
    ctx.fillRect(x - h, y - h, size, size);
    ctx.fillStyle = '#2a3a4c';
    ctx.fillRect(x - h, y - size * 0.1, size, size * 0.28);
  }
}
function hazardBand(ctx, bx, gy, w, h = 2.4) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, gy - h, w, h);
  ctx.clip();
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(bx, gy - h, w, h);
  ctx.fillStyle = '#0b0b14';
  for (let i = -1; i < Math.ceil(w / 4) + 1; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + i * 4, gy);
    ctx.lineTo(bx + i * 4 + 2, gy);
    ctx.lineTo(bx + i * 4 + 2 + h, gy - h);
    ctx.lineTo(bx + i * 4 + h, gy - h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export const BREAKER_BOX_VARIANTS = [
  {
    id: 'cabinet',
    name: 'WAS — the slate cabinet',
    w: 30,
    note: 'The control: a plain rectangle with a flat lid, a door seam, louvres, a rating plate and a '
      + 'hazard band. Everything on it is correct and the silhouette is a box, which is the complaint — '
      + 'at lane speed it is a dark rectangle with two dots and a dial on it.',
    draw(ctx, bx, gy, s) {
      const W = 30, H = 54, top = gy - H;
      boxShadow(ctx, bx + W / 2, gy, W);
      ctx.fillStyle = '#141c26';
      ctx.fillRect(bx - 1, top - 2, W + 2, H + 5);
      ctx.fillStyle = '#33445a';
      ctx.fillRect(bx, top, W, gy + 3 - top);
      ctx.fillStyle = '#4d6172';
      ctx.fillRect(bx - 1.5, top - 2, W + 3, 3);
      ctx.fillStyle = '#5d7385';
      ctx.fillRect(bx - 1.5, top - 2, W + 3, 1);
      ctx.fillStyle = '#28374a';
      ctx.fillRect(bx + W * 0.16, top + 3, 1, H - 6);
      screws(ctx, [[bx + 3, top + 4], [bx + W - 3, top + 4], [bx + 3, gy - 5], [bx + W - 3, gy - 5]]);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#121a24';
        ctx.fillRect(bx + 3, gy - 11 + i * 2.6, 10, 1.4);
        ctx.fillStyle = '#5d7385';
        ctx.fillRect(bx + 3, gy - 11 + i * 2.6 + 1.4, 10, 0.6);
      }
      ctx.fillStyle = '#c8d4e0';
      ctx.fillRect(bx + 16, gy - 11, 11, 8);
      ctx.fillStyle = '#3a4c62';
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + 17.2, gy - 8.6 + i * 2, 8 - i * 2.4, 0.9);
      hazardBand(ctx, bx, gy, W);
      gaugeFace(ctx, bx + 15, gy - 32, 9, s);
      lampPair(ctx, bx + 7, bx + 23, gy - 20, s.thrown > 0.6);
      cableGland(ctx, bx, gy);
    },
  },
  {
    id: 'transformer',
    name: 'A — domed transformer housing',
    w: 26,
    note: 'Narrower, with a rounded shoulder and a domed cap instead of a flat lid — the silhouette of a '
      + 'pole transformer or a substation can. Curved tops are rare in this game, which is the argument: '
      + 'it is the only object at the end of a stage and it does not have to be shaped like every crate '
      + 'the player has been jumping over for two minutes. Two cooling fins down each flank.',
    draw(ctx, bx, gy, s) {
      const W = 26, H = 56, top = gy - H, cx = bx + W / 2;
      boxShadow(ctx, cx, gy, W);
      const body = (c, o) => {
        c.moveTo(bx - o, gy + 3);
        c.lineTo(bx - o, top + 12);
        c.quadraticCurveTo(bx - o, top - o, cx, top - o);
        c.quadraticCurveTo(bx + W + o, top - o, bx + W + o, top + 12);
        c.lineTo(bx + W + o, gy + 3);
        c.closePath();
      };
      ctx.fillStyle = '#141c26';
      ctx.beginPath();
      body(ctx, 1.4);
      ctx.fill();
      ctx.fillStyle = '#33445a';
      ctx.beginPath();
      body(ctx, 0);
      ctx.fill();
      // Dome highlight, following the curve.
      ctx.save();
      ctx.beginPath();
      body(ctx, 0);
      ctx.clip();
      ctx.fillStyle = '#4d6172';
      ctx.beginPath();
      ctx.ellipse(cx, top + 9, W * 0.46, 11, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#5d7385';
      ctx.fillRect(bx, top + 8, W, 1.2);
      ctx.restore();
      // Cooling fins: three short bars proud of each flank. The one detail that
      // says "this thing gets hot" without a single warning label.
      ctx.fillStyle = '#4d6172';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(bx - 2.6, gy - 26 + i * 5, 2.6, 3);
        ctx.fillRect(bx + W, gy - 26 + i * 5, 2.6, 3);
      }
      ctx.fillStyle = '#5d7385';                    // a lifting lug on the crown
      ctx.fillRect(cx - 2, top - 3.5, 4, 2);
      hazardBand(ctx, bx, gy, W);
      gaugeFace(ctx, cx, gy - 34, 8.5, s);
      lampPair(ctx, cx - 7, cx + 7, gy - 20, s.thrown > 0.6);
      cableGland(ctx, bx, gy);
    },
  },
  {
    id: 'kiosk',
    name: 'B — squat kiosk with a hipped roof',
    w: 38,
    note: 'Wide and low, with a pitched roof overhanging on both sides — a roadside utility kiosk rather '
      + 'than a wall box. The wide face is the point: it lets the gauge and the lamps sit side by side on '
      + 'one row instead of stacked, so the whole readout is one horizontal glance at the exact moment '
      + 'the player is reading a horizontal frame. The risk is that it is short enough to read as scenery.',
    draw(ctx, bx, gy, s) {
      const W = 38, H = 40, top = gy - H, cx = bx + W / 2;
      boxShadow(ctx, cx, gy, W);
      ctx.fillStyle = '#141c26';
      ctx.fillRect(bx - 1, top + 5, W + 2, H);
      ctx.fillStyle = '#33445a';
      ctx.fillRect(bx, top + 6, W, gy + 3 - top - 6);
      // Hipped roof: a trapezium overhanging both sides, with a lit slope.
      ctx.fillStyle = '#28374a';
      ctx.beginPath();
      ctx.moveTo(bx - 4, top + 7);
      ctx.lineTo(bx + 6, top);
      ctx.lineTo(bx + W - 6, top);
      ctx.lineTo(bx + W + 4, top + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4d6172';
      ctx.beginPath();
      ctx.moveTo(bx - 4, top + 6);
      ctx.lineTo(bx + 6, top - 0.5);
      ctx.lineTo(bx + W - 6, top - 0.5);
      ctx.lineTo(bx + W + 4, top + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5d7385';
      ctx.fillRect(bx - 4, top + 5.2, W + 8, 1);
      // Two doors, so the wide face is not one blank sheet.
      ctx.fillStyle = '#28374a';
      ctx.fillRect(cx - 0.5, top + 8, 1, H - 12);
      screws(ctx, [[bx + 3, top + 9], [bx + W - 3, top + 9], [bx + 3, gy - 6], [bx + W - 3, gy - 6]]);
      ctx.fillStyle = '#c8d4e0';                    // rating plate, bottom right
      ctx.fillRect(bx + W - 13, gy - 10, 10, 7);
      ctx.fillStyle = '#3a4c62';
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + W - 12, gy - 8 + i * 1.9, 7 - i * 2, 0.8);
      hazardBand(ctx, bx, gy, W);
      // Gauge and lamps share one row here, which is the variant's whole idea —
      // so the gap between them is load-bearing. At 12/25 the bezel touched the
      // red lamp and the three marks read as one cluster.
      gaugeFace(ctx, bx + 11, gy - 20, 8, s);
      lampPair(ctx, bx + 26, bx + 34, gy - 20, s.thrown > 0.6);
      cableGland(ctx, bx, gy);
    },
  },
  {
    id: 'totem',
    name: 'C — tall column, gauge in the head',
    w: 22,
    note: 'The narrowest and tallest: a column with a rounded head carrying the gauge like a face, and '
      + 'the lamps below it like a signal. Reads at distance better than anything else here because the '
      + 'gauge is the highest thing on the object and sits against sky rather than against panel. It also '
      + 'stops competing with the flagpole for the eye, which is either the reason to pick it or the '
      + 'reason not to — the pole is supposed to be the tall thing.',
    draw(ctx, bx, gy, s) {
      const W = 22, H = 62, top = gy - H, cx = bx + W / 2;
      boxShadow(ctx, cx, gy, W + 6);
      // Splayed foot, so a tall narrow thing does not look like it would fall.
      ctx.fillStyle = '#141c26';
      ctx.fillRect(bx - 4, gy - 7, W + 8, 10);
      ctx.fillStyle = '#3a4c62';
      ctx.fillRect(bx - 3, gy - 6, W + 6, 8);
      ctx.fillStyle = '#141c26';
      ctx.beginPath();
      ctx.moveTo(bx - 1, gy);
      ctx.lineTo(bx - 1, top + 11);
      ctx.quadraticCurveTo(bx - 1, top - 1.4, cx, top - 1.4);
      ctx.quadraticCurveTo(bx + W + 1, top - 1.4, bx + W + 1, top + 11);
      ctx.lineTo(bx + W + 1, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#33445a';
      ctx.beginPath();
      ctx.moveTo(bx, gy);
      ctx.lineTo(bx, top + 11);
      ctx.quadraticCurveTo(bx, top, cx, top);
      ctx.quadraticCurveTo(bx + W, top, bx + W, top + 11);
      ctx.lineTo(bx + W, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4d6172';                    // the head, a shade lighter
      ctx.beginPath();
      ctx.moveTo(bx, top + 20);
      ctx.lineTo(bx, top + 11);
      ctx.quadraticCurveTo(bx, top, cx, top);
      ctx.quadraticCurveTo(bx + W, top, bx + W, top + 11);
      ctx.lineTo(bx + W, top + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#28374a';
      ctx.fillRect(bx, top + 20, W, 1.2);
      screws(ctx, [[bx + 3, top + 24], [bx + W - 3, top + 24]]);
      ctx.fillStyle = '#c8d4e0';
      ctx.fillRect(bx + 5, gy - 16, 12, 6);
      ctx.fillStyle = '#3a4c62';
      for (let i = 0; i < 2; i++) ctx.fillRect(bx + 6, gy - 14.6 + i * 2.2, 9 - i * 3, 0.8);
      hazardBand(ctx, bx - 3, gy, W + 6);
      gaugeFace(ctx, cx, top + 13, 8, s);
      lampPair(ctx, cx - 6, cx + 6, top + 28, s.thrown > 0.6);
      cableGland(ctx, bx, gy);
    },
  },
  {
    id: 'riveted',
    name: 'D — riveted, chamfered, industrial',
    w: 32,
    note: 'The same footprint as the control, made out of a different century: chamfered corners, a row '
      + 'of rivets around the whole perimeter, a heavy strap across the middle and rounded shoulders on '
      + 'the lid. All texture, no new silhouette — this is the one to pick if the answer is "the shape '
      + 'was fine, it was just bare". Compare it against the control specifically; if you cannot tell '
      + 'them apart at lane speed then the shape WAS the problem and one of the others wins.',
    draw(ctx, bx, gy, s) {
      const W = 32, H = 54, top = gy - H, ch = 4;
      boxShadow(ctx, bx + W / 2, gy, W);
      const shell = (c, o) => {
        c.moveTo(bx - o + ch, top - o);
        c.lineTo(bx + W + o - ch, top - o);
        c.lineTo(bx + W + o, top - o + ch);
        c.lineTo(bx + W + o, gy + 3);
        c.lineTo(bx - o, gy + 3);
        c.lineTo(bx - o, top - o + ch);
        c.closePath();
      };
      ctx.fillStyle = '#141c26';
      ctx.beginPath();
      shell(ctx, 1.4);
      ctx.fill();
      ctx.fillStyle = '#33445a';
      ctx.beginPath();
      shell(ctx, 0);
      ctx.fill();
      ctx.fillStyle = '#4d6172';
      ctx.beginPath();
      ctx.moveTo(bx + ch, top);
      ctx.lineTo(bx + W - ch, top);
      ctx.lineTo(bx + W, top + ch);
      ctx.lineTo(bx + W - ch, top + 2.4);
      ctx.lineTo(bx + ch, top + 2.4);
      ctx.lineTo(bx, top + ch);
      ctx.closePath();
      ctx.fill();
      // Rivets: a run down each side and across the top, evenly spaced. The
      // whole character of the variant is in this loop.
      ctx.fillStyle = '#8496a8';
      for (let y = top + 7; y < gy - 3; y += 5) {
        ctx.fillRect(bx + 1.6, y, 1.6, 1.6);
        ctx.fillRect(bx + W - 3.2, y, 1.6, 1.6);
      }
      for (let x = bx + 6; x < bx + W - 5; x += 5) ctx.fillRect(x, top + 4, 1.6, 1.6);
      // Strap across the waist, with its own rivets.
      ctx.fillStyle = '#4d6172';
      ctx.fillRect(bx, gy - 26, W, 4.5);
      ctx.fillStyle = '#5d7385';
      ctx.fillRect(bx, gy - 26, W, 1);
      ctx.fillStyle = '#8496a8';
      for (let x = bx + 3; x < bx + W - 2; x += 6) ctx.fillRect(x, gy - 24.4, 1.6, 1.6);
      ctx.fillStyle = '#c8d4e0';
      ctx.fillRect(bx + 18, gy - 12, 11, 8);
      ctx.fillStyle = '#3a4c62';
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + 19.2, gy - 9.6 + i * 2, 8 - i * 2.4, 0.9);
      hazardBand(ctx, bx, gy, W);
      gaugeFace(ctx, bx + 16, gy - 36, 9.5, s);
      lampPair(ctx, bx + 8, bx + 24, gy - 17, s.thrown > 0.6);
      cableGland(ctx, bx, gy);
    },
  },
  {
    id: 'post',
    name: 'E — head on a post, off the ground',
    w: 24,
    note: 'The only one that does not stand on the floor: a single leg carrying a slanted head, like a '
      + 'parking meter or a trackside signal box. Getting the body off the ground is what makes it read '
      + 'as INSTRUMENTATION rather than as another crate — nothing else in the lane is raised, so the '
      + 'silhouette is unlike everything the player has been dodging. The slanted face also catches the '
      + 'light differently from every flat panel in the game.',
    draw(ctx, bx, gy, s) {
      const W = 24, cx = bx + W / 2, headTop = gy - 52, headBot = gy - 22;
      // PLANTED. A single-leg object is the one silhouette in the set that has
      // to earn its footing — a box can rest on the ground and be believed, a
      // post standing on it looks propped. So the leg goes INTO the earth: a
      // shadow pooled tight around it, a shallow socket darkening the ground
      // where it enters, the ground line broken by a lip of spoil either side
      // (the giveaway that something was dug rather than set down), and the base
      // flange bolted flat at grade with the concrete pad running on below.
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#0b0b14';
      ctx.beginPath();
      ctx.ellipse(cx, gy + 1.5, 11, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();                              // the socket: darker, tighter
      ctx.ellipse(cx, gy + 0.5, 6.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Spoil: two low mounds where the ground was broken and pushed back. They
      // sit ON the ground line and interrupt it, which is what stops the post
      // reading as a decal laid over the terrain.
      ctx.fillStyle = 'rgba(24,32,26,0.35)';
      ctx.beginPath();
      ctx.moveTo(cx - 12, gy + 1);
      ctx.quadraticCurveTo(cx - 7, gy - 2.6, cx - 3, gy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 3, gy + 1);
      ctx.quadraticCurveTo(cx + 7.5, gy - 2.2, cx + 12, gy + 1);
      ctx.closePath();
      ctx.fill();
      // Pad below grade — drawn first so everything above overlaps it — then the
      // flange bolted down at ground level.
      inked(ctx, '#2a3a4c', (c) => rr(c, cx - 5.5, gy - 0.5, 11, 4.5, 1.2), { lw: 0.35 });
      const flange = (c) => rr(c, cx - 6.5, gy - 3.8, 13, 3.6, 1.4);
      inked(ctx, '#3a4c62', flange, { lw: 0.4 });
      ctx.save();
      ctx.beginPath();
      flange(ctx);
      ctx.clip();
      ctx.fillStyle = '#5d7385';
      ctx.fillRect(cx - 6.5, gy - 3.8, 13, 1);      // the flange's own top light
      ctx.restore();
      for (const px of [cx - 4.6, cx + 3]) {        // anchor bolts through it
        inked(ctx, '#8496a8', (c) => rr(c, px, gy - 2.2, 1.6, 1.6, 0.7), { lw: 0.3 });
      }
      const leg = (c) => rr(c, cx - 3.5, headBot - 2, 7, gy - headBot - 1, 1.6);
      inked(ctx, '#28374a', leg, { lw: 0.45 });
      ctx.save();
      ctx.beginPath();
      leg(ctx);
      ctx.clip();
      ctx.fillStyle = '#4d6172';
      ctx.fillRect(cx - 3.5, headBot - 2, 2, gy - headBot - 1);
      ctx.restore();
      // Head: a box with a slanted top face, corners taken off. A cast
      // instrument housing has a radius on every edge; the square-cornered
      // version with a dark polygon behind it read as a sticker of a box.
      const headPts = [[bx, headTop + 6], [bx + W, headTop], [bx + W, headBot], [bx, headBot]];
      const head = (c) => roundPoly(c, headPts, 1.8);
      inked(ctx, '#33445a', head, { lw: 0.5 });
      // The slant catches light along its whole length, clipped to the rounded
      // shell so the highlight cannot square off the corner the shell rounded.
      ctx.save();
      ctx.beginPath();
      head(ctx);
      ctx.clip();
      ctx.fillStyle = '#5d7385';
      ctx.beginPath();
      ctx.moveTo(bx, headTop + 6);
      ctx.lineTo(bx + W, headTop);
      ctx.lineTo(bx + W, headTop + 1);
      ctx.lineTo(bx, headTop + 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      screws(ctx, [[bx + 2.6, headTop + 9], [bx + W - 2.6, headTop + 3.4],
        [bx + 2.6, headBot - 2.6], [bx + W - 2.6, headBot - 2.6]], 1.3);
      ctx.fillStyle = '#f6d33c';                    // a hazard chevron on the leg
      ctx.fillRect(cx - 3.5, gy - 12, 7, 1);
      ctx.fillRect(cx - 3.5, gy - 8.5, 7, 1);
      gaugeFace(ctx, cx + 1, headTop + 19, 8.5, s);
      lampPair(ctx, cx - 6, cx + 6, headBot - 5, s.thrown > 0.6, 2.1);
      cableGland(ctx, bx + BOX_INLET.post, gy);
    },
  },
];

export const BREAKER_BOX_BY_ID = Object.fromEntries(BREAKER_BOX_VARIANTS.map((v) => [v.id, v]));

// Which carcass ships. One edit swaps it; the gauge and the lamps are shared,
// so a swap changes the silhouette and nothing about what the thing says.
// E ships: the head on a post. Getting the body off the ground is what makes it
// read as INSTRUMENTATION rather than as another crate — nothing else in the
// lane is raised, so the silhouette is unlike everything the player has spent
// two minutes dodging.
export const BREAKER_BOX = 'post';

// The gauge, reachable on its own so the gallery can judge it at four times the
// size it ships at — everything that makes it an instrument is sub-pixel in the
// lane.
BREAKER_BOX_VARIANTS[0].drawGauge = gaugeFace;

export function drawBreakerBox(ctx, bx, gy, s, id = BREAKER_BOX) {
  const v = BREAKER_BOX_BY_ID[id] || BREAKER_BOX_VARIANTS[0];
  v.draw(ctx, bx, gy, s);
}

function readoutBox(ctx, fx, gy, s) {
  // The box answers when the spark ARRIVES, not when the plunger is hit — that
  // gap is the whole reason the cable is drawn. Pinned to the spark's own end
  // (0.36 — see cable()) and it has to move whenever that does: lamps flipping
  // while the spark is still halfway along the wire make the cable decorative.
  const arrived = stage(s.thrown, 0.36, 0.48);
  drawBreakerBox(ctx, fx + BOX_X, gy, { ...s, thrown: arrived }, s.boxId);
}

FINISH_MARKER_VARIANTS.push({
  id: 'plunger',
  name: 'D1b — plunger at the pole, box stood off and wired',
  note: 'D1 with the trigger taken out of the box. The thing you hit is now a red plunger at the foot of '
    + 'the pole — a broad cap on a sprung post, the one shape whose whole meaning is PUSH ME DOWN, and '
    + 'the only red on the marker. The box stands clear to the right with nothing on it to touch and does '
    + 'one job: report. A cable joins them along the ground. '
    + 'That split is what gives the payoff its order — push, pulse along the cable, lamps flip, current up '
    + 'the pole, flag flies. Five beats with a sequence, where D1 had the lever and the lamps going off '
    + 'together inside one housing. It also lands the slide exactly where it wants to land: you come down '
    + 'the pole and your feet hit the plunger.',
  draw(ctx, fx, gy, s) {
    // The flag goes up ON the push, not at the end of a queue behind it.
    //
    // It used to be last — raise starting at 0.72 of the throw — so that the
    // five beats read strictly in order: push, pulse, lamps, current, flag. The
    // order was legible and the wait was not worth it. What the player did was
    // hit the thing; the answer to hitting it arrived a second later, by which
    // point the input and the result had come apart. The chain still runs in
    // sequence, it just starts everything within the same breath: by the time
    // the current is halfway up the pole the flag is already climbing it.
    const raise = stage(s.thrown, 0.06, 0.5);
    // The mast, its flag and the current running up it all stand POLE_STANDOFF
    // right of the anchor; the plunger, the cable and the box stay on it. That
    // gap is one hero's reach, and it is the whole reason the slide now ends
    // with the hero already centred on the cap instead of stepping onto it.
    const px = fx + POLE_STANDOFF;
    if (raise > 0) wakingFlag(ctx, px, gy, 'flagWave', s, Math.min(1, raise * (s.live ? 1.8 : 0.7)));
    else deadFlag(ctx, px, gy);
    cable(ctx, fx, gy, s);
    readoutBox(ctx, fx, gy, s);
    plunger(ctx, fx, gy, s);
    // The surge starts at the plunger, a hair behind the lamps — close enough
    // that it reads as one event with an order inside it rather than as four
    // things taking turns.
    poleSurge(ctx, px, gy, { ...s, thrown: stage(s.thrown, 0.04, 0.6) });
  },
});

export const FINISH_MARKER_BY_ID = Object.fromEntries(FINISH_MARKER_VARIANTS.map((v) => [v.id, v]));

// Which marker ships. One edit swaps it; the losers stay drawable for the
// gallery section that decides it.
// D1 for now: it is D — the one that won on looks — with the only thing that
// was wrong about D put right. Swap the id to move it.
export const FINISH_MARKER = 'plunger';

// `boxId` overrides which cabinet the marker is wearing, for the bake-off that
// decides it. The run never passes it.
export function drawFinishMarkerArt(ctx, fx, gy, state, boxId) {
  const v = FINISH_MARKER_BY_ID[FINISH_MARKER] || FINISH_MARKER_VARIANTS[0];
  v.draw(ctx, fx, gy, boxId ? { ...state, boxId } : state);
}

// How much clear lane the marker needs to its RIGHT, per candidate: the sparks
// and the widest housing both land there, and today the frame edge is 6px past
// the switch. Consumed by the framing row in the gallery, which is the other
// half of this decision — a payoff drawn off-screen is a payoff that does not
// exist.
export const MARKER_RIGHT_EXTENT = {
  chequer: 26, flagBox: 32, flagSurge: 62, knife: 66, panel: 40, mast: 32, pennant: 66,
  panelWake: 40, panelConduit: 40, panelSign: 40,
  // The plunger family stands its box off to the right, so it needs the most
  // clear lane of anything in the set — and it is what the 72px margin was
  // widened to hold. Unchanged by POLE_STANDOFF: the mast and its flag stepped
  // right, but the flag's cloth ends around 39px out and the box is still the
  // far edge of the object at 68.
  plunger: 68,
};
