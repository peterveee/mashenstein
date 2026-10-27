import assert from 'node:assert/strict';
import { syncArrangementScroll, followArrangementScroll, forgetArrangementGeometry } from '../tools/mixer-scroll.js';

const element = () => ({
  dataset: {}, listeners: {}, scrollLeft: 0, clientWidth: 500, scrollWidth: 1500,
  style: { values: new Map(), writes: 0,
    setProperty(k, v) { this.writes++; this.values.set(k, v); },
    getPropertyValue(k) { return this.values.get(k) || ''; } },
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
  fire(type) { for (const fn of this.listeners[type] || []) fn(); },
});
const ids = Object.fromEntries(['arrgrid', 'upperwork', 'arrscroll', 'arrscroll-content', 'barsarea'].map(id => [id, element()]));
const bars = { scrollWidth: 1300, offsetLeft: 200 };
ids.arrgrid.querySelector = () => bars;
globalThis.document = { getElementById: id => ids[id] };
const grid = ids.arrgrid, rail = ids.arrscroll, ruler = ids.barsarea, upper = ids.upperwork;
for (let i = 0; i < 12; i++) syncArrangementScroll();
assert.equal(grid.listeners.scroll.length, 1, 'refitting does not accumulate grid listeners');
assert.equal(rail.listeners.scroll.length, 1, 'refitting does not accumulate rail listeners');
assert.equal(upper.dataset.arrscroll, '1');
assert.equal(upper.style.writes, 0, 'scroll geometry never invalidates the whole arrangement subtree');
assert.equal(ruler.style.getPropertyValue('--arr-content-w'), '1300px');
grid.scrollLeft = 321; grid.fire('scroll');
assert.equal(rail.scrollLeft, 321);
assert.equal(ruler.style.getPropertyValue('--arr-scroll'), '321px');
const writes = ruler.style.writes;
grid.fire('scroll');
assert.equal(ruler.style.writes, writes, 'vertical-only scrolling does not rewrite horizontal geometry');
rail.scrollLeft = 500; rail.fire('scroll'); grid.fire('scroll');
assert.equal(grid.scrollLeft, 500); assert.equal(ruler.style.getPropertyValue('--arr-scroll'), '500px');
forgetArrangementGeometry(); followArrangementScroll(0);
grid.fire('scroll'); assert.equal(grid.scrollLeft, 0); assert.equal(rail.scrollLeft, 0);
followArrangementScroll(1); grid.fire('scroll');
assert.ok(grid.scrollLeft > 0, 'playhead follow still pages horizontally');
assert.equal(rail.scrollLeft, grid.scrollLeft);
grid.scrollWidth = grid.clientWidth; grid.scrollLeft = 0;
syncArrangementScroll(); forgetArrangementGeometry(); followArrangementScroll(1);
assert.equal(upper.dataset.arrscroll, '0'); assert.equal(grid.scrollLeft, 0);
assert.equal(ruler.style.getPropertyValue('--arr-scroll'), '0px', 'fitting/reset clears the ruler offset');
console.log('MIXER SCROLL: PASSED');
