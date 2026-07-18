// Save migration: a v1-era blob imports coins/hiScore/muted; corrupt data
// falls back to fresh defaults without throwing.
import { installDom } from './dom-stub.js';
const dom = installDom();

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// Case 1: v1 blob present.
dom.store['superMashBros.v1'] = JSON.stringify({ coins: 1234, hiScore: 9876, muted: true });
{
  const { Save } = await import('../src/engine/save.js');
  const s = new Save().load();
  assert(s.data.version === 2, 'migrated to v2');
  assert(s.data.slots[0] && s.data.slots[0].coins === 1234, 'v1 coins imported into slot 1');
  assert(s.data.slots[0].overtime.best === 9876, 'v1 high score imported');
  assert(s.data.settings.muted === true, 'v1 mute imported');
}

// Case 2: corrupt v2 data.
dom.store['mashenstein.v2'] = '{definitely not json';
{
  const { Save } = await import('../src/engine/save.js?x=2').catch(() => import('../src/engine/save.js'));
  const s = new Save().load();
  assert(s.data.version === 2, 'corrupt save falls back to defaults');
}

// Case 3: old v2 save missing new fields gets deep-defaulted.
const { defaultSlot, Save } = await import('../src/engine/save.js');
const partial = { version: 2, settings: {}, slots: [{ coins: 7 }, null, null] };
dom.store['mashenstein.v2'] = JSON.stringify(partial);
{
  const s = new Save().load();
  assert(s.data.slots[0].coins === 7, 'existing field preserved');
  assert(s.data.slots[0].bench && s.data.slots[0].bench.shield === 1, 'missing fields deep-defaulted');
  assert(s.data.settings.assistSpeed === 100, 'missing settings defaulted');
}

console.log(failed ? 'MIGRATION: FAILED' : 'MIGRATION: PASSED');
process.exit(failed ? 1 : 0);
