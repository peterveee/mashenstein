// CORPORATE KOMBAT — inside an open lift car. Shipped 14 Oct 2026 from the lab's
// office-lift bake-off (src/dev/office-lift-candidates.js).
//
// Every open car has, on its back wall, an EGGCORP poster (the cracked-egg mark over a picture
// drawn for the floor and its hour: "yes i like the posters, mix them up") and a call panel of
// floor buttons on its side wall ("buttons should be seen in every open lift"). The lobby's
// lift bank also carries a Martian from the Gravity Grid riding up, jabbing a button three times
// with his jaw going ACK-ACK-ACK — but only once the player has been to Gravity Grid level 3,
// where the Martians arrive, since without it he makes no sense (always on in a dev build). His
// car has no poster.
//
// Painters take the car's rect in wall units (36 x 82, inside foregroundLift's bank scale) and
// the frame: {floor, t}. The car's back wall is the panel 5 in from each side, above the floor
// line 6 up. A metre is about 25 wall units here: the bank is drawn 1.2 x 1.18 over the room,
// which is why the lifts look huge and why nothing in them is sized off the lift.
import { box, poly, line, lines, circ, ell, letters, pen, fs, eggPath, M89 } from './line.js';

const INK = '#1f1d26';
const FOOT = 3.4;               // the car's floor line, up from its bottom edge
const PER_M = 24.7;             // wall units to the metre in the car

// ------------------------------------------------------------------ the posters
// The poster's slot, centred on the back wall above head height, drawn on its 18 x 24 design
// and grown by BIG about its top centre.
const slot = (car, w = 18, h = 24) => ({ x: car.x + car.w / 2 - w / 2, y: car.y + 11, w, h });
const BIG = 1.3;
const egg = (g, cx, cy, rx, ry, fill = '#ffffff', lw = 0.4, ink = INK) => {
  g.beginPath(); eggPath(g, cx, cy, rx, ry); fs(g, fill, ink, lw);
};
// The EGGCORP mark: the egg with its zigzag crack, the word under it.
function logo(g, cx, cy, { ink = INK, egg: eggFill = '#ffffff', crack = M89.pink, word = INK, size = 1 } = {}) {
  const rx = 2.3 * size, ry = 3 * size;
  egg(g, cx, cy - 1.4 * size, rx, ry, eggFill, 0.4, ink);
  const y = cy - 1.2 * size;
  poly(g, [cx - rx * 0.7, y, cx - rx * 0.35, y - 0.9 * size, cx, y + 0.3 * size, cx + rx * 0.35, y - 0.9 * size, cx + rx * 0.7, y], null, crack, 0.45 * size, false);
  letters(g, 'EGGCORP', cx, cy + 3.6 * size, 2.2 * size, { ink: word, lw: 0.42 * size, align: 'center', track: 0.25, slant: 0.16 });
}
// The sheet: a ground, the floor's picture clipped to it, the mark over the picture.
function eggcorpPoster(g, car, o, art, mark) {
  const s = slot(car), cx = s.x + s.w / 2;
  box(g, s.x + 0.8, s.y + 1, s.w, s.h, 'rgba(0,0,0,0.12)');
  g.save(); g.beginPath(); g.rect(s.x, s.y, s.w, s.h); g.clip();
  art(g, s, cx, o.floor, o.t);
  g.restore();
  logo(g, cx, s.y + s.h - 6.4, mark(o.floor));
  box(g, s.x, s.y, s.w, s.h, null, INK, 0.45);
}

// A — the city at the floor's hour: sunrise, noon, dusk.
const SKY = {
  lobby: { sky: ['#ffd6a8', '#ffb3c8'], sun: '#fff1a6', towers: '#e58aa8', near: '#b5617f' },
  open: { sky: ['#bfe7ff', '#e3f5ff'], sun: '#ffffff', towers: '#7fa8d8', near: '#4f78b0' },
  exec: { sky: ['#3a2a5c', '#e0603a'], sun: '#f6b84a', towers: '#2a2244', near: '#1a1530' },
};
const skyline = (g, s, cx, floor) => {
  const K = SKY[floor];
  box(g, s.x, s.y, s.w, s.h * 0.55, K.sky[0]);
  box(g, s.x, s.y + s.h * 0.55, s.w, s.h * 0.45, K.sky[1]);
  circ(g, cx + (floor === 'open' ? 3 : -2), s.y + (floor === 'open' ? 5 : s.h * 0.55), 3.6, K.sun);
  const base = s.y + s.h;
  [[0, 9, 3.4], [3, 13, 3], [6.4, 7, 3.8], [10.4, 15, 2.8], [13.4, 10, 4.6]].forEach(([dx, h, w]) => box(g, s.x + dx, base - h, w, h, K.towers));
  // the EGGCORP tower in front, its top lit
  box(g, cx - 2.2, base - 17, 4.4, 17, K.near);
  poly(g, [cx - 2.2, base - 17, cx, base - 19.4, cx + 2.2, base - 17], K.near);
  for (let k = 0; k < 6; k++) box(g, cx - 1.4, base - 15.6 + k * 2.2, 2.8, 0.7, floor === 'exec' ? '#f6b84a' : 'rgba(255,255,255,0.55)');
};
const SKY_MARK = { lobby: { word: INK }, open: { word: INK, crack: M89.cobalt }, exec: { word: '#f6df4a', ink: INK, crack: '#f6b84a' } };

// B — the floor's own pattern: the lobby's Memphis pink and teal, 23's lemon grid and
// cobalt, 88's black lacquer and gold.
const memphis = (g, s, cx, floor, t) => {
  if (floor === 'lobby') {
    box(g, s.x, s.y, s.w, s.h, '#ffe9f3');
    circ(g, s.x + 4, s.y + 5, 3.4, M89.pink);
    poly(g, [s.x + s.w - 1, s.y + 2, s.x + s.w - 1, s.y + 9, s.x + s.w - 7, s.y + 9], M89.teal);
    for (let k = 0; k < 3; k++) {
      g.beginPath(); g.moveTo(s.x + 2, s.y + 12 + k * 1.8);
      for (let i = 1; i <= 8; i++) g.lineTo(s.x + 2 + i * 1.8, s.y + 12 + k * 1.8 + (i % 2 ? -0.8 : 0));
      pen(g, INK, 0.3); g.stroke();
    }
  } else if (floor === 'open') {
    box(g, s.x, s.y, s.w, s.h, M89.lemon);
    for (let x = s.x + 2; x < s.x + s.w; x += 2.4) line(g, x, s.y, x, s.y + s.h, 'rgba(31,29,38,0.18)', 0.25);
    for (let y = s.y + 2; y < s.y + s.h; y += 2.4) line(g, s.x, y, s.x + s.w, y, 'rgba(31,29,38,0.18)', 0.25);
    box(g, s.x + 2, s.y + 2.4, 6, 6, M89.cobalt);
    circ(g, s.x + s.w - 4.4, s.y + 9, 3, M89.pink);
  } else {
    box(g, s.x, s.y, s.w, s.h, '#1f1d26');
    for (let k = -4; k < 8; k++) line(g, s.x + k * 3, s.y + s.h, s.x + k * 3 + s.h, s.y, 'rgba(246,184,74,0.35)', 0.35);
    g.beginPath(); g.arc(cx, s.y + 7.4, 4.6, 0, Math.PI * 2); pen(g, '#f6b84a', 0.6); g.stroke();
  }
};
const MEMPHIS_MARK = { lobby: { word: INK }, open: { word: INK, crack: M89.cobalt }, exec: { word: '#f6df4a', egg: '#fff4a6', crack: '#d1ae1c' } };

// C — what each floor is about: arrivals, the numbers, the money.
const business = (g, s, cx, floor, t) => {
  if (floor === 'lobby') {
    // the morning: GOOD MORNING over a slowly turning sunburst
    box(g, s.x, s.y, s.w, s.h, M89.teal);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + t * 0.15;
      poly(g, [cx, s.y + 8, cx + Math.cos(a) * 16, s.y + 8 + Math.sin(a) * 16, cx + Math.cos(a + 0.22) * 16, s.y + 8 + Math.sin(a + 0.22) * 16], 'rgba(255,255,255,0.22)');
    }
    letters(g, 'GOOD MORNING', cx, s.y + 3.2, 1.5, { ink: '#ffffff', lw: 0.3, align: 'center', track: 0.25 });
  } else if (floor === 'open') {
    // the bar chart, every bar higher than the last, the arrow out of the top
    box(g, s.x, s.y, s.w, s.h, '#ffffff');
    [4, 6, 8, 11].forEach((h, k) => box(g, s.x + 2.4 + k * 3.6, s.y + 14 - h, 2.6, h, [M89.cobalt, M89.teal, M89.pink, M89.lemon][k], INK, 0.3));
    poly(g, [s.x + 2, s.y + 11, s.x + 7, s.y + 8, s.x + 10, s.y + 9, s.x + 15.4, s.y + 2.4], null, M89.red, 0.6, false);
    poly(g, [s.x + 15.8, s.y + 1.6, s.x + 13.4, s.y + 2.2, s.x + 15.2, s.y + 4], M89.red);
  } else {
    // a pile of gold eggs on velvet
    box(g, s.x, s.y, s.w, s.h, '#7a1f2b');
    for (const [dx, dy] of [[-4, 11], [0, 11.4], [4, 11], [-2, 8.4], [2, 8.4], [0, 5.6]]) egg(g, cx + dx, s.y + dy, 1.8, 2.3, '#f6c24a', 0.35);
    for (const [dx, dy] of [[-4.5, 10.2], [-0.5, 10.6], [3.5, 10.2], [-2.5, 7.6], [1.5, 7.6], [-0.5, 4.8]]) circ(g, cx + dx, s.y + dy, 0.4, '#fff4a6');
  }
};
const BUSINESS_MARK = { lobby: { word: '#ffffff' }, open: { word: INK, crack: M89.cobalt }, exec: { word: '#f6df4a', crack: '#d1ae1c' } };

// D — the egg, big, in the floor's colour; the mark is just the word.
const bigEgg = (g, s, cx, floor) => {
  const K = { lobby: ['#ff9cc4', '#ffffff'], open: [M89.cobalt, M89.lemon], exec: ['#1f1d26', '#f6c24a'] }[floor];
  box(g, s.x, s.y, s.w, s.h, K[0]);
  egg(g, cx, s.y + 8.6, 6, 7.6, K[1], 0.5);
  box(g, cx + 2, s.y + 1, 4, 15, 'rgba(31,29,38,0.08)');
  // the crack across the big egg is the mark's
  poly(g, [cx - 4.6, s.y + 8.4, cx - 2.4, s.y + 6.6, cx - 0.4, s.y + 9, cx + 1.8, s.y + 6.6, cx + 4.6, s.y + 8.4], null, CRACK[floor], 0.7, false);
};
const CRACK = { lobby: M89.teal, open: M89.pink, exec: '#7a1f2b' };
const NOEGG = { egg: 'transparent', ink: 'transparent', crack: 'transparent' };
const BIGEGG_MARK = { lobby: { ...NOEGG, word: INK }, open: { ...NOEGG, word: '#ffffff' }, exec: { ...NOEGG, word: '#f6df4a' } };

// E — the tower itself, this floor lit and marked YOU ARE HERE.
const tower = (g, s, mid, floor) => {
  // the tower stands left of centre, leaving room for its YOU ARE HERE
  const cx = mid - 2.6;
  const bg = { lobby: '#ffe0c8', open: '#d6eefc', exec: '#3a2a5c' }[floor];
  box(g, s.x, s.y, s.w, s.h, bg);
  // the tower stands on a ground line above the mark
  const top = s.y + 1.4, bot = s.y + s.h - 11.4, w = 6;
  line(g, s.x, bot, s.x + s.w, bot, INK, 0.35);
  box(g, cx - w / 2, top + 2, w, bot - top - 2, '#5a5868', INK, 0.35);
  poly(g, [cx - w / 2, top + 2, cx, top - 0.4, cx + w / 2, top + 2], '#5a5868', INK, 0.35);
  for (let k = 0; k < 5; k++) box(g, cx - w / 2 + 0.8, top + 3.4 + k * 2, w - 1.6, 0.8, 'rgba(255,255,255,0.3)');
  const ly = { lobby: bot - 1.6, open: top + 7.4, exec: top + 3.4 }[floor];
  box(g, cx - w / 2 + 0.8, ly, w - 1.6, 0.9, M89.lemon);
  line(g, cx + w / 2, ly + 0.45, cx + w / 2 + 2.4, ly + 0.45, M89.red, 0.35);
  letters(g, 'YOU', cx + w / 2 + 4.2, ly + 0.2, 1.1, { ink: floor === 'exec' ? '#ffffff' : INK, lw: 0.24, align: 'center' });
  letters(g, 'ARE HERE', cx + w / 2 + 4.2, ly + 1.6, 0.9, { ink: floor === 'exec' ? '#ffffff' : INK, lw: 0.2, align: 'center' });
};
const TOWER_MARK = { lobby: { word: INK }, open: { word: INK, crack: M89.cobalt }, exec: { word: '#ffffff', crack: '#f6b84a' } };


const POSTERS = {
  skyline: [skyline, SKY_MARK], memphis: [memphis, MEMPHIS_MARK], business: [business, BUSINESS_MARK],
  bigEgg: [bigEgg, BIGEGG_MARK], tower: [tower, TOWER_MARK],
};
export const LIFT_POSTER_NAMES = Object.keys(POSTERS);
export function paintLiftPoster(g, car, name, floor, t) {
  const [art, marks] = POSTERS[name];
  const cx = car.x + car.w / 2, top = car.y + 8;
  g.save();
  g.translate(cx, top); g.scale(BIG, BIG); g.translate(-cx, -top - 3);
  eggcorpPoster(g, car, { floor, t }, art, (f) => marks[f]);
  g.restore();
}
// Mixed up across the building, one per lift bank, no design twice on a floor. Keyed by the
// bank's place on its floor's itinerary (progression.js OFFICE_ITINERARIES): the lobby has one
// bank, 23 and 88 two.
const BANK_POSTER = { lobby: ['tower'], open: ['business', 'skyline'], exec: ['memphis', 'bigEgg'] };
export function liftPosterFor(floor, bank) {
  const list = BANK_POSTER[floor] || LIFT_POSTER_NAMES;
  return list[bank % list.length];
}

// ------------------------------------------------------------------ the call panel
// A brushed plate on the car's right-hand SIDE wall (Peter, 14 Oct: "can we put buttons on the
// side walls?"), from 0.9 m to 1.6 m up: a little floor display and two columns of round
// buttons, this floor's lit, all foreshortened into the wall's perspective. The side wall runs
// from the back wall's edge (u 0, 5 in from the car's side) to the doorway (u 1); its floor
// line drops 6 and everything on it grows by a sixth on the way out.
const PANEL_FLOORS = { lobby: 'G', open: '23', exec: '88' };
// A big building: two columns of twelve, 88 at the top to the basement (Peter, 14 Oct: "we need
// more buttons anyway, it's a big building"), running from 1.65 m down to 0.55 m so the lower
// floors sit at a short passenger's shoulder.
const PANEL_LABELS = ['88', '87', '86', '85', '80', '75', '70', '65', '60', '55', '50', '45',
  '40', '35', '30', '25', '23', '20', '15', '10', '5', '3', 'G', 'B'];
const sideAt = (car, u, up) => {
  const k = 1 + 0.16 * u;
  return [car.x + car.w - 5 + 5 * u, car.y + car.h - 6 + 6 * u - up * k];
};
const U0 = 0.22, U1 = 0.78, LO = 0.55 * PER_M, HI = 1.65 * PER_M, ROW = 1.95;
export function liftPanel(car, floor) {
  const buttons = PANEL_LABELS.map((label, i) => {
    const u = i % 2 ? 0.63 : 0.37, up = HI - 4 - Math.floor(i / 2) * ROW;
    const [x, y] = sideAt(car, u, up);
    return { label, x, y, u };
  });
  return { buttons, here: PANEL_FLOORS[floor] };
}
export function paintLiftPanel(g, car, floor, pressed = null, lit = false) {
  const p = liftPanel(car, floor), dark = floor === 'exec';
  const quad = (u0, u1, lo, hi) => [...sideAt(car, u0, hi), ...sideAt(car, u1, hi), ...sideAt(car, u1, lo), ...sideAt(car, u0, lo)];
  poly(g, quad(U0, U1, LO, HI), dark ? '#d1bc78' : '#d6dbe3', INK, 0.3);
  // the little floor display
  poly(g, quad(U0 + 0.1, U1 - 0.1, HI - 2.8, HI - 0.8), '#18161e');
  const [dx, dy] = sideAt(car, 0.5, HI - 2.5);
  g.save(); g.translate(dx, dy); g.scale(0.55, 1);
  letters(g, p.here, 0, 0, 1.4, { ink: '#ff3b5a', lw: 0.3, align: 'center' });
  g.restore();
  for (const b of p.buttons) {
    const on = b.label === p.here || (lit && b === pressed);
    ell(g, b.x, b.y, 0.45 + 0.07 * b.u, 0.68 + 0.1 * b.u, on ? '#ffcf4a' : '#f6ecd0', INK, 0.2);
  }
  return p;
}

// ------------------------------------------------------------------ the Martian
// The suited Martian of Gravity Grid level 3, redrawn in the office's LIGNE '89 hand: ink round
// every part, flat crimson and gold, one lit sliver and one shade band; the bubble helmet is a
// tinted bell with an ink rim so it holds against the lit car. About 33 tall at s 1, feet at
// (x, y), facing right.
const CRIMSON = ['#ff6a5c', '#e0203a', '#a3162c', '#5e0e18'];
const GOLDS = ['#fff4a6', '#f6df4a', '#d1ae1c'];
const STEEL = ['#f2f4f8', '#c9ced8', '#8e95a4'];
const SKULL = ['#d4f5a8', '#9be06a', '#5fa83a'];
const BRAIN = ['#ffd0e4', '#ff9cc4', '#d8458a'];
// A limb as the office draws one: an ink stroke with the colour laid down its middle.
function limb(g, pts, w, fill, L) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  pen(g, INK, w + L * 2); g.stroke();
  pen(g, fill, w); g.stroke();
}
// `arm`: 'gun' (the ray gun held low) or 'press' (gun holstered, jabbing the car's button
// panel; `jabs` a press per cycle). `ack`: the jaw chattering ACK-ACK-ACK in bursts, as on the
// Gravity Grid (Peter, 14 Oct: "i would love the ack ack movement in the mouth").
// One go of the press, 2.6 s: the arm comes up to the panel (`up` 0 to 1), the finger jabs
// `jabs` times (`j`, 0 at the hover a little short of the button, 1 on it), the arm goes back
// down, and he waits.
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function pressOf(t, jabs) {
  const ph = ((t % 2.6) + 2.6) % 2.6 / 2.6;
  const up = smooth(ph / 0.14) * (1 - smooth((ph - 0.66) / 0.14));
  const k = (ph - 0.16) / 0.46;
  const j = k > 0 && k < 1 ? Math.pow(Math.sin(k * Math.PI * jabs), 2) : 0;
  return { up, j, lit: ph > 0.2 };
}
// The elbow for a shoulder at (sx, sy), a hand at (hx, hy) and two bones of `a`: bent down and
// back, the way an arm reaches forward; straight when the hand is at full stretch.
function elbowOf(sx, sy, hx, hy, a) {
  const dx = hx - sx, dy = hy - sy, d = Math.min(Math.hypot(dx, dy), a * 2 - 0.01);
  const along = d / 2, off = Math.sqrt(Math.max(0, a * a - along * along));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  // the perpendicular that points down (positive y)
  const px = -uy, py = ux, flip = py < 0 ? -1 : 1;
  return [sx + ux * along + px * off * flip, sy + uy * along + py * off * flip];
}
export function ackOf(t) {
  const a = ((t % 2.2) + 2.2) % 2.2;
  return a < 0.95 ? Math.abs(Math.sin(a / 0.95 * Math.PI * 3)) : 0;
}
export function ligneMartian(g, x, y, s, t, { wave = false, glass = 'clear', face = 1, arm = 'gun', jabs = 1, ack = false, target = { x: 7, y: -19.6 } } = {}) {
  const L = 0.5 / s, Lf = 0.3 / s;
  g.save(); g.translate(x, y); g.scale(s * face, s);
  // boots and legs
  limb(g, [-1.3, -8.4, -1.4, -1.8], 1.5, CRIMSON[2], L);
  limb(g, [1.3, -8.4, 1.4, -1.8], 1.5, CRIMSON[1], L);
  box(g, -1.9, -5.4, 1.2, 0.8, GOLDS[2], INK, Lf);
  box(g, 0.8, -5.4, 1.2, 0.8, GOLDS[1], INK, Lf);
  poly(g, [-2.4, -2.2, -0.5, -2.2, -0.3, 0, -3, 0], STEEL[2], INK, L);
  poly(g, [0.5, -2.2, 2.4, -2.2, 3.1, 0, 0.4, 0], STEEL[1], INK, L);
  // the far arm, behind the body
  if (wave) {
    const a = -Math.PI / 2 - 0.25 + Math.sin(t * 9) * 0.5, ex = -7.4, ey = -16.4;
    const hx = ex + Math.cos(a) * 3.6, hy = ey + Math.sin(a) * 3.6;
    limb(g, [-3.2, -14.8, ex, ey, hx, hy], 1.2, CRIMSON[2], L);
    circ(g, hx, hy, 0.85, STEEL[0], INK, Lf);
  } else {
    limb(g, [-3.4, -14.6, -4.5, -11.8, -3.9, -9.6], 1.2, CRIMSON[2], L);
    circ(g, -3.9, -9.3, 0.75, STEEL[0], INK, Lf);
  }
  // torso: tapered, lit sliver down the near edge, shade band down the far
  const torso = [-3.7, -15.4, 3.7, -15.4, 3.1, -13.2, 2.2, -8.2, -2.2, -8.2, -3.1, -13.2];
  g.save();
  poly(g, torso, CRIMSON[1]);
  g.clip();
  box(g, -4, -16, 1.5, 9, CRIMSON[0]);
  box(g, 1.7, -16, 3, 9, CRIMSON[2]);
  // the gold yoke, and the seam down to the belt
  poly(g, [-2.8, -15.4, 2.8, -15.4, 1.5, -12.8, 0, -12.2, -1.5, -12.8], GOLDS[1], INK, Lf);
  poly(g, [-2.8, -15.4, -0.9, -15.4, -1.5, -12.8], GOLDS[0]);
  line(g, 0, -12.2, 0, -9.4, CRIMSON[3], Lf);
  g.restore();
  poly(g, torso, null, INK, L);
  box(g, -2.4, -9.6, 4.8, 1.3, CRIMSON[3], INK, Lf);
  circ(g, 0, -8.95, 0.95, GOLDS[1], INK, Lf);
  if (arm === 'press') {
    // the ray gun on his hip; the panel is the car's (paintLiftPanel), `target` its button
    // in his own units
    const { up, j } = pressOf(t, jabs);
    box(g, 1.6, -9.2, 2.6, 1.1, STEEL[1], INK, Lf);
    circ(g, 4.3, -8.7, 0.4, '#7fe07f', INK, Lf * 0.7);
    // the near arm: hanging at his side, then up to hover short of the button and jab it, with
    // a real elbow between (two bones of 3.1 from the shoulder)
    const sx = 2.9, sy = -14.4, A = 3.1;
    const tx = target.x - 0.9, ty = target.y;
    const rx = 3.9, ry = -9.2, hoverX = tx - 1.3;
    const ax = hoverX + (tx - hoverX) * j, hx = rx + (ax - rx) * up, hy = ry + (ty - ry) * up;
    const [ex, ey] = elbowOf(sx, sy, hx, hy, A);
    limb(g, [sx, sy, ex, ey, hx, hy], 1.25, CRIMSON[1], L);
    // the pointing finger, then the glove
    limb(g, [hx, hy, hx + 0.9, hy - 0.1], 0.35, STEEL[0], Lf);
    circ(g, hx, hy, 0.8, STEEL[0], INK, Lf);
  } else {
  // the gun arm: lowered, the ray gun in a gloved hand
  g.save();
  g.translate(2.9, -14.4); g.rotate(1.2 + Math.sin(t * 1.3) * 0.05);
  limb(g, [0, 0, 4.2, 0], 1.25, CRIMSON[1], L);
  box(g, 3.9, -0.9, 3.6, 1.5, STEEL[1], INK, Lf);
  box(g, 3.9, 0.15, 3.6, 0.45, STEEL[2]);
  for (const rx of [4.6, 5.5, 6.4]) box(g, rx, -1.2, 0.35, 2.1, M89.red);
  circ(g, 7.8, -0.15, 0.7, '#7fe07f', INK, Lf);
  circ(g, 4.1, 0.1, 0.8, STEEL[0], INK, Lf);
  g.restore();
  }
  // shoulder pads cap both arms' roots
  ell(g, -3.4, -14.9, 1.5, 1.05, GOLDS[0], INK, Lf, -0.3);
  ell(g, 3.4, -14.9, 1.5, 1.05, GOLDS[1], INK, Lf, 0.3);
  // the neck ring the helmet sits in
  ell(g, 0, -15.5, 3.4, 0.8, STEEL[1], INK, Lf);
  // the helmet: a bell of glass round the head, its tint behind the head and its ink rim and
  // streak in front, so the brain stays bright inside it
  const bell = () => {
    g.beginPath();
    g.moveTo(-4.3, -0.4);
    g.quadraticCurveTo(-5.6, -6, -7.4, -10.8);
    g.bezierCurveTo(-8, -16, -4.8, -19.6, 0, -19.6);
    g.bezierCurveTo(4.8, -19.6, 8, -16, 7.4, -10.8);
    g.quadraticCurveTo(5.6, -6, 4.3, -0.4);
    g.closePath();
  };
  g.save(); g.translate(0, -15.6); g.scale(0.84, 0.84);
  bell(); g.fillStyle = glass === 'tinted' ? 'rgba(120,200,235,0.4)' : 'rgba(190,232,250,0.3)'; g.fill();
  g.restore();
  // head: the skull face, then the brain over it
  g.save(); g.translate(0, -15.6); g.scale(0.84, 0.84);
  // the jaw is its own piece, dropped by `d` when he chatters
  const d = ack ? ackOf(t) * 1.3 : 0, Li = L / 0.84, Lfi = Lf / 0.84;
  if (d > 0.05) box(g, -2.4, -3.1, 4.8, d + 0.6, '#3a0f18', INK, Lfi);
  poly(g, [-3.0, -3.0 + d, -2.6, -2.2 + d, -1.4, -1.2 + d, 1.4, -1.2 + d, 2.6, -2.2 + d, 3.0, -3.0 + d], SKULL[1], INK, Li);
  box(g, -1.7, -3.0 + d, 3.4, 0.6, '#ffffff', INK, Lfi);
  lines(g, [-0.85, -3.0 + d, -0.85, -2.4 + d, 0, -3.0 + d, 0, -2.4 + d, 0.85, -3.0 + d, 0.85, -2.4 + d], INK, Lfi);
  poly(g, [-3.6, -6.8, -3.9, -4.6, -3.0, -3.0, 3.0, -3.0, 3.9, -4.6, 3.6, -6.8], SKULL[1], INK, Li);
  poly(g, [-3.6, -6.8, -3.9, -4.6, -3.1, -3.2, -2.2, -6.8], SKULL[0]);
  poly(g, [3.6, -6.8, 3.9, -4.6, 3.1, -3.2, 2.6, -3.2, 2.9, -4.6], SKULL[2]);
  const look = Math.sin(t * 0.8) * 0.4;
  for (const sx of [-1, 1]) {
    ell(g, sx * 1.75, -5.3, 1.3, 1.5, INK, null, 0, sx * -0.2);
    circ(g, sx * 1.75 + look, -5.2, 0.45, '#9dff8c');
    circ(g, sx * 1.75 + look - 0.25, -5.6, 0.18, '#ffffff');
  }
  // the upper teeth, ticked in ink, on the skull's bottom edge
  box(g, -1.9, -3.6, 3.8, 0.6, '#ffffff', INK, Lfi);
  lines(g, [-0.95, -3.6, -0.95, -3.0, 0, -3.6, 0, -3.0, 0.95, -3.6, 0.95, -3.0], INK, Lfi);
  // the brain, lobed, its folds in the shade pink
  const brain = () => {
    g.beginPath();
    g.moveTo(-4.2, -6.6);
    g.bezierCurveTo(-5.6, -9, -5.4, -12.8, -2.6, -13.6);
    g.bezierCurveTo(-1.2, -14.6, 1.2, -14.6, 2.6, -13.6);
    g.bezierCurveTo(5.4, -12.8, 5.6, -9, 4.2, -6.6);
    g.closePath();
  };
  brain(); g.fillStyle = BRAIN[1]; g.fill();
  g.save(); g.clip();
  box(g, -6, -15, 2.2, 9, BRAIN[0]);
  box(g, 2.6, -15, 3, 9, BRAIN[2] + '88');
  g.restore();
  // (the outline is the brain's own path again: stroking the last path drawn — the shade
  // band's rect — was the thin rectangle in his visor)
  brain(); pen(g, INK, L / 0.84); g.stroke();
  g.beginPath();
  g.moveTo(0, -13.8); g.lineTo(0, -6.8);
  for (const [a, b, c2, d] of [[-3.6, -11.2, -1.6, -10.6], [-3.8, -8.6, -1.4, -8.4], [3.6, -11.2, 1.6, -10.6], [3.8, -8.6, 1.4, -8.4], [-2, -12.8, -1, -12]]) {
    g.moveTo(a, b); g.quadraticCurveTo((a + c2) / 2, b - 1.2, c2, d);
  }
  pen(g, BRAIN[2], Lf / 0.84); g.stroke();
  g.restore();
  // the glass's front: a whisper of tint, the ink rim that holds it on a light wall
  g.save(); g.translate(0, -15.6); g.scale(0.84, 0.84);
  bell(); g.fillStyle = 'rgba(220,244,255,0.12)'; g.fill();
  pen(g, INK, L / 0.84); g.stroke();
  // the glass's one lit streak and its glint
  g.beginPath(); g.moveTo(-5.6, -8.6); g.bezierCurveTo(-6.2, -13.2, -4.4, -16.8, -1.6, -17.8);
  pen(g, '#ffffff', 0.9); g.stroke();
  if (glass === 'tinted') {
    g.beginPath(); g.moveTo(5.8, -9.6); g.bezierCurveTo(6.2, -12, 5.6, -14, 4.4, -15.4);
    pen(g, 'rgba(255,255,255,0.7)', 0.45); g.stroke();
  }
  circ(g, -2.6, -16.4, 0.5, '#ffffff');
  g.restore();
  g.restore();
}

// SIZE (Peter, 14 Oct: "shouldnt really be bigger than humans", then "a bit bigger"): 1.35 puts
// the top of his helmet at about 1.75 m, the top of his brain at 1.55 m — a person's height,
// in the helmet.
export const LIFT_MARTIAN_SC = 1.35;
// Which car of the lobby's pair he rides in: the right-hand one, pinned open for him.
export const LIFT_MARTIAN_CAR = 1;
// Riding right of the car's middle, by the side-wall panel, jabbing the button for floor 23 —
// at his shoulder now the panel runs down low — three times a go ("3 presses if we can fit them in"). The panel is painted before him, and
// never behind his helmet: seen through the glass it read as a box in his visor.
export function paintLiftMartian(g, car, floor, t, sc = LIFT_MARTIAN_SC) {
  const mx = car.x + car.w / 2 + 6.5, my = car.y + car.h - FOOT;
  const p = liftPanel(car, floor);
  const target = p.buttons.find((b) => b.label === '23') || p.buttons[0];
  const { lit } = pressOf(t, 3);
  paintLiftPanel(g, car, floor, target, lit);
  ligneMartian(g, mx, my, sc, t, { glass: 'tinted', arm: 'press', jabs: 3, ack: true,
    target: { x: (target.x - mx) / sc, y: (target.y - my) / sc } });
}

// Everything inside one open car. With the Martian in it there is no poster — he is the
// picture (Peter, 14 Oct: "no poster when hes in the lift").
export function paintLiftCar(g, car, { floor, t, bank = 0, martian = false }) {
  if (martian) paintLiftMartian(g, car, floor, t);
  else paintLiftPoster(g, car, liftPosterFor(floor, bank), floor, t);
  if (martian) return;
  paintLiftPanel(g, car, floor);
}
