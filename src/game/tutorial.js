// MANDATORY TRAINING: Gary walks you through the controls, one section at a
// time, in a bare lane with nothing in it but the thing coming toward you.
//
// Two rules hold the whole screen together:
//
//   1. It never stops. Instructions arrive as a speech panel — the same one
//      run.js's tutor() prompts use — and expire on their own a few seconds
//      later while the world keeps scrolling. Nothing is modal, nothing waits
//      for a keypress to continue, and the hero never freezes mid-stride.
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
import { W, H, shake, updateShake, setSceneGlow, pushOverlayDraw } from '../engine/renderer.js';
import {
  GROUND_Y, ZOOM, VIEW_W, applyWorld, framingFor, easeZoom, easePan,
} from '../engine/camera.js';
import { Input, TOUCH_JUMP_FRAC } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Rng } from '../engine/rng.js';
import { burst, shardBurst, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';
import {
  drawText, drawTextCentered, textWidth, drawPanel, drawMenuRow, textYForMid, drawKeyLegend,
  keyLegendWidth, drawRoundButton, UI_PANEL_BORDER,
} from '../engine/sprites.js';
import { Player, PLAYER_X, jumpHeightFor } from './player.js';
import { drawHeroSprite, drawWorldEntity, drawPortal } from './draw.js';
import { drawToon } from '../sprites/toons.js';
import { makeObstacle, makePickup, entityBox, overlaps, DEBRIS, DEBRIS_DEFAULT } from './entities.js';
import { HERO_BY_ID } from '../data/heroes.js';
import {
  drawSpeech, drawFloatie, drawStatusPill, roundButtonOpts, playButtons,
} from './hud.js';

// ------------------------------------------------------------------ constants

// The run proper moves at 160. This is gentler without being a crawl — the old
// 70 was slow enough that the hero's legs crawled too, since the run cycle is
// driven by world.speed (see player.update).
const TRAINING_SPEED = 90;
// Reading time is bought here rather than by slowing the world down further. A
// challenge spawns most of a screen beyond the right edge, so it arrives ~3.8s
// after Gary starts talking: the words land, they are read, and only then does
// anything ask for a reaction. Slowing the lane instead would have made the
// same gap out of a hero who looks like they are wading.
const SPAWN_AHEAD = VIEW_W + 150;
// Gary's lines run two rows at this width; five seconds is an unhurried read of
// two rows with time to look up at the lane afterwards.
const SPEECH_T = 5;
// How long the world runs on after a section closes, before the next one opens.
// Long enough for the pass floatie to land and be read on its own.
const SETTLE_T = 1.6;
// The opening beat, over an empty lane, before section one spawns anything.
const INTRO_T = 4.5;
// Sections Gary will re-open before he gives up and marks it satisfactory.
// Nobody gets stuck in training.
const CONCEDE_AFTER = 4;

const PANEL = { border: UI_PANEL_BORDER, shadow: true };

// Gary's card is up for most of the module rather than for a line or two, so it
// is parked well above the default speech anchor: at y 46 it sat squarely in
// the band a held jump travels through, and the thing being read and the thing
// being jumped were in the same place. Its wrap is pulled in to match — the
// card is centred and grows off its longest line, so a narrower wrap is what
// keeps its left edge clear of the coin pill in the top-left corner.
const SPEECH_Y = 18;
const SPEECH_MAX_W = 296;

// The bottom status row — room name, section counter, key legend — is laid out
// off ONE midline rather than off a shared glyph-box top. drawText takes the
// top of the glyph box, so type at three different scales hung off the same y
// lands on three different baselines, which is exactly what it looked like: the
// legend rode 4px high of the title and the counter sat a pixel under it.
// textYForMid is the correction, and it needs a single number to measure from.
const ROW_MID = H - 11;

// Pause screen plates — same layout as run.js so the muscle memory carries over.
const PAUSE_MENU_W = 156, PAUSE_MENU_H = 26;
const PAUSE_PLATES = [
  { id: 'resume', x: W / 2 - PAUSE_MENU_W / 2, y: 196, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'pause', label: 'CONTINUE' },
  { id: 'quit', x: W / 2 - PAUSE_MENU_W / 2, y: 228, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'escape', label: 'EXIT TO FOOD COURT' },
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
    const x = Math.round(i * LAMP_GAP - camX);
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
    for (let x = -(camX % 24); x < W; x += 24) ctx.fillRect(Math.round(x), GROUND_Y + 8, 10, 2);
  },
  // Not part of the style-pack contract — drawWorldEntity never asks for it —
  // but it lives on the pack because it is backdrop, and the backdrop is the
  // one thing this screen authors.
  lights: drawLamps,
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
    brief: (touch) => (touch
      ? 'SECTION ONE: CRATES. TOUCH AND HOLD THE LEFT OF THE SCREEN TO JUMP.'
      : 'SECTION ONE: CRATES. HOLD SPACE TO JUMP. I DID NOT WRITE SECTION ONE.'),
    again: (touch) => (touch
      ? 'YOU FLICKED IT. HOLD IT DOWN. THE CRATE COMES BACK.'
      : 'YOU TAPPED IT. HOLD IT DOWN. THE CRATE COMES BACK.'),
    setup(t) { t.obstacles = [makeObstacle('crate', t.worldX + SPAWN_AHEAD)]; },
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
    brief: () => 'THREE STACKS, EACH TALLER. HOLD THE JUMP LONGER FOR EACH ONE. THE MANUAL CALLS THIS INTUITIVE.',
    again: () => 'THAT ONE WAS TALLER THAN THE LAST. HOLD IT LONGER. I AM NOT PAID FOR RETAKES.',
    // 200px apart. The spawner's own fairness rule (fairGap) would allow ~103
    // at this speed for Lorenzo — land, then a quarter second to react — so
    // this is roughly double the floor, on purpose. Fair is the bar for a
    // stage; a ladder whose whole point is that each rung wants a longer hold
    // than the last needs the player to SEE the next one coming and decide,
    // not to clear it on reflex.
    setup(t) {
      const x = t.worldX + SPAWN_AHEAD;
      t.obstacles = [
        makeObstacle('crate', x),
        makeObstacle('crate', x + 200, { n: 2 }),
        makeObstacle('crate', x + 400, { n: 3 }),
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
    brief: () => 'COINS. RUN THROUGH THEM. THE BOX AFTER THEM IS ALSO COINS — JUMP UP INTO IT.',
    again: () => 'THE BOX IS STILL FULL. HIT IT FROM UNDERNEATH. ANOTHER ONE IS COMING.',
    // Missing a coin or two is not worth reopening a section over; the box is.
    optionalPickups: true,
    requires: (t) => t.sawQbox,
    setup(t) {
      const x = t.worldX + SPAWN_AHEAD;
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
    wrongWay: () => 'YOU WENT OVER IT. THE SECTION SPECIFIES UNDER. I DO NOT MAKE THE SECTIONS.',
    setup(t) { t.obstacles = [makeObstacle('drone', t.worldX + SPAWN_AHEAD)]; },
  },
  {
    id: 'shield',
    hero: 'lorenzo',
    label: 'SHIELD',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
    brief: () => 'SHIELD CAPSULE. IT TAKES ONE HIT FOR YOU. PROTECTIVE EQUIPMENT ARRIVES AFTER THE HAZARDS. THAT IS PROCUREMENT.',
    again: () => 'IT WENT PAST. I WILL REQUISITION ANOTHER. THAT IS A FORM. I HAVE ALREADY FILED IT.',
    setup(t) { t.pickups = [makePickup('capShield', t.worldX + SPAWN_AHEAD, 10)]; },
  },
  {
    id: 'portal1',
    hero: 'lorenzo',
    tagTo: 'mochi',
    label: 'PORTAL TAG',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
    brief: () => 'RUN THROUGH THE PORTAL. DO NOT JUMP IT. SOMEONE JUMPED IT ONCE. THERE WAS PAPERWORK.',
    again: () => 'OVER IT IS NOT THROUGH IT. I AM REOPENING THE SECTION.',
    setup(t) {
      t.portal = { x: t.worldX + SPAWN_AHEAD, hero: 'mochi', label: 'MOCHI', hit: false };
    },
  },
  {
    // Mochi is the only hero who jumps twice, and she jumps LOW — 57px against
    // Lorenzo's 89. That is the whole reason the swap happens here: a stack
    // this tall is one Lorenzo would have strolled over, so the section can
    // only be completed by the thing it is teaching. Granting a borrowed air
    // jump to a hero who did not need one taught nothing.
    id: 'doublejump',
    hero: 'mochi',
    label: 'DOUBLE JUMP',
    legend: [['SPC', 'JUMP x2']],
    brief: (touch) => (touch
      ? 'MOCHI JUMPS TWICE AND NOT VERY HIGH. TAP AGAIN IN MID-AIR. ONE JUMP WILL NOT CLEAR THAT.'
      : 'MOCHI JUMPS TWICE AND NOT VERY HIGH. PRESS JUMP AGAIN IN MID-AIR. ONE JUMP WILL NOT CLEAR THAT.'),
    again: () => 'INCOMPLETE. TWICE. IN THE AIR. THE FORM IS SPECIFIC.',
    requires: (t) => t.sawDoubleJump,
    wrongWay: () => 'YOU GOT OVER IT ON ONE. THE SECTION SPECIFIES TWO.',
    setup(t) { t.obstacles = [makeObstacle('crate', t.worldX + SPAWN_AHEAD, { n: 6 })]; },
  },
  {
    id: 'portal2',
    hero: 'mochi',
    tagTo: 'b33p',
    label: 'PORTAL TAG',
    legend: [['SPC', 'JUMP x2']],
    brief: () => 'ANOTHER PORTAL, ANOTHER BODY. THIS IS NORMAL HERE. STRAIGHT THROUGH.',
    again: () => 'THROUGH IT. I HAVE SAID THIS ONCE ALREADY TODAY.',
    setup(t) {
      t.portal = { x: t.worldX + SPAWN_AHEAD, hero: 'b33p', label: 'B-33P', hit: false };
    },
  },
  {
    id: 'shoot',
    hero: 'b33p',
    label: 'HERO POWER',
    legend: (touch) => (touch ? [['USE', 'LEMON CANNON']] : [['RT/D', 'LEMON CANNON']]),
    brief: (touch) => (touch
      ? 'EVERY HERO HAS A POWER. B-33P SHOOTS. TAP THE RIGHT STRIP, OR THE USE DISC. THE CANNON IS COMPANY PROPERTY.'
      : 'EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY.'),
    // The whole canvas has been a two-button surface since section one, and
    // nothing has said so: a thumb that never strayed right of 70% has been
    // playing a one-button game without knowing there was another. The power
    // is the first control that lives in the right-hand strip, so the split is
    // shown here — the section that needs it — rather than at the top of the
    // module where it would be a diagram of something not yet in your hands.
    zones: true,
    again: () => 'IT GOT PAST. SHOOT THE NEXT ONE. THE CANNON IS ALREADY SIGNED OUT TO YOU.',
    // Ducking the drone would clear it, but this section is about the cannon.
    requires: (t) => t.sawShotDown,
    wrongWay: () => 'YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE.',
    setup(t) {
      t.obstacles = [makeObstacle('drone', t.worldX + SPAWN_AHEAD)];
      t.player.abilityCd = 0;
    },
    onPass(t) { t.spawnShootGallery(); },
  },
  {
    // Home again. The module borrowed two bodies to teach two things and hands
    // the first one back before the paperwork: you arrived as Lorenzo, the
    // certificate is made out to whoever is standing there at the end, and
    // being signed off in someone else's body is exactly the sort of thing
    // this place would let happen.
    id: 'portal3',
    hero: 'b33p',
    tagTo: 'lorenzo',
    label: 'PORTAL TAG',
    legend: [['SPC', 'JUMP']],
    brief: () => 'LAST PORTAL. IT PUTS YOU BACK IN THE BODY YOU CLOCKED IN WITH. HR IS FIRM ON THAT ONE.',
    again: () => 'THROUGH IT. YOU CANNOT SIGN THE FORM AS SOMEBODY ELSE. I HAVE TRIED.',
    setup(t) {
      t.portal = { x: t.worldX + SPAWN_AHEAD, hero: 'lorenzo', label: 'LORENZO', hit: false };
    },
  },
];

// The ending. Gary has been a panel with a portrait in it for the whole module;
// at the end the lane winds down and he walks on in person, up the track,
// against the direction everything else has been travelling all day. He is the
// last joke as well as the first: the module is over, and his shift is not.
//
// Every beat is skippable — one press advances — so an impatient player taps
// through in seconds and a reader gets the whole bit.
const OUTRO = [
  { hold: 3.8, line: 'THAT IS THE MODULE. ALL OF IT. INCLUDING THE PARTS I DISAGREE WITH.' },
  { hold: 4.4, line: 'YOU ARE CERTIFIED. THE CERTIFICATE IS NON-BINDING AND EXPIRES ON CONTACT WITH AN ACTUAL CABINET.' },
  // The reclaim runs UNDER this line: he says it and the counter drains while
  // he does, in front of you, rather than the coins having quietly vanished
  // eight sections ago.
  { hold: 4.6, clawback: true,
    line: 'PAYROLL HAS RECLAIMED THOSE. THEY WERE TRAINING COINS. TRAINING COINS ARE NOT LEGAL TENDER.' },
  { hold: 3.8, line: 'I DID ASK. I ASKED TWICE. THE SECOND TIME IN WRITING.' },
  { hold: 4.2, line: 'RIGHT. I HAVE A SHOP TO HAUNT, AND I HAUNT IT DURING BUSINESS HOURS ONLY. IT IS POLICY.' },
];
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
const GARY_WALK_SPEED = 46;
const GARY_H = 24;
const OUTRO_ZOOM = 3.2;

const OPENING = 'HR ASSIGNED ME THE TRAINING MODULE. I AM DECEASED. THE FORM DID NOT ASK.';
const CONCEDED = 'I AM MARKING THIS ONE SATISFACTORY. NOBODY AUDITS ME.';
const SHIELD_BROKE = 'THE EQUIPMENT PERFORMED AS SPECIFIED. YOU DID NOT.';
const SIGN_OFF = 'SIGNED, GARY. STILL ON THE CLOCK. STILL NOT PAID EXTRA.';
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
const CERT_SIGN = 'G. — STORES & PHYSICAL SWITCHES';

// ------------------------------------------------------------------ state

export class TutorialState {
  constructor({ onDone, save }) {
    this.onDone = onDone;
    this.save = save || null;
    this.settings = (save && save.settings) || {};
    this.t = 0;
    this.worldX = 0;
    this.speed = TRAINING_SPEED;   // eased to a stop for the ending
    this.camPan = 0;
    this.camZoom = ZOOM;
    this.outro = null;
    this.player = null;
    this.obstacles = [];
    this.pickups = [];
    this.pellets = [];
    this.portal = null;
    this.floaties = [];
    this.speech = null;
    this.lastSaid = null;
    this.coins = 0;
    // The clawback is a countdown of the counter itself, one coin per tick,
    // and it happens in the epilogue rather than the moment the coins section
    // closes: the player keeps what they picked up for the rest of the module,
    // and Gary takes it off them in person at the end.
    this.clawing = false;
    this.clawAcc = 0;
    this.clawStep = 0.05;
    this.clawStart = 0;
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
    this.cheering = false;
    this.playgroundT = 0;
    this.playgroundWait = false;
    this.shield = 0;
    // -1 is the opening beat: Gary explains why he is here, over an empty lane,
    // before section one spawns anything. settleT runs it out like any other
    // gap between sections.
    this.stepIndex = -1;
    this.misses = 0;
    this.settleT = 0;
    this.legend = [];
    this.finished = false;
    this.doneT = 0;
    this.paused = false;
    this.pauseIdx = 0;
    this.rng = new Rng(0x7a5c0de);
    this.sawDuck = false;
    this.sawDoubleJump = false;
    this.sawShotDown = false;
    this.sawQbox = false;
  }

  // ---- lifecycle -----------------------------------------------------------

  enter() {
    Input.setContext('run');
    Input.clearAll();
    clearParticles();
    setSceneGlow(true);
    this.player = new Player('lorenzo');
    this.setButtons();
    this.say(OPENING);
    this.settleT = INTRO_T;
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
  setButtons() {
    if (!Input.usingTouch) { Input.setButtons([]); return; }
    const hasPower = this.player && this.player.heroId === 'b33p';
    Input.setButtons(playButtons().filter((b) => b.id !== 'ability' || hasPower));
  }

  // ---- sections ------------------------------------------------------------

  step() { return STEPS[this.stepIndex]; }

  startStep(i) {
    if (i >= STEPS.length) {
      this.finished = true;
      this.doneT = 0;
      this.speech = null;
      this.clearEntities();
      // beat -1 is "still walking on"; he says nothing until he arrives.
      this.outro = { beat: -1, garyX: VIEW_W + 40, walking: true, cardT: 0 };
      Audio.sfx('win');
      return;
    }
    this.stepIndex = i;
    const step = STEPS[i];
    this.obstacles = [];
    this.pickups = [];
    this.pellets = [];
    this.portal = null;
    this.misses = 0;
    this.settleT = 0;
    this.clearWitness();
    if (this.player.heroId !== step.hero) this.player.setHero(step.hero);
    this.player.abilityCd = 0;
    this.setButtons();
    this.legend = typeof step.legend === 'function' ? step.legend(Input.isTouchDevice()) : step.legend;
    this.say(step.brief(Input.isTouchDevice()));
    // Up for as long as the brief is, so the card and the sentence explaining
    // it expire together.
    this.zoneT = step.zones && Input.isTouchDevice() ? SPEECH_T : 0;
    step.setup(this);
  }

  // Dev builds only, wired to N in src/dev/index.js. Closes the section on the
  // spot — the same path a pass takes, minus the reward — so the module can be
  // walked to its ninth section without playing the first eight.
  devSkipSection() {
    if (this.finished) return 'TRAINING: ALREADY IN THE EPILOGUE';
    const step = this.step();
    // A skipped portal still hands the body over. Skipping past one and
    // arriving in the epilogue as the wrong hero is not a shortcut, it is a
    // different ending — the certificate is made out to whoever is standing
    // there.
    if (step && step.tagTo) this.player.setHero(step.tagTo);
    this.clearEntities();
    this.speech = null;
    this.zoneT = 0;
    this.playgroundT = 0;
    this.playgroundWait = false;
    this.startStep(this.stepIndex + 1);
    return step ? `TRAINING: SKIPPED ${step.label}` : 'TRAINING: SKIPPED INTRO';
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
  }

  // Section closed. The world does not stop; it just runs on for a beat.
  passStep() {
    const step = this.step();
    this.floatText(`${step.label} — LOGGED`, '#74c947');
    Audio.sfx('perfect');
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
      this.clearEntities();
      this.settleT = SETTLE_T;
      return;
    }
    const touch = Input.isTouchDevice();
    const line = wrongWay && step.wrongWay ? step.wrongWay(touch) : step.again(touch);
    this.say(line);
    this.clearWitness();
    this.clearEntities();
    step.setup(this);
  }

  clearEntities() {
    this.obstacles = [];
    this.pickups = [];
    this.pellets = [];
    this.portal = null;
  }

  // A miss costs a knock, not a life — and the shield, if it is still up, costs
  // nothing at all. The hazard breaks out of the way either way, so the hero is
  // never dragged along by something they already failed to clear.
  knock(ob) {
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
    this.floatText('INCOMPLETE', '#e04848', true);
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

  // After the coins section closes, spawn a screenful of coins and blocks for
  // the player to bat around — the training wheels come off for a few seconds.
  // Then payroll takes it all back.
  spawnPlayground() {
    this.playgroundT = 5.0;
    this.playgroundWait = false;
    this.settleT = 7.0;   // playground + a beat of empty lane + settle
    const x0 = this.worldX + VIEW_W;
    this.pickups = [];
    this.obstacles = [];
    // Coin arcs packed across the width of the screen — dense enough that the
    // lane looks like someone tipped a slot machine over.
    for (let i = 0; i < 5; i++) {
      const base = x0 + i * 110 + this.rng.range(0, 20);
      this.pickups.push(...coinArc(base, 8 + i, this.player.heroId));
    }
    // Five boxes to open, staggered so they arrive in a steady stream.
    for (let i = 0; i < 5; i++) {
      const box = makeObstacle('qcrate', x0 + 80 + i * 130);
      box.alt = 60;
      this.obstacles.push(box);
    }
    // Ground coins filling in the gaps between arcs.
    for (let i = 0; i < 18; i++) {
      this.pickups.push(makePickup('coin', x0 + i * 32 + this.rng.range(-10, 10), 8));
    }
  }

  // After the shoot section, a gallery of varied targets rolls past so B-33P
  // can unload the cannon a few more times before the module ends.
  spawnShootGallery() {
    this.settleT = 6.5;   // long enough for everything to scroll past
    const x0 = this.worldX + VIEW_W;
    this.obstacles = [];
    // Drones at different altitudes — the cannon's bread and butter.
    const droneAlts = [11, 11, 30, 44, 11];
    for (let i = 0; i < droneAlts.length; i++) {
      const d = makeObstacle('drone', x0 + 60 + i * 110);
      d.alt = droneAlts[i];
      this.obstacles.push(d);
    }
    // A buzzbird or two — unarmoured, satisfying pop.
    this.obstacles.push(makeObstacle('buzzbird', x0 + 320));
    this.obstacles.push(makeObstacle('buzzbird', x0 + 480));
    // A couple of stacked crates on the ground — shoot 'em or jump 'em.
    this.obstacles.push(makeObstacle('crate', x0 + 180, { n: 2 }));
    this.obstacles.push(makeObstacle('crate', x0 + 400, { n: 3 }));
    // A target for the sharpshooters.
    this.obstacles.push(makeObstacle('target', x0 + 540));
  }

  // The gag, and the honest thing: nothing earned in here was ever going into
  // the save file, so the counter is walked back to zero in front of you.
  //
  // It happens in the epilogue, not the moment the coins section closes. Taking
  // them back seconds after handing them over made the payout feel like a trick
  // question and left seven sections to play with a dead zero in the corner;
  // held to the end, the counter climbs all module and Gary reclaims it to your
  // face, which is the joke the line was always written for.
  startClawback() {
    if (this.coins <= 0 || this.clawing) return;
    this.clawing = true;
    this.clawAcc = 0;
    this.clawStart = this.coins;
    // He watches the counter go down and he is not pleased about it. It outlasts
    // the drain by a couple of seconds so the face is still on him when the
    // number hits zero.
    this.sulkT = 4.2;
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
    Audio.sfx('uiBad');
    this.floatText('RECLAIMED', '#e04848');
  }

  // ---- talk ----------------------------------------------------------------

  say(text, t = SPEECH_T) {
    this.speech = { text, t, who: 'gary' };
    // Kept past its own expiry for the pause screen. A player who pauses is
    // usually pausing because the instruction went away before they had
    // finished with it, so the pause is where the last thing he said lives.
    this.lastSaid = { text, t, who: 'gary' };
  }

  // Longer-lived than a run's barks. In a stage a floatie is confirmation of
  // something you already felt happen; here it is often the only report that a
  // section closed, and it competes with a speech panel for the same glance —
  // so it gets a couple more seconds to be noticed and read.
  floatText(text, color, solid = false) {
    let y = 128;
    for (const f of this.floaties) if (f.y + 19 > y) y = f.y + 19;
    this.floaties.push({ text, color, t: 3.2, y, solid });
    if (this.floaties.length > 5) this.floaties.shift();
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
    this.t += dt;
    updateShake(dt, () => this.rng.float());
    updateParticles(dt);

    // Pause toggles: escape/back pauses; escape while paused exits.
    if (Input.pressed('pause')) {
      this.paused = !this.paused;
      if (this.paused) { this.pauseIdx = 0; Audio.sfx('ui'); Input.setButtons(PAUSE_PLATES); Input.setMenuKeys(true); }
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
      Input.setButtons(PAUSE_PLATES);
      Input.setMenuKeys(true);
    }

    if (this.paused) {
      this.updatePauseMenu();
      Input.endFrame();
      return;
    }

    if (this.speech) {
      this.speech.t -= dt;
      if (this.speech.t <= 0) this.speech = null;
    }
    for (const f of this.floaties) { f.t -= dt; f.y -= dt * 12; }
    this.floaties = this.floaties.filter((f) => f.t > 0);
    if (this.zoneT > 0) this.zoneT -= dt;
    if (this.waveT > 0) this.waveT -= dt;
    if (this.sulkT > 0) this.sulkT -= dt;
    this.updateClawback(dt);
    if (this.playgroundT > 0) {
      this.playgroundT -= dt;
      if (this.playgroundT <= 0) {
        if (!this.playgroundWait) {
          // End of free play — clear the lane and let the settle run out.
          this.clearEntities();
          this.playgroundT = 1.5;
          this.playgroundWait = true;
        } else {
          this.playgroundT = 0;
        }
      }
    }

    if (this.finished) {
      this.updateFinished(dt);
      Input.endFrame();
      return;
    }

    this.worldX += this.speed * dt;

    if (Input.pressed('jump')) {
      this.player.jumpPressed(Audio);
      if (this.player.jumps > 1) this.sawDoubleJump = true;
    }
    if (Input.pressed('ability')) this.useAbility();
    this.player.update(dt, Input, { speed: this.speed, gravityScale: 1, ice: false });
    if (this.player.duckAmount > 0.35) this.sawDuck = true;
    this.updateCamera(dt);

    this.updatePellets(dt);
    this.updateEntities(dt);

    if (this.settleT > 0) {
      this.settleT -= dt;
      if (this.settleT <= 0) this.startStep(this.stepIndex + 1);
    } else {
      this.judgeStep();
    }

    Input.endFrame();
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
    this.speed = Math.max(0, this.speed - TRAINING_SPEED * dt / 1.3);
    this.worldX += this.speed * dt;
    this.player.update(dt, Input, { speed: this.speed, gravityScale: 1, ice: false });
    // Push in on the pair rather than tracking the hero's jump — nobody is
    // jumping any more. easeZoom's slow branch (k=4) makes this a drift in over
    // about a second, not a snap.
    this.camPan = easePan(this.camPan, 0, dt);
    this.camZoom = easeZoom(this.camZoom, OUTRO_ZOOM, dt);

    const press = Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer');

    if (o.garyX > GARY_STOP_X) {
      o.garyX = Math.max(GARY_STOP_X, o.garyX - GARY_WALK_SPEED * dt);
      o.walking = true;
      return;   // he does not talk and walk; he is not paid for two things
    }
    // The moment he arrives, the hero puts a hand up. One of them is pleased to
    // be here.
    if (o.walking) { o.walking = false; this.waveT = 2.6; }

    if (o.beat < OUTRO.length) {
      // A finished line, or an impatient player, moves it along.
      if (!this.speech || press) {
        o.beat++;
        if (o.beat < OUTRO.length) {
          const beat = OUTRO[o.beat];
          this.say(beat.line, beat.hold);
          if (beat.clawback) this.startClawback();
        } else {
          // The certificate goes up and he signs it in the same breath. Nothing
          // is allowed to still be counting down behind a signed document, so
          // an impatient player who skipped through the reclaim gets it settled
          // here rather than watching the till drain under the card.
          this.endClawback();
          this.say(SIGN_OFF, 99);
          // Certificate up, and the one person here who is pleased about it
          // celebrates. The sulk is cancelled rather than allowed to run out
          // under the card: the coins are gone and he has decided the piece of
          // paper is worth more.
          this.sulkT = 0;
          this.waveT = 0;
          this.cheering = true;
          Audio.sfx('uiConfirm');
        }
      }
      return;
    }

    // The certificate, then out.
    o.cardT += dt;
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

    if (this.portal && !this.portal.hit) {
      const pbox = { x: this.portal.x, y: GROUND_Y - 40, w: 12, h: 40 };
      if (overlaps(this.playerBox(), pbox)) this.tagIn();
    }
  }

  collect(pu) {
    if (pu.def.coin) {
      this.coins += 1;
      this.paidOut = true;
      Audio.sfx('coin');
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
  // the swap throws teal.
  tagIn() {
    const step = this.step();
    this.portal.hit = true;
    this.player.setHero(step.tagTo);
    this.player.abilityCd = 0;
    this.setButtons();
    Audio.sfx('tag');
    burst(this.playerWorldX() + 6, GROUND_Y - this.player.y - 8, 14, 80, 0.5, '#48e0c8', 1, 80,
      () => this.rng.float());
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

    const spawned = [...this.obstacles, ...this.pickups];
    if (!spawned.length) return;
    // Unresolved while any part of the challenge is still standing and not yet
    // behind the hero. A broken one counts as resolved wherever it is.
    if (spawned.some((e) => e.live && e.x + e.w >= heroX)) return;

    if (!step.optionalPickups && this.pickups.some((p) => p.live)) { this.reopenStep(false); return; }
    if (step.requires && !step.requires(this)) { this.reopenStep(true); return; }
    this.passStep();
  }

  // ---- draw ----------------------------------------------------------------

  draw(ctx) {
    const cam = this.worldX;
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

    for (const pu of this.pickups) {
      if (pu.live) drawWorldEntity(ctx, pu, cam, this.t, TRAINING_PACK, this.settings);
    }
    for (const ob of this.obstacles) {
      if (ob.live) drawWorldEntity(ctx, ob, cam, this.t, TRAINING_PACK, this.settings);
    }
    if (this.portal && !this.portal.hit) drawPortal(ctx, this.portal, cam, this.t, z);
    for (const pr of this.pellets) {
      const x = Math.round(pr.x - cam), y = Math.round(GROUND_Y - pr.alt - 4);
      ctx.fillStyle = '#f6d33c';
      ctx.beginPath(); ctx.arc(x + 3, y + 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff0a0';
      ctx.fillRect(x + 2, y, 2, 1);
    }
    drawParticles(ctx, cam);
    ctx.restore();

    // The hero renders above the backbuffer at device resolution and pushes its
    // own overlay callback, so everything that has to sit ON TOP of them has to
    // go through the same queue — otherwise the panels end up underneath.
    // Once the treadmill has stopped the controller still reports a RUN — it
    // only knows run/jump/duck — so the hero held whatever stride frame the
    // lane died on for the whole epilogue. He stands instead, and waves when
    // there is someone to wave at.
    const stopped = this.finished && this.speed < 4;
    drawHeroSprite(ctx, this.player, this.player.heroId, this.t, cam, false, {
      settings: this.settings, shield: this.shield, zoom: z, pan,
      pose: stopped ? this.outroPose() : null,
    });
    pushOverlayDraw((d) => this.drawUi(d));
  }

  // What the hero is doing while the lane stands still. He greets Gary, he
  // scowls at the reclaim, and he celebrates the certificate — three beats that
  // exist so the epilogue is a scene between two characters rather than a
  // speech delivered at a mannequin.
  outroPose() {
    return {
      kind: this.cheering ? 'celebrate' : 'idle',
      phase: 0,
      headTurn: 0,
      annoyed: this.sulkT > 0 ? 1 : 0,
      // Style 3 is the fed-up face. He has just watched payroll take the lot.
      madStyle: 3,
      menuAction: !this.cheering && this.waveT > 0 ? 'wave' : undefined,
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
    if (this.zoneT > 0) this.drawTouchZones(ctx);
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
    if (this.speech) drawSpeech(ctx, this.speech, { light: true, y: SPEECH_Y, maxWidth: SPEECH_MAX_W });
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
    if (said) drawSpeech(ctx, said, { light: true, y: SPEECH_Y, maxWidth: SPEECH_MAX_W });
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

  // The two-button surface, drawn on itself. The left TOUCH_JUMP_FRAC of the
  // canvas is JUMP and the rest is the power, and until this card nothing ever
  // said so — the discs in the corners look like the only controls there are,
  // so a thumb that stayed on the left played eight sections without knowing
  // the right-hand strip existed.
  //
  // Both zones are washed rather than just the jump side: shading one half
  // reads as "this half is disabled", which is the opposite of the point. The
  // jump side carries the heavier wash because it is the bigger claim on the
  // screen and that is the fact being taught.
  drawTouchZones(ctx) {
    const a = Math.max(0, Math.min(1, this.zoneT / 0.4));
    const split = Math.round(W * TOUCH_JUMP_FRAC);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(72,224,200,0.17)';
    ctx.fillRect(0, 0, split, H);
    ctx.fillStyle = 'rgba(246,211,60,0.17)';
    ctx.fillRect(split, 0, W - split, H);
    // The seam, dashed, so it reads as a boundary you could put a thumb either
    // side of rather than as a wall.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 4; y < H; y += 12) ctx.fillRect(split - 0.5, y, 1, 6);
    const pct = Math.round(TOUCH_JUMP_FRAC * 100);
    drawTextCentered(ctx, 'JUMP', split / 2, 150, '#d7fff6', 1.6, 'title');
    drawTextCentered(ctx, `${pct}% OF THE SCREEN`, split / 2, 170, 'rgba(215,255,246,0.75)', 0.8);
    drawTextCentered(ctx, 'POWER', split + (W - split) / 2, 150, '#ffe9a0', 1.2, 'title');
    drawTextCentered(ctx, `${100 - pct}%`, split + (W - split) / 2, 170, 'rgba(255,233,160,0.75)', 0.8);
    ctx.restore();
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
    const CW = 306, CH = 82;
    const cx = W / 2;
    // Slots into the band between the speech panel (which bottoms out around
    // 70) and the pair's crowns, which at the pushed-in zoom reach y 155. The
    // card is as large as that band allows and no larger: the whole point of
    // the ending is watching the two of them stand there, so the document is
    // not permitted to grow down over their heads.
    const x = Math.round(cx - CW / 2);
    const y = Math.round(66 - (1 - e) * 5);
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
    ctx.fillRect(x + 24, y + 47, CW - 48, 0.5);
    drawTextCentered(ctx, `AWARDED TO ${who}`, cx, y + 52, '#4a4460', 0.85, 'bold');
    drawTextCentered(ctx, CERT_FOOT, cx, y + 63, '#4a4460', 0.7);
    drawTextCentered(ctx, CERT_SIGN, cx, y + 72, '#8a2f3f', 0.7, 'title');
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
  drawGary(ctx, o) {
    const pose = {
      kind: o.walking ? 'run' : 'idle',
      phase: (this.t * (o.walking ? 1.7 : 0.5)) % 1,
      time: this.t,
      grounded: true,
      facing: -1,
      vy: 0,
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
