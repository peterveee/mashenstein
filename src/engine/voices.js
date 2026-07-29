// The player behind src/data/voices.js: it turns a catalogue entry into Tone synths
// and fires notes at absolute times. Nothing here branches on which voice it is —
// that is the point of the split. A new sound is an entry in the data file.
//
// ---- The offline rule, again ------------------------------------------------
//
// Every WAV, stem and video is produced by rendering this engine under an
// OfflineAudioContext (tools/lib/render-bank-browser.js), so a synth that works in
// the browser and renders silent would sound right while you chose it and then
// vanish from everything you exported. src/engine/effects.js gates its catalogue on
// a measured offline sweep for exactly this reason, and so does this one.
//
// Swept 2026-07-28, Tone 15.1.22, each synth built under an OfflineAudioContext,
// triggered once, and the rendered peak measured:
//
//   Synth 0.989 · MonoSynth 0.917 · DuoSynth 1.557 · FMSynth 0.316 · AMSynth 0.193
//   MembraneSynth 0.991 · MetalSynth 0.442 · NoiseSynth 0.974      — all fine
//   PluckSynth        SILENT — built on LowpassCombFilter, an AudioWorklet, which
//                     also needs a secure context. Same failure as Freeverb and
//                     JCReverb in effects.js.
//   PolySynth         SILENT unless its FIRST trigger is at exactly t=0. Warmed with
//                     a note at zero it works for the rest of the render, but that
//                     warm-up note is audible in the file. Not usable; polyphony
//                     here is a pool of monophonic synths instead (see `poly`),
//                     which measured correct with no warm-up in any position.
//   Sampler           silent with nothing loaded, and there are no sample assets to
//                     load. Not applicable rather than broken.
//
// Re-run the sweep before adding a class to SYNTHS. `Tone.Noise` fills its buffer
// with Math.random at construction, so a noise-based voice would also break the
// stems-sum-to-the-mix property offline renders rely on — that needs a seeded
// buffer, the way AudioSys.noiseBuf already is, before NoiseSynth can be offered.
import * as Tone from 'tone';
import { VOICES } from '../data/voices.js';

/**
 * The allowlist. A catalogue entry's `synth` is looked up here and nowhere else, so
 * an unknown or blacklisted name is a voice that does not build rather than a
 * `Tone[whatever]` that might be anything.
 *
 * Everything listed has been measured rendering offline (see the sweep above). Only
 * the pitched ones appear in the catalogue today; MembraneSynth and MetalSynth are
 * here so a percussion lane can take one later without a second sweep.
 */
/**
 * Drop an oscillator type that names a VOICING rather than a waveform.
 *
 * Tone spells voicing as a prefix — `fatsawtooth`, `amsine` — so the desk edits it as
 * a second pill over the same string. A bug in that editor briefly wrote the prefix
 * on its own, and `{ type: 'single' }` is not a waveform: Tone throws building the
 * oscillator, which kills the note and every note after it on that lane.
 *
 * A preset already saved that way sits in a song's mix, so fixing the editor alone
 * would leave the song broken. Dropping the key here lets Tone fall back to the
 * class default and the rest of the preset — count, spread, phase — survives.
 * Deliberately narrow: only these four exact words, which no real waveform matches
 * and nothing but that bug could have written.
 */
const VOICING_WORDS = ['single', 'fat', 'am', 'fm'];

function scrubOscTypes(node) {
  if (!node || typeof node !== 'object') return;
  for (const [k, val] of Object.entries(node)) {
    if (k === 'type' && typeof val === 'string' && VOICING_WORDS.includes(val)) delete node[k];
    else scrubOscTypes(val);
  }
}

const SYNTHS = {
  Synth: Tone.Synth,
  MonoSynth: Tone.MonoSynth,
  FMSynth: Tone.FMSynth,
  AMSynth: Tone.AMSynth,
  DuoSynth: Tone.DuoSynth,
  MembraneSynth: Tone.MembraneSynth,
  MetalSynth: Tone.MetalSynth,
};

/**
 * One rack per audio context, owned by AudioSys.
 *
 * A pool is built the first time a lane plays a given voice and kept for the life of
 * the context: building a MonoSynth costs a handful of nodes, and doing it per note
 * at 16ths would be both wasteful and audibly late. AudioSys disposes the rack when
 * the SONG changes and prunes it when one lane's voice does, so neither leaves the old
 * synths hanging off the graph — see `prune`.
 *
 * A pool that is finished with is RETIRED rather than disposed: it comes out of the
 * map at once, so the next note builds fresh, and its nodes are torn down later, once
 * whatever was ringing on them has ended. See `_retire` — the desk edits presets over
 * a playing song, and a cache that is dropped mid-note is a note that stops.
 */
export class VoiceRack {
  constructor(ctx, noiseBuf = null) {
    this.ctx = ctx;
    // The engine's own SEEDED noise buffer (AudioSys.noiseBuf, mulberry32 via
    // setNoiseSeed). Noise presets are built on it rather than on `Tone.Noise`,
    // which fills its buffer from Math.random at construction: two renders of the
    // same song would not match, and stems would stop summing to the mix. The
    // engine solved this years ago for its own snare; a preset uses the same buffer.
    this.noiseBuf = noiseBuf;
    // Tone routes everything it builds through its own context. createMixer already
    // sets it, but a rack used on its own (a test, a future audition tool) has to be
    // able to stand up without one.
    Tone.setContext(ctx);
    this.pools = new Map();
    // Pools taken out of service but still sounding — see `_retire`. Keyed by their
    // own disposal timer so `dispose` can cancel one that has not fired yet.
    this._retired = new Map();
  }

  /**
   * Everything about a preset that is BUILT INTO a slot, as opposed to read per note.
   *
   * This is the line the desk's preset editor lives on. LENGTH, VELOCITY, TRANSPOSE,
   * FINE, TAPS, FALLOFF and VOICING are all read at schedule time, so the next note
   * has them whatever the rack does; everything in here is frozen into a Tone synth
   * at construction and needs the rack to be told. `refresh` diffs two of these to
   * work out which kind of edit it just got — and, for most of them, it turns out to
   * be neither.
   */
  static buildSpec(v) {
    // Cloned so a voice that Tone mutates in place cannot edit the catalogue.
    const opts = v.options ? JSON.parse(JSON.stringify(v.options)) : {};
    scrubOscTypes(opts);
    // Glide is a constructor option on every Tone synth, and the rack has always
    // passed the bag through — but it could never DO anything, because a note
    // glides from the note its own instance played last and every note used to
    // land on a fresh slot. `mono` in `play` is what gives it something to glide from.
    if (v.portamento) opts.portamento = v.portamento;
    return {
      synth: v.synth,
      opts,
      vibrato: v.vibrato && v.vibrato.depth > 0
        ? { rate: v.vibrato.rate ?? 5, depth: v.vibrato.depth, type: v.vibrato.type || 'sine' }
        : null,
    };
  }

  /**
   * How long after its last note a pool built from this spec is actually silent.
   *
   * The longest release anywhere in the options bag — a DuoSynth has two envelopes and
   * a MonoSynth's filter has one of its own, and a retired pool must outlive the
   * slowest of them or holding it back would have bought nothing. A release written in
   * Tone's note notation ('8n') is not a number of seconds and is not read; the one
   * second floor covers every one of those in the catalogue.
   */
  static tailOf(spec) {
    let longest = 0;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      for (const [k, val] of Object.entries(node)) {
        if (k === 'release' && typeof val === 'number') longest = Math.max(longest, val);
        else walk(val);
      }
    };
    walk(spec?.opts);
    return Math.min(6, Math.max(1, longest)) + 0.1;
  }

  /**
   * Play a note, or a chord, through `laneKey`'s voice.
   *
   * `dry` and `wet` are the lane's channel-strip inputs, exactly as the hand-rolled
   * voices receive them from `lane()` in scheduleStep — so a voice lands on its own
   * fader, pan, EQ and sends with nothing further to wire. `echo` mirrors `play()`'s
   * echo flag: melodic lanes tap the delay pre-fader, which is where the songs'
   * echoes have always come from, and a lane that does not echo simply never
   * connects to `wet`.
   *
   * Returns false only for an id that is not in the catalogue.
   */
  /**
   * A preset's own tuning, as a frequency multiplier.
   *
   * `transpose` is whole semitones and `fine` is cents, and they are two controls
   * rather than one because they are two different jobs: transpose moves an
   * instrument to where it sits in the arrangement — an octave down to get a bass
   * out of a lead — and wants to land exactly on a semitone. Fine is for the
   * couple of cents of drift that makes two layered voices beat against each other
   * instead of phasing, and a control that could do that would need a step so
   * small that hitting an exact octave with it became a matter of luck.
   *
   * Multiplicative, because that is what the rack already does with the song warp:
   * an equal-tempered semitone IS a frequency ratio, so this composes with the
   * warp for free rather than needing its own path.
   */
  static pitchShift(v) {
    const semis = (v?.transpose || 0) + (v?.fine || 0) / 100;
    return semis ? Math.pow(2, semis / 12) : 1;
  }

  play(laneKey, voiceId, freq, { time, dur, gain, detune = 1, dry, wet, echo = true }) {
    const v = VOICES[voiceId];
    if (v && v.kind === 'noise') return this._playNoise(v, { time, gain, dry, wet, echo });
    if (v && v.kind === 'drum') return this._playDrum(v, { time, gain, dry, wet, echo });
    if (!v || !SYNTHS[v.synth]) return false;
    const notes = Array.isArray(freq) ? freq : [freq];
    // Polyphony is not a property of the preset — the same sound is one voice on a
    // bass lane and five on a chord lane, and a preset that had to declare which
    // could not be lane-agnostic. The pool grows to the widest chord it has been
    // asked for and stops there: one slot per note, plus one so the chord landing on
    // the next beat does not steal a slot that is still ringing.
    // `taps` are the same hit repeated a few milliseconds apart, each quieter than
    // the last — a clap, a flam, a buzz roll. It works on any preset, not just the
    // noise ones: a clap is a shape, not a sound source, and a metallic clap is as
    // reasonable as a noisy one. Each tap needs its own slot, or the second would
    // cut the first off on a monophonic synth.
    const taps = v.taps || [0];
    // A mono preset is ONE instance, reused. Two things follow, and they are the two
    // things a hardware mono synth does: a new note cuts the one still ringing off
    // instead of stacking with it, and — because the instance remembers what it was
    // last playing — `portamento` finally has a pitch to glide from. Round-robining
    // notes across slots, which is right for everything else here, defeats both.
    const mono = v.mono === true;
    const pool = this._pool(laneKey, voiceId, dry, wet, echo,
      mono ? 1 : notes.length * taps.length + 1);
    if (!pool) return false;
    // A chord arrives as an array of frequencies; a melody as one number. Nulls are
    // rests, and a bank writes plenty of them.
    for (const f of notes) {
      if (f == null || !(f > 0)) continue;
      for (let i = 0; i < taps.length; i++) {
        // Mono holds slot 0 rather than advancing. A chord handed to a mono preset
        // therefore sounds its last note, which is what a mono synth does with one —
        // not a case to guard against, just the behaviour being asked for.
        const slot = mono ? pool.slots[0] : pool.slots[pool.next % pool.slots.length];
        if (!mono) pool.next++;
        const t = time + taps[i];
        // Level is set on this slot's own gain, at this note's own time, rather than
        // on one shared node: two notes overlapping at different levels is ordinary
        // (a section changes `chordGain` mid-song) and a shared node would give the
        // ringing note the new one's level.
        slot.out.gain.setValueAtTime(gain * ((v.tapFalloff ?? 1) ** i), t);
        // The preset's own tuning rides on top of the song warp. Both are ratios, so
        // they simply multiply — a preset an octave down stays an octave down through
        // a tempo/pitch warp instead of drifting against it.
        slot.synth.triggerAttackRelease(f * detune * VoiceRack.pitchShift(v), dur, t, v.velocity ?? 1);
        // How far into the future this pool is committed. Notes are scheduled up to
        // 120ms ahead, so "is it playing" is not a question about now — and a pool
        // taken out of service has to outlive the ones already booked on it or they
        // go missing. See `_retire`.
        pool.until = Math.max(pool.until, t + dur);
      }
    }
    return true;
  }

  /**
   * The pool for one (lane, voice, echo) combination.
   *
   * `dry`/`wet` are stable nodes on a channel strip, so the pool is normally built
   * once and reused. They are still compared: a rebuilt mixer hands out new nodes,
   * and a pool wired to the old ones would play into a graph nothing is listening to.
   */
  _pool(laneKey, voiceId, dry, wet, echo, want = 1) {
    const key = `${laneKey}|${voiceId}|${echo ? 1 : 0}`;
    let pool = this.pools.get(key);
    // A rebuilt mixer hands out new strip nodes, and a pool wired to the old ones
    // would play into a graph nothing is listening to.
    if (pool && (pool.dry !== dry || pool.wet !== wet)) {
      this._disposePool(pool);
      this.pools.delete(key);
      pool = null;
    }
    if (!pool) {
      // `spec` is set ONCE, here, and moved on only by `refresh`. Every slot is built
      // from it rather than from the catalogue, so all the slots in a pool are alike
      // however many notes apart they were added — which is what lets `refresh` diff
      // one spec against the catalogue and know what the whole pool is holding.
      // `until` is when the last note scheduled on it ends; see `_retire`.
      pool = { voiceId, dry, wet, echo, slots: [], next: 0, until: 0,
        spec: VoiceRack.buildSpec(VOICES[voiceId]) };
      this.pools.set(key, pool);
    }

    const Ctor = SYNTHS[pool.spec.synth];
    // Grown, never shrunk. A chord that is five notes wide once is likely to be
    // again, and tearing slots down mid-song would cut whatever is ringing on them.
    while (pool.slots.length < Math.max(1, want)) {
      const { opts, vibrato } = pool.spec;
      const synth = new Ctor(Object.keys(opts).length
        // Cloned per slot: Tone mutates the bag it is handed, and two slots sharing
        // one object would have the first synth's edits arrive in the second.
        ? JSON.parse(JSON.stringify(opts))
        : undefined);
      const out = this.ctx.createGain();
      // Silent until a note sets its level at that note's time. A slot that has
      // never played must not pass the synth's own idle output — a DuoSynth's
      // vibrato LFO, for one, runs whether or not anything triggered it.
      out.gain.value = 0;
      // Per-voice vibrato, when the preset asks for one. The desk already has a
      // vibrato INSERT, and that is the right tool for "this channel wobbles" — this
      // is for when the wobble belongs to the sound itself and should follow the
      // preset onto any lane and into any song. DuoSynth is the only Tone class with
      // one built in, which is why it was the only one that could have it.
      //
      // Tone.Vibrato rather than a hand-rolled delay: it is already in the effects
      // catalogue, and that catalogue is gated on a measured offline sweep, so this
      // node is known to survive a render rather than merely to work in a browser.
      let vib = null;
      if (vibrato) {
        vib = new Tone.Vibrato({
          frequency: vibrato.rate,
          depth: vibrato.depth,
          type: vibrato.type,
        });
        Tone.connect(synth, vib);
        Tone.connect(vib, out);
      } else {
        Tone.connect(synth, out);
      }
      out.connect(dry);
      if (echo && wet) out.connect(wet);
      pool.slots.push({ synth, out, vib });
    }
    return pool;
  }

  /**
   * A noise-based one-shot: snares, claps, hats, shakers — the sounds that are mostly
   * air rather than pitch, and the reason the drum half of the library was thin.
   *
   * Built from native nodes on the shared seeded buffer, the same construction the
   * engine's own snare uses: a filtered burst of noise, optionally a pitched body
   * under it, optionally repeated a few milliseconds apart (which is all a clap is —
   * one hit heard four times in a small room).
   *
   * Not pooled. These are one-shots with no sustain and nothing to retrigger, so a
   * node per hit is what the engine has always done and it costs less than keeping
   * them alive between beats.
   */
  _playNoise(v, { time, gain, dry, wet, echo }) {
    if (!this.noiseBuf) return false;
    const ctx = this.ctx;
    const n = v.noise || {};
    const level = gain * (n.gain ?? 1);
    const taps = v.taps || [0];
    for (let i = 0; i < taps.length; i++) {
      const t = time + taps[i];
      // Each tap is quieter than the one before it — a burst repeated at one level is
      // a stutter, where a clap is one hit heard several times in a small room.
      const fade = (v.tapFalloff ?? 1) ** i;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = n.type || 'bandpass';
      f.frequency.value = n.freq ?? 2600;
      f.Q.value = n.Q ?? 0.7;
      const g = ctx.createGain();
      const decay = n.decay ?? 0.09;
      g.gain.setValueAtTime(Math.max(1e-4, level * fade), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(f); f.connect(g); g.connect(dry);
      if (echo && wet) g.connect(wet);
      src.start(t); src.stop(t + decay + 0.02);
    }
    // The body: a short pitched thump under the noise, which is what tells a snare
    // from a hiss and a kick from a click.
    const body = v.body;
    if (body) {
      const t = time;
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = body.type || 'triangle';
      o.frequency.setValueAtTime(body.from ?? 210, t);
      o.frequency.exponentialRampToValueAtTime(body.to ?? 140, t + (body.decay ?? 0.06));
      og.gain.setValueAtTime(Math.max(1e-4, gain * (body.gain ?? 0.375)), t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + (body.decay ?? 0.06));
      o.connect(og); og.connect(dry);
      if (echo && wet) og.connect(wet);
      o.start(t); o.stop(t + (body.decay ?? 0.06) + 0.02);
    }
    return true;
  }

  /**
   * A drum-synth voice: the Microtonic construction — one oscillator and one noise
   * generator, each with its own envelope, summed and optionally driven into a
   * waveshaper. `_playNoise` grew from the engine's snare and stops at "a burst with
   * a thump under it"; this is the other way round, a drum designed as two sources:
   *
   *   osc    a pitched section: waveform, a pitch envelope (`from` falling to `to`
   *          over `sweep` seconds), and an amp envelope of its own
   *   noise  the seeded buffer through a filter whose cutoff can itself sweep
   *          (`freq` to `to`), with its own amp envelope
   *   drive  0–1: the summed sections through a tanh shaper — an 808 kick pushed
   *          into a desk, not a distortion pedal
   *
   * Both sections are optional — a tom is all osc, a clap all noise. Envelope curves
   * are 'exp' (struck) or 'lin' (gated); attacks default to instant.
   *
   * The drive sits INSIDE the voice, before the per-note level. `voiceGain` scales a
   * preset by its measured peak on the assumption that everything after the synth is
   * linear in its output — a shaper after the level would make the sound depend on
   * how loud the lane happens to be, and a preset would audition differently from
   * how it renders. In here, the shaper sees the preset's own levels and nothing else.
   *
   * Like `_playNoise`: one-shots, native nodes, never pooled, deterministic offline
   * because the only noise in it is the seeded buffer.
   */
  _playDrum(v, { time, gain, dry, wet, echo }) {
    const ctx = this.ctx;
    const o = v.osc;
    const n = v.noise;
    if (!o && !n) return false;
    if (n && !this.noiseBuf) return false;
    const taps = v.taps || [0];

    // One envelope, three shapes of arrival: instant, ramped, gated.
    const env = (param, t, level, attack = 0.001, decay = 0.1, curve = 'exp') => {
      param.setValueAtTime(1e-4, t);
      param.linearRampToValueAtTime(Math.max(1e-4, level), t + attack);
      if (curve === 'lin') param.linearRampToValueAtTime(0, t + attack + decay);
      else param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
      return attack + decay;
    };

    for (let i = 0; i < taps.length; i++) {
      const t = time + taps[i];
      const fade = (v.tapFalloff ?? 1) ** i;

      // The hit's output: note level applied AFTER the shaper — see above.
      const out = ctx.createGain();
      out.gain.value = gain * fade;
      let into = out;
      if (v.drive > 0) {
        const shaper = ctx.createWaveShaper();
        shaper.curve = this._driveCurve(v.drive);
        shaper.connect(out);
        into = shaper;
      }
      out.connect(dry);
      if (echo && wet) out.connect(wet);

      let len = 0;
      if (o) {
        const osc = ctx.createOscillator();
        osc.type = o.type || 'sine';
        const from = o.from ?? 190;
        const to = o.to ?? 52;
        osc.frequency.setValueAtTime(from, t);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + (o.sweep ?? 0.07));
        const g = ctx.createGain();
        len = Math.max(len, env(g.gain, t, o.gain ?? 1, o.attack, o.decay ?? 0.35, o.curve));
        osc.connect(g); g.connect(into);
        osc.start(t); osc.stop(t + len + 0.03);
      }
      if (n) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        // Looped: the buffer is half a second and an open hat's envelope is not. The
        // filter takes the edge off the seam the crash path avoids with a longer buffer.
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = n.type || 'bandpass';
        const freq = n.freq ?? 2600;
        f.frequency.setValueAtTime(freq, t);
        if (n.to != null && n.to !== freq) {
          f.frequency.exponentialRampToValueAtTime(n.to, t + (n.sweep ?? ((n.attack ?? 0.001) + (n.decay ?? 0.12))));
        }
        f.Q.value = n.Q ?? 0.7;
        const g = ctx.createGain();
        const nlen = env(g.gain, t, n.gain ?? 1, n.attack, n.decay ?? 0.12, n.curve);
        len = Math.max(len, nlen);
        src.connect(f); f.connect(g); g.connect(into);
        src.start(t); src.stop(t + nlen + 0.03);
      }
    }
    return true;
  }

  /**
   * The drive's transfer curve, cached per amount: tanh, normalised so the curve
   * always reaches full scale and the drive changes the KNEE rather than the level.
   * Deterministic — a formula, not noise — so it renders offline like everything else.
   */
  _driveCurve(amount) {
    this._driveCurves ||= new Map();
    const key = Math.round(amount * 100);
    let curve = this._driveCurves.get(key);
    if (!curve) {
      // Square-law, like a drive knob: the bottom half of the travel is warmth, the
      // near-square crunch lives in the top quarter. Linear-in-k put a heavily
      // squared wave at 0.2 on the dial and left the rest of the travel repeating it.
      const k = 1 + (key / 100) ** 2 * 24;
      const norm = Math.tanh(k);
      curve = new Float32Array(1025);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / norm;
      }
      this._driveCurves.set(key, curve);
    }
    return curve;
  }

  /**
   * Take a pool out of service WITHOUT cutting off what it is playing.
   *
   * Disposing a pool disposes its synths, and disposing a synth mid-note is a hard
   * stop: the note you are listening to ends on the spot, and any note already booked
   * in the 120ms lookahead never sounds at all. That is fine when the audio is muted
   * around it — `setBank` opens after a deliberate half-second gap — and it is what
   * you can hear on the desk, where the song is playing and the whole point is to keep
   * listening while you work.
   *
   * So: out of `pools` immediately, which is all the next note needs, and disposed
   * once it has gone quiet — the last note it was given, plus the longest release in
   * the sound it was built from. Until then it simply plays what it was asked to play.
   */
  _retire(key, pool) {
    this.pools.delete(key);
    // An offline render never edits a preset mid-play, and its clock does not run at
    // wall speed, so a timer would fire in the wrong place if it fired at all. Keep
    // the immediate, deterministic disposal where there is nothing to listen to.
    if (typeof this.ctx.startRendering === 'function') { this._disposePool(pool); return; }
    const now = this.ctx.currentTime;
    const quiet = Math.max(pool.until, now) + VoiceRack.tailOf(pool.spec);
    const timer = setTimeout(() => {
      this._retired.delete(timer);
      this._disposePool(pool);
    }, Math.ceil((quiet - now) * 1000));
    this._retired.set(timer, pool);
  }

  /**
   * Push an edited preset onto the synths already built from it.
   *
   * Tone's `set` walks the same options bag its constructor takes, so an envelope, a
   * filter, a harmonicity or a waveform can be moved on a synth that is standing
   * there — no rebuild, and nothing to cut off. Returns false if it would not go, and
   * the caller falls back to building the pool again.
   */
  _applyLive(pool, spec) {
    try {
      for (const { synth, vib } of pool.slots) {
        synth.set(JSON.parse(JSON.stringify(spec.opts)));
        // `set` only writes the keys it is given, and `buildSpec` omits a glide of
        // zero — so dragging GLIDE back down has to be said explicitly or the last
        // non-zero value would stay on the synth for good.
        if (typeof synth.portamento === 'number') synth.portamento = spec.opts.portamento ?? 0;
        if (vib && spec.vibrato) {
          vib.frequency.value = spec.vibrato.rate;
          vib.depth.value = spec.vibrato.depth;
          vib.type = spec.vibrato.type;
        }
      }
      return true;
    } catch {
      // A value Tone would not take. Rare — the panel's ranges are its ranges — but a
      // rebuilt pool is always a valid answer, so this is a fallback rather than a bug.
      return false;
    }
  }

  _disposePool(pool) {
    if (pool.gone) return;   // retired then disposed again by dispose(): once is enough
    pool.gone = true;
    for (const { synth, out, vib } of pool.slots) {
      try { synth.dispose(); } catch { /* already gone with its context */ }
      // The vibrato runs an LFO of its own, which goes on running after the synth
      // in front of it is gone unless it is disposed too.
      if (vib) { try { vib.dispose(); } catch { /* ditto */ } }
      try { out.disconnect(); } catch { /* ditto */ }
    }
  }

  /**
   * Drop the pools a bank no longer names, and keep the rest playing.
   *
   * For the desk. Changing a preset on one strip used to dispose the whole rack, which
   * is right when the song changes and wrong when one lane does: every OTHER lane's
   * synths went with it, so a chord ringing on an untouched channel was cut because
   * you moved the bass. Now only the lane you changed loses its voice — the pool that
   * is about to be replaced anyway.
   *
   * `voiceIdFor(laneKey)` is the caller's, because the rack does not read banks: it is
   * handed a voice per note and pools by lane. Anything it says is null takes that
   * lane's pools with it.
   */
  prune(voiceIdFor) {
    for (const [key, pool] of [...this.pools]) {
      // The lane from the key, the voice from the pool: a voice id is free-form and a
      // lane key is not, so splitting on the first separator is the half that is safe.
      const laneKey = key.slice(0, key.indexOf('|'));
      if (voiceIdFor(laneKey) === pool.voiceId) continue;
      // Retired, not disposed: the lane's OLD sound is very likely still ringing when
      // you pick its new one, and the point of choosing a preset over a playing song
      // is that the song goes on playing. See `_retire`.
      this._retire(key, pool);
    }
  }

  /**
   * The other half of `prune`: same disposal, different question.
   *
   * `prune` is for a lane that changed WHICH voice it plays. This is for a voice that
   * changed what it IS — the preset editor moving an envelope or a filter, on every
   * lane playing it at once. A pool holds Tone synths constructed from `options`, so
   * until the ones holding the old options are gone, editing the catalogue changes
   * nothing you can hear.
   *
   * The blunt way is a re-bank, and the desk did it that way first. But `setBank`
   * opens with a deliberate half-second gap, which is right for changing songs and
   * wrong for dragging a filter: it put half a second of silence between every pixel.
   * Nothing else has to restart — level, length, pitch and the preset's own `peak`
   * are all read at schedule time.
   *
   * Dropping the pool outright was the next answer, and it is still not the right one:
   * it is a cache to the rack, but to the ear it is the note you are listening to, and
   * disposing it stops that note dead. So there are three answers here rather than
   * one, in order of how much they disturb:
   *
   *   nothing    what moved is read per note anyway — most of the panel
   *   set        push it onto the synths as they stand — every envelope, filter,
   *              waveform and ratio, changing under your hand with no seam
   *   retire     a different class or a vibrato appearing: build again, and let the
   *              old pool play out what it was given rather than cutting it
   *
   * Noise presets never reach here. `_playNoise` builds native nodes per hit and
   * caches nothing, so it is showing the current numbers already.
   */
  refresh(voiceId) {
    const v = VOICES[voiceId];
    for (const [key, pool] of [...this.pools]) {
      if (pool.voiceId !== voiceId) continue;
      if (!v || !SYNTHS[v.synth]) { this._retire(key, pool); continue; }
      const spec = VoiceRack.buildSpec(v);
      // Nothing that is built into a synth moved, so there is nothing to do — and on
      // this panel that is MOST of the controls. LENGTH, VELOCITY, TRANSPOSE, FINE,
      // TAPS, FALLOFF and VOICING are all read at schedule time, and every knob on a
      // noise or drum preset builds its nodes per hit. Those used to arrive here and
      // take the sound out from under you to change nothing about it.
      if (JSON.stringify(pool.spec) === JSON.stringify(spec)) continue;
      // Two things cannot be set on a standing synth: the CLASS, which is a different
      // object, and whether there is a vibrato node in front of it, which is a
      // different graph. Both are pill clicks rather than drags. Everything else —
      // every envelope, every filter, every waveform, every ratio — goes straight
      // onto the synths that are playing, so the note you are listening to changes
      // under your hand instead of stopping.
      const rewires = pool.spec.synth !== spec.synth || !pool.spec.vibrato !== !spec.vibrato;
      if (!rewires && this._applyLive(pool, spec)) { pool.spec = spec; continue; }
      this._retire(key, pool);
    }
  }

  dispose() {
    for (const [timer, pool] of this._retired) { clearTimeout(timer); this._disposePool(pool); }
    this._retired.clear();
    for (const pool of this.pools.values()) this._disposePool(pool);
    this.pools.clear();
  }
}
