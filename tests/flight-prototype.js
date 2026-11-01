import assert from 'node:assert/strict';
import { FlightModel, flightLayout, BACKUP } from '../src/game/flight/model.js';
const advance = (m, seconds, up = false, down = false, rate = 60) => {
  for (let i = 0; i < seconds * rate; i++) m.update(1 / rate, up, down);
};
for (const height of [270, 1040]) {
  const l = flightLayout(480, height), m = new FlightModel(l);
  advance(m, 5, true); assert.equal(m.y, l.top + l.radius);
  advance(m, 8, false, true); assert.equal(m.y, l.bottom - l.radius);
  const n = new FlightModel(l); advance(n, 1, true, true);
  assert.equal(n.y, (l.top + l.bottom) / 2);
}
const a = new FlightModel(flightLayout(480, 1040)), b = new FlightModel(flightLayout(480, 1040));
advance(a, 1, true, false, 30); advance(b, 1, true, false, 120);
assert.ok(Math.abs(a.y - b.y) < 1e-8);
a.damageBoss(80); assert.equal(a.phase, 'midpoint'); assert.equal(a.hp, 50);
a.damageBoss(100); assert.equal(a.hp, 50); assert.equal(a.checkpoint, 0);
advance(a, 3.1); assert.equal(a.checkpoint, 1); assert.equal(a.phase, 'second');
a.damageBoss(12); a.hull = 1; a.shots.push({x: 100}); a.restore();
assert.equal(a.hp, 50); assert.equal(a.hull, 4); assert.equal(a.shots.length, 0);
const first = JSON.stringify({ y: a.y, by: a.by }); advance(a, 1); a.restore();
assert.equal(JSON.stringify({y: a.y, by: a.by}), first);
a.resize(flightLayout(480, 270)); assert.ok(a.y >= a.layout.top && a.y <= a.layout.bottom);
assert.equal(a.shots.length, 0); assert.ok(a.lead > 0);
a.damageBoss(50); assert.equal(a.phase, 'won'); assert.equal(a.hp, 0);
console.log('Flight prototype: bounds, simultaneous input, fixed-step movement, phase latch, checkpoint restore and resize passed.');

// A tracking pilot can actually land pellets and finish both orientations.
// Invulnerability isolates target reachability from dodge policy.
for (const height of [270, 1066]) {
  const m = new FlightModel(flightLayout(480, height));
  for (let i = 0; i < 90 * 120 && m.phase !== 'won'; i++) {
    m.grace = 2; const delta = m.by - m.y; m.update(1 / 120, delta < -2, delta > 2);
  }
  assert.equal(m.phase, 'won', `reachable target at height ${height}`);
}
console.log('Both layouts can complete through real pellet collisions.');

// ACT III: the balloon's halfway, the false defeat, BACKUP POWER and its core.
// A tracking pilot (invulnerable, so only reachability is under test) must get
// through every phase in order in both layouts, and a death in BACKUP POWER
// restores BACKUP POWER — not the balloon.
for (const height of [270, 1066]) {
  const m = new FlightModel(flightLayout(480, height), 7, { act: 3 });
  const seen = [];
  for (let i = 0; i < 240 * 120 && m.phase !== 'won'; i++) {
    m.grace = 2;
    const aim = m.phase === 'final' ? m.by - 7 * m.layout.scale : m.by;
    const delta = aim - m.y;
    m.update(1 / 120, delta < -2, delta > 2);
    if (seen[seen.length - 1] !== m.phase) seen.push(m.phase);
  }
  assert.deepEqual(seen.filter((p) => p !== 'dead'), ['first', 'midpoint', 'second', 'fall', 'final', 'won'],
    `act III at height ${height} goes through every phase (${seen})`);
  assert.equal(m.checkpoint, 2);
  m.phase = 'dead'; m.restore();
  assert.equal(m.phase, 'final'); assert.equal(m.finalHp, BACKUP.hp); assert.equal(m.hull, 4);
}
console.log('Act III: balloon, halfway, false defeat, BACKUP POWER and its core reached in both layouts; a death restores BACKUP POWER.');
