// THE ANCHOR EASES IN AS WELL AS OUT.
//
// Every ease in camera.js is exponential, which is ease-OUT and nothing else:
// peak velocity on frame one, decaying from there. For a target that moves
// smoothly that is invisible. For a target that JUMPS — a sky fork lifting the
// anchor a hundred pixels the instant the hero claims it — the first frame IS
// the sharp part, and measured across every stage in the game the anchor was
// the source of every world-slide over 400px/s, topping out at 898.
//
// The replacement is a critically damped spring, which is the same settling
// shape with the missing half put back. What that buys is stated here as the
// four things it has to be true of, plus the one budget the anchor and the crane
// now spend out of together.
import { installDom } from './dom-stub.js';
import {
  springFloor, stepFloorSpring, floorSpringW, easeFloor, guardApproach,
  FLOOR_RISE_W, FLOOR_FALL_W, FLOOR_MAX_SPEED, CAM_SLIDE_MAX, FOOTROOM_CATCHUP, GUARD_SPEED,
} from '../src/engine/camera.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

installDom({});

const DT = 1 / 60;
const Z = 2;

// A hundred-pixel hand-over, the sky fork's. Sprung, and eased, side by side.
function handover(dist, omega, steps = 240) {
  let x = 0; let v = 0;
  const out = [];
  for (let i = 0; i < steps; i++) {
    const before = x;
    const next = stepFloorSpring(x, v, dist, omega, Z, DT);
    x = next.value; v = next.velocity;
    out.push({ x, v, speed: Math.abs(x - before) / DT });
  }
  return out;
}
function easedHandover(dist, k, steps = 240) {
  let x = 0;
  const out = [];
  for (let i = 0; i < steps; i++) {
    const before = x;
    x = x + (dist - x) * (1 - Math.exp(-k * DT));
    out.push({ x, speed: Math.abs(x - before) / DT });
  }
  return out;
}

const DIST = 100;
const sprung = handover(DIST, FLOOR_RISE_W);
const eased = easedHandover(DIST, 4.5);

// ---- 1. it eases IN ---------------------------------------------------------
// Not literally zero: the integrator is implicit, so its first step already
// carries the acceleration across that step. What matters is that frame one is
// a small fraction of the move rather than the whole of it.
const sprungPeakSpeed = Math.max(...sprung.map((p) => p.speed));
assert(sprung[0].speed < sprungPeakSpeed * 0.45,
  `the spring builds into the move (frame one ${sprung[0].speed.toFixed(0)} of a ${sprungPeakSpeed.toFixed(0)} world px/s peak)`);
assert(eased[0].speed > 400 && sprung[0].speed < eased[0].speed / 4,
  `where the exponential's first frame WAS the whole move (${eased[0].speed.toFixed(0)} vs ${sprung[0].speed.toFixed(0)} world px/s)`);
const peakAt = sprung.reduce((best, p, i) => (p.speed > sprung[best].speed ? i : best), 0);
assert(peakAt > 4,
  `and the spring's fastest frame is not its first (frame ${peakAt})`);

// ---- 2. and it is slower at its fastest --------------------------------------
const sprungPeak = sprungPeakSpeed;
const easedPeak = Math.max(...eased.map((p) => p.speed));
assert(sprungPeak < easedPeak * 0.6,
  `peak speed is well under the exponential's (${sprungPeak.toFixed(0)} vs ${easedPeak.toFixed(0)} world px/s)`);

// ---- 3. critically damped: it arrives, and does not overshoot ----------------
assert(Math.max(...sprung.map((p) => p.x)) <= DIST + 0.01,
  `it never overshoots (max ${Math.max(...sprung.map((p) => p.x)).toFixed(2)} of ${DIST})`);
assert(sprung[sprung.length - 1].x > DIST - 0.5,
  `and it does arrive (${sprung[sprung.length - 1].x.toFixed(2)} of ${DIST} in ${(sprung.length * DT).toFixed(1)}s)`);

// ---- 4. the speed ceiling, and no wind-up behind it --------------------------
//
// A long hand-over hits FLOOR_MAX_SPEED. Clamping the POSITION alone would let
// the spring keep integrating toward a target it is not allowed to approach and
// arrive with all of that speed still in it, so the clamp writes the velocity
// back too. The test for that is the same one as above: no overshoot.
const long = handover(600, FLOOR_RISE_W, 600);
const cap = FLOOR_MAX_SPEED / Z;
assert(Math.max(...long.map((p) => p.speed)) <= cap + 1e-6,
  `a long hand-over is capped (${Math.max(...long.map((p) => p.speed)).toFixed(0)} <= ${cap.toFixed(0)} world px/s)`);
assert(Math.max(...long.map((p) => p.x)) <= 600 + 0.01,
  'and does not arrive carrying the speed the cap withheld');

// ---- 5. the asymmetry survived ----------------------------------------------
assert(floorSpringW(200, 100) === FLOOR_RISE_W, 'a rise gets the slow stiffness');
assert(floorSpringW(100, 200) === FLOOR_FALL_W, 'a fall gets the fast one');
assert(FLOOR_FALL_W > FLOOR_RISE_W,
  `and a fall is still the more urgent of the two (${FLOOR_FALL_W} > ${FLOOR_RISE_W})`);

// ---- 6. the shared budget ---------------------------------------------------
//
// The measurement that forced it: on a sky fork the anchor climbs to re-pin AND
// the crane opens for the jump taken on the way up, both in the same direction,
// each inside its own limit and 620px/s between them. One budget, or the promise
// is not about the picture.
assert(CAM_SLIDE_MAX < FLOOR_MAX_SPEED + GUARD_SPEED,
  `the budget is tighter than the two separate caps added up (${CAM_SLIDE_MAX} < ${FLOOR_MAX_SPEED} + ${GUARD_SPEED})`);
assert(CAM_SLIDE_MAX >= FLOOR_MAX_SPEED,
  'but not so tight that the anchor alone cannot reach its own cap');
assert(FOOTROOM_CATCHUP > 0,
  'and the footroom clamp has an allowance on top of the hero\'s own drop, so it can never lose ground to him');

// ---- 7. the raw spring is stable at any frame rate --------------------------
//
// Implicit rather than explicit integration, because the explicit form blows up
// as omega * dt approaches 1 and this runs at whatever the machine manages.
for (const dt of [1 / 240, 1 / 60, 1 / 30, 1 / 10, 1 / 4]) {
  let x = 0; let v = 0; let worst = 0;
  for (let i = 0; i < 200; i++) { const n = springFloor(x, v, 100, FLOOR_FALL_W, dt); x = n.value; v = n.velocity; worst = Math.max(worst, x); }
  assert(worst <= 100.01 && x > 99.5,
    `stable and convergent at ${(1 / dt).toFixed(0)}fps (peak ${worst.toFixed(2)}, settled ${x.toFixed(2)})`);
}

console.log(failed ? 'CAMERA ANCHOR SPRING: FAILED' : 'CAMERA ANCHOR SPRING: PASSED');
process.exit(failed ? 1 : 0);
