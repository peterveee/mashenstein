import { TOON_SPECS } from '../src/sprites/toons.js';
import { actionFor, actionOptions, actionPose } from '../tools/lib/character-editor-actions.js';

const ok = (condition, message) => { if (!condition) throw new Error(message); };
for (const [id, key] of [['lorenzo', 'wrench'], ['fernwick', 'bow'], ['b33p', 'shoot'], ['kiko', 'shoot'], ['clara', 'shoot'], ['grumpos', 'axe'], ['raymn', 'fist']]) {
  const action = actionFor(id, TOON_SPECS[id] || {}, key);
  ok(action?.key === key, `${id} has no ${key} attack action`);
  const before = actionPose({ kind: 'run', phase: 0, grounded: true }, action, .1);
  const after = actionPose({ kind: 'run', phase: 0, grounded: true }, action, .9);
  if (key === 'axe') ok(!before.axeThrown && after.axeThrown, 'axe release did not cross its release point');
  if (key === 'wrench') ok(!before.wrenchThrown && after.wrenchThrown, 'wrench release did not cross its release point');
  if (key === 'fist') ok(!before.headless && after.headless, 'rocket fist did not hide the throwing glove after release');
}
const rusty = actionFor('rusty', TOON_SPECS.rusty, 'bundle');
ok(rusty?.key === 'bundle', 'Rusty bundle throw is not exposed as an attack');
ok(!actionPose({ kind: 'run' }, rusty, .2).axeThrown && actionPose({ kind: 'run' }, rusty, .9).axeThrown, 'Rusty cane ownership did not cross release');
ok(actionOptions('gnash', TOON_SPECS.gnash).length === 0, 'dash was incorrectly presented as a projectile attack');
console.log('CHARACTER EDITOR ACTIONS: PASSED');
