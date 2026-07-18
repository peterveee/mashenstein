// The Run state: one campaign stage (or OVERTIME). Composes player, relay,
// spawner, missions, powerups, style packs, HUD.
import { W, H, shake, updateShake, blit } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Rng } from '../engine/rng.js';
import { setState } from '../engine/states.js';
import { burst, updateParticles, drawParticles, clearParticles, spawn } from '../engine/particles.js';
import { drawText, drawTextCentered } from '../engine/sprites.js';
import { Player, PLAYER_X, jumpHeightFor } from './player.js';
import { Relay } from './relay.js';
import { Spawner, DripSpawner, REACT_FLOOR, REACT_FLOOR_MAX } from './spawner.js';
import { Powerups } from './powerups.js';
import { entityBox, overlaps, makePickup, makeObstacle } from './entities.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { CABINET_BY_ID, CABINETS } from '../data/cabinets.js';
import { FAIL_MESSAGES, EGGSHELL_TAUNTS, EGGSHELL_NARRATION, TAG_LINES } from '../data/jokes.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { drawHud, drawSpeech } from './hud.js';
import { drawHeroSprite, drawWorldEntity, drawPortal, drawCopter } from './draw.js';

export const GROUND_Y = 232;
const BASE_SPEED = 160;

export class RunState {
  // opts: {stage, team, seed, save, progress, overtime, corrupted:[], onEnd(result)}
  constructor(opts) {
    this.o = opts;
    this.stage = opts.stage || null;
    this.cabinet = opts.cabinet || (this.stage ? CABINET_BY_ID[this.stage.cabinet] : CABINETS[0]);
    this.overtime = !!opts.overtime;
    this.corrupted = opts.corrupted || [];
    this.oneHit = this.overtime || opts.difficulty === 5 || this.corrupted.length > 0;
    this.unplugged = opts.difficulty === 5;
  }

  enter() {
    const o = this.o;
    this.seed = o.seed ?? ((Math.floor(performance.now()) ^ 0x5eed) >>> 0);
    this.rng = new Rng(this.seed);
    this.fxRng = this.rng.stream('fx');
    this.save = o.save;
    const slot = this.save.slot;
    this.bench = slot.bench;
    this.modIds = slot.mods.equipped.slice();
    this.team = o.team && o.team.length ? o.team : ['lorenzo', 'gnash', 'mochi'];
    if (this.corrupted.includes('randomswap')) this.team = this.rng.shuffle(this.team);
    this.relay = new Relay(this.team, this.bench, slot.stats);
    if (this.corrupted.includes('randomswap')) this.relay.portalEvery = 18;
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
    this.perfectSlow = 0;
    this.dead = false;
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
    this.narrateT = this.corrupted.includes('narration') || this.unplugged ? 6 : 0;
    this.setButtons();
    clearParticles();
  }

  exit() { Input.setButtons([]); Audio.setDetune(1); }

  setButtons() {
    const hero = HERO_BY_ID[this.relay.current];
    const btns = [
      { id: 'pause', x: W - 18, y: 11, w: 14, h: 12, action: 'pause', label: '=' },
      { id: 'mute', x: W - 36, y: 11, w: 14, h: 12, action: 'mute', label: 'M' },
    ];
    if (Input.usingTouch) {
      if (hero.ability) btns.push({ id: 'ability', x: W - 56, y: H - 52, w: 44, h: 40, action: 'ability', label: 'PWR' });
      btns.push({ id: 'tag', x: W - 106, y: H - 52, w: 44, h: 40, action: 'tag', label: 'TAG' });
    }
    Input.setButtons(btns);
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
    return this.baseSpeed() * hero.speedMult * capped * (1 + this.speedBoost) *
      (this.player.dashT > 0 ? 1.8 : 1);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (Input.pressed('mute')) { this.save.settings.muted = !this.save.settings.muted; Audio.setMuted(this.save.settings.muted); this.save.persist(); }
    if (Input.pressed('debug')) this.debug = !this.debug;
    if (Input.pressed('pause')) this.paused = !this.paused;
    if (this.paused) {
      if (Input.pressed('back')) this.endRun(false, 'QUIT');
      Input.endFrame();
      return;
    }
    if (this.hitstop > 0) { this.hitstop -= dt; Input.endFrame(); return; }
    if (this.dead) { this.updateDead(dt); Input.endFrame(); return; }

    const ts = this.powerups.timescale() * (this.perfectSlow > 0 ? 0.35 : 1);
    if (this.perfectSlow > 0) this.perfectSlow -= dt;
    Audio.setDetune(this.powerups.active.slowmo ? 0.94 : 1);
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

    // Inputs.
    if (Input.pressed('jump')) {
      const ok = this.player.jumpPressed(Audio);
      if (ok && this.player.jumps > 1) burst(this.camX + PLAYER_X + 6, GROUND_Y - this.player.y - 8, 6, 40, 0.4, '#f8c0d8', 1, 60, () => this.fxRng.float());
      if (this.mission.type && this.challenge && this.challenge.type === 'onbeat') this.checkOnBeat();
    }
    if (Input.pressed('duck') && this.challenge && this.challenge.type === 'onbeat') this.checkOnBeat();
    if (Input.pressed('ability')) this.useAbility();
    if (Input.pressed('tag')) this.tryManualTag();

    // Player physics. (jumpScale survives hero swaps)
    this.player.jumpScale = this.corrupted.includes('nojump') ? 0.6 : 1;
    const res = this.player.update(wdt, Input, { speed: sp, ice: this.cabinet.mechanic === 'ice' });
    if (res.landed) {
      Audio.sfx('land');
      burst(this.camX + PLAYER_X + 6, GROUND_Y, 5, 30, 0.3, '#c8b898', 1, 40, () => this.fxRng.float());
      if (res.stompLand) { shake(2, 0.15); this.stompBreak(); }
    }
    if (this.player.grounded && Math.floor(this.player.anim) % 4 === 0 && this.fxRng.chance(0.1)) {
      spawn(this.camX + PLAYER_X, GROUND_Y - 1, -30, -10, 0.4, '#c8b898', 1, 30);
    }

    // Systems.
    this.relay.update(wdt);
    this.powerups.update(dt);
    this.updatePortal(wdt);
    this.updateEntities(wdt, sp);
    this.updateProjectiles(wdt, sp);
    this.updateMission(wdt);
    this.updateCoinMagnet(wdt);
    this.updateTaunts(wdt);
    this.spawner.fill(this.camX, sp, this.obstacles, this.pickups, () => jumpHeightFor(hero));
    this.drip.update(wdt, this.camX, this.pickups, this.oneHit);
    this.spawnApplianceMaybe();
    this.checkCheckpoints();
    this.collide();

    if (this.coinComboT > 0) { this.coinComboT -= dt; if (this.coinComboT <= 0) this.coinCombo = 0; }
    for (const f of this.floaties) { f.t -= dt; f.y -= 18 * dt; }
    this.floaties = this.floaties.filter((f) => f.t > 0);
    if (this.speech && (this.speech.t -= dt) <= 0) this.speech = null;

    updateParticles(dt);
    updateShake(dt, () => this.fxRng.float());
    Input.pollGamepad();

    // Stage complete?
    if (!this.overtime && this.distance >= this.totalDist && this.missionSatisfied()) {
      this.endRun(true);
    }
    Input.endFrame();
  }

  missionSatisfied() {
    const m = this.mission;
    switch (m.type) {
      case 'targets': return m.count >= m.n;
      case 'cords': return m.count >= m.n;
      case 'chase': return this.copter && this.copter.caught >= m.n;
      case 'rescue': return m.count >= m.n;
      case 'combo': return m.done || this.relay.bestCombo >= m.n;
      default: return true; // reach/fuse/blackout/escape: surviving to the end is the win
    }
  }

  // ------------------------------------------------------------------ ability
  useAbility() {
    const hero = HERO_BY_ID[this.relay.current];
    // Team move: full meter + no ability hero OR double-purpose via tag button handled in tryManualTag.
    if (!hero.ability) return;
    const cdMult = 1 - 0.1 * (this.bench.tuneup || 0);
    if (this.player.abilityCd > 0) return;
    this.player.abilityCd = hero.ability.cooldown * cdMult;
    if (hero.ability.type === 'dash') {
      this.player.dashT = 0.4;
      Audio.sfx('dash');
      for (let i = 0; i < 5; i++) spawn(this.camX + PLAYER_X - i * 6, GROUND_Y - this.player.y - 8, -40, 0, 0.3, '#2050d8', 2, 0);
    } else if (hero.ability.type === 'shoot') {
      Audio.sfx('shoot');
      this.projectiles.push({ type: 'pellet', x: this.camX + PLAYER_X + 12, alt: this.player.y + 8, vx: this.speed + 260, live: true, pierce: this.modIds.includes('charge') });
      this.floatText('PEW', this.camX + PLAYER_X, GROUND_Y - this.player.y - 24, '#f6d33c');
    } else if (hero.ability.type === 'axe') {
      Audio.sfx('axe');
      this.projectiles.push({ type: 'axe', x: this.camX + PLAYER_X + 12, alt: this.player.y + 10, vx: this.speed + 220, t: 0, live: true, returning: false, hits: this.modIds.includes('ricochet') ? 2 : 1 });
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
    for (let i = 0; i < 3; i++) {
      const p = makePickup('coin', x + this.fxRng.range(-30, 50), this.fxRng.range(10, 40));
      this.pickups.push(p);
    }
  }

  breakObstacle(ob, silent) {
    ob.live = false;
    if (!silent) {
      Audio.sfx('crunch');
      shake(2, 0.12);
      burst(ob.x + ob.w / 2, GROUND_Y - ob.alt - ob.h / 2, 10, 60, 0.5, '#c8a068', 1, 160, () => this.fxRng.float());
    }
    if (ob.def.bonusCoins) for (let i = 0; i < ob.def.bonusCoins; i++) this.pickups.push(makePickup('coin', ob.x + i * 12, ob.alt + 14));
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
      if (this.portal.x < this.camX - 30) { this.portal = null; this.relay.breakCombo(); }
    } else if (this.relay.portalDue()) {
      const nextIdx = this.relay.nextHero();
      this.portal = { x: this.camX + W + 40, hero: this.team[nextIdx] };
      this.relay.portalSpawned();
    }
    if (this.portal) {
      const pbox = { x: this.portal.x, y: GROUND_Y - 40, w: 12, h: 40 };
      if (overlaps(this.player.box(this.camX, GROUND_Y), pbox)) {
        this.doTag();
        this.portal = null;
      }
    }
  }

  tryManualTag() {
    // Tag button: use portal if close, else Team Move if meter full.
    if (this.portal && Math.abs(this.portal.x - (this.camX + PLAYER_X)) < 60) return; // let overlap handle it
    if (this.relay.teamMoveReady()) {
      this.relay.spendMeter();
      Audio.sfx('power');
      shake(4, 0.3);
      this.floatText('TEAM MOVE. THE NARRATOR APOLOGIZES FOR THE BUDGET.', this.camX + PLAYER_X - 40, 80, '#f6d33c');
      for (const ob of this.obstacles) {
        if (ob.live && ob.x > this.camX + PLAYER_X && ob.x < this.camX + W && ob.def.breakable !== false && !ob.def.isGap) this.breakObstacle(ob, true);
      }
      burst(this.camX + PLAYER_X + 60, GROUND_Y - 40, 40, 120, 0.8, '#f6d33c', 2, 100, () => this.fxRng.float());
    }
  }

  doTag() {
    // Perfect if an action obstacle is imminent.
    const px = this.camX + PLAYER_X;
    const windowPx = this.speed * this.relay.perfectWindow();
    let perfect = false;
    for (const ob of this.obstacles) {
      if (ob.live && ob.def.action !== 'none' && ob.x > px && ob.x < px + windowPx) { perfect = true; break; }
    }
    const slot = this.save.slot;
    const result = this.relay.tag(perfect, Object.fromEntries(Object.entries(slot.mastery).map(([k, v]) => [k, v.level || 0])));
    if (!result) return;
    this.player.setHero(result.to);
    this.setButtons();
    Audio.sfx(perfect ? 'perfect' : 'tag');
    if (perfect) {
      this.perfectSlow = 0.4;
      this.player.iframes = Math.max(this.player.iframes, 1);
      this.score += 250 * this.relay.combo;
      this.coins += 5;
      this.floatText(`PERFECT TAG x${this.relay.combo}`, px, GROUND_Y - 60, '#48e0c8');
      if (this.modIds.includes('tagspeed') && result.to === 'gnash') this.speedBoost = Math.min(1.2, this.speedBoost + 0.15);
    } else {
      this.score += 100 * Math.max(1, this.relay.combo);
      this.floatText(`TAG x${this.relay.combo}`, px, GROUND_Y - 60, '#c8e0ff');
    }
    burst(px + 6, GROUND_Y - this.player.y - 8, 14, 80, 0.5, '#48e0c8', 1, 80, () => this.fxRng.float());
    // Entrance moves.
    const hero = HERO_BY_ID[result.to];
    if (hero.stomp) this.stompBreak();
    if (hero.startShield && this.powerups.shieldStack === 0) this.powerups.shieldStack = 1;
    this.speech = { text: TAG_LINES[result.to], t: 1.6, who: result.to };
    if (result.duo) this.fireDuo(result.duo);
    if (this.mission.type === 'combo' && this.relay.bestCombo >= this.mission.n) this.mission.done = true;
    if (this.challenge) {
      if (this.challenge.type === 'tags') this.challenge.count++;
      if (this.challenge.type === 'perfects' && perfect) this.challenge.count++;
    }
  }

  fireDuo(duo) {
    Audio.sfx('power');
    shake(3, 0.25);
    this.floatText(duo.name, this.camX + PLAYER_X - 20, 70, '#f890b8');
    this.speech = { text: duo.desc, t: 2.5, who: null };
    switch (duo.effect) {
      case 'pierce':
        this.projectiles.push({ type: 'head', x: this.camX + PLAYER_X + 12, alt: 14, vx: this.speed + 300, live: true, pierce: true });
        break;
      case 'smash':
        for (const ob of this.obstacles) {
          if (ob.live && ob.def.ground && ob.def.breakable && ob.x > this.camX + PLAYER_X && ob.x < this.camX + PLAYER_X + 160) this.breakObstacle(ob);
        }
        break;
      case 'screenclear':
        for (const ob of this.obstacles) {
          if (ob.live && ob.x > this.camX && ob.x < this.camX + W && ob.def.breakable !== false && !ob.def.isGap) this.breakObstacle(ob, true);
        }
        burst(this.camX + PLAYER_X + 80, GROUND_Y - 60, 50, 140, 0.9, '#f890b8', 2, 80, () => this.fxRng.float());
        break;
      case 'reroll': {
        const cap = this.pickups.find((p) => p.live && p.def.power && p.x > this.camX);
        const want = this.battery < this.maxBattery() / 2 ? 'capShield' : 'capStar';
        if (cap) { cap.type = want; cap.def = { ...cap.def }; Object.assign(cap.def, { sprite: want === 'capShield' ? 'capShield' : 'capStar', power: want === 'capShield' ? 'shield' : 'star' }); }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ entities
  updateEntities(dt, sp) {
    const beat = Audio.beatPhase();
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      if (ob.vx) ob.x += ob.vx * dt;
      if (ob.def.falls && !ob.fell) {
        // Telegraph, then drop when the player approaches.
        if (ob.x - (this.camX + PLAYER_X) < sp * (ob.fallT + 0.35)) {
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
        if (ob.shootT <= 0 && ob.x > this.camX + PLAYER_X + 60 && ob.x < this.camX + W + 40) {
          ob.shootT = 2.2;
          const alt = ob.def.ground ? 8 : ob.alt;
          this.projectiles.push({ type: 'enemyShot', x: ob.x, alt, vx: -70, live: true, telegraph: 0.4 });
          Audio.sfx('shoot');
        }
      }
    }
    this.obstacles = this.obstacles.filter((ob) => ob.live !== false && ob.x > this.camX - 80);
    this.pickups = this.pickups.filter((p) => p.live && p.x > this.camX - 40);

    // Chase copter.
    if (this.copter) {
      const c = this.copter;
      c.x = this.camX + 300 + Math.sin(this.tRun * 0.8) * 60;
      c.alt = 50 + Math.sin(this.tRun * 1.7) * 20;
      if (c.cooldown > 0) c.cooldown -= dt;
      const dx = c.x - (this.camX + PLAYER_X);
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
      if (pr.type === 'axe') {
        pr.t += dt;
        if (!pr.returning && pr.t > 0.55) pr.returning = true;
        pr.x += (pr.returning ? -(sp + 300) : pr.vx) * dt;
        if (pr.returning && pr.x < this.camX + PLAYER_X) {
          pr.live = false;
          if (this.fxRng.chance(0.15)) this.floatText('THE AXE LODGED IN THE SCENERY. INTENDED.', this.camX + PLAYER_X, GROUND_Y - 70, '#e8b890');
        }
      } else {
        pr.x += pr.vx * dt;
        if (pr.telegraph > 0) pr.telegraph -= dt;
        if (pr.x > this.camX + W + 60 || pr.x < this.camX - 60) pr.live = false;
      }
      // Projectile vs obstacles.
      if (pr.type === 'pellet' || pr.type === 'axe' || pr.type === 'head') {
        for (const ob of this.obstacles) {
          if (!ob.live || ob.def.isGap || ob.def.isBoost) continue;
          const canHit = pr.type === 'axe' || pr.type === 'head' ? true : (ob.def.ground || ob.def.isTarget) && !ob.def.armored;
          if (!canHit) {
            // pellet pings off armored flyers
            if (!ob.def.ground && Math.abs(ob.x - pr.x) < 8 && pr.type === 'pellet') { pr.live = false; Audio.sfx('ui'); }
            continue;
          }
          const box = entityBox(ob, GROUND_Y);
          const pbox = { x: pr.x, y: GROUND_Y - pr.alt - 4, w: 8, h: 8 };
          if (overlaps(box, pbox)) {
            this.breakObstacle(ob);
            if (pr.type === 'axe') { pr.hits--; if (pr.hits <= 0) pr.returning = true; }
            else if (!pr.pierce) pr.live = false;
          }
        }
      }
      // Enemy shot vs player.
      if (pr.type === 'enemyShot' && pr.telegraph <= 0) {
        const pbox = { x: pr.x, y: GROUND_Y - pr.alt - 3, w: 5, h: 5 };
        if (overlaps(this.player.box(this.camX, GROUND_Y), pbox) && !this.player.invincible) {
          pr.live = false;
          this.takeHit('SHOT BY A DRONE WITH A GRUDGE');
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.live);
  }

  updateCoinMagnet(dt) {
    const hero = HERO_BY_ID[this.relay.current];
    let radius = Math.max(hero.magnetRadius * (this.modIds.includes('bigmagnet') ? 2 : 1), this.powerups.magnetRadius());
    if (hero.id === 'chompo' && this.powerups.active.magnet) radius = Math.max(radius, 110);
    if (radius <= 0) return;
    const px = this.camX + PLAYER_X, py = GROUND_Y - this.player.y - 8;
    for (const p of this.pickups) {
      if (!p.live || (!p.def.coin && !(this.powerups.active.magnet && this.powerups.active.magnet.level >= 4))) continue;
      const dx = px - p.x, dy = py - (GROUND_Y - p.alt);
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
      this.battery = Math.min(this.maxBattery(), this.battery + (this.modIds.includes('osha') ? this.maxBattery() : this.maxBattery()));
      this.floatText('CHECKPOINT. BATTERY RESTORED. SINCERELY.', this.camX + PLAYER_X - 30, 60, '#48c848');
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
      relayIdx: this.relay.currentIdx, combo: this.relay.combo,
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
    this.relay.currentIdx = s.relayIdx; this.relay.combo = 0;
    this.player = new Player(this.relay.current, this.modIds);
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
    const pbox = this.player.box(this.camX, GROUND_Y);
    // Obstacles.
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      if (ob.def.isGap) {
        // Pit: if player is over the gap at ground level, fall in.
        const over = pbox.x + pbox.w / 2 > ob.x && pbox.x + pbox.w / 2 < ob.x + ob.w;
        if (over && this.player.grounded && this.player.y <= 0) {
          if (!this.player.invincible) this.takeHit('GRAVITY REMAINS UNDEFEATED', true);
        }
        continue;
      }
      if (ob.def.isBoost) {
        const box = entityBox(ob, GROUND_Y);
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
      const box = entityBox(ob, GROUND_Y);
      if (!overlaps(pbox, box)) continue;
      // Rolling under a duck-flyer, jumping over: geometric, nothing to do here.
      if (this.player.rolling && ob.def.action === 'duck') continue; // roll always clears duckables
      if (this.player.invincible) {
        if (this.player.dashT > 0 && ob.def.breakable) this.breakObstacle(ob);
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
      // Chompo mastery: eat one hazard per stage.
      if (this.modIds.includes('eat') && this.relay.current === 'chompo' && !this.player.hazardEaten && ob.def.breakable) {
        this.player.hazardEaten = true;
        this.breakObstacle(ob, true);
        Audio.sfx('waka');
        this.floatText('CHOMPO ATE THE HAZARD. HE IS VISIBLY PROUD.', pbox.x, box.y - 12, '#f6d33c');
        continue;
      }
      this.takeHit(null);
      break;
    }
    // Pickups.
    for (const p of this.pickups) {
      if (!p.live) continue;
      if (p.def.resident && p.following) { p.x = this.camX + PLAYER_X - 16; continue; }
      const box = { x: p.x, y: GROUND_Y - p.alt - p.h, w: p.w, h: p.h };
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
      spawn(p.x, GROUND_Y - p.alt - 8, 0, -40, 0.4, '#f6d33c', 1, 0);
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

  powerNameOf(id) { return { shield: 'SHIELD', magnet: 'MAGNET', star: 'SCORE STAR', slowmo: 'SLOW-MO' }[id] || id.toUpperCase(); }

  // ------------------------------------------------------------------ damage
  takeHit(msg, isPit = false) {
    if (this.player.iframes > 0) return;
    const absorb = this.powerups.absorbHit();
    if (absorb.absorbed) {
      Audio.sfx('shield');
      shake(3, 0.2);
      this.player.iframes = 1.2;
      if (this.modIds.includes('coupon') || (this.relay.current === 'fernwick' && this.modIds.includes('coupon'))) { this.coins += 50; }
      if (absorb.shockwave) {
        for (const ob of this.obstacles) {
          if (ob.live && ob.def.breakable && Math.abs(ob.x - (this.camX + PLAYER_X)) < 70) this.breakObstacle(ob);
        }
      }
      if (isPit) this.hopOutOfPit();
      return;
    }
    // Gary head grace.
    const hero = HERO_BY_ID[this.relay.current];
    const graceMax = this.modIds.includes('union') ? 2 : 1;
    if (hero.headGrace && this.player.headGraceUsed < graceMax && (this.battery <= 1 || this.oneHit)) {
      this.player.headGraceUsed++;
      this.player.headless = 3;
      this.player.iframes = 3;
      Audio.sfx('plop');
      this.floatText('GARY\'S HEAD FELL OFF. HE PERSISTS. HR IS INFORMED.', this.camX + PLAYER_X - 40, GROUND_Y - 60, '#9ec89e');
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
    this.relay.breakCombo();
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
      if (this.snapshot && !this.oneHit) {
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
    Audio.setDetune(1);
    const result = {
      success, reason,
      stage: this.stage, overtime: this.overtime, corrupted: this.corrupted,
      score: Math.floor(this.score), coins: this.coins,
      damageTaken: this.damageTaken,
      bestCombo: this.relay.bestCombo,
      challengeDone: this.challenge ? (!this.challenge.failed && (this.challenge.type === 'noDamage' ? this.damageTaken === 0 : this.challenge.count >= this.challenge.n)) : false,
      applianceGot: this.applianceGot,
      team: this.team,
      failMsg: this.failMsg,
      distance: Math.floor(this.distance),
      time: this.tRun,
    };
    this.o.onEnd(result);
  }

  floatText(text, x, y, color) {
    this.floaties.push({ text, x, y, color, t: 1.6 });
    if (this.floaties.length > 8) this.floaties.shift();
  }

  // ------------------------------------------------------------------ draw
  draw(ctx) {
    const cam = this.camX;
    ctx.save();
    if (this.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    this.style.bg(ctx, this.tRun, cam, this.cabinet);

    // Ground line + gaps.
    this.style.ground(ctx, cam, this.cabinet, this.obstacles);

    // Entities.
    for (const p of this.pickups) if (p.live) drawWorldEntity(ctx, p, cam, this.tRun, this.style);
    for (const ob of this.obstacles) if (ob.live) drawWorldEntity(ctx, ob, cam, this.tRun, this.style);
    for (const pr of this.projectiles) {
      const x = Math.round(pr.x - cam), y = Math.round(GROUND_Y - pr.alt - 4);
      if (pr.type === 'enemyShot') {
        ctx.fillStyle = pr.telegraph > 0 ? '#f6d33c' : '#e04848';
        ctx.fillRect(x, y, 4, 4);
        if (pr.telegraph > 0) { ctx.strokeStyle = '#f6d33c'; ctx.strokeRect(x - 3, y - 3, 10, 10); }
      } else if (pr.type === 'axe') {
        ctx.fillStyle = '#b8d8f0';
        ctx.save(); ctx.translate(x + 4, y + 4); ctx.rotate(pr.t * 12); ctx.fillRect(-5, -1, 10, 3); ctx.fillRect(-1, -5, 3, 10); ctx.restore();
      } else if (pr.type === 'head') {
        ctx.fillStyle = '#9ec89e'; ctx.fillRect(x, y - 2, 7, 7);
        ctx.fillStyle = '#d83030'; ctx.fillRect(x + 1, y, 2, 2);
      } else {
        ctx.fillStyle = '#f6d33c'; ctx.fillRect(x, y, 5, 4);
      }
    }
    if (this.portal) drawPortal(ctx, this.portal, cam, this.tRun);
    if (this.copter) drawCopter(ctx, this.copter, cam, this.tRun);
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
        const fx = Math.round(remaining + PLAYER_X);
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#f6d33c' : '#0b0b14';
          ctx.fillRect(fx, GROUND_Y - 80 + i * 8, 5, 8);
        }
        // the breaker box
        ctx.fillStyle = '#3a4a5a';
        ctx.fillRect(fx + 7, GROUND_Y - 34, 18, 34);
        ctx.fillStyle = '#f6d33c';
        ctx.fillRect(fx + 13, GROUND_Y - 28, 6, 10);
        ctx.fillStyle = '#0b0b14';
        ctx.fillRect(fx + 15, GROUND_Y - 26, 2, 3);
        ctx.fillRect(fx + 12, GROUND_Y - 25, 2, 3);
        drawText(ctx, 'THE BREAKER', fx - 14, GROUND_Y - 94, '#f6d33c');
      } else if (remaining < this.speed * 5) {
        if (Math.floor(this.tRun * 2) % 2 === 0) drawTextCentered(ctx, 'FINISH AHEAD', W / 2, 70, '#f6d33c');
      }
    }

    // Player.
    drawHeroSprite(ctx, this.player, this.relay.current, this.tRun, cam, this.mission.type === 'fuse');

    drawParticles(ctx, cam);
    this.style.post(ctx, this.tRun);

    // Blackout overlay (mission).
    if (this.mission.type === 'blackout') {
      const px = PLAYER_X + 6, py = GROUND_Y - this.player.y - 8;
      const r = this.perfectSlow > 0 ? 200 : 70;
      const g = ctx.createRadialGradient(px, py, r * 0.4, px, py, r);
      g.addColorStop(0, 'rgba(8,6,12,0)');
      g.addColorStop(1, 'rgba(8,6,12,0.93)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // Floaties + speech + HUD (never mirrored).
    for (const f of this.floaties) {
      drawText(ctx, f.text, Math.round(f.x - cam), Math.round(f.y), f.color, 1);
    }
    if (this.speech) drawSpeech(ctx, this.speech);
    drawHud(ctx, this);

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      drawTextCentered(ctx, 'PAUSED', W / 2, 100, '#fff', 2);
      drawTextCentered(ctx, 'DIFFICULTY: FORGIVING. GENUINELY.', W / 2, 130, '#8a8a98');
      drawTextCentered(ctx, 'P: RESUME   ESC: QUIT TO HUB', W / 2, 150, '#c8c8d8');
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
    const pb = this.player.box(this.camX, GROUND_Y);
    ctx.strokeRect(pb.x - this.camX, pb.y, pb.w, pb.h);
    ctx.strokeStyle = '#f00';
    for (const ob of this.obstacles) {
      if (!ob.live) continue;
      const b = entityBox(ob, GROUND_Y);
      ctx.strokeRect(b.x - this.camX, b.y, b.w, b.h);
    }
    drawText(ctx, `SEED ${this.seed} SPD ${Math.round(this.speed)} X ${Math.round(this.camX)}`, 4, H - 10, '#0f0');
  }
}
