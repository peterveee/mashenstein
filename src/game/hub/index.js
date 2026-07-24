// THE LAST FUNCTIONING FOOD COURT: side-view hub + stage select,
// Repair Bench, Gary's Legally Distinct Pawn Shop, arcade corner.
import { W, H, chrome as chromeGeo, chromeCtx, paintChrome } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawText, drawTextCentered, getSprite, textWidth, wrapText, platePath, drawMenuRow, drawRoundButton, drawPanel, drawKeyLegend, TEXT_INK_TOP, TEXT_INK_H } from '../../engine/sprites.js';
import { drawToon, toonFaceSprite, toonInkTop, poseFromPlayer } from '../../sprites/toons.js';
import { drawProp } from '../../sprites/props.js';
import {
  cabinetPalette, cabinetStyle, drawCabinetShell, drawCabinetScreen, drawDeadScreen, drawScreenSweep,
  drawDoor, DOOR_PALETTES, OVERTIME_PALETTE, drawCounter, COUNTER_W, COUNTER_H, COUNTER_STAFF_X,
} from '../../sprites/arcade.js';
import {
  hubWallBays, BAY_W, drawWallBay, drawPoster, wallLitFrom, POSTER_W, POSTER_H,
  MENU_PANEL_CENTRE, MENU_PANEL_W,
} from '../../sprites/backwall.js';
import { CABINETS, CABINET_BY_ID, HUB_THEME } from '../../data/cabinets.js';
import { STAGES, stagesForCabinet, UNLOCKS } from '../../data/stages.js';
import { HEROES, HERO_BY_ID } from '../../data/heroes.js';
import { BENCH_UPGRADES, BENCH_FOOD_COURT_SURCHARGES, MODS, MOD_BY_ID, REWARDS, ARCADE_PLAY_COST } from '../../data/progression.js';
import { HUB_LINES, PAWN_LINES } from '../../data/jokes.js';
import { totalPlugs, MAX_PLUGS, cabinetUnlocked, bossAvailable, finaleUnlocked, actForSlot, formatCoins, formatPlaytime, clumsiestHero, stageUnlocked, prevStage } from '../progress.js';
import { drawPlugRow, PLUG_ROW_W } from '../plugs.js';
import { drawSpeech } from '../hud.js';
import { MINIGAMES, MINIGAME_NAMES } from '../minigames/index.js';
import { setTransitionHero } from '../../engine/states.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { makeObstacle, OBSTACLES } from '../entities.js';
import { drawWorldEntity } from '../draw.js';
import { hashStr } from '../../engine/rng.js';
import { Player } from '../player.js';

const CORRUPTED_MODIFIERS = [
  { id: 'nojump', name: 'NO JUMPING', desc: 'THE JUMP BUTTON IS ON STRIKE. CONTRACTUAL MINIMUM HOP.' },
  { id: 'maxspeed', name: 'MAXIMUM SPEED', desc: 'EVERYTHING IS FASTER. NOTHING IS CALMER.' },
  // Display name only — the id stays 'randomswap', which is what saves and
  // run.js carry. 'SWAPS' was the hub's word for trading places on the
  // concourse; what this mod actually does is hand you more tags.
  { id: 'randomswap', name: 'RANDOM TAGS', desc: 'PORTALS ARRIVE TWICE AS OFTEN. NOBODY ASKED.' },
  { id: 'narration', name: 'INACCURATE LORE', desc: 'EGGSHELL DESCRIBES A DIFFERENT GAME.' },
];

const BENCH_AFFORDABILITY_GAGS = [
  'A BOLD PURCHASE. THE COINS DISAGREE.',
  'PLEASE RETURN WITH A LESS THEORETICAL WALLET.',
  'THAT IS NOT ENOUGH MONEY. IT IS A NICE START, THOUGH.',
  'THE UPGRADE REMAINS AVAILABLE TO PEOPLE WITH COINS.',
  'YOUR COIN COUNT FAILS TO REACH THE REQUIRED THRESHOLD.',
  'I DO NOT ACCEPT PROMISES, ONLY HARD CURRENCY.',
  'THIS IS A PURCHASE COUNTER, NOT A WISH FULFILLMENT CENTER.',
  'THE DISPLAY BOARD IS CLEAR. YOUR FUNDS ARE NOT.',
  'RETURN WHEN YOUR BALANCE MATCHES YOUR AMBITION.',
  'I CANNOT EXTEND CREDIT.',
  'A VALID ATTEMPT. UNFORTUNATELY, THE TILL IS UNIMPRESSED.',
  'I AM NOT AUTHORIZED TO GIVE DISCOUNTS. CLEAR THE LINE.',
  'TIER [TIER] REQUIRES HARD CURRENCY, NOT GOOD INTENTIONS.',
  'YOU ARE SHORT FOR THIS TIER. STOP WASTING MY TIME',
];

const BENCH_SUCCESS_GAGS = [
  'TRANSACTION COMPLETE.',
  'PAYMENT RECEIVED.',
  'PORTION ALLOCATED.',
  'TRANSACTION LOGGED.',
  'PAYMENT SATISFIED. PLEASE VACATE THE COUNTER AREA.',
  'TIER UPGRADE APPLIED.',
  'PAYMENT LOGGED.',
];

const BENCH_SOLD_OUT_GAGS = [
  'CLICKING AGAIN WILL NOT RESTOCK THE CABINET.',
  'THAT TIER IS EXHAUSTED. SELECT FROM AVAILABLE INVENTORY.',
  'NO STOCK MEANS NO TRANSACTION. MOVE ALONG.',
  'THAT ITEM WAS REMOVED FROM SHELF DISPLAY. READ THE RED TEXT.',
  'TIER [TIER] IS OUT OF STOCK. DO NOT BLOCK THE LINE.',
  'COUNTER POLICY PROHIBITS ISSUING BEYOND THIS POINT.',
  'THE CABINET IS EMPTY. PRESSING THE BUTTON WILL NOT FILL IT.',
  'I CANNOT SELL WHAT DOES NOT EXIST. SELECT ANOTHER PORTION.',
  'TIER [TIER] IS OUT OF STOCK. DO NOT STAND IN THE QUEUE.',
  'COUNTER POLICY PROHIBITS ISSUING BEYOND TIER [CURRENT]. MOVE ALONG.',
  'THAT TIER HAS BEEN EXHAUSTED. SELECT AN AVAILABLE PORTION.',
];

const BENCH_SOLD_OUT_NOTICES = [
  'TIER [TIER] IS OUT OF STOCK. DO NOT ASK ABOUT THE TRUCK.',
  'MAX QUANTITY REACHED. POLICY PROHIBITS FURTHER PORTIONING.',
  'ITEM DISCONTINUED UNTIL LUNCH RUSH CONCLUDES.',
  'SUPPLY EXHAUSTED. PLEASE CHOOSE FROM AVAILABLE DISPLAY ITEMS.',
  'TIER [TIER] UNAVAILABLE. THE HEATED HOLDING CABINET IS EMPTY.',
  'THIS ITEM IS NO LONGER IN SERVICE. ADJUST YOUR EXPECTATIONS ACCORDINGLY.',
];

// How long Dolores' SOLD-OUT reaction holds — the glare and the hands-on-hips
// snap share this clock so they land and release together.
const BENCH_REACT_DUR = 1.8;
function benchGag(pool, replacements = {}) {
  const source = pool[Math.floor(Math.random() * pool.length)];
  return source.replace(/\[([A-Z]+)\]/g, (_, key) => replacements[key] ?? key);
}
export { CORRUPTED_MODIFIERS };

// Food-court camera: zoomed in from the old 1:1 view so the cast, stations
// and floor read bigger. The floor line (where every pair of feet stands)
// is pinned to the same screen y at every zoom, the same trick camera.js
// uses to pin GROUND_Y for the run camera — so zooming in crops the ceiling
// rather than sliding the ground out from under the player.
const HUB_ZOOM = 1.3;
// The concourse is intentionally long enough to browse cabinet by cabinet, but
// returning players also cross it end to end. At 90 that trip overstayed its
// welcome; 120 keeps precise station approaches while cutting traversal time by
// a quarter. Tap-to-walk and keyboard movement share this base speed.
const HUB_WALK_SPEED = 120;
// Holding a direction should make the long concourses quicker to cross without
// making short taps imprecise. The smoothstep curve starts at the room's normal
// pace and tops out after a deliberate hold; releasing immediately drops the
// next walk back to its base speed.
const WALK_ACCEL_TIME = 1.25;
const WALK_ACCEL_GAIN = 0.7;
function heldWalkSpeed(base, heldFor) {
  const p = Math.max(0, Math.min(1, heldFor / WALK_ACCEL_TIME));
  const eased = p * p * (3 - 2 * p);
  return base * (1 + WALK_ACCEL_GAIN * eased);
}
// Ground covered per full gait cycle, as a fraction of the hero's drawn height.
//
// The concourse used to cycle the legs off the wall clock — a flat 1.6 cycles a
// second no matter how fast the hero was actually travelling. Two things fell
// out of that. The feet only accounted for about 30% of the ground they crossed,
// so everyone slid; and holding a direction for the 1.7x speed-up made it worse
// rather than better (down to ~17%), because the stride never answered the
// speed. The acceleration was real and invisible: you covered more floor at
// exactly the same number of steps.
//
// Solved off the trophy room rather than picked, since that room already gets
// this right and is the one the two are compared against. It drives the same rig
// through the shared Player controller — player.js: `anim += dt * speed / 40` —
// at a 58px draw height, so 40/58. Expressed against height it holds for both
// rooms at once: same size of hero, same length of step. Speed then cancels out
// of the skate entirely, which is why the trophy room does not degrade as it
// accelerates and the concourse did.
const GAIT_DISTANCE_PER_CYCLE = 40 / 58;
// A no-stakes room hop: high enough to read clearly at HUB_ZOOM, but shorter
// than a run jump so the avatar stays comfortably below the wall displays.
const HUB_JUMP_V = 280;
const HUB_JUMP_GRAVITY = 900;
// Where the floor line sits, which — because the pin maps this world y to the
// same SCREEN y — is also how the 270px frame is split between wall and floor.
// It was 192, leaving 78px of floor for a UI band that only ever uses the
// bottom ~50 (the legend at H-48, the prompt at H-30, the status row at H-11).
// The surplus was 20px of empty checkerboard bought at the wall's expense, so
// the line moved down: same UI, more room for what is actually on the wall.
const HUB_FLOOR_PIN_Y = 212;
const HUB_VIEW_W = W / HUB_ZOOM;
const HUB_CAM_Y = HUB_FLOOR_PIN_Y - HUB_FLOOR_PIN_Y / HUB_ZOOM;

// Wall band and ceiling, both derived rather than written down. Lowering the
// floor also lowers the top crop (the pin trades ceiling for floor), and a
// hardcoded fixture y is exactly how the lights ended up drawn off-screen the
// first time — so the ceiling is defined as "the first world y that is actually
// on screen". The bright tube itself belongs on that line; anchoring the dark
// housing there still left the part players read as "the light" visibly lower.
const HUB_WALL_Y0 = 40;
const HUB_WALL_Y1 = HUB_FLOOR_PIN_Y - 2;            // top of the skirting trim
const HUB_LIGHT_Y = HUB_CAM_Y;
// Ceiling-crawling props need the housing's lower edge rather than the clipped
// tube line, so keep their attachment point separate from the light position.
const HUB_CEIL_Y = Math.ceil(HUB_CAM_Y) + 4;

// Station footprints, all standing on the floor line. The cabinet takes its
// size from whichever silhouette CABINET_STYLE names rather than hardcoding
// one, so switching styles moves the concourse with it — the four candidates
// are deliberately different shapes. The door is sized to clear the ceiling
// glow that washes down to y 140. Both stay inside stations()' 22px tap radius,
// so nothing about walking up to them changes.
const CAB_W = cabinetStyle().w, CAB_H = cabinetStyle().h;
const CAB_Y = HUB_FLOOR_PIN_Y - CAB_H;
// Leave one full cabinet pitch open before OVERTIME. This is a real bay, not
// visual padding: stations() advances the world cursor by it, so camera bounds,
// lighting, free floor, NPC homes and their far-wall clamp all grow with it.
const OVERTIME_EMPTY_BAY = 88;
const DOOR_W = 44, DOOR_H = 84, DOOR_Y = HUB_FLOOR_PIN_Y - DOOR_H;
// The serving line stands on the same floor as everything else. It is twice a
// door's width and half its height on purpose: a counter is a horizontal thing,
// and the whole point of it is that you can see over it to the person behind.
const CTR_Y = HUB_FLOOR_PIN_Y - COUNTER_H;

// One floor treatment for both halves of the hub. The Food Court draws this in
// camera space while the Trophy Room draws it across its whole world, but the
// skirting, colours and tile dimensions stay identical.
function drawFoodCourtFloor(ctx, floorY, width, worldOffsetX = 0) {
  const wallY1 = floorY - 2;
  ctx.fillStyle = '#38304a';
  ctx.fillRect(0, wallY1, width, 6);
  ctx.fillStyle = '#1c1626';
  ctx.fillRect(0, wallY1 + 6, width, H - wallY1 - 6);
  for (let row = 0; row < 3; row++) {
    for (let x = -(worldOffsetX % 32); x < width; x += 32) {
      ctx.fillStyle = (Math.floor((x + worldOffsetX) / 32) + row) % 2 === 0
        ? '#241c30'
        : '#1c1626';
      ctx.fillRect(Math.round(x), wallY1 + 10 + row * 22, 32, 22);
    }
  }
}

function trophyRoomUnlocked(slot) {
  return Object.keys(slot.campaign.ranks).length >= 1;
}

// How tall the cast stands in the concourse, in the same logical units the
// cabinets are measured in (drawToon's `h` is character height).
//
// These were 19 and 24 against a 90-tall cabinet — a hero came up to 28% of a
// machine, which is why the cast read as dolls parked in front of vending
// machines. A real arcade cabinet is about the height of the person playing it;
// even allowing for a cartoon world the right ratio is well over half. At 46
// the player's head lands just under the screen bezel, so the cast fills the
// control-deck band without covering the art on the screens.
//
// Everyone is the same height. The player used to be drawn 21% larger as a
// "which one is you" cue, which the gold marker over their head now does
// explicitly — and the size gap was actively costing something: on a swap the
// hero you left shrank 46 to 38 while the one you took grew 38 to 46, a visible
// pop with nothing behind it. They are the same eight characters standing on
// the same floor line at the same distance; there is no reason Lorenzo is
// shorter when you happen not to be driving him.
const NPC_H = 46, PLAYER_H = 46;
// How dark the cast is allowed to get in a dead bay, as a floor under the room's
// own 0..1 brightness. The wall may go to nothing; bodies may not. Raise it and
// the concourse lighting stops reading on the cast at all; drop it and the hero
// fades out crossing the unlit stretches.
const CAST_LIT_FLOOR = 0.45;
// How lit the service end is with nothing banked at all. Not zero: the repair
// counter and the pawn shop are act-1 furniture and you cannot use a room you
// cannot see. It climbs from here to 1 as the plug count approaches the finale
// (see ceilingFixtures), which is the far end doing double duty as a progress
// readout. Held low so restoring power moves the concourse from black to dingy
// rather than to bright — this is THE LAST FUNCTIONING FOOD COURT, and the
// reward for a full clear is legibility, not cheer.
const SERVICE_LIT_FLOOR = 0.24;
// The brightest the ROOM ever gets, even directly under a working tube. Without
// it a fully lit bay is the raw art with no shading over it at all, which is how
// a derelict food court ended up reading as a going concern. The ceiling still
// works — this is a dingy room you can see, not a lit one.
//
// Deliberately not applied to the fixtures themselves: a tube is the source and
// should look like one. Nor to benchLit, whose heat lamps are the one thing in
// the building nobody ever switched off.
const ROOM_LIT_PEAK = 0.8;
// How far a hero ranges from their spot, how much clearance a station needs
// before anyone will stop beside it, and how close to the exit anyone may get.
// ROAM is deliberately wide — a hero should cross in front of two or three
// machines on a stroll; it is only where they STOP that matters.
const NPC_ROAM = 155, NPC_MIN_X = 70;
// Margin a loitering hero keeps beyond a station's OWN footprint. It used to be
// a flat 30 from the station's centre, which was fine when every station was a
// 44-wide door — and quietly wrong the moment two of them became 118-wide
// counters, since 30 from the centre of a counter is still inside it. Clearance
// is measured from each station's real width instead (see loiterClear), with
// this as the air on top.
//
// A hero's own half-width, so somebody at rest stands BESIDE the furniture
// instead of half inside it. At 6 they cleared a station's centre by 28, which
// for a 44-wide door puts a 32-wide hero ten units inside the doorway — they
// looked like they were standing in the trophy shelf.
//
// This does squeeze the banks: cabinets are 88 apart and 48 wide, so at 40 of
// clearance each they leave an 8-unit window at the midpoint of each gap. That
// window is exactly where a hero does not touch either machine, which is the
// right place for the only standing spot to be — see freeFloor's sliver floor,
// which is held below it on purpose.
const NPC_LOITER_PAD = 16;
// The walk-up ranges that decide who you are addressing. ATTEND is only used by
// the pinned counter staff, who hold position rather than tidying while a
// customer is at the counter — for them it cannot pile anybody up, because they
// were never going anywhere. The wandering cast is held by FOCUS instead of by a
// radius; see updateNpcs for why that distinction is the whole ballgame.
//
// TALK is sized off NPC_STAND_OFF rather than chosen: walking up to somebody has
// to leave them addressable, so the radius follows the gap and not the other way
// round. It was 18 — under the width of two toons — which is why tapping a hero
// parked the two sprites inside each other.
const STATION_R = 26, NPC_ATTEND_R = 30;
// How far to stop SHORT of somebody you tapped, and the number the talk radius
// is derived from.
//
// Measured, not guessed. These toons are far wider than their walk-up radius
// suggested: the cast runs 28-33 units across (Grumpos is the widest at 33, half
// of 18; the player is 28, half of 14), so two of them TOUCH at 32 apart. The
// old 14 therefore overlapped them by eighteen units — most of a body — and
// tapping a hero to go and stand with them buried you in their chest.
//
// 34 puts them just clear of touching against the WIDEST hero — Grumpos, who is
// the one that sets this number — and a little roomier against everybody else.
// Tuned by eye from there: 38 was correct and read as standoffish, with visible
// daylight between two people supposedly having a conversation. This sits them
// shoulder to shoulder with their contact shadows just overlapping.
const NPC_STAND_OFF = 34;
// The walk stops within 3 of its target and the crowd keeps shuffling, so the
// radius needs headroom over the stand-off or arriving would sometimes land just
// outside talk range and the chips you walked over for would not appear.
const NPC_TALK_R = NPC_STAND_OFF + 8;
// How far counter staff drift from their post while working. A small fraction of
// their own deck — far enough to be seen moving, never far enough to leave the
// unit they are drawn inside.
const STAFF_ROAM = 13;

// THE DUST DEVIL's cameo. It is a stick vacuum, so it has to be touching
// something: brush head down on the floor line, or brush head up on the ceiling
// with the whole machine hanging off it. What it must never be is halfway up
// the wall, which is where it spent the last few builds — its y was hardcoded
// to the OLD floor line (192), so when the floor dropped to 212 it was left
// hovering with nothing under the brush, reading as a bug rather than a
// haunting.
//
// Size comes off the cast rather than the eye: this industrial upright reaches
// above the waist of whoever would be pushing it, so ~70% of NPC_H. At 55% it
// still read as a domestic toy once it shared a floor with the cast; Deep Clean
// mode gets the full boss-sized escalation in boss.js.
const DD_H = Math.round(NPC_H * 0.7), DD_W = Math.round(DD_H * 0.9);

// Counter staff read as adults among mascots — a little over the player, well
// under a cabinet. Dolores is the taller; Gary has never stood fully upright in
// his life, dead or otherwise.
//
// These were briefly 62 and 54, which was a staging hack that backfired. The
// problem it solved was real (a cast-sized person behind a serving deck is a
// face on a slab) but the fix was wrong for a flat side view: with no
// perspective in the scene, drawing someone BIGGER does not read as "nearer the
// camera", it reads as "enormous" — and these two stand BEHIND their counters,
// where if anything the cue should run the other way. Dolores ended up towering
// over a player standing three feet in front of her.
//
// The occlusion is fixed where it belongs instead: the staff stand at the open
// end of the unit past the glass (COUNTER_STAFF_X), and CTR.deck is set low
// enough to clear a normal torso. Held under CTR.lampLo either way, or their own
// heat lamps crop their heads off.
const DOLORES_H = 48, GARY_H = 44;

// What it is doing on a given visit, seeded on the visit index so a pass is
// rolled once and never re-rolls mid-glide.
function dustDevilPass(visit, act) {
  const h = hashStr(`dustdevil-${visit}`);
  return {
    // Act 1 keeps its feet down (the maintenance log has it mopping the floor);
    // from act 2 on it has earned the ceiling, but only now and then — the
    // ceiling gag lands because it is the exception.
    onCeiling: act > 1 && (h >>> 3) % 3 === 0,
    dir: (h & 1) ? 1 : -1,           // which way it crosses
    depth: (h >>> 5) % 11,           // px in front of the floor line; the floor runs well past it
  };
}

// Who you are currently carrying, from a flow object. A plain function rather
// than a method on Flow: the hub is constructed with a stub flow in several
// tests, and requiring a method there would make "which hero" a thing callers
// have to implement rather than a thing derived from two fields.
// Closest of `list` to `x`, within `r`, or null. Every one of these lookups was
// an Array.find, which returns the first match in ARRAY order — and npcActors is
// built in HEROES order, so with two heroes inside the same radius (which is
// most of the time; the crowd clusters) you addressed whichever of them the
// roster happened to list first rather than the one you were standing next to.
// That is a large part of why walking along the concourse felt like the chips
// picked people at random.
function nearestTo(list, x, r) {
  let best = null, bd = r;
  for (const it of list) {
    const d = Math.abs(it.x - x);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

// The serving counter is wider and taller than its station's approach radius.
// Its menu board is the sign behind Dolores, so both rendered surfaces belong
// to the same interaction. Dolores herself remains a character target.
function benchVisualHit(station, worldX, worldY, dolores) {
  const onCounter = Math.abs(worldX - station.x) <= COUNTER_W / 2
    && worldY >= CTR_Y && worldY <= HUB_FLOOR_PIN_Y;
  const boardLeft = station.x - BAY_W * (MENU_PANEL_CENTRE + MENU_PANEL_W / 2);
  const boardRight = station.x - BAY_W * (MENU_PANEL_CENTRE - MENU_PANEL_W / 2);
  const onSign = worldX >= boardLeft && worldX <= boardRight
    && worldY >= HUB_WALL_Y0 && worldY <= HUB_WALL_Y0 + (HUB_WALL_Y1 - HUB_WALL_Y0) * 0.57;
  const onDolores = dolores && Math.abs(worldX - dolores.x) <= NPC_H * 0.42
    && worldY >= HUB_FLOOR_PIN_Y - (dolores.staffH || DOLORES_H) && worldY <= HUB_FLOOR_PIN_Y;
  return (onCounter || onSign) && !onDolores;
}

export function heroIdFor(flow) {
  return (flow && flow.hubAvatar) || (flow && flow.lastTeam && flow.lastTeam[0]) || 'lorenzo';
}

// What is actually playing on a cabinet's screen: a slice of that cabinet's own
// level, panning past.
//
// The screens used to repeat the genre motif that is already on the marquee,
// which is what gave them away as decals — a machine showing its own logo is a
// machine that is switched on but not running anything. Now the marquee keeps
// the logo (a sign's job) and the screen shows the game (a screen's job).
//
// Each cabinet's scene is rendered ONCE through the real style pack — the same
// pack.bg()/pack.ground() pair the run uses, so this can never drift from what
// the stage actually looks like — into a half-size offscreen canvas, and the
// screen blits a moving window across it. Rendering the pack live per frame per
// cabinet would mean four full parallax scenes a frame for a 33x22 result.
const SCENES = new Map();
function cabinetScene(cab) {
  let c = SCENES.get(cab.id);
  if (c !== undefined) return c;
  c = null;
  try {
    c = document.createElement('canvas');
    c.width = W / 2; c.height = H / 2;
    const x = c.getContext('2d');
    x.scale(0.5, 0.5);
    const pack = getStylePack(cab.style, {});
    // The cabinet's own hazards, pulled from its own pattern bank, so each
    // screen shows the game that cabinet actually plays. Sky and ground alone
    // came out as two flat bands — an attract screen needs something in it.
    const obstacles = [];
    const seen = new Set();
    for (const pat of cab.patterns || []) {
      for (const cell of pat.cells) {
        if (seen.has(cell.t) || !OBSTACLES[cell.t]) continue;
        seen.add(cell.t);
        obstacles.push(makeObstacle(cell.t, 90 + obstacles.length * 120));
        if (obstacles.length >= 4) break;
      }
      if (obstacles.length >= 4) break;
    }
    if (pack.bg) pack.bg(x, 0, 0, cab, 1000);
    if (pack.ground) pack.ground(x, 0, cab, obstacles);
    for (const o of obstacles) drawWorldEntity(x, o, 0, 0, pack, {});
  } catch {
    c = null; // headless, or a pack that needs run state: fall back to the motif
  }
  SCENES.set(cab.id, c);
  return c;
}

// The window panned across that scene. Crops to the band around the ground line
// — the sky above it is mostly empty and at 22 units tall an empty screen reads
// as a broken one — and wraps, so every cabinet loops its own attract forever.
function cabinetScreenArt(cab, t, seed = 0) {
  const src = cabinetScene(cab);
  if (!src) return null;
  // A tight window: at 0.42 of the scene the hazards came out ~2px across on a
  // 34px screen — texture, but not readable as anything. 0.2 puts a cactus at a
  // legible 5px, which is what makes this read as a game rather than as a
  // gradient. Height follows the glass aspect so nothing is squashed.
  const winW = src.width * 0.2;
  const span = src.width - winW;
  // Ping-pong rather than jump-cut: a hard wrap on a 33px screen reads as a
  // dropped frame, where a slow reverse just looks like the demo turning round.
  // Per-cabinet rate and offset, for the same reason the sweep is staggered:
  // nine attract loops panning in unison read as one scrolling backdrop behind
  // nine windows rather than as nine machines each running their own demo.
  const cycle = (t * (0.062 + (seed % 5) * 0.007) + (seed % 97) * 0.17) % 2;
  const pan = (cycle < 1 ? cycle : 2 - cycle) * span;
  // Framed on the ground line (GROUND_Y is 232 of 270, so 0.86 of the source)
  // with headroom above it for the flyers.
  return (c, cw, ch) => c.drawImage(src, pan, src.height * 0.62, winW, winW * (ch / cw), 0, 0, cw, ch);
}

// cabinetPalette() mixes a dozen colours per call and the answer only depends
// on the cabinet and whether it is unlocked, so each one is built once.
const CAB_PALETTES = new Map();
// Where a poster hangs and how it was hung. Both derived from the cabinet's own
// x so they are stable frame to frame, and both shared between the wall loop in
// draw(), the tap test in update(), and the blown-up read — a tilt that changed
// between the wall and the zoom would read as a different poster, and a hit box
// that disagreed with either would be the kind of miss nobody can explain.
const POSTER_TOP_Y = CAB_Y - POSTER_H - 12;
// The post-game machine is deliberately blank, but the poster above it is not:
// give drawPoster an OVERTIME motif without changing the cabinet palette (and
// therefore without putting art on the machine's dead screen).
const OVERTIME_POSTER_PALETTE = { ...OVERTIME_PALETTE, motif: 'overtime', button: '#e04848' };
function posterLook(x) {
  const k = Math.round(x / 64);
  return { tilt: (k % 2 ? 1 : -1) * (0.03 + (k % 3) * 0.012), torn: k % 3 === 1 };
}

function palFor(cab, unlocked) {
  const key = `${cab.id}|${unlocked ? 1 : 0}`;
  let p = CAB_PALETTES.get(key);
  if (!p) { p = cabinetPalette(cab, unlocked); CAB_PALETTES.set(key, p); }
  return p;
}

function posterPalFor(station) {
  return station.type === 'overtime'
    ? OVERTIME_POSTER_PALETTE
    : palFor(station.cab, station.unlocked);
}

// The food court is falling apart, so the ceiling lights that ARE working
// sputter rather than glow steady. Each light runs on its own clock (an
// index-based offset and period keep them from all guttering in lockstep —
// see draw.js's fire licks for the same idiom) and dips to a brownout, not a
// hard blackout, matching flickerAlpha's title-sign short-out in menus.js so
// this doesn't read as a dropped frame. reducedFlashing pins every light lit.
function lightFlicker(t, i, reduced) {
  if (reduced) return 1;
  const period = 4.5 + (i % 4) * 0.9;
  const phase = (t + i * 1.87) % period;
  if (phase < 0.18) return phase < 0.09 ? 0.2 : 0.55;
  return 1;
}

// One ceiling fixture and the light coming out of it. `lit` is 0 for a dead
// tube, else the flicker level.
//
// This was a flat yellow bar with a straight-sided rectangle of gradient hanging
// under it — light as a column, which is the one thing light never looks like.
// What actually reads as a working fixture in a dark room is four separate
// things, and the beam is only one of them:
//
//   1. a housing, so the tube is mounted in something
//   2. a hot core inside the tube, brighter than the tube's own colour
//   3. a halo around the fixture, where the air right by it is lit
//   4. a beam that SPREADS as it falls, and leans away from the middle of the
//      view — a room lit from the ceiling only shows you parallel beams if you
//      are standing directly under them, and every other fixture is seen at an
//      angle. The lean is what makes eight fixtures read as a room rather than
//      as eight copies of one sprite.
const LIGHT_W = 26;
function drawCeilingLight(ctx, x, y, lit, viewX = x, viewWidth = HUB_VIEW_W) {
  // Housing first: a dark bracket the tube hangs in, drawn whether or not the
  // tube works. A dead light is still a fixture.
  ctx.fillStyle = '#232030';
  ctx.fillRect(x - 3, y - 4, LIGHT_W + 6, 4);
  // The tube: dead colour laid down first, then the lit colour over it at the
  // fixture's own level, so a half-powered tube LOOKS half-powered. This used to
  // be a straight either/or, which was true enough while `lit` only ever came
  // from the flicker (0, or a blink value, or 1). Now that the service end sits
  // at a steady fraction all day, an either/or tube glowed at full strength over
  // a beam you could barely see.
  ctx.fillStyle = '#30303f';
  ctx.fillRect(x, y, LIGHT_W, 4);
  if (lit <= 0) return;

  ctx.save();
  ctx.globalAlpha = lit;
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(x, y, LIGHT_W, 4);
  // The hot core — a lit tube is not one flat colour end to end.
  ctx.fillStyle = '#fff6c8';
  ctx.fillRect(x + 3, y + 1, LIGHT_W - 6, 2);

  const cx = x + LIGHT_W / 2;
  // Halo: the air immediately around the fixture. Wider than the light itself
  // by some way, with a mid stop, so it thins out instead of ending.
  const halo = ctx.createRadialGradient(cx, y + 2, 1, cx, y + 2, 46);
  halo.addColorStop(0, 'rgba(246,211,60,0.2)');
  halo.addColorStop(0.45, 'rgba(246,211,60,0.07)');
  halo.addColorStop(1, 'rgba(246,211,60,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 46, y - 44, 92, 92);

  // The beam. Splayed, and sheared toward whichever side of the view this
  // fixture sits on, so the further off-centre it is the harder it rakes.
  //
  // Three nested splays rather than one wedge. A single polygon fades with
  // DISTANCE but has a hard lateral edge, which is what made these read as
  // stage spotlights rather than as strip fluorescents behind a yellowed
  // diffuser — the thing the ceiling actually is. The three shares sum to the
  // old strength straight down the core and taper off sideways, so the beam
  // now has an edge you cannot point at.
  // x may be a world coordinate (the unzoomed Trophy Room draws its fixtures
  // that way), but perspective belongs to where the fixture is on screen.
  const viewCx = viewX + LIGHT_W / 2;
  const lean = ((viewCx - viewWidth / 2) / (viewWidth / 2)) * 26;
  const top = y + 4, bottom = 168;
  for (const [spread, share] of [[48, 0.34], [31, 0.33], [17, 0.33]]) {
    const beam = ctx.createLinearGradient(0, top, 0, bottom);
    beam.addColorStop(0, `rgba(246,211,60,${(0.13 * share).toFixed(3)})`);
    beam.addColorStop(0.55, `rgba(246,211,60,${(0.05 * share).toFixed(3)})`);
    beam.addColorStop(1, 'rgba(246,211,60,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x + 1, top);
    ctx.lineTo(x + LIGHT_W - 1, top);
    ctx.lineTo(x + LIGHT_W + spread + lean, bottom);
    ctx.lineTo(x - spread + lean, bottom);
    ctx.closePath();
    ctx.fill();
  }
  // A tighter, brighter core inside the beam — light has a bright middle and
  // soft edges, and a single flat wedge has neither.
  const core = ctx.createLinearGradient(0, top, 0, bottom - 40);
  core.addColorStop(0, 'rgba(255,244,200,0.1)');
  core.addColorStop(0.5, 'rgba(255,244,200,0.03)');
  core.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(x + 6, top);
  ctx.lineTo(x + LIGHT_W - 6, top);
  ctx.lineTo(x + LIGHT_W - 1 + lean * 0.6, bottom - 40);
  ctx.lineTo(x + 1 + lean * 0.6, bottom - 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Walking up to a hero offers two things, and neither of them is guessable from
// the world: you can hear what they have to say, or you can BE them. Their name
// and those two actions share the bottom contextual row, so identity and verbs
// read as one sentence and no interface floats over the cast.
//
// The alternative was mapping them to different inputs (DOWN talks, ENTER
// swaps), which reads fine in a manual and not at all on a screen — and on touch
// it would have meant "dwell to talk, tap to swap", two gestures on the same
// character telling you nothing about themselves. Two labelled chips say what
// both actions are, and are hit the same way on a phone as on a keyboard.
const NPC_MENU = [{ id: 'talk', label: 'TALK' }, { id: 'swap', label: 'SWAP' }];
// Not everyone in the concourse is a body you can wear — Gary runs the shop and
// is not in HEROES. Offering SWAP on him would be a button that silently does
// the wrong thing, so he gets a one-item chooser instead.
function npcMenuFor(npc) { return npc && npc.swappable === false ? NPC_MENU.slice(0, 1) : NPC_MENU; }
const NPC_CHIP_W = 34, NPC_CHIP_H = 16, NPC_CHIP_GAP = 3;
const NPC_NAME_GAP = 8;
// How far short of the back wall a hero has to stop.
//
// Keep the crowd clear of the room's hard end. The interaction row no longer
// follows them through world space, but this breathing room stops the last hero
// from looking pinned against the wall.
const NPC_CHIP_MARGIN = NPC_CHIP_W + NPC_CHIP_GAP + 14;

// One screen-space layout for name, drawing and hit-testing. Long names expand
// leftward while the actions remain immediately beside them; centring the full
// group under the focused NPC keeps the prompt attached to its character.
function npcPromptLayout(npc, opts = npcMenuFor(npc), anchorX = W / 2) {
  const name = npc.name || HERO_BY_ID[npc.id].short;
  const nameW = textWidth(name, 1, 'ui');
  const chipsW = opts.length * NPC_CHIP_W + (opts.length - 1) * NPC_CHIP_GAP;
  const totalW = nameW + NPC_NAME_GAP + chipsW;
  const x = Math.max(4, Math.min(W - totalW - 4, anchorX - totalW / 2));
  const y = H - 39;
  return {
    name,
    nameX: x,
    nameY: y + 4,
    rects: opts.map((_, i) => ({
      x: x + nameW + NPC_NAME_GAP + i * (NPC_CHIP_W + NPC_CHIP_GAP),
      y,
      w: NPC_CHIP_W,
      h: NPC_CHIP_H,
    })),
  };
}

function drawNpcPrompt(ctx, npc, idx, opts, anchorX) {
  const layout = npcPromptLayout(npc, opts, anchorX);
  drawText(ctx, layout.name, layout.nameX, layout.nameY, '#48e0c8');
  for (let i = 0; i < opts.length; i++) {
    const r = layout.rects[i];
    const sel = i === idx;
    ctx.save();
    ctx.beginPath();
    platePath(ctx, r.x, r.y, r.w, r.h, 4);
    ctx.fillStyle = sel ? '#f6d33c' : 'rgba(18,14,28,0.86)';
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = sel ? 'rgba(26,16,40,0.5)' : 'rgba(246,211,60,0.45)';
    ctx.stroke();
    ctx.restore();
    drawTextCentered(ctx, opts[i].label, r.x + r.w / 2, r.y + 4.5,
      sel ? '#1a1028' : '#f6d33c', 0.85, 'bold');
  }
}

// A cabinet's remaining business, as nine bulbs set into its marquee.
//
// Three placements in and this is the one that holds. On the lower body they sat
// at y169..187, dead inside the y154..192 band where heroes stand, so the crowd
// hid them. Mounted on a plate above the machine they cleared the crowd but read
// as UI hovering over the scene rather than anything the cabinet owned. Here
// they are recessed into the hood just under the marquee glass — the one strip
// that is never occluded, and the one place on an arcade cabinet where a row of
// bulbs is what you would expect to find anyway. The service-door signs already
// carry bulb rows on the same idiom.
//
// Evenly spaced, full stop. An earlier pass grouped them 3-3-3 to mark which
// stage each triplet belonged to; at a 3px bulb that grouping does not read as
// grouping, it reads as a row someone spaced badly. The stage breakdown lives on
// the stage select, where there is room to say it properly.
//
// Colours are plugs.js's own BANKED/EMPTY, so a bulb here and a pip in the run
// HUD mean the same thing.
// Small. An earlier pass sized these to the largest that would still fit — r 1.9
// at pitch 5.0 — which made a progress readout the loudest thing on the machine,
// competing with the marquee art directly above it. At r 1.1 the same pitch
// leaves a 2.8 gap, so the row reads as inset bulbs rather than a bar of blobs,
// and the eye goes to the cabinet first and the tally second, which is the right
// order for something you only consult when you are deciding where to go.
// A small cluster, not a strip. Sizing these to the hood's width was the mistake
// behind every earlier pass: nine bulbs spread across 48 units need a backing
// dark enough to hold them, and that backing then reads as a black bar ruled
// across the machine with dots printed on it. Pulled into a ~20-unit huddle in
// the middle they read as one object — a little bank of indicator lamps — and
// the recess behind them is small enough to be a detail rather than a stripe.
const PLUG_LIGHT_R = 0.85, PLUG_LIGHT_PITCH = 2.5;
function drawPlugLights(ctx, slot, cabId, cx, cy, w) {
  const stages = stagesForCabinet(cabId);
  const lit = [];
  for (const st of stages) {
    const banked = slot.campaign.plugs[st.id] || [];
    for (let i = 0; i < 3; i++) lit.push(!!banked[i]);
  }
  const pitch = PLUG_LIGHT_PITCH;
  const span = pitch * (lit.length - 1);
  const x0 = cx - span / 2;
  // A shallow recess hugging the cluster. Translucent rather than a solid dark
  // fill, so it darkens whatever chassis colour is under it instead of stamping
  // the same near-black onto a white cabinet and a near-black one alike.
  ctx.save();
  ctx.beginPath();
  platePath(ctx, x0 - PLUG_LIGHT_R - 1.1, cy - PLUG_LIGHT_R - 0.8,
    span + PLUG_LIGHT_R * 2 + 2.2, PLUG_LIGHT_R * 2 + 1.6, PLUG_LIGHT_R + 0.8);
  ctx.fillStyle = 'rgba(6,4,14,0.3)';
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < lit.length; i++) {
    const px = x0 + i * pitch;
    // No bloom. Nine haloed bulbs turned the strip into a light source that
    // outshone the marquee art right above it; at this size the gold fill is
    // already unmistakably "on" against the unlit sockets beside it.
    ctx.beginPath();
    ctx.arc(px, cy, PLUG_LIGHT_R, 0, Math.PI * 2);
    ctx.fillStyle = lit[i] ? '#f6d33c' : 'rgba(10,8,18,0.55)';
    ctx.fill();
    // Unlit sockets carry a pale rim rather than leaning on their fill: at this
    // size a dark disc inside a dark recess is invisible, which turned "nine
    // sockets, three of them lit" into "three gold dots on a bar".
    ctx.lineWidth = 0.28;
    ctx.strokeStyle = lit[i] ? 'rgba(255,248,208,0.45)' : 'rgba(150,155,180,0.5)';
    ctx.stroke();
  }
}

// A boss waiting behind a cabinet is the one thing here that is genuinely NEW
// rather than merely unfinished, so it gets a colour nothing else uses and a
// pulse. Only neon/rhythm/surge ever have one.
function drawBossPip(ctx, cx, cy, r, t) {
  const pulse = 0.72 + 0.28 * Math.sin(t * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = 'rgba(224,72,72,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e04848';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd0d0';
  ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// The cleared badge: a gold star on the corner of the marquee. Small, and on
// the machine rather than floating above it, because it marks a finished
// cabinet without competing with the marquee art it sits beside.
function drawClearedStar(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.44 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.lineWidth = Math.max(0.5, r * 0.2);
  ctx.strokeStyle = 'rgba(26,16,40,0.45)';
  ctx.stroke();
  ctx.restore();
}

// Full for `hold` seconds, then ramps to nothing over `fade`. Used for the bits
// of hub chrome that have something to say exactly once.
function fadeOut(t, hold, fade) {
  if (t <= hold) return 1;
  return Math.max(0, 1 - (t - hold) / fade);
}

// The "you are here" chevron. A downward wedge rather than an arrow or a ring:
// a wedge points at exactly one pair of feet with no ambiguity about which
// character it belongs to, and it stays legible at 9px across with the ceiling
// lights guttering behind it.
//
// Rounded by stroking the path with round joins before filling it, rather than
// by drawing arcs — three arcTo corners on a 9px triangle collapse into mush,
// where a fat round-joined stroke gives clean radii at any size. The dark pass
// goes down first and wider, so the outline sits outside the gold instead of
// eating into it.
const MARKER_R = 3.2;
// Center of the wedge to the top of the head. The wedge's own tip hangs about
// r * 1.02 below that center once the outline is counted, so this leaves ~7
// units of air — close enough to point, far enough not to graze a hat.
const MARKER_GAP = 10;
function drawPlayerMarker(ctx, cx, cy, r) {
  const path = (c) => {
    c.beginPath();
    c.moveTo(cx - r * 0.78, cy - r * 0.5);
    c.lineTo(cx + r * 0.78, cy - r * 0.5);
    c.lineTo(cx, cy + r * 0.62);
    c.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path(ctx);
  ctx.strokeStyle = 'rgba(26,16,40,0.5)';
  ctx.lineWidth = r * 0.8;
  ctx.stroke();
  path(ctx);
  ctx.strokeStyle = '#f6d33c';
  ctx.lineWidth = r * 0.5;
  ctx.stroke();
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.restore();
}

export class HubState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; }

  stations() {
    const slot = this.save.slot;
    // Boundary doors are positioned by their outer frames, not by a nearly
    // matching player clamp: the EXIT frame is exactly flush with the left
    // edge and the Trophy Room frame is exactly flush with the right.
    const st = [{ type: 'exit', x: DOOR_W / 2, label: 'EXIT' }];
    // Enough bare wall that the exit reads as its own fixture rather than part
    // of the arcade bank — but not the corridor 130 opened up.
    let x = 96;
    for (const cab of CABINETS) {
      const unlocked = cabinetUnlocked(slot, cab.id);
      st.push({ type: 'cabinet', cab, x, unlocked, label: cab.name });
      // 88 apart rather than the original 64. The viewport is 369 units wide,
      // so this frames about four machines at a time instead of six crowding
      // each other — room to look at each one, without the stretch of bare wall
      // between them that 110 opened up.
      x += 88;
    }
    // A plaza between the machines and the service doors. The two banks used to
    // butt together with 40 units between them, which left the crowd nowhere to
    // stand but among the cabinets; this gives them somewhere to spill into.
    x += 96;
    // The two counters. Wider berths than the doors they replaced: a counter is
    // 118 across where a door was 44, and butting them at the old 88/98 pitch
    // ran the serving line straight into the pawn till with no floor between
    // them to queue on.
    // Hers, and a counter rather than a bench. "REPAIR BENCH" dated from when
    // this was a shutter with a spanner painted on it; there has not been a
    // bench here since it became the serving line, and naming it after the woman
    // standing at it puts it in the same shape as Gary's unit next door — the
    // two staffed stations in the room both belong to somebody.
    st.push({ type: 'bench', x, label: "DOLORES' REPAIR COUNTER" }); x += 180;
    st.push({ type: 'shop', x, label: "GARY'S LEGALLY DISTINCT PAWN SHOP" }); x += 140;
    st.push({ type: 'arcade', x, label: 'ARCADE CORNER' }); x += 88;
    if (totalPlugs(slot) >= 25) { st.push({ type: 'backroom', x, label: 'THE BACK ROOM (YOU DID NOT SEE THIS DOOR)' }); x += 88; }
    if (finaleUnlocked(slot) && !slot.campaign.storyFlags.sawEnding) {
      st.push({ type: 'socket', x, label: 'THE SOCKET' }); x += 88;
    }
    // The parenthetical carries what the finale used to say in one opaque line:
    // nothing in OVERTIME counts. It belongs here rather than at the end of the
    // campaign — this is the door the player walks through every time, and the
    // back room next to it already set the shape for a label that winks.
    if (slot.campaign.storyFlags.sawEnding) {
      // A cabinet-sized patch of bare floor between the trophy/back-room end
      // and OVERTIME reserves a natural home for one more machine later. Keep
      // it in the station cursor rather than adding it to the tail: the whole
      // concourse (including NPC distribution) then knows the space is usable.
      x += OVERTIME_EMPTY_BAY;
      st.push({ type: 'overtime', x, label: 'OVERTIME CABINET (HR HAS APPROVED NONE OF THIS)' }); x += 88;
    }
    // The Trophy Room is the right-hand boundary, mirroring EXIT.
    // There is no decorative tail beyond it: the last walkable player position
    // is the centre of this door, so crossing it is unambiguously leaving the
    // concourse rather than interacting with another free-standing fixture.
    st.push({ type: 'shelf', x, label: 'TROPHY ROOM', unlocked: trophyRoomUnlocked(slot) });
    this.width = Math.max(W, x + DOOR_W / 2);
    return st;
  }

  // The ceiling, in WORLD x: one strip fixture per gap between cabinets, at the
  // cabinet pitch, running the length of the concourse. `k` is how lit each one
  // is, 0..1.
  //
  // Both halves of that used to be wrong. There were exactly eight fixtures and
  // they lived in PARALLAXED SCREEN SPACE (`i * 130 - cam * 0.9`), which meant
  // (a) they covered 910 units of a 1658-unit room and everything past camera
  // ~1010 was unlit black — the entire service end, at every act, including a
  // fully restored arcade — and (b) nothing was anchored to anything, so whether
  // a given machine looked powered depended on where the camera happened to be.
  // Lighting could not say "this cabinet has power", which is the one thing the
  // fiction wants it to say.
  //
  // Placement is the GAP between two cabinets, not the cabinet itself. A poster
  // hangs at y 56..110 over every machine and a fixture housing is y 51..59, so
  // one hung directly over a cabinet clips the top of its own poster; at the
  // midpoint a 26-wide fixture sits inside the 48-wide gap between two posters
  // and clears both. Phase comes off the first cabinet so the grid stays lined
  // up with the bank however the concourse is respaced.
  ceilingFixtures() {
    const slot = this.save.slot;
    const st = this.stations();
    const cabs = st.filter((s) => s.type === 'cabinet');
    if (!cabs.length) return [];
    const pitch = cabs.length > 1 ? cabs[1].x - cabs[0].x : 88;
    const phase = cabs[0].x + pitch / 2;
    const lastCab = cabs[cabs.length - 1].x;
    // Past the machines the room is not powered by any one cabinet, so it runs
    // off the whole job: dim enough at the start to read as derelict, bright
    // enough to use the counters in act 1, and full by the time the finale opens.
    // This is the far end doubling as a progress bar you can see from the middle
    // of the concourse.
    const done = Math.max(0, Math.min(1, totalPlugs(slot) / UNLOCKS.finale));
    const service = SERVICE_LIT_FLOOR + (1 - SERVICE_LIT_FLOOR) * done;
    const out = [];
    for (let x = phase - pitch; x < this.width; x += pitch) {
      let k;
      if (x > lastCab) k = service;
      else {
        // A gap fixture spans the two machines it hangs between, so it burns at
        // the SHARE of them that has power: none, half, or full.
        //
        // The first cut lit a fixture outright if either neighbour was on, which
        // meant a single unlocked cabinet lit the fixture on both sides of
        // itself, at full — two tubes blazing over a brand new file where the
        // room is supposed to be one working machine in the dark. Halves fix
        // that and buy something better: powering a machine fully lights the
        // fixture behind it AND half-lights the one ahead, so the light creeps
        // down the room a half-step at a time instead of jumping a whole bay.
        //
        // Always over two, not over however many neighbours exist. The fixture
        // at the exit end has only one cabinet beside it, and dividing by that
        // put a full-strength tube at the darkest end of an unrestored arcade.
        const on = cabs.filter((c) => Math.abs(c.x - x) <= pitch && c.unlocked).length;
        k = Math.min(1, on / 2);
      }
      out.push({ x, k });
    }
    return out;
  }

  // The furthest right an NPC may stand. Short of the player's own limit by a
  // chip row's worth, so their TALK/SWAP pair always has somewhere to be drawn
  // — the camera stops at the wall, so anything past it is simply never shown.
  npcFarX() { return this.width - 20 - NPC_CHIP_MARGIN; }

  // How much floor a station takes up, plus the air a hero keeps around it.
  // Stations are no longer one size: a counter is 118 across where a door is 44
  // and a cabinet 48, so one flat number cannot serve all three.
  loiterClear(s) {
    const half = s.type === 'bench' || s.type === 'shop' ? COUNTER_W / 2
      : s.type === 'cabinet' || s.type === 'overtime' ? CAB_W / 2
        : DOOR_W / 2;
    return half + NPC_LOITER_PAD;
  }

  // Somewhere a hero may come to rest: beside the furniture rather than through
  // it, and well clear of the exit.
  canLoiter(x) {
    if (x < NPC_MIN_X) return false;
    return !this.stations().some((s) => Math.abs(s.x - x) < this.loiterClear(s));
  }

  // The stretches of concourse a hero may actually stand on: everything between
  // NPC_MIN_X and the far end, minus each station's footprint.
  freeFloor() {
    const st = this.stations();          // also refreshes this.width
    // Runs to the far wall, not to a comfortable stopping point short of it.
    // update() clamps the player to width - 20, so anything inside that is
    // walkable floor and a hero standing on it is a hero you can reach.
    const lo = NPC_MIN_X + 20, hi = Math.max(lo + 1, this.npcFarX());
    const bands = st
      .map((s) => [s.x - this.loiterClear(s), s.x + this.loiterClear(s)])
      .sort((a, b) => a[0] - b[0]);
    const free = [];
    let cur = lo;
    for (const [a, b] of bands) {
      if (a > cur) free.push([cur, Math.min(a, hi)]);
      cur = Math.max(cur, b);
      if (cur >= hi) break;
    }
    if (cur < hi) free.push([cur, hi]);
    // Slivers are not standing room. Held at 6, which is under the 8-unit
    // windows the 88-pitch banks come to once each station claims its own
    // clearance: raise it past that and the cabinet row and the service doors
    // both stop offering anywhere to stand, and the whole cast gets squeezed
    // into the plaza and the far end.
    return free.filter(([a, b]) => b - a > 6);
  }

  // Where the crowd lives: one standing patch each, spread evenly across the
  // whole concourse.
  //
  // These used to be the midpoints between neighbouring cabinets — nine
  // cabinets, eight gaps, one hero apiece — which packed the entire cast into
  // the seven hundred units of arcade bank and left the plaza, both counters and
  // the whole service end without a soul in them. Everybody stood within half a
  // cabinet of a machine, so the crowd read as a queue for the machines rather
  // than as a food court with people in it.
  //
  // Spaced evenly across the CONCOURSE, then each one snapped onto the nearest
  // patch of standable floor.
  //
  // Spacing them evenly along the free floor instead — walking the total and
  // dropping somebody every 1/n of it — sounds more principled and looks worse.
  // Free floor is not spread evenly through the room: the arcade bank is eight
  // narrow 28-unit slots between cabinets, so by standable area it holds nearly
  // half the concourse, and four of eight heroes piled into the machines while a
  // 330-unit hole opened either side of the counters. What the eye reads is
  // distance, not area, so the spacing is done in plain x.
  //
  // Snapping is what keeps that honest. An even spread in x will land people
  // inside the furniture — squarely in the middle of the pawn till, since the
  // counters are 118 wide and only 140 apart with no standing room between them
  // at all — so every position is pulled to the nearest legal spot afterwards.
  npcHomes() {
    const spans = this.freeFloor();
    const n = Math.max(1, HEROES.length);
    const lo = NPC_MIN_X + 20;
    const hi = Math.max(lo + 1, this.npcFarX());
    const snap = (want) => {
      let best = want, bd = Infinity;
      for (const [a, b] of spans) {
        const x = Math.max(a, Math.min(b, want));
        const d = Math.abs(x - want);
        if (d < bd) { bd = d; best = x; }
      }
      return best;
    };
    // The first legal spot at or beyond `minX`. Distinct from snap(), which
    // takes the NEAREST — and nearest is the wrong answer when the thing being
    // escaped is a wide forbidden band, since the closest legal spot to the far
    // side of a counter is the near side of that same counter, i.e. exactly
    // where we were trying not to be.
    const snapAfter = (minX) => {
      for (const [a, b] of spans) if (b >= minX) return Math.max(a, minX);
      return null;
    };
    const homes = [];
    const MIN_SEP = NPC_STAND_OFF * 2;
    for (let i = 0; i < n; i++) {
      // Endpoints included: hero 0 is homed at the near end of the walkable
      // floor and hero n-1 at the far end, past every station, rather than both
      // sitting a half-step inside. This is what actually reaches the back wall.
      const want = n > 1 ? lo + (i / (n - 1)) * (hi - lo) : (lo + hi) / 2;
      let x = snap(want);
      const prev = homes[homes.length - 1];
      if (prev != null && x - prev < MIN_SEP) x = snapAfter(prev + MIN_SEP) ?? x;
      homes.push(x);
    }
    return homes;
  }

  // Where to stand in order to address `n`. Beside them, never on top of them,
  // and on whichever side leaves THEM the nearest thing — the focus rule is
  // nearest-wins, so walking to a hero who is standing at a machine and stopping
  // on the machine's side would arrive with the machine selected and the hero's
  // chips gone. That is the whole failure this is avoiding, and it is not
  // hypothetical: it is exactly where Dolores and Gary stand, a few units off
  // the centre of a station that is 118 wide.
  //
  // Prefer the side we are already on, since that is the shorter walk, and flip
  // only when that spot would hand the arrival to a station.
  standBesideX(n) {
    const side = Math.sign(this.px - n.x) || 1;
    const clamp = (x) => Math.max(20, Math.min(this.width - 20, x));
    for (const s of [side, -side]) {
      const x = clamp(n.x + s * NPC_STAND_OFF);
      const st = nearestTo(this.stations(), x, STATION_R);
      // Arriving here puts us NPC_STAND_OFF from them; they win only if every
      // station is further off than that.
      if (!st || Math.abs(st.x - x) > Math.abs(n.x - x)) return x;
    }
    return clamp(n.x + side * NPC_STAND_OFF);
  }

  nearestHome(x) {
    const homes = this.npcHomes();
    if (!homes.length) return x;
    return homes.reduce((best, h) => (Math.abs(h - x) < Math.abs(best - x) ? h : best), homes[0]);
  }

  enter() {
    Input.setContext('hub');
    this.setChromeWalkButtons();
    // Arriving in the food court is the moment you HAVE a hero, so it is the
    // moment transitions may start showing one. Before this — title, difficulty,
    // the intro — the shutter stays a plain sticker.
    setTransitionHero(this.avatarId());
    const returning = this.flow.hubPosition;
    this.px = this.px ?? returning?.px ?? 40;
    this.facing = this.facing ?? returning?.facing ?? 1;
    this.jumpY = 0;
    this.jumpVy = 0;
    this.t = 0;
    this.talk = null;
    this.poster = null;      // a wall poster held open, full-frame, to be read
    this.walkTarget = null;
    this.walkHoldT = 0;
    // Gait clock, advanced by distance travelled rather than by time, so the
    // legs cycle with the hero instead of alongside them.
    this.gaitPhase = 0;
    this.lockedTrophyBump = false;
    this.dragging = false;   // press-and-hold is steering the walk target live
    this.dwellNpcId = null;   // which hero the chooser is currently offered for
    this.npcMenuIdx = 0;
    this.npcDwell = 0;
    this.greeted = false;     // has this hero already said hello, this approach
    this.hasMoved = false;   // the controls legend retires once you have walked
    this.movedAt = 0;
    // One standing patch per hero, spread the length of the concourse — see
    // npcHomes for why it is measured in free floor rather than in x.
    //
    // Roam is DERIVED from that spacing rather than fixed. A flat 155 was tuned
    // when the whole cast lived in the 88-wide gaps between cabinets, where it
    // meant "you may stroll past two or three machines". Against homes that are
    // now the better part of two hundred apart it would mean something else
    // entirely — every hero's range overlapping both neighbours, so the crowd
    // slowly pools back into clumps and undoes the spread. Just under half the
    // spacing lets neighbouring ranges meet without lapping over each other,
    // which keeps them mingling without re-gathering.
    const homes = this.npcHomes();
    const spacing = homes.length > 1
      ? (homes[homes.length - 1] - homes[0]) / (homes.length - 1)
      : NPC_ROAM;
    const roam = Math.max(40, Math.min(NPC_ROAM, spacing * 0.45));
    this.npcActors = HEROES.map((h, i) => {
      const home = homes.length ? homes[i % homes.length] : 155 + i * 120;
      const walking = i % 3 !== 0;
      return {
        id: h.id, home, x: home, facing: i % 2 ? -1 : 1,
        state: walking ? 'walk' : 'idle',
        timer: 0.75 + (i % 4) * 0.33,
        duration: 1, cycles: i, swappable: true, roam,
      };
    });
    // The counter staff. Neither is swappable: they are not in HEROES, and Relay
    // ignores an initialHeroId it does not recognise, so "play as Gary" would
    // quietly start the run as somebody else. Both are `pinned` — they are drawn
    // INSIDE drawCounter, between its back shelf and its front, so their x is not
    // theirs to change, and the wander states would walk them out through the
    // front of their own units.
    //
    // Gary used to stand loose beside a shop door, which is where he ended up
    // after being a cached sprite blocking the doorway itself. Behind a till is
    // what he was always describing: he has physical jurisdiction, business
    // hours, and a counter.
    for (const [id, name, type, h] of [
      ['dolores', 'DOLORES', 'bench', DOLORES_H],
      ['gary', 'GARY', 'shop', GARY_H],
    ]) {
      const at = this.stations().find((st) => st.type === type);
      if (!at) continue;
      // The open end of the unit, past where the glass stops — stated once in
      // arcade.js so their post and the end of the glass can never drift apart.
      const px = at.x - COUNTER_W / 2 + COUNTER_W * COUNTER_STAFF_X;
      this.npcActors.push({
        id, name, home: px, x: px, facing: 1, staffH: h, station: type,
        state: 'idle', timer: 2 + (id === 'gary' ? 5 : 0), duration: 1, cycles: 0,
        swappable: false, pinned: true, roam: STAFF_ROAM,
      });
    }
    Audio.setBank(HUB_THEME);
    // Tapping a station both walks to it and uses it (see update()), and the
    // EXIT sign at the left of the concourse is itself a station — the whole
    // hub is its own control surface, so it needs no buttons of its own.
    Input.setButtons([]);
  }
  exit() {
    this.flow.hubPosition = { px: this.px, facing: this.facing || 1 };
    Input.setButtons([]);
    Input.setChromeButtons([]);
  }

  setChromeWalkButtons() {
    this.chromeMode = chromeGeo.mode;
    this.chromeTouch = Input.usingTouch;
    // These exposed-margin controls are the food court's touch navigation.
    // Mouse and keyboard already have click-to-walk and left/right, so showing
    // the discs there only turns otherwise quiet canvas into duplicate chrome.
    if (!Input.usingTouch || chromeGeo.mode === 'none') { Input.setChromeButtons([]); return; }
    Input.setChromeButtons([
      { id: 'hubLeft', ...chromeGeo.jump, action: 'left' },
      { id: 'hubRight', ...chromeGeo.ability, action: 'right' },
    ]);
  }

  drawChromeWalkButtons() {
    if (!chromeCtx || !Input.usingTouch || chromeGeo.mode === 'none' || this.poster) return;
    const buttons = Input.chromeButtons.filter((b) => b.id === 'hubLeft' || b.id === 'hubRight');
    if (!buttons.length) return;
    // The walk arrows are static once placed, so the signature is just their
    // placement — commitChromeFrame (states.js) skips the repaint every frame
    // they are unchanged. See renderer.js paintChrome/commitChromeFrame.
    const sig = `hub|${chromeGeo.mode}|${chromeGeo.vw}x${chromeGeo.vh}|${buttons.map((b) => b.id).join(',')}`;
    paintChrome(sig, (ctx) => {
      for (const button of buttons) {
        const box = {
          x: button.x - button.r, y: button.y - button.r,
          w: button.r * 2, h: button.r * 2,
          label: button.id === 'hubLeft' ? '<' : '>', round: true,
        };
        drawRoundButton(ctx, box, {
          fill: 'rgba(255,255,255,0.22)',
          ink: '#ffffff',
          ring: 'rgba(255,255,255,0.75)',
          ringWidth: 1.5,
          labelScale: 2.4,
          labelStyle: 'bold',
        });
      }
    });
  }

  // Camera follows the player, clamped to the concourse — shared by update()
  // (to turn a tap's screen x back into world x) and draw() (to place it).
  camX() { return Math.max(0, Math.min(this.width - HUB_VIEW_W, this.px - HUB_VIEW_W / 2)); }

  update(dt) {
    // A poster held open owns the screen, and the concourse holds still behind
    // it: this sits above even `this.t`, so the walk, the NPC wander, the dwell
    // timers and the flicker all stop rather than running on behind a dim you
    // cannot see them through. You are reading, not idling in a room.
    if (this.poster) {
      this.poster.t += dt;
      // Any press closes it. There is nothing else to do in here and nowhere
      // to aim — the sheet fills the frame — so every input can only mean
      // "done reading", and making the player find a specific X to hit would
      // be ceremony around a thing they opened with one tap.
      if (Input.pressed('pointer') || Input.pressed('confirm') || Input.pressed('back') || Input.pressed('jump')) {
        this.poster = null;
        Audio.sfx('ui');
      }
      Input.endFrame();
      return;
    }
    this.t += dt;
    if (chromeGeo.mode !== this.chromeMode || Input.usingTouch !== this.chromeTouch) this.setChromeWalkButtons();
    this.updateNpcs(dt);
    const st = this.stations();
    const directionHeld = Input.held('left') || Input.held('right');
    const walkSpeed = heldWalkSpeed(HUB_WALK_SPEED, this.walkHoldT);
    // Read before anything moves him: every route into the concourse floor —
    // keyboard, tap-to-walk, drag-steering — lands in this.px, so measuring the
    // frame's actual displacement catches all three without each having to
    // remember to advance the gait. It also picks up the wall clamp for free,
    // so walking into the end of the room stops the legs instead of leaving
    // them running on the spot.
    const gaitPrevPx = this.px;
    if (Input.pressed('jump') && this.jumpY === 0) {
      this.jumpVy = HUB_JUMP_V;
      Audio.sfx('jump');
    }
    if (this.jumpY > 0 || this.jumpVy > 0) {
      this.jumpVy -= HUB_JUMP_GRAVITY * dt;
      this.jumpY += this.jumpVy * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.jumpVy = 0; }
    }
    if (Input.held('left')) { this.px -= walkSpeed * dt; this.facing = -1; this.walkTarget = null; this.walkToNpc = null; this.addressing = null; this.addressTap = false; }
    if (Input.held('right')) { this.px += walkSpeed * dt; this.facing = 1; this.walkTarget = null; this.walkToNpc = null; this.addressing = null; this.addressTap = false; }
    if (!this.hasMoved && (Input.held('left') || Input.held('right') || this.walkTarget != null)) this.hasMoved = true;
    if (this.hasMoved) this.movedAt += dt;
    // Tap/click anywhere (not a virtual button) to walk there — mouse and
    // touch alike, Input.pointer fires for both. Landing on a station or NPC
    // only walks: arriving does not auto-enter/auto-talk, because a tap that
    // lands on a cabinet while you're still 200px away shouldn't commit you
    // to it sight unseen. Confirming also needs the tap to land near YOU
    // (onSelf below), not just near the station — the exit door's hit radius
    // reaches well past its own art (spawn starts right beside it), so without
    // that a tap meant to walk a few steps within that same zone would read as
    // "confirm exit" purely because the door happened to be nearby. A plain
    // tap on open floor, anywhere, always just walks to that exact spot.
    if (Input.pressed('pointer') && !Input.buttonAt(Input.pointer.x, Input.pointer.y)) {
      // Posters answer first. They hang high on the back wall — screen y 16 to
      // 86, a band that holds nothing else tappable and no floor to walk to —
      // so a tap that lands on one cannot have meant anything else. At 40x54
      // on the wall a poster is legibly a poster and nothing more: the star
      // reads, the wordmark is a shape, and the tagline under it is a smudge.
      // This is the only way to actually read one.
      const pwx = Input.pointer.x / HUB_ZOOM + this.camX();
      const pwy = Input.pointer.y / HUB_ZOOM + HUB_CAM_Y;
      const tappedPoster = pwy > POSTER_TOP_Y - 4 && pwy < POSTER_TOP_Y + POSTER_H + 4
        ? st.find((s) => (s.type === 'cabinet' || s.type === 'overtime')
          && Math.abs(s.x - pwx) < POSTER_W / 2 + 4)
        : null;
      if (tappedPoster) {
        this.poster = { station: tappedPoster, t: 0, ...posterLook(tappedPoster.x) };
        Audio.sfx('uiConfirm');
        Input.endFrame();
        return;
      }
      // A tap that lands on one of the chooser's bottom-row chips takes that
      // option and nothing else. Check it before translating the pointer into
      // world space, because this contextual chrome is fixed to the screen.
      const chipNpc = this.focusNpc;
      if (chipNpc) {
        const chipOpts = npcMenuFor(chipNpc);
        const chipLayout = npcPromptLayout(chipNpc, chipOpts,
          (chipNpc.x - this.camX()) * HUB_ZOOM);
        for (let i = 0; i < chipOpts.length; i++) {
          const r = chipLayout.rects[i];
          if (Input.pointer.x >= r.x - 4 && Input.pointer.x <= r.x + r.w + 4
            && Input.pointer.y >= r.y - 3 && Input.pointer.y <= r.y + r.h + 3) {
            this.npcMenuIdx = i;
            this.chooseNpc(chipNpc);
            Input.endFrame();
            return;
          }
        }
      }
      const worldX = Input.pointer.x / HUB_ZOOM + this.camX();
      const worldY = Input.pointer.y / HUB_ZOOM + HUB_CAM_Y;
      const bench = st.find((s) => s.type === 'bench');
      const dolores = this.npcs().find((n) => n.id === 'dolores' && !n.clearingStation);
      const visualBenchHit = bench && benchVisualHit(bench, worldX, worldY, dolores) ? bench : null;
      const stationHit = visualBenchHit || nearestTo(st, worldX, 22);
      // Widened from 14: a hero is about that wide on screen, so half of every
      // sprite was outside its own tap target and clicking someone's shoulder
      // walked you past them. Dolores and Gary are wider still.
      const npcHit = nearestTo(this.npcs().filter((n) => !n.clearingStation), worldX, 17);
      // An NPC's wander can drift it right next to a station (the food court
      // is cramped); whichever is actually closer to the tap wins, so tapping
      // dead-on a loitering hero doesn't get swallowed by the counter behind them.
      const npcCloser = stationHit && npcHit && Math.abs(npcHit.x - worldX) < Math.abs(stationHit.x - worldX);
      const tappedStation = stationHit && !npcCloser ? stationHit : null;
      const tappedNpc = npcHit && (!stationHit || npcCloser) ? npcHit : null;
      const onSelf = Math.abs(worldX - this.px) < 20;
      const nearBench = visualBenchHit && Math.abs(visualBenchHit.x - this.px) < 26;
      if (tappedStation && ((onSelf && Math.abs(tappedStation.x - this.px) < 26) || nearBench)) this.interact(tappedStation);
      // Tapping a hero does NOT act on them. It used to run chooseNpc, which
      // with TALK selected just replayed their line — a second, invisible way to
      // do a thing the chips already do visibly, and the only one that could
      // fire by accident while you were trying to walk. The chips are the whole
      // interface now; a tap on the hero themselves falls through and walks —
      // but it walks to a spot BESIDE them (standBesideX) rather than to their
      // own x. Walking onto somebody's exact position stood the two sprites
      // inside each other, and for the counter staff it was worse than untidy:
      // their x sits a few units off a station centre, so arriving there handed
      // the focus to the counter and the chips you were walking over to use
      // never appeared.
      else {
        const target = tappedStation ? tappedStation.x
          : tappedNpc ? this.standBesideX(tappedNpc) : worldX;
        this.walkTarget = Math.max(20, Math.min(this.width - 20, target));
        this.walkToNpc = tappedNpc ? tappedNpc.id : null;
        // Who you MEANT. Tapping open floor or a station drops it.
        this.addressing = tappedNpc ? tappedNpc.id : null;
        this.addressTap = !!tappedNpc;
        // Not a drag when the tap picked a person. Press-and-hold re-steers to
        // wherever the pointer currently is, and a mouse click stays down for a
        // frame or two — long enough to overwrite the beside-them target with
        // the raw pointer x and put us back on top of them. Tapping somebody is
        // a committed destination; dragging is for steering across open floor.
        this.dragging = !tappedNpc;
      }
    }
    // Press-and-hold steers live: once the initial touch-down was spent
    // walking rather than confirming (interact/talk stay one-shot, on the
    // press edge only, above), the SAME finger staying down keeps the
    // destination glued to wherever it currently is — a drag across the
    // concourse, not one fixed spot chosen the instant it landed.
    if (!Input.held('pointer')) {
      this.dragging = false;
    } else if (this.dragging && !Input.pressed('pointer')) {
      const worldX = Input.pointer.x / HUB_ZOOM + this.camX();
      this.walkTarget = Math.max(20, Math.min(this.width - 20, worldX));
      this.walkToNpc = null;
    }
    // Following somebody you tapped: the destination is the PERSON, so it is
    // recomputed every frame from where they actually are now. Tapping stored
    // only their x, and the concourse is long — a hero at walking pace covers
    // a lot of it while you cross the room, so you arrived at the spot they had
    // been standing on and they were somewhere else entirely. NPC_ATTEND_R does
    // the rest: get within 30 and they stop, so the chase always converges.
    if (this.walkToNpc) {
      const who = this.npcs().find((n) => n.id === this.walkToNpc && !n.clearingStation);
      if (who) this.walkTarget = this.standBesideX(who);
      else this.walkToNpc = null;
    }
    const exitDoor = st.find((s) => s.type === 'exit');
    const trophyDoor = st.find((s) => s.type === 'shelf');
    const walkingThroughExit = Input.held('left')
      || (this.walkTarget != null && exitDoor && this.walkTarget <= exitDoor.x);
    const walkingThroughTrophy = Input.held('right')
      || (this.walkTarget != null && trophyDoor && this.walkTarget >= trophyDoor.x);
    if (!Input.held('right')
        && !(this.walkTarget != null && trophyDoor && this.walkTarget >= trophyDoor.x)) {
      this.lockedTrophyBump = false;
    }
    if (this.walkTarget != null) {
      const d = this.walkTarget - this.px;
      if (Math.abs(d) < 3) { this.walkTarget = null; this.walkToNpc = null; }
      else { this.facing = d > 0 ? 1 : -1; this.px += Math.sign(d) * Math.min(Math.abs(d), walkSpeed * dt); }
    }
    const steeringHeld = Input.held('pointer') && this.dragging && this.walkTarget != null;
    this.walkHoldT = directionHeld || steeringHeld
      ? Math.min(WALK_ACCEL_TIME, this.walkHoldT + dt)
      : 0;
    this.px = Math.max(20, Math.min(this.width - 20, this.px));
    const gaitDx = Math.abs(this.px - gaitPrevPx);
    if (gaitDx > 0) {
      this.gaitPhase = (this.gaitPhase + gaitDx / (PLAYER_H * GAIT_DISTANCE_PER_CYCLE)) % 1;
    } else {
      // Standing still, park the cycle on a contact frame. gaitFoot is a cosine
      // in x, so phase 0 and 0.5 are the two moments both feet are on the floor;
      // everywhere else has one of them in the air. Leaving the clock wherever
      // it happened to stop meant the next step could begin with a foot already
      // at full lift, and the idle pose it steps out of has both feet planted.
      // Snapping to the NEARER contact keeps whichever foot was leading.
      this.gaitPhase = this.gaitPhase < 0.25 || this.gaitPhase >= 0.75 ? 0 : 0.5;
    }
    if (walkingThroughExit && exitDoor && this.px <= exitDoor.x) {
      this.flow.toTitle();
      Input.endFrame();
      return;
    }
    if (walkingThroughTrophy && trophyDoor && this.px >= trophyDoor.x) {
      if (!trophyDoor.unlocked) {
        // Meet the closed door instead of walking through its centre. Held
        // input may keep pressing against it, so the bad-input cue is latched
        // until the player releases or chooses another destination.
        this.px = trophyDoor.x - 3;
        this.walkTarget = null;
        this.walkToNpc = null;
        if (!this.lockedTrophyBump) {
          Audio.sfx('uiBad');
          this.talk = { text: 'CLEAR 1 LEVEL TO OPEN THE TROPHY ROOM.', t: 3, who: null };
          this.lockedTrophyBump = true;
        }
        Input.endFrame();
        return;
      }
      // The saved hub facing is what the returning room transition restores.
      // Face back into the concourse so leaving the Trophy Room never points
      // the hero straight back through the boundary they just used.
      this.facing = -1;
      this.flow.openTrophyRoom();
      Input.endFrame();
      return;
    }
    const near = nearestTo(st, this.px, STATION_R);
    this.near = near;
    // Talk to NPC heroes: press down, or just stand alongside one for a second —
    // same line either way. The dwell timer resets whenever the adjacent NPC
    // changes (including to none), so lingering only ever fires the auto-talk
    // once per visit.
    // WHO YOU ARE TALKING TO — sticky, not re-decided every frame.
    //
    // Nearest-wins is the right way to ACQUIRE somebody and the wrong way to
    // keep them. Recomputing it per frame meant the selection changed under you
    // as the crowd milled about: stood perfectly still for three minutes, the
    // chips swapped identity 22 times, because anyone strolling past came within
    // a unit of whoever you were already stood with and took the slot. And when
    // it came from an explicit tap it was worse than jittery — you crossed the
    // concourse for Fernwick and arrived to find B-33P selected.
    //
    // So: hold whoever we have until they actually leave talk range, and only
    // then look for somebody new.
    let held = this.addressing
      ? this.npcs().find((n) => n.id === this.addressing
        && !n.clearingStation && Math.abs(n.x - this.px) < NPC_TALK_R)
      : null;
    // Not while we are still on our way to them: they are out of talk range for
    // the whole crossing, so clearing on range alone dropped the intent on the
    // very first frame and the walk arrived with nothing chosen.
    if (!held && !this.walkToNpc) {
      const found = nearestTo(this.npcs().filter((n) => !n.clearingStation), this.px, NPC_TALK_R);
      this.addressing = found ? found.id : null;
      this.addressTap = false;   // acquired by standing near them, not chosen
      held = found;
    }
    const npc = held;
    this.nearNpc = npc;
    // WHO YOU ARE ADDRESSING — decided once, here, and read by everything else.
    //
    // The rule used to be "a station anywhere within 26 suppresses the chips
    // outright", restated by hand at four call sites (chip hit-test, chip
    // drawing, the bottom prompt, and confirm). Two problems with that:
    //
    //  - It blanks out most of the arcade. Cabinets sit 88 apart with a 26
    //    radius each way, so 52 units of every 88 are station, and standing
    //    beside a hero anywhere in that stretch silently offered you nothing —
    //    with no visible reason, since the cabinet is behind you and the hero is
    //    right there.
    //  - The touch path had ALREADY rejected it. Tapping used nearest-wins
    //    (`npcCloser` below), so tapping a hero standing at a cabinet talked to
    //    them, while walking to that same hero and pressing Enter opened the
    //    cabinet. One situation, two answers, depending on input device.
    //
    // Nearest-wins everywhere instead, matching what touch already did. The
    // chips are what make it legible: whenever they are on screen, confirm acts
    // on the hero, and whenever they are not, it acts on the station. There is
    // no case where the affordance on screen disagrees with what the button does.
    // A person you TAPPED outranks the station behind them — you pointed at
    // them, which is not ambiguous. Somebody you merely ended up standing near
    // does not: there, nearest-wins, so walking onto a machine still selects
    // the machine even with a hero loitering beside it.
    const npcWins = !!npc
      && (this.addressTap || !near || Math.abs(npc.x - this.px) < Math.abs(near.x - this.px));
    this.focusNpc = npcWins ? npc : null;
    // Declared here, ABOVE its first use in the confirm test below. It was
    // originally left further down, which put it in the temporal dead zone: the
    // `Input.pressed('jump') && !chooser` arm threw a ReferenceError on every
    // Space press, and because the throw escaped update() before
    // Input.endFrame() ran, the pressed-set was never cleared — so 'jump' stayed
    // held, the throw repeated every frame, and the whole hub went unresponsive.
    // A one-frame error became a permanent lock purely through the missed
    // endFrame().
    //
    // The chooser moves on ArrowUp/ArrowDown. The hub input context keeps those
    // as navigation actions while reserving Space for the avatar's jump.
    const chooser = !!this.focusNpc;
    // Confirm follows the focus, so it always does what the chips say it will.
    if (Input.pressed('confirm')) {
      if (this.focusNpc) this.chooseNpc(this.focusNpc);
      else if (near) this.interact(near);
    }
    // The chooser resets to TALK whenever the hero beside you changes, so it
    // never opens already pointing at SWAP on someone you just walked up to.
    if ((npc?.id ?? null) !== this.dwellNpcId) {
      this.dwellNpcId = npc?.id ?? null;
      this.npcMenuIdx = 0;
      this.npcDwell = 0;
      this.greeted = false;
    }
    // Heroes still greet you unprompted the first time you stand with them —
    // that ambience got removed along with the old dwell-to-talk binding, which
    // it was tangled up with, and the concourse went quiet. It is not redundant
    // with the TALK chip: talkTo() walks HUB_LINES in order (slot.hub.npcSeen),
    // so the greeting is their opener and the chip is everything after it.
    if (npc) {
      this.npcDwell += dt;
      if (!this.greeted && this.npcDwell >= 0.8) { this.greeted = true; this.talkTo(npc); }
    }
    if (chooser) {
      const opts = npcMenuFor(npc);
      if (this.npcMenuIdx >= opts.length) this.npcMenuIdx = 0;
      if (opts.length > 1) {
        if (Input.pressed('up')) { this.npcMenuIdx = (this.npcMenuIdx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
        if (Input.pressed('down')) { this.npcMenuIdx = (this.npcMenuIdx + 1) % opts.length; Audio.sfx('ui'); }
      }
    }
    if (this.talk && (this.talk.t -= dt) <= 0) this.talk = null;
    if (Input.pressed('back')) this.flow.toTitle();
    if (Input.pressed('mute')) { this.save.settings.muted = !this.save.settings.muted; Audio.setMuted(this.save.settings.muted); }
    Input.endFrame();
  }

  interact(st) {
    const slot = this.save.slot;
    if (st.type === 'shelf' && !trophyRoomUnlocked(slot)) {
      Audio.sfx('uiBad');
      this.talk = { text: 'CLEAR 1 LEVEL TO OPEN THE TROPHY ROOM.', t: 3, who: null };
      return;
    }
    Audio.sfx('uiConfirm');
    if (st.type === 'cabinet') {
      if (!st.unlocked) {
        this.talk = { text: `NEEDS ${UNLOCKS[st.cab.id]} PLUGS. YOU HAVE ${totalPlugs(slot)}. THE MATH IS SINCERE.`, t: 3, who: null };
        return;
      }
      this.flow.openCabinet(st.cab);
    } else if (st.type === 'exit') this.flow.toTitle();
    else if (st.type === 'bench') this.flow.openBench();
    else if (st.type === 'shop') this.flow.openShop();
    else if (st.type === 'arcade') this.flow.openArcade();
    else if (st.type === 'shelf') { this.facing = -1; this.flow.openTrophyRoom(); }
    else if (st.type === 'socket') this.flow.startFinale();
    else if (st.type === 'overtime') this.flow.startOvertime();
    else if (st.type === 'backroom') this.flow.startOvertime((Date.now() & 0xfffff) ^ 0xbac);
  }

  talkTo(npc) {
    const lines = HUB_LINES[npc.id];
    const slot = this.save.slot;
    const seen = slot.hub.npcSeen[npc.id] || 0;
    this.talk = { text: lines[seen % lines.length], t: 3.2, who: npc.id };
    slot.hub.npcSeen[npc.id] = seen + 1;
    Audio.sfx('ui');
  }

  // Whoever the player is currently wearing. Gary shows up on the coupon mod;
  // otherwise it's the last team's lead, and Lorenzo before there is one.
  avatarId() {
    const slot = this.save.slot;
    if (slot.mods.equipped.includes('coupon')) return 'gary';
    // Flow.heroId() is the single source: a hub swap, else whoever finished the
    // last run, else Lorenzo. Gary is deliberately NOT pushed through it — the
    // coupon mod is a hub costume, and Relay ignores an initialHeroId that is not
    // in HEROES anyway, so a Gary run would just draw at random.
    return heroIdFor(this.flow);
  }

  // Whichever chip is lit.
  chooseNpc(npc) {
    const opts = npcMenuFor(npc);
    const pick = opts[Math.min(this.npcMenuIdx || 0, opts.length - 1)];
    if (pick.id === 'swap') this.swapTo(npc);
    else this.talkTo(npc);
  }

  // Take over the hero you are standing next to. This deliberately changes ONLY
  // who walks the concourse — the run team is still chosen at the cabinet, and
  // silently re-casting a run from the hub would be a surprise you could not see
  // coming from here.
  //
  // The two trade places rather than the crowd simply gaining a member: whoever
  // you were steps into the spot you were standing in, and you step into theirs.
  // npcs() filters the avatar out of the crowd by id, so both halves of that
  // follow from setting one field — but without moving them, the hero you left
  // would pop back to a home position several strides away.
  swapTo(npc) {
    const prev = this.avatarId();
    if (prev === npc.id) return;
    const prevX = this.px;
    this.flow.hubAvatar = npc.id;
    // Point the shutter cameo at whoever you just became, so walking into a
    // cabinet shows the hero you are about to play rather than a stranger.
    setTransitionHero(npc.id);
    const actor = (this.npcActors || []).find((a) => a.id === prev);
    if (actor) {
      // They appear exactly where you were standing, then drift to the nearest
      // gap. Handing them prevX as a permanent home meant that swapping while
      // stood at a cabinet parked someone in front of it for the rest of the
      // session — the one thing the gap placement exists to prevent.
      actor.x = prevX;
      actor.home = this.nearestHome(prevX);
      actor.state = 'idle';
      actor.timer = 1.4;
      actor.facing = npc.x < prevX ? -1 : 1;
    }
    this.px = npc.x;
    this.facing = npc.facing || 1;
    // Standing where they stood would otherwise re-trigger the dwell auto-talk
    // against whoever is now nearest, one frame after the swap.
    this.dwellNpcId = null;
    this.npcMenuIdx = 0;
    this.npcDwell = 0;
    this.greeted = true;      // you just became them; no self-greeting
    this.talk = null;
    Audio.sfx('power');
  }

  npcs() {
    // Heroes loiter in the hub; DUST DEVIL cleans impossible things. The hero
    // the player is currently wearing stays out of the crowd -- one Lorenzo.
    const actors = this.npcActors || HEROES.map((h, i) => ({ id: h.id, x: 110 + i * 90 + (i % 3) * 22, facing: 1, state: 'idle' }));
    const avatar = this.avatarId();
    return actors.filter((n) => n.id !== avatar);
  }

  updateNpcs(dt) {
    // Counters and actual door stations are access points, unlike cabinets
    // that the crowd may casually cross in front of. When the player is at one,
    // the wandering cast actively clears its full footprint.
    const access = this.stations().find((s) =>
      DOOR_PALETTES[s.type]
      && Math.abs(this.px - s.x) < STATION_R);
    for (const n of this.npcs()) {
      // Counter staff do not wander the concourse — they are drawn inside their
      // own units, so a walk cycle on the hero rules would carry them out
      // through the front of their counter and a hop would put a head through
      // the glass. What they do instead is work: a short shuffle along the deck
      // now and then, and back to the post.
      //
      // The point of it is that a figure pinned to one x for an entire visit
      // reads as a sprite bolted to the furniture, which is exactly what Gary
      // used to be. A few units of drift, rarely, is enough to say somebody is
      // actually standing there. It stays SHORT (STAFF_ROAM is a fraction of the
      // deck) and it stays rare, because a counter clerk pacing continuously
      // reads as agitated rather than staffed.
      if (n.pinned) {
        n.clearingStation = false;
        n.state = 'idle';
        n.timer -= dt;
        if (n.timer <= 0) {
          n.cycles++;
          // Alternate: a spell away from the post, then a spell back at it. The
          // trip home is a state of its own rather than a snap, so they are seen
          // to return rather than teleporting the moment the timer lapses.
          //
          // Direction comes off the TRIP count, not off `cycles`. Trips only
          // ever start on odd cycles (the even ones are the walk home), so
          // `cycles % 2` is constant at the only moment it gets read, and both
          // of them shuffled to their right forever.
          const trip = Math.floor(n.cycles / 2);
          n.awayTo = n.awayTo == null
            ? n.home + (trip % 2 ? -1 : 1) * STAFF_ROAM * (0.55 + (trip % 3) * 0.22)
            : null;
          // Long at the post, brief away from it. This wants to read as somebody
          // occasionally reaching for something, not as pacing — at a 3-to-1
          // ratio they looked restless, so it sits nearer 6-to-1.
          n.timer = n.awayTo == null ? 15 + (n.cycles % 4) * 4.5 : 2.4 + (n.cycles % 3) * 0.7;
        }
        // Serving somebody takes precedence over tidying: with a customer at the
        // counter she holds where she is rather than drifting off down the deck
        // mid-order.
        const goal = n.awayTo == null ? n.home : n.awayTo;
        const d = goal - n.x;
        if (Math.abs(d) > 0.4 && Math.abs(n.x - this.px) >= NPC_ATTEND_R) {
          n.x += Math.sign(d) * Math.min(Math.abs(d), 7 * dt);
        }
        // Facing still belongs to the customer: they turn to whoever is at the
        // counter no matter which way along it they happen to be working.
        n.facing = this.px < n.x ? -1 : 1;
        continue;
      }

      // When the player steps up to a service counter or a door, wandering cast
      // members actively make way. canLoiter() already stopped them CHOOSING
      // these areas as resting places, but they could still cross one slowly
      // and steal station focus while doing so. Walk them to the nearest edge
      // of its full clearance band and temporarily remove them from tap/talk
      // targeting. Counter staff are handled above and never move.
      const accessClear = access ? this.loiterClear(access) : 0;
      if (access && Math.abs(n.x - access.x) < accessClear) {
        n.clearingStation = true;
        n.attending = false;
        n.state = 'walk';
        n.timer = Math.max(n.timer, 0.6);
        const left = access.x - accessClear;
        const right = access.x + accessClear;
        const dir = left < NPC_MIN_X ? 1
          : right > this.npcFarX() ? -1
            : Math.sign(n.x - access.x) || (n.cycles % 2 ? -1 : 1);
        n.facing = dir;
        n.x += dir * Math.min(accessClear - Math.abs(n.x - access.x), 42 * dt);
        if (this.addressing === n.id) {
          this.addressing = null;
          this.addressTap = false;
        }
        if (this.walkToNpc === n.id) this.walkToNpc = null;
        if (this.focusNpc?.id === n.id) this.focusNpc = null;
        if (this.talk?.who === n.id) this.talk = null;
        continue;
      }
      n.clearingStation = false;
      // Conversation wins over wandering, and the speaker turns toward the
      // player instead of strolling away halfway through a punchline.
      //
      // So does being addressed: the hero you are actually talking to stops and
      // turns to you, the way anybody would. That is worth having for its own
      // sake, but it also steadies the chips — the TALK/SWAP window is 18 units
      // wide and a wandering hero crosses it at 10 units a second, so standing
      // beside one who had not noticed you meant the chips appeared, slid away
      // and came back while you had not moved at all.
      //
      // It is keyed to the FOCUS and not to a radius, which matters more than it
      // looks. Stopping everyone within a radius made that radius an absorbing
      // state: heroes random-walk, so any that wandered into it froze there and
      // never left, and standing still for forty seconds silently collected a
      // crowd of five around you. Only one person is ever being addressed, so
      // only one is ever held, and everybody else walks past the way they should.
      //
      // The timer floor is what stops them setting off again the instant you
      // step away: without it the lapsed timer picks a new walk on the very next
      // frame, and they leave the moment you turn your back.
      if (this.talk?.who === n.id || this.focusNpc?.id === n.id) {
        n.state = 'idle';
        n.attending = true;   // stopped FOR you, not settled here by choice
        n.facing = this.px < n.x ? -1 : 1;
        n.timer = Math.max(n.timer, 0.35);
        continue;
      }
      n.attending = false;
      n.timer -= dt;
      const roam = n.roam || NPC_ROAM;
      if (n.state === 'walk') {
        n.x += n.facing * 10 * dt;
        // Turn around at the edge of their range instead of stopping there.
        // Stopping on the limit made the limit itself a loitering spot, which is
        // how heroes ended up parked at arbitrary points along the concourse.
        if (Math.abs(n.x - n.home) >= roam) n.facing = n.x > n.home ? -1 : 1;
        // Never drift back toward the way out. The exit's own walk-up radius
        // reaches well past its art, so a hero idling near it competes with the
        // one station you cannot afford to mis-trigger.
        if (n.x < NPC_MIN_X) { n.x = NPC_MIN_X; n.facing = 1; }
        // ...and never off the far end either. This clamp only ever existed on
        // the left, because the crowd used to live in the cabinet gaps in the
        // middle of the room and could not reach either wall. Now that they are
        // homed the length of the concourse, the hero at the far end has a roam
        // range that runs clean past the last of the floor, and they walked out
        // over the edge into the letterbox. Same bound the player gets.
        const far = this.npcFarX();
        if (n.x > far) { n.x = far; n.facing = -1; }
      }
      if (n.timer > 0) continue;
      n.cycles++;
      if (n.state === 'walk') {
        // Walking anywhere is fine — crossing in front of a machine is what a
        // concourse looks like. STOPPING in front of one is not: it hides the
        // screen and it sits inside the station's own walk-up radius, so
        // reaching the machine means contesting the same patch of floor. If the
        // walk ran out somewhere unsuitable, keep going rather than settle.
        if (!this.canLoiter(n.x)) { n.timer = 0.5 + (n.cycles % 3) * 0.2; continue; }
        n.state = 'idle'; n.timer = 0.8 + (n.cycles % 4) * 0.25;
      } else if (n.state === 'hop') {
        // Same rule as a walk that ran out somewhere unsuitable — a hop is not a
        // licence to settle in front of a machine. This guard was only ever on
        // the walk arm, so a hero who happened to hop inside a station's radius
        // came to rest there and stayed; it went unnoticed because a wider
        // freeze-on-approach radius used to mark those heroes as attending and
        // the check that would have caught it skips them.
        if (!this.canLoiter(n.x)) { n.state = 'walk'; n.timer = 0.5 + (n.cycles % 3) * 0.2; continue; }
        n.state = 'idle'; n.timer = 0.7 + (n.cycles % 3) * 0.3;
      } else if (n.cycles % 4 === 0) {
        n.state = 'hop'; n.duration = 0.5; n.timer = n.duration;
      } else {
        n.state = 'walk';
        // Direction: carry on, unless they are near the edge of their range.
        //
        // The old rule steered them home the moment they were FIVE units off
        // their spot, which is a homing spring — every new walk pointed back, so
        // no matter how wide their patch was nobody could actually cross it.
        // Measured over 30s, most heroes covered 64-75 units of a 124-unit
        // range, i.e. less than a single cabinet pitch, which is why they read
        // as glued to one machine.
        //
        // Now the pull only kicks in past 65% of the range, and otherwise they
        // keep whatever heading they had (with the odd about-turn), so several
        // walks chain into a real journey down the concourse.
        const off = n.x - n.home;
        if (Math.abs(off) > roam * 0.65) n.facing = off > 0 ? -1 : 1;
        else if (n.cycles % 3 === 0) n.facing = -n.facing;
        n.timer = 1.6 + (n.cycles % 4) * 0.55;
      }
    }
  }

  draw(ctx) {
    const slot = this.save.slot;
    const act = actForSlot(slot);
    const cam = this.camX();
    ctx.fillStyle = '#14101c';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.scale(HUB_ZOOM, HUB_ZOOM);
    ctx.translate(0, -HUB_CAM_Y);
    // back wall + floor
    ctx.fillStyle = '#241c30';
    ctx.fillRect(0, HUB_WALL_Y0, HUB_VIEW_W, HUB_WALL_Y1 - HUB_WALL_Y0);
    drawFoodCourtFloor(ctx, HUB_FLOOR_PIN_Y, HUB_VIEW_W, cam);
    // Wall dressing, drawn straight onto the wall the block above just laid
    // down (hence base:false) and before the stations, so a cabinet stands in
    // front of its own poster.
    //
    // How lit any of it is falls out of which ceiling fixtures are working —
    // see ceilingFixtures, which hangs one over every gap in the cabinet bank
    // and lights it when the machine beside it has power. The dressing is only
    // worth drawing because of this: the detail is painted once and the lighting
    // decides how much of it you get, so the concourse you can actually SEE
    // grows as you restore it.
    //
    // Converted to screen space here and nowhere else. There is no parallax on
    // them any more: a fixture that slides against the machine it is lighting
    // cannot say anything about that machine, and the depth cue the parallax was
    // buying is already covered by drawCeilingLight's beam-lean, which rakes
    // harder the further off-centre a fixture sits.
    // Reach is tied to the fixture PITCH rather than left at wallLitFrom's
    // default. That default (BAY_W * 1.55, about 201) was chosen against
    // fixtures 130 apart, where the dimmest point between two of them fell to
    // 0.75 and the ceiling read as a row of overlapping pools. Hanging one over
    // every cabinet gap put them 88 apart, and at the same reach every point is
    // inside four or five pools at once — wallLitFrom takes the max, so the dip
    // between fixtures only reached 0.88 and the whole concourse flattened out
    // into one evenly bright wash. 1.5x the pitch restores the old modulation at
    // the new density.
    const fixtures = this.ceilingFixtures();
    const pitch = fixtures.length > 1 ? fixtures[1].x - fixtures[0].x : BAY_W;
    const litXs = fixtures.map((f) => ({ x: f.x - cam, k: f.k }));
    const wallLit = (sx) => wallLitFrom(sx, litXs, pitch * 1.5) * ROOM_LIT_PEAK;
    // The counters carry their own lamps — three over each deck, and by
    // drawCounter's own account the only warm light left at this end of the
    // concourse. Dolores and Gary stand directly under three working ones, so
    // lighting them off the CEILING alone had both clerks reading as though the
    // room were dark on them while their lamps burned overhead.
    //
    // Kept separate from wallLit rather than folded into it, because these are
    // TASK lights: they hang low and point down at the deck. They light the
    // people at the counter and not the wall behind it, and the tighter reach
    // is what stops a bench lamp from lighting half a bay.
    // ONE source per counter, not one per lamp. The three tubes sit 26px apart
    // and sampling them separately made the pool ripple: walking the deck, the
    // hero brightened and dimmed under each one in turn, which is a flicker
    // rather than lighting. A bank of three tubes a hand's width apart IS one
    // broad source, and the bank's centre is the station's own x — the lamp
    // fractions (0.28, 0.50, 0.72) are symmetric about it.
    const lampXs = [];
    for (const s of this.stations()) {
      if (s.type !== 'bench' && s.type !== 'shop') continue;
      lampXs.push(s.x - cam);
    }
    // Reach runs past the deck on both sides so there is somewhere lit to STAND
    // at a counter, not just a bright clerk behind one.
    const benchLit = (sx) => wallLitFrom(sx, lampXs, COUNTER_W * 1.3);
    // What a BODY at sx receives — and it swings over a NARROWER range than the
    // room does. Given the room's full 0..1 the hero visibly faded up and down
    // crossing the concourse, and the thing you are steering is the last thing
    // that should be hard to find. Floored, the cue still reads — a dead bay is
    // plainly darker than a lit one — without the player pulsing as they walk.
    const castLit = (sx) => CAST_LIT_FLOOR
      + (1 - CAST_LIT_FLOOR) * Math.max(wallLit(sx), benchLit(sx));
    // Room furniture first (the menu board), then ONE poster per cabinet.
    for (const bay of hubWallBays(this.stations())) {
      const bx = bay.x - cam;
      if (bx + BAY_W < 0 || bx > HUB_VIEW_W) continue;
      drawWallBay(ctx, bx, HUB_WALL_Y0, BAY_W, HUB_WALL_Y1 - HUB_WALL_Y0, bay.id, {
        t: this.t, seed: bay.x, lit: wallLit, base: false,
      });
    }
    // A poster hangs above the machine it advertises, centred on it — that is
    // the whole placement rule, and it is why there is exactly one. Tiled three
    // to a span of wall they read as wallpaper; hung one per cabinet they read
    // as belonging to something. The tilt alternates off the station's own x so
    // the row is not a set of perfectly level rectangles.
    // OVERTIME joins the rule after the finale, but gets bespoke art rather
    // than borrowing one of the nine campaign heroes.
    for (const s of this.stations()) {
      if (s.type !== 'cabinet' && s.type !== 'overtime') continue;
      const sx = s.x - cam;
      if (sx < -POSTER_W || sx > HUB_VIEW_W + POSTER_W) continue;
      const look = posterLook(s.x);
      drawPoster(ctx, sx, POSTER_TOP_Y, POSTER_W, POSTER_H, {
        pal: posterPalFor(s),
        tilt: look.tilt,
        torn: look.torn,
        lit: wallLit(sx),
      });
    }
    // The fixtures themselves, flickering because the place is falling apart.
    // The visible tube begins on the first visible world row. Its dark housing
    // extends upward and is cropped by the room edge, making the fixtures read
    // unmistakably as mounted at the very top rather than floating below it.
    // The glow's reach is stretched to match (down to y 170, was 140) so the
    // extra headroom reads as more of the back wall getting lit, not just a
    // taller light fixture.
    //
    // Culled to the view. There are around nineteen fixtures over the whole
    // concourse now where there used to be eight, but only about six are ever on
    // screen — so this draws FEWER of them per frame than the old fixed loop,
    // which painted all eight whether or not they were in shot.
    //
    // Flicker is deliberately applied to the fixture sprite and NOT to litXs
    // above. The tube stutters; the pool of light it casts holds steady. Wiring
    // the flicker through the falloff would strobe the whole room, every wall
    // dressing and every face in it, several times a minute.
    fixtures.forEach((f, i) => {
      const lx = Math.round(f.x - cam);
      if (lx < -LIGHT_W - 60 || lx > HUB_VIEW_W + 60) return;
      const flick = lightFlicker(this.t, i, this.save.settings.reducedFlashing);
      drawCeilingLight(ctx, lx, HUB_LIGHT_Y, f.k > 0 ? f.k * flick : 0);
    });
    // Light pooling: every lit machine throws its screen colour onto the tiles
    // in front of it. Drawn before the stations so each cabinet stands ON its
    // own pool. Nine lit cabinets over unlit floor was the single biggest
    // reason they read as pasted onto the scene rather than standing in it.
    for (const s of this.stations()) {
      if (s.type !== 'cabinet' || !s.unlocked) continue;
      const x = Math.round(s.x - cam);
      if (x < -80 || x > HUB_VIEW_W + 40) continue;
      const g = ctx.createLinearGradient(0, HUB_FLOOR_PIN_Y, 0, HUB_FLOOR_PIN_Y + 34);
      g.addColorStop(0, s.cab.sky[0]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = g;
      // Splayed: a pool of light is wider the further it falls from its source.
      ctx.beginPath();
      ctx.moveTo(x - CAB_W * 0.5, HUB_FLOOR_PIN_Y);
      ctx.lineTo(x + CAB_W * 0.5, HUB_FLOOR_PIN_Y);
      ctx.lineTo(x + CAB_W * 0.85, HUB_FLOOR_PIN_Y + 34);
      ctx.lineTo(x - CAB_W * 0.85, HUB_FLOOR_PIN_Y + 34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // stations
    for (const s of this.stations()) {
      const x = Math.round(s.x - cam);
      if (x < -80 || x > HUB_VIEW_W + 40) continue;
      if (s.type === 'cabinet') {
        const pal = palFor(s.cab, s.unlocked);
        drawCabinetShell(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, pal);
        // The attract screen carries its own scanlines; the bright bar rolling
        // down it runs on the hub's clock, so it is drawn here, over them.
        const scr = drawCabinetScreen(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, pal, undefined, pal.lit ? cabinetScreenArt(s.cab, this.t, pal.seed) : null);
        if (scr) {
          drawScreenSweep(ctx, scr, this.t, pal.seed);
        } else {
          // Locked: the machine is unplugged rather than absent, so every few
          // seconds its dead screen crackles and throws a spark.
          drawDeadScreen(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, this.t, pal.seed, this.save.settings.reducedFlashing);
        }
        // The corner badge used to be one gold star for `cleared` — every stage's
        // MISSION plug banked. That flag is doing two unrelated jobs: on six
        // cabinets it means "missions done", and on neon/rhythm/surge it is
        // exactly what opens the boss. Worse, once the boss was beaten the flag
        // stayed true, so "a boss is waiting" and "nothing left here" drew
        // identically. Three states, three marks:
        if (s.unlocked) {
          if (bossAvailable(slot, s.cab.id)) drawBossPip(ctx, x + CAB_W * 0.4, CAB_Y + CAB_H * 0.06, CAB_W * 0.06, this.t);
          else if (slot.campaign.bossesDown[s.cab.id]) drawClearedStar(ctx, x + CAB_W * 0.4, CAB_Y + CAB_H * 0.05, CAB_W * 0.115);
          // ...and the nine lights carry "how much is left", which is the
          // question the star was being asked to answer and could not.
          drawPlugLights(ctx, slot, s.cab.id, x, CAB_Y + CAB_H * 0.215, CAB_W);
        }
      } else if (s.type === 'socket') {
        // Not a door and not a cabinet: THE SOCKET is a hole in the wall, and
        // the whole joke is that it looks like one.
        ctx.fillStyle = '#f6d33c';
        ctx.fillRect(x - 22, 130, 44, 62);
        ctx.fillStyle = '#0b0b14';
        ctx.fillRect(x - 6, 146, 4, 8); ctx.fillRect(x + 2, 146, 4, 8);
      } else if (s.type === 'overtime') {
        // Nominally a cabinet, so it gets the cabinet: same machine, violet
        // chassis, and a screen showing nothing at all.
        drawCabinetShell(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, OVERTIME_PALETTE);
      } else if (s.type === 'bench' || s.type === 'shop') {
        // The two counters, each handed its own staff member as the `server` so
        // the counter can paint them at the right depth — behind its front, in
        // front of its back shelf. They are deliberately NOT drawn by the NPC
        // loop below, which runs after every station and would stand them on top
        // of the counters they are supposed to be behind.
        // Matched by the station they were hired to, not by proximity. Proximity
        // was wrong the moment there were two counters: at this pitch Dolores
        // sits within COUNTER_W of BOTH stations, so the pawn unit found her
        // too — drawing a second, unoccluded copy of her outside its own box and
        // never drawing Gary at all.
        const staff = this.npcs().find((n) => n.station === s.type);
        drawCounter(ctx, x - COUNTER_W / 2, CTR_Y, COUNTER_W, COUNTER_H, {
          t: this.t,
          variant: s.type === 'shop' ? 'pawn' : 'serving',
          server: staff ? (c) => drawToon(c, staff.id, {
            kind: 'idle', phase: (this.t * 0.5) % 1, time: this.t,
            grounded: true, facing: staff.facing || 1, vy: 0,
          }, Math.round(staff.x - cam), HUB_FLOOR_PIN_Y, staff.staffH || NPC_H,
          { lit: castLit(Math.round(staff.x - cam)) }) : null,
        });
      } else if (DOOR_PALETTES[s.type]) {
        const doorPal = s.type === 'shelf' && !s.unlocked
          ? DOOR_PALETTES.shelfLocked
          : DOOR_PALETTES[s.type];
        drawDoor(ctx, x - DOOR_W / 2, DOOR_Y, DOOR_W, DOOR_H, doorPal, this.t, this.save.settings.reducedFlashing);
      }
    }
    // NPC heroes
    for (const n of this.npcs()) {
      // Dolores already drew, inside her own counter (see the bench station
      // above). She is in this list so she can be walked up to and talked to;
      // drawing her here as well would paint a second copy of her standing in
      // front of the serving line.
      if (n.pinned) continue;
      const x = Math.round(n.x - cam);
      if (x < -20 || x > HUB_VIEW_W + 20) continue;
      // Hop height and contact shadow both ride NPC_H, so scaling the cast
      // doesn't leave them hopping a token amount over a pinprick of shade.
      const hop = n.state === 'hop' ? Math.sin(Math.PI * (1 - n.timer / n.duration)) * NPC_H * 0.26 : 0;
      ctx.fillStyle = 'rgba(4,3,9,0.28)';
      ctx.beginPath(); ctx.ellipse(x, HUB_FLOOR_PIN_Y, NPC_H * (n.state === 'hop' ? 0.26 : 0.37), NPC_H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      drawToon(ctx, n.id, {
        kind: n.state === 'walk' ? 'run' : n.state === 'hop' ? 'jump' : 'idle',
        phase: (this.t * 1.25 + n.cycles * 0.17) % 1,
        time: this.t + n.cycles * 0.41,
        grounded: n.state !== 'hop',
        vy: n.state === 'hop' ? -40 : 0,
        facing: n.facing || 1,
        // Lit by the bay they are standing in, same as the wall behind them.
        // Exempt, they stood at full daylight in front of a dead bay — the one
        // thing in the concourse the ceiling had no authority over.
      }, x, HUB_FLOOR_PIN_Y - hop, NPC_H, { lit: castLit(x) });
    }
    // THE DUST DEVIL comes through occasionally, cleaning something (which
    // surface varies). ~9s of every ~48, unannounced, then gone. Nobody
    // addresses this.
    const ddCyc = (this.t + 39) % 48; // first visit ~9s after entering
    if (ddCyc < 9) {
      const pass = dustDevilPass(Math.floor((this.t + 39) / 48), act);
      const p = ddCyc / 9;
      // Screen-relative crossing — whenever it visits, you see it — but with a
      // scrub laid over the traverse that's deep enough to briefly reverse, so
      // it works a square twice before moving on instead of gliding like a
      // cardboard cutout on a string.
      const travel = (HUB_VIEW_W + 60) * p + Math.sin(p * Math.PI * 7) * 16;
      const ddX = Math.round(pass.dir > 0 ? travel - 40 : HUB_VIEW_W + 20 - travel);
      // Brush head on a surface either way. Floor pass: the same line the cast
      // stands on. Ceiling pass: the line the light housings bolt to, which is
      // the only thing in the frame that says where the ceiling actually IS —
      // the top of the wall is a crop, not a plane, so hanging below it just
      // reads as floating again. The vertical flip puts the head at ddY and
      // leaves the handle dangling.
      const ddY = pass.onCeiling ? HUB_CEIL_Y - 4 : HUB_FLOOR_PIN_Y + pass.depth - DD_H;
      ctx.save();
      ctx.globalAlpha = Math.min(1, ddCyc * 1.5, (9 - ddCyc) * 1.5); // slips in, slips out
      if (!pass.onCeiling) {
        // Contact shadow in the cast's voice. Wider than the brush head on
        // purpose — the head is opaque and sits flat on its own shadow, so an
        // ellipse that only matched it would be a shadow nobody can see.
        ctx.fillStyle = 'rgba(4,3,9,0.28)';
        ctx.beginPath();
        ctx.ellipse(ddX + DD_W * 0.42, HUB_FLOOR_PIN_Y + pass.depth, DD_W * 0.55, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Mirrored about its own box so the cord always trails the direction of
      // travel; the ceiling pass adds the vertical flip that turns it over.
      if (pass.dir > 0 || pass.onCeiling) {
        ctx.translate(ddX + DD_W / 2, ddY + DD_H / 2);
        ctx.scale(pass.dir > 0 ? -1 : 1, pass.onCeiling ? -1 : 1);
        ctx.translate(-(ddX + DD_W / 2), -(ddY + DD_H / 2));
      }
      drawProp(ctx, 'dustdevil', ddX, ddY, DD_W, DD_H);
      ctx.restore();
    }
    // player walks
    const heroId = this.avatarId();
    const moving = Input.held('left') || Input.held('right') || this.walkTarget != null;
    const airborne = this.jumpY > 0;
    // Which one is you. Being 8 units taller than the crowd is not an answer to
    // that question — in a concourse with three heroes loitering by the same
    // door it is invisible. So the hero you are driving gets a marker over their
    // head and a heavier contact shadow under their feet, in the same gold the
    // walk-up prompt uses, so all the "this is about you" chrome reads as one
    // voice.
    const pxs = Math.round(this.px - cam);
    ctx.fillStyle = 'rgba(4,3,9,0.4)';
    ctx.beginPath(); ctx.ellipse(pxs, HUB_FLOOR_PIN_Y, PLAYER_H * 0.4, PLAYER_H * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    drawToon(ctx, heroId, {
      kind: airborne ? 'jump' : moving ? 'run' : 'idle',
      // Distance-driven, not wall-clock (see GAIT_DISTANCE_PER_CYCLE).
      //
      // Deliberately NOT the rig's reduced-amplitude `walk` cycle, though a
      // concourse stroll sounds like exactly what it is for. Measured at this
      // draw height, halving the stride roughly halves how much ground the feet
      // account for, and the hero reads as tiptoeing while being slid across
      // the room. With the cycle rate now answering the speed, a shorter stride
      // would merely spin the legs faster to compensate — so it is available if
      // the concourse ever wants a gentler gait, but the full stride is what
      // matches the trophy room, and that is the one to match.
      phase: this.gaitPhase,
      time: this.t,
      grounded: !airborne,
      vy: this.jumpVy,
      facing: this.facing || 1,
    }, pxs, HUB_FLOOR_PIN_Y - this.jumpY, PLAYER_H, { lit: castLit(pxs) });
    // Off the measured top of THIS hero's silhouette, not off PLAYER_H. The
    // height passed to drawToon sizes the body, so a fixed offset above it sits
    // in clear air over grumpos' helmet crest and pika's ears while hovering a
    // head-and-a-half above the ones who end at the nominal line. Measured, the
    // marker keeps the same sliver of air over every hero in the cast.
    const headY = HUB_FLOOR_PIN_Y - this.jumpY - toonInkTop(heroId) * PLAYER_H;
    drawPlayerMarker(ctx, pxs, headY - MARKER_GAP + Math.sin(this.t * 2.6) * 1.3, MARKER_R);
    ctx.restore();
    // The bottom of the screen used to carry four stacked lines every frame:
    // the contextual prompt, the location name, a PLUGS/COINS/ACT readout and a
    // controls legend. Only the first of those answers a question you are
    // actually asking while you walk around.
    //
    // The other three were saying things once and then repeating them forever:
    // you learn where you are on arrival, and the legend's verbs are already in
    // the prompt ("- PRESS ENTER" IS "ENTER"), so restating them generically
    // was the same sentence twice. Now the name and the legend introduce
    // themselves and get out of the way, and the resources sit quietly in the
    // corner where status belongs rather than in the message stack.
    //
    // Skipped entirely while a poster is open. Every row of it answers a
    // question about the room — what you are standing next to, where you are,
    // what you have — and you are not in the room, you are reading. Dimming was
    // not enough: gold on near-black still glimmers, and a ghost of "EXIT - TAP
    // TO LEAVE" directly above "TAP TO CLOSE" reads as two competing
    // instructions.
    if (this.poster) { this.drawPosterZoom(ctx); return; }
    // Focus first, so this row names whatever confirm is actually pointed at. It
    // used to test the station first, which meant standing nose to nose with a
    // hero in front of a cabinet read out the CABINET's name and verb while the
    // hero's actions were the thing on screen.
    if (this.focusNpc) {
      // Identity and verbs stay together in this one contextual cluster. The
      // same rectangles are used by update() for touch hit-testing.
      drawNpcPrompt(ctx, this.focusNpc, this.npcMenuIdx || 0, npcMenuFor(this.focusNpc),
        (this.focusNpc.x - cam) * HUB_ZOOM);
    } else if (this.near) {
      // A locked cabinet gets no verb. "PRESS ENTER" on a machine that will
      // refuse you is an instruction that does not work — the line's whole job
      // is to say what this thing is and whether you can act on it, so a locked
      // one states its price instead, in the muted colour rather than the gold
      // the hub uses for "you can do this right now".
      const lockedCabinet = this.near.type === 'cabinet' && !this.near.unlocked;
      const lockedTrophy = this.near.type === 'shelf' && !this.near.unlocked;
      if (lockedCabinet) {
        drawTextCentered(ctx, `${this.near.label} - LOCKED: ${UNLOCKS[this.near.cab.id]} PLUGS`,
          W / 2, H - 30, '#8a8a98');
      } else if (lockedTrophy) {
        drawTextCentered(ctx, 'TROPHY ROOM - LOCKED: CLEAR 1 LEVEL',
          W / 2, H - 30, '#8a8a98');
      } else {
        // isTouchDevice(), not usingTouch: the hub is the first screen a phone
        // lands on after the title, and until a finger had touched something it
        // was told to press ENTER.
        const touch = Input.isTouchDevice();
        const verb = this.near.type === 'exit' ? 'WALK THROUGH TO EXIT'
          : this.near.type === 'shelf' ? 'WALK THROUGH TO ENTER'
            : (touch ? 'TAP TO ENTER' : 'PRESS ENTER');
        drawTextCentered(ctx, `${this.near.label} - ${verb}`, W / 2, H - 30, '#f6d33c');
      }
    }
    // One status row along the very bottom: where you are on the left, what you
    // have on the right. The location name used to be a fading title card, but a
    // place label is not an announcement — it wants to just be there, quietly,
    // the way a sign on a wall is. Sitting it on the same baseline as the
    // resources turns three stacked lines into one row that reads left to right.
    // Set at 0.85 this row was ten CSS px on a phone — the coin count is a
    // number you check before deciding what to buy, not decoration. The whole
    // strip moves together at HINT_S so it stays one line.
    drawText(ctx, 'THE LAST FUNCTIONING FOOD COURT', 8, H - 11, '#3f8a80', HINT_S);
    const coins = `COINS ${formatCoins(slot.coins)}`;
    const plugs = `PLUGS ${totalPlugs(slot)}/${MAX_PLUGS}`;
    const coinsW = textWidth(coins, HINT_S);
    drawText(ctx, coins, W - 8 - coinsW, H - 11, '#f6d33c', HINT_S);
    drawText(ctx, plugs, W - 20 - coinsW - textWidth(plugs, HINT_S), H - 11, '#48e0c8', HINT_S);

    // The legend still introduces itself and leaves — it is the one thing here
    // that genuinely has nothing to say after you have read it once. It takes
    // the slot above the prompt now that the location name has moved out of it.
    const legendA = this.hasMoved ? fadeOut(this.movedAt, 0.35, 0.5) : fadeOut(this.t, 7, 1);
    if (legendA > 0) {
      ctx.save();
      ctx.globalAlpha = legendA;
      // The posters earn a clause here rather than a line of their own: there
      // is no room for one (below the floor line the legend, the prompt and
      // the status row already take all 58px, and anything above it lands on
      // the cast's feet), and this is the one piece of chrome whose job is to
      // name what is tappable and then get out of the way.
      drawTextCentered(ctx, Input.isTouchDevice()
        ? 'TAP TO WALK, TAP AGAIN TO ENTER, A POSTER TO READ'
        : 'LEFT/RIGHT WALK   SPACE JUMP   UP/DOWN PICK   ENTER CONFIRM', W / 2, H - 48, '#8a8a98', HINT_S);
      ctx.restore();
    }
    // The same speech card the stages use — portrait, name header, words —
    // rather than a "NAME: line" of centred text. Talking to a hero in the food
    // court is the same act as a hero talking mid-stage, so it gets the same
    // chrome; the null-speaker path handles the cabinet and shelf notes.
    if (this.talk) drawSpeech(ctx, this.talk, { light: true });
    this.drawChromeWalkButtons();
  }

  // The blown-up read. drawPoster is fully parametric — the plate, the star,
  // the badge and both lines of type all size off the sheet they are handed,
  // and the wordmark and tagline re-fit to the new measure — so this is the
  // same sheet drawn at 4x, not a 40px one magnified. The tagline that was a
  // ruled smudge on the wall is set type here.
  //
  // It grows out of its own place on the wall rather than fading up centred.
  // The tap meant "that one", and travelling from there is what makes the big
  // version read as the same object rather than as a card about it.
  drawPosterZoom(ctx) {
    const p = this.poster;
    const s = p.station;
    const k = Math.min(1, p.t / 0.22);
    const e = k * k * (3 - 2 * k);
    const lerp = (a, b) => a + (b - a) * e;
    // Where it hangs, in SCREEN space: the wall is painted inside the HUB_ZOOM
    // transform and this is not, so the poster's world position has to be run
    // through the same zoom and camera by hand.
    const srcCx = (s.x - this.camX()) * HUB_ZOOM;
    const srcCy = (POSTER_TOP_Y + POSTER_H / 2 - HUB_CAM_Y) * HUB_ZOOM;
    // As tall as the frame allows with the close hint clear underneath.
    const DST_H = 216, DST_W = DST_H * (POSTER_W / POSTER_H);
    ctx.save();
    ctx.globalAlpha = e;
    // Near-opaque. At 0.86 the concourse's own bottom row — the walk-up
    // prompt, the location name, the coin count — stayed legible through it
    // and competed with the sheet for the same glance, which is the one thing
    // a full-screen read cannot afford.
    ctx.fillStyle = 'rgba(6,4,12,0.95)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const pw = lerp(POSTER_W * HUB_ZOOM, DST_W), ph = lerp(POSTER_H * HUB_ZOOM, DST_H);
    // Straightens as it comes forward, and comes up to full light. On the wall
    // it is tilted and half in shadow because it is a thing in a room; held up
    // to read, it is just the sheet.
    drawPoster(ctx, lerp(srcCx, W / 2), lerp(srcCy, 8 + DST_H / 2) - ph / 2, pw, ph, {
      pal: posterPalFor(s), tilt: lerp(p.tilt, 0), torn: p.torn, lit: 1,
    });
    ctx.save();
    ctx.globalAlpha = e;
    drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP TO CLOSE' : 'CLICK OR ESC TO CLOSE',
      W / 2, H - 14, '#8a8a98', HINT_S);
    ctx.restore();
  }
}

// --------------------------------------------------------------------------
// TROPHY ROOM
//
// A room, not a report. Campaign progress is embodied as objects on the wall,
// while the floor is a tiny no-stakes practice space: swap heroes at the podium
// and hit the sprung target as often as desired. Nothing here changes campaign
// rewards or combat cooldowns.
// The room is unzoomed, so pin its floor to the Food Court's rendered floor
// line. This makes the shared doors and their skirting meet at the same height.
const TROPHY_FLOOR_Y = HUB_FLOOR_PIN_Y;
const TROPHY_WORLD_W = 1290;
const TROPHY_DOOR_W = DOOR_W * HUB_ZOOM;
const TROPHY_DOOR_H = DOOR_H * HUB_ZOOM;
const TROPHY_EXIT_X = TROPHY_DOOR_W / 2;
const TROPHY_BOARD_GAP = 30;
const TROPHY_RECORDS_X = 80;
const TROPHY_RECORDS_W = 300;
const TROPHY_LEVELS_X = TROPHY_RECORDS_X + TROPHY_RECORDS_W + TROPHY_BOARD_GAP;
const TROPHY_LEVEL_BOARD_W = 112;
const TROPHY_LEVEL_BOARD_GAP = 4;
const TROPHY_LEVELS_W = TROPHY_LEVEL_BOARD_W * 3 + TROPHY_LEVEL_BOARD_GAP * 2;
const TROPHY_LEVELS_CENTER = TROPHY_LEVELS_X + TROPHY_LEVELS_W / 2;
const TROPHY_BOSSES_W = 150;
const TROPHY_BOSSES_X = TROPHY_LEVELS_X + TROPHY_LEVELS_W
  + TROPHY_BOARD_GAP + TROPHY_BOSSES_W / 2;
const TROPHY_BOARD_TITLE_SCALE = 1.38;
const TROPHY_BOARD_TITLE_Y = 13;
// Keep the first exhibit's established position as the alignment reference.
const TROPHY_BOARD_Y = 27;
const TROPHY_PODIUM_X = 1060;
const TROPHY_DUMMY_X = 1180;
const TROPHY_ATTACK_RANGE = 112;
const TROPHY_MOVE_SPEED = 140;

function drawTrophyPanel(ctx, x, y, w, h, radius = 5, fill = '#100e16', border = null) {
  ctx.fillStyle = fill;
  platePath(ctx, x, y, w, h, radius);
  ctx.fill();
  if (!border) return;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  platePath(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(1, radius - 1));
  ctx.stroke();
}

const TROPHY_BOSSES = [
  { id: 'neon', label: 'COPTER', relic: 'copter' },
  { id: 'rhythm', label: 'DEEP CLEAN', relic: 'dustdevil' },
  { id: 'surge', label: 'FINAL STRIP', relic: 'powerstrip' },
];

export class TrophyRoomState {
  constructor({ save, flow }) {
    this.save = save;
    this.flow = flow;
  }

  heroId() {
    return (this.flow.heroId && this.flow.heroId()) || heroIdFor(this.flow);
  }

  enter() {
    Input.setContext('workshop');
    Input.setButtons([]);
    Input.setChromeButtons([]);
    this.t = 0;
    this.px = 90;
    this.facing = 1;
    this.walkTarget = null;
    this.walkHoldT = 0;
    this.moving = false;
    this.pending = null;
    this.player = new Player(this.heroId());
    this.player.grounded = true;
    this.attackT = 0;
    this.attackType = null;
    this.dummyHitT = 0;
    this.hits = 0;
    this.chain = 0;
    this.bestChain = 0;
    this.comboT = 0;
    this.heroFlashT = 0;
  }

  exit() {
    Input.setButtons([]);
    Input.setChromeButtons([]);
  }

  defeatedBosses() {
    return TROPHY_BOSSES.filter((b) => !!this.save.slot.campaign.bossesDown[b.id]);
  }

  statGroups() {
    const slot = this.save.slot;
    const clumsy = clumsiestHero(slot);
    const clumsyName = clumsy ? (HERO_BY_ID[clumsy[0]]?.short || clumsy[0]).toUpperCase() : 'NOBODY';
    const overtimeOpen = !!slot.campaign.storyFlags.sawEnding;
    const bestLevelScore = Math.max(0, ...Object.values(slot.campaign.bestScore || {}));
    return [
      {
        title: 'PLAY',
        rows: [
          ['RUNS', formatCoins(slot.stats.runs)],
          ['TIME PLAYED', formatPlaytime(slot.playtimeSec)],
          overtimeOpen
            ? ['OVERTIME RECORD', formatCoins(slot.overtime.best)]
            : ['BEST LEVEL SCORE', bestLevelScore ? formatCoins(bestLevelScore) : '—'],
        ],
      },
      {
        title: 'CAREER',
        rows: [
          ['LIVES LOST', formatCoins(slot.stats.deaths)],
          ['LIFETIME COINS', formatCoins(slot.stats.coinsEarned)],
          ['CLUMSIEST', clumsy ? `${clumsyName} x${clumsy[1]}` : clumsyName],
        ],
      },
      {
        title: 'COLLECTION',
        rows: [
          ['LEVELS CLEARED', `${Object.keys(slot.campaign.ranks).length}/${STAGES.length}`],
          ['PLUGS', `${totalPlugs(slot)}/${MAX_PLUGS}`],
          ['TOASTERS FOUND', formatCoins(slot.stats.appliancesFound)],
        ],
      },
    ];
  }

  levelRecords() {
    const campaign = this.save.slot.campaign;
    return CABINETS.map((cabinet) => ({
      cabinet,
      levels: stagesForCabinet(cabinet.id).map((stage) => ({
        stage,
        plugStates: campaign.plugs[stage.id] || [false, false, false],
        plugs: (campaign.plugs[stage.id] || []).filter(Boolean).length,
        rank: campaign.ranks[stage.id] || '-',
        score: campaign.bestScore[stage.id] || 0,
      })),
    }));
  }

  near(x, r = 34) { return Math.abs(this.px - x) <= r; }

  camX() {
    return Math.max(0, Math.min(TROPHY_WORLD_W - W, this.px - W * 0.42));
  }

  cycleHero(dir = 1) {
    const at = HEROES.findIndex((h) => h.id === this.player.heroId);
    const next = HEROES[(at + dir + HEROES.length) % HEROES.length];
    this.player.setHero(next.id);
    this.player.grounded = true;
    this.flow.setHero && this.flow.setHero(next.id);
    this.heroFlashT = 0.35;
    Audio.sfx('power');
  }

  queueInteraction(kind, target) {
    this.pending = kind;
    this.walkTarget = target;
  }

  usePending() {
    const kind = this.pending;
    this.pending = null;
    this.walkTarget = null;
    if (kind === 'podium' || kind === 'podiumNext') this.cycleHero(1);
    else if (kind === 'podiumPrev') this.cycleHero(-1);
    else if (kind === 'dummy') this.attackDummy();
  }

  attackDummy() {
    // Ability keys/buttons are attacks, never navigation. Tapping the physical
    // target has its own explicit walk-over path in update(); pressing Shift or
    // right-click somewhere else in the room must not pull the hero across the
    // gallery toward it.
    if (!this.near(TROPHY_DUMMY_X, TROPHY_ATTACK_RANGE)) return false;
    const type = this.player.hero.ability.type;
    this.attackType = type;
    this.attackT = 0.52;
    this.dummyHitT = 0.38;
    this.chain = this.comboT > 0 ? this.chain + 1 : 1;
    this.bestChain = Math.max(this.bestChain, this.chain);
    this.comboT = 2;
    this.hits++;
    this.facing = 1;
    this.player.powerType = type;
    this.player.powerPoseT = type === 'eat' ? 0.5 : 0.3;
    if (type === 'dash') this.player.dashT = 0.4;
    else if (type === 'roll') this.player.rollT = 0.65;
    else if (type === 'compress') this.player.compressT = 0.8;
    else if (type === 'fist') this.player.fistThrown = true;
    else if (type === 'axe') this.player.axeThrown = true;
    else if (type === 'stomp' && !this.player.grounded) {
      this.player.stomping = true;
      this.player.vy = Math.min(this.player.vy, -180);
    }
    Audio.sfx(type === 'shoot' ? 'shoot'
      : type === 'eat' ? 'chomp'
        : type === 'axe' ? 'axe'
          : type === 'fist' ? 'plop'
            : type === 'stomp' ? 'crunch' : 'dash');
    return true;
  }

  update(dt) {
    this.t += dt;
    this.attackT = Math.max(0, this.attackT - dt);
    this.dummyHitT = Math.max(0, this.dummyHitT - dt);
    const comboBefore = this.comboT;
    this.comboT = Math.max(0, this.comboT - dt);
    if (comboBefore > 0 && this.comboT === 0) this.chain = 0;
    this.heroFlashT = Math.max(0, this.heroFlashT - dt);
    if (this.attackT <= 0) {
      this.player.fistThrown = false;
      this.player.axeThrown = false;
      this.attackType = null;
    }

    if (Input.pressed('back')) { this.flow.toHub(); return; }

    // The room itself is the touch UI. Tapping an exhibit walks over and uses
    // it; tapping open floor just walks there.
    if (Input.pressed('pointer')) {
      const x = Input.pointer.x + this.camX(), y = Input.pointer.y;
      // The exit door and its sign are one explicit control surface. A tap on
      // either should leave immediately, just like the hub's station hit-test;
      // making it a walk target first made the sign feel inert, especially on
      // a long press or when the hero was still across the gallery.
      const onExit = x >= 0 && x <= TROPHY_DOOR_W + 6
        && y >= TROPHY_FLOOR_Y - TROPHY_DOOR_H - 6 && y <= TROPHY_FLOOR_Y + 6;
      if (onExit) { this.flow.toHub(); return; }
      if (x < TROPHY_DOOR_W + 6) { this.pending = null; this.walkTarget = TROPHY_EXIT_X; }
      else if (x >= TROPHY_PODIUM_X - 45 && x <= TROPHY_PODIUM_X + 45 && y > 142) {
        this.queueInteraction(x < TROPHY_PODIUM_X ? 'podiumPrev' : 'podiumNext', TROPHY_PODIUM_X + 48);
      }
      else if (x >= TROPHY_DUMMY_X - 35 && y > 112) this.queueInteraction('dummy', TROPHY_DUMMY_X - 68);
      else { this.pending = null; this.walkTarget = Math.max(68, Math.min(TROPHY_WORLD_W - 30, x)); }
    }

    if (Input.pressed('ability')) this.attackDummy();
    if (Input.pressed('jump')) this.player.jumpPressed(Audio);

    if (Input.pressed('confirm')) {
      if (this.near(TROPHY_PODIUM_X, 58)) this.cycleHero(1);
      else if (this.near(TROPHY_DUMMY_X, TROPHY_ATTACK_RANGE)) this.attackDummy();
    }

    const directionHeld = Input.held('left') || Input.held('right');
    const walkSpeed = heldWalkSpeed(TROPHY_MOVE_SPEED, this.walkHoldT);
    let move = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    if (move) { this.walkTarget = null; this.pending = null; }
    if (!move && this.walkTarget != null) {
      const d = this.walkTarget - this.px;
      if (Math.abs(d) <= 2.5) {
        this.px = this.walkTarget;
        if (this.pending) this.usePending();
        else this.walkTarget = null;
      } else move = Math.sign(d);
    }
    if (move) {
      this.facing = move;
      this.px = Math.max(22, Math.min(TROPHY_WORLD_W - 30, this.px + move * walkSpeed * dt));
      if (this.px <= TROPHY_EXIT_X) { this.flow.toHub(); return; }
    } else if (!this.attackT) this.facing = this.px < TROPHY_DUMMY_X ? 1 : -1;

    const steeringHeld = Input.held('pointer') && this.walkTarget != null;
    this.walkHoldT = directionHeld || steeringHeld
      ? Math.min(WALK_ACCEL_TIME, this.walkHoldT + dt)
      : 0;
    this.moving = !!move;
    this.player.update(dt, Input, { speed: move ? walkSpeed : 0 });
  }

  drawLevelRecords(ctx) {
    const records = this.levelRecords();
    for (let act = 0; act < 3; act++) {
      const x = TROPHY_LEVELS_X + act * (TROPHY_LEVEL_BOARD_W + TROPHY_LEVEL_BOARD_GAP);
      const y = TROPHY_BOARD_Y, w = TROPHY_LEVEL_BOARD_W, h = 156;
      const actTitle = `ACT ${act + 1} PROGRESS`;
      drawTextCentered(ctx, actTitle, x + w / 2, TROPHY_BOARD_TITLE_Y, '#f6d33c', TROPHY_BOARD_TITLE_SCALE, 'title');
      drawTrophyPanel(ctx, x, y, w, h, 5, '#100e16', '#73657c');
      records.slice(act * 3, act * 3 + 3).forEach((group, cabinetIndex) => {
        const blockY = y + 3 + cabinetIndex * 50;
        drawTrophyPanel(ctx, x + 4, blockY, w - 8, 14, 2.5, '#292432');
        const nameScale = Math.min(0.82, (w - 14) / Math.max(1, textWidth(group.cabinet.name, 1, 'bold')));
        drawText(ctx, group.cabinet.name, x + 7, blockY + 2, '#48e0c8', nameScale, 'bold');
        group.levels.forEach((record, levelIndex) => {
          const yy = blockY + 17 + levelIndex * 11;
          ctx.fillStyle = levelIndex % 2 ? 'rgba(255,255,255,0.014)' : 'rgba(72,224,200,0.025)';
          ctx.fillRect(x + 5, yy - 1, w - 10, 10);
          drawText(ctx, String(record.stage.index), x + 6, yy, '#e8e8f0', 0.9, 'bold');
          drawPlugRow(ctx, x + 15, yy - 1, record.plugStates, undefined, 8);
          const rank = record.rank === 'CONCERNING' ? 'CONC.' : record.rank;
          const rankScale = Math.min(0.82, 16 / Math.max(1, textWidth(rank, 1, 'bold')));
          drawTextCentered(ctx, rank, x + 52, yy, record.rank === '-' ? '#5a5363' : '#f6d33c', rankScale, 'bold');
          const best = record.score ? formatCoins(record.score) : '-';
          const bestScale = Math.min(0.9, 44 / Math.max(1, textWidth(best, 1, 'bold')));
          drawText(ctx, best, x + w - 6 - textWidth(best, bestScale, 'bold'), yy, '#e8e8f0', bestScale, 'bold');
        });
      });
    }
  }

  drawBossRelic(ctx, relic, x, y) {
    if (relic === 'dustdevil') {
      drawProp(ctx, 'dustdevil', x - 11, y - 4, 22, 38);
      return;
    }
    if (relic === 'copter') {
      drawProp(ctx, 'eggshell', x - 14, y + 5, 28, 24);
      ctx.strokeStyle = '#8a8a98'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 1); ctx.stroke();
      ctx.fillStyle = '#b8c8d8';
      ctx.fillRect(x - 19, y, 38, 2); ctx.fillRect(x - 1, y - 5, 2, 12);
      ctx.fillStyle = '#6b526f'; ctx.fillRect(x - 17, y + 26, 34, 5);
      return;
    }
    // The finale's trophy is the impossible power strip itself, not a second
    // Eggshell doll. Six sockets on a five-socket body preserves the joke even
    // at exhibit scale.
    ctx.fillStyle = '#d9d8e0'; ctx.fillRect(x - 20, y + 5, 40, 24);
    ctx.strokeStyle = '#5a5363'; ctx.lineWidth = 1; ctx.strokeRect(x - 20, y + 5, 40, 24);
    for (let i = 0; i < 6; i++) {
      const sx = x - 16 + i * 6.3;
      ctx.fillStyle = '#332d3e'; ctx.fillRect(sx, y + 11, 2, 5); ctx.fillRect(sx + 3, y + 11, 2, 5);
    }
    ctx.fillStyle = '#e04848'; ctx.fillRect(x + 12, y + 21, 5, 5);
    ctx.strokeStyle = '#332d3e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 20, y + 24); ctx.quadraticCurveTo(x - 31, y + 29, x - 25, y + 37); ctx.stroke();
  }

  drawBossCase(ctx) {
    const earned = this.defeatedBosses();
    const w = TROPHY_BOSSES_W, h = 94, x0 = TROPHY_BOSSES_X - w / 2, y0 = TROPHY_BOARD_Y;
    const title = 'MANAGEMENT ARCHIVE';
    drawTextCentered(ctx, title, TROPHY_BOSSES_X, TROPHY_BOARD_TITLE_Y, '#f6d33c', TROPHY_BOARD_TITLE_SCALE, 'title');
    drawTrophyPanel(ctx, x0, y0, w, h, 5, '#100e16', '#73657c');
    if (!earned.length) {
      // One closed archive instead of three mystery silhouettes. Before the
      // first boss, even the number and shapes of future trophies are spoilers.
      for (let y = y0 + 6; y < y0 + h - 9; y += 8) {
        ctx.fillStyle = y % 16 ? '#211b29' : '#292231'; ctx.fillRect(x0 + 6, y, w - 12, 5);
      }
      ctx.fillStyle = '#4a4454'; ctx.fillRect(TROPHY_BOSSES_X - 9, y0 + 31, 18, 18);
      drawTextCentered(ctx, 'ARCHIVE SEALED', TROPHY_BOSSES_X, y0 + 69, '#5a5363', 0.82, 'bold');
      return;
    }
    earned.forEach((b, i) => {
      const x = TROPHY_BOSSES_X + (i - (earned.length - 1) / 2) * 46;
      ctx.fillStyle = '#332b42';
      ctx.fillRect(x - 20, y0 + 6, 40, 76);
      ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 20, y0 + 6, 40, 76);
      this.drawBossRelic(ctx, b.relic, x, y0 + 15);
      ctx.fillStyle = '#6b5430';
      ctx.fillRect(x - 15, y0 + 54, 30, 6); ctx.fillRect(x - 18, y0 + 60, 36, 4);
      const labelScale = Math.min(0.64, 36 / Math.max(1, textWidth(b.label, 1, 'bold')));
      drawTextCentered(ctx, b.label, x, y0 + 69, '#c8b880', labelScale, 'bold');
    });
  }

  drawRecordsBoard(ctx) {
    const groups = this.statGroups();
    const x = TROPHY_RECORDS_X, y = TROPHY_BOARD_Y, w = TROPHY_RECORDS_W, h = 132, colW = w / 3;
    // Still a wall board rather than a screen-filling report, but large enough
    // that its nine entries survive a phone-sized landscape display. Three
    // semantic columns keep related values together. Labels sit upper-left and
    // values stagger beneath them at lower-right, so neither has to surrender
    // size to share one baseline and the whole board can be substantially
    // narrower.
    drawTextCentered(ctx, 'OVERALL STATUS', x + w / 2, TROPHY_BOARD_TITLE_Y, '#f6d33c', TROPHY_BOARD_TITLE_SCALE, 'title');
    drawTrophyPanel(ctx, x, y, w, h, 5, '#100e16', '#73657c');
    groups.forEach((group, column) => {
      const gx = x + column * colW;
      if (column) { ctx.fillStyle = '#332d3e'; ctx.fillRect(gx, y + 7, 1, h - 14); }
      const groupScale = Math.min(1.1, (colW - 14) / Math.max(1, textWidth(group.title, 1, 'bold')));
      drawText(ctx, group.title, gx + 7, y + 7, '#48e0c8', groupScale, 'bold');
      group.rows.forEach(([label, value], row) => {
        // The first stat tucks directly under its category; the larger stride
        // after that puts visible air between one value and the next label, so
        // the staggered pair always reads as a unit.
        const yy = y + 23 + row * 34;
        drawTrophyPanel(ctx, gx + 5, yy - 3, colW - 10, 27, 2,
          row % 2 ? 'rgba(255,255,255,0.014)' : 'rgba(72,224,200,0.025)');
        const shown = String(value);
        // Each line fits independently. Long labels and unusually large
        // lifetime totals therefore remain contained without shrinking the
        // other half of the stat with them.
        const labelScale = Math.min(1.02, (colW - 16) / Math.max(1, textWidth(label, 1, 'bold')));
        const valueScale = Math.min(1.28, (colW - 16) / Math.max(1, textWidth(shown, 1, 'bold')));
        drawText(ctx, label, gx + 8, yy, '#9b9baa', labelScale, 'bold');
        drawText(ctx, shown, gx + colW - 8 - textWidth(shown, valueScale, 'bold'), yy + 11, '#f1f1f6', valueScale, 'bold');
      });
    });
  }

  drawRoom(ctx, camera) {
    ctx.fillStyle = '#0d0a12'; ctx.fillRect(0, 0, TROPHY_WORLD_W, H);
    ctx.fillStyle = '#281f32'; ctx.fillRect(0, 0, TROPHY_WORLD_W, TROPHY_FLOOR_Y);
    // Reclaimed wall panels stop the museum from reading as one flat fill.
    for (let x = 0; x < TROPHY_WORLD_W; x += 48) {
      ctx.fillStyle = (x / 48) % 2 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.035)';
      ctx.fillRect(x, 0, 47, TROPHY_FLOOR_Y);
      ctx.fillStyle = '#17131e'; ctx.fillRect(x + 47, 0, 1, TROPHY_FLOOR_Y);
    }
    // This is still the same failing food-court building, so its gallery uses
    // the same housings, warm tubes, halos, soft-edged beams and independent
    // flicker as the concourse. y=0 is the Trophy Room equivalent of
    // HUB_LIGHT_Y after the Food Court's zoom/crop: the visible tube is flush
    // with the very top edge and its bracket is naturally clipped above it.
    const lights = [
      [TROPHY_RECORDS_X + TROPHY_RECORDS_W * 0.3, 0.72],
      [TROPHY_RECORDS_X + TROPHY_RECORDS_W * 0.7, 0.72],
      ...Array.from({ length: 3 }, (_, act) => [
        TROPHY_LEVELS_X + act * (TROPHY_LEVEL_BOARD_W + TROPHY_LEVEL_BOARD_GAP)
          + TROPHY_LEVEL_BOARD_W / 2,
        0.68,
      ]),
      [TROPHY_BOSSES_X, this.defeatedBosses().length ? 0.72 : 0.42],
      [TROPHY_PODIUM_X, 0.76],
      [TROPHY_DUMMY_X, 0.82],
    ];
    lights.forEach(([center, strength], i) => {
      const x = center - LIGHT_W / 2;
      const flick = lightFlicker(this.t, i + 11, this.save.settings.reducedFlashing);
      drawCeilingLight(ctx, x, 0, strength * flick, x - camera, W);
    });
    drawFoodCourtFloor(ctx, TROPHY_FLOOR_Y, TROPHY_WORLD_W);
    // Practice-lane mat, taped off and already scuffed from entirely voluntary
    // quality assurance.
    ctx.fillStyle = '#292432'; ctx.fillRect(TROPHY_PODIUM_X - 48, TROPHY_FLOOR_Y + 5, 208, 23);
    for (let x = TROPHY_PODIUM_X - 46; x < TROPHY_DUMMY_X + 70; x += 16) {
      ctx.fillStyle = (x / 16) % 2 ? '#c8a020' : '#3a3030';
      ctx.beginPath(); ctx.moveTo(x, TROPHY_FLOOR_Y + 5); ctx.lineTo(x + 8, TROPHY_FLOOR_Y + 5); ctx.lineTo(x + 16, TROPHY_FLOOR_Y + 10); ctx.lineTo(x + 8, TROPHY_FLOOR_Y + 10); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(200,200,216,0.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = TROPHY_PODIUM_X + 18 + i * 25;
      ctx.beginPath(); ctx.moveTo(x, TROPHY_FLOOR_Y + 14 + (i % 2) * 4); ctx.lineTo(x + 10, TROPHY_FLOOR_Y + 12); ctx.stroke();
    }
  }

  drawDummy(ctx) {
    const q = this.dummyHitT > 0 ? this.dummyHitT / 0.38 : 0;
    const wobble = q ? Math.sin((1 - q) * Math.PI * 5) * q * 0.18 : 0;
    ctx.save();
    ctx.translate(TROPHY_DUMMY_X, TROPHY_FLOOR_Y);
    ctx.rotate(wobble);
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-3, -55, 6, 51);
    ctx.fillStyle = '#4a3422'; ctx.fillRect(-17, -6, 34, 6);
    drawProp(ctx, 'target', -21, -80, 42, 42);
    ctx.restore();
    if (q) {
      ctx.save(); ctx.globalAlpha = Math.min(1, q * 2);
      ctx.fillStyle = '#f6d33c';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + this.hits;
        const r = 25 + (1 - q) * 18;
        ctx.fillRect(TROPHY_DUMMY_X + Math.cos(a) * r - 2, TROPHY_FLOOR_Y - 59 + Math.sin(a) * r - 2, 4, 4);
      }
      ctx.restore();
    }
  }

  drawAttackEffect(ctx) {
    if (!this.attackT || !this.attackType) return;
    const p = 1 - this.attackT / 0.52;
    const y = TROPHY_FLOOR_Y - 37;
    if (['shoot', 'fist', 'axe'].includes(this.attackType)) {
      const x = this.px + 18 + (TROPHY_DUMMY_X - this.px - 28) * Math.min(1, p * 2.1);
      if (this.attackType === 'shoot') drawProp(ctx, 'capStar', x - 4, y - 4, 8, 8);
      else if (this.attackType === 'fist') {
        ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p * 18);
        ctx.fillStyle = '#b8c8d8'; ctx.fillRect(-9, -3, 18, 6); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-2, -8, 4, 16); ctx.restore();
      }
    } else if (p < 0.55) {
      ctx.save(); ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = this.attackType === 'eat' ? '#f890b8' : '#48e0c8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(TROPHY_DUMMY_X - 17, y, 14 + p * 18, -1.2, 1.2); ctx.stroke(); ctx.restore();
    }
  }

  draw(ctx) {
    const camera = this.camX();
    ctx.save();
    ctx.translate(-camera, 0);
    this.drawRoom(ctx, camera);

    this.drawLevelRecords(ctx);
    this.drawBossCase(ctx);
    this.drawRecordsBoard(ctx);

    // Visually this is the same EXIT service door used in the Food Court, so
    // the route reads consistently in both rooms. Mechanically it remains a
    // room boundary rather than an interaction: walk into it (or tap it and
    // let tap-to-walk finish) and update() returns directly to the Food Court.
    drawDoor(ctx, 0, TROPHY_FLOOR_Y - TROPHY_DOOR_H,
      TROPHY_DOOR_W, TROPHY_DOOR_H, DOOR_PALETTES.exit, this.t, this.save.settings.reducedFlashing);

    // Hero swap podium: the selected hero is the object being displayed.
    ctx.fillStyle = '#342840'; ctx.fillRect(TROPHY_PODIUM_X - 31, TROPHY_FLOOR_Y - 8, 62, 8);
    ctx.fillStyle = '#f6d33c'; ctx.fillRect(TROPHY_PODIUM_X - 24, TROPHY_FLOOR_Y - 11, 48, 3);
    ctx.fillStyle = '#f6d33c';
    ctx.beginPath(); ctx.moveTo(TROPHY_PODIUM_X - 25, TROPHY_FLOOR_Y - 19); ctx.lineTo(TROPHY_PODIUM_X - 17, TROPHY_FLOOR_Y - 23); ctx.lineTo(TROPHY_PODIUM_X - 17, TROPHY_FLOOR_Y - 15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(TROPHY_PODIUM_X + 25, TROPHY_FLOOR_Y - 19); ctx.lineTo(TROPHY_PODIUM_X + 17, TROPHY_FLOOR_Y - 23); ctx.lineTo(TROPHY_PODIUM_X + 17, TROPHY_FLOOR_Y - 15); ctx.closePath(); ctx.fill();
    drawTextCentered(ctx, 'HERO PODIUM', TROPHY_PODIUM_X, TROPHY_FLOOR_Y + 9, '#c8b880', 0.65, 'bold');
    if (this.heroFlashT > 0) {
      ctx.save(); ctx.globalAlpha = this.heroFlashT / 0.35;
      ctx.fillStyle = '#f6d33c'; ctx.beginPath(); ctx.ellipse(this.px, TROPHY_FLOOR_Y - 24, 25, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    this.drawDummy(ctx);
    this.drawAttackEffect(ctx);
    const pose = poseFromPlayer(this.player, this.t);
    if (!this.moving && pose.kind === 'run') {
      pose.kind = 'idle';
      pose.headTurn = 0;
    }
    pose.facing = this.facing;
    drawToon(ctx, this.player.heroId, pose, Math.round(this.px), Math.round(TROPHY_FLOOR_Y - this.player.y), 58);
    drawPlayerMarker(ctx, this.px, TROPHY_FLOOR_Y - this.player.y - 69, MARKER_R);

    if (this.comboT > 0) drawTextCentered(ctx, `CHAIN x${this.chain}   BEST x${this.bestChain}`, TROPHY_DUMMY_X, 118, '#f6d33c', 0.82, 'bold');
    drawTextCentered(ctx, this.player.hero.short, TROPHY_PODIUM_X, 184, '#48e0c8', 0.78, 'bold');
    drawTextCentered(ctx, this.player.hero.ability.label, TROPHY_PODIUM_X, 194, '#8a8a98', 0.58, 'bold');
    const hint = this.near(TROPHY_EXIT_X, 54) ? 'WALK LEFT: FOOD COURT'
      : this.near(TROPHY_PODIUM_X, 58) ? (Input.isTouchDevice() ? 'TAP PODIUM SIDES: PREV / NEXT' : `${Input.confirmVerb()}: NEXT HERO`)
        : this.near(TROPHY_DUMMY_X, TROPHY_ATTACK_RANGE)
          ? (Input.isTouchDevice() ? 'TAP THE TARGET TO ATTACK' : 'X / SHIFT / RIGHT CLICK: ATTACK')
          : (Input.isTouchDevice() ? 'TAP TO WALK' : 'LEFT / RIGHT: WALK   SPACE: JUMP');
    ctx.restore();

    // Match the food court's persistent bottom status row: location on the
    // left, contextual controls on the right. This keeps the entire top band
    // available for the exhibit headings and larger board type.
    const roomTitle = 'TROPHY ROOM';
    const roomTitleScale = 1.1;
    drawText(ctx, roomTitle, 8, H - 11, '#f6d33c', roomTitleScale, 'bold');
    const titleW = textWidth(roomTitle, roomTitleScale, 'bold');
    const hintScale = Math.min(0.95, (W - 32 - titleW) / Math.max(1, textWidth(hint, 1, 'bold')));
    drawText(ctx, hint, W - 8 - textWidth(hint, hintScale, 'bold'), H - 11, '#c8c8d8', hintScale, 'bold');
    if (camera < TROPHY_WORLD_W - W - 8) {
      drawText(ctx, 'MORE  >', W - 54, H - 25, '#8a8a98', 0.55, 'bold');
    }
  }
}

// --------------------------------------------------------------------------
function listMenu(state, opts) {
  if (Input.pressed('down') || Input.pressed('right')) { state.idx = (state.idx + 1) % opts.length; Audio.sfx('ui'); }
  if (Input.pressed('up') || Input.pressed('left')) { state.idx = (state.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
  keepSelectionVisible(state, opts.length);
  if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); return opts[state.idx]; }
  // A scrollable touch list waits for finger-up before treating a gesture as a
  // tap. That leaves the same finger free to drag the window without buying or
  // equipping whichever row happened to be under the initial contact.
  if (state.visibleRows && Input.isTouchDevice()) return touchListMenu(state, opts);
  if (Input.pressed('pointer')) {
    const i = listIndexAt(state, opts.length, Input.pointer.y);
    if (i !== null) {
      if (state.idx === i) { Audio.sfx('uiConfirm'); return opts[i]; }
      state.idx = i; Audio.sfx('ui');
    }
  }
  return null;
}

function touchListMenu(state, opts) {
  const scrollCount = opts.length - (state.fixedLastRow ? 1 : 0);
  const visible = Math.min(scrollCount, state.visibleRows);
  const indexAtFinger = () => listIndexAt(state, opts.length, Input.pointer.y);

  if (Input.pressed('pointer')) {
    const pressedIndex = indexAtFinger();
    state.touchListGesture = pressedIndex !== null ? {
      y: Input.pointer.y,
      listStart: state.listStart || 0,
      moved: false,
      scrollable: pressedIndex < scrollCount,
    } : null;
  }

  const gesture = state.touchListGesture;
  if (!gesture) return null;
  const dy = gesture.y - Input.pointer.y;
  // Eight logical pixels is roughly a fingertip's allowance at the normal 2x
  // canvas scale: small hand jitter remains a tap, an intentional pull scrolls.
  if (gesture.scrollable && Math.abs(dy) >= 8) gesture.moved = true;
  if (gesture.moved) {
    const maxStart = Math.max(0, scrollCount - visible);
    state.listStart = Math.max(0, Math.min(maxStart,
      gesture.listStart + Math.round(dy / state.rowH)));
    // Keep a selection in the window so fitRows() cannot snap a hand-scrolled
    // list straight back to the old keyboard selection on the next draw.
    state.idx = Math.max(state.listStart, Math.min(state.idx, state.listStart + visible - 1));
  }

  if (!Input.released('pointer')) return null;
  state.touchListGesture = null;
  if (gesture.moved) return null;
  const i = indexAtFinger();
  if (i === null) return null;
  if (state.idx === i) { Audio.sfx('uiConfirm'); return opts[i]; }
  state.idx = i; Audio.sfx('ui');
  return null;
}

function listIndexAt(state, count, y) {
  const scrollCount = count - (state.fixedLastRow ? 1 : 0);
  const visible = Math.min(scrollCount, state.visibleRows || scrollCount);
  const localI = Math.floor((y - state.listY) / state.rowH);
  if (localI >= 0 && localI < visible) {
    const i = (state.listStart || 0) + localI;
    return i < scrollCount ? i : null;
  }
  if (state.fixedLastRow && localI === visible) return count - 1;
  return null;
}

// The cursor band behind the selected row, and the y its lettering sits on.
// listMenu hit-tests the whole pitch, so the band is drawn at exactly that
// pitch and the text is centred in it: what the finger finds, what the eye
// sees, and where the words are, all off the same two numbers.
function drawSelRow(ctx, state, i, x0) {
  drawMenuRow(ctx, x0 - 12, state.listY + listVisualRow(state, i) * state.rowH + 1, W - (x0 - 12) * 2, state.rowH - 2);
}
// `dy`/`s2` describe the second line for the rows that stack one — a stage
// carries its mission blurb under its name — so the pair centres as a block
// rather than the label centring and the blurb hanging off the bottom. Rows
// reserve that drop whether or not they draw into it, or the label on a plain
// BACK row would sit lower than the labels either side of it.
function rowTextY(state, i, s1 = 1, dy = 0, s2 = s1) {
  const mid = state.listY + listVisualRow(state, i) * state.rowH + state.rowH / 2;
  return mid - (TEXT_INK_TOP * s1 + dy + (TEXT_INK_TOP + TEXT_INK_H) * s2) / 2;
}
function listVisualRow(state, i) {
  if (state.fixedLastRow && i === state.listCount - 1) {
    return Math.min(state.listCount - 1, state.visibleRows);
  }
  return i - (state.listStart || 0);
}

// Every hub sub-menu is listMenu-driven: arrow keys or a tap-to-select,
// tap-again-to-confirm, spelled out at the bottom of the screen.
//
// isTouchDevice(), not usingTouch: usingTouch only turns true once a finger has
// landed, so a phone arriving at one of these screens cold was told to press
// keys it does not have. Every list carries a BACK row, so the footer only
// needs to explain selection and purchase; the visible row is the way back.
function drawMenuHint(ctx, extra, x0 = 12) {
  if (Input.isTouchDevice()) {
    drawText(ctx, `TAP SELECT   TAP AGAIN ${extra || 'CONFIRM'}`, x0, H - 13, '#5a5a68', HINT_S);
    return;
  }
  const pairs = [['UP/DOWN', 'SELECT'], ['ENTER', extra || 'CONFIRM']];
  drawKeyLegend(ctx, pairs, x0, H - 13, { scale: HINT_S });
}

// Hub lists size their rows the way stage select does: the list grows into
// whatever the header leaves it instead of sitting at a fixed 18-unit pitch —
// which on a phone was a 26 CSS px row, under every platform's 44pt touch
// minimum, with the bottom half of the screen left black under it.
const MENU_LIST_BOTTOM = 232, MENU_ROW_MIN = 20, MENU_ROW_MAX = 34;
const MENU_ROW_S = 1.3;    // row labels
const MENU_NOTE_S = 1.1;   // the selected row's one-line gloss
function fitRows(state, count) {
  state.listCount = count;
  const fixed = state.fixedLastRow ? 1 : 0;
  const shown = Math.min(count - fixed, state.visibleRows || count) + fixed;
  state.rowH = Math.max(MENU_ROW_MIN, Math.min(MENU_ROW_MAX, ((state.listBottom || MENU_LIST_BOTTOM) - state.listY) / shown));
  keepSelectionVisible(state, count);
}
function keepSelectionVisible(state, count) {
  if (!state.visibleRows) { state.listStart = 0; return; }
  const scrollCount = count - (state.fixedLastRow ? 1 : 0);
  const maxStart = Math.max(0, scrollCount - state.visibleRows);
  state.listStart = Math.max(0, Math.min(state.listStart || 0, maxStart));
  if (state.fixedLastRow && state.idx === count - 1) return;
  if (state.idx < state.listStart) state.listStart = state.idx;
  else if (state.idx >= state.listStart + state.visibleRows) state.listStart = state.idx - state.visibleRows + 1;
}
function drawListScrollbar(ctx, state, count) {
  const scrollCount = count - (state.fixedLastRow ? 1 : 0);
  if (!state.visibleRows || scrollCount <= state.visibleRows) return;
  const trackY = state.listY + 2;
  const trackH = state.rowH * state.visibleRows - 4;
  const thumbH = Math.max(12, trackH * state.visibleRows / scrollCount);
  const maxStart = scrollCount - state.visibleRows;
  const thumbY = trackY + (trackH - thumbH) * (state.listStart || 0) / maxStart;
  ctx.fillStyle = '#281d2d'; ctx.fillRect(W - 12, trackY, 3, trackH);
  ctx.fillStyle = '#8a7a94'; ctx.fillRect(W - 12, thumbY, 3, thumbH);
}
// The status strip along the bottom of every hub menu. Nudged up from scale 1
// because on a phone the canvas is barely 2x its 480x270 design size, and a
// 8px em there lands under 10 CSS px — legible on a monitor, guesswork in a
// hand. Everything on that strip moves together so the row stays one line.
const HINT_S = 1.1;

// Mission blurbs used to be cut at a fixed character count, which clipped the
// longer ones mid-word even when they had room left. Measure instead, and only
// trim when the string genuinely overflows.
function fitText(str, maxWidth, scale = 1, style = 'ui') {
  const s = String(str);
  if (textWidth(s, scale, style) <= maxWidth) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + '...', scale, style) > maxWidth) out = out.slice(0, -1);
  return out.replace(/[\s.,]+$/, '') + '...';
}

// Stage select type sizes. This screen is the one a player reads standing up
// with a phone at arm's length, and it had the room to spare: three stages and
// a BACK row used barely half the panel, so the list was small AND surrounded
// by emptiness. Row labels and the rank letter ride the same scale so a row
// reads as one line of text with a letter parked at the end of it.
const ROW_S = 1.4, DESC_S = 1.1, PIP = 13;
// Rows grow to fill whatever the option count leaves free rather than sitting
// at a fixed pitch: three stages plus BACK get a generous 48 — which on a phone
// is a tap target around a centimetre tall, since listMenu hit-tests the whole
// pitch and not just the glyphs — and the fully loaded six-row case (boss and
// corrupted mode both unlocked) tightens to 30 rather than running off the
// bottom of the panel.
const LIST_TOP = 74, LIST_BOTTOM = 250, ROW_MIN = 28, ROW_MAX = 48;

export class StageSelectState {
  constructor({ save, cab, flow }) { this.save = save; this.cab = cab; this.flow = flow; this.listY = LIST_TOP; this.rowH = ROW_MAX; }
  enter() {
    this.corrupt = null;
    const opts = this.options();
    this.rowH = Math.max(ROW_MIN, Math.min(ROW_MAX, (LIST_BOTTOM - LIST_TOP) / opts.length));
    // Open on the frontier — the last stage that is actually playable — rather
    // than always on stage 1. Coming back from a clear, the thing you just
    // unlocked is the thing you came here for; replaying an earlier stage for
    // its remaining plugs is one press away either direction.
    let frontier = 0;
    opts.forEach((o, i) => { if (o.kind === 'stage' && stageUnlocked(this.save.slot, o.stage)) frontier = i; });
    this.idx = frontier;
    Input.setMenuButtons();
  }
  options() {
    const slot = this.save.slot;
    const opts = stagesForCabinet(this.cab.id).map((s) => ({ kind: 'stage', stage: s }));
    if (bossAvailable(slot, this.cab.id)) opts.push({ kind: 'boss' });
    if (slot.campaign.cleared[this.cab.id]) opts.push({ kind: 'corrupt' });
    opts.push({ kind: 'back' });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      // A locked stage stays selectable so you can read what is behind it and
      // what opens it — it just refuses to start.
      if (sel.kind === 'stage' && !stageUnlocked(this.save.slot, sel.stage)) Audio.sfx('uiBad');
      else if (sel.kind === 'stage') this.flow.pickTeam(this.cab, sel.stage, this.corrupt ? [this.corrupt] : []);
      else if (sel.kind === 'boss') this.flow.pickTeam(this.cab, null, [], true);
      else if (sel.kind === 'corrupt') {
        const cur = CORRUPTED_MODIFIERS.findIndex((m) => m.id === this.corrupt);
        this.corrupt = cur + 1 >= CORRUPTED_MODIFIERS.length ? null : CORRUPTED_MODIFIERS[cur + 1].id;
        if (cur === -1) this.corrupt = CORRUPTED_MODIFIERS[0].id;
      } else this.flow.toHub();
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, this.cab.name, W / 2, 20, '#f6d33c', 2, 'title');
    drawTextCentered(ctx, `${this.cab.genre} CABINET - STYLE: ${this.cab.style.toUpperCase()}`, W / 2, 44, '#8a8a98', DESC_S);
    const slot = this.save.slot;
    // Plugs are one-time per stage, so a running count tells you what is still
    // out there — a cleared cabinet reads 9/9 and never moves again.
    const cabStages = stagesForCabinet(this.cab.id);
    const cabGot = cabStages.reduce((n, s) => n + (slot.campaign.plugs[s.id] || []).filter(Boolean).length, 0);
    const cabMax = cabStages.length * 3;
    // Column headers sit above the list so the plug pips and the rank letter
    // read as labelled columns rather than loose glyphs at the end of a row.
    const plugX = W - 130, rankX = plugX + PLUG_ROW_W(PIP) + 4;
    // The rank letter is one glyph under a four-glyph header, so both hang off a
    // shared column centre rather than a shared left edge.
    const rankCx = rankX + textWidth('RANK') / 2;
    drawTextCentered(ctx, 'PLUGS', plugX + PLUG_ROW_W(PIP) / 2, this.listY - 13, '#5a5a68');
    drawTextCentered(ctx, 'RANK', rankCx, this.listY - 13, '#5a5a68');
    // Second line of a row: the mission blurb, or what it takes to open a
    // locked one. Sits clear of the pips, which ride the label line above it.
    const DESC_DY = 9 * ROW_S + 3;
    const descY = (y) => y + DESC_DY;
    this.options().forEach((o, i) => {
      const sel = i === this.idx;
      if (sel) drawSelRow(ctx, this, i, 40);
      const y = rowTextY(this, i, ROW_S, DESC_DY, DESC_S);
      const c = sel ? '#f6d33c' : '#c8c8d8';
      if (o.kind === 'stage') {
        const plugs = slot.campaign.plugs[o.stage.id] || [];
        const rank = slot.campaign.ranks[o.stage.id];
        const open = stageUnlocked(slot, o.stage);
        // A locked row keeps its name and its empty pips — it is a place you
        // are going, not a hole in the list — but drops to a colour that reads
        // as unavailable even while the cursor is sitting on it.
        drawText(ctx, `${sel ? '> ' : '  '}${o.stage.id.toUpperCase()}  ${o.stage.mission.type.toUpperCase()}`,
          40, y, open ? c : sel ? '#8a7a52' : '#54545e', ROW_S);
        // The pip row already says how many plugs you have, so the n/3 counter
        // that used to sit here was the same fact twice.
        drawPlugRow(ctx, plugX, y - 0.5, plugs, undefined, PIP);
        if (rank) drawTextCentered(ctx, rank, rankCx, y, '#48e0c8', ROW_S);
        // Naming the stage that opens it, rather than a bare LOCKED, means the
        // gate never sends anyone hunting for which of the nine cabinets it
        // meant — the answer is always the row directly above.
        const desc = open ? o.stage.mission.desc : `LOCKED - EARN A PLUG IN ${prevStage(o.stage).id.toUpperCase()}`;
        drawText(ctx, fitText(desc, W - 60, DESC_S), 52, descY(y), open ? '#5a5a68' : '#6a5a3a', DESC_S);
      } else if (o.kind === 'boss') {
        drawText(ctx, `${sel ? '> ' : '  '}BOSS: ${this.cab.id === 'neon' ? 'THE UNDERINSURED CLOWN-COPTER' : this.cab.id === 'rhythm' ? 'DUST DEVIL 9000' : 'THE FINAL POWER STRIP'}`, 40, y, sel ? '#e04848' : '#c05050', ROW_S);
      } else if (o.kind === 'corrupt') {
        const m = CORRUPTED_MODIFIERS.find((mm) => mm.id === this.corrupt);
        drawText(ctx, `${sel ? '> ' : '  '}CORRUPTED MODE: ${m ? m.name : 'OFF'}`, 40, y, sel ? '#8858c8' : '#6a5a8a', ROW_S);
        if (m) drawText(ctx, fitText(m.desc + ' (ONE-HIT RULES)', W - 60, DESC_S), 52, descY(y), '#5a5a68', DESC_S);
      } else {
        // BACK is the last row and carries no blurb, so it centres its single
        // line in the box instead of reserving the two-line drop the stacked
        // rows above it use — otherwise the label rides the top of its
        // highlight with a blank half-row hanging beneath it.
        const backY = rowTextY(this, i, ROW_S);
        drawText(ctx, `${sel ? '> ' : '  '}BACK`, 40, backY, c, ROW_S);
      }
    });
    // The tally is reference, not a headline: it rides the bottom status row
    // opposite the controls hint instead of crowding the title block.
    const tally = `PLUGS HERE: ${cabGot}/${cabMax}   TOTAL: ${totalPlugs(slot)}/${MAX_PLUGS}`;
    drawText(ctx, tally, W - 12 - textWidth(tally, HINT_S), H - 13, cabGot >= cabMax ? '#f6d33c' : '#48e0c8', HINT_S);
    drawMenuHint(ctx, 'PLAY');
  }
}


export class BenchState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 82; this.listBottom = 202; this.rowH = MENU_ROW_MAX; this.notice = ''; this.soldOutKey = ''; this.soldOutNotice = ''; this.t = 0; this.annoyedT = 0; this.madStyle = 0; this.enterT = 0; }
  enter() { this.idx = 0; this.t = 0; this.annoyedT = 0; this.enterT = 0; fitRows(this, this.options().length); Input.setMenuButtons(); }
  options() {
    const slot = this.save.slot;
    const purchaseCount = BENCH_UPGRADES.reduce((total, u) => {
      const baseLevel = u.base;
      return total + Math.max(0, (slot.bench[u.id] || 0) - baseLevel);
    }, 0);
    const surcharge = BENCH_FOOD_COURT_SURCHARGES[Math.min(purchaseCount, BENCH_FOOD_COURT_SURCHARGES.length - 1)];
    const opts = BENCH_UPGRADES.map((u) => {
      const cur = slot.bench[u.id] || 0;
      // Power-up tracks start at level 1 (owned); relay tracks start at 0.
      const baseLevel = u.base;
      const lvl = Math.max(cur, baseLevel);
      const nextIdx = lvl - baseLevel;
      // Shield, Magnet, and Score Star begin at level 1, so their first
      // purchase must use the level-1 price rather than the display-only 0.
      const cost = u.levels[baseLevel ? lvl : nextIdx];
      const maxed = lvl >= u.max + baseLevel - (baseLevel ? 0 : 0) && nextIdx >= u.levels.length || cost === undefined;
      const taxedCost = cost === undefined ? cost : Math.round(cost * (1 + surcharge.rate));
      return { u, lvl, targetTier: lvl + 1, baseCost: cost, cost: taxedCost, surcharge, maxed, baseLevel };
    });
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    this.t += dt;
    this.enterT += dt;
    if (this.annoyedT > 0) this.annoyedT = Math.max(0, this.annoyedT - dt);
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back) return this.flow.toHub();
      const slot = this.save.slot;
      if (!sel.maxed && sel.cost !== undefined && slot.coins >= sel.cost) {
        slot.coins -= sel.cost;
        slot.bench[sel.u.id] = sel.lvl + 1;
        this.save.persist();
        Audio.sfx('cash');
        this.notice = benchGag(BENCH_SUCCESS_GAGS, { TIER: sel.targetTier });
        this.notice += ` THAT'LL BE ${sel.cost} COINS, INCLUDING THE ${(sel.surcharge.rate * 100).toFixed(2)}% ${sel.surcharge.name}.`;
      } else {
        Audio.sfx('uiBad');
        if (sel.maxed) {
          this.notice = benchGag(BENCH_SOLD_OUT_GAGS, { TIER: sel.targetTier, CURRENT: sel.lvl });
          // She gets mad AND snaps her hands to her hips for a beat when you jab
          // a SOLD OUT tier — roll one of three faces so the same jab twice
          // doesn't repeat. BENCH_REACT_DUR is shared with the hips reaction.
          this.annoyedT = BENCH_REACT_DUR;
          this.madStyle = Math.floor(Math.random() * 3);
        }
        else if (slot.coins < sel.baseCost) {
          this.notice = benchGag(BENCH_AFFORDABILITY_GAGS, { TIER: sel.targetTier });
        } else {
          this.notice = `THE ${(sel.surcharge.rate * 100).toFixed(2)}% ${sel.surcharge.name} STILL APPLIES.`;
        }
      }
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    // Dolores works the counter in person. Standing her on the right — an idle
    // attendant facing the menu — turns a bare upgrade list into a SERVED
    // counter, and is why the whole list is pulled into the left column: the
    // right third of the screen is her floor, not a place to put a price.
    const doleCx = 410, doleFeet = 234, doleH = 138;
    // She walks on from fully off-screen right when the counter opens, striding
    // the whole way to her spot before settling into idle. Starts past the right
    // edge (unseen until she enters) and eases to a stop rather than stopping
    // dead; while travelling she runs (legs cycling) and faces left, the way
    // she's heading, then turns to attend the menu.
    const ENTER_DUR = 3.0;
    const ent = Math.min(1, this.enterT / ENTER_DUR);
    const eased = 1 - Math.pow(1 - ent, 1.7); // steady amble that eases to a stop
    const startX = W + 120; // fully clear of the right edge, and far enough for a slow stroll to read
    const doleX = Math.round(startX + (doleCx - startX) * eased);
    const walking = ent < 1;
    // Hands-on-hips comes from two places, whichever is stronger:
    // 1) a periodic idle beat every ~17s, and
    // 2) a reaction — she snaps them to her hips when you jab a SOLD OUT tier,
    //    held through the glare, then lowered.
    const HIPS_CYCLE = 17.0, HIPS_RISE = 0.6, HIPS_HOLD = 3.0, HIPS_FALL = 0.7;
    const hp = (this.t + 12.0) % HIPS_CYCLE;
    let periodicHips = hp < HIPS_RISE ? hp / HIPS_RISE
      : hp < HIPS_RISE + HIPS_HOLD ? 1
      : hp < HIPS_RISE + HIPS_HOLD + HIPS_FALL ? 1 - (hp - HIPS_RISE - HIPS_HOLD) / HIPS_FALL
      : 0;
    periodicHips = periodicHips * periodicHips * (3 - 2 * periodicHips);
    let reactHips = 0;
    if (this.annoyedT > 0) {
      const e = BENCH_REACT_DUR - this.annoyedT; // 0 at the jab, rising as it fades
      reactHips = e < 0.2 ? e / 0.2 : this.annoyedT < 0.3 ? this.annoyedT / 0.3 : 1;
      reactHips = reactHips * reactHips * (3 - 2 * reactHips);
    }
    const hipsAmt = Math.max(periodicHips, reactHips);
    const pose = walking
      ? { kind: 'run', phase: (this.t * 0.85) % 1, time: this.t, grounded: true, facing: -1, vy: 0 }
      // `annoyed` is the 0..1 reaction ramp, not a flag, so the mad brows can
      // fade in and out with it instead of snapping on.
      : { kind: 'idle', phase: (this.t * 0.5) % 1, time: this.t, grounded: true, facing: -1, vy: 0, armsInFront: true, hipsAmt, annoyed: reactHips, madStyle: this.madStyle };
    ctx.fillStyle = 'rgba(4,3,9,0.32)';
    ctx.beginPath();
    ctx.ellipse(doleX, doleFeet + 1, doleH * (walking ? 0.16 : 0.2), doleH * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    drawToon(ctx, 'dolores', pose, doleX, doleFeet, doleH);
    // The overhead sign still spans the whole station; the list, its glosses and
    // the price column all sit in the left column, clear of Dolores.
    drawTextCentered(ctx, "DOLORES' REPAIR COUNTER", W / 2, 8, '#f6d33c', 2, 'title');
    const menuCx = 180, labelX = 40, rightX = 322, boxL = 26, boxR = 336, glossMaxW = 320;
    const coinsText = `COINS: ${formatCoins(this.save.slot.coins)}`;
    drawTextCentered(ctx, coinsText, doleCx, H - 13, '#f6d33c'); // centred under Dolores
    const opts = this.options();
    fitRows(this, opts.length);
    opts.forEach((o, i) => {
      const sel = i === this.idx;
      if (sel) drawMenuRow(ctx, boxL, this.listY + listVisualRow(this, i) * this.rowH + 1, boxR - boxL, this.rowH - 2);
      const y = rowTextY(this, i, MENU_ROW_S);
      if (o.back) { drawText(ctx, `${sel ? '> ' : '  '}BACK`, labelX, y, sel ? '#f6d33c' : '#c8c8d8', MENU_ROW_S); return; }
      const c = sel ? '#f6d33c' : '#c8c8d8';
      drawText(ctx, `${sel ? '> ' : '  '}${o.u.name} (TIER ${o.targetTier})`, labelX, y, c, MENU_ROW_S);
      const current = o.u.currentDesc && o.u.currentDesc[o.lvl - o.baseLevel];
      const next = !o.maxed && o.u.desc[o.lvl - o.baseLevel];
      // Right column is right-aligned to an anchor pulled well in from the edge
      // so it clears Dolores; short numbers hug the same line as the SOLD OUT tag.
      if (o.maxed || o.cost === undefined) {
        const soldOut = 'SOLD OUT';
        drawText(ctx, soldOut, rightX - textWidth(soldOut, MENU_ROW_S), y, '#e04848', MENU_ROW_S);
      }
      else {
        const price = `${formatCoins(o.baseCost)}`;
        drawText(ctx, price, rightX - textWidth(price, MENU_ROW_S), y, this.save.slot.coins >= o.cost ? '#f6d33c' : '#5a5a68', MENU_ROW_S);
      }
      if (sel) {
        // The gloss sits just under the list, centred on the left column so it
        // stays clear of Dolores. A maxed row's NOTICE can run long, so it wraps
        // instead of sliding under her feet.
        if (current) drawTextCentered(ctx, `CURRENT: ${o.u.name} TIER ${o.lvl} (ACTIVE)`, menuCx, H - 58, '#8a8a98', MENU_NOTE_S);
        if (next) drawTextCentered(ctx, `NEXT: ${next}`, menuCx, H - 44, '#c8c8d8', MENU_NOTE_S);
        if (o.maxed) {
          const soldOutKey = `${o.u.id}:${o.lvl}`;
          if (this.soldOutKey !== soldOutKey) {
            this.soldOutKey = soldOutKey;
            this.soldOutNotice = benchGag(BENCH_SOLD_OUT_NOTICES, { TIER: o.targetTier });
          }
          wrapText(`NOTICE: ${this.soldOutNotice}`, glossMaxW, MENU_NOTE_S, 2)
            .forEach((line, k) => drawTextCentered(ctx, line, menuCx, H - 44 + k * 14, '#c8c8d8', MENU_NOTE_S));
        }
      }
    });
    if (this.notice) {
      const faceW = 14, faceH = 14, gap = 5, pad = 6, lineH = 13;
      const textMaxW = 300;
      const noticeLines = wrapText(this.notice, textMaxW, MENU_NOTE_S, 3);
      const noticeTextW = Math.max(...noticeLines.map((line) => textWidth(line, MENU_NOTE_S)));
      const noticeW = Math.min(W - 48, pad * 2 + faceW + gap + noticeTextW);
      const noticeX = Math.round((W - noticeW) / 2);
      // Height tracks the wrapped line count instead of a fixed two-line box, so
      // a one-line receipt sits in a snug plate and a three-line surcharge spiel
      // gets the room it needs — the plate is always the size of what it holds.
      const noticeH = Math.max(faceH + pad * 2, noticeLines.length * lineH + pad * 2);
      const noticeY = 28;
      drawPanel(ctx, noticeX, noticeY, noticeW, noticeH, 4, undefined, { border: 'rgba(246,211,60,0.35)', shadow: true });
      const face = toonFaceSprite('dolores', faceW, faceH);
      if (face) ctx.drawImage(face, noticeX + pad, noticeY + Math.round((noticeH - faceH) / 2), faceW, faceH);
      const textTop = noticeY + Math.round((noticeH - noticeLines.length * lineH) / 2) + 2;
      noticeLines.forEach((line, lineIndex) => {
        drawText(ctx, line, noticeX + pad + faceW + gap, textTop + lineIndex * lineH, '#f6d33c', MENU_NOTE_S);
      });
    }
    // The control legend lines up under the menu labels (x = labelX) and fades
    // away once Dolores has arrived — it's onboarding, not permanent chrome, so
    // it clears out and leaves the settled counter clean.
    const hintHold = ENTER_DUR + 0.6, hintFade = 0.9;
    const hintAlpha = this.enterT < hintHold ? 1 : Math.max(0, 1 - (this.enterT - hintHold) / hintFade);
    if (hintAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha *= hintAlpha;
      drawMenuHint(ctx, 'BUY', labelX);
      ctx.restore();
    }
  }
}

export class ShopState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 58; this.rowH = MENU_ROW_MAX; this.visibleRows = 7; this.fixedLastRow = true; this.listStart = 0; }
  enter() { this.idx = 0; this.listStart = 0; this.line = PAWN_LINES[Math.floor(Math.random() * PAWN_LINES.length)]; fitRows(this, this.options().length); Input.setMenuButtons(); }
  options() {
    const slot = this.save.slot;
    const opts = MODS.filter((m) => m.source === 'shop' || slot.mods.found.includes(m.id)).map((m) => {
      const owned = slot.mods.found.includes(m.id) || (m.source === 'mastery' && (slot.mastery[m.hero]?.level || 0) >= 2);
      const equipped = slot.mods.equipped.includes(m.id);
      const price = m.price ? Math.round(m.price * (slot.mods.equipped.includes('coupon') ? 0.75 : 1)) : 0;
      return { m, owned, equipped, price };
    });
    // Mastery sidegrades appear once unlocked.
    for (const m of MODS.filter((mm) => mm.source === 'mastery')) {
      if ((slot.mastery[m.hero]?.level || 0) >= 2 && !opts.some((o) => o.m.id === m.id)) {
        opts.push({ m, owned: true, equipped: slot.mods.equipped.includes(m.id), price: 0 });
      }
    }
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back) return this.flow.toHub();
      const slot = this.save.slot;
      if (!sel.owned) {
        if (slot.coins >= sel.price) {
          slot.coins -= sel.price;
          slot.mods.found.push(sel.m.id);
          if (sel.m.id === 'thirdslot') slot.mods.slots = 3;
          Audio.sfx('power');
        } else Audio.sfx('uiBad');
      } else if (sel.m.id !== 'thirdslot') {
        if (sel.equipped) slot.mods.equipped = slot.mods.equipped.filter((id) => id !== sel.m.id);
        else if (slot.mods.equipped.length < slot.mods.slots) slot.mods.equipped.push(sel.m.id);
        else Audio.sfx('uiBad');
        Audio.sfx('ui');
      }
      this.save.persist();
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#100a14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, "GARY'S LEGALLY DISTINCT PAWN SHOP", W / 2, 14, '#f890b8', 1);
    drawTextCentered(ctx, this.line, W / 2, 28, '#5a5a68');
    const slot = this.save.slot;
    drawTextCentered(ctx, `COINS: ${formatCoins(slot.coins)}   EQUIPPED: ${slot.mods.equipped.length}/${slot.mods.slots}`, W / 2, 44, '#f6d33c');
    const opts = this.options();
    fitRows(this, opts.length);
    opts.forEach((o, i) => {
      if (!o.back && (i < this.listStart || i >= this.listStart + this.visibleRows)) return;
      const sel = i === this.idx;
      if (sel) drawSelRow(ctx, this, i, 30);
      const y = rowTextY(this, i, MENU_ROW_S);
      if (o.back) { drawText(ctx, `${sel ? '> ' : '  '}BACK`, 30, y, sel ? '#f6d33c' : '#c8c8d8', MENU_ROW_S); return; }
      const c = o.equipped ? '#48e0c8' : sel ? '#f6d33c' : o.owned ? '#c8c8d8' : '#8a8a98';
      // Names are measured against the price column rather than trusted to fit:
      // a size up, the longest mod name reached the coins it costs.
      const priceX = W - 76;
      drawText(ctx, fitText(`${sel ? '> ' : '  '}${o.equipped ? '[E] ' : ''}${o.m.name}`, priceX - 36, MENU_ROW_S), 30, y, c, MENU_ROW_S);
      if (!o.owned) drawText(ctx, `${formatCoins(o.price)}`, priceX, y, slot.coins >= o.price ? '#f6d33c' : '#5a5a68', MENU_ROW_S);
      if (sel) drawTextCentered(ctx, o.m.desc || 'A MASTERY SIDEGRADE. IT KNOWS WHAT IT DID.', W / 2, H - 28, '#8a8a98', MENU_NOTE_S);
    });
    drawListScrollbar(ctx, this, opts.length);
    drawMenuHint(ctx, 'BUY/EQUIP');
  }
}

export class ArcadeState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = MENU_ROW_MAX; }
  enter() { this.idx = 0; fitRows(this, this.options().length); Input.setMenuButtons(); }
  options() {
    // Breaker-box games are keyboard-shaped; on touch the corner is shuttered.
    if (Input.isTouchDevice()) return [{ none: true }, { back: true }];
    // Every game is on the floor from day one — the coin slot is the only gate.
    const opts = MINIGAMES.map((m) => ({ game: m }));
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back || sel.none) return this.flow.toHub();
      if (this.save.slot.coins < ARCADE_PLAY_COST) { Audio.sfx('uiBad'); }
      else this.flow.playMinigame(sel.game);
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'ARCADE CORNER', W / 2, 16, '#48e0c8', 2, 'title');
    drawTextCentered(ctx, `${ARCADE_PLAY_COST} COINS A GO. WIN: +${REWARDS.arcadeWin} AND A POWER-UP.`, W / 2, 40, '#8a8a98');
    const touch = Input.isTouchDevice();
    const broke = this.save.slot.coins < ARCADE_PLAY_COST;
    const opts = this.options();
    fitRows(this, opts.length);
    opts.forEach((o, i) => {
      const sel = i === this.idx;
      if (sel) drawSelRow(ctx, this, i, 40);
      const y = rowTextY(this, i, MENU_ROW_S);
      if (o.back || o.none) {
        const label = o.back ? 'BACK' : 'OUT OF ORDER ON TOUCH. TRY A KEYBOARD.';
        drawText(ctx, `${sel ? '> ' : '  '}${label}`, 40, y, sel ? '#f6d33c' : '#c8c8d8', MENU_ROW_S);
        return;
      }
      const c = broke ? '#5a5a68' : sel ? '#f6d33c' : '#c8c8d8';
      drawText(ctx, `${sel ? '> ' : '  '}${MINIGAME_NAMES[o.game]}`, 40, y, c, MENU_ROW_S);
      drawText(ctx, `${ARCADE_PLAY_COST}`, W - 76, y, broke ? '#5a5a68' : '#f6d33c', MENU_ROW_S);
    });
    if (!touch && broke) drawTextCentered(ctx, 'THE COIN SLOT IS UNMOVED BY YOUR POVERTY.', W / 2, H - 28, '#8a8a98', MENU_NOTE_S);
    drawMenuHint(ctx, 'PLAY');
  }
}
