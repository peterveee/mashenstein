// The crypt's zombies at work on Corporate Kombat's floor 23 (engine/stylePacks/officeLigne/
// zombies.js; Peter, 15 Oct 2026), there whether or not the player has been to the crypt: the
// clerk's EMPLOYEE OF THE MONTH board on the wall over the middle of a cube farm, for the three
// months before this one, and the clerk himself at the cooler at the end of that farm (on a short
// stage, a farm given up for a cooler of his own); the usher in the first lift bank; the board not
// met with a window cleaner; no print behind the purple clerk.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const Z = await import('../src/engine/stylePacks/officeLigne/zombies.js');
const { officeFrame, OFFICE_ZOOM } = await import('../src/engine/stylePacks/officeClimb.js');
const { OFFICE_CORRIDORS, officeLandmarks, officeFounderPlan, officeFurnitureCuts, officeIsWallSection } = await import('../src/engine/stylePacks/officeLigne/progression.js');
const { officeArtworks } = await import('../src/engine/stylePacks/officeLigne/artwork.js');
const { officeCleanerPlaces } = await import('../src/engine/stylePacks/officeLigne/cleanerPlacement.js');
const { totalDistFor, BASE_SPEED } = await import('../src/game/layout.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');

// ---- the months on the board
assert.deepEqual(Z.lastThreeMonths(new Date(2026, 9, 15)), ['JUL', 'AUG', 'SEP'], 'in October: July, August, September');
assert.deepEqual(Z.lastThreeMonths(new Date(2027, 0, 3)), ['OCT', 'NOV', 'DEC'], 'in January: the year before');
console.log('ok: EMPLOYEE OF THE MONTH for the three months before this one');

// ---- where they are, across a range of stage lengths
// floor 23's real lengths: 100 s at Corporate Kombat's speed, at each ASSIST SPEED, and the gallery's tour
const cab = CABINET_BY_ID.office, speed = BASE_SPEED * (1 + (cab.speedBonus || 0));
const real = totalDistFor(speed, 100, cab.mechanic), lengths = [real, totalDistFor(speed * 0.9, 100, cab.mechanic), totalDistFor(speed * 0.8, 100, cab.mechanic), 26208];
for (const T of lengths) {
  const plan = officeFounderPlan('open', T);
  const frameAt = (camX) => {
    const f = officeFrame('open', camX, 1, { left: 0, right: 480 }, OFFICE_CORRIDORS.open);
    Object.assign(f, { landmarks: officeLandmarks('open', camX, T), founderPlan: plan, totalDist: T });
    return f;
  };
  const M = Z.zombieMeetings('open', T), zp = Z.zombieFarmPlan('open', T);
  // EMPLOYEE OF THE MONTH over the middle of a cube farm, and the clerk at the cooler at the end of
  // that farm, met together about two thirds along or later; the copier by that cooler goes. On a
  // stage too short for that (ASSIST SPEED 80%), a farm is given up for it: the board in a plain wall
  // bay, the furniture under it cleared, and a cooler of the clerk's own there.
  assert.ok(zp, `${T}: the board and the clerk are on the floor`);
  assert.ok(M.board / T > 0.05 && M.board / T < 0.66, `${T}: met before office-2's third alarm (${(M.board / T).toFixed(3)})`);
  const f = frameAt(M.board), bay = Z.officeMonthBoard(f), x0 = bay.u0 - f.wall.shift, x1 = bay.u1 - f.wall.shift;
  assert.ok(f.wall.bays.some((q) => q.type === 'wall' && Math.abs(q.x0 - x0) < 0.01), `${T}: the board hangs in a plain wall bay`);
  assert.ok((x0 + x1) / 2 > 40 && (x0 + x1) / 2 < 440, `${T}: in view when met`);
  f.monthBoard = bay;
  f.wallClear = Z.zombieWallClear(f);
  assert.ok(!officeArtworks(f).some((a) => a.x < x1 && a.x + a.w > x0), `${T}: no other picture shares its bay`);
  // a window, a picture wall and a window at least between it and the canteen (any wall section);
  // no room or lift in front of it
  assert.ok(!f.landmarks.some((l) => {
    // the picture wall only from a built-in (the canteen); a room or a lift only keeps off its bay
    const [a, b] = l.section ? [l.section.u0 - f.wall.shift, l.section.u1 - f.wall.shift] : [l.x, l.x + l.w], clear = officeIsWallSection('open', l.kind) ? 470 : 300;
    return a < x1 + clear && b > x0 - clear;
  }), `${T}: not hard by the canteen, nor behind a room`);
  const cx = zp.cooler - f.mid.shift;
  if (zp.own) assert.ok(cx > 0 && cx + 34 < 480, `${T}: the clerk at his own cooler is in view with the board`);
  const cuts = [...officeFurnitureCuts(f, f.landmarks), ...Z.zombieFurnitureCuts(f)];
  if (!zp.own) {
    const farm = f.mid.items.filter((it) => it.kind === 'cubicles').find((it) => Math.abs(it.x0 - (x0 + x1) / 2) <= 71);
    assert.ok(farm, `${T}: over the start of a cube farm`);
    // the clerk's cooler: a real one, just past that farm's end (in the row's own coordinates)
    const per = OFFICE_CORRIDORS.open.mid.period, farmEnd = farm.x1 + f.mid.shift;
    assert.ok(OFFICE_CORRIDORS.open.mid.items.some((it) => it.kind === 'cooler' && ((zp.cooler - it.u) % per + per) % per < 0.01), `${T}: at a real cooler`);
    assert.ok(zp.cooler > farmEnd && zp.cooler - farmEnd < 90, `${T}: the cooler just beyond the end of the farm`);
    // and met: the farm, the cooler and the clerk standing; the copier by it gone; floor before the next desks
    const g = frameAt((zp.cooler - 240) / (OFFICE_CORRIDORS.open.mid.factor * OFFICE_ZOOM)), gx = zp.cooler - g.mid.shift;
    const cutsAt = officeFurnitureCuts(g, g.landmarks);
    assert.ok(!cutsAt.some(([a, b]) => b > gx - 260 && a < gx + 60), `${T}: the farm and the cooler standing`);
    const all = [...cutsAt, ...Z.zombieFurnitureCuts(g)];
    const copier = g.mid.items.find((it) => it.kind === 'copier' && it.x > gx && it.x - gx < 90);
    if (copier) assert.ok(all.some(([a, b]) => a <= copier.x && b >= copier.x + 40), `${T}: the copier by his cooler is taken away`);
    const next = g.mid.items.filter((it) => it.kind === 'cubicles' && it.x0 > gx).map((it) => it.x0);
    assert.ok(!next.length || Math.min(...next) - (gx + 34) > 20, `${T}: clear floor between the clerk and the next desks`);
  } else {
    assert.ok(cuts.some(([a, b]) => a <= cx - 10 && b >= cx + 60), `${T}: the furniture under the board is cleared for his own cooler`);
  }
  assert.ok(OFFICE_CORRIDORS.open.mid.items.some((it) => it.kind === 'copier'), 'the floor keeps its copiers');
  // neither turns up with a window cleaner, whose gags have the view to themselves
  {
    const f = frameAt(0), wallRate = OFFICE_CORRIDORS.open.wall.factor * OFFICE_ZOOM;
    for (const p of officeCleanerPlaces(f)) {
      const at = (p.x - 240) / wallRate;
      for (const [name, cam] of [['board', M.board]]) {
        assert.ok(Math.abs(at - cam) > 600, `${T}: the ${name} is not met with the ${p.kind} window cleaner`);
      }
    }
  }
  // no print on the wall behind the purple clerk as he creeps up on the canteen
  {
    const canteen = officeLandmarks('open', 0, T).find((l) => l.kind === 'canteen');
    const camX = canteen.worldX - 128 / canteen.rate, g = frameAt(camX);
    g.wallClear = Z.zombieWallClear(g);
    const here = g.landmarks.find((l) => l.kind === 'canteen');
    assert.ok(!officeArtworks(g).some((a) => a.x < here.x + 10 && a.x + a.w > here.x - 200), `${T}: nothing hangs behind the purple clerk`);
  }
  // the usher's lift: floor 23's first bank
  assert.ok(officeLandmarks('open', 0, T).some((l) => l.kind === 'lift' && l.at < 0.3), `${T}: floor 23 has a lift bank near the start`);
}
console.log('ok: the board over a cube farm, the clerk at its cooler, and the lift, for any stage length; clear of the window cleaners');
console.log('OFFICE ZOMBIES: PASSED');
