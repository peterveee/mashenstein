// The jump guard: the crane as an edge guard rather than as a function of
// altitude.
//
// The behaviour being guarded is a feel, so the test states it as four numbers
// a feel reduces to. Old dolly, for reference: pan = framingFor(y).pan every
// tick, which tracks the jump arc up and back down and — because the threshold
// is crossed at 170px/s of hero — starts from a standing stop at 340 screen
// px/s. Every assertion below is the negation of one of those properties.
import { installDom } from './dom-stub.js';
import {
  ZOOM, PAN_MAX, framingFor, guardNeed, guardFraming, guardApproach, guardRelease,
  guardFloorPan, ballisticApex, GUARD_DWELL, GUARD_TOP_MARGIN, GUARD_SPEED,
} from '../src/engine/camera.js';
import { GRAVITY, BASE_JUMP_V, AIR_JUMP_SCALE } from '../src/game/player.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

installDom({});

const DT = 1 / 60;

// The guard's state machine, lifted out of run.js's jumpGuard() so the shape
// under test is the shipped one and not a paraphrase of it. run.js adds the
// uncapped crown clamp on top; this is everything below that.
function makeGuard() {
  let need = guardNeed(0, 0);
  let dwell = 0;
  let pan = guardFraming(need).pan;
  return {
    get pan() { return pan; },
    step(y, vy, grounded, dt = DT) {
      dwell = grounded ? dwell + dt : 0;
      const rest = guardNeed(0, 0);
      const apex = ballisticApex(y, vy, GRAVITY);
      const demand = Math.max(rest, guardNeed(y, 0), guardNeed(apex, 0));
      need = dwell >= GUARD_DWELL
        ? Math.max(demand, guardRelease(need, rest, dt))
        : Math.max(need, demand);
      const framing = guardFraming(need);
      pan = Math.max(guardApproach(pan, framing.pan, dt), guardFloorPan(y, 0, framing.zoom));
      return { pan, zoom: framing.zoom, need };
    },
  };
}

// Fly a ballistic arc and report the pan trace, the old dolly's trace beside it,
// and the per-second speed of each. `airJumpAt` fires a second jump when the
// hero's rising speed has fallen to that fraction of the launch, which is how a
// double is actually played.
function flight(jumpMult = 1, airJumps = 0) {
  const v0 = BASE_JUMP_V * Math.sqrt(jumpMult);
  let y = 0; let vy = v0; let jumps = airJumps;
  const guard = makeGuard();
  const trace = [];
  let grounded = false;
  for (let t = 0; t < 4 && !(grounded && t > 0.4); t += DT) {
    if (jumps > 0 && vy <= 0) { vy = v0 * AIR_JUMP_SCALE; jumps -= 1; }
    vy -= GRAVITY * DT;
    y += vy * DT;
    if (y <= 0) { y = 0; vy = 0; grounded = true; }
    const g = guard.step(y, vy, grounded);
    trace.push({ t, y, pan: g.pan, zoom: g.zoom, old: framingFor(y, 0).pan });
  }
  return trace;
}

const speeds = (trace, key) => trace.slice(1).map((p, i) => Math.abs(p[key] - trace[i][key]) / DT);
const apexOf = (trace) => trace.reduce((m, p) => Math.max(m, p.y), 0);

// ---- 1. a jump that fits the frame moves the camera by nothing --------------
const single = flight(1);
assert(Math.abs(apexOf(single) - 57) < 4, `a single jump reaches about 57px (${apexOf(single).toFixed(1)})`);
assert(Math.max(...single.map((p) => p.pan)) === 0,
  'a single jump moves the crane not one pixel');

// ---- 2. a double jump costs a little, and the old one cost more -------------
const dbl = flight(1, 1);
const dblApex = apexOf(dbl);
const dblPan = Math.max(...dbl.map((p) => p.pan));
const dblOld = Math.max(...dbl.map((p) => p.old));
assert(dblApex > 88 && dblApex < 105, `a double jump reaches ~98px (${dblApex.toFixed(1)})`);
assert(dblPan < dblOld, `the guard spends less crane than the old dolly (${dblPan.toFixed(1)} < ${dblOld.toFixed(1)})`);
assert(dblPan > 0, 'but it does spend some — the crown would otherwise reach the edge');

// ---- 3. it is smooth: no velocity step, and a hard ceiling ------------------
//
// The old target's speed goes 0 -> ~340px/s in one frame at the threshold. The
// guard's is latched at the apex on the launch frame, so its own speed is a
// single glide that never exceeds the cap.
const oldSpeeds = speeds(dbl, 'old');
const panSpeeds = speeds(dbl, 'pan');
const oldJerk = Math.max(...oldSpeeds.slice(1).map((s, i) => Math.abs(s - oldSpeeds[i])) , 0);
const panJerk = Math.max(...panSpeeds.slice(1).map((s, i) => Math.abs(s - panSpeeds[i])), 0);
assert(Math.max(...panSpeeds) <= GUARD_SPEED + 1e-6,
  `the crane never travels faster than the cap (${Math.max(...panSpeeds).toFixed(0)} <= ${GUARD_SPEED}px/s)`);
assert(panJerk < oldJerk / 2,
  `and its speed never steps the way the old target's did (${panJerk.toFixed(0)} vs ${oldJerk.toFixed(0)}px/s per frame)`);

// ---- 4. latched: the descent does not play the ascent backwards -------------
const tall = flight(1.1, 2);
const apexIdx = tall.reduce((best, p, i) => (p.y > tall[best].y ? i : best), 0);
const after = tall.slice(apexIdx).filter((p) => p.y > 1);
assert(after.every((p, i) => i === 0 || p.pan >= after[i - 1].pan - 1e-6),
  'the crane never retreats while the hero is still in the air');
const oldAfter = tall.slice(apexIdx).filter((p) => p.y > 1).map((p) => p.old);
assert(Math.min(...oldAfter) < Math.max(...oldAfter) - 5,
  `where the old dolly gave ${(Math.max(...oldAfter) - Math.min(...oldAfter)).toFixed(0)}px of it back mid-descent`);

// ---- 5. released only after the dwell, and slowly ---------------------------
const guard = makeGuard();
for (let t = 0; t < 1.5; t += DT) guard.step(120, 0, false);
const held = guard.pan;
assert(held > 0, `a hero parked high holds the crane open (${held.toFixed(0)}px)`);
let landed = 0;
for (let t = 0; t < GUARD_DWELL - DT * 2; t += DT) { guard.step(0, 0, true); landed += DT; }
assert(Math.abs(guard.pan - held) < 0.5,
  `and it stays open through the dwell (${landed.toFixed(2)}s, moved ${Math.abs(guard.pan - held).toFixed(2)}px)`);
for (let t = 0; t < 1.5; t += DT) guard.step(0, 0, true);
assert(guard.pan < 0.5, 'then comes all the way back to the resting frame');

// ---- 6. the hero is never off the top --------------------------------------
//
// The guard's whole contract. Crown screen y is `GUARD_TOP_MARGIN` when the pan
// has caught up and lower only while it is still gliding, so the assertion is
// that the glide is never so far behind that the crown crosses zero.
for (const [mult, air, label] of [[1, 0, 'a single'], [1, 1, 'a double'], [1.1, 2, 'the tallest jump in the cast']]) {
  const trace = flight(mult, air);
  // screen y of the crown at the pan and zoom that frame actually chose.
  const worst = Math.min(...trace.map((p) => p.pan - guardFloorPan(p.y, 0, p.zoom)));
  assert(worst >= 0, `${label} keeps the crown inside the frame (${worst.toFixed(1)}px)`);
}

// ---- 7. the zoom is a backstop ordinary play never reaches ------------------
assert(Math.min(...dbl.map((p) => p.zoom)) === ZOOM, 'a double jump does not touch the zoom');
assert(guardFraming(guardNeed(180, 0)).pan <= PAN_MAX, 'the crane is capped at PAN_MAX');
assert(guardFraming(guardNeed(260, 0)).zoom < ZOOM,
  'and only a jump far past the roster ceiling opens the frame up');
assert(GUARD_TOP_MARGIN > 0 && GUARD_TOP_MARGIN < 24,
  `the guard margin is a screen distance, smaller than the hero (${GUARD_TOP_MARGIN}px)`);

console.log(failed ? 'CAMERA JUMP GUARD: FAILED' : 'CAMERA JUMP GUARD: PASSED');
process.exit(failed ? 1 : 0);
