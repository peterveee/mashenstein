// Offline renderer for a music bank — mirrors engine/audio.js voice-for-voice
// (same envelopes, filters, echo bus, section/order song-form logic).
//
// This was the body of tools/render-track.js. It now lives here so the full-mix
// render and the per-instrument stem render walk the *same* code: a stem that
// disagreed with the mix would be worse than no stem at all.
//
// Two things differ from the old inline version:
//  - `lanes` gates each voice, so one lane can be rendered on its own.
//  - noise is a seeded PRNG rather than Math.random(), so a lane rendered alone
//    gets byte-identical noise to the same lane inside the mix. The bus is
//    linear, so with that in place the stems sum back to the mix exactly.

export const SR = 44100;

// Every sequencer lane the engine reads, in mix order. `label` names the stem
// file; `group` is only used for the printed summary.
export const LANES = [
  { key: 'bass', label: 'bass', group: 'melodic' },
  { key: 'lead', label: 'lead', group: 'melodic' },
  { key: 'leadHarm', label: 'lead-harmony', group: 'melodic' },
  { key: 'twinkle', label: 'twinkle', group: 'melodic' },
  { key: 'chords', label: 'chords', group: 'melodic' },
  { key: 'organChords', label: 'organ', group: 'melodic' },
  { key: 'organGliss', label: 'organ-gliss', group: 'fx' },
  { key: 'organSwoop', label: 'organ-swoop', group: 'fx' },
  { key: 'keyGliss', label: 'key-gliss', group: 'fx' },
  { key: 'gliss', label: 'gliss', group: 'fx' },
  { key: 'electroFx', label: 'electro-fx', group: 'fx' },
  { key: 'sweeps', label: 'sweeps', group: 'fx' },
  { key: 'vox', label: 'vox', group: 'vocal' },
  { key: 'shout', label: 'shout', group: 'vocal' },
  { key: 'kick', label: 'kick', group: 'drums' },
  { key: 'snare', label: 'snare', group: 'drums' },
  { key: 'clap', label: 'clap', group: 'drums' },
  { key: 'rim', label: 'rim', group: 'drums' },
  { key: 'hats', label: 'hats-closed', group: 'drums' },
  { key: 'ohats', label: 'hats-open', group: 'drums' },
  { key: 'crash', label: 'crash', group: 'drums' },
];

// Expand sections/order into the flat block list the sequencer walks.
export function songBlocks(bank, repeat = 1) {
  const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
  const blocks = [];
  for (let r = 0; r < repeat; r++) {
    for (const oi of order) blocks.push(bank.sections ? { ...bank, ...bank.sections[oi] } : bank);
  }
  return blocks;
}

// Which lanes actually fire anywhere in the song form. Used to skip writing
// silent stems for lanes a bank declares but never plays.
export function activeLanes(bank, repeat = 1) {
  const blocks = songBlocks(bank, repeat);
  return LANES.filter(({ key }) => blocks.some((b) => b[key] && b[key].some(Boolean)));
}

// ---- DSP helpers ------------------------------------------------------------
function biquad(type, f0, Q = 1) {
  const w0 = (2 * Math.PI * f0) / SR, alpha = Math.sin(w0) / (2 * Q), cs = Math.cos(w0);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
  else if (type === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; } // bandpass (constant peak)
  const a0 = 1 + alpha, a1 = -2 * cs, a2 = 1 - alpha;
  const s = { x1: 0, x2: 0, y1: 0, y2: 0 };
  const c = { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  return (x) => {
    const y = c.b0 * x + c.b1 * s.x1 + c.b2 * s.x2 - c.a1 * s.y1 - c.a2 * s.y2;
    s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
    return y;
  };
}
const expInterp = (a, b, t) => a * Math.pow(b / a, t);
function envAt(keys, t) { // exponential interp between [time, value] keyframes
  if (t <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    if (t <= keys[k][0]) {
      const [t0, v0] = keys[k - 1], [t1, v1] = keys[k];
      return expInterp(Math.max(v0, 1e-4), Math.max(v1, 1e-4), (t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}
function lerpAt(keys, t) { // linear interp for formant trajectories
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let k = 1; k < keys.length; k++) {
    if (t <= keys[k][0]) {
      const [t0, a0, b0] = keys[k - 1], [t1, a1, b1] = keys[k];
      const u = (t - t0) / Math.max(1e-6, t1 - t0);
      return [a0 + (a1 - a0) * u, b0 + (b1 - b0) * u];
    }
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
}
function varBandpass(Q) { // bandpass biquad with retunable center frequency
  const s = { x1: 0, x2: 0, y1: 0, y2: 0 };
  let c = null;
  return {
    set(f0) {
      const w0 = (2 * Math.PI * f0) / SR, alpha = Math.sin(w0) / (2 * Q), cs = Math.cos(w0);
      const a0 = 1 + alpha;
      c = { b0: alpha / a0, b2: -alpha / a0, a1: (-2 * cs) / a0, a2: (1 - alpha) / a0 };
    },
    run(x) {
      const y = c.b0 * x + c.b2 * s.x2 - c.a1 * s.y1 - c.a2 * s.y2;
      s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
      return y;
    },
  };
}
function varLowpass(Q) {
  const s = { x1: 0, x2: 0, y1: 0, y2: 0 };
  let c = null;
  return {
    set(f0) {
      const w0 = (2 * Math.PI * f0) / SR, alpha = Math.sin(w0) / (2 * Q), cs = Math.cos(w0);
      const a0 = 1 + alpha;
      c = {
        b0: ((1 - cs) / 2) / a0,
        b1: (1 - cs) / a0,
        b2: ((1 - cs) / 2) / a0,
        a1: (-2 * cs) / a0,
        a2: (1 - alpha) / a0,
      };
    },
    run(x) {
      const y = c.b0 * x + c.b1 * s.x1 + c.b2 * s.x2 - c.a1 * s.y1 - c.a2 * s.y2;
      s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
      return y;
    },
  };
}
function wave(type, ph) {
  const p = ph - Math.floor(ph);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'sawtooth') return 2 * p - 1;
  if (type === 'triangle') return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  return Math.sin(2 * Math.PI * p);
}

// The engine fills its noise buffers once from Math.random(); we need the same
// samples every pass so a solo'd lane matches its contribution to the mix.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}
function noiseTable(seconds, seed) {
  const n = Math.floor(SR * seconds);
  const buf = new Float32Array(n);
  const rnd = mulberry32(seed);
  for (let i = 0; i < n; i++) buf[i] = rnd();
  return buf;
}
// engine: noiseBuf is 0.5s, crashBuf is 2.5s — both filled once at startup.
const NOISE_BUF = noiseTable(0.5, 0x5eed1234);
const CRASH_BUF = noiseTable(2.5, 0xc7a54100);

/**
 * Render one bank to a mono Float32Array at SR.
 *
 * @param {object} bank        a music bank (cabinet.music, HUB_THEME, MEGAMIX_THEME, …)
 * @param {object} [opts]
 * @param {number} [opts.repeat=1]  how many times to walk the song form
 * @param {Set<string>|null} [opts.lanes=null]  lane keys to include; null = every lane
 * @param {number} [opts.tail=2.0]  seconds of silence appended for the echo tail
 * @returns {{out: Float32Array, seconds: number, blocks: number, peak: number}}
 */
export function renderBank(bank, { repeat = 1, lanes = null, tail = 2.0, echoSend = 'all' } = {}) {
  const on = lanes ? (k) => lanes.has(k) : () => true;
  const bpm = bank.bpm;
  const spb = (60 / bpm) / 4; // seconds per 16th step (detune = 1)
  const blocks = songBlocks(bank, repeat);
  const N = Math.ceil((blocks.length * 32 * spb + tail) * SR);

  const voice = new Float32Array(N); // pre-bus voice sum (everything, dry path)
  // The engine's echoBus is a parallel send fed only by the melodic lanes —
  // percussion and vocal one-shots stay dry whatever echoLevel says. `wet`
  // tracks that subset. echoSend picks which one feeds the delay:
  //   'all'     — the whole voice sum, which is what every render this repo has
  //               shipped and auditioned so far does. Kept as the default so
  //               stems and mixes match the WAVs already on disk.
  //   'melodic' — engine-accurate: drums and vocal one-shots stay out of the
  //               repeats. Audibly different; opt in deliberately.
  const wet = new Float32Array(N);   // the subset that feeds the echo send
  const MUSIC_GAIN = 0.7;
  const MUSIC_TRIM = bank.musicTrim ?? 1;

  // play(): 0.0001 -> peak over atk, then -> 0.0001 at dur (engine's osc env).
  // echo mirrors play()'s echo flag: true = also tap the send.
  function tone(t0, dur, type, freqFn, peak, atk = 0.01, echo = true) {
    const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
    let ph = 0;
    for (let i = 0; i < n && i0 + i < N; i++) {
      const t = i / SR;
      ph += freqFn(t) / SR;
      const env = t < atk ? expInterp(0.0001, peak, t / atk) : expInterp(peak, 0.0001, (t - atk) / Math.max(1e-6, dur - atk));
      const v = wave(type, ph) * env;
      voice[i0 + i] += v;
      if (echo) wet[i0 + i] += v;
    }
  }
  function filteredSawBass(t0, dur, freq, peak, atk, open, close, Q, echo = false) {
    const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
    const lp = varLowpass(Q);
    let ph = 0;
    for (let i = 0; i < n && i0 + i < N; i++) {
      const t = i / SR;
      ph += freq / SR;
      lp.set(open * Math.pow(close / open, t / dur));
      const env = t < atk ? expInterp(0.0001, peak, t / atk)
        : expInterp(peak, 0.0001, (t - atk) / Math.max(1e-6, dur - atk));
      const v = lp.run(wave('sawtooth', ph)) * env;
      voice[i0 + i] += v;
      if (echo) wet[i0 + i] += v;
    }
  }
  // percussion env: setValueAtTime(peak) -> exp ramp to 0.001 over decay.
  // `src` reads the shared noise table so the same hit is the same noise in
  // every pass; the table wraps exactly like the engine's looped buffer.
  function noiseEv(t0, stop, peak, decay, filt, echo = false) {
    const i0 = Math.floor(t0 * SR), n = Math.floor(stop * SR);
    for (let i = 0; i < n && i0 + i < N; i++) {
      const t = i / SR;
      const env = t < decay ? expInterp(peak, 0.001, t / decay) : 0.001;
      const v = filt(NOISE_BUF[(i0 + i) % NOISE_BUF.length]) * env;
      voice[i0 + i] += v;
      if (echo) wet[i0 + i] += v;
    }
  }
  function tonalPerc(t0, stop, type, f0, f1, sweepT, peak, decay, echo = false, atk = 0) {
    const i0 = Math.floor(t0 * SR), n = Math.floor(stop * SR);
    let ph = 0;
    for (let i = 0; i < n && i0 + i < N; i++) {
      const t = i / SR;
      ph += (t < sweepT ? expInterp(f0, f1, t / sweepT) : f1) / SR;
      // atk > 0 mirrors the engine's short exponential ramp in (the 808 body),
      // rather than a hard setValueAtTime at the peak.
      const env = t < atk ? expInterp(0.0001, peak, t / atk)
        : (t < decay ? expInterp(peak, 0.001, (t - atk) / Math.max(1e-6, decay - atk)) : 0.001);
      const v = wave(type, ph) * env;
      voice[i0 + i] += v;
      if (echo) wet[i0 + i] += v;
    }
  }

  // ---- sequence all voices --------------------------------------------------
  const lvlTarget = new Float32Array(N).fill(0.28); // echo send target per sample
  blocks.forEach((b, blk) => {
    for (let s = 0; s < 32; s++) {
      const t0 = (blk * 32 + s) * spb;
      const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.floor((t0 + spb) * SR));
      lvlTarget.fill(b.echoLevel != null ? b.echoLevel : 0.28, i0, i1);
      const type = b.leadType || 'square';
      const EV = !!b.echoEverything;
      if (on('bass') && b.bass && b.bass[s]) {
        // Bass is dry unless the bank opts in — the engine's default, and it
        // matters for deep lines whose harmonics would otherwise wash the delay.
        const bassDur = spb * (b.bassDur || 1.8);
        const bassGain = b.bassGain ?? 0.1;
        const bassEcho = !!b.bassEcho || EV;
        if (b.bassFilteredSaw) {
          const f = b.bass[s];
          filteredSawBass(t0, bassDur, f, bassGain, b.bassAttack || 0.006,
            b.bassFilterOpen ?? 1150, b.bassFilterClose ?? 320, b.bassFilterQ ?? 1.15, bassEcho);
          tone(t0, bassDur * 1.05, 'sine', () => f * 0.5,
            bassGain * (b.bassFilteredSawSubGain ?? 0.22), 0.008, false);
        } else if (b.bass80s) {
          const f = b.bass[s];
          tone(t0, bassDur, b.bass80sBodyType || 'square', () => f,
            bassGain * (b.bass80sBodyGain ?? 0.78), b.bassAttack || 0.004, bassEcho);
          tone(t0, bassDur * 1.08, 'sine', () => f * 0.5,
            bassGain * (b.bass80sSubGain ?? 0.34), 0.006, false);
          tone(t0, bassDur * 0.62, 'triangle', () => f * 2,
            bassGain * (b.bass80sOctaveGain ?? 0.34), 0.003, false);
        } else {
          tone(t0, bassDur, b.bassType || 'square', () => b.bass[s], bassGain, b.bassAttack || 0.01, bassEcho);
        }
        if (b.bassRepeat) {
          tone(t0 + spb * b.bassRepeat, bassDur * (b.bassRepeatDur ?? 0.8), b.bassType || 'square',
            () => b.bass[s], bassGain * (b.bassRepeatGain ?? 0.4), b.bassAttack || 0.01, false);
        }
      }
      if (on('lead') && b.lead && b.lead[s]) {
        const leadDur = spb * (b.leadDur || 1.2);
        const leadGain = b.leadGain ?? 0.06;
        tone(t0, leadDur, type, () => b.lead[s], leadGain, b.leadAttack || 0.01);
        if (b.leadBright) {
          tone(t0, leadDur * 0.68, 'sine', () => b.lead[s] * 2,
            leadGain * (b.leadBrightGain ?? 0.16), 0.004, false);
        }
      }
      if (on('leadHarm') && b.leadHarm && b.leadHarm[s]) tone(t0, spb * (b.harmDur || b.leadDur || 1.2), b.harmType || type, () => b.leadHarm[s], b.harmGain ?? 0.04, b.harmAttack || b.leadAttack || 0.01);
      if (on('twinkle') && b.twinkle && b.twinkle[s]) {
        // Sustained sine bell plus a quieter octave — the shop theme's shimmer.
        const dur = spb * (b.twinkleDur || 6);
        const g = b.twinkleGain ?? 0.014;
        const f = b.twinkle[s];
        tone(t0, dur, 'sine', () => f, g, b.twinkleAttack || 0.035);
        tone(t0, dur * 0.65, 'sine', () => f * 2, g * 0.28, 0.02);
      }
      if (on('electroFx') && b.electroFx && b.electroFx[s]) {
        const f = b.electroFx[s];
        const gain = b.electroFxGain ?? 0.012;
        const dur = spb * (b.electroFxDur || 0.86);
        const kind = s % 3;
        if (kind === 2) {
          tone(t0, dur, 'sine', () => f, gain, 0.002, true);
          tone(t0, dur * 0.62, 'sine', () => f * 2.01, gain * 0.42, 0.002, false);
        } else {
          const from = kind === 0 ? f * 0.72 : f * 1.8;
          const to = kind === 0 ? f * 1.45 : f * 0.68;
          tone(t0, dur, kind === 0 ? 'square' : 'triangle',
            (t) => from * Math.pow(to / from, t / dur), gain, 0.003, true);
        }
      }
      if (on('sweeps') && b.sweeps && b.sweeps[s]) {
        // Heavily filtered air: a narrow band opens and closes under a fixed
        // low-pass ceiling. Felt as motion rather than heard as hiss. Dry —
        // the engine wires this straight to musicBus, never the echo send.
        // (The engine's stereo pan sweep has no meaning in a mono render.)
        const dur = spb * (b.sweepDur || 10);
        const gain = b.sweepGain ?? 0.013;
        const band = varBandpass(1.45);
        const low = biquad('lowpass', 1800, 0.5);
        const i0s = Math.floor(t0 * SR), n = Math.floor(dur * SR);
        for (let i = 0; i < n && i0s + i < N; i++) {
          const t = i / SR;
          band.set(t < dur * 0.55
            ? expInterp(340, 1350, t / (dur * 0.55))
            : expInterp(1350, 460, (t - dur * 0.55) / (dur * 0.45)));
          const env = t < dur * 0.32
            ? expInterp(0.0001, gain, t / (dur * 0.32))
            : expInterp(gain, 0.0001, (t - dur * 0.32) / (dur * 0.68));
          voice[i0s + i] += low(band.run(NOISE_BUF[(i0s + i) % NOISE_BUF.length])) * env;
        }
      }
      if (on('chords') && b.chords && b.chords[s]) for (const f of b.chords[s]) tone(t0, spb * (b.chordDur || 2.6), b.chordType || 'square', () => f, b.chordGain ?? 0.05, b.chordAttack || 0.01);
      if (on('organChords') && b.organChords && b.organChords[s]) {
        const drawbars = b.organBright
          ? [[1, 1], [2, 0.78], [3, 0.48], [4, 0.3], [6, 0.16]]
          : [[1, 1], [2, 0.62], [3, 0.32], [4, 0.2], [6, 0.1]];
        const dur = spb * (b.organDur || 7.2);
        const gain = b.organGain ?? 0.009;
        const echo = b.organEcho !== false;
        for (const f of b.organChords[s]) {
          for (const [ratio, level] of drawbars) {
            tone(t0, dur, 'sine', () => f * ratio, gain * level, b.organAttack || 0.035, echo);
          }
          if (b.organPercussion) {
            tone(t0, spb * (b.organPercussionDur || 0.62), 'sine', () => f * 3,
              gain * (b.organPercussionGain || 0.72), 0.002, false);
          }
        }
      }
      if (on('organGliss') && b.organGliss && b.organGliss[s]) {
        const target = b.organGliss[s];
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0];
        const dt = (spb * (b.organGlissSpan || 2.7)) / steps.length;
        const gain = b.organGlissGain ?? 0.012;
        const partials = b.organBright
          ? [[1, 1], [2, 0.7], [3, 0.4], [4, 0.22]]
          : [[1, 1], [2, 0.55], [3, 0.25]];
        steps.forEach((semi, i) => {
          const note = target * Math.pow(2, semi / 12);
          for (const [ratio, level] of partials) {
            tone(t0 + i * dt, dt * 1.35, 'sine', () => note * ratio,
              gain * level, b.organGlissAttack || 0.003, false);
          }
        });
      }
      if (on('organSwoop') && b.organSwoop && b.organSwoop[s]) {
        const target = b.organSwoop[s];
        const from = target * Math.pow(2, (b.organSwoopFromSemitones ?? -5) / 12);
        const dur = spb * (b.organSwoopDur || 3.2);
        const gain = b.organSwoopGain ?? 0.012;
        const partials = b.organBright
          ? [[1, 1], [2, 0.66], [3, 0.34], [4, 0.18]]
          : [[1, 1], [2, 0.5], [3, 0.22]];
        for (const [ratio, level] of partials) {
          tone(t0, dur, 'sine',
            (t) => from * ratio * Math.pow(target / from, t / dur),
            gain * level, 0.012, true);
        }
      }
      if (on('keyGliss') && b.keyGliss && b.keyGliss[s]) {
        const fT = b.keyGliss[s];
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0];
        const dt = (spb * 3) / steps.length;
        const gv = b.keyGlissGain != null ? b.keyGlissGain : 0.06;
        steps.forEach((semi, k) => tone(t0 + k * dt, dt * 1.7, type, () => fT * Math.pow(2, semi / 12), gv * (0.6 + 0.4 * ((k + 1) / steps.length)), 0.006));
      }
      if (on('gliss') && b.gliss && b.gliss[s]) {
        const fT = b.gliss[s], T = spb * 3;
        const i0g = Math.floor(t0 * SR), n = Math.floor(spb * 4 * SR);
        let ph = 0;
        for (let i = 0; i < n && i0g + i < N; i++) {
          const t = i / SR;
          ph += (t < T ? fT * 0.5 * Math.pow(2, t / T) : fT) / SR;
          let env;
          if (t < 0.02) env = expInterp(0.0001, 0.05, t / 0.02);
          else if (t < T) env = 0.05;
          else env = expInterp(0.05, 0.0001, (t - T) / (spb * 4 - T));
          voice[i0g + i] += wave(type, ph) * env; // (stereo pan taps omitted in mono render)
        }
      }
      if (on('vox') && b.vox && b.vox[s]) {
        const f0 = b.vox[s];
        const [fm1, fm2] = (s % 8 < 4) ? [750, 1150] : [600, 2000];
        const bp1 = biquad('bandpass', fm1, 5), bp2 = biquad('bandpass', fm2, 8);
        const i0v = Math.floor(t0 * SR), n = Math.floor(0.2 * SR);
        let ph = 0;
        for (let i = 0; i < n && i0v + i < N; i++) {
          const t = i / SR;
          ph += (t < 0.07 ? expInterp(f0 * 1.3, f0, t / 0.07) : f0) / SR;
          const env = t < 0.02 ? expInterp(0.0001, 0.55, t / 0.02) : expInterp(0.55, 0.0001, (t - 0.02) / 0.16);
          const src = wave('sawtooth', ph) * env;
          voice[i0v + i] += (bp1(src) + bp2(src)) * 0.55;
        }
      }
      if (on('shout') && b.shout && b.shout[s]) {
        const f0 = b.shout[s];
        const word = (blk + s) % 2 === 0 ? 'yeah' : 'alright';
        const dur = word === 'yeah' ? 0.32 : 0.46;
        const traj = word === 'yeah'
          ? [[0, 320, 2100], [0.08, 560, 1800], [0.28, 760, 1250]]
          : [[0, 520, 950], [0.16, 700, 1300], [0.22, 640, 1100], [0.3, 720, 1350], [0.44, 400, 2000]];
        const pitchK = word === 'yeah'
          ? [[0, f0 * 1.25], [dur, f0 * 0.9]]
          : [[0, f0], [0.2, f0], [0.28, f0 * 1.25], [dur, f0 * 0.8]];
        const envK = word === 'yeah'
          ? [[0, 0.0001], [0.02, 0.5], [dur, 0.0001]]
          : [[0, 0.0001], [0.02, 0.5], [0.2, 0.2], [0.26, 0.5], [dur, 0.0001]];
        const sg = b.shoutGain != null ? b.shoutGain : 0.5;
        const bpA = varBandpass(5), bpB = varBandpass(8);
        const i0v = Math.floor(t0 * SR), n = Math.floor(dur * SR);
        let ph = 0;
        for (let i = 0; i < n && i0v + i < N; i++) {
          const t = i / SR;
          ph += envAt(pitchK, t) / SR;
          const [F1, F2] = lerpAt(traj, t);
          bpA.set(F1); bpB.set(F2);
          const src = wave('sawtooth', ph) * envAt(envK, t);
          voice[i0v + i] += (bpA.run(src) + bpB.run(src)) * sg;
        }
      }
      if (on('kick') && b.kick && b.kick[s]) {
        // 808: long sine body pitched down into a sub, a 12ms high-passed click
        // for the beater, and a mid "knock" so the attack survives the bass.
        const kg = (b.kickGain ?? 1) * (b.drumGain ?? 1);
        const tailK = b.kickTail ?? 0.2;
        tonalPerc(t0, tailK + 0.04, 'sine', 165, 48, 0.05, 0.42 * kg, tailK, EV, 0.006);
        noiseEv(t0, 0.03, 0.13 * kg, 0.012, biquad('highpass', 1900), EV);
        const knock = b.kickKnock ?? 1;
        if (knock > 0) tonalPerc(t0, 0.07, 'triangle', 300, 180, 0.04, 0.17 * kg * knock, 0.05, EV, 0.004);
      }
      const drumGain = b.drumGain ?? 1;
      if (on('hats') && b.hats && b.hats[s]) noiseEv(t0, 0.07, 0.14 * drumGain, 0.05, biquad('highpass', 5200), EV);
      if (on('ohats') && b.ohats && b.ohats[s]) noiseEv(t0, 0.24, 0.12 * drumGain, 0.22, biquad('highpass', 4200), EV);
      if (on('snare') && b.snare && b.snare[s]) {
        noiseEv(t0, 0.11, 0.32 * drumGain, 0.09, biquad('bandpass', 2600, 0.7), EV);
        tonalPerc(t0, 0.08, 'triangle', 210, 140, 0.05, 0.12 * drumGain, 0.06, EV);
      }
      if (on('crash') && b.crash && b.crash[s]) {
        // Looped noise through a fixed 1200Hz highpass into a lowpass that
        // closes from crashOpen to crashClose across the hit — a cymbal
        // decaying rather than a burst of static. Dry unless crashEcho.
        const dur = spb * (b.crashDur || 5);
        const gain = (b.crashGain ?? 0.15) * drumGain;
        const hpC = biquad('highpass', 1200);
        const lpC = varLowpass(0.7);
        const open = b.crashOpen ?? 9000, close = b.crashClose ?? 1100;
        const echo = !!b.crashEcho || EV;
        const i0c = Math.floor(t0 * SR), n = Math.floor(dur * SR);
        for (let i = 0; i < n && i0c + i < N; i++) {
          const t = i / SR;
          lpC.set(expInterp(open, close, t / dur));
          const env = t < 0.005
            ? expInterp(0.0001, gain, t / 0.005) // near-instant transient
            : expInterp(gain, 0.0001, (t - 0.005) / (dur - 0.005));
          const v = lpC.run(hpC(CRASH_BUF[i % CRASH_BUF.length])) * env;
          voice[i0c + i] += v;
          if (echo) wet[i0c + i] += v;
        }
      }
      if (on('rim') && b.rim && b.rim[s]) {
        const lvl = (b.rimGain ?? 0.21) * drumGain;
        for (const f of [1720, 2630, 3350]) {
          tone(t0, 0.075, 'square', (t) => f * Math.pow(0.94, t / 0.06), lvl * 0.32, 0.001, false);
        }
        noiseEv(t0, 0.03, lvl * 0.45, 0.012, biquad('highpass', 3200), EV);
        tonalPerc(t0, 0.08, 'triangle', 430, 300, 0.05, lvl * 0.38, 0.06, EV);
      }
      if (on('clap') && b.clap && b.clap[s]) for (let ci = 0; ci < 3; ci++) {
        noiseEv(t0 + ci * 0.012, 0.15,
          (ci === 2 ? 0.26 : 0.16) * drumGain * (b.clapGain ?? 1),
          ci === 2 ? 0.12 : 0.03, biquad('highpass', 1500), EV);
      }
    }
  });

  // ---- echo bus (send -> HP500 -> delay -> LP2800 -> fb 0.35 + out) ----------
  const delaySamp = Math.round(Math.min(0.9, (60 / bpm) * 0.75) * SR);
  const hp = biquad('highpass', 500), lp = biquad('lowpass', 2800);
  const dline = new Float32Array(delaySamp);
  const out = new Float32Array(N);
  const smooth = 1 - Math.exp(-1 / (0.08 * SR)); // setTargetAtTime tau = 0.08
  let lvl = lvlTarget[0], di = 0;
  for (let i = 0; i < N; i++) {
    lvl += (lvlTarget[i] - lvl) * smooth;
    const music = voice[i] * MUSIC_GAIN * MUSIC_TRIM;
    const send = (echoSend === 'melodic' ? wet[i] : voice[i]) * MUSIC_GAIN * MUSIC_TRIM;
    const x = hp(send * lvl);
    const y = lp(dline[di]);
    out[i] = music + y;
    dline[di] = x + 0.35 * y;
    di = (di + 1) % delaySamp;
  }

  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
  return { out, seconds: N / SR, blocks: blocks.length, peak };
}

// ---- 16-bit mono WAV --------------------------------------------------------
export function wavBuffer(samples, gain = 1) {
  const N = samples.length;
  const data = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * gain * 32767))), i * 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}

export function rmsOf(samples, gain = 1) {
  let acc = 0, n = 0;
  for (let i = 0; i < samples.length; i += 100) { acc += (samples[i] * gain) ** 2; n++; }
  return Math.sqrt(acc / Math.max(1, n));
}
