// Tutorial speech keeps Gary's portrait after the introduction without
// repeating the name header, and the compact card still behaves for callers
// that use the original named-speaker shape.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { TutorialState } = await import('../src/game/tutorial.js');
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

tutorial.exit();
console.log(failed ? 'TUTORIAL: FAILED' : 'TUTORIAL: PASSED');
process.exit(failed ? 1 : 0);
