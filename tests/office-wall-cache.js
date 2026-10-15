import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { officeFrame } = await import('../src/engine/stylePacks/officeClimb.js');
const { OFFICE_CORRIDORS, officeFounderPlan, officeLandmarks, warmOfficeWallSections, paintOfficeWallSections } = await import('../src/engine/stylePacks/officeLigne/progression.js');
let allocations = 0;
const create = document.createElement.bind(document);
document.createElement = (tag, ...args) => {
  if (tag === 'canvas') allocations++;
  return create(tag, ...args);
};
const g = create('canvas').getContext('2d');
for (const floor of ['lobby', 'open', 'exec']) {
  const frame = (i) => {
    const f = officeFrame(floor, i * 23.1, i / 60, { left: -100, right: 700 }, OFFICE_CORRIDORS[floor]);
    f.landmarks = officeLandmarks(floor, f.camX, 22050);
    f.founderPlan = officeFounderPlan(floor, 22050);
    const rise = 80 * (.5 - .5 * Math.cos(i / 179 * Math.PI * 2));
    f.ceilingY -= rise;
    f.glass.top -= rise;
    return f;
  };
  warmOfficeWallSections(frame(0));
  const warmed = allocations;
  for (let i = 0; i < 180; i++) {
    const f = frame(i);
    warmOfficeWallSections(f);
    paintOfficeWallSections(g, f);
  }
  assert.equal(allocations, warmed, `${floor}: scrolling and camera dolly reuse warmed wall canvases`);
}
console.log('ok: all corporate floors reuse wall textures throughout camera height changes');
