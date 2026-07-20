// One shared player controller; hero differences are stats + hooks from data.
// Physics tuned so: base jump height ~57px, airtime ~0.71s at jumpMult 1.
import { HERO_BY_ID } from '../data/heroes.js';

export const GRAVITY = 900;
export const BASE_JUMP_V = 320;
export const PLAYER_X = 64;      // fixed screen x
export const PLAYER_W = 8;       // hitbox (12px sprite, 2px inset)
export const PLAYER_H = 14;
export const DUCK_H = 7;

export function jumpHeightFor(hero) {
  const v = BASE_JUMP_V * hero.jumpMult;
  return (v * v) / (2 * GRAVITY);
}
export function airtimeFor(hero) {
  const g = hero.heavy ? GRAVITY * 1.25 : GRAVITY;
  return (2 * BASE_JUMP_V * hero.jumpMult) / g;
}

export class Player {
  constructor(heroId, mods = []) {
    this.mods = mods;
    this.abilityCooldowns = Object.create(null);
    this.setHero(heroId);
    this.y = 0;           // height of feet above ground (positive = up)
    this.vy = 0;
    this.jumps = 0;
    this.powerJumpBonus = 0;
    this.ducking = false;
    this.floating = false;
    this.iframes = 0;
    this.anim = 0;
    this.stomping = false;
    this.dashT = 0;
    this.rollT = 0;
    this.compressT = 0;
    this.stumbleT = 0;
    this.rollBashed = false;
    this.rollDeflectUsed = false;
    this.deflectFlashT = 0;
    this.powerPoseT = 0;
    this.powerType = null;
    this.fistThrown = false;
    this.headless = 0;    // Gary
    this.assemblyGraceUsed = 0;
    this.hazardEaten = false; // Miss Chomp mastery
    this.grounded = true;
    this.slideT = 0;      // ice landing slide (visual/control feel)
    this.landedT = 0;     // landing squash timer (visual only)
  }

  setHero(heroId) {
    this.heroId = heroId;
    this.hero = HERO_BY_ID[heroId];
    this.stomping = false;
    this.dashT = 0;
    this.rollT = 0;
    this.compressT = 0;
    this.stumbleT = 0;
    this.rollBashed = false;
    this.rollDeflectUsed = false;
    this.deflectFlashT = 0;
    this.powerPoseT = 0;
    this.powerType = null;
    this.fistThrown = false;
    this.ducking = false;
  }

  get abilityCd() { return this.abilityCooldowns[this.heroId] || 0; }
  set abilityCd(value) { this.abilityCooldowns[this.heroId] = Math.max(0, value); }

  get gravity() { return this.hero.heavy ? GRAVITY * 1.25 : GRAVITY; }
  get maxJumps() {
    let m = this.hero.maxJumps;
    if (this.mods.includes('cape')) m += 1;
    if (this.mods.includes('triple') && this.heroId === 'mochi') m += 1;
    m += this.powerJumpBonus;
    return m;
  }
  get hitH() { return (this.ducking || this.rollT > 0 || this.compressT > 0) ? DUCK_H : PLAYER_H; }
  get hitW() {
    let w = PLAYER_W;
    if (this.compressT > 0) w = 5;
    if (this.mods.includes('wide') && this.heroId === 'mochi' && this.floating) w += 4;
    return w;
  }
  get rolling() { return this.rollT > 0; }
  get invincible() { return this.iframes > 0 || this.dashT > 0; }

  jumpPressed(audio) {
    if (this.rollT > 0 || this.stumbleT > 0) return false;
    if (this.grounded || this.jumps < this.maxJumps) {
      if (!this.grounded && this.jumps === 0) this.jumps = 1; // walked off a ledge
      this.vy = BASE_JUMP_V * (this.jumpScale || 1) * this.hero.jumpMult * (this.jumps > 0 ? 0.85 : 1);
      this.jumps++;
      this.grounded = false;
      this.ducking = false;
      audio && audio.sfx(this.jumps > 1 ? 'jump2' : 'jump');
      return true;
    }
    return false;
  }

  update(dt, input, world) {
    this.anim += dt * (world ? world.speed / 40 : 8);
    if (this.iframes > 0) this.iframes -= dt;
    for (const id of Object.keys(this.abilityCooldowns)) {
      this.abilityCooldowns[id] = Math.max(0, this.abilityCooldowns[id] - dt);
    }
    if (this.dashT > 0) this.dashT -= dt;
    if (this.rollT > 0) {
      this.rollT -= dt;
      if (this.rollT <= 0 && this.mods.includes('bash')) this.stumbleT = 0.3;
    }
    if (this.compressT > 0) this.compressT -= dt;
    if (this.stumbleT > 0) this.stumbleT -= dt;
    if (this.deflectFlashT > 0) this.deflectFlashT -= dt;
    if (this.powerPoseT > 0) this.powerPoseT -= dt;
    if (this.headless > 0) {
      this.headless -= dt;
      this.iframes = Math.max(this.iframes, 0.05);
    }
    if (this.slideT > 0) this.slideT -= dt;
    if (this.landedT > 0) this.landedT -= dt;

    const holdJump = input.held('jump');
    const holdDuck = input.held('duck');

    // Variable jump: release early = short hop.
    if (!holdJump && this.vy > 60 && this.hero.variableJump) this.vy = 60;

    // Float (Mochi): hold jump while falling caps fall speed.
    const floatCap = this.mods.includes('wide') ? -45 : -60;
    this.floating = !this.grounded && holdJump && this.hero.canFloat && this.vy < 0;
    const minVy = this.compressT > 0 ? -70 : (this.floating ? floatCap : -520);

    if (!this.grounded) {
      this.vy -= this.gravity * (world?.gravityScale ?? 1) * dt * (this.stomping ? 2.2 : 1);
      if (this.vy < minVy) this.vy = minVy;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.grounded = true;
        this.jumps = 0;
        const wasStomp = this.stomping;
        this.stomping = false;
        this.vy = 0;
        this.landedT = 0.12;
        if (world && world.ice) this.slideT = 0.35;
        return { landed: true, stompLand: wasStomp };
      }
    } else {
      this.ducking = holdDuck && this.rollT <= 0;
    }
    return { landed: false, stompLand: false };
  }

  // World-space hitbox (bottom at groundY - y).
  box(camX, groundY) {
    const x = camX + PLAYER_X;
    const bottom = groundY - this.y;
    return { x: x + (12 - this.hitW) / 2, y: bottom - this.hitH, w: this.hitW, h: this.hitH };
  }
}
