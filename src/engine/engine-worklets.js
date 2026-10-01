/**
 * The engine's own small AudioWorklets — the two processors that are not instruments.
 *
 *  - `mash-noise-gate`, the Noise Gate insert (effects.js, makeNoiseGate).
 *  - `mash-capture`, the rewind recorder's tap on the master output (audio.js,
 *    _startCapture).
 *
 * Both used to be ScriptProcessorNodes, whose callback runs on the MAIN thread. For the
 * gate that put a 256-sample deadline in the live signal path: a frame that held the main
 * thread past it (a bake, a GC, a busy machine) dropped that lane out, and every callback
 * allocated two arrays and a closure, ~170 times a second, adding to the garbage that
 * causes the next stall. Here the per-sample work runs on the audio thread, allocates
 * nothing in `process()`, and adds no latency — the ScriptProcessor delayed a gated lane
 * by its buffer.
 *
 * Registration is asynchronous and a context can only be asked once it exists, so it is
 * started where the context is built (createMixer pushes it into `mixer.ready`, which
 * every offline render already awaits before it lays down a note). Where a worklet cannot
 * run at all — the LAN dev URL over http, `file://`, a `setContent` test page — callers
 * keep the ScriptProcessor as a fallback rather than going silent.
 */

export const NOISE_GATE_PROCESSOR = 'mash-noise-gate';
export const CAPTURE_PROCESSOR = 'mash-capture';

/** Samples per message from the capture tap — the ScriptProcessor's old buffer size. */
export const CAPTURE_CHUNK = 2048;

/** The Noise Gate's three params: their ranges, their defaults. Shared with the fallback. */
export const NOISE_GATE_PARAMS = Object.freeze({
  threshold: Object.freeze({ min: -80, max: 0, fallback: -45 }),
  attack: Object.freeze({ min: 0.001, max: 0.5, fallback: 0.005 }),
  release: Object.freeze({ min: 0.01, max: 2, fallback: 0.12 }),
});

/**
 * A gate's state, made safe to hand to the DSP: a missing or non-finite value falls back
 * to the default, anything else is clamped into range. Exactly what the ScriptProcessor
 * gate did on every callback.
 */
export function noiseGateSettings(state = {}) {
  const out = {};
  for (const [k, { min, max, fallback }] of Object.entries(NOISE_GATE_PARAMS)) {
    const n = Number(state[k]);
    out[k] = Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
  }
  return out;
}

const SOURCE = `
class MashNoiseGate extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return ${JSON.stringify(Object.entries(NOISE_GATE_PARAMS).map(([name, p]) => ({
      name, defaultValue: p.fallback, minValue: p.min, maxValue: p.max, automationRate: 'k-rate',
    })))};
  }

  constructor(options) {
    super();
    var o = (options && options.processorOptions) || {};
    // Carried over when this replaces a ScriptProcessor gate that was already running,
    // so the swap does not reopen a gate that was open.
    this.envelope = o.envelope || 0;
    this.gain = o.gain || 0;
    this.thresholdDb = NaN; this.threshold = 0;
    this.attackS = NaN; this.attackCoef = 0;
    this.releaseS = NaN; this.releaseCoef = 0;
  }

  process(inputs, outputs, parameters) {
    var input = inputs[0];
    var output = outputs[0];
    if (!output || !output.length) return true;
    // Coefficients only when a param moved: k-rate params are one value per block.
    var t = parameters.threshold[0];
    if (t !== this.thresholdDb) { this.thresholdDb = t; this.threshold = Math.pow(10, t / 20); }
    var a = parameters.attack[0];
    if (a !== this.attackS) { this.attackS = a; this.attackCoef = Math.exp(-1 / (a * sampleRate)); }
    var r = parameters.release[0];
    if (r !== this.releaseS) { this.releaseS = r; this.releaseCoef = Math.exp(-1 / (r * sampleRate)); }

    var ins = input ? input.length : 0;
    var outs = output.length;
    var n = output[0].length;
    var threshold = this.threshold, attackCoef = this.attackCoef, releaseCoef = this.releaseCoef;
    var envelope = this.envelope, gain = this.gain;
    for (var i = 0; i < n; i++) {
      // Stereo-linked: the louder channel opens both, so a quiet side cannot pull the
      // image apart. A NaN fails the comparison and counts as silence, as it always did.
      var level = 0;
      for (var c = 0; c < ins; c++) {
        var v = Math.abs(input[c][i]);
        if (v > level) level = v;
      }
      envelope = level + (envelope - level) * (level > envelope ? attackCoef : releaseCoef);
      var target = envelope >= threshold ? 1 : 0;
      gain = target + (gain - target) * (target > gain ? attackCoef : releaseCoef);
      if (gain < 1e-5) gain = 0;
      for (var c2 = 0; c2 < outs; c2++) {
        output[c2][i] = ins ? input[c2 < ins ? c2 : ins - 1][i] * gain : 0;
      }
    }
    this.envelope = envelope;
    this.gain = gain;
    return true;
  }
}
registerProcessor(${JSON.stringify(NOISE_GATE_PROCESSOR)}, MashNoiseGate);

class MashCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var o = (options && options.processorOptions) || {};
    this.chunk = new Float32Array(o.chunk || ${CAPTURE_CHUNK});
    this.fill = 0;
    this.done = false;
    this.port.onmessage = (event) => { if (event.data === 'stop') this.done = true; };
  }

  process(inputs) {
    if (this.done) return false;
    var input = inputs[0];
    var ch = input && input.length ? input[0] : null;
    var chunk = this.chunk;
    var fill = this.fill;
    // 128 frames a block; a silent master arrives as no channels at all and is recorded
    // as the silence it is.
    var n = ch ? ch.length : 128;
    for (var i = 0; i < n; i++) {
      chunk[fill++] = ch ? ch[i] : 0;
      if (fill === chunk.length) {
        // Copied by the structured clone, so the same chunk is refilled next time. If the
        // main thread is busy the messages queue: late, never lost — which is the point.
        this.port.postMessage(chunk);
        fill = 0;
      }
    }
    this.fill = fill;
    return true;
  }
}
registerProcessor(${JSON.stringify(CAPTURE_PROCESSOR)}, MashCapture);
`;

/** The complete module text handed to `addModule`. Exported for tests. */
export const engineWorkletSource = () => SOURCE;

const registered = new WeakMap();

/** Whether this context can host a worklet at all — false off a secure origin. */
export const canHostEngineWorklets = (ctx) => !!(ctx && ctx.audioWorklet
  && typeof ctx.audioWorklet.addModule === 'function'
  && typeof globalThis.AudioWorkletNode === 'function'
  && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
  && typeof Blob === 'function');

/**
 * Register both processors on a context, once. Resolves true when they are ready, false
 * when this context cannot host them — never rejects, because the callers have a fallback
 * and `mixer.ready` must not fail a render over it.
 */
export function prepareEngineWorklets(ctx) {
  if (!canHostEngineWorklets(ctx)) return Promise.resolve(false);
  let entry = registered.get(ctx);
  if (!entry) {
    entry = { ready: false, promise: null };
    let url = null;
    try {
      url = URL.createObjectURL(new Blob([SOURCE], { type: 'application/javascript' }));
      entry.promise = ctx.audioWorklet.addModule(url)
        .then(() => { entry.ready = true; return true; }, () => false)
        .finally(() => URL.revokeObjectURL(url));
    } catch {
      if (url) URL.revokeObjectURL(url);
      entry.promise = Promise.resolve(false);
    }
    registered.set(ctx, entry);
  }
  return entry.promise;
}

/** True once `prepareEngineWorklets` has finished on this context — a node can be built now. */
export const engineWorkletsReady = (ctx) => !!(ctx && registered.get(ctx)?.ready);

/** An OfflineAudioContext — where a node must never be swapped mid-render. */
export const isOfflineContext = (ctx) => typeof OfflineAudioContext !== 'undefined'
  && ctx instanceof OfflineAudioContext;

/**
 * A Noise Gate node, on a context `prepareEngineWorklets` has finished on. Stereo in,
 * stereo out; `settings` is what noiseGateSettings returns, `carry` an optional
 * `{ envelope, gain }` from the gate it replaces.
 */
export function createNoiseGateNode(ctx, settings, carry = null) {
  return new AudioWorkletNode(ctx, NOISE_GATE_PROCESSOR, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    parameterData: { ...settings },
    processorOptions: carry ? { envelope: carry.envelope || 0, gain: carry.gain || 0 } : {},
  });
}

/**
 * The rewind recorder's tap: mono (a stereo master is downmixed exactly as the old
 * one-channel ScriptProcessor did), posting a Float32Array of CAPTURE_CHUNK samples to
 * `node.port` each time one fills. Its single output is silent; connect it onward to a
 * zero-gain sink so the graph pulls it. Post 'stop' on the port to let it go.
 */
export function createCaptureNode(ctx, chunk = CAPTURE_CHUNK) {
  return new AudioWorkletNode(ctx, CAPTURE_PROCESSOR, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    processorOptions: { chunk },
  });
}
