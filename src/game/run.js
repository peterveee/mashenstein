// The Run state: one campaign stage (or OVERTIME). Composes player, relay,
// spawner, missions, powerups, style packs, HUD.
import { W, H, shake, updateShake, blit, pushOverlayDraw, setSceneGlow, chrome as chromeGeo, chromeCtx, paintChrome } from '../engine/renderer.js';
import { GROUND_Y, ZOOM, VIEW_W, applyWorld, screenYFor, framingFor, easeZoom, easePan } from '../engine/camera.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Rng } from '../engine/rng.js';
import { setState } from '../engine/states.js';
import { burst, shardBurst, updateParticles, drawParticles, clearParticles, spawn } from '../engine/particles.js';
import { drawText, drawTextCentered, textWidth, drawPanel, drawMenuRow, textYForMid, UI_PLATE, UI_PANEL_BORDER, drawRoundButton, drawKeyLegend, keyLegendWidth } from '../engine/sprites.js';
import { Player, PLAYER_X, jumpHeightFor } from './player.js';
import { Relay, portalSchedule } from './relay.js';
import { Spawner, DripSpawner, REACT_FLOOR, REACT_FLOOR_MAX } from './spawner.js';
import { Powerups, POWER_DEFS, randomPowerPickup } from './powerups.js';
import { entityBox, overlaps, makePickup, makeObstacle, OBSTACLES, PICKUPS, DEBRIS, DEBRIS_DEFAULT } from './entities.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { BENCH_UPGRADES } from '../data/progression.js';
import { CABINET_BY_ID, CABINETS } from '../data/cabinets.js';
import { STAGES } from '../data/stages.js';
import { FAIL_MESSAGES, EGGSHELL_TAUNTS, EGGSHELL_NARRATION, TAG_LINES, EXIT_LINES } from '../data/jokes.js';
import { getStylePack, sunShock } from '../engine/stylePacks/index.js';
import { drawHud, drawSpeech, drawActBanner, drawFloatie, drawFailBanner, roundButtonOpts, playButtons, HINT_TIME, BONUS_TIME, BONUS_HOLD, TOUCH_SHELF_CY } from './hud.js';
import { goalsDone } from './plugs.js';
import { stagePlayed, stageAllPlugs } from './progress.js';
import { drawRocketFist, drawThrownAxe } from '../sprites/toons.js';
import { drawHeroSprite, drawWorldEntity, drawPortal, drawCopter } from './draw.js';
import { drawTerrain, terrainGroundY } from './terrain.js';
import { TapeRewindEffect } from './rewindFx.js';

export { GROUND_Y };
// The hero's screen x at the resting zoom: 23.3% of the frame. The HUD/floatie
// layer draws UNSCALED above the world, so anything that has to sit over the
// hero up there anchors here rather than to the world-space PLAYER_X.
export const HERO_SCREEN_X = PLAYER_X * ZOOM;
// Stage-clear: a short beat on the finish frame so the tape-cross registers.
// The scene change itself is the CRT shutter in states.js — this used to close
// an iris to black first, which meant fading out twice back to back.
const FINALE_HOLD = 0.25;
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
// Rewind: hold Left Arrow / A to reverse time, up to 10 seconds at ~30 fps.
// Snapshots capture the full world state; popping them restores it.
const REWIND_SECONDS = 10;
const REWIND_FPS = 30;
const REWIND_STEP = 1 / REWIND_FPS;
const REWIND_MAX_FRAMES = REWIND_SECONDS * REWIND_FPS;
// Rewind plays back at 2× speed: pop 2 snapshots per normal frame.
const REWIND_SPEED = 2;
// Cooldown after release: rewind continues decelerating for this many seconds
// so the animation winds down in step with the tape-stop audio (~1.0s).
const REWIND_COOLDOWN = 0.55;
// Seconds after a rewind before another can be triggered.
const REWIND_LOCKOUT = 3.0;

// Floatie stack anchor: above the standing hero's head with clearance, below
// the speech bubble's reach — risen text fades out before ~y 90. The camera put
// that head at y 184 (24 drawn px at the resting zoom, off a groundline pinned
// to 232), so the stack starts high enough that three cards can pile up before
// the lowest one reaches it.
const FLOAT_BASE_Y = 128;

// The paused screen's two ways out, as tappable plates. Wide and worded rather
// than round and glyphed: these are read once and pressed once, which is the
// opposite of the play controls, and CONTINUE/EXIT are not symbols anyone
// shares. Laid out to match the pause copy above them — see drawPaused.
const PAUSE_MENU_W = 156, PAUSE_MENU_H = 26;
const PAUSE_BUTTONS = [
  // 'pause' toggles, so it resumes from here; 'escape' while already paused is
  // the quit half of the Escape key's behaviour. Both actions already existed —
  // the buttons just give a thumb somewhere to send them.
  { id: 'resume', x: W / 2 - PAUSE_MENU_W / 2, y: 196, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'pause', label: 'CONTINUE' },
  { id: 'quit', x: W / 2 - PAUSE_MENU_W / 2, y: 228, w: PAUSE_MENU_W, h: PAUSE_MENU_H, action: 'escape', label: 'EXIT TO FOOD COURT' },
];

export const HERO_CALLOUT = Object.fromEntries(
  Object.values(HERO_BY_ID).map((hero) => [hero.id, hero.ability.callout]),
);
const BASE_SPEED = 160;
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
const FINISH_LINE_X = VIEW_W - 32;

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
const FLIP_BANDS = [
  { id: 'perfect', at: 0.70, label: 'PERFECT FLIP', bonus: 300, hold: 0.9, shake: 6 },
  { id: 'clean',   at: 0.35, label: 'CLEAN FLIP',   bonus: 150, hold: 0.6, shake: 4 },
  { id: 'flip',    at: 0,    label: 'FLIP',         bonus: 60,  hold: 0.45, shake: 3 },
];
// Reached on the ground: he shoulders it over. Still a clear, still a beat.
const FLIP_CLUNK = { id: 'clunk', label: 'CLUNK', bonus: 0, hold: 0.35, shake: 2 };
const FLIP_THROW = 0.18;   // seconds the lever takes to swing through its arc
// The verdict card rides higher than the run's usual chatter row: it is printed
// with the hero standing at the pole, and the pole's own signage occupies the
// standard row at exactly that column.
const FLIP_CARD_Y = 92;

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
    this.rewindFrames = [];
    this.rewindCaptureT = 0;
    this.rewinding = false;
    this.rewindCooldown = 0;
    this.rewindLockout = 0;
    this.rewindSpeedMul = 1;
    this.rewindFx = new TapeRewindEffect();
  }

  groundYAt(worldX) {
    return this.bossCab ? GROUND_Y : terrainGroundY(this.cabinet, worldX, GROUND_Y);
  }

  // The dolly. Camera Y never TRACKS the hero — both numbers come out of
  // framingFor, so the groundline stays welded to its screen y and the frame
  // opens or cranes as one piece rather than chasing them around. A jump that
  // outgrows the frame cranes up first (which costs the ground apron and
  // nothing else) and only pulls the zoom back for what is left over. Most
  // single jumps (57px against 103px of headroom) still move neither.
  updateCamera(dt) {
    const heroX = this.playerWorldX();
    const lift = GROUND_Y - this.groundYAt(heroX);   // rolling terrain owes headroom too
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
  drawAtGround(ctx, worldX, fn, footW = 0, sink = 0) {
    let gy = this.groundYAt(worldX + footW / 2);
    if (footW > 0) {
      const over = footW * (4 / 3) / 2; // drawn half-width, centered on the box
      const cx = worldX + footW / 2;
      gy = Math.max(gy, this.groundYAt(cx - over), this.groundYAt(cx + over));
    }
    ctx.save();
    ctx.translate(0, gy - GROUND_Y + sink);
    fn();
    ctx.restore();
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
    this.finishing = false;
    this.finishT = 0;
    this.finishPlayerX = PLAYER_X;
    this.flip = null;           // graded at the breaker; null until contact
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
    if (this.devStartPercent > 0 && Number.isFinite(this.totalDist)) {
      const startSp = this.baseSpeed();
      const hero = HERO_BY_ID[this.relay.current];
      this.spawner.nextX = Math.max(this.spawner.nextX, this.camX);
      this.spawner.fill(this.camX, startSp, this.obstacles, this.pickups, () => jumpHeightFor(hero));
      this.drip.update(0, this.camX, this.pickups, this.oneHit, this.battery >= this.maxBattery());
      for (let i = 0; i < this.checkpoints.length; i++) {
        if (this.distance >= this.checkpoints[i]) this.checkpointHit[i] = true;
      }
    }

    this.styleName = this.corrupted.length ? 'pixel' : this.cabinet.style;
    this.style = getStylePack(this.styleName, this.save.settings);
    this.mirror = this.corrupted.includes('mirror');

    Audio.setBank(this.cabinet.music);
    Audio.setDetune(1);
    this.invActive = false;
    this.lastCoinSprayT = -1;
    Audio.setInvincible(false);
    this.rewindFrames = [];
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
      : 1 + 0.03 * Math.sqrt(this.tRun);
    const capped = Math.min(this.overtime ? 2.4 : 1.6, ramp);
    return this.baseSpeed() * hero.speedMult * capped * (1 + this.speedBoost) * this.powerups.speedMultiplier() *
      (this.player.dashT > 0 ? 1.8 : this.player.rollT > 0 ? 1.25 : this.player.stumbleT > 0 ? 0.72 : 1);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.finished) { Input.endFrame(); return; }
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
      if (this.flip) this.flip.t += dt;
      updateParticles(dt);
      for (const f of this.floaties) { f.t -= dt; f.y -= 18 * dt; }
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
      if (this.introFreeze <= 0 && this.introSpeech && !this.introRunning) {
        this.speech = this.introSpeech;
        this.introSpeech = null;
      }
      Input.endFrame(); return;
    }
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
    // pitch shift is the point.
    const star = this.powerups.isInvincible() ? 1.08 : 1;
    Audio.setWarp(star, star);
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
      if (ok && this.player.jumps > 1) burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 6, 40, 0.4, '#ffa8b6', 1, 60, () => this.fxRng.float());
      if (this.mission.type && this.challenge && this.challenge.type === 'onbeat') this.checkOnBeat();
    }
    if (Input.pressed('duck') && this.challenge && this.challenge.type === 'onbeat') this.checkOnBeat();
    if (Input.pressed('ability')) this.useAbility();

    // Player physics. (jumpScale survives hero swaps)
    this.player.jumpScale = this.corrupted.includes('nojump') ? 0.6 : 1;
    const res = this.player.update(wdt, Input, {
      speed: sp, ice: this.cabinet.mechanic === 'ice', gravityScale: this.powerups.gravityMultiplier(),
    });
    if (res.landed) {
      Audio.sfx('land');
      burst(this.camX + PLAYER_X + 6, this.groundYAt(this.camX + PLAYER_X), 5, 30, 0.3, '#c8b898', 1, 40, () => this.fxRng.float());
      if (res.stompLand) { shake(2, 0.15); this.stompBreak(); }
    }
    if (this.player.grounded && Math.floor(this.player.anim) % 4 === 0 && this.fxRng.chance(0.1)) {
      spawn(this.camX + PLAYER_X, this.groundYAt(this.camX + PLAYER_X) - 1, -30, -10, 0.4, '#c8b898', 1, 30);
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
      this.spawner.fill(this.camX, sp, this.obstacles, this.pickups, () => jumpHeightFor(hero));
      this.drip.update(wdt, this.camX, this.pickups, this.oneHit, this.battery >= this.maxBattery());
    }
    this.spawnApplianceMaybe();
    this.checkCheckpoints();
    this.collide();

    if (this.coinComboT > 0) { this.coinComboT -= dt; if (this.coinComboT <= 0) this.coinCombo = 0; }
    for (const f of this.floaties) { f.t -= dt; f.y -= 18 * dt; }
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
  finishCameraX() { return this.finishWorldX() - FINISH_LINE_X; }
  // Where the tape sits on screen. FINISH_LINE_X exactly when the finish run
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
    return this.player.box(this.camX, this.groundYAt(this.playerWorldX()), this.heroScreenX());
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
    if (Input.pressed('jump')) this.player.jumpPressed(Audio);
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

  startFinishRun() {
    if (this.finishing) return;
    this.finishing = true;
    this.finishT = 0;
    this.finishPlayerX = PLAYER_X;
    // The final stretch remains part of the level. Keep anything the player
    // can still reach before the tape, but never show content beyond it.
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
    if (Input.pressed('jump')) this.player.jumpPressed(Audio);
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
    if (!this.flip && this.finishPlayerX + 6 >= this.finishScreenX()) {
      // The frozen camera is deliberately short of the goal; the hero's
      // screen-space run completes the remaining distance.
      this.distance = this.totalDist;
      if (this.demo) { this.endRun(true); return; } // attract clips stay snappy
      // A beat on the finish frame, then results. Transient chatter would
      // clutter the held frame — clear it. The flip's own card is written
      // after the clear, so it survives into the held frame as the only thing
      // on it.
      this.speech = null;
      this.speechQueue = [];
      this.floaties = [];
      this.resolveFlip();
      this.finaleT = FINALE_HOLD + this.flip.band.hold;
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
    this.floatText(points ? `${band.label}  +${points}` : band.label,
      band.id === 'clunk' ? '#8a99a8' : '#f6d33c', { base: FLIP_CARD_Y });
  }

  // ------------------------------------------------------------------ ability
  powerTarget(type = HERO_BY_ID[this.relay.current].ability.type) {
    const px = this.playerWorldX();
    if (type === 'stomp' && this.player.grounded) {
      return this.obstacles
        .filter((ob) => ob.live && ob.def.ground && ob.def.breakable && ob.x + ob.w >= px - 8 && ob.x <= px + 46)
        .sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0] || null;
    }
    if (type === 'eat') {
      return this.obstacles
        .filter((ob) => ob.live && ob.def.breakable && !ob.def.isGap && ob.x + ob.w >= px - 4 && ob.x <= px + 80)
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
      Audio.sfx('launch', { hero: 'b33p', pitch: 1.08 });
      const px = this.playerWorldX() + 12;
      // Charged: a three-round spread, every pellet piercing.
      const alts = charged ? [this.player.y - 6, this.player.y + 8, this.player.y + 22] : [this.player.y + 8];
      for (const alt of alts) {
        this.projectiles.push({ type: 'pellet', x: px, alt, vx: this.speed + 260, live: true, pierce: charged || this.modIds.includes('charge'), hitIds: new Set() });
      }
      this.floatText(charged ? 'FULL CYAN' : 'PEW', '#f6d33c');
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
              this.groundYAt(ob.x) - ob.alt - ob.h / 2);
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
          this.groundYAt(ob.x) - ob.alt - ob.h / 2);
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
    const type = randomPowerPickup(this.fxRng);
    const p = makePickup(type, x, alt);
    p.toss = true;
    p.vx = this.speed * 1.45;
    p.vy = 205; // arcs higher than a coin — you should see this one coming
    this.pickups.push(p);
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
      size: d.size, grav: d.grav ?? 340, floor: this.groundYAt(ob.x), rand: r,
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
    const fromY = this.groundYAt(ob.x) - ob.alt - ob.h / 2;
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
      const cy = this.groundYAt(ob.x) - ob.alt - ob.h / 2;
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
      if (ob.def.prizeChance && this.fxRng.chance(ob.def.prizeChance)) this.tossPrize(cx, alt, silent);
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
  clearPortalApproach(portalX) {
    const approachStart = portalX - 48;
    const portalEnd = portalX + 12;
    for (const ob of this.obstacles) {
      if (ob.live && ob.def.action !== 'none' && ob.x < portalEnd && ob.x + ob.w > approachStart) ob.live = false;
    }
  }

  updatePortal(dt) {
    if (this.portal) {
      if (this.portal.x < this.camX - 30) this.portal = null;
    } else if (this.relay.portalDue()) {
      const hero = this.relay.next;
      this.portal = { x: this.camX + W + 40, hero, label: `${HERO_BY_ID[hero].short} - ${HERO_CALLOUT[hero]}` };
      this.clearPortalApproach(this.portal.x);
      this.relay.portalSpawned();
      // Names the TAG, because this is the moment the word gets taught: the
      // mastery track pays out on 'EVERY PERFECT TAG' and the intro opens on a
      // relay, and until this line said it the player met the term first in a
      // shop description for a thing they had never been told they were doing.
      this.tutor('firstPortal', 'RUN THROUGH THE PORTAL TO TAG IN THE NEXT HERO.');
    }
    if (this.portal) {
      const pbox = { x: this.portal.x, y: this.groundYAt(this.portal.x) - 40, w: 12, h: 40 };
      if (overlaps(this.player.box(this.camX, this.groundYAt(this.camX + PLAYER_X)), pbox)) {
        this.doSwitch();
        this.portal = null;
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

  doSwitch() {
    const px = this.camX + PLAYER_X;
    const result = this.relay.switchHero();
    this.player.setHero(result.to);
    this.usedHeroes.add(result.to);
    this.setButtons();
    Audio.sfx('tag');
    this.score += 100;
    burst(px + 6, GROUND_Y - this.player.y - 8, 14, 80, 0.5, '#48e0c8', 1, 80, () => this.fxRng.float());
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
          const box = entityBox(ob, this.groundYAt(ob.x));
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
      const gy = this.groundYAt(this.camX + PLAYER_X);
      spawn(this.camX + PLAYER_X + 6 + (this.fxRng.float() - 0.5) * 10,
        gy - this.player.y - 6 - this.fxRng.float() * 16,
        -50 - this.fxRng.float() * 60, -20 + this.fxRng.float() * 40,
        0.45, `hsl(${hue},95%,66%)`, 1.4, -25);
    }
  }

  updateCoinMagnet(dt) {
    const hero = HERO_BY_ID[this.relay.current];
    let radius = Math.max(hero.magnetRadius * (this.modIds.includes('bigmagnet') ? 2 : 1), this.powerups.magnetRadius());
    if (hero.id === 'chompo' && this.powerups.active.magnet) radius = Math.max(radius, 110);
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
        this.spawnObjective('cord', this.fxRng.pick([10, 30, 46]));
      }
    }
    if (m.type === 'rescue') {
      this.missionTimers.resident -= dt;
      if (this.missionTimers.resident <= 0 && m.count < m.n) {
        this.missionTimers.resident = (this.totalDist / this.speed) / (m.n + 1.5);
        this.spawnObjective('resident', 0);
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
  spawnObjective(type, alt) {
    const x = Math.min(this.camX + W + 80, this.finishWorldX() - PICKUPS[type].w - 24);
    if (x < this.camX + VIEW_W) return false;
    this.pickups.push(makePickup(type, x, alt));
    return true;
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

  spawnApplianceMaybe() {
    if (this.overtime || !this.stage || this.applianceSpawned) return;
    const at = this.stage.applianceAt * this.totalDist;
    if (this.camX + W > at) {
      this.applianceSpawned = true;
      const alt = this.stage.applianceHigh ? 66 : 16;
      this.pickups.push(makePickup('appliance', at + W, alt));
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
    this.dead = false;
    this.player.iframes = 0.75;
    this.speechQueue = []; // pre-death banter does not survive the respawn
    clearParticles();
  }

  // ------------------------------------------------------------------ rewind
  // Record a snapshot on the fixed cadence during normal forward play.
  // After recording, discard the oldest if the buffer is full.
  recordRewindFrame(dt) {
    this.rewindCaptureT += dt;
    if (this.rewindCaptureT < REWIND_STEP) return;
    this.rewindCaptureT -= REWIND_STEP;
    this.rewindFrames.push(this.makeRewindSnapshot());
    if (this.rewindFrames.length > REWIND_MAX_FRAMES) this.rewindFrames.shift();
  }

  // Deep-snapshot everything the rewind needs to restore: camera, player,
  // relay, world entities, spawners, powerups, RNG streams, mission state.
  makeRewindSnapshot() {
    // Clone world entities, preserving def references.
    const cloneObs = (arr) => arr.filter((e) => e.live).map((e) => {
      const c = { ...e };
      if (c.hitIds) c.hitIds = new Set(c.hitIds);
      if (c.rollContactIds) c.rollContactIds = new Set(c.rollContactIds);
      return c;
    });
    const cloneProj = (arr) => arr.filter((p) => p.live).map((p) => {
      const c = { ...p };
      if (c.hitIds) c.hitIds = new Set(c.hitIds);
      return c;
    });

    // Clone powerup active state.
    const activeClone = {};
    for (const [id, a] of Object.entries(this.powerups.active)) {
      activeClone[id] = { ...a };
    }

    // Player mutable state snapshot.
    const p = this.player;
    const ps = {
      heroId: p.heroId, y: p.y, vy: p.vy, jumps: p.jumps,
      powerJumpBonus: p.powerJumpBonus, ducking: p.ducking, duckAmount: p.duckAmount,
      duckDirection: p.duckDirection, floating: p.floating,
      iframes: p.iframes, anim: p.anim,
      stomping: p.stomping, dashT: p.dashT, rollT: p.rollT,
      compressT: p.compressT, stumbleT: p.stumbleT,
      rollBashed: p.rollBashed, rollDeflectUsed: p.rollDeflectUsed,
      rollPlows: p.rollPlows, deflectFlashT: p.deflectFlashT,
      powerPoseT: p.powerPoseT, powerType: p.powerType,
      spannerFlurryT: p.spannerFlurryT, spannerFlurryCd: p.spannerFlurryCd,
      spannerFlurryHitIds: p.spannerFlurryHitIds ? new Set(p.spannerFlurryHitIds) : null,
      relayCharge: p.relayCharge, chargeFlashT: p.chargeFlashT,
      fistThrown: p.fistThrown, axeThrown: p.axeThrown,
      headless: p.headless, assemblyGraceUsed: p.assemblyGraceUsed,
      hazardEaten: p.hazardEaten, grounded: p.grounded,
      slideT: p.slideT, landedT: p.landedT,
      abilityCooldowns: { ...p.abilityCooldowns }, abilityCd: p.abilityCd,
      rollContactIds: p.rollContactIds ? new Set(p.rollContactIds) : null,
    };

    return {
      // Camera & run
      camX: this.camX, camZoom: this.camZoom, camPan: this.camPan,
      distance: this.distance, tRun: this.tRun, score: this.score, coins: this.coins,
      battery: this.battery, damageTaken: this.damageTaken, speedBoost: this.speedBoost,
      coinCombo: this.coinCombo, coinComboT: this.coinComboT,
      powerupsCollected: this.powerupsCollected,
      hintT: this.hintT, bonusT: this.bonusT,
      // Player
      player: ps,
      // Relay
      relayCurrent: this.relay.current, relayNext: this.relay.next,
      relayBag: this.relay.bag.slice(),
      relaySpawned: this.relay.spawned, relayElapsed: this.relay.elapsed,
      relayTimer: this.relay.portalTimer, relayEvery: this.relay.portalEvery,
      relayLastTagLine: this.relay.lastTagLine, relayLastTagLineT: this.relay.lastTagLineT,
      // Powerups
      shieldStack: this.powerups.shieldStack,
      activePowerups: activeClone,
      // World entities
      obstacles: cloneObs(this.obstacles),
      pickups: this.pickups.filter((p) => p.live).map((p) => ({ ...p })),
      projectiles: cloneProj(this.projectiles),
      chompBites: this.chompBites.map((b) => ({ ...b })),
      portal: this.portal ? { ...this.portal } : null,
      copter: this.copter ? { ...this.copter } : null,
      // Spawners
      spawnerNextX: this.spawner.nextX,
      spawnerLastPatternIdx: this.spawner.lastPatternIdx,
      spawnerLastActionX: this.spawner.lastActionX,
      spawnerLastActionKind: this.spawner.lastActionKind,
      dripCapsuleTimer: this.drip.capsuleTimer,
      dripBatteryTimer: this.drip.batteryTimer,
      // RNG streams (state is just the internal counter)
      rngFx: this.fxRng.state,
      rngSpeech: this.speechRng.state,
      rngRelay: this.relay.rng.state,
      rngSpawn: this.spawner.rng.state,
      rngDrip: this.drip.rng.state,
      // Mission / challenge
      mission: JSON.parse(JSON.stringify(this.mission)),
      challenge: this.challenge ? JSON.parse(JSON.stringify(this.challenge)) : null,
      applianceSpawned: this.applianceSpawned, applianceGot: this.applianceGot,
      fuseHeld: this.fuseHeld,
      escapeWall: this.escapeWall,
      // Misc
      finishing: this.finishing, finishT: this.finishT, finishPlayerX: this.finishPlayerX,
      flip: this.flip ? { ...this.flip } : null,
      usedHeroes: new Set(this.usedHeroes),
      exitSpoken: new Set(this.exitSpoken),
      checkpointHit: this.checkpointHit.slice(),
      snapshot: null, // death checkpoint not carried across rewind
    };
  }

  // Restore the world from a rewind snapshot. Operates in-place on existing
  // objects where possible (player, relay, spawners, RNGs) to avoid breaking
  // references held elsewhere.
  restoreRewindSnapshot(s) {
    // Camera & run
    this.camX = s.camX; this.camZoom = s.camZoom; this.camPan = s.camPan;
    this.distance = s.distance; this.tRun = s.tRun; this.score = s.score; this.coins = s.coins;
    this.battery = s.battery; this.damageTaken = s.damageTaken; this.speedBoost = s.speedBoost;
    this.coinCombo = s.coinCombo; this.coinComboT = s.coinComboT;
    this.powerupsCollected = s.powerupsCollected;
    this.hintT = s.hintT; this.bonusT = s.bonusT;

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

    // World entities: deep-restore preserving def references.
    this.obstacles = s.obstacles.map((e) => {
      const c = { ...e };
      if (c.hitIds) c.hitIds = new Set(c.hitIds);
      if (c.rollContactIds) c.rollContactIds = new Set(c.rollContactIds);
      return c;
    });
    this.pickups = s.pickups.map((p) => ({ ...p }));
    this.projectiles = s.projectiles.map((p) => {
      const c = { ...p };
      if (c.hitIds) c.hitIds = new Set(c.hitIds);
      return c;
    });
    this.chompBites = s.chompBites.map((b) => ({ ...b }));
    this.portal = s.portal ? { ...s.portal } : null;
    this.copter = s.copter ? { ...s.copter } : null;

    // Spawners
    this.spawner.nextX = s.spawnerNextX;
    this.spawner.lastPatternIdx = s.spawnerLastPatternIdx;
    this.spawner.lastActionX = s.spawnerLastActionX;
    this.spawner.lastActionKind = s.spawnerLastActionKind;
    this.drip.capsuleTimer = s.dripCapsuleTimer;
    this.drip.batteryTimer = s.dripBatteryTimer;

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
  }

  // ------------------------------------------------------------------ collision
  collide() {
    const playerX = this.playerWorldX();
    const pbox = this.playerBox();
    // Obstacles.
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      if (ob.def.isGap) {
        // Pit: if player is over the gap at ground level, fall in.
        const over = pbox.x + pbox.w / 2 > ob.x && pbox.x + pbox.w / 2 < ob.x + ob.w;
        if (over && this.player.grounded && this.player.y <= 0) {
          this.takeHit('GRAVITY REMAINS UNDEFEATED', true);
        }
        continue;
      }
      if (ob.def.isBoost) {
        const box = entityBox(ob, this.groundYAt(ob.x));
        if (overlaps(pbox, box) && this.player.grounded) {
          if (!ob.used) {
            ob.used = true;
            this.speedBoost = Math.min(1.0, this.speedBoost + 0.5);
            Audio.sfx('dash');
            this.score += 50;
            if (this.challenge && this.challenge.type === 'boosts') this.challenge.count++;
            for (let i = 0; i < 8; i++) spawn(pbox.x - i * 4, GROUND_Y - 4, -60, -20, 0.4, '#f6d33c', 2, 0);
          }
        }
        continue;
      }
      const box = entityBox(ob, this.groundYAt(ob.x));
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
            this.groundYAt(ob.x) - ob.alt - ob.h / 2);
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
          this.groundYAt(ob.x) - ob.alt - ob.h / 2);
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
      Audio.sfx(hero.id === 'chompo' ? 'waka' : 'coin', { combo: Math.min(12, this.coinCombo) });
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
  floatText(text, color, { solid = false, base = FLOAT_BASE_Y } = {}) {
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
  drawFinishMarker(ctx, fx, gy, z) {
    const flip = this.flip;
    // Throw progress, smoothstepped. Runs once on contact and sticks at 1, so
    // the lever holds its thrown pose for the rest of the held frame instead of
    // snapping back while the results card comes up.
    const thrown = flip ? Math.min(1, flip.t / FLIP_THROW) : 0;
    const ease = thrown * thrown * (3 - 2 * thrown);
    const live = !!flip && flip.band.bonus > 0;   // a clunk throws the lever but lights nothing

    // Pole. Twelve segments, not ten: at 80px Lorenzo's 89px peak carried him
    // clean off the top and into the HUD chips on a good flip, which reads as
    // overshooting the goal rather than topping it out. 96 clears the tallest
    // single jump in the cast, so a PERFECT always lands ON the pole. Mochi's
    // second jump still goes over, which is Mochi being Mochi.
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f6d33c' : '#0b0b14';
      ctx.fillRect(fx, gy - 96 + i * 8, 5, 8);
    }

    // Where PERFECT lives, marked in the only unit that matters: the height
    // THIS hero can actually reach. The target sits at 32px under B-33P and
    // 62px under Lorenzo, so it visibly moves with whoever is holding the
    // baton — which is the rule teaching itself. You see it inside your own
    // jump rather than being handed a number you would have to trust.
    //
    // A bracket in the sky BESIDE the pole, not a band painted on it. Painted
    // on, it was pale yellow over a yellow-and-black checkered pole: invisible
    // against the gold segments, muddy against the black, and it was the single
    // most important thing the new verb had to say. Out here it has open sky
    // behind it, on the side the hero is arriving from, and it carries its own
    // dark backing so it survives the hills too.
    //
    // Only during the dash: on the approach it would be one more thing blinking
    // over a stage that is still being played.
    if (this.finishing && !flip) {
      const peak = jumpHeightFor(HERO_BY_ID[this.relay.current]);
      const top = Math.round(gy - peak);
      const bot = Math.round(gy - peak * FLIP_BANDS[0].at);
      const pulse = this.save.settings.reducedMotion ? 0.85 : 0.6 + 0.3 * Math.sin(this.tRun * 9);
      // Stood off to fx-34 rather than tucked against the pole. The BREAKER and
      // JUMP! plates hang off the box top and reach about 13px left of the
      // pole, and a short hero's target sits at exactly that height — B-33P's
      // bracket landed straight across both plates. Out here it clears them for
      // the whole cast, and a tick at the band's midpoint keeps it tied to the
      // pole so it still reads as a height rather than as loose furniture.
      const mid = Math.round((top + bot) / 2);
      const bracket = (col, o) => {
        ctx.fillStyle = col;
        ctx.fillRect(fx - 34 + o, top + o, 15, 2);
        ctx.fillRect(fx - 34 + o, bot - 2 + o, 15, 2);
        ctx.fillRect(fx - 34 + o, top + o, 2, bot - top);
        ctx.fillRect(fx - 20 + o, mid + o, 20, 1);
      };
      bracket('rgba(11,11,20,0.7)', 1);
      bracket(`rgba(255,255,255,${pulse.toFixed(3)})`, 0);
    }

    // Box. It used to be one flat rectangle, which read as a doorway with a
    // yellow plank taped across it — nothing said "electrical". A recessed
    // housing, four corner bolts and a sunken slot for the lever to sit in cost
    // eight fills and make it an object with fixtures instead of a shape.
    ctx.fillStyle = '#232f3c';
    ctx.fillRect(fx + 6, gy - 36, 20, 36);
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(fx + 7, gy - 34, 18, 33);
    ctx.fillStyle = '#4d6172';                       // top bevel, so it has a lid
    ctx.fillRect(fx + 7, gy - 34, 18, 2);
    ctx.fillStyle = '#1a2430';                       // the slot the lever throws in
    ctx.fillRect(fx + 11, gy - 30, 10, 20);
    ctx.fillStyle = '#5d7385';                       // bolts
    for (const [bx, by] of [[8, -32], [23, -32], [8, -4], [23, -4]]) ctx.fillRect(fx + bx, gy + by, 2, 2);
    // The lit face. Dead grey until the lever lands, then warm — this is the
    // smallest possible version of the power-restore payoff, and the thing the
    // full one scales up into: the same `live`/`ease` pair drives how far back
    // up the strip the lights come on.
    if (live) {
      // The SLOT lights, and a rim runs round the face — not a gold repaint of
      // the whole box. Flooding the face read as a second door rather than as
      // something switching on, and the lever lost its silhouette against it.
      // Lighting the recess the lever sits in puts the glow where the contact
      // just happened.
      ctx.fillStyle = `rgba(246,211,60,${(0.2 + 0.6 * ease).toFixed(3)})`;
      ctx.fillRect(fx + 11, gy - 30, 10, 20);
      ctx.fillStyle = `rgba(255,240,160,${(0.55 * ease).toFixed(3)})`;
      ctx.fillRect(fx + 7, gy - 34, 18, 1);
      ctx.fillRect(fx + 7, gy - 2, 18, 1);
      ctx.fillRect(fx + 7, gy - 34, 1, 33);
      ctx.fillRect(fx + 24, gy - 34, 1, 33);
    }

    // The lever. Rest is cocked up and back; the throw sweeps it forward
    // through its pivot, which is what the hero's weight is doing to it.
    // Pivoted at the centre of the slot so the whole sweep stays on the box
    // face, and stubbier than it was — at 12px long and 4 wide it read as a
    // plank leaning on a door rather than as a switch you throw.
    ctx.save();
    ctx.translate(fx + 16, gy - 20);
    ctx.rotate(-0.9 + 1.8 * ease);
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(-3, -10, 6, 11);       // dark backing, so it reads against the lit slot
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(-2, -9, 4, 10);
    ctx.fillStyle = '#fff0a0';
    ctx.fillRect(-2, -9, 4, 3);         // the grip
    ctx.restore();
    ctx.fillStyle = '#5d7385';
    ctx.fillRect(fx + 15, gy - 21, 2, 2);   // pivot pin

    // Signage, drawn unscaled off the top of the BOX. Magnified with the
    // world it read as a billboard, and hung off the pole instead it landed
    // under the HUD — the pole now stands two thirds of the frame tall.
    ctx.save();
    ctx.translate(fx + 2, gy - 34);
    ctx.scale(1 / z, 1 / z);
    drawTextCentered(ctx, 'THE BREAKER', 0, -14, '#f6d33c', 1, 'ui', UI_PLATE);
    // The call to act, on the object it acts on. The verb has no window and no
    // penalty, so this is a nudge rather than a cue to hit — it says what the
    // pole is for, and stops the moment the pole has been used.
    //
    // Steady, not blinking. The dash it lives on is about a second and a half;
    // a blink spends a third of that switched off, and the two shots taken to
    // check this prompt both caught it dark. It bobs instead, which reads as
    // urgency without ever being absent, and needs no reduced-motion branch
    // because there is nothing to miss if it holds still.
    if (this.finishing && !flip) {
      const bob = this.save.settings.reducedMotion ? 0 : Math.round(Math.sin(this.tRun * 9));
      drawTextCentered(ctx, 'JUMP!', 0, -26 + bob, '#fff0a0', 1, 'ui', UI_PLATE);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ draw
  draw(ctx) {
    const cam = this.camX;
    const z = this.camZoom;
    const pan = this.camPan;
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
    ctx.save();
    ctx.translate(0, pan * (this.style.bgPan ?? 1));
    this.style.bg(ctx, this.tRun, cam, this.cabinet, this.totalDist);
    ctx.restore();

    // ---- world band. Everything from here to post() draws through the camera,
    // in the same coordinates it always did: x offsets from cam, absolute y.
    ctx.save();
    applyWorld(ctx, z, pan);

    // Ground line + gaps.
    this.style.ground(ctx, cam, this.cabinet, this.obstacles);
    if (!this.bossCab) drawTerrain(ctx, cam, this.cabinet, this.obstacles, GROUND_Y);

    // Entities. On a converting style (lcd) the whole cast is held back past
    // post() with the hero, so enemies and pickups stay in colour against the
    // monochrome panel — they are the things you have to read at a glance.
    const drawActors = () => {
    const finishX = this.overtime ? Infinity : this.finishWorldX();
    for (const p of this.pickups) if (p.live && p.x < finishX) this.drawAtGround(ctx, p.x, () => drawWorldEntity(ctx, p, cam, this.tRun, this.style, this.save.settings), p.w);
    for (const ob of this.obstacles) if (ob.live && ob.x < finishX) this.drawAtGround(ctx, ob.x, () => drawWorldEntity(ctx, ob, cam, this.tRun, this.style, this.save.settings), ob.w, ob.def.ground && ob.alt === 0 ? 1.5 : 0);
    for (const bite of this.chompBites) {
      const ob = bite.ob;
      const q = Math.max(0, Math.min(1, bite.t / bite.duration));
      const e = q * q * (3 - 2 * q);
      const fromX = ob.x - cam + ob.w / 2;
      const terrainY = this.groundYAt(ob.x);
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
      drawWorldEntity(ctx, ob, cam, this.tRun, this.style, this.save.settings);
      ctx.restore();
    }
    for (const pr of this.projectiles) {
      const x = Math.round(pr.x - cam), y = Math.round(this.groundYAt(pr.x) - pr.alt - 4);
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
        ctx.fillStyle = '#f6d33c'; ctx.beginPath(); ctx.arc(x + 3, y + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 2, y, 2, 1);
      }
    }
    };
    if (!this.style.actorsAbovePost) drawActors();
    if (!this.finishing && this.portal) this.drawAtGround(ctx, this.portal.x, () => drawPortal(ctx, this.portal, cam, this.tRun, z));
    if (!this.finishing && this.copter) this.drawAtGround(ctx, this.copter.x, () => drawCopter(ctx, this.copter, cam, this.tRun));
    if (this.escapeWall != null) {
      const x = Math.round(this.escapeWall - cam);
      ctx.fillStyle = 'rgba(20,10,30,0.85)';
      ctx.fillRect(x - 100, 0, 100, H);
      ctx.fillStyle = '#8858c8';
      for (let i = 0; i < 6; i++) ctx.fillRect(x - 4 + Math.sin(this.tRun * 6 + i) * 3, i * 45, 4, 30);
    }

    // Finish line: a checkered pole + breaker lever, visible as you approach.
    // One position for both phases. The pole is a fixed world point and the
    // camera is what stops moving when the finish run arms, so deriving its
    // screen x from the camera covers the approach and the run alike — and the
    // tape stays put across the frame the two swap over.
    if (!this.overtime && Number.isFinite(this.totalDist)) {
      const fx = Math.round(this.finishScreenX());
      if (fx - PLAYER_X < 560) this.drawFinishMarker(ctx, fx, this.groundYAt(this.finishWorldX()), z);
      // No FINISH AHEAD blink before this. It sat centre-screen in the dialog
      // band for about two seconds, warning about a pole that arrives labelled
      // moments later — the HUD progress bar warms to gold across that same
      // stretch instead.
    }

    // A soft reticle communicates which nearby obstacle the contextual power
    // will affect without adding another HUD instruction.
    if (!this.finishing && this.player.abilityCd <= 0 && (this.relay.current === 'lorenzo' || this.relay.current === 'chompo')) {
      const target = this.powerTarget();
      if (target) {
        const tx = Math.round(target.x - cam + target.w / 2);
        const ty = Math.round(this.groundYAt(target.x) - target.alt - target.h / 2);
        const pulse = this.save.settings.reducedMotion ? 4 : 4 + Math.sin(this.tRun * 7);
        ctx.strokeStyle = 'rgba(246,211,60,0.65)';
        ctx.beginPath(); ctx.arc(tx, ty, Math.max(target.w, target.h) * 0.65 + pulse, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Player. During the opening run-in this is off the left edge, so the hero
    // draws his way in from beyond the frame (and stays out of sight behind an
    // ACT card, which lifts before he moves).
    const heroScreenX = this.heroScreenX();
    const drawHero = () => drawHeroSprite(ctx, this.player, this.relay.current, this.tRun, cam, this.mission.type === 'fuse',
      { mirror: this.mirror, screenX: heroScreenX, zoom: z, pan,
      groundY: this.groundYAt(cam + heroScreenX),
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
    this.style.post(ctx, this.tRun);
    if (this.style.actorsAbovePost) {
      ctx.save();
      applyWorld(ctx, z, pan);
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
      const hsx = this.heroScreenX();   // follows the opening run-in, not the anchor
      const px = (hsx + 6) * z;
      const py = screenYFor(this.groundYAt(cam + hsx) - this.player.y - 8, z, pan);
      const r = 130;
      const g = ctx.createRadialGradient(px, py, r * 0.35, px, py, r);
      g.addColorStop(0, 'rgba(8,6,12,0)');
      g.addColorStop(0.6, 'rgba(8,6,12,0.28)');
      g.addColorStop(1, 'rgba(8,6,12,0.58)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
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
      const heroX = this.heroScreenX() * z;
      for (const f of this.floaties) {
        drawFloatie(d, f, {
          heroX,
          mirror: this.mirror,
          alpha: Math.max(0, Math.min(1, f.t / 0.25)),
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
    const pb = this.player.box(this.camX, this.groundYAt(this.camX + PLAYER_X));
    ctx.strokeRect(pb.x - this.camX, pb.y, pb.w, pb.h);
    ctx.strokeStyle = '#f00';
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      const b = entityBox(ob, this.groundYAt(ob.x));
      ctx.strokeRect(b.x - this.camX, b.y, b.w, b.h);
    }
    ctx.restore();
    drawText(ctx, `SEED ${this.seed} SPD ${Math.round(this.speed)} X ${Math.round(this.camX)}`, 4, H - 10, '#0f0');
  }
}
