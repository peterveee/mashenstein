/*
 * The worklet host for a WebAssembly DSP core — Stage 0 of docs/WASM-audio-engine-plan.md.
 *
 * Proves the three things every later stage stands on, with a core too small to be wrong
 * (hello.c, a rotating phasor):
 *
 *   - a .wasm compiled from C runs inside an AudioWorkletProcessor, in every browser the
 *     game plays in, live and offline;
 *   - the wasm arithmetic is bit-identical to the same recurrence in JS (`helloReference`),
 *     which is what lets the real port be nulled against src/engine/mrdr3/dsp.js;
 *   - which way of getting the code INTO the worklet works where. Two are offered:
 *       'bytes'  — the raw bytes go in processorOptions and the processor compiles them
 *                  synchronously (cached per worklet scope, so once per context);
 *       'module' — the main thread compiles, and the WebAssembly.Module itself is
 *                  structured-cloned in. Not every engine allows that clone.
 *
 * The processor is loaded from a Blob, like mrdr3/worklet.js, so the offline render
 * harness — which has no origin to serve a file from — can host it too.
 *
 * A constructor that throws marks the processor dead with no message anywhere useful,
 * so construction failures are caught and posted to the port instead, and the node
 * renders silence.
 */
import { HELLO_WASM_BASE64 } from './hello.wasm.js';

export const HELLO_PROCESSOR = 'mash-wasm-hello';
const BLOCK = 128;

/** The .wasm bytes — atob in a browser, Buffer in Node. */
export function helloWasmBytes() {
  if (typeof atob === 'function') {
    const s = atob(HELLO_WASM_BASE64);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(globalThis.Buffer.from(HELLO_WASM_BASE64, 'base64'));
}

/** The rotation and starting phase for a tone — computed ONCE, here, and handed to both sides. */
export function helloStart(rate, hz, phase = 0) {
  const w = 2 * Math.PI * hz / rate;
  return { cosW: Math.cos(w), sinW: Math.sin(w), re: Math.cos(phase), im: Math.sin(phase) };
}

/** The same recurrence in JS. Must equal the wasm output bit for bit. */
export function helloReference(rate, hz, frames, phase = 0) {
  const { cosW, sinW, re: r0, im: i0 } = helloStart(rate, hz, phase);
  const out = new Float32Array(frames);
  let r = r0;
  let i = i0;
  for (let n = 0; n < frames; n++) {
    out[n] = i;
    const nr = r * cosW - i * sinW;
    i = r * sinW + i * cosW;
    r = nr;
  }
  return out;
}

const SOURCE = `
var MASH_WASM_MODULES = {};

class MashWasmHello extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var o = (options && options.processorOptions) || {};
    this.exports = null;
    this.ticks = o.sab ? new Int32Array(o.sab) : null;
    var how = o.module ? 'module' : 'bytes';
    try {
      var mod = o.module;
      if (!mod) {
        mod = MASH_WASM_MODULES[o.key];
        if (!mod) mod = MASH_WASM_MODULES[o.key] = new WebAssembly.Module(o.bytes);
      }
      var e = new WebAssembly.Instance(mod, {}).exports;
      e.start(o.cosW, o.sinW, o.re, o.im);
      this.exports = e;
      this.view = new Float32Array(e.memory.buffer, e.block(), ${BLOCK});
      this.port.postMessage({ type: 'ready', how: how });
    } catch (err) {
      this.port.postMessage({ type: 'error', how: how, message: String(err && err.message || err) });
    }
  }

  process(inputs, outputs) {
    var out = outputs[0];
    if (!out || !out.length || !this.exports) return true;
    var n = out[0].length;
    this.exports.render(n);
    for (var c = 0; c < out.length; c++) out[c].set(n === ${BLOCK} ? this.view : this.view.subarray(0, n));
    if (this.ticks) Atomics.add(this.ticks, 0, 1);
    return true;
  }
}
registerProcessor(${JSON.stringify(HELLO_PROCESSOR)}, MashWasmHello);
`;

/** The module text handed to addModule. Exported for tests. */
export const helloProcessorSource = () => SOURCE;

const registered = new WeakMap();

/** Register the processor on a context, once. Resolves true when ready, false if it cannot. */
export function prepareWasmHello(ctx) {
  if (!ctx || !ctx.audioWorklet) return Promise.resolve(false);
  let p = registered.get(ctx);
  if (!p) {
    const url = URL.createObjectURL(new Blob([SOURCE], { type: 'application/javascript' }));
    p = ctx.audioWorklet.addModule(url)
      .then(() => true, () => false)
      .finally(() => URL.revokeObjectURL(url));
    registered.set(ctx, p);
  }
  return p;
}

/**
 * A tone node. `via` is 'bytes' or 'module' (see the header). `sab`, if given, is a
 * SharedArrayBuffer whose first Int32 the processor increments once per block — the
 * Stage 4 question of whether shared memory reaches the audio thread at all.
 * `node.port` delivers { type: 'ready' | 'error', how, message }.
 */
export function createWasmHelloNode(ctx, { hz = 440, phase = 0, via = 'bytes', sab = null } = {}) {
  const opts = { key: 'hello', ...helloStart(ctx.sampleRate, hz, phase), sab };
  if (via === 'module') opts.module = new WebAssembly.Module(helloWasmBytes());
  else opts.bytes = helloWasmBytes();
  return new AudioWorkletNode(ctx, HELLO_PROCESSOR, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: opts,
  });
}
