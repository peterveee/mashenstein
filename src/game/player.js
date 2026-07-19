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
    this.setHero(heroId);
    this.y = 0;           // height of feet above ground (positive = up)
    this.vy = 0;
    this.jumps = 0;
    this.ducking = false;
    this.floating = false;
    this.iframes = 0;
    this.anim = 0;
    this.stomping = false;
    this.dashT = 0;
    this.abilityCd = 0;
    this.headless = 0;    // Gary
    this.headGraceUsed = 0;
    this.hazardEaten = false; // Chompo mastery
    this.grounded = true;
    this.slideT = 0;      // ice landing slide (visual/control feel)
    this.landedT = 0;     // landing squash timer (visual only)
  }

  setHero(heroId) {
    this.heroId = heroId;
    this.hero = HERO_BY_ID[heroId];
    this.stomping = false;
    this.dashT = 0;
    this.abilityCd = 0;
  }

  get gravity() { return this.hero.heavy ? GRAVITY * 1.25 : GRAVITY; }
  get maxJumps() {
    let m = this.hero.maxJumps;
    if (this.mods.includes('cape')) m += 1;
    if (this.mods.includes('triple') && this.heroId === 'mochi') m += 1;
    return m;
  }
  get hitH() { return this.ducking ? DUCK_H : PLAYER_H; }
  get hitW() {
    let w = PLAYER_W;
    if (this.mods.includes('wide') && this.heroId === 'mochi' && this.floating) w += 4;
    return w;
  }
  get rolling() { return this.ducking && this.hero.duckIsRoll; }
  get invincible() { return this.iframes > 0 || this.dashT > 0; }

  jumpPressed(audio) {
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
    if (this.abilityCd > 0) this.abilityCd -= dt;
    if (this.dashT > 0) this.dashT -= dt;
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
    const minVy = this.floating ? floatCap : -520;

    if (!this.grounded) {
      // Stomp: hold duck in air with stomp hero = fast fall attack.
      if (holdDuck && this.hero.stomp && this.vy < 100) {
        this.stomping = true;
      }
      this.vy -= this.gravity * dt * (this.stomping ? 2.2 : 1);
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
      this.ducking = holdDuck;
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
