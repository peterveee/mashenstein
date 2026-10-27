import assert from 'node:assert/strict';
import { channelLevelUndo } from '../tools/lib/mixer-level-undo.js';
const before = { lanes: { bass: { gain: -3, pan: 0.4, group: 'g1', effects: [{ id: 'reverb' }] } }, master: 0.8 };
const after = structuredClone(before);
after.lanes.bass.gain = -6; after.lanes.bass.pan = -0.2;
assert.deepEqual(channelLevelUndo(before, after), [{ key: 'bass', gain: -6, pan: -0.2 }]);
assert.deepEqual(channelLevelUndo(before, structuredClone(before)), []);
const panOnly = structuredClone(before); panOnly.lanes.bass.pan = 0;
assert.deepEqual(channelLevelUndo(before, panOnly), [{ key: 'bass', pan: 0 }], 'pan undo must not cancel gain automation');
const gainOnly = structuredClone(before); gainOnly.lanes.bass.gain = 0;
assert.deepEqual(channelLevelUndo(before, gainOnly), [{ key: 'bass', gain: 0 }], 'gain undo must not cancel pan automation');
delete after.lanes.bass.gain; delete after.lanes.bass.pan;
assert.deepEqual(channelLevelUndo(before, after), [{ key: 'bass', gain: 0, pan: 0 }], 'missing level fields restore their defaults');
for (const mutate of [
  m => { m.master = 0.5; },
  m => { m.lanes.bass.group = 'g2'; },
  m => { m.lanes.bass.effects = []; },
  m => { m.lanes.bass.noteFx = { arp: { enabled: true } }; },
  m => { m.lanes.bass.automation = { gain: [0, 1] }; },
  m => { m.voice = { bassVoice: 'other' }; },
  m => { m.lanes.lead = {}; },
  m => { delete m.lanes.bass; },
  m => { m.lanes.bass.pan = NaN; },
]) {
  const next = structuredClone(before); mutate(next);
  assert.equal(channelLevelUndo(before, next), null, 'non-level changes require the existing full path');
}
assert.equal(before.lanes.bass.pan, 0.4, 'classification never mutates the undo source');
console.log('MIXER LEVEL UNDO: PASSED');
