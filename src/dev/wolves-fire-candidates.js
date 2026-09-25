// FROST 3 — the wolves round a fire, bake-off (Peter, 25 Sep 2026: "For the wolves around the
// fire looks like one is on fire.. can you redraw so perhaps the fire isn't infront of any of
// them. alternatialy what if they were around glowing coals instead? do a bakeoff please").
//
// SETTLED 25 Sep 2026: "F for the wolves" — F is stylePacks/frostWildlife.js paintWolvesFire
// now, and its cards draw that painter. A is what shipped before, kept here as a copy: the
// leader sat a step up the crown BEHIND the flames, so they climbed his chest. Every
// candidate is painted in the item's real place — its settled spot on the frost-3 ridge, its
// clock and its storm — through the pack's frostWildlifePaint seam, and draws the pack with
// the shipped kit (FROST_WOLF_KIT), so only the hearth and the seating differ.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { FROST_PAPER, FROST_WOLF_KIT, drawFrostWolvesFire } from '../engine/stylePacks/frostWildlife.js';

const { fill, stroke, circle, oval, mix, tonePal, glowGain, groundTop, clipAbove, mound, fract, clamp01, puff, smooth } = FROST_PAPER;
const { drawSeatedCanine, howlPose, songRings, tongue, halo, FIRE_WOLF, CAMPFIRE } = FROST_WOLF_KIT;

export const WOLVES_FIRE_CANDIDATES = [
  { id: 'was', label: 'A — what shipped before: the leader behind the flames', layout: 'ring', fire: 'flames' },
  { id: 'gap', label: 'B — the fire in the open: two wolves one side, one the other', layout: 'gap', fire: 'flames' },
  { id: 'coals', label: 'C — glowing coals, the pack as it sits now', layout: 'ring', fire: 'coals' },
  { id: 'banked', label: 'D — a banked fire: coals and low flames under the leader', layout: 'ring', fire: 'banked' },
  { id: 'gap-coals', label: 'E — B\'s seating round C\'s coals', layout: 'gap', fire: 'coals' },
  // Peter, 25 Sep 2026: "should we have proper smoke from the fire? I like option b".
  { id: 'gap-smoke', label: 'F — SHIPS: B with a smoke plume', ships: true },
];

// Where the hearth was last drawn, in the canvas's own pixels: the close-up's focus.
let lastHearth = null;
const noteHearth = (ctx, x, y) => {
  const p = ctx.getTransform().transformPoint(new DOMPoint(x, y));
  lastHearth = { x: p.x, y: p.y };
};

// The seats, in the shipped painter's units ([x, y, dir, scale, howl from, howl to, seed]).
// 'ring' is the shipped one: the leader a step up the crown behind the hearth, one either
// side facing in. 'gap' moves the leader to the left flank, a step up behind his partner,
// and the hearth right of centre, so nothing stands behind it.
const SEATS = {
  ring: { hearth: 0, back: [[1.5, -0.9, 1, 0.84, 0.5, 3.5, 0]],
    front: [[-18, 0, 1, 0.88, 1.1, 3.3, 2.1], [19.5, 0, -1, 0.86, 1.5, 3.4, 4.3]] },
  gap: { hearth: 5.5, back: [[-21.5, -0.9, 1, 0.84, 0.5, 3.5, 0]],
    front: [[-9.5, 0, 1, 0.88, 1.1, 3.3, 2.1], [21.5, 0, -1, 0.86, 1.5, 3.4, 4.3]] },
};

// The hearth at the origin: the shipped stone ring, then crossed logs and flames, or a bed
// of coals breathing on their own slow clocks (and, banked, a few low tongues over them).
const COALS = [[-2.7, -0.9, 1.05, 0.0], [-1.1, -1.5, 1.2, 1.7], [0.7, -1.2, 1.1, 3.1], [2.5, -0.9, 1.0, 4.4],
  [-0.2, -2.1, 0.9, 5.3], [1.7, -1.9, 0.8, 2.2], [-2, -1.8, 0.8, 0.9]];
function hearth(ctx, C, g, t, fire) {
  const hot = fire === 'flames' ? '#ffc070' : '#ff8a4a';
  for (const [sx, r] of [[-5, 1.3], [-2.6, 1.1], [0, 1.2], [2.6, 1.1], [5, 1.3]]) {
    fill(ctx, C.stone, oval(sx, -0.2, r * 1.2, r * 0.8));
    fill(ctx, mix(C.stoneLit, hot, 0.35 * g), oval(sx - 0.2, -0.6, r * 0.8, r * 0.35));
  }
  if (fire === 'flames') {
    stroke(ctx, C.log, 1.3, (c) => { c.moveTo(-4.2, -0.4); c.lineTo(3, -3); c.moveTo(4.2, -0.4); c.lineTo(-3, -3); });
    fill(ctx, C.logEnd, circle(-4.2, -0.4, 0.65)); fill(ctx, C.logEnd, circle(4.2, -0.4, 0.65));
    ctx.save();
    ctx.translate(0, -1.8);
    tongue(ctx, '#ff7a35', 3.2, 8 * (0.85 + 0.15 * Math.sin(t * 9.1)), 1.2 + Math.sin(t * 5) * 0.6);
    tongue(ctx, '#ffab45', 2.3, 6 * (0.8 + 0.2 * Math.sin(t * 12.7 + 1)), 0.8 + Math.sin(t * 6.3) * 0.5);
    tongue(ctx, '#ffe39a', 1.3, 3.6 * (0.8 + 0.2 * Math.sin(t * 15.3 + 2)), 0.3);
    ctx.restore();
    return;
  }
  // The heap: dark, and each coal glowing up and down on its own clock.
  fill(ctx, '#2e2220', oval(0, -0.9, 4.5, 1.6));
  for (const [x, y, r, ph] of COALS) {
    const p = 0.5 + 0.5 * Math.sin(t * (1.1 + ph * 0.23) + ph);
    fill(ctx, mix('#5e2016', '#ffb04a', clamp01(0.2 + 0.7 * p * g)), oval(x, y, r, r * 0.62));
  }
  fill(ctx, `rgba(255,226,150,${0.55 * g})`, oval(0.2, -1.5, 1.4, 0.45));
  if (fire === 'banked') {
    // Low tongues, never taller than the stones are wide: the leader's chest stays clear.
    ctx.save();
    ctx.translate(0, -1.6);
    tongue(ctx, '#ff7a35', 2.2, 3.2 * (0.85 + 0.15 * Math.sin(t * 8.3)), 0.6 + Math.sin(t * 4.7) * 0.4);
    tongue(ctx, '#ffc060', 1.2, 2 * (0.8 + 0.2 * Math.sin(t * 13.1 + 1)), 0.2);
    ctx.restore();
  }
}

function paintPack(ctx, f, { layout = 'ring', fire = 'flames', smoke = false } = {}) {
  const P = { ...tonePal(FIRE_WOLF, f.tone), furLit: FIRE_WOLF.furLit, eye: FIRE_WOLF.eye };
  const C = tonePal(CAMPFIRE, f.tone);
  const g = glowGain(f);
  const S = 1.45;
  const seat = SEATS[layout];
  const u = f.clock % 7;
  const x0 = f.x;
  const y0 = f.crest(x0) + 1.4;
  const flames = fire === 'flames';
  // Coals breathe slowly; flames flicker.
  const flick = flames ? 0.82 + 0.1 * Math.sin(f.t * 11.3) + 0.08 * Math.sin(f.t * 17.9)
    : 0.85 + 0.1 * Math.sin(f.t * 1.7) + 0.05 * Math.sin(f.t * 4.1);
  const top = groundTop(f, x0 - 30 * S, x0 + 30 * S, y0, 1.6, 14);
  const wolf = ([sx, sy, dir, s, a, b, seed]) => {
    const pose = howlPose(u, a, b, f.t, seed);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir * s, s);
    drawSeatedCanine(ctx, P, pose, f.t + seed);
    songRings(ctx, f.t + seed, pose.up, pose.song);
    ctx.restore();
  };
  ctx.save();
  clipAbove(ctx, x0 - 90, x0 + 90, top);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(S, S);
  seat.back.forEach(wolf);
  ctx.save();
  ctx.translate(seat.hearth, 0);
  hearth(ctx, C, g, f.t, fire);
  ctx.restore();
  seat.front.forEach(wolf);
  ctx.restore();
  ctx.restore();
  mound(ctx, f, x0 - 30 * S, x0 + 30 * S, top, 14);
  // The light over the pack and the snow: firelight wide and gold, coal-light low and red.
  const fx = x0 + seat.hearth * S, fy = y0 - (flames ? 5 : fire === 'banked' ? 2.6 : 1.6) * S;
  noteHearth(ctx, fx, y0 - 8 * S);
  if (flames) {
    halo(ctx, fx, fy, 34 * S, 0.42 * g * flick);
    halo(ctx, fx, fy, 8 * S, 0.5 * g * flick, [255, 230, 170]);
  } else {
    halo(ctx, fx, fy, (fire === 'banked' ? 26 : 22) * S, 0.36 * g * flick, [255, 132, 70]);
    halo(ctx, fx, fy, 5 * S, 0.5 * g * flick, [255, 190, 110]);
  }
  const pr = (flames ? 26 : 20) * S;
  const pool = ctx.createRadialGradient(fx, y0, 0, fx, y0, pr);
  pool.addColorStop(0, flames ? `rgba(255,200,120,${0.35 * g * flick})` : `rgba(255,140,80,${0.32 * g * flick})`);
  pool.addColorStop(1, 'rgba(255,170,100,0)');
  fill(ctx, pool, oval(fx, y0 + 1, pr, 4 * S));
  // SMOKE: the fire's own column, not a wisp — it stands straight up off the flames, then
  // the wind takes it and it leans off downwind, swelling and thinning, the colour of the
  // beacon tower's smoke. It rises clear of the right-hand wolf before it bends over him.
  if (smoke) {
    for (let i = 0; i < 8; i++) {
      const k = fract(f.t * 0.2 + i / 8);
      const sx = fx + (k * k * 30 + Math.sin(k * 6 + f.t * 0.8 + i) * 1.6) * S;
      const sy = fy - (4 + k * 26) * S;
      puff(ctx, sx, sy, (1.3 + k * 4.6) * S, 0.55 * (1 - k) * smooth(0, 0.1, k), '#cdc9d6');
    }
  }
  // Sparks off downwind: a stream off flames, a few lazy ones off coals.
  const n = flames ? 8 : fire === 'banked' ? 4 : 3;
  const rate = flames ? 0.75 : 0.32;
  for (let i = 0; i < n; i++) {
    const k = fract(f.t * rate + i / n);
    const sx = fx + (k * (flames ? 20 : 11) + Math.sin(k * 9 + i * 2) * 2.5) * S;
    const sy = fy - (1 + k * (flames ? 20 : 13) - k * k * 5) * S;
    fill(ctx, `rgba(255,${(flames ? 200 : 150) + ((i * 37) % 50)},${flames ? 120 : 90},${(1 - k) * 0.9})`, circle(sx, sy, 0.42 * S));
  }
}

// The one that ships is drawn by the game's own painter; the rest by paintPack.
const PAINTERS = {};
for (const c of WOLVES_FIRE_CANDIDATES) {
  PAINTERS[c.id] = c.ships
    ? (ctx, f) => { noteHearth(ctx, f.x + SEATS.gap.hearth * 1.45, f.crest(f.x) + 1.4 - 8 * 1.45); drawFrostWolvesFire(ctx, f); }
    : (ctx, f) => paintPack(ctx, f, c);
}

function heroPose(t) {
  return { kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1 };
}
// The gallery's own frame for the item: frost-3 at 21%, where the pack passes mid-picture.
const TD = 18144, CAM = 3816;
// frost-3's storm at that point, and the chorus playing (a run clock, not a held pose).
const bcFor = (id) => ({ stageIndex: 3, progress: CAM / TD, totalDist: TD, heroFrac: 0.5,
  frostWildlifePaint: { wolvesFire: PAINTERS[id] } });

export function drawWolvesFireScene(ctx, t, id, { weather = true, hero = true } = {}) {
  const cab = CABINETS.find((c) => c.id === 'frost');
  const pack = getStylePack(cab.style, {});
  const bc = bcFor(id);
  pack.bg(ctx, t, CAM, cab, TD, bc, 0, bc);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, CAM, cab, [], [], t * 60, VIEW_W);
  if (hero) drawToon(ctx, 'grumpos', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (weather && pack.weather) pack.weather(ctx, t);
}

// Close in on the hearth, `zoom` times, the snow left off so the seating reads. The focus is
// found once per candidate, from a plain 1:1 paint, and never moves (the spot is settled).
const focus = new Map();
function focusFor(id, t) {
  if (!focus.has(id)) {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 270;
    lastHearth = null;
    drawWolvesFireScene(c.getContext('2d'), t, id, { weather: false, hero: false });
    focus.set(id, lastHearth || { x: 240, y: 150 });
  }
  return focus.get(id);
}
export function drawWolvesFireCloseUp(ctx, t, id, { zoom = 3, w = 480, h = 270 } = {}) {
  const p = focusFor(id, t);
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-(p.x - w / (2 * zoom)), -(p.y - h / (2 * zoom)));
  drawWolvesFireScene(ctx, t, id, { weather: false, hero: false });
  ctx.restore();
}
