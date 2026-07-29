// Bake-off candidates for the relay hand-off block in the credits crawl.
//
// The shipped staging is whichever id HANDOFF_VARIANT names; every candidate
// stays drawable so the gallery's lab section can render them side by side
// (see 'credits-handoff' in tools/gallery-entry.js). That is the same contract
// the plug-icon and trophy-handle bake-offs keep: a losing candidate is only
// worth anything as a record of the decision if it still renders.
//
// Every painter fills a box and owns its own layout inside it, so the credits
// crawl (a 48u band at full screen width) and a gallery tile (a small wide
// card) can call the identical code with different geometry.
import { drawProp } from '../sprites/props.js';
import { drawToon } from '../sprites/toons.js';

const TOON_H = 34;
// How far outside the box a runner starts and finishes. Comfortably wider than
// a toon, so neither hero is ever visible standing still at the frame edge.
const ENTER_X = 46;
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// One shared gait so a hero's stride never changes meaning between variants —
// only their staging is under test here, not their run cycle.
function runPose(t, offset = 0) {
  return { kind: 'run', grounded: true, menu: true, time: t, phase: (t * 1.6 + offset) % 1 };
}

// Stride counts for the transit's two legs. Measured against the ACTIVE window
// rather than the whole crossing: that window is ~4.0s, so the approach runs
// 1.8s and the exit 2.2s. 8 and 12 cycles put them at ~4.4 and ~5.5 strides/s,
// well past the 3.1/s cast.js dashes at — these two are sprinting, not jogging.
// Cadence has to rise with the travel speed or the feet visibly skate.
const A_CYCLES = 8;
const B_CYCLES = 12;

function gaitPose(t, phase) {
  return { kind: 'run', grounded: true, menu: true, time: t, phase };
}

// Phase INTEGRATED from travel rather than sampled off the wall clock. Scaling
// a clock-driven phase by a changing rate makes the stride jump every time the
// rate moves; integrating means the feet stay planted while the cadence rises.
// Same trick, and the same reason, as gnashGaitPhase in game/cast.js.
function accelPhase(k, cycles) {
  return (cycles * (0.55 * k + 0.45 * k * k)) % 1;
}

function portalAt(ctx, cx, floorY, t, h = 40, w = 22) {
  const hh = h + Math.round(Math.sin(t * 5) * 2);
  drawProp(ctx, 'portal', cx - w / 2, floorY - hh, w, hh);
}

// Clip to one side of a vertical line, so the portal genuinely swallows a
// figure rather than merely standing next to it.
//
// The rect runs well past the box on its outer side: a hero enters from fully
// off-screen and leaves fully off-screen, and a clip stopping at the box edge
// would cut them in half on the way in and out. Whatever spills past the box
// is clipped by the canvas itself.
const OFFSTAGE = 80;
function clipSide(ctx, box, edgeX, side) {
  ctx.beginPath();
  if (side < 0) ctx.rect(box.x - OFFSTAGE, box.y, edgeX - box.x + OFFSTAGE, box.h);
  else ctx.rect(edgeX, box.y, box.x + box.w + OFFSTAGE - edgeX, box.h);
  ctx.clip();
}

// ---------------------------------------------------------------- candidates

// What ships today: two figures either side of a doorway. Kept in the bake-off
// as the control — a comparison with nothing to beat is not a comparison.
function drawPair(ctx, o) {
  const cx = o.x + o.w / 2, floorY = o.y + o.h - 6;
  portalAt(ctx, cx, floorY, o.t);
  drawToon(ctx, o.from, runPose(o.t, 0), cx - 44, floorY, TOON_H);
  drawToon(ctx, o.to, runPose(o.t, 0.5), cx + 44, floorY, TOON_H);
}

// Where the transit has got to: which hero is on stage, how far through their
// own leg they are, and the x they are running at. Solved here rather than
// inside the painter because the crawl needs the same answer — it carries each
// dialogue line with the hero saying it (see handoffSpeakerDX below), and two
// copies of this arithmetic would be two things to retune.
//
// Both legs start and finish fully off-stage: the outgoing hero enters from
// beyond the left edge rather than fading up inside the frame, and the incoming
// one keeps running until it is completely gone off the right.
//
// Neither leg uses a smoothstep. That curve starts AND ends at zero velocity,
// which put a standing start on the incoming hero and a coast on the outgoing
// one — the whole beat read slow. The approach accelerates into the portal; the
// exit is flat out from the first frame, because a relay hands over at speed
// rather than winding up afterwards.
function transitAt(o) {
  const cx = o.x + o.w / 2;
  // Remap the block's trip down the screen onto the shorter ACTIVE window, so
  // the same travel happens in half the time. Outside the window q clamps to 0
  // or 1, which parks whichever hero is on stage fully off-frame — so nothing
  // pops in or out, it is simply already gone.
  const q = clamp01((clamp01(o.progress) - HANDOFF_ACTIVE_FROM) / ACTIVE_SPAN);
  if (q < IN_LEG) {
    const k = clamp01(q / IN_LEG);
    const travel = 0.45 * k + 0.55 * k * k;
    return { cx, q, k, approach: true, x: lerp(o.x - ENTER_X, cx, travel) };
  }
  const k = clamp01((q - IN_LEG) / (1 - IN_LEG));
  return { cx, q, k, approach: false, x: lerp(cx, o.x + o.w + ENTER_X, k) };
}

// A: the swap actually happens. One hero runs in and is clipped away into the
// portal; the portal flares; the other emerges and runs on.
function drawTransit(ctx, o) {
  const floorY = o.y + o.h - 6;
  const { cx, q, k, approach, x } = transitAt(o);
  portalAt(ctx, cx, floorY, o.t);

  ctx.save();
  if (approach) {
    clipSide(ctx, o, cx - 3, -1);
    drawToon(ctx, o.from, gaitPose(o.t, accelPhase(k, A_CYCLES)), x, floorY, TOON_H);
  } else {
    clipSide(ctx, o, cx + 3, 1);
    drawToon(ctx, o.to, gaitPose(o.t, (B_CYCLES * k) % 1), x, floorY, TOON_H);
  }
  ctx.restore();

  // The flare is the hand-off's punctuation: it fires exactly on the frame the
  // outgoing hero is gone and the incoming one has not arrived.
  const flare = Math.exp(-Math.pow((q - IN_LEG) * 16, 2));
  if (flare > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const eye = floorY - 20;
    const g = ctx.createRadialGradient(cx, eye, 0, cx, eye, 34 * flare + 6);
    g.addColorStop(0, `rgba(220,255,246,${(0.85 * flare).toFixed(3)})`);
    g.addColorStop(1, 'rgba(72,224,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.restore();
  }
}

// B: no loop, one frozen moment. The portal is mid-swallow and mid-disgorge at
// the same time — trailing half of one hero, leading half of the other, both
// cut exactly on the portal's edge.
function drawHalfThrough(ctx, o) {
  const cx = o.x + o.w / 2, floorY = o.y + o.h - 6;
  ctx.save();
  clipSide(ctx, o, cx - 2, -1);
  drawToon(ctx, o.from, runPose(o.t, 0), cx - 13, floorY, TOON_H);
  ctx.restore();
  portalAt(ctx, cx, floorY, o.t);
  ctx.save();
  clipSide(ctx, o, cx + 2, 1);
  drawToon(ctx, o.to, runPose(o.t, 0.5), cx + 13, floorY, TOON_H);
  ctx.restore();
}

// C: the shipped staging plus the game's signature move. Drawn from progress
// rather than through engine/particles.js on purpose — a gallery tile must not
// push shards into the global pool the live game is drawing from.
function drawBlast(ctx, o) {
  const cx = o.x + o.w / 2, floorY = o.y + o.h - 6;
  const p = clamp01(o.progress);
  const eye = floorY - 20;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = 1 - p;
  ctx.strokeStyle = `rgba(72,224,200,${(a * 0.75).toFixed(3)})`;
  ctx.lineWidth = 0.8 + a * 1.8;
  ctx.beginPath();
  ctx.ellipse(cx, eye, 6 + p * 58, (6 + p * 58) * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(246,211,60,${(a * 0.9).toFixed(3)})`;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + 0.3;
    const d = 8 + p * 48;
    ctx.fillRect(cx + Math.cos(ang) * d - 1, eye + Math.sin(ang) * d * 0.55 - 1, 2, 2);
  }
  ctx.restore();
  portalAt(ctx, cx, floorY, o.t);
  drawToon(ctx, o.from, runPose(o.t, 0), cx - 44, floorY, TOON_H);
  drawToon(ctx, o.to, runPose(o.t, 0.5), cx + 44, floorY, TOON_H);
}

// D: the portal stops being a prop between two figures and becomes a seam
// across the whole width. One hero descends into it, the other rises out —
// and in the crawl the credits themselves would pass through the same line.
function drawSeam(ctx, o) {
  const cx = o.x + o.w / 2, cy = o.y + o.h * 0.52;
  const p = clamp01(o.progress);
  const span = o.w - 20;

  ctx.save();
  clipSide(ctx, { ...o, h: cy - o.y }, o.x, 1);
  ctx.beginPath(); ctx.rect(o.x, o.y, o.w, cy - o.y); ctx.clip();
  drawToon(ctx, o.from, runPose(o.t, 0), cx - 46, cy + 2 + smooth(p) * 26, TOON_H);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(o.x + 10, cy, o.x + 10 + span, cy);
  g.addColorStop(0, 'rgba(72,224,200,0)');
  g.addColorStop(0.5, 'rgba(206,255,244,0.95)');
  g.addColorStop(1, 'rgba(72,224,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, span / 2, 2.4 + Math.sin(o.t * 5) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.rect(o.x, cy, o.w, o.y + o.h - cy); ctx.clip();
  drawToon(ctx, o.to, runPose(o.t, 0.5), cx + 46, cy + 48 - smooth(p) * 16, TOON_H);
  ctx.restore();
}

export const HANDOFF_VARIANTS = [
  { id: 'pair', name: 'PAIR (shipping)', note: 'Two figures either side of the portal. The control.', draw: drawPair },
  { id: 'transit', name: 'A — LIVE TRANSIT', note: 'The swap happens: run in, swallowed, flare, run out.', draw: drawTransit },
  { id: 'halfThrough', name: 'B — HALF-THROUGH', note: 'One frozen moment. Both heroes cut on the portal edge.', draw: drawHalfThrough },
  { id: 'blast', name: 'C — RELAY BLAST', note: 'Shipping staging plus a shockwave and shards.', draw: drawBlast },
  { id: 'seam', name: 'D — SEAM', note: 'Portal as a full-width slit; one descends, one rises.', draw: drawSeam },
];

export const HANDOFF_BY_ID = Object.fromEntries(HANDOFF_VARIANTS.map((v) => [v.id, v]));

// What the crawl draws today. Change this one string to ship a different
// candidate; the gallery keeps rendering all of them either way.
export const HANDOFF_VARIANT = 'transit';

// When the incoming hero is clear of the portal. The crawl fades each dialogue
// line in with its own speaker off this, so the exchange plays as an exchange:
// the reply does not sit on screen for several seconds before anyone is there
// to have said it.
// The transit does NOT occupy the block's whole trip down the screen. It plays
// inside this window, which is what makes the running fast: the same distance
// in half the time. Stretching it over the full crossing gave ~60u/s, which is
// a stroll no matter how quickly the legs move.
export const HANDOFF_ACTIVE_FROM = 0.28;
export const HANDOFF_ACTIVE_TO = 0.66;
const ACTIVE_SPAN = HANDOFF_ACTIVE_TO - HANDOFF_ACTIVE_FROM;
// Share of the ACTIVE window spent approaching the portal; the rest is the exit.
const IN_LEG = 0.45;

// Derived, not hand-tuned, so the crawl's dialogue timing cannot drift out of
// sync with the animation if the window above is retuned.
export const HANDOFF_SWAP_AT = HANDOFF_ACTIVE_FROM + IN_LEG * ACTIVE_SPAN;
// The outgoing hero's line lights during the run-up, timed so it reaches full
// strength exactly as they reach the portal. It used to light a tenth of that
// window before the swap, because a line that sat still through the whole run-up
// read as a caption waiting for someone to arrive under it. It does not sit
// still any more — it travels with the hero (see handoffSpeakerDX) — and a
// moving line needs to be up and legible while the running is still happening,
// or the only part of the move you see is the last few frames of it.
export const HANDOFF_LINE_A_AT = HANDOFF_SWAP_AT - 0.10;
// The reply comes almost on the incoming hero's heels. The two lines used to
// sit 0.15 apart, which read as two statements; this close, it reads as one
// exchange interrupted by the portal.
export const HANDOFF_LINE_B_AT = HANDOFF_SWAP_AT + 0.02;

// How much of their own run each hero has STILL AHEAD of them: 1 at the moment
// they start, 0 the moment they are done — the outgoing hero when the portal
// takes them, the incoming one when they are gone off the right. It is the
// fraction of the travel, not of the clock, so it carries the acceleration the
// legs above are drawn with.
//
// The crawl hangs each dialogue line off this rather than off a curve of its
// own: a line trails its speaker by this much and lands as they finish, so
// retuning the staging up here moves the words with the legs. Zero for every
// candidate but the transit — the others stand their heroes still, so their
// dialogue has nothing to travel with.
export function handoffRunLeft(opts) {
  if ((opts.variant || HANDOFF_VARIANT) !== 'transit') return { a: 0, b: 0 };
  const s = transitAt(opts);
  // The approach's own travel curve, so the words accelerate into the portal
  // exactly as the hero does; the exit is flat out, so its leg fraction IS its
  // travel. A hero not on stage is not running: the outgoing one has landed
  // (0), the incoming one has not started (1).
  if (s.approach) return { a: 1 - (0.45 * s.k + 0.55 * s.k * s.k), b: 1 };
  return { a: 0, b: 1 - s.k };
}

export function drawHandoff(ctx, opts) {
  const v = HANDOFF_BY_ID[opts.variant || HANDOFF_VARIANT] || HANDOFF_BY_ID.pair;
  v.draw(ctx, opts);
}
