// The effect catalogue the desk can put on a channel or a send.
//
// Everything here is a Tone.js effect that has been VERIFIED to render in an
// OfflineAudioContext, because a WAV, stem or video is produced by rendering the
// engine offline (tools/lib/render-bank-browser.js). An effect that works in the
// browser but renders silent would sound right while you mix it and then vanish
// from everything you export — the worst kind of bug, because nothing errors.
//
// Measured silent offline, and therefore deliberately absent from the Tone-backed
// catalogue: JCReverb and Freeverb. The Bit Crusher is implemented below with native
// Web Audio nodes plus a small ScriptProcessorNode so it remains renderable in
// OfflineAudioContext and on the LAN dev server; it exposes the two actual lo-fi controls:
// bit resolution and sample-rate reduction.
//
// Rendering is not the only bar an effect has to clear: it also has to render the
// SAME every time. Tone.Reverb did not — it fills its impulse response from
// Math.random — so Reverb is `makeReverb` below, ours, seeded. Anything added here
// that generates a buffer needs checking for the same thing; two renders of a song
// being different files breaks stems, baselines and the null test at once.
import * as Tone from 'tone';
import { EFFECT_PRESETS } from '../data/effect-presets.js';
import { upperFormants, vowelAt, parseStack, vowelPosition } from './formants.js';

// Note divisions for tempo-synced effects, in beats — eight bars down to a 1/32,
// with the dotted and triplet values in between. One table for delay times and for
// modulation rates alike: they read in opposite directions (a delay wants the short
// end, an LFO the long one), but they are the same list of musical lengths and two
// tables meant two places to add a division to.
//
// Tone's own delays take seconds (or notation resolved against Tone.Transport,
// which this game does not use — the sequencer is its own), so sync is computed
// here from the song's bpm and written to the effect as plain seconds.
export const TEMPO_DIVISIONS = {
  '8 bars': 32, '4 bars': 16, '2 bars': 8, '1 bar': 4, '1/2': 2,
  '1/4 dotted': 1.5, '1/4': 1, '1/8 dotted': 0.75, '1/4 triplet': 2 / 3, '1/8': 0.5,
  '1/16 dotted': 0.375, '1/8 triplet': 1 / 3, '1/16': 0.25, '1/16 triplet': 1 / 6,
  '1/32': 0.125,
};
export const SYNC_DIVISIONS = TEMPO_DIVISIONS;
export const RATE_DIVISIONS = TEMPO_DIVISIONS;
// Auto Panner can move on phrase-length cycles without asking delay-based effects
// to allocate or advertise divisions beyond their useful eight-bar window.
export const AUTOPANNER_RATE_DIVISIONS = {
  '16 bars': 64, '8 bars': 32, '4 bars': 16, '3 bars': 12,
  ...TEMPO_DIVISIONS,
};

/**
 * How long a delay line can be. A DelayNode's buffer is allocated at construction
 * from this and never grows, so it is the real limit on the long end of the
 * divisions above: eight bars is 17 seconds at 112bpm and no delay here will run
 * that far. Eight seconds covers two bars at any tempo the game uses and costs
 * about 3MB per delay in the graph, which is why it is not simply enormous.
 */
export const MAX_DELAY_SECONDS = 8;

export const syncSeconds = (division, bpm) =>
  Math.min(MAX_DELAY_SECONDS, (60 / (bpm || 120)) * (division ?? 0.5));

/**
 * Delay time in seconds, from either a note division or a free millisecond value.
 * `sync` picks which: on, the delay follows the song's tempo and stays in the
 * groove across banks at different bpm; off, it is whatever you dial, which is what
 * you want for slapback and comb effects that have nothing to do with the beat.
 */
/**
 * LFO rate in Hz from a note division: a cycle lasting `d` beats is bpm/(60·d) Hz.
 * A tremolo at 1/8 pulses with the hi-hats instead of drifting against them, which
 * is the whole reason to sync a modulation rate rather than dial it by ear.
 */
export function rateHz(params = {}, bpm = 120) {
  const sync = params.rateSync == null ? 0 : params.rateSync;
  if (sync < 0.5) return params.frequency ?? 1;
  const beats = params.rateDivision ?? 1;
  return Math.max(0.01, Math.min(60, (bpm || 120) / (60 * beats)));
}

export function delaySeconds(params = {}, bpm = 120) {
  const sync = params.sync == null ? 1 : params.sync;
  return sync >= 0.5
    ? syncSeconds(params.division, bpm)
    : Math.min(MAX_DELAY_SECONDS, Math.max(0, (params.delayMs ?? 250) / 1000));
}

// Parameter ranges by name. Tone tells us an effect's current settings via .get(),
// but not what a sensible range is, so the desk gets them from here. `log` marks
// the ones that want a logarithmic feel rather than linear.
const PARAM_RANGES = {
  wet: { min: 0, max: 1, step: 0.01 },
  mix: { min: 0, max: 1, step: 0.01 },
  // Every left/right control on the desk's effects is a BALANCE on the card, whatever
  // the key behind it: `pan` is the Advanced Delay's, and predates the word. The keys
  // are what saved mixes hold, so they stay as they are — see PARAM_LABELS.
  pan: { min: -1, max: 1, step: 0.02 },
  balance: { min: -1, max: 1, step: 0.02 },
  // A switch, so the desk draws a box rather than a pot — see the toggle branch in
  // buildDevices. Note it is the OPPOSITE sense to the strip's own WIDTH control,
  // which is transparent at 1: here 0 is off and 1 is collapsed.
  mono: { min: 0, max: 1, step: 1, toggle: true },
  tone: { min: 400, max: 20000, step: 100, unit: 'Hz', log: true },
  sync: { min: 0, max: 1, step: 1, toggle: true },
  delayMs: { min: 1, max: 1000, step: 1, unit: 'ms' },
  division: { min: 0, max: 1, step: 0.05, division: true },
  rateSync: { min: 0, max: 1, step: 1, toggle: true },
  rateDivision: { min: 0, max: 4, step: 0.05, division: true },
  frequency: { min: 0.05, max: 20, step: 0.05, unit: 'Hz' },
  depth: { min: 0, max: 1, step: 0.01 },
  feedback: { min: 0, max: 0.95, step: 0.01 },
  delayTime: { min: 0, max: 1, step: 0.005, unit: 's' },
  baseFrequency: { min: 20, max: 8000, step: 10, unit: 'Hz', log: true },
  octaves: { min: 0, max: 8, step: 0.1 },
  distortion: { min: 0, max: 1, step: 0.01 },
  order: { min: 1, max: 50, step: 1 },
  // The exciter's three. `tune` starts at 700 because below that the harmonics it makes
  // land in the mids and it stops being an exciter — that is a Distortion, and there is
  // one of those in the catalogue already.
  tune: { min: 700, max: 10000, step: 50, unit: 'Hz', log: true },
  drive: { min: 0, max: 1, step: 0.01 },
  timbre: { min: 0, max: 1, step: 0.01 },
  width: { min: 0, max: 1, step: 0.01 },
  pitch: { min: -24, max: 24, step: 1, unit: 'st' },
  // The Doubler's detune. Cents rather than semitones because the whole effect lives
  // in the first one: 50 cents is a quarter tone and already a harmony part, and
  // everything that sounds like a second take is under 20.
  detune: { min: 0, max: 50, step: 1, unit: 'ct' },
  // Its two balances (DRY BALANCE / WET BALANCE on the card). Separate names rather
  // than one, because the two halves of a doubler are placed independently — dry hard
  // left against wet hard right is the whole point of the effect for some parts — and
  // because they are not even the same law: one is a balance, one is an equal-power
  // pan. See makeDoubler.
  dryPan: { min: -1, max: 1, step: 0.02 },
  wetPan: { min: -1, max: 1, step: 0.02 },
  windowSize: { min: 0.01, max: 0.2, step: 0.005, unit: 's' },
  decay: { min: 0.1, max: 10, step: 0.1, unit: 's' },
  preDelay: { min: 0.001, max: 0.2, step: 0.002, unit: 's', log: true },
  Q: { min: 0.1, max: 20, step: 0.1 },
  // A list, not a range: the desk draws a dropdown for anything with options.
  type: { options: ['lowpass', 'highpass', 'bandpass', 'notch'] },
  threshold: { min: -60, max: 0, step: 0.5, unit: 'dB' },
  ratio: { min: 1, max: 20, step: 0.5 },
  attack: { min: 0.001, max: 1, step: 0.001, unit: 's', log: true },
  // A millisecond floor and a millisecond step, to match ATTACK and every envelope pot
  // on the preset editor. A compressor's release is an envelope time like any other and
  // the interesting half of it is under a tenth of a second — ten milliseconds was a
  // floor with real settings underneath it, and a ten-millisecond step could not tell
  // 20 from 25. The one effect that cannot honour a 1ms release is L7, whose own
  // envelope clamps at ten, so it overrides this floor rather than promising travel
  // that stops at the same place wherever the pot is.
  release: { min: 0.001, max: 2, step: 0.001, unit: 's', log: true },
  knee: { min: 0, max: 40, step: 1, unit: 'dB' },
  // L7's own three. `ceiling` is where the output stops, which is not `threshold` —
  // on a limiter of this shape the two are independent and the gap between them IS
  // the make-up gain. `lookahead` is in milliseconds because that is the scale it
  // works at and a slider reading "0.00 s" would be useless.
  ceiling: { min: -12, max: 0, step: 0.1, unit: 'dB' },
  lookahead: { min: 0.2, max: 10, step: 0.1, unit: 'ms' },
  arc: { min: 0, max: 1, step: 1, toggle: true },
  // Extra full-band ducking after the M/S stage. Zero keeps legacy M/S compressor
  // settings unchanged; higher values increase the
  // short-release compressor's ratio and bring its threshold up into the signal.
  pump: { min: 0, max: 1, step: 0.01 },
  // The multiband's crossovers. Named in full because they are the effect's own
  // properties, unlike its bands, which are reached as `low.threshold` and friends.
  lowFrequency: { min: 40, max: 1000, step: 10, unit: 'Hz', log: true },
  highFrequency: { min: 500, max: 8000, step: 50, unit: 'Hz', log: true },
  spread: { min: 0, max: 360, step: 5 },
  sensitivity: { min: -40, max: 0, step: 1, unit: 'dB' },
  gain: { min: -24, max: 24, step: 0.5, unit: 'dB' },
  inputGain: { min: -24, max: 24, step: 0.1, unit: 'dB' },
  outputGain: { min: -24, max: 24, step: 0.1, unit: 'dB' },
  bits: { min: 1, max: 24, step: 1 },
  downsample: { min: 1, max: 40, step: 1 },
  bias: { min: -1, max: 1, step: 0.01 },
  gateLength: { min: 0.05, max: 0.95, step: 0.01 },
  wow: { min: 0, max: 1, step: 0.01 },
  flutter: { min: 0, max: 1, step: 0.01 },
  waveform: { options: ['sine', 'triangle', 'square'] },
  f1: { min: 20, max: 500, step: 5, unit: 'Hz', log: true },
  f2: { min: 80, max: 2000, step: 10, unit: 'Hz', log: true },
  f3: { min: 400, max: 8000, step: 20, unit: 'Hz', log: true },
  // The middle band. 250..4000 is geometrically centred on its own 1kHz default, and it
  // overlaps both neighbours by design — the point of a parametric mid is that it can be
  // taken to where the problem is rather than to the edge of its allowance.
  f5: { min: 250, max: 4000, step: 10, unit: 'Hz', log: true },
  f4: { min: 2000, max: 16000, step: 100, unit: 'Hz', log: true },
  g1: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g2: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g3: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g4: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g5: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  q2: { min: 0.2, max: 10, step: 0.1 },
  // The Bell EQ's single band reads the same Q range its peaking siblings do.
  q: { min: 0.2, max: 10, step: 0.1 },
  q3: { min: 0.2, max: 10, step: 0.1 },
  q5: { min: 0.2, max: 10, step: 0.1 },
  // The channel strip's three EQ gains — NOT the like-named bands of the multiband
  // compressor, which are whole compressors addressed as `low.threshold`.
  low: { min: -24, max: 24, step: 0.5, unit: 'dB' },
  mid: { min: -24, max: 24, step: 0.5, unit: 'dB' },
  high: { min: -24, max: 24, step: 0.5, unit: 'dB' },
};

/**
 * `params` lists which of an effect's settings the desk exposes, in the order they
 * should appear. Tone effects carry a lot of internal options; showing all of them
 * would bury the two or three that matter.
 */
/**
 * The tempo-synced channel delay, built from native nodes rather than Tone.
 *
 * It was a fixed section on every channel strip before the effect rack existed.
 * Two mechanisms for one job is one too many, so it moved in here — but it kept
 * two things Tone's delays do not give us: a note-division time that follows the
 * song's bpm, and a BALANCE on the WET leg alone (`pan` in the params, from before the
 * catalogue settled on one word for a left/right control), so the source can sit left
 * and its repeats right. A Tone delay mixes wet and dry internally, which makes that
 * impossible.
 */
function makeChannelDelay(ctx, params) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
  const line = ctx.createDelay(MAX_DELAY_SECONDS);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000; lp.Q.value = 0.7071;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const wet = ctx.createGain(); wet.gain.value = 0;
  const pan = ctx.createStereoPanner(); pan.pan.value = 0;
  wet.channelCount = 2; wet.channelCountMode = 'explicit'; wet.channelInterpretation = 'speakers';

  input.connect(output);                       // dry, always through
  input.connect(hp); hp.connect(line);
  line.connect(lp); lp.connect(fb); fb.connect(line);
  lp.connect(wet); wet.connect(pan); pan.connect(output);

  const state = { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, tone: 4000, mix: 0.35, pan: 0, ...params };
  const node = { input, output, _custom: true };
  node.applyState = (bpm) => {
    const t = ctx.currentTime;
    line.delayTime.setTargetAtTime(delaySeconds(state, bpm), t, 0.05);
    fb.gain.setTargetAtTime(Math.max(0, Math.min(0.95, state.feedback)), t, 0.05);
    lp.frequency.setTargetAtTime(Math.max(200, Math.min(16000, state.tone)), t, 0.05);
    wet.gain.setTargetAtTime(Math.max(0, state.mix), t, 0.03);
    pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, state.pan)), t, 0.03);
  };
  node.setState = (patch, bpm) => { Object.assign(state, patch); node.applyState(bpm); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => node.disconnect();
  return node;
}

// mulberry32 — the same generator `AudioSys._noiseRandom` seeds its noise floor
// with, kept here rather than imported so this file stays free of the engine.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The impulse response's noise is seeded from this, always — live as well as
// offline. The noise FLOOR is deliberately random per session (a fresh hiss every
// time you play is free variety), but a reverb is part of the song: two renders of a
// track have to be the same file, and a stem has to sum back into the mix it came
// from. A different seed is a different room, so this number is the room.
const REVERB_SEED = 0x5eed2;

/**
 * The impulse response: decorrelated noise under an exponential decay.
 *
 * Which is what Tone.Reverb generates too — and generates by rendering `Tone.Noise`,
 * whose buffer is filled from `Math.random` at construction. That made every render
 * of every song carrying reverb a different file: measured at 1.2e-1 between two
 * renders of the same track, where the null test's tolerance is 5e-6. Stems stopped
 * summing to their mix, and no baseline could ever match. Same algorithm, seeded.
 *
 * Left and right get their own sequence, which is the whole of the stereo image: one
 * shared sequence is a mono room. `preDelay` is silence at the head rather than a
 * delay node in front, so the whole gap-then-tail shape is one buffer.
 */
function reverbImpulse(ctx, decay, preDelay) {
  const sr = ctx.sampleRate;
  const pre = Math.max(0, Math.round(Math.max(0, preDelay) * sr));
  const tail = Math.max(1, Math.round(Math.max(0.05, decay) * sr));
  const buf = ctx.createBuffer(2, pre + tail, sr);
  // Down to -80dB at `decay` — the ramp Tone applies to its noise, and the point at
  // which a tail has stopped being audible under anything else in a mix.
  const k = Math.log(1e-4) / Math.max(0.05, decay);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    // Seeded per channel, so the two sides are decorrelated but both reproducible.
    const rand = seededRandom(REVERB_SEED + c * 0x9e37);
    for (let i = 0; i < tail; i++) data[pre + i] = (rand() * 2 - 1) * Math.exp(k * (i / sr));
  }
  return buf;
}

/**
 * Convolution reverb, ours rather than Tone's — see reverbImpulse for why.
 *
 * A hand-built Schroeder network (comb + allpass, the Freeverb topology) was tried
 * instead and lost on both cost and stability; see the note above the aux rack in
 * mixer.js. This is the same convolution Tone does, with the impulse response under
 * our control: no `Math.random`, and no asynchronous rebuild — the buffer is
 * generated here, in a loop, so a decay change is immediate rather than a promise the
 * desk has to await mid-note. `ready` is kept, resolved, for the callers that do.
 */
export function makeReverb(ctx, params) {
  const state = { decay: 2, preDelay: 0.01, low: 0, mid: 0, high: 0, width: 1, wet: 0.4, ...params };
  const input = ctx.createGain();
  const output = ctx.createGain();
  const conv = ctx.createConvolver();
  // Left on, as Tone leaves it: the tail then holds its level as the decay changes,
  // instead of a longer room being a louder one.
  conv.normalize = true;
  const wetGain = ctx.createGain();
  const dryGain = ctx.createGain();
  // EQ the tail, not the dry input. This is deliberately the same broad three-band
  // shape as the channel/return EQ: useful room tone controls without another effect
  // card or a second convolution. At 0dB these filters are exactly transparent.
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf'; low.frequency.value = 250; low.gain.value = 0;
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking'; mid.frequency.value = 1200; mid.Q.value = 0.9; mid.gain.value = 0;
  const high = ctx.createBiquadFilter();
  high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = 0;
  low.connect(mid); mid.connect(high);

  // Mid/side width on the wet tail only. Width 1 is transparent, 0 collapses the room
  // to mono, and 2 pushes the sides out. Native gains keep the graph deterministic and
  // avoid adding a Tone stereo processor to every inline reverb.
  const widthInput = ctx.createGain();
  widthInput.channelCount = 2;
  widthInput.channelCountMode = 'explicit';
  widthInput.channelInterpretation = 'speakers';
  const widthSplit = ctx.createChannelSplitter(2);
  const widthMerge = ctx.createChannelMerger(2);
  const widthMid = ctx.createGain();
  const widthSide = ctx.createGain();
  const leftToMid = ctx.createGain(); leftToMid.gain.value = 0.5;
  const rightToMid = ctx.createGain(); rightToMid.gain.value = 0.5;
  const leftToSide = ctx.createGain(); leftToSide.gain.value = 0.5;
  const rightToSide = ctx.createGain(); rightToSide.gain.value = -0.5;
  const sideLeft = ctx.createGain();
  const sideRight = ctx.createGain();
  widthInput.connect(widthSplit);
  widthSplit.connect(leftToMid, 0); widthSplit.connect(rightToMid, 1);
  widthSplit.connect(leftToSide, 0); widthSplit.connect(rightToSide, 1);
  leftToMid.connect(widthMid); rightToMid.connect(widthMid);
  leftToSide.connect(widthSide); rightToSide.connect(widthSide);
  widthMid.connect(widthMerge, 0, 0); widthSide.connect(sideLeft); sideLeft.connect(widthMerge, 0, 0);
  widthMid.connect(widthMerge, 0, 1); widthSide.connect(sideRight); sideRight.connect(widthMerge, 0, 1);
  high.connect(widthInput); widthMerge.connect(wetGain);

  input.connect(dryGain); dryGain.connect(output); wetGain.connect(output);
  input.connect(conv); conv.connect(low);

  let built = null;                       // what the current buffer was built for
  const rebuild = () => {
    const sig = `${state.decay}|${state.preDelay}`;
    if (sig === built) return;
    built = sig;
    conv.buffer = reverbImpulse(ctx, state.decay, state.preDelay);
  };
  const mix = () => {
    // Equal power, which is what Tone crossfades a wet/dry with: a send sitting at
    // wet 1 is then fully wet, and a 50% insert does not dip in the middle.
    const w = Math.max(0, Math.min(1, state.wet));
    wetGain.gain.value = Math.sin((w * Math.PI) / 2);
    dryGain.gain.value = Math.cos((w * Math.PI) / 2);
  };
  const setEq = () => {
    const db = (value) => Number.isFinite(Number(value))
      ? Math.max(-18, Math.min(18, Number(value))) : 0;
    low.gain.value = db(state.low);
    mid.gain.value = db(state.mid);
    high.gain.value = db(state.high);
  };
  const setWidth = () => {
    const width = Number.isFinite(Number(state.width))
      ? Math.max(0, Math.min(2, Number(state.width))) : 1;
    widthSide.gain.value = width;
    sideLeft.gain.value = 1;
    sideRight.gain.value = -1;
  };
  rebuild(); mix(); setEq(); setWidth();

  const node = { input, output, _custom: true, ready: Promise.resolve() };
  node.applyState = () => { rebuild(); mix(); setEq(); setWidth(); };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  // Tone.Reverb takes decay and preDelay as properties, and the aux rack sets them
  // that way. Kept, so this drops in where that stood.
  Object.defineProperty(node, 'decay', {
    get: () => state.decay,
    set: (v) => { state.decay = Math.max(0.05, v); rebuild(); },
  });
  Object.defineProperty(node, 'preDelay', {
    get: () => state.preDelay,
    set: (v) => { state.preDelay = Math.max(0, v); rebuild(); },
  });
  Object.defineProperty(node, 'wet', { get: () => state.wet, set: (v) => { state.wet = v; mix(); } });
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    try { conv.disconnect(); } catch { /* fine */ }
    try {
      low.disconnect(); mid.disconnect(); high.disconnect(); widthInput.disconnect();
      widthSplit.disconnect(); widthMerge.disconnect(); widthMid.disconnect(); widthSide.disconnect();
      leftToMid.disconnect(); rightToMid.disconnect(); leftToSide.disconnect(); rightToSide.disconnect();
      sideLeft.disconnect(); sideRight.disconnect();
    } catch { /* fine */ }
  };
  return node;
}

/**
 * A compact native spring/ambience approximation.
 *
 * This is deliberately an insert rather than a second shared return. Two short,
 * slightly different stereo delay lines recirculate through a pair of all-pass
 * sections and a damping filter. The unequal lines keep a mono source from remaining
 * perfectly correlated, while the all-pass sections spread the repeats into a tail
 * instead of a row of audible echoes. No oscillator, worklet, or generated source is
 * involved, so an unused or bypassed instance can be short-circuited by makeChainSlot
 * and an OfflineAudioContext renders the same samples every time.
 *
 * `space` controls line length and feedback, `damping` controls the low-pass corner,
 * and `wet` is an equal-power dry/wet mix. The graph is fixed after construction;
 * later edits move AudioParams with the same smoothing helper used by the other native
 * effects. Feedback is bounded below 0.8, leaving a stable margin at every setting.
 */
function makeAmbience(ctx, params = {}) {
  const state = { space: 0.5, damping: 0.55, wet: 0.38, ...params };
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  input.channelCount = 2;
  input.channelCountMode = 'explicit';
  input.channelInterpretation = 'speakers';
  output.channelCount = 2;
  output.channelCountMode = 'explicit';
  output.channelInterpretation = 'speakers';

  input.connect(dry); dry.connect(output);
  input.connect(split);

  const lines = [];
  for (let channel = 0; channel < 2; channel++) {
    const delay = ctx.createDelay(0.3);
    const allpassA = ctx.createBiquadFilter();
    const allpassB = ctx.createBiquadFilter();
    const damping = ctx.createBiquadFilter();
    const feedback = ctx.createGain();
    allpassA.type = 'allpass';
    allpassB.type = 'allpass';
    damping.type = 'lowpass';
    allpassA.Q.value = 0.7071;
    allpassB.Q.value = 0.7071;
    split.connect(delay, channel);
    delay.connect(allpassA);
    allpassA.connect(allpassB);
    allpassB.connect(damping);
    damping.connect(feedback);
    feedback.connect(delay);
    damping.connect(merge, 0, channel);
    lines.push({ delay, allpassA, allpassB, damping, feedback });
  }
  merge.connect(wet);
  wet.connect(output);

  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  let running = false;
  const set = (param, value, seconds = 0.03) => setAudioParam(ctx, param, value, running, seconds);
  const apply = () => {
    const space = Math.max(0, Math.min(1, number(state.space, 0.5)));
    const damping = Math.max(0, Math.min(2, number(state.damping, 0.55)));
    const mix = Math.max(0, Math.min(1, number(state.wet, 0.38)));
    const baseDelay = 0.028 + space * 0.14;
    const feedback = 0.26 + space * 0.53;
    // Keep the original 0..1 response intact. The extra 1..2 half continues below
    // 2.2kHz on an exponential curve, reaching a dark-but-useful 260Hz floor instead
    // of flattening at the old maximum damping setting.
    const cutoff = damping <= 1
      ? 2200 + (1 - damping) * 14800
      : 2200 * Math.pow(260 / 2200, damping - 1);
    const allpassA = 520 + space * 1100;
    const allpassB = 1100 + space * 2300;
    lines.forEach((line, channel) => {
      set(line.delay.delayTime, baseDelay * (channel ? 1.037 : 0.963));
      set(line.allpassA.frequency, allpassA * (channel ? 1.09 : 0.93));
      set(line.allpassB.frequency, allpassB * (channel ? 0.91 : 1.07));
      set(line.damping.frequency, cutoff);
      set(line.feedback.gain, feedback);
    });
    set(wet.gain, Math.sin((mix * Math.PI) / 2));
    set(dry.gain, Math.cos((mix * Math.PI) / 2));
    running = true;
  };
  const node = { input, output, _custom: true };
  node.applyState = apply;
  node.setState = (patch) => { Object.assign(state, patch); apply(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    for (const line of lines) {
      for (const n of Object.values(line)) { try { n.disconnect(); } catch { /* fine */ } }
    }
    for (const n of [input, output, dry, wet, split, merge]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}

/**
 * A CPU-conscious spring reverb.
 *
 * This is a spring tank rather than a room reverb: a mono excitation is sent through
 * two short, unequal recirculating modes, each with a dispersive all-pass stage and
 * a damping filter. The modes' slightly inharmonic delays make the characteristic
 * metallic bounce; the post-tank resonator is the adjustable drip. A pair of tiny output
 * offsets restores a stereo image without duplicating the whole tank for left and right.
 *
 * It deliberately has no oscillator, worklet, convolution buffer, or per-sample JS. The
 * graph is six filters, two short tank delay lines, and one output delay, all of
 * which are native Web Audio primitives. Feedback is capped at 0.77, so even the longest
 * tension setting remains bounded and can be put to sleep by makeChainSlot when silent.
 */
function makeSpringReverb(ctx, params = {}) {
  const state = { tension: 0.5, damping: 0.35, drip: 0.42, wet: 0.34, ...params };
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const split = ctx.createChannelSplitter(2);
  const mono = ctx.createGain();
  const leftMono = ctx.createGain();
  const rightMono = ctx.createGain();
  const pre = ctx.createBiquadFilter();
  pre.type = 'highpass'; pre.frequency.value = 110; pre.Q.value = 0.7071;
  const tank = ctx.createGain();
  const post = ctx.createGain();
  const dripFilter = ctx.createBiquadFilter();
  dripFilter.type = 'bandpass';
  const dripGain = ctx.createGain();
  const rightDelay = ctx.createDelay(0.02);
  const leftLevel = ctx.createGain();
  const rightLevel = ctx.createGain();
  const merge = ctx.createChannelMerger(2);

  input.channelCount = 2;
  input.channelCountMode = 'explicit';
  input.channelInterpretation = 'speakers';
  output.channelCount = 2;
  output.channelCountMode = 'explicit';
  output.channelInterpretation = 'speakers';

  input.connect(dry); dry.connect(output);
  input.connect(split);
  split.connect(leftMono, 0); split.connect(rightMono, 1);
  leftMono.gain.value = 0.5; rightMono.gain.value = 0.5;
  leftMono.connect(mono); rightMono.connect(mono);
  mono.connect(pre);

  const modes = [0.83, 1.21].map((ratio, index) => {
    const delay = ctx.createDelay(0.15);
    const allpass = ctx.createBiquadFilter(); allpass.type = 'allpass'; allpass.Q.value = 0.7071;
    const damping = ctx.createBiquadFilter(); damping.type = 'lowpass'; damping.Q.value = 0.55;
    const feedback = ctx.createGain();
    pre.connect(delay);
    delay.connect(allpass); allpass.connect(damping);
    damping.connect(feedback); feedback.connect(delay);
    damping.connect(tank);
    return { ratio, index, delay, allpass, damping, feedback };
  });

  // The drip follows the tank, so it rings with the spring instead of becoming a dry
  // resonant EQ. Its gain is zero at the knob's minimum: the default is not forced bright.
  tank.connect(post);
  tank.connect(dripFilter); dripFilter.connect(dripGain); dripGain.connect(post);
  post.connect(leftLevel); leftLevel.connect(merge, 0, 0);
  rightDelay.connect(rightLevel); rightLevel.connect(merge, 0, 1);
  post.connect(rightDelay);
  merge.connect(wet); wet.connect(output);

  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  let running = false;
  const set = (param, value, seconds = 0.03) => setAudioParam(ctx, param, value, running, seconds);
  const apply = () => {
    const tension = Math.max(0, Math.min(1, number(state.tension, 0.5)));
    const damping = Math.max(0, Math.min(1, number(state.damping, 0.35)));
    const drip = Math.max(0, Math.min(1, number(state.drip, 0.42)));
    const mix = Math.max(0, Math.min(1, number(state.wet, 0.34)));
    const baseDelay = 0.021 + tension * 0.057;
    const feedback = 0.43 + tension * 0.34;
    const cutoff = 16000 * Math.pow(0.1, damping);
    const modeBase = [760, 1420];
    const modeSpread = [1.08, 0.94];
    modes.forEach((mode) => {
      set(mode.delay.delayTime, Math.min(0.14, baseDelay * mode.ratio));
      set(mode.allpass.frequency, modeBase[mode.index] * modeSpread[mode.index] * (0.9 + tension * 0.35));
      set(mode.damping.frequency, Math.max(700, cutoff));
      set(mode.feedback.gain, Math.min(0.77, feedback - mode.index * 0.035));
    });
    set(dripFilter.frequency, 1300 + tension * 2600);
    set(dripFilter.Q, 0.8 + drip * 7.2);
    set(dripGain.gain, drip * 0.42);
    set(post.gain, 1.15);
    set(rightDelay.delayTime, 0.0038 + tension * 0.0015);
    set(leftLevel.gain, 0.98);
    set(rightLevel.gain, 1.02);
    set(wet.gain, Math.sin((mix * Math.PI) / 2));
    set(dry.gain, Math.cos((mix * Math.PI) / 2));
    running = true;
  };

  const node = { input, output, _custom: true };
  node.applyState = apply;
  node.setState = (patch) => { Object.assign(state, patch); apply(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    for (const n of [input, output, dry, wet, split, mono, leftMono, rightMono, pre, tank,
      post, dripFilter, dripGain, rightDelay, leftLevel, rightLevel, merge]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
    for (const mode of modes) {
      for (const n of Object.values(mode)) {
        if (n && typeof n.disconnect === 'function') { try { n.disconnect(); } catch { /* fine */ } }
      }
    }
  };
  return node;
}

/**
 * The five bands of the Channel EQ, low to high. Exported because the desk draws them:
 * the response curve, the handle it drags and the readout under it all have to agree
 * with the nodes this builds, and three copies of "band 2 is a peak at 500" is three
 * places for them to stop agreeing.
 *
 * A shelf at each end and three peaks between them: the usual console layout, and the
 * one that covers the most ground with the fewest controls. The middle peak sits at
 * 1kHz, geometrically halfway between the two either side of it, and it is the band
 * every four-band EQ makes you borrow one of its neighbours for — presence, honk, the
 * body of a snare and the fundamental of most vocals all live within an octave of it.
 *
 * `n` IS AN IDENTITY, NOT A POSITION. The middle band is band FIVE, sitting third: its
 * parameters are `f5/g5/q5` because it was added to a card whose four bands were already
 * `f1..f4` in every saved mix on disk, and renumbering to put it third would have moved
 * three bands' settings on every song that carries a Channel EQ. So this array is in the
 * order the card READS in, and everything that touches a band's parameters keys off
 * `b.n`. Nothing may key off the array index — see makeParametricEq, which used to.
 */
export const PEQ_BANDS = [
  { n: 1, type: 'lowshelf', f: 120, label: 'LOW' },
  { n: 2, type: 'peaking', f: 500, label: 'LOW-MID' },
  { n: 5, type: 'peaking', f: 1000, label: 'MID' },
  { n: 3, type: 'peaking', f: 2000, label: 'HIGH-MID' },
  { n: 4, type: 'highshelf', f: 6000, label: 'HIGH' },
];

/**
 * A five-band parametric EQ — Channel EQ on the card.
 *
 * NATIVE BiquadFilterNodes, not Tone: Tone has no such component — Tone.Filter is one
 * band and Tone.EQ3 is a fixed three-way crossover — and every Tone.Filter would also
 * bring four ConstantSourceNodes with it to drive its parameters, which is twenty
 * permanently-running generators for five filters that need none. The channel strip's
 * own EQ is pinned at 250/1200/4000Hz, so this is the one to reach for when a specific
 * frequency is the problem. Exactly transparent with every band at 0dB.
 *
 * The bands run in series in the order PEQ_BANDS lists them, which is low to high. That
 * order is for reading, not for sound: biquads in series commute, so a cut at 300 before
 * a boost at 3k is the same signal as the other way round.
 */
function makeParametricEq(ctx, params) {
  const shape = PEQ_BANDS;
  const bands = shape.map((b) => {
    const n = ctx.createBiquadFilter();
    n.type = b.type; n.frequency.value = b.f; n.gain.value = 0; n.Q.value = 1;
    return n;
  });
  for (let i = 0; i < bands.length - 1; i++) bands[i].connect(bands[i + 1]);

  // Keyed by `b.n` and never by the array index. Those were the same four numbers while
  // the card had four bands in ascending order, and the day a band was inserted in the
  // middle they stopped being: `peqResponse` and the desk's handles have always read
  // `f${b.n}`, so an index here would have drawn one curve and rendered another.
  const state = {};
  for (const b of shape) {
    state[`f${b.n}`] = b.f; state[`g${b.n}`] = 0; state[`q${b.n}`] = 1;
  }
  Object.assign(state, params);

  const node = { input: bands[0], output: bands[bands.length - 1], _custom: true };
  node.applyState = () => {
    const t = ctx.currentTime;
    bands.forEach((n, i) => {
      const { n: id } = shape[i];
      n.frequency.setTargetAtTime(Math.max(20, Math.min(18000, state[`f${id}`])), t, 0.02);
      n.gain.setTargetAtTime(state[`g${id}`], t, 0.02);
      // Shelves ignore Q in the peaking sense; leave theirs alone.
      if (n.type === 'peaking') n.Q.setTargetAtTime(Math.max(0.1, state[`q${id}`]), t, 0.02);
    });
  };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  node.connect = (dest) => (dest && dest.input ? node.output.connect(dest.input) : node.output.connect(dest));
  node.disconnect = () => { try { node.output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => node.disconnect();
  node.applyState();
  return node;
}

/**
 * One parametric band — Bell EQ on the card. Frequency, gain, Q, and nothing else.
 *
 * The Channel EQ above is five bands and a graph, which is the right tool when the
 * question is "what shape does this channel want". It is the wrong tool when the
 * question is "there is a ring at 800Hz": you open a ten-parameter card, find the band
 * whose range covers 800, and leave three bands you did not touch sitting in the saved
 * mix. This is the surgical one — one bell, three numbers, and a slot in the chain of
 * its own, so two of them on a strip are two problems solved rather than one card's
 * bands fought over.
 *
 * A peaking filter, not a switchable shape. A bell at Q 0.4 is already a broad tilt and
 * a bell at Q 8 is already a notch, so the two ends of the Q pot cover what a shelf and
 * a cut would have added a dropdown for — and the whole point of this card is that
 * there is no dropdown to read. Transparent at 0dB, exactly: a peaking biquad at unity
 * gain has identical numerator and denominator, so an inserted-and-untouched Bell EQ
 * renders the samples it always did and the null test does not move.
 */
function makeBellEq(ctx, params) {
  const band = ctx.createBiquadFilter();
  band.type = 'peaking';
  band.frequency.value = 1000; band.gain.value = 0; band.Q.value = 1;
  const state = { frequency: 1000, gain: 0, q: 1, ...params };
  const node = { input: band, output: band, _custom: true };
  node.applyState = () => {
    const t = ctx.currentTime;
    band.frequency.setTargetAtTime(Math.max(20, Math.min(18000, state.frequency)), t, 0.02);
    band.gain.setTargetAtTime(state.gain, t, 0.02);
    band.Q.setTargetAtTime(Math.max(0.1, state.q), t, 0.02);
  };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  node.connect = (dest) => (dest && dest.input ? band.connect(dest.input) : band.connect(dest));
  node.disconnect = () => { try { band.disconnect(); } catch { /* fine */ } };
  node.dispose = () => node.disconnect();
  node.applyState();
  return node;
}

/**
 * One biquad's coefficients, by the same formulas the Web Audio spec gives for
 * BiquadFilterNode. The desk draws its curve from these rather than from
 * `getFrequencyResponse`, because the graph has to show a setting BEFORE it is
 * committed — the Bar Effects sheet edits a staged array with no live node behind it
 * at all — and because an offline node per repaint during a drag is a node per frame.
 *
 * Shelves take S = 1, which is what a BiquadFilterNode uses and why they ignore Q.
 */
function biquadCoefficients(type, freq, gainDb, q, sampleRate) {
  const w0 = 2 * Math.PI * Math.max(1, Math.min(freq, sampleRate / 2 - 1)) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  if (type === 'peaking') {
    const alpha = sin / (2 * Math.max(0.0001, q));
    return [1 + alpha * A, -2 * cos, 1 - alpha * A, 1 + alpha / A, -2 * cos, 1 - alpha / A];
  }
  const alpha = (sin / 2) * Math.SQRT2;
  const twoSqrtAlpha = 2 * Math.sqrt(A) * alpha;
  if (type === 'lowshelf') {
    return [
      A * ((A + 1) - (A - 1) * cos + twoSqrtAlpha),
      2 * A * ((A - 1) - (A + 1) * cos),
      A * ((A + 1) - (A - 1) * cos - twoSqrtAlpha),
      (A + 1) + (A - 1) * cos + twoSqrtAlpha,
      -2 * ((A - 1) + (A + 1) * cos),
      (A + 1) + (A - 1) * cos - twoSqrtAlpha,
    ];
  }
  return [
    A * ((A + 1) + (A - 1) * cos + twoSqrtAlpha),
    -2 * A * ((A - 1) + (A + 1) * cos),
    A * ((A + 1) + (A - 1) * cos - twoSqrtAlpha),
    (A + 1) - (A - 1) * cos + twoSqrtAlpha,
    2 * ((A - 1) - (A + 1) * cos),
    (A + 1) - (A - 1) * cos - twoSqrtAlpha,
  ];
}

/** One band's magnitude, in dB, at each of `freqs`. */
function bandResponseDb(type, freq, gainDb, q, freqs, sampleRate, out) {
  const [b0, b1, b2, a0, a1, a2] = biquadCoefficients(type, freq, gainDb, q, sampleRate);
  const n0 = b0 / a0, n1 = b1 / a0, n2 = b2 / a0, d1 = a1 / a0, d2 = a2 / a0;
  for (let i = 0; i < freqs.length; i++) {
    const w = 2 * Math.PI * freqs[i] / sampleRate;
    const c1 = Math.cos(w), s1 = Math.sin(w);
    const c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = n0 + n1 * c1 + n2 * c2, ni = -(n1 * s1 + n2 * s2);
    const dr = 1 + d1 * c1 + d2 * c2, di = -(d1 * s1 + d2 * s2);
    const mag = Math.sqrt((nr * nr + ni * ni) / Math.max(1e-20, dr * dr + di * di));
    out[i] += 20 * Math.log10(Math.max(1e-10, mag));
  }
  return out;
}

/**
 * The Channel EQ's response — the five bands summed, in dB, at each of `freqs`.
 *
 * `band` picks one band out of the five instead; the graph draws each band's own
 * curve faintly behind the total so a handle you are dragging can be told apart from
 * what the four you are not are doing.
 */
export function peqResponse(params = {}, freqs = [], sampleRate = 44100, band = null) {
  const p = { ...EFFECT_BY_ID.peq?.defaults, ...params };
  const out = new Float64Array(freqs.length);
  for (const b of PEQ_BANDS) {
    if (band != null && band !== b.n) continue;
    bandResponseDb(b.type, p[`f${b.n}`], p[`g${b.n}`] || 0, p[`q${b.n}`] ?? 1,
      freqs, sampleRate, out);
  }
  return out;
}

/**
 * The Bell EQ's response, in dB at each of `freqs` — the same reading `peqResponse`
 * gives the five-band card, so anything that wants to draw or check this one band is
 * reading the same maths the node runs.
 */
export function bellResponse(params = {}, freqs = [], sampleRate = 44100) {
  const p = { ...EFFECT_BY_ID.bell?.defaults, ...params };
  return bandResponseDb('peaking', p.frequency, p.gain || 0, p.q ?? 1,
    freqs, sampleRate, new Float64Array(freqs.length));
}

/**
 * Level and placement. Some lanes are authored very quiet — organ sits at 0.009 against
 * the bass at 0.1 — and the channel fader tops out at +6dB, which is not always enough
 * to bring one up to where it can be balanced at all. GAIN has ±24dB of range and can
 * sit anywhere in the chain, so it doubles as a trim before a distortion or a make-up
 * gain after a compressor.
 *
 * BALANCE is after it, in that order because it is the order of the two questions: how
 * loud, then where. It is the utility every desk has and this one only had on the strip
 * — so a lane that needs its repeats placed, or a second pass at the image after an
 * effect has moved it, no longer has to spend the strip's own pot to get it.
 *
 * A BALANCE, not a pan, and the whole catalogue says balance for the same reason (the
 * Doubler's dry leg got here first — see makeDoubler). A StereoPannerNode would have
 * been one node instead of four, but its law is equal-power, and equal-power at centre
 * is 0.707 a side: a mono lane would lose 3dB off its mono sum the moment a Gain was
 * inserted, whether or not anything had been moved. This rides ONE side down from
 * unity, so centred it is bit-for-bit the input — which is what an insert you reach for
 * to fix a level has to be.
 */
function makeGain(ctx, params) {
  const level = ctx.createGain();
  const output = ctx.createGain();
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const left = ctx.createGain();
  const right = ctx.createGain();
  // The two crossed paths MONO needs: half of each channel into the other one. Always
  // wired, and at zero while the switch is off — a gain of exactly 0 contributes
  // exactly 0.0 to the merge, so an untouched Gain renders the samples it always did
  // and the null test does not move.
  const lToR = ctx.createGain();
  const rToL = ctx.createGain();
  lToR.gain.value = 0;
  rToL.gain.value = 0;
  // Two channels whatever arrives, or BALANCE has nothing to move on a mono lane: the
  // up-mix duplicates, so it costs the signal nothing to make the pair.
  for (const n of [level, output]) {
    n.channelCount = 2; n.channelCountMode = 'explicit'; n.channelInterpretation = 'speakers';
  }
  level.connect(split);
  split.connect(left, 0); left.connect(merge, 0, 0);
  split.connect(right, 1); right.connect(merge, 0, 1);
  split.connect(lToR, 0); lToR.connect(merge, 0, 1);
  split.connect(rToL, 1); rToL.connect(merge, 0, 0);
  merge.connect(output);
  const state = { gain: 0, balance: 0, mono: 0, ...params };
  const apply = () => {
    const t = ctx.currentTime;
    level.gain.setTargetAtTime(10 ** (state.gain / 20), t, 0.02);
    const b = Math.max(-1, Math.min(1, state.balance ?? 0));
    const bl = b <= 0 ? 1 : 1 - b;
    const br = b >= 0 ? 1 : 1 + b;
    // MONO is a mid/side collapse, not a sum: at 1 both outputs are (L+R)/2, so a
    // centred mix comes back at the level it went in and only the SIDES disappear.
    // Summing straight to L+R is the other version of this, and it arrives 6dB hot —
    // which is exactly what the Stereo Widener at width 0 does, measured. A switch
    // that changes the loudness of the mix is not a width control.
    //
    // Held as a number rather than a flag because that is what the graph wants, and
    // the desk writes it as 0 or 1: the halfway states are reachable by the same
    // arithmetic, and nothing has to special-case the ends.
    const m = Math.max(0, Math.min(1, state.mono ?? 0)) / 2;
    left.gain.setTargetAtTime(bl * (1 - m), t, 0.02);
    right.gain.setTargetAtTime(br * (1 - m), t, 0.02);
    rToL.gain.setTargetAtTime(bl * m, t, 0.02);
    lToR.gain.setTargetAtTime(br * m, t, 0.02);
  };
  apply();
  return {
    input: level, output, _custom: true,
    applyState: apply,
    setState: (patch) => { Object.assign(state, patch); apply(); },
    connect: (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest)),
    disconnect: () => { try { output.disconnect(); } catch { /* fine */ } },
    dispose: () => {
      for (const n of [level, split, left, right, lToR, rToL, merge, output]) {
        try { n.disconnect(); } catch { /* fine */ }
      }
    },
  };
}

// 8193 points, odd so that x = 0 lands on a sample. Wide as the domain below is, that
// is still 256 points across the knee, and the corner of the rectified half is exact.
const EXCITER_CURVE = 8193;

// The signal level the curve's [-1,1] domain is stretched over — the same idea as
// L7_HEADROOM, and there for a related reason. A WaveShaper CLAMPS anything past its
// domain, and a clamp is a hard clip: past that point the shaper stops being the tanh it
// was given and is a squarer instead, with nothing about the knobs to say why. The curve
// should be what saturates, not the edge of the table it is stored in.
//
// 32 is set by the loudest band the effect will meet at the loudest drive. Above 3kHz
// the game's tracks peak at 0.559 (plumber), and full DRIVE is 36dB, so the clamp has to
// sit past 0.559 x 63 = 35 — near enough, and a real peak that high lasts a sample or
// two. At 8 the clamp came in at a band of 0.127, which plumber's hats cross constantly.
const EXCITER_HEADROOM = 32;

// Where tanh bends, in signal units — so the knee sits just under full scale and DRIVE
// is what carries the band up to it. Fixed, because a knob that moved the signal AND
// the knee is a knob where two thirds of the travel sound the same.
const EXCITER_KNEE = 1;

/**
 * The exciter's transfer curve. TIMBRE crossfades between two nonlinearities that sound
 * nothing alike, and the crossfade is the knob.
 *
 * At 0 it is a plain tanh. A symmetric curve can only make ODD harmonics, so a 4kHz
 * tone comes back with 12k and 20k on it: the hard, edgy end, and the same family of
 * harmonics the Distortion next to it in the catalogue makes.
 *
 * At 1 it is that tanh rectified. Folding the negative half up is the standard way to
 * make EVEN harmonics and it makes ONLY even ones — 8k, 16k, an octave and two octaves
 * up, none of the fifths that make the odd end sound hard. There is no fundamental left
 * in the wet leg at all at that setting, which is why it reads as shimmer over the dry
 * signal rather than as distortion of it.
 *
 * Two shapes crossfaded rather than one shape bent, because the two things a knob like
 * this is asked for are not points on a continuum of the same curve. A first attempt slid
 * a tanh sideways instead — smoother, and the textbook way to get asymmetry — but the
 * even harmonics an offset makes go as the offset over the amplitude while the odd ones
 * go as the amplitude, so its even end quietly lost to its own odd content at exactly
 * the drive settings you would turn it up for. Measured at 1.4dB apart; see
 * tools/measure-exciter.js, which is what caught it.
 *
 * `Math.abs` has a corner at zero, and the odd length is what reproduces it: it puts
 * x = 0 ON a sample, so interpolating between points follows the curve instead of
 * rounding the corner off. Same reason as L7_RECTIFY, which is the same function.
 */
function exciterCurve(timbre) {
  const t = Math.max(0, Math.min(1, timbre));
  const norm = Math.tanh(EXCITER_KNEE * EXCITER_HEADROOM);
  const c = new Float32Array(EXCITER_CURVE);
  for (let i = 0; i < c.length; i++) {
    const v = ((i / (c.length - 1)) * 2 - 1) * EXCITER_HEADROOM;
    const s = Math.tanh(EXCITER_KNEE * v) / norm;
    // The rectified half carries a large DC with it, which the highpass after the
    // shaper takes off — and which the make-up below discounts, so TIMBRE does not
    // double as a volume knob.
    c[i] = (1 - t) * s + t * Math.abs(s);
  }
  return c;
}

/**
 * What the curve does to the LEVEL of a sine of amplitude `amp`: the rms of one cycle
 * through it, with the mean taken out first because the highpass downstream will take
 * it out of the signal too.
 *
 * Measured round a cycle rather than read off the curve at a peak, because a rectified
 * curve answers the same at both peaks and a lopsided one answers differently at each —
 * either way a single lookup is not a level. Sixty-four points is far more than a
 * smooth curve needs, and it only runs when a knob moves.
 */
function curveLevel(c, amp) {
  const n = 64;
  const y = new Float64Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    y[i] = curveAt(c, amp * Math.sin((2 * Math.PI * i) / n));
    mean += y[i];
  }
  mean /= n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (y[i] - mean) ** 2;
  return Math.sqrt(sum / n);
}

// The most gain DRIVE can put in front of the shaper, and the band level the make-up
// after it is calibrated at. Both come off the same measurement, which was worth making
// rather than guessing: rendered through a 3kHz highpass, the tracks in this game leave
//
//   plumber  peak 0.559  rms 0.0073        title    peak 0.015  rms 0.0015
//   shop     peak 0.313  rms 0.0044        megamix  peak 0.108  rms 0.0054
//
// — a band whose rms is two orders of magnitude under its peaks, because music above
// 3kHz is nearly all transient. The first guess at NOMINAL was 0.1, which is not a
// working level at all: it is near the loudest peak of the loudest track, so the curve
// sat unbent through everything except a cymbal and DRIVE spent its bottom half doing
// nothing. 0.05 is up where the effect is actually working — the loud moments, which is
// where air comes from — and well over the body it will pass through untouched.
//
// NOMINAL is a reference, not a threshold. The make-up is set so a band THIS big comes
// back out at its own level whatever DRIVE is doing, which is what stops DRIVE being a
// second volume knob; louder bands are compressed by the curve, because it is a
// saturator and that is the job, and quieter ones come back a little lifted.
//
// 36dB then spans the gap from that reference to the knee and some way past it: gentle
// at a third of the travel, squared at the top.
const EXCITER_DRIVE_DB = 36;
const EXCITER_NOMINAL = 0.05;

/**
 * A WaveShaper's own lookup: clamp to [-1,1], then interpolate between the two nearest
 * points. Used to ask the curve what it will do to a given level, so the make-up gain
 * stays correct whatever shape the curve has been given.
 */
function curveAt(c, x) {
  const p = ((Math.max(-1, Math.min(1, x)) + 1) / 2) * (c.length - 1);
  const i = Math.min(c.length - 2, Math.floor(p));
  return c[i] + (c[i + 1] - c[i]) * (p - i);
}

/**
 * An aural exciter: harmonics generated from the TOP of the signal only, added over an
 * untouched dry path.
 *
 * The catalogue's other two ways to add harmonics — Distortion and Chebyshev — shape
 * the WHOLE signal, so opening the top with either costs you the body. This never
 * touches the body: everything below TUNE is highpassed out of the sidechain before the
 * nonlinearity sees it, and the dry leg runs at unity from input to output. At `mix: 0`
 * it is therefore exactly transparent, sample for sample.
 *
 *   input ─────────────────────────────────────────────────► output   (dry, unity)
 *     └─► hp1 ─► hp2 ─► pre ─► shaper ─► post ─► hpOut ─► wet ─┘
 *
 * The second highpass on the way out is not a duplicate of the two on the way in. A
 * nonlinearity makes sum AND difference products, and the differences land BELOW the
 * band they came from — 3k and 4k in gives 1k back, i.e. exactly the mud the split was
 * there to avoid. It also carries off the DC the asymmetric curve produces.
 *
 * `oversample: '4x'` is doing real work and is not a default worth touching. The third
 * harmonic of an 8kHz component is 24kHz, which at 44.1k folds back to 20.1k as
 * aliasing — a metallic ring sitting exactly where the effect is supposed to sound like
 * air. It is also most of what this costs.
 */
function makeExciter(ctx, params) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  // 24dB/oct into the sidechain. One pole pair leaves so much of the octave below TUNE
  // in the band that the "untouched body" claim stops being true at any real drive.
  const hp1 = ctx.createBiquadFilter(); hp1.type = 'highpass';
  const hp2 = ctx.createBiquadFilter(); hp2.type = 'highpass';
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper(); shaper.oversample = '4x';
  const post = ctx.createGain();
  const hpOut = ctx.createBiquadFilter(); hpOut.type = 'highpass';
  const wet = ctx.createGain(); wet.gain.value = 0;

  input.connect(output);                                  // dry, always through, at unity
  input.connect(hp1); hp1.connect(hp2); hp2.connect(pre);
  pre.connect(shaper); shaper.connect(post); post.connect(hpOut);
  hpOut.connect(wet); wet.connect(output);

  const state = { tune: 3000, drive: 0.35, timbre: 0.5, mix: 0.3, ...params };

  // Rebuilt only when the shape actually changes — a curve is 8KB of Math.tanh and a
  // slider drag would otherwise build sixty a second. Quantised to the slider's own step
  // so a drag that lands back where it started is free. Same guard as L7's.
  let shaped = null;
  const reshape = () => {
    const key = Math.round(Math.max(0, Math.min(1, state.timbre)) * 100);
    if (key === shaped) return;
    shaped = key;
    shaper.curve = exciterCurve(key / 100);
  };

  // The first application lands directly; everything after it ramps. A biquad is born
  // at 350Hz, so ramping the corners up from construction would open the sidechain onto
  // the whole midrange for the first tenth of a second — and an offline render starts at
  // sample zero, which means that tenth of a second is the top of every WAV. Same guard,
  // and the same reason, as L7's.
  let running = false;
  const set = (param, v) => {
    if (running) param.setTargetAtTime(v, ctx.currentTime, 0.02);
    else param.value = v;
  };

  const node = { input, output, _custom: true };
  node.applyState = () => {
    const f = Math.max(200, Math.min(16000, state.tune));
    for (const n of [hp1, hp2, hpOut]) set(n.frequency, f);
    reshape();
    const gain = 10 ** ((Math.max(0, Math.min(1, state.drive)) * EXCITER_DRIVE_DB) / 20);
    // The headroom pad rides along with the drive rather than sitting in a node of its
    // own: one gain does both, and the curve is asked about the padded level below.
    set(pre.gain, gain / EXCITER_HEADROOM);
    // Make-up measured off the curve rather than derived from it, so it stays right if
    // the shape is ever changed: run the reference band through and ask what came out.
    // Without this DRIVE is a volume knob with a tone side-effect — the top of its
    // travel would be 30dB of extra wet — and TIMBRE is a second one, because a
    // rectified curve is 6dB down on the tanh it replaces before anything else happens.
    const level = curveLevel(shaper.curve, (EXCITER_NOMINAL * gain) / EXCITER_HEADROOM);
    set(post.gain, EXCITER_NOMINAL / Math.SQRT2 / Math.max(1e-6, level));
    set(wet.gain, Math.max(0, state.mix));
    running = true;
  };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    for (const n of [input, hp1, hp2, pre, shaper, post, hpOut, wet]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}

// How far above full scale L7's detector can still see. Everything in its sidechain
// is a WaveShaper, and a WaveShaper's domain is [-1,1], so the signal is scaled down
// into that range first — 8 buys 18dB of headroom over a peak of 1.0, which covers
// the loudest bank in the game (the shop theme, at 1.63) several times over.
const L7_HEADROOM = 8;

// Resolution of the two sidechain curves. Only the upper half is ever read (an
// envelope is never negative), so this is 16384 points across the detector's range,
// and the reciprocal above the threshold is smooth enough to interpolate long before
// that. 128KB each, built once per threshold/ceiling change rather than per drag.
const L7_CURVE = 32769;

// The output ceiling's curve is on the AUDIO path rather than the sidechain, so it is
// sized for transparency instead: below the knee it samples y = x exactly, and linear
// interpolation between two exact points on a straight line is still that line.
const L7_CLIP_CURVE = 8193;

/**
 * |x|, as a WaveShaper curve. Odd length on purpose: it puts the kink at zero ON a
 * sample, so interpolating between points reproduces the function rather than
 * rounding its corner off.
 */
const L7_RECTIFY = (() => {
  const c = new Float32Array(4097);
  for (let i = 0; i < c.length; i++) c[i] = Math.abs((2 * i) / (c.length - 1) - 1);
  return c;
})();

/**
 * max(a, b), out of native nodes: (a + b + |a - b|) / 2.
 *
 * Comparing two samples is the one thing a Web Audio graph cannot do, which is why
 * every peak follower written without an AudioWorklet ends up being a lowpass that
 * misses transients. Absolute value IS available — it is a WaveShaper — and that
 * identity turns it into the missing operator. Both inputs have to sit in [0,1] so
 * their difference stays inside the shaper's domain, which is true of everything
 * below: they are all rectified, scaled envelopes.
 */
function makeMax(ctx) {
  const a = ctx.createGain();
  const b = ctx.createGain();
  const sum = ctx.createGain();
  const neg = ctx.createGain(); neg.gain.value = -1;
  const diff = ctx.createGain();
  const mag = ctx.createWaveShaper(); mag.curve = L7_RECTIFY; mag.oversample = 'none';
  const out = ctx.createGain(); out.gain.value = 0.5;
  a.connect(sum); b.connect(sum);
  a.connect(diff); b.connect(neg); neg.connect(diff);
  diff.connect(mag);
  sum.connect(out); mag.connect(out);
  return {
    a, b, out,
    dispose() { for (const n of [a, b, sum, neg, diff, mag, out]) { try { n.disconnect(); } catch { /* fine */ } } },
  };
}

/**
 * L7 — a lookahead brickwall limiter, played the way a Waves L2 is played.
 *
 * The master's own limiter (mixer.js) is a DynamicsCompressorNode, which is a seatbelt
 * and not a mix tool: no controls, and 6ms of latency it cannot be talked out of. This
 * is the other thing — the one you push into to make a bus loud.
 *
 * What makes it an L2 rather than a compressor at 20:1 is that THRESHOLD AND CEILING
 * ARE COUPLED. Pulling the threshold down applies (ceiling - threshold) of make-up
 * automatically, so the knob that limits harder is also the knob that gets louder, and
 * the ceiling stays where you put it the whole time. One control, one direction.
 *
 * Built from native nodes for the same reason everything else in this file is: the
 * banks render offline, and AudioWorklet renders silent there (see the note at the top
 * of this file). That rules out per-sample DSP, so the sidechain is arithmetic —
 * rectify, link, follow, map to a gain — with `makeMax` standing in for the comparison
 * a graph cannot make.
 *
 *   in ──┬─ delay(lookahead) ── make-up ── VCA ── ceiling ── out
 *        │                                 ▲
 *        └─ /8 ─ |x| ─ L/R max ─ env ─ reduction curve ─ smooth
 *                                  ▲            │
 *                                  └─── decay ──┴─ ARC
 *
 * The delay is the whole trick: the detector sees a peak `lookahead` before the VCA
 * does, so the gain has finished moving by the time the peak arrives. What the ramp
 * still misses — a few tenths of a dB on the steepest transients — the ceiling curve
 * rounds off, which is why that is a soft knee in the top 0.2dB and not a hard clip.
 *
 * The make-up is a plain gain of its own rather than part of what the sidechain
 * computes, and that is not tidiness. A VCA driven entirely by the sidechain has to
 * START somewhere, and a smoothing filter starts cold at zero — so the gain would
 * climb up THROUGH the make-up on its way to the right answer, and the first
 * milliseconds of every render would be limited by the ceiling curve instead of by
 * the VCA. Split this way the sidechain only ever supplies reduction, so a cold start
 * is a few milliseconds of fade-in — over exactly the window where the lookahead
 * delay is still empty and there is nothing to hear anyway.
 *
 * Latency is the lookahead, 3ms at the default and always more than zero. That is
 * cheaper than the master limiter's fixed 6ms, but it is real: an insert on one lane
 * puts that lane late against the others. Bypassed it costs nothing at all, because
 * makeChainSlot skips a bypassed effect in the wiring rather than turning it down.
 */
function makeLimiter(ctx, params) {
  const state = { threshold: 0, ceiling: -0.3, release: 0.06, lookahead: 3, arc: 1, ...params };

  const input = ctx.createGain();
  const output = ctx.createGain();

  // Every feedback path below is clamped to this, so it is the grain of the whole
  // sidechain rather than a detail of one node.
  const quantum = 128 / ctx.sampleRate;

  // The audio path. The VCA rests at zero and carries reduction only; the make-up is
  // the gain before it.
  const look = ctx.createDelay(0.02);
  const makeup = ctx.createGain();
  const vca = ctx.createGain(); vca.gain.value = 0;
  const clip = ctx.createWaveShaper(); clip.oversample = 'none';
  input.connect(look); look.connect(makeup); makeup.connect(vca);
  vca.connect(clip); clip.connect(output);

  // The sidechain, scaled into the shapers' domain and rectified.
  const scale = ctx.createGain(); scale.gain.value = 1 / L7_HEADROOM;
  const rectify = ctx.createWaveShaper();
  rectify.curve = L7_RECTIFY; rectify.oversample = 'none';
  input.connect(scale); scale.connect(rectify);

  // Stereo link — max(|L|,|R|), not their average. A kick hard left has to duck the
  // right channel with it, or the image walks about while it works. A mono feed splits
  // to silence on channel 1, where the max is simply |L|, so this handles both.
  const split = ctx.createChannelSplitter(2);
  rectify.connect(split);
  const link = makeMax(ctx);
  split.connect(link.a, 0);
  split.connect(link.b, 1);

  // Ballistics, in two parts, and the split is forced by one rule: a cycle in a Web
  // Audio graph has to contain a DelayNode, and a DelayNode in a cycle is clamped to
  // a whole render quantum however short you set it. The release loop below therefore
  // only gets to look at the envelope 128 samples ago — so what it looks at has to
  // already be a peak hold over that gap, or the loop compares against whatever the
  // waveform happened to be doing one quantum back and the hold collapses. (It does
  // collapse, audibly and completely, for any tone whose period divides the quantum.)
  //
  // So: a sliding maximum first, over exactly one quantum, as a doubling ladder. Each
  // stage maxes its input against a delayed copy of ITSELF, so the window each stage
  // covers doubles — four stages hold across sixteen points in time for four delays
  // and four comparisons rather than sixteen of each.
  //
  // The offsets are deliberately not 1:2:4:8. Evenly spaced taps all land on the same
  // phase of a periodic signal at some frequency, and a rectified sine repeats TWICE
  // per cycle, so the tidy ratios leave whole bands where every tap reads the same
  // point on the waveform and the hold quietly collapses to nothing.
  //
  // Five stages rather than four for the same reason from the other end: the ladder
  // still has one band it under-reads, at the frequency whose half-cycle matches its
  // SHORTEST tap, and every stage added halves that tap and moves the band up an
  // octave. Five puts it near 6kHz, where a sustained full-scale tone is not a thing
  // a song does, and where the gain smoother has averaged the ripple away regardless.
  const LADDER = [1, 2.1, 4.3, 8.7, 17.5];
  const step = quantum / LADDER.reduce((a, b) => a + b, 0);
  const taps = [];
  let held = link.out;
  const slide = LADDER.map((f) => {
    const d = ctx.createDelay(0.02);
    d.delayTime.value = f * step;
    const m = makeMax(ctx);
    held.connect(m.a);
    held.connect(d); d.connect(m.b);
    taps.push(d);
    held = m.out;
    return m;
  });

  // And now the release: env = max(held, env one quantum ago × decay). Instant attack,
  // because the live peak reaches the max unsmoothed; exponential release, because the
  // other leg is the envelope's own past scaled down. The decay lands in steps of one
  // quantum, which is a staircase of (1 - decay) per step while it is letting go —
  // 0.4dB at the default release, and the smoother on the gain rounds that off.
  const env = makeMax(ctx);
  held.connect(env.a);
  const hold = ctx.createDelay(0.05);
  const decay = ctx.createGain();
  env.out.connect(hold); hold.connect(decay); decay.connect(env.b);

  // The gain computer: 1 below the threshold, threshold/peak above it. Smoothed on the
  // way to the VCA over a fraction of the lookahead, which is what turns a step into a
  // ramp that lands just as the peak does.
  const comp = ctx.createWaveShaper(); comp.oversample = 'none';
  env.out.connect(comp);
  const smooth = ctx.createBiquadFilter();
  smooth.type = 'lowpass'; smooth.Q.value = 0.5;
  comp.connect(smooth); smooth.connect(vca.gain);

  // ARC. The L2's automatic release, and the reason it can be pushed hard without
  // pumping: how long the limiter has BEEN working decides how fast it lets go. A
  // second curve reads reduction off the same envelope, a 250ms leak turns that into
  // "how sustained is this", and the result adds to the decay coefficient — an
  // isolated transient releases at the dialled time, a wall of sound five times slower.
  const reduce = ctx.createWaveShaper(); reduce.oversample = 'none';
  env.out.connect(reduce);
  const density = ctx.createGain();
  const dLeak = ctx.createGain();
  const dHold = ctx.createDelay(0.05);
  const dFb = ctx.createGain();
  reduce.connect(dLeak); dLeak.connect(density);
  density.connect(dHold); dHold.connect(dFb); dFb.connect(density);
  const arc = ctx.createGain(); arc.gain.value = 0;
  density.connect(arc); arc.connect(decay.gain);

  const leak = Math.exp(-quantum / 0.25);
  dLeak.gain.value = 1 - leak;
  dFb.gain.value = leak;

  const gainCurve = new Float32Array(L7_CURVE);
  const arcCurve = new Float32Array(L7_CURVE);
  const clipCurve = new Float32Array(L7_CLIP_CURVE);
  let shaped = '';

  // First application lands on the parameters directly; every one after it glides.
  // A ramp from a node's construction value would leave the first render quantum of
  // a song being limited by whatever a fresh DelayNode and GainNode happen to be.
  let running = false;
  const set = (param, v) => {
    if (running) param.setTargetAtTime(v, ctx.currentTime, 0.02);
    else param.value = v;
  };

  const node = { input, output, _custom: true };
  /**
   * A meter tap is made only while an open L7 card asks for one. Five analysers sound
   * extravagant until the alternative is named: keeping them on every L7 in every
   * song, including the ones nobody is looking at. Two per stereo signal avoid the
   * mono down-mix hiding an anti-phase or hard-panned peak; the fifth reads the actual
   * reduction control, so GR is not guessed by subtracting two unrelated levels after
   * make-up gain and the ceiling have changed them.
   *
   * The output tap hangs from `clip`, not `output`. The mixer is allowed to disconnect
   * an effect's public output whenever it rewires a chain; an internal tap must survive
   * that without the card silently going dead.
   */
  node.createMeter = () => {
    const inputSplit = ctx.createChannelSplitter(2);
    const outputSplit = ctx.createChannelSplitter(2);
    const inputAnalysers = [ctx.createAnalyser(), ctx.createAnalyser()];
    const outputAnalysers = [ctx.createAnalyser(), ctx.createAnalyser()];
    const reductionAnalyser = ctx.createAnalyser();
    const analysers = [...inputAnalysers, ...outputAnalysers, reductionAnalyser];
    for (const analyser of analysers) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0;
    }
    input.connect(inputSplit);
    clip.connect(outputSplit);
    inputSplit.connect(inputAnalysers[0], 0);
    inputSplit.connect(inputAnalysers[1], 1);
    outputSplit.connect(outputAnalysers[0], 0);
    outputSplit.connect(outputAnalysers[1], 1);
    smooth.connect(reductionAnalyser);

    const samples = analysers.map(() => new Float32Array(256));
    let disposed = false;
    const stereoPeak = (pair, offset) => {
      let peak = 0;
      for (let channel = 0; channel < 2; channel++) {
        pair[channel].getFloatTimeDomainData(samples[offset + channel]);
        for (const sample of samples[offset + channel]) peak = Math.max(peak, Math.abs(sample));
      }
      return peak;
    };
    return {
      read() {
        if (disposed) return { input: 0, output: 0, reduction: 0 };
        const inputPeak = stereoPeak(inputAnalysers, 0);
        const outputPeak = stereoPeak(outputAnalysers, 2);
        reductionAnalyser.getFloatTimeDomainData(samples[4]);
        let minimumGain = 1;
        for (const sample of samples[4]) minimumGain = Math.min(minimumGain, Math.max(0, sample));
        // The control filter starts cold at zero while the lookahead delay is empty.
        // Silence must read as no work, not as an alarming 120dB of imaginary GR.
        const reduction = inputPeak > 1e-6
          ? Math.max(0, -20 * Math.log10(Math.max(1e-6, minimumGain))) : 0;
        return { input: inputPeak, output: outputPeak, reduction };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        try { input.disconnect(inputSplit); } catch { /* already disconnected */ }
        try { clip.disconnect(outputSplit); } catch { /* already disconnected */ }
        try { smooth.disconnect(reductionAnalyser); } catch { /* already disconnected */ }
        for (const analyser of analysers) { try { analyser.disconnect(); } catch { /* fine */ } }
        try { inputSplit.disconnect(); } catch { /* fine */ }
        try { outputSplit.disconnect(); } catch { /* fine */ }
      },
    };
  };
  node.applyState = () => {
    const thr = Math.max(-30, Math.min(0, state.threshold));
    const ceil = Math.max(-12, Math.min(0, state.ceiling));
    const lookS = Math.max(0.2, Math.min(10, state.lookahead)) / 1000;
    const relS = Math.max(0.01, Math.min(2, state.release));

    const thrLin = 10 ** (thr / 20);
    const ceilLin = 10 ** (ceil / 20);
    // The coupling, and the whole reason this is played the way an L2 is: the gap
    // between the two knobs IS the gain, so pulling the threshold down is the same
    // gesture as turning it up, and the ceiling never moves while you do it.
    set(makeup.gain, ceilLin / thrLin);

    // Rebuilt only when the shape actually changes: a threshold drag is 60 curves a
    // second otherwise, and the ceiling and threshold are the only two that shape one.
    const key = `${thr}|${ceil}`;
    if (key !== shaped) {
      shaped = key;
      for (let i = 0; i < L7_CURVE; i++) {
        const peak = Math.max(0, (2 * i) / (L7_CURVE - 1) - 1) * L7_HEADROOM;
        const r = peak <= thrLin ? 1 : thrLin / peak;
        gainCurve[i] = r;
        arcCurve[i] = 1 - r;              // 0 idle, towards 1 as it works
      }
      comp.curve = gainCurve;
      reduce.curve = arcCurve;

      // The ceiling: exactly linear until the top 0.2dB, then a knee onto the ceiling
      // as an asymptote. Only the overshoot the gain ramp could not catch reaches the
      // curved part, so a peak that is already under the ceiling passes through
      // untouched — and nothing ever comes out above it.
      const knee = 0.98 * ceilLin;
      for (let i = 0; i < L7_CLIP_CURVE; i++) {
        const x = (2 * i) / (L7_CLIP_CURVE - 1) - 1;
        const a = Math.abs(x);
        clipCurve[i] = a <= knee ? x
          : Math.sign(x) * (knee + (ceilLin - knee) * Math.tanh((a - knee) / (ceilLin - knee)));
      }
      clip.curve = clipCurve;
    }

    // Whole samples, always. A DelayNode set between two samples interpolates between
    // them, and linear interpolation of a delay line is a lowpass — a third of a sample
    // out costs nearly 3dB at 12kHz, which turns the lookahead into an accidental tone
    // control. Rounded, it is a pure delay and the audio comes through untouched. The
    // knob loses a fifth of a millisecond of resolution, which is not a real loss.
    set(look.delayTime, Math.round(lookS * ctx.sampleRate) / ctx.sampleRate);

    // The gain has to have finished moving in one lookahead. A two-pole smoother is
    // ~98% there after six time constants, so a sixth of the lookahead leaves a few
    // tenths of a dB for the ceiling curve to round off — and no more.
    set(smooth.frequency, 1 / (2 * Math.PI * (lookS / 6)));
    const coef = Math.exp(-quantum / relS);
    const slow = Math.min(0.9995, Math.exp(-quantum / (relS * 5)));
    set(decay.gain, coef);
    set(arc.gain, state.arc >= 0.5 ? slow - coef : 0);
    running = true;
  };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    link.dispose(); env.dispose();
    for (const m of slide) m.dispose();
    for (const n of [input, look, makeup, vca, clip, scale, rectify, split, ...taps, hold, decay,
      comp, smooth, reduce, dLeak, density, dHold, dFb, arc, output]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}


/**
 * Modulation depth at 1.0, in seconds of delay swing.
 *
 * A doubler's LFO is not a vibrato — it is there so a copy never sits perfectly still
 * against the original, which is the giveaway that it IS a copy, and what stops the two
 * comb-filtering at a fixed set of frequencies. Delay and pitch move together because
 * they are the same thing: 2.5ms at the default rate works out at about 4 cents of
 * drift, which is the order a real second take moves by.
 */
const DOUBLER_MOD = 0.0025;

// Allocated once, at a size that covers TIME plus the modulation. Fixed,
// because Chrome does not render two DelayNodes identically when they were built at
// different maxDelayTime even at the same delay — see the note in tests/null-test.js.
const DOUBLER_MAX_DELAY = 0.25;

/**
 * Points in the ramp and crossfade tables.
 *
 * Both are read by looping AudioBufferSourceNodes rather than by oscillators, which is
 * the one design decision here worth defending. The obvious build drives the delay from
 * an OscillatorNode set to 'sawtooth' — it is what Tone.PitchShift does — but a native
 * sawtooth is BAND-LIMITED, and its Gibbs ringing lands directly on the delay time,
 * where it is pitch error rather than a harmless wobble in a modulator.
 *
 * A table has no such ringing: the ramp is a straight line, linear interpolation of a
 * straight line is that line, and the read is exact everywhere except across the single
 * sample where it wraps. That sample is exactly where the crossfade is holding the tap
 * at zero, so the one discontinuity in the whole scheme is also the one moment nothing
 * is listening to it.
 */
const DOUBLER_TABLE = 8192;

/**
 * The two voices, and everything that keeps them from being one voice at double the
 * level. `dir` is which way the detune goes, and picks the slide's direction with it.
 *
 * The rest is decorrelation, which is the entire art of a doubler: a longer base delay
 * on the second so the two never flam together, opposite pans, a quarter-window offset
 * so their grain jumps never coincide, and modulation rates with no common divisor so
 * the two drifts never line up either. Two voices moving in step are a chorus.
 */
const DOUBLER_VOICES = [
  { dir: +1, delay: 1, pan: +1, phase: 0, rate: 1 },
  { dir: -1, delay: 1.35, pan: -1, phase: 0.25, rate: 0.79 },
];

/**
 * Doubler — a mono part played twice, from native nodes.
 *
 * A duplicate track at the same pitch and the same time is not a second performance;
 * it is the first one 6dB louder, and every comb filter in between. What makes two
 * takes sound like two people is that they are never quite together, so this builds
 * the three ways they differ and gives one control to each:
 *
 *   DETUNE   ±cents, one voice each way. Nobody sings in perfect tune, and this is the
 *            mechanism the other effects in the catalogue cannot fake — a real
 *            varispeed shift, not a modulated delay pretending to be one.
 *   TIME     10-40ms of offset. Nobody comes in on the exact sample either. Under about
 *            8ms the two fuse into one comb-filtered voice; past 50 they are an echo.
 *   RATE     how fast the voices drift, and DEPTH how far. Without it the detune is
 *            static, which is the one thing a human never is.
 *   WIDTH    how far apart the two voices sit, and DRY BALANCE / WET BALANCE where each
 *            part goes. A mono lane comes out of here in stereo, and the two halves are
 *            placed SEPARATELY on purpose: dry hard left and wet hard right is the
 *            oldest double-tracking trick there is, and it needs two controls to say.
 *            (`dryPan`/`wetPan` in the params, which is what saved mixes hold — the
 *            cards said PAN before the catalogue settled on one word for it.)
 *
 * The two are not the same law, which is deliberate. WET BALANCE places a source, so it
 * is the equal-power pan every desk uses. DRY BALANCE is a balance proper — unity in
 * both channels at centre, one side pulled down as it moves — because the dry leg is the
 * signal the lane was mixed with, and an insert must not quietly cost it 3dB for being
 * switched on. Centred, it is bit-for-bit the input.
 *
 * The detuner per voice is the classic two-tap crossfade: one delay line sliding at a
 * constant rate is a constant pitch shift, and it can only slide so far, so a second
 * tap half a window behind takes over before the first has to jump back. The two taps
 * read one window table half a cycle apart, and the shape of it is what makes the
 * handover inaudible — see the table build below.
 */
function makeDoubler(ctx, params) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0;
  // The dry leg's balance: split to two channels, ride one down, put them back. A
  // StereoPannerNode would have been one node instead of four, but its law is
  // equal-power, and equal-power at centre is 0.707 per side — a mono lane would lose
  // 3dB off its mono sum the moment the effect was inserted, whether or not anything
  // was panned. This is unity on both sides at centre and cannot.
  const spread = ctx.createGain();
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const dryL = ctx.createGain();
  const dryR = ctx.createGain();
  // The point of the effect is a stereo image, so it makes one whether or not the lane
  // handed us two channels: a mono synth through a Doubler comes out spread.
  for (const n of [output, wet, spread]) {
    n.channelCount = 2; n.channelCountMode = 'explicit'; n.channelInterpretation = 'speakers';
  }
  input.connect(spread);
  spread.connect(split);
  split.connect(dryL, 0); dryL.connect(merge, 0, 0);
  split.connect(dryR, 1); dryR.connect(merge, 0, 1);
  merge.connect(dry); dry.connect(output);
  wet.connect(output);

  // One sine table, shared by both voices: what makes a reader different is the offset
  // it starts at and the speed it runs at, not the table. Read from a buffer rather
  // than an OscillatorNode because a buffer source can be STARTED at a phase, which is
  // how the second voice gets its quarter-cycle head start for free — an oscillator has
  // no phase control and would need a custom PeriodicWave to begin anywhere but zero.
  // It is also what makes two renders of the same song the same file.
  const lfoBuf = ctx.createBuffer(1, DOUBLER_TABLE, ctx.sampleRate);
  const lfo = lfoBuf.getChannelData(0);
  for (let i = 0; i < DOUBLER_TABLE; i++) lfo[i] = Math.sin((2 * Math.PI * i) / DOUBLER_TABLE);
  const tableSeconds = DOUBLER_TABLE / ctx.sampleRate;
  const running = [];

  /*
   * What this effect is, and what it deliberately is NOT.
   *
   * Two voices, one left and one right, each a short delay with a slow wander on it.
   * That is the whole of it: the delays put the copies where a second take would sit,
   * the wander keeps them from ever being exactly parallel with the original, and the
   * pan puts them at the edges. A mono part comes out wide, and nothing comb-filters
   * against itself because nothing stays at a fixed offset.
   *
   * It used to detune as well, +-100 cents, and that is where all the machinery went: a
   * delay line pitch-shifts if you slide its delay time continuously, but the slide has
   * to wrap, so each voice needed a duplicate tap and a power-complementary crossfade to
   * hide the wrap — two ramp readers and two window readers per voice, five looping
   * sources in all where the modulation itself needs one.
   *
   * Measured, four inserts of it (two Doublers, two Chorus 2s) were 28% of barber-96's
   * entire standing graph, because a looping AudioBufferSourceNode GENERATES signal and
   * so can never be short-circuited the way a silent gain chain is. Ten sources per
   * instance for a pitch shift nobody asked for. The shift is gone; the wander stays.
   */
  const voices = DOUBLER_VOICES.map((v) => {
    const mod = ctx.createBufferSource();
    mod.buffer = lfoBuf;
    mod.loop = true;
    // Started here rather than on a first note: the graph is built at currentTime 0 in
    // an offline render, so every table read begins at a known phase.
    mod.start(0, (((v.phase % 1) + 1) % 1) * tableSeconds);
    running.push(mod);
    const depth = ctx.createGain(); depth.gain.value = 0;
    const tap = ctx.createDelay(DOUBLER_MAX_DELAY);
    const pan = ctx.createStereoPanner();
    // ONE modulator on the delayTime, which is the shape Chrome renders identically
    // twice. Two connections on one AudioParam is the one graph shape in this effect
    // that it does not: measured at 6e-5 between runs against a null-test tolerance of
    // 5e-6. With the pitch slide gone there is only ever this one.
    mod.connect(depth); depth.connect(tap.delayTime);
    input.connect(tap); tap.connect(pan); pan.connect(wet);
    return { v, mod, depth, tap, pan };
  });

  const state = {
    delayMs: 18, frequency: 0.35, depth: 0.35,
    width: 0.85, dryPan: 0, wetPan: 0, wet: 0.45, ...params,
  };

  // Every parameter is exact on the way in and smoothed thereafter, as L7 does it: a
  // render has to start at the settings it was given rather than sliding into them over
  // the first tenth of a second, and a slider drag still has to not click.
  let smooth = false;
  const set = (p, v, tc = 0.03) => {
    if (smooth) p.setTargetAtTime(v, ctx.currentTime, tc); else p.value = v;
  };

  const node = { input, output, _custom: true };
  node.applyState = () => {
    const base = Math.max(0, Math.min(0.1, (state.delayMs ?? 0) / 1000));
    const width = Math.max(0, Math.min(1, state.width ?? 0));
    const centre = Math.max(-1, Math.min(1, state.wetPan ?? 0));
    const swing = Math.max(0, Math.min(1, state.depth ?? 0)) * DOUBLER_MOD;
    for (const q of voices) {
      // TIME is the offset the nearer voice sits at; the other rides at its own ratio so
      // the two are never the same distance out. No centroid correction any more — the
      // delay no longer slides, so what is set is what is heard.
      set(q.tap.delayTime, Math.max(0, base * q.v.delay));
      // One cycle of the table per 1/f seconds is tableSeconds*f of it per second. The
      // per-voice rate keeps the two wanders from locking together.
      set(q.mod.playbackRate, tableSeconds * Math.max(0, state.frequency ?? 0) * q.v.rate, 0.05);
      set(q.depth.gain, swing, 0.05);
      // WIDTH spreads the pair, WET BALANCE moves the pair. Both at +1 is what puts
      // the whole doubled part in one speaker with the original in the other.
      set(q.pan.pan, Math.max(-1, Math.min(1, centre + q.v.pan * width)));
    }
    // A balance, not a pan — unity both sides at centre. See the note on the nodes.
    const p = Math.max(-1, Math.min(1, state.dryPan ?? 0));
    set(dryL.gain, p <= 0 ? 1 : 1 - p);
    set(dryR.gain, p >= 0 ? 1 : 1 + p);
    // Equal power, as the Reverb crossfades — and the wet leg carries TWO voices, so it
    // is scaled by 1/sqrt(2) as well: two uncorrelated takes sum back to the level of
    // the one they were doubling, rather than arriving 3dB over it.
    const w = Math.max(0, Math.min(1, state.wet ?? 0));
    set(wet.gain, Math.sin((w * Math.PI) / 2) * Math.SQRT1_2);
    set(dry.gain, Math.cos((w * Math.PI) / 2));
    smooth = true;
  };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    for (const s of running) { try { s.stop(); } catch { /* never started */ } }
    for (const q of voices) {
      for (const n of [q.mod, q.depth, q.tap, q.pan]) {
        try { n.disconnect(); } catch { /* fine */ }
      }
    }
    for (const n of [input, spread, split, dryL, dryR, merge, dry, wet]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}

/**
 * Phaser — the classic one, from four allpass stages and a single LFO.
 *
 * A phaser is a swept notch, and the notch comes from adding a signal to a phase-shifted
 * copy of itself: where the shift reaches 180 degrees the two cancel. An allpass filter
 * shifts phase without touching level, so a cascade of them and a dry path is the whole
 * effect. Four stages give two notches — the MXR Phase 90's arrangement, and what people
 * mean when they say a phaser sounds like a phaser.
 *
 * REPLACING Tone.Phaser, and the reason is not subtlety. Tone builds TEN stages per
 * channel, twenty Tone.Filters in all, and every Tone.Filter creates four
 * ConstantSourceNodes to drive its params — about eighty permanently-running generators.
 * Measured on a real master bus it cost 20.6 ms per audio second, the most expensive
 * entry in the catalogue by double, and it cost that IDLE: the same with the song
 * playing as with it silent, because a generator cannot be short-circuited by silence.
 * Ten stages is five notches, which is further into flanger territory than phaser
 * anyway. This is eleven nodes and one source.
 *
 * The LFO is a looping buffer read rather than an OscillatorNode for the same reason the
 * Doubler's is: a buffer source can be STARTED at a phase, so two renders of a song are
 * the same file, and an oscillator cannot be started anywhere but zero without a custom
 * PeriodicWave.
 *
 * FEEDBACK returns the last stage to the first, which sharpens the notches into the
 * resonant whistle a Small Stone has and a Phase 90 does not. Zero is the plain sweep.
 */
const PHASER_STAGES = 4;

function makePhaser(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  // The allpass cascade. A BiquadFilterNode does allpass natively and handles both
  // channels itself, so there is no need to split the signal or build the chain twice.
  const stages = [];
  for (let i = 0; i < PHASER_STAGES; i++) {
    const ap = ctx.createBiquadFilter();
    ap.type = 'allpass';
    ap.Q.value = 0.7071;
    stages.push(ap);
  }
  const feedback = ctx.createGain();
  feedback.gain.value = 0;
  const table = modulationTable(ctx, 'sine');
  const lfo = modulationSource(ctx, table, 0);
  const depth = ctx.createGain();
  depth.gain.value = 0;

  input.connect(dry); dry.connect(output);
  input.connect(stages[0]);
  for (let i = 1; i < stages.length; i++) stages[i - 1].connect(stages[i]);
  const last = stages[stages.length - 1];
  last.connect(wet); wet.connect(output);
  // The resonant path. A cycle, so Chrome splits the graph here — which is the cost of
  // the sound and is why FEEDBACK defaults to a modest amount rather than none.
  last.connect(feedback); feedback.connect(stages[0]);
  // ONE connection per AudioParam: the base corner is the param's value and the sweep is
  // this single edge. Two writers on one param is the shape that renders differently
  // between runs — see the note in makeDoubler.
  lfo.connect(depth);
  for (const ap of stages) depth.connect(ap.frequency);

  const state = {
    rateSync: 0, rateDivision: 4, frequency: 0.5, octaves: 3,
    baseFrequency: 350, feedback: 0.2, wet: 0.5, ...params,
  };
  let running = false;
  const set = (p, v, tc = 0.03) => setAudioParam(ctx, p, v, running, tc);

  const node = { input, output, _custom: true };
  const apply = (bpm = 120) => {
    const rate = rateHz(state, bpm);
    const base = Math.max(20, Math.min(8000, state.baseFrequency ?? 350));
    const octaves = Math.max(0, Math.min(6, state.octaves ?? 3));
    // The sweep is symmetric in OCTAVES about the base corner, which is how the ear
    // hears a phaser move — linear Hz would crawl at the bottom and race at the top.
    // The LFO table is +-1, so half the span per side lands the extremes on
    // base*2^-octaves/2 and base*2^+octaves/2.
    const top = base * (2 ** (octaves / 2));
    const bottom = base / (2 ** (octaves / 2));
    for (const ap of stages) set(ap.frequency, Math.sqrt(top * bottom));
    set(depth.gain, (top - bottom) / 2, 0.05);
    set(lfo.playbackRate, table.duration * Math.max(0, rate), 0.05);
    set(feedback.gain, Math.max(0, Math.min(0.7, state.feedback ?? 0)), 0.03);
    // Equal power, as every other wet/dry in this file.
    const w = Math.max(0, Math.min(1, state.wet ?? 0));
    set(wet.gain, Math.sin((w * Math.PI) / 2));
    set(dry.gain, Math.cos((w * Math.PI) / 2));
    running = true;
  };
  node.applyState = apply;
  node.setState = (patch, bpm) => { Object.assign(state, patch); apply(bpm); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    try { lfo.stop(); } catch { /* never started */ }
    for (const n of [input, dry, wet, output, feedback, depth, lfo, ...stages]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  apply();
  return node;
}

// A small deterministic wavetable used by the native modulation effects. Buffer
// sources are used instead of Math.random or worklets so live playback and offline
// renders share the same phase and remain renderable in OfflineAudioContext.
const MOD_TABLE_SIZE = 2048;
function modulationTable(ctx, waveform = 'sine') {
  const buf = ctx.createBuffer(1, MOD_TABLE_SIZE, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const p = i / data.length;
    if (waveform === 'square') data[i] = p < 0.5 ? 1 : -1;
    else if (waveform === 'triangle') data[i] = 1 - 4 * Math.abs(Math.round(p) - p);
    else data[i] = Math.sin(p * Math.PI * 2);
  }
  return buf;
}

function modulationSource(ctx, table, phase = 0, rate = 1) {
  const src = ctx.createBufferSource();
  src.buffer = table;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = table.duration;
  src.playbackRate.value = table.duration * rate;
  src.start(0, Math.max(0, Math.min(0.999999, phase)) * table.duration);
  return src;
}

// AudioParam is standardized with setTargetAtTime, but a few Web Audio wrappers
// (and older Safari-native nodes) expose only the ramp methods. Keep live Mixer edits
// working in those runtimes: use target smoothing when available, a short linear ramp
// otherwise, and a direct value as the final safe fallback.
function setAudioParam(ctx, param, value, running, seconds = 0.03) {
  if (!param || (typeof param !== 'object' && typeof param !== 'function')) return;
  if (!running) {
    if ('value' in param) param.value = value;
    return;
  }
  const now = ctx.currentTime;
  if (typeof param.setTargetAtTime === 'function') {
    param.setTargetAtTime(value, now, seconds);
  } else if (typeof param.linearRampToValueAtTime === 'function') {
    if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
    if (typeof param.setValueAtTime === 'function' && Number.isFinite(param.value)) {
      param.setValueAtTime(param.value, now);
    }
    param.linearRampToValueAtTime(value, now + Math.max(0.001, seconds * 3));
  } else if ('value' in param) {
    param.value = value;
  }
}

// Auto Wah's free mode is an envelope follower, not an LFO. Keep that sound as the
// default and add a second, genuinely cyclic path for Tempo Mode. The two paths are
// selected before the single frequency-control bus, so each filter AudioParam has one
// writer and the mode switch cannot leave two independent modulators fighting there.
const AUTO_WAH_ABS_CURVE = (() => {
  const curve = new Float32Array(2049);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.abs((i * 2) / (curve.length - 1) - 1);
  return curve;
})();

function autoWahFrequencyCurve(base, octaves, tempo, nyquist) {
  const curve = new Float32Array(2049);
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / (curve.length - 1) - 1;
    // The follower is unipolar, so the negative half of its waveshaper domain is a
    // harmless floor. The LFO is bipolar and uses the complete domain.
    const position = tempo ? (x + 1) / 2 : Math.max(0, x);
    curve[i] = Math.min(nyquist, base * (2 ** (octaves * position)));
  }
  return curve;
}

function makeAutoWah(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const inputBoost = ctx.createGain();
  const absolute = ctx.createWaveShaper();
  absolute.curve = AUTO_WAH_ABS_CURVE;
  absolute.oversample = 'none';
  const follower = ctx.createBiquadFilter();
  follower.type = 'lowpass';
  follower.Q.value = 0.7071;
  follower.frequency.value = 5; // Tone.AutoWah's default 200ms follower smoothing.

  const envelopeMap = ctx.createWaveShaper();
  const tempoMap = ctx.createWaveShaper();
  envelopeMap.oversample = 'none';
  tempoMap.oversample = 'none';
  const envelopeSelect = ctx.createGain();
  const tempoSelect = ctx.createGain();
  const frequencyBus = ctx.createGain();
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  const peak = ctx.createBiquadFilter();
  peak.type = 'peaking';
  peak.gain.value = 2;
  peak.Q.value = 0.7071;

  const table = modulationTable(ctx, 'sine');
  let lfo = null;
  const ensureLfo = (rate) => {
    if (lfo) return;
    lfo = ctx.createBufferSource();
    lfo.buffer = table;
    lfo.loop = true;
    lfo.loopStart = 0;
    lfo.loopEnd = table.duration;
    lfo.playbackRate.value = table.duration * rate;
    lfo.connect(tempoMap);
    // Starting only when Tempo Mode is selected keeps the default envelope mode free
    // of a permanently-running generator. This also supports a live mode toggle.
    lfo.start(Math.max(0, ctx.currentTime));
  };
  const stopLfo = () => {
    if (!lfo) return;
    try { lfo.disconnect(tempoMap); } catch { /* already disconnected */ }
    try { lfo.stop(); } catch { /* already stopped */ }
    lfo = null;
  };

  input.connect(dry); dry.connect(output);
  input.connect(inputBoost); inputBoost.connect(absolute); absolute.connect(follower);
  follower.connect(envelopeMap); envelopeMap.connect(envelopeSelect); envelopeSelect.connect(frequencyBus);
  tempoMap.connect(tempoSelect); tempoSelect.connect(frequencyBus);
  frequencyBus.connect(bandpass.frequency); frequencyBus.connect(peak.frequency);
  input.connect(bandpass); bandpass.connect(peak); peak.connect(wet); wet.connect(output);

  const state = {
    rateSync: 0, rateDivision: 2,
    baseFrequency: 100, octaves: 6, sensitivity: 0, Q: 2, wet: 1, ...params,
  };
  let running = false;
  const set = (param, value, seconds = 0.03) => setAudioParam(ctx, param, value, running, seconds);
  const apply = (bpm = 120) => {
    const base = Math.max(20, Math.min(8000, state.baseFrequency ?? 100));
    const octaves = Math.max(0, Math.min(8, state.octaves ?? 6));
    const nyquist = Math.max(1000, ctx.sampleRate / 2 - 1);
    envelopeMap.curve = autoWahFrequencyCurve(base, octaves, false, nyquist);
    tempoMap.curve = autoWahFrequencyCurve(base, octaves, true, nyquist);

    // Tone's sensitivity is an input boost in dB: negative values make quiet playing
    // open the wah further, while the default 0dB leaves the input untouched.
    const sensitivity = Math.max(-40, Math.min(0, state.sensitivity ?? 0));
    set(inputBoost.gain, 10 ** (-sensitivity / 20));
    set(bandpass.Q, Math.max(0.1, Math.min(20, state.Q ?? 2)));

    const synced = (state.rateSync ?? 0) >= 0.5;
    if (synced) {
      ensureLfo(rateHz(state, bpm));
      set(lfo.playbackRate, table.duration * rateHz(state, bpm), 0.05);
    } else {
      stopLfo();
    }
    set(envelopeSelect.gain, synced ? 0 : 1, 0.025);
    set(tempoSelect.gain, synced ? 1 : 0, 0.025);

    const w = Math.max(0, Math.min(1, state.wet ?? 0));
    set(wet.gain, Math.sin((w * Math.PI) / 2));
    set(dry.gain, Math.cos((w * Math.PI) / 2));
    running = true;
  };
  const node = { input, output, _custom: true };
  node.applyState = apply;
  node.setState = (patch, bpm) => { Object.assign(state, patch); apply(bpm); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    stopLfo();
    for (const n of [input, output, dry, wet, inputBoost, absolute, follower,
      envelopeMap, tempoMap, envelopeSelect, tempoSelect, frequencyBus, bandpass, peak]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  apply();
  return node;
}

function makeModulatedDelay(ctx, params = {}, kind = 'chorus') {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const wetBus = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass'; tone.Q.value = 0.7071;
  input.connect(dry); dry.connect(output);
  input.connect(wetBus); wetBus.connect(tone); tone.connect(wet); wet.connect(output);

  const chorus = kind === 'chorus';
  /*
   * TWO taps, one left and one right, for both kinds.
   *
   * Chorus used to run four, at pan -1, -0.33, +0.33, +1, with a DENSITY control that
   * weighted them [1, 1, density, density]. That is only symmetric at density 1: below
   * it the two right-hand taps faded while the two left stayed up, so turning the
   * control down walked the image to the left. Nobody asked for that and it is not what
   * the pot said it did.
   *
   * The reason to have four was width, and two hard-panned taps are already as wide as
   * the field goes — the inner pair mostly thickened the middle, which is the part a
   * chorus is trying to get OUT of the middle. What they also did was cost: each tap
   * carries a looping AudioBufferSourceNode, and a source GENERATES signal, so unlike a
   * silent gain chain it can never be short-circuited. Four inserts of this family (two
   * Chorus 2, two Doublers) measured at 28% of barber-96's entire standing graph.
   */
  const count = 2;
  const phases = [0, 0.5];
  const panShape = [-1, 1];
  const table = modulationTable(ctx, 'sine');
  const taps = [];
  for (let i = 0; i < count; i++) {
    const delay = ctx.createDelay(0.1);
    const modDepth = ctx.createGain();
    const source = modulationSource(ctx, table, phases[i]);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7071;
    const feedback = ctx.createGain();
    const panner = ctx.createStereoPanner();
    const level = ctx.createGain();
    source.connect(modDepth); modDepth.connect(delay.delayTime);
    input.connect(delay); delay.connect(lp);
    lp.connect(feedback); feedback.connect(delay);
    lp.connect(panner); panner.connect(level); level.connect(wetBus);
    taps.push({ delay, modDepth, source, lp, feedback, panner, level });
  }

  const state = chorus
    ? { rateSync: 0, rateDivision: 2, frequency: 0.65, delayMs: 16, depth: 0.55,
      width: 1, feedback: 0.12, tone: 9000, wet: 0.5, ...params }
    : { rateSync: 0, rateDivision: 2, frequency: 0.25, delayMs: 2, depth: 0.7,
      feedback: 0.45, spread: 180, tone: 8000, wet: 0.5, ...params };
  let running = false;
  const setParam = (p, value, tc = 0.03) => setAudioParam(ctx, p, value, running, tc);
  const apply = (bpm = 120) => {
    const rate = rateHz(state, bpm);
    const base = Math.max(0.0002, Math.min(0.06, (state.delayMs || 0) / 1000));
    const maxSwing = Math.max(0.00005, Math.min(base * 0.8, chorus ? 0.006 : base * 0.9));
    const swing = Math.max(0, Math.min(1, state.depth || 0)) * maxSwing;
    const width = chorus ? Math.max(0, Math.min(1, state.width ?? 0))
      : Math.max(0, Math.min(1, (state.spread ?? 180) / 180));
    const feedback = Math.max(0, Math.min(chorus ? 0.6 : 0.85, state.feedback || 0));
    const cutoff = Math.max(200, Math.min(20000, state.tone || 8000));
    // Equal weight, so the pair is symmetric by construction. DENSITY is gone with the
    // taps it used to fade — see the note at the tap layout.
    const norm = Math.SQRT2;
    taps.forEach((q, i) => {
      setParam(q.source.playbackRate, table.duration * rate, 0.04);
      setParam(q.delay.delayTime, base, 0.03);
      setParam(q.modDepth.gain, swing, 0.03);
      setParam(q.feedback.gain, feedback, 0.03);
      setParam(q.lp.frequency, cutoff, 0.04);
      setParam(q.level.gain, (1 / norm) * (1 / Math.SQRT2), 0.03);
      setParam(q.panner.pan, panShape[i] * width, 0.03);
    });
    const w = Math.max(0, Math.min(1, state.wet || 0));
    setParam(wet.gain, Math.sin((w * Math.PI) / 2), 0.03);
    setParam(dry.gain, Math.cos((w * Math.PI) / 2), 0.03);
    setParam(tone.frequency, cutoff, 0.04);
    running = true;
  };
  const node = { input, output, _custom: true };
  node.applyState = apply;
  node.setState = (patch, bpm) => { Object.assign(state, patch); apply(bpm); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    for (const q of taps) {
      try { q.source.stop(); } catch { /* already stopped */ }
      for (const n of [q.delay, q.modDepth, q.source, q.lp, q.feedback, q.panner, q.level]) {
        try { n.disconnect(); } catch { /* fine */ }
      }
    }
    for (const n of [input, dry, wetBus, tone, wet, output]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}

function makeBitCrusher(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  // ScriptProcessorNode is deprecated for new application code, but it is the one
  // processor Chromium runs in both live AudioContexts and OfflineAudioContexts here.
  // A 256-frame block keeps the live latency bounded while preserving the export path;
  // the held sample and its phase live across blocks, so a downsample factor does not
  // restart at every callback.
  const processor = ctx.createScriptProcessor(256, 2, 2);
  input.connect(dry); dry.connect(output);
  input.connect(processor); processor.connect(wet); wet.connect(output);
  const state = { bits: 8, downsample: 4, wet: 1, ...params };
  const held = [0, 0];
  let samplesUntilNext = 0;
  let running = false;
  const setParam = (p, value, tc = 0.03) => setAudioParam(ctx, p, value, running, tc);
  processor.onaudioprocess = (event) => {
    const source = event.inputBuffer;
    const destination = event.outputBuffer;
    const channels = destination.numberOfChannels;
    const sourceChannels = source.numberOfChannels;
    const sourceData = Array.from({ length: sourceChannels }, (_, c) => source.getChannelData(c));
    const destinationData = Array.from({ length: channels }, (_, c) => destination.getChannelData(c));
    const bits = Math.max(1, Math.min(24, Math.round(Number(state.bits) || 8)));
    const steps = 2 ** (bits - 1);
    const factor = Math.max(1, Math.min(40, Math.round(Number(state.downsample) || 1)));
    for (let i = 0; i < destination.length; i++) {
      if (samplesUntilNext <= 0) {
        for (let c = 0; c < channels; c++) {
          const inputChannel = sourceChannels ? Math.min(c, sourceChannels - 1) : -1;
          const sample = inputChannel < 0 ? 0 : sourceData[inputChannel][i];
          held[c] = Math.round(sample * steps) / steps;
        }
        samplesUntilNext = factor;
      }
      for (let c = 0; c < channels; c++) destinationData[c][i] = held[c] || 0;
      samplesUntilNext--;
    }
  };
  const apply = () => {
    const w = Math.max(0, Math.min(1, state.wet || 0));
    setParam(wet.gain, Math.sin((w * Math.PI) / 2), 0.03);
    setParam(dry.gain, Math.cos((w * Math.PI) / 2), 0.03);
    running = true;
  };
  const node = { input, output, _custom: true };
  node.applyState = apply;
  node.setState = (patch) => { Object.assign(state, patch); apply(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    processor.onaudioprocess = null;
    for (const n of [input, dry, processor, wet, output]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}

/**
 * A level-sensitive noise gate. The detector is stereo-linked so a quiet channel
 * cannot pull the image apart, and the same attack/release ballistics are applied to
 * the gain control so closing the gate is a fade rather than a click. A
 * ScriptProcessorNode is used here for the per-sample envelope: it is deprecated for
 * new browser work, but is the native processor this project can render in both live
 * and OfflineAudioContexts. There is no dry leg — below THRESHOLD means silence.
 */
function makeNoiseGate(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const processor = ctx.createScriptProcessor(256, 2, 2);
  const state = { threshold: -45, attack: 0.005, release: 0.12, ...params };
  const sampleRate = ctx.sampleRate;
  let envelope = 0;
  let gateGain = 0;

  input.connect(processor);
  processor.connect(output);
  processor.onaudioprocess = (event) => {
    const source = event.inputBuffer;
    const destination = event.outputBuffer;
    const sourceChannels = source.numberOfChannels;
    const channels = destination.numberOfChannels;
    const sourceData = Array.from({ length: sourceChannels }, (_, c) => source.getChannelData(c));
    const destinationData = Array.from({ length: channels }, (_, c) => destination.getChannelData(c));
    const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const threshold = 10 ** (Math.max(-80, Math.min(0, numberOr(state.threshold, -45))) / 20);
    const attack = Math.max(0.001, Math.min(0.5, numberOr(state.attack, 0.005)));
    const release = Math.max(0.01, Math.min(2, numberOr(state.release, 0.12)));
    const attackCoef = Math.exp(-1 / (attack * sampleRate));
    const releaseCoef = Math.exp(-1 / (release * sampleRate));

    for (let i = 0; i < destination.length; i++) {
      let level = 0;
      for (let c = 0; c < sourceChannels; c++) level = Math.max(level, Math.abs(sourceData[c][i] || 0));
      const envelopeCoef = level > envelope ? attackCoef : releaseCoef;
      envelope = level + (envelope - level) * envelopeCoef;
      const target = envelope >= threshold ? 1 : 0;
      const gainCoef = target > gateGain ? attackCoef : releaseCoef;
      gateGain = target + (gateGain - target) * gainCoef;
      if (gateGain < 1e-5) gateGain = 0;
      for (let c = 0; c < channels; c++) {
        const inputChannel = sourceChannels ? Math.min(c, sourceChannels - 1) : -1;
        destinationData[c][i] = inputChannel < 0 ? 0 : sourceData[inputChannel][i] * gateGain;
      }
    }
  };

  const node = { input, output, _custom: true };
  node.applyState = () => {};
  node.setState = (patch = {}) => { Object.assign(state, patch); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    processor.onaudioprocess = null;
    for (const n of [input, processor, output]) { try { n.disconnect(); } catch { /* fine */ } }
  };
  return node;
}

const VOWEL_EXCITER_CURVE = (() => {
  const curve = new Float32Array(4097);
  const norm = Math.tanh(4);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(4 * x) / norm;
  }
  return curve;
})();

// A three-resonance vocal-tract insert.  The graph is deliberately native Web Audio:
// it has to render in OfflineAudioContext as well as through the live Mixer, and the
// catalogue's Tone worklet effects are not safe on the export path.
function makeVowelFilter(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const vocalWetSum = ctx.createGain();
  const articulationGain = ctx.createGain();
  articulationGain.gain.value = 1;
  const vocalSource = ctx.createGain();
  const exciteInput = ctx.createGain();
  const excitePre = ctx.createGain();
  const exciteShaper = ctx.createWaveShaper();
  exciteShaper.curve = VOWEL_EXCITER_CURVE;
  exciteShaper.oversample = '2x';
  const exciteMix = ctx.createGain();
  const breathFilter = ctx.createBiquadFilter();
  breathFilter.type = 'highpass';
  breathFilter.frequency.value = 3200;
  breathFilter.Q.value = 0.5;
  const breathGain = ctx.createGain();
  const breathVca = ctx.createGain();
  breathVca.gain.value = 0;
  const body = ctx.createBiquadFilter();
  const bodyGain = ctx.createGain();
  const air = ctx.createBiquadFilter();
  const airGain = ctx.createGain();
  const presence = [0, 1].map(() => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    return filter;
  });
  const bank = ctx.createGain();
  const filters = [0, 1, 2].map(() => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    return filter;
  });
  const formantGains = filters.map(() => ctx.createGain());
  const formantPans = filters.map(() => ctx.createStereoPanner());
  // A second identical bank, fed from the first. Running the vowel through itself squares
  // the response, which doubles every dB of formant contrast — the one lever that goes
  // further than RESO, because narrowing the peaks cannot lower the floor between them
  // and squaring can. INTENSITY crossfades between one pass and two.
  const stage2 = [0, 1, 2].map(() => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    return filter;
  });
  const stage2Gains = stage2.map(() => ctx.createGain());
  const cascade = ctx.createGain();
  const onePass = ctx.createGain();
  const twoPass = ctx.createGain();

  input.connect(dry); dry.connect(output);
  input.connect(vocalSource);
  input.connect(exciteInput);
  exciteInput.connect(excitePre); excitePre.connect(exciteShaper);
  exciteShaper.connect(exciteMix); exciteMix.connect(vocalSource);
  vocalSource.connect(breathFilter); breathFilter.connect(breathGain);
  breathGain.connect(breathVca); breathVca.connect(vocalWetSum);
  // A vowel is a resonant shape over a voiced body, not three isolated whistles.
  // Keep a low-passed copy in the wet path so high wet settings retain weight without
  // restoring the whole dry signal that the formants are meant to replace. The corner
  // follows F1, because that is where the vowel's own weight sits: a fixed 560 Hz put
  // the corner above F1 for /i/ and /u/ and below it for /a/, which is why the low end
  // measured 15 dB down no matter what vowel was selected.
  body.type = 'lowpass';
  body.frequency.value = 560;
  body.Q.value = 0.45;
  vocalSource.connect(body); body.connect(bodyGain); bodyGain.connect(vocalWetSum);
  // Above F3 a vocal tract mostly passes what the source gives it, shaped by the
  // singer's own F4/F5 — which barely move as the vowel does. Three bandpasses can pass
  // nothing at all, so the old graph fell off a cliff at 3 kHz and every vowel arrived
  // with no presence and no air.
  //
  // This is a series chain rather than two more bands in the parallel bank, and that is
  // the whole point: bandpasses at F4/F5 summed alongside F3 put a cancellation notch
  // exactly on F3 — measured, it buried alto /a/'s third formant by 7dB and moved the
  // peak out of its own window. A high-passed tap with two peaking filters on it adds
  // the same resonances with nothing to cancel against.
  air.type = 'highpass';
  air.frequency.value = 3200;
  air.Q.value = 0.5;
  vocalSource.connect(air);
  air.connect(presence[0]); presence[0].connect(presence[1]);
  presence[1].connect(airGain); airGain.connect(vocalWetSum);
  filters.forEach((filter, i) => {
    vocalSource.connect(filter);
    filter.connect(formantGains[i]);
    formantGains[i].connect(formantPans[i]);
    formantPans[i].connect(bank);
  });
  // bank -> stage2 is connected on demand, see applyWet.
  let cascadeLive = false;
  stage2.forEach((filter, i) => {
    filter.connect(stage2Gains[i]);
    stage2Gains[i].connect(cascade);
  });
  bank.connect(onePass); onePass.connect(vocalWetSum);
  cascade.connect(twoPass); twoPass.connect(vocalWetSum);
  vocalWetSum.connect(articulationGain); articulationGain.connect(wet); wet.connect(output);

  const state = {
    voice: 'alto', stack: 'a e i o u', rateSync: 1, rateDivision: 0.25,
    frequency: 0.5, waveform: 'step', depth: 1, glide: 0.08, articulation: 0,
    reso: 2, spread: 0.9, body: 0.5, air: 0.25, tilt: 0.45, intensity: 0,
    excite: 0, breath: 0, wet: 0.9, ...params,
  };
  let smooth = false;
  let lastStep = null;
  let lastWhen = null;
  let lastSixteenth = null;
  let lastSignature = null;
  let nextSyncedOrdinal = null;
  let currentOrdinal = 0;
  let freeOrdinal = 0;
  let freeNextAt = null;
  let motionSeed = 0;

  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));
  const periodBeats = () => Math.max(1 / 32, finite(state.rateDivision, 1));
  const freeRate = () => Math.max(0.05, Math.min(8, finite(state.frequency, 0.5)));
  const isSynced = () => finite(state.rateSync, 1) >= 0.5;
  const motionSignature = (bpm, swing, sixteenth) => [
    state.voice, state.stack, state.rateSync, state.rateDivision, state.frequency,
    state.waveform, state.depth, state.glide, state.articulation, state.breath,
    state.reso, state.tilt, bpm, swing, sixteenth,
  ].join('|');

  const shapeMode = () => ['step', 'sine', 'triangle', 'saw up', 'saw down', 'square', 'random']
    .includes(state.waveform) ? state.waveform : 'step';
  const targetValues = (position) => {
    const target = vowelAt(state.voice, state.stack, position, clamp01(state.depth));
    // The table's relative amplitudes are a *singer's*, and they are steep: alto /a/ puts
    // F3 20 dB down and soprano /a/ 32 dB down. Applied whole to a synth that already has
    // its own spectrum, that buries the two formants the ear uses to tell one vowel — and
    // one VOICE — from another. Csound's rows for /a/ give alto and soprano the identical
    // F1 and F2, so F3 is the ONLY thing separating them, and at -32 dB it is inaudible.
    // TILT scales the rolloff: 1 is the published singer, 0 is flat like `robotic`.
    const tilt = clamp01(state.tilt);
    const amplitudes = target.dB.map((db) => 10 ** ((db * tilt) / 20));
    // Unity makeup is technically polite but makes the insert disappear against a
    // full-range synth. A controlled resonant lift gives the formant motion enough
    // contrast to read as a vowel; the cap keeps extreme tables bounded.
    const makeup = Math.min(1.8,
      1.55 / Math.sqrt(amplitudes.reduce((sum, value) => sum + value * value, 0)));
    const resonance = Math.max(0.3, Math.min(3, finite(state.reso, 1)));
    const q = target.f.map((frequency, i) => Math.max(0.1,
      Math.min(150, (frequency / Math.max(1, target.bw[i])) * resonance)));
    return { f: target.f, q, gain: amplitudes, makeup, body: target.f[0] };
  };

  const targetPosition = (ordinal) => {
    const n = parseStack(state.stack).length;
    return vowelPosition(shapeMode(), n, ordinal, motionSeed);
  };

  const write = (param, value, when, seconds, direct = false) => {
    if (!param || !Number.isFinite(value)) return;
    if (direct) {
      param.value = value;
      return;
    }
    const at = Math.max(ctx.currentTime, when);
    const tc = Math.max(0.004, seconds || 0.004);
    if (typeof param.setTargetAtTime === 'function') {
      param.setTargetAtTime(value, at, tc);
    } else if (typeof param.linearRampToValueAtTime === 'function') {
      if (typeof param.setValueAtTime === 'function' && Number.isFinite(param.value)) {
        param.setValueAtTime(param.value, at);
      }
      param.linearRampToValueAtTime(value, at + tc * 3);
    } else {
      param.value = value;
    }
  };

  const writeLinear = (param, value, when, seconds, direct = false) => {
    if (!param || !Number.isFinite(value)) return;
    if (direct) {
      param.value = value;
      return;
    }
    const at = Math.max(ctx.currentTime, when);
    const duration = Math.max(0.004, seconds || 0.004);
    if (typeof param.linearRampToValueAtTime === 'function') {
      if (at <= ctx.currentTime + 1e-7 && typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(Number.isFinite(param.value) ? param.value : value, at);
      }
      param.linearRampToValueAtTime(value, at + duration);
    } else {
      write(param, value, at, duration, false);
    }
  };

  const applyWet = (direct = false) => {
    const w = clamp01(state.wet);
    write(dry.gain, Math.cos((w * Math.PI) / 2), ctx.currentTime, 0.03, direct);
    write(wet.gain, Math.sin((w * Math.PI) / 2), ctx.currentTime, 0.03, direct);
    const i = clamp01(state.intensity);
    const bodyKeep = 1 - (0.65 * i);
    const airKeep = 1 - (0.50 * i);
    write(bodyGain.gain, Math.sin((w * Math.PI) / 2) * clamp01(state.body) * bodyKeep,
      ctx.currentTime, 0.03, direct);
    write(airGain.gain, Math.sin((w * Math.PI) / 2) * clamp01(state.air) * airKeep,
      ctx.currentTime, 0.03, direct);
    write(onePass.gain, 1 - i, ctx.currentTime, 0.03, direct);
    write(twoPass.gain, i, ctx.currentTime, 0.03, direct);
    write(excitePre.gain, 1 + (12 * clamp01(state.excite)), ctx.currentTime, 0.03, direct);
    write(exciteMix.gain, 0.42 * clamp01(state.excite), ctx.currentTime, 0.03, direct);
    write(breathGain.gain, 0.20 * clamp01(state.breath), ctx.currentTime, 0.03, direct);
    if (direct) articulationGain.gain.value = 1;
    // Three extra biquads run whether or not anyone is listening to them, and measured
    // that doubled the insert's cost for a control that is off by default. Cutting the
    // feed lets the second bank fall silent and be skipped until it is actually wanted.
    const wanted = i > 0;
    if (wanted !== cascadeLive) {
      for (const filter of stage2) {
        try { if (wanted) bank.connect(filter); else bank.disconnect(filter); } catch { /* fine */ }
      }
      cascadeLive = wanted;
    }
  };

  // F4/F5 follow the VOICE, never the vowel, so this runs on a state change and not on
  // every step of the walk.
  const applyPresence = (direct = false) => {
    const upper = upperFormants(state.voice);
    presence.forEach((filter, i) => {
      write(filter.frequency, upper.f[i], ctx.currentTime, 0.03, direct);
      write(filter.Q, Math.max(0.1, upper.f[i] / Math.max(1, upper.bw[i])),
        ctx.currentTime, 0.03, direct);
      write(filter.gain, upper.dB[i], ctx.currentTime, 0.03, direct);
    });
  };

  const applySpread = (direct = false) => {
    const spread = clamp01(state.spread);
    [-spread, 0, spread].forEach((pan, i) => {
      write(formantPans[i].pan, pan, ctx.currentTime, 0.03, direct);
    });
  };

  const applyTarget = (ordinal, when, period, direct = false) => {
    const values = targetValues(targetPosition(ordinal));
    const continuous = ['sine', 'triangle', 'saw up', 'saw down'].includes(shapeMode());
    const transition = Math.max(0.004,
      (continuous ? Math.max(0.35, clamp01(state.glide)) : clamp01(state.glide))
        * 0.45 * Math.max(0.001, period));
    const set = continuous ? writeLinear : write;
    filters.forEach((filter, i) => {
      set(filter.frequency, values.f[i], when, continuous ? period : transition, direct);
      set(filter.Q, values.q[i], when, continuous ? period : transition, direct);
      set(formantGains[i].gain, values.gain[i], when, continuous ? period : transition, direct);
      // Stage two is the same filter, so it takes the same targets.
      set(stage2[i].frequency, values.f[i], when, continuous ? period : transition, direct);
      set(stage2[i].Q, values.q[i], when, continuous ? period : transition, direct);
      set(stage2Gains[i].gain, values.gain[i], when, continuous ? period : transition, direct);
    });
    set(bank.gain, values.makeup, when, continuous ? period : transition, direct);
    set(cascade.gain, values.makeup, when, continuous ? period : transition, direct);
    set(body.frequency, values.body, when, continuous ? period : transition, direct);
    currentOrdinal = ordinal;
  };

  const articulateAt = (when, period) => {
    const amount = clamp01(state.articulation);
    const breath = clamp01(state.breath);
    if (amount <= 0 && breath <= 0) return;
    const floor = 1 - (0.88 * amount);
    const close = Math.min(Math.max(0.001, period * 0.04), 0.004);
    const open = Math.min(Math.max(0.004, period * (0.04 + amount * 0.12)), period * 0.22);
    write(articulationGain.gain, floor, when, close, false);
    write(articulationGain.gain, 1, when + close, open, false);
    if (breath > 0) {
      write(breathVca.gain, 0.85 * breath, when, close, false);
      write(breathVca.gain, 0, when + close, Math.max(0.008, open * 1.5), false);
    }
  };

  const cancelAt = (when) => {
    const at = Math.max(ctx.currentTime, when);
    for (const param of [
      ...filters.flatMap((filter) => [filter.frequency, filter.Q]),
      ...formantGains.map((gain) => gain.gain), bank.gain, body.frequency,
      ...stage2.flatMap((filter) => [filter.frequency, filter.Q]),
      ...stage2Gains.map((gain) => gain.gain), cascade.gain,
      articulationGain.gain, breathVca.gain,
    ]) {
      try {
        if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(at);
        else {
          param.cancelScheduledValues?.(at);
          if (param.setValueAtTime && Number.isFinite(param.value)) param.setValueAtTime(param.value, at);
        }
      } catch { /* an old AudioParam implementation can omit the hold method */ }
    }
  };

  const swingOffset = (boundaryBeats, sixteenth, swing) => {
    const shift = sixteenth * (finite(swing, 50) - 50) / 50;
    if (!shift) return 0;
    const s16 = boundaryBeats * 4;
    const nearest = Math.round(s16);
    if (Math.abs(s16 - nearest) > 1e-7) return 0;
    return (((nearest % 2) + 2) % 2) === 1 ? shift : 0;
  };

  const seedFrom = (value) => {
    let hash = 2166136261;
    for (const ch of String(value)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return hash | 0;
  };

  const node = { input, output, _custom: true };
  node.applyState = (bpm = 120) => {
    const beatSeconds = 60 / Math.max(1, finite(bpm, 120));
    const period = isSynced() ? periodBeats() * beatSeconds : 1 / freeRate();
    applyTarget(0, ctx.currentTime, period, !smooth);
    applyWet(!smooth);
    applySpread(!smooth);
    applyPresence(!smooth);
    smooth = true;
  };
  node.setState = (patch, bpm = 120) => {
    const before = JSON.stringify({
      voice: state.voice, stack: state.stack, rateSync: state.rateSync,
      rateDivision: state.rateDivision, frequency: state.frequency,
      waveform: state.waveform, depth: state.depth, glide: state.glide,
      articulation: state.articulation, breath: state.breath,
      reso: state.reso, tilt: state.tilt,
    });
    Object.assign(state, patch);
    const after = JSON.stringify({
      voice: state.voice, stack: state.stack, rateSync: state.rateSync,
      rateDivision: state.rateDivision, frequency: state.frequency,
      waveform: state.waveform, depth: state.depth, glide: state.glide,
      articulation: state.articulation, breath: state.breath,
      reso: state.reso, tilt: state.tilt,
    });
    applyWet(false);
    applySpread(false);
    applyPresence(false);
    if (!smooth || before === after) return;
    cancelAt(ctx.currentTime);
    nextSyncedOrdinal = null;
    freeNextAt = null;
    lastSignature = null;
    const beatSeconds = 60 / Math.max(1, finite(bpm, 120));
    applyTarget(currentOrdinal, ctx.currentTime,
      isSynced() ? periodBeats() * beatSeconds : 1 / freeRate());
  };

  node.scheduleRhythm = (step, when, sixteenth, bpm = 120, swing = 50) => {
    const beatSeconds = Math.max(0.000001, finite(sixteenth, 0.125) * 4);
    const signature = motionSignature(bpm, swing, sixteenth);
    const discontinuity = lastStep != null && (
      step !== lastStep + 1
      || when < lastWhen - 1e-6
      || Math.abs(sixteenth - lastSixteenth) > 1e-6
      || signature !== lastSignature
    );
    const reset = lastStep == null || discontinuity || lastSignature == null;
    if (reset) {
      cancelAt(when);
      nextSyncedOrdinal = null;
      freeNextAt = null;
      motionSeed = seedFrom(signature);
      lastSignature = signature;
    }

    if (isSynced()) {
      const period = periodBeats();
      const startBeat = step / 4;
      const end = when + sixteenth + 1e-7;
      const boundaryAt = (ordinal) => when + (ordinal * period - startBeat) * beatSeconds
        + swingOffset(ordinal * period, sixteenth, swing);
      if (nextSyncedOrdinal == null) {
        let active = Math.floor(startBeat / period);
        while (boundaryAt(active + 1) <= when + 1e-7) active++;
        while (boundaryAt(active) > when + 1e-7) active--;
        applyTarget(active, when, period * beatSeconds);
        currentOrdinal = active;
        nextSyncedOrdinal = active + 1;
      }
      while (boundaryAt(nextSyncedOrdinal) < when - 1e-7) nextSyncedOrdinal++;
      while (boundaryAt(nextSyncedOrdinal) <= end) {
        const boundary = boundaryAt(nextSyncedOrdinal);
        if (boundary >= when - 1e-7) {
          applyTarget(nextSyncedOrdinal, boundary, period * beatSeconds);
          articulateAt(boundary, period * beatSeconds);
        }
        nextSyncedOrdinal++;
      }
    } else {
      const period = 1 / freeRate();
      if (freeNextAt == null) {
        freeOrdinal = 0;
        applyTarget(freeOrdinal, when, period);
        freeNextAt = when + period;
      }
      if (freeNextAt < when - 1e-7) {
        const skipped = Math.floor((when - freeNextAt) / period) + 1;
        freeOrdinal += skipped;
        freeNextAt += skipped * period;
      }
      const end = when + sixteenth + 1e-7;
      while (freeNextAt <= end) {
        freeOrdinal++;
        applyTarget(freeOrdinal, freeNextAt, period);
        articulateAt(freeNextAt, period);
        freeNextAt += period;
      }
    }
    lastStep = step;
    lastWhen = when;
    lastSixteenth = sixteenth;
    lastSignature = signature;
  };

  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => {
    node.disconnect();
    for (const n of [input, output, dry, wet, vocalWetSum, articulationGain, vocalSource,
      exciteInput, excitePre, exciteShaper, exciteMix, breathFilter, breathGain, breathVca,
      body, bodyGain, air, airGain, ...presence,
      bank, ...stage2, ...stage2Gains, cascade, onePass, twoPass,
      ...filters, ...formantGains, ...formantPans]) {
      try { n.disconnect(); } catch { /* fine */ }
    }
  };
  return node;
}

function makeRhythmicGate(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const gate = ctx.createGain();
  input.connect(gate); gate.connect(output);
  const state = { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1, ...params };
  gate.gain.value = 1;
  let lastStep = null;
  let lastWhen = null;
  let lastSixteenth = null;
  let lastSignature = null;
  const node = { input, output, _custom: true };
  node.applyState = () => {
    const floor = 1 - Math.max(0, Math.min(1, state.depth ?? 1));
    gate.gain.setTargetAtTime(floor, ctx.currentTime, 0.004);
  };
  node.setState = (patch) => { Object.assign(state, patch); node.applyState(); };
  node.scheduleRhythm = (step, when, sixteenth, bpm, swing = 50) => {
    const periodBeats = Math.max(1 / 16, Number(state.division) || 0.5);
    const beatSeconds = sixteenth * 4;
    const startBeat = step / 4;
    const endBeat = startBeat + 0.25;
    // SWING, on the same terms as a note. A pulse belongs to a sixteenth, and the
    // off-beat sixteenths of a swung song are late — so a pulse landing on one is late
    // with them, and a gate stays locked to the groove instead of cutting across it.
    //
    // Only pulses that land ON the sixteenth grid can be swung at all, and this is
    // exactly the parity rule that decides whether a tempo-synced division survives a
    // shuffle. A division of an EVEN number of sixteenths (1/8, 1/4, 1/4 dotted, a bar)
    // only ever lands on on-beat sixteenths and never moves. An ODD one (1/16, 1/8
    // dotted) alternates, and following the swing is the whole point. A triplet or a
    // 1/32 lands between sixteenths, where the grid has no opinion, so it is left alone
    // rather than shoved at the nearest one.
    //
    // This is the thing a delay CANNOT do — see the note over scheduleEffects.
    const swingShift = sixteenth * ((Number(swing) || 50) - 50) / 50;
    const swungBy = (boundaryBeats) => {
      if (!swingShift) return 0;
      const s16 = boundaryBeats * 4;                 // the pulse, in sixteenths
      const k = Math.round(s16);
      if (Math.abs(s16 - k) > 1e-7) return 0;        // between sixteenths — not on the grid
      return (((k % 2) + 2) % 2) === 1 ? swingShift : 0;
    };
    const periodSeconds = periodBeats * beatSeconds;
    const openSeconds = periodSeconds * Math.max(0.01, Math.min(1, state.gateLength ?? 0.5));
    let attack = Math.max(0.001, Number(state.attack) || 0.003);
    let decay = Math.max(0.001, Number(state.decay) || 0.035);
    if (attack + decay > openSeconds) {
      const scale = openSeconds / (attack + decay);
      attack *= scale; decay *= scale;
    }
    const floor = 1 - Math.max(0, Math.min(1, state.depth ?? 1));
    // The sequencer may jump, loop, insert a section, or change tempo while the
    // look-ahead queue still contains old envelopes. Keep the ordinary contiguous
    // sixteenths cheap, but invalidate queued events when the song clock is not the
    // continuation we last scheduled.
    const discontinuity = lastStep != null && (
      step !== lastStep + 1
      || when < lastWhen - 1e-6
      || Math.abs(sixteenth - lastSixteenth) > 1e-6
      || when > lastWhen + lastSixteenth * 1.5
      || `${state.division}|${state.gateLength}|${state.attack}|${state.decay}|${state.depth}|${swing}` !== lastSignature
    );
    if (discontinuity) {
      gate.gain.cancelScheduledValues(when);
      gate.gain.setValueAtTime(floor, when);
    }
    lastStep = step;
    lastWhen = when;
    lastSixteenth = sixteenth;
    lastSignature = `${state.division}|${state.gateLength}|${state.attack}|${state.decay}|${state.depth}|${swing}`;
    const levelAt = (rel) => {
      if (rel < 0 || rel >= openSeconds) return floor;
      if (rel < attack) return floor + (1 - floor) * (rel / attack);
      if (rel < openSeconds - decay) return 1;
      return floor + (1 - floor) * ((openSeconds - rel) / decay);
    };
    const beatIndex = startBeat / periodBeats;
    const nearestIndex = Math.round(beatIndex);
    const currentIndex = Math.abs(beatIndex - nearestIndex) < 1e-7
      ? nearestIndex : Math.floor(beatIndex);
    const currentBoundary = currentIndex * periodBeats;
    // How far into the opening we already are, at this sixteenth's edge. Measured from
    // where that opening ACTUALLY started, so a swung boundary is not treated as though
    // it had opened early — a negative result means it has not opened yet, which
    // `levelAt` already reads as the floor.
    gate.gain.setValueAtTime(
      levelAt((startBeat - currentBoundary) * beatSeconds - swungBy(currentBoundary)), when);
    const schedulePulse = (boundary, t) => {
      if (t < when - 1e-7 || t > when + sixteenth + 1e-7) return;
      gate.gain.setValueAtTime(floor, t);
      gate.gain.linearRampToValueAtTime(1, t + attack);
      gate.gain.setValueAtTime(1, t + Math.max(attack, openSeconds - decay));
      gate.gain.linearRampToValueAtTime(floor, t + openSeconds);
    };
    let index = currentIndex;
    for (;;) {
      const boundary = index * periodBeats;
      const t = when + (boundary - startBeat) * beatSeconds + swungBy(boundary);
      // The break tests the UNSWUNG time, so a pulse pushed late by the shuffle still
      // ends the walk on the sixteenth it belongs to rather than running the loop on.
      // A swung pulse cannot leave its own sixteenth: the shift is at most half of one,
      // and a pulse on the grid always starts at this window's own edge.
      if (when + (boundary - startBeat) * beatSeconds > when + sixteenth + 1e-7) break;
      if (t >= when - 1e-7) schedulePulse(boundary, t);
      index++;
    }
  };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => { node.disconnect(); for (const n of [input, gate, output]) { try { n.disconnect(); } catch { /* fine */ } } };
  return node;
}

function makeRingMod(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const multiply = ctx.createGain();
  const sum = ctx.createGain();
  const mods = [ctx.createOscillator(), ctx.createOscillator()];
  const modGains = [ctx.createGain(), ctx.createGain()];
  input.connect(dry); dry.connect(output);
  input.connect(multiply); multiply.connect(wet); wet.connect(output);
  mods[0].connect(modGains[0]); mods[1].connect(modGains[1]);
  modGains[0].connect(sum); modGains[1].connect(sum); sum.connect(multiply.gain);
  mods.forEach((m) => m.start(0));
  const state = { rateSync: 0, rateDivision: 0.5, frequency: 30, waveform: 'sine', wet: 0.5, ...params };
  let active = 0;
  let running = false;
  let lastWaveform = null;
  const setParam = (p, value, tc = 0.03) => setAudioParam(ctx, p, value, running, tc);
  const apply = (bpm = 120) => {
    const rate = state.rateSync >= 0.5 ? rateHz(state, bpm) : Math.max(0.1, Math.min(2000, state.frequency || 30));
    mods.forEach((m) => setParam(m.frequency, rate, 0.03));
    const type = ['sine', 'triangle', 'square'].includes(state.waveform) ? state.waveform : 'sine';
    if (lastWaveform !== type) {
      const inactive = 1 - active;
      mods[inactive].type = type;
      if (!running) { mods[active].type = type; modGains[0].gain.value = 1; modGains[1].gain.value = 0; }
      else {
        modGains[active].gain.setTargetAtTime(0, ctx.currentTime, 0.0012);
        modGains[inactive].gain.setTargetAtTime(1, ctx.currentTime, 0.0012);
        active = inactive;
      }
      lastWaveform = type;
    }
    const w = Math.max(0, Math.min(1, state.wet || 0));
    setParam(wet.gain, Math.sin((w * Math.PI) / 2), 0.03);
    setParam(dry.gain, Math.cos((w * Math.PI) / 2), 0.03);
    running = true;
  };
  const node = { input, output, _custom: true };
  node.applyState = apply;
  node.setState = (patch, bpm) => { Object.assign(state, patch); apply(bpm); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => { node.disconnect(); mods.forEach((m) => { try { m.stop(); } catch { /* fine */ } });
    for (const n of [input, dry, wet, multiply, sum, ...mods, ...modGains, output]) { try { n.disconnect(); } catch { /* fine */ } } };
  return node;
}

/**
 * A three-band compressor built from native nodes — the same shape as Tone's, for a
 * fraction of what Tone's costs.
 *
 * MEASURED, which is the only reason this exists: on the desk's own dense song the
 * Tone MultibandCompressor on the master is about a sixth of the one core Web Audio
 * gets — more than the entire drum kit, and against a catalogue estimate of 0.87%,
 * which is where the CPU readout's credibility went. The DSP is not the expensive
 * part: three DynamicsCompressorNodes and four biquads are cheap. What costs is the
 * plumbing around them. Tone gives every parameter a `Signal`, and a Signal is a
 * ConstantSourceNode wired into the AudioParam — a running source node per control,
 * about twenty of them for this effect, each rendered every block whether or not
 * anybody ever moves it.
 *
 * So: the same topology, the same defaults, the same controls, written straight onto
 * the params. Tone's MultibandSplit is `low = lowpass(fLow)`, `mid = highpass(fLow)
 * → lowpass(fHigh)`, `high = highpass(fHigh)`, each a single 12dB/oct biquad, summed
 * after three Compressors — this is that, node for node.
 *
 * It is not sample-identical to the former Tone graph: a DynamicsCompressorNode is fed
 * by a slightly different graph and the sum of three bands through three compressors
 * is chaotic enough that "nearly the same" is the most anyone can promise. It is now
 * the single multiband implementation, so every song gets the cheaper native path.
 */
function makeMultibandCompN(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  // Stereo in and out, like every other insert here: fed mono, a compressor would
  // still work, but the band filters and the sum would silently narrow a lane.
  for (const n of [input, output]) {
    n.channelCount = 2; n.channelCountMode = 'explicit'; n.channelInterpretation = 'speakers';
  }
  const filter = (type) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    // Butterworth. Tone's Filter defaults to Q 1 on a crossover, which puts a bump at
    // the corner of every band and then sums three of them; 0.7071 is the flat one.
    f.Q.value = 0.7071;
    return f;
  };
  const lowLp = filter('lowpass');
  const midHp = filter('highpass');
  const midLp = filter('lowpass');
  const highHp = filter('highpass');
  const comp = () => ctx.createDynamicsCompressor();
  const low = comp(); const mid = comp(); const high = comp();
  input.connect(lowLp); lowLp.connect(low); low.connect(output);
  input.connect(midHp); midHp.connect(midLp); midLp.connect(mid); mid.connect(output);
  input.connect(highHp); highHp.connect(high); high.connect(output);

  const state = {
    lowFrequency: 250, highFrequency: 2000,
    'low.threshold': -30, 'low.ratio': 6, 'low.attack': 0.03, 'low.release': 0.25, 'low.knee': 10,
    'mid.threshold': -24, 'mid.ratio': 3, 'mid.attack': 0.02, 'mid.release': 0.03, 'mid.knee': 16,
    'high.threshold': -24, 'high.ratio': 3, 'high.attack': 0.02, 'high.release': 0.03, 'high.knee': 16,
    ...params,
  };

  const apply = () => {
    const t = ctx.currentTime;
    const num = (key, fallback) => {
      const v = Number(state[key]);
      return Number.isFinite(v) ? v : fallback;
    };
    // The crossovers ramp — dragging one is a sweep you hear, and a step in a filter
    // corner under a compressor is a thump. Everything else is written directly:
    // a DynamicsCompressor's own parameters are k-rate and its envelope smooths them.
    const fLow = Math.max(20, Math.min(ctx.sampleRate / 2 - 1, num('lowFrequency', 250)));
    const fHigh = Math.max(fLow, Math.min(ctx.sampleRate / 2 - 1, num('highFrequency', 2000)));
    for (const [f, hz] of [[lowLp, fLow], [midHp, fLow], [midLp, fHigh], [highHp, fHigh]]) {
      f.frequency.setTargetAtTime(hz, t, 0.02);
    }
    for (const [band, node] of [['low', low], ['mid', mid], ['high', high]]) {
      node.threshold.value = Math.max(-100, Math.min(0, num(`${band}.threshold`, -24)));
      node.ratio.value = Math.max(1, Math.min(20, num(`${band}.ratio`, 3)));
      node.attack.value = Math.max(0, Math.min(1, num(`${band}.attack`, 0.02)));
      node.release.value = Math.max(0, Math.min(1, num(`${band}.release`, 0.03)));
      node.knee.value = Math.max(0, Math.min(40, num(`${band}.knee`, 16)));
    }
  };
  apply();

  return {
    input, output, _custom: true,
    applyState: apply,
    setState: (patch) => { Object.assign(state, patch); apply(); },
    connect: (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest)),
    disconnect: () => { try { output.disconnect(); } catch { /* fine */ } },
    dispose: () => {
      for (const n of [input, lowLp, midHp, midLp, highHp, low, mid, high, output]) {
        try { n.disconnect(); } catch { /* fine */ }
      }
    },
    // How hard each band is working, for a meter that does not exist yet. Free to
    // expose — `reduction` is a read of a number the node already keeps.
    _reduction: () => ({ low: low.reduction, mid: mid.reduction, high: high.reduction }),
  };
}

const TAPE_CURVE_SIZE = 8193;
function tapeCurve(drive, bias) {
  const c = new Float32Array(TAPE_CURVE_SIZE);
  const d = 1 + Math.max(0, Math.min(24, drive)) / 8;
  const b = Math.max(-1, Math.min(1, bias)) * 0.18;
  for (let i = 0; i < c.length; i++) {
    const x = (i / (c.length - 1)) * 2 - 1;
    const y = Math.tanh((x + b) * d);
    const centre = Math.tanh(b * d);
    c[i] = (y - centre) / Math.max(0.0001, Math.tanh(d));
  }
  return c;
}

function makeTape(ctx, params = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(0.02); delay.delayTime.value = 0.004;
  const pre = ctx.createGain(); const post = ctx.createGain();
  const shapers = [ctx.createWaveShaper(), ctx.createWaveShaper()];
  const fades = [ctx.createGain(), ctx.createGain()]; const sum = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 20;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7071;
  const wowDepth = ctx.createGain(); const flutterDepth = ctx.createGain();
  const wow = modulationSource(ctx, modulationTable(ctx, 'sine'), 0, 0.45);
  const flutter = modulationSource(ctx, modulationTable(ctx, 'sine'), 0.17, 6);
  input.connect(dry); dry.connect(output);
  input.connect(delay); delay.connect(pre);
  /*
   * ONE shaper in circuit, not two.
   *
   * There are two because a tape curve cannot be swapped under a signal without a click,
   * so DRIVE and BIAS crossfade from the old curve to a new one on the spare. But a
   * WaveShaper at oversample '4x' resamples to 176.4kHz, shapes, and filters back down —
   * it is the most expensive node in this effect by a distance, and the spare was doing
   * all of that permanently to be ready for a knob that most renders never touch.
   *
   * So the spare is left DISCONNECTED until a curve change actually needs it, and the
   * one it replaces is dropped once the crossfade is over. An offline render sets its
   * parameters once before anything sounds, so it never connects a second shaper at all.
   */
  pre.connect(shapers[0]);
  shapers[0].connect(fades[0]); shapers[1].connect(fades[1]); fades[0].connect(sum); fades[1].connect(sum);
  sum.connect(post); post.connect(hp); hp.connect(lp); lp.connect(wet); wet.connect(output);
  wow.connect(wowDepth); flutter.connect(flutterDepth); wowDepth.connect(delay.delayTime); flutterDepth.connect(delay.delayTime);
  // 4x stays, and it was measured rather than assumed. Dropping to 2x halves this
  // effect's cost (9.8 -> 4.7 ms per audio second), which is a lot to leave on the table
  // — but the oversampler carries GROUP DELAY, and changing it moves the shaped signal
  // in time. Rendered at wet 1 the three settings produce an identical peak (0.618) and
  // still differ by 90% rms: the same audio, arriving a few samples apart. Against the
  // dry path that is a comb filter, and against the rest of the mix it is every phase
  // relationship the song was balanced on. A cheaper tape is not worth a tape that
  // sounds different in a way nobody can point at.
  shapers.forEach((s) => { s.oversample = '4x'; });
  const state = { drive: 6, bias: 0.1, tone: 10000, wow: 0.12, flutter: 0.05, wet: 0.65, ...params };
  let active = 0; let running = false;
  let lastShape = null;
  const setParam = (p, value, tc = 0.03) => setAudioParam(ctx, p, value, running, tc);
  const apply = () => {
    const drive = Math.max(0, Math.min(24, state.drive || 0));
    setParam(pre.gain, 10 ** (drive / 20), 0.03);
    setParam(post.gain, 10 ** (-drive / 20), 0.03);
    setParam(lp.frequency, Math.max(1000, Math.min(20000, state.tone || 10000)), 0.04);
    setParam(wowDepth.gain, Math.max(0, Math.min(1, state.wow || 0)) * 0.003, 0.04);
    setParam(flutterDepth.gain, Math.max(0, Math.min(1, state.flutter || 0)) * 0.00035, 0.04);
    const shape = `${drive}|${Math.max(-1, Math.min(1, state.bias || 0))}`;
    if (shape !== lastShape) {
      const next = 1 - active; shapers[next].curve = tapeCurve(drive, state.bias);
      if (!running) {
        // Before anything has sounded the curve can simply be set — no crossfade, and
        // the spare stays out of circuit. This is the path every offline render takes.
        shapers[active].curve = shapers[next].curve;
        fades[active].gain.value = 1; fades[1 - active].gain.value = 0;
      } else {
        const outgoing = active;
        try { pre.connect(shapers[next]); } catch { /* already in circuit */ }
        fades[outgoing].gain.setTargetAtTime(0, ctx.currentTime, 0.0012);
        fades[next].gain.setTargetAtTime(1, ctx.currentTime, 0.0012);
        active = next;
        // Out of circuit once it is inaudible. The time constant above is 1.2ms, so 60ms
        // is far past silent; live only, because an offline render's clock is not wall
        // time and a timer would fire in the wrong place if it fired at all.
        if (typeof ctx.startRendering !== 'function') {
          setTimeout(() => {
            if (active === outgoing) return;          // changed again; it is live now
            try { pre.disconnect(shapers[outgoing]); } catch { /* already gone */ }
          }, 60);
        }
      }
      lastShape = shape;
    }
    const w = Math.max(0, Math.min(1, state.wet || 0));
    setParam(wet.gain, Math.sin((w * Math.PI) / 2), 0.03);
    setParam(dry.gain, Math.cos((w * Math.PI) / 2), 0.03);
    running = true;
  };
  const node = { input, output, _custom: true };
  node.applyState = apply; node.setState = (patch) => { Object.assign(state, patch); apply(); };
  node.connect = (dest) => (dest && dest.input ? output.connect(dest.input) : output.connect(dest));
  node.disconnect = () => { try { output.disconnect(); } catch { /* fine */ } };
  node.dispose = () => { node.disconnect(); for (const s of [wow, flutter]) { try { s.stop(); } catch { /* fine */ } }
    for (const n of [input, dry, wet, delay, pre, post, ...shapers, ...fades, sum, hp, lp, wowDepth, flutterDepth, wow, flutter, output]) { try { n.disconnect(); } catch { /* fine */ } } };
  return node;
}

export const EFFECTS = [
  // 0.03 rather than the 0.02 it cost as a lone GainNode: BALANCE is a splitter, two
  // gains and a merger behind it. Re-measured by the same hand method as the rest of
  // these, on a bench that reads the Channel EQ at 0.148 against its listed 0.15.
  // MONO belongs here rather than on the Stereo Widener because it is a routing
  // decision, not a width setting: the widener's own 0 collapses the image AND brings
  // the result back 6dB hot, so reaching for it to make something mono costs you a
  // level you then have to find again on the fader. This one is unity by construction.
  { id: 'gain', name: 'Gain', cost: 0.03, custom: makeGain,
    params: ['gain', 'balance', 'mono'], defaults: { gain: 0, balance: 0, mono: 0 } },
  // `short` is what an insert slot shows: a 118px strip cannot hold "Multiband
  // Compressor", and a name cut off mid-word is worse than an abbreviation someone
  // chose. The full name stays everywhere there is room for it.
  // Channel EQ, not "Parametric EQ": the name on the card should say where it goes and
  // what it is for, and every strip that reaches for it is reaching for the same thing —
  // the proper EQ for this channel, in place of the three fixed bands on the strip. The
  // id stays `peq`, because that is what every saved mix holds.
  // 0.54 — the 0.43 this carried with four bands, scaled by the fifth.
  //
  // NOT re-measured in a mix, because the in-mix bench cannot resolve one biquad: three
  // runs of it read the Bell EQ at 0.08, 0.12 and 0.15 with identical code, and read this
  // card at 0.39, 0.38 and 0.34 either side of the band being added. A spread of ±0.05 on
  // a question worth a tenth of that, so "the five-band card measured the same" would
  // have been a statement about the bench.
  //
  // Measured where it is decidable instead (work/local/peq-band-cost.mjs, results in
  // work/local/peq-fifth-band-cost-2026-08-22.txt): six chains of four bands against six
  // of five, interleaved, in one offline context with nothing else in it. The filter work
  // goes up by 1.25, which is what four biquads to five has to be, and the fixed render
  // overhead the ratio of the TOTALS would have included is 4.6% and cancels out of a
  // cost that was already a delta against no effect. 0.43 x 1.25 = 0.5375.
  //
  // `params` is in the order the card READS in, which puts the middle band's three between
  // band 2's and band 3's even though it is numbered 5. See PEQ_BANDS.
  { id: 'peq', name: 'Channel EQ', short: 'Ch EQ', cost: 0.54, custom: makeParametricEq,
    params: ['f1', 'g1', 'f2', 'g2', 'q2', 'f5', 'g5', 'q5', 'f3', 'g3', 'q3', 'f4', 'g4'],
    defaults: { f1: 120, g1: 0, f2: 500, g2: 0, q2: 1, f5: 1000, g5: 0, q5: 1,
      f3: 2000, g3: 0, q3: 1, f4: 6000, g4: 0 },
    // What the PRESET row calls this card's untouched state. Four bands at 0dB is FLAT
    // on every desk ever built, and "Default" is the word for where a card starts, not
    // for what it sounds like — the one entry everybody reaches for is the reset, so it
    // says what it does. Same word on the Bell EQ below, because it is the same idea.
    defaultPresetName: 'Flat' },
  // 0.08 — a fifth of the Channel EQ's, which is one biquad against four. Measured by
  // the same in-a-real-mix method as the rest of the table (work/local/bell-eq-cost.mjs,
  // results in work/local/bell-eq-cost-2026-08-22.txt): six copies on the master bus of
  // barber-96 against no master effect, best of five, idle and playing, divided by six.
  // Six rather than one because one of either EQ moves this bench by about a millisecond
  // per audio second and that is inside its own noise — measured singly, the Bell EQ
  // came back DEARER than the Channel EQ, and one biquad cannot cost more than four. The
  // same run read the Channel EQ at 0.39 against the 0.43 it already carried, which is
  // what makes this number comparable rather than merely plausible.
  { id: 'bell', name: 'Bell EQ', short: 'Bell EQ', cost: 0.08, custom: makeBellEq,
    params: ['frequency', 'gain', 'q'],
    defaults: { frequency: 1000, gain: 0, q: 1 },
    defaultPresetName: 'Flat',
    ranges: {
      // A cutoff, not an LFO rate — the shared `frequency` range stops at 20Hz. The
      // span and the taper are the Channel EQ's graph's, so a bell parked at 800Hz
      // reads 800Hz on either card.
      frequency: { min: 20, max: 18000, step: 1, unit: 'Hz', log: true },
      // +/-18dB and 0.5dB steps, matching the Channel EQ's bands rather than GAIN's
      // +/-24: this is an EQ band and a band on one card must not have more range than
      // the same band on the other.
      gain: { min: -18, max: 18, step: 0.5, unit: 'dB' },
      // Q needs no override: it is the same control as the Channel EQ's peaks and
      // reads its range from PARAM_RANGES, which is where a shared name belongs.
    },
    labels: { frequency: 'FREQ', gain: 'GAIN', q: 'Q' } },
  // Measured with the native formant graph, excitation front-end and scheduler hook in
  // tools/measure-new-effects.js: 0.80% default, 0.94% dramatic mode on this bench.
  { id: 'vowel', name: 'Vowel Filter', short: 'Vowel', cost: 0.94, custom: makeVowelFilter,
    params: ['voice', 'stack', 'rateSync', 'rateDivision', 'frequency',
      'waveform', 'depth', 'glide', 'articulation', 'reso', 'spread', 'tilt',
      'intensity', 'excite', 'breath', 'body', 'air', 'wet'],
    defaults: {
      voice: 'alto', stack: 'a e i o u', rateSync: 1, rateDivision: 0.25,
      frequency: 0.5, waveform: 'step', depth: 1, glide: 0.08, articulation: 0,
      reso: 2, spread: 0.9, body: 0.5, air: 0.25, tilt: 0.45, intensity: 0,
      excite: 0, breath: 0, wet: 0.9,
    },
    ranges: {
      voice: { options: ['robotic', 'soprano', 'alto', 'countertenor', 'tenor', 'bass'] },
      stack: { options: ['a', 'e', 'i', 'o', 'u',
        'a e', 'a o', 'o u', 'i a', 'a e i', 'o a e', 'u o a',
        'a e i o u', 'u o a e i'] },
      frequency: { min: 0.05, max: 8, step: 0.01, unit: 'Hz', log: true },
      waveform: { options: ['step', 'sine', 'triangle', 'saw up', 'saw down', 'square', 'random'] },
      glide: { min: 0, max: 1, step: 0.01 },
      articulation: { min: 0, max: 1, step: 0.01 },
      reso: { min: 0.3, max: 3, step: 0.05 },
      spread: { min: 0, max: 1, step: 0.01 },
      excite: { min: 0, max: 1, step: 0.01 },
      breath: { min: 0, max: 1, step: 0.01 },
      body: { min: 0, max: 1, step: 0.01 },
      air: { min: 0, max: 1, step: 0.01 },
      tilt: { min: 0, max: 1, step: 0.01 },
      intensity: { min: 0, max: 1, step: 0.01 },
    },
    labels: {
      voice: 'VOICE', stack: 'VOWELS', rateDivision: 'RATE',
      frequency: 'RATE', waveform: 'WAVE SHAPE', depth: 'DEPTH', glide: 'GLIDE',
      articulation: 'ARTICULATION', reso: 'RESO', spread: 'SPREAD',
      body: 'BODY', air: 'AIR', tilt: 'TILT', intensity: 'INTENSITY',
      excite: 'EXCITE', breath: 'BREATH',
    } },
  { id: 'chandelay', name: 'Advanced Delay', short: 'Adv. Delay', cost: 0.19, custom: makeChannelDelay, timed: true,
    params: ['sync', 'division', 'delayMs', 'feedback', 'tone', 'pan', 'mix'],
    defaults: { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, tone: 4000, pan: 0, mix: 0.35 } },
  { id: 'pingpong', name: 'Ping-Pong Delay', short: 'Ping-Pong', cost: 0.44, tone: 'PingPongDelay', timed: true,
    params: ['sync', 'division', 'delayMs', 'feedback', 'wet'],
    defaults: { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, wet: 0.35 } },
  { id: 'delay', name: 'Delay', cost: 0.19, tone: 'FeedbackDelay', timed: true,
    params: ['sync', 'division', 'delayMs', 'feedback', 'wet'],
    defaults: { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, wet: 0.35 } },
  { id: 'chorus', name: 'Chorus', short: 'Chorus', cost: 0.55, tone: 'Chorus',
    params: ['rateSync', 'rateDivision', 'frequency', 'delayTime', 'depth', 'feedback', 'spread', 'type', 'wet'],
    defaults: { rateSync: 0, rateDivision: 1, frequency: 1.5, delayTime: 3.5, depth: 0.7, feedback: 0, spread: 180, type: 'sine', wet: 0.5 },
    ranges: {
      delayTime: { min: 2, max: 20, step: 0.1, unit: 'ms' },
      feedback: { min: 0, max: 0.6, step: 0.01 },
      spread: { min: 0, max: 180, step: 5, unit: '°' },
      type: { options: ['sine', 'triangle', 'square', 'sawtooth'] },
    },
    labels: { delayTime: 'DELAY', feedback: 'FEEDBACK', spread: 'SPREAD', type: 'WAVEFORM' } },
  { id: 'chorus2', name: 'Stereo Chorus', short: 'S Chorus', cost: 0.44, custom: (ctx, p) => makeModulatedDelay(ctx, p, 'chorus'),
    params: ['rateSync', 'rateDivision', 'frequency', 'delayMs', 'depth', 'width', 'feedback', 'tone', 'wet'],
    defaults: { rateSync: 0, rateDivision: 2, frequency: 0.65, delayMs: 16, depth: 0.55, width: 1, feedback: 0.12, tone: 9000, wet: 0.5 },
    // RATE is log-tapered for the same reason MRDR-3's own chorus pot is cubed: the two
    // speeds a chorus actually has are the Juno's 0.5 and 0.86 Hz, and linear on a dial
    // that runs to eight they sat inside the first tenth of the travel. Position only —
    // the stored Hz, and every mix built on it, are untouched.
    ranges: { frequency: { min: 0.05, max: 8, step: 0.01, unit: 'Hz', log: true }, delayMs: { min: 6, max: 30, step: 0.1, unit: 'ms' },
      feedback: { min: 0, max: 0.6, step: 0.01 }, tone: { min: 800, max: 20000, step: 100, unit: 'Hz', log: true } },
    labels: { delayMs: 'DELAY', tone: 'DAMPING' } },
  { id: 'rhythmgate', name: 'Rhythmic Gate', short: 'Rhythm Gate', cost: 0.12, custom: makeRhythmicGate,
    params: ['division', 'gateLength', 'attack', 'decay', 'depth'],
    defaults: { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1 },
    // DECAY starts where the gate's own envelope starts — `makeRhythmicGate` floors it
    // at a millisecond — rather than five times above it, and steps in milliseconds so
    // the short end is dialable at all: a gate's decay is the whole character of it.
    ranges: { gateLength: { min: 0.01, max: 1, step: 0.01 }, attack: { min: 0.001, max: 0.25, step: 0.001, unit: 's', log: true }, decay: { min: 0.001, max: 1, step: 0.001, unit: 's', log: true } },
    labels: { division: 'RATE', gateLength: 'GATE LENGTH', attack: 'ATTACK', decay: 'DECAY', depth: 'DEPTH' } },
  { id: 'flanger', name: 'Flanger', cost: 0.54, custom: (ctx, p) => makeModulatedDelay(ctx, p, 'flanger'),
    params: ['rateSync', 'rateDivision', 'frequency', 'delayMs', 'depth', 'feedback', 'spread', 'tone', 'wet'],
    defaults: { rateSync: 0, rateDivision: 2, frequency: 0.25, delayMs: 2, depth: 0.7, feedback: 0.45, spread: 180, tone: 8000, wet: 0.5 },
    ranges: { frequency: { min: 0.05, max: 5, step: 0.01, unit: 'Hz' }, delayMs: { min: 0.2, max: 10, step: 0.1, unit: 'ms' },
      spread: { min: 0, max: 180, step: 5, unit: '°' },
      feedback: { min: 0, max: 0.85, step: 0.01 }, tone: { min: 800, max: 20000, step: 100, unit: 'Hz', log: true } },
    labels: { delayMs: 'DELAY', spread: 'SPREAD', tone: 'DAMPING' } },
  { id: 'phaser', name: 'Phaser', cost: 0.6, custom: makePhaser,
    params: ['rateSync', 'rateDivision', 'frequency', 'octaves', 'baseFrequency', 'feedback', 'wet'],
    defaults: { rateSync: 0, rateDivision: 4, frequency: 0.5, octaves: 3, baseFrequency: 350, feedback: 0.2, wet: 0.5 },
    ranges: { frequency: { min: 0.05, max: 8, step: 0.01, unit: 'Hz', log: true },
      octaves: { min: 0.5, max: 6, step: 0.1, unit: 'oct' },
      baseFrequency: { min: 60, max: 4000, step: 10, unit: 'Hz', log: true },
      feedback: { min: 0, max: 0.7, step: 0.01 } } },
  { id: 'tremolo', name: 'Tremolo', cost: 0.68, tone: 'Tremolo',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'spread', 'wet'], defaults: { rateSync: 0, rateDivision: 0.5, frequency: 9, depth: 0.7, spread: 180, wet: 1 }, start: true },
  { id: 'vibrato', name: 'Vibrato', cost: 0.37, tone: 'Vibrato',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'wet'], defaults: { rateSync: 0, rateDivision: 1, frequency: 5, depth: 0.1, wet: 1 } },
  { id: 'autofilter', name: 'Auto Filter', cost: 0.58, tone: 'AutoFilter',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'baseFrequency', 'octaves', 'wet'], defaults: { rateSync: 0, rateDivision: 2, frequency: 1, depth: 1, baseFrequency: 200, octaves: 2.6, wet: 1 }, start: true },
  { id: 'autowah', name: 'Auto Wah', cost: 0.86, custom: makeAutoWah,
    params: ['rateSync', 'rateDivision', 'baseFrequency', 'octaves', 'sensitivity', 'Q', 'wet'],
    defaults: { rateSync: 0, rateDivision: 2, baseFrequency: 100, octaves: 6, sensitivity: 0, Q: 2, wet: 1 },
    ranges: {
      baseFrequency: { min: 40, max: 2000, step: 10, unit: 'Hz', log: true },
      octaves: { min: 0.5, max: 8, step: 0.1, unit: 'oct' },
      sensitivity: { min: -40, max: 0, step: 1, unit: 'dB' },
      Q: { min: 0.2, max: 10, step: 0.1 },
    },
    labels: { baseFrequency: 'BASE FREQ', octaves: 'OCTAVES', sensitivity: 'SENSITIVITY' } },
  { id: 'autopanner', name: 'Auto Panner', cost: 0.46, tone: 'AutoPanner',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'wet'], defaults: { rateSync: 0, rateDivision: 2, frequency: 1, depth: 1, wet: 1 }, start: true },
  { id: 'distortion', name: 'Distortion', cost: 0.25, tone: 'Distortion',
    params: ['distortion', 'wet'], defaults: { distortion: 0.4, wet: 0.5 } },
  { id: 'bitcrusher', name: 'Bit Crusher', short: 'Bit Crush', cost: 0.12, custom: makeBitCrusher,
    params: ['bits', 'downsample', 'wet'], defaults: { bits: 8, downsample: 4, wet: 1 },
    labels: { bits: 'BITS', downsample: 'DOWNSAMPLE', wet: 'MIX' } },
  { id: 'tape', name: 'Tape Saturation', short: 'Tape', cost: 0.98, custom: makeTape,
    params: ['drive', 'bias', 'tone', 'wow', 'flutter', 'wet'], defaults: { drive: 6, bias: 0.1, tone: 10000, wow: 0.12, flutter: 0.05, wet: 0.65 },
    ranges: { drive: { min: 0, max: 24, step: 0.5, unit: 'dB' }, tone: { min: 1000, max: 20000, step: 100, unit: 'Hz', log: true } },
    labels: { drive: 'DRIVE', bias: 'BIAS', tone: 'TONE', wow: 'WOW', flutter: 'FLUTTER' } },
  { id: 'ringmod', name: 'Ring Modulator', short: 'Ring Mod', cost: 0.36, custom: makeRingMod,
    params: ['rateSync', 'rateDivision', 'frequency', 'waveform', 'wet'], defaults: { rateSync: 0, rateDivision: 0.5, frequency: 30, waveform: 'sine', wet: 0.5 },
    ranges: { frequency: { min: 0.1, max: 2000, step: 0.1, unit: 'Hz', log: true } },
    labels: { frequency: 'RATE', waveform: 'WAVEFORM' } },
  { id: 'chebyshev', name: 'Chebyshev', cost: 0.19, tone: 'Chebyshev',
    params: ['order', 'wet'], defaults: { order: 12, wet: 0.4 } },
  // The other two in this group shape the whole signal; this one only ever adds to the
  // top of it. `mix` rather than `wet` because the dry leg is untouched and the wet is
  // summed on top — there is nothing here to crossfade between. See makeExciter.
  { id: 'exciter', name: 'Exciter', cost: 0.95, custom: makeExciter,
    params: ['tune', 'drive', 'timbre', 'mix'],
    defaults: { tune: 3000, drive: 0.35, timbre: 0.5, mix: 0.3 } },
  { id: 'widener', name: 'Stereo Widener', short: 'Widener', cost: 0.39, tone: 'StereoWidener',
    params: ['width', 'wet'], defaults: { width: 0.7, wet: 1 } },
  // Ours, and the only effect here built out of a pitch shifter that nothing in the
  // catalogue exposes: see makeDoubler. Deliberately NOT tempo-syncable, unlike every
  // other modulation in the list — a drift that lands on the beat is a rhythm part, and
  // the whole claim of the effect is that the second voice is not counting.
  { id: 'doubler', name: 'Doubler', cost: 0.33, custom: makeDoubler,
    params: ['delayMs', 'frequency', 'depth', 'width', 'dryPan', 'wetPan', 'wet'],
    defaults: {
      delayMs: 18, frequency: 0.35, depth: 0.35,
      width: 0.85, dryPan: 0, wetPan: 0, wet: 0.45,
    },
    // TIME is the offset between two takes, not an echo, so it stops where doubling
    // stops. It used to start at 11ms, because the detuner's grain wandered ±8ms and a
    // voice could not average less than that far out; the detuner is gone, so a genuinely
    // small offset is available again — which is what widening a mono part wants. RATE is slower
    // than the shared LFO range for the same reason a doubler is not a chorus: 20Hz of
    // drift is a ring modulator, and the interesting half of this knob is under 1Hz.
    ranges: {
      delayMs: { min: 1, max: 60, step: 0.5, unit: 'ms' },
      frequency: { min: 0.02, max: 6, step: 0.01, unit: 'Hz' },
    } },
  { id: 'shifter', name: 'Frequency Shifter', short: 'Freq Shift', cost: 0.97, tone: 'FrequencyShifter',
    params: ['frequency', 'wet'], defaults: { frequency: 0, wet: 1 },
    // Also a frequency that is not a rate: how far the whole spectrum is moved.
    ranges: { frequency: { min: -1200, max: 1200, step: 5, unit: 'Hz' } } },
  { id: 'pitch', name: 'Pitch Shift', cost: 1.05, tone: 'PitchShift',
    params: ['pitch', 'windowSize', 'feedback', 'wet'], defaults: { pitch: 0, windowSize: 0.1, feedback: 0, wet: 1 } },
  // A low-CPU native space effect. It is intentionally separate from the shared
  // convolution Reverb: use this when a channel needs a small, diffuse tail without
  // paying for the longer impulse response. The real-song benchmark measured 0.22% of
  // one core (the larger of idle and playing), below the 0.35% shipping gate.
  { id: 'ambience', name: 'Ambience', short: 'Ambience', cost: 0.22, custom: makeAmbience,
    params: ['space', 'damping', 'wet'],
    defaults: { space: 0.5, damping: 0.55, wet: 0.38 },
    ranges: {
      space: { min: 0, max: 1, step: 0.01 },
      damping: { min: 0, max: 2, step: 0.01 },
    },
    labels: { space: 'SPACE', damping: 'DAMPING', wet: 'MIX' } },
  // A real spring tank, kept separate from Ambience's diffuse room approximation. The
  // native graph is mono in the expensive feedback section and only fans out at the
  // output, which is why it can offer the spring's resonant modes for less than a
  // stereo convolution. The real-song master-bus bench measured 0.43% of one core
  // (playing, one-round confirmation) on 2026-08-23.
  { id: 'spring', name: 'Spring Reverb', short: 'Spring', cost: 0.43, custom: makeSpringReverb,
    params: ['tension', 'damping', 'drip', 'wet'],
    defaults: { tension: 0.5, damping: 0.35, drip: 0.42, wet: 0.34 },
    labels: { tension: 'TENSION', damping: 'DAMPING', drip: 'DRIP', wet: 'MIX' } },
  // Ours, not Tone's — Tone.Reverb fills its impulse response from Math.random, so
  // every render of every song carrying one was a different file. See makeReverb.
  { id: 'reverb', name: 'Reverb', cost: 0.75, custom: makeReverb,
    params: ['decay', 'preDelay', 'low', 'mid', 'high', 'width', 'wet'],
    defaults: { decay: 2, preDelay: 0.01, low: 0, mid: 0, high: 0, width: 1, wet: 0.4 },
    ranges: {
      low: { min: -18, max: 18, step: 0.5, unit: 'dB' },
      mid: { min: -18, max: 18, step: 0.5, unit: 'dB' },
      high: { min: -18, max: 18, step: 0.5, unit: 'dB' },
      width: { min: 0, max: 2, step: 0.01 },
    },
    labels: { low: 'LOW', mid: 'MID', high: 'HIGH', width: 'WIDTH', wet: 'MIX' } },
  { id: 'compressor', name: 'Compressor', cost: 0.19, tone: 'Compressor',
    params: ['inputGain', 'threshold', 'ratio', 'attack', 'release', 'outputGain'],
    defaults: { inputGain: 0, threshold: -18, ratio: 4, attack: 0.01, release: 0.15, outputGain: 0 } },
  { id: 'noisegate', name: 'Noise Gate', short: 'Gate', cost: 0.16, custom: makeNoiseGate,
    params: ['threshold', 'attack', 'release'],
    defaults: { threshold: -45, attack: 0.005, release: 0.12 },
    ranges: {
      threshold: { min: -80, max: 0, step: 0.5, unit: 'dB' },
      attack: { min: 0.001, max: 0.5, step: 0.001, unit: 's', log: true },
      release: { min: 0.01, max: 2, step: 0.001, unit: 's', log: true },
    },
    labels: { threshold: 'THRESHOLD', attack: 'ATTACK', release: 'RELEASE' } },
  // Threshold stops at -30 rather than the shared -60: the make-up is (ceiling -
  // threshold) and applied for you, so -60 here is not "limit everything", it is
  // +60dB of gain on the way through and a lane that has been destroyed by one drag.
  // -30 is where the real thing stops, for the same reason.
  { id: 'l7', name: 'L7 Limiter', short: 'L7', cost: 0.66, custom: makeLimiter,
    params: ['threshold', 'ceiling', 'release', 'lookahead', 'arc'],
    defaults: { threshold: 0, ceiling: -0.3, release: 0.06, lookahead: 3, arc: 1 },
    // RELEASE keeps the ten-millisecond floor the shared range has left behind, because
    // `makeLimiter` clamps its own envelope there (`relS`): a pot that went to one would
    // read three settings that all sound like ten.
    ranges: { threshold: { min: -30, max: 0, step: 0.1, unit: 'dB' },
      release: { min: 0.01, max: 2, step: 0.001, unit: 's', log: true } } },
  // The two compressors whose controls are NESTED. Tone builds each of these out of
  // whole Tone.Compressors — `mid`, `side`, or `low`/`mid`/`high` — so a threshold
  // is at `mid.threshold`, not on the effect. The dotted names are the parameter
  // names here; applyParams walks them and paramRange falls back to the leaf, so all
  // six thresholds share one range. Both are plain ToneAudioNodes rather than
  // Effects, which is why neither has a `wet`: they are always fully in circuit.
  // PUMP is a deliberately separate post-M/S envelope: it gives the compressor a
  // musical swell-back without changing the saved mid/side attack and release values.
  // It defaults to zero so older mixes and presets retain their previous sound.
  { id: 'msComp', name: 'Mid/Side Compressor', short: 'M/S Comp', cost: 0.53, tone: 'MidSideCompressor',
    params: ['mid.threshold', 'mid.ratio', 'mid.attack', 'mid.release', 'mid.knee',
      'side.threshold', 'side.ratio', 'side.attack', 'side.release', 'side.knee', 'pump'],
    defaults: {
      'mid.threshold': -24, 'mid.ratio': 3, 'mid.attack': 0.02, 'mid.release': 0.03, 'mid.knee': 16,
      'side.threshold': -30, 'side.ratio': 6, 'side.attack': 0.03, 'side.release': 0.25, 'side.knee': 10,
      pump: 0,
    } },
  // The one multiband compressor. The native graph avoids Tone's permanently-running
  // parameter ConstantSources and is the implementation used by every saved mix.
  { id: 'mbCompN', name: 'Multiband Compressor', short: 'Multi Comp',
    cost: 0.74, custom: makeMultibandCompN,
    params: ['lowFrequency', 'highFrequency',
      'low.threshold', 'low.ratio', 'low.attack', 'low.release', 'low.knee',
      'mid.threshold', 'mid.ratio', 'mid.attack', 'mid.release', 'mid.knee',
      'high.threshold', 'high.ratio', 'high.attack', 'high.release', 'high.knee'],
    defaults: {
      lowFrequency: 250, highFrequency: 2000,
      'low.threshold': -30, 'low.ratio': 6, 'low.attack': 0.03, 'low.release': 0.25, 'low.knee': 10,
      'mid.threshold': -24, 'mid.ratio': 3, 'mid.attack': 0.02, 'mid.release': 0.03, 'mid.knee': 16,
      'high.threshold': -24, 'high.ratio': 3, 'high.attack': 0.02, 'high.release': 0.03, 'high.knee': 16,
    } },
  // `frequency` here is a CUTOFF, not an LFO rate, so it carries its own range —
  // the shared one tops out at 20Hz and turning the knob simply muted the channel.
  { id: 'filter', name: 'Filter', cost: 0.2, tone: 'Filter',
    params: ['type', 'frequency', 'Q'], defaults: { type: 'lowpass', frequency: 1000, Q: 1 },
    labels: { frequency: 'CUTOFF', Q: 'RESONANCE' },
    ranges: { frequency: { min: 20, max: 18000, step: 10, unit: 'Hz', log: true } } },
];

// Keep the literals above as a safe fallback, then overlay the source-backed DEV
// defaults. Only parameters the catalogue currently declares are accepted; a stale
// key in the data file cannot reach Tone, and a newly declared key still gets its
// code fallback until somebody saves it.
for (const def of EFFECTS) {
  const fallback = { ...(def.defaults || {}) };
  const saved = EFFECT_PRESETS.inserts?.[def.id]?.default || {};
  const known = Object.fromEntries((def.params || [])
    .filter((name) => Object.prototype.hasOwnProperty.call(saved, name))
    .map((name) => [name, saved[name]]));
  def.fallbackDefaults = fallback;
  def.defaults = { ...fallback, ...known };
}

// Six is a working limit, not a technical one: past that a chain is hard to reason
// about by ear, and the strip's effect block has to reserve room for the longest
// chain in the song so the divider lines up across every channel.
export const MAX_EFFECTS = 6;

// Measured cost per instance, as a percentage of one core at realtime — rendered
// offline against a bare oscillator and taking the best of three. Rough by nature
// (a phone will differ from this Mac) but the RATIOS are what matter, and they are
// not intuitive: Phaser costs 24x Distortion and 2x anything else in the list.
//
// The engine itself is about 10% on the same measure, which is the number to keep
// in mind when reading the desk's estimate.
/*
 * EVERY cost below was re-measured on 2026-08-19, in a real mix, and almost every one of
 * them went UP — most by about double, several by three to six times.
 *
 * The old numbers came from tools/measure-new-effects.js: one effect, alone, fed a single
 * mono 220Hz oscillator, against a bare-oscillator baseline. That is a fine way to rank
 * two effects and a poor way to predict a mix. It is mono, where a real strip is forced
 * to explicit stereo and most nodes therefore do twice the work. It prices the effect
 * rather than the effect inside a graph — and what this engine turned out to care about
 * is whether a node can be SHORT-CIRCUITED by silence, which is a property of the graph
 * around it. And several entries were never measured at all: mbCompN carried a number
 * copied from Tone's mbComp.
 *
 * The new method (work/local/effect-cost-bench.mjs, results in
 * work/local/effect-costs-2026-08-19.txt): each effect inserted on the master bus of a
 * real song, best of three, round robin, fresh page per render, measured twice — with the
 * song silent and with it playing. The number kept is the larger of the two, because the
 * question a cost table answers is "what would adding this cost me".
 *
 * The gap between the two columns is the interesting part. An effect that is cheap idle
 * and dear playing is honest. One that costs the same IDLE is charging you for existing,
 * and that is a node that generates or holds signal — a looping LFO source, a convolver
 * tail, a compressor envelope, or Tone's habit of giving every filter param its own
 * ConstantSourceNode. Almost everything here is in the second category, which is why
 * rewriting the Doubler, Chorus 2 and Phaser natively paid and why trimming the channel
 * strip did not.
 *
 * A note on the two multiband compressors, measured 2026-08-19.
 *
 * mbComp (Tone) and mbCompN (native) both carried cost 0.87 — and mbCompN's was copied
 * from Tone's rather than measured, which is the sort of thing that makes a cost table
 * decorative. Measured in situ on a real song's stereo master bus (barber-96, standing
 * graph only, best of three, work/local/master-comp-ab.mjs): Tone 10.1 ms per audio
 * second, native 6.7. The native one is 34% cheaper for the same three bands.
 *
 * The reason is the rule this engine's whole performance story turned on: a silent gain
 * chain costs nothing, but a node that GENERATES signal can never be short-circuited.
 * Tone's MultibandSplit is four Tone.Filters, and every Tone.Filter creates four
 * ConstantSourceNodes to drive its params — eighteen permanently-running generators
 * around three compressors. makeMultibandCompN is two gains, four biquads and the same
 * three compressors, and starts nothing.
 *
 * These two numbers are therefore measured DIFFERENTLY from the rest of the table (in a
 * real mix rather than against a bare oscillator), and are the more honest for a master
 * effect, which is always on a stereo bus with a whole song going through it.
 */
export const ENGINE_BASE_COST = 10;

/**
 * What the master chain starts with: NOTHING.
 *
 * It used to open with a bypassed bus compressor, on the theory that the thing you
 * would reach for should already be in place. In practice it is a slot that is off
 * sitting on every master, and a control that does nothing is worse than one you have
 * to go and fetch — the picker is one click away. An empty bus is also the honest
 * reading of the strip: what you see on the master is what the master is doing.
 *
 * The order the picker inserts into is unchanged and is not a choice the seed was
 * making: the master chain runs after the master trim and BEFORE the limiter, so a
 * compressor you add shapes the dynamics and the limiter catches whatever is still
 * over. A compressor AFTER a limiter would put peaks back above the ceiling the
 * limiter had just set, which is why no desk offers that order.
 *
 * A function, not a constant: each track needs its own copy to edit.
 */
export const DEFAULT_MASTER_CHAIN = () => ([]);

/**
 * True if a master chain is still exactly the untouched seed — which is to say empty.
 * The seed is not an edit, so a track carrying only this is not a track with a mix:
 * without it every song in the game would gain a masterEffects line in mix.js the
 * first time the desk saved anything.
 */
export function isDefaultMasterChain(list = []) {
  const seed = DEFAULT_MASTER_CHAIN();
  if (!Array.isArray(list) || list.length !== seed.length) return false;
  return list.every((e, i) => {
    const s = seed[i];
    if (e.id !== s.id || !e.bypass !== !s.bypass || !e.mute !== !s.mute) return false;
    const keys = new Set([...Object.keys(e.params || {}), ...Object.keys(s.params || {})]);
    return [...keys].every((k) => (e.params?.[k] ?? null) === (s.params?.[k] ?? null));
  });
}

export const EFFECT_BY_ID = Object.fromEntries(EFFECTS.map((e) => [e.id, e]));
// Old local drafts may still contain the former Tone id. Keep that data audible while
// making the native entry the only enumerable catalogue item and the only picker item.
Object.defineProperty(EFFECT_BY_ID, 'mbComp', {
  value: EFFECT_BY_ID.mbCompN,
  enumerable: false,
  configurable: false,
});

const presetNumber = (value, fallback, range) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return range ? Math.max(range.min, Math.min(range.max, n)) : n;
};

/** Resolve a complete, validated effect snapshot from source-backed named presets. */
export function resolveEffectPreset(id, name = 'Default', scope = 'inserts') {
  const def = EFFECT_BY_ID[id];
  if (!def) return null;
  const raw = name === 'Default'
    ? def.defaults
    : EFFECT_PRESETS?.[scope]?.[id]?.presets?.[name];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const key of def.params || []) {
    const range = paramRange(key, def);
    const fallback = def.defaults?.[key];
    const value = Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : fallback;
    if (range.options) {
      out[key] = range.options.includes(value) ? value : fallback;
    } else if (typeof fallback === 'number' || typeof value === 'number') {
      out[key] = presetNumber(value, fallback, range);
    } else {
      out[key] = value == null ? fallback : value;
    }
  }
  return out;
}

export function effectPresetNames(id, scope = 'inserts') {
  const presets = EFFECT_PRESETS?.[scope]?.[id]?.presets;
  return presets && typeof presets === 'object' && !Array.isArray(presets)
    ? Object.keys(presets) : [];
}

/** Return the named preset matching a complete current snapshot, or null for Custom. */
export function matchEffectPreset(id, params = {}, scope = 'inserts') {
  const def = EFFECT_BY_ID[id];
  if (!def) return null;
  const same = (a, b) => (def.params || []).every((key) => {
    if (typeof a?.[key] === 'number' || typeof b?.[key] === 'number') {
      return Math.abs(Number(a?.[key]) - Number(b?.[key]))
        <= Math.max(1e-7, Number(paramRange(key, def).step || 0) * 0.51);
    }
    return a?.[key] === b?.[key];
  });
  const current = resolveEffectSnapshot(id, params);
  if (same(current, resolveEffectPreset(id, 'Default', scope))) return 'Default';
  for (const name of effectPresetNames(id, scope)) {
    if (same(current, resolveEffectPreset(id, name, scope))) return name;
  }
  return null;
}

/** Normalize an arbitrary current parameter object without treating it as a named preset. */
export function resolveEffectSnapshot(id, params = {}) {
  const def = EFFECT_BY_ID[id];
  if (!def) return null;
  const raw = { ...def.defaults, ...(params || {}) };
  const out = {};
  for (const key of def.params || []) {
    const range = paramRange(key, def);
    const fallback = def.defaults?.[key];
    const value = raw[key];
    if (range.options) out[key] = range.options.includes(value) ? value : fallback;
    else if (typeof fallback === 'number' || typeof value === 'number') out[key] = presetNumber(value, fallback, range);
    else out[key] = value == null ? fallback : value;
  }
  return out;
}

/**
 * The range a parameter is edited over. An effect can override one: `frequency` is
 * an LFO rate on a tremolo and a cutoff on a filter, and one range cannot be both.
 */
export function paramRange(name, def = null) {
  // A dotted name falls back to its leaf, so the three bands of a multiband
  // compressor all read `threshold`'s range without three copies of it. The full
  // name still wins, which is how `lowFrequency` gets a crossover range of its own.
  const leaf = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : null;
  return def?.ranges?.[name] || PARAM_RANGES[name]
    || (leaf && (def?.ranges?.[leaf] || PARAM_RANGES[leaf]))
    || { min: 0, max: 1, step: 0.01 };
}

/**
 * Which of an effect's parameters the desk should draw, in order, for these settings.
 *
 * Four of the catalogue's controls come in either/or pairs rather than as additions: a
 * tempo-synced delay shows a note division and hides its millisecond TIME, and a synced
 * modulation shows a division instead of its free RATE. Which half you get depends on
 * the switch.
 *
 * It lives here rather than in the desk because the rule is about the CATALOGUE, and
 * because the desk got it wrong in a way only a test against the catalogue could catch:
 * the gates keyed on the switch's VALUE, `sync` reads as on when it is absent, and so
 * the first effect to carry a free `delayMs` with no tempo switch to go with it — the
 * Doubler — had its TIME row skipped in every state there was. The control saved,
 * loaded, rendered and could not be seen. See tests/mix.js.
 */
export function visibleParams(def, params = {}) {
  if (!def?.params) return [];
  // `has` before value, always: an effect that does not carry a switch is not in either
  // of that switch's states, it is in neither.
  const has = (p) => def.params.includes(p);
  const on = (p) => has(p) && (params[p] ?? def.defaults?.[p] ?? 0) >= 0.5;
  const synced = on('sync');
  const rateSynced = on('rateSync');
  return def.params.filter((p) => {
    // A rhythmic gate is permanently song-grid driven and therefore has a division
    // without exposing a second tempo-mode switch. Ordinary delays still gate this
    // row on their explicit `sync` control.
    if (p === 'division') return synced || (!has('sync') && has('division'));
    if (p === 'delayMs') return !synced;
    if (p === 'rateDivision') return rateSynced;
    if (p === 'frequency') return !rateSynced;
    return true;
  });
}

/**
 * The standard Tone compressor already exposes trustworthy gain reduction. Add only
 * the input/output taps needed by the open inspector card; unlike the L7's custom
 * sidechain, the compressor's reduction value is the engine's own reading.
 */
function createCompressorMeter(node, ctx) {
  const input = node._meterInput || node.input || node;
  const output = node._meterOutput || node.output || node;
  const reductionNode = node._meterReduction || node;
  const inputSplit = ctx.createChannelSplitter(2);
  const outputSplit = ctx.createChannelSplitter(2);
  const inputAnalysers = [ctx.createAnalyser(), ctx.createAnalyser()];
  const outputAnalysers = [ctx.createAnalyser(), ctx.createAnalyser()];
  for (const analyser of [...inputAnalysers, ...outputAnalysers]) {
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0;
  }
  Tone.connect(input, inputSplit);
  Tone.connect(output, outputSplit);
  inputSplit.connect(inputAnalysers[0], 0);
  inputSplit.connect(inputAnalysers[1], 1);
  outputSplit.connect(outputAnalysers[0], 0);
  outputSplit.connect(outputAnalysers[1], 1);

  const samples = [...inputAnalysers, ...outputAnalysers].map(() => new Float32Array(256));
  let disposed = false;
  const stereoPeak = (analysers, offset) => {
    let peak = 0;
    for (let channel = 0; channel < analysers.length; channel++) {
      analysers[channel].getFloatTimeDomainData(samples[offset + channel]);
      for (const sample of samples[offset + channel]) peak = Math.max(peak, Math.abs(sample));
    }
    return peak;
  };
  return {
    read() {
      if (disposed) return { input: 0, output: 0, reduction: 0 };
      return {
        input: stereoPeak(inputAnalysers, 0),
        output: stereoPeak(outputAnalysers, 2),
        reduction: Math.max(0, -Number(reductionNode.reduction) || 0),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { input.disconnect(inputSplit); } catch { /* already disconnected */ }
      try { output.disconnect(outputSplit); } catch { /* already disconnected */ }
      try { inputSplit.disconnect(); } catch { /* already disconnected */ }
      try { outputSplit.disconnect(); } catch { /* already disconnected */ }
    },
  };
}

/**
 * The standard compressor's two trims are real gain stages, not display-only controls.
 * Keeping them outside Tone.Compressor makes INPUT affect the detector and OUTPUT act as
 * makeup gain, while the meter taps can report the signal at the two useful boundaries.
 */
function makeCompressor(ctx, def, params = {}) {
  const values = { ...def.defaults, ...params };
  const coreParams = Object.fromEntries(Object.entries(values)
    .filter(([key]) => key !== 'inputGain' && key !== 'outputGain'));
  const inputGain = ctx.createGain();
  const compressor = new Tone.Compressor(coreParams);
  const outputGain = ctx.createGain();
  // The input trim is a native GainNode while Tone.Compressor is a ToneAudioNode;
  // use Tone's adapter at that boundary rather than native AudioNode.connect(),
  // which rejects a Tone wrapper and causes createEffect() to fail closed.
  Tone.connect(inputGain, compressor);
  Tone.connect(compressor, outputGain);

  const dbToGain = (db) => Math.pow(10, (Number.isFinite(Number(db)) ? Number(db) : 0) / 20);
  const setTrim = (param, value) => { param.gain.value = dbToGain(value); };
  setTrim(inputGain, values.inputGain);
  setTrim(outputGain, values.outputGain);

  const setState = (patch = {}) => {
    const corePatch = {};
    for (const [key, value] of Object.entries(patch)) {
      values[key] = value;
      if (key === 'inputGain') setTrim(inputGain, value);
      else if (key === 'outputGain') setTrim(outputGain, value);
      else corePatch[key] = value;
    }
    applyParams(compressor, corePatch);
  };

  const rampState = (patch = {}, when, seconds) => {
    const corePatch = {};
    for (const [key, value] of Object.entries(patch)) {
      values[key] = value;
      if (key === 'inputGain') rampParam(ctx, inputGain.gain, dbToGain(value), when, seconds, { log: true });
      else if (key === 'outputGain') rampParam(ctx, outputGain.gain, dbToGain(value), when, seconds, { log: true });
      else corePatch[key] = value;
    }
    rampParams(ctx, compressor, corePatch, when, seconds);
  };

  const node = {
    input: inputGain,
    output: outputGain,
    compressor,
    _meterInput: inputGain,
    _meterOutput: outputGain,
    _meterReduction: compressor,
    applyState: setState,
    rampState,
    dispose() {
      try { inputGain.disconnect(); } catch { /* already disconnected */ }
      try { outputGain.disconnect(); } catch { /* already disconnected */ }
      try { compressor.dispose(); } catch { /* already disposed */ }
    },
  };
  node.createMeter = () => createCompressorMeter(node, ctx);
  return node;
}

/**
 * The M/S compressor's optional PUMP stage. Tone's MidSideCompressor does not expose
 * a sidechain/envelope output, so the cleanest stable implementation is a second,
 * stereo-linked compressor after the M/S merge. At zero its ratio is 1:1; as PUMP rises
 * its threshold moves into the signal and its release lets the level swell back out.
 */
function makeMidSideCompressor(ctx, def, params = {}) {
  const values = { ...def.defaults, ...params };
  const msParams = Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'pump'));
  const midSide = new Tone.MidSideCompressor(expandDotted(msParams));
  const pump = new Tone.Compressor({
    threshold: -60,
    ratio: 1,
    attack: 0.003,
    release: 0.25,
    knee: 0,
  });
  const output = ctx.createGain();
  midSide.connect(pump);
  pump.connect(output);

  const setPump = (value) => {
    const amount = Math.min(1, Math.max(0, Number(value) || 0));
    // Keep zero truly transparent. The ratio and threshold then move together so the
    // control stays useful across normal mix levels instead of only catching peaks.
    pump.threshold.value = -60 + (36 * amount);
    pump.ratio.value = 1 + (19 * amount);
  };
  setPump(values.pump);

  const setState = (patch = {}) => {
    const msPatch = {};
    for (const [key, value] of Object.entries(patch)) {
      values[key] = value;
      if (key !== 'pump') msPatch[key] = value;
    }
    applyParams(midSide, msPatch);
    if (Object.prototype.hasOwnProperty.call(patch, 'pump')) setPump(patch.pump);
  };

  const rampState = (patch = {}, when, seconds) => {
    const msPatch = {};
    for (const [key, value] of Object.entries(patch)) {
      values[key] = value;
      if (key !== 'pump') msPatch[key] = value;
    }
    rampParams(ctx, midSide, msPatch, when, seconds);
    if (Object.prototype.hasOwnProperty.call(patch, 'pump')) {
      const amount = Math.min(1, Math.max(0, Number(patch.pump) || 0));
      rampParam(ctx, pump.threshold, -60 + (36 * amount), when, seconds);
      rampParam(ctx, pump.ratio, 1 + (19 * amount), when, seconds);
    }
  };

  return {
    input: midSide.input,
    output,
    applyState: setState,
    rampState,
    dispose() {
      try { midSide.dispose(); } catch { /* already disposed */ }
      try { pump.dispose(); } catch { /* already disposed */ }
      try { output.disconnect(); } catch { /* already disconnected */ }
    },
  };
}

/**
 * Build one effect. Returns null for an unknown id rather than throwing, so a mix
 * file naming an effect that has since been removed degrades to "no effect" instead
 * of taking the whole song down.
 */
export function createEffect(id, params = {}, ctx = null, bpm = 120) {
  const def = EFFECT_BY_ID[id];
  if (!def) return null;
  if (def.id === 'compressor') {
    if (!ctx) return null;
    try {
      const node = makeCompressor(ctx, def, params);
      return {
        def,
        node,
        set: (patch) => node.applyState(patch),
        setAt: (patch, when, seconds = 0) => node.rampState(patch, when, seconds),
      };
    } catch { return null; }
  }
  if (def.id === 'msComp') {
    if (!ctx) return null;
    try {
      const node = makeMidSideCompressor(ctx, def, params);
      return {
        def,
        node,
        set: (patch) => node.applyState(patch),
        setAt: (patch, when, seconds = 0) => node.rampState(patch, when, seconds),
      };
    } catch { return null; }
  }
  if (def.custom) {
    if (!ctx) return null;
    const node = def.custom(ctx, params);
    node.applyState(bpm);
    return {
      def,
      node,
      set: (patch, b) => node.setState(patch, b ?? bpm),
      scheduleRhythm: typeof node.scheduleRhythm === 'function'
        ? (step, when, sixteenth, b, swing) =>
          node.scheduleRhythm(step, when, sixteenth, b ?? bpm, swing ?? 50)
        : null,
      // A hand-written effect reaches its params through setState, which ramps them
      // from ctx.currentTime and takes no time argument. Rather than pretend, say so:
      // custom effects are not eligible for a scheduled transition, and the desk keeps
      // them out of a variant instead of letting one arrive a beat early.
      setAt: () => {
        throw new Error(`effects: "${id}" applies immediately and cannot be moved at an audio time`);
      },
    };
  }
  if (!Tone[def.tone]) return null;
  const opts = { ...def.defaults, ...params };
  // Tone's delays take seconds; the desk speaks note divisions or milliseconds.
  if (def.timed) opts.delayTime = delaySeconds(opts, bpm);
  if (def.params.includes('rateSync')) opts.frequency = rateHz(opts, bpm);
  let node;
  try {
    node = new Tone[def.tone](expandDotted(opts));
  } catch {
    try { node = new Tone[def.tone](); } catch { return null; }
  }
  // LFO-driven effects sit silent until started.
  if (def.start && typeof node.start === 'function') { try { node.start(); } catch { /* already running */ } }
  const merged = { ...opts };
  // The desk's vocabulary is note divisions and sync flags; Tone's is seconds and hertz.
  // Both doors into this node go through the same translation, so a scheduled change
  // and an immediate one cannot drift apart over what "1/8 dotted" means.
  const resolve = (patch, b) => {
    Object.assign(merged, patch);
    const out = { ...patch };
    if (def.timed) {
      delete out.sync; delete out.division; delete out.delayMs;
      out.delayTime = delaySeconds(merged, b);
    }
    if (def.params.includes('rateSync')) {
      delete out.rateSync; delete out.rateDivision;
      out.frequency = rateHz(merged, b);
    }
    return out;
  };
  return {
    def,
    node,
    set: (patch, b = bpm) => applyParams(node, resolve(patch, b)),
    /** The same change at an audio time. rampParams refuses the params that cannot move. */
    setAt: (patch, when, seconds = 0, b = bpm) => rampParams(ctx, node, resolve(patch, b), when, seconds),
  };
}

/**
 * Move an AudioParam to a value AT AN AUDIO TIME, rather than now.
 *
 * Every setter on the desk writes `.value`, which lands at the next render quantum.
 * That is exactly right for a fader you are dragging. A musical transition is a
 * different question: the change has to arrive on a downbeat the scheduler handed to
 * the audio thread a quarter of a second before it sounds, so "now" is already too
 * late and a frame timer is not accurate enough to make up the difference.
 *
 * `cancelAndHoldAtTime` rather than `cancelScheduledValues`, because a ramp needs a
 * value to start FROM, and `param.value` cannot report a time that has not been
 * rendered yet. Reading it would take the value NOW and ramp from there — on a param
 * that is already moving, a step backwards followed by a slide.
 *
 * Returns the time the move completes, so a caller can chain from it.
 */
export function rampParam(ctx, param, target, when, seconds = 0, { log = false } = {}) {
  if (!param) return when;
  // Every scheduled move on the desk comes through here — a transition's fader, a
  // cabinet treatment's filter, a send arriving on a downbeat — and an AudioParam
  // throws on a non-finite value. Thrown from inside a beat listener that is
  // scheduling a whole transition, one bad number takes the rest of that transition
  // with it and leaves the mix half-moved. Refusing the move leaves the param where
  // it is, which is a state somebody can still hear and fix.
  if (!Number.isFinite(target) || !Number.isFinite(when) || !Number.isFinite(seconds)) {
    console.warn('[effects] refusing a non-finite ramp', { target, when, seconds });
    return when;
  }
  const at = Math.max(when, ctx.currentTime);
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(at);
  else { param.cancelScheduledValues(at); param.setValueAtTime(param.value, at); }
  // A "snap" is still a ramp, just a very short one. Stepping a gain that has audio
  // running through it is a discontinuity in the waveform, and a discontinuity is a
  // click — which is exactly what bringing a lane back in on a downbeat would do to a
  // note that is still ringing from before it. Four milliseconds is under a fifth of a
  // cycle at the bottom of hearing: heard as an edge, not as a fade.
  const secs = seconds > 0 ? seconds : SNAP_SECONDS;
  // Log for anything measured in Hz. A filter swept linearly from 700Hz to 18k spends
  // almost the whole ramp above 10k and does nothing you can hear until the last
  // instant; exponentially it sweeps by ear, an even number of octaves per second.
  // Both ends have to be non-zero — an exponential ramp through zero is undefined.
  if (log && target > 0 && param.value > 0) param.exponentialRampToValueAtTime(target, at + secs);
  else param.linearRampToValueAtTime(target, at + secs);
  return at + secs;
}

// The shortest move that is an edge rather than a click. See rampParam.
const SNAP_SECONDS = 0.004;

// Parameters measured in Hz, which have to sweep by octaves rather than by hertz.
const LOG_PARAMS = new Set(['frequency', 'baseFrequency', 'delayTime']);

/**
 * The future-timed twin of applyParams: the same dotted-path walk, written as ramps at
 * an audio time instead of as `.value` now.
 *
 * A target that is not an AudioParam — an oscillator `type`, a Chebyshev `order`, any
 * plain property on the node — THROWS. There is no way to schedule a property
 * assignment on the audio thread, and both honest alternatives are wrong: a wall-clock
 * timer is neither sample-accurate nor safe in a backgrounded tab, and applying it
 * immediately puts the change a quarter of a second before the boundary it was asked
 * for. So the two sides of a transition may differ on numbers a param can slide
 * between, and on nothing else. The desk refuses to save a pair that differs otherwise.
 */
export function rampParams(ctx, node, patch = {}, when = 0, seconds = 0) {
  const c = ctx || Tone.getContext();
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) continue;
    const path = k.split('.');
    let obj = node;
    for (let i = 0; i < path.length - 1 && obj; i++) obj = obj[path[i]];
    if (!obj) continue;
    const leaf = path[path.length - 1];
    const cur = obj[leaf];
    if (!(cur && typeof cur === 'object' && 'value' in cur)) {
      // Unless it is not actually MOVING. A chain is handed to a transition whole —
      // every link, every parameter, changed or not — so a filter sitting on the master
      // bus made every handover throw on its `type`, which both sides had always agreed
      // about. The refusal below is about a param CHANGING at a time it cannot change
      // at; a value already equal to the target asks for nothing and gets nothing.
      //
      // Without this, any song whose master or channel chain contained a filter, a
      // ringmod or a Chebyshev could not hand a cabinet screen over to its level at all:
      // the first such link threw, rampMix refused before it moved anything, and the
      // screen's whole mix stayed up. See the fallback in MusicDirector._fire, which is
      // what quietly caught it.
      if (cur === v) continue;
      throw new Error(`effects: "${k}" is not automatable — it cannot be moved at an audio time`);
    }
    rampParam(c, cur, v, when, seconds, { log: LOG_PARAMS.has(leaf) });
  }
}

export function applyParams(node, patch = {}) {
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) continue;
    try {
      // A dotted name addresses a sub-node: the compressors inside a Mid/Side or
      // Multiband are whole Tone.Compressors, so their threshold lives at
      // `mid.threshold` rather than anywhere on the effect itself.
      const path = k.split('.');
      let obj = node;
      for (let i = 0; i < path.length - 1 && obj; i++) obj = obj[path[i]];
      if (!obj) continue;
      const leaf = path[path.length - 1];
      const cur = obj[leaf];
      if (cur && typeof cur === 'object' && 'value' in cur) cur.value = v;   // a Tone.Param/Signal
      else obj[leaf] = v;
    } catch { /* an effect that does not take this one */ }
  }
}

/**
 * `{ 'mid.threshold': -24 }` -> `{ mid: { threshold: -24 } }`, for the constructor.
 *
 * Tone's options are RecursivePartial and deep-merge against the class defaults, so
 * a nested partial sets one band and leaves the rest alone. Only the constructor
 * needs this — applyParams walks the dotted name directly.
 */
function expandDotted(opts) {
  const out = {};
  for (const [k, v] of Object.entries(opts)) {
    if (!k.includes('.')) { out[k] = v; continue; }
    const path = k.split('.');
    let o = out;
    for (let i = 0; i < path.length - 1; i++) o = (o[path[i]] ||= {});
    o[path[path.length - 1]] = v;
  }
  return out;
}
