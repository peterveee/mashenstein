// Production gallery uses the actual pack and world transform, including portrait.
import { getActiveFrame, defaultFrame, frameForViewport } from '../engine/frame.js';
import { setPresentationFrame } from '../engine/renderer.js';
import { GROUND_Y, applyWorld, worldYForScreenY } from '../engine/camera.js';
import { officePack } from '../engine/stylePacks/officeLigne.js';
import { officeLandmarks } from '../engine/stylePacks/officeLigne/progression.js';
import { setOfficeFont, letters, PAL } from '../engine/stylePacks/officeLigne/line.js';
import { poster } from '../engine/stylePacks/officeLigne/wall.js';
import { setOfficeRoomStyle, wallWhiteboard } from '../engine/stylePacks/officeLigne/rooms.js';
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
    // Tour the entire finite floor, including its one destination near the end (`screen.tour`: a
    // floor of another length, as at another ASSIST SPEED).
    const tourDistance = screen.tour ?? 26208;
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

// One sample board per face: the office's own painters, drawn in a swapped OFFICE_FONT.
export function drawOfficeFontSample(ctx, stack) {
  const was = setOfficeFont(stack);
  try {
    const P = PAL.open, PX = PAL.exec;
    ctx.fillStyle = '#dcd5e8'; ctx.fillRect(0, 0, 480, 150);
    poster(ctx, { x: 8, y: 8, w: 56, h: 74, label: 'TEAMWORK' }, P);
    poster(ctx, { x: 72, y: 8, w: 56, h: 74, label: 'SUCCESS' }, P);
    poster(ctx, { x: 136, y: 8, w: 56, h: 80, label: 'HANG IN THERE', bg: '#a9e3d6', sub: 'UNTIL Q4' }, P);
    wallWhiteboard(ctx, 204, 8, 150, 80, P, { title: 'AGENDA', detail: ['1. PLAN THE NEXT', 'MEETING'] });
    wallWhiteboard(ctx, 364, 8, 108, 80, PX, { title: 'HR REVIEW', detail: ['WHERE DO YOU SEE', 'YOURSELF IN 5 YEARS?'] });
    ctx.fillStyle = '#23212f'; ctx.fillRect(8, 98, 170, 16);
    letters(ctx, 'EXECUTIVE SUITE', 93, 110, 6.4, { ink: '#f7ead0', lw: 0.7, weight: 600, align: 'center', track: 0.4 });
    ctx.fillStyle = '#302c40'; ctx.fillRect(188, 98, 150, 16);
    letters(ctx, 'COFFEE SHOP', 263, 110, 6.4, { ink: '#f6e9d3', lw: 0.75, weight: 600, align: 'center' });
    ctx.fillStyle = '#f6df4a'; ctx.fillRect(348, 98, 124, 16);
    letters(ctx, 'EGGCORP: TOO BIG TO FRY', 410, 109.5, 5, { ink: '#2c2540', lw: 0.8, weight: 700, align: 'center', track: 0.2 });
    letters(ctx, 'RADIO WRECK   PIZZA HURT   BLOCKBUSTED   0123456789', 240, 134, 7, { ink: '#2a2433', lw: 0.8, weight: 700, align: 'center', track: 0.3 });
  } finally { setOfficeFont(was); }
}
