// Whoever works the lobby COFFEE SHOP counter: the barista frothing milk, bake-off pick C, 12 Oct
// 2026 (src/dev/office-barista-candidates.js keeps the other four). rooms.js calls the painter twice
// through its setOfficeBarista seam: 'back' stands behind the espresso machine and the counter
// front, so the counter hides everything below its top; 'front' adds what reaches over the machine
// or rests on the counter. bar = {kitchen, top}: kitchen is the counter unit's left edge in the
// room's mid-layer units and top the counter top's y. The machine spans kitchen+9..+57 and stands
// 28 tall on the counter; the barista stands to its right at kitchen+76, shoulders 16 above the top.
import { box, rbox, line, lines, poly, circ, pen, M89 } from './line.js';
import { head, padded } from './room.js';

const LWM = 0.5, SKIN_INK = 0.35;
const APRON = '#4a3029', LOGO = '#f4ecd2', CHROME = '#c9ced8', CHROME_DK = '#8e95a4';
const BX = 76, SHOULDER = 16, NECK = 5.5;

const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const cycle = (t, period, off = 0) => (((t / period + off) % 1) + 1) % 1;
function limb(g, pts, fill, w, ink) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
  pen(g, ink, w + 0.8); g.stroke();
  pen(g, fill, w); g.stroke();
}
// The uniform: shirt (candy-striped if asked), a brown bib apron with a cup on it, a name badge.
// It runs on below the counter top, which hides the rest.
function body(g, cx, sy, bottom, look, P) {
  const ink = P.inkM;
  padded(g, cx, sy, 17, bottom - sy, look.shirt, ink, LWM);
  if (look.stripes) {
    g.save();
    g.beginPath(); g.rect(cx - 8.5, sy, 17, bottom - sy); g.clip();
    for (let u = cx - 8; u < cx + 9; u += 2.4) box(g, u, sy, 1, bottom - sy, look.stripes);
    g.restore();
    padded(g, cx, sy, 17, bottom - sy, null, ink, LWM);
  }
  for (const s of [-1, 1]) line(g, cx + s * 5.4, sy + 3.6, cx + s * 5.8, bottom, ink, 0.35);
  poly(g, [cx - 4.8, sy + 4.8, cx + 4.8, sy + 4.8, cx + 5.4, bottom, cx - 5.4, bottom], APRON, ink, 0.4);
  lines(g, [cx - 4.4, sy + 4.8, cx - 2.4, sy + 0.4, cx + 4.4, sy + 4.8, cx + 2.4, sy + 0.4], APRON, 0.7);
  rbox(g, cx - 1.4, sy + 7.6, 2.8, 2.4, 0.6, LOGO);
  box(g, cx + 5.8, sy + 4.4, 2.6, 1.3, '#ffffff', ink, 0.25);
}
// a folded paper hat, the soda-fountain kind, sat on the head at (x, y)
function paperHat(g, x, y, P, col = '#ffffff', band = M89.pink, tilt = 0) {
  g.save();
  g.translate(x, y); g.rotate(tilt);
  poly(g, [-5.6, -3, 5.6, -3, 3.8, -7.6, -3.6, -7], col, P.inkM, 0.4);
  line(g, -5.3, -3.8, 5.3, -3.8, band, 0.9);
  g.restore();
}
function hand(g, x, y, skin, P) { circ(g, x, y, 1.4, skin, P.inkM, SKIN_INK); }

// A steel jug under the steam wand on the machine's side, jiggling, steam pouring off it, and a
// very big grin about it.
function frothingBarista(g, bar, f, P, pass) {
  const K = bar.kitchen, T = bar.top, cx = K + BX, ink = P.inkM;
  const sy = T - SHOULDER, hy = sy - NECK;
  const look = { shirt: '#bfe8e2', skin: '#c98e64' };
  const p = { skin: look.skin, hair: '#3a2a20', style: 'short', glasses: true };
  if (pass === 'back') {
    body(g, cx, sy, T + 6, look, P);
    head(g, cx, hy, 5, p, 'front', ink, LWM);
    // the grin, wider than head()'s smile
    g.beginPath(); g.moveTo(cx - 2.6, hy + 2.2); g.quadraticCurveTo(cx, hy + 4.8, cx + 2.6, hy + 2.2); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); pen(g, ink, 0.4); g.stroke();
    paperHat(g, cx, hy, P, '#ffffff', M89.pink, 0.06);
    return;
  }
  const jig = Math.sin(f.t * 15) * 0.45, jx = K + 61.5, jy = T - 12.5 + jig;
  // the wand out of the machine's side, down into the jug
  limb(g, [K + 57, T - 21, K + 60, T - 19, jx + 0.4, jy + 1.6], CHROME, 0.8, CHROME_DK);
  poly(g, [jx - 3, jy, jx + 3, jy, jx + 3.6, jy + 7.4, jx - 3.6, jy + 7.4], CHROME, ink, 0.4);
  line(g, jx - 2, jy + 1.4, jx - 2.4, jy + 6.4, '#f2f4f8', 0.6);
  poly(g, [jx - 3, jy, jx - 4.6, jy - 0.9, jx - 3.2, jy + 1.2], CHROME, ink, 0.3);
  for (let i = 0; i < 3; i++) {
    const k = cycle(f.t, 1.1, i / 3);
    circ(g, jx + Math.sin(k * 7 + i * 2) * 1.6, jy - 1 - k * 9, 1 + k * 1.2, `rgba(250,246,238,${0.8 * (1 - k)})`);
  }
  // one hand on the jug's handle, the other flat on the counter
  limb(g, [cx - 6.8, sy + 3, cx - 9.4, sy + 9, jx + 4.6, jy + 3.6], look.shirt, 2.3, ink);
  hand(g, jx + 4.2, jy + 3.6, look.skin, P);
  hand(g, cx + 6.6, T + 0.6, look.skin, P);
}

export { frothingBarista, body, paperHat, hand, limb, smooth, cycle, BX, SHOULDER, NECK, LWM, SKIN_INK, CHROME, CHROME_DK };
