// One shared player controller; hero differences are stats + hooks from data.
// Physics tuned so: base jump height ~57px, airtime ~0.71s at jumpMult 1.
import { HERO_BY_ID } from '../data/heroes.js';

export const GRAVITY = 900;
export const BASE_JUMP_V = 320;
// The runner anchor: a fixed WORLD offset from camX, which the camera then
// magnifies into a screen position (23.3% of the frame at ZOOM 2). Everything
// right of it is runway, so this is really a reaction-time dial — the view is
// VIEW_W wide, so you see (VIEW_W - PLAYER_X) px of it, 184 here, which is
// 1.15s of warning at the 160px/s base speed.
//
// 56 rather than further left because of what is up there. The crane now
// carries the hero to the top of the frame on a double jump instead of
// shrinking them, and the HUD's left column — the battery/coin pill, x 8 out to
// ~105 — is what they would go behind when they get there. At rest their 18px
// of drawn width lands at screen x 106..142, clearing it by a pixel; the dial
// stops where the chrome starts.
//
// That clearance is a REST measurement. The camera scales x as well as y and
// welds the left edge to camX, so a pulled-back frame slides the hero toward
// screen 0 — at ZOOM_MIN they sit at 73 instead of 112, behind the pill. Only
// the cape/triple heights pull back that far, and they grazed it at the old
// anchor too; it is the price of the left edge staying welded.
export const PLAYER_X = 56;      // fixed world offset from camX
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
    this.duckAmount = 0; // visual crouch blend: 0 standing, 1 fully planted
    this.duckDirection = 0;
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
    this.rollPlows = false;
    this.deflectFlashT = 0;
    this.powerPoseT = 0;
    this.powerType = null;
    this.spannerFlurryT = 0; // Lorenzo: repeated wrench swings while active
    this.spannerFlurryHitIds = null; // obstacles already hit this flurry
    this.spannerFlurryCd = 0; // deferred cooldown, applied when flurry ends
    this.relayCharge = false; // banked supercharged ability ('charge' relay mode)
    this.chargeFlashT = 0;
    this.fistThrown = false;
    this.axeThrown = false;
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
    this.rollPlows = false;
    this.deflectFlashT = 0;
    this.powerPoseT = 0;
    this.powerType = null;
    this.spannerFlurryT = 0;
    this.spannerFlurryHitIds = null;
    this.spannerFlurryCd = 0;
    this.fistThrown = false;
    this.axeThrown = false;
    this.ducking = false;
    this.duckAmount = 0;
    this.duckDirection = 0;
    // relayCharge deliberately survives: an unspent charge follows the player
    // to the next hero rather than evaporating at the portal.
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
  get hitH() { return (this.ducking || this.duckAmount > 0.35 || this.rollT > 0 || this.compressT > 0) ? DUCK_H : PLAYER_H; }
  get hitW() {
    let w = PLAYER_W;
    if (this.compressT > 0) w = 5;
    if (this.mods.includes('wide') && this.heroId === 'mochi' && this.floating) w += 4;
    return w;
  }
  get rolling() { return this.rollT > 0; }
  get invincible() { return this.iframes > 0 || this.dashT > 0; }

  updateDuckBlend(dt, target) {
    const before = this.duckAmount;
    // The drop has enough time to read and settle; releasing is a touch faster
    // so controls never feel sticky. Collision stays crouched through most of
    // the recovery via hitH's threshold above.
    const duration = target ? 0.14 : 0.1;
    this.duckAmount = Math.max(0, Math.min(1,
      before + (target ? 1 : -1) * dt / duration));
    this.duckDirection = this.duckAmount > before ? 1
      : this.duckAmount < before ? -1 : 0;
  }

  jumpPressed(audio) {
    if (this.rollT > 0 || this.stumbleT > 0) return false;
    if (this.grounded || this.jumps < this.maxJumps) {
      if (!this.grounded && this.jumps === 0) this.jumps = 1; // walked off a ledge
      this.vy = BASE_JUMP_V * (this.jumpScale || 1) * this.hero.jumpMult * (this.jumps > 0 ? 0.85 : 1);
      this.jumps++;
      this.grounded = false;
      this.ducking = false;
      this.duckDirection = -1;
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
      // A charged roll ends clean: no ringing ears.
      if (this.rollT <= 0 && this.mods.includes('bash') && !this.rollPlows) this.stumbleT = 0.3;
      if (this.rollT <= 0) this.rollPlows = false;
    }
    if (this.compressT > 0) this.compressT -= dt;
    if (this.stumbleT > 0) this.stumbleT -= dt;
    if (this.chargeFlashT > 0) this.chargeFlashT -= dt;
    if (this.deflectFlashT > 0) this.deflectFlashT -= dt;
    if (this.powerPoseT > 0) this.powerPoseT -= dt;
    // During Lorenzo's spanner flurry, keep the swing animation looping.
    if (this.spannerFlurryT > 0 && this.powerPoseT <= 0) this.powerPoseT = 0.3;
    if (this.spannerFlurryT > 0) this.spannerFlurryT -= dt;
    if (this.spannerFlurryT <= 0 && this.spannerFlurryHitIds != null) {
      // Flurry ended (timeout) — apply the deferred cooldown and clean up.
      if (this.spannerFlurryCd > 0) {
        this.abilityCd = this.spannerFlurryCd;
        this.spannerFlurryCd = 0;
      }
      this.spannerFlurryHitIds = null;
    }
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
        this.ducking = holdDuck && this.rollT <= 0;
        this.updateDuckBlend(dt, this.ducking);
        return { landed: true, stompLand: wasStomp };
      }
      this.updateDuckBlend(dt, false);
    } else {
      this.ducking = holdDuck && this.rollT <= 0;
      this.updateDuckBlend(dt, this.ducking);
    }
    return { landed: false, stompLand: false };
  }

  // World-space hitbox (bottom at groundY - y).
  box(camX, groundY, screenX = PLAYER_X) {
    const x = camX + screenX;
    const bottom = groundY - this.y;
    return { x: x + (12 - this.hitW) / 2, y: bottom - this.hitH, w: this.hitW, h: this.hitH };
  }
}
