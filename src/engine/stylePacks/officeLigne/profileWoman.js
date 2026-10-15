// THE WOMAN ZOMBIE CLERK, side on (Corporate Kombat, office-2's fire-exit queue): profileZombie.js's
// clerk dressed as a late-80s office woman. Picked from the lab bake-off office-zombie-girl-bakeoff
// (src/dev/office-zombie-girl-candidates.js): A the perm, B the bun, C the bob (Peter, 15 Oct), each
// with a handbag ("i would prefer purses to briefcases").
import { softColour, zombieHeightOf, ZOMBIE_SHAPE } from './zombies.js';
import { canvas, PAL } from './line.js';
import { CRYPT_ART_STYLES } from '../../../sprites/crypt-enemies.js';

const TAU = Math.PI * 2;
const ease = (v) => v * v * (3 - 2 * v);

// crypt-enemies.js painter(), the same helpers
function painter(c, s) {
  const M = s.map || ((x) => x);
  const path = (fill, fn, w = s.edge) => { c.beginPath(); fn(c); c.fillStyle = M(fill); c.fill(); if (w) { c.strokeStyle = M(s.ink); c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); } };
  const poly = (fill, points, w) => path(fill, (p) => { points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); }, w);
  const oval = (fill, x, y, rx, ry, w) => path(fill, (p) => p.ellipse(x, y, rx, ry, 0, 0, TAU), w);
  const box = (fill, x, y, w, h, r = 4, ow) => path(fill, (p) => p.roundRect(x, y, w, h, r), ow);
  const line = (fill, w, points) => { c.beginPath(); points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = M(fill); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); };
  const limb = (fill, w, points) => { line(s.ink, w + s.edge * 1.4, points); line(fill, w, points); };
  return { path, poly, oval, box, line, limb, M };
}

function joint(a, b, L1, L2, pick) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const r = Math.min(d, L1 + L2 - 1e-3);
  const along = (L1 * L1 - L2 * L2 + r * r) / (2 * r), h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
  const ux = dx / d, uy = dy / d, mx = a[0] + ux * along, my = a[1] + uy * along;
  const p1 = [mx - uy * h, my + ux * h], p2 = [mx + uy * h, my - ux * h];
  return pick(p1) >= pick(p2) ? p1 : p2;
}

function foot(u, { start, swing, center, lift }, D) {
  const v = ((u - start) % 1 + 1) % 1, half = D * (1 - swing) / 2;
  if (v < swing) {
    const e = ease(v / swing);
    return { x: center - half + 2 * half * e, lift: Math.sin(Math.PI * v / swing) * lift, swing: v / swing, up: true };
  }
  return { x: center + half - 2 * half * (v - swing) / (1 - swing), lift: 0, swing: 0, up: false };
}

const ANKLE = -6, HIP = -49, THIGH = 23.5, SHIN = 23, NECK = -38, SHOULDER = -33;
// the shipped queue clerk's gait, step for step (profileZombie.js QUEUE_CLERK), the stride a touch
// shorter for the pencil skirt
const GAIT = { lean: 0.1, jut: 3, loll: 0.12, D: 27,
  lead: { start: 0, swing: 0.32, center: 4, lift: 5 }, drag: { start: 0.5, swing: 0.4, center: -3, lift: 0.8, scuff: true } };

// ---------------------------------------------------------------- the candidates
// O: jacket (null = blouse only), dark (far sleeve / shade of the jacket), blouse, bow (null = open
// collar), skirt, legs (null = her green skin), shoes, hair, hairDk, earrings ('hoop'|'stud'|'pearl'
// |null), lips, shadow (eyeshadow on the lid), glasses, carry, beads (a necklace)
export const GIRL_CANDIDATES = [
  { id: 'A', letter: 'A', name: 'THE PERM', hair: 'perm', near: 'case',
    note: 'Skirt suit with shoulder pads, a pussy-bow blouse, a big perm round the back of her head, gold hoops, smeared lipstick, a handbag swinging from the near hand.',
    outfits: [
      ['TEAL', { jacket: '#3fa58f', dark: '#2b7366', blouse: '#fff0cb', bow: '#e0203a', skirt: '#2b7366', hair: '#a08a62', earrings: 'hoop', lips: '#c0304a', shadow: '#8fb0e0', carry: 'handbag', bag: '#e8708f' }],
      ['RASPBERRY', { jacket: '#c4577c', dark: '#8e3a5a', blouse: '#fff6ea', bow: '#26306b', skirt: '#8e3a5a', hair: '#2a2a30', earrings: 'hoop', lips: '#a8203a', carry: 'handbag', bag: '#2a2a30' }],
    ] },
  { id: 'B', letter: 'B', name: 'THE BUN', hair: 'bun', near: 'case',
    note: 'No jacket: a blouse with puffed shoulders tucked into a pencil skirt, her hair scraped up in a bun with a pencil through it, big 80s glasses, a stack of files hugged to her chest.',
    outfits: [
      ['WHITE + NAVY', { jacket: null, blouse: '#f7f1e4', bow: '#e0203a', skirt: '#33406f', dark: '#c9c0b0', hair: '#6b4529', glasses: true, carry: 'handbag', bag: '#a86a42', legs: '#4a3d55' }],
      ['PINK + GREY', { jacket: null, blouse: '#f4b6c8', bow: null, skirt: '#585e68', dark: '#c98aa0', hair: '#c9c4ba', glasses: true, carry: 'handbag', bag: '#2a2a30', earrings: 'pearl' }],
    ] },
  { id: 'C', letter: 'C', name: 'THE BOB', hair: 'bob', near: 'case',
    note: 'Skirt suit with shoulder pads, an open collar, a sharp bob with a heavy fringe, lipstick and blue eyeshadow, a clipboard hugged to her chest.',
    outfits: [
      ['MUSTARD', { jacket: '#c99a3c', dark: '#93702a', blouse: '#fff0cb', bow: null, skirt: '#93702a', hair: '#2a2a30', lips: '#c0304a', shadow: '#8fb0e0', carry: 'handbag', bag: '#e8708f' }],
      ['LILAC', { jacket: '#8a72c4', dark: '#5f4c8f', blouse: '#fff6ea', bow: null, skirt: '#5f4c8f', hair: '#ecdca8', lips: '#d0406a', carry: 'handbag', bag: '#efe6d6', legs: '#3d3346' }],
    ] }
];
export const GIRL_BY_ID = Object.fromEntries(GIRL_CANDIDATES.map((c) => [c.id, c]));

// ---------------------------------------------------------------- her
function drawProfileWoman(c, t, s, cand, u, O) {
  const P = painter(c, s);
  const { path, poly, oval, box, line, limb } = P;
  const G = GAIT;
  const jacket = O.jacket, top = jacket || O.blouse, dark = O.dark || '#326594';
  const shoes = O.shoes || '#3a2a3e';
  const lead = foot(u, G.lead, G.D), drag = foot(u, G.drag, G.D);
  const landAt = G.lead.start + G.lead.swing;
  const lv = ((u - landAt) % 1 + 1) % 1;
  const land = lv < 0.3 ? Math.sin(Math.PI * lv / 0.3) : 0;
  const hipY = HIP + 1.2 * land - 0.25 * lead.lift;
  const hip = [-1.2 * land, hipY];
  const tilt = G.lean + 0.025 * Math.sin(u * TAU - 0.5);
  const T = (x, y) => [hip[0] + x * Math.cos(tilt) - y * Math.sin(tilt), hip[1] + x * Math.sin(tilt) + y * Math.cos(tilt)];
  const shoulder = T(0, SHOULDER);
  const armBob = 1.4 * land + 1.1 * Math.sin(u * TAU + 1);

  // her legs: thinner than his trousers, bare green (or in tights) below the hem; a court shoe with
  // a heel, toe ahead
  const knees = [];
  const leg = (f, near) => {
    const ankle = [f.x, ANKLE - f.lift];
    const knee = joint(hip, ankle, THIGH, SHIN, (p) => p[0]);
    knees.push(knee);
    const col = O.legs ? (near ? O.legs : '#2e2536') : (near ? s.skin : s.shade);
    limb(col, 6.5, [hip, knee, ankle]);
    c.save(); c.translate(ankle[0], ankle[1]);
    let a = 0;
    if (f.up && f === drag) a = 0.32 * Math.sin(Math.PI * f.swing);
    else if (f.up) a = -0.22 * Math.sin(Math.PI * f.swing);
    c.rotate(a);
    // the heel, then the shoe: low-cut, pointed toe
    box(shoes, -5, 1, 3, 5, 0.8);
    path(shoes, (p) => { p.moveTo(-5.5, -2); p.quadraticCurveTo(2, -3.5, 9, 1); p.lineTo(13, 4.5); p.quadraticCurveTo(6, 6, -1, 3.5); p.lineTo(-5.5, 2.5); p.closePath(); });
    c.restore();
  };

  // what the near hand carries
  const hand = (kind, near) => {
    const sw = Math.sin(u * TAU + (near ? 0 : Math.PI));
    if (kind === 'reach') return [shoulder[0] + 29, shoulder[1] + 4 + armBob + (near ? 0 : -1.5)];
    if (kind === 'case') return [shoulder[0] + 5 + 1.5 * sw, shoulder[1] + 30];
    if (kind === 'hug') return [shoulder[0] + 12, shoulder[1] + 14 + 0.5 * armBob];
    return [shoulder[0] + 1 + 2.5 * sw, shoulder[1] + 30];
  };
  const arm = (kind, near, col) => {
    const h = hand(kind, near);
    const sh = near ? shoulder : [shoulder[0] - 1.5, shoulder[1] - 0.5];
    const pick = kind === 'reach' ? (p) => p[1] : kind === 'hug' ? (p) => p[1] - p[0] : (p) => -p[0];
    const el = joint(sh, h, 16.5, 16.5, pick);
    limb(col, 7, [sh, el, h]);
    return { h, el, sh };
  };
  const handOval = (h, col, reach) => {
    oval(col, h[0] + (reach ? 3 : 0), h[1] + 1, reach ? 5.5 : 4.5, reach ? 4.5 : 5);
    if (reach) for (let i = 0; i < 2; i++) line(s.shade, 1.1, [[h[0] + 2 + i * 4, h[1] + 1], [h[0] + 2 + i * 4, h[1] + 5]]);
  };
  const carry = (h, swingA) => {
    c.save(); c.translate(h[0], h[1]);
    if (O.carry === 'mug') {
      box('#f6efe2', -6, -10, 12, 13, 2); box('#e8708f', -6, -5, 12, 3, 0, 0);
      oval('#6b4529', 0, -10, 5.6, 1.6, 0.8);
    } else if (O.carry === 'handbag') {
      c.rotate(swingA);
      line(O.bag || '#e8708f', 1.6, [[-4, 9], [-2, 0], [2, 0], [4, 9]]);
      path(O.bag || '#e8708f', (p) => { p.moveTo(-8, 8); p.lineTo(8, 8); p.lineTo(9.5, 19); p.quadraticCurveTo(0, 21, -9.5, 19); p.closePath(); });
      poly(softColour('#00000022'), [[-8, 8], [8, 8], [7.5, 12.5], [-7.5, 12.5]], 0.6);
      oval('#f6df4a', 0, 12.5, 1.6, 1.6, 0.5);
    } else if (O.carry === 'case') {
      c.rotate(swingA);
      line('#715044', 2, [[-4, 3], [-4, -1], [4, -1], [4, 3]]);
      box('#a86a42', -10, 3, 20, 17, 3); line('#e3ad70', 1.5, [[-6, 7], [6, 7]]);
    }
    c.restore();
  };

  // ---- far side: the arm out
  const farSleeve = jacket ? dark : (O.dark || O.blouse);
  const far = arm('reach', false, farSleeve);
  handOval(far.h, s.shade, true);

  // ---- legs, then the pencil skirt over the thighs
  leg(drag, false);
  leg(lead, true);
  {
    const kx = knees.map((k) => k[0] - hip[0]);
    const front = Math.max(10, Math.min(15, Math.max(...kx) + 5)), back = Math.min(-11, Math.max(-16, Math.min(...kx) - 5));
    const W0 = T(-14.5, -4), W1 = T(14, -4);
    const hemY = hip[1] + 20;
    const skirt = O.skirt || dark;
    path(skirt, (p) => {
      p.moveTo(W0[0], W0[1]);
      p.quadraticCurveTo(hip[0] - 17, hip[1] + 6, hip[0] + back, hemY);
      p.lineTo(hip[0] + front, hemY - 0.5);
      p.quadraticCurveTo(hip[0] + 16.5, hip[1] + 4, W1[0], W1[1]);
      p.closePath();
    });
    // the kick pleat at the back
    line(s.shade, 0.9, [[hip[0] + back + 2.5, hemY - 6], [hip[0] + back + 1.5, hemY]]);
  }

  // ---- the torso, side on, in its own frame
  c.save(); c.translate(hip[0], hip[1]); c.rotate(tilt);
  if (O.carry === 'shoulderbag') line(O.bag || '#a86a42', 1.6, [[6, -39], [-14, 0]]);   // the strap, round the back
  path(top, (p) => {
    p.moveTo(-13, -35);
    p.bezierCurveTo(-17, -24, -12, -14, -14.5, jacket ? 3 : -2);
    p.quadraticCurveTo(0, jacket ? 6 : 1, 14.5, jacket ? 2 : -2);
    p.bezierCurveTo(12.5, -9, 19.5, -18, 15.5, -33);
    p.quadraticCurveTo(7, -42, -3, -41.5);
    p.quadraticCurveTo(-10, -41, -13, -35);
    p.closePath();
  });
  if (jacket) {
    // the back panel in shade, the blouse showing at the open front, the lapel
    poly(dark, [[-12.5, -34], [-7, -38.5], [-8.5, -14], [-8.5, 3.5], [-14, 3.5], [-15.5, -12], [-15.6, -27]], 0);
    poly(O.blouse || '#fff0cb', [[6.5, -40.5], [15.3, -33], [15.5, -20]], 0);
    poly(dark, [[4.5, -40.5], [11, -31.5], [11.5, -19], [5.5, -30]], 0.8);
    for (let i = 0; i < 2; i++) oval('#f5dda0', 15.8, -13 + i * 6, 1.2, 1.2, 0);
  } else {
    // the blouse tucked in: a soft fold at the waist, the placket buttons
    line(O.dark || s.shade, 0.9, [[-10, -6], [-2, -4], [8, -6]]);
    for (let i = 0; i < 3; i++) oval('#ffffff', 15.2 - i * 0.2, -28 + i * 7, 0.9, 0.9, 0);
  }
  box('#fff2d5', 0.5, -26, 6, 7, 1, 0.8); box('#e49a60', 1.8, -24.2, 3.4, 2.2, 0, 0);   // her badge
  if (O.beads) for (let i = 0; i < 6; i++) oval('#fbf6ea', 9 + i * 1.1, -39 + i * 1.5, 1.1, 1.1, 0.4);
  c.restore();
  // the pussy bow at the collar, loops and tails hanging plumb
  if (O.bow) {
    const collar = T(14.5, -36);
    c.save(); c.translate(collar[0], collar[1]); c.rotate(0.06 * Math.sin(u * TAU - 1));
    poly(O.bow, [[-0.5, 0], [1.5, 0.5], [2.5, 9], [0.5, 8]], 0.8);
    poly(O.bow, [[-0.5, 0], [-2, 1], [-3, 10], [-1, 9]], 0.8);
    oval(O.bow, -2.5, -0.5, 3.3, 2, 0.8);
    oval(O.bow, 2.2, -0.2, 3, 2, 0.8);
    oval(O.bow, 0, 0, 1.5, 1.6, 0.8);
    c.restore();
  }

  // ---- neck and head
  const neckBase = T(3, NECK);
  const neck = [neckBase[0] + G.jut, neckBase[1] - 2 + 0.4 * land];
  limb(s.shade, 7, [neckBase, neck]);
  const loll = G.loll + 0.06 * Math.sin((u - 0.2) * TAU);
  drawWomanHead(c, t, s, neck, loll, O, cand.hair, u, land, P);

  // ---- near side
  const nearKind = cand.near;
  const sleeve = jacket || O.blouse;
  if (nearKind === 'hug') {
    // the stack held against her chest, the forearm over it
    const h0 = hand('hug', true);
    c.save(); c.translate(h0[0] - 3, h0[1] + 2); c.rotate(-0.12 + tilt);
    if (O.carry === 'clipboard') {
      box('#a86a42', -4.5, -22, 8, 28, 1.2);
      box('#fbf6ea', -3, -19, 5, 23, 0.5, 0.5);
      box('#c9c4ba', -5.5, -23.5, 10, 3.5, 1, 0.6);
    } else {
      const F = ['#f6df4a', '#7d95f2', '#f18765', '#efe6d6'];
      F.forEach((col, i) => box(col, -7 + i * 3.2, -20 + (i % 2) * 1.5, 4.2, 24, 0.6, 0.6));
    }
    c.restore();
  }
  const near = arm(nearKind, true, sleeve);
  if (nearKind === 'case' && O.carry !== 'shoulderbag') carry(near.h, 0.12 * Math.sin(u * TAU));
  handOval(near.h, s.skin, false);
  // the shoulder pad: the sleeve's top squared off over the joint
  if (jacket || O.puff !== false) {
    c.save(); c.translate(shoulder[0], shoulder[1]); c.rotate(tilt);
    box(sleeve, -5.5, -6.5, 12, 8, jacket ? 3 : 4);
    c.restore();
  }
  if (O.carry === 'shoulderbag') {
    // the bag on her near hip, on the strap over the near shoulder
    const b = T(-6, -2), sw = 0.08 * Math.sin(u * TAU + 0.4);
    line(O.bag || '#a86a42', 1.6, [[shoulder[0] + 2, shoulder[1] - 5], [b[0] + 3, b[1] - 4]]);
    c.save(); c.translate(b[0], b[1]); c.rotate(sw);
    path(O.bag || '#a86a42', (p) => { p.moveTo(-6, -5); p.lineTo(8, -5); p.quadraticCurveTo(10, 6, 7, 8); p.lineTo(-5, 8); p.quadraticCurveTo(-8, 4, -6, -5); p.closePath(); });
    path(O.bag || '#a86a42', (p) => { p.moveTo(-6, -5); p.lineTo(8, -5); p.lineTo(7.5, 1); p.quadraticCurveTo(1, 3, -6.5, 1); p.closePath(); }, s.edge * 0.8);
    oval('#f6df4a', 1, 1.5, 1.2, 1.2, 0.4);
    c.restore();
  }
}

// ---------------------------------------------------------------- her head
// the queue clerk's head (profileZombie.js drawProfileHead) as drawn, with her hair, lashes,
// lipstick and earrings: in the crypt's head units, scaled as ZOMBIE_SHAPE scales the head
function drawCurls(c, s, P, col, circles) {
  // a cloud: every circle's outline first, then every fill over it, so only the outside edge is inked
  c.beginPath();
  for (const [x, y, r] of circles) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
  c.strokeStyle = P.M(s.ink); c.lineWidth = s.edge * 2; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = P.M(col); c.fill();
}
function drawWomanHead(c, t, s, neck, loll, O, hair, u, land, P) {
  const { path, oval, box, line } = P;
  const hc = O.hair || '#6b4529';
  const hdk = O.hairDk || 'rgba(20,10,30,0.22)';
  c.save(); c.translate(neck[0], neck[1]); c.rotate(loll); c.scale(ZOMBIE_SHAPE.head, ZOMBIE_SHAPE.head);
  const sway = Math.sin(u * TAU - 0.9), bounce = land;

  // ---- hair behind the head
  if (hair === 'long') {
    path(hc, (p) => {
      p.moveTo(8, -47);
      p.quadraticCurveTo(-14, -53, -22, -34);
      p.quadraticCurveTo(-26, -8, -24 + sway, 20 + bounce);
      p.lineTo(-19 + sway, 23 + bounce);
      p.lineTo(-15 + sway, 20 + bounce);
      p.lineTo(-11 + sway * 0.8, 22 + bounce);
      p.quadraticCurveTo(-8, 4, -7, -10);
      p.closePath();
    });
    for (let i = 0; i < 2; i++) line(hdk, 1.1, [[-18 + i * 5, -20], [-19 + i * 5 + sway, 14 + bounce]]);
  }
  if (hair === 'pony') {
    // the tail: a chain of lozenges hanging from the scrunchie, down her back, tapering, bobbing
    const root = [-21, -41];
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      // out round the back of the skull, then plumb down the back of the neck, the tip swinging
      pts.push([root[0] - 6 * Math.sin(Math.PI * Math.min(1, k * 1.4)) + 3 * k + sway * 2.4 * k * k, root[1] + 40 * k + bounce * 2.5 * k]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const w = 8.5 * (1 - i / 9) + 1.2;
      c.save(); c.translate((ax + bx) / 2, (ay + by) / 2); c.rotate(Math.atan2(by - ay, bx - ax));
      path(hc, (p) => p.ellipse(0, 0, Math.hypot(bx - ax, by - ay) * 0.75, w / 2, 0, 0, TAU));
      c.restore();
    }
    const tip = pts[pts.length - 1];
    line(hc, 1.4, [[tip[0], tip[1]], [tip[0] - 1.5, tip[1] + 3]]);
    line(hc, 1.2, [[tip[0], tip[1]], [tip[0] + 1.5, tip[1] + 3.5]]);
  }
  if (hair === 'perm') {
    const b = bounce * 0.8;
    drawCurls(c, s, P, hc, [[-12, -41, 12], [1, -46, 11], [12, -45, 7.5], [-21, -30, 11.5], [-23, -16, 10.5 ], [-18, -5 + b, 9], [-27, -4 + b, 7], [-9, -33, 10]]);
  }
  if (hair === 'swept') {
    // big hair swept up and back off the face: a rolled crest over the crown and a fall to the nape
    path(hc, (p) => {
      p.moveTo(19, -44);
      p.quadraticCurveTo(16, -60, -2, -60);
      p.quadraticCurveTo(-26, -58, -28, -34);
      p.quadraticCurveTo(-29, -16, -21, -8);
      p.quadraticCurveTo(-14, -6, -11, -12);
      p.quadraticCurveTo(-16, -24, -10, -36);
      p.closePath();
    });
  }

  // ---- the head (the clerk's)
  path(s.skin, (p) => {
    p.moveTo(-4, 0);
    p.bezierCurveTo(-20, -6, -23, -33, -9, -42);
    p.bezierCurveTo(3, -50, 20, -46, 21.5, -34);
    p.lineTo(22, -28);
    p.lineTo(26.5, -21.5);                     // her nose, a touch smaller
    p.lineTo(22.5, -18.5);
    p.quadraticCurveTo(22, -12, 23, -8);
    p.lineTo(20, -2);
    p.quadraticCurveTo(10, 3, -4, 0);
    p.closePath();
  });
  oval(s.shade, -5, -21, 4.5, 6.5);
  oval(s.shade, 7, -9, 8, 5, 0);
  const blinkPhase = ((t + 0.31) % 4.1 + 4.1) % 4.1, blink = Math.max(0, 1 - Math.abs(blinkPhase - 3.88) / 0.11);
  const eyeY = -26, open = 1 - 0.92 * blink;
  oval('#fff4ce', 15, eyeY, 5, 7.5 * open, 0.8);
  oval('#c65458', 17.5, eyeY + 2, 1.4, 2 * open, 0);
  box(O.shadow || s.skin, 9, eyeY - 9, 13, 8.5, 1, 0);
  line(s.shade, 1.6, [[9.5, eyeY], [20, eyeY]]);
  // lashes off the heavy lid
  line(s.ink, 1.3, [[19, eyeY], [23, eyeY - 2.2]]);
  line(s.ink, 1.1, [[16.5, eyeY], [20, eyeY - 2.6]]);
  // the slack mouth, the blunt tooth, lipstick round it (a bit off the lip)
  const mh = 9 + Math.sin(t * 2) * 0.7;
  box('#654254', 15, -14, 9, mh, 3, 0);
  box('#fff1cd', 19, -14, 3.5, 3, 1, 0);
  if (O.lips) {
    line(O.lips, 2, [[15.5, -14.6], [23.8, -14.8]]);
    line(O.lips, 2, [[15.8, -14 + mh + 0.4], [23.2, -14 + mh + 0.2]]);
  }
  line('#6e9d52', 1.3, [[-2, -38], [9, -35]]);
  for (let i = 0; i < 3; i++) line('#f0ecae', 1, [[0 + i * 3.5, -39.5 + i], [0 + i * 3.5, -35.5 + i]]);
  // earrings under the lobe
  if (O.earrings === 'hoop') {
    c.beginPath(); c.arc(-4, -10, 3.4, 0, TAU);
    c.strokeStyle = P.M(s.ink); c.lineWidth = 2.6; c.stroke();
    c.strokeStyle = P.M('#f6df4a'); c.lineWidth = 1.4; c.stroke();
  } else if (O.earrings === 'stud') oval('#f6df4a', -4, -14, 1.8, 1.8, 0.6);
  else if (O.earrings === 'pearl') oval('#fbf6ea', -4, -13, 2.4, 2.4, 0.6);

  // ---- hair over the head
  if (hair === 'perm') {
    drawCurls(c, s, P, hc, [[-5, -44, 9], [6, -47, 7], [13, -43, 5], [-14, -37, 8]]);
    for (const [x, y] of [[-12, -42], [0, -46], [-20, -26], [-22, -12], [-9, -34]]) {
      c.beginPath(); c.arc(x, y, 3, 0.4, 2.6); c.strokeStyle = P.M(hdk); c.lineWidth = 1.1; c.stroke();
    }
  } else if (hair === 'bob') {
    path(hc, (p) => {
      p.moveTo(20.5, -36);
      p.lineTo(21.5, -43);
      p.quadraticCurveTo(9, -55, -8, -49);
      p.quadraticCurveTo(-24, -42, -22, -22);
      p.lineTo(-20, -7);
      p.quadraticCurveTo(-9, -5, 2, -8);
      p.lineTo(5, -28);
      p.quadraticCurveTo(10, -36, 20.5, -36);
      p.closePath();
    });
    line(hdk, 1.1, [[-4, -45], [-8, -12]]);
    line(hdk, 1.1, [[4, -44], [1, -12]]);
  } else if (hair === 'bun' || hair === 'pony' || hair === 'long') {
    path(hc, (p) => {
      p.moveTo(15, -41);
      p.lineTo(20, -45.5);
      p.quadraticCurveTo(6, -53, -8, -47.5);
      p.quadraticCurveTo(-22, -40, -20, -22);
      p.lineTo(-13, -26);
      p.lineTo(-11, -33);
      p.quadraticCurveTo(-2, -41, 8, -38);
      p.closePath();
    });
    line(hdk, 1, [[12, -44], [-12, -38]]);
    if (hair === 'bun') {
      line('#f6df4a', 2.4, [[-30, -54], [-10, -38]]);
      line('#e8708f', 2.4, [[-30, -54], [-28.5, -52.8]]);
      oval(hc, -20, -44, 8.5, 7.5);
      c.beginPath(); c.arc(-20, -44, 4.5, 0.5, 3.6); c.strokeStyle = P.M(hdk); c.lineWidth = 1.1; c.stroke();
      line('#f6df4a', 2.4, [[-17, -41.5], [-10, -38]]);
      line('#5a4632', 1.6, [[-10, -38], [-8.6, -37]]);
    }
    if (hair === 'pony') oval(O.scrunchie || '#ff6fae', -20, -41, 4.5, 5.5);
  } else if (hair === 'beehive') {
    // the hive: a tall dome rising off the crown, back-combed, a band of shade round its waist,
    // smoothed down over the ear to a neat flick at the nape
    path(hc, (p) => {
      p.moveTo(20, -40);
      p.quadraticCurveTo(22, -50, 14, -54);
      p.bezierCurveTo(16, -80, -22, -86, -22, -58);
      p.quadraticCurveTo(-26, -44, -22, -24);
      p.quadraticCurveTo(-24, -12, -18, -8);
      p.quadraticCurveTo(-14, -14, -12, -24);
      p.lineTo(-11, -33);
      p.quadraticCurveTo(-2, -42, 8, -39);
      p.closePath();
    });
    c.beginPath(); c.ellipse(-3, -58, 16, 4, -0.05, 0.1, Math.PI - 0.1); c.strokeStyle = P.M(hdk); c.lineWidth = 1.2; c.stroke();
    for (const [x0, y0, x1, y1] of [[-14, -74, -18, -60], [-4, -78, -8, -62], [6, -74, 4, -60]]) line(hdk, 1, [[x0, y0], [x1, y1]]);
    line(hdk, 1.1, [[-20, -40], [-19, -16]]);
  } else if (hair === 'swept') {
    // swept up off the forehead and back in one wave
    path(hc, (p) => {
      p.moveTo(14, -40);
      p.quadraticCurveTo(22, -46, 20, -52);
      p.quadraticCurveTo(8, -60, -8, -55);
      p.quadraticCurveTo(-3, -46, -12, -36);
      p.quadraticCurveTo(-4, -44, 6, -41);
      p.closePath();
    });
    line(hdk, 1.1, [[16, -49], [2, -55], [-12, -50]]);
    line(hdk, 1.1, [[-14, -46], [-22, -32], [-20, -16]]);
  }
  if (O.glasses === 'cat') {
    // cat-eye frames, side on: the upswept corner at the temple
    path('rgba(255,255,255,.1)', (p) => { p.moveTo(9, -32); p.lineTo(23, -33); p.lineTo(22, -22); p.quadraticCurveTo(15, -19, 10, -24); p.closePath(); }, 1.6);
    line(s.ink, 1.8, [[9, -32], [6, -36]]);
    line('#80555b', 1.8, [[9, -29], [-3, -26]]);
  } else if (O.glasses) {
    // the big 80s frames, side on
    box('rgba(255,255,255,.1)', 9, -34, 15, 15, 4, 1.6);
    line('#80555b', 1.8, [[9, -29], [-3, -26]]);
  }
  c.restore();
}

// ---------------------------------------------------------------- the office's look on top
// profileZombie.js drawProfileZombie's treatment, step for step (ink, lit rim, shade band, SOFT)
const LWM = 0.5;
const BOX = { x0: -62, x1: 70, y0: -165, y1: 10 };
const CARDS = new Map();
function card(key, W, H) {
  let cv = CARDS.get(key);
  if (!cv || cv.width !== W || cv.height !== H) { if (CARDS.size > 12) CARDS.clear(); cv = canvas(W, H); CARDS.set(key, cv); }
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  return [cv, g];
}
function rim(src, W, H, key, dx, color) {
  const [r, c] = card(key, W, H);
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out'; c.drawImage(src, dx, 0);
  c.globalCompositeOperation = 'source-over';
  return r;
}
// the queue's figure height (index.js EXIT_ZOMBIE_H) — she stands a shade shorter than the men
const QUEUE_H = 58, HER_H = 56;
export function girlStride(h = HER_H) {
  return GAIT.D * (h / zombieHeightOf('clerk', ZOMBIE_SHAPE)) * (ZOMBIE_SHAPE.slim ?? 1);
}
export function drawGirlZombie(g, t, id, { outfit = null, h = HER_H, phase = null, ink = PAL.open.inkM } = {}) {
  const cand = GIRL_BY_ID[id];
  const sc = h / zombieHeightOf('clerk', ZOMBIE_SHAPE);
  const base = CRYPT_ART_STYLES[0];
  const style = { ...base, ink, edge: LWM / sc, map: softColour, skin: softColour(base.skin), shade: softColour(base.shade) };
  const u = (((phase ?? t * 0.8) % 1) + 1) % 1;
  const O = outfit || cand.outfits[0][1];
  const m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1;
  const W = Math.ceil((BOX.x1 - BOX.x0) * sc * k) + 2, H = Math.ceil((BOX.y1 - BOX.y0) * sc * k) + 2;
  const [cv, c] = card('fig', W, H);
  c.setTransform(k, 0, 0, k, -BOX.x0 * sc * k, -BOX.y0 * sc * k);
  c.scale(sc * (ZOMBIE_SHAPE.slim ?? 1), sc);
  drawProfileWoman(c, t, style, cand, u, O);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const per = h / 51;
  const lit = rim(cv, W, H, 'lit', 0.75 * per * k, softColour('rgba(255,251,242,0.2)'));
  c.globalCompositeOperation = 'source-atop';
  c.drawImage(lit, 0, 0);
  const dark = rim(cv, W, H, 'dark', -2.4 * per * k, softColour('rgba(24,18,36,0.14)'));
  c.drawImage(dark, 0, 0);
  c.globalCompositeOperation = 'source-over';
  g.drawImage(cv, BOX.x0 * sc, BOX.y0 * sc, W / k, H / k);
}

