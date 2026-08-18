/*
 * TNGR-2's AudioWorklet proof gate.
 *
 * This is deliberately NOT the synth. It is the smallest processor that answers the one
 * question the completion spec puts before every other piece of work: can this project
 * run an AudioWorkletProcessor at all — live, and in the OfflineAudioContext that renders
 * its stems, at both sample rates, deterministically, and torn down cleanly?
 *
 * The question is not rhetorical here. Every worklet this codebase has met so far has
 * rendered SILENCE offline: Tone's Freeverb and JCReverb (see effects.js), and PluckSynth
 * through LowpassCombFilter (see the sweep at the top of voices.js). Those are Tone's
 * worklets, loaded Tone's way, and their failure says nothing certain about ours — which
 * is exactly why a proof owned by this repo has to exist before TNGR-2's DSP moves into
 * one. If it fails, the completion spec's fallback clause applies and the native path
 * stays; if it passes, it stays as a permanent regression. See tests/tngr2-worklet-proof.js.
 *
 * ---- why the processor arrives as a Blob rather than as a file -----------------
 *
 * `addModule` takes a URL, and the obvious answer is a second build output served beside
 * the bundle. That answer does not work here. The offline renderer builds a page with
 * `page.setContent` (tools/lib/render-bank-browser.js) — there is no server behind it and
 * no base URL, so any relative path 404s and every stem render would fail while live
 * playback worked. A Blob URL is same-origin by construction, needs no build entry, no
 * service-worker cache entry and no hash to keep in step, and behaves identically in the
 * dev server, the production bundle, the PWA and the render harness.
 *
 * The cost is that the processor is a STRING, so it is not type-checked or linted with
 * the rest of the engine. That is affordable for a proof. The real DSP core, when it
 * lands, is a module the processor imports — and this file is where the loading strategy
 * for it has already been decided and tested.
 */

/**
 * The processor, as source.
 *
 * Kept deliberately small and free of anything the real synth will want, so that a
 * failure here is a failure of the MECHANISM and never of the synthesis.
 */
export const TNGR2_PROOF_SOURCE = `
// A phase that comes from the note's identity rather than from playback history: the
// same event id renders the same phase in a stem and in the mix it belongs to, and on
// the second render of either. Playback history would make a stem and a mix disagree.
function seededPhase(eventId) {
  let h = 2166136261 ^ Math.imul(eventId | 0, 16777619);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h >>> 8) & 0xffff) / 0x10000;
}

class Tngr2ProofProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.pending = [];
    this.voices = new Map();
    this.late = 0;
    this.worstLate = 0;
    this.done = false;
    this.port.onmessage = (event) => this.receive(event.data);
    // Events handed over WITH the node, before it can ever be asked to process. See the
    // note on \`events\` in createTngr2ProofNode: this is the only delivery an offline
    // render can rely on.
    for (const event of options?.processorOptions?.events || []) this.receive(event);
  }

  receive(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'stop') { this.done = true; return; }
    if (msg.type === 'report') { this.report(); return; }
    // Frame-sorted on the way in. Message ARRIVAL order is not event order — the
    // controller may schedule a bar of notes in one burst, and a late-arriving event
    // for an earlier frame must still land before the ones after it.
    const frame = Number(msg.frame) || 0;
    let at = this.pending.length;
    while (at > 0 && this.pending[at - 1].frame > frame) at--;
    this.pending.splice(at, 0, { ...msg, frame });
  }

  report() {
    this.port.postMessage({
      type: 'health', voices: this.voices.size, queued: this.pending.length,
      late: this.late, worstLate: this.worstLate, frame: currentFrame,
    });
  }

  apply(msg) {
    if (msg.type === 'noteOn') {
      const hz = Number(msg.hz) || 440;
      this.voices.set(msg.eventId, {
        phase: seededPhase(msg.eventId),
        inc: hz / sampleRate,
        gain: 0,
        target: Math.min(1, Math.max(0, Number(msg.velocity) ?? 1)),
      });
    } else if (msg.type === 'noteOff') {
      const voice = this.voices.get(msg.eventId);
      if (voice) voice.target = 0;
    } else if (msg.type === 'panic') {
      // Everything sounding and everything booked. A panic that left the queue behind
      // would play the rest of the bar into the silence it was called to make.
      this.voices.clear();
      this.pending.length = 0;
    }
  }

  process(_inputs, outputs) {
    if (this.done) return false;
    const out = outputs[0];
    if (!out || !out.length) return true;
    const frames = out[0].length;
    const start = currentFrame;
    // Events are applied at the SAMPLE they belong to, not at the top of the quantum.
    // A note is 128 frames wide at worst either way, but "the quantum it arrived in" is
    // not a time — it is a rounding, and two renders of the same song at different
    // buffer alignments would round differently and stop matching.
    let next = 0;
    for (let i = 0; i < frames; i++) {
      while (this.pending.length && this.pending[0].frame <= start + i) {
        const msg = this.pending.shift();
        if (msg.frame < start) {
          this.late++;
          this.worstLate = Math.max(this.worstLate, start - msg.frame);
        }
        this.apply(msg);
      }
      let sample = 0;
      for (const voice of this.voices.values()) {
        // A short linear ramp per note, so the proof tone starts and stops without a
        // click of its own to confuse a peak reading.
        const step = 1 / (sampleRate * 0.005);
        if (voice.gain < voice.target) voice.gain = Math.min(voice.target, voice.gain + step);
        else if (voice.gain > voice.target) voice.gain = Math.max(voice.target, voice.gain - step);
        sample += Math.sin(voice.phase * Math.PI * 2) * voice.gain * 0.25;
        voice.phase += voice.inc;
        if (voice.phase >= 1) voice.phase -= 1;
      }
      for (let c = 0; c < out.length; c++) out[c][i] = sample;
      next = i;
    }
    void next;
    // A voice that has faded out and been released is gone; a held one stays.
    for (const [id, voice] of this.voices) {
      if (voice.target === 0 && voice.gain === 0) this.voices.delete(id);
    }
    return true;
  }
}

registerProcessor('tngr2-proof', Tngr2ProofProcessor);
`;

export const TNGR2_PROOF_NAME = 'tngr2-proof';

// One registration per context. `addModule` on a context that already has the processor
// is harmless but not free, and the promise is what callers actually need to await.
const registered = new WeakMap();

/** Whether this context can host a worklet at all — false off a secure origin. */
export const canHostTngr2Worklet = (ctx) => !!(ctx && ctx.audioWorklet
  && typeof ctx.audioWorklet.addModule === 'function'
  && typeof globalThis.AudioWorkletNode === 'function');

/**
 * Register the proof processor on a context, once.
 *
 * Rejects rather than resolving quietly when the context cannot host a worklet: a caller
 * that silently got no processor would go on to build a node that throws, and the error
 * would name the node instead of the reason.
 */
export function ensureTngr2Proof(ctx) {
  if (!canHostTngr2Worklet(ctx)) {
    return Promise.reject(new Error('AudioWorklet is unavailable on this context '
      + '(it needs a secure context: https, localhost, or a bundled page)'));
  }
  let ready = registered.get(ctx);
  if (!ready) {
    // Revoked as soon as the module is parsed — the processor class now lives in the
    // context's worklet scope, and the URL has nothing left to hand anybody.
    const url = URL.createObjectURL(new Blob([TNGR2_PROOF_SOURCE], { type: 'application/javascript' }));
    ready = ctx.audioWorklet.addModule(url)
      .finally(() => URL.revokeObjectURL(url));
    registered.set(ctx, ready);
  }
  return ready;
}

/**
 * A proof node on a context that has already been prepared by `ensureTngr2Proof`.
 *
 * `events` is how anything scheduled BEFORE the first sample must arrive, and this is the
 * single most important thing the proof gate found. Posting the same events to
 * `node.port` works live and is racy offline: `startRendering()` can run a whole render
 * to completion before the main thread's port messages are pumped to the audio thread, so
 * the notes are still sitting in the processor's queue when the buffer comes back
 * silent. It is a RACE, not a failure — the first render in a page usually wins it,
 * because compiling the module gave the messages time to land, which is exactly what
 * makes it dangerous: it looks like it works.
 *
 * `processorOptions` is delivered with the node's construction, so the processor has the
 * events before `process()` is first called. Anything known up front — a bounce, a stem,
 * a range render, a scheduled bar — travels this way. The port stays for what genuinely
 * happens LIVE, where the audio thread is running continuously and messages are pumped
 * between quanta; see the live half of tests/tngr2-worklet-proof.js.
 */
export function createTngr2ProofNode(ctx, { channels = 2, events = null } = {}) {
  return new AudioWorkletNode(ctx, TNGR2_PROOF_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [channels],
    ...(events?.length ? { processorOptions: { events } } : {}),
  });
}

/**
 * Audio time to the integer frame the processor counts in.
 *
 * At the controller boundary, once, deliberately: `currentFrame` inside the worklet is an
 * integer count of samples, and a note time that stayed a float until it got there would
 * be rounded by the processor instead — the same event landing on different samples in
 * two renders of the same song.
 */
export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));
