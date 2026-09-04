// The villain designs that did NOT win, kept for reuse.
//
// Two bake-offs settled Don K. Eggshell on 3-4 Sep 2026: twelve bodies (C, the
// ape in the clown-copter tub, won) and ten ways for that body to travel (T1's
// three-quarter rotor ships as the copter, T6's balloon as the Act III boss).
// The losers were deleted with the sections, and Peter asked for them back —
// "may want to use them elsewhere for variety, or as minions of the main
// villain" — so they are rebuilt here from the bake-off montages.
//
// NOTHING HERE IS REGISTERED. No entry in PROP_PAINTERS, no entity def, no
// sprite table: these reach the gallery through drawEggshellCandidate and
// drawEggshellTravel and nowhere else, so a look nobody has chosen cannot leak
// into the run. Promoting one means copying its painter body into
// sprites/props.js and giving it a def of its own — the same move the winner
// took. See the shipped eggshell / eggshellCopter / eggshellBalloon there for
// how a promoted painter ends up looking.
//
// Each painter fills a local 0..w by 0..h box, so the gallery places one by
// translation. The travel options carry their own nominal box because a
// balloon and a monowheel are not the same shape as a copter.

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
// The game's own inks: cream and peach from the original egg, red from the
// mustache, fur and gold and green from world.js's pixel Eggshell.
const INK = '#1a1028';
const OUTLINE = 'rgba(26,16,40,0.34)';
const CREAM = '#e8e0c8', CREAM_DK = '#c9bd9c';
const PEACH = '#f2c9a0';
const RED = '#c83030', RED_DK = '#8f1f28';
const FUR = '#7a4c2e', FUR_DK = '#4e2f1b', FUR_LT = '#a8734a';
const GOLD = '#f6d33c';
const LENS = '#c8e0f8';
const GREEN = '#48c848', GREEN_DK = '#2c7d33';
const STEEL = '#7d8594', STEEL_DK = '#3a3f4a', STEEL_LT = '#c8ced8';
const GLOVE = '#d8d8e0';

// ------------------------------------------------------------------- helpers
function P(c, fill, fn, ink = null, lw = 0) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink && lw > 0) {
    c.strokeStyle = ink; c.lineWidth = lw;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
  }
}
function line(c, ink, lw, fn) { P(c, null, fn, ink, lw); }
function dot(c, fill, x, y, r, ink = null, lw = 0) { P(c, fill, (k) => k.arc(x, y, r, 0, TAU), ink, lw); }
function rrect(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}
// An egg: one width, two heights, with the equator below centre so the dome is
// taller than the bowl. That asymmetry is the whole difference between an egg
// and an ellipse, and the original painter's ellipse is why it read as a blob.
function egg(c, cx, cy, rx, ry, eq = 0.18) {
  const ey = ry * eq;
  c.ellipse(cx, cy + ey, rx, ry - ey, 0, 0, Math.PI);
  c.ellipse(cx, cy + ey, rx, ry + ey, 0, Math.PI, TAU);
}
// The logo. Two lobes, thick at the philtrum, tips curling up — or hanging,
// with droop, for the aggrieved walrus.
function mustache(c, cx, cy, span, drop, fill = RED, droop = 0) {
  for (const s of [-1, 1]) {
    P(c, fill, (k) => {
      k.moveTo(cx, cy - drop * 0.3);
      k.quadraticCurveTo(cx + s * span * 0.45, cy - drop * 0.95, cx + s * span, cy - drop * 0.35 + droop * drop * 1.4);
      k.quadraticCurveTo(cx + s * span * 0.82, cy + drop * 0.3 + droop * drop * 1.1, cx + s * span * 0.42, cy + drop * 0.6 + droop * drop * 0.4);
      k.quadraticCurveTo(cx + s * span * 0.16, cy + drop * 0.8, cx, cy + drop * 0.55);
      k.closePath();
    });
  }
}
// Tiny science goggles: two rimmed lenses on a bridge, with an optional strap
// for the candidates whose head shows past them.
function goggles(c, cx, cy, r, gap, o = {}) {
  const { lens = LENS, frame = INK, strap = null, pupil = INK, glow = null, hi = true } = o;
  const L = cx - gap / 2 - r, R = cx + gap / 2 + r;
  if (strap) line(c, frame, r * 0.6, (k) => { k.moveTo(strap[0], cy + r * 0.1); k.lineTo(strap[1], cy + r * 0.1); });
  line(c, frame, r * 0.5, (k) => { k.moveTo(L, cy); k.lineTo(R, cy); });
  for (const x of [L, R]) {
    if (glow) dot(c, glow, x, cy, r * 1.8);
    dot(c, frame, x, cy, r);
    dot(c, lens, x, cy, r * 0.7);
    if (pupil) dot(c, pupil, x + (x < cx ? r * 0.12 : -r * 0.12), cy + r * 0.12, r * 0.3);
    if (hi) dot(c, 'rgba(255,255,255,0.85)', x - r * 0.28, cy - r * 0.3, r * 0.17);
  }
}
// Spikes standing off an ellipse arc, tips pointing outward.
function spikesArc(c, fill, cx, cy, rx, ry, a0, a1, n, len, ink = null, lw = 0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + 0.5) / n;
    const da = (a1 - a0) / n * 0.42;
    P(c, fill, (k) => {
      k.moveTo(cx + Math.cos(a - da) * rx, cy + Math.sin(a - da) * ry);
      k.lineTo(cx + Math.cos(a) * rx * (1 + len), cy + Math.sin(a) * ry * (1 + len));
      k.lineTo(cx + Math.cos(a + da) * rx, cy + Math.sin(a + da) * ry);
      k.closePath();
    }, ink, lw);
  }
}
// Spikes along a line, standing to its left.
function spikesLine(c, fill, x0, y0, x1, y1, n, len, ink = null, lw = 0) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = dy / L, ny = -dx / L;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    P(c, fill, (k) => {
      k.moveTo(x0 + dx * t0, y0 + dy * t0);
      k.lineTo(x0 + dx * tm + nx * len, y0 + dy * tm + ny * len);
      k.lineTo(x0 + dx * t1, y0 + dy * t1);
      k.closePath();
    }, ink, lw);
  }
}
// A fur arm from a shoulder to a planted fist.
function arm(c, x0, y0, x1, y1, thick, fill, ink, lw) {
  line(c, fill, thick, (k) => { k.moveTo(x0, y0); k.lineTo(x1, y1); });
  dot(c, fill, x1, y1, thick * 0.62, ink, lw);
}
// A jet flame along +y from (x, y), flickering on t; `rot` aims it.
function flame(c, x, y, wdt, len, t, seed = 0, rot = 0) {
  const k = 1 + 0.16 * Math.sin(t * 31 + seed) + 0.09 * Math.sin(t * 47 + seed * 2.3);
  const L = len * k;
  c.save(); c.translate(x, y); c.rotate(rot);
  const tongue = (wf, lf, fill) => P(c, fill, (p) => {
    p.moveTo(-wdt * wf / 2, 0);
    p.quadraticCurveTo(-wdt * wf * 0.55, L * lf * 0.55, 0, L * lf);
    p.quadraticCurveTo(wdt * wf * 0.55, L * lf * 0.55, wdt * wf / 2, 0);
    p.closePath();
  });
  tongue(1, 1, '#f2621d'); tongue(0.66, 0.72, '#ffb02e'); tongue(0.34, 0.42, '#ffef9e');
  c.restore();
}
function puffs(c, x, y, t, seed = 0, dy = 1) {
  for (let i = 0; i < 3; i++) {
    const q = ((t * 0.9 + i / 3 + seed) % 1);
    dot(c, `rgba(120,120,136,${(0.4 * (1 - q)).toFixed(2)})`, x + Math.sin(seed + i * 2.1 + q * 4) * 2.2, y + q * 4 * dy, 0.9 + q * 1.3);
  }
}

// ------------------------------------------------- round 1: twelve bodies
// Each keeps the bible's canon — an egg-shaped ape, a magnificent red
// mustache, tiny science goggles, a spiky shell — and changes what the egg IS.
// C won. The other eleven are here as villains for other jobs: a minion, a
// cabinet's local boss, a rival.
export const EGGSHELL_CANDIDATES = [
  {
    id: 'doctor', letter: 'A', name: 'THE DOCTOR',
    note: 'The full-figure read. The egg is a red coat with a belt and gold buttons; a bald peach dome, pince-nez goggles and the handlebar sit on top; tiny boots below. The spikes are a black collar behind the head.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      for (const s of [0.36, 0.54]) P(c, INK, (k) => rrect(k, X(s), Y(0.84), X(0.1), Y(0.14), X(0.03)));
      spikesArc(c, '#3a2a3a', X(0.5), Y(0.5), X(0.3), Y(0.17), -Math.PI * 0.95, -Math.PI * 0.05, 5, 0.55, OUTLINE, lw * 0.6);
      P(c, '#b8262e', (k) => egg(k, X(0.5), Y(0.62), X(0.3), Y(0.34)), OUTLINE, lw);
      P(c, INK, (k) => k.ellipse(X(0.5), Y(0.7), X(0.3), Y(0.045), 0, 0, TAU));
      P(c, GOLD, (k) => rrect(k, X(0.46), Y(0.665), X(0.08), Y(0.07), X(0.01)));
      dot(c, GOLD, X(0.5), Y(0.5), X(0.02)); dot(c, GOLD, X(0.5), Y(0.58), X(0.02));
      dot(c, GLOVE, X(0.14), Y(0.66), X(0.065), OUTLINE, lw);
      dot(c, GLOVE, X(0.86), Y(0.66), X(0.065), OUTLINE, lw);
      dot(c, PEACH, X(0.5), Y(0.3), X(0.165), OUTLINE, lw);
      goggles(c, X(0.5), Y(0.29), X(0.05), X(0.045), { lens: '#5aa0e8' });
      mustache(c, X(0.5), Y(0.39), X(0.29), Y(0.09));
    },
  },
  {
    id: 'kong', letter: 'B', name: 'KONG',
    note: 'The ape read. The egg is his pale face-plate on a fur body, the way a gorilla\'s face is pale in dark fur; heavy brow over the goggles, knuckles planted at the corners, a dark crest of spikes for hair.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      arm(c, X(0.26), Y(0.56), X(0.1), Y(0.9), X(0.13), FUR, OUTLINE, lw);
      arm(c, X(0.74), Y(0.56), X(0.9), Y(0.9), X(0.13), FUR, OUTLINE, lw);
      spikesArc(c, '#3b2417', X(0.5), Y(0.58), X(0.34), Y(0.47), -Math.PI * 0.82, -Math.PI * 0.18, 5, 0.22, OUTLINE, lw * 0.6);
      P(c, FUR, (k) => egg(k, X(0.5), Y(0.56), X(0.34), Y(0.42)), OUTLINE, lw);
      P(c, CREAM, (k) => egg(k, X(0.5), Y(0.58), X(0.22), Y(0.28)));
      P(c, FUR_DK, (k) => {
        k.moveTo(X(0.3), Y(0.42)); k.quadraticCurveTo(X(0.5), Y(0.35), X(0.7), Y(0.42));
        k.lineTo(X(0.7), Y(0.47)); k.quadraticCurveTo(X(0.5), Y(0.41), X(0.3), Y(0.47)); k.closePath();
      });
      goggles(c, X(0.5), Y(0.52), X(0.055), X(0.05));
      mustache(c, X(0.5), Y(0.64), X(0.26), Y(0.08));
      line(c, INK, lw * 0.4, (k) => { k.moveTo(X(0.45), Y(0.77)); k.lineTo(X(0.55), Y(0.77)); });
    },
  },
  {
    id: 'bucket', letter: 'C', name: 'CLOWN-COPTER (SHIPPED)',
    note: 'The winner, and now the shipped villain: a bust in the copter bucket, gripping the rim, the green spiky shell showing behind his shoulders. Kept here for comparison — the production painter is eggshell / eggshellCopter in sprites/props.js.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      line(c, '#3a3a48', X(0.035), (k) => { k.moveTo(X(0.5), Y(0.03)); k.lineTo(X(0.5), Y(0.34)); });
      dot(c, '#8a8a98', X(0.5), Y(0.04), X(0.04));
      bucketBust(c, X, Y, lw);
    },
  },
  {
    id: 'koopa', letter: 'D', name: 'KOOPA KING',
    note: 'The spiky shell taken literally: a green spiked shell on his back, a banded yellow-cream belly egg in front, two horns, fangs at the mustache tips. The other 40-year loser.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      spikesArc(c, '#f3e6c0', X(0.5), Y(0.6), X(0.42), Y(0.34), -Math.PI * 0.98, -Math.PI * 0.02, 6, 0.32, OUTLINE, lw * 0.6);
      P(c, GREEN, (k) => k.ellipse(X(0.5), Y(0.6), X(0.42), Y(0.34), 0, 0, TAU), GREEN_DK, lw * 0.7);
      for (const s of [0.34, 0.66]) P(c, '#f3e6c0', (k) => {
        k.moveTo(X(s - 0.05), Y(0.32)); k.lineTo(X(s + (s < 0.5 ? -0.05 : 0.05)), Y(0.16)); k.lineTo(X(s + 0.05), Y(0.32)); k.closePath();
      }, OUTLINE, lw * 0.6);
      for (const s of [0.34, 0.66]) P(c, GREEN_DK, (k) => rrect(k, X(s - 0.07), Y(0.86), X(0.14), Y(0.12), X(0.03)));
      P(c, '#ecd9a6', (k) => egg(k, X(0.5), Y(0.6), X(0.27), Y(0.36)), OUTLINE, lw);
      for (const y of [0.72, 0.82]) line(c, '#cdb77e', lw * 0.5, (k) => k.ellipse(X(0.5), Y(y), X(0.22), Y(0.035), 0, 0.15, Math.PI - 0.15));
      dot(c, '#ecd9a6', X(0.17), Y(0.7), X(0.07), OUTLINE, lw);
      dot(c, '#ecd9a6', X(0.83), Y(0.7), X(0.07), OUTLINE, lw);
      goggles(c, X(0.5), Y(0.41), X(0.055), X(0.05));
      mustache(c, X(0.5), Y(0.53), X(0.26), Y(0.08));
      for (const s of [0.37, 0.63]) P(c, '#fff', (k) => {
        k.moveTo(X(s - 0.03), Y(0.58)); k.lineTo(X(s), Y(0.66)); k.lineTo(X(s + 0.03), Y(0.58)); k.closePath();
      });
    },
  },
  {
    id: 'blackout', letter: 'E', name: 'BLACKOUT',
    note: 'The menace read. He unplugged everything, so he is the dark: a charcoal egg, a crest of black spikes, goggle lenses lit yellow with no pupils, and the red mustache as the only warm thing on him. One hairline crack.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      const ink = 'rgba(0,0,0,0.5)';
      spikesArc(c, '#15101e', X(0.5), Y(0.6), X(0.34), Y(0.47), -Math.PI * 0.85, -Math.PI * 0.15, 7, 0.32, ink, lw * 0.6);
      P(c, '#2a2333', (k) => egg(k, X(0.5), Y(0.58), X(0.34), Y(0.4)), ink, lw);
      line(c, '#8a7f98', lw * 0.35, (k) => {
        k.moveTo(X(0.28), Y(0.3)); k.lineTo(X(0.35), Y(0.4)); k.lineTo(X(0.3), Y(0.5)); k.lineTo(X(0.34), Y(0.58));
      });
      goggles(c, X(0.5), Y(0.47), X(0.075), X(0.06), { frame: '#0e0a14', lens: GOLD, pupil: null, hi: false, glow: 'rgba(246,211,60,0.32)' });
      mustache(c, X(0.5), Y(0.64), X(0.31), Y(0.1));
    },
  },
  {
    id: 'phd', letter: 'F', name: 'THE DOCTORATE',
    note: 'The PhD read. Mortarboard and tassel, a burgundy waistcoat with a watch chain, bow tie, a waxed handlebar — and the form. He is holding the form disputing your last jump.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      spikesArc(c, FUR_DK, X(0.5), Y(0.6), X(0.32), Y(0.45), -Math.PI * 0.92, -Math.PI * 0.62, 3, 0.3, OUTLINE, lw * 0.6);
      P(c, CREAM, (k) => egg(k, X(0.5), Y(0.6), X(0.32), Y(0.38)), OUTLINE, lw);
      c.save();
      c.beginPath(); egg(c, X(0.5), Y(0.6), X(0.32), Y(0.38)); c.clip();
      P(c, '#7c2a44', (k) => {
        k.moveTo(X(0.5), Y(0.62)); k.lineTo(X(0.2), Y(0.44)); k.lineTo(X(0.1), Y(1.05)); k.lineTo(X(0.9), Y(1.05)); k.lineTo(X(0.8), Y(0.44)); k.closePath();
      });
      P(c, '#fff', (k) => { k.moveTo(X(0.4), Y(0.45)); k.lineTo(X(0.6), Y(0.45)); k.lineTo(X(0.5), Y(0.62)); k.closePath(); });
      c.restore();
      P(c, INK, (k) => { k.moveTo(X(0.5), Y(0.53)); k.lineTo(X(0.42), Y(0.49)); k.lineTo(X(0.42), Y(0.57)); k.closePath(); k.moveTo(X(0.5), Y(0.53)); k.lineTo(X(0.58), Y(0.49)); k.lineTo(X(0.58), Y(0.57)); k.closePath(); });
      line(c, GOLD, lw * 0.4, (k) => { k.moveTo(X(0.5), Y(0.72)); k.quadraticCurveTo(X(0.6), Y(0.8), X(0.7), Y(0.7)); });
      dot(c, GOLD, X(0.5), Y(0.72), X(0.022)); dot(c, GOLD, X(0.5), Y(0.82), X(0.022));
      P(c, '#fff', (k) => rrect(k, X(0.76), Y(0.54), X(0.18), Y(0.16), X(0.01)), OUTLINE, lw * 0.6);
      for (const y of [0.59, 0.63, 0.67]) line(c, '#8a8a98', lw * 0.25, (k) => { k.moveTo(X(0.79), Y(y)); k.lineTo(X(0.91), Y(y)); });
      dot(c, GLOVE, X(0.86), Y(0.72), X(0.06), OUTLINE, lw);
      goggles(c, X(0.5), Y(0.36), X(0.055), X(0.05));
      mustache(c, X(0.5), Y(0.47), X(0.26), Y(0.08));
      P(c, INK, (k) => rrect(k, X(0.34), Y(0.17), X(0.32), Y(0.1), X(0.02)));
      P(c, INK, (k) => { k.moveTo(X(0.5), Y(0.02)); k.lineTo(X(0.84), Y(0.14)); k.lineTo(X(0.5), Y(0.25)); k.lineTo(X(0.16), Y(0.14)); k.closePath(); }, OUTLINE, lw * 0.5);
      line(c, GOLD, lw * 0.4, (k) => { k.moveTo(X(0.82), Y(0.14)); k.lineTo(X(0.86), Y(0.3)); });
      dot(c, GOLD, X(0.86), Y(0.31), X(0.03));
    },
  },
  {
    id: 'grievance', letter: 'G', name: 'A GRIEVANCE INTENSIFIES',
    note: 'The expression read. The egg is the whole head, filling the box: a furrowed V brow, pupils narrowed behind the goggles, a walrus mustache drooping the width of the box, fists coming up at the corners, and the crown already cracked.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      P(c, FUR, (k) => rrect(k, X(0.16), Y(0.86), X(0.68), Y(0.16), X(0.04)), OUTLINE, lw);
      P(c, CREAM, (k) => egg(k, X(0.5), Y(0.54), X(0.4), Y(0.46)), OUTLINE, lw);
      c.save();
      c.beginPath(); egg(c, X(0.5), Y(0.54), X(0.4), Y(0.46)); c.clip();
      P(c, CREAM_DK, (k) => {
        k.moveTo(X(0.05), Y(0.28)); k.lineTo(X(0.22), Y(0.3)); k.lineTo(X(0.32), Y(0.19)); k.lineTo(X(0.42), Y(0.27));
        k.lineTo(X(0.5), Y(0.14)); k.lineTo(X(0.6), Y(0.25)); k.lineTo(X(0.7), Y(0.17)); k.lineTo(X(0.8), Y(0.3)); k.lineTo(X(0.95), Y(0.28));
        k.lineTo(X(0.95), Y(-0.1)); k.lineTo(X(0.05), Y(-0.1)); k.closePath();
      }, 'rgba(26,16,40,0.45)', lw * 0.5);
      c.restore();
      P(c, FUR_DK, (k) => {
        k.moveTo(X(0.2), Y(0.36)); k.lineTo(X(0.46), Y(0.47)); k.lineTo(X(0.5), Y(0.43)); k.lineTo(X(0.54), Y(0.47)); k.lineTo(X(0.8), Y(0.36));
        k.lineTo(X(0.8), Y(0.44)); k.lineTo(X(0.54), Y(0.54)); k.lineTo(X(0.5), Y(0.5)); k.lineTo(X(0.46), Y(0.54)); k.lineTo(X(0.2), Y(0.44)); k.closePath();
      });
      goggles(c, X(0.5), Y(0.55), X(0.085), X(0.05));
      mustache(c, X(0.5), Y(0.7), X(0.42), Y(0.11), RED, 0.4);
      dot(c, FUR, X(0.11), Y(0.88), X(0.085), OUTLINE, lw);
      dot(c, FUR, X(0.89), Y(0.88), X(0.085), OUTLINE, lw);
    },
  },
  {
    id: 'yolk', letter: 'H', name: 'YOLK BRAIN',
    note: 'The mad-scientist read. The crown is cracked open and the yolk glows out of it like an exposed brain; the shards standing up round the rim are the spikes. Fur arms, goggles, mustache.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      arm(c, X(0.28), Y(0.7), X(0.1), Y(0.92), X(0.12), FUR, OUTLINE, lw);
      arm(c, X(0.72), Y(0.7), X(0.9), Y(0.92), X(0.12), FUR, OUTLINE, lw);
      dot(c, 'rgba(255,177,58,0.35)', X(0.5), Y(0.26), X(0.27));
      P(c, '#ffb13a', (k) => k.ellipse(X(0.5), Y(0.26), X(0.19), Y(0.15), 0, 0, TAU), 'rgba(140,70,0,0.5)', lw * 0.6);
      dot(c, '#ffe08a', X(0.44), Y(0.21), X(0.06));
      c.save();
      c.beginPath(); c.rect(X(-0.1), Y(0.35), X(1.2), Y(0.8)); c.clip();
      P(c, CREAM, (k) => egg(k, X(0.5), Y(0.58), X(0.34), Y(0.4)), OUTLINE, lw);
      c.restore();
      spikesLine(c, CREAM, X(0.17), Y(0.36), X(0.83), Y(0.36), 6, Y(0.13), OUTLINE, lw * 0.6);
      goggles(c, X(0.5), Y(0.52), X(0.065), X(0.05));
      mustache(c, X(0.5), Y(0.66), X(0.28), Y(0.09));
    },
  },
  {
    id: 'hatchling', letter: 'I', name: 'HATCHLING',
    note: 'The reversal. A fur ape body — broad chest, arms planted — with the egg for a head, still wearing the top of its shell as a spiked cap. The body is wider than the head, which is where the original painter was upside down.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      arm(c, X(0.22), Y(0.64), X(0.08), Y(0.92), X(0.14), FUR, OUTLINE, lw);
      arm(c, X(0.78), Y(0.64), X(0.92), Y(0.92), X(0.14), FUR, OUTLINE, lw);
      P(c, FUR, (k) => k.ellipse(X(0.5), Y(0.74), X(0.4), Y(0.26), 0, 0, TAU), OUTLINE, lw);
      P(c, FUR_LT, (k) => k.ellipse(X(0.5), Y(0.8), X(0.17), Y(0.14), 0, 0, TAU));
      spikesArc(c, CREAM_DK, X(0.5), Y(0.36), X(0.2), Y(0.34), -Math.PI * 0.85, -Math.PI * 0.15, 4, 0.3, OUTLINE, lw * 0.6);
      P(c, CREAM, (k) => egg(k, X(0.5), Y(0.36), X(0.2), Y(0.3)), OUTLINE, lw);
      goggles(c, X(0.5), Y(0.36), X(0.05), X(0.04), { strap: [X(0.31), X(0.69)] });
      mustache(c, X(0.5), Y(0.47), X(0.2), Y(0.07));
    },
  },
  {
    id: 'armoured', letter: 'J', name: 'DEATH EGG',
    note: 'The mech read. A riveted steel egg with a dark visor band, two red-lit portholes for goggles, steel spikes on the crown and exhausts under it. The mustache is bolted to the front, which is the joke surviving the armour.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      for (const s of [0.3, 0.6]) P(c, STEEL_DK, (k) => rrect(k, X(s), Y(0.9), X(0.1), Y(0.1), X(0.02)));
      spikesArc(c, '#5a6270', X(0.5), Y(0.6), X(0.34), Y(0.47), -Math.PI * 0.85, -Math.PI * 0.15, 5, 0.32, STEEL_DK, lw * 0.5);
      P(c, STEEL, (k) => egg(k, X(0.5), Y(0.58), X(0.34), Y(0.4)), STEEL_DK, lw * 0.8);
      line(c, STEEL_DK, lw * 0.4, (k) => k.ellipse(X(0.5), Y(0.7), X(0.34), Y(0.06), 0, 0.1, Math.PI - 0.1));
      for (const s of [0.24, 0.37, 0.5, 0.63, 0.76]) dot(c, STEEL_LT, X(s), Y(0.76) + Math.abs(s - 0.5) * Y(-0.3), X(0.018));
      P(c, STEEL_DK, (k) => rrect(k, X(0.22), Y(0.37), X(0.56), Y(0.18), X(0.05)));
      goggles(c, X(0.5), Y(0.46), X(0.07), X(0.06), { frame: STEEL_LT, lens: '#ff5a3c', pupil: null, hi: false, glow: 'rgba(255,90,60,0.3)' });
      mustache(c, X(0.5), Y(0.63), X(0.3), Y(0.1));
      dot(c, STEEL_LT, X(0.42), Y(0.62), X(0.016)); dot(c, STEEL_LT, X(0.58), Y(0.62), X(0.016));
    },
  },
  {
    id: 'boulder', letter: 'K', name: 'THE HEAVY',
    note: 'The bruiser read. The egg lies low and wide, fur, with a small pale face on the upper-left and the spikes along the ridge of his back; both fists knuckle-planted in front. Low centre of gravity, the opposite of a tall pale blob.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      spikesArc(c, FUR_DK, X(0.52), Y(0.62), X(0.44), Y(0.34), -Math.PI * 0.62, -Math.PI * 0.06, 5, 0.3, OUTLINE, lw * 0.6);
      P(c, FUR, (k) => k.ellipse(X(0.52), Y(0.62), X(0.44), Y(0.34), 0, 0, TAU), OUTLINE, lw);
      P(c, CREAM, (k) => egg(k, X(0.32), Y(0.5), X(0.16), Y(0.22)), OUTLINE, lw * 0.7);
      P(c, FUR_DK, (k) => {
        k.moveTo(X(0.19), Y(0.41)); k.quadraticCurveTo(X(0.32), Y(0.35), X(0.45), Y(0.41));
        k.lineTo(X(0.45), Y(0.45)); k.quadraticCurveTo(X(0.32), Y(0.4), X(0.19), Y(0.45)); k.closePath();
      });
      goggles(c, X(0.32), Y(0.49), X(0.045), X(0.035));
      mustache(c, X(0.32), Y(0.58), X(0.17), Y(0.065));
      arm(c, X(0.3), Y(0.8), X(0.2), Y(0.9), X(0.15), FUR, OUTLINE, lw);
      arm(c, X(0.7), Y(0.8), X(0.64), Y(0.92), X(0.15), FUR, OUTLINE, lw);
    },
  },
  {
    id: 'emperor', letter: 'L', name: 'THE EMPEROR',
    note: 'The pomp read. A high-collared purple cape whose points are the spikes, a coronet, a red sash across the egg — and in his glove, on a staff, the master power strip\'s own plug. The scepter is the plot.',
    paint(c, w, h) {
      const u = Math.max(w, h), lw = 0.045 * u;
      const X = (f) => w * f, Y = (f) => h * f;
      P(c, '#3a1f4a', (k) => {
        k.moveTo(X(0.2), Y(0.46)); k.lineTo(X(0.1), Y(0.12)); k.lineTo(X(0.38), Y(0.4)); k.lineTo(X(0.62), Y(0.4)); k.lineTo(X(0.9), Y(0.12)); k.lineTo(X(0.8), Y(0.46));
        k.lineTo(X(0.94), Y(0.98)); k.lineTo(X(0.06), Y(0.98)); k.closePath();
      }, OUTLINE, lw);
      P(c, RED_DK, (k) => { k.moveTo(X(0.22), Y(0.44)); k.lineTo(X(0.16), Y(0.2)); k.lineTo(X(0.36), Y(0.42)); k.closePath(); k.moveTo(X(0.78), Y(0.44)); k.lineTo(X(0.84), Y(0.2)); k.lineTo(X(0.64), Y(0.42)); k.closePath(); });
      P(c, CREAM, (k) => egg(k, X(0.5), Y(0.6), X(0.3), Y(0.38)), OUTLINE, lw);
      c.save();
      c.beginPath(); egg(c, X(0.5), Y(0.6), X(0.3), Y(0.38)); c.clip();
      line(c, RED_DK, X(0.09), (k) => { k.moveTo(X(0.2), Y(0.5)); k.lineTo(X(0.8), Y(0.92)); });
      c.restore();
      P(c, GOLD, (k) => {
        k.moveTo(X(0.36), Y(0.25)); k.lineTo(X(0.37), Y(0.12)); k.lineTo(X(0.44), Y(0.2)); k.lineTo(X(0.5), Y(0.07));
        k.lineTo(X(0.56), Y(0.2)); k.lineTo(X(0.63), Y(0.12)); k.lineTo(X(0.64), Y(0.25)); k.closePath();
      }, OUTLINE, lw * 0.6);
      goggles(c, X(0.5), Y(0.39), X(0.055), X(0.05));
      mustache(c, X(0.5), Y(0.5), X(0.25), Y(0.08));
      line(c, '#8a8a98', X(0.03), (k) => { k.moveTo(X(0.88), Y(0.92)); k.lineTo(X(0.88), Y(0.36)); });
      P(c, '#e8e8f0', (k) => rrect(k, X(0.81), Y(0.28), X(0.14), Y(0.12), X(0.02)), OUTLINE, lw * 0.7);
      for (const s of [0.84, 0.9]) P(c, INK, (k) => k.rect(X(s), Y(0.2), X(0.025), Y(0.08)));
      dot(c, GLOVE, X(0.88), Y(0.68), X(0.055), OUTLINE, lw);
    },
  },
];

// ------------------------------- the winner's ape, shared with the vehicles
// C's bust and his tub, split so a vehicle can keep the ape and replace the
// hull. X/Y are pure scales of a 24x20 box.
function bustTop(c, X, Y, lw) {
  spikesArc(c, GREEN, X(0.5), Y(0.56), X(0.36), Y(0.2), -Math.PI * 0.95, -Math.PI * 0.05, 6, 0.5, GREEN_DK, lw * 0.5);
  P(c, GREEN, (k) => k.ellipse(X(0.5), Y(0.56), X(0.36), Y(0.2), 0, 0, TAU), GREEN_DK, lw * 0.6);
  P(c, FUR, (k) => k.ellipse(X(0.5), Y(0.62), X(0.27), Y(0.15), 0, 0, TAU), OUTLINE, lw);
  dot(c, FUR, X(0.5), Y(0.36), X(0.165), OUTLINE, lw);
  P(c, CREAM, (k) => egg(k, X(0.5), Y(0.4), X(0.11), Y(0.13)));
  goggles(c, X(0.5), Y(0.35), X(0.045), X(0.04), { strap: [X(0.35), X(0.65)] });
  mustache(c, X(0.5), Y(0.46), X(0.2), Y(0.07));
}
function hands(c, X, Y, lw) {
  dot(c, FUR, X(0.24), Y(0.6), X(0.06), OUTLINE, lw);
  dot(c, FUR, X(0.76), Y(0.6), X(0.06), OUTLINE, lw);
}
function bucketTub(c, X, Y, lw) {
  for (const s of [0.2, 0.64]) P(c, CREAM, (k) => rrect(k, X(s), Y(0.9), X(0.16), Y(0.08), X(0.02)), OUTLINE, lw * 0.7);
  P(c, '#f0f0f8', (k) => rrect(k, X(0.12), Y(0.6), X(0.76), Y(0.34), X(0.07)), OUTLINE, lw);
  for (const s of [0.24, 0.46, 0.68]) P(c, RED, (k) => rrect(k, X(s), Y(0.66), X(0.08), Y(0.24), X(0.01)));
  P(c, '#d0d0dc', (k) => rrect(k, X(0.1), Y(0.58), X(0.8), Y(0.08), X(0.03)), OUTLINE, lw * 0.7);
  dot(c, GOLD, X(0.19), Y(0.8), X(0.045), OUTLINE, lw * 0.5);
  dot(c, GOLD, X(0.81), Y(0.8), X(0.045), OUTLINE, lw * 0.5);
  hands(c, X, Y, lw);
}
function bucketBust(c, X, Y, lw) { bustTop(c, X, Y, lw); bucketTub(c, X, Y, lw); }

// ------------------------------------------- round 2: ten ways to travel
// T1 (the three-quarter rotor) ships as the copter and T6 (the balloon) as the
// Act III boss. The other eight are vehicles looking for a driver — a minion's
// ride, a rival's entrance, a cabinet's own boss.
const SPIN = 3;
const APE = { w: 24, h: 20 };
const apeAt = (ox, oy) => {
  const SX = (f) => APE.w * f, SY = (f) => APE.h * f, lw = 0.045 * APE.w;
  const at = (fn) => (c) => { c.save(); c.translate(ox, oy); fn(c, SX, SY, lw); c.restore(); };
  return {
    X: (f) => ox + APE.w * f, Y: (f) => oy + APE.h * f, lw,
    bust: at(bucketBust), top: at(bustTop), tub: at(bucketTub), hands: at(hands),
  };
};
const byId = (id) => EGGSHELL_CANDIDATES.find((c) => c.id === id);

export const EGGSHELL_TRAVEL = [
  {
    id: 'rotor34', letter: 'T1', name: 'ROTOR, THREE-QUARTER (SHIPPED)', box: [28, 28],
    note: 'The winner, and now the shipped copter: the disc tipped toward the camera so it reads as a disc, the near blade passing in front of his head. The production painter (eggshellCopter) drops the translucent disc — see the rotor bake-off.',
    paint(c, t) {
      const ape = apeAt(2, 8);
      const { Y } = ape;
      const cx = 14, hy = 6.5, R = 13, sq = 0.42;
      const a = (t * SPIN * TAU) % TAU;
      const blades = [a, a + Math.PI];
      const disc = (from, to) => P(c, 'rgba(200,200,216,0.22)', (k) => k.ellipse(cx, hy, R, R * sq, 0, from, to));
      const sweep = (b) => line(c, 'rgba(200,200,216,0.38)', 1.6, (k) => k.ellipse(cx, hy, R * 0.82, R * sq * 0.82, 0, b - 1.0, b));
      const blade = (b) => {
        line(c, '#3a3a48', 1.0, (k) => { k.moveTo(cx + Math.cos(b) * R * 0.1, hy + Math.sin(b) * R * sq * 0.1); k.lineTo(cx + Math.cos(b) * R, hy + Math.sin(b) * R * sq); });
        line(c, '#9a9aa8', 0.38, (k) => { k.moveTo(cx + Math.cos(b) * R * 0.2, hy + Math.sin(b) * R * sq * 0.2); k.lineTo(cx + Math.cos(b) * R * 0.92, hy + Math.sin(b) * R * sq * 0.92); });
      };
      disc(Math.PI, TAU);
      for (const b of blades) if (Math.sin(b) < 0) { sweep(b); blade(b); }
      line(c, '#3a3a48', 0.85, (k) => { k.moveTo(cx, hy); k.lineTo(cx, Y(0.34)); });
      ape.bust(c);
      disc(0, Math.PI);
      for (const b of blades) if (Math.sin(b) >= 0) { sweep(b); blade(b); }
      line(c, 'rgba(236,236,246,0.45)', 0.35, (k) => k.ellipse(cx, hy, R, R * sq, 0, 0, TAU));
      dot(c, '#8a8a98', cx, hy, 1, OUTLINE, 0.5);
    },
  },
  {
    id: 'fanback', letter: 'T2', name: 'FAN-BACK', box: [28, 24],
    note: 'The propeller where 2D can see it: a ducted fan mounted on the back of the bucket, face-on to the camera, its blades turning either side of his head like a halo. Airboat logic. Nothing is edge-on.',
    paint(c, t) {
      const ape = apeAt(2, 4);
      const cx = 14, cy = 9.5, R = 9.5;
      const a = (t * SPIN * TAU) % TAU;
      dot(c, '#3a3a48', cx, cy, R + 1);
      dot(c, '#6a6a7a', cx, cy, R);
      dot(c, '#1e1e28', cx, cy, R - 0.9);
      for (let i = 0; i < 3; i++) {
        const b = a + i * (TAU / 3);
        P(c, 'rgba(184,192,208,0.25)', (k) => { k.moveTo(cx, cy); k.arc(cx, cy, R - 1.4, b - 0.95, b - 0.3); k.closePath(); });
        P(c, '#b8c0d0', (k) => { k.moveTo(cx, cy); k.arc(cx, cy, R - 1.4, b - 0.32, b + 0.32); k.closePath(); }, 'rgba(26,16,40,0.3)', 0.3);
      }
      line(c, '#8a8a98', 0.35, (k) => { k.moveTo(cx - R, cy); k.lineTo(cx + R, cy); k.moveTo(cx, cy - R); k.lineTo(cx, cy + R); });
      ape.bust(c);
    },
  },
  {
    id: 'rocket', letter: 'T3', name: 'ROCKET BUCKET', box: [24, 30],
    note: 'Jet powered, the simplest possible read: one nozzle under the tub between the skids, one flickering flame, smoke. No rotor, no mast — the drawing is C plus fire.',
    paint(c, t) {
      const ape = apeAt(0, 0);
      ape.bust(c);
      P(c, '#3a3f4a', (k) => { k.moveTo(9, 19.3); k.lineTo(15, 19.3); k.lineTo(16.5, 23); k.lineTo(7.5, 23); k.closePath(); }, OUTLINE, 1.08 * 0.6);
      P(c, '#7d8594', (k) => rrect(k, 8.2, 21, 7.6, 1.2, 0.5));
      flame(c, 12, 23, 8, 7, t, 1);
      puffs(c, 12, 28, t, 0.3);
    },
  },
  {
    id: 'twinjets', letter: 'T4', name: 'TWIN JETS', box: [32, 28],
    note: 'Two jet pods bolted to the tub\'s sides, flames angled out. The widest silhouette of the ten and the most "boss": both fires are visible at once, clear of the body, so the read never depends on the tub.',
    paint(c, t) {
      const ape = apeAt(4, 0);
      for (const [sx, dir] of [[0.8, 1], [26.2, -1]]) {
        P(c, '#3a3f4a', (k) => rrect(k, sx, 9, 5, 9, 1.6), OUTLINE, 0.65);
        P(c, '#7d8594', (k) => rrect(k, sx + 0.6, 11, 3.8, 1.4, 0.5));
        P(c, '#2a2f3a', (k) => rrect(k, sx + 1, 17.6, 3, 1.4, 0.4));
        flame(c, sx + 2.5, 19, 4.5, 8, t, sx, -dir * 0.2);
      }
      ape.bust(c);
    },
  },
  {
    id: 'eggmobile', letter: 'T5', name: 'EGG MOBILE', box: [30, 26],
    note: 'The Robotnik pod: a rounded grey hover-car with a red go-faster stripe, a blue lift cushion underneath and a rear exhaust jetting sideways. The tub is gone; the ape and the green shell stay.',
    paint(c, t) {
      const ape = apeAt(3, 0);
      P(c, 'rgba(90,160,232,0.32)', (k) => k.ellipse(15, 22.6, 9.5, 1.7, 0, 0, TAU));
      P(c, 'rgba(160,210,255,0.5)', (k) => k.ellipse(15, 22.3, 5.5, 0.8, 0, 0, TAU));
      P(c, '#3a3f4a', (k) => rrect(k, 25.2, 14.6, 3.2, 3.8, 0.8), OUTLINE, 0.65);
      flame(c, 28.4, 16.5, 3.6, 7, t, 3, -Math.PI / 2);
      ape.top(c);
      P(c, '#8f9bb0', (k) => rrect(k, 4, 11.8, 22, 9.6, 4), 'rgba(26,34,50,0.6)', 0.86);
      P(c, RED, (k) => rrect(k, 5.2, 15.4, 19.6, 1.5, 0.7));
      P(c, '#5c6577', (k) => rrect(k, 3.4, 11.2, 23.2, 2.2, 1.1), OUTLINE, 0.65);
      ape.hands(c);
    },
  },
  {
    id: 'balloon', letter: 'T6', name: 'CLOWN BALLOON (SHIPPED)', box: [28, 46],
    note: 'The Act III boss, and that fight\'s weak point: a striped hot-air balloon with the tub as its basket. Slow, tall, pompous — a villain who arrives at his own pace. The production painter is eggshellBalloon.',
    paint(c, t) {
      const ape = apeAt(2, 26);
      const { X, Y } = ape;
      const cx = 14, cy = 12.5, rx = 12.5, ry = 13;
      c.save();
      c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.clip();
      c.fillStyle = CREAM; c.fillRect(0, 0, 28, 28);
      for (let i = 0; i < 7; i += 2) { c.fillStyle = RED; c.fillRect(cx - rx + i * (2 * rx / 7), 0, 2 * rx / 7, 28); }
      c.restore();
      line(c, OUTLINE, 1.08, (k) => k.ellipse(cx, cy, rx, ry, 0, 0, TAU));
      P(c, '#3a3f4a', (k) => { k.moveTo(11.3, 25); k.lineTo(16.7, 25); k.lineTo(15.7, 27.5); k.lineTo(12.3, 27.5); k.closePath(); }, OUTLINE, 0.65);
      line(c, '#5a4a3a', 0.4, (k) => {
        k.moveTo(12.4, 27.5); k.lineTo(X(0.13), Y(0.6));
        k.moveTo(14, 27.5); k.lineTo(14, Y(0.34));
        k.moveTo(15.6, 27.5); k.lineTo(X(0.87), Y(0.6));
      });
      ape.bust(c);
    },
  },
  {
    id: 'jetpack', letter: 'T7', name: 'JETPACK KONG', box: [28, 28],
    note: 'Another body: B, the ape read, with twin tanks strapped behind the shoulders and the fire coming out under his fists. No vehicle at all — he IS the vehicle, which is the most ape-like of the ten.',
    paint(c, t) {
      for (const [sx, dir] of [[1, 1], [23, -1]]) {
        P(c, '#7d8594', (k) => rrect(k, sx, 3, 4.2, 10, 1.6), '#3a3f4a', 0.5);
        dot(c, '#3a3f4a', sx + 2.1, 3.4, 1.4);
        P(c, '#2a2f3a', (k) => rrect(k, sx + 0.9, 12.8, 2.4, 1.4, 0.4));
        flame(c, sx + 2.1, 14.2, 3.6, 9, t, sx, -dir * 0.15);
      }
      c.save(); c.translate(2, 0); byId('kong').paint(c, 24, 20, t); c.restore();
    },
  },
  {
    id: 'throne', letter: 'T8', name: 'HOVER THRONE', box: [28, 32],
    note: 'Another body: L, the Emperor, on a floating throne — a high gold-trimmed back behind the cape, a lift cushion and two small jets under the seat. The plug scepter comes with him.',
    paint(c, t) {
      P(c, '#5a1f2a', (k) => rrect(k, 5, 0, 18, 24, 2.5), GOLD, 0.6);
      dot(c, GOLD, 6.5, 0.9, 1); dot(c, GOLD, 21.5, 0.9, 1);
      c.save(); c.translate(2, 4); byId('emperor').paint(c, 24, 20, t); c.restore();
      P(c, '#3a1f4a', (k) => rrect(k, 2, 23.4, 24, 4, 1.2), GOLD, 0.6);
      P(c, 'rgba(90,160,232,0.32)', (k) => k.ellipse(14, 29, 10, 1.5, 0, 0, TAU));
      flame(c, 7, 27.4, 3, 4.5, t, 5); flame(c, 21, 27.4, 3, 4.5, t, 7);
    },
  },
  {
    id: 'blimp', letter: 'T9', name: 'CLOWN BLIMP', box: [34, 38],
    note: 'A small striped airship with the tub slung underneath as its gondola, red fins at the tail. The most "menace from above" silhouette, and the only one wider than it is tall.',
    paint(c, t) {
      const ape = apeAt(5, 18);
      const { X, Y } = ape;
      const cx = 17, cy = 8.5, rx = 16, ry = 7.5;
      c.save();
      c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.clip();
      c.fillStyle = CREAM; c.fillRect(0, 0, 34, 17);
      c.fillStyle = RED; for (const x of [7, 15, 23]) c.fillRect(x, 0, 4, 17);
      c.restore();
      line(c, OUTLINE, 1.08, (k) => k.ellipse(cx, cy, rx, ry, 0, 0, TAU));
      P(c, RED, (k) => { k.moveTo(29.5, 8.5); k.lineTo(34, 3.5); k.lineTo(33.4, 8.5); k.closePath(); k.moveTo(29.5, 8.5); k.lineTo(34, 13.5); k.lineTo(33.4, 8.5); k.closePath(); }, OUTLINE, 0.65);
      line(c, '#3a3a48', 0.5, (k) => { k.moveTo(10, 15.2); k.lineTo(X(0.2), Y(0.6)); k.moveTo(24, 15.2); k.lineTo(X(0.8), Y(0.6)); });
      ape.bust(c);
    },
  },
  {
    id: 'monowheel', letter: 'T10', name: 'MONOWHEEL', box: [30, 30], ground: true,
    note: 'The one ground option: the tub inside one big tyre, tread rolling. Alt 0 — he would drive at you instead of hovering, which is a different fight.',
    paint(c, t) {
      const ape = apeAt(3, 6);
      const cx = 15, cy = 15, a = t * 0.7 * TAU;
      line(c, '#2a2a34', 2.4, (k) => k.arc(cx, cy, 13.4, 0, TAU));
      for (let i = 0; i < 18; i++) {
        const b = a + i * (TAU / 18);
        line(c, '#8a8a98', 0.5, (k) => { k.moveTo(cx + Math.cos(b) * 12.4, cy + Math.sin(b) * 12.4); k.lineTo(cx + Math.cos(b) * 14.4, cy + Math.sin(b) * 14.4); });
      }
      line(c, '#6a6a7a', 0.8, (k) => k.arc(cx, cy, 12, 0, TAU));
      ape.bust(c);
    },
  },
];

const BY_ID = Object.fromEntries(EGGSHELL_CANDIDATES.map((c) => [c.id, c]));
const TRAVEL_BY_ID = Object.fromEntries(EGGSHELL_TRAVEL.map((o) => [o.id, o]));

// Paint one body into a local 0..w by 0..h box at the current origin.
export function drawEggshellCandidate(ctx, id, w, h, t = 0) {
  const cand = BY_ID[id];
  if (!cand) throw new Error(`unknown eggshell candidate: ${id}`);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  cand.paint(ctx, w, h, t);
  ctx.restore();
}

// Paint one vehicle, stretching its nominal box the way drawProp stretches a
// painter.
export function drawEggshellTravel(ctx, id, w, h, t = 0) {
  const opt = TRAVEL_BY_ID[id];
  if (!opt) throw new Error(`unknown eggshell travel option: ${id}`);
  ctx.save();
  ctx.scale(w / opt.box[0], h / opt.box[1]);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  opt.paint(ctx, t);
  ctx.restore();
}
