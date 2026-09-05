import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { BASE_CULL_MARGIN: base, LOOP_CULL_MARGIN: loop, entityInRenderBand: visible } = await import('../src/game/run.js');
assert(base < loop, 'ordinary props no longer inherit the ring margin');
for (const cam of [0, 100.375, -12.25]) for (const zoom of [1.3, 1.6, 2, 2.2]) {
  const view = 480 / zoom;
  for (const isLoop of [false, true]) {
    const margin = isLoop ? loop : base;
    const e = { x: cam - margin - 20, w: 20, live: true, def: { isLoop } };
    assert(visible(e, cam, view));
    e.x -= 0.001; assert(!visible(e, cam, view));
    e.x = cam + view + margin; assert(visible(e, cam, view));
    e.x += 0.001; assert(!visible(e, cam, view));
    assert.equal(e.live, true);
  }
  const ring = { x: cam - loop, w: 10, def: { isLoop: true } };
  assert(visible(ring, cam, view));
  assert(!visible({ ...ring, def: {} }, cam, view));
}
const entities = Array.from({ length: 100 }, (_, i) => ({ x: i * 10, w: 10, live: true, def: {} }));
const before = JSON.stringify(entities);
const narrow = entities.filter(e => visible(e, 300, 480 / 2.2)).length;
const previous = entities.filter(e => e.x + e.w >= 300 - loop && e.x <= 300 + 480 / 2.2 + loop).length;
assert(narrow < previous);
assert.equal(JSON.stringify(entities), before);
console.log(`ok: culling edges/zoom/immutability; margins ${base}/${loop}; ordinary draws ${previous} -> ${narrow}`);
