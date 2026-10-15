// THE SWIPING CATS — the painters behind src/dev/neon-cat-candidates.js (the bake-off
// sheet, 16 Oct 2026), and the four that SHIPPED the same day (Peter: "i like regular
// pythagorus in daylight (so make sure we have one on level 1). But Mecha Neon (J)
// should replace the dog in the dark levels mixed in with N (Nekomata ghost) … If we
// are meant to show more than 2, then include neon brighter L as a 3rd option"):
//
//   catPythagoras  H  the chocolate Burmese — Terminal Velocity 1, in the golden hour
//   catMechaNeon   J  the robot cat with the red neon rim — the dark levels
//   catNekoGhost   N  the two-tailed nekomata, ghost-lit — the dark levels
//   catNeonBright  L  the black neon-tube cat, brighter — the third, if a level deals one
//
// THE MECHANIC IS THE RATTLESNAKE'S: a stationary hazard that swipes AS YOU ARRIVE — the
// run starts its clock SWIPE_LEAD ahead (run.js, the `strikes` def flag) and draw.js
// steps the swipe frames from it. Its box takes in the reach; the answer is the jump.
//
// The bake-off painters draw in the 24x21 painted envelope with a continuous clock;
// catPainter() below turns one into the animal contract (ctx, w, h, frame) the props
// raster cache wants: CAT_IDLE_FRAMES of idle at CAT_FPS (every idle motion runs whole
// cycles in that ring, so it loops), then CAT_STRIKE_FRAMES over SWIPE_T.

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, v) => { const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };

// The rattlesnake's numbers (sprites/animals.js SNAKE_STRIKE_T / SNAKE_STRIKE_LEAD),
// restated rather than imported because animals.js imports this module.
export const SWIPE_T = 0.85;
export const SWIPE_LEAD = 0.5;
// The cats strike CLOSER than the snake (Peter, 16 Oct 2026: "i feel the cat should
// strike when the hero is closer", then "make it .1 second before so it reads a little
// better"): fired 0.4s out, the paw is fully out 0.1s before he reaches the box and held
// as he goes over it. The snake keeps its 0.5.
export const CAT_STRIKE_LEAD = 0.4;

export const CAT_SLOT = Object.freeze({
  box: [18, 11], tall: 1.45, name: 'SWIPES AS YOU ARRIVE',
  was: 'the rattlesnake — 18x10, jump, strikes as you arrive',
});

// The snake's curve, verbatim: `s` 0 at rest, 1 at full reach; `w` the wind-up before it.
// `u` is seconds since the trigger, or null for idle.
export function swipeOf(u) {
  if (u == null || u < 0 || u >= SWIPE_T) return { s: 0, w: 0, u: -1 };
  const s = u < 0.2 ? 0 : u < 0.3 ? smooth(0.2, 0.3, u) : u < 0.48 ? 1 : 1 - smooth(0.48, 0.85, u);
  const w = smooth(0, 0.16, u) * (1 - smooth(0.2, 0.26, u));
  return { s, w, u };
}

// The idle ring's length in seconds (see the game's contract at the end).
const IDLE_LOOP = 2;

// ------------------------------------------------------------------ the hand
const INK = '#0b0920';
const LW = 0.55;
const LWI = 0.32;
const LWF = 0.2;
const RED = '#ff2e4d', RED_DK = '#a8122e';
const WHITE = '#ffffff';

function pen(c, col, lw) {
  c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round';
}
function line(c, x0, y0, x1, y1, col, lw) {
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); pen(c, col, lw); c.stroke();
}
function fillPath(c, col, path) { c.beginPath(); path(c); c.fillStyle = col; c.fill(); }
function strokePath(c, col, lw, path) { c.beginPath(); path(c); pen(c, col, lw); c.stroke(); }
const circle = (x, y, r) => (p) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); };
const oval = (x, y, rx, ry, rot = 0) => (p) => { p.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); p.ellipse(x, y, rx, ry, rot, 0, TAU); };
const polyP = (pts) => (p) => { p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); };

// ONE SILHOUETTE, INKED ONCE (the kennel's rule, sprites/dogs.js): every part of a
// solid stroked at twice the line first, then all of them filled, so the only ink is the
// outside of the union. `edge` swaps the ink for something else — a tube, for the neon
// take — and gets the same union.
function solid(c, parts, fill, { ink = INK, lw = LW, edge = null, inner = null } = {}) {
  const all = (p) => { for (const part of parts) part(p); };
  if (edge) edge(c, all);
  else if (ink) strokePath(c, ink, lw * 2, all);
  // Each part filled on its own: parts wound in opposite directions would cancel to a
  // hole where they overlap under the nonzero rule.
  for (const part of parts) fillPath(c, fill, part);
  if (inner) {
    c.save();
    c.beginPath(); all(c); c.clip();
    inner(c);
    c.restore();
  }
}

// A limb: an inked stroke with the fill laid down its middle, so it joins whatever it
// grows out of as one body.
function limb(c, path, width, fill, ink = INK, lw = LW) {
  if (ink) strokePath(c, ink, width + lw * 2, path);
  strokePath(c, fill, width, path);
}

const hotCache = new Map();
function whiteHot(hex, amt = 0.55) {
  const key = hex + amt;
  if (!hotCache.has(key)) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    hotCache.set(key, `rgb(${v.map((ch) => Math.round(ch + (255 - ch) * amt)).join(',')})`);
  }
  return hotCache.get(key);
}
// The pack's neon line: faint wide stroke, the colour, a white-hot core.
function tube(c, color, width, path, lit = 1, glow = 0.24) {
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const a = c.globalAlpha;
  c.globalAlpha = a * glow * lit; c.strokeStyle = color; c.lineWidth = width * 3;
  c.beginPath(); path(c); c.stroke();
  c.globalAlpha = a * (0.25 + 0.75 * lit); c.lineWidth = width;
  c.beginPath(); path(c); c.stroke();
  c.globalAlpha = a * lit; c.strokeStyle = whiteHot(color); c.lineWidth = width * 0.42;
  c.beginPath(); path(c); c.stroke();
  c.restore();
}

// A NEON RIM round an inked body: a tube laid along the outline UNDER the ink, so its
// inner half is hidden by the ink and the fill and only the light outside the contour
// shows — the dark cat lit by the signs rather than drawn in them.
const haloEdge = (col, lit = 1) => (c, all) => {
  tube(c, col, 1.7, all, lit, 0.07);
  strokePath(c, INK, LW * 2, all);
};

// ------------------------------------------------------------------ the rig
// One sitting cat, facing left at the hero, in the 24x21 envelope. Every take reads its
// pose from here so the swipe is the same gesture on every sheet row; a take's own
// proportions arrive as `o` (head size and place, body scale, where the paw rests).
function rig(w, h, t, u, o = {}) {
  const g = h - 0.2;
  const { s, w: wind } = swipeOf(u);
  const angry = Math.max(wind, s);
  // The chest goes with the paw: rocks back on the wind, throws forward on the swipe.
  const L = -1.5 * s + 0.6 * wind;
  // THE IDLE (Peter, 16 Oct 2026: "do the cats have an idle animation? perhaps they
  // should" — they had one, too small to see at lane size). A slow breath the head
  // rides on, the tail swishing (tailSwing), an ear flicking back mid-ring, a paw
  // tapping the road, a blink at the end. All whole cycles of the 2 s ring.
  const breathe = Math.sin(t * TAU * 0.5) * 0.4 * (1 - angry);
  const headR = o.headR ?? 3.3;
  const hx = (o.headX ?? 8.4) + L * 1.15;
  const hy = (o.headY ?? 8.2) + wind * 0.7 + s * 0.9 + breathe;
  const shoulder = [(o.shoulderX ?? 11.4) + L, (o.shoulderY ?? 12.6) + wind * 0.4];
  // The tap: the resting forepaw lifts and comes down once a ring, impatient.
  const tap = o.rest ? 0 : bump(t % IDLE_LOOP, 1.35, 1.75) * 1.1;
  const rest = o.rest ? o.rest(t) : [9.4 + tap * 0.3, g - 0.7 - tap];
  const up = o.wind ?? [12.2, 5.6];
  const reach = o.reach ?? [1.7, 13.6];
  const p0 = [lerp(rest[0], up[0], wind), lerp(rest[1], up[1], wind)];
  const paw = [lerp(p0[0], reach[0], s), lerp(p0[1], reach[1], s)];
  // Ears flatten back for the swipe; one twitches now and then at rest.
  const twitch = bump(t % IDLE_LOOP, 0.85, 1.15);
  const blink = (t % IDLE_LOOP) > IDLE_LOOP - 0.15;
  return { g, s, wind, angry, L, hx, hy, headR, shoulder, paw, twitch, blink, t, u: u ?? -1 };
}

// The near forelimb, shoulder to paw: bent at the wrist while it rests or winds, a
// straight line at full reach.
function nearLeg(c, R, width, fill, { ink = INK, edge = null } = {}) {
  const [sx, sy] = R.shoulder;
  const [px, py] = R.paw;
  const bend = 1 - R.s;
  const mx = (sx + px) / 2 + 1.1 * bend, my = (sy + py) / 2 + 0.4 * bend;
  const path = (p) => { p.moveTo(sx, sy); p.quadraticCurveTo(mx, my, px, py); };
  if (edge) { edge(c, path, width); strokePath(c, fill, width, path); } else limb(c, path, width, fill, ink);
}

// Claws: three hooks off the leading edge of the paw, out for the wind and the swipe.
function claws(c, R, r, col = WHITE, lw = 0.32, len = 1) {
  const out = Math.max(R.wind, R.s);
  if (out < 0.25) return;
  const [px, py] = R.paw;
  for (let i = -1; i <= 1; i++) {
    const a = Math.PI + i * 0.5 + (R.s - 0.5) * 0.3;
    const x0 = px + Math.cos(a) * r * 0.85, y0 = py + Math.sin(a) * r * 0.85;
    const x1 = px + Math.cos(a) * (r + 0.9 * len * out), y1 = py + Math.sin(a) * (r + 0.9 * len * out);
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(x1, y1 - 0.2, x1 - 0.1, y1 + 0.45);
    pen(c, INK, lw + 0.25); c.stroke();
    pen(c, col, lw); c.stroke();
  }
}

// Swipe marks: three arcs along the path the paw just swept — from up by the ear, down
// and out to full reach — strongest as it lands, fading through the hold.
function slashes(c, R, draw) {
  if (R.s < 0.35 || R.u < 0) return;
  const fade = R.u < 0.36 ? 1 : 1 - smooth(0.36, 0.6, R.u);
  if (fade <= 0) return;
  const [px, py] = R.paw;
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * 1.25;
    const path = (p) => {
      p.moveTo(px + 2.6 + o * 0.3, py - 4.2 + o);
      p.quadraticCurveTo(px - 0.2 + o * 0.2, py - 2.6 + o, px - 1.6, py + 0.6 + o * 0.9);
    };
    draw(c, path, fade * R.s, i);
  }
}
const whiteSlash = (c, path, a) => {
  c.save(); c.globalAlpha *= a * 0.85;
  strokePath(c, 'rgba(255,255,255,0.35)', 1.0, path);
  strokePath(c, WHITE, 0.32, path);
  c.restore();
};
const redSlash = (c, path, a) => tube(c, RED, 0.5, path, a, 0.35);

// Head parts: a round skull, a whisker pad forward of it, two ears. `flat` lays the ears
// back (0..1); `big` scales the lot for the chibi.
function headParts(R, { r = R.headR, earH = 1, earW = 1, flat = R.angry, muzzle = 1, notch = false } = {}) {
  const { hx, hy } = R;
  const k = r / 3.3;
  const tilt = flat * 2.2 * k;
  const ear = (b0, b1, tip, tw) => {
    const tx = tip[0] + tilt + tw * 1.3, ty = tip[1] + tilt * 0.9 + tw * 0.6;
    return (p) => {
      p.moveTo(b0[0], b0[1]);
      p.lineTo(tx, ty);
      if (notch) { p.lineTo(lerp(tx, b1[0], 0.35) + 0.5, lerp(ty, b1[1], 0.35)); p.lineTo(lerp(tx, b1[0], 0.5), lerp(ty, b1[1], 0.5)); }
      p.lineTo(b1[0], b1[1]);
      p.closePath();
    };
  };
  const front = ear([hx - 2.9 * k * earW, hy - 1.3 * k], [hx - 0.5 * k, hy - 3.0 * k], [hx - 2.5 * k * earW, hy - (3.0 + 2.3 * earH) * k], R.twitch);
  const back = ear([hx + 0.2 * k, hy - 3.2 * k], [hx + 2.6 * k * earW, hy - 1.9 * k], [hx + 1.7 * k * earW, hy - (3.2 + 2.3 * earH) * k], 0);
  const parts = [back, front, circle(hx, hy, r)];
  if (muzzle) parts.push(oval(hx - 2.3 * k, hy + 0.95 * k, 1.55 * k * muzzle, 1.2 * k * muzzle));
  return { parts, k, front, back };
}

// The torso: nape over an arched back to the rump, down to the ground and up the chest;
// the haunch an oval on the back half. `arch` lifts the back (the Halloween cat).
function torsoParts(R, { arch = 1.6, haunch = [17.2, 4.6, 5.2, 4.4], chest = 0 } = {}) {
  const { g, L } = R;
  const a = arch * R.wind + arch * 0.4 * R.s;
  const [hcx, hup, hrx, hry] = haunch;
  return [
    (p) => {
      p.moveTo(11.6 + L, 9.8 + R.wind * 0.6);
      p.quadraticCurveTo(16.6, 8.4 - a * 1.6, 20.8, 13.4);
      p.lineTo(21.6, g);
      p.lineTo(10.6 + L * 0.5 - chest * 0.3, g);
      p.quadraticCurveTo(8.6 + L - chest, 15.6, 9.8 + L, 11.4);
      p.closePath();
    },
    oval(hcx, g - hup, hrx, hry),
  ];
}

// A tail: root at the rump, up the back of the cat, the tip swaying.
// A rise and fall over [a, b] seconds, 0 outside it.
function bump(t, a, b) {
  if (t <= a || t >= b) return 0;
  return Math.sin(((t - a) / (b - a)) * Math.PI);
}
// The tail's swish: a slow sweep with a quicker flick on top, so it does not just
// pendulum, and the tip curling up as it goes over. [dx, dy] for tail `k`.
export function tailSwing(R, k = 0, amp = 1.5) {
  const calm = 1 - R.angry * 0.7;
  const a = R.t * TAU * 0.5 + k * 1.9;
  const dx = (Math.sin(a) + 0.35 * Math.sin(2 * a + 0.6)) * amp * calm;
  const dy = -0.7 * Math.max(0, Math.sin(2 * a)) * amp * calm;
  return [dx, dy];
}
function tailPath(R, { root = [20.8, R.g - 3], tip = null, sway = 1.5, k = 0 } = {}) {
  const [sw, lift] = tailSwing(R, k, sway);
  const tp = tip || [21.0 + sw - k * 2.0, 9.8 - k * 0.8 - R.angry * 1.2 + lift];
  return (p) => {
    p.moveTo(root[0], root[1]);
    p.bezierCurveTo(23.4, root[1] - 0.6, 23.6 - k * 1.2, tp[1] + 3.6, tp[0], tp[1]);
  };
}

function farLeg(R, x = 11.9) {
  return (p) => { p.moveTo(x + R.L * 0.7, 13.4); p.lineTo(x + 0.2 + R.L * 0.3, R.g - 0.6); };
}

// ================================================================ the takes

// A — NORA (野良, the stray). The realistic one: a lean grey-brown mackerel tabby off a
// back street in Shinjuku, a notch out of one ear, eyes narrowed to yellow-green slits.
// It goes up into the arch and hisses on the wind, and the swipe has its claws out. The
// only concession to the city is the light: a magenta rim down its back, off the signs.
const NORA = { fur: '#7a6858', lit: '#a58f78', dark: '#4b3e34', stripe: '#2f2620', belly: '#c4b39b',
  pink: '#c98a8a', eye: '#c6d24a', rim: '#ff5aa8' };
export function nora(c, w, h, t, u) {
  const P = NORA;
  const R = rig(w, h, t, u);
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, whiteSlash);
  const tailW = 1.5 + 1.2 * R.angry; // bottle-brush when it is cross
  limb(c, tailPath(R, {}), tailW, P.fur);
  strokePath(c, P.stripe, tailW * 0.9, (p) => { tailPath(R, {})(p); });
  limb(c, tailPath(R, {}), tailW * 0.55, P.fur, null);
  limb(c, farLeg(R), 1.7, P.dark);
  solid(c, torsoParts(R, { arch: 2.0 }), P.fur, {
    inner: (q) => {
      // Shade band along the belly, lit sliver down the back, the rim light over it.
      fillPath(q, P.dark, (p) => p.rect(0, R.g - 2.2, w, 3));
      strokePath(q, P.lit, 1.2, (p) => { p.moveTo(11.8 + R.L, 10.6); p.quadraticCurveTo(16.4, 9.2 - R.wind * 3.2, 20.4, 14); });
      strokePath(q, P.rim, 0.35, (p) => { p.moveTo(12.4 + R.L, 9.9); p.quadraticCurveTo(16.4, 8.4 - R.wind * 3.2, 20.6, 13.2); });
      // Mackerel stripes over the back and round the haunch.
      for (let i = 0; i < 5; i++) {
        const x = 13.2 + i * 1.7;
        strokePath(q, P.stripe, 0.55, (p) => { p.moveTo(x - 0.4, 8); p.quadraticCurveTo(x + 0.6, 11.4, x - 0.2, 14.2); });
      }
      for (let i = 0; i < 3; i++) strokePath(q, P.stripe, 0.5, (p) => p.ellipse(17.2, R.g - 4.6, 2.2 + i * 1.1, 1.8 + i * 0.9, 0, Math.PI * 0.95, Math.PI * 1.9));
      // A pale bib down the chest.
      fillPath(q, P.belly, oval(10.2 + R.L, 14.4, 1.5, 3.0, 0.2));
    },
  });
  const H = headParts(R, { notch: true });
  solid(c, H.parts, P.fur, {
    inner: (q) => {
      fillPath(q, P.lit, circle(R.hx - 0.7, R.hy - 1.0, R.headR * 0.85));
      fillPath(q, P.fur, circle(R.hx + 0.4, R.hy + 0.5, R.headR * 0.9));
      // The M on the brow and the cheek stripes.
      strokePath(q, P.stripe, 0.4, (p) => { p.moveTo(R.hx - 1.5, R.hy - 1.6); p.lineTo(R.hx - 0.9, R.hy - 2.8); p.lineTo(R.hx - 0.3, R.hy - 1.9); p.lineTo(R.hx + 0.3, R.hy - 2.9); p.lineTo(R.hx + 0.8, R.hy - 1.7); });
      for (let i = 0; i < 2; i++) strokePath(q, P.stripe, 0.35, (p) => { p.moveTo(R.hx + 0.6, R.hy + 0.2 + i * 0.9); p.lineTo(R.hx + 2.6, R.hy - 0.2 + i * 1.0); });
      fillPath(q, P.belly, oval(R.hx - 2.3, R.hy + 1.5, 1.4, 0.75));
    },
  });
  fillPath(c, P.pink, polyP([R.hx - 2.3, R.hy - 1.9, R.hx - 1.0, R.hy - 2.8, R.hx - 2.0 + R.angry * 2.0, R.hy - 4.4 + R.angry * 1.8]));
  // The face: almond eye, slit pupil, narrowing as it gets angry.
  const eo = R.blink ? 0.08 : 0.52 * (1 - R.angry * 0.45);
  fillPath(c, P.eye, oval(R.hx - 1.5, R.hy - 0.5, 0.8, eo, -0.15));
  fillPath(c, INK, oval(R.hx - 1.6, R.hy - 0.5, 0.17, Math.max(0.05, eo * 0.95), 0));
  strokePath(c, INK, 0.28, (p) => { p.moveTo(R.hx - 2.4, R.hy - 0.3 - R.angry * 0.2); p.lineTo(R.hx - 0.7, R.hy - 0.9 - R.angry * 0.1); });
  fillPath(c, P.pink, polyP([R.hx - 3.9, R.hy + 0.3, R.hx - 3.2, R.hy + 0.3, R.hx - 3.6, R.hy + 0.8]));
  const gape = R.angry;
  if (gape > 0.1) {
    fillPath(c, '#3a1418', polyP([R.hx - 3.7, R.hy + 1.2, R.hx - 1.6, R.hy + 1.5, R.hx - 3.3, R.hy + 1.4 + gape * 1.5]));
    fillPath(c, WHITE, polyP([R.hx - 3.3, R.hy + 1.25, R.hx - 3.0, R.hy + 1.3, R.hx - 3.2, R.hy + 1.25 + gape * 0.9]));
  } else {
    strokePath(c, INK, 0.2, (p) => { p.moveTo(R.hx - 3.6, R.hy + 0.9); p.quadraticCurveTo(R.hx - 3.1, R.hy + 1.4, R.hx - 2.5, R.hy + 1.1); });
  }
  for (let i = 0; i < 3; i++) line(c, R.hx - 2.6, R.hy + 0.9 + i * 0.35, R.hx - 5.4, R.hy + 0.3 + i * 0.6, 'rgba(255,255,255,0.75)', 0.12);
  nearLeg(c, R, 1.85, P.fur);
  solid(c, [circle(R.paw[0], R.paw[1], 1.15)], P.fur, { inner: (q) => fillPath(q, P.lit, circle(R.paw[0] - 0.3, R.paw[1] - 0.4, 0.8)) });
  claws(c, R, 1.15);
}

// B — MANEKI-NEKO (招き猫). The beckoning cat off every shop counter in the city, life
// size and in the road: white glaze, calico patches, a red collar and gold bell, the
// gold koban held to its chest. The raised paw beckons — come in, come in — and as you
// arrive it stops beckoning and SWIPES, the eyes gone to red slits. The cute one with a
// twist; the glaze stays porcelain, so it reads as a statue that has had enough.
const NEKO = { glaze: '#f7f3ea', shade: '#d6cdbf', lit: '#ffffff', calico: '#e8962e', black: '#2a2430',
  collar: '#d8263a', gold: '#f2c23a', goldDk: '#b8871c', ear: '#f08a96' };
export function maneki(c, w, h, t, u) {
  const P = NEKO;
  const g = h - 0.2;
  // Beckoning: the raised paw dips at the wrist a little over once a second.
  const beck = Math.sin(t * TAU * 1.0);
  const R = rig(w, h, t, u, {
    // The beckoning paw is raised on the RIGHT, up by the far ear, and the swipe comes
    // from there — over the top and down across the lane (Peter, 16 Oct: "b's paw is on
    // the left and he attacks on the right, would be better if his waving paw was right
    // and he swiped from there").
    headR: 4.3, headX: 10.6, headY: 6.6, shoulderX: 14.2, shoulderY: 11.0,
    rest: () => [17.0, 4.6 + beck * 1.2], wind: [18.4, 2.6], reach: [1.8, 13.4],
  });
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, redSlash);
  // The body: one upright pear, seated, the haunch a swell at the back.
  solid(c, [
    (p) => {
      p.moveTo(10.2 + R.L * 0.6, 9.6);
      p.bezierCurveTo(6.8 + R.L * 0.6, 13.6, 7.4, g, 11.6, g);
      p.lineTo(19.2, g);
      p.bezierCurveTo(22.0, g, 21.6, 11.6, 16.4, 9.4);
      p.closePath();
    },
    oval(18.0, g - 3.6, 3.8, 3.6),
  ], P.glaze, {
    inner: (q) => {
      fillPath(q, P.shade, (p) => p.rect(0, g - 1.6, w, 2));
      fillPath(q, P.shade, oval(20.6, 15.6, 2.0, 6.0));
      fillPath(q, P.calico, oval(18.6, 13.6, 2.6, 2.0, 0.4));
      strokePath(q, P.lit, 0.7, (p) => { p.moveTo(9.4 + R.L * 0.6, 12); p.quadraticCurveTo(8.8, 15.6, 10, 18.6); });
    },
  });
  // The koban, held to the chest by the far paw.
  solid(c, [oval(12.6 + R.L * 0.5, 15.4, 2.0, 2.9)], P.gold, {
    lw: LWI,
    inner: (q) => {
      strokePath(q, P.goldDk, 0.25, (p) => { for (let i = 0; i < 4; i++) { p.moveTo(11.2 + R.L * 0.5, 13.6 + i * 1.1); p.lineTo(14.0 + R.L * 0.5, 13.6 + i * 1.1); } });
      fillPath(q, '#fff2b8', oval(12.0 + R.L * 0.5, 14.4, 0.6, 1.2, 0.2));
    },
  });
  solid(c, [oval(13.7 + R.L * 0.5, 16.2, 1.3, 1.1)], P.glaze, { lw: LWI });
  // The beckoning arm: up from the shoulder, the paw curled over at the wrist. Behind the
  // head while it beckons (the paw raised beside the face), in front of it once it swipes.
  const beckonArm = () => {
    nearLeg(c, R, 2.3, P.glaze);
    solid(c, [circle(R.paw[0], R.paw[1], 1.45)], P.glaze, {
      inner: (q) => {
        fillPath(q, P.shade, circle(R.paw[0] + 0.5, R.paw[1] + 0.5, 1.1));
        fillPath(q, P.glaze, circle(R.paw[0] + 0.1, R.paw[1] + 0.1, 1.1));
      },
    });
    if (R.angry < 0.25) for (const dx of [-0.5, 0.15, 0.8]) line(c, R.paw[0] + dx - 0.6, R.paw[1] - 0.1, R.paw[0] + dx - 0.9, R.paw[1] + 0.6, P.shade, 0.18);
  };
  if (R.s < 0.5) beckonArm();
  // The head: big and round, flattened a touch, ears up; in front of the collar.
  const H = headParts(R, { r: 4.3, earH: 0.85, earW: 1.0, flat: R.angry * 0.6, muzzle: 0 });
  solid(c, [...H.parts, oval(R.hx, R.hy + 0.6, 4.7, 3.9)], P.glaze, {
    inner: (q) => {
      fillPath(q, P.lit, circle(R.hx - 1.4, R.hy - 1.6, 2.6));
      fillPath(q, P.glaze, circle(R.hx - 0.6, R.hy - 0.8, 2.7));
      fillPath(q, P.black, oval(R.hx + 2.6, R.hy - 2.6, 1.9, 1.5, 0.5));
      fillPath(q, P.shade, (p) => p.rect(R.hx + 3.8, R.hy - 6, 3, 12));
    },
  });
  fillPath(c, P.ear, polyP([R.hx - 3.2, R.hy - 2.0, R.hx - 1.5, R.hy - 3.3, R.hx - 2.8 + R.angry * 1.0, R.hy - 5.4 + R.angry * 0.9]));
  // The collar and bell, under the chin.
  strokePath(c, INK, 1.6, (p) => { p.moveTo(7.6 + R.L, R.hy + 3.6); p.quadraticCurveTo(R.hx + 1, R.hy + 5.0, R.hx + 4.4, R.hy + 3.4); });
  strokePath(c, P.collar, 1.05, (p) => { p.moveTo(7.6 + R.L, R.hy + 3.6); p.quadraticCurveTo(R.hx + 1, R.hy + 5.0, R.hx + 4.4, R.hy + 3.4); });
  solid(c, [circle(R.hx - 0.4, R.hy + 5.2, 1.0)], P.gold, { lw: LWI, inner: (q) => fillPath(q, '#fff2b8', circle(R.hx - 0.75, R.hy + 4.9, 0.4)) });
  line(c, R.hx - 1.2, R.hy + 5.5, R.hx + 0.4, R.hy + 5.5, INK, 0.18);
  // The face: painted-on happy eyes; for the swipe, red slits.
  const ex = [R.hx - 2.5, R.hx + 0.3];
  if (R.angry > 0.3) {
    for (const x of ex) {
      fillPath(c, RED, polyP([x - 0.9, R.hy - 0.6, x + 0.9, R.hy - 1.0, x + 0.6, R.hy - 0.3, x - 0.7, R.hy - 0.2]));
      line(c, x - 1.1, R.hy - 1.4 + (x < R.hx - 1 ? -0.2 : 0.2), x + 0.9, R.hy - 1.1 - (x < R.hx - 1 ? -0.4 : 0.3), INK, 0.35);
    }
  } else {
    for (const x of ex) strokePath(c, INK, 0.38, (p) => { p.moveTo(x - 0.8, R.hy - 0.4); p.quadraticCurveTo(x, R.hy - 1.4, x + 0.8, R.hy - 0.4); });
  }
  fillPath(c, P.ear, oval(R.hx - 1.1, R.hy + 0.6, 0.45, 0.32));
  const gape = R.angry;
  if (gape > 0.2) {
    fillPath(c, '#4a1420', oval(R.hx - 1.1, R.hy + 1.7, 0.9, 0.4 + gape * 0.6));
    fillPath(c, WHITE, polyP([R.hx - 1.8, R.hy + 1.3, R.hx - 1.5, R.hy + 1.3, R.hx - 1.65, R.hy + 2.0]));
    fillPath(c, WHITE, polyP([R.hx - 0.7, R.hy + 1.3, R.hx - 0.4, R.hy + 1.3, R.hx - 0.55, R.hy + 2.0]));
  } else {
    strokePath(c, INK, 0.25, (p) => { p.moveTo(R.hx - 2.0, R.hy + 1.2); p.quadraticCurveTo(R.hx - 1.55, R.hy + 1.7, R.hx - 1.1, R.hy + 1.1); p.quadraticCurveTo(R.hx - 0.65, R.hy + 1.7, R.hx - 0.2, R.hy + 1.2); });
  }
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
    const x0 = s < 0 ? R.hx - 3.0 : R.hx + 0.8;
    line(c, x0, R.hy + 0.9 + i * 0.5, x0 + s * 1.8, R.hy + 0.6 + i * 0.9, INK, 0.16);
  }
  if (R.s >= 0.5) beckonArm();
  claws(c, R, 1.45, WHITE, 0.34, 1.2);
}

// C — KAWAII (chibi). The street-fashion mascot: a round white cat that is mostly head,
// pink cheeks, big shining eyes, a red bow behind one ear. On the wind its eyes go to
// > < and an anger mark pops on its brow; the swipe is a cartoon paw with stars of
// claws. The cutest the cabinet could go.
const CHIBI = { fur: '#fbf7fb', shade: '#ddd2e6', lit: WHITE, pink: '#ff8fb0', bow: '#ff2e4d', bowDk: '#a8122e', eye: '#2a1a3a' };
export function chibi(c, w, h, t, u) {
  const P = CHIBI;
  const R = rig(w, h, t, u, {
    headR: 5.2, headX: 12.0, headY: 9.2, shoulderX: 12.2, shoulderY: 15.2,
    rest: () => [10.4, h - 0.9], wind: [13.6, 9.4], reach: [2.0, 15.0],
  });
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, (cc, path, a) => {
    cc.save(); cc.globalAlpha *= a;
    strokePath(cc, INK, 0.95, path);
    strokePath(cc, WHITE, 0.55, path);
    cc.restore();
  });
  const bob = Math.abs(Math.sin(t * TAU * 0.9)) * 0.35 * (1 - R.angry);
  // A short round tail, wagging.
  limb(c, (p) => { p.moveTo(19.4, R.g - 2.2); p.quadraticCurveTo(22.6, R.g - 3.6, 21.8 + Math.sin(t * TAU) * 0.8, R.g - 7.2); }, 2.0, P.fur);
  // The body: a soft bean under the head.
  solid(c, [oval(15.6, R.g - 3.4, 5.4, 3.6)], P.fur, {
    inner: (q) => fillPath(q, P.shade, (p) => p.rect(0, R.g - 1.4, w, 2)),
  });
  solid(c, [oval(17.6, R.g - 0.7, 1.6, 0.9), oval(14.0, R.g - 0.7, 1.3, 0.8)], P.fur, { lw: LWI });
  R.hy -= bob;
  const H = headParts(R, { r: 5.2, earH: 0.7, earW: 1.0, flat: R.angry * 0.5, muzzle: 0 });
  solid(c, [...H.parts, oval(R.hx, R.hy + 0.5, 5.7, 4.6)], P.fur, {
    inner: (q) => {
      fillPath(q, P.shade, oval(R.hx + 2.2, R.hy + 2.6, 5, 3.4));
      fillPath(q, P.fur, oval(R.hx - 0.6, R.hy - 0.2, 5.4, 4.4));
    },
  });
  fillPath(c, P.pink, polyP([R.hx - 4.0, R.hy - 2.6, R.hx - 2.0, R.hy - 4.1, R.hx - 3.6 + R.angry * 1.2, R.hy - 5.8 + R.angry * 1.0]));
  // The bow, behind the far ear.
  const bx = R.hx + 3.2, by = R.hy - 4.4;
  solid(c, [polyP([bx, by, bx - 2.2, by - 1.6, bx - 2.1, by + 1.4]), polyP([bx, by, bx + 2.2, by - 1.4, bx + 2.0, by + 1.6])], P.bow, { lw: LWI });
  solid(c, [circle(bx, by, 0.7)], P.bowDk, { lw: LWI });
  // The face, set low and forward in the head, as chibi faces are.
  const ey = R.hy + 0.6;
  const ex = [R.hx - 3.0, R.hx + 0.4];
  if (R.angry > 0.3) {
    for (const [i, x] of ex.entries()) {
      const s = i === 0 ? 1 : -1;
      strokePath(c, P.eye, 0.55, (p) => { p.moveTo(x - 0.9 * s, ey - 0.9); p.lineTo(x + 0.6 * s, ey); p.lineTo(x - 0.9 * s, ey + 0.9); });
    }
    // The anger mark: four red hooks on the brow.
    const ax = R.hx + 1.6, ay = R.hy - 2.4, k = 0.75 + R.angry * 0.3;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      strokePath(c, RED, 0.45, (p) => { p.moveTo(ax + sx * 0.3 * k, ay + sy * 1.1 * k); p.quadraticCurveTo(ax + sx * 0.3 * k, ay + sy * 0.3 * k, ax + sx * 1.1 * k, ay + sy * 0.3 * k); });
    }
  } else if (R.blink) {
    for (const x of ex) strokePath(c, P.eye, 0.45, (p) => { p.moveTo(x - 0.8, ey); p.quadraticCurveTo(x, ey + 0.6, x + 0.8, ey); });
  } else {
    for (const x of ex) {
      fillPath(c, P.eye, oval(x, ey, 0.95, 1.25));
      fillPath(c, '#6b4aa8', oval(x, ey + 0.55, 0.75, 0.55));
      fillPath(c, WHITE, circle(x - 0.32, ey - 0.5, 0.42));
      fillPath(c, WHITE, circle(x + 0.35, ey + 0.35, 0.18));
    }
  }
  fillPath(c, 'rgba(255,120,160,0.55)', oval(R.hx - 4.3, ey + 1.6, 0.9, 0.5));
  fillPath(c, 'rgba(255,120,160,0.55)', oval(R.hx + 1.7, ey + 1.6, 0.9, 0.5));
  fillPath(c, P.pink, oval(R.hx - 1.3, ey + 1.0, 0.35, 0.25));
  if (R.angry > 0.2) {
    fillPath(c, '#4a1430', oval(R.hx - 1.3, ey + 2.0, 0.8, 0.35 + R.angry * 0.5));
    fillPath(c, WHITE, polyP([R.hx - 1.9, ey + 1.6, R.hx - 1.6, ey + 1.6, R.hx - 1.75, ey + 2.2]));
  } else {
    strokePath(c, P.eye, 0.28, (p) => { p.moveTo(R.hx - 2.1, ey + 1.5); p.quadraticCurveTo(R.hx - 1.7, ey + 2.0, R.hx - 1.3, ey + 1.4); p.quadraticCurveTo(R.hx - 0.9, ey + 2.0, R.hx - 0.5, ey + 1.5); });
  }
  // A stubby arm and a big round mitten of a paw.
  nearLeg(c, R, 2.0, P.fur);
  solid(c, [circle(R.paw[0], R.paw[1], 1.6)], P.fur, { inner: (q) => fillPath(q, P.shade, circle(R.paw[0] + 0.7, R.paw[1] + 0.7, 1.4)) });
  fillPath(c, P.pink, circle(R.paw[0] - 0.4, R.paw[1] + 0.2, 0.45));
  claws(c, R, 1.6, WHITE, 0.32, 0.9);
}

// D — NEON CAT. A black cat drawn the way the city draws itself: a dark body with a red
// tube round its contour and a white-hot core, like the train's hull. Eyes two red
// sparks. The swipe leaves three red tube slashes hanging in the air — the claw marks
// of a sign come to life. The most "of the cabinet" of the set.
const NEON = { body: '#120e26', lit: '#2a2450', eye: '#ff6a80' };
export function neonCat(c, w, h, t, u, o = {}) {
  const P = o.pal || NEON;
  const TW = o.tw ?? 0.75, GL = o.glow ?? 0.32;
  const R = rig(w, h, t, u);
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, redSlash);
  const flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7);
  const edge = (cc, path, wd = 0) => {
    tube(cc, RED, 0.6 + wd * 0, path, flick, 0.32);
  };
  const tp = tailPath(R, {});
  strokePath(c, P.body, 1.6, tp);
  tube(c, RED, 0.45, tp, flick, 0.28);
  strokePath(c, P.body, 1.2, tp);
  strokePath(c, P.body, 1.6, farLeg(R));
  solid(c, torsoParts(R, { arch: 2.0 }), P.body, {
    edge: (cc, all) => tube(cc, RED, TW, all, flick, GL),
    inner: (q) => strokePath(q, P.lit, 1.0, (p) => { p.moveTo(11.8 + R.L, 10.4); p.quadraticCurveTo(16.4, 9.2 - R.wind * 3.2, 20.4, 14); }),
  });
  const H = headParts(R, {});
  solid(c, H.parts, P.body, {
    edge: (cc, all) => tube(cc, RED, TW, all, flick, GL),
    inner: (q) => fillPath(q, P.lit, circle(R.hx - 1.0, R.hy - 1.4, R.headR * 0.7)),
  });
  // Re-fill the body over the inside half of the tube where head meets torso, so the
  // contour stays the outside of the union.
  // Eyes: red sparks, narrowing.
  const eo = R.blink ? 0.08 : 0.45 * (1 - R.angry * 0.5);
  fillPath(c, P.eye, oval(R.hx - 1.5, R.hy - 0.5, 0.75, eo, -0.15));
  fillPath(c, WHITE, oval(R.hx - 1.5, R.hy - 0.5, 0.3, Math.max(0.05, eo * 0.5), -0.15));
  if (R.angry > 0.15) {
    fillPath(c, '#3a0a14', polyP([R.hx - 3.7, R.hy + 1.2, R.hx - 1.6, R.hy + 1.5, R.hx - 3.3, R.hy + 1.4 + R.angry * 1.5]));
    fillPath(c, WHITE, polyP([R.hx - 3.3, R.hy + 1.25, R.hx - 3.0, R.hy + 1.3, R.hx - 3.2, R.hy + 1.25 + R.angry * 0.9]));
  }
  for (let i = 0; i < 2; i++) tube(c, RED, 0.18, (p) => { p.moveTo(R.hx - 2.8, R.hy + 1.0 + i * 0.45); p.lineTo(R.hx - 5.2, R.hy + 0.5 + i * 0.8); }, flick * 0.8, 0.2);
  nearLeg(c, R, 1.85, P.body, { edge: (cc, path, wd) => tube(cc, RED, wd + 0.7, path, flick, 0.0) });
  solid(c, [circle(R.paw[0], R.paw[1], 1.15)], P.body, { edge: (cc, all) => tube(cc, RED, 0.6, all, flick, 0.3) });
  claws(c, R, 1.15, whiteHot(RED, 0.75), 0.3);
}

// E — MECHA-NEKO. Akihabara's take: a robot cat in white-and-steel panels, ear
// antennae, a red visor where the eyes would be, a segmented cable tail with a red tip.
// For the swipe three blades slide out of the paw, longer than any claw.
const MECHA = { shell: '#e8eaf4', shellDk: '#a9aecb', steel: '#6b7299', steelLt: '#aab1d0', joint: '#262257', visor: '#1a1030' };
export function mecha(c, w, h, t, u, o = {}) {
  const P = o.pal || MECHA;
  const R = rig(w, h, t, u);
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, redSlash);
  // Cable tail: a chain of beads, its tip a red lamp.
  const tp = tailPath(R, {});
  limb(c, tp, 1.0, P.steel);
  for (let i = 1; i <= 6; i++) {
    const k = i / 7;
    const root = [20.8, R.g - 3];
    const [sw, lift] = tailSwing(R, 0, 1.5);
    const tip = [21.0 + sw, 9.8 - R.angry * 1.2 + lift];
    const m = 1 - k;
    const bx = m * m * m * root[0] + 3 * m * m * k * 23.4 + 3 * m * k * k * 23.6 + k * k * k * tip[0];
    const by = m * m * m * root[1] + 3 * m * m * k * (root[1] - 0.6) + 3 * m * k * k * (tip[1] + 3.6) + k * k * k * tip[1];
    solid(c, [circle(bx, by, 0.75)], i % 2 ? P.steelLt : P.shellDk, { lw: LWF });
    if (i === 6) {
      tube(c, RED, 0.6, circle(tip[0], tip[1], 0.3), 0.7 + 0.3 * Math.sin(t * TAU * 1.5), 0.4);
    }
  }
  limb(c, farLeg(R), 1.6, P.steel);
  solid(c, torsoParts(R, { arch: 0.8 }), P.shell, {
    edge: o.edge,
    inner: (q) => {
      fillPath(q, P.shellDk, (p) => p.rect(0, R.g - 2.4, w, 3));
      strokePath(q, WHITE, 1.0, (p) => { p.moveTo(11.8 + R.L, 10.6); p.quadraticCurveTo(16.4, 9.2 - R.wind * 1.2, 20.4, 14); });
      // Panel seams and a hatch.
      strokePath(q, P.shellDk, 0.25, (p) => { p.moveTo(14.6, 8); p.lineTo(14.2, 18.4); p.moveTo(10, 14.6 + R.L * 0.2); p.lineTo(14.2, 14.6); });
      fillPath(q, P.joint, circle(17.2, R.g - 4.6, 1.5));
      fillPath(q, P.steelLt, circle(17.2, R.g - 4.6, 0.8));
      // A red status strip along the flank.
      tube(q, RED, 0.45, (p) => { p.moveTo(15.6, 11.6); p.lineTo(19.2, 13.0); }, 0.6 + 0.4 * R.angry, 0.3);
    },
  });
  const H = headParts(R, { earH: 1.15, earW: 0.85, flat: R.angry * 0.35, muzzle: 0.9 });
  solid(c, H.parts, P.shell, {
    edge: o.edge,
    inner: (q) => {
      fillPath(q, P.shellDk, oval(R.hx + 1.4, R.hy + 1.6, 3.2, 2.2));
      fillPath(q, P.shell, oval(R.hx - 0.4, R.hy + 0.2, 3.2, 2.6));
      strokePath(q, P.shellDk, 0.22, (p) => { p.moveTo(R.hx - 0.2, R.hy - 3.4); p.lineTo(R.hx + 0.4, R.hy + 3.0); });
    },
  });
  // Antennae in the ears.
  for (const [x, y] of [[R.hx - 2.0 + R.angry * 0.8, R.hy - 4.5 + R.angry * 0.9], [R.hx + 1.6, R.hy - 4.8]]) {
    line(c, x, y, x + 0.3, y - 1.4, INK, 0.45);
    circ(c, x + 0.3, y - 1.6, 0.35, R.angry > 0.3 ? RED : P.steelLt);
  }
  // The visor: a dark band with a red scan, the read of an eye without an eye.
  c.save();
  c.translate(R.hx - 1.8, R.hy - 0.5);
  c.rotate(-0.1);
  fillPath(c, INK, (p) => p.roundRect(-1.9, -0.75, 3.6, 1.5, 0.7));
  fillPath(c, P.visor, (p) => p.roundRect(-1.7, -0.55, 3.2, 1.1, 0.55));
  const scan = R.angry > 0.3 ? -0.9 : Math.sin(t * TAU * 1.0) * 1.0;
  tube(c, RED, R.angry > 0.3 ? 0.6 : 0.42, (p) => { p.moveTo(scan - 0.5, 0); p.lineTo(scan + 0.5, 0); }, 1, 0.4);
  c.restore();
  // Speaker-grille mouth.
  for (let i = 0; i < 3; i++) line(c, R.hx - 3.6 + i * 0.5, R.hy + 1.3, R.hx - 3.7 + i * 0.5, R.hy + 1.9 + R.angry * 0.4, INK, 0.2);
  // The arm: a hydraulic leg, steel, with a joint at the shoulder.
  nearLeg(c, R, 1.4, P.steel);
  solid(c, [circle(R.shoulder[0], R.shoulder[1], 1.2)], P.joint, { lw: LWI });
  solid(c, [circle(R.paw[0], R.paw[1], 1.2)], P.shell, { edge: o.edge, inner: (q) => fillPath(q, P.shellDk, circle(R.paw[0] + 0.5, R.paw[1] + 0.5, 1.0)) });
  // Blades: three straight steel lines out of the paw, extending with the swipe.
  const out = Math.max(R.wind * 0.6, R.s);
  if (out > 0.1) {
    for (let i = -1; i <= 1; i++) {
      const a = Math.PI + i * 0.32 + (R.s - 0.5) * 0.25;
      const L = 1.2 + 3.0 * out;
      const x1 = R.paw[0] + Math.cos(a) * L, y1 = R.paw[1] + Math.sin(a) * L;
      line(c, R.paw[0], R.paw[1], x1, y1, INK, 0.75);
      line(c, R.paw[0], R.paw[1], x1, y1, '#e2e6f6', 0.4);
    }
  }
}
function circ(c, x, y, r, fill) { fillPath(c, fill, circle(x, y, r)); strokePath(c, INK, LWF, circle(x, y, r)); }

// F — NEKOMATA (猫又). The yōkai: an old black cat whose tail has split in two, each tip
// burning with a pale ghost-fire, gold eyes. Folklore Tokyo — the shrine at the end of
// the alley rather than the arcade. The swipe is the stray's, the menace the legend's.
const MATA = { fur: '#231a33', lit: '#3d3156', dark: '#140f20', eye: '#ffd23a', fire: '#a99bff', fireCore: '#e8e2ff' };
export function nekomata(c, w, h, t, u, o = {}) {
  const P = o.pal || MATA;
  const R = rig(w, h, t, u);
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, (cc, path, a) => tube(cc, P.fire, 0.5, path, a, 0.35));
  for (let k = 0; k < 2; k++) {
    const tp = tailPath(R, { k, sway: 1.6 });
    if (o.rim) tube(c, o.rim, 1.4 + R.angry * 0.6 + 1.5, tp, 1, 0.07);
    limb(c, tp, 1.4 + R.angry * 0.6, P.fur);
  }
  // Ghost-fire on each tip: a teardrop flame licking upward, flickering.
  for (let k = 0; k < 2; k++) {
    const [sw, lift] = tailSwing(R, k, 1.6);
    const tx = 21.0 + sw - k * 2.0, ty = 9.8 - k * 0.8 - R.angry * 1.2 + lift;
    const fl = Math.sin(t * 11 + k * 2) * 0.4;
    const flame = (p) => {
      p.moveTo(tx - 1.0, ty - 0.2);
      p.quadraticCurveTo(tx - 1.1, ty - 2.0, tx + fl, ty - 3.4 - Math.abs(fl));
      p.quadraticCurveTo(tx + 1.1, ty - 1.8, tx + 1.0, ty - 0.2);
      p.quadraticCurveTo(tx, ty + 1.0, tx - 1.0, ty - 0.2);
    };
    c.save(); c.globalAlpha *= 0.35; fillPath(c, P.fire, (p) => p.arc(tx, ty - 1.2, 2.2, 0, TAU)); c.restore();
    fillPath(c, P.fire, flame);
    c.save(); c.translate(tx, ty); c.scale(0.55, 0.6); c.translate(-tx, -ty + 0.4); fillPath(c, P.fireCore, flame); c.restore();
  }
  limb(c, farLeg(R), 1.7, P.dark);
  solid(c, torsoParts(R, { arch: 2.2 }), P.fur, {
    edge: o.rim && haloEdge(o.rim),
    inner: (q) => {
      fillPath(q, P.dark, (p) => p.rect(0, R.g - 2.2, w, 3));
      strokePath(q, P.lit, 1.1, (p) => { p.moveTo(11.8 + R.L, 10.6); p.quadraticCurveTo(16.4, 9.2 - R.wind * 3.4, 20.4, 14); });
      // Ruff of fur at the chest, ragged.
      strokePath(q, P.lit, 0.3, (p) => { for (let i = 0; i < 3; i++) { p.moveTo(9.8 + R.L + i * 0.3, 12.4 + i * 1.2); p.lineTo(10.8 + R.L + i * 0.3, 12.9 + i * 1.2); } });
    },
  });
  const H = headParts(R, { earH: 1.15 });
  solid(c, H.parts, P.fur, { edge: o.rim && haloEdge(o.rim), inner: (q) => fillPath(q, P.lit, circle(R.hx - 1.0, R.hy - 1.4, R.headR * 0.72)) });
  fillPath(c, '#5a2a4a', polyP([R.hx - 2.3, R.hy - 1.9, R.hx - 1.0, R.hy - 2.8, R.hx - 2.1 + R.angry * 2.0, R.hy - 4.8 + R.angry * 2.0]));
  // Eyes: gold and wide, the glow round them — wider than the stray's, it is not afraid.
  const eo = R.blink ? 0.08 : 0.62 * (1 - R.angry * 0.3);
  c.save(); c.globalAlpha *= 0.35; fillPath(c, P.eye, circle(R.hx - 1.5, R.hy - 0.5, 1.4)); c.restore();
  fillPath(c, P.eye, oval(R.hx - 1.5, R.hy - 0.5, 0.85, eo, -0.15));
  fillPath(c, INK, oval(R.hx - 1.6, R.hy - 0.5, 0.15, Math.max(0.05, eo * 0.95)));
  const gape = R.angry;
  if (gape > 0.1) {
    fillPath(c, '#4a0c1c', polyP([R.hx - 3.7, R.hy + 1.2, R.hx - 1.4, R.hy + 1.5, R.hx - 3.3, R.hy + 1.4 + gape * 1.8]));
    fillPath(c, WHITE, polyP([R.hx - 3.3, R.hy + 1.25, R.hx - 3.0, R.hy + 1.3, R.hx - 3.2, R.hy + 1.25 + gape * 1.1]));
    fillPath(c, WHITE, polyP([R.hx - 2.0, R.hy + 1.4, R.hx - 1.7, R.hy + 1.45, R.hx - 1.9, R.hy + 1.4 + gape * 0.9]));
  }
  for (let i = 0; i < 3; i++) line(c, R.hx - 2.6, R.hy + 0.9 + i * 0.35, R.hx - 5.4, R.hy + 0.3 + i * 0.6, 'rgba(232,226,255,0.7)', 0.12);
  if (o.rim) {
    const [sx, sy] = R.shoulder, [px, py] = R.paw, bend = 1 - R.s;
    tube(c, o.rim, 1.85 + 1.5, (p) => { p.moveTo(sx, sy); p.quadraticCurveTo((sx + px) / 2 + 1.1 * bend, (sy + py) / 2 + 0.4 * bend, px, py); }, 1, 0.07);
  }
  nearLeg(c, R, 1.85, P.fur);
  solid(c, [circle(R.paw[0], R.paw[1], 1.15)], P.fur, { edge: o.rim && haloEdge(o.rim) });
  claws(c, R, 1.15, P.fireCore, 0.32, 1.2);
}

// G — CHONK. The cat-café regular: an orange tabby loaf of a cat on its cushion,
// half-lidded and unimpressed, who has decided you are not getting past. The swipe is
// the same speed as everyone's (it is the same obstacle) but the face never wakes up.
// The comic one.
const CHONK = { fur: '#f09a3e', lit: '#ffc27a', dark: '#c4672a', stripe: '#b0521c', belly: '#ffe2bc', pink: '#f08a96', cushion: '#d8263a', cushionDk: '#8e1426', tassel: '#f2c23a' };
export function chonk(c, w, h, t, u) {
  const P = CHONK;
  const R = rig(w, h, t, u, { headR: 3.4, headX: 9.6, headY: 9.4, shoulderX: 11.6, shoulderY: 13.8, rest: () => [10.0, h - 2.6], reach: [1.8, 13.4] });
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, whiteSlash);
  const g = R.g;
  // The cushion: a flat zabuton with tassels at its corners.
  solid(c, [(p) => p.roundRect(7.4, g - 2.2, 16.2, 2.2, 0.9)], P.cushion, {
    inner: (q) => { fillPath(q, P.cushionDk, (p) => p.rect(0, g - 0.8, w, 1)); },
  });
  for (const x of [7.6, 23.2]) { line(c, x, g - 1.6, x - (x < 10 ? 0.6 : -0.3), g - 0.2, INK, 0.6); line(c, x, g - 1.6, x - (x < 10 ? 0.6 : -0.3), g - 0.2, P.tassel, 0.35); }
  // A tail wrapped round the front of the loaf.
  limb(c, (p) => { p.moveTo(21.4, g - 3.4); p.quadraticCurveTo(22.6, g - 2.4, 20.4, g - 2.3); p.lineTo(14.8, g - 2.4); }, 1.7, P.fur);
  // The loaf.
  solid(c, [oval(16.2, g - 6.4, 6.6, 5.0), oval(12.6, g - 6.6, 3.6, 4.0)], P.fur, {
    inner: (q) => {
      fillPath(q, P.dark, (p) => p.rect(0, g - 3.6, w, 2));
      fillPath(q, P.lit, oval(15.4, g - 10.4, 5.0, 1.6));
      for (let i = 0; i < 4; i++) strokePath(q, P.stripe, 0.6, (p) => { p.moveTo(14.4 + i * 1.8, g - 11.6); p.quadraticCurveTo(15.2 + i * 1.8, g - 8.4, 14.6 + i * 1.8, g - 5.6); });
      fillPath(q, P.belly, oval(11.6 + R.L * 0.4, g - 5.6, 1.8, 2.8));
    },
  });
  limb(c, (p) => { p.moveTo(20.4, g - 2.6); p.lineTo(15.2, g - 2.6); }, 1.2, P.stripe, null);
  const H = headParts(R, { r: 3.4, earH: 0.7, earW: 1.1, muzzle: 1.05, flat: R.angry * 0.6 });
  solid(c, [...H.parts, oval(R.hx + 0.2, R.hy + 0.8, 3.8, 2.9)], P.fur, {
    inner: (q) => {
      fillPath(q, P.lit, oval(R.hx - 0.6, R.hy - 1.6, 2.6, 1.6));
      strokePath(q, P.stripe, 0.4, (p) => { p.moveTo(R.hx - 1.3, R.hy - 1.8); p.lineTo(R.hx - 0.9, R.hy - 3.0); p.moveTo(R.hx - 0.2, R.hy - 2.0); p.lineTo(R.hx + 0.1, R.hy - 3.2); });
      fillPath(q, P.belly, oval(R.hx - 2.4, R.hy + 1.6, 1.6, 0.9));
    },
  });
  fillPath(c, P.pink, polyP([R.hx - 2.4, R.hy - 1.8, R.hx - 1.1, R.hy - 2.6, R.hx - 2.3 + R.angry * 1.6, R.hy - 3.9 + R.angry * 1.4]));
  // Half-lidded and flat, whatever happens: the lid comes down, it does not go wide.
  const lid = R.angry > 0.3 ? 0.2 : 0.32;
  fillPath(c, '#c8d64a', oval(R.hx - 1.5, R.hy - 0.3, 0.8, lid));
  fillPath(c, INK, oval(R.hx - 1.6, R.hy - 0.3, 0.16, lid * 0.9));
  line(c, R.hx - 2.4, R.hy - 0.35 - (R.angry > 0.3 ? 0.15 : 0), R.hx - 0.6, R.hy - 0.45, INK, 0.38);
  fillPath(c, P.pink, polyP([R.hx - 3.9, R.hy + 0.6, R.hx - 3.2, R.hy + 0.6, R.hx - 3.6, R.hy + 1.1]));
  strokePath(c, INK, 0.22, (p) => { p.moveTo(R.hx - 3.6, R.hy + 1.6); p.lineTo(R.hx - 2.4, R.hy + 1.5); });
  for (let i = 0; i < 3; i++) line(c, R.hx - 2.8, R.hy + 1.2 + i * 0.35, R.hx - 5.4, R.hy + 0.8 + i * 0.5, 'rgba(255,255,255,0.8)', 0.12);
  nearLeg(c, R, 2.1, P.fur);
  solid(c, [circle(R.paw[0], R.paw[1], 1.35)], P.fur, { inner: (q) => fillPath(q, P.lit, circle(R.paw[0] - 0.3, R.paw[1] - 0.4, 0.9)) });
  claws(c, R, 1.35, WHITE, 0.3, 0.8);
}

// H — PYTHAGORAS, the chocolate Burmese (Peter, 16 Oct 2026: "can you add one that is a
// chocolate burmese? call him pythagoras", with a reference picture). The breed, not a
// stray: a compact, solid cat in a short glossy coat of one rich chocolate, darker over
// the face, ears and tail; a round head with a short muzzle; ears wide-set and rounded at
// the tip; big gold-amber eyes under a low, unimpressed brow. No stripes — the coat's
// only pattern is its sheen, a lit band down the back and over the skull.
const PYTH = { coat: '#5a321d', lit: '#8a5532', sheen: '#b07a4e', dark: '#341a0e', mask: '#2a150c',
  ear: '#3a1c10', eye: '#f2a52a', eyeDk: '#b86a12', nose: '#2a140c' };
export function pythagoras(c, w, h, t, u, o = {}) {
  const P = PYTH;
  const R = rig(w, h, t, u, { headR: 3.4, headX: 8.6, headY: 8.4 });
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, whiteSlash);
  // The tail: up and over in a question mark, as in the picture, darkening to the tip.
  const [sw, lift] = tailSwing(R, 0, 1.3);
  const tp = tailPath(R, { tip: [20.2 + sw, 7.6 - R.angry * 0.8 + lift] });
  if (o.rim) tube(c, o.rim, 1.6 + R.angry * 0.5 + 1.5, tp, 1, 0.07);
  limb(c, tp, 1.6 + R.angry * 0.5, P.dark);
  limb(c, farLeg(R), 1.8, P.dark);
  // Compact and muscular: a fuller chest and a rounder haunch than the stray.
  solid(c, torsoParts(R, { arch: 1.2, haunch: [17.0, 4.8, 5.4, 4.6], chest: 0.6 }), P.coat, {
    edge: o.rim && haloEdge(o.rim),
    inner: (q) => {
      fillPath(q, P.dark, (p) => p.rect(0, R.g - 2.4, w, 3.2));
      strokePath(q, P.lit, 1.6, (p) => { p.moveTo(11.8 + R.L, 10.8); p.quadraticCurveTo(16.4, 9.4 - R.wind * 2, 20.4, 14.2); });
      strokePath(q, P.sheen, 0.45, (p) => { p.moveTo(13.0 + R.L, 9.9); p.quadraticCurveTo(16.4, 8.9 - R.wind * 2, 19.4, 11.6); });
      fillPath(q, P.lit, oval(17.6, R.g - 6.2, 2.6, 1.6, -0.3));
      // The chest a shade warmer, catching the light.
      fillPath(q, P.lit, oval(10.4 + R.L, 13.8, 1.3, 2.6, 0.2));
    },
  });
  const H = headParts(R, { r: 3.4, earH: 0.9, earW: 1.15, muzzle: 0.9, flat: R.angry * 0.8 });
  solid(c, H.parts, P.coat, {
    edge: o.rim && haloEdge(o.rim),
    inner: (q) => {
      // The mask: the face darker than the coat, the skull lit on top.
      fillPath(q, P.mask, oval(R.hx - 1.8, R.hy + 0.8, 2.6, 2.2));
      fillPath(q, P.lit, oval(R.hx + 0.2, R.hy - 2.4, 2.4, 1.3));
      fillPath(q, P.sheen, oval(R.hx + 0.4, R.hy - 2.7, 1.2, 0.45));
      fillPath(q, P.ear, (p) => p.rect(R.hx - 6, R.hy - 8, 12, 4.4));
    },
  });
  fillPath(c, '#6a3424', polyP([R.hx - 2.5, R.hy - 1.8, R.hx - 1.2, R.hy - 2.8, R.hx - 2.1 + R.angry * 2.0, R.hy - 4.3 + R.angry * 1.9]));
  // Big gold-amber eyes, round pupils, a low flat brow over them — the look in the
  // picture. The brow drops further for the swipe; the eye never goes to a slit.
  const eo = R.blink ? 0.08 : 0.95 * (1 - R.angry * 0.3);
  const ex = R.hx - 1.5, ey = R.hy - 0.3;
  fillPath(c, INK, oval(ex, ey, 1.25, eo + 0.15, -0.1));
  fillPath(c, P.eyeDk, oval(ex, ey, 1.1, eo, -0.1));
  fillPath(c, P.eye, oval(ex - 0.05, ey - eo * 0.12, 0.95, eo * 0.82, -0.1));
  if (!R.blink) {
    fillPath(c, INK, oval(ex - 0.25, ey, 0.4, Math.min(0.55, eo * 0.6)));
    fillPath(c, WHITE, circle(ex - 0.55, ey - 0.3, 0.17));
  }
  // The lid: a flat line across the top of the eye, lower toward the nose — the scowl.
  const lid = (k) => ey - eo - 0.2 + (0.35 + R.angry * 0.35) * k;
  fillPath(c, P.mask, polyP([ex - 1.4, ey - eo - 0.6, ex + 1.3, ey - eo - 0.6, ex + 1.3, lid(0.45), ex - 1.4, lid(1.4)]));
  strokePath(c, INK, 0.32, (p) => { p.moveTo(ex - 1.3, lid(1.4)); p.lineTo(ex + 1.2, lid(0.45)); });
  fillPath(c, P.nose, polyP([R.hx - 4.0, R.hy + 0.5, R.hx - 3.2, R.hy + 0.5, R.hx - 3.6, R.hy + 1.0]));
  const gape = R.angry;
  if (gape > 0.1) {
    fillPath(c, '#3a1418', polyP([R.hx - 3.7, R.hy + 1.3, R.hx - 1.6, R.hy + 1.6, R.hx - 3.3, R.hy + 1.5 + gape * 1.5]));
    fillPath(c, WHITE, polyP([R.hx - 3.3, R.hy + 1.35, R.hx - 3.0, R.hy + 1.4, R.hx - 3.2, R.hy + 1.35 + gape * 0.9]));
  } else {
    strokePath(c, INK, 0.2, (p) => { p.moveTo(R.hx - 3.6, R.hy + 1.1); p.quadraticCurveTo(R.hx - 3.0, R.hy + 1.5, R.hx - 2.4, R.hy + 1.3); });
  }
  // Pale whiskers, as long as the picture's.
  for (let i = 0; i < 3; i++) line(c, R.hx - 2.6, R.hy + 1.0 + i * 0.35, R.hx - 5.8, R.hy + 0.3 + i * 0.7, 'rgba(255,236,210,0.8)', 0.12);
  if (o.rim) {
    const [sx, sy] = R.shoulder, [px, py] = R.paw, bend = 1 - R.s;
    tube(c, o.rim, 1.95 + 1.5, (p) => { p.moveTo(sx, sy); p.quadraticCurveTo((sx + px) / 2 + 1.1 * bend, (sy + py) / 2 + 0.4 * bend, px, py); }, 1, 0.07);
  }
  nearLeg(c, R, 1.95, P.coat);
  solid(c, [circle(R.paw[0], R.paw[1], 1.2)], P.coat, { edge: o.rim && haloEdge(o.rim), inner: (q) => fillPath(q, P.lit, circle(R.paw[0] - 0.3, R.paw[1] - 0.4, 0.8)) });
  claws(c, R, 1.2);
}

// ======================================================= round 2: D, E, F
// Peter, 16 Oct 2026, on the eight: "I love F but I feel he won't read well in the dark
// neon world", "D is probably super appropriate for the world being neon while E is
// probably the most correct... a robot cat in a futuristic world — I am genuinely torn";
// then "ok give me the variants then of d e & f". Each is the original's own painter
// with one thing changed, so the letters compare like for like.

// I — NEON MECHA (D x E). The robot in the city's hand: the mecha's panels and visor
// on a dark hull, its contour a red tube with a white-hot core, the blades red.
const MECHA_DARK = { shell: '#1d1a33', shellDk: '#100e20', steel: '#36315a', steelLt: '#6d76b0', joint: '#0b0920', visor: '#05030f' };
export const neonMecha = (c, w, h, t, u) => mecha(c, w, h, t, u, {
  pal: MECHA_DARK,
  edge: (cc, all) => tube(cc, RED, 0.7, all, 0.9 + 0.1 * Math.sin(t * TAU * 9.5), 0.32),
});

// J — MECHA, NEON-TRIMMED. E as it was, white shell and all, with a red rim of light
// round its contour, as if it had walked out of the signs.
export const mechaTrim = (c, w, h, t, u) => mecha(c, w, h, t, u, { edge: haloEdge(RED, 0.85) });

// K — MECHA, GUNMETAL. E in dark gunmetal with the same red LEDs: a heavier, meaner
// machine that still reads off the peach sky by its ink and its lights.
const MECHA_GUN = { shell: '#59607e', shellDk: '#383d58', steel: '#2b2f45', steelLt: '#8a90b0', joint: '#181a2a', visor: '#0b0618' };
export const mechaGun = (c, w, h, t, u) => mecha(c, w, h, t, u, { pal: MECHA_GUN });

// L — NEON CAT, BRIGHTER. D with a heavier tube and a stronger throw of light, and the
// body lifted a step toward violet, so the silhouette holds at golden hour too.
export const neonBright = (c, w, h, t, u) => neonCat(c, w, h, t, u, {
  tw: 0.95, glow: 0.45, pal: { body: '#1e1640', lit: '#3d3470', eye: '#ff6a80' },
});

// M — NEKOMATA IN NEON (D x F). F, unchanged, given D's red rim: the two-tailed yōkai
// stepping out of the dark with the city's danger light round it.
export const nekoNeon = (c, w, h, t, u) => nekomata(c, w, h, t, u, { rim: RED });

// N — NEKOMATA, GHOST-LIT. F lit by its own ghost-fire instead: a violet-white rim, a
// lighter coat, so it reads on the dark without borrowing the red.
const MATA_LIT = { ...MATA, fur: '#33264a', lit: '#5a4880', dark: '#1d152c' };
export const nekoGhost = (c, w, h, t, u) => nekomata(c, w, h, t, u, { pal: MATA_LIT, rim: MATA.fire });

// O — PYTHAGORAS IN NEON (Peter, 16 Oct 2026: "add a neon pythagorus"). H unchanged —
// the chocolate coat, the amber scowl — with the red rim M gives the nekomata, so the
// dark Burmese stands off the night the way the signs light him.
export const pythNeon = (c, w, h, t, u) => pythagoras(c, w, h, t, u, { rim: RED });

// ============================================================ the game's contract
export const CAT_FPS = 12;
export const CAT_IDLE_FRAMES = CAT_FPS * IDLE_LOOP;   // one idle ring, IDLE_LOOP seconds
export const CAT_STRIKE_FRAMES = 12;
export const CAT_FRAMES = CAT_IDLE_FRAMES + CAT_STRIKE_FRAMES;
// The painted envelope, plus a hair of margin so a tail tip or an ear's halo is never
// cut by the raster's edge.
const CAT_W = 24, CAT_H = 21, CAT_PAD_X = 0.6, CAT_PAD_Y = 0.6;
function catPainter(paint) {
  return (ctx, w, h, frame = 0) => {
    const f = ((frame % CAT_FRAMES) + CAT_FRAMES) % CAT_FRAMES;
    const idle = f < CAT_IDLE_FRAMES;
    const t = idle ? f / CAT_FPS : 0;
    const u = idle ? -1 : ((f - CAT_IDLE_FRAMES + 0.5) / CAT_STRIKE_FRAMES) * SWIPE_T;
    const k = Math.min(w / (CAT_W + 2 * CAT_PAD_X), h / (CAT_H + CAT_PAD_Y));
    ctx.save();
    ctx.translate((w - CAT_W * k) / 2, h - CAT_H * k);
    ctx.scale(k, k);
    paint(ctx, CAT_W, CAT_H, t, u);
    ctx.restore();
  };
}
export const CAT_PAINTERS = {
  catPythagoras: catPainter(pythagoras),
  catMechaNeon: catPainter(mechaTrim),
  catNekoGhost: catPainter(nekoGhost),
  catNeonBright: catPainter(neonBright),
};
export const CAT_TYPES = Object.keys(CAT_PAINTERS);
