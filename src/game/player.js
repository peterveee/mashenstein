// One shared player controller; hero differences are stats + hooks from data.
// Physics tuned so: base jump height ~57px, airtime ~0.71s at jumpMult 1.
import { HERO_BY_ID } from '../data/heroes.js';

export const GRAVITY = 900;
export const BASE_JUMP_V = 320;
// Grumpos falls harder than he rises. Exported because spawner.js sizes its
// reaction runway off the worst airtime in the cast, and that worst case is
// this multiplier applied to the longest jump — one number, read in both
// places, rather than a 1.25 that has to be found twice to be changed once.
export const HEAVY_GRAVITY_MULT = 1.25;
// Air jumps launch shorter than the one off the ground, so a double is a
// reach rather than a second full arc.
export const AIR_JUMP_SCALE = 0.85;
// Variable jump: releasing above this snaps down to it. Low enough that a tap
// is visibly a hop, high enough that the cut never reads as hitting a ceiling.
export const VARIABLE_JUMP_CUT = 60;
// Terminal fall speed. A long drop stops accelerating before it outruns the
// player's ability to place the landing.
export const TERMINAL_VY = -520;
// A stomp is a commitment: the descent is faster than gravity earned.
export const STOMP_GRAVITY_MULT = 2.2;
// Landing squash timer. toons.js drives the visual squash off this same
// duration under the name SQUASH_T — they must agree or the squash outlives
// its blend. Not imported: src/sprites must not reach into src/game.
export const LANDED_T = 0.12;
// Ice landing slide (visual/control feel).
export const ICE_SLIDE_T = 0.35;
// The drop has enough time to read and settle; releasing is a touch faster so
// controls never feel sticky. Collision stays crouched through most of the
// recovery via hitH's duckAmount threshold.
export const DUCK_IN_T = 0.14;
export const DUCK_OUT_T = 0.1;
// How long a slide can be HELD before the hero stands back up. The duck is a
// move to get under one obstacle, not a stance: every duck pattern in
// cabinets.js places a single drone or paperwork (never a corridor), and at
// BASE_SPEED the actual pass-under lasts ~0.2s — the second is anticipation
// room for ducking early. Releasing re-arms instantly; the cost of overstaying
// is having to re-press with the hazard already overhead.
export const DUCK_MAX_T = 1.0;
// The walk cycle is driven by scroll speed, not by wall time, so the stride
// stays planted as the run accelerates: anim advances at world.speed / this.
// Lower means faster legs at the same speed.
export const ANIM_SPEED_DIVISOR = 40;
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
  const g = hero.heavy ? GRAVITY * HEAVY_GRAVITY_MULT : GRAVITY;
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
    // Which jump face to wear while airborne (toons.js expressionFor's `jf`
    // lookup) — rolled fresh per hop by run.js's rollJumpFace, not here.
    this.jumpFace = 0;
    this.powerJumpBonus = 0;
    this.ducking = false;
    this.duckAmount = 0; // visual crouch blend: 0 standing, 1 fully planted
    this.duckDirection = 0;
    this.duckHoldT = 0;      // how long the current slide has been held
    this.duckSpent = false;  // window used up; release to re-arm
    this.floating = false;
    this.iframes = 0;
    this.anim = 0;
    this.stomping = false;
    this.dashT = 0;
    // A boost pad's kick, for the ART only: it leans the runner into the
    // acceleration and streaks the floor past them. It is not dashT — a dash
    // grants i-frames and hero ghosts, and a floor pad grants neither.
    this.boostT = 0;
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
    // Airborne because something threw him, not because he jumped. See launch().
    this.launched = false;
    this.slideT = 0;      // ice landing slide (visual/control feel)
    this.landedT = 0;     // landing squash timer (visual only)
    // The incoming hero's arrival, set by whoever ran them through a portal.
    // Visual only, and deliberately NOT cleared by setHero: setHero is the
    // thing that starts it. See drawHeroSprite.
    this.tagFlashT = 0;
  }

  setHero(heroId) {
    this.heroId = heroId;
    this.hero = HERO_BY_ID[heroId];
    this.stomping = false;
    this.dashT = 0;
    // A boost pad's kick, for the ART only: it leans the runner into the
    // acceleration and streaks the floor past them. It is not dashT — a dash
    // grants i-frames and hero ghosts, and a floor pad grants neither.
    this.boostT = 0;
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
    this.duckHoldT = 0;
    this.duckSpent = false;
    // relayCharge deliberately survives: an unspent charge follows the player
    // to the next hero rather than evaporating at the portal.
  }

  get abilityCd() { return this.abilityCooldowns[this.heroId] || 0; }
  set abilityCd(value) { this.abilityCooldowns[this.heroId] = Math.max(0, value); }

  get gravity() { return this.hero.heavy ? GRAVITY * HEAVY_GRAVITY_MULT : GRAVITY; }
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

  // The timed duck window. Holding past DUCK_MAX_T stands the hero up under a
  // held key; the key must come up before another slide arms. Ability ducks
  // (rollT / compressT) bypass this — they carry their own timers.
  duckWindow(holdDuck, dt) {
    if (!holdDuck) {
      this.duckHoldT = 0;
      this.duckSpent = false;
      return false;
    }
    if (this.duckSpent) return false;
    this.duckHoldT += dt;
    if (this.duckHoldT >= DUCK_MAX_T) {
      this.duckSpent = true;
      return false;
    }
    return true;
  }

  updateDuckBlend(dt, target) {
    const before = this.duckAmount;
    const duration = target ? DUCK_IN_T : DUCK_OUT_T;
    this.duckAmount = Math.max(0, Math.min(1,
      before + (target ? 1 : -1) * dt / duration));
    this.duckDirection = this.duckAmount > before ? 1
      : this.duckAmount < before ? -1 : 0;
  }

  /**
   * Thrown, rather than jumping. A spring pad's arc.
   *
   * Separate from jumpPressed because it is not a jump in any of the ways that
   * matter: it costs no jump from the budget, it ignores the hero's jumpMult
   * (the pad is the same machine whoever stands on it — a road it can only
   * throw half the cast onto is a broken road), and the variable-jump cut does
   * not apply to it. One air jump is left in hand deliberately: the pad chooses
   * the road, the player still gets to place the landing on it.
   */
  launch(vy) {
    this.vy = vy;
    this.grounded = false;
    this.launched = true;
    this.stomping = false;
    this.ducking = false;
    this.duckDirection = -1;
    this.jumps = 1;
  }

  jumpPressed(audio) {
    if (this.rollT > 0 || this.stumbleT > 0) return false;
    if (this.grounded || this.jumps < this.maxJumps) {
      if (!this.grounded && this.jumps === 0) this.jumps = 1; // walked off a ledge
      this.vy = BASE_JUMP_V * (this.jumpScale || 1) * this.hero.jumpMult * (this.jumps > 0 ? AIR_JUMP_SCALE : 1);
      this.launched = false;
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
    this.anim += dt * (world ? world.speed / ANIM_SPEED_DIVISOR : 8);
    if (this.iframes > 0) this.iframes -= dt;
    for (const id of Object.keys(this.abilityCooldowns)) {
      this.abilityCooldowns[id] = Math.max(0, this.abilityCooldowns[id] - dt);
    }
    if (this.dashT > 0) this.dashT -= dt;
    if (this.boostT > 0) this.boostT -= dt;
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
    if (this.tagFlashT > 0) this.tagFlashT -= dt;
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

    // Variable jump: release early = short hop. `launched` is exempt, and has
    // to be: the cut is a contract about the JUMP BUTTON — hold it for height,
    // let go for a hop — and a spring pad is not the jump button. Without the
    // exemption a hero who happened not to be holding jump when he ran over a
    // pad had his 200px arc clipped to 60 on the very next frame, which reads
    // as the pad simply not working.
    if (!holdJump && !this.launched && this.vy > VARIABLE_JUMP_CUT && this.hero.variableJump) this.vy = VARIABLE_JUMP_CUT;

    // Float (Mochi): hold jump while falling caps fall speed.
    const floatCap = this.mods.includes('wide') ? -45 : -60;
    this.floating = !this.grounded && holdJump && this.hero.canFloat && this.vy < 0;
    const minVy = this.compressT > 0 ? -70 : (this.floating ? floatCap : TERMINAL_VY);

    if (!this.grounded) {
      this.vy -= this.gravity * (world?.gravityScale ?? 1) * dt * (this.stomping ? STOMP_GRAVITY_MULT : 1);
      if (this.vy < minVy) this.vy = minVy;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.grounded = true;
        this.jumps = 0;
        this.launched = false;
        const wasStomp = this.stomping;
        this.stomping = false;
        this.vy = 0;
        this.landedT = LANDED_T;
        if (world && world.ice) this.slideT = ICE_SLIDE_T;
        this.ducking = this.duckWindow(holdDuck, dt) && this.rollT <= 0;
        this.updateDuckBlend(dt, this.ducking);
        return { landed: true, stompLand: wasStomp };
      }
      this.updateDuckBlend(dt, false);
    } else {
      this.ducking = this.duckWindow(holdDuck, dt) && this.rollT <= 0;
      this.updateDuckBlend(dt, this.ducking);
    }
    return { landed: false, stompLand: false };
  }

  // World-space hitbox (bottom at groundY - y).
  /**
   * Where the feet will be, in units above the ground, `t` seconds from now — assuming
   * no further input. 0 means standing on it.
   *
   * Ballistic rather than a simulation: it cannot know about a jump that has not been
   * pressed yet. That bounds what it is good for — it is only worth asking over a span
   * short enough that the arc is already decided. See RunState.updatePortal.
   */
  feetAt(t, gravityScale = 1) {
    if (this.grounded) return 0;
    return Math.max(0, this.y + this.vy * t - 0.5 * this.gravity * gravityScale * t * t);
  }

  box(camX, groundY, screenX = PLAYER_X) {
    const x = camX + screenX;
    const bottom = groundY - this.y;
    return { x: x + (12 - this.hitW) / 2, y: bottom - this.hitH, w: this.hitW, h: this.hitH };
  }
}
