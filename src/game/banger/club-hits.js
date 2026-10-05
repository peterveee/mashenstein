// THE CLUB'S OWN SOUNDS — the floor pads and Fernwick's build. 5 Oct 2026.
//
// What a player plays ON TOP of the song in the club, built from plain Web Audio nodes and
// handed the song's own bus (Audio.musicBus), so it sits in the mix: under the song's trim
// and through whatever hero move has the master. Nothing here touches the song's lanes, so
// there is nothing to put back.
//
//   PADS    the dance floor, split in four across: a dub siren, a clap, a crowd's shout and
//           an air horn, the siren, the shout and the horn in the song's key, each struck on
//           the song's next sixteenth (club.js). The shout is a different word each tap —
//           HEY!, HO!, YEAH!, WOO!, OI! (Peter, 5 Oct 2026: the siren over the crash, and more
//           than the one phrase).
//   RISER   Fernwick's LONGBOW: a noise sweep with a tone under it, climbing for as long as
//           the bow is drawn and cut dead on the drop
//   ROLL    a snare roll under the riser, quickening bar by bar
//
// Every builder takes the context, where to play and when, so the same code renders in an
// OfflineAudioContext for auditioning.

/**
 * Each hit's gain at the music bus, levelled the way the voice library levels a preset
 * (tools/measure-voices.js): one hit in a four-second window, its K-weighted RMS and its
 * peak against the lane it stands in for (LANE_TARGETS in src/data/voices.js), the gain the
 * geometric mean of the two ratios. The crash against the crash lane, the clap against the
 * clap, a roll hit against the snare; the HEY! against the shout lane and the horn against a
 * lead note, each 3 dB over, because they are played to be heard over the song. The riser's
 * is its peak at the top of the sweep. Measured 5 Oct 2026 (work/local/club-hits-level.mjs).
 */
export const HIT_GAINS = Object.freeze({
  siren: 0.048, clap: 0.39, shout: 1, horn: 0.057, roll: 0.216, riser: 0.17,
});
const gainOf = (name) => HIT_GAINS[name] ?? 0;

/** The four pads, left to right across the floor. */
export const PADS = Object.freeze([
  { id: 'siren', label: 'SIREN!', col: '#ffd23f' },
  { id: 'clap', label: 'CLAP!', col: '#ff4fa3' },
  { id: 'shout', label: 'HEY!', col: '#7cff6b' },
  { id: 'horn', label: 'HORN!', col: '#3fb8ff' },
]);

/**
 * The shout pad's words, in turn: each a breath or not, how long, how the pitch moves
 * (`rise` from its start to its end, as a ratio) and the three formants' glide, [F1, F2, F3]
 * from the first entry to the second — read as the vowel moving. `gain` is each word's own
 * level, against the shout lane and 3 dB over it, as HIT_GAINS (the shout's there is 1).
 */
export const SHOUTS = Object.freeze([
  { word: 'HEY!', breath: true, dur: 0.36, rise: 0.86, from: [700, 1750, 2650], to: [470, 2250, 2950], gain: 0.29 },
  { word: 'HO!', breath: true, dur: 0.34, rise: 0.84, from: [560, 920, 2450], to: [430, 760, 2350], gain: 0.315 },
  { word: 'YEAH!', breath: false, dur: 0.38, rise: 0.82, from: [320, 2100, 2800], to: [760, 1250, 2500], gain: 0.274 },
  { word: 'WOO!', breath: false, dur: 0.42, rise: 1.3, from: [300, 640, 2300], to: [360, 820, 2400], gain: 0.227 },
  { word: 'OI!', breath: false, dur: 0.32, rise: 0.9, from: [560, 860, 2500], to: [300, 2300, 3000], gain: 0.323 },
]);

// Two seconds of white noise per context, shared by every hit. Seeded, so a render repeats.
const NOISE = new WeakMap();
function noiseBuffer(ctx) {
  let b = NOISE.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 0x2545f491;
    for (let i = 0; i < d.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      d[i] = seed / 2147483648 - 1;
    }
    NOISE.set(ctx, b);
  }
  return b;
}

function noise(ctx, when, seconds, { loop = false, offset = 0 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx);
  s.loop = loop;
  s.start(when, offset % 1.9);
  if (Number.isFinite(seconds)) s.stop(when + seconds);
  return s;
}

function filter(ctx, type, frequency, Q = 0.7, gain = 0) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = frequency; f.Q.value = Q;
  if (gain) f.gain.value = gain;
  return f;
}

function osc(ctx, type, frequency, when, seconds) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(frequency, when);
  o.start(when); o.stop(when + seconds);
  return o;
}

/** A gain that is silent until `when`, then `peak` after `attack`, falling to nothing over `decay`. */
function hitEnvelope(ctx, when, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(1e-5, peak * 1e-4), when + attack + decay);
  return g;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

/** A pitch in a register: `hz` moved by octaves into [lo, hi). */
const inRange = (hz, lo, hi) => {
  let f = hz > 0 ? hz : 220;
  while (f < lo) f *= 2;
  while (f >= hi) f /= 2;
  return f;
};

// ---------------------------------------------------------------- the pads

/**
 * The dub siren: a square in the song's key whooping up into a wail that wobbles a minor
 * third either way every sixteenth, climbing an octave across two beats and dropping away at
 * the end — through an echo a dotted eighth long, as the sound-system ones are.
 */
function siren(ctx, out, when, { tonic = 440, sixteenth = 0.12 } = {}) {
  const f = inRange(tonic, 440, 880);
  const s = Math.max(0.07, Math.min(0.2, sixteenth));
  const len = s * 8;
  const o = ctx.createOscillator();
  o.type = 'square';
  const p = o.frequency;
  p.setValueAtTime(f * 0.5, when);
  p.exponentialRampToValueAtTime(f * 0.75, when + 0.05);
  p.exponentialRampToValueAtTime(f * 1.5, when + len * 0.85);
  p.exponentialRampToValueAtTime(f * 0.4, when + len);
  // the wobble: a triangle at the song's sixteenths on the pitch, a minor third deep
  const lfo = ctx.createOscillator();
  lfo.type = 'triangle';
  lfo.frequency.value = 1 / s;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, when);
  depth.gain.linearRampToValueAtTime(f * 0.19, when + 0.08);
  lfo.connect(depth);
  depth.connect(p);
  o.start(when); o.stop(when + len + 0.05);
  lfo.start(when); lfo.stop(when + len + 0.05);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(1, when + 0.01);
  env.gain.setValueAtTime(1, when + len - 0.06);
  env.gain.linearRampToValueAtTime(0, when + len);
  const voice = chain(o, filter(ctx, 'bandpass', 1500, 0.6), filter(ctx, 'lowpass', 3800, 0.7), env);
  voice.connect(out);
  // the echo: three sixteenths behind, dimmer each time round, darker as it goes
  const delay = ctx.createDelay(1);
  delay.delayTime.value = s * 3;
  const fb = ctx.createGain();
  fb.gain.value = 0.45;
  const send = ctx.createGain();
  send.gain.value = 0.5;
  voice.connect(send);
  chain(send, delay, filter(ctx, 'lowpass', 2400, 0.7), fb, delay);
  fb.connect(out);
  // a loop of nodes is never let go on its own: open it once the echo has died away
  const tail = when + len + s * 3 * 10;
  fb.gain.setValueAtTime(0.45, tail - 0.05);
  fb.gain.linearRampToValueAtTime(0, tail);
  if (typeof setTimeout === 'function') {
    setTimeout(() => { try { fb.disconnect(); delay.disconnect(); } catch { /* gone */ } },
      Math.max(0, (tail - ctx.currentTime) * 1000 + 200));
  }
}

/** A clap: three slaps a hair apart and a fourth with the room behind it. */
function clap(ctx, out, when) {
  const src = chain(noise(ctx, when, 0.4, { offset: 0.37 }), filter(ctx, 'highpass', 650, 0.7), filter(ctx, 'bandpass', 1150, 1.1));
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0, when);
  for (const o of [0, 0.0095, 0.0195]) {
    p.setValueAtTime(1, when + o);
    p.exponentialRampToValueAtTime(0.08, when + o + 0.0085);
  }
  p.setValueAtTime(1, when + 0.031);
  p.exponentialRampToValueAtTime(0.0005, when + 0.031 + 0.22);
  src.connect(g);
  g.connect(out);
}

/**
 * A crowd shouting `word` (SHOUTS): four throats a few milliseconds apart, at the song's
 * tonic, an octave under it, a fifth over it and a hair sharp, so the shout is a chord in key
 * rather than a smear. Each is a breath (the H, for the words that start with one) and then a
 * sawtooth through three formants gliding across the vowel, its pitch moving the way that
 * word is shouted — falling for most, rising for a WOO!.
 */
function shout(ctx, out, when, { tonic = 220, word = SHOUTS[0] } = {}) {
  const w = typeof word === 'string' ? SHOUTS.find((x) => x.word === word) || SHOUTS[0] : word;
  const f0 = inRange(tonic, 165, 330);
  const throats = [[0, 1, -0.3], [0.008, 0.5, 0.35], [0.015, 1.498, -0.1], [0.022, 1.004, 0.25]];
  for (const [delay, ratio, pan] of throats) {
    const t = when + delay;
    const f = f0 * ratio;
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
    if (panner.pan) panner.pan.value = pan;
    const level = ctx.createGain();
    level.gain.value = w.gain ?? 1;
    chain(panner, level, out);
    if (w.breath) {
      const breath = hitEnvelope(ctx, t, 0.22, 0.012, 0.07);
      chain(noise(ctx, t, 0.12, { offset: delay * 31 }), filter(ctx, 'bandpass', 1700, 0.9), breath, panner);
    }
    // the vowel
    const v = t + (w.breath ? 0.035 : 0.005);
    const end = v + w.dur;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * (w.rise < 1 ? 1.16 : 0.92), v);
    o.frequency.exponentialRampToValueAtTime(f, v + 0.08);
    o.frequency.exponentialRampToValueAtTime(f * w.rise, end - 0.04);
    o.start(v); o.stop(end + 0.05);
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, v);
    vg.gain.linearRampToValueAtTime(0.9, v + 0.03);
    vg.gain.setValueAtTime(0.9, end - 0.16);
    vg.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(vg);
    w.from.forEach((a, k) => {
      const fm = filter(ctx, 'bandpass', a, [5, 9, 12][k]);
      fm.frequency.setValueAtTime(a, v + 0.05);
      fm.frequency.exponentialRampToValueAtTime(w.to[k], end - 0.08);
      const lg = ctx.createGain();
      lg.gain.value = [1, 0.6, 0.32][k];
      chain(vg, fm, lg, panner);
    });
  }
}

/**
 * The air horn: two short blasts and a long one on the song's grid, in the song's key — four
 * saws (two a hair either side, one an octave down) scooped up a semitone into each blast,
 * driven, and narrowed to the honk.
 */
function horn(ctx, out, when, { tonic = 440, sixteenth = 0.12 } = {}) {
  const f = inRange(tonic, 330, 660);
  const s = Math.max(0.07, Math.min(0.2, sixteenth));
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) { const x = i / (curve.length - 1) * 2 - 1; curve[i] = Math.tanh(x * 2.4) / Math.tanh(2.4); }
  for (const [at, len] of [[0, s * 0.8], [s * 2, s * 0.8], [s * 4, s * 6]]) {
    const t = when + at;
    const shaper = ctx.createWaveShaper();
    shaper.curve = curve;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.012);
    env.gain.setValueAtTime(1, t + len);
    env.gain.linearRampToValueAtTime(0, t + len + 0.035);
    for (const [ratio, level, type] of [[1, 0.5, 'sawtooth'], [1.0059, 0.4, 'sawtooth'], [0.9941, 0.4, 'sawtooth'], [0.5, 0.35, 'square']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f * ratio * 0.944, t);
      o.frequency.exponentialRampToValueAtTime(f * ratio, t + 0.035);
      if (len > s * 2) o.frequency.exponentialRampToValueAtTime(f * ratio * 0.985, t + len);
      o.start(t); o.stop(t + len + 0.05);
      const g = ctx.createGain();
      g.gain.value = level;
      chain(o, g, shaper);
    }
    chain(shaper, filter(ctx, 'bandpass', 1450, 0.55), filter(ctx, 'lowpass', 4200, 0.7), env, out);
  }
}

const PAD_BUILDERS = { siren, clap, shout, horn };

/**
 * Strike pad `id` at audio time `when` into `out`. `tonic` (Hz) puts the siren, the shout and
 * the horn in the song's key; `sixteenth` (seconds) paces the siren and spaces the horn's
 * blasts on the song's grid; `word` is the shout's (SHOUTS).
 */
export function playPad(ctx, out, id, when, opts = {}) {
  const build = PAD_BUILDERS[id];
  if (!ctx || !out || !build) return false;
  const level = ctx.createGain();
  level.gain.value = gainOf(id);
  level.connect(out);
  build(ctx, level, Math.max(when, ctx.currentTime), opts);
  return true;
}

// ---------------------------------------------------------------- Fernwick's build

/** One hit of the roll: noise through a snare's band, with a short tone for its body. */
export function rollHit(ctx, out, when, velocity = 1) {
  if (!ctx || !out) return;
  const v = Math.max(0, Math.min(1, velocity)) * gainOf('roll');
  const snap = hitEnvelope(ctx, when, v, 0.001, 0.09);
  chain(noise(ctx, when, 0.14, { offset: (when * 7.3) % 1 }), filter(ctx, 'highpass', 700, 0.7), filter(ctx, 'bandpass', 2100, 0.7), snap, out);
  const body = hitEnvelope(ctx, when, v * 0.45, 0.001, 0.06);
  chain(osc(ctx, 'triangle', 185, when, 0.1), body, out);
}

/**
 * THE RISER, from `when`, reaching the top `seconds` later and holding there: noise swept up
 * through a band (500 Hz to 9 kHz) and a saw climbing three octaves from under the tonic,
 * both swelling. `land(at)` cuts it dead at `at` — the drop — and `stop()` fades it now.
 *
 * Every ramp is ANCHORED where it has got to before it is changed: cancelling a ramp in
 * flight throws the ramp away and leaves the param on its previous event, a jump.
 */
export function startRiser(ctx, out, when, seconds, { tonic = 220 } = {}) {
  if (!ctx || !out) return null;
  const span = Math.max(0.25, seconds);
  const level = gainOf('riser');
  const g = ctx.createGain();
  g.connect(out);
  const n = noise(ctx, when, Infinity, { loop: true });
  const band = filter(ctx, 'bandpass', 500, 0.9);
  chain(n, filter(ctx, 'highpass', 250, 0.7), band, g);
  const lo = inRange(tonic, 55, 110);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.start(when);
  const toneLevel = ctx.createGain();
  toneLevel.gain.value = 0.16;
  chain(o, filter(ctx, 'lowpass', 2600, 0.7), toneLevel, g);
  // [param, from, to]: each glides exponentially across the span, then holds
  const ramps = [[band.frequency, 500, 9000], [o.frequency, lo, lo * 8], [g.gain, level * 0.002, level]];
  for (const [p, a, b] of ramps) { p.setValueAtTime(a, when); p.exponentialRampToValueAtTime(b, when + span); }
  const valueAt = (a, b, t) => a * (b / a) ** Math.max(0, Math.min(1, (t - when) / span));
  let done = false;
  const reanchor = (from, until) => {
    for (const [p, a, b] of ramps) {
      p.cancelScheduledValues(from);
      p.setValueAtTime(valueAt(a, b, from), from);
      if (until > from) p.exponentialRampToValueAtTime(valueAt(a, b, until), until);
    }
  };
  const end = (at, fade) => {
    if (done) return;
    done = true;
    // where the ramps have got to now — or their start, if the drop comes before it
    reanchor(Math.min(Math.max(ctx.currentTime, when), at), at);
    g.gain.linearRampToValueAtTime(0, at + fade);
    try { n.stop(at + fade + 0.02); o.stop(at + fade + 0.02); } catch { /* already stopped */ }
  };
  return {
    /** Cut at `at`: the drop. */
    land(at) { end(Math.max(ctx.currentTime, at), 0.02); },
    /** Fade out now: leaving the floor. */
    stop() { end(ctx.currentTime, 0.05); },
  };
}
