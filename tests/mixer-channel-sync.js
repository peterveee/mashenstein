import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
const source = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const code = name => { const node = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); return source.slice(node.start, node.end); };
const frames = new Map(), writes = [];
let sequence = 0;
const desk = new Function('frames', 'writes', 'nextId', `
  let trackId = 'a', channelMixSyncFrame = 0;
  const pendingChannelMixSync = new Map();
  const values = {};
  const requestAnimationFrame = fn => { const id = nextId(); frames.set(id, fn); return id; };
  const cancelAnimationFrame = id => frames.delete(id);
  const flushChannelMixControls = lane => writes.push([trackId, lane, values[lane]]);
  ${code('syncChannelMixControls')}
  ${code('cancelChannelMixSync')}
  return { sync: syncChannelMixControls, cancel: cancelChannelMixSync, values,
    switchSong(id) { cancelChannelMixSync(); trackId = id; },
    pending: () => pendingChannelMixSync.size };
`)(frames, writes, () => ++sequence);
const paint = () => { const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(); };
for (let i = 0; i < 500; i++) { desk.values.bass = i; desk.sync('bass'); }
assert.equal(frames.size, 1); assert.equal(writes.length, 0);
desk.values.lead = 42; desk.sync('lead');
paint(); assert.deepEqual(writes, [['a', 'bass', 499], ['a', 'lead', 42]]);
assert.equal(desk.pending(), 0);
desk.values.bass = 600; desk.sync('bass'); desk.switchSong('b');
assert.equal(frames.size, 0); assert.equal(desk.pending(), 0);
paint(); assert.equal(writes.length, 2);
desk.sync('bass'); desk.cancel(); paint(); assert.equal(writes.length, 2, 'rack replacement cancels obsolete work');
desk.values.bass = 7; desk.sync('bass'); paint(); assert.deepEqual(writes.at(-1), ['b', 'bass', 7]);
console.log('MIXER CHANNEL SYNC: PASSED');
