// A normal RunState with one cabinet-specific movement controller and an
// authored corridor. HUD, controls, damage, death, restore and finish
// are inherited, rather than approximated by a separate mini-game.
import { setBlastHook, setShotHook } from '../../dev/space-plateaus.js';
import { RunState, applyFraming } from '../../game/run.js';
import { makeObstacle, makePickup } from '../../game/entities.js';
import { GROUND_Y, screenYFor, setRestingZoom } from '../../engine/camera.js';
import { W, H, isPhonePortraitPresentation } from '../../engine/renderer.js';
import { PHONE_PORTRAIT, LANDSCAPE } from '../../engine/frame.js';
import { Audio } from '../../engine/audio.js';
import { GravityPlayer } from './player.js';
import { floatLaunch, jumpV } from '../player.js';
import { drawGravityRoom } from '../../dev/gravity/scene.js';
import { SPACE_LOOKS, drawSpaceRoom } from '../../dev/space-look-candidates.js';
import { GRAVITY_LEVEL as L, GRAVITY_CABINET } from './model.js';
import { GRAVITY_STAGE_DATA, isGateField } from '../../data/gravity-stages.js';
import { STAGE_BY_ID } from '../../data/stages.js';
import { PLAYER_X } from '../player.js';
import { drawFloatingBolts, drawMaintenanceRobot } from '../../sprites/gravity-encounters.js';
import { gravityMissionStateFor, gravitySeconds, gravityStageDataFor, gravityWorldX } from './encounters.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const FINISH_RETURN_LEAD_SECONDS = 3;

// The ceiling is jump-only (Peter, 13 Oct: "not to require the user to duck
// [on the ceiling], it's a little confusing to press the down button"): any
// duck hazard authored on the ceiling rail runs as a jump hazard of the
// station's own kit instead.
const CEILING_JUMP = { weldingDrone: 'maintenanceBot', looseToolkit: 'fuelCell', maintenanceBrush: 'maintenancePulse' };
function ceilingJumpsOnly(hazards) {
  return hazards.map(h => (h.lane && CEILING_JUMP[h.type] ? { ...h, type: CEILING_JUMP[h.type], span: undefined } : h));
}
// The wrong rail is a spike bed again, as in the original playtest (Peter, 13
// Oct): from just after each gate to just before the next, the rail you should
// have left is lined with pop-spikes, so a missed jump is plainly a mistake.
// Beds stop 38 short of the next gate (that rail becomes yours there) and step
// around anything already authored on that rail.
const BED_STEP = 24, BED_W = 15;
function withWrongRailBeds(hazards, gates, total, speed) {
  if (!gates.length) return hazards;
  const spans = [{ start: 0, end: gates[0].x - 38, lane: 1 },
    ...gates.map((g, i) => ({ start: g.x + 52, end: (gates[i + 1]?.x ?? total) - 38, lane: 1 - g.lane }))];
  const occupied = (lane, x) => hazards.some(h => h.lane === lane
    && x + BED_W + 14 > h.x && x - 14 < h.x + (h.span ? h.span * speed : 16));
  const beds = [];
  for (const span of spans) for (let x = span.start; x + BED_W < span.end; x += BED_STEP) {
    if (occupied(span.lane, x)) continue;
    beds.push({ id: `bed-${span.lane}-${Math.round(x)}`, lane: span.lane, type: 'popSpikes', x, at: x / speed, bed: true });
  }
  return hazards.concat(beds);
}

export class GravityRunState extends RunState {
  constructor(opts = {}) {
    const stage = opts.stage || STAGE_BY_ID['gravity-1'];
    const cabinet = opts.cabinet || GRAVITY_CABINET;
    super({ ...opts, cabinet: { ...cabinet, ...GRAVITY_CABINET, id: cabinet.id, name: cabinet.name }, stage });
    // The space look is the level's own painting now (Peter, 13 Oct: "make the
    // look and feel the real level painting instead of the default"): jade, the
    // chrome strip gates, the title starfield, the directed life outside, and
    // shelves and buttes (P5). ?spacelook=<id> still swaps in any candidate;
    // ?spacelook=crt brings back the old vector-CRT playtest room.
    this.spaceLook = opts.spaceLook === 'crt' ? null : SPACE_LOOKS[opts.spaceLook] || SPACE_LOOKS['plateau-occasional'];
    this.gravityStageData = GRAVITY_STAGE_DATA[stage.id] || GRAVITY_STAGE_DATA['gravity-1'];
    this.gravityMissionState = null;
  }
  createPlayer(hero, mods) { return new GravityPlayer(hero, mods, this); }
  // Gates need a consistent crossing runway. Assist speed still applies via
  // the ordinary baseSpeed calculation and authored distance scaling.
  get speed() { return this.baseSpeed(); }
  speedAt() { return this.baseSpeed(); }
  groundYAt() { return GROUND_Y; }
  gravityScale() { return this.gravityStageData?.gravity ?? L.gravity; }
  rewardAnchors() {
    // Rewards only ever on the rail you should be running (Peter, 13 Oct: "no
    // rewards on the wrong side"): whatever lane a stage authored, a reward
    // sits on the rail the last gate sent you to.
    const anchors = this.gravityStageData.rewards
      ? this.gravityStageData.rewards.map(g => ({ ...g, x: gravityWorldX(g.at, PLAYER_X, this.baseSpeed()) }))
      : this.gravityGates.map(g => ({ ...g, x: g.x + 175 }));
    return anchors.map(a => ({ ...a, lane: this.activeLaneAt(a.x) }));
  }
  // The rail the gates say is the running surface at world x.
  activeLaneAt(x) {
    const g = (this.gravityGates || []).filter(g => g.x - L.arrowLeftOffset <= x).at(-1);
    return g ? g.lane : 0;
  }
  playerDustSurface() {
    return this.gravityLane
      ? { y: GROUND_Y - L.corridor, away: 1 }
      : { y: GROUND_Y, away: -1 };
  }
  // Both surfaces fit in a single composition. Ceiling jumps and landing
  // velocity must never engage the ordinary hero-follow crane or zoom spring.
  updateCamera() {
    const config = this.portraitConfig();
    const portrait = this.portraitGameplay && config && isPhonePortraitPresentation();
    const mode = portrait ? PHONE_PORTRAIT : LANDSCAPE;
    const zoom = portrait ? config.worldZoom
      : Math.min(L.landscapeZoomCap, applyFraming(this.renderSettings || this.save?.settings));
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
    // Level 2's raid: one small explosion sound per object, as its fireball
    // starts (the painter reports each piece once). Other levels: none.
    this.raidBlown = new Set();
    setBlastHook(this.stage?.index === 2 ? (key) => {
      if (this.raidBlown.has(key) || this.paused || this.dead) return;
      this.raidBlown.add(key);
      Audio.sfx('smallBoom', { pitch: 0.85 + (this.raidBlown.size * 41 % 5) * 0.07, gain: 0.75 });   // Peter, 13 Oct: down under the pews, then "bring up more"
    } : null);
    // …and one pew per shot: the saucers fire once per object.
    this.raidShots = new Set();
    setShotHook(this.stage?.index === 2 ? (key) => {
      if (this.raidShots.has(key) || this.paused || this.dead) return;
      this.raidShots.add(key);
      Audio.sfx('martianPew', { pitch: [1, 1.12, 0.94, 1.06][this.raidShots.size % 4], gain: 0.65 });
    } : null);
    this.gravityFailures ||= new Map();
    this.gravityMissionState = gravityMissionStateFor(this.gravityStageData, this.gravityMissionState);
    this.gravityGates = null;
    this.gravityLane = 0; this.gravityGate = 0;
    this.gravityTransfer = null; this.gravitySpark = 0;
    super.enter();
    this.gravityStageData = gravityStageDataFor(this.stage, GRAVITY_STAGE_DATA, this.layout?.durationSec);
    this.gravityMissionState = gravityMissionStateFor(this.gravityStageData, this.gravityMissionState);
    const speed = this.baseSpeed();
    const xAt = (sec) => gravityWorldX(sec, PLAYER_X, speed);
    this.gravityGates = this.gravityStageData.gates.map((g, index) => ({ ...g, index, x: xAt(g.at) }));
    this.gravityHazards = this.gravityStageData.hazards.map((h) => ({ ...h, x: xAt(h.at) }));
    this.gravityHazards = withWrongRailBeds(ceilingJumpsOnly(this.gravityHazards), this.gravityGates, this.totalDist, speed);
    this.gravitySpawned = new Set();
    this.obstacles = []; this.pickups = [];
    this.spawner.fill = () => this.fillGravityEntities();
    this.fillGravityEntities();
    this.style = {
      ...this.style, name: 'gravity', lightBg: this.spaceLook?.lightBg ?? false, smoothMotion: true,
      heroShadow: false, bgPan: 0, ownSurface: true, noTerrain: true,
      bg: c => { c.fillStyle = this.spaceLook?.bg ?? '#0b1723'; c.fillRect(0, 0, W, H); },
      ground: (c, cam, cab, obs, cuts, t, view) => {
        const z = this.camZoom, floor = screenYFor(GROUND_Y, z, this.camPan, this.camFloorY);
        c.save(); c.translate(0, GROUND_Y);
        const room = { cam, view: view + 60,
          top: -floor / z - 20, bottom: (H - floor) / z + 20,
          // The scenery clock, not the gameplay one: tRun stops when the finish
          // hold starts, and everything outside froze mid-gesture (Peter, 13 Oct).
          time: this.backgroundT ?? t, gates: this.gravityGates, hintGates: this.gravityHints(), length: this.totalDist, stage: this.stage?.index ?? 1, finishCam: this.finishCameraX(),
          holdT: this.finishing || this.finished ? (this.backgroundT ?? t) - (this._finishBgT ??= this.backgroundT ?? t) : (this._finishBgT = null, 0),
          speed: this.baseSpeed(), finishLine: this.finishWorldX() - this.finishCameraX(),
          portrait: !!(this.portraitGameplay && isPhonePortraitPresentation()) };
        if (this.spaceLook) drawSpaceRoom(c, this.spaceLook, room); else drawGravityRoom(c, room);
        // On the scenery clock: tRun is held through the intro, which left the
        // bolts frozen until the run started (Peter, 13 Oct).
        if (this.gravityStageData.floatingBolts) drawFloatingBolts(c, cam, view, this.backgroundT ?? t, L.corridor);
        if (this.gravityStageData.sequences) drawMaintenanceRobot(c, {
          cam, view, time: t, seconds: this.gravityTravelTime(), corridor: L.corridor,
          playerX: this.playerWorldX() - cam, hazards: this.obstacles,
          sequences: this.gravityStageData.sequences,
        });
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
      const ob = makeObstacle(h.type, h.x);
      if (h.span) ob.w = h.span * this.baseSpeed();
      if (h.x + ob.w < this.playerWorldX() - 20) return;
      ob.gravityAuthoredId = h.id;
      ob.gravityAt = h.at;
      // The station's moving equipment is not a shooting puzzle. Keep these
      // physical hazards solid and armored so every hero reads the same route.
      ob.def = { ...ob.def, armored: true, breakable: false };
      if (h.lane) { ob.alt = L.corridor - ob.alt - ob.h; ob.gravityCeiling = L.corridor; }
      this.obstacles.push(ob);
    });
    this.gravityGates.forEach((g, index) => {
      const key = `coins-${index}`;
      if (this.gravitySpawned.has(key)) return;
      this.gravitySpawned.add(key);
      for (let n = 0; n < 3; n++) {
        const x = g.x + 105 + n * 17;
        if (x < this.playerWorldX() - 10) continue;
        const coin = makePickup('coin', x, 8);
        if (this.activeLaneAt(x)) { coin.alt = L.corridor - coin.alt - coin.h; coin.gravityCeiling = L.corridor; }
        this.pickups.push(coin);
      }
    });
    (this.gravityStageData.coinArcs || []).forEach((arc, index) => {
      const key = `coin-arc-${index}`;
      if (this.gravitySpawned.has(key)) return;
      this.gravitySpawned.add(key);
      // Match the current hero's real jump launch and the cabinet's gravity.
      // Altitude is the coin's bottom edge; nudge it into the hero's body so
      // collecting the trail follows the feet through the same curve.
      const gravityScale = this.gravityScale() * this.powerups.gravityMultiplier();
      const launch = jumpV(this.player.hero) * floatLaunch(gravityScale)
        * (this.gravityStageData.jumpHeightScale || 1);
      const gravity = this.player.gravity * gravityScale;
      for (let n = 0; n < arc.count; n++) {
        const t = n * arc.step;
        const x = gravityWorldX(arc.at + t, PLAYER_X, this.baseSpeed());
        if (x + 8 < this.playerWorldX() - 10) continue;
        const feet = Math.max(0, launch * t - 0.5 * gravity * t * t);
        const coin = makePickup('coin', x, Math.max(8, Math.round(feet - 3)));
        if (this.activeLaneAt(x)) {
          coin.alt = L.corridor - coin.alt - coin.h;
          coin.gravityCeiling = L.corridor;
        }
        this.pickups.push(coin);
      }
    });
    this.positionGravityHazards();
  }
  crossGravity(gate) {
    if (this.gravityLane === gate.lane) return;
    const p = this.player, from = this.gravityLane;
    this.gravityLane = gate.lane;
    // A jump that crosses the arrow on its way DOWN used to keep that downward
    // speed into the flip, so the new pull had to stop it first and the hero
    // sank through the floor (up to 14 px) before rising to the ceiling. Any
    // speed away from the destination surface is dropped at the flip.
    if (gate.lane ? p.vy < 0 : p.vy > 0) p.vy = 0;
    const altitude = gate.lane ? L.corridor - 24 - p.y : p.y;
    const vy = gate.lane ? -p.vy : p.vy;
    const acceleration = p.gravity * this.gravityScale() * this.powerups.gravityMultiplier();
    this.gravityTransfer = { from, elapsed: 0,
      duration: Math.max(0.001, (vy + Math.sqrt(vy * vy + 2 * acceleration * Math.max(0, altitude))) / acceleration) };
    p.grounded = false; p.jumps = 0; p.launched = true; p.clearSlideState();
    Audio.sfx('jump2');
  }
  // Level 2 ends on the Martian fleet arriving: hold a little longer on it
  // (Peter, 13 Oct: "we can stay a little longer on the finish line").
  finaleExtraHold() { return this.stage?.index === 2 ? 3.5 : 0; }
  gravityTravelTime() { return gravitySeconds(this.distance, this.baseSpeed()); }
  updateGravityMission() {
    const seconds = this.gravityTravelTime();
    for (const sequence of this.gravityStageData.sequences || []) {
      if (seconds >= sequence.end && !this.gravityMissionState.completed.includes(sequence.id)) {
        this.gravityMissionState.completed.push(sequence.id);
        Audio.sfx('checkpoint');
        this.floatText(`CLEANING CYCLE ${this.gravityMissionState.completed.length}/3`, '#a9f7c1');
      }
    }
    if (this.gravityStageData.sequences) this.mission.count = this.gravityMissionState.completed.length;
    this.positionGravityHazards();
  }
  positionGravityHazards() {
    const seconds = this.gravityTravelTime();
    // Pulses approach, rather than sitting like crates. Position is a pure
    // function of route time, so checkpoint/rewind restore the exact attack.
    for (const ob of this.obstacles) if (ob.type === 'maintenancePulse') {
      const drift = Math.max(-1.5, Math.min(1.5, seconds - ob.gravityAt));
      ob.x = gravityWorldX(ob.gravityAt, PLAYER_X, this.baseSpeed()) - drift * this.baseSpeed() * 0.35;
    }
  }
  updateMission(dt) {
    this.updateGravityMission(dt);
    super.updateMission(dt);
  }
  prepareFinishGravityReturn() {
    if (this.overtime || this.finishing || this.gravityLane !== 1 || this.gravityTransfer
      || !this.player?.grounded || !this.missionSatisfied()) return false;
    const speed = Math.max(1, this.baseSpeed());
    if (this.distance < this.finishCameraX() - speed * FINISH_RETURN_LEAD_SECONDS) return false;
    this.crossGravity({ lane: 0, x: this.playerWorldX() });
    return true;
  }
  exit() { setBlastHook(null); setShotHook(null); return super.exit(); }
  update(dt) {
    if (!this.paused && !this.dead) {
      this.gravitySpark = Math.max(0, this.gravitySpark - dt);
      this.prepareFinishGravityReturn();
    }
    super.update(dt);
  }
  // Normal capsule selection/cadence, parked in the clear reward stretch
  // after a switch and mirrored onto its destination rail.
  dripUpdate(dt, stopX) {
    if (!this.gravityGates) return;
    const before = new Set(this.pickups);
    super.dripUpdate(dt, stopX);
    for (const p of this.pickups) if (!before.has(p)) {
      const g = this.rewardAnchors().find(g => g.x >= p.x && g.x < stopX);
      if (!g) { p.live = false; continue; }
      p.x = g.x; p.alt = Number.isFinite(g.alt) ? g.alt : 8;
      if (this.pickups.some(other => other !== p && other.live && Math.abs(other.x - p.x) < 16)) p.x += 18;
      if (p.def.power) this.drip.notePowerMoved(p.x);
      if (g.lane) { p.alt = L.corridor - p.alt - p.h; p.gravityCeiling = L.corridor; }
    }
  }
  // Relay portals use their normal lifecycle, animation and hero swap. Park
  // them in a floor-running stretch, away from the switch's jump decision.
  clearPortalLane(x) {
    if (this.portal && !this.portal.gravityParked && this.gravityGates) {
      const g = this.rewardAnchors().find(g => g.lane === 0 && g.x >= x && g.x < this.totalDist - 120);
      if (g) { this.portal.x = g.x; this.portal.gravityParked = true; }
    }
    super.clearPortalLane(this.portal?.x ?? x);
  }
  gravityHints() { return new Set([...this.gravityFailures].filter(([, n]) => n >= 2).map(([i]) => i)); }
  die(msg, cue = true, src = null) {
    if (!this.dead && (src === 'popSpikes' || src === 'floorSaw' || isGateField(src) || src === 'maintenanceRollers')) {
      const g = this.gravityGates?.filter(g => g.x + 40 < this.playerWorldX()).at(-1);
      if (g && g.lane !== this.gravityLane) this.gravityFailures.set(g.index, (this.gravityFailures.get(g.index) || 0) + 1);
    }
    super.die(msg, cue, src);
  }
  gravitySnapshot() {
    return { lane: this.gravityLane, gate: this.gravityGate,
      transfer: this.gravityTransfer ? { ...this.gravityTransfer } : null,
      spark: this.gravitySpark, spawned: [...this.gravitySpawned],
      ceilings: this.obstacles.concat(this.pickups).filter(e => e.gravityCeiling != null).map(e => e.id),
      mission: clone(this.gravityMissionState) };
  }
  restoreGravity(s) {
    this.gravityLane = s.lane; this.gravityGate = s.gate;
    this.gravityTransfer = s.transfer ? { ...s.transfer } : null;
    this.gravitySpark = s.spark; this.gravitySpawned = new Set(s.spawned);
    if (s.mission) this.gravityMissionState = clone(s.mission);
    const ceilingIds = new Set(s.ceilings);
    for (const e of this.obstacles.concat(this.pickups)) if (ceilingIds.has(e.id)) e.gravityCeiling = L.corridor;
    if (this.gravityStageData.sequences) this.mission.count = this.gravityMissionState.completed.length;
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
