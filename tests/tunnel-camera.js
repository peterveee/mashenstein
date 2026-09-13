// TUNNEL CAMERA LOOK-AHEAD.
//
// A tunnel is authored geometry, so the landscape camera knows its lower floor
// before the hero enters the mouth. The camera should begin moving while that
// floor is ahead, move gradually, and have a meaningful amount of the drop
// already paid when the route claim changes from surface to tunnel.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { GROUND_Y, screenYFor, worldYForScreenY, camYFor } = await import('../src/engine/camera.js');
const renderer = await import('../src/engine/renderer.js');
const { H } = renderer;
const { HERO_DRAW_H } = await import('../src/game/draw.js');

save.load();
save.newSlot(0, 0);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const run = new RunState({
  stage: STAGE_BY_ID['plumber-1'], team: ['lorenzo'], save,
  seed: 12345, difficulty: 1, skipRunIn: true, onEnd: () => {},
});
run.enter();

const tunnel = run.routes.find((r) => r.kind === 'tunnel');
assert(!!tunnel, 'the fixture has an authored underground section');

const dt = 1 / 60;
const heroOffset = run.playerWorldX() - run.camX;
const speed = run.speed;
const LOOKAHEAD_SEC = 1.35;
const PREVIEW_MAX_DROP = 36;
const RETURN_DELAY_SEC = 0.35;
const UPPER_PATH_LIFT = 48;
const placeHero = (x) => { run.camX = x - heroOffset; };
const resetCamera = () => {
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
  run.camFloorY = GROUND_Y;
  run.camPan = 0;
  run.camFeetY = null;
};

// The first preview frame is deliberately partial: it is a readable lead-in,
// not a one-frame teleport to the chamber floor.
resetCamera();
placeHero(tunnel.x - speed * LOOKAHEAD_SEC);
run.updateCamera(dt);
const firstPreview = run.camFloorY;
const mouthFloor = run.routeGroundY(tunnel.x, tunnel);
assert(firstPreview > GROUND_Y,
  `the camera starts down before the mouth (${firstPreview.toFixed(2)} > ${GROUND_Y})`);
assert(firstPreview < mouthFloor,
  `the first preview step is gradual (${firstPreview.toFixed(2)} < mouth ${mouthFloor.toFixed(2)})`);
assert(firstPreview <= GROUND_Y + PREVIEW_MAX_DROP,
  `the preview stays shallow (${(firstPreview - GROUND_Y).toFixed(1)}px down)`);

// Let the hero approach without changing route ownership. By the time the
// mouth is reached, the look-ahead has already sampled the deeper section.
let x = tunnel.x - speed * LOOKAHEAD_SEC;
let beforeMouth = firstPreview;
for (let i = 0; i < Math.ceil(LOOKAHEAD_SEC / dt); i++) {
  x += speed * dt;
  placeHero(x);
  run.updateCamera(dt);
  beforeMouth = run.camFloorY;
}
assert(beforeMouth > GROUND_Y + 20,
  `the approach has already revealed the lower section (${beforeMouth.toFixed(1)}px)`);

// Clear the mouth on the upper path. With no live tunnel claim, the camera
// holds the preview for a short beat, then raises the surface framing so the
// hero reads as travelling above the tunnel rather than being pulled into it.
const beforeUpperPath = run.camFloorY;
placeHero(tunnel.x + speed * RETURN_DELAY_SEC * 0.5);
run.player.y = 30;
run.player.vy = -1;
run.player.grounded = false;
run.updateCamera(dt);
const duringUpperPathDelay = run.camFloorY;
assert(duringUpperPathDelay >= beforeUpperPath,
  `the upper path gets a short underground view (${duringUpperPathDelay.toFixed(1)}px)`);
placeHero(tunnel.x + speed * (RETURN_DELAY_SEC + 0.1));
run.updateCamera(dt);
assert(run.camFloorY > duringUpperPathDelay,
  `the upper path raises its framing (${run.camFloorY.toFixed(1)} > ${duringUpperPathDelay.toFixed(1)})`);
for (let i = 0; i < 45; i++) {
  placeHero(tunnel.x + speed * (RETURN_DELAY_SEC + 0.1 + (i + 1) * dt));
  run.updateCamera(dt);
}
assert(run.camFloorY > GROUND_Y + 40,
  `the upper path settles above the normal surface (${run.camFloorY.toFixed(1)}px)`);
const heroScreenY = screenYFor(run.playerGroundY(), run.camZoom, run.camPan, run.camFloorY);
assert(heroScreenY > 115 && heroScreenY < 155,
  `the upper-path hero sits near mid-frame (${heroScreenY.toFixed(1)}px)`);

// Once the tunnel section is over, the elevated presentation target releases
// and the camera starts settling back to the ordinary surface composition.
placeHero(tunnel.x + tunnel.w + speed * (RETURN_DELAY_SEC + 0.1));
run.updateCamera(dt);
const afterSection = run.camFloorY;
assert(afterSection < GROUND_Y + UPPER_PATH_LIFT,
  `the camera starts returning after the section (${afterSection.toFixed(1)}px)`);

// Claim the tunnel at the mouth, as updateRoute does. The hand-off must not
// ask for the old full-depth move in one frame.
placeHero(tunnel.x + 1);
run.route = tunnel;
run.player.y = 0;
run.player.grounded = true;
const beforeClaim = run.camFloorY;
run.updateCamera(dt);
const claimStep = run.camFloorY - beforeClaim;
assert(claimStep < 12,
  `the live tunnel hand-off is still smooth (${claimStep.toFixed(1)}px in one frame)`);

// A jump inside the lower chamber must remain drawable while the anchor is
// still settling. The old framing target eased from the surface rule and could
// leave the hero's crown above the 270px landscape frame for several ticks.
placeHero(tunnel.x + tunnel.w * 0.3);
run.route = tunnel;
run.player.y = 200;
run.player.grounded = false;
run.player.vy = -1;
run.camFloorY = GROUND_Y;
run.camPan = 0;
run.camZoom = 1.6;
run.camFeetY = null;
run.updateCamera(dt);
const jumpFeet = run.playerGroundY() - run.player.y;
const jumpTop = screenYFor(jumpFeet - HERO_DRAW_H, run.camZoom, run.camPan, run.camFloorY);
const jumpBottom = screenYFor(jumpFeet, run.camZoom, run.camPan, run.camFloorY);
assert(jumpTop >= 0,
  `a deep tunnel jump keeps the hero crown in frame (${jumpTop.toFixed(1)}px)`);
assert(jumpBottom <= H,
  `a deep tunnel jump keeps the hero feet in frame (${jumpBottom.toFixed(1)}px <= ${H}px)`);

// The lower fill is painted in world coordinates beneath the camera. With a
// negative portrait pan, the visible screen bottom is farther down in world
// space than H/z, so the old formula stopped early and exposed the wrong
// layer beneath the tunnel. Exercise the inverse used by RunState's render
// path with a real portrait frame and prove the old arithmetic would fail.
const { frameForViewport } = await import('../src/engine/frame.js');
renderer.setPresentationFrame(frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, revision: 22,
}));
const portraitZoom = 2.2;
const portraitPan = -176;
const fixedBottomWorldY = worldYForScreenY(renderer.H, portraitZoom, portraitPan, GROUND_Y) + 8;
const fixedBottomScreenY = screenYFor(fixedBottomWorldY, portraitZoom, portraitPan, GROUND_Y);
assert(fixedBottomScreenY > renderer.H,
  `portrait tunnel fill extends below the screen after pan (${fixedBottomScreenY.toFixed(1)} > ${renderer.H.toFixed(1)})`);
const legacyBottomWorldY = camYFor(portraitZoom, GROUND_Y) + renderer.H / portraitZoom + 8;
const legacyBottomScreenY = screenYFor(legacyBottomWorldY, portraitZoom, portraitPan, GROUND_Y);
assert(legacyBottomScreenY < renderer.H,
  `the old unpanned bottom formula would leave the portrait fill short (${legacyBottomScreenY.toFixed(1)} < ${renderer.H.toFixed(1)})`);

run.portraitGameplay = true;
run.route = null;
run.player.y = 0;
run.player.grounded = true;
run.updateCamera(dt);
const deathPan = run.camPan;
const deathFloor = run.camFloorY;
run.dead = true;
run.deadT = 0;
run.pitDeath = null;
run.player.y = -120;
run.player.vy = -200;
run.player.deathT = 0;
for (let i = 0; i < 12; i++) run.updateDead(dt);
assert(run.camPan === deathPan && run.camFloorY === deathFloor,
  'portrait death does not pan down after a falling hero');
assert(run.player.y < -120 && run.player.deathT > 0 && run.deadT > 0,
  'death motion, face animation and recovery clock continue while the camera stays parked');

console.log(failed ? 'TUNNEL CAMERA: FAILED' : 'TUNNEL CAMERA: PASSED');
process.exit(failed ? 1 : 0);
