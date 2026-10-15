/*
 * The worklet host for TNGR-2's DSP core.
 *
 * This file contains no synthesis. It is the thin wrapper §4 asks for: it takes the core
 * from dsp.js, wraps it in an AudioWorkletProcessor, gets that registered on a context,
 * and builds nodes. Every decision here was settled by the §3 proof gate and each one is
 * load-bearing:
 *
 *   - the processor is loaded from a BLOB rather than a second build output, because the
 *     offline render harness has no origin to serve a file from (see proof.js);
 *   - the schedule arrives in `processorOptions` rather than over the port, because port
 *     delivery is not ordered against `startRendering()` and silently loses events;
 *   - the port stays for LIVE interaction, where the audio thread runs continuously.
 *
 * The processor's own code is deliberately tiny — drain the block, ask the core to fill
 * it — so that "the live path and the render path run the same maths" is true by
 * construction rather than by review. tests/tngr2-dsp-parity.js holds it to that.
 */
import { TNGR2_DSP_SOURCE } from './dsp.js';

export const TNGR2_PROCESSOR_NAME = 'tngr2';

/**
 * The processor, wrapped around the shared core.
 *
 * `currentFrame` and `sampleRate` are worklet globals and are read HERE, at the edge, so
 * the core itself never touches them — that is what lets the identical source run in Node.
 */
const PROCESSOR_WRAPPER = `
class Tngr2Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var opts = (options && options.processorOptions) || {};
    this.core = new Tngr2Core({ sampleRate: sampleRate, maxVoices: opts.maxVoices || 16 });
    // Where this render sits on the transport. An OfflineAudioContext always counts from
    // zero, so a RANGE render starting at bar four would otherwise place every note — and
    // every free-running phase — as though the song began there. Adding the offset means
    // events keep their absolute frames and a range renders the same samples it does
    // inside a full render, which is what §10.7 asks for.
    this.offset = Math.max(0, Math.round(opts.frameOffset || 0));
    // Tables arrive already expanded — the processor never builds one, because building a
    // family is milliseconds of work and this is the audio thread.
    if (opts.tables) this.core.installTables(opts.tables);
    // The patch before the schedule: a queued note binds to whatever is installed when it
    // is APPLIED, and applying begins the moment process() first runs.
    if (opts.compiledPatch) this.core.installCompiledPatch(opts.compiledPatch);
    else if (opts.patch) this.core.installPatch(opts.patch);
    // The schedule known before the first sample. Delivered with the node, because the
    // port cannot be relied on to arrive before an offline render has already finished.
    if (opts.events && opts.events.length) this.core.scheduleAll(opts.events);
    this.done = false;
    // The frame the NEXT block starts at, as this processor counts it — see process().
    this.next = 0;
    this.port.onmessage = (event) => {
      var msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'stop') { this.done = true; return; }
      if (msg.type === 'report') { this.port.postMessage(this.core.health(currentFrame)); return; }
      // A stretch of an offline schedule, and the receipt the render waits for before it
      // moves on: by the time the reply goes out, every event in it is in the queue.
      if (msg.type === 'events') {
        if (msg.events && msg.events.length) this.core.scheduleAll(msg.events);
        if (msg.ack !== undefined) this.port.postMessage({ type: 'ack', ack: msg.ack });
        return;
      }
      if (msg.type === 'installTables') { this.core.installTables(msg.tables); return; }
      if (msg.type === 'installCompiledPatch') {
        this.core.installCompiledPatch(msg.patch); return;
      }
      if (msg.type === 'installPatch') { this.core.installPatch(msg.patch); return; }
      this.core.schedule(msg);
    };
  }

  process(inputs, outputs) {
    if (this.done) return false;
    var out = outputs[0];
    if (!out || !out.length) return true;
    // 'currentFrame' CAN BE ONE BLOCK BEHIND, so it is a floor and not the answer.
    //
    // Chromium refreshes the worklet's 'currentFrame' after each render quantum only if it
    // can take the graph lock without waiting (UpdateWorkletGlobalScopeOnRenderingThread,
    // a TryLock). Whenever the main thread holds that lock at that instant — building or
    // connecting nodes, a collected node being disposed, a busy machine stretching all of
    // it — the update is skipped and the next process() reads the previous block's frame
    // again: measured as [F, F] then [F, F + 256] at random places in every render, more
    // of them the busier the machine. The core then played that block as the one before
    // it: events in it slid to the next block, and every frame-locked phase and envelope
    // stepped back 128 samples and forward 256. That is what made two bounces of the same
    // song differ by up to -20 dB in the bars a TNGR-2 lane plays, at random.
    //
    // A stale read is only ever BEHIND, never ahead, so the true frame is the later of
    // what the global says and one block on from the last one this processor played.
    var at = currentFrame + this.offset;
    if (this.next > at) at = this.next;
    this.next = at + out[0].length;
    this.core.process(out, at, out[0].length, 0);
    return true;
  }
}

registerProcessor(${JSON.stringify(TNGR2_PROCESSOR_NAME)}, Tngr2Processor);
`;

/** The complete module text handed to `addModule`: the core, then its host. */
export const tngr2WorkletSource = () => `${TNGR2_DSP_SOURCE}\n${PROCESSOR_WRAPPER}`;

const registered = new WeakMap();

/** Whether this context can host a worklet at all — false off a secure origin. */
export const canHostTngr2 = (ctx) => !!(ctx && ctx.audioWorklet
  && typeof ctx.audioWorklet.addModule === 'function'
  && typeof globalThis.AudioWorkletNode === 'function');

/**
 * Register the TNGR-2 processor on a context, once.
 *
 * Rejects rather than resolving quietly when the context cannot host a worklet: the
 * caller would otherwise go on to build a node that throws, and the error would name the
 * node instead of the reason. The most likely reason by far is an insecure origin —
 * `about:blank` included, which is what a `setContent` page is.
 */
export function ensureTngr2Dsp(ctx) {
  if (!canHostTngr2(ctx)) {
    return Promise.reject(new Error('TNGR-2 needs an AudioWorklet, which needs a secure '
      + 'context (https, localhost, or a bundled page served from one)'));
  }
  let ready = registered.get(ctx);
  if (!ready) {
    const url = URL.createObjectURL(new Blob([tngr2WorkletSource()], { type: 'application/javascript' }));
    ready = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    registered.set(ctx, ready);
  }
  return ready;
}

/**
 * A TNGR-2 node on a context already prepared by `ensureTngr2Dsp`.
 *
 * `events` is everything known before the first sample — a bounce, a stem, a range
 * render, a scheduled bar. Live note-ons arrive afterwards on `node.port`.
 */
export function createTngr2Node(ctx, {
  channels = 2, events = null, maxVoices = 16, tables = null, patch = null,
  compiledPatch = null, frameOffset = 0,
} = {}) {
  return new AudioWorkletNode(ctx, TNGR2_PROCESSOR_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [channels],
    processorOptions: {
      maxVoices,
      ...(events?.length ? { events } : {}),
      // Structured-cloned per node rather than shared through a SharedArrayBuffer: §2
      // forbids making cross-origin isolation a site requirement just for table sharing,
      // and names the one-time copy as the alternative to take.
      ...(tables ? { tables } : {}),
      ...(compiledPatch ? { compiledPatch } : {}),
      ...(patch ? { patch } : {}),
      ...(frameOffset ? { frameOffset } : {}),
    },
  });
}
