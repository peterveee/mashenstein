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
import {
  paintWith, ARC_KEYS, arcPalette, arcSun, eveningStar, laneTint, actU,
} from '../../engine/stylePacks/speedMcm.js';
import {
  mcmBigEar, mcmMast, mcmLookout, mcmLaunchPad, mcmWaterTower, mcmWindFarm,
  mcmPumpjacks, mcmSpeedTrap, mcmJet, mcmRoadSign,
} from './objects.js';
import { SLOT_U, PUMP_U, TRAP_U, SIGN_U, SIGN_SCALE, SIGN_BASE_Y, farProp } from './object-sheet.js';

// The keyframes, the OKLab blend, the sun's path, the evening star and the lane's tint
// shipped on 28 Sep 2026 and live in the engine (speedMcm.js, "the light across the
// act"); these cards draw the shipped arc.
export { ARC_KEYS, arcPalette, arcSun, actU };

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
