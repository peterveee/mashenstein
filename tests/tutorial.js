// Tutorial speech keeps Gary's portrait after the introduction without
// repeating the name header, and the compact card still behaves for callers
// that use the original named-speaker shape.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { TutorialState } = await import('../src/game/tutorial.js');
const { drawWorldEntity } = await import('../src/game/draw.js');
const { makeObstacle } = await import('../src/game/entities.js');
// Held as the module, not destructured. ZOOM is a live binding now — the
// resting framing is resolved per device and per setting — and `const { ZOOM }`
// would snapshot whatever it happened to be at import time, then compare the
// tutorial's settled camera against a number the game had already moved on from.
const camera = await import('../src/engine/camera.js');
const { drawSpeech } = await import('../src/game/hud.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

Input.init();
const tutorial = new TutorialState({ onDone: () => {} });
tutorial.enter();
while (tutorial.introPhase === 0) tutorial.update(1 / 60);
assert(tutorial.speech.showName === true, 'Gary is named on the opening card');
assert(tutorial.lastSaid.showName === true, 'the opening name survives into the pause fallback');

tutorial.startStep(0);
assert(tutorial.speech.showName === false, 'section one keeps Gary portrait-only');
const failedObstacle = tutorial.obstacles[0];
tutorial.reopenStep(false);
assert(tutorial.speech.showName === false && tutorial.lastSaid.showName === false,
  'retry speech remains portrait-only, including its pause fallback');
assert(tutorial.retiredObstacles.includes(failedObstacle),
  'a failed attempt keeps its old obstacle as inert scenery');
assert(tutorial.obstacles.length === 1 && tutorial.obstacles[0] !== failedObstacle,
  'a retry can spawn its new active obstacle without erasing the old one');
tutorial.worldX = failedObstacle.x + failedObstacle.w + 9;
tutorial.sweepRetiredEntities();
assert(!tutorial.retiredObstacles.includes(failedObstacle),
  'a retired obstacle is removed only after it has fully cleared the left edge');
tutorial.startStep(2);
const failedPickup = tutorial.pickups[0];
tutorial.reopenStep(false);
assert(tutorial.retiredPickups.includes(failedPickup),
  'a failed attempt keeps its old pickup visible but non-collectible');
tutorial.startStep(6);
const failedPortal = tutorial.portal;
tutorial.reopenStep(true);
assert(tutorial.retiredPortals.includes(failedPortal),
  'a failed portal keeps gliding after its retry appears');
tutorial.sayIn(0, 'QUEUED LINE', 1);
tutorial.update(1 / 60);
assert(tutorial.speech.text === 'QUEUED LINE' && tutorial.speech.showName === false,
  'queued speech does not reintroduce Gary');

tutorial.startStep(7);
assert(tutorial.speech.text.endsWith('THE FORM REQUIRES BOTH.'),
  'double-jump copy states the requirement without claiming a single jump cannot clear it');

tutorial.startStep(11);
tutorial.outro.garyX = 96;
tutorial.update(1 / 60);
assert(tutorial.speech && tutorial.speech.showName === false,
  'epilogue speech does not reintroduce Gary');

function speechContext() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_target, key) => {
      if (key === 'calls') return calls;
      return (...args) => calls.push({ key, args });
    },
    set: () => true,
  });
  return ctx;
}

const namedCtx = speechContext();
drawSpeech(namedCtx, { who: 'lorenzo', text: 'OK' });
const compactCtx = speechContext();
drawSpeech(compactCtx, { who: 'lorenzo', text: 'OK', showName: false });
const namedImages = namedCtx.calls.filter((call) => call.key === 'drawImage').length;
const compactImages = compactCtx.calls.filter((call) => call.key === 'drawImage').length;
const namedArcs = namedCtx.calls.filter((call) => call.key === 'arcTo');
const compactArcs = compactCtx.calls.filter((call) => call.key === 'arcTo');
const namedHeight = namedArcs[1].args[1] - namedArcs[0].args[1];
const compactHeight = compactArcs[1].args[1] - compactArcs[0].args[1];
assert(namedImages > compactImages, 'the default named-speaker card still draws its name');
assert(compactImages > 0, 'a name-hidden card still draws the speaker portrait and body text');
assert(compactHeight < namedHeight, 'hiding the name removes the header row from the card height');

// The last coin extraction gets a clean half-second before the tutorial's
// final death jingle. This is a state timer, not a blocking sleep.
const deathCueTutorial = new TutorialState({ onDone: () => {} });
deathCueTutorial.enter();
deathCueTutorial.clawing = true;
deathCueTutorial.coins = 1;
deathCueTutorial.clawStart = 1;
deathCueTutorial.clawStep = 0.01;
const realSfx = Audio.sfx;
const heard = [];
Audio.sfx = (name) => heard.push(name);
deathCueTutorial.updateClawback(0.01);
assert(!heard.includes('pacDeath'), 'coin extraction does not fire the death cue immediately');
deathCueTutorial.update(0.49);
assert(!heard.includes('pacDeath'), 'death cue remains silent during the half-second pause');
deathCueTutorial.update(0.02);
assert(heard.includes('pacDeath'), 'death cue fires after the extraction pause');
Audio.sfx = realSfx;
deathCueTutorial.exit();

const skippedIntro = new TutorialState({ onDone: () => {} });
skippedIntro.enter();
assert(skippedIntro.camZoom > camera.ZOOM, 'the staged intro starts at its close-up zoom');
skippedIntro.devSkipSection('KeyN');
assert(skippedIntro.camZoom === camera.ZOOM && skippedIntro.introPhase === 4,
  'skipping the intro settles at the normal gameplay zoom');
skippedIntro.exit();

// Tutorial props use the fractional lane position; rounding them to whole
// logical pixels made the 112px/s lane alternate between visibly different
// movement distances at the settled 2x camera.
const motionCalls = [];
const motionCtx = new Proxy({ imageSmoothingEnabled: false }, {
  get: (target, key) => key === 'drawImage'
    ? (...args) => motionCalls.push(args)
    : (key in target ? target[key] : () => {}),
  set: (target, key, value) => { target[key] = value; return true; },
});
drawWorldEntity(motionCtx, makeObstacle('crate', 200), 100.25, 0,
  { smoothMotion: true }, {});
assert(motionCalls.some((args) => Number.isFinite(args[1]) && args[1] % 1 !== 0),
  'tutorial world props retain fractional horizontal positions');

// THE MODULE MAY ONLY TEACH THE CANNON ON SOMETHING THE CANNON CAN SHOOT.
//
// This block used to pin the opposite. The shoot section stood a DRONE in the
// road and the tests below asserted the lemon killed it — which it does here and
// nowhere else in MASHENSTEIN, because RunState.updateProjectiles gates a pellet
// on `(ground || isTarget) && !armored` and a drone is armoured. The gallery
// after it added a buzzbird, which fails the same gate for being a flier. A
// player finished training believing the cannon clears the sky, and stage 1-1
// took it away without explaining why.
//
// So the prop is a `target` and the tutorial's own pellet carries the run's
// gate. What is pinned here is that the two agree — the section is only worth
// having if the thing it teaches survives contact with the game.
const RUN_CAN_SHOOT = (def) => (def.ground || def.isTarget) && !def.armored;

const cannon = new TutorialState({ onDone: () => {} });
cannon.enter();
cannon.startStep(8);
const shootTarget = cannon.obstacles[0];
assert(shootTarget && shootTarget.type === 'target',
  'the shoot section stands a target in the road');
assert(RUN_CAN_SHOOT(shootTarget.def),
  'and it is a prop the REAL cannon can hit — the whole point of the swap');
// Out of reach on foot, which is what makes the cannon the only answer: a 14px
// hero cannot walk into a target at alt 40, so `sawShotDown` cannot be faked by
// running through the challenge.
assert(shootTarget.alt > 14,
  `the target stands clear of a standing hero, so it cannot be walked into (alt ${shootTarget.alt})`);

cannon.player.abilityCd = 0;
cannon.useAbility();
for (let i = 0; i < 600 && !cannon.sawShotDown && cannon.pellets.length; i++) {
  cannon.updatePellets(1 / 60);
}
assert(cannon.sawShotDown && !shootTarget.live,
  'a standing shot connects with the target the section spawns');

// The dive is the part you see: by the time the round arrives it is at the
// target's middle rather than skimming it on an invisibly tall hitbox.
const climb = new TutorialState({ onDone: () => {} });
climb.enter();
climb.startStep(8);
climb.obstacles = [];
climb.player.abilityCd = 0;
climb.useAbility();
const shot = climb.pellets[0];
const launchAlt = shot.alt;
const climbTarget = makeObstacle('target', shot.x + 180);
climb.obstacles = [climbTarget];
let altAtImpact = launchAlt;
for (let i = 0; i < 600 && shot.live; i++) {
  climb.updatePellets(1 / 60);
  if (shot.live) altAtImpact = shot.alt;
}
assert(!climbTarget.live, 'the climbing shot connects with a target at its own alt 40');
assert(altAtImpact > launchAlt + 6,
  'the pellet climbs to meet the target instead of passing under it');
assert(Math.abs(altAtImpact - (climbTarget.alt + climbTarget.h / 2)) < 1.5,
  "the climb finishes at the target's middle before the shot arrives");
climb.exit();

// AND IT STEERS DOWN TOO, which is the half the old rule did not have. A round
// fired off the top of a jump comes down onto what it was fired at — the run
// does this (RunState.homePellet) and the module has to, or the arc a player
// learns here is not the arc they see in a stage.
const dive = new TutorialState({ onDone: () => {} });
dive.enter();
dive.startStep(8);
dive.obstacles = [];
dive.player.abilityCd = 0;
dive.useAbility();
const diveShot = dive.pellets[0];
diveShot.alt = 46;                       // fired from the top of a jump
const crate = makeObstacle('crate', diveShot.x + 200);
dive.obstacles = [crate];
for (let i = 0; i < 600 && diveShot.live; i++) dive.updatePellets(1 / 60);
assert(!crate.live, 'a shot fired from the air comes down onto the crate it was aimed at');
dive.exit();

// THE FLIERS THE GAME REFUSES ARE REFUSED HERE. Both of them, and for the two
// different reasons the run has: the drone is armoured, the buzzbird is a flier
// that is neither `ground` nor `isTarget`. Either one shootable in here is the
// original bug back again.
for (const type of ['drone', 'buzzbird']) {
  const def = makeObstacle(type, 0).def;
  assert(!RUN_CAN_SHOOT(def), `the run's own gate refuses a ${type} (the fact being mirrored)`);
  const range = new TutorialState({ onDone: () => {} });
  range.enter();
  range.startStep(8);
  const flier = makeObstacle(type, range.playerWorldX() + 200);
  flier.alt = 13;                        // the duck band, where the lemon used to reach
  range.obstacles = [flier];
  range.sawShotDown = false;
  range.player.abilityCd = 0;
  range.useAbility();
  for (let i = 0; i < 600 && range.pellets.length; i++) range.updatePellets(1 / 60);
  assert(!range.sawShotDown && flier.live,
    `a lemon does not kill a ${type} in the tutorial either`);
  range.exit();
}
cannon.exit();

// THE GALLERY IS THE SAME PROMISE, three sections later. It used to close the
// module on a drone and a buzzbird — the last two things a player shot before
// being turned loose, and neither of them shootable once they were.
const gallery = new TutorialState({ onDone: () => {} });
gallery.enter();
gallery.spawnShootGallery();
assert(gallery.obstacles.length > 0, 'the gallery lays something to shoot');
for (const ob of gallery.obstacles) {
  assert(RUN_CAN_SHOOT(ob.def),
    `the gallery's ${ob.type} is a prop the real cannon can hit`);
}
gallery.exit();

tutorial.exit();
console.log(failed ? 'TUTORIAL: FAILED' : 'TUTORIAL: PASSED');
process.exit(failed ? 1 : 0);
