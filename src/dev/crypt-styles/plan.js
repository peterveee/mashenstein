// CRYPT SHIFT — the style bake-off's shared composition (Peter, 25 Sep 2026: "i want to
// do a bakeoff in different styles … So the crypt instead of the plumber … World only …
// only the background will change our game lane remains as is").
//
// Every style paints THIS scene, so the cards differ in how a thing is drawn and never
// in what is there or where it stands. The plan fixes the content, the depth layers,
// the parallax rates and the ridge lines; a style decides colour, line, texture and
// shape language, and nothing else. The lane (ground, hazards, hero) is drawn by the
// shipped vhs pack in scene.js, on top of whatever the style paints.
//
// Frame: 480x270 logical px. The lane's top edge sits at screen y 232 (GROUND_Y at the
// resting zoom), so the backdrop owns y 0..232 and anything below that is covered.
//
// Layers, back to front — the Hybrid Vector brief's four groups:
//   sky  — gradient, stars, moon, cloud wisps, bats
//   bg   — the far ridge: a ruined abbey on a plateau, groves of dead trees
//   mid  — the graveyard hill: mausoleums, headstones, crosses, dead trees
//   fg   — the near bank behind the lane: gnarled trees, iron railings, a gate, a gas
//          lamp, grass tufts
// plus two fog bands, one between mid and fg and one along the lane's back edge.
//
// Positions are authored in each layer's own space `u` and scroll at factor * ZOOM of
// the camera, the rate the shipped packs use, wrapping every `period` px.
import { ZOOM } from '../../engine/camera.js';

export const FRAME_W = 480;
export const FRAME_H = 270;
export const LANE_TOP = 232;

const TAU = Math.PI * 2;

function wrapDist(u, c, period) {
  const d = Math.abs((((u - c) % period) + period) % period);
  return Math.min(d, period - d);
}

// A raised flat top with cosine shoulders, so a building has level ground to stand on.
function plateau(u, c, flatHalf, slope, h, period) {
  const d = wrapDist(u, c, period);
  if (d <= flatHalf) return h;
  if (d >= flatHalf + slope) return 0;
  return h * 0.5 * (1 + Math.cos(Math.PI * (d - flatHalf) / slope));
}

function wave(u, period, terms) {
  let s = 0;
  for (const [amp, k, phase] of terms) s += amp * Math.sin(TAU * k * u / period + phase);
  return s;
}

// ------------------------------------------------------------------ the plan
export const CRYPT_PLAN = Object.freeze({
  moon: { x: 384, y: 66, r: 24 },
  clouds: {
    factor: 0.04, drift: 3, period: 960,
    items: [
      { u: 40, y: 34, w: 130, h: 14 },
      { u: 300, y: 104, w: 96, h: 10 },
      { u: 520, y: 22, w: 150, h: 16 },
      { u: 760, y: 84, w: 110, h: 12 },
    ],
  },
  bats: {
    factor: 0.12, drift: 22, period: 720,
    items: [
      { u: 120, y: 70, s: 1 },
      { u: 146, y: 60, s: 0.8 },
      { u: 470, y: 124, s: 0.7 },
    ],
  },
  bg: {
    factor: 0.07, period: 1440,
    profile: (u, P) => 180
      - wave(u, P, [[8, 2, 0], [5, 5, 1.3], [3, 11, 0.4]])
      - plateau(u, 360, 58, 70, 34, P)
      - plateau(u, 1040, 20, 90, 16, P),
    items: [
      { kind: 'grove', u: 120, s: 1 },
      { kind: 'abbey', u: 360, s: 1 },
      { kind: 'grove', u: 610, s: 0.8 },
      { kind: 'grove', u: 1040, s: 1.1 },
    ],
  },
  mid: {
    factor: 0.16, period: 1280,
    profile: (u, P) => 210
      - wave(u, P, [[5, 3, 0.5], [3, 8, 2]])
      - plateau(u, 170, 40, 50, 12, P)
      - plateau(u, 760, 32, 50, 10, P),
    items: [
      { kind: 'stone', u: 32, s: 0.9 },
      { kind: 'stone', u: 58, s: 0.7, variant: 1 },
      { kind: 'cross', u: 92, s: 1 },
      { kind: 'mausoleum', u: 170, s: 1 },
      { kind: 'stone', u: 236, s: 1, variant: 2 },
      { kind: 'stone', u: 262, s: 0.8 },
      { kind: 'tree', u: 306, s: 1 },
      { kind: 'stone', u: 352, s: 0.9, variant: 1 },
      { kind: 'stone', u: 378, s: 0.75 },
      { kind: 'cross', u: 404, s: 0.85 },
      { kind: 'stone', u: 442, s: 0.9, variant: 2 },
      { kind: 'stone', u: 468, s: 0.7 },
      { kind: 'stone', u: 544, s: 0.85 },
      { kind: 'stone', u: 570, s: 0.7, variant: 2 },
      { kind: 'stone', u: 622, s: 0.9, variant: 1 },
      { kind: 'cross', u: 652, s: 1 },
      { kind: 'stone', u: 692, s: 0.8 },
      { kind: 'mausoleum', u: 760, s: 0.85, variant: 1 },
      { kind: 'tree', u: 812, s: 1.15, variant: 1 },
      { kind: 'stone', u: 870, s: 0.9, variant: 2 },
      { kind: 'stone', u: 896, s: 0.7 },
      { kind: 'cross', u: 934, s: 0.85 },
      { kind: 'stone', u: 962, s: 0.9 },
      { kind: 'stone', u: 988, s: 0.75, variant: 1 },
      { kind: 'stone', u: 1080, s: 0.85 },
      { kind: 'tree', u: 1124, s: 0.9 },
      { kind: 'stone', u: 1160, s: 0.8, variant: 2 },
      { kind: 'cross', u: 1204, s: 0.9 },
    ],
  },
  fg: {
    factor: 0.34, period: 1800,
    profile: (u, P) => 228 - wave(u, P, [[3, 6, 0], [2, 13, 1]]),
    items: [
      { kind: 'gnarl', u: 22, s: 1 },
      { kind: 'grass', u: 88, s: 1 },
      { kind: 'lamp', u: 150, s: 1 },
      { kind: 'fence', u: 182, u1: 462, gate: 322 },
      { kind: 'grass', u: 250, s: 0.8 },
      { kind: 'grass', u: 410, s: 1 },
      { kind: 'grass', u: 500, s: 0.9 },
      { kind: 'gnarl', u: 760, s: 0.8, variant: 1 },
      { kind: 'grass', u: 900, s: 1 },
      { kind: 'fence', u: 1100, u1: 1230, gate: null },
      { kind: 'lamp', u: 1262, s: 1 },
      { kind: 'grass', u: 1330, s: 0.8 },
      { kind: 'grass', u: 1480, s: 1 },
      { kind: 'gnarl', u: 1560, s: 0.9, variant: 1 },
      { kind: 'grass', u: 1640, s: 0.9 },
    ],
  },
  fog: {
    bands: [
      { y: 198, h: 16, factor: 0.12, drift: 5 },
      { y: 222, h: 12, factor: 0.3, drift: 9 },
    ],
    // Puff centres along each band, in the band's own u (period 600).
    puffs: [40, 130, 205, 290, 370, 455, 530],
    period: 600,
  },
});

// Which item kinds exist, and roughly how big each one is in screen px at s = 1. A
// style may draw a thing its own way but should keep it about this size, so the
// composition survives the change of hand.
export const CRYPT_KINDS = Object.freeze({
  abbey: 'ruined abbey on the far plateau: nave wall with 3 broken lancet arches, a spire (tip ~86 px above base, x+10), a roofless transept. ~110 wide',
  grove: 'clump of 3-5 distant dead trees, 20-34 tall, ~50 wide',
  mausoleum: 'stone tomb: steps, 2 columns, pediment, dark doorway (variant 1: domed roof). ~46 wide, ~40 tall',
  stone: 'headstone: 0 round-top, 1 square with a notch, 2 obelisk. ~9 wide, ~13 tall (obelisk ~20), some lean',
  cross: 'Celtic/plain grave cross, ~12 wide, ~20 tall',
  tree: 'dead tree, bare forking branches, ~40 wide, ~52 tall (variant 1 leans left)',
  gnarl: 'big gnarled foreground tree: twisted trunk, claw branches reaching right, ~70 wide, ~120 tall',
  fence: 'wrought-iron railing from x0 to x1: spear-top bars every ~7 px, two rails, ~22 tall; `gate` (if any) is a taller arched gate ~30 wide',
  lamp: 'Victorian gas lamp on a post, ~44 tall; the one warm light in the scene',
  grass: 'tuft of tall dead grass/thistle, ~16 wide, ~12 tall',
});

// --------------------------------------------------------------- resolving
function seeded(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Screen-fixed stars, kept clear of the moon.
const STARS = (() => {
  const out = [];
  const { moon } = CRYPT_PLAN;
  for (let i = 0; out.length < 44 && i < 400; i++) {
    const x = seeded(i) * FRAME_W;
    const y = 6 + seeded(i + 1000) * 150;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r + 10) continue;
    out.push({ x, y, s: 0.6 + seeded(i + 2000) * 1.1, phase: seeded(i + 3000) * TAU });
  }
  return out;
})();

// Every instance of a u-positioned thing that lands in view: x = u - shift, wrapped.
function instances(u, shift, period, margin = 140) {
  const x0 = (((u - shift) % period) + period) % period;
  const out = [];
  for (const x of [x0 - period, x0, x0 + period]) {
    if (x > -margin && x < FRAME_W + margin) out.push(x);
  }
  return out;
}

function resolveLayer(name, camX) {
  const L = CRYPT_PLAN[name];
  const shift = camX * L.factor * ZOOM;
  const P = L.period;
  const ridge = (x) => L.profile(x + shift, P);
  // The deepest crest under a footprint, so a wide thing on a slope never floats.
  const foot = (x, halfW) => {
    let y = -Infinity;
    for (let dx = -halfW; dx <= halfW; dx += 2) y = Math.max(y, ridge(x + dx));
    return y;
  };
  const crest = [];
  for (let x = -12; x <= FRAME_W + 12; x += 2) crest.push({ x, y: ridge(x) });
  const items = [];
  L.items.forEach((item, i) => {
    if (item.kind === 'fence') {
      const span = item.u1 - item.u;
      for (const x0 of instances(item.u, shift, P, span + 40)) {
        const x1 = x0 + span;
        if (x1 < -20 || x0 > FRAME_W + 20) continue;
        items.push({
          kind: 'fence', i, x0, x1,
          gate: item.gate == null ? null : x0 + (item.gate - item.u),
        });
      }
      return;
    }
    const s = item.s ?? 1;
    const halfW = { abbey: 50, mausoleum: 22, gnarl: 8, tree: 4, lamp: 3 }[item.kind] ?? 3;
    for (const x of instances(item.u, shift, P)) {
      items.push({ kind: item.kind, i, x, y: foot(x, halfW * s), s, variant: item.variant ?? 0 });
    }
  });
  return { name, factor: L.factor, shift, ridge, foot, crest, items };
}

// The resolved frame a style paints from. `t` is seconds (animation), `camX` the
// lane camera in world px. Everything is in screen px of the 480x270 frame.
export function cryptFrame(camX, t) {
  const { moon, clouds, bats, fog } = CRYPT_PLAN;
  const cloudShift = camX * clouds.factor * ZOOM + t * clouds.drift;
  const batShift = camX * bats.factor * ZOOM + t * bats.drift;
  return {
    t, camX, W: FRAME_W, H: FRAME_H, laneTop: LANE_TOP,
    moon: { ...moon },
    stars: STARS.map((s) => ({ ...s, twinkle: 0.65 + 0.35 * Math.sin(t * 1.7 + s.phase) })),
    clouds: clouds.items.flatMap((c, i) => instances(c.u, cloudShift, clouds.period, c.w)
      .map((x) => ({ i, x, y: c.y, w: c.w, h: c.h }))),
    bats: bats.items.flatMap((b, i) => instances(b.u, batShift, bats.period, 20)
      .map((x) => ({
        i, x, y: b.y + 5 * Math.sin(t * 1.9 + i * 2.1), s: b.s,
        // 0..1, 0 = wings up, 0.5 = wings down.
        flap: ((t * 5.5 + i * 0.37) % 1 + 1) % 1,
      }))),
    layers: {
      bg: resolveLayer('bg', camX),
      mid: resolveLayer('mid', camX),
      fg: resolveLayer('fg', camX),
    },
    fog: fog.bands.map((band, b) => {
      const shift = camX * band.factor * ZOOM + t * band.drift;
      return {
        ...band,
        puffs: fog.puffs.flatMap((u, i) => instances(u + b * 47, shift, fog.period, 60)
          .map((x) => ({ i, x, y: band.y + band.h * 0.5 + ((i * 7) % 5 - 2), rx: 34 + (i * 13) % 22, ry: band.h * 0.55 }))),
      };
    }),
  };
}
