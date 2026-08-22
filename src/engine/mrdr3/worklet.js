/*
 * The worklet host for MRDR-3's DSP core.
 *
 * No synthesis here. It takes the core from dsp.js, wraps it in an AudioWorkletProcessor,
 * registers it on a context and builds nodes. Every decision is inherited from TNGR-2's
 * host, where each was settled by its own proof gate:
 *
 *   - the processor is loaded from a BLOB rather than a second build output, because the
 *     offline render harness has no origin to serve a file from;
 *   - the schedule arrives in `processorOptions` rather than over the port, because port
 *     delivery is not ordered against `startRendering()` and silently loses events;
 *   - the port stays for LIVE interaction, where the audio thread runs continuously.
 *
 * The processor's own code is deliberately tiny — drain the block, ask the core to fill
 * it — so that "the live path and the render path run the same maths" is true by
 * construction rather than by review. tests/mrdr3-dsp-parity.js holds it to that.
 */
import { MRDR3_DSP_SOURCE } from './dsp.js';

export const MRDR3_PROCESSOR_NAME = 'mrdr3';

const PROCESSOR_WRAPPER = `
class Mrdr3Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var opts = (options && options.processorOptions) || {};
    this.core = new Mrdr3Core({
      // The worklet global is read HERE, at the edge, so the core itself never touches
      // it — which is exactly what lets the identical source run in Node.
      rate: sampleRate,
      maxGroups: opts.maxGroups || 12,
      maxTones: opts.maxTones || 4,
    });
    // Where this render sits on the transport. An OfflineAudioContext always counts from
    // zero, so a RANGE render starting at bar four would otherwise place every note as
    // though the song began there.
    this.offset = Math.max(0, Math.round(opts.frameOffset || 0));
    // Tables arrive already expanded — the processor never builds one, because building a
    // pyramid is hundreds of milliseconds and this is the audio thread.
    if (opts.tables) this.core.installTables(opts.tables);
    if (opts.noise) this.core.installNoise(opts.noise);
    // The patch before the schedule: a queued note binds to whatever is installed when it
    // is applied, and applying begins the moment process() first runs.
    if (opts.patch) this.core.installPatch(opts.patch);
    if (opts.events && opts.events.length) this.core.scheduleAll(opts.events);
    this.done = false;
    this.faults = 0;
    this.port.onmessage = (event) => {
      var msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'stop') { this.done = true; return; }
      if (msg.type === 'report') {
        var h = this.core.health(currentFrame + this.offset);
        h.faults = this.faults;
        this.port.postMessage(h);
        return;
      }
      if (msg.type === 'installTables') { this.core.installTables(msg.tables); return; }
      if (msg.type === 'installNoise') { this.core.installNoise(msg.noise); return; }
      if (msg.type === 'installPatch') { this.core.installPatch(msg.patch); return; }
      this.core.schedule(msg);
    };
  }

  process(inputs, outputs) {
    if (this.done) return false;
    var out = outputs[0];
    if (!out || !out.length) return true;
    // ---- AN EXCEPTION HERE IS PERMANENT --------------------------------------
    //
    // A throw from process() does not lose one block: Chromium marks the processor dead
    // and never calls it again, so the lane goes silent for the rest of the session with
    // nothing in the log. That is the worst failure this code can have, because it looks
    // exactly like a bug in the music.
    //
    // So it is caught, reported ONCE over the port, and the block is filled with silence.
    // A lane that has stopped working says so and keeps its node; it does not take the
    // song down and it does not pretend the arrangement is empty.
    try {
      this.core.process(out, currentFrame + this.offset, out[0].length, 0);
    } catch (err) {
      this.faults++;
      if (this.faults === 1) {
        this.port.postMessage({
          type: 'fault', frame: currentFrame + this.offset,
          message: String((err && err.message) || err),
          stack: String((err && err.stack) || ''),
        });
      }
      for (var c = 0; c < out.length; c++) out[c].fill(0);
    }
    return true;
  }
}

registerProcessor(${JSON.stringify(MRDR3_PROCESSOR_NAME)}, Mrdr3Processor);
`;

/** The complete module text handed to `addModule`: the core, then its host. */
export const mrdr3WorkletSource = () => `${MRDR3_DSP_SOURCE}\n${PROCESSOR_WRAPPER}`;

const registered = new WeakMap();

/** Whether this context can host a worklet at all — false off a secure origin. */
export const canHostMrdr3 = (ctx) => !!(ctx && ctx.audioWorklet
  && typeof ctx.audioWorklet.addModule === 'function'
  && typeof globalThis.AudioWorkletNode === 'function');

/**
 * Register the MRDR-3 processor on a context, once.
 *
 * Rejects rather than resolving quietly when the context cannot host a worklet: the
 * caller would otherwise build a node that throws and the error would name the node
 * instead of the reason. The likeliest reason by far is an insecure origin — the LAN dev
 * URL over http, and `file://`, both of which have no `audioWorklet` at all.
 */
export function ensureMrdr3Dsp(ctx) {
  if (!canHostMrdr3(ctx)) {
    return Promise.reject(new Error('MRDR-3 needs an AudioWorklet, which needs a secure '
      + 'context (https, localhost, or a bundled page served from one)'));
  }
  let ready = registered.get(ctx);
  if (!ready) {
    const url = URL.createObjectURL(new Blob([mrdr3WorkletSource()], { type: 'application/javascript' }));
    ready = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    registered.set(ctx, ready);
  }
  return ready;
}

/**
 * An MRDR-3 node on a context already prepared by `ensureMrdr3Dsp`.
 *
 * `events` is everything known before the first sample — a bounce, a stem, a range
 * render, a scheduled bar. Live note-ons arrive afterwards on `node.port`.
 */
export function createMrdr3Node(ctx, {
  channels = 2, events = null, tables = null, patch = null, noise = null,
  maxGroups = 12, maxTones = 4, frameOffset = 0,
} = {}) {
  const node = new AudioWorkletNode(ctx, MRDR3_PROCESSOR_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [channels],
    processorOptions: {
      maxGroups,
      maxTones,
      ...(events?.length ? { events } : {}),
      // Structured-cloned per node rather than shared through a SharedArrayBuffer: making
      // cross-origin isolation a site requirement just to share a table is not a trade
      // this project will make, and the one-time copy is the alternative.
      ...(tables ? { tables } : {}),
      ...(noise ? { noise } : {}),
      ...(patch ? { patch } : {}),
      ...(frameOffset ? { frameOffset } : {}),
    },
  });
  // The two ways a processor can die, both of which are otherwise SILENT.
  //
  // `processorerror` fires when construction throws or the processor is torn down by the
  // browser; a `fault` message is the processor catching itself mid-render. Neither has a
  // default that says anything, and a lane that has stopped working is indistinguishable
  // from a lane with nothing to play — which is how "it just went quiet after a while"
  // becomes a bug report nobody can act on.
  node.addEventListener('processorerror', () => {
    console.error('MRDR-3 AW: the processor stopped. This lane is silent until the song is '
      + 'reloaded. A processorerror means construction threw or the browser tore it down.');
  });
  // addEventListener, NOT `port.onmessage`: an assignment here is a single slot, and
  // anything that later wants to hear from this port — a health probe, a diagnostic —
  // takes the slot and silently removes this handler with it. That is how a lane loses
  // the ability to report that it has stopped working, and it is a bug that is triggered
  // BY looking at the lane. Listeners stack; the slot does not.
  //
  // `onmessage` implicitly starts a port and `addEventListener` does not, so start it.
  let healed = 0;
  node.port.addEventListener('message', (event) => {
    if (event.data?.type !== 'fault') return;
    console.error(`MRDR-3 AW: the DSP threw at frame ${event.data.frame} — `
      + `${event.data.message}. The lane is filling silence rather than dying.`,
    event.data.stack);
    // ---- AND THEN RECOVER ---------------------------------------------------
    //
    // Filling silence is the right thing to do with the block that threw; it is the
    // wrong thing to do with every block after it. If the fault came from state rather
    // than from one bad sample — a group holding something the patch no longer
    // describes — then it will throw again on the next block and the next, and the lane
    // is silent for the rest of the session having said so exactly once.
    //
    // A panic drops every sounding group, and a group is rebuilt from the patch when it
    // is next claimed, so it is the cheapest thing that can clear poisoned state. Once
    // per lane: if a panic did not fix it, panicking again every block would turn a
    // silent lane into a silent lane that also cannot be interrupted.
    if (healed) return;
    healed = 1;
    console.error('MRDR-3 AW: panicking the lane to clear its state. If it stays silent, '
      + 'the fault is in the patch or the schedule rather than in a sounding note.');
    try { node.port.postMessage({ type: 'panic', frame: 0 }); } catch { /* gone */ }
  });
  node.port.start();
  return node;
}
