// CRYPT SHIFT — the near bank's iron gates, moving (shipped 27 Sep 2026 from the lab's
// crypt-gate-bakeoff). The gouache bake keeps the posts; cryptGouache.js paints what
// hangs between them live through view.gate, and the pack picks:
//   gateCreak  the gates as a rule. The right leaf stands ajar and swings in the wind.
//   gateBank   landscape: creaking, except one gate in SLAM_EVERY, which is gateSlam —
//              Peter: "A mostly with the occasional slam shut (to make it special)".
//   gateSlam   both leaves stand wide, fluttering in the wind, while the gate comes up —
//              then bang shut a stride before the runner reaches it, on the beat, and
//              stay shut, rattling, till he's by ("slam shut JUST before the hero gets
//              to them... sort of like denying him entry"). Never in portrait, where the
//              hero sits too far across the picture for it to read ("in portrait always
//              do A").
// Every leaf is the shipped gate's own strokes, written closed and moved by
//   swing  th   about the hinge post, into the graveyard (squeezes toward the hinge, the
//               free edge shortens, the rings go elliptical)
//   tip    tip  about its foot, toward the camera
//   sag    rot  in the picture plane about a hinge that still holds
// so the lab's other candidates (src/dev/crypt-gate-bakeoff.js) draw with the same hand.
import { GOUACHE_KIT as K, GATE_HALF } from './cryptGouache.js';

const TAU = Math.PI * 2;
export const HW = GATE_HALF;
const IRON = K.css(K.C.iron);
const LIT = K.C.ironLit;
const FOCAL = 90;   // perspective: px from the eye to the gate's plane
const EYE = -14;    // eye height above the foot
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeOut = (v) => 1 - (1 - clamp01(v)) ** 2;
export const wrap = (v, n) => ((v % n) + n) % n;

// ---------------------------------------------------------------- the leaf, written closed
// s runs from the hinge (0) to the meeting stile (15), y up from the foot (negative):
// the same arch, rails, pickets and scroll the shipped gate draws, cut in half at the
// centre, plus a hinge stile the post hides while the leaf is hung.
const LEAF = (() => {
  const out = [];
  const arch = [];
  for (let s = 0; s <= HW + 0.01; s += 1.5) { const X = HW - s; arch.push([s, -26 - (225 - X * X) / 30]); }
  out.push({ w: 1.4, pts: arch, sheen: true });
  for (const y of [-12, -4]) out.push({ w: 1.4, pts: [[0, y], [HW, y]], sheen: y === -12 });
  for (const s of [5, 10, 15]) out.push({ w: 1.2, pts: [[s, 1], [s, -26 - 6.5 * Math.cos((HW - s) / HW * 1.4)]] });
  out.push({ w: 1.2, pts: [[0.6, 0], [0.6, -26]] });
  const ring = [];
  for (let k = 0; k <= 20; k++) { const a = k / 20 * TAU; ring.push([10 + 2.6 * Math.cos(a), -19 + 2.6 * Math.sin(a)]); }
  out.push({ w: 0.9, pts: ring });
  // Subdivided, so the tip's perspective bends nothing it shouldn't.
  for (const st of out) {
    const pts = [st.pts[0]];
    for (let k = 1; k < st.pts.length; k++) {
      const [a, b] = [st.pts[k - 1], st.pts[k]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
      for (let j = 1; j <= n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    st.pts = pts;
  }
  return out;
})();

// Leaf-local (s, y) to screen, for leaf side d (-1 hangs on the left post, +1 the right).
// st: { th, tip, rot, pivot: [s, y], dx, dy }.
function projector(st, d, gx, b) {
  const inward = -d;
  const hx = d * HW;
  const cT = Math.cos(st.th || 0), sT = Math.sin(st.th || 0);
  const cP = Math.cos(st.tip || 0), sP = Math.sin(st.tip || 0);
  const map3 = (s, y) => {
    const h = 1 - y;                     // height above the tip's axis, just under the foot
    // The camera looks down on the bank a little, so a leaf tipping toward it lies
    // across the bank below its foot rather than folding onto the foot line.
    const yy = 1 - h * cP + 0.3 * h * Math.max(0, sP);
    const z = -h * sP + s * sT;          // + is into the graveyard
    const p = FOCAL / (FOCAL + z);
    return [hx + inward * s * cT, yy, p];
  };
  let piv = null;
  if (st.rot) {
    const [ps, py] = st.pivot || [0, -4];
    const [x, y, p] = map3(ps, py);
    piv = [x * p, EYE + (y - EYE) * p];
  }
  const a = inward * (st.rot || 0);
  const cR = Math.cos(a), sR = Math.sin(a);
  return (s, y) => {
    const [x3, y3, p] = map3(s, y);
    let x = x3 * p;
    let yy = EYE + (y3 - EYE) * p;
    if (piv) {
      const ax = x - piv[0], ay = yy - piv[1];
      x = piv[0] + ax * cR - ay * sR;
      yy = piv[1] + ax * sR + ay * cR;
    }
    return [gx + x + (st.dx || 0), b + yy + (st.dy || 0), p];
  };
}

// One leaf. The moon catches the flat of the top rail and the arch while the leaf faces
// the camera, brightest at the hinge; turned away, the sheen goes and the free edge is
// the darkest part (see [[inward-swing-reads-as-rotation]] for why a swing needs that).
export function leaf(ctx, st, d, gx, b, alpha = 1) {
  const P = projector(st, d, gx, b);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = IRON;
  for (const stroke of LEAF) {
    ctx.lineWidth = stroke.w;
    ctx.beginPath();
    stroke.pts.forEach(([s, y], k) => {
      const [x, yy] = P(s, y);
      k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    });
    ctx.stroke();
  }
  const turn = Math.abs(Math.sin(st.th || 0));
  if (turn > 0.02) {
    ctx.lineWidth = 0.5;
    for (const stroke of LEAF) {
      if (!stroke.sheen) continue;
      for (let k = 1; k < stroke.pts.length; k++) {
        const s = stroke.pts[k][0];
        const f = (1 - turn) * (1 - 0.8 * s / HW);
        if (f < 0.04) continue;
        const [x0, y0] = P(stroke.pts[k - 1][0], stroke.pts[k - 1][1] - 0.7);
        const [x1, y1] = P(s, stroke.pts[k][1] - 0.7);
        ctx.strokeStyle = K.css(LIT, 0.45 * f * alpha);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// A soft puff of dirt off the bank, age 0..1.
export function puff(ctx, x, y, age, spread = 14) {
  if (age <= 0 || age >= 1) return;
  const a = (1 - age) ** 1.5;
  for (let k = 0; k < 6; k++) {
    const dir = (k / 5 - 0.5) * 2;
    const r = 2 + age * (3 + (k % 3));
    ctx.fillStyle = K.css([86, 84, 122], 0.5 * a);
    ctx.beginPath();
    ctx.ellipse(x + dir * spread * easeOut(age * 1.4), y - 1 - age * (2 + (k % 2) * 2), r * 1.3, r * 0.8, 0, 0, TAU);
    ctx.fill();
  }
}

// The wind across the bank: slow swells with a flutter in them, 0..1. Each gate is in
// its own part of the weather.
export function wind(t, i) {
  return clamp01(0.52 + 0.24 * Math.sin(0.63 * t + i * 2.1) + 0.15 * Math.sin(1.7 * t + 0.4 + i)
    + 0.06 * Math.sin(4.3 * t + i * 3));
}

// ---------------------------------------------------------------- portrait: creaking ajar
export function gateCreak(ctx, f) {
  {
    const { x, b, t, i } = f;
    const w = wind(t, i);
    leaf(ctx, { th: 0.03 + 0.03 * Math.sin(1.3 * t + 2) }, -1, x, b);
    leaf(ctx, { th: 0.35 + 0.7 * w + 0.05 * Math.sin(5.1 * t + i) }, 1, x, b);
  }
}

// ---------------------------------------------------------------- landscape: slams in your face
const SLAM_LEAD = 30;      // px ahead of the runner the slam lands
const SLAM_T = 0.28;       // open to shut
const SLAM_ARM = 0.6;      // s before the mark the slam is asked for (the clang is placed then)
const HERO_X = 118;        // where the runner stands in a landscape frame, when a card has no heroX
export function slamOpen(t, i, d) {
  // Wide, and never still: the right leaf a touch wider and quicker.
  const w = wind(t, i + (d > 0 ? 0 : 0.7));
  return (d > 0 ? 1.15 : 0.95) + 0.12 * (w - 0.5) + 0.07 * Math.sin((d > 0 ? 9 : 7.6) * t + i)
    + 0.04 * Math.sin(5.3 * t + d);
}
// The leaf's swing `age` s after it starts to close from th0; the left leaf lands 50 ms
// behind the right (the cue's second clank).
export function slamShut(age, th0, delay) {
  const v = age - delay;
  if (v < 0) return th0;
  if (v < SLAM_T) { const q = v / SLAM_T; return th0 * (1 - q * q); }
  const w = v - SLAM_T;
  // The bounce (back on the latch 0.31 s after the slam: the cue's third hit), then the
  // latch rattling as the wind keeps trying it.
  return 0.2 * Math.abs(Math.sin(w * 10)) * Math.exp(-w * 4.5) + 0.012 * Math.abs(Math.sin(w * 23)) * Math.exp(-w * 0.6);
}
export function drawSlam(ctx, x, b, t, i, shutAt) {
  const start = shutAt == null ? Infinity : shutAt - SLAM_T;
  const age = t - start;
  const open = (d) => (age < 0 ? slamOpen(t, i, d) : slamShut(age, slamOpen(start, i, d), d > 0 ? 0 : 0.05));
  leaf(ctx, { th: open(-1) }, -1, x, b);
  leaf(ctx, { th: open(1) }, 1, x, b);
  if (age >= 0) puff(ctx, x, b, (age - SLAM_T) / 0.8, 10);
}

// One approach per gate: armed when the gate is SLAM_ARM from the mark at its speed across
// the picture, which is when the slam is asked of view.gateCue (the run: it rounds the
// landing to the song's half beat and places the clang on the same clock, and says how
// long that is). A gate that turns up out ahead again (the next pass, a retry) re-arms;
// one first seen already past the mark is already shut.
//
// NOT NEAR A TUNNEL. The first time the gate's speed is known, the approach asks
// view.gateMaySlam when the slam would land; where the runner will be in or near an
// underground tunnel then, the camera is down in the cutaway and the bank is out of the
// picture, so this gate creaks instead, for the whole approach (Peter: "it won't be seen
// properly, just do the other option in that case"). Kept per canvas, so the gallery's
// cards (each its own canvas, each its own camera) never trip over each other.
const APPROACHES = new WeakMap();
export function gateSlam(ctx, f) {
  const { x, b, t, i, view } = f;
  const mark = (Number.isFinite(view?.heroX) ? view.heroX : HERO_X) + SLAM_LEAD;
  let gates = APPROACHES.get(ctx.canvas || ctx);
  if (!gates) { gates = new Map(); APPROACHES.set(ctx.canvas || ctx, gates); }
  let s = gates.get(i);
  const may = (sec) => (typeof view?.gateMaySlam === 'function' ? view.gateMaySlam(sec) !== false : true);
  // A new approach: first sight, the gate back out to the right (the next pass, a retry),
  // or the clock gone back or skipped (a pause, a restart).
  if (!s || x > s.x + 40 || t < s.t || t - s.t > 1) {
    const past = x < mark;
    s = { t, x, v: 0, shutAt: past ? t - 10 : null, may: past ? may(0) : null };
    gates.set(i, s);
  }
  const dt = t - s.t;
  if (dt > 0 && dt < 0.25) {
    const v = (s.x - x) / dt;
    s.v = s.v ? s.v + (v - s.v) * 0.25 : v;
  }
  s.t = t;
  s.x = x;
  if (s.may == null && s.v > 1) s.may = may(Math.max(0, (x - mark) / s.v));
  // Until it has asked, and if the answer was no, this gate is a creaking one.
  if (!s.may) { gateCreak(ctx, f); return; }
  if (s.shutAt == null && s.v > 1) {
    const toMark = (x - mark) / s.v;
    if (toMark <= SLAM_ARM) {
      const sec = Math.max(0, toMark);
      const cued = typeof view?.gateCue === 'function' ? view.gateCue(sec, SLAM_T) : null;
      s.shutAt = t + (Number.isFinite(cued) ? cued : sec);
    }
  }
  drawSlam(ctx, x, b, t, i, s.shutAt);
}

// ---------------------------------------------------------------- landscape: the bank's gates
// Every gate the run meets has its own number, k = 2 * pass + i, counting on along the
// bank from one stage into the next. One in four slams: k = 3, 7, 11 ... A stage
// (12,852 px) meets four or five gates, so that is ONE slam a stage, gate 3 in each:
// crypt-1 at ≈64% of the run (≈79% at zoom 1.6), crypt-2 ≈48% (≈60%), crypt-3 ≈34%
// (≈43%) — measured 27 Sep, never in a stage's opening stretch.
export const SLAM_EVERY = 4;
const SLAM_SLOT = 3;
export const isSlamGate = (pass, i) => wrap(2 * pass + i, SLAM_EVERY) === SLAM_SLOT;
export function gateBank(ctx, f) {
  if (isSlamGate(f.pass ?? 0, f.i)) gateSlam(ctx, f);
  else gateCreak(ctx, f);
}
