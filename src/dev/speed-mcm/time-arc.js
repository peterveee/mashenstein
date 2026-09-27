// SPEED ZONE in MID-CENTURY MODERN — one afternoon across the act (27 Sep 2026).
// Peter: "could we gradually adjust it as each level progresses so each change starts
// like the end of the previous one". The light is a function of where the run is in the
// act — u = (stage - 1 + stage progress) / 3 — so speed-2 opens in exactly the light
// speed-1 closed in, and a retry or rewind shows the same light for the same spot.
//
// Five authored palettes: MIDDAY (speed-1 opens), AFTERNOON (speed-1 closes, speed-2
// opens), GOLDEN (speed-2 closes, speed-3 opens), SUNSET (halfway through speed-3) and
// DUSK (speed-3 closes, the sun down and the evening coming on). Between two of them every colour is blended in OKLab, which keeps a
// blend from greying out the way an RGB mix of turquoise and coral does. The structure
// colours (towers, gantry, pump) swap from terracotta to teal as the sky goes from
// turquoise to warm, keyframed on their own so they stay clear of the sky throughout;
// the sun sinks and grows as the light warms. Gallery-only.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { CABINETS } from '../../data/cabinets.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';
import { drawTextVectorCentered, textYForMid } from '../../engine/sprites.js';
import { speedFrame, SPEED_STAGE_LEN, hash } from './plan.js';
import { MCM_PALETTES, paintWith } from './mcm.js';
import {
  MCM_OBJ, mcmBigEar, mcmMast, mcmLookout, mcmLaunchPad, mcmWaterTower, mcmWindFarm,
  mcmPumpjacks, mcmSpeedTrap, mcmJet, mcmRoadSign,
} from './objects.js';
import { SLOT_U, PUMP_U, TRAP_U, SIGN_U, SIGN_SCALE, SIGN_BASE_Y, farProp } from './object-sheet.js';

// ------------------------------------------------------------------ OKLab
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToLab(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = toLin(((n >> 16) & 255) / 255);
  const g = toLin(((n >> 8) & 255) / 255);
  const b = toLin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function labToHex([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => Math.round(Math.max(0, Math.min(1, toSrgb(Math.max(0, c)))) * 255).toString(16).padStart(2, '0')).join('')}`;
}
const labCache = new Map();
function lab(hex) {
  let v = labCache.get(hex);
  if (!v) {
    v = hexToLab(hex);
    labCache.set(hex, v);
  }
  return v;
}
function mixHex(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const A = lab(a);
  const B = lab(b);
  return labToHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
}

// Every key of a palette, blended: hex colours in OKLab, numbers and 'r,g,b' strings
// linearly, arrays and objects member by member; anything else (the id) from `a`.
function blend(a, b, k) {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a[0] === '#' && b[0] === '#') return mixHex(a, b, k);
    if (/^\d+,\d+,\d+$/.test(a) && /^\d+,\d+,\d+$/.test(b)) {
      const A = a.split(',').map(Number);
      const B = b.split(',').map(Number);
      return A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',');
    }
    return a;
  }
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i] ?? v, k));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = {};
    for (const key of Object.keys(a)) out[key] = key in b ? blend(a[key], b[key], k) : a[key];
    return out;
  }
  return a;
}
function over(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? over(base[k], v) : v;
  }
  return out;
}

// ------------------------------------------------------------------ the four keyframes
// cloudGlow / cloudLit: how strongly, and in what colour, the clouds are lit from below.
const MIDDAY = { ...MCM_PALETTES.midday, obj: MCM_OBJ.midday, cloudGlow: 0, cloudLit: '#fffaf0' };
const SUNSET = { ...MCM_PALETTES.sunset, obj: MCM_OBJ.sunset, cloudGlow: 0.55, cloudLit: '#ffc987' };
// Mid-afternoon: the turquoise holds overhead, the horizon warms to straw, the steel
// deepens to a brick red.
const AFTERNOON = over(blend(MIDDAY, SUNSET, 0.22), {
  id: 'midday', dryL: MIDDAY.dryL, dryD: MIDDAY.dryD,
  sky: ['#3495a7', '#51a9b3', '#80bebb', '#bcd4bb', '#f0d9a6'],
  streak: '#e2efdc', streakA: 0.28,
  sun: { disc: '#fff8df', plate: '#f4c04a', ray: '#fffbeb', halo: '#f5efcd', haloA: 0.22 },
  cloud: ['#f1e9d8', '#fffaf0'], cloudA: [0.5, 0.88],
  obj: { plate: '#a84c33', plateDark: '#7e3726', alt: '#6f8b8e' },
  pump: { plate: '#a84c33' },
});
// Golden hour: a dusty mauve overhead falling to rose, amber and gold at the horizon;
// the steel has turned to a deep teal to stand against it.
const GOLDEN = over(blend(MIDDAY, SUNSET, 0.62), {
  id: 'sunset', dryL: SUNSET.dryL, dryD: SUNSET.dryD,
  sky: ['#8a86a8', '#b6929f', '#daa17e', '#edb971', '#f6d590'],
  streak: '#fbe3b8', streakA: 0.26,
  sun: { disc: '#fff3cf', plate: '#f2b23a', ray: '#fff5d8', halo: '#fbd88c', haloA: 0.22 },
  cloud: ['#e7ad97', '#fbe1bb'], cloudA: [0.44, 0.74], cloudGlow: 0.25, cloudLit: '#ffe2a8',
  obj: { plate: '#2c6f6e', plateDark: '#1f5352', alt: '#b36372' },
  pump: { plate: '#2c6f6e' },
});
// Early evening: the sun is down. Indigo overhead through violet and a magenta band to
// a coral and amber afterglow on the horizon; the clouds lit from underneath; the land
// cooled toward violet but still read; the steel gone to a dark slate that holds as a
// silhouette; an evening star out. Built from SUNSET with every colour pulled a third of
// the way to twilight, then the sky, sun, clouds and steel authored.
function mapColours(v, fn) {
  if (typeof v === 'string' && v[0] === '#') return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapColours(x, fn));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapColours(x, fn)]));
  return v;
}
const TWILIGHT = '#3b3162';
const DUSK = over(mapColours(SUNSET, (c) => mixHex(c, TWILIGHT, 0.34)), {
  id: 'sunset', ink: '#1f1522',
  sky: ['#2c2d5a', '#4e3b6c', '#8f4d6e', '#d8694f', '#efa05a'],
  streak: '#f0b98a', streakA: 0.2,
  sun: { disc: '#ffd9a0', plate: '#e8723a', ray: '#ffcf9a', halo: '#f29a5e', haloA: 0.26 },
  cloud: ['#5e4c80', '#6e5a8e'], cloudA: [0.8, 0.96], cloudInk: 0.3, cloudGlow: 1, cloudLit: '#f28a6c',
  bird: '#1f1522', birdSlip: '#8f4d6e',
  shade: '#2a2450', shadeA: 0.42,
  obj: { plate: '#27434c', plateDark: '#1a2f36', cream: '#e8d6c8', glass: '#f4b36a' },
  pump: { plate: '#27434c', tank: '#27434c', tankRim: '#1a2f36', water: '#f0a060' },
});
export const ARC_KEYS = [
  { at: 0, name: 'MIDDAY', pal: MIDDAY },
  { at: 1 / 3, name: 'AFTERNOON', pal: AFTERNOON },
  { at: 2 / 3, name: 'GOLDEN', pal: GOLDEN },
  { at: 0.85, name: 'SUNSET', pal: SUNSET },
  { at: 1, name: 'DUSK', pal: DUSK },
];

// The palette at act position u (0 = speed-1's first frame, 1 = speed-3's last).
// Blends are cached by u to 1/600 of the act, far finer than a step anyone could see.
const arcCache = new Map();
export function arcPalette(u) {
  const q = Math.round(Math.max(0, Math.min(1, u)) * 600);
  let pal = arcCache.get(q);
  if (pal) return pal;
  const v = q / 600;
  let i = 0;
  while (i < ARC_KEYS.length - 2 && v > ARC_KEYS[i + 1].at) i++;
  const a = ARC_KEYS[i];
  const b = ARC_KEYS[i + 1];
  const k = (v - a.at) / (b.at - a.at);
  pal = blend(a.pal, b.pal, k);
  pal.id = k < 0.5 ? a.pal.id : b.pal.id;
  if (arcCache.size > 700) arcCache.clear();
  arcCache.set(q, pal);
  return pal;
}
// The sun sinks and swells as the light warms; by sunset it is going behind the mesas.
export function arcSun(u) {
  const SET = 0.85;
  if (u > SET) {
    const k = (u - SET) / (1 - SET);
    return { x: 380, y: 130 + 110 * k * k, r: 27 };
  }
  const v = u / SET;
  const e = v * v * (3 - 2 * v);
  return { x: 380, y: 34 + 96 * e ** 1.3, r: 21 + 6 * e };
}
// The evening star, fading in as the sun goes down: a small four-point starburst.
function eveningStar(ctx, u) {
  const a = Math.max(0, Math.min(1, (u - 0.88) / 0.1));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.arc(96, 44, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff6e0';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(96 - 5, 44); ctx.lineTo(96 + 5, 44);
  ctx.moveTo(96, 44 - 5); ctx.lineTo(96, 44 + 5);
  ctx.stroke();
  ctx.restore();
}
export const actU = (stage, p) => (stage - 1 + p) / 3;

// ------------------------------------------------------------------ what each stage passes
// The shipped placement (the object sheet's numbers) for any camera, so a still at 50%
// of speed-2 shows what the run shows there.
const HORIZON = [null, 'big-ear', 'water', 'wind', 'big-ear', null];
const STAGE_HORIZON = { 1: { 0: 'wind-pump' }, 2: { 0: 'lookout', 2: 'mast' }, 3: { 0: 'launch-pad' } };
const LOWER = new Set(['water', 'mast']);
const SIGN_KINDS = ['speed', 'highway', 'route', 'caution', 'exit'];
const HIGHWAY_VALUES = ['13', '404', 'πr²', '∞', '7'];

function stageHooks(stage) {
  return {
    far: (ctx, f, pal, P) => {
      const shift = f.layers.far.shift;
      const ridge = f.layers.far.ridge;
      for (let i = Math.floor((shift - 400) / 723); i <= Math.ceil((shift + 700) / 723); i++) {
        const slot = ((i % 6) + 6) % 6;
        const kind = (i < 6 ? STAGE_HORIZON[stage][slot] : null) ?? HORIZON[slot];
        if (!kind || kind === 'wind-pump') continue;
        const p = farProp(SLOT_U(i, LOWER.has(kind)))(f);
        if (p.x < -120 || p.x > 600) continue;
        if (kind === 'big-ear') mcmBigEar(ctx, p.x, p.y, f.t, pal, P);
        else if (kind === 'water') mcmWaterTower(ctx, p.x, p.y, pal, P);
        else if (kind === 'mast') mcmMast(ctx, p.x, p.y, f.t, pal, P, ridge);
        else if (kind === 'wind') mcmWindFarm(ctx, p.x, f.t, pal, P, (x) => ridge(x) + 2, i);
        else if (kind === 'lookout') mcmLookout(ctx, p.x, p.y, f.t, pal, P);
        else if (kind === 'launch-pad') mcmLaunchPad(ctx, p.x, p.y, f.t, (480 * 0.62 - p.x) / 38, pal, P);
      }
    },
    mid: (ctx, f, pal, P) => {
      if (stage !== 1) return;
      const x = PUMP_U() - f.layers.mid.shift;
      if (x > -300 && x < 780) mcmPumpjacks(ctx, x, f.t, pal, P, f.layers.mid.ridge);
    },
    near: (ctx, f, pal, P) => {
      if (stage !== 2) return;
      const x = TRAP_U() - f.layers.near.shift;
      if (x > -140 && x < 620) mcmSpeedTrap(ctx, x, f.layers.near.ridge(x) - 0.3, f.t, pal, P);
    },
    top: (ctx, f, pal, P) => {
      if (stage === 3) {
        const k = (f.camX - SPEED_STAGE_LEN * 0.45) / 1600;
        if (k >= 0 && k < 1) mcmJet(ctx, k, -40, 520, 104, pal);
      }
      const travel = f.camX * 0.42 * ZOOM;
      for (let i = Math.floor((travel - 520) / 1120); i <= Math.ceil((travel + 160) / 1120); i++) {
        const x = SIGN_U(i) - travel;
        if (x < -60 || x > 540) continue;
        const kind = SIGN_KINDS[((i % 5) + 5) % 5];
        const value = kind === 'speed' ? (stage === 2 && i === 0 ? '67' : String(10 + Math.floor(hash(i * 5.3 + 2) * 90)))
          : kind === 'highway' ? HIGHWAY_VALUES[Math.floor(i / 5) % 5] : kind === 'exit' ? '42' : '';
        mcmRoadSign(ctx, kind, x, SIGN_BASE_Y, 208 + 33 * SIGN_SCALE[kind], value, pal, P);
      }
    },
  };
}

// ------------------------------------------------------------------ the cards
let pack = null;
let speed = null;
const POSE = (t) => ({
  kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
  roll: false, float: false, stomp: false, headless: false, facing: 1,
});

// The picture at `camX` of `stage`, in the light of act position `u`: the MCM backdrop
// with that stage's objects, the shipped road, the hero running.
function drawArcFrame(ctx, t, stage, camX, u) {
  if (!pack) {
    pack = getStylePack('faux3d', { paperPreset: 'cardstockClear' });
    speed = CABINETS.find((cab) => cab.id === 'speed');
  }
  const f = speedFrame(camX, t);
  f.sun = arcSun(u);
  ctx.save();
  paintWith(arcPalette(u), ctx, f, { hooks: { ...stageHooks(stage), sky: (c) => eveningStar(c, u) }, farItems: stage === 1 });
  ctx.restore();
  // The road and the hero take the light too: drawn on a layer of their own, then tinted
  // on that layer only (source-atop), so the backdrop is untouched.
  const tint = laneTint(u);
  const layer = tint ? laneLayer(ctx) : null;
  const g = layer ? layer.getContext('2d') : ctx;
  g.save();
  if (layer) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, layer.width, layer.height);
    g.setTransform(ctx.getTransform());
  }
  applyWorld(g, ZOOM, 0, GROUND_Y);
  pack.ground(g, camX, speed, [], [], t * 60, VIEW_W);
  drawToon(g, 'lorenzo', POSE(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  g.restore();
  if (layer) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = tint.a;
    g.fillStyle = tint.color;
    g.fillRect(0, 0, layer.width, layer.height);
    g.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }
}

// The lane's light: nothing through the day, a warm cast from golden hour to sunset,
// then cooling and darkening into dusk (a veil toward twilight violet, never black, so
// the hero and the road still read).
function laneTint(u) {
  const WARM = '#f08a50';
  const DUSK_VEIL = '#2c2552';
  if (u < 0.6) return null;
  if (u < 0.85) return { color: WARM, a: 0.1 * ((u - 0.6) / 0.25) };
  const k = (u - 0.85) / 0.15;
  return { color: mixHex(WARM, DUSK_VEIL, Math.min(1, k * 1.4)), a: 0.1 + 0.3 * k };
}
const laneLayers = new WeakMap();
function laneLayer(ctx) {
  let c = laneLayers.get(ctx);
  if (!c || c.width !== ctx.canvas.width || c.height !== ctx.canvas.height) {
    c = document.createElement('canvas');
    c.width = ctx.canvas.width;
    c.height = ctx.canvas.height;
    laneLayers.set(ctx, c);
  }
  return c;
}

function caption(ctx, str, x = 8, y = 12) {
  const scale = 0.62;
  ctx.fillStyle = 'rgba(16,14,24,0.6)';
  ctx.fillRect(x - 4, y - 7, str.length * 5.1 + 8, 14);
  drawTextVectorCentered(ctx, str, x + str.length * 2.55, textYForMid(y, scale, 'bold'), '#fff6e0', scale, 'bold');
}

// The whole act in 24 s: 8 s a stage, the camera creeping from each stage's opening at
// the card's usual 40 px/s while the light runs through the whole afternoon.
export const ARC_LAPSE = 24;
export function drawArcTimelapse(ctx, t) {
  const u = ((t % ARC_LAPSE) + ARC_LAPSE) % ARC_LAPSE / ARC_LAPSE;
  const stage = Math.min(3, Math.floor(u * 3) + 1);
  const p = u * 3 - (stage - 1);
  drawArcFrame(ctx, t, stage, p * 8 * 40, u);
  caption(ctx, `SPEED-${stage}  ${Math.round(p * 100)}%`);
}

// A still of one moment: `p` of the way through `stage`, the camera where the run has it.
export const ARC_STILLS = [1, 2, 3].flatMap((stage) => [
  { stage, p: 0.02, label: 'opening' },
  { stage, p: 0.5, label: 'halfway' },
  { stage, p: 0.97, label: 'the finish' },
]);
export function drawArcStill(ctx, t, still) {
  drawArcFrame(ctx, t, still.stage, still.p * SPEED_STAGE_LEN, actU(still.stage, still.p));
  caption(ctx, `SPEED-${still.stage}  ${Math.round(still.p * 100)}%`);
}

// The colours themselves across the act, left to right: the five sky bands, the far
// mesa's strata, the steel, the middle and near dunes, the sun. Stage boundaries ticked.
export function drawArcRibbon(ctx, W = 480, H = 270) {
  ctx.fillStyle = '#16141f';
  ctx.fillRect(0, 0, W, H);
  const rows = [
    ...[0, 1, 2, 3, 4].map((i) => ({ label: `sky ${i + 1}`, get: (p) => p.sky[i] })),
    { label: 'mesa cap', get: (p) => p.mesaCap },
    { label: 'mesa', get: (p) => p.mesa[0] },
    { label: 'mesa 2', get: (p) => p.mesa[1] },
    { label: 'steel', get: (p) => p.obj.plate },
    { label: 'cream', get: (p) => p.obj.cream },
    { label: 'mid dunes', get: (p) => p.mid.fill },
    { label: 'near dunes', get: (p) => p.near.fill },
    { label: 'sun', get: (p) => p.sun.disc },
    { label: 'ink', get: (p) => p.ink },
  ];
  const x0 = 58;
  const x1 = W - 8;
  const y0 = 22;
  const rh = (H - y0 - 16) / rows.length;
  const N = 120;
  for (let j = 0; j < N; j++) {
    const pal = arcPalette(j / (N - 1));
    rows.forEach((r, i) => {
      ctx.fillStyle = r.get(pal);
      ctx.fillRect(x0 + ((x1 - x0) * j) / N, y0 + i * rh, (x1 - x0) / N + 0.6, rh - 1.5);
    });
  }
  rows.forEach((r, i) => {
    drawTextVectorCentered(ctx, r.label.toUpperCase(), 28, textYForMid(y0 + i * rh + rh / 2, 0.38, 'bold'), '#cfc8dc', 0.38, 'bold');
  });
  ARC_KEYS.forEach((k) => {
    const x = x0 + (x1 - x0) * k.at;
    ctx.fillStyle = '#fff6e0';
    ctx.fillRect(x - 0.5, y0 - 4, 1, H - y0 - 10);
    drawTextVectorCentered(ctx, k.name, Math.max(x0 + 18, Math.min(x1 - 18, x)), textYForMid(10, 0.42, 'bold'), '#fff6e0', 0.42, 'bold');
  });
  [1, 2, 3].forEach((s) => {
    drawTextVectorCentered(ctx, `SPEED-${s}`, x0 + ((x1 - x0) * (s - 0.5)) / 3, textYForMid(H - 7, 0.42, 'bold'), '#9d95b0', 0.42, 'bold');
  });
}
