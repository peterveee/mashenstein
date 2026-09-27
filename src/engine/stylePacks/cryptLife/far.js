// CRYPT SHIFT scenery bake-off — THE FAR RIDGE AND THE SKY (layer 'bg'). Four ideas for
// the hazy ridge the abbey stands on, painted with the shipped backdrop's own kit
// (GOUACHE_KIT) so they belong to the picture: opaque masses, a moonlit rim, no ink.
// Everything out here is tiny and pale, and its lights are small and soft; the lane goes
// on top of it all.
//
// Positions are in the far ridge's layer space (period 2880, scrolling at 0.07 x ZOOM).
// Every sprite is baked once per scale (the context's, capped at 3); a frame is a handful
// of blits and a few small shapes.
import { GOUACHE_KIT as K } from '../cryptGouache.js';

const { massSprite, limb, dab, fillPoly, rectPts, blit, canvas, css, mix, shade, hash, vnoise, drawBat, C } = K;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (x) => { const v = clamp(x, 0, 1); return v * v * (3 - 2 * v); };

// A lamp seen across the valley: the lamps' warm note, a touch hazed.
const FAR_WARM = mix(C.warm, [200, 190, 220], 0.12);
const FAR_FLAME = mix(C.flame, [230, 226, 240], 0.1);

function bakeScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const k = (m && Math.hypot(m.a, m.b)) || 1;
  return Math.min(3, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}
// One build per bake scale.
function perScale(build) {
  const byScale = new Map();
  return (r) => {
    let v = byScale.get(r);
    if (!v) {
      v = build(r);
      byScale.set(r, v);
    }
    return v;
  };
}

// The foot of a building on this ridge on screen, found the way the bake places it: the
// lowest crest under its footprint, plus its sink.
function footY(f, half) {
  let y = -Infinity;
  for (let d = -half; d <= half; d += 2) y = Math.max(y, f.ridgeY(f.x + d));
  return y + 2;
}

// A soft round glow, centred on its canvas: `stops` are [offset, alpha].
function glowSprite(r, rad, col, stops) {
  const c = canvas(2 * rad * r, 2 * rad * r);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, rad * r, rad * r);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  for (const [o, a] of stops) gr.addColorStop(o, css(col, a));
  g.fillStyle = gr;
  g.fillRect(-rad, -rad, 2 * rad, 2 * rad);
  return { c, rad };
}
function drawGlow(ctx, G, x, y, scale = 1) {
  const d = G.rad * scale;
  ctx.drawImage(G.c, x - d, y - d, 2 * d, 2 * d);
}


// ================================================================== 1. BELFRY BATS
// Every twelve seconds a stream of bats pours out of the abbey's belfry window, swoops
// out and up toward the moon, wheels round it as a loose flock and breaks up, each bat
// peeling off on its own line and dwindling into the dark. Then a few quiet seconds.
const SWARM = {
  period: 12, lead: 0.4, n: 26, pour: 1.9,
  out: 1.7, // seconds from the window to the wheel
  turn: 0.9 * TAU, // how far round the moon the flock wheels
  speed: 44, // px/s round the wheel
  gone: 1.7, // seconds to disperse
  rx: 32, ry: 22,
};
const BAT_COL = [16, 20, 44];
const BAT_FRAMES = 8;
const BAT_BOX = { w: 24, h: 20 }; // bat units, centred on the body
const batFrames = perScale((r) => {
  const q = r * 0.3; // enough for a bat drawn up to s 0.3
  const out = [];
  for (let i = 0; i < BAT_FRAMES; i++) {
    const c = canvas(BAT_BOX.w * q, BAT_BOX.h * q);
    const g = c.getContext('2d');
    g.setTransform(q, 0, 0, q, (BAT_BOX.w / 2) * q, (BAT_BOX.h / 2) * q);
    drawBat(g, { x: 0, y: 0, s: 1, flap: i / BAT_FRAMES });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = css(BAT_COL);
    g.fillRect(0, 0, c.width, c.height);
    out.push(c);
  }
  return out;
});

function bez(p0, p1, p2, p3, u) {
  const v = 1 - u;
  return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
}

const BELFRY_BATS = {
  id: 'belfry-bats',
  name: 'BELFRY BATS',
  note: 'Every twelve seconds a stream of tiny bats pours out of the abbey\'s belfry window, '
    + 'wheels round the moon as a loose flock and scatters into the dark; then a quiet gap.',
  layer: 'bg', when: 'on', u: 360, reach: 200, focusUp: 58, zoom: 1.35,
  paint(ctx, f) {
    const S = SWARM;
    const tt = f.t + S.lead;
    const cyc = Math.floor(tt / S.period);
    const tau = tt - cyc * S.period;
    const life = S.out + S.turn / (S.speed / S.rx) + S.gone + 0.6;
    if (tau > S.pour + life) return;
    const frames = batFrames(bakeScale(ctx));
    const bx = f.x;
    const by = footY(f, 50);
    // The belfry window, and the wheel: round the moon when it is anywhere near, else
    // up and to the moon side of the spire.
    const ex = bx + 10;
    const ey = by - 43;
    const mx = f.view.moon.x;
    const my = f.view.moon.y + f.view.y.sky;
    const wx = bx + clamp(mx - bx, 20, 150) - 16;
    const wy = by + clamp(my - by, -118, -60) + 4;
    const th0 = Math.PI * 0.85; // the flock joins the wheel low on its left
    for (let i = 0; i < S.n; i++) {
      const sd = cyc * 131 + i * 7.3;
      const h1 = hash(sd + 1);
      const h2 = hash(sd + 2);
      const h3 = hash(sd + 3);
      const born = (i / S.n) * S.pour + (hash(sd) - 0.5) * 0.06;
      const age = tau - born;
      if (age < 0) continue;
      const rx = S.rx * (0.78 + 0.44 * h1);
      const ry = S.ry * (0.78 + 0.44 * h2);
      const w = (S.speed / S.rx) * (0.9 + 0.2 * h3);
      const turn = S.turn * (0.85 + 0.3 * hash(sd + 4));
      const tWheel = turn / w;
      const qx = wx + rx * Math.cos(th0);
      const qy = wy + ry * Math.sin(th0);
      // Tangent at the join, travelling round anticlockwise on screen (theta falling).
      const tx0 = rx * Math.sin(th0);
      const ty0 = -ry * Math.cos(th0);
      const tl = Math.hypot(tx0, ty0);
      let x;
      let y;
      let s = 0.17 + 0.07 * hash(sd + 5);
      let a = 1;
      // A bat's own flutter, growing as the stream loosens into a flock.
      const jit = 0.4 + 2.2 * smooth(age / 2.2);
      const jx = vnoise(age * 1.9, sd) * jit;
      const jy = vnoise(age * 2.3, sd + 40) * jit * 0.8;
      if (age < S.out) {
        const u0 = age / S.out;
        const u = u0 * (0.55 + 0.45 * u0);
        const c1x = ex + 14;
        const c1y = ey + 6;
        const c2x = qx - (tx0 / tl) * 26;
        const c2y = qy - (ty0 / tl) * 26;
        x = bez(ex, c1x, c2x, qx, u);
        y = bez(ey, c1y, c2y, qy, u);
        // Out of the dark of the window: small and faint for the first beat.
        const e = smooth(age / 0.3);
        s *= 0.55 + 0.45 * e;
        a = e;
      } else if (age < S.out + tWheel) {
        const th = th0 - w * (age - S.out);
        x = wx + rx * Math.cos(th);
        y = wy + ry * Math.sin(th);
      } else {
        const k = age - S.out - tWheel;
        if (k > S.gone) continue;
        const th = th0 - turn;
        const px = wx + rx * Math.cos(th);
        const py = wy + ry * Math.sin(th);
        // Break away outward as much as onward, so the flock opens like a hand.
        const ttx = rx * Math.sin(th);
        const tty = -ry * Math.cos(th);
        const ttl = Math.hypot(ttx, tty) || 1;
        const hd = Math.atan2(0.7 * tty / ttl + 0.8 * Math.sin(th), 0.7 * ttx / ttl + 0.8 * Math.cos(th))
          + (hash(sd + 6) - 0.5) * 2.4;
        const v = S.speed * (0.9 + 0.4 * hash(sd + 7));
        x = px + Math.cos(hd) * v * k;
        y = py + Math.sin(hd) * v * k - 6 * k * k;
        const fade = k / S.gone;
        s *= 1 - 0.4 * fade;
        a = 1 - smooth(fade);
      }
      x += jx;
      y += jy;
      const fr = Math.floor((((age * 7.5 + h1) % 1) + 1) % 1 * BAT_FRAMES) % BAT_FRAMES;
      ctx.globalAlpha = a;
      ctx.drawImage(frames[fr], x - (BAT_BOX.w / 2) * s, y - (BAT_BOX.h / 2) * s, BAT_BOX.w * s, BAT_BOX.h * s);
    }
    ctx.globalAlpha = 1;
  },
};


// ================================================================== 2. GHOST HEARSE
// A black carriage hearse behind a pale ghost horse, its two lamps lit, rolling along the
// top of the far ridge at a funeral trot. It keeps its own pace, so the scroll gains on
// it; it passes behind the groves and the abbey and comes round again much later.
const HEARSE = {
  speed: 9, // layer px/s, travelling right
  stride: 4.6, // px per trot cycle
  frames: 6,
  size: 0.88, // the rig is drawn this much smaller than its local units
};
const HEARSE_PAL = { body: [28, 31, 60], dark: [22, 24, 50], lit: [104, 114, 160] };
const GHOST_PAL = { body: [122, 134, 184], dark: [92, 102, 154], lit: [196, 206, 238] };

// Local coords: facing right, origin on the ground under the middle of the rig.
const hearseBody = perScale((r) => massSprite(r, [-12, -13, 16, 14], (g) => {
  // The box and its canopy.
  fillPoly(g, rectPts(-9.6, -7.4, 8.4, 5.2), 0.12, 1);
  fillPoly(g, [-10.2, -7.2, -10, -8.2, -5.4, -8.8, -0.8, -8.2, -0.6, -7.2], 0.1, 2);
  // Plumes on the roof corners and the middle.
  for (const [px, ph] of [[-9.6, 1.5], [-5.4, 1.9], [-1.3, 1.5]]) dab(g, px, -8.4 - ph * 0.5, 0.55, ph * 0.55, 0.2);
  // Chassis, springs, and the wheels (the rear one the larger).
  fillPoly(g, rectPts(-9.2, -2.6, 8.6, 0.9), 0, 3);
  g.beginPath(); g.arc(-7.4, -1.75, 1.75, 0, TAU); g.fill();
  g.beginPath(); g.arc(-2.6, -1.4, 1.4, 0, TAU); g.fill();
  // The driver's box, and the driver hunched on it in a tall hat.
  fillPoly(g, [-1.4, -6.2, 0.9, -6.4, 1.1, -4.8, -1.4, -4.8], 0.08, 4);
  dab(g, -0.3, -7.6, 0.95, 1.35, -0.3);
  fillPoly(g, [-1.1, -8.7, 0.4, -8.8, 0.3, -10.9, -0.9, -10.8], 0.05, 5);
  fillPoly(g, rectPts(-1.5, -8.9, 2.3, 0.45), 0, 6);
  // The shafts, running forward to the horse.
  limb(g, [[0.4, -3.4], [2.4, -4.0], [4.2, -4.6]], 0.55, 0.4, 7);
}, { ...HEARSE_PAL, rim: 0.45, rimA: 0.75, dabs: 0.4, dab: 0.6, seed: 1201, g0: 0.1 }, (g) => {
  // The glass side: the coffin's pale shape inside, barely there.
  g.fillStyle = css(mix(HEARSE_PAL.body, GHOST_PAL.dark, 0.35));
  fillPoly(g, rectPts(-8.6, -6.6, 6.4, 3.4), 0.05, 8);
  g.fillStyle = css(mix(HEARSE_PAL.body, GHOST_PAL.body, 0.45), 0.8);
  fillPoly(g, rectPts(-8, -4.2, 5.2, 0.9), 0.05, 9);
  g.fillStyle = css(HEARSE_PAL.dark);
  fillPoly(g, rectPts(-5.6, -6.6, 0.5, 3.4), 0, 10);
}));

// The ghost horse, one sprite per trot frame: diagonal pairs of legs swing together.
const ghostHorse = perScale((r) => {
  const out = [];
  for (let fi = 0; fi < HEARSE.frames; fi++) {
    const ph = (fi / HEARSE.frames) * TAU;
    const spr = massSprite(r, [0, -11, 14, 12], (g) => {
      // Barrel, rump and chest: one deep body, a touch higher at the withers.
      dab(g, 6.1, -5.3, 3.0, 1.55, -0.04);
      dab(g, 3.6, -5.35, 1.6, 1.5, 0.15);
      dab(g, 8.4, -5.55, 1.5, 1.55, -0.1);
      // The neck reaching forward and up, the head long and bowed in harness.
      limb(g, [[8.4, -5.9], [9.6, -7.3], [10.5, -8.3]], 2.4, 1.3, 1);
      limb(g, [[10.2, -8.7], [11.3, -7.9], [12.2, -6.8]], 1.45, 0.85, 2);
      dab(g, 10.1, -9.2, 0.35, 0.7, 0.35); // ear
      // Mane, and the tail streaming back.
      limb(g, [[10.3, -8.9], [9.4, -8.0], [8.4, -7.0]], 0.7, 0.4, 3);
      limb(g, [[2.3, -6.1], [1.3, -5.6], [0.5, -4.2]], 1.1, 0.35, 4);
      // Legs: near-fore with far-hind, far-fore with near-hind, a knee in each.
      for (const [hx, off] of [[8.5, 0], [4.0, Math.PI], [7.9, Math.PI], [3.4, 0]]) {
        const sw = Math.sin(ph + off);
        const lift = Math.max(0, Math.cos(ph + off)) * 0.9;
        limb(g, [[hx, -4.6], [hx + sw * 0.6, -2.3 - lift * 0.4], [hx + sw * 1.3, -0.2 - lift]], 0.95, 0.5, hx + off);
      }
    }, { ...GHOST_PAL, rim: 0.5, rimA: 0.9, dabs: 0.3, dab: 0.6, seed: 1300 + fi, g0: 0.25 }, (g) => {
      // A ghost's legs thin into the mist at the hooves.
      g.globalCompositeOperation = 'destination-out';
      const gr = g.createLinearGradient(0, -2.6, 0, 0.5);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = gr;
      g.fillRect(0, -2.6, 14, 3.2);
    });
    out.push(spr);
  }
  return out;
});
const ghostGlow = perScale((r) => glowSprite(r, 9, [170, 184, 230], [[0, 0.28], [0.45, 0.1], [1, 0]]));
const lampGlow = perScale((r) => glowSprite(r, 4.5, FAR_WARM, [[0, 0.55], [0.35, 0.2], [1, 0]]));
const mistPuff = perScale((r) => glowSprite(r, 3, [176, 188, 226], [[0, 0.35], [1, 0]]));

function drawLamp(ctx, G, x, y, fl) {
  ctx.globalAlpha = fl;
  drawGlow(ctx, G, x, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = css(mix(FAR_WARM, FAR_FLAME, 0.5));
  dab(ctx, x, y, 0.45, 0.6, 0);
  ctx.fillStyle = css(FAR_FLAME);
  dab(ctx, x, y, 0.22, 0.3, 0);
}

const GHOST_HEARSE = {
  id: 'ghost-hearse',
  name: 'GHOST HEARSE',
  note: 'A black hearse behind a pale ghost horse, two carriage lamps lit, trots along the top of the far ridge at '
    + 'its own slow pace, so the scroll gains on it; it slips behind the groves and the abbey and comes round again later.',
  layer: 'bg', when: 'behind', u: 540, reach: 2900,
  paint(ctx, f) {
    const P = 2880;
    const dist = f.t * HEARSE.speed;
    const hx = f.x + (((dist % P) + P) % P);
    if (hx < f.view.left - 24 || hx > f.view.right + 24) return;
    const r = bakeScale(ctx);
    // Rear wheel and front hooves on the crest. On a slope steeper than the rig may tilt,
    // the end that would float is set down and the other sinks behind the crest instead,
    // where the ridge hides it.
    const yr = f.ridgeY(hx - 7.4);
    const yf = f.ridgeY(hx + 7);
    const ang = clamp(Math.atan2(yf - yr, 14.4), -0.55, 0.55);
    const tn = Math.tan(ang);
    const yc = Math.max(yr + tn * 7.4, yf - tn * 7);
    const trot = dist / HEARSE.stride;
    const fi = Math.floor(((trot % 1) + 1) % 1 * HEARSE.frames) % HEARSE.frames;
    const bob = 0.22 * Math.sin(trot * TAU * 2);
    ctx.translate(hx, yc + 0.4);
    ctx.rotate(ang);
    ctx.scale(HEARSE.size, HEARSE.size);
    // The horse's own faint light, and the mist it leaves at its hooves: puffs laid
    // on the ground every few px, so they stay put as it trots on.
    const G = ghostGlow(r);
    ctx.globalAlpha = 0.7;
    drawGlow(ctx, G, 7.5, -5.5);
    const M = mistPuff(r);
    const lay = ((dist % 3.2) + 3.2) % 3.2;
    for (let k = 0; k < 6; k++) {
      const back = lay + k * 3.2;
      ctx.globalAlpha = 0.5 * (1 - k / 6) * (0.7 + 0.3 * Math.sin(f.t * 3 + k));
      drawGlow(ctx, M, 6 - back, -0.6 - k * 0.25, 0.8 + k * 0.12);
    }
    ctx.globalAlpha = 0.78;
    blit(ctx, ghostHorse(r)[fi], 0, bob * 0.5);
    ctx.globalAlpha = 1;
    blit(ctx, hearseBody(r), 0, bob);
    // The two carriage lamps, swaying a hair on their brackets.
    const L = lampGlow(r);
    const fl = (k) => 0.82 + 0.18 * Math.sin(f.t * 9.1 + k) * Math.sin(f.t * 5.3 + k * 1.7);
    drawLamp(ctx, L, 1.2 + 0.1 * Math.sin(trot * TAU), -6.9 + bob, fl(0));
    drawLamp(ctx, L, -10.3 + 0.1 * Math.sin(trot * TAU + 1), -6.7 + bob, fl(2));
  },
};


// ================================================================== 3. THE ABBEY'S MONK
// A hooded monk with a lantern keeps the ruin: painted BEHIND the ridge strip, so he is
// seen only through the abbey's own window holes. His light crosses a lancet, is lost
// behind the wall, finds the next; at the middle lancet and at the rose window he stops
// and lifts the lantern; at the west end he turns back out of sight.
const MONK = { speed: 6, lead: 9.8 };
// Stops, west is negative (abbey-local x). He walks between them.
const MONK_LEGS = (() => {
  const plan = [
    { x: 34, stop: 3.4, lift: true }, // the transept's rose window
    { x: -27, stop: 3.2, lift: true }, // the middle lancet
    { x: -50, stop: 1.6, lift: false }, // the west wall: turn, unseen
  ];
  const legs = [];
  let t = 0;
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i];
    const b = plan[(i + 1) % plan.length];
    const prev = plan[(i + plan.length - 1) % plan.length];
    // Facing as he arrives, and as he leaves; he turns halfway through a stop that
    // lifts nothing, and just before he sets off from one that does.
    legs.push({
      kind: 'stop', t0: t, t1: t + a.stop, x: a.x, lift: a.lift,
      faceIn: Math.sign(a.x - prev.x), faceOut: Math.sign(b.x - a.x), turnAt: a.lift ? a.stop - 0.3 : a.stop / 2,
    });
    t += a.stop;
    const dur = Math.abs(b.x - a.x) / MONK.speed;
    legs.push({ kind: 'walk', t0: t, t1: t + dur, x0: a.x, x1: b.x });
    t += dur;
  }
  return { legs, period: t };
})();

function monkAt(t) {
  const { legs, period } = MONK_LEGS;
  const tl = (((t + MONK.lead) % period) + period) % period;
  let dist = 0;
  for (const L of legs) {
    if (tl >= L.t1) {
      if (L.kind === 'walk') dist += Math.abs(L.x1 - L.x0);
      continue;
    }
    const k = tl - L.t0;
    if (L.kind === 'stop') {
      const lift = L.lift ? smooth((k - 0.4) / 0.6) * (1 - smooth((k - (L.t1 - L.t0) + 0.9) / 0.6)) : 0;
      return { x: L.x, dist, face: k < L.turnAt ? L.faceIn : L.faceOut, walking: false, since: k, lift };
    }
    // Eased into and out of every stop.
    const D = L.t1 - L.t0;
    const e = Math.min(0.5, D / 3);
    const vmax = 1 / (D - e);
    let u;
    if (k < e) u = 0.5 * vmax * k * k / e;
    else if (k > D - e) u = 1 - 0.5 * vmax * (D - k) * (D - k) / e;
    else u = 0.5 * vmax * e + vmax * (k - e);
    const x = L.x0 + (L.x1 - L.x0) * u;
    return { x, dist: dist + Math.abs(x - L.x0), face: Math.sign(L.x1 - L.x0), walking: true, since: k, lift: 0 };
  }
  return { x: 34, dist, face: 1, walking: false, since: 0, lift: 0 };
}

const MONK_PAL = { body: [30, 27, 50], dark: [22, 20, 40], lit: [84, 86, 124] };
// Walk frames facing right; facing left is a separate bake so the lantern-lit front and
// the moonlit rim both stay true.
const monkFrames = perScale((r) => {
  const bake = (face, fi) => {
    const sw = Math.sin((fi / 4) * TAU);
    const X = (x) => x * face;
    const pts = [
      X(-1.5 - 0.25 * sw), 0, X(1.3 + 0.3 * sw), 0, X(1.0), -2.2, X(0.95), -3.4, X(1.05), -4.1,
      X(0.75), -4.95, X(0.1), -5.6, X(-0.6), -5.4, X(-1.1), -4.4, X(-1.25), -3.2, X(-1.45), -1.4,
    ];
    return massSprite(r, [-3, -7, 6, 7.5], (g) => {
      fillPoly(g, pts, 0.06, fi + face);
    }, { ...MONK_PAL, rim: 0.35, rimA: 0.7, dabs: 0.3, dab: 0.5, seed: 1400 + fi, g0: 0.2 }, (g) => {
      // His lantern is in front of him: that side of the robe is warm.
      const gr = g.createLinearGradient(X(-0.6), 0, X(1.4), 0);
      gr.addColorStop(0, css(FAR_WARM, 0));
      gr.addColorStop(1, css(FAR_WARM, 0.5));
      g.fillStyle = gr;
      g.fillRect(-3, -7, 6, 7.5);
      // The dark of the hood's opening.
      g.fillStyle = css(shade(MONK_PAL.dark, -0.4));
      dab(g, X(0.72), -4.45, 0.32, 0.5, 0);
    });
  };
  return { right: [0, 1, 2, 3].map((i) => bake(1, i)), left: [0, 1, 2, 3].map((i) => bake(-1, i)) };
});
// The abbey's outline (cryptGouache.js abbeySprite: nave, tower, transept), a pixel
// inside its walls: the monk's light is clipped to it.
const ABBEY_INSIDE = [
  -53, 2, -53, -23, -48, -29, -44, -27.5, -40, -28, -34, -35, -28, -34, -22, -33, -16, -39, -8, -36,
  3, -39, 3, -53, 17, -53, 17, -26, 28, -33, 32, -29, 38, -35, 49, -24, 49, 2,
];
const lanternGlow = perScale((r) => glowSprite(r, 13, FAR_WARM, [[0, 0.7], [0.22, 0.38], [0.55, 0.12], [1, 0]]));
const lanternCore = perScale((r) => glowSprite(r, 2.2, FAR_FLAME, [[0, 1], [0.5, 0.6], [1, 0]]));

const ABBEY_MONK = {
  id: 'abbey-monk',
  name: 'THE ABBEY\'S MONK',
  note: 'A hooded monk with a swinging lantern walks the ruined abbey, seen only through its windows: the warm '
    + 'glow crosses a lancet, is lost behind the wall, finds the next, stops to lift the lantern, then moves on.',
  layer: 'bg', when: 'behind', u: 360, focusUp: 16, zoom: 3,
  paint(ctx, f) {
    const r = bakeScale(ctx);
    const bx = f.x;
    const by = footY(f, 50);
    const m = monkAt(f.t);
    const x = bx + m.x;
    // He walks on the ground just beyond the windows: never below the nave's sills, and
    // clear of the crest (and its moonlit rim) that hides their feet.
    const y = Math.min(by - 6.8, f.ridgeY(x) - 2);
    const frames = m.face > 0 ? monkFrames(r).right : monkFrames(r).left;
    const fi = m.walking ? Math.floor(m.dist / 0.8) % 4 : 0;
    // The lantern hangs from his hand and swings with his step; stopped, it settles.
    const swing = m.walking
      ? 0.4 * Math.sin((m.dist / 3.2) * TAU)
      : 0.4 * Math.sin((m.dist / 3.2) * TAU + m.since * 5) * Math.exp(-m.since * 1.6);
    const handX = x + m.face * (1.7 - 0.3 * m.lift);
    const handY = y - 2.5 - 3.7 * m.lift;
    const lx = handX + Math.sin(swing) * 1.2;
    const ly = handY + Math.cos(swing) * 1.2;
    const fl = 0.86 + 0.14 * Math.sin(f.t * 8.3) * Math.sin(f.t * 5.1 + 1);
    // Nothing of him may show past the ruin's own outline, only through its windows.
    ctx.beginPath();
    for (let i = 0; i < ABBEY_INSIDE.length; i += 2) ctx.lineTo(bx + ABBEY_INSIDE[i], by + ABBEY_INSIDE[i + 1]);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = fl;
    drawGlow(ctx, lanternGlow(r), lx, ly);
    ctx.globalAlpha = 1;
    blit(ctx, frames[fi], x, y);
    // The arm, a stroke of robe from the shoulder to the hand.
    ctx.strokeStyle = css(mix(MONK_PAL.body, FAR_WARM, 0.25));
    ctx.lineWidth = 0.75;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + m.face * 0.4, y - 3.4);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    ctx.fillStyle = css(mix(FAR_WARM, FAR_FLAME, 0.4));
    ctx.fillRect(lx - 0.45, ly - 0.55, 0.9, 1.1);
    drawGlow(ctx, lanternCore(r), lx, ly);
  },
};


// ================================================================== 4. FAR STORM
// Silent sheet lightning in a cloud bank beyond the second ruin: the bank shows only
// when it flickers, lit from inside, and the ruin stands black against it with its
// windows flashing pale. Now and then a thin bolt drops behind the ridge.
const STORM = { period: 10, lead: 0 };
const STORM_COL = [120, 118, 172];
const stormBank = perScale((r) => {
  // A bank of cumulus lit from inside: billows along a humped top, brighter in their
  // hearts, a flat soft base, all well inside the canvas so no edge is cut.
  const W = 260;
  const H = 120;
  const k = r * 0.5;
  const c = canvas(W * k, H * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const R = K.rng(1501);
  const puff = (cx, cy, rr, sx, sy, col, a) => {
    g.save();
    g.translate(cx, cy);
    g.scale(sx, sy);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rr);
    gr.addColorStop(0, css(col, a));
    gr.addColorStop(0.55, css(col, a * 0.55));
    gr.addColorStop(0.85, css(col, a * 0.12));
    gr.addColorStop(1, css(col, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, rr, 0, TAU);
    g.fill();
    g.restore();
  };
  // The base: long and flat.
  for (let i = 0; i < 5; i++) puff(W * (0.3 + i * 0.1), H * 0.66, 26, 1.9, 0.45, STORM_COL, 0.12);
  // Billows: bigger in the middle of the bank, each with a brighter heart up and to
  // one side, where the light inside it is.
  for (let i = 0; i < 14; i++) {
    const u = i / 13;
    const hump = Math.sin(u * Math.PI);
    const cx = W * (0.2 + u * 0.6) + (R() - 0.5) * 8;
    const rr = 12 + hump * 12 + R() * 5;
    const cy = H * 0.6 - hump * 15 - R() * 6;
    puff(cx, cy, rr, 1.3, 0.85, mix(STORM_COL, [150, 146, 200], R() * 0.5), 0.13 + R() * 0.08);
    puff(cx + (R() - 0.3) * rr * 0.4, cy - rr * 0.3, rr * 0.6, 1.2, 0.8, mix(STORM_COL, [208, 204, 240], 0.4 + R() * 0.3), 0.08 + R() * 0.08);
  }
  // Dry-brush streaks dragged across the bank's lower half.
  g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const y = H * (0.5 + R() * 0.16);
    const x0 = W * (0.24 + R() * 0.3);
    const len = W * (0.12 + R() * 0.24);
    g.strokeStyle = css(mix(STORM_COL, [200, 198, 236], R() * 0.4), 0.06 + R() * 0.06);
    g.lineWidth = 1 + R() * 2;
    g.beginPath();
    g.moveTo(x0, y);
    g.quadraticCurveTo(x0 + len / 2, y - 1 - R() * 2, x0 + len, y + (R() - 0.5) * 2);
    g.stroke();
  }
  return { c, w: W, h: H };
});
// A few bolt shapes, fixed: a jagged stroke from the cloud base down past the crest, with
// a short branch.
const BOLTS = [0, 1, 2, 3].map((b) => {
  const R = K.rng(1600 + b);
  const pts = [[0, 0]];
  let x = 0;
  let y = 0;
  // Short jagged steps with a slow lean, so it forks and flickers rather than cracks.
  const lean = (R() - 0.5) * 0.5;
  while (y < 58) {
    y += 1.6 + R() * 2.8;
    x += (R() - 0.5) * 3.6 + lean;
    pts.push([x, y]);
  }
  const at = 2 + Math.floor(R() * 3);
  const branch = [pts[at]];
  let bxx = pts[at][0];
  let byy = pts[at][1];
  for (let i = 0; i < 6; i++) {
    bxx += (b % 2 ? 1 : -1) * (1 + R() * 2.4);
    byy += 1.5 + R() * 2.5;
    branch.push([bxx, byy]);
  }
  return { pts, branch };
});

function stormAt(t) {
  const tt = t + STORM.lead;
  const c = Math.floor(tt / STORM.period);
  const tc = tt - c * STORM.period;
  const h = (k) => hash(c * 17.3 + k);
  // The flickers of this cycle: [time, strength, bolt?, x offset].
  const ev = [
    [1.46, 0.85 + 0.15 * h(1), c === 0 || h(2) < 0.6, (h(3) - 0.5) * 50],
    [1.62 + h(4) * 0.12, 0.45 + 0.3 * h(5), false, (h(3) - 0.5) * 50 + 12],
    [1.95 + h(6) * 0.2, 0.25 + 0.2 * h(7), false, (h(8) - 0.5) * 70],
    [5.2 + h(9) * 1.4, 0.35 + 0.35 * h(10), h(11) < 0.3, (h(12) - 0.5) * 80],
    [5.36 + h(9) * 1.4, 0.3 * h(13), false, (h(12) - 0.5) * 80 - 10],
  ];
  const out = [];
  for (const [t0, a, bolt, dx] of ev) {
    const d = tc - t0;
    if (d < 0 || d > 0.9) continue;
    const e = d < 0.035 ? d / 0.035 : Math.exp(-(d - 0.035) / 0.12);
    // A flash stutters: a second dip and return in the first tenth of a second.
    const st = d > 0.05 && d < 0.08 ? 0.55 : 1;
    out.push({ I: a * e * st, dx, bolt: bolt && d < 0.1 ? Math.floor(h(20 + t0) * BOLTS.length) : -1, d });
  }
  return out;
}

const FAR_STORM = {
  id: 'far-storm',
  name: 'FAR STORM',
  note: 'Silent sheet lightning in a cloud bank beyond the second ruin: every ten seconds or so the bank flickers '
    + 'pale behind it, the ruin stands black with its windows flashing, and now and then a thin bolt drops behind the ridge.',
  layer: 'bg', when: 'behind', u: 1900, reach: 150, focusUp: 26, zoom: 2.2,
  paint(ctx, f) {
    const flashes = stormAt(f.t);
    if (!flashes.length) return;
    const r = bakeScale(ctx);
    const B = stormBank(r);
    const cy = f.y - 30;
    ctx.globalCompositeOperation = 'lighter';
    for (const F of flashes) {
      if (F.I < 0.01) continue;
      ctx.globalAlpha = Math.min(1, F.I) * 0.9;
      ctx.drawImage(B.c, f.x - 10 + F.dx - B.w / 2, cy - B.h * 0.55, B.w, B.h);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const F of flashes) {
      if (F.bolt < 0) continue;
      const bolt = BOLTS[F.bolt];
      // Clear of the ruin, to one side or the other, so it is seen.
      const ox = f.x + (F.bolt % 2 ? 1 : -1) * (52 + (F.bolt % 3) * 6) + F.dx * 0.2;
      const oy = cy - 12;
      const a = F.d < 0.03 ? 1 : 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [lw, col, al] of [[2.4, [150, 150, 210], 0.22], [0.7, [236, 234, 252], 0.85]]) {
        ctx.strokeStyle = css(col, al * a);
        ctx.lineWidth = lw;
        ctx.beginPath();
        bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(ox + x, oy + y) : ctx.moveTo(ox + x, oy + y)));
        bolt.branch.forEach(([x, y], i) => (i ? ctx.lineTo(ox + x, oy + y) : ctx.moveTo(ox + x, oy + y)));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },
};

export const IDEAS = [BELFRY_BATS, GHOST_HEARSE, ABBEY_MONK, FAR_STORM];
