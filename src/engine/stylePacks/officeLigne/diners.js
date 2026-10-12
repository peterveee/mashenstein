// The two at the table in the STAFF CANTEEN (floor 23) and the COFFEE SHOP (lobby), sat in an 80s
// diner booth seen from the aisle: bake-off pick C, 12 Oct 2026 (src/dev/office-diner-candidates.js
// keeps the other five). rooms.js draws it through its setOfficeDiners seam with
// d = {room: 'canteen'|'cafe', x, w, xs, seed, span: [x0, x1] (the free floor beside the kitchen)},
// in the room's mid-layer units: MID_BASE is the floor line, the table top stands 28 above it
// (about 75 cm), a seat 15 and a seated shoulder about 36.
import { MID_BASE } from '../officeClimb.js';
import { box, rbox, line, poly, circ, ell, pen, eggPath, M89 } from './line.js';
import { personFor, head } from './room.js';

const LWM = 0.5;
const SEAT = 15, TOP = 28, SHOULDER = 36.5;
const SHOE = '#1b1922', SKIN_INK = 0.35;
const TROUSERS = ['#2b2936', '#3a3548', '#4a4458', '#5b4a3e'];
// floor 23 eats in its shirt-sleeves; the lobby's coffee drinkers are visitors in their jackets
const JACKETS = ['#2f8f88', '#5a5470', '#d6a640', '#c4577c', '#3d3a4e', '#6a6480'];
const FORMICA = '#ead1a0', TABLE_EDGE = { canteen: '#4fb7ab', cafe: '#c4577c' };

const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
// 0 at rest, 1 at the mouth: a spoonful (or a sip) every few seconds, the two diners out of step
function bite(t, i) {
  const ph = (((t * 0.3 + i * 0.47) % 1) + 1) % 1;
  return smooth(0, 0.16, ph) * (1 - smooth(0.34, 0.52, ph));
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = (s) => Math.round(Math.min(255, Math.max(0, ((n >> s) & 255) * k)));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
function diner(d, i) {
  const seed = d.seed + i, p = personFor(seed + 400);
  const pp = { ...p, style: p.style === 'bun' || p.style === 'quiff' ? 'short' : p.style };
  const cafe = d.room === 'cafe';
  return { i, p: pp, seed, cafe, top: cafe ? JACKETS[(seed + i * 3) % JACKETS.length] : p.shirt, shirt: cafe ? '#ffffff' : p.shirt,
    tie: p.tie, trousers: TROUSERS[seed % TROUSERS.length], skin: p.skin };
}
// a limb or a handle: an ink line with the fill laid down its middle
function limb(g, pts, fill, w, ink) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
  pen(g, ink, w + 0.8); g.stroke();
  pen(g, fill, w); g.stroke();
}
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- the food
// Canteen lunch is an egg ("TODAY: EGG"), in an egg cup on a side plate; the spoon does the work.
function eggLunch(g, x, y, P) {
  ell(g, x, y, 5.2, 1.3, '#f6f2e6', P.ink, 0.4);
  poly(g, [x - 1.6, y - 0.6, x + 1.6, y - 0.6, x + 0.8, y - 2.2, x + 1.7, y - 3.8, x - 1.7, y - 3.8, x - 0.8, y - 2.2], M89.lemon, P.ink, 0.35);
  g.beginPath(); eggPath(g, x, y - 5.4, 1.7, 2.2); g.fillStyle = '#fbf5e6'; g.fill(); pen(g, P.ink, 0.35); g.stroke();
  box(g, x - 1.7, y - 5.6, 3.4, 0.8, '#f2c641');
}
function spoon(g, hx, hy, ux, uy, P) {
  line(g, hx, hy, hx + ux * 3, hy + uy * 3, '#9aa0ae', 0.6);
  ell(g, hx + ux * 3.6, hy + uy * 3.6, 0.9, 0.6, '#c9ced8', P.ink, 0.25);
}
// The coffee shop: a cup on a saucer and a slice of cake.
function cupOnSaucer(g, x, y, P, full = true) {
  ell(g, x, y, 3.6, 0.9, '#f6f2e6', P.ink, 0.35);
  if (!full) return;
  cup(g, x, y - 0.6, P, 1);
}
function cup(g, x, y, P, dir) {
  rbox(g, x - 1.8, y - 3.2, 3.6, 3.2, 0.9, '#ffffff', P.ink, 0.35);
  box(g, x - 1.8, y - 2.2, 3.6, 0.8, M89.pink);
  g.beginPath(); g.arc(x + dir * 2.1, y - 1.7, 0.9, -Math.PI / 2, Math.PI / 2, dir < 0); pen(g, P.ink, 0.35); g.stroke();
}
function cake(g, x, y, P) {
  ell(g, x, y, 4.4, 1.1, '#f6f2e6', P.ink, 0.35);
  poly(g, [x - 2.6, y - 0.4, x + 2.6, y - 0.4, x + 2.6, y - 2.6, x - 2.6, y - 3.4], '#f3d7a2', P.ink, 0.35);
  poly(g, [x - 2.6, y - 3.4, x + 2.6, y - 2.6, x + 2.6, y - 3.4, x - 2.6, y - 4.2], M89.pink, P.ink, 0.3);
  line(g, x - 2.4, y - 1.6, x + 2.4, y - 1.4, '#e8a9c3', 0.5);
}

// ---------------------------------------------------------------- in profile
// A diner side on, facing `dir` (+1 right). Side on, sitting cannot be misread: the thigh runs
// level along the seat and the shin drops from the knee. hx is the hip; X(u) is u units forward.
function sideBody(g, hx, dir, m, P, { seatY = MID_BASE - SEAT, feetY = MID_BASE, footU = 9.6, legs = true } = {}) {
  const ink = P.inkM, X = (u) => hx + dir * u;
  const span = (u0, u1) => [Math.min(X(u0), X(u1)), Math.abs(u1 - u0)];
  const shoulderY = seatY - (SHOULDER - SEAT);
  if (legs) {
    // the far leg first, a shade darker and a step further forward
    for (const [off, col] of [[1.8, shade(m.trousers, 0.72)], [0, m.trousers]]) {
      const kU = 10.6 + off, fU = footU + off;
      const [tx, tw] = span(-3, kU + 1.2);
      rbox(g, tx, seatY - 4.8, tw, 4.8, 2.2, col, ink, 0.4);
      poly(g, [X(kU - 1.6), seatY - 1.2, X(kU + 1.6), seatY - 1.2, X(fU + 1.3), feetY - 2.4, X(fU - 1.5), feetY - 2.4], col, ink, 0.4);
      const [sx, sw] = span(fU - 2, fU + 3.6);
      rbox(g, sx, feetY - 2.8, sw, 2.8, 1.1, SHOE, ink, 0.35);
    }
  }
  // torso: shoulder pads, a touch of lean toward the table
  poly(g, [X(-4.6), seatY - 1, X(4.2), seatY - 1, X(4.9), shoulderY + 2, X(-3.8), shoulderY + 2], m.top, ink, LWM);
  const [px, pw] = span(-4.6, 5.6);
  rbox(g, px, shoulderY, pw, 4.2, 2, m.top, ink, LWM);
  poly(g, [X(2.6), shoulderY + 0.6, X(5), shoulderY + 0.6, X(4.6), shoulderY + 6], m.shirt, ink, 0.3);
  if (!m.cafe || m.seed % 2) line(g, X(4.3), shoulderY + 2, X(4.5), shoulderY + 7.5, m.tie, 1);
  sideHead(g, X(1.4), shoulderY - 5.6, m.p, dir, ink);
}
// head() gives a bald head its two front-on side patches even in profile; side on, the fringe
// goes round the back of the head instead
function sideHead(g, x, y, p, dir, ink) {
  const face = dir > 0 ? 'right' : 'left';
  if (p.style !== 'bald') { head(g, x, y, 5, p, face, ink, LWM); return; }
  head(g, x, y, 5, { ...p, style: 'short', hair: p.skin }, face, ink, LWM);
  g.save();
  g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.clip();
  g.fillStyle = p.hair; g.fillRect(dir > 0 ? x - 5 : x + 1.6, y - 1, 3.4, 3.2);
  g.restore();
  circ(g, x, y, 5, null, ink, LWM);
}
// the near arm: the elbow on the table edge (u 3.4), the hand at the plate or at the mouth
function sideArm(g, hx, dir, m, P, t, room, tableY) {
  const ink = P.inkM, X = (u) => hx + dir * u, k = bite(t, m.i);
  const shoulderY = tableY - (SHOULDER - TOP) - (tableY === MID_BASE - TOP ? 0 : 0);
  const sY = shoulderY + 2.4, eU = 3.2, eY = tableY - 1.4;
  const hU = lerp(10.2, 6.6, k), hY = lerp(tableY - 1.6, shoulderY - 3, k);
  limb(g, [X(0.4), sY, X(eU), eY, X(hU - 0.6), hY + 0.8], m.top, 2.4, ink);
  if (room === 'cafe') {
    if (k > 0.05) cup(g, X(hU + 1.4), hY + 2, P, -dir);
    circ(g, X(hU), hY, 1.4, m.skin, ink, SKIN_INK);
  } else {
    circ(g, X(hU), hY, 1.4, m.skin, ink, SKIN_INK);
    spoon(g, X(hU), hY, dir * (0.9 - k * 0.5), -0.4 - k * 0.5, P);
  }
}
function sideFood(g, hx, dir, m, P, t, room, tableY) {
  const X = (u) => hx + dir * u;
  if (room === 'cafe') { cupOnSaucer(g, X(13.4), tableY - 0.2, P, bite(t, m.i) <= 0.05); cake(g, X(18.6), tableY - 0.4, P); } else eggLunch(g, X(13.6), tableY - 0.2, P);
}
// a pedestal table side on: the top over one chrome column and a cross foot
function pedestalTable(g, x0, x1, P, room, topY = MID_BASE - TOP) {
  const b = MID_BASE, c = (x0 + x1) / 2, ink = P.ink;
  line(g, c, topY + 3, c, b - 1.6, P.chrome, 2.2);
  line(g, c - 0.5, topY + 4, c - 0.5, b - 3, '#f2f4f8', 0.5);
  rbox(g, c - 8, b - 2, 16, 2, 0.8, '#24222c', ink, 0.35);
  box(g, x0, topY, x1 - x0, 3.4, FORMICA, ink, 0.6);
  line(g, x0 + 0.6, topY + 2.5, x1 - 0.6, topY + 2.5, TABLE_EDGE[room], 1);
}

// two diners side on, facing each other across a table centred in the free floor
function facing(d, gap) {
  const c = (d.span[0] + d.span[1]) / 2;
  return [{ hx: c - gap, dir: 1 }, { hx: c + gap, dir: -1 }];
}

// An 80s diner booth from the aisle: the bench's end panel stands in front of the sitter's hips.
function boothDiners(g, d, f, P) {
  const b = MID_BASE, ink = P.inkM, sy = b - SEAT, ty = b - TOP;
  const seats = facing(d, 31), ms = seats.map((_, i) => diner(d, i));
  const vinyl = d.room === 'cafe' ? '#a8355a' : '#d9963a', vinylLt = d.room === 'cafe' ? '#d0688a' : '#f5c977';
  seats.forEach((s, i) => sideBody(g, s.hx, s.dir, ms[i], P));
  // the table is fixed to the wall: one column and a bracket
  pedestalTable(g, seats[0].hx + 3.4, seats[1].hx - 3.4, P, d.room);
  for (const s of seats) {
    const X = (u) => s.hx + s.dir * u;
    // the end panel: seat and high back as one upholstered L, piped, on a chrome kick strip
    poly(g, [X(8.4), b - 2, X(8.4), sy + 1.6, X(7.4), sy, X(-3.6), sy, X(-4.4), b - 38, X(-6.2), b - 41, X(-9.6), b - 41, X(-11), b - 38, X(-11), b - 2], vinyl, ink, LWM);
    poly(g, [X(7), sy + 1.8, X(-5.8), sy + 1.8, X(-6.4), b - 37.6, X(-9.4), b - 37.6, X(-9.4), b - 3.4, X(7), b - 3.4], null, vinylLt, 0.6);
    const [kx, kw] = [Math.min(X(-11), X(8.4)), 19.4];
    box(g, kx, b - 2, kw, 2, P.chrome, ink, 0.35);
  }
  // the shins hang off the front of the bench, in front of its panel
  seats.forEach((s, i) => {
    const X = (u) => s.hx + s.dir * u, m = ms[i];
    poly(g, [X(9), sy - 1.2, X(12.2), sy - 1.2, X(10.9), b - 2.4, X(8.1), b - 2.4], m.trousers, ink, 0.4);
    rbox(g, Math.min(X(7.6), X(13.2)), b - 2.8, 5.6, 2.8, 1.1, SHOE, ink, 0.35);
  });
  seats.forEach((s, i) => { sideFood(g, s.hx, s.dir, ms[i], P, f.t, d.room, ty); sideArm(g, s.hx, s.dir, ms[i], P, f.t, d.room, ty); });
}

export { boothDiners, diner, bite, smooth, shade, limb, lerp, eggLunch, spoon, cupOnSaucer, cup, cake,
  sideBody, sideHead, sideArm, sideFood, pedestalTable, facing,
  LWM, SEAT, TOP, SHOULDER, SHOE, SKIN_INK, FORMICA, TABLE_EDGE };
