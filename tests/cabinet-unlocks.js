// A cabinet opens on the campaign's plug total AND once the cabinet before it has been played —
// one plug anywhere in it (Peter, 15 Oct 2026: so every cabinet is met in order, which the later
// ones' callbacks count on). A cabinet already started never shuts again.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { cabinetLock, cabinetUnlocked, priorCabinet } = await import('../src/game/progress.js');
const { STAGES, UNLOCKS } = await import('../src/data/stages.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { defaultSlot } = await import('../src/engine/save.js');

// a slot with `n` plugs banked on each of the given stages
const slotWith = (plugs) => {
  const slot = defaultSlot();
  for (const [id, n] of Object.entries(plugs)) slot.campaign.plugs[id] = [0, 1, 2].map((i) => i < n);
  return slot;
};
const stagesOf = (cab) => STAGES.filter((s) => s.cabinet === cab).map((s) => s.id);
// every plug of these cabinets' stages
const allOf = (...cabs) => Object.fromEntries(cabs.flatMap(stagesOf).map((id) => [id, 3]));

assert.equal(priorCabinet(CABINETS[0].id), null, 'the first cabinet has none before it');
assert.equal(priorCabinet('office').id, 'gravity', 'Corporate Kombat comes after Gravity Grid');
assert.equal(cabinetLock(defaultSlot(), CABINETS[0].id), null, 'the first cabinet is open on a new save');
console.log('ok: the bank in order');

// The rush: every plug in the first four cabinets is enough for Corporate Kombat's total, but
// Crypt Shift, Terminal Velocity and Gravity Grid were never played.
{
  const slot = slotWith(allOf('plumber', 'speed', 'rhythm', 'frost'));
  assert.equal(cabinetLock(slot, 'crypt'), null, 'Crypt Shift: enough plugs, Frost Fortress played');
  const office = cabinetLock(slot, 'office');
  assert.equal(office.plugs, 0, 'Corporate Kombat has its plugs');
  assert.equal(office.first.id, 'gravity', '... but Gravity Grid comes first');
  assert.equal(cabinetUnlocked(slot, 'neon'), false, 'Terminal Velocity waits for Crypt Shift');
}
console.log('ok: plugs alone no longer skip a cabinet');

// One plug in the cabinet before is enough — the toaster from a failed first go.
{
  const slot = slotWith({ ...allOf('plumber', 'speed', 'rhythm', 'frost', 'crypt', 'neon'), [stagesOf('gravity')[0]]: 1 });
  assert.ok(Object.values(slot.campaign.plugs).flat().filter(Boolean).length >= UNLOCKS.office);
  assert.equal(cabinetLock(slot, 'office'), null, 'one plug in Gravity Grid opens Corporate Kombat');
}
console.log('ok: playing the cabinet before is enough; no clear needed');

// Both gates at once, and the plugs alone.
{
  const slot = slotWith({ [stagesOf('plumber')[0]]: 1 });
  assert.deepEqual(cabinetLock(slot, 'speed'), { plugs: UNLOCKS.speed, first: null }, 'one plug: Speed Zone needs its plugs only');
  const rhythm = cabinetLock(slot, 'rhythm');
  assert.equal(rhythm.plugs, UNLOCKS.rhythm, 'Rhythm Bankruptcy needs its plugs');
  assert.equal(rhythm.first.id, 'speed', '... and Speed Zone played');
}
console.log('ok: the lock says which gates are still shut');

// A save made before the rule keeps what it had: a started cabinet is open, whatever came before.
{
  const slot = slotWith({ ...allOf('plumber', 'speed', 'rhythm', 'frost'), [stagesOf('office')[0]]: 1 });
  assert.equal(cabinetLock(slot, 'office'), null, 'a started Corporate Kombat stays open without Gravity Grid');
}
console.log('ok: a cabinet already started never shuts again');
console.log('CABINET UNLOCKS: PASSED');
