// SPEED ZONE — every backdrop object, shipped against mid-century modern (27 Sep 2026).
// Peter: "i would like to see more of the art from the real speed cabinet re-rendered in
// mcm style in the gallery to see what works and what doesn't. Can you put all objects
// from the background in the lab? we already have versions of the coyote so don't need
// to do that one".
//
// One entry per object the shipped desert draws. Each names the stage and the camera
// that bring the shipped object to the middle of the picture — derived from the pack's
// own placement numbers, so the SHIPPED card is the real pack.bg with nothing added —
// and the MCM painter that stands on the same spot of plan.js's re-composed country
// (whose ridges and rates are the shipped ones). A card holds the camera still and
// frames the object; the game-scale card crops the same three pictures at 1x.
//
// The exceptions, each because the shipped clock is the camera and a held card would
// freeze it: the rocket's launch runs on a 15 s loop (through the pack's own review
// seam, __mashDesertHorizonOverride, so it is still the shipped painter), and the jet,
// the dust devil and the tumbleweed are drawn by their shipped painters over a shipped
// backdrop at a fixed spot. Gallery-only.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { drawDesertHorizonProp } from '../../engine/stylePacks/desertHorizonProps.js';
import { drawDesertJet, drawDesertDustDevil, drawDesertTumbleweed } from '../../engine/stylePacks/desertLandmarks.js';
import { CABINETS } from '../../data/cabinets.js';
import { speedFrame, SPEED_STAGE_LEN } from './plan.js';
import { MCM_SUNSET, MCM_MIDDAY, MCM_KIT } from './mcm.js';
import {
  mcmBigEar, mcmMast, mcmLookout, mcmLaunchPad, rocketClock, mcmWaterTower, mcmWindFarm,
  mcmPumpjacks, mcmSpeedTrap, mcmJet, mcmJetAt, mcmRoadSign,
} from './objects.js';

const FAR_F = 0.12;
const MID_F = 0.22;
const NEAR_F = 0.35;
const SIGN_F = 0.42;
const fract = (v) => v - Math.floor(v);

// ------------------------------------------------------------------ the shipped placement
// Horizon slots: one every 723 far-layer px from phase 362 (the high mesa); the water
// tower and the mast stand on the lower mesa, at phase 58 (stylePacks/index.js
// desertHorizonPropPlacements).
export const SLOT_U = (index, lower = false) => (lower ? 58 : 362) + index * 723;
// The camera that puts layer-space u of a range at frame x `at`.
const camFor = (u, factor, at = 240) => (u - at) / (factor * ZOOM);
// desertTileAt, from the pack.
function tileAt(atCam, factor, period, at) {
  return Math.round((atCam * factor * ZOOM + 240 - at * period) / period);
}
const MID_P = Math.round(Math.PI * 200);
const NEAR_P = Math.round(Math.PI * 150);
export const PUMP_U = () => tileAt(SPEED_STAGE_LEN * 0.45, MID_F, MID_P, 0.49) * MID_P + 0.49 * MID_P;
const PUMP_HALF_GAP = 0.32 * MID_P;
export const TRAP_U = () => tileAt(320, NEAR_F, NEAR_P, 0.17) * NEAR_P + 0.17 * NEAR_P;
// Roadside signs: every 1120 sign-plane px from phase 420 (landscape), in the shipped
// order; the board's anchor is y 189 and the post's foot 208 + 33 x its scale.
export const SIGN_U = (index) => 420 + index * 1120;
export const SIGN_SCALE = { speed: 0.88, highway: 0.84, route: 0.8, caution: 0.82, exit: 0.84 };
export const SIGN_BASE_Y = 189;
// The jet's gallery pass: the shipped one lasts 1600 world px, about 8.5 s at speed.
const JET_LOOP = 8.5;
const JET_X0 = -40;
const JET_X1 = 520;
const JET_Y = 104;
const jetK = (t) => fract(t / JET_LOOP);
const jetFocus = (t) => {
  const [x, y] = mcmJetAt(jetK(t), JET_X0, JET_X1, JET_Y);
  return { x: Math.max(120, Math.min(360, x)), y: Math.max(68, Math.min(160, y + 10)) };
};

const far = (f) => f.layers.far;
const mid = (f) => f.layers.mid;
const near = (f) => f.layers.near;
export const farProp = (u) => (f) => {
  const x = u - far(f).shift;
  return { x, y: far(f).ridge(x) + 2 };
};
const seatsOf = (f) => ({ far: far(f).ridge, mid: mid(f).ridge, near: near(f).ridge });

// A tumbleweed held at one spot, bouncing and spinning on the shipped clock.
const WEED = { R: 9.0, hop: 0.66, H: 15, ph: 0.1 };
function weedState(t, x, ground) {
  const k = t / WEED.hop + WEED.ph;
  const hopN = Math.floor(k);
  const p = k - hopN;
  const H = WEED.H * (0.55 + 0.7 * MCM_KIT.hash(hopN * 3.1 + WEED.R));
  return {
    i: 0, x, ground, R: WEED.R, lift: H * 4 * p * (1 - p),
    squash: Math.max(0, 1 - p / 0.1) * 0.8 + Math.max(0, (p - 0.94) / 0.06) * 0.5,
    spin: (x + 26 * t) / WEED.R, age: p * WEED.hop, variant: 0,
  };
}

// ------------------------------------------------------------------ the objects
// id, name, note; stage; views: [{ camX(t), focus(f, style, t) }]; zoom (the close
// card); mcm: layer hooks (ctx, f, pal, P); farItems: false drops plan.js's wind pump
// where another prop takes its cap; shipped: extra drawing over the shipped backdrop;
// override: the shipped horizon-prop seam; isNew: no MCM version existed before today.
export const SPEED_MCM_OBJECTS = [
  {
    id: 'sun', name: 'Sun and clouds', stage: 1, zoom: 2.2,
    note: 'Shipped: a soft radial glow on a bare sky. MCM: a flat sun with its second disc printed out of step, an atomic ring of rays and kidney clouds.',
    views: [{ camX: () => 0, focus: () => ({ x: 356, y: 64 }) }],
  },
  {
    id: 'vultures', name: 'Vultures', stage: 1, zoom: 2.4,
    note: 'Two thermals circling and banking. MCM: boomerangs with a coral second plate slipped out from under the black.',
    views: [{ camX: () => 0, focus: () => ({ x: 118, y: 62 }) }],
  },
  {
    id: 'jet', name: 'Jet flypast', stage: 3, zoom: 2, isNew: true,
    note: 'speed-3\'s fighter going supersonic: vapour cone, shock ring, lingering contrail. MCM: a Sabre in flat plates, the '
      + 'cone a pale flat shape with ink rings, the boom a starburst, the ring a pale band with its line off register, the '
      + 'contrail a two-plate ribbon that fades in steps. Looped every 8.5 s; the close card follows the jet.',
    views: [{ camX: () => 3000, focus: (f, s, t) => jetFocus(t) }],
    shipped: (ctx, t) => drawDesertJet(ctx, jetK(t), JET_X0, JET_X1, JET_Y),
    mcm: { top: (ctx, f, pal) => mcmJet(ctx, jetK(f.t), JET_X0, JET_X1, JET_Y, pal) },
  },
  {
    id: 'butte', name: 'Strata butte', stage: 1, zoom: 1.6,
    note: 'The landmark at 55% of every stage, behind the far range. MCM: stacked slabs that taper and lean, a needle spire beside it.',
    views: [{ camX: () => SPEED_STAGE_LEN * 0.55, focus: () => ({ x: 232, y: 142 }) }],
  },
  {
    id: 'wind-pump', name: 'Wind pump (speed-1)', stage: 1, zoom: 2.2,
    note: 'speed-1\'s opening landmark over its stock tank; the wheel turns, the rod strokes.',
    views: [{ camX: () => camFor(SLOT_U(0), FAR_F), focus: (f) => ({ x: 248, y: farProp(SLOT_U(0))(f).y - 30 }) }],
  },
  {
    id: 'lookout', name: 'Fire lookout (speed-2)', stage: 2, zoom: 2.2, isNew: true, farItems: false,
    note: 'speed-2\'s opening landmark. The windows catch the sun on a bearing as the tower is carried past it — shipped as a '
      + 'streak, MCM as a starburst (the card holds the camera near that bearing). Pennant flapping.',
    views: [{ camX: () => camFor(SLOT_U(0), FAR_F, 236), focus: (f) => ({ x: 236, y: farProp(SLOT_U(0))(f).y - 34 }) }],
    mcm: { far: (ctx, f, pal, P) => { const p = farProp(SLOT_U(0))(f); mcmLookout(ctx, p.x, p.y, f.t, pal, P); } },
  },
  {
    id: 'launch-pad', name: 'Rocket launch (speed-3)', stage: 3, zoom: 1.7, isNew: true, farItems: false,
    note: 'speed-3\'s opening landmark: venting, ignition, the arms swing back, lift-off, the trail left drifting. MCM: a '
      + '1950s rocket — cream capsules, coral nose, swept mustard fins — a flame of stacked flat teardrops, smoke in flat '
      + 'two-plate puffs. In the run the launch is clocked by the pad\'s scroll; here both loop every 15 s.',
    views: [{ camX: () => camFor(SLOT_U(0), FAR_F), focus: (f) => ({ x: 236, y: farProp(SLOT_U(0))(f).y - 48 }) }],
    override: (t) => (ctx, prop, opts) => {
      if (prop.kind !== 'launch-pad') return false;
      drawDesertHorizonProp(ctx, 'launch-pad', {
        t, x: prop.x, baseY: prop.baseY, seat: opts.seat,
        skyY: prop.baseY + (opts.skyOffset || 0) - 24, launch: rocketClock(t),
      });
      return true;
    },
    mcm: { far: (ctx, f, pal, P) => { const p = farProp(SLOT_U(0))(f); mcmLaunchPad(ctx, p.x, p.y, f.t, rocketClock(f.t), pal, P); } },
  },
  {
    id: 'big-ear', name: 'Big ear (radio telescope)', stage: 1, zoom: 2, isNew: true,
    note: 'Once a stage on a high mesa: one large dish re-aiming in step-and-hold moves, the feed lamp blinking (a starburst in MCM).',
    views: [{ camX: () => camFor(SLOT_U(1), FAR_F, 236), focus: (f) => ({ x: 244, y: farProp(SLOT_U(1))(f).y - 28 }) }],
    mcm: { far: (ctx, f, pal, P) => { const p = farProp(SLOT_U(1))(f); mcmBigEar(ctx, p.x, p.y, f.t, pal, P); } },
  },
  {
    id: 'water-tower', name: 'Water tower', stage: 1, zoom: 2.2, isNew: true,
    note: 'On the lower mesa on speed-1 and speed-3. MCM: a cream drum with a coral band, a cone roof and a finial, on stilts drawn off register.',
    views: [{ camX: () => camFor(SLOT_U(2, true), FAR_F), focus: (f) => ({ x: 240, y: farProp(SLOT_U(2, true))(f).y - 30 }) }],
    mcm: { far: (ctx, f, pal, P) => { const p = farProp(SLOT_U(2, true))(f); mcmWaterTower(ctx, p.x, p.y, pal, P); } },
  },
  {
    id: 'mast', name: 'Radio mast (speed-2)', stage: 2, zoom: 1.9, isNew: true,
    note: 'In place of the water tower on speed-2: a guyed lattice mast, microwave drums, two beacons.',
    views: [{ camX: () => camFor(SLOT_U(2, true), FAR_F), focus: (f) => ({ x: 240, y: farProp(SLOT_U(2, true))(f).y - 34 }) }],
    mcm: { far: (ctx, f, pal, P) => { const p = farProp(SLOT_U(2, true))(f); mcmMast(ctx, p.x, p.y, f.t, pal, P, far(f).ridge); } },
  },
  {
    id: 'wind-farm', name: 'Wind turbines', stage: 1, zoom: 1.8, isNew: true,
    note: 'Near the end of every stage: three turbines on one cap. MCM: cream masts, leaf blades with a shaded half.',
    views: [{ camX: () => camFor(SLOT_U(3), FAR_F), focus: (f) => ({ x: 240, y: farProp(SLOT_U(3))(f).y - 30 }) }],
    mcm: { far: (ctx, f, pal, P) => { const p = farProp(SLOT_U(3))(f); mcmWindFarm(ctx, p.x, f.t, pal, P, (x) => far(f).ridge(x) + 2); } },
  },
  {
    id: 'smoke', name: 'Campfire smoke', stage: 1, zoom: 1.4,
    note: 'One plume rising from behind the middle range, drifting on its own wind. MCM: three-lobed flat cloudlets, the second plate slipped.',
    views: [{
      camX: () => 0,
      focus: (f, s, t) => ({ x: Math.max(172, Math.min(308, -110 + fract((245 - 5.5 * t) / 1920) * 1920 + 12)), y: 118 }),
    }],
  },
  {
    id: 'poles', name: 'Power poles', stage: 1, zoom: 2.2,
    note: 'Two crossbars, two sagging wires. MCM: a warm wood plate under the drawn pole, insulators as beads. (The MCM row is phased 48 px later so none stands behind the coyote.)',
    views: [{ camX: () => 0, focus: (f, s) => ({ x: s === 'shipped' ? 282 : 330, y: 172 }) }],
  },
  {
    id: 'pumpjacks', name: 'Pumpjacks (speed-1)', stage: 1, zoom: 2, isNew: true,
    note: 'speed-1\'s landmark: two rigs on middle-range summits pumping out of step, the linkage solved (the horse head\'s arc '
      + 'keeps the rod vertical). MCM: a mustard head, rose beam, coral counterweight, on slab plinths like the coyote\'s ledge.',
    views: [{
      camX: () => camFor(PUMP_U() - PUMP_HALF_GAP, MID_F),
      focus: (f) => ({ x: 244, y: mid(f).ridge(240) - 22 }),
    }],
    mcm: { mid: (ctx, f, pal, P) => mcmPumpjacks(ctx, PUMP_U() - mid(f).shift, f.t, pal, P, mid(f).ridge) },
  },
  {
    id: 'devil', name: 'Dust devil', stage: 1, zoom: 1.5,
    note: 'Winding column wandering the middle dunes. MCM: a stacked spiral of flat strokes, pills boiling round the foot.',
    views: [{ camX: () => camFor(3215, MID_F, 230), focus: () => ({ x: 250, y: 140 }) }],
    shipped: (ctx, t, f) => drawDesertDustDevil(ctx, t, 3215 + 12 * Math.sin(t * 0.15) - mid(f).shift, seatsOf(f)),
  },
  {
    id: 'plants', name: 'Saguaros, agaves, yuccas, rocks', stage: 1, zoom: 2.2,
    note: 'The near dunes\' planting (every third summit left bare). MCM: capsule saguaros, starburst agaves, yucca lollipops, blob rocks.',
    views: [{ camX: () => 0, focus: () => ({ x: 232, y: 186 }) }],
  },
  {
    id: 'speed-trap', name: 'Speed trap (speed-2)', stage: 2, zoom: 2.2, isNew: true,
    note: 'SMILE! YOU\'RE ON SPEED CAMERA, the flash, the mugshot, GOTCHA! and the $1986 fine; the patrol car behind the board '
      + 'lights up. MCM: a 1950s billboard in a mustard frame under flat cones of floodlight, a press camera whose flash is '
      + 'an atomic starburst, a finned cruiser with one bubble light, the lot a slab plinth. The shipped 3 s gallery loop.',
    views: [{ camX: () => camFor(TRAP_U(), NEAR_F, 248), focus: (f) => ({ x: 240, y: near(f).ridge(248) - 20 }) }],
    mcm: { near: (ctx, f, pal, P) => { const x = TRAP_U() - near(f).shift; mcmSpeedTrap(ctx, x, near(f).ridge(x) - 0.3, f.t, pal, P); } },
  },
  {
    id: 'weed', name: 'Tumbleweed', stage: 1, zoom: 2.6,
    note: 'Bouncing and spinning on the wind (held at one spot here). MCM: a scribble of loose ink loops round a slipped flat disc.',
    views: [{ camX: () => 1200, focus: (f) => ({ x: 240, y: near(f).ridge(240) - 18 }) }],
    shipped: (ctx, t, f) => drawDesertTumbleweed(ctx, t, 240, seatsOf(f), 0, 240 + 26 * t),
    mcm: { near: (ctx, f, pal) => MCM_KIT.weed(ctx, weedState(f.t, 240, near(f).ridge(240)), pal) },
  },
  {
    id: 'signs', name: 'Roadside signs', stage: 2, zoom: 1.5, isNew: true, still: true,
    note: 'The five boards in the order they pass: SPEED LIMIT (67 before the speed trap), HIGHWAY 13, the Autobahn sign, '
      + 'the mc² warning, NEXT EXIT 42. MCM: flat faces slipped off their ink borders, keylines, wood posts, soil kidneys.',
    views: ['speed', 'highway', 'route', 'caution', 'exit'].map((kind, i) => ({
      kind, value: kind === 'speed' ? '67' : kind === 'highway' ? '13' : kind === 'exit' ? '42' : '',
      camX: () => camFor(SIGN_U(i), SIGN_F),
      focus: () => ({ x: 240, y: 160 }),
    })),
  },
];
// The signs are one object with five views; each view's MCM board is its own hook.
for (const obj of SPEED_MCM_OBJECTS) {
  if (obj.id !== 'signs') continue;
  obj.views.forEach((v, i) => {
    v.mcm = {
      top: (ctx, f, pal, P) => mcmRoadSign(ctx, v.kind, SIGN_U(i) - f.camX * SIGN_F * ZOOM, SIGN_BASE_Y,
        208 + 33 * SIGN_SCALE[v.kind], v.value, pal, P),
    };
  });
}

// ------------------------------------------------------------------ drawing
const STAGE_OPENER = {
  2: (ctx, f, pal, P) => { const p = farProp(SLOT_U(0))(f); mcmLookout(ctx, p.x, p.y, f.t, pal, P); },
  3: (ctx, f, pal, P) => { const p = farProp(SLOT_U(0))(f); mcmLaunchPad(ctx, p.x, p.y, f.t, rocketClock(f.t), pal, P); },
};
export const OBJECT_STYLES = Object.freeze([
  { id: 'shipped', tag: '0', name: 'SHIPPED — PAPER' },
  { id: 'sunset', tag: 'A', name: 'MCM SUNSET', paint: MCM_SUNSET.paint },
  { id: 'midday', tag: 'B', name: 'MCM MIDDAY', paint: MCM_MIDDAY.paint },
]);
const styleOf = (id) => OBJECT_STYLES.find((s) => s.id === id);

let pack = null;
let speed = null;
function shippedPack() {
  if (!pack) {
    pack = getStylePack('faux3d', { paperPreset: 'cardstockClear' });
    speed = CABINETS.find((cab) => cab.id === 'speed');
  }
  return pack;
}

// The whole picture for one view in one style: backdrop, then the shipped road.
function drawScene(ctx, t, obj, view, styleId) {
  const p = shippedPack();
  const camX = view.camX(t);
  const f = speedFrame(camX, t);
  ctx.save();
  if (styleId === 'shipped') {
    const scene = { stageIndex: obj.stage, progress: camX / SPEED_STAGE_LEN };
    if (obj.override) ctx.__mashDesertHorizonOverride = obj.override(t);
    try {
      p.bg(ctx, t, camX, speed, SPEED_STAGE_LEN, scene, 0, scene);
    } finally {
      delete ctx.__mashDesertHorizonOverride;
    }
    obj.shipped?.(ctx, t, f);
  } else {
    // plan.js composes speed-1, whose slot-0 cap holds the wind pump; a speed-2 or
    // speed-3 card stands that stage's own opener there, as the shipped pack does.
    const hooks = { ...(view.mcm || obj.mcm) };
    const opener = obj.stage === 1 || obj.farItems === false ? null : STAGE_OPENER[obj.stage];
    if (opener) {
      const own = hooks.far;
      hooks.far = (c, fr, pal, P) => { opener(c, fr, pal, P); own?.(c, fr, pal, P); };
    }
    styleOf(styleId).paint(ctx, f, { hooks, farItems: obj.stage === 1 && obj.farItems !== false });
  }
  ctx.restore();
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  p.ground(ctx, camX, speed, [], [], t * 60, VIEW_W);
  ctx.restore();
  return f;
}

// One panel: clip to the rect, frame the view's focus at `zoom`, draw the picture.
function panel(ctx, t, obj, view, styleId, [px, py, pw, ph], zoom) {
  const f = speedFrame(view.camX(t), t);
  const c = view.focus(f, styleId, t);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(px, py, pw, ph);
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-c.x, -c.y);
  drawScene(ctx, t, obj, view, styleId);
  ctx.restore();
}

function gutters(ctx, W, H, cols, rows) {
  ctx.fillStyle = '#10101a';
  for (let i = 1; i < cols; i++) ctx.fillRect((W * i) / cols - 1, 0, 2, H);
  for (let j = 1; j < rows; j++) ctx.fillRect(0, (H * j) / rows - 1, W, 2);
}

// The close card: one style, the object framed at obj.zoom (several views side by side).
export function drawSpeedObjectClose(ctx, t, obj, styleId, W = 480, H = 270) {
  const n = obj.views.length;
  obj.views.forEach((view, i) => panel(ctx, t, obj, view, styleId, [(W * i) / n, 0, W / n, H], obj.zoom));
  if (n > 1) gutters(ctx, W, H, n, 1);
}

// The game-scale card: all three styles cropped at 1x — side by side for one view, one
// row per style for several.
export function drawSpeedObjectGameScale(ctx, t, obj, W = 480, H = 270) {
  const n = obj.views.length;
  const styles = OBJECT_STYLES.map((s) => s.id);
  if (n === 1) {
    styles.forEach((s, i) => panel(ctx, t, obj, obj.views[0], s, [(W * i) / 3, 0, W / 3, H], 1));
    gutters(ctx, W, H, 3, 1);
  } else {
    styles.forEach((s, r) => obj.views.forEach((view, i) => panel(ctx, t, obj, view, s, [(W * i) / n, (H * r) / 3, W / n, H / 3], 1)));
    gutters(ctx, W, H, n, 3);
  }
}
