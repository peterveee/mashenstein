import { Player } from '../../game/player.js';
import { HERO_DRAW_H } from '../../game/draw.js';
import { GRAVITY_LEVEL as L } from './model.js';
const idle = { held: () => false, pressed: () => false };

// Outside these three controller calls y/vy are WORLD coordinates, exactly
// what RunState's collisions, projectiles, camera and snapshots already read.
export class GravityPlayer extends Player {
  constructor(hero, mods, run) { super(hero, mods); this.run = run; }
  local(action) {
    const ceiling = this.run.gravityLane === 1;
    if (ceiling) { this.y = L.corridor - HERO_DRAW_H - this.y; this.vy = -this.vy; }
    try { return action(); }
    finally { if (ceiling) { this.y = L.corridor - HERO_DRAW_H - this.y; this.vy = -this.vy; } }
  }
  jumpPressed(audio) {
    if (this.run.gravityTransfer) return false;
    const jumped = this.local(() => super.jumpPressed(audio));
    if (jumped) this.activateGravityZone();
    return jumped;
  }
  activateGravityZone() {
    const r = this.run;
    if (r.gravityTransfer || this.grounded || this.jumps === 0) return;
    const x = r.playerWorldX() + 6;
    const gate = r.gravityGates.filter(g => g.x - L.arrowLeftOffset <= x).at(-1);
    if (gate && gate.lane !== r.gravityLane) r.crossGravity(gate);
  }
  slidePressed() {
    if (this.run.gravityTransfer) return false;
    return this.local(() => super.slidePressed());
  }
  update(dt, input, world) {
    const r = this.run, x = r.playerWorldX() + 6;
    while (r.gravityGate < r.gravityGates.length && x >= r.gravityGates[r.gravityGate].x - L.arrowLeftOffset) {
      r.gravityGate++; // Walking through never changes polarity.
    }
    // An existing jump activates the zone as soon as it crosses the left
    // marker. A grounded crossing still waits for the player's next jump.
    this.activateGravityZone();
    const res = this.local(() => super.update(dt, r.gravityTransfer ? idle : input,
      { ...world, gravityScale: L.gravity * (world?.gravityScale ?? 1) }));
    if (r.gravityTransfer) {
      r.gravityTransfer.elapsed += dt;
      if (res.landed) { r.gravityTransfer = null; r.gravitySpark = 0.3; }
    } else {
      const altitude = r.gravityLane ? L.corridor - HERO_DRAW_H - this.y : this.y;
      if (altitude + HERO_DRAW_H >= L.corridor - 4) {
        // The opposite wall is solid; its ordinary spike/saw entities own
        // damage. Touching the wall never activates a switch by itself.
        this.y = r.gravityLane ? 4 : L.corridor - HERO_DRAW_H - 4;
        this.vy = r.gravityLane ? Math.max(0, this.vy) : Math.min(0, this.vy);
      }
    }
    return res;
  }
  drawTransform() {
    const r = this.run, transfer = r.gravityTransfer;
    const u = transfer ? Math.min(1, transfer.elapsed / Math.max(0.001, transfer.duration)) : 0;
    return { angle: transfer ? Math.PI * u * u * (3 - 2 * u) : 0,
      flipY: transfer ? !!transfer.from : !!r.gravityLane,
      arrivalFlash: Math.max(0, r.gravitySpark / 0.3) };
  }
  box(camX, groundY, screenX) {
    const box = super.box(camX, groundY, screenX);
    // The standing/sliding hitbox remains the same size and the same distance
    // from the supporting surface. Reflect the box within the 24px sprite.
    if (this.run.gravityLane) box.y = groundY - this.y - HERO_DRAW_H;
    return box;
  }
}
