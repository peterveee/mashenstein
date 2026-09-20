// Frost weather and Frost feet: the two rules that are easy to break silently.
//
// The blizzard is a LADDER climbed at the checkpoints, and the climb is the
// whole point — Frost 1 opens clear, the snow starts at its first checkpoint,
// and the last checkpoint of Frost 3 stands in the worst of it. A regression
// here looks like nothing at all in a screenshot, so it is pinned arithmetically.
//
// The feet are the other half: a ridge feature is planted at the HIGHEST ground
// under its footprint and carries a skirt down to the LOWEST, so the contour
// clip can cut its base to the snow line without ever eating the art or leaving
// a flat edge hanging over the hill. Both ends of that are checkable off the
// placement table.
import { installDom } from './dom-stub.js';
installDom();

const { __testing } = await import('../src/engine/stylePacks/index.js');
const { GROUND_Y } = await import('../src/engine/camera.js');
const { CABINETS } = await import('../src/data/cabinets.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- the blizzard climbs at the checkpoints ---------------------------------
{
  const rung = __testing.frostBlizzardRung;
  const ramp = __testing.frostBlizzardRamp;
  const ladder = __testing.FROST_BLIZZARD_LADDER;
  const max = __testing.FROST_BLIZZARD_MAX;

  assert(rung(1, 0) === 0,
    'Frost 1 opens on a clear day — no blizzard before the first checkpoint');
  assert(rung(1, 1) > 0,
    'the snow starts at the first checkpoint of Frost 1');
  assert(rung(1, 1) < max * 0.25,
    'and it starts as a flurry, not as weather the player has to fight');

  // Every rung across the act is higher than the one before it: the start line,
  // then six checkpoints, six steps, one storm.
  const climb = [];
  for (let stage = 1; stage <= 3; stage++) {
    for (let banked = stage === 1 ? 0 : 1; banked <= 2; banked++) climb.push(rung(stage, banked));
  }
  assert(climb.length === 7, 'the act has a start line and six checkpoints');
  for (let i = 1; i < climb.length; i++) {
    assert(climb[i] > climb[i - 1],
      `checkpoint ${i} of the act is worse weather than the road before it`);
  }
  assert(climb[climb.length - 1] === max,
    'the last checkpoint of Frost 3 is the worst the cabinet gets');
  assert(max > 1,
    'and the worst is past the strength the pass was originally dialled at');

  // A level opens exactly where the one before it closed: the rung carries over
  // rather than each stage having its own weather setting.
  assert(rung(2, 0) === rung(1, 2), 'Frost 2 opens on the sky Frost 1 finished under');
  assert(rung(3, 0) === rung(2, 2), 'Frost 3 does the same again');

  // A stage holds its rung between checkpoints — the weather steps, it does not
  // drift with the odometer.
  assert(rung(1, 1) === ladder[1] && rung(3, 2) === ladder[6],
    'the rungs are the authored ladder, read straight off it');

  // The continuous fallback, for a run that banks no checkpoints (ONE-HIT,
  // overtime) and for every static preview. It samples the same ladder.
  assert(ramp(1, 0) === 0,
    'the fallback opens Frost 1 on the same clear day');
  assert(ramp(1, 1) === rung(1, 2) && ramp(3, 1) === rung(3, 2),
    'the fallback meets the ladder at every stage boundary');
  for (let stage = 1; stage <= 3; stage++) {
    assert(ramp(stage, 0) <= ramp(stage, 1),
      `stage ${stage} never gets clearer as the level runs`);
  }
  assert(ladder[ladder.length - 1] === max, 'the ladder tops out at the authored maximum');
  // Missing progress is the start line, not a squall: a static preview of a
  // stage must not invent weather the player has not run into yet.
  assert(ramp(1, undefined) === ramp(1, 0),
    'progress the run has not published counts as the start line');
}

// --- and the run climbs it at its own checkpoints ----------------------------
//
// The ladder is arithmetic; this is the wiring. What matters is that the stage
// opens on the sky it inherits, that crossing a line moves the weather without
// cutting to it, and that it settles on the rung the ladder names.
{
  const { RunState } = await import('../src/game/run.js');
  const { save } = await import('../src/engine/save.js');
  const { STAGES } = await import('../src/data/stages.js');
  const rung = __testing.frostBlizzardRung;

  save.load();
  save.newSlot(0, 0);
  const start = (id) => {
    const run = new RunState({
      stage: STAGES.find((st) => st.id === id), save, seed: 3, skipRunIn: true, onEnd: () => {},
    });
    run.enter();
    return run;
  };

  const one = start('frost-1');
  assert(one.blizzard === 0, 'a Frost 1 run opens with no weather at all');
  assert(one.checkpointsAt.length === 2,
    'and it keeps its checkpoint lines where nothing consumes them');

  // Stand past the first line. The target steps; the sky does not.
  one.distance = one.checkpointsAt[0] + 1;
  const target = rung(1, 1, 2);
  one.blizzardStep(1 / 60);
  assert(one.blizzard > 0 && one.blizzard < target * 0.2,
    'the frame the line is crossed barely moves the sky — weather thickens, it does not cut');
  for (let i = 0; i < 60 * 40; i++) one.blizzardStep(1 / 60);
  assert(Math.abs(one.blizzard - target) < 0.002,
    'and it settles on the rung that checkpoint is worth');

  one.distance = one.checkpointsAt[1] + 1;
  for (let i = 0; i < 60 * 40; i++) one.blizzardStep(1 / 60);
  assert(Math.abs(one.blizzard - rung(1, 2, 2)) < 0.002,
    'the second line is worse again');

  // A restore does not hand the player a calmer sky than the road is owed.
  one.blizzard = 0;
  one.blizzard = one.blizzardTarget();
  assert(Math.abs(one.blizzard - rung(1, 2, 2)) < 1e-9,
    'a checkpoint restore arrives in the weather that stretch of road is owed, with no ease');

  const three = start('frost-3');
  assert(Math.abs(three.blizzard - rung(2, 2, 2)) < 1e-9,
    'Frost 3 opens on the sky Frost 2 finished under, not on a clear day');
  three.distance = three.checkpointsAt[1] + 1;
  for (let i = 0; i < 60 * 60; i++) three.blizzardStep(1 / 60);
  assert(Math.abs(three.blizzard - __testing.FROST_BLIZZARD_MAX) < 0.002,
    'and its last checkpoint stands in the worst of it');
}

// --- feet: planted high, skirted low, clipped to the snow -------------------
{
  const ctx = { canvas: { width: 480, height: 270 } };
  const margin = __testing.FROST_FEATURE_MARGIN;
  let checked = 0;
  for (const layer of ['far', 'near']) {
    for (const camX of [0, 137, 306, 512, 871, 1290, 1777]) {
      for (const feature of __testing.frostSceneryPlacements(ctx, camX, GROUND_Y, { layer })) {
        const footprint = __testing.FROST_FEATURE_FOOTPRINTS[feature.kind];
        assert(!!footprint, `${feature.kind} has a footprint`);
        assert(Array.isArray(feature.surface) && feature.surface.length > 2,
          `${feature.kind} carries a snow contour to clip against`);
        const scale = Math.max(0.1, Number(feature.scale) || 1);
        // The art's own base LINE, in the same space the contour arrives in —
        // and it is a line, not a level: a rock or a drift lies along the ridge
        // tangent, so every one of these invariants is measured against that
        // tilted base rather than a horizontal one. Measuring flat is exactly
        // the mistake the art was making before it was allowed to lean.
        const artBottom = feature.baseY + footprint.bottom * scale;
        const slope = feature.lean ? Math.tan(feature.lean) : 0;
        assert(!!footprint.lean === !!feature.lean || Math.abs(slope) < 1e-9,
          `${feature.kind} leans only if its kind is allowed to`);
        const rel = feature.surface.map((p) => p.y - slope * p.dx);
        const deepest = Math.max(...rel);
        const highest = Math.min(...rel);
        if (footprint.drift) {
          // A drift takes no foot: it sits on the ground under its own middle
          // and lets the contour bury whatever the slope takes.
          assert(feature.foot === 0, `${feature.kind} is a drift and grows no skirt`);
          assert(highest <= artBottom && artBottom <= deepest,
            `${feature.kind} is planted on the ground under its own middle`);
        } else {
          // Nothing the clip shows may be above the art: if the ground under the
          // footprint rose past the base, the contour would cut into the feature.
          assert(highest >= artBottom - 1.5,
            `${feature.kind} is planted at the highest ground under it, so the clip never eats it`);
          // And the skirt has to reach the lowest ground the clip still shows, or
          // the base stops in mid-air over the hill.
          assert(artBottom + feature.foot >= deepest,
            `${feature.kind}'s skirt reaches the snow on its downhill side`);
          const skirt = __testing.frostFeatureSkirt(feature.kind);
          assert(!!skirt && typeof skirt.color === 'string',
            `${feature.kind}'s skirt knows what colour its own base band is`);
        }
        // The contour has to be sampled at least as wide as the art it clips,
        // or the clip puts a vertical cut through the silhouette.
        const half = Math.max(-feature.surface[0].dx,
          feature.surface[feature.surface.length - 1].dx);
        assert(half >= footprint.halfWidth * scale + margin - 0.001,
          `${feature.kind}'s contour is sampled past its own footprint`);
        checked++;
      }
    }
  }
  assert(checked > 40, `enough placements were exercised (${checked})`);
}

// --- day to dusk across the three stages --------------------------------------
{
  const luma = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  const cab = CABINETS.find((c) => c.id === 'frost');
  const stages = [1, 2, 3].map((i) => __testing.frostStageLight(i));

  // Stage 1 is the shipped cabinet, untouched: the ramp starts from the picture
  // that was already signed off, and only 2 and 3 are new.
  assert(stages[0].sky[0] === cab.sky[0] && stages[0].sky[1] === cab.sky[1],
    'Frost 1 keeps the cabinet sky exactly');
  assert(stages[0].ground === cab.ground && stages[0].groundDark === cab.groundDark,
    'Frost 1 keeps the cabinet lane exactly');

  // The sky goes DOWN over the top of the frame, act by act.
  assert(luma(stages[0].sky[0]) > luma(stages[1].sky[0])
    && luma(stages[1].sky[0]) > luma(stages[2].sky[0]),
    'the sky darkens overhead from Frost 1 to Frost 3');
  // And the lane goes with it. A dusk sky over a noon lane is a lit stage set.
  assert(luma(stages[0].ground) > luma(stages[1].ground)
    && luma(stages[1].ground) > luma(stages[2].ground),
    'the lane darkens with the sky rather than staying at noon');
  // The horizon does the opposite of the zenith at dusk: that is what makes it
  // an evening rather than a dimmer switch.
  assert(luma(stages[2].sky[1]) > luma(stages[2].sky[0]) + 40,
    'dusk keeps the last of the sun on the horizon');

  // LEGIBILITY IS NOT NEGOTIABLE. Frost is the cabinet you slide into things on,
  // and a bear trap is 16x8. Whatever the light does, the trap has to separate
  // from the snow it is bedded in.
  const TRAP_INK = '#2a2f3a';
  for (const [i, light] of stages.entries()) {
    assert(luma(light.ground) - luma(TRAP_INK) > 70,
      `a bear trap still reads against the Frost ${i + 1} lane`);
  }
  // Snow stays the brightest thing in the picture at every hour: the moment the
  // sky outruns the ground downward, the lane has stopped being snow.
  for (const [i, light] of stages.entries()) {
    assert(luma(light.ground) > luma(light.hills),
      `the Frost ${i + 1} lane is still brighter than the hills behind it`);
  }

  // The stage light reaches the scenery palette, and the fortress's lit windows
  // are the one thing it never touches — they are emitting, not reflecting.
  const day = __testing.frostAtmosphericPalette('far', cab, 'landmark', 1);
  const dusk = __testing.frostAtmosphericPalette('far', cab, 'landmark', 3);
  assert(luma(dusk.snow) < luma(day.snow),
    'the scenery dims as the light goes');
  assert(dusk.warm === day.warm,
    'the lit windows stay the same warm at every hour');
  assert(luma(dusk.snow) > luma(dusk.shadow),
    'and the palette keeps its own order at dusk');
}

// --- what leans and what does not --------------------------------------------
{
  // A rock and a drift lie ON the hill and take its angle. A pine grows
  // vertically and a fortress is built level whatever it stands on; a glacier is
  // a mountain rather than something resting on one. Getting this list wrong is
  // how you end up with a leaning tower nobody asked for.
  for (const kind of ['ice-rock', 'snowbank']) {
    assert(__testing.FROST_FEATURE_FOOTPRINTS[kind].lean > 0,
      `${kind} lies along the hill`);
  }
  for (const kind of ['pine', 'landmark', 'glacier']) {
    assert(!__testing.FROST_FEATURE_FOOTPRINTS[kind].lean,
      `${kind} stands upright whatever the hill is doing`);
  }
  // And the lean has to actually reach the placement, with a real angle on a
  // real slope — a table nothing reads is worse than no table.
  const ctx = { canvas: { width: 480, height: 270 } };
  let leaned = 0;
  let upright = 0;
  for (let camX = 0; camX < 1200; camX += 13) {
    for (const f of __testing.frostSceneryPlacements(ctx, camX, GROUND_Y, { layer: 'near' })) {
      if (__testing.FROST_FEATURE_FOOTPRINTS[f.kind].lean) {
        if (Math.abs(f.lean) > 0.08) leaned++;
      } else if (!f.lean) upright++;
    }
  }
  assert(leaned > 0, `rocks and drifts really do tilt on a slope (${leaned} of them)`);
  assert(upright > 0, `and pines and landmarks really do not (${upright} of them)`);
}

// --- pines keep their bite ---------------------------------------------------
{
  assert(__testing.FROST_PINE_EMBED > 0,
    'a pine trunk still ends just inside the snow rather than on top of it');
  for (const kind of ['glacier', 'ice-rock', 'snowbank', 'pine', 'landmark']) {
    assert(!!__testing.frostFeatureSkirt(kind),
      `${kind} has a skirt colour, so its foot is never bare`);
  }
}

// --- the snow is already falling when the stage comes up ---------------------
//
// The blizzard has exactly two motion terms: the camera, and the clock it is
// handed. Through the ACT card, the touch card and the opening run-in the world
// is parked AND tRun is held at zero — so a weather clock taken off the run
// clock leaves Frost 2 and 3 (which open part-way up the ladder) sitting under
// a sheet of snow nailed to the screen. Weather is scenery: it rides the
// scenery clock, which is alive from the first frame and still freezes on a
// real pause.
{
  const { RunState } = await import('../src/game/run.js');
  const { save } = await import('../src/engine/save.js');
  save.load();
  save.newSlot(0, 0);

  for (const index of [2, 3]) {
    const run = new RunState({
      stage: {
        id: `frost-${index}`, cabinet: 'frost', index,
        mission: { type: 'reach', desc: 'TEST' },
        challenge: { type: 'coins', n: 9999, desc: 'TEST' },
        durationSec: 40, applianceAt: 0.5, applianceHigh: false,
      },
      team: ['lorenzo', 'rusty', 'clara'],
      save, seed: 1234, difficulty: 1, devInvuln: true, onEnd: () => {},
    });
    run.enter();

    assert(__testing.frostBlizzardRung(index, 0) > 0,
      `Frost ${index} opens with weather already on it`);

    const clocks = [];
    run.style.weather = (_ctx, t) => { clocks.push(t); };
    const ctx = globalThis.document.createElement('canvas').getContext('2d');
    for (let i = 0; i < 12; i++) { run.update(1 / 60); run.drawFrame(ctx, 0); }

    assert(run.tRun === 0 && run.introRunning,
      `Frost ${index}: the lane is still held back over these frames`);
    assert(clocks.length >= 2 && clocks[clocks.length - 1] > clocks[0],
      `Frost ${index}: the snow is falling before the lane goes live`);
  }
}

console.log(failed ? 'FROST WEATHER: FAILED' : 'FROST WEATHER: PASSED');
process.exit(failed ? 1 : 0);
