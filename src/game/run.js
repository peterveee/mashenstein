// The Run state: one campaign stage (or OVERTIME). Composes player, relay,
// spawner, missions, powerups, style packs, HUD.
import { W, H, shake, updateShake, blit, pushOverlayDraw, setSceneGlow, chrome as chromeGeo, chromeCtx, paintChrome } from '../engine/renderer.js';
import { GROUND_Y, ZOOM, VIEW_W, applyWorld, screenYFor, camYFor, framingFor, restingHeadroom, easeZoom, easePan, easeFloor, anchorShift, BG_FOLLOW, setRestingZoom } from '../engine/camera.js';
import { readPlatform } from '../engine/platform.js';
import { Input } from '../engine/input.js';
import {
  Audio, PORTAL_RELAY_IN, PORTAL_RELAY_OUT,
  PORTAL_RELAY_GAIN, PORTAL_RELAY_IN_GAIN, portalCueFlashAt,
} from '../engine/audio.js';
import { MusicDirector } from '../engine/music-director.js';
import { Rng } from '../engine/rng.js';
import { setState } from '../engine/states.js';
import { burst, shardBurst, spawnShard, updateParticles, drawParticles, clearParticles, spawn } from '../engine/particles.js';
import { drawText, drawTextCentered, textWidth, drawPanel, drawMenuRow, textYForMid, UI_PANEL_BORDER, drawRoundButton, drawKeyLegend, keyLegendWidth, drawPellet } from '../engine/sprites.js';
import { Player, PLAYER_X, PLAYER_W, GRAVITY, jumpHeightFor } from './player.js';
import { Relay, portalSchedule } from './relay.js';
import { Spawner, DripSpawner, REACT_FLOOR, REACT_FLOOR_MAX, worstJumpApex, COIN_GAP, COIN_FLOOR } from './spawner.js';
import { Powerups, POWER_DEFS, randomPowerPickup } from './powerups.js';
import { entityBox, overlaps, makePickup, makeObstacle, OBSTACLES, PICKUPS, DEBRIS, DEBRIS_DEFAULT } from './entities.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { BENCH_UPGRADES } from '../data/progression.js';
import { CABINET_BY_ID, CABINETS } from '../data/cabinets.js';
import { STAGES } from '../data/stages.js';
import { FAIL_MESSAGES, EGGSHELL_TAUNTS, EGGSHELL_NARRATION, TAG_LINES, EXIT_LINES } from '../data/jokes.js';
import { getStylePack, sunShock } from '../engine/stylePacks/index.js';
import { drawHud, drawSpeech, drawActBanner, drawFloatie, drawFailBanner, drawTouchZoneCard, roundButtonOpts, playButtons, HINT_TIME, BONUS_TIME, BONUS_HOLD, TOUCH_SHELF_CY } from './hud.js';
import { goalsDone } from './plugs.js';
import { stagePlayed, stageAllPlugs } from './progress.js';
import { drawRocketFist, drawThrownAxe } from '../sprites/toons.js';
import { drawFinishMarkerArt, plungerStandY, PLUNGER_REST, PLUNGER_CX } from './finishMarker.js';
import { drawHeroSprite, drawWorldEntity, drawPortal, drawCopter, TAG_FLASH_TIME, HERO_DRAW_H, HERO_CENTER_OFF } from './draw.js';
import { drawTerrain, drawRoutes, drawSubsoil, ISLAND_THICKNESS, terrainGroundY } from './terrain.js';
import { routeRise, roadAt, buildRoutes, MAX_ISLAND_RISE } from './routes.js';
import { TapeRewindEffect } from './rewindFx.js';
import { updateProfileMark, updateProfileAdd } from '../engine/update-profile.js';
import { setPropDrawPhase, maxPropVisualScale } from '../sprites/props.js';
import { beginStageArtWarmup, stepArtWarmup, artWarmupPending } from './art-warmup.js';

export { GROUND_Y };
// The hero's screen x at the resting zoom: 23.3% of the frame. The HUD/floatie
// layer draws UNSCALED above the world, so anything that has to sit over the
// hero up there anchors here rather than to the world-space PLAYER_X.
// Stage-clear: a short beat on the finish frame so the tape-cross registers.
// The scene change itself is the CRT shutter in states.js — this used to close
// an iris to black first, which meant fading out twice back to back.
const FINALE_HOLD = 0.25;
// And a second at the end, after everything has finished happening. The band's
// own hold is sized to fit the CHAIN — slide, click, lamps, current, flag, coin
// tally — so it runs out on the last event rather than after it, and the scene
// cut away on the frame the last coin landed. This is the beat where nothing is
// moving except the hero celebrating on the plunger and the flag flying over
// him, which is the picture the whole marker exists to produce.
const FINALE_TAIL = 1;
// How long an ACT card holds the world still. It is a reading budget, not a
// flourish: the cards run 56–76 characters over two lines, and at 2s — with the
// last 0.3 of that spent fading out — the longest of them was off screen before
// the second sentence had landed. Three of these exist in a whole campaign, so
// the whole cost of being generous is six seconds across a playthrough.
//
// That budget is for a FIRST read. A replayer has read it, so they can cut it
// short (see the skip below) — which is also why being generous here is cheap.
export const ACT_BANNER_TIME = 4.0;
// The card's fade-out, and the floor a skip drops the freeze to rather than 0.
// Skipping to zero would start the run on the frame the finger came down, with
// the card vanishing mid-pixel; skipping to the fade plays the same exit the
// card always plays, just sooner.
const ACT_BANNER_FADE = 0.3;
// The two-button card that follows the ACT card on the campaign's first stage
// (touch only). It fades in over ZONE_CARD_FADE and cannot be dismissed until
// ZONE_CARD_ARM has passed — the arm is longer than the fade on purpose, so the
// earliest a tap can take it is a beat after it is fully legible. Neither number
// is a reading budget: the card waits indefinitely, and these only stop the tap
// that dismissed the card BEFORE it from carrying through into this one.
const ZONE_CARD_FADE = 0.25;
const ZONE_CARD_ARM = 0.4;
// How high a road may carry the hero before the camera stops craning at it and
// RE-PINS to the road instead (camera.js's `floorY`). Set to the island ceiling
// on purpose: everything that could already be reached with a jump frames
// exactly as it always did, and only a road that has left jump range — which is
// to say only a road you are committed to — moves the anchor.
// How high a road may carry the hero before the camera re-pins to it.
//
// Derived from the FRAME, not from the jump. The old value was the island
// ceiling, which re-pinned for anything above one hop — and that was wrong the
// moment islands started stacking: a staircase topping out at 80px is held
// comfortably by the crane, and moving the anchor for it slides the lane and
// the steps you climbed off the bottom of the screen, taking away the one thing
// you need to see to get back down. What the anchor is FOR is a road the frame
// cannot hold at all.
//
// `restingHeadroom()` is what the frame holds at full crane; subtracting a
// pessimistic jump apex leaves the standing height at which a hero can still
// jump without the zoom opening up. Live, because ZOOM moves with the device.
function camAnchorFree() {
  return Math.max(MAX_ISLAND_RISE, restingHeadroom() - worstJumpApex());
}
// The same band going DOWN, and far smaller, because the crane has nothing to
// spend there: the apron below the groundline is the budget for craning UP, and
// there is no equivalent underneath. Any road that dips more than a few pixels
// below the lane has to be followed rather than framed.
const CAM_ANCHOR_DOWN = 10;
// How far the hero may sink below the re-pinned anchor before it stops easing
// and simply follows him. Only ever engages while the anchor is off the
// groundline, so rolling terrain — which dips the hero up to 18px below
// GROUND_Y and has always been framed by the crane — never sees it.
const CAM_FOOTROOM = 6;
// A spring launches to the road's entry height plus this. Clearance rather than
// exactness: the hero has to be DESCENDING to be caught by a road (see
// updateRoute), so the arc must peak above it rather than at it.
const SPRING_CLEAR = 16;
// Where the pad sits relative to the mouth it is aimed at. The launch solves for
// height and the placement solves for distance, so this is the one number that
// says "arrive just inside the road rather than exactly on its lip".
const SPRING_LEAD = 12;
// Lane kept clear either side of an opening, so nothing can crowd a hero into
// one he did not choose.
const OPENING_CLEAR = 26;
// Rise above which a sky road is drawn as cloud rather than as dirt, and the
// band over which it changes its mind. Below the first number it is a slab of
// ground held up in the air; above the second it is weather.
// Set above the sky road's own ENTRY height on purpose. The lip is where the
// spring puts you down and it wants to be honest ground under your feet — a
// landing platform half dissolved into fog reads as neither one thing nor the
// other. The changeover belongs to the climb, which is the stretch that is
// about leaving the ground in the first place.
const CLOUD_FROM = 108;
const CLOUD_TO = 168;
// Jump faces: expressionFor's `jf` lookup (toons.js) — 0 surprised, 1 excited,
// 2 determined, 3 startled.
const JUMP_FACE_COUNT = 4;
// One reroll if the pick repeats the jump before it — the same once-only
// reroll randomPowerPickup uses, so back-to-back hops don't keep landing on
// the same expression. A strict === compare, not a truthy `avoid &&` check,
// since 0 (surprised) is a valid — and the initial — face to avoid repeating.
function rollJumpFace(rng, avoid) {
  const first = rng.int(0, JUMP_FACE_COUNT - 1);
  return first === avoid ? rng.int(0, JUMP_FACE_COUNT - 1) : first;
}
// Rewind: hold Left Arrow / A to reverse time, up to 10 seconds at ~30 fps.
// Snapshots capture the full world state; popping them restores it.
const REWIND_SECONDS = 10;
// 15, not 30. Capturing costs a full pass over the live world, so the rate is
// the single biggest lever on what recording costs — and the coarser reverse
// motion it produces is wanted rather than tolerated: rewind is a tape effect,
// and tape is not smooth.
const REWIND_FPS = 15;
const REWIND_STEP = 1 / REWIND_FPS;
const REWIND_MAX_FRAMES = REWIND_SECONDS * REWIND_FPS;
// Snapshots popped per 60Hz tick. This is a rate in SNAPSHOTS, so it has to
// move with REWIND_FPS or the playback speed changes: one snapshot now covers
// 1/15s of recorded time instead of 1/30s, and popping two of them per tick
// would run the tape back twice as fast as it always has. One preserves the
// speed the game shipped with.
const REWIND_SPEED = 1;
// ?norewind — diagnostic only. Recording is the largest steady allocation
// source in a run even pooled, so this is the switch that says whether a given
// run's scattered dropped frames are coming from here at all. Rewind itself
// simply finds an empty buffer and does nothing, so a level is still playable
// while testing. Read once: the flag is a lab switch, not a setting.
const REWIND_DISABLED = typeof window !== 'undefined'
  && typeof URLSearchParams !== 'undefined'
  && new URLSearchParams(window.location.search).has('norewind');
// Cooldown after release: rewind continues decelerating for this many seconds
// so the animation winds down in step with the tape-stop audio (~1.0s).
const REWIND_COOLDOWN = 0.55;

// ---------------------------------------------------------- rewind recycling
// Recording used to allocate a whole snapshot — plus a fresh clone of every
// live entity, plus a Set per entity that tracks what it has hit — on every
// capture, then drop the lot a few seconds later. That is a steady garbage
// stream sitting behind a large retained buffer, and it costs frames the way
// this game actually loses them: not as a lower average rate, but as scattered
// collection pauses that hold one image on screen for an extra refresh or two.
//
// Everything below recycles instead. It is safe because no snapshot ever
// escapes this file: restoreRewindSnapshot copies every field out into live
// objects rather than adopting the recorded ones, so a record and its contents
// can be overwritten the moment the ring comes back round to them.

// Shallow-copy src's own fields onto dst, reusing dst. Stale fields left by
// whatever the slot held before are removed, so a recycled object never carries
// a property its new occupant does not have — a slot that held a flyer must not
// leave wing state on the crate that replaces it. Both loops are
// allocation-free, and the delete pass only bites when a slot changes shape.
function assignInto(src, dst) {
  for (const k in src) dst[k] = src[k];
  for (const k in dst) if (!(k in src)) delete dst[k];
  return dst;
}

// assignInto copies a Set by REFERENCE, which would leave the recorded snapshot
// pointing at a Set the live entity goes on mutating — the recorded past would
// then change to match the present, which is precisely what a snapshot must not
// do. Set fields are therefore re-copied by value, into the Set already in the
// slot where there is one.
function copySetInto(src, prev) {
  if (!src) return null;
  if (prev instanceof Set) {
    prev.clear();
    for (const v of src) prev.add(v);
    return prev;
  }
  return new Set(src);
}

function copyArrayInto(src, prev) {
  const out = prev || [];
  out.length = src.length;
  for (let i = 0; i < src.length; i++) out[i] = src[i];
  return out;
}

// Copy the live members of src into dst's pooled objects, returning how many
// were written. The array is deliberately NOT truncated to that count: the
// objects past the end are the pool, and dropping them would mean allocating
// again the moment the entity count ticks back up — which, with obstacles
// streaming in and out constantly, is every few captures. Readers use the
// returned count, never the array length.
function copyEntitiesInto(src, dst, setKeys, filterLive = true) {
  let n = 0;
  for (let i = 0; i < src.length; i++) {
    const e = src[i];
    if (filterLive && !e.live) continue;
    let slot = dst[n];
    if (!slot) slot = dst[n] = {};
    assignInto(e, slot);
    if (setKeys) {
      for (let k = 0; k < setKeys.length; k++) {
        const key = setKeys[k];
        if (e[key]) slot[key] = copySetInto(e[key], slot[key]);
      }
    }
    n++;
  }
  return n;
}

const OBSTACLE_SETS = ['hitIds', 'rollContactIds'];
const PROJECTILE_SETS = ['hitIds'];
const EMPTY_SETS = [];

// Fixed-capacity ring of snapshot records. Records are never discarded, only
// overwritten, so after the first ten seconds of a run the buffer stops
// allocating entirely. Popped records stay in the ring for the next capture to
// write into — restore has already copied out everything it needs by then.
class RewindRing {
  constructor(capacity) {
    this.capacity = capacity;
    this.slots = [];
    this.start = 0;
    this.length = 0;
  }

  // Keeps the allocated records: a retry after a death should not have to pay
  // for the buffer a second time.
  reset() { this.start = 0; this.length = 0; }

  // The record the next capture should write into. Once the ring is full this
  // is the oldest record, whose contents are what "discard the oldest" means
  // here — there is nothing to unlink and nothing to collect.
  slotForWrite() {
    const i = (this.start + this.length) % this.capacity;
    if (this.length < this.capacity) this.length++;
    else this.start = (this.start + 1) % this.capacity;
    return this.slots[i] || (this.slots[i] = {});
  }

  pop() {
    if (!this.length) return null;
    this.length--;
    return this.slots[(this.start + this.length) % this.capacity];
  }
}
// Seconds after a rewind before another can be triggered.
const REWIND_LOCKOUT = 3.0;

// Floatie stack anchor: above the standing hero's head with clearance, below
// the speech bubble's reach. It used to be a flat 128, tuned against the head
// at y 184 (24 drawn px at a resting ZOOM of 2, off a groundline pinned to 232).
//
// A flat number stopped working when the camera pulled back. The groundline is
// pinned but everything above it shrinks toward it, so the AIR LANE — the band
// the appliance, the drones and the air coins ride in — slides DOWN the screen
// as the zoom drops: the high appliance's crown sits at y 92 at ZOOM 2 and at
// y 120 at 1.6, which is exactly where the card row was printing. The chatter
// was landing on the one bonus a stage offers.
//
// So the row is measured off the lane rather than nailed to a pixel: it clears
// the top of the tallest air spawn at whatever the frame's current
// magnification is. FLOAT_AIR_TOP is the high appliance (alt 52 + h 18); at 1.6
// that puts the row at 112, and at the close zooms the lane is high enough that
// the clamp, not the lane, decides — 108, as high as the row may go before it
// starts arguing with the speech bubble.
const FLOAT_AIR_TOP = 70;   // world px above ground: crown of the highest air spawn
const FLOAT_BASE_MIN = 108, FLOAT_BASE_MAX = 128;
export function floatBaseY() {
  return Math.max(FLOAT_BASE_MIN,
    Math.min(FLOAT_BASE_MAX, Math.round(GROUND_Y - FLOAT_AIR_TOP * ZOOM - 8)));
}
// How fast a card drifts up, px/s. Trimmed from 18 when the row rose: the drift
// is what carries a card out of the way, and against a higher start the old
// speed pushed the oldest cards into the speech bubble's band rather than
// fading below it. 13 keeps the top of the travel where it always was.
const FLOAT_RISE = 13;

// The paused screen's two ways out, as tappable plates. Wide and worded rather
// than round and glyphed: these are read once and pressed once, which is the
// opposite of the play controls, and CONTINUE/EXIT are not symbols anyone
// shares. Laid out to match the pause copy above them — see drawPaused.
const PAUSE_MENU_W = 156, PAUSE_MENU_H = 26;
// The portal's height off the ground — how far a player has to be above it to miss.
const PORTAL_H = 40;
// How far ahead of a boost pad the approach begins. 56 was about a third of a
// second at mid speed, which fits only three or four ticks in — too few to
// read as an accelerating sequence, and a sequence is the entire point. 104 is
// closer to two thirds of a second and lands seven or eight, while still being
// well under a screen width so a pad in the distance is not already chattering.
const BOOST_ARM_RANGE = 104;
// How long the miss tail runs once a pad has gone past unclaimed. The rising
// ticks used to hold at full pitch for as long as the pad stayed on screen,
// which told a player who had just jumped clean over it that the opportunity
// was still coming. Long enough to hear the pitch fall away, short enough that
// it is over before the next thing in the lane arrives.
const BOOST_MISS_TAIL = 0.18;
// The other half of that answer. On CONTACT the tick run does not stop — it
// carries on climbing straight through the payout, so the same line that was
// the telegraph becomes the reward. Miss and it turns over and falls off a
// cliff; hit and it keeps going. One shape, two endings, and they are the
// opposite of each other, which is the only reason either one is legible.
const BOOST_HIT_TAIL = 0.34;
// How long the pad flares after it pays out. Short: this is a confirmation,
// not an effect — the hero is already gone by the time it fades.
const BOOST_FLARE_T = 0.3;
// How long the hero leans into the kick and the floor streaks past them.
// Longer than the pad's own flare: the pad is behind you almost immediately,
// and the thing the boost is actually about is what it did to YOU.
const BOOST_LEAN_T = 0.5;
// The spring's own flare. Longer than the pad's because the hero is still ON
// SCREEN above it for most of a second, and a confirmation that has finished
// before the thing it confirms has stopped happening is not a confirmation.
const SPRING_FLARE_T = 0.5;

const PAUSE_BUTTONS = [
  // 'pause' toggles, so it resumes from here; 'escape' while already paused is
  // the quit half of the Escape key's behaviour. Both actions already existed —
  // the buttons just give a thumb somewhere to send them.
  { id: 'resume', x: W / 2 - PAUSE_MENU_W / 2, y: 196, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'pause', label: 'CONTINUE' },
  { id: 'quit', x: W / 2 - PAUSE_MENU_W / 2, y: 228, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'escape', label: 'BACK' },
];

const BASE_SPEED = 160;
// The run accelerates on a square root, so the early seconds gain quickly and
// the late ones barely move — a stage feels like it is building without ever
// outrunning the reaction runway the spawner guarantees. The cap is what the
// ramp is allowed to reach; overtime raises both.
const SPEED_RAMP_K = 0.03;
const SPEED_RAMP_CAP = 1.6;
// The two resting framings, and which one a device gets.
//
// NORMAL pulls the camera back to 1.6. Two independent arguments land on that
// number. It puts the hero at 14.2% of frame height, which is where Super Mario
// World has big Mario (32px of 224) — a proportion that has had a long time to
// be judged. And of every value in the range that read well on a 32" panel it
// is the only one keeping the frame's derived numbers whole: VIEW_W lands on
// exactly 300, the headroom above the groundline on 145, the frame's top world
// y on 87. All three are integers at 2 as well, and every other candidate turns
// them into repeating decimals for nothing.
//
// It also cuts how far anything crosses the eye per frame by 20%, which is the
// one lever on strobing that costs framing rather than pace.
export const ZOOM_NORMAL = 1.6;
// CLOSE is the framing the game shipped with: the desktop ZOOM IN option, and
// what a tablet always gets.
//
// The reason a handheld does not pull back is the opposite of the one above.
// Pulling back trades apparent size for a wider frame — a good trade on a
// monitor an arm's length away, a bad one on a screen measured in inches. An
// iPad at this zoom already shows a SMALLER hero in your vision (3.6 degrees)
// than a 32" monitor does at NORMAL (4.3). Handhelds are the devices that can
// least afford to pull back, not the ones that should. A tablet counts as one
// for the same reason: an iPad is held far closer than a desk monitor, so its
// picture is not the wide angle its diagonal suggests.
export const ZOOM_CLOSE = 2;
// A phone goes closer still, and the arithmetic is not close.
//
// In landscape the 16:9 canvas is letterboxed into the phone's SHORT side, so
// an iPhone's picture is about 23 degrees wide — under half a 32" monitor's 54.
// At CLOSE that puts the hero at 2.3 degrees against the monitor's 4.3 at
// NORMAL: barely half the apparent size, which is why it reads fine on a big
// phone and tiny on an ordinary one. 2.2 lifts it to 2.5 degrees. That is still
// only 59% of the desktop reading, so this is a modest correction rather than an
// overshoot — even 2.4 would only reach 65%.
//
// The cost is runway: VIEW_W falls from 240 to 218, about 9% less warning of
// what is coming, which on a touch device is the thing being spent. 2.2 is
// chosen as the point where legibility is meaningfully better and that bill is
// still small; going further starts buying size with reaction time.
export const ZOOM_PHONE = 2.2;

// The platform read is cached — it cannot change within a session — while the
// zoom values are re-read every time, so the dev strip can still move them live.
let framingTier = null;
function tier() {
  if (framingTier === null) {
    let p = null;
    try {
      p = (typeof window !== 'undefined' && window.__mash_platform) || readPlatform();
    } catch { p = null; }
    framingTier = !p || p.isDesktop ? 'desktop'
      : (p.isIphone || p.isAndroidPhone) ? 'phone'
        : 'tablet';
  }
  return framingTier;
}

/**
 * Resolve the framing this device and this player want, and apply it — which
 * moves VIEW_W, VIEW_H and everything reading them, not just the magnification.
 *
 * Cheap enough to call every frame, and it is: that is what lets the dev strip
 * sweep the zoom without leaving the frame's derived numbers describing a view
 * that is no longer on screen.
 */
/**
 * Does this device let the player choose its framing at all?
 *
 * Only a desktop does. A phone and a tablet each get one fixed zoom, chosen for
 * how close the thing is held, and applyFraming below never looks at the
 * setting on them — so the OPTIONS row that toggles it is a control wired to
 * nothing, which is worse than an absent one. Settings asks this before
 * offering it.
 */
export function framingIsChosen() { return tier() === 'desktop'; }

export function applyFraming(settings) {
  const t = tier();
  const want = t === 'phone' ? ZOOM_PHONE
    : t === 'tablet' ? ZOOM_CLOSE
      : (settings && settings.zoomIn) ? ZOOM_CLOSE : ZOOM_NORMAL;
  if (want !== ZOOM) setRestingZoom(want);
  return want;
}

// Velocity smear on the world's obstacles.
//
// A display holds each frame still until the next one replaces it, so a shape
// crossing a lot of visual angle per frame is shown as a row of separate
// stationary images rather than as something moving — which the eye reads as
// strobing. It gets worse the bigger the screen, because the angle per frame
// grows with it while the pixels per frame do not change at all. Film never had
// this problem: a physical shutter smears the subject across the frame it is
// exposing, and that smear is the cue that fuses the images back into motion.
//
// So we draw it. Each obstacle is painted a few extra times along the path it
// travelled since the last frame, fading with distance, which is the same cue
// arrived at by arithmetic instead of by optics.
//
// The CEILING on ghosts per obstacle, not a fixed count — the draw derives what
// this frame's travel actually needs and stops here. Each one is a full redraw
// of the entity, so this is the budget: at 10 a fast frame costs eleven draws
// per obstacle and a slow one still costs two.
//
// STEPS 0 turns it off — it is the honest comparison, not a disabled feature.
//
// Off by default, and the reason is worth keeping: tried against the real
// strobing on a 5K panel it read as blur rather than as motion. That is what
// the arithmetic predicts. Smear works by supplying the cue a shutter would
// have left, and it only helps for motion the eye is NOT following — a shape
// being tracked is already smeared across the retina, so painting more of it on
// only softens the art. At 0.95 degrees of visual angle per frame the ghosts
// would have to sit about a pixel apart to fuse, which is ~88 redraws of every
// obstacle, and even then the eye's own pursuit is doing the opposite job.
//
// Left switched off rather than deleted because it costs one comparison on the
// draw and answers a question that will be asked again. What it is NOT is a
// fix for the underlying problem: that is angular velocity, and the numbers
// that move it are BASE_SPEED, SPEED_RAMP_CAP and the camera's ZOOM.
const SMEAR_STEPS = 0;
// Peak opacity of the nearest ghost. The furthest fades to nothing, so this is
// the top of a ramp rather than a flat wash.
const SMEAR_ALPHA = 0.3;
// Multiplier on the distance actually travelled since the previous frame. 1 is
// physically honest — exactly what a 360° shutter would capture. Above 1
// exaggerates, which is often what reads best, since a real shutter is open for
// only part of a frame and we are competing with a display that holds its image
// for all of one.
const SMEAR_SPAN = 1;
// Ceiling on how far a single frame may smear, in world pixels. Guards the one
// frame after a rewind or a checkpoint restore, where the camera can jump a long
// way and the "distance travelled since last frame" is a teleport rather than
// motion. Without it that frame paints ghosts across half the screen.
const SMEAR_MAX_PX = 14;
// The hero is off stage when a level opens: he sprints in from beyond the left
// edge to the running anchor (PLAYER_X) before the world goes live. Behind an
// ACT card he waits out of frame until it lifts; on a card-less stage the
// entrance IS the opening beat. START_X sits far enough left to clear the widest
// hero + carried weapon at the resting zoom, so nothing pokes on screen while he
// waits. The pace matches the base run so his stride reads as planted rather
// than skated, which puts the whole entrance at roughly half a second.
const INTRO_RUN_START_X = -30;
// The entrance winds up rather than trotting in at a fixed clip: he enters at
// this fraction of the run speed and accelerates HARD to full by the start line,
// so momentum is already built when the live run takes the speed over — arriving
// at full speed is what keeps the handoff free of a gear-change (both his legs
// and the world are at run pace at the line). Deliberately NOT ease-out: a
// fast-in/slow-settle arrival would land below run speed and jerk on handoff.
const INTRO_RUN_SLOW = 0.45;
// Shape of that ramp against distance covered. 1 is a straight line; >1 is an
// ease-in that keeps him slower early then surges onto the line. Held modest so
// the whole walk-on lands near 0.9s — brisk, not a crawl. Kept off the SLOW
// floor so he never stalls at the edge.
const INTRO_RUN_EXP = 1.8;
// Where the camera parks relative to the tape, and so how long the hero's
// screen-space dash at the end of a stage is: PLAYER_X to here. It is a VIEW
// measurement, not a screen one — at W-58 the goal would sit 422 world px ahead
// of a 213-px-wide view and never come on screen at all. totalDist is untouched,
// so the run is exactly as long as it was; only where the camera stops short of
// the tape moves.
//
// It sizes the dash rather than aiming it: the hero runs at finishScreenX(),
// which is this whenever the finish arms on time, and less when a late-completed
// objective armed it with the pole already part of the way in.
//
// The margin was 32, and 32 is not a margin — the switch's housing alone runs to
// 26px right of the pole, so the whole payoff of the stage's last input happened
// in the last six pixels of the frame, with the sparks off the contact thrown
// straight out of shot. 72 clears the widest switch in the bake-off plus its
// forward sparks (see MARKER_RIGHT_EXTENT in finishMarker.js) and leaves the
// marker standing IN the lane rather than pinned to the edge of it. The cost is
// 40px off the dash, which is about a third of a second of victory lap; the run
// is exactly as long as it was either way, since totalDist is untouched.
// A function, not a constant: VIEW_W now follows the resting zoom, and a value
// captured at module-eval would plant the tape for a frame width the game is no
// longer showing — which is exactly the extra space that appeared past the
// flagpole when the camera pulled back to 1.6 and this did not.
// It survives the mast's step to the right unchanged, and has to: 72 is already
// this margin's ceiling. A late mission cord has to fit between the screen edge
// and the FINISH_CLEAR wall, which needs finishLineX() >= FINISH_CLEAR + the
// piece's width — 168 of the 240 the view is wide — so every pixel added here
// comes straight out of the window a replacement objective can still spawn in,
// and there are none spare. The marker does not need them anyway: its right
// extent is set by the readout box standing off at 34, not by the mast, and the
// flag's cloth still ends a good 29px inside the box's far edge.
const finishLineX = () => VIEW_W - 72;
// The clear lane in front of the marker: how much empty ground the spawner has
// to leave before the flagpole. An obstacle parked against the pole is a hazard
// wearing the goal as camouflage, a coin behind it is bait the player has to
// choose between and the flip, and anything PAST it is unreachable content
// sitting in the one part of the frame the finale needs clean. 160 is a little
// over one screen-second at cruising speed — enough that the last thing to
// leave the frame before the pole arrives is ground.
export const FINISH_CLEAR = 160;

// How far outside the visible band an entity can still put ink on screen, and
// therefore how far past the edges the render cull has to keep drawing.
//
// Derived rather than picked: hazards draw 4/3 up from their hitbox, a prop can
// scale further again, the hazard rim rings sit a pixel outside that, a smear
// ghost trails up to SMEAR_MAX_PX behind, and the whole frame can be shaken.
// The old hand-written cull was `x < -40 || x > 520` — written for a 480-wide
// unzoomed view, which stopped existing when the camera gained zoom tiers, and
// by then it was admitting most of a screen's worth of invisible entities.
// The visibility test already compares against the entity's own box, so what
// this has to cover is only how far the ART reaches BEYOND that box, not the
// whole of it.
const CULL_MARGIN = (() => {
  let widest = 0;
  for (const table of [OBSTACLES, PICKUPS]) {
    for (const def of Object.values(table)) if (def && def.w > widest) widest = def.w;
  }
  // Art is centred on the box, so the overhang is half the growth.
  const overhang = widest * ((4 / 3) * maxPropVisualScale() - 1) / 2;
  const RIM = 1;              // rim rings sit one pixel outside the art
  const SHAKE_HEADROOM = 8;
  return Math.ceil(overhang + RIM + SMEAR_MAX_PX + SHAKE_HEADROOM);
})();

// The blackout mission's brown-out ramp. Built in local space so the same
// object serves every frame wherever the hero has walked to; keyed on the
// context as well as the radius because a backend change replaces the
// backbuffer canvas underneath it.
let blackoutGrad = null, blackoutGradR = 0, blackoutGradCtx = null;
function blackoutGradient(ctx, r) {
  if (blackoutGrad && blackoutGradR === r && blackoutGradCtx === ctx) return blackoutGrad;
  blackoutGrad = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
  blackoutGrad.addColorStop(0, 'rgba(8,6,12,0)');
  blackoutGrad.addColorStop(0.6, 'rgba(8,6,12,0.28)');
  blackoutGrad.addColorStop(1, 'rgba(8,6,12,0.58)');
  blackoutGradR = r;
  blackoutGradCtx = ctx;
  return blackoutGrad;
}

// --- THE FLIP --------------------------------------------------------------
// The stage's last input, and the only one that is pure expression. The hero
// reaches the breaker under his own power whatever the player does, so a missed
// flip is a CLUNK worth nothing and the stage still clears. Nothing that arrives
// AFTER the mission is already satisfied gets to take the clear away — the
// finish run only arms once missionSatisfied() is true, and a new fail state at
// that exact moment would be the cruellest one in the game.
//
// Graded on contact HEIGHT rather than press timing. That reuses the jump the
// player has held all stage instead of teaching a button at the last possible
// moment, it stays legible with no meter on screen, and it rewards a player who
// jumped early: player.update keeps running through the dash, so an arc begun
// before the finish armed carries into the grade.
//
// Bands are fractions of the CURRENT hero's own peak, never pixels. Peak runs
// 46px (B-33P, jumpMult 0.9) through 57px (most of the cast) to 75px (Lorenzo,
// 1.15), and higher again off Mochi's second jump — a fixed pixel band would
// hand PERFECT to Lorenzo for free and put it permanently out of B-33P's reach.
//
// `hold` is how long the finish frame is held before the results card. Every one
// of them now clears FLIP_THROW with about a second and a half to spare: the
// chain finishes with the flag flying, and THEN the frame sits there so the
// player can register what they just did. At the old holds the celebration was
// arriving and being taken away inside the same second.
// `coins` is a SECOND currency on the same grade, and it is deliberately tiny
// next to the points. Points are run score; coins are the meta economy, banked
// across every stage forever, and a per-stage stipend moves the income ratio for
// the whole cast at once. So the ladder is small enough that the flip is a
// garnish on a stage's coin haul rather than a reason to play for it, and steep
// enough that PERFECT is worth five times a scraped FLIP.
const FLIP_BANDS = [
  { id: 'perfect', at: 0.70, label: 'PERFECT FLIP', bonus: 300, coins: 10, hold: 3.1, shake: 6 },
  { id: 'clean',   at: 0.35, label: 'CLEAN FLIP',   bonus: 150, coins: 5,  hold: 2.9, shake: 4 },
  { id: 'flip',    at: 0,    label: 'FLIP',         bonus: 60,  coins: 2,  hold: 2.7, shake: 3 },
];
// Reached on the ground: he shoulders it over. Still a clear, still a beat.
const FLIP_CLUNK = { id: 'clunk', label: 'CLUNK', bonus: 0, coins: 0, hold: 2.5, shake: 2 };
// The bonus plate's own clock, in seconds after the flip resolves. It waits for
// the payoff chain to finish (FLIP_THROW) before it shows: the coins are what
// the flag being up is WORTH, and paying out over the top of the chain would put
// two things to watch on screen at once. Then one coin every STEP walks out of
// the plate and into the pill, so the total is spent rather than granted.
// The plate appears on the flip itself — it is the verdict card as well as the
// coin tally — and the coins start moving once the marker's chain has had its
// moment, so the two payoffs do not compete for the same second.
const FLIP_COIN_WAIT = 0.7;
const FLIP_COIN_LEAD = 0.22;   // plate fades in this long before the first coin moves
const FLIP_COIN_STEP = 0.075;  // seconds per coin
// How far BELOW its own foot anchor each hero's celebration reaches, as a
// fraction of draw height. The celebrate cycle is a hop with a tuck in it, and
// the tuck swings the boots under the anchor — so a hero seated exactly on the
// plunger cap spends part of every cycle with his feet inside it.
//
// Measured, not guessed, and measured for the WHOLE cast rather than for the
// hero who happened to be on screen: each celebration was rendered across 40
// frames of its cycle and the lowest non-transparent pixel found. Gary reaches
// furthest at 1.75px of a 26px draw; Mochi barely leaves the anchor at 0.25.
// Re-derive the same way if the celebration painters change.
//
// Module scope rather than a static field on RunState: a static initialiser that
// names its own class makes the bundler emit `_RunState`, and the smoke test
// reads that name out of window.__mash_state to know where it is.
const CELEBRATE_DIP = {
  lorenzo: 0.043, gnash: 0.043, fernwick: 0.043, b33p: 0.043, mochi: 0.010,
  chompo: 0.043, gary: 0.067, dolores: 0.043, raymn: 0.024, grumpos: 0.058,
  kiko: 0.043,
};
// Seconds the payoff takes to run. It was 0.18 when the whole event was a lever
// swinging through its arc. The marker's payoff is now a five-beat CHAIN — push,
// a spark crawling the cable to the box, lamps, current up the pole, flag — and
// each beat has to be seen as a separate event or the whole point of splitting
// the trigger out of the housing is lost. 1.4 gives the spark alone about half
// a second to cross, which is the beat that has to read as travelling.
//
// It has to fit inside the held frame, which is FINALE_HOLD + the band's own
// hold — see FLIP_BANDS, which were lengthened to match.
const FLIP_THROW = 1.4;

// ------------------------------------------------------------- the pole ride
//
// The descent is a FALL with friction, not a tween: one acceleration for every
// catch, and the duration falls out of how far there is to come. That ordering
// is the whole point. The first version picked a duration from the catch height
// (height / 40, clamped) and eased position over it, which meant the taller the
// catch the GENTLER the acceleration — every ride, high or low, topped out
// around the same speed, so nothing read as gathering pace. Fix the accel and
// solve for the time instead and both halves come right on their own: a low
// catch is over in half the time, and a full-height catch is visibly quicker at
// the cap than it was at the grip.
//
// A sixth of GRAVITY (900), because hands on a pole is a controlled descent —
// an actual free-fall down 46px is a third of a second, gone before the eye has
// registered he is holding anything. This is the second pass at the number: 75
// gave a PERFECT a full second and that second was a beat too polite, a hero
// lowering himself where the stage wants him DROPPING onto the switch. At 150
// the longest ride is a bit over two thirds of a second and the shortest a bit
// over a third — still three times slower than a real fall, still enough room
// for the whistle, but the cap now comes up at you.
const SLIDE_ACCEL = 150;
// The grip's own speed. Starting from a dead stop puts a visible hitch at the
// top — he catches the pole and hangs there while the quadratic gets going —
// so he is already moving the moment his hands close. Small enough that the
// ride is still mostly the acceleration.
const SLIDE_V0 = 14;
// Seconds the walk-up's hop takes. Fixed, because it is the same little jump
// whatever the stage did: only the ride that follows scales. Trimmed with the
// accel — against a third-of-a-second ride, a 0.3s wind-up was the longer half
// of the gesture, which put the weight on the hop instead of the drop.
const SLIDE_HOP_T = 0.22;

// How long it takes to fall `dist` pixels down the pole — the positive root of
// dist = v0 t + ½ a t².
function slideTime(dist) {
  return (Math.sqrt(SLIDE_V0 * SLIDE_V0 + 2 * SLIDE_ACCEL * Math.max(0, dist)) - SLIDE_V0) / SLIDE_ACCEL;
}

export class RunState {
  // opts: {stage, team, seed, save, progress, overtime, corrupted:[], startingPowerup, onEnd(result)}
  constructor(opts) {
    this.o = opts;
    this.stage = opts.stage || null;
    this.cabinet = opts.cabinet || (this.stage ? CABINET_BY_ID[this.stage.cabinet] : CABINETS[0]);
    this.overtime = !!opts.overtime;
    this.demo = !!opts.demo;   // attract mode: first death ends the clip, no teaching
    this.corrupted = opts.corrupted || [];
    this.oneHit = this.overtime || opts.difficulty === 5 || this.corrupted.length > 0;
    this.unplugged = opts.difficulty === 5;
    this.startingPowerup = opts.startingPowerup || null;
    this.introDone = false; // constructor, not enter(): death-restarts must not replay the intro stall
    // Same reasoning for the bench-upgrade toasts: enter() re-runs on every
    // death-restart, so announce them once per run and never again. A retry from
    // the results screen rebuilds the RunState, so it carries announceBench:false
    // to keep the second attempt from replaying them too.
    this.benchAnnounced = opts.announceBench === false;
    // Dev-only inspection flags. Constructor, not enter(): a death-restart must
    // not silently drop them and turn a crash test back into a lethal run.
    this.devInvuln = !!opts.devInvuln;
    this.devForceMission = !!opts.devForceMission;
    this.devAutoExit = !!opts.devAutoExit;
    this.devMaxTime = opts.devMaxTime || 0; // seconds; 0 = no limit
    this.devRunTime = 0;                     // elapsed wall-clock seconds
    this.devStartPercent = opts.devStartPercent || 0; // 0–1; skip to N% of the stage
    this.devHits = [];
    // Rewind: rolling snapshot buffer + capture timer.
    this.rewindFrames = new RewindRing(REWIND_MAX_FRAMES);
    this.rewindCaptureT = 0;
    this.rewinding = false;
    this.rewindCooldown = 0;
    this.rewindLockout = 0;
    this.rewindSpeedMul = 1;
    this.rewindFx = new TapeRewindEffect();
    this.prevCamX = 0;
    this.prevCamZoom = ZOOM;
    this.prevCamPan = 0;
    this.prevCamFloorY = GROUND_Y;
    this.prevTRun = 0;
    this.prevFinishPlayerX = PLAYER_X;
    this.prevIntroRunX = PLAYER_X;
  }

  // The base ground: the one line every stage has had, a pure function of x.
  // Entities live on this. Nothing below changes what it returns.
  groundYAt(worldX) {
    return this.bossCab ? GROUND_Y : terrainGroundY(this.cabinet, worldX, GROUND_Y);
  }

  /**
   * The floor for a given ROUTE, which is what the player actually stands on.
   *
   * `player.y` is altitude above the floor rather than a world coordinate (see
   * player.js's `y <= 0` landing), so a second road does not need a second
   * collision system — it needs the floor to move. A route of null is the base
   * ground, which is every entity, every boss cabinet, and the player for all
   * of the run that is not on an island.
   */
  routeGroundY(worldX, route) {
    if (!route) return this.groundYAt(worldX);
    if (route.kind === 'island') return route.topY;
    return this.groundYAt(worldX) - this.routeRise(worldX, route);
  }

  /** See routes.js — the profile itself is geometry and lives with the rest. */
  routeRise(worldX, f) { return routeRise(worldX, f); }

  /**
   * How far the hero falls when a road runs out under him.
   *
   * Sampled at the road's LAST COLUMN rather than at the hero's own x, and that
   * is the whole subtlety: by the time this is asked he is already past the
   * span, where the road correctly does not exist and reports a height of zero.
   * Asking there gave a drop of nothing, which was fine while every fork eased
   * down to meet the ground and wrong the moment one stopped at height.
   *
   * An island keeps its own arithmetic because its top is a fixed line rather
   * than an offset from the rolling ground beneath it.
   */
  routeExitDrop(worldX, r) {
    if (r.kind === 'island') return this.groundYAt(worldX) - r.topY;
    return this.routeRise(r.x + r.w - 0.001, r);
  }

  /**
   * The floor an ENTITY stands on.
   *
   * Almost everything in the game stands on the base ground and always has, so
   * this answers `groundYAt` unless the thing was deliberately laid on a road.
   * That one field is what lets an underground section be a PLACE rather than a
   * corridor: a crate down there is an ordinary crate with an ordinary hitbox,
   * boxed against the tunnel floor instead of the lane, and nothing about
   * collision, breaking, debris or drawing has to learn what a tunnel is.
   */
  entityGroundY(e) {
    return e && e.route ? this.routeGroundY(e.x, e.route) : this.groundYAt(e.x);
  }

  /**
   * Whether an entity is on the same road as the hero, and therefore his
   * problem. Roads are far enough apart vertically that boxes rarely meet
   * anyway, but "rarely" is not the contract — a hero falling INTO a tunnel
   * passes straight down through the lane's own obstacle band on the way, and
   * being clipped by a crate he had already run under is not a hazard, it is a
   * bug with a hitbox.
   */
  sharesRoute(e) {
    return (e.route || null) === (this.route || null);
  }

  /** Where the player's own feet rest right now. */
  playerGroundY() {
    return this.routeGroundY(this.playerWorldX(), this.route);
  }

  /**
   * The road at this x a FALLING hero could land on. Routes never overlap.
   *
   * Tunnels are excluded because there is nothing to land on: a tunnel is a hole
   * with the lane running over the top of it, so the only way in is the mouth
   * (tunnelMouthAt) and the only thing above it is the ground you are on.
   */
  routeAt(worldX) {
    for (const r of this.routes) {
      if (r.kind === 'tunnel') continue;
      if (worldX >= r.x && worldX <= r.x + r.w && roadAt(worldX, r)) return r;
    }
    return null;
  }

  /**
   * The tunnel whose MOUTH covers this x.
   *
   * A tunnel's mouth is a short window at the head of its span, not the whole
   * thing. Past the mouth the ground overhead is solid again and the tunnel is
   * scenery running beneath a hero who chose not to take it — so a jump that
   * clears the hole has to stay cleared, and it would not if the tunnel went on
   * claiming the lane behind its own entrance.
   */
  tunnelMouthAt(worldX) {
    for (const r of this.routes) {
      if (r.kind !== 'tunnel') continue;
      if (worldX >= r.x && worldX <= r.x + r.mouthW) return r;
      // Every hole counts as a mouth. This is the one place that decides whether
      // the lane is open under the hero, so a hole the renderer carves and the
      // spawner puts a gap in but this does not know about would be a hole you
      // can see, fall past the edge of, and land on solid air.
      for (const h of r.holes || []) {
        if (worldX >= h.x && worldX <= h.x + h.w) return r;
      }
    }
    return null;
  }

  /**
   * Getting on and off a raised route.
   *
   * ON is a swept test rather than a point test: at 232px/s the hero moves ~4px
   * a frame and falls faster, so asking "are my feet at the road's height"
   * misses it outright most frames. Asking "did the segment I just travelled
   * CROSS that height going down" cannot. It also corrects the case where
   * player.update has already clamped the hero to the base ground in the same
   * frame — the road is always above that, so the crossing still registers and
   * wins.
   *
   * One-way on purpose: only a DESCENDING hero lands. Jumping up through the
   * road from underneath is how you get on top of it, and a runner that clonks
   * its head on the platform it is trying to reach reads as broken.
   *
   * OFF is just arithmetic, and it is where the kinds part company. `y` is
   * altitude above the CURRENT floor, so leaving a road means adding the height
   * the road had left under it. An ISLAND stops dead at its full height. A road
   * that ends in the air stops at whatever `end` it settled to and the hero
   * falls that far. A TUNNEL has climbed back to meet the lane by the time its
   * span closes, so the same expression comes out at zero and he simply keeps
   * running. One line of arithmetic, every ending, no special case.
   *
   * A TUNNEL is that same line run BACKWARDS. There is nothing to land on going
   * down, so it does not need a sweep: a hero on the ground who reaches the
   * mouth has the floor taken out from under him, and rebasing his altitude
   * against the new, lower floor is what makes him fall into it. He can only be
   * claimed at ground level — clear the hole and you are over the top of it,
   * altitude above zero, and it never sees you.
   */
  updateRoute(prevFeetY) {
    const x = this.playerWorldX();
    if (this.route) {
      const onRoad = x >= this.route.x && x <= this.route.x + this.route.w;
      // Over a BREAK, but only once he is down at the surface. A hero in the
      // air above a gap has not left the road — he is jumping it, which is the
      // entire point of putting one there — and taking the road away under him
      // mid-jump rebased his altitude to the lane and dragged the camera down
      // with it. From up on a cloud that reads as the world snapping back to
      // the ground every time you press jump. `y <= 0` is the moment there is
      // no longer anything to stand on, and not a moment before it.
      const overGap = onRoad && !roadAt(x, this.route);
      if (onRoad && !(overGap && this.player.y <= 0.01)) return false;
      // Off the end, or down into a break — the same thing as far as the
      // arithmetic is concerned, since either way there is no longer a road
      // under him and his altitude has to be rebased against whatever is. The
      // only difference is where the height comes from: at a break it is the
      // road's height right there, and at the end it is the lip's.
      const drop = overGap ? routeRise(x, this.route) : this.routeExitDrop(x, this.route);
      this.player.y += drop;
      if (drop > 0.01) this.player.grounded = false;
      this.route = null;
      return false;
    }
    // Down the hole. Checked before the landing sweep because a hero at ground
    // level is not descending onto anything and the sweep would never see him.
    const hole = this.tunnelMouthAt(x);
    if (hole && this.player.y <= 0.01 && this.player.grounded) {
      this.route = hole;
      const fall = this.routeGroundY(x, hole) - this.groundYAt(x);
      this.player.y += fall;
      // Only a HOLE puts him in the air. A ramp starts level with the lane, so
      // he keeps his feet and simply finds the ground going down under them —
      // taking his jump away there would read as a stumble.
      if (fall > 0.01) {
        this.player.grounded = false;
        this.player.jumps = 1;    // no free hop off a floor that is not there
      }
      return false;
    }
    if (this.player.vy > 0) return false;       // rising: pass through from below
    const is = this.routeAt(x);
    if (!is) return false;
    const top = this.routeGroundY(x, is);
    const feetY = this.groundYAt(x) - this.player.y;
    if (prevFeetY > top || feetY < top) return false;   // did not cross downward
    this.route = is;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.jumps = 0;
    this.player.grounded = true;
    this.player.stomping = false;
    // Reported rather than sounded here: player.update may ALSO have clamped the
    // hero onto the base ground this same frame (the island top is always above
    // it, so a fast fall crosses both), and the caller would then play `land`
    // twice for one landing. One landing, one caller, one sound.
    return true;
  }

  // The dolly. Camera Y never TRACKS the hero — both numbers come out of
  // framingFor, so the groundline stays welded to its screen y and the frame
  // opens or cranes as one piece rather than chasing them around. A jump that
  // outgrows the frame cranes up first (which costs the ground apron and
  // nothing else) and only pulls the zoom back for what is left over. Most
  // single jumps (57px against 103px of headroom) still move neither.
  updateCamera(dt) {
    // Re-resolved every frame so a settings change, or the dev strip moving
    // ZOOM_NORMAL, takes effect with VIEW_W and the finish line following it
    // rather than describing a frame that is no longer on screen. A no-op in
    // the overwhelming case where nothing has changed.
    applyFraming(this.renderSettings || this.save.settings);
    const heroX = this.playerWorldX();
    const floor = this.routeGroundY(heroX, this.route);
    // ---- where the frame is pinned -----------------------------------------
    //
    // The crane and the zoom can hold a hero who is somewhere ELSE for a moment;
    // they cannot hold one who now LIVES two hundred pixels up. Craning runs out
    // after the 38px apron, and buying the rest with zoom would shrink the whole
    // game to keep a groundline on screen that the player has left behind and
    // has no further use for.
    //
    // So past the point where the road stops being reachable, the anchor stops
    // being the groundline and becomes the ROAD. The hero holds his screen
    // position and the world slides down past him, which is what climbing looks
    // like from inside it. Below the free band nothing moves at all, so islands,
    // low forks, hills and every ordinary jump frame exactly as they always did.
    //
    // Handed over gradually rather than switched: the anchor takes NONE of a
    // rise inside the free band, ALL of one at twice the band, and a smoothstep
    // of it between. Two things fall out of that shape, and both matter more
    // than they look. Below the band nothing moves, so islands, low forks,
    // hills and every ordinary jump frame to the pixel as they always did.
    // Above it the anchor lands exactly ON the road — not a fixed distance
    // under it — so once it has caught up, standing on a cloud costs the same
    // framing as standing on the ground, which is the entire reason for
    // re-pinning instead of craning.
    const roadRise = this.groundYAt(heroX) - floor;
    const band = roadRise < 0 ? CAM_ANCHOR_DOWN : camAnchorFree();
    const k = Math.max(0, Math.min(1, (Math.abs(roadRise) - band) / band));
    const anchorLift = roadRise * (k * k * (3 - 2 * k));
    this.camFloorY = easeFloor(this.camFloorY, GROUND_Y - anchorLift, dt);
    // The ease is deliberately behind the hero on the way up, and that lag is
    // the only thing that could put him under the bottom edge on the way down.
    // Guarded on the anchor being off the groundline so rolling terrain — which
    // dips the hero below GROUND_Y and has always been framed by the crane —
    // never reaches this at all.
    if (Math.abs(this.camFloorY - GROUND_Y) > 0.5) {
      this.camFloorY = Math.max(this.camFloorY, floor - this.player.y - CAM_FOOTROOM);
    }
    // Rolling terrain owes headroom, and a road owes MORE of it: the hero is
    // already `rise` up before they jump at all. Measured against the anchor
    // rather than against GROUND_Y, so once the anchor has caught up with a
    // climbing road the framing is the resting one again — a jump taken from a
    // sky road costs exactly what a jump on the ground costs, which is the
    // point of re-pinning. Identical to the old `GROUND_Y - routeGroundY` for
    // as long as the anchor sits on the groundline, which is most of the game.
    const lift = this.camFloorY - floor;
    const want = framingFor(this.player.y, lift);
    this.camPan = easePan(this.camPan, want.pan, dt);
    this.camZoom = easeZoom(this.camZoom, want.zoom, dt);
  }

  // Translate a draw callback down to the terrain. Sampling ONE point floats
  // things on rolling ground: the art has a flat base up to 1.33x wider than
  // the hitbox, so on any slope part of that base hangs in the air. Instead,
  // seat on the LOWEST ground across the drawn footprint (max y — every part
  // of the base touches or embeds), and sink ground-sitters a further pixel so
  // their bottom edge reads as planted rather than resting on a tangent.
  // `conformCam` opts a prop into following the terrain's ANGLE as well as its
  // height: pass the camera x and the draw is rotated about the centre of its
  // footprint to the local slope. Seating alone leaves a wide flat prop lying
  // level on a hill with daylight under one end, which is what the boost pad
  // did — and a pad is a marking ON the floor, so it has to lie in the floor's
  // plane the way paint would. It is opt-in because most props should NOT do
  // this: a crate or a cactus stands upright on a slope, it does not lean.
  //
  // A conforming prop seats on the ground under its CENTRE rather than on the
  // lowest point of its footprint. The lowest-point rule exists to stop a flat
  // base floating at one end, and rotating to the slope solves that properly;
  // keeping both would bury the pad by the full rise of the hill.
  //
  // `route` seats the draw on a ROAD instead of on the lane, and it is the same
  // road the entity's hitbox is boxed against (entityGroundY). Everything below
  // still samples the terrain the same way, because a road rides the terrain's
  // own shape — a slab on a hill still needs its lowest-point seating.
  drawAtGround(ctx, worldX, fn, footW = 0, sink = 0, conformCam = null, route = null) {
    const cx = worldX + footW / 2;
    const conform = conformCam != null && footW > 0;
    const floorAt = route ? (x) => this.routeGroundY(x, route) : (x) => this.groundYAt(x);
    let gy = floorAt(cx);
    const over = footW * (4 / 3) / 2; // drawn half-width, centered on the box
    if (footW > 0 && !conform) {
      gy = Math.max(gy, floorAt(cx - over), floorAt(cx + over));
    }
    ctx.save();
    ctx.translate(0, gy - GROUND_Y + sink);
    if (conform) {
      const rise = this.groundYAt(cx + over) - this.groundYAt(cx - over);
      const angle = Math.atan2(rise, over * 2);
      const sx = cx - conformCam;
      ctx.translate(sx, GROUND_Y);
      ctx.rotate(angle);
      ctx.translate(-sx, -GROUND_Y);
    }
    fn();
    ctx.restore();
  }

  resetRenderInterpolation() {
    this.prevCamX = this.camX;
    this.prevCamZoom = this.camZoom;
    this.prevCamPan = this.camPan;
    this.prevCamFloorY = this.camFloorY;
    this.prevTRun = this.tRun;
    this.prevFinishPlayerX = this.finishPlayerX;
    this.prevIntroRunX = this.introRunX;
  }

  captureRenderInterpolation() {
    this.prevCamX = this.camX;
    this.prevCamZoom = this.camZoom;
    this.prevCamPan = this.camPan;
    this.prevCamFloorY = this.camFloorY;
    this.prevTRun = this.tRun;
    this.prevFinishPlayerX = this.finishPlayerX;
    this.prevIntroRunX = this.introRunX;
  }

  enter() {
    Input.setContext('run');
    const o = this.o;
    this.seed = o.seed ?? ((Math.floor(performance.now()) ^ 0x5eed) >>> 0);
    this.rng = new Rng(this.seed);
    this.fxRng = this.rng.stream('fx');
    this.speechRng = this.rng.stream('speech');
    this.save = o.save;
    const slot = this.save.slot;
    this.bench = slot.bench;
    this.modIds = slot.mods.equipped.slice();
    // OVERTIME has no known length, and RANDOMSWAP corruption is *supposed* to
    // feel unscheduled — both fall back to the endless portal cadence.
    const scheduled = o.stage && !this.overtime && !this.corrupted.includes('randomswap');
    this.relay = new Relay(this.rng.stream('relay'), slot.stats,
      scheduled ? portalSchedule(o.stage.durationSec) : null, o.initialHeroId);
    if (this.corrupted.includes('randomswap')) this.relay.portalEvery = 10;
    this.usedHeroes = new Set([this.relay.current]);
    this.exitSpoken = new Set();   // heroes who have already said their goodbye
    this.player = new Player(this.relay.current, this.modIds);
    // NO JUMPING: the jump button is on strike; it provides a contractual minimum hop.
    this.player.jumpScale = this.corrupted.includes('nojump') ? 0.6 : 1;
    this.powerups = new Powerups(this.bench, this.modIds);
    this.powerups.shieldStack = HERO_BY_ID[this.relay.current].startShield;

    this.camX = 0;
    this.camZoom = ZOOM;
    this.camPan = 0;
    // Which world line the frame pins to screen GROUND_Y. The groundline, until
    // a road carries the hero out of the crane's reach — see updateCamera.
    this.camFloorY = GROUND_Y;
    this.speedBoost = 0;
    this.tRun = 0;
    this.score = 0;
    this.coins = 0;
    this.coinCombo = 0;
    this.powerupsCollected = 0;
    this.coinComboT = 0;
    this.battery = this.maxBattery();
    this.damageTaken = 0;
    this.hitstop = 0;
    this.dead = false;
    this.finished = false;
    this.finaleT = null;        // finish-line hold timer; null = not crossed yet
    this.flipSlide = null;      // pole ride between the catch and the plunger
    this.finishing = false;
    this.finishT = 0;
    this.finishPlayerX = PLAYER_X;
    this.flip = null;           // graded at the breaker; null until contact
    this.flipCoins = null;      // the grade's coin payout, mid-transfer into the pill
    // Off-screen entrance. Defaulted here to the resting anchor so a restart or
    // any early position read is safe; the opener below arms the actual run-in.
    this.introRunning = false;
    this.introRunX = PLAYER_X;
    this.deadT = 0;
    this.failMsg = null;
    this.failDetail = null;     // the counted shortfall, when the line was crossed short
    this.paused = false;
    this.pauseIdx = 0;          // which pause plate the arrows are sitting on
    this.debug = false;

    this.obstacles = [];
    this.pickups = [];
    this.projectiles = [];
    this.chompBites = [];        // eaten obstacle snapshots flying into Chompo's mouth
    this.floaties = [];
    this.goalToasts = [];       // {text, t, t0} — one plug landing, announced once
    // Purchased bench upgrades announce themselves the same way a banked plug
    // does: gold pills sliding in under the health bar, one after another, in
    // place of a full-screen card that froze the opening of the run. Only tiers
    // the player actually bought count — the free base level (Shield/Magnet are
    // owned at level 1) says nothing. Once per run only: enter() re-runs on a
    // death-restart, and a run that dies mid-parade simply drops the rest.
    if (!this.benchAnnounced) {
      this.benchAnnounced = true;
      for (const u of BENCH_UPGRADES) {
        const rank = (slot.bench[u.id] || 0) - u.base;
        if (rank > 0) this.goalToasts.push({ text: `${u.name} ${'I'.repeat(rank)}`, t: 2.4, t0: 2.4 });
      }
    }
    this.goalSeen = { mission: false, challenge: false };
    this.portal = null;         // active portal entity
    this.speech = null;         // {text, t, who}
    this.speechQueue = [];      // follow-up bubbles (relay banter, boss subtitles)
    // Stage openers, once per RunState instance: an ACT card gets a full-screen
    // banner over a frozen world, an authored intro rides the speech bubble, and
    // a stage may carry both (plumber-1 opens the campaign with the act card,
    // then Lorenzo talks over the first seconds of running).
    const opens = !this.demo && !this.overtime && this.stage && !this.introDone;
    const intro = opens ? this.stage.intro : null;
    // The ACT card gets out of the way as the stage becomes familiar, in three
    // steps, measured in plugs banked on THIS stage:
    //
    //   none        the card plays in full and cannot be skipped — this is the
    //               read it exists for
    //   one or two  it still plays, but any button cuts it short
    //   all three   it does not play at all
    //
    // The bar for "seen" is one plug rather than a clear because the toaster
    // banks even on a failed run: a player who died to the first obstacle has
    // still read the card, and should not be held for it again. The bar for
    // retiring it is everything, because a stage with nothing left to earn is
    // being replayed for the running, and an establishing beat in front of that
    // is establishing something the player demonstrably knows.
    // `slot` is the one bound at the top of enter() — already dereferenced
    // there, so it needs no guard of its own here.
    const seen = !!(opens && stagePlayed(slot, this.stage));
    const done = !!(opens && stageAllPlugs(slot, this.stage));
    const act = opens && !done ? this.stage.act : null;
    this.introDone = true;
    this.introFreeze = act ? ACT_BANNER_TIME : 0;
    this.introText = act;
    this.introT = 0; // banner animation clock (tRun is frozen during the freeze)
    this.introSkippable = !!act && seen;
    // The two-button card, on the campaign's opening stage only, on touch only.
    // MANDATORY TRAINING teaches the control surface, but training is optional
    // and skipping it is the common path — so a phone that walks straight into
    // plumber-1 has never been told that the glass itself is the buttons, and
    // the two discs in the corners actively suggest otherwise.
    //
    // It rides in the beat after the ACT card and before the hero runs in:
    // nothing is moving yet, so reading it costs no run, and it is the last
    // thing on screen before the first obstacle. Acts II and III carry a card
    // of their own and are not where anyone learns to play, so this is pinned
    // to the first stage. It retires on the same terms that card does — a stage
    // with every plug banked is being replayed by someone who demonstrably
    // knows where to put their thumb.
    this.zoneCard = !!act && this.stage.id === 'plumber-1' && Input.isTouchDevice();
    this.zoneCardT = 0;
    // Queue this stage's artwork. Normally the briefing has already started it
    // and most of it is built by now; a dev launch that skips the briefing
    // starts it here and drains it across the banner and the run-in instead.
    beginStageArtWarmup(this.cabinet);
    // Off-screen entrance. Armed on the same fresh-entry gate as the card (so a
    // death-restart drops the hero straight onto the anchor), but independent of
    // the card's seen/done fade: it plays on every first entry, card or not. A
    // card holds him out of frame first; then he runs in as it lifts. Reduced
    // motion opts out — the hero simply starts planted at the anchor.
    const runIn = opens && !this.save.settings.reducedMotion && !this.o.skipRunIn;
    this.introRunning = runIn;
    this.introRunX = runIn ? INTRO_RUN_START_X : PLAYER_X;
    // Authored intros can be spoken by a named cast member — including one who
    // is not on this run's team. Ringside commentary still gets a face.
    const bubble = intro ? { text: intro, t: 4.0, who: this.stage.introBy || 'intro' } : null;
    // The opening bubble waits for the hero to reach the anchor — behind a card
    // or not — so its four seconds are four seconds of live running rather than
    // half-spent under a banner's scrim or over an empty entrance. On a run-in it
    // is released by updateIntroRun; with the run-in off (reduced motion) it
    // starts here, since there is no entrance to wait on.
    const bubbleAfterEntrance = bubble && !act && runIn;
    this.introSpeech = (act || bubbleAfterEntrance) ? bubble : null;
    if (bubble && !act && !runIn) this.speech = bubble;
    if (act && !this.save.settings.reducedMotion) shake(3, 0.3);
    this.copter = null;         // chase mission / taunt flyby
    this.tauntT = 30;

    const duration = this.overtime ? Infinity : (this.stage ? this.stage.durationSec : 330);
    this.duration = duration;
    this.distance = 0;
    this.totalDist = this.overtime ? Infinity : duration * this.baseSpeed() * 1.05;

    // ?startAt=N — skip to N% through the stage (dev builds only).
    // Must run before the spawner is created so it pre-fills the right region.
    if (this.devStartPercent > 0 && Number.isFinite(this.totalDist)) {
      this.distance = this.totalDist * this.devStartPercent;
      this.camX = this.distance;
      // Skip the entrance fanfare — the hero starts planted at the anchor.
      this.introRunning = false;
      this.introRunX = PLAYER_X;
      this.introFreeze = 0;
      this.introText = null;
      this.introSpeech = null;
      this.speech = null;
      this.zoneCard = false;
    }

    const react = (this.unplugged || this.corrupted.includes('maxspeed')) ? REACT_FLOOR_MAX : REACT_FLOOR;
    this.spawner = new Spawner({
      cabinet: this.cabinet,
      rng: this.rng.stream('spawn'),
      tierMax: this.overtime ? 2 : Math.min(2, (this.stage ? this.stage.index - 1 : 0) + (this.cabinet.act - 1)),
      react,
      iceSlide: this.cabinet.mechanic === 'ice' ? 14 : 0,
    });
    this.spawner.nextX = 300;
    this.drip = new DripSpawner(this.rng.stream('drip'), this.bench);

    // ---- raised routes: islands and forks ----------------------------------
    //
    // ONE mechanism, two endings. An island and a fork's high road are the same
    // object — a surface above the lane that the hero catches with an ordinary
    // jump — and they differ only in what happens when it runs out. An island
    // STOPS, so you fall off the lip. A fork CONVERGES, ramping back down to
    // meet the ground so the two roads become one again.
    //
    // Both are authored in SECONDS rather than pixels, converted against this
    // stage's own base speed. A jump spans 114px in world 1 and 253 on
    // UNPLUGGED, so a road written as "150px" is one jump long at the start of
    // the game and less than half a jump by the end — the hero would sail
    // straight over it. Seconds keep the beat the same length wherever it is
    // played, which is what the number is actually describing.
    //
    // `rise` is validated against the HEAVY hero, not the average one: Grumpos
    // clears 45.5px against everyone else's 57, and a road only he cannot reach
    // is broken on exactly one eighth of the relay bag. Same instinct as
    // spawner.js's worstAirtime().
    this.route = null;
    // Built by routes.js. It is pure geometry off the cabinet's data and this
    // stage's own length and speed, so the asset gallery can build the very
    // same roads the run does and draw them through the very same painters —
    // which is the only way that page can be trusted not to drift.
    this.routes = (this.bossCab || this.overtime || !Number.isFinite(this.totalDist))
      ? []
      : buildRoutes(this.cabinet, {
        totalDist: this.totalDist,
        speed: this.baseSpeed(),
        groundYAt: (wx) => this.groundYAt(wx),
      });

    // Mission setup.
    this.mission = this.stage ? { ...this.stage.mission, count: 0, done: false } : { type: 'endless', desc: 'RUN. FOREVER. THAT IS THE WHOLE DEAL.' };
    this.challenge = this.stage ? { ...this.stage.challenge, count: 0, done: false, failed: false } : null;
    this.applianceSpawned = false;
    this.applianceGot = false;
    this.fuseHeld = this.mission.type === 'fuse';
    this.missionTimers = { cord: 8, resident: 10, chaseNear: 0 };
    this.escapeWall = this.mission.type === 'escape' ? -140 : null;
    if (this.mission.type === 'chase') this.copter = { x: 380, alt: 60, caught: 0, cooldown: 0 };

    // Checkpoints at 1/3 and 2/3 (none on UNPLUGGED).
    this.checkpoints = (this.oneHit || this.overtime) ? [] : [1 / 3, 2 / 3].map((f) => f * this.totalDist);
    this.checkpointHit = [];
    this.snapshot = null;

    // ?startAt=N — pre-fill the world so the camera doesn't start in empty space,
    // and mark any checkpoints behind us as already reached.
    //
    // The pre-fill obeys the finish wall exactly as the live one does. It used
    // to fill to infinity, which nobody noticed at 30% — but ?finish=3 drops the
    // camera less than a lane's lookahead from the tape, so the one fill that
    // ran laid patterns straight through the finishing straight and parked a
    // crate stack at the foot of the pole. The shortcut for LOOKING at the
    // marker was the only thing that ever put clutter next to it.
    if (this.devStartPercent > 0 && Number.isFinite(this.totalDist)) {
      const startSp = this.baseSpeed();
      const hero = HERO_BY_ID[this.relay.current];
      const stopX = this.finishWorldX() - FINISH_CLEAR;
      this.spawner.nextX = Math.max(this.spawner.nextX, this.camX);
      this.spawner.fill(this.camX, startSp, this.obstacles, this.pickups, () => jumpHeightFor(hero), stopX);
      this.drip.update(0, this.camX, this.pickups, this.oneHit, this.battery >= this.maxBattery(), stopX);
      for (let i = 0; i < this.checkpoints.length; i++) {
        if (this.distance >= this.checkpoints[i]) this.checkpointHit[i] = true;
      }
    }

    this.styleName = this.corrupted.length ? 'pixel' : this.cabinet.style;
    this.style = getStylePack(this.styleName, this.save.settings);
    this.renderSettings = { ...this.save.settings, smoothMotion: true };
    this.mirror = this.corrupted.includes('mirror');

    // Not setBank. The cabinet screen has usually been playing this very song, in its
    // own treatment, since the stage list opened — so this hands that treatment over to
    // the level's mix on the next bar line and keeps the clock: no gap, no restart, the
    // band simply arrives. When nothing was playing it (a dev ?stage= URL, a retry from
    // the results screen) it falls back to exactly the setBank this line used to be.
    const musicSong = this.o.musicSong;
    MusicDirector.enterStage(musicSong?.bank || this.cabinet.music, {
      mixOverride: musicSong?.mix,
      arrangementOverride: musicSong?.arrangement,
      variants: musicSong?.variants,
    });
    // No opening cue here — it fires at the PRESS instead. See levelOpenCue in main.js:
    // enter() runs at the shutter's covered midpoint, which is already a third of a
    // second after the button that caused it, and by the time the swoosh peaked from
    // here the picture had been up for a fifth of a second. The wipe IS the doorway.
    Audio.setDetune(1);
    this.invActive = false;
    this.lastCoinSprayT = -1;
    Audio.setInvincible(false);
    this.rewindFrames.reset();
    this.rewindCaptureT = 0;
    this.rewinding = false;
    this.rewindCooldown = 0;
    this.rewindLockout = 0;
    this.rewindSpeedMul = 1;
    this.rewindFx = new TapeRewindEffect();
    this.narrateT = this.corrupted.includes('narration') || this.unplugged ? 6 : 0;
    // The keyboard legend is a teaching aid, so it only runs while there is
    // something to teach: the campaign's opening stage, or a run with no stage
    // behind it (endless, where nothing came before it either). The bot needs
    // no education, and touch never sees it — those buttons label themselves.
    // A retry re-arms it, which is the one case where asking again is right.
    //
    // Against STAGES[0] rather than "act 1, stage 1": all three Act I cabinets
    // have a stage 1, and a legend that comes back on SPEED ZONE and NEON
    // BLASTERS is teaching a scheme the player has already run a whole cabinet
    // with. The opening stage is a position in the campaign, not a shape.
    const teaching = this.stage ? this.stage.id === STAGES[0].id : true;
    this.hintT = (this.demo || !teaching) ? 0 : HINT_TIME;
    // The BONUS panel's sentence gets one read at the top of every stage, not
    // just the teaching one: it is a different sentence each time, so unlike the
    // key legend there is always something new to say.
    this.bonusT = this.challenge ? BONUS_TIME : 0;
    this.setButtons();
    this.resetRenderInterpolation();
    // Breaker-box bonus: applied exactly once per run (enter() re-runs on retry).
    if (this.startingPowerup) {
      const id = this.startingPowerup;
      this.startingPowerup = null;
      this.powerups.grab(id, { minDuration: 30 });
      Audio.sfx('power');
      // Gold, not the capsule's own colour. This line used to ink itself from
      // POWER_DEFS, which made it the only floatie that picked its colour from
      // the thing it names rather than from what happened — so a reward
      // announced itself in MAGNET's danger red, SHIELD's blue and LOW
      // GRAVITY's purple, three of the four worst contrast pairings in the set.
      // Winning something is a beat landing, and beats landing are gold. The
      // capsule keeps its colour everywhere it actually identifies the capsule:
      // the gauge, the glow and the spark.
      this.floatText(`BREAKER BONUS: ${POWER_DEFS[id].name}`, '#f6d33c');
    }
    setSceneGlow(!this.style.lightBg);
    clearParticles();
  }

  exit() {
    setSceneGlow(false); Input.setContext('default'); Input.setButtons([]); Input.setChromeButtons([]);
    // setContext already dropped the paused screen's borrowed key mapping.
    Audio.setDetune(1); Audio.setInvincible(false);
    // Nothing here changes the song — the results screen deliberately keeps playing it —
    // but a handover still waiting for its bar line has to be settled. See endStage:
    // quit inside the first two bars and it would otherwise land on the results screen.
    MusicDirector.endStage();
  }

  setButtons() {
    this.touchButtons = Input.usingTouch;
    this.chromeMode = chromeGeo.mode;
    // The paused screen is a menu, so it takes the screen's buttons over
    // wholesale: the three play controls have nothing to do while the world is
    // stopped, and leaving JUMP live under a dimmed screen invites a tap that
    // does nothing and reads as a hang. Registered for mouse as well as touch —
    // these are the only controls on this screen a pointer can reach, and a
    // desktop player who paused with the mouse expects to leave the same way.
    if (this.paused) { Input.setButtons(PAUSE_BUTTONS); Input.setChromeButtons([]); this.useChrome = false; return; }
    // Play controls are touch only: keyboard players have SPACE/RIGHT/P/ESC,
    // and the corners hold HUD instead.
    if (!Input.usingTouch) { Input.setButtons([]); Input.setChromeButtons([]); this.useChrome = false; return; }
    // Enough black margin outside the 480x270 rect (renderer.js's chrome
    // geometry) to put JUMP/ABILITY out there instead of over the art. Falls
    // back to the old in-canvas corners on anything too close to 16:9 to have
    // room (chrome.mode === 'none').
    this.useChrome = chromeGeo.mode !== 'none';
    // Mirrors the Escape key exactly: pauses if running, quits if already
    // paused. The 'escape' action already carries that logic — but the second
    // half of it is now unreachable from here, since pausing swaps this
    // button out for the menu above.
    if (this.useChrome) {
      // The ability-name banner (drawAbilityName) reads as a label FOR USE,
      // sitting right next to it — so treating it as a second, generously
      // oversized hit target for the same action (rather than inert text)
      // means a tap that lands on the words still does the right thing.
      // Fixed box, not measured off the label each frame: the widest ability
      // name across every hero (~13 chars) still fits inside it with room to
      // spare, so it never needs to track a value that changes on hero swap.
      Input.setButtons(chromeGeo.mode === 'side'
        ? [{ id: 'abilityName', x: W - 4 - 90, y: TOUCH_SHELF_CY - 9, w: 90, h: 18, action: 'ability' }]
        : []);
      Input.setChromeButtons([
        { id: 'jump', ...chromeGeo.jump, action: 'jump' },
        { id: 'ability', ...chromeGeo.ability, action: 'ability' },
        { id: 'pause', ...chromeGeo.pause, action: 'escape' },
      ]);
      return;
    }
    Input.setChromeButtons([]);
    Input.setButtons(playButtons());
  }

  // Everything that has to follow the pause flag, in one place. The plates
  // replace the play controls (setButtons), the arrows stop meaning jump/duck
  // and start meaning "next plate" (setMenuKeys), and the cursor goes back to
  // CONTINUE — a pause screen that opens on EXIT because that is where you left
  // the highlight last time is a run lost to muscle memory.
  pauseChanged() {
    this.pauseIdx = 0;
    this.setButtons();
    Input.setMenuKeys(this.paused);
  }

  // The paused screen driven by keys/stick: arrow between the plates, ENTER (or
  // the pad's action button) presses the one under the cursor. The plates are
  // Input.buttons, the same list a tap hit-tests and drawPaused paints, so the
  // two ways in cannot drift apart — the keyboard is choosing among the very
  // buttons that are on screen.
  updatePauseMenu() {
    const n = PAUSE_BUTTONS.length;
    if (Input.pressed('up')) { this.pauseIdx = (this.pauseIdx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('down')) { this.pauseIdx = (this.pauseIdx + 1) % n; Audio.sfx('ui'); }
    if (!Input.pressed('confirm')) return;
    Audio.sfx('uiConfirm');
    // Both plates already have an action that does exactly this from a tap —
    // dispatch to the same two behaviours rather than a second copy of them.
    if (PAUSE_BUTTONS[this.pauseIdx].action === 'escape') { this.endRun(false, 'QUIT'); return; }
    this.paused = false;
    this.pauseChanged();
  }

  // One lookup supplies the JUMP/USE label text and the PAUSE glyph for
  // whichever chrome button is being drawn.
  chromeButtonArt(id) {
    if (id === 'jump') return { label: 'JUMP' };
    if (id === 'ability') return { label: 'USE' };
    return { icon: 'pause' };
  }

  // Declares the touch buttons to the chrome dirty-flag layer. The signature
  // captures everything that changes the painted pixels — mode/viewport, the
  // buttons present, the charged state, and the ability cooldown quantized to
  // its painted waterline — so the two steady states (ready, charged) repaint
  // zero times while the recharge sweep still animates. commitChromeFrame
  // (states.js) runs the painter only when this signature changes.
  drawChromeButtons() {
    if (!chromeCtx || !this.useChrome) return;
    const buttons = Input.chromeButtons;
    const charged = !!this.player.relayCharge;
    let sig = `run|${chromeGeo.mode}|${chromeGeo.vw}x${chromeGeo.vh}|${charged ? 1 : 0}`;
    for (const b of buttons) {
      sig += `|${b.id}`;
      if (b.id === 'ability') {
        const frac = roundButtonOpts(this, { id: 'ability' }).frac;
        sig += `:${frac == null ? -1 : Math.round(frac * b.r * 2)}`;
      }
    }
    paintChrome(sig, (ctx) => {
      for (const b of buttons) {
        const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, id: b.id, round: true, ...this.chromeButtonArt(b.id) };
        const base = roundButtonOpts(this, box);
        const chargedB = b.id === 'ability' && this.player.relayCharge;
        // External controls should be findable without becoming chrome the
        // player stares at. They retain a faint rim and label against the black
        // margin, with a little extra presence only for a banked charge.
        drawRoundButton(ctx, box, {
          ...base,
          fill: b.id === 'ability' ? base.fill : 'rgba(255,255,255,0.06)',
          ink: b.id === 'ability' ? base.ink : 'rgba(255,255,255,0.42)',
          ring: b.id === 'ability' ? base.ink : 'rgba(255,255,255,0.22)',
          ringWidth: 1,
          labelScale: 1.45,
          labelStyle: 'ui',
        });
      }
    });
  }

  // The in-canvas ability "donut" (drawHud) never draws for touch at all — the
  // USE disc shows its own recharge instead — so without this, a touch player
  // has no way to see which power is even equipped. Drawn on the game canvas
  // itself (not #chrome), bottom-right where USE sits just outside that
  // corner — same plate-and-text look every other HUD readout uses (see
  // hud.js's gauge() labels), not bare floating text. Landscape ('side') only:
  // 'topbottom' mode's bottom-center spot is too narrow at a readable size to
  // be worth the clutter.
  drawAbilityName(d) {
    if (!this.useChrome || chromeGeo.mode !== 'side') return;
    const label = HERO_BY_ID[this.relay.current].ability.label;
    const scale = 0.8, PADX = 5, LH = 13;
    const w = textWidth(label, scale, 'bold') + PADX * 2;
    const x = W - 4 - w, midY = TOUCH_SHELF_CY;
    drawPanel(d, x, midY - LH / 2, w, LH, 4, undefined, { border: UI_PANEL_BORDER, shadow: true });
    drawText(d, label, x + PADX, textYForMid(midY, scale), '#c8e0ff', scale, 'bold');
  }

  maxBattery() {
    if (this.oneHit) return 1;
    return 4 + (this.modIds.includes('storebrand') ? 1 : 0);
  }

  baseSpeed() {
    return BASE_SPEED * (1 + (this.cabinet.speedBonus || 0)) *
      (this.stage?.speedMult ?? 1) *
      (this.corrupted.includes('maxspeed') ? 1.35 : 1) *
      (this.save.settings.assistSpeed / 100);
  }

  get speed() {
    const hero = HERO_BY_ID[this.relay.current];
    const ramp = this.overtime
      ? 1 + 0.045 * Math.sqrt(this.tRun)
      : 1 + SPEED_RAMP_K * Math.sqrt(this.tRun);
    const capped = Math.min(this.overtime ? 2.4 : SPEED_RAMP_CAP, ramp);
    return this.baseSpeed() * hero.speedMult * capped * (1 + this.speedBoost) * this.powerups.speedMultiplier() *
      (this.player.dashT > 0 ? 1.8 : this.player.rollT > 0 ? 1.25 : this.player.stumbleT > 0 ? 0.72 : 1);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.finished) { Input.endFrame(); return; }
    this.captureRenderInterpolation();
    // The marker's own clock, advanced on EVERY path including the finale hold.
    // The cloth's frame index used to come off tRun, which deliberately stops
    // when the hold starts — so the flag froze mid-wave at the exact moment the
    // hold exists to show it off. A flag that stops moving the instant it is
    // raised reads as a picture of a flag.
    this.markerT = (this.markerT || 0) + dt;
    // Finish-tape beat: the world holds while the stage-clear card plays,
    // then the attempt resolves. Sits above the finishing dispatch — the
    // tape-cross in updateFinish arms it.
    if (this.finaleT != null) {
      this.finaleT -= dt;
      updateShake(dt, () => this.fxRng.float());
      // The hold is a beat, not a freeze-frame. It used to be 0.25s, short
      // enough that a parked particle field read as a held pose; the flip
      // stretches it to as much as 1.15s, and a second of motionless sparks off
      // a lever that never finishes swinging reads as a hang. So the two things
      // that are still playing get their time: the throw and its debris.
      // The slide comes first and the chain waits for it: flip.t is the payoff
      // chain's clock, and nothing should be flipping while the hero is still
      // coming down the pole. Catching high therefore costs you a longer slide
      // before the same payoff, which is the grade being paid in TIME as well
      // as in points — the one thing a bigger number cannot say on its own.
      if (this.flipSlide) {
        const sl = this.flipSlide;
        sl.t += dt;
        const p = Math.min(1, sl.t / sl.dur);
        // How much of the grip he has taken. It comes on fast (the catch is an
        // event, not a transition) but not instantly, so the arms are seen
        // travelling up onto the pole; on the walk-up path it waits out the hop,
        // because there is nothing to hold until he is off the ground. It lets
        // go over the last of the ride, which is what turns the cling back into
        // a landing pose as his feet find the cap.
        const grab = Math.min(1, Math.max(0, (p - sl.hop) / 0.14));
        this.player.cling = grab * (1 - Math.max(0, (p - 0.86) / 0.14));
        if (p < sl.hop) {
          // The hop. Only the walk-up path has one: he was never in the air, so
          // he gives himself the small jump the slide needs to exist at all.
          // Eased OUT, because a hop decelerates into its own peak.
          const h = p / sl.hop;
          this.player.y = PLUNGER_REST + (sl.from - PLUNGER_REST) * (1 - (1 - h) * (1 - h));
          this.player.clingRide = 0;
        } else {
          // The ride down. Accelerating, because it is a fall with hands on the
          // pole rather than a lift being lowered — and it ends on the CAP, not
          // on the floor. He finishes the stage standing on the thing he came
          // down to press.
          //
          // Integrated from SLIDE_ACCEL rather than eased across the ride, so
          // the speed at any moment is the speed the fall has actually earned
          // by then. sl.ride was solved from the same numbers, so the fall
          // lands exactly on the cap as the clock runs out; the clamp is for
          // the frame that steps a hair past it.
          const d = (p - sl.hop) / (1 - sl.hop);
          const rt = d * sl.ride;
          const fallen = Math.min(sl.from - PLUNGER_REST,
            SLIDE_V0 * rt + 0.5 * SLIDE_ACCEL * rt * rt);
          this.player.y = sl.from - fallen;
          // How far DOWN the pole he is, for the painter. `cling` says he is
          // holding it; this says where in the ride he is, and it is what lets
          // the pose develop — knees bending as the cap comes up, the grin
          // opening — instead of switching on whole at the catch.
          this.player.clingRide = d;
        }
        if (p >= 1) {
          this.player.y = this.plungerSeat(0);
          this.flipSlide = null;
          this.player.cling = 0;   // hands off; the celebrate pose owns him now
          this.player.clingRide = 0;
          Audio.sfx('land');
        }
      } else if (this.flip) {
        const was = this.flip.t;
        this.flip.t += dt;
        // The click is the cap BOTTOMING OUT, not the hero arriving: those are
        // a sixth of a second apart, and a latch that fires early reads as a
        // different object making the noise. Caught as a threshold crossing on
        // the chain's own clock rather than scheduled ahead, so it cannot drift
        // if the hold is retimed or a frame is dropped.
        const bottom = 0.09 * FLIP_THROW;
        if (was < bottom && this.flip.t >= bottom) Audio.sfx('clickHard');
        // Standing ON the plunger, so his feet ride its travel: it gives under
        // his weight, springs back a little past where it settles, and he goes
        // with it. Reading the cap's own height rather than tweening the hero
        // separately is what keeps the two from drifting apart — there is one
        // number and both of them use it.
        this.player.y = this.plungerSeat(Math.min(1, this.flip.t / FLIP_THROW));
      }
      this.updateFlipCoins(dt);
      updateParticles(dt);
      for (const f of this.floaties) { f.t -= dt; f.y -= FLOAT_RISE * dt; }
      if (this.finaleT <= 0) this.endRun(true);
      Input.endFrame(); return;
    }
    // Dying during the finish run falls through to the death handler below, so
    // the hit freeze plays and then updateDead resolves the attempt as usual.
    // Without the `dead` guard this branch owns every remaining frame forever:
    // updateFinish bails on `dead` before the tape check, so deadT never
    // advances, nothing ever ends the run, and the hero slides off the right of
    // a frozen camera. The final stretch is live — it has to be survivable AND
    // losable.
    if (this.finishing && !this.dead) { this.updateFinish(dt); Input.endFrame(); return; }
    // Dev: auto-finish after a time cap. Measured while the run is live (not
    // paused, dead, or on the finish tape).
    if (this.devMaxTime > 0 && !this.dead && !this.finishing) {
      this.devRunTime += dt;
      if (this.devRunTime >= this.devMaxTime) { this.endRun(true, 'TIME CAP'); Input.endFrame(); return; }
    }
    // First touch mid-run, or a rotation that flips which margin (if any) has
    // room for chrome buttons — either needs the button set rebuilt.
    if (Input.usingTouch !== this.touchButtons || chromeGeo.mode !== this.chromeMode) this.setButtons();
    if (Input.pressed('mute')) { this.save.settings.muted = !this.save.settings.muted; Audio.setMuted(this.save.settings.muted); this.save.persist(); }
    if (Input.pressed('debug')) this.debug = !this.debug;
    const wasPaused = this.paused;
    if (Input.pressed('escape')) {
      if (this.paused) { this.endRun(false, 'QUIT'); Input.endFrame(); return; }
      this.paused = true;
    }
    if (Input.pressed('pause')) this.paused = !this.paused;
    // Pausing and resuming swap the whole input scheme (play controls <-> the
    // two menu plates), so any path that flips the flag has to re-register here
    // rather than each caller remembering to.
    if (this.paused !== wasPaused) this.pauseChanged();
    // Scene bloom brightens anything above ~0.8 luma. On paper-white packs
    // that is the WHOLE background, so the bloom clips it to pure white and
    // erases the linework. Those packs opt out.
    setSceneGlow(!this.paused && !this.dead && !this.style.lightBg);
    if (this.paused) {
      // No tap-anywhere-to-resume. It existed because touch had no resume
      // button; now CONTINUE and EXIT are both on screen, and a stray tap that
      // silently un-pauses the run is a way to lose one, not a shortcut.
      this.updatePauseMenu();
      Input.endFrame();
      return;
    }
    // Nothing the player controls is moving until the run-in ends, so this is
    // the budget the artwork gets. Two milliseconds a frame leaves the banner
    // and the card their own frame time; if the queue is still going when play
    // starts it simply falls back to being built on demand, as it always was.
    if (artWarmupPending() && (this.introFreeze > 0 || this.zoneCard || this.introRunning)) {
      const at = updateProfileMark();
      stepArtWarmup(2);
      updateProfileAdd('warmupMs', at);
    }
    // ACT banner: hold the world still so the milestone lands before the run.
    // Shake still ticks — the glitch jolt belongs to the banner, not after it.
    if (this.introFreeze > 0) {
      this.introFreeze -= dt; this.introT += dt;
      updateShake(dt, () => this.fxRng.float());
      // A replayer can cut the card short. Every button, not a designated one:
      // the card is not a menu, and a player reaching to skip it should not have
      // to find the right key. On touch this arrives as 'pointer' from anywhere
      // on the glass — and the stray 'jump' a run-context tap also fires is
      // cleared by the endFrame below, so skipping never leaks a hop into the
      // first frame of the run.
      if (this.introSkippable && this.introFreeze > ACT_BANNER_FADE
          && (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer'))) {
        this.introFreeze = ACT_BANNER_FADE;
        Audio.sfx('uiConfirm');
      }
      // The card owned the freeze; the moment it lifts, the run-in takes over
      // (see below) and the hero sprints in. Only when there is no run-in to
      // wait on — reduced motion drops him straight onto the anchor — does the
      // waiting bubble get the screen here instead of at the end of the entrance.
      // The zone card, when there is one, is between the two: it hands the
      // bubble on itself, so nothing is spoken underneath it.
      if (this.introFreeze <= 0 && this.introSpeech && !this.introRunning && !this.zoneCard) {
        this.speech = this.introSpeech;
        this.introSpeech = null;
      }
      Input.endFrame(); return;
    }
    // The two-button card. Holds everything still until it is acknowledged —
    // this is the one screen in the game whose entire job is to be read, and a
    // timed one would expire under a player still working out that the glass is
    // the button.
    if (this.zoneCard) { this.updateZoneCard(dt); Input.endFrame(); return; }
    // Off-screen entrance: with any card lifted, the hero runs in from the left
    // to the anchor while the world holds still. The level does not go live
    // until he arrives — gameplay is everything below this gate.
    if (this.introRunning) { this.updateIntroRun(dt); Input.endFrame(); return; }
    if (this.hitstop > 0) { this.hitstop -= dt; Input.endFrame(); return; }
    if (this.dead) { this.updateDead(dt); Input.endFrame(); return; }

    // Rewind: hold Left Arrow / A to reverse time. On release, a cooldown
    // ramps forward speed from ~0 back to normal so the character's walk
    // cycle starts slow and accelerates — in step with the tape-stop audio.

    if (Input.held('left') && this.rewindFrames.length > 0 && this.rewindLockout <= 0) {
      // Arm on first frame of hold (or if re-pressing during cooldown).
      if (!this.rewinding || this.rewindCooldown > 0) { Audio.setRewinding(true); this.rewindFx.start(); }
      this.rewinding = true;
      this.rewindCooldown = 0;
      this.rewindSpeedMul = 1; // not used during hold (we return early)
      // Pop at full rewind speed.
      const toPop = Math.min(REWIND_SPEED, this.rewindFrames.length);
      for (let i = 0; i < toPop; i++) {
        const snap = this.rewindFrames.pop();
        if (i === toPop - 1) this.restoreRewindSnapshot(snap);
      }
      this.rewindCaptureT = 0;
      this.rewindFx.tick(dt);
      Input.endFrame();
      return;
    }

    // Release edge: arm the cooldown. Save the capture position now so the
    // tape-stop reads the audio that was playing right at the moment of release
    // (music + reversed SFX at full volume), not silent pre-rewind audio.
    if (this.rewinding && this.rewindCooldown <= 0) {
      this.rewindCooldown = REWIND_COOLDOWN;
      Audio.setRewindPos();   // snapshot capture cursor for tape-stop
      Audio.setRewinding(false);
      this.rewindFx.stop();
    }

    // Cooldown: let forward simulation run with a ramping speed multiplier.
    // The squared curve (starts slow, accelerates) matches the tape-stop
    // audio envelope so the walk cycle and camera move in step with the sound.
    if (this.rewindCooldown > 0) {
      this.rewindCooldown = Math.max(0, this.rewindCooldown - dt);
      const t = 1 - this.rewindCooldown / REWIND_COOLDOWN; // 0→1
      this.rewindSpeedMul = t * t; // squared: slow start, fast finish
      if (this.rewindCooldown <= 0) {
        this.rewinding = false;
        this.rewindSpeedMul = 1;
        this.rewindLockout = REWIND_LOCKOUT;
      }
      this.rewindFx.tick(dt);
      // Fall through — forward simulation runs with scaled speed.
    } else {
      this.rewindSpeedMul = 1;
    }

    // Done. Reset.
    this.rewinding = false;
    this.rewindCooldown = 0;
    if (this.rewindLockout > 0) this.rewindLockout -= dt;
    if (this.rewindFx.visible) this.rewindFx.tick(dt);

    // Invincibility winds tempo and pitch up a whole tone together, where the
    // pitch shift is the point. A speed burst leans on the tempo ALONE: the key
    // stays put, so the track reads as the same song played harder rather than
    // as the star's electrified one, and the two stack without either gimmick
    // eating the other.
    const star = this.powerups.isInvincible() ? 1.08 : 1;
    Audio.setWarp(star * this.powerups.musicTempoMultiplier(), star);
    const wdt = dt;   // world time (the hit-jolt affects world, not score accrual)

    this.tRun += wdt;
    // Run time, not wall time: the legend should not burn down behind a pause
    // screen or an ACT banner, both of which return before this line.
    if (this.hintT > 0) this.hintT -= wdt;
    if (this.bonusT > 0) this.bonusT -= wdt;
    const hero = HERO_BY_ID[this.relay.current];

    // Movement / camera.
    const sp = this.speed * this.rewindSpeedMul;
    this.camX += sp * wdt;
    this.distance = this.camX;
    this.updateCamera(wdt);
    if (this.speedBoost > 0) this.speedBoost = Math.max(0, this.speedBoost - wdt * 0.6);

    // Score accrual (real time).
    const sMult = hero.scoreMult * this.powerups.scoreMult() * (this.modIds.includes('crayon') ? 0.95 : 1);
    this.score += 10 * (sp / BASE_SPEED) * sMult * dt;

    // Inputs. The borrowed Air Jump applies before the button edge is read so
    // a capsule caught while airborne is useful on the very next frame.
    this.player.powerJumpBonus = this.powerups.bonusJumps();
    if (Input.pressed('jump')) {
      const ok = this.player.jumpPressed(Audio);
      if (ok) this.player.jumpFace = rollJumpFace(this.fxRng, this.player.jumpFace);
      if (ok && this.player.jumps > 1) burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 6, 40, 0.4, '#ffa8b6', 1, 60, () => this.fxRng.float());
      if (this.mission.type && this.challenge && this.challenge.type === 'onbeat') this.checkOnBeat();
    }
    if (Input.pressed('duck') && this.challenge && this.challenge.type === 'onbeat') this.checkOnBeat();
    if (Input.pressed('ability')) this.useAbility();

    // Player physics. (jumpScale survives hero swaps)
    this.player.jumpScale = this.corrupted.includes('nojump') ? 0.6 : 1;
    // Where the feet were BEFORE the step, for the island sweep below. Taken
    // against the base ground on purpose: it is the frame of reference both
    // sides of the test share, whichever route the hero is on.
    const prevFeetY = this.routeGroundY(this.playerWorldX(), this.route) - this.player.y;
    const res = this.player.update(wdt, Input, {
      speed: sp, ice: this.cabinet.mechanic === 'ice', gravityScale: this.powerups.gravityMultiplier(),
    });
    const tookIsland = this.routes.length ? this.updateRoute(prevFeetY) : false;
    if (res.landed || tookIsland) {
      Audio.sfx('land');
      burst(this.camX + PLAYER_X + 6, this.playerGroundY(), 5, 30, 0.3, '#c8b898', 1, 40, () => this.fxRng.float());
      if (res.stompLand) { shake(2, 0.15); this.stompBreak(); }
    }
    if (this.player.grounded && Math.floor(this.player.anim) % 4 === 0 && this.fxRng.chance(0.1)) {
      spawn(this.camX + PLAYER_X, this.playerGroundY() - 1, -30, -10, 0.4, '#c8b898', 1, 30);
    }

    // Systems.
    this.relay.update(wdt);
    this.powerups.update(dt);
    this.updateInvincibility(dt);
    this.updatePortal(wdt);
    this.updateEntities(wdt, sp);
    this.updateProjectiles(wdt, sp);
    this.updateMission(wdt);
    this.updateCoinMagnet(wdt);
    this.updateTaunts(wdt);
    // Leave the final approach clean: nothing new is allowed to appear past
    // the breaker, and the finish run itself has no hazards or pickups.
    if (this.overtime || this.camX + W + 200 < this.finishWorldX()) {
      const spawnAt = updateProfileMark();
      this.spawner.fill(this.camX, sp, this.obstacles, this.pickups, () => jumpHeightFor(hero),
        this.overtime ? Infinity : this.finishWorldX() - FINISH_CLEAR);
      this.drip.update(wdt, this.camX, this.pickups, this.oneHit, this.battery >= this.maxBattery(),
        this.overtime ? Infinity : this.finishWorldX() - FINISH_CLEAR);
      updateProfileAdd('spawnMs', spawnAt);
    }
    this.spawnApplianceMaybe();
    if (this.routes.length) { this.spawnRoutePrizes(); this.clearRouteHazards(); this.spawnRouteEntries(); }
    // Swept every frame, not just on the frame the portal appears: the drip
    // capsule and the appliance both spawn at their own clock a little further
    // out than the portal does, so either can land in the column afterwards.
    if (this.portal && this.portal.spent == null && this.portal.wilt == null) {
      this.clearPortalLane(this.portal.x);
    }
    this.checkCheckpoints();
    this.collide();

    if (this.coinComboT > 0) { this.coinComboT -= dt; if (this.coinComboT <= 0) this.coinCombo = 0; }
    for (const f of this.floaties) { f.t -= dt; f.y -= FLOAT_RISE * dt; }
    this.floaties = this.floaties.filter((f) => f.t > 0);
    this.updateChompBites(dt);
    if (this.goalToasts.length) {
      this.goalToasts[0].t -= dt;
      if (this.goalToasts[0].t <= 0) this.goalToasts.shift();
    }
    if (this.speech && (this.speech.t -= dt) <= 0) this.speech = this.speechQueue.shift() || null;

    updateParticles(dt);
    updateShake(dt, () => this.fxRng.float());
    // The finish is a full-height plane, not a physical doorway: jumping must
    // never let the player sail past it. Crossing always ends the attempt;
    // missions that are still incomplete fail here instead of leaving the
    // finish marker behind while the run continues indefinitely.
    if (!this.overtime && this.distance >= this.finishCameraX() && this.missionSatisfied()) {
      this.startFinishRun();
    } else if (!this.overtime && this.distance >= this.totalDist) {
      this.failMsg = 'MISSION INCOMPLETE';
      this.failDetail = this.missionShortfall();
      this.endRun(false, 'MISSION INCOMPLETE');
    }
    // Record a snapshot on the fixed cadence for rewind. Do this after all
    // forward simulation so the snapshot captures the frame's output state.
    this.recordRewindFrame(dt);
    Input.endFrame();
  }

  // Progress on a counted mission. The win check and the shortfall printed on
  // the results screen both read it, so the number you failed by is always the
  // number that was being tested.
  missionCount() {
    const m = this.mission;
    switch (m.type) {
      case 'chase': return this.copter ? this.copter.caught : 0;
      // Residents still in tow count: checkpoints stop at 2/3 distance (and
      // don't exist at all on one-hit runs), so carrying them across the
      // finish must satisfy the mission or late pickups soft-lock the run.
      case 'rescue': return m.count + this.pickups.filter((p) => p.live && p.def.resident && p.following).length;
      default: return m.count ?? 0;
    }
  }

  missionSatisfied() {
    // Crash test runs the level with no input at all, so objective missions
    // could never clear and would fail at the line instead of showing a finish.
    if (this.devForceMission) return true;
    // Only the counted types carry an `n`. reach/fuse/blackout/escape have none:
    // surviving to the socket is the win.
    return !this.mission.n || this.missionCount() >= this.mission.n;
  }

  // "TARGETS 4/6" — what the run was short by, in the words the GOAL panel was
  // using all along. The four types that can reach the line unsatisfied are
  // exactly the four the HUD prints by their raw name, so there is no label
  // table to keep in step with hud.js.
  missionShortfall() {
    const m = this.mission;
    return m.n ? `${m.type.toUpperCase()} ${this.missionCount()}/${m.n}` : '';
  }

  finishWorldX() { return this.totalDist + PLAYER_X; }
  finishCameraX() { return this.finishWorldX() - finishLineX(); }
  // Where the tape sits on screen. finishLineX() exactly when the finish run
  // arms, and nearer than that when the objective was only met after the camera
  // had already carried the pole part of the way in — a late rescue is allowed
  // to shorten the victory lap, but it must not make the pole jump back out to
  // a constant the moment the hero starts running at it.
  finishScreenX() { return this.finishWorldX() - this.camX; }
  // The hero's drawn screen column. Fixed at PLAYER_X through normal play, but
  // the two scripted runs move it: the finish dash carries it right toward the
  // tape, the opening run-in carries it up from off the left edge. Every
  // position consumer (world x, hitbox, draw) reads it here so all three agree.
  heroScreenX() {
    if (this.finishing) return this.finishPlayerX;
    if (this.introRunning) return this.introRunX;
    return PLAYER_X;
  }
  playerWorldX() { return this.camX + this.heroScreenX(); }
  playerBox() {
    return this.player.box(this.camX, this.playerGroundY(), this.heroScreenX());
  }

  // The two-button card, held between the ACT card and the entrance. Nothing
  // ticks here but the card's own clock — the world is parked, the hero has not
  // walked on yet, and the run's timer has not started, so a player who stops to
  // read this pays nothing for it.
  //
  // Any tap continues, from anywhere, including the discs: on a screen whose
  // whole message is "all of this is a button", a card that then demanded one
  // particular button would be arguing with itself. The one exception is PAUSE,
  // which is a real control and is left to do its job.
  updateZoneCard(dt) {
    this.zoneCardT += dt;
    // The ACT card's glitch jolt is normally spent inside its own freeze, but a
    // skipped card can hand one over mid-decay — and a shake that stops ticking
    // is a world left sitting at an offset for as long as this card is up.
    updateShake(dt, () => this.fxRng.float());
    // A short arm, so the tap that skipped the ACT card cannot roll straight
    // through this one on the frame it appears — the card would blink past and
    // the player would never know what they missed.
    if (this.zoneCardT < ZONE_CARD_ARM) return;
    if (!(Input.pressed('pointer') || Input.pressed('jump') || Input.pressed('ability')
          || Input.pressed('confirm'))) return;
    this.zoneCard = false;
    Audio.sfx('uiConfirm');
    // Same handoff the ACT card makes: the waiting bubble goes up now only if
    // there is no entrance to spend it behind.
    if (this.introSpeech && !this.introRunning) {
      this.speech = this.introSpeech;
      this.introSpeech = null;
    }
  }

  // Opening run-in: the hero runs himself onto the stage while the WORLD holds
  // still — camera parked, nothing spawning, no hazards, so the entrance is never
  // a place to die. But it is not a cutscene: jump and the hero's ability are
  // read live, exactly as they are on the finish dash, so an eager player is met
  // with a hop or a shot rather than a dead frame. Only the world is frozen; the
  // hero and what he fires stay alive. The level goes live (update falls through
  // past the introRunning gate) the instant he reaches the anchor.
  updateIntroRun(dt) {
    // Speed ramps with how far across the apron he is: slow off the edge, full
    // by the start line, curved by INTRO_RUN_EXP so the wind-up reads as an
    // exponential surge rather than an even glide. The run cycle is fed the same
    // speed, so the stride winds up in step with the travel.
    const full = this.baseSpeed();
    const p = Math.max(0, Math.min(1,
      (this.introRunX - INTRO_RUN_START_X) / (PLAYER_X - INTRO_RUN_START_X)));
    const sp = full * (INTRO_RUN_SLOW + (1 - INTRO_RUN_SLOW) * Math.pow(p, INTRO_RUN_EXP));
    this.introRunX = Math.min(PLAYER_X, this.introRunX + sp * dt);

    // Live input. tRun and powerup timers deliberately do NOT advance — the
    // legend and any starting powerup belong to the run, not to the walk-on —
    // but the buttons that shape the hero do. Real Input (not a null stub) so a
    // held jump gives its full arc and a duck reads through. sp is fed as the
    // run-cycle speed so the legs match the accelerating travel.
    this.player.powerJumpBonus = this.powerups.bonusJumps();
    if (Input.pressed('jump') && this.player.jumpPressed(Audio)) this.player.jumpFace = rollJumpFace(this.fxRng, this.player.jumpFace);
    if (Input.pressed('ability')) this.useAbility();
    const res = this.player.update(dt, Input, {
      speed: sp, ice: this.cabinet.mechanic === 'ice', gravityScale: this.powerups.gravityMultiplier(),
    });
    if (res.landed) Audio.sfx('land');
    // Keep whatever he fired alive and framed. The world is parked, so shots
    // travel on their own velocity only (scroll term 0); no collide() — there is
    // nothing on this apron to hit, and nothing may hit him.
    this.updateProjectiles(dt, 0);
    this.updateChompBites(dt);
    this.updateCamera(dt);
    updateParticles(dt);
    updateShake(dt, () => this.fxRng.float());

    if (this.introRunX >= PLAYER_X) {
      this.introRunX = PLAYER_X;
      this.introRunning = false;
      // The hero is home: hand the held-back opening bubble to the live run so
      // it talks over running, not over an empty stage.
      if (this.introSpeech) { this.speech = this.introSpeech; this.introSpeech = null; }
    }
  }

  // Where this hero's feet have to sit for the celebration to land ON the cap
  // rather than through it.
  plungerSeat(thrown) {
    const dip = CELEBRATE_DIP[this.relay.current] || 0.043;
    return plungerStandY(thrown) + dip * HERO_DRAW_H;
  }

  startFinishRun() {
    if (this.finishing) return;
    this.finishing = true;
    this.finishT = 0;
    this.finishPlayerX = PLAYER_X;
    // The final stretch remains part of the level. Keep anything the player
    // can still reach before the tape, but never show content beyond it.
    //
    // The wall is the TAPE, not the clear lane. FINISH_CLEAR is a placement
    // rule — it tells the spawners where they may stop laying track — and
    // enforcing it retroactively deleted things that were already on screen
    // and already in front of the player, so a battery that scrolled in
    // perfectly legibly vanished the instant the finish armed. Anything this
    // side of the tape stays and stays collectable; the finish run is live, so
    // "still reachable" is the truth here, not a courtesy.
    //
    // Past the tape is the only thing that goes, and it goes because the draw
    // gate already refuses to paint it (see the finishX gate in draw) and the
    // run ends before the hero gets there. Same wall as that gate, deliberately:
    // the sweep may only remove what was never visible in the first place.
    const finishX = this.finishWorldX();
    this.obstacles = this.obstacles.filter((ob) => ob.x < finishX);
    this.pickups = this.pickups.filter((p) => p.x < finishX);
    this.projectiles = [];
    this.chompBites = [];
    this.portal = null;
    this.copter = null;
    this.floaties = [];
  }

  updateFinish(dt) {
    const wdt = dt;
    this.finishT += wdt;
    this.tRun += wdt;
    const sp = this.speed;
    this.powerups.update(dt);
    this.updateInvincibility(dt);
    this.player.powerJumpBonus = this.powerups.bonusJumps();
    if (Input.pressed('jump') && this.player.jumpPressed(Audio)) this.player.jumpFace = rollJumpFace(this.fxRng, this.player.jumpFace);
    if (Input.pressed('ability')) this.useAbility();
    const res = this.player.update(wdt, Input, {
      speed: sp, ice: this.cabinet.mechanic === 'ice', gravityScale: this.powerups.gravityMultiplier(),
    });
    if (res.landed) Audio.sfx('land');
    // The world and goal are stationary; the player alone runs across the
    // screen. The final stretch remains live: hazards, pickups and attacks
    // use this moving world position just as they do during normal scrolling.
    this.finishPlayerX += sp * wdt;
    this.updateCamera(wdt);
    this.updateEntities(wdt, sp);
    this.updateProjectiles(wdt, sp);
    this.updateChompBites(dt);
    this.collide();
    if (this.dead) return;
    updateParticles(dt);
    updateShake(dt, () => this.fxRng.float());
    // Where the dash ends: the hero's CENTRE standing on the plunger's centre.
    // finishPlayerX is the left edge of his 12px slot and his drawing is centred
    // HERO_CENTER_OFF further on (see drawHeroSprite), so the comparison and the
    // snap both have to carry that term — matched against the raw edge, he
    // parked half a slot right of the cap, which is what the celebration looked
    // like it was standing beside rather than on.
    const seatX = this.finishScreenX() + PLUNGER_CX - HERO_CENTER_OFF;
    if (!this.flip && this.finishPlayerX >= seatX) {
      // SNAPPED, not left wherever this frame's step happened to fall. He rides
      // the pole down standing on this cap and then celebrates on it, and both
      // are drawn from his centre — a frame-rate-dependent pixel or two of
      // drift puts him visibly off the thing he is standing on, and the reach
      // that has to land on the mast is measured from here too.
      this.finishPlayerX = seatX;
      // The frozen camera is deliberately short of the goal; the hero's
      // screen-space run completes the remaining distance.
      this.distance = this.totalDist;
      // The pole ends UNPEELABLE with the stage, whatever is left on its clock.
      // It is a survival power and there is nothing left to survive: from this
      // frame the world holds and nothing can reach him. What would carry on is
      // the star mix — the finale hold never calls updateInvincibility, so a
      // capsule grabbed late ducked the music under the whole celebration and
      // handed the results screen a warped bank.
      this.endInvincibility();
      if (this.demo) { this.endRun(true); return; } // attract clips stay snappy
      // A beat on the finish frame, then results. Transient chatter would
      // clutter the held frame — clear it. The flip's own card is written
      // after the clear, so it survives into the held frame as the only thing
      // on it.
      this.speech = null;
      this.speechQueue = [];
      this.floaties = [];
      this.resolveFlip();
      // The slide. resolveFlip has already graded the CATCH — it reads
      // player.y, so it must run before anything here moves the hero — and from
      // that point the hero is on the pole, riding down to the plunger. The
      // plunger is what fires the chain, so a jump now reaches the trigger the
      // only way it physically could.
      //
      // BOTH paths slide, because both paths have to end with the plunger
      // visibly depressed and the hero standing on it. Airborne, he catches the
      // pole wherever he is and rides down. On foot he hops straight up a little
      // above the cap and rides down from there — a short slide instead of no
      // slide, which keeps the ending one gesture rather than two. He is still
      // graded on the catch, so the hop earns him nothing: that is the CLUNK.
      //
      // The descent hangs off the JUMP pose with `cling` blended over it (see
      // CLING in toons.js): one hand on the pole above the head, the other arm
      // dangling, and the idle's own legs lifted and leaned. Front-on, because
      // the celebration this hands off to is front-on and a hero who rides down
      // in profile and lands facing you has swapped bodies on the last frame.
      const caught = Math.max(this.player.grounded ? 0 : this.player.y, 0);
      // The hop's own height, for the walk-up: enough above the cap to read as
      // a deliberate little jump onto it rather than a stumble.
      const from = this.player.grounded ? PLUNGER_REST + 16 : Math.max(caught, PLUNGER_REST + 6);
      // The ride is the only part that is timed: it is a fall of a known
      // distance at a known acceleration, so there is exactly one answer for
      // how long it takes (see SLIDE_ACCEL). A catch happens between about 26
      // and 57 pixels up — that is the whole range the cast can reach — which
      // is 15 to 46 pixels of pole, and this turns that into a bit over a third
      // of a second against a bit over two thirds. Nothing is clamped, because
      // nothing needs to be: a short fall being short IS the read.
      const ride = slideTime(from - PLUNGER_REST);
      const hopT = this.player.grounded ? SLIDE_HOP_T : 0;
      this.flipSlide = {
        from,
        t: 0,
        ride,
        // `hop` is the fraction of the move spent going UP. Zero when he is
        // already airborne — there is nothing to hop, he is holding the pole.
        hop: hopT / (hopT + ride),
        dur: hopT + ride,
      };
      // The whistle covers the DESCENT only, so it starts when he starts coming
      // down — on the hop path that is after the rise, or the sound describes a
      // fall that has not begun.
      Audio.sfx('slideWhistle', { dur: ride, when: hopT });
      this.finaleT = FINALE_HOLD + this.flip.band.hold + FINALE_TAIL
        + (this.flipSlide ? this.flipSlide.dur : 0);
    }
    // Post-contact: the hold is running, the lever is swinging. Nothing else
    // to simulate — update()'s finaleT branch owns the frame from here.
  }

  // The stage's last input, graded. Called on the frame the hero reaches the
  // breaker: whatever height he happens to be at IS the answer, so there is no
  // window to open, no prompt to miss, and no way to be caught out by a press
  // that came a frame late.
  //
  // Deliberately has no failure branch. `band` always resolves — grounded falls
  // to CLUNK, and the bands end at 0 so any airtime at all scores. The return
  // value feeds two things beyond the score: the lever's swing (drawn from
  // flip.t) and, once the power-restore payoff lands, how far back up the strip
  // the lights come on. Both read `this.flip`, so grading stays in one place.
  resolveFlip() {
    const hero = HERO_BY_ID[this.relay.current];
    const peak = jumpHeightFor(hero);
    // Grounded is its own answer, not a low fraction: he never left the floor.
    const frac = this.player.grounded ? -1 : this.player.y / peak;
    const band = this.player.grounded
      ? FLIP_CLUNK
      : (FLIP_BANDS.find((b) => frac >= b.at) || FLIP_CLUNK);
    // Same multiplier stack the run's own accrual uses, so Grumpos' +20% and a
    // live Star both count on the last points of the stage exactly as they
    // counted on the first.
    const sMult = hero.scoreMult * this.powerups.scoreMult() * (this.modIds.includes('crayon') ? 0.95 : 1);
    const points = Math.round(band.bonus * sMult);
    this.score += points;
    this.flip = { band, id: band.id, frac: Math.max(0, frac), points, t: 0 };
    // The grade's ONE card. It carries the label, the points and the coins, and
    // it is the bonus plate under the status pill — see drawCoinBonus. Coins
    // are not added to this.coins here: the count-up owns the transfer, one
    // coin at a time, so the number in the pill is always the number the player
    // has, and the plate visibly empties into it.
    if (band.bonus > 0) {
      this.flipCoins = {
        label: band.label, points, total: band.coins, left: band.coins,
        t: 0, doneT: null, delay: FLIP_COIN_WAIT, alpha: 0,
      };
    }

    const lx = this.finishWorldX();
    const ly = this.groundYAt(lx);
    shake(band.shake, 0.25);
    if (band.id === 'clunk') {
      Audio.sfx('contact');
      burst(lx + 12, ly - 24, 6, 40, 0.35, '#8a99a8', 1, 90, () => this.fxRng.float());
    } else {
      Audio.sfx(band.id === 'perfect' ? 'perfect' : 'power');
      burst(lx + 12, ly - 24, band.id === 'perfect' ? 26 : 14, 110, 0.6, '#f6d33c', 2, 80, () => this.fxRng.float());
    }
    // No floatie. The verdict used to print as a card in the run's own chatter
    // stack, which rises from the hero's column — and at the end of a stage the
    // hero is at the flagpole, so the card announcing the reward landed in the
    // top RIGHT, over the marker, while the coins it was talking about arrived
    // in the pill at the top LEFT. Two popups, opposite corners, one event. The
    // plate under the pill says all of it in the place the coins are going.
    //
    // A CLUNK still prints nothing at all: it is the grade worth zero, and the
    // marker already says so — plain raise, no surge, no sparks.
  }

  // Walks the flip's coin payout out of the bonus plate and into the status
  // pill, one coin per FLIP_COIN_STEP. Runs on the finale hold's own dt rather
  // than off tRun, which stops the moment the hold starts.
  //
  // The while loop rather than one coin a frame: at 0.075s a coin, a dropped
  // frame would otherwise stretch the whole tally, and the last coin has to
  // land before the results card takes the screen.
  updateFlipCoins(dt) {
    const b = this.flipCoins;
    if (!b) return;
    b.t += dt;
    while (b.left > 0 && b.t >= b.delay + (b.total - b.left) * FLIP_COIN_STEP) {
      b.left--;
      this.coins += 1;
      // Every coin ticks, climbing a semitone or so each time — the run-up is
      // the point, and it lands on the highest note as the plate empties.
      Audio.sfx('coin', { pitch: 1 + 0.05 * (b.total - b.left - 1) });
    }
    if (b.left === 0 && b.doneT == null) b.doneT = b.t;
    // The plate's own opacity, computed here rather than in the HUD: every
    // number that decides it is already in this file, and the drawing side has
    // no clock of its own during the hold.
    //
    // It fades IN on the flip and then never fades out. It is not a popup that
    // has said its piece — it is run state, sitting in the row with the cells
    // and the coins, and it stays there for as long as they do. The scene ends
    // and it goes with the scene. A plate that dissolved on its own left the
    // last seconds of the hold with a hero celebrating next to nothing, and put
    // a deadline on reading a number the player had just earned.
    b.alpha = Math.max(0, Math.min(1, b.t / FLIP_COIN_LEAD));
  }

  // ------------------------------------------------------------------ ability
  powerTarget(type = HERO_BY_ID[this.relay.current].ability.type) {
    const px = this.playerWorldX();
    // Only ever something on the hero's OWN road. These are x-range searches,
    // and x alone stopped being enough the day a second road ran under the
    // first: a crate in a tunnel is within 46px of a hero on the lane above it
    // and is no more his to stomp than one in another stage.
    const mine = (ob) => ob.live && this.sharesRoute(ob);
    if (type === 'stomp' && this.player.grounded) {
      return this.obstacles
        .filter((ob) => mine(ob) && ob.def.ground && ob.def.breakable && ob.x + ob.w >= px - 8 && ob.x <= px + 46)
        .sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0] || null;
    }
    if (type === 'eat') {
      return this.obstacles
        .filter((ob) => mine(ob) && ob.def.breakable && !ob.def.isGap && ob.x + ob.w >= px - 4 && ob.x <= px + 80)
        .sort((a, b) => a.x - b.x)[0] || null;
    }
    return null;
  }

  useAbility() {
    const hero = HERO_BY_ID[this.relay.current];
    const cdMult = (1 - 0.1 * (this.bench.tuneup || 0)) * (hero.ability.cooldownMult || 1);
    const type = hero.ability.type;
    // A banked relay charge fires through the cooldown; it is the reward.
    const charged = !!this.player.relayCharge;
    if (this.player.abilityCd > 0 && !charged) return;
    if (type === 'roll' && !this.player.grounded) return;
    if (charged) {
      this.player.relayCharge = false;
      this.player.chargeFlashT = 0.5;
      shake(3, 0.2);
      this.floatText(hero.ability.label, '#f6d33c');
    }
    // Lorenzo's grounded flurry defers the cooldown until the swings stop
    // (on contact or timeout). Everything else starts the cooldown now.
    if (!(type === 'stomp' && !charged && this.player.grounded)) {
      this.player.abilityCd = hero.ability.cooldown * cdMult;
    }
    this.player.powerType = type;
    // Eating needs the full gape/hold/snap bite cycle (~0.4s) to read as a
    // bite rather than a twitch — see poseFromPlayer's EAT_POWER_POSE_T.
    this.player.powerPoseT = type === 'eat' ? 0.5 : 0.3;
    if (type === 'stomp') {
      if (charged) {
        // Screen-wide shockwave: the old blast, but Lorenzo swings it.
        const px = this.playerWorldX();
        this.player.stomping = false;
        for (const ob of this.obstacles) {
          if (ob.live && ob.def.ground && ob.def.breakable !== false && !ob.def.isGap
              && ob.x > this.camX && ob.x < this.camX + W) this.breakObstacle(ob, true);
        }
        Audio.sfx('crunch');
        burst(px + 60, GROUND_Y - 40, 40, 120, 0.8, '#f6d33c', 2, 100, () => this.fxRng.float());
      } else if (this.player.grounded) {
        // Flurry: Lorenzo swings the spanner repeatedly until he connects,
        // or for a short window. Cooldown starts when the flurry ends.
        const px = this.playerWorldX();
        const target = this.powerTarget(type);
        this.player.spannerFlurryT = charged ? 3.5 : 1.75;
        this.player.spannerFlurryHitIds = new Set();
        this.player.spannerFlurryCd = hero.ability.cooldown * cdMult;
        if (target) {
          this.player.spannerFlurryHitIds.add(target.id);
          this.projectileImpact({ type: 'spanner' }, target.x + target.w / 2,
            this.groundYAt(target.x) - target.alt - target.h / 2);
          this.breakObstacle(target);
          // Connected on the first swing — flurry ends, cooldown starts.
          this.player.spannerFlurryT = 0;
          this.player.spannerFlurryHitIds = null;
          this.player.abilityCd = this.player.spannerFlurryCd;
          this.player.spannerFlurryCd = 0;
        }
        this.player.powerPoseT = 0.3; // first swing starts immediately
        Audio.sfx('crunch');
        shake(2, 0.12);
        this.floatText(target ? 'WRENCH SMASH' : 'WRENCH FLURRY', '#f6d33c');
      } else {
        this.player.stomping = true;
        this.player.vy = Math.min(this.player.vy, -180);
        Audio.sfx('dash');
      }
    } else if (type === 'dash') {
      // The dash already shatters breakables while active, so the charged
      // version just runs much longer.
      this.player.dashT = charged ? 1.1 : 0.4;
      Audio.sfx('dash');
      for (let i = 0; i < (charged ? 10 : 5); i++) spawn(this.playerWorldX() - i * 6, GROUND_Y - this.player.y - 8, -40, 0, 0.3, '#2050d8', 2, 0);
    } else if (type === 'roll') {
      this.player.rollT = charged ? 1.4 : 0.65;
      this.player.rollBashed = false;
      this.player.rollDeflectUsed = false;
      this.player.rollContactIds = new Set();
      this.player.rollPlows = charged; // charged: bash without the sidegrade
      this.player.ducking = false;
      Audio.sfx('dash');
    } else if (type === 'shoot') {
      // TWO heroes shoot, and they are not the same weapon. B-33P's lemon is
      // small and fast on a 1.35s recharge — that recharge IS his skill. Kiko's
      // warning shot is fat and slow on 3.5s. The difference lives in DATA on
      // the hero row (shotSpeed / shotSize) rather than in an id check, so the
      // flight and hit code downstream never has to know who fired.
      //
      // REASONABLE FORCE rides those same two fields, which is why they exist as
      // a pair: "wider but slower" is one trade expressed in numbers the
      // projectile already carries, not a third special case.
      const wide = this.modIds.includes('force');
      const speedAdd = (hero.shotSpeed != null ? hero.shotSpeed : 260) * (wide ? 0.72 : 1);
      const size = (hero.shotSize || 1) * (wide ? 1.5 : 1);
      Audio.sfx('launch', { hero: hero.id, pitch: hero.id === 'b33p' ? 1.08 : 0.98 });
      const px = this.playerWorldX() + 12;
      // Charged: a three-round spread, every pellet piercing.
      const alts = charged ? [this.player.y - 6, this.player.y + 8, this.player.y + 22] : [this.player.y + 8];
      for (const alt of alts) {
        // contactHero is what makes the IMPACT play her burst instead of his
        // orb pop, and it is also what the renderer reads to colour the shot —
        // scalars only, because projectiles are pooled through assignInto.
        this.projectiles.push({ type: 'pellet', x: px, alt, vx: this.speed + speedAdd, size, contactHero: hero.id, live: true, pierce: charged || this.modIds.includes('charge'), hitIds: new Set() });
      }
      if (hero.id === 'kiko') this.floatText(charged ? 'FORMALLY WARNED' : 'WARNED', '#8fe4ff');
      else this.floatText(charged ? 'FULL CYAN' : 'PEW', '#f6d33c');
    } else if (type === 'compress') {
      this.player.compressT = charged ? 2.6 : 1;
      Audio.sfx('power');
      this.floatText(charged ? 'DEFINITELY NOT NORMAL PHYSICS' : 'PROBABLY NORMAL PHYSICS', '#ffb7c3');
    } else if (type === 'eat') {
      const px = this.playerWorldX();
      Audio.sfx('chomp');
      if (charged) {
        // Charged: clears the plate. Everything on screen, still politely.
        let ate = 0;
        for (const ob of this.obstacles) {
          if (ob.live && ob.def.breakable !== false && !ob.def.isGap
              && ob.x > this.camX && ob.x < this.camX + W) {
            this.startChompBite(ob);
            this.projectileImpact({ type: 'chomp' }, ob.x + ob.w / 2,
              this.entityGroundY(ob) - ob.alt - ob.h / 2);
            this.breakObstacle(ob, true);
            ate++;
          }
        }
        this.floatText(ate ? 'MISS CHOMP ATE ALL OF IT. POLITELY.' : 'NOTHING ON THE MENU.', '#f6d33c');
        if (ate) this.chompFlourish(px + 30, GROUND_Y - this.player.y - 18);
      } else {
        const target = this.powerTarget(type);
        if (target) {
          this.startChompBite(target);
          this.projectileImpact({ type: 'chomp' }, target.x + target.w / 2,
            this.groundYAt(target.x) - target.alt - target.h / 2);
          this.breakObstacle(target, true);
          this.floatText('MISS CHOMP ATE IT. POLITELY.', '#f6d33c');
          this.chompFlourish(target.x + target.w / 2, this.groundYAt(target.x) - target.alt - target.h / 2);
        } else this.floatText('AIR: SURPRISINGLY LOW CALORIE.', '#f6d33c');
      }
      if (this.modIds.includes('eat') && !this.player.hazardEaten) {
        this.player.hazardEaten = true;
        this.player.abilityCd = 0;
      }
    } else if (type === 'fist') {
      Audio.sfx('launch', { hero: 'raymn', pitch: 1 });
      this.player.fistThrown = true;
      // Charged: the fist keeps going instead of turning back at the first hit.
      this.projectiles.push({ type: 'fist', x: this.playerWorldX() + 12, alt: this.player.y + 10, vx: this.speed + (charged ? 320 : 210), t: 0, live: true, returning: false, pierce: charged, hitIds: new Set(), hover: false, hoverT: 0 });
    } else if (type === 'axe') {
      Audio.sfx('launch', { hero: 'grumpos', pitch: 0.9 });
      this.player.axeThrown = true;
      // Charged: the axe works the whole screen before coming home.
      const hits = charged ? 99 : (this.modIds.includes('ricochet') ? 2 : 1);
      this.projectiles.push({ type: 'axe', x: this.playerWorldX() + 12, alt: this.player.y + 10, vx: this.speed + (charged ? 300 : 220), t: 0, live: true, returning: false, hits, hitIds: new Set(), hover: false, hoverT: 0 });
      if (this.fxRng.chance(0.25)) this.floatText('BOY.', '#ecc3a1');
    }
  }

  stompBreak() {
    // Lorenzo stomp: break ground obstacles under/near him on landing.
    const px = this.camX + PLAYER_X;
    let radius = 16;
    if (this.modIds.includes('shockwave')) radius = 40;
    for (const ob of this.obstacles) {
      if (!ob.live || !ob.def.ground || !ob.def.breakable) continue;
      if (Math.abs(ob.x + ob.w / 2 - px) < radius + ob.w / 2) {
        this.projectileImpact({ type: 'spanner' }, ob.x + ob.w / 2,
          this.entityGroundY(ob) - ob.alt - ob.h / 2);
        this.breakObstacle(ob);
        if (this.modIds.includes('shockwave')) this.scatterCoins(ob.x);
        this.player.vy = 200; this.player.grounded = false; this.player.jumps = 1; // bounce
      }
    }
  }

  scatterCoins(x) {
    this.tossCoins(x, 3);
  }

  // Spray coins up and FORWARD so they land in your path instead of sitting
  // where the block was (which the runner has already passed). Speeds are
  // tuned so every coin settles ~30-140px AHEAD of the player, then gets run
  // through about half a second later.
  tossCoins(x, n, alt = 14, quiet) {
    const sp = this.speed;
    // One spray per moment, not per box: a screen-clear can empty several
    // boxes on the same frame and the blips would pile into mush.
    if (!quiet && this.tRun - this.lastCoinSprayT > 0.12) {
      this.lastCoinSprayT = this.tRun;
      Audio.sfx('coinSpray', { count: n });
    }
    for (let i = 0; i < n; i++) {
      const p = makePickup('coin', x + this.fxRng.range(0, 6), alt);
      p.toss = true;
      p.vx = sp * (1.55 + 0.16 * i) + this.fxRng.range(0, 40); // fans out ahead
      p.vy = this.fxRng.range(110, 165);
      this.pickups.push(p);
    }
  }

  // A !-box is a prize box, so it pops brighter than a splintering crate: gold
  // shards, a white flash at the centre, and a harder kick.
  qboxPop(cx, cy) {
    const r = () => this.fxRng.float();
    shake(1.5, 0.13);
    burst(cx, cy, 14, 88, 0.55, '#f6d33c', 1.4, 190, r); // gold shards
    burst(cx, cy, 8, 135, 0.3, '#fff8d0', 1, 40, r);     // the flash going up
    burst(cx, cy, 6, 46, 0.7, '#a8791f', 1, 210, r);     // dark splinters falling
  }

  // Sometimes the box coughs up a capsule instead of loose change. It shares
  // the drip's weighted pool, so every source has the same odds.
  // quiet: a screen-clear can pop several boxes on one frame, and one 'power'
  // sting per box stacks into noise.
  tossPrize(x, alt, quiet) {
    const type = randomPowerPickup(this.fxRng, this.drip.lastPowerType);
    const p = makePickup(type, x, alt);
    p.toss = true;
    p.vx = this.speed * 1.45;
    p.vy = 205; // arcs higher than a coin — you should see this one coming
    this.pickups.push(p);
    // The toss arcs and bounces before it settles (~0.85s of forward travel at
    // these numbers), so the spacing rule measures from where it lands, not
    // from the box it came out of.
    this.drip.notePower(x + p.vx * 0.85, type);
    // No floatie: the capsule arcs high on its own and the catch announces
    // itself. Calling the toss and the catch is announcing one capsule twice.
    if (!quiet) Audio.sfx('power');
  }

  // Contact remains visually explicit, while the weapon-specific WAV makes the
  // hit read as the attack that caused it. Breakable props still play their own
  // material/debris sound separately.
  projectileImpact(pr, cx, cy) {
    const hero = pr.contactHero || ({
      pellet: 'b33p', axe: 'grumpos', fist: 'raymn', spanner: 'lorenzo',
      shield: 'fernwick', chomp: 'chompo',
    }[pr.type]);
    const pitch = pr.type === 'axe' ? 0.82 : pr.type === 'fist' ? 0.96
      : pr.type === 'shield' ? 0.9 : pr.type === 'chomp' ? 0.88 : 1.12;
    Audio.sfx(hero ? 'contact' : 'impact', { hero, pitch });
    shake(pr.type === 'axe' ? 1.6 : 1.1, 0.07);
    if (this.save.settings.reducedMotion) return;
    const r = () => this.fxRng.float();
    burst(cx, cy, 9, 86, 0.32, '#fff8d0', 1.15, 80, r);
    burst(cx, cy, 7, 112, 0.26, '#f6d33c', 1, 100, r);
  }

  // The object comes apart into chunks of itself: they scatter from the centre,
  // tumble, then land on the ground it was standing on and skid to a stop.
  // Reduced-motion keeps the dust puff but skips the flying debris.
  debris(ob, cx, cy) {
    const d = DEBRIS[ob.type] || DEBRIS_DEFAULT;
    // The scatter plays either way: it describes the break, and reduced-motion
    // is a setting about movement, not about hearing what you just hit.
    Audio.sfx('debris', { mat: d.mat });
    if (this.save.settings.reducedMotion) return;
    const r = () => this.fxRng.float();
    const bulk = Math.min(2, (ob.w * ob.h) / 140); // a stacked crate throws more than a switch
    shardBurst(cx, cy, Math.round((d.count || 9) * (0.7 + bulk * 0.3)), 78, 0.75, d.colors, {
      size: d.size, grav: d.grav ?? 340, floor: this.entityGroundY(ob), rand: r,
    });
    if (d.spark) burst(cx, cy, 5, 110, 0.22, d.spark, 1, 30, r); // machines throw sparks too
  }

  // Miss Chomp's signature send-off after a HAZARD BITE: a dainty pink kiss-poof
  // that drifts up (her "thank-you note" made visible) plus a few white sparkle
  // flecks and a short aside in her own pink voice. Purely cosmetic -- the bite
  // itself already happened in breakObstacle; this is the flourish on top.
  chompFlourish(cx, cy) {
    const PINK = '#f7bacc', BLUSH = '#ffd0e0';
    if (!this.save.settings.reducedMotion) {
      const r = () => this.fxRng.float();
      burst(cx, cy, 6, 55, 0.5, PINK, 1.2, -20, r);   // negative grav: the kiss rises
      burst(cx, cy, 4, 40, 0.6, BLUSH, 1, -30, r);
      for (let i = 0; i < 3; i++) {                    // white sparkle flecks
        spawn(cx + (r() - 0.5) * 16, cy - r() * 8, (r() - 0.5) * 24, -24 - r() * 30, 0.7, '#fff', 1.4, 46);
      }
    }
    this.floatText(this.fxRng.pick(['MWAH. — DARLING', 'RETURNED WITH A NOTE. XOXO', 'WAKA, DARLING.', 'DEE-LIGHTFUL. THANK YOU.']), PINK);
  }

  // Keep a cosmetic snapshot after gameplay removes the hazard, then pull the
  // real sprite into the mouth over the same half-second as the authored gape
  // and snap. Collision is still immediate; only its visible exit is delayed.
  startChompBite(ob) {
    if (!ob || this.save.settings.reducedMotion) return;
    const copy = { ...ob, live: true };
    if (this.chompBites.length < 8) {
      this.chompBites.push({ ob: copy, t: 0, duration: 0.42, spin: (this.fxRng.float() - 0.5) * 1.8 });
    }
    // Material-coloured crumbs make the direction readable even when the
    // obstacle itself is tiny or the cabinet treatment is visually busy.
    const fromX = ob.x + ob.w / 2;
    const fromY = this.entityGroundY(ob) - ob.alt - ob.h / 2;
    const mouthX = this.playerWorldX() + 9;
    const mouthY = this.groundYAt(mouthX) - this.player.y - 11;
    const d = DEBRIS[ob.type] || DEBRIS_DEFAULT;
    const colors = d.colors && d.colors.length ? d.colors : ['#f6d33c'];
    const travel = 0.4;
    for (let i = 0; i < 5; i++) {
      const jitterX = (this.fxRng.float() - 0.5) * Math.min(12, ob.w);
      const jitterY = (this.fxRng.float() - 0.5) * Math.min(10, ob.h);
      spawn(fromX + jitterX, fromY + jitterY,
        (mouthX - fromX) / travel + (this.fxRng.float() - 0.5) * 12,
        (mouthY - fromY) / travel - 12 - this.fxRng.float() * 10,
        travel, colors[i % colors.length], Math.max(1.2, (d.size || 2) * 0.55), 28);
    }
  }

  updateChompBites(dt) {
    for (const bite of this.chompBites) bite.t += dt;
    this.chompBites = this.chompBites.filter((bite) => bite.t < bite.duration);
  }

  breakObstacle(ob, silent) {
    ob.live = false;
    const cx = ob.x + ob.w / 2;
    if (!silent) {
      const cy = this.entityGroundY(ob) - ob.alt - ob.h / 2;
      if (ob.def.qbox) { Audio.sfx('blockBreak'); this.qboxPop(cx, cy); }
      else {
        Audio.sfx('crunch');
        shake(0.8, 0.08);
        burst(cx, cy, 10, 60, 0.5, '#c8a068', 1, 160, () => this.fxRng.float());
      }
      this.debris(ob, cx, cy);
    }
    if (ob.def.bonusCoins) {
      const alt = ob.alt + ob.h;
      // The roll is drawn either way so the fx stream stays in step, then the
      // spacing rule can veto it: a box that would drop a second capsule
      // within a screen of the last one pays out in coins instead. A box
      // always gives you something.
      const won = ob.def.prizeChance && this.fxRng.chance(ob.def.prizeChance);
      if (won && this.drip.canPlacePower(cx)) this.tossPrize(cx, alt, silent);
      else this.tossCoins(cx, ob.def.bonusCoins, alt, silent);
    }
    if (ob.def.isTarget && this.mission.type === 'targets' && (!this.mission.targetType || this.mission.targetType === ob.type)) {
      this.mission.count++;
      this.floatText(`${this.mission.count}/${this.mission.n}`, '#48e0c8');
    }
    if (ob.def.isSwitch) this.openGates(ob.x);
  }

  openGates(x) {
    // Frozen switch: remove the next gap (a bridge slides in).
    Audio.sfx('checkpoint');
    for (const ob of this.obstacles) {
      if (ob.live && ob.def.isGap && ob.x > x) { ob.live = false; this.floatText('BRIDGE. YOU EARNED IT.', '#b8e0f8'); break; }
    }
  }

  // ------------------------------------------------------------------ relay
  // Two separate keep-clear rules, because they protect different things.
  //
  // The APPROACH is about fairness: an obstacle that wants a jump or a duck in
  // the run-up gets deleted, since the portal already owns that input window.
  //
  // The COLUMN is about the portal itself. The art is 14px wide with a face
  // hung over the top of it, so anything sharing those pixels — a !-box, a
  // buzzbird, a capsule, a coin arc — is drawn ON the portal. A reward there is
  // unreadable and a hazard there is worse: you cannot dodge it without missing
  // the tag. Nothing lives in the column, prize or threat. The appliance is the
  // one thing that cannot simply be deleted (it spawns once a stage and the
  // mission wants it), so it gets pushed clear instead.
  clearPortalLane(portalX) {
    const approachStart = portalX - 48;
    const portalEnd = portalX + 12;
    const colStart = portalX - 20, colEnd = portalX + 32;
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      const start = ob.def.action !== 'none' ? approachStart : colStart;
      const end = ob.def.action !== 'none' ? portalEnd : colEnd;
      if (ob.x < end && ob.x + ob.w > start) ob.live = false;
    }
    for (const p of this.pickups) {
      if (!p.live || p.x >= colEnd || p.x + p.w <= colStart) continue;
      if (p.type === 'appliance') {
        p.x = colEnd;
        if (p._baseX != null) p._baseX = p.x;
      } else p.live = false;
    }
  }

  updatePortal(dt) {
    if (this.portal) {
      if (this.portal.x < this.camX - 30) this.portal = null;
      // A portal that has been used or gone over is no longer a thing in the
      // lane, it is a thing that HAPPENED — it keeps drawing its aftermath
      // strip (see drawPortal) and rides off the back of the frame like any
      // other prop. Nothing else spawns while it does: portals are eighteen
      // seconds apart at their tightest and a corpse lives half a second, so
      // holding the slot costs nothing and guarantees one portal on screen.
      else if (this.portal.spent != null) this.portal.spent += dt;
      else if (this.portal.wilt != null) this.portal.wilt += dt;
    } else if (this.relay.portalDue()) {
      const hero = this.relay.next;
      this.portal = { x: this.camX + W + 40, hero };
      this.clearPortalLane(this.portal.x);
      this.relay.portalSpawned();
      // Names the TAG, because this is the moment the word gets taught: the
      // mastery track pays out on 'EVERY PERFECT TAG' and the intro opens on a
      // relay, and until this line said it the player met the term first in a
      // shop description for a thing they had never been told they were doing.
      this.tutor('firstPortal', 'RUN THROUGH THE PORTAL TO TAG IN THE NEXT HERO.');
    }
    if (this.portal && this.portal.spent == null && this.portal.wilt == null) {
      const pbox = { x: this.portal.x, y: this.groundYAt(this.portal.x) - PORTAL_H, w: 12, h: PORTAL_H };
      // The same swoosh the level opens with, because it is the same fiction: a hero
      // going through a doorway. Quieter here — that one is once a level and can afford
      // to be an event, this one is every eighteen seconds and has to be furniture.
      //
      // Fired AHEAD of the crossing rather than on it. The cue's own flash is
      // PORTAL_CUE_FLASH_AT into the sound (see portalSwoosh), so firing it when the
      // player actually touches the portal would put the brightest moment a fifth of a
      // second after they were already through it. The credits handoff solves this the
      // same way; this is the arithmetic version, since here the crossing is a position
      // rather than a time: distance to go, over how fast the world is moving.
      //
      // Same 3.5x as the level opener, not the 1.8x this started at. Level start has a
      // thinned-out cabinet treatment under it — drums and bass, no tune — where this has
      // the whole band, so the same number is not the same loudness and 1.8x vanished.
      // `tag` still fires with it in doSwitch and still carries the event; this is the
      // swoosh under it. Peak lands at -12.4 dBFS, under `boom` (-11.7), the loudest cue
      // the game already has, so there is no new headroom problem.
      if (!this.portal.cued && this.speed > 0) {
        const toGo = this.portal.x - (this.camX + PLAYER_X);
        // Led by the shape's own seam, not by the bare constant: stretching the cue
        // moves where its middle falls, and hand-authoring 0.20 here would fire a
        // two-and-a-half-times-longer swoosh a quarter of the way through its approach.
        // The RISE only, and unconditionally — this says "doorway", not "tag". It has
        // to start about half a second out for its own peak to land where the player
        // reaches the portal, and half a second out nobody has decided anything yet: a
        // jump begun as late as 0.162s before it still clears, which is a third of the
        // lead the sound needs. Predicting it was tried and fired on every late jump.
        // So the rise plays whether the portal is taken or not, and the fall — the half
        // that means a tag actually happened — waits for the crossing in doSwitch.
        // Shorter than the whole gesture — its peak is ~0.25s in rather than ~0.49s —
        // which brings the lead down near the 0.162s in which a late jump can still
        // clear. Close enough that the arc is usually already decided, so it is worth
        // asking: someone visibly airborne and going over gets no sound at all. A jump
        // begun inside the last quarter second still slips through, and nothing can see
        // that coming; the fall in the crossing handler is the half that is never wrong.
        const eta = toGo / this.speed;
        if (eta <= portalCueFlashAt(PORTAL_RELAY_IN)
          && this.player.feetAt(eta, this.powerups.gravityMultiplier()) < PORTAL_H) {
          this.portal.cued = true;
          Audio.sfx('portal', { gain: PORTAL_RELAY_IN_GAIN, shape: PORTAL_RELAY_IN });
        }
      }
      const hbox = this.player.box(this.camX, this.playerGroundY());
      if (overlaps(hbox, pbox)) {
        this.doSwitch();
        this.portal.spent = 0;
      } else if (pbox.x + pbox.w < hbox.x) {
        // Gone over the top. Measured against the same two boxes the crossing
        // is, one frame later: once the portal's right edge is behind the
        // hero's left one, no jump can still take it. The column sags from
        // here, which is the only feedback a missed tag has ever had — before
        // this a portal you cleared scrolled away looking exactly like one you
        // were still able to reach.
        this.portal.wilt = 0;
      }
    }
  }

  // One-time contextual teaching prompts (stored per save slot).
  tutor(flag, text) {
    if (this.demo) return; // the bot needs no education
    const t = this.save.slot.tutor || (this.save.slot.tutor = {});
    if (t[flag]) return;
    t[flag] = true;
    this.save.persist();
    // No slow-motion under it. The tempo drop was meant to say "read this",
    // but a run that lurches to 35% speed for half a second reads as the game
    // hitching, not as the game talking — and the bubble is legible at full
    // speed anyway. The prompt gets attention by being the only thing on
    // screen that is words, not by braking the world.
    this.speech = { text, t: 2.8, who: null };
  }

  // What a spent portal throws, and the reason it is thrown at the PORTAL
  // rather than at the hero: this used to be a teal puff at the player's chest,
  // which read as the hero doing something rather than as the doorway reacting.
  //
  // Two kinds, meaning two different things. The pop is the column discharging
  // — almost no gravity, because it is light and light does not fall. The three
  // flat chunks are hoops dragged FORWARD out of the stack in the hero's wake:
  // they leave at a little over the world's own speed, so they pull ahead of
  // the plinth and thin out around the hero instead of hanging where the portal
  // was. The sprite's own hoops sink into the slot at the same moment (see
  // portalRingsArt), so the stack empties from both ends.
  portalDischarge(x) {
    const cx = x + 6;
    const rand = () => this.fxRng.float();
    burst(cx, GROUND_Y - 26, 12, 54, 0.34, '#c8fff0', 1, 14, rand);
    burst(cx, GROUND_Y - 8, 8, 40, 0.28, '#48e0c8', 1, 30, rand);
    for (let i = 0; i < 3; i++) {
      spawnShard(cx, GROUND_Y - 32 + i * 9, this.speed * (1.15 + i * 0.08), -6 - i * 3,
        0.3 + i * 0.04, i ? '#3fa9a0' : '#c8fff0', 7 - i * 1.6, 1.4, 0, 0, Infinity);
    }
  }

  doSwitch() {
    const px = this.camX + PLAYER_X;
    const result = this.relay.switchHero();
    this.player.setHero(result.to);
    this.player.tagFlashT = TAG_FLASH_TIME;
    this.usedHeroes.add(result.to);
    this.setButtons();
    Audio.sfx('tag');
    // The FALL, on the crossing itself — the half that only sounds when a hero has
    // actually gone through. No lead needed: it has already happened, and this leg puts
    // its weight 47ms in. See PORTAL_RELAY_OUT.
    Audio.sfx('portal', { gain: PORTAL_RELAY_GAIN, shape: PORTAL_RELAY_OUT });
    this.score += 100;
    this.portalDischarge(this.portal ? this.portal.x : px);
    const hero = HERO_BY_ID[result.to];
    if (hero.stomp) this.stompBreak();
    if (hero.startShield && this.powerups.shieldStack === 0) this.powerups.shieldStack = 1;
    if (this.modIds.includes('tagspeed') && result.to === 'gnash') this.speedBoost = Math.min(1.2, this.speedBoost + 0.15);
    // No per-swap button callout: the HUD's ability panel top-right already
    // names this hero's power and shows whether it is ready, so repeating it in
    // a bubble every swap is the same fact twice. The one-time firstAbility
    // tutor below still teaches the button once.
    const btn = Input.usingTouch ? 'USE' : 'RIGHT/D';
    // The departing hero gets a parting shot. Only the first time each hero
    // tags out in a run: everyone gets their moment without a swap-heavy run
    // turning into a conversation you read instead of playing. (Only one voice
    // per swap — see EXIT_LINES.)
    const exit = !this.demo && !this.exitSpoken.has(result.from) && EXIT_LINES[result.from];
    if (exit) {
      this.exitSpoken.add(result.from);
      this.speech = { text: this.speechRng.pick(exit), t: 1.8, who: result.from };
    } else {
      this.speech = null;
    }
    this.speechQueue = [];
    this.tutor('firstAbility', `EVERY HERO HAS A POWER. PRESS ${btn}.`);
  }

  // The banked supercharged ability. It used to be handed out automatically on
  // every third switch, which meant a free power every run whether you'd earned
  // it or not; it is now a rare capsule, so it lands as a treat. An unspent
  // charge rides along through later switches rather than vanishing.
  grantRelayCharge() {
    const btn = Input.usingTouch ? 'USE' : 'RIGHT/D';
    this.player.relayCharge = true;
    Audio.sfx('power');
    shake(2, 0.15);
    this.floatText('POWER CHARGED', '#f6d33c');
    burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 20, 90, 0.6, '#f6d33c', 2, 70, () => this.fxRng.float());
    this.tutor('firstCharge', `CHARGED. YOUR NEXT ${btn} IS SUPERCHARGED.`);
  }


  // ------------------------------------------------------------------ entities
  updateEntities(dt, sp) {
    const beat = Audio.beatPhase();
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      // Shamblers lurch rather than glide: each step surges then nearly stalls.
      // The surge never flips sign, so they only ever close on the player.
      if (ob.def.shamble) {
        ob.gait += dt * 5;
        ob.vx = ob.def.vx * (1.6 + 0.9 * Math.sin(ob.gait));
      }
      if (ob.def.airDrift) {
        const { amp, speed } = ob.def.airDrift;
        const phase = this.tRun * speed + ob.bobPhase;
        if (ob.driftOriginX == null) ob.driftOriginX = ob.x - Math.sin(phase) * amp;
        if (ob.def.airVx) ob.driftOriginX += ob.def.airVx * dt;
        ob.x = ob.driftOriginX + Math.sin(phase) * amp;
      } else if (ob.def.airVx) {
        ob.x += ob.def.airVx * dt;
      }
      if (ob.vx) ob.x += ob.vx * dt;
      if (ob.def.falls && !ob.fell) {
        // Telegraph, then drop when the player approaches.
        if (ob.x - this.playerWorldX() < sp * (ob.fallT + 0.35)) {
          ob.fallT -= dt;
          if (ob.fallT <= 0) { ob.fell = true; }
        }
      }
      if (ob.fell && ob.alt > 0 && ob.def.falls) {
        ob.alt = Math.max(0, ob.alt - 320 * dt);
      }
      // The boost pad is the one prop that GIVES you something, and until now
      // it was the only one that never acknowledged you. Two states, both
      // art-only: `arm` rises as the hero closes on it, which drives the
      // chevron chase faster the nearer you get, and `firedT` is a short flare
      // the instant it pays out. Nothing here touches the hitbox or the boost.
      if (ob.def.isBoost) {
        const gap = ob.x - this.playerWorldX();
        // Once the pad's trailing edge is behind the hero it can no longer be
        // claimed — jumped clean over, most likely. `arm` clamped at 1 for as
        // long as the pad stayed on screen, so the telegraph went on climbing
        // at full pitch after the chance had gone, which reads as "still
        // coming" at exactly the moment it means the opposite.
        if (!ob.used && !ob.missed && gap + ob.w < 0) { ob.missed = true; ob.missT = BOOST_MISS_TAIL; }
        if (ob.missed) {
          ob.missT = Math.max(0, ob.missT - dt);
          ob.arm = ob.missT / BOOST_MISS_TAIL;      // the chase winds down with it
        } else {
          ob.arm = Math.max(0, Math.min(1, 1 - gap / BOOST_ARM_RANGE));
        }
        if (ob.firedT > 0) ob.firedT = Math.max(0, ob.firedT - dt);
        // Ticks that speed up and rise in pitch as the pad closes — the
        // sequence is the telegraph, not any one blip. Stops the instant the
        // pad pays out, so the tick never talks over the whoosh.
        if (ob.arm > 0.12 && !ob.used && !ob.missed) {
          ob.tickT = (ob.tickT || 0) - dt;
          if (ob.tickT <= 0) {
            ob.tickT = 0.2 - 0.14 * ob.arm;
            Audio.sfx('boostTick', { pitch: 0.85 + 0.5 * ob.arm });
          }
        } else if (ob.used && ob.hitT > 0) {
          // Contact: the run CARRIES ON up, over the top of the whoosh. It
          // used to stop dead so as not to talk over the payout, but stopping
          // is what the miss does — the two endings have to differ, and a line
          // that keeps climbing is the only one that reads as reward.
          ob.hitT = Math.max(0, ob.hitT - dt);
          ob.tickT = (ob.tickT || 0) - dt;
          if (ob.tickT <= 0) {
            ob.tickT = 0.045;
            Audio.sfx('boostTick', { pitch: 1.35 + 1.55 * (1 - ob.hitT / BOOST_HIT_TAIL) });
          }
        } else if (ob.missed && ob.missT > 0) {
          // The same tick, falling — fast, and a long way. It ends far BELOW
          // where the rising run began rather than merely stopping: silence
          // after a rise is ambiguous, it could be the pad or it could be the
          // mix, and a pitch that drops off a cliff is unmistakably a negative.
          ob.tickT = (ob.tickT || 0) - dt;
          if (ob.tickT <= 0) {
            ob.tickT = 0.04;
            Audio.sfx('boostTick', { pitch: 0.22 + 1.0 * (ob.missT / BOOST_MISS_TAIL) });
          }
        }
      }
      if (ob.def.beatSync) ob.h = 10 + Math.round(4 * Math.abs(Math.sin(beat * Math.PI)));
      if (ob.def.shoots) {
        ob.shootT -= dt;
        // Bounded by the VIEW, not the logical frame: a shooter that opens fire
        // from W away is over two screens back, and its shot arrives with no
        // telegraph at all.
        if (ob.shootT <= 0 && ob.x > this.playerWorldX() + 60 && ob.x < this.camX + VIEW_W + 40) {
          ob.shootT = 2.2;
          const alt = ob.def.ground ? 8 : ob.alt;
          this.projectiles.push({ type: 'enemyShot', x: ob.x, alt, vx: -70, live: true, telegraph: 0.4 });
          Audio.sfx('shoot');
        }
      }
    }
    // Tossed loot: arcs forward out of whatever dropped it, bounces once or
    // twice, then settles on the ground ahead so you run through it.
    for (const p of this.pickups) {
      if (!p.live) continue;
      if (p.def.shamble) p.gait = (p.gait || p.bobPhase) + dt * 5;
      if (p.def.appliance && !p.toss && p._baseAlt != null) {
        const wt = this.tRun;
        p.alt = p._baseAlt + Math.sin(wt * 0.7 + p.bobPhase) * 6 + Math.sin(wt * 1.3 + p.bobPhase + 1.2) * 4;
        p.x = p._baseX + Math.sin(wt * 0.5 + p.bobPhase + 2.5) * 10;
      }
      if (!p.toss) continue;
      p.x += p.vx * dt;
      p.alt += p.vy * dt;
      p.vy -= 700 * dt;
      if (p.alt <= 8) {
        p.alt = 8;
        p.vy = -p.vy * 0.35;
        p.vx *= 0.9;
        if (p.vy < 40) { p.vy = 0; p.vx = 0; p.toss = false; }
      }
    }
    this.obstacles = this.obstacles.filter((ob) => ob.live !== false && ob.x > this.camX - 80);
    this.pickups = this.pickups.filter((p) => p.live && p.x > this.camX - 40);

    // Chase copter: swoops between far ahead and just in front of the player
    // so it periodically enters catch range (dx < 40); it must dip below
    // camX + PLAYER_X + 40 or chase missions are unwinnable.
    if (this.copter) {
      const c = this.copter;
      // The far end of the arc is a VIEW measurement so the swoop stays on
      // screen; the near end stays at 80, so the dx < 40 catch window below is
      // reached exactly as often as before.
      c.x = this.camX + 80 + (Math.sin(this.tRun * 0.55) * 0.5 + 0.5) * (VIEW_W - 96);
      c.alt = 50 + Math.sin(this.tRun * 1.7) * 20;
      if (c.cooldown > 0) c.cooldown -= dt;
      const dx = c.x - (this.camX + PLAYER_X);
      c.inRange = this.mission.type === 'chase' && dx < 90 && c.cooldown <= 0;
      if (this.mission.type === 'chase' && dx < 40 && c.cooldown <= 0 && this.player.y > c.alt - 30) {
        c.caught++;
        c.cooldown = 8;
        Audio.sfx('power');
        this.floatText(`CAUGHT ${c.caught}/${this.mission.n}. IT FILED A COMPLAINT.`, '#f6d33c');
        shake(3, 0.2);
      }
    }

    // Escape wall.
    if (this.escapeWall != null) {
      this.escapeWall += (sp * 0.94 + 8) * dt;
      if (this.escapeWall > this.camX + 10) {
        if (this.player.iframes <= 0) this.takeHit('THE UNPLUGGENING CAUGHT UP');
        this.escapeWall = this.camX - 60;
      }
    }
  }

  updateProjectiles(dt, sp) {
    for (const pr of this.projectiles) {
      if (!pr.live) continue;
      if (pr.type === 'axe' || pr.type === 'fist') {
        pr.t += dt;
        const hoverAlt = 48; // well above any hero or obstacle — clearly spent
        if (pr.type === 'fist') {
          if (!pr.returning && !pr.hover && pr.t > 0.42) { pr.hover = true; pr.hoverX = pr.x; }
        } else {
          if (!pr.returning && !pr.hover && pr.t > 0.55) { pr.hover = true; pr.hoverX = pr.x; }
        }
        if (pr.hover && !pr.returning) {
          pr.hoverT += dt;
          // Rise up out of the combat lane so it is clear the weapon is spent.
          pr.alt += (hoverAlt - pr.alt) * Math.min(1, dt * 6);
          // Stay where the weapon landed — a miss stays where it missed.
          pr.x = pr.hoverX;
          if (this.player.abilityCd <= 0) pr.returning = true;
          continue; // don't move under its own velocity this frame
        }
        pr.x += (pr.returning ? -(sp + (pr.type === 'fist' ? 240 : 300)) : pr.vx) * dt;
        if (pr.returning) {
          // Lower back toward the catch height as it flies home.
          const catchAlt = this.player.y + 10;
          pr.alt += (catchAlt - pr.alt) * Math.min(1, dt * 7);
        }
        if (pr.returning && pr.x < this.playerWorldX()) {
          pr.live = false;
          if (pr.type === 'fist') this.player.fistThrown = false;
          if (pr.type === 'axe') {
            this.player.axeThrown = false;
            if (this.fxRng.chance(0.15)) this.floatText('THE AXE LODGED IN THE SCENERY. INTENDED.', '#ecc3a1');
          }
        }
      } else {
        pr.x += pr.vx * dt;
        if (pr.telegraph > 0) pr.telegraph -= dt;
        if (pr.x > this.camX + W + 60 || pr.x < this.camX - 60) pr.live = false;
      }
      // Projectile vs obstacles.
      if (pr.type === 'pellet' || pr.type === 'axe' || pr.type === 'fist') {
        for (const ob of this.obstacles) {
          if (!ob.live || ob.def.isGap || ob.def.isBoost) continue;
          pr.hitIds ||= new Set();
          if (pr.hitIds.has(ob.id)) continue;
          const canHit = pr.type === 'axe' || pr.type === 'fist' || pr.pierce
            ? true
            : (ob.def.ground || ob.def.isTarget) && !ob.def.armored;
          if (!canHit) {
            // pellet pings off armored flyers
            if (!ob.def.ground && Math.abs(ob.x - pr.x) < 8 && pr.type === 'pellet') {
              this.projectileImpact(pr, pr.x + 4, this.groundYAt(pr.x) - pr.alt - 4);
              pr.live = false;
            }
            continue;
          }
          const box = entityBox(ob, this.entityGroundY(ob));
          const pbox = { x: pr.x, y: this.groundYAt(pr.x) - pr.alt - 4, w: 8, h: 8 };
          if (overlaps(box, pbox)) {
            pr.hitIds.add(ob.id);
            const ix = (Math.max(box.x, pbox.x) + Math.min(box.x + box.w, pbox.x + pbox.w)) / 2;
            const iy = (Math.max(box.y, pbox.y) + Math.min(box.y + box.h, pbox.y + pbox.h)) / 2;
            this.projectileImpact(pr, ix, iy);
            if (ob.def.breakable === false) {
              if (pr.type === 'axe' || pr.type === 'fist') { pr.hover = true; pr.hoverX = pr.x; }
              else pr.live = false;
              continue;
            }
            this.breakObstacle(ob);
            if (pr.type === 'axe') { pr.hits--; if (pr.hits <= 0 && !pr.returning) { pr.hover = true; pr.hoverX = pr.x; } }
            else if (pr.type === 'fist' && !pr.pierce) { pr.hover = true; pr.hoverX = pr.x; }
            else if (!pr.pierce) pr.live = false;
          }
        }
      }
      // Gary mastery: the independent thrown head picks up coins in flight.
      if (pr.type === 'fist' && this.modIds.includes('head')) {
        const pbox = { x: pr.x, y: this.groundYAt(pr.x) - pr.alt - 4, w: 8, h: 8 };
        for (const pickup of this.pickups) {
          if (!pickup.live || !pickup.def.coin) continue;
          const box = { x: pickup.x, y: this.groundYAt(pickup.x) - pickup.alt - pickup.h, w: pickup.w, h: pickup.h };
          if (overlaps(pbox, box)) { pickup.live = false; this.onPickup(pickup); }
        }
      }
      // Enemy shot vs player.
      if (pr.type === 'enemyShot' && pr.telegraph <= 0) {
        const pbox = { x: pr.x, y: this.groundYAt(pr.x) - pr.alt - 3, w: 5, h: 5 };
        const playerX = this.playerWorldX();
        const playerBox = this.playerBox();
        if (overlaps(playerBox, pbox) && this.player.rolling && this.relay.current === 'fernwick' && !this.player.rollDeflectUsed) {
          pr.live = false;
          this.player.rollDeflectUsed = true;
          this.player.deflectFlashT = 0.25;
          Audio.sfx('shield');
          this.score += 25;
          this.floatText('DEFLECTED', '#a8e6ff');
        } else if (overlaps(playerBox, pbox) && !this.player.invincible) {
          pr.live = false;
          this.takeHit('SHOT BY A DRONE WITH A GRUDGE');
        }
      }
    }
    if (!this.projectiles.some((p) => p.live && p.type === 'fist')) this.player.fistThrown = false;
    if (!this.projectiles.some((p) => p.live && p.type === 'axe')) this.player.axeThrown = false;
    // A hovering weapon belongs to its thrower — another hero cannot catch it.
    if (this.relay.current !== 'grumpos') {
      for (const pr of this.projectiles) { if (pr.type === 'axe') pr.live = false; }
    }
    if (this.relay.current !== 'raymn') {
      for (const pr of this.projectiles) { if (pr.type === 'fist') pr.live = false; }
    }
    this.projectiles = this.projectiles.filter((p) => p.live);
  }

  // Star power: swap the music over on the edges, and shed sparkles while it
  // lasts. The visual half of the cue lives in drawHeroSprite.
  updateInvincibility() {
    const on = this.powerups.isInvincible();
    if (on !== this.invActive) {
      this.invActive = on;
      Audio.setInvincible(on);
      Audio.sfx(on ? 'star' : 'starEnd');
    }
    if (!on || this.save.settings.reducedMotion) return;
    if (this.fxRng.chance(0.6)) {
      const hue = Math.floor((this.tRun * 420 + this.fxRng.float() * 90) % 360);
      const gy = this.playerGroundY();
      spawn(this.camX + PLAYER_X + 6 + (this.fxRng.float() - 0.5) * 10,
        gy - this.player.y - 6 - this.fxRng.float() * 16,
        -50 - this.fxRng.float() * 60, -20 + this.fxRng.float() * 40,
        0.45, `hsl(${hue},95%,66%)`, 1.4, -25);
    }
  }

  // Cut the star short. Drops the power itself so the aura goes too — he
  // celebrates as himself, not as a sparkling one — and takes the music edge
  // down by hand, because the only caller that watches for that edge
  // (updateInvincibility) stops running once the finale hold owns the frame.
  // No starEnd chirp: the catch already has the slide whistle, the contact and
  // the sparks, and a fourth sound on that frame is just noise.
  endInvincibility() {
    delete this.powerups.active.unpeel;
    if (!this.invActive) return;
    this.invActive = false;
    Audio.setInvincible(false);
  }

  updateCoinMagnet(dt) {
    const hero = HERO_BY_ID[this.relay.current];
    let radius = Math.max(hero.magnetRadius * (this.modIds.includes('bigmagnet') ? 2 : 1), this.powerups.magnetRadius());
    if (radius <= 0) return;
    const px = this.camX + PLAYER_X, py = this.groundYAt(px) - this.player.y - 8;
    for (const p of this.pickups) {
      if (!p.live || (!p.def.coin && !(this.powerups.active.magnet && this.powerups.active.magnet.level >= 4))) continue;
      const dx = px - p.x, dy = py - (this.groundYAt(p.x) - p.alt);
      const d2 = dx * dx + dy * dy;
      if (d2 < radius * radius) {
        const d = Math.max(8, Math.sqrt(d2));
        p.x += (dx / d) * 220 * dt;
        p.alt -= (dy / d) * 220 * dt;
      }
    }
  }

  updateTaunts(dt) {
    if (this.overtime) return;
    this.tauntT -= dt;
    if (this.tauntT <= 0) {
      this.tauntT = 55 + this.fxRng.range(0, 20);
      // In-run taunts are ambient texture only. The cabinet's authored line is
      // not played here — the stage-1 briefing already delivers it, expanded.
      this.speech = { text: this.fxRng.pick(EGGSHELL_TAUNTS), t: 3.2, who: 'eggshell' };
    }
    if (this.narrateT > 0) {
      this.narrateT -= dt;
      if (this.narrateT <= 0) {
        this.narrateT = 18 + this.fxRng.range(0, 10);
        // Narration is Eggshell speaking, so it comes out of his mouth — the
        // speech bubble — not the feedback stack, where it read as a game event.
        this.speech = { text: this.fxRng.pick(EGGSHELL_NARRATION), t: 3.2, who: 'eggshell' };
      }
    }
  }

  updateMission(dt) {
    const m = this.mission;
    if (m.type === 'cords') {
      this.missionTimers.cord -= dt;
      if (this.missionTimers.cord <= 0 && m.count + this.pickups.filter((p) => p.def.cord).length < m.n) {
        this.missionTimers.cord = (this.totalDist / this.speed) / (m.n + 2);
        // A piece that could not be placed clear of the lane's hazards is not a
        // piece the mission gives up on — come back for it in a moment, by
        // which time the stretch being offered is different ground.
        if (!this.spawnObjective('cord', this.fxRng.pick([10, 30, 46]))) this.missionTimers.cord = 0.6;
      }
    }
    if (m.type === 'rescue') {
      this.missionTimers.resident -= dt;
      if (this.missionTimers.resident <= 0 && m.count < m.n) {
        this.missionTimers.resident = (this.totalDist / this.speed) / (m.n + 1.5);
        if (!this.spawnObjective('resident', 0)) this.missionTimers.resident = 0.6;
      }
    }
    if (this.challenge && this.challenge.type === 'coins') this.challenge.count = this.coins;
    if (this.challenge && this.challenge.type === 'onbeat') { /* counted on input */ }
    this.checkGoalsMet();
  }

  // A replacement cord or resident, dropped far enough ahead that it scrolls in
  // rather than popping into an occupied screen.
  //
  // It must also land THIS side of the breaker. Past the tape the draw culls it
  // (see the finishX gate in draw) and the run ends before the hero gets there,
  // so the very piece the mission is still waiting on would be both invisible
  // and unreachable — a MISSION INCOMPLETE with nothing on screen to explain
  // it. The spawner obeys the same rule for hazards; this one used to sit above
  // that gate and skip it. So: slide the last one back to the final spot that
  // still fits, and once even that has fallen behind the screen edge, stop
  // offering pieces that cannot be taken.
  //
  // The wall is FINISH_CLEAR, the same one the pattern lane and the drip stop
  // at, not a token 24px of daylight. A late cord or resident used to be placed
  // at the very foot of the pole — standing on the plunger, close enough to
  // read as part of the marker — which is exactly the clutter the clear
  // approach exists to prevent. A piece is a piece whether the mission wants it
  // or the lane placed it.
  spawnObjective(type, alt) {
    const def = PICKUPS[type];
    const maxX = this.finishWorldX() - FINISH_CLEAR - def.w;
    const x = this.clearOfHazards(Math.min(this.camX + W + 80, maxX), def.w, alt, def.h, maxX);
    if (x == null || x < this.camX + VIEW_W) return false;
    this.pickups.push(makePickup(type, x, alt));
    return true;
  }

  // Objectives are not placed by the Spawner: they appear on a mission timer at
  // a fixed distance ahead, dropped into a lane that was filled seconds ago and
  // knows nothing about them. So a cord could land in a cactus's shadow — right
  // beside it, at ground height — where the only line to the piece runs through
  // the spikes. The mission demands the piece; the lane says you cannot have it
  // without taking the hit. That is not a difficulty spike, it is a dead end.
  //
  // Nudge the piece downstream until it stands in the clear. HAZARD_CLEAR is
  // LANDING room rather than a fairness gap like Spawner.fairGap: you only have
  // to be able to come down beside the piece and take it, not to be given a
  // fresh input window for it.
  //
  // Height is part of the test. A cord strung above a cactus is collected by the
  // very jump that clears the cactus — a good beat, not an unfair one — so only
  // hazards that share the piece's band push it. And only HAZARDS: boost pads
  // and breakable bonus targets are things you want to be next to.
  //
  // Returns null when there is no clear spot left before the breaker, which the
  // caller treats the same way as being past it: skip this piece and offer the
  // next one later, rather than plant one that cannot be taken.
  clearOfHazards(x, w, alt, h, maxX) {
    const PAD = 30;         // landing room either side, in world units
    const BAND = 4;         // slack above a hazard's crown before it stops mattering
    const inBand = (ob) => alt < ob.alt + ob.h + BAND && alt + h > ob.alt - BAND;
    const threat = (ob) => ob.live && !ob.def.isBoost && !ob.def.isTarget && !ob.def.isSwitch;
    // Several passes: clearing one hazard can walk the piece into the next.
    for (let pass = 0; pass < 8; pass++) {
      let moved = false;
      for (const ob of this.obstacles) {
        if (!threat(ob) || !inBand(ob)) continue;
        if (x < ob.x + ob.w + PAD && x + w > ob.x - PAD) { x = ob.x + ob.w + PAD; moved = true; }
      }
      if (!moved) break;
    }
    return x > maxX ? null : x;
  }

  // The HUD no longer carries a standing plug tally, so the moment a plug comes
  // within reach has to announce itself or it passes unremarked — you would
  // learn you had banked the challenge on the results screen. Checked here, at
  // the end of updateMission, because every counter has settled for the frame
  // by this point; hooking each increment site instead would mean remembering
  // to do it again the next time a challenge type is added.
  //
  // Fires once per goal. A noDamage challenge is deliberately silent: it is "on
  // track" from the first frame and only becomes true by surviving, so there is
  // no moment to announce — congratulating you at 0:00 for taking no damage yet
  // would be both meaningless and a jinx.
  checkGoalsMet() {
    if (this.overtime || !this.stage) return;
    const c = this.challenge;
    if (c && !this.goalSeen.challenge && !c.failed && c.type !== 'noDamage' && c.count >= c.n) {
      this.goalSeen.challenge = true;
      this.goalToast(`BONUS: ${c.desc}`);
      this.bonusT = BONUS_HOLD;   // re-open the panel to say it in words, then fold back
    }
    // Only counted missions have a moment to catch. reach/fuse/blackout/escape
    // are satisfied by surviving to the socket, which is the run ending anyway.
    if (this.mission.n && !this.goalSeen.mission && this.missionSatisfied()) {
      this.goalSeen.mission = true;
      this.goalToast('GOAL MET. GO FLIP THE BREAKER.');
    }
  }

  // One at a time, queued: two plugs landing together (a coin challenge topping
  // out as you grab the toaster) would otherwise print over each other.
  goalToast(text, quiet = false) {
    this.goalToasts.push({ text, t: 2.4, t0: 2.4 });
    if (!quiet) Audio.sfx('perfect');
  }

  checkOnBeat() {
    const phase = Audio.beatPhase();
    if (phase < 0.18 || phase > 0.82) {
      // Silent: this can fire several times a second for a whole stage. The
      // challenge counter in the HUD is the readout.
      this.challenge.count++;
      this.score += 20;
    }
  }

  /**
   * The reason to go up there.
   *
   * A row of coins along the slab, spawned once as it comes into view. They are
   * ORDINARY air pickups at the slab's height, not a new kind of entity: the
   * game already places coins in arcs above the lane, and a hero standing on
   * the island is at exactly the altitude that runs through them. Nothing about
   * pickup collision, magnetism or the coin combo needs to learn what an island
   * is.
   *
   * `alt` is measured up from the BASE ground because that is the frame every
   * pickup is boxed against, so it is the slab's height above the ground under
   * each coin — which is not a constant, since the ground rolls and the slab
   * does not.
   */
  /**
   * The catapult. What a spring pad does when a hero runs onto it.
   *
   * Solved for HEIGHT, at the moment of contact, against the hero who is
   * actually standing on it. That is what makes one pad serve the whole relay
   * bag: Grumpos falls under 1.25g and everyone else under 1g, so a fixed
   * launch velocity would throw the cast to eight different altitudes and a
   * road placed for the average of them would be unreachable for a quarter of
   * them. Taking the apex as the given and the velocity as the unknown —
   * v = sqrt(2gh) — puts every hero at the same height, and the only thing
   * their weight still changes is how far along the road they come down, which
   * is what `lip` is for.
   *
   * The gravity multiplier is in there too, so the pad still works while a
   * low-gravity power-up is running rather than firing the hero into orbit.
   */
  springLaunch(ob) {
    const road = ob.springFor;
    const target = (road ? road.entry : 60) + SPRING_CLEAR;
    const g = this.player.gravity * this.powerups.gravityMultiplier();
    this.player.launch(Math.sqrt(2 * g * target));
    this.player.jumpFace = rollJumpFace(this.fxRng, this.player.jumpFace);
    Audio.sfx('boost');
    Audio.sfx('slideWhistle');
    this.score += 50;
    burst(ob.x + ob.w / 2, this.groundYAt(ob.x) - 2, 10, 70, 0.45, '#f6d33c', 1, 90,
      () => this.fxRng.float());
  }

  /**
   * The way onto a road that is too high to jump to.
   *
   * Placed rather than authored. The pad has to sit exactly far enough back
   * that the arc it fires is coming DOWN as it crosses the road's mouth — a
   * hero still rising passes up through a road rather than landing on it (see
   * updateRoute's one-way rule), so a pad a little too close throws him
   * straight through the thing it was aiming at. Time to apex is sqrt(2h/g)
   * and the lane moves at `speed`, so the distance back is the product, and
   * SPRING_LEAD carries the apex just inside the lip rather than onto its edge.
   *
   * Gravity here is the plain one, not the standing hero's: the pad is world
   * furniture and has to be in the same place for everybody. The spread that
   * leaves — a heavy hero apexes about a tenth of the run earlier — is what
   * the road's flat `lip` absorbs.
   */
  spawnRouteEntries() {
    for (const r of this.routes) {
      if (r.sprung || this.camX + W + 240 < r.x) continue;
      r.sprung = true;
      // A tunnel's mouth is a HOLE, and the lane already knows how to have one:
      // a gap obstacle is exactly the right shape, both terrain renderers carve
      // it for free, and it telegraphs itself the way every other gap on the
      // stage does. `tunnel` is what stops it also being the death it usually
      // is — falling in here is the point rather than the failure, and
      // updateRoute catches the hero on the road below.
      if (r.kind === 'tunnel') {
        // Every hole along it — and the entrance too, unless that entrance is a
        // RAMP, which is not an opening at all: the lane runs over the top of it
        // and the route peels away downward underneath, so there is nothing to
        // cut and nothing to fall through.
        for (const span of [...(r.ramp ? [] : [{ x: r.x, w: r.mouthW }]), ...(r.holes || [])]) {
          const hole = makeObstacle('gap', span.x, {});
          hole.w = span.w;
          hole.tunnel = r;
          this.obstacles.push(hole);
        }
        this.populateRoute(r);
        continue;
      }
      this.populateRoute(r);
      if (!r.spring) continue;
      const h = r.entry + SPRING_CLEAR;
      const back = Math.sqrt((2 * h) / GRAVITY) * this.speed;
      const px = r.x + SPRING_LEAD - back;
      const pad = makeObstacle('springPad', px, 0);
      pad.springFor = r;
      this.obstacles.push(pad);
      // Nothing to react to on the approach. The pad is not a hazard, but the
      // run-up to it is the one stretch where the player is choosing rather
      // than dodging, and a crate in it turns the choice into a scramble.
      for (const ob of this.obstacles) {
        // A spring pad and a tunnel's own mouth are ROUTE FURNITURE, not lane
        // clutter. Sweeping the mouth is exactly right for everything standing
        // on it and exactly wrong for the hole itself, which is the thing the
        // sweep is clearing a path TO — and the sweep runs after the mouth is
        // laid, so without this it deleted it every time.
        if (!ob.live || !ob.def || ob.def.isSpring || ob.tunnel || ob.route) continue;
        if (ob.def.action === 'none' && !ob.def.isGap) continue;
        if (ob.x + ob.w >= px - this.spawner.react * this.speed && ob.x <= px + pad.w + 20) ob.live = false;
      }
    }
  }

  /**
   * Furnish a road, so that going down there is a SECTION rather than a
   * corridor with a prize at the end of it.
   *
   * An empty tunnel is a held breath: the choice was made at the mouth and then
   * nothing happens for four seconds. What makes it a place is having the same
   * things to deal with as the lane — something to jump, something to smash —
   * so the road is somewhere you are PLAYING rather than somewhere you are
   * being conveyed.
   *
   * It is not a second `Spawner`, and deliberately not. The spawner's job is
   * pattern selection, difficulty ramp, mission furniture and the finish wall,
   * none of which a branch wants; what a branch needs from it is the ONE
   * invariant that makes a lane fair, which is that consecutive things you must
   * react to are at least a reaction runway apart. That is `spawner.react`, and
   * it is read here rather than reimplemented.
   *
   * The RNG is a named stream off the run's own seed, so a road is identical on
   * a replay and the main lane's sequence is undisturbed by whether the branch
   * was ever generated.
   */
  populateRoute(r) {
    if (r.populated || !r.hazards || !r.hazards.length) return;
    r.populated = true;
    const rng = this.rng.stream(`route:${r.kind}:${Math.round(r.x)}`);
    const speed = this.baseSpeed();
    // The reaction runway is a FLOOR, not a rhythm — it is the closest two
    // things you must react to may ever be, and a lane built at exactly that
    // spacing is a wall of hazards that happens to be technically survivable.
    // 2.2x of it, jittered up to another half again, puts a branch at roughly
    // one event a second, which is a section you play rather than a gauntlet
    // you endure. The floor underneath it is what protects the slowest stage.
    const gap = Math.max(110, this.spawner.react * speed * 2.2);
    // Start clear of the way IN and stop clear of the way OUT. On a tunnel that
    // is the mouth he is still falling down; on a sky road it is the lip he is
    // still landing on, and at the far end it is the drop he does not choose
    // the timing of.
    const from = r.x + (r.kind === 'tunnel' ? r.mouthW + gap * 0.6 : r.w * r.lip + gap * 0.4);
    const to = r.x + r.w - gap * 0.8;
    // NOTHING under an opening, and nothing in the run-up to one. A hole is a
    // choice, and a hazard sitting in it — or close enough in front of it that
    // dodging drops you through — turns the choice into an ambush: the player
    // did not decide to go underground, the lane decided for him. The openings
    // are `holes`, which populateRoute has to know about because they are cut
    // into the middle of the very span it is furnishing.
    const openings = r.kind === 'tunnel' ? (r.holes || []) : [];
    const overOpening = (x, w2) => openings.some((h) =>
      x + w2 >= h.x - OPENING_CLEAR && x <= h.x + h.w + OPENING_CLEAR);
    for (let x = from; x < to; x += gap * (0.9 + rng.float() * 0.7)) {
      const type = r.hazards[rng.int(0, r.hazards.length - 1)];
      const ob = makeObstacle(type, x, {});
      if (overOpening(x, ob.w)) continue;
      // The one field that puts it underground. Everything else about it —
      // hitbox, breaking, debris, drawing — is an ordinary obstacle's.
      ob.route = r;
      this.obstacles.push(ob);
    }
  }

  spawnRoutePrizes() {
    for (const is of this.routes) {
      if (is.spawned || this.camX + W < is.x) continue;
      is.spawned = true;
      // Inset from both ends so nothing sits where the hero is still landing or
      // already leaving, and so the row reads as ON the road.
      const inset = 14;
      if (is.prize === 'coins') {
        for (let x = is.x + inset; x <= is.x + is.w - inset; x += COIN_GAP) {
          // Nothing strung over a break in the road. A coin you cannot reach
          // without leaving the road is a coin that punishes you for taking it.
          if (!roadAt(x, is)) continue;
          const alt = this.groundYAt(x) - this.routeGroundY(x, is) + COIN_FLOOR;
          this.pickups.push(makePickup('coin', x, alt));
        }
      } else if (is.prize) {
        const x = is.x + is.w / 2;
        const alt = this.groundYAt(x) - this.routeGroundY(x, is) + COIN_FLOOR;
        this.pickups.push(makePickup(is.prize, x, alt));
      }
      // The one big thing, two thirds of the way along, on top of whatever the
      // coin run pays. Placed late on purpose: a power-up sitting at the mouth
      // pays out before the road has asked anything of you.
      if (is.bonus) {
        const x = is.x + is.w * 0.66;
        const alt = this.groundYAt(x) - this.routeGroundY(x, is) + COIN_FLOOR + 6;
        this.pickups.push(makePickup(is.bonus, x, alt));
      }
      // The road NOT taken. A fork is only a decision if the two sides are worth
      // different things — coins up and a power-up down means the answer depends
      // on what you need right now, where "one road simply pays better" would be
      // solved once and then stop being a choice. The low road is the base
      // ground, so its prize is an ordinary ground-level pickup.
      if (is.lowPrize) {
        this.pickups.push(makePickup(is.lowPrize, is.x + is.w / 2, COIN_FLOOR));
      }
      // A tunnel mouth is drawn out of the same gap a PIT is drawn out of, and
      // from the lane the two are the same hole — one kills you and one is a
      // road, and nothing on the surface says which. Coins do. A line of them
      // diving in is the oldest "this way" the genre has, and on the approach
      // it is the only warning the player gets, so it is laid for every tunnel
      // whatever else that tunnel is paying.
      if (is.kind === 'tunnel') {
        const n = 5;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const x = is.x + 5 + t * (is.mouthW - 10);
          const drop = this.groundYAt(x) - this.routeGroundY(x, is);   // negative
          this.pickups.push(makePickup('coin', x, COIN_FLOOR + t * drop));
        }
      }
    }
  }

  /**
   * The two places an island makes the lane unfair, swept together.
   *
   * ONE — the far lip's landing. Stepping off is the only move in the game whose
   * timing the player does not choose: the slab runs out and gravity takes over.
   * A hazard where they come down is unfair in a way the spawner's own invariant
   * does not cover, because `fairGap` reasons about a hero on the ground with a
   * jump in hand and this hero is already committed to a fall.
   *
   * TWO — anything tall enough to reach into the slab. Short hazards passing
   * underneath are the point and they stay; a stacked crate is a different
   * thing. Its hitbox is measured from the ground and would overlap a hero
   * standing on the island, so being up there would not be safe after all —
   * and it draws straight through the slab, which says the opposite.
   *
   * THREE — the way OUT of a tunnel. Twelve seconds under the lane is twelve
   * seconds of not seeing it, so a hero surfacing has no idea what is standing
   * where he comes up. `fairGap` assumes a hero who has been watching the lane
   * approach; this one has been watching a cave.
   *
   * Retired rather than never spawned: the lane is filled far ahead of the
   * sweep, and dropping the offending obstacle is much less invasive than
   * teaching the spawner about a second kind of wall.
   *
   * CONTINUOUS, not one-shot. It used to fire once, gated on the route's far
   * END coming within lookahead — which is fine for a 74px island and badly
   * wrong for a 1920px tunnel, because the camera does not reach 200px short of
   * that end until long after the hero has run into the mouth. The entrance was
   * being cleared several seconds after he had already fallen through it. And
   * even correctly timed, one shot cannot hold: the spawner keeps filling ahead
   * of the sweep for as long as the route lasts, so anything laid afterwards
   * floated over the hole it was laid on. Every check below is idempotent —
   * they only ever clear `live` — so re-running is free.
   */
  clearRouteHazards() {
    for (const is of this.routes) {
      // In range if any part of the route is inside the lane's lookahead and
      // has not gone by. Bounded by the obstacle list, which is culled, and by
      // the handful of routes a stage carries.
      if (is.x > this.camX + W + 200 || is.x + is.w < this.camX - 100) continue;
      // Where the hero lands off the end, and the first moment they could act on
      // whatever is waiting there. A fork has already converged by the time its
      // span closes, so there is no fall and no exit window to clear — the hero
      // arrives on the ground running, with a jump in hand, which is exactly the
      // case the spawner's own invariant already covers.
      // Where the hero lands off the end, and the first moment he could act on
      // whatever is waiting there. Keyed to the actual DROP rather than to the
      // kind of road: a route that converges leaves him running with a jump in
      // hand — the case the spawner's own invariant already covers — and one
      // that stops at height leaves him committed to a fall he did not choose
      // the timing of, which it does not.
      const exitFrom = is.x + is.w;
      const fall = this.routeExitDrop(exitFrom, is);
      const exitTo = fall <= 0.01 ? exitFrom
        : exitFrom + Math.sqrt((2 * fall) / GRAVITY) * this.speed
          + this.spawner.react * this.speed;
      for (const ob of this.obstacles) {
        // A spring pad and a tunnel's own mouth are ROUTE FURNITURE, not lane
        // clutter. Sweeping the mouth is exactly right for everything standing
        // on it and exactly wrong for the hole itself, which is the thing the
        // sweep is clearing a path TO — and the sweep runs after the mouth is
        // laid, so without this it deleted it every time.
        if (!ob.live || !ob.def || ob.def.isSpring || ob.tunnel || ob.route) continue;
        // A TUNNEL runs UNDER the lane, so nothing on the lane is in its way and
        // the slab test below — which asks whether a hazard reaches up into the
        // road — would answer yes for every obstacle on the stage. Only its
        // MOUTH touches the lane, and that is a hole: whatever was standing
        // there is standing on nothing.
        if (is.kind === 'tunnel') {
          // NO PIPES OVER A TUNNEL, anywhere along it — not just at the holes.
          //
          // A pipe standing on the lane above an underground chamber is a
          // promise the game does not keep: it is the one prop in the genre that
          // means "you can go down here", and it is sitting on the roof of the
          // one place you actually can. The player reads it as the way in, tries
          // it, and finds an obstacle to jump. Every other hazard is honest
          // about being a hazard; this one is not, so it does not stand here.
          // `type`, not `kind` (every obstacle's kind is 'obstacle') and not
          // `def.sprite` (the pipe def wears the crate sprite).
          if (ob.type === 'pipe') { ob.live = false; continue; }
          // Each way in gets the same clearance the entrance gets: whatever was
          // standing on a hole is standing on nothing.
          let onHole = false;
          for (const span of [{ x: is.x, w: is.mouthW }, ...(is.holes || [])]) {
            if (ob.x + ob.w >= span.x - 8 && ob.x <= span.x + span.w + 8) { onHole = true; break; }
          }
          if (onHole) { ob.live = false; continue; }
          // And the way OUT. A tunnel converges, so the hero surfaces running
          // with a jump in hand — which is the case `fairGap` covers, and it is
          // still not enough here. `fairGap` reasons about a hero who has been
          // watching the lane come toward him; this one has spent twelve seconds
          // under it looking at a cave, and arrives with no idea what is
          // standing where he comes up. One reaction runway, cleared.
          if (ob.def.action !== 'none' && ob.x + ob.w >= exitFrom
            && ob.x <= exitFrom + this.spawner.react * this.speed) ob.live = false;
          continue;
        }
        // Measured at the OBSTACLE's x, not once for the whole route: a fork's
        // road descends, so a crate that clears it at the mouth can still be
        // buried in it near the merge. A single height would keep exactly the
        // hazards that the converging half runs into.
        // Read from terrain.js rather than kept here: this is the height of the
        // thing on screen, and a sweep measuring a slab thinner than the one
        // drawn leaves hazards standing through the platform.
        const underside = this.routeGroundY(ob.x, is) + ISLAND_THICKNESS + 3;
        const inExit = ob.x + ob.w >= exitFrom && ob.x <= exitTo && ob.def.action !== 'none';
        const underSlab = ob.x + ob.w >= is.x && ob.x <= exitFrom
          && this.groundYAt(ob.x) - ob.alt - ob.h < underside;
        if (inExit || underSlab) ob.live = false;
      }
    }
  }

  spawnApplianceMaybe() {
    if (this.overtime || !this.stage || this.applianceSpawned) return;
    const at = this.stage.applianceAt * this.totalDist;
    if (this.camX + W > at) {
      const alt = this.stage.applianceHigh ? 52 : 44;
      // Same clearance the cords get. It rides high enough that most ground
      // hazards never touch the test, but the one appliance a stage offers is
      // the worst possible thing to strand behind a shooter drone.
      //
      // And the same wall the lane gets. This one used to pass Infinity, so a
      // late appliance could come to rest inside the finishing straight or past
      // the tape entirely — where the draw gate refuses to paint it. It is a
      // bonus rather than a mission piece, so unlike spawnObjective it takes the
      // full clear lane rather than squeezing into the last slot before the pole.
      const maxX = this.finishWorldX() - FINISH_CLEAR - PICKUPS.appliance.w;
      const x = this.clearOfHazards(Math.min(at + W, maxX), PICKUPS.appliance.w, alt, PICKUPS.appliance.h, maxX);
      // No legal spot this frame — a hazard is sitting on the last one. Try
      // again next frame rather than write the stage's only appliance off: the
      // blocker is usually a shambler walking out of the way. `applianceSpawned`
      // is set only on success, so the "one per stage" rule still holds.
      if (x == null) return;
      this.applianceSpawned = true;
      const p = makePickup('appliance', x, alt);
      p._baseAlt = alt;
      p._baseX = p.x;
      this.pickups.push(p);
    }
  }

  checkCheckpoints() {
    if (!this.checkpoints.length) return;
    if (this.distance >= this.checkpoints[0]) {
      this.checkpoints.shift();
      Audio.sfx('checkpoint');
      const restored = this.modIds.includes('osha') ? 2 : 1;
      this.battery = Math.min(this.maxBattery(), this.battery + restored);
      this.floatText(`CHECKPOINT. +${restored} CELL${restored > 1 ? 'S' : ''}. SINCERELY.`, '#8ddd8d');
      this.snapshot = this.makeSnapshot();
      // Rescue delivery.
      if (this.mission.type === 'rescue') {
        const carried = this.pickups.filter((p) => p.following);
        for (const p of carried) { p.live = false; this.mission.count++; }
        if (carried.length) this.floatText(`RESIDENTS DELIVERED: ${this.mission.count}/${this.mission.n}`, '#48e0c8');
      }
    }
  }

  makeSnapshot() {
    return {
      camX: this.camX, tRun: this.tRun, score: this.score, coins: this.coins,
      battery: this.maxBattery(),
      mission: JSON.parse(JSON.stringify(this.mission)),
      challenge: this.challenge ? JSON.parse(JSON.stringify(this.challenge)) : null,
      // elapsed + spawned together: restoring one without the other either
      // replays portals already passed or skips the ones still owed.
      relayState: {
        current: this.relay.current, next: this.relay.next, bag: this.relay.bag.slice(),
        spawned: this.relay.spawned, elapsed: this.relay.elapsed,
      },
      abilityCooldowns: { ...this.player.abilityCooldowns },
      relayCharge: this.player.relayCharge,
      spawnerX: this.spawner.nextX,
      applianceSpawned: this.applianceSpawned, applianceGot: this.applianceGot,
      escapeWall: this.escapeWall,
      copterCaught: this.copter ? this.copter.caught : 0,
      // Which road the hero is on, as an INDEX rather than the island object:
      // a snapshot outlives the frame it was taken in, and storing the live
      // object would tie a restore to an entity graph that has moved on.
      route: this.routes.indexOf(this.route),
      // And where the camera was pinned while he was on it. Restoring the road
      // without the anchor drops a hero who checkpointed on a cloud back into a
      // frame still centred on the groundline two hundred pixels below him.
      camFloorY: this.camFloorY,
    };
  }

  restoreSnapshot(s) {
    this.camX = s.camX; this.tRun = s.tRun; this.score = s.score; this.coins = s.coins;
    this.battery = s.battery;
    this.mission = JSON.parse(JSON.stringify(s.mission));
    this.challenge = s.challenge ? JSON.parse(JSON.stringify(s.challenge)) : null;
    if (s.relayState) {
      this.relay.current = s.relayState.current;
      this.relay.next = s.relayState.next;
      this.relay.bag = s.relayState.bag.slice();
      this.relay.spawned = s.relayState.spawned || 0;
      this.relay.elapsed = s.relayState.elapsed || 0;
    }
    this.player = new Player(this.relay.current, this.modIds);
    // A fresh Player starts at altitude 0, which means "on the floor" — so the
    // floor has to be the one the snapshot was taken on, or the hero is stood
    // on the base ground while the run still believes he is on a slab.
    this.route = s.route >= 0 ? this.routes[s.route] : null;
    this.camFloorY = s.camFloorY ?? GROUND_Y;
    this.player.abilityCooldowns = { ...(s.abilityCooldowns || {}) };
    this.player.relayCharge = !!s.relayCharge;
    this.spawner.nextX = Math.max(s.spawnerX, s.camX + 400);
    this.spawner.lastActionX = s.camX;
    this.obstacles = []; this.pickups = []; this.projectiles = []; this.chompBites = [];
    this.portal = null;
    this.applianceSpawned = s.applianceSpawned; this.applianceGot = s.applianceGot;
    this.escapeWall = s.escapeWall != null ? s.camX - 140 : null;
    if (this.copter) { this.copter.caught = s.copterCaught; this.copter.cooldown = 2; }
    // Checkpoints all sit short of the breaker, so a restore that happened to
    // come from a death on the finish run has to put the camera back in charge
    // of moving the world — otherwise the run resumes frozen mid-tape-cross,
    // with the hero parked wherever they fell.
    this.finishing = false;
    this.finishT = 0;
    this.finishPlayerX = PLAYER_X;
    this.flip = null;
    this.flipCoins = null;
    this.dead = false;
    this.player.iframes = 0.75;
    this.speechQueue = []; // pre-death banter does not survive the respawn
    clearParticles();
    this.resetRenderInterpolation();
  }

  // ------------------------------------------------------------------ rewind
  // Record a snapshot on the fixed cadence during normal forward play.
  // After recording, discard the oldest if the buffer is full.
  recordRewindFrame(dt) {
    // Asked every frame rather than once per run so a pad paired mid-run starts
    // recording. The ring allocates its records lazily, so a run that never
    // captures never pays for one — there is nothing to tear down here.
    if (REWIND_DISABLED || !Input.rewindAvailable()) return;
    this.rewindCaptureT += dt;
    if (this.rewindCaptureT < REWIND_STEP) return;
    this.rewindCaptureT -= REWIND_STEP;
    // The ring hands back the record to overwrite, which once it is full is the
    // oldest one — so recycling and discarding the oldest are the same act.
    const captureAt = updateProfileMark();
    this.writeRewindSnapshot(this.rewindFrames.slotForWrite());
    updateProfileAdd('rewindMs', captureAt);
  }

  // Record everything the rewind needs to restore — camera, player, relay,
  // world entities, spawners, powerups, RNG streams, mission state — INTO an
  // existing record handed over by the ring, reusing its objects, arrays and
  // Sets rather than building a new graph every capture. See the recycling
  // helpers above for why this is safe: restoreRewindSnapshot copies every
  // field back out, so nothing here is ever aliased into the live world.
  writeRewindSnapshot(s) {
    // Camera & run
    s.camX = this.camX; s.camZoom = this.camZoom; s.camPan = this.camPan;
    s.camFloorY = this.camFloorY;
    s.distance = this.distance; s.tRun = this.tRun; s.score = this.score; s.coins = this.coins;
    s.battery = this.battery; s.damageTaken = this.damageTaken; s.speedBoost = this.speedBoost;
    s.coinCombo = this.coinCombo; s.coinComboT = this.coinComboT;
    s.powerupsCollected = this.powerupsCollected;
    s.hintT = this.hintT; s.bonusT = this.bonusT;
    // Which road he is on. `player.y` is altitude above the CURRENT floor, so
    // restoring y without restoring the floor it was measured from puts the
    // hero at the right height above the wrong thing — rewinding onto a slab
    // would drop him through it, and off one would stand him on air.
    s.route = this.routes.indexOf(this.route);

    // Player mutable state. Written field by field rather than by assignInto:
    // Player carries far more than the rewind restores, and listing what is
    // recorded is what keeps the two halves of this pair honest with each other.
    const p = this.player;
    const ps = s.player || (s.player = {});
    ps.heroId = p.heroId; ps.y = p.y; ps.vy = p.vy; ps.jumps = p.jumps;
    ps.powerJumpBonus = p.powerJumpBonus; ps.ducking = p.ducking;
    ps.duckAmount = p.duckAmount; ps.duckDirection = p.duckDirection;
    ps.floating = p.floating; ps.iframes = p.iframes; ps.anim = p.anim;
    ps.stomping = p.stomping; ps.dashT = p.dashT; ps.rollT = p.rollT;
    ps.launched = p.launched;
    ps.compressT = p.compressT; ps.stumbleT = p.stumbleT;
    ps.rollBashed = p.rollBashed; ps.rollDeflectUsed = p.rollDeflectUsed;
    ps.rollPlows = p.rollPlows; ps.deflectFlashT = p.deflectFlashT;
    ps.powerPoseT = p.powerPoseT; ps.powerType = p.powerType;
    ps.spannerFlurryT = p.spannerFlurryT; ps.spannerFlurryCd = p.spannerFlurryCd;
    ps.spannerFlurryHitIds = copySetInto(p.spannerFlurryHitIds, ps.spannerFlurryHitIds);
    ps.relayCharge = p.relayCharge; ps.chargeFlashT = p.chargeFlashT;
    ps.fistThrown = p.fistThrown; ps.axeThrown = p.axeThrown;
    ps.headless = p.headless; ps.assemblyGraceUsed = p.assemblyGraceUsed;
    ps.hazardEaten = p.hazardEaten; ps.grounded = p.grounded;
    ps.slideT = p.slideT; ps.landedT = p.landedT;
    ps.abilityCooldowns = assignInto(p.abilityCooldowns, ps.abilityCooldowns || {});
    ps.abilityCd = p.abilityCd;
    ps.rollContactIds = copySetInto(p.rollContactIds, ps.rollContactIds);

    // Relay
    s.relayCurrent = this.relay.current; s.relayNext = this.relay.next;
    s.relayBag = copyArrayInto(this.relay.bag, s.relayBag);
    s.relayUsed = copySetInto(this.relay.used, s.relayUsed);
    s.relaySpawned = this.relay.spawned; s.relayElapsed = this.relay.elapsed;
    s.relayTimer = this.relay.portalTimer; s.relayEvery = this.relay.portalEvery;
    s.relayLastTagLine = this.relay.lastTagLine;
    s.relayLastTagLineT = this.relay.lastTagLineT;

    // Powerups
    s.shieldStack = this.powerups.shieldStack;
    const active = s.activePowerups || (s.activePowerups = {});
    for (const id in active) if (!(id in this.powerups.active)) delete active[id];
    for (const id in this.powerups.active) {
      active[id] = assignInto(this.powerups.active[id], active[id] || {});
    }

    // World entities. Counts, not array lengths — the arrays keep their spare
    // objects as a pool (see copyEntitiesInto).
    s.obstacles = s.obstacles || [];
    s.obstacleCount = copyEntitiesInto(this.obstacles, s.obstacles, OBSTACLE_SETS);
    s.pickups = s.pickups || [];
    s.pickupCount = copyEntitiesInto(this.pickups, s.pickups, null);
    s.projectiles = s.projectiles || [];
    s.projectileCount = copyEntitiesInto(this.projectiles, s.projectiles, PROJECTILE_SETS);
    s.chompBites = s.chompBites || [];
    s.chompBiteCount = copyEntitiesInto(this.chompBites, s.chompBites, null, false);
    s.portal = this.portal ? assignInto(this.portal, s.portal || {}) : null;
    s.copter = this.copter ? assignInto(this.copter, s.copter || {}) : null;

    // Spawners
    s.spawnerNextX = this.spawner.nextX;
    s.spawnerLastPatternIdx = this.spawner.lastPatternIdx;
    s.spawnerLastActionX = this.spawner.lastActionX;
    s.spawnerLastActionKind = this.spawner.lastActionKind;
    s.dripCapsuleTimer = this.drip.capsuleTimer;
    s.dripBatteryTimer = this.drip.batteryTimer;
    s.dripLastPowerX = this.drip.lastPowerX;
    s.dripLastPowerType = this.drip.lastPowerType;

    // RNG streams (state is just the internal counter)
    s.rngFx = this.fxRng.state;
    s.rngSpeech = this.speechRng.state;
    s.rngRelay = this.relay.rng.state;
    s.rngSpawn = this.spawner.rng.state;
    s.rngDrip = this.drip.rng.state;

    // Mission / challenge. Still a JSON round-trip: these are small, arbitrarily
    // shaped, and nested, and a wrong deep copy here silently corrupts objective
    // progress — which is worth more than the allocation it costs at 15 Hz.
    s.mission = JSON.parse(JSON.stringify(this.mission));
    s.challenge = this.challenge ? JSON.parse(JSON.stringify(this.challenge)) : null;
    s.applianceSpawned = this.applianceSpawned; s.applianceGot = this.applianceGot;
    s.fuseHeld = this.fuseHeld;
    s.escapeWall = this.escapeWall;

    // Misc
    s.finishing = this.finishing; s.finishT = this.finishT;
    s.finishPlayerX = this.finishPlayerX;
    s.flip = this.flip ? assignInto(this.flip, s.flip || {}) : null;
    s.usedHeroes = copySetInto(this.usedHeroes, s.usedHeroes);
    s.exitSpoken = copySetInto(this.exitSpoken, s.exitSpoken);
    s.checkpointHit = copyArrayInto(this.checkpointHit, s.checkpointHit);
    s.snapshot = null; // death checkpoint not carried across rewind
    return s;
  }

  // Restore the world from a rewind snapshot. Operates in-place on existing
  // objects where possible (player, relay, spawners, RNGs) to avoid breaking
  // references held elsewhere.
  restoreRewindSnapshot(s) {
    // Camera & run
    this.camX = s.camX; this.camZoom = s.camZoom; this.camPan = s.camPan;
    this.camFloorY = s.camFloorY ?? GROUND_Y;
    this.distance = s.distance; this.tRun = s.tRun; this.score = s.score; this.coins = s.coins;
    this.battery = s.battery; this.damageTaken = s.damageTaken; this.speedBoost = s.speedBoost;
    this.coinCombo = s.coinCombo; this.coinComboT = s.coinComboT;
    this.powerupsCollected = s.powerupsCollected;
    this.hintT = s.hintT; this.bonusT = s.bonusT;
    // Before the player fields below: `p.y` is read against this floor.
    this.route = s.route >= 0 ? this.routes[s.route] : null;

    // Player: restore mutable fields in-place.
    const p = this.player;
    const ps = s.player;
    // If the hero changed during the recorded window, setHero to swap rig.
    if (p.heroId !== ps.heroId) p.setHero(ps.heroId);
    p.y = ps.y; p.vy = ps.vy; p.jumps = ps.jumps;
    p.powerJumpBonus = ps.powerJumpBonus; p.ducking = ps.ducking;
    p.duckAmount = ps.duckAmount; p.duckDirection = ps.duckDirection;
    p.floating = ps.floating; p.iframes = ps.iframes; p.anim = ps.anim;
    p.stomping = ps.stomping; p.dashT = ps.dashT; p.rollT = ps.rollT;
    p.launched = !!ps.launched;
    p.compressT = ps.compressT; p.stumbleT = ps.stumbleT;
    p.rollBashed = ps.rollBashed; p.rollDeflectUsed = ps.rollDeflectUsed;
    p.rollPlows = ps.rollPlows; p.deflectFlashT = ps.deflectFlashT;
    p.powerPoseT = ps.powerPoseT; p.powerType = ps.powerType;
    p.spannerFlurryT = ps.spannerFlurryT; p.spannerFlurryCd = ps.spannerFlurryCd;
    p.spannerFlurryHitIds = ps.spannerFlurryHitIds ? new Set(ps.spannerFlurryHitIds) : null;
    p.relayCharge = ps.relayCharge; p.chargeFlashT = ps.chargeFlashT;
    p.fistThrown = ps.fistThrown; p.axeThrown = ps.axeThrown;
    p.headless = ps.headless; p.assemblyGraceUsed = ps.assemblyGraceUsed;
    p.hazardEaten = ps.hazardEaten; p.grounded = ps.grounded;
    p.slideT = ps.slideT; p.landedT = ps.landedT;
    p.abilityCooldowns = { ...ps.abilityCooldowns };
    if (ps.rollContactIds != null) p.rollContactIds = new Set(ps.rollContactIds);

    // Relay
    this.relay.current = s.relayCurrent;
    this.relay.next = s.relayNext;
    this.relay.bag = s.relayBag.slice();
    this.relay.used = new Set(s.relayUsed);
    this.relay.spawned = s.relaySpawned;
    this.relay.elapsed = s.relayElapsed;
    this.relay.portalTimer = s.relayTimer;
    this.relay.portalEvery = s.relayEvery;
    this.relay.lastTagLine = s.relayLastTagLine;
    this.relay.lastTagLineT = s.relayLastTagLineT;

    // Powerups
    this.powerups.shieldStack = s.shieldStack;
    this.powerups.active = {};
    for (const [id, a] of Object.entries(s.activePowerups)) {
      this.powerups.active[id] = { ...a };
    }

    // World entities: deep-restore preserving def references. These go back
    // into the live world, so unlike the recording side they must be fresh
    // objects — the record stays intact for the next pop. Read to the recorded
    // COUNT, not the array length: everything past the count is pool.
    const restoreEntities = (arr, n, setKeys) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const c = { ...arr[i] };
        for (let k = 0; k < setKeys.length; k++) {
          if (c[setKeys[k]]) c[setKeys[k]] = new Set(c[setKeys[k]]);
        }
        out.push(c);
      }
      return out;
    };
    this.obstacles = restoreEntities(s.obstacles, s.obstacleCount, OBSTACLE_SETS);
    this.pickups = restoreEntities(s.pickups, s.pickupCount, EMPTY_SETS);
    this.projectiles = restoreEntities(s.projectiles, s.projectileCount, PROJECTILE_SETS);
    this.chompBites = restoreEntities(s.chompBites, s.chompBiteCount, EMPTY_SETS);
    this.portal = s.portal ? { ...s.portal } : null;
    this.copter = s.copter ? { ...s.copter } : null;

    // Spawners
    this.spawner.nextX = s.spawnerNextX;
    this.spawner.lastPatternIdx = s.spawnerLastPatternIdx;
    this.spawner.lastActionX = s.spawnerLastActionX;
    this.spawner.lastActionKind = s.spawnerLastActionKind;
    this.drip.capsuleTimer = s.dripCapsuleTimer;
    this.drip.batteryTimer = s.dripBatteryTimer;
    this.drip.lastPowerX = s.dripLastPowerX;
    this.drip.lastPowerType = s.dripLastPowerType;

    // RNG streams: restore the internal counter so future draws continue from
    // the historical point rather than the discarded future's state.
    this.fxRng.state = s.rngFx;
    this.speechRng.state = s.rngSpeech;
    this.relay.rng.state = s.rngRelay;
    this.spawner.rng.state = s.rngSpawn;
    this.drip.rng.state = s.rngDrip;

    // Mission / challenge
    this.mission = JSON.parse(JSON.stringify(s.mission));
    this.challenge = s.challenge ? JSON.parse(JSON.stringify(s.challenge)) : null;
    this.applianceSpawned = s.applianceSpawned; this.applianceGot = s.applianceGot;
    this.fuseHeld = s.fuseHeld;
    this.escapeWall = s.escapeWall;

    // Misc
    this.finishing = s.finishing; this.finishT = s.finishT; this.finishPlayerX = s.finishPlayerX;
    this.flip = s.flip ? { ...s.flip } : null;
    this.usedHeroes = new Set(s.usedHeroes);
    this.exitSpoken = new Set(s.exitSpoken);
    this.checkpointHit = s.checkpointHit.slice();
    this.snapshot = null;

    // Clear transient visuals.
    this.floaties = [];
    this.speech = null;
    this.speechQueue = [];
    this.goalToasts = [];
    clearParticles();
    // On touch, rebuild the button set since the hero may have changed.
    this.setButtons();
    this.resetRenderInterpolation();
  }

  // ------------------------------------------------------------------ collision
  collide() {
    const playerX = this.playerWorldX();
    const pbox = this.playerBox();
    // Obstacles.
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      // Somebody else's road, somebody else's problem. Cheap enough to run for
      // every obstacle on every frame, and it is the line that lets a road be
      // furnished with real hazards without them reaching up or down into the
      // lane the hero is actually on.
      if (!this.sharesRoute(ob)) continue;
      if (ob.def.isGap) {
        // A tunnel mouth is the same hole drawn the same way, and falling into
        // it is the whole idea rather than the failure — updateRoute has the
        // hero on a road a moment later. It is still a real gap to everything
        // else, which is what makes it carve the ground and telegraph itself.
        if (ob.tunnel) continue;
        // Pit: if player is over the gap at ground level, fall in.
        const over = pbox.x + pbox.w / 2 > ob.x && pbox.x + pbox.w / 2 < ob.x + ob.w;
        if (over && this.player.grounded && this.player.y <= 0) {
          this.takeHit('GRAVITY REMAINS UNDEFEATED', true);
        }
        continue;
      }
      if (ob.def.isSpring) {
        const box = entityBox(ob, this.entityGroundY(ob));
        // `grounded` is the whole interface. Run over it and it fires; jump it
        // and it never sees you — which is what makes the road above it a
        // decision rather than a thing that happens to you.
        if (overlaps(pbox, box) && this.player.grounded && !ob.used) {
          ob.used = true;
          ob.firedT = SPRING_FLARE_T;
          this.springLaunch(ob);
        }
        continue;
      }
      if (ob.def.isBoost) {
        const box = entityBox(ob, this.entityGroundY(ob));
        if (overlaps(pbox, box) && this.player.grounded) {
          if (!ob.used) {
            ob.used = true;
            ob.hitT = BOOST_HIT_TAIL;   // the tick run keeps climbing from here
            ob.tickT = 0.045;
            ob.firedT = BOOST_FLARE_T;
            this.player.boostT = BOOST_LEAN_T;
            this.speedBoost = Math.min(1.0, this.speedBoost + 0.5);
            Audio.sfx('boost');
            this.score += 50;
            if (this.challenge && this.challenge.type === 'boosts') this.challenge.count++;
            // The eight gold particles that used to trail back from here are
            // gone: they were 2px squares, they read as loose dots rather than
            // as anything the pad did, and the ground rush (game/boostFx.js)
            // now carries the whole trail with marks that have a direction.
          }
        }
        continue;
      }
      const box = entityBox(ob, this.entityGroundY(ob));
      // Crates are solid enough to land on, but still hurt when run into.
      // Once a descending player has made a clean top contact, keep that crate
      // harmless until it passes behind them instead of turning the next frame
      // of the same landing into a side hit.
      if (ob.landedOn) {
        if (pbox.x > box.x + box.w) ob.landedOn = false;
        else continue;
      }
      if (!overlaps(pbox, box)) continue;
      if (this.player.rolling && ob.def.ground) {
        this.player.rollContactIds ||= new Set();
        if (!this.player.rollContactIds.has(ob.id)) {
          this.player.rollContactIds.add(ob.id);
          this.projectileImpact({ type: 'shield' }, ob.x + ob.w / 2,
            this.entityGroundY(ob) - ob.alt - ob.h / 2);
        }
      }
      const playerBottom = pbox.y + pbox.h;
      const landedOnCrate = ob.type === 'crate' && this.player.vy <= 0 &&
        pbox.x >= box.x && pbox.x + pbox.w <= box.x + box.w &&
        playerBottom <= box.y + 10;
      if (landedOnCrate) {
        ob.landedOn = true;
        continue;
      }
      // Rolling under a duck-flyer, jumping over: geometric, nothing to do here.
      if (this.player.rolling && ob.def.action === 'duck') continue; // roll always clears duckables
      if (this.player.invincible || this.powerups.isInvincible()) {
        // Targets and switches are objectives, not hazards. Post-hit i-frames
        // must not make a !-crate temporarily unusable.
        if (ob.def.isTarget || ob.def.isSwitch) {
          this.breakObstacle(ob);
          continue;
        }
        if ((this.player.dashT > 0 || this.powerups.isInvincible()) && ob.def.breakable) this.breakObstacle(ob);
        continue;
      }
      // Stomping THROUGH a breakable is the move working, not a hit.
      if (this.player.stomping && ob.def.breakable) {
        this.breakObstacle(ob);
        this.player.vy = 200; this.player.grounded = false; this.player.jumps = 1;
        this.player.stomping = false;
        shake(2, 0.15);
        continue;
      }
      // Lorenzo's spanner flurry: auto-smash the first breakable that enters
      // melee range, then stop swinging. Cooldown starts on contact.
      if (this.player.spannerFlurryT > 0 && ob.def.breakable && ob.def.ground
          && !ob.def.isGap && !this.player.spannerFlurryHitIds.has(ob.id)) {
        this.player.spannerFlurryHitIds.add(ob.id);
        this.projectileImpact({ type: 'spanner' }, ob.x + ob.w / 2,
          this.entityGroundY(ob) - ob.alt - ob.h / 2);
        this.breakObstacle(ob);
        this.player.spannerFlurryT = 0;
        this.player.spannerFlurryHitIds = null;
        if (this.player.spannerFlurryCd > 0) {
          this.player.abilityCd = this.player.spannerFlurryCd;
          this.player.spannerFlurryCd = 0;
        }
        Audio.sfx('crunch');
        shake(2, 0.12);
        this.floatText('WRENCH SMASH', '#f6d33c');
        continue;
      }
      // Fernwick mastery: one breakable ground hazard ends the finite roll in
      // a stumble. The base roll is low and fast, never general invincibility.
      // A charged roll plows through every breakable without the stumble.
      if (this.player.rolling && this.player.rollPlows && ob.def.breakable) {
        this.breakObstacle(ob);
        continue;
      }
      if (this.player.rolling && this.modIds.includes('bash') && !this.player.rollBashed && ob.def.ground && ob.def.breakable) {
        this.player.rollBashed = true;
        this.breakObstacle(ob);
        this.player.rollT = 0;
        this.player.stumbleT = 0.3;
        this.floatText('SHIELD BASH. EARS RINGING.', '#a8e6ff');
        continue;
      }
      // Targets and switches are objectives, not hazards: contact breaks them.
      // (Without this, jumping into a !-crate dealt damage and the
      // break-N-targets missions read as impossible to anyone without an
      // offensive ability equipped.)
      if (ob.def.isTarget || ob.def.isSwitch) {
        this.breakObstacle(ob);
        continue;
      }
      this.takeHit(null, false, ob.type);
      break;
    }
    // Pickups.
    for (const p of this.pickups) {
      if (!p.live) continue;
      if (p.def.resident && p.following) { p.x = playerX - 16; continue; }
      const box = { x: p.x, y: this.groundYAt(p.x) - p.alt - p.h, w: p.w, h: p.h };
      if (!overlaps(pbox, box)) continue;
      p.live = false;
      this.onPickup(p);
    }
  }

  onPickup(p) {
    const hero = HERO_BY_ID[this.relay.current];
    const pickMult = (hero.pickupBonus || 1);
    if (p.def.coin) {
      this.coinCombo++;
      this.coinComboT = 1;
      const val = Math.round(50 * pickMult * this.powerups.scoreMult());
      this.score += val;
      this.coins += 1;
      Audio.sfx('coin', { combo: Math.min(12, this.coinCombo) });
      spawn(p.x, this.groundYAt(p.x) - p.alt - 8, 0, -40, 0.4, '#f6d33c', 1, 0);
    } else if (p.def.heal) {
      // No floatie: the status pill fills the cell on the same frame and the
      // 'power' sting lands with it. Saying it a third time is noise.
      this.battery = Math.min(this.maxBattery(), this.battery + 1);
      Audio.sfx('power');
    } else if (p.def.relayCharge) {
      this.grantRelayCharge();
    } else if (p.def.power) {
      // Only overcharge speaks. The plain grab already shows up as a timer in
      // the power row; overcharging is rare and the HUD states it only faintly.
      const res = this.powerups.grab(p.def.power);
      this.powerupsCollected++;
      Audio.sfx('power');
      if (res.overcharged) this.floatText('OVERCHARGED', '#f6d33c');
    } else if (p.def.appliance) {
      this.applianceGot = true;
      Audio.sfx('win');
      this.score += 500;
      this.coins += 20;
      this.floatText('THE HIGHLY NECESSARY GOLDEN APPLIANCE. IT IS A TOASTER.', '#f6d33c');
      // Quiet: the 'win' jingle above is already this plug's sound. The floatie
      // carries the joke, the toast carries the fact that you banked something.
      this.goalToast('BONUS: THE GOLDEN APPLIANCE', true);
    } else if (p.def.cord) {
      this.mission.count++;
      Audio.sfx('checkpoint');
      this.floatText(`CORD PIECE ${this.mission.count}/${this.mission.n}`, '#48e0c8');
    } else if (p.def.resident) {
      p.live = true; p.following = true;
      Audio.sfx('ui');
      this.floatText('A RESIDENT FOLLOWS YOU. CONFUSED BUT GAME.', '#b2d3b2');
    }
  }

  // ------------------------------------------------------------------ damage
  takeHit(msg, isPit = false, src = null) {
    if (this.player.iframes > 0) return;
    if (this.devInvuln) this.devHits.push({ type: src || (isPit ? 'pit' : 'hazard'), worldX: Math.floor(this.playerWorldX()) });
    // UNPEELABLE deflects hits; gravity remains undefeated (pits still hurt).
    if (!isPit && this.powerups.isInvincible()) {
      this.player.iframes = 0.35;   // debounce repeated same-frame contact
      Audio.sfx('shield');
      this.floatText('UNPEELABLE.', '#e8e8f0');
      return;
    }
    const absorb = this.powerups.absorbHit();
    sunShock(); // the level-1 sun gasps at any real impact (shielded or not)
    if (absorb.absorbed) {
      Audio.sfx('shield');
      shake(3, 0.2);
      // the orb shatters into glass shards
      burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 12, 18, 140, 0.5, '#a8e6ff', 1, 120, () => this.fxRng.float());
      this.floatText('SHIELD BROKE. IT DID ITS JOB.', '#a8e6ff');
      this.player.iframes = 1.2;
      if (this.relay.current === 'fernwick' && this.modIds.includes('prophecyCoupon')) this.coins += 50;
      if (absorb.shockwave) {
        for (const ob of this.obstacles) {
          if (ob.live && ob.def.breakable && Math.abs(ob.x - (this.camX + PLAYER_X)) < 70) this.breakObstacle(ob);
        }
      }
      if (isPit) this.hopOutOfPit();
      return;
    }
    // Ray M'N's loose assembly: the first fatal hit scatters and reforms him.
    const hero = HERO_BY_ID[this.relay.current];
    const graceMax = 1;
    if (hero.assemblyGrace && this.player.assemblyGraceUsed < graceMax && (this.battery <= 1 || this.oneHit)) {
      this.player.assemblyGraceUsed++;
      this.player.headless = 3;
      this.player.iframes = 3;
      Audio.sfx('plop');
      this.floatText("RAY M'N SCATTERED. REASSEMBLY IS IN PROGRESS.", '#48e0c8');
      if (isPit) this.hopOutOfPit();
      return;
    }
    // Crash test absorbs the consequence only. Everything below — sfx, shake,
    // hitstop, the particle burst — still plays, because seeing the reaction is
    // the entire point. Guarding at the top of takeHit instead would render
    // nothing at all.
    if (!this.devInvuln) this.battery--;
    this.damageTaken++;
    if (this.challenge && this.challenge.type === 'noDamage' && !this.challenge.failed) {
      this.challenge.failed = true;
      this.bonusT = BONUS_HOLD;   // losing it is news too — say so before folding back
    }
    if (this.mission.type === 'fuse' && this.battery > 0) this.floatText('THE FUSE SURVIVED. BARELY. IT SAW EVERYTHING.', '#e04848', { solid: true });
    Audio.sfx('hit');
    shake(5, 0.3);
    this.hitstop = 0.08;
    // playerWorldX, not camX + PLAYER_X: on the finish run the hero is the thing
    // moving and the camera is the thing standing still, so the anchor has to be
    // the one that follows them across the screen.
    burst(this.playerWorldX() + 6, GROUND_Y - this.player.y - 8, 16, 90, 0.6, '#e04848', 2, 140, () => this.fxRng.float());
    if (this.battery <= 0) {
      this.die(msg);
    } else {
      // The normal 1.4s of mercy would ghost the hero straight through the next
      // several obstacles. Crash test drops to the same-frame debounce so every
      // hazard in the level actually registers.
      this.player.iframes = this.devInvuln ? 0.35 : 1.4;
      if (isPit) this.hopOutOfPit();
    }
  }

  // ------------------------------------------------------------------- dev
  // Force a clean win from wherever the run currently is. Satisfies the mission
  // and challenge rather than fabricating a result, so the real endRun/rank/
  // reward pipeline is what gets exercised.
  devPerfect() {
    if (this.finished) return;
    this.devForceMission = true;
    if (this.mission && this.mission.n) this.mission.count = this.mission.n;
    if (this.challenge) {
      this.challenge.failed = false;
      if (this.challenge.n) this.challenge.count = this.challenge.n;
    }
    this.applianceGot = true;
    this.damageTaken = 0;
    this.endRun(true);
  }

  // Warp to just before the tape so the finish marker's whole event can be
  // watched without playing the stage that leads to it. The URL form (?finish=N)
  // does this at launch; this is the same thing from inside a live run, because
  // an art pass on the marker is a dozen looks at one four-second beat and
  // reloading the page for each of them is the slow way to do it.
  //
  // Forces the mission on the way past: the finish only ARMS once the mission is
  // satisfied, so warping without it just parks the run at the tape and lets it
  // keep going. Obstacles and pickups beyond the new position are dropped rather
  // than left to arrive all at once out of a region the spawner filled for a
  // player who was never there.
  devRunFinish(leadSeconds = 5) {
    if (this.finished || this.finishing || this.overtime) return;
    this.devForceMission = true;
    const lead = Math.max(0, leadSeconds) * this.baseSpeed();
    const target = Math.max(0, this.finishCameraX() - lead);
    if (target <= this.distance) return;   // already past it; nothing to warp to
    this.distance = target;
    this.camX = target;
    this.obstacles = this.obstacles.filter((ob) => ob.x > this.camX);
    this.pickups = this.pickups.filter((p) => p.x > this.camX);
    this.projectiles = [];
    this.spawner.nextX = Math.max(this.spawner.nextX, this.camX);
    for (let i = 0; i < this.checkpoints.length; i++) {
      if (this.distance >= this.checkpoints[i]) this.checkpointHit[i] = true;
    }
  }

  // Drop an obstacle just ahead of the player for a close look at one hazard.
  devSpawn(type) {
    if (!OBSTACLES[type]) return null;
    const ob = makeObstacle(type, this.camX + PLAYER_X + 150);
    this.obstacles.push(ob);
    return ob;
  }

  // Rolled-up tally of what the level actually threw at us. The spawner builds
  // patterns procedurally, so this is not derivable from data/stages.js.
  devHitTally() {
    const counts = {};
    for (const h of this.devHits) counts[h.type] = (counts[h.type] || 0) + 1;
    return counts;
  }

  hopOutOfPit() {
    this.player.vy = 260;
    this.player.grounded = false;
    this.player.jumps = 1;
  }

  die(msg) {
    this.dead = true;
    this.deadT = 0;
    this.failMsg = msg || this.fxRng.pick(FAIL_MESSAGES);
    Audio.sfx('die');
    this.save.slot.stats.deaths++;
    const dh = this.save.slot.stats.deathsByHero;
    dh[this.relay.current] = (dh[this.relay.current] || 0) + 1;
  }

  updateDead(dt) {
    this.deadT += dt;
    this.player.vy -= this.gravityForDeath() * dt;
    this.player.y += this.player.vy * dt;
    this.updateCamera(dt);   // the death pop launches high; keep it in frame
    if (this.deadT > 0.5) {
      if (this.demo) {
        this.endRun(false); // demos die once and end — no checkpoint recovery
      } else if (this.snapshot && !this.oneHit) {
        this.restoreSnapshot(this.snapshot);
      } else if (!this.oneHit && !this.overtime) {
        // restart stage from the top with a new seed
        this.seed = (this.seed + 1) >>> 0;
        this.o.seed = this.seed;
        this.enter();
      } else {
        this.endRun(false);
      }
    }
  }

  gravityForDeath() { return 600; }

  endRun(success, reason) {
    if (this.finished) return;
    this.finished = true;
    Audio.setDetune(1);
    Audio.setRewinding(false);
    this.invActive = false;
    Audio.setInvincible(false);
    if (success && this.mission.type === 'rescue') {
      // Residents carried across the finish line are delivered.
      for (const p of this.pickups) {
        if (p.live && p.def.resident && p.following) { p.live = false; this.mission.count++; }
      }
    }
    const result = {
      success, reason,
      stage: this.stage, overtime: this.overtime, corrupted: this.corrupted,
      score: Math.floor(this.score), coins: this.coins,
      damageTaken: this.damageTaken,
      bestCombo: 0,
      challengeDone: this.challenge ? (!this.challenge.failed && (this.challenge.type === 'noDamage' ? this.damageTaken === 0 : this.challenge.count >= this.challenge.n)) : false,
      applianceGot: this.applianceGot,
      team: [...this.usedHeroes],
      // Who was actually holding the baton at the end. `team` is a Set in
      // insertion order, so team[0] is who STARTED — the food court wants the
      // opposite end of the relay.
      finalHero: this.relay.current,
      failMsg: this.failMsg,
      failDetail: this.failDetail,
      distance: Math.floor(this.distance),
      time: this.tRun,
      powerupsCollected: this.powerupsCollected,
      // How the stage was closed out. null on any exit that never reached the
      // breaker (a fail, a quit, an attract clip), so the results screen can
      // tell "clunked it" apart from "never got there".
      flip: this.flip ? this.flip.id : null,
      flipBonus: this.flip ? this.flip.points : 0,
    };
    this.o.onEnd(result);
  }

  // Feedback popups all rise from one place: a stack above the hero's column.
  // They used to spawn at whatever world object triggered them, which scattered
  // text across the screen — and in a runner everything that matters happens to
  // the hero anyway, so the hero's column is where the eye already is.
  // `solid` opts this card out of the translucent panel and onto the opaque
  // hazard one — see HAZARD_PANEL in hud.js. It is for the hazard red only:
  // every other ink in the set clears the contrast floor on the translucent
  // card, and handing solid cards out more widely would turn the run's chatter
  // into a stack of opaque plates over the art.
  //
  // `base` lifts a card off the standard row. Only the flip verdict uses it:
  // that card prints while the hero is standing AT the breaker, so at the
  // normal height it lands squarely on the pole's own signage — two plates,
  // same pixels. Everything else keeps the shared row.
  floatText(text, color, { solid = false, base = floatBaseY() } = {}) {
    // Comic asides need longer than impact words such as PEW or DEFLECTED.
    const readingTime = Math.min(3.2, 1.6 + Math.max(0, text.length - 18) * 0.035);
    // Newest lands at the base; if a recent one is still near it, slot in below
    // so simultaneous popups (pickup + power name) never overprint. The gap is
    // a full panel height now that each floatie carries its own card.
    let y = base;
    for (const f of this.floaties) if (f.y + 19 > y) y = f.y + 19;
    this.floaties.push({ text, color, t: readingTime, y, solid });
    if (this.floaties.length > 8) this.floaties.shift();
  }

  // The goal object, pulled out of draw() as its own method. That is deliberate
  // and it is the seam the per-cabinet finishes want: the nine style packs
  // already own bg/ground/post, so a `finish()` on the pack overrides this the
  // same way every other per-cabinet visual is overridden, with the pole
  // standing as the fallback for any pack that has not authored one yet.
  drawFinishMarker(ctx, fx, gy, z, t = this.tRun) {
    const flip = this.flip;
    // Throw progress, smoothstepped. Runs once on contact and sticks at 1, so
    // the lever holds its thrown pose for the rest of the held frame instead of
    // snapping back while the results card comes up.
    const thrown = flip ? Math.min(1, flip.t / FLIP_THROW) : 0;
    const ease = thrown * thrown * (3 - 2 * thrown);
    const live = !!flip && flip.band.bonus > 0;   // a clunk throws the lever but lights nothing

    // The marker itself — pole, flag and switch — lives in finishMarker.js, so
    // the gallery bake-off deciding it renders candidates through the exact code
    // that ships them. What stays here is everything that is gameplay UI rather
    // than art: the flip bracket below, and the signage at the bottom of this
    // method. Both are placed off the pole's 5px column and the switch's top,
    // which every candidate holds to.
    drawFinishMarkerArt(ctx, fx, gy, {
      t, thrown: ease, live, armed: this.finishing && !flip,
      reducedMotion: !!this.save.settings.reducedMotion,
    });

    // NOTHING marks where PERFECT starts, and that is the decision, not an
    // omission. Three versions were built and all three were wrong for the same
    // reason: a white bracket in the sky, a collar on the shaft, and finally a
    // single pale dot. Even the dot — a mark barely over a pixel, deliberately
    // missable — was one object too many, because anything placed at that height
    // ON PURPOSE is a diagram laid over the one shot in the stage that is trying
    // to be a place.
    //
    // The band is discoverable without any of it. Catch higher and the ride is
    // visibly longer, the payoff runs harder, the card says PERFECT and the
    // coins are worth five times a scrape. That is the game teaching its own
    // rule through its own payoff, which is the only teaching that survives a
    // player who is not reading the screen furniture.
    // No JUMP! plate. It was a yellow word on a grey slab bolted across the
    // middle of the marker — the one place on screen where the art is trying to
    // be an object in a world rather than a menu — and it beat every piece of
    // that object for attention on the way in. The instruction survives without
    // it: the height bracket above is the thing that actually teaches the verb,
    // it teaches it in the only unit that matters (this hero's own jump), and
    // the plunger's whole shape is already the word PUSH.
    ctx.restore();
  }

  // ------------------------------------------------------------------ draw
  // Bracketed so the prop cache can tell art built for a frame the player was
  // watching (a hitch) from art built ahead of time. try/finally because a
  // throw here must not leave every later warm-up job counted as a visible miss.
  draw(ctx, renderAlpha = 0) {
    setPropDrawPhase(true);
    try { this.drawFrame(ctx, renderAlpha); } finally { setPropDrawPhase(false); }
  }

  drawFrame(ctx, renderAlpha = 0) {
    const alpha = Math.max(0, Math.min(1, Number.isFinite(renderAlpha) ? renderAlpha : 0));
    const mix = (previous, current) => this.paused
      ? current
      : previous + (current - previous) * alpha;
    // The simulation and collision state stay on the fixed 60 Hz tick. Only
    // the presentation camera, animation clock, and scripted screen anchors
    // use the fractional remainder, so ordinary runner motion is continuous
    // without predicting a future collision or changing gameplay timing.
    const cam = mix(Number.isFinite(this.prevCamX) ? this.prevCamX : this.camX, this.camX);
    const z = mix(Number.isFinite(this.prevCamZoom) ? this.prevCamZoom : this.camZoom, this.camZoom);
    const pan = mix(Number.isFinite(this.prevCamPan) ? this.prevCamPan : this.camPan, this.camPan);
    const floorY = mix(Number.isFinite(this.prevCamFloorY) ? this.prevCamFloorY : this.camFloorY, this.camFloorY);
    const renderT = mix(Number.isFinite(this.prevTRun) ? this.prevTRun : this.tRun, this.tRun);
    const renderSettings = this.renderSettings || this.save.settings;
    const heroScreenX = this.finishing
      ? mix(Number.isFinite(this.prevFinishPlayerX) ? this.prevFinishPlayerX : this.finishPlayerX, this.finishPlayerX)
      : this.introRunning
        ? mix(Number.isFinite(this.prevIntroRunX) ? this.prevIntroRunX : this.introRunX, this.introRunX)
        : PLAYER_X;
    ctx.save();
    if (this.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    // Backgrounds stay in SCREEN space. Their layers are anchored to the
    // groundline's screen y, and the camera pins that line there at every zoom,
    // so they keep lining up exactly as authored while the world in front of
    // them magnifies. Only their scroll RATES scale (stylePacks/index.js).
    //
    // The crane is the one camera move they DO have to take, or the horizon
    // stays put while the ground it sits on slides out from under it. It goes on
    // as a bodily translate — no vertical parallax split — because at 38px the
    // depth cue would be imperceptible and any factor below 1 unwelds the hills
    // from the groundline for the sake of it. `bgPan: 0` opts out the two packs
    // whose "background" is screen furniture rather than scenery.
    //
    // A re-pinned anchor (a sky road, a tunnel) is the other camera move they
    // take, and they take a FRACTION of it — BG_FOLLOW. The scenery back there
    // is miles off: hills do not drop out of the sky because you climbed onto a
    // cloud, and shifting them by the full amount slides the horizon clean out
    // of the frame the instant a road leaves the ground. What the fraction buys
    // is the range visibly sinking as you rise, which is the whole read.
    const climb = anchorShift(z, floorY);
    const bgShift = (pan + climb * BG_FOLLOW) * (this.style.bgPan ?? 1);
    ctx.save();
    if (Math.abs(climb) > 0.5) {
      // The sky is not scenery and cannot be allowed to run out. A pack's own
      // gradient is drawn 0..H in the SHIFTED space, so once the shift is more
      // than a few pixels the top of the frame is raw canvas. This lays the
      // same gradient down first, over the same shifted range — canvas clamps a
      // gradient to its end colours outside its own stops, so the strip above
      // is flat sky and the pack then repaints the rest of it identically.
      // Drawn over the FULL range rather than just the exposed strip because a
      // seam is exactly what a two-piece sky produces.
      const g = ctx.createLinearGradient(0, bgShift, 0, bgShift + H);
      g.addColorStop(0, this.cabinet.sky ? this.cabinet.sky[0] : '#78c8f0');
      g.addColorStop(1, this.cabinet.sky ? this.cabinet.sky[1] : '#a8e0f8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.translate(0, bgShift);
    this.style.bg(ctx, renderT, cam, this.cabinet, this.totalDist);
    ctx.restore();

    // ---- world band. Everything from here to post() draws through the camera,
    // in the same coordinates it always did: x offsets from cam, absolute y.
    ctx.save();
    applyWorld(ctx, z, pan, floorY);

    // Ground line + gaps.
    this.style.ground(ctx, cam, this.cabinet, this.obstacles);
    if (!this.bossCab) drawTerrain(ctx, cam, this.cabinet, this.obstacles, GROUND_Y, W / z);
    if (this.routes.length) {
      // The earth first, and across the whole frame rather than under the
      // tunnel alone. The packs fill 38px below the groundline and nothing
      // filled below THAT, so the moment the camera dropped to follow a hero
      // underground the frame showed sky and parallax hills beneath the world.
      // Only paid for when a road actually goes down there.
      const bottomWorldY = camYFor(z, floorY) + H / z + 8;
      if (this.camFloorY > GROUND_Y + 1 || this.routes.some((r) => r.kind === 'tunnel'
        && r.x - cam < W / z + 8 && r.x + r.w - cam > -8)) {
        // The tunnel spans are OVERHANGS: the lane there has a whole second area
        // running under it, so the earth stops at the slab and what is below is
        // air with the same sky and the same hills behind it. That one omission
        // is the difference between a level with a low road and a level with a
        // cave in it.
        drawSubsoil(ctx, this.cabinet, W / z, bottomWorldY, cam,
          this.routes.filter((r) => r.kind === 'tunnel'));
      }
      drawRoutes(ctx, cam, this.cabinet, this.routes, (wx, r) => this.routeGroundY(wx, r), W / z,
        { groundAt: (wx) => this.groundYAt(wx), cloudFrom: CLOUD_FROM, cloudTo: CLOUD_TO,
          bottomY: bottomWorldY });
    }

    // Entities. On a converting style (lcd) the whole cast is held back past
    // post() with the hero, so enemies and pickups stay in colour against the
    // monochrome panel — they are the things you have to read at a glance.
    const drawActors = () => {
    const finishX = this.overtime ? Infinity : this.finishWorldX();
    // Visible world band for THIS frame, taken from the interpolated camera and
    // zoom rather than from ZOOM or VIEW_W. Both of those are live bindings the
    // tune strip can move between frames, and the frame's own z drifts
    // continuously between the resting tier and the 1.3 pull-back — so anything
    // precomputed goes stale silently. (The parallax constant in the style packs
    // captured ZOOM at module load and never saw the change from 2 to 1.6; this
    // is the same trap, one loop further in.)
    const cullLeft = cam - CULL_MARGIN;
    const cullRight = cam + W / z + CULL_MARGIN;
    // Culled here rather than inside drawWorldEntity because by the time that
    // runs the frame has already paid drawAtGround's terrain samples, a
    // transform and a closure for an entity it is about to reject.
    const onScreen = (e) => e.x + e.w >= cullLeft && e.x <= cullRight;
    for (const p of this.pickups) {
      if (!p.live || p.x >= finishX || !onScreen(p)) continue;
      this.drawAtGround(ctx, p.x, () => drawWorldEntity(ctx, p, cam, renderT, this.style, renderSettings), p.w);
    }
    // How far the world slid since the previous simulation step, which for a
    // thing standing still in world space IS its screen motion — obstacles do
    // not move, the camera does. Taken from the camera rather than from
    // this.speed so it stays truthful for free wherever the two disagree: during
    // a rewind it goes negative and the ghosts correctly trail the other way,
    // and while the world is held still it is zero and nothing smears.
    const camStep = Number.isFinite(this.prevCamX) ? this.camX - this.prevCamX : 0;
    const smearPx = Math.max(-SMEAR_MAX_PX, Math.min(SMEAR_MAX_PX, camStep * SMEAR_SPAN));
    // Below about a pixel a frame there is nothing to fuse and the ghosts would
    // only soften the art for no reason.
    const smearing = SMEAR_STEPS > 0 && SMEAR_ALPHA > 0 && Math.abs(smearPx) >= 1;
    // How many ghosts this frame's travel actually needs, rather than a fixed
    // count. Spacing is what decides whether a trail fuses into motion or reads
    // as a row of copies, and the distance to cover changes with speed, with the
    // ramp, and with the camera's zoom — a count that ignores all three is
    // banded when the world is fast and wasteful when it is slow. One ghost per
    // rendered pixel of travel is the target; SMEAR_STEPS is the ceiling on how
    // many that is allowed to become, since each one is a full redraw of the
    // entity. Zoom counts because these are world units being magnified onto the
    // screen, and it is the on-screen gap the eye is trying to bridge.
    const smearSteps = Math.max(1, Math.min(SMEAR_STEPS, Math.round(Math.abs(smearPx) * z)));
    for (const ob of this.obstacles) {
      if (!ob.live || ob.x >= finishX) continue;
      // Before the smear loop, which redraws the entity up to SMEAR_STEPS times
      // — so this is the one cull whose saving is multiplied.
      if (!onScreen(ob)) continue;
      // The boost pad is a marking on the floor, so it lies in the floor's
      // plane and sinks a little further into it than a thing that merely
      // rests there. Everything else keeps the old seating.
      const boost = ob.def.isBoost;
      const paint = () => this.drawAtGround(ctx, ob.x,
        () => drawWorldEntity(ctx, ob, cam, renderT, this.style, renderSettings),
        ob.w, ob.def.ground && ob.alt === 0 ? (boost ? 2.5 : 1.5) : 0, boost ? cam : null,
        ob.route);
      if (smearing) {
        // Furthest first, so nearer ghosts paint over further ones and the real
        // sprite lands on top of the lot. Translating is enough: screen x is
        // (world x - camera), so shifting the canvas forward along the travel is
        // exactly the same picture one part-frame ago.
        for (let k = smearSteps; k >= 1; k--) {
          // back === 1 puts the furthest ghost exactly where the obstacle was
          // drawn on the PREVIOUS frame, so the trail bridges the whole gap
          // between one frame and the next. Anything shorter leaves the jump
          // the eye is objecting to still visible with a faint smudge trailing
          // it, which is the worst of both — it costs the draws without ever
          // closing the gap they are there to close.
          const back = k / smearSteps;
          ctx.save();
          // The furthest ghost keeps 40% of the peak rather than fading to
          // nothing: a ghost at zero opacity is a draw call that paints air,
          // and it is the far end of the trail that does the fusing.
          ctx.globalAlpha *= SMEAR_ALPHA * (1 - back * 0.6);
          ctx.translate(smearPx * back, 0);
          paint();
          ctx.restore();
        }
      }
      paint();
    }
    for (const bite of this.chompBites) {
      const ob = bite.ob;
      const q = Math.max(0, Math.min(1, bite.t / bite.duration));
      const e = q * q * (3 - 2 * q);
      const fromX = ob.x - cam + ob.w / 2;
      const terrainY = this.entityGroundY(ob);
      const terrainDy = terrainY - GROUND_Y + (ob.def.ground && ob.alt === 0 ? 1.5 : 0);
      const fromY = GROUND_Y + terrainDy - ob.alt - ob.h / 2;
      const mouthWorldX = this.playerWorldX() + 9;
      const mouthX = mouthWorldX - cam;
      const mouthY = this.groundYAt(mouthWorldX) - this.player.y - 11;
      const x = fromX + (mouthX - fromX) * e;
      const y = fromY + (mouthY - fromY) * e - Math.sin(q * Math.PI) * 8;
      const scale = Math.max(0.18, 1 - e * 0.82);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(bite.spin * e);
      ctx.scale(scale, scale);
      ctx.translate(-fromX, -fromY);
      ctx.translate(0, terrainDy);
      drawWorldEntity(ctx, ob, cam, renderT, this.style, renderSettings);
      ctx.restore();
    }
    for (const pr of this.projectiles) {
      // Projectiles had no cull of any kind: a thrown axe that outran the
      // camera was drawn, and sampled the terrain to find its ground, for as
      // long as it stayed alive. They are small, so the margin covers them
      // comfortably without a per-type width.
      if (pr.x < cullLeft || pr.x > cullRight) continue;
      const x = pr.x - cam, y = Math.round(this.groundYAt(pr.x) - pr.alt - 4);
      if (pr.type === 'enemyShot') {
        ctx.fillStyle = '#101018';
        ctx.fillRect(x - 1, y - 1, 6, 6);
        ctx.fillStyle = pr.telegraph > 0 ? '#f6d33c' : '#e04848';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 1, y + 1, 2, 2);
        if (pr.telegraph > 0) { ctx.strokeStyle = '#f6d33c'; ctx.strokeRect(x - 3, y - 3, 10, 10); }
      } else if (pr.type === 'axe') {
        ctx.save();
        if (pr.hover) {
          ctx.globalAlpha = 0.42;
          // A faint ring around the spinning axe tells the player it is coming home soon.
          ctx.strokeStyle = '#ecc3a1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x + 4, y + 4, 11, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawThrownAxe(ctx, x + 4, y + 4, pr.t * 12);
        ctx.restore();
      } else if (pr.type === 'fist') {
        ctx.save();
        if (pr.hover) {
          ctx.globalAlpha = 0.42;
          ctx.strokeStyle = '#f7bacc';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x + 4, y + 2, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawRocketFist(ctx, x + 4, y + 2, pr.t, pr.returning);
        ctx.restore();
      } else {
        // Her ki blue comes off her own palette, so the shot can never drift
        // from the character wearing it. B-33P has no `ki` token and falls
        // through to the painter's default lemon.
        // `ki` is what selects the orb: only a hero whose palette carries one
        // gets it, so B-33P falls through to his lemon with nothing to opt out
        // of. `a` is the warm fleck in the core — her piping gold, not a second
        // hex invented in the renderer.
        const shotPal = (HERO_SPRITES[pr.contactHero] || {}).pal;
        drawPellet(ctx, x + 3, y + 2, {
          size: pr.size,
          fill: shotPal && shotPal.ki,
          spark: shotPal && shotPal.a,
          orb: !!(shotPal && shotPal.ki),
        });
      }
    }
    };
    if (!this.style.actorsAbovePost) drawActors();
    if (!this.finishing && this.portal) this.drawAtGround(ctx, this.portal.x, () => drawPortal(ctx, this.portal, cam, renderT, z, true, this.save.settings));
    if (!this.finishing && this.copter) this.drawAtGround(ctx, this.copter.x, () => drawCopter(ctx, this.copter, cam, renderT, true));
    if (this.escapeWall != null) {
      const x = this.escapeWall - cam;
      ctx.fillStyle = 'rgba(20,10,30,0.85)';
      ctx.fillRect(x - 100, 0, 100, H);
      ctx.fillStyle = '#8858c8';
      for (let i = 0; i < 6; i++) ctx.fillRect(x - 4 + Math.sin(renderT * 6 + i) * 3, i * 45, 4, 30);
    }

    // Finish line: a checkered pole + breaker lever, visible as you approach.
    // One position for both phases. The pole is a fixed world point and the
    // camera is what stops moving when the finish run arms, so deriving its
    // screen x from the camera covers the approach and the run alike — and the
    // tape stays put across the frame the two swap over.
    if (!this.overtime && Number.isFinite(this.totalDist)) {
      const fx = this.finishWorldX() - cam;
      if (fx - PLAYER_X < 560) {
        this.drawFinishMarker(ctx, fx, this.groundYAt(this.finishWorldX()), z, this.markerT || renderT);
      }
      // No FINISH AHEAD blink before this. It sat centre-screen in the dialog
      // band for about two seconds, warning about a pole that arrives labelled
      // moments later — the HUD progress bar warms to gold across that same
      // stretch instead.
    }

    // A soft reticle communicates which nearby obstacle the contextual power
    // will affect without adding another HUD instruction.
    if (!this.finishing && this.player.abilityCd <= 0 && this.relay.current === 'lorenzo') {
      const target = this.powerTarget();
      if (target) {
        const tx = target.x - cam + target.w / 2;
        // Against the target's OWN floor. On the lane these are the same
        // number, and underground they are a hundred pixels apart — the reticle
        // was ringing a patch of empty lane above a crate the hero was standing
        // next to in a tunnel.
        const ty = Math.round(this.entityGroundY(target) - target.alt - target.h / 2);
        const pulse = this.save.settings.reducedMotion ? 4 : 4 + Math.sin(renderT * 7);
        ctx.strokeStyle = 'rgba(246,211,60,0.65)';
        ctx.beginPath(); ctx.arc(tx, ty, Math.max(target.w, target.h) * 0.65 + pulse, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Player. During the opening run-in this is off the left edge, so the hero
    // draws his way in from beyond the frame (and stays out of sight behind an
    // ACT card, which lifts before he moves).
    // Landed on the plunger, power coming back: he celebrates. Without this the
    // held frame ends on whatever airborne pose the slide left him in — feet
    // together, arms down, a picture of someone falling — held for two and a
    // half seconds directly over the thing he just switched on. `grounded` is
    // the fix as much as `kind` is: he IS standing, on the cap, so the pose
    // needs to know that or it plays its own airborne variant regardless.
    //
    // Waits for the slide to finish rather than starting at contact, because a
    // hero celebrating on the way down is celebrating something that has not
    // happened yet.
    const celebrating = !!this.flip && !this.flipSlide;
    // The celebration runs off pose.time — which comes from this clock — and
    // tRun stops the moment the hold starts. Handed renderT the hero struck his
    // pose and then stood in it like a statue for two and a half seconds. Same
    // root cause as the frozen flag, same fix: the marker's own clock, which
    // advances on every path.
    // The pole ride is on the same clock for the same reason: the cling's sway
    // is what keeps the descent from reading as a decal sliding down a stick,
    // and tRun has already stopped by the time he catches it.
    const heroT = (celebrating || this.flipSlide) ? (this.markerT || renderT) : renderT;
    // The cooldown orb dissolves the moment the finish run ARMS — the first
    // frame we know the flag is being hit. It answers "can I attack yet?", and
    // strictly attacks still work on the final stretch, but the stage is
    // decided: the ending has started, and a HUD readout hovering beside the
    // hero's head through the dash, the slide and the celebration is a meter
    // photobombing the money shot. finishT is the dash's own clock, zeroed the
    // frame the run arms and monotonic to the results card, so the fade starts
    // exactly at "we know" and can never pop back — a death on the stretch
    // resets finishing through the checkpoint restore, which is the one path
    // where the question becomes real again and the orb should return.
    const orbAlpha = this.finishing ? Math.max(0, 1 - this.finishT / 0.6) : 1;
    const drawHero = () => drawHeroSprite(ctx, this.player, this.relay.current, heroT, cam, this.mission.type === 'fuse',
      { mirror: this.mirror, screenX: heroScreenX, zoom: z, pan, floorY, specialOrbAlpha: orbAlpha,
        // Every field the LAST live frame left behind has to be cleared, not
        // just the kind. He arrives here mid-landing — squash from hitting the
        // cap, lean from the run, and whatever duck state the slide left — and
        // the sim is frozen from this point, so none of it ever decays. The
        // result is a hero celebrating while permanently compressed. `kind`
        // alone was not enough; the pose is a snapshot, so it needs a clean one.
        pose: celebrating
          ? { kind: 'celebrate', grounded: true, vy: 0, squash: 0, lean: 0,
            ducking: false, duckAmount: 0, roll: false, float: false, stomp: false, cling: 0 }
          : undefined,
      groundY: this.routeGroundY(cam + heroScreenX, this.route),
        // How the terrain rises or falls either side of the hero, so a floor
        // effect can lie IN the floor instead of on a level line through it.
        // On a slab this comes out flat, which is correct — the island is a
        // level platform, whatever the hills below it are doing.
        groundDelta: (dx) => this.routeGroundY(cam + heroScreenX + dx, this.route)
          - this.routeGroundY(cam + heroScreenX, this.route),
        shield: this.powerups.shieldStack, settings: this.save.settings,
        invincible: this.powerups.active.unpeel ? this.powerups.active.unpeel.t : 0 });

    // A style whose post() *converts* the frame rather than tinting it (lcd)
    // takes the cast after the pass, so hero, enemies and pickups stay in
    // colour against a monochrome background — on a two-tone panel an unlit
    // hazard is indistinguishable from printed backplate art. Normal
    // frames queue the hero to the overlay layer and are unaffected either way;
    // The hero itself always queues to the full-resolution overlay; that queue
    // recreates the mirror and camera transforms and is ordered before the HUD,
    // pause dimmer and death banner. Still ahead of the blackout overlay in the
    // same sense as normal play: the player remains the light source.
    if (!this.style.actorsAbovePost) drawHero();
    drawParticles(ctx, cam);
    ctx.restore();
    // ---- end world band. post() is a treatment of the FRAME (scanlines, the
    // LCD conversion, vignettes), so it runs at screen scale like the bg did.
    this.style.post(ctx, renderT);
    if (this.style.actorsAbovePost) {
      ctx.save();
      applyWorld(ctx, z, pan, floorY);
      drawActors();
      drawHero();
      ctx.restore();
    }

    // Blackout overlay (mission).
    if (this.mission.type === 'blackout') {
      // A brown-out, not a blackout: the edges dim hard but hazards stay
      // readable — the tension is squinting, not guessing. Drawn in screen
      // space with a screen-space radius: scaled with the zoom it would light
      // nearly the whole frame and the mission would stop being a mission.
      const hsx = heroScreenX;   // follows the opening run-in, not the anchor
      const px = (hsx + 6) * z;
      const py = screenYFor(this.groundYAt(cam + hsx) - this.player.y - 8, z, pan, floorY);
      const r = 130;
      // Only the centre moves, so the ramp is built once in local space and
      // carried to the hero by the transform. Rebuilt in place it cost a
      // gradient and its colour-stop table every frame of every blackout stage,
      // immediately ahead of a full-frame fill.
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = blackoutGradient(ctx, r);
      ctx.fillRect(-px, -py, W, H);
      ctx.restore();
    }
    ctx.restore();

    // Floaties + speech + HUD render on the OVERLAY layer: full resolution,
    // above the hero, and excluded from the bloom pass — bright popup text
    // must never glow itself into an unreadable smear. (Headless runs have no
    // overlay; the fallback draws them straight onto the backbuffer.)
    const drawUi = (d) => {
      // The overlay draws outside the mirror transform, so the anchor flips by
      // hand to stay over the hero. This layer is UNSCALED, so the hero's
      // column here is their screen x — PLAYER_X is a world offset and would
      // leave every card behind them. Fade out at end of life so cards don't
      // blink off.
      //
      // heroScreenX(), not PLAYER_X: on the two scripted runs the hero LEAVES
      // the resting column, and a constant anchor strands every card where he
      // used to be. It showed up the moment the flip started printing its
      // verdict on the finish dash — PERFECT FLIP landed 150px behind the hero,
      // at the far side of the frame from the breaker it was describing. The
      // blackout overlay below already reads the same accessor for the same
      // reason.
      const heroX = heroScreenX * z;
      // While the marker is on screen the cards have to stay off it — see
      // keepLeftOf in drawFloatie. Only once it is actually drawn: for most of
      // a stage there is no pole to avoid and the chatter belongs over the
      // hero's own column.
      const markerX = (!this.overtime && Number.isFinite(this.totalDist))
        ? this.finishWorldX() - cam
        : null;
      // Not in mirror mode: that flips the whole floatie layout into a
      // right-edged one, where the pole is on the other side of the card and
      // "keep left" would be the wrong instruction rather than an unnecessary
      // one.
      const keepLeftOf = markerX != null && !this.mirror && markerX - PLAYER_X < 560
        ? (markerX - 4) * z
        : null;
      for (const f of this.floaties) {
        drawFloatie(d, f, {
          heroX,
          mirror: this.mirror,
          alpha: Math.max(0, Math.min(1, f.t / 0.25)),
          keepLeftOf,
        });
      }
      if (this.speech) drawSpeech(d, this.speech);
      drawHud(d, this);
      this.drawAbilityName(d);
      if (this.introFreeze > 0 && this.introText) {
        drawActBanner(d, this.introText, {
          t: this.introT,
          alpha: Math.min(1, this.introFreeze / ACT_BANNER_FADE), // fade out over the last beat
          still: this.save.settings.reducedMotion,
          // Drops away as soon as the skip is taken, so the hint never sits on
          // screen describing an input that has already been spent.
          skip: this.introSkippable && this.introFreeze > ACT_BANNER_FADE,
        });
      }
      // Over the HUD, because it is explaining the HUD's own discs, and over the
      // parked world for the same reason the ACT card is: nothing behind it is
      // doing anything yet. The hint only appears once the tap will actually
      // work, so the card never invites an input it is still ignoring.
      if (this.zoneCard) {
        drawTouchZoneCard(d, {
          alpha: Math.min(1, this.zoneCardT / ZONE_CARD_FADE),
          // As deep as the pause screen's, which is what this is — a held run
          // with an instruction over it. It stops short of the ACT card's 0.78
          // because the stage you are about to run is worth seeing behind it,
          // and no lighter, because the packs behind it include a white-sky
          // one that ate the whole card at 0.45.
          scrim: 0.62,
          hint: this.zoneCardT >= ZONE_CARD_ARM ? 'TAP ANYWHERE TO START' : null,
        });
      }
    };
    if (!pushOverlayDraw(drawUi)) drawUi(ctx);
    this.drawChromeButtons();

    // Rewind VHS overlay: wave distortion, tracking bands, chromatic aberration,
    // noise grain, colour shift, and OSD counter. Renders on the overlay layer
    // so it covers the world and HUD but sits under pause/fail screens.
    if (this.rewindFx.visible) {
      const drawRewind = (d) => this.rewindFx.render(d, W, H);
      if (!pushOverlayDraw(drawRewind)) this.rewindFx.render(ctx, W, H);
    }

    // Queued behind drawUi rather than painted straight onto the backbuffer:
    // the HUD draws into the overlay layer, which composites ON TOP of ctx, so
    // a dim rect written here would end up underneath the status pill and the
    // objectives it is supposed to be dimming — and underneath the menu plates.
    // Same layer, later in the queue, and the pause screen covers the run.
    if (this.paused) {
      const drawPaused = (d) => this.drawPaused(d);
      if (!pushOverlayDraw(drawPaused)) drawPaused(ctx);
    }
    // Queued onto the overlay for the same reason the pause screen above is,
    // and it was the one that had been missing it: written straight to ctx, the
    // dim and the fail message landed UNDER the whole HUD layer, so the status
    // pill, the objectives, any floatie still on screen and the touch buttons
    // all sat on top of the screen that was supposed to be covering them.
    if (this.dead) {
      const drawFail = (d) => drawFailBanner(d, this.failMsg || 'UNPLUGGED');
      if (!pushOverlayDraw(drawFail)) drawFail(ctx);
    }
    if (this.debug) this.drawDebug(ctx);
  }

  // The pause screen: a status read-out over a dimmed run, then the two ways
  // out. The whole block sits higher than it used to — the copy ended at y 192
  // when the only way out was a keypress, and the menu plates need that room.
  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'PAUSED', W / 2, 62, '#fff', 2, 'title');
    const pHero = HERO_BY_ID[this.relay.current];
    const pBtn = Input.usingTouch ? 'USE' : 'RIGHT/D';
    // Every key on this screen is painted by the same legend painter the HUD
    // strip uses, so the two agree on what a key looks like: green and bold,
    // with the thing it does beside it in a quieter ink. A wall of one colour
    // was the old failing here — three lines of identical grey that had to be
    // read word by word to find the one word you paused to look up.
    const legend = (pairs, y, opts) =>
      drawKeyLegend(ctx, pairs, W / 2 - keyLegendWidth(pairs, opts?.scale) / 2, y, opts);
    drawTextCentered(ctx, pHero.name, W / 2, 92, '#48e0c8');
    // The power line reports state rather than teaching a control, so it keeps
    // its gold — only the key in front of it joins the legend.
    const cd = this.player.abilityCd <= 0 ? 'READY' : `${this.player.abilityCd.toFixed(1)}S`;
    legend([[pBtn, `${pHero.ability.label}  ${cd}`, '#f6d33c']], 104);
    drawTextCentered(ctx, `MISSION: ${this.mission.desc}`, W / 2, 118, '#c8e0ff');
    // The challenge in full, directly under the mission and in the same order
    // the HUD stacks them. The HUD folds this sentence away ten seconds into the
    // stage and keeps only the count, which is the right trade while you are
    // running — but "what was the bonus again" is precisely a thing you pause to
    // ask, so the words live down here, unabbreviated and untruncated.
    if (this.challenge && !this.overtime && this.stage) {
      const c = this.challenge;
      const done = c.type === 'noDamage' ? this.damageTaken === 0 : c.count >= c.n;
      const tail = c.failed ? 'NOT THIS TIME' : done ? 'OK' : c.n ? `${Math.min(c.count, c.n)}/${c.n}` : '';
      drawTextCentered(ctx, `BONUS: ${c.desc}${tail ? ` ${tail}` : ''}`, W / 2, 130,
        c.failed ? '#6a6a78' : done ? '#74c947' : '#8a8a98');
    }
    // Plug standing lives here rather than in the HUD: it is a "how am I doing"
    // question, which is the question you paused to ask, and it does not belong
    // in the corner of your eye while you are dodging.
    //
    // It shares its row with the relay charge. Both are short status chips, and
    // the rows below this one belong to the controls — which stay at a fixed
    // height so that a legend you paused to look up is in the place it was last
    // time, rather than wherever the lines above it happened to end.
    const chips = [];
    if (!this.overtime && this.stage) {
      const got = goalsDone(this).filter(Boolean).length;
      chips.push([`GOALS ${got}/3`, got ? '#f6d33c' : '#8a8a98']);
    }
    if (this.player.relayCharge) chips.push(['POWER CHARGED: SPEND IT', '#f890b8']);
    if (chips.length) {
      const CHIP_GAP = 12;
      const total = chips.reduce((a, [t]) => a + textWidth(t), 0) + CHIP_GAP * (chips.length - 1);
      let cx = W / 2 - total / 2;
      for (const [t, ink] of chips) { drawText(ctx, t, cx, 142, ink); cx += textWidth(t) + CHIP_GAP; }
    }
    // The touch line names the gestures, not the buttons: JUMP and USE label
    // themselves on screen, and the swipes are the half of the scheme nothing
    // else advertises.
    legend(Input.usingTouch
      ? [['TAP', 'JUMP'], ['SWIPE DOWN', 'DUCK'], ['SWIPE RIGHT', 'POWER']]
      : [['SPACE', 'JUMP'], ['DOWN', 'DUCK'], ['RIGHT/D', 'POWER']], 158,
    { actionInk: '#c8c8d8' });
    // Only keyboard needs telling: the plates below say it for everyone else,
    // and printing a resume key under a button marked CONTINUE is the same
    // instruction twice in two languages. P is listed as both halves of what it
    // does — it is the key you pressed to get here and the key that undoes
    // that, and naming only one of them makes the other look like a different
    // key you have not found yet.
    //
    // UP/DOWN + ENTER lead, because they are the pair the highlighted plate
    // below is asking about; P and ESC follow as the shortcuts past it.
    //
    // Dimmer than the controls above: these work the menu, not the run.
    if (!Input.usingTouch) {
      legend([['UP/DOWN', 'PICK'], ['ENTER', 'SELECT'], ['P', 'PAUSE/RESUME'], ['ESC', 'QUIT']], 172,
        { keyInk: 'rgba(116,201,71,0.65)', actionInk: '#8a8a98' });
    }
    // CONTINUE leads in teal, the game's "this one" colour; EXIT sits back in
    // plain grey. Same plate, different weight — one of these ends the run.
    //
    // The one under the arrows wears the gold cursor every other list in the
    // game uses (wash + chevrons), on top of its own ink rather than instead of
    // it: gold says "this is where the arrows are", teal still says "this is the
    // one that keeps you playing". A thumb gets no cursor — a tap goes straight
    // to whichever plate it lands on, so a highlight parked on one of them would
    // be advertising a state nothing on a touchscreen can move.
    const cursor = !Input.usingTouch;
    Input.buttons.forEach((b, i) => {
      const go = b.id === 'resume';
      const sel = cursor && i === this.pauseIdx;
      drawPanel(ctx, b.x, b.y, b.w, b.h, 5, 'rgba(11,11,20,0.82)',
        { border: sel ? '#ffcf33' : go ? 'rgba(72,224,200,0.75)' : 'rgba(255,255,255,0.22)', shadow: true });
      if (sel) drawMenuRow(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4);
      drawTextCentered(ctx, sel ? `> ${b.label} <` : b.label,
        b.x + b.w / 2, textYForMid(b.y + b.h / 2), go ? '#48e0c8' : '#c8c8d8');
    });
  }

  // VHS-style rewind overlay: scanlines, tracking noise bands, and chromatic
  // fuzz. The alpha ramps with rewindT (0–1 over REWIND_FADE seconds) so the
  // effect appears and disappears smoothly rather than blinking on/off.
  drawDebug(ctx) {
    // Hitboxes are world objects, so they need the camera to land on the things
    // they describe; the readout underneath is screen chrome.
    ctx.save();
    applyWorld(ctx, this.camZoom, this.camPan);
    ctx.lineWidth = 1 / this.camZoom;
    ctx.strokeStyle = '#0f0';
    const pb = this.player.box(this.camX, this.playerGroundY());
    ctx.strokeRect(pb.x - this.camX, pb.y, pb.w, pb.h);
    ctx.strokeStyle = '#f00';
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      const b = entityBox(ob, this.entityGroundY(ob));
      ctx.strokeRect(b.x - this.camX, b.y, b.w, b.h);
    }
    ctx.restore();
    drawText(ctx, `SEED ${this.seed} SPD ${Math.round(this.speed)} X ${Math.round(this.camX)}`, 4, H - 10, '#0f0');
  }
}
