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
import {
  drawProp, propFrames, propFps, PORTAL_SPRITE, portalArtWidth,
  PORTAL_SPENT_SPRITE, PORTAL_SPEND_FRAMES, PORTAL_SPEND_TIME,
} from '../sprites/props.js';
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

// The portal's drawn height. At 40 it stood only a shade taller than the 34u
// heroes running through it and read as a gadget between them rather than as
// the way out; 50 is half again their height, which is the proportion the run
// itself uses (a 44u portal over a smaller hero) without matching it exactly.
const PORTAL_H = 50;
// Width comes from the art's own proportion, not from a number picked back
// when the portal was an ellipse: 22 wide by 40 tall stretched the cut to 1.7x
// its authored width and every curve in it read as a facet.
// `spent` is seconds since a hero went through, or null while the portal is
// still live. A used portal stops being a loop and becomes a STRIP, clamped to
// its last frame — the identical rule drawPortal() follows in the run, off the
// identical art. The crawl showing a different aftermath to the game would make
// one of the two a lie about what the machine does.
function portalAt(ctx, cx, floorY, t, spent = null, h = PORTAL_H, w = portalArtWidth(PORTAL_H)) {
  const x = cx - w / 2, top = floorY - h;
  // The column's light, 1 while live and 0 once the collapse has finished. The
  // motes go out WITH it, for the reason the run's floor glow does: they are
  // the portal's light on the air, so they cannot outlive the light.
  const lit = spent == null ? 1 : Math.max(0, 1 - spent / PORTAL_SPEND_TIME);
  // The field orbits the column, so half of it belongs BEHIND the art. Drawing
  // the far side first and the near side after is what makes it read as one
  // ring of motes going round rather than a flat sprinkle stuck on the front.
  if (lit > 0.02) portalMotes(ctx, cx, floorY, t, h, w, false, lit);
  if (spent != null) {
    const f = Math.min(PORTAL_SPEND_FRAMES - 1,
      Math.max(0, Math.floor((spent / PORTAL_SPEND_TIME) * PORTAL_SPEND_FRAMES)));
    drawProp(ctx, PORTAL_SPENT_SPRITE, x, top, w, h, f);
  } else {
    // Fixed height, cycling frames: the art animates itself now, and a height
    // that breathed would cache the whole frame set once per pixel of pulse.
    const f = Math.floor(t * propFps(PORTAL_SPRITE)) % propFrames(PORTAL_SPRITE);
    drawProp(ctx, PORTAL_SPRITE, x, top, w, h, f);
  }
  if (lit > 0.02) portalMotes(ctx, cx, floorY, t, h, w, true, lit);
}

// The credits' own embellishment on the shipped portal: a fine field of motes
// spiralling up the column and being drawn into it.
//
// This exists only here, and deliberately. The run paints the same portal at
// 14x44 with a dozen other things moving and a frame budget it can lose; the
// crawl paints ONE of them on an otherwise empty starfield, at 50 tall, with
// nothing else animating in the band. So the credits can afford the detail the
// run cannot, and it is the screen where the portal is finally the subject.
//
// STATELESS on purpose. A particle pool would need owning, resetting per
// hand-off block, and keeping out of the live game's pool (the same objection
// drawBlast answers below); every mote here is a pure function of its index and
// the clock, so the field costs one loop and nothing to maintain.
const MOTE_N = 34;
const TAU = Math.PI * 2;
// Irrational strides, so the three per-mote parameters never come back into
// step with each other and the field never bands into visible rows.
const frac = (v) => v - Math.floor(v);
function portalMotes(ctx, cx, floorY, t, h, w, near, lit = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < MOTE_N; i++) {
    const r1 = frac(i * 0.6180339887);   // how wide it orbits
    const r2 = frac(i * 0.7548776662);   // how fast it climbs
    const r3 = frac(i * 0.5698402910);   // where in the climb it starts
    // 0 at the plinth, 1 at the top of the column, then straight back to 0 —
    // the wrap is invisible because a mote is fully faded at both ends.
    const k = frac(t * (0.3 + r2 * 0.55) + r3);
    // Angle accumulates with the CLIMB rather than with the clock, so a mote
    // that rises quickly also whips round quickly: one speed, not two.
    const a = r3 * TAU + k * TAU * (1.7 + r1 * 1.6);
    const depth = Math.sin(a);
    if ((depth > 0) !== near) continue;
    // The orbit funnels in as it rises — the field is being swallowed, which
    // is the only reason a portal would have one.
    const rad = w * (0.5 + r1 * 1.8) * (1 - 0.5 * k);
    const x = cx + Math.cos(a) * rad;
    const y = floorY - h * (0.04 + 0.95 * k);
    // A mote in front is nearer, so it is bigger and brighter than the same
    // mote half a turn later. Sizes stay well under a unit: the ask was finer,
    // and anything at 1u reads as a bead next to a 0.3u hoop.
    const front = 0.5 + 0.5 * depth;
    const fade = Math.sin(Math.PI * k) ** 0.7 * lit;
    ctx.globalAlpha = fade * (0.18 + 0.5 * front);
    // A quarter of them are the plinth's warm white; the rest are the teal the
    // rings are lit in. Set by index, so a mote keeps its colour for its whole
    // climb instead of flickering between the two.
    ctx.fillStyle = i % 4 === 0 ? '#fff6d0' : '#a8ffe8';
    ctx.beginPath();
    ctx.arc(x, y, 0.16 + 0.34 * front, 0, TAU);
    ctx.fill();
    // The fastest third leave a short trail along their own path. Two dimmer
    // copies a few hundredths of a climb behind is cheaper than a real streak
    // and, at this size, indistinguishable from one.
    if (r2 > 0.66) {
      for (let s = 1; s <= 2; s++) {
        const ks = k - s * 0.018;
        if (ks <= 0) break;
        const as = r3 * TAU + ks * TAU * (1.7 + r1 * 1.6);
        ctx.globalAlpha = fade * (0.18 + 0.5 * front) * (0.45 / s);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(as) * (w * (0.5 + r1 * 1.8) * (1 - 0.5 * ks)),
          floorY - h * (0.04 + 0.95 * ks), 0.14 + 0.2 * front, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
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
  // Once the hero is through, the portal is SPENT — the same state the run puts
  // it in, played off the same six-frame strip. Seconds since the swap, not a
  // fraction of it: the strip is cut for a third of a second and stretching it
  // over a block's crossing would turn a discharge into a slow dissolve.
  portalAt(ctx, cx, floorY, o.t, approach ? null : (q - IN_LEG) * ACTIVE_SPAN * crossingSeconds(o));

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
    // The light comes OUT OF THE SLOT, so that is where it is centred: the plate
    // is the emitter and the column is what the emitter throws. Centred on the
    // column's mid-height instead, the halo outlived its own source — the rings
    // collapse onto the plate a third of a second after the swap, leaving a ball
    // of light hanging in empty air above a dark plinth with nothing under it
    // that could be making it.
    const src = floorY - PORTAL_H * 0.06;
    const r = 46 * flare + 6;
    // Taller than wide, and scaled about the slot rather than about the middle
    // of the halo. A round glow at the base reads as a puddle on a floor; this
    // one is thrown UP the column, which is the direction the hardware points.
    ctx.translate(cx, src);
    ctx.scale(1, 1.25);
    const g = ctx.createRadialGradient(0, -r * 0.28, 0, 0, -r * 0.28, r);
    g.addColorStop(0, `rgba(220,255,246,${(0.85 * flare).toFixed(3)})`);
    g.addColorStop(1, 'rgba(72,224,200,0)');
    ctx.fillStyle = g;
    // Fill the GRADIENT's own square, not the block's box. The box is 48u tall
    // and the glow is wider than that, so filling the box sliced the halo flat
    // across the top and bottom — a soft round light with two hard horizontal
    // edges through it. Nothing clips the crawl at this point, and a glow that
    // reaches a few units into the empty gap above and below the block is what
    // a light spilling out of a doorway is supposed to do.
    ctx.fillRect(-r, -r * 1.28, r * 2, r * 2);
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

// How long a block takes to cross the screen, in seconds — the bridge between
// `progress` (which is a position, so the beat plays where it can be seen) and
// the portal's spend strip (which is cut in real seconds). The crawl passes its
// own figure, (H + HANDOFF_H) / SCROLL_SPEED; the default is that same sum, for
// gallery tiles that only have a box and a progress to hand.
const CROSSING_SECONDS = (270 + 48) / 30;
const crossingSeconds = (o) => o.crossing || CROSSING_SECONDS;

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
