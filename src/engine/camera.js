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
//   - The groundline is PINNED to screen y GROUND_Y + pan at every zoom (see
//     camYFor). So the parallax packs — which anchor their hills to that same
//     line in screen space — keep lining up exactly as authored provided they
//     take the same `pan`, and the dolly below can change zoom mid-jump without
//     the horizon sliding.
import { W, H } from './renderer.js';

// The world y the hero runs along. Owned here rather than in run.js because the
// camera is defined against it; run.js re-exports it for its own importers.
export const GROUND_Y = 232;

// Resting magnification. The hero is drawn a fixed PLAYER_X world px right of
// camX, so where they sit in the frame falls out of this number: 56 / (480 / 2)
// = 23.3%, against the 30% a 2.25 zoom and the old 64px anchor gave. Both moves
// buy runway — the frame is 240 world px wide now rather than 213.
//
// It is also what decides how much of the dolly's work the crane can do. The
// frame holds GROUND_Y / ZOOM world px above the groundline — 116 here against
// 103 at 2.25 — and the 13 extra, plus the apron the crane spends, are between
// them enough that an ordinary double jump now fits with NO pull-back at all.
// `let`, not `const`, and deliberately so: setRestingZoom below rewrites it and
// the two view dimensions together, and every module that imports them sees the
// new values through ESM's live bindings without a single call site changing.
// The alternative — turning them into functions — would have touched eighteen
// call sites to say exactly the same thing.
export let ZOOM = 2;
// How far the dolly is allowed to pull back for a tall jump. Against
// GROUND_Y + PAN_MAX it clears 173px of hero altitude, which covers everything
// short of a mochi carrying both the cape and the triple mod.
export const ZOOM_MIN = 1.3;
// How far the dolly may CRANE UP — shift the whole frame down in screen px —
// before it starts pulling back instead. A crane leaves the world's scale
// alone, and a scale change mid-jump is the thing that reads as disconcerting,
// so the crane is spent first and the zoom only covers what is left.
//
// The budget is not a taste number either: it is exactly the ground apron, the
// H - GROUND_Y px of dirt drawn BELOW the groundline. At full crane the
// groundline lands on the bottom edge and never leaves the frame — you can
// always see what you are about to land on — and the apron, which is the only
// thing that was ever down there, is what pays for it.
export const PAN_MAX = H - GROUND_Y;
// The world the frame shows at rest: 240 x 135 at ZOOM 2, 300 x 168.75 at 1.6.
export let VIEW_W = W / ZOOM;
export let VIEW_H = H / ZOOM;

// Change the resting magnification, and everything derived from it with it.
//
// This exists because those derived numbers are not decoration: VIEW_W decides
// how far ahead the game considers "on screen", which sets when an enemy may
// fire, where the finish tape is planted, and how wide a scatter reaches. Left
// at the shipped 2 while the camera pulled back to 1.6, the frame grew but none
// of those did — the tape stayed 168 world px from the camera and simply landed
// further from the right edge than it was ever tuned to, which is the extra
// space past the flagpole. Anything reading VIEW_W has to move when the zoom
// does or it is quietly answering a question about a frame that no longer
// exists.
//
// Callers that cache their own value derived from these — run.js's finish line
// is the one — must recompute after calling this, which is why it is a single
// choke point rather than three assignments spread about.
export function setRestingZoom(z) {
  ZOOM = z;
  VIEW_W = W / z;
  VIEW_H = H / z;
}

// Headroom the dolly keeps above the hero's crown before it starts pulling back.
const HEAD_MARGIN = 10;
// Drawn hero height (draw.js HERO_DRAW_H). Duplicated rather than imported so
// the engine layer does not reach up into game code for one number.
const HERO_HEIGHT = 24;

// The world y at the top of the frame at pan 0. Solving z * (floorY - camY)
// = GROUND_Y is what pins the ANCHOR LINE to screen y GROUND_Y for EVERY z —
// which is why a mid-jump zoom change reads as the frame opening up rather than
// as a pan. `pan` then slides that whole pinned frame down bodily.
//
// `floorY` is which world line gets that treatment, and it defaults to the one
// the game has always used. It exists for raised and sunken ROADS: a road that
// climbs 200px into the sky cannot be framed by craning and zooming out — the
// crane runs out after 38px and the zoom would shrink the whole game to fit a
// hero who is simply standing somewhere else. Re-pinning instead keeps the hero
// exactly where he always sits in the frame and moves the WORLD past him, which
// is what climbing is supposed to look like. run.js eases this value, so on the
// base ground it is GROUND_Y to the pixel and every existing framing is
// byte-identical.
export function camYFor(z, floorY = GROUND_Y) { return floorY - GROUND_Y / z; }

// Screen y of a world y at zoom z. For the handful of things that draw in screen
// space but have to sit on a world object (the blackout mission's light radius).
export function screenYFor(worldY, z, pan = 0, floorY = GROUND_Y) {
  return (worldY - camYFor(z, floorY)) * z + pan;
}

// The transform itself. Draw world content between save/restore around this.
// Anything drawing in SCREEN space that has to stay welded to the world — the
// style packs' backgrounds — takes the same `pan` as a plain translate.
export function applyWorld(ctx, z, pan = 0, floorY = GROUND_Y) {
  ctx.translate(0, pan);
  ctx.scale(z, z);
  ctx.translate(0, -camYFor(z, floorY));
}

// How far a re-pinned anchor has carried the frame, in SCREEN px. Positive when
// the hero is above the groundline. The backgrounds are authored against
// GROUND_Y in screen space, so this is the distance they have to travel to stay
// welded to a world that has slid underneath them.
export function anchorShift(z, floorY) { return (GROUND_Y - floorY) * z; }

// How much of that shift the backgrounds actually take.
//
// Not all of it, and that is the whole point of the number. The scenery back
// there is FAR AWAY: hills a mile off barely move when you climb a hundred feet,
// and taking the shift at 1 slides the horizon clean out of the frame the
// instant the road leaves the ground. At 0.42 the range sinks convincingly while
// the sky it sits in stays where the sky belongs — which is the same reasoning
// the horizontal parallax factors already encode, applied to the axis that never
// needed one until a road went up.
export const BG_FOLLOW = 0.42;

// Ease the anchor toward the floor the hero is standing on.
//
// Deliberately ASYMMETRIC, and much more so than the zoom's. Climbing wants to
// be felt — the anchor lagging behind a rising hero is what shows him gaining
// height rather than the world simply being redrawn around him — so a rise is
// slow. A fall is the opposite: a hero who steps off a 200px road is travelling
// at terminal velocity within half a second, and an anchor that eases down
// politely leaves him below the bottom edge of the frame while he does it.
export function easeFloor(current, target, dt) {
  const k = target < current ? 4.5 : 14;
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

// The framing a hero `y` px above the ground needs: how far to crane, and what
// zoom is left over. `groundLift` is how far the terrain has carried their feet
// above GROUND_Y — on rolling ground that is up to 18px of headroom the frame
// also owes them.
//
// The frame's headroom above the groundline is (GROUND_Y + pan) / z world px,
// so the crane and the zoom trade against each other inside ONE equation and
// the split is a policy choice, not a constraint. The policy: spend the crane
// first, to the last pixel of PAN_MAX, and only take out of the zoom what the
// crane could not buy. A single jump has always fitted (57px against 103px of
// headroom) and still costs nothing, and at ZOOM 2 the crane alone now covers
// Gnash's 89px and an ordinary double jump's 98px too — both used to pull back
// 16% and 22%. Only the cape/triple heights, which outrun the apron several
// times over, still open the frame up the way every jump above 79px used to.
export function framingFor(y, groundLift = 0) {
  const need = Math.max(1, y + HERO_HEIGHT + HEAD_MARGIN + groundLift);
  const pan = Math.max(0, Math.min(PAN_MAX, need * ZOOM - GROUND_Y));
  return { pan, zoom: Math.min(ZOOM, Math.max(ZOOM_MIN, (GROUND_Y + pan) / need)) };
}

// How much hero ALTITUDE the resting frame can hold, in world px, with the
// crane fully spent and the zoom untouched.
//
// This is the number that decides when re-pinning is worth doing at all. Below
// it the existing camera copes — a hero on a stack of platforms is framed by
// craning, exactly as a hero mid-jump always was, and the groundline he came
// from stays on screen where he can see it. Above it the crane and the zoom are
// being asked to hold a line the player has left and has no further use for.
//
// Live, not a constant: ZOOM moves with the device and the settings, and a
// phone frame genuinely holds less than a desktop one, so it re-pins sooner.
export function restingHeadroom() {
  return (GROUND_Y + PAN_MAX) / ZOOM - HERO_HEIGHT - HEAD_MARGIN;
}

// Ease the live zoom toward a target. Pulls back fast so a jump is never clipped
// waiting for the frame, settles back slowly so the return is not a snap.
export function easeZoom(current, target, dt) {
  const k = target < current ? 12 : 4;
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

// Same shape for the crane, but the return is quicker than the zoom's. A zoom
// that lingers is a frame still slightly open; a crane that lingers is a
// groundline still off its mark under a hero who has already landed, which
// reads as the floor floating back up to meet them.
export function easePan(current, target, dt) {
  const k = target > current ? 12 : 7;
  return current + (target - current) * (1 - Math.exp(-k * dt));
}
