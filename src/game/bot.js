// The demo bot: a reactive player good enough to showcase any stage or boss.
// Promoted from the run-complete test bot. It only speaks through Input
// press/release, and never touches Input.activity — so attract mode can tell
// the bot from a human.
import { Input } from '../engine/input.js';
import { PLAYER_X } from './player.js';

export class DemoBot {
  constructor(run) {
    this.run = run;
    this.duckHold = false;
    this.jumpHold = false;
    this.abilityT = 1.5;
    this.abHeld = false;
  }

  update(dt) {
    const run = this.run;
    if (run.dead || run.paused) { this.releaseAll(); return; }
    const px = run.camX + PLAYER_X;
    const sp = run.speed;

    // nearest action-required obstacle ahead
    let nearest = null;
    for (const ob of run.obstacles) {
      if (!ob.live || ob.def.action === 'none') continue;
      if (ob.x + ob.w < px - 8) continue;
      if (!nearest || ob.x < nearest.x) nearest = ob;
    }

    // something worth jumping FOR: elevated mission pickups / targets / copter
    let grab = null;
    for (const p of run.pickups) {
      if (!p.live) continue;
      const want = p.def.appliance || p.def.cord || p.def.power || p.def.resident || (p.def.coin && p.alt > 24);
      if (!want) continue;
      const dx = p.x - px;
      if (dx > 8 && dx < sp * 0.32 && p.alt > 16) { grab = p; break; }
    }
    if (!grab) {
      for (const ob of run.obstacles) {
        if (!ob.live || !ob.def.isTarget) continue;
        const dx = ob.x - px;
        if (dx > 8 && dx < sp * 0.32 && ob.alt > 16) { grab = ob; break; }
      }
    }
    const copter = run.mission && run.mission.type === 'chase' ? run.copter : null;
    const chaseJump = copter && copter.cooldown <= 0 && (copter.x - px) < 70 && (copter.x - px) > -10;

    // jump: speed-scaled reaction window, held through the arc
    if (!run.player.grounded) {
      // keep holding — releasing early cuts the jump short
    } else if ((nearest && nearest.def.action === 'jump' && (nearest.x - px) < sp * 0.3 && (nearest.x - px) > -8) || grab || chaseJump) {
      if (!this.jumpHold) { Input.press('jump'); this.jumpHold = true; }
    } else if (this.jumpHold) {
      Input.release('jump');
      this.jumpHold = false;
    }

    // duck under low flyers (and stomp with stomp-heroes in boss fights)
    const duckWanted = nearest && nearest.def.action === 'duck' && (nearest.x - px) < sp * 0.4 && run.player.grounded;
    const stompWanted = run.bossCab && run.player.hero && run.player.hero.stomp && !run.player.grounded && run.player.vy < 60;
    if (duckWanted || stompWanted) {
      if (!this.duckHold) { Input.press('duck'); this.duckHold = true; }
    } else if (this.duckHold) {
      Input.release('duck');
      this.duckHold = false;
    }

    // abilities: fire at real targets, off cooldown, at a human-ish rate
    this.abilityT -= dt;
    if (this.abHeld) { Input.release('ability'); this.abHeld = false; }
    const hero = run.player.hero;
    if (hero && hero.ability && this.abilityT <= 0 && run.player.abilityCd <= 0) {
      const threat = run.bossCab || run.obstacles.some((ob) =>
        ob.live && (ob.def.shoots || ob.def.isTarget || (ob.def.breakable && ob.def.ground)) &&
        ob.x - px > 20 && ob.x - px < 180);
      if (threat) {
        Input.press('ability');
        this.abHeld = true;
        this.abilityT = hero.ability.type === 'dash' ? 4 : 1.1;
      }
    }
  }

  releaseAll() {
    if (this.jumpHold) { Input.release('jump'); this.jumpHold = false; }
    if (this.duckHold) { Input.release('duck'); this.duckHold = false; }
    if (this.abHeld) { Input.release('ability'); this.abHeld = false; }
  }
}
