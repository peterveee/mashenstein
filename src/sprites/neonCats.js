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
  // `headLift` raises the head on the strike instead of ducking it, for a cat whose
  // snarl has to be seen over its own swiping arm.
  const hy = (o.headY ?? 8.2) + wind * 0.7 + s * (0.9 - (o.headLift ?? 0)) + breathe;
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

// WHISKERS sweep BACK from the whisker pad across the cheek (Peter, 16 Oct 2026: "why are
// the whiskers … pointing to the left shouldn't they point back away from the nose?").
// They used to stick out forward past the nose. Rooted on the muzzle, fanned a little,
// bowed slightly down; `tube` draws them as light (the neon cat).
function whiskers(c, R, col, lw = 0.12, { y = 0.9, len = 3.8, n = 3, tube: asTube = null } = {}) {
  for (let i = 0; i < n; i++) {
    const x0 = R.hx - 2.7, y0 = R.hy + y + i * 0.32;
    const x1 = x0 + len, y1 = y0 - 0.55 + i * 0.55;
    const path = (p) => { p.moveTo(x0, y0); p.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 0.25, x1, y1); };
    if (asTube) asTube(path); else strokePath(c, col, lw, path);
  }
}

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
  const fb0 = [hx - 2.9 * k * earW, hy - 1.3 * k], fb1 = [hx - 0.5 * k, hy - 3.0 * k];
  const ftip = [hx - 2.5 * k * earW, hy - (3.0 + 2.3 * earH) * k];
  const front = ear(fb0, fb1, ftip, R.twitch);
  // The front ear as drawn (its tip after the tilt and twitch), for an inner ear that
  // follows it.
  const frontTri = [fb0, fb1, [ftip[0] + tilt + R.twitch * 1.3, ftip[1] + tilt * 0.9 + R.twitch * 0.6]];
  const back = ear([hx + 0.2 * k, hy - 3.2 * k], [hx + 2.6 * k * earW, hy - 1.9 * k], [hx + 1.7 * k * earW, hy - (3.2 + 2.3 * earH) * k], 0);
  const parts = [back, front, circle(hx, hy, r)];
  if (muzzle) parts.push(oval(hx - 2.3 * k, hy + 0.95 * k, 1.55 * k * muzzle, 1.2 * k * muzzle));
  return { parts, k, front, back, frontTri };
}

// The torso: nape over an arched back to the rump, down to the ground and up the chest;
// the haunch an oval on the back half. `arch` lifts the back (the Halloween cat).
// THE SHADE THAT FOLLOWS THE BODY: the parts in shade, then the same parts nudged up and
// forward in the body colour over them, so what is left is a curved band along the back
// and the base that hugs the outline (Peter, 16 Oct 2026, of the cats: "they're all a
// bit squared off" — the old shade was a straight-edged block across the bottom).
function shadeBand(q, parts, shade, fill, dx = -0.85, dy = -0.75) {
  fillPath(q, shade, (p) => p.rect(-5, -5, 40, 40));
  q.save();
  q.translate(dx, dy);
  for (const part of parts) fillPath(q, fill, part);
  q.restore();
}

// THE HIND LEG, read through the body (Peter, 16 Oct 2026, with a reference of a seated
// cat in profile: "see how you can make out the rear leg and foot/paw"). The thigh is a
// crease round the front and bottom of the haunch, and the hind foot lies flat along the
// floor, forward from under the haunch toward the front paw, drawn over the body with
// the body's own outline (or `edge`, for the neon cat).
function hindLeg(c, R, { haunch = HAUNCH, fill, crease, ink = INK, edge = null, footFill = null, lit = null } = {}) {
  // Read as a LEG (Peter: "doesn't read as a rear leg to me at all"), still in our hand —
  // one ink, interior lines at the interior weight. The thigh is an inked line round the
  // front of the haunch down to the floor, the haunch inside it a shade lighter; the
  // hind foot is its own flat shape along the floor beneath the haunch, inked like
  // everything else, its toe just ahead of the thigh, as in a seated cat.
  const [hcx, hup, hrx0, hry0] = haunch;
  const hrx = hrx0 * haunchScale, hry = hry0 * haunchScale;
  const g = R.g;
  const tx = hcx + 0.2, ty = g - hup + 0.3 + (hry0 - hry), trx = hrx * 0.86, try_ = hry * 0.95;
  // The thigh, a tone lighter in the cat's own lit colour, where it has one to spare.
  if (lit) {
    c.save();
    c.globalAlpha *= 0.45;
    fillPath(c, lit, (p) => p.ellipse(tx, ty, trx, try_, 0, 0, TAU));
    c.restore();
  }
  // Soft, not inked (Peter: "a bit thicker and not outlined so much … I want the shape"):
  // the thigh and foot are edged in the cat's own crease colour, and never in neon.
  const soft = crease;
  // A little more line ("a little more outline is ok"), still in the crease colour.
  strokePath(c, soft, 0.45, (p) => p.ellipse(tx, ty, trx, try_, 0, 0.55 * Math.PI, 1.0 * Math.PI));
  // The foot.
  const fh = 2.6;   // the front paw's height ("thicker to better match front paws")
  // UNDER the haunch (Peter: "shouldn't the rear leg be UNDER the haunch?"): heel back
  // beneath the thigh, toe just ahead of the thigh's front line.
  const x0 = tx - trx - 0.9 + R.L * 0.2, x1 = tx + trx * 0.55;
  // Shaped like a paw, not a plank: a low heel under the thigh rising to a round toe.
  const foot = (p) => {
    p.moveTo(x1, g);
    p.lineTo(x0 + 0.8, g);
    p.quadraticCurveTo(x0, g, x0, g - fh * 0.55);
    p.quadraticCurveTo(x0 + 0.1, g - fh, x0 + 1.1, g - fh);
    p.quadraticCurveTo((x0 + x1) / 2, g - fh * 0.78, x1, g - fh * 0.55);
    p.closePath();
  };
  // The shape carried by TONE, not line: the foot a step into the crease colour.
  solid(c, [foot], footFill || fill, { ink: null });
  if (!footFill) { c.save(); c.globalAlpha *= 0.45; fillPath(c, soft, foot); c.restore(); }
  strokePath(c, soft, 0.34, foot);
  for (const dx of [0.75, 1.45]) line(c, x0 + dx, g - fh + 0.4, x0 + dx, g - 0.25, crease, 0.18);
}

// Every cat SITS on a rounded base now (round 1.6 by default): see shadeBand.
// The haunch sits back toward the tail (Peter, 16 Oct: "make the haunch a bit closer to
// the tail and move the rear leg too so they aren't so close to the front - more squat").
const HAUNCH = [18.1, 4.5, 5.0, 4.6];
// HAUNCH SIZE, for the side-by-side (Peter, 16 Oct: "should haunch be a little smaller?"):
// 1 as shipped. The thigh shape inside shrinks by the full factor, the body's outline
// round the rump by half of it, so the rump keeps its curve.
let haunchScale = 1;
export function setHaunchScale(k) { haunchScale = k; }
function torsoParts(R, { arch = 1.6, haunch = HAUNCH, chest = 0, round = 1.6 } = {}) {
  const { g, L } = R;
  const a = arch * R.wind + arch * 0.4 * R.s;
  const [hcx, hup, hrx0, hry0] = haunch;
  const ko = 1 - (1 - haunchScale) * 0.5;
  const hrx = hrx0 * ko, hry = hry0 * ko;
  // `round` softens the bottom corners into the floor — a figurine's rounded base rather
  // than a block (the maneki-neko: "can we finesse the base a bit more?").
  const fx = 10.6 + L * 0.5 - chest * 0.3;
  return [
    (p) => {
      p.moveTo(11.6 + L, 9.8 + R.wind * 0.6);
      p.quadraticCurveTo(16.6, 8.4 - a * 1.6, 20.8, 13.4);
      if (round) {
        p.lineTo(21.4 - round * 0.15, g - round);
        p.quadraticCurveTo(21.5, g, 21.4 - round, g);
        p.lineTo(fx + round * 0.6, g);
        p.quadraticCurveTo(fx - round * 0.2, g, fx - round * 0.25, g - round * 0.8);
      } else {
        p.lineTo(21.6, g);
        p.lineTo(fx, g);
      }
      p.quadraticCurveTo(8.6 + L - chest, 15.6, 9.8 + L, 11.4);
      p.closePath();
    },
    oval(hcx, g - hup + (hry0 - hry), hrx, hry),   // shrunk, it stays on the floor
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
      // Shade band following the body, lit sliver down the back, the rim light over it.
      shadeBand(q, torsoParts(R, { arch: 2.0 }), P.dark, P.fur);
      strokePath(q, P.lit, 1.2, (p) => { p.moveTo(11.8 + R.L, 10.6); p.quadraticCurveTo(16.4, 9.2 - R.wind * 3.2, 20.4, 14); });
      strokePath(q, P.rim, 0.35, (p) => { p.moveTo(12.4 + R.L, 9.9); p.quadraticCurveTo(16.4, 8.4 - R.wind * 3.2, 20.6, 13.2); });
      // Mackerel stripes over the back and round the haunch.
      for (let i = 0; i < 5; i++) {
        const x = 13.2 + i * 1.7;
        strokePath(q, P.stripe, 0.55, (p) => { p.moveTo(x - 0.4, 8); p.quadraticCurveTo(x + 0.6, 11.4, x - 0.2, 14.2); });
      }
      for (let i = 0; i < 3; i++) strokePath(q, P.stripe, 0.5, (p) => p.ellipse(18.1, R.g - 4.5, 2.2 + i * 1.1, 1.8 + i * 0.9, 0, Math.PI * 0.95, Math.PI * 1.9));
      // A pale bib down the chest.
      fillPath(q, P.belly, oval(10.2 + R.L, 14.4, 1.5, 3.0, 0.2));
    },
  });
  hindLeg(c, R, { fill: P.fur, crease: P.dark, lit: P.lit });
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
  whiskers(c, R, 'rgba(255,255,255,0.75)');
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
// THE MANEKI-NEKO, several ways (Peter, 16 Oct 2026: "do a bake off with a few
// different versions … like a completely different cat... white predominantly though",
// "maybe gold"). One painter, a design per entry: the palette, the eyes, the markings,
// the bib, the coin and the build. `classic` is the one the game has dealt.
//   eyes: happy (painted arcs) | round (open gold eyes) | dot (two beads) | gold (gilded arcs)
//   marks: [x, y, rx, ry, rot, colour] patches on the body; headMark the one on the head
//   paint: 'cobalt' waves | 'gold' lines | null
export const MANEKI_DESIGNS = {
  classic: { name: 'CLASSIC', glaze: '#f7f3ea', shade: '#d6cdbf', lit: '#ffffff', ear: '#f08a96',
    collar: '#d8263a', gold: '#f2c23a', goldDk: '#b8871c', eyes: 'happy', bib: false,
    // No black spot on his head (Peter, 16 Oct: "I like A but I don't want the black spot
    // on his head").
    marks: [[18.6, 13.6, 2.6, 2.0, 0.4, '#e8962e']], headMark: null, paint: null, coin: 0.9, headR: 4.3, trim: null, headScale: 1.15 },
  tokoname: { name: 'TOKONAME', glaze: '#fbf8f1', shade: '#dcd3c4', lit: '#ffffff', ear: '#e0303f',
    collar: '#d8263a', gold: '#f2c23a', goldDk: '#b8871c', eyes: 'round', bib: true,
    marks: [[18.4, 13.2, 2.9, 2.3, 0.4, '#2a2430'], [16.4, 17.6, 1.9, 1.3, -0.3, '#e8862a']], headMark: '#e8862a', paint: null, coin: 1.15, headR: 4.4, trim: null },
  bean: { name: 'KAWAII BEAN', glaze: '#ffffff', shade: '#e4e0ea', lit: '#ffffff', ear: '#ff9ab4',
    collar: '#ff4d6a', gold: '#f6cf55', goldDk: '#c09224', eyes: 'dot', bib: false,
    marks: [], headMark: null, paint: null, coin: 0.7, headR: 4.8, trim: null, cheeks: true },
  whiteGold: { name: 'WHITE & GOLD', glaze: '#fbf9f4', shade: '#ddd6c8', lit: '#ffffff', ear: '#e9b84a',
    collar: '#c81e33', gold: '#f2c23a', goldDk: '#a87a14', eyes: 'gold', bib: false,
    marks: [], headMark: null, paint: 'gold', coin: 1.3, headR: 4.3, trim: '#e9b84a' },
  gold: { name: 'ALL GOLD', glaze: '#f0c445', shade: '#c9952a', lit: '#fff1b0', ear: '#d8263a',
    collar: '#c81e33', gold: '#fff3c4', goldDk: '#c9952a', eyes: 'happy', bib: false,
    marks: [], headMark: null, paint: null, coin: 1.2, headR: 4.3, trim: null, gilt: true },
  imari: { name: 'IMARI PORCELAIN', glaze: '#f8f8f4', shade: '#d8dbe0', lit: '#ffffff', ear: '#d8263a',
    collar: '#1f3fa8', gold: '#f2c23a', goldDk: '#b8871c', eyes: 'happy', bib: false,
    marks: [], headMark: null, paint: 'cobalt', coin: 1, headR: 4.2, trim: null },
};
export const MANEKI_DEFAULT = 'classic';

// THE BECKON, five ways (Peter, 16 Oct 2026: "i am not 100% happy with his hand rocking
// … in the idle part", "do a bake off with a few different versions"). Each returns the
// forearm's angle (degrees, -90 = straight up, more negative = tipped forward toward the
// face), a `curl` of the paw over at the wrist (0..1), and a straight `lift` (units).
//   pivot   a quick flap forward and down from the elbow, a slower lift back, twice a ring
//   curl    the forearm stays up; only the paw folds over at the wrist and back
//   rock    the whole forearm rocks evenly forward and back, once a ring — the battery cat
//   double  two quick flaps, then a held pause
//   slide   the old one: the paw slides straight up and down (for reference)
export const BECKON_STYLES = ['pivot', 'curl', 'rock', 'double', 'slide'];
// SHIPPED: rock (Peter, 16 Oct 2026: "ship A with the ROCK beckon").
export const BECKON_DEFAULT = 'rock';
function beckonPose(style, t) {
  const r = (t % IDLE_LOOP) / IDLE_LOOP;            // 0..1 over the ring
  const flapOf = (ph, down = 0.3) => (ph < down ? smooth(0, down, ph) : 1 - smooth(down, 1, ph));
  switch (style) {
    case 'curl': return { ang: -88, curl: flapOf((r * 2) % 1, 0.35), lift: 0 };
    case 'rock': return { ang: -70 - 60 * (0.5 - 0.5 * Math.cos(r * TAU)), curl: 0, lift: 0 };
    case 'double': {
      const k = r < 0.5 ? flapOf((r * 4) % 1, 0.35) : 0;
      return { ang: -80 - 48 * k, curl: 0.3 * k, lift: 0 };
    }
    case 'slide': return { ang: -90, curl: 0, lift: -Math.sin(r * TAU * 2) * 1.2 };
    default: return { ang: -80 - 52 * flapOf((r * 2) % 1), curl: 0, lift: 0 };
  }
}

// SIDE-ON (Peter, 16 Oct 2026: "can we not make it side on to match the other cats?"):
// the shared rig — profile head with its muzzle, torso and haunch, tail, one eye — in the
// design's glaze. Then: "what if the rocking paw was the far paw and the swipe was the
// near paw that is positioned like the real cats... it might be easier to do the rocking
// paw if we can't see the elbow". So the FAR forepaw beckons, raised behind the head, its
// elbow hidden by the shoulder, rocking from a pivot nobody sees; the NEAR forepaw rests
// on the koban at the chest as on every shop counter, and that is the paw that swipes.
// The head tips back a little while it smiles ("a slight tilt of the face to sell the
// smile") and drops forward into the snarl.
export function maneki(c, w, h, t, u, o = {}) {
  const P = { ...MANEKI_DESIGNS[MANEKI_DEFAULT], ...(MANEKI_DESIGNS[o.design] || {}) };
  const style = o.beckon || BECKON_DEFAULT;
  const { ang, curl, lift } = beckonPose(style, t);
  // ONE PAW (Peter, 16 Oct 2026: "perhaps if the front paw was longer, we wouldn't need
  // the rear paw at all.. he doesn't need to hold his medal"). The near forepaw, long,
  // beckons from the shoulder — up past the back of the head at 12 o'clock, over and
  // down toward the hero to 8 o'clock — and it is the paw that swipes. No coin.
  const over = Math.max(0, Math.min(1.05, (-80 - ang) / 52));
  const SH = [11.0, 12.6], ARM = 7.4;
  const armA = (-80 - over * 120) * Math.PI / 180;
  const beckPaw = [SH[0] + Math.cos(armA) * ARM - curl * 0.9, SH[1] + Math.sin(armA) * ARM + curl * 1.0 + lift];
  const R = rig(w, h, t, u, {
    headR: P.headR * 0.84, headX: 8.9, headY: 7.2, shoulderX: SH[0], shoulderY: SH[1], headLift: 2.0,
    rest: () => beckPaw, reach: [1.7, 13.6],
  });
  slashes(c, R, redSlash);
  const calm = 1 - R.angry;
  // A real tail (Peter, 16 Oct: "shouldn't he have a tail"): the shared one, up the back
  // of the cat and swishing, in the glaze, with the design's patch colour on its tip.
  const tp = tailPath(R, {});
  limb(c, tp, 1.6 + R.angry * 0.4, P.glaze);
  // The tip in the patch colour: the tail stroked again inside a circle round its end,
  // so it stays on the tip however the tail bends or shortens (a dash along the path
  // fell off the end on the strike: "the markings on his tail disappear on strike").
  const tipCol = P.marks[0]?.[5] || P.headMark || null;
  if (tipCol) {
    const [sw, lift] = tailSwing(R, 0, 1.5);
    const tip = [21.0 + sw, 9.8 - R.angry * 1.2 + lift];
    c.save();
    c.beginPath(); c.arc(tip[0], tip[1], 2.0, 0, TAU); c.clip();
    c.beginPath(); tp(c); c.lineWidth = 1.6 + R.angry * 0.4; c.lineCap = 'round'; c.strokeStyle = tipCol; c.stroke();
    c.restore();
  }
  // The body: the shared torso and haunch, flat — one shade band low, one down the back.
  // A NECK in the body's own silhouette, so the head sits ON the cat (Peter, 16 Oct: "his
  // head looks totally detached"): inked with the torso as one shape, under the head.
  const neck = oval(R.hx + 1.9, R.hy + 2.7, 2.5, 2.7, -0.4);   // the collar's NO matches
  solid(c, [...torsoParts(R, { arch: 0.8, haunch: [18.0, 4.7, 5.2, 4.8], chest: 0.8, round: 1.6 }), neck], P.glaze, {
    inner: (q) => {
      // The shade FOLLOWS THE BODY (Peter, 16 Oct: "why is the shading right and bottom
      // squared off like that?"): the whole body in shade, then the same body nudged up
      // and forward in glaze over it, leaving a curved band along the back and the base
      // that hugs the rounded outline instead of two straight-edged blocks.
      shadeBand(q, [...torsoParts(R, { arch: 0.8, haunch: [18.0, 4.7, 5.2, 4.8], chest: 0.8, round: 1.6 }), neck], P.shade, P.glaze);
      // The patches ride the body as it throws itself forward on the strike ("markings
      // don't move on strike"): the front of the cat moves with the chest's lean, the back
      // stays planted with the haunch, so each patch shifts by how far forward it sits.
      for (const [x, y, rx, ry, rot, col] of P.marks) {
        const k = Math.max(0, Math.min(1, (21 - x) / 11));
        fillPath(q, col, oval(x + R.L * k, y + R.wind * 0.4 * k, rx, ry, rot));
      }
      if (P.paint === 'cobalt') {
        for (let i = 0; i < 3; i++) strokePath(q, '#1f3fa8', 0.45, (p) => {
          const y0 = 13.6 + i * 2.1;
          p.moveTo(12, y0);
          for (let x = 12; x < 22; x += 2) p.quadraticCurveTo(x + 0.5, y0 - 1.0, x + 1, y0), p.quadraticCurveTo(x + 1.5, y0 + 1.0, x + 2, y0);
        });
        fillPath(q, '#d8263a', circle(18.6, 11.4, 0.7));
        strokePath(q, '#f2c23a', 0.2, circle(18.6, 11.4, 1.0));
      } else if (P.paint === 'gold') {
        strokePath(q, P.trim, 0.35, (p) => { p.moveTo(10.2 + R.L * 0.6, 18.2); p.quadraticCurveTo(15.4, 19.8, 21.2, 17.6); });
        strokePath(q, P.trim, 0.25, (p) => { p.moveTo(14.6, 10.0); p.quadraticCurveTo(18.6, 11.0, 20.6, 15.0); });
      }
      if (P.gilt) strokePath(q, '#fff6cf', 0.45, (p) => { p.moveTo(12.6 + R.L, 10.0); p.quadraticCurveTo(16.4, 8.9, 20.0, 12.2); });
      strokePath(q, P.lit, 0.45, (p) => { p.moveTo(12.4 + R.L, 9.9); p.quadraticCurveTo(16.4, 8.8, 20.4, 13.0); });
    },
  });
  hindLeg(c, R, { haunch: [18.0, 4.7, 5.2, 4.8], fill: P.glaze, crease: P.shade });
  // The base, finessed: the haunch's curve drawn round to the floor, so he sits rather
  // than stands on a block.
  // (The haunch line is hindLeg's now.)
  // No hind foot (Peter, 16 Oct: "can we not show the rear foot?").
  // THE KOBAN, big, standing on the floor against his chest (Peter, 16 Oct: "bigger coin,
  // perhaps touching the floor - no paw (it wouldn't be seen on far side) - separation
  // from bell"): no paw drawn — the far paw that holds it is out of sight — its foot on
  // the ground line and its top well clear of the bell at the throat.
  {
    const cs = P.coin;
    // SIDE-ON like the cat (Peter, 16 Oct: "i would like the medallion to look better
    // like it's side on"): the koban faces the way he faces, so we see it turned — a
    // narrow face toward the hero and its thick gold rim behind, the face's lines
    // foreshortened. Still a straight-sided oblong, still standing on the floor.
    // HELD, not standing (Peter, 16 Oct: "position the medallion so it LOOKS like it's
    // being held at an angle by the rear paw rather than just sitting on the ground"):
    // lifted off the floor to the chest; held from behind and below by the rear paw, so
    // its foot is tucked in to his body and its top tips OUT toward the hero (Peter:
    // "wouldn't the medallion angle the other way if held by rear paw?"). It moves with
    // the chest.
    // The dark rim (the shading on its right) thinner, the coin itself as it was, and a
    // touch lower, clear of the bell (Peter: "less dark shading on the right … I mean
    // thinner shading not thinner medallion … move down a touch to avoid bell").
    const ry = 2.8 * cs, fw = 0.85 * cs, rim = 0.28 * cs;
    const cx0 = 9.9 + R.L * 0.7, cy0 = R.g - ry - 1.0 + R.wind * 0.3;
    c.save();
    c.translate(cx0, cy0 + ry);           // pivot at its foot, tucked against him
    c.rotate(-0.3 + 0.08 * R.s);
    c.translate(-cx0, -(cy0 + ry));
    const kx = cx0, ky = cy0;
    const face = (p) => p.roundRect(kx - fw, ky - ry, fw * 2, ry * 2, fw * 0.95);
    const back = (p) => p.roundRect(kx - fw + rim, ky - ry + 0.1, fw * 2, ry * 2 - 0.2, fw * 0.95);
    // The rim: the coin's thickness, behind the face.
    // A fine warm-brown line round it, not the body's heavy ink (Peter: "even thinner and
    // fainter outline on the medallion so it doesn't look like it's part of his body").
    const coinInk = { ink: '#7a4e10', lw: 0.2 };
    solid(c, [back, (p) => p.rect(kx, ky - ry + fw * 0.6, rim, ry * 2 - fw * 1.2)], P.goldDk, coinInk);
    solid(c, [face], P.gold, { ...coinInk,
      inner: (q) => {
        strokePath(q, P.goldDk, 0.22, (p) => { for (let i = 0; i < 4; i++) { p.moveTo(kx - fw * 0.7, ky + (i - 1.5) * 1.05 * cs); p.lineTo(kx + fw * 0.7, ky + (i - 1.5) * 1.05 * cs); } });
        fillPath(q, '#fff2b8', oval(kx - fw * 0.35, ky - ry * 0.45, 0.22 * cs, 0.9 * cs, 0.1));
      },
    });
    c.restore();
  }
  // THE COLLAR round the NECK, under the head — not on the chin ("the collar with bell
  // seems to be attached to his chin"): drawn on the body before the head goes on, so the
  // jaw sits over its top edge and the bell hangs at the front of the chest.
  if (P.bib) {
    solid(c, [polyP([R.hx - 1.2, R.hy + 4.6, R.hx + 3.2, R.hy + 3.8, R.hx - 0.2, R.hy + 7.6])], P.collar, { lw: LWI });
  }
  // Wrapped round the neck, not a straight bar ("the collar is not wrapped around
  // nicely, it is a straight line"): the front half of a ring round the neck, seen from
  // the side — dipping at the throat, rising to disappear behind the nape — with a lit
  // edge along its top and the bell hanging from its lowest point at the throat.
  // ANCHORED at both ends ("collar doesn't firmly stay attached to back of neck on
  // strike"): it runs from the THROAT, which goes where the head goes, round under the
  // neck to the NAPE, which goes where the torso goes — the torso's own nape point — so
  // it never floats off the back of the neck when the head and body move apart.
  const throat = [R.hx - 1.1, R.hy + 4.4];
  // The nape end rides the NECK (which goes with the head), not the torso's nape: on the
  // strike the head and neck lift and lunge, and a torso-pinned end was left down on the
  // chest (Peter: "collar is detached on strike from back of neck").
  // ...and it ends ON the neck's outline at the back — the point of the neck oval facing
  // back, above the shoulders — so it wraps over the silhouette's edge rather than
  // stopping short on the white ("still detached").
  const NO = { cx: R.hx + 1.9, cy: R.hy + 2.7, rx: 2.5, ry: 2.7, rot: -0.4 };
  const th = 0.05 * Math.PI;
  const nape = [
    NO.cx + NO.rx * Math.cos(th) * Math.cos(NO.rot) - NO.ry * Math.sin(th) * Math.sin(NO.rot),
    NO.cy + NO.rx * Math.cos(th) * Math.sin(NO.rot) + NO.ry * Math.sin(th) * Math.cos(NO.rot),
  ];
  const sag = [(throat[0] + nape[0]) / 2 - 0.2, Math.max(throat[1], nape[1]) + 1.2];
  const collarPath = (p) => { p.moveTo(throat[0], throat[1]); p.quadraticCurveTo(sag[0], sag[1], nape[0], nape[1]); };
  // Thinner ("collar could be thinner").
  strokePath(c, INK, 1.3, collarPath);
  strokePath(c, P.collar, 0.8, collarPath);
  strokePath(c, 'rgba(255,255,255,0.45)', 0.28, (p) => { p.moveTo(throat[0] + 0.5, throat[1] - 0.15); p.quadraticCurveTo(sag[0], sag[1] - 0.4, nape[0] - 0.4, nape[1] - 0.35); });
  // The little bell round his neck, at the throat (Peter, 16 Oct: "i still want the
  // little bell around his neck").
  const bx0 = throat[0] + 0.4, by0 = throat[1] + 1.1;
  // The coin's fine warm-brown line, not the body ink ("make bell have same outline").
  solid(c, [circle(bx0, by0, 0.8)], P.gold, { ink: '#7a4e10', lw: 0.2, inner: (q) => fillPath(q, '#fff2b8', circle(bx0 - 0.24, by0 - 0.24, 0.3)) });
  line(c, bx0 - 0.62, by0 + 0.24, bx0 + 0.62, by0 + 0.24, '#7a4e10', 0.14);
  // The head tips back into the smile and forward into the snarl, about the neck.
  // The pivot is where the back of the skull meets the nape, so the join never opens.
  const tilt = 0.12 * calm - 0.08 * R.angry + 0.025 * Math.sin(t * TAU) * calm;
  const NP = [R.hx + 2.6, R.hy + 2.4];
  c.save();
  c.translate(NP[0], NP[1]);
  c.rotate(tilt);
  // A bigger head, scaled about the neck so it stays seated (Peter, 16 Oct: "would it
  // work better if the head on A was a bit larger?"). The whole face scales with it.
  c.scale(P.headScale ?? 1, P.headScale ?? 1);
  c.translate(-NP[0], -NP[1]);
  // The head, side-on: the shared skull, muzzle and ears.
  const H = headParts(R, { earH: 0.95, earW: 1.0, flat: R.angry * 0.7, muzzle: 0.95 });
  solid(c, H.parts, P.glaze, {
    inner: (q) => {
      if (P.headMark) fillPath(q, P.headMark, oval(R.hx + 1.6, R.hy - 1.8, 1.6, 1.3, 0.4));
      if (P.paint === 'cobalt') strokePath(q, '#1f3fa8', 0.3, (p) => { p.moveTo(R.hx + 0.6, R.hy - 2.6); p.quadraticCurveTo(R.hx + 2.4, R.hy - 1.6, R.hx + 2.4, R.hy + 0.6); });
      if (P.gilt) fillPath(q, '#fff6cf', oval(R.hx - 0.4, R.hy - 2.0, 1.0, 0.45, -0.3));
      strokePath(q, P.lit, 0.45, (p) => p.arc(R.hx, R.hy, R.headR - 0.3, Math.PI * 1.1, Math.PI * 1.45));
      fillPath(q, P.shade, (p) => p.rect(R.hx + R.headR - 1.0, R.hy - 6, 3, 12));
    },
  });
  // The inner ear, a size up (Peter, 16 Oct: "slightly bigger pink triangle on left
  // ear"): the same triangle scaled 1.3 about its middle.
  // Built FROM the ear as drawn, so it goes back with it when the ear flattens and
  // twitches with it (Peter: "it doesn't seem to move when the ear goes back"), and set
  // deep in the ear — shrunk toward the ear's middle and drawn up toward its tip ("needs
  // to go further into the ear").
  {
    const [b0, b1, tp] = H.frontTri;
    const mx = (b0[0] + b1[0] + tp[0]) / 3, myy = (b0[1] + b1[1] + tp[1]) / 3;
    const cx2 = mx + (tp[0] - mx) * 0.22, cy2 = myy + (tp[1] - myy) * 0.22;
    fillPath(c, P.ear, polyP([b0, b1, tp].flatMap(([x, y]) => [cx2 + (x - mx) * 0.52, cy2 + (y - myy) * 0.52])));
  }
  if (P.trim) fillPath(c, P.trim, polyP([R.hx - 2.0 + R.angry * 2.0, R.hy - 4.6 + R.angry * 1.9, R.hx - 2.25 + R.angry * 1.6, R.hy - 3.7 + R.angry * 1.5, R.hx - 1.55 + R.angry * 1.6, R.hy - 3.9 + R.angry * 1.5]));
  // The face, in profile: one eye, the nose on the muzzle, the mouth under it.
  const ex = R.hx - 1.5, ey = R.hy - 0.5;
  if (R.angry > 0.3) {
    fillPath(c, 'rgba(255,46,77,0.35)', oval(ex, ey, 1.3, 0.75));
    fillPath(c, RED, polyP([ex - 0.95, ey - 0.05, ex + 0.95, ey - 0.55, ex + 0.7, ey + 0.25, ex - 0.75, ey + 0.3]));
    fillPath(c, '#ffd0d8', oval(ex, ey, 0.35, 0.12, -0.2));
    strokePath(c, INK, 0.55, (p) => { p.moveTo(ex - 1.2, ey - 0.6); p.lineTo(ex + 1.1, ey - 1.4); });
  } else if (P.eyes === 'round') {
    fillPath(c, INK, oval(ex, ey, 0.85, 0.95));
    fillPath(c, '#f2c23a', oval(ex, ey, 0.68, 0.78));
    fillPath(c, INK, oval(ex - 0.15, ey + 0.05, 0.28, 0.55));
    fillPath(c, WHITE, circle(ex - 0.3, ey - 0.3, 0.16));
    strokePath(c, '#d8263a', 0.25, (p) => { p.moveTo(ex - 0.9, ey - 1.4); p.quadraticCurveTo(ex, ey - 1.9, ex + 0.9, ey - 1.4); });
  } else if (P.eyes === 'dot') {
    fillPath(c, INK, circle(ex, ey, 0.48)); fillPath(c, WHITE, circle(ex - 0.16, ey - 0.16, 0.15));
  } else {
    strokePath(c, P.eyes === 'gold' ? P.goldDk : INK, 0.42, (p) => { p.moveTo(ex - 0.8, ey + 0.1); p.quadraticCurveTo(ex, ey - 0.9, ex + 0.8, ey + 0.1); });
  }
  if (P.cheeks) fillPath(c, 'rgba(255,120,160,0.55)', oval(R.hx - 0.6, R.hy + 1.1, 0.8, 0.45));
  // The nose: a proper rounded nose in a strong rose, inked, with a glint (Peter, 16 Oct:
  // "colour nose better") — the faint pink nick read as nothing on the glaze.
  // ON the muzzle's tip, inside its outline (Peter: "put tint on nose right on the nose
  // not near it") — it sat above and in front of the tip, off the face.
  // Forward to the very tip, its front edge on the muzzle's outline.
  const nx0 = R.hx - 3.97, ny0 = R.hy + 0.97;   // in the notch at the muzzle's front ("left and down a bit")
  const ns = 1.12;   // "slightly larger", then "a tiny bit smaller"
  const nose = (p) => { p.moveTo(nx0 - 0.55 * ns, ny0 - 0.2 * ns); p.quadraticCurveTo(nx0, ny0 - 0.38 * ns, nx0 + 0.55 * ns, ny0 - 0.15 * ns); p.quadraticCurveTo(nx0 + 0.3 * ns, ny0 + 0.4 * ns, nx0 - 0.05 * ns, ny0 + 0.45 * ns); p.quadraticCurveTo(nx0 - 0.5 * ns, ny0 + 0.25 * ns, nx0 - 0.55 * ns, ny0 - 0.2 * ns); };
  fillPath(c, '#e4466e', nose);
  strokePath(c, INK, 0.2, nose);
  fillPath(c, '#ffd0dc', circle(nx0 - 0.25, ny0 - 0.12, 0.15));
  // PAINTED WHISKERS, as on the ceramic cats (Peter, 16 Oct: "maybe go with stylised
  // whiskers on side of face?"): three short brush strokes on the cheek, behind the
  // muzzle and clear of the smile, fanned and bowed — fine, not bold.
  for (let i = 0; i < 3; i++) {
    const y = R.hy + 0.55 + i * 0.6;
    const x0 = R.hx - 0.6, x1 = R.hx + 1.5;
    const tilt = (i - 1) * 0.35;
    const stroke = (p) => { p.moveTo(x0, y - tilt * 0.4); p.quadraticCurveTo((x0 + x1) / 2, y - 0.3, x1, y + tilt); };
    strokePath(c, 'rgba(11,9,32,0.75)', 0.2, stroke);   // lighter ("not so bold whiskers")
  }
  const gape = R.angry;
  // The snarl: Pythagoras's B, shared (see snarl()).
  if (gape > 0.2) snarl(c, R, SNARL_DEFAULT, gape);
  else {
    // SMILING while it beckons: an open smile along the muzzle, pink inside.
    // Lowered clear of the whiskers (Peter, 16 Oct: "lower the mouth on him perhaps?
    // still overlaps with whiskers").
    // Bigger, and hung from just under the nose (Peter, 16 Oct: "maybe move mouth/smile a
    // little and make bigger"): a wide open grin from the nose back along the muzzle,
    // the corner turned up into the cheek.
    // A touch lower and smaller (Peter: "top mouth needs to be a bit lower.. smile could
    // be a little smaller"): its top edge now starts below the nose.
    const my = R.hy + 0.8, sx = (x) => R.hx - 2.7 + (x + 2.7) * 0.85;
    const smile = (p) => { p.moveTo(sx(-4.0), my + 1.0); p.quadraticCurveTo(sx(-2.7), my + 1.45, sx(-1.3), my + 0.8); p.quadraticCurveTo(sx(-1.75), my + 2.45, sx(-3.0), my + 2.3); p.quadraticCurveTo(sx(-3.9), my + 2.0, sx(-4.0), my + 1.0); };
    fillPath(c, '#7a1a2a', smile);
    fillPath(c, '#f07a8a', oval(sx(-2.65), my + 1.95, 0.62, 0.3, -0.2));
    strokePath(c, INK, 0.28, smile);
    strokePath(c, INK, 0.22, (p) => { p.moveTo(sx(-1.3), my + 0.8); p.quadraticCurveTo(sx(-1.0), my + 0.55, sx(-1.05), my + 0.2); });
  }
  c.restore();
  // The near forepaw, beckoning and then swiping: a straight long arm while it beckons
  // (a statue's arm does not bend), the shared curve once it swipes.
  const [px, py] = R.paw;
  if (R.s + R.wind > 0.05) nearLeg(c, R, 2.1, P.glaze);
  else limb(c, (p) => { p.moveTo(R.shoulder[0], R.shoulder[1]); p.lineTo(px, py); }, 2.1, P.glaze);
  solid(c, [circle(px, py, 1.3)], P.glaze, {
    inner: (q) => {
      fillPath(q, P.shade, (p) => p.rect(px + 0.5, py - 2, 2, 4));
      if (P.trim) fillPath(q, P.trim, circle(px - 0.6, py - 0.6, 0.65));
    },
  });
  if (R.angry < 0.25) {
    const an = Math.atan2(py - R.shoulder[1], px - R.shoulder[0]);
    const nx = -Math.sin(an), ny = Math.cos(an);
    for (const off of [-0.55, 0, 0.55]) {
      const bx = px + nx * off + Math.cos(an) * 0.5, by = py + ny * off + Math.sin(an) * 0.5;
      line(c, bx, by, bx + Math.cos(an) * 0.6, by + Math.sin(an) * 0.6, P.shade, 0.2);
    }
  }
  claws(c, R, 1.3, WHITE, 0.32, 1.2);
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
  const R = rig(w, h, t, u, { headLift: 2.0 });   // the snarl clears the swiping arm
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
  hindLeg(c, R, { fill: P.body, crease: P.lit, lit: P.lit, edge: (cc, all) => tube(cc, RED, 0.6, all, flick, 0.3) });
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
  whiskers(c, R, RED, 0.18, { y: 1.0, n: 2, tube: (path) => tube(c, RED, 0.18, path, flick * 0.8, 0.2) });
  if (R.angry > 0.15) snarl(c, R, SNARL_DEFAULT, R.angry);
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
  const R = rig(w, h, t, u, { headLift: 2.0 });   // the snarl clears the swiping arm
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
      shadeBand(q, torsoParts(R, { arch: 0.8 }), P.shellDk, P.shell);
      strokePath(q, WHITE, 1.0, (p) => { p.moveTo(11.8 + R.L, 10.6); p.quadraticCurveTo(16.4, 9.2 - R.wind * 1.2, 20.4, 14); });
      // Panel seams and a hatch.
      strokePath(q, P.shellDk, 0.25, (p) => { p.moveTo(14.6, 8); p.lineTo(14.2, 18.4); p.moveTo(10, 14.6 + R.L * 0.2); p.lineTo(14.2, 14.6); });
      fillPath(q, P.joint, circle(17.2, R.g - 4.6, 1.5));
      fillPath(q, P.steelLt, circle(17.2, R.g - 4.6, 0.8));
      // A red status strip along the flank.
      tube(q, RED, 0.45, (p) => { p.moveTo(15.6, 11.6); p.lineTo(19.2, 13.0); }, 0.6 + 0.4 * R.angry, 0.3);
    },
  });
  hindLeg(c, R, { fill: P.shell, crease: P.shellDk, edge: o.edge || null });
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
  // Speaker-grille mouth; on the strike the jaw drops on steel fangs — the shared snarl.
  if (R.angry > 0.15) snarl(c, R, SNARL_DEFAULT, R.angry);
  else for (let i = 0; i < 3; i++) line(c, R.hx - 3.6 + i * 0.5, R.hy + 1.3, R.hx - 3.7 + i * 0.5, R.hy + 1.9 + R.angry * 0.4, INK, 0.2);
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
  const R = rig(w, h, t, u, { headLift: 2.0 });   // the snarl clears the swiping arm
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
      shadeBand(q, torsoParts(R, { arch: 2.2 }), P.dark, P.fur);
      strokePath(q, P.lit, 1.1, (p) => { p.moveTo(11.8 + R.L, 10.6); p.quadraticCurveTo(16.4, 9.2 - R.wind * 3.4, 20.4, 14); });
      // Ruff of fur at the chest, ragged.
      strokePath(q, P.lit, 0.3, (p) => { for (let i = 0; i < 3; i++) { p.moveTo(9.8 + R.L + i * 0.3, 12.4 + i * 1.2); p.lineTo(10.8 + R.L + i * 0.3, 12.9 + i * 1.2); } });
    },
  });
  hindLeg(c, R, { fill: P.fur, crease: P.lit, lit: P.lit, edge: o.rim ? haloEdge(o.rim) : null });
  const H = headParts(R, { earH: 1.15 });
  solid(c, H.parts, P.fur, { edge: o.rim && haloEdge(o.rim), inner: (q) => fillPath(q, P.lit, circle(R.hx - 1.0, R.hy - 1.4, R.headR * 0.72)) });
  fillPath(c, '#5a2a4a', polyP([R.hx - 2.3, R.hy - 1.9, R.hx - 1.0, R.hy - 2.8, R.hx - 2.1 + R.angry * 2.0, R.hy - 4.8 + R.angry * 2.0]));
  // Eyes: gold and wide, the glow round them — wider than the stray's, it is not afraid.
  const eo = R.blink ? 0.08 : 0.62 * (1 - R.angry * 0.3);
  c.save(); c.globalAlpha *= 0.35; fillPath(c, P.eye, circle(R.hx - 1.5, R.hy - 0.5, 1.4)); c.restore();
  fillPath(c, P.eye, oval(R.hx - 1.5, R.hy - 0.5, 0.85, eo, -0.15));
  fillPath(c, INK, oval(R.hx - 1.6, R.hy - 0.5, 0.15, Math.max(0.05, eo * 0.95)));
  whiskers(c, R, 'rgba(232,226,255,0.7)');
  if (R.angry > 0.1) snarl(c, R, SNARL_DEFAULT, R.angry);
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
  whiskers(c, R, 'rgba(255,255,255,0.8)', 0.12, { y: 1.2 });
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
// THE SNARL, several ways (Peter, 16 Oct 2026, of Pythagoras: "could we do a bake off
// with more prominent teeth baring … it is a little subtle right now"). Profile, facing
// left, the mouth under the muzzle; `g` is how far into the swipe (0..1).
//   now     the original: a small dark gape and one fang
//   gape    the jaw dropped wide, pink inside, two long upper fangs and two lower
//   hiss    lips curled right back: a white row of teeth with the fangs at each end,
//           the nose wrinkled into ridges
//   vampire the mouth half open, two long fangs hanging well over the lower lip
//   roar    the whole jaw thrown open to the chin, red inside, every tooth, tongue out
//   gapePlus  B, pushed (Peter: "b i think. it makes the teeth read better, can we improve
//           that a bit more?"): a bigger jaw, the upper lip curled up off the gum, a pink
//           gum line, thick-inked fangs top and bottom with incisors between, a deeper
//           mouth so the white stands off it.
export const SNARL_STYLES = ['now', 'gape', 'gapePlus', 'hiss', 'vampire', 'roar'];
// Peter, 16 Oct 2026: "let's do regular b, can the other cats get this too?" — B
// (gape) is the shipped snarl, and every side-on cat in the game bares it: Pythagoras,
// the maneki-neko, the mecha, the nekomata and the neon cat. B+ stays on the sheet.
export const SNARL_DEFAULT = 'gape';
function snarl(c, R, style, g) {
  const x0 = R.hx - 4.1, x1 = R.hx - 0.8, y0 = R.hy + 1.2;   // the mouth's corner-to-tip line
  const fang = (x, y, len, dir = 1, w = 0.32) => {
    fillPath(c, INK, polyP([x - w - 0.12, y, x + w + 0.12, y, x, y + dir * (len + 0.15)]));
    fillPath(c, WHITE, polyP([x - w, y, x + w, y, x, y + dir * len]));
  };
  const wrinkles = (n = 2) => { for (let k = 0; k < n; k++) line(c, R.hx - 3.4 + k * 0.55, R.hy - 0.05, R.hx - 2.9 + k * 0.55, R.hy - 0.5, INK, 0.2); };
  if (style === 'now') {
    fillPath(c, '#3a1418', polyP([R.hx - 3.7, R.hy + 1.3, R.hx - 1.6, R.hy + 1.6, R.hx - 3.3, R.hy + 1.5 + g * 1.5]));
    fillPath(c, WHITE, polyP([R.hx - 3.3, R.hy + 1.35, R.hx - 3.0, R.hy + 1.4, R.hx - 3.2, R.hy + 1.35 + g * 0.9]));
    return;
  }
  if (style === 'gape' || style === 'roar') {
    const drop = (style === 'roar' ? 3.2 : 2.2) * g;
    const back = style === 'roar' ? 0.6 : 0;
    const mouth = (p) => { p.moveTo(x0 - 0.1, y0 - 0.1); p.lineTo(x1 + back, y0 + 0.2); p.lineTo(x0 + 0.5, y0 + drop); p.closePath(); };
    fillPath(c, INK, (p) => { p.moveTo(x0 - 0.35, y0 - 0.3); p.lineTo(x1 + back + 0.3, y0 + 0.2); p.lineTo(x0 + 0.4, y0 + drop + 0.35); p.closePath(); });
    fillPath(c, style === 'roar' ? '#c8243a' : '#6a1424', mouth);
    // The tongue, low in the jaw.
    fillPath(c, '#f07a8a', oval(x0 + 1.1, y0 + drop * 0.7, 0.9, 0.35, -0.5));
    // The lower jaw's lip line, so the open mouth reads as a jaw, not a hole.
    strokePath(c, INK, 0.25, (p) => { p.moveTo(x1 + back, y0 + 0.2); p.lineTo(x0 + 0.4, y0 + drop + 0.1); });
    fang(x0 + 0.45, y0 - 0.05, 1.2 * g + 0.4);
    fang(x0 + 1.5, y0 + 0.05, 0.9 * g + 0.3, 1, 0.26);
    fang(x0 + 0.75, y0 + drop * 0.86, 0.9 * g + 0.2, -1, 0.26);
    if (style === 'roar') {
      for (const k of [0.35, 0.6]) fang(x0 + 1.5 + k * 1.6, y0 + 0.1 + k * 0.1, 0.45, 1, 0.18);
      fang(x0 + 1.6, y0 + drop * 0.62, 0.5, -1, 0.2);
    }
    wrinkles(style === 'roar' ? 3 : 2);
    return;
  }
  if (style === 'gapePlus') {
    const drop = 3.2 * g, back = 0.9;
    const tip = [x0 + 0.2, y0 + drop];                    // the lower jaw's tip
    // Ink, then the mouth: deep, nearly black red, so the teeth are the brightest thing.
    fillPath(c, INK, (p) => { p.moveTo(x0 - 0.45, y0 - 0.45); p.lineTo(x1 + back + 0.35, y0 + 0.15); p.lineTo(tip[0] - 0.2, tip[1] + 0.45); p.closePath(); });
    fillPath(c, '#3e0812', (p) => { p.moveTo(x0 - 0.15, y0 - 0.2); p.lineTo(x1 + back, y0 + 0.2); p.lineTo(tip[0], tip[1]); p.closePath(); });
    fillPath(c, '#e86a7c', oval(x0 + 1.0, y0 + drop * 0.72, 0.85, 0.32, -0.55));
    // The gum along the top, pink, the teeth growing out of it.
    strokePath(c, '#e05a74', 0.42, (p) => { p.moveTo(x0 - 0.05, y0 - 0.12); p.lineTo(x1 + back - 0.2, y0 + 0.16); });
    // Upper: two long fangs with three incisors between them.
    fang(x0 + 0.35, y0 + 0.02, 1.4 * g + 0.5, 1, 0.4);
    for (let k = 1; k <= 3; k++) fang(x0 + 0.35 + k * 0.42, y0 + 0.05 + k * 0.02, 0.38, 1, 0.16);
    fang(x0 + 2.05, y0 + 0.12, 1.0 * g + 0.35, 1, 0.3);
    // Lower: two fangs up from the jaw line.
    const jaw = (k) => [x1 + back + (tip[0] - x1 - back) * k, y0 + 0.2 + (tip[1] - y0 - 0.2) * k];
    for (const [k, len, w2] of [[0.82, 1.0 * g + 0.25, 0.32], [0.45, 0.7 * g + 0.2, 0.26]]) {
      const [jx, jy] = jaw(k);
      fang(jx, jy - 0.05, len, -1, w2);
    }
    strokePath(c, INK, 0.3, (p) => { p.moveTo(x1 + back, y0 + 0.2); p.lineTo(tip[0], tip[1]); });
    // The upper lip pulled up off the gum and curled at the corner — the snarl.
    strokePath(c, INK, 0.38, (p) => { p.moveTo(x0 - 0.5, y0 - 0.5); p.quadraticCurveTo(x0 + 1.2, y0 - 1.0, x1 + back + 0.3, y0 - 0.2); p.quadraticCurveTo(x1 + back + 0.7, y0 - 0.1, x1 + back + 0.6, y0 + 0.4); });
    wrinkles(3);
    return;
  }
  if (style === 'hiss') {
    // Lips drawn back: the mouth a long open slot, the teeth a white bar across it.
    const h = 0.6 + g * 0.9;
    fillPath(c, INK, (p) => p.roundRect(x0 - 0.2, y0 - 0.3, x1 - x0 + 1.0, h + 0.5, 0.5));
    fillPath(c, '#6a1424', (p) => p.roundRect(x0, y0 - 0.15, x1 - x0 + 0.6, h + 0.2, 0.4));
    fillPath(c, WHITE, (p) => p.rect(x0 + 0.1, y0 - 0.12, x1 - x0 + 0.4, 0.45));
    fillPath(c, WHITE, (p) => p.rect(x0 + 0.1, y0 + h - 0.35, x1 - x0 + 0.4, 0.4));
    for (let k = 1; k < 5; k++) line(c, x0 + 0.1 + k * 0.6, y0 - 0.12, x0 + 0.1 + k * 0.6, y0 + 0.33, INK, 0.1);
    fang(x0 + 0.4, y0 + 0.3, 0.7 * g + 0.3);
    fang(x0 + 0.5, y0 + h - 0.3, 0.6 * g + 0.2, -1, 0.26);
    wrinkles(3);
    // The lip pulled up and back.
    strokePath(c, INK, 0.3, (p) => { p.moveTo(x0 - 0.2, y0 - 0.35); p.quadraticCurveTo(x0 + 1.2, y0 - 0.9, x1 + 0.7, y0 - 0.1); });
    return;
  }
  // vampire: half open, two long fangs hanging over the lower lip.
  fillPath(c, INK, polyP([x0 - 0.3, y0 - 0.25, x1 + 0.2, y0 + 0.15, x0 + 0.3, y0 + 0.9 + g * 0.6]));
  fillPath(c, '#5a1020', polyP([x0 - 0.1, y0 - 0.1, x1, y0 + 0.15, x0 + 0.35, y0 + 0.75 + g * 0.5]));
  fang(x0 + 0.35, y0 - 0.1, 1.5 * g + 0.6, 1, 0.36);
  fang(x0 + 1.35, y0 + 0.02, 1.3 * g + 0.5, 1, 0.32);
  wrinkles(2);
}

export function pythagoras(c, w, h, t, u, o = {}) {
  const P = PYTH;
  // The snarl bake-off's takes lift the head on the strike so the teeth clear the arm.
  const R = rig(w, h, t, u, { headR: 3.4, headX: 8.6, headY: 8.4, headLift: (o.snarl || SNARL_DEFAULT) === 'now' ? 0 : 2.0 });
  // The swipe marks go down first: the cat swipes through them, not behind them.
  slashes(c, R, whiteSlash);
  // The tail: up and over in a question mark, as in the picture, darkening to the tip.
  const [sw, lift] = tailSwing(R, 0, 1.3);
  const tp = tailPath(R, { tip: [20.2 + sw, 7.6 - R.angry * 0.8 + lift] });
  if (o.rim) tube(c, o.rim, 1.6 + R.angry * 0.5 + 1.5, tp, 1, 0.07);
  limb(c, tp, 1.6 + R.angry * 0.5, P.dark);
  limb(c, farLeg(R), 1.8, P.dark);
  // Compact and muscular: a fuller chest and a rounder haunch than the stray.
  solid(c, torsoParts(R, { arch: 1.2, haunch: [18.0, 4.7, 5.2, 4.8], chest: 0.6 }), P.coat, {
    edge: o.rim && haloEdge(o.rim),
    inner: (q) => {
      shadeBand(q, torsoParts(R, { arch: 1.2, haunch: [18.0, 4.7, 5.2, 4.8], chest: 0.6 }), P.dark, P.coat);
      strokePath(q, P.lit, 1.6, (p) => { p.moveTo(11.8 + R.L, 10.8); p.quadraticCurveTo(16.4, 9.4 - R.wind * 2, 20.4, 14.2); });
      strokePath(q, P.sheen, 0.45, (p) => { p.moveTo(13.0 + R.L, 9.9); p.quadraticCurveTo(16.4, 8.9 - R.wind * 2, 19.4, 11.6); });
      fillPath(q, P.lit, oval(17.6, R.g - 6.2, 2.6, 1.6, -0.3));
      // The chest a shade warmer, catching the light.
      fillPath(q, P.lit, oval(10.4 + R.L, 13.8, 1.3, 2.6, 0.2));
    },
  });
  hindLeg(c, R, { haunch: [18.0, 4.7, 5.2, 4.8], fill: P.coat, crease: P.coat, footFill: P.dark, lit: P.lit });
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
  // Pale whiskers, as long as the picture's — under the mouth, so a snarl's teeth are
  // never crossed by them.
  whiskers(c, R, 'rgba(255,236,210,0.8)', 0.12, { y: 1.0, len: 4.4 });
  const gape = R.angry;
  if (gape > 0.1) snarl(c, R, o.snarl || SNARL_DEFAULT, gape);
  else {
    strokePath(c, INK, 0.2, (p) => { p.moveTo(R.hx - 3.6, R.hy + 1.1); p.quadraticCurveTo(R.hx - 3.0, R.hy + 1.5, R.hx - 2.4, R.hy + 1.3); });
  }
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
// 1.9 a side: the swishing tails and the neon glows reach past the 24-wide envelope.
const CAT_W = 24, CAT_H = 21, CAT_PAD_X = 1.9, CAT_PAD_Y = 0.6;
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
  // The lucky cat, first of all of them on Terminal Velocity 1 (Peter, 16 Oct 2026).
  catManeki: catPainter(maneki),
  catMechaNeon: catPainter(mechaTrim),
  catNekoGhost: catPainter(nekoGhost),
  catNeonBright: catPainter(neonBright),
};
export const CAT_TYPES = Object.keys(CAT_PAINTERS);
