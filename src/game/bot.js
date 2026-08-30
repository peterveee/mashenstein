// The demo bot: a reactive player good enough to showcase any stage or boss.
// Promoted from the run-complete test bot. It only speaks through Input
// press/release, and never touches Input.activity — so attract mode can tell
// the bot from a human.
import { Input } from '../engine/input.js';
import { PLAYER_X, airtimeFor } from './player.js';

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

    // A STEPPING-STONE CROSSING, which the lane's own rule cannot play.
    //
    // Everywhere else "jump when the hazard is a third of a second away" is
    // enough, because the landing is a lane: any arc that clears the thing is a
    // good arc. On a crossing the landing is a stone, so an arc can be too LONG
    // as easily as too short — and the cast's airtimes differ by half again, so
    // there is no one moment to press at. The bot does what the player does:
    // aims at the middle of the next stone, and takes off at the point its own
    // arc lands there.
    //
    // It also has to override the lane rule rather than sit beside it. The
    // break is a gap obstacle like any other, so the ordinary reaction window
    // would fire at the lip — the one takeoff point that throws the longer
    // jumpers clean over the first stone.
    const stone = run.route && run.route.crossing ? run.route : null;
    const ahead = stone ? null : run.obstacles.find((ob) => ob.live && ob.crossing
      && ob.x + ob.w > px && ob.x - px < sp * 0.9);
    const crossing = stone ? stone.crossing : (ahead ? ahead.crossing : null);
    let crossJump = false;
    if (crossing && run.player.grounded) {
      const hero = run.player.hero;
      const span = (hero ? airtimeFor(hero) : 0.55) * sp;
      // The edge he leaves from: the far end of the stone he is on, or the near
      // lip of the break he is running at.
      const edge = stone ? stone.x + stone.w : crossing.x;
      const next = crossing.stones.find((st) => st.x >= edge - 1);
      // Past the last stone the landing is the lane again, and a little way
      // onto it — the far lip is the one place on a crossing where landing
      // short is landing in the hole.
      const target = next ? next.x + next.w / 2 : crossing.x + crossing.w + 14;
      crossJump = px + span >= target;
    }

    // jump: speed-scaled reaction window, held through the arc
    const wantJump = crossing ? crossJump
      : ((nearest && nearest.def.action === 'jump' && (nearest.x - px) < sp * 0.3 && (nearest.x - px) > -8) || grab || chaseJump);
    if (!run.player.grounded) {
      // keep holding — releasing early cuts the jump short
    } else if (this.jumpHold) {
      // A LANDING ALWAYS LETS GO, even when the next jump is already wanted.
      //
      // The jump is an EDGE, not a level: holding the button through a landing
      // presses nothing. Everywhere in the lane that never showed, because the
      // reason to jump had always passed by the time he came down — and on a
      // crossing it is the normal case, since the next stone is wanted from the
      // moment he lands on this one. He ran off the end of the last stone with
      // the button still held from the jump that got him there.
      Input.release('jump');
      this.jumpHold = false;
    } else if (wantJump) {
      Input.press('jump');
      this.jumpHold = true;
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
