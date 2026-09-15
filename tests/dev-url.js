import assert from 'node:assert/strict';
import { devFinishStartPercent, devStageRoute } from '../src/engine/dev-url.js';

const query = (value) => new URLSearchParams(value);

assert.deepEqual(devStageRoute(query('stage=3-3')), {
  cabId: 'rhythm',
  stageId: 'rhythm-3',
});

assert.deepEqual(devStageRoute(query('level=1-2')), {
  cabId: 'plumber',
  stageId: 'plumber-2',
});

assert.deepEqual(devStageRoute(query('cab=plumber&stage=plumber-1')), {
  cabId: 'plumber',
  stageId: 'plumber-1',
});

assert.deepEqual(devStageRoute(query('stage=99-1')), {
  cabId: null,
  stageId: null,
});

assert.equal(devFinishStartPercent({ durationSec: 60 }, 10), 5 / 6);
assert.equal(devFinishStartPercent({ durationSec: 120 }, 10), 11 / 12);

console.log('DEV URL: PASSED');
