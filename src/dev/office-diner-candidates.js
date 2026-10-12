// CORPORATE KOMBAT — diner bake-off (Peter, 12 Oct 2026: "these people in the food court on level 2
// (and coffee area level 1) look terrible ... legs look bad, seat back is weird, look like they are
// standing"). PICKED C, the booth, the same day: it ships from officeLigne/diners.js and is imported
// back here; the rest are candidates only, and BEFORE keeps what the run drew until then.
//
// Each candidate paints the people, their chairs, the table and the food for one room through the
// setOfficeDiners seam in rooms.js. d = {room: 'canteen'|'cafe', x, w (today's table), xs (where
// today's two sit), seed, span: [x0, x1] (the free floor beside the kitchen)}, in the room's
// mid-layer units: MID_BASE is the floor line and today's table top stands 28 above it (about
// 75 cm), so a chair seat is 15 up and a seated shoulder about 36.
import { MID_BASE } from '../engine/stylePacks/officeClimb.js';
import { box, rbox, line, poly, circ, ell, pen, M89, topRound } from '../engine/stylePacks/officeLigne/line.js';
import { head, padded, boardroomBack, midActors } from '../engine/stylePacks/officeLigne/room.js';
import { setOfficeDiners } from '../engine/stylePacks/officeLigne/rooms.js';
import { boothDiners, diner, bite, shade, limb, lerp, eggLunch, spoon, cupOnSaucer, cup, cake, sideBody, sideArm, sideFood,
  pedestalTable, facing, LWM, SEAT, TOP, SHOULDER, SHOE, SKIN_INK, FORMICA, TABLE_EDGE } from '../engine/stylePacks/officeLigne/diners.js';
import { drawOfficeRoomScene } from './office-production.js';

const SHELL = '#e9a23b', SHELL_DK = '#c7832a'; // canteen polyprop, mustard against the teal dado
const BENT = '#4a3029', CANE = '#e2c58f'; // coffee-shop bentwood



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
  { letter: 'C', name: 'The booth — SHIPS', note: 'An 80s diner booth seen from the aisle. The bench end hides the hips; the shins hang off its front. Mustard vinyl upstairs, burgundy in the lobby. Picked 12 Oct 2026.', paint: boothDiners },
  { letter: 'D', name: 'Tablecloth', note: 'A as seated, with a cloth to the shins: pink gingham in the canteen, white with a pink hem in the coffee shop. Shoes and chair feet below the hem.', paint: (g, d, f, P) => paintFront(g, d, f, P, { cloth: true }) },
  { letter: 'E', name: 'Perched', note: 'A high table and two stools, side on: knees up, feet on the stool ring.', paint: paintStools },
  { letter: 'F', name: 'Behind the planter', note: 'A at the table, with a planter trough and clipped box in front of the seating, so the legs never show.', paint: paintPlanter },
];

// What the run drew before the booth: the boardroom's front-facing sitters (tall chair backs, straight
// legs to the floor) behind a plain table, each waving an egg or hiding behind a mug.
function before(g, d, f, P) {
  const b = MID_BASE;
  const chairs = d.xs.map((x, i) => ({ x, sitter: true, seed: d.seed + i, away: false, nod: (Math.sin(f.t * 0.7 + i) + 1) * 0.08 }));
  boardroomBack(g, {}, P, chairs);
  midActors(g, { mid: { items: [{ kind: 'boardroom', chairs }] } }, P);
  for (const dx of [d.x + 9, d.x + d.w - 9]) {
    line(g, dx, b - 25, dx, b - 2, P.chrome, 2);
    line(g, dx - 4, b - 2, dx + 4, b - 2, P.ink, 1.3);
  }
  box(g, d.x, b - 28, d.w, 5, '#ead1a0', P.ink, 0.6);
  d.xs.forEach((px, i) => {
    if (d.room === 'canteen') {
      ell(g, px, b - 29.5, 9, 2, '#f0ece0', P.ink, 0.4);
      const lift = (Math.sin(f.t * 1.1 + i) + 1) * 4;
      line(g, px + 7, b - 35, px + 11, b - 32 - lift, '#edc49e', 2.1);
      ell(g, px + 11, b - 36.5 - lift, 2.8, 3.6, '#fbf5e6', P.ink, 0.45);
    } else {
      ell(g, px, b - 29, 9, 2, '#f4ecd2', P.ink, 0.4);
      box(g, px - 3, b - 36, 7, 7, '#e8c1d5', P.ink, 0.4);
      circ(g, px + 6, b - 33, 2, null, P.ink, 0.6);
    }
  });
}
export const BEFORE = { letter: 'BEFORE', name: 'as it was', note: 'What the run drew until 12 Oct 2026.', paint: before };

// One room (canteen on floor 23, coffee shop in the lobby) in the production pack, with a
// candidate's diners. cand null = what ships.
export function drawDinerRoom(ctx, t, cand, { floor, kind }) {
  const was = setOfficeDiners(cand ? cand.paint : null);
  try { drawOfficeRoomScene(ctx, t, { floor, kind, style: 'glass' }); }
  finally { setOfficeDiners(was); }
}
