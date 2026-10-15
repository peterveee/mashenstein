import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { gravityStarWarmJobs, titleStarfield } = await import('../src/dev/space-life.js');
const create = document.createElement.bind(document);
let allocations = 0;
document.createElement = (tag, ...args) => { if (tag === 'canvas') allocations++; return create(tag, ...args); };
const jobs = gravityStarWarmJobs();
assert.equal(jobs.length, 3);
for (const [i, job] of jobs.entries()) { job(); assert.equal(allocations, i + 1, 'one star layer per cooperative job'); }
const g = create('canvas').getContext('2d');
for (let frame = 0; frame < 120; frame++) titleStarfield(g, {cam:frame * 3, t:frame / 60, view:300});
assert.equal(allocations, 3, 'no star canvas allocation during play after warmup');
for (const job of gravityStarWarmJobs()) job();
assert.equal(allocations, 3, 'retry reuses all three layers');
console.log('ok: gravity star layers warm incrementally and are reused during play and retries');
