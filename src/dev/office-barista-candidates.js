// CORPORATE KOMBAT — barista bake-off (Peter, 12 Oct 2026: "should the coffee stand be manned" ...
// "bake off please"). PICKED C, frothing milk, the same day ("i like the frothing milk barista"): it
// ships from officeLigne/barista.js and is imported back here; the rest are candidates only.
//
// Each candidate paints whoever works the counter through the setOfficeBarista seam in rooms.js,
// called twice: 'back' (behind the espresso machine and the counter front, so the counter hides
// everything below its top) and 'front' (what sits on or reaches over the counter top). bar =
// {kitchen, top}: kitchen is the counter unit's left edge in the room's mid-layer units and top the
// counter top's y (lowered the same day to MID_BASE-39); the machine spans kitchen+9..+57 and stands
// 28 tall on it, with its two spouts at +19 and +39. The barista stands to the right of the machine,
// at kitchen+76, shoulders 16 above the counter top.
import { box, rbox, line, lines, circ, ell, pen, letters, M89 } from '../engine/stylePacks/officeLigne/line.js';
import { head } from '../engine/stylePacks/officeLigne/room.js';
import { setOfficeBarista } from '../engine/stylePacks/officeLigne/rooms.js';
import { frothingBarista, body, paperHat, hand, limb, smooth, cycle, BX, SHOULDER, NECK, LWM, CHROME, CHROME_DK } from '../engine/stylePacks/officeLigne/barista.js';
import { drawOfficeRoomScene } from './office-production.js';

// head height and shoulder line for a barista standing behind a counter whose top is at T
const at = (bar) => { const sy = bar.top - SHOULDER; return { K: bar.kitchen, T: bar.top, cx: bar.kitchen + BX, sy, hy: sy - NECK }; };
function visor(g, x, y, P, col) {
  rbox(g, x - 5.3, y - 3.8, 10.6, 2, 0.9, col, P.inkM, 0.35);
  ell(g, x, y - 2, 6.4, 1.3, col, P.inkM, 0.35);
}

// ---------------------------------------------------------------- A. pulling a shot
// The pro: moustache, paper hat, watching the cup as he works an old lever machine. The lever
// stands on the machine's top; he hauls it down, holds, and lets it ride back up.
function pullingAShot(g, bar, f, P, pass) {
  const { K, T, cx, sy, hy } = at(bar), ink = P.inkM;
  const look = { shirt: '#ffffff', skin: '#e7b78e' };
  const p = { skin: look.skin, hair: '#6b4529', style: 'short', glasses: false };
  const ph = cycle(f.t, 4.2), pull = smooth(0.05, 0.25, ph) * (1 - smooth(0.62, 0.9, ph));
  // a short lever on the machine's top corner: resting up and to the right, hauled level
  const piv = [K + 53, T - 27], ang = -0.95 + pull * 0.95;
  const tip = [piv[0] + Math.cos(ang) * 8, piv[1] + Math.sin(ang) * 8];
  if (pass === 'back') {
    body(g, cx, sy, T + 6, look, P);
    head(g, cx - 0.6, hy, 5, p, 'left', ink, LWM);
    rbox(g, cx - 5.6, hy + 1.6, 2.8, 1.1, 0.5, '#3a2a20');
    paperHat(g, cx - 0.4, hy, P, '#ffffff', M89.teal, -0.08);
    return;
  }
  // the lever, its ball, and the shot's steam once it is pulled
  line(g, piv[0], piv[1], tip[0], tip[1], CHROME_DK, 1.6);
  line(g, piv[0], piv[1], tip[0], tip[1], CHROME, 0.7);
  circ(g, tip[0], tip[1], 1.6, '#24222c', ink, 0.3);
  circ(g, piv[0], piv[1], 1.4, CHROME, ink, 0.35);
  if (pull > 0.6) for (let i = 0; i < 2; i++) {
    const k = cycle(f.t, 0.9, i * 0.5);
    circ(g, K + 39 + Math.sin(k * 6 + i) * 0.8, T - 9 - k * 7, 0.9 + k * 0.8, `rgba(250,246,238,${0.75 * (1 - k)})`);
  }
  limb(g, [cx - 6.6, sy + 3, cx - 10.5, sy + 8.5, tip[0] + 1.2, tip[1] + 0.8], look.shirt, 2.3, ink);
  hand(g, tip[0] + 0.6, tip[1] + 0.4, look.skin, P);
  // the other hand on the counter
  hand(g, cx + 6.4, T + 0.6, look.skin, P);
}

// ---------------------------------------------------------------- B. bored teen
// Big perm, a candy-striped shirt, a teal visor, chin on her fist, blowing a bubble that pops.
function boredTeen(g, bar, f, P, pass) {
  const { T, cx, sy, hy: headY } = at(bar), ink = P.inkM;
  const look = { shirt: '#f6c2d6', stripes: '#ffffff', skin: '#f3cfae' };
  const p = { skin: look.skin, hair: '#e2b45a', style: 'perm', glasses: false };
  const tilt = 0.2, hx = cx + 1.6, hy = headY + 1.6;
  if (pass === 'back') {
    body(g, cx, sy + 1, T + 6, look, P);
    g.save();
    g.translate(hx, hy); g.rotate(tilt);
    head(g, 0, 0, 5, p, 'front', ink, LWM);
    visor(g, 0, 0, P, M89.teal);
    // the bubble: blown up over a few seconds, then gone with a snap
    const ph = cycle(f.t, 3.6), r = ph < 0.8 ? 0.6 + smooth(0, 0.78, ph) * 3.2 : 0;
    if (r > 0) {
      circ(g, 0, 3.4 + r * 0.55, r, 'rgba(255,111,174,0.92)', ink, 0.35);
      circ(g, -r * 0.35, 3.4 + r * 0.25, r * 0.25, 'rgba(255,255,255,0.7)');
    } else {
      lines(g, [-2.6, 3.6, -3.6, 2.8, 2.6, 3.6, 3.6, 2.8, 0, 4.2, 0, 5.4], M89.pink, 0.6);
    }
    g.restore();
    return;
  }
  // the elbow on the counter, the forearm up to a fist under her chin
  limb(g, [cx + 7.6, sy + 3.4, cx + 9.4, T - 0.6, cx + 5.4, hy + 5.4], look.shirt, 2.3, ink);
  hand(g, cx + 5, hy + 5.8, look.skin, P);
  hand(g, cx - 6.8, T + 0.6, look.skin, P);
}

// ---------------------------------------------------------------- C. frothing milk — SHIPS
// officeLigne/barista.js frothingBarista.

// ---------------------------------------------------------------- D. asleep on the counter
// Head down on folded arms, the hat slipped, the Zs going up.
function asleep(g, bar, f, P, pass) {
  const { T, cx, sy } = at(bar), ink = P.inkM;
  const look = { shirt: '#ffffff', skin: '#f6d9bf' };
  const p = { skin: look.skin, hair: '#6b4529', style: 'short', glasses: false };
  const breathe = Math.sin(f.t * 1.4) * 0.5;
  if (pass === 'back') {
    body(g, cx, sy + 5 + breathe, T + 6, look, P);
    return;
  }
  // the folded arms on the counter, then the head on them, seen from the top
  rbox(g, cx - 10, T - 4.4, 20, 4.8, 2.2, look.shirt, ink, 0.45);
  line(g, cx - 1, T - 4, cx + 1, T - 0.2, ink, 0.35);
  hand(g, cx - 8.6, T - 1.4, look.skin, P);
  hand(g, cx + 8.6, T - 1.4, look.skin, P);
  head(g, cx, T - 7.6 + breathe, 5, p, 'back', ink, LWM);
  paperHat(g, cx + 1.8, T - 7.4 + breathe, P, '#ffffff', M89.teal, 0.5);
  for (let i = 0; i < 2; i++) {
    const k = cycle(f.t, 2.4, i * 0.5);
    letters(g, 'Z', cx + 6 + k * 5, T - 12 - k * 12, 2.6 + k * 1.8, { ink: `rgba(179,154,230,${1 - k})`, lw: 0.5 });
  }
}

// ---------------------------------------------------------------- E. behind the paper
// A broadsheet held up across the face, the hat over the top. Every few seconds it dips and two
// eyes check whether anyone wants a coffee.
function behindThePaper(g, bar, f, P, pass) {
  const { K, T, cx, sy, hy } = at(bar), ink = P.inkM;
  const look = { shirt: '#d6c8f0', skin: '#93603f' };
  const p = { skin: look.skin, hair: '#2a2a30', style: 'short', glasses: false };
  if (pass !== 'back') return;
  const ph = cycle(f.t, 5.5), dip = smooth(0.55, 0.65, ph) * (1 - smooth(0.82, 0.92, ph)) * 5;
  const look2 = Math.sin(f.t * 2.2) > 0 ? 0.5 : -0.5;
  body(g, cx, sy, T + 6, look, P);
  head(g, cx, hy, 5, p, 'front', ink, LWM);
  // the eyes over the top of the paper, glancing about
  if (dip > 3.5) for (const s of [-1, 1]) circ(g, cx + s * 1.75 + look2, hy, 0.7, P.ink);
  paperHat(g, cx, hy, P, '#ffffff', M89.pink, -0.05);
  const x0 = K + 60, x1 = K + 92, y0 = hy - 4.1 + dip, y1 = T - 0.4;
  box(g, x0, y0, x1 - x0, y1 - y0, '#f1ecdf', ink, 0.45);
  line(g, (x0 + x1) / 2, y0 + 0.4, (x0 + x1) / 2, y1 - 0.4, 'rgba(36,34,46,0.25)', 0.5);
  letters(g, 'THE DAILY YOLK', x0 + 8, y0 + 3.6, 1.9, { ink: P.ink, lw: 0.3, align: 'center' });
  letters(g, 'EGGS', x0 + 8, y0 + 8.4, 3.6, { ink: P.ink, lw: 0.55, align: 'center' });
  letters(g, 'UP 2%', x0 + 8, y0 + 12.6, 3.6, { ink: P.ink, lw: 0.55, align: 'center' });
  for (let r = 0; r < 4; r++) line(g, x0 + 2.4, y0 + 15.4 + r * 1.8, x0 + 13.6, y0 + 15.4 + r * 1.8, 'rgba(36,34,46,0.3)', 0.5);
  box(g, x0 + 18, y0 + 2.4, 11.4, 7, '#b9c6cc', ink, 0.3);
  for (let r = 0; r < 6; r++) line(g, x0 + 18, y0 + 11.6 + r * 1.8, x0 + 29.6, y0 + 11.6 + r * 1.8, 'rgba(36,34,46,0.3)', 0.5);
  for (const hx of [x0 - 0.2, x1 + 0.2]) hand(g, hx, y0 + 7, look.skin, P);
}

export const BARISTAS = [
  { letter: 'A', name: 'Pulling a shot', note: 'The pro: moustache, paper hat, hauling on an old lever machine and watching the cup.', paint: pullingAShot },
  { letter: 'B', name: 'Bored teen', note: 'Big perm, candy stripes, teal visor, chin on her fist, blowing a bubble till it pops.', paint: boredTeen },
  { letter: 'C', name: 'Frothing milk — SHIPS', note: 'A steel jug jiggling under the steam wand, steam pouring off it, a very big grin. Picked 12 Oct 2026.', paint: frothingBarista },
  { letter: 'D', name: 'Asleep on the counter', note: 'Head down on folded arms, hat slipping, Zs going up.', paint: asleep },
  { letter: 'E', name: 'Behind the paper', note: 'THE DAILY YOLK held up across the face (EGGS UP 2%); every few seconds it dips and the eyes check for customers.', paint: behindThePaper },
];

// The counter with nobody behind it, as it was before the pick (but at the new counter height).
export const EMPTY = { letter: 'EMPTY', name: 'nobody', note: 'The counter unmanned, as it was until 12 Oct 2026.', paint: () => {} };

// The lobby's coffee shop in the production pack with a candidate behind the counter; null = what ships.
export function drawBaristaRoom(ctx, t, cand) {
  const was = setOfficeBarista(cand ? cand.paint : null);
  try { drawOfficeRoomScene(ctx, t, { floor: 'lobby', kind: 'cafe', style: 'glass' }); }
  finally { setOfficeBarista(was); }
}
