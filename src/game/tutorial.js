// MANDATORY TRAINING: Gary walks you through the controls, one section at a
// time, in a bare lane with nothing in it but the thing coming toward you.
//
// Two rules hold the whole screen together:
//
//   1. It never stops. Instructions arrive as a speech panel — the same one
//      run.js's tutor() prompts use — and remain until Gary replaces them while
//      the world keeps scrolling. Nothing is modal, nothing waits for a
//      keypress to continue, and the hero never freezes mid-stride.
//   2. It draws nothing itself. Crates, drones, coins, capsules, the portals
//      and the heroes all go through the same painters a real run composes, so
//      training shows the player the exact art they are about to meet. The one
//      thing authored here is the backdrop, and even that is shaped as a style
//      pack because drawWorldEntity takes one.
//
// Gary is the coach because MANDATORY TRAINING is an HR artifact and he is the
// employee HR still has on the roster. He did not volunteer for this. The
// module is a form he is working through, each section is a section of it, and
// a miss is an unclosed section rather than a player failure — which is also
// what keeps the forgiving retry policy from reading as the game going soft.
import {
  W, H, shake, updateShake, setSceneGlow, pushOverlayDraw,
  chrome as chromeGeo, chromeCtx, paintChrome,
} from '../engine/renderer.js';
import {
  GROUND_Y, ZOOM, VIEW_W, applyWorld, framingFor, easeZoom, easePan,
} from '../engine/camera.js';
import { Input } from '../engine/input.js';
import {
  Audio, PORTAL_RELAY_IN, PORTAL_RELAY_OUT, PORTAL_RELAY_GAIN, PORTAL_RELAY_IN_GAIN, portalCueFlashAt,
} from '../engine/audio.js';

// The portal's height off the ground, as in RunState — how far above it a player misses.
const PORTAL_H = 40;
import { Rng } from '../engine/rng.js';
import {
  burst, shardBurst, spawnShard, spawnFoil, foilBurst,
  updateParticles, drawParticles, clearParticles,
} from '../engine/particles.js';
import {
  drawText, drawTextCentered, textWidth, drawPanel, drawMenuRow, textYForMid, drawKeyLegend,
  keyLegendWidth, drawRoundButton, UI_PANEL_BORDER,
} from '../engine/sprites.js';
import { Player, PLAYER_X, jumpHeightFor } from './player.js';
// The lane has to settle into the SAME resting frame a real stage does, or the
// tutorial teaches a camera the game then changes. run.js owns that decision
// because it owns the two framings; no cycle, run.js has never imported this.
import { applyFraming, floatBaseY } from './run.js';
import { drawHeroSprite, drawWorldEntity, drawPortal, TAG_FLASH_TIME } from './draw.js';
import { drawToon } from '../sprites/toons.js';
import { makeObstacle, makePickup, entityBox, overlaps, DEBRIS, DEBRIS_DEFAULT } from './entities.js';
import { HERO_BY_ID } from '../data/heroes.js';
import {
  drawSpeech, drawFloatie, drawStatusPill, roundButtonOpts, playButtons,
  drawTouchZoneCard,
} from './hud.js';

// ------------------------------------------------------------------ constants

// The run proper moves at 160. This is gentler without being a crawl — the old
// 70 was slow enough that the hero's legs crawled too, since the run cycle is
// driven by world.speed (see player.update).
//
// 112, up from 90. The lane speed is the master dial for how long the module
// takes: every distance in this file — the spawn lead, the retry lead, the
// ladder pitch, the whole payout stretch — is measured in world px, so raising
// it shortens all of them at once and in proportion. At 90 a flawless run of
// every section took a shade over two minutes before the epilogue; the
// same run at 112 is about 43 seconds, and the hero's legs read as running
// rather than as wading. Anything that must NOT shrink with it — reading time,
// the reaction gap in the ladder — is re-bought explicitly below.
const TRAINING_SPEED = 112;
// Reading time is bought here rather than by slowing the world down further. A
// challenge spawns just beyond the right edge, arriving ~2.5s after Gary starts
// talking — the words land, they are read, and the challenge follows promptly.
const SPAWN_AHEAD = VIEW_W + 60;
// A RETRY does not buy that reading time again. The first time a challenge
// arrives the player is reading a sentence they have never seen; the second
// time they already know what is coming and what they did wrong, and the four
// and the empty lane that bought the first read is just a queue. This puts the
// next attempt just off the right edge — about 1.8 seconds out,
// which is still the whole width of the screen to react in.
const RETRY_AHEAD = VIEW_W + 20;
// Gary's card does NOT expire. What he last said stays on screen until he says
// something else, which for a training module is the only defensible policy: a
// line that times out while you are mid-jump is a line you were never given a
// chance to finish, and the alternative — dead air over a lane with an
// instruction you half-read — is worse than a card that overstays. The only
// timed overlay is the touch-zone diagram, which has its own seven-second clock
// and stops being useful once it has been seen.
// How long the world runs on after a section closes, before the next one opens.
// Long enough for the pass floatie to land and be read on its own, and for the
// line that logged it to be read under it — but this is dead lane, nine times
// over, and at 2.6 it was the single largest block of nothing in the module.
// 1.7 still lands the floatie; what it stops paying for is the pause after it.
const SETTLE_T = 1.0;
// The opening beat, over an empty lane, before section one spawns anything.
// Enough to read two rows and look up, not enough to wonder if it has started.
const INTRO_T = 3.4;
// Intro staging: Gary walks in from the left at tight zoom, stands centre-screen
// while the camera pulls back, then bolts right. Lorenzo enters as Gary exits.
// The lane is frozen for the whole intro — the module hasn't started yet.
//
// Phases: 0=Gary walking in, 1=standing (zoom eases, card up), 2=bolting right
// (Lorenzo enters at ¾, speech switches when Gary is gone), 3=Lorenzo settling,
// 4=done.
const GARY_ENTRY_START_X = -40;    // Off-screen left at tight zoom
const GARY_ENTRY_SPEED = 130;      // Walk-in speed (world px/s)
const GARY_INTRO_STAND_T = 2.5;    // Reading time after zoom settles
const GARY_INTRO_EXIT_SPEED = 310; // Exit speed (world px/s — quick, he's bolting)
const GARY_INTRO_H = 24;           // Same as epilogue — zoom makes him big
const LORENZO_ENTRY_SPEED = 160;   // Lorenzo's run-in speed (world px/s)
const LORENZO_ENTRY_H = 24;        // Matches HERO_DRAW_H — seamless toon→sprite switch
const LORENZO_ENTRY_START = -50;   // Off-screen left (world px)
const INTRO_ZOOM_START = 5.5;      // Tight on Gary — he fills the frame
// Sections Gary will re-open before he gives up and marks it satisfactory.
// Nobody gets stuck in training.
const CONCEDE_AFTER = 3;
// How close the challenge has to be before a spent cannon is handed back — see
// grantChargeGrace. A screen-and-a-bit of warning, so the refund lands while the
// drone is visible and reachable rather than as a surprise off-frame.
const CHARGE_GRACE_RANGE = 150;
const CLAW_DEATH_PAUSE = 0.5;

const PANEL = { border: UI_PANEL_BORDER, shadow: true };

// Gary's card is up for most of the module rather than for a line or two, so it
// is parked well above the default speech anchor: at y 46 it sat squarely in
// the band a held jump travels through, and the thing being read and the thing
// being jumped were in the same place. Its wrap is pulled in to match — the
// card is centred and grows off its longest line, so a narrower wrap is what
// keeps its left edge clear of the coin pill in the top-left corner.
// 10, not 18: as high as the plate can go and still have a couple of pixels of
// margin above it. The card is opaque and it is up almost continuously, so
// every pixel it comes down is a pixel of lane it is standing in — and the lane
// is where the game is. The hero passes in front of it regardless now, but the
// right fix for "the card is in the way" is the card not being there.
const SPEECH_Y = 4;
// 324, measured against what is actually beside it rather than guessed. The
// card is centred on W/2 and its plate is the wrap plus 40 for the portrait,
// the gap and two paddings — so 324 makes a 364-wide plate spanning x 58–422.
// The coin pill ends at 48 and the FPS readout starts at 442: ten pixels either
// side, the same clearance the touch card runs. Wider is better here for the
// same reason the card is high — a wider card is a SHORTER one, because the
// lines it saves are lines of lane it is not standing in.
const SPEECH_MAX_W = 324;
// A few percent of the lane shows through the card. Not a translucent HUD panel
// — the dark plate is that, and it is the register for shouting over a stage —
// but enough that a plate up for nine sections stops reading as a hole punched
// in the screen. 0.88 keeps the dark ink on it at a contrast ratio the light
// plate was measured for; going much thinner starts eating the words rather
// than the plate.
const SPEECH_PLATE = 'rgba(236,233,246,0.88)';
// Touch gets a substantially bigger card. A phone is a quarter the physical
// width of the monitor this was laid out on and is held at arm's length, so the
// card that reads as comfortable on a desk reads as fine print in a hand — and
// this is the one screen in the game whose entire job is being read.
//
// It rides at 18, which puts its plate in the same horizontal band as the coin
// pill (y 5–23, top left). Measured rather than assumed: at this wrap the plate
// starts at x 60 and the pill ends around 50, so they clear each other by ten
// pixels and the anchor is free to be this high. If the wrap ever widens or the
// counter runs to four digits they will meet — which is survivable rather than
// a bug, because the pill draws in the layer ABOVE the card and the plate is
// translucent: the counter Gary is about to make a joke about would read as
// sitting on the card rather than being eaten by it.
//
// The wrap is what it is because of the PAUSE disc, not because of the words.
// That disc sits at x 424–468, y 43–87, and the card is centred on W/2 and
// grows symmetrically — so the widest plate that still clears it is 368, which
// after the portrait, the gap and two paddings at this scale leaves 312 for the
// lettering. Widening past that does not get more text on a row, it gets a
// plate with a pause button printed through it.
//
// Three rows at this scale bottom out at y 94, and the certificate starts at
// 66 — so the closing line is the one line in the module that has to stay
// short enough for a single row. At 312 it does, with the plate ending at 64
// and the document starting two below it.
// 1.15, down from 1.35. Measured rather than eyeballed: a held jump puts the
// hero's crown at screen y 40 and the card's plate starts at 14, so NO type
// size gets the card out of the hero's way — the two share that band whatever
// happens, which is why the hero draws in front of the card rather than behind
// it. What the size does control is how much of the card is in the band. At
// 1.35 the briefs ran to three rows and the plate reached y 86, so the hero
// crossed the whole card; at 1.15 most of them set in two and it bottoms out
// around 60, so he clips a corner on the way past. Still well above the
// desktop 1.0 — this is a phone held at arm's length and the screen's whole
// job is being read.
const SPEECH_SCALE_TOUCH = 1.15;
const SPEECH_Y_TOUCH = 10;
const SPEECH_MAX_W_TOUCH = 312;

// The bottom status row — room name, section counter, key legend — is laid out
// off ONE midline rather than off a shared glyph-box top. drawText takes the
// top of the glyph box, so type at three different scales hung off the same y
// lands on three different baselines, which is exactly what it looked like: the
// legend rode 4px high of the title and the counter sat a pixel under it.
// textYForMid is the correction, and it needs a single number to measure from.
const ROW_MID = H - 11;

// How long the touch zone diagram stays up. It has to survive the gap between
// being read and the drone it is about actually arriving — about 3s after the
// brief starts.
const ZONE_T = 7;

// Pause screen plates — same layout as run.js so the muscle memory carries over.
const PAUSE_MENU_W = 156, PAUSE_MENU_H = 26;
const PAUSE_PLATES = [
  { id: 'resume', x: W / 2 - PAUSE_MENU_W / 2, y: 196, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'pause', label: 'CONTINUE' },
  { id: 'quit', x: W / 2 - PAUSE_MENU_W / 2, y: 228, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'escape', label: 'BACK' },
];

// The training lane's palette, shaped like a cabinet because that is what the
// pack painters below take.
//
// A stop lighter than it was. The lane is deliberately bare, and unlit bare
// reads as a room nobody turned the lights on in rather than as a room with
// nothing in it — which put the heroes and the props, all of them authored to
// be legible against bright stage art, into a murk they had never been drawn
// for. The fixtures below do the rest of the lifting.
const TRAINING_CAB = {
  id: 'training',
  sky: ['#1e2238', '#2f3457'],
  ground: '#5d6489',
  groundDark: '#2b3049',
};

// Overhead lighting: a rhythm of warm cones down the lane, each landing in its
// own pool on the floor. They are the one thing in the lane besides the scroll
// ticks that reports speed, and unlike the ticks they do it at head height.
//
// The fixtures themselves are ABOVE the frame and never drawn. That is not a
// dodge — the top band of this screen belongs to Gary's card, which is up for
// most of the module and would sit on any housing painted up there — and it is
// how a lit stage actually looks from the floor: you see the throw, not the
// lamp. What makes it read as lights rather than as fog is the rhythm (several
// in frame at once, moving at lane speed), the warmth, and the hot line down
// the middle of each throw.
//
// Drawn INSIDE the world transform so they scroll and scale with everything
// else. The geometry is measured up from the groundline rather than down from
// the top of the screen because the frame's headroom moves — the camera cranes
// for a tall jump — and a beam pinned to screen space would slide against the
// lane it is supposed to be bolted to.
const LAMP_GAP = 108;
const LAMP_TOP = GROUND_Y - 132;   // where the throw enters the frame
const LAMP_NECK = 9;               // half-width up there
const LAMP_SPREAD = 38;            // half-width where it meets the floor

function drawLamps(ctx, camX) {
  const first = Math.floor(camX / LAMP_GAP) - 1;
  const last = Math.ceil((camX + VIEW_W) / LAMP_GAP) + 1;
  ctx.save();
  // Additive: the light brightens what is already there instead of laying a
  // milky film over it, which is the difference between a lit lane and a
  // fogged one.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = first; i <= last; i++) {
    const x = i * LAMP_GAP - camX;
    const cone = ctx.createLinearGradient(0, LAMP_TOP, 0, GROUND_Y);
    cone.addColorStop(0, 'rgba(255,226,158,0.26)');
    cone.addColorStop(0.5, 'rgba(255,222,158,0.13)');
    cone.addColorStop(1, 'rgba(255,216,150,0.05)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x - LAMP_NECK, LAMP_TOP);
    ctx.lineTo(x + LAMP_NECK, LAMP_TOP);
    ctx.lineTo(x + LAMP_SPREAD, GROUND_Y);
    ctx.lineTo(x - LAMP_SPREAD, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    // The hot core. A single bright column down the middle of the throw is what
    // stops the cone reading as a flat grey wedge — a real beam is brightest
    // along its axis, and without it the edges and the centre were one value.
    const core = ctx.createLinearGradient(0, LAMP_TOP, 0, GROUND_Y);
    core.addColorStop(0, 'rgba(255,238,196,0.30)');
    core.addColorStop(1, 'rgba(255,232,180,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(x - 4, LAMP_TOP);
    ctx.lineTo(x + 4, LAMP_TOP);
    ctx.lineTo(x + LAMP_SPREAD * 0.55, GROUND_Y);
    ctx.lineTo(x - LAMP_SPREAD * 0.55, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    // The pool on the floor, an ellipse rather than the cone's flat end, so the
    // light reads as landing on the ground instead of stopping above it.
    const pool = ctx.createRadialGradient(x, GROUND_Y, 0, x, GROUND_Y, LAMP_SPREAD + 6);
    pool.addColorStop(0, 'rgba(255,236,186,0.34)');
    pool.addColorStop(0.6, 'rgba(255,230,178,0.12)');
    pool.addColorStop(1, 'rgba(255,230,178,0)');
    ctx.fillStyle = pool;
    ctx.save();
    ctx.translate(x, GROUND_Y + 1);
    ctx.scale(1, 0.2);
    ctx.beginPath();
    ctx.arc(0, 0, LAMP_SPREAD + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Deliberately bare: no parallax, no landmarks, nothing to read but the thing
// coming toward you. It is still built as a style pack rather than as loose
// fills in draw(), because drawWorldEntity takes a pack and every other
// backdrop in the game is one — a screen that paints its own ground is how the
// old version of this file ended up painting its own crates too.
//
// bg draws in SCREEN space; ground draws inside the world transform, in the
// same coordinates the shipped packs use.
const TRAINING_PACK = {
  name: 'training',
  bg(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, TRAINING_CAB.sky[0]);
    sky.addColorStop(1, TRAINING_CAB.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  },
  ground(ctx, camX) {
    ctx.fillStyle = TRAINING_CAB.groundDark;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = TRAINING_CAB.ground;
    ctx.fillRect(0, GROUND_Y, W, 1);
    // The scroll ticks are the only thing in the lane that reports speed. Same
    // 24px cadence the pixel pack uses, so the sense of pace carries over.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = -(camX % 24); x < W; x += 24) ctx.fillRect(x, GROUND_Y + 8, 10, 2);
  },
  // Not part of the style-pack contract — drawWorldEntity never asks for it —
  // but it lives on the pack because it is backdrop, and the backdrop is the
  // one thing this screen authors.
  lights: drawLamps,
  smoothMotion: true,
  post() {},
  decorate: null,
};

// A run of coins on the same arc the spawner lays them on, so the shape reads
// as the one the game actually uses rather than a line of discs.
function coinArc(x0, n, heroId) {
  const hMax = jumpHeightFor(HERO_BY_ID[heroId]) * 0.85;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push(makePickup('coin', x0 + i * 14, 8 + hMax * Math.sin(Math.PI * t)));
  }
  return out;
}

// ------------------------------------------------------------------ the module

// One entry per section. `brief` and `again` are functions of `touch` because a
// phone has none of the keys the keyboard lines name — the same split run.js's
// tutor() prompts make.
//
// `requires` is what makes this Gary's screen rather than a checklist: clearing
// the obstacle is not the same as completing the section. Jump the drone
// instead of ducking it and you are past the hazard but the section is still
// open, because the section specifies ducking. He is not being difficult; he is
// reading the form.
const STEPS = [
  {
    id: 'jump',
    hero: 'lorenzo',
    label: 'JUMP',
    legend: [['SPC', 'JUMP']],
    // "HOLD", not "PRESS": every hero has a variable jump, so a flicked key
    // clamps to a 2px hop and eats the crate (player.update). Teaching the tap
    // first and the hold second taught the failure first.
    // "SECTION ONE:" was doing nothing the room label at the bottom of the
    // screen was not already doing, and dropping it lets the callback at the end
    // land on a shorter line — and gives the touch variant, which had no joke in
    // it at all, the same one.
    brief: (touch) => (touch
      ? 'CRATES. HOLD THE LEFT OF THE SCREEN. I DID NOT WRITE SECTION ONE.'
      : 'CRATES. HOLD SPACE TO JUMP. I DID NOT WRITE SECTION ONE.'),
    again: (touch) => (touch
      ? 'YOU FLICKED IT. HOLD IT DOWN. THE CRATE COMES BACK.'
      : 'YOU TAPPED IT. HOLD IT DOWN. THE CRATE COMES BACK.'),
    setup(t) { t.obstacles = [makeObstacle('crate', t.spawnX())]; },
  },
  {
    // One crate, then two, then three. The jump is analogue — you keep whatever
    // height you had when you let go — so a ladder of three is the only way to
    // show that without saying it: each stack asks for a longer hold than the
    // one before, and the player feels the dial rather than being told there
    // is one.
    id: 'stacks',
    hero: 'lorenzo',
    label: 'VARIABLE JUMP',
    legend: [['SPC', 'JUMP']],
    brief: () => 'THREE STACKS, EACH TALLER. HOLD LONGER FOR EACH. THE MANUAL CALLS THIS INTUITIVE.',
    again: () => 'TALLER THAN THE LAST ONE. HOLD LONGER. I AM NOT PAID FOR RETAKES.',
    // 91px apart — tight enough that the ladder reads as one shape but with
    // enough room to land and re-jump. At 112 px/s the rungs are 0.81s apart
    // against Lorenzo's 0.82s airtime, so a clean landing is possible between
    // each stack.
    setup(t) {
      const x = t.spawnX();
      t.obstacles = [
        makeObstacle('crate', x),
        makeObstacle('crate', x + 91, { n: 2 }),
        makeObstacle('crate', x + 182, { n: 3 }),
      ];
    },
  },
  {
    // Loose change first, so the counter visibly moves, then the box — which
    // teaches that a ! crate is a container and not a hazard, the one prop in
    // the game you are supposed to run headfirst into.
    id: 'coins',
    hero: 'lorenzo',
    label: 'COINS',
    legend: [['SPC', 'JUMP']],
    // The box's copy has three jobs and does them in this order: it BREAKS
    // OPEN, you break it from UNDERNEATH, and what falls out is usually coins
    // but not always. The old line said "the box is also coins", which taught a
    // container that is not worth opening twice — in a real stage a ! crate is
    // a quarter chance of something better than money, and a player who has
    // been told it is a coin dispenser has no reason to go out of their way for
    // one.
    brief: () => 'RUN THROUGH THE COINS. THE BOX BREAKS OPEN FROM UNDERNEATH — COINS, MOSTLY. SOMETIMES BETTER.',
    again: () => 'THE BOX IS STILL FULL. FROM UNDERNEATH. ANOTHER ONE IS COMING.',
    // Missing a coin or two is not worth reopening a section over; the box is.
    optionalPickups: true,
    requires: (t) => t.sawQbox,
    setup(t) {
      const x = t.spawnX();
      t.pickups = coinArc(x, 8, 'lorenzo');
      // A ! crate normally floats at alt 40, where the game expects it to be
      // SHOT or stomped — the headbutt is a fallback path, and at that height
      // it is close to unhittable: Lorenzo's 89px jump rockets through the
      // strike band in 0.07s each way, which measured as four misses running
      // even with perfect information.
      //
      // So the box goes where the jump actually lingers — just under his apex.
      // Near the top of the arc he is barely moving vertically, which turns a
      // 0.07s window into 0.4s, and an ordinary held jump collects it. Height
      // is the timing dial here; nothing about the hitbox is fudged.
      const box = makeObstacle('qcrate', x + 230);
      box.alt = 60;
      t.obstacles = [box];
    },
    // The payoff: a screenful of coins and blocks to play with, then payroll
    // reclaims every last one on a technicality — training coins are not legal
    // tender.
    onPass(t) { t.spawnPlayground(); },
  },
  {
    id: 'duck',
    hero: 'lorenzo',
    label: 'DUCK',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
    brief: (touch) => (touch
      ? 'DUCK. SWIPE DOWN AND HOLD. THE DRONE HAS RIGHT OF WAY, APPARENTLY.'
      : 'DUCK. HOLD DOWN OR S. THE DRONE HAS RIGHT OF WAY, APPARENTLY.'),
    again: () => 'INCOMPLETE. THE DRONE IS FILED UNDER DUCK.',
    // Lorenzo clears the drone with an ordinary jump, so clearing it is not
    // what the section asks for.
    requires: (t) => t.sawDuck,
    wrongWay: () => 'OVER IT. THE SECTION SPECIFIES UNDER. I DO NOT MAKE THE SECTIONS.',
    setup(t) {
      const drone = makeObstacle('drone', t.spawnX());
      // Two above the default 11. The fliers now draw at 1.35x over an unchanged
      // box, and the art is bottom-anchored — all that extra size went UP, so the
      // silhouette got much heavier while its lowest edge stayed put. At 11 the
      // result is that a fully ducked Lorenzo has the drone drawn straight
      // through his cap: a clean duck that looks like a collision.
      //
      // 13 is the top of the legal window and there is no more to be had. The
      // hero's box is 14 standing and 7 ducked against the drone's 7, so the
      // drone must sit below 14 to still catch someone who does not duck, and at
      // or above 7 to let someone who does duck through. 13 keeps a standing hit
      // by a single pixel and clears the crouch by six.
      //
      // It stays local to this section rather than moving the default, because a
      // pellet only ever meets a prop below alt 12 (it leaves at the hero's own
      // height with an 8px box) — so a drone at 13 cannot be shot, and the
      // section that teaches the cannon needs one that can. Raising the default
      // means raising the pellet with it, across every cabinet.
      drone.alt = 13;
      // 13 is the ceiling for the BOX and it is still not enough for the eye:
      // Lorenzo's crouched art is taller than his crouched box, so a clean duck
      // was passing with the drone's belly resting on his cap. The last few
      // pixels are therefore art, not collision — see `artLift` in
      // drawWorldEntity. Raising the box any further would mean a drone that a
      // standing hero walks straight under.
      //
      // 3 rather than 5: five put clear daylight under it but had the drone
      // reading as a separate object floating over the lane rather than a hazard
      // the hero is passing beneath. Three is the smallest lift that stops the
      // graze.
      drone.artLift = 3;
      t.obstacles = [drone];
    },
  },
  {
    id: 'shield',
    hero: 'lorenzo',
    label: 'SHIELD',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
    brief: () => 'SHIELD CAPSULE. TAKES ONE HIT FOR YOU. PROTECTIVE EQUIPMENT ARRIVES AFTER THE HAZARDS. THAT IS PROCUREMENT.',
    again: () => 'IT WENT PAST. I WILL REQUISITION ANOTHER. THAT IS A FORM. I HAVE ALREADY FILED IT.',
    setup(t) { t.pickups = [makePickup('capShield', t.spawnX(), 10)]; },
  },
  {
    // The toaster is optional, but it gets its own section so the capsule and
    // appliance remain two readable tutorial beats rather than one crowded
    // Stores lane. The portal follows at the next fixed section index.
    id: 'toaster',
    hero: 'lorenzo',
    label: 'GOLDEN APPLIANCE',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
    brief: () => 'THAT IS A TOASTER. EVERY CABINET HAS ONE HIDDEN IN IT. IT IS OPTIONAL, SO IT IS NOT MY DEPARTMENT.',
    optional: true,
    done: (t) => t.sawToaster,
    got: () => 'YOU TOOK THE TOASTER. IT DOES NOTHING AND IT IS WORTH A FORTUNE. BOTH ARE ON RECORD.',
    missed: () => 'YOU LEFT THE TOASTER. I CANNOT MARK YOU DOWN FOR IT. I AM SIMPLY GOING TO REMEMBER IT.',
    setup(t) {
      t.sawToaster = false;
      t.pickups = [makePickup('appliance', t.spawnX(), 44)];
    },
  },
  {
    id: 'portal1',
    hero: 'lorenzo',
    tagTo: 'mochi',
    label: 'PORTAL TAG',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
    brief: () => 'RUN THROUGH THE PORTAL. DO NOT JUMP IT. SOMEONE JUMPED ONE ONCE. THERE WAS PAPERWORK.',
    again: () => 'OVER IT IS NOT THROUGH IT. I AM REOPENING THE SECTION.',
    setup(t) {
      t.portal = { x: t.worldX + PLAYER_X + 130, hero: 'mochi', hit: false };
    },
  },
  {
    // Mochi is the only hero who jumps twice, and she jumps LOW — 57px against
    // Lorenzo's 89. That is the whole reason the swap happens here: a stack
    // this tall is one Lorenzo would have strolled over, so the section can
    // only be completed by the thing it is teaching. Granting a borrowed air
    // jump to a hero who did not need one taught nothing.
    //
    // The portal to B-33P used to be its own section. Merged here so clearing
    // the stack and swapping bodies are one beat: you earn the new body by
    // using the move that belongs to it, and the portal arrives as the reward
    // rather than as a separate task.
    id: 'doublejump',
    hero: 'mochi',
    tagTo: 'b33p',
    label: 'DOUBLE JUMP',
    legend: [['SPC', 'JUMP x2']],
    brief: (touch) => (touch
      ? 'MOCHI JUMPS TWICE, AND NOT VERY HIGH. TAP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH.'
      : 'MOCHI JUMPS TWICE, AND NOT VERY HIGH. JUMP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH.'),
    again: () => 'INCOMPLETE. TWICE. IN THE AIR. THE FORM IS SPECIFIC.',
    requires: (t) => t.sawDoubleJump,
    wrongWay: () => 'YOU GOT OVER IT ON ONE. THE SECTION SPECIFIES TWO.',
    // Five crates, not six. Six (66px) was a wall a beginner had to time the
    // second jump well to get over; five (55px) leaves room to be sloppy with
    // it, which is what a section teaching a new input should allow. It sits a
    // whisker under Mochi's 56.9px single-jump apex, so a frame-perfect single
    // is *just* possible — and the section says so out loud when it happens
    // ("YOU GOT OVER IT ON ONE"), which is the honest outcome rather than a
    // silent pass for the move it is not teaching.
    setup(t) { t.obstacles = [makeObstacle('crate', t.spawnX(), { n: 5 })]; },
    // The portal spawns just ahead of the player — close enough to reach during
    // the settle, far enough that the floatie is read before it arrives.
    onPass(t) {
      t.portal = { x: t.worldX + PLAYER_X + 90, hero: 'b33p', hit: false };
      t.say('ANOTHER PORTAL, ANOTHER BODY. NORMAL HERE. STRAIGHT THROUGH.');
    },
  },
  {
    id: 'shoot',
    hero: 'b33p',
    // The way home is at the end of this section's gallery rather than in a
    // section of its own, so this is the section that hands the body back — and
    // the dev skip reads `tagTo` to do it without the portal. Skipping into the
    // epilogue as B-33P is not a shortcut, it is a different ending.
    tagTo: 'lorenzo',
    label: 'HERO POWER',
    legend: (touch) => (touch ? [['USE', 'LEMON CANNON']] : [['RT/D', 'LEMON CANNON']]),
    brief: (touch) => (touch
      ? 'EVERY HERO HAS A POWER. B-33P SHOOTS. TAP THE RIGHT STRIP, OR THE USE DISC. THE CANNON IS COMPANY PROPERTY.'
      : 'EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY.'),
    // The whole canvas has been a two-button surface since section one, and
    // nothing has said so: a thumb that never strayed right of 70% has been
    // playing a one-button game without knowing there was another. The power
    // is the first control that lives in the right-hand strip. The split is
    // shown in level 1-1, where it belongs — the tutorial no longer duplicates it.
    // zones: true,
    again: () => 'IT GOT PAST. SHOOT THE NEXT ONE. THE CANNON IS SIGNED OUT TO YOU.',
    // Ducking the drone would clear it, but this section is about the cannon.
    requires: (t) => t.sawShotDown,
    // One free recharge when the drone draws near — see grantChargeGrace. This
    // is the only section that asks for a timed button, so it is the only one
    // that can be failed by the timer instead of by the player.
    chargeGrace: true,
    wrongWay: () => 'YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE.',
    setup(t) {
      t.obstacles = [makeObstacle('drone', t.spawnX())];
      t.player.abilityCd = 0;
    },
    onPass(t) { t.spawnShootGallery(); },
  },
];

// The ending. Gary has been a panel with a portrait in it for the whole module;
// at the end the lane winds down and he walks on in person, up the track,
// against the direction everything else has been travelling all day. He is the
// last joke as well as the first: the module is over, and his shift is not.
//
// Every beat is skippable — one press advances — so an impatient player taps
// through in seconds and a reader gets the whole bit.
// The form's order, not a storyteller's: deductions are processed before
// awards, so payroll takes the coins back and THEN he certifies you. Working
// through it in the order the form has it is the most Gary thing in the scene.
//
// The holds are the reading time for one or two rows plus a beat to look up —
// nothing more. They had drifted up to 4.6 and 5.2 apiece, which over seven
// beats is most of a minute of a player waiting for a man to finish; a two-row
// line is read in about three seconds. Every one of these is also skippable, so
// the hold is the ceiling for a reader, not a wait for anyone else.
const OUTRO = [
  { hold: 3.0, line: 'THAT IS THE MODULE. INCLUDING THE PARTS I DISAGREE WITH.' },
  // The reclaim runs UNDER this line: he says it and the counter drains while
  // he does, in front of you, rather than the coins having quietly vanished
  // six sections ago.
  //
  // It waits `clawDelay` before it starts. Firing the drain on the same frame
  // as the line meant the number was already falling while the sentence
  // explaining it was still being read, so the two halves of the gag landed on
  // top of each other — you cannot register a total being taken off you if you
  // never got a clean look at the total. The beat is: read it, then watch it
  // go. The hold covers the pause plus the drain plus a moment at zero.
  { hold: 5.0, clawback: true, clawDelay: 1.2,
    line: 'PAYROLL HAS RECLAIMED THOSE. TRAINING COINS ARE NOT LEGAL TENDER.' },
  { hold: 2.4, line: 'I DID ASK. I ASKED TWICE. THE SECOND TIME IN WRITING.' },
  // The certificate is on screen under this line already reading NON-BINDING.
  // EXPIRES ON CONTACT WITH A CABINET, so the old version of this beat was Gary
  // reading the card out. Get a laugh off the card instead of repeating it.
  { hold: 3.0, line: 'YOU ARE CERTIFIED. READ THE SMALL PRINT. IT IS ALL SMALL PRINT.' },
  // The celebration beat. The hero celebrates; Gary does not — he rolls his
  // eyes and stands in it. A Gary who genuinely celebrates undoes the joke the
  // whole module rests on, so the form celebrates on his behalf: the step is
  // logged as completed, the streamers fire, and he has done the paperwork
  // instead of the party.
  // The hold cannot go below PARTY_T (2.8) or the sweep beat arrives before the
  // streamers have finished landing and there is nothing on the floor to take
  // back.
  { hold: 3.2, party: true,
    line: 'THERE IS A CELEBRATION STEP. I HAVE LOGGED IT AS COMPLETED.' },
  // ...and it ends the way everything he hands out ends. The streamers go back
  // to Stores, which is his actual job — it says so on the certificate he is
  // about to sign.
  { hold: 3.0, sweep: true,
    line: 'THAT IS THE CELEBRATION. THE STREAMERS ARE FROM STORES. THEY GO BACK.' },
  { hold: 3.4, line: 'RIGHT. I HAVE A SHOP TO HAUNT, AND ONLY DURING BUSINESS HOURS. IT IS POLICY.' },
];

// Party colours — the arcade's own accent set (coin gold, relay teal, portal
// magenta, pass green) rather than a fresh palette, so the streamers read as
// this game's confetti and not as stock celebration.
const PARTY_INK = ['#f6d33c', '#48e0c8', '#e874d6', '#74c947', '#ff8f4a', '#fff8d0'];
const PARTY_T = 2.8;
// Where he stops. Close enough to be in conversation with the hero (world x 62)
// rather than shouting across the lane at them.
//
// The camera welds the frame's left edge to camX, so there is no x pan to play
// with: zoom alone slides both figures right and enlarges them, and where Gary
// stops is the only other dial. At this zoom the hero's screen column is 198
// and Gary's is 3.2x wherever he parks, so 96 puts about half a body between
// them — two people having a conversation, rather than the lane's width apart.
// Each stands ~77px tall in a 270px frame, which is a proper two-shot rather
// than two dots in a lane.
const GARY_STOP_X = 96;
// He enters from just off the right edge of the CURRENT frame rather than from
// 40px beyond the resting frame's width, and he covers the ground briskly. The
// old pairing — a start 130px outside the pushed-in frame at 46px/s — was four
// seconds of a stationary hero watching an empty lane before the ending began.
// Now the two of them close the distance together: the lane is still winding
// down while he walks in, so the hero is still running toward him, and they
// arrive at the same moment about two seconds in.
const GARY_ENTER_X = 250;
const GARY_WALK_SPEED = 78;
// How long the treadmill takes to stop, matched to that walk so the hero's legs
// wind down exactly as Gary arrives instead of a beat and a half beforehand.
const OUTRO_STOP_T = 2.0;
const GARY_H = 24;
const OUTRO_ZOOM = 3.2;

const OPENING = 'HR ASSIGNED ME THE TRAINING MODULE. I AM DECEASED. THE FORM DID NOT ASK.';
const CONCEDED = 'I AM MARKING THIS ONE SATISFACTORY. NOBODY AUDITS ME.';
const SHIELD_BROKE = 'THE EQUIPMENT PERFORMED AS SPECIFIED. YOU DID NOT.';
// Said on the first shot, not in the brief: the orb only means something once
// the player has watched it empty.
const COOLDOWN = 'THE ORB IS THE RECHARGE. IT REFILLS ON ITS OWN. YOU CANNOT HURRY IT. I HAVE ASKED.';
// The payout stretch. Two lines, spaced across it: what coins are for, then
// permission to take the lot. Both are setups — the epilogue takes every one of
// them back, and "the part people remember" is the line the reclaim lands on.
const PAYOUT_1 = 'COINS BUY UPGRADES. DOLORES RUNS THAT COUNTER AND DOLORES DOES NOT NEGOTIATE.';
const PAYOUT_2 = 'TAKE ALL OF THEM. THIS IS THE PART PEOPLE REMEMBER.';
// He does not announce that he signed it. The certificate is on screen with his
// name on the signature line and the man himself is standing under it — saying
// "SIGNED, GARY" out loud put three signatures in one frame, which is two more
// than the joke needs. A signature is a thing you put on a document so that you
// The certificate is a piece of paper, so it is drawn as one: a pale plate with
// dark ink, ruled, with a signature line at the bottom. It deliberately does
// NOT use drawActBanner — that card is the ACT-break announcement, a mistracked
// tape with chromatic ghosts and tracking bars, and its glitch says "the
// hardware is failing", which is a sentence about the arcade and not about the
// player having passed a training module. Borrowing it here meant the ending
// arrived shouting in a register nothing had earned.
const CERT_HEAD = 'CERTIFICATE OF COMPLETION';
const CERT_TITLE = 'MANDATORY TRAINING';
const CERT_FOOT = 'NON-BINDING. EXPIRES ON CONTACT WITH A CABINET.';

// ------------------------------------------------------------------ state

export class TutorialState {
  constructor({ onDone, save }) {
    this.onDone = onDone;
    this.save = save || null;
    this.settings = (save && save.settings) || {};
    this.t = 0;
    this.worldX = 0;
    this.prevWorldX = 0;
    this.prevT = 0;
    this.speed = TRAINING_SPEED;   // eased to a stop for the ending
    this.camPan = 0;
    applyFraming(save && save.settings);
    this.camZoom = ZOOM;
    this.outro = null;
    this.player = null;
    this.obstacles = [];
    this.pickups = [];
    this.pellets = [];
    this.portal = null;
    // Failed/finished attempts keep drawing as inert scenery until the lane
    // has carried them fully past the left edge. They live outside the active
    // arrays so a retry setup can replace its challenge without erasing them.
    this.retiredObstacles = [];
    this.retiredPickups = [];
    this.retiredPortals = [];
    this.floaties = [];
    this.speech = null;
    this.lastSaid = null;
    this.garyIntroduced = false;
    // Intro staging: Gary appears in person at centre-screen.
    // 0 = Gary standing, 1 = Gary bolting right, 2 = Lorenzo entering, 3 = done
    this.introPhase = 0;
    this.garyIntroX = 0;          // screen-space X during intro
    this.lorenzoIntroX = 0;       // screen-space X during Lorenzo's entry
    this.introTimer = 0;
    this.section1Said = false;    // true once section 1 brief replaces intro card
    this.lorenzoEntering = false; // true once Lorenzo starts his run-in
    this.coins = 0;
    // The clawback is a countdown of the counter itself, one coin per tick,
    // and it happens in the epilogue rather than the moment the coins section
    // closes: the player keeps what they picked up for the rest of the module,
    // and Gary takes it off them in person at the end.
    this.clawing = false;
    this.clawAcc = 0;
    this.clawStep = 0.05;
    this.clawStart = 0;
    this.clawDeathT = 0;
    // Once the module has paid out once the readout stays up — including at
    // zero, which is where the joke lives.
    this.paidOut = false;
    // Touch only: the card that shows which half of the screen does what.
    this.zoneT = 0;
    // Epilogue: how long the hero is waving for, and how long he stays sour
    // about the reclaim. He is the only one on this screen allowed to have a
    // reaction to any of it — Gary is on the clock.
    this.waveT = 0;
    this.sulkT = 0;
    this.sulkStyle = 3;          // 2=eyeroll, 3=scowl (default for coin reclaim)
    this.cheering = false;
    this.speedRamp = 0;          // eases lane speed in from 0 at module start
    // The mandated celebration: how long the pair are required to be pleased
    // for, and the drip clock that keeps the streamers coming while they are.
    this.partyT = 0;
    this.partyAcc = 0;
    // Free play: a victory lap with a full lane and no way to fail. Set by the
    // payouts that follow the coins and the cannon sections, cleared when the
    // next section opens.
    this.freePlay = false;
    this.freePlayHazards = false;
    this.shield = 0;
    // -1 is the opening beat: Gary explains why he is here, over an empty lane,
    // before section one spawns anything. settleT runs it out like any other
    // gap between sections.
    this.stepIndex = -1;
    this.misses = 0;
    this.retrying = false;
    this.settleT = 0;
    this.legend = [];
    this.finished = false;
    this.doneT = 0;
    this.paused = false;
    this.pauseIdx = 0;
    // Touch controls in the black margin rather than on the art, where the
    // device has margin to spare. Set by setButtons(); read by the chrome
    // painter and by the pause path.
    this.useChrome = false;
    this.rng = new Rng(0x7a5c0de);
    this.sawDuck = false;
    this.sawDoubleJump = false;
    this.sawShotDown = false;
    this.sawQbox = false;
    this.sawToaster = false;
  }

  // ---- lifecycle -----------------------------------------------------------

  enter() {
    Input.setContext('run');
    Input.clearAll();
    clearParticles();
    setSceneGlow(true);
    this.garyIntroduced = false;
    this.player = new Player('lorenzo');
    this.retiredObstacles = [];
    this.retiredPickups = [];
    this.retiredPortals = [];
    this.setButtons();
    // Intro staging: Gary walks in from the left at tight zoom, then stands
    // centre-screen while the camera pulls back. The lane is frozen — the
    // module hasn't started yet.
    this.speed = 0;
    this.camZoom = INTRO_ZOOM_START;
    this.camPan = 0;
    this.prevWorldX = this.worldX;
    this.prevT = this.t;
    this.introPhase = 0;
    // Gary starts off-screen left, walking to centre.
    this.garyIntroX = GARY_ENTRY_START_X;
    this.lorenzoIntroX = LORENZO_ENTRY_START;
    this.introTimer = 0;
    this.section1Said = false;
    this.settleT = Infinity;        // held until intro finishes
  }

  exit() {
    setSceneGlow(false);
    Input.setContext('default');
    Input.setButtons([]);
    Input.setChromeButtons([]);
    Input.clearAll();
    this.player = null;
  }

  // The USE disc only appears once there is a power behind it. Registering it
  // from section one would put a dead control on screen for most of the module,
  // and its arrival with B-33P is itself part of the lesson.
  // Touch controls, laid out the way a run lays them out — which, on any device
  // with enough black margin around the 480x270 rect, means OUTSIDE the canvas
  // entirely (renderer's chrome geometry). Training was the one touch screen
  // still parking all three discs on the art: a PAUSE disc in the top-right
  // corner competing with Gary's card for the same pixels, and JUMP/USE sitting
  // on the lane the module is asking you to look at. Falls back to the
  // in-canvas corners only where a run would too — screens too close to 16:9 to
  // have room out there.
  // The one power this module hands over. B-33P's cannon is the only ability
  // taught here — every other hero's moves the hero around in ways this lane
  // has nothing to say about yet — so it is also the only time the USE control
  // and the readiness orb have any business being on screen.
  hasPower() { return !!this.player && this.player.heroId === 'b33p'; }

  setButtons() {
    // Both of these can change under a live screen — usingTouch flips on the
    // first tap of a session, and the chrome mode changes when a phone is
    // rotated — so they are recorded here and rechecked every frame in
    // update(). Without that the module was capable of running its whole
    // length with no touch controls at all: they were registered on entry,
    // before the player had touched anything, and never asked again.
    this.touchButtons = Input.usingTouch;
    this.chromeMode = chromeGeo.mode;
    if (!Input.usingTouch) {
      this.useChrome = false;
      Input.setButtons([]);
      Input.setChromeButtons([]);
      return;
    }
    const hasPower = this.hasPower();
    this.useChrome = chromeGeo.mode !== 'none';
    if (this.useChrome) {
      Input.setButtons([]);
      Input.setChromeButtons([
        { id: 'jump', ...chromeGeo.jump, action: 'jump' },
        ...(hasPower ? [{ id: 'ability', ...chromeGeo.ability, action: 'ability' }] : []),
        { id: 'pause', ...chromeGeo.pause, action: 'escape' },
      ]);
      return;
    }
    Input.setChromeButtons([]);
    Input.setButtons(playButtons().filter((b) => b.id !== 'ability' || hasPower));
  }

  // Pausing takes the play controls out of the margin as well as off the
  // canvas. The pause plates are in-canvas, they are the only thing a pointer
  // can reach on that screen, and leaving a live JUMP disc sitting outside a
  // paused game is a control that looks pressable and is not.
  enterPauseButtons() {
    this.useChrome = false;
    Input.setChromeButtons([]);
    Input.setButtons(PAUSE_PLATES);
  }

  // The discs out in the margin, through the same painter and the same
  // dirty-flag signature a run uses — the margin only repaints when something
  // in it actually changes, and the USE meter reads the real cooldown because
  // roundButtonOpts only ever asks for the player and who they are.
  drawChromeButtons() {
    if (!chromeCtx || !this.useChrome) return;
    const shim = { player: this.player, relay: { current: this.player.heroId } };
    const buttons = Input.chromeButtons;
    let sig = `tut|${chromeGeo.mode}|${chromeGeo.vw}x${chromeGeo.vh}`;
    for (const b of buttons) {
      sig += `|${b.id}`;
      if (b.id === 'ability') {
        const frac = roundButtonOpts(shim, { id: 'ability' }).frac;
        sig += `:${frac == null ? -1 : Math.round(frac * b.r * 2)}`;
      }
    }
    paintChrome(sig, (ctx) => {
      for (const b of buttons) {
        const art = b.id === 'jump' ? { label: 'JUMP' }
          : b.id === 'ability' ? { label: 'USE' } : { icon: 'pause' };
        const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, id: b.id, round: true, ...art };
        const base = roundButtonOpts(shim, box);
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

  // ---- sections ------------------------------------------------------------

  step() { return STEPS[this.stepIndex]; }

  // Where a section's props are laid down. Every setup() measures from here
  // rather than from the constant, because the answer differs between a section
  // opening and a section being re-presented — see RETRY_AHEAD.
  spawnX() { return this.worldX + (this.retrying ? RETRY_AHEAD : SPAWN_AHEAD); }

  startStep(i) {
    if (i >= STEPS.length) {
      this.finished = true;
      this.doneT = 0;
      this.speech = null;
      this.freePlay = false;
      this.freePlayHazards = false;
      this.clearEntities();
      // The capsule goes back before he walks on. A shield bubble is a bright
      // ring around the hero's whole body, and the ending is a two-shot held at
      // 3.2x for half a minute — one of the two figures standing inside a
      // glowing egg for all of it is a different picture from the one this
      // scene is composed as. It is also correct on the fiction: protective
      // equipment is Stores, Stores is Gary, and nothing issued in here was
      // ever leaving the room.
      this.shield = 0;
      // The last portal is at the end of the shoot gallery rather than in a
      // section of its own, so nothing reopens when it is jumped — and the
      // certificate is made out to whoever is standing there. Hand the body back
      // anyway. A jumped last portal is not a different ending, it is a missed
      // one, and the line that used to reopen the section says the true thing
      // here instead: it rides the silent walk-on and is replaced by beat one.
      if (this.player.heroId !== 'lorenzo') {
        this.player.setHero('lorenzo');
        this.say('THROUGH IT. YOU CANNOT SIGN THE FORM AS SOMEBODY ELSE. I HAVE TRIED.');
      }
      // beat -1 is "still walking on"; he says nothing until he arrives.
      this.outro = { beat: -1, garyX: GARY_ENTER_X, walking: true, cardT: 0, holdT: 0, clawIn: 0 };
      Audio.sfx('win');
      return;
    }
    this.stepIndex = i;
    const step = STEPS[i];
    // Keep the previous section's unused props in the moving lane. The new
    // setup methods replace their active arrays, so retirement has to move the
    // props to dedicated draw-only arrays first.
    this.retireAttempt({ pickups: false });
    this.retireCoins();
    this.pellets = [];
    this.portal = null;
    this.misses = 0;
    this.settleT = 0;
    this.freePlay = false;
    this.freePlayHazards = false;
    // A queued line belongs to the stretch that queued it. Arriving two
    // sections later, over a lane it is not describing, is worse than not
    // arriving at all.
    this.pending = null;
    this.clearWitness();
    if (this.player.heroId !== step.hero) this.player.setHero(step.hero);
    this.player.abilityCd = 0;
    this.setButtons();
    this.legend = typeof step.legend === 'function' ? step.legend(Input.isTouchDevice()) : step.legend;
    this.say(step.brief(Input.isTouchDevice()));
    // Outlives the brief on purpose. It is a diagram of the whole input
    // surface, arriving at the one moment the player has a reason to care about
    // the half they have never touched — and it is read, looked away from, and
    // then read again once the drone is actually on screen. Expiring with the
    // speech panel gave it about a second of attention after the sentence
    // explaining it had gone.
    this.zoneT = step.zones && Input.isTouchDevice() ? ZONE_T : 0;
    step.setup(this);
  }

  // Dev builds only, wired to N and the forward arrow in src/dev/index.js.
  // Closes the section on the spot — the same path a pass takes, minus the
  // reward — so the module can be walked to its last sections without playing
  // the first eight.
  //
  // Returning nothing declines the key and lets it through to the game. That is
  // what the ArrowRight guard below is for: the forward arrow is also the
  // ability key, so while a hero is holding a live power the arrow has to stay
  // the cannon — otherwise the one section that teaches shooting could not be
  // tested in the build it is being reviewed in. N always skips.
  devSkipSection(code) {
    if (code === 'ArrowRight' && this.player && this.player.hero.ability.type === 'shoot') return null;
    if (this.finished) return 'TRAINING: ALREADY IN THE EPILOGUE';
    // If we're still in the intro staging, snap out of it.
    if (this.introPhase < 4) {
      this.introPhase = 4;
      this.speedRamp = 1;
      this.speed = TRAINING_SPEED;
      // Skipping the staged intro still has to land in the same resting frame
      // as a normal gameplay level; otherwise dev inspection leaves the lane
      // at the opening close-up for every settled section.
      this.camZoom = ZOOM;
      this.camPan = 0;
    }
    const step = this.step();
    // A skipped portal still hands the body over. Skipping past one and
    // arriving in the epilogue as the wrong hero is not a shortcut, it is a
    // different ending — the certificate is made out to whoever is standing
    // there.
    if (step && step.tagTo) this.player.setHero(step.tagTo);
    this.clearEntities();
    this.speech = null;
    this.zoneT = 0;
    this.freePlay = false;
    this.freePlayHazards = false;
    this.startStep(this.stepIndex + 1);
    return step ? `TRAINING: SKIPPED ${step.label}` : 'TRAINING: SKIPPED INTRO';
  }

  // The one charity the cannon gets, once per attempt, in the section that
  // teaches it.
  //
  // The recharge is 1.35s and the challenge arrives 2.18s after the section
  // opens, so a player who tries the new button the moment they read about it —
  // which is what a tutorial has just asked them to do — can be mid-cooldown
  // when the only drone in the lane draws level, and lose the section to the
  // timer rather than to aim. That is the confusing version of a cooldown: not
  // "I missed", but "I pressed it and nothing happened."
  //
  // So the first time the challenge comes into range with a spent cannon, it is
  // handed back full. Once. It is not a difficulty change — outside this section
  // nothing calls it, and a player who still misses gets the reopen and the
  // retry like anyone else. It only ever removes the failure that had nothing
  // to do with the skill being taught.
  grantChargeGrace() {
    const step = this.step();
    if (!step || !step.chargeGrace || this.gaveCharge) return;
    if (this.player.abilityCd <= 0) return;
    const heroX = this.playerWorldX();
    const near = this.obstacles.some((ob) => ob.live
      && ob.x + ob.w >= heroX && ob.x - heroX < CHARGE_GRACE_RANGE);
    if (!near) return;
    this.gaveCharge = true;
    this.player.abilityCd = 0;
  }

  // What the player was seen doing while the challenge was alongside them.
  // Sampled continuously rather than tested at the moment it passes: a duck is
  // released the instant the drone is clear, so reading the flag at pass time
  // reads it a frame too late.
  clearWitness() {
    this.sawDuck = false;
    this.sawDoubleJump = false;
    this.sawShotDown = false;
    this.sawQbox = false;
    this.sawToaster = false;
    // Per attempt, not per section: a reopen re-presents the challenge, so the
    // retry gets the same single refund the opening attempt had.
    this.gaveCharge = false;
  }

  // Section closed. The world does not stop; it just runs on for a beat.
  //
  // `logged` false is an optional section that went by untaken: it still
  // closes, because that is what optional means, but it does not get the pass
  // chime or the green — a grey NOT TAKEN is the honest report, and it leaves
  // the celebratory reading of the floatie meaning something.
  passStep(logged = true) {
    const step = this.step();
    this.floatText(logged ? `${step.label} — LOGGED` : `${step.label} — NOT TAKEN`,
      logged ? '#74c947' : '#8a8a98');
    Audio.sfx(logged ? 'perfect' : 'ui');
    this.settleT = SETTLE_T;
    if (step.onPass) step.onPass(this);
  }

  // Section still open. Re-present it and say so. `wrongWay` is for a challenge
  // that was survived the wrong way, which needs a different sentence from one
  // that was simply missed.
  reopenStep(wrongWay) {
    const step = this.step();
    this.misses++;
    if (this.misses >= CONCEDE_AFTER) {
      this.say(CONCEDED);
      this.retireAttempt();
      this.settleT = SETTLE_T;
      return;
    }
    const touch = Input.isTouchDevice();
    const line = wrongWay && step.wrongWay ? step.wrongWay(touch) : step.again(touch);
    this.say(line);
    this.clearWitness();
    this.retireAttempt();
    // The next attempt comes back close — see RETRY_AHEAD. The flag is set only
    // around the setup call so nothing else in the section's life is affected
    // by it, and it is cleared before anything can read it stale.
    this.retrying = true;
    step.setup(this);
    this.retrying = false;
  }

  // Coins outlive the section that spawned them. A coin still in the air, or
  // still ahead of the hero, is not the next section's business — but wiping it
  // is money taken out of the player's hands by the one module that just taught
  // them to pick it up, and a box popped late throws its payout FORWARD, so the
  // section boundary lands in the middle of the arc more often than not.
  //
  // Marked rather than moved to a second list: a stray still collects, draws and
  // scrolls exactly like any other pickup. What it is not is evidence in
  // anybody's judgement — an uncollected coin left over from section three must
  // never be able to reopen section five.
  retireCoins() {
    this.retiredPickups.push(...this.pickups.filter((p) => p.live && !p.def.coin));
    this.pickups = this.pickups.filter((p) => p.live && p.def.coin);
    for (const p of this.pickups) p.stray = true;
  }

  clearEntities() {
    this.obstacles = [];
    this.pickups = [];
    this.pellets = [];
    this.portal = null;
    this.retiredObstacles = [];
    this.retiredPickups = [];
    this.retiredPortals = [];
  }

  // Move a completed or failed attempt out of gameplay without taking it out
  // of the picture. Retired props cannot collide, collect, tag or participate
  // in section judgement; the scrolling camera simply carries them away.
  retireAttempt({ pickups = true } = {}) {
    this.retiredObstacles.push(...this.obstacles.filter((ob) => ob.live));
    if (pickups) {
      this.retiredPickups.push(...this.pickups.filter((pu) => pu.live));
      this.pickups = [];
    }
    // Hit portals retire too, now that a used one has something left to show.
    // A missed one starts wilting from here — retireAttempt runs on the frame
    // the section is judged, which for a portal section is the frame the hero
    // went past it.
    if (this.portal) {
      if (this.portal.spent == null && this.portal.wilt == null) this.portal.wilt = 0;
      this.retiredPortals.push(this.portal);
    }
    this.obstacles = [];
    this.pellets = [];
    this.portal = null;
  }

  // A miss costs a knock, not a life — and the shield, if it is still up, costs
  // nothing at all. The hazard breaks out of the way either way, so the hero is
  // never dragged along by something they already failed to clear.
  // `label` is the floatie. It defaults to the section-failure wording, which is
  // wrong in a free-play stretch: the section there has already been logged, so
  // reporting INCOMPLETE over a pass reads as the pass being taken back.
  knock(ob, label = 'INCOMPLETE') {
    if (this.shield > 0) {
      this.shield = 0;
      this.player.iframes = 1.2;
      shake(3, 0.2);
      Audio.sfx('shield');
      burst(this.playerWorldX() + 6, GROUND_Y - this.player.y - 12, 18, 140, 0.5, '#a8e6ff', 1, 120,
        () => this.rng.float());
      this.floatText('SHIELD BROKE. IT DID ITS JOB.', '#a8e6ff');
      this.say(SHIELD_BROKE);
      if (ob) this.breakObstacle(ob);
      return;
    }
    this.player.iframes = 1.2;
    shake(3, 0.2);
    Audio.sfx('hit');
    if (ob) this.breakObstacle(ob);
    this.floatText(label, '#e04848', true);
  }

  breakObstacle(ob) {
    ob.live = false;
    ob.broken = true;
    const cx = ob.x + ob.w / 2;
    const cy = GROUND_Y - ob.alt - ob.h / 2;
    const d = DEBRIS[ob.type] || DEBRIS_DEFAULT;
    Audio.sfx('debris', { mat: d.mat });
    if (this.settings.reducedMotion) return;
    const rand = () => this.rng.float();
    const bulk = Math.min(2, (ob.w * ob.h) / 140);
    shardBurst(cx, cy, Math.round((d.count || 9) * (0.7 + bulk * 0.3)), 78, 0.75, d.colors, {
      size: d.size, grav: d.grav ?? 340, floor: GROUND_Y, rand,
    });
    if (d.spark) burst(cx, cy, 5, 110, 0.22, d.spark, 1, 30, rand);
  }

  // The ! crate: an objective, not a hazard. run.js makes the same exception —
  // jumping into one has to open it rather than hurt, or the prop teaches the
  // opposite of what it is for.
  popQbox(ob) {
    ob.live = false;
    ob.broken = true;
    this.sawQbox = true;
    const cx = ob.x + ob.w / 2;
    const cy = GROUND_Y - ob.alt - ob.h / 2;
    Audio.sfx('blockBreak');
    shake(1.5, 0.13);
    if (!this.settings.reducedMotion) {
      const rand = () => this.rng.float();
      burst(cx, cy, 14, 88, 0.55, '#f6d33c', 1.4, 190, rand);
      burst(cx, cy, 8, 135, 0.3, '#fff8d0', 1, 40, rand);
      burst(cx, cy, 6, 46, 0.7, '#a8791f', 1, 210, rand);
    }
    this.tossCoins(cx, ob.def.bonusCoins || 3, ob.alt + ob.h);
  }

  // Coins fan out ahead faster than the lane scrolls, bounce once, settle, and
  // then come back to the hero as the world catches up — the same arc run.js
  // gives them, which is what makes a popped box read as paying out.
  tossCoins(x, n, alt = 14) {
    Audio.sfx('coinSpray', { count: n });
    for (let i = 0; i < n; i++) {
      const p = makePickup('coin', x + this.rng.range(0, 6), alt);
      p.toss = true;
      p.vx = this.speed * (1.55 + 0.16 * i) + this.rng.range(0, 40);
      p.vy = this.rng.range(110, 165);
      this.pickups.push(p);
    }
  }

  // Free play runs until the lane it spawned has actually gone past, not until
  // a stopwatch says so. The fixed five seconds this used to run on expired
  // wherever the coins happened to be — mid-arc, mid-reach — and then wiped
  // them, so the reward for the section that teaches you to collect things was
  // watching them evaporate out of your hands. Nothing is swept out from under
  // the player now: whatever was laid down is laid down until the hero has
  // driven past the last of it, plus `tail` of empty lane to land on.
  freePlayUntilLaneClears(tail) {
    let last = this.worldX;
    for (const e of [...this.obstacles, ...this.pickups]) last = Math.max(last, e.x + e.w);
    // A portal laid down at the end of the stretch is part of the stretch. It is
    // not in either array, so without this the settle expires on the last crate
    // and the doorway is swept off the lane before the hero reaches it.
    if (this.portal && !this.portal.hit) last = Math.max(last, this.portal.x + 12);
    const travel = (last - this.playerWorldX()) / Math.max(1, this.speed);
    this.settleT = Math.max(SETTLE_T, travel + tail);
  }

  // After the coins section closes, the lane fills up: coins by the hundred and
  // a row of boxes, none of which can hurt you. The training wheels come off
  // for a stretch and the counter runs away with itself.
  //
  // The size of the pile is the joke's setup, not decoration. Everything here
  // is going to be reclaimed to your face in the epilogue, and a reclaim is
  // only funny in proportion to what you thought you had — so this is deliberate
  // over-payment, a lane that reads as the module having decided to like you.
  spawnPlayground() {
    this.freePlay = true;
    // The one stretch in the module that cannot hurt you. Boxes pop on contact.
    this.freePlayHazards = false;
    const x0 = this.worldX + VIEW_W;
    this.retireCoins();
    this.obstacles = [];
    // The brief is FILLED: at any instant the frame should hold coins on the
    // floor, coins at head height and coins at the top of a jump, so there is
    // no way to look at the lane and see a gap. The numbers below are picked
    // against the visible width rather than in the abstract — at ZOOM 2 the
    // frame is VIEW_W (240) world px wide, so a 76px arc pitch puts three arcs
    // on screen at once and a 13px floor pitch puts eighteen coins under them.
    // How much lane the payout covers. A duration, expressed as a distance:
    // 1000 at 112 is about nine seconds of free play, which is long enough to
    // stop feeling like a corridor and short enough that the joke it is setting
    // up still arrives. The density below is what makes it feel generous — the
    // length was doing none of that work.
    const RUN = 700;
    for (let x = x0; x < x0 + RUN; x += 76) {
      this.pickups.push(...coinArc(x + this.rng.range(0, 10), 7 + Math.floor(this.rng.range(0, 5)),
        this.player.heroId));
    }
    // The floor, paved. Nothing in this stretch pays nothing.
    for (let x = x0; x < x0 + RUN; x += 13) {
      this.pickups.push(makePickup('coin', x + this.rng.range(-4, 4), 8));
    }
    // A high band above the arcs, at the altitude a held jump tops out on, so
    // the payout rewards jumping through it rather than only running under it.
    for (let x = x0 + 40; x < x0 + RUN; x += 22) {
      this.pickups.push(makePickup('coin', x + this.rng.range(-5, 5), this.rng.range(56, 82)));
    }
    // Boxes to open, staggered so they arrive in a steady stream rather than
    // all at once. Every one of them is a headbutt and three more coins.
    for (let i = 0; i * 118 < RUN; i++) {
      const box = makeObstacle('qcrate', x0 + 80 + i * 118);
      box.alt = 60;
      this.obstacles.push(box);
    }
    // Why the coins are worth having — the setup the epilogue's reclaim is the
    // punchline to. He is not being kind; he is reading out the benefit line of
    // a form, and Dolores is a real counter in the food court, so the sell is
    // accurate and still sounds like a threat.
    this.say(PAYOUT_1, 5.5);
    this.sayIn(6.5, PAYOUT_2, 5.5);
    this.freePlayUntilLaneClears(1.5);
  }

  // After the shoot section, a gallery of varied targets rolls past so B-33P
  // can unload the cannon a few more times before the module ends.
  spawnShootGallery() {
    this.freePlay = true;
    // A range of live hazards, not a reward lane. Shoot them or duck them; the
    // one thing that must not work is walking through them.
    this.freePlayHazards = true;
    const x0 = this.worldX + VIEW_W;
    this.obstacles = [];
    // Two things to shoot, and then the way out. Both at the altitude the
    // cannon actually reaches from a standing hero.
    //
    // Two separate things were wrong here. The cannon is on a 1.35s cooldown
    // (1.8 x B-33P's 0.75 mult), which at training speed is 151px of lane per
    // shot — and this held ten shootable props inside 660px, an average of 66px
    // apart. Two thirds of them arrived while the orb was still refilling and
    // sailed past untouched. Ten props and three possible shots does not read as
    // a gallery; it reads as a cannon that is broken.
    //
    // Worse, most of them were out of reach even with a full charge. A pellet
    // leaves at the hero's own height (player.y + 8) and its box spans 8px, so
    // against entityBox it only ever meets a prop at alt < 12. A drone sits at
    // 11 — which is why the section's own drone works — but a buzzbird defaults
    // to 34 and a target to 40, so both wanted a jump-and-shoot the module never
    // teaches. The row of things you could not hit was doing the confusing.
    //
    // So: one drone, one buzzbird pinned down to the same band, 170px apart —
    // 1.52s, against a 1.35s recharge. A kill does NOT refund the cooldown, so
    // that margin is the whole of it: one clear window each, with the orb
    // visibly filling in between. The target prop is gone with them — at a
    // height the cannon can reach it is a thing you run into rather than shoot,
    // which teaches the opposite of the section.
    const GAP = 170;
    const SHOOTABLE_ALT = 11;
    const drone = makeObstacle('drone', x0 + 60);           // what the section just taught
    const bird = makeObstacle('buzzbird', x0 + 60 + GAP);   // unarmoured, different pop
    bird.alt = SHOOTABLE_ALT;
    this.obstacles.push(drone, bird);
    // And the way home, at the end of it. The last portal used to be a section
    // of its own — a spawn lead and a settle for a doorway with nothing to get
    // wrong. It goes where it was always going to be run through anyway: past
    // the last target, at the end of the gallery.
    //
    // The module borrowed two bodies to teach two things and hands the first one
    // back before the paperwork. The certificate is made out to whoever is
    // standing there at the end.
    this.portal = { x: x0 + 60 + GAP + 150, hero: 'lorenzo', hit: false };
    this.sayIn(1.2, 'LAST PORTAL. BACK INTO THE BODY YOU CLOCKED IN WITH. HR IS FIRM ON THAT ONE.');
    this.freePlayUntilLaneClears(1.5);
  }

  // The gag, and the honest thing: nothing earned in here was ever going into
  // the save file, so the counter is walked back to zero in front of you.
  //
  // It happens in the epilogue, not the moment the coins section closes. Taking
  // them back seconds after handing them over made the payout feel like a trick
  // question and left six sections to play with a dead zero in the corner;
  // held to the end, the counter climbs all module and Gary reclaims it to your
  // face, which is the joke the line was always written for.
  startClawback() {
    if (this.coins <= 0 || this.clawing) return;
    this.clawing = true;
    this.clawAcc = 0;
    this.clawStart = this.coins;
    this.clawDeathT = 0;
    // He watches the counter go down and he is not pleased about it. It outlasts
    // the drain by a couple of seconds so the face is still on him when the
    // number hits zero.
    this.sulkT = 4.2;
    this.sulkStyle = 3;          // scowl — payroll took the coins
    this.waveT = 0;
    // One coin per tick, the whole till in about a second and a half however
    // much is in it — a fixed per-coin delay would take a playground haul the
    // better part of ten seconds and turn a gag into an audit.
    this.clawStep = Math.max(0.018, Math.min(0.07, 1.5 / this.coins));
    Audio.sfx('uiBad');
  }

  // The counter draining, one coin and one blip at a time. The pitch falls with
  // the total, so the sound of it is a till running down rather than the same
  // pickup cue fired sixty times.
  updateClawback(dt) {
    if (!this.clawing) return;
    const start = this.clawStart || 1;
    this.clawAcc += dt;
    while (this.clawing && this.clawAcc >= this.clawStep) {
      this.clawAcc -= this.clawStep;
      this.coins = Math.max(0, this.coins - 1);
      Audio.sfx('coin', { pitch: 0.72 + 0.5 * (this.coins / Math.max(1, start)) });
      if (this.coins === 0) this.endClawback();
    }
  }

  endClawback() {
    if (!this.clawing) return;
    this.clawing = false;
    this.clawStart = 0;
    this.coins = 0;
    // Let the final coin extraction land before the arcade dies. The pause is
    // deliberately stateful rather than a blocking wait, so the tutorial keeps
    // updating and drawing the reclaimed counter during the beat.
    this.clawDeathT = CLAW_DEATH_PAUSE;
    this.floatText('RECLAIMED', '#e04848');
  }

  updateClawbackDeath(dt) {
    if (this.clawDeathT <= 0) return;
    this.clawDeathT -= dt;
    if (this.clawDeathT <= 0) {
      this.clawDeathT = 0;
      // The till hits zero and the arcade itself dies: the Pac-Man death
      // jingle, sweeps and all. The clean gap keeps it from landing on the
      // final coin's extraction blip.
      Audio.sfx('pacDeath');
    }
  }

  // ---- the mandated celebration --------------------------------------------

  // Streamers and confetti, thrown by nobody in particular — HR does not say
  // who throws them and Gary is certainly not going to. Both are foil (see
  // spawnFoil): paper that flips over as it falls, shows its own shadowed back
  // when it does, drifts on a sway of its own, and flashes an edge-on glint on
  // the way past. They land on the groundline and settle there, which is what
  // makes the sweep two beats later worth doing.
  startParty() {
    this.partyT = PARTY_T;
    this.partyAcc = 0;
    this.sulkT = 0;
    this.waveT = 0;
    Audio.sfx('win');
    if (this.settings.reducedMotion) return;
    // The opening pop: a double handful over each of them, thrown up so it
    // arrives on the way down rather than appearing overhead. Foil forgets the
    // throw within a beat, so this is an arc that turns into a flutter.
    const rand = () => this.rng.float();
    for (const wx of [this.playerWorldX() + 6, this.worldX + GARY_STOP_X]) {
      foilBurst(wx, GROUND_Y - 46, 14, 62, PARTY_INK, {
        size: 2.6, life: 6, floor: GROUND_Y, ribbonChance: 0.3, rand,
      });
      // A few sparks of plain shrapnel underneath the foil: the pop of the
      // popper itself, gone in a third of a second, so the throw has a moment
      // of grit before the paper takes over.
      burst(wx, GROUND_Y - 46, 6, 84, 0.3, '#fff8d0', 1.2, 160, rand);
    }
    this.dropStreamers(7);
  }

  // The drip: while the step is open, paper keeps arriving from above the top
  // of the frame across the whole visible lane.
  updateParty(dt) {
    if (this.partyT <= 0 || this.settings.reducedMotion) return;
    this.partyAcc += dt;
    while (this.partyAcc >= 0.09) {
      this.partyAcc -= 0.09;
      this.dropStreamers(2);
    }
  }

  // `n` pieces entering from above the frame. The visible lane is only VIEW_W /
  // zoom world px wide at the pushed-in ending, so the spread is measured off
  // the live zoom rather than off a constant — at 3.2 a screen-width scatter
  // would put nine tenths of it off either side.
  dropStreamers(n) {
    const span = W / this.camZoom;
    const top = GROUND_Y - (H + 30) / this.camZoom;
    const rand = () => this.rng.float();
    for (let i = 0; i < n; i++) {
      const x = this.worldX + this.rng.range(-8, span + 8);
      const ribbon = this.rng.float() < 0.5;
      const ink = PARTY_INK[Math.floor(this.rng.range(0, PARTY_INK.length)) % PARTY_INK.length];
      // Lifetimes outlast the step on purpose: what lands has to still be lying
      // there two beats later, or the sweep has nothing to take back.
      spawnFoil(x, top + this.rng.range(0, 14), ink, {
        vx: this.rng.range(-10, 10), vy: this.rng.range(8, 20), life: 6,
        w: ribbon ? 1.9 : this.rng.range(1.9, 2.9),
        h: this.rng.range(1.9, 2.9),
        ribbon, len: this.rng.range(8, 13),
        // The paper does not all fall at one speed — a spread here is what
        // stops the drip reading as rows arriving on a conveyor.
        vt: this.rng.range(26, 46),
        floor: GROUND_Y, rand,
      });
    }
  }

  // He takes the streamers back. Same cue as the coins, for the same reason —
  // it is the same joke, and Stores is the department on his signature line.
  sweepParty() {
    this.partyT = 0;
    this.cheering = false;
    clearParticles();
    Audio.sfx('uiBad');
    this.floatText('STREAMERS RECLAIMED', '#e04848');
    // Eyebrow-hoist eyeroll — the "are you kidding me" face. Different from
    // the coin-reclaim scowl so the two beats read as distinct reactions.
    this.sulkT = 3.5;
    this.sulkStyle = 2;
  }

  // ---- talk ----------------------------------------------------------------

  // Infinity, not a countdown. What he last said stays up until he says the
  // next thing, so there is never a stretch of this module with nothing written
  // on it — a player who was watching the lane when a line arrived can look up
  // afterwards and it is still there. The epilogue paces itself off its own
  // beat clock rather than off this expiring, which is what the countdown used
  // to be doing double duty as.
  say(text, t = Infinity) {
    const speech = { text, t, who: 'gary', showName: !this.garyIntroduced };
    this.garyIntroduced = true;
    this.speech = speech;
    // Kept past its own expiry for the pause screen. A player who pauses is
    // usually pausing to keep an instruction in view, so the pause is where the
    // last thing he said lives even if a timed line has expired.
    this.lastSaid = { ...speech };
  }

  // A second line, later in the same stretch. The payout runs for the better
  // part of fifteen seconds and one five-second line leaves ten of them silent,
  // which reads as the module having wandered off rather than as a pause.
  sayIn(delay, text, hold) {
    this.pending = { t: delay, text, hold };
  }

  // Longer-lived than a run's barks. In a stage a floatie is confirmation of
  // something you already felt happen; here it is often the only report that a
  // section closed, and it competes with a speech panel for the same glance —
  // so it gets a couple more seconds to be noticed and read.
  floatText(text, color, solid = false) {
    // The same lane-derived row the run uses — the lesson that introduces the
    // toaster is the one place a card most needs to stay off it.
    let y = floatBaseY();
    for (const f of this.floaties) if (f.y + 19 > y) y = f.y + 19;
    this.floaties.push({ text, color, t: 3.2, y, solid });
    if (this.floaties.length > 5) this.floaties.shift();
  }

  // How Gary's card is laid out on this device. Touch takes the bigger type,
  // the wider wrap and the lower anchor as one set — they only work together,
  // since bigger lettering in the same box just wraps to more lines and a wider
  // box at the old anchor prints over the coin pill.
  speechOpts() {
    if (!Input.isTouchDevice()) {
      return { light: true, plate: SPEECH_PLATE, y: SPEECH_Y, maxWidth: SPEECH_MAX_W };
    }
    return {
      light: true, plate: SPEECH_PLATE, y: SPEECH_Y_TOUCH,
      maxWidth: SPEECH_MAX_W_TOUCH, scale: SPEECH_SCALE_TOUCH,
    };
  }

  // ---- geometry ------------------------------------------------------------

  playerWorldX() { return this.worldX + PLAYER_X; }
  playerBox() { return this.player.box(this.worldX, GROUND_Y); }

  hitObstacle() {
    if (this.player.iframes > 0) return null;
    const pbox = this.playerBox();
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      if (overlaps(pbox, entityBox(ob, GROUND_Y))) return ob;
    }
    return null;
  }

  // ---- update --------------------------------------------------------------

  update(dt) {
    this.prevWorldX = this.worldX;
    this.prevT = this.t;
    this.t += dt;
    updateShake(dt, () => this.rng.float());
    updateParticles(dt);

    // Pause toggles: escape/back pauses; escape while paused exits.
    if (Input.pressed('pause')) {
      this.paused = !this.paused;
      if (this.paused) { this.pauseIdx = 0; Audio.sfx('ui'); this.enterPauseButtons(); Input.setMenuKeys(true); }
      else { Input.setMenuKeys(false); Input.setButtons([]); this.setButtons(); }
    }
    if (Input.pressed('escape') || Input.pressed('back')) {
      if (this.paused) {
        Audio.sfx('ui');
        Input.endFrame();
        this.onDone();
        return;
      }
      this.paused = true;
      this.pauseIdx = 0;
      Audio.sfx('ui');
      this.enterPauseButtons();
      Input.setMenuKeys(true);
    }

    if (this.paused) {
      this.updatePauseMenu();
      Input.endFrame();
      return;
    }
    // The first tap of a session, or a rotation, changes where the controls
    // belong — see setButtons().
    if (Input.usingTouch !== this.touchButtons || chromeGeo.mode !== this.chromeMode) this.setButtons();

    if (this.speech) {
      this.speech.t -= dt;
      if (this.speech.t <= 0) this.speech = null;
    }
    for (const f of this.floaties) { f.t -= dt; f.y -= dt * 12; }
    this.floaties = this.floaties.filter((f) => f.t > 0);
    if (this.pending) {
      this.pending.t -= dt;
      if (this.pending.t <= 0) { this.say(this.pending.text, this.pending.hold); this.pending = null; }
    }
    if (this.zoneT > 0) this.zoneT -= dt;
    if (this.waveT > 0) this.waveT -= dt;
    if (this.sulkT > 0) this.sulkT -= dt;
    if (this.partyT > 0) { this.partyT -= dt; this.updateParty(dt); }
    this.updateClawbackDeath(dt);
    this.updateClawback(dt);

    if (this.finished) {
      this.updateFinished(dt);
      Input.endFrame();
      return;
    }

    // Intro staging: Gary appears in person, then bolts. Until it finishes the
    // lane is frozen and nothing spawns.
    if (this.introPhase < 4) {
      this.updateIntro(dt);
      Input.endFrame();
      return;
    }

    // Ease the lane up to full speed from a standing start — no instant snap.
    if (this.speedRamp < 1) {
      this.speedRamp = Math.min(1, this.speedRamp + dt / 0.35);
      // Ease-out quad so the ramp-in feels like acceleration, not a linear slide.
      const t = 1 - (1 - this.speedRamp) * (1 - this.speedRamp);
      this.speed = TRAINING_SPEED * t;
    }

    this.worldX += this.speed * dt;

    if (Input.pressed('jump')) {
      this.player.jumpPressed(Audio);
      if (this.player.jumps > 1) this.sawDoubleJump = true;
    }
    if (Input.pressed('ability')) this.useAbility();
    this.player.update(dt, Input, { speed: this.speed, gravityScale: 1, ice: false });
    if (this.player.duckAmount > 0.35) this.sawDuck = true;
    this.grantChargeGrace();
    this.updateCamera(dt);

    this.updatePellets(dt);
    this.updateEntities(dt);
    this.sweepRetiredEntities(dt);

    if (this.settleT > 0) {
      this.settleT -= dt;
      // A settle is normally an empty lane, but a free-play settle is a lane
      // full of things the player is meant to be hitting — so the collision
      // pass still has to run through it. Without this the boxes in the payout
      // stretch were scenery: judgeStep is the only thing that opens one, and
      // it was switched off for the entire time they were on screen.
      if (this.freePlay) this.judgeFreePlay();
      if (this.settleT <= 0) this.startStep(this.stepIndex + 1);
    } else {
      this.judgeStep();
    }

    Input.endFrame();
  }

  // ---- intro staging -------------------------------------------------------

  // Gary appears in person at centre-screen, says his piece, then bolts right.
  // Lorenzo enters from the left and settles into position. From then on Gary
  // is only a portrait — a voice on the intercom. The lane is frozen for the
  // whole sequence: the module hasn't started yet.
  // Intro staging, four phases:
  //   0 — Gary walks in from left to centre at tight zoom
  //   1 — Gary stands idle; card up with prompt; waits for input
  //   2 — On input: zoom eases; Gary bolts right. Once Gary is fully off
  //       screen, Lorenzo enters and section 1 brief fires. When Lorenzo
  //       reaches PLAYER_X the module starts immediately.
  //   4 — done (lane scrolling, tutorial running)
  updateIntro(dt) {
    this.introTimer += dt;

    switch (this.introPhase) {
      case 0: {
        // Gary walks in from the left toward centre-screen at tight zoom.
        const centreX = W / (2 * this.camZoom);
        this.garyIntroX += GARY_ENTRY_SPEED * dt;
        if (this.garyIntroX >= centreX) {
          this.garyIntroX = centreX;
          this.introPhase = 1;
          this.introTimer = 0;
          // Card appears only once Gary is in position, with the prompt
          // appended so it reads as part of the same pale plate.
          const prompt = Input.isTouchDevice()
            ? ' TAP ANYWHERE TO START'
            : ' PRESS ANY KEY TO START';
          this.say(OPENING + prompt);
        }
        break;
      }
      case 1: {
        // Gary stands idle at centre. Card is up. Player must press a key or
        // tap to continue — the prompt tells them so. Gary stays locked to
        // screen centre; zoom does NOT change yet.
        this.garyIntroX = W / (2 * this.camZoom);
        // Check for any input to advance.
        if (Input.pressed('confirm') || Input.pressed('jump')
          || Input.pressed('pointer') || Input.pressed('ability')
          || Input.pressed('duck')) {
          this.introPhase = 2;
          this.introTimer = 0;
          // Snapshot where Gary is in world space at the moment of the press,
          // so he runs from there rather than tracking centre.
          // (garyIntroX is already at centre — it stays as the starting point.)
        }
        break;
      }
      case 2: {
        // Gary bolts right. Zoom eases from 5.5x toward 2x across the whole
        // exit — no sudden snap, just a steady settle via easeZoom.
        this.garyIntroX += GARY_INTRO_EXIT_SPEED * dt;
        if (this.camZoom > ZOOM + 0.02) {
          this.camZoom = easeZoom(this.camZoom, ZOOM, dt);
        }
        const visibleW = W / this.camZoom;
        // Lorenzo waits until Gary is fully off screen, then enters.
        // The section 1 brief fires at the same moment.
        if (!this.lorenzoEntering && this.garyIntroX > visibleW + 60) {
          this.lorenzoEntering = true;
          this.lorenzoIntroX = LORENZO_ENTRY_START;
          if (!this.section1Said) {
            this.section1Said = true;
            const step = STEPS[0];
            this.say(step.brief(Input.isTouchDevice()));
          }
        }
        if (this.lorenzoEntering) {
          this.lorenzoIntroX += LORENZO_ENTRY_SPEED * dt;
        }
        // Once Lorenzo reaches position, start the module immediately —
        // no settle gap, the lane just begins scrolling.
        if (this.lorenzoEntering && this.lorenzoIntroX >= PLAYER_X) {
          this.lorenzoIntroX = PLAYER_X;
          this.introPhase = 4;
          this.camZoom = ZOOM;
          this.speedRamp = 0;
          this.startStep(0);
        }
        break;
      }
      default:
        break;
    }
  }

  // The same dolly a run uses: the groundline stays welded to its screen y and
  // the frame cranes up for a tall jump. Mochi's double jump reaches 98px,
  // which is past what the resting frame holds above the line, so without this
  // her apex would clip out of the top of the very section teaching it.
  updateCamera(dt) {
    const want = framingFor(this.player.y, 0);
    this.camPan = easePan(this.camPan, want.pan, dt);
    this.camZoom = easeZoom(this.camZoom, want.zoom, dt);
  }

  // The ending: the lane winds down to a stop, Gary walks on from the right,
  // and he talks. Nothing here is on a fixed clock the player cannot move —
  // every beat also advances on a press.
  updateFinished(dt) {
    const o = this.outro;
    this.doneT += dt;
    // The treadmill stops rather than cuts. The hero's run cycle is driven by
    // world speed, so his legs wind down with it and he settles into a stand
    // without needing a separate animation.
    this.speed = Math.max(0, this.speed - TRAINING_SPEED * dt / OUTRO_STOP_T);
    this.worldX += this.speed * dt;
    this.player.update(dt, Input, { speed: this.speed, gravityScale: 1, ice: false });
    // Push in on the pair rather than tracking the hero's jump — nobody is
    // jumping any more. easeZoom's slow branch (k=4) makes this a drift in over
    // about a second, not a snap.
    this.camPan = easePan(this.camPan, 0, dt);
    this.camZoom = easeZoom(this.camZoom, OUTRO_ZOOM, dt);

    const press = Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer');

    // Gary walks in from the right during the opening beat only. Once he has
    // arrived and the beats have started, this guard stays out of his way —
    // including when he walks off right at the end.
    if (o.garyX > GARY_STOP_X && !o.garyExiting) {
      o.garyX = Math.max(GARY_STOP_X, o.garyX - GARY_WALK_SPEED * dt);
      o.walking = true;
      return;   // he does not talk and walk; he is not paid for two things
    }
    // The moment he arrives, the hero puts a hand up. One of them is pleased to
    // be here.
    if (o.walking) { o.walking = false; this.waveT = 2.6; }

    // The beat clock. Gary's card no longer expires — it stays up until he says
    // the next thing — so the epilogue keeps its own countdown rather than
    // reading "has the speech gone away yet" as "is this beat over yet".
    if (o.holdT > 0) o.holdT -= dt;
    // The pause between the line about the reclaim and the reclaim itself. It
    // exists so the total gets a clean second on screen while the sentence
    // explaining what is about to happen to it is read.
    if (o.clawIn > 0) {
      o.clawIn -= dt;
      if (o.clawIn <= 0) this.startClawback();
    }

    if (o.beat < OUTRO.length) {
      // A finished line, or an impatient player, moves it along.
      if (o.holdT <= 0 || press) {
        o.beat++;
        // Skipping past the reclaim beat does not skip the reclaim: whatever
        // was still owed is taken now, under the next line, rather than being
        // quietly written off because the player was quick with the button.
        if (o.clawIn > 0) { o.clawIn = 0; this.startClawback(); }
        if (o.beat < OUTRO.length) {
          const beat = OUTRO[o.beat];
          this.say(beat.line);
          o.holdT = beat.hold;
          if (beat.clawback) o.clawIn = beat.clawDelay || 0;
          if (beat.clawback && !beat.clawDelay) this.startClawback();
          // Whatever is still on the floor goes back to Stores. Skipping ahead
          // ends the party early too — an impatient player gets the same beats,
          // faster, not a different set of them.
          if (beat.sweep) this.sweepParty();
          else if (beat.party) this.startParty();
          else this.partyT = 0;
        } else {
          // The certificate goes up and he signs it in the same breath. Nothing
          // is allowed to still be counting down behind a signed document, so
          // an impatient player who skipped through the reclaim gets it settled
          // here rather than watching the till drain under the card.
          this.endClawback();
          // Certificate up, and the one person here who is pleased about it
          // celebrates. The sulk is cancelled rather than allowed to run out
          // under the card: the coins are gone and he has decided the piece of
          // paper is worth more.
          this.sulkT = 0;
          this.waveT = 0;
          this.cheering = true;
          this.speech = null;
          o.garyExiting = true;
          Audio.sfx('uiConfirm');
        }
      }
      return;
    }

    // The certificate, then out. Gary walks off to the right while the hero
    // celebrates under the document.
    o.cardT += dt;
    if (o.garyExiting) {
      o.garyX += GARY_WALK_SPEED * 1.2 * dt;
    }
    if (o.cardT > 0.9 && press) {
      this.markTaught();
      this.onDone();
    }
  }

  // Training just taught the portal and the ability button, so the first real
  // run has no reason to teach them again — those prompts fire once per save.
  markTaught() {
    if (!this.save || !this.save.slot) return;
    const t = this.save.slot.tutor || (this.save.slot.tutor = {});
    t.firstPortal = true;
    t.firstAbility = true;
    this.save.persist();
  }

  useAbility() {
    // Only B-33P's cannon is taught here, and it is the only hero whose USE
    // disc is on screen. Every other ability in the game moves the hero around
    // in ways this lane has nothing to say about yet.
    const hero = this.player.hero;
    if (hero.ability.type !== 'shoot' || this.player.abilityCd > 0) return;
    // The zone card has done its job the moment a shot comes out of the right
    // half of the screen; it fades rather than cutting so the connection
    // between the tap and the card going away is visible.
    if (this.zoneT > 0.4) this.zoneT = 0.4;
    Audio.sfx('launch', { hero: 'b33p', pitch: 1.08 });
    this.pellets.push({ x: this.playerWorldX() + 12, alt: this.player.y + 8, live: true });
    this.player.abilityCd = hero.ability.cooldown * (hero.ability.cooldownMult || 1);
    this.player.powerType = 'shoot';
    this.player.powerPoseT = 0.3;
    this.floatText('PEW', '#f6d33c');
    // The cooldown was never explained anywhere in the module, and the orb that
    // reports it had been floating beside the hero since section one with
    // nothing to report. It is explained on the FIRST shot rather than in the
    // brief, because until you have fired once the orb is empty of meaning:
    // now it is visibly draining, and the sentence lands on a thing the player
    // is already looking at.
    if (!this.taughtCooldown) {
      this.taughtCooldown = true;
      this.sayIn(1.3, COOLDOWN, 5.5);
    }
  }

  updatePellets(dt) {
    for (const pr of this.pellets) {
      if (!pr.live) continue;
      pr.x += (this.speed + 260) * dt;
      if (pr.x > this.worldX + VIEW_W + 40) { pr.live = false; continue; }
      const pbox = { x: pr.x, y: GROUND_Y - pr.alt - 4, w: 8, h: 8 };
      for (const ob of this.obstacles) {
        if (!ob.live) continue;
        if (!overlaps(entityBox(ob, GROUND_Y), pbox)) continue;
        const ix = pr.x + 4;
        const iy = GROUND_Y - ob.alt - ob.h / 2;
        Audio.sfx('contact', { hero: 'b33p', pitch: 1.12 });
        shake(1.1, 0.07);
        if (!this.settings.reducedMotion) {
          const rand = () => this.rng.float();
          burst(ix, iy, 9, 86, 0.32, '#fff8d0', 1.15, 80, rand);
        }
        this.breakObstacle(ob);
        this.sawShotDown = true;
        pr.live = false;
        break;
      }
    }
    this.pellets = this.pellets.filter((p) => p.live);
  }

  updateEntities(dt) {
    for (const pu of this.pickups) {
      if (!pu.live) continue;
      // Tossed coins arc out of a popped box and settle on the ground, exactly
      // as they do in a run.
      if (pu.toss) {
        pu.x += pu.vx * dt;
        pu.alt += pu.vy * dt;
        pu.vy -= 700 * dt;
        if (pu.alt <= 8) {
          pu.alt = 8;
          pu.vy = -pu.vy * 0.35;
          pu.vx *= 0.9;
          if (pu.vy < 40) { pu.vy = 0; pu.vx = 0; pu.toss = false; }
        }
      }
      if (!overlaps(this.playerBox(), entityBox(pu, GROUND_Y))) continue;
      pu.live = false;
      this.collect(pu);
    }
    // A retired coin is swept up only once it is genuinely gone — behind the
    // hero and off the back of the frame — rather than at the moment its
    // section ended. Nothing the player can still reach is ever removed.
    if (this.pickups.some((p) => p.stray)) {
      this.pickups = this.pickups.filter((p) => !p.stray || (p.live && p.x + p.w > this.worldX - 8));
    }

    if (this.portal && !this.portal.hit) {
      const pbox = { x: this.portal.x, y: GROUND_Y - PORTAL_H, w: 12, h: PORTAL_H };
      // The same swoosh, at the same strength, fired the same way round as in a real
      // run — see RunState.updatePortal, which explains why it goes off before the
      // crossing rather than on it. The tutorial has its own world and its own portal
      // rather than borrowing RunState's, so anything added there has to be added here
      // too or the one place the portal is TAUGHT is the one place it makes no sound.
      if (!this.portal.cued && this.speed > 0) {
        const toGo = this.portal.x - this.playerWorldX();
        // Led by the shape's own seam, not by the bare constant: stretching the cue
        // moves where its middle falls, and hand-authoring 0.20 here would fire a
        // two-and-a-half-times-longer swoosh a quarter of the way through its approach.
        // The rise, unconditionally — see RunState.updatePortal for why this half
        // cannot wait to find out whether the portal is taken.
        // Shorter than the whole gesture — its peak is ~0.25s in rather than ~0.49s —
        // which brings the lead down near the 0.162s in which a late jump can still
        // clear. Close enough that the arc is usually already decided, so it is worth
        // asking: someone visibly airborne and going over gets no sound at all. A jump
        // begun inside the last quarter second still slips through, and nothing can see
        // that coming; the fall in the crossing handler is the half that is never wrong.
        const eta = toGo / this.speed;
        if (eta <= portalCueFlashAt(PORTAL_RELAY_IN)
          && this.player.feetAt(eta, 1) < PORTAL_H) {
          this.portal.cued = true;
          Audio.sfx('portal', { gain: PORTAL_RELAY_IN_GAIN, shape: PORTAL_RELAY_IN });
        }
      }
      if (overlaps(this.playerBox(), pbox)) this.tagIn();
    }
  }

  sweepRetiredEntities(dt) {
    const left = this.worldX - 8;
    this.retiredObstacles = this.retiredObstacles.filter((ob) => ob.x + ob.w > left);
    this.retiredPickups = this.retiredPickups.filter((pu) => pu.x + pu.w > left);
    this.retiredPortals = this.retiredPortals.filter((portal) => portal.x + 12 > left);
    // Retired props are inert, but a retired PORTAL is still finishing a
    // sentence: its collapse or its wilt runs on here until the camera has
    // carried it away.
    if (this.portal?.spent != null) this.portal.spent += dt;
    for (const portal of this.retiredPortals) {
      if (portal.spent != null) portal.spent += dt;
      else if (portal.wilt != null) portal.wilt += dt;
    }
  }

  collect(pu) {
    if (pu.def.coin) {
      this.coins += 1;
      this.paidOut = true;
      Audio.sfx('coin');
      return;
    }
    // The appliance keeps the fanfare a run gives it — the 'win' jingle and the
    // full joke in the floatie — because the whole point of teaching it here is
    // that a player meeting one in a real cabinet recognises what just
    // happened. It pays no coins: nothing in this room is legal tender, and a
    // toaster that quietly topped up a counter about to be confiscated would be
    // teaching the wrong lesson twice.
    if (pu.def.appliance) {
      this.sawToaster = true;
      Audio.sfx('win');
      burst(pu.x + pu.w / 2, GROUND_Y - pu.alt - pu.h / 2, 16, 90, 0.55, '#f6d33c', 1.3, 120,
        () => this.rng.float());
      this.floatText('THE HIGHLY NECESSARY GOLDEN APPLIANCE. IT IS A TOASTER.', '#f6d33c');
      return;
    }
    Audio.sfx('power');
    burst(pu.x + pu.w / 2, GROUND_Y - pu.alt - pu.h / 2, 10, 70, 0.4, '#72d8f0', 1, 60,
      () => this.rng.float());
    if (pu.type === 'capShield') {
      this.shield = 1;
      this.floatText('SHIELD', '#a8e6ff');
    }
  }

  // The same beats as run.js doSwitch: the hero changes, the tag sounds, and
  // the swap throws teal. Reads the target hero from the portal entity itself
  // rather than from the current step, so a portal spawned during a non-portal
  // section's onPass still works.
  tagIn() {
    this.portal.hit = true;
    // Starts the discharge strip. The portal is not removed here — retireAttempt
    // hands it to retiredPortals, which keeps drawing it while it collapses and
    // rides off the back of the frame. See RunState.portalDischarge for what the
    // two kinds of particle mean; the tutorial has its own world and its own
    // portal, so anything added there has to be added here too or the one place
    // the portal is TAUGHT is the one place it does not react.
    this.portal.spent = 0;
    this.player.setHero(this.portal.hero);
    this.player.tagFlashT = TAG_FLASH_TIME;
    this.player.abilityCd = 0;
    this.setButtons();
    Audio.sfx('tag');
    // The fall, on the crossing itself — the half that means a tag actually happened.
    Audio.sfx('portal', { gain: PORTAL_RELAY_GAIN, shape: PORTAL_RELAY_OUT });
    const cx = this.portal.x + 6;
    const rand = () => this.rng.float();
    burst(cx, GROUND_Y - 26, 12, 54, 0.34, '#c8fff0', 1, 14, rand);
    burst(cx, GROUND_Y - 8, 8, 40, 0.28, '#48e0c8', 1, 30, rand);
    for (let i = 0; i < 3; i++) {
      spawnShard(cx, GROUND_Y - 32 + i * 9, this.speed * (1.15 + i * 0.08), -6 - i * 3,
        0.3 + i * 0.04, i ? '#3fa9a0' : '#c8fff0', 7 - i * 1.6, 1.4, 0, 0, Infinity);
    }
  }

  // Free play: the lane is full and none of it can fail you. Boxes pop, crates
  // and drones come apart on contact, and a hit costs nothing — a section that
  // has already been logged is not allowed to reopen because of something that
  // happened during its own victory lap.
  judgeFreePlay() {
    const hit = this.hitObstacle();
    if (!hit) return;
    if (hit.def.isTarget) { this.popQbox(hit); return; }
    // Two kinds of free-play stretch, and they cannot share this rule.
    //
    // The coin payout is a declared no-fail lane: nothing in it can hurt you,
    // boxes pop on contact, and that is the whole promise the section makes. The
    // shoot gallery is the opposite — it is a range of live hazards, and running
    // a drone down with your face was quietly breaking it instead of hitting
    // you, which taught that the cannon is optional and that drones are
    // harmless. Both then carry into the real game as wrong.
    if (this.freePlayHazards) { this.knock(hit, 'CONTACT'); return; }
    // Not a knock: it just breaks. The brief iframes keep a stack of crates
    // from being resolved one per frame as the hero ploughs through it.
    this.player.iframes = 0.4;
    this.breakObstacle(hit);
  }

  // Has the section closed, or has it failed to? Everything here is measured
  // against the hero's own column: a challenge is resolved the moment it is
  // behind them.
  judgeStep() {
    const step = this.step();
    if (!step) return;
    const heroX = this.playerWorldX();

    const hit = this.hitObstacle();
    if (hit) {
      // Targets are objectives, not hazards — running into one opens it.
      if (hit.def.isTarget) this.popQbox(hit);
      else { this.knock(hit); this.reopenStep(false); return; }
    }

    if (this.portal) {
      if (this.portal.hit) this.passStep();
      else if (this.portal.x + 12 < heroX) this.reopenStep(true);
      return;
    }

    // Strays — coins carried over from an earlier section — are deliberately
    // not in here. They are the player's to collect, not the section's to be
    // judged on. Retired obstacles are held in a separate draw-only array.
    const mine = this.pickups.filter((p) => !p.stray);
    const spawned = [...this.obstacles, ...mine];
    if (!spawned.length) return;
    // Unresolved while any part of the challenge is still standing and not yet
    // behind the hero. A broken one counts as resolved wherever it is.
    if (spawned.some((e) => e.live && e.x + e.w >= heroX)) return;

    // An optional section closes whichever way it went; only the commentary
    // forks. It gets a longer settle than a normal pass because the line Gary
    // has just said is the entire content of the section — there is nothing
    // else to have taken away from it.
    if (step.optional) {
      const got = step.done(this);
      this.say(got ? step.got() : step.missed());
      this.passStep(got);
      // A floor, not an assignment. passStep runs onPass, and an onPass with a
      // portal to reach in it knows better than this line does how much lane it
      // needs — clobbering the value it just set would strand the portal past
      // the end of the settle.
      this.settleT = Math.max(this.settleT, 3.0);
      return;
    }

    if (!step.optionalPickups && mine.some((p) => p.live)) { this.reopenStep(false); return; }
    if (step.requires && !step.requires(this)) { this.reopenStep(true); return; }
    this.passStep();
  }

  // ---- draw ----------------------------------------------------------------

  draw(ctx, renderAlpha = 0) {
    const alpha = Math.max(0, Math.min(1, Number.isFinite(renderAlpha) ? renderAlpha : 0));
    // The simulation remains fixed-step. Interpolate the camera and animation
    // clock between the last two completed states, keeping the lane and every
    // obstacle on one continuous camera clock without predicting into the
    // future. Paused updates deliberately hold the current state.
    const previousWorldX = Number.isFinite(this.prevWorldX) ? this.prevWorldX : this.worldX;
    const previousT = Number.isFinite(this.prevT) ? this.prevT : this.t;
    const cam = this.paused
      ? this.worldX
      : previousWorldX + (this.worldX - previousWorldX) * alpha;
    const renderT = this.paused
      ? this.t
      : previousT + (this.t - previousT) * alpha;
    const z = this.camZoom;
    const pan = this.camPan;

    ctx.save();
    ctx.translate(0, pan);
    TRAINING_PACK.bg(ctx);
    ctx.restore();

    ctx.save();
    applyWorld(ctx, z, pan);
    TRAINING_PACK.ground(ctx, cam);
    // Lights before the props: a crate stands IN the light, not under a wash.
    TRAINING_PACK.lights(ctx, cam);

    for (const pu of this.retiredPickups) {
      drawWorldEntity(ctx, pu, cam, renderT, TRAINING_PACK, this.settings);
    }
    for (const ob of this.retiredObstacles) {
      drawWorldEntity(ctx, ob, cam, renderT, TRAINING_PACK, this.settings);
    }
    for (const portal of this.retiredPortals) drawPortal(ctx, portal, cam, renderT, z, true, this.settings);
    for (const pu of this.pickups) {
      if (pu.live) drawWorldEntity(ctx, pu, cam, renderT, TRAINING_PACK, this.settings);
    }
    for (const ob of this.obstacles) {
      if (ob.live) drawWorldEntity(ctx, ob, cam, renderT, TRAINING_PACK, this.settings);
    }
    // Hit portals keep drawing: they are mid-collapse until retireAttempt moves
    // them into retiredPortals, and hiding them for those frames would put a
    // hole exactly where the discharge is.
    if (this.portal) drawPortal(ctx, this.portal, cam, renderT, z, true, this.settings);
    for (const pr of this.pellets) {
      const x = pr.x - cam, y = Math.round(GROUND_Y - pr.alt - 4);
      ctx.fillStyle = '#f6d33c';
      ctx.beginPath(); ctx.arc(x + 3, y + 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff0a0';
      ctx.fillRect(x + 2, y, 2, 1);
    }
    drawParticles(ctx, cam);
    ctx.restore();

    // The hero renders above the backbuffer at device resolution and pushes its
    // own overlay callback, so anything that has to sit either side of them has
    // to go through the same queue — the order these are pushed in IS the
    // z-order.
    //
    // Gary's card goes UNDER the hero. It is the biggest opaque object on the
    // screen and it is up for most of the module, so with it on top a tall jump
    // put the character you are steering behind a menu. The hero is never
    // allowed to be the thing that gets covered: everything else on this screen
    // is a readout, and a readout can wait behind the person jumping.
    // Declared during draw, committed centrally by states.js — an empty frame
    // clears the margin once and then no-ops, so this is safe to call on every
    // frame including the ones where there is nothing out there.
    this.drawChromeButtons();
    if (!this.paused) pushOverlayDraw((d) => this.drawSpeechCard(d));
    // Once the treadmill has stopped the controller still reports a RUN — it
    // only knows run/jump/duck — so the hero held whatever stride frame the
    // lane died on for the whole epilogue. He stands instead, and waves when
    // there is someone to wave at.
    const stopped = this.finished && this.speed < 4;
    // During the intro Gary and Lorenzo are drawn as toons on the world layer;
    // the normal player (Lorenzo) is not drawn until the intro finishes.
    if (this.introPhase < 4) {
      this.drawIntroCharacters(ctx, z, pan);
    } else {
      drawHeroSprite(ctx, this.player, this.player.heroId, renderT, cam, false, {
        settings: this.settings, shield: this.shield, zoom: z, pan,
        pose: stopped ? this.outroPose() : null,
        specialOrb: this.hasPower(),
      });
    }
    pushOverlayDraw((d) => this.drawUi(d));
  }

  // Gary talking. Its own layer because of where it sits in the z-order (under
  // the hero, over the lane) — the pause screen draws it again on top of its
  // own scrim, where being over the hero is correct.
  drawSpeechCard(ctx) {
    // The zone diagram rides in this layer too, and goes down FIRST: it is a
    // wash over the whole canvas, so with it above the card it tinted Gary's
    // translucent plate yellow down the right-hand side. Under the card, under
    // the hero, over the lane — which is the order it describes.
    if (this.zoneT > 0) this.drawTouchZones(ctx);
    if (!this.speech) return;
    drawSpeech(ctx, this.speech, this.speechOpts());
  }

  // What the hero is doing while the lane stands still. He greets Gary, he
  // scowls at the reclaim, and he celebrates the certificate — three beats that
  // exist so the epilogue is a scene between two characters rather than a
  // speech delivered at a mannequin.
  outroPose() {
    const up = this.cheering || this.partyT > 0;
    return {
      kind: up ? 'celebrate' : 'idle',
      phase: 0,
      headTurn: 0,
      annoyed: !up && this.sulkT > 0 ? 1 : 0,
      // Style 2 is the eyeroll ("give me a break"), style 3 is the scowl.
      madStyle: this.sulkStyle,
      menuAction: !up && this.waveT > 0 ? 'wave' : undefined,
    };
  }

  drawUi(ctx) {
    if (this.paused) { this.drawPaused(ctx); return; }
    const heroX = PLAYER_X * this.camZoom;
    for (const f of this.floaties) {
      drawFloatie(ctx, f, { heroX, alpha: Math.max(0, Math.min(1, f.t / 0.25)) });
    }
    // The coin half of the run's own status pill. Once the module has paid out
    // once, the readout stays up — including at zero, which is where the joke
    // lives, and which is why this is a latch and not `coins > 0`.
    if (this.paidOut) {
      drawStatusPill(ctx, {
        oneHit: false, maxBattery: () => 0, battery: 0, coins: this.coins,
        totalDist: Infinity, distance: 0, tRun: this.t,
      });
    }
    // The zone diagram is NOT drawn here — it goes down with the speech layer,
    // under the hero. It is a wash over the whole canvas, so drawn from here it
    // tinted Gary's translucent card yellow on the right-hand side.
    //
    // The certificate waits until Gary has finished talking, so his bit plays
    // over a clean lane rather than through a scrim.
    const o = this.outro;
    if (o && o.beat >= OUTRO.length) this.drawCertificate(ctx, o.cardT);
    // Gary goes down AFTER the card: he stays lit while everything else dims,
    // which is the composition the ending wants — the certificate prints, and
    // the man who filed it is still standing there.
    if (o) this.drawGary(ctx, o);
    // High, pale, and narrow: high to stay out of the lane, pale because this
    // is a printed HR module and not someone shouting over a stage, and narrow
    // so the centred card never reaches the coin pill or, on touch, the PAUSE
    // disc parked in the top-right corner.
    //
    // The one moment the card gives way is the certificate, and only on touch.
    // The enlarged card runs to y 94 and the certificate starts at 66, so on a
    // phone the two pale plates stack — and the certificate cannot move down to
    // make room without printing over the heads of the two people the whole
    // ending is composed around. The document wins that argument: it is the
    // thing the beat exists to show, and it is already signed.
    // Gary's card is NOT drawn here — it went down as its own layer before the
    // hero, so the hero passes in front of it (see draw()). This comment is the
    // signpost: a card added back into this function would silently start
    // covering the character again.
    if (o && o.beat >= OUTRO.length && o.cardT > 0.9) {
      drawText(ctx, `${Input.confirmVerb()} TO FINISH`, W / 2 - textWidth(`${Input.confirmVerb()} TO FINISH`) / 2,
        H - 26, 'rgba(255,255,255,0.5)');
    }
    // The room label stays up for the epilogue too — it is where you are, not
    // what you are doing. The key legend does not: nothing is being asked of
    // the controls once Gary has walked on.
    this.drawRoomTitle(ctx);
    if (!this.finished) this.drawLegend(ctx);
    // The touch controls, through the shared painter — same discs as a run,
    // and the USE meter reads the real cooldown because roundButtonOpts only
    // ever asks for the player and who they are.
    const shim = { player: this.player, relay: { current: this.player.heroId } };
    for (const b of Input.buttons) {
      if (b.round) drawRoundButton(ctx, b, roundButtonOpts(shim, b));
    }
  }

  // Arrow between the two plates, the same way the run's pause screen works.
  updatePauseMenu() {
    const n = PAUSE_PLATES.length;
    if (Input.pressed('up')) { this.pauseIdx = (this.pauseIdx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('down')) { this.pauseIdx = (this.pauseIdx + 1) % n; Audio.sfx('ui'); }
    if (!Input.pressed('confirm')) return;
    Audio.sfx('uiConfirm');
    if (PAUSE_PLATES[this.pauseIdx].action === 'escape') { this.onDone(); return; }
    this.paused = false;
    Input.setMenuKeys(false);
    Input.setButtons([]);
    this.setButtons();
  }

  // A bare pause screen over the dimmed lane: one line of copy, then the two
  // plates. Matches run.js in tone and placement so the player does not have to
  // learn a second pause layout.
  //
  // Two things make this screen different from the run's. Gary's card stays up
  // — pausing to READ the instruction is the whole reason a training screen has
  // a pause button, and hiding the instruction behind the pause was the exact
  // opposite of that. And the scrim is lighter than a run's, because what is
  // behind it here is an instruction and a lane holding one prop, not a stage
  // that needs suppressing.
  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);
    // Above the scrim, at full strength, and the last line he said if the live
    // one has already timed out — a paused module with nothing written on it is
    // a paused module you cannot read the instruction off.
    const said = this.speech || this.lastSaid;
    if (said) drawSpeech(ctx, said, this.speechOpts());
    drawTextCentered(ctx, 'PAUSED', W / 2, 92, '#fff', 2, 'title');
    drawTextCentered(ctx, 'MANDATORY TRAINING', W / 2, 126, '#8a8a98');
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

  // The two-button surface, drawn on itself — the painter is hud.js's, shared
  // with the campaign's opening stage, which shows the same card to players who
  // never took the training. Only the fade is this module's: the card arrives
  // with the section and leaves with it, over the lane, without stopping it.
  drawTouchZones(ctx) {
    drawTouchZoneCard(ctx, { alpha: Math.max(0, Math.min(1, this.zoneT / 0.4)) });
  }

  // The certificate: a printed document, not an announcement. Pale plate, dark
  // ink, a rule under the title and a signature line — the same light-plate
  // palette drawSpeech uses in the food court, which is the game's existing
  // "this is a physical object with words on it" treatment.
  //
  // It sits in the band between Gary's speech panel and the pair's heads, and
  // it does not dim the scene: the whole point of the ending is watching the
  // two of them stand there, so nothing is allowed to grey them out.
  drawCertificate(ctx, cardT) {
    const k = Math.max(0, Math.min(1, cardT / 0.35));
    const e = k * k * (3 - 2 * k);
    const CW = 306, CH = 88;
    const cx = W / 2;
    // Slots into the band between the speech panel (which bottoms out around
    // 70) and the pair's crowns, which at the pushed-in zoom reach y 155. The
    // card is as large as that band allows and no larger: the whole point of
    // the ending is watching the two of them stand there, so the document is
    // not permitted to grow down over their heads.
    const x = Math.round(cx - CW / 2);
    const y = Math.round(42 - (1 - e) * 5);
    ctx.save();
    ctx.globalAlpha = e;
    drawPanel(ctx, x, y, CW, CH, 4, '#ece9f6',
      { border: 'rgba(26,16,40,0.4)', shadow: true });
    // The engraved double rule that says "document" before a word is read —
    // one hairline box inside another, the way every certificate in every
    // stationery cupboard in the world is printed.
    ctx.strokeStyle = 'rgba(26,16,40,0.30)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, CW - 9, CH - 9);
    ctx.strokeStyle = 'rgba(26,16,40,0.14)';
    ctx.strokeRect(x + 7.5, y + 7.5, CW - 15, CH - 15);
    drawTextCentered(ctx, CERT_HEAD, cx, y + 14, '#6a6280', 0.8, 'bold');
    drawTextCentered(ctx, CERT_TITLE, cx, y + 25, '#1a1028', 1.7, 'title');
    // Made out to whoever is standing there — which, after the last portal,
    // is the body the player clocked in with.
    const who = (HERO_BY_ID[this.player.heroId] || {}).short || 'STAFF';
    ctx.fillStyle = 'rgba(26,16,40,0.22)';
    ctx.fillRect(x + 24, y + 40, CW - 48, 0.5);
    drawTextCentered(ctx, `AWARDED TO ${who}`, cx, y + 46, '#4a4460', 0.85, 'bold');
    drawTextCentered(ctx, CERT_FOOT, cx, y + 57, '#4a4460', 0.7);
    this.drawCertSeal(ctx, x + CW - 30, y + CH - 26);
    ctx.restore();
  }

  // The seal, bottom-right where a seal goes: a notched gold disc with two
  // ribbon tails under it. Authored rather than borrowed from the prop sheet
  // because nothing in the game had one — and a certificate without a seal is
  // a memo with a big title.
  drawCertSeal(ctx, cx, cy) {
    const R = 11;
    ctx.save();
    // Ribbons first, so the disc sits on top of where they attach.
    ctx.fillStyle = '#8a2f3f';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2); ctx.lineTo(cx - 1, cy + 2);
    ctx.lineTo(cx - 2, cy + 17); ctx.lineTo(cx - 7, cy + 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a63c4e';
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy + 2); ctx.lineTo(cx + 6, cy + 2);
    ctx.lineTo(cx + 7, cy + 12); ctx.lineTo(cx + 2, cy + 17);
    ctx.closePath(); ctx.fill();
    // Notched rim: twelve teeth around the disc, the pressed-foil look.
    ctx.fillStyle = '#e0a72c';
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = i % 2 ? R : R - 2;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6d33c';
    ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx - 2.5, cy - 3, 2.4, 0, Math.PI * 2); ctx.fill();
    drawTextCentered(ctx, 'HR', cx, cy - 4, '#7a5a12', 0.65, 'title');
    ctx.restore();
  }

  // Gary, in person, on the same rig the hub draws him with. He walks in facing
  // left — up the lane, against the direction the whole module has been moving
  // — and then stands. The overlay context has no camera on it, so the world
  // transform is recreated here exactly as drawHeroSprite does.
  //
  // He does not join in. Through the celebration step he stands exactly as he
  // was and rolls his eyes (madStyle 2) — the step is logged, the streamers are
  // company property, and being pleased was never on the form.

  // Intro staging: Gary walks in from the left, stands centre-screen while the
  // camera pulls back, then bolts right as Lorenzo enters. Drawn in world space
  // through applyWorld so the zoom scales them.
  drawIntroCharacters(ctx, zoom, pan) {
    ctx.save();
    applyWorld(ctx, zoom, pan);
    // Gary: drawn until he's genuinely off the right edge, regardless of phase.
    const garyOnScreen = this.garyIntroX < W / zoom + 50;
    if (garyOnScreen && this.introPhase <= 3) {
      const running = this.introPhase === 0 || this.introPhase >= 2;
      const garyPose = {
        kind: running ? 'run' : 'idle',
        phase: (this.t * (running ? 1.7 : 0.5)) % 1,
        time: this.t,
        grounded: true,
        facing: 1,            // always facing right — entering, then exiting
        vy: 0,
        annoyed: 0,
        madStyle: 0,
      };
      drawToon(ctx, 'gary', garyPose, this.garyIntroX, GROUND_Y, GARY_INTRO_H);
    }
    // Lorenzo: phase 2, once he's started his run-in.
    if (this.introPhase === 2 && this.lorenzoEntering) {
      const lorenzoPose = {
        kind: 'run',
        phase: (this.t * 1.5) % 1,
        time: this.t,
        grounded: true,
        facing: 1,
        vy: 0,
        annoyed: 0,
        madStyle: 0,
      };
      drawToon(ctx, 'lorenzo', lorenzoPose, this.lorenzoIntroX, GROUND_Y, LORENZO_ENTRY_H);
    }
    ctx.restore();
  }

  drawGary(ctx, o) {
    // faces right — walking OFF stage right, his shift is over.
    const exiting = o.garyExiting && !o.walking;
    const pose = {
      kind: (o.walking || exiting) ? 'run' : 'idle',
      phase: (this.t * ((o.walking || exiting) ? 1.7 : 0.5)) % 1,
      time: this.t,
      grounded: true,
      facing: exiting ? 1 : -1,
      vy: 0,
      annoyed: this.partyT > 0 ? 1 : 0,
      madStyle: 2,
    };
    ctx.save();
    applyWorld(ctx, this.camZoom, this.camPan);
    drawToon(ctx, 'gary', pose, o.garyX, GROUND_Y, GARY_H);
    ctx.restore();
  }

  // The room label, in the food court's and the trophy room's exact bottom-left
  // treatment — gold, bold, baseline H-11, no plate — because this IS one of
  // the arcade's rooms and a player arriving from the hub should not have to
  // work out that it is. Which section of the form you are on rides on the same
  // baseline just after it, in the quieter ink that row uses for everything
  // that is not the name of the place.
  drawRoomTitle(ctx) {
    const TITLE = 'MANDATORY TRAINING';
    const S = 1.1, SUB = 0.85;
    drawText(ctx, TITLE, 8, textYForMid(ROW_MID, S), '#f6d33c', S, 'bold');
    if (this.finished || this.stepIndex < 0) return;
    drawText(ctx, `SECTION ${this.stepIndex + 1}/${STEPS.length}`,
      8 + textWidth(TITLE, S, 'bold') + 10, textYForMid(ROW_MID, SUB),
      'rgba(255,255,255,0.6)', SUB, 'bold');
  }

  // The same legend panel the opening stage of a run puts up, in the same
  // corner, growing as the module teaches more controls. Touch skips it: those
  // buttons label themselves.
  drawLegend(ctx) {
    if (Input.usingTouch || !this.legend.length) return;
    // ESC pauses here; it is the pause screen that offers the way out. It used
    // to be labelled SKIP, which named the second press and not the key.
    const pairs = [...this.legend, ['ESC', 'PAUSE']];
    const S = 0.85, HP = 6, HH = 12;
    const inner = keyLegendWidth(pairs, S);
    // Centred on the same midline as the room title opposite it, so the row
    // reads as one band across the bottom of the screen and not as two.
    const x = W - 8 - (inner + HP * 2), y = ROW_MID - HH / 2;
    drawPanel(ctx, x, y, inner + HP * 2, HH, 4, undefined, PANEL);
    drawKeyLegend(ctx, pairs, x + HP, textYForMid(ROW_MID, S), { scale: S });
  }
}

export { STEPS };
