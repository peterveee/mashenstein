// A normal RunState with one cabinet-specific movement controller and an
// authored corridor. HUD, controls, damage, death, restore and finish
// are inherited, rather than approximated by a separate mini-game.
import { frameGroundY } from '../../engine/frame.js';
import { setAckHook, setBlastHook, setShotHook } from '../../dev/space-plateaus.js';
import { setPilotHook, setFinishAckHook } from '../../dev/space-life.js';
import { RunState, applyFraming, portraitGameplayEdges } from '../../game/run.js';
import { makeObstacle, makePickup, OBSTACLES } from '../../game/entities.js';
import { GROUND_Y, screenYFor, setRestingZoom } from '../../engine/camera.js';
import { W, H, isPhonePortraitPresentation, presentationFrame } from '../../engine/renderer.js';
import { PHONE_PORTRAIT, LANDSCAPE } from '../../engine/frame.js';
import { Audio } from '../../engine/audio.js';
import { GravityPlayer } from './player.js';
import { floatLaunch, jumpV, gravityFor } from '../player.js';
import { HEROES } from '../../data/heroes.js';
import { drawGravityRoom } from '../../dev/gravity/scene.js';
import { SPACE_LOOKS, drawSpaceRoom, railDepth } from '../../dev/space-look-candidates.js';
import { GRAVITY_LEVEL as L, GRAVITY_CABINET } from './model.js';
import { GRAVITY_STAGE_DATA, isGateField } from '../../data/gravity-stages.js';
import { STAGE_BY_ID } from '../../data/stages.js';
import { PLAYER_X } from '../player.js';
import { drawFloatingBolts, drawMaintenanceVacuum, vacuumShotAheadForView } from '../../sprites/gravity-encounters.js';
import { gravityMissionStateFor, gravitySeconds, gravityStageDataFor, gravityWorldX,
  VACUUM_LOADED_SECONDS, VACUUM_PREP_SECONDS, VACUUM_SHOT_SPEED, VACUUM_SOURCE_LEAD_SECONDS,
  VACUUM_WARNING_SECONDS, vacuumAttackPhase, vacuumSweepBatches } from './encounters.js';

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
// Since 14 Oct each unbroken run of bed is ONE live wire (railPulse, the
// maintenance pulse's zigzag strung between two emitters) instead of a row of
// spike plates: Peter, "i like these things... id like a lot of the spikes to be
// replaced with this... perhaps it can be one extended laser instead of lots of
// separate spikes".
const BED_STEP = 24, BED_W = 15, WIRE_MAX = 150, WIRE_GAP = 24;   // a clear gap: at 10 their glows met (14 Oct)
// The wires read best alone (Peter, 14 Oct: "dont put obstacles between the different
// sections of live wires … gaps are fine"): the station's props authored on a wrong
// rail are lifted off it. Mission machinery keeps its place.
// Since 15 Oct the gate's field comes off the wrong rail too and the wire starts right
// behind the gate (Peter: "dont put obstacles in front of live wires - give more
// opportunity for players to walk into the wires"): a missed arrow walks straight onto
// the wire and gets the zap (sprites/zap.js), not a field that spends the hit first.
const WIRE_CLEARS = new Set(['foilCrate', 'specimenCase', 'fuelCell', 'maintenanceBot',
  'coolantRadiator', 'valveManifold', 'weldingDrone', 'looseToolkit']);
function withWrongRailBeds(hazards, gates, total, speed, debrisRail = false, debrisSources = []) {
  if (!gates.length) return hazards;
  const spans = [{ start: 0, end: gates[0].x - 38, lane: 1 },
    ...gates.map((g, i) => ({ start: g.x + 52, end: (gates[i + 1]?.x ?? total) - 38, lane: 1 - g.lane }))];
  const inSpan = (h) => spans.some(sp => h.lane === sp.lane && h.x >= sp.start - 20 && h.x < sp.end);
  hazards = hazards.filter(h => !((WIRE_CLEARS.has(h.type) || isGateField(h.type)) && inSpan(h)));
  const occupied = (lane, x) => hazards.some(h => h.lane === lane
    && x + BED_W + 14 > h.x && x - 14 < h.x + (h.span ? h.span * speed : 16));
  const beds = [];
  for (const span of spans) {
    let run = null;
    // No wire longer than WIRE_MAX: a longer run is laid as several, end to end with
    // a WIRE_GAP between (Peter, 14 Oct: "to avoid long uninterrupted sections").
    const close = () => {
      if (run) {
        const len = run.x1 - run.x0;
        if (debrisRail) {
          // Short electrical hazards alternate with generous rubbish patches.
          // Reserve the full portrait-to-desktop intake range for attack piles.
          for (let x = run.x0; x + 24 <= run.x1; x += 192) {
            const width = Math.min(36, run.x1 - x);
            if (debrisSources.some(a => a.lane === span.lane && x + width > a.left && x < a.right)) continue;
            beds.push({ id: `bed-${span.lane}-${Math.round(x)}`, lane: span.lane, type: 'railPulse',
              x, at: x / speed, span: width / speed, bed: true });
          }
        } else {
          const n = Math.ceil(len / WIRE_MAX), piece = (len - WIRE_GAP * (n - 1)) / n;
          for (let i = 0; i < n; i++) {
            const x = run.x0 + i * (piece + WIRE_GAP);
            beds.push({ id: `bed-${span.lane}-${Math.round(x)}`, lane: span.lane, type: 'railPulse',
              x, at: x / speed, span: piece / speed, bed: true });
          }
        }
      }
      run = null;
    };
    for (let x = span.start; x + BED_W < span.end; x += BED_STEP) {
      if (occupied(span.lane, x)) { close(); continue; }
      if (run) run.x1 = x + BED_W; else run = { x0: x, x1: x + BED_W };
    }
    close();
  }
  return hazards.concat(beds);
}

// Nothing sits on the window frames (Peter, 16 Oct: "make sure there are no objects
// or obstacles placed over the panels of glass... they SHOULD stand in front of
// glass"): the room's panes run PANE_STEP apart, PANE_W wide, from PANE_OFF, in world
// x, and each frame is the PANE_GAP between them. Obstacles that overlap in x (a jump
// group) move together by the smallest slide that puts the group inside one pane;
// anything wider than a pane (the long wires and lasers) can't, and stays put.
const PANE_STEP = 102, PANE_OFF = 4, PANE_W = 94, PANE_MARGIN = 5, GROUP_GAP = 40;
export function paneSlide(x0, x1) {
  if (x1 - x0 > PANE_W - 2 * PANE_MARGIN) return 0;
  let best = null;
  for (let k = Math.floor((x0 - PANE_OFF) / PANE_STEP) - 1; k <= Math.floor((x1 - PANE_OFF) / PANE_STEP) + 1; k++) {
    const lo = k * PANE_STEP + PANE_OFF + PANE_MARGIN, hi = k * PANE_STEP + PANE_OFF + PANE_W - PANE_MARGIN;
    const d = x0 < lo ? lo - x0 : x1 > hi ? hi - x1 : 0;
    if (best === null || Math.abs(d) < Math.abs(best)) best = d;
  }
  return best;
}
const NO_SLIDE = (h) => h.bed || h.type === 'maintenancePulse' || isGateField(h.type);
function clearOfFrames(hazards, speed) {
  const width = (h) => h.span ? h.span * speed : (OBSTACLES[h.type]?.w ?? 16);
  const movable = hazards.filter(h => !NO_SLIDE(h) && OBSTACLES[h.type]).sort((a, b) => a.x - b.x);
  for (let i = 0; i < movable.length;) {
    let j = i + 1, end = movable[i].x + width(movable[i]);
    while (j < movable.length && movable[j].x < end + GROUP_GAP) { end = Math.max(end, movable[j].x + width(movable[j])); j++; }
    const d = Math.round(paneSlide(movable[i].x, end));
    if (d) for (let n = i; n < j; n++) { movable[n].x += d; movable[n].at += d / speed; }
    i = j;
  }
  return hazards;
}

const ZOOM_PHONE_FRAMING = 2.2, PHONE_TOP = 22, PHONE_BOTTOM = 3;
// Under the HUD's first row on desktop and tablet; the ceiling rail runs behind
// the second (BONUS), which play never reaches (Peter, 14 Oct: "i would like
// more window").
const HUD_ROWS_BOTTOM = PHONE_TOP;
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
    this.corridor = L.corridor;
  }
  // The corridor fills the landscape frame (Peter, 13 Oct: "the ceiling should
  // be just below the top hud and the floor above the bottom hud and the glass
  // stretches to fit as well as the background"). At the phone's 2.2 the 86
  // corridor already fills it; at the desktop/tablet framings it grows until the
  // ceiling rail's top is under the HUD's first row. Portrait keeps 86 (it has room
  // to spare). Refitted whenever the framing changes (ZOOM IN, a resize, the
  // settings arriving after enter): everything on the ceiling moves with it.
  fitCorridor() {
    const config = this.portraitConfig();
    if (this.portraitGameplay && config && isPhonePortraitPresentation()) {
      // Portrait too, now (Peter, 14 Oct: "make our floor and windows a bit
      // taller in portrait, there is a lot of wasted space"): the floor stays
      // where the portrait frame puts it, the ceiling rises to just under the
      // status HUD.
      const z = config.worldZoom, ground = screenYFor(GROUND_Y, z, this.portraitFrameFit().pan, GROUND_Y);
      // Not all the way up though (Peter, 16 Oct: "dont extend the windows all
      // the way to the top, only make the floors and ceiling the same height"):
      // the ceiling sits as far below the top of the screen as the floor sits
      // above the bottom, never higher than under the status HUD.
      const frame = presentationFrame();
      const top = Math.max(portraitGameplayEdges(frame, this).top + 2, (Number(frame?.height) || 0) - ground);
      const fit = Math.floor((ground - top) / z / (1 + this.railRoom() / 137));
      // Capped at 2.2× — past that the windows grow wider than the screen.
      return Number.isFinite(fit) ? Math.max(L.corridor, Math.min(fit, Math.round(L.corridor * 2.2))) : L.corridor;
    }
    const zoom = applyFraming(this.renderSettings || this.save?.settings);
    return Math.max(L.corridor, Math.floor((frameGroundY() - HUD_ROWS_BOTTOM) / zoom / (1 + this.railRoom() / 137)));
  }
  // Jumps, the pull and the flips all scale with the corridor (Peter, 14 Oct:
  // "their jumps should scale (as should position of ring arcs and rewards)"):
  // heights ∝ corridor, airtimes unchanged, so every authored spacing in
  // seconds still holds and low gravity still reaches nearly to the ceiling.
  // Height ∝ jumpScale², airtime ∝ jumpScale / √gravity: k on the pull, √k on
  // the launch. The stages were authored in a 137 corridor and tuned at 86 (k =
  // 86/137); what scales is the headroom over the hero (corridor − 24), so a
  // held low-gravity jump stops just as short of the ceiling in any corridor.
  geometryK() { return (this.corridor - 24) / (L.corridor - 24) * L.corridor / 137; }
  jumpScaleK() { return Math.sqrt(this.geometryK()); }
  // The rails' depth: authored in the room's 137-high units, drawn at its scale.
  railRoom() { return this.spaceLook ? railDepth(this.spaceLook) : 12; }
  railWorld() { return this.railRoom() * this.corridor / 137; }
  refitCorridor() {
    if (this.gravityTransfer) return;
    const prev = this.corridor, next = this.fitCorridor(), d = next - prev;
    if (Math.abs(d) < 2) return;
    this.corridor = next;
    for (const e of (this.obstacles || []).concat(this.pickups || [])) {
      // Coin arcs trace a jump, and jumps scale with the corridor.
      if (e.gravityArc) {
        const local = e.gravityCeiling != null ? prev - e.alt - e.h : e.alt;
        const scaled = Math.max(8, Math.round((local + 3) * next / prev - 3));
        e.alt = e.gravityCeiling != null ? next - scaled - e.h : scaled;
      } else if (e.gravityCeiling != null) e.alt += d;
      if (e.gravityCeiling != null) e.gravityCeiling = next;
    }
    if (this.gravityLane === 1 && this.player) this.player.y += d;
  }
  createPlayer(hero, mods) { return new GravityPlayer(hero, mods, this); }
  // Gates need a consistent crossing runway. Assist speed still applies via
  // the ordinary baseSpeed calculation and authored distance scaling.
  get speed() { return this.baseSpeed(); }
  speedAt() { return this.baseSpeed(); }
  groundYAt() { return GROUND_Y; }
  gravityScale() { return (this.gravityStageData?.gravity ?? L.gravity) * this.geometryK(); }
  rewardAnchors() {
    // Rewards only ever on the rail you should be running (Peter, 13 Oct: "no
    // rewards on the wrong side"): whatever lane a stage authored, a reward
    // sits on the rail the last gate sent you to.
    const anchors = this.gravityStageData.rewards
      ? this.gravityStageData.rewards.map(g => ({ ...g, x: gravityWorldX(g.at, PLAYER_X, this.baseSpeed()) }))
      : this.gravityGates.map(g => ({ ...g, x: g.x + 175 }));
    return anchors.map(a => ({ ...a, lane: this.activeLaneAt(a.x) }));
  }
  // How high a capsule may sit: as high as the WEAKEST hero's held jump reaches
  // in this corridor, and never above the ceiling (Peter, 16 Oct: "some of these
  // rewards are too high to reach with any hero... rewards ABOVE the ceiling,
  // make sure these are reachable by any hero, but high please"). The stage's
  // authored altitude only staggers them below it. The apex is
  // launch²/2g with the stage's jump scale, the same sum the coin arcs use.
  rewardAltCap(h = 12) {
    const gs = this.gravityScale();
    const k = (this.gravityStageData.jumpHeightScale || 1) * this.jumpScaleK();
    let apex = Infinity;
    for (const hero of HEROES) {
      const launch = jumpV(hero) * floatLaunch(gs) * k;
      apex = Math.min(apex, launch * launch / (2 * gravityFor(hero) * gs));
    }
    // The hero's body collects it too, so the apex is a little conservative.
    return Math.max(8, Math.min(Math.floor(apex * 0.95), this.corridor - h - 6));
  }
  // The rail the gates say is the running surface at world x.
  activeLaneAt(x) {
    const g = (this.gravityGates || []).filter(g => g.x - L.arrowLeftOffset <= x).at(-1);
    return g ? g.lane : 0;
  }
  playerDustSurface() {
    return this.gravityLane
      ? { y: GROUND_Y - this.corridor, away: 1 }
      : { y: GROUND_Y, away: -1 };
  }
  // Both surfaces fit in a single composition. Ceiling jumps and landing
  // velocity must never engage the ordinary hero-follow crane or zoom spring.
  updateCamera() {
    this.refitCorridor();
    const config = this.portraitConfig();
    const portrait = this.portraitGameplay && config && isPhonePortraitPresentation();
    const mode = portrait ? PHONE_PORTRAIT : LANDSCAPE;
    const framing = applyFraming(this.renderSettings || this.save?.settings);
    // Phone landscape (Peter, 13 Oct: "quite zoomed out on mobile"): instead of
    // the desktop cap, fit the corridor exactly — ceiling rail's top just under
    // the HUD's first row, floor rail's bottom on the frame's bottom edge — and
    // pan to place it. ~1.5 at the 270-high frame, against 1.36.
    // Landscape: the level's own framing (2.2 on a phone, like every level),
    // unless the corridor would not fit; then pan just enough to keep the
    // ceiling rail under the HUD's first row and the floor rail on screen.
    const rail = this.railWorld();
    const fitZ = (H - PHONE_TOP - PHONE_BOTTOM) / (this.corridor + 2 * rail);
    const zoom = portrait ? config.worldZoom : Math.min(framing, fitZ);
    let pan = 0;
    if (!portrait) {
      const ground = frameGroundY(), floorBottom = ground + rail * zoom, ceilTop = ground - (this.corridor + rail) * zoom;
      if (floorBottom > H - PHONE_BOTTOM) pan = (H - PHONE_BOTTOM) - floorBottom;
      if (ceilTop + pan < PHONE_TOP) pan = PHONE_TOP - ceilTop;
    } else pan = this.portraitFrameFit().pan;
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
    // Level 3: the lone Martian on the last butte cackles as he shoots the
    // shuttle down — once, in the chat (Peter, 14 Oct).
    this.ackSaid = false;
    // …and one more "ACK!" as he waves, once the first has gone, that stays with him
    // until he has scrolled out of the picture (Peter, 14 Oct).
    this.waveAckSaid = false;
    setAckHook(this.stage?.index === 3 ? (at, firing, waving) => {
      if (this.paused || this.dead) return;
      if (firing && !this.ackSaid) { this.ackSaid = true; this.sayAt('ACK! ACK! ACK!', at, 'martian'); return; }
      const card = this.speakerCards?.martian, up = card && this.floaties.includes(card);
      if (waving && this.ackSaid && !up && !this.waveAckSaid) {
        this.waveAckSaid = true;
        this.sayAt('ACK!', at, 'martian', 30);
      } else this.trackSpeaker('martian', at);
    } : null);
    // …and the saucer pilot, when his beam comes on over the plateau.
    this.pilotSaid = false; this.pilotOutSaid = false;
    // His line rides along with him as he sweeps across and away (Peter, 14 Oct:
    // "shouldn't the ack acks of the space ship stay with them as they move").
    setPilotHook(this.stage?.index === 3 ? (at, firing, atLeft = at) => {
      if (this.paused || this.dead) return;
      if (firing && !this.pilotSaid) { this.pilotSaid = true; this.sayAt('ACK! ACK! ACK! ACK!', at, 'pilot'); return; }
      // …and once that has gone and he is flying off, an ACK! ACK! that goes with him
      // until he is out of the picture (Peter, 14 Oct).
      const card = this.speakerCards?.pilot, up = card && this.floaties.includes(card);
      // The second line rides on his LEFT as he flies off to the right (Peter, 14 Oct).
      if (this.pilotSaid && !firing && !up && !this.pilotOutSaid) { this.pilotOutSaid = true; this.sayAt('ACK! ACK!', atLeft, 'pilot', 30); }
      else this.trackSpeaker('pilot', this.pilotOutSaid ? atLeft : at);
    } : null);
    // …and the saucer that settles over the finish, once it is hovering: ACK!, then
    // ACK! ACK! a moment later, then a breath, round again for as long as it hovers.
    this.finishAcks = new Set();
    setFinishAckHook(this.stage?.index === 3 ? (t, at) => {
      if (this.paused || this.dead) return;
      const n = Math.floor(t / 2.4), ph = t - n * 2.4;
      const key = ph < 0.45 ? `${n}a` : `${n}b`;
      if (this.finishAcks.has(key)) { this.trackSpeaker('finish', at); return; }
      this.finishAcks.add(key);
      this.sayAt(ph < 0.45 ? 'ACK!' : 'ACK! ACK!', at, 'finish');
    } : null);
    this.gravityFailures ||= new Map();
    this.gravityMissionState = gravityMissionStateFor(this.gravityStageData, this.gravityMissionState);
    this.gravityVacuumCues = { suction: [], load: [], launch: [] };
    this.gravityVacuumShots = [];
    this.gravityGates = null;
    this.gravityLane = 0; this.gravityGate = 0;
    this.gravityTransfer = null; this.gravitySpark = 0;
    this.corridor = this.fitCorridor();
    super.enter();
    this.gravityStageData = gravityStageDataFor(this.stage, GRAVITY_STAGE_DATA, this.layout?.durationSec);
    this.gravityMissionState = gravityMissionStateFor(this.gravityStageData, this.gravityMissionState);
    const speed = this.baseSpeed();
    const xAt = (sec) => gravityWorldX(sec, PLAYER_X, speed);
    this.gravityGates = this.gravityStageData.gates.map((g, index) => ({ ...g, index, x: xAt(g.at) }));
    this.gravityHazards = this.gravityStageData.hazards.map((h) => ({ ...h, x: xAt(h.at) }));
    this.gravityVacuumAttacks = (this.gravityStageData.vacuumAttacks || []).map((a) => ({ ...a, x: xAt(a.at) }));
    this.gravityVacuumDebrisPatches = (this.gravityStageData.debrisPatches || []).map((a) => ({ ...a, x: xAt(a.at) }));
    this.gravityVacuumSweep = vacuumSweepBatches(this.gravityStageData);
    this.gravityHazards = clearOfFrames(withWrongRailBeds(ceilingJumpsOnly(this.gravityHazards), this.gravityGates,
      this.totalDist, speed, this.gravityStageData.debrisRail,
      this.gravityVacuumAttacks.map(a => ({ lane: a.sourceLane,
        left: xAt(a.at - VACUUM_PREP_SECONDS + .25) + vacuumShotAheadForView(480 / 2.2) - 59 - 28,
        right: xAt(a.at - VACUUM_PREP_SECONDS + .25) + vacuumShotAheadForView(480) - 59 + 28 }))
        .concat(this.gravityVacuumDebrisPatches.filter(a => a.id.startsWith('gate-rubbish-')).map(a => ({ lane: a.lane,
          left: a.x - 28, right: a.x + 28 })))), speed);
    // A dropped cube group needs its own jump and landing. Keep ordinary deck
    // props out of that space at both portrait and desktop robot positions.
    const cubeAhead = [vacuumShotAheadForView(480 / 2.2), vacuumShotAheadForView(480)];
    this.gravityHazards = this.gravityHazards.filter(h => !h.id.startsWith('cleaner-deck-')
      || !this.gravityVacuumAttacks.some(a => a.lane === h.lane && cubeAhead.some(ahead => {
        const first = xAt(a.at) + ahead;
        const last = first + ((a.count || 1) - 1) * 24 + OBSTACLES.vacuumShot.w;
        const hazardRight = h.x + (OBSTACLES[h.type]?.w || 16);
        return h.x < last + 85 && hazardRight > first - 85;
      })));
    // Leave the authored short live wires in place and remove only litter
    // patches whose loose pieces would sit directly on a hazard.
    this.gravityVacuumDebrisPatches = this.gravityVacuumDebrisPatches.filter(p =>
      !this.gravityHazards.some(h => h.lane === p.lane && p.x + 28 > h.x
        && p.x - 28 < h.x + (h.span ? h.span * speed : 16)));
    // A few coins are mixed into the fixed rubbish. Their eject position is
    // tied to the source patch, so changing viewport width only changes when
    // the brush reaches them, not where the reward lands in the room.
    this.gravityVacuumBonusCoins = this.gravityVacuumDebrisPatches.filter(p => p.bonusCoin)
      .map(p => ({ id: p.id, sourceX: p.x, sourceLane: p.lane,
        lane: 1 - p.lane, landingX: p.x + 35 + speed * .65 }))
      .filter(coin => this.activeLaneAt(coin.landingX) === coin.lane
        && (coin.landingX - PLAYER_X - vacuumShotAheadForView(480 / 2.2)) / speed
          < (this.gravityStageData.vacuumDepartAt ?? this.gravityStageData.sequences.at(-1).end) - .5
        && !this.gravityGates.some(g => Math.abs(g.x - L.arrowLeftOffset - coin.landingX) < speed * 1.25)
        && !this.gravityHazards.some(h => h.lane === coin.lane
          && coin.landingX > h.x - 45
          && coin.landingX < h.x + (h.span ? h.span * speed : OBSTACLES[h.type]?.w || 16) + 45)
        && !this.gravityVacuumAttacks.some(a => a.lane === coin.lane
          && cubeAhead.some(ahead => coin.landingX > xAt(a.at) + ahead - 50
            && coin.landingX < xAt(a.at) + ahead + ((a.count || 1) - 1) * 24
              + OBSTACLES.vacuumShot.w + 50)));
    this.gravitySpawned = new Set();
    this.obstacles = []; this.pickups = [];
    this.spawner.fill = () => this.fillGravityEntities();
    this.style = {
      ...this.style, name: 'gravity', lightBg: this.spaceLook?.lightBg ?? false, smoothMotion: true,
      heroShadow: false, bgPan: 0, ownSurface: true, noTerrain: true, coversFrame: true,
      bg: c => { c.fillStyle = this.spaceLook?.bg ?? '#0b1723'; c.fillRect(0, 0, W, H); },
      ground: (c, cam, cab, obs, cuts, t, view) => {
        const z = this.camZoom, floor = screenYFor(GROUND_Y, z, this.camPan, this.camFloorY);
        c.save(); c.translate(0, GROUND_Y);
        // Where the room is on the canvas, so a speaker outside can be found in the
        // world (sayAt).
        this._roomM = typeof c.getTransform === 'function' ? c.getTransform() : null; this._roomCam = cam;
        const room = { cam, view: view + 60,
          top: -floor / z - 20, bottom: (H - floor) / z + 20,
          // The scenery clock, not the gameplay one: tRun stops when the finish
          // hold starts, and everything outside froze mid-gesture (Peter, 13 Oct).
          time: this.backgroundT ?? t, gates: this.gravityGates, hintGates: this.gravityHints(), length: this.totalDist, stage: this.stage?.index ?? 1, lane: this.gravityLane ?? 0, gateLane: this.activeLaneAt(cam + view * 0.55), finishCam: this.finishCameraX(),
          holdT: this.finishing || this.finished ? (this.backgroundT ?? t) - (this._finishBgT ??= this.backgroundT ?? t) : (this._finishBgT = null, 0),
          speed: this.baseSpeed(), finishLine: this.finishWorldX() - this.finishCameraX(),
          portrait: !!(this.portraitGameplay && isPhonePortraitPresentation()) };
        // The room art is authored at 137 high: draw it scaled to the corridor,
        // with every horizontal quantity divided through so gates and windows
        // still land on their world x.
        const k = this.corridor / 137, scaled = { ...room, cam: cam / k, view: room.view / k, top: room.top / k, bottom: room.bottom / k,
          gates: this.gravityGates.map((g) => ({ ...g, x: g.x / k })), length: this.totalDist / k,
          finishCam: this.finishCameraX() / k, speed: this.baseSpeed() / k, finishLine: room.finishLine / k };
        c.save(); c.scale(k, k);
        if (this.spaceLook) drawSpaceRoom(c, this.spaceLook, scaled); else drawGravityRoom(c, scaled);
        c.restore();
        // On the scenery clock: tRun is held through the intro, which left the
        // bolts frozen until the run started (Peter, 13 Oct).
        if (this.gravityStageData.floatingBolts) {
          drawFloatingBolts(c, cam, view, this.backgroundT ?? t, this.corridor);
        }
        if (this.gravityStageData.sequences) {
          const seconds = this.gravityTravelTime();
          const playerWorld = this.playerWorldX();
          const pendingGate = this.gravityGates.find(g => g.lane !== this.gravityLane
            && g.x - L.arrowLeftOffset >= playerWorld
            && g.x - L.arrowLeftOffset <= playerWorld + speed * .4);
          const flipPrep = this.gravityTransfer ? 1 : pendingGate
            ? Math.max(0, Math.min(1, 1 - (pendingGate.x - L.arrowLeftOffset - playerWorld) / (speed * .4))) : 0;
          drawMaintenanceVacuum(c, {
            view, time: t, seconds, corridor: this.corridor,
            playerX: this.playerWorldX() - cam,
            lane: this.gravityLane, flip: this.gravityTransfer, flipPrep,
            debrisPatches: this.gravityVacuumDebrisPatches.map(a => ({ ...a, x: a.x - cam })),
            bonusCoins: this.gravityVacuumBonusCoins.map(a => ({ ...a,
              sourceX: a.sourceX - cam, landingX: a.landingX - cam,
              ejectAt: (a.landingX - PLAYER_X - this.vacuumShotAhead()) / speed })),
            sweep: this.gravityVacuumSweep.filter(a => {
              const source = xAt(a.at) + this.vacuumShotAhead() - 59;
              return !this.gravityHazards.some(h => h.bed && h.lane === a.sourceLane
                && source + 28 > h.x && source - 28 < h.x + h.span * speed);
            }).map(a=>({ ...a,
              sourceX: xAt(a.at) + this.vacuumShotAhead() - 59 - cam })),
            attacks: (this.gravityVacuumAttacks || []).map((a) => ({ ...a, ...vacuumAttackPhase(a, seconds),
              sourceX: a.sourceX - cam,
              sourceVisible: seconds >= a.at - VACUUM_PREP_SECONDS - VACUUM_SOURCE_LEAD_SECONDS })),
            sequences: this.gravityStageData.sequences,
            departAt: this.gravityStageData.vacuumDepartAt,
          });
        }
        c.restore();
      },
      post: () => {},
    };
    this.updateCamera();
    this.positionVacuumAttackLaunches();
    this.fillGravityEntities();
    this.resetRenderInterpolation();
  }
  vacuumShotAhead() { return vacuumShotAheadForView(W / (this.camZoom || 1)); }
  positionVacuumAttackLaunches() {
    const shotAhead = this.vacuumShotAhead();
    (this.gravityVacuumAttacks || []).forEach((attack, index) => {
      if (this.gravitySpawned?.has(`vacuum-${index}`)) return;
      attack.x = gravityWorldX(attack.at, PLAYER_X, this.baseSpeed()) + shotAhead;
      // A fixed patch on the opposite surface passes under the brush early in
      // suction. It moves with the room, never along with the hovering robot.
      attack.sourceX = gravityWorldX(attack.at - VACUUM_PREP_SECONDS + .25, PLAYER_X, this.baseSpeed())
        + shotAhead - 59;
    });
  }
  fillGravityEntities() {
    this.gravityHazards.forEach((h, index) => {
      const key = `hazard-${index}`;
      if (this.gravitySpawned.has(key)) return;
      this.gravitySpawned.add(key);
      const ob = makeObstacle(h.type, h.x);
      if (h.span) ob.w = h.span * this.baseSpeed();
      // Tall beds (the 22-high rollers) come down with the corridor: the arcs over
      // them are 0.63 the height they were, the airtime the same.
      if (ob.h > 16) ob.h = 16;
      if (h.x + ob.w < this.playerWorldX() - 20) return;
      ob.gravityAuthoredId = h.id;
      ob.gravityAt = h.at;
      // The station's moving equipment is not a shooting puzzle. Keep these
      // physical hazards solid and armored so every hero reads the same route.
      ob.def = { ...ob.def, armored: true, breakable: false };
      if (h.lane) { ob.alt = this.corridor - ob.alt - ob.h; ob.gravityCeiling = this.corridor; }
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
        if (this.activeLaneAt(x)) { coin.alt = this.corridor - coin.alt - coin.h; coin.gravityCeiling = this.corridor; }
        this.pickups.push(coin);
      }
    });
    for(const bonus of this.gravityVacuumBonusCoins || []) {
      const key=`bonus-${bonus.id}`;
      const ejectAt=(bonus.landingX - PLAYER_X - this.vacuumShotAhead()) / this.baseSpeed();
      if(this.gravitySpawned.has(key) || this.gravityTravelTime()<ejectAt) continue;
      this.gravitySpawned.add(key);
      const coin=makePickup('coin',bonus.landingX,8);
      coin.gravityVacuumBonus=true;
      if(bonus.lane) { coin.alt=this.corridor-coin.alt-coin.h; coin.gravityCeiling=this.corridor; }
      this.pickups.push(coin);
    }
    (this.gravityStageData.coinArcs || []).forEach((arc, index) => {
      const key = `coin-arc-${index}`;
      if (this.gravitySpawned.has(key)) return;
      this.gravitySpawned.add(key);
      // Match the current hero's real jump launch and the cabinet's gravity.
      // Altitude is the coin's bottom edge; nudge it into the hero's body so
      // collecting the trail follows the feet through the same curve.
      const gravityScale = this.gravityScale() * this.powerups.gravityMultiplier();
      const launch = jumpV(this.player.hero) * floatLaunch(gravityScale)
        * (this.gravityStageData.jumpHeightScale || 1) * this.jumpScaleK();
      const gravity = this.player.gravity * gravityScale;
      for (let n = 0; n < arc.count; n++) {
        const t = n * arc.step;
        const x = gravityWorldX(arc.at + t, PLAYER_X, this.baseSpeed());
        if (x + 8 < this.playerWorldX() - 10) continue;
        const feet = Math.max(0, launch * t - 0.5 * gravity * t * t);
        const coin = makePickup('coin', x, Math.max(8, Math.round(feet - 3)));
        coin.gravityArc = true;
        if (this.activeLaneAt(x)) {
          coin.alt = this.corridor - coin.alt - coin.h;
          coin.gravityCeiling = this.corridor;
        }
        this.pickups.push(coin);
      }
    });
    (this.gravityVacuumAttacks || []).forEach((a, index) => {
      const key = `vacuum-${index}`;
      if (this.gravitySpawned.has(key) || this.gravityTravelTime() < a.at) return;
      this.gravitySpawned.add(key);
      for(let cube=0;cube<(a.count||1);cube++) {
        const launchX=a.x+cube*24;
        const ob = makeObstacle('vacuumShot', launchX);

        ob.gravityAuthoredId = a.id;
        ob.vacuumLaunchAt = a.at;
        ob.vacuumLaunchX = launchX;
        ob.vacuumLane = a.lane;
        ob.vacuumSourceLane = a.sourceLane;
        ob.x = launchX - VACUUM_SHOT_SPEED * (this.gravityTravelTime() - a.at);
        if (ob.x + ob.w < this.camX - 80) continue;
        ob.def = { ...ob.def, armored: true, breakable: false, action: 'jump' };
        if (a.lane) { ob.alt = this.corridor - ob.alt - ob.h; ob.gravityCeiling = this.corridor; }
        (this.gravityVacuumShots ||= []).push(ob);
        this.obstacles.push(ob);
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
    const altitude = gate.lane ? this.corridor - 24 - p.y : p.y;
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
    this.positionVacuumAttackLaunches();
    for (const attack of this.gravityVacuumAttacks || []) {
      if (seconds >= attack.at - VACUUM_PREP_SECONDS && seconds < attack.at
        && !this.gravityVacuumCues.suction.includes(attack.id)) {
        this.gravityVacuumCues.suction.push(attack.id);
        Audio.sfx('vacuumSuck');
      }
      const loadAt = attack.at - VACUUM_WARNING_SECONDS - VACUUM_LOADED_SECONDS;
      if (seconds >= loadAt && seconds < attack.at - VACUUM_WARNING_SECONDS
        && !this.gravityVacuumCues.load.includes(attack.id)) {
        this.gravityVacuumCues.load.push(attack.id);
        Audio.sfx('vacuumLoad');
      }
      const flightSeconds = this.vacuumShotAhead() / (this.baseSpeed() + VACUUM_SHOT_SPEED);
      if (seconds >= attack.at && seconds <= attack.at + flightSeconds
        && !this.gravityVacuumCues.launch.includes(attack.id)) {
        this.gravityVacuumCues.launch.push(attack.id);
        Audio.sfx('vacuumLaunch');
      }
    }
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
    for (const ob of this.gravityVacuumShots || []) {
      const age = seconds - ob.vacuumLaunchAt;
      ob.x = ob.vacuumLaunchX - VACUUM_SHOT_SPEED * Math.max(0, age);
      // Keep the cube and its trailing dust until they have fully left the camera.
      ob.live = age >= 0 && ob.x + ob.w >= this.camX - 80;
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
  exit() { setBlastHook(null); setShotHook(null); setAckHook(null); setPilotHook(null); setFinishAckHook(null); return super.exit(); }
  update(dt) {
    if (!this.paused && !this.dead) {
      this.gravitySpark = Math.max(0, this.gravitySpark - dt);
      // A speaker who has gone out of the picture is no longer drawn, so nobody
      // tracks his line: take it down rather than leave it pinned to the edge.
      const now = this.backgroundT ?? this.tRun;
      for (const card of Object.values(this.speakerCards || {})) {
        if (card.long && now - (card.seen ?? now) > 0.25) this.floaties = this.floaties.filter((f) => f !== card);
      }
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
      p.x = g.x;
      // Authored alt only staggers them below the cap (92 = right at it).
      const cap = this.rewardAltCap(p.h);
      p.alt = Number.isFinite(g.alt) ? Math.max(8, cap - Math.max(0, 92 - g.alt)) : 8;
      if (this.pickups.some(other => other !== p && other.live && Math.abs(other.x - p.x) < 16)) p.x += 18;
      p.x += paneSlide(p.x, p.x + p.w);
      if (p.def.power) this.drip.notePowerMoved(p.x);
      if (g.lane) { p.alt = this.corridor - p.alt - p.h; p.gravityCeiling = this.corridor; }
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
  // A Martian's line, pinned over him (Peter, 14 Oct: "tied to the martian in the ship
  // and the martian standing … so it's obviously coming from them"). `at` is his
  // place in device pixels (space-life.js speakerAt); the room's transform turns it
  // back into a world x and a screen y. Without one it floats as before.
  // `hold`: seconds up. A long one is a line that rides with its speaker until he
  // leaves the picture (trackSpeaker takes it down then).
  sayAt(text, at, who = null, hold = 1.4) {
    // A background recording has no chatter (floatText draws nothing), so there is
    // no card to pin to the speaker.
    if (this.recordBackground) return;
    const spot = this.speakerSpot(at);
    if (!spot) { this.floatText(text, '#9dff8a'); return; }
    // A new line from the same Martian replaces his last, rather than stacking
    // under it and down over his ship.
    this.floaties = this.floaties.filter((f) => !(f.wx != null && f.text.startsWith('ACK')));
    this.floatText(text, '#9dff8a', { wx: spot.wx, base: spot.y, hold });
    if (who) {
      const card = this.floaties.at(-1);
      card.long = hold > 5; card.free = true; card.seen = this.backgroundT ?? this.tRun;
      (this.speakerCards ||= {})[who] = card;
    }
  }
  // A speaker's card follows him while it is up (a moving ship's line goes with it).
  trackSpeaker(who, at) {
    const card = this.speakerCards?.[who];
    if (!card || !this.floaties.includes(card)) return;
    const spot = this.speakerSpot(at);
    if (!spot) return;
    // Out of the picture, his line goes with him rather than waiting at the edge.
    const view = W / (this.camZoom || 1);
    if (spot.wx < this._roomCam - 30 || spot.wx > this._roomCam + view + 30) { this.floaties = this.floaties.filter((f) => f !== card); return; }
    card.wx = spot.wx; card.y = spot.y; card.seen = this.backgroundT ?? this.tRun;
  }
  // Device pixels (space-life.js speakerAt) to a pinned card's world x and top.
  speakerSpot(at) {
    const m = this._roomM;
    if (!at || !m || typeof m.inverse !== 'function') return null;
    const p = m.inverse().transformPoint({ x: at.x, y: at.y });
    const sy = screenYFor(GROUND_Y + p.y, this.camZoom, this.camPan, this.camFloorY);
    return { wx: this._roomCam + p.x, y: Math.max(30, sy - 18) };
  }
  gravityHints() { return new Set([...this.gravityFailures].filter(([, n]) => n >= 2).map(([i]) => i)); }
  die(msg, cue = true, src = null) {
    if (!this.dead && (src === 'popSpikes' || src === 'floorSaw' || isGateField(src) || src === 'maintenanceRollers' || src === 'railPulse')) {
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
      mission: clone(this.gravityMissionState), vacuumCues: clone(this.gravityVacuumCues) };
  }
  restoreGravity(s) {
    this.gravityLane = s.lane; this.gravityGate = s.gate;
    this.gravityTransfer = s.transfer ? { ...s.transfer } : null;
    this.gravitySpark = s.spark; this.gravitySpawned = new Set(s.spawned);
    if (s.mission) this.gravityMissionState = clone(s.mission);
    this.gravityVacuumCues = s.vacuumCues ? clone(s.vacuumCues) : { suction: [], load: [], launch: [] };
    this.gravityVacuumShots = this.obstacles.filter(e => e.type === 'vacuumShot');
    const ceilingIds = new Set(s.ceilings);
    for (const e of this.obstacles.concat(this.pickups)) if (ceilingIds.has(e.id)) e.gravityCeiling = this.corridor;
    if (this.gravityStageData.sequences) this.mission.count = this.gravityMissionState.completed.length;
  }
  makeSnapshot() { return { ...super.makeSnapshot(), gravity: this.gravitySnapshot() }; }
  restoreSnapshot(s) {
    super.restoreSnapshot(s);
    this.restoreGravity(s.gravity);
    // The shared checkpoint restore discards transient entities. Rebuild the
    // remaining authored lane at its original coordinates and polarity.
    this.obstacles = []; this.pickups = []; this.gravityVacuumShots = []; this.gravitySpawned.clear();
    this.fillGravityEntities();
    this.resetRenderInterpolation();
  }
  writeRewindSnapshot(s) { super.writeRewindSnapshot(s); s.gravity = this.gravitySnapshot(); }
  restoreRewindSnapshot(s) { super.restoreRewindSnapshot(s); this.restoreGravity(s.gravity); }
}
