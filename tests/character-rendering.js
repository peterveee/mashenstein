// Character rendering contract: playable heroes stay on the native-density
// overlay in every run state, while their shield geometry is finite and stable.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { Player } = await import('../src/game/player.js');
const { HEROES } = await import('../src/data/heroes.js');
const {
  TOON_SPECS, toonEffectEllipse, poseFromPlayer, RUN_HEAD_TURN, drawToon,
  ACTIVE_CELEBRATION_STYLE, ACTIVE_LOCOMOTION_STYLE,
  TITLE_PARADE_ACTIONS, titleParadeAction, transitionCameoAction,
  B33P_TITLE_WINDUP_T, b33pTitleShotPose,
} = await import('../src/sprites/toons.js');
const { initRenderer, blit, bctx, pendingOverlayDrawCount } = await import('../src/engine/renderer.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
initRenderer();

const stage = {
  id: 'character-render-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 17, difficulty: 1, onEnd: () => {} });
run.enter();

function queuedFor(hero, state) {
  // Drain the previous sample. blit() also exercises callback execution, so a
  // broken mirror/camera transform fails the test instead of merely queueing.
  blit();
  run.relay.current = hero.id;
  run.player = new Player(hero.id);
  run.paused = state === 'paused';
  run.dead = state === 'dead';
  run.mirror = state === 'mirrored';
  run.draw(bctx);
  const queued = pendingOverlayDrawCount();
  blit();
  return queued;
}

for (const hero of HEROES) {
  const normal = queuedFor(hero, 'normal');
  const paused = queuedFor(hero, 'paused');
  const dead = queuedFor(hero, 'dead');
  const mirrored = queuedFor(hero, 'mirrored');
  // A live frame queues hero then HUD. Pause/death each add their covering
  // callback after those two; mirroring changes transforms, not layer count.
  assert(normal === 2, `${hero.id} normal queues hero + HUD at native density`);
  assert(paused === 3, `${hero.id} pause cover is queued after hero + HUD`);
  assert(dead === 3, `${hero.id} death cover is queued after hero + HUD`);
  assert(mirrored === 2, `${hero.id} mirrored hero remains on the overlay path`);
}

for (const hero of HEROES) {
  const a = toonEffectEllipse(hero.id);
  const b = toonEffectEllipse(hero.id);
  const values = [a.cx, a.cy, a.rx, a.ry];
  assert(a === b, `${hero.id} reuses one shield envelope across frames`);
  assert(Object.isFrozen(a), `${hero.id} shield envelope cannot be mutated`);
  assert(values.every(Number.isFinite), `${hero.id} shield envelope is finite`);
  assert(a.rx > 0.5 && a.ry > 0.6, `${hero.id} shield envelope keeps a padded air gap`);
}

assert(Object.keys(TOON_SPECS).length === 10, 'head-yaw gallery roster still contains all ten toons');
assert(ACTIVE_CELEBRATION_STYLE === 'reworked', 'results-screen celebrations default to the approved rework');
assert(ACTIVE_LOCOMOTION_STYLE === 'enhanced', 'jump and duck default to the improved motion');
assert(Object.keys(TITLE_PARADE_ACTIONS).length === HEROES.length,
  'title animation catalogue covers every playable hero');
for (const hero of HEROES) {
  const action = titleParadeAction(hero.id, 0.4, 0.5);
  assert(action && Number.isFinite(action.feetLift) && action.pose,
    `${hero.id} title beat comes from the shared gallery/game choreography`);
  drawToon(bctx, hero.id, {
    kind: 'run', grounded: true, phase: 0.3, time: 0.4, menu: true,
    ...action.pose,
  }, 40, 80 - action.feetLift * 60, 60);
  const cameo = transitionCameoAction(hero.id);
  assert(cameo && typeof cameo === 'object', `${hero.id} transition cameo is catalogued`);
}
assert(titleParadeAction('lorenzo', 0.4, 0.5).pose.menuAction === 'wave',
  'Lorenzo title beat uses the updated compact wave');
assert(!titleParadeAction('raymn', 0.4, 0.5).pose.menuAction,
  'Ray M\'N title beat is correctly documented as a rocket-fist toss, not a wave');
const titleAimStart = b33pTitleShotPose(0);
const titleAimMid = b33pTitleShotPose(B33P_TITLE_WINDUP_T / 2);
const titleAimFire = b33pTitleShotPose(B33P_TITLE_WINDUP_T);
assert(titleAimStart.aimAmount === 0 && !titleAimStart.shotFired,
  'B-33P title click starts with the cannon at its running carry');
assert(titleAimMid.aimAmount > 0 && titleAimMid.aimAmount < 1 && !titleAimMid.shotFired,
  'B-33P visibly raises the cannon before firing');
assert(titleAimFire.aimAmount === 1 && titleAimFire.shotFired,
  'B-33P fires only after the cannon reaches its raised aim');
const GALLERY_BODY_DIALS = [
  'torsoWidth', 'waistScale', 'legLength', 'legWidth', 'armLength', 'armWidth',
  'figureScaleX', 'figureScaleY',
];
assert(Object.values(TOON_SPECS).every((spec) =>
  GALLERY_BODY_DIALS.every((key) => !Object.hasOwn(spec, key))),
'gallery body-shape candidates do not alter production specs');

for (const id of Object.keys(TOON_SPECS)) {
  let safe = true;
  try {
    // The dev gallery uses this opt-in pose on real rigs. Exercise several
    // points so every proposed move reaches both its signature and big beat.
    for (const time of [0, 0.65, 1.3, 1.95, 2.55]) {
      drawToon(bctx, id, {
        kind: 'celebrate', time, phase: 0, grounded: true, facing: 1,
        menu: true, celebrateStyle: ACTIVE_CELEBRATION_STYLE,
      }, 40, 80, 60);
    }
  } catch (err) {
    safe = false;
    console.error(err);
  }
  assert(safe, `${id} gallery celebration candidate renders through a full cycle`);
}

for (const id of Object.keys(TOON_SPECS)) {
  let safe = true;
  try {
    for (const motionStyle of ['legacy', ACTIVE_LOCOMOTION_STYLE]) {
      for (const vy of [-460, 0, 460]) {
        drawToon(bctx, id, {
          kind: 'jump', time: 0.3, phase: 0.25, grounded: false, facing: 1,
          vy, motionStyle,
        }, 40, 80, 60);
      }
      drawToon(bctx, id, {
        kind: 'duck', time: 0.3, phase: 0.25, grounded: true, facing: 1,
        vy: 0, motionStyle,
      }, 40, 80, 60);
      if (motionStyle === ACTIVE_LOCOMOTION_STYLE) {
        for (const duckAmount of [0, 0.5, 1]) {
          drawToon(bctx, id, {
            kind: 'duck', time: 0.3, phase: 0.25, grounded: true, facing: 1,
            vy: 0, motionStyle, duckAmount, duckDirection: 1,
          }, 40, 80, 60);
        }
      }
    }
  } catch (err) {
    safe = false;
    console.error(err);
  }
  assert(safe, `${id} legacy and improved jump/duck poses render safely`);
}

const duckTransition = new Player('lorenzo');
const duckInput = (down) => ({ held: (action) => action === 'duck' && down });
duckTransition.update(0.07, duckInput(true), null);
assert(duckTransition.duckAmount > 0 && duckTransition.duckAmount < 1,
  'duck input animates through a partial crouch');
duckTransition.update(0.07, duckInput(true), null);
assert(duckTransition.duckAmount === 1 && poseFromPlayer(duckTransition, 0).kind === 'duck',
  'held duck settles into the planted pose');
duckTransition.update(0.05, duckInput(false), null);
const recoveringPose = poseFromPlayer(duckTransition, 0);
assert(recoveringPose.kind === 'duck' && recoveringPose.duckAmount > 0 && recoveringPose.duckAmount < 1,
  'duck release keeps the recovery animation visible');
duckTransition.update(0.05, duckInput(false), null);
assert(duckTransition.duckAmount === 0 && poseFromPlayer(duckTransition, 0).kind === 'run',
  'duck recovery returns cleanly to the run pose');

for (const hero of HEROES) {
  const player = new Player(hero.id);
  const running = poseFromPlayer(player, 0);
  player.grounded = false;
  const jumping = poseFromPlayer(player, 0);
  player.grounded = true;
  player.ducking = true;
  const ducking = poseFromPlayer(player, 0);
  assert(running.headTurn === RUN_HEAD_TURN, `${hero.id} gets the production treatment while running`);
  assert(jumping.headTurn === 0 && ducking.headTurn === 0,
    `${hero.id} keeps non-run poses front-facing`);
}

const lorenzo = new Player('lorenzo');
lorenzo.powerType = 'stomp';
lorenzo.powerPoseT = 0.2;
const smash = poseFromPlayer(lorenzo, 0);
assert(smash.menuAction === 'smash' && smash.actionTime > 0,
  'grounded Lorenzo drives the hand-registered wrench-smash pose');
lorenzo.grounded = false;
lorenzo.stomping = true;
const stomp = poseFromPlayer(lorenzo, 0);
assert(stomp.stomp && stomp.menuAction !== 'smash',
  'airborne Lorenzo keeps the separate stomp pose');

const b33p = new Player('b33p');
b33p.powerType = 'shoot';
b33p.powerPoseT = 0.24;
const shot = poseFromPlayer(b33p, 0);
assert(shot.menuAction === 'aim' && shot.actionTime > 0,
  'B-33P cannon receives deterministic muzzle-flash and recoil timing');

console.log(failed ? 'CHARACTER RENDERING: FAILED' : 'CHARACTER RENDERING: PASSED');
process.exit(failed ? 1 : 0);
