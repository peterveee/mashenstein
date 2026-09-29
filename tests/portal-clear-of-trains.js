// A relay portal never stands in a neon train (Peter, 29 Sep 2026: "i noticed a
// portal in the middle of a train, i don't like that at all"). The portal spawns a
// view past the right edge wherever the relay clock says, and a train is a standing
// car across the lane; `portalClearOfTrains` steps it on past the nose.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

function fakeRun(routes, cabinet = 'neon') {
  const r = Object.create(RunState.prototype);
  r.cabinet = { id: cabinet };
  r.routes = routes;
  return r;
}
const train = (x, w) => ({ kind: 'island', rise: 33, x, w });

{
  const run = fakeRun([train(1000, 600)]);
  const px = run.portalClearOfTrains(1300);
  assert(px >= 1600 + 40, `a portal mid-train steps past the nose (${px})`);
}
{
  const run = fakeRun([train(1000, 600)]);
  assert(run.portalClearOfTrains(980) > 1600, 'one just short of the tail is moved too (it would overlap the car)');
  assert(run.portalClearOfTrains(500) === 500, 'one on open road stays where it is');
}
{
  // Two trains close together: clearing the first must not drop it in the second.
  const run = fakeRun([train(1000, 600), train(1680, 500)]);
  const px = run.portalClearOfTrains(1300);
  assert(px > 2180, `a portal pushed out of one train is not left in the next (${px})`);
}
{
  // A low island (a platform, not a train) and other cabinets are left alone.
  assert(fakeRun([{ kind: 'island', rise: 12, x: 1000, w: 600 }]).portalClearOfTrains(1300) === 1300,
    'a low island is not a train');
  assert(fakeRun([train(1000, 600)], 'plumber').portalClearOfTrains(1300) === 1300,
    'only the neon cabinet has trains');
}

if (failed) process.exit(1);
console.log('PORTAL CLEAR OF TRAINS: PASSED');
