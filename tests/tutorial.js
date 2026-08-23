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

// The cannon reaches the duck band. Every flier that asks to be ducked sits at
// alt 13 now, and the pellet leaves at the hero's own height — without the
// upward reach in updatePellets the shot passes a pixel under the drone the
// shoot section exists to teach, and the section can never be completed.
const cannon = new TutorialState({ onDone: () => {} });
cannon.enter();
cannon.startStep(8);
const droneTarget = cannon.obstacles[0];
assert(droneTarget && droneTarget.type === 'drone' && droneTarget.alt === 13,
  'the shoot section still puts a drone in the duck band');
cannon.player.abilityCd = 0;
cannon.useAbility();
for (let i = 0; i < 600 && !cannon.sawShotDown && cannon.pellets.length; i++) {
  cannon.pellets[0].x += 4;
  cannon.updatePellets(1 / 60);
}
assert(cannon.sawShotDown && !droneTarget.live, 'a standing shot connects with a drone at alt 13');

// The climb is the part you see: by the time the shot arrives it is at the
// drone's middle, not skimming its belly on an invisibly tall hitbox.
const climb = new TutorialState({ onDone: () => {} });
climb.enter();
climb.startStep(8);
climb.obstacles = [];
climb.player.abilityCd = 0;
climb.useAbility();
const shot = climb.pellets[0];
const launchAlt = shot.alt;
const climbTarget = makeObstacle('drone', shot.x + 180);
climb.obstacles = [climbTarget];
let altAtImpact = launchAlt;
for (let i = 0; i < 600 && shot.live; i++) {
  climb.updatePellets(1 / 60);
  if (shot.live) altAtImpact = shot.alt;
}
assert(!climbTarget.live, 'the climbing shot still connects');
assert(altAtImpact > launchAlt + 6,
  'the pellet climbs to meet a drone instead of passing under it');
assert(Math.abs(altAtImpact - (climbTarget.alt + climbTarget.h / 2)) < 1.5,
  'the climb finishes at the drone\'s middle before the shot arrives');

// Nothing pulls a shot DOWN: a crate on the floor is not an aim target, so the
// lemon flies level into it rather than dipping toward the ground first.
const level = new TutorialState({ onDone: () => {} });
level.enter();
level.startStep(8);
level.player.abilityCd = 0;
level.useAbility();
const levelShot = level.pellets[0];
const levelAlt = levelShot.alt;
level.obstacles = [makeObstacle('crate', levelShot.x + 200)];
for (let i = 0; i < 20; i++) level.updatePellets(1 / 60);
assert(levelShot.alt === levelAlt, 'a ground prop never drags the shot down toward it');
level.exit();
climb.exit();

// The reach is a band, not a ceiling lift: a buzzbird at its own default is
// still a jump-and-shoot, which is what keeps the gallery pinning it down.
cannon.sawShotDown = false;
const highBird = makeObstacle('buzzbird', cannon.playerWorldX() + 200);
cannon.obstacles = [highBird];
cannon.player.abilityCd = 0;
cannon.useAbility();
for (let i = 0; i < 600 && cannon.pellets.length; i++) {
  cannon.pellets[0].x += 4;
  cannon.updatePellets(1 / 60);
}
assert(!cannon.sawShotDown && highBird.live,
  'a standing shot still misses a buzzbird at its default height');
cannon.exit();

tutorial.exit();
console.log(failed ? 'TUTORIAL: FAILED' : 'TUTORIAL: PASSED');
process.exit(failed ? 1 : 0);
