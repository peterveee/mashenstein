// A cabinet opens on the campaign's plug total AND once the cabinet before it has been played —
// one plug anywhere in it (Peter, 15 Oct 2026: so every cabinet is met in order, which the later
// ones' callbacks count on). A cabinet already started never shuts again.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { cabinetLock, cabinetUnlocked, cabinetStarted, priorCabinet, lockedCabinetPrompt, lockedCabinetTalk } = await import('../src/game/progress.js');
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
  assert.deepEqual(cabinetLock(slot, 'speed'), { plugs: UNLOCKS.speed, first: null, playFirst: null }, 'one plug: Speed Zone needs its plugs only');
  const rhythm = cabinetLock(slot, 'rhythm');
  assert.equal(rhythm.plugs, UNLOCKS.rhythm, 'Rhythm Bankruptcy needs its plugs');
  assert.equal(rhythm.first.id, 'speed', '... and Speed Zone played');
}
console.log('ok: the lock says which gates are still shut');

// The sign only sends you to a cabinet you can play right now: the one before the first shut
// cabinet, and nothing past it — Déjà View does not name Corporate Kombat while that is shut itself.
// What it costs is a total to get to, not more to find (Peter, 18 Oct 2026).
{
  const fresh = defaultSlot();
  const name = (id) => CABINETS.find((c) => c.id === id).name;
  const sign = (slot, id) => lockedCabinetPrompt(name(id), cabinetLock(slot, id));
  const talk = (slot, id) => lockedCabinetTalk(cabinetLock(slot, id), 0);

  assert.equal(cabinetLock(fresh, 'speed').playFirst.id, 'plumber', 'the first shut cabinet names the open one before it');
  assert.equal(cabinetLock(fresh, 'rhythm').first.id, 'speed', 'Rhythm Bankruptcy still waits on Speed Zone');
  assert.equal(cabinetLock(fresh, 'rhythm').playFirst, null, '... but Speed Zone is shut, so it is not named');
  assert.equal(cabinetLock(fresh, 'surge').playFirst, null, 'Déjà View does not name Corporate Kombat');
  assert.equal(sign(fresh, 'speed'), `SPEED ZONE - UNLOCKS WITH ${UNLOCKS.speed} PLUGS, PLAY FIELD SERVICE FIRST`);
  assert.equal(sign(fresh, 'rhythm'), `RHYTHM BANKRUPTCY - UNLOCKS WITH ${UNLOCKS.rhythm} PLUGS`);
  assert.equal(sign(fresh, 'surge'), `DÉJÀ VIEW - UNLOCKS WITH ${UNLOCKS.surge} PLUGS`);
  assert.equal(talk(fresh, 'speed'), `NEEDS ${UNLOCKS.speed} PLUGS. YOU HAVE 0. THE MATH IS SINCERE. AND PLAY FIELD SERVICE FIRST.`);
  assert.equal(talk(fresh, 'surge'), `NEEDS ${UNLOCKS.surge} PLUGS. YOU HAVE 0. THE MATH IS SINCERE.`);

  // Every plug of the first two cabinets: the plugs are in hand for the next three, Rhythm Bankruptcy unplayed.
  const rush = slotWith(allOf('plumber', 'speed'));
  assert.equal(cabinetLock(rush, 'rhythm'), null, 'Rhythm Bankruptcy is open');
  assert.equal(cabinetLock(rush, 'frost').playFirst.id, 'rhythm', 'Frost Fortress has its plugs and names the open cabinet before it');
  assert.equal(sign(rush, 'frost'), 'FROST FORTRESS - PLAY RHYTHM BANKRUPTCY FIRST');
  assert.equal(talk(rush, 'frost'), 'YOU HAVE THE PLUGS. PLAY RHYTHM BANKRUPTCY FIRST.');
  const crypt = cabinetLock(rush, 'crypt');
  assert.equal(crypt.plugs, 0, 'Crypt Shift has its plugs');
  assert.equal(crypt.first.id, 'frost', '... and is still held behind Frost Fortress');
  assert.equal(crypt.playFirst, null, '... which is shut, so it is not named');
  assert.equal(sign(rush, 'crypt'), 'CRYPT SHIFT - UNLOCKS IN ORDER', 'nothing to name, nothing to earn: the order is what is left');
  assert.equal(talk(rush, 'crypt'), 'YOU HAVE THE PLUGS. THE CABINETS UNLOCK IN ORDER.');
  assert.equal(sign(rush, 'neon'), `TERMINAL VELOCITY - UNLOCKS WITH ${UNLOCKS.neon} PLUGS`);
}
console.log('ok: the sign names a cabinet to play only where it can be played');

// Whatever is played, a shut cabinet always has something to say, and only the first shut one on the floor
// ever points at the cabinet before it — which is then open and unplayed.
{
  const sweep = (label, slotFor) => {
    for (let n = 0; n <= CABINETS.length; n++) {
      const slot = slotFor(CABINETS.slice(0, n).map((c) => c.id));
      const shut = CABINETS.filter((c) => !cabinetUnlocked(slot, c.id));
      for (const [i, cab] of shut.entries()) {
        const lock = cabinetLock(slot, cab.id);
        assert.ok(lock.plugs || lock.first, `${label} ${n}: ${cab.id} is shut for a reason`);
        const line = lockedCabinetPrompt(cab.name, lock);
        assert.ok(!line.endsWith('- '), `${label} ${n}: ${cab.id} says something`);
        if (!lock.playFirst) continue;
        assert.equal(i, 0, `${label} ${n}: ${cab.id} is not the first shut cabinet, so it names none`);
        assert.equal(lock.playFirst.id, lock.first.id, `${label} ${n}: it names the one before it`);
        assert.equal(cabinetUnlocked(slot, lock.playFirst.id), true, `${label} ${n}: ${lock.playFirst.id} can be played`);
        assert.equal(cabinetStarted(slot, lock.playFirst.id), false, `${label} ${n}: ${lock.playFirst.id} has not been played`);
      }
    }
  };
  sweep('every plug in the first', (ids) => slotWith(allOf(...ids)));
  sweep('one plug in the first', (ids) => slotWith(Object.fromEntries(ids.map((id) => [stagesOf(id)[0], 1]))));
}
console.log('ok: only the first shut cabinet names one, and it can be played');

// A save made before the rule keeps what it had: a started cabinet is open, whatever came before.
{
  const slot = slotWith({ ...allOf('plumber', 'speed', 'rhythm', 'frost'), [stagesOf('office')[0]]: 1 });
  assert.equal(cabinetLock(slot, 'office'), null, 'a started Corporate Kombat stays open without Gravity Grid');
}
console.log('ok: a cabinet already started never shuts again');
console.log('CABINET UNLOCKS: PASSED');
