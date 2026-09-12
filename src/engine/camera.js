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
import { getActiveFrame } from './frame.js';
import { PORTRAIT_GROUND_ANCHOR_RATIO } from './portrait-geometry.js';

// The legacy landscape anchor is 232. Portrait framing changes only the
// presentation anchor; terrain, hitboxes and every authored world coordinate
// continue to use GROUND_Y below.
const frameGroundY = () => getActiveFrame().groundScreenY;

// The world y the hero runs along. Owned here rather than in run.js because the
// camera is defined against it; run.js re-exports it for its own importers.
//
// IT CAME DOWN 224 -> 232, and what it spends is the APRON — the H - GROUND_Y
// band of dirt under the line, which is the only thing that was ever down
// there. The camera pins the groundline to this screen y at every zoom, so
// every pixel it comes down is a pixel of BACKDROP handed to every cabinet;
// the lcd city was being cropped at the knees. Three things bound the number,
// and between them they leave exactly one:
//
//   - The bottom-left HUD group. hud.js puts the power-up timer shelf's plate
//     top at SHELF_CY - 7 (y 237) with the ability nameplate under it, and a
//     road drawn up behind those is a road with the readouts sitting on it.
//   - MULTIPLES OF EIGHT ONLY. camYFor solves GROUND_Y / z for the frame's top
//     world y and the pull-back tier is 1.6, so anything else puts the whole
//     world on a quarter pixel and every 1px line in the game lands between two
//     of them. tests/routes.js is the guard. That leaves 232 or 240, and 240 is
//     drawn up behind the shelf.
//   - Every lcd scene height rises by the same 8, in the same change. A roof is
//     `GROUND_Y - h` and that panel pins a whole stack to its roofs, so moving
//     the line without the table slides the skyline down and breaks every
//     authored contact above it — see the note on LCD_CITY_SCENES.
//
// work/local/groundy-sweep.png is the 224/230/236/242 sweep it came out of.
// What it costs: a pit shows about four fewer world px of depth below the lane
// at the resting zoom, and craneFor() subtracts this, so PAN_MAX drops eight —
// off a budget only the tallest triple jump in the game ever reaches.
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
// The budget used to be exactly the ground apron, the H - GROUND_Y px of dirt
// drawn BELOW the groundline: at full crane the groundline landed on the bottom
// edge and never left the frame — you could always see what you were about to
// land on — and the apron, the only thing that was ever down there, was what
// paid for it. Tidy, and it bought 135px of hero altitude at the resting zoom.
// Every pixel past that came out of the ZOOM instead, so the tallest jumps in
// the game changed the scale of the world on the way up and changed it back on
// the way down.
//
// It is sized off the JUMP now. The highest anyone gets is 185px — Clara's
// jumpMult with two air jumps stacked on top, as the roster stood when the
// crane was sized — and holding that at
// the resting zoom takes (185 + HERO_HEIGHT + HEAD_MARGIN) * ZOOM - GROUND_Y
// of crane. So the crane covers everything anyone can actually jump and
// the zoom becomes a backstop ordinary play never reaches.
//
// What it costs is the old promise: past 135px of altitude the groundline now
// leaves the bottom of the frame, so at the top of a triple you cannot see what
// you are coming down onto. At that height it was a long way off anyway.
// Nothing moves for an ordinary jump either way — the crane does not start
// until 111px of altitude, which is past a double on most of the cast.
// Headroom the dolly keeps above the hero's crown before it starts pulling back.
const HEAD_MARGIN = 10;
// Drawn hero height (draw.js HERO_DRAW_H). Duplicated rather than imported so
// the engine layer does not reach up into game code for one number.
const HERO_HEIGHT = 24;
// The highest a hero ever gets: the roster's top jumpMult with two air jumps
// stacked on it (capsule plus cape). Was 168 — Lorenzo's 1.10 — until Clara's
// cliffhanger jump took the top slot at 1.15; her stack measured 184.0px.
// Everything above is arithmetic off this one number.
//
// THE ROSTER HAS SINCE COME DOWN AND THIS HAS NOT. Clara sits at 1.10 and
// jumpMult buys height rather than launch speed (player.js jumpV), so the same
// stack now measures 153px. Left at 185 deliberately: it is a CEILING, every
// framing number on this screen is arithmetic off it, and lowering it would
// re-tune the crane and the zoom backstop to buy back 32px of pan that nothing
// is asking for. What it costs is slack, which is the right thing for a
// backstop to have.
const MAX_HERO_ALT = 185;
// Enough crane to hold that at a given magnification, and not a pixel of zoom.
const craneFor = (z) => Math.ceil((MAX_HERO_ALT + HERO_HEIGHT + HEAD_MARGIN) * z - GROUND_Y);
export let PAN_MAX = craneFor(ZOOM);
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
  // The crane budget is a SCREEN distance and the thing it has to buy is a
  // WORLD one, so it moves with the magnification or the promise only holds on
  // the machine it was measured on. A phone frames closer, so the same 168px of
  // hero costs it more crane — which is the honest price of not zooming there
  // either, and it is only ever paid at the top of the tallest jump in the game.
  PAN_MAX = craneFor(z);
}


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
export function camYFor(z, floorY = GROUND_Y) { return floorY - frameGroundY() / z; }

// Screen y of a world y at zoom z. For the handful of things that draw in screen
// space but have to sit on a world object (the blackout mission's light radius).
export function screenYFor(worldY, z, pan = 0, floorY = GROUND_Y) {
  return (worldY - camYFor(z, floorY)) * z + pan;
}

// Inverse of screenYFor for callers that need to extend world geometry to a
// screen-space edge. The pan is part of the inverse: when the camera has
// moved the world up, a larger world y is required to reach the same lower
// screen edge.
export function worldYForScreenY(screenY, z, pan = 0, floorY = GROUND_Y) {
  return camYFor(z, floorY) + (screenY - pan) / z;
}

// The transform itself. Draw world content between save/restore around this.
// Anything drawing in SCREEN space that has to stay welded to the world — the
// style packs' backgrounds — takes the same `pan` as a plain translate.
export function applyWorld(ctx, z, pan = 0, floorY = GROUND_Y, xOffset = 0) {
  // `xOffset` is presentation-only. It is a logical screen-pixel translation
  // applied before the world scale, so a portrait character anchor can move
  // the rendered lane without changing camX, hitboxes, or authored world x.
  ctx.translate(xOffset, pan);
  ctx.scale(z, z);
  ctx.translate(0, -camYFor(z, floorY));
}

// World width visible after a presentation-only horizontal anchor shift. A
// negative shift moves the lane left and exposes more authored runway on the
// right, so the painters/cullers must cover that same amount. Positive shifts
// do not need extra work because they reveal less of the right edge.
export function portraitRenderViewWidth(zoom, xOffset = 0, width = W) {
  const z = Number(zoom);
  const base = Number.isFinite(z) && z > 0 ? width / z : width;
  const shift = Number.isFinite(Number(xOffset)) ? Math.min(0, Number(xOffset)) : 0;
  return base - shift;
}

/**
 * Find the fixed portrait pan that keeps a measured world span inside the
 * usable frame.  The portrait review camera deliberately does not zoom while
 * a run is moving: this helper only chooses a bodily vertical translation.
 *
 * `bounds` are world y coordinates (the visual top and bottom, not hitboxes).
 * `preferredPan` is a composition request, such as a desired lower starting
 * line; it is clamped to the measured fit interval.
 * Safe-area edges come from the active presentation frame, so a notch or home
 * indicator is treated as part of the framing contract.  When the span is too
 * large for the fixed zoom, the returned pan is its midpoint and `fits` is
 * false; callers can surface that as a level-authorship issue instead of
 * silently clipping one end.
 */
export function portraitPanForBounds(bounds, zoom, floorY = GROUND_Y, margin = 8, preferredPan = 0) {
  const b = bounds && typeof bounds === 'object' ? bounds : {};
  const top = Number(b.top);
  const bottom = Number(b.bottom);
  const z = Number(zoom);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(z) || z <= 0) {
    return Object.freeze({ pan: 0, fits: true, minPan: 0, maxPan: 0 });
  }
  const frame = getActiveFrame();
  const safe = frame?.safeRect || { top: 0, bottom: H };
  const inset = Number.isFinite(Number(margin)) ? Math.max(0, Number(margin)) : 0;
  const topEdge = safe.top + inset;
  const bottomEdge = safe.bottom - inset;
  const topScreen = screenYFor(top, z, 0, floorY);
  const bottomScreen = screenYFor(bottom, z, 0, floorY);
  const minPan = topEdge - topScreen;
  const maxPan = bottomEdge - bottomScreen;
  const fits = minPan <= maxPan;
  const preferred = Number.isFinite(Number(preferredPan)) ? Number(preferredPan) : 0;
  const pan = fits ? Math.max(minPan, Math.min(maxPan, preferred)) : (minPan + maxPan) / 2;
  return Object.freeze({ pan, fits, minPan, maxPan, topScreen, bottomScreen, topEdge, bottomEdge });
}

/**
 * Add a small edge correction to an existing portrait composition. Unlike
 * portraitPanForBounds(), this is deliberately local: it reacts to the drawn
 * subject reaching an edge, not to every authored floor in the level. The
 * The caller may provide an explicit gameplay band (for example, the space
 * between the centered portrait HUD and the action shelf). When it does, the
 * subject clears that band rather than merely clearing the physical frame;
 * the old safe-frame behavior remains the default for existing callers.
 */
export function portraitEdgePanForBounds(
  bounds, zoom, floorY = GROUND_Y, basePan = 0, topMargin = 8, bottomMargin = 0, maxDelta = 48,
  edges = null,
) {
  const b = bounds && typeof bounds === 'object' ? bounds : {};
  const top = Number(b.top);
  const bottom = Number(b.bottom);
  const z = Number(zoom);
  const base = Number.isFinite(Number(basePan)) ? Number(basePan) : 0;
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(z) || z <= 0) return base;
  const frame = getActiveFrame();
  const safe = frame?.safeRect || { top: 0 };
  const topInset = Number.isFinite(Number(topMargin)) ? Math.max(0, Number(topMargin)) : 0;
  const bottomInset = Number.isFinite(Number(bottomMargin)) ? Math.max(0, Number(bottomMargin)) : 0;
  const defaultTopEdge = (Number.isFinite(Number(safe.top)) ? Number(safe.top) : 0) + topInset;
  const frameHeight = Number.isFinite(Number(frame?.height)) ? Number(frame.height) : H;
  const defaultBottomEdge = Math.max(defaultTopEdge, frameHeight - bottomInset);
  // Callers that own a denser presentation (the portrait HUD and touch
  // controls) can reserve a smaller gameplay band than the physical frame.
  // Keep the old safe-frame behavior when no explicit band is supplied so
  // landscape and existing camera callers remain byte-for-byte compatible.
  const explicitTop = Number(edges?.top);
  const explicitBottom = Number(edges?.bottom);
  const topEdge = Number.isFinite(explicitTop) ? explicitTop : defaultTopEdge;
  const bottomEdge = Math.max(topEdge,
    Number.isFinite(explicitBottom) ? explicitBottom : defaultBottomEdge);
  const topScreen = screenYFor(top, z, base, floorY);
  const bottomScreen = screenYFor(bottom, z, base, floorY);
  let pan = base;
  if (topScreen < topEdge) pan += topEdge - topScreen;
  else if (bottomScreen > bottomEdge) pan += bottomEdge - bottomScreen;
  const limit = Number.isFinite(Number(maxDelta)) ? Math.max(0, Number(maxDelta)) : 48;
  return Math.max(base - limit, Math.min(base + limit, pan));
}

/**
 * Find the portrait pan that puts a route floor at a lower safe-frame target.
 *
 * This is deliberately independent of the authored level envelope. A lower
 * route can scroll into view as the hero reaches it; the caller may still
 * clamp the result against the envelope's upper edge so high geometry is not
 * cut off before the run has descended.
 */
export function portraitPanForFloor(worldFloorY, zoom, floorY = GROUND_Y, margin = 8,
  targetRatio = PORTRAIT_GROUND_ANCHOR_RATIO) {
  const z = Number(zoom);
  const worldY = Number(worldFloorY);
  if (!Number.isFinite(worldY) || !Number.isFinite(z) || z <= 0) return 0;
  const frame = getActiveFrame();
  const safe = frame?.safeRect || { top: 0, bottom: H };
  const inset = Number.isFinite(Number(margin)) ? Math.max(0, Number(margin)) : 0;
  const floorScreen = screenYFor(worldY, z, 0, floorY);
  const top = Number.isFinite(Number(safe.top)) ? Number(safe.top) : 0;
  const bottom = Number.isFinite(Number(safe.bottom)) ? Number(safe.bottom) : H;
  const ratio = Number.isFinite(Number(targetRatio))
    ? Math.max(0, Math.min(1, Number(targetRatio))) : PORTRAIT_GROUND_ANCHOR_RATIO;
  const target = top + (bottom - top) * ratio;
  // Keep the target out of the safe-area edges even if a caller supplies an
  // extreme ratio for an inspection run.
  const boundedTarget = Math.max(top + inset, Math.min(bottom - inset, target));
  return boundedTarget - floorScreen;
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
//
// That fast branch is only ever honest about where the anchor has to END UP.
// How fast it may GET there is fallLimit's business, and off a sky road the
// difference is the whole picture: 168px of anchor at k=14 moves 1650px/s on a
// hero who is at that moment falling at 30, so the lane arrives while he is
// still up where the road was — off the top of the frame.
export function easeFloor(current, target, dt) {
  const k = target < current ? 4.5 : 14;
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

// ---- the anchor, sprung ------------------------------------------------------
//
// easeFloor above and every other ease in this file are exponential, which is
// ease-OUT and nothing else: the velocity is at its maximum on the very first
// frame and decays from there. For a target that moves smoothly that is fine —
// the ease is only ever a few pixels behind. For a target that JUMPS it is the
// whole problem. A sky fork lifts the anchor about a hundred pixels the instant
// the hero claims it, and k=4.5 on a hundred pixels is 450 world px/s on frame
// one, out of a standing stop: measured across every stage in the game the
// anchor was the source of every world-slide over 400px/s, topping out at 898 —
// more than twice the speed of the hero it was following.
//
// A critically damped spring is the same settling shape with the missing half
// put back. It starts at zero velocity (the ease-in), accelerates into the move,
// peaks at about 0.37 * omega * distance a third of the way through, and comes
// to rest without overshooting — so the same journey in a comparable time with
// less than half the peak speed and no corner at either end. The cost is one
// number of state per sprung value, which is why easeFloor could not simply be
// changed in place: the velocity has to live on the run.
//
// Implicit (backward Euler) rather than the explicit form, because the explicit
// one goes unstable when omega * dt approaches 1 and this runs at whatever frame
// rate the machine manages.
export function springFloor(current, velocity, target, omega, dt) {
  const w = Math.max(0.01, Number(omega) || 0);
  const h = Math.max(0, Number(dt) || 0);
  const x = Number(current) || 0;
  const v = Number(velocity) || 0;
  const to = Number(target) || 0;
  const f = 1 + 2 * h * w;
  const hoo = h * w * w;
  const hhoo = h * hoo;
  const det = f + hhoo;
  return {
    value: (f * x + h * v + hhoo * to) / det,
    velocity: (v + hoo * (to - x)) / det,
  };
}

// The spring's stiffnesses, and the same asymmetry the exponential had: a rise
// is meant to be FELT (the anchor lagging a climbing hero is what shows him
// gaining height) and a fall is a hero at terminal velocity who will leave the
// bottom of the frame if the anchor is polite about it.
//
// Numerically higher than the k they replace because a spring's peak speed is
// about 0.37 * omega against an exponential's k: 7 against 4.5 is a settle of
// roughly the same length at 42% less peak speed, which is the trade the whole
// change is for.
export const FLOOR_RISE_W = 7;
export const FLOOR_FALL_W = 16;
// The tunnel preview is a look-ahead, not a correction, and it was already the
// gentlest thing on this screen. Sprung at the same relative stiffness so the
// one variable has one behaviour rather than two.
export const PREVIEW_APPROACH_W = 3.4;
export const PREVIEW_RELEASE_W = 2.5;

// And a ceiling on the anchor however far behind it is, in SCREEN px per second
// — the same unit and the same order as GUARD_SPEED and FALL_CATCHUP, because
// it is the same promise to the same eye. The spring alone already keeps an
// ordinary route under this; what it catches is the authored outlier, a fork
// that lifts three hundred pixels, where the spring's peak would scale with the
// distance and this does not.
export const FLOOR_MAX_SPEED = 340;

// Which stiffness a given move gets. `preview` is the tunnel look-ahead.
export function floorSpringW(current, target, preview = false) {
  if (preview) return target > current ? PREVIEW_APPROACH_W : PREVIEW_RELEASE_W;
  return target < current ? FLOOR_RISE_W : FLOOR_FALL_W;
}

// One sprung step, with the screen-speed ceiling applied to the result and
// folded back into the velocity. Clamping the position alone winds the spring
// up: it keeps integrating toward a target it is not being allowed to approach
// and arrives with all of that speed still in it.
export function stepFloorSpring(current, velocity, target, omega, z, dt) {
  const next = springFloor(current, velocity, target, omega, dt);
  const cap = (FLOOR_MAX_SPEED / Math.max(0.01, z)) * Math.max(0, dt);
  const moved = next.value - current;
  if (Math.abs(moved) <= cap) return next;
  const clamped = current + Math.sign(moved) * cap;
  return { value: clamped, velocity: Math.sign(moved) * (cap / Math.max(1e-6, dt)) };
}

// How fast the camera may move the world on screen by its OWN doing, in screen
// px per second — the anchor and the crane together, as one budget.
//
// Separate caps on the two were not enough, and the measurement is why. A sky
// fork jumped at is both mechanisms at once: the anchor climbing to re-pin on
// the road AND the crane opening for the jump taken on the way up, both in the
// same direction, each politely inside its own limit and 620px/s between them.
// The player does not see two mechanisms. They see the world slide.
//
// Note what this is NOT measuring. `-anchor * z + pan` is the camera's own
// contribution; the hero's altitude adds to it and is not the camera's doing at
// all. A hero dropping 400px/s takes the world with him and that reads as
// falling, not as a pan — which is why the visibility clamps below are allowed
// to outspend this, and why capping the raw on-screen motion instead would have
// made the game follow him worse for no gain in smoothness.
export const CAM_SLIDE_MAX = 380;

// The footroom clamp — "the anchor never leaves the hero's feet more than
// CAM_FOOTROOM under the bottom edge" — measured as the source of every spike
// the spring and the two caps did not already cover: 648px/s in a tunnel and
// 605 stepping off a sky fork, while the hero himself was doing 90 and 103.
//
// It fires when the spring is LAGGING, and it was discharging the whole of that
// lag in one frame. Bounded here the way fallLimit bounds the fall: the hero's
// own descent, plus an allowance, and not a pixel more. Because the allowance is
// on TOP of the hero's own drop the clamp can never lose ground to him however
// small it is — it only takes longer to close a lag it is already behind on —
// so this is free to sit under CAM_SLIDE_MAX rather than having to outrun a
// fall.
export const FOOTROOM_CATCHUP = 260;

// A tunnel is the one route whose lower floor is worth showing BEFORE the
// hero reaches it. The ordinary floor ease is intentionally quick when a
// hero is already falling; using that here would move the whole frame in one
// or two ticks as soon as the opening entered the look-ahead window. Keep the
// approach on a slower, readable time constant. Returning to a shallower
// target uses a similarly gentle release so an upper-path choice leaves the
// lower option visible for a moment instead of snapping the frame upward.
export function easeTunnelPreview(current, target, dt) {
  const k = target > current ? 2.2 : 1.6;
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

// ---- falling off a road -----------------------------------------------------
//
// Where a FALLING hero sits in the frame, as a fraction of its height. The
// groundline's own 232/270 is where he sits while he is standing on something,
// and it is the wrong place to hold him while he drops: it leaves 19 world px
// under his feet, so the thing he is falling onto only appears in the last
// tenth of a second. At 0.45 he keeps the upper half of the frame and the lane
// below him is visible for the whole descent.
export const FALL_LEAD_AT = 0.45;

// The world distance the anchor leads a falling hero's feet by to put him
// there. Divided by the zoom because the fraction above is a FRAME position:
// the same 0.45 on a phone and on a monitor, whatever the world costs.
export function fallLead(z) { return (frameGroundY() - H * FALL_LEAD_AT) / z; }

// How much faster than the hero himself the anchor may travel to take up that
// lead, in SCREEN px per second. This is the number the whole fall hangs on.
//
// The anchor cannot reframe a falling hero without moving faster than he
// falls — that is what reframing IS — so the question is never whether it
// outruns him but by how much, and the answer has to be small enough to read
// as the camera settling rather than as the world being yanked. 300px/s is
// about a ninth of the frame per second: over the third of a second it takes
// to spend the lead it is barely visible, and it is two hundred times less
// than the 1650px/s an unlimited ease reaches on the frame the hero steps off.
const FALL_CATCHUP = 300;

// The furthest down the anchor may move this frame: however far the hero fell,
// plus that allowance. `drop` is his feet's own world descent since the last
// frame — pass it and the anchor is measured against the hero rather than
// against the clock, so a fall at terminal velocity and a fall that has barely
// started are both framed the same way.
export function fallLimit(current, drop, z, dt) {
  return current + Math.max(0, drop) + (FALL_CATCHUP / z) * dt;
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
  const anchor = frameGroundY();
  const pan = Math.max(0, Math.min(PAN_MAX, need * ZOOM - anchor));
  return { pan, zoom: Math.min(ZOOM, Math.max(ZOOM_MIN, (anchor + pan) / need)) };
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
  return (frameGroundY() + PAN_MAX) / ZOOM - HERO_HEIGHT - HEAD_MARGIN;
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

// ---- the jump guard ---------------------------------------------------------
//
// framingFor above answers "how much frame does a hero at altitude y need", and
// for a decade the dolly asked it that question every tick and flew wherever the
// answer went. What that produces is a crane welded to the JUMP ARC: nothing at
// all until the altitude crosses the threshold, and then — because the hero is
// travelling at 170px/s by the time he gets there — a pan target that goes from
// standing still to 340 screen px/s between one frame and the next, tracks a
// parabola up, and runs the whole thing backwards on the way down. easePan
// rounds that corner but it cannot hide it: the discontinuity is in the target's
// VELOCITY, and no amount of smoothing on a position fixes that.
//
// It is also a promise the camera has no business making. Craning as the hero
// leaves the ground says "we are going up there", and at that moment nobody
// knows whether he is. The frame commits to a jump that may well end in the pit
// it started over.
//
// So the guard is the same arithmetic asked a different question: not "where
// does the hero want the frame" but "is the hero about to LEAVE it". It is
// one-sided (it only ever pushes the crane up), it is latched (it never retreats
// while he is still in the air, so a descent does not run the ascent backwards),
// it is aimed at the apex he is ACTUALLY going to reach rather than at the
// altitude he happens to be passing through, and it is released only once he has
// landed and stayed landed. A jump that fits the frame therefore moves the
// camera by exactly nothing, and the camera's only remaining opinion about a
// jump is that it would rather the hero stayed in shot.
//
// Where the anchor (camFloorY, run.js) is what says "we made it" — it re-pins to
// the floor the hero is STANDING on — the guard is what keeps him visible in the
// meantime. Between them: the picture commits on the landing, not on the launch.

// Air kept above the hero's crown before the guard fires, in SCREEN px. A screen
// distance rather than framingFor's world-space HEAD_MARGIN, and deliberately:
// the thing being protected is a frame edge, so the promise should be the same
// twelve pixels of sky on a phone and on a monitor rather than twice as much on
// one of them. Small on purpose — every pixel of it is altitude at which an
// otherwise well-framed jump starts moving the camera. At 6 and ZOOM 2 an
// ordinary double jump (98px) spends 18px of crane and a single (57px) spends
// none at all.
export const GUARD_TOP_MARGIN = 6;
// How long the hero has to stay on the ground before the crane is given back.
// Zero would bounce the frame on every hop along a raised route; long enough to
// outlast a landing-and-immediately-jumping-again reads as the camera waiting to
// be sure rather than as lag.
export const GUARD_DWELL = 0.14;
// Giving the crane back is scenery settling, never a gameplay correction, so it
// is slower than taking it.
export const GUARD_RELEASE_K = 5;
// Taking it is not urgent either — the target is latched at the apex long before
// the hero reaches it, so there is a whole ascent to cover the distance in.
export const GUARD_APPROACH_K = 9;
// And a hard ceiling on how fast the crane may travel however far behind it is,
// in screen px per second. This is what turns the last of the exponential's
// initial kick into a glide; about a ninth of the frame per second, the same
// order as FALL_CATCHUP, and the reason is the same — past this the camera stops
// reading as a camera.
export const GUARD_SPEED = 280;

// The UNCLAMPED crane a hero `y` px above their floor needs to keep the guard
// margin above their crown. Same shape as framingFor's `need * ZOOM - anchor`,
// with the head margin moved out of world space; kept unclamped so one number
// carries both the crane and, once it outruns PAN_MAX, the zoom that has to
// cover the rest.
export function guardNeed(y, groundLift = 0, margin = GUARD_TOP_MARGIN) {
  return margin + (Math.max(0, Number(y) || 0) + HERO_HEIGHT + groundLift) * ZOOM - frameGroundY();
}

// Split one such requirement into the crane and the zoom left over. The crane is
// spent first to the last pixel of PAN_MAX, exactly as framingFor does it, and
// the zoom is a backstop that ordinary play never reaches: at ZOOM 2 it does not
// move until 185px of altitude.
export function guardFraming(need, margin = GUARD_TOP_MARGIN) {
  const anchor = frameGroundY();
  const raw = Number.isFinite(Number(need)) ? Number(need) : 0;
  const pan = Math.max(0, Math.min(PAN_MAX, raw));
  if (raw <= PAN_MAX) return { pan, zoom: ZOOM };
  const world = Math.max(1, (raw + anchor - margin) / ZOOM);
  return { pan, zoom: Math.max(ZOOM_MIN, Math.min(ZOOM, (PAN_MAX + anchor - margin) / world)) };
}

// The altitude a ballistic hero is actually going to reach. This is the whole
// predictive half of the guard and it costs one multiply: the apex is known the
// instant the feet leave the floor, so the crane can be aimed at its final value
// at takeoff and simply glide there, instead of being dragged up the arc behind
// a hero it is trying to keep up with.
//
// It is not a forecast of the JUMP — an air jump taken later raises the apex and
// the guard simply re-aims, which is correct, because until the button is
// pressed the taller jump is not happening. A falling hero has no apex above
// where he already is, so this returns his current altitude and the latch holds
// the crane where it is.
export function ballisticApex(y, vy, gravity) {
  const base = Number(y) || 0;
  const v = Number(vy);
  const g = Number(gravity);
  if (!(g > 0) || !(v > 0)) return base;
  return base + (v * v) / (2 * g);
}

// Move the crane toward a latched target: an ordinary ease, then a hard cap on
// the distance covered this frame. The ease alone is smooth in position but not
// in velocity — it starts at k * distance, which off a tall apex is a yank — and
// the cap alone is smooth in velocity but arrives with a corner. Together the
// move accelerates into the cap, holds it, and eases out of it.
export function guardApproach(current, target, dt, speed = GUARD_SPEED) {
  const from = Number(current) || 0;
  const to = Number(target) || 0;
  const step = Math.max(0, Number(dt) || 0);
  const eased = from + (to - from) * (1 - Math.exp(-GUARD_APPROACH_K * step));
  const cap = Math.max(0, Number(speed) || 0) * step;
  return Math.max(from - cap, Math.min(from + cap, eased));
}

// The crane below which the hero's crown leaves the top of the picture, at the
// LIVE zoom rather than the resting one. This is the guard's floor, and it is
// applied as a floor every frame rather than as an emergency snap: where the
// glide is keeping up it binds on nothing, and where it cannot — the last third
// of a triple, where a second air jump raises the apex 45px with 0.3s of flight
// left — the crane simply rides the hero's own arc for as long as it takes to
// catch up. That is the old altitude-tracking dolly, confined to the one place
// it was ever the right answer.
//
// Note the margin is zero here and GUARD_TOP_MARGIN in guardNeed: the guard
// would LIKE six pixels of sky and will not accept less than none.
export function guardFloorPan(y, groundLift, z) {
  return (Math.max(0, Number(y) || 0) + HERO_HEIGHT + groundLift) * z - frameGroundY();
}

// Giving it back. No cap: the release target is the resting frame, the distance
// is whatever the jump bought, and GUARD_RELEASE_K is already slower than
// anything the cap would impose.
export function guardRelease(current, target, dt) {
  const from = Number(current) || 0;
  const to = Number(target) || 0;
  return from + (to - from) * (1 - Math.exp(-GUARD_RELEASE_K * (Number(dt) || 0)));
}
