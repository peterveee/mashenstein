// The Run state: one campaign stage (or OVERTIME). Composes player, relay,
// spawner, missions, powerups, style packs, HUD.
import { W, H, shake, updateShake, blit, pushOverlayDraw, setSceneGlow } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Rng } from '../engine/rng.js';
import { setState } from '../engine/states.js';
import { burst, shardBurst, updateParticles, drawParticles, clearParticles, spawn } from '../engine/particles.js';
import { drawText, drawTextCentered, textWidth, wrapText, UI_PLATE } from '../engine/sprites.js';
import { Player, PLAYER_X, jumpHeightFor } from './player.js';
import { Relay } from './relay.js';
import { Spawner, DripSpawner, REACT_FLOOR, REACT_FLOOR_MAX } from './spawner.js';
import { Powerups, POWER_DEFS, randomPowerPickup } from './powerups.js';
import { entityBox, overlaps, makePickup, makeObstacle, DEBRIS, DEBRIS_DEFAULT } from './entities.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { RELAY_MODE } from '../data/flags.js';
import { CABINET_BY_ID, CABINETS } from '../data/cabinets.js';
import { FAIL_MESSAGES, EGGSHELL_TAUNTS, EGGSHELL_NARRATION, TAG_LINES } from '../data/jokes.js';
import { getStylePack, sunShock } from '../engine/stylePacks/index.js';
import { drawHud, drawSpeech } from './hud.js';
import { drawRocketFist, drawThrownAxe } from '../sprites/toons.js';
import { drawHeroSprite, drawWorldEntity, drawPortal, drawCopter } from './draw.js';
import { drawTerrain, terrainGroundY } from './terrain.js';

export const GROUND_Y = 232;

export const HERO_CALLOUT = Object.fromEntries(
  Object.values(HERO_BY_ID).map((hero) => [hero.id, hero.ability.callout]),
);
const BASE_SPEED = 160;
const FINISH_LINE_X = W - 58;

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
  }

  groundYAt(worldX) {
    return this.bossCab ? GROUND_Y : terrainGroundY(this.cabinet, worldX, GROUND_Y);
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
    this.save = o.save;
    const slot = this.save.slot;
    this.bench = slot.bench;
    this.modIds = slot.mods.equipped.slice();
    this.relay = new Relay(this.rng.stream('relay'), slot.stats);
    if (this.corrupted.includes('randomswap')) this.relay.portalEvery = 10;
    this.usedHeroes = new Set([this.relay.current]);
    this.player = new Player(this.relay.current, this.modIds);
    // NO JUMPING: the jump button is on strike; it provides a contractual minimum hop.
    this.player.jumpScale = this.corrupted.includes('nojump') ? 0.6 : 1;
    this.powerups = new Powerups(this.bench, this.modIds);
    this.powerups.shieldStack = HERO_BY_ID[this.relay.current].startShield;

    this.camX = 0;
    this.speedBoost = 0;
    this.tRun = 0;
    this.score = 0;
    this.coins = 0;
    this.coinCombo = 0;
    this.coinComboT = 0;
    this.battery = this.maxBattery();
    this.damageTaken = 0;
    this.hitstop = 0;
    this.briefSlow = 0;
    this.dead = false;
    this.finished = false;
    this.finishing = false;
    this.finishT = 0;
    this.finishPlayerX = PLAYER_X;
    this.deadT = 0;
    this.failMsg = null;
    this.paused = false;
    this.debug = false;

    this.obstacles = [];
    this.pickups = [];
    this.projectiles = [];
    this.floaties = [];
    this.portal = null;         // active portal entity
    this.speech = null;         // {text, t, who}
    this.copter = null;         // chase mission / taunt flyby
    this.tauntT = 30;

    const duration = this.overtime ? Infinity : (this.stage ? this.stage.durationSec : 330);
    this.duration = duration;
    this.distance = 0;
    this.totalDist = this.overtime ? Infinity : duration * this.baseSpeed() * 1.05;

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

    this.styleName = this.corrupted.length ? 'pixel' : this.cabinet.style;
    this.style = getStylePack(this.styleName, this.save.settings);
    this.mirror = this.corrupted.includes('mirror');

    Audio.setBank(this.cabinet.music);
    Audio.setDetune(1);
    this.invActive = false;
    this.lastCoinSprayT = -1;
    Audio.setInvincible(false);
    this.narrateT = this.corrupted.includes('narration') || this.unplugged ? 6 : 0;
    this.setButtons();
    // Breaker-box bonus: applied exactly once per run (enter() re-runs on retry).
    if (this.startingPowerup) {
      const id = this.startingPowerup;
      this.startingPowerup = null;
      this.powerups.grab(id, { minDuration: 30 });
      Audio.sfx('power');
      this.floatText(`BREAKER BONUS: ${POWER_DEFS[id].name}`, PLAYER_X - 20, 70, POWER_DEFS[id].color);
    }
    setSceneGlow(!this.style.lightBg);
    clearParticles();
  }

  exit() { setSceneGlow(false); Input.setContext('default'); Input.setButtons([]); Audio.setDetune(1); Audio.setInvincible(false); }

  setButtons() {
    // Touch only: keyboard players have P/M keys, and the freed top-right
    // corner holds the ability gauge instead.
    this.touchButtons = Input.usingTouch;
    Input.setButtons(Input.usingTouch ? [
      { id: 'pause', x: W - 18, y: 8, w: 14, h: 12, action: 'pause', label: '=' },
      { id: 'mute', x: W - 36, y: 8, w: 14, h: 12, action: 'mute', label: 'M' },
      { id: 'ability', x: W - 56, y: H - 52, w: 44, h: 40, action: 'ability', label: 'PWR' },
    ] : []);
  }

  maxBattery() {
    if (this.oneHit) return 1;
    return 4 + (this.modIds.includes('storebrand') ? 1 : 0);
  }

  baseSpeed() {
    return BASE_SPEED * (1 + (this.cabinet.speedBonus || 0)) *
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
    if (this.finishing) { this.updateFinish(dt); Input.endFrame(); return; }
    if (Input.usingTouch !== this.touchButtons) this.setButtons(); // first touch mid-run
    if (Input.pressed('mute')) { this.save.settings.muted = !this.save.settings.muted; Audio.setMuted(this.save.settings.muted); this.save.persist(); }
    if (Input.pressed('debug')) this.debug = !this.debug;
    if (Input.pressed('escape')) {
      if (this.paused) { this.endRun(false, 'QUIT'); Input.endFrame(); return; }
      this.paused = true;
    }
    if (Input.pressed('pause')) this.paused = !this.paused;
    // Scene bloom brightens anything above ~0.8 luma. On paper-white packs
    // that is the WHOLE background, so the bloom clips it to pure white and
    // erases the linework. Those packs opt out.
    setSceneGlow(!this.paused && !this.dead && !this.style.lightBg);
    if (this.paused) {
      Input.endFrame();
      return;
    }
    if (this.hitstop > 0) { this.hitstop -= dt; Input.endFrame(); return; }
    if (this.dead) { this.updateDead(dt); Input.endFrame(); return; }

    const ts = this.powerups.timescale() * (this.briefSlow > 0 ? 0.35 : 1);
    if (this.briefSlow > 0) this.briefSlow -= dt;
    // Slow-mo drags the tempo down but stays in key — a pitch drop reads as a
    // tape stall, not a slowdown. Invincibility still winds both up a whole
    // tone, where the pitch shift is the point.
    const slow = this.powerups.active.slowmo ? 0.94 : 1;
    const star = this.powerups.isInvincible() ? 1.08 : 1;
    Audio.setWarp(slow * star, star);
    const wdt = dt * ts;   // world time (slow-mo affects world, not score accrual)

    this.tRun += wdt;
    const hero = HERO_BY_ID[this.relay.current];

    // Movement / camera.
    const sp = this.speed;
    this.camX += sp * wdt;
    this.distance = this.camX;
    if (this.speedBoost > 0) this.speedBoost = Math.max(0, this.speedBoost - wdt * 0.6);

    // Score accrual (real time).
    const sMult = hero.scoreMult * this.powerups.scoreMult() * (this.modIds.includes('crayon') ? 0.95 : 1);
    this.score += 10 * (sp / BASE_SPEED) * sMult * dt;

    // Inputs. The borrowed Air Jump applies before the button edge is read so
    // a capsule caught while airborne is useful on the very next frame.
    this.player.powerJumpBonus = this.powerups.bonusJumps();
    if (Input.pressed('jump')) {
      const ok = this.player.jumpPressed(Audio);
      if (ok && this.player.jumps > 1) burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 6, 40, 0.4, '#f8c0d8', 1, 60, () => this.fxRng.float());
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
      this.drip.update(wdt, this.camX, this.pickups, this.oneHit);
    }
    this.spawnApplianceMaybe();
    this.checkCheckpoints();
    this.collide();

    if (this.coinComboT > 0) { this.coinComboT -= dt; if (this.coinComboT <= 0) this.coinCombo = 0; }
    for (const f of this.floaties) { f.t -= dt; f.y -= 18 * dt; }
    this.floaties = this.floaties.filter((f) => f.t > 0);
    if (this.speech && (this.speech.t -= dt) <= 0) this.speech = null;

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
      this.endRun(false, 'MISSION INCOMPLETE');
    }
    Input.endFrame();
  }

  missionSatisfied() {
    const m = this.mission;
    switch (m.type) {
      case 'targets': return m.count >= m.n;
      case 'cords': return m.count >= m.n;
      case 'chase': return this.copter && this.copter.caught >= m.n;
      // Residents still in tow count: checkpoints stop at 2/3 distance (and
      // don't exist at all on one-hit runs), so carrying them across the
      // finish must satisfy the mission or late pickups soft-lock the run.
      case 'rescue': return m.count + this.pickups.filter((p) => p.live && p.def.resident && p.following).length >= m.n;
      default: return true; // reach/fuse/blackout/escape: surviving to the end is the win
    }
  }

  finishWorldX() { return this.totalDist + PLAYER_X; }
  finishCameraX() { return this.finishWorldX() - FINISH_LINE_X; }
  playerWorldX() { return this.camX + (this.finishing ? this.finishPlayerX : PLAYER_X); }
  playerBox() {
    const screenX = this.finishing ? this.finishPlayerX : PLAYER_X;
    return this.player.box(this.camX, this.groundYAt(this.playerWorldX()), screenX);
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
    this.portal = null;
    this.copter = null;
    this.floaties = [];
  }

  updateFinish(dt) {
    const ts = this.powerups.timescale();
    const wdt = dt * ts;
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
    this.updateEntities(wdt, sp);
    this.updateProjectiles(wdt, sp);
    this.collide();
    if (this.dead) return;
    updateParticles(dt);
    updateShake(dt, () => this.fxRng.float());
    if (this.finishPlayerX + 6 >= FINISH_LINE_X) {
      // The frozen camera is deliberately short of the goal; the hero's
      // screen-space run completes the remaining distance.
      this.distance = this.totalDist;
      this.endRun(true);
    }
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
    const cdMult = 1 - 0.1 * (this.bench.tuneup || 0);
    const type = hero.ability.type;
    // A banked relay charge fires through the cooldown; it is the reward.
    const charged = !!this.player.relayCharge;
    if (this.player.abilityCd > 0 && !charged) return;
    if (type === 'roll' && !this.player.grounded) return;
    if (charged) {
      this.player.relayCharge = false;
      this.player.chargeFlashT = 0.5;
      shake(3, 0.2);
      this.floatText(hero.ability.label, this.camX + PLAYER_X - 10, 62, '#f6d33c');
    }
    this.player.abilityCd = hero.ability.cooldown * cdMult;
    this.player.powerType = type;
    this.player.powerPoseT = 0.3;
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
        const px = this.playerWorldX();
        const target = this.powerTarget(type);
        if (target) this.breakObstacle(target);
        Audio.sfx('crunch');
        shake(2, 0.12);
        this.floatText(target ? 'WRENCH SMASH' : 'CLANG', px, GROUND_Y - 28, '#f6d33c');
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
      this.player.rollPlows = charged; // charged: bash without the sidegrade
      this.player.ducking = false;
      Audio.sfx('dash');
    } else if (type === 'shoot') {
      Audio.sfx('shoot');
      const px = this.playerWorldX() + 12;
      // Charged: a three-round spread, every pellet piercing.
      const alts = charged ? [this.player.y - 6, this.player.y + 8, this.player.y + 22] : [this.player.y + 8];
      for (const alt of alts) {
        this.projectiles.push({ type: 'pellet', x: px, alt, vx: this.speed + 260, live: true, pierce: charged || this.modIds.includes('charge'), hitIds: new Set() });
      }
      this.floatText(charged ? 'FULL CYAN' : 'PEW', this.playerWorldX(), GROUND_Y - this.player.y - 24, '#f6d33c');
    } else if (type === 'compress') {
      this.player.compressT = charged ? 2.6 : 1;
      Audio.sfx('power');
      this.floatText(charged ? 'DEFINITELY NOT NORMAL PHYSICS' : 'PROBABLY NORMAL PHYSICS', this.playerWorldX() - 30, GROUND_Y - this.player.y - 30, '#f8c0d8');
    } else if (type === 'eat') {
      const px = this.playerWorldX();
      Audio.sfx('chomp');
      if (charged) {
        // Charged: clears the plate. Everything on screen, still politely.
        let ate = 0;
        for (const ob of this.obstacles) {
          if (ob.live && ob.def.breakable !== false && !ob.def.isGap
              && ob.x > this.camX && ob.x < this.camX + W) { this.breakObstacle(ob, true); ate++; }
        }
        this.floatText(ate ? 'MISS CHOMP ATE ALL OF IT. POLITELY.' : 'NOTHING ON THE MENU.', px, GROUND_Y - 48, '#f6d33c');
      } else {
        const target = this.powerTarget(type);
        if (target) {
          this.breakObstacle(target, true);
          this.floatText('MISS CHOMP ATE IT. POLITELY.', target.x, GROUND_Y - target.alt - target.h - 10, '#f6d33c');
        } else this.floatText('AIR: SURPRISINGLY LOW CALORIE.', px, GROUND_Y - 36, '#f6d33c');
      }
      if (this.modIds.includes('eat') && !this.player.hazardEaten) {
        this.player.hazardEaten = true;
        this.player.abilityCd = 0;
      }
    } else if (type === 'fist') {
      Audio.sfx('plop');
      this.player.fistThrown = true;
      // Charged: the fist keeps going instead of turning back at the first hit.
      this.projectiles.push({ type: 'fist', x: this.playerWorldX() + 12, alt: this.player.y + 10, vx: this.speed + (charged ? 320 : 210), t: 0, live: true, returning: false, pierce: charged, hitIds: new Set() });
    } else if (type === 'axe') {
      Audio.sfx('axe');
      this.player.axeThrown = true;
      // Charged: the axe works the whole screen before coming home.
      const hits = charged ? 99 : (this.modIds.includes('ricochet') ? 2 : 1);
      this.projectiles.push({ type: 'axe', x: this.playerWorldX() + 12, alt: this.player.y + 10, vx: this.speed + (charged ? 300 : 220), t: 0, live: true, returning: false, hits, hitIds: new Set() });
      if (this.fxRng.chance(0.25)) this.floatText('BOY.', this.camX + PLAYER_X, GROUND_Y - this.player.y - 26, '#e8b890');
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

  // A ?-box is a prize box, so it pops brighter than a splintering crate: gold
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
    if (!quiet) {
      Audio.sfx('power');
      this.floatText('PRIZE!', x, GROUND_Y - alt - 16, '#f6d33c');
    }
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
      this.floatText(`${this.mission.count}/${this.mission.n}`, ob.x, GROUND_Y - ob.alt - ob.h - 8, '#48e0c8');
    }
    if (ob.def.isSwitch) this.openGates(ob.x);
  }

  openGates(x) {
    // Frozen switch: remove the next gap (a bridge slides in).
    Audio.sfx('checkpoint');
    for (const ob of this.obstacles) {
      if (ob.live && ob.def.isGap && ob.x > x) { ob.live = false; this.floatText('BRIDGE. YOU EARNED IT.', ob.x, GROUND_Y - 30, '#b8e0f8'); break; }
    }
  }

  // ------------------------------------------------------------------ relay
  updatePortal(dt) {
    if (this.portal) {
      if (this.portal.x < this.camX - 30) this.portal = null;
    } else if (this.relay.portalDue()) {
      const hero = this.relay.next;
      this.portal = { x: this.camX + W + 40, hero, label: `${HERO_BY_ID[hero].short} - ${HERO_CALLOUT[hero]}` };
      this.relay.portalSpawned();
      this.tutor('firstPortal', 'RUN THROUGH THE PORTAL TO CHANGE HERO.');
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
    this.speech = { text, t: 2.8, who: null };
    this.briefSlow = Math.max(this.briefSlow, 0.55); // brief slow, never a stop
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
    // say what this hero DOES, right now, in the player's control scheme
    const btn = Input.usingTouch ? 'PWR' : 'RIGHT/D';
    this.speech = { text: `${btn}: ${HERO_CALLOUT[result.to]}`, t: 2, who: result.to };
    this.tutor('firstSwitch', RELAY_MODE === 'charge'
      ? 'SWITCH 3 TIMES TO CHARGE YOUR POWER.'
      : 'SWITCH 3 TIMES FOR A RELAY BLAST.');
    this.tutor('firstAbility', `EVERY HERO HAS A POWER. PRESS ${btn}.`);
    if (result.blast) {
      if (RELAY_MODE === 'charge') this.grantRelayCharge(btn);
      else this.relayBlast();
    }
  }

  // 'charge' mode: bank an empowered ability instead of firing automatically.
  // An unspent charge rides along through later switches rather than vanishing.
  grantRelayCharge(btn) {
    this.player.relayCharge = true;
    Audio.sfx('power');
    shake(2, 0.15);
    this.floatText('POWER CHARGED', this.camX + PLAYER_X - 10, 70, '#f6d33c');
    burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 20, 90, 0.6, '#f6d33c', 2, 70, () => this.fxRng.float());
    this.tutor('firstCharge', `CHARGED. YOUR NEXT ${btn} IS SUPERCHARGED.`);
  }

  // Every third switch: automatic screen-clearing Relay Blast.
  relayBlast() {
    Audio.sfx('power');
    shake(4, 0.3);
    this.floatText('RELAY BLAST', this.camX + PLAYER_X - 10, 70, '#f6d33c');
    for (const ob of this.obstacles) {
      if (ob.live && ob.x > this.camX && ob.x < this.camX + W && ob.def.breakable !== false && !ob.def.isGap) this.breakObstacle(ob, true);
    }
    burst(this.camX + PLAYER_X + 60, GROUND_Y - 40, 40, 120, 0.8, '#f6d33c', 2, 100, () => this.fxRng.float());
    this.tutor('firstBlast', 'RELAY BLAST: EVERY 3RD SWITCH. AUTOMATIC.');
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
        if (ob.shootT <= 0 && ob.x > this.playerWorldX() + 60 && ob.x < this.camX + W + 40) {
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
      c.x = this.camX + 80 + (Math.sin(this.tRun * 0.55) * 0.5 + 0.5) * 240;
      c.alt = 50 + Math.sin(this.tRun * 1.7) * 20;
      if (c.cooldown > 0) c.cooldown -= dt;
      const dx = c.x - (this.camX + PLAYER_X);
      c.inRange = this.mission.type === 'chase' && dx < 90 && c.cooldown <= 0;
      if (this.mission.type === 'chase' && dx < 40 && c.cooldown <= 0 && this.player.y > c.alt - 30) {
        c.caught++;
        c.cooldown = 8;
        Audio.sfx('power');
        this.floatText(`CAUGHT ${c.caught}/${this.mission.n}. IT FILED A COMPLAINT.`, c.x - 40, GROUND_Y - c.alt - 30, '#f6d33c');
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
        const returnAfter = pr.type === 'fist' ? 0.42 : 0.55;
        if (!pr.returning && pr.t > returnAfter) pr.returning = true;
        pr.x += (pr.returning ? -(sp + (pr.type === 'fist' ? 240 : 300)) : pr.vx) * dt;
        if (pr.returning && pr.x < this.playerWorldX()) {
          pr.live = false;
          if (pr.type === 'fist') this.player.fistThrown = false;
          if (pr.type === 'axe') {
            this.player.axeThrown = false;
            if (this.fxRng.chance(0.15)) this.floatText('THE AXE LODGED IN THE SCENERY. INTENDED.', this.camX + PLAYER_X, GROUND_Y - 70, '#e8b890');
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
            if (!ob.def.ground && Math.abs(ob.x - pr.x) < 8 && pr.type === 'pellet') { pr.live = false; Audio.sfx('ui'); }
            continue;
          }
          const box = entityBox(ob, this.groundYAt(ob.x));
          const pbox = { x: pr.x, y: this.groundYAt(pr.x) - pr.alt - 4, w: 8, h: 8 };
          if (overlaps(box, pbox)) {
            pr.hitIds.add(ob.id);
            if (ob.def.breakable === false) {
              Audio.sfx('ui');
              if (pr.type === 'axe' || pr.type === 'fist') pr.returning = true;
              else pr.live = false;
              continue;
            }
            this.breakObstacle(ob);
            if (pr.type === 'axe') { pr.hits--; if (pr.hits <= 0) pr.returning = true; }
            else if (pr.type === 'fist' && !pr.pierce) pr.returning = true;
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
          this.floatText('DEFLECTED', playerX, this.groundYAt(playerX) - 32, '#a8e6ff');
        } else if (overlaps(playerBox, pbox) && !this.player.invincible) {
          pr.live = false;
          this.takeHit('SHOT BY A DRONE WITH A GRUDGE');
        }
      }
    }
    if (!this.projectiles.some((p) => p.live && p.type === 'fist')) this.player.fistThrown = false;
    if (!this.projectiles.some((p) => p.live && p.type === 'axe')) this.player.axeThrown = false;
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
      this.speech = { text: this.fxRng.pick(EGGSHELL_TAUNTS), t: 3.2, who: 'eggshell' };
    }
    if (this.narrateT > 0) {
      this.narrateT -= dt;
      if (this.narrateT <= 0) {
        this.narrateT = 18 + this.fxRng.range(0, 10);
        this.floatText(this.fxRng.pick(EGGSHELL_NARRATION), this.camX + 120, 50, '#c8b8e8');
      }
    }
  }

  updateMission(dt) {
    const m = this.mission;
    if (m.type === 'cords') {
      this.missionTimers.cord -= dt;
      if (this.missionTimers.cord <= 0 && m.count + this.pickups.filter((p) => p.def.cord).length < m.n) {
        this.missionTimers.cord = (this.totalDist / this.speed) / (m.n + 2);
        this.pickups.push(makePickup('cord', this.camX + W + 80, this.fxRng.pick([10, 30, 46])));
      }
    }
    if (m.type === 'rescue') {
      this.missionTimers.resident -= dt;
      if (this.missionTimers.resident <= 0 && m.count < m.n) {
        this.missionTimers.resident = (this.totalDist / this.speed) / (m.n + 1.5);
        this.pickups.push(makePickup('resident', this.camX + W + 80, 0));
      }
    }
    if (this.challenge && this.challenge.type === 'coins') this.challenge.count = this.coins;
    if (this.challenge && this.challenge.type === 'onbeat') { /* counted on input */ }
  }

  checkOnBeat() {
    const phase = Audio.beatPhase();
    if (phase < 0.18 || phase > 0.82) {
      this.challenge.count++;
      this.score += 20;
      this.floatText('ON BEAT', this.camX + PLAYER_X, GROUND_Y - this.player.y - 30, '#f6d33c');
    }
  }

  spawnApplianceMaybe() {
    if (this.overtime || !this.stage || this.applianceSpawned) return;
    const at = this.stage.applianceAt * this.totalDist;
    if (this.camX + W > at) {
      this.applianceSpawned = true;
      const alt = this.stage.applianceHigh ? 62 : 12;
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
      this.floatText(`CHECKPOINT. +${restored} CELL${restored > 1 ? 'S' : ''}. SINCERELY.`, this.camX + PLAYER_X - 30, 60, '#48c848');
      this.snapshot = this.makeSnapshot();
      // Rescue delivery.
      if (this.mission.type === 'rescue') {
        const carried = this.pickups.filter((p) => p.following);
        for (const p of carried) { p.live = false; this.mission.count++; }
        if (carried.length) this.floatText(`RESIDENTS DELIVERED: ${this.mission.count}/${this.mission.n}`, this.camX + PLAYER_X, 80, '#48e0c8');
      }
    }
  }

  makeSnapshot() {
    return {
      camX: this.camX, tRun: this.tRun, score: this.score, coins: this.coins,
      battery: this.maxBattery(),
      mission: JSON.parse(JSON.stringify(this.mission)),
      challenge: this.challenge ? JSON.parse(JSON.stringify(this.challenge)) : null,
      relayState: { current: this.relay.current, next: this.relay.next, bag: this.relay.bag.slice(), pips: this.relay.pips },
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
      this.relay.pips = s.relayState.pips;
    }
    this.player = new Player(this.relay.current, this.modIds);
    this.player.abilityCooldowns = { ...(s.abilityCooldowns || {}) };
    this.player.relayCharge = !!s.relayCharge;
    this.spawner.nextX = Math.max(s.spawnerX, s.camX + 400);
    this.spawner.lastActionX = s.camX;
    this.obstacles = []; this.pickups = []; this.projectiles = [];
    this.portal = null;
    this.applianceSpawned = s.applianceSpawned; this.applianceGot = s.applianceGot;
    this.escapeWall = s.escapeWall != null ? s.camX - 140 : null;
    if (this.copter) { this.copter.caught = s.copterCaught; this.copter.cooldown = 2; }
    this.dead = false;
    this.player.iframes = 1.5;
    clearParticles();
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
        this.floatText('SHIELD BASH. EARS RINGING.', pbox.x, box.y - 12, '#a8e6ff');
        continue;
      }
      // Targets and switches are objectives, not hazards: contact breaks them.
      // (Without this, jumping into a ?-crate Mario-style dealt damage and the
      // break-N-targets missions read as impossible to anyone without an
      // offensive ability equipped.)
      if (ob.def.isTarget || ob.def.isSwitch) {
        this.breakObstacle(ob);
        continue;
      }
      this.takeHit(null);
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
      this.battery = Math.min(this.maxBattery(), this.battery + 1);
      Audio.sfx('power');
      this.floatText('+1 CELL', p.x, GROUND_Y - p.alt - 16, '#48c848');
    } else if (p.def.power) {
      const res = this.powerups.grab(p.def.power);
      Audio.sfx('power');
      this.floatText(res.overcharged ? 'OVERCHARGED' : this.powerNameOf(p.def.power), p.x, GROUND_Y - p.alt - 16, res.overcharged ? '#f6d33c' : '#c8e0ff');
    } else if (p.def.appliance) {
      this.applianceGot = true;
      Audio.sfx('win');
      this.score += 500;
      this.coins += 20;
      this.floatText('THE HIGHLY NECESSARY GOLDEN APPLIANCE. IT IS A TOASTER.', p.x - 60, GROUND_Y - p.alt - 20, '#f6d33c');
    } else if (p.def.cord) {
      this.mission.count++;
      Audio.sfx('checkpoint');
      this.floatText(`CORD PIECE ${this.mission.count}/${this.mission.n}`, p.x, GROUND_Y - p.alt - 16, '#48e0c8');
    } else if (p.def.resident) {
      p.live = true; p.following = true;
      Audio.sfx('ui');
      this.floatText('A RESIDENT FOLLOWS YOU. CONFUSED BUT GAME.', p.x, GROUND_Y - 40, '#9ec89e');
    }
  }

  powerNameOf(id) { return id === 'star' ? 'SCORE STAR' : (POWER_DEFS[id]?.name || id.toUpperCase()); }

  // ------------------------------------------------------------------ damage
  takeHit(msg, isPit = false) {
    if (this.player.iframes > 0) return;
    // UNPEELABLE deflects hits; gravity remains undefeated (pits still hurt).
    if (!isPit && this.powerups.isInvincible()) {
      this.player.iframes = 0.35;   // debounce repeated same-frame contact
      Audio.sfx('shield');
      this.floatText('UNPEELABLE.', this.camX + PLAYER_X - 10, GROUND_Y - this.player.y - 40, '#e8e8f0');
      return;
    }
    const absorb = this.powerups.absorbHit();
    sunShock(); // the level-1 sun gasps at any real impact (shielded or not)
    if (absorb.absorbed) {
      Audio.sfx('shield');
      shake(3, 0.2);
      // the orb shatters into glass shards
      burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 12, 18, 140, 0.5, '#a8e6ff', 1, 120, () => this.fxRng.float());
      this.floatText('SHIELD BROKE. IT DID ITS JOB.', this.camX + PLAYER_X - 30, GROUND_Y - this.player.y - 40, '#a8e6ff');
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
      this.floatText("RAY M'N SCATTERED. REASSEMBLY IS IN PROGRESS.", this.camX + PLAYER_X - 40, GROUND_Y - 60, '#48e0c8');
      if (isPit) this.hopOutOfPit();
      return;
    }
    this.battery--;
    this.damageTaken++;
    if (this.challenge && this.challenge.type === 'noDamage') this.challenge.failed = true;
    if (this.mission.type === 'fuse' && this.battery > 0) this.floatText('THE FUSE SURVIVED. BARELY. IT SAW EVERYTHING.', this.camX + PLAYER_X - 30, 70, '#e04848');
    Audio.sfx('hit');
    shake(5, 0.3);
    this.hitstop = 0.12;
    burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 16, 90, 0.6, '#e04848', 2, 140, () => this.fxRng.float());
    if (this.battery <= 0) {
      this.die(msg);
    } else {
      this.player.iframes = 1.4;
      if (isPit) this.hopOutOfPit();
    }
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
  }

  updateDead(dt) {
    this.deadT += dt;
    this.player.vy -= this.gravityForDeath() * dt;
    this.player.y += this.player.vy * dt;
    if (this.deadT > 1.4) {
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
      failMsg: this.failMsg,
      distance: Math.floor(this.distance),
      time: this.tRun,
    };
    this.o.onEnd(result);
  }

  floatText(text, x, y, color) {
    // Comic asides need longer than impact words such as PEW or DEFLECTED.
    const readingTime = Math.min(3.2, 1.6 + Math.max(0, text.length - 18) * 0.035);
    this.floaties.push({ text, x, y, color, t: readingTime });
    if (this.floaties.length > 8) this.floaties.shift();
  }

  // ------------------------------------------------------------------ draw
  draw(ctx) {
    const cam = this.camX;
    ctx.save();
    if (this.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    this.style.bg(ctx, this.tRun, cam, this.cabinet, this.totalDist);

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
        drawThrownAxe(ctx, x + 4, y + 4, pr.t * 12);
      } else if (pr.type === 'fist') {
        drawRocketFist(ctx, x + 4, y + 2, pr.t, pr.returning);
      } else {
        ctx.fillStyle = '#f6d33c'; ctx.beginPath(); ctx.arc(x + 3, y + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 2, y, 2, 1);
      }
    }
    };
    if (!this.style.actorsAbovePost) drawActors();
    if (!this.finishing && this.portal) this.drawAtGround(ctx, this.portal.x, () => drawPortal(ctx, this.portal, cam, this.tRun));
    if (!this.finishing && this.copter) this.drawAtGround(ctx, this.copter.x, () => drawCopter(ctx, this.copter, cam, this.tRun));
    if (this.escapeWall != null) {
      const x = Math.round(this.escapeWall - cam);
      ctx.fillStyle = 'rgba(20,10,30,0.85)';
      ctx.fillRect(x - 100, 0, 100, H);
      ctx.fillStyle = '#8858c8';
      for (let i = 0; i < 6; i++) ctx.fillRect(x - 4 + Math.sin(this.tRun * 6 + i) * 3, i * 45, 4, 30);
    }

    // Finish line: a checkered pole + breaker lever, visible as you approach.
    if (!this.overtime && Number.isFinite(this.totalDist)) {
      const remaining = this.totalDist - this.distance;
      if (remaining < 560) {
        const fx = this.finishing ? FINISH_LINE_X : Math.round(remaining + PLAYER_X);
        const finishGround = this.finishing ? this.groundYAt(this.finishWorldX()) : this.groundYAt(this.camX + fx);
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#f6d33c' : '#0b0b14';
          ctx.fillRect(fx, finishGround - 80 + i * 8, 5, 8);
        }
        // the breaker box
        ctx.fillStyle = '#3a4a5a';
        ctx.fillRect(fx + 7, finishGround - 34, 18, 34);
        ctx.fillStyle = '#f6d33c';
        ctx.fillRect(fx + 13, finishGround - 28, 6, 10);
        ctx.fillStyle = '#0b0b14';
        ctx.fillRect(fx + 15, finishGround - 26, 2, 3);
        ctx.fillRect(fx + 12, finishGround - 25, 2, 3);
        drawText(ctx, 'THE BREAKER', fx - 14, finishGround - 94, '#f6d33c', 1, 'ui', UI_PLATE);
      } else if (remaining < this.speed * 5) {
        if (Math.floor(this.tRun * 2) % 2 === 0) drawTextCentered(ctx, 'FINISH AHEAD', W / 2, 70, '#f6d33c', 1, 'ui', UI_PLATE);
      }
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

    // Player.
    const heroScreenX = this.finishing ? this.finishPlayerX : PLAYER_X;
    const drawHero = () => drawHeroSprite(ctx, this.player, this.relay.current, this.tRun, cam, this.mission.type === 'fuse',
      { mirror: this.mirror, flat: this.paused || this.dead, screenX: heroScreenX,
      groundY: this.groundYAt(cam + heroScreenX),
        shield: this.powerups.shieldStack, settings: this.save.settings,
        invincible: this.powerups.active.unpeel ? this.powerups.active.unpeel.t : 0 });

    // A style whose post() *converts* the frame rather than tinting it (lcd)
    // takes the cast after the pass, so hero, enemies and pickups stay in
    // colour against a monochrome background — on a two-tone panel an unlit
    // hazard is indistinguishable from printed backplate art. Normal
    // frames queue the hero to the overlay layer and are unaffected either way;
    // this is what keeps paused/dead and mirrored frames — which bake the hero
    // into the backbuffer — consistent with them. Still ahead of the blackout
    // overlay and inside the mirror transform, so both continue to apply.
    if (!this.style.actorsAbovePost) drawHero();
    drawParticles(ctx, cam);
    this.style.post(ctx, this.tRun);
    if (this.style.actorsAbovePost) { drawActors(); drawHero(); }

    // Blackout overlay (mission).
    if (this.mission.type === 'blackout') {
      // A brown-out, not a blackout: the edges dim hard but hazards stay
      // readable — the tension is squinting, not guessing.
      const px = PLAYER_X + 6, py = this.groundYAt(cam + PLAYER_X) - this.player.y - 8;
      const r = this.briefSlow > 0 ? 260 : 130;
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
      for (const f of this.floaties) {
        const lines = wrapText(f.text, W - 32, 1, 2);
        const widest = Math.max(...lines.map((line) => textWidth(line)));
        const halfW = widest / 2;
        // Clamp using the actual rendered width, not merely the anchor point.
        // Very long comments naturally settle at screen center as the world
        // scrolls, while short impact words can still follow their target.
        const centerX = Math.max(8 + halfW, Math.min(W - 8 - halfW, Math.round(f.x - cam)));
        const topY = Math.max(38, Math.min(H - 48 - lines.length * 10, Math.round(f.y)));
        lines.forEach((line, i) => drawTextCentered(d, line, centerX, topY + i * 10, f.color, 1, 'ui', UI_PLATE));
      }
      if (this.speech) drawSpeech(d, this.speech);
      drawHud(d, this);
    };
    if (!pushOverlayDraw(drawUi)) drawUi(ctx);

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      drawTextCentered(ctx, 'PAUSED', W / 2, 84, '#fff', 2, 'title');
      const pHero = HERO_BY_ID[this.relay.current];
      const pBtn = Input.usingTouch ? 'PWR' : 'RIGHT/D';
      drawTextCentered(ctx, pHero.name, W / 2, 112, '#48e0c8');
      drawTextCentered(ctx, `${pBtn}: ${pHero.ability.label}  ${this.player.abilityCd <= 0 ? 'READY' : `${this.player.abilityCd.toFixed(1)}S`}`, W / 2, 124, '#f6d33c');
      drawTextCentered(ctx, `MISSION: ${this.mission.desc}`, W / 2, 140, '#c8e0ff');
      drawTextCentered(ctx, RELAY_MODE === 'charge'
        ? (this.player.relayCharge ? 'POWER CHARGED: SPEND IT' : `POWER CHARGE: ${this.relay.pips}/3 SWITCHES`)
        : `RELAY BLAST: ${this.relay.pips}/3 SWITCHES`, W / 2, 152, '#f890b8');
      drawTextCentered(ctx, Input.usingTouch ? 'TAP JUMP   SWIPE DOWN DUCK   PWR POWER' : 'SPACE JUMP   DOWN DUCK   RIGHT/D POWER', W / 2, 170, '#c8c8d8');
      drawTextCentered(ctx, 'P: RESUME   ESC: QUIT TO HUB', W / 2, 184, '#8a8a98');
    }
    if (this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, W, H);
      drawTextCentered(ctx, this.failMsg || 'UNPLUGGED', W / 2, 110, '#e04848', 1);
    }
    if (this.debug) this.drawDebug(ctx);
  }

  drawDebug(ctx) {
    ctx.strokeStyle = '#0f0';
    const pb = this.player.box(this.camX, this.groundYAt(this.camX + PLAYER_X));
    ctx.strokeRect(pb.x - this.camX, pb.y, pb.w, pb.h);
    ctx.strokeStyle = '#f00';
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      const b = entityBox(ob, this.groundYAt(ob.x));
      ctx.strokeRect(b.x - this.camX, b.y, b.w, b.h);
    }
    drawText(ctx, `SEED ${this.seed} SPD ${Math.round(this.speed)} X ${Math.round(this.camX)}`, 4, H - 10, '#0f0');
  }
}
