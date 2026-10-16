// Gallery-only: THE FERAL DOG, REDONE — a bake-off (16 Oct 2026).
//
// Peter: "could you make a stab at redoing the dogs to look better and have a smoother
// run cycle? just do the most vicious looking one" — "bakeoff". The most vicious of the
// three lane dogs is the feral (dogFeral, Crypt's starved wolf-dog: tall, gaunt, hackles,
// ribs), so the sheet is that one dog. NOW is the shipped dog through the real run
// painter; every candidate is drawn by the shipped painter too (sprites/dogs.js
// paintDog, through its gallery `hooks` seam), so the construction — one silhouette,
// one line — is the kennel's and only what a candidate changes differs.
//
// WHY THE SHIPPED RUN STEPS. Two things, both measurable:
//   * EIGHT FRAMES AT 15 FPS. A full gallop in eight poses is a pose every 67 ms — the
//     legs jump between keys rather than travel.
//   * THE FEET SKATE. The keyed gallop moves a planted foot back at about 2/3 of the
//     dog's own ground speed (vx −68), so in the lane every stance foot slides forward
//     along the road. That is most of why it reads as treading air.
// THE NEW GAIT fixes both. Each foot has a STANCE (planted: it moves back at exactly
// the ground speed, so it is nailed to the road) and a SWING (a Hermite curve that
// leaves and arrives at that same speed, so there is no hitch at touch-down or
// lift-off). Rotary double-suspension gallop: far hind, near hind, extended flight,
// near fore, far fore, gathered flight. The body rides two bumps a cycle (one per
// flight), the spine flexes gathered/extended, and the head is stabilised against the
// bob the way a hunting dog's is — eyes level, jaws working. The frame rate is DERIVED
// from the stride and the box so the stance feet match the road exactly; 16 frames.
//
// Nothing here is registered in any gameplay registry.
import { paintDog, DOG_BREEDS, DOG_KIT } from '../sprites/dogs.js';
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X, PLAYER_W } from '../game/player.js';
import { GROUND_Y } from '../engine/camera.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { ANIMAL_FPS, ANIMAL_FRAMES } from '../sprites/animals.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const pt = (x, y) => ({ x, y });
const { ik } = DOG_KIT;

// The feral's slot, as the run paints it: entities.js 17x12, vx −68; animals.js
// TALL 1.15, VISUAL 1.16. The candidates keep all of it.
export const FERAL_SLOT = Object.freeze({ box: [17, 12], tall: 1.15, visual: 1.16, vx: 68 });
// A candidate may propose its own slot (round 2's wolves are drawn bigger).
const slotOf = (cand) => cand.slot || FERAL_SLOT;
const envOf = (sl) => ({ w: Math.round(sl.box[0] * 4 / 3 * sl.visual), h: Math.round(sl.box[1] * 4 / 3 * sl.tall * sl.visual) });

// ------------------------------------------------------------------ the gallop
// Phases are fractions of one cycle; foot x is relative to the leg's REST root, in
// units of L x stride. Touch-down x is authored; lift-off is derived so every planted
// foot moves back at the same speed (STRIDE_L per cycle).
const STRIDE_L = 2.9;
const GALLOP = {
  hindFar: 0.00, hindNear: 0.07, foreNear: 0.44, foreFar: 0.52,
  hindDuty: 0.30, foreDuty: 0.28,
  hindTD: 0.42, foreTD: 0.46,
  // The flights' middles: extended after the near hind lifts, gathered after the far fore.
  flightE: 0.405, flightG: 0.90,
};
// Lowest segment's direction (fore: carpus -> foot; hind: foot -> hock), degrees.
const FORE_SWING_A = [122, 178, 228, 232, 160, 100, 80];
const HIND_SWING_A = [-58, -28, 12, 18, -40, -88, -106];

function spline(keys, v) {
  const n = keys.length - 1;
  const x = clamp01(v) * n;
  const i = Math.min(Math.floor(x), n - 1), f = x - i;
  const k0 = keys[Math.max(i - 1, 0)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(i + 2, n)];
  return 0.5 * ((2 * k1) + (-k0 + k2) * f + (2 * k0 - 5 * k1 + 4 * k2 - k3) * f * f
    + (-k0 + 3 * k1 - 3 * k2 + k3) * f * f * f);
}
function hermite(p0, p1, m0, m1, v) {
  const v2 = v * v, v3 = v2 * v;
  return (2 * v3 - 3 * v2 + 1) * p0 + (v3 - 2 * v2 + v) * m0 + (-2 * v3 + 3 * v2) * p1 + (v3 - v2) * m1;
}

// One foot at `phase`: x (in L x stride, from the rest root), lift y (in L), angle.
function footAt(phase, td, duty, tdX, isFore) {
  const u = (((phase - td) % 1) + 1) % 1;
  const loX = tdX - STRIDE_L * duty;
  if (u < duty) {
    const s = u / duty;
    return { x: lerp(tdX, loX, s), y: 0, a: isFore ? lerp(80, 122, s) : lerp(-106, -58, s) };
  }
  const v = (u - duty) / (1 - duty);
  // Leaves and arrives at the ground's speed, a little reduced (0.55) so the paw
  // reaches past its mark and pulls back onto it rather than flinging.
  const m = -STRIDE_L * (1 - duty) * 0.55;
  const lift = isFore ? 0.36 : 0.30;
  return {
    x: hermite(loX, tdX, m, m, v),
    y: lift * Math.pow(Math.sin(Math.PI * v), 1.3),
    a: spline(isFore ? FORE_SWING_A : HIND_SWING_A, v),
  };
}

// The pose, in the shape sprites/dogs.js pose() returns. `g` is the candidate's gait:
// stride (x L), head carriage (neck angle), body lift and pitch, the jaw's range,
// `slope` (a constant pitch: shoulders over a low rump).
function gallopPose(g) {
  return (B, S, phase) => {
    const L = B.L * S.leg;
    const st = g.stride;
    const bump = 0.5 + 0.5 * Math.cos(TAU * 2 * (phase - GALLOP.flightE));
    const lift = (bump - 0.5) * g.bob;
    const pitch = g.pitch * Math.cos(TAU * (phase - 0.18)) + (g.slope || 0);
    const flex = 0.5 + 0.5 * Math.cos(TAU * (phase - GALLOP.flightG));
    const spine = B.spine * (1.04 - 0.12 * flex);
    const cx = B.cx;
    const baseY = -(L * g.height + lift * L);
    const half = spine / 2;
    const S0 = { x: cx + half * Math.cos(pitch), y: baseY - half * Math.sin(pitch) };
    const H0 = { x: cx - half * Math.cos(pitch), y: baseY + half * Math.sin(pitch) };
    const restS = cx + B.spine / 2, restH = cx - B.spine / 2;
    const leg = (root, isFore, td, dx = 0) => {
      const f = footAt(phase, td, isFore ? GALLOP.foreDuty : GALLOP.hindDuty, isFore ? GALLOP.foreTD : GALLOP.hindTD, isFore);
      const fx = (isFore ? restS : restH) + dx + f.x * L * st;
      const fy = -f.y * L;
      const ang = f.a;
      if (isFore) {
        const a3 = L * 0.17, a1 = L * 0.47, a2 = L * 0.44;
        const C = { x: fx - Math.cos(ang * DEG) * a3, y: fy - Math.sin(ang * DEG) * a3 };
        const E = ik(root.x, root.y, C.x, C.y, a1, a2, -1);
        return { root, mid: E, low: C, foot: { x: fx, y: fy }, fore: true };
      }
      const b3 = L * 0.36, b1 = L * 0.50, b2 = L * 0.50;
      const Hk = { x: fx + Math.cos(ang * DEG) * b3, y: fy + Math.sin(ang * DEG) * b3 };
      const K = ik(root.x, root.y, Hk.x, Hk.y, b1, b2, 1);
      return { root, mid: K, low: Hk, foot: { x: fx, y: fy }, fore: false };
    };
    // The head holds its line through the bob and the pitch: a hunting dog's eyes stay level.
    const neckAng = (g.neckAng ?? B.neckAng) * DEG - pitch * 0.4;
    const headR = B.headR * S.head;
    const Hc = {
      x: S0.x + Math.cos(neckAng) * B.neckLen,
      y: S0.y + Math.sin(neckAng) * B.neckLen + lift * L * 0.55,
    };
    const gape = g.gape[0] + g.gape[1] * (0.5 + 0.5 * Math.cos(TAU * phase));
    return {
      L, S: S0, Hp: H0, pitch, flex, lift, run: 1, crouch: 0, spine,
      fore: leg({ x: S0.x, y: S0.y }, true, GALLOP.foreNear),
      foreFar: leg({ x: S0.x - 0.2, y: S0.y }, true, GALLOP.foreFar, -0.2),
      hind: leg({ x: H0.x, y: H0.y }, false, GALLOP.hindNear),
      hindFar: leg({ x: H0.x - 0.2, y: H0.y }, false, GALLOP.hindFar, -0.2),
      Hc, headR, tilt: -0.06 - pitch * 0.7 + (g.headDip || 0), gape,
      // The tail trails the body's pitch by a quarter cycle: follow-through, not a wag.
      wag: 0.8 * Math.sin(TAU * (phase - 0.28)),
    };
  };
}

// ------------------------------------------------------------- ragged fur
// A fringe of fur along a curve: spikes leaning back along it, pointing AWAY from
// `away` (a point inside the body), joined to a base line sunk `sink` inside so the
// fills merge it into the silhouette. One part — stroked with everything else.
function fringe(pts, { heights, lean = 0.6, sink = 0.7, away, phase = 0, flutter = 0.08, n = 9 }) {
  const curve = [];
  for (let i = 0; i <= n * 2; i++) {
    const s = i / (n * 2);
    const x = spline(pts.map((q) => q.x), s), y = spline(pts.map((q) => q.y), s);
    curve.push({ x, y, s });
  }
  const out = [], inner = [];
  for (let i = 0; i < curve.length; i++) {
    const a = curve[Math.max(0, i - 1)], b = curve[Math.min(curve.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
    const tx = dx / d, ty = dy / d;
    let nx = -ty, ny = tx;
    const q = curve[i];
    if ((q.x - away.x) * nx + (q.y - away.y) * ny < 0) { nx = -nx; ny = -ny; }
    inner.push(pt(q.x - nx * sink, q.y - ny * sink));
    if (i % 2 === 1) {
      const k = (i - 1) / 2;
      const h = heights(q.s, k) * (1 + flutter * Math.sin(TAU * phase * 2 + k * 1.7));
      out.push(pt(q.x + nx * h + tx * h * lean, q.y + ny * h + ty * h * lean));
    } else out.push(pt(q.x, q.y));
  }
  const p = new Path2D();
  p.moveTo(out[0].x, out[0].y);
  for (const q of out.slice(1)) p.lineTo(q.x, q.y);
  for (const q of inner.reverse()) p.lineTo(q.x, q.y);
  p.closePath();
  return p;
}
const JAG = [1, 0.62, 0.92, 0.55, 1.05, 0.7, 0.88, 0.5, 0.8, 0.6, 0.95, 0.66];
const jag = (k) => JAG[k % JAG.length];

// A ragged brush of a tail, streaming back from the croup and swinging with `wag`.
function raggedTail(B, P, len, thick) {
  const { Hp } = P;
  const t0 = pt(Hp.x - B.rumpRx * 0.7, Hp.y - B.rumpUp * 0.55);
  const w = P.wag;
  const spinePts = [];
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    spinePts.push(pt(t0.x - len * s, t0.y + 0.3 * s + w * 0.9 * s * s - 0.9 * Math.sin(Math.PI * s * 0.9)));
  }
  const top = [], bot = [];
  spinePts.forEach((q, i) => {
    const s = i / 8;
    const a = spinePts[Math.max(0, i - 1)], b = spinePts[Math.min(8, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
    const nx = dy / d, ny = -dx / d; // up, for a curve running tailward (−x)
    const r = thick * (0.55 + 0.75 * Math.sin(Math.PI * Math.min(1, s * 1.15))) * (s > 0.92 ? 0.5 : 1);
    const spike = i % 2 ? 1.35 : 0.85;
    const lean = -0.35 * r;
    top.push(pt(q.x - nx * r * spike + (i % 2 ? lean : 0) * -1, q.y - ny * r * spike));
    bot.push(pt(q.x + nx * r * (i % 2 ? 0.85 : 1.3), q.y + ny * r * (i % 2 ? 0.85 : 1.3)));
  });
  const p = new Path2D();
  p.moveTo(t0.x + 0.6, t0.y - thick * 0.6);
  for (const q of top) p.lineTo(q.x, q.y);
  const tip = spinePts[8];
  p.lineTo(tip.x - 0.8, tip.y + 0.2);
  for (const q of bot.reverse()) p.lineTo(q.x, q.y);
  p.lineTo(t0.x + 0.6, t0.y + thick * 0.7);
  p.closePath();
  return p;
}

// The extra silhouette: hackles from the back of the skull to the loin, a cheek ruff,
// a throat ruff and a ragged belly line — all one with the outline.
function furParts(look) {
  return (parts, B, P, hd, phase) => {
    const { S: Sh, Hp, Hc } = P;
    const T = hd.T, R = hd.R;
    const mid = pt((Sh.x + Hp.x) / 2, (Sh.y + Hp.y) / 2);
    const centre = pt(mid.x, mid.y + 0.5);
    const coat = B.pal.coat;
    const add = (path, id = 'fur') => parts.push({ path, fill: coat, id });
    // Hackles: up, raked back, tallest over the withers.
    const crest = [T(-R * 0.55, -R * 0.75), pt(lerp(Hc.x, Sh.x, 0.5) - 0.3, lerp(Hc.y, Sh.y, 0.5) - B.neckW * 0.55),
      pt(Sh.x - 0.4, Sh.y - B.chestUp * 0.95), pt(mid.x, mid.y - B.chestUp * 0.82 - B.arch),
      pt(lerp(mid.x, Hp.x, 0.65), lerp(mid.y, Hp.y, 0.65) - B.rumpUp * 0.95 - B.arch * 0.5)];
    add(fringe(crest, { heights: (s, k) => look.crest * (0.45 + 0.75 * Math.sin(Math.PI * Math.min(1, s * 1.25))) * jag(k),
      lean: 0.9, sink: 0.9, away: centre, phase, n: look.crestN || 10 }));
    // Cheek ruff behind the jaw.
    add(fringe([T(-R * 0.75, -R * 0.35), T(-R * 0.95, R * 0.3), T(-R * 0.55, R * 0.95)],
      { heights: (s, k) => look.ruff * 0.75 * jag(k + 3), lean: 0.6, sink: 0.6, away: Hc, phase, n: 4 }));
    // Throat ruff, jaw to chest.
    add(fringe([T(-R * 0.1, R * 0.9), pt(lerp(Hc.x, Sh.x, 0.45) + B.neckW * 0.3, lerp(Hc.y, Sh.y, 0.45) + B.neckW * 0.6),
      pt(Sh.x + B.chestRx * 0.75, Sh.y + B.chestDown * 0.55)],
    { heights: (s, k) => look.ruff * (0.5 + 0.6 * Math.sin(Math.PI * s)) * jag(k + 5), lean: 0.5, sink: 0.6, away: pt(Sh.x - 1, Sh.y - 1), phase, n: 6 }));
    // Belly: brisket to the tuck, short and ragged.
    add(fringe([pt(Sh.x - 0.4, Sh.y + B.chestDown * 1.0), pt(mid.x + 0.4, mid.y + B.chestDown - B.tuck * 1.1),
      pt(mid.x - 1.4, mid.y + B.chestDown - B.tuck * 1.4)],
    { heights: (s, k) => look.belly * (1 - s * 0.6) * jag(k + 1), lean: 0.8, sink: 0.6, away: centre, phase, n: 6 }));
    if (look.tail) parts.unshift({ path: raggedTail(B, P, look.tail[0], look.tail[1]), fill: coat, id: 'tail' });
  };
}

// ---------------------------------------------------------------- the snarl
// Lips peeled back off a full row of teeth, a wrinkled muzzle, a hard low brow over a
// yellow eye with no white to it — at lane size the teeth and the eye are what read.
function snarlFace(look) {
  return (ctx, B, P, hd) => {
    const { T, J, R, noseX, lipY, mh, M } = hd;
    const LINE = DOG_KIT.LINE;
    // A pale muzzle and jaw only — no throat patch to blob behind the head.
    if (look.mask) {
      ctx.save();
      const clip = new Path2D(); clip.addPath(hd.skull); clip.addPath(hd.jaw);
      ctx.clip(clip);
      ctx.fillStyle = look.mask;
      ctx.beginPath();
      const m = [T(R * 0.55, -R * 0.05), T(noseX - M * 0.4, lipY - mh * 0.3), T(noseX + 0.5, lipY - 0.2), T(noseX + 0.5, lipY + 3), T(R * 0.2, R * 1.3)];
      ctx.moveTo(m[0].x, m[0].y); for (const q of m.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Gums over the upper teeth.
    ctx.fillStyle = look.gum;
    ctx.beginPath();
    const g = [T(R * 0.35, lipY + 0.02), T(noseX - 0.1, lipY + 0.02), T(noseX - 0.05, lipY - mh * 0.28), T(R * 0.7, lipY - mh * 0.34)];
    ctx.moveTo(g[0].x, g[0].y); for (const q of g.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill();
    // Teeth: fn is the frame (T upper, J lower), dir +1 down.
    const tooth = (fn, u, v, w, l, dir) => {
      const a = fn(u - w / 2, v), b = fn(u + w / 2, v), c = fn(u + w * 0.15, v + dir * l);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
    };
    ctx.fillStyle = look.tooth;
    ctx.beginPath();
    const k = look.teeth;
    for (let i = 0; i < 4; i++) tooth(T, lerp(R * 0.5, noseX - M * 0.5, i / 3), lipY, 0.34 * k, 0.42 * k, 1);
    tooth(T, noseX - M * 0.3, lipY, 0.46 * k, 1.05 * k, 1);          // the upper fang
    tooth(T, noseX - 0.28, lipY, 0.3 * k, 0.4 * k, 1);
    for (let i = 0; i < 3; i++) tooth(J, lerp(R * 0.6, noseX - M * 0.55, i / 2), lipY + 0.1, 0.3 * k, 0.36 * k, -1);
    tooth(J, noseX - M * 0.2, lipY + 0.1, 0.42 * k, 0.9 * k, -1);    // the lower fang
    ctx.fill();
    if (look.drool) {
      const d0 = J(noseX - M * 0.3, lipY + mh * 0.38);
      ctx.strokeStyle = 'rgba(232,240,248,0.55)'; ctx.lineWidth = LINE * 0.7;
      ctx.beginPath(); ctx.moveTo(d0.x, d0.y);
      ctx.quadraticCurveTo(d0.x + 0.3, d0.y + 0.9, d0.x - 0.1, d0.y + 1.6 + P.lift * 3); ctx.stroke();
    }
    // Nose.
    const n = T(noseX - 0.05, -R * 0.14);
    ctx.fillStyle = '#120d16';
    ctx.beginPath(); ctx.ellipse(n.x, n.y, 0.55, 0.42, P.tilt, 0, TAU); ctx.fill();
    // Snarl creases over the muzzle.
    ctx.strokeStyle = 'rgba(16,10,22,0.55)'; ctx.lineWidth = LINE * 0.9;
    for (let i = 0; i < 3; i++) {
      const a = T(R * 0.95 + i * 0.55, -R * 0.5 + i * 0.05), b = T(R * 1.1 + i * 0.55, -R * 0.12);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(a.x + 0.45, (a.y + b.y) / 2, b.x, b.y); ctx.stroke();
    }
    // The eye: almond, raked, all iris and a slot of pupil; the brow comes down on it.
    const e = T(R * 0.36, -R * 0.32);
    const ew = R * 0.34, eh = R * 0.15, rot = P.tilt + 0.32;
    if (look.glow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, R * 0.9);
      gr.addColorStop(0, look.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y, R * 0.9, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#120d16';
    ctx.beginPath(); ctx.ellipse(e.x, e.y, ew + 0.16, eh + 0.14, rot, 0, TAU); ctx.fill();
    ctx.fillStyle = B.pal.eye;
    ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, rot, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0c0810';
    ctx.beginPath(); ctx.ellipse(e.x + ew * 0.2, e.y, R * 0.05, eh * 0.9, rot, 0, TAU); ctx.fill();
    const b0 = T(-R * 0.15, -R * 0.75), b1 = T(R * 0.78, -R * 0.3);
    ctx.strokeStyle = 'rgba(14,9,20,0.9)'; ctx.lineWidth = R * 0.17; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
    if (look.scar) {
      const s0 = T(R * 0.05, -R * 0.85), s1 = T(R * 0.7, R * 0.05);
      ctx.strokeStyle = look.scar; ctx.lineWidth = LINE * 0.8;
      ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
    }
  };
}

// Paint over the finished dog: a glowing mouth, bone-lit ribs, shoulder scars.
function afterPaint(look, torsoRef) {
  return (ctx, B, P) => {
    const torso = torsoRef.path;
    // MOONLIGHT: a pale band inside the top edge of the head, neck, back and tail — the
    // outline shifted down and stroked, clipped to the animal — so the dog separates from
    // a dark night by its top line, as the moon would light it.
    if (look.rim && torsoRef.parts) {
      const body = torsoRef.parts.filter((q) => ['torso', 'neck', 'skull', 'tail', 'ear', 'fur'].includes(q.id));
      const clip = new Path2D(); for (const q of body) clip.addPath(q.path);
      const edge = new Path2D();
      for (const q of body) if (q.id !== 'fur') edge.addPath(q.path);
      ctx.save(); ctx.clip(clip);
      ctx.translate(0.25, 0.5);
      ctx.strokeStyle = look.rim; ctx.lineWidth = 0.75;
      ctx.stroke(edge);
      ctx.restore();
    }
    if (look.boneRibs && torso) {
      ctx.save(); ctx.clip(torso);
      ctx.strokeStyle = look.boneRibs; ctx.lineWidth = DOG_KIT.LINE * 1.1;
      for (let i = 0; i < 4; i++) {
        const x = P.S.x - 1.2 - i * 0.9;
        ctx.beginPath();
        ctx.moveTo(x + 0.3, P.S.y - B.chestUp * 0.3);
        ctx.quadraticCurveTo(x - 0.4, P.S.y + 0.6, x + 0.2, P.S.y + B.chestDown * 0.6 - i * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (look.scars && torso) {
      ctx.save(); ctx.clip(torso);
      ctx.strokeStyle = look.scars; ctx.lineWidth = DOG_KIT.LINE * 0.8;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(P.S.x - 0.2 + i * 0.5, P.S.y - B.chestUp * 0.6);
        ctx.lineTo(P.S.x - 1.4 + i * 0.5, P.S.y + 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }
  };
}

// ---------------------------------------------------------------- the takes
// The feral as it was before B3 shipped over it (16 Oct): the candidates are built on
// the old dog, so it is kept here rather than read from the kennel.
const F = { ...DOG_BREEDS.feral, gait: undefined, look: undefined,
  L: 11.4, spine: 8.6, cx: -0.4, chestUp: 2.2, chestDown: 2.3, chestRx: 2.5,
  rumpUp: 2.0, rumpDown: 1.7, rumpRx: 2.1, tuck: 1.6, arch: 1.0,
  neckLen: 4.1, neckAng: -30, neckW: 2.1, headR: 2.05, muzzle: 2.8, muzzleH: 1.35,
  ear: 'prick', earLen: 2.4, tail: 'brush', legW: [1.2, 0.66, 0.52], pawR: 0.62,
  collar: 'none', teeth: 1.15, ribs: true, hackles: 1,
  pal: { coat: '#858594', far: '#575764', shade: '#6a6a79', mark: '#aaa49c', markShade: '#8d8780', saddle: '#4c4c57', eye: '#f2e27a', collar: '#000' },
  marks: 'wolf' };
const NEW_GAIT = { stride: 0.78, height: 0.87, bob: 0.08, pitch: 0.07, gape: [0.35, 0.5] };

function makeHooks(cand) {
  const pose = gallopPose(cand.gait);
  if (!cand.look) return { pose };
  const torsoRef = { path: null };
  const fur = furParts(cand.look);
  let phaseNow = 0;
  return {
    pose: (B, S, phase, o) => { phaseNow = phase; return pose(B, S, phase, o); },
    parts: (parts, B, P, hd) => {
      // The hellhound's mouth burns.
      if (cand.look.mouth) parts.find((q) => q.id === 'mouth').fill = cand.look.mouth;
      torsoRef.path = parts.find((q) => q.id === 'torso').path;
      torsoRef.parts = parts;
      fur(parts, B, P, hd, phaseNow);
    },
    face: snarlFace(cand.look),
    after: afterPaint(cand.look, torsoRef),
  };
}

export const FERAL_CANDIDATES = [
  { letter: 'A', id: 'smooth', name: 'SAME DOG, NEW GAIT',
    note: 'The shipped feral exactly as drawn, on the new gallop only: 16 frames, feet planted on the road for the whole stance, two flights a stride, the head held level. Isolates the run cycle from the drawing.',
    breed: F, gait: NEW_GAIT },
  { letter: 'B', id: 'wolf', name: 'SNARLING WOLF',
    note: 'The feral, angrier: head dropped level with the back and thrust forward, ears pinned, lips peeled off a full set of teeth with two long fangs, hackles up as a ragged crest from skull to loin, scruffy ruff, belly and tail. Darker grey-brown coat, a scarred eye, a strand of drool. New gait.',
    breed: { ...F, neckAng: -12, neckLen: 4.4, headR: 2.15, muzzle: 3.0, earLen: 2.2, tail: 'none', hackles: 0, marks: 'none', legW: [1.35, 0.76, 0.58],
      pal: { coat: '#6a6370', far: '#3f3a45', shade: '#544d5a', mark: '#b5aa9f', markShade: '#91877c', saddle: '#36313b', eye: '#ffd23a', collar: '#000' } },
    gait: { ...NEW_GAIT, neckAng: -12, gape: [0.55, 0.65] },
    look: { crest: 1.25, ruff: 1.0, belly: 0.7, tail: [4.4, 0.9], mask: '#b5aa9f', gum: '#a23a50', tooth: '#fbf6ec', teeth: 1.1, drool: true, scar: 'rgba(230,200,190,0.75)' } },
  { letter: 'C', id: 'hellhound', name: 'HELLHOUND',
    note: 'B’s silhouette in Crypt’s own colours: near-black, ember eyes that glow, a mouth lit from inside, ribs showing pale through the coat. Made for the eclipse. New gait.',
    breed: { ...F, neckAng: -12, neckLen: 4.4, headR: 2.15, muzzle: 3.0, earLen: 2.4, tail: 'none', hackles: 0, marks: 'none', legW: [1.35, 0.76, 0.58],
      pal: { coat: '#2b2431', far: '#16111b', shade: '#211b27', mark: '#3d3444', markShade: '#2e2734', saddle: '#120e16', eye: '#ffb21e', collar: '#000' } },
    gait: { ...NEW_GAIT, neckAng: -12, gape: [0.6, 0.7] },
    look: { crest: 1.4, ruff: 1.1, belly: 0.8, tail: [4.6, 0.85], gum: '#5a1220', tooth: '#f4ead8', teeth: 1.15, mouth: '#e0501c',
      glow: 'rgba(255,120,30,0.85)', boneRibs: 'rgba(210,196,226,0.32)' } },
  { letter: 'D', id: 'warg', name: 'THE WARG',
    note: 'More animal, less dog: a hyena’s build — big head, heavy chest and shoulders under a mane of hackles, back sloping away to a low rump — brindle, red-eyed, scarred across the shoulder. The heaviest-looking of the four in the same box. New gait.',
    breed: { ...F, chestUp: 2.9, chestDown: 2.8, chestRx: 3.0, rumpUp: 1.6, rumpDown: 1.4, rumpRx: 1.9, arch: 0.2, tuck: 1.4,
      neckW: 2.9, neckLen: 3.8, neckAng: -8, headR: 2.55, muzzle: 2.5, muzzleH: 1.65, earLen: 2.0, legW: [1.55, 0.85, 0.62], pawR: 0.75,
      tail: 'none', hackles: 0, marks: 'none',
      pal: { coat: '#5c4b3f', far: '#3a2e27', shade: '#4b3d33', mark: '#a08b74', markShade: '#7d6b58', saddle: '#2e241e', eye: '#ff4a2a', collar: '#000' } },
    gait: { ...NEW_GAIT, neckAng: -8, slope: 0.1, height: 0.88, gape: [0.6, 0.65] },
    look: { crest: 1.6, crestN: 12, ruff: 1.2, belly: 0.6, tail: [3.2, 0.75], mask: '#8f7a65', gum: '#9a3044', tooth: '#f6efe0', teeth: 1.25,
      scar: 'rgba(225,190,170,0.7)', scars: 'rgba(225,190,170,0.6)' } },
];
// ROUND 2 (16 Oct): "the wolf is better than the feral dog so lets keep him.. a little
// larger … a little skinny in the belly … hard to read in the crypt esp when dark", and
// "perhaps the original dog just needs a restyle to be sleeker and less hunch backy".
// The bigger slot: 18x13 box (was 17x12), drawn 1.22 (was 1.16) — about 15% more dog.
const BIG_SLOT = Object.freeze({ box: [18, 13], tall: 1.15, visual: 1.22, vx: 68 });
const WOLF = FERAL_CANDIDATES[1];
// Fuller under: a deeper chest and rump, a shallow tuck, and the back flatter.
const FULLER = { chestDown: 2.7, rumpDown: 2.0, tuck: 0.85, chestRx: 2.7, rumpRx: 2.3, arch: 0.35, ribs: false };
FERAL_CANDIDATES.push(
  { letter: 'B2', id: 'wolf-moon', name: 'WOLF, MOONLIT', round: 2,
    note: 'B, bigger (18x13 box, drawn 1.22 — ~15% more dog), fuller in the chest and belly (no ribs showing), back flatter. Readable in the dark by light, not colour: a moonlit band along his top line, a paler muzzle, and eyes that glow.',
    breed: { ...WOLF.breed, ...FULLER, pal: { ...WOLF.breed.pal, coat: '#736b7a', shade: '#5a5262', saddle: '#3a343f' } },
    slot: BIG_SLOT, gait: WOLF.gait,
    look: { ...WOLF.look, belly: 0.55, mask: '#d2c8bd', rim: 'rgba(214,222,255,0.62)', glow: 'rgba(255,214,70,0.75)' } },
  { letter: 'B3', id: 'wolf-silver', name: 'WOLF, SILVER', round: 2,
    note: 'B2’s build, readable by colour: a silver-grey coat with a dark saddle and a cream mask and throat, plus B2’s moonlit top line and glowing eyes. Pops hardest against the eclipse.',
    breed: { ...WOLF.breed, ...FULLER, pal: { ...WOLF.breed.pal, coat: '#a39fae', far: '#5e5a69', shade: '#85808f', saddle: '#4a4655' } },
    slot: BIG_SLOT, gait: WOLF.gait,
    look: { ...WOLF.look, belly: 0.55, mask: '#ece4d6', rim: 'rgba(236,240,255,0.6)', glow: 'rgba(255,214,70,0.75)' } },
  { letter: 'E', id: 'sleek', name: 'THE FERAL, SLEEKER', round: 2,
    note: 'The original dog restyled rather than replaced: the hunch taken out (a level back, not an arched one), a longer body, the neck carried forward, a fuller belly, smoother hackles, a touch more leg. Same colours, same box. New gait.',
    breed: { ...F, arch: 0.1, spine: 9.4, tuck: 1.05, chestDown: 2.5, rumpDown: 1.85, neckAng: -24, neckLen: 4.3, legW: [1.3, 0.72, 0.56] },
    gait: { ...NEW_GAIT, neckAng: -24, height: 0.86 } },
);
export const FERAL_NOW = { letter: 'NOW', id: 'now', name: 'SHIPPED (B3)',
  note: `What Crypt deals today, through the real run painter — B3 since 16 Oct: ${ANIMAL_FRAMES.dogFeral} frames, ${ANIMAL_FPS.dogFeral.toFixed(0)} fps at its own speed.` };

// ------------------------------------------------------------- fit + frames
// Each candidate's ink over all its frames, measured off the painter, fitted to the box
// the way sprites/dogs.js painter() fits the shipped dog; the frame rate is then set so
// a planted foot moves back at exactly vx — the feet stay on the road.
export const FERAL_FRAMES = 16;
const built = new Map();
function build(cand) {
  if (built.has(cand.id)) return built.get(cand.id);
  const hooks = makeHooks(cand);
  const K = 10, W = 600, H = 400;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  for (let f = 0; f < FERAL_FRAMES; f++) {
    c.clearRect(0, 0, W, H);
    c.save(); c.translate(W / 2, H - 50); c.scale(K, K);
    paintDog(c, cand.breed, f / FERAL_FRAMES, { hooks });
    c.restore();
    const d = c.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y;
      }
    }
  }
  const b = { minX: (minX - W / 2) / K, maxX: (maxX + 1 - W / 2) / K, minY: (minY - (H - 50)) / K };
  const sl = slotOf(cand), { w: ENV_W, h: ENV_H } = envOf(sl);
  const k = Math.min((ENV_W * 0.97) / (b.maxX - b.minX), (ENV_H * 0.975) / -b.minY);
  const strideWorld = STRIDE_L * cand.gait.stride * cand.breed.L * k;
  const fps = FERAL_FRAMES * sl.vx / strideWorld;
  // Rasters at 12 px/unit, as the prop cache holds them, with the hazard rim's tints.
  const RS = 12;
  const frames = [];
  for (let f = 0; f < FERAL_FRAMES; f++) {
    const r = document.createElement('canvas'); r.width = ENV_W * RS; r.height = ENV_H * RS;
    const rc = r.getContext('2d');
    rc.scale(RS, RS);
    rc.translate(ENV_W / 2, ENV_H); rc.scale(k, k); rc.translate(-(b.minX + b.maxX) / 2, 0);
    paintDog(rc, cand.breed, f / FERAL_FRAMES, { hooks });
    const tint = (col) => {
      const tc = document.createElement('canvas'); tc.width = r.width; tc.height = r.height;
      const x = tc.getContext('2d'); x.drawImage(r, 0, 0); x.globalCompositeOperation = 'source-in';
      x.fillStyle = col; x.fillRect(0, 0, tc.width, tc.height); return tc;
    };
    frames.push({ art: r, dark: tint('#101018'), lite: tint('#f0f0f8') });
  }
  const out = { frames, fps, k, b, sl, ENV_W, ENV_H };
  built.set(cand.id, out);
  return out;
}
export function feralFps(cand) { return build(cand).fps; }

// One candidate in the lane, box left at boxX, as draw.js paints a ground hazard.
function placeFeral(c, cand, boxX, t, seed = 0) {
  const { frames, fps, sl, ENV_W, ENV_H } = build(cand);
  const fr = frames[Math.floor(t * fps + seed * 4) % FERAL_FRAMES];
  const [bw] = sl.box;
  drawSoftContactShadow(c, boxX + bw / 2, GROUND_Y - 1, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  c.fillStyle = 'rgba(224,72,72,0.32)';
  c.fillRect(boxX, GROUND_Y - 1, bw, 1);
  const ox = boxX - Math.floor((ENV_W - bw) / 2), oy = GROUND_Y - ENV_H;
  const prev = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = true;
  c.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5 + seed);
  c.drawImage(fr.lite, ox - 1, oy - 1, ENV_W + 2, ENV_H + 2);
  c.globalAlpha = 0.22;
  c.drawImage(fr.dark, ox - 1, oy - 1, ENV_W + 2, ENV_H + 2);
  c.globalAlpha = 1;
  c.drawImage(fr.art, ox, oy, ENV_W, ENV_H);
  c.imageSmoothingEnabled = prev;
}

const dogs = new Map();
function drawNow(c, x, t, key) {
  if (!dogs.has(key)) dogs.set(key, makeObstacle('dogFeral', 0));
  const e = dogs.get(key);
  e.x = x;
  e.bobPhase = 0;
  e.gaitPh = null; // the fallback clock: the gallery has no run to step it
  drawWorldEntity(c, e, 0, t, null, {});
}
const drawAny = (c, cand, x, t, key) => (cand === FERAL_NOW ? drawNow(c, x, t, key) : placeFeral(c, cand, x, t));

// ------------------------------------------------------------- the tiles
// The lane scrolls at 110; the dog closes at vx 68 on top — so on screen a planted foot
// should move with the road exactly.
const SCROLL = 110, CLOSE = SCROLL + FERAL_SLOT.vx;
const START = 262, LOOP = 2.6, HOP_V = 250, HOP_G = 900;
const HERO_C = PLAYER_X + PLAYER_W / 2;
export function drawFeralApproach(ctx, t, strips, cand) {
  const ph = ((t % LOOP) + LOOP) % LOOP;
  const x = START - CLOSE * ph;
  const hop = ph - (START - HERO_C - 38) / CLOSE;
  const air = hop > 0 && hop < (2 * HOP_V) / HOP_G;
  const y = air ? HOP_V * hop - 0.5 * HOP_G * hop * hop : 0;
  drawCabinetLane(ctx, t, 'crypt', strips, (c, tt) => {
    drawAny(c, cand, x, tt, `a${strips.length}`);
    const pose = air
      ? { kind: 'jump', time: tt, vy: HOP_V - HOP_G * hop, grounded: false, facing: 1 }
      : { kind: 'run', phase: tt * 1.6 % 1, time: tt, grounded: true, facing: 1 };
    drawToon(c, 'lorenzo', pose, PLAYER_X, GROUND_Y - y, HERO_DRAW_H);
  }, { hero: null });
}

// The pack on a conveyor: all five running at the dog's own speed over the road, spaced
// evenly and wrapping, each labelled above its back.
export function drawFeralLineup(ctx, t, strips, all = [FERAL_NOW, ...FERAL_CANDIDATES]) {
  const gap = 56, span = gap * all.length;
  drawCabinetLane(ctx, t, 'crypt', strips, (c, tt) => {
    all.forEach((cand, i) => {
      const x = 250 - ((((CLOSE * tt + i * -gap) % span) + span) % span) + gap * 0.5;
      drawAny(c, cand, x, tt, `l${i}`);
      c.save();
      c.font = '700 4px ui-monospace, Menlo, monospace';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(16,14,22,0.78)';
      const hx = x + slotOf(cand).box[0] / 2;
      c.fillRect(hx - 5, GROUND_Y - 35, 10, 5);
      c.fillStyle = '#f6d33c';
      c.fillText(cand.letter === 'NOW' ? '·' : cand.letter, hx, GROUND_Y - 31.2);
      c.restore();
    });
  }, { hero: null });
}


// One candidate at `phase`, in the dog's own units, feet on y 0 (for frame sheets).
const hookCache = new Map();
export function paintFeral(ctx, cand, phase) {
  if (!hookCache.has(cand.id)) hookCache.set(cand.id, makeHooks(cand));
  paintDog(ctx, cand.breed, phase, { hooks: hookCache.get(cand.id) });
}

// Side by side on a plain light ground, running in place at in-run size (the lane's x2).
export const SIDE_H = 96;
export function drawFeralSideBySide(ctx, t, all = [FERAL_NOW, ...FERAL_CANDIDATES], dark = false) {
  const floor = 70;
  ctx.fillStyle = dark ? '#1c1828' : '#efe9dd'; ctx.fillRect(0, 0, 480, SIDE_H);
  ctx.fillStyle = dark ? '#2a2236' : '#d9d0bf'; ctx.fillRect(0, floor, 480, SIDE_H - floor);
  ctx.save();
  ctx.scale(2, 2);
  ctx.translate(0, floor / 2 - GROUND_Y);
  const step = 240 / all.length;
  all.forEach((cand, i) => drawAny(ctx, cand, step * (i + 0.5) - slotOf(cand).box[0] / 2, t, `s${i}${dark ? 'd' : ''}`));
  ctx.restore();
  ctx.font = '700 7px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = dark ? '#d8d0e8' : '#4a4238';
  all.forEach((cand, i) => ctx.fillText(cand.letter === 'NOW' ? 'NOW' : `${cand.letter} ${cand.name}`, 480 * (i + 0.5) / all.length, floor + 18));
}
