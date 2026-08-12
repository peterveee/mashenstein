import {
  encodeMashFreeze, decodeMashFreeze, encodeMashFreezeBundle, decodeMashFreezeBundle,
  writeMashFreezeBundle,
} from '../tools/lib/mash-freeze.js';

let failed = false;
const assert = (condition, message) => {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${message}`);
  if (!condition) failed = true;
};

const left = new Float32Array([0, -0, 0.125, -0.75, Math.fround(Math.PI)]);
const right = new Float32Array([1, -1, 0.000001, 0.5, Math.fround(Math.E)]);
const bytes = encodeMashFreeze({
  metadata: { trackId: 'song', lane: 'lead', fromBar: 1, toBar: 2,
    fingerprint: '{"exact":true}', sampleRate: 44100 },
  left, right,
});
const decoded = decodeMashFreeze(bytes);
const bits = (array) => [...new Uint32Array(array.buffer, array.byteOffset, array.length)];
assert(JSON.stringify(bits(decoded.left)) === JSON.stringify(bits(left))
  && JSON.stringify(bits(decoded.right)) === JSON.stringify(bits(right)),
  'the custom freeze format round-trips Float32 PCM without changing one bit');
assert(decoded.metadata.trackId === 'song' && decoded.metadata.fromBar === 1
  && decoded.metadata.pcmCrc32?.length === 8,
  'the musical scope, fingerprint and checksum survive in the versioned header');

const damaged = bytes.slice(); damaged[damaged.length - 1] ^= 1;
let refused = false;
try { decodeMashFreeze(damaged); } catch (error) { refused = /checksum/.test(error.message); }
assert(refused, 'corrupted PCM is refused instead of loaded into the audio graph');

assert(decodeMashFreeze(bytes, { pcm: false }).metadata.frames === left.length,
  'reload can inspect a saved-file header without materialising PCM channels');

const secondLeft = new Float32Array([0.25, -0.5]);
const secondRight = new Float32Array([-0.25, 0.5]);
const bundleInput = {
  metadata: { trackId: 'song', title: 'Bundle Song' },
  entries: [
    { metadata: { trackId: 'song', lane: 'lead', scopeId: '1-2' }, left, right },
    { metadata: { trackId: 'song', lane: 'bass', scopeId: 'all' },
      left: secondLeft, right: secondRight },
  ],
};
const bundleBytes = encodeMashFreezeBundle(bundleInput);
const bundle = decodeMashFreezeBundle(bundleBytes);
assert(bundle.metadata.trackId === 'song' && bundle.entries.length === 2
  && bundle.entries[0].metadata.lane === 'lead' && bundle.entries[1].metadata.lane === 'bass',
  'one versioned song bundle carries every independently scoped freeze');
assert(JSON.stringify(bits(bundle.entries[0].left)) === JSON.stringify(bits(left))
  && JSON.stringify(bits(bundle.entries[1].right)) === JSON.stringify(bits(secondRight)),
  'bundle entries retain bit-exact PCM through their individual checksummed records');

const damagedBundle = bundleBytes.slice(); damagedBundle[damagedBundle.length - 1] ^= 1;
let bundleRefused = false;
try { decodeMashFreezeBundle(damagedBundle); }
catch (error) { bundleRefused = /bundle checksum/.test(error.message); }
assert(bundleRefused, 'corruption anywhere in the multi-freeze payload invalidates the bundle');

const chunks = [];
let progress = 0;
const written = await writeMashFreezeBundle({
  async write(bytes) { chunks.push(new Uint8Array(bytes)); },
}, bundleInput, { onProgress: (fraction) => { progress = fraction; } });
const streamed = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
let streamedAt = 0;
for (const chunk of chunks) { streamed.set(chunk, streamedAt); streamedAt += chunk.length; }
assert(written.byteLength === bundleBytes.length && progress === 1
  && Buffer.compare(streamed, bundleBytes) === 0,
  'the bounded-memory writer produces the exact established bundle format without assembling full PCM copies');

console.log(failed ? '\nMASH FREEZE: FAILED' : '\nMASH FREEZE: PASSED');
process.exit(failed ? 1 : 0);
