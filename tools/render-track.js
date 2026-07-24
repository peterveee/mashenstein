// Offline WAV render of a music bank — mirrors engine/audio.js voice-for-voice
// (same envelopes, filters, echo bus, section/order song-form logic).
// Usage: node tools/render-track.js [trackId|hub] [repeats] [outPath]
// e.g.:  node tools/render-track.js plumber 2 dist/plumber-panic.wav
import { writeFileSync } from 'fs';
import { CABINET_BY_ID, HUB_THEME } from '../src/data/cabinets.js';

const [, , trackId = 'plumber', repeatArg = '2', outArg = null] = process.argv;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 2);
const bank = trackId === 'hub' ? HUB_THEME : (CABINET_BY_ID[trackId] || {}).music;
if (!bank) { console.error(`unknown track "${trackId}"`); process.exit(1); }
const OUT = outArg || `dist/${trackId === 'hub' ? 'food-court' : trackId + '-panic'}.wav`;

const SR = 44100;
const bpm = bank.bpm;
const spb = (60 / bpm) / 4; // seconds per 16th step (detune = 1)
const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
const blocks = [];
for (let r = 0; r < REPEAT; r++) for (const oi of order) blocks.push(bank.sections ? { ...bank, ...bank.sections[oi] } : bank);
const TAIL = 2.0;
const N = Math.ceil((blocks.length * 32 * spb + TAIL) * SR);

const voice = new Float32Array(N); // pre-bus voice sum (everything, dry path)
// The engine's echoBus is a parallel send fed only by the melodic lanes —
// percussion and vocal one-shots stay dry whatever echoLevel says. Rendering
// the whole voice sum into the delay (as this tool used to) put the kick and
// hats in the repeats, which is audibly not the mix the game plays.
const wet = new Float32Array(N);   // the subset that feeds the echo send
const MUSIC_GAIN = 0.7;

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
function wave(type, ph) {
  const p = ph - Math.floor(ph);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'sawtooth') return 2 * p - 1;
  if (type === 'triangle') return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  return Math.sin(2 * Math.PI * p);
}
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
// percussion env: setValueAtTime(peak) -> exp ramp to 0.001 over decay
function noiseEv(t0, stop, peak, decay, filt, echo = false) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(stop * SR);
  for (let i = 0; i < n && i0 + i < N; i++) {
    const t = i / SR;
    const env = t < decay ? expInterp(peak, 0.001, t / decay) : 0.001;
    const v = filt(Math.random() * 2 - 1) * env;
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

// ---- sequence all voices ----------------------------------------------------
const lvlTarget = new Float32Array(N).fill(0.28); // echo send target per sample
blocks.forEach((b, blk) => {
  for (let s = 0; s < 32; s++) {
    const t0 = (blk * 32 + s) * spb;
    const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.floor((t0 + spb) * SR));
    lvlTarget.fill(b.echoLevel != null ? b.echoLevel : 0.28, i0, i1);
    const type = b.leadType || 'square';
    const EV = !!b.echoEverything;
    if (b.bass && b.bass[s]) {
      // Bass is dry unless the bank opts in — the engine's default, and it
      // matters for deep lines whose harmonics would otherwise wash the delay.
      const bassDur = spb * (b.bassDur || 1.8);
      const bassGain = b.bassGain ?? 0.1;
      const bassEcho = !!b.bassEcho || EV;
      tone(t0, bassDur, b.bassType || 'square', () => b.bass[s], bassGain, b.bassAttack || 0.01, bassEcho);
      if (b.bassRepeat) {
        tone(t0 + spb * b.bassRepeat, bassDur * (b.bassRepeatDur ?? 0.8), b.bassType || 'square',
          () => b.bass[s], bassGain * (b.bassRepeatGain ?? 0.4), b.bassAttack || 0.01, false);
      }
    }
    if (b.lead && b.lead[s]) tone(t0, spb * (b.leadDur || 1.2), type, () => b.lead[s], b.leadGain ?? 0.06, b.leadAttack || 0.01);
    if (b.leadHarm && b.leadHarm[s]) tone(t0, spb * (b.harmDur || b.leadDur || 1.2), b.harmType || type, () => b.leadHarm[s], b.harmGain ?? 0.04, b.harmAttack || b.leadAttack || 0.01);
    if (b.chords && b.chords[s]) for (const f of b.chords[s]) tone(t0, spb * (b.chordDur || 2.6), b.chordType || 'square', () => f, b.chordGain ?? 0.05, b.chordAttack || 0.01);
    if (b.keyGliss && b.keyGliss[s]) {
      const fT = b.keyGliss[s];
      const steps = [-12, -10, -9, -7, -5, -4, -2, 0];
      const dt = (spb * 3) / steps.length;
      const gv = b.keyGlissGain != null ? b.keyGlissGain : 0.06;
      steps.forEach((semi, k) => tone(t0 + k * dt, dt * 1.7, type, () => fT * Math.pow(2, semi / 12), gv * (0.6 + 0.4 * ((k + 1) / steps.length)), 0.006));
    }
    if (b.gliss && b.gliss[s]) {
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
    if (b.vox && b.vox[s]) {
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
    if (b.shout && b.shout[s]) {
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
    if (b.kick && b.kick[s]) {
      // 808: long sine body pitched down into a sub, a 12ms high-passed click
      // for the beater, and a mid "knock" so the attack survives the bass.
      const kg = b.kickGain ?? 1;
      const tail = b.kickTail ?? 0.2;
      tonalPerc(t0, tail + 0.04, 'sine', 165, 48, 0.05, 0.42 * kg, tail, EV, 0.006);
      noiseEv(t0, 0.03, 0.13 * kg, 0.012, biquad('highpass', 1900), EV);
      const knock = b.kickKnock ?? 1;
      if (knock > 0) tonalPerc(t0, 0.07, 'triangle', 300, 180, 0.04, 0.17 * kg * knock, 0.05, EV, 0.004);
    }
    if (b.hats && b.hats[s]) noiseEv(t0, 0.07, 0.14, 0.05, biquad('highpass', 5200), EV);
    if (b.ohats && b.ohats[s]) noiseEv(t0, 0.24, 0.12, 0.22, biquad('highpass', 4200), EV);
    if (b.snare && b.snare[s]) {
      noiseEv(t0, 0.11, 0.32, 0.09, biquad('bandpass', 2600, 0.7), EV);
      tonalPerc(t0, 0.08, 'triangle', 210, 140, 0.05, 0.12, 0.06, EV);
    }
    if (b.clap && b.clap[s]) for (let ci = 0; ci < 3; ci++) {
      noiseEv(t0 + ci * 0.012, 0.15, ci === 2 ? 0.26 : 0.16, ci === 2 ? 0.12 : 0.03, biquad('highpass', 1500), EV);
    }
  }
});

// ---- echo bus (send -> HP500 -> delay -> LP2800 -> fb 0.35 + out) ------------
const delaySamp = Math.round(Math.min(0.9, (60 / bpm) * 0.75) * SR);
const hp = biquad('highpass', 500), lp = biquad('lowpass', 2800);
const dline = new Float32Array(delaySamp);
const out = new Float32Array(N);
const smooth = 1 - Math.exp(-1 / (0.08 * SR)); // setTargetAtTime tau = 0.08
let lvl = lvlTarget[0], di = 0;
for (let i = 0; i < N; i++) {
  lvl += (lvlTarget[i] - lvl) * smooth;
  const music = voice[i] * MUSIC_GAIN;
  const x = hp(music * lvl);
  const y = lp(dline[di]);
  out[i] = music + y;
  dline[di] = x + 0.35 * y;
  di = (di + 1) % delaySamp;
}

// ---- normalize + write 16-bit mono WAV --------------------------------------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
const norm = peak > 0 ? 0.9 / peak : 1; // normalize to -1 dBFS-ish either direction
const data = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out[i] * norm * 32767))), i * 2);
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
writeFileSync(OUT, Buffer.concat([hdr, data]));
let rms = 0;
for (let i = 0; i < N; i += 100) rms += out[i] * out[i];
console.log(`${OUT}: ${(N / SR).toFixed(1)}s, peak ${peak.toFixed(3)}, rms ~${Math.sqrt(rms / (N / 100)).toFixed(3)}, ${REPEAT}x form (${blocks.length * 2} bars)`);
