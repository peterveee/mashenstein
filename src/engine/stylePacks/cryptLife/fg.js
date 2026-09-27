// CRYPT SHIFT — more life in the graveyard: THE NEAR BANK (layer 'fg'). Lab bake-off
// candidates (see scene.js for the idea interface and the two cards). Five creatures, each
// anchored to something the shipped bank already holds, so it lives where the painting
// put a perch for it:
//
//   OWL     on the crest of the first gnarled tree's lower main bough (u 22)
//   CROWS   on the spear tips of the railing run left of the second gate (1900..2051)
//   MOTHS   round the gas lamp at u 1262
//   SPIDER  in the crook under the big limb of the small flipped gnarl (u 760)
//   RATS    along the foot of the last railing run (2700..2900)
//
// Every creature is painted with the backdrop's own kit (GOUACHE_KIT): opaque near-black
// violet masses, dabbed, with the moonlit rim on the edges that face the moon (upper
// right). Poses are baked once per scale as separate massSprites — facing left is its own
// bake, never a mirrored blit, so the rim stays on the moon side. A frame is blits plus a
// few small live shapes (eyes, glints, moth wings, threads, tails). Deterministic: all
// motion is a function of f.t on cycles of a few seconds, with idle beats between actions.
import { GOUACHE_KIT as K } from '../cryptGouache.js';

const { massSprite, limb, dab, fillPoly, curve, canvas, css, mix, hash, vnoise, SCENE } = K;
const TAU = Math.PI * 2;
const FG = SCENE.fg;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
const loop = (t, T) => ((t % T) + T) % T;

// Eased keyframe track: keys [[t, v], ...], held before the first and after the last.
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

// ------------------------------------------------------------------ bake cache
// One bake per creature per scale. The scale is the context's, capped at 3: the style is
// soft, and a 3x close-up of a 3x bake is still paint.
function bakeScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const k = m && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}
const CACHE = new Map();
function baked(name, ctx, build) {
  const r = bakeScale(ctx);
  const key = `${name}@${r}`;
  let v = CACHE.get(key);
  if (!v) {
    v = build(r);
    CACHE.set(key, v);
  }
  return v;
}

function put(ctx, spr, x, y) {
  ctx.drawImage(spr.c, x + spr.x, y + spr.y, spr.w, spr.h);
}

// A soft round dot in one colour, for eyes, glints and breath.
function glowSprite(r, col) {
  const S = 8;
  const c = canvas(S * r, S * r);
  const g = c.getContext('2d');
  const h = (S * r) / 2;
  const gr = g.createRadialGradient(h, h, 0, h, h, h);
  gr.addColorStop(0, css(col, 1));
  gr.addColorStop(0.28, css(col, 0.55));
  gr.addColorStop(0.6, css(col, 0.14));
  gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, S * r, S * r);
  return c;
}
function glow(ctx, c, x, y, d, a) {
  if (a <= 0.004) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(c, x - d / 2, y - d / 2, d, d);
  ctx.globalAlpha = 1;
}

function ell(g, x, y, rx, ry, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
  g.fill();
}

// The creatures' ink: the gnarl's near-black violet, with a rim a touch brighter than the
// bank's so a 6-14 px body still shows its moon side at game scale.
const INK = { body: [30, 23, 46], dark: [14, 10, 26], lit: [118, 120, 172] };
const inkStyle = (seed, o = {}) => ({
  body: INK.body, dark: INK.dark, lit: INK.lit, rim: 0.45, rimA: 0.85, dabs: 0.6, dab: 0.55, dabAng: 0, seed, g0: 0.15, ...o,
});

// ------------------------------------------------------------------ anchors
// Where the shipped strip put a gnarl's base, on screen: stripSteps' foot(u, 8*s) + sink 3.
function gnarlBase(f, ideaU, treeU, s) {
  const x = f.x + (treeU - ideaU);
  const half = 8 * s;
  let y = -Infinity;
  for (let d = -half; d <= half; d += 2) y = Math.max(y, f.ridgeY(x + d));
  return [x, y + 3];
}

// The top edge of one of the gnarl's brush limbs at local x: the same curve and width
// law as the kit's `limb`, so a perch sits exactly on the painted bark.
function limbTop(pts, w0, w1, seed, x) {
  const c = curve(pts);
  const L = c[c.length - 1][2] || 1;
  let i = 0;
  let bd = Infinity;
  for (let j = 0; j < c.length; j++) {
    const d = Math.abs(c[j][0] - x);
    if (d < bd) { bd = d; i = j; }
  }
  const a = c[Math.max(0, i - 1)];
  const b = c[Math.min(c.length - 1, i + 1)];
  const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const tx = (b[0] - a[0]) / tl;
  const t = c[i][2] / L;
  const w = (w0 + (w1 - w0) * Math.pow(t, 0.75)) * (1 + 0.16 * vnoise(c[i][2] / 3 + seed * 3.1, seed)) * 0.5;
  return c[i][1] - Math.abs(tx) * w;
}

const fenceIndex = (u) => FG.items.findIndex((it) => it.kind === 'fence' && it.u === u);


// ================================================================== OWL
// At the crest of the first gnarl's lower main bough, where the rising trunk turns into
// the rightward limb. The raised fork beside the wing is omitted, leaving open sky ahead.
const OWL_TREE = 22;
const OWL_AT = 24;
const OWL_U = OWL_TREE + OWL_AT;
const OWL_LIMB = [[2, -50], [14, -60], [24, -66], [44, -64], [58, -74]];
const OWL_T = 12;
const OWL_HEADS = 24;
// Head angle in turns (0 front, 0.25 looking right, 0.5 the back of its head, 0.75 left).
const OWL_HEAD = [
  [0, 0], [0.55, 0], [0.85, 0.25], [1.1, 0.25], [1.35, 0.5], [1.8, 0.5], [2.1, 0.75], [2.3, 0.75], [2.5, 1],
  [7.9, 1], [8.15, 0.87], [8.9, 0.87], [9.1, 1], [10.3, 1], [10.5, 1.09], [11.1, 1.09], [11.3, 1], [12, 1],
];
const OWL_BLINKS = [0.3, 2.62, 6.5, 6.72, 7.9, 9.4, 11.6];
const OWL_HOOTS = [[2.85, 3.3], [3.4, 3.95]];
const OWL_GLINTS = [[2.45, 2.85], [10.5, 11.1]];

let owlPerch = null;
function owlKit(r) {
  const body = massSprite(r, [-5.5, -10.5, 11, 12], (g) => {
    ell(g, 0, -4.5, 3.6, 4.4);
    ell(g, 0, -2.7, 4.0, 2.9);
    // Talons over the bark.
    ell(g, -1.3, 0.1, 0.9, 0.75);
    ell(g, 1.3, 0.1, 0.9, 0.75);
  }, inkStyle(11), (g, R) => {
    // The folded wings: a darker sweep down each flank, and the breast mottled paler.
    g.fillStyle = css(INK.dark, 0.4);
    dab(g, -2.2, -4.2, 0.9, 3.2, 0.15);
    dab(g, 1.9, -4.4, 0.7, 2.8, -0.15);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = css([92, 86, 128], 0.22 + R() * 0.2);
      dab(g, (R() - 0.5) * 3.2, -7 + R() * 5.5, 0.22, 0.55, (R() - 0.5) * 0.4);
    }
  });

  const heads = [];
  for (let k = 0; k < OWL_HEADS; k++) {
    const th = (k / OWL_HEADS) * TAU;
    const sn = Math.sin(th);
    const cs = Math.cos(th);
    heads.push(massSprite(r, [-5.5, -16, 11, 9.5], (g) => {
      ell(g, 0.2 * sn, -10.2, 3.9 - 0.3 * Math.abs(sn), 3.0);
      // Ear tufts, at the corners of the crown: they close together as the head turns.
      for (const side of [-1, 1]) {
        const x = side * 2.55 * cs;
        const tip = x + side * 0.95 * cs - 0.7 * sn;
        fillPoly(g, [x - 0.65, -11.7, tip, -14.9, x + 0.65, -11.9]);
      }
      // In profile the hooked beak breaks the round of the head.
      if (Math.abs(sn) > 0.5 && cs > -0.3) {
        const d = Math.sign(sn);
        fillPoly(g, [3.0 * d, -10.6, 4.0 * d, -10.0, 3.8 * d, -9.0, 3.0 * d, -9.3]);
      }
    }, inkStyle(40 + k, { dark: [24, 18, 38], g0: 0.4 }), (g) => {
      if (cs > -0.15) {
        // The facial disc, a shade paler, sliding round with the face.
        const cx = 2.0 * sn;
        const rx = 2.7 * (0.3 + 0.7 * Math.max(0, cs)) + 0.35;
        g.fillStyle = css([58, 52, 86], 0.8 * clamp01(cs + 0.3));
        ell(g, cx, -10.1, rx, 2.35);
        g.fillStyle = css(INK.dark, 0.9);
        const bx = 3.0 * sn;
        if (cs > 0) fillPoly(g, [bx - 0.42, -10.3, bx + 0.42, -10.3, bx + 0.1 * sn, -9.0]);
      } else {
        // The back of the head: nape streaks.
        g.fillStyle = css(INK.dark, 0.5);
        for (let i = -1; i <= 1; i++) dab(g, i * 1.1 - 0.4 * sn, -9.8, 0.3, 1.4, 0);
      }
    }));
  }

  const throat = massSprite(r, [-3, -9.4, 6, 4.4], (g) => ell(g, 0, -7.3, 2.2, 1.6),
    { body: [74, 68, 104], dark: [46, 40, 70], lit: [150, 150, 190], rim: 0.35, rimA: 0.7, dabs: 0.4, dab: 0.4, seed: 70, g0: 0.2 });

  // The stretch: mirror the original left wing across its shoulder. It opens straight to
  // screen right (3 o'clock), with the feather edge staying on the same side of the wing.
  // The short twig ends under the body, clear of the outstretched silhouette.
  const wings = [0.2, 0.4, 0.6, 0.8, 1].map((a, j) => massSprite(r, [-5, -21, 19, 23], (g) => {
    const L = lerp(5.5, 11.5, a);
    const W = lerp(2.2, 4.4, a);
    const p = (u, v) => [2.3 + u, -7.0 + v];
    const pts = [];
    for (const [u, v] of [[0, -0.7], [L * 0.35, -1.0], [L * 0.72, -0.75], [L, 0.1]]) pts.push(...p(u, v));
    for (let i = 0; i < 5; i++) {
      const u = L * (0.97 - i * 0.085);
      pts.push(...p(u - 0.2, W * 0.5 + i * 0.36));
      pts.push(...p(u - 0.95, W * 0.2 + i * 0.26));
    }
    pts.push(...p(L * 0.45, W), ...p(L * 0.22, W * 1.05), ...p(0, W * 0.8));
    fillPoly(g, pts, 0.1, 60 + j);
  }, inkStyle(80 + j), (g, R) => {
    g.fillStyle = css([92, 86, 128], 0.25);
    for (let i = 0; i < 8; i++) dab(g, 2 + R() * 10 * a, -7 + R() * 6 * a, 0.9, 0.2, 0.4);
  }));

  return {
    body, heads, throat, wings,
    amber: glowSprite(r, [255, 186, 92]),
    white: glowSprite(r, [255, 250, 232]),
    breath: glowSprite(r, [206, 214, 238]),
    pale: glowSprite(r, [168, 168, 204]),
  };
}

function owlEyes(ctx, O, x, y, th, open, glint) {
  for (const side of [-1, 1]) {
    const az = th + side * 0.45;
    const c = Math.cos(az);
    if (c < 0.2) continue;
    const ex = x + 2.9 * Math.sin(az);
    const ey = y - 10.2;
    glow(ctx, O.amber, ex, ey, 3.0, 0.22 * c * (0.3 + 0.7 * open));
    if (open < 0.08) continue;
    ctx.fillStyle = css([248, 188, 96], 0.92);
    ell(ctx, ex, ey, 0.5 * c + 0.07, 0.5 * open);
    ctx.fillStyle = css([24, 14, 12], 0.8);
    ell(ctx, ex + 0.1 * Math.sin(az), ey, 0.2 * c + 0.04, 0.22 * open);
    if (glint > 0) glow(ctx, O.white, ex + 0.25, ey - 0.25, 1.1 + 1.5 * glint, 0.3 + 0.45 * glint);
  }
}

function paintOwl(ctx, f) {
  const O = baked('owl', ctx, owlKit);
  if (owlPerch == null) owlPerch = limbTop(OWL_LIMB, 8, 1.2, 2, OWL_AT);
  const [bx, by] = gnarlBase(f, OWL_U, OWL_TREE, 1);
  const x = bx + OWL_AT;
  const y = by + owlPerch + 0.5;
  const t = loop(f.t, OWL_T);

  const turn = track(OWL_HEAD, t);
  const k = ((Math.round(turn * OWL_HEADS) % OWL_HEADS) + OWL_HEADS) % OWL_HEADS;
  const th = (k / OWL_HEADS) * TAU;
  let blink = 0;
  for (const b of OWL_BLINKS) blink = Math.max(blink, bump(t, b, b + 0.16));
  let puff = 0;
  for (const [a, b] of OWL_HOOTS) puff = Math.max(puff, bump(t, a, b));
  let glint = 0;
  for (const [a, b] of OWL_GLINTS) glint = Math.max(glint, bump(t, a, b));
  const wing = smooth(ramp(t, 4.05, 4.45)) * (1 - smooth(ramp(t, 5.5, 6.0)));

  if (wing > 0.1) put(ctx, O.wings[Math.max(0, Math.min(4, Math.round(wing * 5) - 1))], x, y);
  put(ctx, O.body, x, y);
  if (puff > 0.02) {
    const sc = 0.55 + 0.65 * puff;
    const S = O.throat;
    const cy = -7.3;
    ctx.drawImage(S.c, x + S.x * sc, y + cy + (S.y - cy) * sc, S.w * sc, S.h * sc);
    glow(ctx, O.pale, x, y - 7.3, 2.6 + 1.8 * puff, 0.6 * puff);
  }
  const hx = -0.35 * wing;
  const hy = 0.7 * puff;
  put(ctx, O.heads[k], x + hx, y + hy);
  owlEyes(ctx, O, x + hx, y + hy, th, 1 - blink, glint);

  // Breath: each hoot leaves a little cloud that rises off the beak and drifts to the
  // right on the air, thinning as it goes.
  for (const [a] of OWL_HOOTS) {
    const age = t - a - 0.05;
    if (age < 0 || age > 1.9) continue;
    for (let i = 0; i < 2; i++) {
      const g = age - i * 0.12;
      if (g < 0) continue;
      const fade = Math.min(1, g * 5) * Math.pow(1 - g / 1.9, 1.5);
      glow(ctx, O.breath, x + 0.8 + 3.8 * g + i * 0.6, y - 9.0 - 2.6 * g - i * 0.4, 2.6 + 5.5 * g, 0.42 * fade);
    }
  }
}


// ================================================================== CROWS
// Three on the spear tips of the run left of the second gate. They peck, one hops along a
// post or two, the middle one caws (beak open, hackles up, bowing on each caw), and the
// right-hand one flaps off round a loop and lands back on its post.
const CROW_FENCE = 1900;
const CROW_U = 1984;
const CROW_T = 14;
const CROWS = [
  { k: 9, dir: 1, script: [
    [0.05, 0.3, 'peck'], [0.55, 0.8, 'peck'], [2.75, 3.1, 'hop', 10], [4.75, 4.95, 'turn'], [5.3, 5.65, 'hop', 9],
    [7.0, 7.2, 'turn'], [8.0, 8.25, 'peck'], [8.4, 8.65, 'peck'], [12.2, 12.45, 'peck'],
  ] },
  { k: 12, dir: 1, script: [
    [1.1, 2.0, 'caw'], [2.0, 2.3, 'shut'], [3.7, 3.9, 'turn'], [3.95, 4.55, 'caw'], [4.55, 4.8, 'shut'],
    [6.6, 6.8, 'turn'], [9.4, 9.65, 'peck'], [9.85, 10.1, 'peck'],
  ] },
  { k: 15, dir: 1, script: [
    [3.35, 3.75, 'crouch'], [3.75, 6.45, 'fly'], [6.45, 6.8, 'land'], [7.6, 7.8, 'turn'],
    [10.4, 11.3, 'caw'], [11.3, 11.55, 'shut'], [12.6, 12.85, 'peck'],
  ] },
];
// The loop the right-hand crow flies, relative to its post's tip: up and away to the
// right, round, and a glide back in to land facing the way it came.
const CROW_PATH = [[0, 0], [3, -5], [10, -13], [22, -20], [34, -22], [43, -17], [42, -10], [33, -6.5], [20, -5.5], [9, -4], [2.5, -1.8], [0, 0]];
let crowPath = null;

function crowParts(g, pose) {
  const body = (x, y, rx, ry, rot) => ell(g, x, y, rx, ry, rot);
  const legs = (h) => {
    g.fillRect(-0.45, -h, 0.5, h);
    g.fillRect(0.6, -h, 0.5, h);
    g.fillRect(-1.1, -0.35, 2.5, 0.42);
  };
  if (pose === 'stand') {
    body(-0.5, -4.4, 3.3, 2.3, -0.45);
    body(1.4, -5.7, 1.5, 1.3, -0.6);
    body(2.3, -7.0, 1.65, 1.5);
    fillPoly(g, [3.3, -7.8, 6.2, -6.9, 3.4, -5.9]);
    fillPoly(g, [-2.6, -3.8, -6.5, -0.9, -5.6, -0.1, -1.6, -2.3]);
    body(0.3, -2.6, 1.4, 1.0);
    legs(2.6);
  } else if (pose === 'peck') {
    body(0.2, -4.0, 3.3, 2.3, 0.28);
    body(2.4, -3.6, 1.5, 1.4, 0.6);
    body(3.4, -3.3, 1.55, 1.45);
    fillPoly(g, [3.5, -2.3, 4.6, 0.3, 2.7, -2.1]);
    fillPoly(g, [-2.3, -5.0, -6.0, -7.2, -6.3, -6.2, -1.9, -3.8]);
    body(0.4, -2.5, 1.4, 1.0);
    legs(2.5);
  } else if (pose === 'caw' || pose === 'shut') {
    // Bowed forward, wings drooped, tail cocked: a crow puts its whole body into a caw.
    body(-0.3, -4.1, 3.3, 2.3, -0.1);
    body(-0.6, -3.1, 2.9, 1.4);
    body(1.8, -5.4, 1.5, 1.3, -0.3);
    body(3.1, -6.1, 1.6, 1.5);
    if (pose === 'caw') {
      fillPoly(g, [4.0, -7.1, 6.8, -8.1, 4.2, -6.2]);
      fillPoly(g, [3.9, -5.6, 6.3, -4.4, 3.4, -5.0]);
    } else {
      fillPoly(g, [4.0, -6.9, 6.6, -6.0, 4.1, -5.3]);
    }
    // Hackles: the throat feathers raised in spikes.
    fillPoly(g, [1.6, -5.2, 1.8, -3.3, 2.5, -4.7]);
    fillPoly(g, [2.3, -5.2, 2.9, -3.4, 3.3, -4.7]);
    fillPoly(g, [3.1, -5.2, 3.9, -3.8, 4.0, -4.9]);
    fillPoly(g, [-2.6, -3.7, -6.3, -3.4, -6.3, -2.4, -2.0, -2.3]);
    body(0.3, -2.6, 1.4, 1.0);
    legs(2.6);
  } else if (pose === 'hop') {
    body(-0.3, -3.8, 3.3, 2.2, -0.3);
    body(1.5, -5.0, 1.5, 1.3, -0.5);
    body(2.4, -6.0, 1.55, 1.45);
    fillPoly(g, [3.4, -6.7, 6.1, -5.9, 3.5, -5.0]);
    fillPoly(g, [-2.6, -3.3, -6.3, -1.5, -5.8, -0.7, -1.7, -2.1]);
    // Wings half lifted off the back.
    fillPoly(g, [0.8, -5.2, -1.5, -8.5, -4.2, -9.6, -5.9, -8.3, -4.4, -7.7, -5.3, -6.8, -2.0, -4.6], 0.08, 5);
    legs(1.6);
  } else {
    // In flight: the body level, the far wing up, level or down.
    body(-0.3, -4.0, 3.4, 1.75, -0.06);
    body(2.9, -4.7, 1.45, 1.35);
    fillPoly(g, [4.0, -5.3, 6.4, -4.6, 4.1, -3.9]);
    fillPoly(g, [-2.8, -4.5, -6.6, -5.5, -7.0, -3.3, -2.8, -3.2]);
    if (pose === 'up' || pose === 'land') {
      fillPoly(g, [1.2, -4.9, -0.2, -8.8, -1.8, -11.8, -2.6, -11.0, -3.2, -11.4, -3.7, -10.3, -4.2, -10.2, -3.4, -7.4, -1.6, -4.4], 0.08, 7);
    } else if (pose === 'mid') {
      fillPoly(g, [1.1, -5.0, -1.2, -7.5, -4.9, -8.2, -3.5, -6.4, -1.2, -4.3], 0.08, 8);
    } else {
      fillPoly(g, [1.1, -3.7, -0.4, -0.8, -1.8, 1.5, -2.7, 0.9, -3.3, 1.3, -3.4, -0.3, -2.7, -2.2, -1.4, -3.4], 0.08, 9);
    }
    if (pose === 'land') {
      g.fillRect(0.2, -3.0, 0.5, 2.6);
      g.fillRect(1.0, -3.0, 0.5, 2.4);
    }
  }
}

const CROW_POSES = ['stand', 'peck', 'caw', 'shut', 'hop', 'up', 'mid', 'down', 'land'];
function crowKit(r) {
  const out = {};
  for (const pose of CROW_POSES) {
    for (const dir of [1, -1]) {
      out[pose + dir] = massSprite(r, [-9, -13, 18, 15], (g) => {
        g.scale(dir, 1);
        crowParts(g, pose);
      }, inkStyle(90, { rim: 0.3, rimA: 0.75, dabs: 0.4, body: [26, 20, 40] }));
    }
  }
  out.glint = glowSprite(r, [220, 226, 250]);
  return out;
}

// Where crow `c` is and what it is doing at loop time t.
function crowState(c, t) {
  let k = c.k;
  let dir = c.dir;
  for (const [t0, t1, act, arg] of c.script) {
    if (t < t0) break;
    const p = ramp(t, t0, t1);
    if (t < t1) {
      if (act === 'peck') return { k, dir, dy: 0, pose: p > 0.15 && p < 0.85 ? 'peck' : 'stand' };
      if (act === 'caw') return { k, dir, dy: 0.3 * bump((t - t0) % 0.3, 0, 0.3), pose: (t - t0) % 0.3 < 0.15 ? 'caw' : 'shut' };
      if (act === 'shut') return { k, dir, dy: 0, pose: 'shut' };
      if (act === 'crouch') return { k, dir, dy: 0.5 * smooth(p), pose: 'hop' };
      if (act === 'hop') return { k: lerp(k, arg, smooth(p)), dir: Math.sign(arg - k) || dir, dy: -3.2 * Math.sin(Math.PI * p), pose: 'hop' };
      if (act === 'turn') return { k, dir: p < 0.5 ? dir : -dir, dy: -1.2 * Math.sin(Math.PI * p), pose: 'hop' };
      if (act === 'land') return { k, dir: -1, dy: 0, pose: p < 0.5 ? 'hop' : 'stand' };
      if (act === 'fly') return { k, fly: p, dir, pose: 'mid' };
    }
    if (act === 'hop') k = arg;
    if (act === 'turn') dir = -dir;
    if (act === 'fly' || act === 'land') dir = -1;
  }
  return { k, dir, dy: 0, pose: 'stand' };
}

function crowTip(f, k, fi) {
  const u = CROW_FENCE + 7 * k;
  const xb = f.x + (u - CROW_U);
  const tilt = vnoise((u - CROW_FENCE) / 5, 3 + fi) * 0.6;
  return [xb + tilt, f.ridgeY(xb) - 26];
}

function paintCrows(ctx, f) {
  const S = baked('crows', ctx, crowKit);
  if (!crowPath) {
    const c = curve(CROW_PATH, 0.5);
    crowPath = { c, L: c[c.length - 1][2] };
  }
  const fi = fenceIndex(CROW_FENCE);
  const t = loop(f.t, CROW_T);
  for (const c of CROWS) {
    const st = crowState(c, t);
    let x;
    let y;
    let pose = st.pose;
    let dir = st.dir;
    if (st.fly != null) {
      const [x0, y0] = crowTip(f, c.k, fi);
      const s = st.fly;
      const e = s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
      const want = (0.15 * s + 0.85 * e) * crowPath.L;
      const P = crowPath.c;
      let i = 1;
      while (i < P.length - 1 && P[i][2] < want) i++;
      x = x0 + P[i][0];
      y = y0 + P[i][1];
      const dx = P[Math.min(P.length - 1, i + 2)][0] - P[Math.max(0, i - 2)][0];
      dir = dx >= 0 ? 1 : -1;
      if (s > 0.9) pose = 'land';
      else if (s > 0.62) pose = Math.floor(f.t * 3) % 3 === 0 ? ['up', 'mid', 'down', 'mid'][Math.floor(f.t * 14) % 4] : 'mid';
      else pose = ['up', 'mid', 'down', 'mid'][Math.floor(f.t * 16) % 4];
    } else {
      const k0 = Math.floor(st.k);
      const fr = st.k - k0;
      const [xa, ya] = crowTip(f, k0, fi);
      const [xb, yb] = fr > 0 ? crowTip(f, k0 + 1, fi) : [xa, ya];
      x = lerp(xa, xb, fr);
      y = lerp(ya, yb, fr) + st.dy + 0.3;
    }
    put(ctx, S[pose + dir], x, y);
  }
}


// ================================================================== MOTHS
// A handful round the lamp at u 1262: each on its own tilted, wandering orbit, fluttering,
// warm where the lantern lights it and a dark speck further out; the ones that pass
// behind the glass are hidden by it, and now and then one comes in and taps the pane.
const MOTH_U = 1262;
const MOTHS = Array.from({ length: 8 }, (_, i) => ({
  R: 5 + hash(i * 3.1 + 1) * 9,
  w: (1.5 + hash(i * 5.3 + 2) * 2.2) * (hash(i * 7.7 + 3) < 0.5 ? -1 : 1),
  ph: hash(i * 2.9 + 4) * TAU,
  tilt: 0.3 + hash(i * 1.3 + 5) * 0.35,
  cy: (hash(i * 4.1 + 6) - 0.55) * 7,
  s: 0.85 + hash(i * 6.7 + 7) * 0.3,
  flap: 30 + hash(i * 8.3 + 8) * 14,
}));
// [moth, period, offset, target dx, target dy]: the pane-tappers.
const MOTH_TAPS = [[0, 3.6, 0.3, 4.6, -1.5], [3, 5.3, 2.4, -4.3, 2.5]];

function mothKit(r) {
  return { glint: glowSprite(r, [255, 236, 190]) };
}

function paintMoths(ctx, f) {
  const M = baked('moths', ctx, mothKit);
  let ly = -Infinity;
  for (let d = -3; d <= 3; d += 2) ly = Math.max(ly, f.ridgeY(f.x + d));
  const gx = f.x;
  const gy = ly + 1 - 40.5;
  const t = f.t;
  MOTHS.forEach((m, i) => {
    const phi = m.ph + m.w * t + 0.8 * vnoise(t * 0.9 + i * 11, 3);
    const R = m.R * (1 + 0.3 * vnoise(t * 0.7 + i * 5, 4));
    let x = gx + R * Math.cos(phi) + 1.5 * vnoise(t * 2.3 + i * 17, 5);
    let y = gy + m.cy + R * Math.sin(phi) * m.tilt + 1.4 * vnoise(t * 2.1 + i * 23, 6);
    let z = Math.sin(phi);
    let tap = 0;
    for (const [mi, T, off, tx, ty] of MOTH_TAPS) {
      if (mi !== i) continue;
      const p = loop(t + off, T);
      const wgt = smooth(ramp(p, 0.3, 0.9)) * (1 - smooth(ramp(p, 1.8, 2.5)));
      const knock = p > 0.9 && p < 1.8 ? Math.abs(Math.sin((p - 0.9) * Math.PI / 0.3)) : 1;
      const out = 0.4 + 1.3 * knock;
      const ax = gx + tx + Math.sign(tx) * out;
      const ay = gy + ty;
      x = lerp(x, ax, wgt);
      y = lerp(y, ay, wgt);
      z = lerp(z, 1, wgt);
      if (p > 0.9 && p < 1.8) tap = Math.pow(1 - knock, 6) * wgt;
    }
    // Behind the lantern: hidden by the glass and the cap.
    if (z < -0.15 && Math.abs(x - gx) < 5.2 && y > gy - 10 && y < gy + 5) return;
    // Over the pane a moth is backlit, a dark speck on the glow; anywhere else the
    // lantern lights its wings, pale and warm, fading with distance.
    const d = Math.hypot(x - gx, y - gy);
    const backlit = z > -0.15 && Math.abs(x - gx) < 4.9 && y > gy - 4.6 && y < gy + 4.6;
    const light = backlit ? 0.12 : Math.pow(clamp01(1.2 - d / 19), 1.2);
    const s = m.s * (1 + 0.12 * z);
    const beat = Math.sin(t * m.flap + i * 1.7);
    const open = Math.abs(beat);
    const col = mix([40, 30, 46], [255, 226, 172], 0.9 * light);
    const half = (0.5 + 0.55 * open) * s;
    ctx.fillStyle = css(col, 0.95);
    ell(ctx, x - half * 0.55, y, half * 0.55, (0.6 - 0.2 * open) * s, -0.35);
    ell(ctx, x + half * 0.55, y, half * 0.55, (0.6 - 0.2 * open) * s, 0.35);
    ctx.fillStyle = css(mix([22, 16, 30], [130, 96, 64], light * 0.6));
    ell(ctx, x, y + 0.05, 0.26 * s, 0.62 * s);
    const g = (backlit ? 0 : light) * Math.pow(Math.max(0, Math.sin(t * m.flap + i * 1.7 + 0.8)), 8) * 0.5 + tap;
    glow(ctx, M.glint, x, y, 1.4 + 2 * g, g);
  });
}


// ================================================================== SPIDER
// An orb web strung in the crook under the big limb of the small gnarl at u 760 (a
// flipped tree, so the limb reaches left), moonlit dew catching on its threads. The
// spider sits head-down in the hub, drops on its line, hangs, and climbs back up.
const SPIDER_TREE = 760;
const SPIDER_S = 0.8;
const HUB = [-13, -36];
const SPIDER_U = SPIDER_TREE + HUB[0];
const SPIDER_T = 10;
const DROP = 17;
const WEB_FRAME = [[-21, -47.5], [-11.5, -44.2], [-8.8, -35], [-6.4, -27.6], [-13.5, -24.5], [-20.5, -29], [-23, -39]];
const WEB_BRIDGES = [[0, [-25, -50.6]], [1, [-9.2, -45.6]], [2, [-6.6, -34.6]], [3, [-3.9, -27.4]], [4, [-17, 0.5]], [6, [-28, -51.4]]];

function rayHit(hx, hy, a, poly) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const ex = x2 - x1;
    const ey = y2 - y1;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-6) continue;
    const s = ((x1 - hx) * ey - (y1 - hy) * ex) / den;
    const u = ((x1 - hx) * dy - (y1 - hy) * dx) / den;
    if (s > 0 && u >= 0 && u <= 1) best = Math.min(best, s);
  }
  return best;
}

// One thread of the web, laid in with a fine dry brush: its own weight and opacity, and
// broken here and there where the brush skipped.
function webThread(g, R, x0, y0, cx, cy, x1, y1, a, w) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  g.globalAlpha = a * (0.65 + R() * 0.5);
  g.lineWidth = w * (0.8 + R() * 0.45);
  g.setLineDash(len > 3 && R() < 0.55 ? [2 + R() * len, 0.3 + R() * 0.9, 1 + R() * len] : []);
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(cx, cy, x1, y1);
  g.stroke();
}

function webKit(r) {
  const box = { x: -31, y: -56, w: 34, h: 60 };
  const c = canvas(box.w * r, box.h * r);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, -box.x * r, -box.y * r);
  g.lineCap = 'round';
  g.strokeStyle = css([184, 194, 230]);
  const R = K.rng(515);
  const [hx, hy] = HUB;
  const mid = (x0, y0, x1, y1, sag) => [(x0 + x1) / 2, (y0 + y1) / 2 + sag];
  // Frame and bridges, sagging under their own dew.
  WEB_FRAME.forEach(([x0, y0], i) => {
    const [x1, y1] = WEB_FRAME[(i + 1) % WEB_FRAME.length];
    webThread(g, R, x0, y0, ...mid(x0, y0, x1, y1, 0.3), x1, y1, 0.44, 0.3);
  });
  for (const [i, [ax, ay]] of WEB_BRIDGES) {
    const [x0, y0] = WEB_FRAME[i];
    webThread(g, R, x0, y0, ...mid(x0, y0, ax, ay, 0.25), ax, ay, 0.4, 0.28);
  }
  // Spokes.
  const N = 13;
  const spokes = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + 0.2 + (hash(i * 3.7) - 0.5) * 0.18;
    spokes.push([a, rayHit(hx, hy, a, WEB_FRAME)]);
  }
  for (const [a, L] of spokes) {
    const x1 = hx + Math.cos(a) * L;
    const y1 = hy + Math.sin(a) * L;
    webThread(g, R, hx, hy, (hx + x1) / 2, (hy + y1) / 2, x1, y1, 0.32, 0.22);
  }
  // The capture spiral, ring by ring, each thread sagging a little toward the hub, with
  // the odd broken strand; dew beads where the moon catches.
  const dew = [];
  const RINGS = 9;
  for (let j = 0; j < RINGS; j++) {
    const q = 0.2 + 0.74 * (j / (RINGS - 1));
    for (let i = 0; i < N; i++) {
      const [a0, L0] = spokes[i];
      const [a1, L1] = spokes[(i + 1) % N];
      if (hash(j * 13.1 + i * 7.3) < 0.07) continue;
      const q0 = q + (hash(j * 3.1 + i * 1.7) - 0.5) * 0.05;
      const q1 = q + (hash(j * 3.1 + ((i + 1) % N) * 1.7) - 0.5) * 0.05;
      const x0 = hx + Math.cos(a0) * L0 * q0;
      const y0 = hy + Math.sin(a0) * L0 * q0;
      const x1 = hx + Math.cos(a1) * L1 * q1;
      const y1 = hy + Math.sin(a1) * L1 * q1;
      const mx = lerp(hx, (x0 + x1) / 2, 0.9);
      const my = lerp(hy, (y0 + y1) / 2, 0.9) + 0.35;
      webThread(g, R, x0, y0, mx, my, x1, y1, 0.3, 0.19);
      if (hash(j * 5.9 + i * 11.3 + 2) > 0.84) dew.push([lerp((x0 + x1) / 2, mx, 0.5), lerp((y0 + y1) / 2, my, 0.5) + 0.1, hash(j + i * 3.3) * TAU]);
    }
  }
  g.setLineDash([]);
  // The hub's little mat.
  for (const rr of [0.7, 1.3]) {
    g.globalAlpha = 0.4;
    g.lineWidth = 0.2;
    g.beginPath();
    g.arc(hx, hy, rr, 0, TAU);
    g.stroke();
  }
  // Dew, baked faint; the live pass makes them catch the moon one at a time.
  g.globalAlpha = 1;
  for (const [x, y] of dew) {
    g.fillStyle = css([226, 232, 250], 0.45);
    g.beginPath();
    g.arc(x, y, 0.28, 0, TAU);
    g.fill();
  }
  return { web: { c, ...box }, dew, spark: glowSprite(r, [232, 238, 255]), spider: spiderSprites(r) };
}

// The spider: abdomen, head and eight legs. 'hub' head-down with its legs spread on the
// web; 'drop' the legs drawn in; 'climbA/B' head-up, pulling itself up its line.
function spiderSprites(r) {
  const Z = 1.2;
  const make = (pose, seed) => massSprite(r, [-4.4, -4.4, 8.8, 8.8], (g) => {
    g.scale(Z, Z);
    const up = pose.startsWith('climb') ? -1 : 1; // +1 head down
    ell(g, 0, -0.75 * up, 0.95, 1.15);
    ell(g, 0, 0.75 * up, 0.62, 0.6);
    const spread = pose === 'hub' ? 1 : pose === 'drop' ? 0.55 : 0.8;
    for (const side of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        let a = (0.35 + j * 0.62) * spread + (pose === 'climbA' ? (j % 2 ? 0.25 : -0.2) : pose === 'climbB' ? (j % 2 ? -0.2 : 0.25) : 0);
        a = Math.PI / 2 * up - side * a * up;
        const L = (j === 0 || j === 3 ? 2.6 : 2.1) * (0.75 + 0.25 * spread);
        const kx = Math.cos(a) * L * 0.5 + side * 0.5;
        const ky = Math.sin(a) * L * 0.5 - 0.5 * up;
        limb(g, [[0, 0.7 * up], [kx, ky + 0.7 * up], [Math.cos(a) * L, Math.sin(a) * L + 0.7 * up]], 0.36, 0.16, seed + j + side);
      }
    }
  }, inkStyle(seed, { rim: 0.3, rimA: 0.75, dabs: 0.3, dab: 0.4 }), (g) => {
    // The moon catching the round of the abdomen.
    const up = pose.startsWith('climb') ? -1 : 1;
    g.fillStyle = css([150, 152, 200], 0.65);
    dab(g, 0.45 * Z, (-0.75 * up - 0.45) * Z, 0.4 * Z, 0.28 * Z, -0.6);
  });
  return { hub: make('hub', 120), drop: make('drop', 121), climbA: make('climbA', 122), climbB: make('climbB', 123) };
}

// Spider state: how far below the hub, which pose, and a pendulum sway.
function spiderState(t) {
  if (t < 1.0) return { d: 0, pose: 'hub', sway: 0 };
  if (t < 1.7) {
    const p = ramp(t, 1.0, 1.7);
    return { d: DROP * p * p, pose: 'drop', sway: 0 };
  }
  if (t < 3.8) {
    const e = t - 1.7;
    return { d: DROP + 1.6 * Math.sin(e * 16) * Math.exp(-e * 5), pose: 'drop', sway: 0.9 * Math.sin(e * 2.3) * (1 - Math.exp(-e * 2)) };
  }
  if (t < 6.6) {
    const steps = 8;
    const q = ramp(t, 3.8, 6.6) * steps;
    const i = Math.floor(q);
    const fr = q - i;
    const done = Math.min(steps, i + smooth(fr / 0.55));
    return { d: DROP * (1 - done / steps), pose: i % 2 ? 'climbA' : 'climbB', sway: 0.5 * Math.sin((t - 1.7) * 2.3) * (1 - done / steps) };
  }
  return { d: 0, pose: 'hub', sway: 0 };
}

function paintSpider(ctx, f) {
  const W = baked('spider', ctx, webKit);
  const [bx, by] = gnarlBase(f, SPIDER_U, SPIDER_TREE, SPIDER_S);
  put(ctx, W.web, bx, by);
  const t = loop(f.t, SPIDER_T);
  // Dew: each bead catches the moon in turn.
  W.dew.forEach(([x, y, ph], i) => {
    const g = Math.pow(Math.max(0, Math.sin(f.t * 0.6 + ph * 3 + i * 1.9)), 26);
    glow(ctx, W.spark, bx + x, by + y, 1.1 + 2.4 * g, 0.12 + 0.75 * g);
  });
  const hx = bx + HUB[0];
  const hy = by + HUB[1];
  const st = spiderState(t);
  const sx = hx + st.sway;
  const sy = hy + st.d;
  if (st.d > 0.4) {
    ctx.strokeStyle = css([210, 216, 244], 0.42);
    ctx.lineWidth = 0.22;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(sx, sy - 1.2);
    ctx.stroke();
  }
  put(ctx, W.spider[st.pose], sx, sy);
}


// ================================================================== RATS
// Two rats working the foot of the last railing run: a dart, a stop to sniff, up on the
// haunches to test the air, tails flicking, and on again. They cross each other halfway.
const RAT_U = 2790;
const RAT_T = 16;
const RAT_RUN = [
  [0, 0.9, 'sit', -60], [0.9, 1.3, 'run', -60, -36], [1.3, 2.3, 'sniff', -36], [2.3, 2.6, 'run', -36, -22],
  [2.6, 3.6, 'sit', -22], [3.6, 4.1, 'run', -22, 6], [4.1, 5.0, 'sniff', 6], [5.0, 5.35, 'run', 6, 20],
  [5.35, 6.4, 'sit', 20], [6.4, 6.9, 'run', 20, 48], [6.9, 8.1, 'sniff', 48], [8.1, 8.3, 'turn', 48],
  [8.3, 8.8, 'run', 48, 24], [8.8, 9.9, 'sit', 24], [9.9, 10.4, 'run', 24, -4], [10.4, 11.3, 'sniff', -4],
  [11.3, 11.9, 'run', -4, -38], [11.9, 13.1, 'sit', -38], [13.1, 13.5, 'run', -38, -60], [13.5, 15.6, 'sniff', -60],
  [15.6, 16, 'turn', -60],
];
const RZ = 1.3;
const RAT_RUMP = { run1: [-2.8, -1.1], run2: [-2.2, -1.4], stand: [-2.8, -1.0], sniff: [-2.8, -1.0], sit: [-1.9, -0.5] };
const RAT_EYE = { run1: [2.3, -1.75], run2: [2.1, -2.0], stand: [2.0, -1.4], sniff: [2.1, -2.25], sit: [0.95, -4.2] };

function ratParts(g, pose) {
  const leg = (pts, s) => limb(g, pts, 0.6, 0.3, s);
  if (pose === 'run1') {
    ell(g, -0.4, -1.35, 2.5, 1.0, 0.05);
    fillPoly(g, [1.3, -2.1, 3.7, -1.15, 3.55, -0.75, 1.5, -0.55]);
    ell(g, 1.3, -2.15, 0.55, 0.5);
    leg([[1.4, -0.9], [2.3, -0.4], [2.9, -0.05]], 1);
    leg([[-1.8, -0.9], [-2.7, -0.4], [-3.3, -0.05]], 2);
  } else if (pose === 'run2') {
    ell(g, -0.2, -1.6, 2.1, 1.3, -0.1);
    fillPoly(g, [1.2, -2.3, 3.3, -1.3, 3.15, -0.9, 1.3, -0.8]);
    ell(g, 1.1, -2.45, 0.55, 0.5);
    leg([[0.9, -0.8], [0.6, -0.3], [0.3, 0]], 3);
    leg([[-0.8, -0.9], [-0.3, -0.35], [0, 0]], 4);
  } else if (pose === 'stand' || pose === 'sniff') {
    ell(g, -0.5, -1.3, 2.4, 1.1, pose === 'stand' ? 0.08 : -0.05);
    if (pose === 'stand') fillPoly(g, [1.1, -1.9, 3.3, -0.55, 3.1, -0.2, 1.2, -0.6]);
    else fillPoly(g, [1.1, -2.2, 3.2, -2.9, 3.2, -2.5, 1.4, -1.2]);
    ell(g, 1.0, pose === 'stand' ? -2.0 : -2.45, 0.55, 0.5);
    leg([[1.2, -0.8], [1.3, 0]], 5);
    leg([[-1.9, -0.8], [-1.9, 0]], 6);
  } else {
    ell(g, -0.7, -1.7, 1.75, 1.6);
    ell(g, -0.25, -3.2, 1.25, 1.6, 0.3);
    fillPoly(g, [0.1, -4.5, 2.0, -4.1, 1.9, -3.8, 0.3, -3.5]);
    ell(g, 0.0, -4.7, 0.5, 0.45);
    leg([[0.4, -3.1], [0.9, -2.7], [0.9, -2.3]], 7);
    ell(g, 0.2, -0.25, 1.1, 0.35);
  }
}

const RAT_POSES = ['run1', 'run2', 'stand', 'sniff', 'sit'];
function ratKit(r) {
  const out = {};
  for (const pose of RAT_POSES) {
    for (const dir of [1, -1]) {
      out[pose + dir] = massSprite(r, [-7, -7.5, 14, 8.5], (g) => {
        g.scale(dir * RZ, RZ);
        ratParts(g, pose);
      }, inkStyle(140, { rim: 0.27, rimA: 0.85, dabs: 0.3, dab: 0.45, body: [22, 16, 36], dark: [12, 9, 22], lit: [100, 102, 150] }));
    }
  }
  return out;
}

function ratState(t) {
  let dir = 1;
  for (const [t0, t1, act, x0, x1] of RAT_RUN) {
    if (act === 'run' && t >= t1) dir = Math.sign(x1 - x0);
    if (act === 'turn' && t >= t1) dir = -dir;
    if (t < t0 || t >= t1) continue;
    const p = ramp(t, t0, t1);
    if (act === 'run') {
      const e = 0.7 * p + 0.3 * smooth(p);
      return { x: lerp(x0, x1, e), dir: Math.sign(x1 - x0), pose: Math.floor(t * 13) % 2 ? 'run2' : 'run1', wig: 0.15, lift: 0 };
    }
    if (act === 'turn') return { x: x0, dir: p < 0.5 ? dir : -dir, pose: 'stand', wig: 0.6, lift: -0.4 * Math.sin(Math.PI * p) };
    if (act === 'sit') {
      const up = p > 0.1 && p < 0.9;
      return { x: x0, dir, pose: up ? 'sit' : 'stand', wig: 0.5, lift: up ? -0.12 * (Math.floor(t * 9) % 2) : 0 };
    }
    return { x: x0, dir, pose: Math.floor((t - t0) * 2.6) % 2 ? 'sniff' : 'stand', wig: 0.8, lift: 0 };
  }
  return { x: -60, dir, pose: 'stand', wig: 0.5, lift: 0 };
}

function ratTail(ctx, x, y, dir, pose, wig, t, seed) {
  const [rx, ry] = RAT_RUMP[pose];
  const flick = wig * (Math.sin(t * 3.1 + seed) * 0.6 + Math.pow(Math.max(0, Math.sin(t * 1.3 + seed * 2)), 8) * 1.6);
  const P = (px, py) => [x + px * dir * RZ, y + py * RZ];
  const run = pose.startsWith('run');
  const pts = run
    ? [P(rx, ry), P(rx - 2.6, ry + 0.2 - 0.3 * flick), P(rx - 5.2, ry + 0.1 + 0.2 * flick), P(rx - 7.4, ry - 0.3 - 0.5 * flick)]
    : [P(rx, ry), P(rx - 2.0, -0.35), P(rx - 4.2, -0.25 - 0.3 * flick), P(rx - 6.2, -0.7 - 1.1 * flick)];
  ctx.fillStyle = css([30, 23, 46]);
  limb(ctx, pts, 0.66, 0.14, seed);
}

function paintRats(ctx, f) {
  const S = baked('rats', ctx, ratKit);
  const t = loop(f.t, RAT_T);
  for (const [i, dt, sign, dy, sc] of [[0, 0, 1, 0.5, 1], [1, 0.45, -1, 1.1, 0.86]]) {
    const st = ratState(loop(t - dt, RAT_T));
    const x = f.x + st.x * sign;
    const dir = st.dir * sign;
    const y = f.ridgeY(x) + dy + st.lift;
    ratTail(ctx, x, y, dir, st.pose, st.wig, f.t, 7 + i * 5);
    const spr = S[st.pose + dir];
    ctx.drawImage(spr.c, x + spr.x * sc, y + spr.y * sc, spr.w * sc, spr.h * sc);
    // A bead of moon in the eye.
    const [ex, ey] = RAT_EYE[st.pose];
    ctx.fillStyle = css([200, 192, 224], 0.45);
    ell(ctx, x + ex * dir * RZ * sc, y + ey * RZ * sc, 0.22, 0.2);
  }
}


// ================================================================== the ideas
export const IDEAS = [
  {
    id: 'fg-owl', name: 'OWL', layer: 'fg', when: 'on', u: OWL_U, focusUp: 72, zoom: 3.5,
    note: 'A horned owl perched at the crest of the first gnarled tree\'s lower main bough, where the rising trunk turns into the rightward limb, with the raised fork removed beside him: it blinks, swivels its head right round to the back and home again, puffs its throat to hoot with a breath of mist, and now and then stretches a wing straight to the right.',
    paint: paintOwl,
  },
  {
    id: 'fg-crows', name: 'CROWS', layer: 'fg', when: 'on', u: CROW_U, focusUp: 34, zoom: 3, reach: 180,
    note: 'Three crows on the railing spear tips: they peck and hop along, the middle one bows and caws with its hackles up, and the right-hand one flaps off round a loop and glides back to its post.',
    paint: paintCrows,
  },
  {
    id: 'fg-moths', name: 'MOTHS', layer: 'fg', when: 'on', u: MOTH_U, focusUp: 40, zoom: 4,
    note: 'Moths spiral round a gas lamp, warm where the lantern lights them and dark specks further out, catching glints as they flutter; now and then one taps against the glass.',
    paint: paintMoths,
  },
  {
    id: 'fg-spider', name: 'SPIDER', layer: 'fg', when: 'on', u: SPIDER_U, focusUp: 30, zoom: 4,
    note: 'An orb web strung in the crook of a gnarled tree, moonlit dew twinkling on its threads; the spider drops from the hub on its line, hangs swaying, and climbs back up.',
    paint: paintSpider,
  },
  {
    id: 'fg-rats', name: 'RATS', layer: 'fg', when: 'on', u: RAT_U, focusUp: 6, zoom: 3, reach: 200,
    note: 'Two rats working the foot of the railing: a dart, a stop to sniff, up on their haunches to test the air with tails flicking, then on again, crossing each other on the way.',
    paint: paintRats,
  },
];
