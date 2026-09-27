// PLUMBER PANIC — a piglet with the brown sheepdog, bake-off (Peter, 27 Sep 2026: "do a bake
// off where we have a pig along with the brown sheepdog in the plumbers panic level... the
// pig is a little baby pig in the style of the pig in the movie Babe. give me several
// options").
//
// SETTLED 27 Sep 2026: "lets ship B" — B is the figure-of-eight flock in the game now
// (plumberLandmarks.js, THE SHEEP-PIG), and its cards draw drawPlumberSheep itself. 0 is
// the flock as it was before, the collie working.
//
// The brown dog is the figure-of-eight flock (variant 1 of drawPlumberSheep). Every card
// draws that flock exactly as it ships — its sheep, its red-and-white collie, its run and
// the flock's answer to it, all through PLUMBER_FLOCK_KIT — and adds one piglet. The piglet
// is the same in every option: a Large White like Babe, pale pink, big pricked ears that tip
// forward, a snub snout with a flat disc, a curly tail, in the backdrop's cut paper. What
// changes is what he does:
//   A  trails the collie round her figure of eight, and sits when she stops;
//   B  the sheep-pig: he works the flock (the sheep answer HIM) while she sits up on the
//      crest and watches him, turning to keep him in view;
//   C  sits on the crest in the gap and watches her, hopping round to keep her in view;
//   D  runs at her side and drops flat when she does, copying her crouch;
//   E  thinks he is a sheep: roots in the grass inside the right-hand knot and is moved on
//      with the rest of them.
// Nothing turns to camera, and every turn round is a mirror at the top of a hop.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack, ridgeYAt } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { PLUMBER_FLOCK_KIT as K, plumberFlockState, drawPlumberSheep } from '../engine/stylePacks/plumberLandmarks.js';

const { withFinish } = K;
const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };

export const PIG_FLOCK_CANDIDATES = [
  { id: 'ships', label: '0 — what shipped before: the collie working, no pig' },
  { id: 'follow', label: 'A — trails her round the figure of eight' },
  { id: 'sheeppig', label: 'B — SHIPS: the sheep-pig works the flock, she sits up and watches' },
  { id: 'watch', label: 'C — sits on the crest and watches her work' },
  { id: 'alongside', label: 'D — runs at her side and copies her crouch' },
  { id: 'flock', label: 'E — thinks he is a sheep' },
];

// ------------------------------------------------------------ the piglet
// The piglet and the sat-up collie are the game's own now (B shipped), so every option
// draws them through the kit.
const { drawPiglet, drawSeatedCollie, PIG_S, PIG_STRIDE, PIG_HOP } = K;
export { drawPiglet };

// ------------------------------------------------------------ what he does
const D8 = K.FLOCK_DOGS[1];             // the brown collie's figure of eight
const DOG_OFFSET = 3.7;                 // plumberFlockState's clock offset for variant 1
const dogNow = (t) => K.dogAt(t + DOG_OFFSET, D8);
const alongOf = (d) => (d.run / TAU) * K.DOG_STRIDE;   // total ground px the collie has run
const RUN_LEN = D8.run.length;
const wrapSigned = (v) => { const m = ((v % RUN_LEN) + RUN_LEN) % RUN_LEN; return m > RUN_LEN / 2 ? m - RUN_LEN : m; };
const APEXES = [K.EIGHT.arcAt(0), K.EIGHT.arcAt(Math.PI)];
const sgn = (v) => (v < 0 ? -1 : 1);

// A: GAP ground px behind her on her own path, so he stops where she stopped a moment ago
// and sits there till she goes. He turns at the loop ends where she did: a hop over the
// apex, mirrored at the top.
const GAP = 17, HOPW = 6;
function trailing(t) {
  const d = dogNow(t);
  const u = alongOf(d) - GAP;
  const pos = D8.run.at(D8.start + u);
  let face = sgn(pos.head), lift = 0;
  for (const apex of APEXES) {
    const dd = wrapSigned(D8.start + u - apex);
    if (Math.abs(dd) < HOPW) {
      lift = Math.sin((Math.PI * (dd + HOPW)) / (2 * HOPW)) * PIG_HOP;
      face = sgn(D8.run.at(apex + (dd < 0 ? -HOPW : HOPW)).head);
    }
  }
  const moving = smooth(d.speed / 12);
  return { x: pos.x, depth: pos.depth, face, lift, run: (u / PIG_STRIDE) * TAU, gait: moving * (1 - clamp01(lift)),
    sit: smooth(1 - d.speed / (0.6 * D8.v)) * (1 - clamp01(lift)) };
}

// C: sat on the crest in the gap, always facing her side. When she crosses over he hops
// round (the mirror at the top of the hop), and he gets up when she comes close.
const WATCH = { x: -5, depth: 1.2 };
function watcher(t) {
  const { face, lift } = K.turnToward(t + DOG_OFFSET, D8, WATCH.x, PIG_HOP);
  const d = dogNow(t - 0.2);
  const near = smooth(1 - Math.hypot(d.x - WATCH.x, (d.depth - WATCH.depth) * K.DOG_M) / 34);
  return { x: WATCH.x, depth: WATCH.depth, face, lift, run: 0, gait: 0,
    sit: (1 - near) * (1 - clamp01(lift)), perk: near };
}

// D: at her side — a step behind and nearer the viewer — on her pace, hopping round with
// her, and dropping flat on his belly when she drops into her crouch.
function alongside(t) {
  const d = dogNow(t);
  const crouch = smooth(1 - d.speed / (0.75 * D8.v)) * (1 - 0.55 * d.hop);
  return { x: d.x - d.face * 2.5, depth: d.depth + 4.5, face: d.face, lift: d.hop * PIG_HOP,
    run: (alongOf(d) / PIG_STRIDE) * TAU, gait: smooth(d.speed / 12) * (1 - d.hop), lie: crouch, perk: crouch };
}

// E: one of the right-hand knot, facing the gap — rooting in the grass on his own clock,
// head up when she comes, and shoved on by her like the sheep round him (the flock's own
// answer, the same sums with the same weights).
const MEMBER = { x: 20, depth: 12, dir: -1, seed: 21 };
function member(t) {
  const td = t + DOG_OFFSET;
  const push = (tt) => {
    let px = 0, pz = 0, seen = 0;
    for (let j = 0; j < K.REACT_N; j++) {
      const q = K.dogAt(tt - K.REACT_FROM - j * K.REACT_DT, D8);
      const dx = MEMBER.x - q.x, dz = (MEMBER.depth - q.depth) * K.DOG_M;
      const dist = Math.max(0.5, Math.hypot(dx, dz));
      const f = (K.SHOVE * smooth(1 - dist / K.SHOVE_R)) / dist;
      px += K.SHOVE_W[j] * f * dx; pz += (K.SHOVE_W[j] * f * dz) / K.DOG_M;
      seen += K.ALERT_W[j] * smooth(1 - dist / K.ALERT_R);
    }
    return { px, pz, seen };
  };
  const a = push(td), b = push(td - K.REACT_DT);
  const pace = Math.hypot(a.px - b.px, (a.pz - b.pz) * K.DOG_M) / K.REACT_DT;
  const alert = smooth(a.seen * K.ALERT_GAIN);
  const rooting = smooth((Math.sin(t * 0.7 + 1.3) + 0.2) * 1.8);
  return { x: MEMBER.x + a.px, depth: K.floorDepth(MEMBER.depth + a.pz), order: MEMBER.depth, face: MEMBER.dir,
    run: ((a.px * MEMBER.dir + a.pz * K.DOG_M) / PIG_STRIDE) * TAU, gait: smooth(pace / 5),
    root: rooting * (1 - alert), perk: alert };
}

const BEHAVIOUR = { follow: trailing, watch: watcher, alongside, flock: member };

// ------------------------------------------------------------ the flock, plus him
// drawPlumberSheep's own drawing, variant 1, with the piglet filed into the depth queue.
export function drawPigFlock(ctx, t, x, seat, id) {
  if (id === 'sheeppig') { drawPlumberSheep(ctx, t, x, { near: seat }, true, 1); return; }
  ctx.save();
  withFinish(true, () => {
    const { dog, sheep } = plumberFlockState(t, 1);
    const items = sheep.map((q) => {
      const sx = x + q.x;
      return { order: q.order, draw: () => K.drawSheep(ctx, sx, seat(sx) + q.depth, q.s, q.dir, q.pose, q.graze, q.sw, 0, t, q.seed, q.whiteFace, q.hop) };
    });
    const coat = K.COLLIE_COATS[1];
    const collieS = K.FLOCK_S * 1.05;
    const dx = x + dog.x;
    items.push({ order: dog.depth, draw: () => K.drawCollie(ctx, dx, seat(dx) + dog.depth, collieS, dog.face, dog.run, dog.crouch, dog.lift, coat) });
    const behave = BEHAVIOUR[id];
    if (behave) {
      const p = behave(t);
      const px = x + p.x;
      items.push({ order: p.order ?? p.depth, draw: () => drawPiglet(ctx, px, seat(px) + p.depth, PIG_S, p.face, { ...p, t, seed: 3 }) });
    }
    items.sort((a, b) => a.order - b.order);
    for (const it of items) it.draw();
  });
  ctx.restore();
}

// ------------------------------------------------------------ the gallery's frame
// Plumber-1, the camera held (the hero runs on the spot) at a place with no flock of its
// own, the brown collie's flock on the near summit nearest mid-picture. The near ridge is
// read the way src/dev/plumber-ideas.js reads it.
const CAM = 2600;
const LIFT = -34;
const nearY = (x) => ridgeYAt(x, CAM, GROUND_Y, 34, 50, 0.35) + LIFT;
let anchor = null;
function flockAnchor() {
  if (anchor == null) {
    let best = 240, by = Infinity;
    for (let x = 170; x <= 310; x += 0.5) { const y = nearY(x); if (y < by) { by = y; best = x; } }
    anchor = best;
  }
  return anchor;
}
function heroPose(t) {
  return { kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1 };
}
export function drawPigFlockScene(ctx, t, id, { hero = true } = {}) {
  const cab = CABINETS.find((c) => c.id === 'plumber');
  const pack = getStylePack(cab.style, {});
  pack.bg(ctx, t, CAM, cab, Infinity, null);
  drawPigFlock(ctx, t, flockAnchor(), nearY, id);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, CAM, cab, [], [], t * 60, VIEW_W);
  if (hero) drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}
// The same frame `zoom` times over, on the flock.
export function drawPigFlockCloseUp(ctx, t, id, { zoom = 2.6, w = 480, h = 270 } = {}) {
  const ax = flockAnchor(), ay = nearY(ax) + 2;
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-(ax - w / (2 * zoom)), -(ay - h / (2 * zoom)));
  drawPigFlockScene(ctx, t, id, { hero: false });
  ctx.restore();
}

// The piglet alone, big: every pose the options use, on the plumber sky and grass.
const LINEUP = [
  ['trot', (t) => ({ run: t * 9, gait: 1 })],
  ['stand', () => ({})],
  ['ask (B)', (t) => ({ nod: 1, perk: 1 })],
  ['sit (A, C)', () => ({ sit: 1 })],
  ['flat (D)', () => ({ lie: 1, perk: 1 })],
  ['root (E)', () => ({ root: 1 })],
  ['hop round', (t) => { const k = (t % 1.6) / 0.5; return { lift: k < 1 ? Math.sin(Math.PI * k) * 5 : 0 }; }],
];
export function drawPigletLineup(ctx, t, w = 480, h = 270) {
  const floor = h - 46;
  ctx.fillStyle = '#a8e0f8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3a9c48';
  ctx.fillRect(0, floor, w, h - floor);
  const step = w / LINEUP.length, S = 5.2;
  withFinish(true, () => {
    LINEUP.forEach(([name, pose], i) => {
      const cx = step * (i + 0.5) - 2;
      // The hop round mirrors at the top of each hop, so it lands facing back.
      const turns = Math.floor(t / 1.6) + ((t % 1.6) >= 0.25 ? 1 : 0);
      const face = name === 'hop round' && turns % 2 ? -1 : 1;
      drawPiglet(ctx, cx, floor, S, face, { t, seed: i, ...pose(t) });
      ctx.save();
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(name, cx, floor + 24);
      ctx.restore();
    });
  });
}
