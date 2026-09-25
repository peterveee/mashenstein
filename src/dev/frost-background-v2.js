// FROST BACKGROUND V2 — background animations for the frost levels, round two (Peter,
// 25 Sep 2026: "can you generate more background animations for the frost levels? polar
// bear maybe? Not thrilled with the stuff we have... maybe an igloo in the background?",
// then: "i like the idea of the 3 wolves but the preview isnt great... closer to the
// coyote in the speed level ... the log cabin in the paper style and embedded onto the
// top of a hill ... call it FROST Backgound V2 also add an embedded igloo").
//
// Gallery-only: nothing here is wired into the run. Unlike round one (src/dev/
// frost-ideas.js, painted over the finished backdrop at a guessed screen y), every idea
// here reaches the REAL frost backdrop through the pack's `frostLandmarkStudy` seam
// (stylePacks/index.js), in the slot the chair lift and the reindeer herd use: it is
// handed the ridge's own crest, colour, light and scenery, so it stands ON a hill, is
// buried by the near hills and passes behind the ridge's rocks exactly as a shipped
// landmark would. Buildings sit in a summit clear of the ridge's own scenery, cut off at
// the snow line with a drift of the ridge's own paper piled against the foot.
//
// The finish is Frost's cut paper: flat pieces, no ink line, each over a hazy paper
// shadow a hair down and back, every colour pulled toward the stage's light (day, low
// sun, dusk) — only emitted light (a window, a lamp) keeps its warmth at dusk.
//
// An idea is { id, name, note, depth: 'far'|'near', when?: 'on'|'behind', stage,
// hold (0..1 of the view where it sits at the held camera), summit?, clear?, reach,
// focusUp, zoom, factor?, paint(ctx, f) }. `f` is the pack's frame plus x (the
// anchor's screen x), clock (seconds since it came into view, so a gag always plays
// while it is on screen; wall time when held), held and tone(hex).
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import {
  drawFrostWolves as paintWolves, drawFrostCabin as paintCabin, drawFrostIgloo as paintIgloo,
  drawFrostPolarBears as paintPolarBears, drawFrostFox as paintFox, drawFrostDogSled as paintDogSled,
  frostWildlifeToner as toner,
} from '../engine/stylePacks/frostWildlife.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';

// SHIPPED 25 Sep 2026: the painters moved into stylePacks/frostWildlife.js, which places
// them in the three stages (FROST_WILDLIFE). This file keeps the bake-off's table and scene.
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// ================================================================ the table
export const FROST_BG_V2 = [
  {
    id: 'wolves', name: 'THREE WOLVES — a chorus on the ledge', depth: 'near', stage: 2, hold: 0.62,
    summit: true, clear: 40, reach: 60, focusUp: 22, zoom: 3.4, paint: paintWolves,
    note: 'Round one\'s three wolves, redone the way the Speed Zone coyote is built: seated on an ice-capped '
      + 'ledge in a summit of the near hills, a lit rim along the back, dark saddle, ruff, cream chest and cheeks, '
      + 'amber eyes. Every 7 s the leader throws its head back and howls and the other two join one after the '
      + 'other, song rings drifting off each muzzle; between howls they look about, flick an ear, twitch a tail.',
  },
  {
    id: 'cabin', name: 'LOG CABIN — in paper, in a summit', depth: 'near', stage: 3, hold: 0.4,
    summit: true, clear: 44, reach: 60, focusUp: 16, zoom: 3.4, paint: paintCabin,
    note: 'Round one\'s cabin cut from Frost\'s paper and set into the top of a near hill: the gable end square '
      + 'to us, the long wall going back in shade, log ends at the corners, a slab of snow on the roof with icicles '
      + 'along the eaves, a stone chimney smoking downwind and a woodpile. The windows and the door lamp are lit — '
      + 'shown at dusk, where they are the warmest thing on the hill. Cut off at the snow line with a drift of the '
      + 'hill\'s own paper against its foot.',
  },
  {
    id: 'igloo', name: 'IGLOO — in paper, in a summit, with a husky', depth: 'near', stage: 3, hold: 0.62,
    summit: true, clear: 32, reach: 50, focusUp: 12, zoom: 3.6, paint: paintIgloo,
    note: 'A dome of cut snow blocks in the crown of a near hill, the far side in shade, the entrance tunnel toward '
      + 'us with the warm light of the room in its doorway, steam from the vent. A husky sits by the door — the '
      + 'wolves\' own figure in husky colours with its tail curled over its back — looking about, and now and then '
      + 'answering something with a short howl. Shown at dusk.',
  },
  {
    id: 'bears', name: 'POLAR BEAR AND CUB — along the crest', depth: 'near', stage: 1, hold: 0.55,
    summit: true, clear: 50, reach: 90, focusUp: 8, zoom: 3.4, paint: paintPolarBears,
    note: 'A polar bear and her cub ambling along the near crest, walking with the run but slowly, so they drift '
      + 'back past the hero; they pass behind the ridge\'s rocks. High rump, long low neck, Roman nose, small round '
      + 'ears, heavy legs in a four-beat walk; warm cream against the blue paper, the far legs in shade.',
  },
  {
    id: 'fox', name: 'SUGGESTION · ARCTIC FOX — mousing dive', depth: 'near', stage: 1, hold: 0.5,
    summit: true, clear: 40, reach: 60, focusUp: 8, zoom: 4, paint: paintFox,
    note: 'A fox trots in along the crest, stops, cocks its head at something under the snow, leaps high and dives '
      + 'nose-first into the drift — tail wagging out of the hole — then backs out with a shake. Every 5 s, timed '
      + 'from when it comes into view so the gag plays while it is on screen. The blue-morph arctic fox (dark slate '
      + 'in winter), because a white one vanishes on the snow.',
  },
  {
    id: 'sled', name: 'SUGGESTION · DOG SLED — a husky team along the crest', depth: 'near', stage: 2, hold: 0.62,
    summit: true, clear: 60, reach: 130, focusUp: 10, focusDx: -48, zoom: 2.4, paint: paintDogSled,
    note: 'Three pairs of huskies at a gallop on the gangline hauling a sled with a load under a red tarp, the '
      + 'musher on the runners in a fur-hooded parka, scarf streaming, snow kicked off the runners. Runs with the '
      + 'hero, slower than the camera, and passes behind the ridge\'s rocks.',
  },
];

// ================================================================ the scene
const CAM0 = 8600;             // the held camera: open ridge, no chair lift, no herd
const RUN = 201.6;             // world px/s: frost's 18144 px in 90 s
const TD = 10000;
const anchors = new Map();     // idea id -> its held-screen anchor { x, y }

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}
// Where the idea stands at the held camera, in held-screen x: at `hold` of the view, or
// on the nearest summit to it whose crown is clear of the ridge's own scenery.
function resolveAnchor(idea, fr, shift) {
  const want = fr.view.left + fr.view.width * (idea.hold ?? 0.5);
  if (!idea.summit) return { x: want, y: fr.crest(want + shift) };
  // Snowbanks are low drifts and may share a summit; rocks, pines and fortresses may not.
  const spans = fr.scenery().filter((p) => p.kind !== 'snowbank').map((p) => {
    const s = p.surface && p.surface.length > 1 ? [p.x + p.surface[0].dx, p.x + p.surface[p.surface.length - 1].dx] : [p.x - 8, p.x + 8];
    return [s[0] - shift, s[1] - shift];
  });
  const clear = idea.clear ?? 30;
  let best = null;
  for (let x = want - 50; x <= want + 50; x += 1) {
    const y = fr.crest(x + shift);
    if (!(y <= fr.crest(x + shift - 3) && y <= fr.crest(x + shift + 3))) continue;
    if (spans.some(([a, b]) => b > x - clear && a < x + clear)) continue;
    const score = Math.abs(x - want);
    if (!best || score < best.score) best = { x, y, score };
  }
  return best ? { x: best.x, y: best.y } : null;
}
// `cam` is the idea's held camera. With `probe`, only the anchor is sought (and may
// come back null: no clear summit near `hold` at this camera).
function study(idea, held, cam, probe = null) {
  return (ctx, fr) => {
    if (fr.depth !== idea.depth || fr.when !== (idea.when || 'on')) return;
    const k = (idea.factor ?? fr.factor) * ZOOM;
    const shift = (cam - fr.camX) * k;
    if (probe) { Object.assign(probe, { anchor: resolveAnchor(idea, fr, shift), k, view: fr.view, color: fr.color }); return; }
    const a = anchors.get(idea.id);
    if (!a) return;
    const x = a.x + shift;
    const reach = idea.reach ?? 80;
    if (x < fr.view.left - reach || x > fr.view.left + fr.view.width + reach) return;
    // Seconds since it came in at the right edge — a gag plays while it is on screen.
    const clock = held ? fr.t : Math.max(0, (fr.view.left + fr.view.width + reach - x) / (k * RUN));
    const f = { ...fr, x, clock, held, tone: toner(fr) };
    ctx.save();
    idea.paint(ctx, f);
    ctx.restore();
  };
}

const frost = () => CABINETS.find((c) => c.id === 'frost');
let scratch = null;
// The held camera and the anchor, found once per idea from throwaway frames: the camera
// steps along from CAM0 until a clear summit sits near `hold` of the view.
function ensureAnchor(idea) {
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = 480; scratch.height = 270; }
  const g = scratch.getContext('2d');
  const cab = frost();
  const pack = getStylePack(cab.style, {});
  for (let j = 0; j < 80; j++) {
    const cam = CAM0 + j * 29;
    const info = {};
    const bc = { stageIndex: idea.stage ?? 1, progress: 0.35, frostLandmarkStudy: study(idea, true, cam, info) };
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 480, 270);
    pack.bg(g, 0, cam, cab, TD, bc, 0, bc);
    // The foreground hills are laid after the ridges and move at their own rate: at the
    // held camera the summit's foot must be in the open, not behind one of them.
    if (info.anchor && idea.summit && !footInOpen(g, info)) continue;
    if (info.anchor) { anchors.set(idea.id, info.anchor); return { ...info, cam }; }
  }
  throw new Error(`no clear summit for ${idea.id}`);
}
function footInOpen(g, info) {
  const want = rgb(info.color);
  for (const dx of [-18, 0, 18]) {
    const x = Math.round(info.anchor.x + dx), y = Math.round(info.anchor.y + 4);
    if (x < 0 || x >= 480 || y < 0 || y >= 270) return false;
    const d = g.getImageData(x, y, 1, 1).data;
    if (Math.abs(d[0] - want[0]) + Math.abs(d[1] - want[1]) + Math.abs(d[2] - want[2]) > 40) return false;
  }
  return true;
}
const crossings = new Map();
function crossing(idea) {
  let c = crossings.get(idea.id);
  if (!c) {
    const info = ensureAnchor(idea);
    const reach = idea.reach ?? 80;
    const { anchor, k, view } = info;
    // The camera span over which the idea crosses the picture, right edge to left.
    const start = info.cam - (view.left + view.width + reach - anchor.x) / k;
    const end = info.cam + (anchor.x - (view.left - reach)) / k;
    c = { cam: info.cam, start, end, anchor, focusY: anchor.y - (idea.focusUp ?? 10) };
    crossings.set(idea.id, c);
  }
  return c;
}

/**
 * The frost scene with `idea` in it. held: the camera stands still (the reindeer
 * bake-off's move) so the animation can be watched; otherwise the camera runs at the
 * real lane speed, looping over the idea's crossing, which shows how long it is
 * actually on screen.
 */
export function drawFrostV2Scene(ctx, t, idea, { held = false, weather = true, hero = true } = {}) {
  const cab = frost();
  const pack = getStylePack(cab.style, {});
  let camX = CAM0;
  const c = idea ? crossing(idea) : null;
  // Running, the loop starts with the idea a third of the way in, so its first frame
  // has it on screen.
  if (c) camX = held ? c.cam : c.start + ((t * RUN + (c.end - c.start) * 0.3) % (c.end - c.start));
  // The blizzard held light (frost-2 and -3 run it heavy), so the idea can be judged.
  const bc = {
    stageIndex: idea?.stage ?? 1, progress: 0.35, blizzard: idea?.blizzard ?? 0.3,
    frostLandmarkStudy: c ? study(idea, held, c.cam) : undefined,
  };
  pack.bg(ctx, t, camX, cab, TD, bc, 0, bc);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  if (hero) drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (weather && pack.weather) pack.weather(ctx, t);
}
// The held scene, `idea.zoom` times over, centred on the idea.
export function drawFrostV2CloseUp(ctx, t, idea, w, h) {
  const c = crossing(idea);
  const Z = idea.zoom ?? 3;
  ctx.save();
  ctx.scale(Z, Z);
  ctx.translate(-(c.anchor.x + (idea.focusDx ?? 0) - w / (2 * Z)), -(c.focusY - h / (2 * Z)));
  drawFrostV2Scene(ctx, t, idea, { held: true, weather: false, hero: false });
  ctx.restore();
}
