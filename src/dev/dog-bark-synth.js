// DogBarkSynthesizer — a canine vocalisation engine built to the "vocal fold +
// throat transient + vocal tract" spec.
//
// THIS GRAPH SHIPPED. It won the A/B against the cue that stood in
// engine/audio.js, and `dogWoof` there is now this same graph in the engine's
// own idiom, driven by BARK_SHAPES — whose vocabulary is this file's, so a set
// of numbers dialled in on the bench is pasted in without translation.
// DOG_PRESETS.finish and BARK_SHAPES.finish are the same dog.
//
// It stays in src/dev because the BENCH is the point: tools/dogbark-bench.html
// drives this class live, with a control for every parameter, which is how the
// shipped shape was found. Nothing in src/game imports it. Change the engine and
// this file has to follow, or the bench stops predicting the cue.
//
// WHY IT IS SHAPED THIS WAY
//
// The engine's own bark is one summed source bank through one moving tract. This
// one splits the animal into the four parts a phonetician would name, and lets
// each be dialled on its own:
//
//   1. VOCAL FOLD SOURCE — a sawtooth whose pitch is SLAMMED down 12-24 semitones
//      over the first 50-200ms. That drop is the single most identifying gesture
//      in a bark; a flat or gently falling fundamental reads as a synth note.
//      A half-rate detuned twin rides under it: real folds slam irregularly and
//      throw subharmonics, and that tearing is most of what says "animal".
//   2. THROAT / AIR TRANSIENT — a noise burst through a bandpass, gone in 30-80ms.
//      This is the plosive: the chest emptying before the voice catches up.
//   3. ACOUSTIC TRACT — two peaking formants. F1 sweeps DOWN (~900 -> ~400Hz) as
//      the jaw shuts, F2 sits high (1.8-2.5kHz) for the muzzle. Both the voice and
//      the aspiration go through them, which is what fuses them into one throat
//      instead of a hiss sitting behind a tone.
//   4. NON-LINEAR BODY — a soft-clipping waveshaper for vocal strain, and a short
//      feedback delay for chest cavity depth.
//
// Everything is scheduled on the AudioContext clock and torn down by its own
// oscillator stop times, so an OfflineAudioContext renders it identically to a
// live one — that is how tools/render-dogbark.js auditions it.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const semis = (n) => Math.pow(2, n / 12);

// Soft clip. tanh-ish, but built from a curve table because WaveShaperNode wants
// one. `k` is drive: 0 passes through, 1 is heavy strain. Odd-symmetric, so it
// adds odd harmonics — the buzz of a voice pushed hard, not the fizz of a fuzzbox.
function softClipCurve(k, n = 2048) {
  const curve = new Float32Array(n);
  const drive = 1 + k * 24;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

// The presets. Each is a full options object; play() merges over DEFAULTS so a
// preset only has to say what makes it that dog.
export const DOG_PRESETS = {
  // Big chest, low tract, slow tremor. The one that would replace the finish
  // dog's `gruff` — it has to carry over end-of-stage music.
  large: {
    pitch: 172, pitchDrop: 16, duration: 0.26, breathiness: 0.85,
    formantFreq: 620, formant2: 1750, distortion: 0.55,
    rough: 0.5, roughHz: 52, sub: 0.9, chest: 0.5, bright: 0.22,
  },
  // Terrier at the gate: short, high, snappy, almost no chest.
  small: {
    pitch: 620, pitchDrop: 13, duration: 0.11, breathiness: 0.6,
    formantFreq: 1150, formant2: 2600, distortion: 0.35,
    rough: 0.42, roughHz: 118, sub: 0.35, chest: 0.1, bright: 0.5,
  },
  // Mid-size dog, mouth working, plenty of air. The neutral reference.
  medium: {
    pitch: 340, pitchDrop: 15, duration: 0.17, breathiness: 0.75,
    formantFreq: 880, formant2: 2100, distortion: 0.45,
    rough: 0.46, roughHz: 84, sub: 0.6, chest: 0.3, bright: 0.35,
  },
  // Guard dog: the "decided about you" bark. Hardest drive, deepest drop, a
  // growl smeared under the front of it.
  guard: {
    pitch: 205, pitchDrop: 21, duration: 0.22, breathiness: 0.95,
    formantFreq: 700, formant2: 1900, distortion: 0.75,
    rough: 0.62, roughHz: 44, sub: 1, chest: 0.6, bright: 0.28, growl: 0.5,
  },
  // PETER'S DIAL-IN, off the bench. The one to beat: a full two-octave drop, the
  // voice nearly clean (rough 0.15, distortion 0.08) and the air pushed up top
  // instead — this is a bark heard across a yard rather than one in your face,
  // and it is a long way from where the presets above started. Kept verbatim so
  // the numbers that were approved by ear are the numbers that ship.
  finish: {
    pitch: 375, pitchDrop: 24, duration: 0.225, breathiness: 0.31,
    formantFreq: 880, formant2: 2720, distortion: 0.08,
    rough: 0.15, roughHz: 68, sub: 0.26, chest: 0.3, bright: 0.8,
    growl: 0.2, plosive: 0.32, gain: 0.88,
  },
  // Pure yip — the small dog with the voice mostly out of it. Nearly all air.
  yip: {
    pitch: 780, pitchDrop: 12, duration: 0.08, breathiness: 1.1,
    formantFreq: 1300, formant2: 2900, distortion: 0.3,
    rough: 0.35, roughHz: 140, sub: 0.2, chest: 0.05, bright: 0.6,
  },
};

const DEFAULTS = {
  pitch: 300,          // Hz, the fundamental AT THE PEAK of the onset
  pitchDrop: 15,       // semitones the fold source falls across `duration`
  duration: 0.17,      // s, the voiced body (the tail runs past it)
  breathiness: 0.75,   // 0..1.5, aspiration level relative to the voice
  formantFreq: 880,    // Hz, F1 at mouth-open; it sweeps down to 0.45x of this
  formant2: 2100,      // Hz, the muzzle resonance
  distortion: 0.45,    // 0..1, waveshaper drive
  rough: 0.46,         // 0..1, depth of the amplitude tremor
  roughHz: 84,         // Hz, tremor rate at the onset (it slows across the bark)
  sub: 0.6,            // level of the half-rate subharmonic twin
  chest: 0.3,          // 0..1, feedback-delay body resonance
  bright: 0.35,        // unfiltered top air, alongside the tract
  growl: 0,            // 0..1, a low pre-voiced snarl smeared into the onset
  plosive: 1,          // scale on the throat transient
  gain: 1,             // final level
  when: 0,             // s from now
};

export class DogBarkSynthesizer {
  /**
   * @param {BaseAudioContext} ctx      live or offline; both render identically
   * @param {AudioNode} [destination]   defaults to ctx.destination
   */
  constructor(ctx, destination = null) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.out.connect(destination || ctx.destination);
    this.voices = [];          // every node that has to be stoppable
    this.noiseBuf = this._makeNoise(2);
  }

  // Pink-ish noise: white through a Voss-style one-pole cascade. Pink rather than
  // white because a throat is not a hi-hat — the energy has to sit low enough that
  // the tract has something to resonate.
  _makeNoise(seconds) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(seconds * sr), sr);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
    }
    return buf;
  }

  /**
   * Fire one bark.
   * @param {object} options  see DEFAULTS; a preset name string also works
   * @returns {number} the time, in seconds from now, at which the bark is over
   */
  play(options = {}) {
    const o = typeof options === 'string'
      ? { ...DEFAULTS, ...(DOG_PRESETS[options] || {}) }
      : { ...DEFAULTS, ...(options.preset ? DOG_PRESETS[options.preset] : null), ...options };
    const ctx = this.ctx;
    const t = ctx.currentTime + Math.max(0, o.when);
    const dur = clamp(o.duration, 0.04, 1);
    const tail = dur * 0.55 + 0.05;     // the mouth closing, past the voiced body
    const stop = t + dur + tail;
    const kept = [];

    // ---- output chain: strain -> chest -> level -------------------------
    // Order matters. The waveshaper goes BEFORE the body resonance, because a
    // real chest resonates a voice that is already strained; distorting the
    // resonance instead just smears the room.
    const level = ctx.createGain();
    level.gain.value = clamp(o.gain, 0, 4);
    level.connect(this.out);

    const shaper = ctx.createWaveShaper();
    shaper.curve = softClipCurve(clamp(o.distortion, 0, 1));
    shaper.oversample = '4x';
    // Soft clipping raises the average level as it flattens the peaks; back the
    // drive off at the output so a distortion sweep changes TIMBRE, not volume.
    const postDrive = ctx.createGain();
    postDrive.gain.value = 1 / (1 + o.distortion * 1.6);
    shaper.connect(postDrive); postDrive.connect(level);

    if (o.chest > 0.001) {
      // A very short feedback delay is a resonator: 7ms rings around 140Hz, which
      // is where a big dog's chest lives. Lowpassed in the loop so it darkens as
      // it decays instead of ringing metallic.
      const dl = ctx.createDelay(0.1);
      dl.delayTime.value = 0.0072;
      const fb = ctx.createGain();
      fb.gain.value = 0.45 + o.chest * 0.25;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 900;
      const wet = ctx.createGain();
      wet.gain.value = o.chest * 0.5;
      postDrive.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl);
      dl.connect(wet); wet.connect(level);
    }

    // ---- the tremor that makes it ragged rather than sung ----------------
    // Applied to the SUMMED tract output, so voice and air roughen together.
    // Modulate only the oscillator and you get a smooth hiss behind a rough
    // tone, which the ear hears as two sounds instead of one animal.
    const rough = ctx.createGain();
    rough.gain.value = 1 - o.rough;
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(o.roughHz, t);
    lfo.frequency.linearRampToValueAtTime(o.roughHz * 0.55, t + dur);
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = o.rough;
    lfo.connect(lfoAmt); lfoAmt.connect(rough.gain);
    rough.connect(shaper);
    lfo.start(t); lfo.stop(stop);
    kept.push(lfo);

    // ---- envelope: hit, collapse, tail. No sustain anywhere --------------
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.3, t + dur * 0.32);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + tail * 0.7);
    env.gain.linearRampToValueAtTime(0, stop);
    env.connect(rough);

    // ---- 3. the vocal tract, everything through it -----------------------
    // Peaking rather than bandpass, so the tract COLOURS the source instead of
    // replacing it: a bandpass throws away the broadband air that makes a bark
    // carry, and what comes back is a filtered buzz.
    const f1 = ctx.createBiquadFilter();
    f1.type = 'peaking';
    f1.Q.value = 4;
    f1.gain.value = 16;
    // The jaw: F1 flies open on the onset then shuts across the bark. This
    // sweep IS the "wo-of" — hold it still and the vowel never moves.
    f1.frequency.setValueAtTime(o.formantFreq * 0.62, t);
    f1.frequency.linearRampToValueAtTime(o.formantFreq, t + dur * 0.14);
    f1.frequency.exponentialRampToValueAtTime(
      Math.max(80, o.formantFreq * 0.45), t + dur + tail * 0.5);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'peaking';
    f2.Q.value = 3.2;
    f2.gain.value = 12;
    f2.frequency.setValueAtTime(o.formant2, t);
    f2.frequency.linearRampToValueAtTime(o.formant2 * 0.82, t + dur + tail * 0.5);

    // A third resonance, low-Q and fixed: the bite at the top that the ear finds
    // first on a small speaker. Cheap, and the difference between "dog" and
    // "dog heard through a wall".
    const f3 = ctx.createBiquadFilter();
    f3.type = 'peaking';
    f3.Q.value = 2.4;
    f3.gain.value = 7;
    f3.frequency.value = clamp(o.formant2 * 1.5, 2200, 4200);

    f1.connect(f2); f2.connect(f3); f3.connect(env);

    // ---- 1. vocal fold source -------------------------------------------
    // The pitch contour: a fast snap UP on the onset (the folds catching), then
    // the whole drop across the body. Exponential, so it falls fastest first —
    // a linear fall reads as a sequenced glide.
    const f0 = clamp(o.pitch, 40, 1800);
    const end = Math.max(35, f0 / semis(clamp(o.pitchDrop, 0, 36)));
    const dropTime = clamp(dur * 0.9, 0.05, 0.2);   // spec: 50-200ms
    const fold = (mult, detune, level) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(f0 * mult * 0.8, t);
      osc.frequency.linearRampToValueAtTime(f0 * mult * 1.06, t + 0.012);
      osc.frequency.exponentialRampToValueAtTime(end * mult, t + dropTime);
      // Past the drop it keeps sagging gently — the animal running out of air.
      osc.frequency.exponentialRampToValueAtTime(end * mult * 0.86, t + dur + tail * 0.6);
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g); g.connect(f1);
      osc.start(t); osc.stop(stop);
      kept.push(osc);
      return osc;
    };
    fold(1, 0, 0.5);
    // The subharmonic twin, detuned so it beats against the fundamental rather
    // than locking to it. This is the tear in the voice.
    if (o.sub > 0.001) fold(0.5, 15, 0.5 * o.sub);
    // A growl smeared under the onset: a third fold an octave down, fading out
    // as the bark proper takes over.
    if (o.growl > 0.001) {
      const g = ctx.createOscillator();
      g.type = 'sawtooth';
      g.frequency.setValueAtTime(f0 * 0.34, t);
      g.frequency.exponentialRampToValueAtTime(f0 * 0.26, t + dur);
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(o.growl * 0.4, t);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
      g.connect(gg); gg.connect(f1);
      g.start(t); g.stop(stop);
      kept.push(g);
    }

    // ---- 2. throat / air ------------------------------------------------
    // Aspiration through the tract for the length of the bark: a bark smears
    // energy from a couple of hundred Hz past 5k, which no sawtooth does.
    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuf;
    air.loop = true;
    air.playbackRate.value = 0.8 + Math.random() * 0.4;   // never the same air twice
    const airG = ctx.createGain();
    airG.gain.setValueAtTime(o.breathiness, t);
    airG.gain.linearRampToValueAtTime(o.breathiness * 0.45, t + dur);
    // Rolled off above the tract. Measured against the engine's own cue, which
    // puts ~60% of its magnitude above 6kHz where a real bark puts about a
    // quarter — that top-heavy air is what makes a synthetic bark read as hiss
    // with a tone behind it rather than as an animal. The lowpass drags the
    // energy back down into the bands the formants actually work on.
    const airLP = ctx.createBiquadFilter();
    airLP.type = 'lowpass';
    airLP.frequency.setValueAtTime(5200, t);
    airLP.frequency.linearRampToValueAtTime(3200, t + dur);  // the mouth closing
    airLP.Q.value = 0.6;
    air.connect(airLP); airLP.connect(airG); airG.connect(f1);
    air.start(t); air.stop(stop);
    kept.push(air);

    // The plosive: the chest emptying, bandpassed around the throat and gone in
    // 30-80ms. Scaled off the tract so a small dog's puff sits higher.
    const burst = ctx.createBufferSource();
    burst.buffer = this.noiseBuf;
    burst.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(clamp(o.formantFreq * 1.7, 700, 2400), t);
    bp.frequency.exponentialRampToValueAtTime(clamp(o.formantFreq * 0.9, 300, 1600), t + 0.06);
    const bg = ctx.createGain();
    const puff = clamp(0.03 + dur * 0.28, 0.03, 0.08);    // spec: 30-80ms
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(1.1 * o.plosive, t + 0.004);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + puff);
    burst.connect(bp); bp.connect(bg); bg.connect(rough);   // past the tract: it IS the throat
    burst.start(t); burst.stop(t + puff + 0.02);
    kept.push(burst);

    // Unfiltered top air alongside the tract. Real barks are not fully
    // resonated, and this is what survives a phone speaker. Rolled off low so
    // it cannot become a cymbal.
    if (o.bright > 0.001) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const hg = ctx.createGain();
      hg.gain.value = o.bright;
      airG.connect(hp); hp.connect(hg); hg.connect(env);
    }

    this.voices.push(...kept);
    // Drop the finished nodes from the stop list rather than growing it forever.
    const ms = (stop - ctx.currentTime) * 1000;
    if (typeof setTimeout === 'function' && ctx.state !== undefined) {
      setTimeout(() => { this.voices = this.voices.filter((v) => !kept.includes(v)); }, ms + 100);
    }
    return Math.max(0, o.when) + dur + tail;
  }

  /**
   * A volley. Real dogs do not repeat themselves: each bark in a string is a
   * little lower, a little shorter and a little differently timed than the last,
   * and the ear reads an exact repeat as a machine. So every bark past the first
   * gets +-5% pitch jitter, +-5% timing jitter, and a slight downward drift as
   * the animal runs out of breath.
   *
   * @param {object} options   as play(), plus `count` and `gap` (s between barks)
   * @returns {number} when the volley is over, in seconds from now
   */
  doubleBark(options = {}) {
    const base = typeof options === 'string' ? { preset: options } : options;
    const count = Math.max(2, Math.round(base.count ?? 2));
    const gap = base.gap ?? 0.24;
    let when = base.when ?? 0;
    let last = when;
    for (let i = 0; i < count; i++) {
      const jitter = 1 + (Math.random() * 0.1 - 0.05);       // +-5% pitch
      const timing = 1 + (Math.random() * 0.1 - 0.05);       // +-5% spacing
      const fade = 1 - i * 0.03;                             // running out of air
      const merged = { ...DEFAULTS, ...(base.preset ? DOG_PRESETS[base.preset] : null), ...base };
      last = this.play({
        ...merged,
        when,
        pitch: merged.pitch * jitter * fade,
        duration: merged.duration * (i === 0 ? 1 : 0.94 + Math.random() * 0.1),
        gain: (merged.gain ?? 1) * (i === 0 ? 1 : 0.92 + Math.random() * 0.1),
        // The second bark of a pair sits a touch lower in the tract too — the
        // mouth does not fully reset between them.
        formantFreq: merged.formantFreq * (i === 0 ? 1 : 0.94),
      });
      when += gap * timing;
    }
    return last;
  }

  /** Silence everything in flight. */
  stop() {
    const now = this.ctx.currentTime;
    for (const v of this.voices) { try { v.stop(now); } catch { /* already stopped */ } }
    this.voices = [];
  }
}

export default DogBarkSynthesizer;
