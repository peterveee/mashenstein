// SPEED ZONE — the coyote on the near summits, EXPRESSIONS bake-off (24 Sep 2026).
// Peter: "we seem to have the coyote at the end of most of the speed zone levels,
// perhaps in one he could face the camera and wink? can we do a bake off of the
// coyote having different expressions rather than just howling?"
//
// Gallery-only. Nothing here is registered as scenery; the run is untouched.
//
// THE SHIPPED PAINTER is drawDesertCoyote(ctx, t, x, seat, facing) in
// stylePacks/desertLandmarks.js: a coyote sitting on a sandstone ledge on the NEAR
// dunes, howling every 5 s. It is exported, and card A calls it (through the real
// pack.bg, untouched).
//
// HOW A CANDIDATE GETS INTO THE REAL SCENE. The pack imports the coyote painter
// directly, so it cannot be swapped by reference. Instead drawCoyoteBackdrop runs the
// REAL pack.bg with a hook on the context: the coyote's first fill is its ledge, in the
// hazed near-rock body colour nothing else in the pack uses. At that fill the hook
// notes the save depth and the transform (translate(x, crest) inside the painter's own
// clipSky), silences everything the shipped painter draws until that save is
// restored, and — when the painter reaches its scale(±1.5, 1.5), which carries the
// hashed FACING — paints the candidate in the same frame, under the same clip. So
// placement, seat, facing, clip and depth order are the pack's own.
//
// THE CANDIDATE PAINTER copies the shipped coyote's construction line for line
// (ledge, tail, haunch, torso, cream chest, legs, head, ears, muzzle, song rings;
// COYOTE palette with the same 4% haze; the same 1.5 scale), and generalises it into
// a posable figure: a lie-down morph, a hind leg, a head that can swivel from profile
// through a FRONT face to over-the-shoulder, and eye/mouth states. Each candidate is
// a PERFORMANCE — a function of a clock u (seconds) returning a pose — that ends in
// the rest pose. It runs two ways:
//   - looped on the wall clock t (u = t mod loop), which is how the gallery shows it;
//   - LATCHED, like the speed-trap camera: `since` = seconds since the coyote came
//     into view, so the gag is guaranteed to play while it is on screen. The pass
//     tiles derive `since` from the coyote's screen x (no state), which is what a
//     run would do.
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { resolveSceneryLayout } from '../engine/scenery-layout.js';
import { resolveCompositionProfile } from '../engine/composition-profile.js';
import { frameForViewport, PORTRAIT_BACKGROUND_ZOOM } from '../engine/frame.js';
import { portraitHudLayout } from '../game/portrait-layout.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { drawDesertCoyote } from '../engine/stylePacks/desertLandmarks.js';

// SETTLED 24 Sep 2026 (Peter): the YAWN, the CHORUS (no head turns) and the WINK —
// from a coyote already sat facing the camera, never turning ("it looks odd, nothing
// else does this") — SHIP, as drawDesertCoyote's `mode`. Their cards below now call
// the shipped painter (`ships`); the scratch, the sniff-and-track and the double-take
// were not picked and keep their sketch painters here (all three turn the head).
// A shipped painter drawn in the ledge frame: seated at 0, and no clip of its own
// beyond the scene's (its clipSky dips to the seat only at the one sample x = 0, a
// wedge far under a pixel wide).
const FLAT_SEAT = { near: (xx) => (xx === 0 ? 0 : 1e4) };

const TAU = Math.PI * 2;
// ------------------------------------------------------------------ shipped constants
// (desertLandmarks.js; copied because they are module-private there)
const SKY_TOP = '#f08048';
const SKY_LOW = '#f8c060';
const ROCK = '#a97558';
const NEAR_ROCK = '#b8845e';
const NEAR_ROCK_LIT = '#d9aa76';
const NEAR_ROCK_DARK = '#654e4a';
const COYOTE = {
  fur: '#9e8568', furLit: '#e4c193', furDark: '#6b5847', cream: '#ead8b8', tip: '#3a302a',
  ear: '#c48a6a', nose: '#241c18', eye: '#241c18',
};
const MOUTH = '#5a2a24';
const TONGUE = '#c86a6a';
const SONG = '#fff4dc';
const SPARK = '#fffbea';
const NEAR_F = 0.35;                 // DESERT_RIDGE.factor
export const COYOTE_RUN_SPEED = 180; // world px/s: BASE_SPEED 160 x SPEED ZONE's 1.125
const NEAR_SPEED = () => COYOTE_RUN_SPEED * NEAR_F * ZOOM;   // backdrop px/s the ledge scrolls

// ------------------------------------------------------------------ maths & colour
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, v) => { const k = clamp01((v - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
const fract = (v) => v - Math.floor(v);
const hash = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);
function rgbOf(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a, b, k) {
  const A = rgbOf(a), B = rgbOf(b);
  return toHex([lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)]);
}
function rgba(hex, a) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
const skyAt = (y) => mix(SKY_TOP, SKY_LOW, clamp01(y / GROUND_Y));
function haze(pal, y, k) {
  const sky = skyAt(y);
  const out = {};
  for (const [key, value] of Object.entries(pal)) out[key] = mix(value, sky, k);
  return out;
}
const PAL = haze(COYOTE, 160, 0.04);
const ROCKP = haze({ body: NEAR_ROCK, lit: NEAR_ROCK_LIT, dark: NEAR_ROCK_DARK, band: ROCK }, 170, 0.04);
// The pup in the chorus: a shade lighter and sandier.
const PUP_PAL = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, k === 'nose' || k === 'eye' || k === 'tip' ? v : mix(v, '#f0d2a4', 0.14)]));

// ------------------------------------------------------------------ drawing kit
function fillPath(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function strokePath(ctx, color, width, path, cap = 'round') {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.stroke();
}
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.moveTo(x + k, y); c.arcTo(x + w, y, x + w, y + h, k); c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k); c.arcTo(x, y, x + w, y, k); c.closePath();
}
const circle = (x, y, r) => (c) => c.arc(x, y, Math.max(0.01, r), 0, TAU);
const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
const box = (x, y, w, h, r = 0) => (c) => (r > 0 ? rr(c, x, y, w, h, r) : c.rect(x, y, w, h));
function poly(pts) {
  return (c) => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
}
function clipSky(ctx, x0, x1, crests) {
  ctx.beginPath();
  ctx.moveTo(x0, -60);
  ctx.lineTo(x1, -60);
  for (let x = x1; x >= x0 - 2; x -= 2) {
    let y = Infinity;
    for (const f of crests) y = Math.min(y, f(x));
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.clip();
}
const lerpPts = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// ------------------------------------------------------------------ the ledge (shipped)
const LEDGE = [-26, 14, -24, -3, -19, -9, -8, -12.4, 9, -12.2, 17, -9.6, 22, -4, 25, 14];
function drawLedge(ctx) {
  const rock = ROCKP;
  fillPath(ctx, rock.body, poly(LEDGE));
  ctx.save();
  ctx.beginPath(); poly(LEDGE)(ctx); ctx.clip();
  fillPath(ctx, rock.lit, poly([-19, -9, -8, -12.4, 9, -12.2, 17, -9.6, 16, -8.4, 8, -10.8, -8, -11, -18, -7.8]));
  for (const [yy, hh] of [[-6.2, 1.4], [-2.2, 1], [1.8, 1.6]]) fillPath(ctx, rgba(rock.band, 0.7), box(-30, yy, 60, hh));
  fillPath(ctx, rgba(rock.dark, 0.75), poly([-26, 14, -24, -3, -19, -9, -16, -8, -20, 0, -21, 14]));
  fillPath(ctx, rgba(rock.dark, 0.5), poly([17, -9.6, 22, -4, 25, 14, 20, 14, 19, -3]));
  ctx.restore();
}
// The ledge's top edge at x (ledge frame), for seating a second animal.
function ledgeTop(x) {
  for (let i = 0; i < LEDGE.length - 2; i += 2) {
    const x0 = LEDGE[i], y0 = LEDGE[i + 1], x1 = LEDGE[i + 2], y1 = LEDGE[i + 3];
    if (x >= x0 && x <= x1 && y0 < 0 && y1 < 0) return lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return -9;
}

// ------------------------------------------------------------------ the posable coyote
// All coordinates below are the shipped painter's coyote space: origin on the ledge top
// under the haunch, muzzle toward +x, 1 unit = 1.5 backdrop px.
const HEAD_SIT = [2.6, -12.6];
const HEAD_LIE = [9.0, -3.2];
function restPose(t) {
  return {
    lie: 0, heave: 0, hop: 0, lean: 0, tw: Math.sin(t * 2.2) * 0.5, hind: 0, hindOsc: 0,
    head: {
      yaw: 1, rot: Math.sin(t * 0.8) * 0.12, jaw: 0, eye: 'open', earBack: 0, prick: 0,
      flick: fract(t * 0.43) < 0.06 ? 0.3 : 0, tongue: 0, lids: 0,
      wink: 0, grin: 0, brow: 0, wide: 0, mouthO: 0, tilt: 0, down: 0,
    },
    rings: 0, ringDir: 0, ringRate: 1.2, ringSize: 1,
    marks: [],
  };
}
// The shipped howl, on its own 5 s clock u (0 = the rest that starts the cycle).
function applyHowl(p, u, t, len = 5) {
  const cyc = clamp01(u / len);
  const up = cyc < 0.5 ? 0 : cyc < 0.58 ? smooth(0.5, 0.58, cyc) : cyc < 0.88 ? 1 : 1 - smooth(0.88, 0.98, cyc);
  const howl = cyc > 0.58 && cyc < 0.88;
  p.head.rot = -up * 0.95 + p.head.rot * (1 - up);
  p.head.jaw = howl ? 0.35 + Math.sin(t * 6) * 0.08 : 0;
  p.head.eye = howl ? 'shut' : 'open';
  p.heave = howl ? Math.sin(t * 9) * 0.25 : 0;
  p.rings = howl ? 1 : up > 0.5 ? 0.4 : 0;
  p.ringDir = -up * 0.95 - 0.1;
  return p;
}

function drawTail(ctx, P, tw) {
  fillPath(ctx, P.fur, (c) => { c.moveTo(-6, -1.6); c.quadraticCurveTo(-8.6, 0.4, -4.6, 0.6); c.quadraticCurveTo(1, 0.9, 5.4 + tw, -0.4); c.quadraticCurveTo(1.4, -1.4, -2.8, -1.8); c.closePath(); });
  fillPath(ctx, P.tip, (c) => { c.moveTo(3.6 + tw * 0.6, 0.6); c.quadraticCurveTo(5.4 + tw, 0.2, 5.4 + tw, -0.4); c.quadraticCurveTo(4.2, -0.9, 3.2, -0.6); c.closePath(); });
}
// Sitting (lie 0, the shipped body exactly) morphing to lying along the ledge (lie 1).
const TORSO_SIT = [-6.4, -4, -5.4, -10, 0.8, -13.2, 4.4, -10.4, 4.6, -5, 2.8, -1, -3, -0.4];
const TORSO_LIE = [-6.6, -3.2, -3, -6.8, 4.4, -6.6, 8.0, -4.8, 8.6, -2.0, 6.6, -0.3, -3, -0.2];
const CHEST_SIT = [4.4, -10.4, 5, -5.6, 3.2, -1.2, 1.8, -1.2, 3.2, -6, 2.4, -10.6];
const CHEST_LIE = [8.0, -4.8, 8.8, -2.4, 6.8, -0.5, 5.4, -0.5, 7.0, -2.6, 6.4, -5.2];
const BACKLIT_SIT = [-5.6, -7.2, -3.6, -11.4, 0.8, -13.2, 1.4, -12.4, -3, -10.6, -5.2, -6.2];
const BACKLIT_LIE = [-6, -5, -2, -7.2, 4.4, -6.6, 4.6, -5.9, -2, -6.4, -5.8, -4.3];
function drawBody(ctx, P, pose) {
  const k = pose.lie, h = pose.heave;
  // Haunch and back.
  fillPath(ctx, P.fur, oval(-3, lerp(-3.6, -2.8, k), lerp(4.6, 4.8, k), lerp(3.8, 3.0, k)));
  fillPath(ctx, P.furDark, (c) => { c.ellipse(-3.6, lerp(-2.6, -2.1, k), 3.6, lerp(2.6, 2.0, k), 0, 0.4 * Math.PI, 1.3 * Math.PI); c.closePath(); });
  const T = lerpPts(TORSO_SIT, TORSO_LIE, k);
  fillPath(ctx, P.fur, (c) => { c.moveTo(T[0], T[1]); c.quadraticCurveTo(T[2], T[3], T[4], T[5]); c.lineTo(T[6] + h, T[7]); c.quadraticCurveTo(T[8] + h, T[9], T[10], T[11]); c.lineTo(T[12], T[13]); c.closePath(); });
  const C = lerpPts(CHEST_SIT, CHEST_LIE, k);
  fillPath(ctx, P.cream, (c) => { c.moveTo(C[0] + h, C[1]); c.quadraticCurveTo(C[2] + h, C[3], C[4], C[5]); c.lineTo(C[6], C[7]); c.quadraticCurveTo(C[8], C[9], C[10], C[11]); c.closePath(); });
  const B = lerpPts(BACKLIT_SIT, BACKLIT_LIE, k);
  fillPath(ctx, P.furLit, (c) => { c.moveTo(B[0], B[1]); c.quadraticCurveTo(B[2], B[3], B[4], B[5]); c.lineTo(B[6], B[7]); c.quadraticCurveTo(B[8], B[9], B[10], B[11]); c.closePath(); });
  // Front legs: straight down sitting, laid forward along the ledge lying.
  for (const lx of [1.6, 3.2]) {
    const tx = lerp(lx, lx + 3.6, k), ty = lerp(-8, -1.9, k);
    const ang = lerp(0, -Math.PI / 2, k), len = lerp(8, 6.6, k);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(ang);
    fillPath(ctx, lx > 2 ? P.fur : P.furDark, box(-0.7, 0, 1.4, len, 0.5));
    ctx.restore();
    fillPath(ctx, P.cream, oval(lerp(lx + 0.2, lx + 10.3, k), lerp(-0.3, -0.55, k), lerp(1, 1.15, k), 0.5));
  }
}
// The near hind leg, up and scratching behind the ear (hind 0..1, osc -1..1).
function drawHindLeg(ctx, P, lift, osc) {
  if (lift <= 0.01) return;
  // Hip in the haunch, the knee thrust out past the chest, the foot drumming behind
  // the ear. Each segment is inked with a dark edge so the leg separates from the body.
  const hip = [-2.2, -4.0];
  const knee = [lerp(-0.4, 5.6, lift), lerp(-1.2, -6.2, lift)];
  const foot = [lerp(0.4, 1.1 + osc * 0.55, lift), lerp(-0.6, -14.7 + osc * 1.5, lift)];
  const seg = (a, b) => (c) => { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); };
  strokePath(ctx, P.furDark, 3.0, seg(hip, knee));
  strokePath(ctx, P.fur, 2.4, seg(hip, knee));
  strokePath(ctx, P.furDark, 1.75, seg(knee, foot));
  strokePath(ctx, P.fur, 1.15, seg(knee, foot));
  const fa = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]);
  fillPath(ctx, P.furDark, oval(foot[0], foot[1], 1.2, 0.8, fa));
  fillPath(ctx, P.cream, oval(foot[0], foot[1], 0.95, 0.6, fa));
}

// Profile head (shipped construction) with eye/ear/jaw states; muzzleK foreshortens
// the muzzle as the head swivels toward the camera.
function drawProfileHead(ctx, P, h, muzzleK) {
  fillPath(ctx, P.fur, oval(0.6, -1.3, 2.6, 2.2, -0.1));
  const back = h.earBack, pr = h.prick;
  for (const [ex, rot0, dark] of [[-0.6, -0.25 - h.flick, true], [0.9, 0.05, false]]) {
    const rot = rot0 - back * 0.95 + pr * (dark ? 0.12 : -0.02);
    const L = 1 - back * 0.25 + pr * 0.28;
    fillPath(ctx, dark ? P.furDark : P.fur, (c) => { c.moveTo(ex - 1.1, -2.6); c.lineTo(ex + Math.sin(rot) * 3.4 * L, -2.6 - Math.cos(rot) * 3.6 * L); c.lineTo(ex + 1.1, -2.8); c.closePath(); });
    if (!dark) fillPath(ctx, P.ear, (c) => { c.moveTo(ex - 0.5, -2.9); c.lineTo(ex + Math.sin(rot) * 2.6 * L, -2.8 - Math.cos(rot) * 2.8 * L); c.lineTo(ex + 0.5, -3); c.closePath(); });
  }
  ctx.save();
  ctx.translate(1.6, 0); ctx.scale(Math.max(0.05, muzzleK), 1); ctx.translate(-1.6, 0);
  const jaw = h.jaw;
  if (jaw > 0.05) {
    const jx = 2.2 + Math.cos(jaw) * 4.1 - Math.sin(jaw) * 0.55, jy = -0.8 + Math.sin(jaw) * 4.1 + Math.cos(jaw) * 0.55;
    fillPath(ctx, MOUTH, poly([2.3, -0.3, 6.8, -0.6, jx, jy]));
  }
  ctx.save();
  ctx.translate(2.2, -0.8);
  ctx.rotate(jaw);
  if (h.tongue > 0.02) {
    // The tongue: curled in a yawn, lolling past the jaw when it is barely open.
    const lol = jaw < 0.3 ? 1 : 0;
    fillPath(ctx, TONGUE, oval(lerp(2.6, 3.8, lol), lerp(-0.25, 0.9, lol), lerp(1.7, 1.2, lol) * h.tongue, lerp(0.45, 0.55, lol), lerp(-0.1, 0.5, lol)));
  }
  fillPath(ctx, P.cream, poly([0, 0.1, 4.3, 0.2, 4.1, 1.0, 0, 1.4]));
  ctx.restore();
  fillPath(ctx, P.fur, poly([1.6, -2.8, 6.9, -1.35, 7.0, -0.25, 2.0, 0.35]));
  fillPath(ctx, P.furLit, poly([1.6, -2.8, 6.9, -1.35, 6.7, -1.0, 1.8, -2.2]));
  fillPath(ctx, P.nose, circle(6.9, -0.95, 0.6));
  ctx.restore();
  // Eye.
  const ex = lerp(1.9, 2.4, 1 - muzzleK) , ey = -1.9;
  switch (h.eye) {
    case 'shut':
      strokePath(ctx, P.eye, 0.35, (c) => { c.moveTo(ex - 0.7, ey - 0.3); c.lineTo(ex + 0.5, ey + 0.1); });
      break;
    case 'squint':
      strokePath(ctx, P.eye, 0.4, (c) => { c.moveTo(ex - 0.7, ey + 0.2); c.quadraticCurveTo(ex, ey - 0.6, ex + 0.7, ey + 0.2); });
      break;
    case 'wide':
      fillPath(ctx, P.cream, circle(ex, ey, 0.8));
      fillPath(ctx, P.eye, circle(ex + 0.15, ey, 0.4));
      fillPath(ctx, '#f6d98a', circle(ex + 0.3, ey - 0.12, 0.13));
      break;
    default:
      fillPath(ctx, P.eye, circle(ex, ey, 0.42));
      fillPath(ctx, '#f6d98a', circle(ex + 0.15, ey - 0.1, 0.14));
      if (h.lids > 0.05) fillPath(ctx, P.fur, (c) => { c.ellipse(ex, ey, 0.6, 0.6, 0, Math.PI, Math.PI + Math.PI * h.lids); c.lineTo(ex, ey); c.closePath(); });
  }
}

// THE FRONT FACE: the head turned square to the camera. Drawn a touch larger (the
// head comes toward the lens) and built from big, flat shapes — cream mask, dark eyes
// in pale sockets, a nose that is the darkest mark — so a wink or a grin survives
// game scale. +x is the eye on the side the coyote faces; that one winks.
const FRONT_S = 1.14;
function drawFrontHead(ctx, P, h) {
  const up = h.prick, back = h.earBack;
  // Ears, tall on the startle.
  for (const s of [-1, 1]) {
    const tipX = s * (3.5 - up * 0.5 + back * 1.8), tipY = -6.4 - up * 1.4 + back * 2.8;
    fillPath(ctx, s < 0 ? P.furDark : P.fur, poly([s * 2.9, -0.8, tipX, tipY, s * 0.7, -2.7]));
    fillPath(ctx, P.ear, poly([s * 2.4, -1.4, lerp(s * 2.4, tipX, 0.72), lerp(-1.4, tipY, 0.72), s * 1.1, -2.6]));
  }
  // Skull, then the jowls flaring out and down into a wedge: the coyote's face.
  fillPath(ctx, P.fur, oval(0, -0.9, 2.8, 2.2));
  for (const s of [-1, 1]) {
    const lift = (s > 0 ? h.wink * 0.35 : 0) + h.grin * 0.25;
    fillPath(ctx, P.fur, poly([s * 1.2, -2.2, s * 3.0, -0.9, s * 3.25, 1.3 - lift, s * 1.0, 3.0]));
    fillPath(ctx, P.furLit, poly([s * 2.3, 0.1 - lift, s * 3.1, 1.2 - lift, s * 1.6, 2.1 - lift * 0.5]));
  }
  fillPath(ctx, P.furLit, oval(0, -2.1, 1.7, 0.75));
  // Muzzle: cream, tapering toward the lens to a narrow chin; the nose on its tip.
  const dn = h.down * 0.6;
  fillPath(ctx, P.cream, (c) => { c.moveTo(-1.45, -0.9 + dn); c.quadraticCurveTo(-1.35, 2.6 + dn, 0, 3.35 + dn); c.quadraticCurveTo(1.35, 2.6 + dn, 1.45, -0.9 + dn); c.closePath(); });
  fillPath(ctx, P.furLit, poly([-0.5, -2.6, 0.5, -2.6, 0.32, 0.6 + dn, -0.32, 0.6 + dn]));
  // Mouth: a grin (dark crescent, a row of teeth) inside the muzzle, or a startled O.
  const g = h.grin;
  if (g > 0.03) {
    const w = 0.75 + g * 0.95, yM = 2.05 + dn, drop = 0.35 + g * 0.8, cu = g * 0.5;
    const outline = (c) => { c.moveTo(-w, yM - cu); c.quadraticCurveTo(0, yM + drop * 1.3, w, yM - cu); c.quadraticCurveTo(0, yM + drop * 0.3, -w, yM - cu); c.closePath(); };
    fillPath(ctx, MOUTH, outline);
    if (g > 0.4) {
      ctx.save();
      ctx.beginPath(); outline(ctx); ctx.clip();
      fillPath(ctx, '#fffaf0', (c) => { c.moveTo(-w, yM - cu); c.quadraticCurveTo(0, yM + drop * 0.3, w, yM - cu); c.lineTo(w, yM - cu + 0.55); c.quadraticCurveTo(0, yM + drop * 0.75, -w, yM - cu + 0.55); c.closePath(); });
      ctx.restore();
    }
  } else if (h.mouthO > 0.05) {
    fillPath(ctx, MOUTH, oval(0, 2.35 + dn, 0.5 * h.mouthO + 0.2, 0.75 * h.mouthO + 0.2));
  } else {
    strokePath(ctx, P.furDark, 0.3, (c) => { c.moveTo(0, 1.9 + dn); c.lineTo(0, 2.35 + dn); c.moveTo(-0.6, 2.5 + dn); c.quadraticCurveTo(0, 2.72 + dn, 0.6, 2.5 + dn); });
  }
  fillPath(ctx, P.nose, oval(0, 1.45 + dn, 0.8, 0.55));
  fillPath(ctx, rgba('#ffffff', 0.35), oval(-0.25, 1.27 + dn, 0.26, 0.13));
  // Eyes: pale sockets, dark eyes, amber catchlight. The wink is the +x eye.
  const eyeY = -1.0 + dn * 0.5;
  for (const s of [-1, 1]) {
    const ex = s * 1.35;
    const wink = s > 0 ? h.wink : 0;
    const wide = h.wide;
    fillPath(ctx, P.cream, oval(ex, eyeY, 0.85 + wide * 0.4, 0.7 + wide * 0.5, s * -0.25));
    if (wink > 0.6) {
      // Shut: a hard happy arc, the cheek pushed up under it.
      strokePath(ctx, P.eye, 0.55, (c) => { c.moveTo(ex - 0.8, eyeY + 0.25); c.quadraticCurveTo(ex, eyeY - 0.75, ex + 0.8, eyeY + 0.25); });
    } else {
      const r = 0.52 + wide * 0.05;
      const pupil = wide > 0.2 ? r * (1 - wide * 0.45) : r;
      fillPath(ctx, P.eye, oval(ex, eyeY + 0.05 + h.down * 0.25, pupil, pupil * 1.12));
      fillPath(ctx, '#f6d98a', circle(ex + 0.18, eyeY - 0.12 + h.down * 0.25, 0.16));
      // The lid coming down: a fur shutter over the top of the socket.
      const lid = Math.max(s > 0 ? wink / 0.6 : 0, h.lids);
      if (lid > 0.02) {
        ctx.save();
        ctx.beginPath(); oval(ex, eyeY, 0.95, 0.8, s * -0.2)(ctx); ctx.clip();
        fillPath(ctx, P.fur, box(ex - 1.2, eyeY - 1.0, 2.4, 1.8 * Math.min(1, lid) * (s > 0 ? 1 : 0.62) + 0.05));
        strokePath(ctx, P.eye, 0.3, (c) => { const ly = eyeY - 1.0 + 1.8 * Math.min(1, lid) * (s > 0 ? 1 : 0.62); c.moveTo(ex - 1, ly); c.lineTo(ex + 1, ly); });
        ctx.restore();
      }
    }
  }
  // The sly brow: over the OPEN eye, cocked.
  if (h.brow > 0.03) {
    const b = h.brow;
    strokePath(ctx, P.furDark, 0.5, (c) => { c.moveTo(-2.25, eyeY - 1.05 - b * 0.5); c.quadraticCurveTo(-1.4, eyeY - 1.55 - b * 0.9, -0.55, eyeY - 1.2 - b * 0.35); });
  }
}

// The head, wherever it points. yaw 1 = profile toward `facing` (shipped), 0 = square
// to the camera, -1 = profile over the shoulder. The swivel foreshortens the muzzle to
// 0.35, cuts to the front face, and squeezes that face as it keeps turning.
function drawHead(ctx, P, h, anchor, scale = 1) {
  ctx.save();
  ctx.translate(anchor[0], anchor[1]);
  ctx.scale(scale, scale);
  const yaw = h.yaw;
  if (Math.abs(yaw) > 0.5) {
    const s = Math.sign(yaw);
    ctx.scale(s, 1);
    ctx.rotate(h.rot);
    drawProfileHead(ctx, P, h, lerp(0.35, 1, (Math.abs(yaw) - 0.5) * 2));
  } else {
    ctx.translate(-0.3 + yaw * 1.6, -1.7);
    ctx.rotate(h.tilt);
    ctx.scale(FRONT_S * (1 - Math.abs(yaw) * 0.7), FRONT_S);
    drawFrontHead(ctx, P, h);
  }
  ctx.restore();
}

// Song rings (shipped), off the muzzle of a head at `anchor`.
function drawRings(ctx, t, pose, anchor, P) {
  if (pose.rings <= 0) return;
  const dirA = pose.ringDir;
  const mx = anchor[0] + Math.cos(dirA) * 7.4, my = anchor[1] + Math.sin(dirA) * 7.4 - 1;
  const S = pose.ringSize;
  for (let k = 0; k < 3; k++) {
    const ph = fract(t * pose.ringRate + k / 3);
    const a = 0.75 * (1 - ph) * pose.rings;
    strokePath(ctx, rgba(SONG, a), 0.45, (c) => c.arc(mx + Math.cos(dirA) * ph * 9 * S, my + Math.sin(dirA) * ph * 9 * S, (1.2 + ph * 4.4) * S, dirA - 0.75, dirA + 0.75));
  }
}

// ------------------------------------------------------------------ marks
// Drawn in coyote space; anything with a handedness un-mirrors itself.
function drawStar(ctx, x, y, R, rot, a = 1) {
  if (R <= 0.02 || a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.5);
  g.addColorStop(0, rgba('#ffffff', 0.55 * a));
  g.addColorStop(1, rgba('#fff4d0', 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R * 1.5, 0, TAU); ctx.fill();
  fillPath(ctx, rgba(SPARK, a), (c) => {
    for (let i = 0; i < 8; i++) {
      const ang = rot + (i * Math.PI) / 4;
      const r = i % 2 === 0 ? R : R * 0.22;
      const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  });
}
function drawBang(ctx, x, y, s, a, dir) {
  if (a <= 0.01 || s <= 0.01) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(dir * s, s); ctx.rotate(0.12);
  ctx.globalAlpha *= a;
  const bar = (c) => { c.moveTo(-0.75, -4.6); c.lineTo(0.75, -4.6); c.lineTo(0.4, -1.3); c.lineTo(-0.4, -1.3); c.closePath(); };
  strokePath(ctx, COYOTE.tip, 0.7, bar);
  strokePath(ctx, COYOTE.tip, 0.7, circle(0, 0.1, 0.62));
  fillPath(ctx, SPARK, bar);
  fillPath(ctx, SPARK, circle(0, 0.1, 0.62));
  ctx.restore();
}
function drawZ(ctx, x, y, s, a, dir) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(dir * s, s);
  const z = (c) => { c.moveTo(-1, -1); c.lineTo(1, -1); c.lineTo(-1, 1); c.lineTo(1, 1); };
  strokePath(ctx, rgba(SPARK, a * 0.9), 1.05, z);
  strokePath(ctx, rgba(COYOTE.tip, a), 0.45, z);
  ctx.restore();
}
function drawMarks(ctx, t, marks, dir) {
  for (const m of marks) {
    if (m.kind === 'star') drawStar(ctx, m.x, m.y, m.r, m.rot, m.a ?? 1);
    else if (m.kind === 'bang') drawBang(ctx, m.x, m.y, m.s, m.a, dir);
    else if (m.kind === 'z') drawZ(ctx, m.x, m.y, m.s, m.a, dir);
    else if (m.kind === 'tuft') fillPath(ctx, rgba(m.c, m.a), oval(m.x, m.y, 0.55, 0.32, m.rot));
    else if (m.kind === 'line') strokePath(ctx, rgba(COYOTE.tip, m.a), 0.4, (c) => { c.moveTo(m.x0, m.y0); c.lineTo(m.x1, m.y1); });
    else if (m.kind === 'wisp') strokePath(ctx, rgba(SONG, m.a), 0.4, (c) => { c.moveTo(m.x, m.y); c.quadraticCurveTo(m.x + 1.0, m.y - 0.9, m.x + 2.0, m.y); c.quadraticCurveTo(m.x + 3.0, m.y + 0.9, m.x + 4.0, m.y); });
  }
}

// One coyote figure: `fig` = { ox, oy, s, dir, headScale?, pal? } places coyote space in
// the ledge frame (shipped: ox -3·dir, oy -12.2, s 1.5).
function drawFigure(ctx, t, pose, fig) {
  const P = fig.pal || PAL;
  ctx.save();
  ctx.translate(fig.ox, fig.oy + pose.hop * fig.s);
  ctx.scale(fig.s * fig.dir, fig.s);
  if (pose.lean) { ctx.translate(-3, 0); ctx.rotate(pose.lean); ctx.translate(3, 0); }
  drawTail(ctx, P, pose.tw);
  drawBody(ctx, P, pose);
  drawHindLeg(ctx, P, pose.hind, pose.hindOsc);
  const anchor = [lerp(HEAD_SIT[0], HEAD_LIE[0], pose.lie), lerp(HEAD_SIT[1], HEAD_LIE[1], pose.lie)];
  drawHead(ctx, P, pose.head, anchor, fig.headScale || 1);
  drawRings(ctx, t, pose, anchor, P);
  drawMarks(ctx, t, pose.marks, fig.dir);
  ctx.restore();
}
const SHIPPED_FIG = (dir) => ({ ox: -3 * dir, oy: -12.2, s: 1.5, dir });
// The hero in coyote space (for heads that track him), from a ledge-frame point.
function heroInFig(env, fig) {
  if (!env || !Number.isFinite(env.heroX)) return null;
  return [(env.heroX - fig.ox) / (fig.s * fig.dir), ((env.heroY ?? 40) - fig.oy) / fig.s];
}

// ------------------------------------------------------------------ the performances
// Each: (u, t, env, dir) -> list of [fig, pose]. u = the performance clock (s); t =
// wall clock for idle life (tail, ears, breathing); env = { heroX, heroY } in the
// ledge frame when a run supplies them.
function solo(dir, pose) { return [[SHIPPED_FIG(dir), pose]]; }

function perfNow(u, t, env, dir) {
  return solo(dir, applyHowl(restPose(t), u, t));
}

// B — TURN TO CAMERA AND WINK.
function perfWink(u, t, env, dir) {
  const p = restPose(t);
  const h = p.head;
  const front = smooth(0.9, 1.15, u) * (1 - smooth(3.95, 4.2, u));
  h.yaw = 1 - front;
  h.rot *= 1 - front;
  if (front > 0.2) h.flick = 0;
  h.brow = smooth(1.2, 1.5, u) * (1 - smooth(3.4, 3.7, u));
  h.wink = smooth(1.65, 2.0, u) * (1 - smooth(3.05, 3.2, u));
  h.grin = (0.3 * smooth(1.2, 1.5, u) + 0.7 * smooth(1.95, 2.15, u)) * (1 - smooth(3.75, 4.05, u));
  h.tilt = 0.16 * smooth(1.8, 2.1, u) * (1 - smooth(3.0, 3.3, u));
  p.tw += Math.sin(t * 10) * 0.9 * smooth(2.0, 2.2, u) * (1 - smooth(3.3, 3.6, u));
  // The twinkle, off the winking eye, the instant it shuts; a glint off the teeth
  // after the eye opens.
  const cx = HEAD_SIT[0] - 0.3, cy = HEAD_SIT[1] - 1.7;
  const k = (u - 1.98) / 0.8;
  if (k > 0 && k < 1) {
    const r = (k < 0.14 ? k / 0.14 : 1 - (k - 0.14) / 0.86 * 0.55) * 3.6;
    p.marks.push({ kind: 'star', x: cx + 4.0, y: cy - 1.6, r, rot: k * 1.4, a: k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3 });
  }
  const g = (u - 3.25) / 0.45;
  if (g > 0 && g < 1) p.marks.push({ kind: 'star', x: cx + 0.9, y: cy + 3.2, r: 1.5 * Math.sin(g * Math.PI), rot: g * 2, a: 1 });
  return solo(dir, p);
}

// C — YAWN AND SETTLE: a jaw-cracking yawn, then down on the ledge, chin on paws,
// Z's, and back up.
function perfYawn(u, t, env, dir) {
  const p = restPose(t);
  const h = p.head;
  const yawn = smooth(0.8, 1.3, u) * (1 - smooth(2.2, 2.5, u));
  h.rot = lerp(h.rot, -0.5, yawn);
  h.jaw = yawn * (1.05 + (yawn > 0.95 ? Math.sin(t * 16) * 0.03 : 0));
  h.eye = yawn > 0.25 ? 'shut' : 'open';
  h.earBack = 0.75 * yawn;
  h.tongue = yawn;
  p.heave = 0.5 * yawn;
  p.lean = -0.05 * yawn;
  const lie = smooth(2.6, 3.4, u) * (1 - smooth(6.4, 7.1, u));
  p.lie = lie;
  if (lie > 0) {
    h.rot = lerp(h.rot, 0.12, lie);
    h.eye = u > 3.0 && u < 6.3 ? 'shut' : u >= 6.3 && u < 6.7 ? 'open' : h.eye;
    if (u >= 6.3 && u < 6.7) h.lids = 0.6;
    p.heave += Math.sin(t * 2.4) * 0.3 * lie;
    h.flick = u > 5.1 && u < 5.25 ? 0.5 : 0;
    p.tw = lerp(p.tw, Math.sin(t * 0.9) * 0.3, lie);
  }
  // Z's: one every 0.8 s from 3.5 to 6.0, each rising and fading over 1.6 s.
  const anchor = [lerp(HEAD_SIT[0], HEAD_LIE[0], lie), lerp(HEAD_SIT[1], HEAD_LIE[1], lie)];
  for (let i = 0; i < 4; i++) {
    const born = 3.5 + i * 0.8;
    const age = (u - born) / 1.7;
    if (age <= 0 || age >= 1 || u > 6.4) continue;
    p.marks.push({
      kind: 'z', x: anchor[0] + 2 + age * 3.5 + Math.sin(age * 5 + i) * 0.6, y: anchor[1] - 4.5 - age * 8,
      s: 0.9 + age * 0.7, a: Math.min(1, age * 5) * (1 - smooth(0.65, 1, age)),
    });
  }
  return solo(dir, p);
}

// D — SCRATCH BEHIND THE EAR with a hind leg, eyes shut in bliss, fur flying.
function perfScratch(u, t, env, dir) {
  const p = restPose(t);
  const h = p.head;
  const lift = smooth(0.8, 1.1, u) * (1 - smooth(3.1, 3.4, u));
  const going = u > 1.1 && u < 3.1;
  const osc = going ? Math.sin((u - 1.1) * TAU * 7) : 0;
  p.hind = lift;
  p.hindOsc = osc;
  h.rot = lerp(h.rot, 0.42 + osc * 0.035, lift);
  h.eye = lift > 0.5 ? 'squint' : 'open';
  h.earBack = 0.3 * lift;
  h.jaw = 0.16 * lift;
  h.tongue = lift;
  p.lean = -0.07 * lift;
  p.tw += osc * 0.5 * lift;
  // Tufts off the scratched spot, one small puff every stroke.
  if (going) {
    const s = (u - 1.1) * 7;
    for (let i = Math.max(0, Math.floor(s) - 4); i <= Math.floor(s); i++) {
      const age = (s - i) / 4;
      if (age < 0 || age > 1) continue;
      for (let j = 0; j < 2; j++) {
        const hx = hash(i * 3 + j), hy = hash(i * 5 + j + 9);
        p.marks.push({
          kind: 'tuft', x: 0.8 - age * (3 + hx * 4), y: -15.5 - age * (2 + hy * 3) + age * age * 4,
          rot: hx * 3, c: j ? PAL.furLit : PAL.fur, a: 1 - age,
        });
      }
    }
  }
  // After: a shake of the head, ears flapping.
  const shake = u > 3.4 && u < 3.9 ? Math.sin((u - 3.4) * TAU * 6) * (1 - (u - 3.4) / 0.5) : 0;
  h.rot += shake * 0.08;
  if (Math.abs(shake) > 0.3) h.flick = 0.4;
  return solo(dir, p);
}

// E — SNIFF, PRICK, TRACK: nose up testing the wind, ears snap up, and the head follows
// the hero down the road — past him and over its shoulder.
function perfTrack(u, t, env, dir) {
  const p = restPose(t);
  const h = p.head;
  const fig = SHIPPED_FIG(dir);
  const sniff = smooth(0.5, 0.8, u) * (1 - smooth(2.1, 2.35, u));
  const s = u - 0.8;
  const bob = sniff > 0.5 && (s % 0.9) < 0.5 ? Math.sin(s * TAU * 8) * 0.07 : 0;
  h.rot = lerp(h.rot, -0.38 + bob, sniff);
  h.lids = 0.45 * sniff;
  // Scent drifting in to the nose.
  if (sniff > 0.3) {
    for (let i = 0; i < 2; i++) {
      const ph = fract(t * 0.9 + i * 0.5);
      p.marks.push({ kind: 'wisp', x: 11 + (1 - ph) * 7, y: -17.5 - i * 1.6 + Math.sin(ph * 4) * 0.4, a: 0.7 * Math.sin(ph * Math.PI) * sniff });
    }
  }
  const alert = smooth(2.2, 2.35, u) * (1 - smooth(5.6, 6.0, u));
  h.prick = alert;
  p.hop = -0.5 * alert;
  if (alert > 0.1) { h.flick = 0; h.eye = alert > 0.5 ? 'wide' : 'open'; h.wide = 0.35 * alert; }
  // Where's the hero? The run's, or a stand-in walking under the ledge.
  const hero = heroInFig(env, fig) || [lerp(60, -45, clamp01((u - 2.4) / 3.2)), 26];
  const dx = hero[0] - HEAD_SIT[0], dy = hero[1] - HEAD_SIT[1];
  const track = smooth(2.35, 2.6, u) * (1 - smooth(5.6, 6.0, u));
  if (track > 0) {
    const yaw = clamp(dx / 9, -1, 1);
    h.yaw = lerp(1, yaw, track);
    h.rot = lerp(h.rot, clamp(Math.atan2(dy, Math.abs(dx) + 0.01), -0.35, 0.7), track);
    h.down = track * clamp01(dy / 30) * (1 - Math.abs(yaw));
    // The tail goes: a slow wag while it watches.
    p.tw += Math.sin(t * 5) * 0.8 * track;
  }
  // A quick "!" as the ears go up.
  const bangK = (u - 2.2) / 0.8;
  if (bangK > 0 && bangK < 1) p.marks.push({ kind: 'bang', x: HEAD_SIT[0] - 1.5, y: HEAD_SIT[1] - 9.5, s: 0.62 * Math.min(1, bangK * 6), a: 1 - smooth(0.7, 1, bangK) });
  return solo(dir, p);
}

// F — DOUBLE-TAKE: a bored glance at the camera, back to the desert… then SNAPS back,
// eyes like saucers, ears up, a hop and a "!".
function perfTake(u, t, env, dir) {
  const p = restPose(t);
  const h = p.head;
  const glance = smooth(0.9, 1.05, u) * (1 - smooth(1.55, 1.7, u));
  const take = smooth(2.1, 2.17, u) * (1 - smooth(3.6, 3.85, u));
  const front = Math.max(glance, take);
  h.yaw = 1 - front;
  h.rot *= 1 - front;
  if (front > 0.2) h.flick = 0;
  h.lids = glance * 0.5 * (1 - take);
  h.wide = take;
  h.prick = take;
  h.mouthO = take * (1 - smooth(2.9, 3.4, u));
  h.grin = 0;
  const jump = u > 2.1 && u < 2.5 ? Math.sin(((u - 2.1) / 0.4) * Math.PI) : 0;
  p.hop = -3.0 * jump;
  p.tw = lerp(p.tw, -1.6, take);
  const cx = HEAD_SIT[0] - 0.3, cy = HEAD_SIT[1] - 1.7;
  const bangK = (u - 2.12) / 1.5;
  if (bangK > 0 && bangK < 1) {
    const pop = bangK < 0.08 ? 1.35 * (bangK / 0.08) : bangK < 0.16 ? lerp(1.35, 1, (bangK - 0.08) / 0.08) : 1;
    p.marks.push({ kind: 'bang', x: cx - 5.2, y: cy - 6.2, s: 0.72 * pop, a: 1 - smooth(0.8, 1, bangK) });
  }
  // Take lines either side of the head for the first beat.
  const lk = (u - 2.1) / 0.45;
  if (lk > 0 && lk < 1) {
    for (const s of [-1, 1]) {
      for (const [a0, len] of [[-0.5, 2.2], [0, 2.8], [0.5, 2.2]]) {
        const r0 = 4.6 + lk * 1.2;
        const ang = (s > 0 ? 0 : Math.PI) + a0 * s;
        p.marks.push({ kind: 'line', x0: cx + Math.cos(ang) * r0, y0: cy + Math.sin(ang) * r0, x1: cx + Math.cos(ang) * (r0 + len), y1: cy + Math.sin(ang) * (r0 + len), a: 1 - lk });
      }
    }
  }
  return solo(dir, p);
}

// G — CHORUS: a pup joins in. The adult howls; the pup yips three times, then finds
// the note and the two hold it together; after, the pup looks up at the adult.
function perfChorus(u, t, env, dir) {
  const A = restPose(t);
  // Adult: stretched clock so the howl spans 1.2–3.4.
  const upA = smooth(0.8, 1.1, u) * (1 - smooth(3.4, 3.8, u));
  const howlA = u > 1.1 && u < 3.4;
  A.head.rot = -upA * 0.95 + Math.sin(t * 0.8) * 0.12 * (1 - upA);
  A.head.jaw = howlA ? 0.35 + Math.sin(t * 6) * 0.08 : 0;
  A.head.eye = howlA ? 'shut' : 'open';
  A.heave = howlA ? Math.sin(t * 9) * 0.25 : 0;
  A.rings = howlA ? 1 : upA > 0.5 ? 0.4 : 0;
  A.ringDir = -upA * 0.95 - 0.1;
  const P = restPose(t + 1.3);
  const upP = smooth(1.6, 1.8, u) * (1 - smooth(3.4, 3.8, u));
  const yipT = u - 1.8;
  const yip = yipT > 0 && yipT < 0.75 ? Math.max(0, Math.sin((yipT / 0.25) * Math.PI)) : 0;
  const howlP = u > 2.55 && u < 3.4;
  P.head.rot = -upP * lerp(0.7, 1.05, howlP ? 1 : 0) + Math.sin((t + 1.3) * 0.8) * 0.12 * (1 - upP);
  P.head.jaw = howlP ? 0.4 + Math.sin(t * 7.3) * 0.08 : yip * 0.45;
  P.head.eye = howlP ? 'shut' : 'open';
  P.rings = howlP ? 1 : yip > 0.3 ? 0.8 : 0;
  P.ringDir = P.head.rot - 0.1;
  P.ringRate = 1.9;
  P.ringSize = 0.62;
  // After: the pup looks up at the adult; the adult looks down at it.
  const after = smooth(3.9, 4.2, u) * (1 - smooth(5.2, 5.5, u));
  P.head.yaw = lerp(1, -1, after);
  P.head.rot = lerp(P.head.rot, -0.35, after);
  A.head.rot = lerp(A.head.rot, 0.3, after);
  P.tw += Math.sin(t * 8) * 0.9 * after;
  const figA = { ox: -7 * dir, oy: ledgeTop(-7) , s: 1.5, dir };
  const figP = { ox: 10 * dir, oy: ledgeTop(dir > 0 ? 12.5 : -12.5) + 0.2, s: 1.1, dir, headScale: 1.12, pal: PUP_PAL };
  return [[figA, A], [figP, P]];
}

// ------------------------------------------------------------------ the candidates
// loop: gallery period (s). latch: where a latched run starts the clock (the gag's
// first move), len: the clock value at which it is back at rest for good.
export const COYOTE_CANDIDATES = [
  { id: 'now', letter: 'A', name: 'NOW — the howl (shipped drawDesertCoyote, mode howl)', ships: 'howl', perf: perfNow, loop: 5, latch: 2.2, len: 5, key: 3.6,
    keys: [0.4, 1.4, 2.5, 2.8, 3.2, 3.8, 4.4, 4.8],
    note: 'The shipped painter\'s default: rest and look about, head up, a 1.5 s howl with song rings, head down, every 5 s. Shown facing the sun and facing away.',
    where: 'SHIPS as the default: speed-1\'s first coyote, speed-2\'s second, and every coyote a show is not dealt to.' },
  { id: 'wink', letter: 'B', name: 'SHIPS — THE WINK, sat facing the camera', ships: 'wink', perf: perfWink, loop: 6, latch: 0.2, len: 6, key: 1.6,
    keys: [0.3, 0.6, 0.95, 1.2, 1.6, 2.2, 2.6, 3.4],
    note: 'Peter\'s idea, as he refined it: the coyote is ALREADY sat square to the camera the moment it is on screen (front-on body — haunches either side, cream bib, both forelegs, tail along the ledge) and never turns. It cocks a brow, winks slowly with a star twinkle off the shut eye, grins, wags, and a glint comes off the teeth.',
    where: 'SHIPS on ONE summit: speed-3\'s LAST coyote (tile 14, ~81%), started as its ledge comes into view (1.5x pace in portrait) so it cannot be missed.' },
  { id: 'yawn', letter: 'C', name: 'SHIPS — YAWN AND SETTLE, then a howl', ships: 'yawn', perf: perfYawn, loop: 10.4, latch: 0.55, len: 10.4, key: 1.8,
    keys: [0.6, 1.1, 1.8, 2.9, 4.3, 5.4, 6.8, 8.8],
    note: 'A jaw-cracking yawn (head back, tongue curled, ears flat), down on the ledge chin on paws with Z\'s and an ear flick, back up — then a howl, and round again: the yawn alternates with the howl.',
    where: 'SHIPS: speed-1\'s second coyote and speed-3\'s first, started as the ledge comes into view (1.5x pace in portrait).' },
  { id: 'scratch', letter: 'D', name: 'SCRATCH BEHIND THE EAR (not picked)', perf: perfScratch, loop: 6.5, latch: 0.6, len: 4.2, key: 2.0,
    keys: [0.6, 1.0, 1.3, 1.9, 2.5, 3.2, 3.6, 4.2],
    note: 'Leans back, a hind leg comes up and thumps behind the ear at 7 strokes a second, head tipped into it, eyes squeezed shut and tongue out in bliss, fur tufts flying; then a head shake. The busy leg is the read — it works even where the face is 6 px.',
    where: 'Mid-stage coyotes on speed-2, ALTERNATING with the howl; a good one to hash onto roughly one summit in four.' },
  { id: 'track', letter: 'E', name: 'SNIFF, PRICK, TRACK THE HERO (not picked)', perf: perfTrack, loop: 7, latch: 0.3, len: 6.0, key: 3.2,
    keys: [0.4, 1.0, 1.6, 2.3, 2.9, 3.6, 4.4, 5.3],
    note: 'Nose up sniffing (scent wisps drifting in), ears snap up with a small "!", then the head follows the HERO — it takes an optional heroX/heroY — swivelling through a front face as he passes underneath and ending over its shoulder watching him go.',
    where: 'Any stage; most effective where the coyote sits right above the road. LATCH it on entering view so the track spans the hero passing; it REPLACES the howl on the summits it plays on (it needs the hero, so it is a run-only gag).' },
  { id: 'take', letter: 'F', name: 'STARTLED DOUBLE-TAKE (not picked)', perf: perfTake, loop: 6.5, latch: 0.7, len: 4.0, key: 2.5,
    keys: [0.6, 1.1, 1.4, 1.9, 2.15, 2.3, 3.0, 3.9],
    note: 'A bored glance at the camera, back to the view — then it SNAPS round: eyes like saucers, ears straight up, mouth an O, a hop, take lines and a big "!". Pure cartoon timing; the hop and the "!" carry it at speed.',
    where: 'Speed-2, the chase stage, the coyote nearest Eggshell\'s entrance (something just flew past). LATCHED; it REPLACES the howl there.' },
  { id: 'chorus', letter: 'G', name: 'SHIPS — CHORUS, a pup joins in', ships: 'chorus', perf: perfChorus, loop: 6, latch: 0.5, len: 6, key: 3.0,
    keys: [0.5, 1.2, 1.9, 2.1, 2.3, 3.0, 4.2, 4.8],
    note: 'Two on one ledge, both side-on and facing the same way: the adult howls, a sandier pup yips three times, finds the note, and they hold it together in two sizes of ring; after, the adult bows its head to nose the pup\'s ear and the pup looks up. Nobody turns round.',
    where: 'SHIPS: speed-2\'s first coyote, started as the ledge comes into view (1.5x pace in portrait).' },
];
const BY_ID = new Map(COYOTE_CANDIDATES.map((c) => [c.id, c]));

// The performance clock: looped on t, or latched (`since` = seconds since it came
// into view; before that the coyote rests at the clock's start).
function clockFor(cand, t, since) {
  if (since == null) return fract(t / cand.loop) * cand.loop;
  if (since < 0) return 0;
  return Math.min(cand.len, cand.latch + since);
}

/**
 * Paint candidate `id` in the LEDGE frame (origin on the crest under the ledge's
 * centre — where drawDesertCoyote translates to), ledge included. env: { heroX,
 * heroY } in that frame, optional; since: latched clock, optional.
 */
export function paintCoyoteCandidateLocal(ctx, id, t, facing = 1, { since = null, env = null, pace = 1 } = {}) {
  const cand = BY_ID.get(id);
  if (!cand) return;
  const dir = facing < 0 ? -1 : 1;
  if (cand.ships) {
    drawDesertCoyote(ctx, t, 0, FLAT_SEAT, dir, { mode: cand.ships, since, pace });
    return;
  }
  const u = clockFor(cand, t, since);
  drawLedge(ctx);
  for (const [fig, pose] of cand.perf(u, t, env, dir)) drawFigure(ctx, t, pose, fig);
}

/**
 * The shipped signature: (ctx, t, x, seat, facing) plus opts { heroX, heroY, since }
 * in the same ctx coordinates as x. What a run would call.
 */
export function drawCoyoteCandidate(ctx, id, t, x, seat, facing = 1, { heroX, heroY, since = null } = {}) {
  ctx.save();
  const y0 = seat.near(x);
  clipSky(ctx, x - 90, x + 90, [(xx) => seat.near(xx) + 2]);
  ctx.translate(x, y0);
  const env = Number.isFinite(heroX) ? { heroX: heroX - x, heroY: (heroY ?? y0 + 40) - y0 } : null;
  paintCoyoteCandidateLocal(ctx, id, t, facing, { since, env });
  ctx.restore();
}

// ------------------------------------------------------------------ the scene hook
// The shipped ledge's first fill colour — the detector.
const LEDGE_KEY = ROCKP.body.toLowerCase();

// Run `drawBg()` (which calls pack.bg on ctx) with every shipped coyote either
// reported (onCoyote only) or replaced by `paint(ctx, dir, ledgeM)`.
function withCoyoteHook(ctx, drawBg, { replace = false, onCoyote = null, paint = null } = {}) {
  const proto = Object.getPrototypeOf(ctx);
  let depth = 0;
  let silence = null;     // save depth the shipped coyote owns
  let ledgeM = null;      // the ledge frame, awaiting the facing
  let painting = false;
  const own = ['save', 'restore', 'fill', 'stroke', 'fillRect', 'strokeRect', 'scale'];
  ctx.save = function save() { depth++; return proto.save.call(this); };
  ctx.restore = function restore() {
    const r = proto.restore.call(this);
    depth--;
    if (silence != null && depth < silence) { silence = null; ledgeM = null; }
    return r;
  };
  const gate = (name, styleKey) => function gated(...args) {
    if (painting) return proto[name].apply(this, args);
    if (styleKey && silence == null && ledgeM == null && typeof this[styleKey] === 'string'
      && this[styleKey].toLowerCase() === LEDGE_KEY) {
      ledgeM = this.getTransform();
      if (replace) { silence = depth; return undefined; }
    }
    if (silence != null) return undefined;
    return proto[name].apply(this, args);
  };
  ctx.fill = gate('fill', 'fillStyle');
  ctx.stroke = gate('stroke', null);
  ctx.fillRect = gate('fillRect', null);
  ctx.strokeRect = gate('strokeRect', null);
  ctx.scale = function scale(sx, sy) {
    if (!painting && ledgeM && Math.abs(sy - 1.5) < 1e-9 && Math.abs(Math.abs(sx) - 1.5) < 1e-9) {
      const dir = sx < 0 ? -1 : 1;
      const m = ledgeM;
      ledgeM = replace ? m : null;
      if (onCoyote) onCoyote(m, dir);
      if (replace && paint) {
        painting = true;
        proto.save.call(this);
        try {
          this.setTransform(m);
          this.globalAlpha = 1;
          this.globalCompositeOperation = 'source-over';
          paint(this, dir, m);
        } finally {
          proto.restore.call(this);
          painting = false;
        }
      }
      if (replace) ledgeM = null;
    }
    return proto.scale.call(this, sx, sy);
  };
  try {
    drawBg();
  } finally {
    for (const k of own) delete ctx[k];
  }
}

// ------------------------------------------------------------------ frames
// Landscape: backdrop px = frame px. Portrait: an iPhone 390x844 frame, the pack's
// portrait branch with its resolved bands and the 480/270 backdrop zoom about the
// groundline, lane at the run's 3.5 zoom with the hero on the portrait anchor.
const HERO_BG_Y = GROUND_Y - 24;   // the hero's middle, in backdrop px (both modes)
let portraitCache = null;
function portraitSetup() {
  if (portraitCache) return portraitCache;
  const frame = frameForViewport({
    mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
    safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
  });
  const zoom = PORTRAIT_BACKGROUND_ZOOM;
  const sceneryLayout = resolveSceneryLayout({
    frame, hud: portraitHudLayout(frame), groundY: GROUND_Y, backgroundZoom: zoom,
    bands: resolveCompositionProfile('speed').bands,
  });
  const half = 240;
  const coverage = Object.freeze({
    left: -half / zoom + half, right: half / zoom + half, width: 480 / zoom, lookahead: 96 / zoom,
  });
  const worldZ = 3.5, anchorX = 16;
  const xOff = (anchorX - PLAYER_X) * worldZ;
  const heroScreenX = PLAYER_X * worldZ + xOff;
  portraitCache = {
    frame, zoom, coverage, worldZ, xOff,
    frameShift: frame.groundScreenY - GROUND_Y,
    heroBgX: 240 + (heroScreenX - 240) / zoom,
    context: {
      portrait: true, stageIndex: 1, heroId: 'lorenzo', heroFrac: 0.2, progress: 0.4,
      roadGaps: [], cameraShiftY: 0, frameShift: 0, sceneryLayout, backgroundZoom: zoom,
      worldZoom: worldZ, backgroundXOffset: 0, worldXOffset: 0,
    },
  };
  return portraitCache;
}
const MODES = {
  land: { heroBgX: () => PLAYER_X * ZOOM, right: () => 480, left: () => 0 },
  port: {
    heroBgX: () => portraitSetup().heroBgX,
    right: () => portraitSetup().coverage.right,
    left: () => portraitSetup().coverage.left,
  },
};

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// The backdrop in backdrop coordinates (the caller has set up the mode's transform),
// with every coyote swapped for candidate `id` (an unknown id = the pack untouched).
// sinceFor(bgX) -> latched clock or null.
function coyoteBackdrop(ctx, t, camX, cab, pack, id, mode, { sinceFor = null, onCoyote = null } = {}) {
  const bgCtx = mode === 'port' ? portraitSetup().context : null;
  const base = ctx.getTransform();
  const heroBg = new DOMPoint(MODES[mode].heroBgX(), HERO_BG_Y);
  const run = () => pack.bg(ctx, t, camX, cab, Infinity, null, 0, bgCtx);
  const bgXOf = (m) => base.inverse().multiply(m).transformPoint(new DOMPoint(0, 0)).x;
  if (!BY_ID.has(id)) {
    withCoyoteHook(ctx, run, { onCoyote: onCoyote ? (m, dir) => onCoyote(bgXOf(m), dir) : null });
    return;
  }
  withCoyoteHook(ctx, run, {
    replace: true,
    onCoyote: onCoyote ? (m, dir) => onCoyote(bgXOf(m), dir) : null,
    paint: (g, dir, m) => {
      const hero = m.inverse().transformPoint(base.transformPoint(heroBg));
      const since = sinceFor ? sinceFor(bgXOf(m)) : null;
      paintCoyoteCandidateLocal(g, id, t, dir, { since, env: { heroX: hero.x, heroY: hero.y }, pace: mode === 'port' ? 1.5 : 1 });
    },
  });
}

function withPortraitBg(ctx, fn) {
  const P = portraitSetup();
  ctx.save();
  ctx.translate(0, P.frameShift);
  ctx.translate(240, GROUND_Y);
  ctx.scale(P.zoom, P.zoom);
  ctx.translate(-240, -GROUND_Y);
  const prev = ctx.__mashBackgroundCoverage;
  ctx.__mashBackgroundCoverage = P.coverage;
  try { fn(); } finally {
    if (prev === undefined) delete ctx.__mashBackgroundCoverage;
    else ctx.__mashBackgroundCoverage = prev;
    ctx.restore();
  }
}

// ------------------------------------------------------------------ finding coyotes
// Each shipped coyote is a fixed point of the near layer: bgX + camX·0.35·ZOOM is
// constant. Probe the real backdrop to find one of each facing, per mode.
const found = { land: null, port: null };
function probeCoyotes(cab, pack, mode) {
  if (found[mode]) return found[mode];
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(480, 270) : Object.assign(document.createElement('canvas'), { width: 480, height: 270 });
  const g = c.getContext('2d');
  const k = NEAR_F * ZOOM;
  const list = [];
  const lo = MODES[mode].left() + 60, hi = MODES[mode].right() - 60;
  for (let camX = 400; camX < 30000 && !(list.some((q) => q.dir > 0) && list.some((q) => q.dir < 0)); camX += 180) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const probe = () => coyoteBackdrop(g, 0, camX, cab, pack, null, mode, {
      onCoyote: (bgX, dir) => { if (bgX > lo && bgX < hi) list.push({ L: bgX + camX * k, dir }); },
    });
    if (mode === 'port') withPortraitBg(g, probe); else probe();
  }
  const pick = (d) => list.find((q) => q.dir === d) || list[0] || { L: 1200, dir: 1 };
  found[mode] = { 1: pick(1), [-1]: pick(-1) };
  return found[mode];
}
// The camera that puts the coyote of `facing` at backdrop x `at`.
function camFor(cab, pack, mode, facing, at) {
  const q = probeCoyotes(cab, pack, mode)[facing < 0 ? -1 : 1];
  return (q.L - at) / (NEAR_F * ZOOM);
}

// ------------------------------------------------------------------ public scenes
const PASS_LEAD = 30;   // backdrop px inside the right edge at which a latched gag starts
function passState(cab, pack, mode, facing, t) {
  const right = MODES[mode].right(), left = MODES[mode].left();
  const from = right + 45, to = left - 45;
  const span = (from - to) / NEAR_SPEED();
  const loop = span + 0.8;
  const tt = fract(t / loop) * loop;
  const at = from - Math.min(tt, span) * NEAR_SPEED();
  const camX = camFor(cab, pack, mode, facing, at);
  const trig = right - PASS_LEAD;
  return { camX, sinceFor: (bgX) => (bgX > trig ? -1 : (trig - bgX) / NEAR_SPEED()) };
}

/**
 * A 480x270 landscape frame: real backdrop, lane and hero, the candidate on the
 * coyote summit. pass: the run's pace, the summit crossing the frame, the gag latched
 * as it comes into view (loops). Otherwise a held camera with the coyote at `at`.
 */
export function drawCoyoteScene(ctx, t, cab, pack, id, { facing = 1, at = 330, pass = false } = {}) {
  let camX, sinceFor = null;
  if (pass) ({ camX, sinceFor } = passState(cab, pack, 'land', facing, t));
  else camX = camFor(cab, pack, 'land', facing, at);
  coyoteBackdrop(ctx, t, camX, cab, pack, id, 'land', { sinceFor });
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}

/**
 * The portrait read at phone size: a w-wide tile is the 390-CSS-px phone (w = 390 is
 * honest scale), cropped to `h` tall with the groundline `below` px above the bottom.
 */
export function drawCoyotePortrait(ctx, t, cab, pack, id, w, h, { facing = 1, at = 300, pass = false, below = 70 } = {}) {
  const P = portraitSetup();
  const s = w / 480;
  let camX, sinceFor = null;
  if (pass) ({ camX, sinceFor } = passState(cab, pack, 'port', facing, t));
  else camX = camFor(cab, pack, 'port', facing, at);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, cab.sky[0]); sky.addColorStop(1, cab.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.scale(s, s);
  ctx.translate(0, h / s - below / s - P.frame.groundScreenY);
  withPortraitBg(ctx, () => coyoteBackdrop(ctx, t, camX, cab, pack, id, 'port', { sinceFor }));
  ctx.fillStyle = cab.groundDark || '#303030';
  ctx.fillRect(0, P.frame.groundScreenY, 480, 400);
  ctx.save();
  applyWorld(ctx, P.worldZ, P.frameShift, GROUND_Y, P.xOff);
  pack.ground(ctx, camX, cab, [], [], t * 60, (480 - P.xOff) / P.worldZ);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  ctx.restore();
}

// A zoom-x crop of the held landscape scene, centred over the ledge. `u` pins the
// performance clock (for strips); otherwise it loops on t.
const CLOSE_AT = 330;
function drawCrop(ctx, t, cab, pack, id, w, h, zoom, facing, u = null, lift = 16) {
  const camX = camFor(cab, pack, 'land', facing, CLOSE_AT);
  let cy = null;
  // The ledge's crest y: found by the hook on the same frame.
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  const seatY = crestYAt(cab, pack, camX);
  cy = seatY - lift;
  ctx.translate(w / 2 - zoom * CLOSE_AT, h * 0.52 - zoom * cy);
  ctx.scale(zoom, zoom);
  const cand = BY_ID.get(id);
  const tt = u == null || !cand ? t : u;
  const since = u == null || !cand || cand.ships ? null : u - cand.latch;
  coyoteBackdrop(ctx, tt, camX, cab, pack, id, 'land', { sinceFor: since == null ? null : () => since });
  ctx.restore();
}
const crestCache = new Map();
function crestYAt(cab, pack, camX) {
  const key = Math.round(camX * 100);
  if (crestCache.has(key)) return crestCache.get(key);
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(480, 270) : Object.assign(document.createElement('canvas'), { width: 480, height: 270 });
  const g = c.getContext('2d');
  let y = 150;
  const base = g.getTransform();
  withCoyoteHook(g, () => pack.bg(g, 0, camX, cab, Infinity, null, 0, null), {
    onCoyote: (m) => {
      const p = base.inverse().multiply(m).transformPoint(new DOMPoint(0, 0));
      if (Math.abs(p.x - CLOSE_AT) < 2) y = p.y;
    },
  });
  crestCache.set(key, y);
  return y;
}

/** The 6x close-up: the held scene, magnified over the ledge. */
export function drawCoyoteCloseUp(ctx, t, cab, pack, id, w, h, { zoom = 6, facing = 1 } = {}) {
  drawCrop(ctx, t, cab, pack, id, w, h, zoom, facing, null, 20);
}

/**
 * The whole performance as a strip: the candidate's key frames left to right, each
 * a zoom-x crop of the held scene, labelled with its clock time.
 */
export function drawCoyoteStrip(ctx, cab, pack, id, { fw = 170, fh = 200, zoom = 4, facing = 1, gap = 4 } = {}) {
  const cand = BY_ID.get(id);
  const keys = cand ? cand.keys : [0, 1, 2, 3];
  keys.forEach((u, i) => {
    ctx.save();
    ctx.translate(i * (fw + gap), 0);
    drawCrop(ctx, u, cab, pack, id, fw, fh, zoom, facing, u, 24);
    ctx.fillStyle = 'rgba(12,10,16,0.62)';
    ctx.fillRect(3, 3, 40, 14);
    ctx.fillStyle = '#fff4dc';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`${u.toFixed(2)}s`, 6, 5);
    ctx.restore();
  });
}
export const coyoteStripWidth = (id, fw = 170, gap = 4) => (BY_ID.get(id)?.keys.length ?? 4) * (fw + gap) - gap;
