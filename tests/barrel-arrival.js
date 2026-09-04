// The gorilla's chute hands a barrel to the road: `updateBarrelArrivals` lifts
// a lane barrel and shrinks it, then walks both back to zero as the barrel
// reaches the player. This suite exists because that walk once compared two
// clocks counted differently — the song's beat wraps inside its loop, the
// barrel's own beat does not — and across the loop seam every barrel on the
// stage stayed lifted for the rest of the run, drawn flying through the
// skyline. See the comment on the epoch in updateBarrelArrivals.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { OBSTACLES } = await import('../src/game/entities.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A stand-in run: only what the arrival maths reads.
function fakeRun(obstacles, { beatEpoch = 0, zoom = 1.6 } = {}) {
  const r = Object.create(RunState.prototype);
  r.beatLock = true;
  r.styleName = 'lcd';
  r.stage = { index: 3 };
  r.cabinet = { music: { bpm: 124 } };
  // `speed` is a getter on RunState, so the stand-in defines its own.
  Object.defineProperty(r, 'speed', { value: 208, configurable: true });
  r.camZoom = zoom;
  r.obstacles = obstacles;
  r.spawner = { beatEpoch };
  r.barrelChuteOb = null;
  r.barrelChuteGrid = null;
  r.barrelChuteBeat = null;
  return r;
}
const barrelAt = (actionBeat) => ({
  live: true, type: 'barrel', def: OBSTACLES.barrel, actionBeat,
  x: 900, w: OBSTACLES.barrel.w, artRise: 0, artScale: 1,
});

// The chute only exists on stage 3, so everything below is that stage.
{
  const ob = barrelAt(40);
  const run = fakeRun([ob]);
  run.updateBarrelArrivals(36);
  assert(ob.artRise > 0 && ob.artScale < 1,
    'a barrel a few beats out is lifted and shrunk toward the chute');
}
{
  const ob = barrelAt(40);
  const run = fakeRun([ob]);
  run.updateBarrelArrivals(39.2);
  assert(ob.artRise === 0 && ob.artScale === 1,
    'and is back on the road, at full size, a beat before the boot is due');
}

// THE REGRESSION. The spawner has wrapped: its barrels are numbered 240 beats
// ahead of the beat the transport reports. Before the fix the difference pinned
// the arrival at its maximum forever.
{
  const EPOCH = 240;
  const ob = barrelAt(EPOCH + 40);
  const run = fakeRun([ob], { beatEpoch: EPOCH });
  run.updateBarrelArrivals(36);
  assert(ob.artRise > 0, 'across the song loop the barrel still starts lifted');
  run.updateBarrelArrivals(39.2);
  assert(ob.artRise === 0 && ob.artScale === 1,
    'and still lands on the road — the two clocks are counted the same way');
}

// The approach window is floored, so a pushed-in camera cannot collapse the
// descent into a single frame.
{
  const ob = barrelAt(40);
  const run = fakeRun([ob], { zoom: 2.2 });
  const seen = [];
  for (let b = 36; b <= 39.4; b += 0.1) { run.updateBarrelArrivals(b); seen.push(ob.artRise); }
  const steps = new Set(seen.map((v) => v.toFixed(2))).size;
  assert(steps >= 4, `the descent still has intermediate steps at phone zoom (${steps} distinct)`);
  assert(seen[seen.length - 1] === 0, 'and finishes on the road');
}

// Abandoning the arrival puts everything back rather than freezing it.
{
  const ob = barrelAt(40);
  const run = fakeRun([ob]);
  run.updateBarrelArrivals(36);
  run.stage = { index: 1 };             // a stage with no chute
  run.updateBarrelArrivals(36);
  assert(ob.artRise === 0 && ob.artScale === 1,
    'a barrel in the air is put back on the road when the chute goes away');
}

console.log(failed ? 'BARREL ARRIVAL FAILED' : 'BARREL ARRIVAL PASSED');
process.exit(failed ? 1 : 0);
