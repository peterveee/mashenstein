// Gallery-only: FALLING INTO A PIT, a bake-off (16 Oct 2026).
//
// Peter: "i feel like we need better effects when we fall into a pit.. the shocked face
// is a bit boring with the 'dead' eyes..." — and, mid-way, "remember the pits aren't super
// deep often". Nothing here is wired into the run.
//
// WHAT THE RUN DOES TODAY (game/run.js takeHit's isPit branch, updatePitSink, updateDead):
// the world freezes the frame he dies; he keeps drifting forward (vx decaying by 0.22^t,
// capped at half the hole and the far wall) while he falls at the death gravity, 600; the
// startled face (faceSurprised + browRaise, toons.js poseFromPlayer) on a frozen run frame.
// THE DROP IS SHORT: the material lies 12 world px under the lip (PIT_SURFACE_Y) — 0.2s of
// fall — and a spike bed's tips only 5 (fillSurfaceY('spikes')) — 0.13s. On arrival the
// spiral death face starts its clock, a liquid takes him under (a 0.4·vy plunge decaying
// into a 12 px/s sink) and a hard fill holds him on the tips; the hold is 2.25s
// (PIT_DEATH_HOLD), then the checkpoint. The camera shows 19 px of the 38 px apron, so
// every payoff here happens at the depth he actually stops at, in view.
//
// THE CANDIDATES keep that clock: every one ends inside the same 2.25s hold. A changes only
// the face; B–E spend the first second of the hold on a coyote hang over the hole, then drop
// the same short drop; G and H are the other ways in (a jump that lands in the hole, a jump
// that just misses the far lip). Side-on always: looking down is the whole figure LEANING
// out (the rig's pose.lean, about his feet) and the eyes down, never a turn to camera, and
// nothing is cut out of him (Peter, 16 Oct: the first cut tilted the head alone and "it is
// slicing it"). Faces are the rig's own wherever it has
// one (surprised, grim, the death face's closed lids and teeth); the pinprick pupils are an
// overlay, measured per hero off his own drawing (eyesOf), so it carries to the cast.
//
// A painter is `paint(c, heroId, s)` in world units, screen-relative (the lane kit's world
// space, ground at GROUND_Y): s = { cx, fy, w, t, fill, surf, hard, carry, phase0 } —
// cx the hero's centre at the moment of death, fy the groundline, w seconds since he died
// (0..PIT_FALL_HOLD), t a running clock, fill the hole's material id, surf the altitude he
// stops at (negative, below the lip), hard whether it holds him, carry the drift budget,
// phase0 the run frame he died on, wall the far wall's x. It draws the hero and everything that goes with him.
import { drawToon } from '../sprites/toons.js';
import { HIT_KIT } from '../sprites/hitPictures.js';
import {
  PIT_POSES, PIT_FACES, PIT_HANG_RAN, PIT_HANG_JUMPED, PIT_GRIP, PIT_GRIP_ALT,
  drawPitHero, pitSweat, pitTakeJitter, drawPitBottom, pitHangFigure, pitGripFigure, pitGripSlip,
  pitGripFingers, drawPitFingertips,
} from '../sprites/pitFall.js';
import { GROUND_Y, applyWorld } from '../engine/camera.js';
import { getStylePack, drawPitFills } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { makeObstacle } from '../game/entities.js';
import { PIT_APRON_DEPTH, PIT_FLOOR, fillSurface } from '../game/pitFill.js';

const { U, hash, clamp01, lerp, easeOut, puff } = HIT_KIT;
const INK = '#2a2226';

// ---------------------------------------------------------------- the run's numbers
export const PIT_FALL_HOLD = 2.25;      // PIT_DEATH_HOLD
const G = 600;                          // gravityForDeath
const SCROLL = 110;                     // the lab's run speed (the hit sheets' too)
const SINK = 12, PLUNGE_MAX = 90;       // PIT_SINK_RATE, PIT_PLUNGE_MAX
const surfOf = (fill) => -Math.round(fillSurface(fill).at * PIT_APRON_DEPTH);
const LIQUID_SURF = -Math.round(PIT_FLOOR * PIT_APRON_DEPTH);   // 12 px under the lip

// The forward drift: vx decaying by 0.22 a second, only while he is in the air.
const LN_DRAG = Math.log(1 / 0.22);
const driftAt = (w, carry) => Math.min(carry, SCROLL * (1 - Math.pow(0.22, w)) / LN_DRAG);
// How far under the surface a liquid has taken him, wa seconds after he arrived at vy.
function sunk(wa, vy) {
  const p0 = Math.min(PLUNGE_MAX, Math.abs(vy) * 0.4);
  if (wa <= 0) return 0;
  if (p0 <= SINK) return SINK * wa;
  const tStar = Math.log(p0 / SINK) / Math.log(20);
  if (wa <= tStar) return p0 * (1 - Math.pow(0.05, wa)) / Math.log(20);
  return p0 * (1 - Math.pow(0.05, tStar)) / Math.log(20) + SINK * (wa - tStar);
}
// A drop from rest at alt a0 to surf, starting at w0: [alt, arrived?, wa, vy at arrival].
function drop(w, w0, a0, surf) {
  const e = Math.max(0, w - w0);
  const fallT = Math.sqrt(2 * Math.max(0, a0 - surf) / G);
  if (e < fallT) return { alt: a0 - 0.5 * G * e * e, in: false, wa: 0, e, fallT, vy: G * fallT };
  return { alt: surf, in: true, wa: e - fallT, e, fallT, vy: G * fallT };
}

// ---------------------------------------------------------------- poses, faces, the hero
// SHIPPED (16 Oct): E, G2 and H went into the run, and their painters live in
// sprites/pitFall.js — the poses, the faces, the measured pinprick eyes, the hero drawn
// whole and cut off only at a surface, the sweat, the bottom's answer, the fingertips.
// The candidates that did not ship are drawn here with the same pieces.
const { runFrame, dropPose, hangPose } = PIT_POSES;
const { SURPRISED, GRIM, SHUT, DEAD } = PIT_FACES;
// Holding a sign up on a stick: front hand high, back hand at his side.
const signPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.35, -1.0], [-0.3, 0.6]], feet: [[-0.06, 0], [0.06, 0]], ankles: [0.25, 0.25] },
});
const hero = drawPitHero;

// ---------------------------------------------------------------- dressing
const sweat = pitSweat;
// Little hand-lettered word: "gulp", "ouch".
function word(c, text, x, y, a = 1, size = 5, col = '#ffffff', rot = -0.12) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.translate(x, y); c.rotate(rot);
  c.font = `900 ${size}px "Arial Black", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 1.3; c.strokeStyle = INK; c.strokeText(text, 0, 0);
  c.fillStyle = col; c.fillText(text, 0, 0);
  c.restore();
}
const takeJitter = pitTakeJitter;
// The run's own bursts at the surface (updatePitSink): ten pale bits off teeth, twelve grey
// off a liquid, thrown up and falling back.
function arrivalBurst(c, x, y, e, hard) {
  const n = hard ? 10 : 12, life = hard ? 0.45 : 0.5, sp = hard ? 60 : 70;
  for (let i = 0; i < n; i++) {
    const l = life * (0.6 + 0.6 * hash(i * 4.1 + 3));
    if (e < 0 || e > l) continue;
    const a = -Math.PI * (0.1 + 0.8 * hash(i * 1.3 + 3)), s = sp * (0.4 + 0.6 * hash(i * 2.9 + 3));
    const px = x + Math.cos(a) * s * e, py = y + Math.sin(a) * s * e + 45 * e * e;
    c.fillStyle = hard ? `rgba(185,196,208,${1 - e / l})` : `rgba(138,132,150,${1 - e / l})`;
    c.fillRect(px - 0.75, py - 0.75, 1.5, 1.5);
  }
}
// Speed streaks above a falling body, fading once he stops.
function streaks(c, x, top, bottom, a) {
  if (a <= 0 || bottom - top < 1) return;
  c.save(); c.globalAlpha *= a; c.lineCap = 'round';
  for (const [dx, k] of [[-4.5, 0.75], [0, 1], [4.5, 0.6]]) {
    const y0 = lerp(bottom, top, k);
    c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x + dx, y0); c.lineTo(x + dx, bottom); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.55; c.beginPath(); c.moveTo(x + dx, y0); c.lineTo(x + dx, bottom); c.stroke();
  }
  c.restore();
}
// The little sign on a stick.
function sign(c, x, y, text, a = 1, rot = 0) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.translate(x, y); c.rotate(rot);
  c.strokeStyle = INK; c.lineWidth = 0.5;
  c.fillStyle = '#b07a44'; c.fillRect(-0.55, -1, 1.1, 10.5); c.strokeRect(-0.55, -1, 1.1, 10.5);
  c.fillStyle = '#f4ead2'; c.fillRect(-8, -7, 16, 7.5); c.lineWidth = 0.6; c.strokeRect(-8, -7, 16, 7.5);
  c.font = '900 5px "Arial Black", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#c0282c'; c.fillText(text, 0, -3.1);
  c.restore();
}

// ---------------------------------------------------------------- NOW
function paintNow(c, heroId, s) {
  const d = drop(s.w, 0, 0, s.surf);
  const dx = driftAt(Math.min(s.w, d.fallT), s.carry);
  const alt = d.in && !s.hard ? s.surf - sunk(d.wa, d.vy) : d.alt;
  const x = s.cx + dx, y = s.fy - alt;
  hero(c, heroId, x, y, runFrame(s.phase0, d.in ? DEAD(d.wa) : SURPRISED));
  if (d.in) arrivalBurst(c, x, s.fy - s.surf, d.wa, s.hard);
}

// ---------------------------------------------------------------- A — the face only
// Today's fall to the letter, a living face through it: the double-take at the lip,
// pinprick pupils on the way down, a bead of sweat flicked off as he lands, the gulp, then
// eyes squeezed shut and teeth bared as it takes him — the face he goes under with.
function paintA(c, heroId, s) {
  const d = drop(s.w, 0, 0, s.surf);
  const dx = driftAt(Math.min(s.w, d.fallT), s.carry);
  const alt = d.in && !s.hard ? s.surf - sunk(d.wa, d.vy) : d.alt;
  const x = s.cx + dx, y = s.fy - alt;
  const wa = d.in ? d.wa : -1;
  const GULP = 0.28, SHUT_AT = 0.62;
  let pose, o = {};
  if (s.w < 0.08) { pose = runFrame(s.phase0, SURPRISED); o.jitter = takeJitter(s.w); }
  else if (wa < GULP) { pose = runFrame(s.phase0, SURPRISED); o.pin = true; o.look = [0.01, 0.018]; }
  else if (wa < SHUT_AT) { pose = runFrame(s.phase0, GRIM); o.pin = true; }
  else pose = runFrame(s.phase0, SHUT);
  hero(c, heroId, x, y, pose, o);
  if (d.in) {
    arrivalBurst(c, x, s.fy - s.surf, d.wa, s.hard);
    sweat(c, heroId, x, y, wa - 0.04);
    const g = wa - GULP;
    if (g > 0 && g < SHUT_AT - GULP) word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((g - 0.24) / 0.1), 4.5);
  }
}

// ---------------------------------------------------------------- B — the coyote hang
// The beats of the hang, in seconds since he died. The whole thing fits the same 2.25s hold:
// a second over the hole, the 0.2s drop, the rest at the bottom.
const H = PIT_HANG_RAN;                 // { RUN: 0.2, LOOK: 0.36, BACK: 0.66, DROP: 1.0 }
// One frame of the hang-and-drop: where he is and how he is drawn. `face` hooks let C–E
// change a beat without restating the clock.
// `T` is the beat table (H, or G2's shorter one), `alt0` the height he hangs at (0: the lip;
// G3 hangs at the top of a hop), `windmill` swaps the double-take for one turn of the arms.
function hangState(heroId, s, T = H, alt0 = 0, windmill = false) {
  const w = s.w;
  const dx = driftAt(Math.min(w, T.RUN), s.carry);
  const d = drop(w, T.DROP, alt0, s.surf);
  const alt = d.in && !s.hard ? s.surf - sunk(d.wa, d.vy) : d.alt;
  const fig = pitHangFigure(T, w, s.phase0, windmill, d.in);
  return { dx, alt, d, wa: d.in ? d.wa : -1, falling: w >= T.DROP && !d.in, o: fig.o, pose: fig.pose, beat: fig.beat };
}
function paintHang(c, heroId, s, { gulpWord = true } = {}) {
  const st = hangState(heroId, s);
  const x = s.cx + st.dx, y = s.fy - st.alt;
  hero(c, heroId, x, y, st.pose, st.o);
  if (st.beat === 'gulp' && gulpWord) word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((s.w - H.DROP + 0.08) / 0.08), 4.5);
  sweat(c, heroId, x, y, s.w - H.BACK - 0.03);
  if (st.d.in) arrivalBurst(c, x, s.fy - s.surf, st.wa, s.hard);
  return { ...st, x, y };
}
const paintB = (c, heroId, s) => { paintHang(c, heroId, s); };

// ---------------------------------------------------------------- C — whistle and puff
// B, and the drop gets its cartoon: streaks above him from where he hung, then a dust puff
// out either side where he stops and a little "poof" rising out of the hole past the lip.
function paintC(c, heroId, s) {
  const st = paintHang(c, heroId, s);
  const topY = s.fy - 1.05 * U;                               // the top of his head as he hung
  if (s.w >= H.DROP) {
    const fade = st.d.in ? 1 - clamp01(st.wa / 0.18) : 1;
    streaks(c, st.x, topY, st.y - 1.15 * U, fade);
  }
  if (st.d.in) {
    const e = st.wa, sy = s.fy - s.surf;
    for (const [side, k] of [[-1, 0], [1, 1]]) {
      const q = clamp01(e / 0.45);
      puff(c, st.x + side * (3 + 9 * easeOut(q)), sy - 1 - 2 * q, 1.4 + 2.4 * easeOut(q), 1 - clamp01((e - 0.2) / 0.3));
      void k;
    }
    // the poof, rising out of the hole
    const r = clamp01((e - 0.05) / 0.6);
    if (r > 0 && r < 1) {
      // behind him, off his back, so it never sits on his face
      const py = lerp(sy - 3, s.fy - 9, easeOut(r)), px = st.x - 11 - 3 * r;
      puff(c, px, py, 2 + 2.5 * r, 1 - clamp01((r - 0.55) / 0.45));
      word(c, 'poof', px - 1, py - 5.5, 1 - clamp01((r - 0.5) / 0.4), 4, '#ffffff', 0.08);
    }
  }
}

// ---------------------------------------------------------------- D — a tiny sign
// B, but the gulp is a sign: he pulls a little HELP! out of nowhere and holds it up on a
// stick over his head, and keeps holding it up as he drops — the sign is the last of him to
// go under. On the teeth it turns round to OUCH.
function paintD(c, heroId, s) {
  const w = s.w;
  const holding = w >= H.BACK + 0.04;
  if (!holding) { paintHang(c, heroId, s, { gulpWord: false }); return; }
  const st = hangState(heroId, s);
  const x = s.cx + st.dx, y = s.fy - st.alt;
  const face = w < H.DROP ? GRIM : SHUT;
  const o = { ...st.o, jitter: 0, pin: w < H.DROP };
  if (st.falling) { o.sx = 0.92; o.sy = 1.1; }
  hero(c, heroId, x, y, signPose(face), o);
  sweat(c, heroId, x, y, w - H.BACK - 0.03);
  if (st.d.in) arrivalBurst(c, x, s.fy - s.surf, st.wa, s.hard);
  const pop = easeOut(clamp01((w - H.BACK - 0.04) / 0.08));
  const flip = s.hard && st.d.in;
  const text = flip && st.wa > 0.06 ? 'OUCH!' : 'HELP!';
  const wob = flip ? 0.25 * Math.sin(st.wa * 40) * Math.exp(-st.wa * 6) : 0.06 * Math.sin(w * 9);
  // the stick in his raised hand, which on these rigs comes up behind his head
  sign(c, x - 0.24 * U, y - 0.9 * U - 9.5 - 3 * (1 - pop), text, pop, wob);
}

// ---------------------------------------------------------------- E — the bottom answers
// B, and what is at the bottom has its say where he stops. A liquid now takes him UNDER —
// he is cut off at its surface rather than drawn over it, as the run does today.
//   lava    flames flick up round him, smoke puffs off the surface, and what is left of him
//           above it goes singed grey (smoky, never blacked out).
//   spikes  he lands, and jolts straight up off them stiff as a board, pinprick-eyed and
//           yelping, an "ouch" burst of sparks under him; then down onto the tips, eyes shut.
//   slush   a splash ring and a crown of drops, and he frosts over pale blue as he goes down.
//   tar     a dull gloop and a dust puff; when he has gone, two slow bubbles come up.
function paintE(c, heroId, s) {
  const st = hangState(heroId, s);
  const x = s.cx + st.dx, y = s.fy - st.alt;
  bottom(c, heroId, s, { x, y, e: st.wa, pose: st.pose, o: st.o });
  if (st.beat === 'gulp') word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((s.w - H.DROP + 0.08) / 0.08), 4.5);
  sweat(c, heroId, x, y, s.w - H.BACK - 0.03);
}
// The bottom's answer, shared by E, G and H: the shipped one (sprites/pitFall.js
// drawPitBottom), with the OUCH! lettered by hand — the run says it as a floatie.
function bottom(c, heroId, s, args) {
  drawPitBottom(c, heroId, { ...s, surfY: s.fy - s.surf }, { ...args, word: (...a) => word(c, ...a) });
}

// ---------------------------------------------------------------- the other ways in
// The hang only makes sense for a hero who RAN off the lip. Two more ways into a hole:
// a jump that comes down inside it (G), and a jump that comes down just short of the far
// wall (H). Both arrive off a real hop: BASE_JUMP_V-ish launch, the run's 900 gravity,
// the world scrolling under him until the frame he dies, then the death's 600 gravity.
const JUMP_G = 900;
const JV = 230;                          // apex ~29 px: a hop, kept inside the frame
const JT = 2 * JV / JUMP_G;              // takeoff to back at lip height
const jumpPose = (vy, face = {}) => ({ kind: 'jump', vy, time: 0, grounded: false, facing: 1, ...face });
// The run-in for G and H: running, then the hop, on the clock the tile hands in (w < 0).
function jumpApproach(c, heroId, s) {
  const tau = s.w + JT;
  if (tau < 0) { drawToon(c, heroId, runFrame(s.tl * 1.7), s.cx, s.fy, U); return; }
  const alt = JV * tau - 0.5 * JUMP_G * tau * tau, vy = JV - JUMP_G * tau;
  drawToon(c, heroId, jumpPose(vy), s.cx, s.fy - alt, U);
}

// G — JUMPED IN. Already falling (vy = −JV) and partway across when the hole takes him, so
// no hang: he keeps his arc — the forward drift and the short drop — and wears A's face on
// the way: pinprick eyes, the gulp, eyes squeezed shut; then the bottom answers as in E.
const gArrive = (surf) => (-JV + Math.sqrt(JV * JV + 2 * G * -surf)) / G;
function paintG(c, heroId, s) {
  const wArr = gArrive(s.surf);
  const arrived = s.w >= wArr;
  const wa = arrived ? s.w - wArr : -1;
  const dx = driftAt(Math.min(s.w, wArr), s.carry);
  const vyArr = JV + G * wArr;
  const alt = !arrived ? -JV * s.w - 0.5 * G * s.w * s.w : s.hard ? s.surf : s.surf - sunk(wa, vyArr);
  const x = s.cx + dx, y = s.fy - alt;
  // A jump's speed puts the run's full plunge on him: a liquid has him under in a third of a
  // second, so the face runs at the pace of the sink.
  const GULP = s.hard ? 0.3 : 0.1, SHUT_AT = s.hard ? 0.66 : 0.3;
  let pose, o = {};
  if (wa < Math.min(0.12, GULP)) { pose = jumpPose(-JV, SURPRISED); o.pin = true; o.jitter = takeJitter(s.w); o.look = [0.01, 0.02]; }
  else if (wa < GULP) { pose = jumpPose(-JV, SURPRISED); o.pin = true; o.look = [0.01, 0.02]; }
  else if (wa < SHUT_AT) { pose = jumpPose(-JV, GRIM); o.pin = true; }
  else pose = dropPose(SHUT);
  bottom(c, heroId, s, { x, y, e: wa, pose, o });
  if (!s.hard) {
    sweat(c, heroId, x, y, wa - 0.05);
    const g = wa - GULP;
    if (g > 0 && g < SHUT_AT - GULP + 0.1) word(c, 'gulp', x + 9, s.fy - 12 - 6 * clamp01(g / 0.3), 1 - clamp01((g - 0.22) / 0.08), 4.5);
  }
}

// G2 — JUMPED IN, WITH A HANG (Peter, 16 Oct: "can we not float a bit when he jumps in, we
// know he's going to miss right?"). The hop comes down into the hole as in G, and the frame
// his feet reach the lip — the frame the run already decides he is dead — he stops dead
// there: one windmill of the arms, leans out and looks down, gulps, drops the short drop,
// and the bottom answers as in E. No prediction: it hangs where the death is decided.
const G2T = PIT_HANG_JUMPED;            // { RUN: 0, LOOK: 0.22, BACK: 0.46, DROP: 0.72 }
function paintG2(c, heroId, s) { paintHangE(c, heroId, s, G2T, 0); }
// G3 — HANG AT THE APEX. The same hang at the top of the hop, for when the run can tell at
// the apex that nothing can save him (no air jump left, no float or dash ready): the classic
// coyote, frozen at the height of his jump. Drops from there — further, so faster.
// A smaller hop than G's, so the hang at its top stays inside this sheet's un-craned frame
// (the run's camera would crane up for a real jump's apex).
const JV3 = 190;
const G3_ALT = JV3 * JV3 / (2 * JUMP_G);
const G3T = { RUN: 0, LOOK: 0.22, BACK: 0.5, DROP: 0.78 };
function paintG3(c, heroId, s) { paintHangE(c, heroId, s, G3T, G3_ALT); }
function apexApproach(c, heroId, s) {
  const tau = s.w + JV3 / JUMP_G;        // the apex is the frame he dies
  if (tau < 0) { drawToon(c, heroId, runFrame(s.tl * 1.7), s.cx, s.fy, U); return; }
  const alt = JV3 * tau - 0.5 * JUMP_G * tau * tau, vy = JV3 - JUMP_G * tau;
  drawToon(c, heroId, jumpPose(vy), s.cx, s.fy - alt, U);
}
// The hang with E's bottom, at any height on any beat table.
function paintHangE(c, heroId, s, T, alt0) {
  const st = hangState(heroId, { ...s, carry: 0 }, T, alt0, true);
  const x = s.cx, y = s.fy - st.alt;
  bottom(c, heroId, s, { x, y, e: st.wa, pose: st.pose, o: st.o });
  if (st.beat === 'gulp') word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((s.w - T.DROP + 0.06) / 0.06), 4.5);
  sweat(c, heroId, x, y, s.w - T.BACK - 0.02);
}

// H — FINGERTIPS. The hop comes down a few px short of the far wall: his front hand catches
// the lip and he hangs there by it, body down in the hole (in the material, if it is a
// liquid — he is going under anyway). He looks up at the hand, gulps, the fingers come off
// the edge in two jerks (no scrape marks: Peter, 16 Oct — the hand is behind the floor) — and he goes in, and the bottom answers as in E.
const HF = PIT_GRIP;                     // the shipped beats: three fingers, two, one, gone (pitFall.js)
const HANG_ALT = PIT_GRIP_ALT;           // his front hand, at the top of his reach, on the lip
function paintH(c, heroId, s) {
  const w = s.w;
  const x = s.cx;
  // the two jerks as the fingers go
  const slipBy = pitGripSlip(w);
  let alt, pose, o = {}, e = -1;
  if (w < HF.SLIP) {
    alt = w < HF.SNAP ? lerp(0, HANG_ALT, easeOut(w / HF.SNAP)) : HANG_ALT - slipBy;
    ({ pose, o } = pitGripFigure(w));
  } else {
    e = w - HF.SLIP;
    alt = s.hard ? HANG_ALT - slipBy - 2 : HANG_ALT - slipBy - sunk(e, 160);
    pose = dropPose(SHUT);
  }
  const y = s.fy - alt;
  bottom(c, heroId, s, { x, y, e, pose, o, restY: s.fy - (HANG_ALT - slipBy - 2) });
  // the fingers on the edge: three, then two, then one, then gone
  if (w < HF.SLIP) drawPitFingertips(c, heroId, s.wall, s.fy, pitGripFingers(w));
  if (w >= HF.GULP && w < HF.SLIP) word(c, 'gulp', x - 12, s.fy - 7, 1 - clamp01((w - HF.SCRAPE) / 0.08), 4.5, '#ffffff', 0.1);
  sweat(c, heroId, x, y, w - HF.GULP - 0.02);
}

// ---------------------------------------------------------------- the candidates
export const PIT_FALL_NOW = {
  letter: 'NOW', id: 'now', name: 'today’s fall',
  note: 'What the run does: he keeps drifting forward off the lip and drops the 12 px to the material (5 px to a spike bed’s tips) in a fifth of a second, '
    + 'on a frozen run frame wearing the startled face; on arrival the spiral death face starts and a liquid takes him down in front of itself.',
  paint: paintNow,
};
export const PIT_FALL = [
  { letter: 'A', id: 'face', name: 'FACE SEQUENCE ONLY', paint: paintA,
    note: 'Today’s fall exactly, with a living face: a double-take at the lip, pupils gone to pinpricks on the way down, a bead of sweat flicked off as he lands, '
      + '“gulp”, then eyes squeezed shut and teeth bared as it takes him. No spirals — that is the face he goes under with.' },
  { letter: 'B', id: 'coyote', name: 'COYOTE HANG', paint: paintB,
    note: 'Runs a step on thin air, stops dead over the hole, double-takes, LEANS out over it to look down (the whole figure tipped forward about his feet, eyes down, pupils to pinpricks), '
      + 'looks back up with the gulp face and a bead of sweat, then drops — arms up, eyes squeezed, teeth bared — the same short drop. A second over the hole, all inside today’s 2.25s hold.' },
  { letter: 'C', id: 'whistle', name: 'B + STREAK AND POOF', paint: paintC,
    note: 'B, and the drop gets its cartoon: speed streaks above him from where he hung, then a dust puff out either side where he stops and a little “poof” rising out of the hole past the lip. '
      + 'Sound idea: a short slide-whistle down over the 0.2s drop (pitched to the depth, not a long fall), then a soft “poof” instead of today’s plop.' },
  { letter: 'D', id: 'sign', name: 'B + A TINY SIGN', paint: paintD,
    note: 'B, but the gulp is a sign: he pulls a little HELP! out of nowhere and holds it up on a stick over his head as he drops — the last of him to go under. On a spike bed it wobbles round to OUCH!' },
  { letter: 'E', id: 'payoff', name: 'B + THE BOTTOM ANSWERS', paint: paintE,
    note: 'B, and what is at the bottom has its say where he stops. Lava: flames flick up round him, smoke off the surface, what is left of him above it goes singed grey. '
      + 'Spikes: he jolts straight up off them, pinprick-eyed, OUCH! and a burst of sparks, then down onto the tips, eyes shut. Slush: a splash ring and a crown of drops, and he frosts over as he goes. '
      + 'Tar: a dull gloop, a dust puff, two slow bubbles when he has gone. A liquid takes him UNDER — cut off at its surface rather than drawn over it.' },
  { letter: 'G', id: 'jumped', name: 'JUMPED IN', paint: paintG, approach: jumpApproach, lipOff: -20, arrive: gArrive,
    note: 'FOR: a jump that comes down inside the hole (already falling, partway across). No hang — there is no moment to hang in. He keeps his arc, the drift and the short drop, '
      + 'wearing A’s face on the way: a double-take, pinprick eyes, then on the material the gulp and eyes squeezed shut; and the bottom answers as in E (tar, spikes, slush, lava).' },
  { letter: 'G2', id: 'jumped-hang', name: 'JUMPED IN, WITH A HANG', paint: paintG2, approach: jumpApproach, lipOff: -20,
    arrive: (surf) => G2T.DROP + Math.sqrt(2 * -surf / G),
    note: 'FOR: a jump that comes down inside the hole — G, without the float past the moment it is decided. The frame his feet reach the lip (where the run already declares him dead) he stops dead in mid-air: '
      + 'one windmill of the arms, leans out and looks down (whole figure, pinprick eyes), “gulp”, then the short drop and the bottom answers as in E. NEEDS NO PREDICTION: it hangs where the death is decided.' },
  { letter: 'G3', id: 'jumped-apex', name: 'HANG AT THE APEX', paint: paintG3, approach: apexApproach, lipOff: -12,
    arrive: (surf) => G3T.DROP + Math.sqrt(2 * (G3_ALT - surf) / G),
    note: 'FOR: a jump the run can already tell is lost at the top of the hop. He hangs at the APEX — the classic coyote — windmills, looks down, gulps, and drops the whole way (further, so faster), and the bottom answers as in E. '
      + 'NEEDS A PREDICTION IN THE RUN: at the apex, over a fatal hole, with nothing that could still save him (no air jump left, no float or dash ready, no spring or platform in reach).' },
  { letter: 'H', id: 'fingertips', name: 'FINGERTIPS', paint: paintH, approach: jumpApproach, lipOff: -50, arrive: () => HF.SLIP,
    note: 'FOR: a jump that comes down a few px short of the far wall. His front hand catches the far lip and he hangs by it, side-on, the rest of him down in the hole (in a liquid, already in it). '
      + 'He looks up at the hand, pinprick-eyed; “gulp”; the fingers come off the edge in two jerks, and he goes in — and the bottom answers as in E.' },
];

// ---------------------------------------------------------------- the tile
// One cabinet strip per row at in-run size (zoom 2, the obstacle kit's frame, cropped to the
// bottom of the screen so the 19 px of apron the run shows are all in it), two heroes each,
// each running into his own copy of a real gap carved by the pack's own ground() and filled
// by the run's own drawPitFills, at the same moment, on a loop. The world freezes as they
// die, as the run's does. The fail banner the run puts up on arrival is left off.
export const PIT_FALL_ROWS = {
  mixed: [
    { cabinet: 'plumber', stageIndex: 1, camX: 600, label: 'FIELD SERVICE · tar (the default)', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'rhythm', stageIndex: 1, camX: 600, label: 'RHYTHM BANKRUPTCY · spikes', heroes: ['b33p', 'kiko'] },
  ],
  speed: [{ cabinet: 'speed', stageIndex: 1, camX: 600, label: 'SPEED ZONE · lava', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'speed', stageIndex: 2, camX: 1500, label: 'SPEED ZONE 2 · lava', heroes: ['b33p', 'kiko'] }],
  rhythm: [{ cabinet: 'rhythm', stageIndex: 1, camX: 600, label: 'RHYTHM BANKRUPTCY · spikes', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'rhythm', stageIndex: 1, camX: 1400, label: 'RHYTHM BANKRUPTCY · spikes', heroes: ['b33p', 'kiko'] }],
  frost: [{ cabinet: 'frost', stageIndex: 1, camX: 600, label: 'FROST FORTRESS · slush', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'frost', stageIndex: 2, camX: 1400, label: 'FROST FORTRESS 2 · slush', heroes: ['b33p', 'kiko'] }],
  plumber: [{ cabinet: 'plumber', stageIndex: 1, camX: 600, label: 'FIELD SERVICE · tar (the default)', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'plumber', stageIndex: 3, camX: 2200, label: 'FIELD SERVICE 3 · tar', heroes: ['b33p', 'kiko'] }],
};
export const PIT_LANE = Object.freeze({ top: 122, h: 148, gap: 2 });
export const pitLaneHeight = (rows) => rows.length * PIT_LANE.h + (rows.length - 1) * PIT_LANE.gap;
const T_LIP = 0.9;                       // run-in before the lip
export const PIT_FALL_LOOP = T_LIP + PIT_FALL_HOLD + 0.4;
const HERO_XS = [62, 168];               // where each hero is (world units) when he goes in
const GAP_W = 56;
const TOTAL = 6000;
const packs = new Map();
function packFor(cab, row) {
  const key = `${cab.id}:${row.stageIndex ?? 1}`;
  if (!packs.has(key)) packs.set(key, getStylePack(cab.style, { stageIndex: row.stageIndex ?? 1 }));
  return packs.get(key);
}
const shakeAt = (e, amp, dur, t) => {
  if (e < 0 || e > dur) return [0, 0];
  const p = amp * Math.min(1, (dur - e) * 4), n = Math.floor(t * 60);
  return [(hash(n) * 2 - 1) * p, (hash(n + 0.5) * 2 - 1) * p];
};

export function drawPitFallTile(ctx, t, cand, rows) {
  const tl = ((t % PIT_FALL_LOOP) + PIT_FALL_LOOP) % PIT_FALL_LOOP;
  const w = tl - T_LIP;
  const { top, h, gap } = PIT_LANE;
  rows.forEach((row, i) => {
    const cab = CABINET_BY_ID[row.cabinet];
    const pack = packFor(cab, row);
    const fill = cab.pitFill || 'tar';
    const surf = fill === 'none' ? LIQUID_SURF - 30 : surfOf(fill);
    const hard = !!fillSurface(fill).hard;
    const camX = (row.camX ?? 600) + SCROLL * Math.min(tl, T_LIP);
    const y0 = i * (h + gap);
    // the run's shakes: 7 for 0.4s at the lip; 3 (4 on teeth) for ~0.23s on arrival
    const fallT = cand.arrive ? cand.arrive(surf)
      : cand.id === 'now' || cand.id === 'face' ? Math.sqrt(2 * -surf / G) : H.DROP + Math.sqrt(2 * -surf / G);
    const s1 = shakeAt(w, 7, 0.4, t), s2 = shakeAt(w - fallT, hard ? 4 : 3, hard ? 0.24 : 0.22, t);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y0, 480, h); ctx.clip();
    ctx.translate(s1[0] + s2[0], y0 - top + s1[1] + s2[1]);
    ctx.fillStyle = cab.sky?.[0] || '#000';
    ctx.fillRect(-20, 0, 520, 290);
    const bc = { stageIndex: row.stageIndex ?? 1, progress: camX / TOTAL };
    pack.bg?.(ctx, t, camX, cab, TOTAL, null, 0, bc);
    ctx.save();
    applyWorld(ctx, 2, 0);
    const lipOff = cand.lipOff ?? -4;      // where the near lip is, from his centre, the frame he dies
    const lipAt = (hx) => (row.camX ?? 600) + SCROLL * T_LIP + hx + lipOff;
    const obs = row.heroes.map((_, k) => ({ ...makeObstacle('gap', lipAt(HERO_XS[k])), fill }));
    pack.ground?.(ctx, camX, cab, obs, [], t);
    drawPitFills(ctx, camX, cab, obs, t, true, null, 480, cab.groundDark);
    row.heroes.forEach((heroId, k) => {
      const hx = HERO_XS[k];
      const lip = hx + lipOff;
      if (w < 0) {
        if (cand.approach) cand.approach(ctx, heroId, { cx: hx, fy: GROUND_Y, w, tl, t });
        else drawToon(ctx, heroId, runFrame(tl * 1.7), hx, GROUND_Y, U);
        return;
      }
      if (w > PIT_FALL_HOLD) return;           // the hole, empty: then the checkpoint
      cand.paint(ctx, heroId, {
        cx: hx, fy: GROUND_Y, w, t, fill, surf, hard,
        wall: lip + GAP_W,
        carry: Math.max(0, Math.min(GAP_W * 0.5, 40, lip + GAP_W - hx - 12)),
        phase0: T_LIP * 1.7,
      });
    });
    ctx.restore();
    pack.post?.(ctx, t);
    ctx.restore();
    if (row.label) {
      ctx.save();
      ctx.font = '600 7px ui-monospace, Menlo, monospace';
      ctx.fillStyle = 'rgba(16,14,22,0.72)';
      ctx.fillRect(4, y0 + 4, ctx.measureText(row.label).width + 6, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row.label, 7, y0 + 11.5);
      ctx.restore();
    }
  });
}
