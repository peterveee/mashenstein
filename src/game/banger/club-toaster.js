// THE FLYING TOASTER (Peter, 6 Oct 2026: "lets add a flying toaster to one of the events that
// might happen (never when under water though)... clicking on it makes it loop the loop").
//
// The game's own SILVER TOASTER (props.js applianceSilver — the one a stage offers once its
// TOASTER plug is banked, which pays only coins; Peter, 7 Oct 2026: "make it the chrome version of
// the ingame toaster which rewards just coins"), flying across the room over the heroes' heads,
// a little downhill all the way, its wingbeat put on the beat and its toast on a two-bar cycle.
// A tap sends it round a loop-the-loop, and its chrome flashes once on the way round, where it
// turns through the light (the glint is an angle, not a clock). club.js starts it (`toaster`,
// one of CLUB_MOMENTS, never under water) and takes the tap (tapToaster); this works out where
// it is and draws it.

import { drawProp, applianceSheenSprite } from '../../sprites/props.js';

const TAU = Math.PI * 2;
/** How long a crossing takes, in seconds, not counting its loops. */
export const TOASTER_S = 6;
/** Its width, in hero heights; its height is the game's sprite's (22x18). */
export const TOASTER_SIZE = 0.55;
const ASPECT = 18 / 22;
/** How much faster than it crosses it goes round a loop. */
const LOOP_SPEED = 1.3;
/** Where the light is: the nose-up angle (rad) at which the chrome flashes, and how narrow the flash. */
const GLINT_AT = -0.75, GLINT_W = 0.28;

/**
 * A new crossing: which way, and where in the sky it starts and ends (fractions of it, top to the
 * heroes' heads) — low enough that a loop clears the mirror ball, high enough to clear their heads.
 */
export function makeToaster(rnd = Math.random) {
  const y0 = 0.4 + rnd() * 0.15;
  return { dir: rnd() < 0.5 ? 1 : -1, y0, y1: y0 + 0.05 + rnd() * 0.15, loops: [] };
}

/** How far along its crossing it has flown at `t` seconds in: the time spent going round loops does not count. */
const flown = (m, k) => k - m.loops.reduce((sum, l) => sum + Math.max(0, Math.min(l.dur, k - l.at)), 0);

/**
 * Where the toaster is `k` seconds into moment `m`, in a room `width` wide whose sky runs from
 * `top` to `bottom` (the heroes' heads), the toaster `S` long. { x, y, pitch (rad, its own nose
 * up negative), dir, looping (0–1 round the loop, or null), speed (px/s) }.
 */
export function toasterAt(m, k, { width, top, bottom, S }) {
  const margin = S * 1.4;
  const run = width + 2 * margin;
  const speed = run / TOASTER_S;
  const path = (f) => {
    const p = f / TOASTER_S;
    const x = m.dir > 0 ? -margin + run * p : width + margin - run * p;
    const y = top + (bottom - top) * (m.y0 + (m.y1 - m.y0) * p);
    return { x, y };
  };
  const f = flown(m, k);
  const at = path(f);
  const ahead = path(f + 0.05);
  // the nose follows the way it is going, a little downhill
  let pitch = Math.atan2(ahead.y - at.y, Math.abs(ahead.x - at.x));
  let { x, y } = at;
  let looping = null;
  const loop = m.loops.find((l) => k >= l.at && k < l.at + l.dur);
  if (loop) {
    const q = (k - loop.at) / loop.dur;
    const th = TAU * q;
    x += m.dir * loop.r * Math.sin(th);
    y -= loop.r * (1 - Math.cos(th));
    pitch -= th;
    looping = q;
  }
  return { x, y, pitch, dir: m.dir, looping, speed };
}

/** A loop for moment `m`, started `k` seconds in: as big as the sky above it allows, and how long it takes. */
export function toasterLoop(m, k, { width, top, bottom, S }) {
  const here = toasterAt(m, k, { width, top, bottom, S });
  const r = Math.max(S * 0.55, Math.min(S * 1.15, (here.y - top - S * 0.2) / 2));
  return { at: k, r, dur: TAU * r / (here.speed * LOOP_SPEED) };
}

/**
 * The toaster, `S` wide, centred on the origin and facing right (the caller mirrors it), nose
 * `pitch` up or down. The prop's own animation, put on the beat: its 12-frame wingbeat once a beat,
 * the wings down on it, so its 96 frames — the toast's cycle — run over two bars.
 */
export function drawToaster(ctx, S, { beat = 0, pitch = 0 } = {}) {
  const w = S, h = S * ASPECT;
  const frame = ((Math.floor(beat * 12 + 6) % 96) + 96) % 96;
  // the band of light across its chrome (props.js applianceSheenSprite): where it is, and how bright
  const off = ((((pitch - GLINT_AT) % TAU) + TAU + Math.PI) % TAU) - Math.PI;   // how far off the light, -π..π
  const a = Math.exp(-((off / GLINT_W) ** 2));
  ctx.save();
  ctx.translate(0, S * 0.04 * Math.sin(TAU * beat));
  ctx.rotate(pitch);
  const sheen = a > 0.03 ? applianceSheenSprite(w, h, frame, { pos: Math.max(-1, Math.min(1, off / (2 * GLINT_W))), a }) : null;
  if (sheen) {
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sheen, -w / 2, -h / 2, w, h);
    ctx.imageSmoothingEnabled = prev;
  } else drawProp(ctx, 'applianceSilver', -w / 2, -h / 2, w, h, frame);
  ctx.restore();
}
