// The run camera. Game code draws the world in the SAME coordinates it always
// has — horizontal offsets from camX, absolute world y — and this module is the
// single transform that magnifies that output into the 480x270 logical frame.
// Nothing here knows about entities, physics or hitboxes; it only decides how
// much of the world the frame shows and where the groundline lands.
//
// Two properties do all the work:
//
//   - The view's LEFT EDGE stays welded to camX at every zoom. Every existing
//     `x - camX` fill, loop bound and cull therefore stays correct, and no strip
//     of missing ground can ever open up on the left.
//   - The groundline is PINNED to screen y GROUND_Y at every zoom (see camYFor).
//     So the parallax packs — which anchor their hills to that same line in
//     screen space — keep lining up exactly as authored, and the dolly below can
//     change zoom mid-jump without the horizon sliding.
import { W, H } from './renderer.js';

// The world y the hero runs along. Owned here rather than in run.js because the
// camera is defined against it; run.js re-exports it for its own importers.
export const GROUND_Y = 232;

// Resting magnification. 2.25 is not a taste number: the hero is drawn a fixed
// 64 world px right of camX, and 64 / (480 / 2.25) = 30.0% of the frame — the
// runner anchor that keeps the road ahead maximally visible — so the framing
// falls out of the zoom and PLAYER_X never has to move.
export const ZOOM = 2.25;
// How far the dolly is allowed to pull back for a tall jump. 1.3 clears a caped
// double jump (~139px + the hero's own 24px of height) against GROUND_Y.
export const ZOOM_MIN = 1.3;
// The world the frame shows at rest: 213.3 x 120.
export const VIEW_W = W / ZOOM;
export const VIEW_H = H / ZOOM;

// Headroom the dolly keeps above the hero's crown before it starts pulling back.
const HEAD_MARGIN = 10;
// Drawn hero height (draw.js HERO_DRAW_H). Duplicated rather than imported so
// the engine layer does not reach up into game code for one number.
const HERO_HEIGHT = 24;

// The world y at the top of the frame. Solving z * (GROUND_Y - camY) = GROUND_Y
// is what pins the groundline to its own screen y for EVERY z — which is why a
// mid-jump zoom change reads as the frame opening up rather than as a pan.
export function camYFor(z) { return GROUND_Y - GROUND_Y / z; }

// Screen y of a world y at zoom z. For the handful of things that draw in screen
// space but have to sit on a world object (the blackout mission's light radius).
export function screenYFor(worldY, z) { return (worldY - camYFor(z)) * z; }

// The transform itself. Draw world content between save/restore around this.
export function applyWorld(ctx, z) {
  ctx.scale(z, z);
  ctx.translate(0, -camYFor(z));
}

// Zoom that fits a hero `y` px above the ground, with their art and a margin.
// `groundLift` is how far the terrain has carried their feet above GROUND_Y —
// on rolling ground that is up to 18px of headroom the frame also owes them.
export function zoomFor(y, groundLift = 0) {
  const need = y + HERO_HEIGHT + HEAD_MARGIN + groundLift;
  return Math.min(ZOOM, Math.max(ZOOM_MIN, GROUND_Y / Math.max(1, need)));
}

// Ease the live zoom toward a target. Pulls back fast so a jump is never clipped
// waiting for the frame, settles back slowly so the return is not a snap.
export function easeZoom(current, target, dt) {
  const k = target < current ? 12 : 4;
  return current + (target - current) * (1 - Math.exp(-k * dt));
}
