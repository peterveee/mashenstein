// Broad, deterministic foreground hills for selected cabinets. Heights stay
// modest so obstacle spacing and jump timing remain familiar.
import { W } from '../engine/renderer.js';

const PROFILES = {
  plumber:   { amp: 16, period: 430, phase: 0 },
  speed:     { amp: 10, period: 560, phase: 120 },
  frost:     { amp: 14, period: 500, phase: 250 },
  cardboard: { amp: 18, period: 460, phase: 80 },
  office:    { amp: 9, period: 620, phase: 310 },
};

export function terrainHeight(cabinet, worldX) {
  const p = cabinet && PROFILES[cabinet.id];
  if (!p) return 0;
  const wave = (Math.sin(((worldX + p.phase) / p.period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const rounded = wave * wave * (3 - 2 * wave);
  const intro = Math.min(1, Math.max(0, worldX / 280));
  return p.amp * rounded * intro;
}

export function terrainGroundY(cabinet, worldX, baseY = 232) {
  return baseY - terrainHeight(cabinet, worldX);
}

// `viewW` is the world width actually on screen this frame. It runs inside the
// zoomed world transform, so W here was never the visible width — at the
// resting 1.6 the frame shows 300 units and this walked 480, painting a third
// of its columns past the right edge; on a phone at 2.2 it showed 218 and still
// walked 480. Callers that have no camera to ask (tutorial, hub) keep W.
/**
 * How thick a floating island's slab is drawn.
 *
 * A CONSTANT, not the island's height above the ground — and that distinction is
 * the whole difference between an island and a step. Filling the full rise puts
 * the slab's underside flush on the ground, and the two greens merge into one
 * mass that reads as a plateau you have climbed onto. Six pixels leaves daylight
 * under it, which is what says "this thing is in the air".
 *
 * The gap it leaves is load-bearing too: at the 29px ceiling islands are capped
 * at, six pixels of slab leaves 23px of clearance against a 14px standing
 * hitbox (PLAYER_H), so the lane really does run underneath — a hero who does
 * not jump passes below the island rather than being blocked by it.
 */
export const ISLAND_THICKNESS = 6;

/**
 * Floating islands: flat slabs hanging over the lane.
 *
 * Drawn with the cabinet's own ground colours rather than a palette of their
 * own, because a slab is a piece of the floor that happens to be up in the air —
 * a differently-coloured one reads as a prop you can pass through, which is
 * exactly the wrong thing to tell the player about a surface they can stand on.
 *
 * The underside gets the dark fill and a lit top edge, the same two-tone the
 * ground line uses, so the side you can land on is the side that is lit.
 */
export function drawIslands(ctx, camX, cabinet, islands, viewW = W) {
  const right = Math.min(W, Math.ceil(viewW) + 2);
  for (const is of islands) {
    const sx = is.x - camX;
    if (sx > right || sx + is.w < 0) continue;
    ctx.fillStyle = cabinet.groundDark;
    ctx.fillRect(sx, is.topY, is.w, ISLAND_THICKNESS);
    ctx.strokeStyle = cabinet.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, is.topY);
    ctx.lineTo(sx + is.w, is.topY);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

export function drawTerrain(ctx, camX, cabinet, obstacles, baseY = 232, viewW = W) {
  if (!PROFILES[cabinet && cabinet.id]) return;
  // Overscan one step so the line's last segment still leaves the frame rather
  // than stopping visibly short of it.
  const right = Math.min(W, Math.ceil(viewW) + 2);
  // Gaps used to be re-filtered into a new array every frame, and the closure
  // below was invoked once per column per pass — 482 calls a frame against a
  // list that is almost always empty. Narrowed to the columns being drawn and
  // hoisted out of the loop.
  const gaps = [];
  for (const ob of obstacles || []) {
    if (!ob.live || !ob.def || !ob.def.isGap) continue;
    if (ob.x + ob.w < camX || ob.x > camX + right) continue;
    gaps.push(ob);
  }
  const inGap = (worldX) => {
    for (let i = 0; i < gaps.length; i++) {
      const g = gaps[i];
      if (worldX >= g.x && worldX <= g.x + g.w) return true;
    }
    return false;
  };

  ctx.fillStyle = cabinet.groundDark;
  for (let x = 0; x <= right; x += 2) {
    const worldX = camX + x;
    if (gaps.length && inGap(worldX)) continue;
    const y = terrainGroundY(cabinet, worldX, baseY);
    ctx.fillRect(x, y, 3, baseY - y + 4);
  }

  ctx.strokeStyle = cabinet.ground;
  ctx.lineWidth = 2;
  ctx.beginPath();
  let drawing = false;
  for (let x = 0; x <= right; x += 2) {
    const worldX = camX + x;
    if (gaps.length && inGap(worldX)) { drawing = false; continue; }
    const y = terrainGroundY(cabinet, worldX, baseY);
    if (!drawing) { ctx.moveTo(x, y); drawing = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
}
