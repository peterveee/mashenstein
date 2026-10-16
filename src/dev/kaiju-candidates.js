// TERMINAL VELOCITY — a kaiju on the attack (mock-up, 16 Oct 2026).
//
// Peter: "Can we mockup a neon Godzilla on the attack for the neon levels? Laser eyes
// destroying a building maybe?" Background set piece only — nothing here touches the
// lane. The monster stands in the city between the middle and the near wire rows (the
// pack's `neonBehindNear` seam, so the near row's tubes and the smog veil stand in
// front of his legs), keeps pace with the run, and on a 6.4s loop charges, fires two
// beams from his eyes, slices the top off a tower riding in from the right, and roars
// while it topples into the street.
//
// Four looks on the one rig and the one timeline: A a tube-lit silhouette in the
// city's own magenta and cyan; B the classic — charcoal hide, dorsal plates that
// charge up the spine from the tail; C a mecha in gunmetal with a visor; D a black
// shape against the sky, only the rim and the eyes lit. Not called Godzilla anywhere
// a player would see it — that name is somebody else's.
import { GROUND_Y, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

export const KAIJU_LOOP = 6.4;
const CHARGE = [0.9, 2.0];     // eyes and plates light
const SWEEP = [2.0, 3.0];      // the beams cut across the tower
const CUT = SWEEP[1];          // the top lets go
const ROAR = [3.2, 4.6];
const KX = 178;                // his feet, frame px
const SCROLL = 110;            // the sheet's run speed (world u/s)
const TOWER_F = 0.3 * 2;       // the near row's parallax factor x ZOOM

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const span = (ph, [a, b]) => clamp01((ph - a) / (b - a));

// ------------------------------------------------------------------- the looks
export const KAIJU_CANDIDATES = Object.freeze([
  {
    letter: 'A', id: 'tube', name: 'NEON KAIJU',
    note: 'Drawn the way the city is: a near-black body outlined in a magenta tube, cyan plates, red eyes. Belongs to the backdrop’s own language.',
    body: '#120a26', rim: { color: '#e838f8', width: 1.2, glow: 0.35 }, plate: '#120a26',
    plateRim: { color: '#38d8f8', width: 1, glow: 0.3 }, plateCharge: '#38d8f8',
    eye: '#ff3a4a', beam: '#ff3a4a', belly: '#e838f8',
  },
  {
    letter: 'B', id: 'atomic', name: 'THE CLASSIC',
    note: 'Charcoal-green hide with scales and a ridged belly, a faint magenta rim from the signs. The dorsal plates charge from the tail tip to the head before he fires — the tell. Blue-white beams.',
    body: ['#26382f', '#121c18'], rim: { color: '#e838f8', width: 0.7, glow: 0.15 }, plate: '#2c3a40',
    plateRim: { color: '#7fb4c8', width: 0.6, glow: 0 }, plateCharge: '#7fd8ff',
    eye: '#c8f4ff', beam: '#6fd0ff', scales: true, belly: '#3a4a3a',
  },
  {
    letter: 'C', id: 'mecha', name: 'MECHA',
    note: 'Gunmetal plating with panel seams and rivets, a cyan chrome edge, a red visor bar for eyes. Fits a city of tubes; the most “robot cat” of the four.',
    body: ['#6a7282', '#2c313c'], rim: { color: '#38d8f8', width: 0.9, glow: 0.25 }, plate: '#4a5260',
    plateRim: { color: '#38d8f8', width: 0.8, glow: 0.2 }, plateCharge: '#ff6a5a',
    eye: '#ff3030', beam: '#ff4a3a', panels: true, visor: true, belly: '#3a404c',
  },
  {
    letter: 'D', id: 'shadow', name: 'SHADOW',
    note: 'A black shape against the sky — no interior detail at all, a thin magenta rim where the signs catch him, and the eyes. Reads at any distance; the most frightening, the least “character”.',
    body: '#05030c', rim: { color: '#e838f8', width: 0.6, glow: 0.4 }, plate: '#05030c',
    plateRim: { color: '#e838f8', width: 0.5, glow: 0.3 }, plateCharge: '#ffb070',
    eye: '#ff8a3a', beam: '#ff7a2a',
  },
]);

// ------------------------------------------------------------- path helpers
// A tapered limb along a quadratic centreline: w0 at the root, w1 at the tip.
function taper(p0, c, p1, w0, w1, n = 10) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    const x = v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0];
    const y = v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1];
    const tx = 2 * v * (c[0] - p0[0]) + 2 * u * (p1[0] - c[0]);
    const ty = 2 * v * (c[1] - p0[1]) + 2 * u * (p1[1] - c[1]);
    const m = Math.hypot(tx, ty) || 1;
    const w = (w0 + (w1 - w0) * u) / 2;
    L.push([x - ty / m * w, y + tx / m * w]);
    R.push([x + ty / m * w, y - tx / m * w]);
  }
  const p = new Path2D();
  p.moveTo(...L[0]);
  for (const q of L.slice(1)) p.lineTo(...q);
  for (const q of R.reverse()) p.lineTo(...q);
  p.closePath();
  return p;
}
const quadAt = (p0, c, p1, u) => {
  const v = 1 - u;
  return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]];
};
const quadTan = (p0, c, p1, u) => {
  const v = 1 - u;
  const tx = 2 * v * (c[0] - p0[0]) + 2 * u * (p1[0] - c[0]);
  const ty = 2 * v * (c[1] - p0[1]) + 2 * u * (p1[1] - c[1]);
  const m = Math.hypot(tx, ty) || 1;
  return [tx / m, ty / m];
};

function glowStroke(ctx, path, { color, width, glow }) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  if (glow > 0) {
    ctx.globalAlpha *= glow;
    ctx.lineWidth = width * 4;
    ctx.stroke(path);
    ctx.globalAlpha /= glow;
  }
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.restore();
}

function bodyFill(ctx, look, top, bottom) {
  if (typeof look.body === 'string') return look.body;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, look.body[0]);
  g.addColorStop(1, look.body[1]);
  return g;
}

// ------------------------------------------------------------------- the rig
// Facing right, feet at the origin, up is −y. About 185 frame px tall: his head clears
// the near row's tallest roof, his legs stand in its smog.
const BACK = [[-26, -50], [-38, -100], [-6, -146]];   // hip → shoulder, a quadratic
const TAIL_ROOT = [-22, -60];
const NECK = [14, -152];
const JAW_PIVOT = [22, -157];
const EYE = [31, -168];

function rotAbout([x, y], [px, py], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
}

function poseAt(ph, t) {
  const walk = t * 2.6;
  const charge = ease(span(ph, CHARGE));
  const fire = ph >= SWEEP[0] && ph < SWEEP[1] + 0.1;
  const roar = span(ph, ROAR);
  const roarK = Math.sin(Math.PI * roar);
  return {
    walk,
    bob: Math.abs(Math.sin(walk)) * -2.2,
    sway: Math.sin(walk) * 0.012,
    tail: Math.sin(t * 1.3) * 10,
    // He rears back on the charge, leans into the beam, throws the head up to roar.
    lean: -0.05 * charge * (fire ? 0 : 1) + (fire ? 0.05 : 0) - 0.08 * roarK,
    jaw: fire ? 0.12 : 0.05 + 0.5 * roarK,
    charge: fire ? 1 : charge * (ph < SWEEP[0] ? 1 : 0),
    fire,
  };
}

// The eyes in frame space, for the beams. Mirrors the transforms drawKaiju applies.
function eyesAt(pose, aim) {
  const head = rotAbout(EYE, NECK, aim);
  const p = rotAbout(head, [0, -60], pose.lean + pose.sway);
  return [[KX + p[0], GROUND_Y + pose.bob + p[1]], [KX + p[0] - 3, GROUND_Y + pose.bob + p[1] - 1.5]];
}

function drawKaiju(ctx, look, pose, aim, t) {
  const H0 = -186, H1 = 0;
  ctx.save();
  ctx.translate(KX, GROUND_Y + pose.bob);
  // Lean about the hips, so the head travels and the feet stay put.
  ctx.translate(0, -60); ctx.rotate(pose.lean + pose.sway); ctx.translate(0, 60);
  const fill = bodyFill(ctx, look, H0, H1);
  const solid = (path, f = fill) => { ctx.fillStyle = f; ctx.fill(path); };
  const rim = (path, k = 1) => glowStroke(ctx, path, { ...look.rim, width: look.rim.width * k });

  // TAIL — a long quadratic from the hip to the ground behind him, swinging.
  const tailTip = [-122 + pose.tail * 0.4, -4 - Math.abs(pose.tail) * 0.3];
  const tailC = [-70, -18 + pose.tail * 0.6];
  const tail = taper(TAIL_ROOT, tailC, tailTip, 34, 3, 16);

  // PLATES — along the back from the hips up to the nape, then down the tail.
  const plates = [];
  for (let i = 0; i < 8; i++) {
    const u = 0.12 + i * 0.12;
    const at = quadAt(...BACK, u), tn = quadTan(...BACK, u);
    const size = 10 + 13 * Math.sin(Math.PI * (0.25 + u * 0.7));
    plates.push({ at, n: [tn[1], -tn[0]], tn, size, k: 0.3 + u * 0.7 });
  }
  for (let i = 0; i < 6; i++) {
    const u = 0.08 + i * 0.15;
    const at = quadAt(TAIL_ROOT, tailC, tailTip, u), tn = quadTan(TAIL_ROOT, tailC, tailTip, u);
    const half = (34 + (3 - 34) * u) / 2;
    plates.push({ at: [at[0] - tn[1] * half * 0.7, at[1] + tn[0] * half * 0.7], n: [-tn[1], tn[0]], tn, size: 11 - u * 8, k: 0.3 - u * 0.3 });
  }
  const platePath = ({ at, n, tn, size }) => {
    const p = new Path2D();
    const b = size * 0.42;
    const pt = (a, o) => [at[0] + tn[0] * a + n[0] * o, at[1] + tn[1] * a + n[1] * o];
    p.moveTo(...pt(-b, -2));
    p.lineTo(...pt(-b * 0.9, size * 0.45));
    p.lineTo(...pt(-b * 0.35, size * 0.5));
    p.lineTo(...pt(-b * 0.1, size));
    p.lineTo(...pt(b * 0.35, size * 0.55));
    p.lineTo(...pt(b * 0.8, size * 0.6));
    p.lineTo(...pt(b, -2));
    p.closePath();
    return p;
  };
  // The charge runs from the tail tip (k 0) to the head (k 1).
  const lit = (k) => (pose.fire ? 0.85 + 0.15 * Math.sin(t * 40 + k * 9) : clamp01((pose.charge * 1.35 - k) * 4));
  for (const pl of plates) {
    const p = platePath(pl);
    solid(p, look.plate);
    glowStroke(ctx, p, look.plateRim);
    const l = lit(pl.k);
    if (l > 0) {
      ctx.save();
      ctx.globalAlpha = l * 0.9;
      ctx.fillStyle = look.plateCharge;
      ctx.fill(p);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = l * 0.35;
      ctx.lineWidth = 4;
      ctx.strokeStyle = look.plateCharge;
      ctx.stroke(p);
      ctx.restore();
    }
  }

  // FAR LIMBS, a shade darker behind the body.
  const stepN = Math.max(0, Math.sin(pose.walk)) * 5;
  const stepF = Math.max(0, -Math.sin(pose.walk)) * 5;
  ctx.save();
  ctx.globalAlpha = 0.75;
  const farLeg = new Path2D();
  farLeg.ellipse(-16, -52, 18, 22, 0.2, 0, Math.PI * 2);
  farLeg.addPath(taper([-14, -36], [-12, -18], [-8, -4 - stepF], 14, 11));
  farLeg.ellipse(-4, -3 - stepF, 12, 4, 0, 0, Math.PI * 2);
  solid(farLeg);
  const farArm = taper([10, -128], [20, -108], [34, -116], 7, 4);
  solid(farArm);
  ctx.restore();

  // THE SILHOUETTE — tail, torso, near leg and the head, as ONE shape: the rim is
  // stroked round the lot first and the fill laid over it, so only the outside edge
  // stays lit (no rings round the thigh or the foot).
  const torso = new Path2D();
  torso.moveTo(-26, -50);
  torso.quadraticCurveTo(-38, -100, -6, -146);
  torso.bezierCurveTo(2, -152, 6, -156, 10, -158);
  torso.lineTo(26, -150);
  torso.bezierCurveTo(30, -136, 35, -112, 31, -88);
  torso.bezierCurveTo(28, -66, 16, -52, 2, -44);
  torso.closePath();
  const leg = new Path2D();
  leg.ellipse(-4, -50, 21, 25, 0.15, 0, Math.PI * 2);
  const shin = taper([-2, -32], [0, -16], [4, -4 - stepN], 15, 12);
  const foot = new Path2D();
  foot.ellipse(9, -3 - stepN, 14, 4.5, 0, 0, Math.PI * 2);
  // The head aims at the tower about the neck; the jaw drops about its hinge.
  const headM = new DOMMatrix().translate(...NECK).rotate(aim * 180 / Math.PI).translate(-NECK[0], -NECK[1]);
  const jawM = headM.translate(...JAW_PIVOT).rotate(pose.jaw * 180 / Math.PI).translate(-JAW_PIVOT[0], -JAW_PIVOT[1]);
  const skull = new Path2D();
  skull.moveTo(2, -160);
  skull.bezierCurveTo(4, -176, 20, -180, 32, -174);
  skull.bezierCurveTo(40, -171, 46, -168, 49, -164);
  skull.quadraticCurveTo(50, -160, 47, -158);
  skull.lineTo(22, -157);
  skull.lineTo(8, -150);
  skull.closePath();
  const jaw = new Path2D();
  jaw.moveTo(18, -158);
  jaw.lineTo(46, -158);
  jaw.quadraticCurveTo(46, -152, 40, -150);
  jaw.lineTo(20, -149);
  jaw.closePath();
  // The open mouth: the wedge between the upper lip and the dropped jaw.
  const lipTip = new DOMPoint(46, -158).matrixTransform(headM);
  const jawTip = new DOMPoint(46, -158).matrixTransform(jawM);
  const hinge = new DOMPoint(...JAW_PIVOT).matrixTransform(headM);
  const mouth = new Path2D();
  mouth.moveTo(hinge.x, hinge.y); mouth.lineTo(lipTip.x, lipTip.y); mouth.lineTo(jawTip.x, jawTip.y); mouth.closePath();
  const sil = new Path2D();
  for (const part of [tail, torso, leg, shin, foot]) sil.addPath(part);
  sil.addPath(skull, headM);
  sil.addPath(jaw, jawM);
  sil.addPath(mouth);
  rim(sil, 2);
  solid(sil);
  if (pose.jaw > 0.1) {
    ctx.fillStyle = '#40101a';
    ctx.fill(mouth);
  }

  // Belly ridges: arcs across the front.
  if (look.belly && look.id !== 'tube') {
    ctx.save();
    ctx.clip(torso);
    ctx.strokeStyle = look.belly;
    ctx.lineWidth = 1.2;
    for (let y = -138; y < -50; y += 7) {
      ctx.beginPath();
      ctx.moveTo(12, y + 4); ctx.quadraticCurveTo(24, y, 40, y + 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (look.scales) {
    ctx.save();
    ctx.clip(sil);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 140; i++) {
      const x = -60 + hash(i) * 80, y = -150 + hash(i + 50) * 150;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    ctx.restore();
  }
  if (look.panels) {
    ctx.save();
    ctx.clip(torso);
    ctx.strokeStyle = 'rgba(10,12,20,0.7)';
    ctx.lineWidth = 0.8;
    for (const y of [-130, -112, -94, -76, -60]) { ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(40, y + 4); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-8, -150); ctx.lineTo(-4, -46); ctx.stroke();
    ctx.fillStyle = '#9aa4b4';
    for (const y of [-126, -108, -90, -72]) for (const x of [-18, 8]) ctx.fillRect(x, y, 1, 1);
    // A chrome highlight down the chest.
    ctx.strokeStyle = 'rgba(200,230,255,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(26, -140); ctx.quadraticCurveTo(32, -112, 28, -84); ctx.stroke();
    ctx.restore();
  }
  // The thigh, by a crease rather than an outline.
  if (look.id !== 'shadow') {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-4, -50, 21, 25, 0.15, -2.2, -0.9); ctx.stroke();
    ctx.restore();
  }

  // HEAD DETAIL, in the head's frame.
  ctx.save();
  ctx.setTransform(ctx.getTransform().multiply(headM));
  if (pose.jaw > 0.1) {
    ctx.fillStyle = '#e8e4d8';
    for (let x = 26; x < 46; x += 4) { ctx.beginPath(); ctx.moveTo(x, -158); ctx.lineTo(x + 1.2, -155); ctx.lineTo(x + 2.4, -158); ctx.fill(); }
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(headM.inverse()).multiply(jawM));
    for (let x = 26; x < 44; x += 4) { ctx.beginPath(); ctx.moveTo(x, -158); ctx.lineTo(x + 1.2, -161); ctx.lineTo(x + 2.4, -158); ctx.fill(); }
    ctx.restore();
  }
  // Brow ridge over the eye, a nostril.
  ctx.strokeStyle = look.id === 'shadow' ? '#05030c' : 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(24, -171); ctx.lineTo(37, -168); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(45, -165, 1.5, 1);
  // EYES. A visor is a bar; everything else a slit with a halo that grows on the charge.
  const heat = Math.max(pose.charge, pose.fire ? 1 : 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = 4 + 10 * heat;
  const g = ctx.createRadialGradient(EYE[0], EYE[1], 0, EYE[0], EYE[1], r);
  g.addColorStop(0, look.eye);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35 + 0.65 * heat;
  ctx.fillStyle = g;
  ctx.fillRect(EYE[0] - r, EYE[1] - r, r * 2, r * 2);
  ctx.restore();
  ctx.fillStyle = look.eye;
  if (look.visor) ctx.fillRect(22, -169.5, 18, 2.5);
  else { ctx.beginPath(); ctx.ellipse(EYE[0], EYE[1], 2.6, 1.3, -0.15, 0, Math.PI * 2); ctx.fill(); }
  if (heat > 0.5) { ctx.fillStyle = '#ffffff'; ctx.fillRect(EYE[0] - 0.8, EYE[1] - 0.6, 1.6, 1.2); }
  ctx.restore();

  // NEAR ARM — short, clawed, held forward.
  const arm = taper([16, -126], [26, -104], [40, -112], 8, 4.5);
  solid(arm);
  rim(arm, 0.7);
  ctx.fillStyle = look.id === 'mecha' ? '#c8d4e4' : '#d8d0c0';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(39 + i * 1.5, -113 + i * 1.6);
    ctx.lineTo(43 + i * 1.5, -112 + i * 2.2);
    ctx.lineTo(39.5 + i * 1.5, -111 + i * 1.6);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the tower
// A wire tower like the near row's, riding in at its parallax. Before CUT it stands;
// after, the cut top tips away from the beam and drops behind the row into the smog.
const TW = 36, TH = 172;
const SLICE_R = GROUND_Y - 116, SLICE_L = GROUND_Y - 110;   // the cut, sloping down-left

function towerX(ph) { return 520 - SCROLL * TOWER_F * ph; }

function towerBody(ctx, x, top, t, ink) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 4.8;
  ctx.strokeRect(x + 0.5, top + 0.5, TW, 270 - top);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.5, top + 0.5, TW, 270 - top);
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = top + 9; y < 268; y += 9) { ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + TW + 0.5, y + 0.5); }
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#f6d33c';
  for (let k = 0; k < 22; k++) {
    if (hash(k + 3) > 0.5 || Math.sin(t * 0.55 + k * 7) < -0.3) continue;
    ctx.fillRect(x + 3 + Math.floor(hash(k * 7) * (TW - 6)), top + 11 + Math.floor(hash(k * 13) * 14) * 9, 2, 2);
  }
  // Stepped crown and a mast with its lamp.
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6.5, top - 7.5, TW - 12, 8);
  ctx.beginPath(); ctx.moveTo(x + TW / 2 + 0.5, top - 8); ctx.lineTo(x + TW / 2 + 0.5, top - 24); ctx.stroke();
  if (Math.sin(t * 2.2) > 0) { ctx.fillStyle = '#ff4a5a'; ctx.fillRect(x + TW / 2 - 0.5, top - 26, 2, 2); }
  ctx.restore();
}

function cutClip(ctx, x, above) {
  ctx.beginPath();
  if (above) { ctx.moveTo(x - 60, -50); ctx.lineTo(x + TW + 60, -50); }
  else { ctx.moveTo(x - 60, 300); ctx.lineTo(x + TW + 60, 300); }
  ctx.lineTo(x + TW + 60, SLICE_R + (SLICE_R - SLICE_L) * (60 / TW));
  ctx.lineTo(x - 60, SLICE_L - (SLICE_R - SLICE_L) * (60 / TW));
  ctx.closePath();
  ctx.clip();
}

function drawTower(ctx, ph, t) {
  const x = towerX(ph);
  const top = GROUND_Y - TH;
  const ink = '#38d8f8';
  if (ph < CUT) { towerBody(ctx, x, top, t, ink); return; }
  const tc = ph - CUT;
  // The stump.
  ctx.save(); cutClip(ctx, x, false); towerBody(ctx, x, top, t, ink); ctx.restore();
  // The top: tips about the cut's far corner, then falls.
  const piv = [x + TW, SLICE_R];
  const ang = Math.min(1.6, 1.4 * tc * tc + 0.2 * tc);
  const drop = tc > 0.5 ? 0.5 * 420 * (tc - 0.5) ** 2 : 0;
  if (drop < 300) {
    ctx.save();
    ctx.translate(piv[0] + drop * 0.12, piv[1] + drop);
    ctx.rotate(ang);
    ctx.translate(-piv[0], -piv[1]);
    cutClip(ctx, x, true);
    towerBody(ctx, x, top, t, ink);
    ctx.restore();
  }
  // The molten cut along the stump, cooling.
  const heat = clamp01(1 - tc / 2.5);
  if (heat > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,160,60,${heat})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, SLICE_L); ctx.lineTo(x + TW, SLICE_R); ctx.stroke();
    ctx.restore();
  }
}

// The fireball, the debris and the smoke at the cut.
function drawBlast(ctx, ph, look) {
  if (ph < CUT) return;
  const tc = ph - CUT;
  const x = towerX(ph) + TW / 2, y = (SLICE_L + SLICE_R) / 2;
  // Smoke first, rising off the stump and leaning back with the run.
  for (let i = 0; i < 9; i++) {
    const age = tc - i * 0.22;
    if (age <= 0) continue;
    const r = 5 + age * 7;
    ctx.globalAlpha = Math.max(0, 0.42 - age * 0.11);
    ctx.fillStyle = i % 2 ? '#3a2a4a' : '#2a2038';
    ctx.beginPath();
    ctx.arc(x + (hash(i) - 0.5) * 14 + age * 10, y - age * 22 - hash(i + 9) * 6, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (tc < 1.1) {
    const k = tc / 1.1;
    const r = 12 + 34 * Math.sqrt(k);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,220,${1 - k})`);
    g.addColorStop(0.35, `rgba(255,170,60,${0.9 * (1 - k)})`);
    g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Debris: chips of the tower's glass and lit sparks, under gravity.
  for (let i = 0; i < 22; i++) {
    const vx = (hash(i * 3) - 0.35) * 150, vy = -40 - hash(i * 5) * 130;
    const px = x + vx * tc, py = y + vy * tc + 0.5 * 320 * tc * tc;
    if (py > GROUND_Y + 10) continue;
    ctx.globalAlpha = clamp01(1.6 - tc);
    ctx.fillStyle = i % 3 ? '#ffb050' : '#38d8f8';
    ctx.fillRect(px, py, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 1);
  }
  // Embers off the cut, all the while.
  for (let i = 0; i < 10; i++) {
    const a = (tc * 0.8 + hash(i)) % 1;
    ctx.globalAlpha = (1 - a) * 0.9;
    ctx.fillStyle = '#ff9a40';
    ctx.fillRect(x + (hash(i + 4) - 0.5) * TW + a * 8, y - a * 40, 1, 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  void look;
}

// The beams: a glow, a body, a white core, from both eyes to a point sweeping the cut.
function beamTarget(ph) {
  const s = ease(span(ph, SWEEP));
  const x = towerX(ph);
  return [x + TW + 2 - (TW + 4) * s, SLICE_R + (SLICE_L - SLICE_R) * s];
}

function drawBeams(ctx, eyes, to, look, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const flick = 0.85 + 0.15 * Math.sin(t * 70);
  for (const [i, from] of eyes.entries()) {
    const end = [to[0] - i * 2, to[1] - i * 1.5];
    for (const [w, a, c] of [[9 * flick, 0.18, look.beam], [3.4 * flick, 0.75, look.beam], [1.1, 1, '#ffffff']]) {
      ctx.globalAlpha = a * (i ? 0.7 : 1);
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(...from); ctx.lineTo(...end); ctx.stroke();
    }
  }
  // The contact: a hot spot and a spray of sparks.
  const r = 10 + 3 * Math.sin(t * 50);
  const g = ctx.createRadialGradient(to[0], to[1], 0, to[0], to[1], r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, look.beam);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(to[0] - r, to[1] - r, r * 2, r * 2);
  ctx.strokeStyle = '#ffd890';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 7; i++) {
    const a = -0.4 + hash(i + Math.floor(t * 30)) * 2.2, l = 4 + hash(i * 3 + Math.floor(t * 30)) * 9;
    ctx.beginPath(); ctx.moveTo(...to); ctx.lineTo(to[0] + Math.cos(a) * l, to[1] + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
}

// Everything between the middle and near rows, in the pack's seam.
function drawSetPiece(ctx, t, ph, look) {
  const pose = poseAt(ph, t);
  // He looks at the tower from the moment he sees it, and down along the beam.
  const eye0 = [KX + EYE[0], GROUND_Y + EYE[1]];
  const tgt = pose.fire ? beamTarget(ph) : [towerX(ph) + TW / 2, SLICE_R];
  const want = Math.atan2(tgt[1] - eye0[1], tgt[0] - eye0[0]);
  const aim = Math.max(-0.15, Math.min(0.45, want * 0.7)) - (span(ph, ROAR) > 0 ? 0.25 * Math.sin(Math.PI * span(ph, ROAR)) : 0);
  drawTower(ctx, ph, t);
  drawKaiju(ctx, look, pose, aim, t);
  drawBlast(ctx, ph, look);
  if (pose.fire && ph < SWEEP[1]) drawBeams(ctx, eyesAt(pose, aim), beamTarget(ph), look, t);
}

// --------------------------------------------------------------------- the tile
const packs = new Map();
export function drawKaijuScene(ctx, t, look, { stageIndex = 2, label = null } = {}) {
  const cab = CABINET_BY_ID.neon;
  if (!packs.has(stageIndex)) packs.set(stageIndex, getStylePack(cab.style, { stageIndex }));
  const pack = packs.get(stageIndex);
  const ph = ((t % KAIJU_LOOP) + KAIJU_LOOP) % KAIJU_LOOP;
  const camX = 600 + t * SCROLL;
  ctx.save();
  ctx.fillStyle = cab.sky?.[0] || '#000';
  ctx.fillRect(0, 0, 480, 270);
  // The blast shakes the picture a little.
  const shake = ph > CUT && ph < CUT + 0.35 ? (1 - (ph - CUT) / 0.35) * 2.5 : 0;
  if (shake) ctx.translate(Math.sin(t * 90) * shake, Math.cos(t * 77) * shake);
  const bc = {
    stageIndex, progress: 0.4,
    neonBehindNear: (c) => drawSetPiece(c, t, ph, look),
  };
  pack.bg?.(ctx, t, camX, cab, 6000, null, 0, bc);
  ctx.save();
  applyWorld(ctx, 2, 0);
  pack.ground?.(ctx, camX, cab, [], [], t);
  drawToon(ctx, 'lorenzo', { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  pack.post?.(ctx, t);
  // The beam and the blast light the whole street.
  const pose = poseAt(ph, t);
  const flash = (pose.fire && ph < SWEEP[1] ? 0.07 : 0) + (ph > CUT ? Math.max(0, 0.22 * (1 - (ph - CUT) / 0.6)) : 0);
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash;
    ctx.fillStyle = ph > CUT && ph < CUT + 0.6 ? '#ffb060' : look.beam;
    ctx.fillRect(-10, -10, 500, 290);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (label) {
    ctx.font = '600 7px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(16,14,22,0.72)';
    ctx.fillRect(4, 4, ctx.measureText(label).width + 6, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 7, 11.5);
  }
}
