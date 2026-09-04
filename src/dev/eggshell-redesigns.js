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
  INK, CREAM, RED, FUR, GOLD, LINE, LW, GREEN, GREEN_DK,
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
];
for (const r of EGGSHELL_REDESIGNS) {
  if (!r.paint) r.paint = (c, t) => copter(c, t, { parts: r.parts });
}
export const EGGSHELL_REDESIGN_GROUPS = [
  ['A', 'The shell', 'The green spiked shell is the armour. Four ways to lose it.'],
  ['B', 'Facial hair', 'Five mouths, the shell and tub kept. One is no facial hair at all.'],
  ['C', 'Hair', 'Four heads, the mustache and shell kept.'],
  ['D', 'Egg vehicles', 'Six rides that ARE an egg, the shipped ape in every one. One walks.'],
  ['E', 'Wildcard', 'One for the laugh.'],
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
