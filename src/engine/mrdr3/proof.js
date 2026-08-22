/*
 * MRDR-3's AudioWorklet proof gate — docs/MRDR-3-worklet-spec.md §11, Phase 1.
 *
 * This is deliberately NOT the synth. It is the smallest processor that answers the
 * question the spec puts before every other piece of work: can MRDR-3 run an
 * AudioWorkletProcessor at all — live, and in the OfflineAudioContext that renders its
 * stems, at both sample rates, deterministically, and torn down cleanly?
 *
 * TNGR-2 answered that question for TNGR-2 and the answer is reusable, so why ask again?
 * Because MRDR-3 asks it differently in one respect that its own spec calls the
 * structural difference (§5.1): a CHORD is one event that sounds several tones which sum
 * into ONE shaper before the output. TNGR-2 allocates a voice per note and never had to
 * prove that a group survives a stem, a panic or a teardown as a unit. Everything else
 * here is TNGR-2's proof re-run on MRDR-3's own module, which is worth having as a
 * regression owned by this engine rather than as a fact about a neighbouring one.
 *
 * The Blob-URL decision, the processorOptions-not-port decision and the secure-origin
 * requirement are all inherited from `src/engine/tngr2/proof.js`, which explains them at
 * length. They are not re-argued here; they are re-tested.
 *
 * If this fails, Phase 2 does not start. If it passes it stays as a permanent
 * regression — see tests/mrdr3-worklet-proof.js.
 */

/**
 * The processor, as source.
 *
 * Small, and free of anything the real synth will want, so a failure here is a failure of
 * the MECHANISM and never of the synthesis. One sine per tone, an envelope that is a
 * rectangle, and a group that owns its tones — that last part being the only thing this
 * proves that TNGR-2's did not.
 */
export const MRDR3_PROOF_SOURCE = `
// A phase from the event's identity rather than from playback history, so a stem and the
// mix it belongs to agree, and so does the second render of either. The TONE INDEX is in
// the seed because a chord's tones are one event: seeded on the event alone, every tone
// of a chord would start in phase and sum to a single loud transient.
function mrdr3ProofPhase(eventId, toneIndex) {
  var h = 2166136261 ^ Math.imul((eventId | 0) + 1, 16777619);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= Math.imul((toneIndex | 0) + 1, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h >>> 8) & 0xffff) / 65536;
}

/**
 * A note GROUP: one event, one or more tones, one summing point.
 *
 * The summing point is the whole point. §5.1 requires a chord's tones to reach one drive
 * shaper together, so the group — not the tone — is the unit that is allocated, released,
 * panicked and torn down. The proof carries a stand-in shaper (a gain of exactly 1) so
 * the STRUCTURE is exercised without any synthesis being claimed.
 */
function Mrdr3ProofGroup() {
  this.eventId = 0;
  this.tones = [];
  this.active = false;
  this.offFrame = 0;
}

class Mrdr3ProofProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var opts = (options && options.processorOptions) || {};
    this.groups = [];
    this.pending = [];
    this.late = 0;
    this.worstLate = 0;
    this.done = false;
    // Where this render sits on the transport. An OfflineAudioContext counts from zero,
    // so a range render starting at bar four would otherwise place every event as though
    // the song began there.
    this.offset = Math.max(0, Math.round(opts.frameOffset || 0));
    // Events handed over WITH the node, before it can ever be asked to process. Port
    // delivery is not ordered against startRendering() and silently loses the schedule —
    // TNGR-2 spec §3 finding (b). The port stays for genuinely live interaction.
    if (opts.events && opts.events.length) for (var i = 0; i < opts.events.length; i++) {
      this.receive(opts.events[i]);
    }
    this.port.onmessage = (event) => this.receive(event.data);
  }

  receive(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'stop') { this.done = true; return; }
    if (msg.type === 'report') {
      this.port.postMessage({
        type: 'health', frame: currentFrame + this.offset,
        groups: this.groups.length, queued: this.pending.length,
        late: this.late, worstLate: this.worstLate,
      });
      return;
    }
    // PANIC IS A SCHEDULED EVENT, not a command executed on arrival — and this is the
    // one place the distinction bites. An offline render hands its WHOLE schedule over in
    // processorOptions, so a panic applied at receive time runs during construction and
    // empties the queue of every note that had not been rendered yet: the render comes
    // back silent, and the "panic silenced it" assertion passes for the wrong reason.
    // It goes in the queue with everything else and lands on its frame.
    if (msg.type === 'noteOn' || msg.type === 'noteOff' || msg.type === 'panic') {
      this.pending.push(msg);
    }
  }

  /** Apply everything due at or before \`frame\`, newest schedule last. */
  drain(frame) {
    if (!this.pending.length) return;
    var keep = [];
    for (var i = 0; i < this.pending.length; i++) {
      var e = this.pending[i];
      if (e.frame > frame) { keep.push(e); continue; }
      // A LATE event is counted and applied at the first safe sample — never silently
      // backdated, which would put it before events already rendered.
      if (e.frame < frame) {
        this.late++;
        var by = frame - e.frame;
        if (by > this.worstLate) this.worstLate = by;
      }
      if (e.type === 'panic') {
        // Clears BOTH what is sounding and what is queued behind it. A panic that left
        // the queue standing would have the song play its own future back after a stop.
        this.groups.length = 0;
        // Only events still in the future survive: the keep list already holds them, and
        // anything at or before this frame has been applied.
        keep.length = 0;
        continue;
      }
      if (e.type === 'noteOn') {
        var g = new Mrdr3ProofGroup();
        g.eventId = e.eventId | 0;
        g.active = true;
        g.offFrame = e.durFrames ? e.frame + e.durFrames : Infinity;
        var hzs = Array.isArray(e.hz) ? e.hz : [e.hz];
        for (var t = 0; t < hzs.length; t++) {
          g.tones.push({
            hz: hzs[t],
            phase: mrdr3ProofPhase(g.eventId, t),
            // Full velocity per tone, NOT divided by chord width: the native path builds
            // a voice per chord tone and sums them into the note-on's one output gain,
            // so a triad really is louder than one note. Dividing here would make the
            // proof model an engine this project does not have.
            gain: e.velocity == null ? 1 : e.velocity,
          });
        }
        this.groups.push(g);
      } else {
        for (var k = this.groups.length - 1; k >= 0; k--) {
          if (this.groups[k].eventId === (e.eventId | 0)) this.groups.splice(k, 1);
        }
      }
    }
    this.pending = keep;
  }

  process(inputs, outputs) {
    if (this.done) return false;
    var out = outputs[0];
    if (!out || !out.length) return true;
    var L = out[0];
    var R = out.length > 1 ? out[1] : null;
    var count = L.length;
    var base = currentFrame + this.offset;
    for (var n = 0; n < count; n++) {
      this.drain(base + n);
      var sum = 0;
      for (var g = this.groups.length - 1; g >= 0; g--) {
        var grp = this.groups[g];
        if (base + n >= grp.offFrame) { this.groups.splice(g, 1); continue; }
        // The tones of one chord sum HERE, into the group's own bus, before anything
        // downstream — which is the structure §5.1 exists to protect.
        var tone = 0;
        for (var t2 = 0; t2 < grp.tones.length; t2++) {
          var tn = grp.tones[t2];
          tone += Math.sin(tn.phase * 6.283185307179586) * tn.gain * 0.25;
          tn.phase += tn.hz / sampleRate;
          if (tn.phase >= 1) tn.phase -= 1;
        }
        // The stand-in for the group's shared drive shaper: one summing point per group,
        // deliberately transparent.
        sum += tone;
      }
      L[n] = sum;
      if (R) R[n] = sum;
    }
    return true;
  }
}

registerProcessor('mrdr3-proof', Mrdr3ProofProcessor);
`;

export const MRDR3_PROOF_NAME = 'mrdr3-proof';

/**
 * Audio time to the integer frame the processor counts in.
 *
 * At the controller boundary, once. A note time left as a float until it reached the DSP
 * would be rounded there instead, and the same event would land on different samples in
 * two renders of one song.
 */
export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));

const registered = new WeakMap();

/** Whether this context can host a worklet at all — false off a secure origin. */
export const canHostMrdr3Proof = (ctx) => !!(ctx && ctx.audioWorklet
  && typeof ctx.audioWorklet.addModule === 'function'
  && typeof globalThis.AudioWorkletNode === 'function');

/**
 * Register the proof processor on a context, once.
 *
 * Rejects rather than resolving quietly when the context cannot host a worklet: the
 * caller would otherwise build a node that throws, and the error would name the node
 * instead of the reason. The likeliest reason by far is an insecure origin — the LAN dev
 * URL over http, and `file://`, both of which have no `audioWorklet` at all.
 */
export function ensureMrdr3Proof(ctx) {
  if (!canHostMrdr3Proof(ctx)) {
    return Promise.reject(new Error('MRDR-3 needs an AudioWorklet, which needs a secure '
      + 'context (https, localhost, or a bundled page served from one)'));
  }
  let ready = registered.get(ctx);
  if (!ready) {
    const url = URL.createObjectURL(new Blob([MRDR3_PROOF_SOURCE], { type: 'application/javascript' }));
    ready = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    registered.set(ctx, ready);
  }
  return ready;
}

/**
 * A proof node on a context already prepared by `ensureMrdr3Proof`.
 *
 * `events` is everything known before the first sample — a bounce, a stem, a range
 * render. Live note-ons arrive afterwards on `node.port`.
 */
export function createMrdr3ProofNode(ctx, {
  channels = 2, events = null, frameOffset = 0,
} = {}) {
  return new AudioWorkletNode(ctx, MRDR3_PROOF_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [channels],
    processorOptions: {
      ...(events?.length ? { events } : {}),
      ...(frameOffset ? { frameOffset } : {}),
    },
  });
}
