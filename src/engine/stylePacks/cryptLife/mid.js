// CRYPT SHIFT — more life in the graveyard, bake-off: THE GRAVEYARD HILL (layer 'mid').
// Peter, 25 Sep 2026: "more objects (maybe animals) for the crypt levels? animated
// ideally, but still is ok". Five ideas for the hill the graves stand on, each anchored
// to something the hill already holds (SCENE.mid in stylePacks/cryptGouache.js).
//
// Painted in the shipped gouache hand through GOUACHE_KIT, never retyped: the creatures
// and the digger are opaque near-black violet masses (massSprite) with the moonlit rim on
// their upper-right edges and a little dabbed texture; the ghost is translucent pale
// paint; the wisps are soft glows. Every pose is baked ONCE per scale as a massSprite
// frame (keyed by the pose, capped at 3x) and blitted, so a frame is a few blits and
// small shapes. Everything animates from f.t alone, on cycles of a few seconds with idle
// beats between the actions, phased so t = 0 (the gallery's still) shows the idea.
import { GOUACHE_KIT as K } from '../cryptGouache.js';

const { massSprite, limb, dab, fillPoly, arcPts, blit, canvas, css, mix, shade, hash, vnoise, C } = K;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ shared
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (c, P) => ((c % P) + P) % P;
function lerpPose(a, b, t) {
  if (typeof a === 'number') return lerp(a, b, t);
  if (Array.isArray(a)) return a.map((v, i) => lerpPose(v, b[i], t));
  const o = {};
  for (const k in a) o[k] = lerpPose(a[k], b[k], t);
  return o;
}
// 0 outside [a, d], 1 inside [b, c], eased ramps between.
const bump = (x, a, b, c, d) => (x <= a || x >= d ? 0 : x < b ? smooth((x - a) / (b - a)) : x <= c ? 1 : 1 - smooth((x - c) / (d - c)));

// The bake scale: the frame's own, in half steps, capped at 3.
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

// Where the hill's bake stands an item: the lowest crest point under its footprint.
function footAt(f, x, halfW) {
  let y = -Infinity;
  for (let d = -halfW; d <= halfW; d += 2) y = Math.max(y, f.ridgeY(x + d));
  return y;
}

// A looping track of poses, [[seconds, from, to, frames]]: the segment at cycle time c,
// with its progress eased and quantised to the frames that get baked.
function track(segs) {
  const total = segs.reduce((s, g) => s + g[0], 0);
  return (c) => {
    let x = wrap(c, total);
    for (let i = 0; i < segs.length; i++) {
      const [d, a, b, n = 0] = segs[i];
      if (x < d || i === segs.length - 1) {
        const raw = clamp01(x / d);
        return { i, a, b, raw, p: n ? Math.round(smooth(raw) * n) / n : 0 };
      }
      x -= d;
    }
    return null;
  };
}

// A soft round glow, baked once per scale and colour.
function glowSprite(k, r, col, stops) {
  return memo(`glow:${k}:${r}:${col}:${stops}`, () => {
    const c = canvas(2 * r * k, 2 * r * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    for (const [o, a] of stops) gr.addColorStop(o, css(col, a));
    g.fillStyle = gr;
    g.fillRect(0, 0, 2 * r, 2 * r);
    return c;
  });
}
function glowAt(ctx, img, x, y, rx, ry = rx) {
  ctx.drawImage(img, x - rx, y - ry, 2 * rx, 2 * ry);
}
const SOFT = [[0, 1], [0.35, 0.45], [0.7, 0.12], [1, 0]];

// Two-bone reach: the joint between a and b (bones l1, l2), bent to `side` of a→b.
function joint(a, b, l1, l2, side) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1e-6;
  const dd = Math.min(d, l1 + l2 - 1e-3);
  const x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const ux = dx / d;
  const uy = dy / d;
  return [a[0] + ux * x - uy * h * side, a[1] + uy * x + ux * h * side];
}
function ellipse(g, x, y, rx, ry, a = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), a, 0, TAU);
  g.fill();
}

// Creatures and figures: near-black violet, a step darker than the hill's own trees.
const INK = { body: [26, 21, 42], dark: [13, 10, 26], lit: [104, 112, 162] };
const SOIL = { body: [42, 34, 52], dark: [26, 21, 36], lit: [96, 98, 138] };


// ------------------------------------------------------------------ 1. BLACK CAT
// On the cornice of the domed mausoleum at u 760 (s .85), right of the dome, facing the
// moon: the dome's shoulder behind her, sky above her head. Sits with her tail hanging
// over the cornice, swishing; now and then rises, arches, stretches and resettles.
const CAT_TOMB = { u: 760, s: 0.85 };
const CAT_U = 771;
const CAT_ON = 10.8; // along the cornice from the tomb's centre, layer px
const CAT_SIZE = 0.95;

const CAT = {
  SIT: {
    hip: [-1.0, -1.75], hipR: [2.35, 1.75], body: [[-1.1, -2.2], [-0.4, -4.1], [0.55, -5.1]], bodyW: [3.5, 2.3],
    chest: [0.85, -3.2], chestR: [1.05, 1.85], head: [0.95, -6.5], ears: 0, muzzle: 0,
    fl: [[1.15, -2.8], [1.3, 0]], fl2: [[0.55, -2.8], [0.65, 0]],
    rl: [[-1.0, -1.7], [-0.2, -0.8], [0.3, -0.25]], rl2: [[-1.5, -1.6], [-1.0, -0.8], [-0.5, -0.25]],
    tail: [[-3.0, -0.8], [-3.7, 0.8], [-3.5, 2.8], [-3.0, 4.3]], tailW: 1.25,
    eyes: [[-0.3, -0.05], [0.65, -0.05]],
  },
  STAND: {
    hip: [-2.5, -3.5], hipR: [1.5, 1.5], body: [[-2.6, -3.6], [-0.4, -4.1], [1.7, -3.8]], bodyW: [2.8, 2.8],
    chest: [1.8, -3.3], chestR: [1.2, 1.3], head: [3.4, -5.2], ears: 0.1, muzzle: 1,
    fl: [[2.0, -3.2], [2.3, 0]], fl2: [[1.5, -3.2], [1.3, 0]],
    rl: [[-2.2, -3.5], [-1.6, -1.6], [-2.3, 0]], rl2: [[-2.8, -3.3], [-2.4, -1.5], [-3.1, 0]],
    tail: [[-3.8, -3.9], [-5.0, -4.8], [-5.5, -6.3], [-5.0, -7.4]], tailW: 1.15,
    eyes: [[0.35, -0.3], [1.0, -0.25]],
  },
  ARCH: {
    hip: [-2.1, -4.3], hipR: [1.3, 1.3], body: [[-2.2, -4.3], [-0.3, -7.0], [1.6, -4.5]], bodyW: [2.5, 2.4],
    chest: [1.8, -3.9], chestR: [1.0, 1.1], head: [3.2, -4.4], ears: 0.75, muzzle: 1,
    fl: [[1.9, -4.0], [2.2, 0]], fl2: [[1.5, -4.0], [1.4, 0]],
    rl: [[-2.0, -4.2], [-2.0, -2.0], [-2.3, 0]], rl2: [[-2.5, -4.1], [-2.6, -2.0], [-2.9, 0]],
    tail: [[-3.1, -4.8], [-3.6, -7.0], [-3.6, -9.2], [-2.9, -10.2]], tailW: 1.3,
    eyes: [[0.35, -0.3], [1.0, -0.25]],
  },
  STRETCH: {
    hip: [-2.3, -4.4], hipR: [1.4, 1.4], body: [[-2.4, -4.5], [0, -3.0], [2.2, -1.5]], bodyW: [2.6, 2.1],
    chest: [2.3, -1.3], chestR: [1.05, 0.8], head: [3.9, -2.1], ears: 0.3, muzzle: 1,
    fl: [[2.3, -0.9], [5.4, -0.25]], fl2: [[2.0, -0.85], [4.9, -0.2]],
    rl: [[-2.1, -4.1], [-1.8, -2.0], [-2.1, 0]], rl2: [[-2.6, -4.0], [-2.6, -1.9], [-3.0, 0]],
    tail: [[-3.4, -4.9], [-4.3, -6.6], [-4.5, -8.2], [-4.0, -9.2]], tailW: 1.15,
    eyes: [[0.4, -0.3], [1.05, -0.25]],
  },
};
const CAT_T = track([
  [2.4, 'SIT', 'SIT'],
  [0.45, 'SIT', 'STAND', 4],
  [0.4, 'STAND', 'ARCH', 4],
  [0.8, 'ARCH', 'ARCH'],
  [0.5, 'ARCH', 'STRETCH', 5],
  [0.9, 'STRETCH', 'STRETCH'],
  [0.35, 'STRETCH', 'STAND', 4],
  [0.5, 'STAND', 'SIT', 5],
  [5.7, 'SIT', 'SIT'],
]);
const CAT_P = 12;

function catEar(g, hx, hy, side, tilt) {
  // Base on the crown, tip up; `tilt` lays it back (away from the face).
  const bx = hx + side * 0.62;
  const by = hy - 0.95;
  const a = -Math.PI / 2 + side * 0.18 - tilt;
  const tip = [bx + Math.cos(a) * 1.35, by + Math.sin(a) * 1.35];
  const px = -Math.sin(a) * 0.62;
  const py = Math.cos(a) * 0.62;
  fillPoly(g, [bx - px, by - py + 0.2, tip[0], tip[1], bx + px, by + py + 0.2]);
}

function paintCat(g, P) {
  g.scale(CAT_SIZE, CAT_SIZE);
  const [hx, hy] = P.head;
  limb(g, P.tail, P.tailW, P.tailW * 0.55, 3);
  limb(g, P.rl2, 1.2, 0.7, 5);
  limb(g, P.fl2, 0.9, 0.7, 6);
  ellipse(g, P.hip[0], P.hip[1], P.hipR[0], P.hipR[1]);
  limb(g, P.body, P.bodyW[0], P.bodyW[1], 1);
  ellipse(g, P.chest[0], P.chest[1], P.chestR[0], P.chestR[1]);
  limb(g, P.rl, 1.3, 0.75, 7);
  limb(g, P.fl, 1.0, 0.8, 8);
  // Neck, head, muzzle and ears.
  limb(g, [P.body[2], [hx - 0.1, hy + 0.4]], 2.1, 2.0, 9);
  ellipse(g, hx, hy, 1.5, 1.32);
  if (P.muzzle > 0.05) ellipse(g, hx + 1.15 * P.muzzle, hy + 0.35, 0.75 * P.muzzle, 0.6 * P.muzzle);
  catEar(g, hx, hy, -1, P.ears);
  catEar(g, hx, hy, 1, P.ears + P.flick);
}

function catSwish(c) {
  return Math.max(-1, Math.min(1, 0.72 * Math.sin(c * 1.35) + 0.3 * Math.sin(c * 3.2 + 0.7)));
}

function catFrame(k, s, sw, fl) {
  return memo(`cat:${k}:${s.i}:${s.p}:${sw}:${fl}`, () => {
    const P = lerpPose(CAT[s.a], CAT[s.b], s.p);
    P.flick = fl * 0.9;
    const tw = [0, 0.45, 1.25, 2.1];
    P.tail = P.tail.map(([x, y], j) => [x + sw * tw[j], y - Math.abs(sw) * tw[j] * 0.22]);
    const spr = massSprite(k, [-9, -12, 16, 18], (g) => paintCat(g, P), {
      ...INK, rim: 0.34, rimA: 0.9, dabs: 0.3, dab: 0.8, dabAng: 0, seed: 41, g0: 0.2,
    });
    return { spr, eyes: P.eyes.map(([ex, ey]) => [(P.head[0] + ex) * CAT_SIZE, (P.head[1] + ey) * CAT_SIZE]) };
  });
}

function paintCatIdea(ctx, f) {
  const k = bakeScale(ctx);
  const c = wrap(f.t + 0.3, CAT_P);
  const s = CAT_T(c);
  const sitting = s.a === 'SIT' && s.b === 'SIT';
  const sw = sitting ? Math.round(catSwish(c) * 5) / 5 : 0;
  const fl = sitting && (bump(c, 1.5, 1.56, 1.66, 1.74) > 0.5 || bump(c, 8.0, 8.05, 8.14, 8.2) > 0.5
    || bump(c, 8.34, 8.4, 8.46, 8.52) > 0.5 || bump(c, 10.2, 10.26, 10.34, 10.4) > 0.5) ? 1 : 0;
  const { spr, eyes } = catFrame(k, s, sw, fl);
  const tombX = f.x - (CAT_U - CAT_TOMB.u);
  const x = tombX + CAT_ON;
  const y = footAt(f, tombX, 22 * CAT_TOMB.s) + 1.5 - 37 * CAT_TOMB.s + 0.25;
  blit(ctx, spr, x, y);

  // Eyes: two green glints that catch the moon, blink now and then, squeeze shut in the
  // stretch and flare once a cycle.
  let b = 0.78 + 0.18 * Math.sin(c * 2.3);
  if (bump(c, 0.9, 0.93, 1.02, 1.05) > 0.4 || bump(c, 7.1, 7.13, 7.22, 7.25) > 0.4 || bump(c, 9.7, 9.73, 9.82, 9.85) > 0.4) b = 0;
  if (s.a === 'STRETCH' && s.b === 'STRETCH') b *= 0.18;
  const flare = bump(c, 10.7, 10.85, 11.1, 11.35);
  b *= 1 + 0.7 * flare;
  if (b <= 0.01) return;
  const halo = glowSprite(k, 4, [150, 255, 110], SOFT);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, 0.42 * b);
  for (const [ex, ey] of eyes) glowAt(ctx, halo, x + ex, y + ey, 1.5 + flare * 1.1);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(1, b);
  ctx.fillStyle = css([206, 255, 150]);
  for (const [ex, ey] of eyes) ellipse(ctx, x + ex, y + ey, 0.36, 0.3);
  ctx.globalAlpha = 1;
}


// ------------------------------------------------------------------ 2. WILL-O'-WISPS
// Three ghost-lights among the stones at 352–468 (the stone, cross and obelisk run just
// past the first tree). They drift and bob, flicker, dim and brighten; the middle one
// wanders off up the hill and comes back. Each lays a cool pool of light on the stones.
const WISP_U = 410;
const WISPS = [
  { home: -40, lift: 6.5, ph: 0.0 },
  { home: -6, lift: 9, ph: 2.1, rover: true },
  { home: 30, lift: 5.5, ph: 4.4 },
];
const WISP_COL = { core: [238, 255, 248], halo: [150, 226, 216], pool: [118, 186, 200] };

function wispAt(f, w, t) {
  let dx = w.home + 7 * Math.sin(t * 0.41 + w.ph) + 3 * Math.sin(t * 1.07 + w.ph * 2);
  let lift = w.lift + 1.8 * Math.sin(t * 1.9 + w.ph) + 0.8 * Math.sin(t * 3.3 + w.ph);
  let away = 0;
  if (w.rover) {
    const c = wrap(t + 0.2, 11);
    away = bump(c, 1.0, 3.6, 5.0, 7.8);
    dx += 54 * away + 5 * Math.sin(away * TAU);
    lift += 18 * Math.sin(away * Math.PI / 2);
  }
  const x = f.x + dx;
  return { x, y: f.ridgeY(x) - lift, lift, away };
}

function paintWisps(ctx, f) {
  const k = bakeScale(ctx);
  const t = f.t;
  const halo = glowSprite(k, 8, WISP_COL.halo, SOFT);
  const pool = glowSprite(k, 16, WISP_COL.pool, [[0, 1], [0.5, 0.4], [1, 0]]);
  const core = glowSprite(k, 3, WISP_COL.core, [[0, 1], [0.3, 0.9], [0.6, 0.3], [1, 0]]);
  const ws = WISPS.map((w, i) => {
    const p = wispAt(f, w, t);
    const flick = 0.8 + 0.2 * vnoise(t * 5 + i * 13.7, i + 3);
    const dim = 1 - 0.78 * bump(wrap(t + i * 2.9, 6.5), 4.5, 5.0, 5.6, 6.4);
    p.b = flick * dim * (1 - 0.3 * p.away);
    p.w = w;
    return p;
  });
  ctx.globalCompositeOperation = 'lighter';
  // The pools on the stones and the crest under each light.
  for (const p of ws) {
    const near = clamp01(1 - (p.lift - 5) / 16);
    if (near <= 0) continue;
    ctx.globalAlpha = 0.3 * p.b * near;
    glowAt(ctx, pool, p.x, f.ridgeY(p.x) - 3, 17, 9);
  }
  // Trails, then halos.
  for (const p of ws) {
    for (let j = 1; j <= 3; j++) {
      const q = wispAt(f, p.w, t - j * 0.09);
      ctx.globalAlpha = 0.28 * p.b * (1 - j / 4);
      glowAt(ctx, halo, q.x, q.y + j * 0.25, 2.8 - j * 0.4);
    }
    ctx.globalAlpha = 0.6 * p.b;
    glowAt(ctx, halo, p.x, p.y, 6.5, 7);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of ws) {
    ctx.globalAlpha = Math.min(1, 1.05 * p.b);
    glowAt(ctx, core, p.x, p.y - 0.2, 1.7, 2.3);
  }
  ctx.globalAlpha = 1;
}


// ------------------------------------------------------------------ 3. SHEET GHOST
// From the grave left of the tablet at u 622. Painted BEHIND the hill, so the crest
// itself hides it as it sinks: every few seconds it rises out of the grave, sways, looks
// left and right through two dark eye holes, and sinks back.
const GHOST_U = 606;
const GHOST_P = 9;
const GHOST_PAL = { body: [214, 220, 242], dark: [158, 168, 208], lit: [252, 252, 255] };
const GHOST_HOVER = 3.5; // hem above the crest at the top of its rise
const GHOST_DEEP = 22; // below the crest when gone

function ghostOutline(ph) {
  const pts = [];
  const N = 22;
  // The hem, right to left: four scallops travelling along it.
  for (let j = 0; j <= N; j++) {
    const s = j / N;
    pts.push(5.9 - 11.8 * s, -0.3 + 1.05 * Math.sin(s * Math.PI * 4 + ph) * (0.55 + 0.45 * Math.sin(s * Math.PI)));
  }
  // Up the left side, billowing, over the head, down the right.
  const side = (v, dir) => {
    const hw = 4.3 + 1.6 * Math.pow(1 - v, 1.4) + 0.28 * Math.sin(v * 7 + ph * 0.8 + (dir > 0 ? 1.3 : 0))
      + 0.5 * Math.exp(-Math.pow((v - 0.45) / 0.12, 2));
    return [dir * hw, -13.4 * v];
  };
  for (let j = 1; j <= 8; j++) pts.push(...side(j / 8, -1));
  pts.push(...arcPts(0, -13.4, 4.3, 4.6, Math.PI, TAU, 16).slice(2, -2));
  for (let j = 8; j >= 1; j--) pts.push(...side(j / 8, 1));
  return pts;
}

function ghostFrame(k, q) {
  return memo(`ghost:${k}:${q}`, () => {
    const ph = (q / 8) * TAU;
    return massSprite(k, [-8, -20, 16, 22], (g) => fillPoly(g, ghostOutline(ph), 0.22, 7), {
      ...GHOST_PAL, rim: 0.8, rimA: 0.7, dabs: 0.16, dab: 1.0, dabAng: -1.3, seed: 61, g0: 0.15,
    }, (g, R) => {
      // Drapery folds hanging from the head, then the hem thinned to gauze.
      g.lineCap = 'round';
      for (const [x0, x1] of [[-1.8, -3.4], [0.6, 0.9], [2.4, 4.0]]) {
        g.fillStyle = css(GHOST_PAL.dark, 0.32);
        limb(g, [[x0, -10.5], [(x0 + x1) / 2, -5.5], [x1, -0.6]], 0.3, 0.8, x0 + 3);
      }
      for (let i = 0; i < 10; i++) {
        g.fillStyle = css(GHOST_PAL.lit, 0.25);
        dab(g, 1 + R() * 3.5, -16 + R() * 9, 0.4 + R() * 0.7, 0.3, -0.6);
      }
      g.globalCompositeOperation = 'destination-out';
      const fade = g.createLinearGradient(0, -8, 0, 1.2);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,0.7)');
      g.fillStyle = fade;
      g.fillRect(-8, -8, 16, 10);
    });
  });
}

function ghostFlightX(p, route) {
  // One broad, readable S-curve. The swing opens up as the ghost recedes,
  // instead of the old tight double wiggle and large sideways shove.
  const swing = (0.35 + 0.65 * p) * Math.sin(TAU * 1.45 * p + route.phase)
    - 0.35 * Math.sin(route.phase);
  return route.drift * p + route.amp * swing;
}

function paintGhost(ctx, f) {
  const k = bakeScale(ctx);
  const t = f.t;
  const period = f.period || GHOST_P;
  const c = wrap(t + 0.8, period);
  let rise;
  if (c < 1.6) rise = 1 - Math.pow(1 - c / 1.6, 2.2);
  else if (f.flight || c < 4.4) rise = 1;
  else if (c < 5.8) rise = 1 - Math.pow((c - 4.4) / 1.4, 1.8);
  else return;
  const look = -bump(c, 1.9, 2.3, 2.7, 3.0) + bump(c, 3.1, 3.45, 3.85, 4.2);
  // First let the whole head emerge and hover. If this group entered from the
  // right, it cannot take flight until it has scrolled past screen centre.
  // The spatial ramp also prevents a jump if that crossing happens late in
  // the cycle. A group already left of centre simply follows the time delay.
  const screenMid = (f.view.left + f.view.right) * 0.5;
  const timeFlight = f.flight ? (c - f.flight.start) / (period - 0.9 - f.flight.start) : 0;
  const placeFlight = (screenMid - f.x) / 190;
  const flight = f.flight ? smooth(Math.min(timeFlight, placeFlight)) : 0;
  // The backdrop's `view.top` includes offscreen paint padding; target the
  // visible screen edge instead, with the whole ghost clear before the reset.
  // To the VISIBLE top of the frame (the pack's view.visibleTop: 0 in landscape, the band's
  // top in portrait), plus the ghost's own height, so it is gone before its cycle resets.
  const skyTop = Number.isFinite(f.view?.visibleTop) ? f.view.visibleTop : 0;
  const exitLift = f.flight ? f.ridgeY(f.x) - GHOST_HOVER - skyTop + 30 : 0;
  const lift = exitLift * flight;
  // NOTHING POPS (Peter, 26 Sep: "make sure that objects don't pop in or out. I noticed
  // flying ghosts … popping"): anything still in view as its cycle runs out — a flyer held
  // back by the screen-centre rule — fades over the cycle's last 0.6 s instead of snapping
  // back to its grave when the cycle restarts.
  const fadeOut = smooth((period - 0.05 - c) / 0.6);
  const vis = (0.35 + 0.65 * rise) * fadeOut;
  const x = f.x + (f.flight ? ghostFlightX(flight, f.flight) : 0);
  const base = f.ridgeY(f.x) - GHOST_HOVER + (1 - rise) * (GHOST_DEEP + GHOST_HOVER)
    - lift + 0.7 * Math.sin(t * 2.2);
  const q = Math.floor(wrap(t * 3.2, 8));
  const spr = ghostFrame(k, q);
  const depthScale = 1 - 0.3 * flight;
  // The head points along the local tangent of the winding climb. Sample a
  // little to either side of this position so the turn is smooth at any frame
  // rate. Ease the tilt in as the sheet leaves the grave, like a slow balloon.
  const p0 = Math.max(0, flight - 0.02);
  const p1 = Math.min(1, flight + 0.02);
  const tangent = f.flight && p1 > p0
    ? Math.atan2(ghostFlightX(p1, f.flight) - ghostFlightX(p0, f.flight), exitLift * (p1 - p0))
    : 0;
  const heading = f.flight
    ? Math.max(-0.62, Math.min(0.62, tangent)) * smooth(flight / 0.08)
      + 0.025 * Math.sin(t * 1.4 + f.flight.phase) * smooth(flight / 0.1)
    : 0;
  const face = f.flight && flight > 0 ? Math.max(-1, Math.min(1, heading / 0.62)) : look;
  const sway = (f.flight && flight > 0 ? 0.025 : 0.05) * Math.sin(t * 1.7)
    + 0.02 * Math.sin(t * 3.9) - 0.06 * face;

  ctx.globalCompositeOperation = 'lighter';
  // The glow goes with the ghost (tied to its rise), not left hanging above the crest.
  ctx.globalAlpha = 0.22 * rise * fadeOut;
  glowAt(ctx, glowSprite(k, 14, [150, 170, 220], SOFT), x + sway * -10, base - 10 * depthScale,
    13 * depthScale, 15 * depthScale);
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(x, base);
  ctx.rotate(heading);
  ctx.scale(depthScale, depthScale);
  ctx.transform(1, 0, sway, 1, 0, 0);
  ctx.globalAlpha = 0.58 * vis;
  blit(ctx, spr, 0, 0);
  // Eye holes and a round little mouth, dark through the sheet.
  ctx.globalAlpha = 0.85 * vis;
  ctx.fillStyle = css([24, 22, 50]);
  ellipse(ctx, -1.45 + face * 1.25, -14.3, 0.72, 1.08);
  ellipse(ctx, 1.45 + face * 1.25, -14.3, 0.72, 1.08);
  ctx.globalAlpha = 0.5 * vis;
  ellipse(ctx, face * 0.9, -11.4, 0.5, 0.7);
  ctx.globalAlpha = 1;
}


// THE GHOSTS AS SHIPPED (Peter, 26 Sep 2026: "for the ghosts they can repeat a couple of
// times... have a variable number of ghosts 1-3"). A spot on the hill raises a group:
// one to three sheet-ghosts, a new count every time they come up, drawn from the spot's
// seed and the cycle, each a step to the side of the last and a beat behind it.
const GHOST_SPOTS = [0, -13, 12];
export function paintGhosts(ctx, f, seed) {
  // Temporary level-1 showcase: the first hill group always rises as a trio
  // and all three take the staggered flight, regardless of its cycle roll.
  const showcaseScatter = f.stageIndex === 1 && seed === 1;
  // Give the delayed first encounter time to drift out of view before its
  // cycle repeats; the other hill groups keep their established nine seconds.
  const period = showcaseScatter ? 12 : GHOST_P;
  const cycle = Math.floor((f.t + 0.8) / period);
  const n = showcaseScatter ? 3 : 1 + Math.floor(hash(seed * 13.1 + cycle * 7.7) * 3);
  // The decision is fixed for the whole appearance, so it never changes mid-flight.
  // One in ten trios scatter together. The original four-in-ten single-flyer
  // chance remains as a separate outcome; the other half stays on the hill.
  const flightRoll = hash(seed * 19.7 + cycle * 11.3);
  const scatter = showcaseScatter || (n === 3 && flightRoll < 0.1);
  const flyer = n === 3 && flightRoll >= 0.1 && flightRoll < 0.5
    ? Math.floor(hash(seed * 31.9 + cycle * 5.3) * 3) : -1;
  for (let j = n - 1; j >= 0; j--) {
    const dx = GHOST_SPOTS[j] + (hash(seed * 3.3 + j * 5.1 + cycle) - 0.5) * 4;
    const flying = scatter || j === flyer;
    const side = hash(seed * 47.9 + cycle * 3.7 + j * 11.3) < 0.5 ? -1 : 1;
    const flight = flying ? {
      start: 3.25 + (scatter ? j * 0.22 : 0),
      drift: scatter ? [-28, -6, 20][j] : side * 16,
      amp: scatter ? 27 + j * 4 : 30,
      phase: scatter ? [0.25, 2.3, 4.3][j]
        : TAU * hash(seed * 67.1 + cycle * 4.9 + j * 2.7),
    } : null;
    ctx.save();
    paintGhost(ctx, { ...f, x: f.x + dx, t: f.t - j * 0.45, period, flight });
    ctx.restore();
  }
}


// ------------------------------------------------------------------ 4. ZOMBIE HAND
// Out of the grave beside the round stone at u 962 (s .9): soil crumbs pop, a hand claws
// up against the fog, wriggles its fingers, grabs at the air twice and sinks back. The
// graveyard's own gag on the lane's zombies, small and far off.
const HAND_STONE = { u: 962, s: 0.9 };
const HAND_U = 966;
const HAND_P = 9;
const HAND_PAL = { body: [30, 29, 46], dark: [15, 14, 28], lit: [104, 114, 146] };
// A touch over the brief's 6 px, and a little forearm at full reach: 6 px was a speck at
// game scale.
const HAND_SIZE = 1.1;
const HAND_REACH = 0.7;
const HAND_DEEP = 9.5;
const HAND_FINGERS = [
  { x: -0.72, len: 1.45, fan: -0.34 },
  { x: -0.24, len: 1.8, fan: -0.1 },
  { x: 0.24, len: 1.75, fan: 0.1 },
  { x: 0.7, len: 1.4, fan: 0.34 },
];

// curls: four fingers and the thumb, 0 straight .. 1 a claw .. 1.4 a fist.
function paintHand(g, curls, spread) {
  g.scale(HAND_SIZE, HAND_SIZE);
  // Forearm out of the soil, a torn cuff, the palm.
  limb(g, [[0, 3], [0.05, 0], [0.15, -3.1]], 1.55, 1.25, 1);
  fillPoly(g, [-1.1, -0.3, -1.05, -1.5, 1.2, -1.55, 1.15, -0.2, 0.7, 0.35, 0.35, -0.1, -0.1, 0.4, -0.55, -0.05], 0.12, 2);
  ellipse(g, 0.15, -3.95, 1.08, 0.98);
  HAND_FINGERS.forEach((fg, j) => {
    const c = curls[j];
    const b = [0.15 + fg.x, -4.55 + Math.abs(fg.x) * 0.35];
    // Curling bends the tip over and draws the finger in: a fist is a row of knuckles.
    const fold = clamp01((c - 0.6) / 0.8);
    const a1 = -Math.PI / 2 + fg.fan * (0.6 + spread) * (1 - 0.6 * fold) + c * 0.4;
    const l1 = fg.len * 0.55 * (1 - 0.45 * fold);
    const m = [b[0] + Math.cos(a1) * l1, b[1] + Math.sin(a1) * l1];
    const a2 = a1 + c * 1.5 + fold * 0.6;
    const l2 = fg.len * 0.5 * (1 - 0.5 * fold);
    limb(g, [b, m, [m[0] + Math.cos(a2) * l2, m[1] + Math.sin(a2) * l2]], 0.62, 0.36, 3 + j);
  });
  const ct = curls[4];
  const tb = [-0.8, -3.6];
  const ta = -Math.PI / 2 - 0.95 - spread * 0.3 + ct * 0.7;
  const tm = [tb[0] + Math.cos(ta) * 0.75, tb[1] + Math.sin(ta) * 0.75];
  limb(g, [tb, tm, [tm[0] + Math.cos(ta + ct) * 0.6, tm[1] + Math.sin(ta + ct) * 0.6]], 0.7, 0.4, 9);
}

function handFrame(k, key, curls, spread) {
  return memo(`hand:${k}:${key}`, () => massSprite(k, [-4.5, -9.5, 9, 13.5], (g) => paintHand(g, curls, spread), {
    ...HAND_PAL, rim: 0.26, rimA: 0.8, dabs: 0.3, dab: 0.6, dabAng: -1.4, seed: 81, g0: 0.1,
  }));
}

function soilHeap(k) {
  return memo(`heap:${k}`, () => massSprite(k, [-3.5, -1.8, 7, 3], (g) => {
    for (const [x, y, rx, ry] of [[-1.5, 0.2, 1.0, 0.5], [-0.3, -0.1, 1.0, 0.65], [0.9, 0.05, 1.0, 0.5], [1.8, 0.3, 0.7, 0.4], [0.2, 0.4, 2.1, 0.45]]) ellipse(g, x, y, rx, ry);
  }, { ...SOIL, rim: 0.3, rimA: 0.6, dabs: 0.6, dab: 0.5, seed: 83, g0: 0 }));
}

function paintHandIdea(ctx, f) {
  const k = bakeScale(ctx);
  const c = wrap(f.t + 0.4, HAND_P);
  // Height out of the soil, 0..1.
  let h = 0;
  if (c >= 0.15 && c < 0.75) {
    const u = (c - 0.15) / 0.6;
    h = 1 + 0.12 * Math.sin(u * Math.PI) - Math.pow(1 - u, 3);
  } else if (c >= 0.75 && c < 3.9) h = 1;
  else if (c >= 3.9 && c < 4.9) h = 1 - smooth((c - 3.9) / 1.0);
  // The fingers.
  let key;
  let curls;
  let spread = 0.8;
  let sway = 0;
  if (c < 0.75) {
    key = 'open';
    curls = [0.35, 0.3, 0.3, 0.4, 0.3];
    spread = 1;
  } else if (c < 2.2) {
    const j = Math.floor(c * 11) % 6;
    key = `wr${j}`;
    const ph = (j / 6) * TAU;
    curls = [0, 1, 2, 3, 4].map((i) => 0.45 + 0.4 * Math.sin(ph + i * 1.25));
    sway = 0.1 * Math.sin(c * 3.3);
  } else if (c < 3.3) {
    const g = Math.max(bump(c, 2.2, 2.4, 2.55, 2.75), bump(c, 2.8, 2.98, 3.08, 3.3));
    const q = Math.round(g * 4);
    key = `grab${q}`;
    curls = [0, 1, 2, 3, 4].map((i) => 0.3 + q * 0.28 + (i === 4 ? -0.1 : 0));
    spread = 1 - q * 0.18;
    sway = 0.06 * g;
  } else if (c < 3.9) {
    key = 'open';
    curls = [0.35, 0.3, 0.3, 0.4, 0.3];
    spread = 1;
    sway = 0.05 * Math.sin(c * 23);
  } else {
    const q = Math.min(3, Math.floor((c - 3.9) * 4));
    key = `limp${q}`;
    curls = [0, 1, 2, 3, 4].map(() => 0.5 + q * 0.2);
    spread = 0.6;
  }

  // On the grave's plot just right of the stone, where it stands against the fog.
  const sx = f.x - (HAND_U - HAND_STONE.u);
  const x = sx + 6.4;
  const soilY = Math.max(f.ridgeY(x), footAt(f, sx, 3 * HAND_STONE.s)) + 1.0;
  if (h > 0.01) {
    const spr = handFrame(k, key, curls, spread);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 8, soilY - 16, 16, 16);
    ctx.clip();
    ctx.translate(x, soilY + (1 - h) * HAND_DEEP - h * HAND_REACH);
    ctx.rotate(sway);
    blit(ctx, spr, 0, 0);
    ctx.restore();
  }
  blit(ctx, soilHeap(k), x, soilY - 0.1);

  // Crumbs popping out of the soil as it breaks, and a few as it sinks back.
  ctx.fillStyle = css(SOIL.body);
  const crumbs = (t0, n, seed, vy0) => {
    for (let j = 0; j < n; j++) {
      const tau = c - t0 - j * 0.025;
      if (tau <= 0) continue;
      const vx = (hash(seed + j * 3.1) - 0.5) * 11;
      const vy = -(vy0 + hash(seed + j * 7.7) * 6);
      const px = x + vx * tau;
      const py = soilY - 0.4 + vy * tau + 30 * tau * tau;
      if (py > soilY + 0.3 || tau > 1) continue;
      const r = 0.36 + hash(seed + j * 5.3) * 0.3;
      ctx.fillStyle = css(j % 4 === 1 ? mix(SOIL.body, SOIL.lit, 0.5) : SOIL.dark);
      ellipse(ctx, px, py, r, r * 0.8);
    }
  };
  crumbs(0.05, 9, 11, 9);
  crumbs(4.55, 4, 29, 3);
}


// ------------------------------------------------------------------ 5. GRAVEDIGGER
// In the clear stretch of hill between the stone at 2236 and the crosses at 2340: a
// small hunched figure in a slouch hat digging a fresh grave, downhill of his spoil heap.
// Three strokes, each tossing soil back onto the heap, then he leans on the shovel and
// wipes his brow. His lantern stands on the heap and throws a soft warm pool.
const DIG_U = 2296;
const DIG_P = 10.8;
const SHOVEL = 12;
const DIG = {
  RESET: { hip: [0.1, -7.2], sh: [2.2, -12.2], head: [3.6, -13.7], footB: [-1.6, 0], footF: [2.4, 0], grip: [0.2, -10.2], a: 0.72, fB: 0.38, wipe: 0, wx: 0, load: 0, hat: 0.1 },
  DOWN: { hip: [0.4, -6.9], sh: [2.7, -11.5], head: [4.1, -12.8], footB: [-1.6, 0], footF: [2.5, 0], grip: [1.3, -8.6], a: 1.0, fB: 0.38, wipe: 0, wx: 0, load: 0, hat: 0.2 },
  HEAVE: { hip: [0.0, -7.3], sh: [1.9, -12.5], head: [3.3, -14.0], footB: [-1.6, 0], footF: [2.4, 0], grip: [-0.6, -9.4], a: 0.713, fB: 0.4, wipe: 0, wx: 0, load: 1, hat: 0.08 },
  TOSS: { hip: [-0.2, -7.5], sh: [0.8, -13.0], head: [2.0, -14.8], footB: [-1.6, 0], footF: [2.4, 0], grip: [3.2, -8.8], a: -2.35, fB: 0.4, wipe: 0, wx: 0, load: 0, hat: -0.05 },
  LEAN: { hip: [-0.3, -7.6], sh: [0.7, -13.3], head: [1.8, -15.2], footB: [-1.8, 0], footF: [1.5, 0], grip: [3.4, -10.6], a: 1.45, fB: 0.03, wipe: 0, wx: 0, load: 0, hat: 0.05 },
};
DIG.WIPE0 = { ...DIG.LEAN, head: [1.7, -15.0], wipe: 1, wx: 0, hat: 0.18 };
DIG.WIPE1 = { ...DIG.WIPE0, wx: 1 };
const STROKE = [
  [0.4, 'RESET', 'DOWN', 4],
  [0.25, 'DOWN', 'DOWN'],
  [0.5, 'DOWN', 'HEAVE', 5],
  [0.35, 'HEAVE', 'TOSS', 6],
  [0.5, 'TOSS', 'RESET', 5],
];
const DIG_T = track([
  ...STROKE, ...STROKE, ...STROKE,
  [0.6, 'RESET', 'LEAN', 5],
  [0.8, 'LEAN', 'LEAN'],
  [0.4, 'LEAN', 'WIPE0', 4],
  [0.33, 'WIPE0', 'WIPE1', 3],
  [0.33, 'WIPE1', 'WIPE0', 3],
  [0.34, 'WIPE0', 'WIPE1', 3],
  [0.4, 'WIPE1', 'LEAN', 4],
  [1.0, 'LEAN', 'LEAN'],
  [0.6, 'LEAN', 'RESET', 5],
]);
// Where, in a stroke, the soil leaves the blade: late in HEAVE→TOSS, the blade overhead.
const TOSS_RAW = 0.8;
const TOSS_AT = 0.4 + 0.25 + 0.5 + 0.35 * TOSS_RAW;
const LANTERN = [-6.3, -5.4]; // its glass, on the heap, from the digger's feet
const MOUND = { x: -7.6, w: 9.4, h: 3.3 };
const PIT = [5.0, 11.8];
// The heap's crown above its foot, dx from its centre.
const moundTop = (dx) => 1 - (MOUND.h + 1) * Math.sqrt(Math.max(0, 1 - (dx / (MOUND.w / 2)) ** 2));

function shovelOf(P) {
  const ux = Math.cos(P.a);
  const uy = Math.sin(P.a);
  return { ux, uy, tip: [P.grip[0] + ux * SHOVEL, P.grip[1] + uy * SHOVEL] };
}

function paintDigger(g, P) {
  const { ux, uy, tip } = shovelOf(P);
  const hA = P.grip;
  const shaft = [P.grip[0] + ux * SHOVEL * P.fB, P.grip[1] + uy * SHOVEL * P.fB];
  const brow = [P.head[0] + 1.0 - 1.7 * P.wx, P.head[1] - 0.2];
  const hB = [lerp(shaft[0], brow[0], P.wipe), lerp(shaft[1], brow[1], P.wipe)];
  // The shovel: shaft, T-grip, blade (with its load of soil).
  limb(g, [P.grip, [tip[0] - ux * 2.4, tip[1] - uy * 2.4]], 0.6, 0.55, 1);
  fillPoly(g, [P.grip[0] - uy * 0.9, P.grip[1] + ux * 0.9, P.grip[0] + uy * 0.9, P.grip[1] - ux * 0.9,
    P.grip[0] + uy * 0.9 + ux * 0.5, P.grip[1] - ux * 0.9 + uy * 0.5, P.grip[0] - uy * 0.9 + ux * 0.5, P.grip[1] + ux * 0.9 + uy * 0.5]);
  const n0 = [tip[0] - ux * 2.6, tip[1] - uy * 2.6];
  fillPoly(g, [n0[0] - uy * 0.85, n0[1] + ux * 0.85, n0[0] + uy * 0.85, n0[1] - ux * 0.85,
    tip[0] + uy * 0.75 - ux * 0.3, tip[1] - ux * 0.75 - uy * 0.3, tip[0] + ux * 0.2, tip[1] + uy * 0.2,
    tip[0] - uy * 0.75 - ux * 0.3, tip[1] + ux * 0.75 - uy * 0.3]);
  if (P.load > 0.05) ellipse(g, tip[0] - ux * 1.4 + uy * 0.5, tip[1] - uy * 1.4 - 0.7 * P.load, 1.4 * P.load, 0.9 * P.load);
  // Legs (knees forward), boots.
  for (const [foot, off] of [[P.footB, -0.4], [P.footF, 0.4]]) {
    const hip = [P.hip[0] + off, P.hip[1]];
    const knee = joint(hip, foot, 3.9, 3.9, -1);
    limb(g, [hip, knee, [foot[0], foot[1] - 0.5]], 1.9, 1.2, 3 + off);
    ellipse(g, foot[0] + 0.45, foot[1] - 0.45, 1.05, 0.55);
  }
  // Coat: from its skirt up the hunched back to the shoulder.
  const skirt = [P.hip[0] - 0.4, P.hip[1] + 2.4];
  const back = [lerp(P.hip[0], P.sh[0], 0.55) - 0.7, lerp(P.hip[1], P.sh[1], 0.55)];
  limb(g, [skirt, P.hip, back, P.sh], 4.4, 3.0, 5);
  ellipse(g, back[0] + 0.2, back[1] - 0.3, 1.9, 2.1, 0.4);
  // Head, nose, slouch hat.
  const [hx, hy] = P.head;
  limb(g, [P.sh, [hx - 0.3, hy + 0.4]], 1.7, 1.5, 6);
  ellipse(g, hx, hy, 1.3, 1.4);
  ellipse(g, hx + 1.15, hy + 0.35, 0.55, 0.45);
  g.save();
  g.translate(hx - 0.1, hy - 1.0);
  g.rotate(P.hat);
  ellipse(g, 0, 0, 2.7, 0.55);
  ellipse(g, -0.2, -0.75, 1.55, 1.05);
  g.restore();
  // Arms: the far one to the grip, the near one down the shaft (or up to his brow).
  const armA = joint(P.sh, hA, 3.3, 3.3, 1);
  limb(g, [P.sh, armA, hA], 1.5, 1.0, 7);
  ellipse(g, hA[0], hA[1], 0.62, 0.62);
  const armB = joint([P.sh[0] + 0.3, P.sh[1] + 0.3], hB, 3.3, 3.3, 1);
  limb(g, [[P.sh[0] + 0.3, P.sh[1] + 0.3], armB, hB], 1.55, 1.05, 8);
  ellipse(g, hB[0], hB[1], 0.65, 0.62);
}

function diggerFrame(k, s) {
  return memo(`dig:${k}:${s.a}>${s.b}:${s.p}`, () => {
    const P = lerpPose(DIG[s.a], DIG[s.b], s.p);
    return massSprite(k, [-9, -21, 24, 24], (g) => paintDigger(g, P), {
      ...INK, rim: 0.5, rimA: 0.95, dabs: 0.25, dab: 0.9, dabAng: -1.3, seed: 91, g0: 0.25,
    }, (g) => {
      // The lantern's warm light on his back and legs, from the heap behind him.
      const wl = g.createRadialGradient(LANTERN[0], LANTERN[1], 0.5, LANTERN[0], LANTERN[1], 11);
      wl.addColorStop(0, css(C.warm, 0.55));
      wl.addColorStop(0.45, css(C.warm, 0.22));
      wl.addColorStop(1, css(C.warm, 0));
      g.fillStyle = wl;
      g.fillRect(-9, -21, 24, 24);
    });
  });
}

function moundSprite(k) {
  return memo(`mound:${k}`, () => {
    const { w, h } = MOUND;
    return massSprite(k, [-w / 2 - 2, -h - 2, w + 4, h + 4], (g) => {
      fillPoly(g, [-w / 2, 1, ...arcPts(0, 1, w / 2, h + 1, Math.PI, TAU, 18).slice(2, -2), w / 2, 1], 0.35, 5);
      ellipse(g, -1.2, -h + 0.6, 2.2, 1.0);
      ellipse(g, 2.3, -h + 1.6, 1.8, 0.8);
    }, { ...SOIL, rim: 0.55, rimA: 0.9, dabs: 0.6, dab: 0.7, seed: 95, g0: 0.1 }, (g, R) => {
      const lx = LANTERN[0] - MOUND.x;
      const wl = g.createRadialGradient(lx, moundTop(lx) - 1.2, 0.3, lx, moundTop(lx) - 1.2, 6);
      wl.addColorStop(0, css(C.warm, 0.32));
      wl.addColorStop(1, css(C.warm, 0));
      g.fillStyle = wl;
      g.fillRect(-w / 2 - 2, -h - 2, w + 4, h + 4);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = css(R() < 0.5 ? shade(SOIL.body, 0.12) : SOIL.dark, 0.5);
        dab(g, (R() - 0.5) * w * 0.9, -R() * h, 0.5 + R() * 0.5, 0.35, 0);
      }
    });
  });
}

// The pit's near lip: fresh earth thrown up along the crest, over the blade's dig.
function lipSprite(k) {
  return memo(`lip:${k}`, () => {
    const [a, b] = PIT;
    return massSprite(k, [a - 1.5, -2.5, b - a + 3, 5.5], (g) => {
      const pts = [a - 0.6, 2.2];
      for (let j = 0; j <= 10; j++) {
        const x = a + (b - a) * (j / 10);
        pts.push(x, -0.15 - 0.55 * Math.sin((j / 10) * Math.PI) - 0.12 * Math.sin(j * 2.1));
      }
      pts.push(b + 0.6, 2.2);
      fillPoly(g, pts, 0.25, 9);
    }, { ...SOIL, rim: 0.45, rimA: 0.9, dabs: 0.7, dab: 0.6, seed: 97, g0: 0 });
  });
}

function paintLantern(ctx, x, y, t, k) {
  const flicker = 0.86 + 0.14 * Math.sin(t * 11.3) * Math.sin(t * 7.1 + 0.4);
  // The warm pool on the heap, the digger and the ground, then a tighter bloom.
  ctx.globalAlpha = 0.22 * flicker;
  glowAt(ctx, glowSprite(k, 24, C.warm, [[0, 0.8], [0.35, 0.3], [0.7, 0.08], [1, 0]]), x + 2, y + 1.5, 22, 11);
  ctx.globalAlpha = 0.28 * flicker;
  glowAt(ctx, glowSprite(k, 12, C.warm, SOFT), x, y - 1.4, 9);
  ctx.globalAlpha = 1;
  const iron = css([22, 18, 34]);
  ctx.fillStyle = iron;
  ctx.fillRect(x - 1.05, y - 0.45, 2.1, 0.45);
  ctx.fillStyle = css(mix(C.flame, C.warm, 0.35));
  ctx.globalAlpha = 0.85 + 0.15 * flicker;
  ctx.fillRect(x - 0.8, y - 2.3, 1.6, 1.85);
  ctx.globalAlpha = 1;
  ctx.fillStyle = css(shade(C.flame, 0.3));
  ctx.fillRect(x - 0.25, y - 1.9, 0.5, 1.1);
  ctx.fillStyle = iron;
  ctx.fillRect(x - 0.12, y - 2.3, 0.24, 1.85);
  ctx.beginPath();
  ctx.moveTo(x - 1.15, y - 2.2);
  ctx.lineTo(x, y - 3.1);
  ctx.lineTo(x + 1.15, y - 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = iron;
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.arc(x, y - 3.1, 0.7, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.globalAlpha = 0.5 * flicker;
  glowAt(ctx, glowSprite(k, 4, C.flame, SOFT), x, y - 1.4, 2.6);
  ctx.globalAlpha = 1;
}

function paintDiggerIdea(ctx, f) {
  const k = bakeScale(ctx);
  const t = f.t;
  const c = wrap(t + 5.3, DIG_P);
  const s = DIG_T(c);
  const x = f.x;
  const y = f.ridgeY(x) + 0.6;
  const mx = x + MOUND.x;
  const my = f.ridgeY(mx) + 0.9;
  blit(ctx, moundSprite(k), mx, my);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.07;
  glowAt(ctx, glowSprite(k, 24, C.warm, SOFT), mx + 3, my - 3, 20, 12);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  paintLantern(ctx, x + LANTERN[0], my + moundTop(LANTERN[0] - MOUND.x) + 0.35, t, k);
  blit(ctx, diggerFrame(k, s), x, y);
  blit(ctx, lipSprite(k), x, f.ridgeY(x + (PIT[0] + PIT[1]) / 2) + 0.9);

  // Soil flung off the blade at the top of each heave, arcing back onto the heap.
  const inStroke = c < 3 * 2.0 ? wrap(c, 2.0) : -1;
  if (inStroke >= TOSS_AT) {
    const tau = inStroke - TOSS_AT;
    const Pr = lerpPose(DIG.HEAVE, DIG.TOSS, smooth(TOSS_RAW));
    const { tip } = shovelOf(Pr);
    for (let j = 0; j < 7; j++) {
      const e = tau - j * 0.018;
      if (e <= 0 || e > 0.7) continue;
      const vx = -(10 + hash(j * 3.7 + 1) * 7);
      const vy = -(6 + hash(j * 5.1 + 2) * 6);
      const px = x + tip[0] + vx * e;
      const py = y + tip[1] + vy * e + 34 * e * e;
      if (py > my - 0.5) continue;
      const r = 0.4 + hash(j * 2.3 + 7) * 0.35;
      ctx.fillStyle = css(j % 3 ? SOIL.body : mix(SOIL.lit, C.warm, 0.3));
      ellipse(ctx, px, py, r, r * 0.8);
    }
  }
}


// ------------------------------------------------------------------ the ideas
export const IDEAS = [
  {
    id: 'mid-cat', name: 'BLACK CAT', layer: 'mid', when: 'on', u: CAT_U, focusUp: 27, zoom: 4,
    note: 'A black cat on the cornice of the domed tomb, eyes glinting green. Her tail swishes over the edge and her ears flick; now and then she arches, stretches and settles again.',
    paint: paintCatIdea,
  },
  {
    id: 'mid-wisps', name: "WILL-O'-WISPS", layer: 'mid', when: 'on', u: WISP_U, focusUp: 10,
    note: 'Three pale ghost-lights drift and bob among the headstones, flickering, dimming and brightening, each lighting the stones beneath it. One wanders off up the hill and comes back.',
    paint: paintWisps,
  },
  {
    id: 'mid-ghost', name: 'SHEET GHOST', layer: 'mid', when: 'behind', u: GHOST_U, focusUp: 12,
    note: 'Every few seconds a translucent sheet-ghost rises out of a grave behind the crest, sways, looks left and right through two dark eye holes, and sinks back.',
    paint: paintGhost,
  },
  {
    id: 'mid-hand', name: 'ZOMBIE HAND', layer: 'mid', when: 'on', u: HAND_U, focusUp: 6, zoom: 4,
    note: 'Soil crumbs pop in front of a headstone and a hand claws up out of the grave, wriggles its fingers, grabs at the air twice and sinks back.',
    paint: paintHandIdea,
  },
  {
    id: 'mid-digger', name: 'GRAVEDIGGER', layer: 'mid', when: 'on', u: DIG_U, focusUp: 9,
    note: 'A hunched gravedigger digs a fresh grave, tossing soil back onto his heap, then leans on the shovel and wipes his brow. His lantern on the heap throws a soft warm pool.',
    paint: paintDiggerIdea,
  },
];
