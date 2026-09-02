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
// 1.15 jumpMult with two air jumps stacked on top — and holding that at
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
// cliffhanger jump took the top slot at 1.15; her stack measures 184.0px.
// Everything above is arithmetic off this one number.
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
export function fallLead(z) { return (GROUND_Y - H * FALL_LEAD_AT) / z; }

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
