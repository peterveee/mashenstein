// A normal RunState with one cabinet-specific movement controller and an
// authored corridor. HUD, controls, damage, death, restore and finish
// are inherited, rather than approximated by a separate mini-game.
import { RunState, applyFraming, ZOOM_NORMAL } from '../../game/run.js';
import { makeObstacle, makePickup } from '../../game/entities.js';
import { GROUND_Y, screenYFor, setRestingZoom } from '../../engine/camera.js';
import { W, H, isPhonePortraitPresentation } from '../../engine/renderer.js';
import { PHONE_PORTRAIT, LANDSCAPE } from '../../engine/frame.js';
import { Audio } from '../../engine/audio.js';
import { GravityPlayer } from './player.js';
import { drawGravityRoom } from './scene.js';
import { GRAVITY_LEVEL as L, GRAVITY_CABINET, GRAVITY_STAGE, GRAVITY_LAYOUT, GATES, HAZARDS } from './model.js';

export class GravityRunState extends RunState {
  constructor(opts) {
    super({ ...opts, cabinet: GRAVITY_CABINET, stage: GRAVITY_STAGE, layout: GRAVITY_LAYOUT });
  }
  createPlayer(hero, mods) { return new GravityPlayer(hero, mods, this); }
  // Gates need a consistent crossing runway. Assist speed still applies via
  // the ordinary baseSpeed calculation and authored distance scaling.
  get speed() { return this.baseSpeed(); }
  speedAt() { return this.baseSpeed(); }
  groundYAt() { return GROUND_Y; }
  // Both surfaces fit in a single composition. Ceiling jumps and landing
  // velocity must never engage the ordinary hero-follow crane or zoom spring.
  updateCamera() {
    const config = this.portraitConfig();
    const portrait = this.portraitGameplay && config && isPhonePortraitPresentation();
    const mode = portrait ? PHONE_PORTRAIT : LANDSCAPE;
    const zoom = portrait ? config.worldZoom
      : Math.min(ZOOM_NORMAL, applyFraming(this.renderSettings || this.save?.settings));
    const pan = portrait ? this.portraitFrameFit().pan : 0;
    const changed = this.cameraPresentationMode !== mode || this.camZoom !== zoom || this.camPan !== pan;
    this.cameraPresentationMode = mode;
    setRestingZoom(zoom);
    this.camZoom = zoom; this.camPan = pan; this.camFloorY = GROUND_Y;
    this.camFloorV = 0; this.camFeetY = null;
    this.camGuardNeed = undefined; this.camGuardDwell = 0;
    this.portraitFrameTransition = null;
    if (changed) this.resetRenderInterpolation();
  }
  enter() {
    this.gravityFailures ||= new Map();
    this.gravityGates = null;
    this.gravityLane = 0; this.gravityGate = 0;
    this.gravityTransfer = null; this.gravitySpark = 0;
    super.enter();
    const scale = this.totalDist / L.length;
    this.gravityGates = GATES.map((g, index) => ({ ...g, index, x: g.x * scale }));
    this.gravityHazards = HAZARDS.map(h => ({ ...h, x: h.x * scale }));
    // The inactive rail uses the same animated traps as the other cabinets.
    // Give each switch a clear approach and 52px of departure clearance.
    const spans = [{ start: 0, end: this.gravityGates[0].x - 38, lane: 1 },
      ...this.gravityGates.map((g, i) => ({ start: g.x + 52,
        end: (this.gravityGates[i + 1]?.x ?? this.totalDist) - 38, lane: 1 - g.lane }))];
    for (const span of spans) for (let x = span.start; x + 15 < span.end; x += 24) {
      this.gravityHazards.push({ x, lane: span.lane, type: Math.round(x / 24) % 3 ? 'popSpikes' : 'floorSaw', rail: true });
    }
    this.gravitySpawned = new Set();
    this.obstacles = []; this.pickups = [];
    this.spawner.fill = () => this.fillGravityEntities();
    this.fillGravityEntities();
    this.style = {
      ...this.style, name: 'gravity', lightBg: false, smoothMotion: true,
      heroShadow: false, bgPan: 0, ownSurface: true,
      bg: c => { c.fillStyle = '#0b1723'; c.fillRect(0, 0, W, H); },
      ground: (c, cam, cab, obs, cuts, t, view) => {
        const z = this.camZoom, floor = screenYFor(GROUND_Y, z, this.camPan, this.camFloorY);
        c.save(); c.translate(0, GROUND_Y);
        drawGravityRoom(c, { cam, view: view + 60,
          top: -floor / z - 20, bottom: (H - floor) / z + 20,
          time: t, gates: this.gravityGates, hintGates: this.gravityHints() });
        c.restore();
      },
      post: () => {},
    };
    this.updateCamera();
    this.resetRenderInterpolation();
  }
  fillGravityEntities() {
    this.gravityHazards.forEach((h, index) => {
      const key = `hazard-${index}`;
      if (this.gravitySpawned.has(key)) return;
      this.gravitySpawned.add(key);
      if (h.x < this.playerWorldX() - 20) return;
      const ob = makeObstacle(h.type, h.x);
      if (h.rail) ob.gravityRail = true;
      if (h.lane) { ob.alt = L.corridor - ob.alt - ob.h; ob.gravityCeiling = L.corridor; }
      this.obstacles.push(ob);
    });
    this.gravityGates.forEach((g, index) => {
      const key = `coins-${index}`;
      if (this.gravitySpawned.has(key)) return;
      this.gravitySpawned.add(key);
      for (let n = 0; n < 3; n++) {
        const x = g.x + (105 + n * 17) * this.totalDist / L.length;
        if (x < this.playerWorldX() - 10) continue;
        const coin = makePickup('coin', x, 8);
        if (g.lane) { coin.alt = L.corridor - coin.alt - coin.h; coin.gravityCeiling = L.corridor; }
        this.pickups.push(coin);
      }
    });
  }
  crossGravity(gate) {
    if (this.gravityLane === gate.lane) return;
    const p = this.player, from = this.gravityLane;
    this.gravityLane = gate.lane;
    const altitude = gate.lane ? L.corridor - 24 - p.y : p.y;
    const vy = gate.lane ? -p.vy : p.vy;
    const acceleration = p.gravity * L.gravity * this.powerups.gravityMultiplier();
    this.gravityTransfer = { from, elapsed: 0,
      duration: Math.max(0.001, (vy + Math.sqrt(vy * vy + 2 * acceleration * Math.max(0, altitude))) / acceleration) };
    p.grounded = false; p.jumps = 0; p.launched = true; p.clearSlideState();
    Audio.sfx('jump2');
  }
  update(dt) {
    if (!this.paused && !this.dead) this.gravitySpark = Math.max(0, this.gravitySpark - dt);
    super.update(dt);
  }
  // Normal capsule selection/cadence, parked in the clear reward stretch
  // after a switch and mirrored onto its destination rail.
  dripUpdate(dt, stopX) {
    if (!this.gravityGates) return;
    const before = new Set(this.pickups);
    super.dripUpdate(dt, stopX);
    for (const p of this.pickups) if (!before.has(p)) {
      const g = this.gravityGates.find(g => g.x + 175 >= p.x && g.x + 175 < stopX);
      if (!g) { p.live = false; continue; }
      p.x = g.x + 175; p.alt = 8;
      if (this.pickups.some(other => other !== p && other.live && Math.abs(other.x - p.x) < 16)) p.x += 18;
      if (p.def.power) this.drip.notePowerMoved(p.x);
      if (g.lane) { p.alt = L.corridor - p.alt - p.h; p.gravityCeiling = L.corridor; }
    }
  }
  // Relay portals use their normal lifecycle, animation and hero swap. Park
  // them in a floor-running stretch, away from the switch's jump decision.
  clearPortalLane(x) {
    if (this.portal && !this.portal.gravityParked && this.gravityGates) {
      const g = this.gravityGates.find(g => g.lane === 0 && g.x + 175 >= x && g.x + 175 < this.totalDist - 120);
      if (g) { this.portal.x = g.x + 175; this.portal.gravityParked = true; }
    }
    super.clearPortalLane(this.portal?.x ?? x);
  }
  gravityHints() { return new Set([...this.gravityFailures].filter(([, n]) => n >= 2).map(([i]) => i)); }
  die(msg, cue = true, src = null) {
    if (!this.dead && (src === 'popSpikes' || src === 'floorSaw')) {
      const g = this.gravityGates?.filter(g => g.x + 40 < this.playerWorldX()).at(-1);
      if (g && g.lane !== this.gravityLane) this.gravityFailures.set(g.index, (this.gravityFailures.get(g.index) || 0) + 1);
    }
    super.die(msg, cue, src);
  }
  gravitySnapshot() {
    return { lane: this.gravityLane, gate: this.gravityGate,
      transfer: this.gravityTransfer ? { ...this.gravityTransfer } : null,
      spark: this.gravitySpark, spawned: [...this.gravitySpawned],
      ceilings: this.obstacles.concat(this.pickups).filter(e => e.gravityCeiling != null).map(e => e.id) };
  }
  restoreGravity(s) {
    this.gravityLane = s.lane; this.gravityGate = s.gate;
    this.gravityTransfer = s.transfer ? { ...s.transfer } : null;
    this.gravitySpark = s.spark; this.gravitySpawned = new Set(s.spawned);
    const ceilingIds = new Set(s.ceilings);
    for (const e of this.obstacles.concat(this.pickups)) if (ceilingIds.has(e.id)) e.gravityCeiling = L.corridor;
  }
  makeSnapshot() { return { ...super.makeSnapshot(), gravity: this.gravitySnapshot() }; }
  restoreSnapshot(s) {
    super.restoreSnapshot(s);
    this.restoreGravity(s.gravity);
    // The shared checkpoint restore discards transient entities. Rebuild the
    // remaining authored lane at its original coordinates and polarity.
    this.obstacles = []; this.pickups = []; this.gravitySpawned.clear();
    this.fillGravityEntities();
    this.resetRenderInterpolation();
  }
  writeRewindSnapshot(s) { super.writeRewindSnapshot(s); s.gravity = this.gravitySnapshot(); }
  restoreRewindSnapshot(s) { super.restoreRewindSnapshot(s); this.restoreGravity(s.gravity); }
}
