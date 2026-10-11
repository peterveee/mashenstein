// CORPORATE KOMBAT — diner bake-off (Peter, 12 Oct 2026: "these people in the food court on level 2
// (and coffee area level 1) look terrible ... legs look bad, seat back is weird, look like they are
// standing"). Candidates only: the run still draws rooms.js's dinersNow until one is picked.
//
// Each candidate paints the people, their chairs, the table and the food for one room through the
// setOfficeDiners seam in rooms.js. d = {room: 'canteen'|'cafe', x, w (today's table), xs (where
// today's two sit), seed, span: [x0, x1] (the free floor beside the kitchen)}, in the room's
// mid-layer units: MID_BASE is the floor line and today's table top stands 28 above it (about
// 75 cm), so a chair seat is 15 up and a seated shoulder about 36.
import { MID_BASE } from '../engine/stylePacks/officeClimb.js';
import { box, rbox, line, poly, circ, ell, pen, eggPath, M89, topRound } from '../engine/stylePacks/officeLigne/line.js';
import { personFor, head, padded } from '../engine/stylePacks/officeLigne/room.js';
import { setOfficeDiners } from '../engine/stylePacks/officeLigne/rooms.js';
import { drawOfficeRoomScene } from './office-production.js';

const LWM = 0.5;
const SEAT = 15, TOP = 28, SHOULDER = 36.5;
const SHOE = '#1b1922', SKIN_INK = 0.35;
const TROUSERS = ['#2b2936', '#3a3548', '#4a4458', '#5b4a3e'];
// floor 23 eats in its shirt-sleeves; the lobby's coffee drinkers are visitors in their jackets
const JACKETS = ['#2f8f88', '#5a5470', '#d6a640', '#c4577c', '#3d3a4e', '#6a6480'];
const FORMICA = '#ead1a0', TABLE_EDGE = { canteen: '#4fb7ab', cafe: '#c4577c' };
const SHELL = '#e9a23b', SHELL_DK = '#c7832a'; // canteen polyprop, mustard against the teal dado
const BENT = '#4a3029', CANE = '#e2c58f'; // coffee-shop bentwood

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

// ---------------------------------------------------------------- front on
// A diner facing us across the table. The legs are the whole problem with today's: hips hidden by
// the table top and two long straight legs to the floor is a person standing behind a table. Seated,
// the thighs come toward us, so they foreshorten to a lap with the knees at its foot, the seat
// edge shows either side of it, and only the shins (shorter than the torso) reach the floor.
function frontBody(g, cx, m, P, { legs = true } = {}) {
  const b = MID_BASE, ink = P.inkM, sy = b - SEAT;
  if (legs) {
    for (const s of [-1, 1]) {
      const kx = cx + s * 3.7, fx = cx + s * 3.3;
      poly(g, [kx - 2.2, sy, kx + 2.2, sy, fx + 1.7, b - 2.4, fx - 1.7, b - 2.4], m.trousers, ink, 0.4);
      ell(g, fx + s * 0.3, b - 1.5, 2.6, 1.6, SHOE, ink, 0.35);
    }
  }
  padded(g, cx, b - SHOULDER, 17, SHOULDER - SEAT - 2, m.top, ink, LWM);
  // the arms: a seam down each side of the jacket or shirt, to the elbow at the table
  for (const s of [-1, 1]) line(g, cx + s * 5.4, b - SHOULDER + 3.6, cx + s * 5.8, b - TOP + 1, ink, 0.35);
  if (m.cafe) {
    poly(g, [cx - 2.4, b - SHOULDER, cx + 2.4, b - SHOULDER, cx, b - SHOULDER + 6], m.shirt, ink, 0.3);
    if (m.seed % 2) line(g, cx, b - SHOULDER + 1.6, cx, b - SHOULDER + 5.4, m.tie, 1.2);
  } else {
    poly(g, [cx - 2.6, b - SHOULDER, cx, b - SHOULDER + 2.2, cx - 1.2, b - SHOULDER + 3], '#ffffff', ink, 0.3);
    poly(g, [cx + 2.6, b - SHOULDER, cx, b - SHOULDER + 2.2, cx + 1.2, b - SHOULDER + 3], '#ffffff', ink, 0.3);
    if (m.seed % 3 !== 1) poly(g, [cx - 0.8, b - SHOULDER + 2, cx + 0.8, b - SHOULDER + 2, cx + 1, b - TOP + 2, cx - 1, b - TOP + 2], m.tie, ink, 0.25);
  }
  if (legs) {
    // the lap, drawn over the bottom of the torso: thighs toward us, their tops catching the light
    rbox(g, cx - 7.7, sy - 5.2, 15.4, 6.6, 2.4, m.trousers, ink, 0.45);
    line(g, cx - 6, sy - 4.2, cx + 6, sy - 4.2, shade(m.trousers, 1.45), 0.7);
    line(g, cx, sy - 2.6, cx, sy + 1.3, ink, 0.4);
  }
  head(g, cx, b - SHOULDER - 5.6, 5, m.p, 'front', ink, LWM);
}
// The hands, after the table: one rests on it, the other brings the spoon (or the cup) up.
function frontHands(g, cx, m, P, t, room) {
  const b = MID_BASE, ink = P.inkM, k = bite(t, m.i), ty = b - TOP;
  circ(g, cx - 6.2, ty - 0.4, 1.4, m.skin, ink, SKIN_INK);
  const hx = lerp(cx + 6.2, cx + 2, k), hy = lerp(ty - 0.6, b - SHOULDER - 3.4, k);
  limb(g, [cx + 7.4, ty + 0.6, hx + 0.6, hy + 1.2], m.top, 2.2, ink);
  if (room === 'cafe') {
    if (k > 0.05) cup(g, hx - 0.6, hy + 1.6, P, -1);
    circ(g, hx, hy, 1.4, m.skin, ink, SKIN_INK);
  } else {
    circ(g, hx, hy, 1.4, m.skin, ink, SKIN_INK);
    spoon(g, hx, hy, -0.55, -0.85 + k * 0.2, P);
  }
}
function frontFood(g, cx, m, P, t, room) {
  const ty = MID_BASE - TOP;
  if (room === 'cafe') { cupOnSaucer(g, cx + 2.4, ty - 0.2, P, bite(t, m.i) <= 0.05); cake(g, cx - 3.4, ty - 0.4, P); } else eggLunch(g, cx, ty - 0.2, P);
}
function frontTable(g, x, w, P, room, { legs = true } = {}) {
  const b = MID_BASE, ink = P.ink;
  if (legs) {
    for (const lx of [x + 4, x + w - 4]) {
      line(g, lx, b - TOP + 3, lx, b - 1.6, P.chrome, 1.7);
      line(g, lx - 3.2, b - 1, lx + 3.2, b - 1, '#24222c', 1.2);
    }
  }
  box(g, x, b - TOP, w, 3.4, FORMICA, ink, 0.6);
  line(g, x + 0.6, b - TOP + 2.5, x + w - 0.6, b - TOP + 2.5, TABLE_EDGE[room], 1);
}
// The chairs, seen front on. Both have low backs, so the sitter hides most of it.
function polypropFront(g, cx, P) {
  const b = MID_BASE, ink = P.inkM, sy = b - SEAT;
  for (const s of [-1, 1]) line(g, cx + s * 5.4, sy + 1, cx + s * 6, b - 1.2, '#8e95a4', 0.9);
  topRound(g, cx - 9.8, b - 31, 19.6, 15, 3.4, SHELL_DK, ink, 0.45);
  rbox(g, cx - 9.8, sy - 1.4, 19.6, 2.8, 1.2, SHELL, ink, 0.45);
  for (const s of [-1, 1]) line(g, cx + s * 8.6, sy + 1.2, cx + s * 9.2, b - 0.8, P.chrome, 1.1);
}
function bistroFront(g, cx, P) {
  const b = MID_BASE, ink = P.inkM, sy = b - SEAT;
  for (const s of [-1, 1]) line(g, cx + s * 4.8, sy + 1, cx + s * 5.6, b - 1.2, shade(BENT, 0.8), 0.9);
  // the bentwood hoop, wider than the sitter's waist, and the leg ring
  g.beginPath(); g.ellipse(cx, b - 26, 9.6, 8, 0, Math.PI, Math.PI * 2); pen(g, BENT, 1.4); g.stroke();
  for (const s of [-1, 1]) line(g, cx + s * 9.6, b - 26, cx + s * 9.2, sy, BENT, 1.4);
  g.beginPath(); g.ellipse(cx, b - 6, 7.6, 1.2, 0, 0, Math.PI); pen(g, BENT, 0.7); g.stroke();
  ell(g, cx, sy - 0.2, 10, 1.6, CANE, ink, 0.45);
  for (const s of [-1, 1]) line(g, cx + s * 8.2, sy + 1, cx + s * 9.6, b - 0.6, BENT, 1.2);
}
const frontChair = (g, cx, P, room) => (room === 'cafe' ? bistroFront : polypropFront)(g, cx, P);

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
// Chairs side on. Both low-backed: the back stops at the shoulder blades.
function polypropSide(g, hx, dir, P) {
  const b = MID_BASE, ink = P.inkM, sy = b - SEAT, X = (u) => hx + dir * u;
  line(g, X(7.4), sy + 0.6, X(8), b - 0.8, P.chrome, 1.1);
  line(g, X(-4.6), sy + 0.6, X(-5.6), b - 0.8, P.chrome, 1.1);
  line(g, X(-5.2), b - 6.5, X(7.7), b - 6.5, '#8e95a4', 0.6);
  poly(g, [X(9), sy - 1.4, X(-3.4), sy - 1.4, X(-4.6), b - 30.6, X(-6.8), b - 30.6, X(-6), sy + 0.9, X(9), sy + 0.9], SHELL, ink, 0.45);
}
function bistroSide(g, hx, dir, P) {
  const b = MID_BASE, ink = P.inkM, sy = b - SEAT, X = (u) => hx + dir * u;
  line(g, X(7), sy + 0.6, X(8.6), b - 0.6, BENT, 1.2);
  // the back leg runs on up as the bentwood back, with its curl at the top
  g.beginPath();
  g.moveTo(X(-4.6), b - 0.6);
  g.lineTo(X(-4.4), sy);
  g.quadraticCurveTo(X(-5), b - 26, X(-6.6), b - 32);
  g.quadraticCurveTo(X(-7.6), b - 35, X(-5.4), b - 34.6);
  pen(g, BENT, 1.3); g.stroke();
  line(g, X(-4.5), b - 6, X(7.8), b - 6, BENT, 0.7);
  rbox(g, Math.min(X(-5.2), X(8.4)), sy - 1.4, 13.6, 2.2, 1, CANE, ink, 0.4);
}
const sideChair = (g, hx, dir, P, room) => (room === 'cafe' ? bistroSide : polypropSide)(g, hx, dir, P);

// two diners side on, facing each other across a table centred in the free floor
function facing(d, gap) {
  const c = (d.span[0] + d.span[1]) / 2;
  return [{ hx: c - gap, dir: 1 }, { hx: c + gap, dir: -1 }];
}

// ---------------------------------------------------------------- the candidates
function paintFront(g, d, f, P, { cloth = false } = {}) {
  const ms = d.xs.map((_, i) => diner(d, i));
  d.xs.forEach((cx, i) => { frontChair(g, cx, P, d.room); frontBody(g, cx, ms[i], P); });
  if (cloth) tablecloth(g, d.x, d.w, P, d.room); else frontTable(g, d.x, d.w, P, d.room);
  d.xs.forEach((cx, i) => { frontFood(g, cx, ms[i], P, f.t, d.room); frontHands(g, cx, ms[i], P, f.t, d.room); });
}
function tablecloth(g, x, w, P, room) {
  const b = MID_BASE, ink = P.ink, top = b - TOP, hem = b - 7.5;
  const cloth = room === 'cafe' ? '#fbf6ec' : '#ffffff';
  const outline = () => {
    g.beginPath();
    g.moveTo(x - 1.4, top);
    g.lineTo(x + w + 1.4, top);
    g.lineTo(x + w + 2.4, hem);
    for (let u = x + w + 2.4; u > x - 2.4; u -= 4) g.quadraticCurveTo(u - 2, hem + 1.6, Math.max(x - 2.4, u - 4), hem);
    g.closePath();
  };
  outline();
  g.fillStyle = cloth; g.fill();
  g.save(); g.clip();
  if (room === 'canteen') {
    // gingham, in the Memphis pink
    g.fillStyle = 'rgba(255,111,174,0.28)';
    for (let u = x - 2; u < x + w + 3; u += 4) g.fillRect(u, top, 2, hem - top + 2);
    for (let v = top + 1; v < hem + 2; v += 4) g.fillRect(x - 3, v, w + 6, 2);
  } else {
    box(g, x - 3, hem - 3.4, w + 6, 2.2, M89.pink);
  }
  for (const u of [0.18, 0.5, 0.82]) line(g, x + w * u, top + 3, x + w * u - 0.6, hem, 'rgba(36,34,46,0.12)', 0.6);
  g.restore();
  outline(); pen(g, ink, 0.5); g.stroke();
  line(g, x - 1.4, top + 0.2, x + w + 1.4, top + 0.2, 'rgba(255,255,255,0.9)', 0.6);
}
function paintSide(g, d, f, P, { gap = 32 } = {}) {
  const seats = facing(d, gap), ty = MID_BASE - TOP;
  const ms = seats.map((_, i) => diner(d, i));
  seats.forEach((s, i) => { sideChair(g, s.hx, s.dir, P, d.room); sideBody(g, s.hx, s.dir, ms[i], P); });
  pedestalTable(g, seats[0].hx + 3.4, seats[1].hx - 3.4, P, d.room);
  seats.forEach((s, i) => { sideFood(g, s.hx, s.dir, ms[i], P, f.t, d.room, ty); sideArm(g, s.hx, s.dir, ms[i], P, f.t, d.room, ty); });
}
// An 80s diner booth from the aisle: the bench's end panel stands in front of the sitter's hips.
function paintBooth(g, d, f, P) {
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
// A high table and stools: perched, knees up, feet on the stool's ring.
function paintStools(g, d, f, P) {
  const b = MID_BASE, ink = P.inkM, seatY = b - 27, ty = b - 39.5;
  const seats = facing(d, 19), ms = seats.map((_, i) => diner(d, i));
  const pad = d.room === 'cafe' ? M89.pink : SHELL;
  for (const s of seats) {
    const X = (u) => s.hx + s.dir * u;
    line(g, s.hx, seatY + 2, s.hx, b - 1.4, P.chrome, 1.8);
    line(g, X(-4.4), b - 11, X(5.6), b - 11, P.chrome, 0.9);
    ell(g, s.hx, b - 1, 5.4, 1.1, '#24222c', ink, 0.35);
    rbox(g, s.hx - 6, seatY - 0.6, 12, 2.8, 1.2, pad, ink, 0.45);
  }
  seats.forEach((s, i) => sideBody(g, s.hx, s.dir, ms[i], P, { seatY: seatY - 0.4, feetY: b - 10.4, footU: 6 }));
  pedestalTable(g, seats[0].hx + 3.6, seats[1].hx - 3.6, P, d.room, ty);
  seats.forEach((s, i) => { sideFood(g, s.hx, s.dir, ms[i], P, f.t, d.room, ty); sideArm(g, s.hx, s.dir, ms[i], P, f.t, d.room, ty); });
}
// Today's front-on table behind a planter trough: the legs never have to be drawn at all.
function paintPlanter(g, d, f, P) {
  const b = MID_BASE;
  paintFront(g, d, f, P);
  const x0 = d.span[0] + 2, x1 = d.span[1] - 2, top = b - 15;
  // the hedge, a row of clipped box balls
  for (let u = x0 + 4, k = 0; u < x1 - 2; u += 7, k++) {
    const r = 3.4 + ((k * 7) % 3) * 0.5;
    circ(g, u, top - r * 0.4, r, k % 2 ? '#6bbf8a' : '#5bb07d', '#3f7f57', 0.45);
    circ(g, u - r * 0.3, top - r * 0.8, r * 0.35, '#8fd6a6');
  }
  const trough = d.room === 'cafe' ? '#c4577c' : '#2f9a8f';
  box(g, x0, top, x1 - x0, b - top - 1, trough, P.ink, 0.6);
  box(g, x0 - 1.4, top - 1.4, x1 - x0 + 2.8, 2.6, d.room === 'cafe' ? '#e8a0bd' : '#7fd3c8', P.ink, 0.5);
  for (let u = x0 + 12; u < x1 - 6; u += 24) line(g, u, top + 3, u, b - 3, 'rgba(255,255,255,0.25)', 0.8);
  box(g, x0, b - 2.4, x1 - x0, 1.4, 'rgba(20,16,30,0.3)');
}

export const DINERS = [
  { letter: 'A', name: 'Sat down properly', note: 'Front on, as today, but seated: a lap with the knees at its foot, short shins, the seat edge either side. Low-backed chairs: canteen polyprop, coffee-shop bentwood.', paint: (g, d, f, P) => paintFront(g, d, f, P) },
  { letter: 'B', name: 'Side on, face to face', note: 'The two turn to face each other across a pedestal table: thigh along the seat, shin down from the knee. Same low chairs, side on.', paint: (g, d, f, P) => paintSide(g, d, f, P) },
  { letter: 'C', name: 'The booth', note: 'An 80s diner booth seen from the aisle. The bench end hides the hips; the shins hang off its front. Mustard vinyl upstairs, burgundy in the lobby.', paint: paintBooth },
  { letter: 'D', name: 'Tablecloth', note: 'A as seated, with a cloth to the shins: pink gingham in the canteen, white with a pink hem in the coffee shop. Shoes and chair feet below the hem.', paint: (g, d, f, P) => paintFront(g, d, f, P, { cloth: true }) },
  { letter: 'E', name: 'Perched', note: 'A high table and two stools, side on: knees up, feet on the stool ring.', paint: paintStools },
  { letter: 'F', name: 'Behind the planter', note: 'A at the table, with a planter trough and clipped box in front of the seating, so the legs never show.', paint: paintPlanter },
];

// One room (canteen on floor 23, coffee shop in the lobby) in the production pack, with a
// candidate's diners. cand null = what ships.
export function drawDinerRoom(ctx, t, cand, { floor, kind }) {
  const was = setOfficeDiners(cand ? cand.paint : null);
  try { drawOfficeRoomScene(ctx, t, { floor, kind, style: 'glass' }); }
  finally { setOfficeDiners(was); }
}
