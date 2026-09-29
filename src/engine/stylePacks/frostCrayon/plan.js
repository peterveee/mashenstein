// FROST FORTRESS in WAX CRAYON — the bake-off's shared composition (28 Sep 2026; Peter:
// "do you think crayon might work for the frost level?", then "do a small bakeoff for
// frost 1 and frost 3 at dusk").
//
// A SMALL section of Frost, two screens of it, laid out from what the shipped watercolor
// pack actually puts there, so a card can be held up against the shipped paper control
// at the same camX and read as the same place:
//   screen 1 — frost-1 by day, 44% in (camX 8000): the polar bear and her cub ambling
//              along the near crest, frost-1's crown keep on the far ridge, pines, ice
//              rocks and drifts. No aurora: frost-1's two curtains are both off screen
//              here (the first is gone left by camX 1200, the second only returns past
//              camX 8900), which is what the shipped picture shows too.
//   screen 2 — frost-3 at dusk, 7% in (camX 1300): frost-3's lone tower on the far
//              ridge under the one aurora curtain that stretch has, pines, rocks, the
//              glacier arriving at the right as the loop ends. The wolves are frost-3's
//              other set piece, but they sit round their campfire at 19% (camX ~3450),
//              two thousand world px from the nearest fortress, so no stretch holds both.
//
// Same numbers as the shipped pack in landscape: the far ridge is |sin| hills at base
// 196, amp 66, wl 130 (period 408) scrolling at 0.12 x ZOOM; the near ridge base 196,
// amp 40, wl 70 (period 220) at 0.3; the foreground fold base 210, amp 28, wl 88 (period
// 276) at 0.55. (Both ridges are the pack's GROUND_Y less its 36 px landscape lift.)
// Items are placed with the pack's own rule (ridgeSceneryPlacements: one primary and one
// secondary feature per ridge tile, alternating by world tile, ±3 px by parity, planted
// on the high point of the footprint, rocks and drifts leaning with the slope), and the
// fortress on each far site is the stage's own (frostFortresses.js). The plan fixes WHAT
// is there and WHERE; a painter decides how it looks.
//
// One deliberate departure, flagged where it happens: the foreground fold is the shipped
// pack's 22%-alpha veil, which barely darkens anything; a crayon painter may press it as
// a real mid-tone band (snow in shadow), because that band is what the pale hazards are
// read against. The plan only says where it is.
//
// Frame: 480x270 logical px; the lane's top edge is y 232 and the backdrop owns 0..232.
import { ZOOM } from '../../camera.js';

export const FRAME_W = 480;
export const FRAME_H = 270;
export const LANE_TOP = 232;
export const FROST_STAGE_LEN = 18144; // frost-1..3, world px (90 s at 201.6 px/s)

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the light
// The shipped FROST_STAGE_LIGHT (stylePacks/index.js), for what a style needs to know of
// it: the sky's two stops and the per-stage ridge colours. A painter authors its own
// crayons FROM these, so a dusk card is the dusk the game has.
export const FROST_LIGHT = Object.freeze({
  1: Object.freeze({ name: 'day', sky: ['#b8d8f0', '#e0ecf8'], far: '#a8c8e8', hills: '#88a8c8', foreground: '#5b7e96', ground: '#c8e0f0' }),
  2: Object.freeze({ name: 'low sun', sky: ['#93b7de', '#f2ddc6'], far: '#9cb7d8', hills: '#7d99bf', foreground: '#56768f', ground: '#c3d8ea' }),
  3: Object.freeze({ name: 'dusk', sky: ['#41568a', '#dda283'], far: '#6f80ab', hills: '#56658e', foreground: '#3e4a6d', ground: '#9aa9c9' }),
});

// ------------------------------------------------------------------ the plan
export const FROST_PLAN = Object.freeze({
  // The shipped aurora: the curtain table, the rectangle it owns (y 6..124) and the
  // blur it pays for out of the headroom, per-stage gain and curtain count, and the
  // wrap (each curtain wraps over the frame plus twice its own width).
  aurora: {
    top: 6, bottom: 124, blur: 10,
    gain: [0, 0.74, 1, 1.3],
    count: [0, 2, 3, 3],
    curtains: [
      { at: 0.05, y: 0.70, h: 0.94, w: 430, amp: 8, wl: 250, rays: 24, color: '#6ed3a6', tip: '#9db2e8', alpha: 0.32, drift: 0.028, phase: 0 },
      { at: 0.38, y: 0.86, h: 0.78, w: 360, amp: 6, wl: 210, rays: 20, color: '#7cd8c2', tip: '#a89ae2', alpha: 0.27, drift: 0.042, phase: 1.7 },
      { at: 0.70, y: 0.52, h: 0.9, w: 500, amp: 10, wl: 300, rays: 28, color: '#5fc79a', tip: '#9aabe2', alpha: 0.2, drift: 0.018, phase: 3.1 },
    ],
  },
  // The two pale wisp ribbons (drawFrostSky), per stage, drifting at 0.045.
  ribbons: {
    factor: 0.045,
    day: [
      { at: 0.08, y: 44, w: 220, h: 14, tilt: 4 },
      { at: 0.52, y: 88, w: 250, h: 16, tilt: -4 },
    ],
    dusk: [
      { at: 0.12, y: 42, w: 230, h: 15, tilt: 4 },
      { at: 0.56, y: 82, w: 270, h: 18, tilt: -4 },
    ],
  },
  // The pack's six soft cloud blobs, every 120 px at 0.1, heights from its own table.
  clouds: { n: 6, spacing: 120, factor: 0.1, r: 40, margin: 60 },
  far: {
    factor: 0.12, base: 196, amp: 66, wl: 130,
    features: [
      { kind: 'glacier', at: 0.21, scale: 1.45 },
      { kind: 'landmark', at: 0.72, scale: 1.0 },
    ],
    secondary: [
      { kind: 'ice-rock', at: 0.47, scale: 0.84 },
      { kind: 'snowbank', at: 0.88, scale: 0.58 },
    ],
  },
  near: {
    factor: 0.3, base: 196, amp: 40, wl: 70,
    features: [
      { kind: 'pine', at: 0.24, scale: 1.25 },
      { kind: 'ice-rock', at: 0.72, scale: 1.28 },
      { kind: 'pine', at: 0.36, scale: 1.5 },
      { kind: 'snowbank', at: 0.82, scale: 0.76 },
    ],
    secondary: [
      { kind: 'ice-rock', at: 0.5, scale: 0.84 },
      { kind: 'snowbank', at: 0.88, scale: 0.64 },
    ],
  },
  fold: { factor: 0.55, base: 210, amp: 28, wl: 88 },
  // The near ridge's wildlife this section meets (FROST_WILDLIFE): the stage fraction it
  // is pinned to and the offset the pack's spot search settles on. `dx` was measured
  // through the pack's own frostWildlifePaint seam at ZOOM 2 (the gallery's): frost-1's
  // bears land exactly on their pinned point.
  wildlife: {
    1: [{ kind: 'bears', at: 0.442, dx: 0 }],
    3: [],
  },
});

// How big each kind is at s = 1 in screen px, for a painter that draws it its own way.
export const FROST_KINDS = Object.freeze({
  glacier: 'a massif: three peaks, the main one 47 up, ~68 wide at the base, running down past the near ridge (scale 1.45)',
  landmark: "the stage's fortress on the far ridge: frost-1's crown keep ~36 wide x 31 tall with a flag to -36, frost-3's lone tower ~26 x 43",
  'ice-rock': 'a low ice rock ~26 wide x 13 tall, snow on its crown, lying along the slope',
  snowbank: 'a drift ~36 wide x 9 tall, half-swallowed by the slope',
  pine: 'a pine ~18 wide x 21 tall with three tiers and a trunk to the snow line (scale 1.25 and 1.5)',
  bears: 'a polar bear ~25 long x 17 tall at 1.1, her cub at 0.5 walking 29 px ahead',
});

// Footprints: the pack's FROST_FEATURE_FOOTPRINTS (half width, bottom, lean, drift,
// massif) and its margins, so a feature is planted where the pack plants it.
const FOOT = {
  glacier: { halfWidth: 31, bottom: 2, massif: true },
  landmark: { halfWidth: 23, bottom: 2 },
  'ice-rock': { halfWidth: 13, bottom: 2, lean: 1 },
  snowbank: { halfWidth: 18, bottom: 2, drift: true, lean: 1 },
  pine: { halfWidth: 9, bottom: 3 },
};
const FOOT_MARGIN = 4;
const LEAN_MARGIN = 12;
const PINE_EMBED = 1.25;

// --------------------------------------------------------------- resolving
export const periodOf = (wl) => Math.max(16, Math.round(Math.PI * wl));
// The ridge in its own tile frame: u is px from the tile's left edge.
export const ridgeU = (L, u) => {
  const P = periodOf(L.wl);
  const px = ((u % P) + P) % P;
  return L.base - Math.abs(Math.sin(px / L.wl)) * L.amp;
};

function halfSpan(kind, scale) {
  const f = FOOT[kind];
  return f.halfWidth * scale + FOOT_MARGIN + (f.lean ? LEAN_MARGIN * scale : 0);
}

// Plant one feature (the pack's frostEmbeddedBaseY / frostFeatureAngle / frostFeatureSurface).
function plant(L, spec, localX) {
  const f = FOOT[spec.kind];
  const s = spec.scale;
  const r = (dx) => ridgeU(L, localX + dx);
  const centre = r(0);
  const slope = (r(2) - r(-2)) / 4;
  const lean = f.lean ? Math.atan(slope) * f.lean : 0;
  const tan = lean ? Math.tan(lean) : 0;
  const half = halfSpan(spec.kind, s);
  let high = Infinity;
  let deep = -Infinity;
  const step = Math.max(1, half / 8);
  const sample = (dx) => {
    const rel = r(dx) - centre - tan * dx;
    if (rel < high) high = rel;
    if (rel > deep) deep = rel;
  };
  for (let dx = -half; dx <= half + 0.001; dx += step) sample(dx);
  sample(-half);
  sample(half);
  const ground = f.drift ? centre : centre + high;
  const baseY = ground - f.bottom * s + (spec.kind === 'pine' ? PINE_EMBED : 0);
  const foot = f.drift ? 0 : Math.max(0, deep - high) + 1;
  // The snow line under the feature, relative to the planting point, for its clip.
  const surface = [];
  for (let i = 0; i <= 16; i++) {
    const dx = -half + (half * 2 * i) / 16;
    surface.push({ dx, y: r(dx) - baseY });
  }
  return { baseY, lean, foot, surface, massif: !!f.massif };
}

// One ridge resolved at a camera: its shift, its crest as a function of screen x, and its
// items. Every item carries its world tile and slot, which is what a painter seeds from.
function resolveRidge(name, camX, stage) {
  const L = FROST_PLAN[name];
  const P = periodOf(L.wl);
  const shift = camX * L.factor * ZOOM;
  const ridge = (x) => ridgeU(L, x + shift);
  const items = [];
  if (L.features) {
    const k0 = Math.floor((shift - 80) / P) - 1;
    const k1 = Math.ceil((shift + FRAME_W + 80) / P);
    for (let k = k0; k <= k1; k++) {
      const specs = [
        L.features[((k % L.features.length) + L.features.length) % L.features.length],
        L.secondary[((k % L.secondary.length) + L.secondary.length) % L.secondary.length],
      ];
      specs.forEach((spec, slot) => {
        const parity = (((k + slot) % 2) + 2) % 2;
        const localX = spec.at * P + (parity ? 3 : -3);
        const x = k * P + localX - shift;
        if (x < -48 - 40 || x > FRAME_W + 48 + 40) return;
        const pl = plant(L, spec, localX);
        const it = { ...spec, ...pl, tile: k, slot, localX, x, key: `${name}:${spec.kind}:${k}:${slot}` };
        if (spec.kind === 'landmark') {
          it.fortress = fortressVariant(stage, k);
          it.seed = k * 3 + slot;
        }
        items.push(it);
      });
    }
  }
  return { name, factor: L.factor, period: P, shift, base: L.base, amp: L.amp, wl: L.wl, ridge, items };
}

// frostFortresses.js frostFortressVariant: a Crystal Citadel every fifth site, offset per
// stage; frost-2 alternates its redrawn ruin with the original.
function fortressVariant(stage, tile) {
  const n = Math.floor(tile / 2);
  const off = { 1: 2, 2: 3, 3: 4 }[stage] ?? 0;
  if (n >= 1 && (n + off) % 5 === 0) return 'citadel';
  if (stage === 2 && Math.abs(n) % 2 === 1) return 'now';
  return 'redrawn';
}

// The shipped wrap for a drifting sky object: [-margin, W + margin).
function wrap(v, margin) {
  const span = FRAME_W + margin * 2;
  return -margin + (((v % span) + span) % span);
}

function resolveAurora(camX, t, stage) {
  const A = FROST_PLAN.aurora;
  const gain = A.gain[stage] ?? 1;
  const n = Math.min(A.curtains.length, A.count[stage] ?? 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = A.curtains[i];
    const baseY = A.top + (A.bottom - A.top) * c.y;
    const h = Math.max(8, (baseY - A.top - A.blur) * c.h);
    const cycle = FRAME_W + c.w * 2;
    const x = wrap(c.at * cycle - camX * c.drift * ZOOM, c.w);
    if (x > FRAME_W || x + c.w < 0) continue;
    out.push({
      i, x, baseY, h, w: c.w, amp: c.amp, k: (c.w / c.wl) * TAU, rays: c.rays, phase: c.phase,
      color: c.color, tip: c.tip,
      alpha: c.alpha * gain,
      breathe: 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.21 + c.phase)),
    });
  }
  return { gain, curtains: out };
}

function resolveWildlife(camX, t, stage, near) {
  const out = [];
  const k = FROST_PLAN.near.factor * ZOOM;
  for (const w of FROST_PLAN.wildlife[stage] || []) {
    const x = FRAME_W / 2 + (w.at * FROST_STAGE_LEN - camX) * k + w.dx;
    if (x < -120 || x > FRAME_W + 120) continue;
    // A picture with no run takes the clock from how far the item has come in (the pack's
    // rule: entry is 24 px inside the right edge, the run is 201.6 world px/s).
    const clock = Math.max(0, (FRAME_W - 24 - x) / (201.6 * k));
    if (w.kind === 'bears') {
      const walk = clock * 4.5;
      out.push({
        kind: 'bears', x, clock,
        bears: [
          { who: 'cub', x: x + walk + 29, s: 0.5, phase: ((t * 1.25 + 0.3) % 1 + 1) % 1 },
          { who: 'mother', x: x + walk, s: 1.1, phase: ((t * 0.8) % 1 + 1) % 1 },
        ].map((b) => ({ ...b, y: near.ridge(b.x) + 1.2, tilt: Math.atan2(near.ridge(b.x + 8) - near.ridge(b.x - 8), 16) * 0.8 })),
      });
    }
  }
  return out;
}

// The resolved frame a style paints from. `t` is seconds, `camX` the lane camera in
// world px, `stage` 1..3; everything below is in screen px of the 480x270 frame.
export function frostFrame(camX, t, stage) {
  const light = FROST_LIGHT[stage] || FROST_LIGHT[1];
  const R = FROST_PLAN.ribbons;
  const ribbons = (stage === 3 ? R.dusk : R.day).map((r, i) => ({
    ...r, i, x: wrap(r.at * FRAME_W - camX * R.factor * ZOOM, r.w + 6),
  }));
  const C = FROST_PLAN.clouds;
  const clouds = [];
  for (let i = 0; i < C.n; i++) {
    clouds.push({ i, x: wrap(i * C.spacing - camX * C.factor * ZOOM, C.margin), y: 30 + (i * 47) % 80, r: C.r });
  }
  const near = resolveRidge('near', camX, stage);
  return {
    t, camX, stage, light, W: FRAME_W, H: FRAME_H, laneTop: LANE_TOP,
    aurora: resolveAurora(camX, t, stage),
    ribbons,
    clouds,
    layers: {
      far: resolveRidge('far', camX, stage),
      near,
      fold: resolveRidge('fold', camX, stage),
    },
    wildlife: resolveWildlife(camX, t, stage, near),
  };
}
