// Focused coverage for the randomized jukebox visualizer pack.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { createVisualizer, pickVisualizer, VISUALIZER_NAMES } = await import('../src/engine/visualizers.js');
const { SoundTestState } = await import('../src/game/menus.js');
const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const ctx = document.createElement('canvas').getContext('2d');
const spectrum = new Uint8Array(128);
spectrum.fill(96);
const analysis = {
  spectrum,
  waveform: new Uint8Array(256),
  bass: 0.7,
  mid: 0.45,
  treble: 0.6,
  beat: 4.25,
  beatPhase: 0.25,
  beatPulse: 0.24,
};

for (let i = 0; i < VISUALIZER_NAMES.length; i++) {
  const v = createVisualizer(i, 0x12340000 + i, { bpm: 120 });
  v.update(1 / 60, analysis);
  v.draw(ctx);
  assert(v.name === VISUALIZER_NAMES[i] && v.dust.length >= 96,
    `preset ${i + 1} has the expected name, moving focal point, and particle field`);
}

const kaleido = createVisualizer(4, 0x12345678, { bpm: 120 });
const kaleidoCounts = [];
for (const beat of [0.1, 8.1, 16.1, 24.1, 32.1]) {
  kaleido.update(0, { ...analysis, beat, beatPhase: beat % 1 });
  kaleidoCounts.push(kaleido.symmetry);
}
assert(kaleidoCounts.every((count) => count >= 8 && count <= 24 && count % 2 === 0)
  && new Set(kaleidoCounts).size > 1,
  'kaleidoscope changes between dense and sparse phrase segment counts');

const kaleidoTravel = createVisualizer(4, 0x12345678, { bpm: 120 });
let maxSatelliteRadius = 0;
for (let frame = 0; frame < 300; frame++) {
  const beat = frame / 30;
  kaleidoTravel.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1 });
  for (const satellite of kaleidoTravel.satellites) {
    if (satellite.active) maxSatelliteRadius = Math.max(maxSatelliteRadius, satellite.radius);
  }
}
assert(kaleidoTravel.satellites.every((p) => p.size >= 11) && maxSatelliteRadius > 190,
  'kaleidoscope satellites are larger and travel far enough to brush beyond the screen edge');

const bloom = createVisualizer(7, 0x0badcafe, { bpm: 120 });
let minBloomScale = Infinity;
let maxBloomScale = 0;
let bloomWaitScale = 0;
for (let frame = 0; frame < 1440; frame++) {
  const beat = frame / 30;
  bloom.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1 });
  minBloomScale = Math.min(minBloomScale, bloom.bloomScale);
  maxBloomScale = Math.max(maxBloomScale, bloom.bloomScale);
  if (frame === 720) bloomWaitScale = bloom.bloomScale;
}
assert(minBloomScale < 1 && maxBloomScale > 3 && bloomWaitScale < 1,
  'singularity bloom zooms out and back in over four bars, then waits through the rest of its cycle');

const bubblestorm = createVisualizer(14, 0x12344321, { bpm: 120 });
bubblestorm.update(0.5, analysis);
assert(bubblestorm.name === 'CHROMA BUBBLESTORM' && bubblestorm.orbs.length === 84,
  'chroma bubblestorm reworks prismatic storm as a circular orb field');

const reactor = createVisualizer(3, 0x22446688, { bpm: 120 });
reactor.update(0.5, { ...analysis, beat: 32.25, beatPhase: 0.25 });
const reactorXs = reactor.reactors.map((p) => p.x);
reactor.update(2, { ...analysis, beat: 32.25, beatPhase: 0.25 });
assert(reactor.reactors.length === 3 && reactor.reactors.filter((p) => p.active).length === 3
  && reactor.reactors[0].x === reactor.focusX && reactor.reactors[0].y === reactor.focusY
  && reactor.reactors.slice(1).some((p, i) => p.x !== reactorXs[i + 1]),
  'monster reactor keeps one core central while up to two others cross beyond the screen');

const gallery = createVisualizer(12, 0x2468ace0, { bpm: 120 });
gallery.update(1 / 60, analysis);
gallery.draw(ctx);
const heroClocks = gallery.heroes.map((hero) => hero.animClock);
const worldXs = gallery.galleryWorlds.map((world) => world.x);
const floorTread = gallery.floorTread;
gallery.update(0.5, analysis);
gallery.draw(ctx);
assert(gallery.artifacts.length >= 40 && gallery.heroes.length === 8
  && gallery.artifacts.filter((p) => p.asset === 'coin').length === 66
  && gallery.artifacts.filter((p) => p.asset === 'coin').every((p) => p.w === 10 && p.h === 10)
  && gallery.artifacts.filter((p) => p.asset === 'coin').every((p) => p.coinRain && p.rotation === 0 && Number.isFinite(p.coinFlip))
  && gallery.artifacts.filter((p) => p.asset === 'coin').some((p) => Math.abs(Math.cos(p.coinFlip)) < 0.9)
  && Math.max(...gallery.artifacts.filter((p) => p.asset === 'coin').map((p) => Math.abs(p.rainSpin)))
    - Math.min(...gallery.artifacts.filter((p) => p.asset === 'coin').map((p) => Math.abs(p.rainSpin))) > 4
  && !gallery.artifacts.some((p) => p.asset === 'zombieWalk')
  && gallery.artifacts.some((p) => p.asset === 'drone')
  && gallery.artifacts.some((p) => p.sparkle)
  && ['capStar', 'capSpeed', 'capAirJump', 'capLowGrav', 'capUnpeel', 'capRelay']
    .every((asset) => gallery.artifacts.filter((p) => p.asset === asset).length >= 3),
  'arcade art gallery showcases 66 half-size falling coins that flip edge-on, the main cast, and multiple versions of every power-up');
assert(gallery.galleryStars.length >= 200 && gallery.galleryWorlds.length >= 5
  && gallery.galleryWorlds.some((world) => world.moon) && gallery.galleryWorlds.some((world) => world.ring),
  'arcade art gallery adds a dense starfield with a moon and varied planets');
assert(Math.max(...gallery.galleryWorlds.map((world) => world.r)) <= 10
  && gallery.galleryWorlds.some((world, i) => world.x !== worldXs[i]),
  'arcade art gallery keeps its moon and planets coin-sized and moving across the room');
assert(gallery.floorTread !== floorTread,
  'arcade art gallery advances its perspective floor as a treadmill');
assert(['battery', 'capShield', 'capMagnet']
  .every((asset) => gallery.artifacts.filter((p) => p.asset === asset).length >= 9),
  'arcade art gallery features an expanded battery, shield, and magnet collection');
assert(Math.max(...gallery.artifacts.map((p) => p.baseRadius)) > 150
  && Math.max(...gallery.heroes.map((p) => p.baseRadius)) > 100
  && (gallery.galleryOrbitX !== 240 || gallery.galleryOrbitY !== 135),
  'arcade art gallery lets props and heroes roam across the whole screen');
assert(!gallery.heroes.some((hero) => hero.heroId === 'gary' || hero.heroId === 'dolores'),
  'Gary and Dolores stay out of the rotating gallery reel for their floor cameo');
const propScaleRange = Math.max(...gallery.artifacts.map((p) => p.galleryScale))
  - Math.min(...gallery.artifacts.map((p) => p.galleryScale));
const heroScaleRange = Math.max(...gallery.heroes.map((p) => p.galleryScale))
  - Math.min(...gallery.heroes.map((p) => p.galleryScale));
assert(propScaleRange > 1 && heroScaleRange > 0.8,
  'arcade art gallery gives both props and heroes a clearly varied size range');
assert(gallery.heroes.every((hero, i) => hero.animClock > heroClocks[i] && ['run', 'jump', 'duck', 'celebrate'].includes(hero.poseKind)),
  'arcade art gallery heroes use advancing animated toon poses rather than static stand sprites');
gallery.update(0, { ...analysis, beat: 31.75, beatPhase: 0.75 });
assert(!gallery.galleryRunner.active && gallery.galleryRunner.backgroundFade === 0,
  'arcade art gallery restores the full reel during its six-bar gap');
gallery.update(0, { ...analysis, beat: 32.25, beatPhase: 0.25 });
assert(gallery.galleryRunner.active && gallery.galleryRunner.heroId === 'dolores'
  && gallery.galleryRunner.direction === -1 && gallery.galleryRunner.lift > 0
  && gallery.galleryRunner.size >= 100 && gallery.galleryRunner.groundY === 254
  && gallery.galleryRunner.backgroundFade > 0 && gallery.galleryRunner.backgroundFade < 1,
  'every eight bars Dolores or Gary crosses the gallery floor and jumps on the beat');
gallery.update(0, { ...analysis, beat: 33, beatPhase: 0 });
assert(gallery.galleryRunner.backgroundFade === 1 && gallery.galleryRunner.faceMode === 'focus',
  'the gallery reaches its dimmed foreground-cameo state after a short fade');
gallery.update(0, { ...analysis, beat: 36, beatPhase: 0 });
assert(gallery.galleryRunner.faceMode === 'annoyed',
  'the staff runner makes one restrained face change while keeping the run animation');
gallery.update(0, { ...analysis, beat: 64.25, beatPhase: 0.25 });
assert(gallery.galleryRunner.active && gallery.galleryRunner.heroId === 'gary'
  && gallery.galleryRunner.direction === 1,
  'the next eight-bar gallery cameo alternates back to Gary');

const toasterParade = createVisualizer(13, 0x13579bdf, { bpm: 120 });
const toasterInitialUpright = toasterParade.toasters.every((p) => Math.abs(p.rotation) < 0.001 && !p.rollActive);
const openingLead = toasterParade.toasters[0];
const delayedFlock = toasterParade.toasters.slice(1).filter((p) => p.entryDelay > 0);
const introLeadConfigured = openingLead.introLead && openingLead.scale >= 2
  && toasterParade.toasters[1].scale > 1.4 && toasterParade.toasters[2].scale > toasterParade.toasters[1].scale
  && delayedFlock.length === toasterParade.toasters.length - 1;
toasterParade.update(1 / 60, analysis);
toasterParade.draw(ctx);
const firstToasterX = toasterParade.toasters[0].x;
toasterParade.specialToasterTimer = 0;
toasterParade.update(0, analysis);
const specialToasters = toasterParade.toasters.filter((p) => p.specialColor);
const specialEditionLaunched = specialToasters.length === 1
  && ['silver', 'red', 'blue'].includes(specialToasters[0].specialColor);
const loopers = toasterParade.toasters.filter((p) => p.loopEligible);
const forcedLooper = loopers[0];
forcedLooper.entryDelay = 0;
forcedLooper.loopOffset = 0;
forcedLooper.loopCycle = 10;
forcedLooper.loopDuration = 2;
toasterParade.update(0.5, { ...analysis, beat: 1.25, beatPhase: 0.25, beatPulse: 0.4 });
const loopFlightVisible = forcedLooper.loopActive && Math.abs(forcedLooper.drawY - forcedLooper.y) > 1;
const poppingToaster = toasterParade.toasters.find((p) => p.hasToast);
poppingToaster.entryDelay = 0;
poppingToaster.toastOffset = -toasterParade.t;
toasterParade.update(0, { ...analysis, beat: 1.25, beatPhase: 0.25, beatPulse: 0.4 });
const toastPopVisible = poppingToaster.toastPopping;
toasterParade.update(8, { ...analysis, beat: 8.25, beatPhase: 0.25, beatPulse: 0.8 });
assert(toasterParade.toasters.length >= 64
  && toasterParade.skyParticles.length >= 200
  && toasterParade.toasters.every((p) => Number.isFinite(p.x) && Number.isFinite(p.rotation))
  && toasterParade.toasters.every((p) => p.rollDirection === -1 && p.loopDirection === -1)
  && toasterInitialUpright
  && introLeadConfigured
  && toasterParade.toasters.some((p) => p.rollActive || Math.abs(p.rotation) > 0.01)
  && loopers.length >= 2 && loopers.length <= 16 && loopFlightVisible
  && toasterParade.toasters.every((p) => p.toastCycle > p.toastDuration)
  && Math.max(...toasterParade.toasters.filter((p) => p.hasToast).map((p) => p.toastCycle))
    - Math.min(...toasterParade.toasters.filter((p) => p.hasToast).map((p) => p.toastCycle)) > 5
  && toasterParade.toasters.filter((p) => p.hasToast).length >= toasterParade.toasters.length * 0.12
  && toasterParade.toasters.filter((p) => p.hasToast).length <= toasterParade.toasters.length * 0.28
  && toasterParade.toasters.every((p) => p.hasToast || p.toastBand === 3)
  && toastPopVisible
  && specialEditionLaunched
  && toasterParade.toasters.some((p) => p.x < firstToasterX || p.x < -40),
  'toaster sky parade keeps about one fifth of the flock stocked, pops only their toast, and sends a few through flight loops plus periodic special editions');

const swarm = createVisualizer(4, 0x87654321, { bpm: 120 });
const swarmBeats = [0.1, 8.1, 16.1, 24.1, 32.1, 40.1, 48.1];
const swarmTargets = [];
const swarmVisible = [];
for (const beat of swarmBeats) {
  swarm.update(0, { ...analysis, beat, beatPhase: beat % 1 });
  swarm.update(0.8, { ...analysis, beat, beatPhase: beat % 1 });
  swarmTargets.push(swarm.satelliteTarget);
  swarmVisible.push(swarm.satellites.filter((p) => p.active).length);
}
assert(JSON.stringify(swarmTargets) === JSON.stringify([2, 4, 8, 16, 8, 4, 2])
  && JSON.stringify(swarmVisible) === JSON.stringify(swarmTargets),
  'kaleidoscope satellites expand and contract on phrase boundaries');

assert(pickVisualizer(2, () => 2 / 6) !== 2, 'preset selection avoids an immediate repeat');
assert(pickVisualizer(-1, () => 0) === 0, 'preset selection is injectable and deterministic');
assert(Audio.musicAnalysis().spectrum.length === 128 && Audio.musicAnalysis().waveform.length === 256,
  'audio analysis keeps a stable browserless data shape');

const sound = new SoundTestState({ onDone: () => {} });
sound.enter();
Input.usingTouch = false;
Input.press('confirm');
sound.update(1 / 60);
Input.release('confirm');
Input.endFrame();
for (let i = 0; i < 11; i++) sound.update(0.5);
assert(sound.playing === 0 && sound.visualState === 'in',
  'screensaver begins after five seconds of audible playback plus the start gap');
sound.update(1.1);
assert(sound.visualState === 'active', 'visualizer fade-in reaches the active state');
sound.draw(ctx);
assert(true, 'active visualizer draws bottom-corner track and preset labels safely');
sound.update(5.2);
assert(sound.labelT > 5, 'corner labels remain timed after their five-second hold');
const bankBeforeWake = Audio.bank;
const visualizerBeforeBrowse = sound.visualizerIndex;
Input.press('right');
sound.update(1 / 60);
Input.release('right');
assert(sound.visualizerIndex === (visualizerBeforeBrowse + 1) % VISUALIZER_NAMES.length
  && sound.visualState === 'active' && Audio.bank === bankBeforeWake && sound.labelT < 0.1,
  'right arrow advances the visualizer without waking or stopping the song');
sound.update(0.4);
Input.press('left');
sound.update(1 / 60);
Input.release('left');
assert(sound.visualizerIndex === visualizerBeforeBrowse && sound.visualState === 'active',
  'left arrow returns to the previous visualizer');
Input.usingTouch = true;
const visualizerBeforeSwipe = sound.visualizerIndex;
Input.pointer = { x: 240, y: 110, down: true };
Input.press('pointer');
sound.update(1 / 60);
Input.pointer.x = 170;
sound.update(1 / 60);
Input.pointer.down = false;
Input.release('pointer');
sound.update(1 / 60);
assert(sound.visualizerIndex === (visualizerBeforeSwipe + 1) % VISUALIZER_NAMES.length
  && sound.visualState === 'active' && Audio.bank === bankBeforeWake,
  'left touch swipe advances the visualizer without waking or stopping the song');
Input.usingTouch = false;
Input.press('confirm');
sound.update(1 / 60);
Input.release('confirm');
assert(sound.visualState === 'out' && Audio.bank === bankBeforeWake,
  'the first wake input only fades back and leaves the song playing');
sound.update(0.5);
assert(sound.visualState === 'list', 'wake fade returns to the jukebox list');
Input.press('confirm');
sound.update(1 / 60);
Input.release('confirm');
assert(sound.playing === -1 && Audio.bank === null, 'the next input operates the list normally');

Input.clearAll();
console.log(failed ? 'VISUALIZERS: FAILED' : 'VISUALIZERS: PASSED');
process.exit(failed ? 1 : 0);
