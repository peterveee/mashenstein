/*
 * The worklet host for FZPP-6's DSP core — TNGR-2's wrapper, for the same reasons (see the
 * header of tngr2/worklet.js): the processor loads from a BLOB because the offline render
 * harness has no origin to serve a file from; an offline schedule arrives in
 * `processorOptions` because port delivery is not ordered against `startRendering()`;
 * the port is for live play. No synthesis here — the processor drains its block into the
 * core, so live and offline run the same maths by construction.
 */
import { FZPP6_DSP_SOURCE } from './dsp.js';

export const FZPP6_PROCESSOR_NAME = 'fzpp6';

const PROCESSOR_WRAPPER = `
class Fzpp6Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var opts = (options && options.processorOptions) || {};
    this.core = new Fzpp6Core({ sampleRate: sampleRate });
    this.offset = Math.max(0, Math.round(opts.frameOffset || 0));
    // The patch before the schedule: a queued note binds to whatever is installed when it
    // is applied, and applying begins the moment process() first runs.
    if (opts.patch) this.core.installPatch(opts.patch);
    if (opts.events && opts.events.length) this.core.scheduleAll(opts.events);
    this.done = false;
    this.next = 0;
    this.port.onmessage = (event) => {
      var msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'stop') { this.done = true; return; }
      if (msg.type === 'report') { this.port.postMessage(this.core.health(currentFrame)); return; }
      if (msg.type === 'events') {
        if (msg.events && msg.events.length) this.core.scheduleAll(msg.events);
        if (msg.ack !== undefined) this.port.postMessage({ type: 'ack', ack: msg.ack });
        return;
      }
      if (msg.type === 'installPatch') { this.core.installPatch(msg.patch); return; }
      this.core.schedule(msg);
    };
  }

  process(inputs, outputs) {
    if (this.done) return false;
    var out = outputs[0];
    if (!out || !out.length) return true;
    // 'currentFrame' can be one block behind on Chromium (see tngr2/worklet.js): it is a
    // floor, and the true frame is the later of it and one block on from the last.
    var at = currentFrame + this.offset;
    if (this.next > at) at = this.next;
    this.next = at + out[0].length;
    this.core.process(out, at, out[0].length, 0);
    return true;
  }
}

registerProcessor(${JSON.stringify(FZPP6_PROCESSOR_NAME)}, Fzpp6Processor);
`;

/** The complete module text handed to `addModule`: the core, then its host. */
export const fzpp6WorkletSource = () => `${FZPP6_DSP_SOURCE}\n${PROCESSOR_WRAPPER}`;

const registered = new WeakMap();

/** Whether this context can host a worklet at all — false off a secure origin. */
export const canHostFzpp6 = (ctx) => !!(ctx && ctx.audioWorklet
  && typeof ctx.audioWorklet.addModule === 'function'
  && typeof globalThis.AudioWorkletNode === 'function');

/** Register the processor on a context, once. Rejects when the context cannot host it. */
export function ensureFzpp6Dsp(ctx) {
  if (!canHostFzpp6(ctx)) {
    return Promise.reject(new Error('FZPP-6 needs an AudioWorklet, which needs a secure '
      + 'context (https, localhost, or a bundled page served from one)'));
  }
  let ready = registered.get(ctx);
  if (!ready) {
    const url = URL.createObjectURL(new Blob([fzpp6WorkletSource()], { type: 'application/javascript' }));
    ready = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    registered.set(ctx, ready);
  }
  return ready;
}

/** A node on a context already prepared by `ensureFzpp6Dsp`. */
export function createFzpp6Node(ctx, { events = null, patch = null, frameOffset = 0 } = {}) {
  return new AudioWorkletNode(ctx, FZPP6_PROCESSOR_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: {
      ...(patch ? { patch } : {}),
      ...(events?.length ? { events } : {}),
      ...(frameOffset ? { frameOffset } : {}),
    },
  });
}
