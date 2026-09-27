// CRYPT SHIFT — THE BALLOON CLOWN (layer 'mid'). Peter, 26 Sep 2026: a small, sinister
// clown on the graveyard hill at the start of crypt-2, who lets go of his red balloon.
// An original clown in the spirit of Peter's reference (a generic evil cartoon clown):
// white face and a wide toothy grin, yellow eyes in red-dark hollows, round red nose and
// cheek dots, orange flame tufts of hair, a big red ruff, a cream suit with teal-grey
// sleeves and three red pom-poms, dark cuffs, white gloves, big red shoes.
//
// Painted in the backdrop's own hand through GOUACHE_KIT: each colour is an opaque
// massSprite with the moonlit rim on its upper right, the colours muted and pulled blue
// for the night, the face left the brightest thing on the hill. He is about 18 px tall.
//
// Baked once per scale: the body per arm-pose pair (a handful of frames), the head once,
// the balloon once. A frame is three blits (body, head turned about the neck, balloon),
// the string and two eye dots.
//
// When: crypt-2 only, and only on its FIRST pass of this stretch of hill (the mid layer
// opens crypt-2 shifted 0.37 of its period). The release is tied to the scroll, not the
// clock: once his screen x passes RELEASE_X, `d` (px the hill has scrolled since) drives
// the balloon up and to the right, so it goes at the same place every time.
import { GOUACHE_KIT as K } from '../cryptGouache.js';

const { massSprite, limb, dab, fillPoly, canvas, css, mix, hash, SCENE } = K;
const TAU = Math.PI * 2;

// Just right of the hill's second ghost spot (1440) and past the tomb at 1500, so he is
// off screen when crypt-2 opens (x ≈ 628) and walks in from the right about 4 s in (Peter,
// 26 Sep: "he should be off screen when we start - perhaps he is on the right of the ghosts").
const CLOWN_U = 1575;
// A size up, nearer the sheet-ghosts' ~22 px (Peter: "a little larger … closer to the size
// of the ghosts"): 18.5 → ~22 px, scaled about his feet.
const CLOWN_SCALE = 1.45; // and a little bigger again (Peter, 26 Sep): ~27 px
const PERIOD = SCENE.mid.period; // 2560
const OPEN_SHIFT = 0.37 * PERIOD; // crypt-2's opening shift of the mid layer
const FIRST_PASS_END = OPEN_SHIFT + PERIOD - 700;
// Where he lets go (screen x, layer px): he walks in at ~480 and holds the balloon for
// ~180 px of scroll (about five seconds) before letting go.
// Later (Peter: "release the balloon later"): he holds it for ~260 px of scroll.
const RELEASE_X = 220;
const STRING = 14;

// ------------------------------------------------------------------ helpers
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (c, P) => ((c % P) + P) % P;

function bakeScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const s = m && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.ceil(s * 2 - 0.01) / 2));
}
const CACHE = new Map();
function memo(key, build) {
  let v = CACHE.get(key);
  if (v === undefined) {
    v = build();
    CACHE.set(key, v);
  }
  return v;
}
function ellipse(g, x, y, rx, ry, a = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), a, 0, TAU);
  g.fill();
}
function footAt(f, x, halfW) {
  let y = -Infinity;
  for (let d = -halfW; d <= halfW; d += 1.5) y = Math.max(y, f.ridgeY(x + d));
  return y;
}

// Several painted masses, each its own massSprite (its own rim and texture) in one shared
// box, stacked back to front into one sprite; `detail` paints on top in local coords.
function layered(k, box, parts, detail) {
  const [bx, by] = box;
  let out = null;
  let g = null;
  for (const [shape, st] of parts) {
    const s = massSprite(k, box, shape, st);
    if (!out) {
      out = canvas(s.c.width, s.c.height);
      g = out.getContext('2d');
    }
    g.drawImage(s.c, 0, 0);
  }
  if (detail) {
    g.setTransform(k, 0, 0, k, -bx * k, -by * k);
    detail(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  return { c: out, x: bx, y: by, w: out.width / k, h: out.height / k };
}

// ------------------------------------------------------------------ palette
// Night-muted and blue-shifted; the face is the brightest thing he has.
const FACE = { body: [224, 222, 238], dark: [184, 182, 212], lit: [255, 255, 255] };
const SUIT = { body: [140, 127, 118], dark: [82, 76, 98], lit: [206, 198, 204] };
const SLEEVE = { body: [66, 98, 112], dark: [40, 58, 78], lit: [132, 168, 192] };
const RED = { body: [164, 36, 56], dark: [104, 22, 46], lit: [232, 120, 140] };
const BALLOON = { body: [190, 38, 56], dark: [120, 20, 44], lit: [248, 150, 160] };
const HAIR = { body: [204, 100, 44], dark: [134, 58, 42], lit: [246, 178, 120] };
const GLOVE = { body: [198, 198, 220], dark: [150, 150, 184], lit: [240, 240, 252] };
const CUFF = { body: [34, 30, 54], dark: [22, 20, 40], lit: [96, 100, 150] };
const EYE = [246, 214, 92];
const HOLLOW = [78, 14, 36];
const STRING_COL = [178, 176, 206];

const st = (pal, seed, extra) => ({
  ...pal, rim: 0.3, rimA: 0.85, dabs: 0.32, dab: 0.45, dabAng: -0.4, seed, g0: 0.1, ...extra,
});

// ------------------------------------------------------------------ the body
// Feet at (0, 0), front-facing. Shoulders at y -11.4, the neck (the head's pivot) -12.4.
const SH_L = [-2.1, -11.3];
const SH_R = [2.1, -11.3];
const NECK = [0, -12.3];

// Arm poses: elbow, wrist, hand, glove open or a fist. Waves are a forearm swinging from
// a raised elbow, four frames.
const DOWN_L = { el: [-3.1, -9.0], wr: [-3.35, -6.9], hand: [-3.4, -6.2], open: false };
const MID_L = { el: [-3.9, -9.8], wr: [-4.6, -11.2], hand: [-4.9, -11.8], open: true };
const DOWN_R = { el: [3.1, -9.0], wr: [3.35, -6.9], hand: [3.4, -6.2], open: false };
const MID_R = { el: [3.9, -9.8], wr: [4.6, -11.2], hand: [4.9, -11.8], open: true };
const HOLD_R = { el: [3.8, -10.9], wr: [4.2, -13.3], hand: [4.3, -14.0], open: false };
const OPEN_R = { ...HOLD_R, hand: [4.35, -14.2], open: true };
const WAVE_A = [-0.42, -0.12, 0.2, -0.12];
function waveArm(side, i) {
  const el = [side * 4.0, -10.9];
  const a = WAVE_A[i] * side;
  const hand = [el[0] + Math.sin(a) * 3.2, el[1] - Math.cos(a) * 3.2];
  return { el, wr: [lerp(el[0], hand[0], 0.78), lerp(el[1], hand[1], 0.78)], hand, open: true };
}
const ARMS = {
  DOWN_L, MID_L, DOWN_R, MID_R, HOLD_R, OPEN_R,
  WAVE_L0: waveArm(-1, 0), WAVE_L1: waveArm(-1, 1), WAVE_L2: waveArm(-1, 2), WAVE_L3: waveArm(-1, 3),
  WAVE_R0: waveArm(1, 0), WAVE_R1: waveArm(1, 1), WAVE_R2: waveArm(1, 2), WAVE_R3: waveArm(1, 3),
};

const BODY_BOX = [-8, -17.5, 16, 18.5];

function suitShape(g) {
  fillPoly(g, [
    -2.25, -12.0, 2.25, -12.0, 2.75, -10.2, 2.85, -8.2, 2.55, -6.2, 2.9, -3.2, 3.2, -1.0,
    0.45, -1.0, 0.2, -4.4, -0.2, -4.4, -0.45, -1.0, -3.2, -1.0, -2.9, -3.2, -2.55, -6.2,
    -2.85, -8.2, -2.75, -10.2,
  ], 0.1, 3);
  // Frilled ankles: the trouser hems flare into a scallop over the shoes.
  for (const s of [-1, 1]) {
    for (let j = 0; j < 3; j++) ellipse(g, s * (0.9 + j * 0.95), -1.05, 0.55, 0.45);
  }
}
function sleeveShape(A, side) {
  const sh = side < 0 ? SH_L : SH_R;
  return (g) => {
    ellipse(g, sh[0], sh[1] + 0.2, 1.05, 0.95);
    limb(g, [sh, A.el, A.wr], 1.75, 1.35, side < 0 ? 5 : 6);
  };
}
function cuffShape(A) {
  return (g) => {
    const a = Math.atan2(A.hand[1] - A.el[1], A.hand[0] - A.el[0]);
    ellipse(g, A.wr[0], A.wr[1], 0.55, 0.95, a);
  };
}
function gloveShape(A) {
  return (g) => {
    const [hx, hy] = A.hand;
    const a = Math.atan2(hy - A.wr[1], hx - A.wr[0]);
    ellipse(g, hx, hy, 0.85, 0.78, a);
    if (A.open) {
      // Fingers spread past the palm, a thumb out to the side.
      for (const [da, len, w] of [[-0.55, 1.25, 0.34], [-0.1, 1.4, 0.34], [0.35, 1.3, 0.34], [1.35, 0.95, 0.32]]) {
        const b = a + da;
        limb(g, [[hx + Math.cos(b) * 0.4, hy + Math.sin(b) * 0.4], [hx + Math.cos(b) * len, hy + Math.sin(b) * len]], w * 2, w * 1.6, 11);
      }
    } else {
      ellipse(g, hx + Math.cos(a) * 0.35, hy + Math.sin(a) * 0.35, 0.75, 0.7);
    }
  };
}

function bodyFrame(k, lk, rk) {
  return memo(`clown-body:${k}:${lk}:${rk}`, () => {
    const L = ARMS[lk];
    const R = ARMS[rk];
    return layered(k, BODY_BOX, [
      [suitShape, st(SUIT, 301, { g0: 0.15 })],
      // Big red shoes, toes turned out.
      [(g) => {
        ellipse(g, -2.3, -0.62, 1.95, 0.78, -0.08);
        ellipse(g, 2.3, -0.62, 1.95, 0.78, 0.08);
      }, st(RED, 303, { rim: 0.35 })],
      // Three pom-poms down the front.
      [(g) => {
        for (const y of [-10.3, -8.3, -6.3]) ellipse(g, 0.1, y, 0.62, 0.6);
      }, st(RED, 305, { rim: 0.28, rimA: 1, dabs: 0.1 })],
      [(g) => { sleeveShape(L, -1)(g); sleeveShape(R, 1)(g); }, st(SLEEVE, 307)],
      [(g) => { cuffShape(L)(g); cuffShape(R)(g); }, st(CUFF, 309, { rim: 0.25 })],
      [(g) => { gloveShape(L)(g); gloveShape(R)(g); }, st(GLOVE, 311, { rim: 0.25, dabs: 0.12 })],
      // The ruff: a big scalloped red collar round the neck, over the shoulders.
      [(g) => {
        const pts = [];
        const n = 22;
        for (let j = 0; j < n; j++) {
          const a = (j / n) * TAU;
          const r = j % 2 ? 1 : 0.8;
          pts.push(Math.cos(a) * 3.55 * r, -12.15 + Math.sin(a) * 1.45 * r);
        }
        fillPoly(g, pts, 0.06, 13);
      }, st(RED, 313, { rim: 0.32, dabs: 0.4 })],
    ], (g) => {
      // The ruff's pleats: a few darker folds radiating from the neck.
      g.fillStyle = css(RED.dark, 0.6);
      for (let j = 0; j < 7; j++) {
        const a = Math.PI * (0.1 + (j / 6) * 0.8);
        limb(g, [[Math.cos(a) * 1.4, -12.15 + Math.sin(a) * 0.6], [Math.cos(a) * 3.1, -12.15 + Math.sin(a) * 1.25]], 0.12, 0.3, 20 + j);
      }
      // Suit seams: a soft shadow down the middle, and under the ruff.
      g.fillStyle = css(SUIT.dark, 0.35);
      limb(g, [[0, -11], [0.05, -7.5], [0, -4.8]], 0.5, 0.3, 31);
      dab(g, 0, -10.9, 2.4, 0.5, 0);
    });
  });
}

// ------------------------------------------------------------------ the head
// Local coords about the neck pivot; the face centred at (0, -2.5), about 4.5 px across.
const HEAD_BOX = [-5, -7, 10, 7.6];
const FACE_C = [0, -2.5];
const EYES = [[-0.9, -3.25], [0.9, -3.25]];

function headSprite(k) {
  return memo(`clown-head:${k}`, () => layered(k, HEAD_BOX, [
    // Orange flame tufts: one on top, one out each side.
    [(g) => {
      fillPoly(g, [-1.25, -4.2, -1.55, -5.4, -0.85, -5.05, -0.35, -6.55, 0.3, -5.35, 1.05, -6.05, 1.35, -4.2], 0.05, 3);
      for (const s of [-1, 1]) {
        fillPoly(g, [
          s * 1.6, -4.3, s * 3.2, -5.2, s * 2.95, -4.35, s * 4.45, -4.15, s * 3.55, -3.35,
          s * 4.6, -2.55, s * 3.45, -2.25, s * 3.95, -1.25, s * 2.2, -1.55, s * 1.8, -2.6,
        ], 0.06, s > 0 ? 5 : 7);
      }
    }, st(HAIR, 321, { rim: 0.32, dabs: 0.4, dabAng: -1.2 })],
    // The face: a white egg, a little wider at the cheeks.
    [(g) => {
      ellipse(g, FACE_C[0], FACE_C[1], 2.3, 2.5);
      ellipse(g, 0, -1.6, 2.25, 1.72);
    }, st(FACE, 323, { rim: 0.3, rimA: 0.7, dabs: 0.12, dab: 0.35, g0: 0.2 })],
    // The round red nose.
    [(g) => ellipse(g, 0.05, -2.52, 0.66, 0.62), st(RED, 325, { rim: 0.26, rimA: 1, dabs: 0.05 })],
  ], (g) => {
    // Cheek dots.
    g.fillStyle = css(RED.body, 0.5);
    ellipse(g, -1.62, -2.35, 0.4, 0.34);
    ellipse(g, 1.62, -2.35, 0.4, 0.34);
    // Eye hollows: red-dark, slanted down to the nose so he glowers.
    g.fillStyle = css(HOLLOW, 0.92);
    ellipse(g, EYES[0][0] - 0.02, EYES[0][1] - 0.05, 0.86, 0.56, 0.45);
    ellipse(g, EYES[1][0] + 0.02, EYES[1][1] - 0.05, 0.86, 0.56, -0.45);
    // Brows: sharp strokes, high at the temples, stabbing down to the nose.
    g.fillStyle = css(mix(HOLLOW, [20, 10, 30], 0.4));
    limb(g, [[-1.95, -4.5], [-1.0, -4.0], [-0.25, -3.5]], 0.42, 0.24, 41);
    limb(g, [[1.95, -4.5], [1.0, -4.0], [0.25, -3.5]], 0.42, 0.24, 42);
    // The grin: a wide crescent, corners hooked up past the cheeks, full of teeth.
    const top = [];
    const bot = [];
    const M = 12;
    for (let j = 0; j <= M; j++) {
      const u = j / M;
      const x = -2.0 + 4.0 * u;
      const b = Math.sin(u * Math.PI);
      top.push([x, -2.2 + 0.5 * b]);
      bot.push([x, -2.2 + 1.85 * b]);
    }
    const corner = [[-2.25, -2.6], [2.25, -2.6]];
    const mouth = () => {
      g.beginPath();
      g.moveTo(corner[0][0], corner[0][1]);
      for (const [x, y] of top) g.lineTo(x, y);
      g.lineTo(corner[1][0], corner[1][1]);
      for (let j = M; j >= 0; j--) g.lineTo(bot[j][0], bot[j][1]);
      g.closePath();
    };
    g.fillStyle = css([48, 6, 22]);
    mouth();
    g.fill();
    // Teeth: an upper row hugging the top lip and a lower row along the bottom one,
    // split by dark gaps.
    g.save();
    mouth();
    g.clip();
    g.fillStyle = css([236, 230, 206]);
    const band = (pts, dy) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1] - 0.3);
      for (const [x, y] of pts) g.lineTo(x, y - 0.3);
      for (let j = pts.length - 1; j >= 0; j--) g.lineTo(pts[j][0], pts[j][1] + dy);
      g.closePath();
      g.fill();
    };
    band(top, 0.62);
    band(bot.map(([x, y]) => [x, y - 0.42]), 0.42);
    g.fillStyle = css([48, 6, 22], 0.9);
    for (let j = 1; j < 9; j++) {
      const x = -2.0 + 4.0 * (j / 9);
      g.fillRect(x - 0.075, -2.8, 0.15, 3);
    }
    g.restore();
  }));
}

// ------------------------------------------------------------------ the balloon
// Centre (0, 0), 6 px across; the knot at its foot, (0, 3.35).
function balloonSprite(k) {
  return memo(`clown-balloon:${k}`, () => massSprite(k, [-4, -4.5, 8, 9], (g) => {
    ellipse(g, 0, -0.1, 2.95, 3.25);
    fillPoly(g, [-0.55, 3.55, 0.55, 3.55, 0.12, 2.9, -0.12, 2.9]);
  }, { ...BALLOON, rim: 0.55, rimA: 0.9, dabs: 0.2, dab: 0.6, dabAng: -0.8, seed: 331, g0: 0.2 }, (g) => {
    // The moon caught on its shoulder: one soft highlight, upper right.
    g.fillStyle = css([255, 222, 226], 0.55);
    dab(g, 1.15, -1.55, 0.75, 0.45, -0.8);
    g.fillStyle = css([255, 236, 238], 0.8);
    dab(g, 1.35, -1.75, 0.3, 0.2, -0.8);
  }));
}

function glowSprite(k) {
  return memo(`clown-glow:${k}`, () => {
    const r = 3;
    const c = canvas(2 * r * k, 2 * r * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, css(EYE, 1));
    gr.addColorStop(0.35, css(EYE, 0.45));
    gr.addColorStop(1, css(EYE, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 2 * r, 2 * r);
    return c;
  });
}

// ------------------------------------------------------------------ the frame
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

function paintClown(ctx, f) {
  if (f.stageIndex !== 2) return;
  const fy = footAt(f, f.x, 3) + 0.6;
  ctx.save();
  ctx.translate(f.x, fy);
  ctx.scale(CLOWN_SCALE, CLOWN_SCALE);
  ctx.translate(-f.x, -fy);
  paintClownAt(ctx, f);
  ctx.restore();
}

function paintClownAt(ctx, f) {
  if (!(f.shift < FIRST_PASS_END)) return;
  // The first pass only: the instance whose layer position is this u, not u + period.
  if (Math.round((f.x + f.shift - CLOWN_U) / PERIOD) !== 0) return;
  const k = bakeScale(ctx);
  const t = f.t;
  const x = f.x;
  const y = footAt(f, x, 3) + 0.6;
  // Just before the hero reaches him (Peter, 26 Sep: "release the balloon just before the
  // hero reaches him"): ~45 px ahead of the hero's place in the picture, where the pack
  // says it is; RELEASE_X is the fallback for a card that has no hero.
  const releaseAt = Number.isFinite(f.view?.heroX) ? f.view.heroX + 45 : RELEASE_X;
  // He holds his quiet pose on the right, then starts the free-hand wave as he reaches
  // the middle of the picture. Keep the threshold in this pass's local screen units so
  // the cue follows the visible landscape frame instead of an elapsed-time cycle.
  const screenMid = Number.isFinite(f.view?.left) && Number.isFinite(f.view?.right)
    ? (f.view.left + f.view.right) * 0.5
    : releaseAt + 120;
  // If a narrower framing puts the hero past screen center, still leave a short
  // near-hero beat for the free-hand wave before the balloon-release transition.
  const waveAt = Math.max(screenMid, releaseAt + 24);
  const d = Math.max(0, releaseAt - x);
  const gone = d > 0;
  // Goodbye belongs to his exit, not to the balloon release. Leave a quiet beat
  // after opening/lowering the hand, then wave over the last visible stretch.
  const left = Number.isFinite(f.view?.left) ? f.view.left : 0;
  const goodbyeAt = Math.min(releaseAt - 40, left + 48);

  // Arms.
  let lk = 'DOWN_L';
  let rk = 'HOLD_R';
  const wf = Math.floor(wrap(t * 7, 4));
  if (!gone) {
    // Raise the arm as he enters the middle, then wave while he approaches the hero.
    if (x <= waveAt + 20) lk = x <= waveAt ? `WAVE_L${wf}` : 'MID_L';
  } else if (d < 14) rk = 'OPEN_R';
  else if (d < 22) rk = 'MID_R';
  else if (x <= goodbyeAt) rk = `WAVE_R${wf}`;
  else if (x <= goodbyeAt + 10) rk = 'MID_R';
  else rk = 'DOWN_R';
  const body = bodyFrame(k, lk, rk);

  // Sway about the feet.
  const sway = 0.03 * Math.sin(t * 1.25) + 0.012 * Math.sin(t * 2.9 + 0.4);
  const toScreen = (p) => { const q = rot(p, sway); return [x + q[0], y + q[1]]; };

  // The balloon: bobbing on its string above the raised fist, then let go.
  const hand0 = toScreen(ARMS.HOLD_R.hand);
  const bobX = 1.1 + 0.9 * Math.sin(t * 1.3) + 0.3 * Math.sin(t * 2.7 + 1);
  const bobY = 0.5 * Math.sin(t * 1.7 + 0.6);
  const free = smooth(d / 18);
  // Let go, it FLOATS (Peter: "the balloon should float up slowly and drift... it does not
  // need to leave the top of the screen"): a rise that eases off toward ~75 px above his
  // hand and then only creeps, a slow drift out to his right, and a lazy sway.
  const drift = gone ? (3.2 * Math.sin(t * 0.6 + 0.3) + 1.2 * Math.sin(t * 1.3)) * smooth(d / 30) : 0;
  const rise = 75 * (1 - Math.exp(-d / 110)) + 0.06 * d;
  const away = 34 * (1 - Math.exp(-d / 140)) + 0.1 * d;
  const knot = [
    hand0[0] + bobX + away + drift,
    hand0[1] - Math.sqrt(STRING * STRING - bobX * bobX) + bobY - rise,
  ];
  const tiltB = Math.atan2(knot[0] - hand0[0], hand0[1] - knot[1]) * 0.5 * (1 - free)
    + (0.12 * Math.sin(t * 1.05 + 1.2)) * free;

  // Head: a slow idle tilt; once the balloon is away, he turns his head up after it.
  const neck = toScreen(NECK);
  const toB = [knot[0] - neck[0], knot[1] - 3.3 - neck[1]];
  const look = smooth(d / 16);
  const aim = Math.max(-0.1, Math.min(0.38, Math.atan2(toB[0], -toB[1]) * 0.55));
  const tilt = lerp(0.09 * Math.sin(t * 0.7 + 0.5) + 0.03 * Math.sin(t * 1.9), aim, look) + sway;
  const gdir = Math.hypot(toB[0], toB[1]) || 1;
  const gaze = [lerp(0.12 * Math.sin(t * 0.45), 0.2 * toB[0] / gdir, look), lerp(0.04, 0.22 * toB[1] / gdir, look)];

  // String: before release a slack curve from fist to knot; after, a loose trailing line
  // that waves below the balloon.
  ctx.strokeStyle = css(STRING_COL, 0.7);
  ctx.lineWidth = 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const N = 9;
  for (let j = 0; j <= N; j++) {
    const s = j / N; // 0 at the knot, 1 at the far end
    const pinned = [lerp(knot[0], hand0[0], s) + Math.sin(s * Math.PI) * (0.9 + 0.5 * Math.sin(t * 1.9)),
      lerp(knot[1], hand0[1], s)];
    const trail = [knot[0] - 3.2 * s * s + Math.sin(s * 5.5 - t * 3.6) * 1.0 * s,
      knot[1] + STRING * (0.97 - 0.05 * s) * s];
    const px = lerp(pinned[0], trail[0], free);
    const py = lerp(pinned[1], trail[1], free);
    if (j === 0) ctx.moveTo(px, py + 0.1);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Body, head, eyes.
  const spr = body;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.drawImage(spr.c, spr.x, spr.y, spr.w, spr.h);
  ctx.restore();

  const head = headSprite(k);
  ctx.save();
  ctx.translate(neck[0], neck[1]);
  ctx.rotate(tilt);
  ctx.drawImage(head.c, head.x, head.y, head.w, head.h);
  // Yellow eyes; now and then they catch the light and glint.
  const cyc = Math.floor(t / 3.1);
  const ph = t - cyc * 3.1;
  const g = hash(cyc * 7.3 + 1.1) < 0.75 ? Math.max(0, 1 - Math.abs(ph - 0.35 - hash(cyc * 3.1) * 1.6) / 0.22) : 0;
  const glint = gone && d < 30 ? Math.max(g, 1 - d / 30) : g;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16 + 0.32 * glint;
  const halo = glowSprite(k);
  for (const [ex, ey] of EYES) {
    const r = 0.85 + 0.55 * glint;
    ctx.drawImage(halo, ex + gaze[0] - r, ey + gaze[1] - r, 2 * r, 2 * r);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = css(mix(EYE, [255, 250, 220], 0.6 * glint));
  for (const [ex, ey] of EYES) ellipse(ctx, ex + gaze[0], ey + gaze[1], 0.34, 0.3);
  if (glint > 0.3) {
    ctx.globalAlpha = glint;
    ctx.fillStyle = css([255, 255, 240]);
    for (const [ex, ey] of EYES) ellipse(ctx, ex + gaze[0] + 0.14, ey + gaze[1] - 0.12, 0.13, 0.13);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // The balloon, last: in front of anything it rises past.
  const top = f.view && Number.isFinite(f.view.top) ? f.view.top : -400;
  if (knot[1] > top - 20) {
    const b = balloonSprite(k);
    ctx.save();
    ctx.translate(knot[0], knot[1]);
    ctx.rotate(tiltB);
    ctx.drawImage(b.c, b.x, b.y - 3.35, b.w, b.h);
    ctx.restore();
  }
}

// Bake him ahead of time (for a warm-up job), at the scale a frame will ask for.
export function warmClown(ctx) {
  const k = bakeScale(ctx);
  headSprite(k);
  balloonSprite(k);
  for (const lk of ['DOWN_L', 'MID_L', 'WAVE_L0', 'WAVE_L1', 'WAVE_L2', 'WAVE_L3']) bodyFrame(k, lk, 'HOLD_R');
  for (const rk of ['OPEN_R', 'WAVE_R0', 'WAVE_R1', 'WAVE_R2', 'WAVE_R3', 'MID_R', 'DOWN_R']) bodyFrame(k, 'DOWN_L', rk);
}

export const CLOWN = {
  // `reach`: drawn while even his balloon, well up and to his right, is still in view.
  id: 'mid-clown', name: 'BALLOON CLOWN', layer: 'mid', when: 'on', u: CLOWN_U, focusUp: 16, zoom: 4, reach: 360,
  note: 'At the start of crypt-2 a small, grinning clown stands on the graveyard hill with a red balloon, swaying and eyes glinting. As he reaches the middle of the picture he raises his free hand and waves; near the hero he lets go, the balloon floats up and away, he lowers his hand, then waves goodbye with the other hand just before scrolling off the left edge.',
  paint: paintClown,
};
