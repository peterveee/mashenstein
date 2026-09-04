// Don K. Eggshell, redesigned: twenty options for an OPEN bake-off.
//
// Peter, 4 Sep 2026: "i like our main eggman villain, but i would like some
// redesigns... no armour? an egg like vehicle? different facial hair (no
// facial hair) or different hair styles. go as creative as you want, give me
// 20 options."
//
// The villain that ships is an ape in a clown-copter tub (sprites/props.js,
// settled 4 Sep). Nothing here replaces him: every BUST option below is the
// shipped painter with ONE part swapped through the EGGSHELL_PARTS seam, so
// what differs from the copter in the lane is exactly the mark the tile names
// — the way hero candidates ride drawToon's spec/pal seam. The VEHICLE options
// keep the shipped ape whole and change what is around him.
//
// NOTHING HERE IS REGISTERED. These painters reach the gallery through
// drawEggshellRedesign and nowhere else. Promoting a bust option means making
// its part the default in props.js (one function); promoting a vehicle means
// copying its painter there and giving it a def, the move the copter took.
import { eggshellApe, eggshellCopterArt, EGGSHELL_ART as A, EGGSHELL_PARTS } from '../sprites/props.js';

const {
  P, line, dot, egg, mustache, goggles, spikesArc, rr, TAU,
  INK, CREAM, RED, FUR, GOLD, LENS, LINE, LW, GREEN, GREEN_DK,
} = A;
const WHITE = '#f0f0f6', DARK_HAIR = '#1a1410', STEEL = '#3a3f4a', STEEL_LT = '#c8ced8';
// the no-song fallback: two turns a second, twelve frames a half-turn
const FRAME = (t) => Math.floor(t * 2 * 24) % 12;
const copter = (c, t, o) => eggshellCopterArt(c, 28, 28, FRAME(t), o);

// ------------------------------------------------------------------ helpers
// A cracked shell's edge from (x0, y) to (x1, y): n teeth standing `up`, tall
// and short by turns so it reads as a break and not a crown.
function crackedRim(k, x0, x1, y, n, up) {
  const w = (x1 - x0) / n;
  k.lineTo(x0, y);
  for (let i = 0; i < n; i++) {
    const h = up * (i % 3 === 1 ? 1 : i % 3 === 2 ? 0.55 : 0.8);
    k.lineTo(x0 + w * (i + 0.5), y - h);
    k.lineTo(x0 + w * (i + 1), y);
  }
}
// The bottom of a broken egg: a cracked rim, then a bowl `h` deep. k1 shapes
// the bowl — 0.8 is a bucket with a round floor, 0.45 tapers like an egg.
function shellBowl(c, cx, rimY, rx, h, lw, teeth = 8, up = 2, k1 = 0.8) {
  P(c, CREAM, (k) => {
    k.moveTo(cx - rx, rimY);
    crackedRim(k, cx - rx, cx + rx, rimY, teeth, up);
    k.bezierCurveTo(cx + rx, rimY + h * k1, cx + rx * 0.55, rimY + h, cx, rimY + h);
    k.bezierCurveTo(cx - rx * 0.55, rimY + h, cx - rx, rimY + h * k1, cx - rx, rimY);
    k.closePath();
  }, LINE, lw);
  // a hairline crack running down from one notch
  line(c, LINE, lw * 0.9, (k) => {
    k.moveTo(cx - rx * 0.42, rimY); k.lineTo(cx - rx * 0.36, rimY + h * 0.3); k.lineTo(cx - rx * 0.46, rimY + h * 0.5);
  });
}
// A jet flame pointing down from (x, y), flickering on t.
function flame(c, x, y, t, seed = 0, len = 3, wdt = 2.2) {
  const L = len * (1 + 0.18 * Math.sin(t * 31 + seed * 1.7) + 0.08 * Math.sin(t * 47 + seed));
  const tongue = (wf, lf, fill) => P(c, fill, (p) => {
    p.moveTo(x - wdt * wf / 2, y);
    p.quadraticCurveTo(x - wdt * wf * 0.5, y + L * lf * 0.6, x, y + L * lf);
    p.quadraticCurveTo(x + wdt * wf * 0.5, y + L * lf * 0.6, x + wdt * wf / 2, y);
    p.closePath();
  });
  tongue(1, 1, '#f2621d'); tongue(0.6, 0.65, '#ffb02e');
}
// A small open mouth, for the shocked face of a part that owns the mouth slot.
function gasp(c, X, Y, y = 0.53) {
  P(c, INK, (k) => k.ellipse(X(0.5), Y(y), X(0.035), Y(0.045), 0, 0, TAU));
}
// A smug little curve where the mustache was.
function smirk(c, X, Y, lw, shocked) {
  if (shocked) { gasp(c, X, Y, 0.5); return; }
  line(c, INK, lw * 1.3, (k) => { k.moveTo(X(0.45), Y(0.475)); k.quadraticCurveTo(X(0.5), Y(0.525), X(0.56), Y(0.465)); });
}

// ------------------------------------------------------- A. the shell
// A white coat's shoulders where the fur was, the collar turned up where the
// spikes were. The bow tie rides in the hands slot so it sits over the rim
// under his chin instead of behind his head.
function labCoat(c, X, Y, lw) {
  P(c, WHITE, (k) => k.ellipse(X(0.5), Y(0.63), X(0.3), Y(0.16), 0, 0, TAU), LINE, lw);
  for (const s of [-1, 1]) P(c, WHITE, (k) => {
    k.moveTo(X(0.5) + s * X(0.1), Y(0.6));
    k.lineTo(X(0.5) + s * X(0.27), Y(0.52));
    k.lineTo(X(0.5) + s * X(0.31), Y(0.38));
    k.lineTo(X(0.5) + s * X(0.2), Y(0.47));
    k.closePath();
  }, LINE, lw);
}
function bowTie(c, X, Y, lw) {
  EGGSHELL_PARTS.hands(c, X, Y, lw);
  for (const s of [-1, 1]) P(c, RED, (k) => {
    k.moveTo(X(0.5), Y(0.565)); k.lineTo(X(0.5) + s * X(0.07), Y(0.53)); k.lineTo(X(0.5) + s * X(0.07), Y(0.6)); k.closePath();
  }, LINE, lw * 0.6);
  dot(c, RED, X(0.5), Y(0.565), X(0.02));
}
// The name taken literally: the bottom of a cracked eggshell worn round the
// shoulders, its broken rim standing up behind his head.
function shellCollar(c, X, Y, lw) {
  const cx = X(0.5), cy = Y(0.62), rx = X(0.37), ry = Y(0.22);
  P(c, CREAM, (k) => {
    k.moveTo(cx - rx, cy);
    crackedRim(k, cx - rx, cx + rx, cy, 9, Y(0.3));
    k.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    k.closePath();
  }, LINE, lw);
}
// The green spikes moved onto his head.
function crest(c, X, Y, lw) {
  spikesArc(c, GREEN, X(0.5), Y(0.36), X(0.165), X(0.165), -Math.PI * 0.88, -Math.PI * 0.12, 5, 0.6, GREEN_DK, lw * 0.5);
}

// ------------------------------------------------------ B. facial hair
function goatee(c, X, Y, lw, shocked) {
  for (const s of [-1, 1]) line(c, RED, lw * 1.6, (k) => {
    k.moveTo(X(0.5), Y(0.455)); k.quadraticCurveTo(X(0.5) + s * X(0.07), Y(0.43), X(0.5) + s * X(0.12), Y(0.445));
  });
  P(c, RED, (k) => {
    k.moveTo(X(0.46), Y(0.5)); k.lineTo(X(0.54), Y(0.5));
    k.quadraticCurveTo(X(0.53), Y(0.55), X(0.5), Y(0.575));
    k.quadraticCurveTo(X(0.47), Y(0.55), X(0.46), Y(0.5));
    k.closePath();
  });
  if (shocked) gasp(c, X, Y, 0.48);
}
function chops(c, X, Y, lw, shocked) {
  for (const s of [-1, 1]) P(c, RED, (k) => {
    const x0 = X(0.5) + s * X(0.095);
    k.moveTo(x0, Y(0.38)); k.lineTo(x0 + s * X(0.05), Y(0.38));
    k.quadraticCurveTo(x0 + s * X(0.1), Y(0.46), x0 + s * X(0.07), Y(0.54));
    k.lineTo(x0 - s * X(0.005), Y(0.52)); k.closePath();
  });
  smirk(c, X, Y, lw, shocked);
}
function beard(c, X, Y, lw, shocked) {
  P(c, RED, (k) => {
    k.moveTo(X(0.385), Y(0.43));
    k.quadraticCurveTo(X(0.35), Y(0.52), X(0.42), Y(0.55));
    k.quadraticCurveTo(X(0.46), Y(0.6), X(0.5), Y(0.56));
    k.quadraticCurveTo(X(0.54), Y(0.6), X(0.58), Y(0.55));
    k.quadraticCurveTo(X(0.65), Y(0.52), X(0.615), Y(0.43));
    k.quadraticCurveTo(X(0.5), Y(0.48), X(0.385), Y(0.43));
    k.closePath();
  }, 'rgba(90,20,20,0.5)', lw * 0.8);
  EGGSHELL_PARTS.mouth(c, X, Y, lw, shocked);
}
function dali(c, X, Y, lw, shocked) {
  for (const s of [-1, 1]) {
    line(c, RED, lw * 2, (k) => {
      k.moveTo(X(0.5), Y(0.46));
      k.quadraticCurveTo(X(0.5) + s * X(0.1), Y(0.44), X(0.5) + s * X(0.16), Y(0.38));
      k.quadraticCurveTo(X(0.5) + s * X(0.2), Y(0.34), X(0.5) + s * X(0.2), Y(0.29));
    });
    line(c, RED, lw * 1.5, (k) => k.arc(X(0.5) + s * X(0.183), Y(0.275), X(0.017), s > 0 ? Math.PI * 0.5 : Math.PI * 0.5, s > 0 ? Math.PI * 2.2 : -Math.PI * 1.2, s < 0));
  }
  if (shocked) gasp(c, X, Y, 0.51);
}

// -------------------------------------------------------------- C. hair
// The whole head is the pale dome; fur survives only as a tuft over each ear.
function baldHead(c, X, Y, lw) {
  for (const s of [-1, 1]) dot(c, FUR, X(0.5) + s * X(0.15), Y(0.42), X(0.055), LINE, lw);
  P(c, CREAM, (k) => egg(k, X(0.5), Y(0.37), X(0.165), Y(0.2), 0.1), LINE, lw);
  dot(c, 'rgba(255,255,255,0.6)', X(0.455), Y(0.235), X(0.028));
}
function combover(c, X, Y, lw) {
  for (const [y0, y1, y2] of [[0.3, 0.19, 0.24], [0.33, 0.215, 0.27], [0.36, 0.24, 0.3]]) {
    line(c, DARK_HAIR, lw * 1.3, (k) => { k.moveTo(X(0.36), Y(y0)); k.quadraticCurveTo(X(0.5), Y(y1), X(0.64), Y(y2)); });
  }
}
function quiff(c, X, Y, lw) {
  P(c, DARK_HAIR, (k) => {
    k.moveTo(X(0.35), Y(0.3));
    k.quadraticCurveTo(X(0.22), Y(0.22), X(0.24), Y(0.08));
    k.quadraticCurveTo(X(0.26), Y(-0.03), X(0.42), Y(0.0));
    k.quadraticCurveTo(X(0.56), Y(0.02), X(0.66), Y(0.14));
    k.quadraticCurveTo(X(0.7), Y(0.2), X(0.65), Y(0.27));
    k.quadraticCurveTo(X(0.5), Y(0.15), X(0.35), Y(0.3));
    k.closePath();
  }, LINE, lw);
  line(c, '#6a5a58', lw * 1.5, (k) => { k.moveTo(X(0.27), Y(0.16)); k.quadraticCurveTo(X(0.3), Y(0.06), X(0.42), Y(0.04)); });
}
function tufts(c, X, Y, lw) {
  const cx = X(0.5), cy = Y(0.36), r = X(0.165);
  for (const s of [-1, 1]) for (const [a, len] of [[-1.0, 0.6], [-0.65, 0.75], [-0.3, 0.6]]) {
    const ang = s > 0 ? a : Math.PI - a, da = 0.16;
    const tip = ang - s * 0.22;
    const tx = cx + Math.cos(tip) * r * (1 + len), ty = cy + Math.sin(tip) * r * (1 + len);
    const mx = cx + Math.cos(ang - s * 0.05) * r * (1 + len * 0.5), my = cy + Math.sin(ang - s * 0.05) * r * (1 + len * 0.5);
    P(c, '#eeeef4', (k) => {
      k.moveTo(cx + Math.cos(ang - da) * r, cy + Math.sin(ang - da) * r);
      k.quadraticCurveTo(mx + s * 0.4, my - 0.5, tx, ty);
      k.quadraticCurveTo(mx - s * 0.3, my + 0.5, cx + Math.cos(ang + da) * r, cy + Math.sin(ang + da) * r);
      k.closePath();
    }, LINE, lw * 0.7);
  }
}
// A judge's powdered wig: a cap over the crown, rolls down the sides. He
// disputes jumps in writing; this is the uniform for it.
function wig(c, X, Y, lw) {
  const W = '#f2f2f6', cx = X(0.5), cy = Y(0.36), r = X(0.165);
  const R = r * 1.12, top = Y(0.27);
  const a = Math.asin((top - cy) / R);
  P(c, W, (k) => { k.arc(cx, cy, R, Math.PI - a, TAU + a); k.closePath(); }, LINE, lw);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) dot(c, W, cx + s * R, Y(0.34) + i * Y(0.085), X(0.04), LINE, lw);
  for (let i = -2; i <= 2; i++) dot(c, W, cx + i * X(0.055), top + X(0.005), X(0.023), LINE, lw * 0.8);
}

// ------------------------------------------------------ D. egg vehicles
// A cream egg the size of the copter box with a round hatch he looks out of;
// the shipped rotor sits on its point.
function eggPod(c) {
  const lw = LW, cx = 14;
  const hull = (k) => egg(k, cx, 21.5, 10, 10, -0.2);
  P(c, CREAM, hull, LINE, lw);
  c.save(); c.beginPath(); hull(c); c.clip();
  c.fillStyle = RED; c.fillRect(0, 22.4, 28, 2.2);
  c.restore();
  c.save(); c.beginPath(); c.arc(cx, 15.4, 5.4, 0, TAU); c.clip();
  c.fillStyle = '#d8d0b8'; c.fillRect(0, 0, 28, 28);
  eggshellApe(c, 2, 8, 0, { tub: null, hands: null });
  c.restore();
  line(c, '#8a8a98', 0.9, (k) => k.arc(cx, 15.4, 5.4, 0, TAU));
  line(c, LINE, lw, (k) => k.arc(cx, 15.4, 5.85, 0, TAU));
  dot(c, FUR, cx - 3.6, 19.6, 1.44, LINE, lw); dot(c, FUR, cx + 3.6, 19.6, 1.44, LINE, lw);
  dot(c, GOLD, 6.6, 23.5, 1.08, LINE, lw * 0.5); dot(c, GOLD, 21.4, 23.5, 1.08, LINE, lw * 0.5);
  for (const x of [7.5, 16.5]) P(c, CREAM, (k) => rr(k, x, 26.4, 4, 1.6, 0.5), LINE, lw * 0.7);
}
// The cracked bottom of the egg as the tub, with the tub's lamps and skids.
function halfShellTub(c, X, Y, lw) {
  shellBowl(c, X(0.5), Y(0.62), X(0.38), Y(0.33), lw, 8, Y(0.1), 0.8);
  dot(c, GOLD, X(0.22), Y(0.78), X(0.045), LINE, lw * 0.5); dot(c, GOLD, X(0.78), Y(0.78), X(0.045), LINE, lw * 0.5);
  for (const s of [0.3, 0.55]) P(c, CREAM, (k) => rr(k, X(s), Y(0.91), X(0.15), Y(0.08), X(0.02)), LINE, lw * 0.7);
}
// The cracked top of the egg as his helmet, the rotor mast through its point.
function eggCap(c, X, Y, lw) {
  const cx = X(0.5), base = Y(0.3), rx = X(0.2), ry = Y(0.27);
  P(c, CREAM, (k) => {
    k.moveTo(cx - rx, base);
    const n = 7, w = 2 * rx / n;
    for (let i = 0; i < n; i++) { k.lineTo(cx - rx + w * (i + 0.5), base + Y(0.05) * (i % 2 ? 1 : 0.6)); k.lineTo(cx - rx + w * (i + 1), base); }
    k.ellipse(cx, base, rx, ry, 0, 0, Math.PI, true);
    k.closePath();
  }, LINE, lw);
}
// Breakfast: the half-shell in a striped egg cup on a foot, hovering, with
// the spoon still in it.
function eggCup(c) {
  const lw = LW, cx = 14;
  P(c, 'rgba(90,176,240,0.7)', (k) => k.ellipse(cx, 31, 6, 0.9, 0, 0, TAU));
  P(c, CREAM, (k) => rr(k, cx - 5, 28.6, 10, 2, 0.8), LINE, lw);
  P(c, CREAM, (k) => { k.moveTo(cx - 2.2, 28.6); k.lineTo(cx - 3.2, 25.6); k.lineTo(cx + 3.2, 25.6); k.lineTo(cx + 2.2, 28.6); k.closePath(); }, LINE, lw);
  // the spoon, leaning in the cup behind him
  line(c, STEEL_LT, 0.8, (k) => { k.moveTo(cx + 7.5, 20.5); k.lineTo(cx + 11.5, 13); });
  P(c, STEEL_LT, (k) => k.ellipse(cx + 12, 11.8, 1.6, 2.2, 0.5, 0, TAU), LINE, lw * 0.6);
  eggshellApe(c, 2, 6, 0, { tub: (k, X, Y, w) => shellBowl(k, X(0.5), Y(0.62), X(0.36), Y(0.32), w, 8, Y(0.1), 0.8) });
  const cup = (k) => { k.moveTo(cx - 8.5, 20); k.quadraticCurveTo(cx - 8, 26.5, cx, 26.5); k.quadraticCurveTo(cx + 8, 26.5, cx + 8.5, 20); k.closePath(); };
  P(c, WHITE, cup, LINE, lw);
  c.save(); c.beginPath(); cup(c); c.clip();
  c.fillStyle = RED;
  for (const x of [cx - 6.2, cx - 1, cx + 4.2]) c.fillRect(x, 20, 2, 7);
  c.restore();
  P(c, '#d0d0dc', (k) => rr(k, cx - 9, 19.4, 18, 1.4, 0.6), LINE, lw * 0.7);
}
// Humpty on legs: the cracked egg on two thin bird legs, walking. The one
// ground option — he would come at you along the floor.
function walker(c, t) {
  const lw = LW, cx = 14, ph = t * 7;
  for (const [s, off] of [[-1, 0], [1, Math.PI]]) {
    const sw = Math.sin(ph + off), lift = Math.max(0, Math.cos(ph + off)) * 1.6;
    const hx = cx + s * 3.5, hy = 25;
    const kx = hx + sw * 2, ky = 29 - lift * 0.5;
    const fx = hx + sw * 3.6, fy = 33 - lift;
    line(c, STEEL, 1.2, (k) => { k.moveTo(hx, hy); k.lineTo(kx, ky); k.lineTo(fx, fy); });
    for (const dx of [-2, 0, 2]) line(c, STEEL, 0.9, (k) => { k.moveTo(fx, fy); k.lineTo(fx + dx, fy + 1); });
  }
  eggshellApe(c, 2, 6, 0, {
    tub: (k, X, Y, w) => {
      shellBowl(k, X(0.5), Y(0.62), X(0.39), Y(0.42), w, 8, Y(0.1), 0.45);
      dot(k, GOLD, X(0.24), Y(0.8), X(0.045), LINE, w * 0.5); dot(k, GOLD, X(0.76), Y(0.8), X(0.045), LINE, w * 0.5);
    },
  });
}
// An egg on its side as an airship: pointed nose, a three-quarter pusher
// prop at the blunt end, red fins, and him in a cockpit cut into the top.
function zeppelin(c, t) {
  const lw = LW, cx = 22, cy = 18, ry = 8.5, rxL = 11, rxR = 16;
  const hull = (k) => {
    k.ellipse(cx, cy, rxL, ry, 0, Math.PI / 2, Math.PI * 1.5);
    k.ellipse(cx, cy, rxR, ry, 0, -Math.PI / 2, Math.PI / 2);
    k.closePath();
  };
  for (const s of [-1, 1]) P(c, RED, (k) => { k.moveTo(14, cy + s * 7); k.lineTo(9, cy + s * 11.5); k.lineTo(11.5, cy + s * 4); k.closePath(); }, LINE, lw);
  P(c, CREAM, hull, LINE, lw);
  c.save(); c.beginPath(); hull(c); c.clip();
  c.fillStyle = RED; c.fillRect(0, 20, 40, 2.4);
  c.restore();
  dot(c, GOLD, 36.4, cy, 1.1, LINE, lw * 0.5);
  P(c, STEEL, (k) => k.ellipse(24, 9.7, 8, 1.6, 0, 0, TAU));
  eggshellApe(c, 12, -2, 0, { tub: null });
  // the prop: tipped three-quarter so it reads as a prop and not a line
  const hx = 9.5, sqz = 0.42, a = t * 5 * TAU, R = 6.5;
  P(c, STEEL, (k) => rr(k, hx - 0.5, cy - 1.6, 3, 3.2, 0.8), LINE, lw * 0.6);
  line(c, 'rgba(206,212,228,0.5)', 1.8, (k) => k.ellipse(hx, cy, R * 0.85 * sqz, R * 0.85, 0, a - 1.3, a));
  for (let i = 0; i < 3; i++) {
    const b = a + i * TAU / 3;
    line(c, '#2a2a34', 1.3, (k) => { k.moveTo(hx, cy); k.lineTo(hx + Math.cos(b) * R * sqz, cy + Math.sin(b) * R); });
    line(c, '#9a9aa8', 0.45, (k) => { k.moveTo(hx + Math.cos(b) * R * 0.2 * sqz, cy + Math.sin(b) * R * 0.2); k.lineTo(hx + Math.cos(b) * R * 0.9 * sqz, cy + Math.sin(b) * R * 0.9); });
  }
  dot(c, '#8a8a98', hx, cy, 1.1, LINE, 0.5);
}
// The Robotnik move: the hull wears his face. Goggles and mustache painted on
// a hover-egg, and him in a hatch on the crown, so the ship has two faces
// and both are his.
function faceShip(c, t) {
  const lw = LW, cx = 15;
  P(c, 'rgba(90,176,240,0.7)', (k) => k.ellipse(cx, 28.3, 9, 1.2, 0, 0, TAU));
  P(c, CREAM, (k) => egg(k, cx, 22.4, 12, 8, -0.15), LINE, lw);
  goggles(c, cx, 18.5, 2.3, 2.2, [cx - 9.5, cx + 9.5]);
  mustache(c, cx, 22.6, 6.5, 2);
  P(c, STEEL, (k) => k.ellipse(cx, 12.6, 6.5, 1.5, 0, 0, TAU));
  eggshellApe(c, 3, 1, 0, { tub: null });
  flame(c, 5, 25.4, t, 0, 2.4, 1.8); flame(c, 25, 25.4, t, 1, 2.4, 1.8);
}

// ---------------------------------------------------------- E. wildcard
// Sunny side up: a hovering frying pan, and the yolk is his seat.
function sunnySide(c, t) {
  const lw = LW, px = 22, py = 18;
  P(c, '#2a2a30', (k) => rr(k, 0.5, py - 1.4, 9, 2.8, 1.2), LINE, lw);
  line(c, '#4a4a54', 0.6, (k) => { k.moveTo(1.5, py - 0.4); k.lineTo(8, py - 0.4); });
  P(c, '#2a2a30', (k) => k.ellipse(px, py, 16, 4.6, 0, 0, TAU), LINE, lw);
  line(c, '#5a5a66', 0.8, (k) => k.ellipse(px, py - 0.4, 15, 3.9, 0, 0, TAU));
  P(c, '#f8f8f4', (k) => k.ellipse(px - 3, py - 0.6, 9.5, 3, 0, 0, TAU), LINE, lw * 0.6);
  P(c, '#f8f8f4', (k) => k.ellipse(px + 4, py - 0.2, 8.5, 2.8, 0, 0, TAU));
  dot(c, GOLD, px, py - 1.5, 4.8, '#c8900c', lw);
  eggshellApe(c, px - 12, py - 13.1, 0, { tub: null, hands: null });
  P(c, '#f8f8f4', (k) => k.ellipse(px, py - 1.4, 13.5, 3.4, 0, 0, Math.PI));
  P(c, GOLD, (k) => k.ellipse(px, py - 1.5, 4.8, 2.4, 0, 0, Math.PI), '#c8900c', lw);
  dot(c, FUR, px - 4, py - 1.2, 1.44, LINE, lw); dot(c, FUR, px + 4, py - 1.2, 1.44, LINE, lw);
  flame(c, px - 7, py + 4.4, t, 0); flame(c, px + 7, py + 4.4, t, 1);
}

// ------------------------------------------------ F. the silver professor
// Peter, 4 Sep 2026, from a written brief: "a bureaucrat villain with a
// slightly younger look. Silver hair, a clean trim silver moustache and a
// neat goatee. Dark, sharp rectangular eyeglasses. Oval/egg-like head with
// minimal facial details. Flat vector: simple primitives, clean uniform dark
// outlines, flat solid fills, no gradients, no hatching, no shadows."
//
// Round two, with a reference picture: "NO CAP. Do some hair variations. I
// want SPIKY, UNKEMPT." The mortarboard is gone from every cut and the hair is
// the whole question — so the head, specs and facial hair are IDENTICAL in all
// of them and only the locks change. That is what the parts seam is for: the
// tiles differ in one mark.
//
// The brief's style rules are already how these painters draw, so every mark
// below is a flat fill plus the villain's own EG_LINE contour at EG_LW, the
// weight the shipped copter uses. What a tile tests is the design, not the line.
// HAIR TONE is a bake-off (group H): Peter asked for "more silver grey than
// white". Each entry is [the lit tone the front locks and the facial hair take,
// the shaded tone the locks behind the skull take] — one pair, so a tile cannot
// end up with grey hair and a white moustache.
//
// TONE is module state rather than a parameter because the hair is drawn by the
// head part and the moustache by the mouth part, and the two must agree. Each
// professor() part sets it on entry and restores it on the way out, so nothing
// leaks between tiles no matter what order the gallery paints them in.
const HAIR_TONE = {
  white: ['#dfe2ea', '#c6cbd9'],
  silver: ['#cdd3e0', '#b1b9ca'],
  steel: ['#bcc3d2', '#a0a8bb'],
  pewter: ['#adb4c3', '#9199ac'],
  warm: ['#ccc9c6', '#b0aca8'],
  slate: ['#9fa7b7', '#858da0'],
};
let TONE = HAIR_TONE.white;
const tinted = (tone, fn) => (c, X, Y, lw, shocked) => {
  const prev = TONE;
  TONE = tone;
  try { fn(c, X, Y, lw, shocked); } finally { TONE = prev; }
};
const SKIN = '#eec9a8';
// ------------------------------------------------------- the villain's ink
// Peter, 4 Sep: "draw the character with fine lines like the heroes." The
// heroes ink their contour with ONE colour at two strengths (toons.js:
// OUTLINE_A 0.32, SKIN_OUTLINE_A 0.2 on bare hide, both rgba(26,16,40)) at
// hairline widths. The shipped villain runs heavier ON PURPOSE — EG_LW 0.3u at
// 55%, set that way because the copter sits on the pale sky band where a
// hero-weight line goes soft — so this is a local override for the professor's
// own marks, not a change to him. His tub and fists are still the shipped
// painter's, at the shipped weight: if this look wins, that difference is the
// thing to settle next.
const PRO_INK = 'rgba(26,16,40,0.32)';
const PRO_SKIN = 'rgba(26,16,40,0.2)';
const PRO_LW = 0.0105 * 24;

// ------------------------------------------------------------ spiky hair
// Every style is a list of LOCKS around one skull. A lock is an angle on the
// skull, a length as a fraction of the skull's radius, how wide its root is,
// and how far its tip bends off the root's direction — four numbers, so a
// style is a table and two styles differ by numbers rather than by drawing.
// Canvas angles: -90 is straight up, 180 is his right (screen left).
//
// The spike shape is the reference's: a wide root, one edge nearly straight
// and the other bellied out, meeting at a point. Drawn as two quadratics, so
// it is still the flat-vector vocabulary — no hatching, no taper by shading.
// HAIR_DROP is where the locks are ROOTED, as a fraction of the box, and it is
// the knob this design was tuned on. Two things were tried and rejected on
// 4 Sep: a filled hair mass with a jagged fringe across the brow ("don't love
// the fringe"), and the locks worn LOWER on a dropped skull to eat the
// forehead. Peter: "go back to the original round head with forehead... wear
// the locks higher so the head is round, like the early iteration." So it is
// NEGATIVE: the roots sit above the skull's equator, the round crown shows
// under them, and the forehead is the face's own.
const SKULL = { fx: 0.5, fy: 0.37, frx: 0.165, fry: 0.2 };
const HAIR_DROP = -0.02;
// ROOT_K IS WHY THE HAIR IS ATTACHED. A lock whose base sits exactly ON the
// skull outline is tangent to the head, and once the root arc is lifted at all
// the bases at the sides land clear of it — the spikes ring the head like the
// petals of a daisy with a gap behind them. Peter, 4 Sep: "hair isn't attached
// to head." So every base is pulled INSIDE the skull: the wedge starts under
// the scalp and grows out through it, which is also how hair works.
const ROOT_K = 0.86;
const RAD = Math.PI / 180;
function lock(c, X, Y, lw, fill, [deg, len, spread, curl]) {
  const cx = X(SKULL.fx), cy = Y(SKULL.fy + HAIR_DROP), rx = X(SKULL.frx), ry = Y(SKULL.fry);
  const px = (d, k = 1) => cx + Math.cos(d * RAD) * rx * k;
  const py = (d, k = 1) => cy + Math.sin(d * RAD) * ry * k;
  const tip = deg + curl;
  P(c, fill, (k) => {
    k.moveTo(px(deg - spread, ROOT_K), py(deg - spread, ROOT_K));
    k.quadraticCurveTo(px(deg - spread * 0.5, 1 + len * 0.55), py(deg - spread * 0.5, 1 + len * 0.55),
      px(tip, 1 + len), py(tip, 1 + len));
    k.quadraticCurveTo(px(deg + spread * 1.15, 1 + len * 0.3), py(deg + spread * 1.15, 1 + len * 0.3),
      px(deg + spread, ROOT_K), py(deg + spread, ROOT_K));
    k.closePath();
  }, PRO_INK, PRO_LW);
}
// A style is { back, front }: the locks BEHIND the skull, drawn in the head
// slot before the dome so the skull covers their roots, and the locks in FRONT,
// drawn in the hair slot over the dome. Back locks are a shade darker — the
// only depth cue a flat drawing gets, and it is a second flat fill, not a ramp.
const HAIR_STYLES = {
  // The reference: one big mass swept up and across the crown, spikes flying
  // off both sides, longest at the temples. Unkempt but with a direction.
  mane: {
    back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
      [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
    front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
      [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
  },
  // Straight out in every direction with no sweep: the mad-scientist read,
  // the tallest of the five. Lengths alternate long/short and the tips bend a
  // few degrees either way — even spikes on a circle read as a DAISY.
  blast: {
    back: [[-160, 1.05, 15, -4], [-176, 0.78, 13, 6], [164, 0.9, 14, -5], [146, 0.6, 14, 4],
      [-20, 0.95, 15, 5], [-4, 0.7, 13, -6], [16, 0.98, 14, 4], [34, 0.55, 14, -4]],
    front: [[-138, 1.12, 17, 6], [-116, 0.85, 15, -7], [-92, 1.25, 16, 4], [-68, 0.92, 15, -6], [-46, 1.15, 17, 5]],
  },
  // One tall fan forward over the brow, the sides cropped to short spikes:
  // the tidiest of the unkempt, and the only one with a front silhouette.
  quiff: {
    back: [[-158, 0.42, 13, 10], [-172, 0.38, 12, 12], [-24, 0.42, 13, -10], [-8, 0.38, 12, -12]],
    front: [[-136, 1.15, 15, -20], [-112, 1.3, 15, -16], [-90, 1.25, 14, -12], [-68, 1.0, 14, -8],
      [-48, 0.7, 13, -6]],
  },
};
const hairBack = (name) => (c, X, Y, lw) => { for (const l of HAIR_STYLES[name].back) lock(c, X, Y, lw, TONE[1], l); };
const hairFront = (name) => (c, X, Y, lw) => { for (const l of HAIR_STYLES[name].front) lock(c, X, Y, lw, TONE[0], l); };
// The head: one flat fill, no face-plate and no fur — the mark that stops him
// reading as an ape. NOT a circle. Peter, 4 Sep: "vaguely upside-down egg, not
// too pointy" — so the crown is the wide end and the jaw the narrow one, which
// the file's own egg() cannot do (it varies the two halves' HEIGHT and keeps
// one width, which is a tall dome over a shallow bowl, not a taper).
//
// Four beziers instead: the widest line sits above centre, the lower handles
// pull in to `taper` of the half-width, and the chin lands as a round point
// rather than a spout. taper 1 is an ellipse; 0.5 is a lightbulb.
function headEgg(k, cx, cy, rx, ry, taper = 0.7, widest = -0.16) {
  const wy = cy + ry * widest, top = cy - ry, bot = cy + ry, h = 0.56;
  k.moveTo(cx, top);
  for (const s of [1, -1]) {
    if (s < 0) { k.bezierCurveTo(cx - rx * taper * 0.9, bot - (bot - wy) * 0.1, cx - rx, wy + (bot - wy) * h * 0.92, cx - rx, wy); k.bezierCurveTo(cx - rx, wy - (wy - top) * h, cx - rx * h, top, cx, top); continue; }
    k.bezierCurveTo(cx + rx * h, top, cx + rx, wy - (wy - top) * h, cx + rx, wy);
    k.bezierCurveTo(cx + rx, wy + (bot - wy) * h * 0.92, cx + rx * taper * 0.9, bot - (bot - wy) * 0.1, cx, bot);
  }
  k.closePath();
}
const HEAD = (k, X, Y) => headEgg(k, X(0.5), Y(0.375), X(0.168), Y(0.215));
// EARS, drawn after the locks and before the skull, so the dome covers their
// inner edge (they cannot float) and the hair falls BEHIND them, which is
// where hair goes. One flat skin oval tipped outward, one darker inner curve —
// the same two-mark budget every other feature on this face gets. The specs'
// arms already run to this x, so they land on the ear rather than in the air.
function ears(c, X, Y) {
  for (const sd of [-1, 1]) {
    const x = X(0.5 + sd * 0.16), y = Y(0.378);
    P(c, SKIN, (k) => k.ellipse(x, y, X(0.036), Y(0.052), sd * 0.28, 0, TAU), PRO_SKIN, PRO_LW);
    line(c, 'rgba(26,16,40,0.18)', PRO_LW, (k) => k.ellipse(x + sd * X(0.006), y, X(0.016), Y(0.026), sd * 0.28, -1.9, 1.5));
  }
}
// A NOSE. The face carried none until now — the specs and the moustache were
// doing that job between them. It draws in the FACE slot, before the specs, so
// the frames land on top of it and the glasses read as resting on the nose.
//
// One bulb a shade under the skin tone with a contour on its LOWER edge only:
// a closed outline round the whole shape reads as a stuck-on ball, because a
// real nose has no top edge — it comes out of the brow.
const SKIN_DK = '#e0b68e';
function nose(c, X, Y) {
  const cx = X(0.5), cy = Y(0.392), rx = X(0.03), ry = Y(0.034);
  P(c, SKIN_DK, (k) => k.ellipse(cx, cy, rx, ry, 0, 0, TAU));
  line(c, PRO_SKIN, PRO_LW, (k) => k.ellipse(cx, cy, rx, ry, 0, 0.12 * Math.PI, 0.88 * Math.PI));
}
function paleDome(c, X, Y, lw) {
  P(c, SKIN, (k) => HEAD(k, X, Y), PRO_SKIN, PRO_LW);
}
// EVERY LOCK GOES DOWN BEFORE THE SKULL. The roots reach well inside the head
// (ROOT_K) so nothing can float, and then the skull is painted over the top of
// them — so the hair is visible only OUTSIDE the head's outline and meets it
// exactly, with nothing lying across the forehead. Peter, 4 Sep: "attach hair
// perfectly to top of skull, don't layer it down at all on the forehead."
//
// That is why the hair slot is empty in these cuts: front and back locks both
// belong to the head slot now. They keep their own order and tones — the back
// set darker underneath, the front set lighter over it — and only the skull
// separates them from the face.
const professorHead = (name) => (c, X, Y, lw) => {
  hairBack(name)(c, X, Y, lw);
  hairFront(name)(c, X, Y, lw);
  ears(c, X, Y);
  paleDome(c, X, Y, lw);
};
const apeHairHead = (name) => (c, X, Y, lw) => {
  hairBack(name)(c, X, Y, lw);
  hairFront(name)(c, X, Y, lw);
  EGGSHELL_PARTS.head(c, X, Y, lw);
};
// Dark rectangular specs where the round goggles were, drawn from Peter's own
// frames: WIDE and shallow rather than square, a black brow bar across the top
// of each lens, fine line round the rest, a flat bridge on the same line as the
// brow, and thin arms running back to the ears. The weight is all along the
// top — that is what makes a pair of glasses read as these glasses and not as
// two boxes. Small and fine on purpose: at 36u the first cut ate the face.
// EYE SPACING: SETTLED 4 Sep — MID. The pupils were first centred-outboard in
// their lenses (they read as two separate faces), then hard inboard by the
// bridge (cross-eyed); Peter asked for the in-between as a three-way and then
// picked it. The other two positions are kept here as the numbers that lost,
// so nobody re-derives the range — nothing draws them any more.
const EYE_GAP = { wide: 0.006, mid: -0.004, close: -0.013 };
// LENS SIZE: SETTLED 4 Sep — MID x TIGHT. Six combinations of lens width and
// bridge gap went up (0.058/0.067/0.076 x 0.010/0.018) against the 0.024 bridge
// then in place, and Peter took the middle lens with the lenses close together.
// Height was never in question. The losing numbers stay written here so the
// range is not re-derived; nothing draws them any more.
//
// RIM is DARK GREY, not the villain's near-black ink: at this size a black
// rim plus a black pupil inside it is one dark mass, and the pupils are the
// mark that has to win. The pupils keep the full ink.
const SPEC = { hw: 0.067, bridge: 0.010, eye: EYE_GAP.mid };
const RIM = '#3d3d48';
const specsWith = (o = {}) => (c, X, Y, lw, shocked) => drawSpecs(c, X, Y, shocked, { ...SPEC, ...o });
function drawSpecs(c, X, Y, shocked, o) {
  const cy = Y(0.328), hh = Y(0.038);
  const hw = X(o.hw), off = X(o.hw + o.bridge / 2), gap = o.eye;
  const brow = PRO_LW * 0.75, top = cy - hh;
  for (const s of [-1, 1]) {
    const x = X(0.5) + s * off;
    line(c, RIM, PRO_LW * 0.6, (k) => { k.moveTo(x + s * hw, top + brow); k.lineTo(X(0.5) + s * X(0.166), cy - Y(0.006)); });
    P(c, LENS, (k) => rr(k, x - hw, top, hw * 2, hh * 2, X(0.008)), RIM, PRO_LW * 0.75);
    // gap is signed OUTWARD: positive pushes the pupil toward the outer rim,
    // negative pulls it in toward the bridge
    dot(c, INK, x + s * X(gap), cy + Y(0.004), X(shocked ? 0.012 : 0.017));
  }
  // the heavy top: one bar across both lenses and the bridge between them, the
  // line that makes these HIS frames rather than two rectangles
  P(c, RIM, (k) => rr(k, X(0.5) - off - hw - PRO_LW * 0.08, top - PRO_LW * 0.08, (off + hw) * 2 + PRO_LW * 0.16, brow, X(0.004)));
}
// ------------------------------------------------------- facial hair
// Peter, 4 Sep: "play around with facial hair." Every option below is the SAME
// face — same round head with its forehead, same small fine specs — and differs
// only in what grows on the lower half, so the row reads as one question.
//
// The stubble field is the shared ground most of them sit on: ONE flat tone a
// little greyer than the skin, clipped to the skull so it takes the jaw's exact
// silhouette. Flat fills only — dots or hatching for whiskers die at lane size.
const STUBBLE = '#bb9a82', STUBBLE_DK = '#a5836c';
function onFace(c, X, Y, fn) {
  c.save();
  c.beginPath();
  HEAD(c, X, Y);
  c.clip();
  fn();
  c.restore();
}
function stubbleField(c, X, Y, chin = true) {
  onFace(c, X, Y, () => {
    // The top edge runs UP to the moustache line, not under it: at the old
    // height a band of bare skin sat between the two and the moustache looked
    // stuck on. The upper lip is stubbled like the rest of him, so the
    // moustache sits ON the field and the two read as one growth.
    P(c, STUBBLE, (k) => {
      k.moveTo(X(0.295), Y(0.425));
      k.quadraticCurveTo(X(0.5), Y(0.478), X(0.705), Y(0.425));
      k.lineTo(X(0.705), Y(0.72)); k.lineTo(X(0.295), Y(0.72)); k.closePath();
    });
    if (chin) P(c, STUBBLE_DK, (k) => {
      k.moveTo(X(0.425), Y(0.53));
      k.quadraticCurveTo(X(0.5), Y(0.575), X(0.575), Y(0.53));
      k.quadraticCurveTo(X(0.565), Y(0.635), X(0.5), Y(0.665));
      k.quadraticCurveTo(X(0.435), Y(0.635), X(0.425), Y(0.53));
      k.closePath();
    });
  });
}
// The mouth: a line when calm, an O when he has been bonked. Every option
// calls this, so no option owns a second mouth drawing.
function mouthLine(c, X, Y, lw, shocked, y = 0.508) {
  if (shocked) gasp(c, X, Y, y - 0.008);
  else line(c, PRO_INK, PRO_LW * 1.2, (k) => { k.moveTo(X(0.46), Y(y)); k.quadraticCurveTo(X(0.5), Y(y + 0.015), X(0.54), Y(y)); });
}
const stache = (c, X, Y, lw, shocked, span, drop, y = 0.458) =>
  mustache(c, X(0.5), Y(shocked ? y - 0.018 : y), X(span), Y(drop), shocked ? -0.5 : 0, TONE[0], PRO_INK, PRO_LW);
// 1. Nothing at all: bare skin, and the specs carry the whole face.
function fhShaven(c, X, Y, lw, shocked) { mouthLine(c, X, Y, lw, shocked, 0.5); }
// 2. Three days of it and no more — the shared field, no shape on top.
function fhStubble(c, X, Y, lw, shocked) { stubbleField(c, X, Y); mouthLine(c, X, Y, lw, shocked); }
// 3. The trim moustache on the stubble: the cut that has been standing.
function fhTrim(c, X, Y, lw, shocked) {
  stubbleField(c, X, Y);
  mouthLine(c, X, Y, lw, shocked);
  stache(c, X, Y, lw, shocked, 0.118, 0.046);
}
// 4. The shipped walrus, in silver: the villain's own logo shape at full span,
// the one mark that survives from the drawing everyone knows.
function fhWalrus(c, X, Y, lw, shocked) {
  stubbleField(c, X, Y, false);
  mouthLine(c, X, Y, lw, shocked, 0.53);
  stache(c, X, Y, lw, shocked, 0.2, 0.07, 0.462);
}
// 5. Waxed and curled up at the tips. Thin, so it is the first to check at the
// phone rung — a hairline curl is where this style usually dies.
function fhHandlebar(c, X, Y, lw, shocked) {
  stubbleField(c, X, Y, false);
  mouthLine(c, X, Y, lw, shocked, 0.5);
  for (const sd of [-1, 1]) {
    line(c, TONE[0], PRO_LW * 1.6, (k) => {
      k.moveTo(X(0.5), Y(0.462));
      k.quadraticCurveTo(X(0.5) + sd * X(0.065), Y(0.452), X(0.5) + sd * X(0.105), Y(0.418));
      k.quadraticCurveTo(X(0.5) + sd * X(0.132), Y(0.392), X(0.5) + sd * X(0.122), Y(0.368));
    });
    line(c, TONE[0], PRO_LW * 1.15, (k) => k.arc(X(0.5) + sd * X(0.112), Y(0.363), X(0.013), 0, TAU));
  }
}
// 6. Moustache and a pointed chin beard, the jaw shaved between: a Van Dyke.
// The tidiest villain of the row, which is the joke — he files forms.
function fhVanDyke(c, X, Y, lw, shocked) {
  stubbleField(c, X, Y, false);
  P(c, TONE[0], (k) => {
    k.moveTo(X(0.452), Y(0.525));
    k.quadraticCurveTo(X(0.5), Y(0.55), X(0.548), Y(0.525));
    k.quadraticCurveTo(X(0.54), Y(0.615), X(0.5), Y(0.645));
    k.quadraticCurveTo(X(0.46), Y(0.615), X(0.452), Y(0.525));
    k.closePath();
  }, PRO_INK, PRO_LW);
  mouthLine(c, X, Y, lw, shocked, 0.5);
  stache(c, X, Y, lw, shocked, 0.115, 0.044, 0.455);
}
// 7. The goatee proper: a chin tuft and NO moustache, the upper lip shaved.
// The one cut where the mouth is the only mark between nose and beard.
function fhGoatee(c, X, Y, lw, shocked) {
  stubbleField(c, X, Y, false);
  P(c, TONE[0], (k) => {
    k.moveTo(X(0.442), Y(0.522));
    k.quadraticCurveTo(X(0.5), Y(0.552), X(0.558), Y(0.522));
    k.quadraticCurveTo(X(0.552), Y(0.625), X(0.5), Y(0.658));
    k.quadraticCurveTo(X(0.448), Y(0.625), X(0.442), Y(0.522));
    k.closePath();
  }, PRO_INK, PRO_LW);
  mouthLine(c, X, Y, lw, shocked, 0.497);
}
// 8. The same tuft drawn out to a point past the jaw. A villain's goatee: it
// is the only facial hair here that leaves the head's silhouette.
function fhGoateeLong(c, X, Y, lw, shocked) {
  stubbleField(c, X, Y, false);
  P(c, TONE[0], (k) => {
    k.moveTo(X(0.445), Y(0.52));
    k.quadraticCurveTo(X(0.5), Y(0.55), X(0.555), Y(0.52));
    k.quadraticCurveTo(X(0.545), Y(0.65), X(0.5), Y(0.76));
    k.quadraticCurveTo(X(0.455), Y(0.65), X(0.445), Y(0.52));
    k.closePath();
  }, PRO_INK, PRO_LW);
  mouthLine(c, X, Y, lw, shocked, 0.497);
  stache(c, X, Y, lw, shocked, 0.1, 0.038, 0.452);
}
// 7. Grown out: a full short beard round the jaw with the moustache over it.
// The widest lower face of the row and the only one that changes his outline.
function fhBeard(c, X, Y, lw, shocked) {
  P(c, TONE[0], (k) => {
    k.moveTo(X(0.325), Y(0.42));
    k.quadraticCurveTo(X(0.32), Y(0.6), X(0.42), Y(0.665));
    k.quadraticCurveTo(X(0.5), Y(0.71), X(0.58), Y(0.665));
    k.quadraticCurveTo(X(0.68), Y(0.6), X(0.675), Y(0.42));
    k.quadraticCurveTo(X(0.6), Y(0.5), X(0.5), Y(0.5));
    k.quadraticCurveTo(X(0.4), Y(0.5), X(0.325), Y(0.42));
    k.closePath();
  }, PRO_INK, PRO_LW);
  mouthLine(c, X, Y, lw, shocked, 0.535);
  stache(c, X, Y, lw, shocked, 0.13, 0.05, 0.472);
}
// One cut: the professor with a named hair style. Everything except the locks
// is the same in every row, which is the point of the group.
const professor = (name, o = {}) => professorParts(name, o);
function professorParts(name, o) {
  const t = o.tone || HAIR_TONE.white;
  const p = {
    // NO SHELL, in every cut. The green spiked shell was the ape's armour and
    // Peter cut it from the professor outright — so it is off in the builder
    // rather than off in one tile, and `keepShell` is the exception a tile has
    // to ask for.
    ...(o.keepShell ? {} : { shell: null }),
    head: (o.ape ? apeHairHead : professorHead)(name),
    ...(o.ape ? {} : { face: nose }),
    hair: null,
    eyes: o.eyes || specsWith(),
    mouth: o.mouth || fhTrim,
  };
  p.head = tinted(t, p.head);
  p.mouth = tinted(t, p.mouth);
  return p;
}

// -------------------------------------------------------------- the list
// `parts` options are the shipped copter with those parts swapped; `paint`
// options own their whole box. Each box is authored in copter units (the
// copter is 28 and draws at 36), so the ape is one size in every tile.
export const EGGSHELL_REDESIGNS = [
  // A. the shell
  { id: 'bare', n: 1, group: 'A', name: 'NO SHELL', box: [28, 28],
    note: 'The direct ask: the green spiked shell gone, nothing in its place. Fur shoulders, the tub, the rotor. What the silhouette loses is the width behind his head.',
    parts: { shell: null } },
  { id: 'labcoat', n: 2, group: 'A', name: 'LAB COAT', box: [28, 28],
    note: 'No shell; a white coat with its collar turned up where the spikes were, and a red bow tie under the chin. The PhD, dressed for it.',
    parts: { shell: null, body: labCoat, hands: bowTie } },
  { id: 'shellcollar', n: 3, group: 'A', name: 'EGGSHELL COLLAR', box: [28, 28],
    note: 'The name taken literally: the bottom of a cracked eggshell worn round the shoulders, its broken rim standing up behind his head where the green spikes were. Cream, one ink.',
    parts: { shell: shellCollar } },
  { id: 'crest', n: 4, group: 'A', name: 'SPIKES AS HAIR', box: [28, 28],
    note: 'No shell; the green spikes move onto his head as a crest. The silhouette keeps its points and the shoulders go bare.',
    parts: { shell: null, hair: crest } },
  // B. facial hair
  { id: 'shaven', n: 5, group: 'B', name: 'CLEAN SHAVEN', box: [28, 28],
    note: 'No mustache at all. The goggles carry the face, with a smug little curve where the red was. The one option with no red on him above the tub.',
    parts: { mouth: smirk } },
  { id: 'goatee', n: 6, group: 'B', name: 'PENCIL + GOATEE', box: [28, 28],
    note: 'A hair-thin pencil mustache and a pointed red goatee. Less walrus, more cad.',
    parts: { mouth: goatee } },
  { id: 'chops', n: 7, group: 'B', name: 'MUTTON CHOPS', box: [28, 28],
    note: 'No mustache; red sideburns down both cheeks, flaring at the jaw. Victorian, which suits a man who files forms.',
    parts: { mouth: chops } },
  { id: 'beard', n: 8, group: 'B', name: 'FULL BEARD', box: [28, 28],
    note: 'The mustache plus a red beard filling the lower face and spilling over the rim. The most fur on the face, red on brown.',
    parts: { mouth: beard } },
  { id: 'dali', n: 9, group: 'B', name: 'WAXED CURLS', box: [28, 28],
    note: 'Pencil-thin, swept up steeply past the goggles and curled at the tips. Dalí. The thinnest red on the sheet — check it at the phone rung.',
    parts: { mouth: dali } },
  // C. hair
  { id: 'combover', n: 10, group: 'C', name: 'BALD, COMB-OVER', box: [28, 28],
    note: 'The face-plate grown over the crown into a pale dome with three dark strands combed across it; fur only at the sides. The head reads pale instead of brown.',
    parts: { head: baldHead, face: null, hair: combover } },
  { id: 'pompadour', n: 11, group: 'C', name: 'POMPADOUR', box: [28, 28],
    note: 'A dark quiff swept up and forward off the crown, with a shine. The tallest silhouette of the bust options; the mast disappears into it.',
    parts: { hair: quiff } },
  { id: 'einstein', n: 12, group: 'C', name: 'MAD SCIENTIST', box: [28, 28],
    note: 'White tufts sticking out either side of the head above the goggle strap. The doctorate, unkempt.',
    parts: { hair: tufts } },
  { id: 'wig', n: 13, group: 'C', name: 'JUDGE\'S WIG', box: [28, 28],
    note: 'A powdered wig: a white cap over the crown, a row of curls at the brow, three rolls down each side. The uniform for a villain who disputes jumps in writing.',
    parts: { hair: wig } },
  // D. egg vehicles
  { id: 'eggpod', n: 14, group: 'D', name: 'EGG POD', box: [28, 28],
    note: 'A cream egg the size of the copter box, a red band and lamps, a round hatch he looks out of with his fists on the sill, and the shipped rotor on its point. The shell shows behind him through the hatch.',
    paint: (c, t) => copter(c, t, { body: eggPod, mastTo: 7.5 }) },
  { id: 'eggcup', n: 15, group: 'D', name: 'EGG CUP', box: [28, 32],
    note: 'Breakfast: the cracked half-shell sitting in a striped egg cup on a foot, hovering on a lift cushion, the spoon still in it. Tall, and no rotor.',
    paint: (c) => eggCup(c) },
  { id: 'walker', n: 16, group: 'D', name: 'EGG WALKER', box: [28, 34], ground: true,
    note: 'Humpty on legs: the cracked egg on two thin bird legs with three-toed feet, walking. The one GROUND option — he would come at you along the floor, a different fight.',
    paint: (c, t) => walker(c, t) },
  { id: 'eggzep', n: 17, group: 'D', name: 'EGG ZEPPELIN', box: [40, 30],
    note: 'An egg on its side as an airship: pointed nose, red fins, a three-quarter pusher prop at the blunt end, and him in a cockpit cut into the top. The widest silhouette on the sheet.',
    paint: (c, t) => zeppelin(c, t) },
  { id: 'splitegg', n: 18, group: 'D', name: 'SPLIT EGG', box: [28, 28],
    note: 'The whole egg, in two: the cracked top worn as his helmet with the rotor mast through its point, the cracked bottom as his tub. The copter, hatched.',
    paint: (c, t) => copter(c, t, { parts: { hair: eggCap, tub: halfShellTub }, mastTo: 8 + 0.6 }) },
  { id: 'faceship', n: 19, group: 'D', name: 'FACE SHIP', box: [30, 30],
    note: 'The Robotnik move: a hover-egg with his own goggles and mustache painted on the hull, and him riding in a hatch on the crown. Two faces, both his.',
    paint: (c, t) => faceShip(c, t) },
  // E. wildcard
  { id: 'sunnyside', n: 20, group: 'E', name: 'SUNNY SIDE UP', box: [40, 26],
    note: 'A hovering frying pan on two jets, a fried egg in it, and the yolk is his seat. Wider than anything else here; the handle is the tell at lane size.',
    paint: (c, t) => sunnySide(c, t) },
  // F. the silver professor — the three hair styles that survived
  { id: 'mane', n: 21, group: 'F', name: 'WILD MANE', box: [28, 28], mastTo: 10.4,
    note: 'The reference read: one mass swept up and across the crown with spikes flying off both temples, longest at the sides. Unkempt, but with a direction — combed by wind rather than by nothing.',
    parts: professor('mane') },
  { id: 'blast', n: 22, group: 'F', name: 'BLAST', box: [28, 28], mastTo: 10.2,
    note: 'Straight out in every direction, no sweep and no part, lengths ragged so it is a blast and not a daisy. The mad-scientist read, and the tallest silhouette — it reads at lane size from further away than the other two.',
    parts: professor('blast') },
  { id: 'quiff', n: 23, group: 'F', name: 'FORWARD QUIFF', box: [28, 28], mastTo: 10.2,
    note: 'One tall fan pitched forward over the brow, the sides cropped to short spikes. The tidiest of the unkempt, and the only one whose silhouette leans toward the hero he is chasing.',
    parts: professor('quiff') },
  { id: 'maneape', n: 24, group: 'F', name: 'WILD MANE, APE KEPT', box: [28, 28], mastTo: 10.4,
    note: 'The mane on the shipped ape: brown head and cream face-plate kept, silver spikes around them. The question the hair cannot answer on its own — does he have to stop being an ape to look younger?',
    parts: professor('mane', { ape: true }) },
  { id: 'maneshell', n: 25, group: 'F', name: 'WILD MANE, SHELL KEPT', box: [28, 28], mastTo: 10.4,
    note: 'The only cut that still wears the green spiked shell — kept as the before picture, since every other tile now drops it.',
    parts: professor('mane', { keepShell: true }) },
  // G. facial hair, all on the wild mane
  { id: 'fh-shaven', n: 26, group: 'G', name: 'CLEAN SHAVEN', box: [28, 28], mastTo: 10.4,
    note: 'Nothing at all: bare skin and a mouth line, the specs carrying the whole face. The only cut with no silver below the nose — and the youngest of the row by a distance.',
    parts: professor('mane', { mouth: fhShaven }) },
  { id: 'fh-stubble', n: 27, group: 'G', name: 'STUBBLE ONLY', box: [28, 28], mastTo: 10.4,
    note: 'Three days of it and no more: the flat greyer tone over cheeks, jaw and lip with no shape on top. Reads as unshaven rather than bearded, which is a different kind of not-coping.',
    parts: professor('mane', { mouth: fhStubble }) },
  { id: 'fh-trim', n: 28, group: 'G', name: 'STUBBLE + TRIM MOUSTACHE', box: [28, 28], mastTo: 10.4,
    note: 'The cut that has been standing: stubble with the trim silver moustache over it and a denser patch under the lip. The middle of the row in every sense.',
    parts: professor('mane', { mouth: fhTrim }) },
  { id: 'fh-walrus', n: 29, group: 'G', name: 'SILVER WALRUS', box: [28, 28], mastTo: 10.4,
    note: 'The shipped villain\'s own moustache at full span, in silver instead of red. The one mark that carries over from the drawing everyone already knows him by — the most Eggshell of the row.',
    parts: professor('mane', { mouth: fhWalrus }) },
  { id: 'fh-handlebar', n: 30, group: 'G', name: 'WAXED HANDLEBAR', box: [28, 28], mastTo: 10.4,
    note: 'Thin, swept up past the cheeks and curled at the tips. The most pompous option and the thinnest silver on the sheet — check this one at the phone rung before believing it.',
    parts: professor('mane', { mouth: fhHandlebar }) },
  { id: 'fh-vandyke', n: 31, group: 'G', name: 'VAN DYKE', box: [28, 28], mastTo: 10.4,
    note: 'Moustache and a pointed chin beard with the jaw shaved between. The tidiest villain of the row, which is the joke on a man who disputes jumps in writing.',
    parts: professor('mane', { mouth: fhVanDyke }) },
  { id: 'fh-goatee', n: 32, group: 'G', name: 'GOATEE', box: [28, 28], mastTo: 10.4,
    note: 'The goatee proper: a chin tuft with the upper lip SHAVED. The only cut where nothing sits between the nose and the beard, which makes the specs and the mouth carry the whole expression.',
    parts: professor('mane', { mouth: fhGoatee }) },
  { id: 'fh-goatee-long', n: 33, group: 'G', name: 'LONG GOATEE', box: [28, 28], mastTo: 10.4,
    note: 'The same tuft drawn to a point past the jaw, with a thin moustache over it. The only facial hair on the sheet that leaves the head\'s silhouette — a villain\'s goatee, and the one to check against the tub rim.',
    parts: professor('mane', { mouth: fhGoateeLong }) },
  { id: 'fh-beard', n: 34, group: 'G', name: 'FULL SHORT BEARD', box: [28, 28], mastTo: 10.4,
    note: 'Grown out: a full silver beard round the jaw with the moustache over it. The widest lower face of the row and the only facial hair that changes his outline.',
    parts: professor('mane', { mouth: fhBeard }) },
  // H. hair tone — one pair of greys, six ways
  { id: 'tone-white', n: 35, group: 'H', name: 'WHITE (as drawn)', box: [28, 28], mastTo: 10.4,
    note: 'The control: #dfe2ea over #c6cbd9, what every other tile on the sheet wears. Brightest, and the furthest from grey.',
    parts: professor('mane', { tone: HAIR_TONE.white }) },
  { id: 'tone-silver', n: 36, group: 'H', name: 'SILVER', box: [28, 28], mastTo: 10.4,
    note: 'One step down: #cdd3e0 over #b1b9ca. Still reads as bright hair against the dark sky band, with the white knocked off it.',
    parts: professor('mane', { tone: HAIR_TONE.silver }) },
  { id: 'tone-steel', n: 37, group: 'H', name: 'STEEL', box: [28, 28], mastTo: 10.4,
    note: '#bcc3d2 over #a0a8bb — properly grey. The tone where the hair stops being the brightest thing on him and the face starts leading.',
    parts: professor('mane', { tone: HAIR_TONE.steel }) },
  { id: 'tone-pewter', n: 38, group: 'H', name: 'PEWTER', box: [28, 28], mastTo: 10.4,
    note: '#adb4c3 over #9199ac. Darker again; check this one against the pale rhythm sky, where he is drawn on a light band and not this dark card.',
    parts: professor('mane', { tone: HAIR_TONE.pewter }) },
  { id: 'tone-warm', n: 39, group: 'H', name: 'WARM GREY', box: [28, 28], mastTo: 10.4,
    note: '#ccc9c6 over #b0aca8 — the only tone here with the blue taken out. Sits closer to his skin, which makes him read older and less like a lab.',
    parts: professor('mane', { tone: HAIR_TONE.warm }) },
  { id: 'tone-slate', n: 40, group: 'H', name: 'SLATE', box: [28, 28], mastTo: 10.4,
    note: '#9fa7b7 over #858da0 — the guardrail. This is where grey hair starts reading as a grey HAT, and the contour has nothing left to separate.',
    parts: professor('mane', { tone: HAIR_TONE.slate }) },
];
// A bust option is the shipped copter with its parts swapped. `mastTo` moves
// the rotor mast's lower end for the options whose head is taller than the
// shipped one — undefined leaves eggshellCopterArt's own default in place.
for (const r of EGGSHELL_REDESIGNS) {
  if (!r.paint) r.paint = (c, t) => copter(c, t, { parts: r.parts, mastTo: r.mastTo });
}
export const EGGSHELL_REDESIGN_GROUPS = [
  ['A', 'The shell', 'The green spiked shell is the armour. Four ways to lose it.'],
  ['B', 'Facial hair', 'Five mouths, the shell and tub kept. One is no facial hair at all.'],
  ['C', 'Hair', 'Four heads, the mustache and shell kept.'],
  ['D', 'Egg vehicles', 'Six rides that ARE an egg, the shipped ape in every one. One walks.'],
  ['E', 'Wildcard', 'One for the laugh.'],
  ['F', 'The silver professor — hair', 'NO SHELL: the green spikes are gone from every cut but 25, which keeps them as the before picture. Three spiky hair styles on one identical head — same round skull, same locks rooted high so the crown shows, same small fine specs, same stubble and moustache — so only the locks differ.'],
  ['G', 'The silver professor — facial hair', 'Nine lower halves on the WILD MANE, everything above the nose identical. The stubble field is the shared ground: one flat greyer tone clipped to the skull, so a beard is a shape on top of it rather than a second drawing.'],
  ['H', 'The silver professor — hair tone', 'Six greys, everything else identical. Each option is a PAIR — the lit tone for the front locks and the moustache, the shaded one for the locks behind the skull — so the hair and the facial hair can never disagree. Judge these against the sky band he actually flies on, not only against this dark card.'],
];

const BY_ID = Object.fromEntries(EGGSHELL_REDESIGNS.map((r) => [r.id, r]));

// Paint one option, stretching its box to w by h the way drawProp does.
export function drawEggshellRedesign(ctx, id, w, h, t = 0) {
  const r = BY_ID[id];
  if (!r) throw new Error(`unknown eggshell redesign: ${id}`);
  ctx.save();
  ctx.scale(w / r.box[0], h / r.box[1]);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  r.paint(ctx, t);
  ctx.restore();
}
