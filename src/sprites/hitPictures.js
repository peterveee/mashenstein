// HIT PICTURES — BY WHAT HIT YOU (16 Oct 2026). Peter's picks from the lab bake-off
// `hit-effects-bakeoff` (src/dev/hit-effect-candidates.js): after the live wire's jolt
// (sprites/zap.js) and the dynamite's flip (sprites/blast.js), the rest of the ordinary
// hits get a picture of their own by what the hero ran into:
//
//   FIRE     hot-foot hop OR rocket seat, at random, never the same twice running
//   SPIKES   ouch hop on one foot, prickles left in him
//   ROLLERS  pancake — flattened, then pops back up
//   ICE      frozen in a block of ice that shatters off him
//   GENERIC  everything else: a white flash, then stars AND birdies round his head
//            through the ordinary blink ("a cartoon staple")
//
// A PICTURE, NOT A MOVE — the zap's rule. The run does not know: the hero keeps his
// speed, his spot and his hitbox, and the hit is the ordinary one (shake, hitstop,
// i-frames, sound). Each picture is drawn instead of the running toon for its `T`
// (draw.js holds the i-frame blink back for exactly that long, as for the zap); its
// `after`, if any, carries on over the blinking hero until `life` (smoke, shards, the
// circling stars). Drawn the way the zap is: his own toon into an offscreen layer,
// squashed, tinted or hopped there, blitted back — so it carries to the whole cast.
// Side-on always, no turn to camera, and nobody's face is blacked out.
import { drawToon } from './toons.js';
import { ZAP_T, layer, tint, blit, zapHash } from './zap.js';
import { OUTLINE_SCALE } from './outline.js';
import { bee } from './plumberProps.js';

// The zap's length — what the bake-off's candidates ran for.
export const HIT_T = ZAP_T;
// What the shipped pictures run for (Peter, 16 Oct: "longer pictures"). The i-frames stay
// 1.4s, so this leaves ~0.4s of the ordinary blink at the end as the "about to wear off"
// warning; nothing here may run past it.
export const HIT_LONG_T = 1.0;

const U = 24;   // HERO_DRAW_H, restated as zap.js does
const INK = '#2a2226';
const SOOT = '#2b2528';
const SMOKE = '#dcd6cf', SMOKE_DK = '#a59d97';
const EMBER = '#f6962c', FLAME_Y = '#f6d33c';
const PRICKLE = '#3b2a1c', PRICKLE_TIP = '#efe4c8';
// How fast smoke and bits left behind him drift back, world px/s — the lab's scroll; in a
// run the world is going by too, so it reads as left behind either way.
const SCROLL = 110;
const hash = zapHash;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, q) => a + (b - a) * q;
const easeOut = (q) => 1 - (1 - q) ** 3;

// ---------------------------------------------------------------- poses
// Side-on, as he runs (no turn to camera).
// `live` is the run's own pose for this frame, when there is one: the picture hands back
// to exactly what the ordinary draw would show.
const runPose = (t, live = null) => live || ({ kind: 'run', phase: (t * 1.7) % 1, time: t, grounded: true, facing: 1 });
const ouch = { kind: 'jump', vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true };
const standPose = (t) => ({ kind: 'stand', time: t, grounded: true, facing: 1, faceSurprised: true, browRaise: true });
// Both hands round to the seat of his trousers. On these rigs a front hand's `out` runs
// backwards and a back hand's forwards, so both land behind him at the hip.
const SEAT_HANDS = [[0.5, 0.72], [-0.5, 0.74]];
const clutchSeatPose = (t, tuck) => ({
  ...ouch, time: t,
  dance: { hands: SEAT_HANDS, feet: [[-0.1, -0.13 * tuck], [0.12, -0.08 * tuck]], ankles: [0.3 * tuck, -0.2 * tuck] },
});
// On one foot, the other drawn up in front and both hands down to it.
const clutchFootPose = (t) => ({
  ...ouch, time: t,
  dance: { hands: [[-0.6, 0.95], [-0.3, 0.92]], feet: [[0.18, -0.32], [0.02, 0]], ankles: [0.6, 0] },
});
// Stiff as a board: arms up, legs straight — the jolt's shape.
const boardPose = (t) => ({
  ...ouch, time: t,
  dance: { hands: [[0.8, -1.0], [0.8, -1.0]], feet: [[-0.1, 0], [0.1, 0]], ankles: [0, 0] },
});
// Pedalling the air.
const pedalPose = (t) => {
  const p = t * 26;
  return {
    ...ouch, time: t,
    dance: { hands: SEAT_HANDS, feet: [[0.12 * Math.cos(p), -0.14 - 0.08 * Math.sin(p)], [-0.12 * Math.cos(p), -0.14 + 0.08 * Math.sin(p)]], ankles: [0.3, -0.3] },
  };
};

// A layer the size of heroBox would clip a hero thrown up or squashed out wide.
const bigBox = (cx, fy) => [cx - 1.4 * U, fy - 2.2 * U, cx + 1.4 * U, fy + 0.35 * U];
// The seat of his trousers, in U from the feet.
const SEAT = [-0.2, -0.36];

const scratch = [];
function scratchFor(i, L) {
  let cv = scratch[i];
  if (!cv) cv = scratch[i] = document.createElement('canvas');
  if (cv.width < L.w || cv.height < L.h) { cv.width = Math.max(cv.width, L.w); cv.height = Math.max(cv.height, L.h); }
  const o = cv.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.filter = 'none';
  o.clearRect(0, 0, cv.width, cv.height);
  return { cv, o };
}
// Recolour him as ice: grey him, lift him, multiply by a pale blue — his features stay,
// in blue. `amt` mixes it over his own colours.
function iceTint(L, amt, blue = '#a8dcff') {
  if (amt <= 0) return;
  const S = scratchFor(0, L);
  S.o.filter = 'grayscale(1) brightness(1.5) contrast(0.85)';
  S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  S.o.filter = 'none';
  S.o.globalCompositeOperation = 'multiply'; S.o.fillStyle = blue; S.o.fillRect(0, 0, L.w, L.h);
  S.o.globalCompositeOperation = 'destination-in'; S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  L.o.save(); L.o.globalAlpha = amt; L.o.drawImage(S.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h); L.o.restore();
}
// The flash of the knock: a frame or two of him white.
function flashWhite(c, L) { tint(L, '#ffffff'); blit(c, L, { glow: '#ffffff', blur: 5 }); }

// ---------------------------------------------------------------- dressing
// (puff, star and flame restated from blast-candidates.js, which does not export them.)
function puff(c, x, y, r, a, dark = false, frost = false) {
  if (a <= 0 || r <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = frost ? '#f4fbff' : dark ? '#5a5256' : SMOKE; c.strokeStyle = frost ? '#9cc6e0' : dark ? '#2a2326' : SMOKE_DK; c.lineWidth = 0.45;
  c.beginPath();
  for (const [dx, dy, s] of [[0, 0, 1], [-0.7, 0.25, 0.7], [0.65, 0.3, 0.72]]) {
    c.moveTo(x + dx * r + s * r, y + dy * r); c.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2);
  }
  c.stroke(); c.fill();
  c.restore();
}
function star(c, x, y, r, rot, fill = FLAME_Y) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = fill; c.fill();
  c.strokeStyle = INK; c.lineWidth = 0.4; c.lineJoin = 'round'; c.stroke();
}
// A little flame: ember outside, yellow in, inked, its tip licking.
function flame(c, x, y, w, h) {
  if (h <= 0) return;
  for (const [s, col] of [[1, EMBER], [0.55, FLAME_Y]]) {
    c.beginPath();
    c.moveTo(x - w * s, y);
    c.quadraticCurveTo(x - w * s, y - h * s * 0.55, x - w * 0.3, y - h * s);
    c.quadraticCurveTo(x + w * s * 0.9, y - h * s * 0.5, x + w * s, y);
    c.quadraticCurveTo(x, y + w * s * 0.6, x - w * s, y);
    c.fillStyle = col; c.fill();
    if (s === 1) { c.strokeStyle = INK; c.lineWidth = 0.45; c.lineJoin = 'round'; c.stroke(); }
  }
}
// A prickle stuck in him: a dark spine, its pale tip out.
function prickle(c, x, y, ang, len = 3.2) {
  const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
  c.save(); c.lineCap = 'round';
  c.strokeStyle = PRICKLE; c.lineWidth = 0.75;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = PRICKLE_TIP; c.lineWidth = 0.45;
  c.beginPath(); c.moveTo(lerp(x, x1, 0.6), lerp(y, y1, 0.6)); c.lineTo(x1, y1); c.stroke();
  c.restore();
}
// Speed lines: short strokes, a cartoon "boing" or "ouch".
function lines(c, x, y, r0, r1, angs, a = 1, col = '#ffffff') {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.lineCap = 'round';
  for (const ang of angs) {
    const p0 = [x + Math.cos(ang) * r0, y + Math.sin(ang) * r0], p1 = [x + Math.cos(ang) * r1, y + Math.sin(ang) * r1];
    c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(...p0); c.lineTo(...p1); c.stroke();
    c.strokeStyle = col; c.lineWidth = 0.55; c.beginPath(); c.moveTo(...p0); c.lineTo(...p1); c.stroke();
  }
  c.restore();
}

// A run of hops: [start, end, height] each; returns the height off the floor at w.
function hopY(w, hops) {
  for (const [a, b, h] of hops) if (w >= a && w < b) { const q = (w - a) / (b - a); return 4 * h * q * (1 - q); }
  return 0;
}
// Smoke left behind from a moving point: puffs born on a clock at where the point was
// then, carried back by the scroll and rising.
function trail(c, at, w, { from, until, every, life = 0.4, r0 = 1, r1 = 3.2, dark = false, rise = 10, drift = 0.75 }) {
  for (let k = 0; k < 40; k++) {
    const born = from + k * every;
    if (born > until) break;
    if (w < born) continue;
    const age = w - born;
    if (age > life) continue;
    const q = age / life;
    const [x, y] = at(born);
    puff(c, x - SCROLL * drift * age + (hash(k * 2.3) - 0.5) * 1.5, y - rise * q, lerp(r0, r1, easeOut(q)), 0.9 * (1 - q) ** 1.1, dark && k % 3 === 0);
  }
}

// Where his face is, measured once per hero off his own standing toon (restated from
// src/dev/blast-candidates.js faceOf): the centroid of the near-white ink above the
// shoulders is his eyes, the topmost ink the top of his head. In U from the feet.
const FACE = new Map();
export function faceOf(heroId) {
  if (FACE.has(heroId)) return FACE.get(heroId);
  const face = { ex: 0.01, ey: -0.77, top: -1.03 };
  if (typeof document !== 'undefined') {
    const S = 4, cv = document.createElement('canvas');
    cv.width = 60 * S; cv.height = 50 * S;
    const c = cv.getContext('2d');
    if (c && c.getImageData) {
      c.setTransform(S, 0, 0, S, 0, 0);
      drawToon(c, heroId, { kind: 'stand', time: 0, grounded: true, facing: 1 }, 30, 40, U);
      const d = c.getImageData(0, 0, cv.width, cv.height).data;
      let sx = 0, sy = 0, n = 0, top = Infinity;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const k = (y * cv.width + x) * 4;
        if (d[k + 3] > 128 && y < top) top = y;
        if (d[k + 3] > 200 && d[k] > 235 && d[k + 1] > 235 && d[k + 2] > 235 && y < (40 - 0.5 * U) * S) { sx += x; sy += y; n++; }
      }
      if (Number.isFinite(top)) face.top = (top / S - 40) / U;
      if (n) { face.ex = (sx / n / S - 30) / U; face.ey = (sy / n / S - 40) / U; }
    }
  }
  FACE.set(heroId, face);
  return face;
}

// ======================================================================== FIRE
// A — HOT-FOOT HOP. Two quick hops clutching his backside, a little flame on the seat that
// puffs out at the top of the second hop, smoke trailing off the seat behind him.
const FIRE_A_HOPS = [[0, 0.24, 12], [0.24, 0.46, 9], [0.46, 0.66, 7], [0.66, 0.84, 4]];
function fireSeat(cx, fy, w, hops) { return [cx + SEAT[0] * U, fy + SEAT[1] * U - hopY(w, hops)]; }
function paintHotFoot(c, heroId, cx, fy, w, t, live) {
  const y = fy - hopY(w, FIRE_A_HOPS);
  const air = w < 0.84;
  fireATrail(c, heroId, cx, fy, w, t);
  const L = layer(20, c, bigBox(cx, fy), (o) => {
    drawToon(o, heroId, air ? clutchSeatPose(t, 1) : runPose(t, live), cx, y, U);
    scorch(o, cx, y, 0.55);
  });
  if (w < 0.03) { tint(L, 'rgba(255,214,140,0.85)'); blit(c, L, { glow: EMBER, blur: 5 }); return; }
  blit(c, L);
  // the flame on the seat, until it puffs out
  const [sx, sy] = fireSeat(cx, fy, w, FIRE_A_HOPS);
  if (w < 0.5) {
    const fl = 1 + 0.2 * Math.sin(t * 61) + 0.12 * Math.sin(t * 97);
    const grow = easeOut(clamp01(w / 0.05));
    c.save(); c.translate(sx, sy); c.rotate(-0.5); flame(c, 0, 0, 1.9 * grow, 5 * fl * grow); c.restore();
  } else {
    const q = clamp01((w - 0.5) / 0.16);
    puff(c, sx - 1, sy - 2 - 3 * q, 1.4 + 2 * q, 1 - q);
  }
}
// The seat sooted where the flame was — a smudge on his own trousers, nothing near his face.
function scorch(o, cx, fy, a) {
  o.save(); o.globalCompositeOperation = 'source-atop'; o.globalAlpha = a; o.fillStyle = SOOT;
  o.beginPath(); o.ellipse(cx + (SEAT[0] + 0.04) * U, fy + SEAT[1] * U, 0.13 * U, 0.09 * U, 0, 0, Math.PI * 2); o.fill();
  o.restore();
}
function fireATrail(c, heroId, cx, fy, w) {
  trail(c, (b) => fireSeat(cx, fy, b, FIRE_A_HOPS), w, { from: 0.02, until: 0.58, every: 0.035, life: 0.4 });
}

// B — ROCKET SEAT. One big leap off a jet of flame out of the seat of his trousers,
// pedalling the air with both hands on his backside; a column of smoke left behind him.
const FIRE_B_HOPS = [[0.02, 0.62, 19], [0.62, 0.82, 5]];   // the leap, then a bounce on landing
function paintRocket(c, heroId, cx, fy, w, t, live) {
  const h = hopY(w, FIRE_B_HOPS), y = fy - h;
  const air = w > 0.02 && w < 0.62, bounce = w >= 0.62 && w < 0.82;
  fireBTrail(c, heroId, cx, fy, w, t);
  const [sx, sy] = fireSeat(cx, fy, w, FIRE_B_HOPS);
  // the jet, under him while he climbs, guttering on the way down
  const jet = w < 0.32 ? 1 : 1 - clamp01((w - 0.32) / 0.16);
  if (jet > 0 && w > 0.01) {
    const fl = 1 + 0.22 * Math.sin(t * 70) + 0.12 * Math.sin(t * 113);
    c.save(); c.translate(sx + 0.5, sy + 1); c.rotate(Math.PI - 0.35); flame(c, 0, 0, 2.2 * jet, 8.5 * fl * jet); c.restore();
  }
  const L = layer(20, c, bigBox(cx, fy), (o) => {
    drawToon(o, heroId, air ? pedalPose(t) : bounce ? clutchSeatPose(t, 1) : w < 0.02 ? clutchSeatPose(t, 0) : runPose(t, live), cx, y, U);
    scorch(o, cx, y, 0.6);
  });
  if (w < 0.03) { tint(L, 'rgba(255,214,140,0.85)'); blit(c, L, { glow: EMBER, blur: 5 }); return; }
  blit(c, L);
}
function fireBTrail(c, heroId, cx, fy, w) {
  trail(c, (b) => { const [x, y] = fireSeat(cx, fy, b, FIRE_B_HOPS); return [x, y + 4]; }, w,
    { from: 0.02, until: 0.45, every: 0.025, life: 0.5, r0: 1.4, r1: 3.6, rise: 4, drift: 1, dark: true });
}


// ======================================================================== SPIKES
// A — OUCH HOP. Hopping on one foot, clutching the other, a handful of prickles left
// sticking out of the sole and the shin.
const SPIKE_A_HOPS = [[0.03, 0.18, 6], [0.18, 0.32, 5], [0.32, 0.46, 5], [0.46, 0.6, 5], [0.6, 0.74, 4], [0.74, 0.88, 3]];
const SOLE_PRICKLES = [[0.12, -0.27, 2.0], [0.19, -0.28, 1.6], [0.26, -0.29, 1.25], [0.06, -0.4, 2.6], [0.22, -0.43, 0.2]];
// `prickles: false` is the same hop for a blade or a pair of jaws to the foot (BLADES).
function paintOuchHop(c, heroId, cx, fy, w, t, live, { prickles = true } = {}) {
  const h = hopY(w, SPIKE_A_HOPS), y = fy - h;
  const hopping = w < 0.88;
  const lean = hopping ? 0.08 * Math.sin(w * 26) : 0;
  const L = layer(20, c, bigBox(cx, fy), (o) => {
    o.save(); o.translate(cx, y); o.rotate(lean); o.translate(-cx, -y);
    drawToon(o, heroId, hopping ? clutchFootPose(t) : runPose(t, live), cx, y, U);
    o.restore();
  });
  if (w < 0.03) { flashWhite(c, L); return; }
  blit(c, L);
  if (!hopping) return;
  if (prickles) {
    c.save(); c.translate(cx, y); c.rotate(lean);
    for (const [px, py, ang] of SOLE_PRICKLES) prickle(c, px * U, py * U, ang);
    c.restore();
  }
  // "ouch" lines off the foot for the first hop
  lines(c, cx + 0.2 * U, y - 0.3 * U, 3, 6, [-0.3, 0.3, 0.9], 1 - clamp01((w - 0.03) / 0.15));
}


// ======================================================================== ROLLERS
// A — PANCAKE. Flattened under it for a beat, then pops back up with a squash-and-stretch.
// Flat until the pop, then the pop (0.06s) and the wobble (0.14s) as before.
const PANCAKE_POP = HIT_LONG_T - 0.2;
function pancakeScale(w) {
  if (w < 0.04) { const q = easeOut(w / 0.04); return [lerp(1, 1.55, q), lerp(1, 0.24, q)]; }
  if (w < PANCAKE_POP) { const k = 0.03 * Math.sin((w - 0.04) * 40) * Math.max(0, 1 - (w - 0.04) / 0.3); return [1.55 + k, 0.24 - k * 0.3]; }
  if (w < PANCAKE_POP + 0.06) { const q = easeOut((w - PANCAKE_POP) / 0.06); return [lerp(1.55, 0.78, q), lerp(0.24, 1.32, q)]; }
  const q = clamp01((w - PANCAKE_POP - 0.06) / 0.14), d = Math.exp(-q * 4) * Math.cos(q * Math.PI * 3);
  return [1 - 0.22 * d, 1 + 0.32 * d];
}
function squashed(c, heroId, cx, fy, t, sx, sy, pose, after) {
  return layer(20, c, bigBox(cx, fy), (o) => {
    o.save(); o.translate(cx, fy); o.scale(sx, sy); o.translate(-cx, -fy);
    drawToon(o, heroId, pose, cx, fy, U);
    after?.(o);
    o.restore();
  });
}
// Flattened mid-stride, side-on as he was running: the stride with the legs furthest
// apart, so the squashed figure still reads as a runner seen from the side.
const STRIDE = Object.freeze({ kind: 'run', phase: 0, time: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true });
function paintPancake(c, heroId, cx, fy, w, t, live) {
  const [sx, sy] = pancakeScale(w);
  const L = squashed(c, heroId, cx, fy, t, sx, sy, w < PANCAKE_POP + 0.06 ? STRIDE : runPose(t, live));
  if (w < 0.03) { flashWhite(c, L); return; }
  blit(c, L);
  // a puff from each side as he goes flat, lines as he pops
  if (w < 0.25) { const q = clamp01((w - 0.03) / 0.22); puff(c, cx - 0.55 * U - 4 * q, fy - 1.5 - 2 * q, 1.2 + 1.5 * q, 1 - q); puff(c, cx + 0.55 * U + 4 * q, fy - 1.5 - 2 * q, 1.2 + 1.5 * q, 1 - q); }
  if (w > PANCAKE_POP && w < PANCAKE_POP + 0.14) lines(c, cx, fy - 0.6 * U, 0.55 * U, 0.75 * U, [-Math.PI * 0.85, -Math.PI * 0.65, -Math.PI * 0.35, -Math.PI * 0.15], 1 - (w - PANCAKE_POP) / 0.14);
}


// ======================================================================== ICE
// A — ICE BLOCK. Frozen mid-leap inside a chunk of ice, blue all over, for most of it —
// then it cracks, shatters off him in chips and he runs on. Peter: "the icecube could look
// like a real icecube... its too square and perfect" — so a lumpy, chipped chunk, wider at
// the base, clear in the middle and bluer at the edges, a fracture or two, trapped bubbles,
// a frosty rim along the top, and the frost ink at the outline dial's weight. Flat and
// front-on like every prop; the hero in it side-on.
// Frozen until the shatter; the chips fly for SHARDS_T, ending as the picture does.
const SHARDS_T = 0.38;
const SHATTER = HIT_LONG_T - SHARDS_T;
const FROST_INK = '#26344d';      // frostProps.js INK, the frost cabinet's slate ink
const ICE_LINE = 0.55 * OUTLINE_SCALE;
// The chunk's outline in U from his feet, clockwise from the bottom left: wider at the
// base, the corners chipped, the sides a little lumpy. Fixed, so it never wobbles. Its
// base is SUNK about 3u below his feet (Peter: "better if the bottom was below the
// ground... since the surface may not be flat"), and the bottom edge is never drawn — no
// ruled line resting on the road, nothing floating over a slope.
const SINK = 0.13;
const CHUNK = [
  [-0.57, SINK], [-0.58, -0.22], [-0.53, -0.4], [-0.55, -0.62], [-0.5, -0.84], [-0.52, -0.98],
  [-0.44, -1.07], [-0.3, -1.12], [-0.12, -1.1], [0.02, -1.14], [0.2, -1.11], [0.36, -1.13],
  [0.45, -1.04], [0.5, -0.92], [0.47, -0.74], [0.52, -0.55], [0.5, -0.36], [0.55, -0.18], [0.59, SINK],
];
// Its top run (for the frosty rim): CHUNK indices 5..13.
const RIM = [5, 13];
// BIGGER ICE FOR BIGGER HEROES (Peter, of Grumpos's head out of the top). The chunk is
// drawn for a hero of Lorenzo's size and stretched to each hero's own frozen silhouette
// — the top of his head with its hair, hat or helmet, the widest reach of his arms or
// weapon — measured once off a scratch render of the frozen pose and cached, plus a
// margin. `sx`/`sy` scale the chunk's width and height; `ox` centres it on him (U).
const ICE_FIT = new Map();
const CHUNK_HALF = 0.5, CHUNK_TOP = 1.08;   // the chunk's own inner half-width and height, U
const FIT_MARGIN_X = 0.08, FIT_MARGIN_TOP = 0.1;
const FROZEN_LIFT = 2;                      // world units he is held up off the floor of it
export function iceFitOf(heroId) {
  if (ICE_FIT.has(heroId)) return ICE_FIT.get(heroId);
  const fit = { sx: 1, sy: 1, ox: 0 };
  if (typeof document !== 'undefined') {
    const S = 4, X = 40, Y = 60, cv = document.createElement('canvas');
    cv.width = 80 * S; cv.height = 70 * S;
    const c = cv.getContext('2d');
    if (c && c.getImageData) {
      c.setTransform(S, 0, 0, S, 0, 0);
      drawToon(c, heroId, FROZEN, X, Y - FROZEN_LIFT, U);
      const d = c.getImageData(0, 0, cv.width, cv.height)?.data;
      let top = Infinity, left = Infinity, right = -Infinity;
      if (d) for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3] < 60) continue;
        if (y < top) top = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
      if (Number.isFinite(top)) {
        const l = (left / S - X) / U, r = (right / S - X) / U, h = (Y - top / S) / U;
        fit.ox = (l + r) / 2;
        fit.sx = Math.max(0.85, ((r - l) / 2 + FIT_MARGIN_X) / CHUNK_HALF);
        fit.sy = Math.max(0.85, (h + FIT_MARGIN_TOP) / CHUNK_TOP);
      }
    }
  }
  ICE_FIT.set(heroId, fit);
  return fit;
}
// The chunk's point (x, y in U from his feet) for this hero at this much growth.
const chunkAt = (cx, fy, grow, f, x, y) => [cx + (f.ox + x * f.sx) * U, fy + (y < 0 ? y * f.sy * grow : y) * U];
// `open` leaves the buried bottom edge out: the sides and top only.
function chunkPath(c, cx, fy, grow, open = false, f = { sx: 1, sy: 1, ox: 0 }) {
  c.beginPath();
  CHUNK.forEach(([x, y], i) => {
    const [px, py] = chunkAt(cx, fy, grow, f, x, y);   // grows up out of the ground
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  });
  if (!open) c.closePath();
}
function paintIceBlock(c, heroId, cx, fy, w, t, live) {
  const frozen = w < SHATTER;
  const L = layer(20, c, bigBox(cx, fy), (o) => drawToon(o, heroId, frozen ? FROZEN : runPose(t, live), cx, frozen ? fy - FROZEN_LIFT : fy, U));   // held up off the floor of it, so his trailing boot stays inside
  if (w < 0.03) { tint(L, '#eafaff'); blit(c, L, { glow: '#bfeaff', blur: 6 }); return; }
  if (frozen) iceTint(L, 0.85);
  else iceTint(L, 0.85 * (1 - clamp01((w - SHATTER) / 0.1)));
  blit(c, L);
  if (frozen) iceChunk(c, cx, fy, w, easeOut(clamp01((w - 0.03) / 0.05)), iceFitOf(heroId));
  else iceShards(c, heroId, cx, fy, w, t);
}
// Frozen mid-leap, side-on, startled: the airborne stride (no stretch at vy 0).
const FROZEN = Object.freeze({ kind: 'jump', grounded: false, vy: 0, time: 0, facing: 1, faceSurprised: true, browRaise: true });
function iceChunk(c, cx, fy, w, grow, f) {
  const P2 = (x, y) => chunkAt(cx, fy, grow, f, x, y);
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  // the body of it: a thin clear fill, denser and bluer toward the edges (wide strokes
  // of the outline, clipped inside it, so only their inner halves show)
  chunkPath(c, cx, fy, grow, false, f);
  c.fillStyle = 'rgba(214,242,255,0.18)'; c.fill();
  c.save();
  chunkPath(c, cx, fy, grow, false, f); c.clip();
  for (const [lw, col] of [[7, 'rgba(150,206,240,0.22)'], [3.6, 'rgba(120,190,236,0.3)'], [1.6, 'rgba(198,236,255,0.55)']]) {
    chunkPath(c, cx, fy, grow, true, f); c.strokeStyle = col; c.lineWidth = lw; c.stroke();
  }
  if (grow >= 1) {
    // fracture lines inside it: a dark hairline with a bright edge beside it
    for (const pts of [[[-0.42, -0.2], [-0.3, -0.33], [-0.34, -0.45], [-0.18, -0.6]], [[0.4, -0.95], [0.28, -0.84], [0.33, -0.7]]]) {
      for (const [col, lw, dx] of [['rgba(38,52,77,0.35)', 0.35, 0], ['rgba(255,255,255,0.75)', 0.3, 0.35]]) {
        c.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P2(x, y); if (i) c.lineTo(px + dx, py); else c.moveTo(px + dx, py); });
        c.strokeStyle = col; c.lineWidth = lw; c.stroke();
      }
    }
    // trapped bubbles
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.3;
    for (const [x, y, r] of [[-0.36, -0.72, 0.6], [-0.3, -0.66, 0.4], [0.36, -0.3, 0.55], [0.3, -0.2, 0.35], [0.12, -0.98, 0.4]]) {
      const [px, py] = P2(x, y); c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.stroke();
    }
    // highlight streaks, running along the facets of the left side and the top
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 0.8;
    for (const pts of [[[-0.44, -0.3], [-0.41, -0.6], [-0.43, -0.8]], [[-0.36, -1.0], [-0.22, -1.03]], [[0.38, -0.5], [0.41, -0.62]]]) {
      c.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P2(x, y); if (i) c.lineTo(px, py); else c.moveTo(px, py); }); c.stroke();
    }
  }
  c.restore();
  // a frosty white rim along the top
  c.beginPath();
  for (let i = RIM[0]; i <= RIM[1]; i++) { const [px, py] = P2(...CHUNK[i]); if (i === RIM[0]) c.moveTo(px, py + 0.4); else c.lineTo(px, py + 0.4); }
  c.strokeStyle = 'rgba(250,254,255,0.95)'; c.lineWidth = 1.5; c.stroke();
  // the outline: frost ink at the outline dial's weight, sides and top only
  chunkPath(c, cx, fy, grow, true, f);
  c.strokeStyle = FROST_INK; c.lineWidth = ICE_LINE; c.stroke();
  // a crack spreading down from the top just before it goes
  const cr = clamp01((w - (SHATTER - 0.1)) / 0.1);
  if (grow >= 1 && cr > 0) {
    const pts = [[0.08, -1.12], [0.02, -0.9], [0.12, -0.72], [0.04, -0.5], [0.1, -0.3]];
    const n = 1 + cr * (pts.length - 1);
    c.beginPath();
    for (let i = 0; i < Math.ceil(n); i++) {
      const q = Math.min(1, n - i), [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i];
      const [px, py] = P2(lerp(x0, x1, i ? q : 1), lerp(y0, y1, i ? q : 1));
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.strokeStyle = FROST_INK; c.lineWidth = ICE_LINE; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.35; c.stroke();
  }
  c.restore();
}
// The chunk in pieces: irregular chips of it flying off him, left behind by the scroll.
function iceShards(c, heroId, cx, fy, w) {
  const e = w - SHATTER;
  if (e < 0 || e > SHARDS_T) return;
  const f = iceFitOf(heroId);
  c.save();
  c.lineJoin = 'round';
  for (let i = 0; i < 14; i++) {
    const ox = cx + (f.ox + (hash(i * 1.9) - 0.5) * 1.0 * f.sx) * U, oy = fy + (SINK - hash(i * 3.3) * (1.1 * f.sy + SINK)) * U;
    const dir = Math.atan2(oy - (fy - 0.55 * U), ox - cx);
    const v = 40 + 50 * hash(i * 5.1);
    const x = ox + Math.cos(dir) * v * e - SCROLL * 0.6 * e, y = oy + (Math.sin(dir) * v - 20) * e + 160 * e * e;
    if (y > fy + SINK * U) continue;
    const r = 1.4 + 1.8 * hash(i * 7.7), rot = hash(i) * 6 + e * 12 * (hash(i * 2) - 0.5);
    const n = 4 + (i % 2);
    c.globalAlpha = 1 - clamp01((e - (SHARDS_T - 0.16)) / 0.16);
    c.beginPath();
    for (let k = 0; k < n; k++) {
      const a = rot + k * Math.PI * 2 / n + (hash(i * 3 + k) - 0.5) * 0.9, rr = r * (0.55 + 0.6 * hash(i * 5 + k));
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = 'rgba(206,238,255,0.85)'; c.fill();
    c.strokeStyle = FROST_INK; c.lineWidth = ICE_LINE * 0.8; c.stroke();
  }
  c.restore();
}


// ======================================================================== GENERIC
// Peter: "the little ring of stars with a flash" — and then "can we combine birds and
// stars? i think that is a cartoon staple". He goes white for a couple of frames (the
// picture: the blink waits for it), then blinks as he does today with stars and little
// birds going round his head together through it, fading about a second after the hit.
export const GEN_FLASH = 0.06;
export const GEN_RING_LIFE = 1.05;
function paintFlash(c, heroId, cx, fy, w, t, live) {
  const L = layer(20, c, bigBox(cx, fy), (o) => drawToon(o, heroId, runPose(t, live), cx, fy, U));
  flashWhite(c, L);
}
// n things on one flat ring over his head, the far side first and the near side over
// him; paintOne(c, x, y, front, i, t).
function ringAround(c, heroId, cx, fy, w, t, n, paintOne) {
  const face = faceOf(heroId);
  const a = clamp01((w - GEN_FLASH) / 0.05) * (1 - clamp01((w - 0.9) / 0.15));
  if (a <= 0) return;
  const x = cx + face.ex * U, y = fy + (face.top - 0.02) * U;
  c.save(); c.globalAlpha *= a;
  for (const front of [false, true]) {
    for (let i = 0; i < n; i++) {
      const ang = t * 8 + i * Math.PI * 2 / n;
      if ((Math.sin(ang) > 0) !== front) continue;
      paintOne(c, x + Math.cos(ang) * 0.3 * U, y + Math.sin(ang) * 0.08 * U, front, i, t);
    }
  }
  c.restore();
}
// A little yellow bird, side-on, beak forward, wings flapping.
function bird(c, x, y, front, i, t) {
  const s = front ? 1 : 0.8, flap = Math.sin(t * 40 + i * 2) > 0;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#ffd94a'; c.strokeStyle = INK; c.lineWidth = 0.4;
  c.beginPath(); c.ellipse(0, 0, 1.9, 1.4, 0, 0, Math.PI * 2); c.fill(); c.stroke();          // body
  c.beginPath(); c.arc(1.6, -1.1, 1.05, 0, Math.PI * 2); c.fill(); c.stroke();              // head
  c.fillStyle = EMBER; c.beginPath(); c.moveTo(2.5, -1.3); c.lineTo(3.6, -0.9); c.lineTo(2.5, -0.6); c.closePath(); c.fill(); // beak
  c.fillStyle = INK; c.beginPath(); c.arc(1.85, -1.35, 0.28, 0, Math.PI * 2); c.fill();     // eye
  c.fillStyle = '#ffe98a';
  c.beginPath(); c.moveTo(-0.6, -0.3); c.lineTo(0.6, -0.3); c.lineTo(-0.4, flap ? -2.6 : 1.4); c.closePath(); c.fill(); c.stroke(); // wing
  c.restore();
}
// Three stars and two birds, alternating round the one ring.
function starsAndBirdies(c, heroId, cx, fy, w, t) {
  if (w > GEN_RING_LIFE) return;
  ringAround(c, heroId, cx, fy, w, t, 5, (c2, x, y, front, i) => {
    if (i % 2) bird(c2, x, y, front, i, t);
    else star(c2, x, y, front ? 2.3 : 1.8, t * 6 + i);
  });
}

// ======================================================================== BEES
// THE BEE SWARM FOLLOWS HIM (Peter, 16 Oct 2026: "when the hero hits bees, could some bees
// follow him for a while?" — then, of the lab's bee-follow-bakeoff, "I like the cloud …
// keep them the same size as the swarm and then they can trail off while the stars/birds
// keep going for their normal length"). The generic hit's flash and its stars and birdies
// run exactly as they do for any other hit; over them twelve of the swarm's own bees loop
// round his whole body, dragging behind him with a faint buzz line, and peel off backwards
// one after another. A picture only.
export const BEE_LIFE = 3.6;
const BEE_SIZE = 0.85;          // the swarm's own bee: 1.15 on a 22px canvas shown 12 x 1.35 world px wide
const BEE_TRAIL = 'rgba(42,26,22,0.5)';
// [x radius, y radius, loop speed] in U / U / rad per s; the sign is the direction round.
const BEE_CLOUD = [[0.62, 0.7, 7.0], [0.78, 0.55, -8.2], [0.55, 0.85, 9.0], [0.9, 0.6, -6.1], [0.7, 0.8, 7.6], [0.84, 0.7, -9.4],
  [0.5, 0.62, -7.7], [0.95, 0.78, 6.6], [0.68, 0.5, 8.6], [0.8, 0.9, -7.2], [0.58, 0.74, -9.8], [0.88, 0.52, 6.0]];
function beeCloud(c, heroId, cx, fy, w, t) {
  if (w > BEE_LIFE) return;
  const fade = clamp01((w - GEN_FLASH) / 0.12);
  const bx = cx - 0.2 * U + 0.1 * U * Math.sin(t * 2), by = fy - 0.52 * U;
  for (const front of [false, true]) {
    BEE_CLOUD.forEach(([rx, ry, sp], i) => {
      const ang = t * sp + i * 1.9, dir = Math.sign(sp);
      if ((Math.sin(ang) > 0) !== front) return;
      // Its turn to go: up and off behind him, left by the scroll, fading over 0.45s.
      const at = 1.0 + i * 0.19, q = clamp01((w - at) / 0.45);
      const dx = -SCROLL * 0.7 * q * q - 30 * q, dy = -34 * q - 10 * q * q, a = (1 - q) * fade;
      if (a <= 0) return;
      const at2 = (k) => [bx + Math.cos(ang - 0.16 * k * dir) * rx * U + dx, by + Math.sin(ang - 0.16 * k * dir) * ry * U * 0.85 + dy];
      if (w < at) {
        c.save(); c.globalAlpha *= 0.6 * fade;
        c.beginPath();
        for (let k = 0; k <= 4; k++) { const [px, py] = at2(k); if (k) c.lineTo(px, py); else c.moveTo(px, py); }
        c.strokeStyle = BEE_TRAIL; c.lineWidth = 0.35; c.stroke();
        c.restore();
      }
      const [x, y] = at2(0);
      c.save(); c.globalAlpha *= a;
      c.translate(x, y); c.scale(front ? 1 : 0.8, front ? 1 : 0.8);
      bee(c, 0, 0, -Math.sin(ang) * dir * dir >= 0 ? -1 : 1, BEE_SIZE, Math.floor(t * 34 + i * 3) % 2 === 0);
      c.restore();
    });
  }
}
// The stars and birdies for their normal length, the cloud over the top for its own.
function starsBirdiesAndBees(c, heroId, cx, fy, w, t) {
  starsAndBirdies(c, heroId, cx, fy, w, t);
  beeCloud(c, heroId, cx, fy, w, t);
}

// ---------------------------------------------------------------- by what hit you
// The family of every obstacle that has one; anything else that reaches the ordinary
// hit is GENERIC. The live wire (zap), dynamite (blast), the banana peel (pratfall) and
// pits are not asked — run.js takeHit keeps them out.
const FAMILY_MEMBERS = {
  fire: ['fireBarrel', 'campfire', 'smudgePot', 'brazier', 'binFire', 'ashUrnFire', 'confidentialBin', 'eternalFlame'],
  // Things with individual needles or prickles, and only those.
  spikes: ['popSpikes', 'cactus', 'cactusBig', 'thistle', 'thistleBig', 'crampons', 'caltrops', 'drawingPins',
    'graveRoses', 'pricklyPear', 'barrelCactus', 'spikeStrip'],
  // A blade or jaws to the foot: the spikes' hop, nothing left stuck in him.
  blades: ['floorSaw', 'bearTrap'],
  rollers: ['barrel', 'giantSnowball', 'mailCart', 'drinksTrolley', 'mopBucket', 'chair'],
  ice: ['iceCrystals', 'snowman', 'snowmanBig', 'iceBlocks', 'icicle'],
  // The Field Service bee swarm, at either height.
  bees: ['beeSwarm', 'beeSwarmHigh'],
};
export const HIT_FAMILY_OF = Object.freeze(Object.fromEntries(
  Object.entries(FAMILY_MEMBERS).flatMap(([family, types]) => types.map((type) => [type, family]))));

// Each family's pictures. `T`: how long the picture replaces him (the blink waits that
// long); `life`: how long after the hit its `after` runs on over the blink. Painters are
// (c, heroId, cx, feetY, w, t, live) — w seconds since the hit, t a running clock, `live`
// the run's own pose for the frame (what the picture hands back to).
const ouchBare = (c, h, x, y, w, t, live) => paintOuchHop(c, h, x, y, w, t, live, { prickles: false });
export const HIT_PICTURES = Object.freeze({
  fire: [
    { id: 'hotfoot', T: HIT_LONG_T, life: HIT_LONG_T, paint: paintHotFoot, after: fireATrail },
    { id: 'rocket', T: HIT_LONG_T, life: HIT_LONG_T, paint: paintRocket, after: fireBTrail },
  ],
  spikes: [{ id: 'ouch', T: HIT_LONG_T, life: HIT_LONG_T, paint: paintOuchHop }],
  blades: [{ id: 'ouchBare', T: HIT_LONG_T, life: HIT_LONG_T, paint: ouchBare }],
  rollers: [{ id: 'pancake', T: HIT_LONG_T, life: HIT_LONG_T, paint: paintPancake }],
  ice: [{ id: 'block', T: HIT_LONG_T, life: HIT_LONG_T, paint: paintIceBlock, after: iceShards }],
  bees: [{ id: 'beeCloud', T: GEN_FLASH, life: BEE_LIFE, paint: paintFlash, after: starsBirdiesAndBees }],
  generic: [{ id: 'starsAndBirdies', T: GEN_FLASH, life: GEN_RING_LIFE, paint: paintFlash, after: starsAndBirdies }],
});

export function hitFamilyOf(type) { return type ? (HIT_FAMILY_OF[type] || 'generic') : null; }
// Pick the picture for a hit by `type`. A family with more than one picks at random but
// never the one it showed last time (`prev`: family → variant), as the zap's X-ray never
// plays twice running. `rand` is only asked when there is a choice to make.
export function pickHitPicture(type, prev, rand) {
  const family = hitFamilyOf(type);
  if (!family) return null;
  const list = HIT_PICTURES[family];
  if (list.length < 2) return { family, variant: 0 };
  const last = prev ? prev[family] : undefined;
  const pool = list.map((_, i) => i).filter((i) => i !== last);
  return { family, variant: pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))] };
}
export function hitPictureOf(pic) {
  const list = pic && HIT_PICTURES[pic.family];
  return list ? list[pic.variant] || list[0] : null;
}
// How long, from the hit, the whole thing runs (picture and after).
export function hitPicLife(pic) { const e = hitPictureOf(pic); return e ? Math.max(e.T, e.life) : 0; }
// JUMPING BREAKS THE ICE (Peter, 16 Oct 2026: "if we jump in ice, make it shatter
// immediately"): a jump while he is frozen skips the clock to the shatter, so the chips fly
// off him as he leaves the ground. Any other picture plays on. Returns the new countdown.
export function hitPicOnJump(pic, hitPicT) {
  if (!pic || pic.family !== 'ice') return hitPicT;
  return Math.min(hitPicT, hitPicLife(pic) - SHATTER);
}
// True while the picture itself is up — the i-frame blink waits for it.
export function hitPicShowing(pic, w) { const e = hitPictureOf(pic); return !!e && w >= 0 && w < e.T; }
// A context with no transform to read (a test stub) or no DOM gets the plain toon and no
// dressing, as the zap does.
const canLayer = (c) => typeof document !== 'undefined' && !!c.getTransform?.();
export function drawHitPicture(c, pic, heroId, cx, fy, w, t, live = null) {
  const e = hitPictureOf(pic);
  if (!e || w < 0 || w >= e.T) return;
  if (canLayer(c)) e.paint(c, heroId, cx, fy, w, t, live);
  else drawToon(c, heroId, runPose(t, live), cx, fy, U);
}
export function drawHitAfter(c, pic, heroId, cx, fy, w, t) {
  const e = hitPictureOf(pic);
  if (e?.after && w >= e.T && w < e.life && canLayer(c)) e.after(c, heroId, cx, fy, w, t);
}

// The painters and pieces the lab's bake-off reuses for the candidates that did not ship.
export const HIT_KIT = Object.freeze({
  U, INK, SOOT, SCROLL, hash, clamp01, lerp, easeOut, runPose, ouch, standPose, boardPose, bigBox,
  scratchFor, iceTint, flashWhite, puff, star, flame, prickle, lines, hopY, trail, squashed,
  ringAround, bird, faceOf,
  paintHotFoot, fireATrail, paintRocket, fireBTrail, paintOuchHop, paintPancake, paintIceBlock, iceShards,
  paintFlash, starsAndBirdies, beeCloud,
});
