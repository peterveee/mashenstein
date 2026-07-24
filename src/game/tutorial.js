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
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Rng } from '../engine/rng.js';
import { burst, shardBurst, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';
import {
  drawText, drawTextCentered, textWidth, drawPanel, textYForMid, drawKeyLegend,
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

// The training lane's palette, shaped like a cabinet because that is what the
// pack painters below take.
const TRAINING_CAB = {
  id: 'training',
  sky: ['#171a2c', '#232741'],
  ground: '#4a5170',
  groundDark: '#22263c',
};

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
    // Loose change first, so the counter visibly moves, then the box — which
    // teaches that a ! crate is a container and not a hazard, the one prop in
    // the game you are supposed to run headfirst into.
    id: 'coins',
    hero: 'lorenzo',
    label: 'COINS',
    legend: [['SPC', 'JUMP'], ['DN', 'DUCK']],
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
      box.alt = 82;
      t.obstacles = [box];
    },
    // The payoff. Everything the player just earned is reclaimed on a
    // technicality, which is both the joke and the only honest thing to do —
    // these coins were never going into the save file.
    onPass(t) { t.startClawback(); },
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
      ? 'EVERY HERO HAS A POWER. B-33P SHOOTS. TAP USE. THE CANNON IS COMPANY PROPERTY.'
      : 'EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY.'),
    again: () => 'IT GOT PAST. SHOOT THE NEXT ONE. THE CANNON IS ALREADY SIGNED OUT TO YOU.',
    // Ducking the drone would clear it, but this section is about the cannon.
    requires: (t) => t.sawShotDown,
    wrongWay: () => 'YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE.',
    setup(t) {
      t.obstacles = [makeObstacle('drone', t.worldX + SPAWN_AHEAD)];
      t.player.abilityCd = 0;
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
  { hold: 3.8, line: 'PAYROLL STILL WILL NOT BE ISSUING THOSE COINS. I DID ASK. I ASKED TWICE.' },
  { hold: 4.2, line: 'RIGHT. I HAVE A SHOP TO HAUNT, AND I HAUNT IT DURING BUSINESS HOURS ONLY. IT IS POLICY.' },
];
// Where he stops. Close enough to be in conversation with the hero (world x 62)
// rather than shouting across the lane at them — with the push-in below, the
// pair land either side of centre.
const GARY_STOP_X = 112;
const GARY_WALK_SPEED = 46;
const GARY_H = 24;
// The ending pushes in on the two of them. The camera welds the frame's left
// edge to camX, so zoom alone slides both figures right and enlarges them: at
// 2.8 their midpoint lands within a few px of screen centre and each stands
// ~67px tall, which is a two-shot rather than two dots in a lane.
const OUTRO_ZOOM = 2.8;

const OPENING = 'HR ASSIGNED ME THE TRAINING MODULE. I AM DECEASED. THE FORM DID NOT ASK.';
const CONCEDED = 'I AM MARKING THIS ONE SATISFACTORY. NOBODY AUDITS ME.';
const CLAWBACK = 'PAYROLL HAS RECLAIMED THOSE. THEY WERE TRAINING COINS. TRAINING COINS ARE NOT LEGAL TENDER.';
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
    this.coins = 0;
    this.clawbackT = 0;
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
    step.setup(this);
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

  // The gag, and the honest thing: nothing earned in here was ever going into
  // the save file, so the counter is walked back to zero in front of you.
  startClawback() {
    if (this.coins <= 0) return;
    this.say(CLAWBACK, 5);
    this.clawbackT = 1.1;
    this.settleT = 4.6;   // let the joke land before the next section opens
    Audio.sfx('uiBad');
  }

  // ---- talk ----------------------------------------------------------------

  say(text, t = SPEECH_T) {
    this.speech = { text, t, who: 'gary' };
  }

  floatText(text, color, solid = false) {
    let y = 128;
    for (const f of this.floaties) if (f.y + 19 > y) y = f.y + 19;
    this.floaties.push({ text, color, t: 1.8, y, solid });
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

    if (Input.pressed('escape') || Input.pressed('back')) {
      Audio.sfx('ui');
      Input.endFrame();
      this.onDone();
      return;
    }

    if (this.speech) {
      this.speech.t -= dt;
      if (this.speech.t <= 0) this.speech = null;
    }
    for (const f of this.floaties) { f.t -= dt; f.y -= dt * 12; }
    this.floaties = this.floaties.filter((f) => f.t > 0);
    if (this.clawbackT > 0) {
      this.clawbackT -= dt;
      this.coins = this.clawbackT > 0 ? Math.max(0, Math.round(this.coins - (dt / 1.1) * this.coins * 3)) : 0;
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
    o.walking = false;

    if (o.beat < OUTRO.length) {
      // A finished line, or an impatient player, moves it along.
      if (!this.speech || press) {
        o.beat++;
        if (o.beat < OUTRO.length) this.say(OUTRO[o.beat].line, OUTRO[o.beat].hold);
        // The certificate goes up and he signs it in the same breath.
        else { this.say(SIGN_OFF, 99); Audio.sfx('uiConfirm'); }
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
    drawHeroSprite(ctx, this.player, this.player.heroId, this.t, cam, false, {
      settings: this.settings, shield: this.shield, zoom: z, pan,
    });
    pushOverlayDraw((d) => this.drawUi(d));
  }

  drawUi(ctx) {
    const heroX = PLAYER_X * this.camZoom;
    for (const f of this.floaties) {
      drawFloatie(ctx, f, { heroX, alpha: Math.max(0, Math.min(1, f.t / 0.25)) });
    }
    // The coin half of the run's own status pill. Once the module has paid out
    // once, the readout stays up — including at zero, which is where the joke
    // lives.
    if (this.coins > 0 || this.clawbackT > 0 || this.sawQbox) {
      drawStatusPill(ctx, {
        oneHit: false, maxBattery: () => 0, battery: 0, coins: this.coins,
        totalDist: Infinity, distance: 0, tRun: this.t,
      });
    }
    // The certificate waits until Gary has finished talking, so his bit plays
    // over a clean lane rather than through a scrim.
    const o = this.outro;
    if (o && o.beat >= OUTRO.length) this.drawCertificate(ctx, o.cardT);
    // Gary goes down AFTER the card: he stays lit while everything else dims,
    // which is the composition the ending wants — the certificate prints, and
    // the man who filed it is still standing there.
    if (o) this.drawGary(ctx, o);
    // Touch parks the PAUSE disc in the top-right corner, which is exactly
    // where a full-width card ends up. Narrower wrap, so the card clears it.
    if (this.speech) drawSpeech(ctx, this.speech, Input.usingTouch ? { maxWidth: W - 170 } : {});
    if (o && o.beat >= OUTRO.length && o.cardT > 0.9) {
      drawText(ctx, `${Input.confirmVerb()} TO FINISH`, W / 2 - textWidth(`${Input.confirmVerb()} TO FINISH`) / 2,
        H - 26, 'rgba(255,255,255,0.5)');
    }
    if (!this.finished) {
      this.drawProgress(ctx);
      this.drawLegend(ctx);
    }
    // The touch controls, through the shared painter — same discs as a run,
    // and the USE meter reads the real cooldown because roundButtonOpts only
    // ever asks for the player and who they are.
    const shim = { player: this.player, relay: { current: this.player.heroId } };
    for (const b of Input.buttons) {
      if (b.round) drawRoundButton(ctx, b, roundButtonOpts(shim, b));
    }
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
    const CW = 244, CH = 62;
    const cx = W / 2;
    // Slots into the band between the speech panel (which bottoms out around
    // 80) and the pair's crowns, which at the pushed-in zoom reach y 165. At
    // 104 the card was resting on Gary's hat.
    const y = Math.round(88 - (1 - e) * 5);
    ctx.save();
    ctx.globalAlpha = e;
    drawPanel(ctx, Math.round(cx - CW / 2), y, CW, CH, 4, '#ece9f6',
      { border: 'rgba(26,16,40,0.4)', shadow: true });
    drawTextCentered(ctx, CERT_HEAD, cx, y + 9, '#6a6280', 0.75, 'bold');
    drawTextCentered(ctx, CERT_TITLE, cx, y + 20, '#1a1028', 1.35, 'title');
    ctx.fillStyle = 'rgba(26,16,40,0.22)';
    ctx.fillRect(cx - CW / 2 + 18, y + 40, CW - 36, 0.5);
    drawTextCentered(ctx, CERT_FOOT, cx, y + 44, '#4a4460', 0.7);
    drawTextCentered(ctx, CERT_SIGN, cx, y + 53, '#8a2f3f', 0.7, 'title');
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

  // Which section of the form you are on, on the same chrome every other
  // readout in the game sits on.
  drawProgress(ctx) {
    if (this.stepIndex < 0) return;
    const label = `SECTION ${this.stepIndex + 1}/${STEPS.length}`;
    const PAD = 6, HH = 13;
    const w = textWidth(label, 0.85, 'bold') + PAD * 2;
    const x = 8, y = H - 17;
    drawPanel(ctx, x, y, w, HH, 4, undefined, PANEL);
    drawText(ctx, label, x + PAD, textYForMid(y + HH / 2, 0.85), 'rgba(255,255,255,0.72)', 0.85, 'bold');
  }

  // The same legend panel the opening stage of a run puts up, in the same
  // corner, growing as the module teaches more controls. Touch skips it: those
  // buttons label themselves.
  drawLegend(ctx) {
    if (Input.usingTouch || !this.legend.length) return;
    const pairs = [...this.legend, ['ESC', 'SKIP']];
    const S = 0.85, HP = 6, HH = 12;
    const inner = keyLegendWidth(pairs, S);
    const x = W - 8 - (inner + HP * 2), y = H - 17;
    drawPanel(ctx, x, y, inner + HP * 2, HH, 4, undefined, PANEL);
    drawKeyLegend(ctx, pairs, x + HP, textYForMid(y + HH / 2, S), { scale: S });
  }
}

export { STEPS };
