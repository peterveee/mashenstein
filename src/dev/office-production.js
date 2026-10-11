// Production gallery uses the actual pack and world transform, including portrait.
import { getActiveFrame, defaultFrame, frameForViewport } from '../engine/frame.js';
import { setPresentationFrame } from '../engine/renderer.js';
import { GROUND_Y, applyWorld, worldYForScreenY } from '../engine/camera.js';
import { officePack } from '../engine/stylePacks/officeLigne.js';
import { officeLandmarks } from '../engine/stylePacks/officeLigne/progression.js';
import { setOfficeRoomStyle } from '../engine/stylePacks/officeLigne/rooms.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';
// Hazards are cached per screen object, not per floor: two sections can show the same floor
// with different hazards (or none), and a floor-keyed cache handed every caller the first one's.
const packs = new Map(), hazards = new WeakMap();
export const OFFICE_PORTRAIT_FRAME = frameForViewport({ mode: 'phone-portrait', viewportWidth: 393, viewportHeight: 852 });
export function drawOfficeProductionScene(ctx, t, screen, portrait = false, at = null) {
  const previous = getActiveFrame();
  const frame = portrait ? OFFICE_PORTRAIT_FRAME : defaultFrame();
  setPresentationFrame(frame);
  try {
    const stageIndex = ['lobby', 'open', 'exec'].indexOf(screen.floor) + 1;
    const key = `${stageIndex}:${portrait}`;
    if (!packs.has(key)) packs.set(key, officePack({ stageIndex, gallery: true }));
    if (!hazards.has(screen)) hazards.set(screen, screen.hazards.map(h => makeObstacle(h.type, PLAYER_X + h.dx)));
    const pack = packs.get(key), cab = CABINET_BY_ID.office;
    // Tour the entire finite floor, including its one destination near the end.
    const tourDistance = 26208;
    const camX = at ?? ((t % 90) + 90) % 90 / 90 * tourDistance;
    const zoom = portrait ? 2.2 : 2, xOffset = portrait ? -74 : 0;
    const frameShift = frame.groundScreenY - GROUND_Y;
    ctx.save();
    ctx.translate(0, frameShift);
    ctx.translate(xOffset, 0);
    pack.bg(ctx, t, camX, cab, tourDistance, null, 0, { portrait, stageIndex, frameShiftY: frameShift,
      worldZoom: zoom, worldPan: 0, worldFloorY: GROUND_Y, worldXOffset: xOffset,
      backgroundXOffset: xOffset, backgroundZoom: 1 });
    ctx.restore();
    ctx.save();
    applyWorld(ctx, zoom, 0, GROUND_Y, xOffset);
    pack.ground(ctx, camX, cab, [], [], t, (480 - xOffset) / zoom, null, null,
      worldYForScreenY(frame.height, zoom, 0, GROUND_Y) + 8);
    for (const e of hazards.get(screen)) drawWorldEntity(ctx, e, camX, t, pack, {});
    // Optional extra world-space art (a bake-off's candidate), drawn where hazards are.
    if (screen.world) screen.world(ctx, t, camX);
    drawToon(ctx, 'lorenzo', { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
    ctx.restore();
    pack.post(ctx);
  } finally { setPresentationFrame(previous); }
}

// One named room held in the middle of the view, painted in one of the room-depth styles.
export function drawOfficeRoomScene(ctx, t, { floor, kind, style, portrait = false }) {
  const tourDistance = 26208;
  const l = officeLandmarks(floor, 0, tourDistance).find((p) => p.kind === kind);
  const camX = l.worldX - (240 - 112) / l.rate;
  const was = setOfficeRoomStyle(style);
  try { drawOfficeProductionScene(ctx, t, { floor, hazards: [] }, portrait, camX); }
  finally { setOfficeRoomStyle(was); }
}
