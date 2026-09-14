import assert from 'node:assert/strict';
import {
  PortraitLab, PORTRAIT_LAB_DEFAULTS, PORTRAIT_LAB_STORAGE_KEY, validatePortraitConfig,
} from '../src/dev/portrait-lab.js';
import { lifecyclePolicy } from '../src/engine/lifecycle.js';
import { RunState, GROUND_Y } from '../src/game/run.js';
import { screenYFor } from '../src/engine/camera.js';
import { HERO_DRAW_H } from '../src/game/draw.js';
import { defaultSettings, defaultSlot } from '../src/engine/save.js';
import { STAGE_BY_ID } from '../src/data/stages.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { frameForViewport, defaultFrame } from '../src/engine/frame.js';
import { PORTRAIT_BACKGROUND_ZOOM } from '../src/engine/frame.js';
import { setPresentationFrame } from '../src/engine/renderer.js';
import { portraitHudLayout } from '../src/game/portrait-layout.js';
import {
  PORTRAIT_GROUND_ANCHOR_RATIO, PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
} from '../src/engine/portrait-geometry.js';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};

const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} ~= ${b}`);

PortraitLab.reset();
assert.deepEqual(PortraitLab.config(), PORTRAIT_LAB_DEFAULTS, 'reset writes the review defaults');
assert.equal(PortraitLab.config().worldZoom, 3.5, 'portrait trades a little sprite scale for runway');
assert.equal(PortraitLab.config().heroAnchorX, 16, 'portrait moves the character column left for runway');
assert.equal(PortraitLab.config().backgroundZoom,
  Math.round(PORTRAIT_BACKGROUND_ZOOM * 100) / 100,
  'portrait keeps backdrop art at the landscape physical scale and crops the view');
assert.equal(PortraitLab.config().cloudOffsetY, -100, 'the portrait review keeps the selected cloud lift');
assert.equal(PortraitLab.config().sunOffsetY, -100, 'the portrait review keeps the selected sun lift');
assert.equal(PortraitLab.config().sceneryOffsetY, -90, 'portrait lifts the mountain backdrop within the taller sky');
assert.equal(PortraitLab.config().groundAnchorRatio, PORTRAIT_GROUND_ANCHOR_RATIO,
  'portrait production requests the chat-clearing ground floor');

values.set(PORTRAIT_LAB_STORAGE_KEY, '{bad json');
assert.deepEqual(PortraitLab.config(), PORTRAIT_LAB_DEFAULTS, 'corrupt storage falls back');
values.set(PORTRAIT_LAB_STORAGE_KEY, JSON.stringify({ version: 0, worldZoom: 9 }));
assert.deepEqual(PortraitLab.config(), PORTRAIT_LAB_DEFAULTS, 'old records fall back');

values.set(PORTRAIT_LAB_STORAGE_KEY, JSON.stringify({
  version: 1, worldZoom: 9, backgroundZoom: 0, cloudOffsetY: -999, sunOffsetY: 999,
  heroAnchorX: -10, sceneryOffsetY: 999, groundAnchorRatio: 2, session: true, unexpected: 'discard me',
}));
const clamped = PortraitLab.config();
assert.equal(clamped.worldZoom, 4.5, 'world zoom clamps');
assert.equal(clamped.heroAnchorX, 12, 'character anchor clamps');
assert.equal(clamped.backgroundZoom, 1, 'background zoom clamps');
assert.equal(clamped.cloudOffsetY, -100, 'cloud offset clamps');
assert.equal(clamped.sunOffsetY, 60, 'sun offset clamps');
assert.equal(clamped.groundAnchorRatio, PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
  'ground anchor clamps');
assert.equal(clamped.sceneryOffsetY, 40, 'scenery offset clamps');
assert.deepEqual(Object.keys(clamped).sort(), ['backgroundZoom', 'cloudOffsetY', 'groundAnchorRatio', 'heroAnchorX', 'sceneryOffsetY', 'sunOffsetY', 'version', 'worldZoom'],
  'unknown fields are discarded');

PortraitLab.adjust('worldZoom', -99);
close(PortraitLab.config().worldZoom, 1.6, 'fine adjustments persist through the validated store');
PortraitLab.reset();
PortraitLab.setStartPercent(0.5);
PortraitLab.setInvulnerable(true);
assert.deepEqual(PortraitLab.session(), { active: false, startPercent: 0.5, invulnerable: true },
  'session inspection aids stay in memory');
assert.equal(JSON.parse(values.get(PORTRAIT_LAB_STORAGE_KEY)).startPercent, undefined,
  'session fields never persist');
const run = { stage: { id: 'plumber-1' } };
PortraitLab.launch({ run, stage: run.stage, startPercent: 0.5, invulnerable: true });
assert.equal(PortraitLab.allowsPortrait(run), true, 'active run is allowed in portrait');
const last = PortraitLab.returnToMenu('finish');
assert.equal(last.reason, 'FINISH', 'return status is normalized');
assert.equal(PortraitLab.allowsPortrait(run), false, 'return revokes portrait allowance');

assert.equal(validatePortraitConfig({ version: 1, groundAnchorRatio: 0.655 }).groundAnchorRatio, 0.655,
  'ground anchor uses its 0.005 fine step');
assert.equal(validatePortraitConfig({ version: 1, heroAnchorX: 43.6 }).heroAnchorX, 44,
  'character anchor uses whole world pixels');

const regularPortrait = lifecyclePolicy({ isIphone: true, standalone: true, portrait: true });
assert.equal(regularPortrait.paused, true, 'a normal iPhone run remains behind the portrait blocker');
PortraitLab.launch({ run, stage: run.stage });
const labPortrait = lifecyclePolicy({ isIphone: true, standalone: true, portrait: true, allowPortrait: PortraitLab.allowsPortrait(run) });
assert.equal(labPortrait.paused, false, 'an active Portrait Lab run is allowed through the portrait blocker');
PortraitLab.returnToMenu('quit');

const labSave = { slot: defaultSlot(), settings: defaultSettings(), persist() {} };
const stage = STAGE_BY_ID['plumber-1'];
const snapshotSource = { ...PORTRAIT_LAB_DEFAULTS, groundAnchorRatio: 0.655, worldZoom: 2.401 };
const labRun = new RunState({
  stage, cabinet: CABINET_BY_ID[stage.cabinet], save: labSave, seed: 123,
  difficulty: 1, initialHeroId: 'lorenzo', devStartPercent: 0.5, devInvuln: true,
  portraitLabRun: true, devPortraitLab: snapshotSource, onEnd() {},
});
assert.notEqual(labRun.devPortraitLab, snapshotSource, 'a run copies its portrait config at launch');
assert(Object.isFrozen(labRun.devPortraitLab), 'the launch snapshot is frozen');
assert.equal(labRun.devPortraitLab.groundAnchorRatio, 0.655, 'the run keeps the selected ground anchor');
assert.equal(labRun.devStartPercent, 0.5, 'Portrait Lab carries its session start percentage');
assert.equal(labRun.devInvuln, true, 'Portrait Lab carries its session invulnerability');
assert.equal(labRun.rewindFrames.capacity, 150, 'Portrait Lab keeps the full ten-second rewind tape');
assert.equal(labRun.rewindAvailableForRun(), true, 'Portrait Lab enables continuous rewind recording');
const pauseFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, revision: 13,
});
setPresentationFrame(pauseFrame);
const portraitPause = labRun.portraitPauseButtons();
assert.equal(portraitPause.length, 2, 'portrait pause exposes CONTINUE and BACK plates');
assert.ok(portraitPause[0].h >= 56, 'portrait pause plates use a thumb-sized height');
assert.ok(portraitPause[0].w > 180, 'portrait pause plates use the available safe-frame width');
assert.ok(portraitPause[0].y > 800, 'portrait pause plates sit in the lower safe frame');
for (const button of portraitPause) {
  assert.ok(button.x >= pauseFrame.safeRect.left, `${button.id} clears the left safe edge`);
  assert.ok(button.x + button.w <= pauseFrame.safeRect.right, `${button.id} clears the right safe edge`);
  assert.ok(button.y + button.h <= pauseFrame.safeRect.bottom, `${button.id} clears the bottom safe edge`);
}
labRun.beatLock = true;
const syncButtons = labRun.portraitPauseSyncButtons(portraitPause);
assert.equal(syncButtons.length, 3, 'beat pause keeps all three audio-sync controls');
assert.ok(syncButtons.every((button) => button.y < portraitPause[0].y),
  'audio-sync controls sit above the main pause plates');
setPresentationFrame(pauseFrame);
labRun.camZoom = 1.5;
labRun.camPan = 12;
labRun.camFloorY = 80;
labRun.camX = 0;
labRun.save = labSave;
labRun.player = { y: 0, grounded: true, vy: 0 };
labRun.route = null;
labRun.portraitSurfaceBounds = labRun.portraitWorldBounds({ includeTunnel: false });
labRun.portraitBounds = labRun.portraitWorldBounds();
labRun.portraitSurfaceFloorY = labRun.playerGroundY();
labRun.updateCamera(1 / 60);
assert.equal(labRun.camZoom, labRun.devPortraitLab.worldZoom, 'portrait lab keeps a fixed camera zoom');
assert.equal(labRun.camPan, labRun.portraitFrameFitState.pan,
  'portrait lab applies the fixed surface framing target immediately');
assert.ok(Number.isFinite(labRun.portraitFrameFitState?.pan), 'portrait lab exposes the live framing target');
// The composition RESTS ON THE PUBLISHED FRAME. portraitGeometry has already
// solved the ground anchor for the handset and clamped it clear of the chat
// card; solving it again here panned the ground back down by exactly the
// clamped amount (51.4px on a 390x844 phone), which spent the bottom of the
// frame on empty ground. So the resting pan is zero, and the hero's own floor
// stays resolved for updateCamera's edge correction rather than becoming the
// resting target.
assert.equal(labRun.portraitFrameFitState.pan, labRun.portraitFrameFitState.restingPan,
  'portrait composition rests on the published frame, not on a distant route envelope');
assert.equal(labRun.portraitFrameFitState.restingPan, 0,
  'and that resting pan is zero: the frame already carries the ground anchor');
assert.ok(Number.isFinite(labRun.portraitFrameFitState.heroPan),
  'the hero-floor pan stays resolved for the edge correction to reach for');
assert.notEqual(labRun.portraitFrameFitState.pan, labRun.portraitFrameFitState.maxPan,
  'and it is not the level envelope either');
assert.equal(labRun.camFloorY, 232, 'portrait lab keeps the authored base floor visible');
const fixedPan = labRun.portraitFrameFitState.pan;
labRun.player.y = 230;
labRun.updateCamera(1 / 60);

// The correction fires when the drawn hero would actually leave the picture,
// not at a fixed altitude: the resting pan is now zero, so a jump that still
// fits simply does not move the camera. Sweep upward and hold the rule that
// SOME altitude earns a pan, and that it is the edge correction doing it.
// Verified against the live game: pan stays 0 to 120 world units of altitude,
// then rises (102.6 at 180, 277.6 at 230) and parks the hero's crown just
// below the HUD.
let earned = null;
for (const alt of [120, 180, 230, 300, 380]) {
  labRun.player.y = alt;
  labRun.updateCamera(1 / 60);
  if (labRun.portraitFrameFitState.pan > fixedPan) { earned = { alt, pan: labRun.portraitFrameFitState.pan }; break; }
}
assert.ok(earned,
  'portrait edge correction makes room once a jump reaches the HUD band');
assert.ok(labRun.portraitFrameFitState.edgeActive,
  'and it is the edge correction that did it, not the resting composition');
assert.ok(labRun.portraitFrameFitState.pan <= fixedPan + pauseFrame.height,
  'portrait HUD edge correction remains bounded to one logical frame');
const highHeroTop = screenYFor(labRun.playerGroundY() - labRun.player.y - HERO_DRAW_H,
  labRun.camZoom, labRun.camPan, labRun.camFloorY);
const highHeroBottom = screenYFor(labRun.playerGroundY() - labRun.player.y,
  labRun.camZoom, labRun.camPan, labRun.camFloorY);
assert.ok(highHeroTop >= labRun.portraitFrameFitState.playableTop - 1e-9,
  'high portrait jumps remain below the centered HUD');
assert.ok(highHeroBottom <= labRun.portraitFrameFitState.playableBottom + 1e-9,
  'high portrait jumps remain above the touch shelf');
assert.equal(labRun.portraitFrameFitState.edgeActive, true,
  'portrait framing reports the active upper-edge correction');
labRun.player.y = 0;
labRun.route = { kind: 'tunnel' };
labRun.playerGroundY = () => 312;
labRun.player.y = 46;
labRun.player.grounded = false;
// The entry is eased now, like every other tunnel pan (the feet clamp is what
// keeps a falling hero out of the shelf), so let it settle before reading the
// composition it arrives at.
for (let i = 0; i < 240 && (i === 0 || labRun.portraitFrameTransition?.active); i++) labRun.updateCamera(1 / 60);
assert.equal(labRun.portraitFrameFitState.branch, 'tunnel-fixed',
  'portrait camera keeps an explicit fixed underground branch');
assert.ok(labRun.portraitFrameFitState.pan < fixedPan,
  'underground content can use the lower edge correction above the touch controls');
assert.ok(labRun.portraitFrameFitState.pan >= fixedPan - pauseFrame.height,
  'underground lower-edge correction remains bounded to one logical frame');
const tunnelHeroTop = screenYFor(labRun.playerGroundY() - labRun.player.y - HERO_DRAW_H,
  labRun.camZoom, labRun.camPan, labRun.camFloorY);
const tunnelHeroBottom = screenYFor(labRun.playerGroundY() - labRun.player.y,
  labRun.camZoom, labRun.camPan, labRun.camFloorY);
assert.ok(tunnelHeroTop >= labRun.portraitFrameFitState.playableTop - 1e-9,
  'underground portrait heroes remain below the centered HUD');
assert.ok(tunnelHeroBottom <= labRun.portraitFrameFitState.playableBottom + 1e-9,
  'underground portrait heroes clear the touch shelf');
assert.equal(labRun.portraitFrameFitState.edgeActive, true,
  'portrait framing reports the active lower-edge correction');
const tunnelPan = labRun.camPan;
labRun.player.y = 80;
labRun.updateCamera(1 / 60);
assert.equal(labRun.camPan, tunnelPan,
  'ordinary underground jumps do not retrigger the lower camera pan');
// The height that genuinely REACHES an edge, which is what this assertion is
// about — and it tracks the HUD, because the HUD is what the hero runs out of
// room against. Every pixel the objective stack moves up gives a jump that much
// more clearance, so this number goes up with it: 200 was too short once the
// scenery row was reclaimed, and 230 became too short when the top clearance
// came down to 20 (measured, see PORTRAIT_HUD_TOP_CLEARANCE_CSS).
labRun.player.y = 300;
labRun.updateCamera(1 / 60);
assert.ok(labRun.camPan > tunnelPan,
  'a tall underground jump gets a bounded visibility correction');
const tunnelJumpTop = screenYFor(labRun.playerGroundY() - labRun.player.y - HERO_DRAW_H,
  labRun.camZoom, labRun.camPan, labRun.camFloorY);
const tunnelJumpBottom = screenYFor(labRun.playerGroundY() - labRun.player.y,
  labRun.camZoom, labRun.camPan, labRun.camFloorY);
assert.ok(tunnelJumpTop >= labRun.portraitFrameFitState.playableTop - 1e-9,
  'a tall underground jump stays below the portrait HUD');
assert.ok(tunnelJumpBottom <= labRun.portraitFrameFitState.playableBottom + 1e-9,
  'a tall underground jump stays above the portrait touch shelf');
const panBeforeTunnelExit = labRun.camPan;
labRun.route = null;
labRun.playerGroundY = () => 232;
labRun.player.y = 0;
labRun.updateCamera(1 / 60);
assert.ok(Math.abs(labRun.camPan - fixedPan) < Math.abs(tunnelPan - fixedPan),
  'leaving underground eases toward the surface composition');
assert.equal(labRun.portraitFrameTransition?.kind, 'tunnel',
  'underground exit uses the slower tunnel transition');
const tunnelExitStep = Math.abs(labRun.camPan - panBeforeTunnelExit);
const tunnelExitDistance = Math.abs(fixedPan - panBeforeTunnelExit);
assert.ok(tunnelExitStep <= Math.max(12, tunnelExitDistance * 0.10),
  `underground exit limits its first pan step (${tunnelExitStep.toFixed(1)}px)`);
let previousExitPan = labRun.camPan;
for (let i = 0; i < 179; i++) {
  labRun.updateCamera(1 / 60);
  assert.ok(Math.abs(labRun.camPan - previousExitPan)
    <= Math.abs(fixedPan - previousExitPan) + 1e-9,
  'underground exit moves toward the surface target without a snap');
  previousExitPan = labRun.camPan;
}
// The eased return lands on the live surface target, which is recomputed every
// tick from the HUD layout; a sub-hundredth difference from the pan captured
// before the descent is the easing parking, not a composition that failed to
// return. What matters is that it arrives and stays.
assert.ok(Math.abs(labRun.camPan - fixedPan) < 0.05,
  `leaving underground eventually returns to the surface composition (${labRun.camPan.toFixed(3)} vs ${fixedPan.toFixed(3)})`);

// The same contract must hold for an ordinary shipped run, not only for the
// lab snapshot above. Its config comes from the approved production defaults,
// and an airborne hero must not move the surface composition.
setPresentationFrame(pauseFrame);
const productionRun = new RunState({
  stage, cabinet: CABINET_BY_ID[stage.cabinet], save: labSave, seed: 321,
  difficulty: 1, initialHeroId: 'lorenzo', onEnd() {},
});
productionRun.camX = 0;
productionRun.camPan = 0;
productionRun.camFloorY = 80;
productionRun.camZoom = 1;
productionRun.player = { y: 0, grounded: true, vy: 0 };
productionRun.route = null;
productionRun.portraitSurfaceBounds = productionRun.portraitWorldBounds({ includeTunnel: false });
productionRun.portraitBounds = productionRun.portraitWorldBounds();
productionRun.portraitSurfaceFloorY = productionRun.playerGroundY();
productionRun.updateCamera(1 / 60);
const productionPan = productionRun.camPan;
assert.equal(productionRun.portraitConfig().worldZoom, PORTRAIT_LAB_DEFAULTS.worldZoom,
  'ordinary portrait gameplay uses the approved production calibration');
assert.equal(productionRun.portraitConfig().backgroundZoom, PORTRAIT_LAB_DEFAULTS.backgroundZoom,
  'ordinary portrait gameplay uses the landscape-scale backdrop calibration');
// At the chat-clearing groundline, ordinary jumps use the spare sky below the actual
// HUD rather than the decorative breathing gap. Higher jumps are allowed to
// use the bounded correction exercised by the lab run above.
productionRun.player.y = 10;
productionRun.updateCamera(1 / 60);
assert.equal(productionRun.camPan, productionPan,
  'ordinary portrait gameplay does not pan for a normal jump');
productionRun.player.y = 80;
productionRun.updateCamera(1 / 60);
assert.equal(productionRun.camPan, productionPan,
  'ordinary portrait gameplay uses the available sky before panning');

// The same lower shelf contract is checked on a short 375x812 portrait frame,
// both on the flat lane and on a materially raised path. This catches the
// tunnel/route cases where a camera target can otherwise be correct in theory
// but still place the hero's feet into the reserved message shelf for a tick.
const shortPortraitFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 375, viewportHeight: 812,
  safeInsets: { top: 47, right: 0, bottom: 21, left: 0 }, revision: 14,
});
setPresentationFrame(shortPortraitFrame);
const shortHud = portraitHudLayout(shortPortraitFrame);
productionRun.route = null;
productionRun.player = { y: 0, grounded: true, vy: 0 };
productionRun.camPan = 0;
productionRun.camFloorY = 80;
productionRun.camZoom = 1;
productionRun.portraitFrameFitState = null;
productionRun.portraitFrameTransition = null;
productionRun.portraitSurfaceBounds = productionRun.portraitWorldBounds({ includeTunnel: false });
productionRun.portraitBounds = productionRun.portraitWorldBounds();
productionRun.portraitSurfaceFloorY = productionRun.playerGroundY();
for (let i = 0; i < 8; i++) {
  productionRun.updateCamera(1 / 60);
  const flatFeet = screenYFor(productionRun.playerGroundY(), productionRun.camZoom,
    productionRun.camPan, productionRun.camFloorY);
  assert.ok(flatFeet <= shortHud.gameplayBottom + 1e-9,
    'flat 375x812 portrait feet stay above the message shelf on every tick');
}
productionRun.route = { kind: 'fork', sky: true };
productionRun.groundYAt = () => GROUND_Y;
productionRun.playerGroundY = () => GROUND_Y - 120;
for (let i = 0; i < 60; i++) {
  productionRun.updateCamera(1 / 60);
  const raisedFeet = screenYFor(GROUND_Y - 120, productionRun.camZoom,
    productionRun.camPan, productionRun.camFloorY);
  assert.ok(raisedFeet <= shortHud.gameplayBottom + 1e-9,
    'raised 375x812 portrait feet stay above the message shelf on every tick');
}
setPresentationFrame(pauseFrame);

// A materially raised route is a new resting composition, not a jump that
// should leave the hero at the bottom of a tall portrait frame. It must move
// the active route into the gameplay band, then return smoothly to the normal
// ground composition when the hero leaves it.
const highPathRun = new RunState({
  stage, cabinet: CABINET_BY_ID[stage.cabinet], save: labSave, seed: 323,
  difficulty: 1, initialHeroId: 'lorenzo', portraitLabRun: true,
  devPortraitLab: PORTRAIT_LAB_DEFAULTS, onEnd() {},
});
highPathRun.camX = 0;
highPathRun.camPan = 0;
highPathRun.camFloorY = 80;
highPathRun.camZoom = 1;
highPathRun.player = { y: 0, grounded: true, vy: 0 };
highPathRun.route = null;
highPathRun.portraitSurfaceBounds = highPathRun.portraitWorldBounds({ includeTunnel: false });
highPathRun.portraitBounds = highPathRun.portraitWorldBounds();
highPathRun.portraitSurfaceFloorY = GROUND_Y;
highPathRun.updateCamera(1 / 60);
const surfacePanBeforeHighPath = highPathRun.camPan;
highPathRun.route = { kind: 'fork', sky: true };
highPathRun.groundYAt = () => GROUND_Y;
highPathRun.playerGroundY = () => GROUND_Y - 120;

// Stage 2 camera rule: merely overlapping a high route during a jump must not
// claim the raised composition. The available sky remains usable until the
// hero actually lands on the route.
highPathRun.player.grounded = false;
highPathRun.player.y = 32;
highPathRun.playerGroundY = () => GROUND_Y - 60;
highPathRun.updateCamera(1 / 60);
assert.equal(highPathRun.portraitFrameFitState.highPath, false,
  'airborne overlap does not claim the high-path composition');
assert.ok(Math.abs(highPathRun.camPan - surfacePanBeforeHighPath) < 1e-9,
  'airborne overlap leaves the resting camera parked');

// PLENTY OF CLEARANCE IS NOT A HIGH PATH. Standing on a sixty-pixel island the
// hero is higher in the frame and the lane is where it always is; the band
// still has room above his crown, so nothing moves. Reframing this dragged the
// world down and filled the bottom of the phone with ground.
highPathRun.player.grounded = true;
highPathRun.player.y = 0;
highPathRun.updateCamera(1 / 60);
assert.equal(highPathRun.portraitFrameFitState.highPath, false,
  'a raised route with room above the hero is not a high-path composition');
assert.ok(Math.abs(highPathRun.camPan - surfacePanBeforeHighPath) < 1e-9,
  'and the resting camera stays parked on it');
// Only a route that would push his crown past the top of the band earns it.
highPathRun.playerGroundY = () => GROUND_Y - 200;
highPathRun.updateCamera(1 / 60);
const highPathTarget = highPathRun.portraitFrameFitState.pan;
assert.ok(Math.abs(highPathRun.camPan - surfacePanBeforeHighPath)
  < Math.abs(highPathTarget - surfacePanBeforeHighPath),
  'high-path reframe starts as a transition instead of snapping on its first tick');
let previousHighPathPan = highPathRun.camPan;
for (let i = 0; i < 119; i++) {
  highPathRun.updateCamera(1 / 60);
  assert.ok(Math.abs(highPathRun.camPan - previousHighPathPan)
    <= Math.abs(highPathTarget - previousHighPathPan) + 1e-9,
  'high-path reframe moves toward its live target on every tick');
  previousHighPathPan = highPathRun.camPan;
}
const highPathFeet = screenYFor(GROUND_Y - 200, highPathRun.camZoom,
  highPathRun.camPan, highPathRun.camFloorY);
const highPathEdges = highPathRun.portraitFrameFitState;
const highPathRatio = (highPathFeet - highPathEdges.playableTop)
  / (highPathEdges.playableBottom - highPathEdges.playableTop);
assert.equal(highPathEdges.highPath, true,
  'portrait identifies a materially raised route as a high-path composition');
assert.ok(Math.abs(highPathRun.camPan - surfacePanBeforeHighPath) > 1,
  'portrait reframes the high route instead of preserving the low-ground composition');
assert.ok(highPathRatio > 0.50 && highPathRatio < 0.62,
  `high-path feet sit in the composed gameplay band (${highPathRatio.toFixed(2)})`);
highPathRun.route = null;
highPathRun.playerGroundY = () => GROUND_Y;
const highPathPanBeforeReturn = highPathRun.camPan;
highPathRun.updateCamera(1 / 60);
const returnTarget = highPathRun.portraitFrameFitState.pan;
assert.ok(Math.abs(highPathRun.camPan - highPathPanBeforeReturn)
  < Math.abs(returnTarget - highPathPanBeforeReturn),
  'leaving a high path also starts as a transition instead of snapping');
for (let i = 0; i < 119; i++) highPathRun.updateCamera(1 / 60);
const returnedFeet = screenYFor(GROUND_Y, highPathRun.camZoom,
  highPathRun.camPan, highPathRun.camFloorY);
const returned = highPathRun.portraitFrameFitState;
const baseLaneFeet = screenYFor(GROUND_Y, highPathRun.camZoom,
  surfacePanBeforeHighPath, highPathRun.camFloorY);
const returnedRatio = (returnedFeet - returned.playableTop)
  / (returned.playableBottom - returned.playableTop);
assert.equal(returned.highPath, false,
  'portrait leaves high-path composition when the route ends');
assert.ok(Math.abs(returnedFeet - baseLaneFeet) < 1e-9,
  `portrait returns the base lane to its lower composition (${returnedRatio.toFixed(2)})`);

// A spring road is already a committed high-path choice before the landing
// frame. Portrait should spend that launch time moving toward the raised
// composition, then continue smoothly through the climb instead of starting
// the pan at the lip.
const anticipatedHighPathRun = new RunState({
  stage, cabinet: CABINET_BY_ID[stage.cabinet], save: labSave, seed: 324,
  difficulty: 1, initialHeroId: 'lorenzo', portraitLabRun: true,
  devPortraitLab: PORTRAIT_LAB_DEFAULTS, onEnd() {},
});
anticipatedHighPathRun.enter();
setPresentationFrame(pauseFrame);
anticipatedHighPathRun.updateCamera(1 / 60);
const anticipatedRoute = anticipatedHighPathRun.routes.find((r) => r.kind === 'fork' && r.spring);
const anticipatedHeroOffset = anticipatedHighPathRun.playerWorldX() - anticipatedHighPathRun.camX;
anticipatedRoute.sprung = true;
anticipatedHighPathRun.camX = anticipatedRoute.x - anticipatedHighPathRun.speed * 0.45 - anticipatedHeroOffset;
anticipatedHighPathRun.route = null;
anticipatedHighPathRun.player.launched = true;
anticipatedHighPathRun.player.grounded = false;
anticipatedHighPathRun.player.y = 40;
anticipatedHighPathRun.player.vy = 120;
anticipatedHighPathRun.updateCamera(1 / 60);
const anticipatedPan = anticipatedHighPathRun.camPan;
assert.equal(anticipatedHighPathRun.portraitFrameFitState.highPath, true,
  'a committed spring launch anticipates the portrait high-path composition');
assert.equal(anticipatedHighPathRun.portraitFrameFitState.highPathAnticipated, true,
  'the early high-path reframe is marked as anticipated before landing');
assert.ok(anticipatedPan > fixedPan,
  `portrait starts the high-path pan during the launch (${anticipatedPan.toFixed(1)} > ${fixedPan.toFixed(1)})`);
assert.ok(anticipatedPan < anticipatedHighPathRun.portraitFrameFitState.pan,
  'the anticipated high-path pan eases toward its target instead of snapping');
anticipatedHighPathRun.route = anticipatedRoute;
anticipatedHighPathRun.player.launched = false;
anticipatedHighPathRun.player.grounded = true;
anticipatedHighPathRun.player.y = 0;
anticipatedHighPathRun.updateCamera(1 / 60);
assert.ok(Math.abs(anticipatedHighPathRun.camPan - anticipatedPan) < 80,
  'landing on the slope does not create a second portrait camera jump');

// A portrait gameplay run must keep the upper-road release continuous too. The
// fixed phone composition made this seam invisible to the landscape camera
// assertions: after a route releases, the hero is airborne above the base lane
// while the road remains in the same frame, so a stale route claim is a visible
// lower-ground flash followed by a snap back to the slab.
const portraitRouteRun = new RunState({
  stage, cabinet: CABINET_BY_ID[stage.cabinet], save: labSave, seed: 322,
  difficulty: 1, initialHeroId: 'lorenzo', portraitLabRun: true,
  devPortraitLab: PORTRAIT_LAB_DEFAULTS, onEnd() {},
});
portraitRouteRun.enter();
portraitRouteRun.introRunning = false;
portraitRouteRun.introFreeze = 0;
portraitRouteRun.zoneCard = null;
portraitRouteRun.rhythmSyncPending = false;
portraitRouteRun.hitstop = 0;
const portraitIsland = portraitRouteRun.routes.find((r) => r.kind === 'island');
const portraitHeroX = portraitRouteRun.playerWorldX() - portraitRouteRun.camX;
portraitRouteRun.camX = portraitIsland.x + portraitIsland.w + 1 - portraitHeroX;
portraitRouteRun.route = portraitIsland;
portraitRouteRun.player.y = 0;
portraitRouteRun.player.vy = 0;
portraitRouteRun.player.grounded = true;
portraitRouteRun.update(1 / 60);
assert.equal(portraitRouteRun.route, null,
  'portrait walking off a slab releases the upper road');
assert.equal(portraitRouteRun.routeReleaseLock, portraitIsland,
  'portrait edge fall locks the released slab out of the landing sweep');
assert.equal(portraitRouteRun.player.grounded, false,
  'portrait walking off a slab starts a fall');
for (let i = 0; i < 60 && !portraitRouteRun.player.grounded; i++) {
  portraitRouteRun.update(1 / 60);
  assert.equal(portraitRouteRun.route, null,
    'portrait falling off a slab never reclaims the upper road');
  if (!portraitRouteRun.player.grounded) {
    assert.equal(portraitRouteRun.routeReleaseLock, portraitIsland,
      'portrait released slab stays locked during descent');
  }
}
assert.equal(portraitRouteRun.player.grounded, true,
  'portrait upper-road release eventually lands on the base lane');
assert.equal(portraitRouteRun.routeReleaseLock, null,
  'portrait landing clears the released-slab lock');

setPresentationFrame(defaultFrame());
labRun.player.y = 0;
labRun.camZoom = 1.5;
for (let i = 0; i < 120; i++) labRun.updateCamera(1 / 60);
assert.ok(Math.abs(labRun.camZoom - 1.6) < 0.001,
  'landscape rotation restores the ordinary landscape framing');
console.log('PORTRAIT LAB CONFIG: PASSED');
