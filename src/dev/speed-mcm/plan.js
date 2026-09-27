// SPEED ZONE in MID-CENTURY MODERN — the bake-off's shared composition (25 Sep 2026;
// docs/BACKDROP_STYLES.md, "Next bake-offs" 1: "Speed Zone in mid-century modern").
//
// A SMALL section of speed-1, two screens of it, laid out from what the shipped faux3d
// pack actually puts there, so a card can be held up against the shipped paper control
// at the same camX and read as the same place:
//   screen 1 — the opening (camX 0): the wind pump and its stock tank on the big mesa,
//              in front of the sun; the smaller sibling mesa at the left; a campfire's
//              smoke rising behind the middle hills; power poles and wires; saguaros;
//              two thermals of vultures.
//   screen 2 — ~61% in (camX 6900): the strata butte peeking over the far mesa, the
//              howling coyote on its ledge (near tile 11, speed-1's first coyote), a
//              dust devil, tumbleweeds.
//
// Same layer rates, bases and ridge shapes as the shipped pack in landscape (factor x
// ZOOM of the camera; far mesas 0.12, middle hills 0.22, near dunes 0.35, the butte
// 0.09, sun fixed), so the parallax is the shipped parallax. The plan fixes WHAT is
// there and WHERE; a painter decides how it looks. A few deliberate departures, each
// flagged where it happens: the dust devil stands clear of the coyote instead of
// fading out near it (the shipped rule — Peter, 24 Sep: devils "not near other moving
// objects" — makes the two never share a picture); the tumbleweeds and the power poles
// are nudged so none crosses the coyote on the card's slow loop; and screen 2 gets a
// second, smaller tumbleweed. Roadside signs are left out: they are lettering, not
// landscape.
//
// Frame: 480x270 logical px; the lane's top edge is y 232 and the backdrop owns 0..232.
import { ZOOM } from '../../engine/camera.js';

export const FRAME_W = 480;
export const FRAME_H = 270;
export const LANE_TOP = 232;
export const SPEED_STAGE_LEN = 11340; // speed-1, world px (60 s)

const TAU = Math.PI * 2;
const fract = (v) => v - Math.floor(v);
// The shipped pack's own hash (desertHash), so seeded choices land where the pack's do.
export const hash = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);

// Where the dunes are, as fractions of one tile — the shipped DESERT_DUNES.
const DUNES = [
  { at: 0.17, w: 0.56, h: 1 },
  { at: 0.52, w: 0.40, h: 0.6 },
  { at: 0.81, w: 0.48, h: 0.84 },
];

// ------------------------------------------------------------------ the plan
export const SPEED_PLAN = Object.freeze({
  // Fixed to the frame, as the shipped sun is (desertSunX 380, y 60).
  sun: { x: 380, y: 60, r: 22 },
  // The shipped desert sky is bare; the style brings its kidney clouds. High and slow.
  clouds: {
    factor: 0.03, drift: 2.2, period: 1100,
    items: [
      { u: 70, y: 30, w: 120, h: 13 },
      { u: 330, y: 92, w: 84, h: 9 },
      { u: 610, y: 22, w: 150, h: 15 },
      { u: 880, y: 70, w: 100, h: 11 },
    ],
  },
  // The shipped DESERT_THERMALS: circling, banking, a flap now and then.
  thermals: [
    { x: 118, y: 60, rx: 48, ry: 11, n: 3, s: 21, rate: 0.40, plx: 0.17, near: true },
    { x: 352, y: 40, rx: 31, ry: 7, n: 2, s: 13, rate: 0.55, plx: 0.09, near: false },
  ],
  // The strata butte, pinned at 0.55 of the stage and drifting behind the far range.
  butte: { at: SPEED_STAGE_LEN * 0.55, factor: 0.09, halfW: 62, h: 108, base: 194 },
  far: {
    factor: 0.12, base: 198, amp: 100, period: 723,
    // The shipped mesa ridge: a big cap and a smaller sibling per tile.
    mesas: [
      { at: 0.5, cap: 0.24, slope: 0.085, h: 1 },
      { at: 0.08, cap: 0.13, slope: 0.06, h: 0.56 },
    ],
    // speed-1's opening landmark (horizon slot 0), on the big cap's centre; the tank
    // stands 24 px right of it.
    items: [{ kind: 'pump', u: 362 }],
  },
  // One campfire plume behind the middle hills (DESERT_SMOKE_PLUMES).
  smoke: { x: 245, factor: 0.19, drift: 5.5, span: 1920, h: 172, w: 15, rate: 0.55, lean: 0.08 },
  mid: {
    factor: 0.22, base: 198, amp: 78, period: 628,
    // The shipped spacing; the phase is the pack's 24 + 48, which keeps every pole clear
    // of the coyote's head for the whole loop on screen 2 (the shipped phase stands one
    // right behind it at the anchor).
    poles: { spacing: 172, phase: 72 },
    // The dust devil. Shipped, middle tile 5's devil sits at u ~3320 and fades as the
    // coyote nears; here it stays 175-260 px ahead of the coyote so both hold the frame.
    devils: [{ u: 3215, wander: 12 }],
  },
  near: {
    factor: 0.35, base: 210, amp: 52, period: 471,
    // Near tile 11's bare summit: speed-1's first coyote, a howler.
    coyote: { u: 11 * 471 + 0.17 * 471, tile: 11, mode: 'howl' },
    // Tumbleweeds, rolled right by the wind (DESERT_WEED_WIND 26 px/s). On the card the
    // camera creeps at 40 world px/s, so a weed all but hangs in place while the coyote
    // sweeps across the picture: the shipped slot 8 (u 5120) sits in the coyote's path
    // and rolls right through its ledge. These two keep out of it — the shipped weed
    // moved 110 px back, and a smaller second one of this plan's own.
    weeds: [
      { u: 8 * 640 - 110, variant: Math.floor(hash(8 + 29) * 3) },
      { u: 8 * 640 - 250, variant: 1 },
    ],
    wind: 26,
  },
});

// Which item kinds exist and how big each is at s = 1 in screen px. A style may draw a
// thing its own way but should keep it about this size.
export const SPEED_KINDS = Object.freeze({
  sun: 'the sun, fixed at (380, 60); the shipped glow is ~30 px in radius',
  mesa: 'far mesa: flat cap, steep flanks; the big one ~100 tall with a ~174 px cap, its sibling 56 tall',
  pump: 'windmill water pump: lattice tower ~40 tall, wheel centre ~46 up (r ~12), tail vane right; stock tank 22 x 7 at +24',
  butte: 'strata butte, cap ~108 above its base, ~124 wide, with a lower sibling to its left',
  smoke: 'a campfire plume of puffs, 172 tall, rising from behind the middle hills',
  pole: 'power pole 36-40 tall, two crossbars (22 and 16 wide), two sagging wires to the next',
  saguaro: 'saguaro on a near dune summit, 13-22 tall, 2-3 arms',
  sage: 'a low tuft, ~12 wide x 8 tall',
  rock: 'a small boulder, ~10 wide',
  devil: 'dust devil: a column 112 tall leaning ~20 downwind (right), ~40 across at the top',
  coyote: 'coyote sat on a flat-topped ledge (~51 wide, ~13 above the crest); the animal ~24 tall',
  weed: 'tumbleweed, r 7-11, hopping up to ~45 above the near crest',
});

// --------------------------------------------------------------- resolving
function dunesTop(uFrac) {
  let top = 0;
  for (const d of DUNES) {
    const dist = Math.abs(((uFrac - d.at + 1.5) % 1) - 0.5);
    const half = d.w / 2;
    if (dist >= half) continue;
    top = Math.max(top, d.h * (0.5 + 0.5 * Math.cos((dist / half) * Math.PI)));
  }
  return top;
}

function shelf(uFrac, m) {
  const d = Math.abs(((uFrac - m.at + 1.5) % 1) - 0.5);
  const half = m.cap / 2;
  if (d <= half) return m.h;
  if (d >= half + m.slope) return 0;
  return m.h * (1 - (d - half) / m.slope);
}

// Every copy of a periodic u that lands in view.
function instances(u, shift, period, margin = 140) {
  const x0 = (((u - shift) % period) + period) % period;
  const out = [];
  for (let x = x0 - period * 2; x < FRAME_W + margin + period; x += period) {
    if (x > -margin && x < FRAME_W + margin) out.push(x);
  }
  return out;
}

function tileRange(shift, period, margin) {
  return [Math.floor((shift - margin) / period), Math.ceil((shift + FRAME_W + margin) / period)];
}

function crestOf(ridge) {
  const crest = [];
  for (let x = -12; x <= FRAME_W + 12; x += 2) crest.push({ x, y: ridge(x) });
  return crest;
}

function resolveFar(camX) {
  const L = SPEED_PLAN.far;
  const shift = camX * L.factor * ZOOM;
  const P = L.period;
  const ridge = (x) => {
    const u = fract((x + shift) / P);
    let top = 0;
    for (const m of L.mesas) top = Math.max(top, shelf(u, m));
    return L.base - top * L.amp;
  };
  const mesas = [];
  const [k0, k1] = tileRange(shift, P, 160);
  for (let k = k0; k <= k1; k++) {
    L.mesas.forEach((m, j) => {
      const x = k * P + m.at * P - shift;
      const capHalf = (m.cap * P) / 2;
      const slope = m.slope * P;
      if (x + capHalf + slope < -40 || x - capHalf - slope > FRAME_W + 40) return;
      mesas.push({ i: k * 2 + j, tile: k, big: j === 0, x, capHalf, slope, base: L.base, top: L.base - m.h * L.amp });
    });
  }
  const items = [];
  for (const it of L.items) {
    const x = it.u - shift;
    if (x < -80 || x > FRAME_W + 80) continue;
    items.push({ kind: it.kind, x, y: ridge(x) });
  }
  return { name: 'far', factor: L.factor, shift, ridge, crest: crestOf(ridge), mesas, items };
}

function resolveMid(camX, t) {
  const L = SPEED_PLAN.mid;
  const shift = camX * L.factor * ZOOM;
  const P = L.period;
  const ridge = (x) => L.base - dunesTop(fract((x + shift) / P)) * L.amp;
  const poles = [];
  const { spacing, phase } = L.poles;
  const first = Math.floor((shift - phase - 240) / spacing);
  const last = Math.ceil((shift - phase + FRAME_W + 240) / spacing);
  for (let k = first; k <= last; k++) {
    const x = phase + k * spacing - shift;
    const base = ridge(x) + 1;
    const h = k % 3 === 0 ? 40 : 36;
    poles.push({ i: k, x, base, top: base - h, h });
  }
  const devils = [];
  for (const [i, d] of L.devils.entries()) {
    const x = d.u + d.wander * Math.sin(t * 0.15 + i * 2) - shift;
    if (x < -90 || x > FRAME_W + 60) continue;
    devils.push({ i, x, y: ridge(x) + 2 });
  }
  return { name: 'mid', factor: L.factor, shift, ridge, crest: crestOf(ridge), poles, devils };
}

function resolveNear(camX, t) {
  const L = SPEED_PLAN.near;
  const shift = camX * L.factor * ZOOM;
  const P = L.period;
  const ridge = (x) => L.base - dunesTop(fract((x + shift) / P)) * L.amp;
  const items = [];
  const [k0, k1] = tileRange(shift, P, 80);
  for (let k = k0; k <= k1; k++) {
    const tileX = k * P - shift;
    // Saguaros on the dune summits, every third one left bare (the shipped rule).
    DUNES.forEach((d, i) => {
      if ((((k + i) % 3) + 3) % 3 === 2) return;
      const parity = (((k + i) % 2) + 2) % 2;
      const x = tileX + d.at * P + (parity ? 3 : -4);
      if (x < -40 || x > FRAME_W + 40) return;
      const h = Math.max(8, d.h * L.amp * 0.42);
      items.push({ kind: 'saguaro', i: k * 3 + i, x, y: ridge(x), h, arms: i === 1 ? 2 : 3, flip: parity ? 1 : -1 });
    });
    // Low features between the summits (DESERT_NEAR_SURFACE_FEATURES): a rock on
    // even tiles, a tuft on every tile.
    const even = ((k % 2) + 2) % 2 === 0;
    const feats = even
      ? [{ at: 0.30, kind: 'rock', s: 0.65, fi: 0 }, { at: 0.67, kind: 'sage', s: 0.88, fi: 1 }]
      : [{ at: 0.24, kind: 'sage', s: 0.92, fi: 0 }];
    for (const f of feats) {
      const parity = (((k + f.fi) % 2) + 2) % 2;
      const x = tileX + f.at * P + (parity ? 3 : -4);
      if (x < -30 || x > FRAME_W + 30) continue;
      items.push({ kind: f.kind, i: k * 5 + f.fi, x, y: ridge(x), s: f.s });
    }
  }
  // The coyote's ledge on its bare summit. Facing hashed per summit and stage, as shipped.
  const c = L.coyote;
  const cx = c.u - shift;
  const coyote = cx > -60 && cx < FRAME_W + 60
    ? { x: cx, y: ridge(cx), facing: hash(c.tile * 7 + 1 * 13 + 11) < 0.5 ? -1 : 1, mode: c.mode }
    : null;
  // Tumbleweeds: bouncing along the crest, rolled right by the wind.
  const WEEDS = [
    { R: 9.0, hop: 0.66, H: 15, ph: 0.1 },
    { R: 6.8, hop: 0.5, H: 10, ph: 0.55 },
    { R: 11.0, hop: 0.84, H: 19, ph: 0.3 },
  ];
  const weeds = [];
  L.weeds.forEach((wd, i) => {
    const roll = wd.u + L.wind * t;
    const x = roll - shift;
    if (x < -30 || x > FRAME_W + 30) return;
    const w = WEEDS[wd.variant % 3];
    const k = t / w.hop + w.ph;
    const hopN = Math.floor(k);
    const p = k - hopN;
    const H = w.H * (0.55 + 0.7 * hash(hopN * 3.1 + w.R));
    const lift = H * 4 * p * (1 - p);
    const squash = Math.max(0, 1 - p / 0.1) * 0.8 + Math.max(0, (p - 0.94) / 0.06) * 0.5;
    weeds.push({ i, x, ground: ridge(x), R: w.R, lift, squash, spin: roll / w.R, age: p * w.hop, variant: wd.variant });
  });
  return { name: 'near', factor: L.factor, shift, ridge, crest: crestOf(ridge), items, coyote, weeds };
}

// The resolved frame a style paints from. `t` is seconds, `camX` the lane camera in
// world px; everything below is in screen px of the 480x270 frame.
export function speedFrame(camX, t) {
  const { sun, clouds, thermals, butte, smoke } = SPEED_PLAN;
  const cloudShift = camX * clouds.factor * ZOOM + t * clouds.drift;
  const vultures = [];
  thermals.forEach((th, ti) => {
    for (let i = 0; i < th.n; i++) {
      const a = t * th.rate + (i * TAU) / th.n;
      const raw = th.x + Math.cos(a) * th.rx - camX * th.plx * ZOOM;
      const span = FRAME_W + 160;
      const x = -80 + (((raw % span) + span) % span);
      vultures.push({
        i: ti * 4 + i, near: th.near, x, y: th.y + Math.sin(a) * th.ry,
        s: th.s * (0.84 + 0.16 * (0.5 + 0.5 * Math.sin(a))),
        bank: -Math.sin(a) * 0.22,
        flap: Math.max(0, Math.sin(t * 1.7 + i * 2.3) - 0.8) * 4.4,
      });
    }
  });
  const bx = FRAME_W / 2 + (butte.at - camX) * butte.factor * ZOOM;
  const smokeX = -110 + ((((smoke.x - camX * smoke.factor * ZOOM - t * smoke.drift) % smoke.span) + smoke.span) % smoke.span);
  const near = resolveNear(camX, t);
  const puffs = [];
  if (smokeX > -60 && smokeX < FRAME_W + 60) {
    const N = 6;
    for (let i = 0; i < N; i++) {
      const rise = (t * (0.08 + smoke.rate * 0.01) + (i + 0.5) / N) % 1;
      const u = 0.06 + rise * 0.88;
      const drift = Math.sin(t * smoke.rate + i * 1.7 + smoke.x) * (1.5 + u * 5.5);
      const sway = Math.sin(t * smoke.rate * 0.64 + i * 2.1 + smoke.x * 0.02) * 2.6;
      puffs.push({
        i, u,
        x: smokeX + smoke.lean * smoke.h * u * u + drift + sway,
        y: SPEED_PLAN.mid.base - 4 - smoke.h * u,
        r: smoke.w * (0.52 + u * 0.42),
        a: Math.min(1, rise / 0.12) * Math.min(1, (1 - rise) / 0.18),
      });
    }
  }
  return {
    t, camX, W: FRAME_W, H: FRAME_H, laneTop: LANE_TOP,
    sun: { ...sun },
    clouds: clouds.items.flatMap((c, i) => instances(c.u, cloudShift, clouds.period, c.w)
      .map((x) => ({ i, x, y: c.y, w: c.w, h: c.h }))),
    vultures,
    butte: bx > -160 && bx < FRAME_W + 160
      ? { x: bx, base: butte.base, top: butte.base - butte.h, halfW: butte.halfW } : null,
    smoke: puffs,
    layers: {
      far: resolveFar(camX),
      mid: resolveMid(camX, t),
      near,
    },
  };
}
