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
    const pool = this._pool(laneKey, voiceId, dry, wet, echo, notes.length * taps.length + 1);
    if (!pool) return false;
    // A chord arrives as an array of frequencies; a melody as one number. Nulls are
    // rests, and a bank writes plenty of them.
    for (const f of notes) {
      if (f == null || !(f > 0)) continue;
      for (let i = 0; i < taps.length; i++) {
        const slot = pool.slots[pool.next % pool.slots.length];
        pool.next++;
        const t = time + taps[i];
        // Level is set on this slot's own gain, at this note's own time, rather than
        // on one shared node: two notes overlapping at different levels is ordinary
        // (a section changes `chordGain` mid-song) and a shared node would give the
        // ringing note the new one's level.
        slot.out.gain.setValueAtTime(gain * ((v.tapFalloff ?? 1) ** i), t);
        slot.synth.triggerAttackRelease(f * detune, dur, t, v.velocity ?? 1);
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
      pool = { voiceId, dry, wet, echo, slots: [], next: 0 };
      this.pools.set(key, pool);
    }

    const v = VOICES[voiceId];
    const Ctor = SYNTHS[v.synth];
    // Grown, never shrunk. A chord that is five notes wide once is likely to be
    // again, and tearing slots down mid-song would cut whatever is ringing on them.
    while (pool.slots.length < Math.max(1, want)) {
      // Cloned so a voice that Tone mutates in place cannot edit the catalogue.
      const synth = new Ctor(v.options ? JSON.parse(JSON.stringify(v.options)) : undefined);
      const out = this.ctx.createGain();
      // Silent until a note sets its level at that note's time. A slot that has
      // never played must not pass the synth's own idle output — a DuoSynth's
      // vibrato LFO, for one, runs whether or not anything triggered it.
      out.gain.value = 0;
      Tone.connect(synth, out);
      out.connect(dry);
      if (echo && wet) out.connect(wet);
      pool.slots.push({ synth, out });
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

  _disposePool(pool) {
    for (const { synth, out } of pool.slots) {
      try { synth.dispose(); } catch { /* already gone with its context */ }
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
    for (const [key, pool] of this.pools) {
      // The lane from the key, the voice from the pool: a voice id is free-form and a
      // lane key is not, so splitting on the first separator is the half that is safe.
      const laneKey = key.slice(0, key.indexOf('|'));
      if (voiceIdFor(laneKey) === pool.voiceId) continue;
      this._disposePool(pool);
      this.pools.delete(key);
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
   * are all read at schedule time — so this cache is the whole of what an edit needs
   * to drop, and the next note is already the new sound.
   *
   * Noise presets never reach here. `_playNoise` builds native nodes per hit and
   * caches nothing, so it is showing the current numbers already.
   */
  refresh(voiceId) {
    for (const [key, pool] of this.pools) {
      if (pool.voiceId !== voiceId) continue;
      this._disposePool(pool);
      this.pools.delete(key);
    }
  }

  dispose() {
    for (const pool of this.pools.values()) this._disposePool(pool);
    this.pools.clear();
  }
}
