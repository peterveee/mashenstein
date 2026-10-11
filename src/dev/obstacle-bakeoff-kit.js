// Shared kit for the per-cabinet OBSTACLE bake-offs (12 Oct 2026, after the
// office sheet: "can you examine obstacles in other cabinets … and recommend new
// items or replacements that fit in more with their style").
//
// Every candidate on those sheets is { letter, id, name, slot, note, paint } and
// may carry `tall` (a proposed PROP_TALL) or `detailCrop`. `slot` names a box and
// an answer the lane already deals (SLOTS below), or is an inline slot object
// for a box no named slot covers. A painter fills its PAINTED ENVELOPE in world
// units — box x 4/3 x PROP_TALL x PROP_VISUAL_SCALE, the size drawWorldEntity
// draws a prop at — with the ground line at y = h, and quantises `t` to its own
// frame ring. Porting one into sprites/props.js is a 3/4 scale (props.js painters
// receive the box-x-tall size and the run stretches it by 4/3).
//
// The scenes here assemble a frame the way the countryside sheet always has: the
// cabinet's real style pack bg(), then ground() and the world through
// applyWorld() at the run's ZOOM, then post(). Not the run's full background
// contract (no crane, no portrait bands) — the lane, the scenery behind it and
// the hazard on it, which is the read these sheets exist to judge.
import { GROUND_Y, applyWorld } from '../engine/camera.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

export const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

// ------------------------------------------------------------------ the slots
// `tall` and `visual` are the shipped PROP_TALL / PROP_VISUAL_SCALE of the prop
// each slot is named after, so a candidate is judged at the size the run would
// paint the thing it replaces.
export const SLOTS = Object.freeze({
  stand: { box: [13, 12], tall: 1.55, name: 'STANDING', was: 'cactus — 13x12, jump, breakable' },
  big: { box: [17, 14], tall: 1.4, name: 'BIG STANDING', was: 'cactusBig — 17x14, jump, breakable' },
  stack: { box: [12, 11], tall: 1, name: 'STACKS', was: 'crate — 12x11, jump, stacks two high', stack: true },
  barrel: { box: [13, 13], tall: 1, name: 'ROLLS AT YOU (heavy)', was: 'barrel — 13x13, vx −40, heavy punt' },
  roll: { box: [12, 10], tall: 1, name: 'ROLLS AT YOU', was: 'chair — 12x10, jump, vx −34, punt' },
  cone: { box: [10, 13], tall: 1, name: 'KICKABLE', was: 'trafficCone — 10x13, jump, punt' },
  fire: { box: [13, 13], tall: 1.7, name: 'THE WARM ONE', was: 'fireBarrel — 13x13, jump, shootable' },
  campfire: { box: [14, 10], tall: 1.3, name: 'LOW FIRE', was: 'campfire — 14x10, jump, unbreakable' },
  brazier: { box: [12, 14], tall: 1.55, name: 'LIGHT SOURCE', was: 'brazier — 12x14, jump, shootable' },
  hurdle: { box: [16, 9], tall: 1, name: 'SHORT HURDLE', was: 'boomBarrier — 16x9, jump, armoured', splitFeet: true },
  floor: { box: [15, 7], tall: 1.75, name: 'IN THE FLOOR', was: 'popSpikes — 15x7 bedded plate, jump', bedded: true },
  saw: { box: [15, 8], tall: 1.45, name: 'IN THE FLOOR (blade)', was: 'floorSaw — 15x8 bedded, jump', bedded: true },
  trap: { box: [16, 8], tall: 1.35, name: 'IN THE FLOOR (trap)', was: 'bearTrap — 16x8 bedded, jump, disarmable', bedded: true },
  tomb: { box: [9, 6.5], tall: 1, name: 'LOW MARKER', was: 'tombstone — 9x6.5, jump, breakable' },
  target: { box: [12, 7], tall: 1, name: 'SHOOTS BACK', was: 'printer — 12x7, shoots, a mission target', target: true },
  high: { box: [12, 7], alt: 34, visual: 1.35, name: 'HIGH FLYER', was: 'buzzbird — 12x7 at alt 34, punishes the jump' },
  low: { box: [12, 7], alt: 13, artLift: 6, visual: 1.35, name: 'SLIDE UNDER', was: 'drone — 12x7 at alt 13, slide' },
  shooter: { box: [12, 7], alt: 44, visual: 1.35, name: 'SHOOTS FROM ABOVE', was: 'shooterDrone — 12x7 at alt 44, shoots' },
  skyTarget: { box: [12, 11], alt: 40, name: 'TARGET IN THE AIR', was: 'target — 12x11 at alt 40, shoot it', target: true },
  bar: { box: [10, 16], tall: 1, name: 'ON THE BEAT', was: 'beatBar — 10x16, jump, beat-synced' },
});

export const slotOf = (cand) => (typeof cand.slot === 'string' ? SLOTS[cand.slot] : cand.slot);

// The painted envelope: drawWorldEntity's box x 4/3, x PROP_TALL (bottom-
// anchored), x PROP_VISUAL_SCALE. A candidate may propose its own `tall`.
export function slotEnvelope(cand) {
  const s = slotOf(cand);
  const [bw, bh] = s.box;
  const tall = cand.tall ?? s.tall ?? 1;
  const vis = s.visual ?? 1;
  return { bw, bh, tall, w: Math.round(bw * 4 / 3 * vis), h: Math.round(bh * 4 / 3 * tall * vis) };
}

export function candidateCaption(cand) {
  const slot = slotOf(cand);
  const env = slotEnvelope(cand);
  return `${slot.name} · in place of ${slot.was} · art ${env.w}x${env.h}u over a ${env.bw}x${env.bh} box<br>${cand.note}`;
}

// One candidate at its world position: contact shadow and red tick as the run
// draws them for a ground hazard (none for bedded, two feet for an open hurdle),
// then the art in its envelope, clipped to it as the prop raster would be.
// Bedded plates sink BED_SINK (2u) and the road cuts them at the ground line.
export function placeCandidate(ctx, cand, boxX, t, n = 1) {
  const slot = slotOf(cand);
  const env = slotEnvelope(cand);
  const alt = slot.alt || 0;
  if (!alt && !slot.bedded && !slot.target) {
    if (slot.splitFeet) {
      for (const px of [boxX + 2, boxX + env.bw - 2]) drawSoftContactShadow(ctx, px, GROUND_Y - 1, 3.5, 2.4, { alpha: 0.34 });
      ctx.fillStyle = 'rgba(224,72,72,0.32)';
      ctx.fillRect(boxX, GROUND_Y - 1, 4, 1);
      ctx.fillRect(boxX + env.bw - 4, GROUND_Y - 1, 4, 1);
    } else {
      drawSoftContactShadow(ctx, boxX + env.bw / 2, GROUND_Y - 1, Math.max(5, env.bw * 0.68), 2.4, { alpha: 0.34 });
      ctx.fillStyle = 'rgba(224,72,72,0.32)';
      ctx.fillRect(boxX, GROUND_Y - 1, env.bw, 1);
    }
  } else if (!alt && slot.target) {
    drawSoftContactShadow(ctx, boxX + env.bw / 2, GROUND_Y - 1, Math.max(5, env.bw * 0.68), 2.4, { alpha: 0.34 });
  }
  const bob = alt ? Math.round(Math.sin(t * 3 + 1.3) * 2) : 0;
  const bottom = GROUND_Y - alt - (slot.artLift || 0) + bob + (slot.bedded ? 2 : 0);
  const step = Math.round(env.bh * 4 / 3) - 2;
  for (let i = 0; i < n; i++) {
    ctx.save();
    if (slot.bedded) {
      ctx.beginPath();
      ctx.rect(boxX - 20, GROUND_Y - 200, env.bw + 40, 200);
      ctx.clip();
    }
    ctx.translate(boxX - Math.floor((env.w - env.bw) / 2), bottom - env.h - i * step);
    ctx.beginPath();
    ctx.rect(0, 0, env.w, env.h);
    ctx.clip();
    cand.paint(ctx, env.w, env.h, t);
    ctx.restore();
  }
}

// ------------------------------------------------------------- the lane scene
// One strip of a real frame of the cabinet: its own style pack, the hero for
// scale, and `world(ctx, t)` drawn where hazards are (world units, screen-
// relative x — the hero runs at PLAYER_X). The room scrolls; hero and hazard
// hold still. `strip` may name a stageIndex and extra backgroundContext facts
// (a mood, a time of day) for cabinets whose stages look different.
const packs = new Map();
function packFor(cab, strip) {
  const key = `${cab.id}:${strip.stageIndex ?? 1}`;
  if (!packs.has(key)) packs.set(key, getStylePack(cab.style, { stageIndex: strip.stageIndex ?? 1, ...(strip.settings || {}) }));
  return packs.get(key);
}

export const LANE_CROP = Object.freeze({ top: 100, h: 148, gap: 2 });
const SCROLL = 110;
const TOTAL = 6000;

export function laneHeight(strips) {
  return strips.length * LANE_CROP.h + (strips.length - 1) * LANE_CROP.gap;
}

export function drawCabinetLane(ctx, t, cabId, strips, world, { hero = 'lorenzo', labels = null } = {}) {
  const cab = CABINET_BY_ID[cabId];
  const { top, h, gap } = LANE_CROP;
  strips.forEach((strip, i) => {
    const pack = packFor(cab, strip);
    const y0 = i * (h + gap);
    const camX = (strip.camX ?? 600) + ((t * SCROLL) % 3000);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, 480, h);
    ctx.clip();
    ctx.translate(0, y0 - top);
    ctx.fillStyle = cab.sky?.[0] || '#000';
    ctx.fillRect(0, 0, 480, 270);
    const bc = { stageIndex: strip.stageIndex ?? 1, progress: camX / TOTAL, ...(strip.bc || {}) };
    pack.bg?.(ctx, t, camX, cab, TOTAL, null, 0, bc);
    ctx.save();
    applyWorld(ctx, 2, 0);
    pack.ground?.(ctx, camX, cab, [], [], t);
    world(ctx, t, camX);
    if (hero) drawToon(ctx, hero, { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
    ctx.restore();
    pack.post?.(ctx, t);
    ctx.restore();
    // Labels in frame space along the bottom of the strip: [text, world x].
    if (labels) {
      ctx.save();
      ctx.font = '700 8px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      for (const [text, wx] of labels) {
        const x = wx * 2;
        const y = y0 + h - 4;
        ctx.fillStyle = 'rgba(16,14,22,0.78)';
        ctx.fillRect(x - 6, y - 8, 12, 10);
        ctx.fillStyle = '#f6d33c';
        ctx.fillText(text, x, y);
      }
      ctx.restore();
    }
    if (strip.label) {
      ctx.save();
      ctx.font = '600 7px ui-monospace, Menlo, monospace';
      ctx.fillStyle = 'rgba(16,14,22,0.72)';
      ctx.fillRect(4, y0 + 4, ctx.measureText(strip.label).width + 6, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(strip.label, 7, y0 + 11.5);
      ctx.restore();
    }
  });
}

export const CAND_X = 122; // box left in world units from the frame's left edge
const STACK_X = 170;

export function drawCandidateLane(ctx, t, cabId, strips, cand) {
  const stacks = slotOf(cand).stack;
  drawCabinetLane(ctx, t, cabId, strips, (c, tt) => {
    placeCandidate(c, cand, CAND_X, tt, 1);
    if (stacks) placeCandidate(c, cand, STACK_X, tt, 2);
  });
}

// ------------------------------------------------------------- the line-ups
// The two sets side by side for comparison (Peter, 12 Oct: "all the new
// obstacles laid out side by side like the existing ones beneath the existing
// ones"): one column each, evenly across the frame, no hero, fliers at their
// own altitude in their own column. Both line-ups use the same spacing, so the
// NOW row and the candidates' row read as two sets of the same size.
const LINEUP_LEFT = 4, LINEUP_RIGHT = 236;
const columnCenters = (n) => {
  const w = (LINEUP_RIGHT - LINEUP_LEFT) / Math.max(n, 9);
  const left = (LINEUP_LEFT + LINEUP_RIGHT) / 2 - (w * n) / 2;
  return Array.from({ length: n }, (_, i) => left + w * (i + 0.5));
};

const lineups = new Map();
export function drawControlLineup(ctx, t, cabId, strips, control) {
  const types = [...new Set(control.map(([type]) => type))];
  const key = `${cabId}:${types.join(',')}`;
  if (!lineups.has(key)) {
    const xs = columnCenters(types.length);
    lineups.set(key, types.map((type, i) => makeObstacle(type, xs[i] - (makeObstacle(type, 0).w / 2))));
  }
  const settings = { cryptEnemyArt: cabId === 'crypt' };
  drawCabinetLane(ctx, t, cabId, strips, (c, tt) => {
    for (const e of lineups.get(key)) drawWorldEntity(c, e, 0, tt, null, settings);
  }, { hero: null });
}

export function drawCandidateLineup(ctx, t, cabId, strips, candidates) {
  const xs = columnCenters(candidates.length);
  drawCabinetLane(ctx, t, cabId, strips, (c, tt) => {
    candidates.forEach((cand, i) => placeCandidate(c, cand, xs[i] - slotEnvelope(cand).bw / 2, tt, 1));
  }, { hero: null, labels: candidates.map((cand, i) => [cand.letter, xs[i]]) });
}

// --------------------------------------------------------------- the detail
// The drawing enlarged on swatches of the cabinet's ground, hitbox dashed.
// `swatches` is [{ sky, ground, under, ink }] — one panel each.
export const DETAIL = Object.freeze({ panelW: 100, h: 128 });
export function drawCandidateDetail(ctx, t, cand, swatches) {
  const env = slotEnvelope(cand);
  const slot = slotOf(cand);
  const PW = DETAIL.panelW, PH = DETAIL.h, GY = PH - 18;
  const lift = slot.alt ? 4 : 0;
  // A tall envelope that is mostly overdraw (chains, a halo) is judged on its
  // bottom `detailCrop` units, the part that can hit you.
  const viewH = cand.detailCrop || env.h;
  const z = Math.min(3.4, (GY - 8 - lift) / viewH, (PW - 14) / env.w);
  swatches.forEach((s, i) => {
    ctx.save();
    ctx.translate(i * PW, 0);
    ctx.beginPath();
    ctx.rect(0, 0, PW, PH);
    ctx.clip();
    ctx.fillStyle = s.sky;
    ctx.fillRect(0, 0, PW, GY);
    ctx.fillStyle = s.ground;
    ctx.fillRect(0, GY, PW, 4);
    ctx.fillStyle = s.under || s.ground;
    ctx.fillRect(0, GY + 4, PW, PH - GY - 4);
    ctx.translate(PW / 2 - (env.w * z) / 2, GY - lift - env.h * z);
    ctx.scale(z, z);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, env.w, env.h);
    ctx.clip();
    cand.paint(ctx, env.w, env.h, t);
    ctx.restore();
    // The hitbox — what can hurt you. Everything outside it is overdraw.
    ctx.strokeStyle = s.ink || 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.9 / z;
    ctx.setLineDash([3 / z, 3 / z]);
    ctx.strokeRect((env.w - env.bw) / 2, env.h - env.bh, env.bw, env.bh);
    ctx.setLineDash([]);
    ctx.restore();
  });
}
