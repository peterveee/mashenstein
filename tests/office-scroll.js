import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { bakeStrip, drawStrip } = await import('../src/engine/stylePacks/officeLigne/line.js');
const { officeFrame, FACTORS, OFFICE_ZOOM, WALL_BASE, LANE_TOP } = await import('../src/engine/stylePacks/officeClimb.js');
const { OFFICE_CORRIDORS, OFFICE_FURNITURE_BASE, officeLandmarks } = await import('../src/engine/stylePacks/officeLigne/progression.js');
const { YH, xOf } = await import('../src/engine/stylePacks/officeLigne/line.js');
const { officeArtworks } = await import('../src/engine/stylePacks/officeLigne/artwork.js');

const strip = bakeStrip(1200, 20, 204, 2, () => {});
for (const tile of strip.tiles) assert.equal(tile.c.width, tile.w * 2 + 2, 'filtered tiles retain neighbour pixels');
// The 4x wall was one image 8 k px wide until 15 Oct 2026 — past a phone's texture size, and the
// office's frame doubled for it. It tiles now, every tile about 1 k px, and each tile overlaps
// its neighbours by the source pixel it carries, so no seam pixel is ever part-covered.
const wallStrip = bakeStrip(1200, 20, 204, 4, () => {}, true);
assert.ok(wallStrip.overlap && !wallStrip.image && wallStrip.tiles.length > 4, 'the fine wall is tiled');
for (const tile of wallStrip.tiles) assert.ok(tile.c.width <= 1026, `a wall tile stays inside the texture budget (${tile.c.width} px)`);
function positions(shift, coverage) {
  const draws = [];
  const ctx = {
    __officeCoverage: coverage,
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    drawImage: (...args) => draws.push(args),
  };
  drawStrip(ctx, strip, shift);
  return draws;
}
for (const coverage of [undefined, { left: -600, right: 1000 }]) {
  const a = positions(10.1, coverage), b = positions(10.2, coverage);
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i][0], b[i][0]);
    assert.ok(Math.abs(a[i][5] - b[i][5] - 0.1) < 1e-9, 'subpixel camera changes move every cached tile continuously');
  }
  assert.deepEqual(positions(10.1 + strip.P, coverage), a, 'period wrapping preserves the same image positions');
}
const wallDraws = (shift) => {
  const draws = [];
  drawStrip({
    __officeCoverage: { left: -600, right: 1000 },
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    drawImage: (...args) => draws.push(args),
  }, wallStrip, shift);
  return draws;
};
const wallA = wallDraws(10.1), wallB = wallDraws(10.2);
assert.equal(wallA.length, wallB.length);
for (let i = 0; i < wallA.length; i++) {
  assert.equal(wallA[i][0], wallB[i][0]);
  assert.ok(Math.abs(wallA[i][5] - wallB[i][5] - 0.1) < 1e-9,
    'each wall tile retains fractional camera movement');
}
// within a copy of the period, each tile's drawn span runs into the next one's
const spans = wallA.map((d) => [d[5], d[5] + d[7]]).sort((p, q) => p[0] - q[0]);
for (let i = 1; i < spans.length; i++) {
  if (spans[i][0] > spans[i - 1][1] + 1) continue; // the next copy of the period
  assert.ok(spans[i][0] < spans[i - 1][1] - 0.2, 'neighbouring wall tiles overlap, so no seam pixel is part-covered');
}
assert.deepEqual(wallDraws(10.1 + wallStrip.P), wallA);
for (const floor of ['lobby', 'open', 'exec']) {
  const coverage = { left: -2000, right: 2000 };
  const a = officeFrame(floor, 100.1, 0, coverage, OFFICE_CORRIDORS[floor]);
  const b = officeFrame(floor, 100.2, 0, coverage, OFFICE_CORRIDORS[floor]);
  const wallRate = (WALL_BASE - YH) / (LANE_TOP - YH);
  const furnitureRate = (OFFICE_FURNITURE_BASE - YH) / (LANE_TOP - YH);
  assert.ok(Math.abs(wallRate - 0.16) < 1e-9, 'the wall is a third slower');
  assert.ok(Math.abs(furnitureRate - 0.28) < 1e-9, 'furniture stands deeper on the projected floor');
  assert.equal(OFFICE_CORRIDORS[floor].mid.factor, furnitureRate);
  for (const l of officeLandmarks(floor, 0, 16800).filter(l => l.section))
    assert.ok(Math.abs(l.rate - wallRate * OFFICE_ZOOM) < 1e-9, 'a wall section scrolls with the wall');
  for (const [rate, shift] of [[wallRate, a.wall.shift], [furnitureRate, a.mid.shift]]) {
    assert.ok(Math.abs(xOf(0, a.camX * OFFICE_ZOOM, rate) - xOf(0, 0, rate) + shift) < 1e-9,
      'each backdrop layer moves exactly with the floor beneath it');
  }
  assert.equal(FACTORS.front, 1, 'foreground decoration also scrolls more slowly');
  const clockA = a.wall.hangs.find(h => h.kind === 'clock');
  if (clockA) {
    const clockB = b.wall.hangs.find(h => h.kind === 'clock' && h.i === clockA.i);
    assert.ok(Math.abs(clockA.cx - clockB.cx - (b.wall.shift - a.wall.shift)) < 1e-9,
      'clock overlays travel the same exact distance as their cached wall');
  }
  const artA = officeArtworks(a), artB = officeArtworks(b);
  assert.ok(artA.length > 0);
  for (const art of artA) {
    const next = artB.find(other => other.seed === art.seed);
    assert.ok(next);
    assert.ok(Math.abs(art.x - next.x - (b.wall.shift - a.wall.shift)) < 1e-9,
      'artwork stays attached to the wall during subpixel movement');
  }
}
console.log('ok: continuous office strip scrolling, overlay alignment, wrap and filter gutters');
