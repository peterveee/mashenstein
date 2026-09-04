// Focused coverage for the randomized jukebox visualiser pack.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { createVisualiser, pickVisualiser, VISUALISER_NAMES, MEGAMIX_CYCLE_BEATS, MEGAMIX_AUDITION_BEATS, MEGAMIX_TRANSITIONS, setMegamixAudition, createHalfPipeLab, HALF_PIPE_CONTROLS, HALF_PIPE_DEFAULTS } = await import('../src/engine/visualisers.js');
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

for (let i = 0; i < VISUALISER_NAMES.length; i++) {
  const v = createVisualiser(i, 0x12340000 + i, { bpm: 120 });
  v.update(1 / 60, analysis);
  v.draw(ctx);
  assert(v.name === VISUALISER_NAMES[i] && v.dust.length >= 96,
    `preset ${i + 1} has the expected name, moving focal point, and particle field`);
}

const kaleido = createVisualiser(4, 0x12345678, { bpm: 120 });
const kaleidoCounts = [];
for (const beat of [0.1, 8.1, 16.1, 24.1, 32.1]) {
  kaleido.update(0, { ...analysis, beat, beatPhase: beat % 1 });
  kaleidoCounts.push(kaleido.symmetry);
}
assert(kaleidoCounts.every((count) => count >= 8 && count <= 24 && count % 2 === 0)
  && new Set(kaleidoCounts).size > 1,
  'kaleidoscope changes between dense and sparse phrase segment counts');

const ringPresetIndices = [0, 3, 4, 5, 7, 9, 10, 11];
for (const index of ringPresetIndices) {
  const ringSeed = 0x13570000 + index;
  const ringPreset = createVisualiser(index, ringSeed, { bpm: 120 });
  const sampleAt = (beat) => {
    ringPreset.update(0, { ...analysis, beat, beatPhase: beat % 1 });
    ringPreset.draw(ctx);
    return ringPreset.ringRotation;
  };
  sampleAt(64);
  const events = ringPreset.ringRotationEvents.slice(0, 5);
  const variedIntervals = events.every((event, i) => i === 0 || [4, 8, 16].includes(event.beat - events[i - 1].beat))
    && new Set(events.slice(1).map((event, i) => event.beat - events[i].beat)).size > 1;
  const boundedTurns = events.every((event) => event.turn >= Math.PI / 2 && event.turn <= Math.PI);
  const smoothTransitions = events.every((event) => {
    const before = sampleAt(event.beat - 0.25);
    const atStart = sampleAt(event.beat);
    const halfway = sampleAt(event.beat + 0.5);
    const atEnd = sampleAt(event.beat + 1);
    return Math.abs(before - event.baseRotation) < 1e-9
      && Math.abs(atStart - event.baseRotation) < 1e-9
      && Math.abs(halfway - (event.baseRotation + event.turn * 0.5)) < 1e-9
      && Math.abs(atEnd - (event.baseRotation + event.turn)) < 1e-9;
  });
  const replay = createVisualiser(index, ringSeed, { bpm: 120 });
  replay.update(0, { ...analysis, beat: 64, beatPhase: 0 });
  const replayEvents = replay.ringRotationEvents.slice(0, 5);
  const reproducible = replayEvents.length === events.length
    && replayEvents.every((event, i) => event.beat === events[i].beat
      && Math.abs(event.turn - events[i].turn) < 1e-9);
  assert(boundedTurns && variedIntervals && smoothTransitions && reproducible,
    `${VISUALISER_NAMES[index]} ring rotation varies its 4/8/16-beat holds and smoothly transitions through reproducible 90–180 degree turns`);
}

const kaleidoTravel = createVisualiser(4, 0x12345678, { bpm: 120 });
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

const bloom = createVisualiser(7, 0x0badcafe, { bpm: 120 });
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

const bubblestorm = createVisualiser(14, 0x12344321, { bpm: 120 });
bubblestorm.update(0.5, analysis);
assert(bubblestorm.name === 'CHROMA BUBBLESTORM' && bubblestorm.orbs.length === 84,
  'chroma bubblestorm reworks prismatic storm as a circular orb field');

// --- acid julia dive --------------------------------------------------------
// The escape-time field itself needs a real canvas, so what is checked here is
// the state that drives it: the elastic sub-bass twist, the treble flash, and
// the plunge looping onto a fresh boundary point instead of a pixelated wall.
const acid = createVisualiser(16, 0x0ac1d000, { bpm: 120 });
const quiet = { ...analysis, bass: 0.05, treble: 0.05, beat: 0, beatPhase: 0, beatPulse: 0 };
for (let frame = 0; frame < 60; frame++) acid.update(1 / 60, { ...quiet, beat: frame / 30 });
assert(acid.name === 'ACID JULIA DIVE' && Math.abs(acid.warp) < 1e-3,
  'acid julia dive holds its baseline geometry while the sub-bass is quiet');

acid.update(1 / 60, { ...quiet, bass: 0.95, beat: 2, beatPulse: 0.9 });
const kickedWarp = acid.warp;
const kickedShake = acid.shake;
const kickedJitter = [acid.shakeX, acid.shakeY];
let overshot = false;
let peakWarp = Math.abs(kickedWarp);
for (let frame = 0; frame < 45; frame++) {
  acid.update(1 / 60, { ...quiet, beat: 2 + frame / 30 });
  peakWarp = Math.max(peakWarp, Math.abs(acid.warp));
  if (acid.warp * kickedWarp < 0) overshot = true;
}
assert(kickedWarp !== 0 && peakWarp > 0.3 && peakWarp <= 1.2 && overshot && Math.abs(acid.warp) < peakWarp * 0.2,
  'a sub-bass hit twists the julia constant and lets it elastically snap back past centre');
// The rattle offsets both axes while it lasts, stays within the bleed the
// composite blits past the frame edge, and is gone a beat later.
assert(kickedShake > 0.2 && kickedJitter.every((v) => v !== 0 && Math.abs(v) < 5)
  && acid.shake === 0 && acid.shakeX === 0 && acid.shakeY === 0,
  'the same hit rattles the camera on both axes and the rattle decays away');

acid.update(1 / 60, { ...quiet, treble: 0.95, beat: 4 });
assert(acid.flash > 0.8 && (acid.flashSwap === 1 || acid.whiteHeat > 0.5),
  'a treble spike either swaps the palette phase or blows the outer trails white-hot');
for (let frame = 0; frame < 15; frame++) acid.update(1 / 60, { ...quiet, beat: 4 + frame / 30 });
assert(acid.flash === 0, 'the flash is spent inside a fifth of a second rather than held');

const dives = new Set();
let blended = false;
let deepest = 0;
for (let frame = 0; frame < 60 * 30; frame++) {
  acid.update(1 / 60, { ...quiet, beat: 4 + frame / 30 });
  deepest = Math.max(deepest, acid.zoomLog);
  if (acid.blend < 1) blended = true;
  dives.add(`${acid.center.x.toFixed(6)},${acid.center.y.toFixed(6)}`);
}
// 30s of plunge has to cover several dives, each ending before double precision
// runs out — which is what the octave ceiling is for.
assert(deepest > 3 && deepest <= 3.6 && dives.size > 2 && blended,
  'the plunge loops every few seconds onto a fresh boundary point through a cross-fade');
// Inverse iteration has to land on the set, not wander off to infinity.
assert([...dives].every((key) => key.split(',').every((n) => Math.abs(Number(n)) < 2.2)),
  'every dive target is a point on the julia set rather than a runaway coordinate');
// The spring has to be home before the next kick, or a four-on-the-floor bar
// leaves it permanently leaning instead of snapping.
const settled = [];
for (let frame = 0; frame < 60 * 4; frame++) {
  const beat = 3 + frame / 30;
  const kick = Math.pow(1 - (((beat % 1) + 1) % 1), 7);
  acid.update(1 / 60, { ...quiet, bass: 0.12 + kick * 0.8, beat, beatPulse: kick });
  // Sample just before each downbeat, where a settled spring is back at rest.
  if (Math.abs(((beat % 1) + 1) % 1 - 0.97) < 0.017) settled.push(Math.abs(acid.warp));
}
assert(settled.length > 3 && settled.every((w) => w < 0.2),
  'four-on-the-floor lets the twist return to baseline between kicks rather than leaning');

const reactor = createVisualiser(3, 0x22446688, { bpm: 120 });
reactor.update(0.5, { ...analysis, beat: 32.25, beatPhase: 0.25 });
const reactorXs = reactor.reactors.map((p) => p.x);
reactor.update(2, { ...analysis, beat: 32.25, beatPhase: 0.25 });
assert(reactor.reactors.length === 3 && reactor.reactors.filter((p) => p.active).length === 3
  && reactor.reactors[0].x === reactor.focusX && reactor.reactors[0].y === reactor.focusY
  && reactor.reactors.slice(1).some((p, i) => p.x !== reactorXs[i + 1]),
  'monster reactor keeps one core central while up to two others cross beyond the screen');

// --- overall loudness -------------------------------------------------------
// `dynamics` is the song's current loudness against its own recent peak. The
// presets fold it into a movement multiplier, so a breakdown should visibly
// slow the picture down without ever freezing it.
const QUIET = { level: 0.04, dynamics: 0.08 };
const LOUD = { level: 0.5, dynamics: 1 };

// Total distance travelled, ignoring the jumps where a particle wraps.
const travelOf = (index, seed, loudness, sample, frames = 180) => {
  const v = createVisualiser(index, seed, { bpm: 120 });
  let previous = sample(v);
  let travelled = 0;
  for (let frame = 0; frame < frames; frame++) {
    const beat = frame / 30;
    v.update(1 / 60, { ...analysis, ...loudness, beat, beatPhase: beat % 1 });
    const now = sample(v);
    for (let i = 0; i < now.length; i++) {
      const step = Math.abs(now[i] - previous[i]);
      if (step < 20) travelled += step;
    }
    previous = now;
  }
  return { visualiser: v, travelled };
};

const dustY = (v) => v.dust.map((p) => p.y);
const loudBed = travelOf(0, 0x5eed1234, LOUD, dustY);
const quietBed = travelOf(0, 0x5eed1234, QUIET, dustY);
assert(quietBed.travelled > 0 && quietBed.travelled < loudBed.travelled * 0.6,
  'the shared dust bed drifts markedly less through a quiet passage without stopping dead');
assert(quietBed.visualiser.motion > 0.3 && quietBed.visualiser.motion < 0.5
  && loudBed.visualiser.motion > 0.98,
  'near-silence keeps a movement floor rather than freezing, and full loudness runs at the designed speed');

const starZ = (v) => v.stars.map((p) => p.z);
const loudTunnel = travelOf(5, 0x77aa3311, LOUD, starZ);
const quietTunnel = travelOf(5, 0x77aa3311, QUIET, starZ);
assert(quietTunnel.travelled < loudTunnel.travelled * 0.6,
  'deep-space wormhole coasts down the tunnel when the song drops out');

const rainY = (v) => v.streams.map((s) => s.y);
const loudRain = travelOf(9, 0x1133aa77, LOUD, rainY);
const quietRain = travelOf(9, 0x1133aa77, QUIET, rainY);
assert(quietRain.travelled < loudRain.travelled * 0.6,
  'data rain falls slower through a quiet passage');

// An analysis feed with no loudness fields has to behave exactly as it did
// before this signal existed, which is what keeps the headless fallback, the
// tests above, and any older recorded feed rendering identically.
const bare = createVisualiser(5, 0x0c0ffee0, { bpm: 120 });
const explicit = createVisualiser(5, 0x0c0ffee0, { bpm: 120 });
for (let frame = 0; frame < 120; frame++) {
  const beat = frame / 30;
  bare.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1 });
  explicit.update(1 / 60, { ...analysis, ...LOUD, beat, beatPhase: beat % 1 });
}
assert(bare.motion === 1 && Math.abs(bare.flow - bare.t) < 1e-9
  && bare.stars.every((p, i) => Math.abs(p.z - explicit.stars[i].z) < 1e-9),
  'analysis without loudness fields runs at full movement, so `flow` tracks `t` exactly');

const feed = Audio.musicAnalysis();
assert(Number.isFinite(feed.level) && feed.level >= 0
  && feed.dynamics >= 0 && feed.dynamics <= 1,
  'musicAnalysis reports a bounded overall level and dynamics alongside the bands');
assert(Number.isFinite(feed.drums) && feed.drums >= 0 && feed.drums <= 1
  && typeof feed.drumless === 'boolean',
  'musicAnalysis reports kit presence as a bounded density plus a drumless flag');

// The tally itself, driven directly. A fake clock is the only way to age
// scheduled hits past the playhead without rendering a whole song.
const realCtx = Audio.ctx;
const realBpm = Audio.bpm;
Audio.ctx = { currentTime: 0 };
Audio.bpm = 120;                       // half a second a beat
Audio._percPending.length = 0;
Audio._percHeard.length = 0;
for (let i = 0; i < 4; i++) Audio._percPending.push(i * 0.5);   // a bar of kick and backbeat
const kit = { drums: 0, drumless: false };
Audio.ctx.currentTime = 2;
for (let i = 0; i < 200; i++) Audio._readPercussion(kit);
assert(kit.drums > 0.9 && kit.drumless === false && Audio._percPending.length === 0,
  'four hits across the last bar read as a full kit once they have sounded');
Audio.ctx.currentTime = 4;
for (let i = 0; i < 200; i++) Audio._readPercussion(kit);
assert(kit.drums < 0.05 && kit.drumless === true,
  'two beats with nothing scheduled reads as a drumless section');

// The onset. `drums` is a four-beat density and `beatPulse` is a ramp that ticks
// whether or not anything played it; neither can say "a drum landed on THIS
// frame". The drain doing work is exactly that event.
Audio._percPending.length = 0;
Audio._percHeard.length = 0;
const onset = { drums: 0, drumless: false, hit: 0 };
Audio.ctx.currentTime = 10;
Audio._percPending.push(10.5);
Audio._readPercussion(onset);
assert(onset.hit === 0, 'a scheduled hit that has not sounded yet does not report an onset');
Audio.ctx.currentTime = 10.6;
Audio._readPercussion(onset);
assert(onset.hit === 1, 'the frame a scheduled hit passes the playhead reports a full onset');
const decayed = onset.hit;
Audio._readPercussion(onset);
assert(onset.hit > 0 && onset.hit < decayed,
  'the onset falls away over the frames after the hit rather than latching on');
for (let i = 0; i < 20; i++) Audio._readPercussion(onset);
assert(onset.hit < 0.01, 'the onset returns to rest when nothing else is scheduled');
Audio.ctx = realCtx;
Audio.bpm = realBpm;
Audio._percPending.length = 0;
Audio._percHeard.length = 0;

const liveFeed = Audio.musicAnalysis();
assert(Number.isFinite(liveFeed.hit) && liveFeed.hit >= 0 && liveFeed.hit <= 1,
  'musicAnalysis reports a bounded kit onset alongside the density');
const noHitField = createVisualiser(0, 0x0be11e55, { bpm: 120 });
noHitField.update(1 / 60, { ...analysis });
assert(noHitField.hit === 0,
  'analysis without an onset field reports no hit, so older feeds render unchanged');

// --- drumless sections ------------------------------------------------------
// `beatPulse` is the procedural clock and keeps ticking whether or not anything
// is playing the beat. `pulse` is that tick weighted by the kit actually under
// it, so a section arranged without drums stops punching.
const withKit = createVisualiser(0, 0x0d00d1e5, { bpm: 120 });
const noKit = createVisualiser(0, 0x0d00d1e5, { bpm: 120 });
let kitPulse = 0;
let barePulse = 0;
// The first four seconds are the kit leaving, which is meant to be a gradual
// read; what is measured is the settled state on the far side of that.
for (let frame = 0; frame < 480; frame++) {
  const beat = frame / 30;
  const at = { ...analysis, beat, beatPhase: beat % 1, beatPulse: Math.pow(1 - (beat % 1), 5) };
  withKit.update(1 / 60, { ...at, drums: 1, drumless: false });
  noKit.update(1 / 60, { ...at, drums: 0, drumless: true });
  if (frame < 240) continue;
  kitPulse += withKit.pulse;
  barePulse += noKit.pulse;
}
assert(barePulse > 0 && barePulse < kitPulse * 0.25
  && noKit.groove < 0.05 && withKit.groove > 0.95,
  'a drumless section keeps a trace of the bar line but drops most of the beat punch');
assert(noKit.drumless === true && withKit.drumless === false
  && Math.abs(withKit.pulse - withKit.beatPulse) < 1e-9,
  'a full kit leaves the punch exactly as it was before the drum tally existed');

const noDrumField = createVisualiser(5, 0x0d00d1e5, { bpm: 120 });
noDrumField.update(1 / 60, { ...analysis, drums: undefined, drumless: undefined });
assert(noDrumField.drums === 1 && noDrumField.drumless === false
  && noDrumField.pulse === noDrumField.beatPulse,
  'analysis without drum fields assumes a full kit, so older feeds render unchanged');

const gallery = createVisualiser(12, 0x2468ace0, { bpm: 120 });
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
  && ['capStar', 'capSpeed', 'capAirJump', 'capLowGrav', 'capUnpeel']
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

const toasterParade = createVisualiser(13, 0x13579bdf, { bpm: 120 });
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

const codeRain = createVisualiser(15, 0x0c0de5a1, { bpm: 120 });
const rainOpeningGrid = Array.from(codeRain.grid);
const rainHeads = codeRain.columns.map((c) => c.head);
let rainMessages = 0;
let rainWordsSeen = 0;
let rainSpinning = 0;
let rainBackwards = 0;
const rainWords = new Set();
for (let frame = 0; frame < 3600; frame++) {
  const beat = frame / 30;
  codeRain.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1 });
  const worded = codeRain.columns.filter((c) => c.word);
  rainMessages = Math.max(rainMessages, worded.length);
  for (const c of worded) {
    if (!rainWords.has(c.word)) rainWordsSeen++;
    rainWords.add(c.word);
    // The word has to fit the column it was given, or it would draw letters
    // the trail has no rows for.
    if (c.len !== c.word.length || c.spins.length !== c.word.length) rainMessages = 99;
    for (const spin of c.spins) {
      if (spin.angle > 0) rainSpinning++;
      // Past a quarter turn the card is edge-on and then showing its back.
      if (spin.angle > Math.PI / 2 && spin.angle < Math.PI * 1.5) rainBackwards++;
    }
  }
}
codeRain.draw(ctx);
assert(codeRain.columns.length === 40 && codeRain.grid.length === 40 * 25
  && codeRain.columns.every((c) => Number.isFinite(c.head) && c.head - c.len <= 25)
  && codeRain.columns.some((c, i) => c.head !== rainHeads[i])
  && codeRain.grid.some((g, i) => g !== rainOpeningGrid[i]),
  'code rain falls column by column and churns its glyphs in place');
assert(rainMessages === 1 && rainWordsSeen > 1 && rainWords.size > 1,
  'code rain decodes one column at a time into a readable word, and not always the same one');
assert(rainSpinning > 100 && rainBackwards > 20
  && codeRain.columns.every((c) => !c.spins || c.spins.every((spin) => spin.angle < Math.PI * 2)),
  'letters of a decoded word turn on their vertical axis, through the back of the card and round again');

const rainReplay = createVisualiser(15, 0x0c0de5a1, { bpm: 120 });
const replayWords = [];
for (let frame = 0; frame < 3600; frame++) {
  const beat = frame / 30;
  rainReplay.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1 });
  for (const c of rainReplay.columns) if (c.word && !replayWords.includes(c.word)) replayWords.push(c.word);
}
assert(replayWords.length === rainWords.size && replayWords.every((word) => rainWords.has(word)),
  'code rain spells the same words for the same seed');

const rainHeadsOf = (v) => v.columns.map((c) => c.head);
const loudCode = travelOf(15, 0x0c0de5a1, LOUD, rainHeadsOf);
const quietCode = travelOf(15, 0x0c0de5a1, QUIET, rainHeadsOf);
assert(quietCode.travelled > 0 && quietCode.travelled < loudCode.travelled * 0.6,
  'code rain drifts down slowly through a quiet passage instead of racing');

// A column the downbeat releases is snapped to exactly 0; one that simply ran
// its timer out has gone past it. That makes the two mechanisms countable, and
// with no kit playing the beat the first one should stop happening.
const rainDrops = (drumless) => {
  const v = createVisualiser(15, 0x0c0de5a1, { bpm: 120 });
  let snapped = 0;
  let timedOut = 0;
  for (let frame = 0; frame < 1800; frame++) {
    const beat = frame / 30;
    const waiting = v.columns.map((c) => c.wait > 0);
    v.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1, drums: drumless ? 0 : 1, drumless });
    v.columns.forEach((c, i) => {
      if (!waiting[i] || c.wait > 0) return;
      if (c.wait === 0) snapped++; else timedOut++;
    });
  }
  return { snapped, timedOut };
};
const codeWithKit = rainDrops(false);
const codeNoKit = rainDrops(true);
assert(codeWithKit.snapped > 50 && codeNoKit.snapped < 5
  && codeNoKit.timedOut > codeWithKit.timedOut,
  'code rain only restarts its columns on the downbeat while a kit is playing it, and drizzles in on its own timers otherwise');

const swarm = createVisualiser(4, 0x87654321, { bpm: 120 });
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

assert(pickVisualiser(2, () => 2 / 6) !== 2, 'preset selection avoids an immediate repeat');
assert(pickVisualiser(-1, () => 0) === 0, 'preset selection is injectable and deterministic');
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
assert(sound.visualState === 'active', 'visualiser fade-in reaches the active state');
sound.draw(ctx);
assert(true, 'active visualiser draws bottom-corner track and preset labels safely');
sound.update(5.2);
assert(sound.labelT > 5, 'corner labels remain timed after their five-second hold');
const bankBeforeWake = Audio.bank;
const visualiserBeforeBrowse = sound.visualiserIndex;
Input.press('right');
sound.update(1 / 60);
Input.release('right');
assert(sound.visualiserIndex === (visualiserBeforeBrowse + 1) % VISUALISER_NAMES.length
  && sound.visualState === 'active' && Audio.bank === bankBeforeWake && sound.labelT < 0.1,
  'right arrow advances the visualiser without waking or stopping the song');
sound.update(0.4);
Input.press('left');
sound.update(1 / 60);
Input.release('left');
assert(sound.visualiserIndex === visualiserBeforeBrowse && sound.visualState === 'active',
  'left arrow returns to the previous visualiser');
Input.usingTouch = true;
const visualiserBeforeSwipe = sound.visualiserIndex;
Input.pointer = { x: 240, y: 110, down: true };
Input.press('pointer');
sound.update(1 / 60);
Input.pointer.x = 170;
sound.update(1 / 60);
Input.pointer.down = false;
Input.release('pointer');
sound.update(1 / 60);
assert(sound.visualiserIndex === (visualiserBeforeSwipe + 1) % VISUALISER_NAMES.length
  && sound.visualState === 'active' && Audio.bank === bankBeforeWake,
  'left touch swipe advances the visualiser without waking or stopping the song');
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

// --- the homage presets -----------------------------------------------------
const TUNNEL = VISUALISER_NAMES.indexOf('HYPER-VECTOR TUNNEL');
const NEBULA = VISUALISER_NAMES.indexOf('NEBULA RIBBON DRIFT');
const GLASS = VISUALISER_NAMES.indexOf('GLASS BLOB EQUALIZER');
const PIPE = VISUALISER_NAMES.indexOf('HALF-PIPE HORIZON');

assert(VISUALISER_NAMES[VISUALISER_NAMES.length - 1] === 'VJ MEGAMIX'
  && [TUNNEL, NEBULA, GLASS, PIPE].every((i) => i > 0)
  && [TUNNEL, NEBULA, GLASS, PIPE].every((i, n, all) => n === 0 || i === all[n - 1] + 1),
  'the homage presets sit together in the pack and the mixer stays last');

// The tunnel accumulates a feedback buffer, which makes it one of the two places
// in the pack where draw() owns state. A cross-fade paints both records in one
// frame, so the advance has to be guarded on the clock or the warp doubles its
// speed for the length of every transition.
const tunnel = createVisualiser(TUNNEL, 0x70bb1e00, { bpm: 120 });
assert(tunnel.ensureBuffers() === false,
  'the tunnel reports no buffers under a stub canvas and falls back to drawing vectors straight to frame');
tunnel.update(1 / 60, analysis);
tunnel.draw(ctx);
// The stub canvas deliberately fails the createImageData probe, which is what
// keeps the buffer path off in Node — so the guard has to be exercised against
// stand-in surfaces, or the one invariant that matters most here goes untested.
const stubSurface = () => ({ canvas: document.createElement('canvas'), ctx: document.createElement('canvas').getContext('2d') });
tunnel.buffersTried = true;
tunnel.buffers = { front: stubSurface(), back: stubSurface(), bloom: stubSurface() };
tunnel.update(1 / 60, analysis);
tunnel.draw(ctx);
const afterFirst = tunnel.feedbackAdvances;
assert(afterFirst > 0, 'the tunnel advances its feedback buffer when it has one');
tunnel.draw(ctx);
assert(tunnel.feedbackAdvances === afterFirst,
  'a second draw on the same frame does not advance the feedback tunnel again');
tunnel.update(1 / 60, analysis);
tunnel.draw(ctx);
assert(tunnel.feedbackAdvances === afterFirst + 1,
  'a fresh frame advances the feedback tunnel exactly once');

// Zooms are chosen on the beat and held. A zoom that slides continuously reads
// as drift; the whole Geiss signature is that it steps with the music.
const zoomer = createVisualiser(TUNNEL, 0x70bb1e01, { bpm: 120 });
const zoomTargets = new Set();
let zoomChangedOffBeat = false;
let lastZoomTarget = zoomer.zoomTarget;
for (let frame = 0; frame < 480; frame++) {
  const beat = frame / 30;
  const before = Math.floor(zoomer.beat);
  zoomer.update(1 / 60, { ...analysis, beat, beatPhase: beat % 1 });
  if (zoomer.zoomTarget !== lastZoomTarget) {
    if (Math.floor(zoomer.beat) === before) zoomChangedOffBeat = true;
    lastZoomTarget = zoomer.zoomTarget;
    zoomTargets.add(Number(zoomer.zoomTarget.toFixed(6)));
  }
}
assert(zoomTargets.size >= 3 && !zoomChangedOffBeat,
  'the tunnel picks a new zoom only as the beat turns over, and works through several of them');

// The nebula bursts off the sequencer's kit tally, never off beatPulse. This is
// the whole reason the kit-weighted signals exist: beatPulse keeps ticking
// through a section arranged without drums, and a cloud detonating where nobody
// played a drum is exactly the failure to avoid.
const burst = createVisualiser(NEBULA, 0x11eb0000, { bpm: 120 });
const noBurst = createVisualiser(NEBULA, 0x11eb0000, { bpm: 120 });
for (let frame = 0; frame < 480; frame++) {
  const beat = frame / 30;
  const at = { ...analysis, beat, beatPhase: beat % 1, beatPulse: Math.pow(1 - (beat % 1), 5) };
  burst.update(1 / 60, { ...at, drums: 1, drumless: false });
  noBurst.update(1 / 60, { ...at, drums: 0, drumless: true });
}
assert(burst.detonations > 6 && noBurst.detonations === 0,
  'the nebula detonates on the kit and stays still through a drumless section');
assert(burst.heat >= 0 && burst.heat <= 1
  && Number.isInteger(Math.round(burst.paletteStep * 7))
  && burst.dust.length >= 96,
  'the nebula keeps its palette walk bounded and quantised, so the sprite cache cannot grow without limit');

// A shell travelling outward, not the whole cloud scaling up at once.
const shock = createVisualiser(NEBULA, 0x11eb0001, { bpm: 120 });
let reach = 0;
let shrank = false;
let live = 0;
let previousR = 0;
for (let frame = 0; frame < 200; frame++) {
  const beat = frame / 30;
  shock.update(1 / 60, {
    ...analysis, beat, beatPhase: beat % 1, drums: 1, drumless: false,
  });
  if (shock.shockE <= 0) { previousR = 0; continue; }
  live++;
  // Within one detonation the shell only ever travels outward; a reset to zero
  // is the next detonation starting, not the same one collapsing.
  if (shock.shockR < previousR && previousR > 0) shrank = true;
  previousR = shock.shockR;
  reach = Math.max(reach, shock.shockR);
}
assert(live > 10 && !shrank && reach > 120,
  'the nebula shockwave travels outward past the cloud rather than scaling it up in place');

// The bargraph caps are the WMP tell: they snap up, hang, then accelerate down.
const glass = createVisualiser(GLASS, 0x91a55000, { bpm: 120 });
for (let frame = 0; frame < 40; frame++) glass.update(1 / 60, analysis);
const risenPeaks = Array.from(glass.peaks);
const quietSpectrum = new Uint8Array(128);
let heldAt = null;
for (let frame = 0; frame < 150; frame++) {
  glass.update(1 / 60, { ...analysis, spectrum: quietSpectrum });
  if (frame === 8) heldAt = Array.from(glass.peaks);
}
assert(risenPeaks.every((p) => p > 0.2),
  'the equalizer caps rise to meet a loud spectrum');
assert(heldAt.every((p, i) => p > risenPeaks[i] * 0.85),
  'the caps hang at their peak for a beat before they start to fall');
assert(Array.from(glass.peaks).every((p) => p >= 0 && p < 0.05)
  && Array.from(glass.peakVel).every((v) => v > 0),
  'the caps then accelerate down under gravity and settle at the floor');
assert(glass.radii.length === 96
  && Array.from(glass.radii).every((r) => Number.isFinite(r) && r > 0 && r < 200),
  'the glass surface marches to a bounded closed contour');

// Runs the half-pipe at 120bpm for `seconds`, optionally against a song whose
// beat count restarts every `loopAt` beats.
function runPipe(seed, seconds, feed = {}, loopAt = 0) {
  const pipe = createVisualiser(PIPE, seed, { bpm: 120 });
  let songBeat = 0;
  for (let frame = 0; frame < seconds * 60; frame++) {
    songBeat += (1 / 60) * 2;
    const beat = loopAt ? songBeat % loopAt : songBeat;
    pipe.update(1 / 60, {
      ...analysis, ...feed, beat, beatPhase: beat % 1, beatPulse: Math.pow(1 - (beat % 1), 5),
    });
  }
  return pipe;
}

// Every row of the pipe is a circle on screen, and the whole illusion rests on
// where those circles land: the near one has to run PAST the lens so the trough
// leaves the bottom of the frame, and the far one has to collapse onto the
// vanishing point. A row that stopped short would flash a strip of sky along the
// bottom edge once per row.
const pipe = runPipe(0x5017c200, 6);
const pipeRows = pipe.rows;
assert(pipeRows.every((r) => Number.isFinite(r.cx) && Number.isFinite(r.cy) && Number.isFinite(r.r) && r.r >= 0)
  && pipeRows.every((r, i) => i === 0 || r.r > pipeRows[i - 1].r),
  'the pipe rows are finite and grow strictly toward the camera');
// Each row is a circle, so the surface ends on an arc that curves back UP before
// it reaches the bottom corners of the frame. The rows carried past the lens
// exist to cover exactly that, and the corners are the only place it can be
// checked: a gap there shows as a wedge of sky under the near wall.
const nearRow = pipeRows[pipeRows.length - 1];
const covers = (x, y) => {
  const dx = x - nearRow.cx; const dy = y - nearRow.cy;
  const within = Math.hypot(dx, dy) < nearRow.r;
  // ...and inside the open arc rather than out past the lip, where sky belongs.
  const off = Math.abs(((Math.atan2(dy, dx) - Math.PI / 2 + Math.PI) % (Math.PI * 2)) - Math.PI);
  return within && off < 1.31;
};
assert(covers(0, 269) && covers(479, 269) && covers(240, 269) && pipeRows[0].r < 8,
  'the pipe reaches both bottom corners of the frame and the far row collapses to the horizon');

// draw() is the contract that lets the video renderer replay update() alone in
// parallel workers, and this preset has no accumulating buffer to excuse a
// write. The mixer also paints two records in one frame, so a preset that
// marched its geometry from draw() would run at double speed through a blend.
const pipeBefore = JSON.stringify(pipe.rows);
const scrollBefore = pipe.scroll;
pipe.draw(ctx);
pipe.draw(ctx);
assert(JSON.stringify(pipe.rows) === pipeBefore && pipe.scroll === scrollBefore,
  'drawing the half-pipe twice in one frame moves nothing: all of its state marches in update');

// Beat-locked so the checkers step with the song, motion-scaled so a breakdown
// coasts rather than carrying on at full tilt.
const loudRide = runPipe(0x5017c201, 12, { dynamics: 1 });
const quietRide = runPipe(0x5017c201, 12, { dynamics: 0.02 });
assert(quietRide.scroll < loudRide.scroll * 0.6 && quietRide.scroll > loudRide.scroll * 0.3,
  'the ride slows through a quiet passage without stopping dead');

// A jukebox song loops, which hands the preset a beat count that restarts. The
// scroll integrates the beat DELTA rather than reading the absolute beat, so the
// wrap cannot throw the checker backwards or jump it a row.
const looped = createVisualiser(PIPE, 0x5017c202, { bpm: 120 });
let loopBeat = 0;
let wentBackwards = false;
let jumped = false;
let lastScroll = 0;
let turns = 0;
let lastTarget = looped.bankTarget;
for (let frame = 0; frame < 60 * 200; frame++) {
  loopBeat += (1 / 60) * 2;
  looped.update(1 / 60, { ...analysis, beat: loopBeat % 64 });
  if (looped.scroll < lastScroll) wentBackwards = true;
  if (looped.scroll - lastScroll > 1.5) jumped = true;
  lastScroll = looped.scroll;
  if (looped.bankTarget !== lastTarget) { turns++; lastTarget = looped.bankTarget; }
}
assert(!wentBackwards && !jumped,
  'a song whose beat count restarts does not throw the checker backwards or skip a row');
assert(turns > 6, 'the bank schedule keeps dealing turns through a looping song rather than stalling');

// The horizon rolls and the track bends to the same signed target. If they
// disagreed the picture would read as a camera tilting rather than a pipe
// turning, and the roll has to stay bank-sized: this is not the base class's
// 90-180 degree ring rotation.
const bankA = runPipe(0x5017c203, 90);
const bankB = runPipe(0x5017c203, 90);
assert(Math.abs(bankA.roll - bankB.roll) < 1e-9 && Math.abs(bankA.curve - bankB.curve) < 1e-9
  && bankA.bankNextBeat === bankB.bankNextBeat,
  'a replayed seed banks through exactly the same turns');
const rolled = createVisualiser(PIPE, 0x5017c204, { bpm: 120 });
let overBanked = false;
let disagreed = false;
let leaned = 0;
for (let frame = 0; frame < 60 * 120; frame++) {
  rolled.update(1 / 60, { ...analysis, beat: frame / 30 });
  if (Math.abs(rolled.bankRoll) > 0.6 + 1e-9) overBanked = true;
  // Both ease to the same signed target on the same clock, so they may only
  // ever be on opposite sides of zero by rounding.
  if (rolled.bankRoll * rolled.curve < -1e-9) disagreed = true;
  leaned = Math.max(leaned, Math.abs(rolled.bankRoll));
}
assert(!overBanked && !disagreed && leaned > 0.15,
  'the bank stays bank-sized and the horizon always rolls the way the track bends');

// The corkscrew is a whole turn of the barrel, not a big corner: it has to land
// exactly back where it started, or every one would leave the scene a little
// further rotated than the last and the bank would slowly stop meaning anything.
const screwed = createVisualiser(PIPE, 0x5017c207, { bpm: 120 });
let midScrew = 0;
let settledOff = 0;
for (let frame = 0; frame < 60 * 200; frame++) {
  screwed.update(1 / 60, { ...analysis, beat: frame / 30 });
  if (screwed.spiralActive) midScrew = Math.max(midScrew, Math.abs(screwed.spiral - screwed.spiralFrom));
  else settledOff = Math.max(settledOff, Math.abs(screwed.spiral % (Math.PI * 2)));
}
assert(screwed.spirals > 3 && midScrew > Math.PI * 1.5
  && (settledOff < 1e-6 || Math.abs(settledOff - Math.PI * 2) < 1e-6),
  'the corkscrew rolls the whole barrel over and settles back on a whole turn');

// Rings and spheres ride the checker itself rather than marching on their own
// clock, so they never slide along the floor. They only ever travel toward the
// camera, and they recycle PAST the lens rather than popping out in view.
const riding = createVisualiser(PIPE, 0x5017c205, { bpm: 120 });
let slidBackwards = false;
let recycled = 0;
let outOfRange = false;
let brightAtLens = 0;
const lastU = riding.groups.map((g) => g.u);
for (let frame = 0; frame < 60 * 30; frame++) {
  riding.update(1 / 60, { ...analysis, beat: frame / 30 });
  riding.groups.forEach((g, i) => {
    if (g.u < lastU[i]) { if (lastU[i] < 1) slidBackwards = true; else recycled++; }
    // A group's own u may run past the lens by the length of its trail, because
    // what must not pass the lens is its LAST ring — a corkscrew trail is most
    // of the pipe long, and recycling it on its front ring deleted the tail in
    // full view. That is the invariant worth pinning, so pin it directly.
    const tail = g.u - (g.count - 1) * g.stride;
    if (!(g.u > 0 && tail <= 1.1) || !g.sx.every(Number.isFinite)) outOfRange = true;
    // And nothing may be removed while it is still bright: the fade has to have
    // taken it to nothing before its group wraps.
    for (let j = 0; j < g.count; j++) if (g.ss[j] > 0.4 && g.sf[j] > 0.985) brightAtLens = Math.max(brightAtLens, g.u - (g.count - 1) * g.stride);
    lastU[i] = g.u;
  });
}
assert(!slidBackwards && !outOfRange && recycled > 8,
  'the rings only ever travel toward the camera and recycle past the lens');
assert(brightAtLens < 1.1,
  `no ring is still at full brightness when its group wraps (worst tail ${brightAtLens.toFixed(3)})`);

// The sky motes live in pipe space so they roll with the barrel through a
// corkscrew. They also carry a previous position for their streak, and a mote
// that recycled without resetting it would draw a line clean across the frame
// from wherever the last one died.
const skied = createVisualiser(PIPE, 0x5017c208, { bpm: 120 });
let stretched = 0;
let moteBackwards = false;
let recycledMotes = 0;
const moteU = skied.motes.map((m) => m.u);
for (let frame = 0; frame < 60 * 40; frame++) {
  skied.update(1 / 60, { ...analysis, beat: frame / 30 });
  skied.motes.forEach((m, i) => {
    if (m.u < moteU[i]) recycledMotes++; else if (m.u === moteU[i]) moteBackwards = true;
    moteU[i] = m.u;
    if (!Number.isFinite(m.x) || !Number.isFinite(m.px)) stretched = Infinity;
    stretched = Math.max(stretched, Math.hypot(m.x - m.px, m.y - m.py));
  });
}
assert(!moteBackwards && recycledMotes > 40 && stretched <= 34.0001,
  'sky motes stream past the lens and recycle without dragging a streak across the frame');

// A corkscrew lays its rings back DOWN the pipe rather than across it, so the
// roll has one continuous trail to follow rather than a series of rows.
const trailed = createVisualiser(PIPE, 0x5017c209, { bpm: 120 });
let sawTrail = false;
let sawDepth = false;
for (let frame = 0; frame < 60 * 120 && !sawDepth; frame++) {
  trailed.update(1 / 60, { ...analysis, beat: frame / 30 });
  if (!trailed.spiralActive) continue;
  for (const g of trailed.groups) {
    if (g.stride <= 0 || g.count < 6) continue;
    sawTrail = true;
    // Members recede: each one sits further from the lens than the last, and the
    // wind carries it round the barrel as it goes.
    if (g.u - (g.count - 1) * g.stride < g.u && g.wind !== 0) sawDepth = true;
  }
}
assert(sawTrail && sawDepth,
  'the corkscrew lays a winding trail back down the pipe for the roll to follow');

// The desk's tunable version is the SAME preset with its constants exposed, and
// that claim is the whole reason it is allowed to exist rather than being a
// second copy of six hundred lines. Untouched, it has to march identically —
// including through the seeded schedules, which is why AUTO draws from the rng
// rather than substituting a fixed interval.
const shipped = createVisualiser(PIPE, 0x5017c20b, { bpm: 120 });
const lab = createHalfPipeLab(0x5017c20b, { bpm: 120 }, HALF_PIPE_DEFAULTS());
let diverged = null;
let sawNarrow = false;
let sawWide = false;
for (let frame = 0; frame < 60 * 120 && !diverged; frame++) {
  const at = { ...analysis, beat: frame / 30, hit: frame % 30 === 0 ? 1 : 0 };
  shipped.update(1 / 60, at);
  lab.update(1 / 60, at);
  for (const key of ['scroll', 'roll', 'curve', 'spiral', 'schemeBlend', 'phraseBeat', 'width']) {
    if (Math.abs(shipped[key] - lab[key]) > 1e-12) diverged = `${key} @${frame}`;
  }
  // The knob is the width the ride KEEPS COMING BACK TO, not a limit: the pipe
  // wanders either side of it on its own schedule. What is fixed is the pair of
  // hard bounds — narrower than 0.5 stops reading as a tube you are inside, wider
  // than 2.0 opens the barrel out past the frame.
  if (lab.width < 0.5 - 1e-9 || lab.width > 2.0 + 1e-9) diverged = `width out of bounds @${frame}`;
  if (lab.width < lab.tune.width - 1e-9) sawNarrow = true;
  if (lab.width > lab.tune.width + 1e-9) sawWide = true;
  if (JSON.stringify(shipped.rows) !== JSON.stringify(lab.rows)) diverged = `rows @${frame}`;
  if (shipped.groups.map((g) => g.u).join() !== lab.groups.map((g) => g.u).join()) diverged = `groups @${frame}`;
}
assert(!diverged && lab.name === shipped.name,
  `the lab half-pipe at its defaults is the shipped preset frame for frame${diverged ? ` (${diverged})` : ''}`);
assert(sawNarrow && sawWide,
  'and the pipe wanders both sides of the knob within two minutes rather than sitting on it');

// And every knob has to actually reach something. OFF parks a schedule rather
// than merely slowing it, which is the case a range check would miss.
const tuned = createHalfPipeLab(0x5017c20c, { bpm: 120 }, {
  ...HALF_PIPE_DEFAULTS(), rings: 3, streaks: 12, screwEvery: -1, turnAmount: 0,
});
for (let frame = 0; frame < 60 * 120; frame++) {
  tuned.update(1 / 60, { ...analysis, beat: frame / 30, hit: frame % 30 === 0 ? 1 : 0 });
}
assert(tuned.groups.length === 3 && tuned.motes.length === 12
  && tuned.spirals === 0 && Math.abs(tuned.bankRoll) < 1e-9,
  'the knobs reach the pools and the schedules, and OFF stops a corkscrew rather than slowing it');

// Turned while it is running, without rebuilding what is already on screen.
const turning = createHalfPipeLab(0x5017c20d, { bpm: 120 }, HALF_PIPE_DEFAULTS());
for (let frame = 0; frame < 200; frame++) turning.update(1 / 60, { ...analysis, beat: frame / 30 });
const keptU = turning.groups.slice(0, 4).map((g) => g.u);
turning.applyTune({ rings: 18, streaks: 40 });
assert(turning.groups.length === 18 && turning.motes.length === 40
  && turning.groups.slice(0, 4).every((g, i) => g.u === keptU[i]),
  'turning a knob mid-song resizes the pools without restarting what is already travelling');

// The pipe's half-angle is what every arc in the frame is drawn from, so it
// chases its knob instead of taking it. A step change would deform the whole
// surface between two frames, which reads as a glitch rather than an adjustment.
turning.applyTune({ width: 2.6 });
const widthWalk = [];
for (let frame = 0; frame < 90; frame++) {
  turning.update(1 / 60, { ...analysis, beat: 40 + frame / 30 });
  widthWalk.push(turning.width);
}
const biggestWidthStep = widthWalk.reduce((worst, w, i) =>
  Math.max(worst, i === 0 ? 0 : Math.abs(w - widthWalk[i - 1])), 0);
assert(turning.tune.width === 2.6 && widthWalk[0] < 1.5 && Math.abs(turning.width - 2.6) < 0.02
  && biggestWidthStep < 0.07,
  'the pipe eases open to a new width over half a second rather than jumping to it');

// The one path that needs a real canvas. glowSprite returns null under the stub,
// so the sphere blit has to fall back rather than reach into a canvas that is
// not there — and the whole scene has to survive a feed with no spectrum at all.
const bareRide = createVisualiser(PIPE, 0x5017c206, { bpm: 120 });
bareRide.update(1 / 60, {});
bareRide.draw(ctx);
bareRide.update(1 / 60, { drums: 1, drumless: false, beat: 4, hit: 1 });
bareRide.draw(ctx);
assert(bareRide.rows.every((r) => Number.isFinite(r.cx) && Number.isFinite(r.r))
  && bareRide.cellLight.every((c) => /^#[0-9a-f]{6}$/.test(c)),
  'the half-pipe draws against a bare analysis feed and a stub canvas without a real sprite');


// --- VJ MEGAMIX -------------------------------------------------------------
// The preset that plays the other presets. What matters is the clock: a record
// holds for a full phrase and the handover lands ON the boundary, whatever the
// song's own beat count is doing underneath.
const MEGAMIX_INDEX = VISUALISER_NAMES.indexOf('VJ MEGAMIX');
assert(MEGAMIX_INDEX >= 0, 'the megamix is a browsable member of the preset pack');

// Runs the megamix at 120bpm for `seconds`, optionally against a song whose beat
// count restarts every `loopAt` beats, and reports every handover.
function runMegamix(seed, seconds, loopAt = 0) {
  const mix = createVisualiser(MEGAMIX_INDEX, seed, { bpm: 120 });
  const played = [mix.current.name];
  const moves = [];
  const handoverBeats = [];
  let songBeat = 0;
  let last = mix.current.name;
  for (let frame = 0; frame < seconds * 60; frame++) {
    songBeat += (1 / 60) * 2;
    mix.update(1 / 60, { ...analysis, beat: loopAt ? songBeat % loopAt : songBeat });
    mix.draw(ctx);
    if (mix.plan && !moves.includes(mix.plan.transition.name)) moves.push(mix.plan.transition.name);
    if (mix.current.name !== last) {
      last = mix.current.name;
      played.push(last);
      handoverBeats.push(mix.mixBeat);
    }
  }
  return { mix, played, moves, handoverBeats };
}

const megamix = runMegamix(0x1234abcd, 200);
assert(megamix.played.length >= 5
  && megamix.handoverBeats.every((beat, i) => Math.abs(beat - (i + 1) * MEGAMIX_CYCLE_BEATS) <= 1),
  'each record holds a full 16-bar phrase and hands over on the phrase boundary');
assert(megamix.played.every((name, i) => i === 0 || name !== megamix.played[i - 1])
  && !megamix.played.includes('VJ MEGAMIX'),
  'the megamix never plays itself and never repeats a record back to back');

// A jukebox song loops, which restarts the beat count it reports. The phrase
// clock has to survive that: it is the one thing every transition is aimed at.
const loopedRun = runMegamix(0x1234abcd, 200, 64);
assert(loopedRun.played.length === megamix.played.length
  && loopedRun.handoverBeats.every((beat, i) => Math.abs(beat - megamix.handoverBeats[i]) < 0.1),
  'a song whose beat count restarts every phrase does not stall or double-trigger the mixer');

const replay = runMegamix(0x1234abcd, 200);
assert(JSON.stringify(replay.played) === JSON.stringify(megamix.played),
  'a replayed seed deals the same records in the same order');

// One long run should get through the whole pack rather than orbiting a few.
const longRun = runMegamix(0x2468ace0, 1200);
assert(new Set(longRun.played).size === VISUALISER_NAMES.length - 1,
  'a long run deals every other preset in the pack at least once');

// Every move has to survive being drawn across its whole length, including the
// clip-path and context-transform ones, and has to leave the context clean.
for (const move of MEGAMIX_TRANSITIONS) {
  const mix = createVisualiser(MEGAMIX_INDEX, 0x778899aa, { bpm: 120 });
  let songBeat = 0;
  while (!mix.plan) {
    songBeat += (1 / 60) * 2;
    mix.update(1 / 60, { ...analysis, beat: songBeat });
  }
  mix.plan.transition = move;
  mix.plan.startBeat = mix.switchBeat - (move.align === 'centre' ? move.beats * 0.5 : move.beats);
  mix.plan.endBeat = mix.plan.startBeat + move.beats;
  const arriving = mix.plan.incoming.name;
  const seen = [];
  for (let frame = 0; frame < 60 * 6 && mix.plan; frame++) {
    songBeat += (1 / 60) * 2;
    mix.update(1 / 60, { ...analysis, beat: songBeat });
    seen.push(mix.transitionAmount());
    mix.draw(ctx);
  }
  // Sampled as spans rather than against an exact end value: the shortest move
  // is 45 frames long, so its last drawn step still sits a little short of 1.
  const drewIn = (lo, hi) => seen.some((p) => p > lo && p <= hi);
  assert(drewIn(0, 0.2) && drewIn(0.4, 0.6) && drewIn(0.9, 1)
    && !mix.plan && mix.current.name === arriving,
    `${move.name} draws its whole length and lands the incoming record`);
}

// The dev audition: a short cycle that walks the whole move list in order, so
// every transition can be judged rather than waited for.
setMegamixAudition(true);
const audition = createVisualiser(MEGAMIX_INDEX, 0x1234abcd, { bpm: 120 });
setMegamixAudition(false);
const auditioned = [];
let auditionBeat = 0;
let lastMove = null;
// One full pass is every move times the audition cycle — 160 beats, which at
// the 120bpm this drives is eighty seconds. Run past it so the wrap is covered.
const auditionPass = MEGAMIX_TRANSITIONS.length * MEGAMIX_AUDITION_BEATS;
for (let frame = 0; frame < 30 * (auditionPass + MEGAMIX_AUDITION_BEATS * 2); frame++) {
  auditionBeat += (1 / 60) * 2;
  audition.update(1 / 60, { ...analysis, beat: auditionBeat });
  audition.draw(ctx);
  if (audition.plan && audition.plan.transition !== lastMove) {
    lastMove = audition.plan.transition;
    auditioned.push(lastMove.name);
  } else if (!audition.plan) lastMove = null;
}
const firstPass = auditioned.slice(0, MEGAMIX_TRANSITIONS.length);
assert(audition.audition && audition.cycleBeats === MEGAMIX_AUDITION_BEATS
  && firstPass.join('|') === MEGAMIX_TRANSITIONS.map((move) => move.name).join('|'),
  'the audition walks every move in list order on its short cycle');
// The heavy-preset rule substitutes a solo move for whichever one is due. An
// audition must never lose the move it is showing, so it bypasses that rule
// outright — which is what lets it deal the expensive presets too, and those are
// the pairings worth watching the frame rate through.
const heavyName = 'ACID JULIA DIVE';
setMegamixAudition(true);
const heavyAudition = createVisualiser(MEGAMIX_INDEX, 0x0badf00d, { bpm: 120 });
setMegamixAudition(false);
let heavyBeat = 0;
const heavyMoves = [];
// Long enough to see one preset come round SEVERAL times. An audition holds
// each record for sixteen bars — half a minute at this tempo — so a walk only
// a few records long samples any given preset once and can only ever report
// whichever single move that pass happened to deal. The claim below is about
// the spread of moves a heavy preset gets, so the walk has to be long enough
// to have a spread at all. (It got shorter than the pack the day the pack grew
// a preset, which is exactly how this was found.)
for (let frame = 0; frame < 60 * 900; frame++) {
  heavyBeat += (1 / 60) * 2;
  heavyAudition.update(1 / 60, { ...analysis, beat: heavyBeat });
  if (heavyAudition.plan && VISUALISER_NAMES[heavyAudition.plan.index] === heavyName) {
    heavyMoves.push(heavyAudition.plan.transition.name);
  }
}
assert(heavyMoves.length > 0 && !heavyMoves.every((name) => name === 'BEAT STUTTER' || name === 'FLASH CUT'),
  'an audition deals the expensive presets too, without swapping the move it is showing for a solo one');
assert(createVisualiser(MEGAMIX_INDEX, 0x1234abcd, { bpm: 120 }).cycleBeats === MEGAMIX_CYCLE_BEATS,
  'the audition switch does not leak into an ordinary megamix');

// The corner tag names whichever record is up, so it can re-announce itself
// mid-preset — the jukebox never switches visualiser while this one is running.
const tagged = createVisualiser(MEGAMIX_INDEX, 0x1234abcd, { bpm: 120 });
const tags = new Set();
for (let frame = 0; frame < 60 * 140; frame++) {
  tagged.update(1 / 60, { ...analysis, beat: frame * 2 / 60 });
  tags.add(tagged.label);
}
assert(tags.size >= 3 && [...tags].every((tag) => tag.startsWith('MEGAMIX / ')),
  'the corner tag follows the record on screen instead of naming the mixer forever');

Input.clearAll();
console.log(failed ? 'VISUALISERS: FAILED' : 'VISUALISERS: PASSED');
process.exit(failed ? 1 : 0);
